// src/options/options.ts (replace whole file)
/// <reference types="chrome-types" />
type Order = {
  gross: number; itemPrice?: number; shippingCost: number; cogs: number;
  fees?: number; ads?: number; refunds?: number;
};

const weeklyEl = document.getElementById("weeklyGoal") as HTMLInputElement;
const listingEl = document.getElementById("listingGoalDaily") as HTMLInputElement;
const saveGoals = document.getElementById("saveGoals") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;

const el = (id: string) => document.getElementById(id) as HTMLInputElement;
const tBody = document.querySelector<HTMLTableSectionElement>("#ordersTable tbody")!;

async function getState() {
  const { weeklyGoal = 0, listingGoalDaily = 0, orders = [] } =
    await chrome.storage.local.get(["weeklyGoal", "listingGoalDaily", "orders"]);
  return { weeklyGoal, listingGoalDaily, orders: orders as Order[] };
}

function num(v: string) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }

async function render() {
  const { weeklyGoal, listingGoalDaily, orders } = await getState();
  weeklyEl.value = String(weeklyGoal);
  listingEl.value = String(listingGoalDaily);

  tBody.innerHTML = orders.map((o, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>$${o.gross?.toFixed(2) ?? "0.00"}</td>
      <td>$${o.itemPrice?.toFixed(2) ?? ""}</td>
      <td>$${o.shippingCost?.toFixed(2) ?? "0.00"}</td>
      <td>$${o.cogs?.toFixed(2) ?? "0.00"}</td>
      <td>$${o.fees?.toFixed(2) ?? ""}</td>
      <td>$${o.ads?.toFixed(2) ?? ""}</td>
      <td>$${o.refunds?.toFixed(2) ?? ""}</td>
      <td><button data-del="${i}">Delete</button></td>
    </tr>
  `).join("");

  tBody.querySelectorAll<HTMLButtonElement>("button[data-del]").forEach(btn => {
    btn.onclick = async () => {
      const idx = Number(btn.dataset.del);
      const fresh = (await getState()).orders;
      fresh.splice(idx, 1);
      await chrome.storage.local.set({ orders: fresh });
      render();
    };
  });
}

saveGoals.onclick = async () => {
  await chrome.storage.local.set({
    weeklyGoal: num(weeklyEl.value),
    listingGoalDaily: num(listingEl.value)
  });
  statusEl.textContent = "Saved";
  setTimeout(() => (statusEl.textContent = ""), 800);
};

(document.getElementById("addOrder") as HTMLButtonElement).onclick = async () => {
  const o: Order = {
    gross: num(el("o_gross").value),
    itemPrice: el("o_itemPrice").value ? num(el("o_itemPrice").value) : undefined,
    shippingCost: num(el("o_ship").value),
    cogs: num(el("o_cogs").value),
    fees: el("o_fees").value ? num(el("o_fees").value) : undefined,
    ads: el("o_ads").value ? num(el("o_ads").value) : undefined,
    refunds: el("o_refunds").value ? num(el("o_refunds").value) : undefined
  };
  const st = await getState();
  await chrome.storage.local.set({ orders: [...st.orders, o] });
  // clear inputs except ship/cogs which often repeat; keep as-is for speed
  ["o_gross","o_itemPrice","o_fees","o_ads","o_refunds"].forEach(id => (el(id).value = ""));
  render();
};

(document.getElementById("clearOrders") as HTMLButtonElement).onclick = async () => {
  await chrome.storage.local.set({ orders: [] });
  render();
};

(document.getElementById("exportOrders") as HTMLButtonElement).onclick = async () => {
  const { orders } = await getState();
  const blob = new Blob([JSON.stringify(orders, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "orders.json"; a.click();
  URL.revokeObjectURL(url);
};

render();
