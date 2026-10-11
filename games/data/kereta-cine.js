/* =============================================================================
 * kereta-cine.js — cinematic story beats on the Brave Locomotive board (owner 2026-10-11: "ngebut, ngerem mendadak ada
 * kura2 ... efek asap banyak saat rem", "Bener2 realistic dan cinematic align"). Every moment is data on a level or beat
 * (`cine`) and every effect comes from the shared bank (VFX.play ids of games/data/vfx-db.js, see docs/KERETA-VFX-PLAN.md).
 *   cine.speed   speed lines + streaming steam while Linus runs
 *   cine.heavy   heavy climb: wheel dust + thick steam per move
 *   cine.brake   {obj}: when a move ends next to that object, SUDDEN BRAKE: big smoke, wheel sparks, Linus squashes
 *                forward, Henry lurches in the cab, slow motion, a short push-in with letterbox, then on
 *   cine.start / cine.end   {letterbox ms, zoom {at, s, ms}, fx [{id, at, size, delay, filter}], sfx}
 * The board stays FLAT: a zoom is a plain scale about one cell (never a tilt). Transform / opacity only. Under
 * prefers-reduced-motion nothing zooms or slows; the effects shrink to a single fade (the engine does that).
 * Loaded after kereta-story.js; the engine only calls def.onPlay(ctx) and def.onHud(ctx).
 * ==========================================================================*/
