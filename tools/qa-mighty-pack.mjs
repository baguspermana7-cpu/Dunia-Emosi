// Gate for the Mighty Express pack (20 characters, 2026-09-20).
//
// A character pack is wired into FOUR places that can drift apart: the shared
// catalog (games/trains-db.js), balapan-kereta's own inline copy, the g16
// roster push in selamatkan-kereta, and lokomotif-pemberani's category maps.
// A pack registered in only some of them is invisible exactly where the child
// looks for it, which is how the Titipo pack nearly shipped.
//
// It also checks the thing the owner actually asked for -- "sizenya sangat
// proportional" -- by measuring, not by eye: every character's BODY (not its
// crane or ladder) must render at the same height, so a train stands the same
// size next to any other pack's train.
import puppeteer from 'puppeteer'
import fs from 'fs'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const meta = JSON.parse(fs.readFileSync('assets/train/mighty/_meta.json', 'utf8'))
check(meta.length === 20, `_meta.json describes 20 characters (${meta.length})`)

// --- proportionality, measured from the crops themselves ---------------------
const bodies = meta.map(m => m.suggestedSpriteHeight * (m.bodyHeightPx / m.trimmedH))
const med = bodies.slice().sort((a, b) => a - b)[Math.floor(bodies.length / 2)]
const worst = Math.max(...bodies.map(b => Math.abs(b - med)))
check(worst <= 3, `every body renders within 3px of ${med.toFixed(1)}px (worst ${worst.toFixed(1)}px)`)
check(meta.every(m => m.largestInteriorHolePx <= 8),
  `no crop has a hole punched through it (worst ${Math.max(...meta.map(m => m.largestInteriorHolePx))}px)`)
check(meta.every(m => m.captionCutRow > 0 || m.componentsDropped > 0),
  'every cell had its printed caption removed')
check(meta.every(m => fs.existsSync(`assets/train/mighty/${m.slug}.webp`)), 'all 20 webp files exist')

