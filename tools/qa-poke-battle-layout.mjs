/* qa-poke-battle-layout.mjs — G10 "Pertarungan Pokémon" battle-screen layout gate.
 *
 * Owner bug (2026-10-06, Android tablet landscape ~1280x800): the arena was a
 * short strip (~30% of the screen) and the question floated in a huge black
 * empty panel. Root cause: .g10-field was a fixed `flex:0 0 46vh; max-height:400px`
 * band and .g10-qpanel carried a 10vh bottom padding, so on any screen taller
 * or wider than a phone the leftover height became dead black space.
 *
 * Boots index.html, opens screen-game10 mid-question, and per viewport asserts:
 *   - arena (#g10-field) height / viewport height >= 0.60 in landscape
 *     (>= 0.45 in portrait, where the question stack sits below)
 *   - arena covers the full viewport width
 *   - no dead dark area: a "dead row" is a sampled pixel row that is >=95%
 *     near-black; the largest contiguous run of dead rows must be <= 10% of
 *     the viewport height, and all dead rows together <= 20% (header chrome,
 *     status strip and panel padding are legitimately dark but thin)
 *   - 4 answer buttons visible, inside the viewport, each >= 56px tall
 *   - both sprites visible and >= 18% of the arena height
 *   - HP name text >= 13px
 * Screenshots → tools/qa-out/poke-battle-<w>x<h>.png. Exit 1 on any failure.
 */
import puppeteer from 'puppeteer'
import fs from 'fs'

const BASE = process.env.BASE || 'http://localhost:8081'
const OUT = new URL('./qa-out/', import.meta.url).pathname
fs.mkdirSync(OUT, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))

const VIEWS = [
  { w: 1280, h: 800 }, { w: 1024, h: 768 }, { w: 844, h: 390 },
  { w: 390, h: 844 }, { w: 800, h: 1280 }
]
const MIN_LANDSCAPE_RATIO = 0.60
const MIN_PORTRAIT_RATIO = 0.45
const MAX_DEAD_FRACTION = 0.10
const MAX_DEAD_TOTAL = 0.20
const MIN_BTN_H = 56

const failures = []
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader'] })

async function bootBattle (page) {
  await page.evaluateOnNewDocument(() => {
    try {
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        get: () => ({ register: () => Promise.reject(new Error('blocked')), addEventListener: () => {}, ready: Promise.resolve({}) })
      })
    } catch (_) {}
  })
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForFunction(() => typeof window.initGame10 === 'function' && typeof window.showScreen === 'function', { timeout: 20000 })
  const res = await page.evaluate(() => {
    try { window.speechSynthesis && (window.speechSynthesis.speak = () => {}) } catch (_) {}
    try { const l = document.getElementById('page-loader'); if (l) l.remove() } catch (_) {}
    window.state = window.state || {}
    Object.assign(window.state, {
      players: [{ animal: '🦊', name: 'Rara', stars: 0, ageTier: 'tumbuh' }, { animal: '🐼', name: 'Bimo', stars: 0, ageTier: 'tumbuh' }],
      currentPlayer: 0, mode: 'solo', selectedLevel: 'easy', selectedLevelNum: 3, gameStars: [0, 0], currentGame: 10
    })
    try { window.showScreen('screen-game10'); window.initGame10(); return { ok: true } } catch (e) { return { err: String(e) } }
  })
  if (res.err) throw new Error('boot: ' + res.err)
  await page.waitForFunction(() => document.querySelectorAll('#g10-choices button').length >= 4, { timeout: 15000 })
  // Wait for sprites to load (or give up) and slide-in animations to settle.
  await page.waitForFunction(() => ['g10-espr', 'g10-pspr'].every(id => { const i = document.getElementById(id); return i && i.complete && i.naturalWidth > 0 }), { timeout: 15000 }).catch(() => {})
  await sleep(1400)
  await page.evaluate(() => { try { const l = document.getElementById('page-loader'); if (l) l.remove() } catch (_) {} })
}

