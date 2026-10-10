/* =============================================================================
 * kereta-board.js — window.KeretaBoard: draws and animates one level of "Kereta Pemberani: Petualangan Rel".
 * Layers (bottom to top): ground canvas (grass, water, ballast, sleepers, rails; bridge / tunnel / bumpy / field
 * path / pond path / platform / hill looks) -> decor sprites -> things (cargo, stops, levers, signals, critters,
 * parked wagons, goal pins) -> trains (top-down sprites picked by heading from TrainSprites, CSS wagons that trail
 * the head) -> roof canvas (tunnel mounds hide the trains inside) -> fx canvas (steam, sparks, ripples, confetti).
 * The engine (kereta-grid.js) is the truth: view.sync(world) always makes the DOM equal to a world; apply() only
 * animates the way there. Reduced motion: short tweens and no particles beyond a whistle ring.
 *
 *   var v = KeretaBoard.create(host, level, {onResize})   v.reset(world)   v.apply(events, before, after, done)
 *   v.bonk(trainId, reason)   v.celebrate()   v.destroy()   v.cell(r, c) -> {x, y, s}   v.size
 * ==========================================================================*/
(function (W) {
  'use strict'
  var KG = W.KeretaGrid, KA = W.KeretaArt, FX = W.KeretaFX, TS = W.TrainSprites
  var DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1], CARD = ['n', 'e', 's', 'w']
  function el (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function hash (r, c, k) { var h = (r * 73856093) ^ (c * 19349663) ^ ((k || 0) * 83492791); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
  function ease (u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2 }
  function isRail (m, r, c) { return r >= 0 && c >= 0 && r < m.R && c < m.C && KG.isRail(m.grid[r][c]) }
  function tile (m, r, c) { return r >= 0 && c >= 0 && r < m.R && c < m.C ? m.grid[r][c] : ' ' }

  var PRE = {}
  var PROF = { none: function (u) { return u }, start: function (u) { return 2 * u * u - u * u * u }, stop: function (u) { var v = 1 - u; return 1 - (2 * v * v - v * v * v) }, both: function (u) { return u * u * (3 - 2 * u) } }
  function create (host, lv, opts) {
    opts = opts || {}
    var m = KG.model(lv), B = KA.BIOMES[lv.biome] || KA.BIOMES.country, R = m.R, C = m.C
    var root = el('div', 'kb'), tilt = el('div', 'kb-tilt'), ground = el('canvas', 'kb-ground'), roof = el('canvas', 'kb-roof'), fxc = el('canvas', 'kb-fx')
    var decor = el('div', 'kb-decor'), things = el('div', 'kb-things'), trains = el('div', 'kb-trains')
    tilt.appendChild(ground); tilt.appendChild(decor); tilt.appendChild(things); tilt.appendChild(trains); tilt.appendChild(roof); tilt.appendChild(fxc)
    root.appendChild(tilt); host.innerHTML = ''; host.appendChild(root)
    var fx = FX.particles(fxc), cs = 48, thingEl = {}, trainEl = {}, gateEl = {}, last = null, destroyed = false, timers = []
    var size = { w: 0, h: 0 }

    function px (r, c) { return { x: (c + 0.5) * cs, y: (r + 0.5) * cs } }
    function later (fn, ms) { var t = setTimeout(function () { if (!destroyed) fn() }, ms); timers.push(t); return t }
    var speed = 1
    function dur () { return (FX.reduced() ? 110 : 330) / speed }

    /* ── ground ──────────────────────────────────────────────────────────────────────────────────────── */
    function railPath (g, x, y, dirs, look, off) {
      // draws the metal for one cell: a straight run, a quarter-circle corner, or spokes from the centre
      var h = cs / 2, cx = x + h, cy = y + h
      function line (ax, ay, bx, by, o) {
        var dx = bx - ax, dy = by - ay, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L * o, ny = dx / L * o
        g.beginPath()
        if (look === 'M') { var n = 6; g.moveTo(ax + nx, ay + ny); for (var i = 1; i <= n; i++) { var u = i / n, w = Math.sin(u * Math.PI * 3) * cs * 0.035; g.lineTo(ax + dx * u + nx + (-dy / L) * w, ay + dy * u + ny + (dx / L) * w) } }
        else { g.moveTo(ax + nx, ay + ny); g.lineTo(bx + nx, by + ny) }
        g.stroke()
      }
      var E = [[cx, y], [x + cs, cy], [cx, y + cs], [x, cy]] // edge midpoints N E S W
      if (dirs.length === 2 && (dirs[0] + 2) % 4 !== dirs[1]) { // corner: two concentric quarter circles round the shared cell corner
        var a = dirs[0], b = dirs[1], lo = Math.min(a, b), hi = Math.max(a, b)
        var corner = (lo === 0 && hi === 1) ? [x + cs, y] : (lo === 1 && hi === 2) ? [x + cs, y + cs] : (lo === 2 && hi === 3) ? [x, y + cs] : [x, y]
        var a0 = Math.atan2(E[a][1] - corner[1], E[a][0] - corner[0]), a1 = Math.atan2(E[b][1] - corner[1], E[b][0] - corner[0])
        var dl = ((a1 - a0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
        ;[h - off, h + off].forEach(function (rad) { g.beginPath(); g.arc(corner[0], corner[1], rad, a0, a1, dl < 0); g.stroke() })
        return
      }
      if (dirs.length === 2) { line(E[dirs[0]][0], E[dirs[0]][1], E[dirs[1]][0], E[dirs[1]][1], -off); line(E[dirs[0]][0], E[dirs[0]][1], E[dirs[1]][0], E[dirs[1]][1], off); return }
      dirs.forEach(function (d) { line(cx, cy, E[d][0], E[d][1], -off); line(cx, cy, E[d][0], E[d][1], off) })
      if (dirs.length === 1) { var d1 = dirs[0], o2 = (d1 + 2) % 4; line(cx, cy, E[o2][0] * 0.35 + cx * 0.65, E[o2][1] * 0.35 + cy * 0.65, 0) }
    }
    function drawGround () {
      var dpr = Math.min(2, W.devicePixelRatio || 1), w = C * cs, h = R * cs
      ;[ground, roof].forEach(function (c) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px' })
      var g = ground.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h)
      var r, c, ch
      for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
        ch = m.grid[r][c]; var x = c * cs, y = r * cs
        if (ch === ' ') continue
        if (ch === '~') { g.fillStyle = '#6fb6df'; g.fillRect(x, y, cs, cs); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; for (var k = 0; k < 2; k++) { var wx = x + cs * (0.2 + 0.4 * hash(r, c, k)), wy = y + cs * (0.25 + 0.45 * k); g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + cs * 0.12, wy - cs * 0.07, wx + cs * 0.25, wy); g.stroke() } continue }
        g.fillStyle = (r + c) % 2 ? B.g1 : B.g2; g.fillRect(x, y, cs, cs)
        if (ch === ',' || ch === 'T' || ch === '.') { g.fillStyle = 'rgba(255,255,255,.08)'; for (var q = 0; q < 2; q++) { g.beginPath(); g.arc(x + cs * hash(r, c, q + 3), y + cs * hash(r, c, q + 7), cs * 0.05, 0, 6.28); g.fill() } }
      }
      // rails
      for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
        ch = m.grid[r][c]; if (!KG.isRail(ch)) continue
        var X = c * cs, Y = r * cs, dirs = []
        for (var d = 0; d < 4; d++) if (isRail(m, r + DR[d], c + DC[d])) dirs.push(d)
        drawRailCell(g, X, Y, ch, dirs, r, c)
      }
      // roof (tunnel mounds) on its own layer so the trains vanish inside
      var gr = roof.getContext('2d'); gr.setTransform(dpr, 0, 0, dpr, 0, 0); gr.clearRect(0, 0, w, h)
      for (r = 0; r < R; r++) for (c = 0; c < C; c++) if (m.grid[r][c] === 'U') drawMound(gr, c * cs, r * cs, r, c)
    }
    function drawRailCell (g, x, y, ch, dirs, r, c) {
      var off = cs * 0.17, hw = cs * 0.34
      if (ch === 'F') { // field path: packed dirt, no rails
        g.strokeStyle = '#c9a56b'; g.lineWidth = cs * 0.46; g.lineCap = 'round'; pathLines(g, x, y, dirs)
        g.strokeStyle = 'rgba(120,80,40,.25)'; g.lineWidth = cs * 0.08; pathLines(g, x, y, dirs); return
      }
      if (ch === 'P') { g.fillStyle = '#5fb0dc'; g.fillRect(x, y, cs, cs); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.4; g.beginPath(); g.arc(x + cs * 0.3, y + cs * 0.72, cs * 0.08, 0, 6.28); g.stroke(); g.beginPath(); g.arc(x + cs * 0.72, y + cs * 0.3, cs * 0.06, 0, 6.28); g.stroke() }
      if (ch === 'S') { g.fillStyle = '#d8cdb4'; g.fillRect(x + 1, y + cs * 0.06, cs - 2, cs * 0.88); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; g.strokeRect(x + 1, y + cs * 0.06, cs - 2, cs * 0.88) }
      if (ch === 'B') { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 3, y + 5, cs - 2, cs - 2); g.fillStyle = '#a9794a'; g.fillRect(x, y, cs, cs); g.strokeStyle = 'rgba(70,40,15,.55)'; g.lineWidth = 1.4; for (var p = 1; p < 5; p++) { g.beginPath(); if (dirs.indexOf(1) >= 0 || dirs.indexOf(3) >= 0) { g.moveTo(x + cs * p / 5, y); g.lineTo(x + cs * p / 5, y + cs) } else { g.moveTo(x, y + cs * p / 5); g.lineTo(x + cs, y + cs * p / 5) } g.stroke() } }
      // ballast
      if (ch !== 'B' && ch !== 'P' && ch !== 'S') { g.strokeStyle = ch === 'U' ? '#55504a' : B.bed; g.lineWidth = hw * 1.9; g.lineCap = 'butt'; pathLines(g, x, y, dirs, true) }
      // sleepers
      g.strokeStyle = B.sleeper; g.lineWidth = Math.max(2, cs * 0.06); g.lineCap = 'butt'
      sleepers(g, x, y, dirs)
      // rails
      g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = Math.max(2, cs * 0.075); railPath(g, x, y + 1.5, dirs, ch, off)
      g.strokeStyle = B.rail; g.lineWidth = Math.max(1.8, cs * 0.055); railPath(g, x, y, dirs, ch, off)
      if (ch === 'H') { g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; for (var s = 0; s < 2; s++) { var ox = x + cs * (0.3 + 0.4 * s); g.beginPath(); g.moveTo(ox - 4, y + cs * 0.55); g.lineTo(ox, y + cs * 0.4); g.lineTo(ox + 4, y + cs * 0.55); g.stroke() } }
      if (ch === 'M') { g.fillStyle = 'rgba(120,85,45,.55)'; for (var b = 0; b < 3; b++) { g.beginPath(); g.ellipse(x + cs * (0.2 + 0.3 * b), y + cs * (hash(r, c, b) > 0.5 ? 0.12 : 0.88), cs * 0.07, cs * 0.04, 0, 0, 6.28); g.fill() } }
    }
    function pathLines (g, x, y, dirs, thin) {
      var cx = x + cs / 2, cy = y + cs / 2, E = [[cx, y], [x + cs, cy], [cx, y + cs], [x, cy]]
      g.beginPath()
      if (dirs.length === 2 && (dirs[0] + 2) % 4 !== dirs[1]) { g.moveTo(E[dirs[0]][0], E[dirs[0]][1]); g.quadraticCurveTo(cx, cy, E[dirs[1]][0], E[dirs[1]][1]) }
      else if (!dirs.length) { g.moveTo(cx, cy); g.lineTo(cx + 0.1, cy) }
      else dirs.forEach(function (d) { g.moveTo(cx, cy); g.lineTo(E[d][0], E[d][1]) })
      g.stroke()
    }
    function sleepers (g, x, y, dirs) {
      var cx = x + cs / 2, cy = y + cs / 2, E = [[cx, y], [x + cs, cy], [cx, y + cs], [x, cy]], n = 2
      function bar (px0, py0, ang) { var l = cs * 0.34; g.beginPath(); g.moveTo(px0 - Math.cos(ang) * l, py0 - Math.sin(ang) * l); g.lineTo(px0 + Math.cos(ang) * l, py0 + Math.sin(ang) * l); g.stroke() }
      if (dirs.length === 2 && (dirs[0] + 2) % 4 !== dirs[1]) {
        for (var i = 0; i < n; i++) { var u = (i + 0.5) / n, a = E[dirs[0]], b = E[dirs[1]]; var ox = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * cx + u * u * b[0], oy = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * cy + u * u * b[1]; var tx = 2 * (1 - u) * (cx - a[0]) + 2 * u * (b[0] - cx), ty = 2 * (1 - u) * (cy - a[1]) + 2 * u * (b[1] - cy); bar(ox, oy, Math.atan2(ty, tx) + 1.5708) }
        return
      }
      dirs.forEach(function (d) { for (var i = 0; i < n; i++) { var u = (i + 0.5) / n / (dirs.length === 2 ? 1 : 1); var ox = cx + (E[d][0] - cx) * u, oy = cy + (E[d][1] - cy) * u; bar(ox, oy, d % 2 ? 1.5708 : 0) } })
      if (!dirs.length) bar(cx, cy, 0)
    }
    function drawMound (g, x, y, r, c) {
      var open = [], d
      for (d = 0; d < 4; d++) { var nr = r + DR[d], nc = c + DC[d]; if (isRail(m, nr, nc) && tile(m, nr, nc) !== 'U') open.push(d) }
      g.fillStyle = '#7a7266'; g.beginPath(); g.roundRect ? g.roundRect(x + 1, y + 1, cs - 2, cs - 2, cs * 0.22) : g.rect(x + 1, y + 1, cs - 2, cs - 2); g.fill()
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + cs * 0.12, y + cs * 0.12, cs * 0.76, cs * 0.18)
      g.fillStyle = '#5c8f4c'; g.beginPath(); g.arc(x + cs * 0.3, y + cs * 0.3, cs * 0.16, 0, 6.28); g.arc(x + cs * 0.68, y + cs * 0.66, cs * 0.12, 0, 6.28); g.fill()
      open.forEach(function (o) { // a dark arch where the track enters
        var cx = x + cs / 2, cy = y + cs / 2, ex = cx + DC[o] * cs * 0.42, ey = cy + DR[o] * cs * 0.42
        g.save(); g.fillStyle = 'rgba(25,20,18,.92)'; g.beginPath(); g.arc(ex, ey, cs * 0.3, 0, 6.28); g.fill(); g.strokeStyle = '#a89a86'; g.lineWidth = cs * 0.06; g.stroke(); g.restore()
      })
    }

    /* ── decor, things, trains ───────────────────────────────────────────────────────────────────────── */
    function img (key, cls) { var i = el('img', cls || 'kb-img'); i.alt = ''; i.decoding = 'async'; i.draggable = false; i.src = KA.src(key); return i }
    function place (e, r, c, dx, dy) { e.style.left = ((c + 0.5 + (dx || 0)) * cs) + 'px'; e.style.top = ((r + 0.5 + (dy || 0)) * cs) + 'px' }
    function buildStatic () {
      decor.innerHTML = ''
      var r, c, ch, e
      for (r = 0; r < R; r++) for (c = 0; c < C; c++) {
        ch = m.grid[r][c]
        if (ch === 'T') { e = img(B.deco[(r + c) % B.deco.length] === 'game/bush' ? 'gt/pine-tree' : (lv.biome === 'forest' || lv.biome === 'mountain' || lv.biome === 'night' ? 'gt/pine-tree' : (hash(r, c, 1) > 0.5 ? 'gt-el/oak-tree' : 'gt/pine-tree')), 'kb-deco tree'); place(e, r, c, 0, -0.22); decor.appendChild(e) }
        else if (ch === '#' || ch === 'V') { e = img(ch === 'V' ? 'mojo-prop/house' : 'mojo-prop/building-station', 'kb-deco bldg'); place(e, r, c, 0, -0.12); decor.appendChild(e) }
        else if (ch === 'R') { e = img('mojo-prop/rock', 'kb-deco rock'); place(e, r, c, 0, 0.05); decor.appendChild(e) }
        else if (ch === ',' && hash(r, c, 9) > 0.86 && B.deco.length) { e = img(B.deco[(r * 3 + c) % B.deco.length], 'kb-deco small'); place(e, r, c, (hash(r, c, 4) - 0.5) * 0.3, 0.05); decor.appendChild(e) }
      }
      // the scenario's cast stands on free grass (never on a rail); animals the level already draws as critters are skipped
      var cast = (W.KeretaCast && W.KeretaCast[lv.ch] && W.KeretaCast[lv.ch][lv.n]) || [], free = []
      for (r = 0; r < R; r++) for (c = 0; c < C; c++) if (m.grid[r][c] === ',' && !isRail(m, r - 1, c) && !isRail(m, r + 1, c) && !isRail(m, r, c - 1) && !isRail(m, r, c + 1) && hash(r, c, 21) > 0.35) free.push([r, c])
      free.sort(function (a, b) { return hash(a[0], a[1], 5) - hash(b[0], b[1], 5) })
      var crit = {}; KG.world(lv).things.forEach(function (o) { if (o.type === 'critter') crit[o.kind] = 1 })
      cast.slice(0, 3).forEach(function (k, i) {
        if (!free[i] || (crit.kura && /turtle/.test(k)) || (crit.beruang && /beruang/.test(k)) || (crit.burung && /bird/.test(k))) return
        var ce = img(k, 'kb-deco cast'); place(ce, free[i][0], free[i][1], 0, -0.18); ce.title = (W.KeretaCast.names || {})[k] || ''; decor.appendChild(ce)
      })
      ;(lv.decor || []).forEach(function (d) { var e2 = img(d.sprite, 'kb-deco peek'); place(e2, d.r, d.c, 0, -0.05); if (d.label) e2.title = d.label; decor.appendChild(e2) })
    }
    function pinEl (r, c, goal) {
      var p = el('div', 'kb-pin'); p.innerHTML = '<span class="kb-pin-in">' + KA.goalIcon(goal) + '</span>'; place(p, r, c, 0, -0.62); return p
    }
    function buildThings () {
      things.innerHTML = ''; thingEl = {}; gateEl = {}
      var w0 = KG.world(lv)
      w0.things.forEach(function (o) {
        var e = el('div', 'kb-thing kb-' + o.type), inner
        e.setAttribute('data-id', o.id)
        if (o.type === 'cargo') { inner = img(o.sprite || KA.cargo(o.kind), 'kb-img cargo'); e.appendChild(inner); place(e, o.r, o.c, 0, -0.04) }
        else if (o.type === 'stop') {
          e.appendChild(img('mojo-prop/building-station', 'kb-img bldg'))
          var tag = el('div', 'kb-stoptag', '<span class="kb-stopicon">' + KA.goalIcon({ icon: o.accepts, sprite: o.sprite }) + '</span><b class="kb-stopcount">0/' + o.need + '</b>')
          e.appendChild(tag); place(e, o.r, o.c, 0, -0.1)
        } else if (o.type === 'lever') { e.innerHTML = KA.icon('tuas', 'kb-leverico') + (o.q ? '<i class="kb-qmark">?</i>' : ''); place(e, o.r, o.c, 0, 0) }
        else if (o.type === 'gate') { e.className += ' ' + (o.look === 'barrier' ? 'barrier' : 'signal'); e.innerHTML = o.look === 'barrier' ? '<i class="kb-bar"></i>' : KA.icon('signal', 'kb-gateico') + '<i class="kb-lamp"></i>'; place(e, o.r, o.c, 0, -0.12); gateEl[o.id] = e }
        else if (o.type === 'critter') {
          var key = KA.critter(o.kind) || o.sprite
          if (key) e.appendChild(img(key, 'kb-img critter')); else { e.innerHTML = KA.placeholder('Goro'); e.className += ' ph' }
          place(e, o.r, o.c, 0, -0.1)
        } else if (o.type === 'wagon') { e.appendChild(wagonBody(o.parked ? 'parked' : 'free')); place(e, o.r, o.c, 0, 0) }
        thingEl[o.id] = e; things.appendChild(e)
      })
      ;(lv.goal || []).forEach(function (g) {
        if (g.t === 'reach') { var p = m.pins[g.pin || 'Z']; if (p) { var pe = pinEl(p[0], p[1], g); pe.setAttribute('data-pin', g.pin || 'Z'); things.appendChild(pe) } }
      })
    }
    function trainColors (id) { var t = KA.TRAINS[id] || { body: '#777', trim: '#333' }; return t }
    function wagonBody (tone, id) {
      var w = el('div', 'kb-wag ' + (tone || ''))
      if (id) { var t = trainColors(id); w.style.setProperty('--wb', t.body); w.style.setProperty('--wt', t.trim) }
      if (lv.wagonSprite === 'mojo-prop/logs') w.className += ' logs'
      w.innerHTML = '<i></i><i></i><i></i>'
      return w
    }
    function buildTrains () {
      trains.innerHTML = ''; trainEl = {}
      KG.world(lv).trains.forEach(function (t) {
        var head = el('div', 'kb-train'), im = img(TS.pick(KA.TRAINS[t.id] ? KA.TRAINS[t.id].char : t.char, { facing: t.d * 90, view: 'top' }), 'kb-engine')
        head.appendChild(im); head.setAttribute('data-train', t.id)
        trains.appendChild(head)
        trainEl[t.id] = { head: head, img: im, wag: [], d: t.d, name: t.id }
      })
    }
    var sizeCache = {}
    function engineSize (id, d) {
      var ck = id + d + ':' + cs, hit = sizeCache[ck]
      if (hit) return hit
      var key = TS.pick(KA.TRAINS[id] ? KA.TRAINS[id].char : id, { facing: d * 90, view: 'top' }), inf = TS.info(key)
      var long = Math.max(inf.w, inf.h), k = cs * 1.32 / long
      return (sizeCache[ck] = { key: key, w: inf.w * k, h: inf.h * k })
    }
    function preload () {   // every heading of every train + the level's sprites, decoded before the first run (no pop-in)
      var seen = {}
      function warm (k) { if (!k || seen[k] || PRE[k]) return; seen[k] = 1; var i = new Image(); i.decoding = 'async'; i.src = KA.src(k); PRE[k] = i; if (i.decode) i.decode().catch(function () {}) }
      KG.world(lv).trains.forEach(function (t) { for (var d = 0; d < 4; d++) warm(engineSize(t.id, d).key) })
      KG.world(lv).things.forEach(function (o) { warm(o.sprite || (o.type === 'cargo' ? KA.cargo(o.kind) : o.type === 'critter' ? KA.critter(o.kind) : null)) })
      ;(lv.decor || []).forEach(function (d) { warm(d.sprite) })
    }
    function setEngine (id, x, y, d, rot) {
      var T = trainEl[id], s = engineSize(id, d)
      if (T.key !== s.key) { T.img.src = KA.src(s.key); T.key = s.key; T.img.style.width = s.w + 'px'; T.img.style.height = s.h + 'px'; T.head.style.transformOrigin = (s.w / 2) + 'px ' + (s.h / 2) + 'px' }
      T.head.style.transform = 'translate3d(' + (x - s.w / 2).toFixed(2) + 'px,' + (y - s.h / 2).toFixed(2) + 'px,0)' + (rot ? ' rotate(' + rot.toFixed(2) + 'deg)' : '')
      T.d = d
    }
    function setWagon (T, i, x, y, horiz, id) {
      var w = T.wag[i]
      if (!w) { w = wagonBody('', id); w.style.width = cs * 0.82 + 'px'; w.style.height = cs * 0.44 + 'px'; trains.appendChild(w); T.wag[i] = w }
      w.style.transform = 'translate3d(' + (x - cs * 0.41).toFixed(2) + 'px,' + (y - cs * 0.22).toFixed(2) + 'px,0)' + (horiz ? '' : ' rotate(90deg)')
    }
    function trimWagons (T, n) { while (T.wag.length > n) { var w = T.wag.pop(); if (w.parentNode) w.parentNode.removeChild(w) } }
    function placeTrain (t, pos) { // pos: {head:[r,c], tail:[[r,c]...], rot}
      var T = trainEl[t.id], hp = px(pos.head[0], pos.head[1])
      setEngine(t.id, hp.x, hp.y, pos.d != null ? pos.d : t.d, pos.rot || 0)
      trimWagons(T, pos.tail.length)
      var prev = pos.head
      pos.tail.forEach(function (c, i) {
        var p = px(c[0], c[1]), horiz = Math.abs(prev[1] - c[1]) >= Math.abs(prev[0] - c[0])
        setWagon(T, i, p.x, p.y, horiz, t.id); prev = c
      })
    }

    /* ── sync: DOM = world ────────────────────────────────────────────────────────────────────────────── */
    function sync (w) {
      last = w
      w.things.forEach(function (o) {
        var e = thingEl[o.id]
        if (!e) {
          if (o.type === 'cargo' || o.type === 'wagon') { e = el('div', 'kb-thing kb-' + o.type); e.setAttribute('data-id', o.id); e.appendChild(o.type === 'cargo' ? img(o.sprite || KA.cargo(o.kind), 'kb-img cargo') : wagonBody('parked')); things.appendChild(e); thingEl[o.id] = e } else return
        }
        var gone = o.taken || o.gone
        if (o.type === 'cargo') { e.style.display = gone ? 'none' : ''; place(e, o.r, o.c, 0, -0.04) }
        else if (o.type === 'critter') { e.style.display = o.gone ? 'none' : '' }
        else if (o.type === 'wagon') { e.style.display = o.taken ? 'none' : ''; e.firstChild.className = 'kb-wag ' + (o.parked ? 'parked' : 'free') + (lv.wagonSprite === 'mojo-prop/logs' ? ' logs' : ''); place(e, o.r, o.c, 0, 0) }
        else if (o.type === 'gate') { e.classList.toggle('open', !!o.open) }
        else if (o.type === 'lever') { e.classList.toggle('on', !!o.on) }
        else if (o.type === 'stop') { var cn = e.querySelector('.kb-stopcount'); if (cn) cn.textContent = o.count + '/' + o.need; e.classList.toggle('done', o.count >= o.need) }
      })
      w.trains.forEach(function (t) { placeTrain(t, { head: [t.r, t.c], tail: t.tail, d: t.d }) })
      var pr = KG.progress(w)
      ;[].forEach.call(things.querySelectorAll('.kb-pin'), function (p) { p.classList.toggle('on', pr.some(function (g) { return g.t === 'reach' && g.done })) })
    }

    /* ── animation ───────────────────────────────────────────────────────────────────────────────────── */
    function tween (ms, fn, end, prof) {
      var t0 = null, raf, f = prof || ease
      function step (ts) { if (destroyed) return; if (t0 == null) t0 = ts; var u = Math.min(1, (ts - t0) / ms); fn(f(u), u); if (u < 1) raf = requestAnimationFrame(step); else if (end) end() }
      raf = requestAnimationFrame(step)
    }
    function angDelta (a, b) { var d = ((a - b) % 360 + 540) % 360 - 180; return d }
    function apply (events, before, after, done, flags) {
      flags = flags || {}
      var moves = events.filter(function (e) { return e.e === 'move' }), rest = events.filter(function (e) { return e.e !== 'move' })
      var D = dur(), pending = 0, fin = false
      var prof = PROF[flags.easeIn && flags.easeOut ? 'both' : flags.easeIn ? 'start' : flags.easeOut ? 'stop' : 'none']
      function fire () { if (!fin) { fin = true; sync(after); if (done) done() } }
      function verbs () {
        var n = 0
        rest.forEach(function (ev) { n += effect(ev, before, after) })
        later(fire, n ? (FX.reduced() ? 120 : 260 / speed) : 0)
      }
      if (!moves.length) { verbs(); return }
      moves.forEach(function (mv) {
        var tb = before.trains.filter(function (t) { return t.id === mv.train })[0], ta = after.trains.filter(function (t) { return t.id === mv.train })[0]
        var toD = ta.d, turn = angDelta(tb.d * 90, toD * 90), newTail = ta.tail, steps = [[tb.r, tb.c]].concat(tb.tail)
        var tail = [], hd = [0, 0], pos = { head: hd, tail: tail, d: toD, rot: 0 }, puffed = 0
        for (var i = 0; i < newTail.length; i++) tail.push([0, 0])
        var tg = tile(m, ta.r, ta.c)
        FX.sound.chuff(); if (tg === 'P') FX.sound.splash()
        pending++
        tween(D, function (e, u) {
          hd[0] = tb.r + (ta.r - tb.r) * e; hd[1] = tb.c + (ta.c - tb.c) * e
          for (var j = 0; j < newTail.length; j++) { var o = steps[j] || steps[steps.length - 1]; tail[j][0] = o[0] + (newTail[j][0] - o[0]) * e; tail[j][1] = o[1] + (newTail[j][1] - o[1]) * e }
          pos.rot = turn * (1 - e) + (FX.reduced() ? 0 : Math.sin(u * Math.PI) * 0.7)
          placeTrain(ta, pos)
          if (puffed < 3 && u > puffed / 3 + 0.05) { puffed++; var hp = px(hd[0], hd[1]); fx.emit('steam', hp.x + DC[toD] * cs * 0.18, hp.y + DR[toD] * cs * 0.18 - cs * 0.15, { dx: -DC[toD] * 0.6, r: cs * 0.1 }); if (tg === 'M') fx.emit('dust', hp.x, hp.y + cs * 0.2); if (tg === 'P') fx.emit('ripple', hp.x, hp.y) }
        }, function () { pending--; if (!pending) verbs() }, prof)
      })
    }
    function toward (ev, after) { var t = after.trains.filter(function (x) { return x.id === ev.train })[0]; return t ? px(t.r, t.c) : { x: 0, y: 0 } }
    function effect (ev, before, after) {
      var e, p
      if (ev.e === 'load') {
        FX.sound.ding(); e = thingEl[ev.thing]; p = toward(ev, after)
        if (e && !FX.reduced()) { e.style.display = ''; var s = px(ev.at[0], ev.at[1]); e.style.transition = 'left .24s ease-in, top .24s ease-in, transform .24s ease-in, opacity .24s'; e.style.left = p.x + 'px'; e.style.top = p.y + 'px'; e.style.transform = 'translate(-50%,-50%) scale(.2)'; e.style.opacity = '0'; later(function () { e.style.transition = ''; e.style.transform = ''; e.style.opacity = ''; e.style.display = 'none' }, 270) }
        fx.burst('star', p.x, p.y, 4); return 1
      }
      if (ev.e === 'unload') { FX.sound.ding(); var sp = px(ev.at[0], ev.at[1]); fx.burst('star', sp.x, sp.y - cs * 0.3, 6); var sb = thingEl[ev.stop]; if (sb) { sb.classList.add('pop'); later(function () { sb.classList.remove('pop') }, 400) } return 1 }
      if (ev.e === 'lever') {
        FX.sound.lever(); var lp = px(ev.at[0], ev.at[1]); fx.burst('spark', lp.x, lp.y, 7)
        ev.toggles.forEach(function (gi) { var g = gateEl['g' + gi]; if (g) { var gp = { x: parseFloat(g.style.left), y: parseFloat(g.style.top) }; fx.burst('spark', gp.x, gp.y, 5) } })
        return 1
      }
      if (ev.e === 'whistle') { FX.sound.whistle(); p = toward(ev, after); fx.emit('ring', p.x, p.y - cs * 0.2); fx.emit('ring', p.x, p.y - cs * 0.2, { c: '#ffffff', life: 0.9 }); return 1 }
      if (ev.e === 'critter-leave') {
        e = thingEl[ev.thing]
        if (e && !FX.reduced()) { e.style.display = ''; e.style.transition = 'transform .45s ease-in, opacity .45s'; e.style.transform = 'translate(-50%,-50%) translateY(-' + cs * 0.9 + 'px) scale(.6)'; e.style.opacity = '0'; later(function () { e.style.transition = ''; e.style.transform = ''; e.style.opacity = ''; e.style.display = 'none' }, 480) }
        if (ev.kind === 'burung') fx.burst('leaf', px(ev.at[0], ev.at[1]).x, px(ev.at[0], ev.at[1]).y, 3)
        return 1
      }
      if (ev.e === 'couple') { FX.sound.clunk(); p = px(ev.at[0], ev.at[1]); fx.burst('spark', p.x, p.y, 5); e = thingEl[ev.thing]; if (e) e.style.display = 'none'; return 1 }
      if (ev.e === 'uncouple') { FX.sound.clunk(); p = px(ev.at[0], ev.at[1]); fx.burst('dust', p.x, p.y, 3); return 1 }
      if (ev.e === 'turn') { FX.sound.clack(); return 1 }
      return 0
    }
    function bonk (id, reason) {
      var T = trainEl[id]; if (!T || !last) return
      var t = last.trains.filter(function (x) { return x.id === id })[0]; FX.sound.boop()
      if (FX.reduced()) return
      var p = px(t.r, t.c), d = t.d, k = 0
      tween(240, function (e) { var s = Math.sin(e * Math.PI) * cs * 0.12; var s2 = engineSize(id, t.d); T.head.style.transform = 'translate(' + (p.x - s2.w / 2 + DC[d] * s) + 'px,' + (p.y - s2.h / 2 + DR[d] * s) + 'px)' }, function () { placeTrain(t, { head: [t.r, t.c], tail: t.tail, d: t.d }) })
      fx.emit('dust', p.x + DC[d] * cs * 0.5, p.y + DR[d] * cs * 0.5)
    }
    function celebrate () {
      FX.sound.fanfare()
      for (var i = 0; i < 4; i++) later(function () { fx.burst('confetti', Math.random() * C * cs, R * cs * 0.2, 14) }, i * 180)
    }

    /* ── layout ──────────────────────────────────────────────────────────────────────────────────────── */
    function layout () {
      var rect = host.getBoundingClientRect(), w = Math.max(160, rect.width), h = Math.max(120, rect.height)
      var ncs = Math.max(26, Math.floor(Math.min((w - 8) / C, (h - 8) / R) * 0.93))
      cs = ncs; root.style.setProperty('--cs', cs + 'px')
      size.w = C * cs; size.h = R * cs
      tilt.style.width = size.w + 'px'; tilt.style.height = size.h + 'px'
      drawGround(); fx.resize(size.w, size.h)
      buildStatic(); buildThings(); buildTrains()
      if (last) sync(last)
      if (opts.onResize) opts.onResize(size)
    }
    var ro = null
    if (W.ResizeObserver) { var pend = 0; ro = new W.ResizeObserver(function () { if (pend) return; pend = requestAnimationFrame(function () { pend = 0; if (!destroyed) layout() }) }); ro.observe(host) }
    function reset (world) { last = world; layout(); sync(world); preload() }
    function destroy () { destroyed = true; timers.forEach(clearTimeout); if (ro) ro.disconnect(); fx.clear() }
    return { preload: preload, setSpeed: function (k) { speed = k || 1 }, reset: reset, apply: apply, sync: sync, bonk: bonk, celebrate: celebrate, destroy: destroy, cell: function (r, c) { var p = px(r, c); return { x: p.x, y: p.y, s: cs } }, get size () { return size }, root: root, fx: fx }
  }
  W.KeretaBoard = { create: create }
})(typeof window !== 'undefined' ? window : globalThis)
