/* =============================================================================
 * kereta-grid.js — window.KeretaGrid. HEADLESS, deterministic rail-puzzle interpreter for
 * "Kereta Pemberani: Petualangan Rel" (no DOM, no timers, no randomness: the same plan from the same
 * start always gives the same result — the same contract as prog-grid.js, so the same QA style applies).
 *
 * Why not prog-grid.js itself: its vehicles drive in screen directions on ROAD tiles and carry the Mojo form
 * rules (jump / fly / push). A train drives on RAILS in its own heading (MAJU / KIRI / KANAN, as the owner's
 * mission-UI reference shows), carries wagons that trail it, and two trains share one clock. The shape of the
 * API is kept (world / step / run / solve / verify / hint) so tools and gates read the same.
 *
 *   KeretaGrid.parse(level)                    -> static model (rows, rails, pins) + lint problems in .problems
 *   KeretaGrid.world(level)                    -> fresh world (immutable: step() returns a new one)
 *   KeretaGrid.step(world, action, opts)       -> {world, status, reason, events, completed, needQ}
 *        action = {trainId: command, ...}      one entry in solo/turns levels, one per train in 'both' levels
 *        status: success | blocked | question | completed        opts.auto / opts.mg resolve a question
 *   KeretaGrid.run(world, program, opts)       -> {world, steps, done, stop:{at, reason}|null}
 *   KeretaGrid.solve(world, opts)              -> shortest program (array of actions) | null     (BFS)
 *   KeretaGrid.hint(world, program, opts)      -> next correct action after the part of the plan that still works
 *   KeretaGrid.verify(level, opts)             -> {ok, problems, plan, slots}
 *   KeretaGrid.progress(world)                 -> HUD rows [{id, label, icon, have, need, done}]
 *
 * Commands (strings). Headings 0 N, 1 E, 2 S, 3 W; cells [row, col], row 0 at the top.
 *   maju   one tile forward               kiri / kanan   turn 90 degrees and move one tile (a corner)
 *   putar  turn round on the spot (a turntable; not with wagons)
 *   muat   load every cargo item beside the train      turun   unload what a station beside the train accepts
 *   tuas   throw every lever beside the train          tiup    whistle (animals within 2 tiles ahead or beside leave)
 *   tunggu wait one tick                               lepas   leave the last wagon on the rail behind
 * Things never block movement except: a CLOSED gate (signal / switch), a critter on the rail, another train.
 * ==========================================================================*/
