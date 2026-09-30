// SoalEngine gate (games/data/soal-engine.js + soal-gen-matematika.js + soal-pack-kapal.js). Node only.
// Standard: documentation and standarization/SOAL_ENGINE_STANDARD.md
//   A) schema: every registered pack item normalizes to the one schema; source defects are
//      quarantined (never served) and the curated 'kapal' pack has none
//   B) grade filter: Mudah never serves grade 3–4 or Sulit math; Sulit serves grade 3–4; numeric grades
//   C) weights: 5,000 picks per profile within ±5 points of the profile weights (g30 + a test profile)
//   D) no-repeat: a topic pool is served without a repeat until exhausted, then least recently seen;
//      no repeat inside one session / one call; generated items never repeat a signature inside 50
//   E) history: persisted in localStorage 'soal-seen-<avatar>' and honoured after a simulated reload;
//      capped; a throwing localStorage never breaks a pick
//   F) generators: 10,000 fase A + 10,000 Sulit items, all correct and in range
//   G) pictures: sprite mode serves no emoji (every pack + generator), the game's spriteResolver wins
//   H) SuperQuiz backward compatibility: the old API returns the same shapes AND the same questions
//      for the same seeds whether SoalEngine is loaded or not
//   I) child safety: banned words are never served; the filter catches a planted item
//   J) profiles: defineGame inheritance, themed nouns + vocab in generated math, context overrides
// Run: node tools/qa-soal-engine.mjs
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL ' + msg) } }
const SRC = {}
const read = f => (SRC[f] = SRC[f] || fs.readFileSync(path.join(ROOT, f), 'utf8'))
const GENERAL = ['games/data/emoji-map.js', 'games/data/math-rules.js', 'games/data/super-quiz-data.js', 'games/data/question-super-engine.js',
  'games/data/kids-questions.js', 'games/data/g23-question-engine.js']
const ENGINE = ['games/data/tk-questions.js', 'games/data/soal-engine.js', 'games/data/soal-gen-matematika.js', 'games/data/soal-pack-kapal.js']

function memStorage (throws) {
  const m = new Map()
  return {
    _m: m,
    getItem: k => { if (throws) throw new Error('blocked'); return m.has(k) ? m.get(k) : null },
    setItem: (k, v) => { if (throws) throw new Error('blocked'); m.set(k, String(v)) },
    removeItem: k => { m.delete(k) }
  }
}
// a fresh "page": its own globals, an optional shared localStorage (a reload keeps the storage)
function load (files, storage) {
  const ctx = { Math, Date, JSON, console: { log () {}, warn () {}, error () {} }, performance: { now: () => Date.now() } }
  ctx.window = ctx; ctx.globalThis = ctx
  if (storage) ctx.localStorage = storage
  vm.createContext(ctx)
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f })
  return ctx
}
const W = load([...GENERAL, ...ENGINE])
const SE = W.SoalEngine
const words = s => String(s).trim().split(/\s+/).length
const EMO = /(?:[\uD83C-\uD83E][\uDC00-\uDFFF]|[☀-➿]|[⬀-⯿]|[■-◿])/
const pct = (c, k, n) => (c[k] || 0) / n * 100

/* ── A) schema ─────────────────────────────────────────────────────────── */
{
  const items = SE.items()
  const byPack = {}
  for (const o of items) { byPack[o.source] = byPack[o.source] || { n: 0, bad: [] }; byPack[o.source].n++; const p = SE.validateItem(o); if (p.length) byPack[o.source].bad.push(o.id + ' ' + p.join(';')) }
  console.log('packs: ' + Object.entries(byPack).map(([k, v]) => `${k} ${v.n}${v.bad.length ? ' (' + v.bad.length + ' quarantined)' : ''}`).join(', '))
  check(items.length > 1000, `registered items ${items.length} (kapal + kids + g23)`)
  check(byPack.kapal && byPack.kapal.n >= 400 && !byPack.kapal.bad.length, `kapal pack: ${byPack.kapal && byPack.kapal.n} items, schema problems ${byPack.kapal ? byPack.kapal.bad.slice(0, 3).join(' | ') : 'missing'}`)
  const quarantined = new Set(items.filter(o => o.invalid).map(o => o.id))
  check(items.every(o => !!o.invalid === SE.validateItem(o).length > 0), 'every schema failure is quarantined, and only those')
  const tk = W.TKQuestions.items
  check(SE.items('kapal').length === tk.length, `kapal pack reads the live bank as-is (${SE.items('kapal').length}/${tk.length})`)
  check(tk.every(o => !('topic' in o) && !('theme' in o)), 'registering the bank never mutates its items')
  // served items are always schema-valid
  let bad = 0
  for (let s = 0; s < 1500; s++) for (const q of SE.pick({ count: 4, seed: s })) if (SE.validateItem(q).length || quarantined.has(q.id)) bad++
  check(bad === 0, `default profile: every served item passes the schema (${bad} bad)`)
}

