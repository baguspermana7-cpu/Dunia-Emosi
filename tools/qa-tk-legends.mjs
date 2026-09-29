// G30 Timmy & Kapal Legendaris — gate for the "Kapal Legenda baru" worlds (games/data/tk-worlds-legends.js, PRD v2 §14).
//   A) node only:
//      - load order: tk-worlds.js + tk-worlds-legends.js: the 15 existing worlds keep their ids AND indexes (the host keys
//        unlock order + saveLevelProgress by index), the new worlds come after them, nothing is added twice on a re-load;
//      - schema: every new world has the fields a normal world has (id name ship year value cat color scene captain cards
//        levels) plus spec; level ids unique; one fragment level and it is the LAST; per type the fields its player reads
//        (quiz: domain count · sort: domain + a sort set for the world (TKQuiz.sortSet resolves it) · grid: board ·
//        steer: mode vessel · lanes: difficulty sections · story: panels); every scene is a TKArt scene;
//      - grid boards: an INDEPENDENT solver (same rules as tools/qa-tk-grid-levels.mjs: N/E/S/W/F/L/R, P/D, R2/R3,
//        currents push one tile, moving ice ticks per command) proves each board solvable, par == the true shortest ==
//        TKGrid.shortest, maxLen >= par + 2, TKGrid.run(route) = ok + 3 stars, TKGrid.validate clean, and no program one
//        chip shorter than par exists (brute force when par <= 8);
//      - sprites: every key (panels, blockArt, itemArt, sort sprites, question visuals, guideArt, thumb, isle, stand-in
//        ships) is in the AssetIndex or a TKArt placeholder; ship/<id> resolves through TKArt.OVERRIDE; no lady-hat / maid;
//      - words: no banned word in any text (tenggelam karam tewas meninggal korban perang tempur torpedo senjata bom
//        bencana mati), no emoji; every mission line (goal) <= 12 words; quiz goals name no ship, place or year;
//        curated questions: answer among the choices, prompt <= 10 words.
//   B) puppeteer (QA_UI=0 skips): games/timmy-kapal.html with tk-worlds-legends.js (hosted by the page's script tag,
//      else injected after tk-questions.js via request interception), at 1280x800 and 390x844: every level of every new world
//      is started through __tk.start and played (story Lewati · quiz right answers · sort targets · grid solution
//      via setProgram + JALAN · steer autopilot · lanes autopilot) to the reward screen; stars saved per level; the last
//      level adds the world's fragment; no page errors / failed requests; no failure words.
//      Screenshots (1280x800): each world's level map + one level of every mode -> QA_SHOTS (default scratchpad/tk-legends).
// Usage: node tools/qa-tk-legends.mjs     (needs http://localhost:8081 serving the repo root for part B)
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const URL = process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'
const SHOTS = process.env.QA_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-legends'
const LEGENDS = path.join(ROOT, 'games/data/tk-worlds-legends.js')
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL ' + msg) } }

