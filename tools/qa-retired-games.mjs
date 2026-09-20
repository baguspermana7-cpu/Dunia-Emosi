// Gate for the games retired on 2026-09-20 (1 Aku Merasa, 2 Napas Pelangi,
// 5 Cocokkan Emosi, 12 Tebak Bayangan) and the Pulau Emosi zone that held
// three of them.
//
// A half-removed game is worse than a live one: a tile that survives its init
// function opens a dead screen, and saved rows keyed by a removed game id keep
// inflating star totals forever. This asserts the removal is complete in the
// DOM, in the dispatch tables, and in every save store keyed by game id --
// including after a cloud merge puts an old row back.
import puppeteer from 'puppeteer'

const URL = process.env.QA_URL || 'http://localhost:8081/index.html'
const RETIRED = [1, 2, 5, 12]
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

try {
  const page = await browser.newPage()
  // The app force-reloads itself once when the service worker reports a new
  // version, which blanks the document mid-probe. Bypass the SW so the page
  // under test is the one served from disk and nothing reloads under us.
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  const errors = []
  page.on('pageerror', e => errors.push(String(e.message || e)))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR|Failed to load resource/i.test(m.text())) errors.push(m.text()) })

  // seed saved rows for the retired games the way an existing child profile has them
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('dunia-avatar-lion-progress', JSON.stringify({
      g1: { completed: [1, 2], stars: { 1: 3, 2: 2 } },
      g2: { completed: [1], stars: { 1: 3 } },
      g5: { completed: [1], stars: { 1: 1 } },
      g12: { completed: [1], stars: { 1: 5 } },
      g3: { completed: [1, 2, 3], stars: { 1: 3, 2: 3, 3: 2 } },
      g13: { completed: [4], stars: { 4: 5 } },
    }))
    localStorage.setItem('dunia-avatar-lion-best-stars', JSON.stringify({ 1: 6, 2: 3, 3: 8, 5: 2, 12: 5, 13: 5 }))
    localStorage.setItem('dunia-emosi-played-games', JSON.stringify({ 1: true, 2: true, 3: true, 5: true, 12: true, 13: true }))
    // pkey() derives the avatar slug from the player SLOTS, not from a stored
    // slug, so the profile has to look like a real one or the prune would read
    // the slot-0 fallback bucket and find nothing.
    const slots = Array(7).fill(null)
    slots[0] = { name: 'Uji', animal: '\uD83E\uDD81', stars: 12, ageTier: 'tumbuh' }
    localStorage.setItem('dunia-players', JSON.stringify(slots))
    localStorage.setItem('dunia-pslot', JSON.stringify([0, 0]))
  })

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  // Wait for the app to be READY rather than for a fixed delay: on a cold cache
  // this page pulls 200+ assets, and a fixed sleep once measured an empty DOM,
  // which makes every "the retired game is gone" check pass for the wrong reason.
  await page.waitForFunction(
    () => document.querySelectorAll('.wmap-zone').length > 0 && typeof pruneRetiredGameSaves === 'function',
    { timeout: 45000 })
  await sleep(800)

  const dom = await page.evaluate(retired => ({
    tiles: retired.filter(n => !!document.getElementById('gtile-' + n)),
    screens: retired.filter(n => !!document.getElementById('screen-game' + n)),
    emosiZone: !!document.querySelector('.wmap-zone--emosi'),
    emosiStars: !!document.getElementById('gstars-zone-emosi'),
    metaKeys: retired.filter(n => typeof GAME_META !== 'undefined' && GAME_META[n]),
    descKeys: retired.filter(n => typeof GAME_DESCS !== 'undefined' && GAME_DESCS[n]),
    zonesLeft: document.querySelectorAll('.wmap-zone').length,
    tilesLeft: document.querySelectorAll('.wmap-node').length,
  }), RETIRED)

  check(dom.tiles.length === 0, `no world-map tile for a retired game (found: ${dom.tiles.join(',') || 'none'})`)
  check(dom.screens.length === 0, `no game screen for a retired game (found: ${dom.screens.join(',') || 'none'})`)
  check(!dom.emosiZone && !dom.emosiStars, 'Pulau Emosi zone and its star total are gone')
  check(dom.metaKeys.length === 0, `GAME_META has no retired entry (found: ${dom.metaKeys.join(',') || 'none'})`)
  check(dom.descKeys.length === 0, `GAME_DESCS has no retired entry (found: ${dom.descKeys.join(',') || 'none'})`)
  check(dom.zonesLeft >= 7 && dom.tilesLeft >= 15, `the rest of the map is intact (${dom.zonesLeft} zones, ${dom.tilesLeft} tiles)`)

  // the save prune, run the way boot runs it
  const saves = await page.evaluate(retired => {
    window._pSlot = [0, 0]
    const pruned = pruneRetiredGameSaves()
    const prog = JSON.parse(localStorage.getItem('dunia-avatar-lion-progress') || '{}')
    const bs = JSON.parse(localStorage.getItem('dunia-avatar-lion-best-stars') || '{}')
    const played = JSON.parse(localStorage.getItem('dunia-emosi-played-games') || '{}')
    return {
      pruned,
      progLeft: retired.filter(n => prog['g' + n] !== undefined),
      bsLeft: retired.filter(n => bs[n] !== undefined),
      playedLeft: retired.filter(n => played[n] !== undefined),
      keptProg: ['g3', 'g13'].filter(k => prog[k] !== undefined),
      keptBs: [3, 13].filter(k => bs[k] !== undefined),
      idempotent: pruneRetiredGameSaves(),
    }
  }, RETIRED)

  check(saves.pruned === 12, `first prune removed all 12 seeded rows (removed ${saves.pruned})`)
  check(saves.progLeft.length === 0, `progress has no retired game left (found: ${saves.progLeft.join(',') || 'none'})`)
  check(saves.bsLeft.length === 0, `best-stars has no retired game left (found: ${saves.bsLeft.join(',') || 'none'})`)
  check(saves.playedLeft.length === 0, `played-games has no retired game left (found: ${saves.playedLeft.join(',') || 'none'})`)
  check(saves.keptProg.length === 2 && saves.keptBs.length === 2, 'progress for the games that remain is untouched')
  check(saves.idempotent === 0, `a second prune is a no-op (removed ${saves.idempotent})`)

  check(errors.length === 0, `no page errors after the removal (${errors.slice(0, 2).join(' | ') || 'none'})`)
  await page.close()
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
