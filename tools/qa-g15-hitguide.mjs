// Gate for the G15 (Lokomotif Pemberani) hit-box guide and spawn spacing.
//
// The owner's complaint was that dodging looked impossible: "panjang tidak
// sesuai dg jarak antar rintangan ... tidak ada guidance batas body keretanya".
// Both halves are measurable, so both are measured here rather than eyeballed.
//
//   1. The collider is drawn. A guide graphic must exist, sit exactly on the
//      collider's centre (TRAIN_X, train y) and follow the train between lanes.
//   2. Consecutive boxes are never closer than one TRAIN LENGTH plus clearance
//      at the current speed -- the gap has to be big enough to hold the thing
//      the child is steering.
import puppeteer from 'puppeteer'

const URL = process.env.QA_URL || 'http://localhost:8081/games/lokomotif-pemberani.html'
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
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 140)))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/i.test(m.text())) errors.push(m.text().slice(0, 140)) })
  await page.setViewport({ width: 1280, height: 800 })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForFunction(() => typeof initPixi === 'function' && typeof TRAIN_CATALOG !== 'undefined', { timeout: 30000 })

  // start a run the way the picker does: choose a character train, then init
  await page.evaluate(() => {
    const cat = TRAIN_CATALOG.find(t => String(t.key).startsWith('mex_')) ||
                TRAIN_CATALOG.find(t => t.isCharacter) || TRAIN_CATALOG[0]
    selectedTrain = cat
    const sel = document.getElementById('train-select'); if (sel) sel.style.display = 'none'
    return initPixi()
  })
  await page.waitForFunction(() => typeof gameRunning !== 'undefined' && gameRunning, { timeout: 30000 })
  // the character texture resolves a few frames after mount; wait for the
  // measurement to settle rather than guessing a delay
  await page.waitForFunction(() => typeof g15TrainLenPx !== 'undefined' && g15TrainLenPx > 120, { timeout: 20000 })
  await sleep(1200)

  const geom = await page.evaluate(() => ({
    hasGuide: !!(typeof hitGuideGfx !== 'undefined' && hitGuideGfx),
    guideX: typeof hitGuideGfx !== 'undefined' && hitGuideGfx ? hitGuideGfx.x : null,
    trainX: typeof TRAIN_X !== 'undefined' ? TRAIN_X : null,
    guideY: typeof hitGuideGfx !== 'undefined' && hitGuideGfx ? Math.round(hitGuideGfx.y) : null,
    trainY: Math.round(trainContainer.y),
    halfW: typeof HIT_HALF_W !== 'undefined' ? HIT_HALF_W : null,
    halfH: typeof HIT_HALF_H !== 'undefined' ? HIT_HALF_H : null,
    trainLen: typeof g15TrainLenPx !== 'undefined' ? g15TrainLenPx : null,
    guideW: typeof hitGuideGfx !== 'undefined' && hitGuideGfx ? Math.round(hitGuideGfx.getLocalBounds().width) : null,
    isChar: !!(selectedTrain && selectedTrain.isCharacter),
  }))

  check(geom.hasGuide, 'the hit guide exists once the train is mounted')
  check(geom.guideX === geom.trainX, `the guide sits on the collider's x (${geom.guideX} vs TRAIN_X ${geom.trainX})`)
  check(Math.abs(geom.guideY - geom.trainY) <= 1, `the guide sits on the train's y (${geom.guideY} vs ${geom.trainY})`)
  check(geom.guideW >= geom.halfW * 2 && geom.guideW <= geom.halfW * 2 + 8,
    `the guide is drawn at the collider's real width (${geom.guideW}px for a ${geom.halfW * 2}px collider)`)
  check(geom.trainLen > 0, `the train's rendered length was measured (${geom.trainLen}px)`)
  check(geom.isChar && geom.trainLen > geom.halfW * 2,
    `this is the case the owner hit: the art (${geom.trainLen}px) is longer than the collider (${geom.halfW * 2}px)`)

  // the guide must FOLLOW the train, not sit at a fixed lane
  const follow = await page.evaluate(async () => {
    const before = { lane: playerLane, guide: hitGuideGfx.y, train: trainContainer.y }
    playerLane = (playerLane + 1) % 3
    await new Promise(r => setTimeout(r, 2000))   // let the lane tween settle
    return { before, after: { lane: playerLane, guide: hitGuideGfx.y, train: trainContainer.y } }
  })
  check(Math.abs(follow.after.guide - follow.after.train) <= 1 && follow.after.guide !== follow.before.guide,
    `the guide follows a lane change (y ${Math.round(follow.before.guide)} -> ${Math.round(follow.after.guide)})`)

  // Spacing has two halves: the RULE and the stream.
  //
  // The rule is exact and framerate-independent -- a wave travels
  // gameSpeed * dt px per frame and the next wave is spawnInterval() dt-units
  // later, so their separation is exactly spawnInterval() * gameSpeed px. That
  // is asserted directly, at the real speeds of several levels.
  //
  // The stream is then sampled as a sanity check, but it cannot carry the test:
  // headless swiftshader renders this scene at ~4fps, so 90s of wall clock is
  // only a couple of hundred frames and a handful of waves.
  const rule = await page.evaluate(() => {
    const out = []
    for (const spd of [gameSpeed, 4, 6, 8]) {
      const prev = gameSpeed
      gameSpeed = spd
      out.push({ speed: spd, gapPx: Math.round(_g15SpawnIntervalFrames() * spd) })
      gameSpeed = prev
    }
    return { rows: out, trainLen: g15TrainLenPx }
  })
  const floor = rule.trainLen + 90
  for (const r of rule.rows) {
    check(r.gapPx >= floor,
      `at speed ${r.speed} the gap between waves is ${r.gapPx}px, holding a ${rule.trainLen}px train plus clearance (${Math.round(floor)}px)`)
  }

  const seenWaves = await page.evaluate(async () => {
    const seen = new Map()
    const t0 = performance.now()
    while (seen.size < 6 && performance.now() - t0 < 45000) {
      for (const b of letterBoxes) if (!seen.has(b)) seen.set(b, Math.round(b.container.x))
      await new Promise(r => requestAnimationFrame(r))
    }
    const xs = [...new Set(seen.values())].sort((a, b) => b - a)
    const waves = []
    for (const x of xs) { if (!waves.length || waves[waves.length - 1] - x > 8) waves.push(x) }
    const d = []
    for (let i = 1; i < waves.length; i++) d.push(waves[i - 1] - waves[i])
    return { boxes: seen.size, waves: waves.length, min: d.length ? Math.min(...d) : null }
  })
  check(seenWaves.boxes > 0, `boxes actually spawn during a run (${seenWaves.boxes})`)
  if (seenWaves.min !== null) {
    check(seenWaves.min >= floor * 0.9,
      `observed wave gap ${seenWaves.min}px is at least the floor (${Math.round(floor)}px)`)
  } else {
    console.log(`SKIP  only ${seenWaves.waves} wave(s) rendered in 45s at headless framerate; the rule check above covers spacing`)
  }
  check(errors.length === 0, `no page errors during the run (${errors[0] || 'none'})`)

  await page.screenshot({ path: 'tools/qa-out/g15-hitguide.png' })
  await page.close()
  // ── the side racer carries the same gap, so it carries the same guide ────
  {
    const page = await browser.newPage()
    const cdp = await page.createCDPSession()
    await cdp.send('Network.setBypassServiceWorker', { bypass: true })
    const errors = []
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 140)))
    await page.setViewport({ width: 1100, height: 700 })
    await page.goto((process.env.QA_BASE || 'http://localhost:8081') + '/games/balapan-kereta-side.html',
      { waitUntil: 'domcontentloaded', timeout: 45000 })
    await sleep(7000)
    // dismiss the tutorial the way a child does, then let the race run
    for (let i = 0; i < 8; i++) {
      const more = await page.evaluate(() => {
        const ov = document.getElementById('tutorial-overlay')
        if (!ov || !ov.classList.contains('show')) return false
        const b = [...ov.querySelectorAll('button')].pop()
        if (b) { b.click(); return true }
        return false
      })
      if (!more) break
      await sleep(600)
    }
    await page.evaluate(() => { if (typeof S !== 'undefined' && !S.running && !S.gameOver) { S.paused = false; S.running = true } })
    // the guide is drawn from the tick, and this page runs at a few frames per
    // second under swiftshader -- wait for the first draw rather than guessing
    await page.waitForFunction(() => typeof hitGuideGfx !== 'undefined' && !!hitGuideGfx, { timeout: 25000 }).catch(() => {})
    await sleep(800)
    const g = await page.evaluate(() => ({
      exists: typeof hitGuideGfx !== 'undefined' && !!hitGuideGfx,
      half: typeof HIT_HALF_X !== 'undefined' ? HIT_HALF_X : null,
      bounds: (typeof hitGuideGfx !== 'undefined' && hitGuideGfx) ? Math.round(hitGuideGfx.getBounds().width) : null,
      trainX: Math.round(trainContainer.x),
      centre: (typeof hitGuideGfx !== 'undefined' && hitGuideGfx) ? Math.round(hitGuideGfx.getBounds().x + hitGuideGfx.getBounds().width / 2) : null,
    }))
    check(g.exists, 'the side racer draws its hit window once the race runs')
    check(g.half === 50, `it is drawn from the same constant the collision uses (${g.half})`)
    check(g.bounds !== null && Math.abs(g.bounds - g.half * 2) <= 4, `the band is the collider's real width (${g.bounds}px for ±${g.half})`)
    check(g.centre !== null && Math.abs(g.centre - g.trainX) <= 2, `and centred on the train (${g.centre} vs ${g.trainX})`)
    check(errors.length === 0, `no page errors while it runs (${errors[0] || 'none'})`)
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
