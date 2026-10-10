/* Mojo board look (owner 2026-10-04, "immersive diorama"): hero art grows past its cell and stands on the
 * ground, rows are depth sorted, the world idles (cat, leaves, butterfly, bird) and the animals have voices.
 * Pure presentation: the cell divs, tap targets, hit maths and the solver are untouched.
 *
 * Self-wiring: it watches the board DOM (#objs rebuilt = level open, #board --cell = layout, #mojo style = Mojo
 * moved), so the game needs no call. MojoBoardLook.apply() re-runs everything if a caller wants to force it.
 * Mute = the game's own rule: the global 'dunia-emosi-sound' key and the Mojo sound button (aria-pressed).
 * ES5, vanilla. */
(function (W, D) {
  'use strict'
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}
  function $ (id) { return D.getElementById(id) }
  function rnd (a, b) { return a + Math.random() * (b - a) }

  /* ── ONE proportional system (owner 2026-10-08: "it has to be proportional") ─────────────────────────
     Every w/h below is the art's EFFECTIVE box ON SCREEN, in cells, anchored bottom-centre. The picture is
     drawn with object-fit:contain, so a WIDE picture is fitted to the box width instead of being scaled up.
     The game's baked sticker ring (img.style.scale, see mojo-swoptops.js RING) is cancelled by sizeArt(),
     so one number means the same thing for every picture — that mismatch (a ring between 1.00x and 1.19x)
     is why the old table drew a 1.42-cell building at 1.42 and a 1.60-cell tree at 1.71.

       PROP  1.00-1.16   a thing that lives in ONE cell: rock, crate, parcel, toolbox, a background building
       MID   1.18-1.40   taller than a cell but still furniture: a swing, a gate, a wagon, a locomotive
       HERO  <= 1.90     the few landmarks that carry the scene (HEROES below): the cat's tree, the lamp,
                         the balloon, the balcony, a stop (lighthouse / station / dock)

     WIDTH is the hard limit and HEIGHT is what makes a hero: art may only overflow UPWARD. NOTHING is wider
     than W_MAX, heroes included — art that reaches more than 0.2 cells sideways covers the middle of the next
     cell, and on an edge column edge() shifts it inward by another half-overflow on top of that (g6: a 1.30
     tree in the last column reached 0.30 into its neighbour and sat on the friend standing there).
     So a hero is TALL and narrow, never wide. Gate: tools/qa-mojo-board-look.mjs. ── */
  var W_MAX = 1.16, H_HERO = 1.90
  var HEROES = { 'perch:tree': 1, 'perch:balon': 1, 'perch:balcony': 1, 'repair:lamp': 1, stop: 1 }
  var LOOK = {
    /* heroes — tall, and only as wide as their own picture needs at that height */
    'perch:tree': { w: 1.16, h: 1.31, friend: { w: 0.58, h: 0.58 }, top: 0.25, idle: 'cat' },   // tree-round, ar .89
    'perch:balon': { w: 1.16, h: 1.40, friend: { w: 0.54, h: 0.54 }, top: 0.3 },                 // balloon, ar .83
    'perch:balcony': { facade: 1.02, friend: { w: 0.74, h: 0.74 } },                             // facade is drawn in CSS
    'repair:lamp': { w: 0.70, h: 1.70 },                                                         // lamp-post, ar .39
    stop: { w: 1.16, h: 1.42 },                                                                  // lighthouse / station / dock
    /* mid */
    'repair:swing': { w: 1.14, h: 1.22, voice: 'creak' },
    loco: { w: 1.16, h: 1.30, voice: 'horn' }, gate: { w: 1.08, h: 1.24 }, flag: { w: 0.96, h: 1.22 },
    fire: { w: 1.10, h: 1.26, voice: 'crackle' },
    /* props — one cell */
    'repair:gate': { w: 1.10, h: 1.15 },
    rock: { w: 1.08, h: 1.08 }, crate: { w: 1.05, h: 1.05 },
    person: { w: 1.00, h: 1.14 }, toolbox: { w: 0.92, h: 0.92 },
    'who:cat': { voice: 'meow' },
    /* the delivery family (owner 2026-10-07): the passengers are person-sized, the rake fits the cell width,
       and the ones with a voice idle with it while the board is on screen. */
    rider: { w: 1.00, h: 1.14 }, parcel: { w: 0.72, h: 0.72 }, part: { w: 1.05, h: 0.75 },
    wagon: { w: 1.16, h: 1.05 }, key: { w: 0.62, h: 0.62 }, mark: { w: 0.76, h: 0.76 },
    pile: { w: 1.05, h: 0.90 }, hole: { w: 1.00, h: 0.80 }, patrol: { w: 1.00, h: 1.14, voice: 'siren' },
    /* WHO overrides the box of the type (owner 2026-10-10: "the baby bird is as big as a whole cell and its mother is
       small"). Real-world order, Mojo as the reference: adult person 1.14 > child ~1.0 > puppy / robot .74 > penguin .78
       > baby bird .52. A BABY (BABY below) must always draw smaller than the adult it is paired with. */
    'who:burung': { voice: 'chirp', w: 0.52, h: 0.52 }, 'who:anjing': { voice: 'bark', w: 0.74, h: 0.74 },
    'who:timmy': { w: 0.86, h: 0.98 }, 'who:ash': { w: 0.92, h: 1.04 }, 'who:neon': { w: 0.88, h: 1.0 },
    'who:pinguin': { w: 0.72, h: 0.8 }, 'who:pip': { w: 0.76, h: 0.76 },
    /* the mother bird perched on her tree: clearly bigger than her chick, still smaller than the tree */
    'art:char/induk': { friend: { w: 0.84, h: 0.84 } },
    tree: { w: 1.03, h: 1.18 },        // 'T' decor: scenery, so it never reaches into the cell above it
    building: { w: 1.12, h: 1.18 }     // '#' outside: the picture fits the CELL WIDTH (canvas keeps its small one underneath)
  }
  var BUILDINGS = ['house', 'shop', 'hospital', 'factory', 'garage', 'school']
  var GRASSY = { town: 1, park: 1, hill: 1 }
  var SKIRT = 0.26   // diorama base under the board, in cells

  function keyFor (o) {
    if (o.perch && LOOK['perch:' + o.perch]) return 'perch:' + o.perch
    if (o.type === 'repair' && LOOK['repair:' + (o.what || 'gate')]) return 'repair:' + (o.what || 'gate')
    return LOOK[o.type] ? o.type : null
  }
  var MERGED = {}
  /* the LOOK of an object: its type/perch entry, then the box of its WHO (a baby is not person-sized), then the
     override of its art (the mother bird's friend box). Merged once per combination; LOOK itself is never mutated. */
  function lookFor (o) {
    var k = keyFor(o); if (!k) return null
    var wv = o.who && LOOK['who:' + o.who], av = o.art && LOOK['art:' + o.art]
    if (!(wv && wv.w) && !av) return LOOK[k]
    var id = k + '|' + (wv && wv.w ? o.who : '') + '|' + (av ? o.art : '')
    if (!MERGED[id]) {
      var m = {}, b = LOOK[k], q
      for (q in b) m[q] = b[q]
      if (wv && wv.w && !b.friend && !b.facade) { m.w = wv.w; m.h = wv.h }
      if (av) for (q in av) m[q] = av[q]
      MERGED[id] = m
    }
    return MERGED[id]
  }
  /* the sticker ring the game bakes into the art (img.style.scale, origin at the foot) multiplies whatever
     box CSS gives the picture. Divide it out so the box on screen is exactly the LOOK number: --mbl-w/h is
     the CSS box, --mbl-ew/eh the size it ends up at, which is what everything else (shadow, the friend on a
     perch, the tail, the height tag, the headroom) must measure against. */
  function ringK (img) { var k = img && parseFloat(img.style.scale); return k > 0 ? k : 1 }
  function setBox (d, img, w, h) {
    var k = ringK(img)
    d.style.setProperty('--mbl-w', +(w / k).toFixed(4)); d.style.setProperty('--mbl-ew', w)
    if (h != null) { d.style.setProperty('--mbl-h', +(h / k).toFixed(4)); d.style.setProperty('--mbl-eh', h) }
    return k
  }
  // re-apply when the game swaps a picture for one with a different ring (fire out, repair fixed, gate open)
  function sizeArt (d, L) {
    var main = d.querySelector('img.main') || d.querySelector('img'), perch = d.querySelector('img.perch')
    var sig = ringK(perch) + '/' + ringK(main)
    if (d.__mblSig === sig) return false
    d.__mblSig = sig
    if (L.friend && L.h) {
      setBox(d, perch, L.w, L.h)
      var km = ringK(main)
      d.style.setProperty('--mbl-fw', +(L.friend.w / km).toFixed(4)); d.style.setProperty('--mbl-fh', +(L.friend.h / km).toFixed(4))
    } else if (L.facade) {
      var kb = ringK(main)
      d.style.setProperty('--mbl-fw', +(L.friend.w / kb).toFixed(4)); d.style.setProperty('--mbl-fh', +(L.friend.h / kb).toFixed(4))
      d.style.setProperty('--mbl-fac', L.facade); d.style.setProperty('--mbl-ew', 0.92); d.style.setProperty('--mbl-w', 0.92)
    } else setBox(d, main, L.w, L.h)
    return true
  }
  function resize () {   // cheap sweep: only the elements whose ring actually changed are written
    ;[].forEach.call(D.querySelectorAll('#objs > .ob.mbl-a'), function (d) {
      var o = META[d.getAttribute('data-id')], L = o && lookFor(o); if (L) sizeArt(d, L)
    })
  }
  function voiceOf (o) { var v = o.who && LOOK['who:' + o.who]; return (v && v.voice) || ((lookFor(o) || {}).voice) || null }
  // art height above the cell's own bottom (cells): what the headroom must fit for a row-0 object
  function artTop (o) {
    var L = lookFor(o); if (!L) return 1
    if (L.friend && L.h) return 0.03 + L.h * (1 - L.top) + L.friend.h
    if (L.facade) return 0.03 + L.facade + L.friend.h
    return 0.03 + L.h
  }

  /* ── state ── */
  var LV = null, META = {}, CELL = 0, on = false, raf = 0, ticker = 0
  var cat = null, catNear = false, catRescued = false, nextMeow = 0, openAt = 0, opened = false
  var nextCrackle = 0, nextCreak = 0, nextBird = 0, nextLeaf = 0, nextActor = 0
  var log = []

  function cellOf (el) {
    var m = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/.exec(el.style.transform || '')
    if (!m || !CELL) return null
    return [Math.round(+m[2] / CELL), Math.round(+m[1] / CELL)]
  }
  function readCell () { var b = $('board'); var v = b ? parseFloat(b.style.getPropertyValue('--cell')) : 0; return v > 0 ? v : 0 }

  /* ── level setup: classes, vars and extra nodes on the existing cells ── */
  function setup () {
    var board = $('board'), st = W.__mojo && W.__mojo.state && W.__mojo.state()
    if (!board || !st || !W.MojoLevels) { off(); return }
    LV = W.MojoLevels.byId(st.id); if (!LV) { off(); return }
    META = {}; (LV.objects || []).forEach(function (o) { META[o.id] = o })
    on = true; board.classList.add('mbl-on'); board.setAttribute('data-mbl-theme', LV.grid.theme || 'town')
    CELL = readCell()
    cat = null; catNear = false; catRescued = false; opened = false; openAt = Date.now()
    var cols = LV.grid.cols
    ;[].forEach.call(D.querySelectorAll('#objs > .ob'), function (d) {
      var o = META[d.getAttribute('data-id')]; if (!o) return
      var L = lookFor(o); if (!L || d.classList.contains('pickup')) return
      d.classList.add('mbl-a'); d.__mblSig = null; sizeArt(d, L)
      if (L.friend && L.h) {        // a friend up a big tree
        d.classList.add('mbl-perch', 'mbl-tall'); d.style.setProperty('--mbl-top', L.top)
        d.style.setProperty('--mbl-th', artTop(o).toFixed(2))
        if (L.idle === 'cat' || o.who === 'cat') { d.classList.add('mbl-cat'); if (!d.querySelector('.mbl-tail')) d.appendChild(node('i', 'mbl-tail')) ; cat = d }
      } else if (L.facade) {        // a friend on a balcony
        d.classList.add('mbl-balc', 'mbl-tall'); d.style.setProperty('--mbl-th', artTop(o).toFixed(2))
      } else {
        d.style.setProperty('--mbl-th', (0.03 + L.h).toFixed(2))
        if (L.h >= 1.24) d.classList.add('mbl-tall')
      }
      if (!d.querySelector('.mbl-sh')) d.insertBefore(node('i', 'mbl-sh'), d.firstChild)
      liveClass(d, o, L)
      if (o.who === 'cat' && !cat) cat = d
      edge(d, o.at[1], cols, (L.w || 1))
    })
    ;[].forEach.call(D.querySelectorAll('#decor > .dec'), function (d) {
      var L = LOOK.tree; d.classList.add('mbl-a'); setBox(d, d.querySelector('img'), L.w, L.h)
      if (!d.querySelector('.mbl-sh')) d.insertBefore(node('i', 'mbl-sh'), d.firstChild)
      var rc = (d.getAttribute('data-rc') || '0,0').split(','); edge(d, +rc[1], cols, L.w)
    })
    buildLayers()
    sizeLayers()
    headroom()
    depth()
    start()
  }
  /* idle life for the characters (transform on the picture only; the ring scale lives in `scale`, so they never fight):
     a breath for people, riders and the patrol car; the chick hops and chirps, the mother flaps. A level has few of
     them. mbl-live objects also hop when Mojo comes within two cells (see depth()). */
  var LIVE = { person: 1, rider: 1, patrol: 1 }
  function liveClass (d, o, L) {
    if (!(LIVE[o.type] || o.art === 'char/induk') || d.classList.contains('mbl-cat')) return
    d.classList.add('mbl-live'); d.style.setProperty('--mbl-ph', (-((o.id || '').length * 0.37 % 3)).toFixed(2) + 's')
    if (o.who === 'burung') d.classList.add('mbl-chick')
    if (o.art === 'char/induk') d.classList.add('mbl-induk')
  }
  function node (tag, cls) { var e = D.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true'); return e }
  // art on an edge column grows inward, never past the board
  function edge (d, c, cols, w) {
    var o = Math.max(0, (w - 1) / 2), dx = c === 0 ? o : c === cols - 1 ? -o : 0
    d.style.setProperty('--mbl-dx', dx.toFixed(3)); d.classList.toggle('mbl-tag-l', c === cols - 1)
  }

  /* ── own layers: ground (scatter canvas + water shimmer), props (buildings), ambient, skirt ── */
  function buildLayers () {
    var board = $('board'), bg = $('board-bg')
    ;['mbl-ground', 'mbl-props', 'mbl-amb', 'mbl-skirt'].forEach(function (id) { var e = $(id); if (e) e.remove() })
    var ground = node('div', 'layer mbl-ground'); ground.id = 'mbl-ground'
    var cv = node('canvas', 'mbl-scatter'); ground.appendChild(cv)
    var props = node('div', 'layer mbl-props'); props.id = 'mbl-props'
    var amb = node('div', 'layer mbl-amb'); amb.id = 'mbl-amb'
    var skirt = node('div', 'mbl-skirt'); skirt.id = 'mbl-skirt'
    board.insertBefore(ground, bg.nextSibling); board.insertBefore(props, $('decor')); board.appendChild(amb); board.appendChild(skirt)
    var indoor = LV.grid.theme === 'school', occupied = {}
    ;(LV.objects || []).forEach(function (o) { occupied[o.at[0] + ',' + o.at[1]] = 1 })
    LV.grid.map.forEach(function (row, r) {
      for (var c = 0; c < row.length; c++) {
        var k = row.charAt(c)
        if (k === '~') { var wv = node('i', 'mbl-wave'); wv.setAttribute('data-rc', r + ',' + c); ground.appendChild(wv) }
        if (k === '#' && !indoor && !occupied[r + ',' + c] && W.MojoArt) {
          var b = node('div', 'mbl-bld'); b.setAttribute('data-rc', r + ',' + c)
          b.innerHTML = '<i class="mbl-sh"></i><img alt="" src="' + W.MojoArt.lib('mojo-prop/' + BUILDINGS[(r * 3 + c * 5) % BUILDINGS.length]) + '">'
          var L = LOOK.building, o = Math.max(0, (L.w - 1) / 2)
          b.style.setProperty('--mbl-w', L.w); b.style.setProperty('--mbl-h', L.h)
          b.style.setProperty('--mbl-ew', L.w); b.style.setProperty('--mbl-eh', L.h)
          b.style.setProperty('--mbl-dx', (c === 0 ? o : c === row.length - 1 ? -o : 0).toFixed(3)); props.appendChild(b)
        }
      }
    })
  }
  function sizeLayers () {
    if (!on || !CELL) return
    ;[].forEach.call(D.querySelectorAll('#mbl-ground .mbl-wave, #mbl-props .mbl-bld'), function (e) {
      var p = e.getAttribute('data-rc').split(','); e.style.left = (+p[1] * CELL) + 'px'; e.style.top = (+p[0] * CELL) + 'px'
      if (e.classList.contains('mbl-bld')) e.style.zIndex = (+p[0] * 10 + 1)
    })
    var cv = D.querySelector('#mbl-ground .mbl-scatter')
    if (cv && W.MojoBoardPaint) W.MojoBoardPaint.paint(cv, LV, CELL)
  }

  /* ── headroom: tall art in row 0 and the diorama base below must stay inside the board area. Reserved as a
     transparent border on #board-wrap (clientHeight excludes borders), so the game's own layout() shrinks the
     cell to fit through its ResizeObserver: no change to layout() itself. ── */
  var hrT = 0, hrB = 0
  /* how far the art envelope currently reaches INTO the chrome, in px [top, bottom]. Measured, never assumed:
     a reservation that only knows the wrap's own box cannot see a top bar or a Bo chip drawn over the board. */
  function chromeMiss (needT) {
    var b = $('board'), C = CELL || readCell(); if (!b || !C) return [0, 0]
    var br = b.getBoundingClientRect(); if (!br.width) return [0, 0]
    var top = 0, bot = 0
    ;['#scr-play .p-top', '#bo'].forEach(function (s) {
      var e = D.querySelector(s); if (!e || e.offsetParent === null) return
      var r = e.getBoundingClientRect()
      if (r.right > br.left + 1 && r.left < br.right - 1 && r.bottom < br.bottom) top = Math.max(top, r.bottom - (br.top - needT * C))
    })
    var st = D.querySelector('#scr-play .p-strip')
    if (st && st.offsetParent !== null) {
      var sr = st.getBoundingClientRect()
      if (sr.right > br.left + 1 && sr.left < br.right - 1) bot = (br.bottom + SKIRT * C + 8) - sr.top
    }
    return [Math.max(0, top), Math.max(0, bot)]
  }
  function headroom () {
    var wrap = $('board-wrap'); if (!wrap || !LV) return
    // sizeArt() cancels the sticker ring, so artTop() is already the size on screen: no ring factor here
    var needT = 0
    ;(LV.objects || []).forEach(function (o) { if (o.at[0] === 0 && !{ bolt: 1, drop: 1, star: 1 }[o.type]) needT = Math.max(needT, artTop(o) - 1) })
    var indoor = LV.grid.theme === 'school'
    LV.grid.map[0].split('').forEach(function (k) { if (k === 'T') needT = Math.max(needT, LOOK.tree.h + 0.03 - 1); if (k === '#' && !indoor) needT = Math.max(needT, LOOK.building.h + 0.03 - 1) })
    needT += needT > 0 ? 0.06 : 0   // + the trees' idle sway and the fire's flicker
    var cs = W.getComputedStyle(wrap), pT = parseFloat(cs.paddingTop) || 0, pB = parseFloat(cs.paddingBottom) || 0
    var cw = wrap.clientWidth, ch0 = wrap.clientHeight + hrT + hrB, R = LV.grid.rows, Cn = LV.grid.cols
    if (cw <= 0 || ch0 <= 0) return
    var bt = 0, bb = 0, C = 16
    for (var i = 0; i < 24; i++) {
      var hLim = (ch0 - bt - bb - 26) / R, wLim = (cw - 26) / Cn
      C = Math.max(16, Math.floor(Math.min(wLim, hLim)))
      var slack = (ch0 - bt - bb - pT - pB - R * C) / 2
      var dT = needT * C - (bt + pT + slack), dB = (SKIRT * C + 8) - (bb + pB + slack)
      if (dT <= 0.5 && dB <= 0.5) break
      // a board limited by its width keeps its cell: a border step then buys only half its size (the centring slack shrinks)
      var k = hLim < wLim ? 1 : 2
      if (dT > 0.5) bt += dT * k; if (dB > 0.5) bb += dB * k
    }
    // the model above reserves space inside the wrap; the chrome does not have to live outside it (the top bar
    // and Bo's chip float over the play screen, the plan strip sits under it). Measure what is REALLY there and
    // correct the reservation by the amount the art misses by — one step per pass, the ResizeObserver re-runs us.
    var miss = chromeMiss(needT)
    if (miss[0] > 0.5) bt = Math.max(bt, hrT + miss[0] * (hLim < wLim ? 1 : 2))
    if (miss[1] > 0.5) bb = Math.max(bb, hrB + miss[1] * (hLim < wLim ? 1 : 2))
    bt = Math.min(Math.ceil(bt), Math.round(ch0 * 0.4)); bb = Math.min(Math.ceil(bb), Math.round(ch0 * 0.2))
    if (Math.abs(bt - hrT) < 2 && Math.abs(bb - hrB) < 2) return
    hrT = bt; hrB = bb
    W.requestAnimationFrame(function () {   // next frame: never inside the game's ResizeObserver pass
      wrap.style.borderTop = hrT ? hrT + 'px solid transparent' : ''
      wrap.style.borderBottom = hrB ? hrB + 'px solid transparent' : ''
    })
  }
  function clearHeadroom () {
    var wrap = $('board-wrap'); if (!wrap) return
    hrT = hrB = 0; wrap.style.borderTop = ''; wrap.style.borderBottom = ''
  }

  /* ── depth: lower rows draw over the overflow of upper rows; Mojo rides its row ── */
  function depth () {
    raf = 0; if (!on) return
    resize()   // a swapped picture (fire out, repair fixed, gate open) can carry a different sticker ring
    // per row: building 1, tree 2, object 4, pickup 5. Mojo rides above the NEXT row's trees and buildings
    // (scenery never hides the player) and under that row's objects.
    ;[].forEach.call(D.querySelectorAll('#decor > .dec'), function (d) { var p = (d.getAttribute('data-rc') || '0').split(','); setZ(d, +p[0] * 10 + 2) })
    ;[].forEach.call(D.querySelectorAll('#objs > .ob'), function (d) { var rc = cellOf(d); if (rc) setZ(d, rc[0] * 10 + (d.classList.contains('pickup') ? 5 : 4)) })
    var mj = $('mojo'), mr = mj && cellOf(mj)
    if (mr) setZ(mj, (mr[0] + 1) * 10 + 3)
    if (mr) [].forEach.call(D.querySelectorAll('#objs > .ob.mbl-live:not(.gone)'), function (d) {
      var rc = cellOf(d), nr = !!rc && Math.abs(mr[0] - rc[0]) + Math.abs(mr[1] - rc[1]) <= 2
      if (nr !== d.classList.contains('mbl-near')) d.classList.toggle('mbl-near', nr)
    })
    if (cat) {
      var gone = cat.classList.contains('gone'), cr = cellOf(cat)
      if (gone && !catRescued) { catRescued = true; voice('purr'); W.setTimeout(function () { voice('meow', 1.25, 'happy') }, 700) }
      var near = !gone && mr && cr && Math.abs(mr[0] - cr[0]) + Math.abs(mr[1] - cr[1]) <= 2
      if (near !== catNear) { catNear = !!near; cat.classList.toggle('mbl-near', catNear); if (catNear) nextMeow = Math.min(nextMeow, Date.now() + 350) }
      if (cr && mr) cat.classList.toggle('mbl-look-r', mr[1] > cr[1])
    }
  }
  function setZ (e, z) { if (e.style.zIndex !== String(z)) e.style.zIndex = z }
  function queueDepth () { if (!raf) raf = W.requestAnimationFrame(depth) }

  /* ── idle life + voices: one slow ticker, only while the board is on screen ── */
  function playing () { return on && D.body.getAttribute('data-scr') === 'scr-play' && !D.hidden }
  function quiet () { return !!D.querySelector('.overlay.on') }
  function start () {
    var now = Date.now()
    nextMeow = now + 700; nextCrackle = now + rnd(1500, 3000); nextCreak = now + rnd(2500, 5000); nextBird = now + rnd(5000, 9000)
    nextLeaf = now + rnd(1200, 2500); nextActor = now + rnd(3000, 6000)
    if (!ticker) ticker = W.setInterval(tick, 400)
  }
  function tick () {
    if (!playing()) return
    var now = Date.now(), qt = quiet(), mr = cellOf($('mojo') || D.body)
    if (cat && !catRescued && !qt && now >= nextMeow) {
      if (!opened) { opened = true; voice('meow', 1, 'open') } else voice('meow', catNear ? 1.18 : 1, catNear ? 'near' : 'far')
      nextMeow = now + (catNear ? rnd(3000, 4500) : rnd(8000, 12000))
    }
    if (!qt && now >= nextCrackle) {
      nextCrackle = now + rnd(1200, 2200)
      var fireNear = [].some.call(D.querySelectorAll('#objs > .ob.fire:not(.done):not(.gone)'), function (f) { var rc = cellOf(f); return rc && mr && Math.abs(rc[0] - mr[0]) + Math.abs(rc[1] - mr[1]) <= 2 })
      if (fireNear) voice('crackle')
    }
    if (!qt && now >= nextCreak) {
      nextCreak = now + rnd(7000, 11000)
      var sw = [].some.call(D.querySelectorAll('#objs > .ob.repair'), function (d) { var o = META[d.getAttribute('data-id')], im = d.querySelector('img.main'); return o && o.what === 'swing' && im && /broken/.test(decodeURIComponent(im.getAttribute('src') || '')) })
      if (sw) voice('creak')
    }
    if (!qt && GRASSY[LV.grid.theme] && now >= nextBird) { nextBird = now + rnd(14000, 22000); voice('birds') }
    if (RM) return
    if (cat && now >= nextLeaf) { nextLeaf = now + rnd(2600, 5200); leaf() }
    if (GRASSY[LV.grid.theme] && now >= nextActor) { nextActor = now + rnd(7000, 13000); actor() }
  }
  function leaf () {
    var amb = $('mbl-amb'); if (!amb || !cat || catRescued || amb.querySelectorAll('.mbl-leaf').length >= 3) return
    var rc = cellOf(cat); if (!rc) return
    var L = LOOK['perch:tree'], cx = (rc[1] + 0.5) * CELL, top = (rc[0] + 1 - L.h * 0.86) * CELL
    var e = node('i', 'mbl-leaf mbl-actor'); e.style.left = (cx + rnd(-0.55, 0.55) * CELL) + 'px'; e.style.top = top + 'px'
    e.style.setProperty('--mbl-fall', (CELL * rnd(1.1, 1.6)).toFixed(0) + 'px'); e.style.setProperty('--mbl-drift', (CELL * rnd(-0.4, 0.4)).toFixed(0) + 'px')
    if (Math.random() < 0.35) e.classList.add('mbl-leaf-o')
    e.addEventListener('animationend', function () { e.remove() }); amb.appendChild(e)
  }
  function actor () {
    var amb = $('mbl-amb'); if (!amb || amb.querySelectorAll('.mbl-fly').length >= 2 || !CELL) return
    var bird = Math.random() < 0.4, Wd = LV.grid.cols * CELL, Hd = LV.grid.rows * CELL, ltr = Math.random() < 0.5
    var e = node('i', 'mbl-fly mbl-actor ' + (bird ? 'mbl-bird' : 'mbl-bfly'))
    e.innerHTML = bird ? '<svg viewBox="0 0 24 10"><path d="M1 7Q6 0 12 6Q18 0 23 7" fill="none" stroke="#37474F" stroke-width="2.2" stroke-linecap="round"/></svg>'
      : '<b></b><b></b>'
    var y0 = rnd(0.15, bird ? 0.45 : 0.85) * Hd, y1 = Math.min(Hd - CELL * 0.4, Math.max(CELL * 0.1, y0 + rnd(-0.25, 0.25) * Hd))
    var x0 = ltr ? -CELL * 0.3 : Wd, x1 = ltr ? Wd : -CELL * 0.3, ms = bird ? rnd(4200, 5600) : rnd(7000, 9500)
    e.style.left = '0px'; e.style.top = '0px'; if (!ltr) e.classList.add('mbl-rtl'); amb.appendChild(e)
    var kf = [], n = 8
    for (var i = 0; i <= n; i++) { var t = i / n, y = y0 + (y1 - y0) * t + (bird ? 0 : Math.sin(t * Math.PI * 4) * CELL * 0.25); kf.push({ transform: 'translate(' + (x0 + (x1 - x0) * t).toFixed(1) + 'px,' + y.toFixed(1) + 'px)', opacity: t === 0 || t === 1 ? 0 : 1 }) }
    var a = e.animate(kf, { duration: ms, easing: 'linear' }); a.onfinish = function () { e.remove() }
  }

  /* ── voices (WebAudio synth, quiet, rate limited) ── */
  var AC = null, lastVoice = {}
  function soundOn () {
    try { if (localStorage.getItem('dunia-emosi-sound') === 'off') return false } catch (e) {}
    var b = $('btn-sound2'); return b ? b.getAttribute('aria-pressed') === 'true' : true
  }
  function ctx () {
    if (!soundOn()) { if (AC) { var o = AC; AC = null; try { o.close() } catch (e) {} } return null }
    try { if (!AC) AC = new (W.AudioContext || W.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume() } catch (e) { AC = null }
    return AC
  }
  function env (c, g, t, a, v, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.setValueAtTime(v, t + d * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + d) }
  var VOICES = {
    meow: function (c, p, kind) {
      var t = c.currentTime + 0.02, d = kind === 'happy' ? 0.38 : 0.52, f = 700 * p
      var o = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(), g2 = c.createGain(), bp = c.createBiquadFilter()
      o.type = 'triangle'; o2.type = 'sine'; bp.type = 'bandpass'; bp.frequency.value = 1400 * p; bp.Q.value = 1.2
      var a = kind === 'happy' ? [f * 1.1, f * 1.5, f * 1.25] : [f, f * 1.43, f * 0.86]
      ;[o.frequency, o2.frequency].forEach(function (fr, i) { var m = i ? 2 : 1; fr.setValueAtTime(a[0] * m, t); fr.exponentialRampToValueAtTime(a[1] * m, t + d * 0.3); fr.exponentialRampToValueAtTime(a[2] * m, t + d) })
      lfo.frequency.value = 6.5; lg.gain.value = 14 * p; lfo.connect(lg); lg.connect(o.frequency)
      env(c, g, t, 0.05, 0.05, d); env(c, g2, t, 0.05, 0.018, d)
      o.connect(bp); bp.connect(g); o2.connect(g2); g.connect(c.destination); g2.connect(c.destination)
      ;[o, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + d + 0.05) })
    },
    purr: function (c) {
      var t = c.currentTime + 0.02, d = 1.3, o = c.createOscillator(), am = c.createOscillator(), ag = c.createGain(), g = c.createGain(), lp = c.createBiquadFilter()
      o.type = 'sawtooth'; o.frequency.value = 52; lp.type = 'lowpass'; lp.frequency.value = 320
      am.frequency.value = 24; ag.gain.value = 0.02; am.connect(ag); ag.connect(g.gain)
      env(c, g, t, 0.15, 0.03, d); o.connect(lp); lp.connect(g); g.connect(c.destination)
      ;[o, am].forEach(function (x) { x.start(t); x.stop(t + d + 0.05) })
    },
    crackle: function (c) {
      var d = 0.5, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0)
      for (var i = 0; i < n; i++) ch[i] = Math.random() < 0.004 ? (Math.random() * 2 - 1) : ch[i - 1] ? ch[i - 1] * 0.6 : 0
      var s = c.createBufferSource(), g = c.createGain(), hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200; g.gain.value = 0.05
      s.buffer = b; s.connect(hp); hp.connect(g); g.connect(c.destination); s.start()
    },
    creak: function (c) {
      var t = c.currentTime + 0.02, d = 0.55, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(), bp = c.createBiquadFilter()
      o.type = 'sawtooth'; o.frequency.setValueAtTime(190, t); o.frequency.linearRampToValueAtTime(140, t + d)
      lfo.frequency.value = 28; lg.gain.value = 25; lfo.connect(lg); lg.connect(o.frequency)
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 6
      env(c, g, t, 0.06, 0.03, d); o.connect(bp); bp.connect(g); g.connect(c.destination)
      ;[o, lfo].forEach(function (x) { x.start(t); x.stop(t + d + 0.05) })
    },
    birds: function (c) {
      var t0 = c.currentTime + 0.02, k = 2 + Math.floor(Math.random() * 2)
      for (var i = 0; i < k; i++) {
        var t = t0 + i * 0.16, o = c.createOscillator(), g = c.createGain(), f = rnd(2600, 3300)
        o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.07)
        env(c, g, t, 0.01, 0.022, 0.09); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.12)
      }
    }
  }
  /* ── delivery-family voices (owner 2026-10-07: "a bird chirp, a train horn with steam, a dog bark, a
     siren, a reunion with hearts"). Same WebAudio synth, same mute rule, same rate limit. ── */
  VOICES.chirp = function (c, p, kind) {
    var t0 = c.currentTime + 0.02, k = kind === 'happy' ? 4 : 3
    for (var i = 0; i < k; i++) {
      var t = t0 + i * 0.13, o = c.createOscillator(), g = c.createGain(), f = (2400 + i * 180) * (p || 1)
      o.type = 'sine'
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.05); o.frequency.exponentialRampToValueAtTime(f * 1.1, t + 0.1)
      env(c, g, t, 0.012, 0.03, 0.12); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.16)
    }
  }
  VOICES.horn = function (c, p) {
    var t = c.currentTime + 0.02, d = 1.1, base = 170 * (p || 1)
    ;[1, 1.5, 2.02].forEach(function (mult, i) {
      var o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter()
      o.type = i ? 'sawtooth' : 'square'
      o.frequency.setValueAtTime(base * mult * 0.96, t); o.frequency.linearRampToValueAtTime(base * mult, t + 0.12)
      o.frequency.setValueAtTime(base * mult, t + d * 0.72); o.frequency.linearRampToValueAtTime(base * mult * 0.9, t + d)
      lp.type = 'lowpass'; lp.frequency.value = 1100
      env(c, g, t, 0.09, 0.045 / (i + 1), d)
      o.connect(lp); lp.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.08)
    })
  }
  VOICES.ship = function (c, p) {
    var t = c.currentTime + 0.02, d = 1.5, base = 92 * (p || 1)
    ;[1, 1.49].forEach(function (mult, i) {
      var o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter()
      o.type = 'sawtooth'; o.frequency.setValueAtTime(base * mult, t)
      lp.type = 'lowpass'; lp.frequency.value = 620
      env(c, g, t, 0.18, 0.05 / (i + 1), d)
      o.connect(lp); lp.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.08)
    })
  }
  VOICES.bark = function (c, p) {
    var t0 = c.currentTime + 0.02
    for (var i = 0; i < 2; i++) {
      var t = t0 + i * 0.22, o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(420 * (p || 1), t); o.frequency.exponentialRampToValueAtTime(190 * (p || 1), t + 0.14)
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.4
      env(c, g, t, 0.012, 0.055, 0.17); o.connect(bp); bp.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.2)
    }
  }
  VOICES.siren = function (c, p) {
    var t = c.currentTime + 0.02, d = 1.2, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain()
    o.type = 'triangle'; o.frequency.value = 720 * (p || 1)
    lfo.frequency.value = 2.2; lg.gain.value = 220 * (p || 1); lfo.connect(lg); lg.connect(o.frequency)
    env(c, g, t, 0.08, 0.04, d); o.connect(g); g.connect(c.destination)
    ;[o, lfo].forEach(function (x) { x.start(t); x.stop(t + d + 0.05) })
  }
  VOICES.clank = function (c, p) {
    var t = c.currentTime + 0.02
    ;[1180, 1760].forEach(function (f, i) {
      var o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter()
      o.type = 'square'; o.frequency.setValueAtTime(f * (p || 1), t + i * 0.06); o.frequency.exponentialRampToValueAtTime(f * 0.7 * (p || 1), t + i * 0.06 + 0.16)
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 3
      env(c, g, t + i * 0.06, 0.005, 0.035, 0.2); o.connect(bp); bp.connect(g); g.connect(c.destination)
      o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.24)
    })
  }
  var GAP = { meow: 2500, purr: 1500, crackle: 900, creak: 4000, birds: 6000,
    chirp: 900, horn: 2500, ship: 3000, bark: 900, siren: 2500, clank: 500 }
  function voice (name, pitch, kind) {
    var now = Date.now()
    if (kind !== 'happy' && lastVoice[name] && now - lastVoice[name] < GAP[name]) return
    lastVoice[name] = now
    var c = ctx(), played = false
    if (c && VOICES[name]) { try { VOICES[name](c, pitch || 1, kind || ''); played = true } catch (e) { console.warn('[MojoBoardLook] voice failed', name, e) } }
    log.push({ v: name, kind: kind || '', near: catNear, pitch: pitch || 1, played: played, at: now - openAt })
    if (log.length > 60) log.shift()
  }

  /* ── wiring ── */
  function off () {
    on = false; cat = null
    var b = $('board'); if (b) b.classList.remove('mbl-on')
    clearHeadroom()
  }
  function relayout () {
    var c = readCell(); if (!c || c === CELL) return
    CELL = c; if (!on) return
    sizeLayers(); headroom(); queueDepth()
  }
  function wire () {
    var objs = $('objs'), board = $('board'), mj = $('mojo')
    if (!objs || !board || W.__mblWired) return
    W.__mblWired = true
    new MutationObserver(function (ms) {
      if (ms.some(function (m) { return m.type === 'childList' && m.target === objs })) W.requestAnimationFrame(setup)
      else queueDepth()
    }).observe(objs, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] })
    new MutationObserver(relayout).observe(board, { attributes: true, attributeFilter: ['style'] })
    if (mj) new MutationObserver(queueDepth).observe(mj, { attributes: true, attributeFilter: ['style'] })
    // the board area appears (screen shown) or changes size: re-check the headroom, outside the observer pass
    if (W.ResizeObserver && $('board-wrap')) new ResizeObserver(function () { if (on) W.requestAnimationFrame(headroom) }).observe($('board-wrap'))
    if (objs.children.length) setup()
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', wire); else wire()

  /* ── perch points for the rescue staging (games/mojo-fx.js): where a ladder must reach, in board px ──
     A raised friend: the friend's feet (bottom-centre of its art box). A tall repair (the lamp): near the top of
     its art. Measured from the layout boxes (offset*), not the screen rect, so idle loops and the ring scale
     (origin at the art's foot) never move the point. */
  function txy (el) {
    var m = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/.exec((el && el.style.transform) || '')
    return m ? [+m[1], +m[2]] : null
  }
  function perchPoint (id) {
    var d = D.querySelector('#objs > .ob[data-id="' + id + '"]'), o = META[id]
    if (!d) return null
    var t = txy(d), img = d.querySelector('img.main'), C = CELL || readCell()
    if (!t || !img || !C) return null
    var x = t[0] + img.offsetLeft + img.offsetWidth / 2
    var friend = o ? o.type === 'person' : d.classList.contains('person')
    var y = friend ? t[1] + img.offsetTop + img.offsetHeight : t[1] + img.offsetTop + img.offsetHeight * 0.1
    return { x: x, y: y, id: id, elev: (o && o.elev) || 0 }
  }
  // the raised thing next to (r,c) a ladder from Mojo should reach: the one Mojo faces first, then any neighbour
  function perchNear (r, c, h) {
    var st = W.__mojo && W.__mojo.state && W.__mojo.state(), objs = (st && st.objects) || [], best = null, DR = [[-1, 0], [0, 1], [1, 0], [0, -1]]
    if (h == null && st && st.position) h = st.position.h
    objs.forEach(function (o) {
      if (!o.elev || Math.abs(o.r - r) + Math.abs(o.c - c) > 1) return
      var face = h != null && DR[h] && o.r === r + DR[h][0] && o.c === c + DR[h][1]
      var score = (face ? 2 : 0) + (o.st === 'rescued' || o.st === 'fixed' ? 0 : 1)
      if (!best || score > best.score) best = { id: o.id, score: score }
    })
    return best ? perchPoint(best.id) : null
  }

  W.MojoBoardLook = {
    perchPoint: perchPoint, perchNear: perchNear,
    LOOK: LOOK, HEROES: HEROES, LIMITS: { width: W_MAX, heroH: H_HERO }, keyFor: keyFor,
    apply: function () { if (!W.__mblWired) wire(); else setup() },
    voice: voice, log: log, state: function () { return { on: on, cell: CELL, cat: !!cat, near: catNear, rescued: catRescued, headroom: [hrT, hrB], rm: RM } }
  }
})(window, document)
