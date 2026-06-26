#!/usr/bin/env node
/* =============================================================================
 * tools/touch-target-audit.mjs   (v55.23 — touch-target sizing audit)
 * =============================================================================
 * Audits every <button>, <a>, role="button", and common .btn / .ctrl-btn class
 * across all 14 game HTMLs + index home for ≥ 44×44px tap targets (Apple HIG
 * minimum, Material Design recommendation for child UX).
 *
 * For each page:
 *   - Navigate, settle, optionally tap into game state
 *   - For every clickable element with offsetParent !== null:
 *     - Measure getBoundingClientRect width × height
 *     - Flag if either dimension < 44
 *   - Report: page → list of small targets with label + size
 *
 * Output: tools/qa-screenshots/touch-NN-*.png + console findings.
 * Usage:  node tools/touch-target-audit.mjs   (requires :8081 server)
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
const MIN_TAP = 44

const findings = []
function note(test, msg) { console.log(`  [${test}] ${msg}`); findings.push({ test, msg }) }

async function measureClickables(page) {
  return await page.evaluate((MIN) => {
    const SEL = 'button, a, [role="button"], .btn, .ctrl-btn, .cat-btn, .train-card, .ts-card, .veh-card, .train-card-train, .choice-btn'
    const all = Array.from(document.querySelectorAll(SEL))
    const small = []
    for (const el of all) {
      if (el.offsetParent === null) continue
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      if (r.width < MIN || r.height < MIN) {
        const label = (el.textContent || '').trim().slice(0, 28) || el.getAttribute('aria-label') || el.id || el.className.split(' ')[0] || el.tagName
        small.push({ label, w: Math.round(r.width), h: Math.round(r.height), tag: el.tagName.toLowerCase() })
      }
    }
    return { total: all.filter(e => e.offsetParent !== null).length, small }
  }, MIN_TAP)
}

async function main() {
  console.log(`── touch-target-audit v55.23 (≥ ${MIN_TAP}×${MIN_TAP}px) ────────────`)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  const TARGETS = [
    { id: 'T01', label: 'index home',          url: '/index.html',          settle: 2200 },
    { id: 'T02', label: 'g6 vehicle picker',   url: '/games/g6.html',       settle: 1800 },
    { id: 'T03', label: 'g13c team picker',    url: '/games/g13c-pixi.html',settle: 2200 },
    { id: 'T04', label: 'g14 category picker', url: '/games/g14.html',      settle: 1800, prep: async (page) => {
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('.cat-btn'))
            .find(b => /Karakter Spesial/i.test(b.textContent || ''))
          if (btn) btn.click()
        })
        await wait(500)
      }
    },
    { id: 'T05', label: 'g14-side intro',      url: '/games/g14-side.html', settle: 2200 },
    { id: 'T06', label: 'g15 train picker',    url: '/games/g15-pixi.html', settle: 1800 },
    { id: 'T07', label: 'g16 train picker',    url: '/games/g16-pixi.html', settle: 1800 },
    { id: 'T08', label: 'g17 intro',           url: '/games/g17-pixi.html', settle: 2200 },
    { id: 'T09', label: 'g19 splash',          url: '/games/g19-pixi.html', settle: 2000 },
    { id: 'T10', label: 'g20 splash',          url: '/games/g20-pixi.html', settle: 2200 },
    { id: 'T11', label: 'g21 splash',          url: '/games/g21-pixi.html', settle: 2500 },
    { id: 'T12', label: 'g22 splash',          url: '/games/g22-candy.html',settle: 2000 },
    { id: 'T13', label: 'g23 splash',          url: '/games/g23-pixi.html', settle: 2500 },
    { id: 'T14', label: 'g24 splash',          url: '/games/g24-pixi.html', settle: 2500 },
    { id: 'T15', label: 'g25 level picker',    url: '/games/g25-math.html', settle: 1800, prep: async (page) => {
        await page.evaluate(() => {
          const m = Array.from(document.querySelectorAll('button, a, .btn'))
            .find(b => /Main/i.test(b.textContent || ''))
          if (m) m.click()
        })
        await wait(1200)
      }
    },
  ]

  let totalSmall = 0
  try {
    for (const t of TARGETS) {
      const page = await browser.newPage()
      await page.setViewport(VP)
      try {
        await page.goto(`${BASE}${t.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await wait(t.settle)
        if (t.prep) await t.prep(page).catch(() => {})
        const { total, small } = await measureClickables(page)
        totalSmall += small.length
        if (small.length === 0) {
          note(t.id, `${t.label}: ${total} clickables — all ≥ ${MIN_TAP}×${MIN_TAP}px ✓`)
        } else {
          note(t.id, `${t.label}: ${total} clickables, ${small.length} below ${MIN_TAP}px ⚠`)
          for (const s of small.slice(0, 6)) {
            note(t.id, `  • ${s.tag} "${s.label}" ${s.w}×${s.h}px`)
          }
          if (small.length > 6) note(t.id, `  (and ${small.length - 6} more)`)
        }
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
  console.log(`total small-target findings: ${totalSmall}`)
  process.exitCode = totalSmall > 0 ? 1 : 0
}

main().catch(e => { console.error(e); process.exit(1) })
