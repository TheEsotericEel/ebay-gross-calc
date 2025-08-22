/// <reference types="chrome-types" />
/// <reference lib="webworker" />
// src/workers/calcWorker.ts
export type CalcInput = { orders: Array<{ gross: number; fees: number; shipping: number; cogs: number }> };
export type CalcOutput = { gross: number; net: number };

self.onmessage = (e: MessageEvent<CalcInput>) => {
  const { orders } = e.data;
  const gross = orders.reduce((s, o) => s + o.gross, 0);
  const net = orders.reduce((s, o) => s + (o.gross - o.fees - o.shipping - o.cogs), 0);
  (self as unknown as Worker).postMessage({ gross, net } as CalcOutput);
};

