/* CekMotion — PRD-54 M (A2-A5): the motion of the Cek Kemampuan page, in one place. Web Animations only, on transform
 * and opacity; every call cancels the animation it replaces, so fast taps never stack. Reduced motion (the OS setting or
 * du-reduced-motion=1) turns every move into a short fade and drops the bounces.
 *   screen(el, back)       a new screen slides in 280 ms (from the right, or from the left when going back)
 *   mapIn()                islands rise from the water one after another (60 ms apart, 420 ms each), stars pop in
 *   zoomTo(isleEl, done)   the map leans in toward the picked island (380 ms), then done()
 *   stage(el, kind)        a new item card rises in 220 ms and its choices follow 40 ms apart. Never for an item whose
 *                          showing time is part of the measure (Ingat sequences, Cepat pairs, dots): kind decides
 *   stars(el)              the result stars land one at a time, each with a rising star sound
 *   reveal(steps)          the Perkiraan IQ sequence: runs the given step functions at fixed times, logging each
 *   rows(el)               board rows slide in, 50 ms apart
 *   log                    [{ k, t }] every motion step with its time (tools/qa-prd53-cek.mjs law M2/M3)
 * Effects never run on a scored answer: the page decides when to call; nothing here reacts to right or wrong.
 */
;(function (W, D) {
  'use strict'
  var EASE = 'cubic-bezier(.2,.8,.2,1)', POP = 'cubic-bezier(.34,1.56,.64,1)', log = []
  function reduced () {
    try { if (W.localStorage && W.localStorage.getItem('du-reduced-motion') === '1') return true } catch (_) {}
    return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }
  function note (k) { log.push({ k: k, t: Math.round(W.performance ? W.performance.now() : Date.now()) }); if (log.length > 200) log.shift() }
  function stop (el) { if (el && el.getAnimations) el.getAnimations().forEach(function (a) { if (a.id === 'cek') a.cancel() }) }
  function run (el, frames, o) {
    if (!el || !el.animate) return null
    stop(el)
    if (reduced()) { frames = [{ opacity: 0 }, { opacity: 1 }]; o = { duration: Math.min(160, o.duration || 160), delay: 0, easing: 'linear', fill: 'backwards' } }
    var a = el.animate(frames, o); a.id = 'cek'; return a
  }
  function screen (el, back) {
    note('screen')
    run(el, [{ opacity: 0, transform: 'translateX(' + (back ? -28 : 28) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EASE, fill: 'backwards' })
  }
  function mapIn () {
    note('map')
    D.querySelectorAll('#map .isle').forEach(function (b, i) {
      run(b, [{ opacity: 0, transform: 'translate(-50%,-22%) scale(.62)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 420, delay: i * 60, easing: POP, fill: 'backwards' })
      b.querySelectorAll('.st img').forEach(function (s, k) { run(s, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 260, delay: 300 + i * 60 + k * 90, easing: POP, fill: 'backwards' }) })
    })
    var r = D.querySelector('#map .route'); if (r) run(r, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 200, easing: 'linear', fill: 'backwards' })
  }
  function zoomTo (isle, done) {
    var m = D.getElementById('map')
    if (!m || !isle || reduced()) { done(); return }
    note('zoom')
    var mr = m.getBoundingClientRect(), ir = isle.getBoundingClientRect()
    m.style.transformOrigin = ((ir.left + ir.width / 2 - mr.left) / mr.width * 100).toFixed(1) + '% ' + ((ir.top + ir.height / 2 - mr.top) / mr.height * 100).toFixed(1) + '%'
    var a = run(m, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.32)', opacity: 0.25 }], { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'none' })
    var fired = false, go = function () { if (fired) return; fired = true; m.style.transformOrigin = ''; done() }
    if (a) a.onfinish = go
    setTimeout(go, 460)   // a stalled animation (hidden tab) never holds the child back
  }
  var STILL = { ingat: 1, cepat: 1, titik: 1, banyak: 1 }
  function stage (el, kind) {
    if (!el || STILL[kind]) return
    note('item')
    var card = el.firstElementChild
    if (card) run(card, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE, fill: 'backwards' })
    el.querySelectorAll('.choices button, .ch button, button[data-i]').forEach(function (b, i) {
      run(b, [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 160, delay: 60 + i * 40, easing: EASE, fill: 'backwards' })
    })
  }
  function stars (box) {
    if (!box) return
    note('stars')
    box.querySelectorAll('img').forEach(function (s, i) {
      run(s, [{ opacity: 0, transform: 'translateY(-40px) scale(.3) rotate(-25deg)' }, { opacity: 1, transform: 'translateY(4px) scale(1.18) rotate(4deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 250 + i * 260, easing: EASE, fill: 'backwards' })
      if (s.src.indexOf('star-gold') >= 0) setTimeout(function () { try { if (W.SFXEngine && W.SFXEngine.star) W.SFXEngine.star() } catch (_) {} }, 250 + i * 260 + 360)
    })
  }
  // steps: [[ms, fn, name], ...] run in order at their times; returns a cancel function
  var revealT = []
  function reveal (steps) {
    revealT.forEach(clearTimeout); revealT = []
    var fast = reduced()
    steps.forEach(function (s) { revealT.push(setTimeout(function () { note('reveal-' + s[2]); try { s[1](fast) } catch (_) {} }, fast ? Math.min(s[0], 200) : s[0])) })
    return function () { revealT.forEach(clearTimeout); revealT = [] }
  }
  function rows (ol) {
    if (!ol) return
    note('rows')
    Array.prototype.forEach.call(ol.children, function (li, i) { run(li, [{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: i * 50, easing: EASE, fill: 'backwards' }) })
  }
  W.CekMotion = { screen: screen, mapIn: mapIn, zoomTo: zoomTo, stage: stage, stars: stars, reveal: reveal, rows: rows, run: run, reduced: reduced, log: log, EASE: EASE, POP: POP }
})(window, document)
