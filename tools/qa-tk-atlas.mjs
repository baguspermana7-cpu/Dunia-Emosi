// qa-tk-atlas.mjs — G30 WORLD SELECT sea chart gate (games/data/tk-atlas.js + the world-select screen).
// A. graph validity, for EVERY subset of the 6 legend worlds present (64 graphs): every world reachable from kamar,
//    no dead ends but the finale, <= 3 routes out of a world, <= 3 new worlds opened by one finish (routes + gates).
// B. unlock rules: starters, routes, sea gates (any world of the region), finale fragments, never re-lock, and a
//    random-play simulation (300 runs): always >= 1 open unfinished world until everything is done.
// C. levels inserted later (lv.added): a world finished before the insert stays done, reached levels stay open,
//    added levels open once their original predecessor is starred.
// D. migration of 5 synthetic OLD (linear) saves through the real page (__tk.load): nothing that was open or
//    started is locked afterwards, and S.atlas.open is saved.
// E. puppeteer at 6 sizes: nodes >= 56 px, no overlap (nodes / labels / banners / signposts), text >= 14 px,
//    controls >= 56 px in the free area, pan (+ momentum), zoom buttons, pinch, recenter, mini-map, tap an open
//    world -> its level map, tap a locked one -> shake + hint, rotation re-lays out, no page errors.
// QA_SIZES="1280x800,…"  QA_URL=…  Screenshots: scratchpad tk-atlas/.
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const URL = process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'
const SIZES = (process.env.QA_SIZES || '1280x800,1340x800,1024x768,800x1280,390x844,844x390').split(',').map(s => s.split('x').map(Number))
const SHOTS = process.env.QA_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-atlas'
fs.mkdirSync(SHOTS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
// wait until the chart camera stops moving (a tween may be slowed by a loaded machine)
const settle = async p => { await sleep(30); await p.waitForFunction(() => !TKAtlas.view().busy(), { polling: 50, timeout: 4000 }).catch(() => {}) }
let pass = 0; const fails = []
const check = (ok, msg) => { if (ok) pass++; else { fails.push(msg); console.log('FAIL ' + msg) } }

globalThis.window = globalThis
const WD = require('../games/data/tk-worlds.js')
try { require('../games/data/tk-worlds-legends.js') } catch (e) { console.log('(legends file not loaded in node: ' + e.message + ')') }
const TA = require('../games/data/tk-atlas.js')
const LEG = Object.keys(TA.NODES).filter(id => TA.NODES[id].legend)
const CORE = Object.keys(TA.NODES).filter(id => !TA.NODES[id].legend)
const set = a => Object.fromEntries(a.map(k => [k, 1]))

/* ── A. graph validity for every legend subset ── */
check(LEG.length === 6 && ['carpathia', 'republic', 'erebus', 'maryceleste', 'queenanne', 'maryrose'].every(x => LEG.includes(x)), `6 legend worlds in the atlas (${LEG})`)
check(WD.WORLDS.every(w => TA.NODES[w.id]), `every loaded world has a place on the chart (${WD.WORLDS.filter(w => !TA.NODES[w.id]).map(w => w.id)})`)
let graphs = 0
for (let m = 0; m < 64; m++) {
  const pres = CORE.concat(LEG.filter((x, i) => m & (1 << i))), G = TA.graph(pres), bad = TA.validate(G)
  graphs++; if (bad.length) check(false, `graph with legends [${LEG.filter((x, i) => m & (1 << i))}]: ${bad.join('; ')}`)
}
pass++; console.log(`A: ${graphs} graphs checked`)
const GF = TA.graph(Object.keys(TA.NODES))
const branchy = GF.ids.filter(id => GF.out[id].length >= 2)
check(GF.out.titanic.length >= 2 && GF.out.titanic.length <= 3, `after Kamar -> Titanic the child chooses 2–3 paths (${GF.out.titanic})`)
check(branchy.length >= 3, `the chart branches (branch points: ${branchy})`)
check(branchy.every(id => TA.NODES[id].sign), `every branch point has a signpost spot (${branchy.filter(id => !TA.NODES[id].sign)})`)
check(branchy.every(id => GF.out[id].every(b => GF.hints[id + '>' + b])), 'every signpost arrow has a hint')
// regions (playtest 2026-09-30: "Laut Karibia" sat under Vasa of Laut Eropa): no world lies inside another region's sea
{
  const inside = []
  for (const id of Object.keys(TA.NODES)) {
    const n = TA.NODES[id]
    TA.REGIONS.forEach(g => { if (g.id !== n.r && ((n.x - g.blob[0]) / g.blob[2]) ** 2 + ((n.y - g.blob[1]) / g.blob[3]) ** 2 < 1) inside.push(id + ' in ' + g.id) })
  }
  check(!inside.length, `no world inside another region's sea (${inside})`)
}
// the chart as it loads today (legends present or not)
const GL = TA.graph(WD.WORLDS.map(w => w.id))
check(TA.validate(GL).length === 0, `the chart for the loaded worlds is valid (${TA.validate(GL)})`)

/* ── B. unlock rules ── */
{
  const G = GF, C = st => TA.compute(G, Object.assign({ done: {}, fragments: 0, open: {} }, st))
  let r = C({})
  check(JSON.stringify(Object.keys(r.open).sort()) === '["kamar","titanic"]', `fresh: only Kamar + Titanic open (${Object.keys(r.open)})`)
  r = C({ done: set(['kamar', 'titanic']) })
  check(['carpathia', 'vasa', 'queenanne'].every(x => r.open[x]) && !r.open.britannic && !r.open.endurance, `Titanic done opens its 3 routes and nothing further (${Object.keys(r.open)})`)
  r = C({ done: set(['kamar', 'titanic', 'vasa']) })
  check(r.open.maryrose && r.open.victory && r.open.endurance && !r.open.cuttysark, `Vasa done: its routes + the Eropa sea gate to Kutub Es open, Cutty Sark still closed`)
  r = C({ done: set(['kamar', 'titanic', 'queenanne']) })
  check(r.open.kontiki && r.open.arizona && !r.open.missouri, 'Karibia done: Kon-Tiki + the gate to Pasifik (Arizona)')
  check(!C({ fragments: G.need - 1 }).open.pelabuhan && C({ fragments: G.need }).open.pelabuhan, `the finale needs ${G.need} fragments`)
  r = C({ open: set(['missouri', 'nautilus']) })
  check(r.open.missouri && r.open.nautilus, 'a world open in the save is never re-locked')
  check(TA.next(G, C({ done: set(['kamar']) }), null) === 'titanic', 'next glow after Kamar = Titanic')
  check(TA.next(G, C({ done: set(['kamar', 'titanic']) }), 'vasa') === 'vasa', 'next glow follows the world last played')
  check(TA.next(G, C({ done: set(['kamar', 'titanic', 'carpathia', 'britannic']) }), 'britannic') === 'queenmary', 'after finishing a world the glow moves along its own route')
  check(/Kepingan/.test(TA.hint(G, 'pelabuhan', C({ fragments: 3 }), x => x)), 'finale hint names the fragments')
  check(/gerbang/.test(TA.hint(G, 'endurance', C({ done: set(['kamar', 'titanic']) }), x => x)), 'sea-gate hint names the gate')
  // random play: always an open unfinished world, each finish opens <= 3, everything gets done
  let worst = 0, stuck = 0, notAll = 0
  for (let run = 0; run < 300; run++) {
    let seed = run * 7919 + 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const pres = CORE.concat(LEG.filter(() => rnd() < 0.5)), g = TA.graph(pres), done = {}, open = {}
    let fr = 0
    for (let step = 0; step < 80; step++) {
      const rr = TA.compute(g, { done, fragments: fr, open }); Object.assign(open, rr.open)
      const cand = g.ids.filter(id => rr.open[id] && !done[id])
      if (!cand.length) { if (g.ids.some(id => !done[id])) stuck++; break }
      const pick = cand[Math.floor(rnd() * cand.length)]; done[pick] = 1; if (pick !== 'kamar' && pick !== 'pelabuhan') fr++
      const after = TA.compute(g, { done, fragments: fr, open }), nw = Object.keys(after.open).filter(k => !open[k])
      worst = Math.max(worst, nw.filter(k => k !== 'pelabuhan').length)
    }
    if (g.ids.some(id => !done[id])) notAll++
  }
  check(!stuck, `random play: never stuck without an open world (${stuck} runs stuck)`)
  check(!notAll, `random play: every world can be finished (${notAll} runs incomplete)`)
  check(worst <= 3, `random play: one finish opens at most 3 new worlds (worst ${worst})`)
}

/* ── C. levels inserted later ── */
{
  const w = { id: 'x', levels: [{ id: 'a' }, { id: 'b' }, { id: 'n1', added: 1 }, { id: 'c' }, { id: 'n2', added: 1 }, { id: 'd' }] }
  const sf = st => id => st[id] || 0
  check(TA.worldDone(w, sf({ a: 3, b: 2, c: 1, d: 3 })), 'a world finished before the insert stays done (added levels optional)')
  check(!TA.worldDone(w, sf({ a: 3, b: 2, c: 1 })), 'a world is not done while an original level is unstarred')
  check(TA.levelOpen(w, 3, sf({ a: 3, b: 2 })), 'mid-world: the next ORIGINAL level after an inserted one stays open')
  check(TA.levelOpen(w, 2, sf({ a: 3, b: 2 })), 'an added level opens once its predecessor is starred')
  check(TA.levelOpen(w, 4, sf({ a: 3, b: 2, c: 1 })), 'an added level later in the world opens after its predecessor')
  check(TA.levelOpen(w, 1, sf({ c: 2 })), 'progress beyond a level keeps it open')
  // explore-ahead rule (owner 2026-10-03): the first 3 levels are open; ONE star on level k opens k+1..k+3
  const long = { id: 'y', levels: 'abcdefghij'.split('').map(id => ({ id })) }
  check(TA.AHEAD === 3, `TKAtlas.AHEAD is 3 (${TA.AHEAD})`)
  check([0, 1, 2].every(k => TA.levelOpen(long, k, sf({}))) && !TA.levelOpen(long, 3, sf({})), 'a fresh world: levels 1-3 open, level 4 locked')
  check(TA.levelOpen(w, 2, sf({})), 'an added level among the first 3 is open too')
  check(!TA.levelOpen(w, 4, sf({ a: 3 })), 'an added level beyond the window stays closed before its predecessors')
  for (let k = 0; k < long.levels.length; k++) {
    const one = sf({ [long.levels[k].id]: 1 })
    const ahead = [1, 2, 3].map(d => k + d).filter(j => j < long.levels.length)
    check(ahead.every(j => TA.levelOpen(long, j, one)), `1 star on level ${k + 1} opens levels ${ahead.map(j => j + 1).join(',') || '-'}`)
    if (k + 4 < long.levels.length && k + 4 >= 3) check(!TA.levelOpen(long, k + 4, one), `1 star on level ${k + 1} does not open level ${k + 5}`)
  }
  // the real data, every world: one star on level k opens the next 3 (unlocks only grow: k's own progress keeps 0..k open)
  {
    let bad = []
    for (const x of WD.WORLDS) for (let k = 0; k < x.levels.length; k++) {
      const one = id => id === x.levels[k].id ? 1 : 0
      for (let j = 0; j <= Math.min(k + 3, x.levels.length - 1); j++) if (!TA.levelOpen(x, j, one)) bad.push(`${x.id}:${k + 1}->${j + 1}`)
    }
    check(!bad.length, `real worlds: one star on any level opens every level before it and the next 3 (${bad.slice(0, 6).join(' ')})`)
  }
  // the real data: every world with added levels, finished on its original levels only
  const real = WD.WORLDS.filter(x => x.levels.some(l => l.added))
  check(real.every(x => TA.worldDone(x, id => x.levels.find(l => l.id === id && !l.added) ? 3 : 0)), `real worlds (${real.length} with added levels) count as done on their original levels`)
  check(real.every(x => x.levels.every((l, k) => TA.levelOpen(x, k, id => x.levels.find(q => q.id === id && !q.added) ? 3 : 0))), 'real worlds: every level open once the originals are starred')
}

/* ── D + E: the page ── */
const lvIds = (id, orig) => WD.get(id).levels.filter(l => !orig || !l.added).map(l => l.id)
const doneStars = (ids) => Object.fromEntries(ids.map(id => [id, Object.fromEntries(lvIds(id, true).map(l => [l, 3]))]))
const OLD = {
  // 1. brand new player
  fresh: {},
  // 2. Kamar done, Titanic chapters 1..3
  early: { stars: Object.assign(doneStars(['kamar']), { titanic: { c1: 3, c2: 2, c3: 1 } }), last: { w: 'titanic', k: 3 } },
  // 3. the old line up to Vasa done (before the level insert), Cutty Sark half played
  mid: { stars: Object.assign(doneStars(['kamar', 'titanic', 'britannic', 'vasa']), { cuttysark: { cuttysark1: 3, cuttysark2: 2 } }), fragments: ['titanic', 'britannic', 'vasa'], last: { w: 'cuttysark', k: 2 } },
  // 4. the old line up to Nautilus done: Pelabuhan Waktu was open
  late: { stars: doneStars(['kamar', 'titanic', 'britannic', 'vasa', 'cuttysark', 'victory', 'mayflower', 'endurance', 'kontiki', 'calypso', 'queenmary', 'arizona', 'missouri', 'nautilus']),
    fragments: ['titanic', 'britannic', 'vasa', 'cuttysark', 'victory', 'mayflower', 'endurance', 'kontiki', 'calypso', 'queenmary', 'arizona', 'missouri', 'nautilus'], last: { w: 'nautilus', k: 5 } },
  // 5. an odd save: stars far down the old line (a parent's unlock-all), the old Titanic t-levels
  odd: { stars: { titanic: { t1: 3, t2: 3, t3: 2 }, missouri: { missouri1: 2 }, kontiki: { kontiki1: 1 } }, fragments: ['missouri', 'kontiki'], last: { w: 'missouri', k: 1 } }
}
function linearOpen (save) {   // what the OLD game had open: the linear rule on the legacy order + any world with stars
  const st = save.stars || {}, done = id => WD.get(id) && lvIds(id, true).every(l => (st[id] || {})[l] > 0)
  const o = new Set(['kamar', 'titanic']); TA.LEGACY.forEach((id, i) => { if (i && done(TA.LEGACY[i - 1])) o.add(id) })
  Object.keys(st).forEach(id => { if (Object.values(st[id]).some(v => v > 0)) o.add(id) })
  return o
}

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
try {
  const p = await b.newPage()
  const errs = []
  p.on('pageerror', e => errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push('console ' + m.text().slice(0, 160)) })
  await p.setViewport({ width: 1280, height: 800, hasTouch: true, isMobile: true })
  await p.evaluateOnNewDocument(() => { window.__TK_NO_WARM = true })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.waitForFunction(() => window.__tk && window.TKAtlas)

  /* D. migration */
  for (const [nm, save] of Object.entries(OLD)) {
    const res = await p.evaluate(s => { __tk.load(s); return { a: __tk.atlas(), sv: __tk.save().atlas } }, save)
    const want = linearOpen(save), open = new Set(res.a.open), lost = [...want].filter(x => WD.get(x) && !open.has(x))
    check(!lost.length, `migration ${nm}: nothing re-locked (lost: ${lost})`)
    check(res.sv && res.sv.open && res.sv.open.length >= want.size, `migration ${nm}: S.atlas.open saved (${res.sv && res.sv.open.length})`)
    if (nm === 'mid') check(['carpathia', 'queenanne', 'maryrose', 'victory', 'endurance', 'cuttysark'].filter(x => WD.get(x) || !TA.NODES[x].legend).every(x => open.has(x)), `migration mid: the graph opens Vasa's routes + gates (${res.a.open})`)
    if (nm === 'late') check(open.has('pelabuhan'), 'migration late: Pelabuhan Waktu (open before) stays open')
    if (nm === 'mid') { const nx = await p.evaluate(() => ({ a: __tk.atlas().next, n: __tk.next() })); check(nx.n && nx.n.world === nx.a, `the big Start button goes where the chart glows (${JSON.stringify(nx)})`) }
    // a second load of the migrated save keeps everything
    const again = await p.evaluate(() => { const s = __tk.save(); __tk.load(s); return __tk.atlas().open })
    check(res.a.open.every(x => again.includes(x)), `migration ${nm}: reloading keeps every open world`)
  }
  // the level insert through the real page: Britannic finished on its original levels only
  {
    const s = { stars: Object.assign(doneStars(['kamar', 'titanic', 'britannic'])), fragments: ['titanic', 'britannic'] }
    const a = await p.evaluate(x => { __tk.load(x); return __tk.atlas() }, s)
    check(a.done.includes('britannic') && a.open.includes('vasa') && a.open.includes('queenmary'), `level insert: Britannic done on its original levels, the next worlds open (${a.done} / ${a.open})`)
  }

  /* E. the screen at 6 sizes (save: 'mid' — branches, a signpost, locked regions, fog) */
  let first = true
  for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`
    await p.setViewport({ width: w, height: h, hasTouch: true, isMobile: true })
    await p.evaluate(s => { __tk.load(s); const g = __tk.save().guide; __tk.world() }, OLD.mid)
    await p.evaluate(() => { document.querySelectorAll('.tk-hand').forEach(e => e.remove()) })
    await sleep(900)
    await p.screenshot({ path: `${SHOTS}/${tag}.png` })
    const M = await p.evaluate(() => {
      const V = TKAtlas.view(), cam = V.cam(), box = V.box(), R = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }
      const nodes = [...document.querySelectorAll('.atl-node')].map(n => ({ id: n.dataset.w, land: R(n.querySelector('.land')), lab: R(n.querySelector('.lab')), btn: R(n) }))
      const bans = [...document.querySelectorAll('.atl-ban')].map(R), signs = [...document.querySelectorAll('.atl-sign, .atl-dec')].map(R)
      const texts = [...document.querySelectorAll('.atl-node .lab b, .atl-ban b, .atl-sign b, .atl-node .need, .atl-node .flag')].map(e => ({ t: e.textContent.slice(0, 20), px: parseFloat(getComputedStyle(e).fontSize) * cam.s }))
      const ctl = [...document.querySelectorAll('.atl-ctl button, .atl-mini')].map(e => Object.assign(R(e), { c: e.className }))
      return { cam, box, nodes, bans, signs, texts, ctl, vw: innerWidth, vh: innerHeight, hs: document.scrollingElement.scrollWidth > innerWidth + 1, scr: document.body.getAttribute('data-scr') }
    })
    check(M.scr === 'scr-world', `${tag}: world select shows`)
    check(M.nodes.length === GL.ids.length, `${tag}: one node per world (${M.nodes.length}/${GL.ids.length})`)
    const small = M.nodes.filter(n => Math.min(n.land.w, n.land.h) < 56)
    check(!small.length, `${tag}: world nodes >= 56 px (${small.map(n => n.id + ' ' + Math.round(Math.min(n.land.w, n.land.h)))})`)
    const ov = (a, b2, pad = 0) => a.l < b2.r - pad && b2.l < a.r - pad && a.t < b2.b - pad && b2.t < a.b - pad
    const hits = []
    const boxes = M.nodes.flatMap(n => [{ k: n.id + '.land', r: n.land }, { k: n.id + '.lab', r: n.lab }])
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (boxes[i].k.split('.')[0] !== boxes[j].k.split('.')[0] && ov(boxes[i].r, boxes[j].r, 4)) hits.push(boxes[i].k + '~' + boxes[j].k)
    M.bans.forEach((bn, i) => boxes.forEach(x => { if (ov(bn, x.r, 4)) hits.push('banner' + i + '~' + x.k) }))
    M.signs.forEach((sg, i) => boxes.forEach(x => { if (ov(sg, x.r, 4)) hits.push('sign/decor' + i + '~' + x.k) }))
    check(!hits.length, `${tag}: no overlap (${hits.slice(0, 8)})`)
    const tiny = M.texts.filter(t => t.px < 14 - 0.05)
    check(!tiny.length, `${tag}: chart text >= 14 px (${tiny.map(t => t.t + ' ' + t.px.toFixed(1))})`)
    const badCtl = M.ctl.filter(c => c.w && c.h).filter(c => Math.min(c.w, c.h) < 56 || c.l < 0 || c.r > M.vw || c.t < M.box.top - 1 || c.b > M.vh - M.box.bot + 1)
    check(!badCtl.length, `${tag}: zoom / Timmy / mini-map controls >= 56 px inside the free area (${badCtl.map(c => c.c + ' ' + Math.round(c.w) + 'x' + Math.round(c.h) + '@' + Math.round(c.t))})`)
    const mini = M.ctl.find(c => /atl-mini/.test(c.c)), zs = M.ctl.filter(c => !/atl-mini/.test(c.c))
    check(!mini || !zs.some(z => ov(z, mini)), `${tag}: mini-map clear of the buttons`)
    check(!M.hs, `${tag}: no horizontal page scroll`)
    const nx = await p.evaluate(() => { const n = document.querySelector('.atl-node.next'); if (!n) return null; const r = n.querySelector('.land').getBoundingClientRect(), V = TKAtlas.view().box(); return { id: n.dataset.w, vis: r.left >= 0 && r.right <= innerWidth && r.top >= V.top - 20 && r.bottom <= innerHeight - V.bot + 20 } })
    check(nx && nx.vis, `${tag}: the glowing next world is on screen at start (${JSON.stringify(nx)})`)

    // START VIEW (owner tablet + playtest 2026-09-30: the Atlantik banner behind the zoom buttons and the title plate,
    // a signpost cut at the left edge, labels under the star counter / nav): every banner and signpost on screen is
    // WHOLE and clear of all chrome; every world on screen (island + label) is clear of all chrome
    const SV = await p.evaluate(() => {
      const vis = e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 0 ? r : null }
      const chrome = [...document.querySelectorAll('#scr-world .topbar > *, #scr-world .w-foot > *, .atl-ctl, .atl-mini, #sndfab')].map(e => ({ e: (e.id || e.className || e.tagName).toString().slice(0, 24), r: vis(e) })).filter(c => c.r)
      const hit = (r, c) => r.left < c.r.right - 2 && c.r.left < r.right - 2 && r.top < c.r.bottom - 2 && c.r.top < r.bottom - 2
      const box = (els) => els.map(e => e.getBoundingClientRect()).filter(r => r.width).reduce((a, r) => a ? { left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, null)
      const items = [...document.querySelectorAll('.atl-ban')].map(e => ['banner ' + e.textContent.trim(), [e], true])
        .concat([...document.querySelectorAll('.atl-sign')].map(e => ['signpost@' + e.dataset.w, [e, ...e.querySelectorAll('.pl, .ar')], true]))
        .concat([...document.querySelectorAll('.atl-node')].flatMap(e => [['world ' + e.dataset.w, [e.querySelector('.land')], false], ['label ' + e.dataset.w, [e.querySelector('.lab')], false]]))
      // a banner / signpost on screen is whole on screen (tablets) and clear of all chrome (bar buttons, title plate, star
      // counter, dock, mini-map); a world (island, label) whose centre is inside the free area F (between the top bar and
      // the footer) has at most a 20 % corner under any chrome (a world past a bar is off the view, like past the edge)
      const V = TKAtlas.view().box(), FT = V.top, FB = innerHeight - V.bot, out = []
      items.forEach(([k, els, whole]) => {
        const r = box(els); if (!r) return
        if (whole) {
          if (r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight) return
          // tablets (the owner's device, short side >= 600): also whole on screen; a phone is too narrow for a 2-plank
          // signpost + its banner to always sit whole, so there only the chrome rule applies
          if (Math.min(innerWidth, innerHeight) >= 600 && (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1)) out.push(k + ' cut by the screen edge')
        } else {
          const mx = (r.left + r.right) / 2, my = (r.top + r.bottom) / 2
          if (mx <= 0 || mx >= innerWidth || my <= FT || my >= FB) return
          // a world: at most a 20 % corner of its island / label under a piece of chrome
          chrome.forEach(c => { const cw = Math.min(r.right, c.r.right) - Math.max(r.left, c.r.left), chh = Math.min(r.bottom, c.r.bottom) - Math.max(r.top, c.r.top)
            if (cw > 0 && chh > 0 && cw * chh / ((r.right - r.left) * (r.bottom - r.top)) > 0.2) out.push(k + ' under ' + c.e + ' (' + Math.round(100 * cw * chh / ((r.right - r.left) * (r.bottom - r.top))) + '%)') })
          return
        }
        chrome.forEach(c => { if (hit(r, c)) out.push(k + ' under ' + c.e) })
      })
      return out
    })
    check(!SV.length, `${tag}: start view — banners / signposts whole, nothing under the chrome (${SV.slice(0, 8)}) ${JSON.stringify(await p.evaluate(() => TKAtlas.view().homeInfo))}`)
    // the dock: zoom in / out + Timmy in ONE backed panel at the bottom right, above the footer
    const DK = await p.evaluate(() => { const d = document.querySelector('.atl-ctl'), r = d.getBoundingClientRect(), V = TKAtlas.view().box(), bg = getComputedStyle(d).backgroundImage + getComputedStyle(d).backgroundColor
      return { r: r.right, b: r.bottom, l: r.left, n: d.querySelectorAll('button').length, bg: !/^none(rgba\(0, 0, 0, 0\))?$/.test(bg), foot: innerHeight - V.bot } })
    check(DK.n === 3 && DK.bg && DK.r > w * 0.8 && DK.b <= DK.foot + 1 && DK.b > DK.foot - 40, `${tag}: zoom + Timmy share one backed dock at the bottom right above the footer (${JSON.stringify(DK)})`)
    // signposts: each plank's arrow points along its route's first stretch (playtest: three right arrows for up / right / down)
    const SA = await p.evaluate(() => [...document.querySelectorAll('.atl-sign .pl')].map(pl => {
      const from = pl.closest('.atl-sign').dataset.w, to = pl.dataset.to, path = document.querySelector('.rt[data-e="' + from + '>' + to + '"] path.rd')
      if (!path) return { from, to, miss: true }
      const L = path.getTotalLength(), a = path.getPointAtLength(0), b2 = path.getPointAtLength(L * 0.3), exp = Math.atan2(b2.y - a.y, b2.x - a.x) * 180 / Math.PI
      const ar = pl.querySelector('.ar'); if (!ar) return { from, to, noArrow: true }
      const m = new DOMMatrix(getComputedStyle(ar).transform), got = Math.atan2(m.b, m.a) * 180 / Math.PI
      return { from, to, exp: Math.round(exp), got: Math.round(got) }
    }))
    const badArrow = SA.filter(a => a.miss || a.noArrow || Math.abs(((a.got - a.exp) % 360 + 540) % 360 - 180) > 25)
    check(!badArrow.length, `${tag}: signpost arrows point along their routes (${JSON.stringify(badArrow.slice(0, 4))}; ${SA.length} planks)`)
    if (tag === '1280x800') {
      check(SA.length >= 2, `${tag}: the mid save shows a signpost (${SA.length} planks)`)
      // a banner sits by its own worlds: >= 40 chart units from every other region's world (island + label)
      const BN = await p.evaluate(() => {
        const s = TKAtlas.view().cam().s, out = []
        const nodes = [...document.querySelectorAll('.atl-node')].map(e => { const a = e.querySelector('.land').getBoundingClientRect(), b = e.querySelector('.lab').getBoundingClientRect(); return { id: e.dataset.w, reg: TKAtlas.NODES[e.dataset.w].r, l: Math.min(a.left, b.left), t: Math.min(a.top, b.top), r: Math.max(a.right, b.right), b: Math.max(a.bottom, b.bottom) } })
        document.querySelectorAll('.atl-ban').forEach(e => {
          const r = e.getBoundingClientRect(), reg = e.dataset.r
          nodes.forEach(n => { if (n.reg === reg) return; const dx = Math.max(n.l - r.right, r.left - n.r, 0), dy = Math.max(n.t - r.bottom, r.top - n.b, 0), g = Math.hypot(dx, dy) / s; if (g < 40) out.push(reg + ' banner ' + Math.round(g) + ' from ' + n.id) })
        })
        return out
      })
      check(!BN.length, `banners stay by their own region's worlds (${BN})`)
      // max zoom-out: past the chart edge is open sea (the vp's own backdrop), never the harbour painting behind the screen
      const ZO = await p.evaluate(async () => {
        const V = TKAtlas.view(); for (let i = 0; i < 8; i++) V.zoom(0.7)
        await new Promise(r => setTimeout(r, 400)); V.pan(-5000, 0); const a = document.querySelector('.atl-world').getBoundingClientRect()
        V.pan(10000, 0); const b = document.querySelector('.atl-world').getBoundingClientRect()
        const bg = getComputedStyle(document.querySelector('.atl-vp')).backgroundColor, box = V.box()
        const s0 = V.cam().s; V.home(); return { s: s0, bg, overR: Math.round(innerWidth - a.right), overL: Math.round(b.left), min: TKAtlas.MIN_S }
      })
      check(Math.abs(ZO.s - ZO.min) < 0.01 && ZO.bg !== 'rgba(0, 0, 0, 0)' && ZO.overR <= 230 && ZO.overL <= 20, `max zoom-out: sea past the chart edge, the chart slides past it only by the side chrome (${JSON.stringify(ZO)})`)
    }

    // chrome never hides a world for good: centred on each world, its island + label clear every bar, button,
    // mini-map and character on screen (the old map's Timmy figure permanently covered the left column)
    const chromeHits = await p.evaluate(() => {
      const V = TKAtlas.view(), vis = e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 0 ? r : null }
      const chrome = [...document.querySelectorAll('#scr-world .topbar > *, #scr-world .w-foot > *, #scr-world .w-foot .bnav, .atl-ctl > *, .atl-mini, #sndfab, #scr-world .w-timmy, #scr-world .w-compass')].map(e => ({ e: (e.id || e.className || e.tagName).toString().slice(0, 24), r: vis(e) })).filter(c => c.r)
      const out = [], hit = (r, c) => r.left < c.r.right - 2 && c.r.left < r.right - 2 && r.top < c.r.bottom - 2 && c.r.top < r.bottom - 2
      const nx0 = document.querySelector('.atl-node.next')
      if (nx0) [nx0.querySelector('.land'), nx0.querySelector('.lab')].forEach(el => { const r = el.getBoundingClientRect(); chrome.forEach(c => { if (hit(r, c)) out.push('start view: next ' + nx0.dataset.w + '~' + c.e) }) })
      TKAtlas.view().api.G.ids.forEach(id => {
        V.center(id, 0)
        const n = document.querySelector('.atl-node[data-w="' + id + '"]'), rs = [n.querySelector('.land').getBoundingClientRect(), n.querySelector('.lab').getBoundingClientRect()]
        rs.forEach(r => chrome.forEach(c => { if (r.left < c.r.right - 2 && c.r.left < r.right - 2 && r.top < c.r.bottom - 2 && c.r.top < r.bottom - 2) out.push(id + '~' + c.e) }))
        if (rs.some(r => r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight)) out.push(id + '~offscreen')
      })
      V.home()
      return out
    })
    check(!chromeHits.length, `${tag}: every world can be shown clear of all chrome (${chromeHits.slice(0, 8)})`)
    // pan (drag) + momentum
    const cx = Math.round(w / 2), cy = Math.round(M.box.top + (h - M.box.top - M.box.bot) / 2)
    await p.evaluate(() => TKAtlas.view().center('maryrose', 0))
    const c0 = await p.evaluate(() => TKAtlas.view().cam())
    await p.touchscreen.touchStart(cx, cy)
    for (let i = 1; i <= 6; i++) { await p.touchscreen.touchMove(cx - i * 25, cy - i * 12); await sleep(16) }
    await p.touchscreen.touchEnd()
    const c1a = await p.evaluate(() => TKAtlas.view().cam())
    // momentum: a quick in-page swipe (real PointerEvents 16 ms apart — CDP touch timing is too slow under load)
    let c1, c2
    for (let tries = 0; tries < 3; tries++) {   // a loaded machine can stall a frame; retry the quick swipe
      c1 = await p.evaluate((x, y) => new Promise(res => {
        TKAtlas.view().center('maryrose', 0)
        const vp = document.querySelector('.atl-vp'), ev = (t, i) => vp.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x - i * 22, clientY: y - i * 10 }))
        ev('pointerdown', 0); let i = 0
        const f = () => { i++; ev('pointermove', i); if (i < 6) setTimeout(f, 16); else { ev('pointerup', i); res(TKAtlas.view().cam()) } }
        setTimeout(f, 16)
      }), cx, cy)
      await sleep(350)
      c2 = await p.evaluate(() => TKAtlas.view().cam())
      if (Math.abs(c2.x - c1.x) > 4 || Math.abs(c2.y - c1.y) > 4) break
    }
    check(Math.abs(c1a.x - c0.x) > 60, `${tag}: drag pans the chart (dx ${Math.round(c1a.x - c0.x)})`)
    check(Math.abs(c2.x - c1.x) > 4 || Math.abs(c2.y - c1.y) > 4, `${tag}: a swipe keeps gliding (momentum ${Math.round(c2.x - c1.x)},${Math.round(c2.y - c1.y)})`)
    // zoom buttons
    const s0 = (await p.evaluate(() => TKAtlas.view().cam())).s
    await p.evaluate(() => document.querySelector('.atl-zi').click()); await settle(p)
    const s1 = (await p.evaluate(() => TKAtlas.view().cam())).s
    await p.evaluate(() => document.querySelector('.atl-zo').click()); await settle(p)
    const s2 = (await p.evaluate(() => TKAtlas.view().cam())).s
    check(s1 > s0 * 1.1 && s2 < s1 * 0.9, `${tag}: zoom in / out buttons (${s0.toFixed(2)} -> ${s1.toFixed(2)} -> ${s2.toFixed(2)})`)
    // pinch (two fingers apart)
    const cdp = await p.target().createCDPSession()
    const tp = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(40) })
    for (let d = 50; d <= 130; d += 20) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(d) }); await sleep(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    const s3 = (await p.evaluate(() => TKAtlas.view().cam())).s
    check(s3 > s2 * 1.15, `${tag}: pinch zooms (${s2.toFixed(2)} -> ${s3.toFixed(2)})`)
    // recenter on Timmy
    await p.evaluate(() => TKAtlas.view().center('pelabuhan', 0))
    await p.evaluate(() => document.querySelector('.atl-me').click()); await settle(p)
    const me = await p.evaluate(() => { const b2 = document.querySelector('.atl-boat').getBoundingClientRect(), V = TKAtlas.view().box(); return { x: b2.left + b2.width / 2, y: b2.top + b2.height / 2, top: V.top, bot: V.bot } })
    check(me.x > 0 && me.x < w && me.y > me.top && me.y < h - me.bot, `${tag}: "Lokasi Timmy" brings Timmy's boat into view (${Math.round(me.x)},${Math.round(me.y)})`)
    // mini-map tap moves the camera (a phone on its side hides the mini-map: no room beside the dock)
    const miniShown = await p.evaluate(() => !document.querySelector('.atl-mini').hidden)
    check(miniShown || (h < 500 && w > h), `${tag}: the mini-map shows (hidden only on a phone on its side)`)
    if (miniShown) {
      const m0 = await p.evaluate(() => TKAtlas.view().cam())
      const mr = await p.evaluate(() => { const r = document.querySelector('.atl-mini').getBoundingClientRect(); return { x: r.left + r.width * 0.9, y: r.top + r.height * 0.85 } })
      await p.touchscreen.tap(mr.x, mr.y); await settle(p)
      const m1 = await p.evaluate(() => TKAtlas.view().cam())
      check(Math.abs(m1.x - m0.x) + Math.abs(m1.y - m0.y) > 30, `${tag}: tapping the mini-map moves the chart`)
    }
    // tap a locked world: shake + hint, stays here
    const lockId = await p.evaluate(() => { const n = document.querySelector('.atl-node.locked'); return n && n.dataset.w })
    if (lockId) {
      await p.evaluate(id => TKAtlas.view().center(id, 0), lockId); await sleep(60)
      const lr = await p.evaluate(id => { const r = document.querySelector('.atl-node[data-w="' + id + '"] .land').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, lockId)
      await p.evaluate(() => { const t = document.getElementById('toast'); t.textContent = ''; t.className = 'toast' })
      await p.touchscreen.tap(lr.x, lr.y); await sleep(60)
      const L = await p.evaluate(id => ({ an: document.querySelector('.atl-node[data-w="' + id + '"] .land').getAnimations().length, toast: document.getElementById('toast').textContent, show: document.getElementById('toast').classList.contains('show'), scr: document.body.getAttribute('data-scr') }), lockId)
      check(L.an > 0 && L.show && L.toast.length > 8 && L.scr === 'scr-world', `${tag}: a locked world (${lockId}) shakes and says why (${JSON.stringify(L)})`)
    } else check(false, `${tag}: a locked world to tap`)
    if (first) await p.screenshot({ path: `${SHOTS}/${tag}-locked-tap.png` })
    // rotation / resize re-lays out and keeps the chart point
    if (tag === '1280x800') {
      await p.evaluate(() => TKAtlas.view().center('vasa', 0))
      await p.setViewport({ width: 800, height: 1280, hasTouch: true, isMobile: true }); await sleep(500)
      const R2 = await p.evaluate(() => { const r = document.querySelector('.atl-node[data-w="vasa"] .land').getBoundingClientRect(), V = TKAtlas.view().box(); return { x: r.left + r.width / 2, w: V.w, h: V.h } })
      check(R2.w === 800 && R2.h === 1280 && Math.abs(R2.x - 400) < 60, `rotation 1280x800 -> 800x1280 re-lays out around the same spot (${JSON.stringify(R2)})`)
      await p.screenshot({ path: `${SHOTS}/rotated-800x1280.png` })
      await p.setViewport({ width: w, height: h, hasTouch: true, isMobile: true }); await sleep(400)
    }
    // tap an open world: the boat sails, then its level map opens
    const openId = await p.evaluate(() => { const n = document.querySelector('.atl-node.next') || document.querySelector('.atl-node.open'); return n.dataset.w })
    await p.evaluate(id => TKAtlas.view().center(id, 0), openId); await sleep(60)
    const orr = await p.evaluate(id => { const r = document.querySelector('.atl-node[data-w="' + id + '"] .land').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, openId)
    await p.touchscreen.tap(orr.x, orr.y)
    if (first) { await sleep(500); await p.screenshot({ path: `${SHOTS}/${tag}-sailing.png` }) }
    await p.waitForFunction(() => document.body.getAttribute('data-scr') === 'scr-map', { timeout: 4000 }).catch(() => {})
    const st = await p.evaluate(() => __tk.state())
    check(st.screen === 'scr-map' && st.world === openId, `${tag}: tapping an open world (${openId}) sails there and opens it (${JSON.stringify(st)})`)
    first = false
  }
  // reduced motion: no momentum loop, the boat still arrives
  await p.setViewport({ width: 1280, height: 800, hasTouch: true, isMobile: true })
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.evaluate(s => { __tk.load(s); __tk.world() }, OLD.early); await sleep(400)
  await p.evaluate(() => TKAtlas.view().center('titanic', 0))
  const tr = await p.evaluate(() => { const r = document.querySelector('.atl-node[data-w="titanic"] .land').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await p.touchscreen.tap(tr.x, tr.y)
  await p.waitForFunction(() => document.body.getAttribute('data-scr') === 'scr-map', { timeout: 3000 }).catch(() => {})
  check((await p.evaluate(() => __tk.state())).world === 'titanic', 'reduced motion: tapping Titanic still opens it')
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
  // a late save: the whole chart, for a look
  await p.evaluate(s => { __tk.load(s); __tk.world() }, OLD.late); await sleep(900)
  await p.evaluate(() => { document.querySelectorAll('.tk-hand').forEach(e => e.remove()); const V = TKAtlas.view(); V.center('cuttysark', 0) })
  await p.screenshot({ path: `${SHOTS}/late-1280x800.png` })
  check(!errs.length, `no page errors (${errs.slice(0, 5)})`)
} finally { await b.close() }
console.log(`\nqa-tk-atlas: ${pass} passed, ${fails.length} failed`)
if (fails.length) { fails.forEach(f => console.log(' - ' + f)); process.exit(1) }
