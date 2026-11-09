/* games/dunia-cinema.js — window.DuniaCinema: one cinematic layer for every Dunia Emosi game page (owner 2026-11-09:
 * "Semua game di dunia emosi enhance animation nya. Literally semuanya", from the low-poly lighting reel: flat light ->
 * key light -> fill + rim -> glow + fog, plus easing, secondary motion, anticipation/squash, camera drift, particles,
 * grading). It never draws the game itself, so it works over DOM, SVG, canvas2d and PixiJS pages alike:
 *
 *   key light   a warm (day) or moon (night) light from one upper side, soft-light blended, drifting slowly like a
 *               handheld camera so the scene never sits dead still
 *   fill light  the cool sky colour lifting the opposite, shadowed side
 *   glow + fog  a thin haze band at the horizon (behind the action, never over the foreground) and a soft vignette
 *   grade       a touch more saturation and contrast (backdrop-filter), per-theme colour temperature through the lights
 *   particles   dust motes in the light, light specks, leaves, petals, bubbles or stars per theme (secondary motion:
 *               each one sways on its own sine, drifts with a shared breeze)
 *   scene       an opaque canvas2D scene (Timmy's sailing, lanes) gets bloom/grade/vignette through DuniaGLFX
 *   body        a DOM hero that jumps (Mario's Pikachu) stretches on take-off and squashes on landing, feet planted
 *   press       every button/card squashes on pointerdown (anticipation) and springs back with an overshoot
 *               (slow-in/slow-out), added on top of any transform the game already animates (composite: add)
 *
 * Three fixed layers (grade, light, particles) with pointer-events:none, so no tap ever lands on them. Reduced motion
 * (the OS setting or localStorage du-reduced-motion=1): lights stay, drift/particles/press stop. A slow page (two seconds
 * under 45 fps) drops the grade, then the light and particles. ?nocine=1 turns it all off (gates compare against it);
 * ?cineq=0|1|2 pins a tier (gates and screenshots on a slow headless renderer).
 *
 *   DuniaCinema.state()          -> { theme, quality, particles, reduced, on }
 *   DuniaCinema.set({ theme })   switch theme at runtime (a game moving from day to night)
 *   DuniaCinema.pulse(kind)      'win' warms and brightens the key light for a moment, 'hit' dims it briefly
 */