/* ── B) grade filter ───────────────────────────────────────────────────── */
{
  const probs = []
  let hi = 0, hard = 0, n = 0
  for (let s = 0; s < 1500; s++) for (const q of SE.pick({ game: 'g30', grade: 'mudah', count: 4, seed: s })) { n++; if (q.grade > 2) probs.push('grade ' + q.grade + ' ' + q.id); if (q.hard) probs.push('Sulit math ' + q.id) }
  check(!probs.length, `g30 Mudah: ${n} picks, none above grade 2 ${probs.slice(0, 3).join(' | ')}`)
  let math = 0, hardMath = 0
  for (let s = 0; s < 1500; s++) for (const q of SE.pick({ game: 'g30', grade: 'sulit', count: 4, seed: s })) { if (q.grade >= 3) hi++; if (q.topic === 'matematika') { math++; if (q.hard) hardMath++ } }
  check(hi > 1500 * 4 * 0.5, `g30 Sulit: mostly grade 3–4 (${hi}/${1500 * 4})`)
  check(math > 0 && hardMath === math, `g30 Sulit: every math question is Sulit (${hardMath}/${math})`)
  let g1 = []
  for (let s = 0; s < 800; s++) for (const q of SE.pick({ grade: 1, count: 3, seed: s })) if (q.grade > 1) g1.push(q.id + ' g' + q.grade)
  check(!g1.length, `numeric grade 1 serves grade 1 only ${g1.slice(0, 3).join(' | ')}`)
  let g3 = []
  for (let s = 0; s < 800; s++) for (const q of SE.pick({ grade: 3, count: 3, seed: s, topic: 'matematika' })) if (q.grade > 3) g3.push(q.id + ' g' + q.grade + ' ' + (q.kind || ''))
  check(!g3.length, `numeric grade 3 never serves grade-4 kinds ${g3.slice(0, 3).join(' | ')}`)
}

/* ── C) weights ───────────────────────────────────────────────────────── */
function distribution (opts, N) {
  const c = {}
  for (let s = 0; s < N; s++) { const q = SE.one({ ...opts, seed: 7000 + s }); if (q) c[q.topic] = (c[q.topic] || 0) + 1 }
  return c
}
{
  const want = SE.profile('g30').weights, tot = Object.values(want).reduce((a, b) => a + b, 0)
  const c = distribution({ game: 'g30', avatar: 'qa-weights' }, 5000)
  const off = Object.keys(want).filter(k => Math.abs(pct(c, k, 5000) - want[k] / tot * 100) > 5)
  check(!off.length, `g30 weights over 5000 picks within ±5: ${Object.keys(want).map(k => k + ' ' + pct(c, k, 5000).toFixed(1)).join(' ')}`)
  SE.defineGame('qa-truk', { weights: { matematika: 70, umum: 20, logika: 10 }, topics: ['matematika', 'umum', 'logika'] })
  const c2 = distribution({ game: 'qa-truk' }, 5000)
  const w2 = { matematika: 70, umum: 20, logika: 10 }
  const off2 = Object.keys(w2).filter(k => Math.abs(pct(c2, k, 5000) - w2[k]) > 5)
  check(!off2.length && Object.keys(c2).every(k => w2[k]), `qa-truk profile weights within ±5 and only its topics: ${JSON.stringify(c2)}`)
  // call-level weights beat the profile; maxPer caps a topic inside one call
  const c3 = distribution({ game: 'g30', weights: { umum: 1, logika: 1 } }, 2000)
  check(!c3.matematika && Math.abs(pct(c3, 'umum', 2000) - 50) <= 5, `call weights override the profile ${JSON.stringify(c3)}`)
  let capBad = 0
  for (let s = 0; s < 500; s++) { const qs = SE.pick({ game: 'g30', count: 4, seed: s, weights: { arab: 90, umum: 10 }, maxPer: { arab: 1 } }); if (qs.filter(q => q.topic === 'arab').length > 1) capBad++ }
  check(capBad === 0, `maxPer caps a topic per call (${capBad} calls over)`)
}