// Cross-pack scale: a Mighty train must stand the same size as a Titipo or
// Chuggington one, or "proportional" is only true within this pack. Measured
// from the packs' own crops (median column height = chassis, jibs excluded):
//   titipo 104.2px   chuggington 93.5px   mighty 99.1px (spread 0.8px)
const CROSS = { titipo: 104.2, chuggington: 93.5 }
for (const [pack, px] of Object.entries(CROSS)) {
  const off = Math.abs(med - px) / px
  check(off <= 0.12, `a Mighty body (${med.toFixed(1)}px) is within 12% of the ${pack} pack's ${px}px (${(off * 100).toFixed(1)}%)`)
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

async function open(path) {
  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })   // it force-reloads on a version bump
  const errors = []
  const missing = []
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 140)))
  page.on('console', m => { if (m.type() === 'error' && !/favicon/i.test(m.text())) errors.push(m.text().slice(0, 140)) })
  page.on('response', r => { if (r.status() >= 400 && /\/mighty\//.test(r.url())) missing.push(r.url().split('/').pop()) })
  await page.setViewport({ width: 1280, height: 800 })
  await page.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await sleep(5000)
  return { page, errors, missing }
}

try {
  // ── shared catalog, as balapan-kereta sees it after the world-roster swap
  {
    const { page, errors, missing } = await open('games/balapan-kereta.html')
    const r = await page.evaluate(() => {
      // these pages declare TRAIN_CATS as a top-level `const`, which is a lexical
      // global and NOT a property of window -- reading window.TRAIN_CATS finds
      // nothing and every check below would pass for the wrong reason.
      const cats = (typeof TRAIN_CATS !== 'undefined' ? TRAIN_CATS : [])
      const cat = cats.find(c => c.key === 'mighty')
      const all = cats.flatMap(c => c.trains || [])
      return {
        found: !!cat,
        count: cat ? cat.trains.length : 0,
        urls: cat ? cat.trains.map(t => t.spriteUrl) : [],
        faces: cat ? [...new Set(cat.trains.map(t => t.faces))] : [],
        heights: cat ? [Math.min(...cat.trains.map(t => t.spriteHeight)), Math.max(...cat.trains.map(t => t.spriteHeight))] : [],
        dupKeys: all.length - new Set(all.map(t => t.key)).size,
      }
    })
    check(r.found && r.count === 20, `g14 keeps the Mighty tab with 20 trains (${r.count})`)
    check(r.faces.join() === 'right', `g14 entries all face right (${r.faces.join()})`)
    check(r.urls.every(u => /assets\/train\/mighty\//.test(u)), 'g14 entries point at the mighty sprites')
    check(r.dupKeys === 0, `no duplicate train keys anywhere in g14's roster (${r.dupKeys})`)
    check(missing.length === 0, `g14 loaded every mighty sprite it asked for (${missing.join(',') || 'none'})`)
    check(errors.length === 0, `g14 has no page errors (${errors[0] || 'none'})`)
    await page.close()
  }

  // ── g16 roster + picker tab
  {
    const { page, errors, missing } = await open('games/selamatkan-kereta.html')
    const r = await page.evaluate(() => {
      const pkgs = (typeof G16_PKGS !== 'undefined' ? G16_PKGS : [])
      const cfg = (typeof G16_CHAR_CONFIGS !== 'undefined' ? G16_CHAR_CONFIGS : {})
      const styles = (typeof TRAIN_STYLES !== 'undefined' ? TRAIN_STYLES : [])
      const facesLeft = (typeof FACES_LEFT_G16 !== 'undefined' ? FACES_LEFT_G16 : [])
      const pkg = pkgs.find(p => p.id === 'mighty')
      const list = Array.isArray(facesLeft) ? facesLeft : Object.keys(facesLeft)
      return { found: !!pkg, indices: pkg ? pkg.indices.length : 0,
               cfgs: Object.keys(cfg).filter(k => k.startsWith('mex_')).length,
               styled: styles.filter(s => String(s.characterKey || '').startsWith('mex_')).length,
               faceLeft: list.filter(k => String(k).startsWith('mex_')).length }
    })
    check(r.found && r.indices === 20, `g16 picker has a Mighty tab with 20 cards (${r.indices})`)
    check(r.cfgs === 20 && r.styled === 20, `g16 registered 20 sprites and 20 roster styles (${r.cfgs}/${r.styled})`)
    check(r.faceLeft === 0, 'g16 does not mirror this pack (art already faces right)')
    check(missing.length === 0, `g16 loaded every mighty sprite it asked for (${missing.join(',') || 'none'})`)
    check(errors.length === 0, `g16 has no page errors (${errors[0] || 'none'})`)
    await page.close()
  }

  // ── g15 keeps the pack through its category filter
  {
    const { page, errors, missing } = await open('games/lokomotif-pemberani.html')
    const r = await page.evaluate(() => {
      const kept = (typeof TRAIN_CATS !== 'undefined' ? TRAIN_CATS : []).some(c => c.key === 'mighty')
      const models = (typeof TRAIN_MODELS !== 'undefined' ? TRAIN_MODELS : []).filter(m => String(m.key).startsWith('mex_'))
      return { kept, models: models.length,
               typed: models.every(m => m.type === 'character' && m.sub === 'featured'),
               sprites: models.every(m => /mighty/.test(m.spriteUrl || '')) }
    })
    check(r.kept, 'g15 keeps the Mighty category through the world-roster swap')
    check(r.models === 20, `g15 built 20 Mighty models (${r.models})`)
    check(r.typed, 'g15 files them under the character/featured filter')
    check(r.sprites, 'g15 models carry the mighty sprite urls')
    check(missing.length === 0, `g15 loaded every mighty sprite it asked for (${missing.join(',') || 'none'})`)
    check(errors.length === 0, `g15 has no page errors (${errors[0] || 'none'})`)
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
