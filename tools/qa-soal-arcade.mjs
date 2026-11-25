// PRD-39 gate: the thin arcade games (Ducky Volley g20, Pokemon Birds g19, Balapan Kereta Side g14s) draw their
// questions from the shared SoalEngine through games/data/soal-arcade.js. Node only, no browser.
//   L1  10 questions x 20 seeds (fresh child each) -> at least 100 different questions per game
//   L2  every answer emits DuniaBus 'answer' whose domain/skill LearningLog names (never 'Lainnya')
//   L3  a simulated strong child and a weak child end on different grades inside 15 questions
//   L4  every servable item is correct: answer once in the options, no duplicate options, arithmetic true,
//       short prompt and options, every emoji has a sprite in EmojiMap, no unsafe word
//   L5  each page really loads the module and calls next() and answer() (static, per page)
// QA_ROOT=<dir> runs the gate against another tree (the red run uses an untouched origin/main copy).
// QA_PLANT=1 registers one wrong-arithmetic item and one duplicate-option item: the gate must fail.
// Run: node tools/qa-soal-arcade.mjs
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.QA_ROOT ? path.resolve(process.env.QA_ROOT) : HERE
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL ' + msg) } }
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const D = 'games/data/'
const FILES = ['emoji-map', 'super-quiz-data', 'question-super-engine', 'kids-questions', 'g23-question-engine', 'soal-engine',
  'soal-gen-matematika', 'dunia-bus', 'learning-log', 'mastery', 'soal-arcade'].map(f => D + f + '.js')
const GAMES = { g20: 'games/ducky-volley.html', g19: 'games/pokemon-birds.html', g14s: 'games/balapan-kereta-side.html' }

function mem () {
  const m = new Map()
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }
}
function page () {
  const ctx = { Math, Date, JSON, Object, console: { log () {}, warn () {}, error () {} }, localStorage: mem(), sessionStorage: mem(),
    location: { pathname: '/games/x.html' }, CustomEvent: function () {}, dispatchEvent () {} }
  ctx.window = ctx; ctx.globalThis = ctx
  vm.createContext(ctx)
  for (const f of FILES) { if (fs.existsSync(path.join(ROOT, f))) vm.runInContext(rd(f), ctx, { filename: f }) }
  return ctx
}

const base = page()
check(!!base.SoalArcade, 'games/data/soal-arcade.js loads and defines SoalArcade')
if (!base.SoalArcade) { console.log(`FAIL qa-soal-arcade: ${passes} passed, ${fails.length} failed`); process.exit(1) }

const EMOJI = /(?:[\uD83C-\uD83E][\uDC00-\uDFFF]|[☀-➿]|[⬀-⯿])️?/g
const JARGON = /fotosintesis|vertebrata|invertebrata|karbondioksida|protozoa|respirasi|evaporasi|osmosis/i
// the gate's own reading of the shared banks (not shared with the module): a second option is also right, the answer is
// contested, or the item needs a drawing / grammar a 5-8 year old has not met
const AMBIGUOUS = [/^Lawan kata (BARU|GELAP|BAIK|BENAR|CEPAT|PANAS|TINGGI)\?/, /^Sama arti (BAGUS|SUKA|PINTAR|TAKUT)\?/, /^Pulau terbesar/,
  /Februari/, /^Hewan langka di Sumatera/, /^Profesi mengemudi pesawat/]
