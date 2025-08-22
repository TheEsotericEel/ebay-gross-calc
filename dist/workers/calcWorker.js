// src/workers/calcWorker.ts
self.onmessage = (e) => {
  const { orders } = e.data;
  const gross = orders.reduce((s, o) => s + o.gross, 0);
  const net = orders.reduce((s, o) => s + (o.gross - o.fees - o.shipping - o.cogs), 0);
  self.postMessage({ gross, net });
};
