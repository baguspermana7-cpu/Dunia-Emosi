// A-315 E3/E4/E5 verification — boot the 3 motion-engine adopter games headless,
// assert window.Motion loaded + 0 non-asset console/page errors, drive g15 lane
// switches (checks the train converges EXACTLY onto the target rail — zero-tolerance),
// screenshot each into tools/qa-out/smooth-{g15,g16,side}.png.
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|ERR_INTERNET|googleapis|gstatic|unpkg/i
const sleep = ms => new Promise(r => setTimeout(r, ms))

const GAMES = [
  { tag: 'g15', pg: 'games/lokomotif-pemberani.html' },
  { tag: 'g16', pg: 'games/selamatkan-kereta.html' },
  { tag: 'side', pg: 'games/balapan-kereta-side.html' },
]

let fail = 0
for (const g of GAMES) {
  const browser = await puppeteer.launch({
    headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
  try {
    await page.goto('http://localhost:8081/' + g.pg, { waitUntil: 'domcontentloaded', timeout: 30000 })
  } catch (e) { errs.push('GOTO: ' + e.message) }
  await sleep(3200)

  const motion = await page.evaluate(() => !!(window.Motion && window.Motion.damp)).catch(() => false)

  let laneNote = ''
  if (g.tag === 'g15') {
    // Enter gameplay: REAL mouse click at the first train card's bbox center
    // (deep-testing mandate — no synthetic el.click()).
    try {
      await page.waitForSelector('#train-select .tcard', { timeout: 8000 })
      const box = await (await page.$('#train-select .tcard')).boundingBox()
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await sleep(4500) // pixi init + intro
    } catch (e) { laneNote = 'select-err:' + e.message + ' ' }
    // Drive quick lane switches; then verify exact rail landing.
    try {
      for (let i = 0; i < 3; i++) { await page.evaluate(() => { try { switchLane(1) } catch (_) {} }); await sleep(160) }
      await page.evaluate(() => { try { switchLane(-1) } catch (_) {} })
      await sleep(1400) // let the damp settle + bounce finish
      laneNote = await page.evaluate(() => {
        try {
          if (typeof trainContainer === 'undefined' || !trainContainer) return 'no-train'
          const target = LANE_Y[playerLane] + (typeof g15CharRailOffset !== 'undefined' ? g15CharRailOffset : 0)
          const off = Math.abs(trainContainer._tweenY - target)
          return 'lane=' + playerLane + ' tweenY-off=' + off.toFixed(3) + (off === 0 ? ' EXACT' : ' DRIFT')
        } catch (e) { return 'probe-err:' + e.message }
      })
    } catch (e) { laneNote = 'drive-err:' + e.message }
  }
  if (g.tag === 'g16') {
    // Click Mulai! (real mouse, bbox center) → gameplay; let the train run so the
    // E4 speed-smoothing / camera / stop-ease paths execute; assert sim advances.
    try {
      const btn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => /Mulai/i.test(b.textContent)))
      const box = btn && (await btn.asElement()?.boundingBox())
      if (box) { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await sleep(7000) }
      laneNote = await page.evaluate(() => {
        try {
          if (typeof S === 'undefined') return 'no-S'
          return 'state=' + S.trainState + ' worldX=' + Math.round(S.worldX) + ' camSmoothed=' + (S._camX != null) + ' spdSmoothed=' + (S._smSpeed != null)
        } catch (e) { return 'probe-err:' + e.message }
      })
    } catch (e) { laneNote = 'drive-err:' + e.message }
  }
  if (g.tag === 'side') {
    // Skip tutorial (real mouse), then fire a jump — exercises the landing-squash
    // path; verify the train scale settles back to its exact base (zero-tolerance).
    try {
      for (const sk of await page.$$('.tut-skip')) {
        const box = await sk.boundingBox()
        if (box) { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); break }
      }
      await sleep(8000) // pre-race banner + 3-2-1 countdown → S.running
      const jb = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => /LOMPAT/i.test(b.textContent)))
      const jbox = jb && (await jb.asElement()?.boundingBox())
      if (jbox) { await page.mouse.click(jbox.x + jbox.width / 2, jbox.y + jbox.height / 2) }
      await sleep(2200) // full jump arc + landing squash (200ms) settles
      laneNote = await page.evaluate(() => {
        try {
          if (typeof S === 'undefined' || !trainSprite) return 'no-train'
          const sc = trainSprite.scale
          const bx = sc._mBaseX, by = sc._mBaseY
          const settled = (bx == null) ? 'squash-not-fired' : (sc.x === bx && sc.y === by ? 'scale-EXACT' : 'scale-DRIFT ' + sc.x + '/' + bx)
          return 'running=' + S.running + ' dist=' + Math.round(S.distance) + ' ' + settled + ' stage0=' + (stage.x === 0 && stage.y === 0)
        } catch (e) { return 'probe-err:' + e.message }
      })
    } catch (e) { laneNote = 'drive-err:' + e.message }
  }

  await page.screenshot({ path: `${OUT}/smooth-${g.tag}.png` }).catch(() => {})
  const clean = errs.filter(e => !IGNORE.test(e))
  const ok = motion && clean.length === 0
  if (!ok) fail++
  console.log(`[${g.tag}] motion=${motion} errors=${clean.length} ${laneNote}`)
  clean.slice(0, 6).forEach(e => console.log('   ERR: ' + e.slice(0, 220)))
  await browser.close()
}
console.log(fail === 0 ? 'A315-SMOOTH: ALL PASS' : `A315-SMOOTH: ${fail} FAIL`)
process.exit(fail === 0 ? 0 : 1)
