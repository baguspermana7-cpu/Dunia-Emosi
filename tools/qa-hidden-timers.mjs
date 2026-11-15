#!/usr/bin/env node
// qa-hidden-timers — always-on timers do no work while the tab is hidden, and work again when it is shown (audit A-15).
// For each page, the timers of the listed files are watched for 3 s with document.hidden forced true (document.hidden /
// visibilityState overridden + a visibilitychange event), then for 3 s visible again:
//   hidden: 0 units of work from each file;  visible: > 0 from each file (so the watch can see that file at all).
// "Work" is counted where the tick acts, attributed to a file by the call stack:
//   DOM reads the ticks start with (getElementById, querySelector(All), getAttribute, getBoundingClientRect,
//   getComputedStyle), DuniaCinema.state() called from dunia-cinema-pixi.js, and the visible() check of every
//   DuniaHome button (called once per dunia-home.js tick).
// Plus: the Kuis Matematika tournament clock a child sees pauses while hidden (no catch-up) and runs again when shown.
// Built 2026-11-15: 11 intervals / rAF loops kept repainting and polling in a hidden tab.
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-hidden-timers.mjs
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const PAGES = [
  { url: '/games/kuis-matematika.html', files: ['kuis-matematika.html'], tourn: true },
  { url: '/games/mojo-swoptops.html?pack=kereta', files: ['kereta-life.js', 'kereta-pack.js', 'dunia-home.js'] },
  { url: '/games/pokemon-birds.html', files: ['dunia-cinema-pixi.js', 'dunia-home.js'] }
]

function probe (FILES) {
  let H = false
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => H })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (H ? 'hidden' : 'visible') })
  window.__qaSetHidden = h => { H = h; document.dispatchEvent(new Event('visibilitychange')) }
  const counts = {}; window.__qaWork = counts
  Error.stackTraceLimit = 50
  const note = window.__qaNote = function () {
    const st = new Error().stack || ''
    for (const f of FILES) if (st.indexOf(f) >= 0) counts[f] = (counts[f] || 0) + 1
  }
  const spy = (o, name) => {
    const f = o[name]; if (typeof f !== 'function') return
    o[name] = function () { note(); return f.apply(this, arguments) }
  }
  spy(Document.prototype, 'getElementById'); spy(Document.prototype, 'querySelector'); spy(Document.prototype, 'querySelectorAll')
  spy(Element.prototype, 'querySelector'); spy(Element.prototype, 'querySelectorAll'); spy(Element.prototype, 'getAttribute')
  spy(Element.prototype, 'getBoundingClientRect'); spy(window, 'getComputedStyle')
  // every Home button's visible() check runs once per dunia-home.js tick
  let DH
  Object.defineProperty(window, 'DuniaHome', {
    configurable: true,
    get: () => DH,
    set: v => {
      if (v && typeof v.mount === 'function' && !v.mount.__qa) {
        const m = v.mount
        v.mount = function (o) { o = o || {}; const vis = o.visible; o.visible = function () { note(); return vis ? vis.apply(this, arguments) : true }; return m.call(this, o) }
        v.mount.__qa = true
      }
      DH = v
    }
  })
}

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--autoplay-policy=no-user-gesture-required'] })
const snap = p => p.evaluate(() => Object.assign({}, window.__qaWork))
const diff = (a, z, f) => (z[f] || 0) - (a[f] || 0)
const clockNow = p => p.evaluate(() => { const e = document.getElementById('t-timer'); return e ? +e.textContent : null })
for (const pg of PAGES) {
  const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 })
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 120)))
  await p.evaluateOnNewDocument(probe, pg.files)
  await p.goto(BASE + pg.url, { waitUntil: 'load' })
  await sleep(3000)
  // DuniaCinema.state() is read at call time, so wrapping it now catches every later call from the pixi file
  await p.evaluate(() => { const C = window.DuniaCinema; if (C && C.state && !C.state.__qa) { const f = C.state; C.state = function () { window.__qaNote(); return f.apply(this, arguments) }; C.state.__qa = true } })
  let clock = null
  if (pg.tourn) {
    // the way a child starts it: the Turnamen button, then "Mulai Turnamen"; the clock is the number on screen
    clock = await p.evaluate(() => { try { MP.openModal('turnamen'); document.getElementById('tourn-start').click(); return +document.getElementById('t-timer').textContent } catch (e) { return 'error: ' + e.message } })
    ok(typeof clock === 'number', `${pg.url}: a tournament round started (${clock})`)
  }
  await p.evaluate(() => window.__qaSetHidden(true)); await sleep(300)
  const h0 = await snap(p), c0 = pg.tourn ? await clockNow(p) : null
  await sleep(3000)
  const h1 = await snap(p), c1 = pg.tourn ? await clockNow(p) : null
  await p.evaluate(() => window.__qaSetHidden(false)); await sleep(300)
  const v0 = await snap(p)
  await sleep(3000)
  const v1 = await snap(p), c2 = pg.tourn ? await clockNow(p) : null
  for (const f of pg.files) {
    const hw = diff(h0, h1, f), vw = diff(v0, v1, f)
    console.log(`  ${pg.url}  ${f}: hidden ${hw}, visible ${vw}`)
    ok(hw === 0, `${pg.url} ${f}: ${hw} units of work in 3 s while hidden (want 0)`)
    ok(vw > 0, `${pg.url} ${f}: ${vw} units of work in 3 s once visible again (want > 0)`)
  }
  if (pg.tourn) {
    ok(c0 === c1, `${pg.url}: the tournament clock holds while hidden (${c0} -> ${c1})`)
    ok(typeof c2 === 'number' && c2 <= c1 - 2, `${pg.url}: the clock runs again once visible (${c1} -> ${c2})`)
  }
  ok(!errs.length, `${pg.url} page errors: ${errs.slice(0, 2).join(' | ')}`)
  await p.close()
}
await b.close()
console.log(`qa-hidden-timers: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
