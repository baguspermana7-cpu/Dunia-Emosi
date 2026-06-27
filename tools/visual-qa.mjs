#!/usr/bin/env node
/* =============================================================================
 * tools/visual-qa.mjs   (visual QA pass for G14 train games, v54.98+)
 * v54.99: Pre-sets g14s-tutorial-seen=1 + g14-side-train in evaluateOnNewDocument
 * so the tutorial is dismissed and race starts cleanly for clean screenshots.
 * =============================================================================
 * Launches Puppeteer headless, takes 5 screenshots covering:
 *   1) balapan-kereta.html top-down with Thomas (sprite verification)
 *   2) balapan-kereta-side.html race scene with Thomas
 *   3) balapan-kereta-side.html race scene with Casey JR (PROTECTED)
 *   4) balapan-kereta-side.html finish line with confetti
 *   5) balapan-kereta-side.html ObstacleEngine puzzle overlay
 *
 * Output: tools/qa-screenshots/*.png
 * Usage:  node tools/visual-qa.mjs
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

const findings = []
function log(test, msg) {
  console.log(`[${test}] ${msg}`)
  findings.push({ test, msg })
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    // ── Test 1: balapan-kereta.html top-down Thomas ─────────────────────────────────────
    {
      const page = await browser.newPage()
      await page.setViewport(VP)
      const consoleMsgs = []
      page.on('console', m => consoleMsgs.push(`${m.type()}: ${m.text()}`))
      page.on('pageerror', e => consoleMsgs.push(`PAGEERR: ${e.message}`))

      await page.goto(`${BASE}/games/balapan-kereta.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(700)

      // Click the Karakter Spesial ⭐ category (first cat button)
      const catClicked = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.cat-btn'))
          .find(b => /Karakter Spesial/i.test(b.textContent || ''))
        if (btn) { btn.click(); return true }
        return false
      })
      log('T1', `category Karakter Spesial click=${catClicked}`)
      await wait(500)

      // Click the Thomas card
      const thomasClicked = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.train-card'))
        const t = cards.find(c => /Thomas/i.test(c.textContent || ''))
        if (t) { t.click(); return true }
        return false
      })
      log('T1', `Thomas card click=${thomasClicked}`)
      await wait(400)

      // Click "🚦 Mulai Balapan!"
      const startClicked = await page.evaluate(() => {
        const b = document.getElementById('go-btn')
        if (b && b.style.display !== 'none') { b.click(); return true }
        return false
      })
      log('T1', `start race click=${startClicked}`)

      // Wait through countdown + first race seconds
      await wait(5500)

      const out = path.join(OUT, 'g14-top-thomas.png')
      await page.screenshot({ path: out })
      log('T1', `screenshot saved: ${out}`)

      // Inspect: is player sprite a WebP img (Thomas) or procedural canvas?
      const spriteInfo = await page.evaluate(() => {
        try {
          // S.trainCfg should be set; we want to verify what the renderer chose
          const cfg = (window.S && window.S.trainCfg) || null
          return {
            key: cfg ? cfg.key : null,
            isCharacter: cfg ? cfg.isCharacter : null,
            spriteUrl: cfg ? cfg.spriteUrl : null,
            hasSpriteHelper: typeof window.SpriteCache !== 'undefined' || typeof window.attachSpriteCascade === 'function',
          }
        } catch (e) { return { err: e.message } }
      })
      log('T1', `sprite info: ${JSON.stringify(spriteInfo)}`)
      log('T1', `console: ${consoleMsgs.slice(0, 5).join(' | ')}`)
      await page.close()
    }

    // ── Test 2: balapan-kereta-side.html with Thomas ────────────────────────────────────
    {
      const page = await browser.newPage()
      await page.setViewport(VP)
      const consoleMsgs = []
      page.on('console', m => consoleMsgs.push(`${m.type()}: ${m.text()}`))
      page.on('pageerror', e => consoleMsgs.push(`PAGEERR: ${e.message}`))

      await page.evaluateOnNewDocument(() => {
        sessionStorage.setItem('g14-side-train', 'aeg_thomas')
        localStorage.setItem('g14s-tutorial-seen', '1')
      })
      await page.goto(`${BASE}/games/balapan-kereta-side.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(7200) // 1.9s banner + 3.4s countdown + ~1.9s race

      const out = path.join(OUT, 'g14-side-thomas.png')
      await page.screenshot({ path: out })
      log('T2', `screenshot saved: ${out}`)

      const sceneInfo = await page.evaluate(() => {
        try {
          const S = window.S
          return {
            running: S?.running, distance: S?.distance, speed: S?.speed,
            clouds: (S?.clouds || []).length, birds: (S?.birds || []).length,
            smokePuffs: (S?.smokePuffs || []).length,
            trainCfg: S?.trainCfg?.key,
            timeOfDay: S?.timeOfDay,
            milestonesPassed: S?.milestonesPassed,
            hasOE: !!window.ObstacleEngine,
          }
        } catch (e) { return { err: e.message } }
      })
      log('T2', `scene: ${JSON.stringify(sceneInfo)}`)
      log('T2', `console: ${consoleMsgs.slice(0, 5).join(' | ')}`)
      await page.close()
    }

    // ── Test 3: balapan-kereta-side.html with Casey JR ──────────────────────────────────
    {
      const page = await browser.newPage()
      await page.setViewport(VP)
      const consoleMsgs = []
      page.on('console', m => consoleMsgs.push(`${m.type()}: ${m.text()}`))
      page.on('pageerror', e => consoleMsgs.push(`PAGEERR: ${e.message}`))

      await page.evaluateOnNewDocument(() => {
        sessionStorage.setItem('g14-side-train', 'caseyjr_character')
        localStorage.setItem('g14s-tutorial-seen', '1')
      })
      await page.goto(`${BASE}/games/balapan-kereta-side.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(7200)

      const out = path.join(OUT, 'g14-side-caseyjr.png')
      await page.screenshot({ path: out })
      log('T3', `screenshot saved: ${out}`)

      const sceneInfo = await page.evaluate(() => {
        try {
          return {
            trainCfg: window.S?.trainCfg?.key,
            spriteUrl: window.S?.trainCfg?.spriteUrl,
            isCharacter: window.S?.trainCfg?.isCharacter,
            running: window.S?.running,
          }
        } catch (e) { return { err: e.message } }
      })
      log('T3', `scene: ${JSON.stringify(sceneInfo)}`)
      log('T3', `console: ${consoleMsgs.slice(0, 5).join(' | ')}`)
      await page.close()
    }

    // ── Test 4: balapan-kereta-side.html finish line ────────────────────────────────────
    {
      const page = await browser.newPage()
      await page.setViewport(VP)
      const consoleMsgs = []
      page.on('console', m => consoleMsgs.push(`${m.type()}: ${m.text()}`))
      page.on('pageerror', e => consoleMsgs.push(`PAGEERR: ${e.message}`))

      await page.evaluateOnNewDocument(() => {
        sessionStorage.setItem('g14-side-train', 'aeg_thomas')
        localStorage.setItem('g14s-tutorial-seen', '1')
      })
      await page.goto(`${BASE}/games/balapan-kereta-side.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(5400) // through countdown

      // Fast-forward
      const ff = await page.evaluate(() => {
        if (window.S && window.S.running) { window.S.distance = 998; return true }
        return false
      })
      log('T4', `fast-forward distance set=${ff}`)
      await wait(3000)

      const out = path.join(OUT, 'g14-side-finish.png')
      await page.screenshot({ path: out })
      log('T4', `screenshot saved: ${out}`)

      const sceneInfo = await page.evaluate(() => {
        try {
          return {
            distance: window.S?.distance,
            finished: window.S?.finished,
            finishFlagSpawned: window.S?.finishFlagSpawned,
          }
        } catch (e) { return { err: e.message } }
      })
      log('T4', `scene: ${JSON.stringify(sceneInfo)}`)
      log('T4', `console: ${consoleMsgs.slice(0, 5).join(' | ')}`)
      await page.close()
    }

    // ── Test 5: balapan-kereta-side.html ObstacleEngine puzzle ──────────────────────────
    {
      const page = await browser.newPage()
      await page.setViewport(VP)
      const consoleMsgs = []
      page.on('console', m => consoleMsgs.push(`${m.type()}: ${m.text()}`))
      page.on('pageerror', e => consoleMsgs.push(`PAGEERR: ${e.message}`))

      await page.evaluateOnNewDocument(() => {
        sessionStorage.setItem('g14-side-train', 'aeg_thomas')
        localStorage.setItem('g14s-tutorial-seen', '1')
      })
      await page.goto(`${BASE}/games/balapan-kereta-side.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(5400) // through countdown

      const spawned = await page.evaluate(() => {
        try {
          if (window.ObstacleEngine && typeof window.ObstacleEngine.spawn === 'function') {
            window.ObstacleEngine.spawn('missing_rail_triangle')
            return true
          }
          return false
        } catch (e) { return 'err:' + e.message }
      })
      log('T5', `OE.spawn missing_rail_triangle=${spawned}`)
      await wait(1700)

      const out = path.join(OUT, 'g14-side-obstacle.png')
      await page.screenshot({ path: out })
      log('T5', `screenshot saved: ${out}`)

      const overlayInfo = await page.evaluate(() => {
        const candidates = [
          '.oe-overlay', '.obstacle-overlay', '.oe-card', '.puzzle-card',
          '.oe-question', '#oe-root', '[class*="oe-"]'
        ]
        const seen = {}
        candidates.forEach(sel => {
          const els = document.querySelectorAll(sel)
          if (els.length) seen[sel] = els.length
        })
        const allClasses = new Set()
        document.querySelectorAll('body *').forEach(el => {
          (el.className && typeof el.className === 'string' ? el.className.split(' ') : []).forEach(c => {
            if (c && (c.startsWith('oe-') || c.includes('puzzle') || c.includes('obstacle'))) allClasses.add(c)
          })
        })
        return { seen, allOEClasses: Array.from(allClasses).slice(0, 20), bodyChildren: document.body.children.length }
      })
      log('T5', `overlay: ${JSON.stringify(overlayInfo)}`)
      log('T5', `console: ${consoleMsgs.slice(0, 10).join(' | ')}`)
      await page.close()
    }
  } finally {
    await browser.close()
  }

  console.log('\n── DONE ──────────────────────────────────────────────────────')
  console.log(`Findings: ${findings.length}`)
  console.log(`Output dir: ${OUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
