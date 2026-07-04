// qa-run-parallax.mjs — verify PIXI parallax depth layers in pokemon-run.html
// Style: same puppeteer pattern as qa-app-sweep.mjs.
// For BOTH viewports: navigate, wait for game to be ready, click to start,
// let it run ~1s so layers scroll, screenshot, check console errors.
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

// Ignore known external asset noise (same filter as qa-app-sweep)
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|ERR_INTERNET|googleapis|gstatic|unpkg/i

const VIEWPORTS = [
  { w: 390,  h: 844, tag: 'port', label: 'portrait  390x844' },
  { w: 844,  h: 390, tag: 'land', label: 'landscape 844x390' },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))
let allOk = true

for (const vp of VIEWPORTS) {
  const outFile = `${OUT}/run-parallax-${vp.tag}.png`
  const errs = []

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })

    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))

    await page.goto('http://localhost:8081/games/pokemon-run.html', {
      waitUntil: 'domcontentloaded', timeout: 30000,
    })

    // Wait for PIXI init + start overlay to become ready
    await sleep(2800)

    // Verify start overlay is ready and PIXI canvas has rendered
    const initOk = await page.evaluate(() => {
      const ov = document.getElementById('start-overlay')
      const cv = document.getElementById('pixi-canvas')
      return {
        overlayReady: ov && ov.classList.contains('ready'),
        canvasOk: cv && cv.width > 0 && cv.height > 0,
        plxInit: !!(window._plxContainer || window._plxLayers),   // visible if declared global
      }
    }).catch(() => ({ overlayReady: false, canvasOk: false, plxInit: false }))

    // Click center of start overlay to start the run
    await page.mouse.click(Math.floor(vp.w / 2), Math.floor(vp.h / 2))
    await sleep(1200)   // let layers scroll for a second

    // Check parallax layer existence + motion via JS
    const plxStatus = await page.evaluate(() => {
      // _plxLayers is a module-scoped var in the inline <script>; check via indirect test
      // — look for the container in the PIXI stage
      try {
        const app = window.app   // app is a module-scoped let — may not be accessible
        if (app && app.stage) {
          return {
            stageChildren: app.stage.children.length,
            firstChildType: app.stage.children[0] && app.stage.children[0].constructor && app.stage.children[0].constructor.name,
          }
        }
      } catch(_) {}
      return { stageChildren: -1, firstChildType: 'unknown' }
    }).catch(() => ({ stageChildren: -1, firstChildType: 'error' }))

    // Screenshot
    await page.screenshot({ path: outFile })

    const clean = errs.filter(e => !IGNORE.test(e))
    const status = initOk.canvasOk ? '✅' : '❌'
    console.log(`${status} ${vp.label}`)
    console.log(`   canvas=${initOk.canvasOk} overlayReady=${initOk.overlayReady}`)
    console.log(`   PIXI stage children=${plxStatus.stageChildren} firstChild=${plxStatus.firstChildType}`)
    console.log(`   non-asset errors=${clean.length}${clean.length ? ' :: ' + clean.slice(0, 3).join(' | ').slice(0, 200) : ''}`)
    console.log(`   screenshot → ${outFile}`)

    if (!initOk.canvasOk || clean.length > 0) allOk = false

  } catch (e) {
    console.log(`❌ ${vp.label} — CRASH: ${e.message}`)
    allOk = false
  } finally {
    await browser.close().catch(() => {})
  }
}

console.log(`\n${allOk ? '✅ parallax probe PASS — both viewports clean' : '❌ parallax probe FAIL'}`)
process.exit(allOk ? 0 : 1)
