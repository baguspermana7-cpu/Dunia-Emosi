/* =============================================================================
 * prog-grid.js — window.ProgGrid. A HEADLESS, deterministic program interpreter + level model
 * for grid-programming games (first user: G31 Mojo Swoptops). No DOM, no timers, no randomness:
 * the same program from the same state always gives the same result (PRD §29.1).
 *
 *   ProgGrid.defineForm(id, {verbs, fly?, carry?})     a form (vehicle top) and the verbs it unlocks
 *   ProgGrid.world(level, beatIndex?)                  a fresh world (the mission's start state)
 *   ProgGrid.startBeat(world, level, i)                the world placed at beat i (its `start`, if any)
 *   ProgGrid.step(world, cmd, opts) -> {world, status, reason, info, events, completed, beatDone}
 *        status: success | blocked | invalid-capability | objective-completed | waiting-for-microgame
 *        opts.mg = value      resolves the microgame the command asks for (UI passes the child's answer)
 *        opts.auto = true     resolves every microgame with its correct value (solver, tests)
 *   ProgGrid.cursor(program) -> {next(world) -> {cmd, path} | null}   REPEAT ×N and icon-led IF
 *   ProgGrid.run(world, program, beat, opts) -> {steps, world, done, stop}   whole program, headless
 *   ProgGrid.solve(world, beat, opts) -> shortest flat program | null        BFS over states
 *   ProgGrid.count(world, beat, opts) -> {count, shortest, terminals}        every solution <= slots
 *   ProgGrid.hint(world, beat, program, opts) -> {at, cmd} | null           the next correct command
 *   ProgGrid.verify(level, opts) -> {ok, problems, beats:[…]}               the level is solvable
 *   ProgGrid.lint(level) -> [problems]
 *
 * Commands are strings: moves, 'swop:<form>' and verbs ('push' 'spray' 'raise' …).
 * Movement modes (owner decision 2026-10-01: arrows are read from the BOARD, not from the car):
 *   'abs' (default)  'up' 'down' 'west' 'east' move one tile in that screen direction and turn Mojo to
 *                    face it; the facing is derived, never a separate command. An action verb uses the
 *                    facing (the last move); if nothing is there it turns to the one adjacent target.
 *   'rel' (optional) 'fwd' 'left' 'right' relative to Mojo's heading, for a later advanced world.
 *   A level picks its mode with `mode: 'rel'`; the engine executes both command sets.
 * Blocks: {op:'repeat', n, body:[…]}  {op:'if', cond:'fire'|'rock'|'clear'|'person'|'pickup', body:[…]}.
 * Headings 0 N, 1 E, 2 S, 3 W. Cells [row, col], row 0 at the top.
 * Worlds are never mutated: step() returns a new world.
 * ==========================================================================*/