(function (G) {
  'use strict'
  var DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1]
  var HEAD = { N: 0, E: 1, S: 2, W: 3 }
  var MOVES = ['maju', 'kiri', 'kanan']
  var VERBS = ['putar', 'muat', 'turun', 'tuas', 'tiup', 'tunggu', 'lepas', 'mundur', 'sambung', 'lampu', 'naik', 'wesel', 'berhenti']
  var MOVEISH = ['maju', 'kiri', 'kanan', 'mundur', 'sambung']   // commands that move the head
  var ALL = MOVES.concat(VERBS)
  var RAIL = '=BUMFPSHK'                 // drivable tiles: plain, bridge, tunnel, bumpy, field path, pond path, platform, hill
  var DECOR = ',.T~#RV '                // grass, meadow, tree, water, building, rock, village, void
  var PIN = { Z: 1, Y: 1, X: 1 }        // goal pins on a rail tile (a goal names its pin and its train)
  var CARGO = { p: 'penumpang', k: 'koper', s: 'surat', y: 'kayu', b: 'batubara', f: 'ikan', e: 'telur', m: 'medali', w: 'karangan', o: 'tamu', n: 'peti' }

  /* every failure reason the UI must explain (the gate proves each has its own kind message) */
  var MSG = {
    edge: 'Di depan sudah tidak ada jalan. Coba arah lain.',
    rail: 'Di sana tidak ada rel. Kereta hanya bisa jalan di atas rel.',
    gate: 'Lampu masih merah. Cari tuas untuk membukanya.',
    critter: 'Ada hewan di rel. Bunyikan peluit supaya ia minggir.',
    tail: 'Gerbong di belakang menghalangi. Pilih jalan lain.',
    train: 'Kereta lain masih ada di sana. Tunggu dulu atau ambil jalan lain.',
    tabrak: 'Dua kereta mau lewat bersamaan. Coba bergantian.',
    'no-target': 'Tidak ada yang bisa dikerjakan di dekat kereta.',
    'no-load': 'Belum ada muatan yang cocok di dalam kereta.',
    full: 'Kereta sudah penuh.',
    fog: 'Kabutnya tebal sekali. Nyalakan lampu dulu supaya jalannya terlihat.',
    sambung: 'Gerbong ini disambung dengan tombol Sambung, bukan ditabrak. Berhenti tepat di depannya dulu.',
    'no-wagon': 'Tidak ada gerbong yang bisa dilepas.',
    heavy: 'Kereta panjang tidak bisa berputar di tempat.',
    form: 'Perintah itu belum dipakai di misi ini.',
    unknown: 'Perintah tidak dikenal.',
    train404: 'Kereta itu tidak ada di misi ini.'
  }
  var LABEL = { maju: 'Maju', kiri: 'Belok Kiri', kanan: 'Belok Kanan', putar: 'Putar', muat: 'Muat', turun: 'Turun', tuas: 'Tuas', tiup: 'Tiup', tunggu: 'Tunggu', lepas: 'Lepas', mundur: 'Mundur', sambung: 'Sambung', lampu: 'Lampu', naik: 'Naik', wesel: 'Wesel', berhenti: 'Berhenti' }

  function clone (o) { return JSON.parse(JSON.stringify(o)) }
  function isRail (ch) { return RAIL.indexOf(ch) >= 0 }

  /* ── parse: static model from the ASCII map + legends ───────────────────────────────────────────────── */
  function parse (lv) {
    var rows = lv.rows, R = rows.length, C = rows[0].length, problems = [], things = [], trains = [], pins = {}
    var gateI = 0, leverI = 0, critI = 0, wagonI = 0, id = 0
    var tdefs = {}; (lv.trains || []).forEach(function (t, i) { tdefs[String(i + 1)] = t })
    var grid = []
    for (var r = 0; r < R; r++) {
      if (rows[r].length !== C) problems.push('row ' + r + ' width ' + rows[r].length + ' != ' + C)
      var line = []
      for (var c = 0; c < C; c++) {
        var ch = rows[r].charAt(c), t = ch
        if (tdefs[ch]) {
          var d = tdefs[ch]
          trains.push({ id: d.id, char: d.char || d.id, r: r, c: c, d: HEAD[d.dir || 'E'], tail: [], kinds: [], load: {}, wagons: d.wagons || 0, cap: d.cap || 0, order: +ch })
          t = '='
        } else if (PIN[ch] != null) { pins[ch] = [r, c]; t = '=' }
        else if (lv.wagons && lv.wagons[ch]) { var wd = lv.wagons[ch]; things.push({ id: 'w' + (++wagonI), type: 'wagon', r: r, c: c, on: 1, kind: wd.kind || 'umum', manual: wd.manual ? 1 : 0, sprite: wd.sprite || null }); t = '=' }
        else if (ch === 'W') { things.push({ id: 'w' + (++wagonI), type: 'wagon', r: r, c: c, on: 1, sprite: (lv.wagonSprite || 'mojo-train/coach-annie') }); t = '=' }
        else if (ch === 'C') {
          var cd = (lv.critters || [])[critI++] || {}
          things.push({ id: 'k' + critI, type: 'critter', r: r, c: c, kind: cd.kind || 'kura', aside: cd.aside || null, gone: 0, sprite: cd.sprite || null, after: cd.after == null ? null : cd.after }); t = '='
        } else if (ch === 'G') {
          var gd = (lv.gates || [])[gateI] || {}
          things.push({ id: 'g' + gateI, type: 'gate', r: r, c: c, open: gd.open ? 1 : 0, look: gd.look || 'signal', after: gd.after == null ? null : gd.after }); gateI++; t = '='
        } else if (ch === 'l') {
          var ld = (lv.levers || [])[leverI] || {}
          things.push({ id: 'l' + leverI, type: 'lever', r: r, c: c, toggles: ld.toggles || [], sets: ld.sets || null, q: ld.q || null, label: ld.label || '', look: ld.look || 'lever', on: 0 }); leverI++; t = ','
        } else if (CARGO[ch]) {
          var ov = (lv.legend || {})[ch] || {}
          things.push({ id: 'c' + (++id), type: 'cargo', r: r, c: c, kind: ov.kind || CARGO[ch], q: ov.q || null, sprite: ov.sprite || null, taken: 0 }); t = ch === 'f' ? '~' : ','
        } else if (/[ADEJ]/.test(ch)) {
          var sd = (lv.stops || {})[ch]
          if (!sd) problems.push('stop ' + ch + ' has no definition')
          else things.push({ id: 's' + ch, type: 'stop', r: r, c: c, accepts: sd.accepts, need: sd.need || 1, q: sd.q || null, label: sd.label || '', sprite: sd.sprite || null, count: 0 }); t = ','
        } else if (!isRail(ch) && DECOR.indexOf(ch) < 0) problems.push('unknown tile "' + ch + '" at ' + r + ',' + c)
        line.push(t)
      }
      grid.push(line)
    }
    trains.sort(function (a, b) { return a.order - b.order })
    var maxAfter = 0
    things.forEach(function (o) { if (o.after != null && o.after > maxAfter) maxAfter = o.after })
    var m = { lv: lv, R: R, C: C, grid: grid, pins: pins, problems: problems, trains: trains, things: things, maxAfter: maxAfter }
    // wagons start attached behind a train that asks for them: placed on the rail cells behind its heading
    trains.forEach(function (t) {
      for (var i = 0; i < t.wagons; i++) {
        var br = t.r - DR[t.d] * (i + 1), bc = t.c - DC[t.d] * (i + 1)
        if (br < 0 || bc < 0 || br >= R || bc >= C || !isRail(grid[br][bc])) { problems.push('train ' + t.id + ' has no rail for wagon ' + (i + 1)); break }
        t.tail.push([br, bc]); t.kinds.push('umum')
      }
      delete t.wagons; delete t.order
    })
    return m
  }
  var CACHE = typeof WeakMap !== 'undefined' ? new WeakMap() : null
  function model (lv) {
    var m = CACHE && CACHE.get(lv)
    if (!m) { m = parse(lv); if (CACHE) CACHE.set(lv, m) }
    return m
  }

  function world (lv) {
    var m = model(lv)
    return { m: m, lv: lv, trains: clone(m.trains), things: clone(m.things), flags: {}, solved: {}, tick: 0, done: false }
  }
  function cloneWorld (w) {
    return { m: w.m, lv: w.lv, trains: clone(w.trains), things: clone(w.things), flags: clone(w.flags), solved: clone(w.solved), tick: w.tick, done: w.done }
  }

  /* ── helpers ───────────────────────────────────────────────────────────────────────────────────────── */
  function trainAt (w, r, c, except) {
    for (var i = 0; i < w.trains.length; i++) {
      var t = w.trains[i]
      if (t.id === except) continue
      if (t.r === r && t.c === c) return t
      for (var j = 0; j < t.tail.length; j++) if (t.tail[j][0] === r && t.tail[j][1] === c) return t
    }
    return null
  }
  function timed (w, o) { return o.after != null && w.tick >= o.after }
  function thingAt (w, type, r, c) {
    for (var i = 0; i < w.things.length; i++) { var o = w.things[i]; if (o.type === type && o.r === r && o.c === c && !o.taken && !o.gone && !(o.type === 'critter' && timed(w, o)) && !(o.type === 'gate' && timed(w, o))) return o }
    return null
  }
  function near (w, t, type) {
    var out = []
    for (var d = 0; d < 4; d++) {
      var r = t.r + DR[d], c = t.c + DC[d]
      for (var i = 0; i < w.things.length; i++) { var o = w.things[i]; if (o.type === type && o.r === r && o.c === c && !o.taken && !o.gone) out.push(o) }
    }
    return out
  }
  function trainById (w, id) { for (var i = 0; i < w.trains.length; i++) if (w.trains[i].id === id) return w.trains[i]; return null }
  function loadCount (t) { var n = 0; for (var k in t.load) n += t.load[k]; return n }
  function allowed (w, cmd) {
    if (ALL.indexOf(cmd) < 0) return 'unknown'
    if (MOVES.indexOf(cmd) >= 0 || cmd === 'tunggu' || cmd === 'berhenti') return null
    var vs = w.lv.verbs
    return !vs || vs.indexOf(cmd) >= 0 ? null : 'form'
  }

  /* where would the train go for this move command? */
  function aim (t, cmd) {
    if (cmd === 'mundur') return { d: t.d, r: t.r - DR[t.d], c: t.c - DC[t.d], back: 1, cmd: cmd }
    var nd = (cmd === 'maju' || cmd === 'sambung') ? t.d : cmd === 'kiri' ? (t.d + 3) % 4 : (t.d + 1) % 4
    return { d: nd, r: t.r + DR[nd], c: t.c + DC[nd], cmd: cmd }
  }
  function moveBlock (w, t, a) {
    var m = w.m
    if (a.r < 0 || a.c < 0 || a.r >= m.R || a.c >= m.C) return 'edge'
    if (!isRail(m.grid[a.r][a.c])) return 'rail'
    if (a.back && t.tail.length) return 'heavy'
    var mw = thingAt(w, 'wagon', a.r, a.c)
    if (a.cmd === 'sambung') { if (!mw) return 'no-target' } else if (mw && mw.manual) return 'sambung'
    if (m.grid[a.r][a.c] === 'K' && !w.flags.lampu) return 'fog'
    var g = thingAt(w, 'gate', a.r, a.c)
    if (g && !g.open) return 'gate'
    if (thingAt(w, 'critter', a.r, a.c)) return 'critter'
    if (trainAt(w, a.r, a.c, t.id)) return 'train'
    for (var j = 0; j < t.tail.length - 1; j++) if (t.tail[j][0] === a.r && t.tail[j][1] === a.c) return 'tail'
    return null
  }
  function applyMove (w, t, a, ev) {
    var from = [t.r, t.c]
    var wg = thingAt(w, 'wagon', a.r, a.c)
    var nt = [[t.r, t.c]].concat(t.tail)
    var nk = t.kinds.slice()
    if (wg) { wg.taken = 1; nk.unshift(wg.kind || 'umum'); ev.push({ e: 'couple', thing: wg.id, at: [a.r, a.c], train: t.id }) } else nt = nt.slice(0, t.tail.length)
    t.kinds = nk; t.tail = nt; t.r = a.r; t.c = a.c; t.d = a.d
    ev.push({ e: 'move', train: t.id, from: from, to: [a.r, a.c], d: a.d })
    for (var pc in w.m.pins) if (w.m.pins[pc][0] === a.r && w.m.pins[pc][1] === a.c) w.flags['v' + pc] = 1
  }

  /* verbs. Returns a reason string, or {q: tag, thing: id} when a question gates the action, or null */
  function doVerb (w, t, cmd, ev, opts) {
    var i, o, list
    if (cmd === 'tunggu' || cmd === 'berhenti') { ev.push({ e: 'wait', train: t.id }); return null }
    if (cmd === 'lampu') { w.flags.lampu = w.flags.lampu ? 0 : 1; ev.push({ e: 'lamp', train: t.id, on: w.flags.lampu }); return null }
    if (cmd === 'wesel') cmd = 'tuas'
    if (cmd === 'putar') {
      if (t.tail.length) return 'heavy'
      t.d = (t.d + 2) % 4; ev.push({ e: 'turn', train: t.id, d: t.d }); return null
    }
    if (cmd === 'tiup') {
      ev.push({ e: 'whistle', train: t.id }); w.flags.tiup = 1
      for (i = 0; i < w.things.length; i++) {
        o = w.things[i]
        if (o.type !== 'critter' || o.gone) continue
        var dr = Math.abs(o.r - t.r), dc = Math.abs(o.c - t.c), ahead = false
        for (var s = 1; s <= 2; s++) if (o.r === t.r + DR[t.d] * s && o.c === t.c + DC[t.d] * s) ahead = true
        if (!(ahead || dr + dc === 1)) continue
        o.gone = 1
        ev.push({ e: 'critter-leave', thing: o.id, kind: o.kind, at: [o.r, o.c], aside: o.aside })
        if (o.aside) { w.things.push({ id: 'c' + o.id, type: 'cargo', r: o.aside[0], c: o.aside[1], kind: o.kind, q: null, sprite: o.sprite, taken: 0, was: o.id }) }
      }
      return null
    }
    if (cmd === 'lepas') {
      if (!t.tail.length) return 'no-wagon'
      var last = t.tail.pop(), lk = t.kinds.pop()
      var ex = null
      for (i = 0; i < w.things.length; i++) if (w.things[i].type === 'wagon' && w.things[i].taken && !w.things[i].parked && w.things[i].r === last[0] && w.things[i].c === last[1]) ex = w.things[i]
      if (ex) { ex.taken = 0; ex.parked = 1 } else w.things.push({ id: 'w' + w.things.length + 'p', type: 'wagon', r: last[0], c: last[1], on: 1, parked: 1, taken: 0, kind: lk || 'umum', sprite: w.lv.wagonSprite || 'mojo-train/coach-annie' })
      ev.push({ e: 'uncouple', train: t.id, at: last })
      return null
    }
    if (cmd === 'muat' || cmd === 'naik') {
      list = near(w, t, 'cargo')
      if (cmd === 'naik') list = list.filter(function (x) { return x.kind === 'penumpang' || x.kind === 'tamu' })
      if (!list.length) return 'no-target'
      if (t.cap && loadCount(t) >= t.cap) return 'full'
      var gate = list.filter(function (x) { return x.q && !w.solved[x.id] })[0]
      if (gate && !(opts.auto || opts.mg)) return { q: gate.q, thing: gate.id }
      for (i = 0; i < list.length; i++) {
        o = list[i]
        if (t.cap && loadCount(t) >= t.cap) break
        o.taken = 1; t.load[o.kind] = (t.load[o.kind] || 0) + 1; w.solved[o.id] = 1
        ev.push({ e: 'load', train: t.id, thing: o.id, kind: o.kind, at: [o.r, o.c] })
      }
      return null
    }
    if (cmd === 'turun') {
      list = near(w, t, 'stop')
      if (!list.length) return 'no-target'
      var usable = list.filter(function (s) { return (t.load[s.accepts] || 0) > 0 && s.count < s.need })
      if (!usable.length) return 'no-load'
      var qg = usable.filter(function (x) { return x.q && !w.solved[x.id] })[0]
      if (qg && !(opts.auto || opts.mg)) return { q: qg.q, thing: qg.id }
      usable.forEach(function (s) {
        var n = Math.min(t.load[s.accepts], s.need - s.count)
        t.load[s.accepts] -= n; s.count += n; w.solved[s.id] = 1
        ev.push({ e: 'unload', train: t.id, stop: s.id, kind: s.accepts, n: n, at: [s.r, s.c] })
      })
      return null
    }
    if (cmd === 'tuas') {
      list = near(w, t, 'lever')
      if (!list.length) return 'no-target'
      var lg = list.filter(function (x) { return x.q && !w.solved[x.id] })[0]
      if (lg && !(opts.auto || opts.mg)) return { q: lg.q, thing: lg.id }
      list.forEach(function (l) {
        l.on = l.on ? 0 : 1; w.solved[l.id] = 1
        l.toggles.forEach(function (gi) { var g = null; w.things.forEach(function (x) { if (x.id === 'g' + gi) g = x }); if (g) g.open = g.open ? 0 : 1 })
        if (l.sets) w.flags[l.sets] = w.flags[l.sets] ? 0 : 1
        ev.push({ e: 'lever', thing: l.id, on: l.on, toggles: l.toggles, at: [l.r, l.c] })
      })
      return null
    }
    return 'unknown'
  }

  /* ── goals / HUD ───────────────────────────────────────────────────────────────────────────────────── */
  function progress (w) {
    return (w.lv.goal || []).map(function (g, i) {
      var have = 0, need = g.need || 1, t
      if (g.t === 'load') { have = 0; w.trains.forEach(function (x) { if (!g.train || x.id === g.train) have += (x.load[g.kind] || 0) }); w.things.forEach(function (o) { if (o.type === 'stop' && o.accepts === g.kind) have += o.count }) }
      else if (g.t === 'deliver') { var s = null; w.things.forEach(function (o) { if (o.type === 'stop' && o.id === 's' + g.stop) s = o }); have = s ? s.count : 0; need = g.need || (s ? s.need : 1) }
      else if (g.t === 'reach') { t = g.train ? trainById(w, g.train) : w.trains[0]; var p = w.m.pins[g.pin || 'Z']; have = t && p && t.r === p[0] && t.c === p[1] ? 1 : 0 }
      else if (g.t === 'flag') have = w.flags[g.f] ? 1 : 0
      else if (g.t === 'whistle') have = w.flags.tiup ? 1 : 0
      else if (g.t === 'visit') have = w.flags['v' + (g.pin || 'Z')] ? 1 : 0
      else if (g.t === 'wagons') { t = trainById(w, g.train) || w.trains[0]; have = t ? Math.min(t.tail.length, need) : 0 }
      else if (g.t === 'critter') { w.things.forEach(function (o) { if (o.type === 'critter' && o.gone && (!g.kind || o.kind === g.kind)) have++ }) }
      else if (g.t === 'consist') { t = trainById(w, g.train) || w.trains[0]; var req = g.kinds.slice(), extra = 0, ok = 0; (t ? t.kinds : []).forEach(function (k) { var i = req.indexOf(k); if (i >= 0) { req.splice(i, 1); ok++ } else extra++ }); need = g.kinds.length; have = Math.max(0, ok - extra); if (extra) have = Math.min(have, need - 1) }
      else if (g.t === 'parked') { w.things.forEach(function (o) { if (o.type === 'wagon' && o.parked) have++ }) }
      else if (g.t === 'gate') { w.things.forEach(function (o) { if (o.type === 'gate' && o.open) have++ }) }
      return { id: g.id || ('g' + i), label: g.label || '', icon: g.icon || g.t, have: Math.min(have, need), need: need, done: have >= need, t: g.t, sprite: g.sprite || null }
    })
  }
  function complete (w) {
    var p = progress(w)
    return p.length > 0 && p.every(function (x) { return x.done })
  }

  /* ── step ──────────────────────────────────────────────────────────────────────────────────────────── */
  function step (w0, action, opts) {
    opts = opts || {}
    var ids = Object.keys(action || {})
    if (!ids.length) return { world: w0, status: 'blocked', reason: 'unknown', events: [], completed: false }
    var w = cloneWorld(w0), ev = [], i, id, cmd, t, why
    var moves = []
    for (i = 0; i < ids.length; i++) {
      id = ids[i]; cmd = action[id]; t = trainById(w, id)
      if (!t) return fail(w0, 'train404')
      why = allowed(w, cmd)
      if (why) return fail(w0, why, id)
      if (MOVEISH.indexOf(cmd) >= 0) moves.push({ t: t, a: aim(t, cmd) })
    }
    // simultaneous moves: same target or a swap is a collision for both
    for (i = 0; i < moves.length; i++) for (var j = i + 1; j < moves.length; j++) {
      var A = moves[i], B = moves[j]
      if ((A.a.r === B.a.r && A.a.c === B.a.c) || (A.a.r === B.t.r && A.a.c === B.t.c && B.a.r === A.t.r && B.a.c === A.t.c)) return fail(w0, 'tabrak', A.t.id)
    }
    for (i = 0; i < moves.length; i++) { why = moveBlock(w, moves[i].t, moves[i].a); if (why) return fail(w0, why, moves[i].t.id) }
    for (i = 0; i < moves.length; i++) applyMove(w, moves[i].t, moves[i].a, ev)
    for (i = 0; i < ids.length; i++) {
      id = ids[i]; cmd = action[id]
      if (MOVEISH.indexOf(cmd) >= 0) continue
      why = doVerb(w, trainById(w, id), cmd, ev, opts)
      if (why && typeof why === 'object') return { world: w0, status: 'question', reason: null, needQ: why, events: [], completed: false, train: id }
      if (why) return fail(w0, why, id)
    }
    w.tick++
    w.done = complete(w)
    return { world: w, status: w.done ? 'completed' : 'success', reason: null, events: ev, completed: w.done }
  }
  function fail (w, reason, train) { return { world: w, status: 'blocked', reason: reason, train: train || null, events: [], completed: false } }

  function run (w, program, opts) {
    opts = opts || {}
    var steps = [], cur = w
    for (var i = 0; i < program.length; i++) {
      var r = step(cur, program[i], opts)
      if (r.status === 'blocked' || r.status === 'question') return { world: cur, steps: steps, done: cur.done, stop: { at: i, reason: r.reason, needQ: r.needQ || null } }
      steps.push(r); cur = r.world
      if (r.completed) return { world: cur, steps: steps, done: true, stop: null }
    }
    return { world: cur, steps: steps, done: cur.done, stop: null }
  }

  /* ── solver: BFS over states (the reference plan every level must have) ─────────────────────────────── */
  function key (w) {
    var s = '', i, t, o
    for (i = 0; i < w.trains.length; i++) {
      t = w.trains[i]; s += t.id + t.r + ',' + t.c + ',' + t.d + ':'
      for (var j = 0; j < t.tail.length; j++) s += t.tail[j][0] + '.' + t.tail[j][1] + ';'
      if (t.kinds.length) s += t.kinds.join(',') + ';'
      for (var k in t.load) if (t.load[k]) s += k + t.load[k] + ';'
      s += '|'
    }
    for (i = 0; i < w.things.length; i++) {
      o = w.things[i]
      s += o.taken ? 'x' : o.gone ? 'g' : o.open ? 'o' : o.on ? 'n' : o.parked ? 'p' + o.r + '.' + o.c : o.count ? 'c' + o.count : '-'
    }
    for (var f in w.flags) if (w.flags[f]) s += f
    if (w.m.maxAfter) s += 'T' + Math.min(w.tick, w.m.maxAfter)
    return s
  }
  function actionsOf (w) {
    var vs = (w.lv.verbs || []).slice()
    var per = w.trains.map(function (t) { return MOVES.concat(vs.filter(function (v) { return v !== 'tunggu' })).concat(['tunggu']).map(function (c) { var a = {}; a[t.id] = c; return a }) })
    var mode = w.lv.mode || 'solo'
    if (mode !== 'both' || w.trains.length < 2) return [].concat.apply([], per)
    var out = []
    per[0].forEach(function (a) { per[1].forEach(function (b) { var o = {}; o[w.trains[0].id] = a[w.trains[0].id]; o[w.trains[1].id] = b[w.trains[1].id]; out.push(o) }) })
    return out
  }
  function solve (w0, opts) {
    opts = opts || {}
    var cap = opts.cap || 400000, maxDepth = opts.maxDepth || 40
    var seen = {}, q = [{ w: w0, p: null, a: null, n: 0 }], head = 0
    seen[key(w0)] = 1
    if (w0.done) return []
    var acts = actionsOf(w0)
    while (head < q.length && head < cap) {
      var cur = q[head++]
      if (cur.n >= maxDepth) continue
      for (var i = 0; i < acts.length; i++) {
        var r = step(cur.w, acts[i], { auto: true })
        if (r.status === 'blocked' || r.status === 'question') continue
        var k = key(r.world)
        if (seen[k]) continue
        seen[k] = 1
        var node = { w: r.world, p: cur, a: acts[i], n: cur.n + 1 }
        if (r.completed) { var out = []; for (var x = node; x.p; x = x.p) out.unshift(x.a); return out }
        q.push(node)
      }
    }
    return null
  }
  function hint (w0, program, opts) {
    // keep the part of the child's program that still runs, then ask the solver for the rest
    var cur = w0, keep = 0
    for (var i = 0; i < program.length; i++) { var r = step(cur, program[i], { auto: true }); if (r.status === 'blocked' || r.status === 'question') break; cur = r.world; keep++ }
    var rest = solve(cur, opts)
    return rest && rest.length ? { at: keep, action: rest[0], steps: rest.length } : null
  }

  /* ── lint + verify ─────────────────────────────────────────────────────────────────────────────────── */
  function lint (lv) {
    var m = model(lv), p = m.problems.slice(), w = world(lv)
    function railNear (r, c) { for (var d = 0; d < 4; d++) { var a = r + DR[d], b = c + DC[d]; if (a >= 0 && b >= 0 && a < m.R && b < m.C && isRail(m.grid[a][b])) return true } return false }
    if (!m.trains.length) p.push('no train')
    ;(lv.trains || []).forEach(function (d, i) { if (!m.trains.some(function (t) { return t.id === d.id })) p.push('train ' + d.id + ' not on the map') })
    w.things.forEach(function (o) {
      if ((o.type === 'cargo' || o.type === 'lever' || o.type === 'stop') && !railNear(o.r, o.c)) p.push(o.type + ' ' + o.id + ' has no rail beside it')
    })
    if (!(lv.goal && lv.goal.length)) p.push('no goal')
    ;(lv.goal || []).forEach(function (g) { if (g.t === 'reach' && !m.pins[g.pin || 'Z']) p.push('goal pin missing') })
    if ((lv.mode === 'both' || lv.mode === 'turns') && m.trains.length < 2) p.push('two-train level with one train')
    w.things.forEach(function (o) { if (o.type === 'lever') o.toggles.forEach(function (gi) { if (!w.things.some(function (x) { return x.id === 'g' + gi })) p.push('lever ' + o.id + ' toggles missing gate ' + gi) }) })
    // rails are one network (gates and critters are passable in the lint: they open)
    var seen = {}, stack = [[m.trains[0] ? m.trains[0].r : 0, m.trains[0] ? m.trains[0].c : 0]], total = 0
    for (var r = 0; r < m.R; r++) for (var c = 0; c < m.C; c++) if (isRail(m.grid[r][c])) total++
    while (stack.length) {
      var x = stack.pop(), kx = x[0] + ',' + x[1]
      if (seen[kx]) continue
      seen[kx] = 1
      for (var d = 0; d < 4; d++) { var a = x[0] + DR[d], b = x[1] + DC[d]; if (a >= 0 && b >= 0 && a < m.R && b < m.C && isRail(m.grid[a][b])) stack.push([a, b]) }
    }
    if (Object.keys(seen).length !== total) p.push('rails are not one connected network (' + Object.keys(seen).length + '/' + total + ')')
    return p
  }
  function verify (lv, opts) {
    opts = opts || {}
    var problems = lint(lv), plan = null
    if (!problems.length) {
      plan = solve(world(lv), opts)
      if (!plan) problems.push('no solution found')
      else if (lv.slots && plan.length > lv.slots) problems.push('shortest plan ' + plan.length + ' > slots ' + lv.slots)
    }
    return { ok: problems.length === 0, problems: problems, plan: plan, slots: lv.slots || null }
  }

  G.KeretaGrid = { parse: parse, model: model, world: world, step: step, run: run, solve: solve, hint: hint, verify: verify, lint: lint, progress: progress,
    complete: complete, MOVES: MOVES, VERBS: VERBS, ALL: ALL, MSG: MSG, LABEL: LABEL, DR: DR, DC: DC, RAIL: RAIL, CARGO: CARGO, isRail: isRail }
})(typeof window !== 'undefined' ? window : globalThis)
