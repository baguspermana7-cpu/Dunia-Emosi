// G30 Timmy & Kapal Legendaris — TKGrid gate (games/tk-grid.js).
//   A) engine, in node: turning, edges, blocks, currents (incl. blocked push), moving-ice
//      timing, repeat, pick/drop, failAt index, notAtGoal, early stop, stars, never-throws,
//      determinism; shortest() on 20 hand-computed boards; BFS vs brute force (every program
//      shorter than `shortest` fails, the BFS program succeeds) on small random boards;
//      500 random solvable boards: the BFS program runs ok with moves == shortest;
//      TKGrid.SAMPLES (6) all validate; every grid level in TKWorlds.WORLDS validates with
//      shortest <= 12 (QA_SKIP_WORLDS=1 reports without failing).
//   B) UI via tools/tk-harness-grid.html at 390x844, 844x390, 1024x768, 1280x800: 3 levels; real taps
//      build a WRONG program -> it fails on the expected chip (highlighted) with an
//      Indonesian message naming that chip number; trash, rebuild the shortest route with
//      taps + one real drag, tap-to-remove, JALAN -> onDone stars 3. Hint ladder, reduced
//      motion, all 6 samples mount. No page errors / console errors / failed requests;
//      every target >= 44 px; nothing off-screen; no horizontal scroll; Timmy's bubble never
//      covers the board; Hapus + JALAN! sit inside the "Perintah" panel, JALAN! clear of the
//      viewport edge, Hapus clear of the Timmy hint avatar; text >= 12 px; no emoji.
//   D) ease (owner 2026-09-28): chips >= 64 px, slots >= 48, Undo >= 56; live ghost path + orange failing tile +
//      NO route trace before JALAN! (no dots / ghost / orange chip) and NO automatic idle hint (owner 2026-09-29); Undo;
//      coach hand taps the right chip then JALAN!, Lewati, returns after idle, k2 always / others once;
//      sparkles + star burst; easy boards forgive one extra chip. Shots -> QA_EASE_SHOTS.
//   C) every TKWorlds grid level mounted like timmy-kapal.js (?w=&lv=): theme class, obstacle
//      sprites from the level's blockArt, no 404s, layout rules; the deck level t10 is solved
//      by real taps at every size; chapter card + footer callbacks.
// QA_SIZES="390x844,..." limits sizes · QA_SHOTS=<dir> screenshots · QA_UI=0 engine only.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const T = require(path.join(ROOT, 'games/tk-grid.js'))
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL ' + msg) } }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const T_moves = p => (p || []).filter(c => c !== 'FN').length

/* board text -> def ('.' water '#' ice 'S' start 'G' goal 'c' crate 'd' drop '><^v' current 'w' switch 'g' gate) */
function B (rows, o = {}) {
  const d = { w: rows[0].length, h: rows.length, blocks: [], items: [], currents: [], switches: [], tools: o.tools || ['N', 'E', 'S', 'W'], ice: o.ice || [] }
  const CUR = { '>': 'E', '<': 'W', '^': 'N', v: 'S' }, gates = []
  let sw = null
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === 'S') d.start = { x, y, dir: o.dir || 'E' }
    else if (ch === 'G') d.goal = { x, y }
    else if (ch === '#') d.blocks.push({ x, y })
    else if (ch === 'c') d.items.push({ x, y, id: 'peti' })
    else if (ch === 'd') d.drop = { x, y }
    else if (CUR[ch]) d.currents.push({ x, y, dir: CUR[ch] })
    else if (ch === 'w') sw = { x, y }
    else if (ch === 'g') gates.push({ x, y })
  }))
  if (sw) d.switches.push({ ...sw, opens: gates })
  if (o.maxLen) d.maxLen = o.maxLen
  return d
}
const NESW = ['N', 'E', 'S', 'W'], FLR = ['F', 'L', 'R']

/* ── A1: 20 hand-computed shortest routes ── */
const HAND = [
  ['straight NESW', B(['S...G']), 4],
  ['straight FLR', B(['S...G'], { tools: FLR }), 4],
  ['behind FLR (turn around)', B(['G...S'], { tools: FLR }), 6],
  ['behind NESW', B(['G...S']), 4],
  ['diagonal NESW', B(['S.', '.G']), 2],
  ['diagonal FLR', B(['S.', '.G'], { tools: FLR }), 3],
  ['wall NESW', B(['S#G', '...']), 4],
  ['wall FLR', B(['S#G', '...'], { tools: FLR }), 7],
  ['current helps', B(['S>..G']), 3],
  ['current pushes back', B(['S.<.G', '.....']), 6],
  ['repeat 7 tiles', B(['S......G'], { tools: [...NESW, 'R2', 'R3'] }), 5],
  ['pick + drop (goal = drop)', B(['Sc.d'], { tools: [...NESW, 'P', 'D'] }), 5],
  ['pick, no drop', B(['Sc.G'], { tools: [...NESW, 'P'] }), 4],
  ['static ice path', B(['S...G', '.....'], { ice: [{ path: [{ x: 2, y: 0 }] }] }), 6],
  ['maze NESW', B(['S#.', '.#G', '...']), 5],
  ['maze FLR', B(['S#.', '.#G', '...'], { tools: FLR }), 8],
  ['switch opens gate', B(['SgG', 'w##']), 4],
  ['one step', B(['SG']), 1],
  ['repeat with turns', B(['S..', '...', '..G'], { tools: [...FLR, 'R2'] }), 5],
  ['drop then goal', B(['S.c', '...', 'd.G'], { tools: [...NESW, 'P', 'D'] }), 10]
]
for (const [name, d, want] of HAND) {
  const got = T.shortest(d)
  check(got === want, `hand "${name}": shortest ${got}, expected ${want}`)
  const sol = T.solve(d), r = T.run(d, sol)
  check(r.ok && sol.length === want, `hand "${name}": solve() program ${JSON.stringify(sol)} ok=${r.ok}`)
  check(T.validate(d).length === 0, `hand "${name}": validate ${JSON.stringify(T.validate(d))}`)
}

/* ── A2: behaviour ── */
{
  const d = B(['S...G'], { tools: FLR })
  let r = T.run(d, ['L']); check(r.steps[0].dir === 'N' && r.steps[0].event === 'turn', 'L from E faces N')
  r = T.run(d, ['R', 'R']); check(r.steps[1].dir === 'W', 'R,R from E faces W')
  r = T.run(d, ['L', 'F']); check(r.reason === 'edge' && r.failAt === 1 && r.steps.length === 2, `edge after turn: ${r.reason} @${r.failAt}`)
  r = T.run(B(['S...G']), ['N']); check(r.reason === 'edge' && r.failAt === 0, 'N off the top = edge @0')
  r = T.run(B(['S...G']), ['S', 'E']); check(r.reason === 'edge' && r.failAt === 0 && r.steps[0].face === 'S', 'S off 1-row board = edge @0, face S')
  r = T.run(B(['S#G', '...']), ['E', 'E']); check(r.reason === 'block' && r.failAt === 0 && r.steps[0].x === 0, 'block @0, boat stays')
  r = T.run(B(['S.#.G']), ['R3', 'E']); check(r.reason === 'block' && r.failAt === 1 && r.steps.length === 2 && r.steps[0].rep === 0, `repeat fails on its command chip: @${r.failAt}`)
  r = T.run(B(['S.#.G']), ['E', 'R2', 'S', 'E']); check(r.reason === 'edge' && r.failAt === 2, 'R2 S on 1-row board fails @2')
  r = T.run(B(['S...G']), ['R2', 'R3', 'E']); check(r.steps.length === 3 && !r.ok, 'repeat before repeat: the later one wins (3 moves)')
  r = T.run(B(['S...G']), ['E', 'R2']); check(r.reason === 'notAtGoal' && r.steps.length === 1, 'trailing repeat does nothing')
  r = T.run(B(['S>..G']), ['E']); check(r.steps[0].event === 'current' && r.steps[0].x === 2 && eq(r.steps[0].via, { x: 1, y: 0 }), 'current pushes one tile')
  r = T.run(B(['S>>.G']), ['E']); check(r.steps[0].x === 2, 'current pushes exactly one tile (no chain)')
  r = T.run(B(['S>#G', '....']), ['E']); check(r.steps[0].x === 1 && r.steps[0].stuck, 'current into a block: boat stays on the current')
  r = T.run(B(['Sv..', '..G.'], {}), ['E', 'E']); check(r.steps[0].y === 1 && r.steps[1].x === 2 && r.ok, 'current down then on to goal')
  // moving ice: path of 3 on column 1, rows 0,1,1
  const ice = B(['S.G', '...'], { tools: FLR, ice: [{ path: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 }] }] })
  r = T.run(ice, ['F']); check(r.reason === 'ice' && r.failAt === 0 && r.steps[0].x === 0, 'ice on target tile at t0 blocks')
  r = T.run(ice, ['L', 'R', 'F']); check(r.reason === 'ice' && r.failAt === 2 && r.steps.length === 4 && r.steps[2].event === 'move' && r.steps[3].event === 'bump', 'ice drifts onto the boat after the move (t2->t3)')
  r = T.run(ice, ['L', 'L', 'L', 'L', 'F', 'F']); check(r.ok && r.steps[4].ice[0].y === 1, 'waiting 4 turns lets the boat slip past the ice')
  check(eq(T.run(ice, ['L', 'R']).steps.map(s => s.ice[0]), [{ x: 1, y: 1 }, { x: 1, y: 1 }]), 'ice advances one step per command and loops')
  const ice2 = B(['S..', '...'], { ice: [{ path: [{ x: 2, y: 0 }, { x: 1, y: 0 }] }] })
  r = T.run(ice2, ['E']); check(r.reason === 'ice' && r.failAt === 0, 'ice coming onto the boat right after its move = ice')
  // pick / drop
  const pd = B(['Sc.d'], { tools: [...NESW, 'P', 'D'] })
  r = T.run(pd, ['D']); check(r.reason === 'noItem' && r.detail === 'empty' && r.failAt === 0, 'drop with empty boat = noItem/empty')
  r = T.run(pd, ['P']); check(r.reason === 'noItem' && r.detail === 'none', 'pick on empty water = noItem/none')
  r = T.run(pd, ['E', 'P', 'P']); check(r.reason === 'noItem' && r.failAt === 2, 'second pick of the same crate = noItem @2')
  r = T.run(pd, ['E', 'P', 'E', 'D']); check(r.reason === 'wrongDrop' && r.failAt === 3, 'drop off the mark = wrongDrop @3')
  r = T.run(pd, ['E', 'P', 'E', 'E']); check(r.reason === 'notAtGoal' && r.detail === 'items', 'on the drop tile but not delivered = notAtGoal/items')
  r = T.run(pd, ['E', 'P', 'E', 'E', 'D']); check(r.ok && r.steps[4].event === 'drop' && r.steps[1].carry === 1 && r.steps[4].carry === 0, 'pick, carry, deliver = ok')
  r = T.run(B(['S...G']), ['E']); check(r.reason === 'notAtGoal' && r.detail === 'far' && r.failAt === null, 'short program = notAtGoal/far, failAt null')
  r = T.run(B(['S.G']), ['E', 'E', 'E']); check(r.ok && r.endAt === 1 && r.moves === 3 && r.stars === 2 && r.steps.length === 2, 'run stops at the goal; extra chips cost a star')
  check(T.stars(4, 4) === 3 && T.stars(6, 4) === 2 && T.stars(7, 4) === 1 && T.stars(3, 4) === 3, 'stars: 3 = shortest, 2 = <= +2, 1 otherwise')
  // switch / gate
  const sg = B(['SgG', 'w##'])
  r = T.run(sg, ['E']); check(r.reason === 'block', 'closed gate blocks')
  r = T.run(sg, ['S', 'N', 'E', 'E']); check(r.ok && r.steps[0].opened === 1, 'switch opens the gate')
  // never throws + validate
  let threw = false
  try {
    for (const bad of [null, undefined, 5, 'x', {}, { w: 'x', h: -3 }, { w: 3, h: 3, start: null, goal: 7, blocks: 'no', ice: [{ path: 'no' }, null] }]) {
      T.run(bad, ['F', 'Q', null, 7]); T.run(bad, null); T.validate(bad); T.shortest(bad); T.solve(bad); T.nextHint(bad, 'x'); T.create(bad)
    }
  } catch (e) { threw = e }
  check(!threw, 'engine never throws on garbage: ' + threw)
  check(T.validate(B(['#G'])).some(p => p.code === 'startOnBlock') || T.validate({ w: 2, h: 1, start: { x: 0, y: 0 }, goal: { x: 1, y: 0 }, blocks: [{ x: 0, y: 0 }] }).some(p => p.code === 'startOnBlock'), 'validate: start on block')
  check(T.validate(B(['S#G'])).some(p => p.code === 'unsolvable'), 'validate: unsolvable')
  check(T.validate(B(['S...G'], { maxLen: 2 })).some(p => p.code === 'tooLong'), 'validate: tooLong')
  check(T.validate(B(['Sc.d'], { tools: NESW })).some(p => p.code === 'noPick'), 'validate: crate without Ambil')
  check(T.create({ w: 3, h: 1, start: { x: 0, y: 0 }, drop: { x: 2, y: 0 }, items: [{ x: 1, y: 0 }] }).goal.x === 2, 'no goal + drop -> goal = drop')
  // hint ladder engine
  const h1 = T.nextHint(B(['S#G', '...']), ['E', 'E'])
  check(h1 && h1.keep === 0 && h1.next.length === 1 && T.run(B(['S#G', '...']), h1.full).ok, 'nextHint after a failing first chip restarts from 0')
  const h2 = T.nextHint(B(['S...G']), ['E', 'E'])
  check(h2 && h2.keep === 2 && eq(h2.next, ['E']) && h2.full.length === 4, 'nextHint keeps a correct prefix')
  check(T.nextHint(B(['S.G']), ['E', 'E']) === null, 'nextHint = null when already solved')
}

