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

// Derive the expected node count straight from the RAW[] block so the probe
// tracks enrichment automatically instead of hard-coding a stale number.
const HTML_SRC = fs.readFileSync('secondbrain.html', 'utf8')
const RAW_BLOCK = HTML_SRC.match(/const RAW=\[([\s\S]*?)\n\];/)
const EXPECT_NODES = RAW_BLOCK ? (RAW_BLOCK[1].match(/\{id:'/g) || []).length : 0
const EXPECT_JOURNEY = (HTML_SRC.match(/group:'journey'/g) || []).length

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

  // 2. node count badge == RAW length (derived from source)
  const nodeStat = await page.evaluate(() => parseInt(document.getElementById('sN').textContent, 10))
  ok(checks, `node count == RAW length (${EXPECT_NODES})`, nodeStat === EXPECT_NODES, `got ${nodeStat}`)
  const linkStat = await page.evaluate(() => parseInt(document.getElementById('sE').textContent, 10))
  ok(checks, 'link count > 0', linkStat > 0, `got ${linkStat}`)

  // 3. search filters down
  await page.click('#si')
  await page.type('#si', 'pokemon')
  await new Promise(r => setTimeout(r, 600))
  const afterSearch = await page.evaluate(() => parseInt(document.getElementById('sN').textContent, 10))
  ok(checks, `search filters (pokemon < ${EXPECT_NODES})`, afterSearch > 0 && afterSearch < EXPECT_NODES, `got ${afterSearch}`)
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
  // 4b. category filter includes the new JOURNEY group
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.fp')].find(x => x.dataset.g === 'journey'); b && b.click()
  })
  await new Promise(r => setTimeout(r, 700))
  const afterJourney = await page.evaluate(() => parseInt(document.getElementById('sN').textContent, 10))
  ok(checks, `category filter JOURNEY == ${EXPECT_JOURNEY}`, afterJourney === EXPECT_JOURNEY, `got ${afterJourney}`)
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
  await page.evaluate(() => window.closeSB && window.closeSB())
  await new Promise(r => setTimeout(r, 300))

  // 6b. clicking a journey leg node + a lesson node opens the detail panel
  const jpanel = await page.evaluate(() => {
    if (typeof window.focN === 'function') window.focN('leg-14')
    const sb = document.getElementById('sb')
    return { open: sb && sb.classList.contains('open'), title: document.getElementById('sbTi').textContent, badge: document.getElementById('sbBdg').textContent }
  })
  ok(checks, 'journey node opens detail panel', jpanel.open && /Surabaya/.test(jpanel.title) && jpanel.badge === 'journey', `title="${jpanel.title}" badge="${jpanel.badge}"`)
  await page.evaluate(() => window.closeSB && window.closeSB())
  await new Promise(r => setTimeout(r, 250))
  const lpanel = await page.evaluate(() => {
    if (typeof window.focN === 'function') window.focN('l116')
    const sb = document.getElementById('sb')
    const link = document.querySelector('#sbA a.sbbn-p')
    return { open: sb && sb.classList.contains('open'), title: document.getElementById('sbTi').textContent, href: link ? link.getAttribute('href') : null }
  })
  ok(checks, 'lesson node opens detail panel w/ doc link', lpanel.open && /L116/.test(lpanel.title) && /LESSONS-LEARNED\.md/.test(lpanel.href || ''), `title="${lpanel.title}" href=${lpanel.href}`)
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

  await page.screenshot({ path: `${OUT}/secondbrain-enriched-${label}.png` })
  await page.close()
  return { label, vw, vh, checks }
}

results.push(await run('desktop', 1280, 800))
results.push(await run('mobile', 390, 800))

// index.html discoverability: the new secondbrain link exists, points correctly, 0 errors
const idxChecks = []
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
  try { await page.goto('http://localhost:8081/index.html', { waitUntil: 'networkidle2', timeout: 25000 }) }
  catch (e) { errors.push('GOTO: ' + e.message) }
  await new Promise(r => setTimeout(r, 1500))
  const link = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href]')].find(x => /secondbrain\.html/.test(x.getAttribute('href')))
    return a ? { href: a.getAttribute('href'), text: a.textContent.trim() } : null
  })
  ok(idxChecks, 'index.html has a secondbrain link', !!link && /secondbrain\.html/.test(link.href), link ? `href=${link.href} text="${link.text}"` : 'not found')
  const realErrors = errors.filter(e => !/favicon|fonts\.g|net::ERR_ABORTED.*favicon/i.test(e))
  ok(idxChecks, 'index.html 0 console/page errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))
  await page.close()
}
results.push({ label: 'index.html', vw: 1280, vh: 800, checks: idxChecks })

await browser.close()

let failed = 0
for (const r of results) {
  console.log(`\n=== ${r.label} (${r.vw}x${r.vh}) ===`)
  for (const c of r.checks) {
    console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.extra && !c.pass ? '  [' + c.extra + ']' : ''}`)
    if (!c.pass) failed++
  }
}
console.log(`\nScreenshots: ${OUT}/secondbrain-enriched-desktop.png , ${OUT}/secondbrain-enriched-mobile.png`)
console.log(failed ? `\n❌ ${failed} check(s) failed` : `\n✅ all checks passed (both viewports)`)
process.exit(failed ? 1 : 0)
