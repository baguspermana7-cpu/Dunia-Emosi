// G30 Timmy & Kapal Legendaris — topic mix + Tingkat Soal gate (games/tk-quiz.js, node only).
// Owner 2026-09-29: "jangan banyak soal kata Arab, matematika 50%" + "Mudah = Kelas 1–2, Sulit = sampai kurikulum Kelas 4".
//   A) per world, >= 2000 simulated questions from its MIXED quiz steps (build({mix:true}), plus one campur step
//      per world) and its mixed lanes Knowledge Challenges (challengeQuestion): Matematika 45–55 %, Arab <= 8 %;
//      every mixed step: at most 1 Arabic question per 4, never all-Arabic.
//      A topic-locked step (logika / islam / arab / matematika, topicOnly) or practice tab serves ONLY that topic (owner playtest 2026-09-30:
//      "Latihan Matematika" served a science item, a Logika step 2 of 3 maths).
//   B) Sulit: generated Matematika is in range (add/sub within 1000, times <= 10x10, exact division,
//      fractions of 2/3/4, clock on 5 minutes, Rp1.000–Rp10.000, cm/m, kg, stories <= 18 words) and
//      every answer is recomputed correct (validate); Sulit sets actually contain Sulit math.
//   C) Mudah stays fase A: no Sulit math, numbers <= 20, whole hours, no Kelas 3–4 bank items.
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
globalThis.window = globalThis
require(path.join(ROOT, 'games/data/tk-questions.js'))
require(path.join(ROOT, 'games/data/tk-art.js'))
const WD = require(path.join(ROOT, 'games/data/tk-worlds.js'))
for (const f of ['soal-engine', 'soal-gen-matematika', 'soal-pack-kapal']) require(path.join(ROOT, 'games/data/' + f + '.js'))   // SoalEngine (tk-quiz draws every question from it)
require(path.join(ROOT, 'games/tk-quiz.js'))
const TK = globalThis.TKQuiz
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL ' + msg) } }
const hi = o => +o.grade >= 3 || /^[34]/.test(String(o.grade || ''))
const HIGH_IDS = new Set((globalThis.TKQuestions.items || []).filter(hi).map(o => o.id))

/* A) topic mix per world */
for (const w of WD.WORLDS) {
  const all = WD.flat(w).filter(l => l.type === 'quiz' || l.type === 'lanes')
  // mixed = campur / no domain / the 'umum' default (half maths); locked = logika / islam / arab / matematika or topicOnly
  const mixed = l => l.topicOnly !== true && (!l.domain || l.domain === 'campur' || l.domain === 'umum')
  const steps = all.filter(mixed).concat([{ id: w.id + '-campur', type: 'quiz', domain: 'campur', count: 4 }])
  const cnt = {}, stepBad = [], leak = []
  let n = 0, seed = 1
  // topic steps: only their topic
  for (const l of all.filter(l => !mixed(l))) for (let k = 0; k < 40; k++) {
    const qs = l.type === 'quiz' ? TK.build({ mix: true, domain: l.domain, world: w.id, count: l.count || 4, topic: l.goal, seed: seed++, grade: 'adaptif' })
      : [TK.challengeQuestion({ domain: l.domain, world: w.id, seed: seed++ })]
    for (const q of qs) if (q.domain !== l.domain && leak.length < 3) leak.push(`${l.id} (${l.domain}) served ${q.domain} ${q.id}`)
  }
  check(!leak.length, `${w.id}: topic steps serve only their topic ${leak.join(' | ')}`)
  while (n < 2000) {
    for (const l of steps) {
      let qs
      if (l.type === 'quiz') {
        qs = TK.build({ mix: true, domain: l.domain, world: w.id, count: l.count || 4, topic: l.goal, seed: seed++, grade: 'adaptif' })
        const ar = qs.filter(q => q.domain === 'arab').length
        if (ar > Math.max(1, Math.floor(qs.length / 4)) || (qs.length && ar === qs.length)) stepBad.push(`${l.id}: ${ar}/${qs.length} Arabic`)
      } else qs = [0, 1, 2].map(() => TK.challengeQuestion({ domain: 'campur', world: w.id, seed: seed++ }))
      for (const q of qs) { cnt[q.domain] = (cnt[q.domain] || 0) + 1; n++ }
    }
  }
  const pct = d => (cnt[d] || 0) / n * 100
  check(pct('matematika') >= 45 && pct('matematika') <= 55, `${w.id}: Matematika ${pct('matematika').toFixed(1)} % of ${n} (want 45–55)`)
  check(pct('arab') <= 8, `${w.id}: Arab ${pct('arab').toFixed(1)} % (want <= 8)`)
  check(!stepBad.length, `${w.id}: Arabic cap per quiz step ${stepBad.slice(0, 3).join(' | ')}`)
  console.log(`${w.id.padEnd(10)} n=${n} ` + ['matematika', 'umum', 'logika', 'islam', 'arab'].map(d => d.slice(0, 4) + ' ' + pct(d).toFixed(0) + '%').join('  '))
}
// practice tabs (home row): one topic each, never another topic
for (const d of ['matematika', 'umum', 'logika', 'islam', 'arab']) {
  const bad = []
  for (let s = 0; s < 300; s++) for (const q of TK.build({ mix: true, domain: d, world: 'latihan', count: 5, topic: 'Latihan bebas — tanpa batas waktu.', seed: s, grade: 'adaptif' })) if (q.domain !== d && bad.length < 3) bad.push(q.id)
  check(!bad.length, `practice ${d}: only ${d} (${bad.join(', ')})`)
}
// challenge weights alone (lanes collision cards)
{
  const c = {}; for (let s = 0; s < 4000; s++) { const q = TK.challengeQuestion({ domain: 'campur', world: 'titanic', seed: s, avatar: 'qa-challenge-weights' }); c[q.domain] = (c[q.domain] || 0) + 1 }
  check(c.matematika / 4000 >= 0.45 && c.matematika / 4000 <= 0.55 && (c.arab || 0) / 4000 <= 0.08, `challenge weights ${JSON.stringify(c)}`)
}
// Disabling Islamic content must not increase Arabic above the owner's ceiling.
// Check the actual engine profile as well as both public mixed-question flows.
{
  const profile = SoalEngine.profile('g30')
  check(profile.maxShare && profile.maxShare.arab <= 0.08, 'G30 config enforces Arabic <= 8% after topic exclusions')
  for (const flow of ['quiz', 'challenge']) {
    const count = {}, total = 12000
    for (let seed = 0; seed < total / (flow === 'quiz' ? 4 : 1); seed++) {
      const spec = { domain: 'campur', world: 'titanic', count: 4, mix: true, islam: false, seed, avatar: 'qa-islam-off-' + flow }
      const questions = flow === 'quiz' ? TK.build(spec) : [TK.challengeQuestion(spec)]
      for (const question of questions) count[question.domain] = (count[question.domain] || 0) + 1
    }
    check(!count.islam && (count.arab || 0) / total <= 0.08, `Islam off ${flow}: Arabic <= 8%, ${JSON.stringify(count)}`)
    check((count.matematika || 0) / total >= 0.45 && (count.matematika || 0) / total <= 0.55,
      `Islam off ${flow}: maths remains 45–55%, ${JSON.stringify(count)}`)
  }
}