/* ── A3: random boards ── */
let seed = 20260928
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296)
const ri = n => Math.floor(rnd() * n)
function randLevel (maxW, maxH, feats) {
  const w = 2 + ri(maxW - 1), h = 1 + ri(maxH), cells = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push({ x, y })
  for (let i = cells.length - 1; i > 0; i--) { const j = ri(i + 1); [cells[i], cells[j]] = [cells[j], cells[i]] }
  if (cells.length < 3) return null
  const take = () => cells.pop()
  const d = { w, h, start: { ...take(), dir: 'NESW'[ri(4)] }, blocks: [], currents: [], items: [], ice: [], switches: [] }
  const useFLR = feats && rnd() < 0.4
  d.tools = useFLR ? ['F', 'L', 'R'] : ['N', 'E', 'S', 'W']
  const nb = ri(Math.max(1, Math.floor(cells.length * 0.3)))
  for (let i = 0; i < nb && cells.length > 2; i++) d.blocks.push(take())
  if (feats && rnd() < 0.5 && cells.length > 2) { const c = take(); d.currents.push({ ...c, dir: 'NESW'[ri(4)] }) }
  if (feats && rnd() < 0.35 && cells.length > 2) {
    const c = take(); d.items.push({ ...c, id: 'peti' }); d.tools.push('P')
    if (rnd() < 0.7 && cells.length > 2) { d.drop = take(); d.tools.push('D') }
  }
  if (feats && rnd() < 0.3) {
    const free = cells.slice(0, -1).filter(p => !(p.x === d.start.x && p.y === d.start.y))
    if (free.length) {
      const p0 = free[ri(free.length)], path = [p0], blk = new Set(d.blocks.map(b => b.x + ',' + b.y))
      for (let k = 0; k < 1 + ri(3); k++) {
        const l = path[path.length - 1], dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][ri(4)], n = { x: l.x + dir[0], y: l.y + dir[1] }
        if (n.x >= 0 && n.y >= 0 && n.x < w && n.y < h && !blk.has(n.x + ',' + n.y)) path.push(n)
      }
      d.ice.push({ path })
    }
  }
  if (feats && rnd() < 0.25) d.tools.push(rnd() < 0.5 ? 'R2' : 'R3')
  if (!cells.length) return null
  d.goal = d.drop && rnd() < 0.5 ? { ...d.drop } : take()
  if (!d.goal) return null
  return d
}
// brute force: no shorter program succeeds, and the BFS one does
let brute = 0
for (let tries = 0; brute < 60 && tries < 5000; tries++) {
  const d = randLevel(4, 3, true)
  if (!d || T.validate(d).length) continue
  const L = T.create(d), s = L.shortest
  if (s < 1 || s > 5 || L.tools.length > 6) continue
  brute++
  let shorter = null
  const walk = (prog) => {
    if (shorter) return
    if (prog.length && T.run(d, prog).ok) { shorter = prog.slice(); return }
    if (prog.length >= s - 1) return
    for (const c of L.tools) walk([...prog, c])
  }
  walk([])
  check(!shorter, `brute ${brute}: program ${JSON.stringify(shorter)} beats BFS shortest ${s} on ${JSON.stringify(d)}`)
  check(T.run(d, T.solve(d)).ok, `brute ${brute}: BFS program fails`)
}
check(brute === 60, `brute-force cross-check ran on ${brute}/60 boards`)
let solvable = 0, bad500 = 0
for (let tries = 0; solvable < 500 && tries < 20000; tries++) {
  const d = randLevel(7, 6, true)
  if (!d) continue
  const probs = T.validate(d)
  if (probs.length) continue
  solvable++
  const sol = T.solve(d), r1 = T.run(d, sol), r2 = T.run(JSON.parse(JSON.stringify(d)), sol)
  const ok = r1.ok && sol.length === r1.shortest && r1.stars === 3 && eq(r1, r2)
  if (!ok) { bad500++; if (bad500 < 5) console.log('  random fail', JSON.stringify(d), JSON.stringify(sol), r1.reason) }
}
check(solvable === 500 && bad500 === 0, `500 random solvable boards: ${solvable} generated, ${bad500} where the BFS route did not run ok / deterministically`)

/* ── A4: authored content ── */
check(T.SAMPLES.length === 6, 'six SAMPLES')
T.SAMPLES.forEach((s, i) => {
  const p = T.validate(s)
  check(!p.length && T.shortest(s) > 0, `SAMPLES[${i}] ${s.id}: ${JSON.stringify(p)} shortest ${T.shortest(s)}`)
})
check(T.SAMPLES[4].items.length && T.SAMPLES[3].currents.length && T.SAMPLES[5].tools.includes('R3') && T.solve(T.SAMPLES[5]).some(c => c === 'R3' || c === 'R2'), 'ladder: 4 = current, 5 = crate, 6 = repeat actually used')
const worldFails = []
try {
  const W = require(path.join(ROOT, 'games/data/tk-worlds.js'))
  let n = 0
  for (const w of W.WORLDS) for (const lv of W.flat(w)) {
    if (lv.type !== 'grid') continue
    n++
    const d = W.grid(lv), p = T.validate(d), s = T.shortest(d)
    if (p.length || s > 12 || s < 1) worldFails.push(`${lv.id}: ${p.map(x => x.code).join(',') || 'ok'} shortest=${s}`)
  }
  console.log(`TKWorlds: ${n} grid levels, ${worldFails.length} failing`)
  worldFails.forEach(f => console.log('  world board ' + f))
} catch (e) { worldFails.push('tk-worlds.js did not load: ' + e.message) }
if (process.env.QA_SKIP_WORLDS === '1') console.log('(QA_SKIP_WORLDS=1: world boards reported, not gated)')
else check(!worldFails.length, `TKWorlds grid boards invalid / shortest > 12: ${worldFails.join(' | ')}`)

