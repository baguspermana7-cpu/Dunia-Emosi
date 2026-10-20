// Whole-app quality gate (v55.82) — boot every game + key page headless at desktop +
// phone, assert it loads + renders + has 0 console/page errors + no 390px horizontal
// overflow. Boots to the landing/select screen (loading clean is the bar; deep gameplay
// is covered by the per-game probes). Screenshots each. Ignores known external noise.
import puppeteer from 'puppeteer'
import fs from 'fs'

// Pages are ENUMERATED from the filesystem, not hand-listed: a hand list silently
// skipped G27 (ejaan-inggris) for its whole first release. Every games/*.html is
// swept except `_`-prefixed test fixtures; SKIP names any exemption WITH a reason.
const SKIP = {}
const PAGES = ['index.html', 'secondbrain.html'].concat(
  fs.readdirSync('games').filter(f => f.endsWith('.html') && !f.startsWith('_') && !SKIP[f])
    .sort().map(f => 'games/' + f))
// QA_ONLY=<regex> narrows a run (debugging only; the full sweep is the gate).
if (process.env.QA_ONLY) { const re = new RegExp(process.env.QA_ONLY); PAGES.splice(0, PAGES.length, ...PAGES.filter(p => re.test(p))) }
else if (!PAGES.includes('games/ejaan-inggris.html')) { console.error('❌ enumeration lost G27'); process.exit(1) }
// a page that frames ANOTHER site (blippi.html -> /game1/) is served from the rz-work root, where both sites live
// (on :8081 only Dunia exists, so the frame showed a 404 and the page failed for the test server, not for children)
const FRAMED = { 'games/blippi.html': process.env.QA_FRAMED_BASE || 'http://localhost:8090/Dunia-Emosi/' }
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
      await page.goto((FRAMED[pg] || 'http://localhost:8081/') + pg, { waitUntil: 'domcontentloaded', timeout: 30000 })
    } catch (e) { errs.push('GOTO: ' + e.message) }
    await sleep(2800)   // let the game/page boot to its landing/select screen
    // v56.0 — sw-reload.js may reload the page ONCE mid-probe on a fresh SW install
    // (detached-frame crash). Probe with one retry after the reload settles.
    const probe = () => page.evaluate(() => {
      // a framing page is judged by its frame's document (same origin): the game inside must render
      const fr = document.querySelector('body > iframe'), doc = fr && fr.contentDocument && fr.contentDocument.body ? fr.contentDocument : document
      const cv = doc.querySelector('#pixi-canvas, canvas')
      const body = doc.body
      return {
        canvasOK: cv ? (cv.width > 0 && cv.height > 0) : null,
        hasContent: (!!(body && body.innerText && body.innerText.trim().length > 0) || !!doc.querySelector('canvas')) && !(fr && /Error response|404|Not Found/i.test((doc.title || '') + ' ' + (body ? body.innerText.slice(0, 200) : ''))),
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