/* B) Sulit */
{
  const topics = []
  for (let seed = 0; seed < 800; seed++) topics.push(...TK.build({ domain: 'campur', count: 5 + seed % 2, mix: true,
    seed, avatar: 'qa-displayed-mix', islam: false }).map(question => question.domain))
  const windows = topics.filter((topic, i) => topics.slice(i, i + 4).filter(t => t === 'arab').length > 1)
  check(!windows.length, `displayed mixed order preserves one Arabic in four across round boundaries (${windows.length} violations)`)
}
{
  const r = TK.rng(11), bad = [], kinds = {}
  for (let i = 0; i < 6000; i++) {
    const q = TK.makeHard(r, { world: 'titanic' }); kinds[q.kind] = 1
    const p = TK.validate(q)
    if (q.choices.length !== 4 || !q.choices.includes(q.answer)) p.push('choices')
    if (p.length && bad.length < 4) bad.push(`${q.kind} ${q.prompt} [${q.choices}] ${q.answer}: ${p.join(';')}`)
  }
  check(!bad.length, 'Sulit math: 6000 generated, all in range and correct ' + bad.join(' | '))
  check(['add3', 'sub3', 'times', 'div', 'frac', 'clock5', 'money', 'measure', 'story'].every(k => kinds[k]), 'Sulit math covers every Kelas 3–4 kind: ' + Object.keys(kinds).join())
  let hardMath = 0, math = 0, badSet = []
  for (let s = 0; s < 800; s++) for (const q of TK.build({ mix: true, hard: true, domain: 'campur', world: 'vasa', count: 4, seed: s })) {
    if (q.domain === 'matematika') { math++; if (q.hard) hardMath++; const p = TK.validate(q); if (p.length && badSet.length < 3) badSet.push(q.id + ' ' + p.join(';')) }
  }
  check(math && hardMath === math && !badSet.length, `Sulit sets: every math question is Sulit (${hardMath}/${math}) and valid ${badSet.join(' | ')}`)
}

/* C) Mudah stays fase A */
{
  const bad = []
  for (let s = 0; s < 1500; s++) for (const q of TK.build({ mix: true, domain: s % 2 ? 'campur' : 'umum', world: 'titanic', count: 4, seed: s, grade: 'adaptif' })) {
    if (q.hard) bad.push('Sulit math in Mudah ' + q.id)
    if (HIGH_IDS.has(q.id)) bad.push('Kelas 3–4 bank item in Mudah ' + q.id)
    if (q.domain === 'matematika') {
      if (q.choices.some(c => /^\d+$/.test(c) && +c > 20)) bad.push('number > 20 ' + q.id)
      if (q.choices.some(c => /setengah/.test(c))) bad.push('half-hour clock ' + q.id)
      if (TK.validate(q).length) bad.push('invalid ' + q.id + ' ' + TK.validate(q).join(';'))
    }
  }
  check(!bad.length, `Mudah: fase A only (${bad.length} problems) ${bad.slice(0, 4).join(' | ')}`)
  if (HIGH_IDS.size) {
    let hiSeen = 0; for (let s = 0; s < 800; s++) for (const q of TK.build({ mix: true, hard: true, domain: 'umum', world: 'vasa', count: 4, seed: s })) if (HIGH_IDS.has(q.id)) hiSeen++
    check(hiSeen > 0, `Sulit serves Kelas 3–4 bank items (${hiSeen})`)
  } else console.log('(no grade-tagged bank items yet: the Sulit bank filter is exercised once the bank carries grade 3–4 items)')
}
console.log(fails.length ? `FAIL qa-tk-mix: ${passes} passed, ${fails.length} failed` : `PASS qa-tk-mix: ${passes} checks passed`)
process.exit(fails.length ? 1 : 0)