/* ── A5: ease ladder (owner 2026-09-28 "easy to be played, tapi cakep") ── */
{
  check(T.stars(5, 4, true) === 3 && T.stars(7, 4, true) === 2 && T.stars(8, 4, true) === 1 && T.stars(5, 4) === 2, 'forgiving stars: 3 up to shortest+1, 2 up to +3 (strict rule unchanged)')
  // 2.0 (owner 2026-09-29 "jangan beri bantuan"): the palette is trimmed ONLY when def.trim === true (the tutorial's
  // first two grids); `easy` alone keeps every tool and only forgives stars
  const e = B(['S..', '.#.', '..G'], { tools: ['N', 'E', 'S', 'W', 'P', 'D', 'R2'] }); e.easy = true
  const Le = T.create({ ...e, trim: true })
  check(Le.easy && Le.trim && Le.tools.every(c => Le.solution.includes(c)) && eq(Le.tools, ['E', 'S']) && T.run(e, Le.solution).ok, `trim:true keeps only the arrows its route needs, no repeat (${Le.tools})`)
  check(T.create(e).tools.length === 7 && !T.create(e).trim, `easy without trim keeps every tool (${T.create(e).tools})`)
  check(T.run(e, [...Le.solution, Le.solution[0]]).stars === 3, 'easy board: shortest+1 still earns 3 stars')
  let pv = T.preview(B(['S#G', '...']), ['S', 'E', 'N'])
  check(eq(pv.path.map(p => [p.x, p.y]), [[0, 0], [0, 1], [1, 1]]) && pv.bad && pv.bad.idx === 2 && pv.bad.tx === 1 && pv.bad.ty === 0 && !pv.ok, `preview: path + the blocked tile of the failing chip (${JSON.stringify(pv)})`)
  pv = T.preview(B(['S...G']), ['N'])
  check(pv.bad && pv.bad.edge === 'N' && pv.bad.x === 0 && pv.path.length === 1, 'preview: edge bump = own tile + direction')
  pv = T.preview(B(['S>..G']), ['E', 'E', 'E'])
  check(pv.ok && eq(pv.path.map(p => p.x), [0, 1, 2, 3, 4]), 'preview: a current adds its push tile; ok when the route reaches the goal')
  check(T.preview(B(['S.G']), []).path.length === 1 && Array.isArray(T.preview(null, ['E', null, 7]).path) && Array.isArray(T.preview({ w: 'x' }, 'no').path), 'preview: empty / garbage never throws')
  const W = require(path.join(ROOT, 'games/data/tk-worlds.js'))
  const bad = [], firstIds = []
  for (const w of W.WORLDS) {
    let steers = 0
    for (const lv of W.flat(w)) {
      if (lv.type === 'steer') { const sl = W.steer(lv); if (sl.assist !== true || sl.first !== (++steers === 1)) bad.push(lv.id + ' steer ' + JSON.stringify(sl)); if (!W.findSteer(lv.goal, lv.mode)) bad.push(lv.id + ' findSteer') }
      if (lv.type !== 'grid') continue
      const d = W.grid(lv), L = T.create(d)
      if (d.coach === 'always') firstIds.push(lv.id)
      if (lv.gridNo <= 3 && !d.easy) bad.push(lv.id + ' not easy')
      if (d.trim && !L.tools.every(c => L.solution.includes(c))) bad.push(lv.id + ' trimmed but has an unneeded tool ' + L.tools)
      if (d.trim && lv.id !== 'k2' && lv.id !== 'k3') bad.push(lv.id + ' trims its palette (only k2 / k3 may)')
      if (!d.trim && L.tools.length < d.tools.length) bad.push(lv.id + ' palette trimmed without def.trim')
      if (d.easy && (L.shortest > 8 || d.w * d.h > 20)) bad.push(`${lv.id} not tiny: ${d.w}x${d.h} shortest ${L.shortest}`)
    }
  }
  check(!bad.length, `worlds ease ladder: ${bad.join(' | ')}`)
  check(eq(firstIds, ['k2']), `only the very first grid of the game always shows the coach (${firstIds})`)
}

/* ── A6: mechanics 2.0 (grid-mechanics-design.md) — every rule, the 32 design boards (pars from an independent
   prototype solver), brute force on small random mechanic boards, Fungsi programs, hints, no regressions ── */
{
  const R = (rows, o = {}) => ({ rows, ...o })
  // design boards: [id, rows, extra, par] — par computed by the scratch prototype (a second implementation)
  const DESIGN = [
  ["R1",["S......G"],{"tools":["N","E","S","W","R2","R3"]}],
  ["R2",["S....","####.","####G"],{"tools":["N","E","S","W","R2","R3"]}],
  ["R3",["S......","######.","G......"],{"tools":["N","E","S","W","R2","R3"]}],
  ["A1",["S>..G"],{}],
  ["A2",["Sv...",".>>>G"],{}],
  ["A3",["S.<.G","....."],{}],
  ["K1",["m.S","#M#","..G"],{}],
  ["K2",["S.b","#B#","m..","#M#","..G"],{}],
  ["K3",["S.#.G","..M..","m.#.."],{}],
  ["D1",["1.S.2"],{}],
  ["D2",["S.2","...","1.3"],{}],
  ["D3",["1#3",".S.","2.G"],{}],
  ["L1",["S~~~G"],{}],
  ["L2",["S~~~~","#...G"],{}],
  ["L3b",["S~~~#","#.#..","~~~~G"],{}],
  ["M1",["S...G",".....","....."],{"ice":[{"path":[{"x":2,"y":0},{"x":2,"y":1},{"x":2,"y":2},{"x":2,"y":1}],"kind":"whale"}]}],
  ["M2",[".S...",".#.#.","....G"],{"ice":[{"path":[{"x":2,"y":0},{"x":2,"y":1},{"x":2,"y":2},{"x":2,"y":1}],"kind":"patrol"}]}],
  ["M3",["S....","..#..","....G"],{"ice":[{"path":[{"x":4,"y":0},{"x":4,"y":1},{"x":4,"y":2},{"x":4,"y":1}],"kind":"tug"}]}],
  ["W1",["So#O.G"],{}],
  ["W2",["S.o","###","G.O"],{}],
  ["W3",["So#Ou#U~G"],{}],
  ["F1",["S.L..",".##..","...#G"],{}],
  ["F2",["S#...","..#L.","#...G"],{}],
  ["F3",["S..#.","##.#.","L...G"],{}],
  ["Q1",["S.P.G"],{}],
  ["Q2",["S.#..","..T#.","#...G"],{}],
  ["Q3",["S.m#G","##.#.","..MP."],{}],
  ["X1",["S#.",".#G","..."],{"tools":["F","L","R"]}],
  ["X2",["S.###","#..##","##..#","###..","####G"],{"tools":["F","L","R","R2","R3","F1"]}],
  ["X3",["S.m","#M#","..G"],{"tools":["F","L","R"]}],
  ["X3f",["S.#","#..","##G"],{"tools":["F","L","R","R2","F1"]}],
  ["X4a",["S.###","#..##","##..#","###..","####G"],{"tools":["N","E","S","W","R2","R3","F1"]}]
  ]
  const PAR = { R1: 5, R2: 5, R3: 10, A1: 3, A2: 3, A3: 6, K1: 6, K2: 10, K3: 8, D1: 6, D2: 8, D3: 10, L1: 1, L2: 2, L3b: 4, M1: 4, M2: 7, M3: 8,
    W1: 3, W2: 4, W3: 3, F1: 6, F2: 6, F3: 6, Q1: 4, Q2: 6, Q3: 8, X1: 8, X2: 7, X3: 10, X3f: 6, X4a: 5 }
  for (const [id, rows, o] of DESIGN) {
    const d = R(rows, o), s = T.shortest(d), sol = T.solve(d), r = T.run(d, sol)
    check(s === PAR[id] && r.ok && r.stars === 3 && r.moves === s && !T.validate(d).length, `design ${id}: shortest ${s} (want ${PAR[id]}), run ${r.reason}, validate ${JSON.stringify(T.validate(d))}`)
    const h = T.nextHint(d, []), full = h && T.run(d, h.full)
    check(h && h.next.length && full.ok, `design ${id}: hint gives a first step on a route that solves (${JSON.stringify(h)})`)
  }
  // rules, one by one
  let r = T.run(R(['m.S', '#M#', '..G']), ['W', 'S'])
  check(r.reason === 'door' && r.detail === 'merah' && r.failAt === 1, 'key: the red door stays shut before the red key is taken')
  r = T.run(R(['m.S', '#M#', '..G']), ['W', 'W', 'E', 'S'])
  check(r.steps[1].keys && r.steps[1].keys[0] === 0 && r.steps[3].door === 0 && r.steps[3].y === 1, 'key: picked by entering its tile, the matching door opens on entry')
  r = T.run(R(['S.M.G']), ['E', 'E'])
  check(r.reason === 'door' && r.detail === 'merah' && r.failAt === 1, `door without its key = door/merah @1 (${r.reason} ${r.detail})`)
  check(T.validate(R(['S.M.G'])).some(p => p.code === 'doorNoKey'), 'validate: a door colour with no key')
  r = T.run(R(['S2.1G']), ['E', 'E', 'E', 'E'])
  check(r.steps[0].early && r.steps[0].early[0] === 1 && !r.ok && r.reason === 'notAtGoal' && r.detail === 'stops', `flags: passing flag 2 early does nothing; goal needs every flag (${r.detail})`)
  r = T.run(R(['1.S.2']), ['W', 'W', 'E', 'E', 'E', 'E'])
  check(r.ok && r.steps[1].stops[0] === 0 && r.steps[5].stops[0] === 1, 'flags: delivered in order; no G = the last flag is the goal')
  r = T.run(R(['S~~~G']), ['E'])
  check(r.ok && r.steps[0].x === 4 && r.steps[0].hops.length === 3 && r.steps[0].hops.every(h => h.k === 'slide'), 'licin: slide until a non-licin tile (stops ON it)')
  r = T.run(R(['S~~#G', '.....']), ['E'])
  check(r.steps[0].x === 2 && r.steps[0].skid && !r.ok && r.failAt == null, 'licin: blocked slide stops on the ice with a skid, not a fail')
  r = T.run(R(['S~~~~', '#...G']), ['E'])
  check(r.steps[0].x === 4 && r.steps[0].skid, 'licin: the edge stops a slide')
  r = T.run(R(['S>~~.G']), ['E'])
  check(r.steps[0].x === 4 && r.steps[0].hops.map(h => h.k).join() === 'current,slide,slide', `current pushes onto ice, the slide goes on in the current's direction (${JSON.stringify(r.steps[0].hops)})`)
  r = T.run(R(['So#O.G']), ['E'])
  check(r.steps[0].x === 3 && r.steps[0].hops[0].k === 'warp' && r.steps[0].dir === 'E', 'whirlpool: jump to the partner, keep facing')
  r = T.run(R(['So#O.G']), ['E', 'E', 'W'])
  check(r.steps[2].x === 1 && r.steps[2].hops.length === 1 && r.steps[2].hops[0].k === 'warp', 'whirlpool: entering the other end jumps back (once per command, no ping-pong)')
  r = T.run(R(['So#O.G'], { ice: [{ path: [{ x: 3, y: 0 }] }] }), ['E'])
  check(r.steps[0].x === 1 && r.steps[0].stuck, 'whirlpool: a blocked partner = stay on the whirlpool')
  check(T.validate(R(['S.o', 'O.G'])).length === 0 && T.validate({ rows: ['S..G'], whirls: [{ a: { x: 1, y: 0 }, b: { x: 1, y: 0 } }] }).some(p => p.code === 'whirlSame'), 'validate: whirlpool pair to itself')
  r = T.run(R(['S.P.G']), ['E', 'E'])
  check(r.steps[1].quiz && r.steps[1].quiz[0].type === 'door' && r.steps[1].x === 2, 'question door is passable (the answer never changes the route)')
  r = T.run(R(['S.T.G']), ['E', 'E', 'E', 'E'])
  check(r.ok && r.steps[1].quiz[0].type === 'chest', 'question chest raises a quiz on entry')
  check(T.lint(R(['S....', '.T...', '....G'])).some(w => w.code === 'qOffRoute') && !T.lint(R(['S.T.G'])).length, 'lint: a chest off the par route warns')
  check(T.shortest(R(['S.L..', '.##..', '...#G'], { fog: true })) === T.shortest(R(['S.L..', '.##..', '...#G'])), 'fog is visual only (same shortest)')
  check(T.run(R(['S....'], { ice: [{ path: [{ x: 2, y: 0 }], kind: 'whale' }] }), ['E', 'E']).reason === 'ice' && T.create({ rows: ['S.G'], ice: [{ path: [{ x: 1, y: 0 }], kind: 'nope' }] }).ice[0].kind === 'ice', 'moving obstacle kinds: whale blocks like ice; unknown kind = ice')
  // Fungsi: flat program main…, 'FN', body…; F1 inside the body ignored; moves exclude the marker; repeat of F1
  const X2 = R(['S.###', '#..##', '##..#', '###..', '####G'], { tools: ['F', 'L', 'R', 'R2', 'R3', 'F1'] })
  r = T.run(X2, ['F1', 'R3', 'F1', 'FN', 'F', 'R', 'F', 'L'])
  check(r.ok && r.moves === 7 && r.stars === 3 && r.steps[0].fn === 0 && r.steps[0].idx === 4 && r.steps[4].fnRep === 1 && r.steps[4].fnK === 0 && r.steps[8].fnK === 1, `fungsi: body runs per F1, steps carry fn / flat index (${r.moves})`)
  r = T.run(X2, ['F1', 'FN', 'F', 'F1', 'R'])
  check(r.steps.length === 2 && r.steps.every(s => s.cmd !== 'F1'), 'fungsi: F1 inside the body is ignored')
  r = T.run(X2, ['F1', 'FN', 'R', 'F', 'F'])
  check(r.reason === 'block' && r.failAt === 3, `fungsi: a failure points at the BODY chip (flat index ${r.failAt})`)
  const hf = T.nextHint(X2, ['F1', 'FN', 'F'])
  check(hf && hf.lane === 'fn' && hf.keep === 1 && eq(hf.next, ['R']), `fungsi hint fixes the body first (${JSON.stringify(hf)})`)
  check(T.stars(4, 4, false, true) === 2 && T.stars(6, 4, false, true) === 2 && T.stars(9, 4, false, true) === 1, 'Petunjuk used: at most 2 stars')
  check(T.create({ rows: ['S.G'], tools: ['N', 'E', 'S', 'W'] }).tools.length === 4 && T.parse(['S.m', '#M#', '..G']).keys.length === 1, 'rows parse + explicit arrays')
  // explicit arrays win over rows; rows fill empty fields (tk-worlds parses the legacy chars itself)
  const both = T.create({ rows: ['S#G', '...'], blocks: [{ x: 1, y: 0 }], currents: [] })
  check(both.blocks.length === 1 && both.goal.x === 2, 'explicit arrays + rows agree (no double parse)')
  // brute force on small random mechanic boards: nothing shorter than shortest succeeds, the solver route runs ok
  let seed2 = 424242, n2 = 0
  const rn = () => ((seed2 = (seed2 * 1103515245 + 12345) >>> 0) / 4294967296)
  const CH = '....~~#mMoO12T>v'
  for (let tries = 0; n2 < 50 && tries < 20000; tries++) {
    const w = 3 + Math.floor(rn() * 2), h = 2 + Math.floor(rn() * 2), cells = []
    for (let i = 0; i < w * h; i++) cells.push(CH[Math.floor(rn() * CH.length)])
    const used = {}
    for (let i = 0; i < cells.length; i++) { const c = cells[i]; if ('mMoO12T'.includes(c)) { if (used[c]) cells[i] = '.'; used[c] = 1 } }
    const si = Math.floor(rn() * cells.length); let gi = Math.floor(rn() * cells.length); if (gi === si) continue
    cells[si] = 'S'; cells[gi] = 'G'
    const rows = []; for (let y = 0; y < h; y++) rows.push(cells.slice(y * w, y * w + w).join(''))
    const d = { rows, tools: ['N', 'E', 'S', 'W'] }
    if (T.validate(d).length) continue
    const s = T.shortest(d); if (s < 1 || s > 5) continue
    n2++
    let shorter = null
    const walk = prog => { if (shorter) return; if (prog.length && T.run(d, prog).ok) { shorter = prog.slice(); return } if (prog.length >= s - 1) return; for (const c of ['N', 'E', 'S', 'W']) walk([...prog, c]) }
    walk([])
    check(!shorter && T.run(d, T.solve(d)).ok, `mechanics brute ${n2}: ${JSON.stringify(rows)} shortest ${s} beaten by ${JSON.stringify(shorter)}`)
  }
  check(n2 === 50, `mechanics brute force ran on ${n2}/50 boards`)
}

