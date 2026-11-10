#!/usr/bin/env node
// qa-learning-log — a child's answers are recorded per child, from real input, in the three wired games.
//   Kuis Matematika: a right tap and a wrong tap -> two records (ok true / false, skill = op-shape, ms > 0)
//   Timmy (TKQuiz):  a wrong tap then the right one -> ONE record, ok false (right on first try only), tries 2
//   Ayo Berhitung:   typing a full answer -> one record; typing the same value again -> no second record
//   per child: records sit under the active avatar's key; a sibling opens an empty log
//   summary() adds the day's rows up; a listener that throws does not stop the record
// Built 2026-11-10 (docs/PRODUCT-ASSESSMENT-2026-11-10.md, ideas #8 + #9).
// Usage: QA_BASE=http://127.0.0.1:8097/ node tools/qa-learning-log.mjs
import puppeteer from 'puppeteer'
const BASE = process.env.QA_BASE || 'http://localhost:8081/'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const PLAYERS = JSON.stringify([{ name: 'Kakak', animal: '🦁' }, { name: 'Adik', animal: '🐰' }])

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800, hasTouch: true })
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 140)))
const seed = async (slot) => {
  await p.goto(BASE + 'manifest.json')
  await p.evaluate((pl, s) => { if (s === 0) localStorage.clear(); localStorage.setItem('dunia-players', pl); localStorage.setItem('dunia-active-slot', JSON.stringify([s, 1 - s])) }, PLAYERS, slot)
}
const recent = () => p.evaluate(() => window.LearningLog ? window.LearningLog.recent(50) : null)
const tapEl = async (h) => { const r = await h.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2) }

// ── Kuis Matematika: right, then wrong ──
await seed(0)
await p.goto(BASE + 'games/kuis-matematika.html?nocine=1', { waitUntil: 'load' }); await sleep(1500)
ok(await p.evaluate(() => !!(window.DuniaBus && window.LearningLog)), 'kuis: bus + log loaded')
await p.evaluate(() => window.__g25.startLevel(1)); await sleep(1800)
for (const want of [true, false]) {
  await p.waitForFunction(() => document.querySelectorAll('#choices button:not([disabled])').length > 1, { timeout: 15000 }).catch(() => {})
  await sleep(400)
  const ans = await p.evaluate(() => (window.__g25.current() || {}).ans)
  const btns = await p.$$('#choices button')
  let hit = null
  for (const h of btns) { const t = await h.evaluate(e => e.textContent.trim()); if ((t === ans) === want) { hit = h; break } }
  if (hit) await tapEl(hit); else ok(false, `kuis: no ${want ? 'right' : 'wrong'} button`)
  await sleep(2600)
}
let r = await recent()
ok(r && r.length === 2, `kuis: two answers recorded (${r && r.length})`)
if (r && r.length === 2) {
  ok(r[0].ok === true && r[1].ok === false, `kuis: right then wrong (${r.map(x => x.ok)})`)
  ok(r.every(x => x.game === 'kuis-matematika' && x.domain === 'matematika' && /^[a-z]+-[a-zA-Z]+$/.test(x.skill)), `kuis: game/domain/skill named (${JSON.stringify(r[0])})`)
  ok(r.every(x => typeof x.ms === 'number' && x.ms > 0 && x.ms < 60000), `kuis: answer time measured (${r.map(x => x.ms)})`)
}
ok(await p.evaluate(() => !!localStorage.getItem('dunia-avatar-lion-learn-log') && !localStorage.getItem('dunia-learn-log')), 'kuis: log stored under the child (lion), not globally')

