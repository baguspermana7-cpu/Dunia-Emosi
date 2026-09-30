// G30 Timmy & Kapal Legendaris — grid LEVEL gate (games/data/tk-worlds.js).
//   A) node only: an INDEPENDENT shortest-route solver (Dijkstra over costs 1 and 2, i.e. a BFS where a
//      repeat chip + its command costs two chips) written from the TKGrid rules, NOT by calling tk-grid.js:
//      N/E/S/W move one tile (face that way), F/L/R forward + turns, P picks the first unpicked item on the
//      tile, D drops everything carried on the drop tile, R2/R3 run the NEXT command 2/3 times; after a move a
//      current pushes ONE tile (not into a wall / edge / ice, the ice position BEFORE the tick), switches
//      open gates, moving ice advances one step per executed command and may not land on the boat; the run
//      stops the moment the goal is met (boat on goal with every item dropped, or picked when there is no
//      drop). Easy boards reproduce TKGrid.create's trim (plain arrows when a repeat route exists and a plain
//      one fits in 12, then only the commands the route uses).
//      Every grid level of every world (chapter steps via TKWorlds.flat) must: be solvable; have
//      solver-shortest == TKGrid.shortest (cross-check of two implementations); carry `par` (new levels:
//      REQUIRED) equal to that shortest; have maxLen >= par + SLACK; replay the solver's route through
//      TKGrid.run -> ok with moves == par and 3 stars; and every program one chip shorter than par that the
//      solver can enumerate (all of them on boards with par <= 7) fails. No two boards identical (rows +
//      start dir + tools + ice). Every sprite key (blockArt, itemArt, pre-story layers) exists in the
//      AssetIndex (or is a TKArt placeholder / generated ship); every scene is a TKArt scene. Level ids unique
//      per world; the ids that existed before this gate are all still there (saves key stars by level id).
//      Grid counts per world (>= 3, Titanic >= 5).
//   B) UI (QA_UI=0 skips): 5 random NEW levels mounted in tools/tk-harness-grid.html?w=&lv= at 1280x800 and
//      390x844; the solver's route is fed through the mount handle (setProgram + JALAN!) and must finish
//      with onDone stars 3; no page errors. Needs http://localhost:8081 serving the repo root.
// Usage: node tools/qa-tk-grid-levels.mjs [--list]   QA_SEED=<n> picks the 5 UI levels (QA_LEVELS=id,id pins them), QA_SHOTS=<dir> screenshots.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SLACK = 2
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL ' + msg) } }

/* ── independent solver ─────────────────────────────────────────────── */
// TKGrid 2.x rules, re-implemented from the design (A.0), NOT by calling tk-grid.js. One executed move enters the
// target (not off the board, not a block / closed gate, not a colour door without its key, not a tile moving ice is on
// NOW), then the LANDING LOOP on the tile the boat stands on: (a) collect — switch, key, the NEXT numbered flag;
// (b) whirlpool — jump to its partner once per command, only when the partner is free; (c) licin — slide on in the
// motion direction while the next tile is free; (d) current — push one tile once per command (the push becomes the
// motion direction). Then time ticks and moving ice may not land on the boat. Question tiles and fog change nothing.
const DV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
const DIRS = ['N', 'E', 'S', 'W']
const CMDS = ['N', 'E', 'S', 'W', 'F', 'L', 'R', 'P', 'D', 'R2', 'R3', 'F1']
const REP = { R2: 2, R3: 3 }
const LIMIT = 40
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a }

