// Whole-app quality gate (v55.82) — boot every game + key page headless at desktop +
// phone, assert it loads + renders + has 0 console/page errors + no 390px horizontal
// overflow. Boots to the landing/select screen (loading clean is the bar; deep gameplay
// is covered by the per-game probes). Screenshots each. Ignores known external noise.
import puppeteer from 'puppeteer'
import fs from 'fs'

const PAGES = [
  'index.html', 'secondbrain.html',
  'games/balapan-kereta.html', 'games/balapan-kereta-side.html', 'games/lokomotif-pemberani.html',
  'games/selamatkan-kereta.html', 'games/museum-kereta.html',
  'games/gym-pokemon.html', 'games/mario-pokemon.html', 'games/monster-candy.html',
  'games/pokemon-run.html', 'games/pokemon-birds.html', 'games/pokemon-bawah-laut.html',
  'games/ducky-volley.html', 'games/kuis-matematika.html', 'games/mobil.html',
]
const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|pokemondb|showdown|play\.pokemonshowdown|net::ERR|Failed to load resource|ERR_INTERNET|googleapis|gstatic|unpkg/i
const VIEWPORTS = [{ w: 1280, h: 800, tag: 'd' }, { w: 390, h: 800, tag: 'p' }]

// v56.0 — one BROWSER per page: 16 sequential WebGL/swiftshader pages in a single
// browser intermittently crash the shared renderer ("Attempted to use detached
// Frame"), killing the whole sweep. Isolation costs ~2s/page and removes the flake;
// a page that still crashes now reports as ITS OWN failure instead of aborting.
const sleep = ms => new Promise(r => setTimeout(r, ms))
const rows = []

for (const pg of PAGES) {
  const name = pg.replace(/^games\//, '').replace(/\.html$/, '')
  const rec = { page: name, errors: [], overflow: false, rendered: null }
  const browser = await puppeteer.launch({
    headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  })
  try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
    const errs = []
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
    try {
      await page.goto('http://localhost:8081/' + pg, { waitUntil: 'domcontentloaded', timeout: 30000 })
    } catch (e) { errs.push('GOTO: ' + e.message) }
    await sleep(2800)   // let the game/page boot to its landing/select screen
    // v56.0 — sw-reload.js may reload the page ONCE mid-probe on a fresh SW install
    // (detached-frame crash). Probe with one retry after the reload settles.
    const probe = () => page.evaluate(() => {
      const cv = document.querySelector('#pixi-canvas, canvas')
      const body = document.body
      return {
        canvasOK: cv ? (cv.width > 0 && cv.height > 0) : null,
        hasContent: !!(body && body.innerText && body.innerText.trim().length > 0) || !!document.querySelector('canvas'),
        scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
      }
    })
    let m
    try { m = await probe() } catch (_) { await sleep(3000); m = await probe() }
    if (vp.tag === 'd') rec.rendered = (m.canvasOK === null) ? m.hasContent : m.canvasOK
    if (vp.tag === 'p' && m.scrollW > m.innerW + 2) rec.overflow = true
    const clean = errs.filter(e => !IGNORE.test(e))
    for (const e of clean) if (!rec.errors.includes(e)) rec.errors.push(e)
    try { await page.screenshot({ path: `${OUT}/app-${name}-${vp.tag}.png` }) }
    catch (_) { await sleep(2000); try { await page.screenshot({ path: `${OUT}/app-${name}-${vp.tag}.png` }) } catch (_) {} }
    await page.close()
  }
  } catch (e) {
    rec.errors.push('SWEEP-CRASH: ' + String(e.message || e).slice(0, 140))
    if (rec.rendered === null) rec.rendered = false
  }
  try { await browser.close() } catch (_) {}
  rows.push(rec)
  const bad = rec.errors.length || rec.overflow || rec.rendered === false
  console.log(`${bad ? '❌' : '✅'} ${rec.page.padEnd(22)} render=${rec.rendered} overflow=${rec.overflow} errors=${rec.errors.length}${rec.errors.length ? ' :: ' + rec.errors.slice(0, 2).join(' | ').slice(0, 160) : ''}`)
}
const bad = rows.filter(r => r.errors.length || r.overflow || r.rendered === false)
console.log(`\n${bad.length ? '❌ ' + bad.length + ' page(s) with issues: ' + bad.map(b => b.page).join(', ') : '✅ all ' + rows.length + ' pages: load + render + 0 errors + no 390px overflow'}`)
process.exit(bad.length ? 1 : 0)
