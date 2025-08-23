/// <reference lib="WebWorker" />
/// <reference types="chrome"/>

import { fetchRecentOrders, fetchTransactions } from "./ebay.js";

// Accept both plain string ("PING") and object messages ({type:"PING"})
type SwMessage = string | { type?: string } | undefined;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("ebay_refresh", { delayInMinutes: 1, periodInMinutes: 60 });
});

chrome.runtime.onMessage.addListener((
  msg: SwMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): true => {
  (async () => {
    const kind = typeof msg === "string" ? msg : msg?.type;

    try {
      if (kind === "PING") { sendResponse("PONG"); return; }

      if (kind === "EBAY_FETCH_SAMPLE") {
        const [orders, txns] = await Promise.all([
          fetchRecentOrders(20),
          fetchTransactions({ limit: 100 })
        ]);

        await chrome.storage.local.set({ orders, txns, lastSync: Date.now() });

        const oc = Array.isArray((orders as any)?.orders) ? (orders as any).orders.length : 0;
        const tc = Array.isArray((txns as any)?.transactions) ? (txns as any).transactions.length : 0;

        sendResponse({ ok: true, counts: { orders: oc, txns: tc } });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  })();

  return true; // keep channel open for async sendResponse
});

chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
  if (alarm.name === "ebay_refresh") {
    const { refreshIfNeeded, scheduleRefresh } = await import("./ebayAuth.js");
    try { await refreshIfNeeded(); } finally { scheduleRefresh?.(3600); }
  }
});
