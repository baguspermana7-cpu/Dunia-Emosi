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
  // 8s, not 3: these pages finish `load` and then spend seconds building a
  // WebGL scene. Arming during that window is what produced the false card.
  window.addEventListener('load', function () { setTimeout(function () { settled = true; lastTick = Date.now(); lastFrame = Date.now(); }, 8000); });
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

  // ── RENDER STALL + RECOVERY ───────────────────────────────────────────────
  // The stall detector above catches a BLOCKED main thread. The freeze the
  // owner hit in Gotham Getaway is the other kind: the page stays responsive,
  // timers keep firing, and the picture simply stops -- an exception thrown
  // inside an engine's update loop takes the rAF chain down with it, and
  // nothing else notices.
  //
  // So: watch requestAnimationFrame itself. If frames stop arriving for
  // RENDER_STALL ms while the page is visible, the game is frozen whatever the
  // cause, and the child gets a way out instead of a dead screen.
  //
  // For the film player the game runs inside a same-origin <iframe>, so the
  // PARENT's frames keep coming even when the game inside is dead. Its frames
  // are watched separately, through the iframe's own window.
  var RENDER_STALL = 5000;
  // Two consecutive observations before the card appears. A single one is not
  // evidence of a freeze on these pages: booting balapan-kereta-side under a
  // slow renderer blocks the main thread for seconds while it decodes assets,
  // and the first build of this raised the card over a game that was merely
  // still loading -- caught in a screenshot, not in theory.
  var STALL_STRIKES = 2;
  var strikes = 0;
  var lastFrame = Date.now();
  var lastInnerFrame = 0;
  var innerWin = null;
  var innerTick = null;
  var recovering = false;

  function beat() { lastFrame = Date.now(); try { requestAnimationFrame(beat); } catch (_) {} }
  requestAnimationFrame(beat);
  // Re-arm the heartbeat whenever it has gone quiet. Without this the detector
  // is one-shot: whatever killed the frame chain also killed this beat, so even
  // after the game recovers no frame is ever recorded again and the recovery
  // card would sit there over a perfectly healthy game.
  function rearm() { try { requestAnimationFrame(beat); } catch (_) {} }

  // Attach to the film player's game frame when it appears, and re-attach on
  // every navigation inside it (a new game = a new window).
  function watchInnerFrame() {
    var f = document.getElementById('frame');
    if (!f || !f.contentWindow) return;
    var w = f.contentWindow;
    if (w === innerWin) return;
    try {
      // cross-origin would throw here; those frames simply go unwatched
      void w.document;
    } catch (_) { innerWin = null; return; }
    innerWin = w;
    lastInnerFrame = Date.now();
    var tick = function () {
      if (f.contentWindow !== w) return;   // frame navigated away
      lastInnerFrame = Date.now();
      try { w.requestAnimationFrame(tick); } catch (_) {}
    };
    innerTick = tick;
    try { w.requestAnimationFrame(tick); } catch (_) { innerWin = null; }
  }
  function rearmInner() {
    if (!innerWin || !innerTick) return;
    try { innerWin.requestAnimationFrame(innerTick); } catch (_) {}
  }
  setInterval(watchInnerFrame, 2000);
  window.addEventListener('load', watchInnerFrame);

  function showRecovery(kind, gap) {
    if (recovering || document.getElementById('__freezeRecover')) return;
    recovering = true;
    push({ type: kind, msg: 'no frames for ' + Math.round(gap) + 'ms',
           page: location.pathname.split('/').pop(), ctx: String(window.__freezeContext || '') });

    var isFilm = /film-play/.test(location.pathname);
    var d = document.createElement('div');
    d.id = '__freezeRecover';
    d.setAttribute('role', 'alertdialog');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;' +
      'justify-content:center;background:rgba(12,10,26,0.82);backdrop-filter:blur(6px);' +
      'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding:20px';
    var card = document.createElement('div');
    card.style.cssText = 'max-width:340px;width:100%;background:#fff8e7;border:3px solid #ffd6a0;' +
      'border-radius:24px;box-shadow:0 10px 0 #d4956a;padding:22px 20px;text-align:center;color:#3a2b12';
    var h = document.createElement('div');
    h.textContent = 'Permainannya berhenti sebentar';
    h.style.cssText = 'font-size:19px;font-weight:900;margin-bottom:6px';
    var p2 = document.createElement('div');
    p2.textContent = 'Ayo mulai lagi, ya!';
    p2.style.cssText = 'font-size:14px;font-weight:700;opacity:.75;margin-bottom:16px';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap';
    function btn(label, bg, shadow, onClick) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'min-height:48px;padding:0 22px;border:0;border-radius:16px;font:inherit;' +
        'font-size:15px;font-weight:900;cursor:pointer;color:#3a2b12;background:' + bg +
        ';box-shadow:0 4px 0 ' + shadow;
      b.addEventListener('click', onClick);
      return b;
    }
    row.appendChild(btn('Main Lagi', '#ffd968', '#d4a017', function () {
      if (isFilm) { location.reload(); } else { location.reload(); }
    }));
    if (isFilm) {
      row.appendChild(btn('Beranda', '#bfe3ff', '#7aaddd', function () {
        location.href = 'film-anak.html';
      }));
    }
    card.appendChild(h); card.appendChild(p2); card.appendChild(row);

    // Carry the evidence ON the card. A freeze on the owner's tablet is the one
    // reproduction nobody can rerun, and asking him to open a log later loses
    // it. The last error line is printed small, under the buttons, so a single
    // screenshot of the stuck screen is a usable bug report.
    try {
      var log = JSON.parse(localStorage.getItem(KEY) || '[]');
      var last = null;
      for (var i = log.length - 1; i >= 0; i--) {
        if (log[i] && log[i].msg && /error|rejection/.test(log[i].type || '')) { last = log[i]; break; }
      }
      var note = document.createElement('div');
      note.id = '__freezeNote';
      note.style.cssText = 'margin-top:12px;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;' +
        'color:#7a6a4a;word-break:break-word;text-align:left';
      note.textContent = 'catatan teknis: ' + (last ? (last.msg || '').slice(0, 160) : kind) +
        ' · ' + (location.pathname.split('/').pop() || '') +
        (window.__freezeContext ? ' · ' + String(window.__freezeContext).slice(0, 40) : '');
      card.appendChild(note);
    } catch (_) {}

    d.appendChild(card);
    document.body.appendChild(d);

    // If frames come back on their own (a long GC pause, a slow level load),
    // take the overlay away rather than making the child reload for nothing.
    var t0 = Date.now();
    var watch = setInterval(function () {
      var alive = (Date.now() - lastFrame) < 1500 &&
                  (!innerWin || (Date.now() - lastInnerFrame) < 1500);
      if (alive) { clearInterval(watch); d.remove(); recovering = false; }
      else if (Date.now() - t0 > 60000) { clearInterval(watch); }
    }, 700);
  }

  setInterval(function () {
    if (document.visibilityState !== 'visible' || hiddenSince || !settled) { strikes = 0; return; }
    // A page that has not finished loading is not frozen, it is loading.
    if (document.readyState !== 'complete') { strikes = 0; return; }
    var outerGap = Date.now() - lastFrame;
    var innerGap = innerWin ? (Date.now() - lastInnerFrame) : 0;
    // Always try to restart a quiet heartbeat before judging it: if the page
    // has genuinely recovered, the next beat lands within a frame and the
    // recovery card takes itself away.
    if (outerGap > 2000) rearm();
    if (innerWin && innerGap > 2000) rearmInner();
    var stalledOuter = outerGap > RENDER_STALL;
    var stalledInner = innerWin && innerGap > RENDER_STALL;
    if (!stalledOuter && !stalledInner) { strikes = 0; return; }
    if (++strikes < STALL_STRIKES) return;
    if (stalledOuter) showRecovery('render-stall', outerGap);
    else showRecovery('render-stall-frame', innerGap);
  }, 1000);

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
