// src/calc/math.ts  (new)
export type Order = {
  gross: number;      // buyer paid item price + tax + shipping collected (optional)
  itemPrice?: number; // if you want fees based on item price only
  shippingCost: number; // your label cost
  cogs: number;
  fees?: number;      // platform + processing; if omitted we compute approx
  ads?: number;       // promoted listings spend
  refunds?: number;   // refunds given
};

export type Goals = {
  weeklySalesGoal: number;     // $ target for week
  listingGoalDaily?: number;   // $ listed per day target
};

export type KPIs = {
  units: number;
  gross: number;
  net: number;
  asp: number;
  marginPct: number;
  fees: number;
  ads: number;
  shippingCost: number;
  cogs: number;
  refunds: number;
  progressWeekly: number;      // 0..1 of gross vs weekly goal
  pipelineListedToday: number; // current listedToday dollars
  pipelineProgress: number;    // 0..1 listedToday vs listingGoalDaily
};

// crude fee model fallback if per‑order fees not supplied
export function estimateFees(order: Order, opts = { feeRate: 0.13, procRate: 0.029, procFixed: 0.30 }) {
  const base = order.itemPrice ?? order.gross;
  const marketplaceFee = base * opts.feeRate;
  const processingFee = base * opts.procRate + opts.procFixed;
  return marketplaceFee + processingFee;
}

export function computeKPIs(orders: Order[], goals: Goals, listedToday = 0): KPIs {
  let units = orders.length;
  let gross = 0, fees = 0, ads = 0, shippingCost = 0, cogs = 0, refunds = 0;

  for (const o of orders) {
    gross += o.gross;
    fees  += o.fees ?? estimateFees(o);
    ads   += o.ads ?? 0;
    shippingCost += o.shippingCost;
    cogs  += o.cogs;
    refunds += o.refunds ?? 0;
  }
  const net = gross - fees - ads - shippingCost - cogs - refunds;
  const asp = units ? gross / units : 0;
  const marginPct = gross ? net / gross : 0;

  const progressWeekly = goals.weeklySalesGoal > 0 ? Math.min(1, gross / goals.weeklySalesGoal) : 0;
  const pipelineProgress = goals.listingGoalDaily && goals.listingGoalDaily > 0
    ? Math.min(1, listedToday / goals.listingGoalDaily)
    : 0;

  return {
    units, gross, net, asp, marginPct,
    fees, ads, shippingCost, cogs, refunds,
    progressWeekly, pipelineListedToday: listedToday, pipelineProgress
  };
}
