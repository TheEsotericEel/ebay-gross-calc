// ---------- helpers
function fmtMoney(n){ return (n||0).toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:2}); }
function pct(n){ return ((n||0)*100).toFixed(1)+"%"; }

// ---------- tabs
document.addEventListener("DOMContentLoaded", () => {
$("#openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
  const tabs = document.querySelectorAll(".tab");
  const panes = { baselines: $("#pane-baselines"), sellerhub: $("#pane-sellerhub") };
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    const which = t.dataset.tab;
    panes.baselines.classList.toggle("hide", which!=="baselines");
    panes.sellerhub.classList.toggle("hide", which!=="sellerhub");
  }));

  // baselines wiring
  const denomSel = $("#denom");
  $("#refresh").addEventListener("click", () => loadBaselines(denomSel.value));
  $("#sync").addEventListener("click", async () => {
    $("#status").textContent = "Syncing…";
    const r = await chrome.runtime.sendMessage({ type:"SYNC_NOW" });
    $("#status").textContent = r?.ok ? "Sync complete." : ("Sync failed: "+(r?.error||"unknown"));
    await loadBaselines(denomSel.value);
  });
  loadBaselines(denomSel.value);

  // seller hub wiring
  $("#sh-load").addEventListener("click", () => loadSellerHub(Number($("#sh-window").value)));
  loadSellerHub(30);
});

function $(sel){ return document.querySelector(sel); }

// ---------- baselines pane
async function loadBaselines(denom){
  const res = await chrome.runtime.sendMessage({ type:"GET_BASELINES", denom });
  const el = $("#list"), st = $("#status");
  if(!res?.ok){ st.textContent = "Error: "+(res?.error||"unknown"); el.innerHTML=""; return; }
  const b = res.baselines||{}; st.textContent = "Loaded "+Object.keys(b).join(", ")+"d.";
  const rows = [];
  for(const k of ["7","30","90","180","365"]){
    const v = b[k]; if(!v) continue;
    rows.push(`
      <div class="row"><div><b>${k}d</b></div><div class="m">ASP</div><div>${fmtMoney(v.asp)}</div></div>
      <div class="row"><div></div><div class="m">Sales/day</div><div>${fmtMoney(v.salesPerDay)}</div></div>
      <div class="row"><div></div><div class="m">Net/day</div><div>${fmtMoney(v.netPerDay)}</div></div>
      <div class="row"><div></div><div class="m">Units/day</div><div>${(v.unitsPerDay||0).toFixed(2)}</div></div>
      <div class="row"><div></div><div class="m">Fees%</div><div>${pct(v.feeRate)}</div></div>
      <div class="row"><div></div><div class="m">Ads%</div><div>${pct(v.adRate)}</div></div>
      <div class="row"><div></div><div class="m">Labels%</div><div>${pct(v.labelRate)}</div></div>
      <div class="row" style="margin-bottom:8px;"><div></div><div class="m">Refund%</div><div>${pct(v.refundRate)}</div></div>
    `);
  }
  el.innerHTML = rows.join("");
}

// ---------- seller hub pane
async function loadSellerHub(windowDays){
  const st = $("#sh-status"), el = $("#sh-list");
  st.textContent = "Loading…";
  const res = await chrome.runtime.sendMessage({ type:"GET_SELLER_SUMMARY", windowDays });
  if(!res?.ok){ st.textContent = "Error: "+(res?.error||"unknown"); el.innerHTML=""; return; }
  st.textContent = `Window ${windowDays}d`;
  const s = res.summary;

  el.innerHTML = `
    <div class="row"><div><b>Total sales (incl. taxes)</b></div><div>${fmtMoney(s.totalSalesInclTax)}</div></div>
    <div class="row"><div class="m">Taxes & fees</div><div></div></div>
    <div class="row"><div>Collected by seller</div><div>${fmtMoney(s.taxesCollectedBySeller)}</div></div>
    <div class="row" style="margin-bottom:6px;"><div>Collected by eBay</div><div>${fmtMoney(s.taxesCollectedByEbay)}</div></div>

    <div class="row" style="margin-bottom:6px;"><div><b>Selling costs (incl. shipping)</b></div><div>${fmtMoney(s.sellingCosts)}</div></div>

    <div class="row" style="background:#eef;"><div><b>Net sales</b> (net of taxes & selling costs)</div><div><b>${fmtMoney(s.netSales)}</b></div></div>

    <div class="row" style="margin-top:6px;"><div>Quantity sold</div><div>${s.unitsSold||0}</div></div>
    <div class="row"><div>Avg. sales price per item</div><div>${fmtMoney(s.avgPricePerItem)}</div></div>
    <div class="row"><div>Sales via Auction</div><div>${fmtMoney(s.salesAuction)}</div></div>
    <div class="row"><div>Sales via Fixed Price</div><div>${fmtMoney(s.salesFixedPrice)}</div></div>
  `;
}
