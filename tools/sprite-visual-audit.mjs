#!/usr/bin/env node
/* =============================================================================
 * tools/sprite-visual-audit.mjs   (v55.39 — M-302 visual sprite audit)
 * =============================================================================
 * Owner mandate M-302: "lakukan audit jangan code aja, tapi juga tampilan
 * pakai puppeteer." Drive g15 (Lokomotif Pemberani) with EACH character train
 * selected, screenshot the rendered sprite, so a human/agent can READ each
 * image and confirm: correct sprite, faces right, no mutilation, no artifacts.
 *
 * Loads g15, sets `selectedTrain` to a target char, hides the picker, calls
 * initPixi(), waits for the webp to load + composite, screenshots.
 *
 * Output: tools/qa-screenshots/sprite-<key>.png
 * Usage:  node tools/sprite-visual-audit.mjs            (representative set)
 *         node tools/sprite-visual-audit.mjs --all      (all 30 characters)
 * ========================================================================== */
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'qa-screenshots')
const BASE = 'http://localhost:8081'
fs.mkdirSync(OUT, { recursive: true })
const VP = { width: 412, height: 915, deviceScaleFactor: 1.5 }
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const ALL = process.argv.includes('--all')

// Representative set covers each facing + the owner-flagged Carly + 1 PROTECTED.
const REPRESENTATIVE = [
  'aeg_carly',    // owner-flagged, faces left
  'aeg_thomas',   // faces left (most iconic)
  'aeg_ashima',   // faces right (detailed HD)
  'aeg_toby',     // faces forward (tram)
  'aeg_diesel',   // black 51 — the wrong-sprite suspect
  'aeg_hiro',     // black 51 — the other suspect
  'caseyjr_character', // PROTECTED, faces right
]

const findings = []
function note(key, msg) { console.log(`  [${key}] ${msg}`); findings.push({ key, msg }) }

async function main() {
  console.log(`── sprite-visual-audit v55.39 (M-302) ${ALL ? '[ALL]' : '[representative]'} ──`)
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport(VP)
    const errs = []
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    page.on('pageerror', e => errs.push('PAGEERR: ' + e.message))

    await page.goto(`${BASE}/games/lokomotif-pemberani.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await wait(1800)

    // Build {key,name} list of character trains from TRAIN_CATALOG.
    const chars = await page.evaluate(() => {
      if (typeof TRAIN_CATALOG === 'undefined') return []
      return TRAIN_CATALOG.filter(t => t.isCharacter).map(t => ({
        key: t.id || t.key, name: t.name, faces: t.faces,
        sprite: (t.spriteUrl || '').split('/').pop(),
      }))
    })
    const wanted = ALL ? chars : chars.filter(c => REPRESENTATIVE.includes(c.key))
    note('setup', `${wanted.length} characters to audit`)

    for (const c of wanted) {
      try {
        // Re-open the picker each iteration so its module-scoped click handler
        // sets `selectedTrain` for real (window assignment doesn't reach it).
        await page.evaluate(() => {
          const ts = document.getElementById('train-select')
          if (ts) ts.style.display = ''
          // reset filter to ALL so every card is present
          try { if (typeof activeTrainFilter !== 'undefined') activeTrainFilter = 'all' } catch (_) {}
          try { if (typeof buildTrainGrid === 'function') buildTrainGrid() } catch (_) {}
        })
        await wait(400)
        // Click the .tcard whose .tname matches this character's name.
        const clicked = await page.evaluate((name) => {
          const cards = Array.from(document.querySelectorAll('.tcard'))
          const card = cards.find(cd => {
            const t = cd.querySelector('.tname')
            return t && t.textContent.trim() === name
          })
          if (card) { card.click(); return true }
          return false
        }, c.name)
        if (!clicked) { note(c.key, `SKIP: card "${c.name}" not found in picker`); continue }

        // Wait for initPixi + PIXI.Assets.load + composite. Then freeze + clear modals.
        await wait(2800)
        await page.evaluate(() => {
          try { if (typeof gameRunning !== 'undefined') gameRunning = false } catch (_) {}
          document.querySelectorAll('[class*="station"],[class*="arrival"],[class*="daily"],[id*="modal"]').forEach(el => {
            try { el.style.display = 'none' } catch (_) {}
          })
        })
        await wait(300)
        const out = path.join(OUT, `sprite-${c.key}.png`)
        await page.screenshot({ path: out, clip: { x: 0, y: 360, width: 380, height: 340 } })
        note(c.key, `${c.name} faces=${c.faces} sprite=${c.sprite} → ${path.basename(out)}`)
      } catch (e) {
        note(c.key, `FAIL: ${e.message}`)
      }
    }

    if (errs.length) note('console', `${errs.length} errors: ${errs.slice(0, 3).join(' | ').slice(0, 200)}`)
    await page.close()
  } finally {
    await browser.close()
  }

  console.log('\n── DONE ──────────────────────────────────────────────────────')
  console.log(`captured ${findings.filter(f => f.key !== 'setup' && f.key !== 'console').length} sprite screens`)
  console.log(`output: ${OUT}`)
  console.log('NEXT: READ each sprite-*.png and confirm no mutilation / correct sprite / faces right.')
}

main().catch(e => { console.error(e); process.exit(1) })
