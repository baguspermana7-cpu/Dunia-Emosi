/* ============================================================================
 * tk-grid.js — window.TKGrid. Timmy & Kapal Legendaris: the signature grid-programming
 * level (PRD v2 §3 `grid`, §6 motion/sound, §7 contract). Vanilla ES5, no build.
 *
 * ENGINE (pure, also module.exports for node — never throws, deterministic):
 *   TKGrid.create(def)            -> normalised level (idempotent; def.rows is parsed, see ROWS)
 *   TKGrid.run(def, program)      -> { ok, steps[], failAt, reason, detail, shortest, moves, stars, endAt }
 *   TKGrid.shortest(def)          -> minimal chip count (-1 = unsolvable)
 *   TKGrid.solve(def)             -> one shortest program (array of chips) or null — THE single truth for
 *                                    par, hints and every gate (qa-tk-grid, qa-tk-grid-levels)
 *   TKGrid.validate(def)          -> [{ code, msg }]  ([] = playable) · TKGrid.lint(def) -> warnings
 *   TKGrid.nextHint(def, program) -> { keep, next[], full[], lane } | null
 *   TKGrid.stars(moves, shortest, forgiving, hinted) -> 3 | 2 | 1 (Petunjuk used = at most 2)
 *   TKGrid.parse(rows, o)         -> definition from a row map (ROWS table below)
 * Commands: N/E/S/W gerak satu petak ke arah itu (kapal menghadap ke sana; default untuk anak) ·
 * F maju · L/R belok 90° · P ambil peti di petak ini · D taruh peti di petak tujuan ·
 * R2/R3 ulangi perintah BERIKUTNYA ×2/×3 (a repeat before another repeat is replaced by it;
 * a trailing repeat does nothing) · F1 jalankan Fungsi. A program is a flat array; with Fungsi the body
 * follows a 'FN' marker: [main…, 'FN', body…]. 'FN' is not a chip (moves exclude it); F1 inside the body is ignored.
 * ONE TICK per executed command (design A.0). A move enters the target tile (not off the board, not a block, not a
 * closed gate, not a colour door without its key, not a tile a moving obstacle is on), then the LANDING LOOP runs on
 * the tile the boat stands on: (a) collect — key, switch, the NEXT numbered flag, question tile; (b) whirlpool — jump
 * to its partner once per command (not onto a blocked partner); (c) licin — slide on in the motion direction while
 * the next tile is free; (d) current — push ONE tile once per command (not into a blocked tile). Then moving
 * obstacles advance one step along their looping path; one may not land on the boat. Everything the boat passes
 * over counts. Goal: boat on `goal`, every item delivered to `drop` (or picked, when there is no drop) and every
 * numbered flag delivered in order. No goal + drop = goal on the drop; no goal, no drop + flags = the last flag.
 * The run stops as soon as the goal is met, so extra chips after it are not executed (they still count as moves).
 * Question tiles (`q`, chest / door) are passable: the answer never changes the route; the UI pauses on them.
 * Fog (`fog`, `beacons`) is visual only.
 *
 * UI: TKGrid.mount(host, def, opts) -> { el, level, destroy, reset, hint, go, program, setProgram, state, layout }
 *   opts: { onDone({stars, moves, attempts, hints, shortest, bonus, asked, hinted}), sfx:{click,good,bad,win}, lib(key)->url,
 *           onQuestion({reason:'chest'|'door', topic, levelId, index}) -> Promise<{correct}> (question tiles; absent = open by itself),
 *           art:{boat, walker, ice, flag, crate, timmy, lighthouse, lifeboat, tipper, compass, block} (library keys;
 *             `block` = one key or a list the obstacles cycle through), theme:'sea'|'deck', bg (CSS background
 *             string painted behind the board, e.g. TKArt.scene(k); false = transparent), title, mission, hint, tip,
 *           chapter:{ship, name, title, label, idx, total} (mini-card + "Level X dari Y"), onBack(), onNext()
 *             (footer buttons, hidden when absent), topInset (px left free for the host HUD, default 70),
 *           hintButton (false = host drives handle.hint()), starTarget (element stars fly to), starBase, reducedMotion, muted, keyboard (false = off) }
 *   The level definition may carry theme / blockArt / itemArt / goalArt / dropArt / scene / tip (TKWorlds.grid puts them there); opts win.
 *   Layout (owner mockups ui-05 / ui-07): landscape = chapter card left (>= 1000 px), parchment title plate over
 *   the board, "Perintah" panel right with Hapus + JALAN! inside it, bottom band = big Timmy (tap = Petunjuk) with his
 *   speech bubble, "Rutemu" route bar (+ "Fungsi" lane), penguin tip card. Portrait = chapter card, plate, board, command panel,
 *   Timmy row, route, tip, footer (tip, plate, chapter card drop out in that order when the board gets small).
 *   NO TRACE, NO HELP (owner 2026-09-29): nothing of the queued route is drawn before JALAN!, no automatic hints;
 *   feedback happens during and after the run. Petunjuk is the child's explicit choice and caps the level at 2 stars.
 * CSS is injected once (scoped .tkg-*); the host page only includes this script.
 * ZERO emoji / glyphs / drawn pictograms: every icon is an owner sprite (window.TKIcon / the library) or the CSS arrow.
 * ==========================================================================*/
