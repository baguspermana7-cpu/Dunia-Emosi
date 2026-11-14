#!/usr/bin/env node
// qa-soften — PRD-17b (docs/prd/PRD-17b-momen-tenang-versi-lebih.md) + PRD-10 rest: after three wrong answers the
// map offers a breath, and the NEXT maths question the child meets, in any game, is one tier easier; one answer later
// it is back. All in one tab, as a child moves from a game to the map to a game.
//   L1 three fresh wrong maths answers + the map -> the breathing card is offered and maths is softened for this session
//   L2 Mojo chase while softened: a 7-8 child (tier 2, numbers up to 10) gets numbers up to 5 only (40 questions);
//      after one answer the range is back (some question above 5)
//   L3 Kuis: the question on screen when a level starts softened is the regenerated easier one; after it is answered
//      the flag is gone
//   L4 a 5-6 child's Mojo questions stay within 5 without any hard moment (PRD-10 cap); a 9-10 child's reach above 5
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-soften.mjs   (or through tools/run-gates.mjs)
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const errs = []
async function tab (age) {
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(age => {
    if (sessionStorage.__seeded) return
    localStorage.clear()
    localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: age }]))
    localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off')
    // today's feeling already told, so the map goes straight to the breath check
    const d = new Date(), day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    localStorage.setItem('dunia-avatar-lion-feelings', JSON.stringify({ days: { [day]: 'senang' } }))
    // a child with a long maths history (30 answers, score 70): three wrong answers move the score a little (K 3), so
    // the hard moment, not the score alone, is what makes the next question easier
    if (age === 'tumbuh') localStorage.setItem('dunia-avatar-lion-mastery', JSON.stringify({ v: 1, d: { matematika: [70, 30] } }))
    sessionStorage.__seeded = 1
  }, age)
  return { p, ctx }
}
// the biggest number a Mojo chase question shows, over n fresh questions (nothing answered)
const mojoMax = (p, n) => p.evaluate(n => { let m = 0; const r = MojoChaseQuiz.rng(7); for (let i = 0; i < n; i++) { const q = MojoChaseQuiz.question(r); for (const g of q.groups) if (g.n) m = Math.max(m, g.n); if (typeof q.answer === 'number') m = Math.max(m, q.answer) } return m }, n)

{
  const { p, ctx } = await tab('tumbuh')
  await p.goto(BASE + '/index.html?feel=1', { waitUntil: 'load', timeout: 60000 }); await sleep(800)
  // three wrong maths answers just now, as a game would have logged them, then back to the map
  await p.evaluate(() => { for (let i = 0; i < 3; i++) DuniaBus.emit('answer', { domain: 'matematika', skill: 'add', item: 'x' + i, ok: false, tries: 2, ms: 900 }) })
  await p.evaluate(() => showScreen('screen-menu'))
  await p.waitForSelector('#dbreath, #dfeel', { timeout: 6000 }).catch(() => {})
  const st = await p.evaluate(() => ({ card: !!document.getElementById('dbreath'), feel: !!document.getElementById('dfeel'), soft: DuniaMastery.soft('matematika'), tier: DuniaMastery.tier('matematika'), now: DuniaMastery.tierNow('matematika') }))
  ok(st.card && st.soft && st.now === st.tier - 1, `L1 the map offers the breath and maths is one tier easier for the next question (${JSON.stringify(st)})`)
  // the child closes the card and opens Mojo chase in the same tab
  await p.goto(BASE + '/games/mojo-swoptops.html?unlock=1&chase=1', { waitUntil: 'load', timeout: 60000 })
  await p.waitForFunction(() => window.MojoChaseQuiz && window.DuniaMastery, { timeout: 20000 }).catch(() => {})
  const softMax = await mojoMax(p, 40)
  await p.evaluate(() => DuniaBus.emit('answer', { domain: 'matematika', skill: 'count', item: 'y', ok: true, tries: 1, ms: 800 }))
  const backMax = await mojoMax(p, 40), still = await p.evaluate(() => DuniaMastery.soft('matematika'))
  ok(softMax <= 5, `L2 Mojo chase while softened: numbers up to ${softMax} (<= 5)`)
  ok(backMax > 5 && !still, `L2 one answer later the range is back: up to ${backMax}, flag ${still}`)
  // a second hard moment the same session does not soften again
  ok(await p.evaluate(() => DuniaMastery.soften('matematika')) === false, 'L2 once per session per domain')
  await ctx.close()
}
{
  const { p, ctx } = await tab('tumbuh')
  await p.goto(BASE + '/games/kuis-matematika.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(1200)
  await p.evaluate(() => DuniaMastery.soften('matematika'))
  await p.evaluate(() => window.__g25.startLevel(1))
  await p.waitForFunction(() => document.querySelectorAll('#choices button:not([disabled])').length > 1, { timeout: 15000 }).catch(() => {})
  await sleep(400)
  const c0 = await p.evaluate(() => window.__g25.current())
  let hit = null
  for (const h of await p.$$('#choices button')) if (await h.evaluate(e => e.textContent.trim()) === (c0 && c0.ans)) { hit = h; break }
  if (hit) { const r = await hit.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2) }
  await sleep(2600)
  const after = await p.evaluate(() => ({ soft: DuniaMastery.soft('matematika'), cur: window.__g25.current() }))
  ok(c0 && c0.softened, `L3 Kuis: the first question after a hard moment is the easier regenerated one (${JSON.stringify(c0)})`)
  ok(!after.soft && after.cur && !after.cur.softened, `L3 Kuis: answered, the flag is gone and the next question is the level's own (${JSON.stringify(after)})`)
  await ctx.close()
}
for (const [age, want] of [['cilik', m => m <= 5], ['pintar', m => m > 5]]) {
  const { p, ctx } = await tab(age)
  await p.goto(BASE + '/games/mojo-swoptops.html?unlock=1&chase=1', { waitUntil: 'load', timeout: 60000 })
  await p.waitForFunction(() => window.MojoChaseQuiz && window.DuniaMastery, { timeout: 20000 }).catch(() => {})
  const m = await mojoMax(p, 40)
  ok(want(m), `L4 ${age} child, no hard moment: Mojo chase numbers up to ${m}`)
  await ctx.close()
}
ok(!errs.length, 'no page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-soften: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
