// FILE: src/sw.ts  (full file)
import { getOrders, getFinances, getAds, getNewListings, type TimeWin } from "./api/ebay.js";
import { upsertRollups, getRollupsInRange, toDay } from "./db.js";
import { computeBaselinesForPresets, type RollupDaily } from "./calc/baseline.js";
import type { DayKey } from "./calc/baseline.js";

// --- alarms
chrome.alarms.create("egc-sync", { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(a => { if (a.name === "egc-sync") void runSync(); });

// --- messages
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "SYNC_NOW") {
      await runSync();
      sendResponse({ ok: true });
      return;
    }

    if (msg?.type === "GET_BASELINES") {
      const now = new Date();
      const start = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
      const rows = await getRollupsInRange("default", start.toISOString(), now.toISOString());
      const baselines = computeBaselinesForPresets(
        rows,
        now.toISOString(),
        msg?.denom === "active" ? "active" : "calendar"
      );
      sendResponse({ ok: true, baselines });
      return;
    }

    if (msg?.type === "GET_SELLER_SUMMARY") {
      const days = Number(msg?.windowDays || 30);
      const now = new Date();
      const start = new Date(now.getTime() - days * 24 * 3600 * 1000);
      const win: TimeWin = { startISO: start.toISOString(), endISO: now.toISOString() };

      // live pull per request
      const [orders, finances] = await Promise.all([getOrders(win), getFinances(win)]);

      const units = orders.length;
      const sum = <T>(arr: T[], f: (x: T) => number) => arr.reduce((s, x) => s + (f(x) || 0), 0);

      const itemGross = sum(orders, o => o.itemGross);
      const shipGross = sum(orders, o => o.shipGross);
      const taxGross = sum(orders, o => o.tax);
      const totalSalesInclTax = itemGross + shipGross + taxGross;

      const fees = sum(finances, t =>
        t.kind === "FVF" || t.kind === "PROC" || t.kind === "REG" ? Math.abs(t.amount) : 0
      );
      const labels = sum(finances, t => (t.kind === "LABEL" ? Math.abs(t.amount) : 0));
      const sellingCosts = fees + labels;

      const avgPricePerItem = units ? itemGross / units : 0; // ASP excluding shipping/tax
      const netSales = totalSalesInclTax - taxGross - sellingCosts;

      // Listing format split not wired yet → assume fixed price for now.
      const salesFixedPrice = totalSalesInclTax;
      const salesAuction = 0;

      const summary = {
        totalSalesInclTax,
        taxesCollectedBySeller: 0,
        taxesCollectedByEbay: taxGross,
        sellingCosts,
        netSales,
        unitsSold: units,
        avgPricePerItem,
        salesAuction,
        salesFixedPrice,
      };
      sendResponse({ ok: true, summary });
      return;
    }
  })().catch(err => sendResponse({ ok: false, error: String(err?.message || err) }));
  return true; // keep channel open for async
});

// --- sync core
async function runSync() {
  const now = new Date();
  const backfillDays = 90;
  const start = new Date(now.getTime() - backfillDays * 24 * 3600 * 1000);
  const win: TimeWin = { startISO: start.toISOString(), endISO: now.toISOString() };

  const [orders, finances, ads, listings] = await Promise.allSettled([
    getOrders(win),
    getFinances(win),
    getAds(win),
    getNewListings(win),
  ]);

  const acc = "default";
  const map = new Map<string, RollupDaily>();

  const ensure = (day: DayKey): RollupDaily => {
    const key = `${acc}|${day}`;
    const cur = map.get(key);
    if (cur) return cur;
    const row: RollupDaily = {
      key,
      accountId: acc,
      date: day,
      unitsSold: 0,
      grossExTax: 0,
      fees: 0,
      ads: 0,
      labels: 0,
      refunds: 0,
      listedValueNew: 0,
    };
    map.set(key, row);
    return row;
  };

  const dayOf = (iso: string): DayKey => toDay(new Date(iso));

  if (orders.status === "fulfilled") {
    for (const o of orders.value) {
      const d = dayOf(o.paidISO || now.toISOString());
      const r = ensure(d);
      r.unitsSold += 1;
      r.grossExTax += (o.itemGross || 0) + (o.shipGross || 0);
    }
  }
  if (finances.status === "fulfilled") {
    for (const f of finances.value) {
      const d = dayOf(f.dateISO);
      const r = ensure(d);
      if (f.kind === "FVF" || f.kind === "PROC" || f.kind === "REG") r.fees += Math.abs(f.amount || 0);
      else if (f.kind === "LABEL") r.labels += Math.abs(f.amount || 0);
      else if (f.kind === "REFUND") r.refunds += Math.abs(f.amount || 0);
    }
  }
  if (ads.status === "fulfilled") {
    for (const a of ads.value) {
      const d = dayOf(a.dateISO);
      const r = ensure(d);
      r.ads += Math.abs(a.amount || 0);
    }
  }
  if (listings.status === "fulfilled") {
    for (const l of listings.value) {
      const d = dayOf(l.createdISO);
      const r = ensure(d);
      r.listedValueNew += (l.listPrice || 0) * Math.max(1, l.qty || 0);
    }
  }

  await upsertRollups([...map.values()]);
  await chrome.storage.local.set({
    lastSyncISO: now.toISOString(),
    lastSyncErrors: summarizeErrors({ orders, finances, ads, listings }),
  });
}

function summarizeErrors(s: Record<string, PromiseSettledResult<any>>) {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(s)) out[k] = v.status === "rejected" ? String(v.reason?.message || v.reason) : null;
  return out;
}
