/* =============================================================================
 * kereta-fx.js — window.KeretaFX: the cheap, immersive layer of "Kereta Pemberani: Petualangan Rel".
 *   KeretaFX.sound.chuff() / whistle() / clack() / ding() / clunk() / lever() / splash() / fanfare() / boop() / setMute(b)
 *        pure WebAudio synthesis (no files); nothing sounds before the first user gesture; mute persists.
 *   KeretaFX.particles(canvas) -> {emit(kind, x, y, o), burst(kind, x, y, n, o), resize(w, h), clear(), alive()}
 *        kinds: steam | spark | dust | ripple | ring | confetti | star | leaf        (2D canvas, a few dozen live at most)
 *   KeretaFX.reduced()   true when the OS asks for reduced motion or the child switched "efek ringan" on
 * One requestAnimationFrame loop per particle system, and it stops when nothing is alive (an idle board costs nothing).
 * ==========================================================================*/
(function (W) {
  'use strict'
  var LS = 'kereta-fx'
  var cfg = { mute: false, lite: false }
  try { var s = JSON.parse(localStorage.getItem(LS) || '{}'); cfg.mute = !!s.mute; cfg.lite = !!s.lite } catch (e) {}
  function save () { try { localStorage.setItem(LS, JSON.stringify(cfg)) } catch (e) {} }
  function osReduced () { try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) { return false } }
  function reduced () { return osReduced() || cfg.lite }

  /* ── sound ─────────────────────────────────────────────────────────────────────────────────────────── */
  var ctx = null, master = null, noiseBuf = null
  function ac () {
    if (ctx) return ctx
    try {
      var C = W.AudioContext || W.webkitAudioContext
      if (!C) return null
      ctx = new C(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination)
      var n = ctx.sampleRate * 0.6, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0)
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
      noiseBuf = b
    } catch (e) { ctx = null }
    return ctx
  }
  function ready () { var c = ac(); if (!c || cfg.mute) return null; if (c.state === 'suspended') { try { c.resume() } catch (e) {} } return c }
  function env (g, t, a, peak, d) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d) }
  function osc (type, f0, f1, t, dur, peak, dest) {
    var c = ctx, o = c.createOscillator(), g = c.createGain()
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    env(g, t, 0.01, peak, dur); o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.05)
    return o
  }
  function noise (t, dur, peak, freq, q, dest) {
    var c = ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1
    env(g, t, 0.008, peak, dur); s.connect(f); f.connect(g); g.connect(dest || master); s.start(t); s.stop(t + dur + 0.05)
  }
  var sound = {
    chuff: function () { var c = ready(); if (!c) return; var t = c.currentTime; noise(t, 0.09, 0.28, 900, 0.8); noise(t + 0.17, 0.08, 0.2, 1100, 0.8) },
    clack: function () { var c = ready(); if (!c) return; var t = c.currentTime; osc('square', 220, 90, t, 0.05, 0.12); noise(t, 0.04, 0.12, 2400, 2) },
    whistle: function () {
      var c = ready(); if (!c) return; var t = c.currentTime
      var o = osc('triangle', 640, 0, t, 0.75, 0.3), o2 = osc('sine', 960, 0, t, 0.75, 0.16)
      ;[o, o2].forEach(function (x, i) { x.frequency.setValueAtTime(i ? 960 : 640, t); x.frequency.linearRampToValueAtTime(i ? 1180 : 790, t + 0.12); x.frequency.setValueAtTime(i ? 1180 : 790, t + 0.5); x.frequency.linearRampToValueAtTime(i ? 1100 : 740, t + 0.74) })
      var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 22; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t + 0.1); lfo.stop(t + 0.8)
    },
    ding: function () { var c = ready(); if (!c) return; var t = c.currentTime; osc('sine', 880, 0, t, 0.35, 0.22); osc('sine', 1320, 0, t + 0.02, 0.3, 0.1) },
    clunk: function () { var c = ready(); if (!c) return; var t = c.currentTime; osc('sine', 120, 55, t, 0.16, 0.34); noise(t, 0.05, 0.2, 500, 1) },
    lever: function () { var c = ready(); if (!c) return; var t = c.currentTime; osc('square', 300, 140, t, 0.06, 0.14); osc('square', 180, 110, t + 0.09, 0.07, 0.12) },
    splash: function () { var c = ready(); if (!c) return; var t = c.currentTime; noise(t, 0.28, 0.22, 1800, 0.6); noise(t + 0.05, 0.2, 0.12, 900, 0.5) },
    boop: function () { var c = ready(); if (!c) return; var t = c.currentTime; osc('sine', 330, 250, t, 0.2, 0.18) },
    ok: function () { var c = ready(); if (!c) return; var t = c.currentTime; osc('sine', 660, 0, t, 0.14, 0.2); osc('sine', 990, 0, t + 0.1, 0.22, 0.2) },
    fanfare: function () {
      var c = ready(); if (!c) return; var t = c.currentTime
      ;[523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { osc('triangle', f, 0, t + i * 0.13, i > 4 ? 0.5 : 0.2, 0.2); osc('sine', f * 2, 0, t + i * 0.13, 0.15, 0.06) })
    },
    setMute: function (b) { cfg.mute = !!b; save() },
    muted: function () { return cfg.mute },
    unlock: function () { ready() }
  }

  /* ── particles ─────────────────────────────────────────────────────────────────────────────────────── */
  var COLORS = ['#e8c46a', '#2ea39b', '#e5483b', '#4a7bd0', '#8cc86a', '#f2ede0']
  function particles (canvas) {
    var g = canvas.getContext('2d'), list = [], pool = [], raf = 0, last = 0, W0 = 1, H0 = 1, dpr = 1
    function resize (w, h) { dpr = Math.min(2, W.devicePixelRatio || 1); W0 = w; H0 = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px' }
    function emit (kind, x, y, o) {
      o = o || {}
      if (reduced() && kind !== 'ring' && kind !== 'confetti') return
      if (list.length > 70) pool.push(list.shift())
      var p = pool.pop() || {}
      p.k = kind; p.x = x; p.y = y; p.t = 0; p.life = o.life || 1; p.vx = 0; p.vy = 0; p.r = o.r || 6; p.rot = 0; p.vr = 0; p.c = o.c || '#fff'; p.a = 1
      if (kind === 'steam') { p.vx = (o.dx || 0) * 14 + (Math.random() - 0.5) * 16; p.vy = -34 - Math.random() * 18; p.life = 0.9 + Math.random() * 0.5; p.r = (o.r || 6) * (0.8 + Math.random() * 0.5) }
      else if (kind === 'dust') { p.vx = (Math.random() - 0.5) * 40; p.vy = -10 - Math.random() * 14; p.life = 0.5; p.c = '#d6bf94'; p.r = 4 }
      else if (kind === 'spark') { var a = Math.random() * 6.283, s = 50 + Math.random() * 70; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - 20; p.life = 0.45; p.c = Math.random() < 0.5 ? '#ffd45a' : '#ff9a3c'; p.r = 2.2 }
      else if (kind === 'ripple') { p.life = 0.8; p.c = '#d8f0ff'; p.r = 3 }
      else if (kind === 'ring') { p.life = 0.7; p.c = o.c || '#fff3c4'; p.r = 6 }
      else if (kind === 'confetti') { p.vx = (Math.random() - 0.5) * 150; p.vy = -60 - Math.random() * 130; p.life = 1.8 + Math.random() * 0.8; p.c = COLORS[(Math.random() * COLORS.length) | 0]; p.r = 4 + Math.random() * 3; p.vr = (Math.random() - 0.5) * 12 }
      else if (kind === 'star') { var b = Math.random() * 6.283; p.vx = Math.cos(b) * 60; p.vy = Math.sin(b) * 60; p.life = 0.7; p.c = '#ffe27a'; p.r = 5 }
      else if (kind === 'leaf') { p.vx = (Math.random() - 0.3) * 30; p.vy = 18 + Math.random() * 14; p.life = 3; p.c = '#d98a3a'; p.r = 3 }
      list.push(p)
      if (!raf) { last = 0; raf = W.requestAnimationFrame(tick) }
    }
    function burst (kind, x, y, n, o) { for (var i = 0; i < n; i++) emit(kind, x, y, o) }
    function tick (ts) {
      raf = 0
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W0, H0)
      for (var i = list.length - 1; i >= 0; i--) {
        var p = list[i]; p.t += dt
        var u = p.t / p.life
        if (u >= 1) { pool.push(p); list[i] = list[list.length - 1]; list.pop(); continue }
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt
        if (p.k === 'confetti') p.vy += 220 * dt
        if (p.k === 'spark') p.vy += 160 * dt
        g.globalAlpha = (1 - u) * (p.k === 'steam' ? 0.7 : 1)
        if (p.k === 'steam') { g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + u * 1.6), 0, 6.283); g.fill() }
        else if (p.k === 'ripple' || p.k === 'ring') { g.strokeStyle = p.c; g.lineWidth = 2.2; g.beginPath(); g.arc(p.x, p.y, p.r + u * (p.k === 'ring' ? 40 : 18), 0, 6.283); g.stroke() }
        else if (p.k === 'confetti') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c; g.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); g.restore() }
        else if (p.k === 'star') { g.fillStyle = p.c; g.save(); g.translate(p.x, p.y); g.rotate(p.rot + u * 3); g.fillRect(-p.r * 0.5, -p.r * 1.4, p.r, p.r * 2.8); g.fillRect(-p.r * 1.4, -p.r * 0.5, p.r * 2.8, p.r); g.restore() }
        else { g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * (p.k === 'dust' ? 1 + u : 1), 0, 6.283); g.fill() }
      }
      g.globalAlpha = 1
      if (list.length) raf = W.requestAnimationFrame(tick)
      else g.clearRect(0, 0, W0, H0)
    }
    return { emit: emit, burst: burst, resize: resize, clear: function () { list.length = 0 }, alive: function () { return list.length } }
  }
  W.KeretaFX = { sound: sound, particles: particles, reduced: reduced, cfg: cfg, setLite: function (b) { cfg.lite = !!b; save() }, lite: function () { return cfg.lite } }
})(typeof window !== 'undefined' ? window : globalThis)