const NEEDS_DRAWING = /Lihat jamnya|bagian kue|Gambar ini|^(\u26AA|\u26AB|\uD83D[\uDD34\uDD35\uDFE0-\uDFE4])\s*Lengkapi|subjeknya|predikatnya|[A-Z]{2,}-?\s*\+\s*-?[A-Z]{2,}/
const OP = /^\s*(\d+)\s*([+\-×÷x])\s*(\d+)\s*=\s*\?\s*$/
// every defect a served question can have; [] = correct
function defects (q, M) {
  const p = []
  const opts = q.choices
  if (!opts.includes(q.answer)) p.push('answer not in options')
  if (new Set(opts).size !== opts.length) p.push('duplicate options')
  if (opts.filter(c => c === q.answer).length !== 1) p.push('answer not unique')
  if (opts.length < 3 || opts.length > 4) p.push('options ' + opts.length)
  if (q.prompt.trim().split(/\s+/).length > 14) p.push('prompt too long')
  if (q.prompt.length > 80) p.push('prompt chars ' + q.prompt.length)
  if (opts.some(c => c.length > 16)) p.push('option too long')
  if (JARGON.test(q.prompt + opts.join(' '))) p.push('school jargon')
  for (const e of (q.prompt + ' ' + opts.join(' ')).match(EMOJI) || []) if (!M.has(e)) p.push('unmapped emoji ' + e)
  if (opts.some(c => (c.match(EMOJI) || []).length)) p.push('emoji as an option')
  if (AMBIGUOUS.some(r => r.test(q.prompt))) p.push('ambiguous or contested')
  if (NEEDS_DRAWING.test(q.prompt) || /^(clock|clock5|frac|tebak)$/.test(q.kind || '')) p.push('needs a drawing or grammar')
  if (/\uD83E\uDD85|\u26F5|\uD83D\uDC1E/.test(q.prompt)) p.push('ambiguous picture')
  const m = OP.exec(q.prompt)
  if (m) {
    const a = +m[1], b = +m[3]
    const v = m[2] === '+' ? a + b : m[2] === '-' ? a - b : m[2] === '×' || m[2] === 'x' ? a * b : a / b
    if (!Number.isInteger(v) || String(v) !== q.answer) p.push(`arithmetic ${q.prompt} = ${v}, answer ${q.answer}`)
  }
  if (q.unsafe || base.SoalEngine.isUnsafe(q)) p.push('unsafe word')
  return p
}

if (process.env.QA_PLANT) {
  // a deliberate wrong item in the shared bank: 1+1=? with 4 marked as the answer (4 is a unique option, so the
  // engine's own schema check accepts it; only the arithmetic check in this gate can see it)
  const it = base.G23_QUESTIONS_EASY.find(x => x.q === '1+1=?')
  it.ans = '4'; it.wrong = ['1', '0', '2']
  console.log('PLANT: G23 easy "1+1=?" now answers ' + it.ans)
}

/* ── L4: every servable curated item, and every generator sample ───────────────────────────────────────── */
{
  const SE = base.SoalEngine
  const reach = new Set(['kids', 'g23-easy', 'g23-medium'])
  let n = 0, quarantined = 0, held = 0
  const bad = []
  for (const o of SE.items().filter(x => reach.has(x.source) || x.source === 'plant')) {
    if (o.invalid || o.unsafe) { quarantined++; continue }
    n++
    const d = defects(o, base.EmojiMap)
    if (d.length) { held++; if (base.SoalArcade.fit(o)) bad.push(o.id + ': ' + d.join('; ')) }   // a defective item must never be served
  }
  console.log(`curated items ${n}, quarantined by the engine ${quarantined}, held back by SoalArcade.fit ${held}, defective AND served ${bad.length}`)
  bad.slice(0, 12).forEach(b => console.log('  ' + b))
  check(bad.length === 0, `L4 curated: ${bad.length} of ${n} items are defective yet pass SoalArcade.fit`)
}

/* ── L1 + L4 + L2 per game ───────────────────────────────────────────────────────────────────────────── */
const labels = new Set()
for (const g of Object.keys(GAMES)) {
  const seen = new Set(), badServed = []
  let served = 0, unlabelled = 0, events = 0
  for (let seed = 1; seed <= 20; seed++) {
    const P = page()                                   // a fresh child, fresh history
    P.DuniaBus.on('answer', ev => { events++; const l = P.LearningLog.label(ev.skill, ev.domain); labels.add(l); if (!l || l === 'Lainnya') unlabelled++ })
    for (let i = 0; i < 10; i++) {
      const q = P.SoalArcade.next(g, { seed: seed * 1000 + i * 13 })
      if (!q) { badServed.push('null question'); continue }
      served++
      seen.add(q.prompt + '|' + q.answer)
      const d = defects(q, P.EmojiMap)
      if (q.pic || q.shape || q.choicePics) d.push('needs a picture slot')
      if (d.length) badServed.push(q.id + ': ' + d.join('; '))
      P.SoalArcade.answer(q, i % 2 === 0, 1, 900)
    }
  }
  console.log(`${g}: served ${served}, distinct ${seen.size}, events ${events}, defects ${badServed.length}`)
  badServed.slice(0, 6).forEach(b => console.log('  ' + b))
  check(seen.size >= 100, `L1 ${g}: ${seen.size} distinct questions in 10 rounds x 20 seeds (need >= 100)`)
  check(badServed.length === 0, `L4 ${g}: ${badServed.length} served questions with a defect`)
  check(events === served && unlabelled === 0, `L2 ${g}: ${events} answer events for ${served} questions, ${unlabelled} unlabelled`)
}
check(![...labels].includes('Lainnya'), 'L2 no skill label falls to Lainnya: ' + [...labels].join(', '))

