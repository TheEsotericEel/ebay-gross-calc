// src/workers/background.ts  (replace whole file)
/// <reference lib="webworker" />
/// <reference types="chrome-types" />
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ listedToday: 0 });
});

chrome.alarms?.create?.("rollup", { periodInMinutes: 15 });
chrome.alarms?.onAlarm.addListener(async (a: chrome.alarms.Alarm) => {
  if (a.name !== "rollup") return;
  // placeholder for future sync/pipeline math
});

