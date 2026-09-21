// Gate for P6: "a perfect G13 run still shows 3 stars".
//
// The cause was a scoring rule that docked stars by ABSOLUTE evolution stage,
// so a Pokemon with no evolution — or a level that permits only one stage —
// capped a flawless run at three stars. The child was marked down for the
// roster, not for their play.
//
// g13EvoPenalty() now measures against what the pairing can actually reach.
// This drives the shipped function with the pairings that matter.
import puppeteer from 'puppeteer'

const URL = (process.env.QA_BASE || 'http://localhost:8081') + '/index.html'
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

try {
  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  await page.setViewport({ width: 900, height: 700 })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForFunction(() => typeof g13EvoPenalty === 'function' && typeof GameScoring !== 'undefined', { timeout: 25000 })

  // stars a flawless win would show for a given pairing and outcome
  const stars = (chain, stages, reached) => page.evaluate((chain, stages, reached) => {
    const s = { chain, cfg: { stages }, evolved: reached >= 1, evolved2: reached >= 2, megaForm: reached >= 3 }
    return GameScoring.calc({ correct: 1, total: 1, bonus: g13EvoPenalty(s) })
  }, chain, stages, reached)

  const NONE = {}, ONE = { evolved: {} }, FULL = { evolved: {}, evolved2: {}, mega: {} }

  check(await stars(NONE, 1, 0) === 5,
    'a Pokemon with no evolution at all scores 5 for a flawless win (was capped at 3)')
  check(await stars(ONE, 1, 1) === 5,
    'a one-evolution Pokemon that evolved scores 5 (was 4)')
  check(await stars(FULL, 1, 1) === 5,
    'a full chain on a level that only allows one stage scores 5 once that stage is taken (was 4)')
  check(await stars(ONE, 1, 0) === 4,
    'leaving the one available evolution unclaimed costs a star')
  check(await stars(FULL, 3, 3) === 5, 'taking all three stages scores 5')
  check(await stars(FULL, 3, 2) === 4, 'one stage short of a full chain costs one star')
  check(await stars(FULL, 3, 1) === 3, 'two short costs two')
  check(await stars(FULL, 3, 0) === 3, 'and the penalty floors at two, so a win never reads as a loss')

  // the fail rule still wins over everything
  const zero = await page.evaluate(() => GameScoring.calc({ correct: 0, total: 8, bonus: 0 }))
  check(zero === 0, 'zero correct answers is still zero stars, whatever the evolution')

  await page.close()
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
