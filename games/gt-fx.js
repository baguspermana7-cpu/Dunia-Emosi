/* ============================================================================
 * gt-fx.js — window.GTFx. Garasi Tempur motion, attack effects, parallax and sound.
 *
 * ATTACK CHOREOGRAPHY (layered, ~1.4 s, meaning stays at 0 motion):
 *   1 WIND-UP   the truck art squashes then stretches (anticipation), the card lifts,
 *               a Type charge glow + aura build on it; engine rev + charge riser  (300 ms)
 *   2 TRAVEL    projectile Types: a VFX.domProjectile with a streak trail; dash Types
 *               (SPEED, STUNT): the art lunges with speed lines; whoosh            (320 ms)
 *   3 IMPACT    a white flash frame, then HIT-STOP 80-120 ms (scaled by damage), then
 *               the themed burst, a shock ring, debris chunks, a screen shake scaled
 *               by damage and a bouncing damage number. Crit (right answer) or SUPER
 *               (type advantage): a bigger second burst, a "KRITIS!"/"SUPER!" stamp
 *               and a chromatic punch. Sound: low thump + mid crunch + high sparkle,
 *               the Type sound, a crowd "ooh" on big hits.
 *   4 RECOIL    the target is knocked back and blinks red; smoke + tyre dust       (420 ms)
 *   5 DRAIN/SETTLE  HP ticks down, everything eases home
 *   KO          slow-mo hang, explosion, the card spins off, confetti over the winner,
 *               fanfare + cheer.
 * Type grammar (6 game Types -> 6 effect kinds): POWER fire, TECH electric, MUD water
 * (mud splash), STUNT rock, ARMOR steel, SPEED normal (dash).
 * Budget: transform/opacity only, every effect node lives in ONE fixed layer (#gtx) that
 * never holds more than 6 effects (oldest evicted), own nodes are pooled. Reduced motion:
 * no travel, no shake, no debris, opacity fades + the full sound.
 *
 * SOUND: original WebAudio synths through one bus (master gain -> DynamicsCompressor)
 * with a 6-voice cap (oldest voice stolen), zero nodes created while muted, plus the
 * owner's shared UI cues via SFXEngine (click/correct/wrong/levelup/star). No rips.
 *
 * PARALLAX SCENE: the arena is 3 layers (sky/backdrop 0.25, mid dust + props 0.6,
 * foreground dust 1.0). They drift slowly on their own and pan on attacks (camera),
 * transforms only, one rAF loop that stops when the tab is hidden.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window
  var EO = 'cubic-bezier(.23,1,.32,1)', EIO = 'cubic-bezier(.77,0,.175,1)', EBACK = 'cubic-bezier(.34,1.56,.64,1)'
  function reduced () { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm') } catch (e) { return false } }
  function wait (ms) { return new Promise(function (res) { setTimeout(res, ms) }) }
  function center (el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } }
  function clamp (v, a, b) { return Math.max(a, Math.min(b, v)) }
  // WAAPI `finished` never settles while rendering is throttled (hidden tab, busy device):
  // every animation also resolves on a plain timer, so a battle can never hang on motion.
  function anim (el, frames, o) {
    if (!el || !el.animate) return Promise.resolve()
    try {
      var a = el.animate(frames, o)
      // keep every forwards-filled pose on the element: Chrome can drop one from getAnimations() once a later
      // animation covers it while it still applies, so settle() would never cancel it (the truck stayed lunged)
      if (o.fill === 'forwards') (el.__gtHeld || (el.__gtHeld = [])).push(a)
      return new Promise(function (res) {
        var done = false, fin = function () { if (!done) { done = true; res() } }
        a.finished.then(fin, fin)
        setTimeout(function () { if (!done) { try { a.finish() } catch (e) {} fin() } }, (o.duration || 300) + (o.delay || 0) + 250)
      })
    } catch (e) { return Promise.resolve() }
  }

  // Type -> effect grammar: aura on the attacker, travel (projectile fx or 'dash'), impact
  // bursts (hit, and big for crit/SUPER), colour, effect kind (sound + debris + dust).
  var TYPE_FX = {
    POWER: { kind: 'fire',     aura: 'fire-sparks',   proj: 'flamethrower', hit: 'boom',   big: 'fire-sparks', color: '#FF5A36', dust: 'tire-smoke' },
    TECH:  { kind: 'electric', aura: 'electric-a',    proj: 'electric-a',   hit: 'spark1', big: 'electric-aura', color: '#1FC7C1', dust: 'tire-smoke' },
    MUD:   { kind: 'water',    aura: 'smoke-cloud',   proj: 'smoke-puff',   hit: 'smoke',  big: 'boom',        color: '#8AA14A', dust: 'mud-splash' },
    STUNT: { kind: 'rock',     aura: 'gravity',       proj: 'dash',         hit: 'boom',   big: 'smoke-puff',  color: '#B06CF2', dust: 'dust-cloud' },
    ARMOR: { kind: 'steel',    aura: 'holy-light',    proj: 'sparks',       hit: 'sparks', big: 'boom',        color: '#5B9BE6', dust: 'tire-smoke' },
    SPEED: { kind: 'normal',   aura: 'electric-aura', proj: 'dash',         hit: 'pop',    big: 'spark1',      color: '#FFD23F', dust: 'dust-cloud' }
  }
  var CHUNK = {
    fire: ['#FF5A36', '#FFB23F', '#FFE27A'], electric: ['#FFF27A', '#7FF3FF', '#FFFFFF'], water: ['#6B4E2E', '#8AA14A', '#4FA3E0'],
    rock: ['#8B7B6B', '#B9A58C', '#5E5148'], steel: ['#C9D3E6', '#7D8BA6', '#FFFFFF'], normal: ['#FFFFFF', '#FFD23F', '#FF9F43']
  }

  /* ── sound: one bus, a compressor, a voice cap ───────────────────────── */
  var AC = null, BUS = null, NB = null, muted = false, MAX_VOICES = W.__GT_FAULT ? 99 : 6   // __GT_FAULT: qa-gt-fx proves its cap checks fail
  var voices = [], vstat = { started: 0, peak: 0, stolen: 0 }
  function ac () {
    if (muted) return null
    try {
      if (!AC) AC = new (W.AudioContext || W.webkitAudioContext)()
      if (AC.state === 'suspended') AC.resume()
      if (!BUS) {
        // short limiter: keeps a layered impact loud but never clipping (kid ears)
        var comp = AC.createDynamicsCompressor()
        comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 10; comp.attack.value = 0.003; comp.release.value = 0.16
        var m = AC.createGain(); m.gain.value = 0.85
        m.connect(comp); comp.connect(AC.destination); BUS = m
      }
    } catch (e) { AC = null; BUS = null }
    return AC
  }
  function noiseBuf (c) {
    if (NB) return NB
    var n = c.sampleRate | 0, b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0)
    for (var i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1
    return (NB = b)
  }
  function stopVoice (v, c) { try { v.g.gain.cancelScheduledValues(c.currentTime); v.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.008); v.src.stop(c.currentTime + 0.04) } catch (e) {} }
  // every source passes here: at most MAX_VOICES sound at once, the oldest is faded out
  function play (c, src, g, t0, t1) {
    while (voices.length >= MAX_VOICES) { vstat.stolen++; stopVoice(voices.shift(), c) }
    var v = { src: src, g: g }
    voices.push(v); vstat.started++; vstat.peak = Math.max(vstat.peak, voices.length)
    src.onended = function () { var i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1) }
    src.start(t0); src.stop(t1)
  }
  function env (g, t, d, v, shape) {
    var p = g.gain
    p.setValueAtTime(0.0001, t)
    if (shape === 'swell') { p.exponentialRampToValueAtTime(v, t + d * 0.8); p.exponentialRampToValueAtTime(0.0001, t + d) }
    else if (shape === 'mid') { p.exponentialRampToValueAtTime(v, t + d * 0.35); p.exponentialRampToValueAtTime(0.0001, t + d) }
    else if (shape === 'crumble') { [0, 0.08, 0.17, 0.27].forEach(function (k, i) { p.setValueAtTime(v * (1 - i * 0.2), t + k); p.exponentialRampToValueAtTime(v * 0.05, t + k + 0.07) }); p.exponentialRampToValueAtTime(0.0001, t + d) }
    else { p.exponentialRampToValueAtTime(v, t + 0.006); p.exponentialRampToValueAtTime(0.0001, t + d) }
  }
  function filt (c, o) {
    var type = o.bp ? 'bandpass' : o.hp ? 'highpass' : o.lp ? 'lowpass' : ''
    if (!type) return null
    var f = c.createBiquadFilter(), t = c.currentTime + (o.at || 0)
    f.type = type; f.Q.value = o.q || (type === 'bandpass' ? 1 : 0.7)
    f.frequency.setValueAtTime(o.bp || o.hp || o.lp, t)
    if (o.ff) o.ff.forEach(function (p) { f.frequency.exponentialRampToValueAtTime(p[0], t + p[1]) })
    return f
  }
  // tone: o = { f0, f1, d, v, type, at, fpath:[[hz,s]], steps:[hz..] (zap), lp|hp|bp, q, ff:[[hz,s]], shape }
  function tone (o) {
    var c = ac(); if (!c || !BUS) return
    try {
      var t = c.currentTime + (o.at || 0), g = c.createGain(), osc = c.createOscillator(), fr = osc.frequency
      osc.type = o.type || 'sawtooth'; fr.setValueAtTime(o.f0, t)
      if (o.steps) o.steps.forEach(function (h, i) { fr.setValueAtTime(h, t + (i + 1) * (o.d / (o.steps.length + 1))) })
      else if (o.fpath) o.fpath.forEach(function (p) { fr.exponentialRampToValueAtTime(p[0], t + p[1]) })
      else fr.exponentialRampToValueAtTime(Math.max(20, o.f1 || o.f0), t + o.d)
      env(g, t, o.d, o.v || 0.15, o.shape)
      var f = filt(c, o)
      if (f) { osc.connect(f); f.connect(g) } else osc.connect(g)
      g.connect(BUS); play(c, osc, g, t, t + o.d + 0.03)
    } catch (e) {}
  }
  // noise: o = { d, v, at, lp|hp|bp, q, ff, shape }
  function noise (o) {
    var c = ac(); if (!c || !BUS) return
    try {
      var t = c.currentTime + (o.at || 0), s = c.createBufferSource(), g = c.createGain()
      s.buffer = noiseBuf(c); s.loop = true
      env(g, t, o.d, o.v || 0.3, o.shape)
      var f = filt(c, o) || filt(c, { lp: 900 })
      s.connect(f); f.connect(g); g.connect(BUS); play(c, s, g, t, t + o.d + 0.03)
    } catch (e) {}
  }
  var TYPE_SND = {
    fire: function (at) { noise({ at: at, d: 0.42, v: 0.32, lp: 300, ff: [[2200, 0.18], [700, 0.42]], shape: 'mid' }) },
    electric: function (at) { tone({ at: at, f0: 1400, d: 0.24, v: 0.06, type: 'square', lp: 4200, steps: [900, 1900, 1100, 2300, 800, 1700, 1300] }) },
    water: function (at) { noise({ at: at, d: 0.36, v: 0.34, bp: 1300, q: 1.2, ff: [[320, 0.36]] }); tone({ at: (at || 0) + 0.02, f0: 720, f1: 230, d: 0.18, v: 0.12, type: 'sine' }) },
    rock: function (at) { noise({ at: at, d: 0.42, v: 0.42, lp: 650, shape: 'crumble' }) },
    steel: function (at) { tone({ at: at, f0: 880, f1: 860, d: 0.6, v: 0.11, type: 'triangle' }); tone({ at: at, f0: 1376, f1: 1360, d: 0.42, v: 0.07, type: 'sine' }) },
    normal: function (at) { tone({ at: at, f0: 520, f1: 1040, d: 0.12, v: 0.08, type: 'triangle' }) }
  }
  var SND = {
    rev: function () { tone({ f0: 55, fpath: [[170, 0.22], [120, 0.5]], d: 0.55, v: 0.15, lp: 900, shape: 'mid' }) },
    riser: function (d) { d = d || 0.34; tone({ f0: 180, f1: 900, d: d, v: 0.06, lp: 2600, shape: 'swell' }); noise({ d: d, v: 0.09, bp: 700, q: 1.4, ff: [[4200, d]], shape: 'swell' }) },
    whoosh: function () { noise({ d: 0.3, v: 0.3, bp: 450, q: 0.9, ff: [[2400, 0.14], [600, 0.3]], shape: 'mid' }) },
    impact: function (k) {      // k 0..1 = how hard: low thump + mid crunch + high sparkle
      k = clamp(k || 0, 0, 1)
      tone({ f0: 150 + k * 30, f1: 36, d: 0.3 + k * 0.12, v: 0.42 + k * 0.2, type: 'sine' })
      noise({ d: 0.15 + k * 0.08, v: 0.32 + k * 0.18, bp: 1500, q: 0.9 })
      tone({ at: 0.025, f0: 2600, f1: 3400, d: 0.14, v: 0.06, type: 'triangle' })
    },
    type: function (kind, at) { (TYPE_SND[kind] || TYPE_SND.normal)(at) },
    ooh: function () { noise({ at: 0.12, d: 0.85, v: 0.42, bp: 380, q: 4, ff: [[620, 0.4], [420, 0.85]], shape: 'swell' }) },
    cheer: function () { noise({ d: 1.1, v: 0.22, bp: 1600, q: 0.6, shape: 'swell' }) },
    fanfare: function () { [[523, 0, 0.14], [659, 0.11, 0.14], [784, 0.22, 0.14], [1047, 0.33, 0.5]].forEach(function (n) { tone({ at: n[1], f0: n[0], f1: n[0], d: n[2], v: 0.11, type: 'triangle' }) }) },
    thud: function () { SND.impact(0.4) },
    ko: function () { tone({ f0: 220, f1: 45, d: 0.7, v: 0.3, lp: 900 }); noise({ d: 0.55, v: 0.45, lp: 500 }) },
    card: function () { noise({ d: 0.07, v: 0.12, lp: 3500 }) },
    fuel: function () { tone({ f0: 300, f1: 520, d: 0.16, v: 0.1, type: 'triangle' }) },
    part: function () { tone({ f0: 900, f1: 600, d: 0.08, v: 0.12, type: 'square', lp: 2500 }); tone({ at: 0.07, f0: 1200, f1: 800, d: 0.06, v: 0.1, type: 'square', lp: 2500 }) },
    tick: function () { tone({ f0: 1100, f1: 1000, d: 0.05, v: 0.08, type: 'sine' }) },
    go: function () { tone({ f0: 160, f1: 520, d: 0.5, v: 0.14, lp: 1600 }) },
    cue: function (k) { if (muted) return; try { if (W.SFXEngine && SFXEngine.cue) SFXEngine.cue(k) } catch (e) {} }
  }

  /* ── parallax scene ───────────────────────────────────────────────────── */
  var scene = null
  function mountScene (host, arenaKey, lib) {
    host.innerHTML =
      '<div class="px-l px-bg"><div class="px-img"></div></div>' +
      '<div class="px-l px-mid"><i class="dust d1"></i><i class="dust d2"></i><i class="dust d3"></i></div>' +
      '<div class="px-l px-fg"><i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i><i class="spark s4"></i></div>' +
      '<div class="px-vig"></div>'
    setArena(host, arenaKey, lib)
    scene = { host: host, bg: host.querySelector('.px-bg'), mid: host.querySelector('.px-mid'), fg: host.querySelector('.px-fg'), cam: 0, camT: 0, raf: 0, t0: performance.now() }
    loop()
    return scene
  }
  function setArena (host, arenaKey, lib) {
    var port = W.innerHeight > W.innerWidth
    var img = host.querySelector('.px-img')
    if (img) img.style.backgroundImage = 'url("' + lib('gt-arena/' + arenaKey + (port ? '-port' : '-land')) + '")'
    host.setAttribute('data-arena', arenaKey)
  }
  function loop () {
    if (!scene) return
    cancelAnimationFrame(scene.raf)
    var step = function (now) {
      if (!scene || document.hidden) { if (scene) scene.raf = 0; return }
      var t = (now - scene.t0) / 1000
      scene.cam += (scene.camT - scene.cam) * 0.08           // camera eases toward its target
      if (!reduced()) {
        var dx = Math.sin(t * 0.21) * 6, dy = Math.cos(t * 0.17) * 3
        scene.bg.style.transform = 'translate3d(' + (dx * 0.25 + scene.cam * 0.25).toFixed(2) + 'px,' + (dy * 0.25).toFixed(2) + 'px,0) scale(1.06)'
        scene.mid.style.transform = 'translate3d(' + (dx * 0.6 + scene.cam * 0.6).toFixed(2) + 'px,' + (dy * 0.6).toFixed(2) + 'px,0)'
        scene.fg.style.transform = 'translate3d(' + (dx + scene.cam).toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0)'
      }
      scene.raf = requestAnimationFrame(step)
    }
    scene.raf = requestAnimationFrame(step)
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && scene && !scene.raf) loop() })
  function pan (px) { if (scene) scene.camT = px }

  /* ── effect layer: ONE fixed host, at most 6 effects, own nodes pooled ── */
  var LAYER = null, MAX_FX = W.__GT_FAULT ? 99 : 6, POOL = {}, fstat = { spawned: 0, peak: 0, evicted: 0 }
  function layer () {
    if (!LAYER || !LAYER.isConnected) { LAYER = document.createElement('div'); LAYER.id = 'gtx'; LAYER.setAttribute('aria-hidden', 'true'); document.body.appendChild(LAYER) }
    return LAYER
  }
  function give (el) {
    if (!el) return
    try { el.getAnimations({ subtree: true }).forEach(function (a) { a.cancel() }) } catch (e) {}
    if (el.parentNode) el.parentNode.removeChild(el)
    if (el._kind) { var p = POOL[el._kind] || (POOL[el._kind] = []); if (p.length < 3 && p.indexOf(el) < 0) p.push(el) }
  }
  function room () {
    var L = layer()
    while (L.childElementCount >= MAX_FX) { fstat.evicted++; give(L.firstElementChild) }
    return L
  }
  function note () { fstat.spawned++; fstat.peak = Math.max(fstat.peak, layer().childElementCount) }
  // own effect: a pooled container placed by a static transform; only its children animate
  function fxEl (kind, n, tag, ph, x, y, rot) {
    var p = POOL[kind], el = p && p.length ? p.pop() : null
    if (!el) {
      el = document.createElement('div'); el.className = 'gtx gtx-' + kind; el._kind = kind
      for (var i = 0; i < n; i++) el.appendChild(document.createElement(tag || 'i'))
    }
    el.setAttribute('data-ph', ph)
    el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)' + (rot ? ' rotate(' + rot.toFixed(1) + 'deg)' : '')
    room().appendChild(el); note()
    return el
  }
  function done (el, ps) { return Promise.all(ps).then(function () { give(el) }) }
  // a shared VFX frame pack, hosted in the layer so it counts against the cap
  function vfx (fx, x, y, size, ph, blend) {
    if (!W.VFX) return
    var L = room(), before = L.lastElementChild
    try { VFX.dom(x, y, { fx: fx, size: Math.round(size), blend: blend, parent: L }) } catch (e) {}
    mark(L, before, ph)
  }
  function mark (L, before, ph) { var n = L.lastElementChild; if (n && n !== before) { n.setAttribute('data-ph', ph); note() } }
  function rnd (a, b) { return a + Math.random() * (b - a) }
  function sprite (k) { try { return W.GTCard && GTCard.lib ? GTCard.lib('mojo-fx/' + k) : '' } catch (e) { return '' } }

  // charge glow (wind-up) — in reduced motion a plain fade
  function glow (c, color, rm, ph) {
    var el = fxEl('glow', 1, 'i', ph || 'windup', c.x, c.y), g = el.firstChild, s = Math.round(c.w * 1.6)
    g.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (-s / 2) + 'px;top:' + (-s / 2) + 'px;--c:' + color
    return done(el, [rm ? anim(g, [{ opacity: 0 }, { opacity: 0.8 }, { opacity: 0 }], { duration: 380 })
      : anim(g, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 0.95, offset: 0.6 }, { transform: 'scale(1.45)', opacity: 0 }], { duration: 380, easing: EO })])
  }
  // projectile streak trail
  function trail (ca, cb, color, ms) {
    var dx = cb.x - ca.x, dy = cb.y - ca.y, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI
    var el = fxEl('trail', 1, 'i', 'travel', ca.x, ca.y, ang), t = el.firstChild
    t.style.cssText = 'width:' + Math.round(d) + 'px;--c:' + color
    return done(el, [anim(t, [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 0.9, offset: 0.75 }, { transform: 'translateX(' + Math.round(d * 0.55) + 'px) scaleX(.45)', opacity: 0 }], { duration: ms + 120, easing: 'linear' })])
  }
  // dash speed lines along the path
  function lines (ca, cb, color) {
    var dx = cb.x - ca.x, dy = cb.y - ca.y, d = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI
    var el = fxEl('lines', 7, 'i', 'travel', (ca.x + cb.x) / 2, (ca.y + cb.y) / 2, ang), ps = []
    for (var i = 0; i < 7; i++) {
      var l = el.children[i], w = Math.round(d * rnd(0.3, 0.55))
      l.style.cssText = 'width:' + w + 'px;top:' + Math.round((i - 3) * ca.h * 0.07) + 'px;left:' + (-w / 2) + 'px;--c:' + color
      ps.push(anim(l, [{ transform: 'translateX(' + Math.round(-d * 0.55) + 'px)', opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'translateX(' + Math.round(d * 0.35) + 'px)', opacity: 0 }], { duration: 300, delay: i * 18, easing: 'linear' }))
    }
    return done(el, ps)
  }
  // impact: shock ring + debris chunks thrown out with a little gravity
  function impact (c, kind, k, big, ph) {
    var el = fxEl('imp', 9, 'i', ph || 'impact', c.x, c.y), ps = [], cols = CHUNK[kind] || CHUNK.normal, sc = c.w / 150
    el.setAttribute('data-k', kind)
    var ring = el.children[0], rs = Math.round(c.w * 0.9)
    ring.style.cssText = 'width:' + rs + 'px;height:' + rs + 'px;left:' + (-rs / 2) + 'px;top:' + (-rs / 2) + 'px'
    ps.push(anim(ring, [{ transform: 'scale(.2)', opacity: 0.95 }, { transform: 'scale(' + (big ? 3 : 2.1) + ')', opacity: 0 }], { duration: 400, easing: EO }))
    for (var i = 1; i < 9; i++) {
      var ch = el.children[i], a = (i / 8) * Math.PI * 2 + rnd(-0.35, 0.35), r = (40 + 70 * k) * (big ? 1.45 : 1) * sc * rnd(0.7, 1.2)
      var ddx = Math.cos(a) * r, ddy = Math.sin(a) * r * 0.8 - 20 * sc, rot = rnd(-260, 260), s = Math.round(rnd(8, 15) * sc)
      ch.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (-s / 2) + 'px;top:' + (-s / 2) + 'px;background:' + cols[i % cols.length]
      ps.push(anim(ch, [{ transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 },
        { transform: 'translate(' + Math.round(ddx * 0.75) + 'px,' + Math.round(ddy * 0.75 - 18 * sc) + 'px) rotate(' + Math.round(rot / 2) + 'deg) scale(1)', opacity: 1, offset: 0.45 },
        { transform: 'translate(' + Math.round(ddx) + 'px,' + Math.round(ddy + 34 * sc) + 'px) rotate(' + Math.round(rot) + 'deg) scale(.55)', opacity: 0 }], { duration: Math.round(rnd(520, 680)), easing: 'cubic-bezier(.2,.7,.4,1)' }))
    }
    return done(el, ps)
  }
  // the punch: a white flash frame, then for crit/SUPER a stamp + a chromatic split
  function punch (cb, b, big, o, rm) {
    var el = fxEl('punch', 4, 'i', 'impact', 0, 0), ps = [], vw = W.innerWidth, vh = W.innerHeight
    var fl = el.children[0], st = el.children[1], cr = el.children[2], cc = el.children[3]
    var fs = Math.round(Math.max(vw, vh) * 1.1)
    fl.style.cssText = 'width:' + fs + 'px;height:' + fs + 'px;left:' + Math.round(cb.x - fs / 2) + 'px;top:' + Math.round(cb.y - fs / 2) + 'px'
    if (!rm) ps.push(anim(fl, [{ opacity: 0 }, { opacity: big ? 0.7 : 0.45, offset: 0.2 }, { opacity: 0 }], { duration: 140, easing: 'linear' }))
    else fl.style.opacity = '0'
    st.textContent = big ? (o.sup ? 'SUPER!' : 'KRITIS!') : ''
    st.className = 'gtx-stamp' + (o.sup ? ' sup' : '')
    st.style.cssText = 'left:' + Math.round(clamp(cb.x, 120, vw - 120)) + 'px;top:' + Math.round(clamp(cb.y - cb.h * 0.48, 50, vh - 50)) + 'px;display:' + (big ? 'block' : 'none')
    if (big) ps.push(rm ? anim(st, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 950 })
      : anim(st, [{ transform: 'translate(-50%,-50%) rotate(-16deg) scale(2.8)', opacity: 0 },
        { transform: 'translate(-50%,-50%) rotate(-8deg) scale(.88)', opacity: 1, offset: 0.22 },
        { transform: 'translate(-50%,-50%) rotate(-8deg) scale(1.1)', opacity: 1, offset: 0.34 },
        { transform: 'translate(-50%,-50%) rotate(-8deg) scale(1)', opacity: 1, offset: 0.46 },
        { transform: 'translate(-50%,-90%) rotate(-8deg) scale(1)', opacity: 0 }], { duration: 950, easing: EO }))
    var img = b.querySelector('.gc-l1'), chroma = big && !rm && img && img.src
    ;[cr, cc].forEach(function (x, i) {
      if (!chroma) { x.style.display = 'none'; return }
      var r = img.getBoundingClientRect()
      x.style.cssText = 'display:block;left:' + Math.round(r.left) + 'px;top:' + Math.round(r.top) + 'px;width:' + Math.round(r.width) + 'px;height:' + Math.round(r.height) + 'px;background-image:url("' + img.src + '")'
      x.className = 'gtx-chroma ' + (i ? 'c' : 'r')
      var off = (i ? 1 : -1) * Math.max(8, r.width * 0.06)
      ps.push(anim(x, [{ transform: 'translate(' + off + 'px,' + (-off / 3) + 'px) scale(1.06)', opacity: 0.85 }, { transform: 'translate(0,0) scale(1)', opacity: 0 }], { duration: 260, easing: EO }))
    })
    return done(el, ps)
  }
  // a short-lived overlay on the card itself (white impact flash, red hurt blink)
  function cardFlash (b, cls, frames, ms, ph) {
    var f = document.createElement('i'); f.className = cls; f.setAttribute('data-ph', ph); b.appendChild(f)
    return anim(f, frames, { duration: ms, easing: 'linear' }).then(function () { f.remove() })
  }
  function dust (c, ux, k) {
    var el = fxEl('dust', 3, 'img', 'recoil', c.x, c.y + c.h * 0.36), ps = [], src = sprite(k), s = Math.round(c.w * 0.5)
    for (var i = 0; i < 3; i++) {
      var d = el.children[i], side = (i - 1) * 0.9 - ux * 0.6
      d.alt = ''; if (src && d.getAttribute('src') !== src) d.src = src
      d.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (-s / 2) + 'px;top:' + (-s / 2) + 'px'
      ps.push(anim(d, [{ transform: 'translate(0,0) scale(.45)', opacity: 0.95 },
        { transform: 'translate(' + Math.round(side * s * 0.9) + 'px,' + Math.round(-s * rnd(0.15, 0.45)) + 'px) scale(1.35)', opacity: 0 }], { duration: Math.round(rnd(480, 600)), delay: i * 40, easing: EO }))
    }
    return done(el, ps)
  }
  function slowmo () {
    var el = fxEl('slow', 1, 'i', 'ko', 0, 0)
    return done(el, [anim(el.firstChild, [{ opacity: 0 }, { opacity: 0.6, offset: 0.25 }, { opacity: 0.6, offset: 0.7 }, { opacity: 0 }], { duration: 1050, easing: 'linear' })])
  }
  function confetti (c) {
    var el = fxEl('conf', 16, 'i', 'ko', c.x, c.y - c.h * 0.3), ps = [], sc = Math.max(0.8, c.w / 150)
    for (var i = 0; i < 16; i++) {
      var p = el.children[i], dx = rnd(-130, 130) * sc, up = rnd(70, 170) * sc, rot = rnd(-540, 540)
      ps.push(anim(p, [{ transform: 'translate(0,0) rotate(0) scale(.6)', opacity: 1, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { transform: 'translate(' + Math.round(dx * 0.7) + 'px,' + Math.round(-up) + 'px) rotate(' + Math.round(rot / 2) + 'deg) scale(1)', opacity: 1, offset: 0.35, easing: 'cubic-bezier(.5,0,.8,.6)' },
        { transform: 'translate(' + Math.round(dx) + 'px,' + Math.round(up * 0.5) + 'px) rotate(' + Math.round(rot) + 'deg) scale(.9)', opacity: 0 }], { duration: Math.round(rnd(820, 980)), delay: i * 10 }))
    }
    return done(el, ps)
  }

  /* ── choreography ─────────────────────────────────────────────────────── */
  function floatText (x, y, text, cls, parent, bounce) {
    var el = document.createElement('div'); el.className = 'fx-float ' + (cls || ''); el.textContent = text
    el.style.left = x + 'px'; el.style.top = y + 'px'; (parent || document.body).appendChild(el)
    var rm = reduced()
    anim(el, rm ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }]
      : bounce ? [{ transform: 'translate(-50%,-30%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-70%) scale(1.6)', opacity: 1, offset: 0.16 },
        { transform: 'translate(-50%,-70%) scale(.85)', opacity: 1, offset: 0.28 }, { transform: 'translate(-50%,-75%) scale(1.12)', opacity: 1, offset: 0.4 },
        { transform: 'translate(-50%,-80%) scale(1)', opacity: 1, offset: 0.55 }, { transform: 'translate(-50%,-170%) scale(1)', opacity: 0 }]
      : [{ transform: 'translate(-50%,-30%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-80%) scale(1.25)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-160%) scale(1)', opacity: 0 }],
      { duration: bounce ? 1050 : 950, easing: bounce ? 'linear' : EO }).then(function () { el.remove() })
  }
  function shake (el, px) {
    if (reduced() || !el || !px) return Promise.resolve()
    return anim(el, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + px + 'px,' + (-px / 2) + 'px)' }, { transform: 'translate(' + (-px * 0.8) + 'px,' + (px / 3) + 'px)' },
      { transform: 'translate(' + (px * 0.5) + 'px,' + (-px / 4) + 'px)' }, { transform: 'translate(' + (-px * 0.25) + 'px,0)' }, { transform: 'translate(0,0)' }], { duration: 300, easing: 'linear' })
  }
  // an element inside the 2-player top half ([data-flip], turned 180°) moves in its own
  // axes: a screen-space offset must be negated before it goes into its transform
  function flipOf (el) { return el && el.closest && el.closest('[data-flip]') ? -1 : 1 }
  // the target is shoved away from the attacker and blinks red; smoke + tyre dust
  function recoil (b, ca, cb, T, big, k, rm) {
    var dx = cb.x - ca.x, dy = cb.y - ca.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, fb = flipOf(b)
    var red = rm ? [{ opacity: 0 }, { opacity: 0.45 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 0.75 }, { opacity: 0 }, { opacity: 0.55 }, { opacity: 0 }, { opacity: 0.35 }, { opacity: 0 }]
    var ps = [cardFlash(b, 'fx-red', red, 440, 'recoil')]
    if (rm) return Promise.all(ps)
    var push = (8 + 8 * k) * (big ? 1.3 : 1)
    ps.push(anim(b, [{ transform: 'translate(0,0) rotate(0)' },
      { transform: 'translate(' + (ux * fb * push).toFixed(1) + '%,' + (uy * fb * push * 0.6).toFixed(1) + '%) rotate(' + (ux * fb * (5 + 4 * k)).toFixed(1) + 'deg)', offset: 0.2 },
      { transform: 'translate(' + (-ux * fb * push * 0.18).toFixed(1) + '%,0) rotate(' + (-ux * fb * 1.5).toFixed(1) + 'deg)', offset: 0.62 },
      { transform: 'translate(0,0) rotate(0)' }], { duration: 440, easing: EO }))
    vfx('smoke-puff', cb.x - ux * cb.w * 0.15, cb.y + cb.h * 0.2, cb.w * 0.95, 'recoil')
    ps.push(dust(cb, ux, T.dust))
    return Promise.all(ps)
  }
  // ev: engine 'attack' event. a/b: attacker / target card elements. setHp(v): redraws the target HP.
  function attack (o) {
    var a = o.from, b = o.to, T = TYPE_FX[o.type] || TYPE_FX.POWER, rm = reduced()
    var art = a && a.querySelector('.gc-l1'), fl = flipOf(a)
    var ca = center(a), cb = center(b)
    var dir = (cb.x >= ca.x ? 1 : -1) * fl
    var dy = (cb.y - ca.y) * fl, dx = (cb.x - ca.x) * fl
    var big = !!(o.correct || o.sup), k = clamp((o.dmg || 0) / 9, 0, 1), dash = T.proj === 'dash'
    var aura = { stop: function () {} }
    // 1 wind-up: squash (anticipation) then stretch, charge glow + aura, rev + riser
    SND.rev(); SND.riser(0.32)
    a.classList.add('fx-lift')
    glow(ca, T.color, rm)
    if (W.VFX && !rm) { var L0 = room(), b0 = L0.lastElementChild; try { aura = VFX.domAura(a, { fx: T.aura, duration: 1000, scale: 1.25, parent: L0 }) } catch (e) {} mark(L0, b0, 'windup') }
    var S0 = 'translate(0,0) rotate(0) scale(1,1)'
    var S1 = 'translate(' + (-dir * 5) + '%,6%) rotate(' + (-dir * 5) + 'deg) scale(1.14,.84)'
    var S2 = 'translate(' + (-dir * 7) + '%,2%) rotate(' + (-dir * 8) + 'deg) scale(.92,1.12)'
    var p1 = rm ? wait(200) : anim(art, [{ transform: S0 }, { transform: S1, offset: 0.45 }, { transform: S2 }], { duration: 300, easing: EO, fill: 'forwards' })
    return p1.then(function () {
      // 2 travel: projectile + trail, or a dash with speed lines
      SND.whoosh(); pan(-dir * fl * 18)
      var reach = dash ? 0.62 : 0.35, ms = dash ? 260 : 320
      var S3 = 'translate(' + (dx * reach) + 'px,' + (dy * reach) + 'px) rotate(' + (dir * 8) + 'deg) scale(1.32,1.28)'
      var p2 = rm ? Promise.resolve() : anim(art, [{ transform: S2 }, { transform: S3 }], { duration: ms, easing: dash ? 'cubic-bezier(.55,0,.9,.45)' : EIO, fill: 'forwards' })
      var hit
      if (rm) hit = wait(120)
      else if (dash) { lines(ca, cb, T.color); hit = wait(ms) }
      else {
        trail(ca, cb, T.color, ms)
        hit = new Promise(function (res) {
          if (!W.VFX) return setTimeout(res, ms)
          var L = room(), bf = L.lastElementChild
          try { VFX.domProjectile({ x: ca.x, y: ca.y }, { x: cb.x, y: cb.y }, { fx: T.proj, size: Math.max(70, ca.w * 0.55), duration: ms, onHit: res, parent: L }) } catch (e) { res() }
          mark(L, bf, 'travel')
        })
      }
      return Promise.all([p2, hit])
    }).then(function () {
      // 3 impact: the flash frame + the layered hit sound, then HIT-STOP (everything holds)
      aura.stop()
      SND.impact(big ? 1 : k); SND.type(T.kind); if (big || k >= 0.6) SND.ooh()
      b.classList.add('fx-hit'); b.style.setProperty('--hitc', T.color)
      punch(cb, b, big, o, rm)
      if (!rm) cardFlash(b, 'fx-flash', [{ opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { opacity: 0 }], 260, 'impact')
      return wait(rm ? 0 : Math.round(80 + 40 * (big ? 1 : k)))
    }).then(function () {
      if (rm) glow(cb, T.color, true, 'impact')
      else {
        vfx(T.hit, cb.x, cb.y, Math.max(120, cb.w * (1.1 + 0.35 * k)), 'impact', T.hit === 'smoke' ? null : 'screen')
        if (big) setTimeout(function () { vfx(T.big, cb.x, cb.y, cb.w * 1.9, 'impact', 'screen') }, 70)
        impact(cb, T.kind, k, big)
      }
      floatText(cb.x, cb.y - cb.h * 0.15, '−' + o.dmg, 'dmg' + (big ? ' crit' : ''), null, true)
      if (o.correct) floatText(cb.x, cb.y + cb.h * 0.12, 'Jawaban benar +2!', 'bonus')
      if (o.weak) floatText(cb.x, cb.y - cb.h * 0.42, 'kurang efektif…', 'weak')
      var sh = Math.round(2 + 6 * k + (big ? 3 : 0))      // screen shake scaled by damage
      return Promise.all([recoil(b, ca, cb, T, big, k, rm), shake(o.stage, sh)])
    }).then(function () {
      // 4 drain: tick HP down
      return drain(o.hpBefore, o.hpAfter, o.setHp)
    }).then(function () {
      // 5 settle
      pan(0)
      b.classList.remove('fx-hit'); a.classList.remove('fx-lift')
      if (!rm && art) return anim(art, [{ transform: getComputedStyle(art).transform === 'none' ? 'none' : getComputedStyle(art).transform }, { transform: 'translate(0,0) rotate(0) scale(1)' }], { duration: 220, easing: EO }).then(function () {
        release(art)
      })
    })
  }
  function release (el) {
    try { (el.__gtHeld || []).concat(el.getAnimations()).forEach(function (x) { x.cancel() }) } catch (e) {}
    el.__gtHeld = []
  }
  function drain (from, to, setHp) {
    if (!setHp) return Promise.resolve()
    var steps = Math.max(1, from - to), per = Math.max(30, Math.min(90, 360 / steps)), v = from
    return new Promise(function (res) {
      if (reduced() || steps <= 1) { setHp(to); return res() }
      ;(function next () { v--; setHp(v); if (v <= to) return res(); setTimeout(next, per) })()
    })
  }
  // KO: slow-mo hang, explosion, the card spins off; confetti + fanfare for the winner
  function ko (el, winner) {
    SND.ko(); setTimeout(function () { SND.fanfare(); SND.cheer() }, 520)
    var c = center(el), rm = reduced(), fl = flipOf(el)
    if (rm) { glow(c, '#FFD23F', true, 'ko'); return anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }) }
    slowmo()
    vfx('boom', c.x, c.y, c.w * 1.8, 'ko', 'screen')
    setTimeout(function () { vfx('smoke', c.x, c.y, c.w * 1.5, 'ko') }, 240)
    impact(c, 'fire', 1, true, 'ko')
    var wc = winner && winner.getBoundingClientRect ? center(winner) : { x: W.innerWidth / 2, y: W.innerHeight * 0.45, w: 180, h: 240 }
    setTimeout(function () { confetti(wc) }, 460)
    var side = (c.x < W.innerWidth / 2 ? -1 : 1) * fl
    return anim(el, [{ transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1, easing: 'cubic-bezier(.2,.8,.3,1)' },
      { transform: 'translate(0,-6%) rotate(' + (-side * 4) + 'deg) scale(1.08)', opacity: 1, offset: 0.36, easing: 'cubic-bezier(.6,0,.9,.5)' },
      { transform: 'translate(' + (side * 140) + '%,-35%) rotate(' + (side * 540) + 'deg) scale(.35)', opacity: 0 }], { duration: 1100, fill: 'forwards' })
  }
  // card flies from a point (hand / deck) to its place: the element is already in its
  // final spot, we animate a FLIP from where it came from.
  function flyIn (el, fromRect, o) {
    if (!el || !fromRect) return Promise.resolve()
    SND.card()
    if (reduced()) return anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 })
    var r = el.getBoundingClientRect(), fl = flipOf(el)
    var dx = (fromRect.left + fromRect.width / 2 - (r.left + r.width / 2)) * fl, dy = (fromRect.top + fromRect.height / 2 - (r.top + r.height / 2)) * fl
    var s = fromRect.width / Math.max(1, r.width)
    return anim(el, [{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ') rotate(' + ((o && o.rot) || -6) + 'deg)', opacity: 0.9 },
      { transform: 'translate(' + dx * 0.4 + 'px,' + (dy * 0.4 - 30) + 'px) scale(' + (s + 1) / 2 * 1.08 + ') rotate(3deg)', opacity: 1, offset: 0.55 },
      { transform: 'none', opacity: 1 }], { duration: (o && o.ms) || 420, easing: EO })
  }
  function pulse (el, cls) {
    if (!el) return
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls)
    setTimeout(function () { el.classList.remove(cls) }, 700)
  }
  // frames + sprites the attack choreography uses, for the offline warm-up
  function warmUrls (base) {
    var out = [], seen = {}, R = (W.VFX && VFX._registry) || {}
    function add (fx) {
      if (seen[fx] || !R[fx] || fx === 'dash') return; seen[fx] = 1
      for (var i = 1; i <= R[fx].frames; i++) out.push(base + 'assets/vfx/' + R[fx].dir + '/' + fx + '/f-' + i + '.webp')
    }
    Object.keys(TYPE_FX).forEach(function (t) { var x = TYPE_FX[t]; add(x.aura); add(x.proj); add(x.hit); add(x.big) })
    add('smoke-puff'); add('sparks'); add('boom'); add('smoke')
    ;['tire-smoke', 'dust-cloud', 'mud-splash'].forEach(function (k) { var u = sprite(k); if (u) out.push(u) })
    return out
  }

  W.GTFx = { TYPE_FX: TYPE_FX, SND: SND, mountScene: mountScene, setArena: setArena, pan: pan, attack: attack, ko: ko, flyIn: flyIn, floatText: floatText,
    shake: shake, pulse: pulse, anim: anim, wait: wait, reduced: reduced, center: center, warmUrls: warmUrls,
    MAX_FX: MAX_FX, MAX_VOICES: MAX_VOICES,
    stats: function () { return { voices: voices.length, vpeak: vstat.peak, vstarted: vstat.started, vstolen: vstat.stolen, fx: LAYER ? LAYER.childElementCount : 0, fxPeak: fstat.peak, fxSpawned: fstat.spawned, evicted: fstat.evicted } },
    resetStats: function () { vstat = { started: 0, peak: voices.length, stolen: 0 }; fstat = { spawned: 0, peak: 0, evicted: 0 } },
    mute: function (m) {
      muted = !!m
      if (muted && AC) { voices.forEach(function (v) { stopVoice(v, AC) }); voices = [] }
      try { if (W.SFXEngine && SFXEngine.setMute) SFXEngine.setMute(muted) } catch (e) {}
    }, muted: function () { return muted } }
})()