(function (G) {
  'use strict'
  var DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]]
  var HEAD = { N: 0, E: 1, S: 2, W: 3 }
  var ABS = ['up', 'down', 'west', 'east'], REL = ['fwd', 'left', 'right']
  var ABS_H = { up: 0, east: 1, down: 2, west: 3 }
  var MODES = { abs: ABS, rel: REL }
  var BASE = ABS.concat(REL)      // every movement command (always allowed, whatever the form)
  function modeOf (w) { return (w && w.mode === 'rel') ? 'rel' : 'abs' }
  function moves (mode) { return (MODES[mode] || ABS).slice() }
  var FORMS = {}

  /* terrain: pass = drivable, fly = can be flown over, jump = can be jumped over, fill = a pushed
     rock fills it (becomes drivable) */
  var TERRAIN = {
    '.': { pass: 1, fly: 1, jump: 1, name: 'jalan' },
    '=': { pass: 1, fly: 1, jump: 1, name: 'jalan' },
    ',': { pass: 1, fly: 1, jump: 1, name: 'rumput' },
    '#': { pass: 0, fly: 1, jump: 0, name: 'gedung' },
    'T': { pass: 0, fly: 1, jump: 0, name: 'pohon' },
    '~': { pass: 0, fly: 1, jump: 1, name: 'air' },
    'o': { pass: 0, fly: 1, jump: 1, fill: 1, name: 'lubang' }
  }
  /* object types: block = stops ground movement, push = a Dozer can push it, jump = can be
     jumped over, pickup = collected on entering (res: which resource it adds) */
  var TYPES = {
    rock: { block: 1, push: 1, jump: 1 },
    log: { block: 1, push: 1, jump: 1 },
    fire: { block: 1 },
    person: { block: 1 },
    toolbox: { block: 1 },
    repair: { block: 1 },
    crate: { block: 1, jump: 1 },
    flag: {},
    zone: {},
    bolt: { pickup: 1, res: 'bolts' },
    drop: { pickup: 1, res: 'water' },
    star: { pickup: 1, star: 1 }
  }

  function defineForm (id, def) {
    def = def || {}
    FORMS[id] = { id: id, verbs: (def.verbs || []).slice(), fly: !!def.fly, carry: def.carry !== false }
    return FORMS[id]
  }
  function form (id) { return FORMS[id] || null }
  function verbOf (cmd) { return typeof cmd === 'string' ? cmd.split(':')[0] : cmd && cmd.op }
  function can (formId, verb) {
    if (BASE.indexOf(verb) >= 0 || verb === 'swop') return true
    var f = FORMS[formId]; return !!(f && f.verbs.indexOf(verb) >= 0)
  }
  function formsWith (verb, allowed) {
    var o = []
    for (var k in FORMS) if (FORMS[k].verbs.indexOf(verb) >= 0 && (!allowed || allowed.indexOf(k) >= 0)) o.push(k)
    return o
  }

  /* ── world ───────────────────────────────────────────────────────────── */
  function hd (h) { return typeof h === 'number' ? ((h % 4) + 4) % 4 : (HEAD[h] != null ? HEAD[h] : 1) }
  function world (lv, beatIndex) {
    var gr = lv.grid, m = lv.mojo || {}
    var w = {
      rows: gr.rows, cols: gr.cols, map: gr.map, fill: {}, mode: lv.mode === 'rel' ? 'rel' : 'abs',
      m: { r: m.at[0], c: m.at[1], h: hd(m.h), form: m.form || 'normal', lift: 0, air: false, carry: null },
      res: copy(lv.res || {}), cap: lv.cap || {}, tools: {}, got: {}, forms: null,
      objs: (lv.objects || []).map(function (o) {
        var t = TYPES[o.type] || {}
        var x = copy(o); x.r = o.at[0]; x.c = o.at[1]; delete x.at
        x.st = o.st || (o.type === 'fire' ? 'burning' : o.type === 'person' ? 'waiting' : o.type === 'repair' ? 'broken'
          : o.type === 'rock' || o.type === 'log' ? 'block' : o.type === 'toolbox' ? 'closed' : t.pickup ? 'here' : 'idle')
        if (o.type === 'fire') x.str = o.str || 1
        return x
      })
    }
    w.beat = 0
    if (beatIndex) for (var i = 1; i <= beatIndex; i++) w = startBeat(w, lv, i)
    return w
  }
  function copy (o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r }
  function clone (w) {
    return { rows: w.rows, cols: w.cols, map: w.map, fill: copy(w.fill), m: copy(w.m), res: copy(w.res), cap: w.cap,
      tools: copy(w.tools), got: copy(w.got), forms: w.forms, beat: w.beat, mode: w.mode, objs: w.objs.map(copy) }
  }
  // the world placed at beat i: Mojo moves to the beat's start (a scene cut), the rest carries over
  function startBeat (w, lv, i) {
    var b = lv.beats[i], n = clone(w)
    n.beat = i
    if (b && b.start) {
      n.m = copy(n.m)
      if (b.start.at) { n.m.r = b.start.at[0]; n.m.c = b.start.at[1] }
      if (b.start.h != null) n.m.h = hd(b.start.h)
      if (b.start.form) n.m.form = b.start.form
      n.m.lift = 0; n.m.air = false
    }
    return n
  }
  function key (w) {
    var m = w.m, s = m.r + ',' + m.c + ',' + m.h + ',' + m.form + ',' + m.lift + ',' + (m.air ? 1 : 0) + ',' + (m.carry || '') + '|'
    for (var k in w.res) s += k + w.res[k] + ','
    s += '|'
    for (var t in w.tools) s += t + ','
    s += '|'
    for (var i = 0; i < w.objs.length; i++) { var o = w.objs[i]; s += o.r + '.' + o.c + '.' + o.st + (o.str != null ? '.' + o.str : '') + ';' }
    for (var f in w.fill) s += 'f' + f
    return s
  }

  function inb (w, r, c) { return r >= 0 && c >= 0 && r < w.rows && c < w.cols }
  function ter (w, r, c) {
    var ch = (w.map[r] || '').charAt(c) || '.'
    if (w.fill[r + ',' + c]) return TERRAIN['.']
    return TERRAIN[ch] || TERRAIN['.']
  }
  function terCh (w, r, c) { return w.fill[r + ',' + c] ? '.' : ((w.map[r] || '').charAt(c) || '.') }
  // objects still standing in a cell (rescued people, cleared rocks, carried crates and collected pickups are gone)
  function gone (o) { return o.st === 'rescued' || o.st === 'cleared' || o.st === 'carried' || o.st === 'got' || o.st === 'delivered-gone' }
  function objsAt (w, r, c) {
    var o = []
    for (var i = 0; i < w.objs.length; i++) { var x = w.objs[i]; if (x.r === r && x.c === c && !gone(x)) o.push(x) }
    return o
  }
  function blocks (o) {
    var t = TYPES[o.type] || {}
    if (!t.block) return false
    if (o.type === 'fire') return o.st !== 'out'
    if (o.type === 'repair') return !(o.st === 'fixed' && o.opens)
    return true
  }
  function blocker (w, r, c) { var a = objsAt(w, r, c); for (var i = 0; i < a.length; i++) if (blocks(a[i])) return a[i]; return null }
  function ahead (w, n) { var d = DIRS[w.m.h]; n = n || 1; return [w.m.r + d[0] * n, w.m.c + d[1] * n] }
  function find (w, id) { for (var i = 0; i < w.objs.length; i++) if (w.objs[i].id === id) return w.objs[i]; return null }

  function res (w, status, reason, info, events) {
    return { world: w, status: status, reason: reason || null, info: info || null, events: events || [] }
  }
  // enter a cell: collect pickups (a resource stops at its cap; the pickup then stays)
  function enter (w, r, c, ev) {
    w.m.r = r; w.m.c = c
    var a = objsAt(w, r, c)
    for (var i = 0; i < a.length; i++) {
      var o = a[i], t = TYPES[o.type] || {}
      if (!t.pickup) continue
      if (t.star) { o.st = 'got'; w.got[o.id] = true; ev.push({ e: 'star', id: o.id }); continue }
      var k = o.res || t.res, cap = w.cap[k], cur = w.res[k] || 0, add = o.n || 1
      if (cap != null && cur >= cap) { ev.push({ e: 'full', id: o.id, res: k }); continue }
      w.res[k] = cap != null ? Math.min(cap, cur + add) : cur + add
      o.st = 'got'
      ev.push({ e: 'collect', id: o.id, res: k, value: w.res[k] })
    }
  }

  /* ── one command ─────────────────────────────────────────────────────── */
  // abs mode: an action verb that finds nothing in front turns to the one neighbour where it works
  var FIXED = { swop: 1, takeoff: 1, land: 1, lower: 1 }
  function step (w0, cmd, opts) {
    var r = core(w0, cmd, opts), verb = verbOf(cmd)
    if (ok(r.status) || modeOf(w0) === 'rel' || BASE.indexOf(verb) >= 0 || FIXED[verb] || r.status === 'invalid-capability') return r
    if (r.reason !== 'no-target' || verbOf(cmd) === 'drop') return r
    var other = null
    for (var d = 0; d < 4; d++) {
      if (d === w0.m.h) continue
      var nr = w0.m.r + DIRS[d][0], nc = w0.m.c + DIRS[d][1]
      if (!inb(w0, nr, nc) || !objsAt(w0, nr, nc).length) continue   // nothing there to act on
      var w1 = clone(w0); w1.m.h = d
      var r1 = core(w1, cmd, opts)
      if (ok(r1.status)) { r1.events = [{ e: 'turn', h: d }].concat(r1.events || []); return r1 }
      if (!other && r1.reason !== 'no-target' && r1.status !== 'invalid-capability') { r1.world = w0; other = r1 }
    }
    return other || r
  }
  function core (w0, cmd, opts) {
    opts = opts || {}
    var verb = verbOf(cmd), arg = typeof cmd === 'string' ? cmd.split(':')[1] : null
    var w = clone(w0), m = w.m, ev = []
    if (!verb) return res(w0, 'blocked', 'empty')
    if (verb !== 'swop' && BASE.indexOf(verb) < 0 && !can(m.form, verb)) {
      return res(w0, 'invalid-capability', 'form', { verb: verb, form: m.form, forms: formsWith(verb, w.forms) })
    }
    var a = ahead(w), ar = a[0], ac = a[1]
    switch (verb) {
      case 'up': case 'down': case 'west': case 'east': {
        var nh = ABS_H[verb]
        if (nh !== m.h) { m.h = nh; ev.push({ e: 'turn', h: nh }) }
        a = ahead(w); ar = a[0]; ac = a[1]
      }
      /* falls through: an arrow is a turn to face it plus one step forward */
      case 'fwd': {
        if (!inb(w, ar, ac)) return res(w0, 'blocked', 'edge', { at: a, h: m.h })
        if (m.lift > 0) return res(w0, 'blocked', 'lift-up', { lift: m.lift })
        if (!m.air) {
          var t = ter(w, ar, ac)
          if (!t.pass) return res(w0, 'blocked', 'terrain', { at: a, terrain: terCh(w, ar, ac), name: t.name, h: m.h })
          var b = blocker(w, ar, ac)
          if (b) return res(w0, 'blocked', 'object', { at: a, id: b.id, type: b.type, h: m.h })
        }
        ev.push({ e: 'move', from: [m.r, m.c], to: a })
        if (m.air) { m.r = ar; m.c = ac; var sa = objsAt(w, ar, ac); for (var s = 0; s < sa.length; s++) if (TYPES[sa[s].type] && TYPES[sa[s].type].star) { sa[s].st = 'got'; w.got[sa[s].id] = true; ev.push({ e: 'star', id: sa[s].id }) } } else enter(w, ar, ac, ev)
        break
      }
      case 'left': m.h = (m.h + 3) % 4; ev.push({ e: 'turn', h: m.h }); break
      case 'right': m.h = (m.h + 1) % 4; ev.push({ e: 'turn', h: m.h }); break
      case 'swop': {
        if (!arg || !FORMS[arg]) return res(w0, 'invalid-capability', 'unknown-form', { form: arg })
        if (w.forms && w.forms.indexOf(arg) < 0) return res(w0, 'invalid-capability', 'not-allowed', { form: arg })
        if (m.air) return res(w0, 'blocked', 'in-air')
        if (m.lift > 0) return res(w0, 'blocked', 'lift-up', { lift: m.lift })
        if (m.carry && !FORMS[arg].carry) return res(w0, 'blocked', 'carrying', { id: m.carry })
        ev.push({ e: 'swop', from: m.form, to: arg, same: m.form === arg })
        m.form = arg
        break
      }
      case 'push': {
        if (!inb(w, ar, ac)) return res(w0, 'blocked', 'no-target', { verb: 'push' })
        var p = blocker(w, ar, ac)
        if (!p || !(TYPES[p.type] || {}).push) return res(w0, 'blocked', 'no-target', { verb: 'push', id: p && p.id, type: p && p.type })
        var d = ahead(w, 2), dr = d[0], dc = d[1]
        if (!inb(w, dr, dc)) return res(w0, 'blocked', 'push-edge', { id: p.id })
        var dt = ter(w, dr, dc)
        var there = objsAt(w, dr, dc).filter(function (o) { return o.type !== 'zone' })
        if (there.length) return res(w0, 'blocked', 'push-object', { id: p.id, into: there[0].id, type: there[0].type })
        if (!dt.pass && !dt.fill) return res(w0, 'blocked', 'push-wall', { id: p.id, terrain: terCh(w, dr, dc) })
        p.r = dr; p.c = dc
        if (!dt.pass && dt.fill) { w.fill[dr + ',' + dc] = 1; p.st = 'cleared'; ev.push({ e: 'fill', id: p.id, at: d }) } else {
          var z = objsAt(w, dr, dc).filter(function (o) { return o.type === 'zone' && (!o.accepts || o.accepts === p.type) })
          p.st = z.length ? 'cleared' : 'pushed'
        }
        ev.push({ e: 'push', id: p.id, to: d })
        ev.push({ e: 'move', from: [m.r, m.c], to: a })
        enter(w, ar, ac, ev)
        break
      }
      case 'jump': {
        var l = ahead(w, 2)
        if (!inb(w, ar, ac) || !inb(w, l[0], l[1])) return res(w0, 'blocked', 'edge', { at: l })
        var ot = ter(w, ar, ac)
        if (!ot.jump) return res(w0, 'blocked', 'too-tall', { at: a, terrain: terCh(w, ar, ac), name: ot.name })
        var ob = blocker(w, ar, ac)
        if (ob && !(TYPES[ob.type] || {}).jump) return res(w0, 'blocked', 'too-tall', { at: a, id: ob.id, type: ob.type })
        var lt = ter(w, l[0], l[1])
        if (!lt.pass) return res(w0, 'blocked', 'land', { at: l, terrain: terCh(w, l[0], l[1]) })
        var lb = blocker(w, l[0], l[1])
        if (lb) return res(w0, 'blocked', 'land', { at: l, id: lb.id, type: lb.type })
        ev.push({ e: 'jump', from: [m.r, m.c], to: l, over: a })
        enter(w, l[0], l[1], ev)
        break
      }
      case 'spray': {
        var f = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return o.type === 'fire' && o.st !== 'out' })[0] : null
        if (!f) return res(w0, 'blocked', 'no-target', { verb: 'spray' })
        var water = w.res.water || 0
        if (water <= 0) return res(w0, 'blocked', 'no-water', { id: f.id, need: f.str })
        var use = Math.min(water, f.str)
        f.str -= use; w.res.water = water - use
        f.st = f.str === 0 ? 'out' : 'sprayed'
        ev.push({ e: 'spray', id: f.id, used: use, left: f.str, water: w.res.water })
        break
      }
      case 'raise': {
        var hi = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return o.elev > 0 && o.st !== 'rescued' && o.st !== 'fixed' })[0] : null
        if (!hi) return res(w0, 'blocked', 'no-target', { verb: 'raise' })
        var mg = { kind: 'height', target: hi.elev, id: (hi.mg && hi.mg.id) || ('h-' + hi.id), spec: hi.mg || null, obj: hi.id }
        var v = opts.auto ? hi.elev : opts.mg
        if (v == null) return res(w0, 'waiting-for-microgame', null, { mg: mg })
        if (+v !== hi.elev) return res(w0, 'blocked', 'height', { want: hi.elev, got: +v, id: hi.id })
        m.lift = hi.elev
        ev.push({ e: 'raise', lift: m.lift, id: hi.id })
        break
      }
      case 'lower': m.lift = 0; ev.push({ e: 'lower' }); break
      case 'rescue': {
        var pp = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return o.type === 'person' && o.st !== 'rescued' })[0] : null
        if (!pp) return res(w0, 'blocked', 'no-target', { verb: 'rescue' })
        var el = pp.elev || 0
        if (el > 0 && !(m.lift === el || (m.air && FORMS[m.form] && FORMS[m.form].fly))) return res(w0, 'blocked', 'too-high', { id: pp.id, elev: el, lift: m.lift })
        if (el === 0 && m.lift > 0) return res(w0, 'blocked', 'lift-up', { lift: m.lift })
        pp.st = 'rescued'
        ev.push({ e: 'rescue', id: pp.id })
        break
      }
      case 'pick': case 'hook': {
        if (m.carry) return res(w0, 'blocked', 'hands-full', { id: m.carry })
        var tg = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return (o.type === 'toolbox' && o.st === 'closed') || o.type === 'crate' })[0] : null
        if (!tg) return res(w0, 'blocked', 'no-target', { verb: verb })
        if (tg.type === 'toolbox') {
          if (verb === 'hook') return res(w0, 'blocked', 'no-target', { verb: verb })
          if (tg.mg) {
            var mv = opts.auto ? true : opts.mg
            if (mv == null) return res(w0, 'waiting-for-microgame', null, { mg: { kind: tg.mg.kind || 'letters', id: tg.mg.id || ('mg-' + tg.id), spec: tg.mg, obj: tg.id, tool: tg.tool } })
            if (!mv) return res(w0, 'blocked', 'microgame', { id: tg.id })
          }
          tg.st = 'open'; w.tools[tg.tool] = true
          ev.push({ e: 'tool', id: tg.id, tool: tg.tool })
          break
        }
        if (tg.heavy && verb !== 'hook') return res(w0, 'blocked', 'too-heavy', { id: tg.id })
        tg.st = 'carried'; m.carry = tg.id
        ev.push({ e: 'pick', id: tg.id })
        break
      }
      case 'drop': case 'release': {
        if (!m.carry) return res(w0, 'blocked', 'hands-empty')
        if (!inb(w, ar, ac) || !ter(w, ar, ac).pass || objsAt(w, ar, ac).filter(function (o) { return o.type !== 'zone' }).length) return res(w0, 'blocked', 'drop-here', { at: a })
        var cr = find(w, m.carry)
        cr.r = ar; cr.c = ac
        var zz = objsAt(w, ar, ac).filter(function (o) { return o.type === 'zone' && (!o.accepts || o.accepts === cr.type || o.accepts === cr.id) })
        cr.st = zz.length ? 'delivered' : 'idle'
        m.carry = null
        ev.push({ e: 'drop', id: cr.id, at: a, delivered: !!zz.length })
        break
      }
      case 'takeoff': if (m.air) return res(w0, 'blocked', 'in-air'); m.air = true; ev.push({ e: 'takeoff' }); break
      case 'land': {
        if (!m.air) return res(w0, 'blocked', 'on-ground')
        if (!ter(w, m.r, m.c).pass || blocker(w, m.r, m.c)) return res(w0, 'blocked', 'no-landing', { at: [m.r, m.c] })
        m.air = false; ev.push({ e: 'land' }); enter(w, m.r, m.c, ev)
        break
      }
      case 'repair': {
        var rp = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return o.type === 'repair' && o.st !== 'fixed' })[0] : null
        if (!rp) return res(w0, 'blocked', 'no-target', { verb: 'repair' })
        var nd = rp.needs || {}
        if (nd.tool && !w.tools[nd.tool]) return res(w0, 'blocked', 'need-tool', { id: rp.id, tool: nd.tool })
        for (var rk in nd) {
          if (rk === 'tool') continue
          if ((w.res[rk] || 0) < nd[rk]) return res(w0, 'blocked', 'need-' + rk, { id: rp.id, res: rk, need: nd[rk], have: w.res[rk] || 0 })
        }
        if (rp.elev > 0 && m.lift !== rp.elev) return res(w0, 'blocked', 'too-high', { id: rp.id, elev: rp.elev, lift: m.lift })
        for (var rk2 in nd) if (rk2 !== 'tool') w.res[rk2] -= nd[rk2]
        rp.st = 'fixed'
        ev.push({ e: 'repair', id: rp.id })
        break
      }
      default: return res(w0, 'invalid-capability', 'unknown-verb', { verb: verb })
    }
    return res(w, 'success', null, null, ev)
  }

  /* ── objectives ──────────────────────────────────────────────────────── */
  function met (w, ob) {
    var o = ob.id ? find(w, ob.id) : null
    switch (ob['do']) {
      case 'reach': return w.m.r === ob.at[0] && w.m.c === ob.at[1] && !w.m.air
      case 'extinguish': return !!o && o.st === 'out'
      case 'rescue': return !!o && o.st === 'rescued'
      case 'repair': return !!o && o.st === 'fixed'
      case 'clear': return !!o && o.st === 'cleared'
      case 'deliver': return !!o && o.st === 'delivered'
      case 'tool': return !!w.tools[ob.tool]
      case 'collect': return (w.res[ob.res] || 0) >= ob.n
      case 'star': return !!w.got[ob.id]
      case 'land': return !w.m.air
      default: return false
    }
  }
  function beatDone (w, beat) {
    var obs = beat.objectives || []
    for (var i = 0; i < obs.length; i++) if (!met(w, obs[i])) return false
    return obs.length > 0
  }
  // step + objective bookkeeping for a beat: status becomes objective-completed when one completes
  function stepBeat (w0, cmd, beat, opts) {
    var r = step(w0, cmd, opts)
    if (r.status !== 'success') return r
    var done = []
    ;(beat.objectives || []).forEach(function (ob, i) { if (!met(w0, ob) && met(r.world, ob)) done.push(i) })
    r.completed = done
    r.beatDone = beatDone(r.world, beat)
    if (done.length) r.status = 'objective-completed'
    return r
  }
  function ok (st) { return st === 'success' || st === 'objective-completed' }

  /* ── program cursor: REPEAT ×N, IF <cond> (icon-led, checked against the cell ahead) ── */
  function cond (w, c) {
    var a = ahead(w)
    if (!inb(w, a[0], a[1])) return c === 'edge'
    var os = objsAt(w, a[0], a[1])
    switch (c) {
      case 'fire': return os.some(function (o) { return o.type === 'fire' && o.st !== 'out' })
      case 'rock': return os.some(function (o) { return (o.type === 'rock' || o.type === 'log') && blocks(o) })
      case 'person': return os.some(function (o) { return o.type === 'person' && o.st !== 'rescued' })
      case 'pickup': return os.some(function (o) { return (TYPES[o.type] || {}).pickup })
      case 'clear': return ter(w, a[0], a[1]).pass && !blocker(w, a[0], a[1])
      default: return false
    }
  }
  var MAX_REPEAT = 9, MAX_DEPTH = 3
  function cursor (program) {
    var stack = [{ body: program || [], i: 0, left: 1, path: [] }], guard = 0
    return {
      next: function (w) {
        while (stack.length && guard++ < 10000) {
          var f = stack[stack.length - 1]
          if (f.i >= f.body.length) {
            f.left--
            if (f.left > 0) { f.i = 0; continue }
            stack.pop(); continue
          }
          var idx = f.i++, n = f.body[idx], path = f.path.concat([idx])
          if (n && typeof n === 'object' && n.op === 'repeat') {
            if (stack.length > MAX_DEPTH) continue
            stack.push({ body: n.body || [], i: 0, left: Math.max(1, Math.min(MAX_REPEAT, n.n | 0)), path: path }); continue
          }
          if (n && typeof n === 'object' && n.op === 'if') {
            if (stack.length > MAX_DEPTH) continue
            if (cond(w, n.cond)) stack.push({ body: n.body || [], i: 0, left: 1, path: path })
            continue
          }
          if (n == null) continue
          return { cmd: n, path: path }
        }
        return null
      }
    }
  }
  function size (program) {
    var n = 0; (program || []).forEach(function (x) { n += x && typeof x === 'object' ? 1 + size(x.body) : 1 }); return n
  }

  // the whole program, headless. Stops at the first non-success, a microgame (unless auto) or the beat's end.
  function run (w, program, beat, opts) {
    opts = opts || {}
    var cur = cursor(program), steps = [], guard = 0, x
    beat = beat || { objectives: [] }
    while ((x = cur.next(w)) && guard++ < 500) {
      var r = stepBeat(w, x.cmd, beat, opts)
      steps.push({ path: x.path, cmd: x.cmd, status: r.status, reason: r.reason, info: r.info, events: r.events })
      if (!ok(r.status)) return { steps: steps, world: w, done: false, stop: r }
      w = r.world
      if (r.beatDone) return { steps: steps, world: w, done: true, stop: null }
    }
    return { steps: steps, world: w, done: beatDone(w, beat), stop: null, ended: true }
  }

  /* ── solver ──────────────────────────────────────────────────────────── */
  // the command palette of a beat: its explicit list, else base + the verbs of every allowed form + a Swop per form
  function palette (beat, w) {
    if (beat.palette) return beat.palette.slice()
    var forms = beat.forms || (w && w.forms) || ['normal'], out = moves(modeOf(w)), seen = {}
    forms.forEach(function (f) { (FORMS[f] ? FORMS[f].verbs : []).forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v) } }) })
    if (forms.length > 1) forms.forEach(function (f) { out.push('swop:' + f) })
    return out
  }
  function cmds (beat, w, opts) {
    var forbid = (opts && opts.forbid) || []
    return palette(beat, w).filter(function (c) { return forbid.indexOf(c) < 0 && forbid.indexOf(verbOf(c)) < 0 })
  }
  function useful (w, c) {
    if (c.indexOf('swop:') === 0 && c.slice(5) === w.m.form) return false
    return can(w.m.form, verbOf(c))
  }
  function solve (w0, beat, opts) {
    opts = opts || {}
    var maxLen = opts.maxLen || beat.slots || 8, list = cmds(beat, w0, opts), goal = opts.goal || beat
    if (beatDone(w0, goal)) return []
    var seen = {}, q = [{ w: w0, p: [] }], head = 0, cap = opts.cap || 400000
    seen[key(w0)] = 1
    while (head < q.length && head < cap) {
      var n = q[head++]
      if (n.p.length >= maxLen) continue
      for (var i = 0; i < list.length; i++) {
        var c = list[i]
        if (!useful(n.w, c)) continue
        var r = step(n.w, c, { auto: true })
        if (!ok(r.status)) continue
        var p = n.p.concat([c])
        if (beatDone(r.world, goal)) return p
        if (goal !== beat && beatDone(r.world, beat)) continue   // the real run stops when the beat completes
        var k = key(r.world)
        if (seen[k]) continue
        seen[k] = 1
        q.push({ w: r.world, p: p })
      }
    }
    return null
  }
  // every flat program of length <= slots that completes the beat exactly on its last command
  function count (w0, beat, opts) {
    opts = opts || {}
    var maxLen = opts.maxLen || beat.slots || 8, list = cmds(beat, w0, opts), goal = opts.goal || beat
    var layer = {}, total = 0, shortest = null, terms = {}, nterms = 0, termKeys = {}, capT = opts.maxTerminals || 400
    if (beatDone(w0, goal)) return { count:1, shortest:0, terminals:[w0], terminalCount:1, truncated:false }
    layer[key(w0)] = { w: w0, n: 1 }
    for (var d = 1; d <= maxLen; d++) {
      var next = {}, any = false
      for (var k in layer) {
        var s = layer[k]
        for (var i = 0; i < list.length; i++) {
          var c = list[i]
          if (!useful(s.w, c)) continue
          var r = step(s.w, c, { auto: true })
          if (!ok(r.status)) continue
          if (beatDone(r.world, goal)) {
            total += s.n
            if (shortest == null) shortest = d
            var tk = key(r.world)
            if (!termKeys[tk]) { termKeys[tk] = true; nterms++; if (nterms <= capT) terms[tk] = r.world }
            continue
          }
          var nk = key(r.world)
          if (next[nk]) next[nk].n += s.n; else { next[nk] = { w: r.world, n: s.n }; any = true }
        }
      }
      layer = next
      if (!any) break
    }
    var tl = []; for (var t in terms) tl.push(terms[t])
    return { count: total, shortest: shortest, terminals: tl, terminalCount:nterms, truncated:nterms > tl.length }
  }
  // flatten a program (for hints and the solver's comparisons); REPEAT expands, IF stays unresolved (not flat)
  function flat (program) {
    var o = []
    ;(program || []).forEach(function (x) {
      if (x && typeof x === 'object' && x.op === 'repeat') { for (var i = 0; i < Math.min(MAX_REPEAT, x.n | 0); i++) o = o.concat(flat(x.body)) } else if (typeof x === 'string') o.push(x)
    })
    return o
  }
  // the next correct command for a flat program: keep the longest prefix that still leads to a solution
  function hint (w0, beat, program, opts) {
    opts = opts || {}
    var prog = flat(program), slots = opts.slots || beat.slots || 8, states = [w0], w = w0
    for (var i = 0; i < prog.length; i++) {
      var r = stepBeat(w, prog[i], beat, { auto: true })
      if (!ok(r.status)) break
      w = r.world; states.push(w)
      if (r.beatDone) return { at: i + 1, cmd: null, done: true }
    }
    for (var k = states.length - 1; k >= 0; k--) {
      var s = solve(states[k], beat, { maxLen: slots - k, forbid: opts.forbid })
      if (s && s.length) return { at: k, cmd: s[0], keep: k, rest: s.length }
    }
    return null
  }

  /* ── level checks ───────────────────────────────────────────────────── */
  function lint (lv) {
    var p = [], gr = lv.grid || {}
    if (!gr.rows || !gr.cols || !Array.isArray(gr.map) || gr.map.length !== gr.rows) p.push(lv.id + ': grid map rows')
    ;(gr.map || []).forEach(function (row, r) {
      if (row.length !== gr.cols) p.push(lv.id + ': row ' + r + ' has ' + row.length + ' cols')
      for (var c = 0; c < row.length; c++) if (!TERRAIN[row.charAt(c)]) p.push(lv.id + ': unknown terrain ' + row.charAt(c))
    })
    var ids = {}, cells = {}
    var at = lv.mojo && lv.mojo.at
    if (!at || !(at[0] >= 0 && at[0] < gr.rows && at[1] >= 0 && at[1] < gr.cols)) p.push(lv.id + ': mojo start')
    else if ((gr.map[at[0]] || '').charAt(at[1]) !== '.' && (gr.map[at[0]] || '').charAt(at[1]) !== '=' && (gr.map[at[0]] || '').charAt(at[1]) !== ',') p.push(lv.id + ': mojo starts off the road')
    ;(lv.objects || []).forEach(function (o) {
      if (ids[o.id]) p.push(lv.id + ': duplicate id ' + o.id); ids[o.id] = 1
      if (!TYPES[o.type]) p.push(lv.id + ': unknown type ' + o.type)
      if (!o.at || !(o.at[0] >= 0 && o.at[0] < gr.rows && o.at[1] >= 0 && o.at[1] < gr.cols)) { p.push(lv.id + ': ' + o.id + ' out of the grid'); return }
      var k = o.at[0] + ',' + o.at[1], t = TYPES[o.type] || {}
      if (at && at[0] === o.at[0] && at[1] === o.at[1] && t.block) p.push(lv.id + ': ' + o.id + ' on the mojo start')
      if (t.block || t.pickup) { if (cells[k]) p.push(lv.id + ': ' + o.id + ' shares a cell with ' + cells[k]); cells[k] = o.id }
      var ch = (gr.map[o.at[0]] || '').charAt(o.at[1]), tr = TERRAIN[ch] || {}
      if (!tr.pass && (t.pickup || o.type === 'rock' || o.type === 'crate' || o.type === 'flag' || (o.type === 'person' && !o.elev))) p.push(lv.id + ': ' + o.id + ' stands on ' + (tr.name || ch))
    })
    ;(lv.beats || []).forEach(function (b, bi) {
      if (!b.objectives || !b.objectives.length) p.push(lv.id + ': beat ' + bi + ' has no objective')
      ;(b.objectives || []).forEach(function (ob) { if (ob.id && !ids[ob.id]) p.push(lv.id + ': beat ' + bi + ' objective names ' + ob.id) })
      ;(b.forms || []).forEach(function (f) { if (!FORMS[f]) p.push(lv.id + ': unknown form ' + f) })
      ;(b.palette || []).forEach(function (c) { var v = verbOf(c); if (v === 'swop') { if (!FORMS[c.split(':')[1]]) p.push(lv.id + ': palette swop ' + c) } else if (BASE.indexOf(v) < 0 && !formsWith(v).length) p.push(lv.id + ': palette verb ' + c) })
      if (!(b.slots > 0)) p.push(lv.id + ': beat ' + bi + ' slots')
    })
    return p
  }
  function prep (w, lv, b) { var n = clone(w); n.forms = lv.beats[b].forms || null; return n }
  // Bounded checkpoint verification. `ok` covers tested starts; `complete` discloses any omitted states.
  function verify (lv, opts) {
    opts = opts || {}
    var problems = lint(lv), beats = [], truncations = []
    if (problems.length) return { ok: false, complete:false, truncations:truncations, problems: problems, beats: beats }
    var starts = [prep(world(lv), lv, 0)]
    for (var b = 0; b < lv.beats.length; b++) {
      var beat = lv.beats[b], info = { beat: b, solution: null, count: 0, starts: starts.length, shortest: null, alts: {} }
      var nextStarts = {}, nn = 0, same = {}
      for (var s = 0; s < starts.length; s++) {
        var st = b > 0 ? prep(startBeat(starts[s], lv, b), lv, b) : starts[s], sk = key(st)
        if (same[sk]) continue   // a scene cut (beat.start) can make different endings the same start
        same[sk] = 1
        var sol = solve(st, beat)
        if (!sol) { problems.push(lv.id + ': beat ' + b + ' unsolvable from start #' + s + ' (' + key(st) + ')'); continue }
        var c = count(st, beat, { maxTerminals: opts.maxTerminals || 60 })
        if (c.truncated) truncations.push({beat:b,start:s,kind:'terminals',available:c.terminalCount,checked:c.terminals.length})
        c.terminals.forEach(function (t) {
          var k = key(t)
          if (nextStarts[k]) return
          if (nn < (opts.maxStarts || 40)) { nextStarts[k] = t; nn++ }
          else truncations.push({beat:b,start:s,kind:'successor-limit'})
        })
        if (s === 0) {
          info.solution = sol; info.count = c.count; info.shortest = c.shortest
          ;(beat.alts || []).forEach(function (a) {
            var as = solve(st, beat, { forbid: a.forbid || [] })
            info.alts[a.name] = as
            if (!as) problems.push(lv.id + ': beat ' + b + ' alternative "' + a.name + '" has no solution')
            else if (a.uses && flat(as).join(' ').indexOf(a.uses) < 0) problems.push(lv.id + ': beat ' + b + ' alternative "' + a.name + '" does not use ' + a.uses)
          })
        }
      }
      if (b + 1 < lv.beats.length) {
        var l = []; for (var k2 in nextStarts) l.push(nextStarts[k2])
        starts = l.length ? l : starts
      }
      beats.push(info)
    }
    return { ok: !problems.length, complete:truncations.length === 0, truncations:truncations, problems: problems, beats: beats }
  }

  G.ProgGrid = {
    VERSION: '1.1.0', DIRS: DIRS, HEAD: HEAD, BASE: BASE, ABS: ABS, REL: REL, ABS_H: ABS_H, moves: moves, modeOf: modeOf, TERRAIN: TERRAIN, TYPES: TYPES,
    defineForm: defineForm, form: form, forms: function () { return Object.keys(FORMS) }, can: can, formsWith: formsWith, verbOf: verbOf,
    world: world, startBeat: startBeat, prep: prep, clone: clone, key: key, find: find, objsAt: objsAt, blocks: blocks, ahead: ahead, terrain: ter, terrainChar: terCh,
    step: step, stepBeat: stepBeat, ok: ok, met: met, beatDone: beatDone, cond: cond,
    cursor: cursor, size: size, flat: flat, run: run,
    palette: palette, solve: solve, count: count, hint: hint, lint: lint, verify: verify
  }
})(typeof window !== 'undefined' ? window : globalThis)
