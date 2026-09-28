// World-map stars for the STANDALONE games (G27 Spelling, G28 Stinky & Dirty,
// G29 Garasi Tempur, G30 Timmy & Kapal) and the per-avatar split behind them.
//
// Why it exists: the map filled its star labels from a HARDCODED id list that
// predated every standalone game, read only the in-app `best-stars` store, and
// was never run by the landing "PILIH GAME" button at all — so a child could
// finish every level of G27-G30 and the map node stayed empty. G28-G30 also
// wrote a bare numeric progress row ('28') instead of the app's 'g28'.
//
// Asserts, through the real pages and the app's own storage format:
//   1. each game's save lands in the ACTIVE avatar's progress row 'g<id>'
//      (G27 via its own store mirror, G30 via its real level-finish path)
//   2. the map shows those stars on each node and in the zone totals, when the
//      map is reached the way a child reaches it (landing -> PILIH GAME)
//   3. a second avatar sees an empty map; switching back restores the first
//   4. a legacy numeric row ('30') still counts on the map
//   5. the session hand-off marker a game leaves is consumed on return
import puppeteer from 'puppeteer'
import fs from 'node:fs'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

// static: the standalone games must name their row the way the app does
{
  const sd = fs.readFileSync('games/stinky-dirty.js', 'utf8'), gt = fs.readFileSync('games/garasi-tempur.js', 'utf8'),
    g27 = fs.readFileSync('games/ejaan-inggris.js', 'utf8'), tk = fs.readFileSync('games/timmy-kapal.js', 'utf8')
  check(/saveLevelProgress\('g28'/.test(sd), "G28 saves to progress row 'g28'")
  check(/GAME_ID = 'g29'/.test(gt), "G29 saves to progress row 'g29'")
  check(/saveLevelProgress\('g27'/.test(g27), "G27 mirrors its word stars to progress row 'g27'")
  const tkId = (tk.match(/GAME_ID = ([^,\s]+)/) || [])[1]
  console.log(`INFO  G30 GAME_ID = ${tkId}${tkId === "'g30'" ? '' : "  (should be 'g30'; the map also reads the numeric row)"}`)
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage()
const cdp = await page.createCDPSession()
await cdp.send('Network.setBypassServiceWorker', { bypass: true })
await page.setViewport({ width: 1100, height: 760 })
const errs = []
page.on('pageerror', e => errs.push(page.url().split('/').pop() + ': ' + e.message))

const go = async (path, ready) => {
  for (let k = 0; k < 3; k++) {
    try { await page.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break } catch (e) { await sleep(1500) }
  }
  if (ready) await page.waitForFunction(ready, { timeout: 30000 }).catch(() => {})
  await sleep(800)
}
const setAvatar = slot => page.evaluate(s => {
  localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Singa', animal: '🦁', stars: 0, ageTier: 'tumbuh' }, { name: 'Kelinci', animal: '🐰', stars: 0, ageTier: 'tumbuh' }]))
  localStorage.setItem('dunia-active-slot', JSON.stringify([s, 1]))
}, slot)
const progress = av => page.evaluate(a => JSON.parse(localStorage.getItem(`dunia-avatar-${a}-progress`) || '{}'), av)
// reach the map the way a child does: landing screen -> PILIH GAME
const openMap = async () => {
  await go('index.html', () => typeof window.renderWorldMapStars === 'function' && document.querySelector('#screen-welcome'))
  await page.evaluate(() => { const b = [...document.querySelectorAll('.home-btn')].find(x => /pilih game/i.test(x.textContent)); if (b) b.click() })
  await sleep(700)
  return page.evaluate(() => {
    // the UI-sprite resolver swaps each ⭐ for an <img class="emoji-sprite">: read both forms
    const txt = el => el ? [...el.childNodes].map(n => n.nodeType === 3 ? n.nodeValue : (n.classList && n.classList.contains('emoji-sprite') ? '⭐' : n.textContent)).join('') : ''
    const lbl = id => txt(document.getElementById(`gstars-${id}-lbl`))
    const zone = z => txt(document.getElementById(`gstars-zone-${z}`))
    return { menu: !!document.querySelector('#screen-menu.active'), g27: lbl(27), g28: lbl(28), g29: lbl(29), g30: lbl(30),
      huruf: zone('huruf'), mobil: zone('mobil'), marker: Object.keys(sessionStorage).filter(k => /^g?(2[3-9]|30)Result$/.test(k)) }
  })
}

try {
  await go('index.html')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await setAvatar(0)

  // ---- child A (lion) plays G27: stars already in its own store are mirrored on load
  await go('games/ejaan-inggris.html', () => window.SpellingData && typeof window.saveLevelProgress === 'function')
  const words = await page.evaluate(() => [SpellingData.WORDS[0].w, SpellingData.WORDS[1].w])
  await page.evaluate(w => localStorage.setItem('dunia-avatar-lion-g27-spelling', JSON.stringify({ stars: { [w[0]]: 3, [w[1]]: 2 }, opt: {} })), words)
  await go('games/ejaan-inggris.html', () => window.SpellingData)
  let pl = await progress('lion')
  check(pl.g27 && pl.g27.stars[1] === 3 && pl.g27.stars[2] === 2, `G27: the word stars reach lion's progress row g27 (${JSON.stringify(pl.g27 && pl.g27.stars)})`)

  // ---- G30: finish the first level through the game's own finish path
  await go('games/timmy-kapal.html', () => window.__tk && window.TKWorlds)
  const tkr = await page.evaluate(() => { const w = TKWorlds.WORLDS[0].id; __tk.start(w, 0); return new Promise(r => setTimeout(() => { try { __tk.finish(3); r('ok') } catch (e) { r(String(e)) } }, 900)) })
  await sleep(900)
  pl = await progress('lion')
  const tkRow = pl.g30 || pl['30']
  check(tkr === 'ok' && tkRow && Object.values(tkRow.stars).includes(3), `G30: a finished level reaches lion's progress (${pl.g30 ? 'g30' : pl['30'] ? "numeric row '30'" : 'NONE'})`)

  // ---- G28 / G29: through the page's save engine with the ids the games use
  await go('games/stinky-dirty.html', () => typeof window.saveLevelProgress === 'function')
  await page.evaluate(() => saveLevelProgress('g28', 1, 2))
  await go('games/garasi-tempur.html', () => typeof window.saveLevelProgress === 'function')
  await page.evaluate(() => saveLevelProgress('g29', 2, 3))

  // ---- back to the map
  let m = await openMap()
  check(m.menu, 'PILIH GAME reaches the map')
  check(m.g27 === '⭐⭐⭐', `map node G27 shows its best (${m.g27 || 'empty'})`)
  check(m.g28 === '⭐⭐', `map node G28 shows its best (${m.g28 || 'empty'})`)
  check(m.g29 === '⭐⭐⭐', `map node G29 shows its best (${m.g29 || 'empty'})`)
  check(m.g30 === '⭐⭐⭐', `map node G30 shows its best (${m.g30 || 'empty'})`)
  check(m.huruf === '⭐ 7', `zone Huruf totals G27+G28 = 7 (${m.huruf})`)
  check(m.mobil === '⭐ 6', `zone Mobil totals G29+G30 = 6 (${m.mobil})`)
  check(m.marker.length === 0, `session result markers are consumed on return (${m.marker.join(',') || 'none left'})`)

  // ---- child B (rabbit) must see an empty map
  await setAvatar(1)
  m = await openMap()
  check(!m.g27 && !m.g28 && !m.g29 && !m.g30, `second avatar sees no stars (${[m.g27, m.g28, m.g29, m.g30].join('|')})`)
  check(m.huruf === '⭐' && m.mobil === '⭐', `second avatar's zone totals are empty (${m.huruf} / ${m.mobil})`)
  await go('games/garasi-tempur.html', () => typeof window.saveLevelProgress === 'function')
  await page.evaluate(() => saveLevelProgress('g29', 1, 1))
  check(!(await progress('lion')).g29.stars[1], 'a save by avatar B does not land in avatar A')

  // ---- switch back to A
  await setAvatar(0)
  m = await openMap()
  check(m.g29 === '⭐⭐⭐' && m.g27 === '⭐⭐⭐', `switching back restores avatar A's map (${m.g27} / ${m.g29})`)

  // ---- a legacy numeric row still counts
  await page.evaluate(() => { const k = 'dunia-avatar-lion-progress', p = JSON.parse(localStorage.getItem(k)); delete p.g30; p['30'] = { completed: [1], stars: { 1: 2 } }; localStorage.setItem(k, JSON.stringify(p)) })
  m = await openMap()
  check(m.g30 === '⭐⭐', `a legacy numeric row '30' still shows on the map (${m.g30 || 'empty'})`)

  check(errs.length === 0, `no page errors${errs.length ? ' — ' + errs.slice(0, 4).join(' | ') : ''}`)
} finally {
  await browser.close()
}
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
