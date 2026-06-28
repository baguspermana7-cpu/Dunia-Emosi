// Headless visual probe for g15 (lokomotif-pemberani) v55.77 — verifies the SHARED
// painterly backdrop + depth-parallax engine + always-on speed overlay are wired in.
// Pixi FPS is not measurable headless (software-GL), so we judge VISUALS via the
// band x-positions changing across time + a screenshot per level.
import puppeteer from 'puppeteer'
import fs from 'fs'

const LEVELS = [1, 5]
const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})

const IGNORE = /favicon|Pokedex|pokemondb|showdown|net::ERR|Failed to load resource/i
const summary = []
for (const lv of LEVELS) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 600, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
  await page.evaluateOnNewDocument((level) => {
    sessionStorage.setItem('g15Config', JSON.stringify({ level }))
  }, lv)
  try {
    await page.goto('http://localhost:8081/games/lokomotif-pemberani.html', { waitUntil: 'networkidle2', timeout: 25000 })
  } catch (e) { errors.push('GOTO: ' + e.message) }
  await new Promise(r => setTimeout(r, 1200))

  // Start the game by clicking the first train card (real boot flow → initPixi()).
  await page.evaluate(() => {
    const card = document.querySelector('#train-grid .tcard')
    if (card) card.click()
  })
  // Wait out initPixi() (async app.init) + a few frames of scroll.
  await new Promise(r => setTimeout(r, 3500))

  // NB: g15Backdrop / g15SpeedFX / LANE_Y / trainContainer / stage are top-level
  // const/let → lexical globals, NOT window properties. Read by bare identifier.
  const x0 = await page.evaluate(() => (typeof g15Backdrop !== 'undefined' && g15Backdrop && g15Backdrop.bands)
    ? g15Backdrop.bands.map(b => b.x) : null)
  await new Promise(r => setTimeout(r, 600))
  const info = await page.evaluate(() => {
    const bd = (typeof g15Backdrop !== 'undefined') ? g15Backdrop : null
    return {
      mounted: !!bd,
      bands: bd && bd.bands ? bd.bands.length : 0,
      bandX: bd && bd.bands ? bd.bands.map(b => Math.round(b.x * 100) / 100) : null,
      speedFX: !!(typeof g15SpeedFX !== 'undefined' && g15SpeedFX),
      playerLane: (typeof playerLane !== 'undefined') ? playerLane : null,
      laneYs: (typeof LANE_Y !== 'undefined' && Array.isArray(LANE_Y)) ? LANE_Y.map(y => Math.round(y)) : null,
      trainY: (typeof trainContainer !== 'undefined' && trainContainer) ? Math.round(trainContainer.y) : null,
      stageY: (typeof stage !== 'undefined' && stage) ? Math.round(stage.y * 100) / 100 : null,
    }
  })

  // Did the depth bands scroll? (at least one band's x changed across ~0.6s)
  let scrolled = false
  if (x0 && info.bandX) {
    for (let i = 0; i < x0.length; i++) {
      if (Math.abs((x0[i] || 0) - (info.bandX[i] || 0)) > 0.5) { scrolled = true; break }
    }
  }

  // Train on painted rail? trainY ≈ LANE_Y[playerLane] (±18px for bob/tween).
  let trainOnRail = null
  if (info.laneYs && info.trainY != null && info.playerLane != null) {
    trainOnRail = Math.abs(info.trainY - info.laneYs[info.playerLane]) <= 18
  }

  await page.screenshot({ path: `${OUT}/g15-bd-L${String(lv).padStart(2, '0')}.png` })
  const cleanErrors = errors.filter(e => !IGNORE.test(e))
  summary.push({ lv, ...info, scrolled, trainOnRail, errors: cleanErrors })
  await page.close()
}
await browser.close()
console.log(JSON.stringify(summary, null, 2))
const bad = summary.filter(s =>
  !s.mounted || s.bands < 1 || !s.scrolled || !s.speedFX || s.trainOnRail !== true || s.errors.length)
console.log(bad.length
  ? `\n❌ ${bad.length} level(s) with issues`
  : `\n✅ all sample levels: backdrop mounted + bands scroll + speedFX + train-on-rail + 0 errors`)
process.exit(bad.length ? 1 : 0)
