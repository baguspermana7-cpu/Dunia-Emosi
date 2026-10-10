/* ============================================================================
 * vfx-moments.js — kid-safe "game moments" on top of the shared VFX library (window.VFX.Moment)
 *   reward(pt, o)   gold sparkle burst: correct answer, collect, star
 *   splash(pt, o)   water splash: dip, drop, wake
 *   puff(pt, o)     soft dust puff: bump, thud, landing (never a fight impact)
 *   celebrate(pt,o) three staggered rewards: level / world complete
 * pt = {x,y} in viewport px or an element (centre used); o = {size (visible px, default from the element), delay}.
 * Sizes are VISIBLE extents (scaled by the sheet's `fill`), so pass the sprite's own size. No emoji, no weapons.
 * Everything is guarded + additive: returns false when the library is not loaded so the caller keeps its own effect.
 * Reduced motion = a fade in place only. Procedural pieces animate transform/opacity only and are pooled + capped.
 * ES5. Needs vfx-engine.js + data/vfx-db.js.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  if (!W.VFX || W.VFX.Moment) return
  var VFX = W.VFX
  var GOLD = 'sepia(1) saturate(3.6) hue-rotate(8deg)', BLUE = 'sepia(1) saturate(3.4) hue-rotate(160deg)', CREAM = 'sepia(.6) saturate(1.2) brightness(1.05)'
  var live = 0, pool = [], CAP = 18
  function red () { try { return W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) { return false } }
  function ready () { return !!(VFX.db && VFX.db() && VFX.play) }
  function pt (t, o) {
    if (!t) return null
    if (t.nodeType) { try { var r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.max(r.width, r.height) } } catch (e) { return null } }
    return { x: t.x, y: t.y, s: t.s || 0 }
  }
  function size (p, o) { return Math.max(90, (o && o.size) || p.s * 1.4 || 120) }
  function node (kind, w, h, z) {
    if (live >= CAP) return null
    var n = pool.pop() || document.createElement('div')
    n.setAttribute('aria-hidden', 'true'); n.setAttribute('data-vfx', kind); n.setAttribute('data-vfx-tint', '')
    n.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:' + (z || 99994) + ';width:' + w + 'px;height:' + h + 'px;will-change:transform,opacity;backface-visibility:hidden;translate:-999px -999px'
    document.body.appendChild(n); live++
    return n
  }
  function drop (n) { try { if (n.parentNode) { n.parentNode.removeChild(n); live--; n.style.cssText = ''; n.removeAttribute('data-vfx'); if (pool.length < 24) pool.push(n) } } catch (e) {} }
  function at (n, x, y, w, h) { n.style.translate = (x - w / 2).toFixed(1) + 'px ' + (y - h / 2).toFixed(1) + 'px' }
  function anim (n, kf, ms, delay, ease) {
    try {
      var a = n.animate(kf, { duration: ms, delay: delay || 0, easing: ease || 'cubic-bezier(.16,1,.3,1)', fill: 'both' })
      a.onfinish = function () { try { a.cancel() } catch (e) {} drop(n) }
      setTimeout(function () { drop(n) }, ms + (delay || 0) + 400)
    } catch (e) { setTimeout(function () { drop(n) }, ms) }
  }
  var STAR = 'polygon(50% 0,62% 36%,100% 38%,70% 60%,82% 100%,50% 76%,18% 100%,30% 60%,0 38%,38% 36%)'
  function bit (kind, x, y, sz, a, d, drift, ms, delay, bg, clip, round) {
    var n = node('bit:' + kind, sz, sz, 99993); if (!n) return
    n.style.background = bg; n.style.borderRadius = round ? '50%' : '0'; if (clip) n.style.clipPath = clip
    at(n, x, y, sz, sz)
    anim(n, [{ transform: 'translate(0,0) scale(.4) rotate(0deg)', opacity: 0 }, { transform: 'translate(' + (Math.cos(a) * d * 0.55) + 'px,' + (Math.sin(a) * d * 0.55) + 'px) scale(1) rotate(' + (a * 60) + 'deg)', opacity: 1, offset: 0.35 },
      { transform: 'translate(' + (Math.cos(a) * d) + 'px,' + (Math.sin(a) * d + drift) + 'px) scale(.3) rotate(' + (a * 120) + 'deg)', opacity: 0 }], ms, delay)
  }
  function glow (x, y, s, hue, ms, delay) {
    var n = node('moment-glow', s, s, 99992); if (!n) return
    n.style.borderRadius = '50%'
    n.style.background = 'radial-gradient(circle,#fff 0,hsla(' + hue + ',100%,86%,.95) 24%,hsla(' + hue + ',95%,62%,.7) 52%,hsla(' + hue + ',95%,55%,0) 72%)'
    at(n, x, y, s, s)
    anim(n, red() ? [{ opacity: 0.85 }, { opacity: 0 }] : [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1)', opacity: 0.9, offset: 0.3 }, { transform: 'scale(1.12)', opacity: 0 }], ms * 0.8, delay)
  }
  function ring (x, y, s, hue, ms, delay) {
    if (red()) return
    var n = node('moment-ring', s, s, 99993); if (!n) return
    n.style.borderRadius = '50%'; n.style.border = Math.max(4, Math.round(s * 0.04)) + 'px solid hsla(' + hue + ',95%,80%,.95)'; n.style.boxSizing = 'border-box'
    at(n, x, y, s, s)
    anim(n, [{ transform: 'scale(.35)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 0 }], ms, delay)
  }
  function sheet (id, x, y, s, filter, ms, delay) {
    var go = function () { VFX.play(id, { x: x, y: y, size: s, vis: true, filter: filter, blend: 'normal', duration: ms, essential: true, z: 99991, pop: [0.6, 1] }) }
    if (delay) setTimeout(go, delay); else go()
  }

  function reward (t, o) {
    o = o || {}
    var p = pt(t, o); if (!p || !ready()) return false
    var s = size(p, o), d = o.delay || 0, rm = red()
    prime()
    glow(p.x, p.y, s * 1.1, 48, 520, d)
    sheet('px-magicspell', p.x, p.y, s * 1.05, GOLD, 560, d)
    if (!rm) {
      ring(p.x, p.y, s * 0.95, 48, 520, d)
      var n = 8
      for (var i = 0; i < n; i++) {
        var a = (i / n) * 6.283 - 1.57 + (i % 2) * 0.18
        bit('star', p.x, p.y, Math.round(s * (i % 2 ? 0.17 : 0.22)), a, s * (0.5 + (i % 3) * 0.08), s * 0.12, 640, d + i * 12, 'radial-gradient(circle,#fffbe0,#ffd23f 70%)', STAR, false)
      }
    }
    return true
  }
  function splash (t, o) {
    o = o || {}
    var p = pt(t, o); if (!p || !ready()) return false
    var s = size(p, o), d = o.delay || 0, rm = red()
    prime()
    sheet('px-bubbles', p.x, p.y, s * 1.05, '', 560, d)
    glow(p.x, p.y, s * 1.0, 200, 440, d)
    if (!rm) {
      ring(p.x, p.y + s * 0.05, s * 1.0, 200, 560, d)
      for (var i = 0; i < 8; i++) {
        var a = -1.57 + ((i / 7) - 0.5) * 2.4
        bit('drop', p.x, p.y, Math.round(s * 0.1), a, s * 0.55, s * 0.4, 620, d + i * 10, 'radial-gradient(circle at 35% 30%,#fff,#7fd0ff 60%,#2f9be0)', null, true)
      }
    }
    return true
  }
  function puff (t, o) {
    o = o || {}
    var p = pt(t, o); if (!p || !ready()) return false
    var s = size(p, o), d = o.delay || 0, rm = red()
    prime()
    sheet('bk-smoke-puff', p.x, p.y + s * 0.05, s * 1.0, CREAM, 560, d)
    if (!rm) {
      ring(p.x, p.y + s * 0.1, s * 0.8, 40, 480, d)
      for (var i = 0; i < 6; i++) {
        var a = -3.14 + (i / 5) * 3.14
        bit('dust', p.x, p.y + s * 0.1, Math.round(s * 0.13), a, s * 0.5, s * 0.1, 560, d + i * 12, 'radial-gradient(circle,#f3e6cf,#c9ad82)', null, true)
      }
    }
    return true
  }
  function celebrate (t, o) {
    o = o || {}
    var p = pt(t, o); if (!p || !ready()) return false
    var s = size(p, o)
    reward({ x: p.x, y: p.y, s: s }, { size: s * 1.3 })
    reward({ x: p.x - s * 0.7, y: p.y + s * 0.15 }, { size: s * 0.9, delay: 160 })
    reward({ x: p.x + s * 0.7, y: p.y + s * 0.15 }, { size: s * 0.9, delay: 300 })
    return true
  }
  var primed = false
  function prime () {
    if (primed || !ready()) return false
    primed = true
    VFX.preload(['px-magicspell', 'px-bubbles', 'bk-smoke-puff'])
    VFX.bake('px-magicspell', GOLD); VFX.bake('bk-smoke-puff', CREAM)
    return true
  }
  VFX.Moment = { ready: ready, prime: prime, reward: reward, splash: splash, puff: puff, celebrate: celebrate, live: function () { return live } }
})();
