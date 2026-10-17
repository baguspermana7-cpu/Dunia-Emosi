/* games/weather-alive.js — window.WeatherAlive: weather that feels alive (2026-10-17)
 *
 * Owner (video "make weather feel alive"): angle the rain, splash it on the ground and ripple the puddles; a storm
 * flashes the whole sky and the thunder hits a beat later; hail bounces and clacks; snow drifts down and piles up;
 * fog rolls in soft layers; wind bends things and blows leaves; a heatwave shimmers the air under a strong sun;
 * after a shower, a rainbow. Kinds: clear, rain, storm, hail, snow, fog, wind, heat.
 *
 *   var wx = WeatherAlive.create({ kind: 'rain', view: 'top' | 'side', reduced, muted: () => bool, seed })
 *   wx.step(dt, view)   view = { w, h, dx, dy, ground }   dx/dy: how far the world moved on screen this step (px), so
 *                        ripples and puddles stay on the water/ground; ground = screen y of the ground line ('side')
 *   wx.draw(ctx, view)  paint on the game's own canvas, after the world, before the HUD (ctx in CSS px)
 *   wx.set(kind)        change weather (a shower that ends -> a rainbow for a few seconds)
 *   wx.wind()           -1..1 gust value, for games that bend sprites
 *   wx.state()          { kind, drops, ripples, flash, pile, rainbow } for tests
 *   wx.destroy()
 * The game owns the loop: no rAF here, so pausing the game pauses the weather. Pools are fixed typed arrays (no
 * per-frame allocation); fog / glare / flake sprites are baked once. Reduced motion: half the particles, no
 * lightning flash (thunder still rumbles), no shimmer. Sound is Web-Audio synthesis (no files) and follows muted().
 */
