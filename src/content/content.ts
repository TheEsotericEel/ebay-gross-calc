/// <reference lib="dom" />
/// <reference types="chrome"/>

(() => {
  if ((window as any).__EGC_LOADED__) { return; }
  (window as any).__EGC_LOADED__ = true;

  function estimateFees(o: { itemPrice?: number; gross?: number }, feeRate = 0.13, procRate = 0.029, procFixed = 0.3) {
    const base = (o as any).itemPrice ?? (o as any).gross ?? 0;
    return base * feeRate + base * procRate + procFixed;
  }

  function computeKPIs(
    orders: Array<{ gross: number; fees?: number; ads?: number; shippingCost?: number; cogs?: number; refunds?: number }>,
    weeklySalesGoal: number,
    listingGoalDaily: number,
    listedToday: number
  ) {
    let units = orders.length, gross = 0, fees = 0, ads = 0, shippingCost = 0, cogs = 0, refunds = 0;
    for (const o of orders) {
      gross += o.gross || 0;
      fees += o.fees ?? estimateFees(o);
      ads += o.ads ?? 0;
      shippingCost += o.shippingCost ?? 0;
      cogs += o.cogs ?? 0;
      refunds += o.refunds ?? 0;
    }
    const net = gross - fees - ads - shippingCost - cogs - refunds;
    const asp = units ? gross / units : 0;
    const marginPct = gross ? net / gross : 0;
    const progressWeekly = weeklySalesGoal > 0 ? Math.min(1, gross / weeklySalesGoal) : 0;
    const pipelineProgress = listingGoalDaily > 0 ? Math.min(1, listedToday / listingGoalDaily) : 0;
    return { units, gross, net, asp, marginPct, progressWeekly, pipelineProgress };
  }

  let onChange: ((changes: { [key: string]: chrome.storage.StorageChange }, area: string) => void) | null = null;
  function attachStorageListener(renderFn: () => void) {
    if (onChange) (chrome.storage.onChanged as any).removeListener(onChange);
    onChange = () => renderFn();
    (chrome.storage.onChanged as any).addListener(onChange);
  }

  if (document.getElementById("egc-root")) return;

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
      <div style="margin-left:auto"><button id="minBtn" title="Collapse">–</button></div>
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

  const $ = (sel: string) => shadow.querySelector(sel) as HTMLElement | null;

  shadow.append(style, wrap);
  document.documentElement.appendChild(host);

  const minBtn = $("#minBtn");
  if (minBtn) {
    minBtn.addEventListener("click", () => {
      const body = $("#bodySec")!;
      const btn = $("#minBtn") as HTMLButtonElement;
      const hidden = body.hasAttribute("hidden");
      if (hidden) { body.removeAttribute("hidden"); btn.textContent = "–"; }
      else { body.setAttribute("hidden", ""); btn.textContent = "+"; }
    });
  }

  const openOpt = $("#openOptions");
  if (openOpt) openOpt.addEventListener("click", () => chrome.runtime.openOptionsPage?.());

  const saveBtn = $("#saveListed");
  if (saveBtn) saveBtn.addEventListener("click", async () => {
    const inp = $("#listedToday") as HTMLInputElement | null;
    const v = Number(inp?.value ?? 0) || 0;
    await chrome.storage.local.set({ listedToday: v });
  });

  async function render() {
    const { weeklyGoal = 0, listingGoalDaily = 0, listedToday = 0, orders = [] } =
      await chrome.storage.local.get(["weeklyGoal", "listingGoalDaily", "listedToday", "orders"]) as any;

    const k = computeKPIs(orders || [], weeklyGoal, listingGoalDaily, listedToday);

    const setTxt = (id: string, v: string) => { const n = $("#" + id); if (n) n.textContent = v; };
    setTxt("k_units", String(k.units));
    setTxt("k_gross", `$${k.gross.toFixed(2)}`);
    setTxt("k_net", `$${k.net.toFixed(2)}`);
    setTxt("k_margin", `${(k.marginPct * 100).toFixed(1)}%`);
    setTxt("k_asp", `$${k.asp.toFixed(2)}`);
    setTxt("k_week", `${(k.progressWeekly * 100).toFixed(0)}%`);
    setTxt("k_pipe", `${(k.pipelineProgress * 100).toFixed(0)}%`);

    const inp = $("#listedToday") as HTMLInputElement | null;
    if (inp) inp.value = String(listedToday || 0);

    const gw = $("#g_weekly"); if (gw) gw.textContent = `$${weeklyGoal}`;
    const gd = $("#g_daily"); if (gd) gd.textContent = `$${listingGoalDaily}`;
  }

  attachStorageListener(render);
  render();
})();
