/* CekSea — PRD-54 M (A1): the living sea behind the Cek Kemampuan page. A canvas2D scene (sky, sun glow, swaying light
 * shafts, three parallax wave bands, twinkling glints, two drifting clouds, a rising "tide" for progress) drawn at a
 * reduced resolution, then DuniaGLFX (games/dunia-glfx.js) adds bloom on the glints, a warm grade and a soft haze on the
 * water. The DOM islands and buttons stay on top, untouched, so every gate still finds them.
 *   CekSea.mount()        once; adds <canvas class="cek-sea"> (+ the GL copy) behind .panel
 *   CekSea.tide(f)        0..1, eases the bright tide band up (items done in an island)
 *   CekSea.flash()        a bloom spike that decays in ~0.9 s (island end, IQ reveal)
 *   CekSea.state()        { frames, gl, still, bloom } for tools/qa-prd53-cek.mjs (law M1/M3)
 * Still (one frame, no loop): prefers-reduced-motion / du-reduced-motion=1, ?nocine=1, or DuniaCinema quality 0.
 * The loop runs at <= 30 fps and stops while the tab is hidden. No WebGL, or a device too slow for it in the first
 * ~1.5 s (budget()), -> the 2D canvas alone shows. ?nosea=1 / ?nogl=1 switch the layers off for measuring.
 */
