/* ============================================================================
 * mojo-fx.js — G31 Mojo Swoptops board VFX (window.MojoFX)
 * ---------------------------------------------------------------------------
 * Every action on the board shows what it physically does (owner 2026-10-03):
 * Swop = portal swirl + electric aura + old top flies off + new top clicks in;
 * pickup = item pops up and arcs away; NAIK/TURUN = a ladder extends / retracts
 * one step per level with a ticking marker; spray = a water stream, splash and
 * steam; push = dust at the trailing edge; pit filled = thud + dust + "+jalan";
 * jump = boost flame, speed trail, squash landing; rescue = holy light + hearts;
 * repair = three hammer hits with sparks then a shine; flag = checkpoint ring +
 * fireworks; mission = owner confetti.
 *
 * Art: the owner's Mojo effect sprites (assets/db/lib/mojo-fx/*, single frames,
 * moved with transform/opacity) and the shared VFX frame packs
 * (games/vfx-engine.js registry → assets/vfx/<pack>/<fx>/f-N.webp), played here
 * inside the board's own #fx layer so they scale with the board and can be
 * cancelled with the run.
 *
 * Safety:
 *  - epoch-safe: clear() removes every node and timer (called by cancelPlayback);
 *    effects never touch the board's state, they only decorate it.
 *  - at most CAP (6) effects alive; a new one retires the oldest.
 *  - prefers-reduced-motion: fades only (no movement, shake or frame loops).
 *  - transform/opacity only; frame loops swap a background image on a timer
 *    (never per rAF).
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var CAP = 6
  var cfg = null, groups = [], timers = []
  var RM = false
  try { RM = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}

  function layer () { return cfg && cfg.layer() }
  /* glow layer: the shared particle packs are drawn on black for an additive look. A node blending on its own
     inside #fx (its own stacking context) would only blend with the empty layer and show a black square, so these
     go into a sibling layer that itself screens onto the board. */
  function glowLayer () {
    var fx = layer(); if (!fx) return null
    var g = fx.parentNode && fx.parentNode.querySelector(':scope > .fxg')
    if (!g) { g = D.createElement('div'); g.className = 'layer fxg'; g.setAttribute('aria-hidden', 'true'); fx.parentNode.insertBefore(g, fx) }
    return g
  }
  function cell () { return (cfg && cfg.cell()) || 64 }
  function spriteUrl (k) { return cfg.lib('mojo-fx/' + k) }
  var VFXBASE = (function () {
    try { var s = D.currentScript; if (s && s.src) return s.src.replace(/[^/]*$/, '') + '../assets/vfx/' } catch (e) {}
    return '../assets/vfx/'
  })()
  function frames (fx) {
    var r = W.VFX && W.VFX._registry && W.VFX._registry[fx]; if (!r) return []
    var out = []; for (var i = 1; i <= r.frames; i++) out.push(VFXBASE + r.dir + '/' + fx + '/f-' + i + '.webp')
    return out
  }
  function later (fn, ms) { var t = W.setTimeout(function () { var k = timers.indexOf(t); if (k >= 0) timers.splice(k, 1); fn() }, ms); timers.push(t); return t }

  /* ── groups: one per effect, so the cap retires whole effects ── */
  function group (name) {
    var g = { name: name, nodes: [], t0: Date.now() }
    groups.push(g)
    while (groups.length > CAP) kill(groups[0])
    return g
  }
  function kill (g) {
    if (g.onKill) { var f = g.onKill; g.onKill = null; try { f() } catch (e) {} }
    g.nodes.forEach(function (n) { try { n.remove() } catch (e) {} })
    g.nodes = []
    var k = groups.indexOf(g); if (k >= 0) groups.splice(k, 1)
  }
  function settle (g, ms) { later(function () { kill(g) }, ms) }
  /* ground layer: rings, skid marks and the portal lie on the road UNDER Mojo and the objects */
  function groundLayer () {
    var fx = layer(); if (!fx) return null
    var b = fx.parentNode, g = b && b.querySelector(':scope > .fxu')
    if (!g) { g = D.createElement('div'); g.className = 'layer fxu'; g.setAttribute('aria-hidden', 'true'); b.insertBefore(g, b.querySelector(':scope > canvas') ? b.querySelector(':scope > canvas').nextSibling : b.firstChild) }
    return g
  }
  function node (g, cls, x, y, w, h, z, glow) {
    var under = / under\b/.test(' ' + (cls || ''))
    var host = glow ? glowLayer() : under ? groundLayer() : layer(); if (!host) return null
    var n = D.createElement('i')
    n.className = 'mfx ' + (cls || '')
    n.setAttribute('aria-hidden', 'true')
    n.style.cssText = 'left:' + (x - w / 2) + 'px;top:' + (y - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px' + (z ? ';z-index:' + z : '')
    host.appendChild(n); g.nodes.push(n)
    return n
  }
  function play (n, kf, ms, ease, delay) {
    if (!n || !n.animate) return null
    try { return n.animate(kf, { duration: ms, easing: ease || 'cubic-bezier(.23,1,.32,1)', fill: 'both', delay: delay || 0 }) } catch (e) { return null }
  }
  var EOUT = 'cubic-bezier(.23,1,.32,1)', EIO = 'cubic-bezier(.77,0,.175,1)', EIN = 'cubic-bezier(.55,0,1,.45)'

  /* an owner single-frame sprite moved by keyframes (reduced motion: a fade in place) */
  function sprite (g, key, x, y, size, kf, ms, opts) {
    opts = opts || {}
    var n = node(g, 'mfx-spr' + (opts.cls ? ' ' + opts.cls : ''), x, y, size, size, opts.z)
    if (!n) return null
    n.style.backgroundImage = 'url("' + spriteUrl(key) + '")'
    if (opts.blend) n.style.mixBlendMode = opts.blend
    if (RM) play(n, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], Math.min(ms, 400), 'ease', opts.delay)
    else play(n, kf, ms, opts.ease, opts.delay)
    return n
  }
  /* a shared VFX frame pack played in place (reduced motion: a single soft frame fading) */
  function seq (g, fx, x, y, size, ms, opts) {
    opts = opts || {}
    var urls = frames(fx); if (!urls.length) return null
    if (opts.blend !== false) opts.mask = true
    var n = node(g, 'mfx-seq', x, y, size, size, opts.z, opts.blend !== false)
    if (!n) return null
    if (opts.rot) n.style.transform = 'rotate(' + opts.rot + 'deg)'
    if (opts.filter) n.style.filter = opts.filter
    if (opts.mask) n.classList.add('soft')   // a round fade hides the square edge of a frame drawn on black
    if (RM) { n.style.backgroundImage = 'url("' + urls[Math.floor(urls.length / 2)] + '")'; play(n, [{ opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { opacity: 0 }], 400, 'ease'); return n }
    var per = Math.max(28, Math.round(ms / urls.length)), i = 0, loops = opts.loop || 1
    n.style.opacity = '0'
    function step () {
      if (!n.isConnected) return
      if (i >= urls.length * loops) { n.style.opacity = '0'; return }
      n.style.backgroundImage = 'url("' + urls[i % urls.length] + '")'; n.style.opacity = opts.opacity || '1'; i++
      later(step, per)
    }
    later(step, opts.delay || 0)
    return n
  }
  /* small round particles flying out (dust, droplets, hearts handled by sprites) */
  function dots (g, x, y, n, color, spread, ms, size) {
    if (RM) return
    for (var k = 0; k < n; k++) {
      var a = (k / n) * Math.PI * 2 + (k % 2) * 0.3, d = spread * (0.6 + (k * 37 % 40) / 100)
      var p = node(g, 'mfx-dot', x, y, size, size); if (!p) return
      p.style.background = color
      play(p, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px) scale(.3)', opacity: 0 }], ms, EOUT)
    }
  }
  function text (g, x, y, t, color) {
    var n = node(g, 'mfx-txt', x, y, 140, 40, 9); if (!n) return
    n.textContent = t; if (color) n.style.color = color
    if (RM) play(n, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], 1000, 'ease')
    else play(n, [{ transform: 'translateY(8px) scale(.7)', opacity: 0 }, { transform: 'translateY(-6px) scale(1.12)', opacity: 1, offset: 0.25 }, { transform: 'translateY(-10px) scale(1)', opacity: 1, offset: 0.75 }, { transform: 'translateY(-26px) scale(1)', opacity: 0 }], 1100, EOUT)
  }
  function shake (px, ms) {
    if (RM) return
    var b = cfg && cfg.board && cfg.board(); if (!b || !b.animate) return
    var k = []; for (var i = 0; i < 6; i++) k.push({ transform: 'translate(' + ((i % 2 ? -1 : 1) * px * (1 - i / 6)) + 'px,' + ((i % 3 - 1) * px * 0.5 * (1 - i / 6)) + 'px)' })
    k.push({ transform: 'none' })
    try { b.animate(k, { duration: ms || 260, easing: 'linear' }) } catch (e) {}
  }
  function cc (r, c) { var s = cell(); return [(c + 0.5) * s, (r + 0.5) * s] }
  /* an element's box in the effect layer's px (board coordinates), from the screen rects (any board scale) */
  function boxIn (el) {
    var fx = layer(); if (!fx || !el) return null
    var a = fx.getBoundingClientRect(), b = el.getBoundingClientRect(), k = a.width ? fx.offsetWidth / a.width : 1
    return { x: (b.left - a.left) * k, y: (b.top - a.top) * k, w: b.width * k, h: b.height * k }
  }
  function hearts (g, x, y, delay) {
    var s = cell()
    for (var k = 0; k < (RM ? 1 : 5); k++) (function (k) {
      var a = -Math.PI / 2 + (k - 2) * 0.45
      var n = node(g, 'mfx-img', x, y, s * 0.42, s * 0.42, 8); if (!n) return
      n.style.backgroundImage = 'url("' + cfg.lib('mojo-chase/items/heart') + '")'
      play(n, RM ? [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }] : [{ transform: 'translate(0,0) scale(.3)', opacity: 0 }, { transform: 'translate(' + Math.cos(a) * s * 0.35 + 'px,' + Math.sin(a) * s * 0.35 + 'px) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'translate(' + Math.cos(a) * s * 0.7 + 'px,' + (Math.sin(a) * s * 0.7 - s * 0.2) + 'px) scale(.8)', opacity: 0 }], 900, EOUT, delay + k * 60)
    })(k)
  }

  /* ── the ladder: Mojo's centre to the perch point; one rung per level, spaced so the needed height reaches it.
     A clipped wrapper (rotated toward the perch) holds a full-length ladder that slides out of Mojo (transform). ── */
  var stand = null, liftObs = null
  function ladderGeo (r, c, top) {
    var s = cell(), p = cc(r, c), q = W.MojoBoardLook && W.MojoBoardLook.perchNear ? W.MojoBoardLook.perchNear(r, c) : null
    var ux = 0, uy = -1, unit = s * 0.16
    if (q && q.elev > 0) {
      var dx = q.x - p[0], dy = q.y - p[1], d = Math.sqrt(dx * dx + dy * dy)
      if (d > s * 0.3 && dy < 0) { ux = dx / d; uy = dy / d; unit = d / q.elev }
    }
    return { r: r, c: c, x: p[0], y: p[1], ux: ux, uy: uy, nx: -uy, ny: ux, unit: unit, len: Math.max(4, top * unit), perch: q,
      at: function (v) { return [this.x + this.ux * v * this.unit, this.y + this.uy * v * this.unit] } }
  }
  function ladderNode (L, top) {
    var fx = layer(); if (!fx) return null
    var s = cell(), w = Math.max(10, s * 0.26), len = L.len, u = L.unit, ang = Math.atan2(L.ux, -L.uy) * 180 / Math.PI
    var wrap = D.createElement('i'); wrap.className = 'mfx mfx-lad'; wrap.setAttribute('aria-hidden', 'true')
    wrap.style.cssText = 'left:' + (L.x - w / 2) + 'px;top:' + (L.y - len) + 'px;width:' + w + 'px;height:' + len + 'px;z-index:6;overflow:hidden;transform-origin:50% 100%;transform:rotate(' + ang.toFixed(2) + 'deg);will-change:auto'
    var inner = D.createElement('i'); inner.className = 'mfx-ladder'
    var rung = Math.max(3, Math.min(6, u * 0.22)), rail = Math.max(2, w * 0.13)
    // rungs counted from the foot: one at every level, the top one exactly at the perch
    inner.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:' + len + 'px;display:block;border-radius:6px;transform:translateY(' + len + 'px);' +
      'background:repeating-linear-gradient(0deg,transparent 0 ' + (u - rung).toFixed(1) + 'px,#8D6E00 ' + (u - rung).toFixed(1) + 'px ' + (u - rung + 1.5).toFixed(1) + 'px,#FFB300 ' + (u - rung + 1.5).toFixed(1) + 'px ' + u.toFixed(1) + 'px),' +
      'linear-gradient(90deg,#8D6E00 0 ' + rail + 'px,#FFB300 ' + rail + 'px ' + (rail * 1.6) + 'px,transparent ' + (rail * 1.6) + 'px calc(100% - ' + (rail * 1.6) + 'px),#FFB300 calc(100% - ' + (rail * 1.6) + 'px) calc(100% - ' + rail + 'px),#8D6E00 calc(100% - ' + rail + 'px))'
    wrap.appendChild(inner); fx.appendChild(wrap)
    return wrap
  }
  // the standing ladder goes when Mojo drives off, the beat/level ends, or the world resets to the ground
  function dropStand (soft) {
    var L = stand; stand = null; if (!L || !L.wrap) return
    var w = L.wrap
    if (!soft || RM || !w.animate) { w.remove(); return }
    var g = group('ladder-off'); g.nodes.push(w)
    play(w, [{ opacity: 1 }, { opacity: 0 }], 220, 'ease'); settle(g, 260)
  }
  function watchLift () {
    var mj = D.getElementById('mojo'); if (!mj || liftObs || !W.MutationObserver) return
    liftObs = new MutationObserver(function () { if (stand && !mj.classList.contains('lifted')) dropStand(true) })
    liftObs.observe(mj, { attributes: true, attributeFilter: ['class'] })
  }
  var DIR = [[-1, 0], [0, 1], [1, 0], [0, -1]]

  /* ── the event effects (board cell coordinates) ─────────────────────────── */
  var FX = {
    // a wheel-dust puff behind Mojo as it drives off
    move: function (from, to) {
      dropStand(true)
      var g = group('move'), s = cell(), p = cc(from[0], from[1]), dr = to[0] - from[0], dc = to[1] - from[1]
      var x = p[0] - dc * s * 0.18, y = p[1] - dr * s * 0.18 + s * 0.22
      sprite(g, 'dust', x, y, s * 0.6, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(.9)', opacity: 0.85, offset: 0.25 }, { transform: 'translate(' + (-dc * s * 0.25) + 'px,' + (-dr * s * 0.25 - s * 0.08) + 'px) scale(1.25)', opacity: 0 }], 560)
      settle(g, 700)
    },
    // blocked: skid marks under the wheels, a puff of tyre smoke, a short shake
    bump: function (r, c, h) {
      var g = group('bump'), s = cell(), p = cc(r, c), d = DIR[h || 0]
      sprite(g, 'skid', p[0] - d[1] * s * 0.12, p[1] - d[0] * s * 0.12 + s * 0.2, s * 0.7, [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 0.9, transform: 'scale(1)', offset: 0.2 }, { opacity: 0.9, offset: 0.7 }, { opacity: 0 }], 900, { z: 1, cls: 'under' })
      sprite(g, 'tire-smoke', p[0] + d[1] * s * 0.3, p[1] + d[0] * s * 0.3, s * 0.55, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 0.85, transform: 'scale(1)', offset: 0.3 }, { opacity: 0, transform: 'translateY(-12px) scale(1.3)' }], 700)
      shake(4, 260)
      settle(g, 1000)
    },
    // Swop: portal swirl + electric aura under Mojo; the caller animates the tops and asks for the click
    swop: function (r, c) {
      var g = group('swop'), s = cell(), p = cc(r, c)
      sprite(g, 'portal', p[0], p[1], s * 1.25, [{ transform: 'rotate(0) scale(.3)', opacity: 0 }, { transform: 'rotate(160deg) scale(1)', opacity: 0.95, offset: 0.3 }, { transform: 'rotate(420deg) scale(1.05)', opacity: 0.9, offset: 0.75 }, { transform: 'rotate(560deg) scale(.6)', opacity: 0 }], 900, { z: 1, cls: 'under', ease: 'linear' })
      seq(g, 'electric-aura', p[0], p[1], s * 1.3, 560, { loop: 2, z: 7 })
      settle(g, 1300)
    },
    // the click-lock moment: a sparks ring, a white flash and a ring
    swopLock: function (r, c, color) {
      var g = group('lock'), s = cell(), p = cc(r, c)
      var ring = node(g, 'mfx-ring', p[0], p[1], s * 0.9, s * 0.9, 8)
      if (ring) { ring.style.borderColor = color || '#fff'; play(ring, [{ transform: 'scale(.5)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0 }], 520, EOUT) }
      seq(g, 'sparks', p[0], p[1], s * 1.2, 420, { z: 8 })
      dots(g, p[0], p[1], 10, color || '#FFE14D', s * 0.75, 520, Math.max(6, s * 0.09))
      settle(g, 800)
    },
    // the old top flies up and spins away (a clone made by the caller is passed in)
    topOff: function (r, c, html) {
      var g = group('topoff'), s = cell(), p = cc(r, c)
      var n = node(g, 'mfx-top', p[0], p[1], s, s, 9); if (!n) return
      n.innerHTML = html
      if (RM) play(n, [{ opacity: 1 }, { opacity: 0 }], 250, 'ease')
      else play(n, [{ transform: 'translateY(0) rotate(0) scale(1)', opacity: 1 }, { transform: 'translateY(-' + s * 0.55 + 'px) rotate(-40deg) scale(1.05)', opacity: 1, offset: 0.45 }, { transform: 'translate(' + s * 0.5 + 'px,-' + s * 1.1 + 'px) rotate(-200deg) scale(.4)', opacity: 0 }], 520, EOUT)
      settle(g, 600)
    },
    // the item pops up off the road with a sparkle (the caller flies it to its gauge)
    pickup: function (r, c, key) {
      var g = group('pickup'), s = cell(), p = cc(r, c)
      sprite(g, 'collect', p[0], p[1], s * 0.9, [{ transform: 'scale(.3) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.1) rotate(0)', opacity: 1, offset: 0.35 }, { transform: 'scale(1.3) rotate(10deg)', opacity: 0 }], 600, { z: 7 })
      seq(g, 'sparks', p[0], p[1] - s * 0.1, s * 0.9, 380)
      sprite(g, 'sparkle', p[0] + s * 0.25, p[1] - s * 0.3, s * 0.35, [{ transform: 'scale(0) rotate(0)', opacity: 0 }, { transform: 'scale(1) rotate(90deg)', opacity: 1, offset: 0.4 }, { transform: 'scale(.2) rotate(180deg)', opacity: 0 }], 520, { delay: 120 })
      settle(g, 800)
    },
    // the toolbox: lid pops (a quick hop), the tool rises out with a sparkle
    tool: function (r, c, toolSrc) {
      var g = group('tool'), s = cell(), p = cc(r, c)
      var n = node(g, 'mfx-img', p[0], p[1], s * 0.6, s * 0.6, 9)
      if (n) { n.style.backgroundImage = 'url("' + toolSrc + '")'; play(n, RM ? [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }] : [{ transform: 'translateY(0) scale(.4)', opacity: 0 }, { transform: 'translateY(-' + s * 0.55 + 'px) scale(1.1)', opacity: 1, offset: 0.5 }, { transform: 'translateY(-' + s * 0.6 + 'px) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translateY(-' + s * 0.62 + 'px) scale(1)', opacity: 0 }], 700, EOUT) }
      sprite(g, 'sparkle', p[0], p[1] - s * 0.55, s * 0.5, [{ transform: 'scale(0) rotate(0)', opacity: 0 }, { transform: 'scale(1.1) rotate(90deg)', opacity: 1, offset: 0.5 }, { transform: 'scale(.3) rotate(160deg)', opacity: 0 }], 600, { delay: 250 })
      seq(g, 'sparks', p[0], p[1] - s * 0.2, s * 0.8, 360)
      settle(g, 900)
    },
    // NAIK / TURUN: a ladder extends (or retracts) one rung per level from Mojo to the real perch point of the
    // raised thing beside it (MojoBoardLook.perchNear: the cat's feet on the tall tree, the friend on the balcony,
    // the lamp head); the rung spacing is scaled so the top rung of the needed height lands there. The marker ticks
    // each rung. After NAIK the ladder stays standing (Mojo is up there); TURUN retracts it back into Mojo.
    lift: function (r, c, from, to, stepMs) {
      var g = group('lift'), s = cell(), p = cc(r, c), n = Math.abs(to - from)
      if (!n) { settle(g, 10); return 0 }
      var L = (stand && stand.r === r && stand.c === c) ? stand : null
      if (!L) { dropStand(); L = ladderGeo(r, c, Math.max(from, to)) }
      else stand = null   // TURUN (or more NAIK) takes the standing ladder over; it is re-stood at the end if still up
      var lad = L.wrap || ladderNode(L, Math.max(from, to))
      if (lad) {
        if (g.nodes.indexOf(lad) < 0) g.nodes.push(lad)
        var inner = lad.firstChild, len = L.len
        var at = function (v) { return 'translateY(' + Math.max(0, len - Math.max(v, 0) * L.unit).toFixed(1) + 'px)' }
        if (RM) {
          inner.style.transform = at(to)
          play(lad, to > 0 ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], Math.min(n * stepMs, 500), 'ease')
        } else {
          var kf = []; for (var k = 0; k <= n; k++) kf.push({ transform: at(from + (to > from ? k : -k)), offset: k / n })
          play(inner, kf, n * stepMs, 'steps(' + n + ',end)')
          if (to <= 0) play(lad, [{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], n * stepMs + 200, 'linear')
        }
      }
      seq(g, 'gravity', p[0], p[1], s * 1.15, n * stepMs, { loop: 1, z: 1, opacity: '0.7' })
      for (var i = 1; i <= n; i++) (function (i) {
        var v = from + (to > from ? i : -i), q = L.at(Math.max(v, 0))
        later(function () {
          var m = node(g, 'mfx-tick', q[0] + L.nx * s * 0.42, q[1] + L.ny * s * 0.42 - s * 0.1, s * 0.42, s * 0.42, 9)
          if (m) { m.textContent = String(v); play(m, RM ? [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.3 }, { transform: 'scale(1)', opacity: 1, offset: 0.7 }, { transform: 'scale(.8)', opacity: 0 }], Math.max(stepMs + 120, 380), EOUT) }
          seq(g, 'spark1', q[0], q[1], s * 0.55, 220)   // the rattle of one rung locking
          dots(g, q[0], q[1], 4, '#FFD54F', s * 0.25, 260, Math.max(4, s * 0.06))
          if (cfg.tick) cfg.tick(v, i === n)
        }, (i - 1) * stepMs + stepMs * 0.5)
      })(i)
      if (to > 0 && lad) {   // NAIK: the ladder stays up once it is out; the group retires without it
        L.wrap = lad; L.lvl = to
        later(function () { var k = g.nodes.indexOf(lad); if (k >= 0) g.nodes.splice(k, 1); if (lad.isConnected) { stand = L; watchLift() } }, n * stepMs + 20)
      }
      settle(g, n * stepMs + 900)
      return n * stepMs
    },
    // SEMPROT: a water stream from the nozzle to the fire, a splash on impact, steam rising
    spray: function (from, to, out) {
      var g = group('spray'), s = cell(), a = cc(from[0], from[1]), b = cc(to[0], to[1])
      var dx = b[0] - a[0], dy = b[1] - a[1], ang = Math.atan2(dy, dx) * 180 / Math.PI, len = Math.sqrt(dx * dx + dy * dy)
      var jet = node(g, 'mfx-jet', a[0] + len / 2, a[1], len, s * 0.2, 7)   // left edge at the nozzle, rotated about it
      if (jet) {
        jet.style.transform = 'rotate(' + ang + 'deg)'
        play(jet, RM ? [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }] : [{ transform: 'rotate(' + ang + 'deg) scaleX(0)', opacity: 0.9 }, { transform: 'rotate(' + ang + 'deg) scaleX(1)', opacity: 1, offset: 0.35 }, { transform: 'rotate(' + ang + 'deg) scaleX(1)', opacity: 1, offset: 0.75 }, { transform: 'rotate(' + ang + 'deg) scaleX(1) scaleY(.3)', opacity: 0 }], 720, EOUT)
      }
      for (var k = 0; k < (RM ? 0 : 6); k++) (function (k) {
        var d = node(g, 'mfx-drop', a[0], a[1], s * 0.14, s * 0.14, 7); if (!d) return
        var j = ((k * 37) % 9 - 4) * s * 0.03
        play(d, [{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { transform: 'translate(' + dx * 0.15 + 'px,' + (dy * 0.15 - s * 0.08) + 'px) scale(1)', opacity: 1, offset: 0.15 }, { transform: 'translate(' + (dx + j) + 'px,' + (dy + j) + 'px) scale(1.2)', opacity: 0 }], 460, 'cubic-bezier(.3,.1,.6,1)', k * 55)
      })(k)
      later(function () {
        sprite(g, 'water-splash', b[0], b[1] + s * 0.1, s * 0.9, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.3 }, { transform: 'scale(1.25)', opacity: 0 }], 520, { z: 8 })
        // white steam (the owner's cloud) rises where the water hits; a second, bigger puff when the fire goes out
        var steam = function (dx, sz, delay, ms) { sprite(g, 'smoke', b[0] + dx, b[1] - s * 0.15, sz, [{ transform: 'translateY(0) scale(.5)', opacity: 0 }, { transform: 'translateY(-' + s * 0.2 + 'px) scale(.9)', opacity: 0.95, offset: 0.3 }, { transform: 'translateY(-' + s * 0.75 + 'px) scale(1.35)', opacity: 0 }], ms, { z: 8, delay: delay, cls: 'steam' }) }
        steam(-s * 0.1, s * 0.55, 0, 800)
        if (out) { steam(s * 0.15, s * 0.75, 180, 1000); steam(-s * 0.2, s * 0.6, 360, 1000) }
      }, 360)
      settle(g, 1500)
    },
    // push: dust at the rock's trailing edge, a little thump when it arrives
    push: function (from, to, ms) {
      var g = group('push'), s = cell(), p = cc(from[0], from[1]), dr = to[0] - from[0], dc = to[1] - from[1]
      sprite(g, 'dust-cloud', p[0] - dc * s * 0.35, p[1] - dr * s * 0.35 + s * 0.2, s * 0.75, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(.9)', opacity: 0.9, offset: 0.3 }, { transform: 'translate(' + (-dc * s * 0.3) + 'px,' + (-dr * s * 0.3) + 'px) scale(1.3)', opacity: 0 }], ms + 250)
      later(function () { var q = cc(to[0], to[1]); dots(g, q[0], q[1] + s * 0.3, 6, '#A1887F', s * 0.4, 360, Math.max(5, s * 0.07)); shake(3, 220) }, ms)
      settle(g, ms + 700)
    },
    // the rock drops into the pit: a small boom, a dust cloud, a shake and "+jalan"
    fill: function (r, c) {
      var g = group('fill'), s = cell(), p = cc(r, c)
      seq(g, 'smoke', p[0], p[1] - s * 0.1, s * 1.05, 520, { blend: false, filter: 'sepia(.6) brightness(.95)' })   // the thud: a puff of earth
      sprite(g, 'dust', p[0], p[1] + s * 0.1, s * 0.95, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.85, offset: 0.3 }, { transform: 'translateY(-' + s * 0.15 + 'px) scale(1.35)', opacity: 0 }], 800, { delay: 80 })
      dots(g, p[0], p[1], 8, '#8D6E63', s * 0.6, 460, Math.max(6, s * 0.08))
      shake(6, 300)
      text(g, p[0], p[1] - s * 0.45, '+jalan', '#2E7D32')
      settle(g, 1300)
    },
    // jump: a boost flame at take-off, a speed trail along the arc, a squash and dust on landing
    jump: function (from, to, ms) {
      dropStand(true)
      var g = group('jump'), s = cell(), a = cc(from[0], from[1]), b = cc(to[0], to[1])
      var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
      var bx = Math.cos(ang * Math.PI / 180), by = Math.sin(ang * Math.PI / 180)
      var fl = sprite(g, 'boost-flame-sheet13', a[0] - bx * s * 0.55, a[1] - by * s * 0.55 + s * 0.12, s * 0.62, [{ transform: 'rotate(' + (ang + 180) + 'deg) scale(.3)', opacity: 0 }, { transform: 'rotate(' + (ang + 180) + 'deg) scale(1.1)', opacity: 1, offset: 0.3 }, { transform: 'rotate(' + (ang + 180) + 'deg) scale(.6)', opacity: 0 }], 420, { cls: 'under' })
      var tl = Math.hypot(b[0] - a[0], b[1] - a[1]), tr = node(g, 'mfx-spr', a[0] + tl / 2, a[1] - s * 0.1, tl, s * 0.5, 2)
      if (tr) tr.style.transformOrigin = '0 50%'
      if (tr) { tr.style.backgroundImage = 'url("' + spriteUrl('speed-trail') + '")'; tr.style.backgroundSize = '100% 100%'; play(tr, RM ? [{ opacity: 0 }, { opacity: 0.8 }, { opacity: 0 }] : [{ transform: 'rotate(' + ang + 'deg) scaleX(0)', opacity: 0.9 }, { transform: 'rotate(' + ang + 'deg) scaleX(1)', opacity: 0.85, offset: 0.6 }, { transform: 'rotate(' + ang + 'deg) scaleX(1)', opacity: 0 }], ms + 200, EOUT) }
      later(function () {
        sprite(g, 'dust', b[0], b[1] + s * 0.25, s * 0.8, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.9, offset: 0.3 }, { transform: 'scale(1.4)', opacity: 0 }], 520)
        dots(g, b[0], b[1] + s * 0.3, 6, '#BCAAA4', s * 0.45, 380, Math.max(5, s * 0.07))
      }, ms - 40)
      settle(g, ms + 800)
      return fl
    },
    // rescue: holy light on the friend; with the friend's id it hops down from its perch in an arc into Mojo's
    // basket (squash on landing, onLand() lets the game mark it rescued: the board look's purr/meow fire then),
    // rides on Mojo a moment and leaves in a burst of hearts and "Selamat!". Returns the ms until it has landed
    // (0 = no hop staged: the caller keeps its old animation).
    rescue: function (r, c, id, mrc, onLand) {
      var g = group('rescue'), s = cell(), p = cc(r, c)
      var ob = id != null && layer() && layer().parentNode.querySelector('#objs > .ob[data-id="' + id + '"]')
      var img = ob && ob.querySelector('img.main'), mj = D.getElementById('mojo'), fx = layer()
      var hop = !!(img && mj && fx && mrc && img.offsetWidth)
      var a = hop ? boxIn(img) : null, mb = hop ? boxIn(mj) : null
      var src = p
      if (a) src = [a.x + a.w / 2, a.y + a.h * 0.55]
      // the glow frames screen onto the board: kept inside it (above its top edge they would show their black)
      seq(g, 'holy-light', src[0], Math.max(src[1], s * 0.66), s * 1.3, 560, { loop: 2, z: 7 })
      if (!hop) {
        hearts(g, p[0], p[1], 300)
        later(function () { text(g, p[0], p[1] - s * 0.55, 'Selamat!', '#D81B60') }, 500)
        settle(g, 1700)
        return 0
      }
      var T0 = 220, HOP = 560, SQ = 170, RIDE = 900
      var k = 0.55, fw = a.w, fh = a.h, fx0 = a.x + fw / 2, fy0 = a.y + fh          // the friend's feet
      var bx = mb.x + mb.w / 2, by = mb.y + mb.h * 0.42                               // the basket on Mojo
      var rider = node(g, 'mfx-img mfx-rider', fx0, fy0 - fh / 2, fw, fh, 10)
      if (!rider) return 0
      rider.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")'
      rider.style.transformOrigin = '50% 100%'
      img.style.visibility = 'hidden'                                                 // the real one leaves its perch
      g.onKill = function () { img.style.visibility = '' }
      var dx = bx - fx0, dy = by - fy0
      if (RM) {   // fades only: it leaves the perch and appears on Mojo
        rider.style.opacity = '0'
        play(rider, [{ opacity: 1 }, { opacity: 0 }], 260, 'ease', T0)
        var r2 = node(g, 'mfx-img mfx-rider', bx, by - fh * k / 2, fw * k, fh * k, 10)
        if (r2) { r2.style.backgroundImage = rider.style.backgroundImage; play(r2, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], HOP + SQ + RIDE + 300, 'ease', T0 + 200) }
      } else {
        var kf = [{ transform: 'translate(0,0) scale(1)', offset: 0 }], N = 10, up = s * 0.45 + Math.max(0, -dy) * 0.1
        for (var i = 1; i <= N; i++) {
          var t = i / N, y = dy * t - 4 * up * t * (1 - t), sc = 1 + (k - 1) * t
          kf.push({ transform: 'translate(' + (dx * t).toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (Math.sin(t * Math.PI) * (dx >= 0 ? 12 : -12)).toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')', offset: t * HOP / (HOP + SQ) })
        }
        var end = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) '
        kf[kf.length - 1].easing = EOUT
        kf.push({ transform: end + 'scale(' + (k * 1.28).toFixed(3) + ',' + (k * 0.72).toFixed(3) + ')', offset: (HOP + SQ * 0.4) / (HOP + SQ) })
        kf.push({ transform: end + 'scale(' + k + ')', offset: 1 })
        play(rider, kf, HOP + SQ, 'linear', T0)
        // riding: a little bob on Mojo, then it pops away in the hearts
        later(function () {
          if (!rider.isConnected) return
          play(rider, [{ transform: end + 'scale(' + k + ')', opacity: 1 }, { transform: end + 'translateY(-' + (s * 0.05).toFixed(1) + 'px) scale(' + k + ')', opacity: 1, offset: 0.25 }, { transform: end + 'scale(' + k + ')', opacity: 1, offset: 0.5 }, { transform: end + 'translateY(-' + (s * 0.05).toFixed(1) + 'px) scale(' + k + ')', opacity: 1, offset: 0.75 }, { transform: end + 'scale(' + (k * 1.25) + ')', opacity: 0 }], RIDE + 300, 'ease-in-out')
        }, T0 + HOP + SQ)
      }
      later(function () {
        dots(g, bx, by, 8, '#FF8FB1', s * 0.45, 420, Math.max(5, s * 0.07))
        if (onLand) try { onLand() } catch (e) { console.warn('[MojoFX] rescue land', e) }
      }, T0 + HOP)
      later(function () { hearts(g, bx, by - fh * k * 0.5, 0); text(g, bx, by - s * 0.75, 'Selamat!', '#D81B60') }, T0 + HOP + SQ + RIDE * 0.45)
      settle(g, T0 + HOP + SQ + RIDE + 500)
      return T0 + HOP + SQ
    },
    // repair: three hammer hits, each with sparks, then a shine
    repair: function (r, c, hitMs, hit, hammerSrc) {
      var g = group('repair'), s = cell(), p = cc(r, c)
      var hm = hammerSrc && node(g, 'mfx-img', p[0] + s * 0.32, p[1] - s * 0.42, s * 0.55, s * 0.55, 9)
      if (hm) {   // the hammer swings down three times
        hm.style.backgroundImage = 'url("' + hammerSrc + '")'; hm.style.transformOrigin = '80% 80%'
        var kf = [{ transform: 'rotate(-10deg)', opacity: 0 }]
        for (var j = 0; j < 3; j++) kf.push({ transform: 'rotate(-55deg)', opacity: 1, offset: (j + 0.55) / 3.4 }, { transform: 'rotate(12deg)', opacity: 1, offset: (j + 1) / 3.4 })
        kf.push({ transform: 'rotate(0)', opacity: 0 })
        play(hm, RM ? [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }] : kf, hitMs * 3.4, 'linear', -hitMs * 0.75)
      }
      for (var k = 0; k < 3; k++) (function (k) {
        later(function () {
          sprite(g, 'sparks', p[0] + (k - 1) * s * 0.14, p[1] - s * 0.12, s * 0.6, [{ transform: 'scale(.3) rotate(' + (k * 40) + 'deg)', opacity: 0 }, { transform: 'scale(1) rotate(' + (k * 40 + 20) + 'deg)', opacity: 1, offset: 0.3 }, { transform: 'scale(1.2)', opacity: 0 }], 320, { z: 8 })
          seq(g, 'spark1', p[0], p[1] - s * 0.1, s * 0.7, 260, { z: 8 })
          if (hit) hit(k)
        }, k * hitMs)
      })(k)
      later(function () {
        seq(g, 'regen', p[0], p[1], s * 1.2, 560)
        sprite(g, 'repair-sparks', p[0] - s * 0.3, p[1] - s * 0.35, s * 0.5, [{ transform: 'scale(.3) rotate(-30deg)', opacity: 0 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: 0.35 }, { transform: 'scale(1) rotate(10deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(.8)', opacity: 0 }], 620, { z: 9 })
        sprite(g, 'sparkle', p[0] + s * 0.28, p[1] - s * 0.28, s * 0.4, [{ transform: 'scale(0) rotate(0)', opacity: 0 }, { transform: 'scale(1) rotate(90deg)', opacity: 1, offset: 0.4 }, { transform: 'scale(.2) rotate(180deg)', opacity: 0 }], 520)
      }, 3 * hitMs)
      settle(g, 3 * hitMs + 800)
      return 3 * hitMs
    },
    // a goal reached (the flag): checkpoint ring + fireworks
    goal: function (r, c) {
      var g = group('goal'), s = cell(), p = cc(r, c)
      sprite(g, 'checkpoint', p[0], p[1], s * 1.1, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.35 }, { transform: 'scale(1.3)', opacity: 0 }], 800, { z: 2, cls: 'under' })
      sprite(g, 'fireworks', p[0], p[1] - s * 0.5, s * 1.2, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.2)', opacity: 0 }], 900, { delay: 150, z: 9 })
      settle(g, 1300)
    },
    // a beat done: a level-up badge swoops over Mojo and a regen glow
    beat: function (r, c) {
      dropStand(true)
      var g = group('beat'), s = cell(), p = cc(r, c)
      seq(g, 'regen', p[0], p[1], s * 1.3, 640, { z: 7 })
      sprite(g, 'level-up', p[0], p[1] - s * 0.6, s * 0.9, [{ transform: 'translateY(20px) scale(.4)', opacity: 0 }, { transform: 'translateY(0) scale(1.1)', opacity: 1, offset: 0.35 }, { transform: 'translateY(-6px) scale(1)', opacity: 1, offset: 0.8 }, { transform: 'translateY(-18px)', opacity: 0 }], 1100, { z: 9 })
      settle(g, 1300)
    }
  }

  /* the result card: owner confetti sprites falling over the screen (a fixed layer, not the board) */
  function confetti (host, n) {
    dropStand(true)
    if (RM || !host) return
    var keys = ['confetti', 'confetti2', 'confetti-sheet13', 'confetti-sheet03', 'sparkle']
    var w = W.innerWidth, h = W.innerHeight, g = group('confetti')
    for (var k = 0; k < (n || 28); k++) {
      var p = D.createElement('i'); p.className = 'mfx-conf'; p.setAttribute('aria-hidden', 'true')
      var sz = 26 + (k * 13 % 22), x = w * ((k * 37 % 100) / 100), dx = ((k * 53 % 40) - 20) * 3
      p.style.cssText = 'left:' + x + 'px;top:-40px;width:' + sz + 'px;height:' + sz + 'px;background-image:url("' + spriteUrl(keys[k % keys.length]) + '")'
      host.appendChild(p); g.nodes.push(p)
      play(p, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + (h * 0.95) + 'px) rotate(' + (k * 47 % 360 + 200) + 'deg)', opacity: 0.3 }], 1500 + (k % 7) * 140, 'cubic-bezier(.25,.6,.4,1)', (k % 9) * 40)
    }
    settle(g, 2700)
  }

  var API = {
    CAP: CAP,
    init: function (o) { cfg = o },
    clear: function () { timers.forEach(W.clearTimeout); timers = []; groups.slice().forEach(kill); groups = []; dropStand() },
    standing: function () { return stand ? { r: stand.r, c: stand.c, lvl: stand.lvl, unit: stand.unit, perch: stand.perch } : null },
    live: function () { return groups.length },
    names: function () { return groups.map(function (g) { return g.name }) },
    reduced: function () { return RM },
    setReduced: function (v) { RM = !!v },
    shake: shake,
    confetti: confetti,
    // every picture the effects use (warmed for offline play)
    files: function () {
      var o = ['dust', 'skid', 'tire-smoke', 'portal', 'collect', 'sparkle', 'dust-cloud', 'water-splash', 'smoke', 'sparks', 'repair-sparks', 'checkpoint', 'fireworks', 'level-up', 'boost-flame-sheet13', 'speed-trail', 'confetti', 'confetti2', 'confetti-sheet13', 'confetti-sheet03'].map(spriteUrl)
      o.push(cfg.lib('mojo-chase/items/heart'))
      ;['electric-aura', 'sparks', 'gravity', 'smoke', 'holy-light', 'spark1', 'regen'].forEach(function (f) { o = o.concat(frames(f)) })
      return o
    }
  }
  for (var k in FX) API[k] = FX[k]
  W.MojoFX = API
})(window, document);
