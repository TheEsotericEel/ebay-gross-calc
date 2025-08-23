// src/sw.ts
/// <reference types="chrome"/>

import { fetchRecentOrders, fetchTransactions } from "./ebay.js";

chrome.runtime.onInstalled.addListener((_details: chrome.runtime.InstalledDetails) => {
  // no-op
});

chrome.runtime.onMessage.addListener(
  (
    msg: { type?: string } | undefined,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    (async () => {
      try {
        if (msg?.type === "EBAY_FETCH_SAMPLE") {
          const [orders, txns] = await Promise.all([
            fetchRecentOrders(20),
            fetchTransactions({ limit: 100 }),
          ]);
          await chrome.storage.local.set({ orders, txns, lastSync: Date.now() });
          const orderCount =
            Array.isArray((orders as any)?.orders) ? (orders as any).orders.length : 0;
          const txnCount =
            Array.isArray((txns as any)?.transactions) ? (txns as any).transactions.length : 0;
          sendResponse({ ok: true, counts: { orders: orderCount, txns: txnCount } });
          return;
        }
        sendResponse({ ok: false, error: "Unknown message type" });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();

    return true; // keep channel open
  }
);

(chrome.alarms.onAlarm as any).addListener(async (a: chrome.alarms.Alarm) => {
  if (a.name === "ebay_refresh") {
    const { refreshIfNeeded, scheduleRefresh } = await import("./ebayAuth.js");
    try {
      await refreshIfNeeded();
    } finally {
      scheduleRefresh(3600); // safety
    }
  }
});
