// src/workers/background.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ listedToday: 0 });
});
chrome.alarms?.create?.("rollup", { periodInMinutes: 15 });
chrome.alarms?.onAlarm.addListener(async (a) => {
  if (a.name !== "rollup") return;
});