/* ── D) no-repeat ─────────────────────────────────────────────────────── */
{
  const X = load([...GENERAL, ...ENGINE], memStorage())
  const S = X.SoalEngine
  const pool = S.items('kapal').filter(o => o.topic === 'islam' && o.grade <= 2)
  const got = []
  for (let i = 0; i < pool.length; i++) got.push(S.one({ game: 'g30', avatar: 'qa-rep', topic: 'islam', seed: i }).id)
  check(new Set(got).size === pool.length, `islam Mudah pool (${pool.length}) served with no repeat until exhausted (${new Set(got).size} distinct)`)
  const next = S.one({ game: 'g30', avatar: 'qa-rep', topic: 'islam', seed: 999 }).id
  check(next === got[0], `after exhaustion: the least recently seen comes back first (${next} vs ${got[0]})`)
  const next2 = S.one({ game: 'g30', avatar: 'qa-rep', topic: 'islam', seed: 1000 }).id
  check(next2 === got[1], 'then the next least recently seen')
  // within one call and within a session (no avatar)
  let dup = 0
  for (let s = 0; s < 300; s++) { const ids = S.pick({ game: 'g30', count: 8, seed: s }).map(q => q.id); if (new Set(ids).size !== ids.length) dup++ }
  check(dup === 0, `no repeat inside one call (${dup} calls with a repeat)`)
  const sess = []
  for (let s = 0; s < 40; s++) sess.push(...S.pick({ game: 'g30', count: 1, seed: s, topic: 'umum', avatar: null }).map(q => q.id))
  check(new Set(sess).size === sess.length, `no repeat inside a session without an avatar (${new Set(sess).size}/${sess.length})`)
  // generated items: no signature twice inside any 50 consecutive math questions
  const sigs = []
  for (let s = 0; s < 300; s++) { const q = S.one({ game: 'g30', avatar: 'qa-gen', topic: 'matematika', seed: s, level: 3 }); sigs.push(q.prompt + '|' + q.answer + '|' + JSON.stringify(q.calc)) }
  let win = 0
  for (let i = 0; i < sigs.length; i++) if (sigs.slice(Math.max(0, i - 49), i).includes(sigs[i])) win++
  check(win === 0, `generated math: no signature repeated inside 50 (${win} repeats in 300)`)
  // one template never dominates (owner 2026-09-30): a generated kind at most once in any 4 consecutive questions
  for (const [lbl, extra] of [['easy', { easy: true, level: 1 }], ['level 2', { level: 2 }], ['level 4', { level: 4 }]]) {
    const ks = []
    for (let s = 0; s < 300; s++) ks.push(S.one({ game: 'g30', avatar: 'qa-kind-' + lbl, topic: 'matematika', seed: 5000 + s, ...extra }).kind)
    let crowd = 0
    for (let i = 3; i < ks.length; i++) if (ks.slice(i - 3, i).includes(ks[i])) crowd++
    check(crowd === 0, `template spread (${lbl}): no kind twice in any 4 (${crowd} crowded windows)`)
  }
  // variety: 57 fase A prompts (the playtest sample size) use >= 8 templates, none above 25 %
  {
    const ks = {}
    for (let s = 0; s < 57; s++) { const k = S.one({ game: 'g30', avatar: 'qa-variety', topic: 'matematika', seed: 9000 + s, level: 2 }).kind; ks[k] = (ks[k] || 0) + 1 }
    check(Object.keys(ks).length >= 8 && Math.max(...Object.values(ks)) <= 57 * 0.25, `fase A variety over 57 prompts: ${JSON.stringify(ks)}`)
  }
  // cross-world / cross-level: one avatar history across every world and level of the game
  const cw = []
  const WORLDS = ['titanic', 'britannic', 'vasa', 'calypso', 'endurance', 'queenmary', 'kontiki', 'mayflower']
  for (let s = 0; s < 80; s++) cw.push(...S.pick({ game: 'g30', avatar: 'qa-worlds', count: 4, seed: 800 + s, theme: WORLDS[s % WORLDS.length], level: 1 + (s % 4), weights: { umum: 1 } }).map(q => q.id))
  const umumPool = S.items('kapal').filter(o => o.topic === 'umum' && o.grade <= 2).length
  check(new Set(cw).size === Math.min(cw.length, umumPool), `across 8 worlds x 4 levels: ${cw.length} umum picks, ${new Set(cw).size} distinct (pool ${umumPool})`)
  // a goal line ("about") never brings back a question the avatar already had (playtest 2026-09-30: lg-dy-6 twice)
  {
    const pool = S.items('kapal').filter(o => o.topic === 'logika' && o.grade <= 2).length
    const ids = []
    for (let k = 0; k < Math.floor(pool / 5); k++) ids.push(...S.pick({ game: 'g30', avatar: 'qa-about', topic: 'logika', count: 5, seed: 300 + k, about: k % 2 ? 'Latihan bebas — tanpa batas waktu.' : 'Setelah malam datang pagi, waktunya bangun' }).map(q => q.id))
    check(new Set(ids).size === ids.length, `goal-line picks keep the no-repeat history (${ids.length} picks, ${new Set(ids).size} distinct, pool ${pool})`)
  }
  // an explicitly requested topic serves only that topic
  {
    const bad = []
    for (const t of ['matematika', 'logika', 'umum', 'islam', 'arab']) for (let s = 0; s < 200; s++) for (const q of S.pick({ game: 'g30', topic: t, count: 5, seed: s, about: 'Latihan bebas — tanpa batas waktu.' })) if (q.topic !== t && bad.length < 3) bad.push(t + '->' + q.id)
    check(!bad.length, `topic requests serve only that topic ${bad.join(' | ')}`)
  }
}

