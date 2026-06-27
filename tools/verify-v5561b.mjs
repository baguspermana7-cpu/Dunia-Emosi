/* v55.61 verify g15 (black-lanes/BGM/parallax) + g14-side (modal/terrain/jump). */
import puppeteer from 'puppeteer'
import path from 'path'; import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'qa-screenshots')
const BASE = 'http://localhost:8081/games'
const wait = ms => new Promise(r => setTimeout(r, ms))
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] })
const run = async (name, url, drive) => {
  const page = await browser.newPage()
  await page.setViewport({ width: 412, height: 915 })
  const errs = []
  page.on('pageerror', e => errs.push(e.message))
  page.on('console', m => { if (m.type()==='error') errs.push(m.text()) })
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await wait(2500)
  await drive(page)
  const clean = errs.filter(e => !/404|favicon|Failed to load resource/i.test(e))
  console.log(`[${name}] console/page errors:`, clean.slice(0,6))
  await page.close()
}
try {
  // g15 — pick a Thomas char, start, screenshot (check no black between lanes + bgm src)
  await run('g15', `${BASE}/lokomotif-pemberani.html`, async (page) => {
    await wait(800)
    const picked = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[class*=card], .train-card, [onclick]')]
      const c = cards.find(x => /thomas/i.test(x.textContent))
      if (c) { c.click(); return true } return false
    })
    await wait(2500)
    const bgm = await page.evaluate(() => { const b = document.getElementById('game-bgm'); return b ? b.src.split('/').slice(-2).join('/') : 'none' })
    await page.screenshot({ path: path.join(OUT, 'v5561-g15.png') })
    console.log(`  g15 pickedThomas=${picked} bgm.src=${bgm}`)
  })
  // g14-side — start a run, let it go, screenshot terrain; check it boots
  await run('g14side', `${BASE}/balapan-kereta-side.html`, async (page) => {
    await wait(800)
    await page.evaluate(() => {
      const start = [...document.querySelectorAll('button,[onclick]')].find(b => /mulai|start|main|play/i.test(b.textContent))
      if (start) start.click()
    })
    await wait(1500)
    // skip any tutorial
    await page.evaluate(() => { [...document.querySelectorAll('button,[onclick]')].filter(b=>/lewati|mulai|skip|lanjut/i.test(b.textContent)).forEach(b=>b.click()) })
    await wait(4000)
    await page.screenshot({ path: path.join(OUT, 'v5561-g14side.png') })
    const st = await page.evaluate(() => (typeof S!=='undefined') ? { dist: Math.round(S.distance), jv: (typeof JUMP_VELOCITY!=='undefined'?JUMP_VELOCITY:'?'), gaps: (S.gaps?S.gaps.length:'n/a'), terrain: typeof terrainHeightAt } : 'no-S')
    console.log('  g14side state:', JSON.stringify(st))
  })
} finally { await browser.close() }