async function deadFraction (page, pngB64) {
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    const ROWS = 100; const COLS = 64
    let run = 0; let maxRun = 0; let total = 0
    for (let r = 0; r < ROWS; r++) {
      const y = Math.floor((r + 0.5) * c.height / ROWS)
      let dark = 0
      for (let k = 0; k < COLS; k++) {
        const x = Math.floor((k + 0.5) * c.width / COLS)
        const i = (y * c.width + x) * 4
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
        if (lum < 42) dark++
      }
      if (dark / COLS >= 0.95) { run++; total++; if (run > maxRun) maxRun = run } else run = 0
    }
    return { max: maxRun / ROWS, total: total / ROWS }
  }, pngB64)
}

for (const v of VIEWS) {
  const tag = `${v.w}x${v.h}`
  const landscape = v.w > v.h
  const page = await browser.newPage()
  await page.setViewport({ width: v.w, height: v.h, hasTouch: true, isMobile: v.w < 900 && v.h < 900 })
  const fail = m => { failures.push(`${tag}: ${m}`); console.log(`  ✗ ${tag}: ${m}`) }
  try {
    await bootBattle(page)
    const m = await page.evaluate(() => {
      const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height } }
      const vis = el => { if (!el) return false; const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 }
      return {
        field: r(document.getElementById('g10-field')),
        btns: [...document.querySelectorAll('#g10-choices button')].map(b => ({ ...r(b), vis: vis(b) })),
        espr: r(document.getElementById('g10-espr')),
        pspr: r(document.getElementById('g10-pspr')),
        nameFs: parseFloat(getComputedStyle(document.getElementById('g10-pname')).fontSize)
      }
    })
    const b64 = await page.screenshot({ encoding: 'base64' })
    fs.writeFileSync(`${OUT}poke-battle-${tag}.png`, Buffer.from(b64, 'base64'))
    const dead = await deadFraction(page, b64)

    const ratio = m.field.h / v.h
    const minRatio = landscape ? MIN_LANDSCAPE_RATIO : MIN_PORTRAIT_RATIO
    if (ratio < minRatio) fail(`arena height ratio ${ratio.toFixed(2)} < ${minRatio}`)
    if (m.field.w < v.w - 1 || m.field.x > 0.5) fail(`arena not full width (${m.field.w.toFixed(0)}px)`)
    if (dead.max > MAX_DEAD_FRACTION) fail(`dead dark area ${(dead.max * 100).toFixed(0)}% contiguous > ${MAX_DEAD_FRACTION * 100}%`)
    if (dead.total > MAX_DEAD_TOTAL) fail(`dark rows total ${(dead.total * 100).toFixed(0)}% > ${MAX_DEAD_TOTAL * 100}%`)
    if (m.btns.length !== 4) fail(`expected 4 answer buttons, got ${m.btns.length}`)
    const btnBad = m.btns.filter(b => !b.vis || b.h < MIN_BTN_H || b.y < 0 || b.y + b.h > v.h + 0.5 || b.x < 0 || b.x + b.w > v.w + 0.5)
    if (btnBad.length) fail(`${btnBad.length} answer button(s) hidden/off-screen/<${MIN_BTN_H}px (min h ${Math.min(...m.btns.map(b => b.h)).toFixed(0)})`)
    const minSpr = Math.min(m.espr.h, m.pspr.h) / m.field.h
    if (minSpr < 0.18) fail(`sprites small: ${(minSpr * 100).toFixed(0)}% of arena height`)
    if (m.nameFs < 13) fail(`HP card name ${m.nameFs}px < 13px`)
    console.log(`  ${tag}: arena ${(ratio * 100).toFixed(0)}% · dead ${(dead.max * 100).toFixed(0)}%/${(dead.total * 100).toFixed(0)}% · btn h ${Math.min(...m.btns.map(b => b.h)).toFixed(0)}px · sprite ${Math.round(Math.min(m.espr.h, m.pspr.h))}px · name ${m.nameFs}px`)
  } catch (e) {
    fail('error ' + String(e.message || e).slice(0, 160))
  }
  await page.close()
}
await browser.close()
console.log(failures.length ? `\nqa-poke-battle-layout: FAIL (${failures.length})` : '\nqa-poke-battle-layout: PASS (5 viewports)')
process.exit(failures.length ? 1 : 0)
