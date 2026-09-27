/* ============================================================================
 * gt-fx.js — window.GTFx. Garasi Tempur motion, attack effects, parallax and sound.
 *
 * ATTACK CHOREOGRAPHY (PRD v2 §5.3 — five beats, ~1.3 s, meaning stays at 0 motion):
 *   1 WIND-UP   attacker card lifts toward the viewer, its truck art leans back,
 *               a Type aura starts on the card                                 (260 ms)
 *   2 LAUNCH    the truck art "breaks the frame" toward the target while a Type
 *               projectile flies card-to-card; camera pans the arena layers    (340 ms)
 *   3 IMPACT    HIT-STOP (everything freezes 90 ms), impact burst, target card
 *               jolts, damage number pops, small screen shake                  (220 ms)
 *   4 DRAIN     HP ticks down on the target (the engine already decided it)    (360 ms)
 *   5 SETTLE    everything eases home                                          (200 ms)
 * VFX grammar per Type (PRD §5.4): colour + effect shape tell the Type even without
 * words. Only transform/opacity animate; VFX frames are the shared CC0/CC-BY packs.
 * Reduced motion: no travel, no shake — a fade, the burst as a glow, same numbers.
 *
 * PARALLAX SCENE: the arena is 3 layers (sky/backdrop 0.25, mid dust + props 0.6,
 * foreground dust 1.0). They drift slowly on their own and pan on attacks (camera),
 * transforms only, one rAF loop that stops when the tab is hidden.
 *
 * SOUND: short original WebAudio synths (engine rev, whoosh, thud) + the owner's shared
 * UI cues via SFXEngine (click/correct/wrong/levelup/star). No Pokémon rips (IP rule).
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window
  var EO = 'cubic-bezier(.23,1,.32,1)', EIO = 'cubic-bezier(.77,0,.175,1)'
  function reduced () { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('rm') } catch (e) { return false } }
  function wait (ms) { return new Promise(function (res) { setTimeout(res, ms) }) }
  function center (el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } }
  // WAAPI `finished` never settles while rendering is throttled (hidden tab, busy device):
  // every animation also resolves on a plain timer, so a battle can never hang on motion.
  function anim (el, frames, o) {
    if (!el || !el.animate) return Promise.resolve()
    try {
      var a = el.animate(frames, o)
      return new Promise(function (res) {
        var done = false, fin = function () { if (!done) { done = true; res() } }
        a.finished.then(fin, fin)
        setTimeout(function () { if (!done) { try { a.finish() } catch (e) {} fin() } }, (o.duration || 300) + (o.delay || 0) + 250)
      })
    } catch (e) { return Promise.resolve() }
  }

  // Type -> effect grammar. aura on the attacker, projectile, impact burst, colour.
  var TYPE_FX = {
    POWER: { aura: 'fire-sparks', proj: 'flamethrower', hit: 'boom', color: '#FF5A36', shake: 9 },
    SPEED: { aura: 'electric-aura', proj: 'spark1', hit: 'pop', color: '#FFD23F', shake: 5 },
    MUD:   { aura: 'smoke-cloud', proj: 'smoke-puff', hit: 'smoke', color: '#8AA14A', shake: 7 },
    STUNT: { aura: 'gravity', proj: 'sakuras', hit: 'pop', color: '#B06CF2', shake: 6 },
    ARMOR: { aura: 'holy-light', proj: 'sparks', hit: 'boom', color: '#5B9BE6', shake: 10 },
    TECH:  { aura: 'electric-a', proj: 'electric-a', hit: 'pop', color: '#1FC7C1', shake: 6 }
  }

  /* ── sound ─────────────────────────────────────────────────────────── */
  var AC = null, muted = false
  function ac () {
    if (muted) return null
    try { if (!AC) AC = new (W.AudioContext || W.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume() } catch (e) { AC = null }
    return AC
  }
  function tone (o) {
    var c = ac(); if (!c) return
    try {
      var t = c.currentTime, g = c.createGain(), osc = c.createOscillator()
      osc.type = o.type || 'sawtooth'; osc.frequency.setValueAtTime(o.f0, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.d)
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.v || 0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + o.d)
      var node = osc
      if (o.lp) { var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f }
      node.connect(g); g.connect(c.destination); osc.start(t); osc.stop(t + o.d + 0.05)
    } catch (e) {}
  }
  function noise (d, v, lp) {
    var c = ac(); if (!c) return
    try {
      var n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0)
      for (var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2)
      var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter()
      f.type = 'lowpass'; f.frequency.value = lp || 900; g.gain.value = v || 0.3
      s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start()
    } catch (e) {}
  }
  var SND = {
    rev: function () { tone({ f0: 70, f1: 190, d: 0.45, v: 0.16, lp: 700 }); tone({ f0: 35, f1: 95, d: 0.45, v: 0.12, type: 'square', lp: 400 }) },
    whoosh: function () { noise(0.28, 0.22, 2400) },
    thud: function () { tone({ f0: 140, f1: 40, d: 0.28, v: 0.3, type: 'sine' }); noise(0.18, 0.35, 700) },
    ko: function () { tone({ f0: 220, f1: 50, d: 0.7, v: 0.22, lp: 900 }); noise(0.5, 0.4, 500) },
    card: function () { noise(0.07, 0.12, 3500) },
    fuel: function () { tone({ f0: 300, f1: 520, d: 0.16, v: 0.1, type: 'triangle' }) },
    part: function () { tone({ f0: 900, f1: 600, d: 0.08, v: 0.12, type: 'square', lp: 2500 }); setTimeout(function () { tone({ f0: 1200, f1: 800, d: 0.06, v: 0.1, type: 'square', lp: 2500 }) }, 70) },
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

  /* ── choreography ─────────────────────────────────────────────────────── */
  function floatText (x, y, text, cls, parent) {
    var el = document.createElement('div'); el.className = 'fx-float ' + (cls || ''); el.textContent = text
    el.style.left = x + 'px'; el.style.top = y + 'px'; (parent || document.body).appendChild(el)
    var rm = reduced()
    anim(el, rm ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }]
      : [{ transform: 'translate(-50%,-30%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-80%) scale(1.25)', opacity: 1, offset: 0.25 }, { transform: 'translate(-50%,-160%) scale(1)', opacity: 0 }],
      { duration: 1100, easing: EO }).then(function () { el.remove() })
  }
  function shake (el, px) {
    if (reduced() || !el) return Promise.resolve()
    return anim(el, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + px + 'px,' + (-px / 2) + 'px)' }, { transform: 'translate(' + (-px * 0.7) + 'px,' + (px / 3) + 'px)' },
      { transform: 'translate(' + (px * 0.4) + 'px,0)' }, { transform: 'translate(0,0)' }], { duration: 260, easing: 'linear' })
  }
  // ev: engine 'attack' event. a/b: attacker / target card elements. setHp(v): redraws the target HP.
  function attack (o) {
    var a = o.from, b = o.to, T = TYPE_FX[o.type] || TYPE_FX.POWER, rm = reduced()
    var art = a && a.querySelector('.gc-l1'), dir = 1
    var ca = center(a), cb = center(b)
    dir = cb.x >= ca.x ? 1 : -1
    var dy = cb.y - ca.y, dx = cb.x - ca.x
    var aura = { stop: function () {} }
    SND.rev()
    // 1 wind-up
    a.classList.add('fx-lift')
    if (W.VFX && !rm) aura = VFX.domAura(a, { fx: T.aura, duration: 1100, scale: 1.25 })
    var p1 = rm ? Promise.resolve() : anim(art, [{ transform: 'translate(0,0) rotate(0) scale(1)' }, { transform: 'translate(' + (-dir * 6) + '%,4%) rotate(' + (-dir * 7) + 'deg) scale(1.05)' }], { duration: 260, easing: EO, fill: 'forwards' })
    return p1.then(function () {
      // 2 launch: art breaks the frame toward the target, projectile flies, camera pans
      SND.whoosh(); pan(-dir * 18)
      var p2 = rm ? Promise.resolve() : anim(art, [{ transform: 'translate(' + (-dir * 6) + '%,4%) rotate(' + (-dir * 7) + 'deg) scale(1.05)' },
        { transform: 'translate(' + (dx * 0.35) + 'px,' + (dy * 0.35) + 'px) rotate(' + (dir * 8) + 'deg) scale(1.35)' }], { duration: 300, easing: EIO, fill: 'forwards' })
      var hit = new Promise(function (res) {
        if (W.VFX) VFX.domProjectile({ x: ca.x, y: ca.y }, { x: cb.x, y: cb.y }, { fx: T.proj, size: Math.max(70, ca.w * 0.55), duration: 340, onHit: res })
        else setTimeout(res, 340)
      })
      return Promise.all([p2, hit])
    }).then(function () {
      // 3 impact + hit-stop
      SND.thud()
      if (W.VFX) VFX.dom(cb.x, cb.y, { fx: T.hit, size: Math.max(120, cb.w * 1.1), blend: T.hit === 'smoke' ? null : 'screen' })
      b.classList.add('fx-hit')
      b.style.setProperty('--hitc', T.color)
      return wait(rm ? 0 : 90)                             // HIT-STOP
    }).then(function () {
      floatText(cb.x, cb.y - cb.h * 0.15, '−' + o.dmg, 'dmg' + (o.correct ? ' crit' : ''))
      if (o.correct) floatText(cb.x, cb.y + cb.h * 0.12, 'Jawaban benar +2!', 'bonus')
      var sh = Math.min(14, T.shake + o.dmg)
      return Promise.all([shake(b, sh), shake(o.stage, Math.round(sh / 3)),
        rm ? Promise.resolve() : anim(b, [{ filter: 'brightness(1)' }, { filter: 'brightness(2.2)' }, { filter: 'brightness(1)' }], { duration: 220 })])
    }).then(function () {
      // 4 drain: tick HP down
      return drain(o.hpBefore, o.hpAfter, o.setHp)
    }).then(function () {
      // 5 settle
      aura.stop(); pan(0)
      b.classList.remove('fx-hit'); a.classList.remove('fx-lift')
      if (!rm && art) return anim(art, [{ transform: getComputedStyle(art).transform === 'none' ? 'none' : getComputedStyle(art).transform }, { transform: 'translate(0,0) rotate(0) scale(1)' }], { duration: 220, easing: EO }).then(function () {
        try { art.getAnimations().forEach(function (x) { x.cancel() }) } catch (e) {}
      })
    })
  }
  function drain (from, to, setHp) {
    if (!setHp) return Promise.resolve()
    var steps = Math.max(1, from - to), per = Math.max(30, Math.min(90, 360 / steps)), v = from
    return new Promise(function (res) {
      if (reduced() || steps <= 1) { setHp(to); return res() }
      ;(function next () { v--; setHp(v); if (v <= to) return res(); setTimeout(next, per) })()
    })
  }
  function ko (el) {
    SND.ko()
    var c = center(el)
    if (W.VFX) { VFX.dom(c.x, c.y, { fx: 'boom', size: c.w * 1.6, blend: 'screen' }); setTimeout(function () { VFX.dom(c.x, c.y, { fx: 'smoke', size: c.w * 1.4 }) }, 180) }
    if (reduced()) return anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' })
    return anim(el, [{ transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 }, { transform: 'translate(0,-12%) rotate(-8deg) scale(1.05)', opacity: 1, offset: 0.25 },
      { transform: 'translate(0,40%) rotate(14deg) scale(.7)', opacity: 0 }], { duration: 650, easing: EIO, fill: 'forwards' })
  }
  // card flies from a point (hand / deck) to its place: the element is already in its
  // final spot, we animate a FLIP from where it came from.
  function flyIn (el, fromRect, o) {
    if (!el || !fromRect) return Promise.resolve()
    SND.card()
    if (reduced()) return anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 })
    var r = el.getBoundingClientRect()
    var dx = fromRect.left + fromRect.width / 2 - (r.left + r.width / 2), dy = fromRect.top + fromRect.height / 2 - (r.top + r.height / 2)
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

  W.GTFx = { TYPE_FX: TYPE_FX, SND: SND, mountScene: mountScene, setArena: setArena, pan: pan, attack: attack, ko: ko, flyIn: flyIn, floatText: floatText,
    shake: shake, pulse: pulse, anim: anim, wait: wait, reduced: reduced, center: center,
    mute: function (m) { muted = !!m; try { if (W.SFXEngine && SFXEngine.setMute) SFXEngine.setMute(muted) } catch (e) {} }, muted: function () { return muted } }
})()