/* ── E) history persistence ──────────────────────────────────────────── */
{
  SE.defineGame('qa-exclusion', { topics: ['umum', 'logika'], weights: { umum: 100 },
    exclusionOverrides: { optional: { weights: { logika: 100 } } } })
  const automatic = SE.pick({ game: 'qa-exclusion', without: ['optional'], count: 8, seed: 8 })
  const explicit = SE.pick({ game: 'qa-exclusion', without: ['optional'], weights: { umum: 100 }, count: 8, seed: 8 })
  const practice = SE.pick({ game: 'qa-exclusion', without: ['optional'], topic: 'umum', count: 8, seed: 8 })
  check(automatic.length === 8 && automatic.every(q => q.topic === 'logika'), 'declared exclusion override changes the profile centrally')
  check(explicit.length === 8 && explicit.every(q => q.topic === 'umum') && practice.length === 8 && practice.every(q => q.topic === 'umum'),
    'explicit call weights and topic practice retain priority over exclusion overrides')
}
{
  const cases = [
    { seen: 'broken' }, { seen: { g30: 'broken', valid: { keep: 7 } } },
    { sig: { g30: {}, valid: ['keep-signature'] } }, { kinds: { g30: {}, valid: ['keep-kind'] } },
    { mix: { g30: { n: 1000, count: {}, recent: [] } } },
    { mix: { g30: { n: Number.MAX_SAFE_INTEGER + 1, count: { matematika: Number.MAX_SAFE_INTEGER + 1 }, recent: [] } } },
    { mix: { g30: { n: 100, count: { matematika: 100 }, recent: Array(100).fill('matematika') } } }
  ]
  const failures = []
  for (const [index, broken] of cases.entries()) {
    const store = memStorage()
    store.setItem('soal-seen-qa-corrupt', JSON.stringify({ v: 1, n: 7, seen: { valid: { keep: 7 } },
      sig: { valid: ['keep-signature'] }, kinds: { valid: ['keep-kind'] }, ...broken }))
    try {
      const engine = load(ENGINE, store).SoalEngine
      const question = engine.one({ game: 'g30', avatar: 'qa-corrupt', seed: 4, weights: { arab: 99, matematika: 1 } })
      const saved = JSON.parse(store.getItem('soal-seen-qa-corrupt'))
      if (!question || question.topic === 'arab') failures.push(index + ': delivery/quota')
      if (typeof broken.seen !== 'string' && saved.seen.valid.keep !== 7) failures.push(index + ': valid seen lost')
      if (saved.sig.valid[0] !== 'keep-signature' || saved.kinds.valid[0] !== 'keep-kind') failures.push(index + ': valid lists lost')
    } catch (error) { failures.push(index + ': ' + error.message) }
  }
  check(!failures.length, `malformed history scopes and inconsistent quotas recover without losing valid fields (${failures.join('; ')})`)
}
{
  const store = memStorage(), files = [...GENERAL, ...ENGINE]
  let engine = load(files, store).SoalEngine
  const topics = [], violations = []
  for (let i = 0; i < 1000; i++) {
    if (i === 400) engine = load(files, store).SoalEngine
    const q = engine.one({ game: 'g30', avatar: 'qa-arab-cap', seed: i, without: ['islam'],
      weights: { arab: 99, matematika: 1 }, about: 'Bahasa Arab', aboutCount: 1 })
    if (!q) { violations.push('empty ' + i); continue }
    topics.push(q.topic)
    const arabic = topics.filter(t => t === 'arab').length
    if (arabic > Math.floor(topics.length * 0.08 + 1e-9)) violations.push('share at ' + i)
    if (topics.slice(-4).filter(t => t === 'arab').length > 1) violations.push('four-question window at ' + i)
  }
  check(!violations.length && topics.includes('arab'), `mixed Arabic cap survives one-question calls, topical priority, Islam off and reload (${violations.slice(0, 4)})`)
  const practice = engine.pick({ game: 'g30', avatar: 'qa-arab-cap', topic: 'arab', count: 8, seed: 4 })
  check(practice.length === 8 && practice.every(q => q.topic === 'arab'), 'explicit Arabic practice bypasses the mixed cap')
  const another = engine.one({ game: 'g30', avatar: 'qa-arab-cap-other', weights: { arab: 99, matematika: 1 }, seed: 4 })
  check(another && another.topic !== 'arab', 'another avatar starts a separate mixed quota')
}
{
  const store = memStorage()
  const A = load([...GENERAL, ...ENGINE], store)
  const first = []
  for (let i = 0; i < 30; i++) first.push(A.SoalEngine.one({ game: 'g30', avatar: 'qa-reload', topic: 'umum', seed: i }).id)
  const raw = store.getItem('soal-seen-qa-reload')
  check(!!raw && JSON.parse(raw).v === 1, 'history saved under localStorage soal-seen-<avatar>')
  const B = load([...GENERAL, ...ENGINE], store)   // the page reloads: same storage, fresh engine
  const again = []
  for (let i = 0; i < 30; i++) again.push(B.SoalEngine.one({ game: 'g30', avatar: 'qa-reload', topic: 'umum', seed: i }).id)
  const overlap = again.filter(id => first.includes(id))
  check(overlap.length === 0, `after a reload the same seeds serve unseen items (overlap ${overlap.length}/30)`)
  // another avatar has its own history; 'shared' scope spans games
  const other = []
  for (let i = 0; i < 30; i++) other.push(B.SoalEngine.one({ game: 'g30', avatar: 'qa-other', topic: 'umum', seed: i }).id)
  check(other.filter(id => first.includes(id)).length > 10, 'a different avatar starts with its own history')
  // cap: 2,000 items in a test pack, 1,700 picks -> stored ids stay <= 1,500
  const big = []; for (let i = 0; i < 2000; i++) big.push({ id: 'cap-' + i, topic: 'qa-cap', grade: 1, prompt: 'Soal nomor ' + i, choices: ['a' + i, 'b' + i, 'c' + i], answer: 'a' + i })
  B.SoalEngine.registerPack('qa-cap', { items: big, meta: { general: true } })
  B.SoalEngine.defineGame('qa-cap', { topics: ['qa-cap'], weights: { 'qa-cap': 1 }, packs: ['qa-cap'] })
  for (let i = 0; i < 1700; i++) B.SoalEngine.one({ game: 'qa-cap', avatar: 'qa-capper', seed: i })
  const capped = JSON.parse(store.getItem('soal-seen-qa-capper'))
  const nSeen = Object.keys(capped.seen['qa-cap'] || {}).length
  check(nSeen <= 1500 && nSeen >= 1000, `history capped (${nSeen} ids stored after 1700 picks)`)
  // 'auto' with no avatar chosen yet still persists (a reload / another world never resets it)
  const N = load([...GENERAL, ...ENGINE], store)
  N.SoalEngine.one({ game: 'g30', seed: 1 })
  check(!!store.getItem('soal-seen-anon'), "avatar 'auto' without an active avatar persists under soal-seen-anon")
  // a throwing storage (private mode) never breaks a pick
  const T = load([...GENERAL, ...ENGINE], memStorage(true))
  let ok = 0
  for (let i = 0; i < 20; i++) if (T.SoalEngine.one({ game: 'g30', avatar: 'qa-private', seed: i })) ok++
  check(ok === 20, `a throwing localStorage still serves (${ok}/20)`)
}

