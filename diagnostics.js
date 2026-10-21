(() => {
  'use strict';

  // LOLBeans runtime diagnostics — read-only. This script does not alter game state.
  const VERSION = '1.0.0';
  const findings = [];
  const add = (label, value) => findings.push({ label, value: String(value) });
  const safeType = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;

  const globalNames = (() => {
    try { return Object.getOwnPropertyNames(window); }
    catch (e) { return []; }
  })();

  const interesting = /player|game|scene|ammo|physics|three|network|world|engine|camera|input|controller/i;
  add('Diagnostic version', VERSION);
  add('Page', location.origin + location.pathname);
  add('Document ready', document.readyState);
  add('Canvas elements', document.querySelectorAll('canvas').length);
  add('Window global count', globalNames.length);
  add('Interesting global names', globalNames.filter(n => interesting.test(n)).slice(0, 100).join(', ') || '(none found)');

  for (const name of ['THREE', 'Ammo', 'Module', 'scene', 'game', 'player', 'players', 'world', 'physics']) {
    let value;
    try {
      const d = Object.getOwnPropertyDescriptor(window, name);
      if (d && Object.prototype.hasOwnProperty.call(d, 'value')) value = d.value;
      else if (d) value = '[accessor property; not invoked]';
      else value = '[not a direct window property]';
    } catch (e) { value = '[unavailable]'; }
    add('Global ' + name, value && typeof value === 'object'
      ? safeType(value) + ' (' + Object.keys(value).slice(0, 12).join(', ') + ')'
      : value);
  }

  // Inspect only own data properties of a limited sample of global objects.
  // Accessor getters are deliberately never invoked.
  const queue = [];
  const seen = new WeakSet();
  for (const name of globalNames) {
    try {
      const d = Object.getOwnPropertyDescriptor(window, name);
      if (d && Object.prototype.hasOwnProperty.call(d, 'value') && d.value &&
          (typeof d.value === 'object' || typeof d.value === 'function')) {
        queue.push({ name, value: d.value, depth: 0 });
      }
    } catch (_) {}
  }

  const candidates = [];
  let visited = 0;
  while (queue.length && visited < 1800) {
    const item = queue.shift();
    const obj = item.value;
    if (!obj || (typeof obj !== 'object' && typeof obj !== 'function') || seen.has(obj)) continue;
    seen.add(obj);
    visited++;

    let keys;
    try { keys = Object.getOwnPropertyNames(obj).slice(0, 120); }
    catch (_) { continue; }

    const keySet = new Set(keys);
    const score = [
      keySet.has('isPlayer') ? 3 : 0,
      keySet.has('ammoBody') ? 4 : 0,
      keySet.has('floorContact') ? 2 : 0,
      keySet.has('input') ? 1 : 0,
      keySet.has('getLinearVelocity') ? 1 : 0
    ].reduce((a, b) => a + b, 0);

    if (score >= 4) {
      candidates.push({
        path: item.name,
        score,
        keys: keys.filter(k => /isPlayer|ammoBody|floorContact|flying|input|position|velocity|scene|player/i.test(k)).slice(0, 24)
      });
    }

    if (item.depth >= 2) continue;
    for (const key of keys) {
      if (key === 'constructor' || key === 'prototype' || key === 'caller' || key === 'callee' || key === 'arguments') continue;
      try {
        const d = Object.getOwnPropertyDescriptor(obj, key);
        if (!d || !Object.prototype.hasOwnProperty.call(d, 'value')) continue;
        const v = d.value;
        if (v && (typeof v === 'object' || typeof v === 'function')) {
          queue.push({ name: item.name + '.' + key, value: v, depth: item.depth + 1 });
        }
      } catch (_) {}
    }
  }

  add('Objects inspected (limited scan)', visited);
  add('Player-like object candidates', candidates.length
    ? candidates.slice(0, 20).map(c => c.path + ' [score ' + c.score + ']: ' + c.keys.join(', ')).join('\n')
    : '(none reachable in the limited scan)');

  const report = {
    tool: 'LOLBeans runtime diagnostics',
    version: VERSION,
    timestamp: new Date().toISOString(),
    url: location.href,
    userAgent: navigator.userAgent,
    findings,
    candidates
  };

  try {
    console.group('[LOLBeans diagnostics] Read-only report');
    for (const item of findings) console.log(item.label + ':', item.value);
    console.log('Full report:', report);
    console.groupEnd();
  } catch (_) {}

  // Show a compact, touch-friendly report on screen as well as in DevTools.
  const old = document.getElementById('__lolbeans_diag_panel');
  if (old) old.remove();
  const panel = document.createElement('section');
  panel.id = '__lolbeans_diag_panel';
  panel.style.cssText = [
    'position:fixed','z-index:2147483647','left:10px','right:10px','top:10px',
    'max-height:72vh','overflow:auto','background:#101820','color:#f4f7fa',
    'border:1px solid #58c4dd','border-radius:12px','padding:12px',
    'font:13px/1.45 ui-monospace,monospace','box-shadow:0 4px 24px #0008',
    'white-space:pre-wrap','overflow-wrap:anywhere'
  ].join(';');

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;font-weight:700';
  const title = document.createElement('span');
  title.textContent = 'LOLBeans Diagnostics (read-only)';
  const close = document.createElement('button');
  close.textContent = 'Close';
  close.style.cssText = 'padding:6px 10px;border-radius:8px;border:0;background:#58c4dd;color:#101820;font-weight:700';
  close.addEventListener('click', () => panel.remove());
  header.append(title, close);

  const body = document.createElement('pre');
  body.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;margin:0';
  body.textContent = findings.map(f => f.label + ':\n  ' + f.value).join('\n\n');
  const copy = document.createElement('button');
  copy.textContent = 'Copy report JSON';
  copy.style.cssText = 'margin-top:10px;padding:8px 12px;border-radius:8px;border:0;background:#d8f3fa;color:#101820;font-weight:700';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      copy.textContent = 'Copied!';
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = JSON.stringify(report, null, 2);
      ta.style.cssText = 'width:100%;height:100px;margin-top:8px';
      panel.appendChild(ta);
      ta.focus();
      ta.select();
      copy.textContent = 'Select the report text and copy';
    }
  });
  panel.append(header, body, copy);
  (document.body || document.documentElement).appendChild(panel);
})();