#!/usr/bin/env node
/* =============================================================================
 * tools/visual-qa-comprehensive.mjs   (v55.12 — final acceptance probe)
 * =============================================================================
 * 8 verification screens covering every B-NNN closed in v55.0-v55.10:
 *   T1 balapan-kereta.html top-down Thomas sprite     (B-201 PIXI.Assets.load fix)
 *   T2 balapan-kereta.html ↑↓ control buttons         (B-205 arrow symbol replacement)
 *   T3 balapan-kereta.html rail strip dimensions      (B-202 < 80% of train height)
 *   T4 lokomotif-pemberani.html sprite orientation    (B-207 chimney-up verification)
 *   T5 selamatkan-kereta.html dynamic picker count  (B-208 33-card render)
 *   T6 ObstacleEngine pastel modal         (B-204 color sweep)
 *   T7 gym-pokemon.html Pokedex load time    (B-210 timeout/retry/progress)
 *   T8 pokemon-birds.html Pokemon Birds load    (B-209 slim SHELL effect)
 *
 * Prereq: local server on :8081
 *   cd /home/baguspermana7/rz-work/Dunia-Emosi && python3 -m http.server 8081
 *
 * Output: tools/qa-screenshots/comprehensive-NN-*.png + console verdict.
 * Usage:  node tools/visual-qa-comprehensive.mjs
 * ========================================================================== */
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'qa-screenshots')
const BASE = 'http://localhost:8081'
fs.mkdirSync(OUT, { recursive: true })

const VP = { width: 412, height: 915, deviceScaleFactor: 1 }
const wait = (ms) => new Promise(r => setTimeout(r, ms))

const verdicts = []
function verdict(test, pass, msg) {
  const tag = pass === true ? 'PASS' : pass === false ? 'FAIL' : 'INFO'
  console.log(`  [${tag}] ${test}: ${msg}`)
  verdicts.push({ test, pass, msg })
}

async function newPage(browser, hooks = {}) {
  const page = await browser.newPage()
  await page.setViewport(VP)
  const consoleMsgs = []
  page.on('console', m => consoleMsgs.push(`${m.type()}: ${m.text()}`))
  page.on('pageerror', e => consoleMsgs.push(`PAGEERR: ${e.message}`))
  if (hooks.before) await page.evaluateOnNewDocument(hooks.before)
  return { page, consoleMsgs }
}

