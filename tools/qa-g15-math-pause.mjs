// Gate for the math-quiz pause timer in games/lokomotif-pemberani.html (G15).
//
// The quiz length is NOT 8s. g15MathTimerSec() returns 14s (easy), 7-12s (medium)
// or 5-10s (hard). togglePause() used to do its remaining-time arithmetic against a
// hardcoded 8000, so the clock jumped on every pause: an easy quiz paused after 1.5s
// came back with 6.5s left instead of 12.5s (six seconds stolen), and a hard quiz
// paused near its end fell through `remaining || 8000` and came back with a fresh 8s.
// Measured against the pre-fix file: 6000ms and 1000ms of drift respectively.
//
// This probe drives the real page: it opens a quiz, pauses mid-question, and checks
// the remaining time against THAT run's length, then confirms no auto-fail fires
// while the game is paused.
import puppeteer from 'puppeteer'

const URL = process.env.QA_URL || 'http://localhost:8081/games/lokomotif-pemberani.html'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

// level -> the duration g15MathTimerSec() must produce for it
const CASES = [
  { level: 1, label: 'easy', expectSec: 14, pauseAfter: 1500 },
  { level: 20, label: 'hard', expectSec: 9, pauseAfter: 1000 },
]

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

try {
  for (const c of CASES) {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    // LEVEL is a const read from sessionStorage at load, so the level is chosen
    // the way the hub chooses it rather than poked in afterwards.
    await page.evaluateOnNewDocument(lvl => {
      sessionStorage.setItem('g15Config', JSON.stringify({ level: lvl }))
    }, c.level)
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await sleep(2500) // let the inline scripts define the globals

    const sec = await page.evaluate(() => g15MathTimerSec())
    check(sec === c.expectSec, `${c.label}: quiz length is ${sec}s (expected ${c.expectSec}s)`)

    // open a quiz for real, let it run, then pause
    await page.evaluate(() => { gameRunning = true; gamePaused = false; showMathQuiz() })
    await sleep(c.pauseAfter)
    const paused = await page.evaluate(() => {
      const t0 = performance.now() - _mathTimerStart
      togglePause()
      // typeof-guarded so a build WITHOUT the fix reports a failed check instead of
      // crashing the probe on an undefined binding.
      const total = (typeof _mathTimerTotal === 'number') ? _mathTimerTotal : null
      return { elapsed: t0, remaining: _mathTimerRemaining, total, active: mathQuizActive }
    })

    const want = sec * 1000 - paused.elapsed
    const drift = Math.abs(paused.remaining - want)
    check(paused.total === sec * 1000, `${c.label}: pause used this run's length (${paused.total}ms)`)
    check(drift < 250, `${c.label}: remaining ${Math.round(paused.remaining)}ms vs expected ${Math.round(want)}ms (drift ${Math.round(drift)}ms)`)

    // a paused quiz must not auto-fail, however long the pause lasts
    await sleep(Math.max(2000, sec * 1000 - c.pauseAfter + 500))
    const stillOpen = await page.evaluate(() => mathQuizActive)
    check(stillOpen, `${c.label}: quiz survived a pause longer than its own timer`)

    // resuming must hand back the remaining time, not restart and not instantly fail
    const resumed = await page.evaluate(() => { togglePause(); return { active: mathQuizActive, start: _mathTimerStart } })
    await sleep(300)
    const aliveAfterResume = await page.evaluate(() => mathQuizActive)
    check(resumed.active && aliveAfterResume, `${c.label}: quiz still open right after resume`)

    await page.close()
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