;(function (W, D) {
  'use strict'
  var cv, g, fx = null, glSlow = false, gaps = [], prev = 0, raf = 0, last = 0, t0 = 0, frames = 0, still = false, tideNow = 0, tideTo = 0, spike = 0, SCALE = 0.6
  var clouds = [{ x: 0.15, y: 0.1, s: 1, v: 0.006 }, { x: 0.7, y: 0.17, s: 0.75, v: 0.004 }]
  var glints = []; for (var i = 0; i < 26; i++) glints.push({ x: Math.random(), y: 0.42 + Math.random() * 0.56, p: Math.random() * 6.28, r: 0.6 + Math.random() * 1.4 })
  function reduced () {
    try { if (W.localStorage && W.localStorage.getItem('du-reduced-motion') === '1') return true } catch (_) {}
    return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }
  function size () {
    var w = Math.max(1, Math.round(W.innerWidth * SCALE)), h = Math.max(1, Math.round(W.innerHeight * SCALE))
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; if (still) draw(t0) }
  }
  function wave (w, h, y0, amp, len, ph, col) {
    g.beginPath(); g.moveTo(0, h)
    for (var x = 0; x <= w + 8; x += 8) g.lineTo(x, y0 + Math.sin(x / len + ph) * amp + Math.sin(x / (len * 0.43) - ph * 1.3) * amp * 0.35)
    g.lineTo(w, h); g.closePath(); g.fillStyle = col; g.fill()
  }
  function cloud (x, y, s) {
    g.fillStyle = 'rgba(255,255,255,.92)'
    ;[[0, 0, 26], [24, -10, 22], [46, 2, 24], [20, 8, 22]].forEach(function (c) { g.beginPath(); g.arc(x + c[0] * s, y + c[1] * s, c[2] * s, 0, 6.283); g.fill() })
  }
  function draw (t) {
    var w = cv.width, h = cv.height, hz = h * 0.34, s = t / 1000
    var sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(1, '#e0f7ff')
    g.fillStyle = sky; g.fillRect(0, 0, w, hz + 2)
    var sea = g.createLinearGradient(0, hz, 0, h); sea.addColorStop(0, '#38bdf8'); sea.addColorStop(0.55, '#0ea5e9'); sea.addColorStop(1, '#0369a1')
    g.fillStyle = sea; g.fillRect(0, hz, w, h - hz)
    // sun glow, top right; its light falls on the water as a bright path
    var sx = w * 0.82, sy = h * 0.09, sun = g.createRadialGradient(sx, sy, 0, sx, sy, h * 0.34)
    sun.addColorStop(0, 'rgba(255,251,214,1)'); sun.addColorStop(0.18, 'rgba(255,236,160,.85)'); sun.addColorStop(1, 'rgba(255,236,160,0)')
    g.fillStyle = sun; g.fillRect(0, 0, w, h)
    // light shafts under the water, swaying slowly
    g.save(); g.globalCompositeOperation = 'lighter'
    for (var k = 0; k < 5; k++) {
      var bx = w * (0.1 + k * 0.2) + Math.sin(s * 0.35 + k * 1.7) * w * 0.04, a = 0.05 + 0.03 * Math.sin(s * 0.8 + k)
      g.fillStyle = 'rgba(224,247,255,' + a.toFixed(3) + ')'
      g.beginPath(); g.moveTo(bx - w * 0.02, hz); g.lineTo(bx + w * 0.02, hz); g.lineTo(bx + w * 0.09, h); g.lineTo(bx - w * 0.05, h); g.closePath(); g.fill()
    }
    g.restore()
    clouds.forEach(function (c) { var x = ((c.x + s * c.v) % 1.3) - 0.15; cloud(x * w, c.y * h, c.s * h / 420) })
    // three wave bands, far to near (parallax: the near one moves fastest)
    wave(w, h, hz + h * 0.04, h * 0.008, w * 0.05, s * 0.6, 'rgba(186,230,253,.55)')
    wave(w, h, hz + h * 0.16, h * 0.012, w * 0.08, s * 0.9 + 1, 'rgba(56,189,248,.45)')
    wave(w, h, hz + h * 0.36, h * 0.018, w * 0.11, s * 1.3 + 2, 'rgba(2,132,199,.42)')
    // the tide: a bright band that rises with the items done
    if (tideNow > 0.01) wave(w, h, h - (h - hz) * 0.5 * tideNow, h * 0.012, w * 0.07, s * 1.6, 'rgba(125,211,252,.35)')
    // glints twinkle; GL bloom turns them into soft sparkles
    g.fillStyle = '#ffffff'
    glints.forEach(function (p) { var a = Math.max(0, Math.sin(s * 2.2 + p.p)); if (a < 0.35) return; g.globalAlpha = a; g.beginPath(); g.ellipse(p.x * w, p.y * h, p.r * 2.2 * a, p.r * 0.7, 0, 0, 6.283); g.fill() })
    g.globalAlpha = 1
    if (fx) fx.frame({ t: s, warm: 0.25, haze: 0.35, bloom: 0.55 + spike * 1.4, grain: 0.012 })
    frames++
  }
  // the GL layer is the costly part (measured PRD-54 M4: 2D sea alone p95 16.7 ms, with software GL p95 33-50 ms):
  // after ~90 frames, a device that cannot keep up (median gap > 22 ms or 4+ gaps > 50 ms) drops GL and keeps the 2D sea
  function budget (now) {
    if (!fx || glSlow || gaps.length >= 90) return
    if (prev) gaps.push(now - prev); prev = now
    if (gaps.length < 90) return
    var g2 = gaps.slice().sort(function (a, b) { return a - b }), long = gaps.filter(function (x) { return x > 50 }).length
    if (g2[45] > 22 || long >= 4) { glSlow = true; fx.enable(false) }
  }
  function loop (now) {
    raf = 0
    if (D.hidden || still) return
    budget(now)
    if (now - last >= 33) {
      last = now
      tideNow += (tideTo - tideNow) * 0.06; spike = Math.max(0, spike - 0.04)
      draw(now)
    }
    raf = W.requestAnimationFrame(loop)
  }
  function start () { if (!raf && !still && !D.hidden) raf = W.requestAnimationFrame(loop) }
  function mount () {
    if (cv || /[?&]nosea=1/.test(W.location.search)) return   // ?nosea=1 / ?nogl=1: switches for measuring (PRD-54 M4)
    cv = D.createElement('canvas'); cv.className = 'cek-sea'; cv.setAttribute('aria-hidden', 'true')
    D.body.insertBefore(cv, D.body.firstChild)
    g = cv.getContext('2d')
    var cine = W.DuniaCinema && W.DuniaCinema.state ? W.DuniaCinema.state() : null
    still = reduced() || /[?&]nocine=1/.test(W.location.search) || !!(cine && cine.on && cine.quality === 0)
    size()
    if (!still && W.DuniaGLFX && !/[?&]nogl=1/.test(W.location.search)) fx = W.DuniaGLFX.attach(cv, { cls: 'cek-sea cek-sea-gl' })
    t0 = W.performance ? W.performance.now() : 0
    draw(t0)
    W.addEventListener('resize', size)
    D.addEventListener('visibilitychange', start)
    start()
  }
  W.CekSea = {
    mount: mount,
    tide: function (f) { tideTo = Math.max(0, Math.min(1, +f || 0)); if (still && cv) { tideNow = tideTo; draw(t0) } },
    flash: function () { spike = 1 },
    state: function () { return { frames: frames, gl: !!(fx && fx.active()), glSlow: glSlow, still: still, bloom: 0.55 + spike * 1.4 } }
  }
})(window, document)
