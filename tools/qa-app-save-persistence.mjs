// The standalone games' save path is covered by qa-save-persistence. The MAIN
// APP is the bigger surface and was not covered at all: index.html is what a
// child opens first, and G3-G11 progress goes through game.js's own pkey() /
// saveProgress() / setLevelComplete(), not through save-engine.js.
//
// pkey() scopes to `dunia-avatar-<slug>-progress` and falls back to
// `dunia-<slot>-progress`, which is the same legacy key save-engine.js uses --
// so the two systems agree today. Nothing asserted that, and a drift between
// them would silently split a child's progress across two keys.
//
// Asserts, by writing through the app's OWN functions:
//   1. a completed level survives a reload
//   2. a second child does NOT see the first child's levels
//   3. switching back returns the first child's progress
//   4. the key the app writes matches the key save-engine.js would use
//   5. stars only ever improve -- a worse replay cannot erase a better score
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const URL = `${BASE}/index.html`
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage()
const cdp = await page.createCDPSession()
await cdp.send('Network.setBypassServiceWorker', { bypass: true })
await page.setViewport({ width: 1100, height: 720 })

const goto = async () => {
  let err = null
  for (const t of [45000, 120000]) {
    try { await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: t }); err = null; break }
    catch (e) { err = String(e.message).slice(0, 110) }
  }
  if (err) throw new Error('nav: ' + err)
  await sleep(6000)
  await page.waitForFunction(() => typeof window.setLevelComplete === 'function' && typeof window.loadProgress === 'function', { timeout: 25000 })
}
const setAvatar = a => page.evaluate(av => {
  if (av === null) { localStorage.removeItem('dunia-players'); localStorage.removeItem('dunia-active-slot'); return }
  localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Uji', animal: av, stars: 0 }]))
  localStorage.setItem('dunia-active-slot', JSON.stringify([0, 1]))
}, a)
const starsG3L1 = () => page.evaluate(() => {
  const p = window.loadProgress() || {}
  return (p.g3 && p.g3.stars && p.g3.stars[1]) || 0
})

try {
  await goto()
  await page.evaluate(() => { try { localStorage.clear() } catch (_) {} })

  // ---- child A clears a level ----------------------------------------------
  await setAvatar('\u{1F981}'); await goto()
  await page.evaluate(() => window.setLevelComplete(3, 1, 3))
  check(await starsG3L1() === 3, `child A clears G3 level 1 with 3 stars (${await starsG3L1()})`)

  await goto()
  check(await starsG3L1() === 3, `child A's progress SURVIVES a reload (${await starsG3L1()})`)

  // the app's key must be the one save-engine.js would also use
  const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.endsWith('-progress')).sort())
  check(keys.includes('dunia-avatar-lion-progress'),
    `the app writes the avatar-scoped key save-engine.js reads (${keys.join() || 'none'})`)

  // ---- child B must start clean --------------------------------------------
  await setAvatar('\u{1F418}'); await goto()
  check(await starsG3L1() === 0, `child B does NOT see child A's level (${await starsG3L1()})`)

  // ---- child A intact -------------------------------------------------------
  await setAvatar('\u{1F981}'); await goto()
  check(await starsG3L1() === 3, `child A's progress is intact after the switch (${await starsG3L1()})`)

  // ---- a worse replay must not erase a better score -------------------------
  await page.evaluate(() => window.setLevelComplete(3, 1, 1))
  check(await starsG3L1() === 3, `a 1-star replay does NOT erase the 3-star record (${await starsG3L1()})`)
  await goto()
  check(await starsG3L1() === 3, `and it still does not after a reload (${await starsG3L1()})`)
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
