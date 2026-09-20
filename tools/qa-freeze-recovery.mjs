// Gate for the freeze recovery net (games/data/freeze-watchdog.js).
//
// The owner reported Gotham Getaway frozen mid-play on the live site. That
// class of freeze leaves no error and no rejection -- an exception inside an
// engine's update loop takes the requestAnimationFrame chain down and the page
// stays responsive with a dead picture, so the existing blocked-thread detector
// never fires.
//
// This proves the new net on the real pages, by actually killing the frames:
//   1. a page whose own rAF chain dies shows the recovery card;
//   2. the film player, whose game lives in a same-origin iframe, notices when
//      the GAME's frames die even though the player's own keep running;
//   3. frames that come back on their own take the card away again, so a slow
//      level load does not nag a child into reloading.
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})

async function open(path) {
  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  await page.setViewport({ width: 1280, height: 800 })
  await page.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  return page
}

try {
  // 1. a page's own frames stop
  {
    const page = await open('games/pokemon-birds.html')
    await sleep(11000)  // the watchdog arms 8s after load, then needs two strikes
    await page.evaluate(() => {
      // kill the frame chain the way a thrown callback does, without an error
      window.requestAnimationFrame = function () { return 0 }
    })
    await page.waitForSelector('#__freezeRecover', { timeout: 25000 }).catch(() => {})
    const shown = await page.evaluate(() => !!document.getElementById('__freezeRecover'))
    const logged = await page.evaluate(() => (window.freezeLog() || []).some(e => /render-stall/.test(e.type)))
    const buttons = await page.evaluate(() => [...document.querySelectorAll('#__freezeRecover button')].map(b => b.textContent))
    check(shown, 'a dead rAF chain raises the recovery card')
    check(logged, 'the stall is written to the freeze log')
    check(buttons.includes('Main Lagi'), `the card offers a way out (${buttons.join(', ') || 'none'})`)
    const note = await page.evaluate(() => {
      const el = document.getElementById('__freezeNote')
      return el ? el.textContent.trim() : ''
    })
    check(/catatan teknis/.test(note), `the card carries the evidence for a screenshot ("${note.slice(0, 60)}")`)
    await page.close()
  }

  // 2. the film player notices the GAME's frames dying, not its own
  {
    const page = await open('games/film-play.html?g=thomas-rail-muddle')
    await sleep(12000)
    const attached = await page.evaluate(() => {
      const f = document.getElementById('frame')
      return !!(f && f.contentWindow && f.contentWindow.document)
    })
    check(attached, 'the film player can see into its game frame')
    await page.evaluate(() => {
      const f = document.getElementById('frame')
      f.contentWindow.requestAnimationFrame = function () { return 0 }   // parent keeps ticking
    })
    await page.waitForSelector('#__freezeRecover', { timeout: 30000 }).catch(() => {})
    const shown = await page.evaluate(() => !!document.getElementById('__freezeRecover'))
    const kind = await page.evaluate(() => (window.freezeLog() || []).slice(-1)[0] || null)
    const home = await page.evaluate(() => [...document.querySelectorAll('#__freezeRecover button')].map(b => b.textContent))
    check(shown, 'a frozen game inside the iframe raises the card on the player page')
    check(kind && /render-stall-frame/.test(kind.type), `it is logged as a frame stall (${kind && kind.type})`)
    check(home.includes('Beranda'), `the film card also offers the hub (${home.join(', ') || 'none'})`)
    await page.close()
  }

  // 3. recovery, not nagging
  {
    const page = await open('games/pokemon-birds.html')
    await sleep(11000)
    await page.evaluate(() => {
      window.__realRaf = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = function () { return 0 }
    })
    await page.waitForSelector('#__freezeRecover', { timeout: 25000 }).catch(() => {})
    await page.evaluate(() => { window.requestAnimationFrame = window.__realRaf })
    await sleep(4000)
    const gone = await page.evaluate(() => !document.getElementById('__freezeRecover'))
    check(gone, 'the card disappears by itself once frames come back')
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