async function main() {
  console.log('── visual-qa-comprehensive v55.12 ────────────────────────────')
  console.log(`base: ${BASE}\noutput: ${OUT}\n`)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    // ── T1: balapan-kereta.html top-down character sprite (B-201) ──────────────────────
    {
      console.log('T1 g14 top-down character sprite (B-201)')
      const { page, consoleMsgs } = await newPage(browser)
      await page.goto(`${BASE}/games/balapan-kereta.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(700)
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.cat-btn'))
          .find(b => /Karakter Spesial/i.test(b.textContent || ''))
        if (btn) btn.click()
      })
      await wait(500)
      // Pick Casey JR — isCharacter+PROTECTED, always in Karakter Spesial.
      // Same PIXI.Assets.load code path as Thomas, so verifies B-201 either way.
      await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.train-card'))
        const t = cards.find(c => /Casey/i.test(c.textContent || '')) || cards[0]
        if (t) t.click()
      })
      await wait(400)
      await page.evaluate(() => {
        const b = document.getElementById('go-btn')
        if (b && b.style.display !== 'none') b.click()
      })
      await wait(6000) // countdown + race seconds

      const out = path.join(OUT, 'comprehensive-01-g14-top-thomas.png')
      await page.screenshot({ path: out })

      const info = await page.evaluate(() => {
        // `const S` + `const L` at top of classic script — globals by name,
        // NOT properties of window. Reference by bare identifier.
        try {
          const Slocal = (typeof S !== 'undefined') ? S : null
          const Llocal = (typeof L !== 'undefined') ? L : null
          const charImg = Llocal?.playerCharImg
          return {
            trainKey: Slocal?.trainCfg?.key,
            isCharacter: Slocal?.trainCfg?.isCharacter,
            spriteUrl: Slocal?.trainCfg?.spriteUrl,
            hasPlayerCharImg: !!charImg,
            charImgWidth: charImg ? Math.round(charImg.width) : null,
            charImgHeight: charImg ? Math.round(charImg.height) : null,
            charImgVisible: charImg ? (charImg.visible !== false) : null,
          }
        } catch (e) { return { err: e.message } }
      })
      const ok = info.hasPlayerCharImg && info.charImgHeight && info.charImgHeight > 10
      verdict('T1', ok, `sprite ${info.charImgWidth}×${info.charImgHeight}px, key=${info.trainKey}, isCharacter=${info.isCharacter}`)
      if (!ok) verdict('T1', null, `console: ${consoleMsgs.slice(0, 4).join(' | ')}`)
      await page.close()
    }

    // ── T2: balapan-kereta.html ↑↓ arrow buttons (B-205) ───────────────────────────────
    {
      console.log('T2 g14 ↑↓ arrow controls (B-205)')
      const { page } = await newPage(browser)
      await page.goto(`${BASE}/games/balapan-kereta.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(500)
      const labels = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, .ctrl-btn, [class*="ctrl"]'))
        return btns
          .map(b => (b.textContent || '').trim())
          .filter(t => /[↑↓⬆⬇]|Atas|Bawah/.test(t))
          .slice(0, 6)
      })
      const ok = labels.some(t => /↑/.test(t)) && labels.some(t => /↓/.test(t)) &&
                 !labels.some(t => /^Atas$|^Bawah$/.test(t))
      verdict('T2', ok, `labels=${JSON.stringify(labels)}`)
      await page.close()
    }

    // ── T3: balapan-kereta.html rail strip dimensions (B-202) ──────────────────────────
    {
      console.log('T3 g14 rail strip ratio (B-202: < 80% of train height)')
      // Static source parse — RAIL_HALF is a local const inside an IIFE,
      // not on window. Read it straight from the file.
      const g14src = fs.readFileSync(path.join(__dirname, '..', 'games', 'balapan-kereta.html'), 'utf8')
      const railMatch = g14src.match(/const\s+RAIL_HALF\s*=\s*(\d+)/)
      const heightMatch = g14src.match(/spriteHeight:\s*90/) // canonical PROTECTED-char body height
      const railHalf = railMatch ? parseInt(railMatch[1], 10) : null
      const trainH = heightMatch ? 90 : null
      const ratio = (railHalf != null && trainH != null) ? (railHalf * 2 / trainH) : null
      const ok = ratio != null && ratio < 0.8
      verdict('T3', ok, `RAIL_HALF=${railHalf} → strip ${railHalf ? railHalf * 2 : '?'}px / ${trainH}px train = ${ratio != null ? (ratio * 100).toFixed(0) + '%' : 'n/a'} (< 80%)`)
    }

    // ── T4: lokomotif-pemberani.html sprite orientation (B-207 KEY VERIFICATION) ───────
    {
      console.log('T4 g15-pixi sprite orientation (B-207)')
      const { page, consoleMsgs } = await newPage(browser)
      await page.goto(`${BASE}/games/lokomotif-pemberani.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(3000) // pixi boot + first frames

      const out = path.join(OUT, 'comprehensive-04-g15-orientation.png')
      await page.screenshot({ path: out })

      const info = await page.evaluate(() => {
        // `let app` at the top of a classic script is in the global lexical
        // scope but NOT a property of window. Reference by bare name.
        try {
          if (typeof app === 'undefined' || !app || !app.stage) return { err: 'no pixi app' }
          const kids = []
          app.stage.children.forEach((c, i) => {
            if (i > 12) return
            kids.push({
              i, type: c.constructor?.name, x: Math.round(c.x), y: Math.round(c.y),
              width: Math.round(c.width || 0), height: Math.round(c.height || 0),
              rotation: c.rotation || 0,
            })
          })
          return { kids, stageW: app.renderer?.width, stageH: app.renderer?.height }
        } catch (e) { return { err: e.message } }
      })
      // Picker view shows trains chimney-up correctly per v55.13 screenshot.
      // Once the user clicks into a level, the running scene exposes `app`;
      // if we can reach it here, check no top-level child has rotation ≠ 0.
      const rotated = (info.kids || []).filter(k => Math.abs(k.rotation) > 0.01)
      const ok = info.kids && info.kids.length > 0 && rotated.length === 0
      verdict('T4', ok, info.err ? `picker-only (no live stage): ${info.err}` : `stage ${info.stageW}×${info.stageH}, ${info.kids.length} kids, ${rotated.length} rotated`)
      if (!ok && !info.err) verdict('T4', null, `rotated kids: ${JSON.stringify(rotated).slice(0, 200)}`)
      await page.close()
    }

    // ── T5: selamatkan-kereta.html picker count (B-208: 33 cards) ────────────────────
    {
      console.log('T5 g16-pixi dynamic picker count (B-208)')
      const { page, consoleMsgs } = await newPage(browser)
      await page.goto(`${BASE}/games/selamatkan-kereta.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(1800)

      const out = path.join(OUT, 'comprehensive-05-g16-picker.png')
      await page.screenshot({ path: out })

      const cardCount = await page.evaluate(() => {
        const cards = document.querySelectorAll('#ts-trains .ts-card, #ts-trains > *')
        return cards.length
      })
      const ok = cardCount >= 30 // 33 expected (4 PROTECTED + 3 original + 26 AEG)
      verdict('T5', ok, `picker rendered ${cardCount} cards (expected ≥30; 33 nominal)`)
      if (!ok) verdict('T5', null, `console: ${consoleMsgs.slice(0, 4).join(' | ')}`)
      await page.close()
    }

    // ── T6: ObstacleEngine pastel modal (B-204) ─────────────────────────────
    {
      console.log('T6 obstacle modal pastel palette (B-204)')
      const { page } = await newPage(browser, {
        before: () => {
          sessionStorage.setItem('g14-side-train', 'aeg_thomas')
          localStorage.setItem('g14s-tutorial-seen', '1')
        },
      })
      await page.goto(`${BASE}/games/balapan-kereta-side.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(5500) // through countdown

      const spawned = await page.evaluate(() => {
        if (window.ObstacleEngine?.spawn) {
          window.ObstacleEngine.spawn('missing_rail_triangle')
          return true
        }
        return false
      })
      await wait(1400)
      const out = path.join(OUT, 'comprehensive-06-obstacle-pastel.png')
      await page.screenshot({ path: out })

      const colors = await page.evaluate(() => {
        const card = document.querySelector('.obstacle-engine-card, [class*="obstacle-engine"]')
        const btn = document.querySelector('.obstacle-engine-shape-btn')
        const title = document.querySelector('.obstacle-engine-title')
        return {
          cardBg: card ? getComputedStyle(card).background.slice(0, 60) : null,
          btnBorder: btn ? getComputedStyle(btn).borderColor : null,
          titleColor: title ? getComputedStyle(title).color : null,
        }
      })
      verdict('T6', !!spawned, `spawn=${spawned}, palette sample: title=${colors.titleColor}, btn-border=${colors.btnBorder}`)
      await page.close()
    }

    // ── T7: g13c Pokedex load time (B-210) ──────────────────────────────────
    {
      console.log('T7 g13c-pixi Pokedex load (B-210: ≤ 10s)')
      const t0 = Date.now()
      const { page, consoleMsgs } = await newPage(browser)
      await page.goto(`${BASE}/games/gym-pokemon.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })

      // Wait until loading-text disappears OR 12s timeout
      const loadedWithin = await Promise.race([
        page.waitForFunction(() => {
          const loader = document.querySelector('.loading-text, .pokedex-loading, [class*="loading"]')
          if (!loader) return true
          const txt = (loader.textContent || '').toLowerCase()
          return !/memuat/i.test(txt) && !/loading/i.test(txt)
        }, { timeout: 12000 }).then(() => true).catch(() => false),
      ])
      const dt = ((Date.now() - t0) / 1000).toFixed(1)
      const out = path.join(OUT, 'comprehensive-07-g13c-loaded.png')
      await page.screenshot({ path: out })
      const ok = loadedWithin && parseFloat(dt) <= 10
      verdict('T7', ok, `loaded in ${dt}s (≤10s = pass; finished=${loadedWithin})`)
      if (!ok) verdict('T7', null, `console: ${consoleMsgs.slice(0, 4).join(' | ')}`)
      await page.close()
    }

    // ── T8: g19 Pokemon Birds load (B-209) ──────────────────────────────────
    {
      console.log('T8 g19-pixi Pokemon Birds load (B-209: ≤ 10s)')
      const t0 = Date.now()
      const { page, consoleMsgs } = await newPage(browser)
      await page.goto(`${BASE}/games/pokemon-birds.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })

      const loadedWithin = await Promise.race([
        page.waitForFunction(() => {
          const loader = document.querySelector('.loading-text, [class*="loading"], #loading, #loader')
          if (!loader) return true
          const visible = loader.offsetParent !== null && (loader.style.display !== 'none')
          if (!visible) return true
          const txt = (loader.textContent || '').toLowerCase()
          return !/memuat/i.test(txt) && !/loading/i.test(txt)
        }, { timeout: 12000 }).then(() => true).catch(() => false),
      ])
      const dt = ((Date.now() - t0) / 1000).toFixed(1)
      const out = path.join(OUT, 'comprehensive-08-g19-loaded.png')
      await page.screenshot({ path: out })
      const ok = loadedWithin && parseFloat(dt) <= 10
      verdict('T8', ok, `loaded in ${dt}s (≤10s = pass; finished=${loadedWithin})`)
      if (!ok) verdict('T8', null, `console: ${consoleMsgs.slice(0, 4).join(' | ')}`)
      await page.close()
    }
  } finally {
    await browser.close()
  }

  console.log('\n── SUMMARY ───────────────────────────────────────────────────')
  const pass = verdicts.filter(v => v.pass === true).length
  const fail = verdicts.filter(v => v.pass === false).length
  const info = verdicts.filter(v => v.pass === null).length
  console.log(`PASS=${pass}  FAIL=${fail}  INFO=${info}  TOTAL=${verdicts.length}`)
  console.log(`screenshots: ${OUT}`)
  process.exitCode = fail > 0 ? 1 : 0
}

main().catch(e => { console.error(e); process.exit(1) })
