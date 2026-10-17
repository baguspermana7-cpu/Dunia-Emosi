/* ============================================================================
 * gt-monster-anim.js — window.GTMonsterAnim: the Monster Rush monster as an animated sprite (2026-10-17)
 *
 * Owner: the rush monster is a still picture with white crop leftovers; animated sprite sheets are coming (big, like
 * now). A right answer is a raid hit (the monster gets hurt), a wrong one is the monster striking the player.
 *
 * Sheets are registered per monster key (a generated data file, filled by the ingest tool when the pack arrives):
 *   window.GTMonsterSheets['gt-monster/robo-gorilla'] = {
 *     cell: [w, h], fps: 20,
 *     states: { idle: { src, frames, cols, loop: true }, attack: { src, frames, cols }, hurt: {...}, ko: {...} } }
 *   src is relative to the Dunia root (assets/...). Every state but idle is optional.
 *
 *   var m = GTMonsterAnim.mount(hitEl, imgEl, key, { base, reduced })
 *   -> null when that monster has no sheets (the caller keeps the still picture and its CSS motion), else
 *      { play(state) -> ms the state lasts (0 = not available), has(state), el, destroy() }
 * The canvas replaces the still in place (same class, cell-aspect intrinsic size); the still stays as the poster until
 * the idle sheet decoded.
 * One rAF loop per mounted monster, stopped on destroy. Reduced motion: idle frame 0 only, states as single frames.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window
  function mount (hitEl, imgEl, key, o) {
    o = o || {}
    var man = W.GTMonsterSheets && W.GTMonsterSheets[key]
    if (!man || !man.states || !man.states.idle || !hitEl) return null
    var base = o.base || '../'
    // REPLACE-IN-PLACE: the canvas takes the still's class (its CSS size, bob, boss glow, object-fit) and an intrinsic
    // size with the cell's aspect, so 'height: X; width: auto' lays it out exactly like the picture it replaces
    var cv = document.createElement('canvas'), c = cv.getContext('2d')
    var K = Math.min(2, Math.max(1, Math.round((W.devicePixelRatio || 1) * 10) / 10))
    cv.width = Math.round(man.cell[0] * K); cv.height = Math.round(man.cell[1] * K)
    cv.className = (imgEl && imgEl.className ? imgEl.className + ' ' : '') + 'mon-anim'
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', imgEl ? (imgEl.alt || '') : '')
    var imgs = {}, ready = false, cur = 'idle', t0 = 0, raf = 0, dead = false, fps = man.fps || 20
    Object.keys(man.states).forEach(function (s) {
      var im = new Image()
      im.onload = function () {
        if (s !== 'idle' || dead) return
        ready = true
        if (imgEl && imgEl.parentNode) { imgEl.parentNode.insertBefore(cv, imgEl.nextSibling); imgEl.style.display = 'none' } else hitEl.appendChild(cv)
      }
      im.src = base + man.states[s].src
      imgs[s] = im
    })
    function fit () {}
    function dur (s) { var st = man.states[s]; return st ? Math.round(st.frames * 1000 / fps) : 0 }
    function frame (now) {
      raf = 0
      if (dead) return
      if (ready && !cv.isConnected) { dead = true; return }   // the page replaced the monster (a new level): stop, no leak
      if (ready) {
        var st = man.states[cur], im = imgs[cur]
        if (!st || !im || !im.complete) { cur = 'idle'; st = man.states.idle; im = imgs.idle }
        var n = o.reduced ? 0 : Math.floor((now - t0) * fps / 1000)
        if (n >= st.frames) { if (st.loop) n %= st.frames; else { cur = cur === 'ko' ? 'ko' : 'idle'; t0 = now; n = cur === 'ko' ? st.frames - 1 : 0; st = man.states[cur]; im = imgs[cur] } }
        var cw = man.cell[0], ch = man.cell[1], cols = st.cols || st.frames
        c.clearRect(0, 0, cv.width, cv.height)
        try { c.drawImage(im, (n % cols) * cw, Math.floor(n / cols) * ch, cw, ch, 0, 0, cv.width, cv.height) } catch (e) {}
      }
      raf = W.requestAnimationFrame(frame)
    }
    raf = W.requestAnimationFrame(function (now) { t0 = now; frame(now) })
    return {
      el: cv,
      has: function (s) { return !!man.states[s] },
      state: function () { return ready ? cur : 'poster' },
      play: function (s) { if (!man.states[s]) return 0; cur = s; t0 = W.performance.now(); return dur(s) },
      destroy: function () { dead = true; if (raf) W.cancelAnimationFrame(raf); W.removeEventListener('resize', fit); if (cv.parentNode) cv.parentNode.removeChild(cv); if (imgEl) imgEl.style.display = '' }
    }
  }
  W.GTMonsterAnim = { mount: mount }
})()
