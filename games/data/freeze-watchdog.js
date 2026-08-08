/**
 * Freeze watchdog — captures runtime errors before the page locks up so the
 * next reproduction has evidence. Persists to localStorage (max 20 entries,
 * FIFO) so logs survive even if user has to close the tab.
 *
 * Inspect via DevTools console: JSON.parse(localStorage.__freezeLog || '[]')
 * Clear via: localStorage.removeItem('__freezeLog')
 *
 * Also installs a visibilitychange handler that clears stale game intervals
 * registered through window.__cleanupHooks.
 *
 * Created 2026-04-28 — see plan purring-brewing-flurry.md.
 */
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__freezeWatchdogInstalled) return;
  window.__freezeWatchdogInstalled = true;

  const KEY = '__freezeLog';
  const MAX = 20;

  function push(entry) {
    try {
      const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
      arr.push(Object.assign({ t: Date.now() }, entry));
      while (arr.length > MAX) arr.shift();
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (_) { /* localStorage may be full or disabled */ }
  }

  window.addEventListener('error', function (e) {
    push({
      type: 'error',
      msg: String(e && e.message || ''),
      src: String(e && e.filename || ''),
      ln: e && e.lineno || 0,
      col: e && e.colno || 0,
      stack: e && e.error && e.error.stack ? String(e.error.stack).slice(0, 800) : ''
    });
  });

  window.addEventListener('unhandledrejection', function (e) {
    const r = e && e.reason;
    push({
      type: 'rejection',
      msg: r ? String(r.message || r) : '',
      stack: r && r.stack ? String(r.stack).slice(0, 800) : ''
    });
  });

  // ── STALL DETECTOR ────────────────────────────────────────────────────────
  // The freezes the owner actually reports produce NO error and NO rejection,
  // so the two handlers above capture nothing at all. The worst one found so
  // far -- Pixi re-initialised on a canvas whose WebGL context is lost by spec
  // -- blocked the main thread with zero heartbeats for 45s and never threw.
  //
  // A timer cannot fire while the thread is blocked either, but that is exactly
  // the signal: when it finally does fire, the elapsed time is far larger than
  // the interval. Record that gap so the next reproduction on the tablet leaves
  // evidence instead of only a memory of the game "hanging".
  //
  // Only while the page is VISIBLE: a backgrounded tab is throttled on purpose
  // and would otherwise log a stall every time the child switches away.
  // Boot is measured separately. A heavy page on a 4x-throttled tablet really
  // does block for seconds while it starts (gym-pokemon: 4.7s, measured), and
  // that is worth knowing -- but it is a different problem from a mid-play
  // freeze, and folding the two together makes the log too noisy to act on.
  var TICK = 1000;
  var STALL = 4000;            // ~4s of blocked main thread is never legitimate
  var lastTick = Date.now();
  var hiddenSince = 0;
  var settled = false;
  window.addEventListener('load', function () { setTimeout(function () { settled = true; lastTick = Date.now(); }, 3000); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') hiddenSince = Date.now();
    else { lastTick = Date.now(); hiddenSince = 0; }
  });
  setInterval(function () {
    var now = Date.now();
    var gap = now - lastTick;
    lastTick = now;
    if (document.visibilityState !== 'visible' || hiddenSince) return;
    if (gap < STALL) return;
    push({
      // 'boot-slow' is a startup cost worth knowing about; 'stall' is a game
      // that froze under the child's hands. Never conflate them.
      type: settled ? 'stall' : 'boot-slow',
      msg: 'main thread blocked ' + Math.round(gap) + 'ms',
      page: location.pathname.split('/').pop(),
      // Whatever the page chose to expose about where it was; games can set
      // window.__freezeContext = 'level 7 restart' before a risky step.
      ctx: String(window.__freezeContext || '')
    });
  }, TICK);

  // Read the log without DevTools -- the owner tests on a tablet and will never
  // open a console. `window.freezeLog()` returns it, and appending
  // `#freezelog` to any page URL prints it into a plain overlay.
  window.freezeLog = function () {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; }
  };
  if (location.hash === '#freezelog') {
    window.addEventListener('load', function () {
      var log = window.freezeLog();
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#1b1430;color:#fff;' +
        'font:12px/1.5 monospace;padding:16px;overflow:auto;white-space:pre-wrap';
      d.textContent = log.length
        ? log.map(function (e) { return new Date(e.t).toLocaleString() + '  ' + e.type + '  ' + (e.page || '') + '  ' + e.msg; }).join('\n')
        : 'Tidak ada catatan macet.';
      var b = document.createElement('button');
      b.textContent = 'Tutup';
      b.style.cssText = 'position:fixed;right:16px;top:16px;min-height:44px;padding:0 18px;border:0;' +
        'border-radius:14px;font:inherit;font-weight:700;background:#ffd968;color:#3a2b12';
      b.addEventListener('click', function () { d.remove(); });
      d.appendChild(b);
      document.body.appendChild(d);
    });
  }

  window.__cleanupHooks = window.__cleanupHooks || [];
  window.registerCleanupHook = function (fn) {
    if (typeof fn === 'function') window.__cleanupHooks.push(fn);
  };

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'hidden') return;
    for (const fn of window.__cleanupHooks) {
      try { fn(); } catch (err) { push({ type: 'cleanup-fail', msg: String(err && err.message || err) }); }
    }
  });
})();
