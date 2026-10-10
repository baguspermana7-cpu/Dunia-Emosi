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
 *   VFX.play / VFX.projectile(id,from,to) / VFX.pick           — DB spritesheet library (see DB-DRIVEN block)
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

  // ── DOM frame warm-cache ──────────────────────────────────────────────────
  // The DOM variants used to do `urls.forEach(u => { var im = new Image(); im.src = u })`
  // on EVERY call. In a battle game that is ~47 throwaway Image objects per hit
  // (and ~14k over a session) — pure GC churn on a low-end tablet, since the
  // bytes are already in the HTTP cache after the first warm. Keep one Image per
  // URL alive instead, so each frame is fetched + decoded exactly once.
  var _warmed = {}
  function warmFrames (urls) {
    for (var i = 0; i < urls.length; i++) {
      var u = urls[i]
      if (_warmed[u]) continue
      var im = new Image()
      im.decoding = 'async'
      im.src = u
      _warmed[u] = im      // retained on purpose: bounded by REGISTRY frame count
    }
  }

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
        if (opts.additive) { try { spr.blendMode = 'add' } catch (e) {} }   // A-355b glow
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
    if (opts.blend) el.style.mixBlendMode = opts.blend   // A-355b caller-opt-in glow
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
    warmFrames(urls)
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
    warmFrames(urls)
    var rect0 = targetEl.getBoundingClientRect()
    var size = Math.max(90, rect0.width * mult)
    var el = _domEl(fx, size, parent)
    el.style.zIndex = '9207'
    // A-355b — glow onto the body (screen drops the dark/smoky pixels so the fire
    // wraps the Pokémon instead of occluding it) + a subtle drop-shadow halo.
    el.style.mixBlendMode = (opts.blend || 'screen')
    el.style.filter = 'drop-shadow(0 0 6px rgba(255,150,40,.6))'
    el.style.transformOrigin = '50% 50%'
    var spin = (opts.spin === false) ? 0 : 360 / (opts.spinMs || 1100)  // deg per ms — "api berputar"
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
      var t = now() - t0, k = t / dur
      if (k >= 1) { try { el.remove() } catch (e) {} return }
      // rotate the whole aura so the flames visibly swirl around the body
      var rot = spin * t
      var pulse = 1 + Math.sin(t / 90) * 0.05      // gentle breathing
      el.style.transform = 'rotate(' + rot + 'deg) scale(' + pulse + ')'
      el.style.opacity = k < 0.15 ? String(k / 0.15) : (k > 0.75 ? String(1 - (k - 0.75) / 0.25) : '1')
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
    warmFrames(urls)
    var el = _domEl(fx, size, parent)
    // A-355b — thrown fire glows (screen) instead of a flat sticker
    el.style.mixBlendMode = (opts.blend || 'screen')
    el.style.filter = 'drop-shadow(0 0 5px rgba(255,140,40,.55))'
    var i = 0, total = urls.length, per = Math.max(28, Math.round(dur / total))
    var t0 = now(), dx = to.x - from.x, dy = to.y - from.y
    var ang = Math.atan2(dy, dx) * 180 / Math.PI
    var landed = false
    var land = function (withBurst) {
      if (landed) return
      landed = true
      try { clearTimeout(bail) } catch (e) {}
      try { el.remove() } catch (e) {}
      if (withBurst) dom(to.x, to.y, { fx: 'sparks', size: size * 1.2, blend: 'screen' })
      onHit()
    }
    // SAFETY NET (mirrors burst()'s _kill timeout). This is the only VFX path
    // driven by rAF, which does NOT tick while the tab is hidden — locking the
    // tablet mid-throw would otherwise strand this fixed-position node on screen
    // and never fire onHit. setTimeout still runs (clamped) when hidden.
    var bail = setTimeout(function () { land(true) }, Math.max(1200, dur * 4))
    var lastFrame = -1
    var step = function () {
      if (landed) return
      var t = now() - t0, k = t / dur
      if (k >= 1) { land(true); return }
      var x = from.x + dx * k, y = from.y + dy * k
      el.style.left = (x - size / 2) + 'px'; el.style.top = (y - size / 2) + 'px'
      el.style.transform = 'rotate(' + ang + 'deg)'
      // advance the sprite on its own ~`per` ms cadence instead of swapping the
      // backgroundImage on EVERY rAF (`per` was computed and then ignored — a
      // 60 Hz repaint storm on a layer that also carries blend + drop-shadow).
      var f = Math.floor(t / per) % total
      if (f !== lastFrame) { lastFrame = f; el.style.backgroundImage = 'url("' + urls[f] + '")' }
      i++
      raf(step)
    }
    raf(step)
  }


  // ════════════════════════════════════════════════════════════════════════
  // DB-DRIVEN SPRITE EFFECTS  (assets/vfx/vfx-db.json  /  games/data/vfx-db.js)
  //   VFX.play(idOrQuery, {x,y,parent,size,scale,blend,rotate,filter,duration,loop,follow,onDone})
  //   VFX.projectile(idOrQuery, from, to, {trail,impact,size,duration,arc,onHit,...})
  //   VFX.pick({tags|any, kind, kid_safe, seed})   VFX.db()   VFX.sets(type)
  // One shared rAF ticker drives every live sprite (frame = background-position),
  // nodes are pooled, concurrency is capped, reduced-motion = a single frame fade.
  // The legacy VFX.projectile(container, from, to, opts) form still works.
  // ════════════════════════════════════════════════════════════════════════
  var DB = null, DBIDX = {}, DB_WAIT = null, MAX_LIVE = 16, SOFT_CAP = 12, POOL_MAX = 24   // essential (head/impact) up to MAX_LIVE, garnish (trail/stars/aura) only below SOFT_CAP
  var _live = [], _pool = [], _ticking = false, _trailLive = 0, TRAIL_MAX = 5   // trails are capped globally, not per projectile
  var ASSET_BASE = BASE   // …/assets/vfx/

  function dbReady () {
    if (DB) return DB
    var d = W.VFXDB
    if (d && d.effects) {
      DB = d
      for (var i = 0; i < d.effects.length; i++) DBIDX[d.effects[i].id] = d.effects[i]
    }
    return DB
  }
  function dbLoad (cb) {
    if (dbReady()) { cb(DB); return }
    var flush = function (v) { var q = DB_WAIT; DB_WAIT = null; for (var i = 0; q && i < q.length; i++) q[i](v) }
    if (!DB_WAIT) {
      DB_WAIT = []
      try {
        fetch(BASE + 'vfx-db.json').then(function (r) { return r.json() }).then(function (j) {
          W.VFXDB = j; dbReady(); flush(DB)
        }).catch(function () { flush(null) })
      } catch (e) { flush(null); DB_WAIT = [] ; DB_WAIT = null }
    }
    if (DB_WAIT) DB_WAIT.push(cb); else cb(null)
  }
  function sheetUrl (e) { return ASSET_BASE + e.id + '.webp' }

  var KID_BAD = /blood|gore|skull|weapon|slash|muzzle|scorch|explosion|dynamite|spike|knife|gun/
  function pick (q, rnd) {
    if (!dbReady()) return null
    q = q || {}
    var tags = q.tags ? (typeof q.tags === 'string' ? [q.tags] : q.tags) : []
    var any = q.any || []
    var kid = q.kid_safe !== false
    var best = [], bs = -1
    for (var i = 0; i < DB.effects.length; i++) {
      var e = DB.effects[i]
      if (kid && (!e.kid_safe || KID_BAD.test(e.tags.join(' ')))) continue
      if (q.kind && e.kind !== q.kind) continue
      if (q.exclude && q.exclude.indexOf(e.id) >= 0) continue
      var ok = true, sc = 0
      for (var a = 0; a < tags.length; a++) { if (e.tags.indexOf(tags[a]) < 0) { ok = false; break } sc += 2 }
      if (!ok) continue
      if (any.length) { var hit = 0; for (var b = 0; b < any.length; b++) if (e.tags.indexOf(any[b]) >= 0) hit++; if (!hit) continue; sc += hit }
      if (sc > bs) { bs = sc; best = [e] } else if (sc === bs) best.push(e)
    }
    if (!best.length) return null
    var r = (typeof q.seed === 'number') ? (((Math.sin(q.seed * 12.9898) * 43758.5453) % 1) + 1) % 1 : (rnd || Math.random)()
    return best[Math.floor(r * best.length) % best.length]
  }
  function resolve (idOrQ) {
    if (!dbReady() || !idOrQ) return null
    if (typeof idOrQ === 'string') return DBIDX[idOrQ] || pick({ tags: [idOrQ] })
    return (idOrQ.id && DBIDX[idOrQ.id]) ? DBIDX[idOrQ.id] : pick(idOrQ)
  }

  var _imgs = {}
  function warmSheet (e) {
    var u = sheetUrl(e)
    if (_imgs[u]) return
    var im = new Image(); im.decoding = 'async'; im.src = u; _imgs[u] = im
    try { if (im.decode) im.decode().catch(function () {}) } catch (e) {}   // decode off the main thread before the first paint
  }


  // ── tint baking ───────────────────────────────────────────────────────────
  // A CSS filter (hue-rotate/sepia) on a large animated, blended node is re-run by the
  // compositor EVERY frame — the single biggest cost of a busy attack on a low-end tablet.
  // So each (sheet, filter) pair is drawn ONCE into an offscreen canvas and the result is used
  // as a plain background image. Falls back to the live CSS filter until the bake is ready
  // (or where canvas filters are unsupported, e.g. Safari).
  var _baked = {}, _bakeQ = [], _baking = false
  var CAN_BAKE = (function () {
    try { return typeof document !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype && !!W.URL && !!W.URL.createObjectURL } catch (e) { return false }
  })()
  function bakedUrl (e, filter) { var b = _baked[e.id + '|' + filter]; return (b && b.url) || null }
  function bake (idOrE, filter) {
    if (!CAN_BAKE || !filter || !dbReady()) return
    var e = (typeof idOrE === 'string') ? DBIDX[idOrE] : idOrE; if (!e) return
    var key = e.id + '|' + filter
    if (_baked[key]) return
    _baked[key] = { url: null }
    _bakeQ.push({ e: e, filter: filter, key: key })
    if (!_baking) { _baking = true; setTimeout(_bakeNext, 0) }
  }
  function _bakeNext () {
    var j = _bakeQ.shift()
    if (!j) { _baking = false; return }
    var next = function () { setTimeout(_bakeNext, 16) }
    try {
      var im = new Image(); im.decoding = 'async'
      im.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight
          var g = c.getContext('2d'); g.filter = j.filter; g.drawImage(im, 0, 0)
          c.toBlob(function (blob) {
            try {
              if (blob) {
                var u = W.URL.createObjectURL(blob), pre = new Image(); pre.src = u; _imgs[u] = pre
                try { if (pre.decode) pre.decode().catch(function () {}) } catch (e2) {}
                _baked[j.key].url = u
              }
            } catch (e3) {}
            next()
          }, 'image/webp', 0.92)
        } catch (e4) { next() }
      }
      im.onerror = next
      im.src = sheetUrl(j.e)
    } catch (e5) { next() }
  }

  function takeNode () {
    var n = _pool.pop()
    if (!n) { n = document.createElement('div'); n.setAttribute('aria-hidden', 'true') }
    return n
  }
  function freeNode (n) {
    try { if (n.parentNode) n.parentNode.removeChild(n) } catch (e) {}
    n.style.cssText = ''
    if (_pool.length < POOL_MAX) _pool.push(n)
  }

  function _finish (fx, natural) {
    if (fx.dead) return
    fx.dead = true
    try { clearTimeout(fx.bail) } catch (e) {}
    var i = _live.indexOf(fx); if (i >= 0) _live.splice(i, 1)
    freeNode(fx.el)
    if (fx.onDone) { try { fx.onDone(natural !== false) } catch (e2) {} }
  }

  // positions are applied with transform (compositor-friendly, no layout); follow targets are READ first, then all writes
  function _readFollow (fx) {
    if (!fx.follow) return
    try {
      var r = fx.follow.getBoundingClientRect()
      fx.x = r.left + r.width / 2 + (fx.ox || 0); fx.y = r.top + r.height / 2 + (fx.oy || 0)
    } catch (e) {}
  }
  function eoCubic (t) { t = t < 0 ? 0 : (t > 1 ? 1 : t); return 1 - Math.pow(1 - t, 3) }
  var SHEET_FPS = 30   // 30 fps holds each frame for exactly 2 vsyncs on a 60 Hz screen: no judder

  // sheet frame index for a given age: even sub-sampling of the authored frames onto a vsync-aligned step clock
  function _frameAt (fx, age, k) {
    var e = fx.e, n = e.frames
    if (n <= 1) return 0
    if (fx.loop) {
      var cyc = Math.max(2, Math.round(e.dur * SHEET_FPS / 1000))
      return Math.floor((Math.floor(age * SHEET_FPS / 1000) % cyc) * n / cyc)
    }
    var steps = Math.max(2, Math.round(fx.life * SHEET_FPS / 1000))
    var st = Math.min(steps - 1, Math.floor(k * steps))
    return Math.min(n - 1, Math.floor(st * n / steps))
  }

  function _tickAll () {
    _ticking = false
    var t = now(), i, fx
    for (i = 0; i < _live.length; i++) _readFollow(_live[i])      // phase 1: reads
    for (i = _live.length - 1; i >= 0; i--) {                      // phase 2: writes
      fx = _live[i]
      if (fx.dead) continue
      var age = t - fx.t0
      var k = fx.life > 0 ? age / fx.life : 0
      if (fx.life > 0 && k >= 1) { _finish(fx, true); continue }
      var f = fx.reduced ? fx.rf : _frameAt(fx, age, k)
      var st = fx.el.style
      if (f !== fx.f) {
        fx.f = f
        st.backgroundPosition = (-(f % fx.e.cols) * fx.dw) + 'px ' + (-Math.floor(f / fx.e.cols) * fx.dh) + 'px'
      }
      var a = fx.alpha
      if (fx.reduced) a *= (k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75)
      else { if (k < 0.08) a *= k / 0.08; else if (k > 0.72) a *= Math.max(0, 1 - (k - 0.72) / 0.28) }
      st.opacity = a.toFixed(3)
      var sc = 1, rot = 0
      if (!fx.reduced) {
        sc = fx.pop ? (fx.pop[0] + (fx.pop[1] - fx.pop[0]) * eoCubic(k * 2.2)) : 1   // strong ease-out scale-up
        rot = fx.rotate + (fx.spin ? fx.spin * age / 1000 : 0)
      }
      st.translate = (fx.x - fx.dw / 2).toFixed(1) + 'px ' + (fx.y - fx.dh / 2).toFixed(1) + 'px'   // position: individual property, never a transform animation
      if (!fx.reduced && (rot || sc !== 1)) st.transform = 'rotate(' + rot.toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')'
    }
    if (_live.length) { _ticking = true; raf(_tickAll) }
  }
  function _kick () { if (!_ticking) { _ticking = true; raf(_tickAll) } }

  // play one effect. Returns a handle {stop(), move(x,y,rot), el}
  function play (idOrQ, opts) {
    opts = opts || {}
    var handle = { stop: function () { handle._stop = true }, move: function () {}, el: null }
    var done = function () { if (opts.onDone) try { opts.onDone(false) } catch (e) {} }
    if (typeof document === 'undefined') { done(); return handle }
    if (!dbReady()) {
      dbLoad(function (d) {
        if (!d || handle._stop) { done(); return }
        var h2 = play(idOrQ, opts); handle.stop = h2.stop; handle.move = h2.move; handle.el = h2.el
      })
      return handle
    }
    var e = resolve(idOrQ)
    if (!e) { done(); return handle }
    var parent = opts.parent || document.body
    if (!parent) { done(); return handle }
    if (_live.length >= (opts.essential ? MAX_LIVE : SOFT_CAP)) {
      if (!opts.essential) { done(); return handle }
      for (var i = 0; i < _live.length; i++) if (!_live[i].essential) { _finish(_live[i], false); break }
      if (_live.length >= MAX_LIVE) { done(); return handle }
    }
    var red = reduced()
    var size = opts.size || Math.round(e.fw * (opts.scale || 1))
    // opts.vis = `size` is the VISIBLE extent: the art fills only e.fill of its frame, so scale the frame up to compensate
    if (opts.vis && e.fill) size = Math.round(Math.min(size * 3.2, size / e.fill))
    var dw = size, dh = Math.round(size * e.fh / e.fw)
    var el = takeNode()
    var loop = !!(opts.loop != null ? opts.loop : e.loop)
    var life = opts.duration || (loop ? 700 : e.dur)
    if (red) { loop = false; life = Math.min(life, 320) }
    var blend = opts.blend || e.blend
    var imgUrl = sheetUrl(e), cssFilter = opts.filter || ''
    if (cssFilter) { var bk = bakedUrl(e, cssFilter); if (bk) { imgUrl = bk; cssFilter = '' } else bake(e, cssFilter) }
    el.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:' + (opts.z || 99990) +
      ';width:' + dw + 'px;height:' + dh + 'px;background-image:url("' + imgUrl + '");background-repeat:no-repeat;' +
      'background-size:' + (e.cols * dw) + 'px ' + (e.rows * dh) + 'px;background-position:0 0;opacity:0;' +
      'will-change:opacity,transform,translate;transform-origin:50% 50%;backface-visibility:hidden;' +
      (blend && blend !== 'normal' ? 'mix-blend-mode:' + blend + ';' : '') +
      (cssFilter ? 'filter:' + cssFilter + ';' : '')
    warmSheet(e)
    el.setAttribute('data-vfx', e.id); el.setAttribute('data-vfx-tint', opts.filter || '')
    var fx = {
      e: e, el: el, dw: dw, dh: dh, x: opts.x || 0, y: opts.y || 0, follow: opts.follow || null, ox: opts.ox, oy: opts.oy,
      t0: now(), life: life, loop: loop, f: -1, rf: Math.max(0, Math.floor(e.frames * 0.4)), reduced: red,
      alpha: opts.alpha != null ? opts.alpha : 1, rotate: red ? 0 : (opts.rotate || 0), spin: red ? 0 : (opts.spin || 0),
      pop: red ? null : (opts.pop || (e.kind === 'texture' ? [0.55, 1.25] : null)), onDone: opts.onDone, essential: !!opts.essential, dead: false
    }
    parent.appendChild(el)
    _readFollow(fx)
    el.style.translate = (fx.x - dw / 2).toFixed(1) + 'px ' + (fx.y - dh / 2).toFixed(1) + 'px'
    _live.push(fx)
    fx.bail = setTimeout(function () { _finish(fx, true) }, life + 400)
    handle.el = el
    handle.stop = function () { _finish(fx, false) }
    handle.move = function (x, y, rot) { fx.x = x; fx.y = y; if (rot != null) fx.rotate = rot }
    _kick()
    return handle
  }

  // VFX.projectile(idOrQuery, from, to, opts) — DB sprite head flies from→to,
  // optional trail puffs, impact sprite on landing. onHit fires at `duration`.
  function projectileDb (idOrQ, from, to, opts) {
    opts = opts || {}
    var hit = false
    var onHit = function () { if (hit) return; hit = true; if (opts.onHit) try { opts.onHit() } catch (e) {} }
    var handle = { cancel: function () { handle._c = true } }
    if (typeof document === 'undefined' || !from || !to) { onHit(); return handle }
    var dur = opts.duration || 320
    var size = opts.size || 72
    var dx = to.x - from.x, dy = to.y - from.y
    var ang = Math.atan2(dy, dx) * 180 / Math.PI
    function landing () {
      if (opts.onEnd) { try { opts.onEnd(to) } catch (e) {} }
      if (opts.impact && !handle._c) {
        play(opts.impact, { x: to.x, y: to.y, size: (opts.impactSize || size * 1.4), vis: opts.vis, duration: opts.impactMs, filter: opts.impactFilter, blend: opts.impactBlend,
          essential: true, z: 99992 })
      }
      if (opts.extra) { try { opts.extra(to) } catch (e) {} }
      onHit()
    }
    if (reduced()) {   // no travel: soft fade at the target, onHit still on schedule
      setTimeout(landing, dur)
      return handle
    }
    var head = play(idOrQ, { x: from.x, y: from.y, size: size, vis: opts.vis, loop: true, duration: dur + 60, rotate: opts.align === false ? 0 : ang,
      spin: opts.spin, filter: opts.filter, blend: opts.blend, essential: true, z: 99991, pop: opts.headPop || [0.8, 1.1] })
    var t0 = now(), lastTrail = 0, landed = false
    var every = opts.trailEvery || 48
    var bail
    function land () {
      if (landed) return
      landed = true
      try { clearTimeout(bail) } catch (e) {}
      head.stop()
      landing()
    }
    bail = setTimeout(land, Math.max(dur + 160, 600))   // rAF stalls in a hidden tab
    function step () {
      if (landed) return
      if (handle._c) { landed = true; try { clearTimeout(bail) } catch (e) {} ; head.stop(); if (opts.onEnd) { try { opts.onEnd(to) } catch (e) {} } onHit(); return }
      var t = now() - t0, k = t / dur
      if (k >= 1) { land(); return }
      var ke = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2          // ease-in-out: lands exactly at k = 1
      ke = ke * 0.65 + k * 0.35                                             // keep it brisk (mostly eased, a little linear)
      var x = from.x + dx * ke, y = from.y + dy * ke
      var arcH = (opts.arc != null ? opts.arc : Math.min(46, Math.sqrt(dx * dx + dy * dy) * 0.12))
      y -= Math.sin(Math.PI * ke) * arcH
      if (opts.wave) y += Math.sin(k * Math.PI * 4) * opts.wave
      head.move(x, y)
      if (opts.onStep) { try { opts.onStep(x, y, k, ang, t) } catch (e) {} }
      if (opts.trail && t - lastTrail > every && _trailLive < TRAIL_MAX) {
        lastTrail = t; _trailLive++
        play(opts.trail, { x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 8, size: size * (opts.trailScale || 0.55), vis: opts.vis,
          duration: 300, filter: opts.trailFilter, blend: opts.trailBlend, rotate: Math.random() * 360, alpha: 0.85,
          onDone: function () { _trailLive-- } })
      }
      raf(step)
    }
    raf(step)
    return handle
  }

  var _legacyProjectile = projectile
  function projectileAny (a, b, c, d) {
    if (typeof a === 'string' || (a && typeof a === 'object' && !a.addChild && (a.id || a.tags || a.any))) return projectileDb(a, b, c, d)
    return _legacyProjectile(a, b, c, d)
  }
  function sets (type) {
    if (!dbReady() || !DB.sets) return null
    return DB.sets[(type || '').toLowerCase()] || DB.sets.normal || null
  }
  function playPreload (ids) {
    if (!dbReady()) { dbLoad(function () { if (DB) playPreload(ids) }); return }
    for (var i = 0; i < ids.length; i++) { var e = DBIDX[ids[i]]; if (e) warmSheet(e) }
  }
  function liveCount () { return _live.length }
  function clearAll () { while (_live.length) _finish(_live[0], false) }

  function preload (fx) {
    if (Array.isArray(fx)) { playPreload(fx); return Promise.resolve(null) }
    if (typeof fx === 'string' && !meta(fx) && (W.VFXDB || DBIDX[fx])) { playPreload([fx]); return Promise.resolve(null) }
    return loadTex(meta(fx) ? fx : 'boom')
  }

  function typeFx (type) { return TYPE_FX[(type || '').toLowerCase()] || DEFAULT_FX }

  W.VFX = {
    burst: burst,
    aura: aura,
    projectile: projectileAny,
    play: play,
    pick: pick,
    sets: sets,
    db: function () { return dbReady() },
    liveCount: liveCount,
    clearAll: clearAll,
    MAX_LIVE: MAX_LIVE,
    _setCap: function (n) { MAX_LIVE = n; SOFT_CAP = n },   // test seam (qa-vfx-db fault run)
    cap: function () { return MAX_LIVE },
    bake: bake,
    bakedCount: function () { var n = 0; for (var k in _baked) if (_baked[k].url) n++; return n },
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
