// Headless QA probe for secondbrain.html (Dunia Emosi knowledge graph).
// Loads at desktop 1280x800 and mobile 390x800, asserting: vis-network canvas
// renders, node count == RAW, search filters, category filter works, theme
// toggle works, clicking a node opens its detail panel (with doc/game link),
// no horizontal overflow at 390px, controls >= 44px, 0 console/page errors.
import puppeteer from 'puppeteer'
import fs from 'fs'

const URL = 'http://localhost:8081/secondbrain.html'
const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})

const results = []
function ok(arr, name, cond, extra) { arr.push({ name, pass: !!cond, extra }) }

async function run(label, vw, vh) {
  const checks = []
  const page = await browser.newPage()
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
  try {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 25000 })
  } catch (e) { errors.push('GOTO: ' + e.message) }
  await new Promise(r => setTimeout(r, 2500)) // stabilize physics + loader

  // 1. vis-network canvas rendered
  const hasCanvas = await page.evaluate(() => {
    const c = document.querySelector('#gw canvas')
    return !!c && c.width > 0 && c.height > 0
  })
  ok(checks, 'vis-network canvas renders', hasCanvas)

  // 2. node count badge == RAW length (43)
  const nodeStat = await page.evaluate(() => parseInt(document.getElementById('sN').textContent, 10))
  ok(checks, 'node count == 43', nodeStat === 43, `got ${nodeStat}`)
  const linkStat = await page.evaluate(() => parseInt(document.getElementById('sE').textContent, 10))
  ok(checks, 'link count > 0', linkStat > 0, `got ${linkStat}`)

  // 3. search filters down
  await page.click('#si')
  await page.type('#si', 'pokemon')
  await new Promise(r => setTimeout(r, 600))
  const afterSearch = await page.evaluate(() => parseInt(document.getElementById('sN').textContent, 10))
  ok(checks, 'search filters (pokemon < 43)', afterSearch > 0 && afterSearch < 43, `got ${afterSearch}`)
  // clear search
  await page.evaluate(() => { document.getElementById('si').value = '' })
  await page.click('#si'); await page.type('#si', ' '); await page.keyboard.press('Backspace')
  await new Promise(r => setTimeout(r, 600))

  // 4. category filter works (click GAMES pill -> 14)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.fp')].find(x => x.dataset.g === 'games'); b && b.click()
  })
  await new Promise(r => setTimeout(r, 700))
  const afterFilter = await page.evaluate(() => parseInt(document.getElementById('sN').textContent, 10))
  ok(checks, 'category filter GAMES == 14', afterFilter === 14, `got ${afterFilter}`)
  // reset to ALL
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.fp')].find(x => x.dataset.g === 'all'); b && b.click()
  })
  await new Promise(r => setTimeout(r, 700))

  // 5. theme toggle works
  const themeBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  await page.click('#bTheme')
  await new Promise(r => setTimeout(r, 500))
  const themeAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  ok(checks, 'theme toggle flips dark class', themeBefore !== themeAfter)
  // toggle back to keep screenshot in light
  await page.click('#bTheme')
  await new Promise(r => setTimeout(r, 600))

  // 6. clicking a node opens detail panel with a link
  const panel = await page.evaluate(() => {
    // call the page helper to open a known node (game w/ url)
    if (typeof window.focN === 'function') window.focN('balapan')
    const sb = document.getElementById('sb')
    const open = sb && sb.classList.contains('open')
    const title = document.getElementById('sbTi').textContent
    const link = document.querySelector('#sbA a.sbbn-p')
    const href = link ? link.getAttribute('href') : null
    return { open, title, href }
  })
  ok(checks, 'node click opens detail panel', panel.open && panel.title.length > 0, `title="${panel.title}"`)
  ok(checks, 'detail panel shows page link', !!panel.href && /balapan-kereta\.html/.test(panel.href), `href=${panel.href}`)
  // close panel
  await page.evaluate(() => window.closeSB && window.closeSB())
  await new Promise(r => setTimeout(r, 400))

  // 7. no horizontal overflow
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    bodyScrollX: window.scrollX,
  }))
  ok(checks, 'no horizontal overflow', overflow.scrollW <= overflow.clientW + 1,
    `scrollW=${overflow.scrollW} clientW=${overflow.clientW}`)

  // 8. key controls >= 44px
  const ctl = await page.evaluate(() => {
    const sel = ['#si', '#bTheme', '#bF', '#bPth', '#zI', '.fp']
    const out = {}
    for (const s of sel) {
      const el = document.querySelector(s)
      if (!el) { out[s] = null; continue }
      const r = el.getBoundingClientRect()
      out[s] = { w: Math.round(r.width), h: Math.round(r.height) }
    }
    return out
  })
  const tooSmall = Object.entries(ctl).filter(([s, v]) => v && (v.h < 44))
  ok(checks, 'controls >= 44px tall', tooSmall.length === 0,
    tooSmall.map(([s, v]) => `${s}=${v.h}px`).join(', '))

  // 9. zero console / page errors (ignore favicon + CDN font noise)
  const realErrors = errors.filter(e => !/favicon|fonts\.g|net::ERR_ABORTED.*favicon/i.test(e))
  ok(checks, '0 console/page errors', realErrors.length === 0, realErrors.join(' | '))

  await page.screenshot({ path: `${OUT}/secondbrain-${label}.png` })
  await page.close()
  return { label, vw, vh, checks }
}

results.push(await run('desktop', 1280, 800))
results.push(await run('mobile', 390, 800))
await browser.close()

let failed = 0
for (const r of results) {
  console.log(`\n=== ${r.label} (${r.vw}x${r.vh}) ===`)
  for (const c of r.checks) {
    console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.extra && !c.pass ? '  [' + c.extra + ']' : ''}`)
    if (!c.pass) failed++
  }
}
console.log(`\nScreenshots: ${OUT}/secondbrain-desktop.png , ${OUT}/secondbrain-mobile.png`)
console.log(failed ? `\n❌ ${failed} check(s) failed` : `\n✅ all checks passed (both viewports)`)
process.exit(failed ? 1 : 0)