/* ── F) generators ───────────────────────────────────────────────────── */
{
  const worlds = [null, 'titanic', 'queenmary', 'calypso', 'endurance', 'britannic', 'kamar']
  const r = SE.rng(4242)
  let bad = [], kinds = {}
  for (let i = 0; i < 10000; i++) {
    const q = SE.generate('matematika', { game: 'g30', grade: 2, level: 1 + (i % 4), rng: r, theme: worlds[i % worlds.length], easy: i % 5 === 0 })
    kinds[q.kind] = 1
    const p = SE.validate(q).concat(SE.validateItem(q))
    if (q.grade > 2 || q.hard) p.push('not fase A')
    if (q.choices.some(c => /^\d+$/.test(c) && +c > 20)) p.push('number > 20')
    if (/setengah|×|:/.test(q.prompt + (q.eq || '')) && q.kind !== 'share') p.push('fase A rule')
    if (!q.explain || !q.hint1 || !q.hint2 || !q.step1) p.push('missing text')
    if (p.length && bad.length < 4) bad.push(`${q.kind} ${q.prompt} [${q.choices}] ${q.answer}: ${p.join(';')}`)
  }
  check(!bad.length, 'fase A: 10,000 generated, all correct and in range ' + bad.join(' | '))
  check(['count', 'add', 'sub', 'biggest', 'smallest', 'bond', 'tomake', 'double', 'pattern', 'fewer', 'length', 'clock', 'diff', 'capacity', 'twostep'].every(k => kinds[k]), 'fase A covers every scheduled kind: ' + Object.keys(kinds).join())
  bad = []; kinds = {}
  const r2 = SE.rng(99)
  for (let i = 0; i < 10000; i++) {
    const q = SE.generate('matematika', { game: 'g30', grade: 'sulit', rng: r2, theme: worlds[i % worlds.length] })
    kinds[q.kind] = 1
    const p = SE.validate(q).concat(SE.validateItem(q))
    if (!q.hard || q.grade < 3 || q.choices.length !== 4) p.push('not Sulit')
    if (p.length && bad.length < 4) bad.push(`${q.kind} ${q.prompt} [${q.choices}] ${q.answer}: ${p.join(';')}`)
  }
  check(!bad.length, 'Sulit: 10,000 generated, all correct and in range ' + bad.join(' | '))
  check(['add3', 'sub3', 'times', 'div', 'frac', 'clock5', 'money', 'measure', 'story'].every(k => kinds[k]), 'Sulit covers every Kelas 3–4 kind: ' + Object.keys(kinds).join())
  // the container and its contents are different nouns ("Ada 4 peti. Tiap peti berisi 7 peti." — playtest 2026-09-30)
  {
    const same = []
    for (let i = 0; i < 4000; i++) {
      const q = SE.generate('matematika', { game: 'g30', grade: 'sulit', seed: i, theme: ['vasa', 'titanic', 'queenmary', null][i % 4], kind: ['times', 'story', 'div'][i % 3] })
      if (/\b(peti|sekoci)\b[^.]*\b(\d+) (peti|sekoci)\b/.test(q.prompt.replace(/^[^.]*?(Tiap|tiap)/, '$1')) || q.noun === 'peti' || q.noun === 'sekoci') same.push(q.prompt)
      const a = SE.generate('matematika', { game: 'g30', grade: 2, level: 3, seed: i, theme: 'vasa', kind: ['groups', 'share', 'capacity'][i % 3] })
      if (a.noun === 'sekoci' || a.noun === 'peti') same.push(a.prompt)
    }
    check(!same.length, `container != contents noun (${same.length}) ${same.slice(0, 2).join(' | ')}`)
    SE.defineGame('qa-karung', { nouns: { _: [['qa/karung', 'karung'], ['food/apple', 'apel']] }, vocab: { crate: 'karung', box: 'karung' } })
    const k = []
    for (let i = 0; i < 300; i++) { const q = SE.generate('matematika', { game: 'qa-karung', grade: 'sulit', seed: i, kind: 'times' }); if (q.noun !== 'apel') k.push(q.prompt) }
    check(!k.length, `karung holds apel, never karung (${k.slice(0, 2).join(' | ')})`)
  }
  // forced kinds incl. the goal-only ones
  let fb = []
  for (const k of ['groups', 'share', 'groupsplus', 'clock', 'twostep', 'smallest', 'bond', 'tomake', 'double', 'pattern', 'fewer', 'length']) for (let i = 0; i < 400; i++) { const q = SE.generate('matematika', { game: 'g30', grade: 2, level: 4, kind: k, seed: i }); const p = SE.validate(q); if (p.length && fb.length < 3) fb.push(k + ' ' + p.join(';')) }
  check(!fb.length, 'forced fase A kinds valid ' + fb.join(' | '))
  // easy mode: 3 choices, numbers within 0..10 around the answer
  let eb = 0
  for (let s = 0; s < 1000; s++) { const q = SE.one({ game: 'g30', topic: 'matematika', easy: true, level: 1, seed: s }); if (q.choices.length !== 3 || !q.easy || SE.validate(q).length) eb++ }
  check(eb === 0, `easy mode serves 3 valid choices (${eb} bad of 1000)`)
}

