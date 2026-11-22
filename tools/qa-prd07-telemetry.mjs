#!/usr/bin/env node
// qa-prd07-telemetry — PRD-07 (docs/prd/PRD-07-telemetri-lokal-kesehatan-perangkat.md): device health on the device.
//   L1 a made jank of 300 ms is recorded (k 'jank', >= 300 ms) under the game being played: hub G4, and a page of its
//      own (kuis-matematika); a 4.5 s block after the page settled is recorded as a 'stall' (the watchdog's finding)
//   L2 a made error is recorded (k 'error', its message); an unhandled rejection too (k 'promise')
//   L3 500 entries with long messages pushed in -> the buffer keeps <= 200 entries and <= 30 KB, the newest kept
//   L5 the Dasbor shows "Kesehatan perangkat" with the counts, and "Salin laporan" gives a text with those entries
//   + screenshot of the panel (QA_SHOTS=dir)
// L4 (overhead per tap < 2 ms) is the A/B with qa-action-latency, run separately (docs/prd/PRD-07 Hasil).
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd07-telemetry.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
if (SH) fs.mkdirSync(SH, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', protocolTimeout: 240000, args: ['--no-sandbox', '--disable-audio-output'] })
const ctx = await b.createBrowserContext()
async function open (url) {
  const p = await ctx.newPage()
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    if (!localStorage.getItem('__qa_seed')) {
      localStorage.clear(); localStorage.setItem('__qa_seed', '1')
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off')
    }
  })
  await p.goto(BASE + url, { waitUntil: 'load', timeout: 120000 })
  return p
}
const entries = p => p.evaluate(() => { try { window.DuniaTelemetry && DuniaTelemetry.flush(); return JSON.parse(localStorage.getItem('dunia-telemetry') || '{}').e || [] } catch (e) { return [] } })
const block = (p, ms) => p.evaluate(ms => new Promise(r => setTimeout(() => { const t = performance.now(); while (performance.now() - t < ms) {} ; r() }, 50)), ms)

// L1 + L2 on the hub
let p = await open('/index.html?nocine=1')
await p.waitForFunction(() => typeof window.startGameWithLevel === 'function', { timeout: 60000 }); await sleep(1500)
const loaded = await p.evaluate(() => !!window.DuniaTelemetry)
await p.evaluate(() => { state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = 4; startGameWithLevel(1) })
await sleep(1200)
await block(p, 300); await sleep(800)
let e = await entries(p)
const j = e.find(x => x.k === 'jank')
ok(loaded && j && j.ms >= 300 && j.g === 'G4', `L1 hub G4: made jank 300 ms -> ${j ? JSON.stringify(j) : 'nothing'} (telemetry loaded ${loaded})`)
// an inline page script, as a game's own code: an error thrown by puppeteer's evaluate is cross-origin to the page
// and reaches window.onerror as a muted "Script error."
await p.evaluate(() => { const s = document.createElement('script'); s.textContent = "setTimeout(function(){ throw new Error('qa-boom') }, 0); Promise.reject(new Error('qa-reject'))"; document.body.appendChild(s) }); await sleep(800)
e = await entries(p)
const er = e.find(x => x.k === 'error' && /qa-boom/.test(x.msg || '')), pr = e.find(x => x.k === 'promise' && /qa-reject/.test(x.msg || ''))
ok(!!er && !!pr, `L2 made error -> ${er ? er.k + ' "' + er.msg + '" ' + er.g : 'nothing'}; rejection -> ${pr ? pr.k + ' ' + pr.g : 'nothing'}`)
await sleep(8000)   // the watchdog arms 8 s after load
await block(p, 4500); await sleep(2500)
e = await entries(p)
const st = e.find(x => x.k === 'stall')
ok(!!st && st.ms >= 4000, `L1 a 4.5 s block after the page settled -> ${st ? JSON.stringify(st) : 'nothing'}`)
// L5 the Dasbor
await p.evaluate(() => showDashboard(true)); await sleep(800)
const dash = await p.evaluate(() => { const h = document.getElementById('dash-health'); h.scrollIntoView({ block: 'center' }); return { title: (h.querySelector('h3') || {}).textContent, chips: [...h.querySelectorAll('.dtel-chip')].map(c => c.textContent) } })
await sleep(500)
if (SH) { const el = await p.$('#dash-health'); await el.scrollIntoView(); await sleep(300); await p.screenshot({ path: path.join(SH, 'dasbor-health-390x844.png') }) }
await p.evaluate(() => { navigator.clipboard && (navigator.clipboard.writeText = t => { window.__copied = t; return Promise.resolve() }); document.querySelector('#dash-health .dtel-copy').click() }); await sleep(400)
const copied = await p.evaluate(() => window.__copied || (document.querySelector('#dash-health textarea') || {}).value || '')
ok(dash.title === 'Kesehatan perangkat' && dash.chips.some(c => /^Tersendat \d/.test(c)) && dash.chips.some(c => /^Galat \d/.test(c)) && dash.chips.some(c => /^Macet \d/.test(c)) && /qa-boom/.test(copied) && /jank\s+G4/.test(copied),
  `L5 Dasbor "${dash.title}" chips ${JSON.stringify(dash.chips)}; report ${copied.split('\n').length} lines, has qa-boom ${/qa-boom/.test(copied)}`)
// L3
const l3 = await p.evaluate(() => { for (let i = 0; i < 500; i++) DuniaTelemetry.add({ k: 'error', g: 'qa', msg: 'x'.repeat(110) + ' #' + i }); const s = localStorage.getItem('dunia-telemetry'), d = JSON.parse(s); return { n: d.e.length, bytes: s.length, last: d.e[d.e.length - 1].msg.slice(-5) } })
ok(l3.n <= 200 && l3.bytes <= 30000 && l3.last === ' #499', `L3 500 pushed -> ${l3.n} kept, ${l3.bytes} bytes, newest "${l3.last}"`)
await p.close()
// L1 on a page of its own
p = await open('/games/kuis-matematika.html?nocine=1')
await p.waitForFunction(() => !!window.DuniaTelemetry, { timeout: 30000 }).catch(() => {})
await p.evaluate(() => localStorage.removeItem('dunia-telemetry'))
await block(p, 300); await sleep(800)
e = await entries(p)
const kj = e.find(x => x.k === 'jank')
ok(kj && kj.ms >= 300 && kj.g === 'kuis-matematika', `L1 kuis-matematika: made jank -> ${kj ? JSON.stringify(kj) : 'nothing'}`)
await p.close()
await b.close()
console.log(`qa-prd07-telemetry: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
