// backend/server.js  (Node 18+, native fetch)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const SESS = new Map(); // state -> { env, status, tokens }
const BASES = {
  prod: { auth: "https://auth.ebay.com/oauth2/authorize", api: "https://api.ebay.com" },
  sandbox: { auth: "https://auth.sandbox.ebay.com/oauth2/authorize", api: "https://api.sandbox.ebay.com" },
};
const b64 = (s) => Buffer.from(s).toString("base64");
const scopes = () =>
  [
    "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
    "https://api.ebay.com/oauth/api_scope/sell.finances.readonly",
  ].join(" ");

app.post("/oauth/new", (req, res) => {
  const { env = "prod" } = req.body || {};
  const state = crypto.randomBytes(16).toString("hex");
  const base = BASES[env];
  const ruName = env === "prod" ? process.env.EBAY_RUNAME_PROD : process.env.EBAY_RUNAME_SANDBOX;
  const u = new URL(base.auth);
  u.searchParams.set("client_id", process.env.EBAY_CLIENT_ID);
  u.searchParams.set("redirect_uri", ruName);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", scopes());
  u.searchParams.set("state", state);
  SESS.set(state, { env, status: "PENDING" });
  res.json({ state, authorizeUrl: u.toString() });
});

app.get("/oauth/callback", async (req, res) => {
  const { code, state } = req.query;
  const sess = SESS.get(state);
  if (!sess) return res.status(400).send("Invalid state.");

  try {
    const env = sess.env;
    const base = BASES[env];
    const ruName = env === "prod" ? process.env.EBAY_RUNAME_PROD : process.env.EBAY_RUNAME_SANDBOX;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: String(code),
      redirect_uri: ruName,
    });

    const r = await fetch(base.api + "/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + b64(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    SESS.set(state, { env, status: "READY", tokens: j });
    res.send("<h3>Linked. You can close this tab.</h3>");
  } catch (e) {
    SESS.set(state, { status: "ERROR", error: String(e) });
    res.status(500).send("OAuth error.");
  }
});

app.get("/oauth/result", (req, res) => {
  const { state } = req.query;
  const sess = SESS.get(state);
  if (!sess) return res.status(404).json({ status: "UNKNOWN" });
  if (sess.status !== "READY") return res.json({ status: sess.status });
  const out = { status: "READY", tokens: sess.tokens };
  SESS.delete(state);
  res.json(out);
});

app.post("/oauth/refresh", async (req, res) => {
  const { refreshToken, env = "prod" } = req.body || {};
  const base = BASES[env];
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: scopes(),
    });
    const r = await fetch(base.api + "/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + b64(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!r.ok) throw new Error(await r.text());
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log("OAuth server on :" + port));
