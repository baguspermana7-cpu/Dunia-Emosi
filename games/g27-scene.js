/* ============================================================================
 * g27-scene.js — window.G27Scene. The living layer of G27 "Spelling Adventure".
 *
 * Owner: "karakternya ada bendanya dibuat parallax ya seolah-olah bergerak
 * tidak static, micromovement", "dump truck dan backhoe itu sedikit
 * bergerak-gerak atau parallax 3d", "polish … agar ada particle atau detail".
 *
 * Three things, on ONE requestAnimationFrame loop:
 *   1. DEPTH PARALLAX — every element carrying `data-depth` (0 far … 1 near)
 *      shifts with a look vector driven by the tablet's gyro, the pointer, or
 *      (when nobody is touching anything) a slow Lissajous drift, so the scene
 *      breathes on its own. Maths from games/parallax-engine.js (RZParallax).
 *   2. CHARACTER LIFE — .g27-char-truck / .g27-char-digger idle like machines
 *      with the engine running: a bob, a faint rock, suspension "breathing"
 *      from the wheels, the digger's arm leaning; and they REACT to the game
 *      (hop on a right letter, wince on a wrong one, cheer on a solved word).
 *   3. PARTICLES — one canvas, a preset per backdrop (dust, pollen, sunbeam
 *      motes, stars and fireflies, confetti and sparkles).
 *
 * Rules it keeps, because a child is tapping on the same screen:
 *   - UI never moves. Only decor (data-depth) and characters are transformed;
 *     transforms only, no layout properties, so nothing reflows.
 *   - Amplitude is capped at ~3% of the viewport width at depth 1, so a layer
 *     cannot drift onto a control.
 *   - Reduced motion (OS setting or the app's own) → nothing moves, no canvas.
 *   - The loop stops when the tab is hidden, and dt is clamped for the owner's
 *     throttled tablet (Motion.damp).
 *   - NO CSS filter on anything that moves. A filter:blur on the full-screen
 *     backdrop while it was being translated every frame measured 5.8 fps;
 *     without the filter 43 fps, and 47 with will-change (which refresh() sets).
 *     qa-g27-motion.mjs fails if a moving layer carries a filter.
 * ========================================================================== */
