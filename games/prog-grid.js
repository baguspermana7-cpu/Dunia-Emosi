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
 *   ProgGrid.hint(world, beat, program, opts) -> {at, cmd, steps} | null    the next correct command (+ the rest)
 *   ProgGrid.verify(level, opts) -> {ok, problems, beats:[…]}               the level is solvable
 *   ProgGrid.lint(level) -> [problems]
 *
 * Commands are strings: moves, 'swop:<form>' and verbs ('push' 'spray' 'raise' …).
 * Movement modes (owner decision 2026-10-01: arrows are read from the BOARD, not from the car):
 *   'abs' (default)  'up' 'down' 'west' 'east' move one tile in that screen direction and turn Mojo to
 *                    face it; the facing is derived, never a separate command.
 *   'rel' (optional) 'fwd' 'left' 'right' relative to Mojo's heading, for a later advanced world.
 *   A level picks its mode with `mode: 'rel'`; the engine executes both command sets.
 * ONE interaction rule (owner decision 2026-10-03, "LEWATI vs SEBELAH"), abs mode:
 *   LEWATI   star, bolt, water drop, toolbox, flag: driving ONTO the cell takes / reaches it; never blocks.
 *            The toolbox asks for its letters microgame on entry (status waiting-for-microgame).
 *   SEBELAH  rock/log, fire, person, repair point, crate: Mojo stops BESIDE it and uses the action. The
 *            action targets the ONE adjacent object of the right kind, whatever Mojo faces, and Mojo
 *            visibly turns to it (event {e:'turn', auto:true}). Two candidates: the facing one, else
 *            'ambiguous' (the level lint forbids it). Resolved things never block, except a rock pushed
 *            onto ground (it is still a rock); a rock in a pit fills it and becomes road.
 *   Jump picks the one adjacent obstacle the same way (pits / water are ground: facing decides a tie).
 * ROAD rule (owner 2026-10-03): Mojo drives ONLY on road tiles ('.' road / indoor floor, '=' bridge). Grass ',' is
 *   park scenery: an arrow onto it stops with reason 'grass', a jump never lands on it. LEWATI items lie ON the road;
 *   SEBELAH targets stand on road or grass with a road cell beside them; lint() proves the road network is one piece.
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
     rock fills it (becomes drivable), road = part of the visible road network.
     ROAD RULE (owner 2026-10-03): Mojo drives ONLY on road ('.' road / indoor floor, '=' bridge). Grass ','
     is park scenery: it blocks with its own reason 'grass', and a jump never lands on it. */
  var TERRAIN = {
    '.': { pass: 1, fly: 1, jump: 1, road: 1, name: 'jalan' },
    '=': { pass: 1, fly: 1, jump: 1, road: 1, name: 'jembatan' },
    ',': { pass: 0, fly: 1, jump: 0, grass: 1, name: 'rumput' },
    '#': { pass: 0, fly: 1, jump: 0, name: 'gedung' },
    'T': { pass: 0, fly: 1, jump: 0, name: 'pohon' },
    '~': { pass: 0, fly: 1, jump: 1, name: 'air' },
    'o': { pass: 0, fly: 1, jump: 1, fill: 1, name: 'lubang' }
  }
  /* object types: block = stops ground movement while unresolved, walk = LEWATI (taken by driving onto it),
     verb = the SEBELAH action that resolves it, push = a Dozer can push it, jump = can be jumped over,
     pickup = collected on entering (res: which resource it adds), road = must stand ON a road cell.
     DELIVERY FAMILY (owner 2026-10-07, "really varied maze scenarios"), all DATA, no per-level code:
       carry   picked up with AMBIL beside Mojo and carried (ride = it rides visibly on Mojo)
       stop    a destination resolved with ANTAR; `accepts` names the id / type / kind it takes,
               `order` + `seq` make a queue (out of turn = reason 'order'), `keep` = a visit (the
               passenger stays aboard and travels on), `pay` names its payoff effect
       wagon   coupled behind Mojo with GANDENG; coupled wagons trail along the cells Mojo leaves
       loco    the engine at the station: GANDENG hands the whole train over (needs n wagons)
       gate    opened with BUKA once Mojo holds its key;  key  a LEWATI key
       pile    scooped with ISI into a resource;  hole  filled with TUANG until its need is met
       part    a carried plank put down with PASANG over a pit or water (that cell becomes road)
       mark    a LEWATI trail print, taken in `order`
       patrol  a blocker that walks a fixed `path` one cell per command (phase = its offset) */
  var TYPES = {
    rock: { block: 1, push: 1, jump: 1, verb: 'push' },
    log: { block: 1, push: 1, jump: 1, verb: 'push' },
    fire: { block: 1, verb: 'spray' },
    person: { block: 1, verb: 'rescue' },
    repair: { block: 1, verb: 'repair' },
    crate: { block: 1, jump: 1, verb: 'pick', carry: 1 },
    rider: { block: 1, verb: 'pick', carry: 1, ride: 1 },
    parcel: { block: 1, jump: 1, verb: 'pick', carry: 1 },
    part: { block: 1, verb: 'pick', carry: 1, fits: 1 },
    stop: { block: 1, verb: 'deliver' },
    wagon: { block: 1, verb: 'couple', trail: 1 },
    loco: { block: 1, verb: 'couple', loco: 1 },
    gate: { block: 1, verb: 'unlock', road: 1 },
    pile: { block: 1, verb: 'load' },
    hole: { block: 1, verb: 'dump', road: 1 },
    patrol: { block: 1, patrol: 1, road: 1 },
    key: { walk: 1, keyed: 1 },
    mark: { walk: 1, ordered: 1 },
    toolbox: { walk: 1, trigger: 'letters' },
    flag: { walk: 1 },
    zone: { walk: 1 },
    bolt: { walk: 1, pickup: 1, res: 'bolts' },
    drop: { walk: 1, pickup: 1, res: 'water' },
    star: { walk: 1, pickup: 1, star: 1 }
  }
  /* every failure reason the engine can return (the UI gate proves each has its own message) */
  var REASONS = ['empty', 'grass', 'form', 'unknown-form', 'not-allowed', 'unknown-verb', 'edge', 'terrain', 'object', 'lift-up', 'in-air',
    'carrying', 'no-target', 'ambiguous', 'push-edge', 'push-wall', 'push-object', 'too-tall', 'jump-fire', 'jump-person',
    'jump-repair', 'land', 'no-water', 'height', 'not-raised', 'too-high', 'need-form', 'hands-full', 'too-heavy', 'microgame',
    'hands-empty', 'drop-here', 'on-ground', 'no-landing', 'need-tool', 'need-bolts', 'need-water', 'cap-full',
    'order', 'wrong-stop', 'need-key', 'need-wagons', 'train-full', 'no-gap', 'no-load', 'hole-full', 'caught']

  function defineForm (id, def) {
    def = def || {}
    FORMS[id] = { id: id, verbs: (def.verbs || []).slice(), fly: !!def.fly, carry: def.carry !== false }
    return FORMS[id]
  }
  function form (id) { return FORMS[id] || null }
  function verbOf (cmd) { return typeof cmd === 'string' ? cmd.split(':')[0] : cmd && cmd.op }
  function can (formId, verb) {
    if (BASE.indexOf(verb) >= 0 || verb === 'swop' || verb === 'wait') return true
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
      m: { r: m.at[0], c: m.at[1], h: hd(m.h), form: m.form || 'normal', lift: 0, air: false, carry: null, train: [], tail: [] },
      res: copy(lv.res || {}), cap: lv.cap || {}, tools: {}, got: {}, keys: {}, forms: null, tick: 0, patrols: 0,
      objs: (lv.objects || []).map(function (o) {
        var t = TYPES[o.type] || {}
        var x = copy(o); x.r = o.at[0]; x.c = o.at[1]; delete x.at
        x.st = o.st || (o.type === 'fire' ? 'burning' : o.type === 'person' ? 'waiting' : o.type === 'repair' ? 'broken'
          : o.type === 'rock' || o.type === 'log' ? 'block' : o.type === 'toolbox' ? 'closed' : o.type === 'gate' ? 'locked'
          : t.pickup || t.keyed || t.ordered ? 'here' : 'idle')
        if (o.type === 'fire') x.str = o.str || 1
        if (o.type === 'hole') x.got = o.got || 0
        return x
      })
    }
    w.patrols = w.objs.filter(function (o) { return (TYPES[o.type] || {}).patrol }).length
    w.objs.forEach(function (o) { if ((TYPES[o.type] || {}).patrol) { var p = patrolAt(o, 0); o.r = p[0]; o.c = p[1] } })
    w.beat = 0
    if (beatIndex) for (var i = 1; i <= beatIndex; i++) w = startBeat(w, lv, i)
    return w
  }
  function copy (o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r }
  function clone (w) {
    var m = copy(w.m)
    m.train = (w.m.train || []).slice()
    m.tail = (w.m.tail || []).map(function (p) { return [p[0], p[1]] })
    return { rows: w.rows, cols: w.cols, map: w.map, fill: copy(w.fill), m: m, res: copy(w.res), cap: w.cap,
      tools: copy(w.tools), got: copy(w.got), keys: copy(w.keys || {}), tick: w.tick || 0, patrols: w.patrols || 0,
      forms: w.forms, beat: w.beat, mode: w.mode, objs: w.objs.map(copy) }
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
      n.m.air = false
    }
    if (n.m.lift) { n.m = copy(n.m); n.m.lift = 0 }   // the basket is always down when a beat begins
    return n
  }
  function key (w) {
    var m = w.m, s = m.r + ',' + m.c + ',' + m.h + ',' + m.form + ',' + m.lift + ',' + (m.air ? 1 : 0) + ',' + (m.carry || '') + '|'
    for (var k in w.res) s += k + w.res[k] + ','
    s += '|'
    for (var t in w.tools) s += t + ','
    s += '|'
    for (var i = 0; i < w.objs.length; i++) { var o = w.objs[i]; s += o.r + '.' + o.c + '.' + o.st + (o.str != null ? '.' + o.str : '') + (o.got ? '.' + o.got : '') + ';' }
    for (var f in w.fill) s += 'f' + f
    // the train (coupled wagons and the cells they trail along) and the keys Mojo holds are part of the state;
    // the command clock only when a patrol actually walks (it would otherwise double the search space)
    if (m.train.length) s += '|' + m.train.join('.') + '/' + m.tail.map(function (p) { return p[0] + '-' + p[1] }).join('.')
    for (var kk in w.keys) s += '|k' + kk
    if (w.patrols) s += '|t' + (w.tick % 24)
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
  // where a patrol stands after `tick` commands (its own path, one cell per command, offset by `phase`)
  function patrolAt (o, tick) {
    var p = o.path && o.path.length ? o.path : [[o.r, o.c]]
    var i = (((tick + (o.phase || 0)) % p.length) + p.length) % p.length
    return p[i]
  }
  function objsAt (w, r, c) {
    var o = []
    for (var i = 0; i < w.objs.length; i++) { var x = w.objs[i]; if (x.r === r && x.c === c && !gone(x)) o.push(x) }
    return o
  }
  // one rule: an unresolved SEBELAH object blocks; a resolved one never does (a pushed rock is still a rock)
  function blocks (o) {
    var t = TYPES[o.type] || {}
    if (!t.block) return false
    if (o.type === 'fire') return o.st !== 'out'
    if (o.type === 'repair') return o.st !== 'fixed'
    if (o.type === 'person') return o.st !== 'rescued'
    if (o.type === 'gate') return o.st !== 'open'
    if (o.type === 'hole') return o.st !== 'filled'
    if (o.type === 'wagon') return o.st === 'idle'
    if (o.type === 'part') return o.st === 'idle'
    if (o.type === 'stop' || o.type === 'loco' || o.type === 'pile' || o.type === 'patrol') return true
    if (t.carry) return o.st === 'idle'
    return !gone(o)
  }
  function blocker (w, r, c) { var a = objsAt(w, r, c); for (var i = 0; i < a.length; i++) if (blocks(a[i])) return a[i]; return null }
  function ahead (w, n) { var d = DIRS[w.m.h]; n = n || 1; return [w.m.r + d[0] * n, w.m.c + d[1] * n] }
  function find (w, id) { for (var i = 0; i < w.objs.length; i++) if (w.objs[i].id === id) return w.objs[i]; return null }

  function res (w, status, reason, info, events) {
    return { world: w, status: status, reason: reason || null, info: info || null, events: events || [] }
  }
  // a closed toolbox on the cell Mojo is about to enter asks for its microgame first (LEWATI trigger)
  function boxAt (w, r, c) { return objsAt(w, r, c).filter(function (o) { return o.type === 'toolbox' && o.st === 'closed' })[0] || null }
  function enterGate (w0, w, r, c, opts) {
    var tb = inb(w, r, c) ? boxAt(w, r, c) : null
    if (!tb || !tb.mg) return null
    var mv = opts.auto ? true : opts.mg
    if (mv == null) return res(w0, 'waiting-for-microgame', null, { mg: { kind: tb.mg.kind || 'letters', id: tb.mg.id || ('mg-' + tb.id), spec: tb.mg, obj: tb.id, tool: tb.tool } })
    if (!mv) return res(w0, 'blocked', 'microgame', { id: tb.id, at: [r, c] })
    return null
  }
  /* ── queues, trains and payloads (owner 2026-10-07) ─────────────────── */
  // a thing in a queue is resolved only in its turn: a numbered stop, a trail print, an uncle waiting third
  function orderDone (o) { return o.type === 'stop' ? o.st === 'done' : gone(o) }
  function orderBlock (w, o) {
    if (!o || !o.order) return null
    for (var i = 0; i < w.objs.length; i++) {
      var x = w.objs[i]
      if (x === o || (x.seq || '') !== (o.seq || '') || !x.order || x.order >= o.order) continue
      if (!orderDone(x)) return { next: x.id, order: x.order, mine: o.order }
    }
    return null
  }
  // a LEWATI item that is out of turn stops Mojo BEFORE he drives onto it (so the trail is followed, not skipped)
  function orderGate (w0, w, r, c) {
    if (!inb(w, r, c)) return null
    var a = objsAt(w, r, c)
    for (var i = 0; i < a.length; i++) {
      if (!(TYPES[a[i].type] || {}).ordered || gone(a[i])) continue
      var b = orderBlock(w, a[i])
      if (b) return res(w0, 'blocked', 'order', { id: a[i].id, next: b.next, order: b.order, mine: b.mine })
    }
    return null
  }
  // does this destination take what Mojo is carrying? (id, type or kind — a red parcel to the red mailbox)
  function accepts (stop, w) {
    var o = w.m.carry ? find(w, w.m.carry) : null
    if (!o) return false
    if (!stop.accepts) return true
    return stop.accepts === o.id || stop.accepts === o.type || stop.accepts === o.kind
  }
  // coupled wagons follow Mojo through the cells he leaves behind
  function shiftTrail (w, from, ev) {
    var m = w.m
    if (!m.train.length) return
    m.tail = [[from[0], from[1]]].concat(m.tail).slice(0, m.train.length)
    for (var i = 0; i < m.train.length; i++) {
      var o = find(w, m.train[i])
      if (o && m.tail[i]) { o.r = m.tail[i][0]; o.c = m.tail[i][1] }
    }
    ev.push({ e: 'trail', ids: m.train.slice(), at: m.tail.map(function (p) { return [p[0], p[1]] }) })
  }
  // every patrol takes one step; it catches Mojo if it walks onto his cell
  function advancePatrols (w, ev) {
    var t = (w.tick || 0) + 1, hit = null
    for (var i = 0; i < w.objs.length; i++) {
      var o = w.objs[i]
      if (!(TYPES[o.type] || {}).patrol) continue
      var p = patrolAt(o, t)
      o.r = p[0]; o.c = p[1]
      ev.push({ e: 'patrol', id: o.id, at: [o.r, o.c] })
      if (!w.m.air && o.r === w.m.r && o.c === w.m.c) hit = { id: o.id, at: [o.r, o.c] }
    }
    w.tick = t
    return hit
  }
  // enter a cell (driving, landing, or flying over it): take every LEWATI item there.
  // A resource stops at its cap; that pickup then stays on the ground (event full, reason cap-full).
  function enter (w, r, c, ev) {
    w.m.r = r; w.m.c = c
    var a = objsAt(w, r, c)
    for (var i = 0; i < a.length; i++) {
      var o = a[i], t = TYPES[o.type] || {}
      if (o.type === 'toolbox' && o.st === 'closed') { o.st = 'got'; w.tools[o.tool] = true; ev.push({ e: 'tool', id: o.id, tool: o.tool }); continue }
      if (t.keyed && !gone(o)) { o.st = 'got'; w.keys[o.key || o.id] = true; ev.push({ e: 'key', id: o.id, key: o.key || o.id }); continue }
      if (t.ordered && !gone(o)) { o.st = 'got'; w.got[o.id] = true; ev.push({ e: 'mark', id: o.id, n: o.order || 0 }); continue }
      if (!t.pickup) continue
      if (t.star) { o.st = 'got'; w.got[o.id] = true; ev.push({ e: 'star', id: o.id }); continue }
      var k = o.res || t.res, cap = w.cap[k], cur = w.res[k] || 0, add = o.n || 1
      if (cap != null && cur >= cap) { ev.push({ e: 'full', id: o.id, res: k, reason: 'cap-full' }); continue }
      w.res[k] = cap != null ? Math.min(cap, cur + add) : cur + add
      o.st = 'got'
      ev.push({ e: 'collect', id: o.id, res: k, value: w.res[k] })
    }
  }

  /* ── one command ─────────────────────────────────────────────────────── */
  // SEBELAH targeting: which neighbour cells hold something this verb can act on
  function unresolved (o) {
    if (o.type === 'person') return o.st !== 'rescued'
    if (o.type === 'repair') return o.st !== 'fixed'
    if (o.type === 'stop') return o.st !== 'done'
    return !gone(o)
  }
  var AIM = {
    spray: function (w, r, c) { return objsAt(w, r, c).some(function (o) { return o.type === 'fire' && o.st !== 'out' }) },
    push: function (w, r, c) { return objsAt(w, r, c).some(function (o) { return (TYPES[o.type] || {}).push && blocks(o) }) },
    raise: function (w, r, c) { return objsAt(w, r, c).some(function (o) { return o.elev > 0 && unresolved(o) }) },
    rescue: function (w, r, c) { return objsAt(w, r, c).some(function (o) { return o.type === 'person' && o.st !== 'rescued' }) },
    repair: function (w, r, c) { return objsAt(w, r, c).some(function (o) { return o.type === 'repair' && o.st !== 'fixed' }) },
    pick: function (w, r, c) { return objsAt(w, r, c).some(function (o) { return (TYPES[o.type] || {}).carry && o.st === 'idle' }) },
    deliver: function (w, r, c) { return objsAt(w, r, c).some(function (o) { return o.type === 'stop' && o.st !== 'done' && accepts(o, w) }) },
    couple: function (w, r, c) {
      return objsAt(w, r, c).some(function (o) {
        var t = TYPES[o.type] || {}
        return (t.trail && o.st === 'idle') || (t.loco && o.st !== 'ready')
      })
    },
    unlock: function (w, r, c) { return objsAt(w, r, c).some(function (o) { return o.type === 'gate' && o.st !== 'open' }) },
    load: function (w, r, c) { return objsAt(w, r, c).some(function (o) { return o.type === 'pile' }) },
    dump: function (w, r, c) { return objsAt(w, r, c).some(function (o) { return o.type === 'hole' && o.st !== 'filled' }) },
    place: function (w, r, c) { var ch = terCh(w, r, c); return (ch === 'o' || ch === '~') && !objsAt(w, r, c).length },
    jump: function (w, r, c) {
      if (objsAt(w, r, c).some(function (o) { return (TYPES[o.type] || {}).jump && blocks(o) })) return true
      var ch = terCh(w, r, c); return ch === 'o' || ch === '~'
    }
  }
  AIM.hook = AIM.pick
  // the directions (0 N .. 3 W) whose neighbour this verb can act on
  function aim (w, verb) {
    var f = AIM[verb], out = []
    if (!f) return out
    for (var d = 0; d < 4; d++) {
      var nr = w.m.r + DIRS[d][0], nc = w.m.c + DIRS[d][1]
      if (inb(w, nr, nc) && f(w, nr, nc)) out.push(d)
    }
    return out
  }
  // abs mode: an action uses the ONE adjacent target (Mojo turns to it). Two: the facing one, else ambiguous.
  function step (w0, cmd, opts) {
    var verb = verbOf(cmd)
    if (modeOf(w0) === 'rel' || !AIM[verb] || !can(w0.m.form, verb)) return core(w0, cmd, opts)
    var dirs = aim(w0, verb), d = w0.m.h
    if (dirs.length === 1) d = dirs[0]
    else if (dirs.length > 1) {
      if (dirs.indexOf(w0.m.h) < 0) return res(w0, 'blocked', 'ambiguous', { verb: verb, dirs: dirs })
    }
    if (d === w0.m.h) return core(w0, cmd, opts)
    var w1 = clone(w0); w1.m.h = d
    var r = core(w1, cmd, opts)
    if (ok(r.status)) { r.events = [{ e: 'turn', h: d, auto: true }].concat(r.events || []); r.turned = true; return r }
    r.world = w0
    r.info = Object.assign({}, r.info || {}, { turn: d })
    return r
  }
  // a raised target (person, repair point) the current form cannot reach
  function heightBlock (w0, w, o, verb) {
    var m = w.m, el = o.elev || 0, flyer = m.air && FORMS[m.form] && FORMS[m.form].fly
    if (el <= 0) return m.lift > 0 ? res(w0, 'blocked', 'lift-up', { lift: m.lift, id: o.id }) : null
    if (m.lift === el || (flyer && verb === 'rescue')) return null
    if (can(m.form, 'raise')) return res(w0, 'blocked', 'too-high', { id: o.id, elev: el, lift: m.lift })
    var forms = formsWith('raise', w.forms)
    if (verb === 'rescue') forms = forms.concat(formsWith('takeoff', w.forms).filter(function (f) { return FORMS[f].fly && forms.indexOf(f) < 0 }))
    if (FORMS[m.form] && FORMS[m.form].fly && verb === 'rescue') return res(w0, 'blocked', 'too-high', { id: o.id, elev: el, lift: m.lift, fly: true })
    return res(w0, 'blocked', 'need-form', { id: o.id, elev: el, verb: verb, forms: forms })
  }
  function core (w0, cmd, opts) {
    opts = opts || {}
    var verb = verbOf(cmd), arg = typeof cmd === 'string' ? cmd.split(':')[1] : null
    var w = clone(w0), m = w.m, ev = [], g
    if (!verb) return res(w0, 'blocked', 'empty')
    if (verb !== 'swop' && verb !== 'wait' && BASE.indexOf(verb) < 0 && !can(m.form, verb)) {
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
          if (t.grass) return res(w0, 'blocked', 'grass', { at: a, terrain: ',', name: t.name, h: m.h })
          if (!t.pass) return res(w0, 'blocked', 'terrain', { at: a, terrain: terCh(w, ar, ac), name: t.name, h: m.h })
          var b = blocker(w, ar, ac)
          if (b) return res(w0, 'blocked', 'object', { at: a, id: b.id, type: b.type, h: m.h })
        }
        if ((g = enterGate(w0, w, ar, ac, opts))) return g
        if ((g = orderGate(w0, w, ar, ac))) return g
        var was = [m.r, m.c]
        ev.push({ e: 'move', from: was, to: a })
        enter(w, ar, ac, ev)   // flying over a cell takes its items too (the Chopper collects everything)
        shiftTrail(w, was, ev)
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
        var pwas = [m.r, m.c]
        ev.push({ e: 'move', from: pwas, to: a })
        enter(w, ar, ac, ev)
        shiftTrail(w, pwas, ev)
        break
      }
      case 'jump': {
        if (!inb(w, ar, ac)) return res(w0, 'blocked', 'no-target', { verb: 'jump' })
        var ot = ter(w, ar, ac), ob = blocker(w, ar, ac)
        if (ob) {
          if (ob.type === 'fire') return res(w0, 'blocked', 'jump-fire', { at: a, id: ob.id, type: ob.type })
          if (ob.type === 'person') return res(w0, 'blocked', 'jump-person', { at: a, id: ob.id, type: ob.type })
          if (ob.type === 'repair') return res(w0, 'blocked', 'jump-repair', { at: a, id: ob.id, type: ob.type })
          if (!(TYPES[ob.type] || {}).jump) return res(w0, 'blocked', 'too-tall', { at: a, id: ob.id, type: ob.type })
        } else {
          if (ot.grass) return res(w0, 'blocked', 'no-target', { verb: 'jump', at: a, terrain: ',' })   // nothing to jump over
          if (!ot.jump) return res(w0, 'blocked', 'too-tall', { at: a, terrain: terCh(w, ar, ac), name: ot.name })
          if (ot.pass) return res(w0, 'blocked', 'no-target', { verb: 'jump', at: a })
        }
        var l = ahead(w, 2)
        if (!inb(w, l[0], l[1])) return res(w0, 'blocked', 'edge', { at: l })
        var lt = ter(w, l[0], l[1])
        if (lt.grass) return res(w0, 'blocked', 'grass', { at: l, terrain: ',', name: lt.name, land: true })
        if (!lt.pass) return res(w0, 'blocked', 'land', { at: l, terrain: terCh(w, l[0], l[1]) })
        var lb = blocker(w, l[0], l[1])
        if (lb) return res(w0, 'blocked', 'land', { at: l, id: lb.id, type: lb.type })
        if ((g = enterGate(w0, w, l[0], l[1], opts))) return g
        if ((g = orderGate(w0, w, l[0], l[1]))) return g
        var jwas = [m.r, m.c]
        ev.push({ e: 'jump', from: jwas, to: l, over: a })
        enter(w, l[0], l[1], ev)
        shiftTrail(w, jwas, ev)
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
        var hi = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return o.elev > 0 && unresolved(o) })[0] : null
        if (!hi) return res(w0, 'blocked', 'no-target', { verb: 'raise' })
        var mg = { kind: 'height', target: hi.elev, id: (hi.mg && hi.mg.id) || ('h-' + hi.id), spec: hi.mg || null, obj: hi.id }
        var v = opts.auto ? hi.elev : opts.mg
        if (v == null) return res(w0, 'waiting-for-microgame', null, { mg: mg })
        if (+v !== hi.elev) return res(w0, 'blocked', 'height', { want: hi.elev, got: +v, id: hi.id })
        m.lift = hi.elev
        ev.push({ e: 'raise', lift: m.lift, id: hi.id })
        break
      }
      case 'lower':
        if (!(m.lift > 0)) return res(w0, 'blocked', 'not-raised')
        m.lift = 0; ev.push({ e: 'lower' }); break
      case 'rescue': {
        var pp = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return o.type === 'person' && o.st !== 'rescued' })[0] : null
        if (!pp) return res(w0, 'blocked', 'no-target', { verb: 'rescue' })
        if ((g = heightBlock(w0, w, pp, 'rescue'))) return g
        pp.st = 'rescued'
        ev.push({ e: 'rescue', id: pp.id })
        break
      }
      case 'pick': case 'hook': {
        if (m.carry) return res(w0, 'blocked', 'hands-full', { id: m.carry })
        var tg = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return (TYPES[o.type] || {}).carry && o.st === 'idle' })[0] : null
        if (!tg) return res(w0, 'blocked', 'no-target', { verb: verb })
        if (tg.heavy && verb !== 'hook') return res(w0, 'blocked', 'too-heavy', { id: tg.id })
        var pb = orderBlock(w, tg)
        if (pb) return res(w0, 'blocked', 'order', { id: tg.id, next: pb.next, order: pb.order, mine: pb.mine })
        tg.st = 'carried'; m.carry = tg.id
        ev.push({ e: 'pick', id: tg.id, ride: !!(TYPES[tg.type] || {}).ride })
        break
      }
      /* ANTAR: hand what Mojo carries to the destination beside him. `keep` = a visit (the passenger stays
         aboard and rides on to the next uncle); otherwise the passenger steps off and the stop is done. */
      case 'deliver': {
        if (!m.carry) return res(w0, 'blocked', 'hands-empty')
        var sp = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return o.type === 'stop' && o.st !== 'done' && accepts(o, w) })[0]
          || objsAt(w, ar, ac).filter(function (o) { return o.type === 'stop' && o.st !== 'done' })[0] : null
        if (!sp) return res(w0, 'blocked', 'no-target', { verb: 'deliver' })
        if (!accepts(sp, w)) return res(w0, 'blocked', 'wrong-stop', { id: sp.id, carry: m.carry, wants: sp.accepts })
        var sb = orderBlock(w, sp)
        if (sb) return res(w0, 'blocked', 'order', { id: sp.id, next: sb.next, order: sb.order, mine: sb.mine })
        if ((g = heightBlock(w0, w, sp, 'deliver'))) return g   // a nest up a tree: NAIK to it first
        var cg = find(w, m.carry)
        sp.got = (sp.got || 0) + 1
        if (sp.got >= (sp.need || 1)) sp.st = 'done'
        if (!sp.keep) { cg.r = sp.r; cg.c = sp.c; cg.st = 'delivered-gone'; m.carry = null }
        ev.push({ e: 'deliver', id: sp.id, cargo: cg.id, keep: !!sp.keep, pay: sp.pay || null, at: [sp.r, sp.c], done: sp.st === 'done' })
        break
      }
      /* GANDENG: a wagon joins the line behind Mojo; at the station the whole line is handed to the engine. */
      case 'couple': {
        var cand = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) {
          var t = TYPES[o.type] || {}
          return (t.trail && o.st === 'idle') || (t.loco && o.st !== 'ready')
        })[0] : null
        if (!cand) return res(w0, 'blocked', 'no-target', { verb: 'couple' })
        if ((TYPES[cand.type] || {}).loco) {
          var need = cand.needs || 1
          if (m.train.length < need) return res(w0, 'blocked', 'need-wagons', { id: cand.id, need: need, have: m.train.length })
          cand.st = 'ready'; cand.wagons = m.train.length
          m.train.forEach(function (id) { var x = find(w, id); if (x) x.st = 'delivered' })
          ev.push({ e: 'train', id: cand.id, n: m.train.length, ids: m.train.slice(), pay: cand.pay || 'horn' })
          m.train = []; m.tail = []
          break
        }
        var tcap = m.tcap || 3
        if (m.train.length >= tcap) return res(w0, 'blocked', 'train-full', { have: m.train.length, cap: tcap })
        cand.st = 'coupled'
        m.train = m.train.concat([cand.id])
        m.tail = m.tail.concat([[cand.r, cand.c]])
        ev.push({ e: 'couple', id: cand.id, n: m.train.length })
        break
      }
      /* BUKA: the gate opens once Mojo holds its key (the key is a LEWATI pickup). */
      case 'unlock': {
        var gt = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return o.type === 'gate' && o.st !== 'open' })[0] : null
        if (!gt) return res(w0, 'blocked', 'no-target', { verb: 'unlock' })
        var nk = gt.key || 'kunci'
        if (!w.keys[nk]) return res(w0, 'blocked', 'need-key', { id: gt.id, key: nk })
        gt.st = 'open'
        ev.push({ e: 'unlock', id: gt.id, key: nk })
        break
      }
      /* ISI / TUANG: a scoop from the pile, poured into the hole until its need is met (that cell becomes road). */
      case 'load': {
        var pl = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return o.type === 'pile' })[0] : null
        if (!pl) return res(w0, 'blocked', 'no-target', { verb: 'load' })
        var lk = pl.res || 'sand', lcap = w.cap[lk], lcur = w.res[lk] || 0
        if (lcap != null && lcur >= lcap) return res(w0, 'blocked', 'cap-full', { res: lk, id: pl.id })
        w.res[lk] = lcap != null ? Math.min(lcap, lcur + (pl.n || 1)) : lcur + (pl.n || 1)
        ev.push({ e: 'load', id: pl.id, res: lk, value: w.res[lk] })
        break
      }
      case 'dump': {
        var hl = inb(w, ar, ac) ? objsAt(w, ar, ac).filter(function (o) { return o.type === 'hole' && o.st !== 'filled' })[0] : null
        if (!hl) return res(w0, 'blocked', 'no-target', { verb: 'dump' })
        var dk = hl.res || 'sand', dneed = (hl.need || 1) - (hl.got || 0), dhave = w.res[dk] || 0
        if (dhave <= 0) return res(w0, 'blocked', 'no-load', { id: hl.id, res: dk, need: dneed })
        var dused = Math.min(dhave, dneed)
        w.res[dk] = dhave - dused; hl.got = (hl.got || 0) + dused
        if (hl.got >= (hl.need || 1)) { hl.st = 'filled'; w.fill[hl.r + ',' + hl.c] = 1 } else hl.st = 'part'
        ev.push({ e: 'dump', id: hl.id, used: dused, left: (hl.need || 1) - hl.got, filled: hl.st === 'filled' })
        break
      }
      /* PASANG: the carried plank goes down over the gap beside Mojo and becomes a crossing. */
      case 'place': {
        if (!m.carry) return res(w0, 'blocked', 'hands-empty')
        var pc = find(w, m.carry)
        if (!(TYPES[pc.type] || {}).fits) return res(w0, 'blocked', 'drop-here', { at: a, id: pc.id })
        if (!inb(w, ar, ac)) return res(w0, 'blocked', 'edge', { at: a })
        var pch = terCh(w, ar, ac)
        if (!((pch === 'o' || pch === '~') && !w.fill[ar + ',' + ac])) return res(w0, 'blocked', 'no-gap', { at: a, terrain: pch })
        if (objsAt(w, ar, ac).length) return res(w0, 'blocked', 'drop-here', { at: a })
        pc.r = ar; pc.c = ac; pc.st = 'placed'; m.carry = null
        w.fill[ar + ',' + ac] = 1
        ev.push({ e: 'place', id: pc.id, at: a, terrain: pch })
        break
      }
      case 'wait': ev.push({ e: 'wait' }); break
      case 'drop': case 'release': {
        if (!m.carry) return res(w0, 'blocked', 'hands-empty')
        if (!inb(w, ar, ac) || !ter(w, ar, ac).pass || objsAt(w, ar, ac).filter(function (o) { return o.type !== 'zone' }).length) return res(w0, 'blocked', 'drop-here', { at: a })
        var cr = find(w, m.carry)
        if ((TYPES[cr.type] || {}).ride) return res(w0, 'blocked', 'drop-here', { at: a, id: cr.id, ride: true })
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
        if ((g = heightBlock(w0, w, rp, 'repair'))) return g
        for (var rk2 in nd) if (rk2 !== 'tool') w.res[rk2] -= nd[rk2]
        rp.st = 'fixed'
        ev.push({ e: 'repair', id: rp.id })
        break
      }
      default: return res(w0, 'invalid-capability', 'unknown-verb', { verb: verb })
    }
    if (w.patrols) { var caught = advancePatrols(w, ev); if (caught) return res(w0, 'blocked', 'caught', caught) }
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
      case 'deliver': return !!o && (o.st === 'delivered' || o.st === 'done')
      case 'visit': return !!o && (o.st === 'done' || o.st === 'got')
      case 'train': return !!o && o.st === 'ready'
      case 'fill': return !!o && o.st === 'filled'
      case 'open': return !!o && o.st === 'open'
      case 'place': return !!o && o.st === 'placed'
      case 'carry': return w.m.carry === ob.id
      case 'wagons': return ((w.m.train || []).length) >= (ob.n || 1)   // a pack's "keep n wagons in tow" (Kereta Pemberani)
      case 'key': return !!w.keys[ob.key || ob.id]
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

  /* ── program cursor: REPEAT ×N, IF <cond> (icon-led; checked against the cell ahead, except 'pickup',
     which reads Mojo's own cell: LEWATI items are taken by standing on them) ── */
  function cond (w, c) {
    if (c === 'pickup') return objsAt(w, w.m.r, w.m.c).some(function (o) { return (TYPES[o.type] || {}).pickup })
    var a = ahead(w)
    if (!inb(w, a[0], a[1])) return c === 'edge'
    var os = objsAt(w, a[0], a[1])
    switch (c) {
      case 'fire': return os.some(function (o) { return o.type === 'fire' && o.st !== 'out' })
      case 'rock': return os.some(function (o) { return (o.type === 'rock' || o.type === 'log') && blocks(o) })
      case 'person': return os.some(function (o) { return o.type === 'person' && o.st !== 'rescued' })
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
    if (c === 'wait' && !w.patrols) return false   // waiting changes nothing when nothing moves on its own
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
      if (s && s.length) return { at: k, cmd: s[0], keep: k, rest: s.length, steps: s }
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
    else if (!(TERRAIN[(gr.map[at[0]] || '').charAt(at[1])] || {}).road) p.push(lv.id + ': mojo starts off the road')
    ;(lv.objects || []).forEach(function (o) {
      if (ids[o.id]) p.push(lv.id + ': duplicate id ' + o.id); ids[o.id] = 1
      if (!TYPES[o.type]) p.push(lv.id + ': unknown type ' + o.type)
      if (!o.at || !(o.at[0] >= 0 && o.at[0] < gr.rows && o.at[1] >= 0 && o.at[1] < gr.cols)) { p.push(lv.id + ': ' + o.id + ' out of the grid'); return }
      var k = o.at[0] + ',' + o.at[1], t = TYPES[o.type] || {}
      if (at && at[0] === o.at[0] && at[1] === o.at[1] && t.block) p.push(lv.id + ': ' + o.id + ' on the mojo start')
      if (t.block || t.pickup || o.type === 'toolbox') { if (cells[k]) p.push(lv.id + ': ' + o.id + ' shares a cell with ' + cells[k]); cells[k] = o.id }
      var ch = (gr.map[o.at[0]] || '').charAt(o.at[1]), tr = TERRAIN[ch] || {}
      // LEWATI items, pushables and crates (Mojo enters or carries from that cell) sit ON the road;
      // other SEBELAH targets may stand on road or on park grass beside it
      var onRoad = t.walk || t.push || t.carry || t.trail || t.road
      if (onRoad ? !tr.road : !(tr.road || tr.grass)) p.push(lv.id + ': ' + o.id + ' stands on ' + (tr.name || ch) + (onRoad && tr.grass ? ' (it must sit ON the road)' : ''))
    })
    p = p.concat(lintRule(lv))
    p = p.concat(lintDelivery(lv, ids))
    ;(lv.beats || []).forEach(function (b, bi) {
      if (!b.objectives || !b.objectives.length) p.push(lv.id + ': beat ' + bi + ' has no objective')
      ;(b.objectives || []).forEach(function (ob) { if (ob.id && !ids[ob.id]) p.push(lv.id + ': beat ' + bi + ' objective names ' + ob.id) })
      ;(b.forms || []).forEach(function (f) { if (!FORMS[f]) p.push(lv.id + ': unknown form ' + f) })
      ;(b.palette || []).forEach(function (c) { var v = verbOf(c); if (v === 'swop') { if (!FORMS[c.split(':')[1]]) p.push(lv.id + ': palette swop ' + c) } else if (BASE.indexOf(v) < 0 && v !== 'wait' && !formsWith(v).length) p.push(lv.id + ': palette verb ' + c) })
      if (!(b.slots > 0)) p.push(lv.id + ': beat ' + bi + ' slots')
    })
    return p
  }
  /* the LEWATI / SEBELAH rule and the ROAD rule, statically:
     - the road network ('.' '=' plus the gaps a rock fills or a jump crosses: pit 'o', water '~') is ONE piece
       joined to Mojo's start, and no road cell stands alone;
     - every LEWATI item lies on a road cell of that network;
     - every SEBELAH target has a ROAD neighbour on that network (it can be reached and acted on);
     - no road cell ever touches two targets of the same verb (an action is never ambiguous). Jump counts objects
       only: pits and water are ground, the facing decides between an object and a pit. */
  function lintRule (lv) {
    var p = [], gr = lv.grid || {}, map = gr.map || [], R = gr.rows, C = gr.cols
    function tr (r, c) { return r >= 0 && c >= 0 && r < R && c < C ? TERRAIN[(map[r] || '').charAt(c)] || {} : {} }
    function road (r, c) { return !!tr(r, c).road }
    // a pit (a pushed rock fills it) or water (jumped) joins two road pieces
    function link (r, c) { var t = tr(r, c); return !!(t.road || t.fill || (t.jump && !t.pass && !t.grass)) }
    var at = lv.mojo && lv.mojo.at, seen = {}, q = []
    if (at && road(at[0], at[1])) { seen[at[0] + ',' + at[1]] = 1; q.push(at) }
    for (var h = 0; h < q.length; h++) for (var d0 = 0; d0 < 4; d0++) {
      var nr = q[h][0] + DIRS[d0][0], nc = q[h][1] + DIRS[d0][1], nk = nr + ',' + nc
      if (!seen[nk] && link(nr, nc)) { seen[nk] = 1; q.push([nr, nc]) }
    }
    var lone = [], cut = []
    for (var r0 = 0; r0 < R; r0++) for (var c0 = 0; c0 < C; c0++) {
      if (!road(r0, c0)) continue
      var nb0 = 0
      for (var d1 = 0; d1 < 4; d1++) if (link(r0 + DIRS[d1][0], c0 + DIRS[d1][1])) nb0++
      if (!nb0) lone.push(r0 + ',' + c0)
      if (!seen[r0 + ',' + c0]) cut.push(r0 + ',' + c0)
    }
    if (lone.length) p.push(lv.id + ': isolated road cell ' + lone.join(' '))
    if (cut.length) p.push(lv.id + ': road not connected to the start at ' + cut.join(' '))
    var targets = {}   // verb -> [obj]
    function add (v, o) { (targets[v] = targets[v] || []).push(o) }
    ;(lv.objects || []).forEach(function (o) {
      var t = TYPES[o.type] || {}
      if (!o.at) return
      if (t.walk && !seen[o.at[0] + ',' + o.at[1]]) p.push(lv.id + ': ' + o.id + ' is not on the road network from the start')
      if (t.block) {
        var nb = 0, reach = 0
        for (var d = 0; d < 4; d++) {
          var rr = o.at[0] + DIRS[d][0], rc = o.at[1] + DIRS[d][1]
          if (road(rr, rc)) { nb++; if (seen[rr + ',' + rc]) reach++ }
        }
        if (!nb) p.push(lv.id + ': ' + o.id + ' cannot be reached from any road beside it')
        else if (!reach) p.push(lv.id + ': ' + o.id + ' has no road neighbour connected to the start')
      }
      if (t.verb) add(t.verb, o)
      if (t.jump) add('jump', o)
      if (o.elev > 0) add('raise', o)
    })
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
      if (!link(r, c)) continue
      for (var v in targets) {
        var near = targets[v].filter(function (o) { return Math.abs(o.at[0] - r) + Math.abs(o.at[1] - c) === 1 })
        if (near.length > 1) p.push(lv.id + ': cell ' + r + ',' + c + ' touches two ' + v + ' targets (' + near.map(function (o) { return o.id }).join(', ') + ')')
      }
    }
    return p
  }
  /* the delivery family, statically (owner 2026-10-07): a queue is a complete 1..n run, a destination names
     something that exists and can actually be carried to it, a gate has its key somewhere on the board, the
     station has enough wagons, a hole has a pile (or a starting load), and a patrol walks on road only. */
  function lintDelivery (lv, ids) {
    var p = [], objs = lv.objects || [], byId = {}, kinds = {}, types = {}, keys = {}, seqs = {}
    objs.forEach(function (o) {
      byId[o.id] = o; types[o.type] = (types[o.type] || 0) + 1
      if (o.kind) kinds[o.kind] = (kinds[o.kind] || 0) + 1
      if ((TYPES[o.type] || {}).keyed) keys[o.key || o.id] = 1
      if (o.order) {
        var g = seqs[o.seq || ''] = seqs[o.seq || ''] || []
        g.push(o)
      }
    })
    for (var sq in seqs) {
      var g = seqs[sq].slice().sort(function (a, b) { return a.order - b.order }), seen = {}
      g.forEach(function (o) {
        if (seen[o.order]) p.push(lv.id + ': two things numbered ' + o.order + ' in queue "' + sq + '" (' + seen[o.order] + ', ' + o.id + ')')
        seen[o.order] = o.id
      })
      for (var n = 1; n <= g.length; n++) if (!seen[n]) p.push(lv.id + ': queue "' + sq + '" has no number ' + n + ' (it jumps from ' + (n - 1) + ')')
    }
    objs.forEach(function (o) {
      if (o.type === 'stop') {
        if (!o.accepts) { p.push(lv.id + ': ' + o.id + ' takes anything (give it accepts)'); return }
        var n = (byId[o.accepts] ? 1 : 0) + (types[o.accepts] || 0) + (kinds[o.accepts] || 0)
        if (!n) p.push(lv.id + ': ' + o.id + ' accepts "' + o.accepts + '", which nothing on the board is')
        else if (byId[o.accepts] && !(TYPES[byId[o.accepts].type] || {}).carry) p.push(lv.id + ': ' + o.id + ' accepts ' + o.accepts + ', which cannot be carried')
      }
      if (o.type === 'gate' && !keys[o.key || 'kunci']) p.push(lv.id + ': ' + o.id + ' needs the key "' + (o.key || 'kunci') + '", which is not on the board')
      if (o.type === 'loco' && (types.wagon || 0) < (o.needs || 1)) p.push(lv.id + ': ' + o.id + ' needs ' + (o.needs || 1) + ' wagons, the board has ' + (types.wagon || 0))
      if (o.type === 'hole') {
        var hres = o.res || 'sand'
        if (!types.pile && !((lv.res || {})[hres] >= (o.need || 1))) p.push(lv.id + ': ' + o.id + ' needs ' + (o.need || 1) + ' ' + hres + ' and the board has no pile to load from')
        if ((lv.cap || {})[hres] == null) p.push(lv.id + ': ' + o.id + ' pours ' + hres + ', which has no cap')
      }
      if (o.type === 'patrol') {
        var path = o.path || []
        if (path.length < 2) p.push(lv.id + ': ' + o.id + ' has no patrol path')
        path.forEach(function (c) {
          var tr = TERRAIN[((lv.grid.map[c[0]] || '').charAt(c[1]))] || {}
          if (!tr.road) p.push(lv.id + ': ' + o.id + ' patrols ' + c.join(',') + ', which is not road')
        })
      }
      if ((TYPES[o.type] || {}).fits && !(lv.grid.map || []).join('').match(/[o~]/)) p.push(lv.id + ': ' + o.id + ' is a plank and the board has no gap to bridge')
    })
    ;(lv.beats || []).forEach(function (b, bi) {
      var pal = b.palette || []
      if (pal.indexOf('deliver') >= 0 && pal.indexOf('pick') < 0) p.push(lv.id + ': beat ' + bi + ' offers ANTAR without AMBIL')
      if (pal.indexOf('dump') >= 0 && pal.indexOf('load') < 0) p.push(lv.id + ': beat ' + bi + ' offers TUANG without ISI')
      if (pal.indexOf('place') >= 0 && pal.indexOf('pick') < 0) p.push(lv.id + ': beat ' + bi + ' offers PASANG without AMBIL')
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
    VERSION: '1.3.0', REASONS: REASONS, AIM_VERBS: Object.keys(AIM), aim: aim, unresolved: unresolved, DIRS: DIRS, HEAD: HEAD, BASE: BASE, ABS: ABS, REL: REL, ABS_H: ABS_H, moves: moves, modeOf: modeOf, TERRAIN: TERRAIN, TYPES: TYPES,
    defineForm: defineForm, form: form, forms: function () { return Object.keys(FORMS) }, can: can, formsWith: formsWith, verbOf: verbOf,
    world: world, startBeat: startBeat, prep: prep, clone: clone, key: key, find: find, objsAt: objsAt, blocks: blocks, ahead: ahead, terrain: ter, terrainChar: terCh,
    step: step, stepBeat: stepBeat, ok: ok, met: met, beatDone: beatDone, cond: cond,
    cursor: cursor, size: size, flat: flat, run: run,
    accepts: accepts, orderBlock: orderBlock, patrolAt: patrolAt, lintDelivery: lintDelivery,
    palette: palette, solve: solve, count: count, hint: hint, lint: lint, lintRule: lintRule, verify: verify
  }
})(typeof window !== 'undefined' ? window : globalThis)
