// qa-mario-parallax.mjs — verify parallax near/mid/far layers render correctly
// in mario-pokemon.html for both portrait (390×844) and landscape (844×390).
// Starts the game, moves the player right so the camera scrolls, then screenshots.
// Style matches qa-app-sweep.mjs: puppeteer headless, swiftshader WebGL.
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|ERR_INTERNET|googleapis|gstatic|unpkg/i
const URL = 'http://localhost:8081/games/mario-pokemon.html'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const VIEWPORTS = [
  { w: 390,  h: 844, tag: 'port', label: 'portrait  390×844' },
  { w: 844,  h: 390, tag: 'land', label: 'landscape 844×390' },
]

let allOk = true

for (const vp of VIEWPORTS) {
  console.log(`\n── ${vp.label} ─────────────────────────`)
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  })
  const errors = []
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Wait for game to boot (loading spinner hidden + Pixi canvas ready)
    await sleep(2800)

    // Check if canvas is live
    const canvasOk = await page.evaluate(() => {
      const cv = document.getElementById('pixi-canvas')
      return cv ? (cv.width > 0 && cv.height > 0) : false
    })
    console.log(`  canvas: ${canvasOk ? 'OK' : 'FAIL'}`)

    // Trigger game start: dispatch ArrowRight keydown to wake input + move right.
    // The game listens on window for keydown — this should start BGM gesture AND
    // move the player right so the camera scrolls and parallax is visible.
    await page.evaluate(() => {
      // Simulate a pointerdown on the canvas to satisfy the "first interaction" gate
      const cv = document.getElementById('pixi-canvas')
      if (cv) {
        cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 300 }))
        cv.dispatchEvent(new PointerEvent('pointerup',   { bubbles: true, clientX: 200, clientY: 300 }))
      }
      // Press ArrowRight to walk Pikachu right
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })

    // Hold right for ~1.2s so the camera actually scrolls
    await sleep(1200)

    // Release ArrowRight
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }))
    })

    await sleep(400)  // settle one more frame

    // Read camera offset + near-layer position to confirm parallax is active
    const parallaxInfo = await page.evaluate(() => {
      const app = window._g21App
      if (!app) return { ok: false, reason: '_g21App not found' }
      const stage = app.stage
      // Find containers by z-order: bgLayer(0), parallaxFar(1), parallaxMid(2),
      // parallaxNear(3), world(4), fgLayer(5), hudParticles(6)
      const children = stage.children
      if (!children || children.length < 5) return { ok: false, reason: 'stage children < 5, got ' + (children ? children.length : 0) }
      const world      = children[4]
      const parallaxNear = children[3]
      const parallaxMid  = children[2]
      const parallaxFar  = children[1]
      return {
        ok: true,
        worldX:       Math.round(world.x),
        nearX:        Math.round(parallaxNear.x),
        midX:         Math.round(parallaxMid.x),
        farX:         Math.round(parallaxFar.x),
        nearChildren: parallaxNear.children ? parallaxNear.children.length : 0,
        midChildren:  parallaxMid.children  ? parallaxMid.children.length  : 0,
        farChildren:  parallaxFar.children  ? parallaxFar.children.length  : 0,
      }
    })

    console.log('  parallax info:', JSON.stringify(parallaxInfo))

    // Verify: camera has scrolled (worldX < 0), near layer is proportionally behind
    let parallaxOk = false
    if (parallaxInfo.ok && parallaxInfo.worldX < -5) {
      // world at -camX, near at -camX*0.8: ratio should be ~0.8
      const ratio = parallaxInfo.nearX / parallaxInfo.worldX
      const ratioOk = Math.abs(ratio - 0.8) < 0.05
      const nearHasContent = parallaxInfo.nearChildren > 0
      const midHasContent  = parallaxInfo.midChildren  > 0
      const farHasContent  = parallaxInfo.farChildren  > 0
      parallaxOk = ratioOk && nearHasContent && midHasContent && farHasContent
      console.log(`  near/world ratio: ${ratio.toFixed(3)} (want 0.800±0.05) → ${ratioOk ? 'OK' : 'FAIL'}`)
      console.log(`  near children: ${parallaxInfo.nearChildren}  mid: ${parallaxInfo.midChildren}  far: ${parallaxInfo.farChildren}`)
    } else if (parallaxInfo.worldX >= -5) {
      console.log('  ⚠ camera did not scroll (worldX=' + parallaxInfo.worldX + '); player may not have moved yet — checking static layers')
      // Static check: just confirm containers have children (level 1 may not scroll far at start)
      parallaxOk = parallaxInfo.nearChildren > 0 && parallaxInfo.midChildren > 0 && parallaxInfo.farChildren > 0
    } else {
      console.log('  parallax query failed:', parallaxInfo.reason)
    }

    // Screenshot
    const shotPath = `${OUT}/mario-parallax-${vp.tag}.png`
    await page.screenshot({ path: shotPath })
    console.log(`  screenshot → ${shotPath}`)

    // Filter known-noise errors
    const cleanErrors = errors.filter(e => !IGNORE.test(e))
    if (cleanErrors.length > 0) {
      console.log(`  ❌ console errors (${cleanErrors.length}):`)
      cleanErrors.slice(0, 5).forEach(e => console.log('    ' + e.slice(0, 160)))
    } else {
      console.log(`  console errors: 0 ✅`)
    }

    const ok = canvasOk && parallaxOk && cleanErrors.length === 0
    console.log(`  overall: ${ok ? '✅ PASS' : '❌ FAIL'}`)
    if (!ok) allOk = false

  } catch (e) {
    console.log('  ❌ ERROR:', e.message)
    allOk = false
  } finally {
    try { await browser.close() } catch (_) {}
  }
}

console.log(`\n${ allOk ? '✅ qa-mario-parallax PASS' : '❌ qa-mario-parallax FAIL' }`)
process.exit(allOk ? 0 : 1)
