// QA probe — pokemon-birds.html parallax layers (portrait + landscape)
// Boots the game, starts it (click-to-flap), lets layers drift briefly, screenshots.
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|pokemondb|showdown|play\.pokemonshowdown|net::ERR|Failed to load resource|ERR_INTERNET|googleapis|gstatic|unpkg/i
const VIEWPORTS = [
  { w: 390, h: 844, tag: 'port', label: 'portrait 390×844' },
  { w: 844, h: 390, tag: 'land', label: 'landscape 844×390' },
]
const sleep = ms => new Promise(r => setTimeout(r, ms))

let totalErrors = 0
const results = []

for (const vp of VIEWPORTS) {
  console.log(`\n── ${vp.label} ──`)
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })

  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))

  try {
    await page.goto('http://localhost:8081/games/pokemon-birds.html', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    })
  } catch (e) {
    errs.push('GOTO: ' + e.message)
  }

  // Wait for PixiJS to boot and background to render
  await sleep(2800)

  // Check if start overlay is present — click to start game (triggers flap/bird launch)
  const overlayVisible = await page.evaluate(() => {
    const ol = document.getElementById('start-overlay')
    return ol && !ol.classList.contains('hidden')
  }).catch(() => false)

  if (overlayVisible) {
    // First click starts the game (dismisses overlay)
    await page.mouse.click(vp.w / 2, vp.h / 2)
    await sleep(350)
    // Flap repeatedly to keep bird airborne while layers scroll into view
    for (let i = 0; i < 10; i++) {
      await page.mouse.click(vp.w / 2, vp.h / 2)
      await sleep(280)
    }
    // Extra wait: near clouds move ~82px/s, far clouds ~15px/s — let them drift clearly
    await sleep(2500)
  } else {
    await sleep(800)
  }

  // Verify: canvas rendered + check for parallax layer objects in stage
  const info = await page.evaluate(() => {
    const cv = document.getElementById('pixi-canvas')
    const hasCanvas = cv && cv.width > 0 && cv.height > 0
    // PIXI global is a UMD module — window.PIXI exists
    const hasPixi = !!(window.PIXI)
    // parallaxFarSkyline etc. are var (window-property) — accessible here
    const hasFarSkyline = Array.isArray(window.parallaxFarSkyline) ? window.parallaxFarSkyline.length : -1
    const hasFarClouds  = Array.isArray(window.parallaxFarClouds)  ? window.parallaxFarClouds.length  : -1
    const hasNearClouds = Array.isArray(window.parallaxNearClouds) ? window.parallaxNearClouds.length : -1
    const reducedMotion = !!window.REDUCED_MOTION
    return { hasCanvas, hasPixi, hasFarSkyline, hasFarClouds, hasNearClouds, reducedMotion }
  }).catch(() => ({ hasCanvas: false, hasPixi: false, hasFarSkyline: -1, hasFarClouds: -1, hasNearClouds: -1, reducedMotion: false }))

  // Sample pixel colors from sky area to verify cloud/skyline rendering
  const pixelSamples = await page.evaluate(() => {
    const cv = document.getElementById('pixi-canvas')
    if (!cv) return []
    try {
      const tmp = document.createElement('canvas')
      tmp.width = cv.width; tmp.height = cv.height
      const ctx2d = tmp.getContext('2d')
      ctx2d.drawImage(cv, 0, 0)
      const positions = [
        { label: 'sky-top',    x: Math.round(cv.width * 0.25), y: Math.round(cv.height * 0.08) },
        { label: 'sky-mid1',   x: Math.round(cv.width * 0.25), y: Math.round(cv.height * 0.20) },
        { label: 'sky-mid2',   x: Math.round(cv.width * 0.55), y: Math.round(cv.height * 0.20) },
        { label: 'sky-mid3',   x: Math.round(cv.width * 0.10), y: Math.round(cv.height * 0.25) },
        { label: 'mtn-band',   x: Math.round(cv.width * 0.35), y: Math.round(cv.height * 0.40) },
        { label: 'mtn-band2',  x: Math.round(cv.width * 0.70), y: Math.round(cv.height * 0.38) },
      ]
      return positions.map(p => {
        const d = ctx2d.getImageData(p.x, p.y, 1, 1).data
        return { ...p, r: d[0], g: d[1], b: d[2] }
      })
    } catch (e) { return [{ error: e.message }] }
  }).catch(() => [])
  if (pixelSamples.length > 0 && !pixelSamples[0].error) {
    console.log('  Pixel samples (sky area — cloud/skyline check):')
    for (const s of pixelSamples) {
      console.log(`    [${s.label}] (${s.x},${s.y}) = rgb(${s.r},${s.g},${s.b})`)
    }
  } else if (pixelSamples[0]?.error) {
    console.log('  Pixel sampling error:', pixelSamples[0].error)
  }

  const ssPath = `${OUT}/birds-parallax-${vp.tag}.png`
  await page.screenshot({ path: ssPath })
  console.log(`  Screenshot → ${ssPath}`)

  const clean = errs.filter(e => !IGNORE.test(e))
  totalErrors += clean.length

  console.log(`  Canvas OK   : ${info.hasCanvas}`)
  console.log(`  PIXI loaded : ${info.hasPixi}`)
  console.log(`  reducedMotion : ${info.reducedMotion}`)
  console.log(`  parallaxFarSkyline.length : ${info.hasFarSkyline} (expect 2, or 0 if reduced-motion)`)
  console.log(`  parallaxFarClouds.length  : ${info.hasFarClouds}  (expect 7, or 0 if reduced-motion)`)
  console.log(`  parallaxNearClouds.length : ${info.hasNearClouds} (expect 4, or 0 if reduced-motion)`)
  console.log(`  Console errors (filtered) : ${clean.length}`)
  if (clean.length > 0) clean.forEach(e => console.log('    ERR:', e.slice(0, 200)))

  // If reduced-motion is active the arrays are empty (length 0) and that's correct
  const layersOk = info.reducedMotion
    ? (info.hasFarSkyline === 0 && info.hasFarClouds === 0 && info.hasNearClouds === 0)
    : (info.hasFarSkyline === 2 && info.hasFarClouds === 7 && info.hasNearClouds === 4)
  const ok = info.hasCanvas && info.hasPixi && layersOk && clean.length === 0
  results.push({ vp: vp.tag, ok, errors: clean.length, info })

  await browser.close()
}

console.log('\n══ Summary ══')
for (const r of results) {
  console.log(`  ${r.ok ? '✅' : '❌'} ${r.vp} — errors=${r.errors} farSkyline=${r.info.hasFarSkyline} farClouds=${r.info.hasFarClouds} nearClouds=${r.info.hasNearClouds}`)
}
const allOk = results.every(r => r.ok)
console.log(allOk ? '\n✅ All viewports PASS — parallax layers present, 0 errors' : '\n❌ Some viewports FAILED')
process.exit(allOk ? 0 : 1)
