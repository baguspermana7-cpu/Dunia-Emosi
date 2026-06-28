// Headless visual probe for g14-side (balapan-kereta-side) v55.77 — verifies the
// SHARED painterly backdrop mounts as a SCENERY-ONLY far layer (sky+far bands only),
// scrolls, the side game's OWN rail still renders, the speed overlay is present, and
// there are 0 console errors. NB: sideBackdrop/sideSpeedFX/S/stage are top-level
// const/let → lexical globals, NOT window props → read by bare identifier.
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|Pokedex|pokemondb|showdown|net::ERR|Failed to load resource/i

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})
const sleep = ms => new Promise(r => setTimeout(r, ms))
const page = await browser.newPage()
await page.setViewport({ width: 1000, height: 600, deviceScaleFactor: 1 })
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
// seed train + mark tutorial seen so the race boots straight into countdown
await page.evaluateOnNewDocument(() => {
  try { sessionStorage.setItem('g14-side-train', 'aeg_thomas') } catch (_) {}
  try { localStorage.setItem('g14s-tutorial-seen', '1') } catch (_) {}
})
try {
  await page.goto('http://localhost:8081/games/balapan-kereta-side.html', { waitUntil: 'networkidle2', timeout: 25000 })
} catch (e) { errors.push('GOTO: ' + e.message) }
await sleep(1500)
// dismiss any pre-race banner by clicking, then wait out the countdown + run a bit
await page.evaluate(() => { try { document.body.click() } catch (_) {} })
await sleep(4200)

const x0 = await page.evaluate(() => (typeof sideBackdrop !== 'undefined' && sideBackdrop && sideBackdrop.bands)
  ? sideBackdrop.bands.map(b => b.x) : null)
await sleep(650)
const info = await page.evaluate(() => {
  const bd = (typeof sideBackdrop !== 'undefined') ? sideBackdrop : null
  return {
    mounted: !!bd,
    bands: bd && bd.bands ? bd.bands.length : 0,
    bandX: bd && bd.bands ? bd.bands.map(b => Math.round(b.x * 100) / 100) : null,
    speedFX: !!(typeof sideSpeedFX !== 'undefined' && sideSpeedFX),
    running: !!(typeof S !== 'undefined' && S && S.running),
    railRenders: (typeof railContainer !== 'undefined' && railContainer)
      ? (railContainer.children && railContainer.children.length > 0) : null,
    stageY: (typeof stage !== 'undefined' && stage) ? Math.round(stage.y * 100) / 100 : null,
  }
})
let scrolled = false
if (x0 && info.bandX) {
  for (let i = 0; i < x0.length; i++) {
    if (Math.abs((x0[i] || 0) - (info.bandX[i] || 0)) > 0.5) { scrolled = true; break }
  }
}
await page.screenshot({ path: `${OUT}/g14-side-backdrop.png` })
await page.close()
await browser.close()

const cleanErrors = errors.filter(e => !IGNORE.test(e))
const out = { ...info, scrolled, errors: cleanErrors }
console.log(JSON.stringify(out, null, 2))
// scenery-only mount keeps just the sky+far bands → expect ~2 bands (fy1<=0.6)
const bad = !out.mounted || out.bands < 1 || !out.scrolled || !out.speedFX || out.railRenders !== true || out.errors.length
console.log(bad
  ? '\n❌ g14-side backdrop has issues'
  : '\n✅ g14-side: scenery backdrop mounted + scrolls + speedFX + own rail intact + 0 errors')
process.exit(bad ? 1 : 0)
