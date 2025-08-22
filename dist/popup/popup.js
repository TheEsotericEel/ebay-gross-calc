// src/calc/math.ts
function estimateFees(order, opts = { feeRate: 0.13, procRate: 0.029, procFixed: 0.3 }) {
  const base = order.itemPrice ?? order.gross;
  const marketplaceFee = base * opts.feeRate;
  const processingFee = base * opts.procRate + opts.procFixed;
  return marketplaceFee + processingFee;
}
function computeKPIs(orders, goals, listedToday = 0) {
  let units = orders.length;
  let gross = 0, fees = 0, ads = 0, shippingCost = 0, cogs = 0, refunds = 0;
  for (const o of orders) {
    gross += o.gross;
    fees += o.fees ?? estimateFees(o);
    ads += o.ads ?? 0;
    shippingCost += o.shippingCost;
    cogs += o.cogs;
    refunds += o.refunds ?? 0;
  }
  const net = gross - fees - ads - shippingCost - cogs - refunds;
  const asp = units ? gross / units : 0;
  const marginPct = gross ? net / gross : 0;
  const progressWeekly = goals.weeklySalesGoal > 0 ? Math.min(1, gross / goals.weeklySalesGoal) : 0;
  const pipelineProgress = goals.listingGoalDaily && goals.listingGoalDaily > 0 ? Math.min(1, listedToday / goals.listingGoalDaily) : 0;
  return {
    units,
    gross,
    net,
    asp,
    marginPct,
    fees,
    ads,
    shippingCost,
    cogs,
    refunds,
    progressWeekly,
    pipelineListedToday: listedToday,
    pipelineProgress
  };
}

// src/popup/popup.ts
var stats = document.getElementById("stats");
var input = document.getElementById("listedToday");
var saveBtn = document.getElementById("saveListed");
var openBtn = document.getElementById("openOptions");
async function render() {
  const { weeklyGoal = 0, listingGoalDaily = 0, listedToday = 0, orders = [] } = await chrome.storage.local.get(["weeklyGoal", "listingGoalDaily", "listedToday", "orders"]);
  const k = computeKPIs(orders, { weeklySalesGoal: weeklyGoal, listingGoalDaily }, listedToday);
  const pct = (n) => (n * 100).toFixed(0) + "%";
  stats.innerHTML = `
    <div>Units: ${k.units}</div>
    <div>Gross: $${k.gross.toFixed(2)} | Net: $${k.net.toFixed(2)} | Margin: ${pct(k.marginPct)}</div>
    <div>ASP: $${k.asp.toFixed(2)}</div>
    <div>Fees: $${k.fees.toFixed(2)} | Ads: $${k.ads.toFixed(2)} | Ship: $${k.shippingCost.toFixed(2)} | COGS: $${k.cogs.toFixed(2)}</div>
    <div>Weekly progress: ${pct(k.progressWeekly)}</div>
    <div>Pipeline today: $${k.pipelineListedToday.toFixed(0)} ${listingGoalDaily ? `of $${listingGoalDaily} (${pct(k.pipelineProgress)})` : ""}</div>
  `;
  if (input) input.value = String(k.pipelineListedToday);
}
saveBtn?.addEventListener("click", async () => {
  const v = Number(input.value) || 0;
  await chrome.storage.local.set({ listedToday: v });
  render();
});
openBtn?.addEventListener("click", () => chrome.runtime.openOptionsPage());
render();