/* ── independent grid solver (rules of TKGrid, written without calling tk-grid.js) ── */
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
  const items = (def.items || []).slice(0, 8), itemAt = new Map()
  items.forEach((it, i) => { const k = K(it.x, it.y); itemAt.set(k, (itemAt.get(k) || []).concat(i)) })
  const ice = (def.ice || []).map(o => o.path && o.path.length ? o.path : [o])
  let T = 1
  for (const p of ice) { T = T / gcd(T, p.length) * p.length; if (T > 240) { T = 0; break } }
  const goal = def.goal || (def.drop ? { x: def.drop.x, y: def.drop.y } : null)
  return { w, h, K, blk, cur, items, itemAt, ice, T, goal, drop: def.drop || null, all: (1 << items.length) - 1, start: { x: def.start.x, y: def.start.y, dir: def.start.dir || 'E' } }
}
const inside = (M, x, y) => x >= 0 && y >= 0 && x < M.w && y < M.h
const iceOn = (M, x, y, t) => M.ice.some(p => { const q = p[t % p.length]; return q.x === x && q.y === y })
function done (M, s) {
  if (!M.goal || s.x !== M.goal.x || s.y !== M.goal.y) return false
  if (!M.items.length) return true
  return M.drop ? s.dl === M.all : s.pk === M.all
}
function step (M, s, c) {
  const n = { ...s }
  if (c === 'F' || DV[c]) {
    const md = c === 'F' ? s.dir : c, nx = s.x + DV[md][0], ny = s.y + DV[md][1]
    if (!inside(M, nx, ny) || M.blk.has(M.K(nx, ny)) || iceOn(M, nx, ny, s.t)) return null
    n.x = nx; n.y = ny; n.dir = md
    const cd = M.cur.get(M.K(nx, ny))
    if (cd) { const px = nx + DV[cd][0], py = ny + DV[cd][1]; if (inside(M, px, py) && !M.blk.has(M.K(px, py)) && !iceOn(M, px, py, s.t)) { n.x = px; n.y = py } }
  } else if (c === 'L' || c === 'R') n.dir = DIRS[(DIRS.indexOf(s.dir) + (c === 'L' ? 3 : 1)) % 4]
  else if (c === 'P') { const got = (M.itemAt.get(M.K(s.x, s.y)) || []).find(i => !(s.pk & (1 << i))); if (got == null) return null; n.pk = s.pk | (1 << got) }
  else if (c === 'D') { const carry = s.pk & ~s.dl; if (!carry || !M.drop || M.drop.x !== s.x || M.drop.y !== s.y) return null; n.dl = s.dl | carry }
  else return null
  n.t = s.t + 1
  if (iceOn(M, n.x, n.y, n.t)) return null
  return n
}
const skey = (M, s) => [s.x, s.y, s.dir, M.T ? s.t % M.T : Math.min(s.t, 400), s.pk, s.dl].join(',')
function solveWith (def, tools) {
  const M = model(def), s0 = { ...M.start, t: 0, pk: 0, dl: 0 }
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
        const nc = cost + m.toks.length; if (nc > LIMIT) continue
        const nn = { s, prog: node.prog.concat(m.toks) }
        if (reached) { nn.goal = true; (buckets[nc] = buckets[nc] || []).push(nn); continue }
        const k = skey(M, s); if (best.has(k) && best.get(k) <= nc) continue
        best.set(k, nc); (buckets[nc] = buckets[nc] || []).push(nn)
      }
    }
  }
  return null
}
function solve (def) {
  let tools = CMDS.filter(c => (def.tools || []).includes(c))
  if (!tools.length) { tools = ['N', 'E', 'S', 'W']; if ((def.items || []).length) { tools.push('P'); if (def.drop) tools.push('D') } }
  let sol = solveWith(def, tools)
  if (def.easy && sol && def.trim === true && sol.some(c => REP[c])) { const plain = tools.filter(c => !REP[c]), s2 = solveWith(def, plain); if (s2 && s2.length <= 12) { sol = s2; tools = plain } }
  if (def.easy && sol && def.trim === true) { const need = tools.filter(c => sol.includes(c)); if (need.length) tools = need }
  return { sol, tools, par: sol ? sol.length : -1 }
}
function runs (def, prog) {
  const M = model(def); let s = { ...M.start, t: 0, pk: 0, dl: 0 }, rep = 1
  if (done(M, s)) return true
  for (const c of prog) {
    if (REP[c]) { rep = REP[c]; continue }
    for (let k = 0; k < rep; k++) { s = step(M, s, c); if (!s) return false; if (done(M, s)) return true }
    rep = 1
  }
  return false
}