// the row characters this gate reads itself (the ROWS table of the design, §C)
function rowsOf (def) {
  const o = { slick: [], keys: [], doors: [], stops: [], whirls: [], q: [], beacons: [] }, wp = {}
  ;(def.rows || []).forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '~') o.slick.push({ x, y })
    else if ('mbh'.includes(ch)) o.keys.push({ x, y, color: 'mbh'.indexOf(ch) })
    else if ('MBH'.includes(ch)) o.doors.push({ x, y, color: 'MBH'.indexOf(ch) })
    else if (ch >= '1' && ch <= '9') o.stops[+ch - 1] = { x, y }
    else if ('oOuU'.includes(ch)) { const k = ch.toLowerCase(); (wp[k] = wp[k] || [])[ch === k ? 0 : 1] = { x, y } }
    else if (ch === 'T' || ch === 'P') o.q.push({ x, y, type: ch === 'T' ? 'chest' : 'door' })
    else if (ch === 'L') o.beacons.push({ x, y })
  }))
  o.stops = o.stops.filter(Boolean)
  for (const k of ['o', 'u']) if (wp[k] && wp[k][0] && wp[k][1]) o.whirls.push([wp[k][0], wp[k][1]])
  return o
}
function model (def) {
  const w = def.w, h = def.h, K = (x, y) => y * w + x, X = rowsOf(def)
  const blk = new Set((def.blocks || []).map(b => K(b.x, b.y)))
  const cur = new Map((def.currents || []).map(c => [K(c.x, c.y), c.dir]))
  const items = (def.items || []).slice(0, 8)
  const itemAt = new Map(); items.forEach((it, i) => { const k = K(it.x, it.y); itemAt.set(k, (itemAt.get(k) || []).concat(i)) })
  const sws = (def.switches || []).slice(0, 8), swAt = new Map(), gate = new Map()
  sws.forEach((s, j) => { swAt.set(K(s.x, s.y), j); (s.opens || []).forEach(g => { const k = K(g.x, g.y); gate.set(k, (gate.get(k) || []).concat(j)) }) })
  const ice = (def.ice || []).map(o => o.path && o.path.length ? o.path : [o])
  let T = 1
  for (const p of ice) { T = T / gcd(T, p.length) * p.length; if (T > 240) { T = 0; break } }
  const key = new Map(X.keys.map(k => [K(k.x, k.y), k.color])), door = new Map(X.doors.map(k => [K(k.x, k.y), k.color]))
  const slick = new Set(X.slick.map(p => K(p.x, p.y))), whirl = new Map()
  X.whirls.forEach(([a, b]) => { whirl.set(K(a.x, a.y), b); whirl.set(K(b.x, b.y), a) })
  const stops = X.stops
  const goal = def.goal || (def.drop ? { x: def.drop.x, y: def.drop.y } : stops.length ? stops[stops.length - 1] : null)
  const all = (1 << items.length) - 1
  return { w, h, K, blk, cur, items, itemAt, swAt, gate, ice, T, goal, drop: def.drop || null, all, key, door, slick, whirl, stops,
    start: { x: def.start.x, y: def.start.y, dir: def.start.dir || 'E' } }
}
const inside = (M, x, y) => x >= 0 && y >= 0 && x < M.w && y < M.h
function blocked (M, x, y, sw, ky) {
  const k = M.K(x, y)
  if (M.door.has(k) && !(ky & (1 << M.door.get(k)))) return true
  if (!M.blk.has(k) && !M.gate.has(k)) return false
  const g = M.gate.get(k)
  if (g) for (const j of g) if (sw & (1 << j)) return false
  return true
}
const iceOn = (M, x, y, t) => M.ice.some(p => { const q = p[t % p.length]; return q.x === x && q.y === y })
const canEnter = (M, x, y, n, t) => inside(M, x, y) && !blocked(M, x, y, n.sw, n.ky) && !iceOn(M, x, y, t)
function collect (M, n) {
  const k = M.K(n.x, n.y), j = M.swAt.get(k)
  if (j != null) n.sw |= 1 << j
  if (M.key.has(k)) n.ky |= 1 << M.key.get(k)
  const st = M.stops[n.ck]
  if (st && st.x === n.x && st.y === n.y) n.ck++
}
function done (M, s) {
  if (!M.goal || s.x !== M.goal.x || s.y !== M.goal.y || s.ck < M.stops.length) return false
  if (!M.items.length) return true
  return M.drop ? s.dl === M.all : s.pk === M.all
}
// one command -> new state or null (bump / edge / door / ice / nothing to pick / wrong drop)
function step (M, s, c) {
  const n = { ...s }
  if (c === 'F' || DV[c]) {
    let md = c === 'F' ? s.dir : c
    const nx = s.x + DV[md][0], ny = s.y + DV[md][1]
    if (!canEnter(M, nx, ny, n, s.t)) return null
    n.x = nx; n.y = ny; n.dir = md
    let warped = false, pushed = false
    for (let g = 0; g < M.w * M.h * 2 + 4; g++) {
      collect(M, n)
      const k = M.K(n.x, n.y), wp = M.whirl.get(k)
      if (wp && !warped) { warped = true; if (canEnter(M, wp.x, wp.y, n, s.t)) { n.x = wp.x; n.y = wp.y; continue } }
      if (M.slick.has(k)) { const sx = n.x + DV[md][0], sy = n.y + DV[md][1]; if (canEnter(M, sx, sy, n, s.t)) { n.x = sx; n.y = sy; continue } }
      const cd = M.cur.get(k)
      if (cd && !pushed) { pushed = true; const px = n.x + DV[cd][0], py = n.y + DV[cd][1]; if (canEnter(M, px, py, n, s.t)) { n.x = px; n.y = py; md = cd; continue } }
      break
    }
  } else if (c === 'L' || c === 'R') n.dir = DIRS[(DIRS.indexOf(s.dir) + (c === 'L' ? 3 : 1)) % 4]
  else if (c === 'P') {
    const got = (M.itemAt.get(M.K(s.x, s.y)) || []).find(i => !(s.pk & (1 << i)))
    if (got == null) return null
    n.pk = s.pk | (1 << got)
  } else if (c === 'D') {
    const carry = s.pk & ~s.dl
    if (!carry || !M.drop || M.drop.x !== s.x || M.drop.y !== s.y) return null
    n.dl = s.dl | carry
  } else return null
  n.t = s.t + 1
  if (iceOn(M, n.x, n.y, n.t)) return null
  return n
}
const skey = (M, s) => [s.x, s.y, s.dir, M.T ? s.t % M.T : Math.min(s.t, 400), s.pk, s.dl, s.sw, s.ky, s.ck].join(',')
const s0Of = M => ({ ...M.start, t: 0, pk: 0, dl: 0, sw: 0, ky: 0, ck: 0 })
// shortest main program with the given tools (F1 runs `body`, which then costs |body| once), or null
function dial (def, tools, body, limit) {
  const M = model(def), s0 = s0Of(M)
  if (done(M, s0)) return []
  const base = tools.filter(c => !REP[c] && (c !== 'F1' || body))
  const seq = (c, n) => Array.from({ length: n }, () => (c === 'F1' ? body : [c])).flat()
  const macros = base.map(c => ({ toks: [c], seq: seq(c, 1) }))
  tools.filter(c => REP[c]).forEach(r => base.forEach(c => macros.push({ toks: [r, c], seq: seq(c, REP[r]) })))
  const best = new Map([[skey(M, s0), 0]]), buckets = [[{ s: s0, prog: [] }]]
  for (let cost = 0; cost <= limit; cost++) {
    for (const node of buckets[cost] || []) {
      if (node.goal) return node.prog
      if (best.get(skey(M, node.s)) < cost) continue
      for (const m of macros) {
        let s = node.s, ok = true, reached = false
        for (const c of m.seq) { s = step(M, s, c); if (!s) { ok = false; break } if (done(M, s)) { reached = true; break } }
        if (!ok) continue
        const nc = cost + m.toks.length
        if (nc > limit) continue
        const nn = { s, prog: node.prog.concat(m.toks) }
        if (reached) { nn.goal = true; (buckets[nc] = buckets[nc] || []).push(nn); continue }
        const k = skey(M, s)
        if (best.has(k) && best.get(k) <= nc) continue
        best.set(k, nc); (buckets[nc] = buckets[nc] || []).push(nn)
      }
    }
  }
  return null
}
const chips = p => p.filter(c => c !== 'FN').length
// shortest program: plain, or (Fungsi boards) main + 'FN' + body over EVERY body of the plain commands up to fnMax
function solveWith (def, tools) {
  let best = dial(def, tools, null, LIMIT)
  if (!tools.includes('F1')) return best
  const base = tools.filter(c => !REP[c] && c !== 'F1'), max = Math.max(1, Math.min(6, def.fnMax || 4))
  const bodies = []; const gen = p => { if (p.length) bodies.push(p); if (p.length < max) base.forEach(c => gen(p.concat([c]))) }; gen([])
  for (const b of bodies) {
    const cap = (best ? chips(best) : LIMIT + 1) - b.length - 1
    if (cap < 1) continue
    const r = dial(def, tools, b, cap)
    if (r && r.includes('F1') && (!best || r.length + b.length < chips(best))) best = r.concat(['FN'], b)
  }
  return best
}
// the tools a child actually gets (TKGrid.create: CMDS order, easy trim) + the shortest route with them
export function solve (def) {
  let tools = CMDS.filter(c => (def.tools || []).includes(c))
  if (!tools.length) { tools = ['N', 'E', 'S', 'W']; if ((def.items || []).length) { tools.push('P'); if (def.drop) tools.push('D') } }
  let sol = solveWith(def, tools)
  // TKGrid 1.x trims every easy board; from 2.x (owner "no help" rule) only boards with trim:true
  const trims = def.trim === true || (def.easy && def.trim !== false && /^1\./.test(TKG.version || '1.'))
  if (trims && sol && sol.some(c => REP[c])) {
    const plain = tools.filter(c => !REP[c]), s2 = solveWith(def, plain)
    if (s2 && s2.length <= 12) { sol = s2; tools = plain }
  }
  if (trims && sol) { const need = tools.filter(c => sol.includes(c)); if (need.length) tools = need }
  return { sol, tools, par: sol ? chips(sol) : -1 }
}
// run a program with the independent rules (repeat + Fungsi semantics as the design): true when the goal is met
export function runs (def, prog) {
  const M = model(def), at = prog.indexOf('FN'), main = at < 0 ? prog : prog.slice(0, at), body = at < 0 ? [] : prog.slice(at + 1)
  let s = s0Of(M)
  if (done(M, s)) return true
  const lane = (list, inBody) => {
    let rep = 1
    for (const c of list) {
      if (REP[c]) { rep = REP[c]; continue }
      if (!CMDS.includes(c) || (c === 'F1' && inBody)) { rep = 1; continue }
      for (let k = 0; k < rep; k++) {
        if (c === 'F1') { const r = lane(body, true); if (r !== null) return r; continue }
        s = step(M, s, c); if (!s) return false; if (done(M, s)) return true
      }
      rep = 1
    }
    return null
  }
  return lane(main, false) === true
}

