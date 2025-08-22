"use strict";
(() => {
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

  // src/content/content.ts
  (() => {
    if (document.getElementById("egc-root")) return;
    const host = document.createElement("div");
    host.id = "egc-root";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
    :host, * { box-sizing: border-box }
    .panel { position: fixed; bottom: 16px; right: 16px; width: 320px; max-height: 70vh;
      background:#0f1115; color:#e6e6e6; border:1px solid #2a2f3a; border-radius:12px;
      font:12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif; box-shadow:0 8px 28px rgba(0,0,0,.35); overflow:auto; }
    .hdr { display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid #222; position:sticky; top:0; background:#0f1115 }
    .dot { width:8px; height:8px; border-radius:50%; background:#4ade80 }
    .title { font-weight:600; font-size:12px }
    .row { display:flex; justify-content:space-between; align-items:center; padding:6px 0 }
    .sec { padding:10px 12px }
    .k { color:#9aa4b2 }
    .v { color:#fff }
    button, input[type=number] { font:12px inherit }
    button { background:#1f2430; color:#e6e6e6; border:1px solid #2a2f3a; border-radius:6px; padding:5px 8px; cursor:pointer }
    button:hover { background:#262c39 }
    input[type=number]{ width:100px; background:#0b0d12; color:#e6e6e6; border:1px solid #2a2f3a; border-radius:6px; padding:4px 6px }
    details { border:1px solid #1e2330; border-radius:8px; margin:8px 0; background:#0b0d12 }
    summary { padding:8px 10px; cursor:pointer; color:#c9d1d9; user-select:none }
    .content { padding:8px 10px; border-top:1px solid #1e2330 }
    .grid { display:grid; grid-template-columns: 1fr auto; gap:6px 10px }
    .subtle { color:#9aa4b2; font-size:11px }
    .rowgap { display:flex; gap:6px; align-items:center }
    .pill { padding:2px 6px; border-radius:999px; background:#1f2430; border:1px solid #2a2f3a }
    .link { color:#60a5fa; text-decoration:underline; cursor:pointer }
  `;
    const wrap = document.createElement("div");
    wrap.className = "panel";
    wrap.innerHTML = `
    <div class="hdr">
      <div class="dot" title="running"></div>
      <div class="title">eBay Gross Calc</div>
      <div class="pill" id="statusPill">manual</div>
      <div style="margin-left:auto" class="rowgap">
        <button id="openOptions">Settings</button>
        <button id="minBtn" title="Collapse">\u2013</button>
      </div>
    </div>
    <div class="sec" id="bodySec">
      <details open>
        <summary>Overview</summary>
        <div class="content">
          <div class="grid">
            <div class="k">Units</div><div class="v" id="k_units">0</div>
            <div class="k">Gross</div><div class="v" id="k_gross">$0.00</div>
            <div class="k">Net</div><div class="v" id="k_net">$0.00</div>
            <div class="k">Margin</div><div class="v" id="k_margin">0%</div>
            <div class="k">ASP</div><div class="v" id="k_asp">$0.00</div>
          </div>
          <div class="subtle" style="margin-top:6px">Weekly progress: <span id="k_week">%0</span></div>
        </div>
      </details>

      <details>
        <summary>Goals</summary>
        <div class="content">
          <div class="grid">
            <div class="k">Weekly sales goal</div><div class="v" id="g_weekly">$0</div>
            <div class="k">Daily listing goal</div><div class="v" id="g_daily">$0</div>
          </div>
          <div class="subtle" style="margin-top:6px"><span class="link" id="goToSettings">Edit in Settings</span></div>
        </div>
      </details>

      <details>
        <summary>Pipeline</summary>
        <div class="content">
          <div class="grid">
            <div class="k">Listed today</div>
            <div class="rowgap" style="justify-content:flex-end">
              <input id="listedToday" type="number" min="0" step="1" />
              <button id="saveListed">Save</button>
            </div>
            <div class="k">Progress</div><div class="v" id="k_pipe">0%</div>
          </div>
        </div>
      </details>

      <details>
        <summary>Orders (manual)</summary>
        <div class="content">
          <div class="subtle">Add via Settings \u2192 Manual Orders. Quick add here:</div>
          <div class="rowgap" style="margin-top:6px; flex-wrap:wrap">
            <input id="q_gross" type="number" placeholder="Gross $" step="0.01" />
            <input id="q_ship"  type="number" placeholder="Ship $" step="0.01" />
            <input id="q_cogs"  type="number" placeholder="COGS $" step="0.01" />
            <button id="q_add">Add</button>
            <button id="q_clear" title="Clear all orders">Clear</button>
          </div>
          <div class="subtle" style="margin-top:6px"><span id="ordersCount">0</span> orders in memory</div>
        </div>
      </details>
    </div>
  `;
    shadow.append(style, wrap);
    async function getState() {
      const keys = ["weeklyGoal", "listingGoalDaily", "listedToday", "orders"];
      const st = await chrome.storage.local.get(keys);
      return {
        weeklyGoal: Number(st.weeklyGoal ?? 0),
        listingGoalDaily: Number(st.listingGoalDaily ?? 0),
        listedToday: Number(st.listedToday ?? 0),
        orders: st.orders ?? []
      };
    }
    const $ = (id) => shadow.getElementById(id);
    async function render() {
      const { weeklyGoal, listingGoalDaily, listedToday, orders } = await getState();
      const k = computeKPIs(orders, { weeklySalesGoal: weeklyGoal, listingGoalDaily }, listedToday);
      $("k_units").textContent = String(k.units);
      $("k_gross").textContent = `$${k.gross.toFixed(2)}`;
      $("k_net").textContent = `$${k.net.toFixed(2)}`;
      $("k_margin").textContent = `${(k.marginPct * 100).toFixed(0)}%`;
      $("k_asp").textContent = `$${k.asp.toFixed(2)}`;
      $("k_week").textContent = `${(k.progressWeekly * 100).toFixed(0)}%`;
      $("g_weekly").textContent = `$${weeklyGoal}`;
      $("g_daily").textContent = `$${listingGoalDaily}`;
      $("listedToday").value = String(listedToday);
      $("k_pipe").textContent = listingGoalDaily > 0 ? `${Math.min(100, Math.round(listedToday / listingGoalDaily * 100))}%` : "0%";
      $("ordersCount").textContent = String(orders.length);
    }
    $("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
    $("goToSettings").addEventListener("click", () => chrome.runtime.openOptionsPage());
    $("minBtn").addEventListener("click", () => {
      const body = $("bodySec");
      const btn = $("minBtn");
      const hidden = body.hasAttribute("hidden");
      if (hidden) {
        body.removeAttribute("hidden");
        btn.textContent = "\u2013";
      } else {
        body.setAttribute("hidden", "");
        btn.textContent = "+";
      }
    });
    $("saveListed").addEventListener("click", async () => {
      const v = Number($("listedToday").value) || 0;
      await chrome.storage.local.set({ listedToday: v });
    });
    $("q_add").addEventListener("click", async () => {
      const gross = Number($("q_gross").value) || 0;
      const shippingCost = Number($("q_ship").value) || 0;
      const cogs = Number($("q_cogs").value) || 0;
      const st = await getState();
      st.orders.push({ gross, shippingCost, cogs });
      await chrome.storage.local.set({ orders: st.orders });
      $("q_gross").value = "";
      $("q_ship").value = "";
      $("q_cogs").value = "";
    });
    $("q_clear").addEventListener("click", async () => {
      await chrome.storage.local.set({ orders: [] });
    });
    chrome.storage.onChanged.addListener((_changes, _area) => render());
    render();
  })();
})();
