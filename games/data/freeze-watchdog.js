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
