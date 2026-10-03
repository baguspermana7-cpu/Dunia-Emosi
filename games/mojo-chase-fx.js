/* =============================================================================
 * mojo-chase-fx.js — window.MojoChaseFX: pooled particles + pre-rendered light/VFX textures for the G31 chase.
 *
 * Everything is POOLED and CAPPED: one fixed array of particle records is allocated at start and recycled;
 * emitters never allocate. Textures (glows, god-ray fan, vignette, BROK burst, safety net, police bar, rain
 * streak, snowflake, leaf, sparkle) are drawn ONCE into offscreen canvases. Additive light uses
 * globalCompositeOperation 'lighter'. Quality tiers scale the particle cap (high 1, medium .6, low .35) and
 * prefers-reduced-motion gets the calm version (cap .3, no shake/flash handled by the game).
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var TAU = Math.PI * 2
  function cv (w, h) { var c = D.createElement('canvas'); c.width = w; c.height = h; return c }

  /* ── textures ─────────────────────────────────────────────────────────────────────────────────── */
  var TEX = {}
  function glow (name, rgb, size, hard) {
    var c = cv(size, size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(hard ? 0.25 : 0.12, 'rgba(' + rgb + ',.75)'); g.addColorStop(0.45, 'rgba(' + rgb + ',.22)'); g.addColorStop(1, 'rgba(' + rgb + ',0)')
    x.fillStyle = g; x.fillRect(0, 0, size, size); TEX[name] = c
  }
  function sparkle () {
    var s = 96, c = cv(s, s), x = c.getContext('2d'), h = s / 2
    var g = x.createRadialGradient(h, h, 0, h, h, h); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,240,170,.8)'); g.addColorStop(1, 'rgba(255,220,90,0)')
    x.fillStyle = g; x.beginPath()
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, r = i % 2 ? h * 0.22 : h; x.lineTo(h + Math.cos(a) * r, h + Math.sin(a) * r) }
    x.closePath(); x.fill(); TEX.sparkle = c
  }
  function rays () {
    var s = 512, c = cv(s, s), x = c.getContext('2d'), h = s / 2
    x.translate(h, h)
    for (var i = 0; i < 14; i++) {
      x.rotate(TAU / 14)
      var g = x.createLinearGradient(0, 0, h, 0); g.addColorStop(0, 'rgba(255,248,220,.55)'); g.addColorStop(1, 'rgba(255,248,220,0)')
      x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(h, -h * (0.05 + (i % 3) * 0.03)); x.lineTo(h, h * (0.05 + (i % 2) * 0.04)); x.closePath(); x.fill()
    }
    TEX.rays = c
  }
  function brok () {
    var s = 512, c = cv(s, s), x = c.getContext('2d'), h = s / 2
    function burst (rOut, rIn, n, fill, stroke) {
      x.beginPath()
      for (var i = 0; i < n * 2; i++) { var a = i * Math.PI / n + 0.2, r = (i % 2 ? rIn : rOut) * (0.9 + ((i * 37) % 10) / 50); x.lineTo(h + Math.cos(a) * r, h + Math.sin(a) * r) }
      x.closePath(); x.fillStyle = fill; x.fill(); if (stroke) { x.lineWidth = 10; x.strokeStyle = stroke; x.lineJoin = 'round'; x.stroke() }
    }
    burst(h * 0.98, h * 0.62, 13, '#ff7a1a', '#7a2a00'); burst(h * 0.8, h * 0.5, 13, '#ffd21f'); burst(h * 0.5, h * 0.32, 11, '#fff6c9')
    x.save(); x.translate(h, h); x.rotate(-0.16)
    x.font = '900 ' + Math.round(s * 0.2) + 'px "Baloo 2","Fredoka",system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'
    x.lineWidth = s * 0.05; x.strokeStyle = '#4a1600'; x.lineJoin = 'round'; x.strokeText('BROK!', 0, 0)
    var g = x.createLinearGradient(0, -s * 0.1, 0, s * 0.1); g.addColorStop(0, '#fff27a'); g.addColorStop(1, '#ff9d00')
    x.fillStyle = g; x.fillText('BROK!', 0, 0); x.restore()
    TEX.brok = c
  }
  function net () {
    var s = 512, c = cv(s, s), x = c.getContext('2d'), h = s / 2
    x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 7; x.lineCap = 'round'
    for (var i = 0; i < 16; i++) { var a = i * TAU / 16; x.beginPath(); x.moveTo(h, h); x.lineTo(h + Math.cos(a) * h * 0.95, h + Math.sin(a) * h * 0.95); x.stroke() }
    for (var r = 1; r <= 5; r++) { x.beginPath(); for (var k = 0; k <= 16; k++) { var b = k * TAU / 16, rr = h * 0.19 * r * (1 + ((k % 2) ? 0.04 : 0)); x.lineTo(h + Math.cos(b) * rr, h + Math.sin(b) * rr) } x.stroke() }
    x.strokeStyle = 'rgba(80,190,255,.9)'; x.lineWidth = 3; x.stroke()
    for (var q = 0; q < 16; q++) { var d = q * TAU / 16; x.fillStyle = q % 2 ? '#ff5252' : '#ffd54f'; x.beginPath(); x.arc(h + Math.cos(d) * h * 0.95, h + Math.sin(d) * h * 0.95, 12, 0, TAU); x.fill() }
    TEX.net = c
  }
  function streak (name, w, h, rgb) {
    var c = cv(w, h), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, 'rgba(' + rgb + ',0)'); g.addColorStop(0.7, 'rgba(' + rgb + ',.9)'); g.addColorStop(1, 'rgba(' + rgb + ',1)')
    x.fillStyle = g; x.fillRect(0, 0, w, h); TEX[name] = c
  }
  function flake () {
    var s = 32, c = cv(s, s), x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g; x.fillRect(0, 0, s, s); TEX.flake = c
  }
  function leaf () {
    var s = 40, c = cv(s, s), x = c.getContext('2d')
    x.translate(20, 20); x.rotate(0.6); x.fillStyle = '#e8902a'; x.beginPath(); x.ellipse(0, 0, 16, 8, 0, 0, TAU); x.fill()
    x.strokeStyle = '#9a4f10'; x.lineWidth = 2; x.beginPath(); x.moveTo(-15, 0); x.lineTo(15, 0); x.stroke(); TEX.leaf = c
  }
  function puff () {
    var s = 96, c = cv(s, s), x = c.getContext('2d')
    for (var i = 0; i < 6; i++) {
      var px = 48 + Math.cos(i) * 18, py = 52 + Math.sin(i * 1.7) * 12, r = 22 + (i % 3) * 6
      var g = x.createRadialGradient(px, py - 6, 2, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(225,225,232,0)')
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill()
    }
    TEX.puff = c
  }
  function chunk () {
    var s = 48, c = cv(s, s), x = c.getContext('2d')
    x.fillStyle = '#b5652b'; x.beginPath(); x.moveTo(6, 14); x.lineTo(40, 6); x.lineTo(44, 34); x.lineTo(12, 42); x.closePath(); x.fill()
    x.strokeStyle = '#6b3410'; x.lineWidth = 4; x.stroke(); x.strokeStyle = '#e08a4a'; x.lineWidth = 3; x.beginPath(); x.moveTo(12, 16); x.lineTo(36, 11); x.stroke()
    TEX.chunk = c
  }
  function lightbar () {
    var c = cv(256, 64), x = c.getContext('2d')
    x.fillStyle = '#263238'; x.fillRect(8, 30, 240, 18)
    x.fillStyle = '#e53935'; x.fillRect(14, 12, 100, 24); x.fillStyle = '#1e88e5'; x.fillRect(142, 12, 100, 24)
    x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(18, 14, 92, 6); x.fillRect(146, 14, 92, 6); TEX.lightbar = c
  }
  function build () {
    if (TEX.ready) return TEX
    glow('glowW', '255,255,255', 128); glow('glowY', '255,214,90', 128); glow('glowR', '255,40,30', 128, true); glow('glowB', '40,120,255', 128, true)
    glow('glowO', '255,140,40', 128); glow('glowC', '90,220,255', 128); glow('glowP', '200,120,255', 128)
    sparkle(); rays(); brok(); net(); streak('rain', 4, 64, '200,220,255'); streak('speed', 6, 128, '255,255,255'); flake(); leaf(); puff(); chunk(); lightbar()
    TEX.ready = true
    return TEX
  }

  /* ── particle pool ────────────────────────────────────────────────────────────────────────────── */
  var MAX = 900, P = [], cap = MAX, live = 0
  for (var i = 0; i < MAX; i++) P.push({ on: false, tex: null, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, life: 0, max: 1, size: 1, grow: 0, rot: 0, vr: 0, a: 1, add: false, fade: 1, stretch: 0, flow: 0 })
  var cursor = 0
  function alloc () {
    if (live >= cap) return null
    for (var n = 0; n < MAX; n++) { var p = P[cursor]; cursor = (cursor + 1) % MAX; if (!p.on) { p.on = true; live++; return p } }
    return null
  }
  /** spawn one particle; returns the record (or null when the cap is reached) */
  function spawn (tex, x, y, vx, vy, life, size, add) {
    var p = alloc(); if (!p) return null
    p.tex = tex; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.ax = 0; p.ay = 0; p.drag = 0; p.life = life; p.max = life; p.size = size; p.grow = 0
    p.rot = 0; p.vr = 0; p.a = 1; p.add = !!add; p.fade = 1; p.stretch = 0; p.flow = 0
    return p
  }
  function update (dt, flow) {
    for (var i = 0; i < MAX; i++) {
      var p = P[i]; if (!p.on) continue
      p.life -= dt
      if (p.life <= 0) { p.on = false; live--; continue }
      p.vx += p.ax * dt; p.vy += p.ay * dt
      if (p.drag) { var k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k }
      p.x += p.vx * dt; p.y += (p.vy + p.flow * flow) * dt
      p.size += p.grow * dt; p.rot += p.vr * dt
    }
  }
  function draw (c, additive) {
    c.globalCompositeOperation = additive ? 'lighter' : 'source-over'
    for (var i = 0; i < MAX; i++) {
      var p = P[i]; if (!p.on || p.add !== additive || !p.tex) continue
      var t = p.life / p.max, al = p.a * (p.fade ? Math.min(1, t * 2.2) : 1)
      if (al <= 0.01) continue
      c.globalAlpha = al
      var tw = p.tex.width, th = p.tex.height, s = p.size / Math.max(tw, th)
      if (p.stretch) {
        c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(p.vy + p.flow, p.vx) - Math.PI / 2)
        c.drawImage(p.tex, -tw * s / 2, -th * s * p.stretch, tw * s, th * s * p.stretch); c.restore()
      } else if (p.rot) {
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.drawImage(p.tex, -tw * s / 2, -th * s / 2, tw * s, th * s); c.restore()
      } else c.drawImage(p.tex, p.x - tw * s / 2, p.y - th * s / 2, tw * s, th * s)
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
  }
  function clear () { for (var i = 0; i < MAX; i++) P[i].on = false; live = 0 }

  W.MojoChaseFX = { build: build, TEX: TEX, spawn: spawn, update: update, draw: draw, clear: clear,
    setCap: function (k) { cap = Math.max(40, Math.floor(MAX * k)) }, live: function () { return live }, cap: function () { return cap }, MAX: MAX }
})(window, document)
