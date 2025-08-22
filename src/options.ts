// src/options.ts
/// <reference types="chrome"/>
import { beginOAuth, getCredsDecrypted } from "./ebayAuth";

const el = (id:string)=>document.getElementById(id)!;
async function render(){
  const creds = await getCredsDecrypted();
  el("status").textContent = creds ? `Linked (${creds.env}). Access token set.` : "Not linked.";
}
el("connect").addEventListener("click", async () => {
  el("status").textContent = "Opening eBay…";
  const r = await beginOAuth("prod");
  el("status").textContent = r.ok ? "Linked." : `Failed: ${r.error}`;
});
el("disconnect").addEventListener("click", async () => {
  await chrome.storage.local.remove(["ebayCredsEnc"]);
  el("status").textContent = "Disconnected.";
});
render();
