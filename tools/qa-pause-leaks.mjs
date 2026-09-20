// Gate: nothing that can end a round may keep running behind the pause overlay.
//
// pauseGame() puts up a full-screen overlay and sets state.paused, but it only stops
// the handful of timers it knows about by name. Interval-driven meters and countdowns
// elsewhere in game.js kept ticking on wall clock, so a paused game could still fill
// G16's danger meter to 100 or run G17's 30s countdown to 0 and lose the round while
// the child was away from the screen.
//
// Each case captures the REAL interval callback (by intercepting setInterval around
// the game's own start function) and fires it with state.paused on and off.
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
    const out = {}
    const real = window.setInterval.bind(window)
    // run `start`, keeping every interval it arms as a callback we can fire by hand
    const capture = (start) => {
      const cbs = []
      window.setInterval = (fn, ms) => { cbs.push({ fn, ms }); return 0 }
      try { start() } finally { window.setInterval = real }
      return cbs
    }
    const read = (o, k) => o[k]

    // ── G16 danger meter + QTE needle
    g16State.running = true; g16State.danger = 0; g16State.needlePos = 50; g16State.needleDir = 1
    g16State.needleSpeed = g16State.needleSpeed || 2
    const g16 = capture(() => { g16StartDangerTimer(); g16StartPhase1() })
    const danger = g16.find(c => c.ms === 400 || c.ms === 600 || c.ms >= 300)
    const needle = g16.find(c => c.ms === 20)
    out.g16Armed = !!(danger && needle)
    if (out.g16Armed) {
      state.paused = true
      let d0 = g16State.danger, n0 = g16State.needlePos
      danger.fn(); needle.fn()
      out.g16DangerWhilePaused = g16State.danger - d0
      out.g16NeedleWhilePaused = g16State.needlePos - n0
      state.paused = false
      d0 = g16State.danger; n0 = g16State.needlePos
      danger.fn(); needle.fn()
      out.g16DangerWhileRunning = g16State.danger - d0
      out.g16NeedleWhileRunning = Math.abs(g16State.needlePos - n0)
    }
    g16State.running = false

    // ── G17 countdown
    g17State.running = true; g17State.timer = 30
    const g17 = capture(() => g17StartTimer())
    const tick = g17.find(c => c.ms === 1000)
    out.g17Armed = !!tick
    if (out.g17Armed) {
      state.paused = true
      const t0 = g17State.timer
      tick.fn(); tick.fn()
      out.g17DropWhilePaused = t0 - g17State.timer
      state.paused = false
      const t1 = g17State.timer
      tick.fn()
      out.g17DropWhileRunning = t1 - g17State.timer
    }
    g17State.running = false
    state.paused = false
    return out
  })

  check(r.g16Armed, 'G16 armed its danger + needle intervals')
  check(r.g16DangerWhilePaused === 0, `G16 danger does not rise while paused (rose ${r.g16DangerWhilePaused})`)
  check(r.g16NeedleWhilePaused === 0, `G16 QTE needle is frozen while paused (moved ${r.g16NeedleWhilePaused})`)
  check(r.g16DangerWhileRunning > 0, `G16 danger still rises while running (rose ${r.g16DangerWhileRunning})`)
  check(r.g16NeedleWhileRunning > 0, `G16 needle still moves while running (moved ${r.g16NeedleWhileRunning})`)
  check(r.g17Armed, 'G17 armed its 1s countdown')
  check(r.g17DropWhilePaused === 0, `G17 countdown does not drop while paused (dropped ${r.g17DropWhilePaused})`)
  check(r.g17DropWhileRunning === 1, `G17 countdown still drops while running (dropped ${r.g17DropWhileRunning})`)

  await page.close()
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
