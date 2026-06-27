/* =============================================================================
 * games/parallax-engine.js — RZParallax (v1, 2026-06-27)
 * =============================================================================
 * A small, renderer-agnostic 2.5D parallax engine. It turns multiple INPUTS
 * (auto-scroll, pointer, device tilt, wheel/scroll) into per-LAYER depth
 * transforms, so a stack of flat 2D layers reads as real 3D depth — the same
 * trick messenger.abeto.co / Ori / Hollow Knight use, with zero 3D engine.
 *
 * Design goals:
 *   - Engine computes MATH only. It never touches the DOM/canvas/Pixi, so the
 *     SAME instance drives a Canvas2D demo AND the Pixi train games.
 *   - Depth model: each layer has a `depth` in [0..1] (0 = infinitely far,
 *     1 = right at the camera). Far layers move little + are hazy + slightly
 *     out of focus; the focus plane (depthFocus) is sharp; the nearest layer is
 *     big, fast, and softly blurred. That's the 6 classic depth cues:
 *       parallax · scale · aerial haze · depth-of-field · contrast · motion.
 *   - Inputs are EASED (critically-damped) so motion feels buttery, never jerky.
 *   - dt-clamped everywhere (owner runs a throttled tablet — frame spikes must
 *     not explode the easing).
 *
 * Usage:
 *   const px = RZParallax.create({ strength: 28, tiltStrength: 1.0 })
 *   px.bindPointer(canvas)         // mouse + touch drag → look-around
 *   px.bindTilt()                  // device gyro → look-around (asks permission on iOS)
 *   // per frame:
 *   px.update(dtFrames)            // dtFrames ~ 1 at 60fps (clamped internally)
 *   const t = px.layer(depth)      // → { x, y, scale, blur, haze, dim }
 *   sprite.x = baseX + t.x; sprite.scale = t.scale; ...
 * ========================================================================== */
