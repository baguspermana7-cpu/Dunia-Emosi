/* ============================================================================
 * vfx-engine.js — UNIFIED shared VFX engine  (window.VFX)
 * ---------------------------------------------------------------------------
 * One shared engine + one frame database for EVERY animated effect in Dunia
 * Emosi (M-303 shared-engine mandate, like SFXEngine / QuizEngine). Absorbs the
 * A-353 explosion pack and adds the A-354 particle pack (auras + projectiles).
 *
 * Frame databases (transparent WebP sequences):
 *   assets/vfx/explosion/<fx>/f-1..N.webp   — CC0, Ansimuz
 *   assets/vfx/particles/<fx>/f-1..N.webp   — CC-BY 4.0, Raphael Hatencia
 *
 * Play modes:
 *   VFX.burst(container, x, y, {fx, scale, onDone})            — one-shot PIXI
 *   VFX.aura(container, target, {fx, duration, scale, follow}) — looping PIXI aura → stop()
 *   VFX.projectile(container, from, to, {fx, scale, onHit})    — travels then bursts (PIXI)
 *   VFX.dom(x, y, {fx, size, onDone})                          — one-shot DOM overlay
 *   VFX.domAura(el, {fx, duration, scale})                     — looping DOM aura → stop()
 *
 * VFX.TYPE_FX maps a Pokémon move-type → {aura, proj} effect names (A-355).
 *
 * Everything is ADDITIVE + GUARDED: missing PIXI / container / frame never
 * throws and never blocks the caller. Honours prefers-reduced-motion.
 *
 * Back-compat: window.ExplosionFX is aliased onto this engine so the A-353 call
 * sites (pixi()/dom()) keep working unchanged.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  if (W.VFX) return

  // ── frame registry: fx name → {dir, frames, kind} ─────────────────────────
  // frame counts must match what is on disk (see the two manifest.json files).
  var REGISTRY = {
    // explosion pack (A-353)
    'smoke':         { dir: 'explosion', frames: 8,  kind: 'burst' },
    'boom':          { dir: 'explosion', frames: 10, kind: 'burst' },
    'pop':           { dir: 'explosion', frames: 7,  kind: 'burst' },
    // particle pack (A-354)
    'fire-sparks':   { dir: 'particles', frames: 19, kind: 'aura' },
    'flamethrower':  { dir: 'particles', frames: 10, kind: 'projectile' },
    'rocket-fire':   { dir: 'particles', frames: 24, kind: 'projectile' },
    'electric-a':    { dir: 'particles', frames: 10, kind: 'projectile' },
    'electric-aura': { dir: 'particles', frames: 7,  kind: 'aura' },
    'spark1':        { dir: 'particles', frames: 24, kind: 'burst' },
    'sparks':        { dir: 'particles', frames: 8,  kind: 'burst' },
    'water-vortex':  { dir: 'particles', frames: 24, kind: 'aura' },
    'leaves':        { dir: 'particles', frames: 19, kind: 'projectile' },
    'sakuras':       { dir: 'particles', frames: 8,  kind: 'aura' },
    'poison-cloud':  { dir: 'particles', frames: 19, kind: 'aura' },
    'holy-light':    { dir: 'particles', frames: 7,  kind: 'aura' },
    'gravity':       { dir: 'particles', frames: 20, kind: 'aura' },
    'regen':         { dir: 'particles', frames: 8,  kind: 'aura' },
    'smoke-puff':    { dir: 'particles', frames: 19, kind: 'burst' },
    'smoke-cloud':   { dir: 'particles', frames: 24, kind: 'aura' }
  }

  // move-type → aura + projectile effect (A-355 Pokémon attacks)
  var TYPE_FX = {
    fire:     { aura: 'fire-sparks',   proj: 'flamethrower' },
    fighting: { aura: 'fire-sparks',   proj: 'rocket-fire' },
    electric: { aura: 'electric-aura', proj: 'electric-a' },
    water:    { aura: 'water-vortex',  proj: 'water-vortex' },
    ice:      { aura: 'water-vortex',  proj: 'sparks' },
    grass:    { aura: 'leaves',        proj: 'leaves' },
    bug:      { aura: 'leaves',        proj: 'leaves' },
    poison:   { aura: 'poison-cloud',  proj: 'poison-cloud' },
    psychic:  { aura: 'holy-light',    proj: 'holy-light' },
    fairy:    { aura: 'holy-light',    proj: 'sakuras' },
    ghost:    { aura: 'gravity',       proj: 'gravity' },
    dark:     { aura: 'gravity',       proj: 'gravity' },
    dragon:   { aura: 'gravity',       proj: 'rocket-fire' },
    ground:   { aura: 'smoke-cloud',   proj: 'sparks' },
    rock:     { aura: 'smoke-cloud',   proj: 'sparks' },
    steel:    { aura: 'electric-aura', proj: 'sparks' },
    flying:   { aura: 'holy-light',    proj: 'sparks' },
    normal:   { aura: 'sparks',        proj: 'sparks' }
  }
  var DEFAULT_FX = { aura: 'smoke-cloud', proj: 'sparks' }

  // ── base path: resolve relative to THIS script so it works from games/ and root
  var BASE = (function () {
    try {
      var cs = document.currentScript
      if (cs && cs.src) return cs.src.replace(/[^/]*$/, '') + '../assets/vfx/'
    } catch (e) {}
    try {
      var b = (location.pathname.indexOf('/Dunia-Emosi/') === 0) ? '/Dunia-Emosi/' : '/'
      return b + 'assets/vfx/'
    } catch (e2) { return '/assets/vfx/' }
  })()

  function reduced () {
    try { return W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches }
    catch (e) { return false }
  }
  function meta (fx) { return REGISTRY[fx] || null }
  function frameUrls (fx) {
    var m = meta(fx); if (!m) return []
    var out = []
    for (var i = 1; i <= m.frames; i++) out.push(BASE + m.dir + '/' + fx + '/f-' + i + '.webp')
    return out
  }
  function now () { return (W.performance && performance.now) ? performance.now() : Date.now() }
  function raf (fn) { try { return requestAnimationFrame(fn) } catch (e) { return setTimeout(fn, 16) } }

  // ── PIXI texture cache (lazy, per-fx, shared across all calls) ─────────────
  var _tex = {}, _pending = {}
  function loadTex (fx) {
    if (_tex[fx]) return Promise.resolve(_tex[fx])
    if (_pending[fx]) return _pending[fx]
    if (!W.PIXI || !PIXI.Assets || !PIXI.Assets.load) return Promise.resolve(null)
    var urls = frameUrls(fx)
    if (!urls.length) return Promise.resolve(null)
    var p = PIXI.Assets.load(urls).then(function (map) {
      var t = urls.map(function (u) { return map && map[u] }).filter(Boolean)
      if (!t.length) return null
      _tex[fx] = t; return t
    }).catch(function () { return null })
    _pending[fx] = p
    return p
  }

  // ── VFX.burst — one-shot AnimatedSprite ────────────────────────────────────
  function burst (container, x, y, opts) {
    opts = opts || {}
    var fx = meta(opts.fx) ? opts.fx : 'boom'
    var scale = (opts.scale > 0) ? opts.scale : 1
    var done = function () { if (opts.onDone) try { opts.onDone() } catch (e) {} }
    if (!container || !W.PIXI) { done(); return }
    if (reduced()) { _flash(container, x, y, scale, done); return }
    loadTex(fx).then(function (t) {
      if (!t || !t.length) { _flash(container, x, y, scale, done); return }
      var spr
      try { spr = new PIXI.AnimatedSprite(t) } catch (e) { _flash(container, x, y, scale, done); return }
      try {
        spr.anchor.set(0.5); spr.x = x; spr.y = y; spr.scale.set(scale); spr.loop = false
        var fps = Math.max(14, Math.min(30, t.length / 0.5))
        spr.animationSpeed = (fps / 60) * (opts.speed || 1)
        spr.onComplete = function () { _kill(spr); done() }
        setTimeout(function () { _kill(spr) }, 3500)
        container.addChild(spr); spr.gotoAndPlay(0)
      } catch (e) { _kill(spr); done() }
    })
  }

  // ── VFX.aura — looping aura hugging a target sprite for `duration` ms ───────
  // target: a PIXI DisplayObject (reads .x/.y) OR {x,y}. Returns { stop() }.
  function aura (container, target, opts) {
    opts = opts || {}
    var fx = meta(opts.fx) ? opts.fx : 'fire-sparks'
    var scale = (opts.scale > 0) ? opts.scale : 1
    var dur = opts.duration || 650
    var handle = { stop: function () {} }
    if (!container || !W.PIXI || !target) return handle
    if (reduced()) { _flash(container, target.x || 0, target.y || 0, scale * 1.2, null); return handle }
    var dead = false
    loadTex(fx).then(function (t) {
      if (dead || !t || !t.length) return
      var spr
      try { spr = new PIXI.AnimatedSprite(t) } catch (e) { return }
      try {
        spr.anchor.set(0.5); spr.scale.set(scale); spr.loop = true; spr.alpha = 0.92
        var fps = Math.max(12, Math.min(24, t.length / 0.6))
        spr.animationSpeed = fps / 60
        // place behind the target if possible (index just below it)
        var idx = container.getChildIndex ? -1 : -1
        try { idx = container.children.indexOf(target); } catch (e2) {}
        if (idx >= 0) container.addChildAt(spr, idx); else container.addChild(spr)
        spr.gotoAndPlay(0)
        var t0 = now()
        var follow = opts.follow !== false
        var tick = function () {
          if (dead || !spr.parent) return
          if (follow) { spr.x = target.x || spr.x; spr.y = target.y || spr.y }
          var k = (now() - t0) / dur
          if (k >= 1) { _kill(spr); return }
          if (k > 0.7) spr.alpha = 0.92 * (1 - (k - 0.7) / 0.3)  // fade out tail
          raf(tick)
        }
        spr.x = target.x || 0; spr.y = target.y || 0
        raf(tick)
        handle.stop = function () { dead = true; _kill(spr) }
      } catch (e) { _kill(spr) }
    })
    handle.stop = (function (orig) { return function () { dead = true; orig() } })(handle.stop)
    return handle
  }

  // ── VFX.projectile — a travelling particle attacker→defender, then a burst ─
  function projectile (container, from, to, opts) {
    opts = opts || {}
    var fx = meta(opts.fx) ? opts.fx : 'flamethrower'
    var scale = (opts.scale > 0) ? opts.scale : 1
    var dur = opts.duration || 340
    var onHit = function () { if (opts.onHit) try { opts.onHit() } catch (e) {} }
    if (!container || !W.PIXI || !from || !to) { onHit(); return }
    if (reduced()) { _flash(container, to.x, to.y, scale, onHit); return }
    loadTex(fx).then(function (t) {
      if (!t || !t.length) { _flash(container, to.x, to.y, scale, onHit); return }
      var spr
      try { spr = new PIXI.AnimatedSprite(t) } catch (e) { onHit(); return }
      try {
        spr.anchor.set(0.5); spr.scale.set(scale); spr.loop = true
        spr.animationSpeed = 0.5
        spr.x = from.x; spr.y = from.y
        var dx = to.x - from.x, dy = to.y - from.y
        spr.rotation = Math.atan2(dy, dx)
        container.addChild(spr); spr.gotoAndPlay(0)
        var t0 = now()
        var tick = function () {
          if (!spr.parent) return
          var k = (now() - t0) / dur
          if (k >= 1) {
            _kill(spr)
            burst(container, to.x, to.y, { fx: 'sparks', scale: scale * 0.9 })
            onHit(); return
          }
          spr.x = from.x + dx * k; spr.y = from.y + dy * k
          raf(tick)
        }
        raf(tick)
      } catch (e) { _kill(spr); onHit() }
    })
  }

  function _kill (spr) {
    try { if (spr && spr.parent) spr.parent.removeChild(spr) } catch (e) {}
    try { if (spr) spr.destroy({ children: true }) } catch (e) {}
  }

  // cheap PIXI flash — reduced-motion + texture-load failure fallback
  function _flash (container, x, y, scale, done) {
    try {
      if (!PIXI.Graphics) { if (done) done(); return }
      var g = new PIXI.Graphics(), r = 32 * (scale || 1)
      g.circle(0, 0, r).fill({ color: 0xffcf5a, alpha: 0.5 })
      g.circle(0, 0, r * 0.55).fill({ color: 0xffffff, alpha: 0.8 })
      g.x = x; g.y = y; container.addChild(g)
      var t0 = now()
      var tick = function () {
        var k = (now() - t0) / 260
        if (k >= 1) { _kill(g); if (done) done(); return }
        g.alpha = 1 - k; g.scale.set((scale || 1) * (1 + k * 0.6)); raf(tick)
      }
      raf(tick)
    } catch (e) { if (done) done() }
  }

  // ── DOM variants (BattleArena is a DOM scene) ─────────────────────────────
  function _domEl (fx, size, parent) {
    var el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = 'position:fixed;width:' + size + 'px;height:' + size +
      'px;pointer-events:none;z-index:99999;background-repeat:no-repeat;' +
      'background-position:center;background-size:contain;'
    parent.appendChild(el)
    return el
  }

  function dom (x, y, opts) {
    opts = opts || {}
    var done = function () { if (opts.onDone) try { opts.onDone() } catch (e) {} }
    if (typeof document === 'undefined') { done(); return }
    var fx = meta(opts.fx) ? opts.fx : 'boom'
    var size = opts.size || 96
    var parent = opts.parent || document.body
    if (!parent) { done(); return }
    var el = _domEl(fx, size, parent)
    el.style.left = (x - size / 2) + 'px'; el.style.top = (y - size / 2) + 'px'
    if (reduced()) {
      el.style.background = 'radial-gradient(circle,rgba(255,207,90,.85) 0%,rgba(255,120,40,.5) 45%,transparent 70%)'
      el.style.transition = 'opacity .26s ease-out,transform .26s ease-out'; el.style.opacity = '1'
      raf(function () { el.style.opacity = '0'; el.style.transform = 'scale(1.5)' })
      setTimeout(function () { try { el.remove() } catch (e) {} done() }, 300)
      return
    }
    var urls = frameUrls(fx)
    if (!urls.length) { try { el.remove() } catch (e) {} done(); return }
    urls.forEach(function (u) { var im = new Image(); im.src = u })
    var i = 0, total = urls.length, per = Math.max(28, Math.round(500 / total))
    el.style.backgroundImage = 'url("' + urls[0] + '")'
    var step = function () {
      i++
      if (i >= total) { try { el.remove() } catch (e) {} done(); return }
      el.style.backgroundImage = 'url("' + urls[i] + '")'; setTimeout(step, per)
    }
    setTimeout(step, per)
  }

  // looping DOM aura anchored on an element's center, for `duration` ms → stop()
  function domAura (targetEl, opts) {
    opts = opts || {}
    var handle = { stop: function () {} }
    if (typeof document === 'undefined' || !targetEl) return handle
    var fx = meta(opts.fx) ? opts.fx : 'fire-sparks'
    var dur = opts.duration || 650
    var mult = opts.scale || 1.3
    var parent = opts.parent || document.body
    var urls = frameUrls(fx)
    if (!urls.length || reduced()) {
      // reduced/absent → a brief glow pulse on the element
      try {
        var r = targetEl.getBoundingClientRect()
        dom(r.left + r.width / 2, r.top + r.height / 2, { fx: fx, size: Math.max(80, r.width * mult) })
      } catch (e) {}
      return handle
    }
    urls.forEach(function (u) { var im = new Image(); im.src = u })
    var rect0 = targetEl.getBoundingClientRect()
    var size = Math.max(90, rect0.width * mult)
    var el = _domEl(fx, size, parent)
    el.style.zIndex = '9207'          // under the fighter sprite (which is higher)
    var i = 0, total = urls.length, per = Math.max(40, Math.round(600 / total))
    var dead = false, t0 = now()
    var place = function () {
      try {
        var r = targetEl.getBoundingClientRect()
        el.style.left = (r.left + r.width / 2 - size / 2) + 'px'
        el.style.top = (r.top + r.height / 2 - size / 2) + 'px'
      } catch (e) {}
    }
    place()
    var tick = function () {
      if (dead) return
      el.style.backgroundImage = 'url("' + urls[i % total] + '")'
      i++
      place()
      var k = (now() - t0) / dur
      if (k >= 1) { try { el.remove() } catch (e) {} return }
      el.style.opacity = k > 0.7 ? String(1 - (k - 0.7) / 0.3) : '0.9'
      setTimeout(tick, per)
    }
    tick()
    handle.stop = function () { dead = true; try { el.remove() } catch (e) {} }
    return handle
  }

  // travelling DOM particle from→to (viewport px) then an impact burst — DOM twin
  // of VFX.projectile, for DOM-scene games (BattleArena). from/to = {x,y}.
  function domProjectile (from, to, opts) {
    opts = opts || {}
    var onHit = function () { if (opts.onHit) try { opts.onHit() } catch (e) {} }
    if (typeof document === 'undefined' || !from || !to) { onHit(); return }
    var fx = meta(opts.fx) ? opts.fx : 'flamethrower'
    var size = opts.size || 72
    var dur = opts.duration || 320
    var parent = opts.parent || document.body
    var urls = frameUrls(fx)
    if (!urls.length || reduced()) {
      dom(to.x, to.y, { fx: fx, size: size }); onHit(); return
    }
    urls.forEach(function (u) { var im = new Image(); im.src = u })
    var el = _domEl(fx, size, parent)
    var i = 0, total = urls.length, per = Math.max(28, Math.round(dur / total))
    var t0 = now(), dx = to.x - from.x, dy = to.y - from.y
    var ang = Math.atan2(dy, dx) * 180 / Math.PI
    var step = function () {
      var k = (now() - t0) / dur
      if (k >= 1) {
        try { el.remove() } catch (e) {}
        dom(to.x, to.y, { fx: 'sparks', size: size * 1.1 })
        onHit(); return
      }
      var x = from.x + dx * k, y = from.y + dy * k
      el.style.left = (x - size / 2) + 'px'; el.style.top = (y - size / 2) + 'px'
      el.style.transform = 'rotate(' + ang + 'deg)'
      el.style.backgroundImage = 'url("' + urls[i % total] + '")'; i++
      raf(step)
    }
    raf(step)
  }

  function preload (fx) { return loadTex(meta(fx) ? fx : 'boom') }
  function typeFx (type) { return TYPE_FX[(type || '').toLowerCase()] || DEFAULT_FX }

  W.VFX = {
    burst: burst,
    aura: aura,
    projectile: projectile,
    dom: dom,
    domAura: domAura,
    domProjectile: domProjectile,
    preload: preload,
    typeFx: typeFx,
    TYPE_FX: TYPE_FX,
    effects: function () { var k = []; for (var f in REGISTRY) if (REGISTRY.hasOwnProperty(f)) k.push(f); return k },
    _registry: REGISTRY
  }

  // ── back-compat: A-353 window.ExplosionFX (pixi/dom) delegates to VFX ──────
  if (!W.ExplosionFX) {
    W.ExplosionFX = {
      pixi: function (container, x, y, o) { o = o || {}; burst(container, x, y, { fx: o.variant, scale: o.scale, speed: o.speed, onDone: o.onDone }) },
      dom: function (x, y, o) { o = o || {}; dom(x, y, { fx: o.variant, size: o.size, onDone: o.onDone, parent: o.parent }) },
      preload: function (v) { return preload(v) },
      variants: function () { return ['smoke', 'boom', 'pop'] }
    }
  }
})();
