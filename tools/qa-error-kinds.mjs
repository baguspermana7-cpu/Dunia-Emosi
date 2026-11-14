#!/usr/bin/env node
// qa-error-kinds — PRD-13 (docs/prd/PRD-13-petunjuk-sesuai-jenis-kesalahan.md): a wrong maths answer gets a hint that
// fits the mistake, and never a hint that does not.
//   node part (games/data/error-kinds.js + math-rules.js in a vm):
//   L1 table: each kind of mistake -> its hint (off by one, up or down; + done as -, - as +, x as +, ÷ as x)
//   L2 3000 random questions x every wrong choice: a specific hint only when its rule truly holds; a missingOperand
//      question (shown as its inverse) never gets "swapped sign"; everything else is the general line
//   browser part (QA_BASE set): a real wrong tap in Kuis Matematika shows the hint card for its kind, the kind goes
//      into the child's learning log, and the next question clears it; screenshots at 3 sizes (QA_SHOTS)
// Usage: node tools/qa-error-kinds.mjs   (node part, in ci-verify)   |   QA_BASE=... node tools/qa-error-kinds.mjs
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }

const ctx = { console, JSON, Math, Date, localStorage: { getItem: () => null, setItem () {} } }
ctx.window = ctx; vm.createContext(ctx)
for (const f of ['games/data/math-rules.js', 'games/data/error-kinds.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f })
const E = ctx.DuniaErrorKinds, mk = ctx.makeMathQuestionV2
const Q = (a, op, b, shape = 'standard') => mk(5, 100, 'easy', shape, { atom: { a, b, op } })
const table = [
  [Q(5, '+', 2), 8, 'off-by-one', 'Hampir! Kelebihan satu.'],
  [Q(5, '+', 2), 6, 'off-by-one', 'Hampir! Kurang satu.'],
  [Q(5, '+', 2), 3, 'swapped-op', 'Lihat tandanya: + artinya ditambah.'],
  [Q(9, '-', 4), 13, 'swapped-op', 'Lihat tandanya: − artinya dikurangi.'],
  [Q(3, '*', 4), 7, 'swapped-op', 'Lihat tandanya: × artinya dikali.'],
  [Q(12, '÷', 3), 36, 'swapped-op', 'Lihat tandanya: ÷ artinya dibagi.'],
  [Q(5, '+', 2), 10, 'general', 'Lihat jawaban yang benar, ya.'],
  [Q(5, '+', 2), '', 'general', 'Lihat jawaban yang benar, ya.']
]
const bad = table.filter(([q, p, k, t]) => { const h = E.classify(q, p); return h.kind !== k || E.text(h) !== t })
ok(!bad.length, `L1 ${table.length} mistakes -> the right hint${bad.length ? ' - wrong on ' + bad.map(([q, p]) => q.q + ' answered ' + p).join(', ') : ''}`)
{
  let n = 0, wrongHint = 0, inv = 0, spec = 0
  const shapes = ['standard', 'missingOperand', 'missingOperator', 'comparison', 'word']
  for (let i = 0; i < 3000; i++) {
    const q = mk(1 + (i % 90), 100, ['easy', 'medium', 'hard'][i % 3], shapes[i % 5], { maxNum: 12 + (i % 30) })
    for (const c of q.choices) {
      if (String(c) === String(q.ans)) continue
      n++
      const h = E.classify(q, c), v = Number(c), ans = Number(q.ans), x = q.atom
      if (h.kind === 'off-by-one') { spec++; if (Math.abs(v - ans) !== 1) wrongHint++ }
      if (h.kind === 'swapped-op') {
        spec++
        if (q.shape !== 'standard' && q.shape !== 'word') inv++
        const truth = x.op === '+' ? (v === x.a - x.b || v === x.b - x.a) : x.op === '-' ? v === x.a + x.b : x.op === '*' ? v === x.a + x.b : v === x.a * x.b
        if (!truth) wrongHint++
      }
    }
  }
  ok(n > 5000 && wrongHint === 0 && inv === 0, `L2 ${n} wrong choices: ${spec} got a specific hint, every one true (${wrongHint} false), none on an inverse-shown question (${inv})`)
}

if (process.env.QA_BASE) {
  const { default: puppeteer } = await import('puppeteer')
  const BASE = process.env.QA_BASE.replace(/\/$/, ''), SH = process.env.QA_SHOTS
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
  const errs = []
  for (const [w, h] of [[390, 844], [844, 390], [800, 1280]]) {
    const c = await b.createBrowserContext(), p = await c.newPage()
    p.on('pageerror', e => errs.push(e.message))
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
    await p.evaluateOnNewDocument(() => {
      if (sessionStorage.__s) return
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
    })
    await p.goto(BASE + '/games/kuis-matematika.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(1200)
    await p.evaluate(() => window.__g25.startLevel(1))
    // tap the choice that is one away from the answer (every Kuis choice set has one near the answer), else any wrong one
    let got = null
    for (let k = 0; k < 6 && !got; k++) {
      await p.waitForFunction(() => document.querySelectorAll('#choices button:not([disabled])').length > 1, { timeout: 15000 }).catch(() => {})
      await sleep(300)
      const cur = await p.evaluate(() => window.__g25.current())
      const btns = await p.$$('#choices button'), labels = await Promise.all(btns.map(x => x.evaluate(e => e.textContent.trim())))
      let i = labels.findIndex(l => Math.abs(Number(l) - Number(cur.ans)) === 1)
      if (i < 0) i = labels.findIndex(l => l !== cur.ans)
      const r = await btns[i].boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2)
      await sleep(350)
      const card = await p.evaluate(() => { const d = document.querySelector('.dek'); if (!d) return null; const r = d.getBoundingClientRect()
        // every part of the card is really on top where it is drawn (a clipping parent hid the strip once)
        d.style.pointerEvents = 'auto'   // elementFromPoint skips pointer-events:none; the card has it so taps go through
        const seen = [...d.querySelectorAll('.n, p')].every(e => { const q = e.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return t && (t === e || e.contains(t) || t.closest('.dek') === d) })
        d.style.pointerEvents = ''
        return { kind: d.dataset.kind, text: d.textContent, top: r.top, bottom: r.bottom, left: r.left, right: r.right, seen } })
      if (card && card.kind === 'off-by-one') { got = card; if (SH) await p.screenshot({ path: path.join(SH, `hint-${w}x${h}.png`) }) }
      await sleep(2600)
    }
    const log = await p.evaluate(() => (window.LearningLog ? LearningLog.recent(10) : []).filter(r => r.hint).map(r => r.hint))
    const gone = await p.evaluate(() => !document.querySelector('.dek'))
    ok(got && got.seen && got.top >= 0 && got.left >= 0 && got.right <= w + 1 && got.bottom <= h, `browser ${w}x${h}: a wrong tap one away shows the whole off-by-one hint, nothing covering it (seen ${got && got.seen}, ${got ? got.text + ' @' + [got.left, got.top, got.right, got.bottom].map(Math.round) : 'none'})`)
    ok(log.includes('off-by-one') && gone, `browser ${w}x${h}: the kind is in the child's learning log (${log}) and the next question clears the card (${gone})`)
    await c.close()
  }
  ok(!errs.length, 'no page errors: ' + errs.slice(0, 3).join(' | '))
  await b.close()
}
console.log(`qa-error-kinds: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
