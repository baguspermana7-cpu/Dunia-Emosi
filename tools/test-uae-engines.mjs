#!/usr/bin/env node
// test-uae-engines — PRD-59A L8 (workflow engine games/uae/uae-flow.js) and PRD-59B L10 (quiz engine
// games/uae/uae-quiz.js), on synthetic data so the engines are proven apart from the researched content.
// Usage: node tools/test-uae-engines.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const F = require('../games/uae/uae-flow.js')
const Q = require('../games/uae/uae-quiz.js')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m) } }
const deep = o => JSON.stringify(o)

// ---------- L8 flow ----------
const steps = [
  { id: 'a', phase: 'p1', needs: [], bring: [{ id: 'x' }, { id: 'y' }], cost: { min: 100, max: 200, cur: 'IDR' }, payer: 'self' },
  { id: 'b', phase: 'p1', needs: ['a'], bring: [{ id: 'x' }], cost: { min: 10, max: 10, cur: 'AED' }, payer: 'self' },
  { id: 'c', phase: 'p2', needs: ['a'], bring: [], cost: { min: 0, max: 50, cur: 'AED' }, payer: 'employer' },
  { id: 'd', phase: 'p2', needs: ['b', 'c'], bring: [{ id: 'z' }], cost: { min: 5, max: 5, cur: 'IDR' }, payer: 'either' }
]
ok(F.validate({ steps }).length === 0, 'L8 validate: clean data has no problems')
ok(F.validate({ steps: [steps[1], steps[0]] }).some(e => /not earlier/.test(e)), 'L8 validate: a need that comes later is caught')
ok(F.validate({ steps: [steps[0], steps[0]] }).some(e => /duplicate/.test(e)), 'L8 validate: duplicate id is caught')
let s = {}
ok(F.next(steps, s) === 'a', 'L8 next: first step at start')
ok(deep(F.blockedBy(steps, s, 'd')) === deep(['b', 'c']), 'L8 blockedBy: d waits on b and c')
const s0 = deep(s)
let s1 = F.apply(s, 'a', { item: 'x', on: true }, '2026-12-01')
ok(deep(s) === s0, 'L8 apply does not mutate its input')
ok(F.state(s1, 'a').status === 'doing' && F.state(s1, 'a').started === '2026-12-01', 'L8: first item checked moves todo -> doing, sets started')
s1 = F.apply(s1, 'a', { item: 'y', on: true })
ok(F.state(s1, 'a').status === 'doing', 'L8: all items checked does NOT auto-finish the step')
ok(deep(F.items(steps[0], F.state(s1, 'a'))) === deep({ checked: 2, total: 2 }), 'L8 items: 2/2')
s1 = F.apply(s1, 'a', { status: 'done' }, '2026-12-03')
ok(F.state(s1, 'a').date === '2026-12-03' && F.state(s1, 'a').started === '2026-12-01', 'L8: done keeps started, sets date')
ok(F.next(steps, s1) === 'b', 'L8 next: after a, b is ready')
const back = F.apply(s1, 'a', { status: 'todo' })
ok(F.state(back, 'a').date === '' && F.state(back, 'a').bring.x === true, 'L8: back to todo clears dates, keeps checked items')
s1 = F.apply(s1, 'a', { actual: 'Rp 150.000', note: 'n' })
ok(F.state(s1, 'a').actual === '150000', 'L8: actual cost keeps digits only')
const m = F.money(steps, s1, 4000)
ok(m.min === 100 + 40000 + 5 && m.max === 200 + 40000 + 5 && m.employer === 200000 && m.actual === 150000, `L8 money: own share, employer apart, actual summed (${deep(m)})`)
// random walks: invariants
const r = Q.rng(7)
for (let k = 0; k < 2000; k++) {
  let st = {}
  for (let j = 0; j < 12; j++) {
    const id = steps[Math.floor(r() * steps.length)].id, roll = r()
    st = roll < 0.4 ? F.apply(st, id, { status: ['todo', 'doing', 'done'][Math.floor(r() * 3)] }) : F.apply(st, id, { item: ['x', 'y', 'z'][Math.floor(r() * 3)], on: r() < 0.7 })
  }
  const p = F.progress(steps, st), n = F.next(steps, st)
  if (p.done + p.doing + p.todo !== p.n) { ok(false, 'L8 progress adds up'); break }
  if (n && F.state(st, n).status === 'done') { ok(false, 'L8 next never points at a done step'); break }
  const ready = steps.filter(x => F.state(st, x.id).status !== 'done' && !F.blockedBy(steps, st, x.id).length)
  if (ready.length && F.blockedBy(steps, st, n).length) { ok(false, 'L8 next never points at a blocked step while one is ready'); break }
  const mm = F.money(steps, st, 4000)
  if (mm.min > mm.max) { ok(false, 'L8 money min <= max'); break }
  if (k === 1999) ok(true, 'L8: 2000 random walks keep progress, next and money invariants')
}
const mig = F.migrate({ steps: { a: { status: 'doing', bring: ['x'] } } })
ok(mig.v === 1 && mig.steps.a.bring.x === true, 'L8 migrate: bring array -> object')

