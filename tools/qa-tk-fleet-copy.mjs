// Catalogue guard: the two side-only owner additions must disclose their borrowed
// gameplay view; Republic is the 1909 radio-rescue liner used by its story world.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
globalThis.window = globalThis
require('../games/tk-fleet.js')
const fleet = globalThis.TKFleet
const alternatives = fleet.ships.filter(ship => ship.topAlt)
assert.deepEqual(alternatives.map(ship => ship.id).sort(), ['great-eastern', 'uss-enterprise'])
for (const ship of alternatives) {
  assert.equal(ship.topNote, 'Tampak atas memakai kapal contoh', `${ship.id}: readable disclosure`)
}
assert.ok(fleet.ships.filter(ship => ship.group === 'modern' && ship.flag).every(ship => ship.topNote === 'Gambar samping dan atas berbeda'), 'all known modern mismatches disclosed')
assert.ok(fleet.ships.filter(ship => !ship.flag).every(ship => !ship.topNote), 'matching views need no disclosure')
assert.match(fleet.get('great-eastern').fact, /kabel telegraf/)
assert.doesNotMatch(fleet.get('great-eastern').fact, /telepon/)
assert.equal(fleet.get('ss-republic').real, 'RMS Republic')
assert.match(fleet.get('ss-republic').fact, /radio/)
assert.doesNotMatch(fleet.get('ss-republic').fact, /koin|emas/)
console.log('qa-tk-fleet-copy: 10 passed, 0 failed')

if (process.env.QA_UI === '1') {
  const { default: puppeteer } = await import('puppeteer')
  const { mkdirSync } = await import('node:fs')
  const base = process.env.QA_URL || 'http://localhost:8081'
  const shots = process.env.QA_SHOTS || '/tmp/timmy-fleet-copy'
  mkdirSync(shots, { recursive: true })
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  try {
    const sizes = (process.env.QA_SIZES || '1280x800,390x844,844x390').split(',').map(size => size.split('x').map(Number))
    for (const [width, height] of sizes) {
      for (const mode of ['steer', 'lanes']) for (const id of ['uss-enterprise', 'great-eastern', 'bulk']) {
        const page = await browser.newPage(), errors = []
        page.on('pageerror', error => errors.push(error.message))
        await page.setViewport({ width, height, hasTouch: true, isMobile: width < 900 })
        await page.goto(`${base}/tools/tk-harness-${mode}.html?ship=${id}&cd=0&muted=1&quiz=stub`, { waitUntil: 'networkidle2' })
        const prefix = mode === 'steer' ? 'tks' : 'tkl'
        await page.click(`.${prefix}-pausebtn`)
        const pauseNote = await page.$eval(`.${prefix}-topnote`, element => ({ text: element.textContent, height: element.getBoundingClientRect().height }))
        assert.equal(pauseNote.text, fleet.get(id).topNote)
        assert.ok(pauseNote.height > 0, 'pause disclosure visible')
        await page.click(`.${prefix}-swap`)
        await page.waitForFunction(() => { const image = document.querySelector('.tkf-hero'); return image && image.complete && image.naturalWidth > 0 })
        await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.tkf-root')).opacity) >= 0.999)
        const layout = await page.evaluate(() => {
          const note = document.querySelector('.tkf-topnote'), cta = document.querySelector('.tkf-cta'), hero = document.querySelector('.tkf-hero')
          const onScreen = element => { const r = element.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1)) return false; for (let p = element.parentElement; p; p = p.parentElement) { const c = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(c.overflowY)) { const b = p.getBoundingClientRect(); if (r.top < b.top - 1 || r.bottom > b.bottom + 1) return false } } return true }
          return { text: note.textContent, note: !note.hidden && onScreen(note), cta: onScreen(cta), hero: onScreen(hero) && hero.getBoundingClientRect().height >= 40 }
        })
        assert.equal(layout.text, fleet.get(id).topNote)
        assert.ok(layout.note && layout.cta && layout.hero, `${width}x${height} ${mode} ${id}: ${JSON.stringify(layout)}`)
        await page.screenshot({ path: `${shots}/${width}x${height}-${mode}-${id}.png` })
        assert.deepEqual(errors, [])
        await page.close()
      }
    }
    console.log(`qa-tk-fleet-copy UI: ${sizes.length * 6} picker/pause flows passed`)
  } finally { await browser.close() }
}
