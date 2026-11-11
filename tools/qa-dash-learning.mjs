#!/usr/bin/env node
// qa-dash-learning — the parent dashboard shows what THIS child has been learning, from the learning log.
//   one row per skill (games merged), status word + "x dari n benar" beside it, status by the rule in learning-log.js
//   a sibling sees only their own rows (or the empty note), text contrast >= 4.5 on the dark dashboard, no emoji
// Seeds the log in its stored shape so the rows are known; tools/qa-learning-log.mjs proves the games write it.
// Built 2026-11-11 (docs/PRODUCT-ASSESSMENT-2026-11-10.md idea #12).
// Usage: QA_BASE=http://127.0.0.1:8097/ node tools/qa-dash-learning.mjs   (QA_SHOTS=dir for screenshots)
import puppeteer from 'puppeteer'
const BASE = process.env.QA_BASE || 'http://localhost:8081/'
const SHOTS = process.env.QA_SHOTS || ''
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const PLAYERS = JSON.stringify([{ name: 'Kakak', animal: '🦁', stars: 3 }, { name: 'Adik', animal: '🐰', stars: 0 }])
const d = new Date(), day = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)
const LOG = JSON.stringify({ v: 1, days: { [day]: {
  'kuis-matematika|matematika|tambah-standard': [6, 6, 0, 0],
  'ayo-berhitung|matematika|add-medium-d0': [4, 3, 0, 0],      // + kuis = Penjumlahan 10 / 9 -> Sudah bisa
  'kuis-matematika|matematika|kurang-standard': [6, 2, 0, 0],  // Pengurangan 6 / 2 -> Masih sulit
  'timmy-kapal|matematika|count': [2, 1, 0, 0],                // Menghitung benda 2 / 1 -> Baru mulai
  'timmy-kapal|islam|islam': [5, 3, 0, 0]                      // Pengetahuan Islam 5 / 3 -> Berkembang
} }, recent: [] })
const WANT = { Penjumlahan: ['Sudah bisa', '9 dari 10'], Pengurangan: ['Masih sulit', '2 dari 6'], 'Menghitung benda': ['Baru mulai', '1 dari 2'], 'Pengetahuan Islam': ['Berkembang', '3 dari 5'] }

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const p = await b.newPage()
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 140)))
async function open (slot, w, h) {
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 900, hasTouch: w < 900 })
  await p.goto(BASE + 'manifest.json')
  await p.evaluate((pl, lg, s) => {
    if (s === 0) { localStorage.clear(); localStorage.setItem('dunia-avatar-lion-learn-log', lg) }
    localStorage.setItem('dunia-players', pl); localStorage.setItem('dunia-active-slot', JSON.stringify([s, 1 - s]))
  }, PLAYERS, LOG, slot)
  await p.goto(BASE + 'index.html?nocine=1', { waitUntil: 'load' }); await sleep(2500)
  await p.evaluate(s => { state.currentPlayer = s; showDashboard() }, slot); await sleep(800)
}
const read = () => p.evaluate(() => {
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]) }
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const bgOf = e => { for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (!/rgba\(.*, 0\)|transparent/.test(c)) return c } return 'rgb(255,255,255)' }
  const box = document.getElementById('dash-learn')
  const rows = [...box.querySelectorAll('.dash-learn-row')].map(r => ({ skill: r.querySelector('.dash-learn-skill').textContent, chip: r.querySelector('.dash-learn-chip').textContent, num: r.querySelector('.dash-learn-num').textContent, bar: r.querySelector('.dash-learn-bar > i').style.width }))
  const texts = [...box.querySelectorAll('.dash-learn-skill,.dash-learn-chip,.dash-learn-num,.dash-learn-empty')]
  const worst = texts.reduce((m, e) => Math.min(m, cr(getComputedStyle(e).color, bgOf(e))), 99)
  const r = box.getBoundingClientRect()
  return { rows, empty: !!box.querySelector('.dash-learn-empty'), text: box.textContent, worst, visible: r.width > 0 && r.height > 0, overflow: document.documentElement.scrollWidth > innerWidth + 1 }
})

for (const [w, h] of [[390, 844], [1280, 800]]) {
  await open(0, w, h)
  const r = await read()
  ok(r.visible, `${w}: learning section visible`)
  ok(r.rows.length === 4, `${w}: one row per skill, games merged (${r.rows.map(x => x.skill)})`)
  for (const [skill, [chip, num]] of Object.entries(WANT)) {
    const row = r.rows.find(x => x.skill === skill)
    ok(row && row.chip === chip && row.num.startsWith(num), `${w}: ${skill} = ${chip}, ${num} (${JSON.stringify(row)})`)
  }
  ok(r.rows[0] && r.rows[0].skill === 'Penjumlahan' && r.rows[0].bar === '90%', `${w}: most answered first, bar = rate (${JSON.stringify(r.rows[0])})`)
  ok(r.worst >= 4.5, `${w}: text contrast >= 4.5 (worst ${r.worst.toFixed(2)})`)
  ok(!/\p{Extended_Pictographic}/u.test(r.text), `${w}: no emoji in the learning section`)
  ok(!r.overflow, `${w}: no horizontal scroll`)
  if (SHOTS) { await p.evaluate(() => document.getElementById('dash-learn').scrollIntoView({ block: 'center' })); await sleep(300); await p.screenshot({ path: `${SHOTS}/dash-learn-${w}.png` }) }
}
await open(1, 390, 844)
const s = await read()
ok(s.rows.length === 0 && s.empty, `sibling sees only their own (empty) log (${s.rows.length} rows)`)
ok(s.worst >= 4.5, `empty note contrast >= 4.5 (${s.worst.toFixed(2)})`)
ok(!errs.length, `page errors: ${errs.slice(0, 3).join(' | ')}`)
await b.close()
console.log(`qa-dash-learning: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
