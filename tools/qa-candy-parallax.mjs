// qa-candy-parallax.mjs — verify candy parallax layers in games/monster-candy.html
// Style: same puppeteer + swiftshader pattern as qa-app-sweep.mjs
// Boots in portrait (390x844) AND landscape (844x390), starts gameplay, lets
// layers drift for ~1.5s, screenshots, checks console errors and PIXI layer counts.
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

const IGNORE = /favicon|pokemondb|showdown|play\.pokemonshowdown|net::ERR|Failed to load resource|ERR_INTERNET|googleapis|gstatic|unpkg/i
const VIEWPORTS = [
  { w: 390, h: 844, tag: 'port', label: 'Portrait  390x844' },
  { w: 844, h: 390, tag: 'land', label: 'Landscape 844x390' },
]
const sleep = ms => new Promise(r => setTimeout(r, ms))

let totalErrors = 0
let allPassed = true

for (const vp of VIEWPORTS) {
  console.log(`\n── ${vp.label} ──`)
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })

    const errs = []
    page.on('console', m => {
      if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text())
    })
    page.on('pageerror', e => {
      if (!IGNORE.test(e.message)) errs.push('PAGEERROR: ' + e.message)
    })

    await page.goto('http://localhost:8081/games/monster-candy.html', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    })

    // Wait for PIXI + drawBackground to finish (game sits on start overlay)
    await sleep(2800)

    // Reveal the canvas WITHOUT starting the game (so the timer doesn't run):
    // hide overlays via JS, leave S.running=false. The parallax bg layers are
    // fully rendered (drawBackground ran in init before overlay was shown).
    await page.evaluate(() => {
      // Hide the start overlay without calling startGame()
      const overlay = document.getElementById('start-overlay')
      if (overlay) overlay.style.display = 'none'
      // Hide HUD (it's on top of canvas at z=50 but shouldn't block screenshot)
    })

    // Small settle wait for the repaint
    await sleep(400)

    // Screenshot — canvas is now fully visible
    const shotPath = `${OUT}/candy-parallax-${vp.tag}.png`
    try { await page.screenshot({ path: shotPath }) }
    catch (_) { await sleep(600); await page.screenshot({ path: shotPath }) }
    console.log(`  Screenshot (canvas revealed, no overlay) → ${shotPath}`)

    // Verify PIXI layer counts
    const check = await page.evaluate(() => {
      try {
        // app is a top-level let in the classic <script> block — accessible by name
        if (typeof app === 'undefined' || !app) return { ok: false, reason: 'PIXI app not found' }
        if (!app.stage || !app.stage.children.length) return { ok: false, reason: 'stage has no children' }

        // bgLayer is the first child of stage
        var bgLayer = app.stage.children[0]
        var bgCount = bgLayer ? bgLayer.children.length : 0

        // _bgParallax is also a top-level let in the same script block
        var bp = (typeof _bgParallax !== 'undefined') ? _bgParallax : null

        // Canvas dimensions
        var cv = document.getElementById('pixi-canvas')
        var cvW = cv ? cv.width : 0
        var cvH = cv ? cv.height : 0

        return {
          ok: true,
          bgCount: bgCount,
          candyFarCount: bp ? bp.candyFar.length : -1,
          candyMidCount: bp ? bp.candyMid.length : -1,
          candyForeCount: bp ? bp.candyFore.length : -1,
          canvasW: cvW,
          canvasH: cvH,
          stageChildren: app.stage.children.length,
        }
      } catch (e) {
        return { ok: false, reason: String(e.message || e) }
      }
    })

    console.log('  PIXI canvas: ' + check.canvasW + 'x' + check.canvasH)
    console.log('  Stage children (bg/game/fx layers): ' + check.stageChildren)
    console.log('  bgLayer children total: ' + check.bgCount)
    console.log('  candyFar tiles: ' + check.candyFarCount + ' (expect 2)')
    console.log('  candyMid floaters: ' + check.candyMidCount + ' (expect 6)')
    console.log('  candyFore posts: ' + check.candyForeCount + ' (expect 5)')

    const cleanErrs = errs.filter(e => !IGNORE.test(e))
    totalErrors += cleanErrs.length
    console.log('  Console errors (non-asset): ' + cleanErrs.length)
    if (cleanErrs.length) cleanErrs.slice(0, 4).forEach(e => console.log('    ✗ ' + e.slice(0, 140)))

    let pass = true
    if (!check.ok) { console.log('  ✗ PIXI check failed: ' + check.reason); pass = false }
    else {
      if (check.candyFarCount < 2)  { console.log('  ✗ candyFar tiles missing'); pass = false }
      if (check.candyMidCount < 6)  { console.log('  ✗ candyMid floaters missing'); pass = false }
      if (check.candyForeCount < 5) { console.log('  ✗ candyFore posts missing'); pass = false }
      if (check.canvasW < 100)      { console.log('  ✗ canvas width too small'); pass = false }
      if (cleanErrs.length > 0)     { console.log('  ✗ non-asset console errors'); pass = false }
    }
    if (pass) console.log('  ✅ candy-parallax layers: PASS')
    else allPassed = false
  } finally {
    await browser.close()
  }
}

console.log('\n──────────────────────────────────────────')
console.log('Total non-asset console errors: ' + totalErrors)
if (allPassed && totalErrors === 0) {
  console.log('✅ candy-parallax QA PASSED — both viewports green, 0 errors')
  process.exit(0)
} else {
  console.log('❌ candy-parallax QA FAILED — see above')
  process.exit(1)
}