;(function (W, D) {
  'use strict'
  if (W.DuniaCinema) return
  var Q = W.location && W.location.search || ''
  if (/[?&]nocine=1/.test(Q)) { W.DuniaCinema = { state: function () { return { on: false } }, set: function () {}, pulse: function () {} }; return }

  // theme: key light colour, fill colour, haze colour, particle kind, particle colours, light side (1 = from left)
  var THEMES = {
    meadow: { key: '255,214,140', fill: '120,170,255', haze: '255,236,200', kind: 'leaf', cols: ['#8BC34A', '#CDDC39', '#FFC857'], side: 1 },
    rail: { key: '255,200,120', fill: '110,160,240', haze: '255,226,190', kind: 'mote', cols: ['#FFE7B0', '#FFF4D6'], side: 1 },
    city: { key: '255,210,150', fill: '120,165,255', haze: '235,230,255', kind: 'mote', cols: ['#FFF1C9', '#FFFFFF'], side: -1 },
    beach: { key: '255,222,150', fill: '90,200,255', haze: '255,240,210', kind: 'speck', cols: ['#FFF6C8', '#FFFFFF'], side: 1 },
    sea: { key: '200,240,255', fill: '40,120,220', haze: '160,220,255', kind: 'bubble', cols: ['#E6F7FF', '#BDE8FF'], side: -1 },
    sky: { key: '255,226,170', fill: '140,190,255', haze: '235,245,255', kind: 'speck', cols: ['#FFFFFF', '#FFF3C4'], side: 1 },
    forest: { key: '255,220,140', fill: '90,170,150', haze: '220,240,210', kind: 'leaf', cols: ['#7CB342', '#AED581', '#FFB74D'], side: -1 },
    sweet: { key: '255,210,225', fill: '170,150,255', haze: '255,225,240', kind: 'petal', cols: ['#FFB7D5', '#FFD6E7', '#FFFFFF'], side: 1 },
    garage: { key: '255,180,90', fill: '80,120,220', haze: '255,190,120', kind: 'spark', cols: ['#FFC062', '#FF8A3D', '#FFE2A8'], side: -1 },
    arena: { key: '255,206,120', fill: '120,140,255', haze: '255,220,170', kind: 'speck', cols: ['#FFE8A3', '#FFFFFF'], side: 1 },
    night: { key: '190,210,255', fill: '60,70,170', haze: '120,130,220', kind: 'star', cols: ['#FFFFFF', '#FFF2B0'], side: -1 }
  }
  var PAGES = {
    'balapan-kereta': 'rail', 'balapan-kereta-side': 'rail', 'lokomotif-pemberani': 'rail', 'selamatkan-kereta': 'rail',
    'museum-kereta': 'rail', 'kereta-maze': 'rail', 'mobil': 'city', 'mojo-swoptops': 'city', 'stinky-dirty': 'city',
    'ducky-volley': 'beach', 'pokemon-bawah-laut': 'sea', 'timmy-kapal': 'sea', 'pokemon-birds': 'sky',
    'pokemon-run': 'forest', 'ejaan-inggris': 'forest', 'monster-candy': 'sweet', 'garasi-tempur': 'garage',
    'gym-pokemon': 'arena', 'mario-pokemon': 'meadow', 'kuis-matematika': 'meadow', 'ayo-berhitung': 'meadow'
  }
  var page = ((W.location && W.location.pathname) || '').split('/').pop().replace(/\.html$/, '')
  var me = D.currentScript
  var theme = (me && me.getAttribute('data-theme')) || PAGES[page] || 'meadow'

  var mq = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : null
  function reduced () {
    try { if (W.localStorage && W.localStorage.getItem('du-reduced-motion') === '1') return true } catch (e) {}
    return !!(mq && mq.matches)
  }
  var lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)
  // quality tiers (measured 2026-11-09 on Garasi at 4x CPU, 60 fps bare: the backdrop grade 26 fps, the one merged
  // light layer 57, the particles 61). The page STARTS at 1 and earns 2 after 3 s at >= 55 fps. After a 6 s loading
  // grace, two seconds in a row under 45 fps drop a tier (under 25 fps straight to 0: the game's smoothness comes first)
  // and lower the ceiling. The ceiling comes back after 10 s of smooth frames, then 20 s, 40 s... (a single slow loading
  // second once sent every 61 fps page to tier 0 for good - a good tablet showed no effect at all):
  //   2 = grade + light drifting + particles   1 = light still + particles   0 = nothing drawn (the page as it was)
  var capMax = lowEnd ? 1 : 2, cap = capMax, quality = 1, fast = 0, slow = 0, backoff = 10
  var pinned = /[?&]cineq=([012])/.exec(Q)      // gates and screenshots pin a tier: ?cineq=2
  if (pinned) { quality = +pinned[1]; cap = capMax = quality }
  var root, grade, light, cv, ctx, sprites = {}, parts = [], raf = 0, t0 = 0, last = 0, secStart = 0, secFrames = 0, lastDrift = 0, lastHook = 0, frames = 0, pulseDur = 0, pulseUntil = 0, pulseKind = ''

  // two fixed children of <body> (a shared wrapper would be a stacking context, and a blend inside one mixes only with
  // that empty wrapper): ONE soft-light layer carries key, fill, horizon haze and vignette as four gradients
  var CSS = [
    '.dcine{position:fixed;z-index:2147483000;pointer-events:none;inset:0}',
    '.dcine.dl{mix-blend-mode:soft-light;transition:opacity .6s cubic-bezier(.22,1,.36,1)}',
    '.dcine.dl.off,.dcine.dg.off{display:none}',
    '.dcine.dg{-webkit-backdrop-filter:saturate(1.12) contrast(1.06);backdrop-filter:saturate(1.12) contrast(1.06)}',
    'canvas.dcine{width:100%;height:100%}'
  ].join('')

  function paint () {
    var th = THEMES[theme] || THEMES.meadow, s = th.side
    var kx = s > 0 ? '14%' : '86%', fx = s > 0 ? '92%' : '8%'
    light.style.backgroundImage = [
      // key: a strong warm pool from the lit side
      'radial-gradient(110% 90% at ' + kx + ' 0%,rgba(' + th.key + ',.95) 0%,rgba(' + th.key + ',.45) 30%,rgba(' + th.key + ',0) 62%)',
      // fill: a weak cool wash in the far, shadowed corner only
      'radial-gradient(70% 70% at ' + fx + ' 100%,rgba(' + th.fill + ',.5) 0%,rgba(' + th.fill + ',.14) 45%,rgba(' + th.fill + ',0) 75%)',
      // fog BEHIND the action: a thin band at the horizon, never over the foreground at the bottom of the screen
      'linear-gradient(180deg,rgba(' + th.haze + ',0) 22%,rgba(' + th.haze + ',.22) 40%,rgba(' + th.haze + ',.14) 52%,rgba(' + th.haze + ',0) 66%)',
      // vignette: soft-light with a dark edge darkens the frame
      'radial-gradient(125% 115% at 50% 42%,rgba(40,30,60,0) 55%,rgba(40,30,60,.55) 100%)'
    ].join(',')
    light.style.backgroundSize = '124% 124%,124% 124%,100% 100%,100% 100%'
    light.style.backgroundPosition = '50% 50%,50% 50%,0 0,0 0'
    light.setAttribute('data-theme', theme)
    sprites = {}
  }

  function seed () {
    parts = []
    if (reduced() || !cv) return
    var w = cv.width, h = cv.height, n = Math.min(36, Math.max(10, Math.round(w * h / 52000)))
    for (var i = 0; i < n; i++) parts.push(spawn(w, h, true))
  }
  function spawn (w, h, any) {
    var th = THEMES[theme] || THEMES.meadow, k = th.kind, up = k === 'mote' || k === 'bubble' || k === 'spark' || k === 'speck'
    var r = Math.random
    return {
      x: r() * w, y: any ? r() * h : (up ? h + 10 : -10),
      vy: (up ? -1 : 1) * (k === 'spark' ? 18 + r() * 22 : k === 'bubble' ? 14 + r() * 16 : k === 'leaf' || k === 'petal' ? 16 + r() * 14 : 4 + r() * 6),
      sz: k === 'leaf' || k === 'petal' ? 4 + r() * 4 : k === 'bubble' ? 3 + r() * 5 : k === 'star' ? 1 + r() * 1.6 : 1.2 + r() * 2.2,
      ph: r() * 6.28, sw: 8 + r() * 18, rot: r() * 6.28, vr: (r() - 0.5) * 1.6, a: 0.35 + r() * 0.45,
      c: th.cols[(r() * th.cols.length) | 0]
    }
  }
  // a soft glow dot, drawn once per colour and stamped (a gradient per particle per frame was the slow way)
  function glow (c) {
    if (sprites[c]) return sprites[c]
    var g = D.createElement('canvas'); g.width = g.height = 32
    var x = g.getContext('2d'), r = x.createRadialGradient(16, 16, 0, 16, 16, 16)
    r.addColorStop(0, c); r.addColorStop(0.35, c); r.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = r; x.fillRect(0, 0, 32, 32)
    return (sprites[c] = g)
  }
  function drawParts (dt, t) {
    var w = cv.width, h = cv.height, k = (THEMES[theme] || THEMES.meadow).kind, dpr = cv._dpr || 1
    ctx.clearRect(0, 0, w, h)
    var breeze = Math.sin(t * 0.13) * 10 * dpr
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]
      p.y += p.vy * dt * dpr; p.rot += p.vr * dt
      var x = p.x + Math.sin(t * 0.9 + p.ph) * p.sw * dpr + breeze
      if (p.y < -20 || p.y > h + 20) { parts[i] = spawn(w, h, false); continue }
      var sz = p.sz * dpr
      ctx.globalAlpha = k === 'star' || k === 'speck' ? p.a * (0.55 + 0.45 * Math.sin(t * 2.4 + p.ph)) : p.a
      if (k === 'leaf' || k === 'petal') {
        ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.45 + 0.4 * Math.abs(Math.sin(t * 1.7 + p.ph)))
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * (k === 'leaf' ? 0.5 : 0.7), 0, 0, 6.2832); ctx.fill(); ctx.restore()
      } else if (k === 'bubble') {
        ctx.strokeStyle = p.c; ctx.lineWidth = 1.2 * dpr; ctx.beginPath(); ctx.arc(x, p.y, sz, 0, 6.2832); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x - sz * 0.35, p.y - sz * 0.35, sz * 0.25, 0, 6.2832); ctx.fill()
      } else ctx.drawImage(glow(p.c), x - sz * 3, p.y - sz * 3, sz * 6, sz * 6)
    }
    ctx.globalAlpha = 1
  }

  function size () {
    if (!cv) return
    var dpr = Math.min(1.5, W.devicePixelRatio || 1)
    cv._dpr = dpr; cv.width = Math.round(W.innerWidth * dpr); cv.height = Math.round(W.innerHeight * dpr)
    seed()
  }

  function setQuality (q) {
    quality = q
    light.classList.toggle('off', q < 1)
    grade.classList.toggle('off', q < 2 || inScene)
    cv.style.display = q < 1 ? 'none' : ''
    if (q < 2) light.style.backgroundPosition = '50% 50%,50% 50%,0 0,0 0'
  }

  // an opaque canvas2D scene (Timmy's sailing and lanes) gets the in-scene half through DuniaGLFX: bloom, grade, vignette.
  // The copy takes its own class so the game's selectors still find exactly one scene canvas; tier 2 only.
  var GL_SCENES = ['.tks-cv', '.tkl-cv'], gls = [], glOff = false, glFrames = 0
  var GL_CSS = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none'
  function scanScenes () {
    for (var i = gls.length - 1; i >= 0; i--) if (!gls[i].src.isConnected) { gls[i].fx.destroy(); gls.splice(i, 1) }
    if (!W.DuniaGLFX) return
    for (var k = 0; k < GL_SCENES.length; k++) {
      var el = D.querySelector(GL_SCENES[k])
      if (!el || el.__dcGl || !el.isConnected) continue
      el.__dcGl = true
      var fx = W.DuniaGLFX.attach(el, { cls: 'dcine-glfx', css: GL_CSS })
      if (fx) { gls.push({ src: el, fx: fx }); fx.frame(glUniforms(0)) }
    }
  }
  function glUniforms (t) { var th = THEMES[theme] || THEMES.meadow; return { t: t, warm: th.side > 0 ? 0.35 : 0.2, bloom: 0.55, grain: 0.012, night: theme === 'night' ? 1 : 0 } }
  function drawScenes (t) {
    var on = quality >= 2 && !glOff
    for (var i = 0; i < gls.length; i++) { var g = gls[i]; g.fx.enable(on); if (on) { g.fx.frame(glUniforms(t)); glFrames++ } }
  }

  // the game's own big moments light the scene: a reward or celebration warms the key light, a hit dims it for a beat
  function wrap (o, k, kind) {
    if (!o || typeof o[k] !== 'function' || o[k].__dcine) return
    var f = o[k], w = function () { W.DuniaCinema.pulse(kind); return f.apply(this, arguments) }
    w.__dcine = true; o[k] = w
  }
  function hookMoments () {
    var V = W.VFX
    if (!V) return
    if (V.Moment) { wrap(V.Moment, 'reward', 'win'); wrap(V.Moment, 'celebrate', 'win') }
    if (V.Poke) wrap(V.Poke, 'impact', 'hit')
  }

  // a Pixi game lights and grades its own scene in the shader (key, fill, form, contrast); the screen-wide soft-light and
  // backdrop saturate on top only doubled them (hills 34,197,94 went 11,217,87, the sky clipped), so once the shader is
  // on, dunia-cinema-pixi.js calls inScene(): the light drops to half and the backdrop grade goes (it was also the
  // costliest layer)
  var lightK = 1, inScene = false
  function tick (now) {
    raf = W.requestAnimationFrame(tick); frames++
    if (D.hidden) { last = now; secStart = 0; return }
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
    last = now
    var t = (now - t0) / 1000, rm = reduced()
    // auto quality, once a second (see the tiers above)
    if (!secStart) { secStart = now; secFrames = 0 }
    secFrames++
    if (now - secStart >= 1000 && !pinned) {
      var fps = secFrames * 1000 / (now - secStart)
      fast = fps >= 55 ? fast + 1 : 0
      slow = fps < 45 ? slow + 1 : 0
      if (now - t0 > 6000 && slow >= 2 && quality > 0) { setQuality(fps < 25 ? 0 : quality - 1); cap = quality; slow = 0; fast = 0 }
      else if (fast >= backoff && cap < capMax) { cap++; backoff *= 2; fast = 0 }
      else if (fast >= 3 && quality < cap) { setQuality(quality + 1); fast = 0 }
      secStart = now; secFrames = 0
    }
    if (now - lastHook > 1000) { lastHook = now; hookMoments(); scanScenes() }
    if (gls.length) drawScenes(t)
    // gentle camera drift on the light: a slow figure-eight of a few percent, moved 10 times a second (sub-pixel steps)
    if (!rm && quality >= 2 && now - lastDrift > 100) {
      lastDrift = now
      var dx = 50 + Math.sin(t * 0.11) * 9, dy = 50 + Math.sin(t * 0.07 + 1) * 7
      light.style.backgroundPosition = dx.toFixed(2) + '% ' + dy.toFixed(2) + '%,' + (100 - dx).toFixed(2) + '% ' + (100 - dy).toFixed(2) + '%,0 0,0 0'
    }
    if (pulseDur) { pulseUntil = now + pulseDur; pulseDur = 0 }   // a pulse starts on the next drawn frame, so even a 2 fps page shows it
    // a win still lifts the light well above its resting level when the shader owns the scene (a pulse scaled down with
    // the rest was a 0.30 -> 0.35 flicker nobody would see)
    var pk = now < pulseUntil ? (pulseKind === 'win' ? Math.min(1, 0.85 * lightK + 0.5) : 0.55 * lightK) : 0.85 * lightK
    if (light._o !== pk) { light._o = pk; light.style.opacity = pk }
    if (!rm && quality >= 1 && parts.length) drawParts(dt, t)
    else if (parts.length && rm) { parts = []; ctx.clearRect(0, 0, cv.width, cv.height) }
    if (!rm) bodyTick()
  }

  // squash and stretch on a DOM hero that jumps: stretch on take-off, squash on landing scaled by the fall, settled with
  // an overshoot. Read from the game's own state by name (game files stay untouched); added on top of its transform,
  // around its own transform-origin (feet), so position and facing stay the game's. Pokemon Run already has its own.
  var BODIES = { 'mario-pokemon': { el: 'pikachu-sprite', st: 'S', ground: 'onGround', vy: 'vy' } }
  var body = BODIES[(W.location.pathname || '').split('/').pop().replace(/\.html$/, '')], bodyAir = false, bodyFall = 0, bodyN = 0
  function bodyAnim (el, k) {
    try { el.animate(k.f, { duration: k.d, easing: 'cubic-bezier(.22,1,.36,1)', composite: 'add', id: 'dcine-body' }); bodyN++ } catch (x) {}
  }
  function bodyTick () {
    if (!body || !Element.prototype.animate) return
    var s = null
    try { s = (0, eval)('typeof ' + body.st + '!=="undefined"?' + body.st + ':null') } catch (e) { return }
    var el = s && D.getElementById(body.el)
    if (!el) return
    var air = !s[body.ground], vy = +s[body.vy] || 0
    if (air && !bodyAir) {
      bodyFall = 0
      bodyAnim(el, { d: 260, f: [{ transform: 'scale(.86,1.14)' }, { transform: 'scale(.96,1.04)', offset: 0.5 }, { transform: 'scale(1,1)' }] })
    } else if (air) bodyFall = Math.max(bodyFall, vy)
    else if (bodyAir) {
      var a = Math.min(1, Math.max(0.35, bodyFall / 12))
      bodyAnim(el, { d: 340, f: [{ transform: 'scale(' + (1 + 0.16 * a).toFixed(3) + ',' + (1 - 0.2 * a).toFixed(3) + ')' }, { transform: 'scale(' + (1 - 0.04 * a).toFixed(3) + ',' + (1 + 0.05 * a).toFixed(3) + ')', offset: 0.45 }, { transform: 'scale(1,1)' }] })
    }
    bodyAir = air
  }

  // anticipation + squash on press, overshoot on release; added on top of the element's own transform
  var PRESS = 'button,[role="button"],.btn,a.card,.card,[class*="btn"],[class*="choice"],[class*="option"],[class*="answer"],[class*="tile"]'
  function pressTarget (e) {
    var el = e.target && e.target.closest ? e.target.closest(PRESS) : null
    if (!el || el.hasAttribute('data-dcine') || el.hasAttribute('data-cine-press-off') || el.disabled) return null
    var r = el.getBoundingClientRect()
    if (r.width > W.innerWidth * 0.8 && r.height > W.innerHeight * 0.5) return null   // a whole panel, not a button
    return el
  }
  function onDown (e) {
    if (reduced() || !Element.prototype.animate) return
    var el = pressTarget(e); if (!el) return
    if (el._dcUp) { el._dcUp.cancel(); el._dcUp = null }
    try { el._dcDown = el.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.03,.9)', offset: 0.45 }, { transform: 'scale(.97,.94)' }], { duration: 140, easing: 'cubic-bezier(.3,0,.5,1)', fill: 'forwards', composite: 'add', id: 'dcine-press' }) } catch (x) {}
    el._dcPressed = true
  }
  function onUp (e) {
    var el = e.target && e.target.closest ? e.target.closest(PRESS) : null
    release(el); if (lastPressed && lastPressed !== el) release(lastPressed)
  }
  var lastPressed = null
  function release (el) {
    if (!el || !el._dcPressed) return
    el._dcPressed = false
    if (el._dcDown) { el._dcDown.cancel(); el._dcDown = null }
    try { el._dcUp = el.animate([{ transform: 'scale(.97,.94)' }, { transform: 'scale(1.05,1.04)', offset: 0.42 }, { transform: 'scale(.99,1.01)', offset: 0.72 }, { transform: 'scale(1,1)' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)', composite: 'add', id: 'dcine-press' }) } catch (x) {}
  }

  function build () {
    if (root || !D.body) return
    var st = D.createElement('style'); st.id = 'dcine-css'; st.textContent = CSS; D.head.appendChild(st)
    root = ['dg', 'dl', 'dp'].map(function (c) {
      var e = D.createElement(c === 'dp' ? 'canvas' : 'div'); e.className = 'dcine ' + c; e.setAttribute('aria-hidden', 'true')
      e.setAttribute('data-dcine', ''); D.body.appendChild(e); return e
    })
    grade = root[0]; light = root[1]; cv = root[2]
    ctx = cv.getContext('2d')
    paint(); size(); setQuality(quality)
    W.addEventListener('resize', size)
    W.addEventListener('pointerdown', function (e) { var el = pressTarget(e); lastPressed = el; onDown(e) }, true)
    W.addEventListener('pointerup', onUp, true)
    W.addEventListener('pointercancel', onUp, true)
    if (mq && mq.addEventListener) mq.addEventListener('change', function () { seed() })
    t0 = W.performance ? W.performance.now() : 0
    raf = W.requestAnimationFrame(tick)
    // a page with a Timmy scene canvas needs DuniaGLFX (same cache token) unless the page already loads it
    if (!W.DuniaGLFX && me && me.src && (D.querySelector('script[src*="tk-steer"],script[src*="tk-lanes"]'))) {
      var gs = D.createElement('script'); gs.src = me.src.replace('dunia-cinema.js', 'dunia-glfx.js'); D.body.appendChild(gs)
    }
    // a PixiJS game gets the in-scene half (bloom, DoF, depth fog, rim) from its sibling file, same cache token
    if (W.PIXI && me && me.src) {
      var sc = D.createElement('script'); sc.src = me.src.replace('dunia-cinema.js', 'dunia-cinema-pixi.js'); D.body.appendChild(sc)
    }
  }

  W.DuniaCinema = {
    state: function () { return { on: !!root, theme: theme, quality: quality, particles: parts.length, reduced: reduced(), frames: frames } },
    set: function (o) { if (o && o.theme && THEMES[o.theme]) { theme = o.theme; if (root) { paint(); seed() } } },
    pulse: function (kind) { pulseKind = kind; pulseDur = kind === 'win' ? 900 : 260 },
    theme: function () { return THEMES[theme] },
    inScene: function () { inScene = true; lightK = 0.5; if (grade) grade.classList.add('off') },
    glfxEnable: function (v) { glOff = !v; drawScenes(0) },
    glfx: function () { return { scenes: gls.length, frames: glFrames } },
    body: function () { return { on: !!body, anims: bodyN, air: bodyAir } },
    themes: Object.keys(THEMES)
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', build); else build()
})(window, document)
