/* =============================================================================
 * hit-feel.js — window.HitFeel (PRD-37). The "it landed" moment, shared: lifted from the impact step of
 * games/gt-fx.js (white flash frame, then HIT-STOP 80-120 ms, then the burst) and the squash in battle-arena.js.
 *
 *   HitFeel.stop(ms)          every running animation on the page holds for ms (WAAPI + CSS animations), and
 *                             HitFeel.frozen() is true meanwhile so a rAF game loop can skip its step. -> Promise
 *   HitFeel.flash(el[, c])    the target blinks white (or colour c) for one short frame
 *   HitFeel.squash(el)        the target squashes and springs back
 *   HitFeel.hit(el[, o])      flash + squash + stop(o.ms || 90); o.big -> 120 ms. -> Promise (resolves after the hold)
 *   HitFeel.reduced()         prefers-reduced-motion: then flash, squash and the hold are all skipped (meaning stays:
 *                             the game's own text and numbers still say what happened)
 *   HitFeel.log               the last 20 holds {ms, at} (a gate reads it)
 * No emoji, no new art. Works without VFX loaded.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  if (W.HitFeel) return
  var until = 0, held = [], log = []

  function reduced () {
    try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) { return false }
  }
  function now () { return (W.performance && performance.now) ? performance.now() : Date.now() }
  function frozen () { return now() < until }

  function stop (ms) {
    ms = Math.max(0, Math.min(200, +ms || 0))
    if (!ms || reduced() || !D.getAnimations) return Promise.resolve(0)
    var t0 = now()
    until = Math.max(until, t0 + ms)
    try {
      D.getAnimations().forEach(function (a) {
        if (a.playState === 'running' && held.indexOf(a) < 0) { a.pause(); held.push(a) }
      })
    } catch (e) {}
    return new Promise(function (res) {
      setTimeout(function () {
        if (now() + 1 >= until) {
          var h = held; held = []
          h.forEach(function (a) { try { if (a.playState === 'paused') a.play() } catch (e) {} })
        }
        log.push({ ms: Math.round(now() - t0), at: Math.round(t0) }); if (log.length > 20) log.shift()
        res(ms)
      }, ms)
    })
  }

  function flash (el, colour) {
    if (!el || !el.animate || reduced()) return null
    try {
      return el.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.6) saturate(0)' + (colour ? ' drop-shadow(0 0 6px ' + colour + ')' : ''), offset: 0.2 }, { filter: 'brightness(1)' }],
        { duration: 220, easing: 'ease-out' })
    } catch (e) { return null }
  }

  function squash (el) {
    if (!el || !el.animate || reduced()) return null
    try {
      return el.animate([{ scale: '1 1' }, { scale: '1.16 0.84', offset: 0.25 }, { scale: '0.94 1.06', offset: 0.6 }, { scale: '1 1' }],
        { duration: 300, easing: 'cubic-bezier(.3,1.5,.5,1)', composite: 'add' })
    } catch (e) { return null }
  }

  function hit (el, o) {
    o = o || {}
    flash(el, o.colour)
    // the hold starts on the next frame, after the flash frame was drawn (gt-fx order: flash, then hold)
    return new Promise(function (res) {
      (W.requestAnimationFrame || setTimeout)(function () {
        stop(o.ms || (o.big ? 120 : 90)).then(function () { squash(el); res() })
      })
    })
  }

  W.HitFeel = { stop: stop, flash: flash, squash: squash, hit: hit, frozen: frozen, reduced: reduced, log: log }
})(window, document)
