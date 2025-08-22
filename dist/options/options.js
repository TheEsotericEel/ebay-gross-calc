// src/options/options.ts
var weeklyEl = document.getElementById("weeklyGoal");
var listingEl = document.getElementById("listingGoalDaily");
var saveGoals = document.getElementById("saveGoals");
var statusEl = document.getElementById("status");
var el = (id) => document.getElementById(id);
var tBody = document.querySelector("#ordersTable tbody");
async function getState() {
  const { weeklyGoal = 0, listingGoalDaily = 0, orders = [] } = await chrome.storage.local.get(["weeklyGoal", "listingGoalDaily", "orders"]);
  return { weeklyGoal, listingGoalDaily, orders };
}
function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}
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
  tBody.querySelectorAll("button[data-del]").forEach((btn) => {
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
  setTimeout(() => statusEl.textContent = "", 800);
};
document.getElementById("addOrder").onclick = async () => {
  const o = {
    gross: num(el("o_gross").value),
    itemPrice: el("o_itemPrice").value ? num(el("o_itemPrice").value) : void 0,
    shippingCost: num(el("o_ship").value),
    cogs: num(el("o_cogs").value),
    fees: el("o_fees").value ? num(el("o_fees").value) : void 0,
    ads: el("o_ads").value ? num(el("o_ads").value) : void 0,
    refunds: el("o_refunds").value ? num(el("o_refunds").value) : void 0
  };
  const st = await getState();
  await chrome.storage.local.set({ orders: [...st.orders, o] });
  ["o_gross", "o_itemPrice", "o_fees", "o_ads", "o_refunds"].forEach((id) => el(id).value = "");
  render();
};
document.getElementById("clearOrders").onclick = async () => {
  await chrome.storage.local.set({ orders: [] });
  render();
};
document.getElementById("exportOrders").onclick = async () => {
  const { orders } = await getState();
  const blob = new Blob([JSON.stringify(orders, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "orders.json";
  a.click();
  URL.revokeObjectURL(url);
};
render();
