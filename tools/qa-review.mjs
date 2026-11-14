#!/usr/bin/env node
// qa-review — PRD-11 (docs/prd/PRD-11-antrean-pengulangan-lintas-game.md): a maths question the child missed comes back
// on later days, in another game.
//   node part (games/data/review-queue.js in a vm, the day moved by window.__reviewOffsetDays):
//   L3 wrong -> due tomorrow (not today); right -> 3 days; right -> 7 days; right -> gone; wrong on a queued item -> tomorrow
//   L2 with five items due, nine questions asked take at most three, never two within three questions
//   L4 one child's queue does not reach another child
//   browser part (real taps):
//   L1 a sum tapped wrong in Kuis Matematika today is asked again tomorrow in Mojo chase, as pictures
//   L1b a due item comes back in Kuis as the question on screen
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-review.mjs   (or through tools/run-gates.mjs)
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }

// ---- node part
{
  const store = {}
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem: k => { delete store[k] } }
  const ctx = { console, JSON, Math, Date, localStorage: ls, location: { pathname: '/games/x.html' }, CustomEvent: class { constructor (t, o) { this.type = t; this.detail = o && o.detail } }, dispatchEvent () {} }
  ctx.window = ctx; vm.createContext(ctx)
  for (const f of ['games/data/save-engine.js', 'games/data/dunia-bus.js', 'games/data/review-queue.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f })
  const R = ctx.DuniaReview, bus = ctx.DuniaBus
  ls.setItem('dunia-players', JSON.stringify([{ name: 'A', animal: '🦁' }, { name: 'B', animal: '🐰' }]))
  ls.setItem('dunia-active-slot', '[0,1]')
  const ans = (ok, x) => bus.emit('answer', { domain: 'matematika', skill: 'add', ok, review: x })
  const X = { a: 3, b: 4, op: '+' }, id = 'matematika:3+4'
  const at = d => { ctx.__reviewOffsetDays = d }
  at(0); ans(false, X)
  const t0 = R._today(), it0 = R.items()[id]
  const dueToday = R.due('matematika').includes(id)
  at(1); const dueTomorrow = R.due('matematika').includes(id); ans(true, X); const it1 = { ...R.items()[id] }
  at(4); ans(true, X); const it2 = { ...R.items()[id] }
  at(11); ans(true, X); const gone = !(id in R.items())
  ok(it0 && it0.due === t0 + 1 && !dueToday && dueTomorrow, `L3 wrong today -> due tomorrow, not today (due ${it0 && it0.due - t0} day)`)
  ok(it1.step === 1 && it1.due === t0 + 1 + 3 && it2.step === 2 && it2.due === t0 + 4 + 7 && gone, `L3 right -> 3 days (step ${it1.step}), right -> 7 days (step ${it2.step}), right -> out of the queue (${gone})`)
  at(0); ans(false, X); at(1); ans(true, X); at(4); ans(false, X)
  ok(R.items()[id].step === 0 && R.items()[id].due === t0 + 5, 'L3 wrong on a queued item -> back to tomorrow')
  // L2
  for (let i = 1; i <= 5; i++) { at(0); ans(false, { a: i, b: 1, op: '+' }) }
  at(20)
  const got = []
  for (let i = 0; i < 9; i++) got.push(R.next('matematika') ? 1 : 0)
  const spaced = got.every((g, i) => !g || got.slice(i + 1, i + 3).every(x => !x))
  ok(got.reduce((a, b) => a + b, 0) <= 3 && spaced, `L2 nine questions with five due items: queue gave ${got.join('')} (<= 3, two apart at least)`)
  // L4
  ls.setItem('dunia-active-slot', '[1,0]')
  ok(Object.keys(R.items()).length === 0, `L4 the second child's queue is empty (${Object.keys(R.items()).length})`)
}

// ---- browser part
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const errs = []
const seed = p => p.evaluateOnNewDocument(() => {
  if (sessionStorage.__seeded) return
  localStorage.clear()
  localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
  localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off')
  // a child with a long, strong maths history (40 answers, score 90): three wrong taps leave tier 3, so Mojo still
  // counts to 10 (a new child would drop to tier 1 and Mojo's 5, and most Kuis sums would no longer fit)
  localStorage.setItem('dunia-avatar-lion-mastery', JSON.stringify({ v: 1, d: { matematika: [90, 40] } }))
  sessionStorage.__seeded = 1
})
{
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); await seed(p)
  await p.goto(BASE + '/games/kuis-matematika.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(1200)
  await p.evaluate(() => window.__g25.startLevel(1))
  // tap a wrong answer until a missed sum fits Mojo's picture questions
  let missed = null
  for (let k = 0; k < 3 && !missed; k++) {
    await p.waitForFunction(() => document.querySelectorAll('#choices button:not([disabled])').length > 1, { timeout: 15000 }).catch(() => {})
    await sleep(300)
    const c = await p.evaluate(() => window.__g25.current())
    if (!c) break
    let hit = null
    for (const h of await p.$$('#choices button')) if (await h.evaluate(e => e.textContent.trim()) !== c.ans) { hit = h; break }
    if (hit) { const r = await hit.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2) }
    await sleep(2600)
    const a = c.atom
    if (a && ((a.op === '+' && a.a + a.b <= 10) || (a.op === '-' && a.a <= 10 && a.b < a.a))) missed = a
  }
  const queued = await p.evaluate(() => Object.values(DuniaReview.items()))
  ok(missed && queued.some(x => x.a === missed.a && x.b === missed.b && x.op === missed.op), `L1 a sum tapped wrong in Kuis is in the queue (${JSON.stringify(missed)}; ${queued.length} queued)`)
  // tomorrow, same child, Mojo chase
  await p.evaluateOnNewDocument(() => { window.__reviewOffsetDays = 1 })
  await p.goto(BASE + '/games/mojo-swoptops.html?unlock=1&chase=1', { waitUntil: 'load', timeout: 60000 })
  await p.waitForFunction(() => window.MojoChaseQuiz && window.DuniaReview, { timeout: 20000 }).catch(() => {})
  const today = await p.evaluate(() => { window.__reviewOffsetDays = 0; return DuniaReview.due('matematika').length })
  const qs = await p.evaluate(m => {
    window.__reviewOffsetDays = 1
    const out = []
    for (let i = 0; i < 6; i++) { const q = MojoChaseQuiz.question(MojoChaseQuiz.rng(5 + i)); out.push({ review: !!q.review, atom: q.atom || null, kind: q.kind, groups: q.groups.filter(g => g.n).map(g => g.n) }) }
    return out
  }, missed)
  const back = qs.find(q => q.review)
  ok(today === 0 && back && missed && back.atom.a === missed.a && back.atom.b === missed.b && back.atom.op === missed.op && back.groups.length >= 1,
    `L1 not due today (${today}); tomorrow Mojo chase asks it again as pictures (${JSON.stringify(back)}); from the queue in six: ${qs.filter(q => q.review).length}`)
  // show it, to look at
  if (back) {
    await p.evaluate(m => { const q = MojoChaseQuiz.question(MojoChaseQuiz.rng(1), m.op === '+' ? 'add' : 'sub'); MojoChaseQuiz.open({}, null, { q }) }, missed).catch(() => {})
    await sleep(900); if (process.env.QA_SHOTS) await p.screenshot({ path: path.join(process.env.QA_SHOTS, 'review-mojo.png') })
  }
  await ctx.close()
}
{
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); await seed(p)
  await p.goto(BASE + '/games/kuis-matematika.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(1200)
  // missed yesterday in Mojo: 7 - 3
  await p.evaluate(() => { window.__reviewOffsetDays = -1; DuniaBus.emit('answer', { domain: 'matematika', skill: 'sub', ok: false, review: { a: 7, b: 3, op: '-' } }); window.__reviewOffsetDays = 0 })
  await p.evaluate(() => window.__g25.startLevel(1))
  await p.waitForFunction(() => document.querySelectorAll('#choices button:not([disabled])').length > 1, { timeout: 15000 }).catch(() => {})
  await sleep(400)
  const c = await p.evaluate(() => window.__g25.current())
  ok(c && c.review && c.atom && c.atom.a === 7 && c.atom.b === 3 && /7\s*\S\s*3/.test(c.q), `L1b the missed 7 - 3 comes back in Kuis as the question on screen (${JSON.stringify(c)})`)
  if (process.env.QA_SHOTS) await p.screenshot({ path: path.join(process.env.QA_SHOTS, 'review-kuis.png') })
  await ctx.close()
}
ok(!errs.length, 'no page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-review: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
