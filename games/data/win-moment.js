/* =============================================================================
 * win-moment.js — window.DuniaWin. PRD-58 B4: a finished level on an arcade page gets the same win moment as the
 * hub (VFX.Moment.celebrate: three staggered gold bursts). The page already has vfx-engine.js; vfx-moments.js
 * loads only on the first win (no request before). Reduced motion: VFX.Moment draws a fade in place only.
 *   DuniaWin.celebrate()  -> true when the moment was started (or queued until the effect sheets load)
 *   DuniaWin.calls        -> how many times a page asked for it (gates read this)
 * ES5, no emoji, guarded: a page without VFX keeps its own effect and nothing throws.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  if (W.DuniaWin) return
  var me = D.currentScript, src = (me && me.src) || ''
  var base = src.replace(/data\/win-moment\.js.*$/, ''), q = src.split('?')[1]
  var last = 0

  function load (cb) {
    if (W.VFX && W.VFX.Moment) return cb()
    var s = D.createElement('script')
    s.src = base + 'vfx-moments.js' + (q ? '?' + q : '')
    s.onload = cb
    D.head.appendChild(s)
  }
  function celebrate () {
    W.DuniaWin.calls++
    if (!W.VFX || Date.now() - last < 2500) return false
    last = Date.now()
    load(function () {
      var M = W.VFX && W.VFX.Moment, n = 0
      if (!M) return
      // the effect database loads on the first preload (these pages do not ship vfx-db.js)
      try { if (!M.ready() && W.VFX.preload) W.VFX.preload(['px-magicspell', 'px-bubbles']) } catch (e) {}
      ;(function go () {
        try {
          if (M.ready()) { try { if (M.prime) M.prime() } catch (e) {} M.celebrate({ x: W.innerWidth / 2, y: W.innerHeight * 0.38 }, { size: Math.min(W.innerWidth, W.innerHeight) * 0.32 }) }
          else if (n++ < 50) setTimeout(go, 100)
        } catch (e) {}
      })()
    })
    return true
  }
  W.DuniaWin = { celebrate: celebrate, calls: 0 }
})(window, document)