// ---------- L10 quiz ----------
const bank = { format: { count: 10, minutes: 10, pass: 8 }, topics: [{ id: 't1', title: 'A' }, { id: 't2', title: 'B' }, { id: 't3', title: 'C' }], questions: [] }
for (let i = 0; i < 30; i++) bank.questions.push({ id: 'q' + i, topic: i < 15 ? 't1' : i < 25 ? 't2' : 't3', opts: [{}, {}, {}, {}], a: i % 4 })
const e1 = Q.exam(bank, bank.format, 42), e2 = Q.exam(bank, bank.format, 42)
ok(e1.length === 10 && new Set(e1.map(x => x.q.id)).size === 10, 'L10 exam: 10 questions, no repeat')
ok(deep(e1.map(x => x.q.id)) === deep(e2.map(x => x.q.id)), 'L10 exam: same seed, same exam')
const per = t => e1.filter(x => x.q.topic === t).length
ok(per('t1') === 5 && per('t2') === 3 && per('t3') === 2, `L10 exam: topic quota in proportion (5/3/2: ${per('t1')}/${per('t2')}/${per('t3')})`)
ok(e1.every(x => deep([...x.order].sort()) === deep([0, 1, 2, 3])), 'L10 exam: option order is a permutation')
let sv = {}
const sv0 = deep(sv)
let sv1 = Q.record(sv, 'q0', true, '2026-12-01')
ok(deep(sv) === sv0, 'L10 record does not mutate')
sv1 = Q.record(Q.record(sv1, 'q0', true), 'q0', true)
ok(Q.qs(sv1, 'q0').box === 3 && Q.qs(sv1, 'q0').streak === 3, 'L10: 3 right in a row -> box 3 (mastered)')
sv1 = Q.record(sv1, 'q0', false)
ok(Q.qs(sv1, 'q0').box === 0 && Q.wrongList(bank, sv1).map(q => q.id).includes('q0'), 'L10: a wrong answer -> box 0, in the redo list')
ok(Q.readiness(bank, {}).pct === 0 && !Q.readiness(bank, {}).ready, 'L10 readiness: 0 with no data')
let full = {}
bank.questions.forEach(q => { for (let i = 0; i < 3; i++) full = Q.record(full, q.id, true) })
full.history = [1, 2, 3].map(() => ({ score: 10, total: 10, pass: true }))
const rd = Q.readiness(bank, full)
ok(rd.pct === 1 && rd.ready, `L10 readiness: 100 % and ready when all mastered and 3 exams passed (${deep(rd)})`)
ok(Q.topicState(bank, full, 't1').stage === 'dikuasai' && Q.topicState(bank, {}, 't1').stage === 'baru', 'L10 topic stages baru / dikuasai')
const g = Q.grade({ qs: e1, picks: e1.map(x => x.q.a) }, bank.format)
ok(g.score === 10 && g.pass && Object.values(g.byTopic).reduce((a, t) => a + t[1], 0) === 10, 'L10 grade: all right passes, per-topic totals add up')
const g2 = Q.grade({ qs: e1, picks: e1.map((x, i) => i < 3 ? (x.q.a + 1) % 4 : x.q.a) }, bank.format)
ok(g2.score === 7 && !g2.pass, 'L10 grade: 7 of 10 with pass mark 8 fails')
const old = { lang: 'en', wrong: ['q3'], history: [{ score: 5, total: 10 }], process: { s1: true } }
const mg = Q.migrate(old)
ok(mg.v === 1 && mg.lang === 'en' && mg.history.length === 1 && Q.qs(mg, 'q3').box === 0 && Q.qs(mg, 'q3').seen === 1 && mg.process.steps.s1.status === 'done', 'L10 migrate: old shape keeps language, history, wrong list, finished steps')

