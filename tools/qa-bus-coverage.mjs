#!/usr/bin/env node
// qa-bus-coverage — PRD-08b (docs/prd/PRD-08b-bus-di-semua-game.md): the question games beyond Kuis / Ayo Berhitung /
// Timmy also tell DuniaBus what the child answered, so the learning log, the parent page and later mastery see them.
// All answers below are real taps on the game's own buttons.
//   L1 Belajar Bersama Mojo: one record per round, ok on a clean round, ok false + tries 2 after one wrong pick
//   L2 Mojo chase question box: right first try -> ok true; two misses then the answer shown -> ok false, tries 3
//   L3 Kereta Pemberani story question: wrong then right -> ONE record, ok false, tries 2, domain from the pack
//   L4 every record lands in the playing child's log (avatar-scoped key) and every skill has a parent-readable name
//   L5 (PRD-10) right answers in Kuis raise the shared mastery score, and Timmy opened next levels from that score
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-bus-coverage.mjs   (or through tools/run-gates.mjs)
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const errs = []
async function page (path) {
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  p.on('pageerror', e => errs.push(path + ': ' + e.message))
  await p.setViewport({ width: 1280, height: 800, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    if (!sessionStorage.__seeded) {
      localStorage.clear()
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off')
      sessionStorage.__seeded = 1
    }
    window.__ans = []; addEventListener('dunia:answer', e => window.__ans.push(e.detail))
  })
  await p.goto(BASE + path, { waitUntil: 'load', timeout: 60000 }); await sleep(1500)
  return { p, ctx }
}
const tapSel = async (p, sel) => { const h = await p.waitForSelector(sel, { visible: true, timeout: 8000 }); const r = await h.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await sleep(300) }
const logOf = p => p.evaluate(() => ({ key: !!localStorage.getItem('dunia-avatar-lion-learn-log'), recent: window.LearningLog ? LearningLog.recent(20) : null, labels: window.LearningLog ? LearningLog.recent(20).map(r => LearningLog.label(r.skill, r.domain)) : [] }))

