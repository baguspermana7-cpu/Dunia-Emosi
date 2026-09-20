// Freeze hunt for Batwheels Gotham Getaway.
//
// The owner reported the game frozen mid-play on the live site. This plays it
// the way he did -- a chosen hero, villain and city, then LevelSelect's own
// play path into the race -- and watches for the picture to stop while the page
// stays alive, which is the shape of the freeze.
//
// It needs the page's `window.__gg` seam: synthetic clicks never reach the
// bundle's buttons, and forcing scene.start('Game') skips the LevelSelect step
// that builds runSettings (Spine then dies on a null skeleton -- a freeze the
// probe caused, not the one being hunted).
import puppeteer from 'puppeteer'
import crypto from 'crypto'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const URL = `${BASE}/games/film/batwheels-gotham-getaway/index.html`
const SECS = +(process.env.SECS || 70)
// This freeze is INTERMITTENT: the same combination froze at 8s in one run and
// played 60s clean in the next. One pass therefore proves nothing either way,
// so RUNS repeats each combination and the summary reports a RATE.
const RUNS = +(process.env.RUNS || 1)
const COMBOS = process.env.GG ? [JSON.parse(process.env.GG)] : [
  { hero: 'bam', villain: 'prank', city: 'funstreet' },        // the shipped pairing
  { hero: 'bam', villain: 'quizz', city: 'frozenstreet' },     // the owner's screenshot
  { hero: 'buff', villain: 'ducky', city: 'citysky' },         // cross pair + villain FX
  { hero: 'redbird', villain: 'snowy', city: 'docks' },        // cross pair, other way
]
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})

const tally = new Map()
try {
  for (const cfg of COMBOS) for (let run = 1; run <= RUNS; run++) {
    const page = await browser.newPage()
    const cdp = await page.createCDPSession()
    await cdp.send('Network.setBypassServiceWorker', { bypass: true })
    const errors = [], missing = []
    // keep the STACK, not just the message: "isGLTexture of null" says what
    // broke but not where, and this freeze is intermittent enough that a second
    // reproduction cannot be counted on
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 150) +
      (e.stack ? '\n      ' + String(e.stack).split('\n').slice(1, 5).join('\n      ') : '')))
    // Network failures are covered by the response listener below with their
    // URL attached; the console's bare "Failed to load resource" carries none,
    // and its only source here is the favicon.
    page.on('console', m => { const t = m.text()
      if (m.type() === 'error' && !/favicon|Failed to load resource/.test(t)) errors.push(t.slice(0, 150)) })
    page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) missing.push(r.status() + ' ' + r.url().split('/').slice(-2).join('/')) })
    await page.setViewport({ width: 1000, height: 560 })
    // GG=none runs the game EXACTLY as shipped, with no composition at all.
    // That is the control: if the freeze happens there too, it is not ours.
    if (cfg.hero !== 'none') {
      await page.evaluateOnNewDocument(c => sessionStorage.setItem('gg_custom', JSON.stringify(c)), cfg)
    }
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })

    const combo = `${cfg.hero}/${cfg.villain}@${cfg.city}`
    const tag = RUNS > 1 ? `${combo} #${run}` : combo
    if (!tally.has(combo)) tally.set(combo, { runs: 0, frozen: 0, errored: 0 })
    const t = tally.get(combo)
    t.runs++
    // Title first: it waits for its own play button, so emit what that button
    // emits rather than guessing where it sits on a scaled canvas.
    await page.waitForFunction(() => window.__gg && window.__gg.activeScenes().includes('Title'), { timeout: 60000 }).catch(() => {})
    await sleep(2500)
    const titled = await page.evaluate(() => window.__gg.pressTitlePlay())
    // Title -> Intro (a cutscene) -> LevelSelect. Skip the cutscene the way its
    // own button does, retrying while the transition scene is still in front.
    for (let i = 0; i < 20; i++) {
      const scenes = await page.evaluate(() => window.__gg.activeScenes())
      if (scenes.includes('LevelSelect')) break
      if (scenes.includes('Intro')) await page.evaluate(() => window.__gg.skipIntro())
      await sleep(1500)
    }
    const reached = await page.evaluate(() => window.__gg ? window.__gg.activeScenes() : [])
    check(reached.includes('LevelSelect'), `${tag}: reaches LevelSelect (${reached.join(',') || 'none'})`)

    const started = await page.evaluate(() => window.__gg.playLevel(0))
    await page.waitForFunction(() => window.__gg.activeScenes().includes('Game'), { timeout: 45000 }).catch(() => {})
    await sleep(6000)
    const composed = await page.evaluate(() => window.__ggComposed || null)
    check(started === 'ok' && (await page.evaluate(() => window.__gg.activeScenes().includes('Game'))),
      `${tag}: the race starts from LevelSelect's own play path (${started})`)
    if (composed && cfg.hero !== 'none') {
      check(composed.jadi.hero === cfg.hero && composed.jadi.villain === cfg.villain,
        `${tag}: composed the pair that was asked for (${composed.jadi.hero}/${composed.jadi.villain})`)
    }

    // play, and watch the picture
    const hashes = []
    let lastNew = 0, frozenAt = null
    for (let i = 0; i < SECS / 2; i++) {
      try { await page.mouse.click(500, 330); await page.keyboard.press('Space') } catch (_) {}
      const h = crypto.createHash('md5').update(await page.screenshot({ encoding: 'binary' })).digest('hex').slice(0, 10)
      if (!hashes.length || hashes[hashes.length - 1] !== h) lastNew = i
      hashes.push(h)
      if (i - lastNew >= 4) { frozenAt = i * 2; break }
      await sleep(2000)
    }
    const alive = await page.evaluate(async () => {
      const t0 = performance.now()
      await new Promise(r => setTimeout(r, 200))
      return Math.round(performance.now() - t0 - 200)
    })
    check(frozenAt === null,
      `${tag}: the picture keeps moving for ${SECS}s (${new Set(hashes).size}/${hashes.length} distinct frames${frozenAt !== null ? `, froze at ${frozenAt}s` : ''})`)
    if (frozenAt !== null) t.frozen++
    if (errors.length) t.errored++
    check(errors.length === 0, `${tag}: no errors while racing${errors.length ? ' — ' + errors[0] : ''}`)
    if (errors.length > 1) console.log('      (+' + (errors.length - 1) + ' more)')
    check(missing.length === 0, `${tag}: every asset the race asked for loaded${missing.length ? ' — ' + [...new Set(missing)][0] : ''}`)
    if (frozenAt !== null || errors.length) {
      await page.screenshot({ path: `tools/qa-out/gg-freeze-${cfg.hero}-${cfg.villain}-${cfg.city}.png` })
    }
    await page.close()
  }
} finally {
  await browser.close()
}

if (RUNS > 1) {
  console.log('\n── freeze rate ──')
  for (const [combo, t] of tally) {
    console.log(`   ${combo}: froze ${t.frozen}/${t.runs}, errored ${t.errored}/${t.runs}`)
  }
}
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