(function () {
  'use strict'

  // critically-damped spring step toward target — smooth, no overshoot
  function damp(cur, target, lambda, dt) {
    return target + (cur - target) * Math.exp(-lambda * dt)
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

  function create(opts) {
    opts = opts || {}
    const S = {
      // tunables
      strength:      opts.strength      != null ? opts.strength      : 26,   // px of sway at depth 1 for full input
      tiltStrength:  opts.tiltStrength  != null ? opts.tiltStrength  : 1.0,  // gyro multiplier
      vertical:      opts.vertical      != null ? opts.vertical      : 0.55, // vertical sway as a fraction of horizontal
      depthFocus:    opts.depthFocus    != null ? opts.depthFocus    : 0.62, // which depth is in sharp focus
      maxBlur:       opts.maxBlur       != null ? opts.maxBlur       : 4.0,  // px blur at the extremes
      hazeColor:     opts.hazeColor     || '#bcd2e8',
      hazeMax:       opts.hazeMax       != null ? opts.hazeMax       : 0.5,  // far-layer haze alpha
      scaleSpread:   opts.scaleSpread   != null ? opts.scaleSpread   : 0.5,  // near grows up to +50%
      autoScroll:    opts.autoScroll    != null ? opts.autoScroll    : 0,    // world px/sec at depth 1 (0 = off)
      ease:          opts.ease          != null ? opts.ease          : 9,    // damping lambda (higher = snappier)
      // live state
      tx: 0, ty: 0,     // target look vector, normalized [-1..1]
      cx: 0, cy: 0,     // current (eased) look vector
      scroll: 0,        // accumulated auto-scroll (world units at depth 1)
      _cleanup: []
    }

    // ── input setters ────────────────────────────────────────
    function setLook(nx, ny) { S.tx = clamp(nx, -1, 1); S.ty = clamp(ny, -1, 1) }

    function bindPointer(el) {
      el = el || window
      const rectEl = (el === window || el === document) ? document.documentElement : el
      const onMove = (e) => {
        const p = (e.touches && e.touches[0]) ? e.touches[0] : e
        const r = rectEl.getBoundingClientRect ? rectEl.getBoundingClientRect()
                  : { left: 0, top: 0, width: innerWidth, height: innerHeight }
        const nx = ((p.clientX - r.left) / Math.max(1, r.width)) * 2 - 1
        const ny = ((p.clientY - r.top) / Math.max(1, r.height)) * 2 - 1
        setLook(nx, ny)
      }
      const onLeave = () => setLook(0, 0)
      const tgt = (el === window) ? window : el
      tgt.addEventListener('mousemove', onMove, { passive: true })
      tgt.addEventListener('touchmove', onMove, { passive: true })
      tgt.addEventListener('mouseleave', onLeave, { passive: true })
      tgt.addEventListener('touchend', onLeave, { passive: true })
      S._cleanup.push(() => {
        tgt.removeEventListener('mousemove', onMove)
        tgt.removeEventListener('touchmove', onMove)
        tgt.removeEventListener('mouseleave', onLeave)
        tgt.removeEventListener('touchend', onLeave)
      })
      return api
    }

    // device-orientation tilt → look vector. Returns a Promise<boolean> (granted?).
    function bindTilt() {
      const handler = (e) => {
        // gamma = left/right [-90..90], beta = front/back [-180..180]
        const g = (e.gamma || 0), b = (e.beta || 0)
        const nx = clamp(g / 35, -1, 1) * S.tiltStrength
        const ny = clamp((b - 45) / 35, -1, 1) * S.tiltStrength   // 45° = comfortable holding angle
        setLook(nx, ny)
      }
      const attach = () => {
        window.addEventListener('deviceorientation', handler, { passive: true })
        S._cleanup.push(() => window.removeEventListener('deviceorientation', handler))
      }
      // iOS 13+ needs an explicit permission gesture
      const DOE = window.DeviceOrientationEvent
      if (DOE && typeof DOE.requestPermission === 'function') {
        return DOE.requestPermission().then((r) => { if (r === 'granted') { attach(); return true } return false }).catch(() => false)
      }
      attach()
      return Promise.resolve(true)
    }

    // ── per-frame update ─────────────────────────────────────
    // dtFrames: ~1 per frame at 60fps. Clamped so a throttled tablet's spike
    // can't make the easing jump or the scroll lurch.
    function update(dtFrames) {
      const dt = clamp(dtFrames || 1, 0, 3) / 60   // → seconds, clamped
      S.cx = damp(S.cx, S.tx, S.ease, dt)
      S.cy = damp(S.cy, S.ty, S.ease, dt)
      if (S.autoScroll) S.scroll += S.autoScroll * dt
      return api
    }

    // ── per-layer transform query ────────────────────────────
    // depth 0 = far, 1 = near. Returns everything a renderer needs.
    function layer(depth) {
      const d = clamp(depth, 0, 1)
      // parallax sway: scales with depth (near moves most)
      const x = -S.cx * S.strength * d
      const y = -S.cy * S.strength * S.vertical * d
      // scale: near layers are bigger (perspective)
      const scale = 1 + (d - 0.5) * 2 * (S.scaleSpread * 0.5)
      // depth-of-field: sharp at depthFocus, blurs toward both extremes
      const blur = S.maxBlur * Math.min(1, Math.abs(d - S.depthFocus) / Math.max(0.0001, S.depthFocus))
      // aerial haze: strongest far, none near
      const haze = S.hazeMax * Math.pow(1 - d, 1.6)
      // contrast dim: far is flatter/darker-contrast
      const dim = 0.18 * Math.pow(1 - d, 1.4)
      return { x, y, scale, blur, haze, dim, hazeColor: S.hazeColor }
    }

    // horizontal world scroll for a layer (depth-scaled). baseSpeed in world px.
    function scrollFor(depth, baseSpeed) {
      return S.scroll * clamp(depth, 0, 1) * (baseSpeed != null ? baseSpeed : 1)
    }

    // ── CSS 3D helpers (v1.1 — genuinely-3D output) ──────────
    // The 2.5D path above fakes depth with x/y offset. These instead place each
    // layer at a REAL translateZ and rotate the whole SCENE from the look vector,
    // so near layers sweep more than far ones = true parallax from 3D transforms.
    function cameraVec() { return { x: S.cx, y: S.cy } }

    // Scene-level rotation (apply to the preserve-3d container).
    function css3dScene(maxTiltDeg) {
      const m = (maxTiltDeg != null) ? maxTiltDeg : 10
      return { rotateX: -S.cy * m, rotateY: S.cx * m }   // look right → yaw right
    }

    // Per-layer depth placement. depth 0 = far (pushed back), 1 = near (toward
    // viewer); the focus plane (depthFocus) sits at Z=0. `scale` neutralises the
    // perspective foreshortening so all layers read at their authored size — the
    // depth shows up as PARALLAX when the scene rotates, not as size jumps.
    function css3dLayer(depth, perspective, zSpread) {
      const persp = perspective || 1100
      const spread = (zSpread != null) ? zSpread : 900
      const d = clamp(depth, 0, 1)
      const translateZ = (d - S.depthFocus) * spread
      const scale = (persp - translateZ) / persp
      // reuse the 2.5D cues for atmosphere
      const lay = layer(d)
      return { translateZ, scale, blur: lay.blur, haze: lay.haze, dim: lay.dim, hazeColor: lay.hazeColor }
    }

    function set(k, v) { if (k in S) S[k] = v; return api }
    function get(k) { return S[k] }
    function destroy() { S._cleanup.forEach((f) => { try { f() } catch (_) {} }); S._cleanup = [] }

    const api = { setLook, bindPointer, bindTilt, update, layer, scrollFor,
                  cameraVec, css3dScene, css3dLayer, set, get, destroy,
                  get state() { return S } }
    return api
  }

  window.RZParallax = { create, version: '1.1.0' }
})()
