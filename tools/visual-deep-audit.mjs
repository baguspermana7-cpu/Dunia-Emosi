#!/usr/bin/env node
/* =============================================================================
 * tools/visual-deep-audit.mjs   (v55.21 — deep-interaction probe)
 * =============================================================================
 * Goes BEYOND splash screens. For each of the 8 newly-baseline'd standalone
 * games + index home, taps the start button (or central tap) and captures the
 * mid-gameplay state. Tracks BOTH console.error AND console.warn so we surface
 * silent warnings, not just errors.
 *
 * Output: tools/qa-screenshots/deep-NN-*.png + console findings + warning log.
 * Usage:  node tools/visual-deep-audit.mjs   (requires :8081 server)
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

async function newPage(browser) {
  const page = await browser.newPage()
  await page.setViewport(VP)
  const errs = [], warns = []
  page.on('console', m => {
    if (m.type() === 'error') errs.push(m.text())
    else if (m.type() === 'warning') warns.push(m.text())
  })
  page.on('pageerror', e => errs.push(`PAGEERR: ${e.message}`))
  return { page, errs, warns }
}

async function main() {
  console.log('── visual-deep-audit v55.21 ──────────────────────────────────')

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  // Each entry: id, label, url, settle_after_goto_ms, interaction(page), settle_after_interaction_ms
  const PROBES = [
    {
      id: 'D10', label: 'index home',
      url: '/index.html', preSettle: 2200,
      interact: async (page) => {
        // Tap "MAIN SEKARANG" big button
        const clicked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a, .btn'))
          const m = btns.find(b => /MAIN SEKARANG/i.test(b.textContent || ''))
          if (m) { m.click(); return true }
          return false
        })
        return clicked
      },
      postSettle: 1500,
    },
    {
      id: 'D11', label: 'g6 word racer',
      url: '/games/g6.html', preSettle: 1800,
      interact: async (page) => {
        // Pick a vehicle + difficulty + tap Mulai!
        return await page.evaluate(() => {
          const v = document.querySelector('.veh-card') || document.querySelectorAll('.veh-card')[0]
          if (v) v.click()
          const start = Array.from(document.querySelectorAll('button')).find(b => /Mulai/i.test(b.textContent || ''))
          if (start) { start.click(); return true }
          return false
        })
      },
      postSettle: 2500,
    },
    {
      id: 'D12', label: 'g17 rope-swing',
      url: '/games/g17-pixi.html', preSettle: 2200,
      interact: async (page) => {
        return await page.evaluate(() => {
          const start = Array.from(document.querySelectorAll('button')).find(b => /Mulai/i.test(b.textContent || ''))
          if (start) { start.click(); return true }
          return false
        })
      },
      postSettle: 2500,
    },
    {
      id: 'D13', label: 'g20 duck volley',
      url: '/games/g20-pixi.html', preSettle: 2200,
      interact: async (page) => {
        await page.mouse.click(VP.width / 2, VP.height / 2)
        return true
      },
      postSettle: 2500,
    },
    {
      id: 'D14', label: 'g21 Mario Pokemon',
      url: '/games/g21-pixi.html', preSettle: 2500,
      interact: async (page) => {
        await page.mouse.click(VP.width / 2, VP.height / 2)
        await wait(500)
        await page.mouse.click(VP.width / 2, VP.height / 2)
        return true
      },
      postSettle: 2500,
    },
    {
      id: 'D15', label: 'g22 candy',
      url: '/games/g22-candy.html', preSettle: 2000,
      interact: async (page) => {
        await page.mouse.click(VP.width / 2, VP.height / 2)
        return true
      },
      postSettle: 2500,
    },
    {
      id: 'D16', label: 'g23 runner',
      url: '/games/g23-pixi.html', preSettle: 2500,
      interact: async (page) => {
        await page.mouse.click(VP.width / 2, VP.height / 2)
        await wait(800)
        await page.mouse.click(VP.width / 2, VP.height / 2)
        return true
      },
      postSettle: 3000,
    },
    {
      id: 'D17', label: 'g24 underwater',
      url: '/games/g24-pixi.html', preSettle: 2500,
      interact: async (page) => {
        await page.mouse.click(VP.width / 2, VP.height / 2)
        await wait(500)
        await page.mouse.click(VP.width / 2, VP.height / 2)
        await wait(500)
        await page.mouse.click(VP.width / 2, VP.height / 2)
        return true
      },
      postSettle: 2500,
    },
    {
      id: 'D18', label: 'g25 math',
      url: '/games/g25-math.html', preSettle: 1800,
      interact: async (page) => {
        // Tap "Main" on Soal Matematika card
        return await page.evaluate(() => {
          const m = Array.from(document.querySelectorAll('button, a, .btn'))
            .find(b => /Main/i.test(b.textContent || ''))
          if (m) { m.click(); return true }
          return false
        })
      },
      postSettle: 2500,
    },
  ]

  try {
    for (const t of PROBES) {
      console.log(`${t.id} ${t.label}`)
      const { page, errs, warns } = await newPage(browser)
      try {
        await page.goto(`${BASE}${t.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await wait(t.preSettle)
        const clicked = await t.interact(page).catch(() => false)
        await wait(t.postSettle)
        const slug = t.url.replace(/^\//, '').replace(/\//g, '-').replace(/\.html$/, '')
        await page.screenshot({ path: path.join(OUT, `deep-${t.id.toLowerCase().replace('d', '')}-${slug}.png`) })
        note(t.id, `${t.label}: clicked=${clicked} errs=${errs.length} warns=${warns.length}`)
        if (errs.length) note(t.id, `  ERRs: ${errs.slice(0, 3).join(' | ').slice(0, 240)}`)
        if (warns.length) note(t.id, `  WARNs: ${warns.slice(0, 3).join(' | ').slice(0, 240)}`)
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
  const cleanCount = findings.filter(f => / errs=0 warns=0/.test(f.msg)).length
  console.log(`captured ${findings.length} probe lines; ${cleanCount} fully clean`)
  console.log(`output: ${OUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