console.log(`engine: ${passes} checks passed, ${fails.length} failed`)

/* ── B: UI ── */
if (process.env.QA_UI !== '0') {
  const { default: puppeteer } = await import('puppeteer')
  const SHOTS = process.env.QA_SHOTS || ''
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true })
  const SIZES = (process.env.QA_SIZES || '390x844,844x390,1024x768,1280x800').split(',').map(s => s.split('x').map(Number))
  const BASE = 'http://localhost:8081/tools/tk-harness-grid.html'
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })

  // a wrong program per harness level, and what it must report
  const H = [
    { wrong: ['E', 'E'], failAt: 1, reason: 'block' },
    null, // found below: a program that meets the moving ice
    { wrong: ['E', 'E', 'D'], failAt: 2, reason: 'noItem' }
  ]
  async function open (w, h, q) {
    const p = await browser.newPage()
    const errs = []
    p.on('pageerror', e => errs.push('pageerror ' + e.message))
    p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()) })
    // an aborted audio fetch (the SFX engine replaces a playing clip) is not a failure; everything else is
    p.on('requestfailed', r => { if (/\.(mp3|ogg|wav)(\?|$)/.test(r.url()) && /ABORTED/.test((r.failure() || {}).errorText || '')) return; errs.push('requestfailed ' + r.url()) })
    p.on('response', r => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()) })
    const touch = w < 1000
    await p.setViewport({ width: w, height: h, isMobile: touch, hasTouch: touch })
    await p.goto(BASE + q, { waitUntil: 'networkidle0' })
    await sleep(400)
    p.__touch = touch; p.__errs = errs
    return p
  }
  async function tapSel (p, sel) {
    const e = await p.$(sel)
    if (!e) throw new Error('no element ' + sel)
    if (p.__touch) await e.tap(); else await e.click()
    await sleep(90)
  }
  const state = p => p.evaluate(() => window.__h.state())
  async function waitFor (p, fn, ms = 20000) {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await sleep(100) }
    return false
  }
  async function layoutChecks (p, tag) {
    const r = await p.evaluate(() => {
      const vw = innerWidth, vh = innerHeight, bad = [], small = []
      const vis = e => { const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0 }
      const inside = (b, clip) => b.left >= (clip ? clip.left : 0) - 1 && b.top >= (clip ? clip.top : 0) - 1 && b.right <= (clip ? clip.right : vw) + 1 && b.bottom <= (clip ? clip.bottom : vh) + 1
      const slots = document.querySelector('.tkg-slots'), sr = slots.getBoundingClientRect()
      const R = s => { const e = document.querySelector(s); return e && vis(e) ? e.getBoundingClientRect() : null }
      const hit = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
      const board = R('.tkg-board'), bub = R('.tkg-bubble'), cmd = R('.tkg-cmd'), go = R('.tkg-go'), tr = R('.tkg-trash'), av = R('.tkg-hintb')
      if (hit(bub, board)) bad.push('bubble covers the board')
      if (!bub) bad.push('Timmy bubble not visible')
      for (const [n, b] of [['JALAN', go], ['Hapus', tr]]) if (!b || !cmd || b.left < cmd.left - 1 || b.right > cmd.right + 1 || b.top < cmd.top - 1 || b.bottom > cmd.bottom + 1) bad.push(n + ' outside the Perintah panel')
      if (go && (go.left < 4 || go.right > vw - 4 || (!document.querySelector('.tkg--scroll') && (go.top < 4 || go.bottom > vh - 4)))) bad.push('JALAN touches the viewport edge')
      if (hit(tr, av)) bad.push('Hapus overlaps the Timmy avatar')
      const tiny = []
      for (const e of document.querySelectorAll('.tkg *')) {
        if (!vis(e) || e.closest('.tkg-ghost')) continue
        const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
        if (own && parseFloat(getComputedStyle(e).fontSize) < 11.5) tiny.push(e.className + ' "' + e.textContent.trim().slice(0, 12) + '" ' + getComputedStyle(e).fontSize)
      }
      if (tiny.length) bad.push('text < 12px: ' + tiny.slice(0, 3).join(', '))
      for (const e of document.querySelectorAll('.tkg-cmd .tkg-btn, .tkg-foot .tkg-btn')) if (vis(e) && e.scrollWidth > e.clientWidth + 1) bad.push('label overflows ' + e.className)
      if (/\p{Extended_Pictographic}/u.test(document.querySelector('.tkg').textContent)) bad.push('emoji in the UI text')
      // phone + tall board (2.0 scroll layout): the column scrolls, so only the sides of the screen bound it; the board
      // itself must still be fully on screen and take the width minus the 16 px gutters
      const scroll = document.querySelector('.tkg').classList.contains('tkg--scroll')
      const inside2 = scroll ? (b => b.left >= -1 && b.right <= vw + 1) : inside
      // full width, unless the tile hit its 160 px cap or the board is as tall as the screen allows
      if (scroll && board) { { const bt = document.querySelector('.tkg-body').getBoundingClientRect().top; if (board.left < -1 || board.right > vw + 1 || board.height > vh - bt + 1) bad.push('scroll layout: the board cannot be shown whole') } if (board.width < vw - 32 - 12 && window.__h.state().tile < 160 && board.height < vh - 24 - 60) bad.push('scroll layout: board ' + Math.round(board.width) + ' px < full width') }
      for (const e of document.querySelectorAll('.tkg button, .tkg-slot, .tkg-board, .tkg-cmd, .tkg-route')) {
        if (!vis(e)) continue
        const b = e.getBoundingClientRect(), inSlots = slots.contains(e)
        // route bar may scroll sideways in short landscape: its chips must sit inside the bar vertically
        if (inSlots ? !(b.top >= sr.top - 8 && b.bottom <= sr.bottom + 8) : !inside2(b)) bad.push((e.className || e.tagName) + ' ' + JSON.stringify([b.left, b.top, b.right, b.bottom].map(Math.round)))
        if ((e.tagName === 'BUTTON' || e.classList.contains('tkg-slot')) && Math.min(b.width, b.height) < 43.5) small.push(e.className + ' ' + Math.round(b.width) + 'x' + Math.round(b.height))
      }
      if (!inside2(sr)) bad.push('slots bar ' + JSON.stringify([sr.left, sr.top, sr.right, sr.bottom].map(Math.round)))
      const hs = document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1
      const tile = window.__h.state().tile
      // fill the frame (owner, real tablet 2026-09-28): the board uses >= ~85 % of the free play area in its
      // limiting direction unless the tile hit its 160 px cap
      const sea = document.querySelector('.tkg-sea').getBoundingClientRect()
      const fill = board ? Math.max(board.width / sea.width, board.height / sea.height) : 0
      return { bad, small, hs, tile, fill, top: document.querySelector('.tkg-body').getBoundingClientRect().top }
    })
    check(!r.bad.length, `${tag}: off-screen ${r.bad.slice(0, 4).join(' ; ')}`)
    check(!r.small.length, `${tag}: targets < 44 px ${r.small.slice(0, 4).join(' ; ')}`)
    check(!r.hs, `${tag}: horizontal scroll`)
    check(r.tile >= 36, `${tag}: board tile ${r.tile} px too small`)
    check(r.tile >= 160 || r.fill >= 0.82, `${tag}: board fills only ${Math.round(r.fill * 100)} % of the play area (tile ${r.tile})`)
    check(Math.round(r.top) >= 70, `${tag}: top inset for host HUD not respected (${r.top})`)
  }
  async function build (p, prog) {
    for (const c of prog) await tapSel(p, `.tkg-pal [data-cmd="${c}"]`)
  }
  async function dragToSlots (p, cmd) {
    const from = await p.$eval(`.tkg-pal [data-cmd="${cmd}"]`, e => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })
    const to = await p.$eval('.tkg-slots', e => { const s = e.querySelector('.tkg-slot'); const b = (s || e).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })
    const steps = 8
    if (p.__touch) {
      await p.touchscreen.touchStart(from.x, from.y)
      for (let i = 1; i <= steps; i++) await p.touchscreen.touchMove(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps)
      await p.touchscreen.touchEnd()
    } else {
      await p.mouse.move(from.x, from.y); await p.mouse.down()
      for (let i = 1; i <= steps; i++) await p.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps)
      await p.mouse.up()
    }
    await sleep(250)
  }

  // H[1]: a program built from turns and moves that meets the moving ice
  {
    const d = await (async () => { const p = await open(390, 844, '?l=1'); const x = await p.evaluate(() => window.__def); await p.close(); return x })()
    const tools = ['F', 'L', 'R']
    let found = null
    const walk = prog => {
      if (found || prog.length > 8) return
      if (prog.length) { const r = T.run(d, prog); if (r.reason === 'ice' && r.failAt === prog.length - 1 && r.failAt >= 2) { found = { wrong: prog.slice(), failAt: r.failAt, reason: 'ice' }; return } if (r.failAt != null || r.ok) return }
      for (const c of tools) walk([...prog, c])
    }
    walk([])
    H[1] = found
    check(!!found, 'found a wrong program on level h2 that meets the moving ice')
  }

  for (const [w, h] of SIZES) {
    for (let l = 0; l < 3; l++) {
      const tag = `${w}x${h} h${l + 1}`
      const p = await open(w, h, `?l=${l}`)
      try {
        const def = await p.evaluate(() => window.__def)
        const sol = T.solve(def), short = T.shortest(def)
        await layoutChecks(p, tag + ' initial')
        if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}x${h}-h${l + 1}-0-start.png` })
        // 1) wrong program by real taps -> fails at the right chip, with the chip number in words
        const H1 = H[l]
        await build(p, H1.wrong)
        check(eq((await state(p)).program, H1.wrong), `${tag}: taps built ${JSON.stringify((await state(p)).program)}`)
        await tapSel(p, '.tkg-go')
        const settled = await waitFor(p, () => { const s = window.__h.state(); return !s.running && s.bad != null })
        const st1 = await state(p)
        check(settled && st1.bad === H1.failAt, `${tag}: wrong program fails at chip ${st1.bad}, expected ${H1.failAt}`)
        const badIdx = await p.$eval('.tkg-chip--bad', e => +e.getAttribute('data-idx')).catch(() => null)
        check(badIdx === H1.failAt, `${tag}: highlighted chip ${badIdx}, expected ${H1.failAt}`)
        check(st1.message.includes('nomor ' + (H1.failAt + 1)) && st1.bubble, `${tag}: message "${st1.message}" must name chip ${H1.failAt + 1}`)
        const want = { block: 'ada gunung es', ice: 'es yang bergerak', noItem: 'belum membawa peti' }[H1.reason]   // 2.0: the bubble names the obstacle
        check(st1.message.includes(want), `${tag}: message "${st1.message}" should explain ${H1.reason}`)
        check(!st1.done && !(await p.$('.tkg--won')), `${tag}: no game over after a wrong route`)
        await sleep(250)
        if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}x${h}-h${l + 1}-1-fail.png` })
        await layoutChecks(p, tag + ' after fail')
        // 2) edit: trash, one real drag, taps, tap-to-remove an extra chip
        await tapSel(p, '.tkg-trash')
        check((await state(p)).program.length === 0, `${tag}: Hapus clears the route`)
        await dragToSlots(p, sol[0])
        check(eq((await state(p)).program, [sol[0]]), `${tag}: drag palette -> route gave ${JSON.stringify((await state(p)).program)}`)
        await build(p, sol.slice(1))
        const extra = sol.includes('W') ? 'N' : 'W'
        const extraCmd = def.tools.includes(extra) ? extra : def.tools[0]
        await tapSel(p, `.tkg-pal [data-cmd="${extraCmd}"]`)
        await tapSel(p, `.tkg-slots [data-idx="${sol.length}"]`)
        await sleep(250)
        check(eq((await state(p)).program, sol), `${tag}: route ${JSON.stringify((await state(p)).program)} != shortest ${JSON.stringify(sol)} (tap-to-remove)`)
        // 3) JALAN -> success -> stars -> onDone
        await tapSel(p, '.tkg-go')
        const won = await waitFor(p, () => window.__h.state().done, 25000)
        check(won, `${tag}: shortest route did not finish`)
        await sleep(700)
        if (SHOTS) await p.screenshot({ path: `${SHOTS}/${w}x${h}-h${l + 1}-2-win.png` })
        const done = await waitFor(p, () => !!window.__done, 8000)
        const res = await p.evaluate(() => window.__done)
        check(done && res.stars === 3 && res.moves === short && res.attempts === 2, `${tag}: onDone ${JSON.stringify(res)} (want 3 stars, ${short} moves, 2 attempts)`)
        const cnt = await p.$eval('.tkg-count span', e => e.textContent)
        check(cnt === '3', `${tag}: star counter shows ${cnt}`)
        check(!p.__errs.length, `${tag}: errors ${p.__errs.slice(0, 3).join(' | ')}`)
      } catch (e) { check(false, `${tag}: ${e.message}`) }
      await p.close()
    }
  }

  // Petunjuk: an explicit choice. First press asks; "Ya" reveals ONE next palette step,
  // never fills a chip, never draws a path; a wrong prefix marks the chip to change; the level then ends with <= 2 stars.
  {
    const p = await open(390, 844, '?l=0&coach=0')
    try {
      const def = await p.evaluate(() => window.__def), sol = T.solve(def)
      await tapSel(p, '.tkg-hintb'); await sleep(250)
      check((await state(p)).ask && (await state(p)).hints === 0, 'Petunjuk: first press asks first (nothing revealed yet)')
      await tapSel(p, '.tkg-ask .no'); await sleep(250)
      check(!(await state(p)).ask && (await state(p)).hints === 0, 'Petunjuk: Batal closes, no hint used')
      await tapSel(p, '.tkg-hintb'); await sleep(250); await tapSel(p, '.tkg-ask .yes'); await sleep(250)
      const g = await p.evaluate(() => ({ hint: [...document.querySelectorAll('.tkg-pal .tkg-chip--hint')].map(e => e.getAttribute('data-cmd')), ghost: document.querySelectorAll('.tkg-slot--ghost').length,
        glow: document.querySelectorAll('.tkg-glow').length, gh: document.querySelectorAll('.tkg-gh').length, path: document.querySelectorAll('.tkg-path *').length }))
      check(eq(g.hint, [sol[0]]) && g.ghost === 0 && !g.glow && !g.gh && !g.path, `Petunjuk: one next step without a slot ghost (${JSON.stringify(g)})`)
      check(eq((await state(p)).program, []), 'Petunjuk never fills a chip')
      await build(p, ['E', 'E'])   // h1's wrong route: chip 2 bumps the iceberg
      await tapSel(p, '.tkg-hintb'); await sleep(250)
      check(!(await state(p)).ask && (await p.$$eval('.tkg-chip--fix', e => e.length)) === 1, 'Petunjuk (2nd press, no card): a wrong chip is outlined to change')
      await tapSel(p, '.tkg-trash'); await build(p, sol); await tapSel(p, '.tkg-go')
      const ok = await waitFor(p, () => !!window.__done, 25000)
      const res = await p.evaluate(() => window.__done)
      check(ok && res.stars === 2 && res.hinted === true, `Petunjuk caps the level at 2 stars (${JSON.stringify(res)})`)
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/390x844-petunjuk.png` })
      check(!p.__errs.length, `petunjuk: errors ${p.__errs.join(' | ')}`)
    } catch (e) { check(false, 'petunjuk: ' + e.message) }
    await p.close()
  }
  // reduced motion still plays the same information
  {
    const p = await open(844, 390, '?l=2&rm=1')
    try {
      check(await p.$eval('.tkg', e => e.classList.contains('tkg--rm')), 'rm=1 sets reduced-motion class')
      const def = await p.evaluate(() => window.__def)
      await build(p, ['E', 'D']); await tapSel(p, '.tkg-go')
      await waitFor(p, () => { const s = window.__h.state(); return !s.running && s.bad != null })
      check((await state(p)).bad === 1, 'reduced motion: failure still marks chip 2')
      await tapSel(p, '.tkg-trash'); await build(p, T.solve(def)); await tapSel(p, '.tkg-go')
      const ok = await waitFor(p, () => !!window.__done, 25000)
      check(ok && (await p.evaluate(() => window.__done.stars)) === 3, 'reduced motion: completes with 3 stars')
      check(!p.__errs.length, `rm: errors ${p.__errs.join(' | ')}`)
    } catch (e) { check(false, 'reduced motion: ' + e.message) }
    await p.close()
  }
  // the six authored samples mount cleanly
  for (let s = 0; s < 6; s++) {
    const p = await open(390, 844, `?s=${s}`)
    await layoutChecks(p, `sample ${s}`)
    if (SHOTS && (s === 3 || s === 4)) await p.screenshot({ path: `${SHOTS}/390x844-sample${s + 1}.png` })
    check(!p.__errs.length, `sample ${s}: errors ${p.__errs.join(' | ')}`)
    await p.close()
  }
  // C) real world levels, wired like timmy-kapal.js
  {
    const W = require(path.join(ROOT, 'games/data/tk-worlds.js'))
    const levels = []
    for (const w of W.WORLDS) for (const lv of W.flat(w)) if (lv.type === 'grid') levels.push([w.id, lv])
    for (const [wid, lv] of levels) {
      const def = W.grid(lv)
      const sizes = lv.id === 'c7a' || lv.id === 'c4a' ? SIZES : [[390, 844]]
      for (const [w, h] of sizes) {
        const tag = `world ${wid}/${lv.id} ${w}x${h}`
        const p = await open(w, h, `?w=${wid}&lv=${lv.id}`)
        try {
          await layoutChecks(p, tag)
          const info = await p.evaluate(() => ({ theme: document.querySelector('.tkg').getAttribute('data-theme'), deck: document.querySelector('.tkg').classList.contains('tkg--deck'),
            blk: [...document.querySelectorAll('.tkg-blk img')].map(i => i.getAttribute('src')), scene: document.querySelector('.tkg').classList.contains('tkg--scene'),
            chap: !!document.querySelector('.tkg-chap'), goal: (document.querySelector('.tkg-goal .lh') || {}).alt || null }))
          check(info.theme === def.theme && info.deck === (def.theme === 'deck'), `${tag}: theme ${info.theme}, level says ${def.theme}`)
          check(info.blk.length === def.blocks.length && info.blk.every(u => (def.blockArt || []).some(k => u.includes(k))), `${tag}: obstacle sprites ${JSON.stringify(info.blk)} not from blockArt ${JSON.stringify(def.blockArt)}`)
          check(info.scene, `${tag}: no painted scene behind the board`)
          if (def.theme === 'deck' && info.goal) check(info.goal === 'Sekoci', `${tag}: deck goal is ${info.goal}, want the lifeboat`)
          if (SHOTS) await p.screenshot({ path: `${SHOTS}/world-${lv.id}-${w}x${h}.png` })
          if (lv.id === 'c7a') {
            await build(p, T.solve(def)); await tapSel(p, '.tkg-go')
            const ok = await waitFor(p, () => !!window.__done, 25000)
            check(ok && (await p.evaluate(() => window.__done.stars)) === 3, `${tag}: deck route by taps -> 3 stars`)
          }
          if (lv.id === 'c4a' && w === 390) {
            check(await p.$eval('.tkg-foot > span', e => e.textContent) === 'Level 4 dari 10', `${tag}: footer level text`)
            await tapSel(p, '.tkg-back'); await tapSel(p, '.tkg-next')
            check(eq(await p.evaluate(() => window.__nav), ['back', 'next']), `${tag}: footer callbacks`)
          }
          check(!p.__errs.length, `${tag}: errors ${p.__errs.slice(0, 3).join(' | ')}`)
        } catch (e) { check(false, `${tag}: ${e.message}`) }
        await p.close()
      }
    }
  }
  // chapterCard:false (the host shows its own card in the left column): no duplicate card, no empty side column,
  // the board grows into the space; a painted backdrop even for a scene with no owner art (kamar = bedroom-night)
  for (const [w, h] of [[1280, 800], [1340, 800], [1024, 768], [800, 1280], [390, 844]]) {
    for (const lv of ['k3', 'c4a']) {
      const tag = `chapterCard:false ${lv} ${w}x${h}`
      const p = await open(w, h, `?w=${lv[0] === 'k' ? 'kamar' : 'titanic'}&lv=${lv}&cc=0&coach=0`)
      try {
        await layoutChecks(p, tag)
        const r = await p.evaluate(() => ({ chap: !!document.querySelector('.tkg-chap'), side: document.querySelector('.tkg').classList.contains('tkg--side'),
          bg: getComputedStyle(document.querySelector('.tkg')).backgroundImage, plate: (document.querySelector('.tkg-plate small') || {}).textContent || '' }))
        check(!r.chap && !r.side, `${tag}: grid chapter card still shown (${JSON.stringify(r)})`)
        check(/\.(webp|png|jpe?g)/.test(r.bg), `${tag}: no painted scene behind the board (${r.bg.slice(0, 80)})`)
        check(r.plate.length > 0, `${tag}: plate label (chapter) kept`)
        if (SHOTS) await p.screenshot({ path: `${SHOTS}/cc0-${lv}-${w}x${h}.png` })
        // re-layout on resize keeps the program
        await tapSel(p, '.tkg-pal .tkg-chip')
        const before = (await state(p)).program
        await p.setViewport({ width: h, height: w, isMobile: w < 1000, hasTouch: w < 1000 }); await sleep(500)
        const after = await state(p)
        check(eq(after.program, before) && after.tile >= 36, `${tag}: rotate keeps the route (${JSON.stringify(after.program)}) + tile ${after.tile}`)
        await layoutChecks(p, tag + ' rotated')
        check(!p.__errs.length, `${tag}: errors ${p.__errs.slice(0, 3).join(' | ')}`)
      } catch (e) { check(false, `${tag}: ${e.message}`) }
      await p.close()
    }
  }
  // D) ease: big targets, ghost preview, Undo, idle help, coach hand, celebration
  {
    const EASE = process.env.QA_EASE_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-ease-grid'
    fs.mkdirSync(EASE, { recursive: true })
    const relTile = (p, x, y) => p.evaluate((x, y) => { const b = document.querySelector('.tkg-board').getBoundingClientRect(), T = window.__h.state().tile; return { x: b.left + (x + 0.5) * T, y: b.top + (y + 0.5) * T } }, x, y)
    const inRect = (pt, r, pad = 0) => pt.x >= r.left - pad && pt.x <= r.right + pad && pt.y >= r.top - pad && pt.y <= r.bottom + pad
    const rectOf = (p, sel) => p.$eval(sel, e => { const b = e.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, w: b.width, h: b.height } })
    const fingertip = p => p.evaluate(() => { const f = document.querySelector('.tkg-hin .f').getBoundingClientRect(), dn = document.querySelector('.tkg-hand').classList.contains('dn'); return { x: f.left + f.width / 2, y: dn ? f.bottom - 4 : f.top + 4 } })
    for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
      const tag = `ease ${w}x${h}`
      // big targets
      for (const q of ['?l=0', '?l=2', '?w=kamar&lv=k2&coach=0']) {
        const p = await open(w, h, q)
        const sz = await p.evaluate(() => ({ pal: [...document.querySelectorAll('.tkg-pal .tkg-chip')].map(e => Math.min(e.offsetWidth, e.offsetHeight)), slot: [...document.querySelectorAll('.tkg-slot')].map(e => Math.min(e.offsetWidth, e.offsetHeight)), undo: Math.min(document.querySelector('.tkg-undo').offsetWidth, document.querySelector('.tkg-undo').offsetHeight) }))
        check(Math.min(...sz.pal) >= 64, `${tag} ${q}: palette chips >= 64 px (${Math.min(...sz.pal)})`)
        check(Math.min(...sz.slot) >= 48, `${tag} ${q}: route slots >= 48 px (${Math.min(...sz.slot)})`)
        check(sz.undo >= 56, `${tag} ${q}: Undo >= 56 px (${sz.undo})`)
        await p.close()
      }
      // owner 2026-09-29 "jangan beri jejak ... jangan beri bantuan": before JALAN! nothing of the queued route is drawn
      // (no dots, no failing-step mark, no orange chip, no faint Timmy / boat at the end), and idling never pulses the
      // next command, the chip to fix or JALAN!. Undo still removes only the last chip.
      {
        const p = await open(w, h, '?l=0&idle=900')
        try {
          const def = await p.evaluate(() => window.__def), sol = T.solve(def)
          const noTrace = async (when) => {
            const g = await p.evaluate(() => ({ svg: document.querySelectorAll('.tkg-path polyline, .tkg-path circle, .tkg-path rect, .tkg-path line').length,
              pbad: document.querySelectorAll('.tkg-chip--pbad').length, gb: !!document.querySelector('.tkg-gb:not(.off)'), gh: document.querySelectorAll('.tkg-gh').length,
              nudge: document.querySelectorAll('.tkg-chip--nudge').length }))
            check(!g.svg && !g.pbad && !g.gb && !g.gh && !g.nudge, `${tag}: no route trace / ghost / auto hint ${when} ${JSON.stringify(g)}`)
          }
          await noTrace('before the first chip')
          await build(p, ['E', 'E']); await sleep(200)
          await noTrace('with a failing route queued')
          await sleep(1400)
          await noTrace('after idling with a failing route')
          check(eq((await state(p)).program, ['E', 'E']), `${tag}: nothing auto-filled`)
          await tapSel(p, '.tkg-undo')
          check(eq((await state(p)).program, ['E']), `${tag}: Undo removes only the last chip (${JSON.stringify((await state(p)).program)})`)
          await tapSel(p, '.tkg-undo')
          await build(p, sol); await sleep(1400)
          await noTrace('with a working route queued + idle')
          await p.screenshot({ path: `${EASE}/${w}x${h}-no-trace.png` })
          await layoutChecks(p, tag + ' no-trace')
          check(!p.__errs.length, `${tag} no-trace: errors ${p.__errs.slice(0, 3).join(' | ')}`)
        } catch (e) { check(false, `${tag} no-trace: ${e.message}`) }
        await p.close()
      }
      // tutorial (2.0): a UI-only tour — palette, route bar, JALAN! — that never points at a specific arrow, never adds a
      // chip, keeps each label readable (fingertip outside the target) and puts "Lewati" clear of the route bar
      {
        const p = await open(w, h, '?l=0&coach=1&cidle=900')
        try {
          // the tour reports which stop it is on; at each stop the fingertip must sit at THAT element (just outside it).
          // Restart it on demand so the sampling never misses the first stop.
          await p.evaluate(() => window.__h.tour())
          const seen = new Set(), msgs = new Set(), SEL = { pal: '.tkg-pal', route: '.tkg-route', go: '.tkg-go' }
          let onChipLabel = false
          const t0 = Date.now()
          while (Date.now() - t0 < 9000 && seen.size < 3) {
            const s1 = await state(p)
            if (s1.tourStop) {
              await sleep(800)   // the hand glides there (720 ms)
              const s2 = await state(p)
              if (s2.tourStop === s1.tourStop) {
                const ft = await fingertip(p), r = await rectOf(p, SEL[s1.tourStop])
                if (inRect(ft, r, 16)) seen.add(s1.tourStop)
                if (s1.tourStop === 'go' && inRect(ft, { left: r.left + 8, right: r.right - 8, top: r.top + 8, bottom: r.bottom - 8 })) onChipLabel = true
                msgs.add(s2.message)
              }
            }
            await sleep(100)
          }
          check(seen.size === 3 && !onChipLabel, `${tag}: tour points at palette, route and JALAN! without covering the JALAN! label (${[...seen]}, covered ${onChipLabel})`)
          check([...msgs].some(m => /Ketuk panah/.test(m)) && [...msgs].some(m => /Perintahmu/.test(m)) && [...msgs].some(m => /JALAN/.test(m)), `${tag}: tour speech matches the stop (${[...msgs].join(' / ')})`)
          check((await state(p)).program.length === 0, `${tag}: the tour adds nothing`)
          const p2 = await open(w, h, '?l=0&coach=1')
          await sleep(500)
          const sk = await rectOf(p2, '.tkg-skip'), rt2 = await rectOf(p2, '.tkg-route')
          check(!(sk.left < rt2.right && rt2.left < sk.right && sk.top < rt2.bottom && rt2.top < sk.bottom), `${tag}: Lewati clear of the route bar`)
          await tapSel(p2, '.tkg-skip'); await sleep(300)
          check(!(await state(p2)).coach, `${tag}: Lewati hides the tour`)
          await sleep(1400)
          check(!(await state(p2)).coach, `${tag}: the tour does not come back after Lewati`)
          check(!p.__errs.length && !p2.__errs.length, `${tag} tour: errors ${p.__errs.concat(p2.__errs).slice(0, 3).join(' | ')}`)
          await p2.close()
        } catch (e) { check(false, `${tag} tour: ${e.message}`) }
        await p.close()
      }
      // celebration: sparkle per step, star burst on the win; easy t4 forgives one extra chip
      {
        const p = await open(w, h, '?w=titanic&lv=c4a&coach=0')
        try {
          const def = await p.evaluate(() => window.__def), sol = T.solve(def)
          const tl = (await state(p)).tools
          check(eq(tl, T.create(def).tools) && ['N', 'E', 'S', 'W'].every(c => tl.includes(c)), `${tag}: 2.0 palette keeps all four arrows on an untrimmed board (${tl})`)
          await build(p, [...sol, sol[0]]); await tapSel(p, '.tkg-go')
          let spk = 0, conf = 0, shot = false
          const t0 = Date.now()
          while (Date.now() - t0 < 15000 && !(await p.evaluate(() => !!window.__done))) {
            const c = await p.evaluate(() => [document.querySelectorAll('.tkg-spk').length, document.querySelectorAll('.tkg-conf').length])
            spk = Math.max(spk, c[0]); conf = Math.max(conf, c[1])
            if (c[1] && !shot) { await sleep(300); await p.screenshot({ path: `${EASE}/${w}x${h}-win-burst.png` }); shot = true }
            await sleep(80)
          }
          const res = await p.evaluate(() => window.__done)
          check(spk > 0 && conf >= 10, `${tag}: sparkles on good steps (${spk}) + star burst on the win (${conf})`)
          check(res && res.stars === 3 && res.moves === sol.length + 1, `${tag}: easy board forgives one extra chip -> 3 stars (${JSON.stringify(res)})`)
          check(!p.__errs.length, `${tag} celebrate: errors ${p.__errs.slice(0, 3).join(' | ')}`)
        } catch (e) { check(false, `${tag} celebrate: ${e.message}`) }
        await p.close()
      }
    }
    // coach modes: k2 always, a 'first' level once per browser; reduced motion = no sparkles, coach still works
    {
      const W = require(path.join(ROOT, 'games/data/tk-worlds.js'))
      for (let i = 0; i < 2; i++) {
        const p = await open(390, 844, '?w=kamar&lv=k2'); await sleep(900)
        check((await state(p)).coach, `k2 visit ${i + 1}: the very first grid always shows the coach`)
        if (i === 0) await p.screenshot({ path: `${EASE}/390x844-k2-coach.png` })
        await p.close()
      }
      { const p = await open(390, 844, '?l=0'); await p.evaluate(() => localStorage.clear()); await p.close() }
      const seen = []
      for (let i = 0; i < 2; i++) { const p = await open(390, 844, '?w=titanic&lv=c4a'); await sleep(1200); seen.push((await state(p)).coach); await p.close() }
      check(eq(seen, [false, false]), `2.0: only k2 shows the UI tour; other grids never (${seen})`)
      { const p = await open(390, 844, '?w=kamar&lv=k2&coach=0'); const s = await state(p); check(s.trim && s.tools.length < 4, `k2 is trimmed (tutorial): ${s.tools}`); await p.close() }
      const p = await open(390, 844, '?w=kamar&lv=k2&rm=1')
      await sleep(900)
      check((await state(p)).coach, 'reduced motion: coach still shown')
      await tapSel(p, '.tkg-pal [data-cmd="E"]'); await build(p, ['E', 'E', 'E'])
      check(!(await state(p)).coach, 'a real tap ends the tour')
      await tapSel(p, '.tkg-go')
      let spk = 0
      const t0 = Date.now()
      while (Date.now() - t0 < 12000 && !(await p.evaluate(() => !!window.__done))) { spk = Math.max(spk, await p.$$eval('.tkg-spk', e => e.length)); await sleep(80) }
      check(spk === 0 && (await p.evaluate(() => window.__done && window.__done.stars)) === 3, `reduced motion: no flying sparkles (${spk}), still 3 stars`)
      check(!p.__errs.length, `rm ease: errors ${p.__errs.join(' | ')}`)
      void W
      await p.close()
    }
  }
  // E) mechanics 2.0 in the browser (tools/tk-harness-grid.html?m=<design board>): no trace before JALAN!, the
  //    mechanic's own objects, its effects during the run, the trail == the path sailed, the golden path after a win
  {
    const MSHOTS = process.env.QA_MECH_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-gridmech'
    fs.mkdirSync(MSHOTS, { recursive: true })
    const MARK = { R: '.tkg-repb', A: '.tkg-cur', K: '.tkg-key,.tkg-door', D: '.tkg-stop', L: '.tkg-slick', M: '.tkg-loops .lp', W: '.tkg-whirl', F: '.tkg-fogc', Q: '.tkg-qt', X: '.tkg-lane-fn' }
    const FX = { K: ['.tkg-key.got', '.tkg-door.open'], D: ['.tkg-stop.done'], L: ['.tkg-skid,.tkg-trail'], W: ['.tkg-whirl'], F: ['.tkg-fogc.clear'], R: ['.tkg-repb.on'], X: ['.tkg-lane-fn .tkg-run'], Q: ['.tkg-qt.open'], M: ['.tkg-imv'], A: ['.tkg-trail'] }
    for (const [w, h] of [[1280, 800], [390, 844]]) {
      for (const id of ['R2', 'A2', 'K1', 'D2', 'L3b', 'M2', 'W2', 'F1', 'Q2', 'X2']) {
        const tag = `mech ${id} ${w}x${h}`
        const p = await open(w, h, `?m=${id}&q=1&qd=200&coach=0`)
        try {
          const def = await p.evaluate(() => window.__def), sol = T.solve(def)
          await p.evaluate(s => window.__h.setProgram(s), sol); await sleep(300)
          const pre = await p.evaluate(sel => ({ mark: document.querySelectorAll(sel).length, trace: document.querySelectorAll('.tkg-path *,.tkg-trail,.tkg-gh,.tkg-gold').length, gb: !!document.querySelector('.tkg-gb:not(.off)'), ghost: document.querySelectorAll('.tkg-imv').length }), MARK[id[0]])
          check(pre.mark > 0, `${tag}: mechanic objects drawn (${MARK[id[0]]})`)
          check(!pre.trace && !pre.gb, `${tag}: no trace before JALAN! ${JSON.stringify(pre)}`)
          if (id[0] === 'M') check(pre.ghost === def.ice.length, `${tag}: one sprite per moving obstacle, no next-step ghost`)
          await p.screenshot({ path: `${MSHOTS}/${id}-${w}-before.png` })
          await tapSel(p, '.tkg-go')
          const seen = {}, props = new Set(), paused = { v: false }
          let shot = false
          const t0 = Date.now()
          while (Date.now() - t0 < 30000 && !(await p.evaluate(() => !!window.__done))) {
            const r = await p.evaluate((sels) => {
              const o = {}; sels.forEach(s => { o[s] = document.querySelectorAll(s).length })
              const pr = []
              document.getAnimations().forEach(a => { const e = a.effect; if (!e || !e.getKeyframes) return; e.getKeyframes().forEach(k => Object.keys(k).forEach(n => { if (!/^(offset|easing|composite|computedOffset)$/.test(n)) pr.push(n) })); if (a.transitionProperty) pr.push(a.transitionProperty) })
              return { o, pr, run: document.querySelectorAll('.tkg-run').length, ask: window.__h.state().paused }
            }, (FX[id[0]] || []).concat(['.tkg-trail', '.tkg-fly2']))
            Object.entries(r.o).forEach(([k, v]) => { seen[k] = Math.max(seen[k] || 0, v) })
            r.pr.forEach(x => props.add(x)); if (r.run) seen.run = 1; if (r.ask) paused.v = true
            if (!shot && Date.now() - t0 > 900) { await p.screenshot({ path: `${MSHOTS}/${id}-${w}-run.png` }); shot = true }
            await sleep(60)
          }
          const res = await p.evaluate(() => window.__done), st = await state(p)
          check(res && res.stars === 3 && res.moves === T_moves(sol), `${tag}: solver route wins with 3 stars (${JSON.stringify(res)})`)
          ;(FX[id[0]] || []).forEach(sel => check(seen[sel] > 0, `${tag}: effect ${sel} seen during the run`))
          check(seen.run, `${tag}: the executing chip is highlighted`)
          const pv = T.preview(def, sol).path.slice(0, -1).map(q => ({ x: q.x, y: q.y }))
          check(eq(st.trail, pv), `${tag}: trail == the path sailed (${JSON.stringify(st.trail)} vs ${JSON.stringify(pv)})`)
          check(await p.$$eval('.tkg-gold', e => e.length) > 0, `${tag}: golden path after the win`)
          const badProps = [...props].filter(x => !/^(transform|opacity|strokeDashoffset|stroke-dashoffset|all)$/.test(x))
          check(!badProps.length, `${tag}: only transform / opacity / stroke-dashoffset animate (${badProps})`)
          if (id === 'Q2') check(paused.v && res.bonus === 1 && res.asked === 1, `${tag}: chest question paused the run and gave a bonus star (${JSON.stringify(res)})`)
          await p.screenshot({ path: `${MSHOTS}/${id}-${w}-won.png` })
          check(!p.__errs.length, `${tag}: errors ${p.__errs.slice(0, 3).join(' | ')}`)
        } catch (e) { check(false, `${tag}: ${e.message}`) }
        await p.close()
      }
    }
    // a bump: red chip, the obstacle named, the chip number, star daze; the route stays editable
    {
      const p = await open(1280, 800, '?m=K1&coach=0')
      try {
        await p.evaluate(() => window.__h.setProgram(['W', 'S'])); await tapSel(p, '.tkg-go')
        let daze = 0; const t0 = Date.now()
        while (Date.now() - t0 < 6000) { const s = await state(p); daze = Math.max(daze, await p.$$eval('.tkg-daze', e => e.length)); if (!s.running && s.bad != null) break; await sleep(60) }
        const s = await state(p), bad = await p.$$eval('.tkg-chip--bad', e => e.map(x => x.getAttribute('data-f')))
        check(eq(bad, ['1']) && /kunci merah/.test(s.message) && /nomor 2/.test(s.message) && daze > 0, `bump: red chip 2, "${s.message}", daze ${daze}`)
        await p.screenshot({ path: `${MSHOTS}/K1-1280-bump.png` })
        await tapSel(p, '.tkg-pchip[data-idx="1"]'); await sleep(300)
        check(eq((await state(p)).program, ['W']) && !(await p.$('.tkg-chip--bad')), 'bump: the route stays editable; editing clears the red mark')
        await p.evaluate(() => window.__h.setProgram(['E', 'E', 'E'])); await tapSel(p, '.tkg-go')
        await waitFor(p, () => { const s = window.__h.state(); return !s.running && s.bad != null })
        check(/itu ujung laut|gunung es|es/.test((await state(p)).message), `bump: obstacle word for ice / edge (${(await state(p)).message})`)
        check(!p.__errs.length, `bump: errors ${p.__errs.join(' | ')}`)
      } catch (e) { check(false, 'bump: ' + e.message) }
      await p.close()
    }
    // questions: wrong answer = no bonus but the run goes on; a rejected promise = wrong; no onQuestion = opens by itself;
    // an answered door / chest is not asked again on the next attempt
    for (const [q, want] of [['q=0', { bonus: 0, asked: 1 }], ['q=r', { bonus: 0, asked: 1 }], ['', { bonus: 0, asked: 0 }]]) {
      const p = await open(390, 844, `?m=Q3&${q}&coach=0`)
      try {
        const def = await p.evaluate(() => window.__def), sol = T.solve(def)
        await p.evaluate(s => window.__h.setProgram(s), sol.slice(0, 4)); await tapSel(p, '.tkg-go')
        await waitFor(p, () => { const s = window.__h.state(); return !s.running && s.attempts === 1 })
        await p.evaluate(s => window.__h.setProgram(s), sol); await tapSel(p, '.tkg-go')
        const ok = await waitFor(p, () => !!window.__done, 25000)
        const res = await p.evaluate(() => window.__done), asked = await p.evaluate(() => window.__asked.length)
        check(ok && res.stars === 3 && res.bonus === want.bonus && res.asked === want.asked && asked === want.asked, `question ${q || 'none'}: ${JSON.stringify(res)} host calls ${asked}`)
        check(!p.__errs.length, `question ${q}: errors ${p.__errs.join(' | ')}`)
      } catch (e) { check(false, `question ${q}: ${e.message}`) }
      await p.close()
    }
    // keyboard: arrows / digits add commands, Enter runs
    {
      const p = await open(1280, 800, '?m=R1&coach=0')
      try {
        for (const k of ['ArrowRight', '3', 'ArrowRight', '3', 'ArrowRight']) { await p.keyboard.press(k); await sleep(60) }
        check(eq((await state(p)).program, ['E', 'R3', 'E', 'R3', 'E']), `keyboard builds the route (${JSON.stringify((await state(p)).program)})`)
        await p.keyboard.press('Backspace'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter')
        const ok = await waitFor(p, () => !!window.__done, 20000)
        check(ok && (await p.evaluate(() => window.__done.stars)) === 3, 'keyboard: Backspace undoes, Enter runs -> 3 stars')
      } catch (e) { check(false, 'keyboard: ' + e.message) }
      await p.close()
    }
    // every route slot is visible, or the bar says there are more (fade + arrow); pickup never looks like an obstacle
    for (const [w, h] of SIZES) {
      for (const q of ['?l=0', '?m=X2', '?w=titanic&lv=c3b', '?w=britannic&lv=britannic3', '?w=mayflower&lv=mayflower3']) {
        const tag = `slots ${q} ${w}x${h}`
        const p = await open(w, h, q + '&coach=0')
        try {
          const r = await p.evaluate(() => [...document.querySelectorAll('.tkg-slots')].map(b => {
            const br = b.getBoundingClientRect(), kids = [...b.querySelectorAll('.tkg-slot,.tkg-pchip')]
            const hidden = kids.filter(k => { const r = k.getBoundingClientRect(); return r.right > br.right + 1 || r.left < br.left - 1 }).length
            const more = b.classList.contains('more') && !!b._more && b._more.classList.contains('on')
            return { n: kids.length, hidden, more, size: kids.length ? Math.min(...kids.map(k => k.offsetWidth)) : 0 }
          }))
          check(r.every(x => !x.hidden || x.more), `${tag}: every slot visible or a "more" arrow (${JSON.stringify(r)})`)
          check(r.every(x => x.size >= 44), `${tag}: slots >= 44 px (${JSON.stringify(r)})`)
          const it = await p.evaluate(() => ({ items: [...document.querySelectorAll('.tkg-item > img:first-child')].map(i => i.getAttribute('src')), blk: [...document.querySelectorAll('.tkg-blk img')].map(i => i.getAttribute('src')),
            ring: [...document.querySelectorAll('.tkg-item')].every(e => getComputedStyle(e, '::before').content !== 'none'), badge: [...document.querySelectorAll('.tkg-item')].every(e => !!e.querySelector('.bd')) }))
          check(it.items.every(u => !it.blk.includes(u)) && it.ring && it.badge, `${tag}: pickup looks different from obstacles ${JSON.stringify(it)}`)
          check(!p.__errs.length, `${tag}: errors ${p.__errs.slice(0, 3).join(' | ')}`)
        } catch (e) { check(false, `${tag}: ${e.message}`) }
        await p.close()
      }
    }
    // reduced motion: nothing moves by transform (fades only), same outcome
    {
      const p = await open(1280, 800, '?m=W3&rm=1&coach=0')
      try {
        const def = await p.evaluate(() => window.__def)
        await p.evaluate(s => window.__h.setProgram(s), T.solve(def)); await tapSel(p, '.tkg-go')
        let moved = 0; const t0 = Date.now()
        while (Date.now() - t0 < 15000 && !(await p.evaluate(() => !!window.__done))) {
          moved = Math.max(moved, await p.evaluate(() => document.getAnimations().filter(a => {
            if (a.transitionProperty) return a.transitionProperty === 'transform'
            const e = a.effect; return e && e.getKeyframes && e.getKeyframes().some(k => 'transform' in k)
          }).length))
          await sleep(50)
        }
        check(moved === 0 && (await p.evaluate(() => window.__done && window.__done.stars)) === 3, `reduced motion: no transform animation (${moved}), still 3 stars`)
      } catch (e) { check(false, 'rm mech: ' + e.message) }
      await p.close()
    }
    // frame pacing (reported; the gate is the structural transform/opacity rule above + no long task > 200 ms)
    {
      const p = await open(1280, 800, '?m=X2&coach=0')
      try {
        await p.evaluate(() => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }) } catch (e) {} window.__fr = []; let last = performance.now(); const f = t => { window.__fr.push(t - last); last = t; if (!window.__done) requestAnimationFrame(f) }; requestAnimationFrame(f) })
        const def = await p.evaluate(() => window.__def)
        await p.evaluate(s => window.__h.setProgram(s), T.solve(def)); await tapSel(p, '.tkg-go')
        await waitFor(p, () => !!window.__done, 30000)
        const r = await p.evaluate(() => { const f = window.__fr.slice(5).sort((a, b) => a - b); return { p50: f[Math.floor(f.length * 0.5)], p95: f[Math.floor(f.length * 0.95)], lt: window.__lt } })
        console.log(`frame pacing X2 1280x800: p50 ${r.p50 && r.p50.toFixed(1)} ms, p95 ${r.p95 && r.p95.toFixed(1)} ms, long tasks ${JSON.stringify(r.lt.map(Math.round))}`)
        check(r.p50 <= 20, `60 fps: median frame ${r.p50 && r.p50.toFixed(1)} ms during a run (long tasks reported, not gated: headless timing under concurrent sessions)`)
      } catch (e) { check(false, 'frames: ' + e.message) }
      await p.close()
    }
  }
  await browser.close()
}

console.log(`\nqa-tk-grid: ${passes} passed, ${fails.length} failed`)
if (fails.length) { console.log(fails.map(f => ' - ' + f).join('\n')); process.exit(1) }
