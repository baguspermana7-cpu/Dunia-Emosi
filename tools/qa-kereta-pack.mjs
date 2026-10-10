// Kereta Pemberani PACK gate (docs/KERETA-ON-MOJO-BRIEF.md): the pack runs on the Mojo engine, and Mojo is untouched.
//   H  headless: every pack level is lint clean + solvable within its slots; the budget is reachable; the solution uses
//      only the palette; the palette holds only needed actions; the narrator's first sentence names the objective and
//      fits the bubble; Mojo's own levels are unchanged when no pack is loaded (the pack edits only its own page)
//   B  browser (needs the dev server on :8081): opens ?pack=kereta with zero page errors at 390x844, 844x390 and
//      1280x800; every level starts; the hero sprite faces its heading; the hint ladder and Tunjukkan Caranya work;
//      the narrator chip is Henry; the plain Mojo page is not skinned
// Run: node tools/qa-kereta-pack.mjs [--headless]
import fs from 'node:fs'
import vm from 'node:vm'
import path from 'node:path'
import assert from 'node:assert/strict'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
let passes = 0; const fails = []
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL  ' + msg) } }

/* ── H headless ─────────────────────────────────────────────────── */
function load (pack) {
  const ctx = { console, Date, Math, JSON }; ctx.window = ctx; ctx.globalThis = ctx
  if (pack) ctx.MojoPack = { id: 'kereta', def: null }
  vm.createContext(ctx)
  const files = ['games/prog-grid.js', 'games/data/mojo-levels.js']
  if (pack) files.push('games/data/kereta-pack-levels.js', 'games/data/kereta-pack.js')
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f })
  return ctx
}
const plain = load(false), ctx = load(true)
const PG = ctx.ProgGrid, ML = ctx.MojoLevels
console.log('--- H headless')
check(plain.MojoLevels.LEVELS.length >= 50 && plain.MojoLevels.LEVELS[0].id === 't1', 'without a pack the Mojo level set is untouched')
check(!plain.MojoLevels.FORMS.linus, 'without a pack there is no Linus form')
check(ML.LEVELS.length >= 5 && ML.LEVELS.every(l => /^bl\d\d$/.test(l.id)), `the pack level set replaces Mojo's (${ML.LEVELS.length} levels)`)
check(ML.LEVELS.every(l => ML.REGIONS.filter(r => r.levels.includes(l.id)).length === 1), 'every pack level sits in exactly one region')
check(ML.REGIONS.every(r => r.levels.every(id => ML.byId(id))), 'every region level exists')
check(new Set(ML.LEVELS.map(l => l.id)).size === ML.LEVELS.length, 'level ids unique')
const starts = lv => {
  const out = []; let w = PG.prep(PG.world(lv), lv, 0)
  for (let bi = 0; bi < lv.beats.length; bi++) {
    if (bi > 0) w = PG.prep(PG.startBeat(w, lv, bi), lv, bi)
    out.push(w)
    const sol = PG.solve(w, lv.beats[bi]); if (!sol) break
    w = PG.run(w, sol, lv.beats[bi], { auto: true }).world
  }
  return out
}
const ACT = { DORONG: 'push', SEMPROT: 'spray', NAIK: 'raise', TURUN: 'lower', TOLONG: 'rescue', PERBAIKI: 'repair', LOMPAT: 'jump', AMBIL: 'pick', TERBANG: 'takeoff',
  ANTAR: 'deliver', GANDENG: 'couple', BUKA: 'unlock', ISI: 'load', TUANG: 'dump', PASANG: 'place', TUNGGU: 'wait' }
