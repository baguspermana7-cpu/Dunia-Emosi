/* =============================================================================
 * kereta-story.js — story moments that must be SEEN on the board (owner 2026-10-11, scenarios 14-19):
 *   tow     Carter rides ON the log wagon behind Linus holding the coupling CHAIN; the chain pulls taut between them and
 *           he cracks a whip IN THE AIR (puff + "ctar"), never touching Linus. sc17: the chain strains, SNAPS (sparks), the
 *           wagon rolls back and Carter tumbles onto a sawdust pile. Level key `tow`: {id} = a real wagon object (bl12),
 *           {virtual:true, snap:'<gate id>'} = a wagon the pack draws (bl13, bl14).
 *   cave    Goro: ONE engine per level, rolling out of / backing into a cave mouth (CSS in kereta-pack.css); bl15's patrol Goro
 *           fades into the dark when it is back in the cave cell.
 *   shot    sc19: James fires a CARTOON shot as Linus passes ("DOR!", muzzle flash, white smoke); it clearly MISSES (a spark
 *           on a rock behind); Linus flinches and speeds off with extra steam. No blood, no hit.
 * Pure presentation (transform / opacity), loaded after kereta-goals.js; off under prefers-reduced-motion except the static art.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var P = W.MojoPack, def = P && P.def
  if (!def || def.id !== 'kereta') return
  var D = W.document, PG = W.ProgGrid, MA = W.MojoArt
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}
  function $ (id) { return D.getElementById(id) }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function cell () { return parseFloat(W.getComputedStyle(D.documentElement).getPropertyValue('--cell')) || 64 }
  function src (k) { return MA.src(k) }
  /* ── the pack's effect helpers (def.fx): ONLY records that look right on a light board, always through VFX.play so each
     record's own blend (screen for the black-background textures) and size are honoured. Never the hard-edged dark
     sheet bk-smoke-puff, never the electric bolts (bk-spark-*, bk-trace-*) outside a storm. See docs/KERETA-VFX-PLAN.md. ── */
  var DUST = 'sepia(1) saturate(2.4) hue-rotate(-14deg) brightness(.9)', WARM = 'sepia(1) saturate(5) hue-rotate(-18deg)'
  function vfx (id, x, y, size, o) { if (!W.VFX || !VFX.play) return; try { VFX.play(id, Object.assign({ x: x, y: y, size: size, essential: true }, o || {})) } catch (e) {} }
  // soft white-grey steam that billows up from a point: four overlapping puffs, growing and fading over ~1 s
  function puff (x, y, size) {
    var ids = ['bk-smoke-07', 'bk-smoke-01', 'bk-smoke-05', 'bk-smoke-07']
    ids.forEach(function (id, i) { setTimeout(function () { vfx(id, x + (i % 2 ? 1 : -1) * size * .12 * i, y - i * size * .1, size * (.7 + i * .12), { duration: 1000 }) }, i * 110) })
  }
  function dust (x, y, size) { vfx('bk-smoke-07', x, y, size, { filter: DUST, duration: 1000 }); vfx('bk-dirt-02', x, y - size * .1, size * .8, { filter: DUST, delay: 80 }) }
  function sparks (x, y, size) { vfx('bk-star-01', x, y, size, { filter: WARM, duration: 500 }); vfx('bk-flare-01', x, y, size * 1.2, { filter: WARM, duration: 450 }); vfx('bk-star-05', x + size * .3, y - size * .2, size * .7, { filter: WARM, duration: 450 }) }
  def.fx = { play: vfx, puff: puff, dust: dust, sparks: sparks, DUST: DUST, WARM: WARM }
  function pos (n) { var m = new W.DOMMatrix(W.getComputedStyle(n).transform); return [m.m41, m.m42] }   // layer px of a board node
  function cellXY (rc) { var c = cell(); return [rc[1] * c, rc[0] * c] }
  function toast (layer, txt, x, y, cls) {
    var t = el('b', 'k-sfx ' + (cls || ''), txt); t.style.left = x + 'px'; t.style.top = y + 'px'; layer.appendChild(t)
    setTimeout(function () { t.remove() }, 900)
  }

  /* ── the tow rig ─────────────────────────────────────────────────────────── */
  var R = null, raf = 0
  var DIR = [[0, 1], [-1, 0], [0, -1], [1, 0]]   // behind Linus for heading n, e, s, w (grid dx,dy per cell)
  function stop () { if (raf) W.cancelAnimationFrame(raf); raf = 0; if (R) { [R.wag, R.chain, R.dust].forEach(function (n) { n && n.remove() }); } R = null }
  function build (lv, w) {
    stop()
    var layer = $('objs'); if (!layer) return
    var real = lv.tow.id && PG.find(w, lv.tow.id)
    R = { lv: lv, layer: layer, virtual: !!lv.tow.virtual, snapId: lv.tow.snap, x: null, y: null, broken: false, crack: 0, seen: 0 }
    R.chain = el('i', 'k-chain')
    layer.appendChild(R.chain)
    if (R.virtual) {
      R.wag = el('div', 'k-tow'); R.wag.innerHTML = '<img class="logs" alt="" src="' + src('kereta-prop/log-stack') + '"><img class="carter" alt="" src="' + src('story-char/carter/hands-hips') + '"><i class="whip"></i><span class="k-name down">Carter</span>'
      layer.appendChild(R.wag)
    } else if (real) {
      R.wag = null; R.real = $('objs').querySelector('.ob[data-id="' + lv.tow.id + '"]')
      if (R.real && !R.real.querySelector('.whip')) { R.real.appendChild(el('i', 'whip')); R.real.appendChild(el('img', 'carter')).src = src('story-char/carter/hands-hips'); R.real.appendChild(el('span', 'k-name down', 'Carter')) }
    }
    R.dust = null
    loop()
  }
  function loop () {
    if (!R) return
    var m = $('mojo'), lay = R.layer, c = cell(), now = W.performance.now()
    if (m && lay.isConnected) {
      var p = pos(m), h = +m.getAttribute('data-heading') || 1, d = DIR[h], hz = h === 1 || h === 3
      var tx = p[0] + d[0] * c * 1.15, ty = p[1] + d[1] * c * .95
      if (R.virtual && !R.broken) {
        if (R.x == null) { R.x = tx; R.y = ty }
        R.x += (tx - R.x) * .16; R.y += (ty - R.y) * .16
        R.wag.style.transform = 'translate(' + R.x + 'px,' + R.y + 'px)'
      }
      var wx = R.virtual ? R.x : null, wy = R.virtual ? R.y : null
      if (!R.virtual && R.real) { var q = pos(R.real); wx = q[0]; wy = q[1] }
      var live = !R.virtual ? R.real && R.real.classList.contains('coupled') : !R.broken
      if (wx != null && live) {
        var ax = p[0] + c * .5, ay = p[1] + c * .62, bx = wx + c * .5, by = wy + c * .62, dx = bx - ax, dy = by - ay, L = Math.max(4, Math.sqrt(dx * dx + dy * dy))
        R.chain.style.opacity = 1
        R.chain.style.transform = 'translate(' + ax + 'px,' + ay + 'px) rotate(' + Math.atan2(dy, dx) + 'rad) scaleX(' + (L / 100) + ')'
      } else R.chain.style.opacity = 0
      // the whip cracks in the air every few seconds, away from Linus
      if (!RM && wx != null && now - R.crack > 3200 && !R.broken) {
        R.crack = now
        var host = R.wag || R.real; host.classList.add('crack'); setTimeout(function () { host && host.classList.remove('crack') }, 520)
        var r = host.getBoundingClientRect(); puff(r.left + r.width * .5, r.top + r.height * .05, 70)
        toast(lay, 'ctar!', wx + c * .5, wy - c * 1.1, 'whipc')
      }
    }
    raf = W.requestAnimationFrame(loop)
  }
  // sc17: the chain strains, snaps, Carter tumbles onto sawdust
  function snap () {
    if (!R || R.broken) return
    R.broken = true; var c = cell(), layer = R.layer
    R.chain.style.opacity = 0
    var x = R.x, y = R.y
    if (R.wag) {
      R.wag.classList.add('snapped')
      var sd = el('i', 'k-sawdust'); sd.style.transform = 'translate(' + (x - c * .7) + 'px,' + (y + c * .5) + 'px)'; layer.appendChild(sd); R.dust = sd
      var cr = R.wag.querySelector('.carter'); if (cr) { cr.src = src('story-char/carter/surprised'); setTimeout(function () { cr.src = src('story-char/carter/defeated') }, 650) }
      R.wag.style.transform = 'translate(' + (x - c * .55) + 'px,' + y + 'px)'
    }
    var r = R.layer.getBoundingClientRect(), mm = $('mojo').getBoundingClientRect()
    puff(mm.left + mm.width * .2, mm.top + mm.height * .8, 90)
    toast(layer, 'KLANG!', x + c * .9, y - c * .2, 'snapc')
    sparks(mm.left + mm.width * .25, mm.top + mm.height * .8, 70)
  }

  /* ── James's cartoon shot (sc19) ─────────────────────────────────────────── */
  var shotDone = false
  function shot (lv, w) {
    var s = lv.shot; if (!s) return
    var m = w.m, near = Math.abs(m.r - s.at[0]) + Math.abs(m.c - s.at[1]) <= 1
    if (!near) { if (Math.abs(m.r - s.at[0]) + Math.abs(m.c - s.at[1]) > 2) shotDone = false; return }
    if (shotDone) return
    shotDone = true
    var c = cell(), layer = $('objs'), xy = cellXY(s.at), hx = xy[0] + c * .78, hy = xy[1] - c * .1
    var f = el('i', 'k-muzzle'); f.style.transform = 'translate(' + hx + 'px,' + hy + 'px)'; layer.appendChild(f); setTimeout(function () { f.remove() }, 420)
    var r = layer.getBoundingClientRect(); puff(r.left + hx + c * .2, r.top + hy, 80)
    toast(layer, 'DOR!', hx + c * .1, hy - c * .5, 'dor')
    // the miss: a spark on a rock above-right of Linus, a puff in the sky
    setTimeout(function () { var mx = xy[0] + c * 1.9, my = xy[1] - c * 1.4; var sp = el('i', 'k-miss'); sp.style.transform = 'translate(' + mx + 'px,' + my + 'px)'; layer.appendChild(sp); setTimeout(function () { sp.remove() }, 700); puff(r.left + mx, r.top + my, 60); toast(layer, 'meleset!', mx, my - c * .3, 'missc') }, 260)
    var mm = $('mojo-mod'); if (mm && mm.animate && !RM) mm.animate([{ scale: '1 1' }, { scale: '1.1 .86' }, { scale: '.96 1.05' }, { scale: '1 1' }], { duration: 420, easing: 'cubic-bezier(.23,1,.32,1)' })
    var mj = $('mojo').getBoundingClientRect(); puff(mj.left + mj.width * .3, mj.top + mj.height * .3, 100)
  }

  /* ── riders in the cab and on the nose (sc30: Henry and Scarlet older in the cab, the baby turtle on Linus's front) ── */
  function ride (lv) {
    var m = $('mojo'); if (!m) return
    var spec = lv.ride || {}, c2 = m.querySelector('.k-cab2'), fr = m.querySelector('.k-front')
    if (spec.cab2) { if (!c2) { c2 = el('img', 'k-cab2'); c2.alt = ''; m.appendChild(c2) } c2.style.display = ''; c2.src = src(spec.cab2) } else if (c2) c2.style.display = 'none'
    if (spec.front) { if (!fr) { fr = el('img', 'k-front'); fr.alt = ''; m.appendChild(fr) } fr.style.display = ''; fr.src = src(spec.front) } else if (fr) fr.style.display = 'none'
  }
  /* ── the bird's nest ON Malivlak's chimney (mv09, film 4:03; owner stills): nest + bird ride the hero's chimney; after `blow` moves a puff
     of steam hurls them off (nest tumbles, bird flaps away). beat.nest = { blow: 3 }. Placed from the hero art's own box (front view). ── */
  var nestKey = '', nestMoves = 0, nestLast = '', nestGone = false
  function nest (c) {
    var m = $('mojo'); if (!m) return
    var spec = c.beat && c.beat.nest, key = c.lv.id + '/' + c.bi, ne = m.querySelector('.k-nest:not(.bird)'), bd = m.querySelector('.k-nest.bird')
    if (key !== nestKey) { nestKey = key; nestMoves = 0; nestLast = ''; nestGone = false; if (ne) ne.remove(); if (bd) bd.remove(); ne = bd = null }
    if (!spec || nestGone) return
    var img = m.querySelector('img.owner-mojo'); if (!img) return
    if (!ne) {
      ne = el('img', 'k-nest'); ne.alt = ''; ne.src = src('kereta-prop/bird-nest'); bd = el('img', 'k-nest bird'); bd.alt = ''; bd.src = src('animal/bird-blue/fly')
      m.appendChild(ne); m.appendChild(bd)
    }
    var place = function () {
      if (nestGone || !ne.isConnected) return
      var im2 = m.querySelector('img.owner-mojo') || img, mr = m.getBoundingClientRect(), ir = im2.getBoundingClientRect(), sc = (mr.width / (m.offsetWidth || mr.width)) || 1
      if (ir.height > 10) {
        var cx = (ir.left - mr.left + ir.width * 0.69) / sc, cy = (ir.top - mr.top + ir.height * 0.07) / sc
        ne.style.left = (cx - ne.offsetWidth / 2) + 'px'; ne.style.top = (cy - ne.offsetHeight * 0.8) + 'px'
        bd.style.left = (cx - bd.offsetWidth / 2) + 'px'; bd.style.top = (cy - ne.offsetHeight * 0.8 - bd.offsetHeight * 0.78) + 'px'
      }
      W.requestAnimationFrame(place)
    }
    if (!ne._placing) { ne._placing = 1; place() }
    var p = c.w.m.r + ',' + c.w.m.c
    if (nestLast && p !== nestLast) nestMoves++
    nestLast = p
    if (nestMoves >= ((spec.blow) || 3)) {
      nestGone = true
      var r = ne.getBoundingClientRect(); puff(r.left + r.width / 2, r.top, 110)
      if (!RM && ne.animate) {
        ne.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(70px,-90px) rotate(200deg)', opacity: 1, offset: .45 }, { transform: 'translate(140px,40px) rotate(420deg)', opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' })
        bd.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(-30px,-150px) scale(1.25)', opacity: 1, offset: .6 }, { transform: 'translate(-90px,-260px) scale(.8)', opacity: 0 }], { duration: 1300, easing: 'ease-out', fill: 'forwards' })
      }
      setTimeout(function () { if (ne) ne.remove(); if (bd) bd.remove() }, 1500)
    }
  }
  /* ── SUBMERGED (mv07, film 3:00-3:12): while the hero (and every coupled wagon) stands on a cell of the pond, the sprite is CLIPPED at the water surface so only
     the top ~18% (chimney + cab roof; wagons their roof) shows, a ring of ripples spreads round the chimney, and a bubble trail rises. Out of the pond the clip opens
     again (transition). level/beat key `pond` = cells (already shifted for the headroom row). ── */
  var sinkWas = false
  function clipTo (e, frac, inPond) {
    if (!e) return
    var img = e.querySelector('img.main') || e.querySelector('img.owner-mojo') || e.querySelector('img'); if (!img) return
    var er = e.getBoundingClientRect(), ir = img.getBoundingClientRect(); if (ir.height < 8) return
    var bottom = inPond ? Math.round(er.height - ((ir.top - er.top) + frac * ir.height)) : -400
    e.style.transition = RM ? 'none' : 'clip-path .55s cubic-bezier(.23,1,.32,1)'
    e.style.clipPath = 'inset(-400px -400px ' + bottom + 'px -400px)'
  }
  function sink (c) {
    var lv = c.lv, spec = (c.beat && c.beat.pond) || lv.pond, objs = $('objs'), m = $('mojo'); if (!spec || !objs || !m) { var o0 = D.querySelector('.k-sinkrp'); if (o0) o0.remove(); return }
    var set = {}; spec.forEach(function (p) { set[p[0] + ',' + p[1]] = 1 })
    var inP = !!set[c.w.m.r + ',' + c.w.m.c]
    clipTo(m, 0.2, inP)
    ;[].forEach.call(objs.querySelectorAll('.ob[data-id]'), function (e) {
      var o = PG.find(c.w, e.getAttribute('data-id')); if (!o || o.type !== 'wagon') return
      clipTo(e, 0.3, !!set[o.r + ',' + o.c])
    })
    var rp = objs.querySelector('.k-sinkrp')
    if (!inP) { if (rp) rp.style.opacity = '0'; sinkWas = false; return }
    var img = m.querySelector('img.owner-mojo'), or = objs.getBoundingClientRect(), ir = img && img.getBoundingClientRect(); if (!ir || ir.height < 8) return
    if (!rp) { rp = el('div', 'k-sinkrp', '<i></i><i class="r2"></i><i class="r3"></i><b class="bb"></b><b class="bb b2"></b><b class="bb b3"></b>'); objs.appendChild(rp) }
    rp.style.opacity = '1'; rp.style.left = (ir.left - or.left + ir.width * 0.45) + 'px'; rp.style.top = (ir.top - or.top + ir.height * 0.2) + 'px'
    if (!sinkWas) { sinkWas = true; var r = rp.getBoundingClientRect(); vfx('bk-circle-01', r.left, r.top, 150, { duration: 900 }); vfx('px-bubbles', r.left, r.top - 10, 150, { duration: 900 }) }
  }
  // sc3 micro: the red caboose hops one beat LATE when the rake moves
  var lastPos = ''
  function hopLate (lv, w) {
    if (!lv.hopLate || RM) return
    var m = w.m, p = m.r + ',' + m.c; if (p === lastPos) return; lastPos = p
    var o = PG.find(w, lv.hopLate); if (!o || o.st !== 'coupled') return
    var d = $('objs') && $('objs').querySelector('.ob[data-id="' + lv.hopLate + '"] img.main'); if (!d || !d.animate) return
    d.animate([{ translate: '0 0' }, { translate: '0 -16%', offset: .4 }, { translate: '0 0' }], { duration: 380, delay: 320, easing: 'ease-out' })
  }
  var lastKey = ''
  var hud0 = def.onHud
  def.onHud = function (c) {
    if (hud0) hud0(c)
    try {
      var lv = c.lv, w = c.w, key = lv.id + '/' + c.bi
      if (key !== lastKey) { lastKey = key; shotDone = false; if (!lv.tow) stop() }
      if (lv.tow) {
        var broken0 = R && R.broken
        var open = lv.tow.snap && (PG.find(w, lv.tow.snap) || {}).st === 'open'
        if (!R || R.lv !== lv || (broken0 && !open)) build(lv, w)
        if (open) snap()
      }
      shot(lv, w); ride(lv); nest(c); sink(c); hopLate(lv, w)
      // bl15: the one Goro (the patrol) is swallowed by the dark when it stands in the cave cell
      var cv = (c.beat && c.beat.cave) || lv.cave
      if (cv) { var g = D.querySelector('#objs .ob[data-id="goro"]'), go = PG.find(w, 'goro'); if (g && go) g.classList.toggle('k-incave', go.r === cv.at[0] && go.c === cv.at[1]) }
    } catch (e) { if (W.console) console.warn('[kereta-story]', e) }
  }
})(typeof window !== 'undefined' ? window : globalThis)
