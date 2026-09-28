/* ============================================================================
 * tk-grid.js — window.TKGrid. Timmy & Kapal Legendaris: the signature grid-programming
 * level (PRD v2 §3 `grid`, §6 motion/sound, §7 contract). Vanilla ES5, no build.
 *
 * ENGINE (pure, also module.exports for node — never throws, deterministic):
 *   TKGrid.create(def)            -> normalised level (idempotent)
 *   TKGrid.run(def, program)      -> { ok, steps[], failAt, reason, detail, shortest, moves, stars, endAt }
 *   TKGrid.shortest(def)          -> minimal chip count (-1 = unsolvable)
 *   TKGrid.solve(def)             -> one shortest program (array of chips) or null
 *   TKGrid.validate(def)          -> [{ code, msg }]  ([] = playable)
 *   TKGrid.nextHint(def, program) -> { keep, next[], full[] } | null
 *   TKGrid.stars(moves, shortest) -> 3 | 2 | 1
 * Commands: N/E/S/W gerak satu petak ke arah itu (kapal menghadap ke sana; default untuk anak) ·
 * F maju · L/R belok 90° · P ambil peti di petak ini · D taruh peti di petak tujuan ·
 * R2/R3 ulangi perintah BERIKUTNYA ×2/×3 (a repeat before another repeat is replaced by it;
 * a trailing repeat does nothing). One tick per executed command: after a move the boat may be
 * pushed ONE tile by a current (not if that tile is blocked); moving ice then advances one step
 * along its looping path. The boat may not enter a tile the ice is on, and the ice may not
 * land on the boat. Switch tiles open their gate tiles when the boat touches them.
 * Goal: boat on `goal` with every item delivered to `drop` (or picked, when there is no drop).
 * When there is no goal but a drop, the goal is the drop tile. The run stops as soon as the
 * goal is met, so extra chips after it are not executed (they still count as moves).
 *
 * UI: TKGrid.mount(host, def, opts) -> { el, level, destroy, reset, hint, go, program, setProgram, state, layout }
 *   opts: { onDone({stars, moves, attempts, hints, shortest}), sfx:{click,good,bad,win}, lib(key)->url,
 *           art:{boat, ice, flag, crate, timmy, lighthouse, tipper} (library keys), mission, hint,
 *           topInset (px left free for the host HUD, default 70), bg (false = transparent),
 *           hintButton (false = host drives handle.hint()), starTarget (element stars fly to),
 *           starBase, reducedMotion, muted }
 *   Layout (owner mockups ui-05 / ui-07): landscape = board centre, "Perintah" panel right,
 *   "Rutemu" route bar under the board, Hapus + JALAN! beside it; portrait = board, command
 *   panel, route bar, action row. Stars = 3 at the shortest route, 2 within +2, else 1.
 * CSS is injected once (scoped .tkg-*); the host page only includes this script.
 * ZERO emoji / glyphs / drawn pictograms: every icon is an owner sprite (window.TKIcon) or the CSS arrow.
 * ==========================================================================*/
