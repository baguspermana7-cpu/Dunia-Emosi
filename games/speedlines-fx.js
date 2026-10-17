/* games/speedlines-fx.js — shared turbo speed-line burst (2026-10-17)
 *
 * Owner: "yang balapan saat dapat turbo atau yang membuat dia tambah kencang, termasuk kereta dll. Di semua game ada
 * effect speedline keluar." One overlay for every racing game: manga-style radial lines rush out from the focus
 * point toward the screen edge while a turbo / boost is on, flicker a little (re-dealt every few frames) and fade.
 *
 * API (window.SpeedLines):
 *   burst({ dur=900, power=1, x, y, color })   one turbo kick; x/y = focus in CSS px (default: centre, a bit high)
 *   hold(key, power, { x, y, color })          sustained boost: call every frame while boosting; hold(key, 0) releases,
 *                                              and a hold not renewed for 250 ms lapses (a paused/quit game never leaves lines)
 *   level()                                    current strength 0..1 (tests)
 * A fixed, pointer-events:none canvas above the game; the rAF loop runs ONLY while something is showing, so an idle
 * game pays nothing. DPR is capped at 1.5 and the line count at 40 for throttled tablets. Reduced motion: no burst.
 */
;(function (W) {
  'use strict'
  if (W.SpeedLines) return
  var D = W.document
  var cv = null, cx = null, raf = 0, bursts = [], holds = {}, frame = 0, deal = null, lastW = 0, lastH = 0, shown = 0
  var REDUCED = false
  try { REDUCED = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (_) {}
  var N = 40

  function ensure () {
    if (cv) return true
    if (!D || !D.body) return false
    cv = D.createElement('canvas')
    cv.setAttribute('aria-hidden', 'true')
    cv.className = 'speedlines-fx'
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:9000'
    D.body.appendChild(cv)
    cx = cv.getContext('2d')
    return true
  }
  function size () {
    var w = W.innerWidth, h = W.innerHeight, dpr = Math.min(1.5, W.devicePixelRatio || 1)
    if (w !== lastW || h !== lastH) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); lastW = w; lastH = h; cx.setTransform(dpr, 0, 0, dpr, 0, 0) }
  }
  function redeal () {
    deal = []
    for (var i = 0; i < N; i++) deal.push({ a: (i + Math.random() * 0.8) / N * Math.PI * 2, r: 0.25 + Math.random() * 0.2, w: 0.5 + Math.random(), l: 0.55 + Math.random() * 0.45 })
  }
  function strength (now) {
    var p = 0, fx = null
    bursts = bursts.filter(function (b) { return now - b.t0 < b.dur })
    bursts.forEach(function (b) {
      var k = (now - b.t0) / b.dur, v = b.power * (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88)
      if (v > p) { p = v; fx = b }
    })
    for (var key in holds) {
      if (now - holds[key].t > 250) { delete holds[key]; continue }   // a game that stopped calling hold() (paused, quit) lets go
      if (holds[key].power > p) { p = holds[key].power; fx = holds[key] }
    }
    return { p: Math.max(0, Math.min(1, p)), fx: fx }
  }
  function loop (now) {
    raf = 0
    var s = strength(now)
    shown = s.p
    size()
    cx.clearRect(0, 0, lastW, lastH)
    if (s.p <= 0.01) { return }
    if (!deal || frame++ % 3 === 0) redeal()
    var w = lastW, h = lastH, fx = s.fx || {}
    var X = fx.x != null ? fx.x : w / 2, Y = fx.y != null ? fx.y : h * 0.42
    var R = Math.hypot(Math.max(X, w - X), Math.max(Y, h - Y)) * 1.05, m = Math.min(w, h)
    cx.fillStyle = fx.color || 'rgba(255,255,255,1)'
    cx.globalAlpha = 0.55 * s.p
    cx.beginPath()
    for (var i = 0; i < deal.length; i++) {
      var d = deal[i], r0 = m * (d.r + 0.18 * (1 - s.p)), r1 = r0 + (R - r0) * d.l, half = d.w * 0.011 * (0.6 + s.p)
      var a0 = d.a - half, a1 = d.a + half
      cx.moveTo(X + Math.cos(d.a) * r0, Y + Math.sin(d.a) * r0)          // a thin wedge: sharp at the inner end
      cx.lineTo(X + Math.cos(a0) * r1, Y + Math.sin(a0) * r1)
      cx.lineTo(X + Math.cos(a1) * r1, Y + Math.sin(a1) * r1)
      cx.closePath()
    }
    cx.fill()
    cx.globalAlpha = 1
    raf = W.requestAnimationFrame(loop)
  }
  function kick () { if (!raf && ensure()) raf = W.requestAnimationFrame(loop) }

  W.SpeedLines = {
    burst: function (o) {
      if (REDUCED) return
      o = o || {}
      bursts.push({ t0: W.performance.now(), dur: o.dur || 900, power: o.power == null ? 1 : o.power, x: o.x, y: o.y, color: o.color })
      kick()
    },
    hold: function (key, power, o) {
      if (REDUCED) return
      o = o || {}
      if (!power || power <= 0) delete holds[key]
      else holds[key] = { power: Math.min(1, power), x: o.x, y: o.y, color: o.color, t: W.performance.now() }
      kick()
    },
    level: function () { return shown }
  }
})(window)
