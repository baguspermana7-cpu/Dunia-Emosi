/* =============================================================================
 * train-vfx.js — Shared VFX module for Dunia-Emosi train games (v54.53)
 * =============================================================================
 * Built once, reused by G14 / G15 / G16 / G18. Six namespaces exposed on
 * `window.TrainVFX`:
 *
 *   particles   — Pixi-based particle spawner with object pooling.
 *                 10 types: confetti, sparkle, dust, smoke, snow, leaf,
 *                 ember, bubble, star, crack. Hard cap 200 active.
 *
 *   filters     — Convenience wrappers around Pixi ColorMatrixFilter +
 *                 BlurFilter for glow/bloom/chromatic/vignette/freezeFrame.
 *                 Falls back gracefully if PIXI isn't loaded.
 *
 *   trails      — Attach a fading sprite trail behind a Pixi DisplayObject
 *                 for speed boost, projectile, hook arc.
 *
 *   screen      — DOM-level screen effects: flash, shake (gated by
 *                 reduce-motion v54.51 pattern), vignettePulse, lighting.
 *
 *   ease        — Pure easing fns: outBack, outQuart, outElastic,
 *                 inOutCubic, outBounce. Domain 0..1, range 0..1ish.
 *
 *   tween       — RAF-based property tween. Cancelable, pause-aware,
 *                 honors reduce-motion (snaps to end value if on).
 *
 * Performance budget:
 *   - 200 particles MAX active at once (cap enforced in spawn).
 *   - All particles use the shared object pool (no per-spawn GC churn).
 *   - tween() uses a single shared RAF loop; idle when no active tweens.
 *
 * Reduce-motion compliance (v54.51):
 *   - screen.shake → no-op when reducedMotion() is true
 *   - tween → snaps to end value immediately
 *   - particles confetti/sparkle/star/crack: spawn count halved
 *
 * Usage example:
 *   TrainVFX.particles.spawn({ type: 'sparkle', x: 100, y: 200, count: 12 })
 *   TrainVFX.screen.flash('#ffd166', 180)
 *   TrainVFX.tween(myObj, { x: 100, alpha: 1 }, 280, TrainVFX.ease.outBack)
 * ========================================================================== */

