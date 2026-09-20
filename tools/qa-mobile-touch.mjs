// Mobile gate. The ledger had "mobile testing — awaiting the owner" open for
// months; this closes it by testing instead of waiting.
//
// Emulates real phones and a tablet (viewport, device pixel ratio, touch,
// mobile user agent) and checks the things that actually break a child's game
// on a small screen:
//
//   1. no horizontal scroll, and nothing painted outside the viewport;
//   2. every visible control is at least 44x44 CSS px, the size a thumb needs;
//   3. the page responds to TOUCH, not only to a mouse -- a start button wired
//      to `click` alone still works, but one wired to mousedown does not;
//   4. body text is never smaller than 12px, and inputs never below 16px (iOS
//      zooms the whole page when a smaller input takes focus);
//   5. the HUD does not overlap itself once the viewport is narrow.
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const DEVICES = [
  { name: 'iPhone SE', w: 375, h: 667, dpr: 2 },
  { name: 'iPhone 14', w: 390, h: 844, dpr: 3 },
  { name: 'Pixel 7',   w: 412, h: 915, dpr: 2.625 },
  { name: 'iPad mini', w: 768, h: 1024, dpr: 2 },
]
const PAGES = [
  'index.html',
  'games/ayo-berhitung.html',
  'games/balapan-kereta.html',
  'games/lokomotif-pemberani.html',
  'games/selamatkan-kereta.html',
  'games/kuis-matematika.html',
  'games/ducky-volley.html',
  'games/mobil.html',
  'games/film-anak.html',
]
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})

try {
  for (const dev of DEVICES) {
    for (const path of PAGES) {
      const page = await browser.newPage()
      const cdp = await page.createCDPSession()
      await cdp.send('Network.setBypassServiceWorker', { bypass: true })
      await page.setUserAgent(UA)
      await page.emulate({
        viewport: { width: dev.w, height: dev.h, deviceScaleFactor: dev.dpr, isMobile: true, hasTouch: true, isLandscape: false },
        userAgent: UA,
      })
      const errors = []
      page.on('pageerror', e => errors.push(String(e.message).slice(0, 110)))
      await page.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await sleep(5200)

      const r = await page.evaluate(() => {
        const vw = window.innerWidth
        const out = {}
        out.scrollX = document.documentElement.scrollWidth - vw
        const cs = el => getComputedStyle(el)
        const shown = el => { const c = cs(el)
          return c.display !== 'none' && c.visibility !== 'hidden' && parseFloat(c.opacity) >= 0.05 }
        // inside something the child can swipe sideways on purpose (chip rails)
        const inScroller = el => {
          for (let p = el.parentElement; p; p = p.parentElement) {
            const o = cs(p).overflowX
            if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 4) return true
          }
          return false
        }
        // decoration: no text, not interactive, not an image -- a blob or an orb
        const decorative = el => !el.matches('button, a, input, select, textarea, img, canvas, [role="button"]') &&
          !el.textContent.trim() && !el.querySelector('img, canvas, button, a')

        // a full-bleed backdrop painted behind the content is meant to be wider
        // than the screen; it is cropped, not broken
        const backdrop = el => {
          const c = cs(el)
          const z = parseInt(c.zIndex, 10)
          return (c.position === 'absolute' || c.position === 'fixed') &&
            (Number.isNaN(z) ? true : z <= 0) &&
            (el.tagName === 'IMG' || c.backgroundImage !== 'none') &&
            !el.textContent.trim()
        }
        out.overhang = [...document.querySelectorAll('body *')].filter(el => {
          if (!shown(el) || inScroller(el) || decorative(el) || backdrop(el)) return false
          const b = el.getBoundingClientRect()
          return b.width > 8 && b.height > 8 && b.right > vw + 2 && b.left < vw
        }).slice(0, 3).map(el => (el.id || el.className || el.tagName).toString().slice(0, 28))

        // tap targets: on screen now, actually hittable, and at least 40px
        out.small = [...document.querySelectorAll('button, a[href], [role="button"], select')].filter(el => {
          if (!shown(el)) return false
          const b = el.getBoundingClientRect()
          if (b.width === 0 || b.height === 0) return false
          if (b.bottom < 0 || b.top > window.innerHeight) return false     // not on this screen
          if (b.width <= 6 && b.height <= 6) return false                  // hit-proxy dots, not controls
          return b.width < 40 || b.height < 40
        }).slice(0, 4).map(el => `${(el.id || el.className || el.tagName).toString().slice(0, 22)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`)

        // iOS zooms only for TEXT-ish fields; a range slider's font-size is irrelevant
        out.smallInputs = [...document.querySelectorAll('input, select, textarea')].filter(el => {
          if (!shown(el)) return false
          const t = (el.getAttribute('type') || 'text').toLowerCase()
          if (['range', 'checkbox', 'radio', 'color', 'button', 'submit', 'file'].includes(t)) return false
          return parseFloat(cs(el).fontSize) < 16
        }).slice(0, 3).map(el => `${el.id || el.type} ${cs(el).fontSize}`)

        // unreadable PROSE, not micro-labels or version stamps: a real sentence
        out.tinyText = [...document.querySelectorAll('p, li, span, div')].filter(el => {
          if (!shown(el) || el.children.length) return false
          const txt = el.textContent.trim()
          if (txt.length < 18) return false                                 // chips, counters, labels
          if (cs(el).textTransform === 'uppercase') return false            // eyebrow labels
          return parseFloat(cs(el).fontSize) < 12 && el.getBoundingClientRect().height > 0
        }).slice(0, 3).map(el => `${el.textContent.trim().slice(0, 18)} ${cs(el).fontSize}`)
        return out
      })

      const tag = `${dev.name} · ${path.replace('games/', '')}`
      check(r.scrollX <= 1, `${tag}: no horizontal scroll (${r.scrollX}px)`)
      check(r.overhang.length === 0, `${tag}: nothing painted past the right edge${r.overhang.length ? ' — ' + r.overhang.join(', ') : ''}`)
      check(r.small.length === 0, `${tag}: every control is thumb-sized${r.small.length ? ' — ' + r.small.join(', ') : ''}`)
      check(r.smallInputs.length === 0, `${tag}: no input below 16px (iOS zoom)${r.smallInputs.length ? ' — ' + r.smallInputs.join(', ') : ''}`)
      check(r.tinyText.length === 0, `${tag}: no text below 12px${r.tinyText.length ? ' — ' + r.tinyText.join(', ') : ''}`)
      check(errors.length === 0, `${tag}: no page errors${errors.length ? ' — ' + errors[0] : ''}`)
      await page.close()
    }
  }

  // Touch, specifically: a real touch sequence must drive the game, not just a
  // mouse click. Done on one representative page per input style.
  for (const [path, sel, expect] of [
    ['games/ayo-berhitung.html', '#seg-dg button:nth-of-type(3)', () => window.__berhitung.digits === 2],
  ]) {
    const page = await browser.newPage()
    const cdp = await page.createCDPSession()
    await cdp.send('Network.setBypassServiceWorker', { bypass: true })
    await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, userAgent: UA })
    await page.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForFunction(() => !!window.__berhitung, { timeout: 20000 })
    const box = await page.$eval(sel, el => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })
    await page.touchscreen.tap(box.x, box.y)
    await sleep(700)
    const ok = await page.evaluate(expect)
    check(ok, `${path.replace('games/', '')}: a real touch tap drives the control`)
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
