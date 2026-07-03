/* =============================================================================
 * motion.js — window.Motion  (v1.0.0, 2026-07-03)
 * =============================================================================
 * SHARED motion/game-feel engine for all Dunia Emosi games (M-303, A-315).
 *
 * The "kasar" root cause across g14/g15/g16/side: fixed-factor FRAME lerps
 * (pos += (target-pos)*0.22 per frame) converge HALF as fast at 30fps as at 60fps
 * — feel degrades exactly when the owner's throttled tablet slows down — plus
 * terminal snaps, teleporting AI, linear scrolls and instant pickup consumption.
 *
 * This engine provides frame-rate-INDEPENDENT primitives (research-backed:
 * Driscoll exp-decay damping, Eiserloh trauma shake, Swink game-feel):
 *
 *   Motion.damp(current, target, rate, dtSec)      exp-decay ease (identical feel
 *                                                  at 30/60fps; rate 8-14 = snappy)
 *   Motion.dampAngle(cur, tgt, rate, dtSec)        same, shortest-path angles
 *   Motion.easeOut/easeInOut/easeOutBack(t)        curves for one-shot tweens
 *   Motion.tween(obj, prop, to, ms, curve, done)   rAF one-shot tween (dt-clamped)
 *   Motion.squash(obj, amt, ms)                    volume-preserving squash&stretch
 *                                                  (scale.x up ⇒ scale.y down, settle back)
 *   Motion.hitStop(ms)                             returns a dt multiplier accessor —
 *                                                  games multiply their sim dt by
 *                                                  Motion.dtScale() (0 during the stop)
 *   Motion.shake(trauma)                           add trauma (0..1); Motion.shakeOffset()
 *                                                  → {x,y,rot} each frame: shake = trauma²,
 *                                                  smooth-noise, amp ≤1.5% screen, fast decay
 *                                                  (kid-safe); honors reduced motion
 *   Motion.flyTo(fromX, fromY, toX, toY, ms, cb)   arc interpolator for fly-to-HUD coins:
 *                                                  cb(x, y, t) per frame along a quadratic arc
 *   Motion.reduced()                               prefers-reduced-motion (or app override)
 *
 * Pure math + rAF — no PIXI/DOM dependency (callers apply values), so it drives
 * both canvas sprites and DOM elements. All loops dt-clamped for the tablet.
 * ========================================================================== */