// L10 exam quotas with a topic share: exact size, no repeats, share honoured, capped topics give their seats away
{
  const mk = (t, n) => Array.from({ length: n }, (_, i) => ({ id: t + i, topic: t, opts: [1, 2, 3, 4], a: 0 }))
  const topics = [{ id: 'signs', share: 0.3 }, { id: 'a' }, { id: 'b' }]
  const fmt = { count: 40, pass: 32 }
  const big = { topics, questions: [...mk('signs', 50), ...mk('a', 30), ...mk('b', 30)] }
  const e1 = Q.exam(big, fmt, 3), c1 = {}; e1.forEach(x => { c1[x.q.topic] = (c1[x.q.topic] || 0) + 1 })
  ok(e1.length === 40 && new Set(e1.map(x => x.q.id)).size === 40, `L10 share: 40 distinct questions (${e1.length})`)
  ok(c1.signs === 12 && c1.a === 14 && c1.b === 14, `L10 share: signs 30 % = 12, rest split by size (${deep(c1)})`)
  const few = { topics, questions: [...mk('signs', 3), ...mk('a', 30), ...mk('b', 30)] }
  const e2 = Q.exam(few, fmt, 4), c2 = {}; e2.forEach(x => { c2[x.q.topic] = (c2[x.q.topic] || 0) + 1 })
  ok(e2.length === 40 && c2.signs === 3, `L10 share: a topic with too few questions gives its seats away (${deep(c2)})`)
  const tiny = { topics, questions: mk('signs', 20) }
  ok(Q.exam(tiny, fmt, 5).length === 20, 'L10 share: a bank smaller than the exam gives every question once')
}
// ---------- PRD-59C L21 schedule ----------
{
  // a (2-4) then b (1-1) and c (5-9) side by side, then d (0-2): total 7..15, the critical path runs through c
  const t = [{ id: 'a', needs: [], days: { min: 2, max: 4 } }, { id: 'b', needs: ['a'], days: { min: 1, max: 1 } },
    { id: 'c', needs: ['a'], days: { min: 5, max: 9 } }, { id: 'd', needs: ['b', 'c'], days: { min: 0, max: 2 } }]
  const r = F.schedule(t, {})
  ok(deep(r.total) === deep([7, 15]), `L21 schedule: total is the longest chain (${deep(r.total)})`)
  ok(deep(r.critical) === deep(['a', 'c', 'd']), `L21 schedule: critical path a > c > d (${r.critical.join('>')})`)
  ok(deep(r.steps.b.start) === deep([2, 4]) && deep(r.steps.d.start) === deep([7, 13]), 'L21 schedule: a step starts when every need is finished')
  const r2 = F.schedule(t, { steps: { c: { status: 'done' } } })
  ok(deep(r2.total) === deep([3, 7]) && r2.critical.includes('b'), `L21 schedule: a done step takes 0 days and moves the critical path (${deep(r2.total)} ${r2.critical.join('>')})`)
  ok(deep(F.schedule([{ id: 'x', needs: [] }], {}).unknown) === deep(['x']), 'L21 schedule: a step without days is reported')
  let cyc = false; try { F.schedule([{ id: 'p', needs: ['q'], days: { min: 1, max: 1 } }, { id: 'q', needs: ['p'], days: { min: 1, max: 1 } }], {}) } catch (e) { cyc = /cycle/.test(e.message) }
  ok(cyc, 'L21 schedule: a needs cycle throws')
  ok(F.addDays('2026-11-28', 34) === '2027-01-01' && F.addDays('2027-02-27', 1) === '2027-02-28', 'L21 addDays: crosses month and year ends')
}
// ---------- PRD-59C L18 stale ----------
ok(!F.stale('2026-11-28', '2027-05-27') && F.stale('2026-11-28', '2027-05-29') && F.stale('bad', '2026-01-01') && !F.stale('2026-11', '2027-04-30'), 'L18 stale: older than 6 months is flagged, a bad date is flagged')
console.log(`test-uae-engines: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
