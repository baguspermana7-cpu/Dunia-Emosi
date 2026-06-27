#!/usr/bin/env node
/* =============================================================================
 * tools/perf-audit.mjs   (v55.25 — load-time performance audit)
 * =============================================================================
 * Measures load-to-interactive time per game HTML. A game is "interactive"
 * when:
 *   - For Pixi games: `app` global is defined AND has a renderer
 *   - For DOM games: at least one start button is in the DOM
 *   - Pokemon load games: the loading text element is gone
 *
 * Reports per-page:
 *   - DOMContentLoaded (DCL)
 *   - First Pixi/start surface ready (interactive)
 *   - Total page weight (bytes transferred from server log)
 *
 * Budget: ≤ 3000ms to interactive on local server. Flags any page over.
 *
 * Usage: node tools/perf-audit.mjs   (requires :8081 server)
 * ========================================================================== */
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'http://localhost:8081'
const BUDGET_MS = 3000
const VP = { width: 412, height: 915, deviceScaleFactor: 1 }
const wait = (ms) => new Promise(r => setTimeout(r, ms))

const TARGETS = [
  { id: 'F01', label: 'index home',          url: '/index.html',
    ready: () => !!document.querySelector('#screen-home') || !!document.querySelector('.game-grid, .home-actions, [class*="home"]') },
  { id: 'F02', label: 'g6 word racer',       url: '/games/g6.html',
    ready: () => !!document.querySelector('.veh-card') || !!document.querySelector('#btn-back') },
  { id: 'F03', label: 'g13c team picker',    url: '/games/g13c-pixi.html',
    ready: () => !!document.querySelector('#package-picker, [class*="package"], .pkg-card') || (typeof window._pokeDB !== 'undefined') },
  { id: 'F04', label: 'g14 category picker', url: '/games/g14.html',
    ready: () => document.querySelectorAll('.cat-btn').length > 0 },
  { id: 'F05', label: 'g14-side intro',      url: '/games/g14-side.html',
    ready: () => !!document.querySelector('canvas') },
  { id: 'F06', label: 'g15 train picker',    url: '/games/g15-pixi.html',
    ready: () => typeof app !== 'undefined' && app && app.renderer },
  { id: 'F07', label: 'g16 train picker',    url: '/games/g16-pixi.html',
    ready: () => document.querySelectorAll('#ts-trains .ts-card, #ts-trains > *').length > 0 },
  { id: 'F08', label: 'g17 intro',           url: '/games/g17-pixi.html',
    ready: () => !!document.querySelector('button') },
  { id: 'F09', label: 'g19 splash',          url: '/games/g19-pixi.html',
    ready: () => !!document.querySelector('canvas') },
  { id: 'F10', label: 'g20 splash',          url: '/games/g20-pixi.html',
    ready: () => !!document.querySelector('canvas') },
  { id: 'F11', label: 'g21 splash',          url: '/games/g21-pixi.html',
    ready: () => !!document.querySelector('canvas') || !!document.querySelector('.hud-btn') },
  { id: 'F12', label: 'g22 candy',           url: '/games/g22-candy.html',
    ready: () => !!document.querySelector('canvas') },
  { id: 'F13', label: 'g23 runner',          url: '/games/g23-pixi.html',
    ready: () => !!document.querySelector('canvas') },
  { id: 'F14', label: 'g24 underwater',      url: '/games/g24-pixi.html',
    ready: () => !!document.querySelector('canvas') },
  { id: 'F15', label: 'g25 math',            url: '/games/g25-math.html',
    ready: () => !!document.querySelector('button, .btn, .mode-card') },
]

async function main() {
  console.log(`── perf-audit v55.25 (budget ≤ ${BUDGET_MS}ms to interactive) ──`)
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  const results = []
  try {
    for (const t of TARGETS) {
      const page = await browser.newPage()
      await page.setViewport(VP)
      let bytes = 0
      const responses = []
      page.on('response', async (r) => {
        try {
          const len = parseInt(r.headers()['content-length'] || '0', 10)
          if (Number.isFinite(len)) bytes += len
          responses.push({ url: r.url(), status: r.status() })
        } catch {}
      })
      try {
        const t0 = Date.now()
        await page.goto(`${BASE}${t.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
        const dcl = Date.now() - t0
        const interactive = await Promise.race([
          page.waitForFunction(t.ready, { timeout: BUDGET_MS + 2000, polling: 100 })
            .then(() => Date.now() - t0)
            .catch(() => -1),
        ])
        const inBudget = interactive >= 0 && interactive <= BUDGET_MS
        const kb = (bytes / 1024).toFixed(0)
        const fmt = (n) => n >= 0 ? `${n}ms` : 'timeout'
        const tag = inBudget ? 'OK ' : (interactive < 0 ? 'TIMEOUT' : 'OVER')
        console.log(`  [${t.id}] ${tag} ${t.label.padEnd(22)} DCL=${fmt(dcl).padEnd(7)} interactive=${fmt(interactive).padEnd(8)} weight=${kb}kB`)
        results.push({ id: t.id, dcl, interactive, kb, inBudget })
      } catch (e) {
        console.log(`  [${t.id}] FAIL ${t.label}: ${e.message}`)
        results.push({ id: t.id, err: e.message })
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }

  console.log('\n── SUMMARY ───────────────────────────────────────────────────')
  const ok = results.filter(r => r.inBudget).length
  const over = results.filter(r => r.interactive > BUDGET_MS).length
  const failed = results.filter(r => r.err || r.interactive < 0).length
  const totalKb = results.reduce((s, r) => s + parseFloat(r.kb || 0), 0)
  console.log(`OK=${ok}  OVER=${over}  FAIL=${failed}  TOTAL=${results.length}  page-weights sum=${totalKb.toFixed(0)}kB`)
  process.exitCode = (over + failed) > 0 ? 1 : 0
}

main().catch(e => { console.error(e); process.exit(1) })