// ── Timmy: TKQuiz, wrong tap then right tap ──
await p.goto(BASE + 'games/timmy-kapal.html?nocine=1', { waitUntil: 'load' }); await sleep(2500)
await p.evaluate(() => {
  const host = document.createElement('div'); host.id = 'qa-host'; host.style.cssText = 'position:fixed;inset:0;z-index:2147480000;background:#fff'
  document.body.appendChild(host)
  const q = TKQuiz.make('matematika', 1, TKQuiz.rng(7), { kind: 'add' })
  window.__qaQ = q
  TKQuiz.mount(host, [{ ...q, choices: q.choices.slice() }], { topInset: 0, reducedMotion: true, sound: false, hints: true })
})
await sleep(900)
const tapChoice = async (right) => {
  const sel = await p.evaluate(r => { const a = String(window.__qaQ.answer); const o = [...document.querySelectorAll('#qa-host .tkq-opt:not([disabled])')].find(x => (x.dataset.c === a) === r); return o ? o.dataset.c : null }, right)
  if (sel == null) return false
  for (let k = 0; k < 2; k++) {
    const h = await p.$(`#qa-host .tkq-opt[data-c="${sel.replace(/"/g, '\\"')}"]`); if (!h) break
    await tapEl(h); await sleep(500)
    if (!(await h.evaluate(e => e.classList.contains('armed')))) break
  }
  return true
}
const before = (await recent()).length
ok(await tapChoice(false), 'timmy: a wrong choice to tap')
ok((await recent()).length === before, 'timmy: a wrong tap alone records nothing yet (the question is still open)')
ok(await tapChoice(true), 'timmy: the right choice to tap')
await sleep(600)
r = await recent()
const t = r[r.length - 1]
ok(r.length === before + 1 && t.game === 'timmy-kapal' && t.domain === 'matematika' && t.ok === false && t.tries === 2, `timmy: one record, not right first try, 2 tries (${JSON.stringify(t)})`)
ok(t && t.skill && t.item && t.ms > 0, `timmy: skill/item/time recorded (${t && [t.skill, t.item, t.ms]})`)

// ── Ayo Berhitung: a completed answer, logged once per value ──
await p.goto(BASE + 'games/ayo-berhitung.html', { waitUntil: 'load' }); await sleep(1200)
const n0 = (await recent()).length
const typeAll = async (v) => {
  const ins = await p.$$('#q0 .boxes input')
  for (const h of ins) { await h.click({ clickCount: 3 }); await h.type(v) }
  await sleep(300)
  return ins.length
}
const len = await typeAll('9')
r = await recent()
ok(len > 0 && r.length === n0 + 1 && r[r.length - 1].game === 'ayo-berhitung' && typeof r[r.length - 1].ok === 'boolean', `ayo: a completed answer recorded once (${r.length - n0}, ${JSON.stringify(r[r.length - 1])})`)
await typeAll('9')
ok((await recent()).length === n0 + 1, 'ayo: the same value typed again is not a second answer')

// ── summary + a listener that throws ──
const s = await p.evaluate(() => window.LearningLog.summary({ days: 1 }))
const tot = s.reduce((a, x) => a + x.n, 0)
ok(tot === n0 + 1 && s.every(x => x.rate >= 0 && x.rate <= 1), `summary adds today's rows up (${tot} vs ${n0 + 1}) ${JSON.stringify(s[0])}`)
const thrown = await p.evaluate(() => {
  const off = DuniaBus.on('answer', () => { throw new Error('qa listener') })
  const n = LearningLog.recent(100).length
  const orig = console.error; console.error = () => {}
  DuniaBus.emit('answer', { domain: 'qa', skill: 'qa', item: 'x', ok: true })
  console.error = orig; off()
  return LearningLog.recent(100).length - n
})
ok(thrown === 1, `a throwing listener does not stop the record (${thrown})`)

// ── sibling opens an empty log ──
await seed(1)
await p.goto(BASE + 'games/kuis-matematika.html?nocine=1', { waitUntil: 'load' }); await sleep(1200)
r = await recent()
ok(r && r.length === 0, `sibling (rabbit) opens an empty log (${r && r.length})`)
ok(await p.evaluate(() => JSON.parse(localStorage.getItem('dunia-avatar-lion-learn-log')).recent.length) >= 4, "first child's log untouched")

ok(!errs.length, `page errors: ${errs.slice(0, 3).join(' | ')}`)
await b.close()
console.log(`qa-learning-log: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