const NAMED = ['deliver', 'visit', 'train', 'fill', 'open', 'place', 'carry']
const report = []
for (const lv of ML.LEVELS) {
  const v = PG.verify(lv)
  check(v.ok && v.complete, `${lv.id} "${lv.title}" is solvable beat by beat within its slots ${v.problems.join(' | ')}`)
  check(PG.lintRule(lv).length === 0 && PG.lint(lv).length === 0, `${lv.id}: lint clean ${PG.lint(lv).join(' | ')} ${PG.lintRule(lv).join(' | ')}`)
  const st = starts(lv)
  lv.beats.forEach((b, bi) => {
    const r = v.beats[bi]; report.push(`${lv.id}.${bi + 1} shortest ${r.shortest} budget ${b.budget} slots ${b.slots}`)
    check(r.shortest != null && r.shortest <= b.budget, `${lv.id} beat ${bi + 1}: the three-star budget ${b.budget} is reachable (shortest ${r.shortest})`)
    check(r.shortest != null && b.slots >= r.shortest + 2 && b.slots <= r.shortest + 6, `${lv.id} beat ${bi + 1}: slots ${b.slots} = shortest ${r.shortest} + 2..6`)
    const sol = PG.solve(st[bi], b) || []
    check(sol.every(c => b.palette.includes(c)), `${lv.id} beat ${bi + 1}: the solution uses only palette commands`)
    const extra = b.palette.filter(c => !['up', 'down', 'west', 'east'].includes(c) && !sol.includes(c))
    check(!extra.length, `${lv.id} beat ${bi + 1}: palette holds only needed actions ${extra.join(',')}`)
    const first = (b.bo.match(/^.*?[.!?](?:\s|$)/) || [b.bo])[0].trim().toLowerCase()
    const nouns = (b.objectives || []).map(ob => { const o = (lv.objects || []).find(x => x.id === ob.id)
      return ob.do === 'reach' ? 'bendera' : ob.do === 'wagons' ? 'gerbong' : NAMED.includes(ob.do) ? ((o && o.name) || ob.id).toLowerCase() : ob.id })
    check(first.length <= 64 && nouns.some(n => n && first.includes(n)), `${lv.id} beat ${bi + 1}: the line "${first}" names the objective (${nouns.join('/')}) and fits the bubble (${first.length}/64)`)
    const verbs = new Set(b.palette.map(c => PG.verbOf(c)))
    const named = Object.keys(ACT).filter(k => new RegExp('\\b' + k + '\\b').test(b.bo))
    check(named.every(k => verbs.has(ACT[k])), `${lv.id} beat ${bi + 1}: every action named is in the palette (${named.join(',')})`)
    check(b.forms.every(f => ML.FORMS[f]), `${lv.id}: forms exist`)
  })
  // story fields the Mojo shell reads
  check(lv.title && lv.place && lv.icon && lv.bg && lv.beats.every(b => b.story && b.bo), `${lv.id}: title, place, icon, background, story and narrator line present`)
}
// the art table resolves specific-first / shared-fallback, and every key it names exists in the asset database
const dbKeys = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/db/index.json'), 'utf8')).assets))
const art = ctx.MojoPack.def.art
check(Object.keys(art).length >= 10, `the pack art table lists ${Object.keys(art).length} keys`)
for (const [k, v] of Object.entries(art)) if (v.key) check(dbKeys.has(v.key), `art ${k} -> ${v.key} exists in the database (${v.specific ? 'specific' : 'shared'})`)
check(art['obj/tree'].specific && art['obj/rock'].specific, 'trees and rocks resolve to the storyline pieces (kereta-prop)')
for (const t of ['rail-h', 'rail-v', 'curve-ne', 'crossing', 'bridge', 'grass', 'water']) check(dbKeys.has('kereta-tile/' + t), `rail/ground tile kereta-tile/${t} exists`)
for (const lv of ML.LEVELS) for (const o of lv.objects || []) { const a = o.art || (o.who && 'char/' + o.who); if (a && a.indexOf('/') > 0 && !dbKeys.has(a) && !dbKeys.has(a.replace(/^train\//, 'mojo-train/')) && !(art[a] && dbKeys.has(art[a].key))) check(false, `${lv.id}.${o.id}: art ${a} resolves to a database key`) }
// kid-safe: no emoji anywhere in the pack's words
const words = JSON.stringify(ML.LEVELS.map(l => [l.title, l.place, l.beats, l.objects.map(o => o.name)])) + JSON.stringify(ML.REGIONS)
check(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(words), 'no emoji in the pack text')
if (process.env.QA_VERBOSE || process.argv.includes('--report')) console.log(report.join('\n'))

/* ── B browser ─────────────────────────────────────────────────── */
if (!process.argv.includes('--headless')) {
  const { default: puppeteer } = await import('puppeteer')
  const URL = 'http://localhost:8081/games/mojo-swoptops.html?pack=kereta'
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const errors = []
  async function page (w, h, url) {
    const c = await browser.createBrowserContext(), p = await c.newPage(); p._ctx = c
    await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900, deviceScaleFactor: 1 })
    p.on('pageerror', e => errors.push(`${w}x${h} ${e.message}`)); p.on('requestfailed', r => { if (/\.(webp|js|css)/.test(r.url())) errors.push(`${w}x${h} request failed ${r.url()}`) })
    await p.goto(url || URL, { waitUntil: 'load' }); await p.waitForFunction('window.__mojo && __mojo.ready'); return p
  }
  console.log('--- B browser')
  for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
    const p = await page(w, h)
    check(await p.evaluate(() => document.documentElement.getAttribute('data-pack') === 'kereta'), `${w}x${h}: html data-pack`)
    check(JSON.stringify(await p.evaluate(() => __mojo.levels())) === JSON.stringify(ML.LEVELS.map(l => l.id)), `${w}x${h}: the page runs the pack levels`)
    const home = await p.evaluate(() => ({ play: document.getElementById('play-t').textContent, logo: document.querySelector('.logo').textContent, hid: ['btn-workshop', 'btn-learn', 'btn-race', 'btn-profile'].map(i => getComputedStyle(document.getElementById(i)).display), vis: ['btn-play', 'btn-levels', 'btn-collection'].map(i => { const r = document.getElementById(i).getBoundingClientRect(); return r.width > 40 && r.height > 30 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 }) }))
    check(/MULAI MAIN/.test(home.play) && /Linus/.test(home.logo), `${w}x${h}: landing says MULAI MAIN / Petualangan Linus`)
    check(home.hid.every(d => d === 'none') && home.vis.every(Boolean), `${w}x${h}: landing shows MULAI MAIN / PILIH MISI / Teman, all inside the viewport ${JSON.stringify(home.vis)}`)
    // every level starts and the hero faces its heading
    for (const id of ML.LEVELS.map(l => l.id)) {
      await p.evaluate(id => __mojo.start(id), id); await sleep(150)
      const intro = await p.$('#in-go'); if (intro) { await intro.click(); await sleep(80) }
      const st = await p.evaluate(() => { const s = __mojo.state(), m = document.querySelector('#mojo-mod img'); return { id: s.id, h: s.position.h, src: m && m.getAttribute('src'), form: s.form, bo: document.getElementById('bo-img').getAttribute('src') } })
      const want = ['top-n', 'top-e', 'top-s', 'top-w'][st.h]
      check(st.id === id && st.form === 'linus' && st.src && st.src.indexOf('linus/' + want) > 0, `${w}x${h} ${id}: Linus faces his heading (${want}) -> ${st.src}`)
      check(/henry/.test(st.bo), `${w}x${h} ${id}: the narrator chip is Henry`)
      if (await p.$('#ov-card.on #picker-later')) await (await p.$('#picker-later')).click()
    }
    await p._ctx.close()
  }
  {
    // the hint ladder and Tunjukkan Caranya on the Mojo engine, in the pack
    const p = await page(1280, 800)
    await p.evaluate(() => __mojo.start('bl01')); await sleep(150); const g = await p.$('#in-go'); if (g) await g.click()
    await (await p.$('#btn-hint')).click(); await sleep(100)
    const h1 = await p.evaluate(() => __mojo.state().hint); check(h1 >= 1, 'the hint ladder climbs one rung per tap')
    const sol = await p.evaluate(() => __mojo.solution()); check(Array.isArray(sol) && sol.length === 6, `Tunjukkan Caranya has a plan (${sol && sol.length})`)
    for (const c of sol) { const b = await p.$(`[data-cmd="${c}"]`); await b.click(); await sleep(30) }
    await (await p.$('#btn-run')).click(); await p.waitForFunction(() => document.querySelector('#ov-card.on .result, #ov-card.on .card'), { timeout: 15000 }).catch(() => {})
    check(await p.evaluate(() => !!document.querySelector('#ov-card.on')), 'solving bl01 with real taps ends in the result card')
    await p._ctx.close()
  }
  {
    const p = await page(1280, 800, 'http://localhost:8081/games/mojo-swoptops.html')
    check(await p.evaluate(() => !document.documentElement.getAttribute('data-pack') && __mojo.levels()[0] === 't1' && /Swoptops/.test(document.querySelector('.logo').textContent)), 'the plain Mojo page is not skinned')
    await p._ctx.close()
  }
  const real = errors.filter(e => !/favicon/.test(e))
  check(real.length === 0, 'zero page errors / failed requests: ' + real.slice(0, 4).join(' | '))
  await browser.close()
}
console.log(`\n${passes} passed, ${fails.length} failed`)
process.exit(fails.length ? 1 : 0)
