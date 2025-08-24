/// <reference lib="WebWorker" />
/// <reference types="chrome" />
export {};

import { fetchRecentOrders, fetchTransactions } from "./ebay";
import { refreshIfNeeded, scheduleRefresh } from "./ebayAuth";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("ebay_refresh", { delayInMinutes: 1, periodInMinutes: 60 });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    const type = typeof msg === "string" ? msg : msg?.type;
    try {
      if (type === "PING") { sendResponse("PONG"); return; }
      if (type === "EBAY_FETCH_SAMPLE") {
        const [orders, txns] = await Promise.all([
          fetchRecentOrders(20),
          fetchTransactions({ limit: 100 }),
        ]);
        await chrome.storage.local.set({ orders, txns, lastSync: Date.now() });
        sendResponse({ ok: true });
        return;
      }
      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (e) { sendResponse({ ok: false, error: String(e) }); }
  })();
  return true;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "ebay_refresh") {
    try { await refreshIfNeeded(); } finally { scheduleRefresh?.(3600); }
  }
});
