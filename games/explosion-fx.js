/* ============================================================================
 * explosion-fx.js — SHARED explosion / impact VFX engine  (window.ExplosionFX)
 * A-353. One engine, many games (M-303 shared-engine mandate — like SFXEngine
 * and QuizEngine). Plays short frame-sequence bursts on impact moments:
 *   • train "nabrak" an object            → variant 'smoke'
 *   • Pokémon yang kalah "meledak dulu"    → variant 'boom'  (before the swap)
 *   • ducky volley ball hit                → variant 'pop'
 *   • pokemon-run obstacle hit             → variant 'boom'
 *
 * Assets: assets/vfx/explosion/<variant>/f-1..N.webp  (CC0, Ansimuz).
 * Frames per variant are declared in MANIFEST below.
 *
 * Two render targets:
 *   ExplosionFX.pixi(container, x, y, {variant, scale, onDone})  — PIXI v8
 *   ExplosionFX.dom(x, y, {variant, size, onDone})               — DOM overlay
 *
 * Both are ADDITIVE + fully GUARDED: a missing PIXI / container / frame never
 * throws and never blocks the caller. Honours prefers-reduced-motion (one quick
 * flash instead of the full sequence). Pairs naturally with SFXEngine.crash().
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  if (W.ExplosionFX) return   // singleton — never double-install

  // frame counts per variant (must match what is on disk)
  var MANIFEST = { smoke: 8, boom: 10, pop: 7 }
  var DEFAULT_VARIANT = 'boom'

  // deployment-root aware base — same pattern as sfx-engine.js CUE_BASE
  var BASE = (function () {
    try {
      var b = (location.pathname.indexOf('/Dunia-Emosi/') === 0) ? '/Dunia-Emosi/' : '/'
      return b + 'assets/vfx/explosion/'
    } catch (e) { return '/assets/vfx/explosion/' }
  })()

  // pages under games/ load this as ../assets/... — resolve relative to THIS
  // script's own URL so the same file works from games/ AND from repo root.
  var REL_BASE = (function () {
    try {
      var cs = document.currentScript
      if (cs && cs.src) {
        // .../games/explosion-fx.js  →  .../assets/vfx/explosion/
        return cs.src.replace(/[^/]*$/, '') + '../assets/vfx/explosion/'
      }
    } catch (e) {}
    return BASE
  })()

  function reducedMotion () {
    try { return W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches }
    catch (e) { return false }
  }
  function norm (v) { return MANIFEST[v] ? v : DEFAULT_VARIANT }
  function frameUrls (variant) {
    var n = MANIFEST[variant] || 0, out = []
    for (var i = 1; i <= n; i++) out.push(REL_BASE + variant + '/f-' + i + '.webp')
    return out
  }

  // ---- PIXI texture cache (lazy, per-variant, shared across all calls) -------
  var _texCache = {}          // variant → [Texture,...]
  var _texPending = {}        // variant → Promise
  function loadTextures (variant) {
    if (_texCache[variant]) return Promise.resolve(_texCache[variant])
    if (_texPending[variant]) return _texPending[variant]
    if (!W.PIXI || !PIXI.Assets || !PIXI.Assets.load) return Promise.resolve(null)
    var urls = frameUrls(variant)
    var p = PIXI.Assets.load(urls).then(function (map) {
      // Assets.load(array) resolves a { url: Texture } record — keep frame order
      var texes = urls.map(function (u) { return map && map[u] }).filter(Boolean)
      if (!texes.length) return null
      _texCache[variant] = texes
      return texes
    }).catch(function () { return null })
    _texPending[variant] = p
    return p
  }

  /* ExplosionFX.pixi(container, x, y, opts)
   * opts: { variant='boom', scale=1, speed=1, onDone }
   * Adds a one-shot AnimatedSprite at (x,y) in local coords of `container`,
   * removes itself on completion. Returns nothing meaningful; never throws. */
  function pixi (container, x, y, opts) {
    opts = opts || {}
    if (!container || !W.PIXI) { if (opts.onDone) try { opts.onDone() } catch (e) {} ; return }
    var variant = norm(opts.variant)
    var scale = (typeof opts.scale === 'number' && opts.scale > 0) ? opts.scale : 1
    var done = function () { if (opts.onDone) try { opts.onDone() } catch (e) {} }

    // reduced-motion: a single soft flash instead of a burst sequence
    if (reducedMotion()) { _pixiFlash(container, x, y, scale, done); return }

    loadTextures(variant).then(function (texes) {
      if (!texes || !texes.length) { _pixiFlash(container, x, y, scale, done); return }
      var spr
      try { spr = new PIXI.AnimatedSprite(texes) }
      catch (e) { _pixiFlash(container, x, y, scale, done); return }
      try {
        spr.anchor.set(0.5)
        spr.x = x; spr.y = y
        spr.scale.set(scale)
        spr.loop = false
        // aim for a lively ~0.45s burst regardless of frame count
        var fps = Math.max(14, Math.min(30, texes.length / 0.45))
        spr.animationSpeed = (fps / 60) * (opts.speed || 1)
        spr.onComplete = function () {
          try { if (spr.parent) spr.parent.removeChild(spr) } catch (e) {}
          try { spr.destroy({ children: true }) } catch (e) {}
          done()
        }
        // safety net: destroy even if onComplete never fires (tab-hidden etc.)
        setTimeout(function () {
          try { if (spr && spr.parent) { spr.parent.removeChild(spr); spr.destroy() } } catch (e) {}
        }, 3000)
        container.addChild(spr)
        spr.gotoAndPlay(0)
      } catch (e) {
        try { if (spr && spr.parent) spr.parent.removeChild(spr) } catch (_) {}
        done()
      }
    })
  }

  // cheap 1-graphic radial flash — reduced-motion path + texture-load failure
  function _pixiFlash (container, x, y, scale, done) {
    try {
      if (!PIXI.Graphics) { done(); return }
      var g = new PIXI.Graphics()
      var r = 34 * (scale || 1)
      g.circle(0, 0, r).fill({ color: 0xffcf5a, alpha: 0.55 })
      g.circle(0, 0, r * 0.55).fill({ color: 0xffffff, alpha: 0.8 })
      g.x = x; g.y = y
      container.addChild(g)
      var t0 = (W.performance && performance.now) ? performance.now() : Date.now()
      var DUR = 260
      var tick = function () {
        var now = (W.performance && performance.now) ? performance.now() : Date.now()
        var k = (now - t0) / DUR
        if (k >= 1) {
          try { if (g.parent) g.parent.removeChild(g); g.destroy() } catch (e) {}
          done(); return
        }
        g.alpha = 1 - k; g.scale.set((scale || 1) * (1 + k * 0.6))
        try { requestAnimationFrame(tick) } catch (e) { setTimeout(tick, 16) }
      }
      requestAnimationFrame(tick)
    } catch (e) { done() }
  }

  /* ExplosionFX.dom(x, y, opts)  — viewport-fixed DOM burst for non-PIXI games.
   * opts: { variant='boom', size=96, onDone, parent=document.body }
   * x,y are viewport pixels (center). Auto-removes after the run. */
  function dom (x, y, opts) {
    opts = opts || {}
    var done = function () { if (opts.onDone) try { opts.onDone() } catch (e) {} }
    if (typeof document === 'undefined') { done(); return }
    var variant = norm(opts.variant)
    var size = opts.size || 96
    var parent = opts.parent || document.body
    if (!parent) { done(); return }

    var el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = 'position:fixed;left:' + (x - size / 2) + 'px;top:' + (y - size / 2) +
      'px;width:' + size + 'px;height:' + size + 'px;pointer-events:none;z-index:99999;' +
      'background-repeat:no-repeat;background-position:center;background-size:contain;'
    parent.appendChild(el)

    if (reducedMotion()) {
      // one soft flash
      el.style.background = 'radial-gradient(circle,rgba(255,207,90,.85) 0%,rgba(255,120,40,.5) 45%,transparent 70%)'
      el.style.transition = 'opacity .26s ease-out,transform .26s ease-out'
      el.style.opacity = '1'
      requestAnimationFrame(function () { el.style.opacity = '0'; el.style.transform = 'scale(1.5)' })
      setTimeout(function () { try { el.remove() } catch (e) {} done() }, 300)
      return
    }

    var urls = frameUrls(variant)
    if (!urls.length) { try { el.remove() } catch (e) {} done(); return }
    // preload so frames don't pop in, then cycle
    var loaded = 0, total = urls.length
    urls.forEach(function (u) { var im = new Image(); im.onload = im.onerror = function () { loaded++ }; im.src = u })
    var i = 0
    var perFrame = Math.max(30, Math.round(450 / total))   // ~0.45s total
    el.style.backgroundImage = 'url("' + urls[0] + '")'
    var step = function () {
      i++
      if (i >= total) { try { el.remove() } catch (e) {} done(); return }
      el.style.backgroundImage = 'url("' + urls[i] + '")'
      setTimeout(step, perFrame)
    }
    setTimeout(step, perFrame)
  }

  // let callers warm the cache ahead of a known impact (optional)
  function preload (variant) { return loadTextures(norm(variant)) }

  W.ExplosionFX = {
    pixi: pixi,
    dom: dom,
    preload: preload,
    variants: function () { var k = []; for (var v in MANIFEST) if (MANIFEST.hasOwnProperty(v)) k.push(v); return k },
    _manifest: MANIFEST
  }
})();
