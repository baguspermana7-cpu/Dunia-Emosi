// G27 header gate — on every screen header, at phone/tablet/desktop sizes in both
// orientations, the title never overlaps the back button or the star badge, never
// overflows its own box, and stays on screen. The screenshots looked fine while
// "Mixed Challenge" sat 5px under the badge at EVERY width and 23px at 320px:
// only a measurement sees that. Needs the dev server on :8081.
import puppeteer from 'puppeteer'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const SIZES = [[320, 640], [360, 780], [390, 844], [414, 896], [640, 360], [844, 390], [1024, 768], [1280, 800]]
const fails = []
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })

const probe = p => p.evaluate(() => {
  const hd = document.querySelector('.scr.active .head'); if (!hd) return null
  const kids = [...hd.children].map(e => e.getBoundingClientRect())
  let overlap = 0
  for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
    const a = kids[i], c = kids[j]
    const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)
    if (ox > 0 && oy > 0) overlap = Math.max(overlap, Math.round(ox))
  }
  const t = hd.querySelector('.title-txt, .plank-img'), r = t.getBoundingClientRect()
  return { overlap, overflow: t.scrollWidth > t.clientWidth + 1, onScreen: r.left >= 0 && r.right <= innerWidth + 0.5,
           fs: t.tagName === 'IMG' ? null : parseFloat(getComputedStyle(t).fontSize) }
})

try {
  for (const [w, h] of SIZES) {
    const p = await b.newPage()
    await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: true })
    let ok = false
    for (const t of [45000, 120000]) {
      try { await p.goto('http://localhost:8081/games/ejaan-inggris.html', { waitUntil: 'networkidle2', timeout: t }); ok = true; break } catch (_) {}
    }
    if (!ok) { fails.push(`${w}x${h}: page did not load`); await p.close(); continue }
    await sleep(800)
    const cats = await p.evaluate(() => SpellingData.CATEGORIES.map(c => c.key))
    const targets = cats.map(c => ['cat', c]).concat([['scr', 'scr-category'], ['scr', 'scr-progress'], ['scr', 'scr-settings']])
    for (const [kind, key] of targets) {
      if (kind === 'cat') await p.evaluate(c => window.__g27.openCategory(c, 1), key)
      else await p.evaluate(s => window.__g27.show(s), key)
      await sleep(250)
      const r = await probe(p)
      if (!r) { fails.push(`${w}x${h} ${key}: no header`); continue }
      const bad = []
      if (r.overlap) bad.push(`overlaps a neighbour by ${r.overlap}px`)
      if (r.overflow) bad.push('overflows its box')
      if (!r.onScreen) bad.push('off screen')
      if (r.fs !== null && r.fs < 18) bad.push(`font ${r.fs}px < 18px`)
      if (bad.length) fails.push(`${w}x${h} ${key}: ${bad.join(', ')}`)
    }
    console.log(`${w}x${h} checked ${targets.length} headers`)
    await p.close()
  }
} finally { await b.close() }

for (const f of fails) console.log('❌ ' + f)
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS — every header clean at 8 sizes')
process.exit(fails.length ? 1 : 0)
