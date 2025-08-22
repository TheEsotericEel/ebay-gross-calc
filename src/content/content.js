// content.js  (plain JS, no bundler required)
// Creates a floating overlay inside a Shadow DOM to avoid eBay CSS collisions.

(function () {
  if (window.__egcInjected) return; // idempotent
  window.__egcInjected = true;

  // Host element
  const host = document.createElement('div');
  host.id = 'egc-host';
  // Keep host isolated above all layouts
  Object.assign(host.style, {
    position: 'fixed',
    inset: 'auto 16px 16px auto',
    zIndex: '2147483647', // maxed
    pointerEvents: 'none' // only panel receives events
  });
  document.documentElement.appendChild(host);

  // Shadow root for CSS isolation
  const shadow = host.attachShadow({ mode: 'open' });

  // Styles scoped to shadow root
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .egc-wrap { pointer-events: auto; font: 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #0f172a; }
    .egc-panel {
      width: 320px; background: #ffffff; border: 1px solid #e5e7eb;
      box-shadow: 0 10px 30px rgba(0,0,0,.15); border-radius: 10px; overflow: hidden;
    }
    .egc-header {
      display:flex; align-items:center; justify-content:space-between; padding:8px 10px;
      background:#0ea5e9; color:white; cursor:move; user-select:none;
    }
    .egc-title { font-weight:600; font-size:13px; }
    .egc-actions { display:flex; gap:6px; }
    .egc-btn {
      border:0; padding:4px 6px; border-radius:6px; background:rgba(255,255,255,.2);
      color:white; font-size:12px; cursor:pointer;
    }
    .egc-body { padding:10px; background:#fff; }
    .egc-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f1f5f9; }
    .egc-row:last-child { border-bottom:0; }
    .egc-k { color:#475569; }
    .egc-v { font-weight:600; }
    .egc-badge { display:inline-block; padding:2px 6px; font-size:11px; border-radius:999px; background:#f1f5f9; color:#0f172a; }
    .egc-collapsed .egc-body { display:none; }
  `;
  shadow.appendChild(style);

  // HTML
  const wrap = document.createElement('div');
  wrap.className = 'egc-wrap';
  wrap.innerHTML = `
    <div class="egc-panel" id="egc-panel">
      <div class="egc-header" id="egc-drag">
        <div class="egc-title">eBay Gross Calc <span class="egc-badge" id="egc-src">manual</span></div>
        <div class="egc-actions">
          <button class="egc-btn" id="egc-pin">pin</button>
          <button class="egc-btn" id="egc-collapse">–</button>
          <button class="egc-btn" id="egc-close">x</button>
        </div>
      </div>
      <div class="egc-body">
        <div class="egc-row"><span class="egc-k">Gross today</span><span class="egc-v" id="egc-gross">$0</span></div>
        <div class="egc-row"><span class="egc-k">Listed today</span><span class="egc-v" id="egc-listed">$0</span></div>
        <div class="egc-row"><span class="egc-k">Units sold</span><span class="egc-v" id="egc-units">0</span></div>
        <div class="egc-row"><span class="egc-k">Goal progress</span><span class="egc-v" id="egc-goal">0%</span></div>
      </div>
    </div>
  `;
  shadow.appendChild(wrap);

  // Basic state (demo placeholders). Replace later with real calc sync.
  const $ = (id) => shadow.getElementById(id);
  const panel = $('egc-panel');
  const dragEl = $('egc-drag');
  const btnClose = $('egc-close');
  const btnCollapse = $('egc-collapse');
  const btnPin = $('egc-pin');

  // Restore last position if pinned
  chrome.storage?.local.get(['egc_pos', 'egc_pinned', 'egc_collapsed'], (st) => {
    if (st.egc_pos) {
      panel.style.transform = `translate(${st.egc_pos.x}px, ${st.egc_pos.y}px)`;
    }
    if (st.egc_pinned) btnPin.dataset.active = '1';
    if (st.egc_collapsed) panel.classList.add('egc-collapsed');
  });

  // Drag to move
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  dragEl.addEventListener('mousedown', (e) => {
    dragging = true; sx = e.clientX; sy = e.clientY;
    const m = panel.style.transform.match(/translate\\(([-\\d.]+)px,\\s*([\-\\d.]+)px\\)/);
    ox = m ? parseFloat(m[1]) : 0; oy = m ? parseFloat(m[2]) : 0;
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    panel.style.transform = `translate(${ox + dx}px, ${oy + dy}px)`;
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return; dragging = false;
    if (btnPin.dataset.active === '1') {
      // Persist position
      const m = panel.style.transform.match(/translate\\(([-\\d.]+)px,\\s*([\-\\d.]+)px\\)/);
      const pos = m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
      chrome.storage?.local.set({ egc_pos: pos });
    }
  });

  // Controls
  btnClose.addEventListener('click', () => { host.remove(); });
  btnCollapse.addEventListener('click', () => {
    panel.classList.toggle('egc-collapsed');
    chrome.storage?.local.set({ egc_collapsed: panel.classList.contains('egc-collapsed') });
  });
  btnPin.addEventListener('click', () => {
    const active = btnPin.dataset.active === '1';
    btnPin.dataset.active = active ? '' : '1';
    chrome.storage?.local.set({ egc_pinned: !active });
  });

  // Demo numbers so you can see it working now
  try {
    chrome.storage?.local.get(['orders'], ({ orders = [] }) => {
      const gross = orders.reduce((s, o) => s + (o.gross || 0), 0);
      const units = orders.length;
      $('egc-gross').textContent = `$${gross.toFixed(2)}`;
      $('egc-units').textContent = String(units);
      $('egc-listed').textContent = '$0.00';
      $('egc-goal').textContent = units ? '42%' : '0%';
      $('egc-src').textContent = orders.length ? 'local' : 'manual';
    });
  } catch {}
})();
