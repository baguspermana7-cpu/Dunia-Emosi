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
  for (const w of W.WORLDS) for (const lv of (w.levels || [])) {
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
    p.on('requestfailed', r => errs.push('requestfailed ' + r.url()))
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
      if (go && (go.left < 4 || go.top < 4 || go.right > vw - 4 || go.bottom > vh - 4)) bad.push('JALAN touches the viewport edge')
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
      for (const e of document.querySelectorAll('.tkg button, .tkg-slot, .tkg-board, .tkg-cmd, .tkg-route')) {
        if (!vis(e)) continue
        const b = e.getBoundingClientRect(), inSlots = slots.contains(e)
        // route bar may scroll sideways in short landscape: its chips must sit inside the bar vertically
        if (inSlots ? !(b.top >= sr.top - 8 && b.bottom <= sr.bottom + 8) : !inside(b)) bad.push((e.className || e.tagName) + ' ' + JSON.stringify([b.left, b.top, b.right, b.bottom].map(Math.round)))
        if ((e.tagName === 'BUTTON' || e.classList.contains('tkg-slot')) && Math.min(b.width, b.height) < 43.5) small.push(e.className + ' ' + Math.round(b.width) + 'x' + Math.round(b.height))
      }
      if (!inside(sr)) bad.push('slots bar ' + JSON.stringify([sr.left, sr.top, sr.right, sr.bottom].map(Math.round)))
      const hs = document.documentElement.scrollWidth > vw + 1 || document.body.scrollWidth > vw + 1
      const tile = window.__h.state().tile
      return { bad, small, hs, tile, top: document.querySelector('.tkg-body').getBoundingClientRect().top }
    })
    check(!r.bad.length, `${tag}: off-screen ${r.bad.slice(0, 4).join(' ; ')}`)
    check(!r.small.length, `${tag}: targets < 44 px ${r.small.slice(0, 4).join(' ; ')}`)
    check(!r.hs, `${tag}: horizontal scroll`)
    check(r.tile >= 36, `${tag}: board tile ${r.tile} px too small`)
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
        const want = { block: 'es di depan', ice: 'es yang bergerak', noItem: 'belum membawa peti' }[H1.reason]
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

  // hint ladder (portrait, level 1)
  {
    const p = await open(390, 844, '?l=0')
    try {
      await tapSel(p, '.tkg-hintb')
      check(!!(await p.$('.tkg-glow')) && !!(await p.$('.tkg-pal .tkg-chip--hint')), 'hint 1: goal glows + next command glows')
      const nextCmd = await p.$eval('.tkg-pal .tkg-chip--hint', e => e.getAttribute('data-cmd'))
      await sleep(200); await tapSel(p, '.tkg-hintb')
      check(eq((await state(p)).program, [nextCmd]), `hint 2 fills the next command (${JSON.stringify((await state(p)).program)})`)
      await sleep(200); await tapSel(p, '.tkg-hintb'); await sleep(600)
      const ghosts = await p.$$eval('.tkg-gh.on', e => e.length)
      check(ghosts >= 3, `hint 3 shows a ghost path (${ghosts} dots)`)
      if (SHOTS) await p.screenshot({ path: `${SHOTS}/390x844-hint3.png` })
      check(!p.__errs.length, `hint: errors ${p.__errs.join(' | ')}`)
    } catch (e) { check(false, 'hint ladder: ' + e.message) }
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
    for (const w of W.WORLDS) for (const lv of (w.levels || [])) if (lv.type === 'grid') levels.push([w.id, lv])
    for (const [wid, lv] of levels) {
      const def = W.grid(lv)
      const sizes = lv.id === 't10' || lv.id === 't4' ? SIZES : [[390, 844]]
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
          if (lv.id === 't10') {
            await build(p, T.solve(def)); await tapSel(p, '.tkg-go')
            const ok = await waitFor(p, () => !!window.__done, 25000)
            check(ok && (await p.evaluate(() => window.__done.stars)) === 3, `${tag}: deck route by taps -> 3 stars`)
          }
          if (lv.id === 't4' && w === 390) {
            check(await p.$eval('.tkg-foot > span', e => e.textContent) === 'Level 4 dari 13', `${tag}: footer level text`)
            await tapSel(p, '.tkg-back'); await tapSel(p, '.tkg-next')
            check(eq(await p.evaluate(() => window.__nav), ['back', 'next']), `${tag}: footer callbacks`)
          }
          check(!p.__errs.length, `${tag}: errors ${p.__errs.slice(0, 3).join(' | ')}`)
        } catch (e) { check(false, `${tag}: ${e.message}`) }
        await p.close()
      }
    }
  }
  await browser.close()
}

console.log(`\nqa-tk-grid: ${passes} passed, ${fails.length} failed`)
if (fails.length) { console.log(fails.map(f => ' - ' + f).join('\n')); process.exit(1) }
