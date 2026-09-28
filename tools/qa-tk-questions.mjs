// G30 Timmy & Kapal Legendaris — learning-engine gate (PRD §9 qa-tk-questions).
//   A) node: 5,000 generated Matematika items per level (1–4) all valid: exactly one correct answer
//      among 4 distinct choices, no negatives, operands/answers inside the grade range (10 / 20),
//      plus every kind forced across seeds; mastery → tier mapping.
//   B) node: curated bank schema, unique ids, counts per domain (islam>=60, arab>=60, umum>=80,
//      logika>=60), answer in choices, choices distinct, every sprite key exists on disk
//      (assets/db/lib/<key>.webp), ship-history facts carry verified:false + source,
//      Islamic filter removes every islam item (pick/build/sortSet/campur), Arabic items are rtl
//      and contain Arabic letters, sort sets are complete and solvable.
//   C) puppeteer (tools/tk-harness-quiz.html, 390x844 + 1024x768): a 5-question set answered right
//      and wrong through real taps, hint ladder reaches guided completion, sort drag works,
//      RTL renders (computed direction rtl), arrange letters, targets >= 56 px, no page errors.
//      Screenshots -> $TKQ_SHOTS (default: the session scratchpad tk-quiz/).
// Run: node tools/qa-tk-questions.mjs   (needs the dev server on :8081 for part C; QA_NODE_ONLY=1 skips it)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const require = createRequire(import.meta.url)
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL ' + msg) } }

globalThis.window = globalThis
require(path.join(ROOT, 'games/data/tk-questions.js'))
require(path.join(ROOT, 'games/tk-quiz.js'))
const TQ = globalThis.TKQuestions, TK = globalThis.TKQuiz
const exists = k => fs.existsSync(path.join(ROOT, 'assets/db/lib', k + '.webp'))
const AR_RE = /[؀-ۿ]/

/* ── A. generated math ─────────────────────────────────────────────────── */
{
  const kindsSeen = {}
  for (let level = 1; level <= 4; level++) {
    let bad = 0, first = null
    const r = TK.rng(1000 + level)
    const worlds = [null, 'titanic', 'queenmary', 'calypso', 'endurance', 'britannic']
    for (let i = 0; i < 5000; i++) {
      const q = TK.make('matematika', level, r, { world: worlds[i % worlds.length] })
      const p = TK.validate(q)
      kindsSeen[level + ':' + q.kind] = (kindsSeen[level + ':' + q.kind] || 0) + 1
      if (!q.prompt || !q.explain || !q.hint1 || !q.hint2 || !q.step1) p.push('missing text')
      ;(q.visual || []).forEach(k => { if (!exists(k)) p.push('sprite missing ' + k) })
      if (p.length) { bad++; if (!first) first = JSON.stringify({ q: q.prompt, ch: q.choices, a: q.answer, p }) }
    }
    check(bad === 0, `math L${level}: ${bad}/5000 invalid ${first || ''}`)
  }
  // every kind at every level where it is scheduled, forced across seeds
  const KIND_LEVELS = { count: [1, 2], add: [1, 2, 3], sub: [1, 2, 3], biggest: [1], groups: [2, 3], clock: [1, 2, 3, 4], diff: [2, 4], share: [3, 4], capacity: [3, 4], twostep: [4], groupsplus: [4] }
  let forced = 0, fbad = []
  for (const [kind, lvls] of Object.entries(KIND_LEVELS)) for (const lv of lvls) {
    const r = TK.rng(77 + lv)
    for (let i = 0; i < 500; i++) { const q = TK.make('matematika', lv, r, { kind }); forced++; const p = TK.validate(q); if (p.length && fbad.length < 3) fbad.push(kind + ' L' + lv + ' ' + p.join(';')) }
  }
  check(fbad.length === 0, `forced kinds (${forced} items): ${fbad.join(' | ')}`)
  const clockHalf = TK.make('matematika', 3, TK.rng(5), { kind: 'clock' })
  check(/Pukul/.test(clockHalf.answer), 'clock answer is a Pukul label')
  check(TK.clockLabel(3, 30) === 'Pukul setengah 4' && TK.clockLabel(12, 30) === 'Pukul setengah 1', 'clock half-hour labels (setengah h+1, 12:30 -> setengah 1)')
  console.log('math kinds seen:', Object.keys(kindsSeen).sort().join(' '))
  // mastery
  const M = TK.mastery
  check([0, 30, 31, 60, 61, 80, 81, 100].map(M.tier).join('') === '11223344', 'mastery tiers 0–30/31–60/61–80/81–100')
  check(M.present(70).key === 'context' && M.present(10).objects && M.present(90).key === 'twostep', 'mastery presentation keys')
  check(M.levelFor(95, 1) === 2 && M.levelFor(0, 2) === 2 && M.levelFor(70, 'adaptif') === 3, 'levelFor respects Kelas 1 (<=10) / Kelas 2 (>=L2)')
  check(M.update(50, { right: true, firstTry: true, streak: 3 }) > 50 && M.update(2, { right: false }) === 0 && M.update(99, { right: true, firstTry: true, streak: 9 }) === 100, 'mastery update clamps 0..100')
}