(function () {
  'use strict'
  var W = window
  var TAU = Math.PI * 2

  function reduced () {
    try { if (W.Motion && W.Motion.reduced && W.Motion.reduced()) return true } catch (_) {}
    try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (_) {}
    return false
  }
  function damp (cur, target, rate, dt) {
    if (W.Motion && W.Motion.damp) return W.Motion.damp(cur, target, rate, dt)
    return target + (cur - target) * Math.exp(-rate * Math.min(Math.max(dt, 0), 0.1))
  }

  // ── state ────────────────────────────────────────────────────────────────
  var px = null                 // RZParallax instance
  var raf = 0, last = 0, t0 = 0
  var running = false, frames = 0
  var lastInput = -1e9          // ms of the last real pointer input
  var lastTilt = -1e9           // ms of the last deviceorientation WITH values
  var tiltBound = false
  // RZParallax.bindTilt() resolves true on Android and desktop even with no
  // gyro at all, so "bound" must not mean "live": a desktop that trusted it
  // froze (drift off, pointer ignored). Tilt counts only while real readings
  // are actually arriving.
  function tiltLive () { return performance.now() - lastTilt < 1500 }
  var scene = 'town'
  var canvas = null, ctx = null, dpr = 1, parts = []
  // per-character reaction impulses, decayed toward 0 every frame
  var react = { hop: 0, wince: 0, cheer: 0, cheerT: 0, digger: 0 }
  var covered = false           // an overlay is over the scene

  // ── layers ───────────────────────────────────────────────────────────────
  // The element lists are CACHED and refreshed every ~20 frames, and always
  // read before any write in a frame. The first version queried + measured the
  // layers, wrote their transforms, then queried + measured the characters —
  // a read after a write, which forces a synchronous layout mid-frame (layout
  // thrashing). Measured on the harness: 61 ms of frame work at a 4x CPU
  // throttle, against a few ms once reads and writes were separated.
  var cacheL = [], cacheC = [], cacheAge = 1e9
  function refresh (force) {
    if (!force && cacheAge < 20) { cacheAge++; return }
    cacheL = layers(); cacheC = characters(); cacheAge = 0
    measureRoom(cacheL.filter(function (e) { return !e.classList.contains('g27-bg') }).concat(cacheC))
    // Promote every animated element to its own compositor layer so moving it
    // is a GPU translate, not a repaint.
    for (var i = 0; i < cacheL.length; i++) cacheL[i].style.willChange = 'transform'
    for (var j = 0; j < cacheC.length; j++) cacheC[j].style.willChange = 'transform'
  }
  function layers () {
    return Array.prototype.slice.call(document.querySelectorAll('[data-depth]')).filter(visible)
  }
  function characters () {
    return Array.prototype.slice.call(document.querySelectorAll('.g27-char-truck, .g27-char-digger')).filter(visible)
  }
  function visible (el) {
    // no box = inactive screen; visibility:hidden = the game decided there is
    // no room for it (.no-room). Neither is worth a frame.
    if (!(el && el.getClientRects && el.getClientRects().length)) return false
    var cs = W.getComputedStyle(el)
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05
  }

  // What counts as a control: a moving layer must never be pushed onto one.
  var BLOCK = '.scr.active button, .scr.active .tile, .scr.active .slot, .scr.active .card, .scr.active .wcard, .ov.show button'
  var room = new Map()          // element -> { up, left, right } px, measured at rest

  // Run fn with every animated element at its REST position, synchronously —
  // no frame is painted in between, so nothing flickers. The game's own layout
  // (which hides a character that would touch a control, and parks the cheer
  // bubble above the truck) must measure the rest pose: measured mid-hop it
  // decided differently frame to frame (seen: the bubble shown or hidden on
  // the same screen depending on the animation phase).
  function atRest (fn) {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-depth], .g27-char-truck, .g27-char-digger'))
    var saved = els.map(function (e) { return e.style.transform })
    els.forEach(function (e) { e.style.transform = '' })
    try { return fn() } finally { els.forEach(function (e, i) { e.style.transform = saved[i] }) }
  }

  // How far each moving element can travel before it would touch a control,
  // measured at rest. Hop and sway are clamped to this, so a character parked
  // 1 px under the letter tiles can never jump onto them — by construction,
  // not by hoping the amplitude is small enough.
  function measureRoom (els) {
    room = new Map()
    atRest(function () {
      var blocks = Array.prototype.slice.call(document.querySelectorAll(BLOCK)).filter(visible)
        .map(function (b) { return b.getBoundingClientRect() })
      els.forEach(function (el) {
        var r = el.getBoundingClientRect(), up = 999, left = 999, right = 999
        blocks.forEach(function (b) {
          var xOverlap = b.right > r.left && b.left < r.right
          var yOverlap = b.bottom > r.top && b.top < r.bottom
          if (xOverlap && b.bottom <= r.top + 1) up = Math.min(up, r.top - b.bottom)
          if (yOverlap && b.right <= r.left + 1) left = Math.min(left, r.left - b.right)
          if (yOverlap && b.left >= r.right - 1) right = Math.min(right, b.left - r.right)
          if (xOverlap && yOverlap) { up = 0; left = 0; right = 0 }   // already touching: do not move toward it
        })
        room.set(el, { up: Math.max(0, up - 2), left: Math.max(0, left - 2), right: Math.max(0, right - 2), half: Math.max(1, r.width / 2) })
      })
    })
  }
  function clampTo (el, dx, dy) {
    var m = room.get(el)
    if (!m) return [dx, dy]
    return [Math.max(-m.left, Math.min(m.right, dx)), Math.max(-m.up, dy)]
  }

  function strength () {
    // px of sway at depth 1: calm, and never more than 3% of the width
    return Math.min(22, (W.innerWidth || 800) * 0.03)
  }

  // ── particles ────────────────────────────────────────────────────────────
  var PRESETS = {
    //            kind(s)                 count
    town:         [['dust', 14]],
    construction: [['dust', 18]],
    recycling:    [['dust', 16]],
    park:         [['pollen', 14], ['leaf', 5]],
    sunrise:      [['pollen', 12], ['glint', 4]],
    classroom:    [['mote', 16]],
    bedroom:      [['mote', 14]],
    night:        [['star', 22], ['firefly', 8]],
    reward:       [['confetti', 34], ['sparkle', 10]],
  }
  var CONFETTI = ['#FF5A5F', '#FFB400', '#3DB36B', '#2F80ED', '#9B51E0', '#FF7AB6', '#F2994A']

  // Particles were first sized for a phone and read as specks on a tablet —
  // the confetti in particular looked like dust, not a celebration. Size now
  // scales with the shorter side of the screen (1 at a 390 px phone).
  function unit () { var c = canvas; return c ? Math.max(1, Math.min(2.2, Math.min(c.clientWidth, c.clientHeight) / 390)) : 1 }

  function makeParticle (kind, w, h, fresh) {
    var r = Math.random, u = unit()
    var p = { kind: kind, x: r() * w, y: r() * h, a: 0, life: 0, seed: r() * 1000 }
    switch (kind) {
      case 'dust':     p.s = (1.6 + r() * 2.6) * u; p.vx = (r() - 0.3) * 10; p.vy = -(3 + r() * 8); p.col = 'rgba(214,176,120,'; break
      case 'pollen':   p.s = (1.6 + r() * 2.2) * u; p.vx = (r() - 0.5) * 8;  p.vy = -(2 + r() * 5); p.col = 'rgba(255,248,196,'; break
      case 'mote':     p.s = (1.4 + r() * 2) * u;   p.vx = (r() - 0.5) * 5;  p.vy = -(1 + r() * 3); p.col = 'rgba(255,240,200,'; break
      case 'leaf':     p.s = (5 + r() * 4) * u;     p.vx = 8 + r() * 10;     p.vy = 12 + r() * 10;  p.rot = r() * TAU; p.col = r() < 0.5 ? '#6CBF4F' : '#9ACD48'; break
      case 'glint':    p.s = (4 + r() * 4) * u;     p.vx = 0; p.vy = 0; p.col = 'rgba(255,245,210,'; break
      case 'star':     p.s = (1 + r() * 1.8) * u; p.vx = 0; p.vy = 0; p.y = r() * h * 0.55; p.col = 'rgba(255,255,235,'; break
      case 'firefly':  p.s = (2 + r() * 1.6) * u; p.vx = (r() - 0.5) * 14; p.vy = (r() - 0.5) * 10; p.y = h * (0.45 + r() * 0.5); p.col = 'rgba(214,255,120,'; break
      case 'confetti': p.s = (8 + r() * 7) * u;     p.vx = (r() - 0.5) * 20; p.vy = 30 + r() * 40; p.rot = r() * TAU; p.vr = (r() - 0.5) * 6
                       p.col = CONFETTI[(r() * CONFETTI.length) | 0]; if (fresh) p.y = -r() * h; break
      case 'sparkle':  p.s = (5 + r() * 7) * u;     p.vx = 0; p.vy = 0; p.col = 'rgba(255,255,255,'; break
    }
    return p
  }

  function seedParticles () {
    parts = []
    if (!canvas || reduced()) return
    var w = canvas.clientWidth, h = canvas.clientHeight
    ;(PRESETS[scene] || PRESETS.town).forEach(function (spec) {
      for (var i = 0; i < spec[1]; i++) parts.push(makeParticle(spec[0], w, h, true))
    })
  }

  function drawStar (c, x, y, r) {
    c.beginPath()
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4, rr = i % 2 ? r * 0.28 : r
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    c.closePath(); c.fill()
  }

  function stepParticles (dt, now) {
    if (!ctx) return
    var w = canvas.clientWidth, h = canvas.clientHeight
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    var t = now / 1000
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]
      p.life += dt
      p.x += (p.vx + Math.sin(t * 0.7 + p.seed) * 3) * dt
      p.y += p.vy * dt
      var wrap = false
      if (p.kind === 'leaf' || p.kind === 'confetti') { if (p.y > h + 20) wrap = true }
      else if (p.y < -20 || p.x < -30 || p.x > w + 30) wrap = true
      if (p.kind === 'firefly') { p.vx += (Math.random() - 0.5) * 20 * dt; p.vy += (Math.random() - 0.5) * 16 * dt; p.vx *= 0.99; p.vy *= 0.99
                                  if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < h * 0.4 || p.y > h) p.vy *= -1; wrap = false }
      if (p.once && p.kind === 'sparkle' && p.life > 1.6) wrap = true
      if (wrap && p.once) { parts.splice(i, 1); i--; continue }
      if (wrap) { parts[i] = makeParticle(p.kind, w, h, false); if (p.kind === 'leaf' || p.kind === 'confetti') parts[i].y = -10
                  else parts[i].y = h + 10; continue }
      // fade in over the first half second so nothing pops into existence
      var fade = Math.min(1, p.life / 0.5)
      switch (p.kind) {
        case 'dust': case 'pollen': case 'mote':
          ctx.fillStyle = p.col + (0.55 * fade) + ')'
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); break
        case 'leaf':
          p.rot += dt * 1.6
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(t * 2 + p.seed) * 0.6)
          ctx.globalAlpha = 0.85 * fade; ctx.fillStyle = p.col
          ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore(); break
        case 'glint': case 'star': case 'sparkle':
          var tw = 0.5 + 0.5 * Math.sin(t * (p.kind === 'star' ? 1.6 : 3) + p.seed)
          ctx.fillStyle = p.col + (tw * (p.kind === 'star' ? 0.9 : 0.8) * fade) + ')'
          if (p.kind === 'star') { ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill() }
          else drawStar(ctx, p.x, p.y, p.s * (0.6 + tw * 0.6))
          break
        case 'firefly':
          var g = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + p.seed))
          ctx.fillStyle = p.col + (0.25 * g * fade) + ')'
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 3.2, 0, TAU); ctx.fill()
          ctx.fillStyle = p.col + (0.9 * g * fade) + ')'
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); break
        case 'confetti':
          p.rot += p.vr * dt
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
          ctx.scale(1, Math.abs(Math.cos(p.rot * 1.3)) * 0.8 + 0.2)   // a flat card tumbling
          ctx.globalAlpha = fade; ctx.fillStyle = p.col
          ctx.fillRect(-p.s / 2, -p.s * 0.3, p.s, p.s * 0.6); ctx.restore(); break
      }
    }
  }

  function sizeCanvas () {
    if (!canvas) return
    dpr = Math.min(2, W.devicePixelRatio || 1)
    var w = canvas.clientWidth, h = canvas.clientHeight
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr))
    seedParticles()
  }

  // ── the loop ─────────────────────────────────────────────────────────────
  function frame (now) {
    raf = 0
    if (!running) return
    if (document.hidden) { last = 0; return }      // resumed by visibilitychange
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60
    last = now; frames++
    var t = (now - t0) / 1000

    // look vector: real input wins; otherwise a slow Lissajous so it breathes
    if (!tiltLive() && now - lastInput > 2500) px.setLook(Math.sin(t * TAU / 12) * 0.55, Math.sin(t * TAU / 9 + 1.1) * 0.35)
    px.set('strength', strength())
    px.update(dt * 60)

    // No DOM measurement inside the frame at all. The lists and the room
    // clamps are refreshed only when the layout actually changes (the game
    // calls refresh() on every screen change, word load and overlay; resize
    // and orientation do too) plus an idle-time safety net below. Measuring
    // every 20 frames here cost a forced synchronous layout: a p95 of 250 ms
    // and 2.7 fps on the 10-letter word when styles were still settling.
    var L = cacheL, C = cacheC
    for (var i = 0; i < L.length; i++) {
      var d = parseFloat(L[i].getAttribute('data-depth')) || 0
      var o = px.layer(d)
      var xy = L[i].classList.contains('g27-bg') ? [o.x, o.y] : clampTo(L[i], o.x, o.y)
      L[i].style.transform = 'translate3d(' + xy[0].toFixed(2) + 'px,' + xy[1].toFixed(2) + 'px,0)'
    }

    // reactions decay toward rest, frame-rate independent
    react.hop = damp(react.hop, 0, 6, dt)
    react.wince = damp(react.wince, 0, 12, dt)
    react.digger = damp(react.digger, 0, 3.5, dt)
    if (react.cheerT > 0) {
      react.cheerT -= dt
      react.cheer = Math.max(0, Math.sin((1.1 - react.cheerT) * TAU * 1.8)) * 14   // two bounces
      if (react.cheerT <= 0) react.cheer = 0
    }

    for (var k = 0; k < C.length; k++) {
      var el = C[k], isDig = el.classList.contains('g27-char-digger')
      var ph = isDig ? 1.9 : 0            // never in lockstep
      var bob = Math.sin(t * TAU / 0.9 + ph) * 1.6
      var rock = Math.sin(t * TAU / 1.8 + ph) * 0.4
      var breath = Math.sin(t * TAU / 0.9 + ph + 0.6) * 0.012
      var lean = isDig ? Math.sin(t * TAU / 4 + 0.4) * 1.2 - react.digger : 0
      var d2 = parseFloat(el.getAttribute('data-depth'))
      var base = isNaN(d2) ? px.layer(0.7) : px.layer(d2)
      var hop = react.hop + react.cheer
      var shake = react.wince ? Math.sin(t * 90) * react.wince : 0
      var cxy = clampTo(el, base.x + shake, base.y + bob - hop)
      // Rotating about the rear wheel lifts the far top corner by about
      // half-width x angle, so the lean (and the digger's raised bucket, up to
      // 14 deg) is capped by the same headroom as the hop.
      var rot = rock + lean, mr = room.get(el)
      if (mr) { var maxDeg = Math.min(14, (Math.max(0, mr.up + cxy[1]) / mr.half) * 57.3); rot = Math.max(-maxDeg, Math.min(maxDeg, rot)) }
      el.style.transformOrigin = '50% 100%'
      el.style.transform = 'translate3d(' + cxy[0].toFixed(2) + 'px,' + cxy[1].toFixed(2) + 'px,0) ' +
                           'rotate(' + rot.toFixed(2) + 'deg) ' +
                           'scale(' + (1 - breath * 0.5).toFixed(4) + ',' + (1 + breath).toFixed(4) + ')'
    }

    // An open overlay (the game's celebration screen) covers the canvas and
    // brings its own CSS confetti: drawing particles underneath it would only
    // burn the throttled tablet's frames, so they stand down until it closes.
    if (document.querySelector('.ov.show')) { if (!covered) { covered = true; if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height) } }
    else { covered = false; stepParticles(dt, now) }
    raf = W.requestAnimationFrame(frame)
  }

  function kick () { if (running && !raf && !document.hidden) { last = 0; raf = W.requestAnimationFrame(frame) } }

  // ── public API ───────────────────────────────────────────────────────────
  function start () {
    if (running) return
    if (reduced()) { running = false; return }     // everything stays put
    if (!W.RZParallax) return
    px = px || W.RZParallax.create({ strength: strength(), vertical: 0.5, ease: 6, scaleSpread: 0 })
    canvas = document.querySelector('canvas.g27-fx')
    if (canvas) { ctx = canvas.getContext('2d'); sizeCanvas() }
    running = true; t0 = performance.now(); refresh(true); kick()
  }
  function stop () {
    running = false
    if (raf) W.cancelAnimationFrame(raf); raf = 0
    layers().concat(characters()).forEach(function (el) { el.style.transform = '' })
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  function setScene (key) {
    refresh(true)
    if (key === scene) return
    scene = PRESETS[key] ? key : 'town'
    seedParticles()
  }
  function reactTo (kind) {
    if (!running) return
    if (kind === 'right') react.hop = 16
    else if (kind === 'wrong') react.wince = 2.2
    else if (kind === 'solved') { react.cheerT = 1.1; react.digger = 14; burst() }
  }
  // A celebration burst on a solved word: confetti from the top edge and a ring
  // of sparkles round the middle. Marked `once`, so they fall away and are
  // removed rather than recycled — the particle count returns to the preset.
  function burst () {
    // the celebration overlay has its own confetti; never stack two systems
    if (!canvas || reduced() || document.querySelector('.ov.show')) return
    var w = canvas.clientWidth, h = canvas.clientHeight
    for (var i = 0; i < 40; i++) {
      var c = makeParticle('confetti', w, h, false)
      c.x = w * (0.15 + Math.random() * 0.7); c.y = -10 - Math.random() * h * 0.25
      c.vy = 90 + Math.random() * 110; c.vx = (Math.random() - 0.5) * 120; c.once = true
      parts.push(c)
    }
    for (var k = 0; k < 10; k++) {
      var sp = makeParticle('sparkle', w, h, false)
      var a = k / 10 * TAU
      sp.x = w / 2 + Math.cos(a) * w * 0.22; sp.y = h * 0.42 + Math.sin(a) * h * 0.2
      sp.once = true; sp.vy = -12; parts.push(sp)
    }
  }

  // iOS asks for motion permission and only inside a user gesture: call this
  // from the Play tap. Android needs nothing. Failure just leaves the drift.
  function enableTilt () {
    if (!px || tiltBound) return Promise.resolve(tiltBound)
    var p = px.bindTilt()
    return Promise.resolve(p).then(function (ok) { tiltBound = ok !== false; return tiltBound }).catch(function () { return false })
  }

  W.addEventListener('pointermove', function (e) {
    if (!px || tiltLive()) return
    lastInput = performance.now()
    px.setLook((e.clientX / (W.innerWidth || 1)) * 2 - 1, (e.clientY / (W.innerHeight || 1)) * 2 - 1)
  }, { passive: true })
  // Drive the look from real readings HERE, not only through RZParallax's own
  // handler: that one is attached by enableTilt(), which waits for the Play tap.
  // Android fires deviceorientation without any permission, so on the title
  // screen readings arrived, marked tilt as live (stopping the drift and
  // ignoring the pointer) while nothing moved the look — the scene froze.
  // Same mapping as RZParallax.bindTilt: 45° is the comfortable holding angle.
  W.addEventListener('deviceorientation', function (e) {
    if (!e || (e.gamma == null && e.beta == null)) return
    lastTilt = performance.now()
    if (!px) return
    var g = e.gamma || 0, b = e.beta || 0
    px.setLook(Math.max(-1, Math.min(1, g / 35)), Math.max(-1, Math.min(1, (b - 45) / 35)))
  }, { passive: true })
  document.addEventListener('visibilitychange', kick)
  W.addEventListener('resize', function () { sizeCanvas(); refresh(true) })
  W.addEventListener('orientationchange', function () { setTimeout(function () { sizeCanvas(); refresh(true) }, 150) })
  // Safety net for a change nobody announced: re-measure every 2 s, but in
  // IDLE time, never inside an animation frame.
  setInterval(function () {
    if (!running || document.hidden) return
    var idle = W.requestIdleCallback || function (f) { return setTimeout(f, 0) }
    idle(function () { refresh(true) }, { timeout: 1000 })
  }, 2000)

  W.G27Scene = {
    start: start, stop: stop, setScene: setScene, react: reactTo, enableTilt: enableTilt,
    // call after swapping screens so new layers are picked up this frame
    refresh: function () { refresh(true) },
    // measure layout with everything at rest (see atRest above)
    atRest: atRest,
    // test seam: what the gates assert against
    state: function () {
      return { running: running, reduced: reduced(), frames: frames, scene: scene, tilt: tiltLive(), tiltBound: tiltBound,
               layers: layers().length, characters: characters().length, particles: parts.length,
               room: characters().map(function (e) { var r = room.get(e); return r ? r.up : null }),
               look: px ? px.cameraVec() : null }
    },
  }
})()