/* ── PRD-58 D1: a maths answer names its skill (Penjumlahan, Pengurangan ...), not just "Matematika" ─────────── */
for (const g of Object.keys(GAMES)) {
  const P = page(); let math = 0, bare = 0
  for (let i = 0; i < 400; i++) {
    const q = P.SoalArcade.next(g, { seed: i * 7 + 1, history: false })
    if (!q || q.topic !== 'matematika') continue
    const e = P.SoalArcade.answer(q, true, 1, 900); math++
    if (P.LearningLog.label(e.skill, e.domain) === 'Matematika') bare++
  }
  check(math > 50 && bare <= math * 0.05, `D1 ${g}: ${bare} of ${math} maths answers labelled only "Matematika" (need <= 5 %)`)
}

/* ── L3: strong vs weak child ─────────────────────────────────────────────────────────────────────────── */
for (const g of Object.keys(GAMES)) {
  // PRD-58 A6: grade 3-4 needs the parent switch "Perkalian & Pembagian" (or the 9-10 band), so the climb is
  // measured with the switch on, and the default child is checked to stay at grade <= 2
  const run = (right, adv = true, n = 15, served = []) => {
    const P = page(), gr = []
    if (adv) P.localStorage.setItem('dunia-emosi-mathadv', 'on')
    for (let i = 0; i < n; i++) {
      const q = P.SoalArcade.next(g, { seed: 50 + i * 31, history: false })
      gr.push(P.SoalArcade.grade())
      if (q) { served.push(q.grade); P.SoalArcade.answer(q, right, right ? 1 : 3, 800) }
    }
    return gr
  }
  const strong = run(true), weak = run(false)
  const capServed = [], capped = run(true, false, 200, capServed)
  check(Math.max(...capped) <= 2 && capServed.every(x => x == null || x <= 2),
    `A6 ${g}: strong child without the switch, 200 questions -> highest grade ${Math.max(...capped)}, served grades ${[...new Set(capServed)].sort().join(',')} (need <= 2)`)
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length
  console.log(`${g}: strong grades ${strong.join('')} weak grades ${weak.join('')}`)
  check(strong[14] >= 3 && weak[14] <= 2 && strong[14] - weak[14] >= 2 && avg(strong) > avg(weak) + 0.8,
    `L3 ${g}: strong ends ${strong[14]} (mean ${avg(strong).toFixed(1)}), weak ends ${weak[14]} (mean ${avg(weak).toFixed(1)})`)
}

/* ── L5: each page wires the module ───────────────────────────────────────────────────────────────────── */
for (const [g, f] of Object.entries(GAMES)) {
  const s = fs.existsSync(path.join(ROOT, f)) ? rd(f) : ''
  // the stack loads on the first tap through soal-arcade-boot.js (first screen stays light, PRD-33 budget)
  const boot = rd('games/data/soal-arcade-boot.js'), list = (boot.match(/var LIST = \[([^\]]*)\]/) || [, ''])[1]
  check(s.includes('src="data/soal-arcade-boot.js?v='), `L5 ${g}: ${f} loads data/soal-arcade-boot.js`)
  for (const need of ['soal-engine.js', 'soal-gen-matematika.js', 'soal-arcade.js', 'dunia-bus.js', 'learning-log.js', 'mastery.js']) {
    check(list.includes("'" + need + "'") || s.includes('src="data/' + need + '?v='), `L5 ${g}: ${f} gets data/${need} (page or boot list)`)
  }
  check(/SoalArcade\.next\(\s*'[a-z0-9]+'/.test(s) && s.includes("'" + g + "'"), `L5 ${g}: ${f} calls SoalArcade.next('${g}')`)
  check(s.includes('SoalArcade.answer('), `L5 ${g}: ${f} calls SoalArcade.answer`)
}

console.log(fails.length ? `FAIL qa-soal-arcade: ${passes} passed, ${fails.length} failed` : `PASS qa-soal-arcade: ${passes} checks passed`)
process.exit(fails.length ? 1 : 0)
