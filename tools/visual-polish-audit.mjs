#!/usr/bin/env node
/* =============================================================================
 * tools/visual-polish-audit.mjs   (v55.15 — wider polish audit)
 * =============================================================================
 * Captures additional game states beyond the comprehensive-NN-*.png set:
 *   P01 balapan-kereta.html category picker (Karakter Spesial)
 *   P02 balapan-kereta.html race mid-flight (HP + coins + arrows visible)
 *   P03 balapan-kereta.html race finish modal (engagement-index stars)
 *   P04 balapan-kereta-side.html race in progress (PROTECTED Casey)
 *   P05 balapan-kereta-side.html finish line + confetti
 *   P06 lokomotif-pemberani.html in-game (post picker, locomotive on track)
 *   P07 selamatkan-kereta.html in-game (post Casey JR selection)
 *   P08 gym-pokemon.html team picker mid-scroll
 *   P09 pokemon-birds.html post-tap mid-flight
 *
 * Output: tools/qa-screenshots/polish-NN-*.png + console findings.
 * Usage:  node tools/visual-polish-audit.mjs
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
function note(test, msg) { console.log(`  [${test}] ${msg}`); findings.push({ test, msg }) }

async function newPage(browser, before) {
  const page = await browser.newPage()
  await page.setViewport(VP)
  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(`ERR: ${m.text()}`) })
  page.on('pageerror', e => errs.push(`PAGEERR: ${e.message}`))
  if (before) await page.evaluateOnNewDocument(before)
  return { page, errs }
}

async function main() {
  console.log('── visual-polish-audit v55.15 ────────────────────────────────')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    // P01: g14 category picker
    {
      console.log('P01 g14 category picker')
      const { page, errs } = await newPage(browser)
      await page.goto(`${BASE}/games/balapan-kereta.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(900)
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.cat-btn'))
          .find(b => /Karakter Spesial/i.test(b.textContent || ''))
        if (btn) btn.click()
      })
      await wait(500)
      await page.screenshot({ path: path.join(OUT, 'polish-01-g14-picker.png') })
      note('P01', `errors: ${errs.length === 0 ? 'none' : errs.slice(0, 3).join(' | ')}`)
      await page.close()
    }

    // P02: g14 race mid-flight (Casey JR + ↑↓ arrows + HP + coins)
    {
      console.log('P02 g14 race mid-flight')
      const { page, errs } = await newPage(browser)
      await page.goto(`${BASE}/games/balapan-kereta.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(900)
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.cat-btn'))
          .find(b => /Karakter Spesial/i.test(b.textContent || ''))
        if (btn) btn.click()
      })
      await wait(500)
      await page.evaluate(() => {
        const t = Array.from(document.querySelectorAll('.train-card'))
          .find(c => /Casey/i.test(c.textContent || ''))
        if (t) t.click()
      })
      await wait(400)
      await page.evaluate(() => { const b = document.getElementById('go-btn'); if (b) b.click() })
      await wait(6500)
      await page.screenshot({ path: path.join(OUT, 'polish-02-g14-race.png') })
      const state = await page.evaluate(() => {
        try {
          return {
            distance: typeof S !== 'undefined' ? Math.round(S.distance || 0) : null,
            hp: typeof S !== 'undefined' ? S.hp : null,
            coins: typeof S !== 'undefined' ? S.coins : null,
            position: typeof S !== 'undefined' ? S.position : null,
          }
        } catch (e) { return { err: e.message } }
      })
      note('P02', `state: ${JSON.stringify(state)}; errs: ${errs.length}`)
      await page.close()
    }

    // P03: g14 race finish (force distance + capture modal)
    {
      console.log('P03 g14 race finish modal')
      const { page, errs } = await newPage(browser)
      await page.goto(`${BASE}/games/balapan-kereta.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(900)
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('.cat-btn'))
          .find(b => /Karakter Spesial/i.test(b.textContent || ''))
        if (btn) btn.click()
      })
      await wait(500)
      await page.evaluate(() => {
        const t = Array.from(document.querySelectorAll('.train-card'))
          .find(c => /Casey/i.test(c.textContent || ''))
        if (t) t.click()
      })
      await wait(400)
      await page.evaluate(() => { const b = document.getElementById('go-btn'); if (b) b.click() })
      await wait(5800)
      // Fast-forward to finish line + simulate some engagement
      await page.evaluate(() => {
        if (typeof S !== 'undefined') {
          S.distance = (S.distanceTarget || 1000) + 50
          S.coins = (S.coins || 0) + 12
          S.dodgeCount = (S.dodgeCount || 0) + 8
          S.puzzlesSolved = (S.puzzlesSolved || 0) + 2
        }
      })
      await wait(3500) // let finish + modal render
      await page.screenshot({ path: path.join(OUT, 'polish-03-g14-finish.png') })
      const final = await page.evaluate(() => {
        try {
          return {
            finished: typeof S !== 'undefined' ? S.finished : null,
            position: typeof S !== 'undefined' ? S.position : null,
            coins: typeof S !== 'undefined' ? S.coins : null,
            dodgeCount: typeof S !== 'undefined' ? S.dodgeCount : null,
            puzzlesSolved: typeof S !== 'undefined' ? S.puzzlesSolved : null,
            modalVisible: !!document.querySelector('#end-modal, .end-modal, [class*="end"]'),
          }
        } catch (e) { return { err: e.message } }
      })
      note('P03', `final: ${JSON.stringify(final)}; errs: ${errs.length}`)
      await page.close()
    }

    // P04: g14-side race (Casey)
    {
      console.log('P04 g14-side race with Casey JR')
      const { page, errs } = await newPage(browser, () => {
        sessionStorage.setItem('g14-side-train', 'caseyjr_character')
        localStorage.setItem('g14s-tutorial-seen', '1')
      })
      await page.goto(`${BASE}/games/balapan-kereta-side.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(7000)
      await page.screenshot({ path: path.join(OUT, 'polish-04-g14side-casey.png') })
      note('P04', `errs: ${errs.length === 0 ? 'none' : errs.slice(0, 3).join(' | ')}`)
      await page.close()
    }

    // P05: g14-side finish
    {
      console.log('P05 g14-side finish line')
      const { page, errs } = await newPage(browser, () => {
        sessionStorage.setItem('g14-side-train', 'caseyjr_character')
        localStorage.setItem('g14s-tutorial-seen', '1')
      })
      await page.goto(`${BASE}/games/balapan-kereta-side.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(5400)
      await page.evaluate(() => { if (typeof S !== 'undefined') S.distance = 998 })
      await wait(3200)
      await page.screenshot({ path: path.join(OUT, 'polish-05-g14side-finish.png') })
      note('P05', `errs: ${errs.length === 0 ? 'none' : errs.slice(0, 3).join(' | ')}`)
      await page.close()
    }

    // P06: g15-pixi after click into game
    {
      console.log('P06 g15-pixi in-game (Casey JR pick)')
      const { page, errs } = await newPage(browser)
      await page.goto(`${BASE}/games/lokomotif-pemberani.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(2000)
      await page.evaluate(() => {
        // Click Casey JR card if a click handler is bound via class
        const card = document.querySelector('.train-card[data-key*="casey"]') ||
                     document.querySelector('[onclick*="selectTrain"]') ||
                     document.querySelectorAll('.train-card')[0]
        if (card) card.click()
      })
      await wait(500)
      // Try a "Start" / "Mulai" button
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, .btn'))
        const start = btns.find(b => /Mulai|Start|Main/i.test(b.textContent || ''))
        if (start) start.click()
      })
      await wait(3000)
      await page.screenshot({ path: path.join(OUT, 'polish-06-g15-ingame.png') })
      note('P06', `errs: ${errs.length === 0 ? 'none' : errs.slice(0, 3).join(' | ')}`)
      await page.close()
    }

    // P07: g16-pixi after Casey pick
    {
      console.log('P07 g16-pixi in-game')
      const { page, errs } = await newPage(browser)
      await page.goto(`${BASE}/games/selamatkan-kereta.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(2000)
      await page.evaluate(() => {
        const card = document.querySelector('.ts-card') // first card = Casey JR
        if (card) card.click()
      })
      await wait(400)
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'))
        const start = btns.find(b => /Mulai|Start|Main/i.test(b.textContent || ''))
        if (start) start.click()
      })
      await wait(3500)
      await page.screenshot({ path: path.join(OUT, 'polish-07-g16-ingame.png') })
      note('P07', `errs: ${errs.length === 0 ? 'none' : errs.slice(0, 3).join(' | ')}`)
      await page.close()
    }

    // P08: g13c team picker scrolled
    {
      console.log('P08 g13c-pixi team picker')
      const { page, errs } = await newPage(browser)
      await page.goto(`${BASE}/games/gym-pokemon.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(2000)
      await page.screenshot({ path: path.join(OUT, 'polish-08-g13c-picker.png') })
      note('P08', `errs: ${errs.length === 0 ? 'none' : errs.slice(0, 3).join(' | ')}`)
      await page.close()
    }

    // P09: g19 mid-flight after a tap
    {
      console.log('P09 g19-pixi mid-flight')
      const { page, errs } = await newPage(browser)
      await page.goto(`${BASE}/games/pokemon-birds.html`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await wait(2000)
      // Tap centre to start
      await page.mouse.click(VP.width / 2, VP.height / 2)
      await wait(700)
      await page.mouse.click(VP.width / 2, VP.height / 2)
      await wait(700)
      await page.mouse.click(VP.width / 2, VP.height / 2)
      await wait(1200)
      await page.screenshot({ path: path.join(OUT, 'polish-09-g19-flight.png') })
      note('P09', `errs: ${errs.length === 0 ? 'none' : errs.slice(0, 3).join(' | ')}`)
      await page.close()
    }

    // ── v55.17 EXTENSION — 9 more screens for index + 8 untouched games ────
    // Capture each at first paint after a short settle. No deep interactions —
    // we want to catch console errors / 404s / boot-time visual nits.

    const EXTRA = [
      { id: 'P10', label: 'index home',        url: '/index.html',          settle: 2200 },
      { id: 'P11', label: 'g6 word racer',     url: '/games/mobil.html',       settle: 1800 },
      { id: 'P12', label: 'g17 rope-swing',    url: '/games/jembatan-goyang.html', settle: 2200 },
      { id: 'P13', label: 'g20 duck volley',   url: '/games/ducky-volley.html', settle: 2200 },
      { id: 'P14', label: 'g21 Mario Pokemon', url: '/games/mario-pokemon.html', settle: 2500 },
      { id: 'P15', label: 'g22 candy',         url: '/games/monster-candy.html',settle: 2000 },
      { id: 'P16', label: 'g23 runner',        url: '/games/pokemon-run.html', settle: 2500 },
      { id: 'P17', label: 'g24 underwater',    url: '/games/pokemon-bawah-laut.html', settle: 2500 },
      { id: 'P18', label: 'g25 math',          url: '/games/kuis-matematika.html', settle: 1800 },
    ]
    for (const t of EXTRA) {
      console.log(`${t.id} ${t.label}`)
      const { page, errs } = await newPage(browser)
      try {
        await page.goto(`${BASE}${t.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await wait(t.settle)
        const slug = t.url.replace(/^\//, '').replace(/\//g, '-').replace(/\.html$/, '')
        const out = path.join(OUT, `polish-${t.id.toLowerCase().replace('p', '')}-${slug}.png`)
        await page.screenshot({ path: out })
        note(t.id, `${t.label}: errs=${errs.length === 0 ? 'none' : errs.slice(0, 3).join(' | ')}`)
      } catch (e) {
        note(t.id, `FAIL ${t.label}: ${e.message}`)
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }

  console.log('\n── DONE ──────────────────────────────────────────────────────')
  console.log(`captured ${findings.length} screens to: ${OUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