;(function (global) {
  'use strict'

  var REDUCED = false
  try { REDUCED = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (_) {}

  function reduced () {
    try { if (global.localStorage && global.localStorage.getItem('du-reduced-motion') === '1') return true } catch (_) {}
    return REDUCED
  }

  // ── frame-rate-independent damping ────────────────────────────────────────
  function damp (current, target, rate, dtSec) {
    var dt = Math.min(Math.max(dtSec || 0, 0), 0.1)     // clamp spikes (throttled tablet)
    return target + (current - target) * Math.exp(-(rate || 10) * dt)
  }
  function dampAngle (current, target, rate, dtSec) {
    var d = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    return current + (d - d * Math.exp(-(rate || 10) * Math.min(Math.max(dtSec || 0, 0), 0.1)))
  }

  // ── easing curves ──────────────────────────────────────────────────────────
  function easeOut (t) { return 1 - Math.pow(1 - t, 3) }
  function easeInOut (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
  function easeOutBack (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }

  // ── one-shot rAF tween ─────────────────────────────────────────────────────
  function tween (obj, prop, to, ms, curve, done) {
    if (!obj) { if (done) done(); return }
    var from = obj[prop]
    if (reduced() || !(ms > 0)) { obj[prop] = to; if (done) done(); return }
    var fn = curve || easeOut
    var t0 = null
    function step (ts) {
      if (t0 == null) t0 = ts
      var t = Math.min(1, (ts - t0) / ms)
      obj[prop] = from + (to - from) * fn(t)
      if (t < 1 && !obj._motionKilled) requestAnimationFrame(step)
      else if (done) done()
    }
    requestAnimationFrame(step)
  }

  // ── volume-preserving squash & stretch ────────────────────────────────────
  // scaleObj = anything with .x/.y (e.g. sprite.scale). amt>0 stretches X (squashes Y);
  // settles back to base with an eased return. Cheap: transform-only.
  function squash (scaleObj, amt, ms) {
    if (!scaleObj || reduced()) return
    var bx = scaleObj._mBaseX != null ? scaleObj._mBaseX : (scaleObj._mBaseX = scaleObj.x)
    var by = scaleObj._mBaseY != null ? scaleObj._mBaseY : (scaleObj._mBaseY = scaleObj.y)
    var dur = ms || 220
    var t0 = null
    function step (ts) {
      if (t0 == null) t0 = ts
      var t = Math.min(1, (ts - t0) / dur)
      var k = Math.sin(t * Math.PI) * amt          // out and back
      scaleObj.x = bx * (1 + k)
      scaleObj.y = by * (1 - k)                    // volume preserved
      if (t < 1) requestAnimationFrame(step)
      else { scaleObj.x = bx; scaleObj.y = by }
    }
    requestAnimationFrame(step)
  }

  // ── hit-stop (freeze the SIM, not the render loop) ────────────────────────
  var _stopUntil = 0
  function hitStop (ms) { _stopUntil = Math.max(_stopUntil, performance.now() + Math.min(ms || 80, 140)) }
  function dtScale () { return performance.now() < _stopUntil ? 0 : 1 }

  // ── trauma-model screen shake (Eiserloh; kid-safe limits) ─────────────────
  var _trauma = 0, _shakeT = 0
  function shake (trauma) { if (!reduced()) _trauma = Math.min(1, _trauma + (trauma || 0.3)) }
  function shakeOffset (dtSec, screenMin) {
    var dt = Math.min(Math.max(dtSec || 0.016, 0), 0.1)
    if (_trauma <= 0.001) { _trauma = 0; return { x: 0, y: 0, rot: 0 } }
    _trauma = Math.max(0, _trauma - dt * 2.6)      // <0.4s to decay from full
    _shakeT += dt * 34
    var s = _trauma * _trauma                      // shake = trauma²
    var amp = Math.min((screenMin || 800) * 0.015, 12) * s
    // smooth pseudo-noise (layered sines ≠ raw random — no jitter strobing)
    return {
      x: amp * (Math.sin(_shakeT * 1.1) * 0.6 + Math.sin(_shakeT * 2.3 + 1.7) * 0.4),
      y: amp * (Math.sin(_shakeT * 0.9 + 4.1) * 0.6 + Math.sin(_shakeT * 2.7 + 0.6) * 0.4),
      rot: 0.004 * s * Math.sin(_shakeT * 1.7 + 2.9),
    }
  }

  // ── fly-to-HUD arc (quadratic bezier, ease-in) ────────────────────────────
  function flyTo (fromX, fromY, toX, toY, ms, cb, done) {
    var mx = (fromX + toX) / 2, my = Math.min(fromY, toY) - Math.abs(toX - fromX) * 0.25 - 40
    var dur = reduced() ? 1 : (ms || 520)
    var t0 = null
    function step (ts) {
      if (t0 == null) t0 = ts
      var t = Math.min(1, (ts - t0) / dur)
      var e = t * t                                 // ease-in (accelerates toward HUD)
      var u = 1 - e
      cb(u * u * fromX + 2 * u * e * mx + e * e * toX,
         u * u * fromY + 2 * u * e * my + e * e * toY, t)
      if (t < 1) requestAnimationFrame(step)
      else if (done) done()
    }
    requestAnimationFrame(step)
  }

  global.Motion = {
    version: '1.0.0',
    damp: damp, dampAngle: dampAngle,
    easeOut: easeOut, easeInOut: easeInOut, easeOutBack: easeOutBack,
    tween: tween, squash: squash,
    hitStop: hitStop, dtScale: dtScale,
    shake: shake, shakeOffset: shakeOffset,
    flyTo: flyTo, reduced: reduced,
  }
})(typeof window !== 'undefined' ? window : this)
