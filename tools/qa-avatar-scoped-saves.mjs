// Level progress has been avatar-scoped for a long time, but several games kept
// per-CHILD collectibles under one global key. The museum was the clearest
// case: a passport, a "master" badge and a best-star record, all shared, so a
// second child opened it already holding the first child's collection and could
// never earn it themselves.
//
// This asserts the three things that matter, against the real page:
//   1. a second child does NOT inherit the first child's collectibles;
//   2. switching back returns the first child's collection intact;
//   3. data that already exists under the OLD global key is NOT lost — it
//      migrates to whoever is playing now, exactly once, and the global key is
//      then removed so the next child does not inherit it too.
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const URL = `${BASE}/games/museum-kereta.html`
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
  await sleep(5500)
  await page.waitForFunction(() => typeof window.avatarScopedGet === 'function', { timeout: 20000 })
}
const setAvatar = a => page.evaluate(av => {
  if (av === null) { localStorage.removeItem('dunia-players'); localStorage.removeItem('dunia-active-slot'); return }
  localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Uji', animal: av, stars: 0 }]))
  localStorage.setItem('dunia-active-slot', JSON.stringify([0, 1]))
}, a)
// write through the page's own helper, read back the same way
const collect = () => page.evaluate(() => { window.avatarScopedSet('dunia-g18-master', '1'); return window.avatarScopedGet('dunia-g18-master', null) })
const master = () => page.evaluate(() => window.avatarScopedGet('dunia-g18-master', null))
const rawKeys = () => page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('g18-master')).sort())

try {
  await goto()
  await page.evaluate(() => { try { localStorage.clear() } catch (_) {} })

  // ---- child A earns the museum badge --------------------------------------
  await setAvatar('🦁'); await goto()
  check(await collect() === '1', 'child A earns the museum badge')
  check((await rawKeys()).join() === 'dunia-avatar-lion-g18-master',
    `child A's badge is stored under their own key (${(await rawKeys()).join() || 'none'})`)

  // ---- child B must start empty --------------------------------------------
  await setAvatar('🐘'); await goto()
  check(await master() === null, `child B does NOT inherit the badge (${await master()})`)

  // ---- child A still has it -------------------------------------------------
  await setAvatar('🦁'); await goto()
  check(await master() === '1', `child A still has their badge (${await master()})`)

  // ---- migration: existing GLOBAL data must not be lost ---------------------
  await page.evaluate(() => { try { localStorage.clear() } catch (_) {} })
  await setAvatar('🦊')
  await page.evaluate(() => localStorage.setItem('dunia-g18-master', '1'))  // pre-fix install
  await goto()
  check(await master() === '1', 'a pre-existing global badge is NOT lost by the change')
  const after = await rawKeys()
  check(after.includes('dunia-avatar-fox-g18-master'), `it migrated to the child who was playing (${after.join() || 'none'})`)
  check(!after.includes('dunia-g18-master'), 'the old global key is removed, so the NEXT child does not inherit it')

  // ---- and the next child really does start empty --------------------------
  await setAvatar('🐼'); await goto()
  check(await master() === null, `the next child starts without it (${await master()})`)

  // ---- the one existing caller's key must NOT have moved --------------------
  // gym-pokemon has stored badges at dunia-avatar-<av>-g13c_badges since
  // Hotfix #115. The prefix normalisation added for the museum must not touch
  // it, or every child silently loses their gym badges.
  await page.evaluate(() => { try { localStorage.clear() } catch (_) {} })
  await setAvatar('\u{1F981}'); await goto()
  const gymKey = await page.evaluate(() => window.activeAvatarBadgeKey('g13c_badges'))
  check(gymKey === 'dunia-avatar-lion-g13c_badges', `gym-pokemon's badge key is unchanged (${gymKey})`)

  // ---- no avatar chosen: legacy behaviour, unchanged ------------------------
  await page.evaluate(() => { try { localStorage.clear() } catch (_) {} })
  await setAvatar(null); await goto()
  check(await collect() === '1', 'with no avatar chosen the badge still works')
  check((await rawKeys()).join() === 'dunia-g18-master',
    `with no avatar it uses the legacy global key unchanged (${(await rawKeys()).join() || 'none'})`)
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
