// FILE: src/db.ts
import type { RollupDaily } from "./calc/baseline.js";
import type { DayKey } from "./calc/baseline.js";

const DB_NAME = "egc-db";
const DB_VER = 1;
const STORE = "rollups";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "key" });
        os.createIndex("byDate", "date", { unique: false });
        os.createIndex("byAccountDate", ["accountId", "date"], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function upsertRollups(rows: RollupDaily[]) {
  if (!rows.length) return;
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const os = tx.objectStore(STORE);
  for (const r of rows) os.put(r);
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

export async function getRollupsInRange(
  accountId: string,
  startISO: string,
  endISO: string
): Promise<RollupDaily[]> {
  const db = await openDB();
  const os = db.transaction(STORE, "readonly").objectStore(STORE);
  const idx = os.index("byAccountDate");
  const start = new Date(startISO);
  const end = new Date(endISO);
  const lower: [string, DayKey] = [accountId, toDay(start)];
  const upper: [string, DayKey] = [accountId, toDay(end)];
  const range = IDBKeyRange.bound(lower, upper);
  const out: RollupDaily[] = [];
  await new Promise<void>((res, rej) => {
    const curReq = idx.openCursor(range);
    curReq.onsuccess = () => {
      const cur = curReq.result;
      if (!cur) return res();
      out.push(cur.value as RollupDaily);
      cur.continue();
    };
    curReq.onerror = () => rej(curReq.error);
  });
  db.close();
  return out;
}

export function toDay(d: Date): DayKey {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10) as DayKey;
}