/* ── B. curated bank ───────────────────────────────────────────────────── */
{
  const items = TQ.items, ids = new Set(), counts = {}
  const DOM = new Set(['islam', 'arab', 'umum', 'logika'])
  let schemaBad = []
  const bad = (o, m) => { if (schemaBad.length < 12) schemaBad.push(o.id + ': ' + m) }
  for (const o of items) {
    counts[o.domain] = (counts[o.domain] || 0) + 1
    if (ids.has(o.id)) bad(o, 'duplicate id'); ids.add(o.id)
    if (!DOM.has(o.domain)) bad(o, 'domain ' + o.domain)
    if (![1, 2, 3, 4].includes(o.level)) bad(o, 'level ' + o.level)
    for (const f of ['prompt', 'explain', 'hint1', 'hint2', 'answer']) if (typeof o[f] !== 'string' || !o[f].trim()) bad(o, 'missing ' + f)
    if (!Array.isArray(o.choices) || o.choices.length !== 4) bad(o, 'choices != 4')
    else {
      if (new Set(o.choices).size !== 4) bad(o, 'choices not distinct ' + o.choices.join('|'))
      if (o.choices.filter(c => c === o.answer).length !== 1) bad(o, 'answer not in choices once')
      if (o.choices.some(c => typeof c !== 'string' || !c.trim())) bad(o, 'empty choice')
    }
    for (const k of o.visual || []) if (!exists(k)) bad(o, 'visual sprite missing ' + k)
    if (o.pics) { for (const c of o.choices) if (!o.pics[c]) bad(o, 'pics missing for ' + c); for (const k of Object.values(o.pics)) if (!exists(k)) bad(o, 'pic sprite missing ' + k) }
    if (o.domain === 'islam' && o.islam !== true) bad(o, 'islam item without islam:true')
    if (o.domain !== 'islam' && o.islam) bad(o, 'islam flag outside the islam domain')
    if (o.domain === 'arab') {
      if (o.rtl !== true) bad(o, 'arab item not rtl')
      if (!AR_RE.test([o.prompt, o.ar || '', o.listen || '', ...o.choices].join(' '))) bad(o, 'no Arabic letters')
      if (!o.tr) bad(o, 'no transliteration (listen/text fallback)')
      if (!o.letters) for (const c of o.choices) if (AR_RE.test(c) && !(o.trs && o.trs[c])) bad(o, 'Arabic choice without transliteration ' + c)   // arrange items render tiles, not choices
      if (o.letters && o.letters.join('').split('').sort().join('') !== o.answer.split('').sort().join('')) bad(o, 'letters do not spell the answer')
    }
    // a 4-digit year or a named historic ship = a history fact -> must be marked for editor review
    const text = [o.prompt, o.explain, ...o.choices].join(' ')
    if (o.domain === 'umum' && /\b(1[5-9]\d\d|20[0-2]\d)\b/.test(text) && o.verified !== false) bad(o, 'dated fact without verified:false')
    if (o.verified === false && !(typeof o.source === 'string' && o.source.length > 8)) bad(o, 'verified:false without source')
    if (o.world && !['kamar', 'titanic', 'britannic', 'vasa', 'cuttysark', 'victory', 'mayflower', 'endurance', 'kontiki', 'calypso', 'queenmary', 'arizona', 'missouri', 'nautilus', 'pelabuhan'].includes(o.world)) bad(o, 'unknown world ' + o.world)
    if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text + o.hint1 + o.hint2)) bad(o, 'emoji in text')
  }
  check(schemaBad.length === 0, 'curated schema: ' + schemaBad.join(' | '))
  console.log('curated counts:', JSON.stringify(counts), 'total', items.length, '| history facts for review:', items.filter(o => o.verified === false).length)
  check((counts.islam || 0) >= 60, 'islam >= 60 (' + counts.islam + ')')
  check((counts.arab || 0) >= 60, 'arab >= 60 (' + counts.arab + ')')
  check((counts.umum || 0) >= 80, 'umum >= 80 (' + counts.umum + ')')
  check((counts.logika || 0) >= 60, 'logika >= 60 (' + counts.logika + ')')
  for (const d of ['islam', 'arab', 'umum', 'logika']) for (let lv = 1; lv <= 4; lv++) check(items.some(o => o.domain === d && o.level === lv), `${d} has level ${lv} items`)

  // Islamic toggle: nothing Islamic may ever come out with islam:false
  const r = TK.rng(9)
  let leaks = 0
  for (let i = 0; i < 400; i++) {
    for (const q of TK.build({ domain: 'campur', count: 5, islam: false, seed: i, world: ['titanic', 'calypso', null][i % 3] })) if (q.islam || q.domain === 'islam') leaks++
    for (const q of TK.build({ domain: 'islam', count: 3, islam: false, seed: i })) if (q.islam) leaks++
    const s = TK.sortSet('islam', null, r, { islam: false }); if (s.islam) leaks++
  }
  check(TK.pick('islam', 2, r, { islam: false }) === null, 'pick(islam, islam:false) -> null')
  check(leaks === 0, 'Islamic filter removes all islam items (' + leaks + ' leaks)')
  // with islam on, the domain is reachable
  check(TK.build({ domain: 'campur', count: 60, islam: true, seed: 3 }).some(q => q.domain === 'islam'), 'campur reaches islam when enabled')
  // world preference
  const tq = Array.from({ length: 60 }, (_, i) => TK.pick('umum', 2, TK.rng(i), { world: 'titanic' }))
  check(tq.filter(q => q.world === 'titanic').length >= 40, 'world preference: titanic umum picks mostly titanic items (' + tq.filter(q => q.world === 'titanic').length + '/60)')
  const qm = Array.from({ length: 60 }, (_, i) => TK.make('matematika', 2, TK.rng(i), { world: 'queenmary' }))
  check(qm.filter(q => q.kind === 'clock').length >= 25, 'queenmary math leans on clocks (' + qm.filter(q => q.kind === 'clock').length + '/60)')
  // build: unique ids, requested count
  for (const d of ['matematika', 'umum', 'arab', 'logika', 'islam', 'campur']) {
    const set = TK.build({ domain: d, count: 5, seed: 42, world: 'titanic' })
    check(set.length === 5 && new Set(set.map(q => q.id)).size === 5, `build(${d}) gives 5 unique questions`)
    check(set.every(q => TK.validate(q).length === 0), `build(${d}) questions validate`)
  }
  // sort sets: every world named in the contract + a fallback for each domain
  const SW = [['matematika', 'titanic'], ['umum', 'britannic'], ['matematika', 'vasa'], ['matematika', 'mayflower'], ['umum', 'calypso'], ['logika', 'victory'], ['logika', 'arizona'], ['logika', 'missouri'], ['matematika', 'queenmary'], ['umum', 'endurance']]
  for (const d of ['matematika', 'umum', 'logika', 'arab', 'islam']) SW.push([d, null])
  for (const [d, w] of SW) {
    for (let s = 0; s < 30; s++) {
      const set = TK.sortSet(d, w, TK.rng(s), { count: 6 })
      const binIds = new Set(set.bins.map(b => b.id))
      const okBins = set.items.every(it => set.capacity ? it.bin === '*' : binIds.has(it.bin))
      const sprites = set.items.concat(set.bins).every(x => !x.sprite || exists(x.sprite))
      let solvable = true
      if (set.capacity) { const tot = set.items.reduce((a, it) => a + it.n, 0); solvable = tot === set.bins.reduce((a, b) => a + b.cap, 0) }
      else solvable = set.bins.every(b => set.items.some(it => it.bin === b.id))
      if (!(set.items.length >= 4 && okBins && sprites && solvable)) { check(false, `sortSet(${d},${w}) seed ${s} invalid`); break }
      if (s === 0) { check(true, ''); if (w && d !== 'arab' && !set.world && !['so-habitat'].includes(set.id)) check(false, `sortSet(${d},${w}) fell back to ${set.id}`) }
    }
  }
  const wsort = { titanic: 'so-sekoci', britannic: 'so-rawat', vasa: 'so-berat', mayflower: 'so-cuaca', calypso: 'so-laut', victory: 'so-bendera', arizona: 'so-bendera', missouri: 'so-bendera' }
  for (const [w, id] of Object.entries(wsort)) check(TK.sortSet(w === 'britannic' || w === 'calypso' ? 'umum' : w === 'titanic' || w === 'vasa' || w === 'mayflower' ? 'matematika' : 'logika', w, TK.rng(1)).id === id, `themed sort for ${w} = ${id}`)
  for (const s of TQ.sorts) for (const x of s.items.concat(s.bins)) if (x.sprite && !exists(x.sprite)) check(false, `sort ${s.id} sprite missing ${x.sprite}`)
  for (const s of TQ.sorts) for (const x of s.items) if (typeof x.label !== 'string' || !x.label.trim() || (x.sprite && /^\d+$/.test(x.label))) check(false, `sort ${s.id} item ${x.id} has no real label (${x.label})`)
  // colour-word items must not show the colour (that would give the answer away)
  check(!TQ.items.some(o => /^ar-wr-/.test(o.id) && o.swatch), 'Arabic colour-word items do not show the swatch')
}

