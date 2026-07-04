// A-322 drive: expanded Museum Kereta (275 trains) — gallery + tabs + both modal types.
// Screenshots gallery + featured modal + light modal for landscape + portrait.
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const asset = e => /favicon|net::ERR|Failed to load|status of 4|status of 5/i.test(e)

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
let hardFail = 0

for (const [w, h, tag] of [[844, 390, 'land'], [390, 844, 'port']]) {
  const p = await b.newPage()
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2 })
  const errs = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('pageerror', e => errs.push('PE:' + e.message))
  await p.goto('http://localhost:8081/games/museum-kereta.html', { waitUntil: 'domcontentloaded' })
  await sleep(1800)

  // baseline gallery state
  const base = await p.evaluate(() => ({
    cards: document.querySelectorAll('#g18-card-grid .g18-card').length,
    tabs: document.querySelectorAll('#g18-tabs .g18-tab').length,
    featured: document.querySelectorAll('#g18-card-grid .g18-card .g18-star-badge').length,
    chip: (document.getElementById('g18-passport-chip') || {}).textContent || '',
    collect: (document.getElementById('g18-collect-count') || {}).textContent || '',
    items: (window.MUSEUM_ITEMS || []).length,
    lore: Object.keys(window.MUSEUM_LORE || {}).length
  }))
  await p.screenshot({ path: `tools/qa-out/museum-gallery-${tag}.png`, fullPage: false })

  // tab filter: click a middle category tab, confirm the grid count changes
  const filt = await p.evaluate(() => {
    const tabs = [...document.querySelectorAll('#g18-tabs .g18-tab')]
    const before = document.querySelectorAll('#g18-card-grid .g18-card').length
    const t = tabs[3] || tabs[1]; if (t) t.click()
    const after = document.querySelectorAll('#g18-card-grid .g18-card').length
    return { label: t ? t.textContent : '', before, after }
  })
  await sleep(400)
  // back to All
  await p.evaluate(() => { const t = document.querySelector('#g18-tabs .g18-tab'); if (t) t.click() })
  await sleep(300)

  // open a FEATURED card → rich modal (history/fact)
  const feat = await p.evaluate(() => {
    const badge = document.querySelector('#g18-card-grid .g18-card .g18-star-badge')
    const card = badge && badge.closest('.g18-card'); if (card) card.click()
    const modal = document.getElementById('g18-modal')
    const fact = document.getElementById('g18-modal-fact')
    const hist = document.getElementById('g18-modal-history-text')
    return {
      open: !!(modal && modal.classList.contains('open')),
      name: (document.getElementById('g18-modal-name') || {}).textContent || '',
      factLen: fact ? (fact.textContent || '').trim().length : 0,
      histLen: hist ? (hist.textContent || '').trim().length : 0
    }
  })
  await sleep(300)
  await p.screenshot({ path: `tools/qa-out/museum-featured-${tag}.png` })
  await p.evaluate(() => { try { g18CloseModal() } catch (_) {} })
  await sleep(250)

  // open a NON-featured card → light modal (cerita)
  const light = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#g18-card-grid .g18-card')]
    const plain = cards.find(c => !c.querySelector('.g18-star-badge'))
    if (plain) plain.click()
    const modal = document.getElementById('g18-light-modal')
    const cer = document.getElementById('g18-light-cerita')
    const txt = cer ? (cer.textContent || '').trim() : ''
    return {
      open: !!(modal && modal.classList.contains('open')),
      name: (document.getElementById('g18-light-name') || {}).textContent || '',
      ceritaLen: txt.length,
      indonesian: /dibuat tahun|termasuk|Tahukah|kereta/i.test(txt),
      sample: txt.slice(0, 90)
    }
  })
  await sleep(300)
  await p.screenshot({ path: `tools/qa-out/museum-light-${tag}.png` })

  // overflow check
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  const consoleErrs = errs.filter(e => !asset(e))
  // assertions
  const checks = {
    cardsGE250: base.cards >= 250,
    tabsGE7: base.tabs >= 7,
    chipHas275: /\/\s*275/.test(base.chip) || /\/\s*275/.test(base.collect),
    filterChanged: filt.after > 0 && filt.after < filt.before,
    featuredRich: feat.open && (feat.factLen > 0 || feat.histLen > 0),
    lightCerita: light.open && light.ceritaLen > 0 && light.indonesian,
    noOverflow: overflow <= 2,
    zeroErrors: consoleErrs.length === 0,
    lore275: base.lore === 275
  }
  const pass = Object.values(checks).every(Boolean)
  if (!pass) hardFail++
  console.log(`\n=== ${tag} (${w}x${h}) ${pass ? 'PASS ✅' : 'FAIL ❌'} ===`)
  console.log('base   ', JSON.stringify(base))
  console.log('filter ', JSON.stringify(filt))
  console.log('feat   ', JSON.stringify(feat))
  console.log('light  ', JSON.stringify(light))
  console.log('overflow', overflow, 'errors', consoleErrs.slice(0, 4))
  console.log('checks ', JSON.stringify(checks))
  await p.close()
}
await b.close()
console.log(hardFail ? `\nRESULT: ${hardFail} viewport(s) FAILED` : '\nRESULT: ALL GREEN ✅')
process.exit(hardFail ? 1 : 0)
