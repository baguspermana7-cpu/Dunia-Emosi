/* B-290 — Museum Ambarawa real character art probe.
   Verifies: gallery cards render the mapped TRAIN_WORLD sprites (natural-size
   loaded <img>s, mirrored to face right), detail modal + hero banner show real
   art, procedural-SVG fallback still renders for the 3 unmapped exhibits, and
   the page stays at 0 non-asset console errors.
   Screenshots: tools/qa-out/museum-gallery.png / museum-modal.png / museum-hero.png */
import puppeteer from 'puppeteer'
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage(); await p.setViewport({ width: 820, height: 1180, deviceScaleFactor: 1 })
const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', e => errs.push('PE:' + e.message))
await p.goto('http://localhost:8081/games/museum-kereta.html', { waitUntil: 'domcontentloaded', timeout: 30000 })
await new Promise(r => setTimeout(r, 2500))
// force lazy images in the grid to load
await p.evaluate(() => { document.querySelectorAll('.g18-card img').forEach(i => { i.loading = 'eager' }) })
await new Promise(r => setTimeout(r, 2500))

const stats = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('.g18-card')]
  const imgs = [...document.querySelectorAll('.g18-card .g18-art img')]
  const loaded = imgs.filter(i => i.complete && i.naturalWidth > 10)
  const mirrored = imgs.filter(i => /scaleX\(-1\)/.test(i.getAttribute('style') || ''))
  const svgCards = cards.filter(c => c.querySelector('svg') && !c.querySelector('.g18-art'))
  return {
    cards: cards.length,
    artImgs: imgs.length,
    loaded: loaded.length,
    mirrored: mirrored.length,
    svgFallbackCards: svgCards.length,
    sampleSrcs: loaded.slice(0, 5).map(i => i.src.split('/').pop()),
    heroImg: (() => { const h = document.querySelector('#g18-gallery img[src*="252.webp"]'); return !!(h && h.complete && h.naturalWidth > 10) })()
  }
})
console.log('cards:', stats.cards, '| real-art imgs:', stats.artImgs, '| loaded:', stats.loaded,
  '| mirrored:', stats.mirrored, '| SVG-fallback cards:', stats.svgFallbackCards, '| hero art:', stats.heroImg)
console.log('sample srcs:', stats.sampleSrcs.join(' '))

let fail = 0
if (stats.cards !== 36) { console.log('FAIL: expected 36 cards, got', stats.cards); fail++ }
if (stats.artImgs !== 33) { console.log('FAIL: expected 33 real-art cards, got', stats.artImgs); fail++ }
if (stats.loaded !== stats.artImgs) { console.log('FAIL: broken art imgs:', stats.artImgs - stats.loaded); fail++ }
if (stats.mirrored !== stats.artImgs) { console.log('FAIL: unmirrored art imgs'); fail++ }
if (stats.svgFallbackCards !== 3) { console.log('FAIL: expected 3 procedural-SVG cards, got', stats.svgFallbackCards); fail++ }
if (!stats.heroImg) { console.log('FAIL: hero banner art missing/broken'); fail++ }

await p.screenshot({ path: 'tools/qa-out/museum-hero.png' })
await p.evaluate(() => { const g = document.getElementById('g18-card-grid'); if (g) g.scrollIntoView() })
await new Promise(r => setTimeout(r, 600))
await p.screenshot({ path: 'tools/qa-out/museum-gallery.png' })

// open detail modal on B 2507 (index 0, mapped to w252) like a user click
const card = await p.$('.g18-card')
if (card) { const bb = await card.boundingBox(); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
await new Promise(r => setTimeout(r, 1200))
const modal = await p.evaluate(() => {
  const m = document.getElementById('g18-modal')
  const img = document.querySelector('#g18-modal-emoji .g18-art img')
  return { open: !!(m && m.classList.contains('open')), img: !!(img && img.complete && img.naturalWidth > 10), src: img ? img.src.split('/').pop() : null }
})
console.log('modal open:', modal.open, '| modal real art:', modal.img, modal.src)
if (!modal.open || !modal.img) { console.log('FAIL: modal did not show real art'); fail++ }
await p.screenshot({ path: 'tools/qa-out/museum-modal.png' })

const realErrs = errs.filter(e => !/favicon|net::ERR|Failed to load resource/i.test(e))
console.log('non-asset console errors:', realErrs.length, realErrs.slice(0, 5))
if (realErrs.length) fail++
console.log(fail === 0 ? 'QA-MUSEUM-ART: PASS' : 'QA-MUSEUM-ART: FAIL (' + fail + ')')
await b.close()
process.exit(fail === 0 ? 0 : 1)
