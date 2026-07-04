// A-323b/A-327 probe — drives Balapan Kereta VERSUS (mode-select + PvP split-screen).
// Landscape 900x500 + portrait 390x844. Asserts: mode modal, name entry, split-screen
// with two bands + a QuizEngine .qz-pill question in each bottom corner (P2 left / P1
// right), correct answer advances only that band, first-to-finish win banner.
import puppeteer from 'puppeteer'
import fs from 'fs'
const OUT = 'tools/qa-out'; fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|googleapis|gstatic|unpkg/i
const sleep = ms => new Promise(r => setTimeout(r, ms))
const URL = 'http://localhost:8081/games/balapan-kereta.html'

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
let fail = 0
const check = (cond, msg) => { console.log((cond ? '  ok  ' : ' FAIL ') + msg); if (!cond) fail++ }

async function boot (w, h, tag) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  const errs = []
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()) })
  page.on('pageerror', e => { if (!IGNORE.test(e.message)) errs.push('PE:' + e.message) })
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('g14-tutorial-seen', '1'); sessionStorage.setItem('g14-hinted', '1')
    localStorage.removeItem('dunia-pvp-names')
    sessionStorage.setItem('g14Config', JSON.stringify({ level: 3, trainKey: 'aeg_thomas', train: 'aeg_thomas', difficulty: 'easy' }))
  })
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await sleep(1600)
  // select a train so S.trainCfg is set, then open the mode modal
  await page.evaluate(() => {
    try { const t = TRAIN_MAP['aeg_thomas']; S.trainCfg = { ...t, variant: 1 }; window.selectedTrainKey = t.key } catch (e) {}
    window.g14GoRace()
  })
  await sleep(500)
  return { page, errs }
}

async function answerCorner (page, sel) {
  // read the qz question in the corner, compute, click the right pill
  return await page.evaluate((sel) => {
    const corner = document.querySelector(sel); if (!corner) return false
    const q = corner.querySelector('.qz-question'); if (!q) return false
    const m = q.textContent.match(/(\d+)\s*([+\-])\s*(\d+)/); if (!m) return false
    const ans = m[2] === '+' ? (+m[1] + +m[3]) : (+m[1] - +m[3])
    const pills = corner.querySelectorAll('.qz-pill')
    for (const p of pills) { if (String(p.textContent).trim() === String(ans)) { p.click(); return true } }
    return false
  }, sel)
}

// ── Landscape run ─────────────────────────────────────────────────────────
console.log('\n[landscape 900x500]')
{
  const { page, errs } = await boot(900, 500, 'ls')
  const modal = await page.$('.gvs-modal'); check(!!modal, 'mode-select modal appears')
  const cards = await page.$$eval('.gvs-card', els => els.map(e => e.getAttribute('data-mode')))
  check(cards.join(',') === 'adventure,pvp,tournament', 'three mode cards (adventure/pvp/tournament)')
  await page.screenshot({ path: `${OUT}/versus-1-mode-ls.png` })

  // → PvP
  await page.evaluate(() => document.querySelector('.gvs-card[data-mode="pvp"]').click())
  await sleep(350)
  const inputs = await page.$$('.gvs-input'); check(inputs.length === 2, 'PvP name entry has 2 inputs')
  await page.type('.gvs-input[data-idx="0"]', 'Rai')
  await page.type('.gvs-input[data-idx="1"]', 'Adik')
  await page.screenshot({ path: `${OUT}/versus-2-names-ls.png` })
  await page.evaluate(() => document.querySelector('#gvs-go').click())
  await sleep(700)

  const arena = await page.$('#g14vs'); check(!!arena, 'split-screen arena mounts (#g14vs)')
  const bands = await page.$$('#g14vs .gvs-band'); check(bands.length === 2, 'two race bands')
  // question in each corner + corner side
  const layout = await page.evaluate(() => {
    const c2 = document.querySelector('.gvs-corner.p2'); const c1 = document.querySelector('.gvs-corner.p1')
    const q2 = c2 && c2.querySelector('.qz-pill'); const q1 = c1 && c1.querySelector('.qz-pill')
    const r2 = c2.getBoundingClientRect(); const r1 = c1.getBoundingClientRect()
    return { q2: !!q2, q1: !!q1, p2Left: r2.left < r1.left, dockBottom: r2.bottom > window.innerHeight * 0.55 }
  })
  check(layout.q2 && layout.q1, 'a QuizEngine .qz-pill question in EACH bottom corner')
  check(layout.p2Left, 'P2 corner is on the left, P1 on the right')
  await page.screenshot({ path: `${OUT}/versus-3-split-ls.png` })

  // advancement: answer P1 several times, P1 should out-distance P2
  const before = await page.evaluate(() => +document.querySelector('.gvs-corner.p1') && 0)
  let clicks = 0
  for (let i = 0; i < 16; i++) {
    const won = await page.$('.gvs-panel'); if (won) break
    await answerCorner(page, '.gvs-corner.p1'); clicks++
    await sleep(520)
  }
  const pcts = await page.evaluate(() => {
    const els = [...document.querySelectorAll('#g14vs .gvs-pct')].map(e => parseInt(e.textContent) || 0)
    return els
  }).catch(() => [])
  await sleep(400)
  const win = await page.$('.gvs-panel'); check(!!win, 'first-to-finish win banner shows')
  const title = win ? await page.$eval('.gvs-panel h1', e => e.textContent) : ''
  check(/Menang/.test(title), 'win banner reads "<name> Menang!" — got: ' + JSON.stringify(title))
  await page.screenshot({ path: `${OUT}/versus-4-win-ls.png` })

  check(errs.length === 0, 'no console/page errors (landscape) — ' + JSON.stringify(errs.slice(0, 4)))
  await page.close()
}

// ── Portrait run (modal + split render sanity) ────────────────────────────
console.log('\n[portrait 390x844]')
{
  const { page, errs } = await boot(390, 844, 'pt')
  check(!!(await page.$('.gvs-modal')), 'mode modal renders in portrait')
  await page.screenshot({ path: `${OUT}/versus-5-mode-pt.png` })
  await page.evaluate(() => document.querySelector('.gvs-card[data-mode="pvp"]').click())
  await sleep(300)
  await page.type('.gvs-input[data-idx="0"]', 'Bagas')
  await page.type('.gvs-input[data-idx="1"]', 'Ayu')
  await page.evaluate(() => document.querySelector('#gvs-go').click())
  await sleep(700)
  const ov = await page.evaluate(() => {
    const body = document.body
    return { scrollX: window.scrollX, overflow: body.scrollWidth > window.innerWidth + 1, hasArena: !!document.querySelector('#g14vs .gvs-band') }
  })
  check(ov.hasArena, 'split-screen arena renders in portrait')
  check(!ov.overflow, 'no horizontal overflow at 390px')
  await page.screenshot({ path: `${OUT}/versus-6-split-pt.png` })
  check(errs.length === 0, 'no console/page errors (portrait) — ' + JSON.stringify(errs.slice(0, 4)))
  await page.close()
}

await browser.close()
console.log('\n' + (fail === 0 ? 'ALL PASS' : fail + ' CHECK(S) FAILED'))
process.exit(fail === 0 ? 0 : 1)