/* ── A: node checks ─────────────────────────────────────────────────── */
globalThis.window = globalThis
require(path.join(ROOT, 'games/data/asset-index.js'))
require(path.join(ROOT, 'games/data/tk-art.js'))
const TKW = require(path.join(ROOT, 'games/data/tk-worlds.js'))
require(path.join(ROOT, 'games/data/tk-questions.js'))
for (const f of ['soal-engine', 'soal-gen-matematika', 'soal-pack-kapal']) require(path.join(ROOT, 'games/data/' + f + '.js'))   // SoalEngine (tk-quiz draws every question from it)
require(path.join(ROOT, 'games/tk-quiz.js'))
const TKG = require(path.join(ROOT, 'games/tk-grid.js'))
const before = TKW.WORLDS.map(w => w.id)
const LEG = require(LEGENDS)
const AI = globalThis.AssetIndex, ART = globalThis.TKArt, TKQ = globalThis.TKQuiz, BANK = globalThis.TKQuestions
const NEW = LEG.WORLDS
const OLD = 'kamar titanic britannic vasa cuttysark victory mayflower endurance kontiki calypso queenmary arizona missouri nautilus pelabuhan'.split(' ')

check(JSON.stringify(before) === JSON.stringify(OLD), `tk-worlds.js still has the 15 worlds in order (${before.join(' ')})`)
check(JSON.stringify(TKW.WORLDS.slice(0, OLD.length).map(w => w.id)) === JSON.stringify(OLD), 'existing worlds keep their indexes (new worlds only appended)')
check(TKW.WORLDS.length === OLD.length + NEW.length && NEW.every((w, i) => TKW.WORLDS[OLD.length + i] === w), `the ${NEW.length} new worlds follow Pelabuhan Waktu (${TKW.WORLDS.slice(OLD.length).map(w => w.id).join(' ')})`)
delete require.cache[LEGENDS]; require(LEGENDS)
check(TKW.WORLDS.length === OLD.length + NEW.length, 'a second load of tk-worlds-legends.js adds nothing')
check(new Set(TKW.WORLDS.map(w => w.id)).size === TKW.WORLDS.length, 'world ids unique')
check(NEW.every(w => TKW.get(w.id) === w), 'TKWorlds.get finds every new world')