(function (G) {
  'use strict'

  var DIRS = ['N', 'E', 'S', 'W']
  var DV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
  var CMDS = ['N', 'E', 'S', 'W', 'F', 'L', 'R', 'P', 'D', 'R2', 'R3']
  var REP = { R2: 2, R3: 3 }
  var MAX_ITEMS = 8
  var MAX_SW = 8
  var SEARCH_LIMIT = 40

  /* ── normalisation helpers ─────────────────────────────────────────────── */
  function int (v, d) { v = Math.floor(Number(v)); return isFinite(v) ? v : d }
  function arr (a) { return Object.prototype.toString.call(a) === '[object Array]' ? a : [] }
  function pt (p) { return p && typeof p === 'object' ? { x: int(p.x, -1), y: int(p.y, -1) } : null }
  function dirOf (d) { d = String(d || 'E').toUpperCase(); return DV[d] ? d : 'E' }
  function str (v) { return v == null ? '' : String(v) }
  function gcd (a, b) { while (b) { var t = b; b = a % b; a = t } return a }
  function isCmd (c) { return CMDS.indexOf(c) >= 0 }

  function create (def) {
    if (def && def.__tkg) return def
    def = def && typeof def === 'object' ? def : {}
    var w = Math.max(1, Math.min(16, int(def.w, 5)))
    var h = Math.max(1, Math.min(16, int(def.h, 5)))
    var sp = pt(def.start) || { x: 0, y: 0 }
    var L = {
      __tkg: true, id: str(def.id), title: str(def.title), mission: str(def.mission), hint: str(def.hint),
      w: w, h: h,
      start: { x: sp.x, y: sp.y, dir: dirOf(def.start && def.start.dir) },
      goal: pt(def.goal),
      blocks: arr(def.blocks).map(pt).filter(Boolean),
      items: arr(def.items).slice(0, MAX_ITEMS).map(function (it, i) {
        var p = pt(it); return p && { x: p.x, y: p.y, id: it.id != null ? String(it.id) : 'item' + i }
      }).filter(Boolean),
      drop: pt(def.drop),
      currents: arr(def.currents).map(function (c) {
        var p = pt(c); return p && { x: p.x, y: p.y, dir: dirOf(c.dir) }
      }).filter(Boolean),
      ice: arr(def.ice).map(function (o) {
        if (!o || typeof o !== 'object') return null
        var path = arr(o.path).map(pt).filter(Boolean)
        if (!path.length) { var p = pt(o); if (p && p.x >= 0) path = [p] }
        return path.length ? { path: path } : null
      }).filter(Boolean),
      switches: arr(def.switches).slice(0, MAX_SW).map(function (s) {
        var p = pt(s); return p && { x: p.x, y: p.y, opens: arr(s.opens).map(pt).filter(Boolean) }
      }).filter(Boolean)
    }
    if (!L.goal && L.drop) L.goal = { x: L.drop.x, y: L.drop.y }
    var tools = []
    arr(def.tools).forEach(function (c) { c = String(c); if (isCmd(c) && tools.indexOf(c) < 0) tools.push(c) })
    if (!tools.length) {
      tools = ['N', 'E', 'S', 'W']
      if (L.items.length) { tools.push('P'); if (L.drop) tools.push('D') }
    }
    L.tools = CMDS.filter(function (c) { return tools.indexOf(c) >= 0 })
    index(L)
    L.shortest = -1
    var sol = null
    try { sol = search(L, startState(L), SEARCH_LIMIT) } catch (e) { sol = null }
    L.solution = sol
    L.shortest = sol ? sol.length : -1
    var ml = int(def.maxLen, 0)
    L.maxLen = ml > 0 ? Math.min(24, ml) : (L.shortest > 0 ? Math.max(8, Math.min(16, L.shortest + 4)) : 12)
    return L
  }

  function index (L) {
    var K = function (p) { return p.y * L.w + p.x }
    L._blk = {}; L._cur = {}; L._sw = {}; L._gate = {}; L._item = {}
    L.blocks.forEach(function (b) { L._blk[K(b)] = 1 })
    L.currents.forEach(function (c) { L._cur[K(c)] = c.dir })
    L.switches.forEach(function (s, j) {
      L._sw[K(s)] = j
      s.opens.forEach(function (g) { var k = K(g); (L._gate[k] = L._gate[k] || []).push(j) })
    })
    L.items.forEach(function (it, i) { var k = K(it); (L._item[k] = L._item[k] || []).push(i) })
    var T = 1
    for (var i = 0; i < L.ice.length && T; i++) {
      var n = L.ice[i].path.length
      T = T / gcd(T, n) * n
      if (T > 240) T = 0
    }
    L._T = T
  }

  /* ── simulation ────────────────────────────────────────────────────────── */
  function startState (L) { return { x: L.start.x, y: L.start.y, dir: L.start.dir, t: 0, pk: 0, dl: 0, sw: 0 } }
  function inside (L, x, y) { return x >= 0 && y >= 0 && x < L.w && y < L.h }
  function blocked (L, x, y, sw) {
    var k = y * L.w + x
    if (!L._blk[k] && !L._gate[k]) return false
    var g = L._gate[k]
    if (g) for (var i = 0; i < g.length; i++) if (sw & (1 << g[i])) return false
    return true
  }
  function iceAt (L, i, t) { var p = L.ice[i].path; return p[t % p.length] }
  function iceHit (L, x, y, t) {
    for (var i = 0; i < L.ice.length; i++) { var p = iceAt(L, i, t); if (p.x === x && p.y === y) return i }
    return -1
  }
  function icePositions (L, t) {
    var out = []
    for (var i = 0; i < L.ice.length; i++) { var p = iceAt(L, i, t); out.push({ x: p.x, y: p.y }) }
    return out
  }
  function press (L, x, y, sw) { var j = L._sw[y * L.w + x]; return j == null ? sw : (sw | (1 << j)) }
  function allMask (L) { return (1 << L.items.length) - 1 }
  function isDone (L, s) {
    if (!L.goal || s.x !== L.goal.x || s.y !== L.goal.y) return false
    if (!L.items.length) return true
    return L.drop ? s.dl === allMask(L) : s.pk === allMask(L)
  }
  function bits (m) { var n = 0; while (m) { n += m & 1; m >>>= 1 } return n }

  // one atomic command. Returns { s, event, fail:{reason,detail}|null, done, via, toward, ice, item, items, opened, after }
  function exec (L, s, c) {
    var n = { x: s.x, y: s.y, dir: s.dir, t: s.t, pk: s.pk, dl: s.dl, sw: s.sw }
    var r = { s: n, event: 'turn', fail: null, done: false }
    function fail (reason, detail) { r.s = s; r.event = 'bump'; r.fail = { reason: reason, detail: detail || null }; return r }
    if (c === 'F' || DV[c]) {
      var md = c === 'F' ? s.dir : c, d = DV[md], nx = s.x + d[0], ny = s.y + d[1]
      r.toward = { x: nx, y: ny }; r.face = md
      if (!inside(L, nx, ny)) return fail('edge')
      if (blocked(L, nx, ny, s.sw)) return fail('block')
      var hi = iceHit(L, nx, ny, s.t)
      if (hi >= 0) { r.ice = hi; return fail('ice') }
      n.x = nx; n.y = ny; n.dir = md; r.event = 'move'
      var sw0 = n.sw
      n.sw = press(L, nx, ny, n.sw)
      var cd = L._cur[ny * L.w + nx]
      if (cd) {
        var e = DV[cd], px = nx + e[0], py = ny + e[1]
        if (inside(L, px, py) && !blocked(L, px, py, n.sw) && iceHit(L, px, py, s.t) < 0) {
          r.via = { x: nx, y: ny }; n.x = px; n.y = py; r.event = 'current'
          n.sw = press(L, px, py, n.sw)
        } else r.stuck = true
      }
      if (n.sw !== sw0) r.opened = n.sw & ~sw0
    } else if (c === 'L' || c === 'R') {
      n.dir = DIRS[(DIRS.indexOf(s.dir) + (c === 'L' ? 3 : 1)) % 4]
    } else if (c === 'P') {
      var list = L._item[s.y * L.w + s.x], got = -1
      if (list) for (var i = 0; i < list.length; i++) if (!(s.pk & (1 << list[i]))) { got = list[i]; break }
      if (got < 0) return fail('noItem', 'none')
      n.pk = s.pk | (1 << got); r.event = 'pick'; r.item = got
    } else if (c === 'D') {
      var carry = s.pk & ~s.dl
      if (!carry) return fail('noItem', 'empty')
      if (!L.drop || L.drop.x !== s.x || L.drop.y !== s.y) return fail('wrongDrop')
      n.dl = s.dl | carry; r.event = 'drop'; r.items = carry
    } else return fail('unknown')
    n.t = s.t + 1
    var hit = iceHit(L, n.x, n.y, n.t)
    if (hit >= 0) { r.after = true; r.ice = hit; r.fail = { reason: 'ice', detail: 'moving' }; return r }
    r.done = isDone(L, n)
    return r
  }

  function stars (moves, shortest) {
    if (!(shortest > 0) || moves <= shortest) return 3
    return moves <= shortest + 2 ? 2 : 1
  }

  function snap (L, r, c, i, repIdx, k, prev) {
    var s = r.s, st = {
      cmd: c, idx: i, rep: repIdx, k: k, x: s.x, y: s.y, dir: s.dir, t: s.t, event: r.event,
      from: { x: prev.x, y: prev.y, dir: prev.dir }, ice: icePositions(L, s.t),
      carry: bits(s.pk & ~s.dl), picked: s.pk, delivered: s.dl, sw: s.sw
    }
    if (r.via) st.via = r.via
    if (r.toward) st.toward = r.toward
    if (r.item != null) st.item = r.item
    if (r.items) st.items = r.items
    if (r.opened) st.opened = r.opened
    if (r.stuck) st.stuck = true
    if (r.face) st.face = r.face
    return st
  }

  function run (def, program) {
    var out = { ok: false, steps: [], failAt: null, reason: null, detail: null, shortest: -1, moves: 0, stars: 0, endAt: null }
    try {
      var L = create(def)
      out.shortest = L.shortest
      var prog = arr(program).map(String)
      out.moves = prog.length
      var s = startState(L)
      if (isDone(L, s)) { out.ok = true; out.stars = stars(out.moves, L.shortest); return out }
      var rep = 1, repIdx = null
      for (var i = 0; i < prog.length; i++) {
        var c = prog[i]
        if (REP[c]) { rep = REP[c]; repIdx = i; continue }
        if (!isCmd(c)) { rep = 1; repIdx = null; continue }
        for (var k = 0; k < rep; k++) {
          var r = exec(L, s, c)
          if (r.fail && r.after) {
            // the command itself happened; then the moving ice reached the boat
            // both steps draw the ice where it was, so it nudges toward the boat instead of covering it
            var mvStep = snap(L, r, c, i, repIdx, k, s)
            mvStep.ice = icePositions(L, s.t)
            out.steps.push(mvStep)
            var b = snap(L, { s: r.s, event: 'bump' }, c, i, repIdx, k, r.s)
            b.ice = icePositions(L, s.t)
            b.reason = 'ice'; b.iceIdx = r.ice; b.toward = icePositions(L, r.s.t)[r.ice]
            out.steps.push(b)
          } else if (r.fail) {
            var f = snap(L, r, c, i, repIdx, k, s)
            f.reason = r.fail.reason
            if (r.ice != null) f.iceIdx = r.ice
            out.steps.push(f)
          } else out.steps.push(snap(L, r, c, i, repIdx, k, s))
          if (r.fail) { out.failAt = i; out.reason = r.fail.reason; out.detail = r.fail.detail; return out }
          s = r.s
          if (r.done) { out.ok = true; out.endAt = i; out.stars = stars(out.moves, L.shortest); return out }
        }
        rep = 1; repIdx = null
      }
      out.reason = 'notAtGoal'
      out.detail = (L.goal && s.x === L.goal.x && s.y === L.goal.y) ? 'items' : (L.items.length && (L.drop ? s.dl : s.pk) !== allMask(L) ? 'itemsFar' : 'far')
    } catch (e) { out.ok = false; out.reason = 'invalid'; out.detail = String(e && e.message) }
    return out
  }

  /* ── search: Dial's algorithm (costs 1 and 2) over (pos, dir, ice phase, items, switches) ── */
  function macros (L) {
    var base = L.tools.filter(function (c) { return !REP[c] }), out = []
    base.forEach(function (c) { out.push({ toks: [c], c: c, n: 1 }) })
    L.tools.forEach(function (rt) { if (REP[rt]) base.forEach(function (c) { out.push({ toks: [rt, c], c: c, n: REP[rt] }) }) })
    return out
  }
  function key (L, s) {
    var t = L._T ? s.t % L._T : Math.min(s.t, 400)
    return s.x + ',' + s.y + ',' + s.dir + ',' + t + ',' + s.pk + ',' + s.dl + ',' + s.sw
  }
  function search (L, s0, limit) {
    if (isDone(L, s0)) return []
    limit = limit || SEARCH_LIMIT
    var M = macros(L), buckets = [], best = {}, k0 = key(L, s0)
    best[k0] = 0
    buckets[0] = [{ s: s0, k: k0, p: null, m: null }]
    for (var cost = 0; cost <= limit; cost++) {
      var b = buckets[cost]
      if (!b) continue
      for (var bi = 0; bi < b.length; bi++) {
        var node = b[bi]
        if (node.goal) return rebuild(node)
        if (best[node.k] < cost) continue
        for (var mi = 0; mi < M.length; mi++) {
          var m = M[mi], s = node.s, ok = true, reached = false
          for (var r = 0; r < m.n; r++) {
            var x = exec(L, s, m.c)
            if (x.fail) { ok = false; break }
            s = x.s
            if (x.done) { reached = true; break }
          }
          if (!ok) continue
          var nc = cost + m.toks.length
          if (nc > limit) continue
          var nn = { s: s, p: node, m: m }
          if (reached) { nn.goal = true; (buckets[nc] = buckets[nc] || []).push(nn); continue }
          var nk = key(L, s)
          if (best[nk] != null && best[nk] <= nc) continue
          best[nk] = nc; nn.k = nk
          ;(buckets[nc] = buckets[nc] || []).push(nn)
        }
      }
    }
    return null
  }
  function rebuild (node) {
    var parts = []
    for (var n = node; n && n.m; n = n.p) parts.unshift(n.m.toks)
    return [].concat.apply([], parts)
  }

  function solve (def) {
    try { var L = create(def); return L.solution ? L.solution.slice() : null } catch (e) { return null }
  }
  function shortest (def) {
    try { return create(def).shortest } catch (e) { return -1 }
  }

  // where the child's program stops being useful, and what to add next
  function nextHint (def, program) {
    try {
      var L = create(def), prog = arr(program).map(String)
      var res = run(L, prog)
      if (res.ok) return null
      var keep = res.failAt != null ? res.failAt : prog.length
      if (res.failAt != null && keep > 0 && REP[prog[keep - 1]]) keep--
      while (keep > 0 && REP[prog[keep - 1]]) keep--
      var prefix = prog.slice(0, keep)
      var pre = run(L, prefix), s = startState(L)
      if (!pre.ok && pre.failAt == null && pre.steps.length) {
        var last = pre.steps[pre.steps.length - 1]
        s = { x: last.x, y: last.y, dir: last.dir, t: last.t, pk: last.picked, dl: last.delivered, sw: last.sw }
      }
      var rest = (pre.failAt == null) ? search(L, s, SEARCH_LIMIT) : null
      if (!rest || !rest.length || keep + rest.length > L.maxLen) {
        if (!L.solution) return null
        keep = 0; prefix = []; rest = L.solution.slice()
      }
      var next = REP[rest[0]] ? rest.slice(0, 2) : rest.slice(0, 1)
      return { keep: keep, next: next, full: prefix.concat(rest) }
    } catch (e) { return null }
  }

  function validate (def) {
    var P = [], add = function (code, msg) { P.push({ code: code, msg: msg }) }
    var L
    try { L = create(def) } catch (e) { return [{ code: 'invalid', msg: String(e && e.message) }] }
    var on = function (p) { return p && inside(L, p.x, p.y) }
    var solid = function (p) { return L._blk[p.y * L.w + p.x] || L._gate[p.y * L.w + p.x] }
    if (L.w * L.h < 2) add('size', 'papan terlalu kecil')
    if (!on(L.start)) add('startOutside', 'start di luar papan')
    else if (solid(L.start)) add('startOnBlock', 'start di atas es')
    if (!L.goal) add('noGoal', 'tidak ada tujuan')
    else if (!on(L.goal)) add('goalOutside', 'tujuan di luar papan')
    else if (L._blk[L.goal.y * L.w + L.goal.x]) add('goalOnBlock', 'tujuan di atas es')
    if (L.goal && on(L.goal) && L.start.x === L.goal.x && L.start.y === L.goal.y && !L.items.length) add('startIsGoal', 'start sama dengan tujuan')
    if (L.drop && !on(L.drop)) add('dropOutside', 'tempat taruh di luar papan')
    if (L.drop && on(L.drop) && L._blk[L.drop.y * L.w + L.drop.x]) add('dropOnBlock', 'tempat taruh di atas es')
    L.items.forEach(function (it, i) {
      if (!on(it)) add('itemOutside', 'peti ' + i + ' di luar papan')
      else if (solid(it)) add('itemOnBlock', 'peti ' + i + ' di atas es')
    })
    L.currents.forEach(function (c, i) {
      if (!on(c)) add('currentOutside', 'arus ' + i + ' di luar papan')
      else if (solid(c)) add('currentOnBlock', 'arus ' + i + ' di atas es')
    })
    L.switches.forEach(function (s, i) {
      if (!on(s)) add('switchOutside', 'tombol ' + i + ' di luar papan')
      s.opens.forEach(function (g) { if (!on(g)) add('gateOutside', 'gerbang tombol ' + i + ' di luar papan') })
    })
    L.ice.forEach(function (o, i) {
      o.path.forEach(function (p, j) {
        if (!on(p)) add('iceOutside', 'es ' + i + ' keluar papan')
        else if (solid(p)) add('iceOnBlock', 'es ' + i + ' menembus es diam')
        var q = o.path[(j + 1) % o.path.length]
        if (Math.abs(q.x - p.x) + Math.abs(q.y - p.y) > 1) add('iceJump', 'es ' + i + ' melompat di langkah ' + j)
      })
    })
    if (on(L.start) && iceHit(L, L.start.x, L.start.y, 0) >= 0) add('iceOnStart', 'es di atas start')
    if (!L.tools.filter(function (c) { return c === 'F' || DV[c] }).length) add('noForward', 'tidak ada perintah bergerak')
    if (L.items.length && L.tools.indexOf('P') < 0) add('noPick', 'ada peti tapi tidak ada AMBIL')
    if (L.items.length && L.drop && L.tools.indexOf('D') < 0) add('noDrop', 'ada tempat taruh tapi tidak ada TARUH')
    if (!P.length) {
      if (L.shortest < 0) add('unsolvable', 'tidak ada jalan ke tujuan')
      else if (L.shortest > L.maxLen) add('tooLong', 'jalan terpendek ' + L.shortest + ' > maxLen ' + L.maxLen)
    }
    return P
  }

  /* ── authored tutorial ladder (absolute arrows: the kids' default) ────── */
  var ARROWS = ['N', 'E', 'S', 'W']
  var SAMPLES = [
    { id: 'tut1', title: 'Lurus ke Bendera', mission: 'Bawa kapal lurus ke bendera!', hint: 'Ketuk panah, lalu tekan JALAN!',
      w: 5, h: 3, start: { x: 0, y: 1, dir: 'E' }, goal: { x: 4, y: 1 }, blocks: [{ x: 2, y: 0 }, { x: 2, y: 2 }], tools: ARROWS },
    { id: 'tut2', title: 'Satu Belokan', mission: 'Naik dulu, lalu ke kanan menuju bendera.', hint: 'Pakai panah atas dan panah kanan.',
      w: 4, h: 3, start: { x: 0, y: 2, dir: 'N' }, goal: { x: 3, y: 0 }, blocks: [{ x: 2, y: 2 }], tools: ARROWS },
    { id: 'tut3', title: 'Hindari Gunung Es', mission: 'Cari jalan memutari gunung es.', hint: 'Pikirkan dulu jalannya. Gunung es menghalangi kapal.',
      w: 5, h: 4, start: { x: 0, y: 1, dir: 'E' }, goal: { x: 4, y: 1 },
      blocks: [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 3 }], tools: ARROWS },
    { id: 'tut4', title: 'Ikut Arus', mission: 'Arus laut mendorong kapal. Pakai arusnya!', hint: 'Petak berpanah mendorong kapal satu petak.',
      w: 5, h: 3, start: { x: 0, y: 0, dir: 'E' }, goal: { x: 4, y: 1 },
      blocks: [{ x: 3, y: 0 }, { x: 1, y: 2 }], currents: [{ x: 2, y: 0, dir: 'S' }], tools: ARROWS },
    { id: 'tut5', title: 'Antar Peti', mission: 'Ambil peti, lalu taruh di tanda kuning.', hint: 'Ambil di atas peti, Taruh di tanda kuning.',
      w: 5, h: 3, start: { x: 0, y: 1, dir: 'E' }, items: [{ x: 2, y: 1, id: 'peti' }], drop: { x: 4, y: 2 },
      blocks: [{ x: 3, y: 2 }], tools: ['N', 'E', 'S', 'W', 'P', 'D'] },
    { id: 'tut6', title: 'Ulangi!', mission: 'Ulangi membuat perintah berikutnya dijalankan lagi.', hint: 'Ulangi 3 kali, lalu panah kanan: tiga langkah ke kanan.',
      w: 7, h: 3, start: { x: 0, y: 2, dir: 'E' }, goal: { x: 6, y: 0 }, blocks: [{ x: 3, y: 1 }, { x: 5, y: 1 }],
      tools: ['N', 'E', 'S', 'W', 'R2', 'R3'] }
  ]

  var TKGrid = {
    create: create, run: run, shortest: shortest, solve: solve, validate: validate,
    nextHint: nextHint, stars: stars, SAMPLES: SAMPLES, CMDS: CMDS.slice(), version: '1.0.0'
  }

  /* ===================================================================== UI */
  var EASE = 'cubic-bezier(.23,1,.32,1)'
  var STEP_MS = 450
  var ART = { boat: 'vehicles/sailboat', ice: 'game/crystal-ice', flag: 'game/flag-red', crate: 'game/crate-wood',
    timmy: 'sd/explorer', lighthouse: 'gt-el/lighthouse', tipper: 'animals/penguin' }
  var LABEL = { N: 'Ke atas', E: 'Ke kanan', S: 'Ke bawah', W: 'Ke kiri', F: 'Maju', L: 'Belok kiri', R: 'Belok kanan',
    P: 'Ambil', D: 'Taruh', R2: 'Ulangi 2 kali', R3: 'Ulangi 3 kali' }
  var SHORT = { F: 'Maju', L: 'Kiri', R: 'Kanan', P: 'Ambil', D: 'Taruh', R2: 'Ulangi', R3: 'Ulangi' }
  var SAY = {
    block: 'Ups, ada es di depan! Ubah perintah nomor {n}.',
    edge: 'Ups, itu ujung laut! Ubah perintah nomor {n}.',
    ice: 'Ups, es yang bergerak menghalangi kapal! Ubah perintah nomor {n}.',
    none: 'Tidak ada peti di sini. Ubah perintah nomor {n}.',
    empty: 'Kapal belum membawa peti. Ubah perintah nomor {n}.',
    wrongDrop: 'Peti ditaruh di tanda kuning, ya. Ubah perintah nomor {n}.',
    far: 'Kapal belum sampai di bendera. Tambah atau ubah perintahnya!',
    items: 'Petinya belum diantar. Ambil peti, lalu taruh di tanda kuning!',
    itemsFar: 'Jangan lupa: ambil peti dulu, lalu antar ke tujuan!',
    noProg: 'Pilih perintah dulu, lalu tekan JALAN!',
    full: 'Rutenya sudah penuh. Ketuk perintah untuk menghapus.',
    win: 'Hebat! Kapal sampai tujuan!',
    hint1: 'Lihat tujuan yang bersinar! Coba perintah {c}.',
    hint2: 'Timmy isi satu perintah. Ayo lanjutkan!',
    hint3: 'Ikuti titik-titik ini sampai tujuan!'
  }

  // Icons: owner sprites via window.TKIcon (ICONS table in timmy-kapal.js); direction commands are a
  // pure-CSS arrow (.tkg-arw) because no sprite rotates cleanly. No glyphs, no drawn pictograms.
  function ic (n, cls) { return G.TKIcon ? G.TKIcon(n, cls) : '' }
  function wrapIc (inner, cls) { return '<span class="tkg-ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + inner + '</span>' }
  function arw (dir, cls) { return '<i class="tkg-arw tkg-arw-' + dir + (cls ? ' ' + cls : '') + '"></i>' }
  function icon (c) {
    if (DV[c]) return wrapIc(arw(c))
    if (c === 'F') return wrapIc(arw('N'))
    if (c === 'L' || c === 'R') return wrapIc(ic('turn') + arw(c === 'L' ? 'W' : 'E', 'tkg-mini'))
    if (c === 'P' || c === 'D') return wrapIc(ic('crate') + arw(c === 'P' ? 'N' : 'S', 'tkg-mini'))
    if (REP[c]) return wrapIc(ic('repeat'))
    return wrapIc('')
  }

  var WAVE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40'%3E%3Cpath d='M0 20q10-7 20 0t20 0 20 0 20 0' fill='none' stroke='%23bfe3ff' stroke-opacity='.18' stroke-width='2'/%3E%3Cpath d='M-10 36q10-5 20 0t20 0 20 0 20 0 20 0' fill='none' stroke='%23bfe3ff' stroke-opacity='.1' stroke-width='2'/%3E%3C/svg%3E\")"

  var PANEL = 'background:linear-gradient(180deg,rgba(24,60,120,.94),rgba(11,34,78,.94));border:2px solid rgba(120,180,255,.42);border-radius:18px;box-shadow:0 6px 18px rgba(0,10,40,.35),inset 0 1px 0 rgba(255,255,255,.12)'
  var CSS = [
    '.tkg{--e:' + EASE + ';--t:56px;--bw:72px;--bh:58px;--slot:56px;--top:70px;position:relative;width:100%;height:100%;min-height:0;overflow:hidden;box-sizing:border-box;',
    'font-family:"Nunito","Baloo 2",system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '.tkg--bg{background:radial-gradient(120% 70% at 50% 0%,#1d4f8f 0%,#0f2f63 55%,#0a1f45 100%)}',
    '.tkg *,.tkg *:before,.tkg *:after{box-sizing:border-box}',
    '.tkg-body{position:absolute;left:0;right:0;bottom:0;top:var(--top);display:grid;gap:8px;padding:8px;padding-bottom:max(8px,env(safe-area-inset-bottom));',
    'grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto auto auto;grid-template-areas:"sea" "cmd" "route" "act"}',
    '.tkg--land .tkg-body{grid-template-columns:minmax(0,1fr) var(--cmdw);grid-template-rows:minmax(0,1fr) auto;grid-template-areas:"sea cmd" "route act"}',
    '.tkg-sea{grid-area:sea;position:relative;min-height:0;min-width:0;display:flex;align-items:center;justify-content:center}',
    '.tkg-cmd{grid-area:cmd;' + PANEL + ';padding:6px 8px 8px;display:flex;flex-direction:column;gap:6px;min-height:0;overflow:hidden}',
    '.tkg-route{grid-area:route;' + PANEL + ';padding:6px 8px 8px;min-width:0}',
    '.tkg-act{grid-area:act;display:flex;gap:8px;align-items:center}',
    '.tkg--land .tkg-act{align-self:end}',
    '.tkg-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:900;font-size:16px;line-height:1.1;text-shadow:0 1px 0 rgba(0,0,0,.35);padding:0 2px}',
    '.tkg-cmd .tkg-h{justify-content:center}',
    '.tkg-h small{font-size:13px;font-weight:800;opacity:.85}',
    '.tkg-count{display:inline-flex;align-items:center;gap:3px;padding:2px 10px 2px 6px;border-radius:999px;background:rgba(0,0,0,.28);font-size:16px;font-weight:900}',
    '.tkg-ic{position:relative;display:inline-grid;place-items:center;flex:0 0 auto}.tkg-ic img{width:100%;height:100%;object-fit:contain;pointer-events:none}',
    '.tkg-arw{display:block;width:70%;height:78%;background:linear-gradient(#fff3a6,#ffc93a);clip-path:polygon(50% 0,100% 48%,68% 48%,68% 100%,32% 100%,32% 48%,0 48%);filter:drop-shadow(0 1px 0 rgba(0,0,0,.35))}',
    '.tkg-arw-E{transform:rotate(90deg)}.tkg-arw-S{transform:rotate(180deg)}.tkg-arw-W{transform:rotate(270deg)}',
    '.tkg-arw.tkg-mini{position:absolute;right:-6%;bottom:-4%;width:52%;height:56%;background:linear-gradient(#b7ff9e,#35c26b)}',
    '.tkg-hdarw{width:100%;height:100%;background:linear-gradient(#fff3a6,#ffd84a);clip-path:polygon(50% 0,100% 100%,0 100%)}',
    '.tkg-bars{width:84%;height:84%;border-radius:4px;background:repeating-linear-gradient(90deg,#c08a4b 0 5px,transparent 5px 11px),linear-gradient(transparent 30%,#c08a4b 30% 38%,transparent 38% 62%,#c08a4b 62% 70%,transparent 70%)}',
    '.tkg-sw.on .tkg-ic img{filter:drop-shadow(0 0 6px #35c26b) drop-shadow(0 0 2px #35c26b)}',
    '.tkg-count .tkg-ic{width:20px;height:20px;color:#ffc93a;stroke:#b67a00;stroke-width:1.2}',
    '.tkg-board{position:relative;border-radius:14px;overflow:hidden;background:radial-gradient(120% 90% at 30% 20%,#1f65ad 0%,#154b8a 45%,#0c3068 100%);',
    'box-shadow:0 0 0 2px rgba(150,205,255,.55),0 0 22px rgba(90,170,255,.35),0 8px 20px rgba(0,10,40,.4)}',
    '.tkg-wv{position:absolute;top:0;bottom:0;left:-80px;width:calc(100% + 160px);background-image:' + WAVE + ';background-size:80px 40px;animation:tkg-wave 7s linear infinite;pointer-events:none}',
    '.tkg-wv2{opacity:.7;background-size:80px 34px;animation-duration:11s;animation-direction:reverse;top:12px}',
    '.tkg-grid{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(200,230,255,.3) 1.5px,transparent 1.5px),linear-gradient(90deg,rgba(200,230,255,.3) 1.5px,transparent 1.5px);background-size:var(--t) var(--t);background-position:-.75px -.75px}',
    '.tkg-rose{position:absolute;width:56px;height:56px;color:#e8f4ff;opacity:.8;pointer-events:none;display:none}',
    '.tkg-rose .tkg-ic{width:100%;height:100%}',
    '.tkg-rose b{position:absolute;font-size:11px;font-weight:900;line-height:1;color:#e8f4ff}',
    '.tkg-o{position:absolute;left:0;top:0;width:var(--t);height:var(--t);display:flex;align-items:center;justify-content:center;pointer-events:none}',
    '.tkg-o img{width:86%;height:86%;object-fit:contain;-webkit-user-drag:none;pointer-events:none}',
    '.tkg-mv{transition:transform 380ms var(--e),opacity 200ms linear}',
    '.tkg-noanim,.tkg-noanim *{transition:none!important}',
    '.tkg-blk img{width:94%;height:94%;filter:drop-shadow(0 3px 2px rgba(0,20,60,.45))}',
    '.tkg-start:before{content:"";position:absolute;inset:5%;border-radius:8px;border:3px solid #ffc93a;box-shadow:0 0 10px rgba(255,201,58,.55)}',
    '.tkg-imv img{width:82%;height:82%;filter:saturate(1.3) brightness(1.1) drop-shadow(0 3px 2px rgba(0,20,60,.45))}',
    '.tkg-imv:before{content:"";position:absolute;inset:8%;border-radius:50%;border:3px dashed rgba(220,240,255,.8);animation:tkg-spin 6s linear infinite}',
    '.tkg-idot{position:absolute;left:0;top:0;width:var(--t);height:var(--t);pointer-events:none}',
    '.tkg-idot:after{content:"";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:rgba(220,245,255,.5)}',
    '.tkg-cur{background:rgba(120,230,255,.22);border-radius:10px;overflow:hidden;box-shadow:inset 0 0 0 2px rgba(150,240,255,.35)}',
    '.tkg-cur i{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}',
    '.tkg-cur .tkg-ic{width:66%;height:66%;color:#f2feff;stroke-width:3.4;filter:drop-shadow(0 1px 1px rgba(0,30,70,.6));animation:tkg-flow 1.6s ease-in-out infinite alternate}',
    '.tkg-drop:before{content:"";position:absolute;inset:8%;border-radius:10px;border:3px dashed #ffd84a;background:rgba(255,216,74,.16)}',
    '.tkg-drop .tkg-ic{position:relative;width:46%;height:46%;color:#fff1a8}',
    '.tkg-goal:before{content:"";position:absolute;inset:4%;border-radius:8px;background:rgba(70,210,110,.38);border:3px solid #6dff95;box-shadow:0 0 14px rgba(90,255,140,.7),inset 0 0 12px rgba(90,255,140,.45)}',
    '.tkg-goal .lh{position:absolute;left:4%;bottom:10%;width:52%;height:78%;object-fit:contain}',
    '.tkg-goal .fl{position:absolute;right:4%;bottom:12%;width:52%;height:62%;object-fit:contain}',
    '.tkg-glow:after{content:"";position:absolute;inset:-6%;border-radius:12px;border:4px solid #ffd84a;animation:tkg-ring 1s var(--e) infinite}',
    '.tkg-sw .tkg-ic{width:62%;height:62%;color:#ffb020;stroke:#8a5a00;stroke-width:1.2}',
    '.tkg-sw.on .tkg-ic{color:#35c26b}',
    '.tkg-gate .tkg-ic{width:84%;height:84%;color:#c08a4b;stroke-width:3}',
    '.tkg-gate{transition:opacity 300ms linear,transform 300ms var(--e)}',
    '.tkg-gate.open{opacity:0;transform:scale(.8)}',
    '.tkg-item{z-index:3}',
    '.tkg-item.gone{opacity:0}',
    '.tkg-item.dl img{width:62%;height:62%}',
    '.tkg-boat{z-index:5;transition:transform 400ms var(--e),opacity 140ms linear}',
    '.tkg-bump,.tkg-bob{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}',
    '.tkg-bob{animation:tkg-bob 2.6s ease-in-out infinite}',
    '.tkg-boat img{width:84%;height:84%;transition:transform 260ms var(--e);filter:drop-shadow(0 3px 2px rgba(0,20,60,.5))}',
    '.tkg-boat[data-face=W] img{transform:scaleX(-1)}',
    '.tkg-hd{position:absolute;inset:-16%;transition:transform 300ms var(--e)}',
    '.tkg-hd .tkg-ic{position:absolute;left:50%;top:0;width:30%;height:30%;margin-left:-15%}',
    '.tkg-carry{position:absolute;right:-2%;bottom:2%;width:40%;height:40%;opacity:0;transform:scale(.6);transition:opacity 200ms linear,transform 260ms var(--e)}',
    '.tkg-carry.on{opacity:1;transform:none}',
    '.tkg-carry img{width:100%;height:100%}',
    '.tkg-fx{position:absolute;left:0;top:0;width:var(--t);height:var(--t);pointer-events:none;z-index:4}',
    '.tkg-wake:before,.tkg-wake:after{content:"";position:absolute;inset:22% 12%;border-radius:50%;border:3px solid rgba(220,240,255,.8);animation:tkg-wake 800ms var(--e) forwards}',
    '.tkg-wake:after{animation-delay:120ms}',
    '.tkg-ring:before{content:"";position:absolute;inset:0;border-radius:50%;border:4px solid #fff;animation:tkg-splash 900ms var(--e) forwards}',
    '.tkg-drop-fx{position:absolute;left:50%;top:50%;width:12px;height:12px;margin:-6px;border-radius:50%;background:#eafaff}',
    '.tkg-gh{position:absolute;left:0;top:0;width:var(--t);height:var(--t);display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2;opacity:0;transition:opacity 260ms linear}',
    '.tkg-gh.on{opacity:1}',
    '.tkg-gh b{width:40%;height:40%;min-width:22px;min-height:22px;border-radius:50%;background:#ffd84a;color:#0b2a55;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(255,255,255,.85)}',
    '.tkg-bubble{position:absolute;left:6px;right:6px;bottom:6px;margin:0 auto;max-width:440px;display:flex;align-items:center;gap:10px;background:#fff;color:#12314f;border-radius:18px;padding:8px 14px 8px 8px;',
    'box-shadow:0 8px 22px rgba(0,10,40,.4);font-size:16px;line-height:1.25;font-weight:800;opacity:0;transform:translateY(10px);transition:opacity 180ms linear,transform 260ms var(--e);pointer-events:none;z-index:20}',
    '.tkg-bubble.top{top:6px;bottom:auto;transform:translateY(-10px)}',
    '.tkg-bubble.on{opacity:1;transform:none}',
    '.tkg-bubble.bad{box-shadow:0 8px 22px rgba(0,10,40,.4),inset 5px 0 0 #ff9f1c}',
    '.tkg-bubble.good{box-shadow:0 8px 22px rgba(0,10,40,.4),inset 5px 0 0 #2fbf71}',
    '.tkg-bubble img{width:46px;height:46px;flex:0 0 auto;border-radius:50%;object-fit:cover;object-position:50% 6%;background:#dff1ff}',
    '.tkg-bubble em{display:block;font-style:normal;font-size:12px;font-weight:900;color:#1d5fc0}',
    '.tkg-win{position:absolute;left:50%;top:50%;z-index:25;display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 22px;border-radius:22px;background:#fff;color:#12314f;',
    'box-shadow:0 12px 30px rgba(0,10,40,.45);opacity:0;transform:translate(-50%,-50%) scale(.92);transition:opacity 200ms linear,transform 320ms var(--e);pointer-events:none}',
    '.tkg-win.on{opacity:1;transform:translate(-50%,-50%) scale(1)}',
    '.tkg-win b{font-size:28px;font-weight:900;color:#1f8f4e}',
    '.tkg-win div{display:flex;gap:6px}',
    '.tkg-win .tkg-ic{width:40px;height:40px;color:#dfe8f0;stroke:#c3d0dc;stroke-width:1.2}',
    '.tkg-win .tkg-ic.got{color:#ffc93a;stroke:#e59a00}',
    '.tkg-fly{position:absolute;left:0;top:0;width:36px;height:36px;z-index:40;pointer-events:none;color:#ffc93a}',
    '.tkg-fly .tkg-ic{width:100%;height:100%;stroke:#e59a00;stroke-width:1.2}',
    '.tkg-pal{display:grid;gap:6px;grid-template-columns:repeat(var(--cols),var(--bw));justify-content:center;align-content:start}',
    '.tkg-slots{display:flex;flex-wrap:wrap;gap:6px;padding-top:6px}',
    '.tkg--land .tkg-slots{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;padding-bottom:2px;-webkit-overflow-scrolling:touch}',
    '.tkg-slots.wig{animation:tkg-wig 360ms var(--e)}',
    '.tkg-chip{position:relative;width:var(--bw);height:var(--bh);min-width:56px;min-height:56px;padding:0;border:2px solid rgba(170,210,255,.75);border-radius:14px;color:#fff;cursor:grab;',
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font:900 12px/1 inherit;letter-spacing:.2px;',
    'background:linear-gradient(180deg,#3f8ef3,#1f5fd0);box-shadow:0 4px 0 #123f8f,inset 0 1px 0 rgba(255,255,255,.35);text-shadow:0 1px 0 rgba(0,0,0,.3);',
    'transition:transform 160ms var(--e),opacity 160ms linear;touch-action:none;-webkit-user-select:none;user-select:none}',
    '.tkg-chip .tkg-ic{width:30px;height:30px;flex:0 0 auto;filter:drop-shadow(0 1px 0 rgba(0,0,0,.3))}',
    '.tkg-chip.abs .tkg-ic{width:34px;height:34px}',
    '.tkg-chip:active{transform:scale(.96)}',
    '.tkg-chip:focus-visible,.tkg-btn:focus-visible{outline:3px solid #ffd84a;outline-offset:2px}',
    '.tkg-c-P,.tkg-c-D,.tkg-c-R2,.tkg-c-R3{background:linear-gradient(180deg,#667894,#3e4c66);border-color:rgba(200,215,240,.6);box-shadow:0 4px 0 #27324a,inset 0 1px 0 rgba(255,255,255,.3)}',
    '.tkg-c-L,.tkg-c-R{background:linear-gradient(180deg,#34a4e8,#1a73c2)}',
    '.tkg-pchip{width:var(--slot);height:var(--slot);flex:0 0 auto}',
    '.tkg-pchip .tkg-ic{width:26px;height:26px}',
    '.tkg-pchip.abs .tkg-ic{width:30px;height:30px}',
    '.tkg-pchip small{font-size:12px;font-weight:900}',
    '.tkg-num{position:absolute;left:-4px;top:-4px;min-width:19px;height:19px;padding:0 4px;border-radius:10px;background:#fff;color:#12314f;font-size:11px;line-height:19px;text-shadow:none;box-shadow:0 1px 0 rgba(0,0,0,.25)}',
    '.tkg-slot{width:var(--slot);height:var(--slot);flex:0 0 auto;border-radius:12px;background:rgba(0,12,40,.35);border:2px solid rgba(140,190,255,.3);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:rgba(200,225,255,.35)}',
    '.tkg-ins{box-shadow:-6px 0 0 -1px #ffd84a,0 4px 0 #123f8f}',
    '.tkg-slot.tkg-ins{border-color:#ffd84a;color:#ffd84a}',
    '.tkg-pop{animation:tkg-pop 260ms var(--e)}',
    '.tkg-run{transform:translateY(-3px) scale(1.06);box-shadow:0 0 0 3px #fff,0 0 0 6px #ffd84a}',
    '.tkg-chip--bad{box-shadow:0 0 0 3px #fff,0 0 0 6px #ff9f1c;animation:tkg-wig 420ms var(--e) 2}',
    '.tkg-chip--hint:after{content:"";position:absolute;inset:-6px;border-radius:18px;border:4px solid #ffd84a;animation:tkg-ring 1s var(--e) infinite}',
    '.tkg-lift{opacity:.3}',
    '.tkg-ghost{position:fixed;left:0;top:0;z-index:9999;pointer-events:none;opacity:.95;box-shadow:0 10px 20px rgba(0,0,0,.35)}',
    '.tkg-btn{position:relative;flex:0 0 auto;min-width:56px;height:62px;border:2px solid rgba(255,255,255,.5);border-radius:16px;padding:0 12px;display:flex;align-items:center;justify-content:center;gap:6px;',
    'font:900 17px/1 inherit;color:#fff;cursor:pointer;text-shadow:0 1px 0 rgba(0,0,0,.3);transition:transform 160ms var(--e),opacity 160ms linear}',
    '.tkg-btn:active{transform:scale(.96)}',
    '.tkg-btn .tkg-ic{width:26px;height:26px;flex:0 0 auto}',
    '.tkg-go{flex:1 1 auto;min-width:104px;background:linear-gradient(180deg,#48d465,#1f9a3f);box-shadow:0 5px 0 #146e2d,inset 0 1px 0 rgba(255,255,255,.4);font-size:24px;letter-spacing:.5px}',
    '.tkg-go .tkg-ic{width:30px;height:30px}',
    '.tkg-trash{background:linear-gradient(180deg,#ef5a5f,#b92b31);box-shadow:0 5px 0 #7d1a1f,inset 0 1px 0 rgba(255,255,255,.35)}',
    '.tkg-hintb{width:62px;height:62px;border-radius:50%;padding:0;background:#fff;border-color:#ffd84a;overflow:visible;box-shadow:0 5px 0 rgba(0,10,40,.35)}',
    '.tkg-hintb img{width:56px;height:56px;border-radius:50%;object-fit:cover;object-position:50% 6%;background:#dff1ff}',
    '.tkg-hintb i{position:absolute;right:-5px;top:-5px;width:26px;height:26px;border-radius:50%;background:#ffd84a;color:#6b4a00;display:flex;align-items:center;justify-content:center}',
    '.tkg-hintb i .tkg-ic{width:18px;height:18px}',
    '.tkg-tip{display:none;margin-top:auto;align-items:flex-end;gap:6px;padding:8px 8px 6px 10px;border-radius:12px;color:#4a3210;',
    'background:linear-gradient(180deg,#f7e7bf,#e8cf94);box-shadow:inset 0 0 0 2px rgba(140,95,30,.35),0 3px 0 rgba(0,0,0,.25);font-size:13px;line-height:1.25;font-weight:800;text-shadow:none}',
    '.tkg-tip.on{display:flex}',
    '.tkg-tip b{display:block;font-size:14px;font-weight:900}',
    '.tkg-tip img{width:48px;height:52px;object-fit:contain;flex:0 0 auto}',
    '.tkg--busy .tkg-pal .tkg-chip,.tkg--busy .tkg-act .tkg-btn,.tkg--won .tkg-pal .tkg-chip,.tkg--won .tkg-slots .tkg-chip,.tkg--won .tkg-act .tkg-btn{opacity:.55;pointer-events:none}',
    '.tkg--busy .tkg-slots .tkg-chip{pointer-events:none}',
    '@keyframes tkg-wave{from{transform:translate3d(0,0,0)}to{transform:translate3d(80px,0,0)}}',
    '@keyframes tkg-bob{0%,100%{transform:translateY(-3%) rotate(-2deg)}50%{transform:translateY(3%) rotate(2deg)}}',
    '@keyframes tkg-flow{0%{transform:translateX(-24%);opacity:.45}45%{opacity:1}100%{transform:translateX(24%);opacity:.45}}',
    '@keyframes tkg-ring{0%{transform:scale(.92);opacity:1}100%{transform:scale(1.12);opacity:0}}',
    '@keyframes tkg-spin{to{transform:rotate(360deg)}}',
    '@keyframes tkg-wake{0%{transform:scale(.5);opacity:.9}100%{transform:scale(1.5);opacity:0}}',
    '@keyframes tkg-splash{0%{transform:scale(.3);opacity:1}100%{transform:scale(2.2);opacity:0}}',
    '@keyframes tkg-pop{0%{transform:scale(.8);opacity:.4}100%{transform:scale(1);opacity:1}}',
    '@keyframes tkg-wig{0%,100%{transform:rotate(0)}25%{transform:rotate(-7deg)}75%{transform:rotate(7deg)}}',
    '.tkg--rm *,.tkg--rm *:before,.tkg--rm *:after{animation:none!important}',
    '.tkg--rm .tkg-mv,.tkg--rm .tkg-boat,.tkg--rm .tkg-hd,.tkg--rm .tkg-boat img,.tkg--rm .tkg-chip,.tkg--rm .tkg-btn{transition:opacity 140ms linear!important}',
    '.tkg--rm .tkg-bubble{transition:opacity 160ms linear!important;transform:none}',
    '.tkg--rm .tkg-win{transition:opacity 160ms linear!important;transform:translate(-50%,-50%)}',
    '.tkg--rm .tkg-run{transform:none}'
  ].join('\n')

  function injectCSS () {
    if (typeof document === 'undefined' || document.getElementById('tkg-css')) return
    var s = document.createElement('style'); s.id = 'tkg-css'; s.textContent = CSS
    ;(document.head || document.documentElement).appendChild(s)
  }
  function base () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } }
  function defLib (k) {
    try { var p = G.AssetIndex && G.AssetIndex.path && G.AssetIndex.path(k); if (p) return p } catch (e) {}
    return base() + 'assets/db/lib/' + k + '.webp'
  }
  function el (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function img (url, cls, alt) { var e = el('img', cls); e.alt = alt || ''; e.draggable = false; e.src = url; return e }
  function mq (q) { try { return !!(G.matchMedia && G.matchMedia(q).matches) } catch (e) { return false } }

  // tiny original WebAudio synth (splash, bump, step, current) — one shared context, made on first use
  var AC = null
  function ac () {
    if (AC) return AC
    try { var C = G.AudioContext || G.webkitAudioContext; if (C) AC = new C() } catch (e) { AC = null }
    return AC
  }
  function tone (f0, f1, dur, type, vol) {
    var c = ac(); if (!c) return
    try {
      if (c.state === 'suspended' && c.resume) c.resume()
      var t = c.currentTime, o = c.createOscillator(), g = c.createGain()
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur)
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02)
    } catch (e) {}
  }
  function noise (dur, vol, f0, f1) {
    var c = ac(); if (!c) return
    try {
      if (c.state === 'suspended' && c.resume) c.resume()
      var t = c.currentTime, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0)
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
      var src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain()
      src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 0.9
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur)
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      src.connect(bp); bp.connect(g); g.connect(c.destination); src.start(t); src.stop(t + dur)
    } catch (e) {}
  }
  function synth (name) {
    if (name === 'step') tone(540, 720, 0.09, 'sine', 0.05)
    else if (name === 'bump') { tone(150, 80, 0.22, 'triangle', 0.2); noise(0.18, 0.08, 500, 200) }
    else if (name === 'splash') { noise(0.6, 0.22, 2200, 350); tone(880, 1320, 0.14, 'sine', 0.06) }
    else if (name === 'current') noise(0.35, 0.07, 700, 1600)
  }

  function mount (host, def, opts) {
    opts = opts || {}
    var dead = false
    var noop = { el: null, level: null, destroy: function () {}, reset: function () {}, hint: function () {}, program: function () { return [] }, setProgram: function () {}, state: function () { return {} }, layout: function () {} }
    if (!host || typeof document === 'undefined') return noop
    injectCSS()
    var L = create(def)
    var lib = typeof opts.lib === 'function' ? opts.lib : defLib
    var art = {}
    for (var ak in ART) art[ak] = (opts.art && opts.art[ak]) || ART[ak]
    function src (slot) { var u = null; try { u = lib(art[slot]) } catch (e) { u = null } return u || defLib(art[slot]) }
    var rm = opts.reducedMotion != null ? !!opts.reducedMotion : mq('(prefers-reduced-motion: reduce)')
    var topInset = opts.topInset != null ? Math.max(0, int(opts.topInset, 70)) : 70
    var st = { prog: [], attempts: 0, hints: 0, running: false, done: false, runId: 0, bad: null, dirty: false, T: 56, angle: 0, face: 'E', earned: 0, msg: '' }
    var vis = null
    var timers = []
    function later (fn, ms) {
      var id = setTimeout(function () {
        var i = timers.indexOf(id); if (i >= 0) timers.splice(i, 1)
        if (!dead) { try { fn() } catch (e) { if (G.console) console.error('[TKGrid]', e) } }
      }, ms)
      timers.push(id); return id
    }
    function muted () { try { return !!(opts.muted || (G.SFXEngine && G.SFXEngine.getMute && G.SFXEngine.getMute())) } catch (e) { return false } }
    function sfx (name) {
      if (muted()) return
      var own = opts.sfx && opts.sfx[name], S = G.SFXEngine, cue = S && typeof S.cue === 'function'
      try {
        if (typeof own === 'function') own()
        else if (cue) {
          if (name === 'click') S.cue('click', { volume: 0.4 })
          else if (name === 'good') S.cue('correct', { volume: 0.5 })
          else if (name === 'bad') S.cue('wrong', { volume: 0.3 })
          else if (name === 'win') S.cue('levelup', { volume: 0.7 })
          else if (name === 'star') S.cue('star', { volume: 0.5 })
        }
        if (name === 'bad') synth('bump')
        else if (name === 'win') synth('splash')
        else if (name === 'step' || name === 'current' || name === 'bump' || name === 'splash') synth(name)
      } catch (e) {}
    }
    var hasAbs = L.tools.some(function (c) { return !!DV[c] })

    /* ── DOM ── */
    var root = el('div', 'tkg' + (rm ? ' tkg--rm' : '') + (opts.bg === false ? '' : ' tkg--bg'))
    root.setAttribute('data-level', L.id || '')
    root.style.setProperty('--top', topInset + 'px')
    var body = el('div', 'tkg-body')
    var sea = el('div', 'tkg-sea'), board = el('div', 'tkg-board')
    board.setAttribute('role', 'img'); board.setAttribute('aria-label', 'Papan laut ' + L.w + ' kali ' + L.h)
    board.appendChild(el('div', 'tkg-wv')); board.appendChild(el('div', 'tkg-wv tkg-wv2')); board.appendChild(el('div', 'tkg-grid'))
    sea.appendChild(board)
    var rose = el('div', 'tkg-rose', wrapIc(ic('compass')) + '<b style="left:50%;top:-13px;margin-left:-4px">U</b><b style="left:50%;bottom:-13px;margin-left:-4px">S</b><b style="left:-11px;top:50%;margin-top:-5px">B</b><b style="right:-10px;top:50%;margin-top:-5px">T</b>')
    rose.setAttribute('aria-hidden', 'true')
    sea.appendChild(rose)
    var bubble = el('div', 'tkg-bubble'); bubble.setAttribute('role', 'status'); bubble.setAttribute('aria-live', 'polite')
    var bTxt = el('span')
    bubble.appendChild(img(src('timmy'))); bubble.appendChild(bTxt)
    sea.appendChild(bubble)
    var win = el('div', 'tkg-win'); win.appendChild(el('b', '', 'Hebat!'))
    var winStars = el('div'); win.appendChild(winStars); sea.appendChild(win)

    var cmd = el('div', 'tkg-cmd'); cmd.appendChild(el('div', 'tkg-h', 'Perintah'))
    var pal = el('div', 'tkg-pal'); pal.setAttribute('aria-label', 'Pilihan perintah'); cmd.appendChild(pal)
    var tip = el('div', 'tkg-tip')
    var tipTxt = el('div'); tipTxt.innerHTML = '<b>Tips:</b>'
    var tipSpan = el('span'); tipSpan.textContent = opts.mission || L.mission || defaultMission(); tipTxt.appendChild(tipSpan)
    tip.appendChild(tipTxt); tip.appendChild(img(src('tipper')))
    cmd.appendChild(tip)

    var route = el('div', 'tkg-route')
    var rh = el('div', 'tkg-h')
    var rTitle = el('span'); rTitle.innerHTML = 'Rutemu <small>(maks ' + L.maxLen + ' langkah)</small>'
    var count = el('span', 'tkg-count', '<i class="tkg-ic" aria-hidden="true">' + ic('star') + '</i>'); count.setAttribute('aria-label', 'Bintang')
    var countN = el('span'); countN.textContent = String(int(opts.starBase, 0)); count.appendChild(countN)
    rh.appendChild(rTitle); rh.appendChild(count); route.appendChild(rh)
    var slots = el('div', 'tkg-slots'); slots.setAttribute('aria-label', 'Rute kapal'); route.appendChild(slots)

    var act = el('div', 'tkg-act')
    var hintB = el('button', 'tkg-btn tkg-hintb'); hintB.type = 'button'; hintB.setAttribute('aria-label', 'Petunjuk dari Timmy')
    hintB.appendChild(img(src('timmy'))); hintB.appendChild(el('i', '', wrapIc(ic('hint'))))
    var trashB = el('button', 'tkg-btn tkg-trash', wrapIc(ic('trash')) + '<span>Hapus</span>'); trashB.type = 'button'; trashB.setAttribute('aria-label', 'Hapus semua perintah')
    var goB = el('button', 'tkg-btn tkg-go', wrapIc(ic('go')) + '<span>JALAN!</span>'); goB.type = 'button'; goB.setAttribute('aria-label', 'Jalankan kapal')
    if (opts.hintButton !== false) act.appendChild(hintB)
    act.appendChild(trashB); act.appendChild(goB)
    body.appendChild(sea); body.appendChild(cmd); body.appendChild(route); body.appendChild(act)
    root.appendChild(body)

    function defaultMission () {
      if (L.items.length) return L.drop ? 'Ambil peti, lalu antar ke tanda kuning!' : 'Ambil semua peti, lalu ke bendera!'
      return 'Bawa kapal ke bendera. Hati-hati, gunung es menghalangi!'
    }

    /* board objects */
    var O = { cur: [], gate: [], sw: [], item: [], imv: [], goal: null, drop: null }
    function obj (cls, x, y, html) { var e = el('div', 'tkg-o ' + cls, html); e._x = x; e._y = y; board.appendChild(e); return e }
    function spriteObj (cls, slot, x, y) { var e = obj(cls, x, y); e.appendChild(img(src(slot))); return e }
    obj('tkg-start', L.start.x, L.start.y)
    L.currents.forEach(function (c) {
      var e = obj('tkg-cur', c.x, c.y), rot = { E: 0, S: 90, W: 180, N: 270 }[c.dir]
      var i = el('i', '', wrapIc(arw('E'))); i.style.transform = 'rotate(' + rot + 'deg)'; e.appendChild(i); O.cur.push(e)
    })
    if (L.drop) O.drop = obj('tkg-drop', L.drop.x, L.drop.y, wrapIc(ic('drop')))
    if (L.goal && !(L.drop && L.drop.x === L.goal.x && L.drop.y === L.goal.y)) {
      O.goal = obj('tkg-goal', L.goal.x, L.goal.y)
      O.goal.appendChild(img(src('lighthouse'), 'lh')); O.goal.appendChild(img(src('flag'), 'fl'))
    }
    var goalEl = O.goal || O.drop
    L.switches.forEach(function (s) { O.sw.push(obj('tkg-sw', s.x, s.y, wrapIc(ic('switch')))) })
    var gateKeys = {}
    L.switches.forEach(function (s) {
      s.opens.forEach(function (g) {
        var k = g.y * L.w + g.x
        if (gateKeys[k]) return
        var e = obj('tkg-gate', g.x, g.y, wrapIc('', 'tkg-bars')); gateKeys[k] = e; O.gate.push(e)
      })
    })
    L.blocks.forEach(function (b) { if (!gateKeys[b.y * L.w + b.x]) spriteObj('tkg-blk', 'ice', b.x, b.y) })
    L.ice.forEach(function (o) {
      o.path.forEach(function (p) { var d = el('div', 'tkg-idot'); d._x = p.x; d._y = p.y; board.appendChild(d) })
    })
    L.items.forEach(function (it) { O.item.push(spriteObj('tkg-item tkg-mv', 'crate', it.x, it.y)) })
    L.ice.forEach(function (o) { O.imv.push(spriteObj('tkg-imv tkg-mv', 'ice', o.path[0].x, o.path[0].y)) })
    var boat = obj('tkg-boat', L.start.x, L.start.y)
    var bump = el('div', 'tkg-bump'), bob = el('div', 'tkg-bob'), hd = el('div', 'tkg-hd', wrapIc(arw('N', 'tkg-hdarw')))
    var carry = el('div', 'tkg-carry'); carry.appendChild(img(src('crate')))
    bob.appendChild(img(src('boat'), '', 'Kapal')); bob.appendChild(carry); bump.appendChild(hd); bump.appendChild(bob); boat.appendChild(bump)

    function put (e, x, y) { e._x = x; e._y = y; e.style.transform = 'translate3d(' + (x * st.T) + 'px,' + (y * st.T) + 'px,0)' }
    function placeAll () {
      var all = board.querySelectorAll('.tkg-o,.tkg-idot,.tkg-gh')
      for (var i = 0; i < all.length; i++) put(all[i], all[i]._x, all[i]._y)
    }
    function setHeading (animate) {
      if (!animate) hd.style.transition = 'none'
      hd.style.transform = 'rotate(' + st.angle + 'deg)'
      boat.setAttribute('data-face', st.face)
      if (!animate) { void hd.offsetWidth; hd.style.transition = '' }
    }
    function turnTo (dir) {
      var want = DIRS.indexOf(dir) * 90, cur = ((st.angle % 360) + 360) % 360, d = want - cur
      if (d > 180) d -= 360
      if (d < -180) d += 360
      st.angle += d
      if (dir === 'E' || dir === 'W') st.face = dir
    }

    /* ── layout ── */
    var lastKey = ''
    function layout () {
      if (dead) return
      var W = root.clientWidth, H = root.clientHeight - topInset
      if (!W || H <= 0) return
      var land = W > H * 1.15 && W >= 560
      root.classList.toggle('tkg--land', land)
      var n = L.tools.length, bw, bh, cols
      if (land) {
        bh = H < 460 ? 56 : 62
        var colH = H - 16 - 96 - 8           // sea/cmd row = body minus route row
        var rows = Math.max(1, Math.floor((colH - 12 - 26 + 6) / (bh + 6)))
        cols = Math.max(1, Math.ceil(n / rows))
        if (cols === 1 && n > 4) cols = 2
        bw = cols === 1 ? 104 : (cols === 2 ? 84 : 68)
        var cmdw = Math.max(opts.hintButton === false ? 240 : 300, cols * (bw + 6) + 14)
        root.style.setProperty('--cmdw', cmdw + 'px')
        var usedH = 26 + Math.ceil(n / cols) * (bh + 6) + 12
        tip.classList.toggle('on', colH - usedH >= 120)
      } else {
        cols = Math.min(4, n)
        bh = 58
        bw = Math.max(56, Math.min(96, Math.floor((W - 16 - 16 - (cols - 1) * 6) / cols)))
        tip.classList.remove('on')
      }
      root.style.setProperty('--cols', String(cols))
      root.style.setProperty('--bw', bw + 'px'); root.style.setProperty('--bh', bh + 'px')
      var aw = sea.clientWidth - 6, ah = sea.clientHeight - 6
      var T = Math.max(20, Math.floor(Math.min(aw / L.w, ah / L.h, 96)))
      var k = T + ':' + land + ':' + W + ':' + H
      if (k === lastKey) return
      lastKey = k
      st.T = T
      root.style.setProperty('--t', T + 'px')
      board.style.width = (T * L.w) + 'px'; board.style.height = (T * L.h) + 'px'
      root.classList.add('tkg-noanim')
      placeAll()
      placeRose(aw, ah, T)
      void root.offsetWidth
      root.classList.remove('tkg-noanim')
    }
    function placeRose (aw, ah, T) {
      var bwp = T * L.w, bhp = T * L.h, sx = (aw - bwp) / 2, sy = (ah - bhp) / 2
      if (sx >= 76) { rose.style.display = 'block'; rose.style.left = (sx + bwp + 14) + 'px'; rose.style.top = (sy + 14) + 'px' }
      else if (sy >= 76) { rose.style.display = 'block'; rose.style.left = (sx + bwp - 70) + 'px'; rose.style.top = (sy - 70) + 'px' }
      else rose.style.display = 'none'
    }
    var ro = null
    function onResize () { lastKey = ''; layout() }
    if (G.ResizeObserver) { try { ro = new G.ResizeObserver(function () { layout() }); ro.observe(root) } catch (e) { ro = null } }
    if (G.addEventListener) G.addEventListener('resize', onResize)

    /* ── board state ── */
    function resetBoard (animate) {
      vis = { x: L.start.x, y: L.start.y, dir: L.start.dir }
      st.angle = DIRS.indexOf(L.start.dir) * 90
      st.face = L.start.dir === 'W' ? 'W' : 'E'
      st.dirty = false
      var doIt = function () {
        root.classList.add('tkg-noanim')
        put(boat, L.start.x, L.start.y); setHeading(false)
        O.item.forEach(function (e, i) { e.classList.remove('gone'); e.classList.remove('dl'); e.style.opacity = ''; put(e, L.items[i].x, L.items[i].y) })
        O.imv.forEach(function (e, i) { var p = L.ice[i].path[0]; put(e, p.x, p.y) })
        O.gate.forEach(function (e) { e.classList.remove('open') })
        O.sw.forEach(function (e) { e.classList.remove('on') })
        carry.classList.remove('on')
        void root.offsetWidth
        root.classList.remove('tkg-noanim')
        boat.style.opacity = ''
      }
      if (animate) { boat.style.opacity = '0'; later(doIt, 160) } else doIt()
    }

    /* ── bubble ── */
    var bubbleT = null
    function say (text, kind, ms) {
      st.msg = text
      bTxt.innerHTML = '<em>Timmy</em>'
      bTxt.appendChild(document.createTextNode(text))
      var low = vis && vis.y >= L.h / 2 && L.h > 1
      bubble.className = 'tkg-bubble on' + (kind ? ' ' + kind : '') + (low ? ' top' : '')
      if (bubbleT) { clearTimeout(bubbleT); bubbleT = null }
      if (ms) bubbleT = setTimeout(function () { if (!dead) bubble.classList.remove('on') }, ms)
    }
    function hush () { bubble.classList.remove('on') }

    /* ── palette + route ── */
    function chip (c, where, i) {
      var b = el('button', 'tkg-chip tkg-c-' + c + (DV[c] ? ' abs' : '') + (where === 'slot' ? ' tkg-pchip' : ''))
      b.type = 'button'
      b.setAttribute('data-cmd', c)
      if (where === 'slot') {
        b.setAttribute('data-idx', String(i))
        b.innerHTML = icon(c) + (REP[c] ? '<small>' + REP[c] + 'x</small>' : '') + '<span class="tkg-num">' + (i + 1) + '</span>'
        b.setAttribute('aria-label', 'Perintah ' + (i + 1) + ': ' + LABEL[c] + '. Ketuk untuk menghapus')
      } else {
        b.innerHTML = icon(c) + (SHORT[c] ? '<span>' + (REP[c] ? SHORT[c] + ' ' + REP[c] + 'x' : SHORT[c]) + '</span>' : '')
        b.setAttribute('aria-label', 'Tambah ' + LABEL[c])
      }
      bindChip(b, where, i)
      return b
    }
    function renderPal () {
      pal.innerHTML = ''
      L.tools.forEach(function (c) { pal.appendChild(chip(c, 'pal')) })
    }
    function renderSlots (enter) {
      slots.innerHTML = ''
      var n = Math.max(L.maxLen, st.prog.length)
      for (var i = 0; i < n; i++) {
        if (i < st.prog.length) {
          var b = chip(st.prog[i], 'slot', i)
          if (i === enter && !rm) b.classList.add('tkg-pop')
          if (st.bad === i) b.classList.add('tkg-chip--bad')
          slots.appendChild(b)
        } else {
          var d = el('div', 'tkg-slot'); d.textContent = String(i + 1); slots.appendChild(d)
        }
      }
      var focus = st.bad != null ? st.bad : (enter != null && enter >= 0 ? enter : -1)
      if (focus >= 0) reveal(slots.children[focus])
    }
    function reveal (e) {
      if (!e || slots.scrollWidth <= slots.clientWidth) return
      var l = e.offsetLeft - slots.offsetLeft, r = l + e.offsetWidth
      if (l < slots.scrollLeft) slots.scrollLeft = Math.max(0, l - 8)
      else if (r > slots.scrollLeft + slots.clientWidth) slots.scrollLeft = r - slots.clientWidth + 8
    }
    function wiggle (e) {
      if (rm) return
      e.classList.remove('wig'); void e.offsetWidth; e.classList.add('wig')
      later(function () { e.classList.remove('wig') }, 400)
    }
    function edited () {
      st.bad = null
      clearHintMarks()
      if (st.dirty) resetBoard(true)
      if (bubble.classList.contains('bad')) hush()
    }
    function addCmd (c, at) {
      if (st.running || st.done) return false
      if (st.prog.length >= L.maxLen) { say(SAY.full, 'bad', 2600); wiggle(slots); sfx('bad'); return false }
      at = at == null ? st.prog.length : Math.max(0, Math.min(st.prog.length, at))
      st.prog = st.prog.slice(0, at).concat([c], st.prog.slice(at))
      edited(); sfx('click'); renderSlots(at)
      return true
    }
    function removeAt (i) {
      if (st.running || st.done || i < 0 || i >= st.prog.length) return
      st.prog = st.prog.slice(0, i).concat(st.prog.slice(i + 1))
      edited(); sfx('click'); renderSlots(-1)
    }
    function moveCmd (from, to) {
      if (st.running || st.done) return
      var c = st.prog[from], rest = st.prog.slice(0, from).concat(st.prog.slice(from + 1))
      if (to > from) to--
      to = Math.max(0, Math.min(rest.length, to))
      st.prog = rest.slice(0, to).concat([c], rest.slice(to))
      edited(); sfx('click'); renderSlots(to)
    }

    /* drag + tap (pointer events; a tap = press and release within 10 px) */
    var drag = null
    function bindChip (b, where, i) {
      b.addEventListener('pointerdown', function (e) {
        if (st.running || st.done || drag || (e.button != null && e.button > 0)) return
        var sx = e.clientX, sy = e.clientY, pid = e.pointerId, d = null
        try { b.setPointerCapture(pid) } catch (er) {}
        function mv (ev) {
          if (ev.pointerId !== pid) return
          var dx = ev.clientX - sx, dy = ev.clientY - sy
          if (!d && dx * dx + dy * dy > 100) d = drag = startDrag(b, where, i, sx, sy)
          if (d) { ev.preventDefault(); moveDrag(d, ev.clientX, ev.clientY) }
        }
        function up (ev) {
          if (ev.pointerId !== pid) return
          b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up)
          if (d) { endDrag(d, ev.clientX, ev.clientY, ev.type === 'pointercancel'); drag = null }
          else if (ev.type === 'pointerup') tap(where, i, b)
        }
        b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up)
      })
      // keyboard activation (Enter/Space dispatch a click with detail 0)
      b.addEventListener('click', function (e) { if (e.detail === 0) tap(where, i, b) })
    }
    function tap (where, i, b) {
      if (where === 'pal') addCmd(b.getAttribute('data-cmd'))
      else {
        if (rm) { removeAt(i); return }
        b.style.transform = 'scale(.8)'; b.style.opacity = '0'
        later(function () { removeAt(i) }, 130)
      }
    }
    function startDrag (b, where, i, sx, sy) {
      var r = b.getBoundingClientRect(), g = b.cloneNode(true)
      g.className = b.className.replace(/tkg-(pop|run|chip--bad|chip--hint|ins)/g, '') + ' tkg-ghost'
      g.style.width = r.width + 'px'; g.style.height = r.height + 'px'
      root.appendChild(g)
      if (where === 'slot') b.classList.add('tkg-lift')
      var d = { b: b, where: where, i: i, g: g, ox: sx - r.left, oy: sy - r.top, at: null, cmd: b.getAttribute('data-cmd') }
      moveDrag(d, sx, sy)
      return d
    }
    function insertAt (x, y) {
      var r = slots.getBoundingClientRect(), pad = 26
      if (x < r.left - pad || x > r.right + pad || y < r.top - pad || y > r.bottom + pad) return null
      var cs = slots.querySelectorAll('.tkg-pchip')
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i].getBoundingClientRect()
        if (y < c.top - 3) return i
        if (y <= c.bottom + 3 && x < c.left + c.width / 2) return i
      }
      return cs.length
    }
    function moveDrag (d, x, y) {
      d.g.style.transform = 'translate3d(' + (x - d.ox) + 'px,' + (y - d.oy) + 'px,0) scale(1.08)'
      var at = insertAt(x, y)
      if (at === d.at) return
      d.at = at
      var ins = slots.querySelectorAll('.tkg-ins')
      for (var i = 0; i < ins.length; i++) ins[i].classList.remove('tkg-ins')
      if (at != null) { var t = slots.children[at]; if (t) t.classList.add('tkg-ins') }
    }
    function endDrag (d, x, y, cancel) {
      var at = cancel ? null : insertAt(x, y)
      var g = d.g
      g.style.transition = 'opacity 140ms linear'; g.style.opacity = '0'
      setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g) }, 160)
      var ins = slots.querySelectorAll('.tkg-ins')
      for (var i = 0; i < ins.length; i++) ins[i].classList.remove('tkg-ins')
      if (d.where === 'pal') { if (at != null) addCmd(d.cmd, at) }
      else if (at == null) { if (!cancel) removeAt(d.i); else d.b.classList.remove('tkg-lift') }
      else if (at === d.i || at === d.i + 1) d.b.classList.remove('tkg-lift')
      else moveCmd(d.i, at)
    }

    /* ── hint ladder: 1 glow goal + next command · 2 fill it · 3 ghost path ── */
    function clearHintMarks () {
      if (goalEl) goalEl.classList.remove('tkg-glow')
      var h = root.querySelectorAll('.tkg-chip--hint'); for (var i = 0; i < h.length; i++) h[i].classList.remove('tkg-chip--hint')
      var gh = board.querySelectorAll('.tkg-gh'); for (var j = 0; j < gh.length; j++) board.removeChild(gh[j])
    }
    function hint () {
      if (st.running || st.done) return
      sfx('click')
      var h = nextHint(L, st.prog)
      if (!h) return
      st.hints++
      var lvl = Math.min(st.hints, 3)
      clearHintMarks()
      if (lvl === 1) {
        if (goalEl) goalEl.classList.add('tkg-glow')
        h.next.forEach(function (c) { var p = pal.querySelector('[data-cmd="' + c + '"]'); if (p) p.classList.add('tkg-chip--hint') })
        say(SAY.hint1.replace('{c}', h.next.map(function (c) { return LABEL[c] }).join(' + ')), 'good', 4500)
      } else if (lvl === 2) {
        st.prog = h.full.slice(0, h.keep + h.next.length)
        st.bad = null
        if (st.dirty) resetBoard(true)
        renderSlots(st.prog.length - 1)
        say(SAY.hint2, 'good', 3600)
      } else {
        var r = run(L, h.full), seen = {}, n = 0
        var pts = [{ x: L.start.x, y: L.start.y }]
        r.steps.forEach(function (s) { if (s.via) pts.push(s.via); pts.push({ x: s.x, y: s.y }) })
        pts.forEach(function (p) {
          var k = p.x + ',' + p.y
          if (seen[k]) return
          seen[k] = 1; n++
          var g = el('div', 'tkg-gh', '<b>' + n + '</b>'); g._x = p.x; g._y = p.y
          board.appendChild(g); put(g, p.x, p.y)
          later(function () { g.classList.add('on') }, rm ? 0 : 60 * n)
        })
        if (goalEl) goalEl.classList.add('tkg-glow')
        say(SAY.hint3, 'good', 4500)
      }
    }

    /* ── running ── */
    function markRun (step) {
      var r = slots.querySelectorAll('.tkg-run'); for (var i = 0; i < r.length; i++) r[i].classList.remove('tkg-run')
      if (!step) return
      var a = slots.children[step.idx]; if (a) { a.classList.add('tkg-run'); reveal(a) }
      if (step.rep != null) { var b = slots.children[step.rep]; if (b) b.classList.add('tkg-run') }
    }
    function fx (cls, x, y, ms) {
      if (rm) return null
      var e = el('div', 'tkg-fx ' + cls); board.appendChild(e); put(e, x, y)
      later(function () { if (e.parentNode) e.parentNode.removeChild(e) }, ms || 900)
      return e
    }
    function moveBoat (x, y) {
      vis.x = x; vis.y = y
      if (rm) {
        boat.style.opacity = '0'
        later(function () { root.classList.add('tkg-noanim'); put(boat, x, y); void boat.offsetWidth; root.classList.remove('tkg-noanim'); boat.style.opacity = '' }, 140)
      } else put(boat, x, y)
    }
    function nudge (e, bx, by, tx, ty) {
      if (rm || !e || !e.animate) return
      var T = st.T, dx = (tx - bx) * T * 0.22, dy = (ty - by) * T * 0.22
      try {
        e.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0)' }, { transform: 'translate3d(0,0,0)' }],
          { duration: 380, easing: EASE })
      } catch (er) {}
    }
    function playStep (s) {
      markRun(s)
      st.dirty = true
      if (s.event !== 'bump') s.ice.forEach(function (p, i) { if (O.imv[i]) put(O.imv[i], p.x, p.y) })
      if (s.opened) {
        L.switches.forEach(function (sw, j) {
          if (!(s.opened & (1 << j))) return
          if (O.sw[j]) O.sw[j].classList.add('on')
          sw.opens.forEach(function (g) { var e = gateKeys[g.y * L.w + g.x]; if (e) e.classList.add('open') })
        })
      }
      var ev = s.event
      if ((ev === 'move' || ev === 'current' || ev === 'bump') && DV[s.cmd]) { turnTo(s.face || s.cmd); setHeading(true) }
      if (ev === 'move') { fx('tkg-wake', s.from.x, s.from.y); moveBoat(s.x, s.y); sfx('step') }
      else if (ev === 'current') {
        fx('tkg-wake', s.from.x, s.from.y); moveBoat(s.via.x, s.via.y); sfx('step')
        later(function () { fx('tkg-ring', s.via.x, s.via.y, 700); sfx('current'); moveBoat(s.x, s.y) }, rm ? 300 : 280)
      } else if (ev === 'turn') {
        st.angle += s.cmd === 'L' ? -90 : 90
        if (s.dir === 'E' || s.dir === 'W') st.face = s.dir
        setHeading(true); sfx('step')
      } else if (ev === 'pick') {
        var ie = O.item[s.item]
        if (ie) { put(ie, s.x, s.y); ie.style.opacity = '0'; later(function () { ie.classList.add('gone') }, 300) }
        carry.classList.add('on'); sfx('good')
      } else if (ev === 'drop') {
        L.items.forEach(function (it, i) {
          if (!(s.items & (1 << i)) || !O.item[i]) return
          var e = O.item[i]; e.classList.remove('gone'); e.classList.add('dl'); put(e, s.x, s.y); e.style.opacity = ''
        })
        carry.classList.remove('on'); sfx('good')
      } else if (ev === 'bump') {
        var t = s.toward || { x: s.x, y: s.y }
        var iceEl = s.iceIdx != null && O.imv[s.iceIdx] ? O.imv[s.iceIdx].firstChild : null
        if (s.reason === 'ice' && iceEl && t.x === s.x && t.y === s.y) {
          // the drifting ice came onto the boat: the ice nudges, the boat rocks
          var ip = s.ice[s.iceIdx]; nudge(iceEl, ip.x, ip.y, s.x, s.y)
        } else if (s.reason === 'ice' && iceEl && s.cmd !== 'F' && !DV[s.cmd]) {
          nudge(iceEl, t.x, t.y, s.x, s.y)
        } else nudge(bump, s.x, s.y, t.x, t.y)
        sfx('bad')
      }
    }
    function stepMs (s) { return s.event === 'current' ? STEP_MS + 260 : s.event === 'bump' ? STEP_MS + 150 : STEP_MS }
    function go () {
      if (st.running || st.done) return
      if (!st.prog.length) { say(SAY.noProg, 'bad', 2600); wiggle(slots); sfx('click'); return }
      sfx('click')
      st.attempts++
      st.bad = null; renderSlots(-1); clearHintMarks(); hush()
      var res = run(L, st.prog)
      st.running = true; root.classList.add('tkg--busy')
      var id = ++st.runId, i = 0
      function tick () {
        if (id !== st.runId) return
        if (i >= res.steps.length) { finish(res); return }
        var s = res.steps[i++]
        playStep(s)
        later(tick, stepMs(s))
      }
      if (st.dirty) { resetBoard(true); later(tick, 260) } else later(tick, 120)
    }
    function finish (res) {
      st.running = false; root.classList.remove('tkg--busy')
      markRun(null)
      if (res.ok) { won(res); return }
      if (res.failAt != null) {
        st.bad = res.failAt
        renderSlots(-1)
        var key = res.reason === 'noItem' ? (res.detail || 'none') : res.reason
        say((SAY[key] || SAY.block).replace('{n}', String(res.failAt + 1)), 'bad', 6500)
      } else {
        say(SAY[res.detail] || SAY.far, 'bad', 6500)
        sfx('bad')
      }
    }
    function won (res) {
      st.done = true; root.classList.add('tkg--won')
      var g = L.goal || { x: vis.x, y: vis.y }
      fx('tkg-ring', g.x, g.y, 900)
      if (!rm && board.animate) {
        for (var k = 0; k < 8; k++) {
          var dEl = fx('', g.x, g.y, 800)
          if (!dEl) break
          var dot = el('i', 'tkg-drop-fx'); dEl.appendChild(dot)
          var a = k / 8 * Math.PI * 2, R = st.T * 0.7
          try { dot.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * R + 'px,' + (Math.sin(a) * R - st.T * 0.2) + 'px) scale(.4)', opacity: 0 }], { duration: 700, easing: EASE, fill: 'forwards' }) } catch (e) {}
        }
      }
      sfx('win')
      say(SAY.win, 'good')
      winStars.innerHTML = ''
      var starEls = []
      for (var i = 0; i < 3; i++) { var s = el('span', '', wrapIc(ic('star', i < res.stars ? '' : 'tk-ico--dim'), i < res.stars ? 'got' : '')); winStars.appendChild(s); starEls.push(s) }
      win.classList.add('on')
      var n = res.stars
      later(function () {
        flyStars(starEls.slice(0, n), function () {
          later(function () {
            win.classList.remove('on')
            try { if (typeof opts.onDone === 'function') opts.onDone({ stars: n, moves: res.moves, attempts: st.attempts, hints: st.hints, shortest: L.shortest }) } catch (e) { if (G.console) console.error('[TKGrid] onDone', e) }
          }, 350)
        })
      }, rm ? 300 : 650)
    }
    function flyStars (els, done) {
      var target = opts.starTarget && opts.starTarget.getBoundingClientRect ? opts.starTarget : count
      var rr = root.getBoundingClientRect(), cr = target.getBoundingClientRect(), left = els.length
      if (!left) { done(); return }
      els.forEach(function (s, i) {
        later(function () {
          var r = s.getBoundingClientRect()
          var f = el('div', 'tkg-fly', wrapIc(ic('star'))); root.appendChild(f)
          var x0 = r.left - rr.left + 2, y0 = r.top - rr.top + 2, x1 = cr.left - rr.left + 4, y1 = cr.top - rr.top + (cr.height - 36) / 2
          var land = function () {
            if (f.parentNode) f.parentNode.removeChild(f)
            st.earned++
            countN.textContent = String(int(opts.starBase, 0) + st.earned)
            sfx('star')
            if (!rm && target.animate) { try { target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 260, easing: EASE }) } catch (e) {} }
            if (--left === 0) done()
          }
          if (rm || !f.animate) { f.style.opacity = '0'; land(); return }
          try {
            var a = f.animate([{ transform: 'translate3d(' + x0 + 'px,' + y0 + 'px,0) scale(1)' }, { transform: 'translate3d(' + x1 + 'px,' + y1 + 'px,0) scale(.7)' }],
              { duration: 620, easing: EASE, fill: 'forwards' })
            a.onfinish = land
          } catch (e) { land() }
        }, i * 170)
      })
    }

    /* ── wiring ── */
    hintB.addEventListener('click', hint)
    trashB.addEventListener('click', function () {
      if (st.running || st.done) return
      if (!st.prog.length) { wiggle(slots); return }
      st.prog = []; edited(); sfx('click'); renderSlots(-1)
    })
    goB.addEventListener('click', go)

    renderPal(); renderSlots(-1)
    host.appendChild(root)
    resetBoard(false)
    layout()
    later(layout, 60)
    say(opts.hint || L.hint || (hasAbs ? 'Ayo rencanakan rutenya! Ketuk panah untuk menggerakkan kapal.' : defaultMission()), '', 4500)

    return {
      el: root,
      level: L,
      hint: hint,
      go: go,
      destroy: function () {
        if (dead) return
        dead = true
        timers.forEach(clearTimeout); timers = []
        if (bubbleT) clearTimeout(bubbleT)
        if (ro) { try { ro.disconnect() } catch (e) {} }
        if (G.removeEventListener) G.removeEventListener('resize', onResize)
        if (root.parentNode) root.parentNode.removeChild(root)
      },
      reset: function () {
        if (dead) return
        st.runId++; st.running = false; st.done = false; st.prog = []; st.bad = null; st.hints = 0
        root.classList.remove('tkg--busy'); root.classList.remove('tkg--won'); win.classList.remove('on')
        clearHintMarks(); markRun(null); renderSlots(-1); resetBoard(true); hush()
      },
      program: function () { return st.prog.slice() },
      setProgram: function (p) {
        if (dead || st.running || st.done) return
        st.prog = arr(p).map(String).filter(isCmd).slice(0, L.maxLen); edited(); renderSlots(-1)
      },
      state: function () {
        return { running: st.running, done: st.done, attempts: st.attempts, hints: st.hints, bad: st.bad,
          program: st.prog.slice(), message: st.msg, bubble: bubble.classList.contains('on'), tile: st.T,
          boat: vis ? { x: vis.x, y: vis.y } : null, maxLen: L.maxLen, shortest: L.shortest, stars: st.earned }
      },
      layout: onResize
    }
  }

  TKGrid.mount = mount
  G.TKGrid = TKGrid
  if (typeof module !== 'undefined' && module.exports) module.exports = TKGrid
})(typeof window !== 'undefined' ? window : globalThis)