;(function (W) {
  'use strict'
  if (W.WeatherAlive) return
  var D = W.document, TAU = Math.PI * 2
  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function lcg (seed) { var s = (seed | 0) || 7; return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff } }

  // per kind: drops (max live), fall speed px/s (at h=800), slant, wind base, darkness
  var K = {
    clear: { n: 0 },
    rain:  { n: 160, v: 900, slant: 0.28, wind: 0.25, dark: 0.16, len: 34 },
    storm: { n: 230, v: 1250, slant: 0.42, wind: 0.55, dark: 0.34, len: 44, bolt: true },
    hail:  { n: 70, v: 700, slant: 0.12, wind: 0.1, dark: 0.12, hail: true },
    snow:  { n: 130, v: 70, slant: 0, wind: 0.2, dark: 0.04, snow: true },
    fog:   { n: 0, fog: true, dark: 0 },
    wind:  { n: 0, wind: 0.9, leaves: true, dark: 0 },
    heat:  { n: 0, heat: true, dark: 0 }
  }
  var KINDS = Object.keys(K)

  // baked sprites, once per page
  var SPR = null
  function bake () {
    if (SPR || !D) return SPR
    function cv (w, h) { var c = D.createElement('canvas'); c.width = w; c.height = h; return c }
    var fog = cv(256, 128), f = fog.getContext('2d'), g = f.createRadialGradient(128, 64, 4, 128, 64, 124)
    g.addColorStop(0, 'rgba(235,240,248,.85)'); g.addColorStop(0.5, 'rgba(225,232,242,.42)'); g.addColorStop(1, 'rgba(220,228,240,0)')
    f.setTransform(1, 0, 0, 0.5, 0, 32); f.fillStyle = g; f.fillRect(0, 0, 256, 256)
    var sun = cv(256, 256), s = sun.getContext('2d'), gs = s.createRadialGradient(128, 128, 0, 128, 128, 128)
    gs.addColorStop(0, 'rgba(255,255,235,1)'); gs.addColorStop(0.12, 'rgba(255,244,190,.95)'); gs.addColorStop(0.35, 'rgba(255,214,120,.35)'); gs.addColorStop(1, 'rgba(255,190,80,0)')
    s.fillStyle = gs; s.fillRect(0, 0, 256, 256)
    var flake = cv(16, 16), k = flake.getContext('2d'), gk = k.createRadialGradient(8, 8, 0, 8, 8, 8)
    gk.addColorStop(0, 'rgba(255,255,255,1)'); gk.addColorStop(0.5, 'rgba(255,255,255,.7)'); gk.addColorStop(1, 'rgba(255,255,255,0)')
    k.fillStyle = gk; k.fillRect(0, 0, 16, 16)
    var leaf = cv(20, 12), l = leaf.getContext('2d')
    l.fillStyle = '#7cb342'; l.beginPath(); l.ellipse(10, 6, 9, 4.5, 0, 0, TAU); l.fill(); l.strokeStyle = '#4e7d22'; l.lineWidth = 1; l.beginPath(); l.moveTo(2, 6); l.lineTo(18, 6); l.stroke()
    var leaf2 = cv(20, 12), l2 = leaf2.getContext('2d')
    l2.fillStyle = '#f0a030'; l2.beginPath(); l2.ellipse(10, 6, 9, 4.5, 0, 0, TAU); l2.fill()
    var strips = []
    for (var L = 0; L < 2; L++) {   // tileable fog strips: every blob is drawn again one strip-width to the left/right
      var st = cv(512, 128), sx = st.getContext('2d'), r = lcg(91 + L * 17)
      for (var bI = 0; bI < 7; bI++) {
        var bw2 = 160 + r() * 180, bh2 = bw2 * 0.45, bx = r() * 512, by = 128 - bh2 * (0.55 + r() * 0.35) - L * 10
        sx.globalAlpha = 0.5 + r() * 0.4
        for (var wrap = -1; wrap <= 1; wrap++) sx.drawImage(fog, bx - bw2 / 2 + wrap * 512, by, bw2, bh2)
      }
      strips.push(st)
    }
    SPR = { fog: fog, fogStrip: strips, sun: sun, flake: flake, leaf: [leaf, leaf2] }
    return SPR
  }

  // ── sound: rain hiss, thunder a beat after the flash, hail clacks ────────────────────────────────
  var AC = null, NOISE = null
  function ac () {
    try {
      if (!AC) { var C = W.AudioContext || W.webkitAudioContext; if (!C) return null; AC = new C() }
      if (AC.state === 'suspended') AC.resume()
      if (!NOISE) { var len = AC.sampleRate * 2, b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; NOISE = b }
      return AC
    } catch (e) { return null }
  }
  function thunder (power) {
    var a = ac(); if (!a) return
    var t = a.currentTime, src = a.createBufferSource(), lp = a.createBiquadFilter(), g = a.createGain()
    src.buffer = NOISE; lp.type = 'lowpass'; lp.frequency.setValueAtTime(420, t); lp.frequency.exponentialRampToValueAtTime(90, t + 2.2)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * power, t + 0.08); g.gain.exponentialRampToValueAtTime(0.18 * power, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4)
    src.connect(lp); lp.connect(g); g.connect(a.destination); src.start(t); src.stop(t + 2.5)
  }
  function clack () {
    var a = ac(); if (!a) return
    var t = a.currentTime, o = a.createOscillator(), g = a.createGain()
    o.type = 'square'; o.frequency.setValueAtTime(2400 + Math.random() * 1600, t)
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.05)
  }
  function hiss () {   // a looping filtered noise bed; returns { set(level), stop() }
    var a = ac(); if (!a) return null
    var src = a.createBufferSource(), hp = a.createBiquadFilter(), g = a.createGain()
    src.buffer = NOISE; src.loop = true; hp.type = 'bandpass'; hp.frequency.value = 2600; hp.Q.value = 0.5; g.gain.value = 0
    src.connect(hp); hp.connect(g); g.connect(a.destination); src.start()
    return { set: function (v) { try { g.gain.setTargetAtTime(v, a.currentTime, 0.4) } catch (e) {} }, stop: function () { try { g.gain.setTargetAtTime(0, a.currentTime, 0.2); src.stop(a.currentTime + 1) } catch (e) {} } }
  }

  function create (o) {
    o = o || {}
    var view = o.view === 'side' ? 'side' : 'top', reduced = !!o.reduced, rnd = lcg(o.seed || 7)
    var muted = typeof o.muted === 'function' ? o.muted : function () { return !!o.muted }
    var kind = K[o.kind] ? o.kind : 'clear', cfg = K[kind]
    var CAP = 240
    // drops / flakes / hail: x, y (screen), z (0 near .. 1 far, for size), vy, life
    var px = new Float32Array(CAP), py = new Float32Array(CAP), pz = new Float32Array(CAP), pv = new Float32Array(CAP), ph = new Float32Array(CAP), pb = new Uint8Array(CAP)
    var live = 0
    // ripples / splashes: x, y, age, kind (0 ring, 1 splash droplet)
    var RC = 160, rx = new Float32Array(RC), ry = new Float32Array(RC), ra = new Float32Array(RC), rvx = new Float32Array(RC), rvy = new Float32Array(RC), rk = new Uint8Array(RC), rlive = 0
    // leaves
    var LC = 18, lx = new Float32Array(LC), ly = new Float32Array(LC), lr = new Float32Array(LC), lv = new Float32Array(LC), lt = new Uint8Array(LC), ln = 0
    var t = 0, flash = 0, boltT = 3 + rnd() * 4, thunderAt = -1, thunderPow = 0, gust = 0, pile = 0, rainbow = 0, fogX = 0, mix = 0, prevKind = null
    var bed = null, W0 = 0, H0 = 0
    var lite = false   // set by a game that lowered its own render quality: half the particles, fog as a plain veil
    function amount () { return reduced || lite ? 0.5 : 1 }

    function spawn (w, h, fresh) {
      if (live >= CAP) return
      var i = live++, z = rnd()
      pz[i] = z
      px[i] = rnd() * (w + 200) - 100
      py[i] = view === 'top' && !cfg.snow ? rnd() * h - 40 : fresh ? rnd() * h : -20 - rnd() * 60   // top view: rain falls toward the camera, anywhere on screen
      if (cfg.snow) pv[i] = (40 + (1 - z) * 60) * h / 800
      else pv[i] = (cfg.v * (0.75 + (1 - z) * 0.5)) * h / 800
      ph[i] = rnd() * TAU; pb[i] = 0
      // where this drop lands: 'top' view = a random point on the water (its own life time); 'side' = the ground line
      if (view === 'top') ph[i] = cfg.hail ? 0.25 + rnd() * 0.3 : 0.12 + rnd() * 0.22   // time until it hits the water
    }
    function ring (x, y, k, vx, vy) {
      if (rlive >= RC) return
      var i = rlive++
      rx[i] = x; ry[i] = y; ra[i] = 0; rk[i] = k; rvx[i] = vx || 0; rvy[i] = vy || 0
    }
    function kill (i) { live--; px[i] = px[live]; py[i] = py[live]; pz[i] = pz[live]; pv[i] = pv[live]; ph[i] = ph[live]; pb[i] = pb[live] }

    function set (k) {
      if (!K[k] || k === kind) return
      prevKind = kind
      if ((kind === 'rain' || kind === 'storm') && (k === 'clear' || k === 'heat')) rainbow = 7   // after a shower: a rainbow
      kind = k; cfg = K[k]; mix = 0
      if (!cfg.snow) pile = Math.min(pile, 0.4)
    }

    function step (dt, v) {
      dt = clamp(dt, 0, 0.1); t += dt
      var w = v.w, h = v.h, dx = v.dx || 0, dy = v.dy || 0
      W0 = w; H0 = h
      mix = Math.min(1, mix + dt / 2.5)
      gust = (cfg.wind || 0) * (0.65 + 0.35 * Math.sin(t * 0.7) * Math.sin(t * 1.9 + 1))
      // particles
      var want = Math.round((cfg.n || 0) * amount() * mix)
      if (live === 0 && want > 0) for (var f = 0; f < want * 0.6; f++) spawn(w, h, true)
      var per = want * dt * (cfg.snow ? 0.5 : 3)
      while (live < want && per-- > 0) spawn(w, h, false)
      var slant = (cfg.slant || 0) + gust * 0.25
      for (var i = live - 1; i >= 0; i--) {
        var vy = pv[i]
        if (cfg.snow) { px[i] += (Math.sin(t * 1.3 + ph[i]) * 18 + gust * 60) * dt; py[i] += vy * dt }
        else if (cfg.hail && pb[i]) { px[i] += 30 * dt; py[i] += pv[i] * dt; pv[i] += 1400 * dt; if (py[i] > (v.ground || h)) { if (pb[i] < 2) { pb[i]++; pv[i] = -Math.abs(pv[i]) * 0.35; py[i] = (v.ground || h) } else { kill(i); continue } } }
        else { px[i] += vy * slant * dt; py[i] += vy * dt }
        px[i] += dx; py[i] += dy * (view === 'top' ? 0 : 1)
        var landed = false
        if (view === 'top') { if (!cfg.snow) { ph[i] -= dt; if (ph[i] <= 0) landed = true } else if (py[i] > h + 10) landed = true }
        else if (py[i] >= (v.ground != null ? v.ground : h) && !(cfg.hail && pb[i])) landed = true
        if (landed) {
          if (cfg.snow) { if (view === 'side') pile = Math.min(1, pile + 0.0009) ; else pile = Math.min(1, pile + 0.0005); kill(i); continue }
          if (cfg.hail) {
            if (view === 'side') { pb[i] = 1; pv[i] = -pv[i] * 0.4; py[i] = v.ground != null ? v.ground : h; if (rnd() < 0.08 && !muted()) clack(); continue }
            ring(px[i], py[i], 1, (rnd() - 0.5) * 80, -60 - rnd() * 60); if (rnd() < 0.05 && !muted()) clack(); kill(i); continue
          }
          // rain: a ripple on the water / puddle, and a splash of 2 droplets on the ground
          if (view === 'top' || rnd() < 0.4) ring(px[i], view === 'top' ? py[i] : (v.ground != null ? v.ground : h) + rnd() * 10, 0)
          if (view === 'side' || rnd() < 0.3) for (var s = 0; s < 2; s++) ring(px[i], view === 'side' ? (v.ground != null ? v.ground : h) : py[i], 1, (rnd() - 0.5) * 120, -80 - rnd() * 90)
          kill(i); continue
        }
        if (py[i] > h + 40 || px[i] < -140 || px[i] > w + 140) kill(i)
      }
      // ripples + splash droplets
      for (var r = rlive - 1; r >= 0; r--) {
        ra[r] += dt
        rx[r] += dx + rvx[r] * dt; ry[r] += dy + rvy[r] * dt
        if (rk[r] === 1) rvy[r] += 520 * dt
        if (ra[r] > (rk[r] === 0 ? 0.7 : 0.45)) { rlive--; rx[r] = rx[rlive]; ry[r] = ry[rlive]; ra[r] = ra[rlive]; rk[r] = rk[rlive]; rvx[r] = rvx[rlive]; rvy[r] = rvy[rlive] }
      }
      // storm: flash the whole sky, the thunder a beat later (closer bolt = shorter gap, louder)
      if (cfg.bolt) {
        boltT -= dt
        if (boltT <= 0) {
          var near = rnd()
          flash = reduced ? 0 : 1
          thunderAt = t + 0.35 + (1 - near) * 1.4; thunderPow = 0.45 + near * 0.55
          boltT = 4 + rnd() * 6
        }
      }
      if (thunderAt > 0 && t >= thunderAt) { thunderAt = -1; if (!muted()) thunder(thunderPow) }
      flash = Math.max(0, flash - dt * 3.2)
      // leaves on the wind
      if (cfg.leaves) {
        while (ln < (reduced ? 6 : LC)) { var j = ln++; lx[j] = -30 - rnd() * w; ly[j] = rnd() * h * 0.85; lr[j] = rnd() * TAU; lv[j] = 0.6 + rnd() * 0.8; lt[j] = rnd() < 0.5 ? 0 : 1 }
        for (var q = 0; q < ln; q++) {
          lx[q] += (220 + gust * 260) * lv[q] * dt + dx; ly[q] += (Math.sin(t * 2 + q) * 40 + 12) * dt + dy * (view === 'top' ? 1 : 0); lr[q] += dt * 4 * lv[q]
          if (lx[q] > w + 40) { lx[q] = -30 - rnd() * 80; ly[q] = rnd() * h * 0.85 }
        }
      } else ln = 0
      fogX += dt * 14
      if (!cfg.snow && pile > 0) pile = Math.max(0, pile - dt * 0.02)
      rainbow = Math.max(0, rainbow - dt)
      // rain bed
      var wantBed = (kind === 'rain' ? 0.05 : kind === 'storm' ? 0.09 : kind === 'hail' ? 0.035 : 0) * mix
      if (wantBed > 0 && !muted() && !bed) bed = hiss()
      if (bed) bed.set(muted() ? 0 : wantBed)
    }

    function draw (c, v) {
      var w = v.w, h = v.h, sp = bake(), G = v.ground != null ? v.ground : h
      c.save()
      if (cfg.dark) { c.fillStyle = 'rgba(14,22,40,' + (cfg.dark * mix).toFixed(3) + ')'; c.fillRect(0, 0, w, h) }
      // heat: a strong sun and shimmering air
      if (cfg.heat && sp) {
        var sx = w * 0.82, sy = view === 'top' ? h * 0.1 : h * 0.14, sr = Math.min(w, h) * 0.55
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.75 * mix; c.drawImage(sp.sun, sx - sr / 2, sy - sr / 2, sr, sr)
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1
        c.fillStyle = 'rgba(255,170,60,' + (0.08 * mix).toFixed(3) + ')'; c.fillRect(0, 0, w, h)
        if (!reduced) {
          c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 2
          for (var b = 0; b < 7; b++) {   // heat haze: wavy bands rising through the lower air
            var by = (h - ((t * 26 + b * h / 7) % h)); c.beginPath()
            for (var xx = 0; xx <= w; xx += 24) { var yy = by + Math.sin(xx * 0.03 + t * 3 + b) * 4; xx ? c.lineTo(xx, yy) : c.moveTo(xx, yy) }
            c.stroke()
          }
        }
      }
      // ripples (rings on water/puddles) and splash droplets
      if (rlive) {
        c.lineWidth = 1.3
        for (var r = 0; r < rlive; r++) {
          var a = ra[r]
          if (rk[r] === 0) {
            var k = a / 0.7, rr = 2 + k * 14
            c.strokeStyle = 'rgba(220,235,255,' + (0.55 * (1 - k)).toFixed(3) + ')'
            c.beginPath(); c.ellipse(rx[r], ry[r], rr, rr * (view === 'top' ? 0.82 : 0.32), 0, 0, TAU); c.stroke()
          } else {
            c.fillStyle = 'rgba(225,238,255,' + (0.8 * (1 - a / 0.45)).toFixed(3) + ')'
            c.fillRect(rx[r] - 1, ry[r] - 1, 2.2, 2.2)
          }
        }
      }
      // falling things
      if (live) {
        if (cfg.snow && sp) {
          for (var i = 0; i < live; i++) { var s2 = 3 + (1 - pz[i]) * 6; c.globalAlpha = 0.6 + (1 - pz[i]) * 0.4; c.drawImage(sp.flake, px[i] - s2 / 2, py[i] - s2 / 2, s2, s2) }
          c.globalAlpha = 1
        } else if (cfg.hail) {
          c.fillStyle = 'rgba(240,248,255,.95)'
          for (var i2 = 0; i2 < live; i2++) { var hr = 1.6 + (1 - pz[i2]) * 2.2; c.beginPath(); c.arc(px[i2], py[i2], hr, 0, TAU); c.fill() }
        } else {
          var slant = (cfg.slant || 0) + gust * 0.25, L = Math.max(18, cfg.len * h / 800)
          c.strokeStyle = 'rgba(232,240,255,.62)'; c.lineWidth = 1.5; c.beginPath()
          for (var i3 = 0; i3 < live; i3++) { var l3 = L * (0.6 + (1 - pz[i3]) * 0.6); c.moveTo(px[i3], py[i3]); c.lineTo(px[i3] - slant * l3, py[i3] - l3) }
          c.stroke()
        }
      }
      // snow piling up: a soft white rim (top view: frosted edges; side view: a growing bank on the ground)
      if (pile > 0.01) {
        if (view === 'side') {
          var ph2 = 3 + pile * 16; c.fillStyle = 'rgba(250,252,255,' + (0.85 * Math.min(1, pile * 3)).toFixed(3) + ')'
          c.beginPath(); c.moveTo(0, G + 2)
          for (var xs = 0; xs <= w + 30; xs += 30) c.quadraticCurveTo(xs + 15, G - ph2 - Math.sin(xs * 0.05) * 3, xs + 30, G - ph2 * 0.7)
          c.lineTo(w, G + 4); c.lineTo(0, G + 4); c.closePath(); c.fill()
        } else {
          var e = Math.min(w, h) * (0.06 + pile * 0.16), gg = c.createLinearGradient(0, 0, 0, e)
          gg.addColorStop(0, 'rgba(248,252,255,' + (0.7 * Math.min(1, pile * 2)).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(248,252,255,0)')
          c.fillStyle = gg; c.fillRect(0, 0, w, e)
          c.save(); c.translate(0, h); c.scale(1, -1); c.fillRect(0, 0, w, e); c.restore()
        }
      }
      // fog: two soft strips drifting at different speeds, baked ONCE as tileable textures (a canvas redrawn every few
      // frames is re-uploaded each time and costs a whole frame at 4x CPU, 2026-10-17); the far band gets the texture,
      // the whole view a plain veil (a solid fill is cheap)
      if (cfg.fog && lite) { c.fillStyle = 'rgba(225,232,242,' + (0.3 * mix).toFixed(3) + ')'; c.fillRect(0, 0, w, h) }
      if (cfg.fog && sp && sp.fogStrip && !lite) {
        var band = view === 'side' ? Math.min(h, G + 10) : h * 0.6
        for (var lay = 0; lay < 2; lay++) {
          var st = sp.fogStrip[lay], sh = band * (lay ? 0.75 : 1), sw = sh * st.width / st.height
          var off = ((fogX * (0.6 + lay * 0.7)) % sw + sw) % sw, y0 = view === 'side' ? band - sh : lay * band * 0.25
          c.globalAlpha = (0.55 + lay * 0.15) * mix
          for (var xx2 = -off; xx2 < w; xx2 += sw) c.drawImage(st, xx2, y0, sw, sh)
        }
        c.globalAlpha = 1
        c.fillStyle = 'rgba(225,232,242,' + (0.16 * mix).toFixed(3) + ')'; c.fillRect(0, 0, w, h)
      }
      // leaves
      if (ln && sp) for (var q = 0; q < ln; q++) { c.save(); c.translate(lx[q], ly[q]); c.rotate(lr[q]); c.drawImage(sp.leaf[lt[q]], -8, -5, 16, 10); c.restore() }
      // rainbow after a shower
      if (rainbow > 0) {
        var ra2 = Math.min(1, rainbow / 2) * Math.min(1, (7 - rainbow) / 1.2), cx = w * 0.5, cy = view === 'side' ? G + h * 0.1 : h * 0.95, R = Math.max(w, h) * 0.62
        var cols = ['#ff5b5b', '#ffa33b', '#ffe14d', '#62d26f', '#4aa8ff', '#7b6bff']
        c.lineWidth = Math.max(6, R * 0.03); c.globalAlpha = 0.35 * ra2
        for (var ci = 0; ci < cols.length; ci++) { c.strokeStyle = cols[ci]; c.beginPath(); c.arc(cx, cy, R - ci * c.lineWidth, Math.PI * 1.08, Math.PI * 1.92); c.stroke() }
        c.globalAlpha = 1
      }
      // the lightning flash over everything
      if (flash > 0) { c.fillStyle = 'rgba(235,242,255,' + (0.75 * flash * (Math.sin(flash * 40) > -0.3 ? 1 : 0.4)).toFixed(3) + ')'; c.fillRect(0, 0, w, h) }
      c.restore()
    }

    return {
      step: step, draw: draw, set: set,
      wind: function () { return gust },
      hush: function () { if (bed) bed.set(0); thunderAt = -1 },
      lite: function (on) { lite = !!on },
      kind: function () { return kind },
      state: function () { return { kind: kind, drops: live, ripples: rlive, flash: flash, pile: pile, rainbow: rainbow, leaves: ln, thunderPending: thunderAt > 0 } },
      destroy: function () { if (bed) { bed.stop(); bed = null } live = rlive = ln = 0 }
    }
  }

  // overlay(target, opts): for games drawn by a library (PIXI) -- an own canvas pinned over `target` (same box, under
  // the HUD), driven by the game's ticker: h.tick(dtSeconds, { ground, dx }) steps + paints; not calling it = frozen.
  function overlay (target, o) {
    if (!target || !target.parentNode) return null
    var wx = create(o), cv = D.createElement('canvas'), c = cv.getContext('2d'), dpr = Math.min(1.5, W.devicePixelRatio || 1), bw = 0, bh = 0, bl = null, bt = null, fitN = 0
    cv.className = 'weather-alive'; cv.setAttribute('aria-hidden', 'true')
    // fixed + no z-index + right after the game canvas: it paints over the game and UNDER every later (HUD) sibling
    cv.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none' + (o.z != null ? ';z-index:' + o.z : '')
    target.parentNode.insertBefore(cv, target.nextSibling)
    function fit () {
      var r = target.getBoundingClientRect()
      if (r.width !== bw || r.height !== bh) { bw = r.width; bh = r.height; cv.width = Math.round(bw * dpr); cv.height = Math.round(bh * dpr); cv.style.width = bw + 'px'; cv.style.height = bh + 'px' }
      if (r.left !== bl || r.top !== bt) { bl = r.left; bt = r.top; cv.style.transform = 'translate(' + bl + 'px,' + bt + 'px)' }
    }
    var h = {
      tick: function (dt, v) {
        v = v || {}
        if (!(fitN++ % 20)) fit()   // the box rarely changes: measure every 20th frame, not every frame
        var view = { w: bw, h: bh, dx: v.dx || 0, dy: v.dy || 0, ground: v.ground }
        wx.step(dt, view)
        c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, bw, bh)
        wx.draw(c, view)
      },
      set: wx.set, kind: wx.kind, state: wx.state, wind: wx.wind, hush: wx.hush,
      destroy: function () { wx.destroy(); if (cv.parentNode) cv.parentNode.removeChild(cv) }
    }
    return h
  }

  W.WeatherAlive = { create: create, overlay: overlay, KINDS: KINDS, thunder: thunder }
})(window)
