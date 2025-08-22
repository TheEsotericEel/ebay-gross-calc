// src/ebayAuth.ts
export type Env = "prod" | "sandbox";
type TokenBundle = { access_token:string; expires_in:number; refresh_token:string; refresh_token_expires_in:number; token_type:string };

const BACKEND = "https://YOUR_BACKEND_HOST"; // <- set me

// --- simple AES-GCM at-rest encryption ---
async function getKey(): Promise<CryptoKey> {
  const { k } = await chrome.storage.local.get("k");
  if (k) {
    return crypto.subtle.importKey("raw", base64ToBytes(k), "AES-GCM", true, ["encrypt","decrypt"]);
  }
  const key = await crypto.subtle.generateKey({ name:"AES-GCM", length:256 }, true, ["encrypt","decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  await chrome.storage.local.set({ k: bytesToBase64(new Uint8Array(raw)) });
  return key;
}
async function encrypt(obj:any){
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, data));
  return { iv: bytesToBase64(iv), ct: bytesToBase64(ct) };
}
async function decrypt(pkg:{iv:string; ct:string}){
  const key = await getKey();
  const iv = base64ToBytes(pkg.iv);
  const ct = base64ToBytes(pkg.ct);
  const pt = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(pt)));
}
function bytesToBase64(b:Uint8Array){ return btoa(String.fromCharCode(...b)); }
function base64ToBytes(s:string){ return Uint8Array.from(atob(s), c=>c.charCodeAt(0)); }

// --- public API ---
export async function beginOAuth(env:Env="prod"){
  const r = await fetch(BACKEND + "/oauth/new", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ env }) });
  const { state, authorizeUrl } = await r.json();
  // open auth
  await chrome.tabs.create({ url: authorizeUrl });
  // poll for result
  const deadline = Date.now() + 2*60*1000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const pr = await fetch(`${BACKEND}/oauth/result?state=${state}`);
    const pj = await pr.json();
    if (pj.status === "READY") {
      const tokens: TokenBundle = pj.tokens;
      const envSave = env;
      const enc = await encrypt({ env:envSave, ...tokens, obtainedAt: Date.now() });
      await chrome.storage.local.set({ ebayCredsEnc: enc });
      scheduleRefresh(tokens.expires_in);
      return { ok:true };
    }
    if (pj.status === "ERROR") return { ok:false, error:"OAuth error" };
  }
  return { ok:false, error:"Timed out" };
}

export async function getCredsDecrypted(){
  const { ebayCredsEnc } = await chrome.storage.local.get("ebayCredsEnc");
  if (!ebayCredsEnc) return null;
  return decrypt(ebayCredsEnc);
}

export async function refreshIfNeeded(){
  const current = await getCredsDecrypted();
  if (!current) return;
  const ttl = current.obtainedAt + (current.expires_in - 60)*1000 - Date.now();
  if (ttl > 0) return;
  const r = await fetch(BACKEND + "/oauth/refresh", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ refreshToken: current.refresh_token, env: current.env })
  });
  if (!r.ok) throw new Error(await r.text());
  const j: TokenBundle = await r.json();
  const enc = await encrypt({ ...current, ...j, obtainedAt: Date.now() });
  await chrome.storage.local.set({ ebayCredsEnc: enc });
  scheduleRefresh(j.expires_in);
}

export function scheduleRefresh(expiresInSec:number){
  const mins = Math.max(1, Math.floor((expiresInSec - 120)/60)); // 2 min buffer
  chrome.alarms.create("ebay_refresh", { delayInMinutes: mins });
}
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));