/* ── G) pictures ─────────────────────────────────────────────────────── */
{
  let emo = [], served = 0, withPic = 0
  for (let s = 0; s < 3000; s++) for (const q of SE.pick({ count: 3, seed: s, pictures: 'sprite' })) {
    served++
    if (q.pic || q.choicePics) withPic++
    const t = [q.prompt, q.answer, ...q.choices].join(' ')
    if (EMO.test(t) && emo.length < 4) emo.push(q.id + ' ' + t)
  }
  check(!emo.length, `sprite mode: ${served} served, no emoji (${withPic} carry sprites) ${emo.join(' | ')}`)
  check(withPic > 0, 'sprite mode converts emoji into sprite keys (some items carry pic / choicePics)')
  let g30emo = 0
  for (let s = 0; s < 1500; s++) for (const q of SE.pick({ game: 'g30', count: 4, seed: s })) if (EMO.test([q.prompt, q.answer, ...q.choices].join(' '))) g30emo++
  check(g30emo === 0, `g30 (sprite profile): no emoji served (${g30emo})`)
  let emojiKept = 0
  for (let s = 0; s < 1500; s++) for (const q of SE.pick({ count: 3, seed: s, pictures: 'emoji' })) if (EMO.test([q.prompt, ...q.choices].join(' '))) emojiKept++
  check(emojiKept > 0, `emoji mode keeps the authored emoji (${emojiKept} items)`)
  let none = 0
  for (let s = 0; s < 1500; s++) for (const q of SE.pick({ count: 3, seed: s, pictures: 'none' })) if (EMO.test([q.prompt, q.answer, ...q.choices].join(' ')) || q.pic) none++
  check(none === 0, `pictures 'none' strips emoji and adds no sprite (${none})`)
  // the game's own sprite resolver wins over EmojiMap
  SE.registerPack('qa-emoji', { items: [{ id: 'qa-cat', topic: 'qa-emo', grade: 1, prompt: 'Hewan apa ini? 🐱', choices: ['kucing', 'anjing', 'sapi'], answer: 'kucing' }], meta: { general: true } })
  SE.defineGame('qa-art', { topics: ['qa-emo'], weights: { 'qa-emo': 1 }, pictures: 'sprite', spriteResolver: ch => ch === '🐱' ? 'qa-art/kitty' : null })
  const qa = SE.one({ game: 'qa-art', seed: 1 })
  check(qa && qa.pic === 'qa-art/kitty' && qa.prompt === 'Hewan apa ini?', `spriteResolver hook: ${qa && qa.pic} "${qa && qa.prompt}"`)
}

