#!/usr/bin/env node
// qa-prd08c-bus — PRD-08c (docs/prd/PRD-08c-bus-di-game-arkade.md): the arcade and kereta games that ask questions
// tell DuniaBus what the child answered, so the learning log, mastery and the parent page see them too.
//   static: every answer point below calls DuniaAnswer / DuniaAnswerQ (save-engine.js), QuizEngine reports by default,
//           the Side Race (already reported through SoalArcade) opts out with bus:false
//   L1 browser, each page: one reported answer loads the bus + learning log on demand (no extra request on the first
//      screen), lands as ONE 'answer' event and in the child's learning log, with no page error
//   L2 every recorded skill has a parent-readable name (LearningLog.label is never 'Lainnya')
//   L3 a real tap on a QuizEngine pill (Balapan Kereta) records one answer with the right ok flag
// Usage: node tools/qa-prd08c-bus.mjs (static)  |  QA_BASE=http://127.0.0.1:8081 node tools/qa-prd08c-bus.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }

const SITES = {
  'games/pokemon-run.html': /DuniaAnswerQ\(q\.q, c===q\.ans\)/g, 'games/pokemon-bawah-laut.html': /DuniaAnswerQ\(q\.q/g,
  'games/monster-candy.html': /DuniaAnswerQ\(labelText/g, 'games/lokomotif-pemberani.html': /DuniaAnswerQ?\(/g,
  'games/mario-pokemon.html': /DuniaAnswerQ\(/g, 'games/selamatkan-kereta.html': /DuniaAnswerQ\(/g,
  'games/museum-kereta.html': /DuniaAnswer\(/g, 'games/gt-quiz.js': /W\.DuniaAnswer\(/g,
  'games/stinky-dirty.js': /window\.DuniaAnswer\(/g, 'games/ejaan-inggris.js': /window\.DuniaAnswer\(/g,
  'games/quiz-engine.js': /global\.DuniaAnswer\(/g
}
const MIN = { 'games/pokemon-run.html': 3, 'games/lokomotif-pemberani.html': 2 }
for (const [f, re] of Object.entries(SITES)) { const n = (rd(f).match(re) || []).length; ok(n >= (MIN[f] || 1), `static: ${f} reports its answers (${n} call sites)`) }
const se = rd('games/data/save-engine.js')
ok(/window\.DuniaAnswer = DuniaAnswer/.test(se) && /window\.DuniaAnswerQ = DuniaAnswerQ/.test(se), 'static: save-engine.js exposes DuniaAnswer and DuniaAnswerQ')
ok(/bus: false/.test(rd('games/balapan-kereta-side.html')), 'static: Side Race opts out of the QuizEngine report (SoalArcade reports it)')

const PAGES = ['balapan-kereta', 'gym-pokemon', 'pokemon-run', 'pokemon-bawah-laut', 'garasi-tempur', 'lokomotif-pemberani', 'monster-candy',
  'ejaan-inggris', 'museum-kereta', 'stinky-dirty', 'mario-pokemon', 'selamatkan-kereta']
if (process.env.QA_BASE) {
  const { default: puppeteer } = await import('puppeteer')
  const BASE = process.env.QA_BASE.replace(/\/$/, '')
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
  const open = async (name, errs) => {
    const c = await b.createBrowserContext(), p = await c.newPage()
    p.on('pageerror', e => errs.push(name + ': ' + e.message))
    await p.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true })
    await p.evaluateOnNewDocument(() => {
      if (!sessionStorage.__s) {
        localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }]))
        localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
      }
      window.__ans = []; addEventListener('dunia:answer', e => window.__ans.push(e.detail))
    })
    const reqs = []; p.on('request', r => reqs.push(r.url()))
    await p.goto(BASE + '/games/' + name + '.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(1500)
    return { c, p, reqs }
  }
  for (const name of PAGES) {
    const errs = []
    const { c, p, reqs } = await open(name, errs)
    const early = reqs.filter(u => /\/(dunia-bus|learning-log)\.js/.test(u)).length
    const had = await p.evaluate(() => !!(window.DuniaBus && window.LearningLog))
    const r = await p.evaluate(() => { if (!window.DuniaAnswerQ) return 'no DuniaAnswerQ'; DuniaAnswerQ('7 - 3 = ?', true, 1200); return 'sent' })
    await p.waitForFunction(() => window.__ans.length >= 1 && window.LearningLog, { timeout: 8000 }).catch(() => {})
    await sleep(200)
    const st = await p.evaluate(() => ({ n: window.__ans.length, a: window.__ans[0] || null, log: window.LearningLog ? LearningLog.recent(5) : null,
      label: window.LearningLog && window.__ans[0] ? LearningLog.label(window.__ans[0].skill, window.__ans[0].domain) : null }))
    ok(r === 'sent' && st.n === 1 && st.a && st.a.ok === true && st.a.domain === 'matematika' && st.a.skill === 'kurang' && st.log && st.log.length === 1 && (had || early === 0) && !errs.length,
      `L1 ${name}: one answer -> ${st.n} event(s) ${st.a ? st.a.domain + '/' + st.a.skill : ''}, ${st.log ? st.log.length : 'no'} log row(s), bus on first screen: ${had ? 'page has it' : early + ' requests'}, errors: ${errs.join(' | ') || 0}`)
    ok(st.label && st.label !== 'Lainnya', `L2 ${name}: parent label "${st.label}"`)
    await c.close()
  }
  // L3 real tap on a QuizEngine pill, plus the text classifier for the other question kinds
  {
    const errs = [], { c, p } = await open('balapan-kereta', errs)
    await p.evaluate(() => { const h = document.createElement('div'); h.id = 'qa-q'; h.style.cssText = 'position:fixed;inset:20px;z-index:99999;background:#123'; document.body.appendChild(h); QuizEngine.ask(h, { question: '4 + 3 = ?', answer: 7, options: [5, 6, 7, 8], grid: true }, () => {}) })
    const btns = await p.$$('#qa-q .qz-pill'), labels = await Promise.all(btns.map(x => x.evaluate(e => e.textContent)))
    const bx = await btns[labels.indexOf('6')].boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2)
    await p.waitForFunction(() => window.__ans.length >= 1, { timeout: 8000 }).catch(() => {})
    const a = await p.evaluate(() => window.__ans.slice())
    ok(a.length === 1 && a[0].ok === false && a[0].skill === 'tambah' && a[0].item === '4 + 3 = ?' && typeof a[0].ms === 'number', `L3 a wrong tap on a QuizEngine pill records one answer: ${JSON.stringify(a)}`)
    const kinds = await p.evaluate(() => ['Huruf awal kata BOLA?', 'Lanjutkan pola: 2, 4, 6, ?', 'Bentuk apa yang punya 3 sisi?', 'Berapa jumlah apel?', 'Apa ibukota Indonesia?'].map(t => DuniaAnswerKind(t).skill + ':' + LearningLog.label(DuniaAnswerKind(t).skill, DuniaAnswerKind(t).domain)))
    ok(kinds.every(k => !/Lainnya/.test(k)), `L2 text questions get a parent-readable skill: ${kinds.join(', ')}`)
    ok(!errs.length, 'L3 no page errors: ' + errs.join(' | '))
    await c.close()
  }
  // L3 a hand-wired answer point played by a real tap: Mario Pokemon's math gate (2 questions, right then wrong)
  {
    const errs = [], { c, p } = await open('mario-pokemon', errs)
    await p.evaluate(() => { _mqState = { idx: 0, total: 2, correct: 0, dots: ['', ''] }; showMathQuestion() })
    const tapOne = async right => {
      await p.waitForSelector('#mq-choices .mq-btn:not([data-locked])', { visible: true, timeout: 8000 })
      const q = await p.$eval('#mq-question', e => e.textContent)
      const want = await p.evaluate(t => { const m = t.match(/(\d+)\s*([+\-−×x÷:])\s*(\d+)/); if (!m) return null; const a = +m[1], b = +m[3]; return ({ '+': a + b, '-': a - b, '−': a - b, '×': a * b, 'x': a * b, '÷': a / b, ':': a / b })[m[2]] }, q)
      const btns = await p.$$('#mq-choices .mq-btn'), labels = await Promise.all(btns.map(x => x.evaluate(e => +e.textContent)))
      const i = right ? labels.indexOf(want) : labels.findIndex(v => v !== want)
      const bx = await btns[i].boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2)
      await sleep(1400)
    }
    await tapOne(true); await tapOne(false)
    await p.waitForFunction(() => window.__ans.length >= 2, { timeout: 8000 }).catch(() => {})
    const a = await p.evaluate(() => window.__ans.map(x => x.ok + ':' + x.domain))
    ok(a.length === 2 && a[0] === 'true:matematika' && a[1] === 'false:matematika' && !errs.length, `L3 Mario Pokemon math gate, right then wrong by real taps -> ${JSON.stringify(a)} ${errs.join(' | ')}`)
    await c.close()
  }
  // L3 Garasi Tempur Monster Rush (a 15 s speed round): no report while it runs (reporting mid-rush cost taps), every one
  // of player 1's answers reported once the round stops
  {
    const errs = [], { c, p } = await open('garasi-tempur', errs)
    await p.evaluate(() => {
      const host = document.createElement('div'); host.id = 'raid-host'; host.style.cssText = 'position:fixed;inset:0;z-index:999'; document.body.appendChild(host)
      window.__done = null
      GTQuiz.rush({ host, players: [{ human: true, name: 'Kamu' }, { human: false, name: 'Komputer' }], aiPace: [999999, 0], level: 'mudah', seed: 5,
        lib: k => '../assets/db/lib/' + k + '.webp', monster: { key: 'gt-monster/robo-gorilla', name: 'Monster' }, sfx: {}, onDone: r => { window.__done = r } })
    })
    let taps = 0
    for (let k = 0; k < 4; k++) {
      const h = await p.waitForSelector('#rush-c0 .rush-b:not([disabled])', { visible: true, timeout: 15000 }).catch(() => null)
      if (!h) break
      const r = await h.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); taps++
      await sleep(700)
    }
    const during = await p.evaluate(() => window.__ans.length)
    await p.waitForFunction(() => window.__done, { timeout: 40000 }).catch(() => {})
    await sleep(500)
    const after = await p.evaluate(() => ({ n: window.__ans.length, asked: window.__done && window.__done.asked[0], doms: [...new Set(window.__ans.map(a => a.domain + '/' + a.skill))] }))
    ok(taps >= 3 && during === 0 && after.n === after.asked && after.n === taps && !errs.length,
      `L3 Garasi Monster Rush: ${taps} taps, ${during} reports during the round, ${after.n} after it (asked ${after.asked}) ${after.doms.join(',')} ${errs.join(' | ')}`)
    await c.close()
  }
  await b.close()
}
console.log(`qa-prd08c-bus: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
