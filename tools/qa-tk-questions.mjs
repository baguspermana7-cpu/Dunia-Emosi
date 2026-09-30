// G30 Timmy & Kapal Legendaris — learning-engine gate (PRD §9 qa-tk-questions).
//   A) node: 5,000 generated Matematika items per level (1–4) all valid: exactly one correct answer
//      among 4 distinct choices, no negatives, operands/answers inside the grade range (10 / 20),
//      plus every kind forced across seeds; mastery → tier mapping.
//   B) node: curated bank schema, unique ids, counts per domain (islam>=60, arab>=60, umum>=80,
//      logika>=60), answer in choices, choices distinct, every sprite key exists on disk
//      (assets/db/lib/<key>.webp), ship-history facts carry verified:false + source,
//      Islamic filter removes every islam item (pick/build/sortSet/campur), Arabic items are rtl
//      and contain Arabic letters, sort sets are complete and solvable.
//   B3) grade fit for Kelas 1–2 (items tagged grade 2 or untagged).
//   B4) Tingkat Sulit (grade 3–4, fase B): grade tag on every item, >= 45 per topic (Arab >= 40),
//      prompt <= 18 words, options <= 18 chars, 3–4 options, numbers <= 1000, no history / places / years,
//      answer among the options; Mudah never serves grade 3–4.
//   B5) variety: bank floors per tier, no shared normalized prompt + answer, no near-duplicates,
//      wording skeletons used >= 3 times per topic are flagged (printed).
//   C) puppeteer (tools/tk-harness-quiz.html, 390x844 + 1024x768): a 5-question set answered right
//      and wrong through real taps, hint ladder reaches guided completion, sort drag works,
//      RTL renders (computed direction rtl), arrange letters, targets >= 56 px, no page errors.
//   D) ease pass (5–8 y): easy mode = 3 choices / numbers <= 10 / picture first; read-aloud via
//      TKHub.say (question, speaker button, two-tap choices, explanation); tap-to-count number words;
//      lantern glows after one wrong answer and the answer is shown after two; sort tutorial pulses;
//      lifeboat seats fill with hijab-girl/boy/men passenger sprites only.
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
for (const f of ['soal-engine', 'soal-gen-matematika', 'soal-pack-kapal']) require(path.join(ROOT, 'games/data/' + f + '.js'))   // SoalEngine (tk-quiz draws every question from it)
require(path.join(ROOT, 'games/tk-quiz.js'))
const TQ = globalThis.TKQuestions, TK = globalThis.TKQuiz
const exists = k => fs.existsSync(path.join(ROOT, 'assets/db/lib', k + '.webp'))
// Curated items with a long answer word carry 3 options on purpose (a 4-wide row of "Alhamdulillah"
// spilled out of its buttons). TKQuiz.validate still expects 4 unless q.easy, so the gate accepts
// exactly that one message for a 3-option curated item. (tk-quiz.js owner: accept 3–4 for curated.)
const valid = q => TK.validate(q).filter(m => !(m === 'choices != 4' && q.domain !== 'matematika' && q.choices.length === 3))
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
  // easy mode (Kelas 1 / low mastery): 3 choices, picture-first counting, numbers <= 10
  check(TK.isEasy('kelas1', 90) && TK.isEasy('adaptif', 10) && !TK.isEasy('adaptif', 50) && !TK.isEasy('kelas2', 0) && TK.isEasy('kelas2', 90, true) && !TK.isEasy('kelas1', 0, false), 'isEasy: Kelas 1 always, Adaptif at tier 1, Kelas 2 never, opts.easy overrides')
  let ebad = [], mid = 0, kinds = {}
  for (let lv = 1; lv <= 2; lv++) { const r = TK.rng(300 + lv); for (let i = 0; i < 3000; i++) {
    const q = TK.easyify(TK.make('matematika', lv, r, { easy: true })); kinds[q.kind] = 1
    const p = TK.validate(q)
    if (q.choices.length !== 3) p.push('not 3 choices')
    if (q.choices.some(c => +c > 10) || +q.answer > 10) p.push('number > 10')
    if (!(q.scene.groups || []).length) p.push('no picture')
    if (p.length && ebad.length < 3) ebad.push(q.id + ' ' + p.join(';'))
    const v = q.choices.map(Number).sort((a, b) => a - b); if (v[1] === +q.answer) mid++
  } }
  check(ebad.length === 0, 'easy math: 6000 items valid, 3 choices, numbers <= 10, objects on screen ' + ebad.join(' | '))
  // SoalEngine EASY_KINDS (owner 2026-09-30, more variety): every kind shows its objects on screen
  check(Object.keys(kinds).sort().join() === 'add,bond,count,double,sub,tomake', 'easy math kinds are picture-first (count/add/sub/double/tomake/bond): ' + Object.keys(kinds).join())
  check(mid < 6000 * 0.7, `easy answers are not always the middle value (${mid}/6000)`)
  const snap = JSON.stringify(TQ.items.map(o => o.choices))
  const cq = TQ.items.filter(o => !o.letters).map(o => TK.easyify(o))
  check(cq.every(q => q.choices.length === 3 && q.choices.includes(q.answer) && valid(q).length === 0), 'easyify: every curated item -> 3 choices incl. the answer')
  check(JSON.stringify(TQ.items.map(o => o.choices)) === snap && TQ.items.every(o => o.choices.length >= 3 && o.choices.length <= 4), 'easyify never mutates the bank (3–4 choices as written)')
  check([1, 2, 5, 10, 12, 20].map(TK.numWord).join() === 'satu,dua,lima,sepuluh,dua belas,dua puluh', 'number words for tap-to-count')
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
    if (!Array.isArray(o.choices) || o.choices.length < 3 || o.choices.length > 4 || (o.letters && o.choices.length !== 4)) bad(o, 'choices not 3–4')
    else {
      if (new Set(o.choices).size !== o.choices.length) bad(o, 'choices not distinct ' + o.choices.join('|'))
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
    check(set.every(q => valid(q).length === 0), `build(${d}) questions validate`)
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

/* ── B2. goals match content (audit B5/D) ─────────────────────────────── */
{
  let letters = 0, offDomain = 0
  for (let seed = 0; seed < 1500; seed++) {
    if (TK.build({ domain: 'campur', world: 'victory', count: 5, seed }).some(q => q.letters)) letters++
    if (TK.build({ domain: 'logika', count: 3, seed, topic: 'Temukan Kepingan Kompas V!' }).some(q => q.domain !== 'logika')) offDomain++
  }
  check(letters === 0, `campur never serves arrange-letters (${letters}/1500 sets did)`)
  check(offDomain === 0, `a Logika level serves Logika only (${offDomain}/1500 sets strayed)`)
  // history: false — this checks goal matching; the gate's earlier 1,500 builds already used the session history
  const kompas = TK.build({ domain: 'campur', world: 'victory', count: 5, seed: 3, topic: 'Baca arah kompas.', history: false })
  check(kompas.slice(0, 2).every(q => /kompas|arah/i.test(q.prompt + q.explain)), `topic "Baca arah kompas." leads with compass questions: ${kompas.slice(0, 2).map(q => q.prompt).join(' / ')}`)
  const bagi = TK.build({ domain: 'matematika', world: 'titanic', count: 3, seed: 5, level: 3, topic: 'Bagikan selimut dan hitung penumpang yang selamat.', history: false })
  check(bagi[0].kind === 'share', `maths topic "Bagikan …" asks a sharing question first (${bagi[0].kind})`)
  // owner 2026-09-29: the captain is the old man ("Kapten"); the penguin is only his assistant ("Asisten Pinguin")
  check(!/Kapten Pingu/.test(fs.readFileSync(path.join(ROOT, 'games/tk-quiz.js'), 'utf8')) && !/Kapten Pingu/.test(fs.readFileSync(path.join(ROOT, 'games/data/tk-questions.js'), 'utf8')), 'the captain is the old man: no "Kapten Pinguin" / "Kapten Pingu" in the quiz or the bank')
}

/* ── B3. grade fit (Kelas 1–2, fase A) — owner 2026-09-28: "Kapal Endurance berlayar ke benua es
   yang bernama…" is not a question a 6–8 year old can answer. These checks hold the line.
   Scope: items tagged grade <= 2 or untagged (the Sulit tier, grade 3–4, is held by B4). ───── */
const isSulit = o => +o.grade >= 3
{
  const items = TQ.items.filter(o => !isSulit(o))
  const MAX_Q_WORDS = 12, MAX_Q_CHARS = 72, MAX_OPT_WORDS = 3, MAX_OPT_CHARS = 18, WARN_OPT_CHARS = 14, LONG_WORD = 12
  const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
  const lc = s => String(s).toLowerCase()
  // whole-word, case-insensitive; a term is a word or a phrase
  const has = (text, term) => new RegExp('(^|[^a-z])' + term.replace(/[-]/g, '\\-') + '($|[^a-z])', 'i').test(text)
  const BANNED = {
    geografi: ['benua', 'samudra', 'antarktika', 'antartika', 'afrika', 'asia', 'australia', 'eropa', 'amerika', 'arktik', 'kutub utara', 'kutub selatan',
      'inggris', 'swedia', 'norwegia', 'prancis', 'jepang', 'tiongkok', 'peru', 'mesir', 'italia', 'brasil', 'belanda', 'polinesia',
      'stockholm', 'southampton', 'new york', 'portsmouth', 'long beach', 'pearl harbor', 'hawaii', 'kairo', 'roma', 'tokyo', 'sydney', 'london', 'oslo', 'mekah', 'madinah',
      'indonesia', 'jakarta', 'bali', 'sulawesi', 'spanyol', 'jerman', 'rusia', 'india', 'cina', 'korea', 'kanada', 'yunani', 'turki', 'yerusalem', 'baghdad', 'istanbul', 'paris',
      'amsterdam', 'greenwich', 'liverpool', 'belfast', 'plymouth', 'massachusetts', 'raroia', 'weddell', 'falkland', 'georgia selatan', 'atlantik', 'pasifik', 'hindia', 'kota', 'negara'],
    sejarah: ['museum', 'sejarah', 'tahun', 'abad', 'ditemukan', 'perang', 'shackleton', 'heyerdahl', 'cousteau', 'nelson', 'jules verne', 'smith', 'bugis', 'makassar', 'viking'],
    istilah: ['mamalia', 'amfibi', 'gravitasi', 'insang', 'periskop', 'haluan', 'buritan', 'rasi', 'polaris', 'kepulauan', 'tekanan', 'balsa', 'nakhoda', 'lusa'],
    fikih: ['rakaat', 'tayamum', 'jibril', 'mikail', 'israfil', 'raqib', 'atid', 'ridwan', 'taurat', 'zabur', 'injil', 'juz', 'ayat', 'qada', 'qadar', 'zakat', 'siku', 'mata kaki', 'malaikat']
  }
  globalThis.__tkBanned = BANNED
  // ship proper names: allowed only when the question shows that ship's own picture
  const SHIPS = [['titanic', 'titanic'], ['britannic', 'britannic'], ['vasa', 'vasa'], ['cutty sark', 'cuttysark'], ['victory', 'victory'], ['mayflower', 'mayflower'],
    ['endurance', 'endurance'], ['kon-tiki', 'kontiki'], ['calypso', 'calypso'], ['queen mary', 'queenmary'], ['arizona', 'arizona'], ['missouri', 'missouri'], ['nautilus', 'nautilus'], ['pinisi', 'pinisi']]
  globalThis.__tkShips = SHIPS
  const bad = { len: [], opt: [], n: [], ban: [], ship: [], neg: [], num: [], arpic: [], rukun: [], wide: [], now: [] }, optWarn = []
  const push = (k, o, m) => { if (bad[k].length < 8) bad[k].push(o.id + ' ' + m) }
  let short10 = 0, opt2 = 0, optN = 0
  for (const o of items) {
    const p = o.prompt, all = [p, o.explain, o.hint1, o.hint2, ...(o.letters ? [] : o.choices)].join(' | ')
    if (words(p) <= 10) short10++
    if (words(p) > MAX_Q_WORDS || p.length > MAX_Q_CHARS) push('len', o, `${words(p)} words / ${p.length} chars: "${p}"`)
    if (!o.letters) for (const c of o.choices) { optN++; if (words(c) <= 2) opt2++; if (words(c) > MAX_OPT_WORDS || c.length > MAX_OPT_CHARS) push('opt', o, `option "${c}"`); else if (c.length > WARN_OPT_CHARS) optWarn.push(o.id + ' "' + c + '"') }
    // a long answer word never sits in a 4-wide row (owner photo: "Alhamdulillah" spilled out of its button)
    if (!o.letters && o.choices.length > 3 && o.choices.some(c => c.length > LONG_WORD)) push('wide', o, `4 options with a word > ${LONG_WORD} chars: ${o.choices.join(' / ')}`)
    // no "where is this ship now / what happened back then" questions
    if (/\bsekarang\b[^?…]*\b(di|menjadi)\b/i.test(p) || /\b(zaman dulu|dulu|dahulu)\b/i.test(p)) push('now', o, `ship-history framing "${p}"`)
    if (o.choices.length < 3 || o.choices.length > 4) push('n', o, o.choices.length + ' options')
    for (const [grp, terms] of Object.entries(BANNED)) for (const t of terms) if (has(all, t)) push('ban', o, `${grp}: "${t}"`)
    if (/\b\d{4}\b/.test(all.replace(/\d{1,3}(\.\d{3})+/g, ''))) push('ban', o, 'a 4-digit number (year)')
    for (const [name, id] of SHIPS) if (has(all, name) && !(o.visual || []).some(k => k.includes('ship-' + id))) push('ship', o, `ship name "${name}" without that ship's picture`)
    // no "which is NOT" questions, no BUKAN anywhere a child has to choose
    if (/\bbukan\b/i.test([p, ...o.choices].join(' ')) || /\b(mana|apa|siapa|yang)\b[^?]*\b(tidak|bukan)\b[^?]*\?/i.test(p)) push('neg', o, `negative question "${p}"`)
    // every number a child meets is <= 20 (fase A)
    const nums = (lc(p) + ' ' + o.choices.join(' ')).match(/\d+/g) || []
    if (nums.some(x => +x > 20)) push('num', o, 'number > 20: ' + nums.filter(x => +x > 20).join(','))
    if (o.domain === 'arab' && !((o.visual || []).length || o.pics || o.swatch)) push('arpic', o, 'Arabic item without a picture')
    if (o.domain === 'islam' && /rukun (islam|iman) yang (pertama|kedua|ketiga|keempat|kelima|keenam)/i.test(p)) push('rukun', o, 'ordinal Rukun question (count only)')
  }
  check(bad.len.length === 0, `question length <= ${MAX_Q_WORDS} words / ${MAX_Q_CHARS} chars: ${bad.len.join(' | ')}`)
  check(bad.opt.length === 0, `option length <= ${MAX_OPT_WORDS} words / ${MAX_OPT_CHARS} chars: ${bad.opt.join(' | ')}`)
  if (optWarn.length) console.log(`WARN options over ${WARN_OPT_CHARS} chars (proper spelling kept, 3-option rows): ${optWarn.join(', ')}`)
  check(bad.wide.length === 0, `long answer words get 3 options, not 4: ${bad.wide.join(' | ')}`)
  check(bad.now.length === 0, `no "where is the ship now" / "back then" questions: ${bad.now.join(' | ')}`)
  check(bad.n.length === 0, `3–4 options per item: ${bad.n.join(' | ')}`)
  check(bad.ban.length === 0, `banned terms (continents, countries, years, history names, jargon, fiqh detail): ${bad.ban.join(' | ')}`)
  check(bad.ship.length === 0, `ship proper names only with the ship's own picture: ${bad.ship.join(' | ')}`)
  check(bad.neg.length === 0, `no negative ("BUKAN" / which-is-NOT) questions: ${bad.neg.join(' | ')}`)
  check(bad.num.length === 0, `curated numbers <= 20: ${bad.num.join(' | ')}`)
  check(bad.arpic.length === 0, `every Arabic item has a picture (visual / picture answers / swatch): ${bad.arpic.join(' | ')}`)
  check(bad.rukun.length === 0, `Islam: Rukun asked as a count only: ${bad.rukun.join(' | ')}`)
  check(short10 / items.length >= 0.95, `>= 95% of prompts are <= 10 words (${short10}/${items.length})`)
  check(opt2 / optN >= 0.9, `>= 90% of options are 1–2 words (${opt2}/${optN})`)
  // easy (Kelas 1) keeps the answer + the two distractors written right after it
  check(items.filter(o => !o.letters).every(o => { const e = TK.easyify(o); return e.choices.length === 3 && e.choices.includes(o.answer) }), 'easy mode: 3 options incl. the answer on every item')
  // every ship world keeps enough own Umum items that a 4–5 question level never runs dry
  const WORLDS = ['titanic', 'britannic', 'vasa', 'cuttysark', 'victory', 'mayflower', 'endurance', 'kontiki', 'calypso', 'queenmary', 'arizona', 'missouri', 'nautilus', 'pelabuhan']
  const thin = WORLDS.map(w => [w, items.filter(o => o.domain === 'umum' && o.world === w && o.level <= 2).length]).filter(([, n]) => n < 4)
  check(thin.length === 0, `each ship world has >= 4 Umum items at level <= 2: ${JSON.stringify(thin)}`)
  for (const d of ['islam', 'arab', 'umum', 'logika']) for (let lv = 1; lv <= 4; lv++) {
    const n = items.filter(o => o.domain === d && o.level === lv && !o.letters).length
    check(n >= 3, `${d} L${lv} has >= 3 non-arrange items (${n}) so a level's quiz does not repeat`)
  }
  // generated Matematika (games/tk-quiz.js, not this bank): fase A scope. STRICT by default since the generator
  // was brought into fase A (2026-09-28); QA_TK_STRICT_MATH=0 downgrades these to warnings.
  const strict = process.env.QA_TK_STRICT_MATH !== '0'
  const warn = (ok, msg) => { if (strict) check(ok, msg); else if (!ok) console.log('WARN ' + msg); else passes++ }
  let over20 = 0, half12 = 0, multdiv = 0, longp = 0, n = 0, ex = null
  for (let lv = 1; lv <= 4; lv++) { const r = TK.rng(900 + lv); for (let i = 0; i < 3000; i++) {
    const q = TK.make('matematika', lv, r, {}); n++
    if (q.choices.some(c => /^\d+$/.test(c) && +c > 20)) { over20++; ex = ex || q.id + ' ' + q.choices.join('/') }
    if (q.choices.some(c => /setengah/.test(c))) half12++
    if (/^(groups|groupsplus|share)$/.test(q.kind)) multdiv++
    if (words(q.prompt) > MAX_Q_WORDS) longp++
  } }
  warn(over20 === 0, `math: generated choices <= 20 (${over20}/${n} items offer a number > 20, e.g. ${ex})`)
  warn(half12 === 0, `math: clocks use whole hours only (${half12}/${n} items show or offer "setengah")`)
  warn(multdiv === 0, `math: no multiplication / division kinds (groups/share) in fase A (${multdiv}/${n})`)
  warn(longp === 0, `math: prompts <= ${MAX_Q_WORDS} words (${longp}/${n} longer)`)
}

/* ── B4. Tingkat Sulit (Kelas 3–4, Kurikulum Merdeka fase B) — owner 2026-09-29: "Easy is for grade 1–2.
   If set to hard, questions go up to the grade 4 SD curriculum." Every item has a grade tag; grade 3–4
   items follow these rules. History, place names and years stay banned (map words like "utara" are fine);
   fiqh terms (rakaat, malaikat) and ship-part words (haluan, buritan) are allowed here. ───────────── */
{
  const all = TQ.items, items = all.filter(isSulit)
  const MAX_Q_WORDS = 18, MAX_OPT_CHARS = 18, LONG_WORD = 12, MAX_N = 1000
  const MIN = { umum: 45, islam: 45, logika: 45, arab: 40 }
  const words = s => String(s).trim().split(/\s+/).filter(Boolean).length
  const has = (text, term) => new RegExp('(^|[^a-z])' + term.replace(/[-]/g, '\\-') + '($|[^a-z])', 'i').test(text)
  const BANNED = { geografi: globalThis.__tkBanned.geografi, sejarah: globalThis.__tkBanned.sejarah }
  const SHIPS = globalThis.__tkShips
  const bad = { tag: [], len: [], opt: [], n: [], ans: [], ban: [], ship: [], neg: [], num: [], wide: [], now: [], dup: [], lvl: [] }
  const push = (k, o, m) => { if (bad[k].length < 8) bad[k].push(o.id + ' ' + m) }
  // every item carries a grade tag (2 = Kelas 1–2; 3 / 4 = Sulit)
  for (const o of all) if (![2, 3, 4].includes(o.grade)) push('tag', o, 'grade ' + o.grade)
  const perGrade = {}
  for (const o of items) {
    perGrade[o.domain + ':' + o.grade] = (perGrade[o.domain + ':' + o.grade] || 0) + 1
    const p = o.prompt, ch = o.letters ? [] : o.choices, text = [p, o.explain, o.hint1, o.hint2, ...ch].join(' | ')
    if (words(p) > MAX_Q_WORDS) push('len', o, `${words(p)} words: "${p}"`)
    for (const c of ch) if (c.length > MAX_OPT_CHARS) push('opt', o, `option "${c}" (${c.length} chars)`)
    if (ch.length > 3 && ch.some(c => c.length > LONG_WORD)) push('wide', o, `4 options with a word > ${LONG_WORD} chars: ${ch.join(' / ')}`)
    if (!Array.isArray(o.choices) || o.choices.length < 3 || o.choices.length > 4) push('n', o, (o.choices || []).length + ' options')
    if (o.choices.filter(c => c === o.answer).length !== 1 || new Set(o.choices).size !== o.choices.length) push('ans', o, `answer "${o.answer}" not exactly once among distinct ${o.choices.join(' / ')}`)
    for (const [grp, terms] of Object.entries(BANNED)) for (const t of terms) if (has(text, t)) push('ban', o, `${grp}: "${t}"`)
    if (/\b\d{4}\b/.test(text.replace(/\d{1,3}(\.\d{3})+/g, ''))) push('ban', o, 'a 4-digit number (year)')
    for (const [name, id] of SHIPS) if (has(text, name) && !(o.visual || []).some(k => k.includes('ship-' + id))) push('ship', o, `ship name "${name}" without that ship's picture`)
    if (/\bbukan\b/i.test([p, ...ch].join(' ')) || /\b(mana|apa|siapa|yang)\b[^?]*\b(tidak|bukan)\b[^?]*\?/i.test(p)) push('neg', o, `negative question "${p}"`)
    if (/\bsekarang\b[^?…]*\b(di|menjadi)\b/i.test(p) || /\b(zaman dulu|dulu|dahulu)\b/i.test(p)) push('now', o, `history framing "${p}"`)
    // numbers a child meets (prompt + options); "1.000" is one thousand
    const nums = ([p, ...ch].join(' ').replace(/(\d{1,3})\.(\d{3})\b/g, '$1$2').match(/\d+/g) || []).map(Number)
    if (nums.some(x => x > MAX_N)) push('num', o, 'number > ' + MAX_N + ': ' + nums.filter(x => x > MAX_N).join(','))
    // inside the tier: grade 3 -> L1–2, grade 4 -> L3–4 (the picker's level still means something)
    if (!(o.grade === 3 ? o.level <= 2 : o.level >= 3)) push('lvl', o, `grade ${o.grade} at level ${o.level}`)
  }
  const counts = {}; for (const o of items) counts[o.domain] = (counts[o.domain] || 0) + 1
  console.log('Sulit counts:', JSON.stringify(counts), '| per grade:', JSON.stringify(perGrade))
  check(bad.tag.length === 0, `every item has a grade tag 2 / 3 / 4: ${bad.tag.join(' | ')}`)
  for (const [d, n] of Object.entries(MIN)) check((counts[d] || 0) >= n, `Sulit ${d} >= ${n} items (${counts[d] || 0})`)
  for (const d of Object.keys(MIN)) for (const g of [3, 4]) check((perGrade[d + ':' + g] || 0) >= 5, `Sulit ${d} has >= 5 grade-${g} items (${perGrade[d + ':' + g] || 0})`)
  check(bad.len.length === 0, `Sulit question <= ${MAX_Q_WORDS} words: ${bad.len.join(' | ')}`)
  check(bad.opt.length === 0, `Sulit options <= ${MAX_OPT_CHARS} chars: ${bad.opt.join(' | ')}`)
  check(bad.wide.length === 0, `Sulit long answer words get 3 options, not 4: ${bad.wide.join(' | ')}`)
  check(bad.n.length === 0, `Sulit 3–4 options: ${bad.n.join(' | ')}`)
  check(bad.ans.length === 0, `Sulit answer among distinct options exactly once: ${bad.ans.join(' | ')}`)
  check(bad.ban.length === 0, `Sulit: no history, place names or years: ${bad.ban.join(' | ')}`)
  check(bad.ship.length === 0, `Sulit ship proper names only with the ship's own picture: ${bad.ship.join(' | ')}`)
  check(bad.neg.length === 0, `Sulit: no negative ("BUKAN") questions: ${bad.neg.join(' | ')}`)
  check(bad.now.length === 0, `Sulit: no "back then" framing: ${bad.now.join(' | ')}`)
  check(bad.num.length === 0, `Sulit numbers <= ${MAX_N}: ${bad.num.join(' | ')}`)
  check(bad.lvl.length === 0, `Sulit levels: grade 3 -> L1–2, grade 4 -> L3–4: ${bad.lvl.join(' | ')}`)
  const arPics = items.filter(o => o.domain === 'arab' && ((o.visual || []).length || o.pics || o.swatch)).length
  console.log(`Sulit Arabic items with a picture: ${arPics}/${counts.arab || 0} (pictures where the sprite library has them)`)
  // tier separation in the picker (games/tk-quiz.js: opts.hard / spec.hard). Mudah must never serve grade 3–4.
  let leak = 0, hardHits = 0, n = 0
  for (let seed = 0; seed < 300; seed++) for (const d of ['umum', 'islam', 'logika', 'arab']) {
    for (const q of TK.build({ domain: d, count: 3, seed, islam: true })) { n++; if (isSulit(q)) leak++ }
    for (const q of TK.build({ domain: d, count: 3, seed, islam: true, hard: true })) if (isSulit(q)) hardHits++
  }
  check(leak === 0, `Mudah never serves a grade 3–4 item (${leak}/${n} leaked)`)
  check(hardHits > n * 0.4, `Sulit mostly serves grade 3–4 items (${hardHits}/${n})`)
}

/* ── B5. variety (owner 2026-09-29: "The questions repeat a lot") ────────────────────────────────
   - bank floors per tier; - no two questions share the same normalized prompt + answer (the picture,
   Arabic word, sound or swatch shown with the prompt counts as part of it, so "Apa gambar berikutnya?"
   over two different patterns is two questions); - near-duplicates: same domain, same answer, same
   picture and prompt words overlapping >= 75 % fail; - wording skeletons (numbers -> #) used >= 3 times
   in a topic are FLAGGED (printed), not failed: templated picture/number items share one on purpose. */
{
  const all = TQ.items
  const norm = s => String(s).toLowerCase().replace(/[…?!.,:;"()]/g, ' ').replace(/\s+/g, ' ').trim()
  const shown = o => [(o.visual || []).join(','), o.ar || '', o.listen || '', o.swatch || ''].join('|')
  const FLOOR = { 2: { umum: 180, logika: 110, islam: 100, arab: 95 }, S: { umum: 60, logika: 50, islam: 50, arab: 40 } }
  const cnt = { 2: {}, S: {} }
  for (const o of all) { const t = isSulit(o) ? 'S' : 2; cnt[t][o.domain] = (cnt[t][o.domain] || 0) + 1 }
  console.log('bank per tier:', JSON.stringify(cnt))
  for (const t of [2, 'S']) for (const [d, n] of Object.entries(FLOOR[t])) check((cnt[t][d] || 0) >= n, `${t === 2 ? 'Kelas 1–2' : 'Sulit'} ${d} >= ${n} (${cnt[t][d] || 0})`)
  const seen = new Map(), dup = [], near = []
  for (const o of all) {
    const key = [o.domain, norm(o.prompt), shown(o), o.answer].join('#')
    if (seen.has(key)) dup.push(o.id + ' = ' + seen.get(key)); else seen.set(key, o.id)
  }
  check(dup.length === 0, `no two questions share the normalized prompt + answer (${dup.length}): ${dup.slice(0, 10).join(' | ')}`)
  const toks = o => new Set(norm(o.prompt).split(' ').filter(w => w.length > 2 || /\d/.test(w)))
  const byAns = new Map()
  for (const o of all) { const k = o.domain + '#' + o.answer + '#' + shown(o); if (!byAns.has(k)) byAns.set(k, []); byAns.get(k).push(o) }
  for (const group of byAns.values()) for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
    const a = toks(group[i]), b = toks(group[j]), inter = [...a].filter(w => b.has(w)).length, uni = new Set([...a, ...b]).size
    if (uni && inter / uni >= 0.75 && norm(group[i].prompt) !== norm(group[j].prompt)) near.push(`${group[i].id} ~ ${group[j].id} ("${group[i].prompt}" / "${group[j].prompt}")`)
  }
  check(near.length === 0, `no near-duplicate questions (same answer + picture, >= 75 % same prompt words) (${near.length}): ${near.slice(0, 8).join(' | ')}`)
  const skel = o => norm(o.prompt).replace(/[؀-ۿ]+/g, '').replace(/\d+(\.\d{3})*/g, '#').replace(/\s+/g, ' ').trim()
  const sk = {}
  for (const o of all) { const k = o.domain + ' :: ' + skel(o); (sk[k] = sk[k] || []).push(o.id) }
  const flagged = Object.entries(sk).filter(([, ids]) => ids.length >= 3).sort((x, y) => y[1].length - x[1].length)
  console.log(`FLAG wording skeletons used >= 3 times per topic (${flagged.length}):`)
  for (const [k, ids] of flagged) console.log(`  ${ids.length}x  ${k}  [${ids.slice(0, 4).join(', ')}${ids.length > 4 ? ', …' : ''}]`)
  passes++
}

/* ── C. puppeteer ──────────────────────────────────────────────────────── */
if (!process.env.QA_NODE_ONLY) {
  const { default: puppeteer } = await import('puppeteer')
  const SHOTS = process.env.TKQ_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-quiz'
  fs.mkdirSync(SHOTS, { recursive: true })
  const BASE = 'http://localhost:8081/tools/tk-harness-quiz.html'
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const SIZES = [[390, 844], [844, 390], [1280, 800], [1024, 768]]   // 844x390 = phone on its side (stats panel was clipped there)

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
    const small = await P.p.evaluate(() => [...document.querySelectorAll('.tkq-opt,.tkq-next,.tkq-hintbtn,.tkq-item,.tkq-tile,.tkq-say,.tkq-speak')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return { c: e.className, w: Math.round(r.width), h: Math.round(r.height) } }).filter(x => x.w < 56 || x.h < 56))
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
      const P = await open(w, h, 'set=math5&seed=7&easy=0')
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
        // one wrong tap climbs one rung; the second wrong tap shows the answer (guided, rung 5)
        check(s.rung === (plan[i] >= 2 ? 5 : plan[i]), `${tag} q${i + 1}: ladder rung ${s.rung} after ${plan[i]} wrong taps`)
        await tap(P, optSel(s.answer)); await sleep(900)
        s = await state(P)
        check(s.answered, `${tag} q${i + 1}: right answer accepted`)
        const ok = await P.p.evaluate(sel => document.querySelector(sel).classList.contains('ok'), optSel(s.answer))
        check(ok, `${tag} q${i + 1}: correct button turns green`)
        if (i === 0) await P.p.screenshot({ path: `${SHOTS}/math-correct-${tag}.png` })
        await tap(P, '.tkq-next'); await sleep(500)
      }
      const done = await P.p.evaluate(() => window.__tkDone)
      check(done && done.asked === 5 && done.right === 3 && done.hints === 6 && typeof done.masteryDelta === 'number' && done.masteryDelta > 0, `${tag} onDone ${JSON.stringify(done && { right: done.right, asked: done.asked, hints: done.hints, d: done.masteryDelta, pts: done.points })}`)
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
      const P = await open(w, h, 'set=arab&seed=5&easy=0')
      const dir = await P.p.evaluate(() => [...document.querySelectorAll('.tkq-opt .tkq-ar')].map(e => getComputedStyle(e).direction))
      check(dir.length === 4 && dir.every(d => d === 'rtl'), `${tag} Arabic answers computed direction rtl (${dir.join(',')})`)
      await targets(P, tag + ' arab'); await inView(P, tag + ' arab')
      await P.p.screenshot({ path: `${SHOTS}/arab-pw-${tag}.png` })
      let s = await state(P); await tap(P, optSel(s.answer)); await sleep(700); await tap(P, '.tkq-next'); await sleep(500)
      const wd = await P.p.evaluate(() => { const e = document.querySelector('.tkq-arw .tkq-ar'); return e && getComputedStyle(e).direction })
      check(wd === 'rtl', `${tag} Arabic prompt word computed direction rtl (${wd})`)
      await P.p.screenshot({ path: `${SHOTS}/arab-wp-${tag}.png` })
      s = await state(P); await tap(P, optSel(s.answer)); await sleep(700); await tap(P, '.tkq-next'); await sleep(500)
      const lis = await P.p.evaluate(() => ({ say: !!document.querySelector('.tkq-say, .tkq-arsay'), tr: (document.querySelector('.tkq-arw .tkq-tr') || {}).textContent }))
      check(lis.say && (/Dengar/.test(lis.tr || '') || /^[a-z' -]{2,}$/i.test((lis.tr || '').trim())), `${tag} listen item: speaker button + transliteration text fallback (${lis.tr})`)
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
    // C7: ui-08 chrome (plate, 5 tabs with the current domain lit, stepper at Kuis, Kembali wired) + hints off
    {
      const P = await open(w, h, 'set=math5&back=1&topic=' + encodeURIComponent('Hitung peti di kapal.'))
      const ui = await P.p.evaluate(() => ({ plate: (document.querySelector('.tkq-plate h2') || {}).textContent, sub: (document.querySelector('.tkq-plate p') || {}).textContent,
        tabs: document.querySelectorAll('.tkq-tab').length, on: [...document.querySelectorAll('.tkq-tab.on')].map(t => t.dataset.d), step: (document.querySelector('.tkq-step.cur span') || {}).textContent,
        peng: [...document.querySelectorAll('img')].some(i => i.alt === 'Kapten' && /captain/.test(i.src)) }))
      check(ui.plate === 'Tantangan Matematika' && ui.tabs === 5 && ui.on.join() === 'matematika' && ui.step === 'Kuis' && ui.peng, `${tag} ui-08 chrome ${JSON.stringify(ui)}`)
      check(w < h || ui.sub === 'Hitung peti di kapal.' || h < 540, `${tag} plate subtitle = level goal (${ui.sub})`)
      const vis = await P.p.evaluate(() => { const vh = innerHeight, vw = innerWidth; return [...document.querySelectorAll('.tkq-stats,.tkq-plate,.tkq-tabs,.tkq-back,.tkq-next,.tkq-card')].filter(e => { const r = e.getBoundingClientRect(); return r.top < 70 || r.bottom > vh + 1 || r.right > vw + 1 || r.left < -1 }).map(e => e.className) })
      check(vis.length === 0, `${tag} stats/plate/tabs/footer all inside the viewport below the HUD ${JSON.stringify(vis)}`)
      await tap(P, '.tkq-back'); check(await P.p.evaluate(() => window.__tkBack === 1), `${tag} Kembali calls opts.onBack`)
      await P.p.close()
      const N = await open(w, h, 'set=math5&hints=0&easy=0')
      check(await N.p.evaluate(() => !document.querySelector('.tkq-hintbtn')), `${tag} hints off: no hint button`)
      const c = await wrongChoice(N); await tap(N, optSel(c)); await sleep(450)
      const nh = await N.p.evaluate(() => ({ hl: document.querySelectorAll('.tkq-o.hl').length, help: document.querySelector('.tkq-help').textContent, eq: !document.querySelector('.tkq-eq').hidden, open: [...document.querySelectorAll('.tkq-opt')].filter(b => !b.disabled).length }))
      check(nh.hl === 0 && !nh.help && nh.open === 3, `${tag} hints off: a wrong tap only fades that choice ${JSON.stringify(nh)}`)
      const s = await state(N); await tap(N, optSel(s.answer)); await sleep(500)
      check(await N.p.evaluate(() => !document.querySelector('.tkq-explain').hidden), `${tag} hints off: explanation still follows the answer`)
      await N.p.close()
    }
    // C6: reduced motion renders and answers
    {
      const P = await open(w, h, 'set=math5&rm=1')
      const s = await state(P); await tap(P, optSel(s.answer)); await sleep(300)
      check((await state(P)).answered && P.errs.length === 0, `${tag} reduced motion: answer works, no errors`)
      await P.p.close()
    }
    // D1: easy mode (Kelas 1): 3 big choices, numbers <= 10, picture first, question read aloud, tap-to-count
    {
      const P = await open(w, h, 'set=easy&grade=kelas1&scene=harbor-day')
      await sleep(500)
      const e = await P.p.evaluate(() => { const s = window.__tk.ctl.state(), qs = window.__tk.ctl.questions
        const sc = document.querySelector('.tkq-scene').getBoundingClientRect(), pr = document.querySelector('.tkq-prompt').getBoundingClientRect()
        return { s, n: document.querySelectorAll('.tkq-opt').length, easy: document.querySelector('.tkq').classList.contains('tkq-easy'),
          valid: qs.every(q => TKQuiz.validate(q).length === 0 && q.choices.length === 3 && q.choices.every(c => +c <= 10)),
          pic: document.querySelectorAll('.tkq-scene .tkq-o').length, first: sc.top < pr.top, short: document.querySelector('.tkq').classList.contains('tkq-short'),
          said: window.__said.slice(), prompt: document.querySelector('.tkq-prompt').textContent,
          speak: (() => { const b = document.querySelector('.tkq-speak').getBoundingClientRect(); return Math.min(b.width, b.height) })() } })
      check(e.easy && e.s.easy && e.n === 3 && e.valid, `${tag} easy: 3 choices, all questions valid, numbers <= 10 (${e.n})`)
      check(e.pic > 0 && (e.first || e.short), `${tag} easy: picture first (${e.pic} objects, scene above the words: ${e.first})`)
      check(e.said.includes(e.prompt), `${tag} read-aloud: question spoken on show (${JSON.stringify(e.said)})`)
      check(e.speak >= 56, `${tag} speaker button >= 56 px (${e.speak})`)
      await targets(P, tag + ' easy'); await inView(P, tag + ' easy')
      await P.p.screenshot({ path: `${SHOTS}/easy-q1-${tag}.png` })
      const n0 = await P.p.evaluate(() => window.__said.length)
      await tap(P, '.tkq-speak')
      const rep = await P.p.evaluate(() => window.__said.slice(-1)[0] === document.querySelector('.tkq-prompt').textContent)
      check(rep && (await P.p.evaluate(() => window.__said.length)) > n0, `${tag} speaker button repeats the question`)
      // tap-to-count: two taps -> badges 1, 2 and the words "satu", "dua"
      const objs = await P.p.evaluate(() => [...document.querySelectorAll('.tkq-scene.tapcount .tkq-o:not(.leave)')].map(o => o.dataset.o))
      await tap(P, `.tkq-o[data-o="${objs[0]}"]`); await tap(P, `.tkq-o[data-o="${objs[1]}"]`)
      const tc = await P.p.evaluate(() => ({ n: [...document.querySelectorAll('.tkq-o .n.on')].map(x => x.textContent).join(), said: window.__said.slice(-2) }))
      check(objs.length >= 2 && tc.n === '1,2' && tc.said.join() === 'satu,dua', `${tag} tap-to-count: badges ${tc.n}, spoken ${tc.said.join()}`)
      await P.p.screenshot({ path: `${SHOTS}/easy-count-${tag}.png` })
      // wrong once: lantern glows; wrong twice: the answer is shown kindly (glows, only it stays open)
      let c = await wrongChoice(P); await tap(P, optSel(c)); await sleep(450)
      const g1 = await P.p.evaluate(() => document.querySelector('.tkq-hintbtn').classList.contains('glow'))
      check(g1, `${tag} lantern glows after one wrong answer`)
      await P.p.screenshot({ path: `${SHOTS}/easy-glow-${tag}.png` })
      c = await wrongChoice(P); await tap(P, optSel(c)); await sleep(450)
      const g2 = await P.p.evaluate(() => { const s = window.__tk.ctl.state(), bs = [...document.querySelectorAll('.tkq-opt')]
        return { rung: s.rung, guide: bs.filter(b => b.classList.contains('guide')).map(b => b.dataset.c), open: bs.filter(b => !b.disabled).length, answer: s.answer, said: window.__said.slice(-1)[0] || '', red: bs.some(b => /rgb\((2[0-5]\d|1[5-9]\d), ?[0-6]\d?, ?[0-6]\d?\)/.test(getComputedStyle(b).backgroundColor)) } })
      check(g2.rung === 5 && g2.guide.join() === g2.answer && g2.open === 1 && /Jawabannya/.test(g2.said) && !g2.red, `${tag} two wrong tries -> answer shown kindly ${JSON.stringify(g2)}`)
      await P.p.screenshot({ path: `${SHOTS}/easy-guided-${tag}.png` })
      await tap(P, optSel(g2.answer)); await sleep(700)
      const fin = await P.p.evaluate(() => ({ s: window.__tk.ctl.state(), said: window.__said.slice(-1)[0] || '', ex: document.querySelector('.tkq-explain').textContent, burst: document.querySelectorAll('.tkq-burst').length }))
      check(fin.s.answered && fin.said.indexOf(fin.ex) >= 0, `${tag} explanation read aloud after the answer (${fin.said})`)
      check(fin.s.points > 0, `${tag} a guided answer still earns points (never costs progress: ${fin.s.points})`)
      check(P.errs.length === 0, `${tag} easy: no page errors ${P.errs.slice(0, 3).join(' | ')}`)
      await P.p.close()
    }
    // D2: readAloud two-tap: first tap speaks the choice, second tap chooses
    {
      const P = await open(w, h, 'set=easy&grade=kelas1&ra=1')
      let s = await state(P)
      await tap(P, optSel(s.answer)); await sleep(200)
      const a1 = await P.p.evaluate(sel => ({ armed: document.querySelector(sel).classList.contains('armed'), said: window.__said.slice(-1)[0], s: window.__tk.ctl.state() }), optSel(s.answer))
      check(a1.armed && !a1.s.answered && a1.said === s.answer, `${tag} readAloud: first tap says "${a1.said}" and does not choose`)
      await P.p.screenshot({ path: `${SHOTS}/easy-readaloud-${tag}.png` })
      await tap(P, optSel(s.answer)); await sleep(400)
      check((await state(P)).answered, `${tag} readAloud: second tap chooses`)
      await P.p.close()
      const Q = await open(w, h, 'set=easy&grade=kelas1')
      s = await state(Q); await tap(Q, optSel(s.answer)); await sleep(300)
      check((await state(Q)).answered, `${tag} without readAloud a single tap chooses`)
      await Q.p.close()
    }
    // D3: sort tutorial (first sort of the game) + narration of the prompt and the picked item
    {
      const P = await open(w, h, 'set=sort&world=calypso&domain=umum&seed=2&tut=1')
      await sleep(300)
      const t0 = await P.p.evaluate(() => ({ first: (document.querySelector('.tkq-tray .tkq-item') || {}).className || '', said: window.__said.slice(), prompt: window.__tk.ctl.set.prompt }))
      check(/\btut\b/.test(t0.first), `${tag} sort tutorial: first item pulses`)
      check(t0.said.includes(t0.prompt), `${tag} sort prompt read aloud`)
      await P.p.screenshot({ path: `${SHOTS}/sort-tutorial-${tag}.png` })
      const id = await P.p.evaluate(() => document.querySelector('.tkq-tray .tkq-item').dataset.id)
      await tap(P, `.tkq-item[data-id="${id}"]`); await sleep(150)
      const t1 = await P.p.evaluate(id => { const it = window.__tk.ctl.set.items.find(x => x.id === id); return { bins: [...document.querySelectorAll('.tkq-bin.tut')].map(b => b.dataset.bin), want: it.bin, said: window.__said.slice(-1)[0], label: it.label } }, id)
      check(t1.bins.length === 1 && t1.bins[0] === t1.want && t1.said === t1.label, `${tag} sort tutorial: the right bin pulses once the item is picked, item named aloud ${JSON.stringify(t1)}`)
      await P.p.screenshot({ path: `${SHOTS}/sort-tutorial-bin-${tag}.png` })
      await tap(P, `.tkq-bin[data-bin="${t1.want}"]`); await sleep(500)
      const t2 = await P.p.evaluate(() => ({ tut: window.__tk.ctl.state().tutorial, left: document.querySelectorAll('.tut').length, placed: window.__tk.ctl.state().placed }))
      check(t2.placed === 1 && !t2.tut && t2.left === 0, `${tag} sort tutorial ends after the first correct placement (tap item, tap bin) ${JSON.stringify(t2)}`)
      await P.p.close()
      const N = await open(w, h, 'set=sort&world=calypso&domain=umum&seed=2&tut=0')
      check(await N.p.evaluate(() => !document.querySelector('.tut')), `${tag} sort tutorial off: nothing pulses`)
      await N.p.close()
      // lifeboat seats: one per place, filled with passenger sprites (no lady-hat / maid)
      const C = await open(w, h, 'set=sort&world=titanic&domain=matematika&seed=4&tut=0')
      const seat = await C.p.evaluate(() => ({ n: document.querySelectorAll('.tkq-seatp').length, cap: window.__tk.ctl.set.bins.reduce((a, b) => a + b.cap, 0),
        srcs: [...document.querySelectorAll('.tkq-seatp img, .tkq-item .ppl img')].map(i => i.getAttribute('src')) }))
      check(seat.n === seat.cap && seat.srcs.length >= seat.n && seat.srcs.every(s => /tk-char\/(hijab-|explorer-kid|officer-boy|chef|mechanic-boy|lantern-boy)/.test(s)) && !seat.srcs.some(s => /lady-hat|maid/.test(s)), `${tag} lifeboat seats: ${seat.n}/${seat.cap}, passengers are hijab girls / boys / men sprites`)
      const fam = await C.p.evaluate(() => window.__tk.ctl.set.items.map(i => ({ id: i.id, n: i.n })).sort((x, y) => y.n - x.n))
      const load = { s1: 0, s2: 0 }
      for (const f of fam) { const bin = load.s1 + f.n <= 5 ? 's1' : 's2'; load[bin] += f.n; await tap(C, `.tkq-item[data-id="${f.id}"]`); await tap(C, `.tkq-bin[data-bin="${bin}"]`); await sleep(420) }
      const full = await C.p.evaluate(() => ({ full: document.querySelectorAll('.tkq-seatp.full').length, done: window.__tk.ctl.state().done }))
      check(full.done && full.full === seat.cap, `${tag} lifeboat solved by taps, every seat filled (${full.full}/${seat.cap})`)
      await C.p.screenshot({ path: `${SHOTS}/sort-seats-${tag}.png` })
      check(C.errs.length === 0, `${tag} seats: no page errors ${C.errs.slice(0, 3).join(' | ')}`)
      await C.p.close()
    }
  }
  await b.close()
}

console.log(`\n${fails.length ? 'FAIL' : 'PASS'} qa-tk-questions: ${passes} checks passed, ${fails.length} failed`)
process.exit(fails.length ? 1 : 0)
