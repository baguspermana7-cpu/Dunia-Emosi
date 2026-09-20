// Gate for the G13b legendary auto-attack pause guard (game.js, Task #62).
//
// A legendary battle arms a 14s setInterval that hits the player without waiting for
// a wrong answer. Two different flags mean "paused": g13bState.paused, which only the
// party picker sets, and state.paused, which the pause BUTTON sets. Guarding on the
// first alone let the legendary keep striking while the pause overlay was up.
//
// The probe captures the real interval callback out of g13bSpawnWild() (rather than
// re-implementing it) and fires it under each pause flag, counting actual hits.
import puppeteer from 'puppeteer'

const URL = process.env.QA_URL || 'http://localhost:8081/index.html'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await sleep(3000)

  const r = await page.evaluate(() => {
    const out = { armed: false, whilePauseOverlay: null, whilePicker: null, whileRunning: null, err: null }
    try {
      // capture the 14s legendary interval instead of letting it tick on wall clock
      const realSetInterval = window.setInterval.bind(window)
      let cb = null
      window.setInterval = (fn, ms) => { if (ms === 14000) { cb = fn; return 123456 } return realSetInterval(fn, ms) }

      // count real hits; stub only the presentation the spawner needs
      let hits = 0
      g13bWildHitsPlayer = (done) => { hits++; if (typeof done === 'function') done() }
      g13bUpdateHpBar = () => {}
      g13bNextQuestion = () => {}

      g13bState = Object.assign({}, g13bState, {
        phase: 'playing', locked: false, playerHp: 100, playerMaxHp: 100,
        isLegendary: true, legendaryIdx: 0, paused: false,
      })
      state.paused = false

      g13bSpawnWild()
      out.armed = typeof cb === 'function'
      if (!out.armed) return out

      // 1. pause overlay up -> no damage
      state.paused = true; g13bState.paused = false
      hits = 0; cb(); out.whilePauseOverlay = hits

      // 2. party picker open -> no damage
      state.paused = false; g13bState.paused = true
      hits = 0; cb(); out.whilePicker = hits

      // 3. running -> the legendary DOES strike (guard must not disarm the feature)
      state.paused = false; g13bState.paused = false; g13bState.locked = false
      hits = 0; cb(); out.whileRunning = hits
    } catch (e) { out.err = String(e && e.message || e) }
    return out
  })

  check(!r.err, `probe ran without throwing${r.err ? ' — ' + r.err : ''}`)
  check(r.armed, 'legendary battle armed its 14s auto-attack interval')
  check(r.whilePauseOverlay === 0, `no hit while the pause overlay is up (hits=${r.whilePauseOverlay})`)
  check(r.whilePicker === 0, `no hit while the party picker is open (hits=${r.whilePicker})`)
  check(r.whileRunning === 1, `legendary still strikes while running (hits=${r.whileRunning})`)

  await page.close()
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
