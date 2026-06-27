#!/usr/bin/env node
/* =============================================================================
 * tools/verify-v5545.mjs — M-302 visual verification for v55.45 train polish
 * =============================================================================
 * Drives the REAL picker + race (not window.x=) and screenshots:
 *   1. g14 picker grid          → every train faces RIGHT (B-229)
 *   2. g14 in-race (Thomas pick) → wheels on rail, uniform height, scenery fills (B-230/231/232)
 *   3. g14 nav buttons          → up ≠ down pastel (B-234)
 *   4. g14 boost quiz x12        → plain arithmetic, operands ≤ 20 (B-233/B-235)
 *   5. g15 + g16 pickers         → trains face RIGHT (B-229)
 * Saves PNGs to tools/qa-screenshots/v5545-*.png and prints PASS/FAIL on the
 * automatable checks (boost math). Visual checks need a human/agent to READ.
 * ========================================================================== */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'qa-screenshots')
const BASE = 'http://localhost:8081/games'
const VP = { width: 412, height: 915, deviceScaleFactor: 1 }
const wait = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
  const results = []
  const log = (s) => { console.log(s); results.push(s) }
  try {
    const page = await browser.newPage()
    await page.setViewport(VP)
    const errs = []
    page.on('pageerror', e => errs.push(String(e)))
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()) })

    // ── g14 picker ──────────────────────────────────────────
    await page.goto(`${BASE}/balapan-kereta.html`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.querySelectorAll('.cat-btn').length > 0, { timeout: 8000 })
    // open the Thomas & Friends category (has the AEG chars)
    const catClicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.cat-btn')]
      const thomas = btns.find(b => /thomas|aeg|friend/i.test(b.textContent)) || btns[btns.length - 1]
      if (thomas) { thomas.click(); return thomas.textContent.trim() }
      return null
    })
    await wait(700)
    await page.screenshot({ path: path.join(OUT, 'v5545-01-g14-picker.png') })
    log(`[01] g14 picker opened cat="${catClicked}" → v5545-01-g14-picker.png`)

    // pick a known left-facing char (Thomas) so we exercise the mirror in-race
    const picked = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.train-card')]
      // find the card whose name contains Thomas; else first character card
      const card = cards.find(c => /thomas/i.test(c.textContent)) || cards.find(c => c.classList.contains('is-character')) || cards[0]
      if (!card) return null
      card.click()
      return card.querySelector('.train-nm') ? card.querySelector('.train-nm').textContent : 'card'
    })
    await wait(300)
    log(`[02] picked train="${picked}"`)

    // start the race
    await page.evaluate(() => { const g = document.getElementById('go-btn'); if (g) g.click() })
    await wait(2500)  // let sprite load + race begin
    await page.screenshot({ path: path.join(OUT, 'v5545-03-g14-race.png') })
    log(`[03] g14 race running → v5545-03-g14-race.png (CHECK: wheels on rail, uniform, scenery fills, train faces RIGHT)`)

    // nav button colors (B-234)
    const navColors = await page.evaluate(() => {
      const up = document.getElementById('btn-up'), dn = document.getElementById('btn-dn')
      const c = el => el ? getComputedStyle(el).backgroundImage.slice(0, 60) : null
      return { up: c(up), dn: c(dn), differ: c(up) !== c(dn) }
    })
    log(`[04] nav up≠down: ${navColors.differ ? 'PASS' : 'FAIL'}  up=${navColors.up}  dn=${navColors.dn}`)

    // boost quiz math (B-233 + B-235): build 12 quizzes, capture question text
    const mathCheck = await page.evaluate(() => {
      const out = []
      for (let i = 0; i < 12; i++) {
        try { window.buildQuiz && window.buildQuiz() } catch (e) { return { err: String(e) } }
        const q = document.getElementById('quiz-q')
        if (q) out.push(q.textContent)
      }
      return { qs: out }
    })
    let mathPass = true, mathWhy = []
    if (mathCheck.err) { mathPass = false; mathWhy.push('buildQuiz threw: ' + mathCheck.err) }
    else {
      for (const q of mathCheck.qs) {
        // plain arithmetic form "a OP b = ?" only (no letters beyond the operator words)
        if (/[A-Za-z]/.test(q.replace(/=|\?/g, ''))) { mathPass = false; mathWhy.push('non-plain: ' + q) }
        const nums = (q.match(/\d+/g) || []).map(Number)
        if (nums.some(n => n > 20)) { mathPass = false; mathWhy.push('operand>20: ' + q) }
        if (nums.some(n => n >= 100)) { mathPass = false; mathWhy.push('3-digit: ' + q) }
      }
    }
    log(`[05] boost math (12 samples): ${mathPass ? 'PASS' : 'FAIL'}`)
    log(`     samples: ${mathCheck.qs ? mathCheck.qs.slice(0, 6).join(' | ') : 'none'}`)
    if (!mathPass) mathWhy.slice(0, 5).forEach(w => log('     ✗ ' + w))
    await page.screenshot({ path: path.join(OUT, 'v5545-05-g14-boost.png') })

    await page.close()

    // ── g15 picker ──────────────────────────────────────────
    const p15 = await browser.newPage(); await p15.setViewport(VP)
    await p15.goto(`${BASE}/lokomotif-pemberani.html`, { waitUntil: 'domcontentloaded' })
    await p15.waitForFunction(() => document.querySelectorAll('.tcard').length > 0, { timeout: 8000 }).catch(() => {})
    await wait(800)
    await p15.screenshot({ path: path.join(OUT, 'v5545-06-g15-picker.png') })
    log(`[06] g15 picker → v5545-06-g15-picker.png (CHECK: all trains face RIGHT)`)
    await p15.close()

    // ── g16 picker ──────────────────────────────────────────
    const p16 = await browser.newPage(); await p16.setViewport(VP)
    await p16.goto(`${BASE}/selamatkan-kereta.html`, { waitUntil: 'domcontentloaded' })
    await p16.waitForFunction(() => document.querySelectorAll('#ts-trains > *').length > 0, { timeout: 8000 }).catch(() => {})
    await wait(1000)
    await p16.screenshot({ path: path.join(OUT, 'v5545-07-g16-picker.png') })
    log(`[07] g16 picker → v5545-07-g16-picker.png (CHECK: all trains face RIGHT)`)
    await p16.close()

    log('')
    log(`pageerrors during g14 run: ${errs.length === 0 ? 'NONE' : errs.slice(0, 5).join(' ;; ')}`)
    log(`OVERALL automatable: nav=${navColors.differ ? 'PASS' : 'FAIL'} math=${mathPass ? 'PASS' : 'FAIL'} errors=${errs.length}`)
  } finally {
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exit(1) })