/* ── H) SuperQuiz backward compatibility ─────────────────────────────── */
{
  const bare = load(GENERAL).SuperQuiz, bare2 = load(GENERAL).SuperQuiz, SQ = W.SuperQuiz
  check(SQ.subjects().length === 8 && SQ.subjects().join() === bare.subjects().join(), 'SuperQuiz.subjects() unchanged')
  check(SQ.capacity() === bare.capacity() && SQ.capacity() >= 100000, `SuperQuiz.capacity() unchanged (${SQ.capacity()})`)
  // SuperQuiz 'math' delegates to makeMathQuestionV2 (Math.random), so it is not seed-stable even
  // without SoalEngine: those subjects are compared on shape only
  let shape = 0, same = 0, n = 0, nd = 0
  const unstable = new Set()
  for (const s of SQ.subjects()) for (let i = 0; i < 200; i++) {
    const o = { subject: s, difficulty: ['easy', 'medium', 'hard', 'expert'][i % 4], seed: i * 13 + 1 }
    if (JSON.stringify(bare.generate(o)) !== JSON.stringify(bare2.generate(o))) unstable.add(s)
  }
  for (const s of SQ.subjects()) for (let i = 0; i < 200; i++) {
    const o = { subject: s, difficulty: ['easy', 'medium', 'hard', 'expert'][i % 4], seed: i * 13 + 1 }
    const a = SQ.generate(o), b = bare.generate(o); n++
    if (Object.keys(a).sort().join() === 'ans,choices,difficulty,q,shape,subject' && Array.isArray(a.choices) && a.choices.map(String).includes(String(a.ans))) shape++
    if (!unstable.has(s)) { nd++; if (JSON.stringify(a) === JSON.stringify(b)) same++ }
  }
  check(shape === n, `SuperQuiz.generate shape {q, ans, choices, subject, shape, difficulty} (${shape}/${n})`)
  check(nd > 1000 && same === nd, `SuperQuiz.generate: same question for the same seed with SoalEngine loaded (${same}/${nd}; not seed-stable on its own: ${[...unstable]})`)
  const b1 = SQ.batch({ count: 12, seed: 5, subject: 'umum' }), b2 = bare.batch({ count: 12, seed: 5, subject: 'umum' })
  check(b1.length === 12 && JSON.stringify(b1) === JSON.stringify(b2), 'SuperQuiz.batch unchanged')
  // its generators also serve through SoalEngine (general pools)
  const src = {}
  for (let s = 0; s < 600; s++) for (const q of SE.pick({ count: 2, seed: s })) src[q.source.replace(/-(easy|medium|hard|expert)$/, '')] = 1
  check(src['sq-umum'] || src['sq-sains'] || src['sq-logika'], 'SuperQuiz generators plug into SoalEngine: ' + Object.keys(src).join())
}

/* ── I) child safety ─────────────────────────────────────────────────── */
{
  const RE = SE.UNSAFE
  let hits = []
  const scan = q => { const t = [q.prompt, q.answer, ...q.choices, q.explain || '', q.hint1 || '', q.hint2 || ''].join(' '); if (RE.test(t) && hits.length < 4) hits.push(q.id + ': ' + t.slice(0, 80)) }
  for (let s = 0; s < 3000; s++) SE.pick({ count: 3, seed: s }).forEach(scan)
  for (let s = 0; s < 1500; s++) SE.pick({ game: 'g30', count: 4, seed: s }).forEach(scan)
  for (let s = 0; s < 1500; s++) SE.pick({ game: 'g30', grade: 'sulit', count: 4, seed: s }).forEach(scan)
  check(!hits.length, 'no banned word is ever served ' + hits.join(' | '))
  const kapalHits = SE.items('kapal').filter(o => o.unsafe).map(o => o.id)
  check(!kapalHits.length, 'the kapal bank carries no banned word ' + kapalHits.join())
  SE.registerPack('qa-unsafe', { items: [{ id: 'qa-bad', topic: 'qa-bad', grade: 1, prompt: 'Siapa yang bodoh?', choices: ['a', 'b', 'c'], answer: 'a' }], meta: { general: true } })
  SE.defineGame('qa-bad', { topics: ['qa-bad'], weights: { 'qa-bad': 1 } })
  check(SE.pick({ game: 'qa-bad', seed: 1 }).length === 0, 'a planted unsafe item is filtered out')
  const quarantinedUnsafe = SE.items().filter(o => o.unsafe).length
  console.log(`(${quarantinedUnsafe} source items carry a banned word and are never served)`)
}

