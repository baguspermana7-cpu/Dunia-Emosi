// Gate for Task #44, a P0 that shipped once already: the result modal told a
// child "Sempurna! Tidak ada kesalahan!" over ONE star and zero correct
// answers, and offered "Level Berikutnya" anyway.
//
// The fix lives in games/game-modal.js and is shared by every game, so a
// careless edit there re-breaks all of them at once. This asserts the rules
// directly against the shipped module:
//   0 stars  -> failure title, failure tone, no way forward
//   1-2 stars-> success wording is downgraded, still no way forward
//   3+ stars -> "Sempurna" is only allowed at the top, and Next appears
import puppeteer from 'puppeteer'

const URL = (process.env.QA_BASE || 'http://localhost:8081') + '/games/mobil.html'
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }
const sleep = ms => new Promise(r => setTimeout(r, ms))

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
  await page.waitForFunction(() => typeof GameModal !== 'undefined' && GameModal.show, { timeout: 25000 })

  const shout = { title: 'Sempurna!', msg: 'Tidak ada kesalahan! 100% benar semua!' }
  const read = async (stars, withNext) => {
    await page.evaluate((stars, shout, withNext) => {
      const ov = document.getElementById('gm-overlay'); if (ov) ov.classList.remove('show')
      GameModal.show(Object.assign({ stars, emoji: '🏆' }, shout, withNext ? { onNext: () => {} } : {}))
    }, stars, shout, withNext)
    await sleep(250)
    return page.evaluate(() => ({
      title: (document.getElementById('gm-title') || {}).textContent || '',
      msg: (document.getElementById('gm-msg') || {}).textContent || '',
      buttons: [...document.querySelectorAll('#gm-btns button')].map(b => b.textContent.trim()),
    }))
  }
  const brag = /sempurna|tidak ada kesalahan|100%|benar semua|luar biasa/i
  const next = b => b.some(t => /berikutnya/i.test(t))

  const zero = await read(0, true)
  check(!brag.test(zero.title) && !brag.test(zero.msg),
    `0 stars does not congratulate ("${zero.title}" / "${zero.msg.slice(0, 34)}")`)
  check(/gagal|coba lagi/i.test(zero.title), `0 stars says what happened ("${zero.title}")`)
  check(!next(zero.buttons), `0 stars offers no way forward (${zero.buttons.join(', ') || 'none'})`)

  for (const s of [1, 2]) {
    const r = await read(s, true)
    check(!brag.test(r.title) && !brag.test(r.msg),
      `${s} star${s > 1 ? 's' : ''} downgrades the boasting ("${r.title}" / "${r.msg.slice(0, 30)}")`)
    check(!next(r.buttons), `${s} star${s > 1 ? 's' : ''} still offers no Level Berikutnya`)
  }

  const three = await read(3, true)
  check(!/sempurna/i.test(three.title), `3 stars is not "Sempurna" ("${three.title}")`)
  check(next(three.buttons), '3 stars unlocks Level Berikutnya')

  const five = await read(5, true)
  check(next(five.buttons), '5 stars unlocks Level Berikutnya')
  check(five.title.length > 0, `5 stars keeps a title ("${five.title}")`)

  const noCb = await read(5, false)
  check(!next(noCb.buttons), 'a game that passes no onNext never gets the button, whatever the stars')

  await page.close()
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
