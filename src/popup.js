/// <reference types="chrome"/>
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("testFetch");
  const out = document.getElementById("testOut");

  function show(o) { out.textContent = typeof o === "string" ? o : JSON.stringify(o, null, 2); }

  btn?.addEventListener("click", () => {
    btn.disabled = true;
    show("Fetching…");
    try {
      chrome.runtime.sendMessage({ type: "EBAY_FETCH_SAMPLE" }, (res) => {
        const err = chrome.runtime.lastError?.message;
        if (err) show({ ok:false, error: err });
        else show(res ?? { ok:false, error:"no response" });
        btn.disabled = false;
      });
    } catch (e) {
      show({ ok:false, error: String(e) });
      btn.disabled = false;
    }
  });
});
