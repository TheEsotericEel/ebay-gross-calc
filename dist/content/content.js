"use strict";
(() => {
  // src/content/content.ts
  (() => {
    if (window.__EGC_LOADED__) {
      console.log("[EGC] already loaded");
      return;
    }
    window.__EGC_LOADED__ = true;
    try {
      let estimateFees2 = function(o, feeRate = 0.13, procRate = 0.029, procFixed = 0.3) {
        const base = o.itemPrice ?? o.gross;
        return base * feeRate + base * procRate + procFixed;
      }, computeKPIs2 = function(orders, weeklySalesGoal, listingGoalDaily, listedToday) {
        let units = orders.length, gross = 0, fees = 0, ads = 0, shippingCost = 0, cogs = 0, refunds = 0;
        for (const o of orders) {
          gross += o.gross;
          fees += o.fees ?? estimateFees2(o);
          ads += o.ads ?? 0;
          shippingCost += o.shippingCost;
          cogs += o.cogs;
          refunds += o.refunds ?? 0;
        }
        const net = gross - fees - ads - shippingCost - cogs - refunds;
        const asp = units ? gross / units : 0;
        const marginPct = gross ? net / gross : 0;
        const progressWeekly = weeklySalesGoal > 0 ? Math.min(1, gross / weeklySalesGoal) : 0;
        const pipelineProgress = listingGoalDaily > 0 ? Math.min(1, listedToday / listingGoalDaily) : 0;
        return { units, gross, net, asp, marginPct, progressWeekly, pipelineProgress };
      }, attachStorageListener2 = function(renderFn) {
        if (onChange) chrome.storage.onChanged.removeListener(onChange);
        onChange = () => renderFn();
        chrome.storage.onChanged.addListener(onChange);
      };
      var estimateFees = estimateFees2, computeKPIs = computeKPIs2, attachStorageListener = attachStorageListener2;
      if (document.getElementById("egc-root")) return;
      console.log("[EGC] overlay init");
      const host = document.createElement("div");
      host.id = "egc-root";
      const shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `
      :host, * { box-sizing: border-box }
      .panel { position: fixed; bottom: 16px; right: 16px; width: 320px; max-height: 70vh;
        background:#0f1115; color:#e6e6e6; border:1px solid #2a2f3a; border-radius:12px;
        font:12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif; box-shadow:0 8px 28px rgba(0,0,0,.35); overflow:auto; z-index:2147483647 }
      .hdr { display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid #222; position:sticky; top:0; background:#0f1115 }
      .title { font-weight:600; font-size:12px }
      .sec { padding:10px 12px }
      .grid { display:grid; grid-template-columns: 1fr auto; gap:6px 10px }
      details { border:1px solid #1e2330; border-radius:8px; margin:8px 0; background:#0b0d12 }
      summary { padding:8px 10px; cursor:pointer; color:#c9d1d9; user-select:none }
      .content { padding:8px 10px; border-top:1px solid #1e2330 }
      button, input[type=number]{ font:12px inherit }
      button { background:#1f2430; color:#e6e6e6; border:1px solid #2a2f3a; border-radius:6px; padding:5px 8px; cursor:pointer }
      button:hover { background:#262c39 }
      input[type=number]{ width:100px; background:#0b0d12; color:#e6e6e6; border:1px solid #2a2f3a; border-radius:6px; padding:4px 6px }
    `;
      const wrap = document.createElement("div");
      wrap.className = "panel";
      wrap.innerHTML = `
      <div class="hdr">
        <div class="title">eBay Gross Calc</div>
        <div style="margin-left:auto"><button id="minBtn" title="Collapse">\u2013</button></div>
      </div>
      <div class="sec" id="bodySec">
        <details open>
          <summary>Overview</summary>
          <div class="content">
            <div class="grid">
              <div>Units</div><div id="k_units">0</div>
              <div>Gross</div><div id="k_gross">$0.00</div>
              <div>Net</div><div id="k_net">$0.00</div>
              <div>Margin</div><div id="k_margin">0%</div>
              <div>ASP</div><div id="k_asp">$0.00</div>
              <div>Weekly progress</div><div id="k_week">0%</div>
            </div>
          </div>
        </details>
        <details>
          <summary>Goals</summary>
          <div class="content">
            <div class="grid">
              <div>Weekly goal</div><div id="g_weekly">$0</div>
              <div>Daily listing goal</div><div id="g_daily">$0</div>
            </div>
            <div style="margin-top:6px"><button id="openOptions">Open Settings</button></div>
          </div>
        </details>
        <details>
          <summary>Pipeline</summary>
          <div class="content">
            <div class="grid">
              <div>Listed today</div>
              <div><input id="listedToday" type="number" min="0" step="1" /> <button id="saveListed">Save</button></div>
              <div>Progress</div><div id="k_pipe">0%</div>
            </div>
          </div>
        </details>
      </div>
    `;
      shadow.append(style, wrap);
      document.documentElement.appendChild(host);
      const $ = (id) => shadow.getElementById(id);
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
      $("openOptions").addEventListener("click", () => {
        const url = chrome.runtime.getURL("options/index.html");
        window.open(url, "_blank");
      });
      $("saveListed").addEventListener("click", async () => {
        const v = Number($("listedToday").value) || 0;
        await chrome.storage.local.set({ listedToday: v });
      });
      async function render() {
        const { weeklyGoal = 0, listingGoalDaily = 0, listedToday = 0, orders = [] } = await chrome.storage.local.get(["weeklyGoal", "listingGoalDaily", "listedToday", "orders"]);
        const k = computeKPIs2(orders, Number(weeklyGoal) || 0, Number(listingGoalDaily) || 0, Number(listedToday) || 0);
        $("k_units").textContent = String(k.units);
        $("k_gross").textContent = `$${k.gross.toFixed(2)}`;
        $("k_net").textContent = `$${k.net.toFixed(2)}`;
        $("k_margin").textContent = `${(k.marginPct * 100).toFixed(0)}%`;
        $("k_asp").textContent = `$${k.asp.toFixed(2)}`;
        $("k_week").textContent = `${(k.progressWeekly * 100).toFixed(0)}%`;
        $("g_weekly").textContent = `$${Number(weeklyGoal) || 0}`;
        $("g_daily").textContent = `$${Number(listingGoalDaily) || 0}`;
        $("listedToday").value = String(Number(listedToday) || 0);
        $("k_pipe").textContent = listingGoalDaily > 0 ? `${Math.min(100, Math.round((Number(listedToday) || 0) / Number(listingGoalDaily) * 100))}%` : "0%";
      }
      let onChange = null;
      attachStorageListener2(render);
      render();
      console.log("[EGC] overlay rendered");
    } catch (e) {
      console.error("[EGC] overlay error", e);
    }
  })();
})();
