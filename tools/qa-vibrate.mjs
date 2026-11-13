#!/usr/bin/env node
// qa-vibrate — PRD-32 (docs/prd/PRD-32-getar-halus.md): the parent's "Getar" setting holds in every game.
// Found 2026-11-14: index.html's setting ('dunia-emosi-vibrate' = 'off') was read only by game.js; 15 navigator.vibrate
// calls in 7 game pages buzzed through it.
//   L1 Kuis Matematika, setting on: a wrong answer tapped for real buzzes (Kuis buzzes on a miss, a super strike and a PvP hit)
//   L2 the same play with the setting off: no buzz reaches the device
//   L3 every game page that can buzz drops a buzz while the setting is off (the guard is on each page)
// The device's vibrate is replaced by a recorder BEFORE the page's scripts run, so the page's own guard wraps it.
// Usage: BASE=http://127.0.0.1:8097/ node tools/qa-vibrate.mjs   (or through tools/run-gates.mjs)
import puppeteer from 'puppeteer'
const BASE = process.env.BASE || 'http://localhost:8090/Dunia-Emosi/'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const PAGES = ['kuis-matematika', 'balapan-kereta', 'selamatkan-kereta', 'museum-kereta', 'lokomotif-pemberani', 'gym-pokemon', 'timmy-kapal']
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
async function open (path, setting) {
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  await p.setViewport({ width: 844, height: 390, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(s => {
    window.__vib = []
    Navigator.prototype.vibrate = function (x) { window.__vib.push(x); return true }
    if (!sessionStorage.__seeded) {
      localStorage.clear()
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]')
      if (s) localStorage.setItem('dunia-emosi-vibrate', s)
      sessionStorage.__seeded = 1
    }
  }, setting)
  await p.goto(BASE + path, { waitUntil: 'load', timeout: 60000 }); await sleep(1500)
  return { p, ctx }
}
const tapEl = async (p, h) => { const r = await h.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2) }
async function wrongAnswer (setting) {
  const { p, ctx } = await open('games/kuis-matematika.html?nocine=1', setting)
  await p.evaluate(() => window.__g25.startLevel(1)); await sleep(1800)
  await p.waitForFunction(() => document.querySelectorAll('#choices button:not([disabled])').length > 1, { timeout: 15000 }).catch(() => {})
  await sleep(400)
  await p.evaluate(() => { window.__vib = [] })
  const ans = await p.evaluate(() => (window.__g25.current() || {}).ans)
  let hit = null
  for (const h of await p.$$('#choices button')) if (await h.evaluate(e => e.textContent.trim()) !== ans) { hit = h; break }
  if (hit) await tapEl(p, hit)
  await sleep(2600)
  const n = await p.evaluate(() => window.__vib.length)
  await ctx.close()
  return { tapped: !!hit, n }
}
const on = await wrongAnswer(null)
ok(on.tapped && on.n >= 1, `L1 setting on: a wrong answer buzzes (${on.n} buzz)`)
const off = await wrongAnswer('off')
ok(off.tapped && off.n === 0, `L2 setting off: no buzz (${off.n} buzz)`)
for (const g of PAGES) {
  const { p, ctx } = await open('games/' + g + '.html?nocine=1', 'off')
  const r = await p.evaluate(() => { window.__vib = []; const v = navigator.vibrate(40); return { v, n: window.__vib.length } })
  ok(r.n === 0, `L3 ${g}: a buzz with the setting off is dropped (${r.n} reached the device)`)
  await ctx.close()
}
await b.close()
console.log(`qa-vibrate: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
