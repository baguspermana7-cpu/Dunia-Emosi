// Gate for the ledger's oldest car-game complaint: "objects melayang di luar
// jalan/circuit — buildings/emojis escape road bounds".
//
// Measured rather than eyeballed. With a race running it samples every drawn
// object and checks three things:
//   1. nothing is drawn outside the canvas;
//   2. everything the child must dodge or collect sits ON a lane centre, so a
//      hazard can never hover between lanes where it cannot be avoided;
//   3. roadside decoration stays in the verge bands, never on the road.
import puppeteer from 'puppeteer'

const URL = (process.env.QA_BASE || 'http://localhost:8081') + '/games/mobil.html'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})

try {
  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  const errors = []
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 120)))
  await page.setViewport({ width: 1000, height: 780 })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await sleep(6000)
  await page.evaluate(() => { try { startFromSelect() } catch (_) {} })
  await page.waitForFunction(() => typeof S !== 'undefined' && S.tiles, { timeout: 25000 }).catch(() => {})
  await sleep(9000)   // let a few waves of tiles and obstacles spawn
  // Force roadside signs: they spawn every 3-5s and the first sample caught
  // none, so the "decoration stays off the road" check passed on no data at
  // all. A check with an empty sample is not a pass.
  await page.evaluate(() => {
    try {
      const signs = layers.bg && layers.bg._signs
      for (let i = 0; i < 12; i++) spawnRoadSign(signs)
    } catch (e) {}
  })
  await sleep(600)

  const r = await page.evaluate(() => {
    const out = { sampled: 0, offCanvas: [], offLane: [], signsOnRoad: [], lanes: laneXs.slice(),
                  road: [Math.round(roadLeft), Math.round(roadRight)], w: app.screen.width }
    const near = (x, xs, tol) => xs.some(v => Math.abs(v - x) <= tol)
    // things the child interacts with: lane tiles and road obstacles
    for (const t of (S.tiles || [])) {
      if (!t || !t._alive) continue
      out.sampled++
      if (t.x < -40 || t.x > out.w + 40) out.offCanvas.push('tile@' + Math.round(t.x))
      if (!near(t.x, laneXs, 2)) out.offLane.push((t._isObstacle ? 'obstacle' : 'tile') + '@' + Math.round(t.x))
    }
    // roadside decoration must stay off the road
    const signs = (layers.bg && layers.bg._signs && layers.bg._signs._signList) || []
    out.signs = signs.length
    for (const s of signs) {
      out.sampled++
      if (s.x < 0 || s.x > out.w) out.offCanvas.push('sign@' + Math.round(s.x))
      if (s.x > roadLeft && s.x < roadRight) out.signsOnRoad.push('sign@' + Math.round(s.x))
    }
    return out
  })

  check(r.sampled > 5, `enough objects on screen to judge (${r.sampled})`)
  check(r.signs >= 6, `roadside signs actually present in the sample (${r.signs}) — an empty sample is not a pass`)
  check(r.offCanvas.length === 0, `nothing is drawn off-canvas${r.offCanvas.length ? ' — ' + r.offCanvas.slice(0, 3).join(', ') : ''}`)
  check(r.offLane.length === 0,
    `every hazard and collectible sits on a lane centre${r.offLane.length ? ' — ' + r.offLane.slice(0, 3).join(', ') + ' vs lanes ' + r.lanes.map(Math.round).join('/') : ''}`)
  check(r.signsOnRoad.length === 0,
    `roadside decoration stays off the road (${r.road[0]}..${r.road[1]})${r.signsOnRoad.length ? ' — ' + r.signsOnRoad.slice(0, 3).join(', ') : ''}`)
  check(errors.length === 0, `no page errors while racing${errors.length ? ' — ' + errors[0] : ''}`)

  await page.screenshot({ path: 'tools/qa-out/mobil-bounds.png' })
  await page.close()
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
