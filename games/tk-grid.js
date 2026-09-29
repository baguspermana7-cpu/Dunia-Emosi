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
 *           art:{boat, walker, ice, flag, crate, timmy, lighthouse, lifeboat, tipper, compass, block} (library keys;
 *             `block` = one key or a list the obstacles cycle through), theme:'sea'|'deck', bg (CSS background
 *             string painted behind the board, e.g. TKArt.scene(k); false = transparent), title, mission, hint, tip,
 *           chapter:{ship, name, title, label, idx, total} (mini-card + "Level X dari Y"), onBack(), onNext()
 *             (footer buttons, hidden when absent), topInset (px left free for the host HUD, default 70),
 *           hintButton (false = host drives handle.hint()), starTarget (element stars fly to), starBase, reducedMotion, muted }
 *   The level definition may carry theme / blockArt / itemArt / scene (TKWorlds.grid puts them there); opts win.
 *   Layout (owner mockups ui-05 / ui-07): landscape = chapter card left (>= 1000 px), parchment title plate over
 *   the board, "Perintah" panel right with Hapus + JALAN! inside it, bottom band = big Timmy (tap = hint) with his
 *   speech bubble, "Rutemu" route bar, penguin tip card. Portrait = chapter card, plate, board, command panel,
 *   Timmy row, route, tip, footer (tip, plate, chapter card drop out in that order when the board gets small).
 *   Timmy's bubble has its own row: it never covers the board. Deck theme = wooden planks, Timmy walks to the
 *   lifeboat, obstacles are cargo / crew sprites. Stars = 3 at the shortest route, 2 within +2, else 1.
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
      w: w, h: h, easy: !!def.easy, coach: def.coach === 'always' || def.coach === 'first' ? def.coach : '',
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
    // easy boards (a child's first boards of a world): only the commands the route actually needs.
    // A subset of the tools cannot make the route shorter, so shortest / solution stay valid.
    if (L.easy && sol && def.trim !== false && sol.some(function (c) { return REP[c] })) {
      // a young child plays with arrows: take the plain-arrow route when one exists (it may be a bit longer)
      var plain = L.tools.filter(function (c) { return !REP[c] }), keep = L.tools
      L.tools = plain
      var sol2 = null
      try { sol2 = search(L, startState(L), SEARCH_LIMIT) } catch (e) { sol2 = null }
      if (sol2 && sol2.length <= 12) { sol = sol2; L.solution = sol; L.shortest = sol.length } else L.tools = keep
    }
    if (L.easy && sol && def.trim !== false) {
      var need = L.tools.filter(function (c) { return sol.indexOf(c) >= 0 })
      if (need.length) L.tools = need
    }
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

  // forgiving (easy boards): 3 stars up to shortest + 1, 2 up to shortest + 3
  function stars (moves, shortest, forgiving) {
    var slack = forgiving ? 1 : 0
    if (!(shortest > 0) || moves <= shortest + slack) return 3
    return moves <= shortest + 2 + slack ? 2 : 1
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
      if (isDone(L, s)) { out.ok = true; out.stars = stars(out.moves, L.shortest, L.easy); return out }
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
          if (r.done) { out.ok = true; out.endAt = i; out.stars = stars(out.moves, L.shortest, L.easy); return out }
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

  // where the child's program WILL take the boat, before JALAN! (the live ghost path).
  // path = tile centres visited in order (start first); bad = the tile the failing chip bumps into
  // (edge: the boat's own tile + the direction it tried), ok = the route reaches the goal.
  function preview (def, program) {
    var out = { path: [], ok: false, failAt: null, reason: null, bad: null, end: null, stopAt: null }
    try {
      var L = create(def), r = run(L, program)
      out.ok = r.ok; out.failAt = r.failAt; out.reason = r.reason; out.stopAt = r.endAt
      out.path.push({ x: L.start.x, y: L.start.y, i: -1 })
      r.steps.forEach(function (s) {
        if (s.event === 'bump') return
        if (s.via) out.path.push({ x: s.via.x, y: s.via.y, i: s.idx })
        var l = out.path[out.path.length - 1]
        if (l.x !== s.x || l.y !== s.y) out.path.push({ x: s.x, y: s.y, i: s.idx })
      })
      var last = out.path[out.path.length - 1]
      out.end = { x: last.x, y: last.y }
      if (r.failAt != null) {
        var b = r.steps[r.steps.length - 1], t = b && b.toward
        out.bad = { idx: r.failAt, x: b ? b.x : last.x, y: b ? b.y : last.y, reason: r.reason }
        if (t && inside(L, t.x, t.y) && (t.x !== out.bad.x || t.y !== out.bad.y)) { out.bad.tx = t.x; out.bad.ty = t.y }
        else if (t && !inside(L, t.x, t.y)) out.bad.edge = b.face || null
      }
    } catch (e) { out.reason = 'invalid' }
    return out
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
    nextHint: nextHint, stars: stars, preview: preview, SAMPLES: SAMPLES, CMDS: CMDS.slice(), version: '1.1.0'
  }

  /* ===================================================================== UI */
  var EASE = 'cubic-bezier(.23,1,.32,1)'
  var STEP_MS = 450
  // library keys (resolved through opts.lib, e.g. TKArt.src). `block` may be a list: obstacles cycle through it.
  var ART = { boat: 'vehicles/sailboat', walker: 'tk-key/timmy', ice: 'tk-prop/ice-floe', flag: 'game/flag-red', crate: 'tk-prop/crate-supplies',
    timmy: 'tk-key/timmy', lighthouse: 'gt-el/lighthouse', lifeboat: 'tk-prop/lifeboat-11', tipper: 'tk-char/penguin-captain',
    compass: 'tk-prop/compass-3', undo: 'gt/undo', sparkle: 'gt-el/star-gold', block: null }
  var THEME_ART = {
    sea: { block: ['tk-prop/iceberg-5', 'tk-world/iceberg-2', 'tk-prop/iceberg-3'] },
    deck: { block: ['tk-prop/crate-plain', 'tk-prop/barrels', 'tk-char/officer-boy'] }
  }
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
    intro: 'Ayo rencanakan rutenya! Ketuk panah untuk menggerakkan kapal.',
    tip: 'Pikirkan dulu rutenya. Gunung es bisa menghalangi jalan!',
    hint1: 'Lihat tujuan yang bersinar! Coba perintah {c}.',
    hint2: 'Timmy isi satu perintah. Ayo lanjutkan!',
    hint3: 'Ikuti titik-titik ini sampai tujuan!',
    coach: 'Lihat tangan Timmy! Ketuk panah ini, lalu tekan JALAN!',
    nudgeGo: 'Rutenya sudah bagus! Tekan JALAN!',
    nudgeFix: 'Ketuk perintah yang berkedip untuk menghapusnya.'
  }
  // deck theme (mockup ui-07): Timmy walks the deck to the lifeboat; obstacles are cargo and crew
  var SAY_DECK = {
    block: 'Ups, ada barang di depan! Ubah perintah nomor {n}.',
    edge: 'Ups, itu ujung dek! Ubah perintah nomor {n}.',
    empty: 'Timmy belum membawa peti. Ubah perintah nomor {n}.',
    far: 'Timmy belum sampai di sekoci. Tambah atau ubah perintahnya!',
    win: 'Hebat! Timmy sampai di sekoci!',
    intro: 'Ayo rencanakan rutenya! Ketuk panah untuk menggerakkan Timmy.',
    tip: 'Rencanakan rutemu dulu, baru tekan JALAN!'
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

  function hasRaster (css) { return /url\(\s*['"]?(?!data:)[^)]*\.(webp|png|jpe?g|avif|gif)/i.test(String(css || '')) }

  var WAVE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40'%3E%3Cpath d='M0 20q10-7 20 0t20 0 20 0 20 0' fill='none' stroke='%23bfe3ff' stroke-opacity='.18' stroke-width='2'/%3E%3Cpath d='M-10 36q10-5 20 0t20 0 20 0 20 0 20 0' fill='none' stroke='%23bfe3ff' stroke-opacity='.1' stroke-width='2'/%3E%3C/svg%3E\")"

  var PANEL = 'background:linear-gradient(180deg,rgba(24,60,120,.94),rgba(11,34,78,.94));border:2px solid rgba(120,180,255,.42);border-radius:18px;box-shadow:0 6px 18px rgba(0,10,40,.35),inset 0 1px 0 rgba(255,255,255,.12)'
  var PARCH = 'background:linear-gradient(180deg,#f8ead0,#ecd3a0);color:#3d2810;border-radius:12px;box-shadow:inset 0 0 0 2px rgba(140,95,30,.35),inset 0 0 18px rgba(160,110,40,.25),0 4px 10px rgba(0,10,40,.35);text-shadow:none'
  var CSS = [
    '.tkg{--e:' + EASE + ';--t:56px;--bw:72px;--bh:58px;--slot:52px;--top:70px;--cmdw:240px;--sidew:210px;--both:124px;position:relative;width:100%;height:100%;min-height:0;overflow:hidden;box-sizing:border-box;',
    'font-family:"Nunito","Baloo 2",system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '.tkg--bg{background:radial-gradient(120% 70% at 50% 0%,#1d4f8f 0%,#0f2f63 55%,#0a1f45 100%)}',
    '.tkg *,.tkg *:before,.tkg *:after{box-sizing:border-box}',
    /* portrait: one column, top to bottom (mockup ui-05 / ui-07 mobile) */
    '.tkg-body{position:absolute;left:0;right:0;bottom:0;top:var(--top);display:flex;flex-direction:column;gap:6px;padding:6px 10px;padding-bottom:max(8px,env(safe-area-inset-bottom))}',
    '.tkg-chap{order:1}.tkg-plate{order:2}.tkg-sea{order:3}.tkg-cmd{order:4}.tkg-tim{order:5}.tkg-route{order:6}.tkg-tip{order:7}.tkg-foot{order:8}',
    '.tkg-bot{display:contents}',
    '.tkg-sea{flex:1 1 0;position:relative;min-height:0;min-width:0;display:flex;align-items:center;justify-content:center}',
    '.tkg--nochap .tkg-chap,.tkg--noplate .tkg-plate,.tkg--notip .tkg-tip,.tkg--nofoot .tkg-foot{display:none!important}',
    /* landscape: chapter card | title plate + board | command panel; Timmy + route + tip along the bottom */
    '.tkg--land .tkg-body{display:grid;gap:8px;padding:8px 12px;grid-template-columns:minmax(0,1fr) var(--cmdw);grid-template-rows:auto minmax(0,1fr) var(--both);grid-template-areas:"plate cmd" "sea cmd" "bot bot"}',
    '.tkg--land.tkg--short .tkg-body{grid-template-areas:"plate cmd" "sea cmd" "bot cmd"}',
    '.tkg--land.tkg--side .tkg-body{grid-template-columns:var(--sidew) minmax(0,1fr) var(--cmdw);grid-template-areas:"chap plate cmd" "chap sea cmd" "bot bot bot"}',
    '.tkg--land.tkg--side.tkg--short .tkg-body{grid-template-areas:"chap plate cmd" "chap sea cmd" "bot bot cmd"}',
    '.tkg--land .tkg-chap{grid-area:chap}.tkg--land .tkg-plate{grid-area:plate}.tkg--land .tkg-sea{grid-area:sea}.tkg--land .tkg-cmd{grid-area:cmd}',
    '.tkg--land .tkg-bot{grid-area:bot;display:flex;gap:8px;align-items:stretch;min-width:0;min-height:0}',
    '.tkg--land .tkg-foot{display:none}',
    '.tkg--land:not(.tkg--side) .tkg-chap{display:none}',
    /* chapter mini-card */
    '.tkg-chap{' + PANEL + ';display:flex;align-items:center;gap:10px;padding:6px 10px 6px 6px;flex:0 0 auto;min-width:0}',
    '.tkg-chap img{width:76px;height:46px;object-fit:contain;flex:0 0 auto;border-radius:8px;background:rgba(0,0,0,.2)}',
    '.tkg-chap .ct{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.tkg-chap b{font-size:15px;font-weight:900;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tkg-chap span{font-size:12px;font-weight:800;opacity:.85;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tkg-chap .bar{height:6px;border-radius:4px;background:rgba(0,0,0,.35);overflow:hidden;margin-top:2px}.tkg-chap .bar i{display:block;height:100%;background:linear-gradient(90deg,#3fa2ff,#7fd0ff);border-radius:4px}',
    '.tkg-chap em{flex:0 0 auto;font-style:normal;font-size:14px;font-weight:900;padding:3px 9px;border-radius:9px;background:rgba(0,0,0,.3);border:1px solid rgba(160,200,255,.4)}',
    '.tkg--land .tkg-chap{flex-direction:column;align-items:stretch;padding:8px;gap:8px;align-self:start}',
    '.tkg--land .tkg-chap img{width:100%;height:110px}',
    '.tkg--land .tkg-chap b{font-size:18px;white-space:normal}.tkg--land .tkg-chap span{font-size:13px;white-space:normal}',
    '.tkg--land .tkg-chap em{align-self:flex-start}',
    /* parchment title plate */
    '.tkg-plate{' + PARCH + ';flex:0 0 auto;text-align:center;padding:5px 14px 6px;min-width:0}',
    '.tkg-plate small{display:block;font-size:12px;font-weight:900;opacity:.8;line-height:1.2}',
    '.tkg-plate b{display:block;font-size:19px;font-weight:900;line-height:1.15;color:#2c1b08}',
    '.tkg-plate span{display:block;font-size:12px;font-weight:800;line-height:1.25;margin-top:1px}',
    '.tkg--land .tkg-plate{justify-self:center;width:min(100%,560px);padding:6px 22px 8px;border-radius:14px}',
    '.tkg--land .tkg-plate b{font-size:26px}.tkg--land .tkg-plate span{font-size:14px}.tkg--land .tkg-plate small{font-size:13px}',
    /* command panel: arrows, then Hapus + JALAN! inside it */
    '.tkg-cmd{' + PANEL + ';padding:6px 8px 8px;display:flex;flex-direction:column;gap:6px;min-height:0;min-width:0;overflow:hidden;flex:0 0 auto}',
    '.tkg-cact{display:flex;gap:8px;flex:0 0 auto}',
    '.tkg-cact.stack{display:grid;grid-template-columns:56px minmax(0,1fr)}',
    '.tkg-cact.stack .tkg-go{grid-column:1 / -1}',
    '.tkg-cact.tight .tkg-trash>span:not(.tkg-ic){display:none}',
    '.tkg-cact.tight .tkg-trash{width:56px;padding:0}',
    '.tkg-route{' + PANEL + ';padding:6px 8px 8px;min-width:0;flex:0 0 auto}',
    '.tkg--land .tkg-route{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center}',
    '.tkg-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:900;font-size:16px;line-height:1.1;text-shadow:0 1px 0 rgba(0,0,0,.35);padding:0 2px}',
    '.tkg-cmd .tkg-h{justify-content:center}',
    '.tkg-h small{font-size:13px;font-weight:800;opacity:.85}',
    '.tkg--nomax .tkg-route .tkg-h small{display:none}',
    '.tkg-count{display:inline-flex;align-items:center;gap:3px;padding:2px 10px 2px 6px;border-radius:999px;background:rgba(0,0,0,.28);font-size:16px;font-weight:900}',
    '.tkg-ic{position:relative;display:inline-grid;place-items:center;flex:0 0 auto}.tkg-ic img{width:100%;height:100%;object-fit:contain;pointer-events:none}',
    '.tkg-arw{display:block;width:70%;height:78%;background:linear-gradient(#fff3a6,#ffc93a);clip-path:polygon(50% 0,100% 48%,68% 48%,68% 100%,32% 100%,32% 48%,0 48%);filter:drop-shadow(0 1px 0 rgba(0,0,0,.35))}',
    '.tkg-arw-E{transform:rotate(90deg)}.tkg-arw-S{transform:rotate(180deg)}.tkg-arw-W{transform:rotate(270deg)}',
    '.tkg-arw.tkg-mini{position:absolute;right:-6%;bottom:-4%;width:52%;height:56%;background:linear-gradient(#b7ff9e,#35c26b)}',
    '.tkg-hdarw{width:100%;height:100%;background:linear-gradient(#fff3a6,#ffd84a);clip-path:polygon(50% 0,100% 100%,0 100%)}',
    '.tkg-bars{width:84%;height:84%;border-radius:4px;background:repeating-linear-gradient(90deg,#c08a4b 0 5px,transparent 5px 11px),linear-gradient(transparent 30%,#c08a4b 30% 38%,transparent 38% 62%,#c08a4b 62% 70%,transparent 70%)}',
    '.tkg-sw.on .tkg-ic img{filter:drop-shadow(0 0 6px #35c26b) drop-shadow(0 0 2px #35c26b)}',
    '.tkg-count .tkg-ic{width:20px;height:20px;color:#ffc93a;stroke:#b67a00;stroke-width:1.2}',
    /* board: sea = translucent water over the painted scene; deck = wooden planks */
    '.tkg-board{position:relative;border-radius:14px;overflow:hidden;background:radial-gradient(120% 90% at 30% 20%,#1f65ad 0%,#154b8a 45%,#0c3068 100%);',
    'box-shadow:0 0 0 2px rgba(150,205,255,.55),0 0 22px rgba(90,170,255,.35),0 8px 20px rgba(0,10,40,.4)}',
    '.tkg--scene .tkg-board{background:rgba(20,60,110,.55)}',
    // planks: faint horizontal boards at a third of a tile only (vertical seams read as extra grid lines)
    '.tkg--deck .tkg-board{background:repeating-linear-gradient(0deg,rgba(40,20,5,.22) 0 1px,transparent 1px calc(var(--t) / 3)),',
    'linear-gradient(180deg,#a8764a,#8a5c34 60%,#7a4f2c);box-shadow:0 0 0 3px #4a2c14,0 0 0 5px rgba(255,210,140,.35),0 10px 24px rgba(0,0,0,.5);border-radius:10px}',
    '.tkg--deck .tkg-wv{display:none}',
    '.tkg-wv{position:absolute;top:0;bottom:0;left:-80px;width:calc(100% + 160px);background-image:' + WAVE + ';background-size:80px 40px;animation:tkg-wave 7s linear infinite;pointer-events:none}',
    '.tkg-wv2{opacity:.7;background-size:80px 34px;animation-duration:11s;animation-direction:reverse;top:12px}',
    '.tkg-grid{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(200,230,255,.3) 1.5px,transparent 1.5px),linear-gradient(90deg,rgba(200,230,255,.3) 1.5px,transparent 1.5px);background-size:var(--t) var(--t);background-position:-.75px -.75px}',
    '.tkg--deck .tkg-grid{background-image:linear-gradient(rgba(255,236,200,.42) 2px,transparent 2px),linear-gradient(90deg,rgba(255,236,200,.42) 2px,transparent 2px);background-position:-1px -1px}',
    '.tkg-rose{position:absolute;width:56px;height:56px;pointer-events:none;display:none;z-index:2}',
    '.tkg-rose img{width:100%;height:100%;object-fit:contain;opacity:.92}',
    '.tkg-rose b{position:absolute;font-size:13px;font-weight:900;line-height:1;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.7)}',
    '.tkg-o{position:absolute;left:0;top:0;width:var(--t);height:var(--t);display:flex;align-items:center;justify-content:center;pointer-events:none}',
    '.tkg-o img{width:86%;height:86%;object-fit:contain;-webkit-user-drag:none;pointer-events:none}',
    '.tkg-mv{transition:transform 380ms var(--e),opacity 200ms linear}',
    '.tkg-noanim,.tkg-noanim *{transition:none!important}',
    '.tkg-blk img{width:94%;height:94%;filter:drop-shadow(0 3px 2px rgba(0,20,60,.45))}',
    '.tkg--deck .tkg-blk img{filter:drop-shadow(0 4px 3px rgba(30,12,0,.55))}',
    '.tkg-start:before{content:"";position:absolute;inset:5%;border-radius:8px;border:3px solid #ffc93a;box-shadow:0 0 10px rgba(255,201,58,.55)}',
    '.tkg--deck .tkg-start:before{border-color:#4fb4ff;background:rgba(60,160,255,.28);box-shadow:0 0 12px rgba(80,170,255,.8)}',
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
    '.tkg--deck .tkg-goal .lh{left:2%;right:2%;bottom:14%;width:96%;height:70%}',
    '.tkg--deck .tkg-goal .fl{right:2%;top:2%;bottom:auto;width:40%;height:44%}',
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
    '.tkg--deck .tkg-bob{animation:none}',
    '.tkg-boat img{width:84%;height:84%;transition:transform 260ms var(--e);filter:drop-shadow(0 3px 2px rgba(0,20,60,.5))}',
    '.tkg--deck .tkg-boat .tkg-bob>img{width:92%;height:96%}',
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
    '.tkg-gh b{width:40%;height:40%;min-width:24px;min-height:24px;border-radius:50%;background:#ffd84a;color:#0b2a55;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(255,255,255,.85)}',
    /* Timmy + speech bubble: its own row, never over the board */
    '.tkg-tim{display:flex;align-items:center;gap:8px;min-width:0;flex:0 0 auto}',
    '.tkg--land .tkg-tim{align-items:flex-end;flex:0 1 380px;min-width:250px}',
    '.tkg-bubble{position:relative;flex:1 1 auto;min-width:0;background:#fff;color:#12314f;border-radius:16px;padding:6px 12px 7px;box-shadow:0 6px 16px rgba(0,10,40,.35);',
    'font-size:14px;line-height:1.25;font-weight:800;transition:box-shadow 200ms linear;pointer-events:none}',
    '.tkg-bubble:before{content:"";position:absolute;left:-8px;top:50%;margin-top:-8px;border:8px solid transparent;border-left:0;border-right-color:#fff}',
    '.tkg--land .tkg-bubble{align-self:center;margin-bottom:6px}',
    '.tkg--short .tkg-bubble{font-size:13px;padding:5px 10px 6px}',
    '.tkg--short .tkg-tim{flex-basis:330px}',
    '.tkg-bubble.bad{box-shadow:0 6px 16px rgba(0,10,40,.35),inset 5px 0 0 #ff9f1c}',
    '.tkg-bubble.good{box-shadow:0 6px 16px rgba(0,10,40,.35),inset 5px 0 0 #2fbf71}',
    '.tkg-bubble.on{animation:tkg-pop 240ms var(--e)}',
    '.tkg-bubble em{display:inline-block;font-style:normal;font-size:12px;font-weight:900;color:#fff;background:#1d5fc0;border-radius:8px;padding:1px 8px;margin-bottom:2px}',
    '.tkg-bubble span{display:block}',
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
    '.tkg-slots{display:flex;flex-wrap:nowrap;gap:6px;padding-top:6px;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;padding-bottom:2px;-webkit-overflow-scrolling:touch}',
    '.tkg-slots.wig{animation:tkg-wig 360ms var(--e)}',
    '.tkg-chip{position:relative;width:var(--bw);height:var(--bh);min-width:44px;min-height:44px;padding:0;border:2px solid rgba(170,210,255,.75);border-radius:14px;color:#fff;cursor:grab;',
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font-family:inherit;font-weight:900;font-size:12px;line-height:1;letter-spacing:.2px;',
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
    '.tkg-num{position:absolute;left:-4px;top:-4px;min-width:20px;height:20px;padding:0 4px;border-radius:10px;background:#fff;color:#12314f;font-size:12px;line-height:20px;text-shadow:none;box-shadow:0 1px 0 rgba(0,0,0,.25)}',
    '.tkg-slot{width:var(--slot);height:var(--slot);flex:0 0 auto;border-radius:12px;background:rgba(0,12,40,.35);border:2px solid rgba(140,190,255,.3);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:rgba(200,225,255,.45)}',
    '.tkg-ins{box-shadow:-6px 0 0 -1px #ffd84a,0 4px 0 #123f8f}',
    '.tkg-slot.tkg-ins{border-color:#ffd84a;color:#ffd84a}',
    '.tkg-pop{animation:tkg-pop 260ms var(--e)}',
    '.tkg-run{transform:translateY(-3px) scale(1.06);box-shadow:0 0 0 3px #fff,0 0 0 6px #ffd84a}',
    '.tkg-chip--bad{box-shadow:0 0 0 3px #fff,0 0 0 6px #ff9f1c;animation:tkg-wig 420ms var(--e) 2}',
    '.tkg-chip--hint:after{content:"";position:absolute;inset:-6px;border-radius:18px;border:4px solid #ffd84a;animation:tkg-ring 1s var(--e) infinite}',
    '.tkg-lift{opacity:.3}',
    /* ghost preview: where the boat WILL go (dots), the failing step in soft orange, a faint boat at the end */
    '.tkg-path{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2;overflow:visible;transition:opacity 200ms linear}',
    '.tkg--busy .tkg-path,.tkg--won .tkg-path,.tkg--busy .tkg-gb,.tkg--won .tkg-gb{opacity:0!important}',
    '.tkg-path .ln{fill:none;stroke:rgba(255,255,255,.92);stroke-width:.14;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:.001 .24;filter:drop-shadow(0 0 .04px rgba(0,20,60,.8))}',
    '.tkg-path .nd{fill:#fff;stroke:rgba(0,30,70,.45);stroke-width:.025}',
    '.tkg-path.ok .ln{stroke:#ffe27a}.tkg-path.ok .nd{fill:#ffe27a}',
    '.tkg--deck .tkg-path .ln{stroke:#fffbe8}',
    '.tkg-path .bad{fill:rgba(255,159,28,.28);stroke:#ffa53a;stroke-width:.06;stroke-dasharray:.16 .1}',
    '.tkg-path .bl{fill:none;stroke:#ffa53a;stroke-width:.11;stroke-linecap:round;stroke-dasharray:.001 .2}',
    '.tkg-gb{z-index:4;opacity:.42;transition:transform 300ms var(--e),opacity 200ms linear}',
    '.tkg-gb.off{opacity:0}',
    '.tkg-gb img{width:74%;height:74%;filter:saturate(.6) brightness(1.25)}',
    '.tkg-gb[data-face=W] img{transform:scaleX(-1)}',
    '.tkg-chip--pbad{box-shadow:0 0 0 3px #ffa53a,0 4px 0 #123f8f;border-color:#ffd3a0}',
    /* idle help: the next useful thing breathes (no auto-fill) */
    '.tkg-chip--nudge,.tkg-btn.tkg-chip--nudge{animation:tkg-nudge 1.2s var(--e) infinite}',
    '.tkg-chip--nudge:after{content:"";position:absolute;inset:-6px;border-radius:18px;border:3px solid rgba(255,255,255,.9);animation:tkg-ring 1.2s var(--e) infinite;pointer-events:none}',
    '.tkg-pchip.tkg-chip--nudge:after{border-color:#ffa53a}',
    /* first-time coach: a pointing hand (CSS shapes) taps the right arrow, then JALAN! */
    '.tkg-coach{position:absolute;inset:0;z-index:30;pointer-events:none;opacity:0;transition:opacity 220ms linear}',
    '.tkg-coach.on{opacity:1}',
    '.tkg-hand{position:absolute;left:0;top:0;width:64px;height:84px;transition:transform 720ms var(--e);will-change:transform}',
    '.tkg-hand.jump{transition:none}',
    '.tkg-hin{position:absolute;inset:0;transform-origin:24px 3px;transform:rotate(-14deg);filter:drop-shadow(0 6px 6px rgba(0,10,40,.45))}',
    '.tkg-hand.dn .tkg-hin{transform:rotate(166deg)}',
    '.tkg-hand.tap .tkg-hin{animation:tkg-tap 520ms var(--e)}',
    '.tkg-hand.dn.tap .tkg-hin{animation-name:tkg-tapdn}',
    '.tkg-hin i{position:absolute;display:block;box-sizing:border-box;background:linear-gradient(180deg,#ffe2c2,#ffc995);border:3px solid #9a5a2c}',
    '.tkg-hin .f{left:14px;top:0;width:21px;height:48px;border-radius:11px 11px 7px 7px;z-index:3}',
    '.tkg-hin .f:after{content:"";position:absolute;left:3px;top:3px;width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.6)}',
    '.tkg-hin .k1,.tkg-hin .k2,.tkg-hin .k3{top:30px;width:16px;height:22px;border-radius:8px;z-index:2}',
    '.tkg-hin .k1{left:30px}.tkg-hin .k2{left:40px;top:33px}.tkg-hin .k3{left:49px;top:37px;height:20px}',
    '.tkg-hin .p{left:7px;top:36px;width:56px;height:36px;border-radius:12px 16px 22px 22px;z-index:1}',
    '.tkg-hin .t{left:1px;top:42px;width:26px;height:17px;border-radius:9px;transform:rotate(-28deg);z-index:4}',
    '.tkg-hin .c{left:12px;top:66px;width:46px;height:17px;border-radius:6px;background:linear-gradient(180deg,#5aa4ff,#2463c9);border-color:#123f8f;z-index:0}',
    '.tkg-rip{position:absolute;left:0;top:0;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;border:4px solid #fff;pointer-events:none;animation:tkg-splash 700ms var(--e) forwards}',
    '.tkg-cpress{transform:scale(.96)!important}',
    '.tkg-skip{min-width:92px;height:48px;min-height:48px;padding:0 14px;background:rgba(0,12,40,.72);border-color:rgba(255,255,255,.7);font-size:16px;box-shadow:0 4px 0 rgba(0,0,0,.3)}',
    /* celebrate: sparkle per good step, star burst on success (owner star sprites) */
    '.tkg-spk{position:absolute;left:50%;top:50%;width:46%;height:46%;margin:-23% 0 0 -23%;pointer-events:none;filter:drop-shadow(0 0 6px rgba(255,236,150,.9))}',
    '.tkg-spk img,.tkg-conf img{width:100%;height:100%;object-fit:contain}',
    '.tkg-conf{position:absolute;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;z-index:26;pointer-events:none;filter:drop-shadow(0 0 5px rgba(255,226,120,.85))}',
    '.tkg-ghost{position:fixed;left:0;top:0;z-index:9999;pointer-events:none;opacity:.95;box-shadow:0 10px 20px rgba(0,0,0,.35)}',
    '.tkg-btn{position:relative;flex:0 0 auto;min-width:48px;height:56px;border:2px solid rgba(255,255,255,.5);border-radius:14px;padding:0 12px;display:flex;align-items:center;justify-content:center;gap:6px;',
    'font-family:inherit;font-weight:900;font-size:17px;line-height:1;color:#fff;cursor:pointer;text-shadow:0 1px 0 rgba(0,0,0,.3);transition:transform 160ms var(--e),opacity 160ms linear}',
    '.tkg-btn:active{transform:scale(.96)}',
    '.tkg-btn .tkg-ic{width:24px;height:24px;flex:0 0 auto}',
    '.tkg-go{flex:1 1 auto;min-width:96px;background:linear-gradient(180deg,#48d465,#1f9a3f);box-shadow:0 5px 0 #146e2d,inset 0 1px 0 rgba(255,255,255,.4);font-size:22px;letter-spacing:.5px}',
    '.tkg-go .tkg-ic{width:28px;height:28px}',
    '.tkg-cact.stack .tkg-btn{width:100%}.tkg-cact.stack .tkg-go{height:62px}',
    /* Undo = hapus satu (owner sprite gt/undo) */
    '.tkg-undo{width:56px;min-width:56px;padding:0;background:linear-gradient(180deg,#ffffff,#d9e6f7);border-color:#fff;box-shadow:0 5px 0 #7f98bd,inset 0 1px 0 #fff}',
    '.tkg-undo .tkg-ic{width:36px;height:36px}',
    '.tkg-cact.stack .tkg-undo{width:56px}',
    '.tkg-btn span{white-space:nowrap}',
    '.tkg-cact:not(.stack) .tkg-trash{padding:0 10px;font-size:15px;gap:4px}.tkg-cact:not(.stack) .tkg-go{padding:0 8px;font-size:20px;min-width:0}',
    '.tkg--short .tkg-route{padding:4px 8px 6px}.tkg--short .tkg-slots{padding-top:4px}',
    '.tkg-trash{background:linear-gradient(180deg,#ef5a5f,#b92b31);box-shadow:0 5px 0 #7d1a1f,inset 0 1px 0 rgba(255,255,255,.35)}',
    /* big Timmy = the hint button */
    '.tkg-hintb{width:64px;height:64px;min-width:64px;padding:0;border:0;border-radius:18px;background:none;overflow:visible;box-shadow:none}',
    '.tkg-hintb img{position:absolute;left:50%;bottom:0;width:120%;height:118%;margin-left:-60%;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 4px 4px rgba(0,10,40,.45))}',
    '.tkg--land .tkg-hintb{width:var(--timw,64px);height:var(--timh,64px);align-self:flex-end}',
    '.tkg--land .tkg-hintb img{width:100%;height:100%;margin-left:-50%}',
    '.tkg-hintb i{position:absolute;right:-6px;top:-4px;width:28px;height:28px;border-radius:50%;background:#ffd84a;color:#6b4a00;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 0 rgba(0,0,0,.3);z-index:1}',
    '.tkg-hintb i .tkg-ic{width:18px;height:18px}',
    /* penguin tip card */
    '.tkg-tip{' + PARCH + ';display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;font-size:13px;line-height:1.25;font-weight:800;flex:0 0 auto;min-width:0}',
    '.tkg-tip div{flex:1 1 auto;min-width:0}',
    '.tkg-tip b{display:block;font-size:14px;font-weight:900}',
    '.tkg-tip img{width:52px;height:56px;object-fit:contain;flex:0 0 auto}',
    '.tkg--land .tkg-tip{flex:0 0 max(var(--cmdw),270px);align-self:stretch}',
    '.tkg--land .tkg-tip img{width:70px;height:88px}',
    /* portrait footer */
    '.tkg-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:0 0 auto}',
    '.tkg-foot .tkg-btn{height:48px;min-width:96px;padding:0 10px;font-size:15px;background:linear-gradient(180deg,#2c5aa0,#173a78);border-color:rgba(150,200,255,.55);box-shadow:0 4px 0 #0d2552}',
    '.tkg-foot .tkg-next{background:linear-gradient(180deg,#ffe07a,#f5b82e);color:#3b2600;text-shadow:none;border-color:#fff3c0;box-shadow:0 4px 0 #b07a0c}',
    '.tkg-foot>span{flex:0 1 auto;min-width:0;padding:6px 10px;border-radius:10px;background:rgba(0,12,40,.6);font-size:14px;line-height:1.15;font-weight:900;text-shadow:0 1px 0 rgba(0,0,0,.4);text-align:center}',
    '.tkg-foot .tkg-btn i{display:block;width:18px;height:16px;background:currentColor;clip-path:polygon(0 50%,50% 0,50% 32%,100% 32%,100% 68%,50% 68%,50% 100%)}',
    '.tkg-foot .tkg-next i{transform:scaleX(-1)}',
    '.tkg-foot .tkg-btn[hidden]{visibility:hidden;display:flex}',
    '.tkg--busy .tkg-pal .tkg-chip,.tkg--busy .tkg-cact .tkg-btn,.tkg--busy .tkg-hintb,.tkg--won .tkg-pal .tkg-chip,.tkg--won .tkg-slots .tkg-chip,.tkg--won .tkg-cact .tkg-btn,.tkg--won .tkg-hintb{opacity:.55;pointer-events:none}',
    '.tkg--busy .tkg-slots .tkg-chip{pointer-events:none}',
    '@keyframes tkg-wave{from{transform:translate3d(0,0,0)}to{transform:translate3d(80px,0,0)}}',
    '@keyframes tkg-bob{0%,100%{transform:translateY(-3%) rotate(-2deg)}50%{transform:translateY(3%) rotate(2deg)}}',
    '@keyframes tkg-flow{0%{transform:translateX(-24%);opacity:.45}45%{opacity:1}100%{transform:translateX(24%);opacity:.45}}',
    '@keyframes tkg-ring{0%{transform:scale(.92);opacity:1}100%{transform:scale(1.12);opacity:0}}',
    '@keyframes tkg-spin{to{transform:rotate(360deg)}}',
    '@keyframes tkg-wake{0%{transform:scale(.5);opacity:.9}100%{transform:scale(1.5);opacity:0}}',
    '@keyframes tkg-splash{0%{transform:scale(.3);opacity:1}100%{transform:scale(2.2);opacity:0}}',
    '@keyframes tkg-pop{0%{transform:scale(.8);opacity:.4}100%{transform:scale(1);opacity:1}}',
    '@keyframes tkg-nudge{0%,100%{transform:scale(1)}40%{transform:scale(1.07)}}',
    '@keyframes tkg-tap{0%,100%{transform:rotate(-14deg)}45%{transform:rotate(-14deg) translateY(7px) scale(.9)}}',
    '@keyframes tkg-tapdn{0%,100%{transform:rotate(166deg)}45%{transform:rotate(166deg) translateY(7px) scale(.9)}}',
    '@keyframes tkg-wig{0%,100%{transform:rotate(0)}25%{transform:rotate(-7deg)}75%{transform:rotate(7deg)}}',
    '.tkg--rm *,.tkg--rm *:before,.tkg--rm *:after{animation:none!important}',
    '.tkg--rm .tkg-mv,.tkg--rm .tkg-boat,.tkg--rm .tkg-hd,.tkg--rm .tkg-boat img,.tkg--rm .tkg-chip,.tkg--rm .tkg-btn{transition:opacity 140ms linear!important}',
    '.tkg--rm .tkg-win{transition:opacity 160ms linear!important;transform:translate(-50%,-50%)}',
    '.tkg--rm .tkg-run{transform:none}',
    '.tkg--rm .tkg-hand{transition:none}',
    '.tkg--rm .tkg-chip--nudge{box-shadow:0 0 0 3px #fff,0 0 0 6px #ffd84a}',
    '.tkg--rm .tkg-pchip.tkg-chip--nudge{box-shadow:0 0 0 3px #fff,0 0 0 6px #ffa53a}'
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
    if (!(opts.art && opts.art.walker) && opts.art && opts.art.timmy) art.walker = opts.art.timmy
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
    // theme + per-board art: opts win, then the level definition (TKWorlds puts theme/blockArt/scene on it)
    var theme = (opts.theme || def.theme) === 'deck' ? 'deck' : 'sea'
    var say$ = {}
    for (var sk in SAY) say$[sk] = (theme === 'deck' && SAY_DECK[sk]) || SAY[sk]
    function keyList (v) { return (Object.prototype.toString.call(v) === '[object Array]' ? v : [v]).filter(function (k) { return typeof k === 'string' && k }) }
    var blockKeys = keyList((opts.art && opts.art.block) || def.blockArt)
    if (!blockKeys.length) blockKeys = THEME_ART[theme].block
    if (!(opts.art && opts.art.crate) && def.itemArt) art.crate = def.itemArt
    function libSrc (k) { var u = null; try { u = lib(k) } catch (e) { u = null } return u || defLib(k) }
    var bg = opts.bg != null ? opts.bg : def.bg
    var TKA = G.TKArt && typeof G.TKArt.scene === 'function' ? G.TKArt : null
    if (bg == null && TKA) { try { bg = TKA.scene(def.scene || (theme === 'deck' ? 'ship-deck' : 'harbor-day')) } catch (e) { bg = null } }
    // a backdrop with no painted picture in it (only gradients / the drawn SVG fallback, e.g. 'bedroom-night',
    // which has no owner backdrop) left the board on plain navy on a real tablet: use a painted harbour/deck
    if (typeof bg === 'string' && bg && TKA && !hasRaster(bg)) {
      try { var pb = TKA.scene(theme === 'deck' ? 'ship-deck' : 'harbor-day'); if (hasRaster(pb)) bg = pb } catch (e) {}
    }
    var chapter = opts.chapter && typeof opts.chapter === 'object' ? opts.chapter : null
    // chapterCard:false = the host already shows a chapter card beside the module (no duplicate card here;
    // the plate label + portrait footer still use opts.chapter)
    var showChap = !!chapter && opts.chapterCard !== false

    /* ── DOM ── */
    var root = el('div', 'tkg' + (rm ? ' tkg--rm' : '') + (theme === 'deck' ? ' tkg--deck' : '') +
      (typeof bg === 'string' && bg ? ' tkg--scene' : (bg === false ? '' : ' tkg--bg')))
    if (typeof bg === 'string' && bg) root.style.background = bg
    root.setAttribute('data-level', L.id || '')
    root.setAttribute('data-theme', theme)
    root.style.setProperty('--top', topInset + 'px')
    var body = el('div', 'tkg-body')

    // chapter mini-card (portrait: a row at the top · wide landscape: the left column)
    var chap = el('div', 'tkg-chap')
    if (chapter) {
      var cIdx = Math.max(0, int(chapter.idx, 0)), cTot = Math.max(0, int(chapter.total, 0))
      if (chapter.ship) chap.appendChild(img(String(chapter.ship).indexOf('/') >= 0 && !/^(data:|https?:|\/)/.test(chapter.ship) ? libSrc(chapter.ship) : chapter.ship, '', ''))
      var ct = el('div', 'ct'), cb = el('b'), cs = el('span')
      cb.textContent = str(chapter.name || chapter.title); cs.textContent = str(chapter.name ? chapter.title : chapter.value)
      ct.appendChild(cb); if (cs.textContent) ct.appendChild(cs)
      if (cTot) { var bar = el('div', 'bar'), bi = el('i'); bi.style.width = Math.round(100 * Math.min(cIdx, cTot) / cTot) + '%'; bar.appendChild(bi); ct.appendChild(bar) }
      chap.appendChild(ct)
      if (cTot) { var ce = el('em'); ce.textContent = cIdx + '/' + cTot; chap.appendChild(ce) }
    }
    // parchment title plate
    var plate = el('div', 'tkg-plate')
    var plateBig = str(opts.title || L.title || 'Latihan Navigasi'), plateSub = str(opts.mission || L.mission || defaultMission())
    if (chapter && chapter.label) { var pl = el('small'); pl.textContent = str(chapter.label); plate.appendChild(pl) }
    var pb = el('b'); pb.textContent = plateBig; plate.appendChild(pb)
    if (plateSub && plateSub !== plateBig && opts.chapterCard !== false) { var ps = el('span'); ps.textContent = plateSub; plate.appendChild(ps) }

    var sea = el('div', 'tkg-sea'), board = el('div', 'tkg-board')
    board.setAttribute('role', 'img'); board.setAttribute('aria-label', (theme === 'deck' ? 'Papan dek ' : 'Papan laut ') + L.w + ' kali ' + L.h)
    board.appendChild(el('div', 'tkg-wv')); board.appendChild(el('div', 'tkg-wv tkg-wv2')); board.appendChild(el('div', 'tkg-grid'))
    var SVGNS = 'http://www.w3.org/2000/svg'
    var pathSvg = document.createElementNS(SVGNS, 'svg')
    pathSvg.setAttribute('class', 'tkg-path'); pathSvg.setAttribute('aria-hidden', 'true')
    pathSvg.setAttribute('viewBox', '0 0 ' + L.w + ' ' + L.h); pathSvg.setAttribute('preserveAspectRatio', 'none')
    board.appendChild(pathSvg)
    sea.appendChild(board)
    var rose = el('div', 'tkg-rose', '<b style="left:50%;top:-15px;margin-left:-5px">U</b><b style="left:50%;bottom:-15px;margin-left:-5px">S</b><b style="left:-13px;top:50%;margin-top:-6px">B</b><b style="right:-12px;top:50%;margin-top:-6px">T</b>')
    rose.insertBefore(img(src('compass')), rose.firstChild)
    rose.setAttribute('aria-hidden', 'true')
    sea.appendChild(rose)
    var win = el('div', 'tkg-win'); win.appendChild(el('b', '', 'Hebat!'))
    var winStars = el('div'); win.appendChild(winStars); sea.appendChild(win)

    var cmd = el('div', 'tkg-cmd'); cmd.appendChild(el('div', 'tkg-h', 'Perintah'))
    var pal = el('div', 'tkg-pal'); pal.setAttribute('aria-label', 'Pilihan perintah'); cmd.appendChild(pal)
    var cact = el('div', 'tkg-cact')
    var undoB = el('button', 'tkg-btn tkg-undo', wrapIc('')); undoB.type = 'button'; undoB.setAttribute('aria-label', 'Hapus satu perintah terakhir')
    undoB.firstChild.appendChild(img(src('undo')))
    var trashB = el('button', 'tkg-btn tkg-trash', wrapIc(ic('trash')) + '<span>Hapus</span>'); trashB.type = 'button'; trashB.setAttribute('aria-label', 'Hapus semua perintah')
    var goB = el('button', 'tkg-btn tkg-go', wrapIc(ic('go')) + '<span>JALAN!</span>'); goB.type = 'button'; goB.setAttribute('aria-label', theme === 'deck' ? 'Jalankan Timmy' : 'Jalankan kapal')
    cact.appendChild(undoB); cact.appendChild(trashB); cact.appendChild(goB); cmd.appendChild(cact)

    // bottom band: big Timmy (tap = hint) + his speech bubble · route · penguin tip
    var bot = el('div', 'tkg-bot')
    var tim = el('div', 'tkg-tim')
    var hintB = el(opts.hintButton === false ? 'div' : 'button', 'tkg-btn tkg-hintb')
    if (opts.hintButton !== false) { hintB.type = 'button'; hintB.setAttribute('aria-label', 'Petunjuk dari Timmy') }
    hintB.appendChild(img(src('timmy'), '', 'Timmy'))
    if (opts.hintButton !== false) hintB.appendChild(el('i', '', wrapIc(ic('hint'))))
    var bubble = el('div', 'tkg-bubble'); bubble.setAttribute('role', 'status'); bubble.setAttribute('aria-live', 'polite')
    var bTxt = el('span'); bubble.appendChild(el('em', '', 'Timmy')); bubble.appendChild(bTxt)
    tim.appendChild(hintB); tim.appendChild(bubble)

    var route = el('div', 'tkg-route')
    var rh = el('div', 'tkg-h')
    var rTitle = el('span'); rTitle.innerHTML = 'Rutemu <small>(maks ' + L.maxLen + ' langkah)</small>'
    var count = el('span', 'tkg-count', '<i class="tkg-ic" aria-hidden="true">' + ic('star') + '</i>'); count.setAttribute('aria-label', 'Bintang')
    var countN = el('span'); countN.textContent = String(int(opts.starBase, 0)); count.appendChild(countN)
    rh.appendChild(rTitle); rh.appendChild(count); route.appendChild(rh)
    var slots = el('div', 'tkg-slots'); slots.setAttribute('aria-label', theme === 'deck' ? 'Rute Timmy' : 'Rute kapal'); route.appendChild(slots)

    var tip = el('div', 'tkg-tip')
    var tipTxt = el('div'); tipTxt.innerHTML = '<b>Tips Asisten Pinguin:</b>'
    // the default tip names what actually blocks THIS board (a Vasa board of rock arches said "Gunung es")
    var bj = blockKeys.join(' '), defTip = !L.blocks.length ? 'Pikirkan dulu rutenya, lalu tekan JALAN!'
      : /ice|es\b|berg/.test(bj) ? say$.tip : theme === 'deck' ? 'Pikirkan dulu rutenya. Barang di dek menghalangi jalan!'
        : /rock|arch|cliff|reef|karang|stone/.test(bj) ? 'Pikirkan dulu rutenya. Batu karang menghalangi jalan!' : 'Pikirkan dulu rutenya. Cari jalan yang kosong!'
    var tipSpan = el('span'); tipSpan.textContent = str(opts.tip || defTip); tipTxt.appendChild(tipSpan)
    tip.appendChild(tipTxt); tip.appendChild(img(src('tipper'), '', 'Asisten Pinguin'))
    bot.appendChild(tim); bot.appendChild(route); bot.appendChild(tip)

    // footer (portrait): Kembali · Level X dari Y · Lanjut — each part only when the host gives it
    var foot = el('div', 'tkg-foot')
    var backB = el('button', 'tkg-btn tkg-back', '<i></i><span>Kembali</span>'); backB.type = 'button'
    var lvTxt = el('span'); lvTxt.textContent = chapter && int(chapter.total, 0) ? 'Level ' + Math.max(1, int(chapter.idx, 1)) + ' dari ' + int(chapter.total, 0) : ''
    var nextB = el('button', 'tkg-btn tkg-next', '<span>Lanjut</span><i></i>'); nextB.type = 'button'
    if (typeof opts.onBack !== 'function') backB.hidden = true
    if (typeof opts.onNext !== 'function') nextB.hidden = true
    foot.appendChild(backB); foot.appendChild(lvTxt); foot.appendChild(nextB)
    var hasFoot = !backB.hidden || !nextB.hidden || !!lvTxt.textContent
    function hostCall (fn) { return function () { if (dead) return; sfx('click'); try { fn() } catch (e) { if (G.console) console.error('[TKGrid] footer', e) } } }
    if (!backB.hidden) backB.addEventListener('click', hostCall(opts.onBack))
    if (!nextB.hidden) nextB.addEventListener('click', hostCall(opts.onNext))

    if (showChap) body.appendChild(chap)
    body.appendChild(plate); body.appendChild(sea); body.appendChild(cmd); body.appendChild(bot)
    if (hasFoot) body.appendChild(foot)
    root.appendChild(body)
    if (!showChap) root.classList.add('tkg--nochap')
    if (!hasFoot) root.classList.add('tkg--nofoot')

    function defaultMission () {
      if (L.items.length) return L.drop ? 'Ambil peti, lalu antar ke tanda kuning!' : 'Ambil semua peti, lalu ke bendera!'
      return theme === 'deck' ? 'Bantu Timmy sampai ke sekoci dengan selamat!' : 'Bawa kapal ke bendera. Hati-hati, gunung es menghalangi!'
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
      O.goal.appendChild(img(src(theme === 'deck' ? 'lifeboat' : 'lighthouse'), 'lh', theme === 'deck' ? 'Sekoci' : 'Mercusuar'))
      O.goal.appendChild(img(src('flag'), 'fl'))
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
    var nb = 0
    L.blocks.forEach(function (b) {
      if (gateKeys[b.y * L.w + b.x]) return
      var e = obj('tkg-blk', b.x, b.y); e.appendChild(img(libSrc(blockKeys[(b.x * 7 + b.y * 3 + nb++) % blockKeys.length])))
    })
    L.ice.forEach(function (o) {
      o.path.forEach(function (p) { var d = el('div', 'tkg-idot'); d._x = p.x; d._y = p.y; board.appendChild(d) })
    })
    L.items.forEach(function (it) { O.item.push(spriteObj('tkg-item tkg-mv', 'crate', it.x, it.y)) })
    L.ice.forEach(function (o) { O.imv.push(spriteObj('tkg-imv tkg-mv', 'ice', o.path[0].x, o.path[0].y)) })
    var boat = obj('tkg-boat', L.start.x, L.start.y)
    var bump = el('div', 'tkg-bump'), bob = el('div', 'tkg-bob'), hd = el('div', 'tkg-hd', wrapIc(arw('N', 'tkg-hdarw')))
    var carry = el('div', 'tkg-carry'); carry.appendChild(img(src('crate')))
    bob.appendChild(img(src(theme === 'deck' ? 'walker' : 'boat'), '', theme === 'deck' ? 'Timmy' : 'Kapal')); bob.appendChild(carry); bump.appendChild(hd); bump.appendChild(bob); boat.appendChild(bump)

    var gboat = obj('tkg-gb off', L.start.x, L.start.y)
    gboat.appendChild(img(src(theme === 'deck' ? 'walker' : 'boat')))
    gboat.setAttribute('aria-hidden', 'true')

    // coach layer (hand) — above everything, never catches taps
    var coach = el('div', 'tkg-coach'), hand = el('div', 'tkg-hand jump'), hin = el('div', 'tkg-hin', '<i class="c"></i><i class="p"></i><i class="k1"></i><i class="k2"></i><i class="k3"></i><i class="f"></i><i class="t"></i>')
    hand.appendChild(hin); coach.appendChild(hand); coach.setAttribute('aria-hidden', 'true')
    var skipB = el('button', 'tkg-btn tkg-skip', '<span>Lewati</span>'); skipB.type = 'button'; skipB.setAttribute('aria-label', 'Lewati petunjuk tangan')
    root.appendChild(coach)

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
    var MIN_T = 40, MAX_T = 160, FILL = 0.94, ROSE = 84
    // the board fills ~94 % of the free play area (owner, real tablet 2026-09-28: a 3x3 board sat tiny in
    // the middle). The compass rose only claims its own strip when that costs the board < 10 %.
    function fit (w, h) { return Math.floor(Math.min(w * FILL / L.w, h * FILL / L.h, MAX_T)) }
    function tileFor () {
      var aw = sea.clientWidth - 4, ah = sea.clientHeight - 4
      var t0 = fit(aw, ah), ts = fit(aw - ROSE, ah), tt = fit(aw, ah - ROSE), T = t0, rose = ''
      if (ts >= t0 * 0.9 && ts >= tt) { T = ts; rose = 'side' }
      else if (tt >= t0 * 0.9) { T = tt; rose = 'top' }
      return { aw: aw, ah: ah, T: Math.max(20, T), rose: rose }
    }
    function layout () {
      if (dead) return
      var W = root.clientWidth, H = root.clientHeight - topInset
      if (!W || H <= 0) return
      var land = W > H * 1.15 && W >= 560
      root.classList.toggle('tkg--land', land)
      // the painted backdrop follows the frame: tk-scene/<name>-land|-port swaps on rotation
      if (typeof bg === 'string' && /tk-scene\/[\w-]+-(land|port)\./.test(bg)) {
        var want = H > W ? 'port' : 'land', nb = bg.replace(/(tk-scene\/[\w-]+-)(land|port)(\.)/g, '$1' + want + '$3')
        if (nb !== bg) { bg = nb; root.style.background = bg }
      }
      var n = L.tools.length, bw, bh, cols
      if (land) {
        var tall = H >= 540
        var side = showChap && W >= 1000
        root.classList.toggle('tkg--short', !tall)
        root.classList.toggle('tkg--side', side)
        root.classList.toggle('tkg--noplate', H < 470)
        var botH = tall ? 124 : 98
        root.style.setProperty('--both', botH + 'px')
        root.style.setProperty('--timw', (tall ? 112 : 64) + 'px'); root.style.setProperty('--timh', (tall ? botH : 72) + 'px')
        bh = tall ? 68 : 64
        var colH = H - 16 - (tall ? botH + 8 : 0)
        for (cols = 1; cols <= 4; cols++) {
          var rows = Math.ceil(n / cols), actH = cols === 1 ? 56 + 6 + 62 : 56
          if (30 + 16 + rows * (bh + 6) + actH <= colH) break
        }
        cols = Math.min(Math.max(cols, 1), 4, n)
        if (cols === 1 && n > 5) cols = 2
        var cmdw = cols === 1 ? 200 : Math.max(284, cols * 70 + 26)
        bw = Math.min(cols === 1 ? 150 : 110, Math.floor((cmdw - 20 - (cols - 1) * 6) / cols))
        root.style.setProperty('--cmdw', cmdw + 'px')
        root.style.setProperty('--sidew', (W >= 1200 ? 220 : 196) + 'px')
        cact.classList.toggle('stack', cols === 1)
        cact.classList.toggle('tight', cols !== 1 && cmdw < 320)
        // the tip card needs a real route bar beside it
        root.classList.toggle('tkg--notip', !tall || W - Math.max(cmdw, 270) - 380 - 40 < 6 * 58)
      } else {
        root.classList.remove('tkg--short'); root.classList.remove('tkg--side'); cact.classList.remove('stack')
        cols = Math.min(4, n)
        bh = 64
        bw = Math.max(64, Math.min(96, Math.floor((W - 40 - (cols - 1) * 6) / cols)))
        cact.classList.toggle('tight', W < 340)
        root.classList.remove('tkg--noplate'); root.classList.remove('tkg--notip')
        if (!showChap) root.classList.add('tkg--nochap'); else root.classList.remove('tkg--nochap')
      }
      root.style.setProperty('--slot', (land ? (H >= 540 ? 52 : 48) : 48) + 'px')
      root.style.setProperty('--cols', String(cols))
      root.style.setProperty('--bw', bw + 'px'); root.style.setProperty('--bh', bh + 'px')
      if (!land) {
        // portrait: give the board room first — drop the tip, then the plate, then the chapter card
        var drop = ['tkg--notip', 'tkg--noplate', 'tkg--nochap']
        for (var di = 0; di < drop.length && tileFor().T < MIN_T + 4; di++) root.classList.add(drop[di])
      }
      root.classList.toggle('tkg--nomax', route.clientWidth > 0 && route.clientWidth < 330)
      var tf = tileFor(), T = tf.T
      var k = T + ':' + land + ':' + W + ':' + H + ':' + tf.aw + ':' + tf.ah
      if (k === lastKey) return
      lastKey = k
      st.T = T
      root.style.setProperty('--t', T + 'px')
      board.style.width = (T * L.w) + 'px'; board.style.height = (T * L.h) + 'px'
      root.classList.add('tkg-noanim')
      placeAll()
      placeRose(tf.aw, tf.ah, T, tf.rose)
      void root.offsetWidth
      root.classList.remove('tkg-noanim')
    }
    // the rose gets a strip beside (or above) the board: a margin on the board keeps the pair centred in the sea
    function placeRose (aw, ah, T, where) {
      var bwp = T * L.w, bhp = T * L.h, sx, sy
      board.style.marginRight = where === 'side' ? ROSE + 'px' : ''
      board.style.marginTop = where === 'top' ? ROSE + 'px' : ''
      if (where === 'side') {
        sx = (aw - bwp - ROSE) / 2 + 2; sy = (ah - bhp) / 2 + 2
        rose.style.display = 'block'; rose.style.left = Math.round(sx + bwp + 16) + 'px'; rose.style.top = Math.round(sy + 16) + 'px'
      } else if (where === 'top') {
        sx = (aw - bwp) / 2 + 2; sy = (ah - bhp - ROSE) / 2 + 2 + ROSE
        rose.style.display = 'block'; rose.style.left = Math.round(sx + bwp - 70) + 'px'; rose.style.top = Math.round(sy - 74) + 'px'
      } else rose.style.display = 'none'
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

    /* ── bubble: Timmy's own row, so it never covers the board. A timed message falls back to the idle line. ── */
    var bubbleT = null
    var idleMsg = str(opts.hint || L.hint || (hasAbs ? say$.intro : defaultMission()))
    function setBubble (text, cls) {
      bTxt.textContent = text
      bubble.className = 'tkg-bubble' + (cls ? ' ' + cls : '')
    }
    function say (text, kind, ms) {
      st.msg = text
      setBubble(text, 'on' + (kind ? ' ' + kind : ''))
      if (bubbleT) { clearTimeout(bubbleT); bubbleT = null }
      if (ms) bubbleT = setTimeout(function () { if (!dead) hush() }, ms)
    }
    function hush () { if (bubbleT) { clearTimeout(bubbleT); bubbleT = null } setBubble(idleMsg, '') }

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
      // keep the chip in play in view; otherwise the next empty slot (where a new command lands)
      var focus = st.bad != null ? st.bad : (enter != null && enter >= 0 ? enter : Math.min(st.prog.length, n - 1))
      if (focus >= 0) reveal(slots.children[focus])
      drawPreview()
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
      poke()
      st.bad = null
      clearHintMarks()
      if (st.dirty) resetBoard(true)
      if (bubble.classList.contains('bad')) hush()
    }
    function addCmd (c, at) {
      if (st.running || st.done) return false
      if (st.prog.length >= L.maxLen) { say(say$.full, 'bad', 2600); wiggle(slots); sfx('bad'); return false }
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
        say(say$.hint1.replace('{c}', h.next.map(function (c) { return LABEL[c] }).join(' + ')), 'good', 4500)
      } else if (lvl === 2) {
        st.prog = h.full.slice(0, h.keep + h.next.length)
        st.bad = null
        if (st.dirty) resetBoard(true)
        renderSlots(st.prog.length - 1)
        say(say$.hint2, 'good', 3600)
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
        say(say$.hint3, 'good', 4500)
      }
    }

    /* ── ghost preview: the child's own route drawn live, before JALAN! ── */
    function svgEl (tag, attrs) {
      var e = document.createElementNS(SVGNS, tag)
      for (var k in attrs) e.setAttribute(k, attrs[k])
      pathSvg.appendChild(e); return e
    }
    var pv = null
    function drawPreview () {
      while (pathSvg.firstChild) pathSvg.removeChild(pathSvg.firstChild)
      pv = st.prog.length ? preview(L, st.prog) : null
      pathSvg.setAttribute('class', 'tkg-path' + (pv && pv.ok ? ' ok' : ''))
      if (!pv) { gboat.classList.add('off'); return }
      var P = pv.path, c = function (v) { return (v + 0.5).toFixed(2) }
      if (P.length > 1) {
        svgEl('polyline', { 'class': 'ln', points: P.map(function (p) { return c(p.x) + ',' + c(p.y) }).join(' ') })
        for (var i = 1; i < P.length; i++) svgEl('circle', { 'class': 'nd', cx: c(P[i].x), cy: c(P[i].y), r: i === P.length - 1 ? 0.1 : 0.075 })
      }
      var b = pv.bad
      if (b) {
        var bx = b.tx != null ? b.tx : b.x, by = b.ty != null ? b.ty : b.y
        svgEl('rect', { 'class': 'bad', x: bx + 0.08, y: by + 0.08, width: 0.84, height: 0.84, rx: 0.16 })
        var e = b.edge ? DV[b.edge] : (b.tx != null ? [b.tx - b.x, b.ty - b.y] : null)
        if (e) svgEl('line', { 'class': 'bl', x1: c(b.x), y1: c(b.y), x2: (b.x + 0.5 + e[0] * (b.edge ? 0.46 : 0.62)).toFixed(2), y2: (b.y + 0.5 + e[1] * (b.edge ? 0.46 : 0.62)).toFixed(2) })
        var chipEl = slots.children[b.idx]
        if (chipEl && chipEl.classList) chipEl.classList.add('tkg-chip--pbad')
      }
      // a faint boat where the route ends (it faces the way it last moved)
      if (P.length > 1) {
        var l = P[P.length - 1], k = P[P.length - 2]
        gboat.setAttribute('data-face', l.x < k.x ? 'W' : 'E')
        put(gboat, l.x, l.y); gboat.classList.remove('off')
      } else gboat.classList.add('off')
    }

    /* ── idle help (10 s: the next useful thing breathes) + first-time coach hand ── */
    var IDLE_MS = Math.max(200, int(opts.idleMs, 10000)), COACH_IDLE_MS = Math.max(200, int(opts.coachIdleMs, 8000))
    var coachMode = opts.coach != null ? (opts.coach === true || opts.coach === 'always' ? 'always' : opts.coach === 'first' ? 'first' : '') : L.coach
    var coachKey = 'tkg-coach:' + (L.id || (L.w + 'x' + L.h))
    function coachSeen () { try { return G.localStorage.getItem(coachKey) === '1' } catch (e) { return false } }
    function coachMark () { try { G.localStorage.setItem(coachKey, '1') } catch (e) {} }
    var coachOn = coachMode === 'always' || (coachMode === 'first' && !coachSeen())
    var idleT = null, nudged = null, co = { on: false, run: 0, loops: 0 }
    function clearNudge () {
      if (nudged) { nudged.classList.remove('tkg-chip--nudge'); nudged = null }
      var n = root.querySelectorAll('.tkg-chip--nudge'); for (var i = 0; i < n.length; i++) n[i].classList.remove('tkg-chip--nudge')
    }
    function poke () {
      clearNudge()
      if (idleT) { clearTimeout(idleT); idleT = null }
      if (dead || st.done) return
      idleT = later(onIdle, !st.prog.length && coachOn ? COACH_IDLE_MS : IDLE_MS)
    }
    function onIdle () {
      idleT = null
      if (st.done) return
      if (st.running || co.on || drag) { poke(); return }
      if (!st.prog.length && coachOn) { showCoach(); return }
      idleNudge()
    }
    // what a helper would point at: JALAN! when the route already works, the first chip to take out when
    // it cannot work, else the next command to add. Never fills anything in.
    function nextTarget () {
      var p = preview(L, st.prog)
      if (st.prog.length && p.ok) return goB
      var h = nextHint(L, st.prog)
      if (!h) return null
      if (h.keep < st.prog.length) return slots.children[h.keep] || null
      for (var i = 0; i < h.next.length; i++) { var e = pal.querySelector('[data-cmd="' + h.next[i] + '"]'); if (e) return e }
      return null
    }
    function idleNudge () {
      clearNudge()
      var t = nextTarget()
      if (!t) return
      t.classList.add('tkg-chip--nudge'); nudged = t
      if (t === goB) say(say$.nudgeGo, 'good', 5000)
      else if (slots.contains(t)) { reveal(t); say(say$.nudgeFix, 'bad', 5000) }
    }
    function relRect (e) {
      var r = e.getBoundingClientRect(), R = root.getBoundingClientRect()
      return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height / 2, w: r.width, h: r.height, rh: R.height }
    }
    function handTo (e, jump) {
      var r = relRect(e), lbl = !!(e.classList && e.classList.contains('tkg-chip') && e.textContent.replace(/\d+/g, '').trim())
      var dn = r.y + r.h * 0.2 + 84 > r.rh - 4 || (lbl && r.y - r.h * 0.15 - 84 > 4)
      hand.classList.toggle('dn', dn)
      hand.classList.toggle('jump', !!jump)
      hand.style.transform = 'translate3d(' + Math.round(r.x - 24) + 'px,' + Math.round(r.y - 3 + (dn ? -r.h * 0.15 : r.h * 0.15)) + 'px,0)'
    }
    function handTap (e) {
      hand.classList.remove('tap'); void hand.offsetWidth; hand.classList.add('tap')
      var r = relRect(e), rip = el('div', 'tkg-rip'); rip.style.left = r.x + 'px'; rip.style.top = r.y + 'px'; coach.appendChild(rip)
      e.classList.add('tkg-cpress')
      later(function () { e.classList.remove('tkg-cpress') }, 180)
      later(function () { if (rip.parentNode) rip.parentNode.removeChild(rip) }, 720)
      sfx('click')
    }
    function showCoach () {
      if (co.on || st.running || st.done) return
      var first = nextTarget()
      if (!first || first === goB) return
      co.on = true; co.loops = 0; var id = ++co.run
      coachMark()
      clearNudge()
      handTo(first, true)
      coach.classList.add('on')
      placeSkip()
      say(say$.coach, 'good')
      var M = rm ? 1.4 : 1
      function seq () {
        if (id !== co.run || dead) return
        var chipEl = nextTarget()
        if (!chipEl || chipEl === goB || co.loops >= 3) { hideCoach(); return }
        co.loops++
        handTo(chipEl, rm || co.loops === 1)
        later(function () {
          if (id !== co.run) return
          handTap(chipEl)
          later(function () {
            if (id !== co.run) return
            handTo(goB, rm)
            later(function () {
              if (id !== co.run) return
              handTap(goB)
              later(seq, 1100 * M)
            }, 820 * M)
          }, 700 * M)
        }, (co.loops === 1 ? 500 : 760) * M)
      }
      seq()
    }
    // "Lewati" sits over the right end of the (still empty) route bar: the coach only runs with an empty route
    function placeSkip () {
      var R = root.getBoundingClientRect(), r = route.getBoundingClientRect(), w = 112, h = 48
      skipB.style.cssText = 'position:absolute;pointer-events:auto;width:' + w + 'px;left:' + Math.round(r.right - R.left - w - 10) + 'px;top:' + Math.round(r.top - R.top - h / 2) + 'px'
      coach.appendChild(skipB)
    }
    function hideCoach () {
      if (!co.on) return
      co.on = false; co.run++
      coach.classList.remove('on')
      if (skipB.parentNode) skipB.parentNode.removeChild(skipB)
      if (st.msg === say$.coach) hush()
      poke()
    }
    skipB.addEventListener('click', function (e) { e.stopPropagation(); sfx('click'); hideCoach() })
    // any real action ends the coach and restarts the idle clock
    root.addEventListener('pointerdown', function (e) {
      if (e.target === skipB || (skipB.contains && skipB.contains(e.target))) return
      if (co.on) hideCoach(); else poke()
    }, true)

    /* ── celebration: a sparkle + a rising note for every good step, a star burst for the win ── */
    try { var pre = new G.Image(); pre.src = src('sparkle') } catch (e) {}
    var NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760]
    function note (i) { if (!muted()) tone(NOTES[Math.min(i, NOTES.length - 1)], NOTES[Math.min(i, NOTES.length - 1)] * 1.01, 0.18, 'triangle', 0.07) }
    function sparkle (x, y) {
      var box = fx('tkg-sparkles', x, y, 700)
      if (!box) return
      for (var k = 0; k < 3; k++) {
        var s = el('div', 'tkg-spk'); s.appendChild(img(src('sparkle'))); box.appendChild(s)
        var a = -Math.PI / 2 + (k - 1) * 0.95, R = st.T * 0.6
        try { s.animate([{ transform: 'translate(0,0) scale(.3)', opacity: 0 }, { transform: 'translate(' + (Math.cos(a) * R * 0.5) + 'px,' + (Math.sin(a) * R * 0.5) + 'px) scale(1)', opacity: 1, offset: 0.35 },
          { transform: 'translate(' + (Math.cos(a) * R) + 'px,' + (Math.sin(a) * R) + 'px) scale(.5)', opacity: 0 }], { duration: 620, easing: EASE, fill: 'forwards' }) } catch (e) {}
      }
    }
    function burst (gx, gy) {
      var br = board.getBoundingClientRect(), R0 = root.getBoundingClientRect()
      var cx = br.left - R0.left + (gx + 0.5) * st.T, cy = br.top - R0.top + (gy + 0.5) * st.T
      var n = rm ? 6 : 16
      for (var k = 0; k < n; k++) {
        var c = el('div', 'tkg-conf'); c.appendChild(img(src('sparkle'))); root.appendChild(c)
        c.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'
        var sz = 0.55 + ((k * 37) % 10) / 20
        ;(function (c, k) {
          later(function () { if (c.parentNode) c.parentNode.removeChild(c) }, 1500)
          if (!c.animate) { c.style.opacity = '0'; return }
          try {
            if (rm) {
              var ox = Math.cos(k / n * 6.283) * st.T * 0.9, oy = Math.sin(k / n * 6.283) * st.T * 0.9
              c.style.transform = 'translate3d(' + (cx + ox) + 'px,' + (cy + oy) + 'px,0) scale(' + sz + ')'
              c.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 1200, easing: 'linear', fill: 'forwards' })
            } else {
              var a = -Math.PI / 2 + (k / (n - 1) - 0.5) * 2.6, d = st.T * (1.3 + ((k * 53) % 10) / 8), rot = ((k * 71) % 360) - 180
              var tx = cx + Math.cos(a) * d, ty = cy + Math.sin(a) * d
              c.animate([{ transform: 'translate3d(' + cx + 'px,' + cy + 'px,0) scale(.2) rotate(0deg)', opacity: 1 },
                { transform: 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + sz + ') rotate(' + (rot * 0.6) + 'deg)', opacity: 1, offset: 0.55 },
                { transform: 'translate3d(' + tx + 'px,' + (ty + st.T * 0.7) + 'px,0) scale(' + (sz * 0.8) + ') rotate(' + rot + 'deg)', opacity: 0 }],
              { duration: 1100 + (k % 4) * 90, easing: EASE, fill: 'forwards' })
            }
          } catch (e) {}
        })(c, k)
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
      if (ev === 'move') { fx('tkg-wake', s.from.x, s.from.y); moveBoat(s.x, s.y); note(st.stepN++); later(function () { sparkle(s.x, s.y) }, 220) }
      else if (ev === 'current') {
        fx('tkg-wake', s.from.x, s.from.y); moveBoat(s.via.x, s.via.y); note(st.stepN++)
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
      if (!st.prog.length) { say(say$.noProg, 'bad', 2600); wiggle(slots); sfx('click'); return }
      sfx('click')
      st.attempts++
      st.bad = null; renderSlots(-1); clearHintMarks(); hush()
      var res = run(L, st.prog)
      st.running = true; st.stepN = 0; root.classList.add('tkg--busy')
      clearNudge(); if (co.on) hideCoach()
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
        say((say$[key] || say$.block).replace('{n}', String(res.failAt + 1)), 'bad', 6500)
      } else {
        say(say$[res.detail] || say$.far, 'bad', 6500)
        sfx('bad')
      }
    }
    function won (res) {
      st.done = true; root.classList.add('tkg--won')
      var g = L.goal || { x: vis.x, y: vis.y }
      fx('tkg-ring', g.x, g.y, 900)
      burst(g.x, g.y)
      clearNudge(); if (idleT) { clearTimeout(idleT); idleT = null }
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
      say(say$.win, 'good')
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
    if (opts.hintButton !== false) hintB.addEventListener('click', hint)
    undoB.addEventListener('click', function () {
      if (st.running || st.done) return
      if (!st.prog.length) { wiggle(slots); return }
      removeAt(st.prog.length - 1)
    })
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
    hush()
    if (coachOn) later(showCoach, rm ? 300 : 700); else poke()

    return {
      el: root,
      level: L,
      hint: hint,
      go: go,
      destroy: function () {
        if (dead) return
        dead = true
        co.run++
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
        clearHintMarks(); markRun(null); renderSlots(-1); resetBoard(true); hush(); poke()
      },
      program: function () { return st.prog.slice() },
      setProgram: function (p) {
        if (dead || st.running || st.done) return
        st.prog = arr(p).map(String).filter(isCmd).slice(0, L.maxLen); edited(); renderSlots(-1)
      },
      state: function () {
        return { running: st.running, done: st.done, attempts: st.attempts, hints: st.hints, bad: st.bad,
          program: st.prog.slice(), message: st.msg, bubble: bubble.classList.contains('on'), tile: st.T,
          boat: vis ? { x: vis.x, y: vis.y } : null, maxLen: L.maxLen, shortest: L.shortest, stars: st.earned,
          coach: co.on, tools: L.tools.slice(), easy: L.easy, preview: pv ? { ok: pv.ok, bad: pv.bad, path: pv.path.map(function (p) { return { x: p.x, y: p.y } }) } : null,
          nudge: nudged ? (nudged === goB ? 'go' : slots.contains(nudged) ? 'slot:' + nudged.getAttribute('data-idx') : 'pal:' + nudged.getAttribute('data-cmd')) : null }
      },
      layout: onResize
    }
  }

  TKGrid.mount = mount
  G.TKGrid = TKGrid
  if (typeof module !== 'undefined' && module.exports) module.exports = TKGrid
})(typeof window !== 'undefined' ? window : globalThis)
