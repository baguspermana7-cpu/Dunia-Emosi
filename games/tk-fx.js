/* ============================================================================
 * tk-fx.js — G30 Timmy & Kapal Legendaris grid VFX (window.TKFx). The Mojo board VFX (games/mojo-fx.js), ported.
 * ---------------------------------------------------------------------------
 * Owner 2026-10-04: "Apply the improvements made in the Mojo game to the other games too, especially the Timmy
 * game." Every grid command shows what it physically does: a move throws a wake spray off the stern; a turn churns
 * foam; a bump sends a splash up at the contact point and jolts the board; a pickup bursts sparkles before the
 * crate flies to the bag; a drop splashes and rings; a whirlpool swirls; the goal lights a ring and fireworks.
 * On the deck theme (Timmy walking) the water becomes dust.
 *
 * Art: the shared owner effect sprites (assets/db/lib/mojo-fx/*, single frames moved with transform/opacity) and
 * the shared VFX frame packs (games/vfx-engine.js registry -> assets/vfx/<pack>/<fx>/f-N.webp).
 *
 * Wiring: TKGrid.mount calls TKFx.init({ board, cell, lib, later, cancel, theme }) and guards every call with
 * `if (G.TKFx)`; nothing here touches the game's state, it only decorates the board.
 * Safety (as MojoFX):
 *  - epoch-safe: clear() removes every node and timer; the grid calls it on reset, on a new run and on destroy.
 *  - at most CAP (6) effects alive; a new one retires the oldest.
 *  - timers run on the grid's own pausable clock (cfg.later), so the pause menu freezes effects too; the nodes sit
 *    inside the grid root, whose animations the pause already freezes.
 *  - prefers-reduced-motion: fades in place only (no movement, shake or frame loops).
 *  - transform/opacity only; a frame loop swaps a background image on a timer (never per rAF).
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var CAP = 6
  var cfg = null, groups = [], timers = []
  var MEDIA_RM = false
  try { MEDIA_RM = !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch (e) {}
  var RM = MEDIA_RM
  var EOUT = 'cubic-bezier(.23,1,.32,1)'
  var VFXBASE = (function () {
    try { var s = D.currentScript; if (s && s.src) return s.src.replace(/[^/]*$/, '') + '../assets/vfx/' } catch (e) {}
    return '../assets/vfx/'
  })()

  function cell () { return (cfg && cfg.cell && cfg.cell()) || 64 }
  function deck () { return !!(cfg && cfg.theme === 'deck') }
  function spriteUrl (k) { return cfg && cfg.lib ? cfg.lib('mojo-fx/' + k) : '' }
  function frames (fx) {
    var r = W.VFX && W.VFX._registry && W.VFX._registry[fx]; if (!r) return []
    var out = []; for (var i = 1; i <= r.frames; i++) out.push(VFXBASE + r.dir + '/' + fx + '/f-' + i + '.webp')
    return out
  }
  function later (fn, ms) {
    var t = null
    var run = function () { var k = timers.indexOf(t); if (k >= 0) timers.splice(k, 1); fn() }
    t = cfg && cfg.later ? cfg.later(run, ms) : W.setTimeout(run, ms)
    timers.push(t)
    return t
  }
  function cancel (t) { try { if (cfg && cfg.cancel) cfg.cancel(t); else W.clearTimeout(t) } catch (e) {} }

  /* styles: injected once (no stylesheet line needed). The layer has NO z-index, so its nodes stack with the board's
     own pieces: z 1 lies under the boat (z 5), the default 7 above it. */
  var CSS = '.tkfx{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none}' +
    '.tkfx-n{position:absolute;display:block;pointer-events:none;z-index:7;will-change:transform,opacity}' +
    '.tkfx-spr,.tkfx-seq{background:center/contain no-repeat}.tkfx-seq{mix-blend-mode:screen;border-radius:50%;-webkit-mask-image:radial-gradient(circle,#000 45%,transparent 70%);mask-image:radial-gradient(circle,#000 45%,transparent 70%)}' +
    '.tkfx-dot{border-radius:50%;box-shadow:0 0 0 1px rgba(255,255,255,.5)}' +
    '.tkfx-ring{border-radius:50%;border:3px solid rgba(230,248,255,.85)}'
  function injectCSS () {
    if (D.getElementById('tkfx-css')) return
    var st = D.createElement('style'); st.id = 'tkfx-css'; st.textContent = CSS; (D.head || D.documentElement).appendChild(st)
  }

  /* the layer: one per board, above the pieces, never catching a tap */
  function layer () {
    var b = cfg && cfg.board; if (!b) return null
    var l = b.querySelector(':scope > .tkfx')
    if (!l) { l = D.createElement('div'); l.className = 'tkfx'; l.setAttribute('aria-hidden', 'true'); b.appendChild(l) }
    return l
  }
  function group (name) {
    var g = { name: name, nodes: [] }
    groups.push(g)
    while (groups.length > CAP) kill(groups[0])
    return g
  }
  function kill (g) {
    g.nodes.forEach(function (n) { try { if (n.parentNode) n.parentNode.removeChild(n) } catch (e) {} })
    g.nodes = []
    var k = groups.indexOf(g); if (k >= 0) groups.splice(k, 1)
  }
  function settle (g, ms) { later(function () { kill(g) }, ms) }
  function node (g, cls, x, y, w, h, z) {
    var host = layer(); if (!host) return null
    var n = D.createElement('i')
    n.className = 'tkfx-n ' + (cls || '')
    n.style.cssText = 'left:' + (x - w / 2) + 'px;top:' + (y - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px' + (z ? ';z-index:' + z : '')
    host.appendChild(n); g.nodes.push(n)
    return n
  }
  function play (n, kf, ms, ease, delay) {
    if (!n || !n.animate) return null
    try { return n.animate(kf, { duration: ms, easing: ease || EOUT, fill: 'both', delay: delay || 0 }) } catch (e) { return null }
  }
  function sprite (g, key, x, y, size, kf, ms, opts) {
    opts = opts || {}
    var n = node(g, 'tkfx-spr' + (opts.cls ? ' ' + opts.cls : ''), x, y, size, size, opts.z)
    if (!n) return null
    n.style.backgroundImage = 'url("' + spriteUrl(key) + '")'
    if (RM) play(n, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], Math.min(ms, 400), 'ease', opts.delay)
    else play(n, kf, ms, opts.ease, opts.delay)
    return n
  }
  function seq (g, fx, x, y, size, ms, opts) {
    opts = opts || {}
    var urls = frames(fx); if (!urls.length) return null
    var n = node(g, 'tkfx-seq', x, y, size, size, opts.z)
    if (!n) return null
    if (RM) { n.style.backgroundImage = 'url("' + urls[Math.floor(urls.length / 2)] + '")'; play(n, [{ opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { opacity: 0 }], 400, 'ease'); return n }
    var per = Math.max(28, Math.round(ms / urls.length)), i = 0
    n.style.opacity = '0'
    var step = function () {
      if (!n.isConnected) return
      if (i >= urls.length) { n.style.opacity = '0'; return }
      n.style.backgroundImage = 'url("' + urls[i] + '")'; n.style.opacity = '1'; i++
      later(step, per)
    }
    later(step, opts.delay || 0)
    return n
  }
  function dots (g, x, y, n, color, spread, ms, size, up) {
    if (RM) return
    for (var k = 0; k < n; k++) {
      var a = up ? -Math.PI / 2 + ((k / (n - 1 || 1)) - 0.5) * 2.2 : (k / n) * Math.PI * 2 + (k % 2) * 0.3
      var d = spread * (0.6 + (k * 37 % 40) / 100)
      var p = node(g, 'tkfx-dot', x, y, size, size); if (!p) return
      p.style.background = color
      var fall = up ? spread * 0.5 : 0
      play(p, [{ transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + (Math.cos(a) * d * 0.7) + 'px,' + (Math.sin(a) * d) + 'px) scale(.8)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + (Math.cos(a) * d) + 'px,' + (Math.sin(a) * d * 0.6 + fall) + 'px) scale(.3)', opacity: 0 }], ms, 'cubic-bezier(.2,.7,.4,1)')
    }
  }
  function shake (px, ms) {
    if (RM) return
    var b = cfg && cfg.board; if (!b || !b.animate) return
    var k = []; for (var i = 0; i < 6; i++) k.push({ translate: ((i % 2 ? -1 : 1) * px * (1 - i / 6)) + 'px ' + ((i % 3 - 1) * px * 0.5 * (1 - i / 6)) + 'px' })
    k.push({ translate: '0 0' })
    try { b.animate(k, { duration: ms || 260, easing: 'linear' }) } catch (e) {}
  }
  function cc (x, y) { var s = cell(); return [(x + 0.5) * s, (y + 0.5) * s] }
  function deg (dx, dy) { return Math.atan2(dy, dx) * 180 / Math.PI }

  /* ── the effects (board tile coordinates: x = column, y = row) ───────────── */
  var FX = {
    // the boat leaves a tile: spray thrown off the stern + a short speed streak; on deck a dust puff behind Timmy
    move: function (fx, fy, tx, ty) {
      var g = group('move'), s = cell(), p = cc(fx, fy), dx = tx - fx, dy = ty - fy
      var x = p[0] + dx * s * 0.12, y = p[1] + dy * s * 0.12 + s * 0.16
      if (deck()) {
        sprite(g, 'dust-cloud', x, y, s * 0.5, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(.85)', opacity: 0.75, offset: 0.25 }, { transform: 'translate(' + (-dx * s * 0.2) + 'px,' + (-dy * s * 0.2 - s * 0.06) + 'px) scale(1.2)', opacity: 0 }], 560)
      } else {
        sprite(g, 'snow-spray', x, y, s * 0.55, [{ transform: 'rotate(' + deg(-dx, -dy) + 'deg) scale(.4)', opacity: 0 }, { transform: 'rotate(' + deg(-dx, -dy) + 'deg) scale(.9)', opacity: 0.85, offset: 0.25 }, { transform: 'translate(' + (-dx * s * 0.22) + 'px,' + (-dy * s * 0.22) + 'px) rotate(' + deg(-dx, -dy) + 'deg) scale(1.2)', opacity: 0 }], 620)
        sprite(g, 'speed-trail', p[0] + dx * s * 0.5, p[1] + dy * s * 0.5, s * 0.6, [{ transform: 'rotate(' + deg(dx, dy) + 'deg) scaleX(.3)', opacity: 0 }, { transform: 'rotate(' + deg(dx, dy) + 'deg) scaleX(1)', opacity: 0.6, offset: 0.35 }, { transform: 'rotate(' + deg(dx, dy) + 'deg) scaleX(1.1)', opacity: 0 }], 460, { delay: 60 })
      }
      settle(g, 800)
    },
    // a turn on the spot: foam churns round the hull
    turn: function (x, y) {
      var g = group('turn'), s = cell(), p = cc(x, y)
      var ring = node(g, 'tkfx-ring', p[0], p[1] + s * 0.08, s * 0.8, s * 0.5, 1)
      if (ring) { if (deck()) ring.style.borderColor = 'rgba(160,120,80,.6)'; play(ring, RM ? [{ opacity: 0.8 }, { opacity: 0 }] : [{ transform: 'scale(.6)', opacity: 0.9 }, { transform: 'scale(1.35)', opacity: 0 }], 520) }
      if (!deck()) sprite(g, 'splash', p[0] + s * 0.3, p[1] + s * 0.18, s * 0.3, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.85, offset: 0.35 }, { transform: 'translateY(-6px) scale(1.1)', opacity: 0 }], 480)
      settle(g, 700)
    },
    // blocked: a splash (or dust) jumps up where the hull met the obstacle, droplets fly, the board jolts
    bump: function (bx, by, tx, ty) {
      var g = group('bump'), s = cell(), p = cc(bx, by), dx = tx - bx, dy = ty - by
      var x = p[0] + dx * s * 0.42, y = p[1] + dy * s * 0.42
      sprite(g, deck() ? 'dust-cloud' : 'water-splash', x, y - s * 0.08, s * 0.8, [{ transform: 'translateY(8px) scale(.3)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.05)', opacity: 1, offset: 0.3 }, { transform: 'translateY(-10px) scale(1.2)', opacity: 0 }], 720, { z: 7 })
      dots(g, x, y, 7, deck() ? '#BCAAA4' : '#E1F5FE', s * 0.45, 620, Math.max(5, s * 0.07), true)
      shake(4, 280)
      settle(g, 950)
    },
    // a crate / key / flag taken: a sparkle burst and a shower of sparks
    pickup: function (x, y) {
      var g = group('pickup'), s = cell(), p = cc(x, y)
      sprite(g, 'collect', p[0], p[1], s * 0.85, [{ transform: 'scale(.3) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.1) rotate(0)', opacity: 1, offset: 0.35 }, { transform: 'translateY(-10px) scale(1.3) rotate(10deg)', opacity: 0 }], 620, { z: 7 })
      seq(g, 'sparks', p[0], p[1] - s * 0.1, s * 0.9, 380)
      settle(g, 850)
    },
    // the cargo set down on the drop tile: a splash ring on the water (a dust ring on deck)
    drop: function (x, y) {
      var g = group('drop'), s = cell(), p = cc(x, y)
      sprite(g, 'checkpoint', p[0], p[1] + s * 0.12, s * 0.8, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.9, offset: 0.35 }, { transform: 'scale(1.2)', opacity: 0 }], 760, { z: 1 })
      if (!deck()) sprite(g, 'water-splash', p[0], p[1] + s * 0.05, s * 0.6, [{ transform: 'translateY(6px) scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.9, offset: 0.35 }, { transform: 'translateY(-6px) scale(1.1)', opacity: 0 }], 600, { delay: 80 })
      settle(g, 950)
    },
    // a whirlpool hop: a blue swirl at the mouth
    warp: function (x, y) {
      var g = group('warp'), s = cell(), p = cc(x, y)
      sprite(g, 'portal', p[0], p[1], s * 1.05, [{ transform: 'rotate(0) scale(.3)', opacity: 0 }, { transform: 'rotate(200deg) scale(1)', opacity: 0.9, offset: 0.4 }, { transform: 'rotate(420deg) scale(.6)', opacity: 0 }], 760, { z: 1 })
      settle(g, 900)
    },
    // the goal: a ring of light under the boat and fireworks above it
    goal: function (x, y) {
      var g = group('goal'), s = cell(), p = cc(x, y)
      sprite(g, 'checkpoint', p[0], p[1] + s * 0.1, s * 1.05, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.05)', opacity: 1, offset: 0.35 }, { transform: 'scale(1.3)', opacity: 0 }], 900, { z: 1 })
      sprite(g, 'fireworks', p[0] - s * 0.25, p[1] - s * 0.55, s * 1.1, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.2)', opacity: 0 }], 950, { delay: 120, z: 8 })
      sprite(g, 'fireworks', p[0] + s * 0.35, p[1] - s * 0.35, s * 0.8, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.2)', opacity: 0 }], 900, { delay: 420, z: 8 })
      settle(g, 1500)
    }
  }

  var API = {
    CAP: CAP,
    init: function (o) { API.clear(); cfg = o || null; RM = cfg && cfg.rm != null ? !!cfg.rm : MEDIA_RM; injectCSS() },
    // the grid that owns the layer is going away: drop everything (a newer grid's effects are left alone)
    release: function (board) { if (cfg && cfg.board === board) { API.clear(); cfg = null } },
    clear: function () {
      timers.forEach(cancel); timers = []
      groups.slice().forEach(kill); groups = []
      var l = cfg && cfg.board && cfg.board.querySelector(':scope > .tkfx'); if (l) l.textContent = ''
    },
    live: function () { return groups.length },
    names: function () { return groups.map(function (g) { return g.name }) },
    reduced: function () { return RM },
    setReduced: function (v) { RM = !!v },
    // every picture the effects use (warmed for offline play by timmy-kapal.js warmList)
    files: function (lib) {
      var f = lib || (cfg && cfg.lib), o = []
      if (f) ['snow-spray', 'speed-trail', 'splash', 'water-splash', 'dust-cloud', 'collect', 'checkpoint', 'portal', 'fireworks'].forEach(function (k) { o.push(f('mojo-fx/' + k)) })
      return o.concat(frames('sparks'))
    }
  }
  for (var k in FX) API[k] = (function (fn) { return function () { if (!cfg || !cfg.board) return; try { fn.apply(null, arguments) } catch (e) { if (W.console) console.warn('[TKFx]', e) } } })(FX[k])
  W.TKFx = API
})(window, document);
