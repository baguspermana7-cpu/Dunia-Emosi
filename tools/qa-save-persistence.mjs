// The owner's standing requirement: "Pertimvangkan semua engine termsuk salah
// satunya scoring save dll". Nothing tested it. Stars that do not survive a
// reload are the worst kind of bug in a child's game -- silent, and it destroys
// exactly the thing the child was working for.
//
// games/data/save-engine.js keys progress by the ACTIVE AVATAR
// (`dunia-avatar-<slug>-progress`), falling back to a legacy global key
// (`dunia-0-progress`) when no avatar is chosen. That is two code paths plus a
// switch between them, and a mismatch between the write key and the read key
// loses everything without an error.
//
// Asserts, by earning real stars through the game's own code:
//   1. with an avatar chosen: stars survive a reload
//   2. with NO avatar (legacy path): stars survive a reload
//   3. switching avatar does NOT show one child another child's progress
//   4. switching back returns the first child's progress intact
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const URL = `${BASE}/games/kuis-matematika.html`
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
  await sleep(6500)
  await page.waitForFunction(() => typeof window.__g25 === 'object', { timeout: 20000 })
}
const setAvatar = animal => page.evaluate(a => {
  if (a === null) { localStorage.removeItem('dunia-players'); localStorage.removeItem('dunia-active-slot'); return null }
  localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Uji', animal: a, stars: 0 }]))
  localStorage.setItem('dunia-active-slot', JSON.stringify([0, 1]))
  return a
}, animal)
const earnLevel1 = async () => {
  await page.evaluate(() => window.__g25.startLevel(1))
  await sleep(1800)
  await page.evaluate(() => window.__g25.finishWin())
  await sleep(1800)
}
const read = () => page.evaluate(() => ({ stars: window.__g25.starsOf(1), unlocked: window.__g25.maxUnlocked() }))

try {
  // ---- 1. avatar path -------------------------------------------------------
  await goto()
  await page.evaluate(() => { try { localStorage.clear() } catch (_) {} })
  await setAvatar('🦁')
  await goto()
  await earnLevel1()
  const beforeA = await read()
  check(beforeA.stars >= 1, `avatar: stars earned before reload (${beforeA.stars})`)
  await goto()
  const afterA = await read()
  check(afterA.stars === beforeA.stars, `avatar: stars SURVIVE a reload (${beforeA.stars} -> ${afterA.stars})`)
  check(afterA.unlocked >= 2, `avatar: the unlock survives a reload (maxUnlocked=${afterA.unlocked})`)

  // ---- 2. a different avatar must not inherit that progress ----------------
  await setAvatar('🐘')
  await goto()
  const other = await read()
  check(other.stars === 0, `a second child does NOT see the first child's stars (${other.stars})`)
  check(other.unlocked === 1, `a second child starts locked at level 1 (maxUnlocked=${other.unlocked})`)

  // ---- 3. switching back restores the first child --------------------------
  await setAvatar('🦁')
  await goto()
  const backA = await read()
  check(backA.stars === beforeA.stars, `switching back restores the first child's stars (${backA.stars})`)

  // ---- 4. legacy path: no avatar chosen ------------------------------------
  await page.evaluate(() => { try { localStorage.clear() } catch (_) {} })
  await setAvatar(null)
  await goto()
  const freshL = await read()
  check(freshL.stars === 0, `legacy: starts with no stars (${freshL.stars})`)
  await earnLevel1()
  const beforeL = await read()
  check(beforeL.stars >= 1, `legacy: stars earned before reload (${beforeL.stars})`)
  await goto()
  const afterL = await read()
  check(afterL.stars === beforeL.stars, `legacy: stars SURVIVE a reload (${beforeL.stars} -> ${afterL.stars})`)
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