(function (G) {
  'use strict'

  var DIRS = ['N', 'E', 'S', 'W']
  var DV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
  var CMDS = ['N', 'E', 'S', 'W', 'F', 'L', 'R', 'P', 'D', 'R2', 'R3', 'F1']
  var REP = { R2: 2, R3: 3 }
  var MAX_ITEMS = 8
  var MAX_SW = 8
  var SEARCH_LIMIT = 40
  var FN_BODIES = 400          // Fungsi solver: at most this many candidate bodies are searched
  var COLORS = ['merah', 'biru', 'hijau']
  var MOBS = { ice: 1, whale: 1, patrol: 1, tug: 1 }
  // row map characters (design §C). Lowercase key / uppercase door: m/M merah, b/B biru, h/H hijau.
  var ROWS = {
    '.': 'water', S: 'start', G: 'goal', '#': 'block', c: 'item', d: 'drop', '>': 'current E', '<': 'current W', '^': 'current N', v: 'current S',
    w: 'switch', g: 'gate', '~': 'licin', m: 'kunci merah', b: 'kunci biru', h: 'kunci hijau', M: 'pintu merah', B: 'pintu biru', H: 'pintu hijau',
    '1': 'bendera 1 (… 9)', o: 'pusaran 1a', O: 'pusaran 1b', u: 'pusaran 2a', U: 'pusaran 2b', L: 'mercusuar', T: 'peti tanya', P: 'pintu tanya'
  }

  /* ── normalisation helpers ─────────────────────────────────────────────── */
  function int (v, d) { v = Math.floor(Number(v)); return isFinite(v) ? v : d }
  function arr (a) { return Object.prototype.toString.call(a) === '[object Array]' ? a : [] }
  function pt (p) { return p && typeof p === 'object' ? { x: int(p.x, -1), y: int(p.y, -1) } : null }
  function dirOf (d) { d = String(d || 'E').toUpperCase(); return DV[d] ? d : 'E' }
  function str (v) { return v == null ? '' : String(v) }
  function gcd (a, b) { while (b) { var t = b; b = a % b; a = t } return a }
  function isCmd (c) { return CMDS.indexOf(c) >= 0 }
  function colorOf (c) { c = int(c, 0); return c >= 0 && c < COLORS.length ? c : 0 }
  function has (a) { return arr(a).length > 0 }

  // row map -> definition fields (only the fields the rows actually contain)
  function parse (rows, o) {
    o = o || {}
    rows = arr(rows).map(str)
    var d = { w: rows.length ? rows[0].length : 0, h: rows.length, blocks: [], items: [], currents: [], switches: [], keys: [], doors: [], stops: [], whirls: [], slick: [], q: [], beacons: [] }
    var CUR = { '>': 'E', '<': 'W', '^': 'N', v: 'S' }, KEY = { m: 0, b: 1, h: 2 }, DOOR = { M: 0, B: 1, H: 2 }, wp = {}, sw = null, gates = [], stops = []
    rows.forEach(function (r, y) {
      for (var x = 0; x < r.length; x++) {
        var ch = r.charAt(x)
        if (ch === 'S') d.start = { x: x, y: y, dir: dirOf(o.dir) }
        else if (ch === 'G') d.goal = { x: x, y: y }
        else if (ch === '#') d.blocks.push({ x: x, y: y })
        else if (ch === 'c') d.items.push({ x: x, y: y, id: 'peti' })
        else if (ch === 'd') d.drop = { x: x, y: y }
        else if (CUR[ch]) d.currents.push({ x: x, y: y, dir: CUR[ch] })
        else if (ch === 'w') sw = { x: x, y: y }
        else if (ch === 'g') gates.push({ x: x, y: y })
        else if (ch === '~') d.slick.push({ x: x, y: y })
        else if (KEY[ch] != null) d.keys.push({ x: x, y: y, color: KEY[ch] })
        else if (DOOR[ch] != null) d.doors.push({ x: x, y: y, color: DOOR[ch] })
        else if (ch >= '1' && ch <= '9') stops[+ch - 1] = { x: x, y: y }
        else if (ch === 'o' || ch === 'O' || ch === 'u' || ch === 'U') { var k = ch.toLowerCase(); (wp[k] = wp[k] || [])[ch === k ? 0 : 1] = { x: x, y: y } }
        else if (ch === 'L') d.beacons.push({ x: x, y: y })
        else if (ch === 'T' || ch === 'P') d.q.push({ x: x, y: y, type: ch === 'T' ? 'chest' : 'door' })
      }
    })
    if (sw) d.switches.push({ x: sw.x, y: sw.y, opens: gates })
    d.stops = stops.filter(Boolean)
    ;['o', 'u'].forEach(function (k) { if (wp[k] && wp[k][0] && wp[k][1]) d.whirls.push({ a: wp[k][0], b: wp[k][1] }) })
    return d
  }

  var cache = {}, cacheN = 0
  function create (def) {
    if (def && def.__tkg) return def
    def = def && typeof def === 'object' ? def : {}
    // Fungsi boards cost a few hundred searches: memoise by content
    var ck = null
    if (arr(def.tools).indexOf('F1') >= 0) { try { ck = JSON.stringify(def) } catch (e) { ck = null } if (ck && cache[ck]) return cache[ck] }
    var R = has(def.rows) ? parse(def.rows, { dir: def.start && def.start.dir || def.dir }) : {}
    var pick = function (k) { return has(def[k]) ? def[k] : (R[k] || []) }
    var w = Math.max(1, Math.min(16, int(def.w, R.w || 5)))
    var h = Math.max(1, Math.min(16, int(def.h, R.h || 5)))
    var sp = pt(def.start) || pt(R.start) || { x: 0, y: 0 }
    var L = {
      __tkg: true, id: str(def.id), title: str(def.title), mission: str(def.mission), hint: str(def.hint),
      w: w, h: h, easy: !!def.easy, trim: def.trim === true, coach: def.coach === 'always' || def.coach === 'first' ? def.coach : '',
      start: { x: sp.x, y: sp.y, dir: dirOf((def.start && def.start.dir) || (R.start && R.start.dir) || def.dir) },
      goal: pt(def.goal) || pt(R.goal),
      blocks: pick('blocks').map(pt).filter(Boolean),
      items: pick('items').slice(0, MAX_ITEMS).map(function (it, i) {
        var p = pt(it); return p && { x: p.x, y: p.y, id: it.id != null ? String(it.id) : 'item' + i }
      }).filter(Boolean),
      drop: pt(def.drop) || pt(R.drop),
      currents: pick('currents').map(function (c) {
        var p = pt(c); return p && { x: p.x, y: p.y, dir: dirOf(c.dir) }
      }).filter(Boolean),
      ice: arr(def.ice).map(function (o) {
        if (!o || typeof o !== 'object') return null
        var path = arr(o.path).map(pt).filter(Boolean)
        if (!path.length) { var p = pt(o); if (p && p.x >= 0) path = [p] }
        return path.length ? { path: path, kind: MOBS[o.kind] ? o.kind : 'ice' } : null
      }).filter(Boolean),
      switches: pick('switches').slice(0, MAX_SW).map(function (s) {
        var p = pt(s); return p && { x: p.x, y: p.y, opens: arr(s.opens).map(pt).filter(Boolean) }
      }).filter(Boolean),
      keys: pick('keys').map(function (k) { var p = pt(k); return p && { x: p.x, y: p.y, color: colorOf(k.color) } }).filter(Boolean),
      doors: pick('doors').map(function (k) { var p = pt(k); return p && { x: p.x, y: p.y, color: colorOf(k.color) } }).filter(Boolean),
      stops: pick('stops').slice(0, 9).map(pt).filter(Boolean),
      whirls: pick('whirls').slice(0, 2).map(function (p) { var a = pt(p && p.a), b = pt(p && p.b); return a && b ? { a: a, b: b } : null }).filter(Boolean),
      slick: pick('slick').map(pt).filter(Boolean),
      q: pick('q').slice(0, 8).map(function (t, i) { var p = pt(t); return p && { x: p.x, y: p.y, type: t.type === 'door' ? 'door' : 'chest', topic: str(t.topic), i: i } }).filter(Boolean),
      fog: def.fog === true,
      beacons: pick('beacons').map(function (b) { var p = pt(b); return p && { x: p.x, y: p.y, r: Math.max(1, Math.min(6, int(b.r, int(def.beaconR, 2)))) } }).filter(Boolean),
      fnMax: Math.max(1, Math.min(6, int(def.fnMax, 4)))
    }
    if (!L.goal && L.drop) L.goal = { x: L.drop.x, y: L.drop.y }
    if (!L.goal && L.stops.length) { L.goal = { x: L.stops[L.stops.length - 1].x, y: L.stops[L.stops.length - 1].y }; L.goalIsStop = true }
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
    try { sol = solveL(L) } catch (e) { sol = null }
    L.solution = sol
    L.shortest = sol ? moveCount(sol) : -1
    // trimmed boards (ONLY the tutorial's first boards: def.trim === true, owner 2026-09-29 "jangan beri bantuan"):
    // only the commands the route actually needs. A subset of the tools cannot make the route shorter.
    if (L.trim && sol && sol.some(function (c) { return REP[c] })) {
      // a young child plays with arrows: take the plain-arrow route when one exists (it may be a bit longer)
      var plain = L.tools.filter(function (c) { return !REP[c] }), keep = L.tools
      L.tools = plain
      var sol2 = null
      try { sol2 = solveL(L) } catch (e) { sol2 = null }
      if (sol2 && moveCount(sol2) <= 12) { sol = sol2; L.solution = sol; L.shortest = moveCount(sol) } else L.tools = keep
    }
    if (L.trim && sol) {
      var need = L.tools.filter(function (c) { return sol.indexOf(c) >= 0 })
      if (need.length) L.tools = need
    }
    var ml = int(def.maxLen, 0)
    L.maxLen = ml > 0 ? Math.min(24, ml) : (L.shortest > 0 ? Math.max(8, Math.min(16, L.shortest + 4)) : 12)
    if (ck) { if (++cacheN > 64) { cache = {}; cacheN = 0 } cache[ck] = L }
    return L
  }

  function index (L) {
    var K = function (p) { return p.y * L.w + p.x }
    L._blk = {}; L._cur = {}; L._sw = {}; L._gate = {}; L._item = {}; L._key = {}; L._door = {}; L._slk = {}; L._wh = {}; L._q = {}
    L.blocks.forEach(function (b) { L._blk[K(b)] = 1 })
    L.currents.forEach(function (c) { L._cur[K(c)] = c.dir })
    L.switches.forEach(function (s, j) {
      L._sw[K(s)] = j
      s.opens.forEach(function (g) { var k = K(g); (L._gate[k] = L._gate[k] || []).push(j) })
    })
    L.items.forEach(function (it, i) { var k = K(it); (L._item[k] = L._item[k] || []).push(i) })
    L.keys.forEach(function (k) { L._key[K(k)] = k.color })
    L.doors.forEach(function (k) { L._door[K(k)] = k.color })
    L.slick.forEach(function (s) { L._slk[K(s)] = 1 })
    L.whirls.forEach(function (p) { L._wh[K(p.a)] = p.b; L._wh[K(p.b)] = p.a })
    L.q.forEach(function (t, i) { L._q[K(t)] = i })
    var T = 1
    for (var i = 0; i < L.ice.length && T; i++) {
      var n = L.ice[i].path.length
      T = T / gcd(T, n) * n
      if (T > 240) T = 0
    }
    L._T = T
  }

  /* ── simulation ────────────────────────────────────────────────────────── */
  function startState (L) { return { x: L.start.x, y: L.start.y, dir: L.start.dir, t: 0, pk: 0, dl: 0, sw: 0, ky: 0, ck: 0 } }
  function inside (L, x, y) { return x >= 0 && y >= 0 && x < L.w && y < L.h }
  function blocked (L, x, y, sw, ky) {
    var k = y * L.w + x
    var dc = L._door[k]
    if (dc != null && !((ky || 0) & (1 << dc))) return true
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
  // may the boat stand on (x, y) at time t with these switches / keys? (same test for a move target and every push)
  function free (L, x, y, n, t) { return inside(L, x, y) && !blocked(L, x, y, n.sw, n.ky) && iceHit(L, x, y, t) < 0 }
  function press (L, x, y, sw) { var j = L._sw[y * L.w + x]; return j == null ? sw : (sw | (1 << j)) }
  function allMask (L) { return (1 << L.items.length) - 1 }
  function isDone (L, s) {
    if (!L.goal || s.x !== L.goal.x || s.y !== L.goal.y) return false
    if ((s.ck || 0) < L.stops.length) return false
    if (!L.items.length) return true
    return L.drop ? s.dl === allMask(L) : s.pk === allMask(L)
  }
  function bits (m) { var n = 0; while (m) { n += m & 1; m >>>= 1 } return n }

  // (a) collect on the tile the boat stands on: switch, key, the NEXT numbered flag, question tile, a later flag passed early
  function collect (L, n, r) {
    var k = n.y * L.w + n.x
    n.sw = press(L, n.x, n.y, n.sw)
    var kc = L._key[k]
    if (kc != null && !(n.ky & (1 << kc))) { n.ky |= 1 << kc; (r.keys = r.keys || []).push(kc) }
    var st = L.stops[n.ck]
    if (st && st.x === n.x && st.y === n.y) { (r.stops = r.stops || []).push(n.ck); n.ck++ }
    else for (var i = n.ck + 1; i < L.stops.length; i++) if (L.stops[i].x === n.x && L.stops[i].y === n.y) { (r.early = r.early || []).push(i); break }
    var qi = L._q[k]
    if (qi != null) (r.quiz = r.quiz || []).push({ i: qi, x: n.x, y: n.y, type: L.q[qi].type })
  }
  // the landing loop (design A.0 steps a-d). The tile the move entered is r.toward; each later hop is in r.hops.
  function landing (L, n, s, r) {
    var warped = false, pushed = false, md = n.dir, guard = L.w * L.h * 2 + 4
    for (var g = 0; g < guard; g++) {
      collect(L, n, r)
      var k = n.y * L.w + n.x
      var wp = L._wh[k]
      if (wp && !warped) {
        warped = true
        if (free(L, wp.x, wp.y, n, s.t)) { hop(r, n, wp.x, wp.y, 'warp'); continue }
        r.stuck = true
      }
      if (L._slk[k]) {
        var e = DV[md], sx = n.x + e[0], sy = n.y + e[1]
        if (free(L, sx, sy, n, s.t)) { hop(r, n, sx, sy, 'slide'); continue }
        if (r.hops && r.hops.length && r.hops[r.hops.length - 1].k === 'slide') r.skid = true
      }
      var cd = L._cur[k]
      if (cd && !pushed) {
        pushed = true
        var c = DV[cd], px = n.x + c[0], py = n.y + c[1]
        if (free(L, px, py, n, s.t)) { hop(r, n, px, py, 'current'); md = cd; continue }
        r.stuck = true
      }
      break
    }
  }
  function hop (r, n, x, y, kind) { (r.hops = r.hops || []).push({ x: x, y: y, k: kind, fx: n.x, fy: n.y }); n.x = x; n.y = y }

  // one atomic command. Returns { s, event, fail:{reason,detail}|null, done, via, hops, toward, ice, item, items, opened, after, keys, stops, early, quiz }
  function exec (L, s, c) {
    var n = { x: s.x, y: s.y, dir: s.dir, t: s.t, pk: s.pk, dl: s.dl, sw: s.sw, ky: s.ky || 0, ck: s.ck || 0 }
    var r = { s: n, event: 'turn', fail: null, done: false }
    function fail (reason, detail) { r.s = s; r.event = 'bump'; r.fail = { reason: reason, detail: detail == null ? null : detail }; return r }
    if (c === 'F' || DV[c]) {
      var md = c === 'F' ? s.dir : c, d = DV[md], nx = s.x + d[0], ny = s.y + d[1]
      r.toward = { x: nx, y: ny }; r.face = md
      if (!inside(L, nx, ny)) return fail('edge')
      var dc = L._door[ny * L.w + nx]
      if (dc != null && !(n.ky & (1 << dc))) return fail('door', COLORS[dc])
      if (blocked(L, nx, ny, s.sw, n.ky)) return fail('block')
      var hi = iceHit(L, nx, ny, s.t)
      if (hi >= 0) { r.ice = hi; return fail('ice') }
      n.x = nx; n.y = ny; n.dir = md; r.event = 'move'
      if (dc != null) r.door = dc
      var sw0 = n.sw
      landing(L, n, s, r)
      if (r.hops) { r.via = { x: nx, y: ny }; r.event = r.hops[0].k }
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

  // forgiving (easy boards): 3 stars up to shortest + 1, 2 up to shortest + 3. hinted (Petunjuk used): at most 2.
  function stars (moves, shortest, forgiving, hinted) {
    var slack = forgiving ? 1 : 0, n
    if (!(shortest > 0) || moves <= shortest + slack) n = 3
    else n = moves <= shortest + 2 + slack ? 2 : 1
    return hinted && n > 2 ? 2 : n
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
    // mechanics fields: only present when a mechanic fired, so legacy step lists stay byte-identical
    if (r.hops && (r.hops.length > 1 || r.hops[0].k !== 'current')) st.hops = r.hops
    if (r.skid) st.skid = true
    if (r.keys) st.keys = r.keys
    if (r.door != null) st.door = r.door
    if (r.stops) st.stops = r.stops
    if (r.early) st.early = r.early
    if (r.quiz) st.quiz = r.quiz
    if (s.ky) st.ky = s.ky
    if (s.ck) st.ck = s.ck
    return st
  }

  function moveCount (prog) { var n = 0; for (var i = 0; i < prog.length; i++) if (prog[i] !== 'FN') n++; return n }
  // split a flat program into main + Fungsi body
  function lanes (prog) {
    var m = prog.indexOf('FN')
    return m < 0 ? { main: prog, body: [], at: -1 } : { main: prog.slice(0, m), body: prog.slice(m + 1), at: m }
  }

  function run (def, program) {
    var out = { ok: false, steps: [], failAt: null, reason: null, detail: null, shortest: -1, moves: 0, stars: 0, endAt: null }
    try {
      var L = create(def)
      out.shortest = L.shortest
      var prog = arr(program).map(String)
      out.moves = moveCount(prog)
      var s = startState(L)
      if (isDone(L, s)) { out.ok = true; out.stars = stars(out.moves, L.shortest, L.easy); return out }
      var ln = lanes(prog), stop = false
      // one chip at flat index fi (rep = flat index of its repeat chip), run k times; fnAt = the main F1 chip index
      var one = function (c, fi, repIdx, k, fnAt, fnRep, fnK) {
        var r = exec(L, s, c), mk = function (x, from) {
          var q = snap(L, x, c, fi, repIdx, k, from)
          if (fnAt != null) { q.fn = fnAt; if (fnRep != null) { q.fnRep = fnRep; q.fnK = fnK } }
          return q
        }
        if (r.fail && r.after) {
          // the command itself happened; then the moving ice reached the boat
          // both steps draw the ice where it was, so it nudges toward the boat instead of covering it
          var mvStep = mk(r, s)
          mvStep.ice = icePositions(L, s.t)
          out.steps.push(mvStep)
          var b = mk({ s: r.s, event: 'bump' }, r.s)
          b.ice = icePositions(L, s.t)
          b.reason = 'ice'; b.iceIdx = r.ice; b.toward = icePositions(L, r.s.t)[r.ice]
          out.steps.push(b)
        } else if (r.fail) {
          var f = mk(r, s)
          f.reason = r.fail.reason
          if (r.fail.detail != null && r.fail.reason === 'door') f.detail = r.fail.detail
          if (r.ice != null) f.iceIdx = r.ice
          out.steps.push(f)
        } else out.steps.push(mk(r, s))
        if (r.fail) { out.failAt = fi; out.reason = r.fail.reason; out.detail = r.fail.detail; stop = true; return }
        s = r.s
        if (r.done) { out.ok = true; out.endAt = fnAt != null ? fnAt : fi; out.stars = stars(out.moves, L.shortest, L.easy); stop = true }
      }
      var lane = function (list, base, fnAt, fnRep, fnK) {
        var rep = 1, repIdx = null
        for (var i = 0; i < list.length && !stop; i++) {
          var c = list[i], fi = base + i
          if (REP[c]) { rep = REP[c]; repIdx = fi; continue }
          if (!isCmd(c) || (c === 'F1' && fnAt != null)) { rep = 1; repIdx = null; continue }
          for (var k = 0; k < rep && !stop; k++) {
            if (c === 'F1') lane(ln.body, ln.at + 1, fi, repIdx, k)
            else one(c, fi, repIdx, k, fnAt, fnRep, fnK)
          }
          rep = 1; repIdx = null
        }
      }
      lane(ln.main, 0, null)
      if (stop) return out
      out.reason = 'notAtGoal'
      out.detail = (L.goal && s.x === L.goal.x && s.y === L.goal.y) ? (s.ck < L.stops.length ? 'stops' : 'items')
        : (L.items.length && (L.drop ? s.dl : s.pk) !== allMask(L) ? 'itemsFar' : s.ck < L.stops.length ? 'stopsFar' : 'far')
      if (L.stops.length) out.stopsDone = s.ck
    } catch (e) { out.ok = false; out.reason = 'invalid'; out.detail = String(e && e.message) }
    return out
  }

  /* ── search: Dial's algorithm (chip costs) over (pos, dir, ice phase, items, switches, keys, flags) ── */
  function macros (L, body) {
    var base = L.tools.filter(function (c) { return !REP[c] && (c !== 'F1' || body) }), out = []
    var seqOf = function (c, n) { var q = []; for (var i = 0; i < n; i++) q = q.concat(c === 'F1' ? body : [c]); return q }
    base.forEach(function (c) { out.push({ toks: [c], seq: seqOf(c, 1) }) })
    L.tools.forEach(function (rt) { if (REP[rt]) base.forEach(function (c) { out.push({ toks: [rt, c], seq: seqOf(c, REP[rt]) }) }) })
    return out
  }
  function key (L, s) {
    var t = L._T ? s.t % L._T : Math.min(s.t, 400)
    return s.x + ',' + s.y + ',' + s.dir + ',' + t + ',' + s.pk + ',' + s.dl + ',' + s.sw + ',' + (s.ky || 0) + ',' + (s.ck || 0)
  }
  function search (L, s0, limit, body) {
    if (isDone(L, s0)) return []
    limit = limit == null ? SEARCH_LIMIT : limit
    var M = macros(L, body), buckets = [], best = {}, k0 = key(L, s0)
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
          var m = M[mi], s = node.s, ok = m.seq.length > 0, reached = false
          for (var r = 0; r < m.seq.length; r++) {
            var x = exec(L, s, m.seq[r])
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
  // Fungsi: the shortest over every candidate body (plain commands, up to fnMax, at most FN_BODIES bodies).
  // Total cost = main chips + body chips; a body only wins when the route actually calls it.
  function solveL (L) {
    var s0 = startState(L)
    var best = search(L, s0, SEARCH_LIMIT, null)
    if (L.tools.indexOf('F1') < 0) return best
    var base = L.tools.filter(function (c) { return !REP[c] && c !== 'F1' }), max = L.fnMax
    while (max > 1 && Math.pow(base.length, max) > FN_BODIES) max--
    var bodies = []
    var gen = function (p) { if (p.length) bodies.push(p); if (p.length < max) base.forEach(function (c) { gen(p.concat([c])) }) }
    gen([])
    for (var i = 0; i < bodies.length; i++) {
      var bd = bodies[i], cap = (best ? moveCount(best) : SEARCH_LIMIT + 1) - bd.length - 1
      if (cap < 1) continue
      var r = search(L, s0, cap, bd)
      if (r && r.indexOf('F1') >= 0 && (!best || r.length + bd.length < moveCount(best))) best = r.concat(['FN'], bd)
    }
    return best
  }

  function solve (def) {
    try { var L = create(def); return L.solution ? L.solution.slice() : null } catch (e) { return null }
  }
  function shortest (def) {
    try { return create(def).shortest } catch (e) { return -1 }
  }

  // Petunjuk (the child's explicit choice): where the program stops being useful, and the ONE thing to add next.
  // lane 'fn' = the Fungsi body needs fixing first (keep = its correct prefix inside the body).
  function nextHint (def, program) {
    try {
      var L = create(def), prog = arr(program).map(String)
      var res = run(L, prog)
      if (res.ok) return null
      if (L.solution && L.solution.indexOf('FN') >= 0) {
        var sl = lanes(L.solution), pl = lanes(prog), j = 0
        while (j < sl.body.length && pl.body[j] === sl.body[j]) j++
        if (j < sl.body.length || pl.body.length > sl.body.length) return { lane: 'fn', keep: j, next: sl.body.slice(j, j + 1), full: L.solution.slice() }
        var i = 0
        while (i < sl.main.length && pl.main[i] === sl.main[i]) i++
        var nx = REP[sl.main[i]] ? sl.main.slice(i, i + 2) : sl.main.slice(i, i + 1)
        return { lane: 'main', keep: i, next: nx, full: L.solution.slice() }
      }
      prog = lanes(prog).main
      res = run(L, prog)
      var keep = res.failAt != null ? res.failAt : prog.length
      if (res.failAt != null && keep > 0 && REP[prog[keep - 1]]) keep--
      while (keep > 0 && REP[prog[keep - 1]]) keep--
      var prefix = prog.slice(0, keep)
      var pre = run(L, prefix), s = startState(L)
      if (!pre.ok && pre.failAt == null && pre.steps.length) {
        var last = pre.steps[pre.steps.length - 1]
        s = { x: last.x, y: last.y, dir: last.dir, t: last.t, pk: last.picked, dl: last.delivered, sw: last.sw, ky: last.ky || 0, ck: last.ck || 0 }
      }
      var rest = (pre.failAt == null) ? search(L, s, SEARCH_LIMIT, null) : null
      if (!rest || !rest.length || keep + rest.length > L.maxLen) {
        if (!L.solution) return null
        keep = 0; prefix = []; rest = L.solution.slice()
      }
      var next = REP[rest[0]] ? rest.slice(0, 2) : rest.slice(0, 1)
      return { lane: 'main', keep: keep, next: next, full: prefix.concat(rest) }
    } catch (e) { return null }
  }

  // every tile the boat passes, in order (start first); bad = the tile the failing chip bumps into.
  // The UI no longer draws this before JALAN! (owner: no trace); gates use it to prove the run trail.
  function preview (def, program) {
    var out = { path: [], ok: false, failAt: null, reason: null, bad: null, end: null, stopAt: null }
    try {
      var L = create(def), r = run(L, program)
      out.ok = r.ok; out.failAt = r.failAt; out.reason = r.reason; out.stopAt = r.endAt
      out.path.push({ x: L.start.x, y: L.start.y, i: -1 })
      r.steps.forEach(function (s) {
        if (s.event === 'bump') return
        if (s.via) out.path.push({ x: s.via.x, y: s.via.y, i: s.idx })
        if (s.hops) for (var h = 0; h < s.hops.length - 1; h++) out.path.push({ x: s.hops[h].x, y: s.hops[h].y, i: s.idx })
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
    var K = function (p) { return p.y * L.w + p.x }
    var solid = function (p) { return L._blk[K(p)] || L._gate[K(p)] }
    var same = function (a, b) { return a && b && a.x === b.x && a.y === b.y }
    if (L.w * L.h < 2) add('size', 'papan terlalu kecil')
    if (!on(L.start)) add('startOutside', 'start di luar papan')
    else if (solid(L.start) || L._door[K(L.start)] != null) add('startOnBlock', 'start di atas es')
    if (!L.goal) add('noGoal', 'tidak ada tujuan')
    else if (!on(L.goal)) add('goalOutside', 'tujuan di luar papan')
    else if (L._blk[L.goal.y * L.w + L.goal.x]) add('goalOnBlock', 'tujuan di atas es')
    if (L.goal && on(L.goal) && same(L.start, L.goal) && !L.items.length && !L.stops.length) add('startIsGoal', 'start sama dengan tujuan')
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
        else if (solid(p) || L._door[K(p)] != null) add('iceOnBlock', 'es ' + i + ' menembus es diam')
        var q = o.path[(j + 1) % o.path.length]
        if (Math.abs(q.x - p.x) + Math.abs(q.y - p.y) > 1) add('iceJump', 'es ' + i + ' melompat di langkah ' + j)
      })
    })
    if (on(L.start) && iceHit(L, L.start.x, L.start.y, 0) >= 0) add('iceOnStart', 'es di atas start')
    // mechanics
    var cell = function (list, name, what) {
      list.forEach(function (p, i) {
        if (!on(p)) add(name + 'Outside', what + ' ' + i + ' di luar papan')
        else if (solid(p)) add(name + 'OnBlock', what + ' ' + i + ' di atas penghalang')
        else if (same(p, L.start) && name !== 'slick' && name !== 'beacon') add(name + 'OnStart', what + ' ' + i + ' di atas start')
      })
    }
    cell(L.keys, 'key', 'kunci'); cell(L.stops, 'stop', 'bendera'); cell(L.slick, 'slick', 'petak licin'); cell(L.q, 'q', 'petak tanya'); cell(L.beacons, 'beacon', 'mercusuar')
    L.doors.forEach(function (d, i) {
      if (!on(d)) add('doorOutside', 'pintu ' + i + ' di luar papan')
      else if (L._blk[K(d)]) add('doorOnBlock', 'pintu ' + i + ' di atas penghalang')
      if (same(d, L.goal)) add('doorOnGoal', 'pintu ' + i + ' di tujuan')
      if (!L.keys.some(function (k) { return k.color === d.color })) add('doorNoKey', 'pintu ' + COLORS[d.color] + ' tanpa kunci ' + COLORS[d.color])
    })
    var seen = {}
    L.stops.forEach(function (p, i) { if (on(p)) { if (seen[K(p)]) add('stopDup', 'dua bendera di satu petak'); seen[K(p)] = 1 } })
    L.whirls.forEach(function (p, i) {
      if (same(p.a, p.b)) add('whirlSame', 'pusaran ' + i + ' ke petak yang sama')
      ;[p.a, p.b].forEach(function (e) {
        if (!on(e)) add('whirlOutside', 'pusaran ' + i + ' di luar papan')
        else if (solid(e) || L._door[K(e)] != null) add('whirlOnBlock', 'pusaran ' + i + ' di atas penghalang')
        if (same(e, L.goal)) add('whirlOnGoal', 'pusaran ' + i + ' di tujuan')
        if (same(e, L.start)) add('whirlOnStart', 'pusaran ' + i + ' di atas start')
      })
    })
    if (!L.tools.filter(function (c) { return c === 'F' || DV[c] }).length) add('noForward', 'tidak ada perintah bergerak')
    if (L.items.length && L.tools.indexOf('P') < 0) add('noPick', 'ada peti tapi tidak ada AMBIL')
    if (L.items.length && L.drop && L.tools.indexOf('D') < 0) add('noDrop', 'ada tempat taruh tapi tidak ada TARUH')
    if (!P.length) {
      if (L.shortest < 0) add('unsolvable', 'tidak ada jalan ke tujuan')
      else if (L.shortest > L.maxLen) add('tooLong', 'jalan terpendek ' + L.shortest + ' > maxLen ' + L.maxLen)
    }
    return P
  }
  // authoring warnings (never block a board): a chest off the par route costs route stars to open; flags that the
  // straight route meets anyway; a moving obstacle that never matters
  function lint (def) {
    var W = []
    try {
      var L = create(def)
      if (!L.solution) return W
      var r = run(L, L.solution), met = {}
      r.steps.forEach(function (s) { (s.quiz || []).forEach(function (q) { met[q.i] = 1 }) })
      L.q.forEach(function (t, i) { if (t.type === 'chest' && !met[i]) W.push({ code: 'qOffRoute', msg: 'peti tanya ' + i + ' tidak di rute terpendek' }) })
      if (L.ice.length) {
        var bare = create({ w: L.w, h: L.h, start: L.start, goal: L.goal, blocks: L.blocks, items: L.items, drop: L.drop, currents: L.currents, switches: L.switches,
          keys: L.keys, doors: L.doors, stops: L.stops, whirls: L.whirls, slick: L.slick, tools: L.tools, fnMax: L.fnMax })
        if (bare.shortest === L.shortest && run(L, bare.solution).ok) W.push({ code: 'mobIdle', msg: 'penghalang bergerak tidak mengubah rute' })
      }
    } catch (e) {}
    return W
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
    create: create, run: run, shortest: shortest, solve: solve, validate: validate, lint: lint, parse: parse,
    nextHint: nextHint, stars: stars, preview: preview, SAMPLES: SAMPLES, CMDS: CMDS.slice(), ROWS: ROWS, COLORS: COLORS.slice(), version: '2.0.0'
  }

  /* ===================================================================== UI */
  var EASE = 'cubic-bezier(.23,1,.32,1)'
  var STEP_MS = 450
  // library keys (resolved through opts.lib, e.g. TKArt.src). `block` may be a list: obstacles cycle through it.
  // world-neutral defaults (owner photo 2026-09-29: a "TITANIC SUPPLIES" crate in the Mayflower world). Titanic-branded
  // sprites (crate-supplies, crate-white-star, lifeboat-11, lifebuoy*, …) only arrive through a Titanic level's own art.
  var ART = { boat: 'vehicles/sailboat', walker: 'tk-key/timmy', ice: 'tk-prop/ice-floe', flag: 'game/flag-red', crate: 'tk-prop/crate-plain',
    timmy: 'tk-key/timmy', lighthouse: 'gt-el/lighthouse', lifeboat: 'tk-prop/lifeboat', tipper: 'tk-char/penguin-sailor',
    compass: 'tk-prop/compass-3', undo: 'gt/undo', sparkle: 'gt-el/star-gold', block: null,
    drop: 'tk-prop/cargo-net', key: 'things/key-gold', lock: 'things/padlock', whirl: 'tk-world/whirlpool', stop: 'game/flag-red',
    bag: 'tk-key/backpack', chest: 'tk-prop/treasure-chest-4', chestOpen: 'tk-prop/treasure-chest-open', seal: 'tk-prop/scroll-sealed',
    cloud: 'nature/cloud', beacon: 'tk-prop/buoy-light', fn: 'tk-prop/blueprint-scroll', hint: 'tk-prop/lantern',
    whale: 'tk-world/whale-tail', patrol: 'tk-top/patrol', tug: 'tk-top/tug' }
  var THEME_ART = {
    sea: { block: ['tk-prop/iceberg-5', 'tk-world/iceberg-2', 'tk-prop/iceberg-3'] },
    deck: { block: ['tk-prop/crate-plain', 'tk-prop/barrels', 'tk-char/officer-boy'] }
  }
  var LABEL = { N: 'Ke atas', E: 'Ke kanan', S: 'Ke bawah', W: 'Ke kiri', F: 'Maju', L: 'Belok kiri', R: 'Belok kanan',
    P: 'Ambil', D: 'Taruh', R2: 'Ulangi 2 kali', R3: 'Ulangi 3 kali', F1: 'Fungsi' }
  var SHORT = { F: 'Maju', L: 'Kiri', R: 'Kanan', P: 'Ambil', D: 'Taruh', R2: 'Ulangi', R3: 'Ulangi', F1: 'Fungsi' }
  // what the boat bumped, by the obstacle sprite (the bubble names it: "Ups, ada tong!")
  var THING = [[/barrel|tong/, 'tong'], [/iceberg|ice-floe|ice/, 'gunung es'], [/rock|arch|cliff|reef|karang|stone|boulder/, 'batu karang'],
    [/crate|cargo|box|peti/, 'peti'], [/rope|coil/, 'gulungan tali'], [/buoy/, 'pelampung'], [/whirlpool/, 'pusaran'], [/officer|char\//, 'awak kapal'],
    [/tire/, 'tumpukan ban'], [/hay/, 'jerami']]
  var MOB_WORD = { ice: 'es yang bergerak', whale: 'paus', patrol: 'kapal patroli', tug: 'kapal tunda' }
  var SAY = {
    block: 'Ups, ada {thing}! Coba jalur lain. Ubah perintah nomor {n}.',
    door: 'Pintunya terkunci. Cari kunci {color} dulu! Ubah perintah nomor {n}.',
    stops: 'Masih ada bendera yang belum diantar. Antar sesuai nomornya!',
    stopsFar: 'Antar ke bendera 1, 2, 3 sesuai urutan, lalu ke tujuan!',
    early: 'Bendera {k} dulu, ya! Urutannya 1, 2, 3.',
    qGood: 'Benar! Hebat!', qBad: 'Tidak apa-apa, ayo lanjut!', qBonus: 'Benar! Bintang bonus!',
    hintAsk: 'Pakai petunjuk? Bintangnya paling banyak 2.', hintFix: 'Ganti perintah nomor {n}, ya.', hintNext: 'Coba tambah: {c}.',
    hintFn: 'Isi Fungsi dulu. Coba tambah: {c}.',
    tour1: 'Ketuk panah untuk menambah perintah.', tour2: 'Perintahmu muncul di sini. Ketuk untuk menghapus.', tour3: 'Tekan JALAN! untuk berlayar.',
    edge: 'Ups, itu ujung laut! Ubah perintah nomor {n}.',
    ice: 'Ups, {thing} menghalangi kapal! Ubah perintah nomor {n}.',
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
    coach: 'Lihat tangan Timmy! Begini cara bermainnya.',
    nudgeGo: 'Rutenya sudah bagus! Tekan JALAN!',
    nudgeFix: 'Ketuk perintah yang berkedip untuk menghapusnya.'
  }
  // deck theme (mockup ui-07): Timmy walks the deck to the lifeboat; obstacles are cargo and crew
  var SAY_DECK = {
    block: 'Ups, ada {thing} di depan! Coba jalur lain. Ubah perintah nomor {n}.',
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
    '.tkg-route{' + PANEL + ';padding:6px 8px 8px;min-width:0;flex:0 0 auto;position:relative}',
    /* more route slots than fit: a fade + a CSS arrow at the right edge (the bar scrolls) */
    '.tkg-slots.more{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 44px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 44px),transparent)}',
    '.tkg-more{position:absolute;right:6px;width:26px;height:30px;margin-top:-15px;pointer-events:none;display:none;z-index:2}',
    '.tkg-more.on{display:block}.tkg-more .tkg-arw{width:100%;height:100%;transform:rotate(90deg)}',
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
    /* something to PICK UP never looks like an obstacle: a gold glow ring + a star badge */
    '.tkg-item:not(.dl):before{content:"";position:absolute;inset:6%;border-radius:50%;background:radial-gradient(circle,rgba(255,226,120,.5),rgba(255,226,120,0) 70%);box-shadow:0 0 0 3px rgba(255,216,74,.85);animation:tkg-nudge 1.8s var(--e) infinite}',
    '.tkg-item .bd{position:absolute;right:4%;top:4%;width:30%;height:30%;filter:drop-shadow(0 0 3px rgba(255,230,120,.9))}',
    '.tkg-item.gone .bd,.tkg-item.dl .bd{display:none}',
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
    'font-size:14px;line-height:1.25;font-weight:800;pointer-events:none}',
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
  // tablet type floor (owner tablet 1280x800 "tulisan kecil", qa-tk-ui-audit): no text under 14 px when the short side is >= 600 px
  // landscape tablet scale (tkg--tab, --ks from layout): command buttons >= 64 px, JALAN! the biggest, the title plate
  // hugs its words at a readable size, the tip reads at 16 px+ (owner photo 2026-09-29)
  CSS += '\n.tkg--tab .tkg-btn{height:calc(64px * var(--ks,1));min-width:calc(64px * var(--ks,1));font-size:calc(17px * var(--ks,1))}' +
    '.tkg--tab .tkg-btn .tkg-ic{width:calc(28px * var(--ks,1));height:calc(28px * var(--ks,1))}' +
    '.tkg--tab .tkg-go,.tkg--tab .tkg-cact.stack .tkg-go{height:calc(76px * var(--ks,1));font-size:calc(26px * var(--ks,1))}.tkg--tab .tkg-go .tkg-ic{width:calc(34px * var(--ks,1));height:calc(34px * var(--ks,1))}' +
    '.tkg--tab .tkg-cact.stack{grid-template-columns:calc(64px * var(--ks,1)) minmax(0,1fr)}.tkg--tab .tkg-cact.stack .tkg-undo{width:calc(64px * var(--ks,1))}.tkg--tab .tkg-cact.tight .tkg-trash{width:calc(64px * var(--ks,1))}' +
    '.tkg--tab .tkg-chip{font-size:calc(15px * var(--ks,1))}.tkg--tab .tkg-chip .tkg-ic{width:calc(34px * var(--ks,1));height:calc(34px * var(--ks,1))}' +
    '.tkg--tab .tkg-plate{width:auto;max-width:100%;padding:calc(6px * var(--ks,1)) calc(34px * var(--ks,1)) calc(8px * var(--ks,1))}' +
    '.tkg--tab .tkg-plate b{font-size:calc(30px * var(--ks,1))}.tkg--tab .tkg-plate small,.tkg--tab .tkg-plate span{font-size:calc(16px * var(--ks,1))}' +
    '.tkg--tab .tkg-tip{font-size:calc(16px * var(--ks,1));line-height:1.3}.tkg--tab .tkg-h,.tkg--tab .tkg-h small{font-size:calc(16px * var(--ks,1))}' +
    '.tkg--tab .tkg-slot{font-size:calc(16px * var(--ks,1))}.tkg--tab .tkg-bubble{min-width:150px}'
  CSS += '\n@media (min-width:600px) and (min-height:600px){.tkg-chip,.tkg--land .tkg-plate small,.tkg--land .tkg-chap span,.tkg-chap span,.tkg-plate small,.tkg-plate span,.tkg-h small,.tkg-rose b,.tkg-bubble em,.tkg-pchip small,.tkg-tip,.tkg-gh b,.tkg--short .tkg-bubble,.tkg-hintb .tkg-hl,.tkg-repb>i,.tkg-lane>b,.tkg-bag{font-size:14px}.tkg-num{font-size:13px}}'

  /* ── mechanics + feedback (design 2026-09-29): transform / opacity only; .tkg--rm keeps fades ── */
  var KEYC = ['#ff5a5a', '#3fa2ff', '#35c26b']
  var KEYF = ['hue-rotate(-42deg) saturate(1.7)', 'hue-rotate(172deg) saturate(1.5)', 'hue-rotate(72deg) saturate(1.4)']
  CSS += '\n' + [
    '.tkg{--e-io:cubic-bezier(.77,0,.175,1)}',
    '.tkg-boat.tkg-io{transition:transform 380ms var(--e-io),opacity 140ms linear}',
    '.tkg-boat.tkg-glide{transition:transform 160ms linear,opacity 140ms linear}',
    '.tkg-chip--bad{box-shadow:0 0 0 3px #fff,0 0 0 6px #ff5a5a!important;border-color:#ffb3b3}',
    /* keys + colour doors */
    '.tkg-key:before{content:"";position:absolute;inset:16%;border-radius:50%;border:4px solid var(--kc);background:color-mix(in srgb,var(--kc) 22%,transparent);box-shadow:0 0 10px var(--kc)}',
    '.tkg-key img{position:relative;width:64%;height:64%;filter:var(--kf) drop-shadow(0 2px 2px rgba(0,20,60,.5))}',
    '.tkg-key{overflow:hidden;border-radius:50%}',
    '.tkg-key:after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.75),transparent);transform:translateX(-120%);animation:tkg-glint 3s var(--e) infinite}',
    '.tkg-key.got{opacity:0;transition:opacity 200ms linear}',
    '.tkg-door{perspective:400px}',
    '.tkg-door .dr{position:absolute;inset:4%;border-radius:8px;background:repeating-linear-gradient(90deg,#8a5a2b 0 18%,#a8764a 18% 22%),#8a5a2b;box-shadow:inset 0 0 0 3px var(--kc),0 3px 4px rgba(0,10,30,.45);transform-origin:0 50%;transition:transform 240ms var(--e),opacity 240ms linear}',
    '.tkg-door .lk{position:relative;width:52%;height:52%;filter:var(--kf) drop-shadow(0 2px 2px rgba(0,0,0,.45));transition:transform 240ms var(--e),opacity 200ms linear}',
    '.tkg-door.open .dr{transform:rotateY(-78deg);opacity:.25}.tkg-door.open .lk{transform:translateY(22%);opacity:0}',
    /* numbered flags */
    '.tkg-stop img{width:74%;height:74%;transform-origin:20% 95%;transition:transform 220ms var(--e)}',
    '.tkg-stop b{position:absolute;left:8%;top:8%;min-width:44%;height:44%;border-radius:999px;background:#fff;color:#12314f;font-size:calc(var(--t) * .28);font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px #1d5fc0;line-height:1}',
    '.tkg-stop.done b{background:#ffd84a;box-shadow:0 0 0 3px #b07a0c,0 0 12px rgba(255,216,74,.9)}',
    '.tkg-stop.done img{transform:rotate(-8deg)}',
    '.tkg-stop.shake img{animation:tkg-wig 360ms var(--e) 2}',
    /* licin */
    '.tkg-slick{border-radius:6px;background:linear-gradient(135deg,rgba(220,250,255,.78),rgba(150,215,245,.62) 55%,rgba(210,245,255,.8));box-shadow:inset 0 0 0 2px rgba(255,255,255,.7)}',
    '.tkg-slick:after{content:"";position:absolute;left:18%;top:22%;width:46%;height:10%;border-radius:6px;background:rgba(255,255,255,.9);transform:rotate(-32deg)}',
    '.tkg--deck .tkg-slick{background:linear-gradient(135deg,rgba(160,220,255,.5),rgba(90,160,220,.42));box-shadow:inset 0 0 0 2px rgba(200,235,255,.6)}',
    '.tkg-skid{position:absolute;left:0;top:0;width:var(--t);height:var(--t);pointer-events:none;z-index:3}',
    '.tkg-skid i{position:absolute;top:40%;width:34%;height:6%;border-radius:4px;background:rgba(255,255,255,.95);animation:tkg-fade 520ms linear forwards}',
    /* whirlpool pair */
    '.tkg-whirl img{width:96%;height:96%;border-radius:50%;animation:tkg-spin 12s linear infinite}',
    '.tkg-whirl:before{content:"";position:absolute;inset:4%;border-radius:50%;border:3px solid var(--wc)}',
    /* question chest / door */
    '.tkg-qt img{width:80%;height:80%;filter:drop-shadow(0 3px 3px rgba(0,10,30,.5))}',
    '.tkg-qt:before{content:"";position:absolute;inset:6%;border-radius:12px;border:3px solid #ffd84a;box-shadow:0 0 12px rgba(255,216,74,.7)}',
    '.tkg-qt.door .dr{position:absolute;inset:4%;border-radius:8px;background:repeating-linear-gradient(90deg,#6e4520 0 18%,#8a5a2b 18% 22%),#6e4520;box-shadow:inset 0 0 0 3px #ffd84a;transform-origin:0 50%;transition:transform 240ms var(--e),opacity 240ms linear}',
    '.tkg-qt.door img{position:relative;width:58%;height:58%}',
    '.tkg-qt.open:before{opacity:0}.tkg-qt.door.open .dr{transform:perspective(400px) rotateY(-78deg);opacity:.25}.tkg-qt.door.open img{opacity:0;transition:opacity 200ms linear}',
    /* fog + lighthouse */
    '.tkg-fogc{z-index:6;transition:opacity 300ms var(--e),transform 300ms var(--e)}',
    '.tkg-fogc img{width:150%;height:150%;max-width:none;opacity:.92;filter:saturate(.4) brightness(1.08)}',
    '.tkg-fogc.clear{opacity:0}',
    '.tkg-bcn img{width:84%;height:84%}',
    '.tkg-beam{position:absolute;left:0;top:0;width:var(--t);height:var(--t);pointer-events:none;z-index:7}',
    '.tkg-beam:before{content:"";position:absolute;left:50%;top:50%;width:calc(var(--t) * 5);height:calc(var(--t) * 5);margin:calc(var(--t) * -2.5);border-radius:50%;',
    'background:conic-gradient(from 0deg,rgba(255,240,170,.75),rgba(255,240,170,0) 16%,rgba(255,240,170,0) 100%);animation:tkg-sweep 900ms var(--e-io) forwards}',
    /* moving obstacles: the rule (a dotted loop), never a per-step prediction */
    '.tkg-loops{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:2;overflow:visible}',
    '.tkg-loops .lp{fill:none;stroke:rgba(255,255,255,.4);stroke-width:.06;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:.001 .16}',
    '.tkg-loops .cv{fill:rgba(255,255,255,.5)}',
    '.tkg-imv[data-kind=whale]:before,.tkg-imv[data-kind=patrol]:before,.tkg-imv[data-kind=tug]:before{display:none}',
    '.tkg-imv[data-kind=patrol] img,.tkg-imv[data-kind=tug] img{width:90%;height:90%;filter:drop-shadow(0 3px 2px rgba(0,20,60,.45));transition:transform 240ms var(--e)}',
    '.tkg-imv[data-kind=whale] img{width:90%;height:90%;filter:drop-shadow(0 3px 2px rgba(0,20,60,.45));transition:transform 240ms var(--e)}',
    /* trail: appears only as the boat moves (feedback, never a preview) */
    '.tkg-trail{position:absolute;left:0;top:0;width:var(--t);height:var(--t);pointer-events:none;z-index:2;opacity:.55;transition:opacity 300ms linear}',
    '.tkg-trail:before,.tkg-trail:after{content:"";position:absolute;left:50%;top:50%;width:18%;height:11%;margin:-5.5% 0 0 -20%;border-radius:50%;background:rgba(235,248,255,.9);transform:rotate(var(--r,0deg)) translateY(-70%)}',
    '.tkg-trail:after{margin-left:2%;transform:rotate(var(--r,0deg)) translateY(70%)}',
    '.tkg--deck .tkg-trail:before,.tkg--deck .tkg-trail:after{background:rgba(60,32,10,.45)}',
    /* bump: star daze */
    '.tkg-daze{position:absolute;left:0;top:0;width:var(--t);height:var(--t);pointer-events:none;z-index:8}',
    '.tkg-daze i{position:absolute;left:50%;top:14%;width:26%;height:26%;margin-left:-13%}',
    '.tkg-daze img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 4px rgba(255,230,120,.9))}',
    /* backpack / cargo counter */
    '.tkg-bag{display:inline-flex;align-items:center;gap:4px;padding:2px 10px 2px 4px;border-radius:999px;background:rgba(0,0,0,.28);font-size:16px;font-weight:900}',
    '.tkg-bag img{width:26px;height:26px;object-fit:contain}',
    '.tkg-bag .ks{display:inline-flex;gap:2px}.tkg-bag .ks img{width:20px;height:20px}',
    '.tkg-hr{display:inline-flex;align-items:center;gap:6px}',
    '.tkg-fly2{position:absolute;left:0;top:0;width:40px;height:40px;z-index:40;pointer-events:none}.tkg-fly2 img{width:100%;height:100%;object-fit:contain}',
    /* the golden path after a WIN */
    '.tkg-goldsvg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:6;overflow:visible}',
    '.tkg-gold{fill:none;stroke:#ffd84a;stroke-width:.16;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 .08px #fff6c2)}',
    /* repeat bracket + Fungsi lane */
    '.tkg-repb{position:relative;display:flex;flex:0 0 auto;gap:4px;padding:10px 4px 3px;border:3px solid #d8b27a;border-bottom:0;border-radius:14px 14px 4px 4px}',
    '.tkg-repb>i{position:absolute;left:50%;top:-12px;transform:translateX(-50%);display:flex;align-items:center;gap:2px;padding:0 7px 0 3px;height:22px;border-radius:11px;background:#6b4a22;color:#fff;font-style:normal;font-size:13px;font-weight:900;white-space:nowrap;box-shadow:0 1px 0 rgba(0,0,0,.3)}',
    '.tkg-repb>i img{width:18px;height:18px;object-fit:contain}',
    '.tkg-repb.on{border-color:#ffd84a}.tkg-repb.on>i{background:#b07a0c}',
    '.tkg-slot--want{border-style:dashed;border-color:#d8b27a;color:#d8b27a}',
    '.tkg-lane{display:flex;align-items:center;gap:6px;margin-top:6px;border-radius:12px;padding:2px 4px;border:2px solid transparent;cursor:pointer}',
    '.tkg-lane.act{border-color:#ffd84a;background:rgba(255,216,74,.08)}',
    '.tkg-lane>b{flex:0 0 auto;display:flex;align-items:center;gap:4px;font-size:14px;font-weight:900;min-height:44px}',
    '.tkg-lane>b img{width:30px;height:30px;object-fit:contain}',
    '.tkg-lane .tkg-slots{flex:1 1 auto;padding-top:0}',
    '.tkg-chip .tkg-fnic{width:30px;height:30px}',
    /* Petunjuk: an explicit choice */
    '.tkg-hintb .tkg-hl{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);padding:1px 7px;border-radius:8px;background:#ffd84a;color:#4a3000;font-size:12px;font-weight:900;white-space:nowrap;text-shadow:none;z-index:2}',
    '.tkg-ask{position:absolute;left:50%;top:50%;z-index:35;min-width:250px;max-width:calc(100% - 24px);padding:14px 16px;border-radius:18px;background:#fff;color:#12314f;box-shadow:0 12px 30px rgba(0,10,40,.45);text-align:center;',
    'opacity:0;transform:translate(-50%,-50%) scale(.96);transition:opacity 180ms linear,transform 200ms var(--e);pointer-events:none}',
    '.tkg-ask.on{opacity:1;transform:translate(-50%,-50%);pointer-events:auto}',
    '.tkg-ask p{margin:0 0 8px;font-size:17px;font-weight:900;line-height:1.25}',
    '.tkg-ask .st{display:flex;justify-content:center;gap:4px;margin-bottom:10px}.tkg-ask .st img{width:34px;height:34px}.tkg-ask .st img.dim{opacity:.3;filter:grayscale(1)}',
    '.tkg-ask .bt{display:flex;gap:10px;justify-content:center}.tkg-ask .tkg-btn{min-width:96px}',
    '.tkg-ask .yes{background:linear-gradient(180deg,#48d465,#1f9a3f);box-shadow:0 4px 0 #146e2d}.tkg-ask .no{background:linear-gradient(180deg,#667894,#3e4c66);box-shadow:0 4px 0 #27324a}',
    '.tkg-slot--ghost{border:2px dashed #ffd84a;color:transparent;position:relative;animation:tkg-nudge 1.2s var(--e) infinite}',
    '.tkg-slot--ghost .tkg-ic{width:26px;height:26px;opacity:.55}',
    '.tkg-chip--fix{box-shadow:0 0 0 3px #fff,0 0 0 6px #ff5a5a;outline:3px dashed #ff5a5a;outline-offset:4px}',
    '@keyframes tkg-glint{0%,70%{transform:translateX(-120%)}100%{transform:translateX(320%)}}',
    '@keyframes tkg-fade{0%{opacity:1}100%{opacity:0}}',
    '@keyframes tkg-sweep{0%{transform:rotate(-40deg);opacity:0}20%{opacity:1}100%{transform:rotate(320deg);opacity:0}}',
    '.tkg--won .tkg-key:after,.tkg--won .tkg-whirl img{animation-play-state:paused}',
    '.tkg--rm .tkg-door .dr,.tkg--rm .tkg-door .lk,.tkg--rm .tkg-qt .dr,.tkg--rm .tkg-fogc,.tkg--rm .tkg-stop img{transition:opacity 140ms linear!important;transform:none!important}',
    '.tkg--rm .tkg-door.open .dr,.tkg--rm .tkg-qt.door.open .dr{opacity:0}',
    '.tkg--rm .tkg-slot--ghost{box-shadow:0 0 0 3px #ffd84a}',
    /* tablet type floor (short side >= 600): no text under 14 px (comes last so it wins over the base sizes above) */
    '@media (min-width:600px) and (min-height:600px){.tkg-hintb .tkg-hl,.tkg-repb>i,.tkg-lane>b,.tkg-bag{font-size:14px}}'
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
    else if (name === 'skid') noise(0.18, 0.06, 900, 400)
    else if (name === 'warp') { tone(300, 900, 0.3, 'sine', 0.06); noise(0.3, 0.05, 400, 1800) }
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
    var trail = [], blkArt = {}   // tiles the boat left this run (feedback only) · obstacle sprite per tile (bubble words)
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
        if (name === 'bad' || name === 'duk') synth('bump')
        else if (name === 'win') synth('splash')
        else if (name === 'step' || name === 'current' || name === 'bump' || name === 'splash' || name === 'skid' || name === 'warp') synth(name)
        else if (name === 'coin' && cue) S.cue('coin', { volume: 0.5 })
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
    // the cargo must never share a sprite with this board's obstacles (playtest: item crate == obstacle crate)
    if (blockKeys.indexOf(art.crate) >= 0) art.crate = ['tk-prop/crate-fragile', 'tk-prop/sealed-letter', 'tk-prop/water-barrel'].filter(function (k) { return blockKeys.indexOf(k) < 0 })[0]
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
    // the mission always reads in full on the plate (playtest: the host's goal pill cuts it off on a phone)
    if (plateSub && plateSub !== plateBig) { var ps = el('span'); ps.textContent = plateSub; plate.appendChild(ps) }

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
    if (opts.hintButton !== false) { hintB.type = 'button'; hintB.setAttribute('aria-label', 'Petunjuk dari Timmy. Bintang paling banyak 2') }
    hintB.appendChild(img(src('timmy'), '', 'Timmy'))
    if (opts.hintButton !== false) { hintB.appendChild(el('i', '', wrapIc(ic('hint')))); hintB.appendChild(el('span', 'tkg-hl', 'Petunjuk')) }
    var bubble = el('div', 'tkg-bubble'); bubble.setAttribute('role', 'status'); bubble.setAttribute('aria-live', 'polite')
    var bTxt = el('span'); bubble.appendChild(el('em', '', 'Timmy')); bubble.appendChild(bTxt)
    tim.appendChild(hintB); tim.appendChild(bubble)

    var route = el('div', 'tkg-route')
    var rh = el('div', 'tkg-h')
    var rTitle = el('span'); rTitle.innerHTML = 'Rutemu <small>(maks ' + L.maxLen + ' langkah)</small>'
    var count = el('span', 'tkg-count', '<i class="tkg-ic" aria-hidden="true">' + ic('star') + '</i>'); count.setAttribute('aria-label', 'Bintang')
    var countN = el('span'); countN.textContent = String(int(opts.starBase, 0)); count.appendChild(countN)
    // backpack / cargo counter: only on boards with something to carry, keys or flags
    var bag = null, bagN = null, bagK = null
    if (L.items.length || L.keys.length || L.stops.length || L.q.length) {
      bag = el('span', 'tkg-bag'); bag.setAttribute('aria-label', 'Muatan'); bag.appendChild(img(src('bag'), '', ''))
      bagK = el('span', 'ks'); bag.appendChild(bagK); bagN = el('span'); bagN.textContent = '0'; bag.appendChild(bagN)
    }
    var rhR = el('span', 'tkg-hr'); if (bag) rhR.appendChild(bag); rhR.appendChild(count)
    rh.appendChild(rTitle); rh.appendChild(rhR); route.appendChild(rh)
    var slots = el('div', 'tkg-slots'); slots.setAttribute('aria-label', theme === 'deck' ? 'Rute Timmy' : 'Rute kapal'); route.appendChild(slots)
    // Fungsi lane (tool F1): its own slots; tap the lane header to make it the lane the palette adds to
    var hasFn = L.tools.indexOf('F1') >= 0, fnLane = null, fnSlots = null, mainLane = null
    if (hasFn) {
      route.removeChild(slots)
      mainLane = el('div', 'tkg-lane tkg-lane-main act'); mainLane.appendChild(el('b', '', '<span>Rute</span>')); mainLane.appendChild(slots); route.appendChild(mainLane)
      fnLane = el('div', 'tkg-lane tkg-lane-fn'); var fb = el('b'); fb.appendChild(img(src('fn'), '', '')); fb.appendChild(el('span', '', 'Fungsi')); fnLane.appendChild(fb)
      fnSlots = el('div', 'tkg-slots tkg-fnslots'); fnSlots.setAttribute('aria-label', 'Fungsi'); fnLane.appendChild(fnSlots); route.appendChild(fnLane)
      mainLane.setAttribute('role', 'button'); fnLane.setAttribute('role', 'button')
    }

    var tip = el('div', 'tkg-tip')
    var tipTxt = el('div'); tipTxt.innerHTML = '<b>Tips Asisten Pinguin:</b>'
    // the default tip names what actually blocks THIS board (a Vasa board of rock arches said "Gunung es")
    var bj = blockKeys.join(' '), defTip = !L.blocks.length ? 'Pikirkan dulu rutenya, lalu tekan JALAN!'
      : /ice|es\b|berg/.test(bj) ? say$.tip : theme === 'deck' ? 'Pikirkan dulu rutenya. Barang di dek menghalangi jalan!'
        : /rock|arch|cliff|reef|karang|stone/.test(bj) ? 'Pikirkan dulu rutenya. Batu karang menghalangi jalan!' : 'Pikirkan dulu rutenya. Cari jalan yang kosong!'
    var tipSpan = el('span'); tipSpan.textContent = str(opts.tip || def.tip || defTip); tipTxt.appendChild(tipSpan)
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
      if (L.stops.length) return 'Antar ke bendera ' + L.stops.map(function (p, i) { return i + 1 }).join(', ') + ' sesuai urutan' + (L.goalIsStop ? '!' : ', lalu ke tujuan!')
      if (L.keys.length) return 'Ambil kunci, buka pintu yang warnanya sama, lalu ke bendera!'
      if (L.items.length) return L.drop ? 'Ambil peti, lalu antar ke tanda kuning!' : 'Ambil semua peti, lalu ke bendera!'
      if (L.whirls.length) return 'Pusaran membawa kapal ke pusaran pasangannya. Cari jalannya!'
      if (L.slick.length) return 'Di petak licin kapal terus meluncur sampai terhalang!'
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
    // world-neutral markers; a level may bring its own (def.goalArt / def.dropArt, e.g. the mother penguin)
    if (L.drop) { O.drop = obj('tkg-drop', L.drop.x, L.drop.y, wrapIc('')); O.drop.firstChild.appendChild(img(def.dropArt ? libSrc(def.dropArt) : src('drop'))) }
    if (L.goal && !(L.drop && L.drop.x === L.goal.x && L.drop.y === L.goal.y) && !L.goalIsStop) {
      O.goal = obj('tkg-goal', L.goal.x, L.goal.y)
      if (def.goalArt) O.goal.appendChild(img(libSrc(def.goalArt), 'lh', ''))
      else O.goal.appendChild(img(src(theme === 'deck' ? 'lifeboat' : 'lighthouse'), 'lh', theme === 'deck' ? 'Sekoci' : 'Mercusuar'))
      O.goal.appendChild(img(src('flag'), 'fl'))
    }
    // mechanics objects
    O.key = []; O.door = []; O.stop = []; O.whirl = []; O.q = []; O.fog = []; O.bcn = []
    L.slick.forEach(function (p) { obj('tkg-slick', p.x, p.y) })
    L.keys.forEach(function (k) {
      var e = obj('tkg-key', k.x, k.y); e.style.setProperty('--kc', KEYC[k.color]); e.style.setProperty('--kf', KEYF[k.color])
      e.setAttribute('data-color', COLORS[k.color]); e.appendChild(img(src('key'), '', 'Kunci ' + COLORS[k.color])); O.key.push(e)
    })
    L.doors.forEach(function (k) {
      var e = obj('tkg-door', k.x, k.y, '<i class="dr"></i>'); e.style.setProperty('--kc', KEYC[k.color]); e.style.setProperty('--kf', KEYF[k.color])
      e.setAttribute('data-color', COLORS[k.color]); e.appendChild(img(src('lock'), 'lk', 'Pintu ' + COLORS[k.color])); O.door.push(e)
    })
    L.stops.forEach(function (p, i) {
      var e = obj('tkg-stop', p.x, p.y); e.appendChild(img(src('stop'), '', '')); var b = el('b'); b.textContent = String(i + 1); e.appendChild(b)
      e.setAttribute('data-n', String(i + 1)); O.stop.push(e)
    })
    var WC = ['#7fd0ff', '#c79bff']
    L.whirls.forEach(function (p, j) {
      ;[p.a, p.b].forEach(function (q) { var e = obj('tkg-whirl', q.x, q.y); e.style.setProperty('--wc', WC[j % 2]); e.setAttribute('data-pair', String(j)); e.appendChild(img(src('whirl'), '', 'Pusaran')); O.whirl.push(e) })
    })
    L.q.forEach(function (t) {
      var e = obj('tkg-qt ' + t.type, t.x, t.y, t.type === 'door' ? '<i class="dr"></i>' : '')
      e.appendChild(img(src(t.type === 'door' ? 'seal' : 'chest'), '', t.type === 'door' ? 'Pintu pertanyaan' : 'Peti pertanyaan')); O.q.push(e)
    })
    L.beacons.forEach(function (b) { O.bcn.push(spriteObj('tkg-bcn', 'beacon', b.x, b.y)) })
    var goalEl = O.goal || O.drop || O.stop[O.stop.length - 1] || null
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
      var bk = blockKeys[(b.x * 7 + b.y * 3 + nb++) % blockKeys.length]
      var e = obj('tkg-blk', b.x, b.y); e.appendChild(img(libSrc(bk))); blkArt[b.y * L.w + b.x] = bk
    })
    // moving obstacles: the patrol path is a RULE the child can read (a subtle dotted loop with direction chevrons),
    // never a per-step prediction (owner 2026-09-29)
    var loops = document.createElementNS(SVGNS, 'svg')
    loops.setAttribute('class', 'tkg-loops'); loops.setAttribute('aria-hidden', 'true')
    loops.setAttribute('viewBox', '0 0 ' + L.w + ' ' + L.h); loops.setAttribute('preserveAspectRatio', 'none')
    L.ice.forEach(function (o) {
      if (o.path.length < 2) return
      var pts = o.path.map(function (p) { return (p.x + 0.5) + ',' + (p.y + 0.5) }), pl = document.createElementNS(SVGNS, 'polyline')
      pl.setAttribute('class', 'lp'); pl.setAttribute('points', pts.concat([pts[0]]).join(' ')); loops.appendChild(pl)
      o.path.forEach(function (p, j) {
        var q = o.path[(j + 1) % o.path.length]; if (q.x === p.x && q.y === p.y) return
        var mx = (p.x + q.x) / 2 + 0.5, my = (p.y + q.y) / 2 + 0.5, a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI
        var cv = document.createElementNS(SVGNS, 'polygon'); cv.setAttribute('class', 'cv'); cv.setAttribute('points', '0.07,0 -0.05,-0.06 -0.05,0.06')
        cv.setAttribute('transform', 'translate(' + mx + ',' + my + ') rotate(' + a + ')'); loops.appendChild(cv)
      })
    })
    board.appendChild(loops)
    L.items.forEach(function (it) { var e = spriteObj('tkg-item tkg-mv', 'crate', it.x, it.y); e.appendChild(img(src('sparkle'), 'bd', '')); O.item.push(e) })
    L.ice.forEach(function (o) { var e = spriteObj('tkg-imv tkg-mv', o.kind === 'ice' ? 'ice' : o.kind, o.path[0].x, o.path[0].y); e.setAttribute('data-kind', o.kind); O.imv.push(e) })
    var boat = obj('tkg-boat', L.start.x, L.start.y)
    var bump = el('div', 'tkg-bump'), bob = el('div', 'tkg-bob'), hd = el('div', 'tkg-hd', wrapIc(arw('N', 'tkg-hdarw')))
    var carry = el('div', 'tkg-carry'); carry.appendChild(img(src('crate')))
    bob.appendChild(img(src(theme === 'deck' ? 'walker' : 'boat'), '', theme === 'deck' ? 'Timmy' : 'Kapal')); bob.appendChild(carry); bump.appendChild(hd); bump.appendChild(bob); boat.appendChild(bump)

    // fog (visual only): start, goal and beacons are seen; every tile the boat reaches reveals radius 1 for the mount
    var fogCell = {}
    if (L.fog) {
      for (var fy = 0; fy < L.h; fy++) for (var fx0 = 0; fx0 < L.w; fx0++) {
        var fc = obj('tkg-fogc', fx0, fy); fc.appendChild(img(src('cloud'), '', '')); fogCell[fy * L.w + fx0] = fc; O.fog.push(fc)
      }
    }
    function unfog (x, y, r, stagger) {
      if (!L.fog) return 0
      var n = 0
      for (var yy = y - r; yy <= y + r; yy++) for (var xx = x - r; xx <= x + r; xx++) {
        var c = inside(L, xx, yy) && fogCell[yy * L.w + xx]
        if (!c || c.classList.contains('clear')) continue
        n++
        ;(function (c, d) { if (stagger && !rm) later(function () { c.classList.add('clear') }, d * 40); else c.classList.add('clear') })(c, Math.abs(xx - x) + Math.abs(yy - y))
      }
      return n
    }
    if (L.fog) {
      unfog(L.start.x, L.start.y, 1); if (L.goal) unfog(L.goal.x, L.goal.y, 1)
      L.beacons.forEach(function (b) { unfog(b.x, b.y, 0) })
    }
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
      var all = board.querySelectorAll('.tkg-o,.tkg-idot,.tkg-gh,.tkg-trail,.tkg-fx,.tkg-skid,.tkg-daze,.tkg-beam')
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
        // landscape tablet (owner photo 2026-09-29: small command buttons + tiny route slots beside a huge board): the
        // side panel, route slots and bottom band grow with the frame; ks = 1 at 1280x800, up to 1.5 on a big tablet
        var tab = W >= 800 && H >= 600, ks = tab ? Math.max(1, Math.min(1.5, Math.min(W / 1280, H / 800))) : 1
        root.classList.toggle('tkg--tab', tab); root.style.setProperty('--ks', ks.toFixed(3))
        root.classList.toggle('tkg--short', !tall)
        root.classList.toggle('tkg--side', side)
        root.classList.toggle('tkg--noplate', H < 470)
        var botH = Math.round((tall ? 124 : 98) * ks)
        root.style.setProperty('--both', botH + 'px')
        root.style.setProperty('--timw', (tall ? 112 : 64) + 'px'); root.style.setProperty('--timh', (tall ? botH : 72) + 'px')
        bh = Math.round((tall ? 68 : 64) * ks)
        var colH = H - 16 - (tall ? botH + 8 : 0), bH = tab ? Math.round(64 * ks) : 56, gH = tab ? Math.round(76 * ks) : 62
        for (cols = 1; cols <= 4; cols++) {
          var rows = Math.ceil(n / cols), actH = cols === 1 ? bH + 6 + gH : bH
          if (30 + 16 + rows * (bh + 6) + actH <= colH) break
        }
        cols = Math.min(Math.max(cols, 1), 4, n)
        if (cols === 1 && n > 5) cols = 2
        var cmdw = Math.round((cols === 1 ? 200 : Math.max(284, cols * 70 + 26)) * ks)
        bw = Math.min(Math.round((cols === 1 ? 150 : 110) * ks), Math.floor((cmdw - 20 - (cols - 1) * 6) / cols))
        root.style.setProperty('--cmdw', cmdw + 'px')
        root.style.setProperty('--sidew', (W >= 1200 ? 220 : 196) + 'px')
        cact.classList.toggle('stack', cols === 1)
        cact.classList.toggle('tight', cols !== 1 && cmdw < 320)
        // the tip card needs a real route bar beside it
        root.classList.toggle('tkg--notip', !tall || W - Math.max(cmdw, 270) - 380 - 40 < 6 * 58)
      } else {
        root.classList.remove('tkg--short'); root.classList.remove('tkg--side'); cact.classList.remove('stack'); root.classList.remove('tkg--tab'); root.style.setProperty('--ks', '1')
        cols = Math.min(4, n)
        bh = 64
        bw = Math.max(64, Math.min(96, Math.floor((W - 40 - (cols - 1) * 6) / cols)))
        cact.classList.toggle('tight', W < 340)
        root.classList.remove('tkg--noplate'); root.classList.remove('tkg--notip')
        if (!showChap) root.classList.add('tkg--nochap'); else root.classList.remove('tkg--nochap')
      }
      root.style.setProperty('--slot', (land ? (W >= 800 && H >= 600 ? Math.round(64 * Math.max(1, Math.min(1.5, Math.min(W / 1280, H / 800)))) : H >= 540 ? 52 : 48) : (W >= 600 && H >= 900 ? 60 : 48)) + 'px')
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
      fitSlots()
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
    // every route slot visible: shrink the slots to fit the bar (never under 44 px); if they still do not fit,
    // the bar shows a fade + arrow (playtest 2026-09-29: 7-8 of 12 slots visible, nothing said there were more)
    function fitSlots () {
      var base = parseFloat(root.style.getPropertyValue('--slot')) || 48, pads = [[slots, L.maxLen]]
      if (hasFn) pads.push([fnSlots, L.fnMax])
      var want = base
      pads.forEach(function (p) {
        var w = p[0].clientWidth
        if (!w) return
        var fit = Math.floor((w - 4 - (p[1] - 1) * 6) / p[1])
        if (fit < want) want = fit
      })
      // floors: a tablet (>= 1000 x 700) keeps route slots >= 60 px (owner tablet photo 2026-09-29), a phone >= 48 px;
      // below the floor the bar scrolls and shows its fade + arrow instead of shrinking further
      var vwp = G.innerWidth || root.clientWidth, vhp = G.innerHeight || root.clientHeight
      var tabF = vwp >= 1000 && vhp >= 700 ? 60 : 48
      want = Math.max(Math.min(tabF, base), Math.min(base, want))
      if (want !== base) root.style.setProperty('--slot', want + 'px')
      moreSlots()
    }
    function moreSlots () {
      ;[slots, fnSlots].forEach(function (b) {
        if (!b) return
        var more = b.scrollWidth > b.clientWidth + 2 && b.scrollLeft + b.clientWidth < b.scrollWidth - 2
        b.classList.toggle('more', more)
        var m = b._more
        if (!m) { m = b._more = el('div', 'tkg-more', arw('E')); m.setAttribute('aria-hidden', 'true'); route.appendChild(m); b.addEventListener('scroll', moreSlots) }
        m.classList.toggle('on', more)
        if (more) m.style.top = (b.getBoundingClientRect().top - route.getBoundingClientRect().top + b.clientHeight / 2) + 'px'
      })
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
        O.key.forEach(function (e) { e.classList.remove('got') })
        O.door.forEach(function (e) { e.classList.remove('open') })
        O.stop.forEach(function (e) { e.classList.remove('done'); e.classList.remove('shake') })
        O.imv.forEach(function (e) { if (e.firstChild) e.firstChild.style.transform = '' })
        var tr = board.querySelectorAll('.tkg-trail,.tkg-goldsvg'); for (var ti = 0; ti < tr.length; ti++) tr[ti].parentNode.removeChild(tr[ti])
        trail.length = 0
        if (bagK) bagK.innerHTML = ''
        bagSync(null)
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

    /* ── palette + route ──
       Two lanes when the board has Fungsi: 'm' = the route (st.prog), 'f' = the Fungsi body (st.fn). A chip carries
       data-lane, data-idx (index inside its lane) and data-f (its index in the FLAT program the engine runs:
       main…, 'FN', body…), so run steps / failures map to the exact chip. A repeat chip and its target sit inside
       one rope bracket (.tkg-repb); a repeat with nothing after it shows a dashed "put a command here" slot. */
    st.fn = []; st.lane = 'm'
    function flat () { return hasFn ? st.prog.concat(['FN'], st.fn) : st.prog.slice() }
    function laneArr (l) { return l === 'f' ? st.fn : st.prog }
    function setLane (l, a) { if (l === 'f') st.fn = a; else st.prog = a }
    function laneMax (l) { return l === 'f' ? L.fnMax : L.maxLen }
    function laneBox (l) { return l === 'f' ? fnSlots : slots }
    function flatOf (l, i) { return l === 'f' ? st.prog.length + 1 + i : i }
    function chipAt (f) { return f == null ? null : root.querySelector('.tkg-pchip[data-f="' + f + '"]') }
    function fnIcon () { return '<span class="tkg-ic tkg-fnic" aria-hidden="true"><img src="' + src('fn') + '" alt=""></span>' }
    function chip (c, where, i, lane) {
      var b = el('button', 'tkg-chip tkg-c-' + c + (DV[c] ? ' abs' : '') + (where === 'slot' ? ' tkg-pchip' : ''))
      b.type = 'button'
      b.setAttribute('data-cmd', c)
      var ico = c === 'F1' ? fnIcon() : icon(c)
      if (where === 'slot') {
        b.setAttribute('data-idx', String(i)); b.setAttribute('data-lane', lane); b.setAttribute('data-f', String(flatOf(lane, i)))
        b.innerHTML = ico + (REP[c] ? '<small>' + REP[c] + 'x</small>' : '') + '<span class="tkg-num">' + (i + 1) + '</span>'
        var nx = laneArr(lane)[i + 1]
        b.setAttribute('aria-label', (lane === 'f' ? 'Fungsi ' : 'Perintah ') + (i + 1) + ': ' + LABEL[c] + (REP[c] && nx && !REP[nx] ? ' ' + LABEL[nx] : '') + '. Ketuk untuk menghapus')
      } else {
        b.innerHTML = ico + (SHORT[c] ? '<span>' + (REP[c] ? SHORT[c] + ' ' + REP[c] + 'x' : SHORT[c]) + '</span>' : '')
        b.setAttribute('aria-label', 'Tambah ' + LABEL[c])
      }
      bindChip(b, where, i, lane)
      return b
    }
    function renderPal () {
      pal.innerHTML = ''
      L.tools.forEach(function (c) { pal.appendChild(chip(c, 'pal')) })
      syncPal()
    }
    // F1 cannot go inside Fungsi
    function syncPal () {
      var f = pal.querySelector('[data-cmd="F1"]')
      if (f) { f.disabled = st.lane === 'f'; f.style.opacity = st.lane === 'f' ? '.4' : '' }
    }
    function renderLane (l, enter) {
      var box = laneBox(l), list = laneArr(l), n = Math.max(laneMax(l), list.length)
      box.innerHTML = ''
      var mk = function (i) {
        var b = chip(list[i], 'slot', i, l), f = flatOf(l, i)
        if (i === enter && l === st.lane && !rm && !st.kbd) b.classList.add('tkg-pop')
        if (st.bad === f) b.classList.add('tkg-chip--bad')
        return b
      }
      for (var i = 0; i < list.length; i++) {
        if (REP[list[i]]) {
          var g = el('div', 'tkg-repb'), badge = el('i')
          badge.appendChild(img(libSrc('tk-prop/rope-coil'), '', '')); badge.appendChild(document.createTextNode(REP[list[i]] + 'x'))
          g.appendChild(badge); g.setAttribute('data-rep', String(flatOf(l, i)))
          g.appendChild(mk(i))
          if (i + 1 < list.length && !REP[list[i + 1]]) { i++; g.appendChild(mk(i)) } else g.appendChild(el('div', 'tkg-slot tkg-slot--want'))
          box.appendChild(g)
        } else box.appendChild(mk(i))
      }
      for (var j = list.length; j < n; j++) { var d = el('div', 'tkg-slot'); d.textContent = String(j + 1); d.setAttribute('data-empty', String(j)); box.appendChild(d) }
    }
    function renderSlots (enter) {
      renderLane('m', enter)
      if (hasFn) {
        renderLane('f', enter)
        mainLane.classList.toggle('act', st.lane === 'm'); fnLane.classList.toggle('act', st.lane === 'f')
      }
      syncPal()
      // keep the chip in play in view; otherwise the next empty slot (where a new command lands)
      var focus = st.bad != null ? chipAt(st.bad) : (enter != null && enter >= 0 ? laneBox(st.lane).querySelector('.tkg-pchip[data-idx="' + enter + '"]') : laneBox(st.lane).querySelector('.tkg-slot[data-empty]'))
      if (focus) reveal(focus)
      moreSlots()
      drawPreview()
    }
    function reveal (e) {
      if (!e) return
      var box = e.closest ? e.closest('.tkg-slots') : slots
      if (!box || box.scrollWidth <= box.clientWidth) return
      var l = e.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft, r = l + e.offsetWidth
      if (l < box.scrollLeft) box.scrollLeft = Math.max(0, l - 8)
      else if (r > box.scrollLeft + box.clientWidth) box.scrollLeft = r - box.clientWidth + 8
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
    function addCmd (c, at, lane) {
      if (st.running || st.done) return false
      lane = lane || st.lane
      if (lane === 'f' && c === 'F1') { wiggle(fnSlots); return false }
      var list = laneArr(lane)
      if (list.length >= laneMax(lane)) { say(say$.full, 'bad', 2600); wiggle(laneBox(lane)); sfx('bad'); return false }
      at = at == null ? list.length : Math.max(0, Math.min(list.length, at))
      setLane(lane, list.slice(0, at).concat([c], list.slice(at)))
      edited(); sfx('click'); renderSlots(lane === st.lane ? at : -1)
      return true
    }
    function removeAt (i, lane) {
      lane = lane || 'm'
      var list = laneArr(lane)
      if (st.running || st.done || i < 0 || i >= list.length) return
      setLane(lane, list.slice(0, i).concat(list.slice(i + 1)))
      edited(); sfx('click'); renderSlots(-1)
    }
    function moveCmd (from, to, lf, lt) {
      if (st.running || st.done) return
      var c = laneArr(lf)[from]
      if (lt === 'f' && c === 'F1') { renderSlots(-1); return }
      setLane(lf, laneArr(lf).slice(0, from).concat(laneArr(lf).slice(from + 1)))
      if (lf === lt && to > from) to--
      var dst = laneArr(lt)
      if (lf !== lt && dst.length >= laneMax(lt)) { setLane(lf, laneArr(lf).slice(0, from).concat([c], laneArr(lf).slice(from))); renderSlots(-1); wiggle(laneBox(lt)); return }
      to = Math.max(0, Math.min(dst.length, to))
      setLane(lt, dst.slice(0, to).concat([c], dst.slice(to)))
      edited(); sfx('click'); renderSlots(lt === st.lane ? to : -1)
    }
    function setActiveLane (l) {
      if (!hasFn || st.lane === l || st.running || st.done) return
      st.lane = l; sfx('click'); renderSlots(-1)
    }
    if (hasFn) {
      mainLane.firstChild.addEventListener('click', function () { setActiveLane('m') })
      fnLane.firstChild.addEventListener('click', function () { setActiveLane('f') })
      mainLane.addEventListener('pointerdown', function (e) { if (!e.target.closest('.tkg-chip')) setActiveLane('m') })
      fnLane.addEventListener('pointerdown', function (e) { if (!e.target.closest('.tkg-chip')) setActiveLane('f') })
    }

    /* drag + tap (pointer events; a tap = press and release within 10 px) */
    var drag = null
    function bindChip (b, where, i, lane) {
      b.addEventListener('pointerdown', function (e) {
        if (st.running || st.done || drag || b.disabled || (e.button != null && e.button > 0)) return
        var sx = e.clientX, sy = e.clientY, pid = e.pointerId, d = null
        try { b.setPointerCapture(pid) } catch (er) {}
        function mv (ev) {
          if (ev.pointerId !== pid) return
          var dx = ev.clientX - sx, dy = ev.clientY - sy
          if (!d && dx * dx + dy * dy > 100) d = drag = startDrag(b, where, i, sx, sy, lane)
          if (d) { ev.preventDefault(); moveDrag(d, ev.clientX, ev.clientY) }
        }
        function up (ev) {
          if (ev.pointerId !== pid) return
          b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up)
          if (d) { endDrag(d, ev.clientX, ev.clientY, ev.type === 'pointercancel'); drag = null }
          else if (ev.type === 'pointerup') { st.kbd = false; tap(where, i, b, lane) }
        }
        b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up)
      })
      // keyboard activation (Enter/Space dispatch a click with detail 0)
      b.addEventListener('click', function (e) { if (e.detail === 0) { e.stopPropagation(); tap(where, i, b, lane) } })
    }
    function tap (where, i, b, lane) {
      if (where === 'pal') addCmd(b.getAttribute('data-cmd'))
      else {
        if (rm) { removeAt(i, lane); return }
        b.style.transform = 'scale(.8)'; b.style.opacity = '0'
        later(function () { removeAt(i, lane) }, 130)
      }
    }
    function startDrag (b, where, i, sx, sy, lane) {
      var r = b.getBoundingClientRect(), g = b.cloneNode(true)
      g.className = b.className.replace(/tkg-(pop|run|chip--bad|chip--hint|ins)/g, '') + ' tkg-ghost'
      g.style.width = r.width + 'px'; g.style.height = r.height + 'px'
      root.appendChild(g)
      if (where === 'slot') b.classList.add('tkg-lift')
      var d = { b: b, where: where, i: i, lane: lane, g: g, ox: sx - r.left, oy: sy - r.top, at: null, cmd: b.getAttribute('data-cmd') }
      moveDrag(d, sx, sy)
      return d
    }
    // where a dragged chip would land: { lane, at } or null (outside every lane = remove)
    function insertAt (x, y) {
      var boxes = hasFn ? [['m', slots], ['f', fnSlots]] : [['m', slots]]
      for (var k = 0; k < boxes.length; k++) {
        var r = boxes[k][1].getBoundingClientRect(), pad = hasFn ? 10 : 26
        if (x < r.left - pad || x > r.right + pad || y < r.top - pad || y > r.bottom + pad) continue
        var cs = boxes[k][1].querySelectorAll('.tkg-pchip')
        for (var i = 0; i < cs.length; i++) {
          var c = cs[i].getBoundingClientRect()
          if (y < c.top - 3) return { lane: boxes[k][0], at: i }
          if (y <= c.bottom + 3 && x < c.left + c.width / 2) return { lane: boxes[k][0], at: i }
        }
        return { lane: boxes[k][0], at: cs.length }
      }
      return null
    }
    function markIns (p) {
      var ins = root.querySelectorAll('.tkg-ins')
      for (var i = 0; i < ins.length; i++) ins[i].classList.remove('tkg-ins')
      if (!p) return
      var box = laneBox(p.lane), t = box.querySelector('.tkg-pchip[data-idx="' + p.at + '"]') || box.querySelector('.tkg-slot[data-empty]')
      if (t) t.classList.add('tkg-ins')
    }
    function moveDrag (d, x, y) {
      d.g.style.transform = 'translate3d(' + (x - d.ox) + 'px,' + (y - d.oy) + 'px,0) scale(1.08)'
      var p = insertAt(x, y), k = p ? p.lane + p.at : ''
      if (k === d.at) return
      d.at = k; markIns(p)
    }
    function endDrag (d, x, y, cancel) {
      var p = cancel ? null : insertAt(x, y)
      var g = d.g
      g.style.transition = 'opacity 140ms linear'; g.style.opacity = '0'
      setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g) }, 160)
      markIns(null)
      if (d.where === 'pal') { if (p) addCmd(d.cmd, p.at, p.lane) }
      else if (!p) { if (!cancel) removeAt(d.i, d.lane); else d.b.classList.remove('tkg-lift') }
      else if (p.lane === d.lane && (p.at === d.i || p.at === d.i + 1)) d.b.classList.remove('tkg-lift')
      else moveCmd(d.i, p.at, d.lane, p.lane)
    }

    /* ── Petunjuk: the child's explicit choice (owner 2026-09-29 "jangan beri bantuan"). The first press asks
       "Pakai petunjuk? Bintang paling banyak 2"; every "Ya" reveals exactly ONE next step (never fills a chip,
       never draws a path): a correct prefix → the next palette chip glows + a dashed ghost in the next slot;
       a wrong prefix → the first chip to change is outlined red. Once used the level ends with at most 2 stars. ── */
    function clearHintMarks () {
      if (goalEl) goalEl.classList.remove('tkg-glow')
      var sel = root.querySelectorAll('.tkg-chip--hint,.tkg-chip--fix'); for (var i = 0; i < sel.length; i++) sel[i].classList.remove('tkg-chip--hint', 'tkg-chip--fix')
      var gs = root.querySelectorAll('.tkg-slot--ghost'); for (var k = 0; k < gs.length; k++) { gs[k].classList.remove('tkg-slot--ghost'); gs[k].innerHTML = ''; gs[k].textContent = String(+gs[k].getAttribute('data-empty') + 1) }
      var gh = board.querySelectorAll('.tkg-gh'); for (var j = 0; j < gh.length; j++) board.removeChild(gh[j])
    }
    var ask = el('div', 'tkg-ask'); ask.setAttribute('role', 'dialog'); ask.setAttribute('aria-label', 'Petunjuk')
    var askP = el('p'); askP.textContent = say$.hintAsk; ask.appendChild(askP)
    var askS = el('div', 'st'); for (var ai = 0; ai < 3; ai++) askS.appendChild(img(src('sparkle'), ai === 2 ? 'dim' : '', '')); ask.appendChild(askS)
    var askB = el('div', 'bt'), yesB = el('button', 'tkg-btn yes', '<span>Ya</span>'), noB = el('button', 'tkg-btn no', '<span>Batal</span>')
    yesB.type = 'button'; noB.type = 'button'; askB.appendChild(yesB); askB.appendChild(noB); ask.appendChild(askB); root.appendChild(ask)
    function askHint () {
      if (st.running || st.done) return
      sfx('click')
      if (st.hints > 0) { hint(); return }
      ask.classList.add('on'); try { yesB.focus() } catch (e) {}
    }
    function closeAsk () { ask.classList.remove('on') }
    yesB.addEventListener('click', function (e) { e.stopPropagation(); closeAsk(); hint() })
    noB.addEventListener('click', function (e) { e.stopPropagation(); sfx('click'); closeAsk() })
    function hint () {
      if (st.running || st.done) return
      var h = nextHint(L, flat())
      if (!h) return
      st.hints++
      root.setAttribute('data-hinted', '1')
      clearHintMarks()
      var lane = hasFn && h.lane === 'f' ? 'f' : (hasFn && h.lane === 'fn' ? 'f' : 'm')
      if (hasFn && st.lane !== lane) { st.lane = lane; renderSlots(-1) }
      var list = laneArr(lane)
      if (h.keep < list.length) {
        var fix = chipAt(flatOf(lane, h.keep))
        if (fix) { fix.classList.add('tkg-chip--fix'); reveal(fix) }
        say(say$.hintFix.replace('{n}', String(h.keep + 1)), 'good', 5000)
        return
      }
      h.next.forEach(function (c) { var p = pal.querySelector('[data-cmd="' + c + '"]'); if (p) p.classList.add('tkg-chip--hint') })
      var ghost = laneBox(lane).querySelector('.tkg-slot[data-empty]')
      if (ghost && h.next.length) { ghost.textContent = ''; ghost.classList.add('tkg-slot--ghost'); ghost.innerHTML = h.next[h.next.length - 1] === 'F1' ? fnIcon() : icon(h.next[h.next.length - 1]); reveal(ghost) }
      var words = h.next.map(function (c) { return LABEL[c] }).join(' + ')
      say((lane === 'f' ? say$.hintFn : say$.hintNext).replace('{c}', words), 'good', 5000)
    }

    /* ── the queued route is NOT drawn before JALAN! (owner: no trace). It is still computed for state() / gates. ── */
    var pv = null
    function drawPreview () {
      while (pathSvg.firstChild) pathSvg.removeChild(pathSvg.firstChild)
      pv = st.prog.length ? preview(L, flat()) : null
      pathSvg.setAttribute('class', 'tkg-path'); gboat.classList.add('off')
    }

    /* ── first grid level only: a UI-only tour (palette → route bar → JALAN!), never the route itself ── */
    var COACH_IDLE_MS = Math.max(200, int(opts.coachIdleMs, 8000))
    var coachMode = opts.coach != null ? (opts.coach === true || opts.coach === 'always' ? 'always' : '') : (L.coach === 'always' ? 'always' : '')
    var coachOn = coachMode === 'always'
    var idleT = null, nudged = null, co = { on: false, run: 0, loops: 0 }
    function clearNudge () {
      if (nudged) { nudged.classList.remove('tkg-chip--nudge'); nudged = null }
      var n = root.querySelectorAll('.tkg-chip--nudge'); for (var i = 0; i < n.length; i++) n[i].classList.remove('tkg-chip--nudge')
    }
    // the only idle behaviour left: the UI tour on the first grid level while the route is still empty
    function poke () {
      clearNudge()
      if (idleT) { clearTimeout(idleT); idleT = null }
      if (dead || st.done || !coachOn || st.prog.length || co.toured) return
      idleT = later(onIdle, COACH_IDLE_MS)
    }
    function onIdle () {
      idleT = null
      if (st.done) return
      if (st.running || co.on || drag) { poke(); return }
      if (!st.prog.length && coachOn) showCoach()
    }
    function relRect (e) {
      var r = e.getBoundingClientRect(), R = root.getBoundingClientRect()
      return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height / 2, w: r.width, h: r.height, rh: R.height }
    }
    function handTo (e, jump) {
      var r = relRect(e)
      var dn = r.y + r.h / 2 + 88 > r.rh - 4
      hand.classList.toggle('dn', dn)
      hand.classList.toggle('jump', !!jump)
      // the fingertip is the hand's transform origin (24, 3): put it just OUTSIDE the target — under its bottom edge
      // (up-pointing) or over its top edge (down-pointing) — so the target's label stays readable
      hand.style.transform = 'translate3d(' + Math.round(r.x - 24) + 'px,' + Math.round((dn ? r.y - r.h / 2 - 6 : r.y + r.h / 2 + 6) - 3) + 'px,0)'
    }
    function showCoach () {
      if (co.on || st.running || st.done) return
      co.on = true; var id = ++co.run
      clearNudge()
      var stops = [[pal, say$.tour1], [route, say$.tour2], [goB, say$.tour3]], k = 0
      handTo(stops[0][0], true)
      coach.classList.add('on')
      placeSkip()
      var M = rm ? 1.4 : 1
      function next () {
        if (id !== co.run || dead) return
        if (k >= stops.length) { co.toured = true; later(hideCoach, 900 * M); return }
        handTo(stops[k][0], rm || k === 0)
        say(stops[k][1], 'good')
        co.stop = ['pal', 'route', 'go'][k]
        k++
        later(next, 2200 * M)
      }
      next()
    }
    // "Lewati" sits in the top-right corner of the board area (playtest: over the route bar it hid slots)
    function placeSkip () {
      var R = root.getBoundingClientRect(), r = sea.getBoundingClientRect(), w = 112
      skipB.style.cssText = 'position:absolute;pointer-events:auto;width:' + w + 'px;left:' + Math.round(r.right - R.left - w - 6) + 'px;top:' + Math.round(r.top - R.top + 6) + 'px'
      coach.appendChild(skipB)
    }
    function hideCoach () {
      if (!co.on) return
      co.on = false; co.run++
      coach.classList.remove('on')
      if (skipB.parentNode) skipB.parentNode.removeChild(skipB)
      if (/^(Ketuk panah|Perintahmu|Tekan JALAN)/.test(st.msg)) hush()
    }
    skipB.addEventListener('click', function (e) { e.stopPropagation(); sfx('click'); co.toured = true; hideCoach() })
    // any real action ends the tour
    root.addEventListener('pointerdown', function (e) {
      if (e.target === skipB || (skipB.contains && skipB.contains(e.target))) return
      if (co.on) { co.toured = true; hideCoach() } else poke()
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

    /* ── running: one step = one timeline (move / hops / collect), feedback only DURING and AFTER the run ── */
    function markRun (step) {
      var r = root.querySelectorAll('.tkg-run'); for (var i = 0; i < r.length; i++) r[i].classList.remove('tkg-run')
      var rb = root.querySelectorAll('.tkg-repb.on'); for (var j = 0; j < rb.length; j++) { rb[j].classList.remove('on'); var bi = rb[j].querySelector('i'); if (bi && bi.lastChild) bi.lastChild.textContent = bi.getAttribute('data-n') || bi.lastChild.textContent }
      if (!step) return
      var a = chipAt(step.idx)
      if (a) { a.classList.add('tkg-run'); reveal(a); pulse(a) }
      var br = function (ri, k) {
        var b = chipAt(ri); if (b) b.classList.add('tkg-run')
        var g = root.querySelector('.tkg-repb[data-rep="' + ri + '"]')
        if (g) {
          g.classList.add('on'); var badge = g.querySelector('i'), n = REP[flat()[ri]] || 1
          if (badge && badge.lastChild) { if (!badge.getAttribute('data-n')) badge.setAttribute('data-n', badge.lastChild.textContent); badge.lastChild.textContent = (k + 1) + '/' + n }
        }
      }
      if (step.rep != null) br(step.rep, step.k)
      if (step.fnRep != null) br(step.fnRep, step.fnK)
      if (step.fn != null) { var c = chipAt(step.fn); if (c) c.classList.add('tkg-run') }
    }
    function pulse (e) {
      if (rm || !e.animate) return
      try { e.animate([{ transform: 'translateY(-3px) scale(1.06)' }, { transform: 'translateY(-3px) scale(1.14)' }, { transform: 'translateY(-3px) scale(1.06)' }], { duration: 180, easing: EASE }) } catch (er) {}
    }
    function fx (cls, x, y, ms) {
      if (rm) return null
      var e = el('div', 'tkg-fx ' + cls); board.appendChild(e); put(e, x, y)
      later(function () { if (e.parentNode) e.parentNode.removeChild(e) }, ms || 900)
      return e
    }
    // mode: 'io' = a hop from tile to tile (ease-in-out + squash landing), 'glide' = sliding on licin, 'warp' = through a whirlpool
    function moveBoat (x, y, mode) {
      vis.x = x; vis.y = y
      if (rm || mode === 'warp') {
        boat.style.opacity = '0'
        later(function () { root.classList.add('tkg-noanim'); put(boat, x, y); void boat.offsetWidth; root.classList.remove('tkg-noanim'); boat.style.opacity = '' }, 140)
        return
      }
      boat.classList.toggle('tkg-glide', mode === 'glide'); boat.classList.toggle('tkg-io', mode !== 'glide')
      put(boat, x, y)
      if (mode === 'glide') {
        try { bump.animate([{ transform: 'skewX(0)' }, { transform: 'skewX(-6deg)' }, { transform: 'skewX(0)' }], { duration: 160, easing: 'linear' }) } catch (e) {}
      } else if (bump.animate) {
        var up = theme === 'deck' ? '-10%' : '-18%'
        try {
          bump.animate([{ transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(' + up + ') scale(.96,1.05)', offset: 0.45 },
            { transform: 'translateY(0) scale(1.12,.88)', offset: 0.78 }, { transform: 'translateY(0) scale(.97,1.03)', offset: 0.9 }, { transform: 'translateY(0) scale(1,1)' }],
          { duration: 440, easing: 'ease-in-out' })
        } catch (e) {}
      }
    }
    function nudge (e, bx, by, tx, ty) {
      if (rm || !e || !e.animate) return
      var T = st.T, dx = (tx - bx) * T * 0.22, dy = (ty - by) * T * 0.22
      try {
        e.animate([{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0)' }, { transform: 'translate3d(0,0,0)' }],
          { duration: 380, easing: EASE })
      } catch (er) {}
    }
    // a bump never punishes: bounce back, wobble, a little star daze, a soft "duk"
    function bumpFx (bx, by, tx, ty) {
      if (rm || !bump.animate) return
      var T = st.T, dx = (tx - bx) * T * 0.22, dy = (ty - by) * T * 0.22
      try {
        bump.animate([{ transform: 'translate3d(0,0,0) rotate(0)' }, { transform: 'translate3d(' + dx + 'px,' + dy + 'px,0) rotate(0)', offset: 0.28 },
          { transform: 'translate3d(0,0,0) rotate(0)', offset: 0.5 }, { transform: 'rotate(6deg)', offset: 0.64 }, { transform: 'rotate(-4deg)', offset: 0.78 },
          { transform: 'rotate(2deg)', offset: 0.9 }, { transform: 'rotate(0)' }], { duration: 720, easing: 'ease-out' })
      } catch (e) {}
      var box = fx('tkg-daze', bx, by, 1000)
      if (!box) return
      box.className = 'tkg-daze'
      for (var k = 0; k < 3; k++) {
        var i = el('i'); i.appendChild(img(src('sparkle'), '', '')); box.appendChild(i)
        var fr = []
        for (var q = 0; q <= 6; q++) { var a = (k / 3 + q / 6) * Math.PI * 2, r = T * 0.22; fr.push({ transform: 'translate(' + (Math.cos(a) * r) + 'px,' + (Math.sin(a) * r * 0.45) + 'px) scale(' + (q === 0 ? 0.4 : 1) + ')', opacity: q === 6 ? 0 : 1 }) }
        try { i.animate(fr, { duration: 900, easing: 'linear', fill: 'forwards' }) } catch (e) {}
      }
    }
    // the trail appears only as the boat moves (feedback, never a preview)
    function leaveMark (x, y, dx, dy) {
      trail.push({ x: x, y: y })
      var m = el('div', 'tkg-trail'); m.setAttribute('data-x', String(x)); m.setAttribute('data-y', String(y))
      m.style.setProperty('--r', (dy ? 90 : 0) + 'deg'); board.appendChild(m); put(m, x, y)
      if (!rm && m.animate) { try { m.animate([{ opacity: 0 }, { opacity: 0.55 }], { duration: 300, easing: 'linear' }) } catch (e) {} }
    }
    function fly (fromEl, fromXY, toEl, key, done, back) {
      var rr = root.getBoundingClientRect(), br = board.getBoundingClientRect()
      var bx = br.left - rr.left + (fromXY.x + 0.5) * st.T - 20, by = br.top - rr.top + (fromXY.y + 0.5) * st.T - 20
      var tr = toEl ? toEl.getBoundingClientRect() : null, tx = tr ? tr.left - rr.left + tr.width / 2 - 20 : bx, ty = tr ? tr.top - rr.top + tr.height / 2 - 20 : by
      if (back) { var t0 = tx, t1 = ty; tx = bx; ty = by; bx = t0; by = t1 }
      var f = el('div', 'tkg-fly2'); f.appendChild(img(key, '', '')); root.appendChild(f)
      var end = function () { if (f.parentNode) f.parentNode.removeChild(f); if (done) done() }
      if (rm || !f.animate) { f.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)'; later(end, 160); return }
      var mx = (bx + tx) / 2, my = Math.min(by, ty) - st.T * 0.8
      try {
        var a = f.animate([{ transform: 'translate3d(' + bx + 'px,' + by + 'px,0) scale(.9) rotate(0)' }, { transform: 'translate3d(' + mx + 'px,' + my + 'px,0) scale(1.1) rotate(-12deg)', offset: 0.5 },
          { transform: 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(.7) rotate(0)' }], { duration: 520, easing: EASE, fill: 'forwards' })
        a.onfinish = end
      } catch (e) { end() }
    }
    function popEl (e) { if (!rm && e && e.animate) { try { e.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 200, easing: EASE }) } catch (er) {} } }
    function bagSync (s) {
      if (!bag) return
      bagN.textContent = L.stops.length ? (s ? s.ck || 0 : 0) + '/' + L.stops.length : String(s ? s.carry : 0)
    }
    // what the boat bumped, in the bubble's words
    function thingAt (t, s) {
      if (!t) return theme === 'deck' ? 'barang' : 'es'
      if (s.reason === 'ice') return MOB_WORD[(L.ice[s.iceIdx] || {}).kind] || 'es yang bergerak'
      if (gateKeys[t.y * L.w + t.x]) return 'gerbang tertutup'
      var k = blkArt[t.y * L.w + t.x] || ''
      for (var i = 0; i < THING.length; i++) if (THING[i][0].test(k)) return THING[i][1]
      return theme === 'deck' ? 'barang' : 'penghalang'
    }
    // the tiles this step passes through, in order, with their arrival time (ms from the step's start)
    function legs (s) {
      var out = [], t = 0
      if (s.event === 'turn' || s.event === 'pick' || s.event === 'drop' || s.event === 'bump') return out
      var first = s.via || { x: s.x, y: s.y }
      out.push({ x: first.x, y: first.y, k: 'move', t: 0, fx: s.from.x, fy: s.from.y })
      t = 380
      var hops = s.hops || (s.via ? [{ x: s.x, y: s.y, k: s.event }] : [])
      hops.forEach(function (h) {
        var prev = out[out.length - 1]
        var d = h.k === 'slide' ? 160 : h.k === 'warp' ? 320 : 300
        out.push({ x: h.x, y: h.y, k: h.k, t: t, fx: prev.x, fy: prev.y })
        t += d
      })
      out.dur = t
      return out
    }
    function playStep (s) {
      markRun(s)
      st.dirty = true
      if (s.event !== 'bump') s.ice.forEach(function (p, i) { if (O.imv[i]) { turnMob(O.imv[i], p); put(O.imv[i], p.x, p.y) } })
      if (s.opened) {
        L.switches.forEach(function (sw, j) {
          if (!(s.opened & (1 << j))) return
          if (O.sw[j]) O.sw[j].classList.add('on')
          sw.opens.forEach(function (g) { var e = gateKeys[g.y * L.w + g.x]; if (e) e.classList.add('open') })
        })
      }
      var ev = s.event, dur = STEP_MS
      if ((ev === 'bump' || legs(s).length) && DV[s.cmd]) { turnTo(s.face || s.cmd); setHeading(true) }
      else if (ev !== 'turn' && ev !== 'bump' && s.cmd === 'F' && s.face) { turnTo(s.face); setHeading(true) }
      if (s.door != null) { var de = doorAt(s.toward); if (de && !de.classList.contains('open')) { de.classList.add('open'); sfx('good') } }
      var lg = legs(s)
      if (lg.length) {
        dur = Math.max(STEP_MS, lg.dur + 120)
        note(st.stepN++)
        lg.forEach(function (g, gi) {
          later(function () {
            if (g.k === 'warp') {
              leaveMark(g.fx, g.fy, 0, 0)
              warpFx(g.fx, g.fy); sfx('warp'); moveBoat(g.x, g.y, 'warp')
              later(function () { warpFx(g.x, g.y) }, 140)
            } else {
              leaveMark(g.fx, g.fy, g.x - g.fx, g.y - g.fy)
              if (g.k === 'current') { fx('tkg-ring', g.fx, g.fy, 700); sfx('current') }
              fx('tkg-wake', g.fx, g.fy)
              moveBoat(g.x, g.y, g.k === 'slide' ? 'glide' : 'io')
            }
            arrive(s, g, gi === lg.length - 1)
          }, g.t)
        })
        if (s.skid) later(function () { skid(s.x, s.y); sfx('skid') }, lg.dur)
        if (!s.skid && !s.hops && !s.via) later(function () { sparkle(s.x, s.y) }, 220)
      } else if (ev === 'turn') {
        st.angle += s.cmd === 'L' ? -90 : 90
        if (s.dir === 'E' || s.dir === 'W') st.face = s.dir
        setHeading(true); sfx('step')
      } else if (ev === 'pick') {
        var ie = O.item[s.item]
        if (ie) { put(ie, s.x, s.y); ie.style.opacity = '0'; later(function () { ie.classList.add('gone') }, 300); fly(null, s, bag, src('crate'), function () { popEl(bag); bagSync(s) }) }
        else bagSync(s)
        carry.classList.add('on'); sfx('good'); sparkle(s.x, s.y)
      } else if (ev === 'drop') {
        L.items.forEach(function (it, i) {
          if (!(s.items & (1 << i)) || !O.item[i]) return
          var e = O.item[i]; e.classList.remove('gone'); e.classList.add('dl'); put(e, s.x, s.y); e.style.opacity = ''
        })
        if (bag) fly(null, s, bag, src('crate'), function () { popEl(bag); bagSync(s) }, true)
        carry.classList.remove('on'); sfx('good')
      } else if (ev === 'bump') {
        var t = s.toward || { x: s.x, y: s.y }
        var iceEl = s.iceIdx != null && O.imv[s.iceIdx] ? O.imv[s.iceIdx].firstChild : null
        if (s.reason === 'ice' && iceEl && t.x === s.x && t.y === s.y) {
          // the drifting obstacle came onto the boat: it nudges, the boat rocks
          var ip = s.ice[s.iceIdx]; nudge(iceEl, ip.x, ip.y, s.x, s.y); bumpFx(s.x, s.y, s.x, s.y)
        } else if (s.reason === 'ice' && iceEl && s.cmd !== 'F' && !DV[s.cmd]) {
          nudge(iceEl, t.x, t.y, s.x, s.y); bumpFx(s.x, s.y, s.x, s.y)
        } else {
          bumpFx(s.x, s.y, t.x, t.y)
          if (s.reason === 'door') { var dd = doorAt(t); if (dd) nudge(dd.querySelector('.lk'), 0, 0, 0, 0.6) }
        }
        sfx('duk')
        dur = STEP_MS + 300
      }
      return dur
    }
    function doorAt (p) { if (!p) return null; for (var i = 0; i < L.doors.length; i++) if (L.doors[i].x === p.x && L.doors[i].y === p.y) return O.door[i]; return null }
    function turnMob (e, p) {
      var k = e.getAttribute('data-kind'); if (!k || k === 'ice') return
      var dx = p.x - e._x, dy = p.y - e._y, im = e.firstChild
      if (!im || (!dx && !dy)) return
      if (k === 'patrol' || k === 'tug') im.style.transform = 'rotate(' + (dx > 0 ? 90 : dx < 0 ? -90 : dy > 0 ? 180 : 0) + 'deg)'
      else if (dx) im.style.transform = dx < 0 ? 'scaleX(-1)' : ''
    }
    function warpFx (x, y) {
      fx('tkg-ring', x, y, 700)
      var w = null; for (var i = 0; i < O.whirl.length; i++) if (O.whirl[i]._x === x && O.whirl[i]._y === y) w = O.whirl[i]
      popEl(w && w.firstChild)
    }
    function skid (x, y) {
      if (rm) return
      var e = el('div', 'tkg-skid'); e.innerHTML = '<i style="left:10%"></i><i style="left:50%;top:56%"></i>'; board.appendChild(e); put(e, x, y)
      later(function () { if (e.parentNode) e.parentNode.removeChild(e) }, 600)
      try { bump.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.08,.92)' }, { transform: 'scale(1,1)' }], { duration: 200, easing: EASE }) } catch (er) {}
    }
    // the boat reached tile g during step s: keys, flags, fog, beacons
    function arrive (s, g, last) {
      if (L.fog) {
        unfog(g.x, g.y, 1)
        L.beacons.forEach(function (b) {
          if (b.x !== g.x || b.y !== g.y || st.lit[b.x + ',' + b.y]) return
          st.lit[b.x + ',' + b.y] = 1
          if (!rm) { var bm = el('div', 'tkg-beam'); board.appendChild(bm); put(bm, b.x, b.y); later(function () { if (bm.parentNode) bm.parentNode.removeChild(bm) }, 1000) }
          later(function () { unfog(b.x, b.y, b.r, true) }, rm ? 0 : 250)
          sfx('good')
        })
      }
      L.keys.forEach(function (k, i) {
        if (k.x !== g.x || k.y !== g.y || !(s.keys && s.keys.indexOf(k.color) >= 0)) return
        var e = O.key[i]; if (!e || e.classList.contains('got')) return
        e.classList.add('got'); sfx('coin')
        fly(null, g, bag, src('key'), function () {
          if (bagK) { var ki = img(src('key'), '', ''); ki.style.filter = KEYF[k.color]; bagK.appendChild(ki) }
          popEl(bag)
        })
      })
      ;(s.stops || []).forEach(function (n) {
        var p = L.stops[n]; if (p.x !== g.x || p.y !== g.y) return
        var e = O.stop[n]
        fly(null, g, bag, src('crate'), function () { if (e) { e.classList.add('done'); popEl(e.querySelector('b')) } bagSync({ ck: n + 1 }) }, true)
        sfx('good'); later(function () { sparkle(g.x, g.y) }, 300)
      })
      ;(s.early || []).forEach(function (n) {
        var p = L.stops[n]; if (p.x !== g.x || p.y !== g.y) return
        var e = O.stop[n]; if (e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); later(function () { e.classList.remove('shake') }, 800) }
        st.early = n + 1
      })
    }
    function stepMs (s) { return s.event === 'turn' || s.event === 'pick' || s.event === 'drop' ? STEP_MS : 0 }

    /* ── question tiles: the run pauses, the host asks (opts.onQuestion -> Promise<{correct}>), the run resumes ── */
    st.qDone = {}; st.bonus = 0; st.asked = 0; st.lit = {}
    function qEl (i) { return O.q[i] || null }
    function openQ (i, correct) {
      var e = qEl(i); if (!e) return
      e.classList.add('open')
      if (L.q[i].type === 'chest') { var im = e.querySelector('img'); if (im) im.src = src('chestOpen') }
      popEl(e.querySelector('img'))   // never the tile itself: its transform is its board position
    }
    function askQ (q, id, cb) {
      if (st.qDone[q.i]) { cb(); return }
      st.qDone[q.i] = true
      var t = L.q[q.i], resolved = false
      var finish = function (correct) {
        if (resolved || dead || id !== st.runId) return
        resolved = true
        root.classList.remove('tkg--ask')
        openQ(q.i, correct)
        if (t.type === 'chest' && correct) {
          st.bonus++; say(say$.qBonus, 'good', 3000); sfx('star')
          fly(null, q, count, src('sparkle'), function () { popEl(count) })
        } else say(correct ? say$.qGood : say$.qBad, correct ? 'good' : '', 3000)
        later(cb, rm ? 200 : 500)
      }
      if (typeof opts.onQuestion !== 'function') { later(function () { finish(false) }, rm ? 150 : 400); return }
      st.asked++
      root.classList.add('tkg--ask')
      var p = null
      try { p = opts.onQuestion({ reason: t.type, topic: t.topic || '', levelId: L.id, index: q.i }) } catch (e) { p = null }
      if (p && typeof p.then === 'function') p.then(function (r) { finish(!!(r && r.correct)) }, function () { finish(false) })
      else finish(!!(p && p.correct))
    }
    function go () {
      if (st.running || st.done) return
      if (!st.prog.length) { say(say$.noProg, 'bad', 2600); wiggle(slots); sfx('click'); return }
      sfx('click')
      closeAsk()
      st.attempts++
      st.bad = null; st.early = 0; renderSlots(-1); clearHintMarks(); hush()
      var res = run(L, flat())
      st.running = true; st.stepN = 0; root.classList.add('tkg--busy')
      clearNudge(); if (co.on) hideCoach()
      var id = ++st.runId, i = 0
      function tick () {
        if (id !== st.runId) return
        if (i >= res.steps.length) { finish(res); return }
        var s = res.steps[i++]
        var qs = s.quiz || [], first = s.via || (s.hops ? s.hops[0] : null) || { x: s.x, y: s.y }
        var door = qs.filter(function (q) { return q.type === 'door' && q.x === (s.via || s.toward || first).x && q.y === (s.via || s.toward || first).y && !st.qDone[q.i] })[0]
        var chests = qs.filter(function (q) { return q.type === 'chest' && !st.qDone[q.i] })
        var play = function () {
          var d = playStep(s)
          if (chests.length) later(function () { askAll(chests, id, tick) }, d || STEP_MS)
          else later(tick, d || STEP_MS)
        }
        if (door) {
          // the boat knocks on the question door, the question comes, the door swings, then the move happens
          nudge(bump, s.from.x, s.from.y, door.x, door.y); sfx('step'); later(function () { sfx('step') }, 160)
          later(function () { askQ(door, id, play) }, rm ? 150 : 420)
        } else play()
      }
      if (st.dirty) { resetBoard(true); later(tick, 260) } else later(tick, 120)
    }
    function askAll (list, id, done) {
      var k = 0
      var nx = function () { if (id !== st.runId) return; if (k >= list.length) { done(); return } askQ(list[k++], id, nx) }
      nx()
    }
    function flatN (f) {
      // the number the child sees on a chip (Fungsi chips count inside their lane)
      return f > st.prog.length ? { n: f - st.prog.length, fn: true } : { n: f + 1, fn: false }
    }
    function finish (res) {
      st.running = false; root.classList.remove('tkg--busy')
      markRun(null)
      if (res.ok) { won(res); return }
      if (res.failAt != null) {
        st.bad = res.failAt
        renderSlots(-1)
        var key = res.reason === 'noItem' ? (res.detail || 'none') : res.reason
        var last = res.steps[res.steps.length - 1] || {}, where = flatN(res.failAt)
        var msg = (say$[key] || say$.block).replace('{n}', String(where.n)).replace('{thing}', thingAt(last.toward, last)).replace('{color}', String(res.detail || ''))
        if (where.fn) msg = msg.replace('perintah nomor', 'Fungsi nomor')
        say(msg, 'bad', 6500)
      } else {
        var m = st.early && res.detail !== 'far' ? say$.early.replace('{k}', String(res.stopsDone + 1)) : (say$[res.detail] || say$.far)
        say(m, 'bad', 6500)
        sfx('duk')
      }
    }
    // the path the boat really sailed this run (warps split it), drawn in gold after a WIN
    function goldPath () {
      var svg = document.createElementNS(SVGNS, 'svg')
      svg.setAttribute('class', 'tkg-goldsvg'); svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('viewBox', '0 0 ' + L.w + ' ' + L.h); svg.setAttribute('preserveAspectRatio', 'none')
      var r = run(L, flat()), segs = [[{ x: L.start.x, y: L.start.y }]]
      r.steps.forEach(function (s) {
        legs(s).forEach(function (g) { if (g.k === 'warp') segs.push([{ x: g.x, y: g.y }]); else segs[segs.length - 1].push({ x: g.x, y: g.y }) })
      })
      var delay = 0
      segs.forEach(function (seg) {
        if (seg.length < 2) return
        var pl = document.createElementNS(SVGNS, 'polyline'), len = 0
        for (var i = 1; i < seg.length; i++) len += Math.abs(seg[i].x - seg[i - 1].x) + Math.abs(seg[i].y - seg[i - 1].y)
        pl.setAttribute('class', 'tkg-gold'); pl.setAttribute('points', seg.map(function (p) { return (p.x + 0.5) + ',' + (p.y + 0.5) }).join(' '))
        svg.appendChild(pl)
        if (rm || !pl.animate) { if (pl.animate) try { pl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'both' }) } catch (e) {} return }
        pl.style.strokeDasharray = len + ' ' + len; pl.style.strokeDashoffset = String(len)
        try { pl.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 900, delay: delay, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'forwards' }) } catch (e) { pl.style.strokeDashoffset = '0' }
        delay += 250
      })
      board.appendChild(svg)
      return svg
    }
    function won (res) {
      st.done = true; root.classList.add('tkg--won')
      var g = L.goal || { x: vis.x, y: vis.y }
      fx('tkg-ring', g.x, g.y, 900)
      burst(g.x, g.y)
      goldPath()
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
      // Petunjuk is an explicit choice: using it caps this level at 2 stars
      var n = stars(res.moves, L.shortest, L.easy, st.hints > 0)
      var starEls = []
      for (var i = 0; i < 3; i++) { var s = el('span', '', wrapIc(ic('star', i < n ? '' : 'tk-ico--dim'), i < n ? 'got' : '')); winStars.appendChild(s); starEls.push(s) }
      later(function () { win.classList.add('on') }, rm ? 0 : 500)
      later(function () {
        flyStars(starEls.slice(0, n), function () {
          later(function () {
            win.classList.remove('on')
            try { if (typeof opts.onDone === 'function') opts.onDone({ stars: n, moves: res.moves, attempts: st.attempts, hints: st.hints, shortest: L.shortest, bonus: st.bonus, asked: st.asked, hinted: st.hints > 0 }) } catch (e) { if (G.console) console.error('[TKGrid] onDone', e) }
          }, 350)
        })
      }, rm ? 300 : 1150)
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

    /* ── keyboard (design B.7): arrows add commands, 2/3 repeat, f Fungsi, Backspace undo, Enter JALAN!, Tab lane.
       Keyboard adds skip the pop animation (Emil: no animation on keyboard actions). ── */
    function onKey (e) {
      if (dead || e.altKey || e.ctrlKey || e.metaKey || !root.isConnected) return
      var t = e.target, tag = t && t.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return
      if (ask.classList.contains('on') || st.running || st.done) return
      var k = e.key, rel = !hasAbs, c = null
      if (k === 'ArrowUp') c = rel ? 'F' : 'N'
      else if (k === 'ArrowDown') c = rel ? null : 'S'
      else if (k === 'ArrowLeft') c = rel ? 'L' : 'W'
      else if (k === 'ArrowRight') c = rel ? 'R' : 'E'
      else if (k === '2') c = 'R2'
      else if (k === '3') c = 'R3'
      else if (k === 'f' || k === 'F') c = 'F1'
      else if (k === 'Enter') { if (t && t.tagName === 'BUTTON' && root.contains(t)) return; e.preventDefault(); go(); return }
      else if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); var l = laneArr(st.lane); if (l.length) { st.kbd = true; removeAt(l.length - 1, st.lane) } return }
      else if (k === 'Tab' && hasFn) { e.preventDefault(); setActiveLane(st.lane === 'm' ? 'f' : 'm'); return }
      else return
      e.preventDefault()
      if (!c || L.tools.indexOf(c) < 0) { wiggle(laneBox(st.lane)); return }
      st.kbd = true; addCmd(c); st.kbd = false
    }
    if (opts.keyboard !== false && typeof document !== 'undefined') document.addEventListener('keydown', onKey)

    /* ── wiring ── */
    if (opts.hintButton !== false) hintB.addEventListener('click', askHint)
    undoB.addEventListener('click', function () {
      if (st.running || st.done) return
      var l = laneArr(st.lane)
      if (!l.length) { wiggle(laneBox(st.lane)); return }
      removeAt(l.length - 1, st.lane)
    })
    trashB.addEventListener('click', function () {
      if (st.running || st.done) return
      if (!st.prog.length && !st.fn.length) { wiggle(slots); return }
      st.prog = []; st.fn = []; edited(); sfx('click'); renderSlots(-1)
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
      tour: function () { if (!dead && !st.running && !st.done) { if (co.on) hideCoach(); showCoach() } },
      destroy: function () {
        if (dead) return
        dead = true
        co.run++
        timers.forEach(clearTimeout); timers = []
        if (bubbleT) clearTimeout(bubbleT)
        if (ro) { try { ro.disconnect() } catch (e) {} }
        if (G.removeEventListener) G.removeEventListener('resize', onResize)
        if (typeof document !== 'undefined') document.removeEventListener('keydown', onKey)
        if (root.parentNode) root.parentNode.removeChild(root)
      },
      reset: function () {
        if (dead) return
        st.runId++; st.running = false; st.done = false; st.prog = []; st.fn = []; st.bad = null; st.hints = 0; st.bonus = 0
        root.classList.remove('tkg--busy'); root.classList.remove('tkg--won'); root.classList.remove('tkg--ask'); root.removeAttribute('data-hinted'); win.classList.remove('on')
        clearHintMarks(); markRun(null); renderSlots(-1); resetBoard(true); hush(); poke()
      },
      program: function () { return flat() },
      setProgram: function (p) {
        if (dead || st.running || st.done) return
        var a = arr(p).map(String), m = a.indexOf('FN')
        st.prog = (m < 0 ? a : a.slice(0, m)).filter(isCmd).slice(0, L.maxLen)
        st.fn = m < 0 ? [] : a.slice(m + 1).filter(function (c) { return isCmd(c) && c !== 'F1' }).slice(0, L.fnMax)
        edited(); renderSlots(-1)
      },
      state: function () {
        return { running: st.running, done: st.done, attempts: st.attempts, hints: st.hints, bad: st.bad,
          program: flat(), main: st.prog.slice(), fn: st.fn.slice(), lane: st.lane, message: st.msg, bubble: bubble.classList.contains('on'), tile: st.T,
          boat: vis ? { x: vis.x, y: vis.y } : null, maxLen: L.maxLen, shortest: L.shortest, stars: st.earned,
          coach: co.on, tourStop: co.on ? co.stop || null : null, tools: L.tools.slice(), easy: L.easy, trim: L.trim, preview: pv ? { ok: pv.ok, bad: pv.bad, path: pv.path.map(function (p) { return { x: p.x, y: p.y } }) } : null,
          trail: trail.map(function (p) { return { x: p.x, y: p.y } }), bonus: st.bonus, asked: st.asked, hinted: st.hints > 0,
          qDone: Object.keys(st.qDone).map(Number), ask: ask.classList.contains('on'), paused: root.classList.contains('tkg--ask'),
          nudge: nudged ? (nudged === goB ? 'go' : 'pal:' + nudged.getAttribute('data-cmd')) : null }
      },
      layout: onResize
    }
  }

  TKGrid.mount = mount
  G.TKGrid = TKGrid
  if (typeof module !== 'undefined' && module.exports) module.exports = TKGrid
})(typeof window !== 'undefined' ? window : globalThis)