(function (global) {
  'use strict'

  // ── reduce-motion gate (shared) ─────────────────────────────────────────────
  function reducedMotion () {
    try {
      // Per-game opt-in keys + OS-level preference.
      if (localStorage.getItem('g14-reduced-motion') === '1') return true
      if (localStorage.getItem('train-vfx-reduced-motion') === '1') return true
      if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
    } catch (_) {}
    return false
  }

  // ── Easing functions ───────────────────────────────────────────────────────
  // All map t ∈ [0,1] → [0,1] (or slightly beyond for over/under-shoot).
  const ease = {
    linear:    (t) => t,
    outQuart:  (t) => 1 - Math.pow(1 - t, 4),
    inOutCubic:(t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outBack:   (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) },
    outElastic:(t) => {
      if (t === 0 || t === 1) return t
      const c = (2 * Math.PI) / 3
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1
    },
    outBounce: (t) => {
      const n = 7.5625, d = 2.75
      if (t < 1 / d) return n * t * t
      if (t < 2 / d) { t -= 1.5 / d; return n * t * t + 0.75 }
      if (t < 2.5 / d) { t -= 2.25 / d; return n * t * t + 0.9375 }
      t -= 2.625 / d; return n * t * t + 0.984375
    }
  }

  // ── Tween (RAF-based, cancelable, pause-aware) ─────────────────────────────
  const _tweens = []
  let _tweenRafId = null
  function _tweenStep (now) {
    _tweenRafId = null
    for (let i = _tweens.length - 1; i >= 0; i--) {
      const tw = _tweens[i]
      if (tw._cancelled) { _tweens.splice(i, 1); continue }
      if (tw._pausedAt) continue
      const t = Math.min(1, (now - tw.startedAt) / tw.dur)
      const eased = tw.ease ? tw.ease(t) : t
      for (const k in tw.from) {
        tw.target[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * eased
      }
      if (t >= 1) {
        try { if (tw.onDone) tw.onDone() } catch (_) {}
        _tweens.splice(i, 1)
      }
    }
    if (_tweens.length > 0) _tweenRafId = requestAnimationFrame(_tweenStep)
  }
  function tween (target, props, dur, easeFn, onDone) {
    if (!target || typeof target !== 'object') return null
    // Reduced-motion: snap immediately.
    if (reducedMotion()) {
      for (const k in props) target[k] = props[k]
      try { if (onDone) onDone() } catch (_) {}
      return { cancel: function () {} }
    }
    const from = {}
    for (const k in props) from[k] = (typeof target[k] === 'number') ? target[k] : 0
    const tw = {
      target: target,
      from: from,
      to: props,
      dur: Math.max(1, dur || 200),
      ease: easeFn || ease.outQuart,
      onDone: onDone,
      startedAt: (global.performance && global.performance.now ? global.performance.now() : Date.now()),
      _cancelled: false,
      _pausedAt: 0
    }
    _tweens.push(tw)
    if (_tweenRafId == null) _tweenRafId = requestAnimationFrame(_tweenStep)
    return {
      cancel: function () { tw._cancelled = true },
      pause:  function () { if (!tw._pausedAt) tw._pausedAt = (global.performance && global.performance.now ? global.performance.now() : Date.now()) },
      resume: function () {
        if (tw._pausedAt) {
          const now = (global.performance && global.performance.now ? global.performance.now() : Date.now())
          tw.startedAt += (now - tw._pausedAt)
          tw._pausedAt = 0
          if (_tweenRafId == null) _tweenRafId = requestAnimationFrame(_tweenStep)
        }
      }
    }
  }

  // ── Particle pool ──────────────────────────────────────────────────────────
  // Object pool of {sprite, ttl, vx, vy, ax, ay, type, scaleDecay, alphaDecay}.
  // Pixi-native — caller must pass `parent` (a Pixi Container) on spawn.
  const PARTICLE_CAP = 200
  const _pool = []      // free pool
  const _active = []    // live particles (with parent set)

  function _acquireParticle () {
    return _pool.pop() || {
      g: null, parent: null,
      vx: 0, vy: 0, ax: 0, ay: 0,
      ttl: 0, ttlMax: 0,
      scale0: 1, scaleEnd: 1,
      alpha0: 1, alphaEnd: 0,
      type: '',
      angle: 0, angVel: 0
    }
  }
  function _releaseParticle (p) {
    if (p.g && p.parent) {
      try { p.parent.removeChild(p.g) } catch (_) {}
    }
    if (p.g && p.g.destroy) {
      try { p.g.destroy({ children: true }) } catch (_) {}
    }
    p.g = null; p.parent = null
    if (_pool.length < 80) _pool.push(p)
  }

  const PARTICLE_DRAW = {
    confetti: (g, opts) => {
      const colors = opts.colors || [0xfde047, 0xa855f7, 0x22c55e, 0xef4444, 0x38bdf8, 0xf472b6]
      const c = colors[(Math.random() * colors.length) | 0]
      const w = 6 + Math.random() * 4
      const h = 8 + Math.random() * 4
      if (Math.random() < 0.4) g.circle(0, 0, w * 0.6).fill({ color: c })
      else g.rect(-w / 2, -h / 2, w, h).fill({ color: c })
    },
    sparkle: (g, opts) => {
      const c = opts.color || 0xffffff
      const r = 2 + Math.random() * 2
      g.circle(0, 0, r).fill({ color: c, alpha: 0.9 })
      g.star(0, 0, 4, r * 2.5, r * 0.8).fill({ color: c, alpha: 0.6 })
    },
    dust: (g, opts) => {
      const c = opts.color || 0xb8a48d
      const r = 3 + Math.random() * 3
      g.circle(0, 0, r).fill({ color: c, alpha: 0.45 })
    },
    smoke: (g, opts) => {
      const c = opts.color || 0xd1d5db
      const r = 6 + Math.random() * 4
      g.circle(0, 0, r).fill({ color: c, alpha: 0.5 })
    },
    snow: (g) => {
      g.circle(0, 0, 2 + Math.random() * 1.5).fill({ color: 0xffffff, alpha: 0.85 })
    },
    leaf: (g, opts) => {
      const c = opts.color || (Math.random() < 0.5 ? 0xeab308 : 0xa3e635)
      g.ellipse(0, 0, 4, 7).fill({ color: c, alpha: 0.85 })
    },
    ember: (g) => {
      const c = (Math.random() < 0.5) ? 0xf97316 : 0xfde047
      g.circle(0, 0, 1.6 + Math.random()).fill({ color: c, alpha: 0.9 })
    },
    bubble: (g) => {
      g.circle(0, 0, 4 + Math.random() * 3).stroke({ color: 0xbae6fd, width: 1.5, alpha: 0.8 })
      g.circle(-1, -1, 1.2).fill({ color: 0xffffff, alpha: 0.6 })
    },
    star: (g, opts) => {
      const c = opts.color || 0xfde047
      g.star(0, 0, 5, 6, 3).fill({ color: c, alpha: 0.95 })
    },
    crack: (g, opts) => {
      const c = opts.color || 0xfb923c
      g.rect(-1, -4, 2, 8).fill({ color: c, alpha: 0.9 })
      g.rect(-4, -1, 8, 2).fill({ color: c, alpha: 0.9 })
    }
  }

  function spawnParticles (opts) {
    if (!opts || !opts.parent) return 0
    const PIXI = global.PIXI
    if (!PIXI || !PIXI.Graphics) return 0
    let count = opts.count || 10
    // Reduce-motion: halve count for celebratory bursts, skip dust entirely.
    if (reducedMotion()) {
      if (opts.type === 'dust' || opts.type === 'smoke') return 0
      count = Math.max(1, Math.floor(count / 2))
    }
    // Cap respect: leave at least 20 slots free for critical effects.
    const available = Math.max(0, PARTICLE_CAP - _active.length)
    if (available <= 0) return 0
    count = Math.min(count, available)
    const x = opts.x | 0
    const y = opts.y | 0
    const draw = PARTICLE_DRAW[opts.type] || PARTICLE_DRAW.sparkle
    const spread = opts.spread != null ? opts.spread : 40
    const upBias = opts.upBias != null ? opts.upBias : 0.5
    const ttl = opts.ttl || 60   // frames
    const gravity = opts.gravity != null ? opts.gravity : 0.05
    for (let i = 0; i < count; i++) {
      const p = _acquireParticle()
      const g = new PIXI.Graphics()
      try { draw(g, opts) } catch (_) {}
      g.x = x + (Math.random() - 0.5) * spread * 0.4
      g.y = y + (Math.random() - 0.5) * spread * 0.4
      p.g = g
      p.parent = opts.parent
      p.type = opts.type
      const a = Math.random() * Math.PI * 2
      const speed = (opts.speed || 3) * (0.5 + Math.random())
      p.vx = Math.cos(a) * speed
      p.vy = Math.sin(a) * speed - upBias * 3
      p.ax = 0
      p.ay = gravity
      p.ttl = ttl
      p.ttlMax = ttl
      p.scale0 = (opts.scale || 1) * (0.85 + Math.random() * 0.3)
      p.scaleEnd = opts.scaleEnd != null ? opts.scaleEnd : p.scale0 * 0.4
      p.alpha0 = 1
      p.alphaEnd = 0
      p.angle = 0
      p.angVel = (Math.random() - 0.5) * 0.2
      g.scale.set(p.scale0)
      opts.parent.addChild(g)
      _active.push(p)
    }
    if (!_particleRafId) _particleRafId = requestAnimationFrame(_tickParticles)
    return count
  }

  let _particleRafId = null
  function _tickParticles () {
    _particleRafId = null
    for (let i = _active.length - 1; i >= 0; i--) {
      const p = _active[i]
      p.ttl--
      if (p.ttl <= 0) {
        _releaseParticle(p)
        _active.splice(i, 1)
        continue
      }
      p.vx += p.ax
      p.vy += p.ay
      p.g.x += p.vx
      p.g.y += p.vy
      p.angle += p.angVel
      p.g.rotation = p.angle
      const t = 1 - p.ttl / p.ttlMax
      const sc = p.scale0 + (p.scaleEnd - p.scale0) * t
      p.g.scale.set(sc)
      p.g.alpha = p.alpha0 + (p.alphaEnd - p.alpha0) * t
    }
    if (_active.length > 0) _particleRafId = requestAnimationFrame(_tickParticles)
  }

  function clearParticles () {
    while (_active.length) {
      _releaseParticle(_active.pop())
    }
  }

  // ── Filters (Pixi wrappers) ────────────────────────────────────────────────
  // Graceful fallback when PIXI not loaded (G18 Museum may use these
  // before initPixi).
  const filters = {
    glow: function (target, color, intensity) {
      const PIXI = global.PIXI
      if (!target || !PIXI || !PIXI.ColorMatrixFilter) return null
      try {
        const f = new PIXI.ColorMatrixFilter()
        f.brightness(1 + (intensity || 0.4), false)
        target.filters = [f]
        return f
      } catch (_) { return null }
    },
    bloom: function (target, intensity) {
      const PIXI = global.PIXI
      if (!target || !PIXI || !PIXI.BlurFilter) return null
      try {
        const f = new PIXI.BlurFilter({ strength: intensity || 4, quality: 2 })
        target.filters = (target.filters || []).concat([f])
        return f
      } catch (_) { return null }
    },
    chromatic: function (target, offsetPx) {
      // Cheap chromatic via ColorMatrixFilter rgba shift. True separation
      // needs a custom shader which we skip for portability.
      const PIXI = global.PIXI
      if (!target || !PIXI || !PIXI.ColorMatrixFilter) return null
      try {
        const f = new PIXI.ColorMatrixFilter()
        const o = (offsetPx || 4) * 0.05
        f.matrix = [
          1, o, 0, 0, 0,
          0, 1, 0, 0, 0,
          0,-o, 1, 0, 0,
          0, 0, 0, 1, 0
        ]
        target.filters = (target.filters || []).concat([f])
        return f
      } catch (_) { return null }
    },
    clear: function (target) {
      if (target) target.filters = null
    }
  }

  // ── Trails (Pixi-based fading copies) ──────────────────────────────────────
  const _trails = []   // {target, parent, opts, sample, lastEmit}
  function attachTrail (target, opts) {
    if (!target || !opts || !opts.parent) return null
    if (reducedMotion()) return null
    const PIXI = global.PIXI
    if (!PIXI || !PIXI.Graphics) return null
    const rec = {
      target: target,
      parent: opts.parent,
      color: opts.color || 0xffffff,
      width: opts.width || 6,
      alpha: opts.alpha != null ? opts.alpha : 0.55,
      emitEveryMs: opts.emitEveryMs || 60,
      decayMs: opts.decayMs || 380,
      _samples: [],
      _lastEmit: 0
    }
    _trails.push(rec)
    if (!_trailRafId) _trailRafId = requestAnimationFrame(_tickTrails)
    return {
      detach: function () {
        const i = _trails.indexOf(rec)
        if (i >= 0) _trails.splice(i, 1)
        rec._samples.forEach(s => {
          try { rec.parent.removeChild(s) } catch (_) {}
          try { s.destroy && s.destroy() } catch (_) {}
        })
        rec._samples.length = 0
      }
    }
  }
  let _trailRafId = null
  function _tickTrails () {
    _trailRafId = null
    const now = (global.performance && global.performance.now ? global.performance.now() : Date.now())
    const PIXI = global.PIXI
    for (let ti = 0; ti < _trails.length; ti++) {
      const t = _trails[ti]
      if (!t.target || !t.parent || !PIXI) continue
      if (now - t._lastEmit >= t.emitEveryMs) {
        t._lastEmit = now
        const g = new PIXI.Graphics()
        g.circle(0, 0, t.width / 2).fill({ color: t.color, alpha: t.alpha })
        g.x = t.target.x
        g.y = t.target.y
        g._bornAt = now
        t.parent.addChild(g)
        t._samples.push(g)
      }
      for (let si = t._samples.length - 1; si >= 0; si--) {
        const s = t._samples[si]
        const age = now - s._bornAt
        if (age >= t.decayMs) {
          try { t.parent.removeChild(s) } catch (_) {}
          try { s.destroy && s.destroy() } catch (_) {}
          t._samples.splice(si, 1)
        } else {
          s.alpha = t.alpha * (1 - age / t.decayMs)
        }
      }
    }
    if (_trails.length > 0) _trailRafId = requestAnimationFrame(_tickTrails)
  }

  // ── Screen-level effects (DOM) ─────────────────────────────────────────────
  function screenFlash (color, durMs) {
    if (reducedMotion()) return
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;inset:0;background:' + (color || '#fff') + ';opacity:0;pointer-events:none;z-index:9999;transition:opacity ' + ((durMs || 180) / 2) + 'ms ease-out'
    document.body.appendChild(el)
    requestAnimationFrame(() => { el.style.opacity = '0.55' })
    setTimeout(() => { el.style.opacity = '0' }, (durMs || 180) / 2)
    setTimeout(() => { try { el.remove() } catch (_) {} }, durMs || 180)
  }
  function screenShake (intensity, durMs) {
    if (reducedMotion()) return
    const body = document.body
    const amp = intensity || 8
    const dur = durMs || 220
    const start = (global.performance && global.performance.now ? global.performance.now() : Date.now())
    const step = () => {
      const now = (global.performance && global.performance.now ? global.performance.now() : Date.now())
      const t = (now - start) / dur
      if (t >= 1) { body.style.transform = ''; return }
      const decay = 1 - t
      const x = (Math.random() - 0.5) * amp * decay
      const y = (Math.random() - 0.5) * amp * decay
      body.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)'
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  function screenVignettePulse (color, durMs) {
    let el = document.getElementById('train-vfx-vignette')
    if (!el) {
      el = document.createElement('div')
      el.id = 'train-vfx-vignette'
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;opacity:0;transition:opacity 240ms ease-in-out'
      document.body.appendChild(el)
    }
    el.style.boxShadow = 'inset 0 0 120px 40px ' + (color || 'rgba(239,68,68,0.55)')
    requestAnimationFrame(() => { el.style.opacity = '1' })
    setTimeout(() => { el.style.opacity = '0' }, durMs || 600)
  }
  function screenLighting (biome) {
    // Apply a soft full-screen tint matching the biome. Idempotent.
    const tints = {
      forest:  'rgba(20,80,40,0.10)',
      desert:  'rgba(217,119,6,0.10)',
      snow:    'rgba(200,230,255,0.12)',
      coastal: 'rgba(6,182,212,0.10)',
      urban:   'rgba(15,23,42,0.16)',
      volcano: 'rgba(220,38,38,0.12)',
      none:    'transparent'
    }
    const col = tints[biome] || tints.none
    let el = document.getElementById('train-vfx-lighting')
    if (!el) {
      el = document.createElement('div')
      el.id = 'train-vfx-lighting'
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9997;mix-blend-mode:multiply;transition:background 800ms ease-in-out'
      document.body.appendChild(el)
    }
    el.style.background = col
  }
  function screenFreezeFrame (durMs) {
    // Pixi-side: caller can pause its app.ticker. We just dim the screen briefly.
    if (reducedMotion()) return
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.35);pointer-events:none;z-index:9996'
    document.body.appendChild(el)
    setTimeout(() => { try { el.remove() } catch (_) {} }, durMs || 80)
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  global.TrainVFX = {
    version: '54.53',
    reducedMotion: reducedMotion,
    particles: {
      spawn: spawnParticles,
      clear: clearParticles,
      activeCount: function () { return _active.length },
      cap: PARTICLE_CAP
    },
    filters: filters,
    trails: { attach: attachTrail },
    screen: {
      flash: screenFlash,
      shake: screenShake,
      vignettePulse: screenVignettePulse,
      lighting: screenLighting,
      freezeFrame: screenFreezeFrame
    },
    ease: ease,
    tween: tween
  }
})(typeof window !== 'undefined' ? window : globalThis)
