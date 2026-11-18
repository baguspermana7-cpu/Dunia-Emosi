/**
 * dunia-sakuga.js — anime-style press feedback on the buttons that already exist (PRD-46).
 *
 * One document-level listener pair (pointerdown / click on <html>, capture) decorates whatever the child touches. No
 * markup changes, no game handler touched. The drawing is the vendored Sakuga core (games/vendor/sakuga/core.js,
 * window.SakugaFX): springs plus ONE fixed canvas over the page, so nothing is clipped by an overflow:hidden parent.
 *
 *   fast       arrows / jump / lanes — pressed several times a second: a tiny squash, no particles, no extra frame cost
 *   primary    start / play / next / level + game cards: squash, pop 106-120 %, burst + chips (no smoke puffs)
 *   answer     choice buttons: squash + 3 wedges; burst + glints only on a RIGHT answer (DuniaBus 'answer' ok),
 *              a small wobble mark on a wrong one — never a celebration
 *   secondary  back / close / sound / settings / everything else: small squash + 3 wedges
 *   tap        a full-screen "tap to start" overlay: no squash, one burst under the finger
 *   off        canvas, fields, other full-screen hit areas, disabled / locked: nothing
 *
 * The effect colours are the button's own (background, else border, else text colour). The Japanese lettering of the
 * library (sfx / hollow / dotted) is never called: children of 5-10 cannot read it.
 * Off under prefers-reduced-motion and under the profile setting (the 'du-reduced-motion' family of keys).
 * Kill switch for A/B measurement: ?nosakuga=1.  Override per element or container: data-sakuga="fast|primary|answer|secondary|off".
 */