// L1 Mojo learn: pick a round with options (not spelling) by solving rounds until one with options comes
{
  const { p, ctx } = await page('/games/mojo-swoptops.html?unlock=1')
  await p.waitForFunction(() => window.__mojo && __mojo.ready, { timeout: 20000 }).catch(() => {})
  await p.evaluate(() => __mojo.home()); await tapSel(p, '#btn-learn')
  let wrongDone = false, cleanDone = false
  for (let k = 0; k < 5 && !(wrongDone && cleanDone); k++) {
    const s = await p.evaluate(() => MojoLearn.state())
    if (!s || s.kind === 'reward') break
    const before = await p.evaluate(() => window.__ans.length)
    if (s.kind === 'susun') {
      const pre = await p.$$eval('#learn-slots .lslot.fixed', a => a.length)
      for (const ch of s.word.slice(pre)) { const i = await p.$$eval('#learn-tiles .ltile', (ts, ch) => ts.findIndex(t => !t.disabled && t.dataset.l === ch), ch); const ts = await p.$$('#learn-tiles .ltile'); await ts[i].click(); await sleep(260) }
    } else {
      if (!wrongDone) { await tapSel(p, '#learn-opts .lopt[data-ok="0"]') }
      await tapSel(p, '#learn-opts .lopt[data-ok="1"]')
    }
    await sleep(600)
    const a = await p.evaluate(n => window.__ans.slice(n), before)
    if (s.kind !== 'susun' && !wrongDone) { wrongDone = true; ok(a.length === 1 && a[0].ok === false && a[0].tries === 2 && /^bahasa|inggris$/.test(a[0].domain), `L1 Mojo learn ${s.kind}: one wrong then right -> one record ok false tries 2 (${JSON.stringify(a)})`) }
    else if (!cleanDone) { cleanDone = true; ok(a.length === 1 && a[0].ok === true && a[0].tries === 1, `L1 Mojo learn ${s.kind}: clean round -> one record ok true (${JSON.stringify(a)})`) }
    const next = await p.$('#learn-next, .learn-next'); if (next) { await next.click().catch(() => {}); await sleep(600) }
  }
  ok(wrongDone && cleanDone, 'L1 both a clean round and a round with a miss were played')
  const lg = await logOf(p)
  ok(lg.key && lg.recent && lg.recent.length >= 2, `L4 Mojo learn answers are in the child's log (${lg.recent && lg.recent.length})`)
  ok(lg.labels.every(l => l && l !== 'Lainnya'), `L4 every Mojo learn skill has a parent-readable name (${[...new Set(lg.labels)]})`)
  await ctx.close()
}
// L2 Mojo chase question box
{
  const { p, ctx } = await page('/games/mojo-swoptops.html?unlock=1&chase=1')
  await p.waitForFunction(() => window.MojoChaseQuiz, { timeout: 20000 }).catch(() => {})
  for (const [miss, label] of [[0, 'right first try'], [2, 'two misses, answer shown']]) {
    await p.evaluate(() => { window.__ans = []; const q = MojoChaseQuiz.question(MojoChaseQuiz.rng(3), 'count'); MojoChaseQuiz.open({}, null, { q }) })
    await p.waitForSelector('.mcq-btn', { visible: true, timeout: 8000 }); await sleep(500)
    const ans = await p.evaluate(() => String(MojoChaseQuiz.state().answer))
    const wrongs = await p.$$eval('.mcq-btn', (bs, a) => bs.map((b, i) => b.getAttribute('data-v') === a ? -1 : i).filter(i => i >= 0), ans)
    for (let m = 0; m < miss; m++) { const bs = await p.$$('.mcq-btn'); await bs[wrongs[m]].click(); await sleep(400) }
    if (!miss) { const bs = await p.$$('.mcq-btn'); const i = await p.$$eval('.mcq-btn', (bs, a) => bs.findIndex(b => b.getAttribute('data-v') === a), ans); await bs[i].click() }
    await sleep(2600)
    const a = await p.evaluate(() => window.__ans)
    const want = miss ? (a.length === 1 && a[0].ok === false && a[0].tries === 3) : (a.length === 1 && a[0].ok === true && a[0].tries === 1)
    ok(want && a[0].domain === 'matematika' && a[0].skill === 'count', `L2 Mojo chase ${label} (${JSON.stringify(a)})`)
    await p.evaluate(() => { try { MojoChaseQuiz.reset() } catch (e) {} document.querySelectorAll('.mcq').forEach(x => x.remove()) }); await sleep(300)
  }
  await ctx.close()
}
// L3 Kereta story question
{
  const { p, ctx } = await page('/games/kereta-maze.html')
  await p.waitForFunction(() => window.KeretaQuiz && window.SoalEngine, { timeout: 20000 }).catch(() => {})
  await p.evaluate(() => { window.__ans = []; KeretaQuiz.ask('sinyal', document.body, () => {}) })
  await p.waitForSelector('.kq-choice', { visible: true, timeout: 8000 }); await sleep(400)
  const q = await p.evaluate(() => { const c = KeretaQuiz.current(); return { answer: String(c.answer), choices: c.choices.map(String), topic: c.topic } })
  const wi = q.choices.findIndex(c => c !== q.answer), ri = q.choices.indexOf(q.answer)
  await tapSel(p, `.kq-choice[data-i="${wi}"]`); await tapSel(p, `.kq-choice[data-i="${ri}"]`); await sleep(1300)
  const a = await p.evaluate(() => window.__ans)
  ok(a.length === 1 && a[0].ok === false && a[0].tries === 2 && a[0].domain === (q.topic || 'umum'), `L3 Kereta: wrong then right -> one record ok false tries 2, domain ${q.topic} (${JSON.stringify(a)})`)
  const lg = await logOf(p)
  ok(lg.key && lg.recent && lg.recent.length === 1 && lg.labels.every(l => l !== 'Lainnya'), `L4 Kereta answer in the child's log with a readable name (${lg.labels})`)
  await ctx.close()
}
// L5 (PRD-10) cross-game mastery: right answers tapped in Kuis Matematika raise the child's shared matematika score,
// and Timmy, opened next in the same tab, levels its next question from that score
{
  const { p, ctx } = await page('/games/kuis-matematika.html?nocine=1')
  const s0 = await p.evaluate(() => window.DuniaMastery ? DuniaMastery.score('matematika') : null)
  await p.evaluate(() => window.__g25.startLevel(1)); await sleep(1800)
  for (let i = 0; i < 4; i++) {
    await p.waitForFunction(() => document.querySelectorAll('#choices button:not([disabled])').length > 1, { timeout: 15000 }).catch(() => {})
    await sleep(400)
    const ans = await p.evaluate(() => (window.__g25.current() || {}).ans)
    let hit = null
    for (const h of await p.$$('#choices button')) if (await h.evaluate(e => e.textContent.trim()) === ans) { hit = h; break }
    if (hit) { const r = await hit.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2) }
    await sleep(2600)
  }
  const s1 = await p.evaluate(() => window.DuniaMastery ? DuniaMastery.score('matematika') : null)
  ok(s0 === 10 && s1 > s0, `L5 four right answers in Kuis raise the shared score (5-6 start ${s0} -> ${s1})`)
  await p.goto(BASE + '/games/timmy-kapal.html', { waitUntil: 'load', timeout: 60000 }); await sleep(2500)
  const tk = await p.evaluate(() => window.__tk && __tk.mastery ? __tk.mastery().matematika : null)
  ok(tk === s1, `L5 Timmy levels its next maths question from that score (${tk})`)
  await ctx.close()
}
ok(!errs.length, 'no page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-bus-coverage: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
