/* v55.61 verification — g14 facing (B-239), parallax (B-241), spin removed (B-253),
 * Diesel present (B-243), single BGM element, faces map applied. Screenshots to
 * tools/qa-screenshots/v5561-*.png. */
import puppeteer from 'puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'qa-screenshots')
const BASE = 'http://localhost:8081/games'
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const log = (...a) => console.log(...a)

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' | STACK: ' + (e.stack||'').split(String.fromCharCode(10)).slice(0,4).join(' <- ')))

  await page.goto(`${BASE}/balapan-kereta.html`, { waitUntil: 'domcontentloaded' })
  await wait(2500)

  // Static facts from page state
  const facts = await page.evaluate(() => {
    const out = {}
    out.spinOverlay = !!document.getElementById('g14-spin-overlay')
    out.bgmCount = document.querySelectorAll('#game-bgm').length
    const tm = window.TRAIN_MAP || {}
    out.faces = {}
    ;['aeg_thomas','aeg_james','aeg_winston','aeg_kana','aeg_diesel','aeg_salty','aeg_slip_coaches','aeg_percy'].forEach(k => { out.faces[k] = tm[k] ? tm[k].faces : 'MISSING' })
    out.dieselInMap = !!tm['aeg_diesel']
    return out
  })
  log('FACTS', JSON.stringify(facts, null, 0))

  // Open Thomas/AEG category + check Diesel card present
  const cat = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, .cat-btn, [onclick]')]
    const t = btns.find(b => /thomas|aeg|friends/i.test(b.textContent))
    if (t) t.click()
    return t ? t.textContent.trim().slice(0,40) : null
  })
  await wait(700)
  const dieselCard = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.train-card, [class*=card]')]
    return cards.some(c => /diesel/i.test(c.textContent))
  })
  await page.screenshot({ path: path.join(OUT, 'v5561-01-picker.png') })
  log(`picker cat="${cat}" dieselCardPresent=${dieselCard}`)

  // Pick Thomas (native-left → must mirror to face RIGHT)
  const picked = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.train-card, [class*=card]')]
    const c = cards.find(x => /thomas/i.test(x.textContent))
    if (c) { c.click(); return c.textContent.trim().slice(0,30) }
    return null
  })
  await wait(400)
  await page.evaluate(() => { const g = document.getElementById('go-btn'); if (g) g.click() })
  await wait(6000)  // let the 3-2-1-GO countdown clear
  const vp = page.viewport()
  await page.screenshot({ path: path.join(OUT, 'v5561-02-thomas-race.png') })
  await page.screenshot({ path: path.join(OUT, 'v5561-02b-thomas-player.png'), clip: { x: 0, y: Math.round(vp.height*0.45), width: Math.round(vp.width*0.6), height: Math.round(vp.height*0.4) } })
  const sFaces = await page.evaluate(() => (window.S && window.S.trainCfg) ? (window.S.trainCfg.faces || 'undef') : 'no-window.S')
  log(`S.trainCfg.faces = ${sFaces}`)
  await wait(900)
  await page.screenshot({ path: path.join(OUT, 'v5561-03-thomas-race-later.png') })
  log(`picked="${picked}"`)

  log('CONSOLE ERRORS (non-asset):', errors.filter(e => !/404|favicon|Failed to load resource/i.test(e)).slice(0,10))
} finally {
  await browser.close()
}