(function (W) {
  'use strict'
  var P = W.MojoPack, def = P && P.def
  if (!def || def.id !== 'kereta') return
  var D = W.document, PG = W.ProgGrid
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}
  function $ (id) { return D.getElementById(id) }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function cell () { return parseFloat(W.getComputedStyle(D.documentElement).getPropertyValue('--cell')) || 64 }
  var CUR = null, base = null, slow = 0, braked = false, fired = {}, speedT = 0

  /* ── primitives ───────────────────────────────────────────────────────── */
  function vfx (id, x, y, size, o) { def.fx.play(id, x, y, size, o) }
  function px (rc) {   // viewport px of a board cell centre (works while zoomed)
    var b = $('board'); if (!b || !CUR) return [0, 0]
    var r = b.getBoundingClientRect(), s = r.width / CUR.lv.grid.cols
    return [r.left + (rc[1] + .5) * s, r.top + (rc[0] + .5) * s, s]
  }
  function whereOf (a) {
    if (!a) return null
    if (typeof a === 'string') { var o = CUR && PG.find(CUR.w, a); return o ? [o.r, o.c] : null }
    return a
  }
  function mojoPx () { var m = $('mojo'); if (!m) return [0, 0]; var r = m.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * .84, r.width] }
  var LB = null
  function letterbox (ms) {
    if (RM) return
    if (!LB) { LB = el('div', 'k-lbox', '<i></i><i></i>'); D.body.appendChild(LB) }
    LB.classList.add('on'); clearTimeout(LB._t); LB._t = setTimeout(function () { LB.classList.remove('on') }, ms || 1600)
  }
  function zoom (at, s, ms) {
    var b = $('board'); if (RM || !b || !CUR) return
    var rc = whereOf(at) || [CUR.lv.grid.rows / 2, CUR.lv.grid.cols / 2], c = cell()
    b.style.transformOrigin = ((rc[1] + .5) * c) + 'px ' + ((rc[0] + .5) * c) + 'px'
    b.style.transition = 'transform .55s cubic-bezier(.23,1,.32,1)'; b.style.transform = 'scale(' + (s || 1.15) + ')'
    clearTimeout(b._zt); b._zt = setTimeout(function () { b.style.transform = ''; setTimeout(function () { b.style.transition = '' }, 600) }, ms || 1400)
  }
  function lurch () {   // Henry throws himself forward in the cab, then settles
    var c = $('mojo') && $('mojo').querySelector('.k-cab'); if (!c || !c.animate || RM) return
    c.animate([{ rotate: '0deg', translate: '0 0' }, { rotate: '22deg', translate: '14% -4%', offset: .3 }, { rotate: '-6deg', translate: '-3% 0', offset: .65 }, { rotate: '0deg', translate: '0 0' }], { duration: 900, easing: 'cubic-bezier(.23,1,.32,1)' })
  }
  function squashFwd () {
    var m = $('mojo-mod'); if (!m || !m.animate || RM) return
    m.animate([{ transform: 'none' }, { transform: 'translateX(9%) scale(1.16,.86)', offset: .25 }, { transform: 'translateX(-2%) scale(.95,1.06)', offset: .6 }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.23,1,.32,1)' })
  }
  function speedOn (ms) {
    var b = $('board-wrap'); if (!b || RM) return
    b.classList.add('k-speed'); clearTimeout(speedT); speedT = setTimeout(function () { b.classList.remove('k-speed') }, ms)
  }
  function wheels () { var m = mojoPx(); return [[m[0] - m[2] * .2, m[1] + m[2] * .1], [m[0] + m[2] * .2, m[1] + m[2] * .1]] }

  /* ── the moments ──────────────────────────────────────────────────────── */
  function brake () {
    var w = wheels(), m = mojoPx(), F = def.fx
    // smoke billows from the WHEELS: a big puff behind, one under each wheel set, growing and fading over about a second
    F.puff(w[0][0] - m[2] * .15, w[0][1], 190); F.puff(w[1][0], w[1][1], 150); setTimeout(function () { F.puff(m[0] - m[2] * .3, w[0][1], 210) }, 160)
    F.sparks(w[0][0], w[0][1], 64); F.sparks(w[1][0], w[1][1], 64); F.dust(m[0], w[0][1], 150)
    squashFwd(); lurch()
  }
  function run (c, spec) {
    if (!spec) return
    if (spec.letterbox) letterbox(spec.letterbox)
    if (spec.slideIn) {   // a big engine ROLLS IN from the right edge (sc7: Samson arrives and Linus looks tiny)
      var si = spec.slideIn, d = $('objs') && $('objs').querySelector('.ob[data-id="' + si.id + '"]'), cc = cell()
      if (d && d.animate && !RM) d.animate([{ translate: (si.cells * cc) + 'px 0', opacity: 0 }, { translate: (si.cells * cc * .2) + 'px 0', opacity: 1, offset: .45 }, { translate: '0 0', opacity: 1 }], { duration: si.ms || 1500, easing: 'cubic-bezier(.2,.7,.2,1)' })
    }
    if (spec.zoom) zoom(spec.zoom.at, spec.zoom.s, spec.zoom.ms)
    ;(spec.fx || []).forEach(function (f) { setTimeout(function () { var rc = whereOf(f.at), p = rc ? px(rc) : mojoPx(); for (var i = 0; i < (f.n || 1); i++) (function (i) { setTimeout(function () { vfx(f.id, p[0] + (i % 2 ? 1 : -1) * (f.spread || 0) * i, p[1] - (f.lift || 0), f.size || 120, { duration: 1000, filter: f.filter === 'dust' ? def.fx.DUST : f.filter }) }, i * 140) })(i) }, f.delay || 0) })
  }
  function cfg (lv, bi) { var b = lv.beats[bi || 0] || {}; return b.cine || lv.cine || null }
  function once (key) { if (fired[key]) return false; fired[key] = 1; return true }

  def.onPlay = function (c) {
    CUR = c
    if (!base) base = { move: c.T.move, turn: c.T.turn, act: c.T.act, gap: c.T.gap }
    if (c.n <= 1) { braked = false; slow = 0 }
    if (slow > 0) { slow--; c.T.move = 820; c.T.gap = 420 } else { c.T.move = base.move; c.T.gap = base.gap }
    var cine = cfg(c.lv, c.bi); if (!cine) return 0
    var extra = 0
    if (cine.brake && !braked) c.ev.forEach(function (e) {   // waiting right beside the object is the brake too (the child saw it coming)
      if (e.e !== 'wait') return
      var o = PG.find(c.res.world, cine.brake.obj), m = c.res.world.m
      if (o && Math.abs(o.r - m.r) + Math.abs(o.c - m.c) <= 1) { braked = true; extra = 1100; slow = 3; setTimeout(function () { brake(); if (c.snd && c.snd.clank) c.snd.clank(); letterbox(1900); zoom([m.r, m.c], 1.2, 1900) }, 120) }
    })
    c.ev.forEach(function (e) {
      if (e.e !== 'move') return
      if (cine.speed && !braked) { c.T.move = 320; speedOn(c.T.move + 260); setTimeout(function () { var m = mojoPx(); vfx('bk-smoke-05', m[0] - m[2] * .45, m[1] - m[2] * .5, 80, { duration: 700 }) }, 80) }
      if (cine.heavy) setTimeout(function () { var w = wheels(), m = mojoPx(); def.fx.dust(w[0][0], w[0][1], 70); vfx('bk-smoke-01', m[0], m[1] - m[2] * .8, 120, { duration: 900 }) }, c.T.move * .55)
      if (cine.brake && !braked) {
        var o = PG.find(c.res.world, cine.brake.obj)
        if (o && Math.abs(o.r - e.to[0]) + Math.abs(o.c - e.to[1]) <= 1) {
          braked = true; extra = 1100
          setTimeout(function () { brake(); if (c.snd && c.snd.clank) c.snd.clank(); letterbox(1900); zoom(e.to, 1.2, 1900) }, c.T.move * .9)
          slow = 3
        }
      }
    })
    return extra
  }

  var lastKey = ''
  var hud0 = def.onHud
  def.onHud = function (c) {
    if (hud0) hud0(c)
    CUR = c
    var key = c.lv.id + '/' + c.bi
    if (key !== lastKey) { lastKey = key; braked = false; slow = 0; fired = {}; if (base) { } }
    var cine = cfg(c.lv, c.bi); if (!cine || !cine.end) return
    var obs = c.beat.objectives || [], done = obs.length && obs.every(function (o) { return PG.met(c.w, o) })
    if (done && once('end' + key)) run(c, cine.end)
  }
  // beat start: after the intro card is closed
  D.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('#in-go'); if (!t) return
    setTimeout(function () { if (!CUR) return; var cine = cfg(CUR.lv, CUR.bi); if (cine && cine.start && once('start' + CUR.lv.id + '/' + CUR.bi)) run(CUR, cine.start) }, 450)
  }, true)
})(typeof window !== 'undefined' ? window : globalThis)
