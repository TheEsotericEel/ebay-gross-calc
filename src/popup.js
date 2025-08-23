/// <reference types="chrome"/>
const btn = document.getElementById("testFetch");
const out = document.getElementById("testOut");

btn?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "EBAY_FETCH_SAMPLE" }, (res) => {
    out.textContent = JSON.stringify(res, null, 2);
  });
});