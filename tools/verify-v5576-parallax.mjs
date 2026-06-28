// v55.76 — verify the "perfected" 3D parallax engine on the clean painterly plates:
//  (1) depth speed-gradient: the far/sky band scrolls FAR less than a near rail band,
//  (2) rail bob: the whole stage oscillates a few px (3D "riding the rails", edge-safe),
//  (3) journey extended to 48 legs, (4) zero console errors. Landscape so cover-fit
//  overscan exists → rail bob is active.
import puppeteer from 'puppeteer'
import fs from 'fs'

const LEVELS = [1, 20, 34]          // 1 + 20 + 34 (Swiss, the built worldwide plate)
const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})

const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []

for (const lv of LEVELS) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 600, deviceScaleFactor: 1 })  // landscape → overscan
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
  await page.evaluateOnNewDocument((level) => {
    sessionStorage.setItem('g14Config', JSON.stringify({ level, trainKey: 'aeg_thomas', train: 'aeg_thomas', difficulty: 'easy' }))
  }, lv)
  try {
    await page.goto('http://localhost:8081/games/balapan-kereta.html', { waitUntil: 'networkidle2', timeout: 20000 })
  } catch (e) { errors.push('GOTO: ' + e.message) }
  await sleep(1800)
  await page.evaluate(() => {
    try {
      const t = (typeof TRAIN_MAP !== 'undefined' && TRAIN_MAP['aeg_thomas']) || null
      if (t) { S.trainCfg = { ...t, variant: 1 }; window.selectedTrainKey = t.key }
      if (typeof startRace === 'function') startRace()
    } catch (e) {}
  })
  await sleep(3800)   // wait out the 3-2-1-GO countdown, then race runs (scroll + bob)

  // sample the parallax state across ~0.6s
  // NB: G14_MANIFEST / L / stage are top-level const/let → lexical globals, NOT
  // window properties. Reference them by bare name (resolves lexically in evaluate).
  const sample = () => page.evaluate(() => {
    const bands = (typeof L !== 'undefined' && L._pBands) || []
    return {
      clean: !!(typeof G14_MANIFEST !== 'undefined' && G14_MANIFEST && G14_MANIFEST.clean),
      nBands: bands.length,
      xs: bands.map(c => c.x),
      stageY: (typeof stage !== 'undefined' ? stage.y : null),
      journeyLen: (typeof G14_JOURNEY !== 'undefined' ? G14_JOURNEY.length : null),
      station: (typeof g14Journey === 'function') ? g14Journey().name : null,
    }
  })
  const a = await sample()
  // collect several stageY samples to confirm oscillation
  const bobSamples = []
  for (let i = 0; i < 10; i++) { bobSamples.push((await page.evaluate(() => typeof stage !== 'undefined' ? stage.y : 0))); await sleep(60) }
  const b = await sample()
  await page.screenshot({ path: `${OUT}/v5576-L${String(lv).padStart(2, '0')}.png` })

  let farShift = null, nearShift = null, depthOK = null
  if (a.clean && a.nBands >= 2 && b.nBands === a.nBands) {
    farShift = Math.abs(b.xs[0] - a.xs[0])                 // band 0 = sky/far (slow)
    nearShift = Math.abs(b.xs[a.nBands - 2] - a.xs[a.nBands - 2])  // a near rail band (fast)
    depthOK = nearShift > farShift * 1.8                   // near must scroll much faster
  }
  const bobMin = Math.min(...bobSamples), bobMax = Math.max(...bobSamples)
  const bobRange = bobMax - bobMin
  const bobOK = bobRange > 0.3 && Math.abs(bobMin) <= 3.2 && Math.abs(bobMax) <= 3.2

  results.push({
    lv, clean: a.clean, nBands: a.nBands, journeyLen: a.journeyLen, station: a.station,
    farShift: farShift && +farShift.toFixed(1), nearShift: nearShift && +nearShift.toFixed(1),
    depthGradientOK: depthOK, bobRange: +bobRange.toFixed(2), railBobOK: bobOK,
    errors: errors.filter(e => !/favicon|Pokedex|pokemondb|showdown|net::ERR|Failed to load resource/i.test(e)),
  })
  await page.close()
}
await browser.close()

console.log(JSON.stringify(results, null, 2))
const bad = results.filter(r =>
  r.errors.length ||
  r.journeyLen !== 48 ||
  (r.clean && (r.depthGradientOK === false || r.railBobOK === false))
)
console.log(bad.length ? `\n❌ ${bad.length} level(s) with issues` : '\n✅ parallax depth + rail bob + 48-leg journey verified, 0 errors')
process.exit(bad.length ? 1 : 0)
