// qa-modal-truth asserts that a result screen may not boast or offer a way
// forward that the player has not earned -- but it asserts it against
// games/game-modal.js, the SHARED module. kuis-matematika does not use it: it
// swaps to a hand-rolled result screen (#scr-hasil), so the rule had never
// been applied there, and it was broken.
//
// Measured 2026-09-22 before the fix: a round finished with zero correct
// answers showed three empty stars and the title "Coba Lagi!" (honest), and
// then offered "Lanjut" anyway -- while maxUnlocked() was still 1, so the
// button walked into a level the map shows as locked.
//
// Asserts, against a real level driven through the page's own code:
//   0 stars   -> no way forward, and nothing unlocked
//   3 stars   -> a way forward, and the next level really is unlocked
//   neither result screen boasts at a score that does not deserve it
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const BRAG = /sempurna|hebat|luar biasa|keren|mantap|bagus sekali|tanpa kesalahan|semua benar|100%/i

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
  await page.setViewport({ width: 1100, height: 720 })

  let navFailed = null
  for (const t of [45000, 120000]) {
    try { await page.goto(`${BASE}/games/kuis-matematika.html`, { waitUntil: 'domcontentloaded', timeout: t }); navFailed = null; break }
    catch (e) { navFailed = String(e.message).slice(0, 120) }
  }
  if (navFailed) { check(false, `page loads (${navFailed})`); throw new Error('nav') }
  await sleep(6500)

  await page.evaluate(() => { try { localStorage.clear() } catch (_) {} })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await sleep(6000)

  await page.waitForFunction(() => typeof window.__g25 === 'object', { timeout: 20000 })

  const readResult = () => page.evaluate(() => {
    const el = id => document.getElementById(id)
    const next = el('res-next')
    // Count the star SLOTS that are not the empty glyph, never the filled one:
    // the ZERO-EMOJI engine rewrites U+2B50 into an <img class="emoji-sprite">
    // a moment after the screen paints, so a glyph match races it and reported
    // three earned stars as zero (it passed once, then failed twice).
    const starEls = [...((el('res-stars') || {}).children || [])]
    return {
      title: ((el('res-title') || {}).textContent || '').trim(),
      screen: ((el('scr-hasil') || {}).className || ''),
      detail: ((el('res-detail') || {}).textContent || '').trim(),
      filledStars: starEls.filter(sp => !sp.textContent.includes('\u2606')).length,
      nextVisible: !!(next && next.offsetHeight > 0 && getComputedStyle(next).display !== 'none'),
      unlocked: window.__g25.maxUnlocked(),
    }
  })

  // ---- zero-star round: finished the pool, earned nothing -------------------
  await page.evaluate(() => window.__g25.startLevel(1))
  await sleep(1800)
  await page.evaluate(() => window.__g25.finishZero())
  await sleep(1800)
  const zero = await readResult()
  check(zero.screen.includes('active'), `zero-star round reaches the result screen (${zero.screen || 'none'})`)
  check(zero.filledStars === 0, `zero-star round shows no earned star (${zero.filledStars})`)
  check(!BRAG.test(zero.title), `zero-star round does not boast — "${zero.title}"`)
  check(zero.unlocked === 1, `zero-star round unlocks nothing (maxUnlocked=${zero.unlocked})`)
  check(zero.nextVisible === false, `zero-star round offers NO way forward (next visible=${zero.nextVisible})`)

  // ---- full round: earned the unlock ---------------------------------------
  await page.evaluate(() => window.__g25.startLevel(1))
  await sleep(1800)
  await page.evaluate(() => window.__g25.finishWin())
  await sleep(1800)
  const win = await readResult()
  check(win.filledStars >= 1, `full round shows earned stars (${win.filledStars})`)
  check(/Benar 0 /.test(win.detail) === false, `full round scores the answers — "${win.detail}"`)
  check(win.unlocked >= 2, `full round unlocks the next level (maxUnlocked=${win.unlocked})`)
  check(win.nextVisible === true, `full round DOES offer a way forward`)

  check(errors.length === 0, `no page errors${errors.length ? ' — ' + errors[0] : ''}`)
  await page.close()
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