const sceneOk = s => !!s && (s in ART.SCENE_ART || s in ART.scenes)
const keyOk = k => typeof k === 'string' && !!k && !/lady-hat|\/maid$/.test(k) && (
  (/^ship\//.test(k) && !!ART.OVERRIDE[k] && fs.existsSync(path.join(ROOT, ART.OVERRIDE[k]))) || /^fx\//.test(k) || !!AI.path(k) || /^char\/(timmy|timmy-sleeping|timmy-flying|captain|penguin|guide)$/.test(k))
const BANNED = /\b(tenggelam|karam|tewas|meninggal|korban|perang|tempur|torpedo|senjata|bom|bencana|mati)(nya|kan|lah|an)?\b/i
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u
const QUIZ_NAMES = /Titanic|Carpathia|Republic|Baltic|Florida|Erebus|Terror|Celeste|Dei Gratia|Mary Rose|Queen Anne|Blackbeard|HMS|RMS|SS |New York|Gibraltar|Portsmouth|Carolina|Nantucket|\b1[5-9]\d\d\b|\b20\d\d\b|sejarah/i
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
function strings (o, out = [], seen = new Set()) {
  if (typeof o === 'string') out.push(o)
  else if (o && typeof o === 'object' && !seen.has(o)) { seen.add(o); for (const k of Object.keys(o)) strings(o[k], out, seen) }
  return out
}
const TYPES = new Set(['story', 'quiz', 'sort', 'grid', 'steer', 'lanes'])
const rows = []
for (const w of NEW) {
  const tag = w.id
  for (const f of ['id', 'name', 'ship', 'value', 'cat', 'color', 'scene', 'captain', 'cards', 'levels', 'spec']) check(w[f] != null, `${tag}: has ${f}`)
  check(typeof w.year === 'number', `${tag}: year is a number`)
  check(TKW.CATS.some(c => c[0] === w.cat), `${tag}: category ${w.cat} is a filter chip`)
  check(sceneOk(w.scene), `${tag}: world scene ${w.scene} is a TKArt scene`)
  check(w.captain && w.captain.name && w.captain.quote, `${tag}: guide name + quote`)
  check(w.cards.length === 3 && w.cards.every(c => c.id && c.title && c.text), `${tag}: 3 history cards`)
  check(w.spec && w.spec.type && w.spec.length && w.spec.famous && w.spec.quote, `${tag}: spec for the ship detail panel`)
  check(Array.isArray(w.legend) && w.legend.length >= 1, `${tag}: linked to its ship-picker slug(s)`)
  check(keyOk(w.ship), `${tag}: ship art ${w.ship} -> ${ART.OVERRIDE[w.ship]}`)
  for (const k of [w.guideArt, w.thumb, w.isle, w.fragmentArt, LEG.STANDIN[w.id]]) check(keyOk(k), `${tag}: sprite ${k}`)
  const ids = w.levels.map(l => l.id)
  check(new Set(ids).size === ids.length, `${tag}: level ids unique`)
  check(w.levels.length === 6, `${tag}: 6 levels (${w.levels.length})`)
  const fr = w.levels.filter(l => l.fragment)
  check(fr.length === 1 && w.levels[w.levels.length - 1].fragment, `${tag}: one fragment level, the last one`)
  check(w.levels[0].type === 'story', `${tag}: level 1 is the time-travel story`)
  const modes = new Set(w.levels.map(l => l.type)); check(modes.size >= 4, `${tag}: mixes >= 4 modes (${[...modes]})`)
  check(w.levels.filter(l => l.type === 'quiz').length <= 1, `${tag}: at most 1 pure quiz level (owner: questions embedded in action)`)
  for (const l of w.levels.filter(l => l.type === 'steer' || l.type === 'lanes')) {
    const q = l.questions, on = q && [].concat(q.on || [])
    check(!!q && on.length && on.every(x => ['collide', 'buoy', 'gate'].includes(x)) && (q.count == null || q.count >= 1), `${tag}/${l.id}: action level embeds questions ${JSON.stringify(q)}`)
    if (on && on.includes('buoy')) check(q.buoys >= 1, `${tag}/${l.id}: buoy questions have buoys`)
    if (on && on.includes('gate')) check(q.gates >= 1, `${tag}/${l.id}: gate questions have gates`)
  }
  check(Array.isArray(w.outro) && w.outro.length >= 1, `${tag}: outro (return home) panels`)
  for (const pn of w.outro || []) { check(sceneOk(pn.scene), `${tag} outro: scene ${pn.scene}`); (pn.layers || []).forEach(l => check(keyOk(l.k), `${tag} outro: sprite ${l.k}`)) }
  for (const lv of TKW.flat(w)) {
    const lt = `${tag}/${lv.id}`
    check(TYPES.has(lv.type), `${lt}: type ${lv.type} is a level type the host plays`)
    check(lv.title && lv.goal, `${lt}: title + goal`)
    check(words(lv.goal) <= 12, `${lt}: mission line <= 12 words (${words(lv.goal)}: ${lv.goal})`)
    if (lv.scene) check(sceneOk(lv.scene), `${lt}: scene ${lv.scene}`)
    for (const pn of lv.story || []) { check(sceneOk(pn.scene), `${lt}: panel scene ${pn.scene}`); check(pn.caption && words(pn.caption) <= 26, `${lt}: panel caption <= 26 words (${words(pn.caption)})`); (pn.layers || []).forEach(l => check(keyOk(l.k), `${lt}: panel sprite ${l.k}`)) }
    if (lv.type === 'story') check((lv.story || []).length >= 3, `${lt}: story has panels`)
    if (lv.type === 'quiz') {
      check(lv.domain && lv.count >= 3, `${lt}: quiz domain + count`)
      check(!QUIZ_NAMES.test(lv.goal), `${lt}: quiz goal names no ship / place / year (${lv.goal})`)
      const qs = TKQ.build({ mix: true, domain: lv.domain, world: w.id, count: lv.count, grade: 1, islam: true, mastery: 0, topic: lv.goal, seed: 7 })
      check(qs.length === lv.count, `${lt}: TKQuiz.build gives ${lv.count} questions (${qs.length})`)
      const nm = qs.filter(q => q.domain === 'matematika' || !q.domain).length
      check(nm >= Math.floor(lv.count / 2) - 0, `${lt}: about half Matematika (${nm}/${qs.length})`)
    }
    if (lv.type === 'sort') {
      check(!!lv.domain, `${lt}: sort domain`)
      const set = TKQ.sortSet(lv.domain, w.id, TKQ.rng(5), { islam: true })
      check(set && set.world === w.id, `${lt}: TKQuiz.sortSet resolves this world's own set (${set && set.id})`)
      if (set && !set.capacity) {
        check(set.items.length >= 6 && set.items.every(i => set.bins.some(b => b.id === i.bin)), `${lt}: sort items all have a bin (${set.items.length})`)
        set.items.forEach(i => check(keyOk(i.sprite), `${lt}: sort sprite ${i.sprite}`)); set.bins.forEach(b => b.sprite && check(keyOk(b.sprite), `${lt}: bin sprite ${b.sprite}`))
      }
    }
    if (lv.type === 'steer') {
      check(!!lv.mode && !!lv.vessel, `${lt}: steer mode + vessel`)
      const s = TKW.steer(lv)
      check(s.mode === lv.mode && s.goal === lv.goal && Object.keys(lv.steer || {}).every(k => s[k] === lv.steer[k]), `${lt}: TKWorlds.steer passes the extra fields (${JSON.stringify(s)})`)
    }
    if (lv.type === 'lanes') check(lv.difficulty >= 1 && lv.difficulty <= 3 && Array.isArray(lv.sections) && lv.sections.length >= 2, `${lt}: lanes difficulty + sections`)
    if (lv.type === 'grid') {
      const def = TKW.grid(lv), r = solve(def), L = TKG.create(def), b = lv.board
      rows.push(`${lt} ${def.w}x${def.h} par ${r.par} tools ${r.tools.join('')} items ${def.items.length} cur ${def.currents.length} ice ${def.ice.length} easy ${!!def.easy}`)
      check(r.par > 0, `${lt}: solvable`)
      check(b.par === r.par, `${lt}: par ${b.par} == true shortest ${r.par}`)
      check(r.par === L.shortest, `${lt}: solver ${r.par} == TKGrid.shortest ${L.shortest}`)
      check(JSON.stringify(r.tools) === JSON.stringify(L.tools), `${lt}: tools ${r.tools} == TKGrid tools ${L.tools}`)
      check(L.maxLen >= r.par + 2, `${lt}: maxLen ${L.maxLen} >= par + 2`)
      check(!TKG.validate(def).length, `${lt}: TKGrid.validate ${JSON.stringify(TKG.validate(def))}`)
      ;(def.blockArt || []).forEach(k => check(keyOk(k), `${lt}: block sprite ${k}`)); if (def.itemArt) check(keyOk(def.itemArt), `${lt}: item sprite ${def.itemArt}`)
      if (r.sol) {
        check(runs(def, r.sol), `${lt}: route runs under the solver's rules`)
        const res = TKG.run(def, r.sol)
        check(res.ok && res.moves === r.par && res.stars === 3, `${lt}: TKGrid.run(route) ok=${res.ok} moves=${res.moves} stars=${res.stars}`)
        if (r.par <= 8) {
          let found = null; const n = r.par - 1, tl = r.tools
          const rec = (prog) => { if (found) return; if (prog.length === n) { if (runs(def, prog)) found = prog.slice(); return } for (const c of tl) { prog.push(c); rec(prog); prog.pop() } }
          if (Math.pow(tl.length, n) <= 3e6) { rec([]); check(!found, `${lt}: no program of ${n} chips (${found && found.join(' ')})`) }
        }
      }
    }
  }
  for (const s of strings(w)) {
    check(!BANNED.test(s), `${tag}: banned word in "${s.slice(0, 80)}"`)
    check(!EMOJI.test(s), `${tag}: emoji in "${s.slice(0, 60)}"`)
  }
}
for (const s of strings(LEG.SORTS).concat(strings(LEG.QUESTIONS))) { check(!BANNED.test(s), `sorts/questions: banned word in "${s}"`); check(!EMOJI.test(s), `sorts/questions: emoji in "${s}"`) }
for (const q of LEG.QUESTIONS) {
  check(NEW.some(w => w.id === q[2]), `${q[0]}: world ${q[2]} exists`)
  check(words(q[3]) <= 10, `${q[0]}: prompt <= 10 words (${words(q[3])})`)
  check(new Set(q[4]).size === q[4].length && q[4].length >= 3, `${q[0]}: 3+ distinct choices, answer first`)
  ;(q[8] || []).forEach(k => check(keyOk(k), `${q[0]}: visual ${k}`))
  check(BANK.items.some(o => o.id === q[0] && o.answer === q[4][0]), `${q[0]}: in TKQuestions.items`)
}
for (const s of LEG.SORTS) check(BANK.sorts.filter(x => x.id === s.id).length === 1, `${s.id}: in TKQuestions.sorts once`)
console.log('grid boards:\n  ' + rows.join('\n  '))
console.log(`A) node: ${passes} passed, ${fails.length} failed`)

/* ── B: play every level in the real page ──────────────────────────── */
if (process.env.QA_UI !== '0') {
  const { default: puppeteer } = await import('puppeteer')
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true })
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const inject = fs.readFileSync(LEGENDS, 'utf8')
  const hosted = fs.readFileSync(path.join(ROOT, 'games/timmy-kapal.html'), 'utf8').includes('data/tk-worlds-legends.js')
  async function tapSel (p, sel) {
    const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); if (!b.width) return null; return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
    if (!r) return false
    await p.touchscreen.tap(r.x, r.y); return true
  }
  const AUTOPILOT = () => {
    window.__autoStop && window.__autoStop()
    const tap = b => b && b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch', isPrimary: true }))
    const id = setInterval(() => {
      const h = window.__tk.handle(); if (!h || !h.state) return
      const s = h.state(); if (s.sent) { clearInterval(id); return }
      if (s.waiting || s.phase !== 'player') return
      if (Math.abs(s.x - (s.lane - 1) * 100) < 2 && s.lane !== s.safeLane) tap(document.querySelector(s.safeLane < s.lane ? '.tkl-left' : '.tkl-right'))
    }, 60)
    window.__autoStop = () => clearInterval(id)
  }
  async function playLevel (p, tag, onMount) {
    const t0 = Date.now(); let lanesArmed = false, mounted = false
    while (Date.now() - t0 < 180000) {
      const st = await p.evaluate(() => ({ s: __tk.state(), lv: __tk.level(), skip: !!document.querySelector('.tks-skip'), chal: document.querySelector('.tkq-chal') && __tk.challenge() }))
      if (st.s.screen === 'scr-reward') return true
      if (st.s.screen !== 'scr-play') { check(false, `${tag}: left the play screen (${st.s.screen})`); return false }
      if (st.chal && st.chal.open && st.chal.state) {
        const c = st.chal.state
        if (c.answered) await tapSel(p, '.tkq-chal .tkq-next:not([disabled])'); else await tapSel(p, `.tkq-chal .tkq-ans [data-c="${String(c.answer).replace(/"/g, '\\"')}"]`)
        await sleep(600); continue
      }
      if (await p.evaluate(() => !!document.querySelector('.tkf-cta'))) { await tapSel(p, '.tkf-cta'); await sleep(700); continue }
      if (st.skip) { await tapSel(p, '.tks-skip'); await sleep(500); continue }
      if (!st.lv) { await sleep(300); continue }
      const type = st.lv.type
      if (!mounted && type !== 'story' && onMount) { mounted = true; await sleep(900); await onMount(type) }
      if (type === 'quiz') {
        const q = await p.evaluate(() => { const h = __tk.handle(); return h && h.state ? h.state() : null })
        if (!q) { await sleep(300); continue }
        if (q.answered) { await tapSel(p, '.tkq-next:not([disabled])'); await sleep(450); continue }
        if (await p.evaluate(() => !!document.querySelector('.tkq-tile'))) {
          for (const ch of [...String(q.answer)]) {
            const r = await p.evaluate(c => { const t = [...document.querySelectorAll('.tkq-tile')].find(x => !x.disabled && !x.classList.contains('used') && x.textContent.trim() === c); if (!t) return null; const b = t.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, ch)
            if (r) { await p.touchscreen.tap(r.x, r.y); await sleep(250) }
          }
          await sleep(900); continue
        }
        if (!(await tapSel(p, `.tkq-ans [data-c="${String(q.answer).replace(/"/g, '\\"')}"]`))) { check(false, `${tag}: quiz answer button missing (${q.answer})`); return false }
        await sleep(900); continue
      }
      if (type === 'sort') {
        const d = await p.evaluate(() => { const h = __tk.handle(); return h && h.state ? h.state().done : false })
        if (d) { await tapSel(p, '.tkq-next:not([disabled])'); await sleep(700); continue }
        const plan = await p.evaluate(() => {
          const h = __tk.handle(); const el = document.querySelector('.tkq-tray .tkq-item'); if (!el || !h || !h.set) return null
          const set = h.set, it = set.items.filter(i => i.id === el.dataset.id)[0]; if (!it) return null
          if (it.bin !== '*') return { id: it.id, bin: it.bin }
          if (!window.__qaPlan) {
            const bins = set.bins.map(b => ({ id: b.id, left: b.cap })), items = set.items.slice().sort((a, b) => b.n - a.n), out = {}
            const go = i => { if (i === items.length) return true; for (const b of bins) if (b.left >= items[i].n) { b.left -= items[i].n; out[items[i].id] = b.id; if (go(i + 1)) return true; b.left += items[i].n } return false }
            go(0); window.__qaPlan = out
          }
          return { id: it.id, bin: window.__qaPlan[it.id] }
        })
        if (!plan) { await sleep(400); continue }
        await tapSel(p, `.tkq-tray .tkq-item[data-id="${plan.id}"]`); await sleep(200)
        await tapSel(p, `.tkq-bin[data-bin="${plan.bin}"]`); await sleep(550); continue
      }
      if (type === 'grid') {
        const ok = await p.evaluate(() => { const h = __tk.handle(); if (!h || !h.level || !h.setProgram) return null; if (h.__qaGo) return 'running'; const sol = TKGrid.solve(h.level); if (!sol) return false; h.setProgram(sol.program || sol); h.__qaGo = 1; return true })
        if (ok === null) { await sleep(300); continue }
        if (ok === false) { check(false, `${tag}: grid has no solution in the page`); return false }
        if (ok === true) { await sleep(300); await tapSel(p, '.tkg-go') }
        await sleep(1500); continue
      }
      if (type === 'steer') {
        const drove = await p.evaluate(() => { const h = __tk.handle(); if (h && h.autopilot) { h.__qa || h.autopilot(true); h.__qa = 1; return 'auto' } if (h && h.finish) { h.finish(); return 'finish' } return null })
        if (!drove) await p.evaluate(() => __tk.finish(2))
        await sleep(1500); continue
      }
      if (type === 'lanes') { if (!lanesArmed) { lanesArmed = true; await sleep(300); await p.evaluate(AUTOPILOT) } await sleep(300); continue }
      await sleep(400)
    }
    check(false, `${tag}: did not finish in 180 s (${JSON.stringify(await p.evaluate(() => [__tk.state(), __tk.level()]))})`)
    return false
  }
  for (const [vw, vh] of [[1280, 800], [390, 844]]) {
    const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
    const p = await b.newPage(); const errs = []; const size = `${vw}x${vh}`
    p.on('pageerror', e => errs.push('pageerror ' + e.message))
    p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().split('/').pop()) })
    p.on('requestfailed', r => errs.push('failed ' + r.url().split('/').pop()))
    await p.setRequestInterception(true)
    p.on('request', async rq => {
      if (!hosted && /\/games\/data\/tk-questions\.js/.test(rq.url())) {
        try { const res = await fetch(rq.url()); const body = await res.text(); return rq.respond({ status: 200, contentType: 'application/javascript', body: body + '\n;' + inject }) } catch (e) { return rq.continue() }
      }
      rq.continue()
    })
    await p.setViewport({ width: vw, height: vh, isMobile: vw < 900, hasTouch: true })
    await p.evaluateOnNewDocument(() => { window.__TK_NO_WARM = true })
    await p.goto(URL, { waitUntil: 'networkidle2' })
    const loaded = await p.evaluate(() => !!(window.TKWorlds && TKWorlds.LEGENDS && TKWorlds.get('carpathia')))
    check(loaded, `${size}: legends injected into the page`)
    if (!loaded) { await b.close(); continue }
    await p.evaluate(() => { __tk.reset(); __tk.fast(true); __tk.unlockAll(); window.__bad = []; new MutationObserver(() => { const t = document.body.innerText; if (/gagal|kalah|game over/i.test(t)) window.__bad.push(t.slice(0, 120)) }).observe(document.body, { subtree: true, childList: true, characterData: true }) })
    const shotModes = new Set(); let played = 0
    for (const w of NEW) {
      await p.evaluate(id => __tk.map(id), w.id); await sleep(1800)
      const m = await p.evaluate(() => ({ n: document.querySelectorAll('#route .chap').length, name: (document.getElementById('map-name') || {}).textContent, hs: document.scrollingElement.scrollWidth > innerWidth + 1 }))
      check(m.n === w.levels.length, `${size} ${w.id}: level map shows ${w.levels.length} stops (${m.n})`)
      check(!m.hs, `${size} ${w.id}: level map has no horizontal scroll`)
      if (SHOTS && vw === 1280) await p.screenshot({ path: `${SHOTS}/map-${w.id}.png` })
      for (let k = 0; k < w.levels.length; k++) {
        const lv = w.levels[k], tag = `${size} ${w.id}#${k + 1} ${lv.type}`
        await p.evaluate((id, k) => { window.__qaPlan = null; __tk.start(id, k) }, w.id, k); await sleep(700)
        const shoot = async type => { if (SHOTS && vw === 1280 && !shotModes.has(type)) { shotModes.add(type); await p.screenshot({ path: `${SHOTS}/mode-${type}-${lv.id}.png` }) } }
        if (lv.type === 'story' && SHOTS && vw === 1280 && !shotModes.has('story')) { await sleep(600); shotModes.add('story'); await p.screenshot({ path: `${SHOTS}/mode-story-${lv.id}.png` }) }
        const ok = await playLevel(p, tag, shoot)
        if (lv.fragment) check(await p.evaluate(() => (__tk.save().fragments || []).length) > 0, `${tag}: outro played through to the reward`)
        check(ok === true, `${tag}: reaches the reward screen`)
        if (ok === true) {
          played++
          const sv = await p.evaluate((wid, lid) => { const s = __tk.save(); return { st: (s.stars[wid] || {})[lid] || 0, frag: s.fragments.includes(wid) } }, w.id, lv.id)
          check(sv.st > 0, `${tag}: stars saved (${sv.st})`)
          if (lv.fragment) {
            check(sv.frag, `${tag}: the fragment is collected`)
            const g = await p.evaluate(() => (document.querySelector('#scr-reward .gift.frag b') || {}).textContent || '')
            check(/\/6$/.test(g.trim()), `${tag}: reward counts Legend fragments of 6 (${g})`)
          }
          if (SHOTS && vw === 1280 && lv.fragment && w.id === 'carpathia') await p.screenshot({ path: `${SHOTS}/reward-${lv.id}.png` })
        }
      }
    }
    const bad = await p.evaluate(() => window.__bad)
    check(!bad.length, `${size}: no failure words on screen (${bad.slice(0, 2).join(' | ')})`)
    check(!errs.length, `${size}: no page errors / failed requests (${errs.slice(0, 5).join(' | ')})`)
    console.log(`B) ${size}: ${played} levels played`)
    await b.close()
  }
}
console.log(`\n${passes} passed, ${fails.length} failed`)
process.exit(fails.length ? 1 : 0)
