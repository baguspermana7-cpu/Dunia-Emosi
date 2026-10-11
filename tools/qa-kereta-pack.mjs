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
  if (pack) files.push('games/data/kereta-cast.js', (STORY === 'brave' ? 'games/data/kereta-pack-levels.js' : `games/data/kereta-pack-levels-${STORY}.js`), 'games/data/kereta-pack.js')
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f })
  return ctx
}
const STORY = process.env.QA_STORY || 'brave', PFX = { brave: 'bl', malivlak: 'mv', hellbent: 'hb' }[STORY]
const plain = load(false), ctx = load(true)
const PG = ctx.ProgGrid, ML = ctx.MojoLevels
console.log('--- H headless')
check(plain.MojoLevels.LEVELS.length >= 50 && plain.MojoLevels.LEVELS[0].id === 't1', 'without a pack the Mojo level set is untouched')
check(!plain.MojoLevels.FORMS.linus, 'without a pack there is no Linus form')
check(ML.LEVELS.length >= 4 && ML.LEVELS.every(l => new RegExp('^' + PFX + '\\d\\d$').test(l.id)), `the pack level set replaces Mojo's (${ML.LEVELS.length} levels)`)
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
    const r = v.beats[bi] || { shortest: null }; report.push(`${lv.id}.${bi + 1} shortest ${r.shortest} budget ${b.budget} slots ${b.slots}`)
    check(r.shortest != null && r.shortest <= b.budget, `${lv.id} beat ${bi + 1}: the three-star budget ${b.budget} is reachable (shortest ${r.shortest})`)
    check(r.shortest != null && b.slots >= r.shortest + 2 && b.slots <= r.shortest + 6, `${lv.id} beat ${bi + 1}: slots ${b.slots} = shortest ${r.shortest} + 2..6`)
    const sol = (st[bi] && PG.solve(st[bi], b)) || []
    check(sol.every(c => b.palette.includes(c)), `${lv.id} beat ${bi + 1}: the solution uses only palette commands`)
    const extra = b.palette.filter(c => !['up', 'down', 'west', 'east'].includes(c) && !sol.includes(c))
    check(!extra.length, `${lv.id} beat ${bi + 1}: palette holds only needed actions ${extra.join(',')}`)
    const first = (b.bo.match(/^.*?[.!?](?:\s|$)/) || [b.bo])[0].trim().toLowerCase()
    const nouns = (b.objectives || []).map(ob => { const o = (lv.objects || []).find(x => x.id === ob.id)
      return ob.do === 'reach' ? 'bendera' : ob.do === 'star' ? 'bintang' : ob.do === 'wagons' ? 'gerbong' : NAMED.includes(ob.do) ? ((o && o.name) || ob.id).toLowerCase() : ob.id })
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
// owner rules 1, 2, 4: scenario-accurate + varied, every cast asset of the built scenarios used, text stays short
const KC = ctx.KeretaCast, LIBK = ctx.KeretaPackLevels.LIB
const sig = lv => lv.beats.map(b => (b.objectives.map(o => o.do).sort().join('+') + '|' + b.palette.filter(c => !['up', 'down', 'west', 'east'].includes(c)).sort().join(','))).join('/')
for (let i = 1; i < ML.LEVELS.length; i++) check(sig(ML.LEVELS[i]) !== sig(ML.LEVELS[i - 1]), `${ML.LEVELS[i - 1].id} and ${ML.LEVELS[i].id} play differently (${sig(ML.LEVELS[i - 1])} vs ${sig(ML.LEVELS[i])})`)
const used = new Set(), resolve = a => { if (!a) return; used.add(a); if (LIBK[a]) used.add(LIBK[a]) }
for (const lv of ML.LEVELS) { (lv.decor || []).forEach(d => { resolve(d.art); if (d.react) resolve(d.react) }); lv.beats.forEach(b => (b.decor || []).forEach(d => { resolve(d.art); if (d.react) resolve(d.react) })); (lv.cards || []).forEach(c => (c.art || []).forEach(a => resolve(a.k))); if (lv.cab) resolve(lv.cab); (lv.uses || []).forEach(resolve); (lv.objects || []).forEach(o => { resolve(o.art); if (o.who) resolve('char/' + o.who) }) }
// story rigs (kereta-story.js): a cave mouth carries Goro; a tow carries Carter (every pose of him rides the logs)
for (const lv of ML.LEVELS) { if (lv.cave || lv.beats.some(b => b.cave)) ['front-34l', 'front-34r'].forEach(k => used.add('train-char/goro-loco/' + k)); if (lv.tow) [...dbKeys].filter(k => /^story-char\/carter\//.test(k)).forEach(k => used.add(k)) }
// owner 2026-10-11: exactly ONE Goro per board (a cave, or the patrol, never a standing copy beside it); Carter rides the logs, not the grass
for (const lv of ML.LEVELS) lv.beats.forEach((b, i) => {
  const dec = (b.decor || lv.decor || []).concat(lv.objects || []), goros = dec.filter(d => /goro/.test(d.art || '')).length + ((b.cave || lv.cave) && (b.cave || lv.cave).goro ? 1 : 0)
  check(goros <= 1, `${lv.id}.${i}: at most one Goro on the board (${goros})`)
  if (lv.tow) check(!dec.some(d => /story-char\/carter/.test(d.art || '')), `${lv.id}.${i}: Carter rides the logs, no second Carter on the grass`)
})
// cast keys skipped on purpose (alignment doc, owner 2026-10-11): sc4 child holding the turtle = Scarlet-era sc27 only; Scarlet and Henry never at the
// logging line / bridge-lookout (sc14, 15-16); the sc15-16 cast list in kereta-cast.js predates the alignment doc
const EXCLUDED = new Set(['story-char/anak-kura/hold', 'story-char/scarlet/cemas-atas', 'story-char/henry/worried'])
// owner kid-safe rule: no chains, whips or weapons ART in the database used by a level (the owner's 2026-10-11 exception is drawn by the pack: coupling chain, in-air whip, cartoon shot)
const UNSAFE = [...dbKeys].filter(k => /(chain|whip|gun|pistol|rifle|weapon|senjata|rantai|cambuk|senapan|knife|sword)/i.test(k))
check(UNSAFE.every(k => !used.has(k)), `no unsafe art used (${UNSAFE.length} unsafe keys exist in the database: ${UNSAFE.slice(0, 4).join(', ')})`)
for (const lv of ML.LEVELS) check(Number.isInteger(lv.n), `${lv.id}: names its scenario number`)
for (const lv of ML.LEVELS) for (const n of (lv.ns || [lv.n])) for (const k of (STORY === 'hellbent' ? [] : (KC[STORY][String(n)] || []))) if (!EXCLUDED.has(k)) check(used.has(k), `${lv.id} (scenario ${n}): cast ${k} is used`)
for (const lv of ML.LEVELS) {
  check(lv.title.length <= 28, `${lv.id}: title short (${lv.title.length})`)
  lv.beats.forEach((b, bi) => { check(b.bo.split(/\s+/).length <= 8, `${lv.id}.${bi + 1}: the narrator line has <= 8 words ("${b.bo}")`); check(b.story.length <= 60, `${lv.id}.${bi + 1}: the story line is one short line (${b.story.length} chars)`) })
}
// owner 2026-10-11: each storyline uses ONLY its own cast. Brave levels (bl*) never show malivlak-char / tk-char / other trains' sprites.
const ART_OF = lv => { const o = []; const add = a => { if (a) { o.push(a); if (LIBK[a]) o.push(LIBK[a]) } }
  ;(lv.decor || []).forEach(d => { add(d.art); add(d.react) }); lv.beats.forEach(b => (b.decor || []).forEach(d => { add(d.art); add(d.react) })); (lv.cards || []).forEach(c => (c.art || []).forEach(a => add(a.k)))
  ;(lv.objects || []).forEach(x => { add(x.art); if (x.who) add('char/' + x.who) }); add(lv.cab); return o }
const FOREIGN = { bl: /^(malivlak-char|tk-char|mojo-char|mojo-cross|train-char\/(malivlak|dragutin|silver|defeatist))/ , mv: /^(story-char|tk-char|mojo-char|train-char\/(linus|samson|goro|silver|defeatist|coach-green|caboose|rongsokan))/, hb: /^(story-char|malivlak-char|tk-char|mojo-char|train-char\/(linus|samson|goro|malivlak|dragutin|rongsokan))/ }
for (const lv of ML.LEVELS) { const bad = ART_OF(lv).filter(k => FOREIGN[lv.id.slice(0, 2)] && FOREIGN[lv.id.slice(0, 2)].test(k)); check(bad.length === 0, `${lv.id}: only its own storyline's cast (foreign: ${bad.join(', ')})`) }
// VFX hygiene (owner 2026-10-11, the brake smoke drew a black square with a lightning bolt): every effect id the pack names exists in the
// shared bank, is licence-cleared and kid-safe, is not an electric bolt (bk-spark-*, bk-trace-*: storm only) and is not the hard-edged full-frame dark sheet
const VFXDB = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/vfx/vfx-db.json'), 'utf8')).effects.map(e => [e.id, e]))
const PACK_SRC = ['games/data/kereta-cine.js', 'games/data/kereta-story.js', 'games/data/kereta-goals.js', 'games/data/kereta-pack-levels.js', 'games/data/kereta-pack-levels-malivlak.js', 'games/data/kereta-pack-levels-hellbent.js'].map(f => fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '').join('\n')
const FXIDS = [...new Set([...PACK_SRC.matchAll(/'((?:bk|px)-[a-z0-9-]+)'/g)].map(m => m[1]))]
for (const id of FXIDS) {
  const e = VFXDB[id]
  check(!!e, `vfx ${id} exists in the shared bank`)
  if (!e) continue
  check(e.kid_safe !== false && e.license && ['cc0', 'public-domain'].includes(e.license.status), `vfx ${id} is kid-safe and licence-cleared`)
  check(!(e.tags || []).includes('electric'), `vfx ${id} is not an electric bolt (lightning only in storm levels)`)
  check(!(e.kind === 'sheet' && e.blend === 'normal' && (e.fill || 1) >= 0.99), `vfx ${id} is not a hard-edged full-frame sheet (it draws as a square)`)
}
// FIGURES (owner 2026-10-11, bl05: "Kak Aisyah" drawn as a man, one man three times, heads cut by the board's top edge): on one beat no two figures share a
// character (story-char/<who>, malivlak-char/<who>); a figure never stands on row 0 (the pack adds a headroom row); and every figure's art has a name-table entry
const FIGK = /^((?:story-char|malivlak-char)\/[^/]+)\//
const figOf = a => { const k = LIBK[a] || a; const m = FIGK.exec(k || ''); return m ? m[1] : null }
for (const lv of ML.LEVELS) lv.beats.forEach((b, bi) => {
  const hide = b.hide || [], uses = (b.objectives || []).some(o => ['deliver', 'visit'].includes(o.do))
  const figs = []
  ;(b.decor || lv.decor || []).forEach(d => { figs.push([d.art, d.at]); if (d.react) figs.push([d.react, null]) })
  ;(lv.objects || []).filter(o => !hide.includes(o.id)).forEach(o => { if (o.type === 'rider' && uses) figs.push(['char/' + o.who, o.at]); else if (o.art && figOf(o.art)) figs.push([o.art, o.at]) })
  if (lv.cab) figs.push([lv.cab, null])
  const by = {}; figs.forEach(([a, at]) => { const k = figOf(a); if (k) (by[k] = by[k] || new Set()).add(a) })
  // a decor figure and its own react pose are the same person (one board figure); two DIFFERENT figure entries of one character are not
  const people = {}; figs.forEach(([a, at], i) => { const k = figOf(a); if (k && at) people[k] = (people[k] || 0) + 1 })
  const dup = Object.entries(people).filter(([k, n]) => n > 1).map(([k]) => k)
  check(dup.length === 0, `${lv.id}.${bi}: no two figures share a character on one board (${dup.join(',')})`)
  const row0 = figs.filter(([a, at]) => at && at[0] === 0 && figOf(a))
  check(row0.length === 0, `${lv.id}.${bi}: no figure stands on the top row (headroom row) ${row0.map(f => f[0]).join(',')}`)
})
// kid-safe: no emoji anywhere in the pack's words
const words = JSON.stringify(ML.LEVELS.map(l => [l.title, l.place, l.beats, l.objects.map(o => o.name)])) + JSON.stringify(ML.REGIONS)
check(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(words), 'no emoji in the pack text')
if (process.env.QA_VERBOSE || process.argv.includes('--report')) console.log(report.join('\n'))

/* ── B browser ─────────────────────────────────────────────────── */
if (!process.argv.includes('--headless')) {
  const { default: puppeteer } = await import('puppeteer')
  const BASE = process.env.KBASE || 'http://localhost:8081', URL = BASE + '/games/mojo-swoptops.html?pack=kereta' + (STORY === 'brave' ? '' : '&story=' + STORY)
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const DEF = ctx.MojoPack.def, HEROES = DEF.story.heroes, NARR_KEY = DEF.narrator.art.wave.split('/')[1] === 'face-happy' ? 'silver' : DEF.narrator.art.wave.split('/')[1]
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const errors = []
  async function page (w, h, url) {
    const c = await browser.createBrowserContext(), p = await c.newPage(); p._ctx = c
    await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900, deviceScaleFactor: 1 })
    p.on('pageerror', e => errors.push(`${w}x${h} ${e.message}`)); p.on('requestfailed', r => { if (/\.(webp|js|css)/.test(r.url()) && !/ERR_ABORTED/.test((r.failure() || {}).errorText || '')) errors.push(`${w}x${h} request failed ${r.url()}`) })
    await p.goto(url || URL, { waitUntil: 'load' }); await p.waitForFunction('window.__mojo && __mojo.ready'); return p
  }
  console.log('--- B browser')
  for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
    const p = await page(w, h)
    check(await p.evaluate(() => document.documentElement.getAttribute('data-pack') === 'kereta'), `${w}x${h}: html data-pack`)
    check(JSON.stringify(await p.evaluate(() => __mojo.levels())) === JSON.stringify(ML.LEVELS.map(l => l.id)), `${w}x${h}: the page runs the pack levels`)
    const home = await p.evaluate(() => ({ play: document.getElementById('play-t').textContent, logo: document.querySelector('.logo').textContent, hid: ['btn-workshop', 'btn-learn', 'btn-race', 'btn-profile'].map(i => getComputedStyle(document.getElementById(i)).display), vis: ['btn-play', 'btn-levels', 'btn-collection'].map(i => { const r = document.getElementById(i).getBoundingClientRect(); return r.width > 40 && r.height > 30 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 }) }))
    check(/MULAI MAIN/.test(home.play) && new RegExp(DEF.story.logo[1]).test(home.logo), `${w}x${h}: landing says MULAI MAIN / ${DEF.story.logo.join(' ')}`)
    check(home.hid.every(d => d === 'none') && home.vis.every(Boolean), `${w}x${h}: landing shows MULAI MAIN / PILIH MISI / Teman, all inside the viewport ${JSON.stringify(home.vis)}`)
    // every level starts and the hero faces its heading
    for (const id of ML.LEVELS.map(l => l.id)) {
      await p.evaluate(id => __mojo.start(id), id); await sleep(150)
      const intro = await p.$('#in-go'); if (intro) { await intro.click(); await sleep(80) }
      const st = await p.evaluate(() => { const s = __mojo.state(), m = document.querySelector('#mojo-mod img'); return { id: s.id, h: s.position.h, src: m && m.getAttribute('src'), form: s.form, bo: document.getElementById('bo-img').getAttribute('src') } })
      // owner 2026-10-11: the board stays flat and Linus STANDS on it, drawn from the side he shows (kereta-cam.js)
      const topCam = ML.byId(id).view === 'top'
      const want = (topCam ? ['top-n', 'top-e', 'top-s', 'top-w'] : ['rear', 'front-34r', 'front', 'front-34l'])[st.h]
      check(st.id === id && !!HEROES[st.form] && st.src && st.src.indexOf(HEROES[st.form].sprite + '/' + want + '.') > 0, `${w}x${h} ${id}: Linus faces his heading (${want}) -> ${st.src}`)
      // every name tag matches the art drawn under it (a figure takes its label from the art, never from a level's rider name)
      const tags = await p.evaluate(() => [...document.querySelectorAll('#decor .dec.cast, #objs .ob')].map(h => { const t = h.querySelector(':scope > .k-name'), i = h.querySelector('img.main, img'); const m = i && /assets\/db\/lib\/(.+?)\.webp/.exec(i.getAttribute('src') || ''); return t && m ? [t.textContent, m[1], h.className] : null }).filter(Boolean))
      const wrong = await p.evaluate(tags => tags.filter(([txt, key, cls]) => /^(story-char|malivlak-char|train-char)\//.test(key) && !/\bstop\b/.test(cls) && MojoPack.def.nameOf(key) && MojoPack.def.nameOf(key) !== txt), tags)
      check(wrong.length === 0, `${w}x${h} ${id}: every figure's name tag matches its drawn art ${JSON.stringify(wrong.slice(0, 3))}`)
      check(new RegExp(NARR_KEY).test(st.bo), `${w}x${h} ${id}: the narrator chip is ${DEF.narrator.name}`)
      if (await p.$('#ov-card.on #picker-later')) await (await p.$('#picker-later')).click()
    }
    await p._ctx.close()
  }
  {
    // every effect drawn on the board honours its record's blend (screen records MUST be mix-blend-mode:screen), at phone dpr 2 and desktop
    for (const [w, h, dpr] of [[390, 844, 2], [1280, 800, 1]]) {
      const c = await browser.createBrowserContext(), p = await c.newPage()
      await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900, deviceScaleFactor: dpr })
      await p.goto(URL, { waitUntil: 'load' }); await p.waitForFunction('window.__mojo && __mojo.ready')
      const cineIds = ML.LEVELS.filter(l => l.cine && /^bl0[34]$/.test(l.id)).map(l => l.id)
      const seen = {}
      for (const id of cineIds) {
        await p.evaluate(id => __mojo.start(id), id); await sleep(400); const g = await p.$('#in-go'); if (g) await g.click(); await sleep(300)
        const sol = await p.evaluate(() => __mojo.solution()); for (const cmd of sol || []) { const b2 = await p.$(`[data-cmd="${cmd}"]`); if (b2) await b2.click() }
        await (await p.$('#btn-run')).click()
        for (let i = 0; i < 40; i++) {
          const got = await p.evaluate(() => [...document.querySelectorAll('[data-vfx]')].map(e => [e.getAttribute('data-vfx'), getComputedStyle(e).mixBlendMode]))
          got.forEach(([k, v]) => { seen[k] = v }); await sleep(150)
          if (await p.$('#ov-card.on')) break
        }
      }
      const bad = Object.entries(seen).filter(([k, v]) => VFXDB[k] && VFXDB[k].blend === 'screen' && v !== 'screen')
      if (STORY === "brave") check(Object.keys(seen).length > 0, `${w}x${h}@${dpr}: the cinematics drew effects (${Object.keys(seen).join(',')})`)
      check(bad.length === 0, `${w}x${h}@${dpr}: every screen-blend effect is drawn with mix-blend-mode:screen ${JSON.stringify(bad)}`)
      check(Object.keys(seen).every(k => !(VFXDB[k].tags || []).includes('electric')), `${w}x${h}@${dpr}: no lightning bolt effect on a sunny board`)
      await c.close()
    }
  }
  {
    // the hint ladder and Tunjukkan Caranya on the Mojo engine, in the pack
    const p = await page(1280, 800)
    await p.evaluate(id => __mojo.start(id), ML.LEVELS[0].id); await sleep(150); const g = await p.$('#in-go'); if (g) await g.click()
    await (await p.$('#btn-hint')).click(); await sleep(100)
    const h1 = await p.evaluate(() => __mojo.state().hint); check(h1 >= 1, 'the hint ladder climbs one rung per tap')
    const sol = await p.evaluate(() => __mojo.solution()); check(Array.isArray(sol) && sol.length >= 3, `Tunjukkan Caranya has a plan (${sol && sol.length})`)
    for (const c of sol) { const b = await p.$(`[data-cmd="${c}"]`); await b.click(); await sleep(30) }
    await (await p.$('#btn-run')).click(); await p.waitForFunction(() => document.querySelector('#ov-card.on .result, #ov-card.on .card'), { timeout: 15000 }).catch(() => {})
    check(await p.evaluate(() => !!document.querySelector('#ov-card.on')), 'solving the first level with real taps ends in the result card')
    await p._ctx.close()
  }
  {
    // the hub: only built storylines + the classic game; no "segera hadir"; the classic game opens; a card starts the pack
    for (const [w, h] of [[1280, 800], [390, 844]]) {
      const p = await page(w, h, URL + '&hub=1')
      const cards = await p.evaluate(() => [...document.querySelectorAll('.k-hub-card')].map(c => { const r = c.getBoundingClientRect(); return { id: c.dataset.story, ok: r.width > 80 && r.right <= innerWidth + 1 && r.left >= -1 } }))
      check(cards.some(c => c.id === 'brave') && cards.some(c => c.id === 'classic') && cards.every(c => c.ok), `${w}x${h}: hub shows Brave + classic inside the viewport ${JSON.stringify(cards)}`)
      check(!(await p.evaluate(() => /segera/i.test(document.body.innerText))), `${w}x${h}: no "segera hadir" on the hub`)
      await Promise.all([p.waitForNavigation({ waitUntil: 'load' }), p.click('[data-story="classic"]')])
      check(/lokomotif-pemberani\.html/.test(p.url()), `${w}x${h}: the classic card opens the classic game`)
      await p._ctx.close()
    }
  }
  {
    const p = await page(1280, 800, BASE + '/games/mojo-swoptops.html')
    check(await p.evaluate(() => !document.documentElement.getAttribute('data-pack') && __mojo.levels()[0] === 't1' && /Swoptops/.test(document.querySelector('.logo').textContent)), 'the plain Mojo page is not skinned')
    await p._ctx.close()
  }
  const real = errors.filter(e => !/favicon/.test(e))
  check(real.length === 0, 'zero page errors / failed requests: ' + real.slice(0, 4).join(' | '))
  await browser.close()
}
console.log(`\n${passes} passed, ${fails.length} failed`)
process.exit(fails.length ? 1 : 0)
