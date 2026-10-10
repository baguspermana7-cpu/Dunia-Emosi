/* ============================================================================
 * vfx-poke.js — Pokemon attack effects on top of the shared VFX library (window.VFX.Poke)
 * Per move TYPE (18): wind-up aura, projectile head + type trail, impact burst,
 * crit / super-effective extra, soft whiff on a miss, heal / shield for status moves.
 * Data lives in vfx-db (sets); this file is only the grammar. Every call is
 * GUARDED + ADDITIVE: returns false when the library is not ready so the caller
 * keeps its existing effect. Timing is the caller's (duration/onHit pass through).
 * ES5, no build step.   Reduced motion is handled inside VFX.play (fade only).
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  if (!W.VFX || W.VFX.Poke) return
  var VFX = W.VFX

  function ctr (t) {
    if (!t) return null
    if (!t.nodeType && typeof t.x === 'number') return { x: t.x, y: t.y, w: t.w || 80, h: t.h || 80 }
    try { var r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.45, w: r.width, h: r.height } } catch (e) { return null }
  }
  function setOf (type) { var s = VFX.sets && VFX.sets(type); return (s && s.head) ? s : null }
  function ready () { return !!(VFX.db && VFX.db() && VFX.play) }
  function red () { try { return W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) { return false } }
  function hsl (h, s, l, a) { return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')' }
  function rnd (a, b) { return a + Math.random() * (b - a) }

  // ── procedural shapes: guarantee a readable, opaque-cored projectile/burst even before the sprite sheets decode ──
  var SHAPE = { fire: 'orb', water: 'orb', electric: 'bolt', grass: 'leaf', ice: 'shard', fighting: 'orb', poison: 'orb', ground: 'rock',
    flying: 'ring', psychic: 'ring', bug: 'leaf', rock: 'rock', ghost: 'wisp', dragon: 'orb', dark: 'wisp', steel: 'shard', fairy: 'star', normal: 'orb' }
  var CLIP = { shard: 'polygon(50% 0,100% 50%,50% 100%,0 50%)', rock: 'polygon(12% 30%,40% 4%,78% 12%,98% 46%,84% 88%,42% 98%,6% 72%)',
    star: 'polygon(50% 0,62% 36%,100% 38%,70% 60%,82% 100%,50% 76%,18% 100%,30% 60%,0 38%,38% 36%)' }
  var live = 0, pool = []
  function node (kind, size, z) {
    var n = pool.pop() || document.createElement('div')
    n.setAttribute('aria-hidden', 'true'); n.setAttribute('data-vfx', kind); n.setAttribute('data-vfx-tint', '')
    n.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;border-radius:50%;z-index:' + (z || 99994) + ';width:' + size + 'px;height:' + size + 'px;will-change:transform,opacity;backface-visibility:hidden;translate:-999px -999px'
    document.body.appendChild(n); live++
    return n
  }
  function drop (n) {
    try { if (n.parentNode) { n.parentNode.removeChild(n); live--; n.style.cssText = ''; n.removeAttribute('data-vfx'); if (pool.length < 24) pool.push(n) } } catch (e) {}
  }
  function shapeStyle (n, type, hue, size) {
    var sh = SHAPE[type] || 'orb', st = n.style
    if (sh === 'orb' || sh === 'wisp') {
      var dark = (type === 'ghost' || type === 'dark')
      st.background = 'radial-gradient(circle at 38% 36%,#fff 0,' + hsl(hue, 95, dark ? 72 : 78) + ' 22%,' + hsl(hue, 92, dark ? 42 : 56) + ' 55%,' + hsl(hue, 90, 38, 0.9) + ' 70%,' + hsl(hue, 90, 40, 0) + ' 74%)'
      st.boxShadow = '0 0 ' + Math.round(size * 0.2) + 'px ' + Math.round(size * 0.06) + 'px ' + hsl(hue, 95, 58, 0.7)
      if (sh === 'wisp') st.filter = 'blur(1.2px)'
    } else if (sh === 'ring') {
      st.background = 'radial-gradient(circle,' + hsl(hue, 90, 80, 0.55) + ' 0,' + hsl(hue, 90, 70, 0.15) + ' 60%,transparent 62%)'
      st.border = Math.max(5, Math.round(size * 0.1)) + 'px solid ' + hsl(hue, 95, 68)
      st.boxSizing = 'border-box'
    } else if (sh === 'leaf') {
      st.borderRadius = '0 100% 0 100%'; st.height = Math.round(size * 0.6) + 'px'
      st.background = 'linear-gradient(135deg,' + hsl(hue, 70, 70) + ',' + hsl(hue, 75, 40) + ')'
      st.boxShadow = '0 0 ' + Math.round(size * 0.3) + 'px ' + hsl(hue, 90, 55, 0.7)
    } else {
      st.borderRadius = '0'; st.clipPath = CLIP[sh]
      st.background = sh === 'rock' ? 'linear-gradient(135deg,#c9b08a,#7a5c3a 55%,#4d3822)' : (sh === 'star' ? 'radial-gradient(circle,#fff,' + hsl(hue, 90, 75) + ')' : 'linear-gradient(135deg,#fff,' + hsl(hue, 85, 72) + ' 50%,' + hsl(hue, 85, 55) + ')')
    }
  }
  function anim (n, kf, ms, done, ease) {
    try {
      var a = n.animate(kf, { duration: ms, easing: ease || 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' })
      a.onfinish = function () { try { a.cancel() } catch (e) {} drop(n); if (done) done() }
      setTimeout(function () { drop(n) }, ms + 400)
    } catch (e) { setTimeout(function () { drop(n); if (done) done() }, ms) }
  }
  // position via the individual `translate` property: WAAPI keyframes own `transform`, so the two never fight, and nothing triggers layout
  function put (n, x, y, tf) { n.style.translate = (x - parseFloat(n.style.width) / 2).toFixed(1) + 'px ' + (y - parseFloat(n.style.height) / 2).toFixed(1) + 'px'; if (tf) n.style.transform = tf }

  // bits (embers / droplets / shards / leaves / sparkles) thrown from a point
  function bits (type, hue, x, y, count, spread, size, ms) {
    var rm = red()
    for (var i = 0; i < count; i++) {
      if (live >= 12) return   // garnish is capped (procedural nodes: <= ~16 live)
      var n = node('bit:' + (SHAPE[type] || 'orb'), size, 99993)
      shapeStyle(n, type, hue, size); n.style.boxShadow = 'none'
      var a = (i / count) * 6.283 + rnd(-0.3, 0.3), d = spread * rnd(0.6, 1.1)
      put(n, x, y)
      if (rm) { n.style.opacity = '0.8'; anim(n, [{ opacity: 0.8 }, { opacity: 0 }], 300); continue }
      anim(n, [{ transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d + (type === 'water' || type === 'rock' || type === 'ground' ? d * 0.35 : -d * 0.1)) + 'px) scale(.3) rotate(' + rnd(-240, 240) + 'deg)', opacity: 0 }], ms || 520)
    }
  }

  // wind-up: aura sprite hugging the attacker + a contracting charge ring + bits drawn in
  function windup (type, el, o) {
    o = o || {}
    var s = ready() && setOf(type); if (!s || !el) return false
    var c = ctr(el); if (!c) return false
    prime([type])
    var vis = Math.max(90, Math.max(c.w, c.h) * 1.35), dur = o.duration || 340
    VFX.play(s.windup.id, { follow: el, loop: true, duration: dur, size: vis, vis: true, filter: s.windup.filter, blend: 'normal', z: 99989 })
    var hue = s.hue, t = String(type).toLowerCase()
    var ring = node('windup-ring', Math.round(vis * 1.15), 99989)
    ring.style.border = '6px solid ' + hsl(hue, 95, 65, 0.9)
    put(ring, c.x, c.y)
    anim(ring, red() ? [{ opacity: 0 }, { opacity: 0.8 }, { opacity: 0 }] : [{ transform: 'scale(1.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.95, offset: 0.7 }, { transform: 'scale(.85)', opacity: 0 }], dur, null, 'ease-in')
    if (!red()) for (var i = 0; i < 6; i++) {
      var b = node('bit:charge', Math.max(10, Math.round(vis * 0.09)), 99990); shapeStyle(b, t, hue, 12); b.style.boxShadow = 'none'
      var a = (i / 6) * 6.283, r0 = vis * 0.8
      put(b, c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0)
      anim(b, [{ transform: 'translate(0,0) scale(1)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translate(' + (-Math.cos(a) * r0) + 'px,' + (-Math.sin(a) * r0) + 'px) scale(.4)', opacity: 0.9 }], dur, null, 'ease-in')
    }
    return true
  }

  // impact: opaque flash core + shock ring + thrown bits + library sprite + recoil/shake/hit-stop
  function burst (s, type, to, o, defSize) {
    var hue = s.hue, big = !!(o.big || o.superEff || o.crit)
    var vis = Math.max(110, defSize * (big ? 1.5 : 1.25)), ms = big ? 600 : 520
    var core = node('impact-core', Math.round(vis), 99993)
    core.style.background = 'radial-gradient(circle,#fff 0,' + hsl(hue, 100, 88) + ' 22%,' + hsl(hue, 95, 62, 0.95) + ' 52%,' + hsl(hue, 95, 55, 0) + ' 72%)'
    put(core, to.x, to.y)
    anim(core, red() ? [{ opacity: 0.9 }, { opacity: 0 }] : [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1)', opacity: 0.95, offset: 0.3 }, { transform: 'scale(1.15)', opacity: 0 }], ms * 0.8)
    if (!red()) {
      var ring = node('impact-ring', Math.round(vis * 0.9), 99993)
      ring.style.border = Math.max(6, Math.round(vis * 0.05)) + 'px solid ' + hsl(hue, 95, 78)
      put(ring, to.x, to.y); anim(ring, [{ transform: 'scale(.35)', opacity: 1 }, { transform: 'scale(1.35)', opacity: 0 }], ms)
      bits(String(type).toLowerCase(), hue, to.x, to.y, big ? 12 : 8, vis * 0.55, Math.max(14, Math.round(vis * 0.12)), ms)
    }
    VFX.play(s.impact.id, { x: to.x, y: to.y, size: vis * 1.1, vis: true, pop: [0.55, 1], blend: 'normal', filter: s.impact.filter, duration: ms, essential: true, z: 99992 })
    extras(s, to, o, vis)
  }

  // crit / super-effective extras at the impact point
  function extras (s, to, o, vis) {
    var n = o.crit ? 3 : (o.superEff ? 2 : 0)
    if (!n) return
    VFX.play(s.flare.id, { x: to.x, y: to.y, size: (vis || 120) * 1.3, vis: true, filter: s.flare.filter, duration: 420, essential: true, z: 99993 })
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 6.283 + 0.4, d = (vis || 120) * 0.5
      VFX.play(s.crit.id, { x: to.x + Math.cos(a) * d, y: to.y + Math.sin(a) * d * 0.85, size: 44 + (o.crit ? 10 : 0), vis: true, filter: s.crit.filter,
        duration: 480, spin: (i % 2 ? 1 : -1) * 220, alpha: 0.95, z: 99993 })
    }
  }

  function shake (arena, dx, hold) {
    if (!arena || red() || !arena.animate) return
    var h = (hold || 0) / 330, tot = 330 + (hold || 0)
    var amp = [0, 1, -0.7, 0.45, -0.25, 0.1, 0]
    try {
      arena.animate(amp.map(function (a, i) { return { transform: 'translate3d(' + (a * dx).toFixed(1) + 'px,' + (-a * dx * 0.45).toFixed(1) + 'px,0)', offset: Math.min(1, [0, 0.12, 0.3, 0.48, 0.66, 0.84, 1][i] + (i > 1 ? h * 0.3 : 0)), easing: 'ease-out' } }),
        { duration: tot, easing: 'linear' })
    } catch (e) {}
  }
  function recoil (el, from, to) {
    if (!el || !el.animate || red()) return
    var d = from.x <= to.x ? 1 : -1
    try { el.animate([{ translate: '0 0' }, { translate: (d * 12) + 'px -4px', offset: 0.2, easing: 'cubic-bezier(.16,1,.3,1)' }, { translate: '0 0' }], { duration: 300 }) } catch (e) {}
  }

  // bolt (electric): jagged line attacker -> head
  function boltSvg () {
    var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('data-vfx', 'core:bolt'); svg.setAttribute('data-vfx-tint', '')
    svg.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:99994'
    var glow = document.createElementNS(NS, 'polyline'), core = document.createElementNS(NS, 'polyline')
    glow.setAttribute('fill', 'none'); glow.setAttribute('stroke', 'hsla(52,100%,60%,.55)'); glow.setAttribute('stroke-width', '16'); glow.setAttribute('stroke-linejoin', 'round')
    core.setAttribute('fill', 'none'); core.setAttribute('stroke', '#fffbe0'); core.setAttribute('stroke-width', '6'); core.setAttribute('stroke-linejoin', 'round')
    svg.appendChild(glow); svg.appendChild(core); document.body.appendChild(svg); live++
    return { svg: svg, set: function (a, b) {
      var dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L, ny = dx / L, pts = [], N = Math.max(4, Math.round(L / 34))
      for (var i = 0; i <= N; i++) { var k = i / N, j = (i === 0 || i === N) ? 0 : rnd(-18, 18); pts.push(Math.round(a.x + dx * k + nx * j) + ',' + Math.round(a.y + dy * k + ny * j)) }
      glow.setAttribute('points', pts.join(' ')); core.setAttribute('points', pts.join(' '))
    }, end: function () { drop(svg) } }
  }

  // projectile attacker -> target; o: {duration,size(min),onHit,crit,superEff,big,arena}
  function launch (type, from, to, o) {
    o = o || {}
    var s = ready() && setOf(type); var a = ctr(from), b = ctr(to)
    if (!s || !a || !b) return false
    var t = String(type).toLowerCase(), hue = s.hue
    var head = Math.max(o.size || 70, Math.round(Math.max(a.w, a.h) * 0.42) * s.hs), defSize = Math.max(b.w, b.h)
    var core = null, bolt = null, lastBit = 0
    if (!red()) {
      if (SHAPE[t] === 'bolt') bolt = boltSvg()
      else { core = node('core:' + SHAPE[t], Math.round(head * 0.9), 99994); shapeStyle(core, t, hue, head * 0.9) }
    }
    function end () { if (core) { drop(core); core = null } if (bolt) { bolt.end(); bolt = null } }
    var dur = o.duration || 320, ang0 = 0
    VFX.projectile(s.head.id, a, b, {
      duration: dur, size: head, vis: true, filter: s.head.filter, spin: s.headSpin || 0,
      trail: s.trail.id, trailFilter: s.trail.filter, trailScale: 0.6,
      impact: null, arc: o.arc, onHit: o.onHit,
      onStep: function (x, y, k, ang, ms) {
        if (core) { put(core, x, y, 'rotate(' + (SHAPE[t] === 'leaf' || SHAPE[t] === 'shard' || SHAPE[t] === 'rock' || SHAPE[t] === 'star' ? ms * 0.8 : ang) + 'deg) scale(' + (0.96 + 0.07 * Math.sin(ms / 95)) + ')') }
        if (bolt) bolt.set(a, { x: x, y: y })
        if (ms - lastBit > 45) { lastBit = ms; bits(t, hue, x, y, 1, head * 0.35, Math.max(10, Math.round(head * 0.2)), 420) }
      },
      onEnd: function (p) {
        if (bolt) { try { bolt.set(a, b) } catch (e) {} var bb = bolt; bolt = null; setTimeout(function () { bb.end() }, 120) }
        end()
        burst(s, t, p || b, o, defSize)
        // recoil + shake (+ ~60 ms hit-stop on super-effective / crit)
        var big = !!(o.superEff || o.crit)
        recoil(typeof to.getBoundingClientRect === 'function' ? to : null, a, b)
        shake(o.arena, big ? 10 : 6, big ? 60 : 0)
      }
    })
    if (red()) setTimeout(end, dur + 50)
    return true
  }

  // impact only (callers that keep their own projectile)
  function impact (type, to, o) {
    o = o || {}
    var s = ready() && setOf(type); var b = ctr(to)
    if (!s || !b) return false
    burst(s, String(type).toLowerCase(), b, o, Math.max(b.w, b.h, 90))
    return true
  }

  // miss: soft whiff past the target
  function whiff (type, from, to) {
    var s = ready() && VFX.sets('_whiff'); var a = ctr(from), b = ctr(to)
    if (!s || !a || !b) return false
    var dir = b.x >= a.x ? 1 : -1
    VFX.play(s.windup.id, { x: b.x + dir * 64, y: b.y - 26, size: 90, vis: true, filter: s.windup.filter, duration: 520, alpha: 0.7, z: 99992 })
    VFX.play(s.impact.id, { x: b.x + dir * 40, y: b.y - 40, size: 44, vis: true, filter: s.impact.filter, duration: 420, alpha: 0.8, spin: dir * 120, z: 99992 })
    return true
  }

  // status moves: 'heal' | 'shield'
  function status (kind, el, o) {
    o = o || {}
    var s = ready() && VFX.sets(kind === 'shield' ? '_shield' : '_heal'); var c = ctr(el)
    if (!s || !c) return false
    var size = Math.max(96, (c.w || 80) * 1.5)
    VFX.play(s.windup.id, { follow: el, size: size, filter: s.windup.filter, duration: o.duration || 700, z: 99989 })
    if (s.impact) VFX.play(s.impact.id, { follow: el, size: size * 0.9, filter: s.impact.filter, duration: o.duration || 700, z: 99990, essential: true })
    if (kind !== 'shield' && s.sparkle) {
      for (var i = 0; i < 4; i++) VFX.play(s.sparkle.id, { x: c.x + (i - 1.5) * 26, y: c.y - 6 - i * 8, size: 26, filter: s.sparkle.filter, duration: 600 + i * 70, spin: 160, z: 99991 })
    }
    return true
  }

  // warm every sheet a battle can use (call once at battle start)
  function prime (types) {
    if (!ready()) return false
    var ids = [], seen = {}
    function add (p) { if (p && p.id) { if (!seen[p.id]) { seen[p.id] = 1; ids.push(p.id) } if (p.filter) VFX.bake(p.id, p.filter) } }
    var all = types || Object.keys(VFX.db().sets || {})
    for (var i = 0; i < all.length; i++) {
      var s = VFX.db().sets[all[i]]; if (!s) continue
      add(s.windup); add(s.head); add(s.trail); add(s.impact); add(s.crit); add(s.flare); add(s.sparkle)
    }
    VFX.preload(ids); return true
  }

  VFX.Poke = { liveProcedural: function () { return live }, ready: ready, windup: windup, launch: launch, impact: impact, whiff: whiff, status: status, prime: prime, set: setOf,
    types: function () { var s = ready() && VFX.db().sets || {}; return Object.keys(s).filter(function (k) { return k.charAt(0) !== '_' }) } }
})();
