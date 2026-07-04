// QA: underwater parallax layers — portrait + landscape screenshots
// Mirrors qa-app-sweep.mjs style (headless:new, swiftshader WebGL).
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT  = 'tools/qa-out'
const URL  = 'http://localhost:8081/games/pokemon-bawah-laut.html'
const IGNORE = /favicon|pokemondb|showdown|play\.pokemonshowdown|net::ERR|Failed to load resource|ERR_INTERNET|googleapis|gstatic|unpkg/i

fs.mkdirSync(OUT, { recursive: true })

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function runViewport(browser, w, h, tag) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })

  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  } catch (e) {
    errors.push('GOTO: ' + e.message)
  }

  // Wait for PIXI boot + parallax layer init
  await sleep(3200)

  // Dismiss the start overlay + begin gameplay via real pointer click at canvas centre.
  // The pointerdown listener (not excluded for start-overlay) calls swim() →
  // S.started=true, hides the overlay and starts the ticker.
  try {
    // First try a real mouse click in the safe zone (below HUD, above quiz area)
    const clickY = Math.floor(h * 0.5)
    await page.mouse.click(Math.floor(w / 2), clickY)
  } catch (_) {}

  // Also force via JS in case the synthetic click was swallowed
  try {
    await page.evaluate(() => {
      const overlay = document.getElementById('start-overlay')
      if (overlay && !overlay.classList.contains('hidden')) {
        // Fire a synthetic PointerEvent at the canvas (not quiz/hud/back btn zones)
        const canvas = document.getElementById('pixi-canvas')
        if (canvas) {
          canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: window.innerWidth/2, clientY: window.innerHeight/2 }))
        }
      }
    })
  } catch (_) {}

  // Let several seconds of gameplay run so parallax layers scroll visibly
  await sleep(3500)

  const fname = `${OUT}/underwater-parallax-${tag}.png`
  await page.screenshot({ path: fname, fullPage: false })
  console.log(`  Screenshot → ${fname}`)

  // Probe canvas render
  let canvasOK = false
  try {
    canvasOK = await page.evaluate(() => {
      const cv = document.getElementById('pixi-canvas')
      return cv ? (cv.width > 0 && cv.height > 0) : false
    })
  } catch (_) {}

  // Check for horizontal overflow
  let overflow = false
  try {
    overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 2
    )
  } catch (_) {}

  await page.close()

  const clean = errors.filter(e => !IGNORE.test(e))
  return { tag, errors: clean, canvasOK, overflow }
}

// ─────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
})

console.log('\n=== QA: underwater parallax ===')

const VIEWPORTS = [
  { w: 390, h: 844, tag: 'port', label: 'portrait  (390×844)' },
  { w: 844, h: 390, tag: 'land', label: 'landscape (844×390)' },
]

const results = []
for (const vp of VIEWPORTS) {
  console.log(`\nRunning ${vp.label}…`)
  const r = await runViewport(browser, vp.w, vp.h, vp.tag)
  results.push(r)
  console.log(`  canvas rendered : ${r.canvasOK}`)
  console.log(`  horizontal overflow: ${r.overflow}`)
  console.log(`  non-asset errors: ${r.errors.length}`)
  if (r.errors.length) r.errors.forEach(e => console.log('  ERROR:', e))
}

await browser.close()

const totalErrors   = results.reduce((n, r) => n + r.errors.length, 0)
const allRendered   = results.every(r => r.canvasOK)
const anyOverflow   = results.some(r => r.overflow)

console.log('\n──────────────────────────────')
console.log(`Total non-asset errors : ${totalErrors}`)
console.log(`Canvas rendered (both) : ${allRendered}`)
console.log(`Horizontal overflow    : ${anyOverflow}`)

if (totalErrors === 0 && allRendered && !anyOverflow) {
  console.log('✓ PASS — 0 errors, both viewports rendered, no overflow')
  process.exit(0)
} else {
  console.log('✗ FAIL')
  process.exit(1)
}