/* ── load the data ─────────────────────────────────────────────────── */
globalThis.window = globalThis
require(path.join(ROOT, 'games/data/asset-index.js'))
require(path.join(ROOT, 'games/data/tk-art.js'))
const TKW = require(path.join(ROOT, 'games/data/tk-worlds.js'))
const BASE_WORLDS = new Set(TKW.WORLDS.map(w => w.id))     // the 15 worlds of tk-worlds.js (the legends file appends more)
require(path.join(ROOT, 'games/data/tk-worlds-legends.js'))
const TKG = require(path.join(ROOT, 'games/tk-grid.js'))
const AI = globalThis.AssetIndex, ART = globalThis.TKArt
const artSrc = fs.readFileSync(path.join(ROOT, 'games/data/tk-art.js'), 'utf8')
const keyOk = k => {
  if (typeof k !== 'string' || !k) return false
  if (/^(ship|fx)\//.test(k)) return true                        // generated by TKArt.src
  if (AI.path(k)) return true
  return new RegExp("'" + k.replace(/[/-]/g, m => '\\' + m) + "'\\s*:").test(artSrc) && /^char\//.test(k)   // TKArt placeholder
}
// sprites whose art carries Titanic / White Star Line branding or a lifeboat number (checked by eye, 2026-09-29)
const BRANDED = new Set(('crate-supplies crate-spare-parts crate-engine-room crate-white-star crate-titanic crate-rms suitcase suitcase-2 suitcase-4 suitcase-7 suitcase-8 ' +
  'blanket blanket-2 blanket-navy life-vest lifeboat-11 lifeboat-14 lifeboat-6 lifeboat-6b trunk deck-bench teacup teacup-2 cloche dinner-plate duffel-bag ' +
  'lifebuoy lifebuoy-2 lifebuoy-3 lifebuoy-4 lifebuoy-5 lifebuoy-6').split(' ').map(k => 'tk-prop/' + k))
const branded = k => BRANDED.has(k) || /titanic|white-star|rms|first-class|1912|passenger-list/.test(k)
// level ids that existed before this gate was written (saves key stars by id: none may disappear or be renamed)
const OLD_IDS = {
  kamar: 'k1 k2 k3 k4', titanic: 'c1 c2 c3 c4 c5 c6 c7 c8 c9 c10',
  ...Object.fromEntries('britannic vasa cuttysark victory mayflower endurance kontiki calypso queenmary arizona missouri nautilus pelabuhan'.split(' ').map(w => [w, [1, 2, 3, 4, 5, 6].map(n => w + n).join(' ')]))
}
const OLD_GRIDS = new Set(['k2', 'k3', 'c3b', 'c4a', 'c7a', 'c7b', 'c7c'].concat(Object.keys(OLD_IDS).filter(w => w !== 'kamar' && w !== 'titanic').map(w => w + '3')))

/* ── A: every level ─────────────────────────────────────────────────── */
// the mechanics a board carries (read by THIS gate from the rows + fields, cross-checked against TKGrid.create)
const MECHS = ['licin', 'pusaran', 'kunci', 'bendera', 'kabut', 'penjaga', 'fungsi', 'tanya']
const MOB_KINDS = new Set(['whale', 'patrol', 'tug'])
function mechsOf (def) {
  const X = rowsOf(def), m = new Set()
  if (X.slick.length) m.add('licin')
  if (X.whirls.length) m.add('pusaran')
  if (X.keys.length || X.doors.length) m.add('kunci')
  if (X.stops.length) m.add('bendera')
  if (def.fog) m.add('kabut')
  if ((def.ice || []).some(o => MOB_KINDS.has(o.kind))) m.add('penjaga')
  if ((def.tools || []).includes('F1')) m.add('fungsi')
  if (X.q.length) m.add('tanya')
  return m
}
// kid words the one-panel intro uses to NAME the new thing
const NAMES = { licin: /licin|meluncur/i, pusaran: /pusaran/i, kunci: /kunci|pintu/i, bendera: /bendera|berurutan/i, kabut: /kabut/i,
  penjaga: /paus|patroli|kapal tunda/i, fungsi: /fungsi/i, tanya: /peti tanya|pintu tanya|soal/i }
const words = t => String(t || '').trim().split(/\s+/).filter(Boolean).length
const seen = new Map(), rows = [], counts = {}, mechWorlds = Object.fromEntries(MECHS.map(k => [k, new Set()])), qWorlds = new Set(), firstSeen = {}
const NEW_DAY = '2026-09-30'
// one board (a level's board, or its Tingkat Soal Sulit variant): engine agreement, route, mechanics really used
function board (w, lv, def, tag, variant) {
  const r = solve(def), L = TKG.create(def), b = variant || lv.board
  check(r.par > 0, `${tag}: unsolvable`)
  check(r.par === L.shortest, `${tag}: solver shortest ${r.par} != TKGrid.shortest ${L.shortest}`)
  check(JSON.stringify(r.tools) === JSON.stringify(L.tools), `${tag}: tools ${r.tools} != TKGrid tools ${L.tools}`)
  if (b.par != null) check(b.par === r.par, `${tag}: par ${b.par} but the true shortest is ${r.par}`)
  check(r.par <= 12, `${tag}: par ${r.par} > 12 (qa-tk-grid world rule)`)
  check(L.maxLen >= r.par + SLACK, `${tag}: maxLen ${L.maxLen} < par ${r.par} + ${SLACK}`)
  check(!TKG.validate(def).length, `${tag}: TKGrid.validate ${JSON.stringify(TKG.validate(def))}`)
  const mech = mechsOf(def), eng = new Set()
  if (L.slick.length) eng.add('licin'); if (L.whirls.length) eng.add('pusaran'); if (L.keys.length || L.doors.length) eng.add('kunci')
  if (L.stops.length) eng.add('bendera'); if (L.fog) eng.add('kabut'); if (L.ice.some(o => MOB_KINDS.has(o.kind))) eng.add('penjaga')
  if (L.tools.includes('F1')) eng.add('fungsi'); if (L.q.length) eng.add('tanya')
  check([...mech].sort().join() === [...eng].sort().join(), `${tag}: mechanics read here ${[...mech]} != TKGrid.create ${[...eng]}`)
  if (r.sol) {
    check(runs(def, r.sol), `${tag}: solver route does not run under the solver's own rules`)
    const res = TKG.run(def, r.sol)
    check(res.ok && res.moves === r.par && res.stars === 3, `${tag}: TKGrid.run(solver route) ok=${res.ok} moves=${res.moves} stars=${res.stars} ${res.reason || ''}`)
    if (r.par <= 7 && !r.tools.includes('F1')) {       // brute force: no program of par-1 chips over the child's tools reaches the goal
      let found = null
      const rec = (p) => { if (found) return; if (p.length === r.par - 1) { if (runs(def, p)) found = p.slice(); return } for (const c of r.tools) { p.push(c); rec(p); p.pop() } }
      rec([])
      check(!found, `${tag}: a ${r.par - 1}-chip program ${found} also works (par is not minimal)`)
    }
    // the mechanic is really PLAYED on the 3-star route (teach by design, never decoration)
    const ev = { slide: 0, warp: 0, door: 0, stops: 0, quiz: [], cells: new Set() }
    res.steps.forEach(st => {
      ev.cells.add(st.x + ',' + st.y); if (st.via) ev.cells.add(st.via.x + ',' + st.via.y)
      ;(st.hops || []).forEach(h => { if (h.k === 'slide') ev.slide++; if (h.k === 'warp') ev.warp++; ev.cells.add(h.x + ',' + h.y); ev.cells.add(h.fx + ',' + h.fy) })
      if (st.door != null) ev.door++; if (st.stops) ev.stops += st.stops.length; (st.quiz || []).forEach(q => ev.quiz.push(q.i))
    })
    const lint = TKG.lint(def).map(x => x.code)
    if (mech.has('licin')) check(ev.slide > 0, `${tag}: licin board, but the route never slides`)
    if (mech.has('pusaran')) check(ev.warp > 0, `${tag}: whirlpool board, but the route never warps`)
    if (mech.has('kunci')) check(ev.door > 0, `${tag}: key board, but the route passes no door`)
    if (mech.has('bendera')) check(ev.stops === L.stops.length, `${tag}: flags delivered ${ev.stops}/${L.stops.length}`)
    if (mech.has('kabut')) check(L.beacons.length > 0 && L.beacons.some(p => ev.cells.has(p.x + ',' + p.y)), `${tag}: fog board needs a lighthouse buoy on the route`)
    if (L.ice.length) check(!lint.includes('mobIdle'), `${tag}: the moving obstacle never touches a shortest route (mobIdle)`)
    if (mech.has('tanya')) check(new Set(ev.quiz).size === L.q.length && !lint.includes('qOffRoute'), `${tag}: question tiles met on the route ${new Set(ev.quiz).size}/${L.q.length} ${lint}`)
    if (mech.has('fungsi')) check(r.sol.includes('F1') && TKG.solve(def).includes('F1'), `${tag}: Fungsi board, but the 3-star route does not call F1`)
  }
  const sig = JSON.stringify([b.rows, b.dir, def.tools, def.ice])
  check(!seen.has(sig), `${tag}: identical board to ${seen.get(sig)}`)
  seen.set(sig, tag)
  return { r, L, mech }
}
for (const w of TKW.WORLDS) {
  const ids = w.levels.map(l => l.id), flat = TKW.flat(w), base = BASE_WORLDS.has(w.id)
  check(new Set(ids).size === ids.length && new Set(flat.map(l => l.id)).size === flat.length, `${w.id}: duplicate level / step ids`)
  ;(OLD_IDS[w.id] || '').split(' ').filter(Boolean).forEach(id => check(ids.includes(id), `${w.id}: old level id ${id} is gone (saves would lose it)`))
  const fr = w.levels.filter(l => l.fragment)
  if (w.id !== 'kamar' && w.id !== 'titanic') check(fr.length === 1 && w.levels[w.levels.length - 1].fragment, `${w.id}: the compass fragment must stay the LAST level`)
  // a level added later is optional (TKAtlas: it never re-locks a save); the new batch carries the new date
  w.levels.forEach(l => { if ((l.id === w.id + '10' || l.id === w.id + '11') && base) check(l.added === NEW_DAY, `${w.id}/${l.id}: new level must carry added:'${NEW_DAY}'`) })
  counts[w.id] = 0
  const worldNewMech = new Set()
  let firstMech = null
  for (const lv of flat) {
    if (lv.type !== 'grid') continue
    counts[w.id]++
    const def = TKW.grid(lv), isNew = base && !OLD_GRIDS.has(lv.id), tag = `${w.id}/${lv.id}`, b = lv.board
    const { r, L, mech } = board(w, lv, def, tag, null)
    rows.push({ w: w.id, id: lv.id, title: lv.title, size: def.w + 'x' + def.h, par: r.par, maxLen: L.maxLen, easy: !!def.easy, isNew, tools: r.tools.join(''), items: def.items.length, ice: def.ice.length, cur: def.currents.length, mech: [...mech].join(' ') })
    mech.forEach(k => { mechWorlds[k].add(w.id); if (!firstSeen[k]) firstSeen[k] = { tag, par: r.par, easy: !!def.easy, cells: def.w * def.h } })
    if (mech.has('tanya')) qWorlds.add(w.id)
    if (isNew) check(b.par != null, `${tag}: new level has no par`)
    const mechNew = [...mech].filter(k => k !== 'tanya')
    if (isNew) {
      check(!!lv.goal && !!lv.title && !!lv.fact, `${tag}: new level needs title, mission line (goal) and fact`)
      check(lv.story && lv.story.length === 1, `${tag}: new level needs its one-panel scenario intro`)
      if (def.easy) check(def.w * def.h <= 20 && r.par <= 8, `${tag}: easy board must stay tiny (${def.w}x${def.h}, par ${r.par})`)
      else if (mech.size) {    // playtest 2026-09-30: later boards were trivial -> meaty: 5x5+, par 8..12, a question tile on the route
        check(def.w >= 5 && def.h >= 5 && def.w * def.h <= 36 && r.par >= 8 && r.par <= 12 && def.blocks.length > 0, `${tag}: later mechanic board must be 5x5..6x6 with obstacles, par 8..12 (${def.w}x${def.h}, par ${r.par})`)
        if (lv.added === NEW_DAY) check(mech.has('tanya'), `${tag}: later mechanic board carries a question chest / door`)
      }
      else check(def.w >= 5 && def.h >= 5 && r.par >= 8 && r.par <= 12 && (def.blocks.length > 0), `${tag}: later board must be 5x5..6x6 with obstacles, par 8..12 (${def.w}x${def.h}, par ${r.par})`)
    }
    if (lv.added === NEW_DAY) {
      check(words(lv.goal) <= 12, `${tag}: mission line <= 12 words (${words(lv.goal)}: ${lv.goal})`)
      check(words(lv.fact) <= 11, `${tag}: fun fact <= 11 words, it must fit the penguin tip card (${words(lv.fact)})`)
      const intro = (lv.story || []).map(p => p.caption).join(' ')
      check(words(intro.split(' Tahukah kamu? ')[0]) <= 20, `${tag}: captain intro is one short line`)
      check([...mech].some(k => NAMES[k].test(intro)), `${tag}: the intro names none of the board's mechanics (${[...mech]}): ${intro}`)
      mechNew.forEach(k => worldNewMech.add(k))
      if (!firstMech && mechNew.length) { firstMech = { tag, par: r.par, def } }
    }
    if (b.sulit) {       // Tingkat Soal Sulit variant (grades 3–4): relative commands + Fungsi
      const sdef = TKW.grid(lv, { level: 'sulit' }), stag = tag + '[sulit]'
      const sv = board(w, lv, sdef, stag, b.sulit)
      check(sv.mech.has('fungsi') && ['F', 'L', 'R'].every(c => sv.L.tools.includes(c)), `${stag}: Sulit variant plays relative commands + Fungsi (${sv.L.tools})`)
      check(JSON.stringify(TKW.grid(lv)) !== JSON.stringify(sdef) && !TKW.grid(lv).tools.includes('F1'), `${stag}: Mudah (default) never gets the Fungsi variant`)
      sv.mech.forEach(k => mechWorlds[k].add(w.id))
      rows.push({ w: w.id, id: lv.id + '*', title: lv.title + ' (Sulit)', size: sdef.w + 'x' + sdef.h, par: sv.r.par, maxLen: sv.L.maxLen, easy: !!sdef.easy, isNew, tools: sv.r.tools.join(''), items: 0, ice: sdef.ice.length, cur: 0, mech: [...sv.mech].join(' ') })
    }
    // every delivery ends at a sprite that fits its story (playtest 2026-09-30), never the generic marker
    if (base && def.drop) check(!!def.dropArt, `${tag}: drop tile has no dropArt (a bed, a toolbox, the mother penguin …)`)
    if (lv.id === 'c4d') check(/engine|telegraph|furnace|coal/.test(def.goalArt || ''), `${tag}: the coal run ends at the engine, not a lifeboat (${def.goalArt})`)
    const keys = [].concat(def.blockArt || [], def.itemArt ? [def.itemArt] : [], def.dropArt ? [def.dropArt] : [], def.goalArt ? [def.goalArt] : [], ...(lv.story || []).map(p => (p.layers || []).map(l => l.k)))
    keys.forEach(k => check(keyOk(k), `${tag}: sprite key ${k} not in the AssetIndex`))
    // Titanic-branded props (printed TITANIC / R.M.S. / White Star / numbered lifeboats) stay in Titanic + Britannic
    if (w.id !== 'titanic' && w.id !== 'britannic') {
      keys.filter(branded).forEach(k => check(false, `${tag}: Titanic-branded sprite ${k} outside Titanic/Britannic`))
      if (def.items.length) check(!!def.itemArt, `${tag}: cargo without itemArt draws TKGrid's default crate (printed TITANIC SUPPLIES)`)
    } else if (w.id === 'britannic') keys.filter(k => branded(k) && !/white-star/.test(k)).forEach(k => check(false, `${tag}: sprite ${k} is printed TITANIC (Britannic board)`))
    ;(lv.story || []).forEach(p => check(!!ART.scenes[p.scene] || !!ART.SCENE_ART[p.scene], `${tag}: story scene ${p.scene} unknown`))
    if (lv.scene) check(!!ART.scenes[lv.scene] || !!ART.SCENE_ART[lv.scene], `${tag}: scene ${lv.scene} unknown`)
    const text = [lv.title, lv.goal, lv.fact, lv.hint, ...(lv.story || []).map(p => p.caption)].join(' ')
    check(!/\p{Extended_Pictographic}/u.test(text), `${tag}: emoji in text`)
  }
  // ONE new mechanic per world (Pelabuhan Waktu, the finale, mixes them); its first board is gentle
  if (base && w.id !== 'pelabuhan') check(worldNewMech.size <= 1, `${w.id}: new boards bring ${worldNewMech.size} mechanics (${[...worldNewMech]}), one per world`)
  if (firstMech) check(firstMech.par <= 10 && !TKG.create(firstMech.def).tools.includes('F1'), `${firstMech.tag}: the world's first mechanic board is gentle (par ${firstMech.par} <= 10)`)
}
// lanes runs (playtest 2026-09-30): every non-final run asks on collisions, 2 Soal buoys and a lighthouse gate, and lasts ~45–60 s
const LANE_LEN = { open: 800, sparse: 1300, more: 1400, narrow: 1300, dense: 1500 }, LANE_V = [150, 170, 190]
for (const w of TKW.WORLDS) for (const lv of TKW.flat(w)) {
  if (lv.type !== 'lanes' || lv.final) continue
  const q = lv.questions || {}, on = [].concat(q.on || []), tag = `${w.id}/${lv.id}`
  check(['collide', 'buoy', 'gate'].every(k => on.includes(k)) && q.buoys >= 2 && q.gates >= 1, `${tag}: lanes questions ${JSON.stringify(q)}`)
  const secs = (lv.sections || ['open', 'sparse', 'more', 'narrow', 'dense']).map(x => typeof x === 'string' ? x : x.kind)
  const sec = secs.reduce((n, k) => n + (LANE_LEN[k] || 1300), 0) * (lv.lengthScale || 1) / LANE_V[(lv.difficulty || 1) - 1]
  check(sec >= 45 && sec <= 60, `${tag}: lanes run lasts ${sec.toFixed(1)} s, want 45–60`)
}
// kind words (child safety): no war / sinking / death words in any world text (Titanic chapter names are the owner's own)
{
  const BAD = /\b(perang|tenggelam|karam|tewas|meninggal|korban|bencana)(nya|kan|lah|an)?\b/i
  const str = (o, out = [], seen = new Set()) => { if (typeof o === 'string') out.push(o); else if (o && typeof o === 'object' && !seen.has(o)) { seen.add(o); for (const k of Object.keys(o)) if (k !== 'cat' && k !== 'id') str(o[k], out, seen) } return out }
  const texts = str(TKW.WORLDS).concat(TKW.CATS.map(c => c[1])).filter(t => !/^(perang-damai)$/.test(t))
  texts.forEach(t => check(!BAD.test(t), `unkind word in world text: "${t.slice(0, 90)}"`))
}
for (const [w, n] of Object.entries(counts)) if (BASE_WORLDS.has(w)) check(n >= (w === 'titanic' ? 5 : 3), `${w}: only ${n} grid levels`)
const nNew = rows.filter(r => r.isNew).length
check(nNew >= 28, `only ${nNew} new grid levels`)
// coverage: every mechanic in >= 2 worlds; every world (legends too) has a question-tile board; the FIRST board of
// the game that shows a mechanic is small and short (the child meets it on a board that explains itself)
MECHS.forEach(k => check(mechWorlds[k].size >= 2, `mechanic ${k} appears in ${mechWorlds[k].size} world(s) (${[...mechWorlds[k]]}), want >= 2`))
TKW.WORLDS.forEach(w => check(qWorlds.has(w.id), `${w.id}: no board with a question chest / door`))
MECHS.filter(k => k !== 'fungsi').forEach(k => firstSeen[k] && check(firstSeen[k].par <= 8 && firstSeen[k].cells <= 25, `mechanic ${k} is first met on ${firstSeen[k].tag} (par ${firstSeen[k].par}, ${firstSeen[k].cells} tiles): want par <= 8, <= 25 tiles`))
console.log('mechanics per world: ' + MECHS.map(k => k + ' [' + [...mechWorlds[k]].join(' ') + ']').join(' · '))
console.log('first met: ' + MECHS.filter(k => firstSeen[k]).map(k => k + ' ' + firstSeen[k].tag).join(' · '))

if (process.argv.includes('--list') || fails.length) {
  console.log('world       id           size  par max easy tools     it ice cur  mechanics          title')
  for (const r of rows) console.log(`${r.w.padEnd(11)} ${r.id.padEnd(12)} ${r.size.padEnd(5)} ${String(r.par).padStart(3)} ${String(r.maxLen).padStart(3)} ${r.easy ? 'yes ' : 'no  '} ${r.tools.padEnd(9)} ${r.items}  ${r.ice}   ${r.cur}   ${(r.mech || '').padEnd(18)} ${r.isNew ? '+ ' : '  '}${r.title}`)
}
console.log('grid levels per world: ' + Object.entries(counts).map(([w, n]) => w + ' ' + n).join(', '))
console.log(`grid levels: ${rows.length} (${nNew} new) · engine: ${passes} checks passed, ${fails.length} failed`)

/* ── B: 5 random new levels in the harness ─────────────────────────── */
if (process.env.QA_UI !== '0') {
  const { default: puppeteer } = await import('puppeteer')
  const SHOTS = process.env.QA_SHOTS || ''
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true })
  let seed = +(process.env.QA_SEED || Date.now() % 100000)
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
  const pool = rows.filter(r => r.isNew), pick = []
  const want = (process.env.QA_LEVELS || '').split(',').filter(Boolean)   // QA_LEVELS=id,id pins the UI levels
  if (want.length) want.forEach(id => { const r = pool.find(x => x.id === id); if (r) pick.push(r) })
  else while (pick.length < 5 && pool.length) pick.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
  console.log('UI levels: ' + pick.map(r => r.w + '/' + r.id).join(', ') + ` (QA_SEED to repeat)`)
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
  try {
    for (const r of pick) {
      const lv = TKW.flat(TKW.get(r.w)).find(l => l.id === r.id), def = TKW.grid(lv), route = solve(def).sol
      for (const [vw, vh] of [[1280, 800], [390, 844]]) {
        const tag = `UI ${r.w}/${r.id} ${vw}x${vh}`, p = await browser.newPage(), errs = []
        p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
        p.on('requestfailed', q => errs.push('failed ' + q.url()))
        try {
          await p.setViewport({ width: vw, height: vh, isMobile: vw < 1000, hasTouch: vw < 1000 })
          await p.goto(`http://localhost:8081/tools/tk-harness-grid.html?w=${r.w}&lv=${r.id}&coach=0&rm=1`, { waitUntil: 'networkidle0', timeout: 30000 })
          await p.waitForFunction(() => window.__h && document.querySelector('.tkg-go'), { timeout: 10000 })
          const info = await p.evaluate((prog) => {
            window.__h.setProgram(prog)
            const b = document.querySelector('.tkg-board').getBoundingClientRect()
            return { program: window.__h.state().program, board: [Math.round(b.width), Math.round(b.height)], hscroll: document.documentElement.scrollWidth > innerWidth }
          }, route)
          check(JSON.stringify(info.program) === JSON.stringify(route), `${tag}: setProgram kept ${JSON.stringify(info.program)} want ${JSON.stringify(route)}`)
          check(!info.hscroll && info.board[0] > 100, `${tag}: board ${info.board} / horizontal scroll`)
          await p.click('.tkg-go')
          await p.waitForFunction(() => !!window.__done, { timeout: 30000 })
          const d = await p.evaluate(() => window.__done)
          check(d.stars === 3 && d.moves === r.par, `${tag}: onDone ${JSON.stringify(d)} want 3 stars in ${r.par}`)
          if (SHOTS) await p.screenshot({ path: `${SHOTS}/lv-${r.id}-${vw}x${vh}.png` })
          check(!errs.length, `${tag}: errors ${errs.slice(0, 3).join(' | ')}`)
          console.log(`ok ${tag}: ${route.join(' ')} -> ${d.stars} stars`)
        } catch (e) { check(false, `${tag}: ${e.message}`) }
        await p.close()
      }
    }
  } finally { await browser.close() }
}
console.log(`\n${passes} passed, ${fails.length} failed`)
process.exit(fails.length ? 1 : 0)