/* ── J) profiles: inheritance, nouns, vocab, contexts ─────────────────── */
{
  const P = SE.defineGame('qa-min', {})
  check(P['extends'] === undefined && P.choices.easy === 3 && P.contexts.challenge && P.weights.matematika === 40, 'defineGame(id, {}) inherits every default')
  SE.defineGame('qa-child', { extends: 'g30', weights: { matematika: 100 } })
  const C = SE.profile('qa-child')
  check(C.pictures === 'sprite' && C.nouns.titanic && C.weights.matematika === 100 && !C.weights.arab && C.contexts.challenge.maxWords[2] === 14, 'extends chains a game profile and overrides one key')
  // themed nouns in generated math
  const endu = new Set(), sp = []
  for (let s = 0; s < 400; s++) { const q = SE.generate('matematika', { game: 'g30', grade: 2, level: 2, seed: s, theme: 'endurance', kind: 'add' }); endu.add(q.noun); sp.push(...q.visual) }
  check([...endu].every(n => ['penguin', 'bongkah es'].includes(n)) && sp.every(k => ['animals/penguin', 'game/crystal-ice'].includes(k)), `g30 endurance nouns: ${[...endu]}`)
  const g30add = SE.generate('matematika', { game: 'g30', grade: 2, level: 2, seed: 3, kind: 'add', theme: 'titanic' })
  check(/ di kapal\. \d+ lagi dimuat\. Jadi berapa\?$/.test(g30add.prompt) && /naik ke kapal!$/.test(g30add.explain), `g30 vocab keeps the ship story: "${g30add.prompt}"`)
  SE.defineGame('qa-garasi', { nouns: { _: [['qa/ban', 'ban'], ['qa/baut', 'baut']] }, vocab: { place: 'garasi', deck: 'garasi', load: 'datang', unload: 'dibawa pergi', carrier: 'Truk', box: 'truk', crate: 'kotak', seat: 'Truk' } })
  const gt = []
  for (let s = 0; s < 600; s++) gt.push(SE.generate('matematika', { game: 'qa-garasi', grade: 2, level: 1 + (s % 4), seed: s }))
  check(gt.every(q => ['ban', 'baut'].includes(q.noun)) && gt.every(q => !/kapal|sekoci|\bdek\b|diturunkan|dimuat/.test(q.prompt + q.explain + q.hint1 + q.hint2)), 'qa-garasi: nouns + vocab substituted, no ship words left')
  check(gt.some(q => / di garasi\. \d+ lagi datang/.test(q.prompt)), 'qa-garasi story reads "… di garasi. N lagi datang."')
  const neutral = []
  for (let s = 0; s < 600; s++) neutral.push(SE.generate('matematika', { grade: 2, level: 1 + (s % 4), seed: s }))
  check(neutral.every(q => !/kapal|sekoci|diturunkan/.test(q.prompt + q.explain)), 'the default profile never tells a ship story')
  const sul = []
  for (let s = 0; s < 400; s++) sul.push(SE.generate('matematika', { game: 'qa-garasi', grade: 4, seed: s }))
  check(sul.every(q => !/Kapal|sekoci|jangkar|diturunkan/.test(q.prompt)) && sul.every(q => !SE.validate(q).length), 'Sulit math takes the game vocab too, still valid')
  // context overrides: a challenge never serves letters / listen-only and keeps prompts short
  let chBad = [], quizLetters = 0
  for (let s = 0; s < 2000; s++) {
    const q = SE.one({ game: 'g30', context: 'challenge', seed: s, grade: 'mudah' })
    if (q.letters || q.listen || words(q.prompt) > 14) chBad.push(q.id + ' ' + words(q.prompt))
  }
  for (let s = 0; s < 1500; s++) { const q = SE.one({ game: 'g30', topic: 'arab', seed: s }); if (q.letters) quizLetters++ }
  check(!chBad.length, `context 'challenge': no letters / listen, prompt <= 14 words ${chBad.slice(0, 3).join(' | ')}`)
  check(quizLetters > 0, `without a context the Arabic topic still serves arrange-letters (${quizLetters})`)
  let q2 = 0
  for (let s = 0; s < 1500; s++) for (const q of SE.pick({ game: 'g30', context: 'quiz', count: 4, seed: s })) if (q.letters) q2++
  check(q2 === 0, `context 'quiz' (mixed step): no arrange-letters (${q2})`)
  // a call option beats the context
  let longOk = 0
  for (let s = 0; s < 800; s++) { const q = SE.one({ game: 'g30', context: 'challenge', maxWords: 5, seed: s, topic: 'umum' }); if (q && words(q.prompt) <= 5) longOk++ }
  check(longOk > 0, `call maxWords overrides the context (${longOk} short prompts)`)
  // per-profile distribution under a context stays on the profile weights
  const cc = {}
  for (let s = 0; s < 5000; s++) { const q = SE.one({ game: 'g30', context: 'challenge', seed: 20000 + s }); cc[q.topic] = (cc[q.topic] || 0) + 1 }
  check(Math.abs(pct(cc, 'matematika', 5000) - 50) <= 5 && pct(cc, 'arab', 5000) <= 13, `g30 challenge distribution ${JSON.stringify(cc)}`)
  // about (a level's goal line): matching curated items come first
  const ab = SE.pick({ game: 'g30', count: 4, seed: 3, history: false, about: 'Kenali pelampung dan jaket pelampung', weights: { umum: 1, logika: 1 } })
  const abw = SE.topicWords('Kenali pelampung dan jaket pelampung', ['kapal', 'timmy'])
  check(ab.length === 4 && SE.topicScore(ab[0], abw) > 0, `about: the first question matches the goal ("${ab[0] && ab[0].prompt}", words ${abw})`)
  const clk = SE.pick({ game: 'g30', count: 2, seed: 4, topic: 'matematika', about: 'Baca jadwal pukul berapa kapal berangkat', level: 2 })
  check(clk[0].kind === 'clock', `about -> generated kind (goal "pukul" -> ${clk[0].kind})`)
}

console.log(fails.length ? `FAIL qa-soal-engine: ${passes} passed, ${fails.length} failed` : `PASS qa-soal-engine: ${passes} checks passed`)
process.exit(fails.length ? 1 : 0)
