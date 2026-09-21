// Gate for the G15 report "Karakter seperti ada bertumpuk" — the character
// train drawn on top of, or underneath, the HUD.
//
// Measured, not judged by eye: the train's rendered rectangle is mapped from
// the Pixi stage into page coordinates and compared with every HUD element's
// rectangle. Any real overlap is a defect, because both the train and the text
// become unreadable where they cross.
import puppeteer from 'puppeteer'

const URL = (process.env.QA_BASE || 'http://localhost:8081') + '/games/lokomotif-pemberani.html'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const VIEWPORTS = [
  { w: 1280, h: 800, tag: 'desktop' },
  { w: 390, h: 844, tag: 'phone' },
  { w: 844, h: 390, tag: 'phone-landscape' },
]

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage()
    const cdp = await page.createCDPSession()
    await cdp.send('Network.setBypassServiceWorker', { bypass: true })
    await page.setViewport({ width: vp.w, height: vp.h })
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForFunction(() => typeof initPixi === 'function' && typeof TRAIN_CATALOG !== 'undefined', { timeout: 30000 })
    await page.evaluate(() => {
      selectedTrain = TRAIN_CATALOG.find(t => String(t.key).startsWith('mex_')) ||
                      TRAIN_CATALOG.find(t => t.isCharacter) || TRAIN_CATALOG[0]
      const sel = document.getElementById('train-select'); if (sel) sel.style.display = 'none'
      return initPixi()
    })
    await page.waitForFunction(() => typeof gameRunning !== 'undefined' && gameRunning, { timeout: 30000 })
    await page.waitForFunction(() => typeof g15TrainLenPx !== 'undefined' && g15TrainLenPx > 60, { timeout: 20000 }).catch(() => {})
    await sleep(1500)

    const r = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      const cr = canvas.getBoundingClientRect()
      const sx = cr.width / app.screen.width, sy = cr.height / app.screen.height
      const b = trainContainer.getBounds()
      const train = { left: cr.left + b.x * sx, top: cr.top + b.y * sy,
                      right: cr.left + (b.x + b.width) * sx, bottom: cr.top + (b.y + b.height) * sy }
      const hudIds = ['hud-top', 'lives-hud', 'word-display', 'next-letter', 'ctrl-row', 'koleksi-btn', 'settings-btn']
      const hits = []
      for (const id of hudIds) {
        const el = document.getElementById(id)
        if (!el) continue
        const s = getComputedStyle(el)
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) continue
        const h = el.getBoundingClientRect()
        if (h.width < 4 || h.height < 4) continue
        const ox = Math.min(train.right, h.right) - Math.max(train.left, h.left)
        const oy = Math.min(train.bottom, h.bottom) - Math.max(train.top, h.top)
        if (ox > 2 && oy > 2) hits.push(`${id} ${Math.round(ox)}x${Math.round(oy)}px`)
      }
      // HUD against ITSELF. The first version of this gate only compared the
      // train with the HUD and passed, while the screenshot showed the real
      // defect: at phone width the top chips sit on top of each other.
      const boxes = []
      const seen = new Set()
      const collect = (sel) => {
        for (const el of document.querySelectorAll(sel)) {
          if (seen.has(el)) continue
          const s2 = getComputedStyle(el)
          if (s2.display === 'none' || s2.visibility === 'hidden' || parseFloat(s2.opacity) < 0.05) continue
          const rr = el.getBoundingClientRect()
          if (rr.width < 8 || rr.height < 8) continue
          if (rr.bottom < 0 || rr.top > window.innerHeight) continue
          seen.add(el)
          boxes.push({ id: el.id || el.className.toString().slice(0, 18), r: rr, el })
        }
      }
      // Sweep everything actually floating over the top of the screen, rather
      // than a hand-picked list: the first version whitelisted the HUD and
      // passed while a "Kata Hari Ini" banner — not on the list — sat on the
      // buttons in the screenshot. A gate that only looks where you point it
      // will always agree with you.
      collect('#hud-top > *')
      collect('#word-display > *')
      collect('#ctrl-row > *')
      for (const el of document.querySelectorAll('body *')) {
        if (seen.has(el)) continue
        const st = getComputedStyle(el)
        if (st.position !== 'fixed' && st.position !== 'absolute') continue
        if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) < 0.05) continue
        if (st.pointerEvents === 'none' && el.id === '') continue     // decorative washes
        const rr = el.getBoundingClientRect()
        if (rr.width < 24 || rr.height < 16) continue
        // full-bleed layers (the play canvas, the iris wash) are MEANT to sit
        // under the HUD; only chips and panels compete for the same space
        if (rr.width * rr.height > window.innerWidth * window.innerHeight * 0.5) continue
        if (rr.top > window.innerHeight * 0.45 || rr.bottom < 0) continue
        if (el.querySelector('canvas')) continue                      // the play area itself
        seen.add(el)
        boxes.push({ id: el.id || el.className.toString().slice(0, 18) || el.tagName, r: rr, el })
      }
      // A container that merely holds other sampled boxes is not a collision:
      // the HUD bar legitimately spans the row its own chips sit in.
      const isContainer = (x) => boxes.some(o => o !== x && x.el.contains(o.el))
      const selfHits = []
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b2 = boxes[j]
          if (a.el.contains(b2.el) || b2.el.contains(a.el)) continue
          if (isContainer(a) || isContainer(b2)) continue
          const ox = Math.min(a.r.right, b2.r.right) - Math.max(a.r.left, b2.r.left)
          const oy = Math.min(a.r.bottom, b2.r.bottom) - Math.max(a.r.top, b2.r.top)
          if (ox > 4 && oy > 4) selfHits.push(`${a.id}×${b2.id} ${Math.round(ox)}x${Math.round(oy)}px`)
        }
      }
      return { hits, selfHits: selfHits.slice(0, 5), boxes: boxes.length,
               train: { w: Math.round(train.right - train.left), h: Math.round(train.bottom - train.top),
               top: Math.round(train.top), bottom: Math.round(train.bottom) }, vpH: window.innerHeight }
    })

    check(r.train.w > 40 && r.train.h > 20, `${vp.tag}: the train is actually on screen (${r.train.w}x${r.train.h})`)
    check(r.hits.length === 0, `${vp.tag}: the train does not overlap the HUD${r.hits.length ? ' — ' + r.hits.join(', ') : ''}`)
    check(r.train.bottom <= r.vpH + 2, `${vp.tag}: the train is not cut off below the screen (bottom ${r.train.bottom} of ${r.vpH})`)
    check(r.boxes >= 4, `${vp.tag}: enough HUD pieces sampled to judge (${r.boxes})`)
    check(r.selfHits.length === 0, `${vp.tag}: HUD pieces do not stack on each other${r.selfHits.length ? ' — ' + r.selfHits.join(', ') : ''}`)
    await page.screenshot({ path: `tools/qa-out/g15-hud-${vp.tag}.png` })
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
