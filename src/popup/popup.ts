// src/popup/popup.ts (replace whole file)
import { computeKPIs, type Order } from "../calc/math.js";

const stats = document.getElementById("stats")!;
const input = document.getElementById("listedToday") as HTMLInputElement | null;
const saveBtn = document.getElementById("saveListed") as HTMLButtonElement | null;
const openBtn = document.getElementById("openOptions") as HTMLButtonElement | null;

async function render() {
  const { weeklyGoal = 0, listingGoalDaily = 0, listedToday = 0, orders = [] } =
    await chrome.storage.local.get(["weeklyGoal", "listingGoalDaily", "listedToday", "orders"]);
  const k = computeKPIs((orders as Order[]), { weeklySalesGoal: weeklyGoal, listingGoalDaily }, listedToday);

  const pct = (n: number) => (n * 100).toFixed(0) + "%";
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
  const v = Number((input as HTMLInputElement).value) || 0;
  await chrome.storage.local.set({ listedToday: v });
  render();
});

openBtn?.addEventListener("click", () => chrome.runtime.openOptionsPage());
render();
