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
const DV = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
const DIRS = ['N', 'E', 'S', 'W']
const CMDS = ['N', 'E', 'S', 'W', 'F', 'L', 'R', 'P', 'D', 'R2', 'R3']
const REP = { R2: 2, R3: 3 }
const LIMIT = 40
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a }

function model (def) {
  const w = def.w, h = def.h, K = (x, y) => y * w + x
  const blk = new Set((def.blocks || []).map(b => K(b.x, b.y)))
  const cur = new Map((def.currents || []).map(c => [K(c.x, c.y), c.dir]))
  const items = (def.items || []).slice(0, 8)
  const itemAt = new Map(); items.forEach((it, i) => { const k = K(it.x, it.y); itemAt.set(k, (itemAt.get(k) || []).concat(i)) })
  const sws = (def.switches || []).slice(0, 8), swAt = new Map(), gate = new Map()
  sws.forEach((s, j) => { swAt.set(K(s.x, s.y), j); (s.opens || []).forEach(g => { const k = K(g.x, g.y); gate.set(k, (gate.get(k) || []).concat(j)) }) })
  const ice = (def.ice || []).map(o => o.path && o.path.length ? o.path : [o])
  let T = 1
  for (const p of ice) { T = T / gcd(T, p.length) * p.length; if (T > 240) { T = 0; break } }
  const goal = def.goal || (def.drop ? { x: def.drop.x, y: def.drop.y } : null)
  const all = (1 << items.length) - 1
  return { w, h, K, blk, cur, items, itemAt, swAt, gate, ice, T, goal, drop: def.drop || null, all, start: { x: def.start.x, y: def.start.y, dir: def.start.dir || 'E' } }
}
const inside = (M, x, y) => x >= 0 && y >= 0 && x < M.w && y < M.h
function blocked (M, x, y, sw) {
  const k = M.K(x, y)
  if (!M.blk.has(k) && !M.gate.has(k)) return false
  const g = M.gate.get(k)
  if (g) for (const j of g) if (sw & (1 << j)) return false
  return true
}
const iceOn = (M, x, y, t) => M.ice.some(p => { const q = p[t % p.length]; return q.x === x && q.y === y })
const press = (M, x, y, sw) => { const j = M.swAt.get(M.K(x, y)); return j == null ? sw : sw | (1 << j) }
function done (M, s) {
  if (!M.goal || s.x !== M.goal.x || s.y !== M.goal.y) return false
  if (!M.items.length) return true
  return M.drop ? s.dl === M.all : s.pk === M.all
}
// one command -> new state or null (bump / edge / ice / nothing to pick / wrong drop)
function step (M, s, c) {
  const n = { ...s }
  if (c === 'F' || DV[c]) {
    const md = c === 'F' ? s.dir : c, [dx, dy] = DV[md], nx = s.x + dx, ny = s.y + dy
    if (!inside(M, nx, ny) || blocked(M, nx, ny, s.sw) || iceOn(M, nx, ny, s.t)) return null
    n.x = nx; n.y = ny; n.dir = md; n.sw = press(M, nx, ny, n.sw)
    const cd = M.cur.get(M.K(nx, ny))
    if (cd) {
      const px = nx + DV[cd][0], py = ny + DV[cd][1]
      if (inside(M, px, py) && !blocked(M, px, py, n.sw) && !iceOn(M, px, py, s.t)) { n.x = px; n.y = py; n.sw = press(M, px, py, n.sw) }
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
const skey = (M, s) => [s.x, s.y, s.dir, M.T ? s.t % M.T : Math.min(s.t, 400), s.pk, s.dl, s.sw].join(',')
// shortest program (array of chips) with the given tools, or null
function solveWith (def, tools) {
  const M = model(def), s0 = { ...M.start, t: 0, pk: 0, dl: 0, sw: 0 }
  if (done(M, s0)) return []
  const base = tools.filter(c => !REP[c]), macros = base.map(c => ({ toks: [c], c, n: 1 }))
  tools.filter(c => REP[c]).forEach(r => base.forEach(c => macros.push({ toks: [r, c], c, n: REP[r] })))
  const best = new Map([[skey(M, s0), 0]]), buckets = [[{ s: s0, prog: [] }]]
  for (let cost = 0; cost <= LIMIT; cost++) {
    for (const node of buckets[cost] || []) {
      if (node.goal) return node.prog
      if (best.get(skey(M, node.s)) < cost) continue
      for (const m of macros) {
        let s = node.s, ok = true, reached = false
        for (let r = 0; r < m.n; r++) { s = step(M, s, m.c); if (!s) { ok = false; break } if (done(M, s)) { reached = true; break } }
        if (!ok) continue
        const nc = cost + m.toks.length
        if (nc > LIMIT) continue
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
  return { sol, tools, par: sol ? sol.length : -1 }
}
// run a program with the independent rules (repeat semantics as TKGrid.run): true when the goal is met
function runs (def, prog) {
  const M = model(def); let s = { ...M.start, t: 0, pk: 0, dl: 0, sw: 0 }, rep = 1
  if (done(M, s)) return true
  for (const c of prog) {
    if (REP[c]) { rep = REP[c]; continue }
    for (let k = 0; k < rep; k++) { s = step(M, s, c); if (!s) return false; if (done(M, s)) return true }
    rep = 1
  }
  return false
}

/* ── load the data ─────────────────────────────────────────────────── */
globalThis.window = globalThis
require(path.join(ROOT, 'games/data/asset-index.js'))
require(path.join(ROOT, 'games/data/tk-art.js'))
const TKW = require(path.join(ROOT, 'games/data/tk-worlds.js'))
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
const seen = new Map(), rows = [], counts = {}
for (const w of TKW.WORLDS) {
  const ids = w.levels.map(l => l.id), flat = TKW.flat(w)
  check(new Set(ids).size === ids.length && new Set(flat.map(l => l.id)).size === flat.length, `${w.id}: duplicate level / step ids`)
  ;(OLD_IDS[w.id] || '').split(' ').filter(Boolean).forEach(id => check(ids.includes(id), `${w.id}: old level id ${id} is gone (saves would lose it)`))
  const fr = w.levels.filter(l => l.fragment)
  if (w.id !== 'kamar' && w.id !== 'titanic') check(fr.length === 1 && w.levels[w.levels.length - 1].fragment, `${w.id}: the compass fragment must stay the LAST level`)
  counts[w.id] = 0
  for (const lv of flat) {
    if (lv.type !== 'grid') continue
    counts[w.id]++
    const def = TKW.grid(lv), isNew = !OLD_GRIDS.has(lv.id), tag = `${w.id}/${lv.id}`
    const r = solve(def), L = TKG.create(def), b = lv.board
    rows.push({ w: w.id, id: lv.id, title: lv.title, size: def.w + 'x' + def.h, par: r.par, maxLen: L.maxLen, easy: !!def.easy, isNew, tools: r.tools.join(''), items: def.items.length, ice: def.ice.length, cur: def.currents.length })
    check(r.par > 0, `${tag}: unsolvable`)
    check(r.par === L.shortest, `${tag}: solver shortest ${r.par} != TKGrid.shortest ${L.shortest}`)
    check(JSON.stringify(r.tools) === JSON.stringify(L.tools), `${tag}: tools ${r.tools} != TKGrid tools ${L.tools}`)
    if (isNew) check(b.par != null, `${tag}: new level has no par`)
    if (b.par != null) check(b.par === r.par, `${tag}: par ${b.par} but the true shortest is ${r.par}`)
    check(L.maxLen >= r.par + SLACK, `${tag}: maxLen ${L.maxLen} < par ${r.par} + ${SLACK}`)
    check(!TKG.validate(def).length, `${tag}: TKGrid.validate ${JSON.stringify(TKG.validate(def))}`)
    if (r.sol) {
      check(runs(def, r.sol), `${tag}: solver route does not run under the solver's own rules`)
      const res = TKG.run(def, r.sol)
      check(res.ok && res.moves === r.par && res.stars === 3, `${tag}: TKGrid.run(solver route) ok=${res.ok} moves=${res.moves} stars=${res.stars} ${res.reason || ''}`)
      if (r.par <= 7) {       // brute force: no program of par-1 chips over the child's tools reaches the goal
        let found = null
        const rec = (p) => { if (found) return; if (p.length === r.par - 1) { if (runs(def, p)) found = p.slice(); return } for (const c of r.tools) { p.push(c); rec(p); p.pop() } }
        rec([])
        check(!found, `${tag}: a ${r.par - 1}-chip program ${found} also works (par is not minimal)`)
      }
    }
    if (isNew) {
      check(!!lv.goal && !!lv.title && !!lv.fact, `${tag}: new level needs title, mission line (goal) and fact`)
      check(lv.story && lv.story.length === 1, `${tag}: new level needs its one-panel scenario intro`)
      if (def.easy) check(def.w * def.h <= 20 && r.par <= 8, `${tag}: easy board must stay tiny (${def.w}x${def.h}, par ${r.par})`)
      else check(def.w >= 5 && def.h >= 5 && r.par >= 8 && r.par <= 12 && (def.blocks.length > 0), `${tag}: later board must be 5x5..6x6 with obstacles, par 8..12 (${def.w}x${def.h}, par ${r.par})`)
    }
    const sig = JSON.stringify([b.rows, b.dir, def.tools, def.ice])
    check(!seen.has(sig), `${tag}: identical board to ${seen.get(sig)}`)
    seen.set(sig, tag)
    const keys = [].concat(def.blockArt || [], def.itemArt ? [def.itemArt] : [], ...(lv.story || []).map(p => (p.layers || []).map(l => l.k)))
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
}
for (const [w, n] of Object.entries(counts)) check(n >= (w === 'titanic' ? 5 : 3), `${w}: only ${n} grid levels`)
const nNew = rows.filter(r => r.isNew).length
check(nNew >= 28, `only ${nNew} new grid levels`)

if (process.argv.includes('--list') || fails.length) {
  console.log('world       id           size  par max easy tools     it ice cur  title')
  for (const r of rows) console.log(`${r.w.padEnd(11)} ${r.id.padEnd(12)} ${r.size.padEnd(5)} ${String(r.par).padStart(3)} ${String(r.maxLen).padStart(3)} ${r.easy ? 'yes ' : 'no  '} ${r.tools.padEnd(9)} ${r.items}  ${r.ice}   ${r.cur}   ${r.isNew ? '+ ' : '  '}${r.title}`)
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