/* ── C. puppeteer ──────────────────────────────────────────────────────── */
if (!process.env.QA_NODE_ONLY) {
  const { default: puppeteer } = await import('puppeteer')
  const SHOTS = process.env.TKQ_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-quiz'
  fs.mkdirSync(SHOTS, { recursive: true })
  const BASE = 'http://localhost:8081/tools/tk-harness-quiz.html'
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const SIZES = [[390, 844], [1024, 768]]

  async function open (w, h, qs) {
    const p = await b.newPage()
    const touch = w < 600
    await p.setViewport({ width: w, height: h, isMobile: touch, hasTouch: touch })
    const errs = []
    p.on('pageerror', e => errs.push('pageerror ' + e.message))
    p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()) })
    p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()) })
    await p.goto(BASE + '?' + qs, { waitUntil: 'networkidle0', timeout: 60000 })
    await sleep(400)
    return { p, errs, touch }
  }
  async function tap (P, sel) {
    const r = await P.p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
    if (!r) return false
    if (P.touch) await P.p.touchscreen.tap(r.x, r.y); else await P.p.mouse.click(r.x, r.y)
    await sleep(140); return true
  }
  const state = P => P.p.evaluate(() => window.__tk.ctl.state())
  const optSel = c => `.tkq-opt[data-c="${c.replace(/"/g, '\\"')}"]`
  async function wrongChoice (P) { return P.p.evaluate(() => { const s = window.__tk.ctl.state(); const b = [...document.querySelectorAll('.tkq-opt')].find(x => !x.disabled && x.dataset.c !== s.answer); return b && b.dataset.c }) }
  async function targets (P, label) {
    const small = await P.p.evaluate(() => [...document.querySelectorAll('.tkq-opt,.tkq-next,.tkq-hintbtn,.tkq-item,.tkq-tile,.tkq-say')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return { c: e.className, w: Math.round(r.width), h: Math.round(r.height) } }).filter(x => x.w < 56 || x.h < 56))
    check(small.length === 0, `${label}: targets >= 56 px ${JSON.stringify(small.slice(0, 3))}`)
  }
  async function inView (P, label) {
    const out = await P.p.evaluate(() => { const vh = innerHeight, vw = innerWidth; return [...document.querySelectorAll('.tkq-opt,.tkq-next,.tkq-prompt,.tkq-item,.tkq-bin')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect()).filter(r => r.bottom > vh + 1 || r.right > vw + 1 || r.left < -1).length })
    check(out === 0, `${label}: controls inside the viewport (${out} outside)`)
  }

  for (const [w, h] of SIZES) {
    const tag = w + 'x' + h
    // C1: 5-question set, real taps: right / wrong->right / right / wrong,wrong->right / right
    {
      const P = await open(w, h, 'set=math5&seed=7')
      await P.p.screenshot({ path: `${SHOTS}/math-q1-${tag}.png` })
      await targets(P, tag + ' math'); await inView(P, tag + ' math')
      const plan = [0, 1, 0, 2, 0]
      for (let i = 0; i < 5; i++) {
        let s = await state(P)
        check(s.i === i && !s.answered, `${tag} q${i + 1} shown`)
        for (let k = 0; k < plan[i]; k++) {
          const c = await wrongChoice(P); await tap(P, optSel(c)); await sleep(420)
          const t = await P.p.evaluate(sel => { const e = document.querySelector(sel); return { tried: e.classList.contains('tried'), dis: e.disabled } }, optSel(c))
          check(t.tried && t.dis, `${tag} q${i + 1}: wrong answer faded, not red, progress kept`)
          if (i === 3 && k === 1) await P.p.screenshot({ path: `${SHOTS}/math-hint-${tag}.png` })
        }
        s = await state(P)
        check(s.rung === plan[i], `${tag} q${i + 1}: ladder rung ${s.rung} == wrong taps ${plan[i]}`)
        await tap(P, optSel(s.answer)); await sleep(900)
        s = await state(P)
        check(s.answered, `${tag} q${i + 1}: right answer accepted`)
        const ok = await P.p.evaluate(sel => document.querySelector(sel).classList.contains('ok'), optSel(s.answer))
        check(ok, `${tag} q${i + 1}: correct button turns green`)
        if (i === 0) await P.p.screenshot({ path: `${SHOTS}/math-correct-${tag}.png` })
        await tap(P, '.tkq-next'); await sleep(500)
      }
      const done = await P.p.evaluate(() => window.__tkDone)
      check(done && done.asked === 5 && done.right === 3 && done.hints === 3 && typeof done.masteryDelta === 'number' && done.masteryDelta > 0, `${tag} onDone ${JSON.stringify(done && { right: done.right, asked: done.asked, hints: done.hints, d: done.masteryDelta, pts: done.points })}`)
      const stats = await P.p.evaluate(() => [...document.querySelectorAll('[data-k]')].map(e => e.textContent).join(','))
      check(/^5\/5,\d+,\d+$/.test(stats), `${tag} stats column updates (${stats})`)
      check(P.errs.length === 0, `${tag} math: no page errors ${P.errs.slice(0, 3).join(' | ')}`)
      await P.p.close()
    }
    // C2: hint ladder to guided completion (tier 3: objects hidden until the ladder reveals them)
    {
      const P = await open(w, h, 'set=ladder&seed=3&m=70')
      let hidden = await P.p.evaluate(() => getComputedStyle(document.querySelector('.tkq-scene')).display === 'none')
      check(hidden, `${tag} tier 3 (mastery 70): context only, objects hidden`)
      await tap(P, '.tkq-hintbtn'); let s = await state(P); check(s.rung === 1, `${tag} hint button -> rung 1 (retry)`)
      await tap(P, '.tkq-hintbtn'); await sleep(300)
      const hl = await P.p.evaluate(() => ({ shown: getComputedStyle(document.querySelector('.tkq-scene')).display !== 'none', hl: document.querySelectorAll('.tkq-o.hl').length }))
      check(hl.shown && hl.hl > 0, `${tag} rung 2: objects revealed + highlighted (${hl.hl})`)
      await tap(P, '.tkq-hintbtn'); await sleep(1200)
      const nums = await P.p.evaluate(() => document.querySelectorAll('.tkq-o .n.on').length)
      check(nums > 0, `${tag} rung 3: animated counting badges (${nums})`)
      await tap(P, '.tkq-hintbtn'); await sleep(200)
      const st4 = await P.p.evaluate(() => ({ eq: !document.querySelector('.tkq-eq').hidden, help: document.querySelector('.tkq-help').textContent }))
      check(st4.eq && /Mulai/.test(st4.help), `${tag} rung 4: first step shown (${st4.help})`)
      await tap(P, '.tkq-hintbtn'); await sleep(200)
      const g = await P.p.evaluate(() => { const s = window.__tk.ctl.state(); const bs = [...document.querySelectorAll('.tkq-opt')]; return { rung: s.rung, guide: bs.filter(b => b.classList.contains('guide')).map(b => b.dataset.c), enabled: bs.filter(b => !b.disabled).map(b => b.dataset.c), answer: s.answer } })
      check(g.rung === 5 && g.guide.length === 1 && g.guide[0] === g.answer && g.enabled.length === 1, `${tag} rung 5: guided completion ${JSON.stringify(g)}`)
      await P.p.screenshot({ path: `${SHOTS}/ladder-guided-${tag}.png` })
      await tap(P, optSel(g.answer)); await sleep(700)
      s = await state(P); check(s.answered && s.right === 0, `${tag} guided answer completes (not counted as independent)`)
      await tap(P, '.tkq-next'); await sleep(400)
      // wrong taps alone also reach guided completion (3 wrong = no wrong left)
      for (let k = 0; k < 3; k++) { const c = await wrongChoice(P); if (c) { await tap(P, optSel(c)); await sleep(450) } }
      s = await state(P)
      check(s.rung === 5, `${tag} three wrong taps -> guided completion (rung ${s.rung})`)
      check(P.errs.length === 0, `${tag} ladder: no page errors ${P.errs.slice(0, 3).join(' | ')}`)
      await P.p.close()
    }
    // C3: Arabic RTL + arrange letters
    {
      const P = await open(w, h, 'set=arab&seed=5')
      const dir = await P.p.evaluate(() => [...document.querySelectorAll('.tkq-opt .tkq-ar')].map(e => getComputedStyle(e).direction))
      check(dir.length === 4 && dir.every(d => d === 'rtl'), `${tag} Arabic answers computed direction rtl (${dir.join(',')})`)
      await targets(P, tag + ' arab'); await inView(P, tag + ' arab')
      await P.p.screenshot({ path: `${SHOTS}/arab-pw-${tag}.png` })
      let s = await state(P); await tap(P, optSel(s.answer)); await sleep(700); await tap(P, '.tkq-next'); await sleep(500)
      const wd = await P.p.evaluate(() => { const e = document.querySelector('.tkq-arw .tkq-ar'); return e && getComputedStyle(e).direction })
      check(wd === 'rtl', `${tag} Arabic prompt word computed direction rtl (${wd})`)
      await P.p.screenshot({ path: `${SHOTS}/arab-wp-${tag}.png` })
      s = await state(P); await tap(P, optSel(s.answer)); await sleep(700); await tap(P, '.tkq-next'); await sleep(500)
      const lis = await P.p.evaluate(() => ({ say: !!document.querySelector('.tkq-say'), tr: (document.querySelector('.tkq-arw .tkq-tr') || {}).textContent }))
      check(lis.say && /Dengar/.test(lis.tr || ''), `${tag} listen item: speaker button + transliteration text fallback (${lis.tr})`)
      await tap(P, '.tkq-say')
      check(P.errs.length === 0, `${tag} arab: no page errors ${P.errs.slice(0, 3).join(' | ')}`)
      await P.p.close()
      const A = await open(w, h, 'set=arrange')
      const info = await A.p.evaluate(() => ({ dir: getComputedStyle(document.querySelector('.tkq-slots')).direction, ans: window.__tk.ctl.state().answer }))
      check(info.dir === 'rtl', `${tag} arrange slots rtl`)
      for (const ch of info.ans.split('')) {
        const sel = await A.p.evaluate(c => { const t = [...document.querySelectorAll('.tkq-tile')].find(x => !x.disabled && x.textContent === c); return t ? `.tkq-tile[data-t="${t.dataset.t}"]` : null }, ch)
        await tap(A, sel)
      }
      await sleep(600)
      const firstSlotX = await A.p.evaluate(() => { const s = [...document.querySelectorAll('.tkq-slot')]; return s[0].getBoundingClientRect().left > s[s.length - 1].getBoundingClientRect().left })
      check(firstSlotX, `${tag} first letter sits in the RIGHTMOST slot`)
      await A.p.screenshot({ path: `${SHOTS}/arab-arrange-${tag}.png` })
      const as = await state(A); check(as.answered, `${tag} arrange letters solved by taps`)
      check(A.errs.length === 0, `${tag} arrange: no page errors ${A.errs.slice(0, 3).join(' | ')}`)
      await A.p.close()
    }
    // C4: sort drag (real pointer drag with snap), one wrong drop first
    {
      const P = await open(w, h, 'set=sort&world=calypso&domain=umum&seed=2')
      await targets(P, tag + ' sort'); await inView(P, tag + ' sort')
      await P.p.screenshot({ path: `${SHOTS}/sort-start-${tag}.png` })
      const items = await P.p.evaluate(() => window.__tk.ctl.set.items.map(i => ({ id: i.id, bin: i.bin })))
      const bins = await P.p.evaluate(() => window.__tk.ctl.set.bins.map(b => b.id))
      const center = sel => P.p.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
      async function drag (id, bin) {
        const a = await center(`.tkq-item[data-id="${id}"]`), z = await center(`.tkq-bin[data-bin="${bin}"]`)
        await P.p.mouse.move(a.x, a.y); await P.p.mouse.down()
        for (let k = 1; k <= 12; k++) { await P.p.mouse.move(a.x + (z.x - a.x) * k / 12, a.y + (z.y - a.y) * k / 12); await sleep(16) }
        await P.p.mouse.up(); await sleep(520)
      }
      const wrongBin = bins.find(x => x !== items[0].bin)
      await drag(items[0].id, wrongBin)
      let st = await P.p.evaluate(() => window.__tk.ctl.state())
      const inTray = await P.p.evaluate(id => !!document.querySelector(`.tkq-tray .tkq-item[data-id="${id}"]`), items[0].id)
      check(st.wrong === 1 && st.placed === 0 && inTray, `${tag} sort: wrong drop springs back to the tray`)
      for (const it of items) await drag(it.id, it.bin)
      await P.p.screenshot({ path: `${SHOTS}/sort-done-${tag}.png` })
      st = await P.p.evaluate(() => window.__tk.ctl.state())
      const placedIn = await P.p.evaluate(() => [...document.querySelectorAll('.tkq-bin')].every(b => [...b.querySelectorAll('.tkq-item')].every(i => window.__tk.ctl.set.items.find(x => x.id === i.dataset.id).bin === b.dataset.bin)))
      check(st.done && st.placed === items.length && placedIn, `${tag} sort: every item dragged into its bin (${st.placed}/${items.length})`)
      await tap(P, '.tkq-next'); await sleep(200)
      const done = await P.p.evaluate(() => window.__tkDone)
      check(done && done.asked === items.length && done.right === items.length - 1 && done.hints === 1, `${tag} sort onDone ${JSON.stringify(done)}`)
      check(P.errs.length === 0, `${tag} sort: no page errors ${P.errs.slice(0, 3).join(' | ')}`)
      await P.p.close()
      // capacity sort (Titanic lifeboats) solvable by drag
      const C = await open(w, h, 'set=sort&world=titanic&domain=matematika&seed=4')
      const fam = await C.p.evaluate(() => window.__tk.ctl.set.items.map(i => ({ id: i.id, n: i.n })))
      const load = { s1: 0, s2: 0 }
      // place families by a real partition (largest first, first fit)
      const order = fam.slice().sort((x, y) => y.n - x.n)
      const cc = sel => C.p.evaluate(s => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
      for (const f of order) {
        const bin = load.s1 + f.n <= 5 ? 's1' : 's2'; load[bin] += f.n
        const a = await cc(`.tkq-item[data-id="${f.id}"]`), z = await cc(`.tkq-bin[data-bin="${bin}"]`)
        await C.p.mouse.move(a.x, a.y); await C.p.mouse.down()
        for (let k = 1; k <= 10; k++) { await C.p.mouse.move(a.x + (z.x - a.x) * k / 10, a.y + (z.y - a.y) * k / 10); await sleep(16) }
        await C.p.mouse.up(); await sleep(500)
      }
      const cs = await C.p.evaluate(() => window.__tk.ctl.state())
      check(cs.done, `${tag} lifeboat capacity sort solved (${cs.placed}/${cs.n}, load ${JSON.stringify(load)})`)
      await C.p.screenshot({ path: `${SHOTS}/sort-lifeboat-${tag}.png` })
      check(C.errs.length === 0, `${tag} lifeboat: no page errors ${C.errs.slice(0, 3).join(' | ')}`)
      await C.p.close()
    }
    // C5: curated set (pattern / picture choices) + campur with islam off
    {
      const P = await open(w, h, 'set=curated')
      await targets(P, tag + ' curated'); await inView(P, tag + ' curated')
      await P.p.screenshot({ path: `${SHOTS}/curated-pattern-${tag}.png` })
      check(P.errs.length === 0, `${tag} curated: no page errors ${P.errs.slice(0, 3).join(' | ')}`)
      await P.p.close()
      const Q = await open(w, h, 'set=campur&islam=0')
      const doms = await Q.p.evaluate(() => window.__tk.ctl.questions.map(q => q.domain + (q.islam ? '!' : '')))
      check(doms.length === 5 && !doms.some(d => /islam|!/.test(d)), `${tag} campur with islam off: ${doms.join(',')}`)
      await Q.p.close()
    }
    // C6: reduced motion renders and answers
    {
      const P = await open(w, h, 'set=math5&rm=1')
      const s = await state(P); await tap(P, optSel(s.answer)); await sleep(300)
      check((await state(P)).answered && P.errs.length === 0, `${tag} reduced motion: answer works, no errors`)
      await P.p.close()
    }
  }
  await b.close()
}

console.log(`\n${fails.length ? 'FAIL' : 'PASS'} qa-tk-questions: ${passes} checks passed, ${fails.length} failed`)
process.exit(fails.length ? 1 : 0)
