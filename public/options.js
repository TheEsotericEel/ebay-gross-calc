const $ = s => document.querySelector(s);
$("#load").addEventListener("click", async () => {
  $("#out").textContent = "Loading…";
  const days = Number($("#win").value);
  const res = await chrome.runtime.sendMessage({ type:"GET_SELLER_SUMMARY", windowDays: days });
  $("#out").textContent = res?.ok ? JSON.stringify(res.summary, null, 2) : ("Error: "+(res?.error||"unknown"));
});
$("#sync").addEventListener("click", async () => {
  $("#out").textContent = "Syncing…";
  const r = await chrome.runtime.sendMessage({ type:"SYNC_NOW" });
  $("#out").textContent = r?.ok ? "Sync complete." : ("Sync failed: "+(r?.error||"unknown"));
});