;(function () {
  'use strict'
  var W = window
  var D = document
  if (W.DuniaSakuga) return
  try { if (/[?&]nosakuga=1(&|$)/.test(W.location.search)) return } catch (e) {}

  // ───────────────────────── the class table ─────────────────────────
  // Evidence comes from the element only: its id, class names, aria-label, title, visible text, size and the
  // container it sits in. First row that matches wins. A button no row claims is `secondary` (the quiet one).
  // A word matches whole: `btn-up` has the word `up`, `cupboard` does not.
  function words (list) { return new RegExp('(?:^|[^a-z])(?:' + list.split(' ').join('|') + ')(?:[^a-z]|$)') }
  var TABLE = [
    // [class, test(info) -> bool]                                   why
    ['off', function (i) { return i.tag === 'canvas' || i.tag === 'svg' || i.tag === 'input' && !/^(button|submit)$/.test(i.type) || /^(select|textarea|label|summary|iframe|video|audio)$/.test(i.tag) }], // a canvas is the game itself: scaling it would move every coordinate
    ['tap', function (i) { return i.area > BIG * W.innerWidth * W.innerHeight && PRIMARY.test(i.sig) }],       // "tap anywhere to start" overlay: no squash, one burst under the finger
    ['off', function (i) { return i.area > BIG * W.innerWidth * W.innerHeight }],                               // any other full-screen hit area: nothing to decorate
    ['off', function (i) { return LOCKED.test(i.sig) }],                                                         // locked tiles stay quiet
    ['answer', function (i) { return ANSWER.test(i.sigNoText) }],                                               // a button that calls itself a choice / answer (before `fast`: a choice may read "Left")
    ['fast', function (i) { return FAST.test(i.sig) || ARROWS.test(i.text) }],                                  // pads and lanes
    ['answer', function (i) { return i.inChoices }],                                                            // any other button inside a choice container
    ['primary', function (i) { return PRIMARY.test(i.text) }],                                                 // the label says start / play / next (before `secondary`: class `home-btn` is not a way home)
    ['secondary', function (i) { return SECONDARY.test(i.sig) || (!i.text && i.w <= 64 && i.h <= 64) }],       // back / close / sound / settings, and every bare icon button
    ['primary', function (i) { return PRIMARY.test(i.sig) || CARD.test(i.sig) }]                                // start / play / next / level, game cards
  ]
  var BIG = 0.45                             // share of the viewport above which a hit area is a whole screen
  var LOCKED = words('disabled locked lock terkunci')
  var FAST = words('arrow dpad joy joystick jump lompat slide steer lane brake gas boost nitro bolt left right up dn down kiri kanan naik turun ctrl mc')
  var ARROWS = /^[\s\u25C0\u25B6\u25B2\u25BC\u2190-\u2193\u2B05-\u2B07\u27A1\u2039\u203A<>]+$/   // text that is only an arrow glyph
  var ANSWER = words('choice choices option options opt ans answer answers jawab jawaban pilihan')
  var CHOICES_BOX = '[class*="choice" i],[class*="-ans" i],[class*="ans-" i],[class*="option" i],[id*="choices" i],[role="radiogroup"],[role="listbox"]'
  var SECONDARY = words('back kembali tutup close keluar exit home rumah sound suara mute music musik setting settings pengaturan pause jeda parent ortu ibtn xbtn icon hud x skip lewati')
  var PRIMARY = words('mulai main ayo lanjut lanjutkan start play go berangkat pilih lagi coba siap next selanjutnya fight battle race balap')
  var CARD = words('tile card kartu mode wmap node gvs lv level')
  var KINDS = { fast: 1, primary: 1, answer: 1, secondary: 1, tap: 1, off: 1 }

  // squash feel per class: [how low the pressed height goes, how much wider it gets, pop on release]
  var FEEL = {
    fast: { low: 0.94, wide: 0.5 },
    secondary: { low: 0.87, wide: 0.35 },
    answer: { low: 0.9, wide: 0.4 },
    primary: { low: 0.86, wide: 0.45 }
  }

  // ───────────────────────── small helpers ─────────────────────────
  var stats = { press: 0, squash: 0, wedge: 0, impact: 0, burst: 0, kira: 0, wob: 0 }
  var RM_KEYS = ['du-reduced-motion', 'g14-reduced-motion', 'train-vfx-reduced-motion', 'train-bg-reduced-motion']
  function fx () { return W.SakugaFX }
  function still () {                       // prefers-reduced-motion (the core mirrors it live) or a profile setting
    var f = fx()
    if (!f || f.calm) return true
    try { for (var i = 0; i < RM_KEYS.length; i++) if (W.localStorage.getItem(RM_KEYS[i]) === '1') return true } catch (e) {}
    return false
  }
  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function isDisabled (el) {
    try { if (el.disabled || el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true') return true } catch (e) {}
    return !!el.closest('[inert],[aria-hidden="true"],[data-dcine]')
  }

  // the button under a finger: semantic first, then a bare element a game made clickable (onclick / pointer cursor)
  var SEMANTIC = 'button,a[href],[role="button"],input[type="button"],input[type="submit"]'
  function targetOf (node) {
    if (!node || !node.closest) return null
    var el = node.closest(SEMANTIC) || node.closest('[data-sakuga]')      // an explicit data-sakuga marks a bare div as a control too
    if (el) return el
    var n = node, hops = 0
    while (n && n.nodeType === 1 && n !== D.body && n !== D.documentElement && hops++ < 5) {
      if (n.hasAttribute('onclick') || n.onclick) return n
      var cs = W.getComputedStyle(n)
      if (cs.cursor === 'pointer' && !(n.parentElement && W.getComputedStyle(n.parentElement).cursor === 'pointer')) return n
      n = n.parentElement
    }
    // a "tap to start" overlay is a bare div with a listener and no pointer cursor: take the full-screen ancestor named start / mulai
    for (n = node, hops = 0; n && n.nodeType === 1 && n !== D.body && hops++ < 8; n = n.parentElement) {
      if (/start|mulai/i.test(n.id + ' ' + (typeof n.className === 'string' ? n.className : ''))) {
        var r = n.getBoundingClientRect()
        if (r.width * r.height > BIG * W.innerWidth * W.innerHeight) return n
      }
    }
    return null
  }

  function info (el) {
    var r = el.getBoundingClientRect()
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24).toLowerCase()
    var cn = el.className && typeof el.className === 'string' ? el.className : ''
    var sig = (el.id + ' ' + cn + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.title || '') + ' ' + text).toLowerCase()
    return { el: el, tag: el.tagName.toLowerCase(), type: (el.getAttribute('type') || '').toLowerCase(), sig: sig, sigNoText: sig.slice(0, sig.length - text.length), text: text, w: r.width, h: r.height, area: r.width * r.height, inChoices: !!el.closest(CHOICES_BOX) }
  }
  function classify (el) {
    var o = el.closest('[data-sakuga]')
    var forced = o && o.getAttribute('data-sakuga')
    if (forced && KINDS[forced]) return forced
    var i = info(el)
    for (var k = 0; k < TABLE.length; k++) if (TABLE[k][1](i)) return TABLE[k][0]
    return 'secondary'
  }

  // a control pressed again and again is a control, whatever it is called (frequency rule)
  var hist = new WeakMap()
  function rapid (el, now) {
    var a = (hist.get(el) || []).filter(function (t) { return now - t < 1600 })
    a.push(now); hist.set(el, a)
    return a.length >= 4
  }

  // ───────────────────────── colours from the button itself ─────────────────────────
  function parse (s) {
    var m = /rgba?\(([^)]+)\)/.exec(s || '')
    if (m) { var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 } }
    m = /color\(srgb ([^)]+)\)/.exec(s || '')
    if (m) { var q = m[1].split(/[\s\/]+/).filter(Boolean).map(parseFloat); return { r: q[0] * 255, g: q[1] * 255, b: q[2] * 255, a: q.length > 3 ? q[3] : 1 } }
    return null
  }
  function hsl (c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1))
      h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
      h = (h * 60 + 360) % 360
    }
    return { h: h, s: s, l: l }
  }
  var NEUTRAL = { fill: '#fffaf0', shade: '#f1dfae', line: '#8c6d2f', accent: '#ffb703' }   // white / grey / black buttons: a warm gold, never the library's purple
  function palette (el) {
    var cs = W.getComputedStyle(el), list = [parse(cs.backgroundColor)]
    var gr = /rgba?\([^)]+\)/.exec(cs.backgroundImage || '')
    list.push(gr ? parse(gr[0]) : null)
    if (parseFloat(cs.borderTopWidth) > 0) list.push(parse(cs.borderTopColor))
    list.push(parse(cs.color))
    var pick = null
    for (var i = 0; i < list.length && !pick; i++) {            // the first colour that is solid and not grey / white / black
      var c = list[i]; if (!c || !(c.a >= 0.4)) continue
      var q = hsl(c); if (q.s >= 0.25 && q.l > 0.1 && q.l < 0.92) pick = q
    }
    if (!pick) return NEUTRAL
    var s = clamp(pick.s, 0.45, 0.9), h = Math.round(pick.h)
    function t (sat, l) { return 'hsl(' + h + ',' + Math.round(sat * 100) + '%,' + l + '%)' }
    return { accent: t(s, 52), fill: t(s * 0.8, 90), shade: t(s, 72), line: t(s * 0.8, 30) }
  }
  function paint (p) { var P = fx().P; P.accent = p.accent; P.fill = p.fill; P.shade = p.shade; P.line = p.line }

  // ───────────────────────── squash on the core clock ─────────────────────────
  // transform-origin = where the finger is, so the finger stays inside the shrinking button (a tap near an edge must
  // still count as a tap). The `scale` property composes with the element's own `transform`; an element that already
  // positions itself with transform / scale / translate / rotate or runs a CSS animation is never squashed.
  var live = new WeakMap()
  function squashBlock (el) {          // '' = fine, else the reason it is left alone (reported by the gate)
    var cs = W.getComputedStyle(el)
    if (cs.display === 'inline') return 'inline'
    if (cs.scale && cs.scale !== 'none') return 'own-scale'
    if (cs.translate && cs.translate !== 'none') return 'own-translate'
    if (cs.rotate && cs.rotate !== 'none') return 'own-rotate'
    if (cs.transform !== 'none') {     // a pulse (scale only) or a tiny bob is fine; a translate that CENTRES the element is not: scaling would drift it
      var m = /matrix(3d)?\(([^)]+)\)/.exec(cs.transform)
      if (!m) return 'transform'
      var v = m[2].split(',').map(parseFloat), tx = m[1] ? v[12] : v[4], ty = m[1] ? v[13] : v[5], sk = m[1] ? v[1] : v[1]
      if (Math.abs(tx) > 12 || Math.abs(ty) > 12) return 'transform-translate'
      if (Math.abs(sk) > 0.2) return 'transform-rotated'
    }
    return ''
  }
  function startSquash (el, kind, px, py) {
    var f = fx(), S = f.Spring, st = live.get(el)
    var feel = FEEL[kind] || FEEL.secondary
    if (!st) {
      if (squashBlock(el)) return null
      st = { el: el, y: new S(1, 520, 15), pop: new S(1, 300, 12), wide: feel.wide, last: f.now, run: false,
        was: { scale: el.style.scale, origin: el.style.transformOrigin, attr: el.hasAttribute('style') } }
      live.set(el, st)
    }
    st.wide = feel.wide
    if (px != null) el.style.transformOrigin = px + 'px ' + py + 'px'
    st.y.to = feel.low
    var tok = st.tok = (st.tok || 0) + 1
    stats.squash++
    if (!st.run) { st.run = true; st.last = f.now; f.later(0, function () { stepSquash(st) }) }
    f.later(1100, function () { if (st.tok === tok) st.y.to = 1 })               // a press whose release never arrives (element swapped, lost pointer)
    return st
  }
  function stepSquash (st) {
    var f = fx(), el = st.el, dt = f.now - st.last
    st.last = f.now
    var y = st.y.step(dt), p = st.pop.step(dt)
    var still_ = Math.abs(y - 1) < 0.002 && Math.abs(st.y.v) < 0.02 && Math.abs(p - 1) < 0.002 && Math.abs(st.pop.v) < 0.02 && st.y.to === 1
    if (!el.isConnected) { st.run = false; live.delete(el); return }
    if (still_) {
      st.run = false; live.delete(el)
      if (st.was.scale) el.style.scale = st.was.scale; else el.style.removeProperty('scale')
      if (st.was.origin) el.style.transformOrigin = st.was.origin; else el.style.removeProperty('transform-origin')
      if (!st.was.attr && el.getAttribute('style') === '') el.removeAttribute('style')
      return
    }
    el.style.scale = ((1 + (1 - y) * st.wide) * p).toFixed(4) + ' ' + (y * p).toFixed(4)
    f.later(0, function () { stepSquash(st) })
  }
  function release () {
    var f = fx(); if (!f) return
    for (var k = 0; k < pressed.length; k++) { var st = live.get(pressed[k]); if (st) st.y.to = 1 }
    pressed = []
  }
  var pressed = []

  // ───────────────────────── effects ─────────────────────────
  var lastBig = -1
  function centre (el, fallback) {
    var f = fx(), r = el.isConnected ? el.getBoundingClientRect() : null
    if (!r || !r.width) return fallback
    return { x: r.left + W.scrollX + r.width / 2, y: r.top + W.scrollY + r.height / 2, w: r.width, h: r.height }
  }
  // the button covers its own effect, the way the library draws it behind the control: an eraser drawn after the
  // effects clears the effect pixels under the button's box (the canvas holds nothing else)
  function cover (el, c, ms) {
    var f = fx(), box = c, rad = 0
    try { rad = parseFloat(W.getComputedStyle(el).borderTopLeftRadius) || 0 } catch (e) {}
    var h = f.persist(function () {
      var g = f.g, b = centre(el, box); box = b
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath()
      var r = Math.min(rad, b.w / 2, b.h / 2)
      if (g.roundRect) g.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, r); else g.rect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h)
      g.fill()
    })
    f.later(ms, function () { h.dead = true })
  }
  // Nothing an effect draws may land on ANOTHER control. Every spawn ends with a guard: an eraser (added after the
  // effects, so it clears them) over the box of each visible control near the pressed one. Chips are also only
  // emitted from an edge with free space, so they do not vanish into a neighbour.
  var NEIGH = 'button,a[href],[role="button"],input[type="button"],input[type="submit"],[onclick],[data-sakuga]'
  var NEIGH_CARD = '[class*="tile" i],[class*="card" i],[class*="node" i]'      // bare divs a game made clickable
  function neighbours (el, c) {      // the visible controls within 150 px of the pressed one (elements: games move them)
    var pad = 150, out = [], vx = c.x - W.scrollX, vy = c.y - W.scrollY
    var l0 = vx - c.w / 2 - pad, r0 = vx + c.w / 2 + pad, t0 = vy - c.h / 2 - pad, b0 = vy + c.h / 2 + pad
    function take (n) {
      if (n === el || n.contains(el) || el.contains(n)) return
      var r = n.getBoundingClientRect()
      if (r.width < 4 || r.height < 4 || r.right < l0 || r.left > r0 || r.bottom < t0 || r.top > b0) return
      if (r.width * r.height > 0.25 * W.innerWidth * W.innerHeight) return               // a page-sized wrapper is not a neighbour
      if (vx >= r.left && vx <= r.right && vy >= r.top && vy <= r.bottom) return        // it lies over the pressed control itself
      if (n.checkVisibility && !n.checkVisibility({ visibilityProperty: true })) return
      var hit = D.elementFromPoint(clamp(r.left + r.width / 2, 1, W.innerWidth - 1), clamp(r.top + r.height / 2, 1, W.innerHeight - 1))
      if (!hit || !(hit === n || n.contains(hit))) return                                 // covered by something else: not visible
      out.push(n)
    }
    var a = D.querySelectorAll(NEIGH), i
    for (i = 0; i < a.length; i++) take(a[i])
    var q = D.querySelectorAll(NEIGH_CARD)
    for (i = 0; i < q.length; i++) {
      var n = q[i]
      if (n.matches(NEIGH) || out.indexOf(n) >= 0) continue
      var r = n.getBoundingClientRect()
      if (r.right < l0 || r.left > r0 || r.bottom < t0 || r.top > b0) continue
      if (W.getComputedStyle(n).cursor === 'pointer') take(n)
    }
    return out
  }
  function rects (list) {            // page coordinates, read now
    return list.map(function (n) { var r = n.getBoundingClientRect(); return { l: r.left + W.scrollX, t: r.top + W.scrollY, r: r.right + W.scrollX, b: r.bottom + W.scrollY } })
  }
  function guard (list, ms) {        // an eraser over each neighbour, read every frame
    var f = fx()
    if (!list.length) return
    var h = f.persist(function () {
      var g = f.g, rs = rects(list); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath()
      for (var i = 0; i < rs.length; i++) g.rect(rs[i].l - 2, rs[i].t - 2, rs[i].r - rs[i].l + 4, rs[i].b - rs[i].t + 4)
      g.fill()
    })
    f.later(ms, function () { h.dead = true })
  }
  function freeEdge (list, c, side, gap) {      // no other control within `gap` px beyond this edge (top / bottom: over the button's width; left / right: over its height)
    var rs = rects(list), vert = side === 'top' || side === 'bottom'
    var vw = W.innerWidth, vh = W.innerHeight, sx = W.scrollX, sy = W.scrollY
    var edge = side === 'top' ? c.y - c.h / 2 - sy : side === 'bottom' ? c.y + c.h / 2 - sy : side === 'left' ? c.x - c.w / 2 - sx : c.x + c.w / 2 - sx
    if (edge < 4 || edge > (vert ? vh : vw) - 4) return false              // an edge off the screen has no room that anyone can see
    var a0 = vert ? c.x - c.w / 2 : c.y - c.h / 2, a1 = vert ? c.x + c.w / 2 : c.y + c.h / 2
    var e = side === 'top' ? c.y - c.h / 2 : side === 'bottom' ? c.y + c.h / 2 : side === 'left' ? c.x - c.w / 2 : c.x + c.w / 2
    for (var i = 0; i < rs.length; i++) {
      var n = rs[i], lo = vert ? n.l : n.t, hi = vert ? n.r : n.b
      if (hi <= a0 || lo >= a1) continue
      var near = vert ? [n.t, n.b] : [n.l, n.r]
      if (side === 'top' || side === 'left' ? (near[1] > e - gap && near[0] < e) : (near[0] < e + gap && near[1] > e)) return false
    }
    return true
  }
  function room (el) {              // true when the top or bottom edge has free space (no other control within 40 px)
    var c = centre(el, null); if (!c) return false
    var near = neighbours(el, c)
    return freeEdge(near, c, 'top', 40) || freeEdge(near, c, 'bottom', 40)
  }
  function wedges (el, c) {        // anticipation: three accent wedges above the button
    var f = fx(); stats.wedge++
    f.ticks(c.x, c.y - c.h / 2 - 3, { dir: -Math.PI / 2, n: 3, r: 3, len: clamp(c.h * 0.28, 9, 15), fan: 0.5, life: 0.36 })
    f.later(0, function () { guard(neighbours(el, c), 420) })   // next frame, before it is drawn: the DOM scan stays out of the input handler
  }
  // Layers, as in the library: the burst is BEHIND the button (an eraser, added right after it, clears the burst pixels
  // under the button's box); crystals and glints are added after that eraser, so they stay in front of it.
  function impact (el, c) {        // primary: burst + shards
    var f = fx(), now = f.now
    if (now - lastBig < 0.22) return                           // hammering one spot: the squash alone
    lastBig = now; stats.impact++; stats.burst++
    // the star must peek ~24 px past the button (it is hidden behind it); its needles reach ~1.75 R
    var R = clamp((Math.min(c.w, c.h) / 2 + 24) / 1.16, 30, 52)
    f.burst(c.x, c.y, { r: R, spikes: 15, life: 0.42 })
    cover(el, c, 520)
    // chips leave from the top and bottom edges, not from the middle of the label, and only where there is room;
    // the DOM scan runs on the next frame (before it is drawn), not inside the click handler
    f.later(0, function () {
      var near = neighbours(el, c), dx = Math.min(c.w / 4, 60), sz = clamp(R * 0.14, 5, 8)
      if (freeEdge(near, c, 'top', 40)) {
        f.shards(c.x - dx, c.y - c.h / 2, { n: 3, speed: 200, size: sz, life: 0.8, dir: -Math.PI / 2, arc: 1.8, grav: 420 })
        f.shards(c.x + dx, c.y - c.h / 2, { n: 3, speed: 200, size: sz, life: 0.8, dir: -Math.PI / 2, arc: 1.8, grav: 420 })
      }
      if (freeEdge(near, c, 'bottom', 40)) f.shards(c.x, c.y + c.h / 2, { n: 3, speed: 160, size: sz, life: 0.7, dir: Math.PI / 2, arc: 2.2, grav: 300 })
      guard(near, 850)
    })
  }
  function right (el, c) {         // answer, correct: the button pops, a burst peeks out, glints at the corners
    var f = fx(), R = clamp((Math.min(c.w, c.h) / 2 + 16) / 1.16, 24, 36)   // small: neighbours and the question sit just next to an answer
    stats.burst++; stats.kira++
    var st = live.get(el) || startSquash(el, 'answer', null, null)
    if (st) { st.y.to = 1; st.pop.x = 1.1 }
    f.burst(c.x, c.y, { r: R, spikes: 13, life: 0.4 })
    cover(el, c, 480)
    f.kira(c.x + c.w / 2 - 8, c.y - c.h / 2 + 6, { r: 14, life: 0.75 })
    f.kira(c.x - c.w / 2 + 10, c.y + c.h / 2 - 6, { r: 10, life: 0.65 })
    f.kira(c.x + c.w / 2 - 22, c.y + c.h / 2 - 4, { r: 8, life: 0.6 })
    f.later(0, function () { guard(neighbours(el, c), 800) })
  }
  function wrong (el, c) {         // answer, wrong: wobble marks on the sides that have room, no celebration
    var f = fx(); stats.wob++
    f.later(0, function () {
      var near = neighbours(el, c)
      if (freeEdge(near, c, 'left', 24)) f.wob(c.x - c.w / 2 - 5, c.y, { dir: -1, r: 9, life: 0.4 })
      if (freeEdge(near, c, 'right', 24)) f.wob(c.x + c.w / 2 + 5, c.y, { dir: 1, r: 9, life: 0.4 })
      guard(near, 450)
    })
  }
  function nudgeCanvas () {        // the core sizes the canvas in vw/vh; pin it to the real viewport so a mobile toolbar cannot shift the effects
    var c = D.querySelector('canvas.sakuga-fx')
    if (c && c.dataset.dsk !== W.innerWidth + 'x' + W.innerHeight) {
      c.style.width = W.innerWidth + 'px'; c.style.height = W.innerHeight + 'px'; c.dataset.dsk = W.innerWidth + 'x' + W.innerHeight
    }
  }

  // ───────────────────────── events ─────────────────────────
  var lastPress = null
  function onDown (e) {
    if (e.button > 0 || !fx() || still()) return
    var el = targetOf(e.target)
    if (!el || isDisabled(el)) return
    var kind = classify(el), now = (e.timeStamp || 0) / 1000
    if (kind === 'off') return
    if (kind !== 'fast' && rapid(el, now)) kind = 'fast'
    stats.press++
    var r = el.getBoundingClientRect()
    var px = e.clientX != null && e.pointerType !== '' ? clamp(e.clientX - r.left, 0, r.width) : null
    var py = px == null ? null : clamp(e.clientY - r.top, 0, r.height)
    var st = kind === 'tap' ? null : startSquash(el, kind, px, py)
    if (st) pressed.push(el)
    var c = { x: r.left + W.scrollX + r.width / 2, y: r.top + W.scrollY + r.height / 2, w: r.width, h: r.height }
    lastPress = { el: el, kind: kind, t0: Date.now(), c: c, pal: null, pt: { x: e.clientX + W.scrollX, y: e.clientY + W.scrollY } }
    if (kind === 'fast') return
    var pal = lastPress.pal = palette(el)
    paint(pal)
    if (kind === 'tap') {                                      // a full-screen "tap to start": one burst where the finger landed
      var f0 = fx()
      if (f0.now - lastBig > 0.22) {
        lastBig = f0.now; stats.impact++; stats.burst++
        f0.burst(lastPress.pt.x, lastPress.pt.y, { r: 46, spikes: 13, life: 0.36 })
        f0.shards(lastPress.pt.x, lastPress.pt.y, { n: 5, speed: 190, size: 6, life: 0.7, arc: 6.28, grav: 300 })
      }
      nudgeCanvas()
      return
    }
    if (kind !== 'secondary') wedges(el, c)                        // secondary: squash now, the three wedges at the corner on click
    nudgeCanvas()
  }
  function onClick (e) {
    if (!fx() || still()) return
    var el = targetOf(e.target)
    if (!el || isDisabled(el)) return
    var lp = lastPress && lastPress.el === el && Date.now() - lastPress.t0 < 1500 ? lastPress : null   // else: a click with no press (keyboard)
    var kind = lp ? lp.kind : classify(el)
    if (kind === 'off' || kind === 'fast') return
    if (kind === 'tap') return                                 // done on pointerdown: the overlay usually starts the game (and hides itself) before the click
    if (!lp) { var k = startSquash(el, kind, null, null); if (k) { k.y.x = FEEL[kind].low; pressed.push(el) } release() }
    if (kind === 'answer') return                              // the verdict comes from the game: see onAnswer
    var c = centre(el, lp && lp.c)
    if (!c) return
    paint(lp && lp.pal || palette(el))
    var st = live.get(el), f = fx()
    if (kind === 'primary') {
      if (st) st.pop.x = 1 + clamp(22 / Math.max(c.w, c.h), 0.06, 0.2)
      impact(el, c)
    } else {
      if (st) st.y.v += 3
      stats.wedge++
      f.ticks(c.x + c.w / 2 - 6, c.y - c.h / 2 + 2, { dir: -1.05, n: 3, r: 4, len: 13, fan: 0.36, life: 0.45 })
      f.later(0, function () { guard(neighbours(el, c), 500) })
    }
    nudgeCanvas()
  }
  function onAnswer (e) {
    var d = e && e.detail
    if (!d || !lastPress || lastPress.kind !== 'answer' || still() || !fx()) return
    if (Date.now() - lastPress.t0 > 2500) return  // wall clock: the core clock stops with a hidden tab
    var c = centre(lastPress.el, lastPress.c); if (!c) return
    paint(lastPress.pal || NEUTRAL)
    if (d.ok === true) right(lastPress.el, c); else if (d.ok === false) wrong(lastPress.el, c)
    nudgeCanvas()
  }

  function boot () {
    var root = D.documentElement   // not document/body: keeps the page's own "any tap" heuristics (and tap-time gates) untouched
    root.addEventListener('pointerdown', onDown, true)
    root.addEventListener('click', onClick, true)
    root.addEventListener('pointerup', release, true)
    root.addEventListener('pointercancel', release, true)
    W.addEventListener('dunia:answer', onAnswer)
  }

  boot()
  W.DuniaSakuga = { version: 1, classify: classify, squashBlock: squashBlock, neighbours: neighbours, room: room, stats: stats, table: TABLE.map(function (r) { return r[0] }) }
})()
