#!/usr/bin/env node
// qa-hub-boot — game.js is split into games/hub/*.js (audit A-18, v64.57). The split is safe only if the hub still
// boots as one program:
//   L1 the hub loads at 390x844 with 0 pageerror and 0 console.error
//   L2 every top-level function declared in games/hub/*.js is a function on window after load (a part that did not
//      load, or loaded broken, leaves these undefined; the hub itself would only fail when a child taps the tile)
//   L3 G14, G15 and G16 start from the hub through the real path (openLevelSelect -> level dot -> startGameWithLevel ->
//      initGameN) and their page draws: 0 pageerror there, a screenshot that is not one flat colour
// Screenshots: $TMPDIR/qa-hub-boot/g14.png, g15.png, g16.png
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-hub-boot.mjs   (or: node tools/run-gates.mjs --only qa-hub-boot)
import puppeteer from 'puppeteer'
import sharp from 'sharp'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ROOT, HUB_FILES } from './lib/hub-src.mjs'

const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const SHOTS = path.join(process.env.TMPDIR || os.tmpdir(), 'qa-hub-boot')
fs.mkdirSync(SHOTS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }

// The functions the hub parts declare, read from the files on disk (not from index.html: a part that exists but is
// not loaded must fail L2, not drop out of the list).
const partFiles = fs.readdirSync(path.join(ROOT, 'games/hub')).filter(f => f.endsWith('.js')).map(f => 'games/hub/' + f)
const FUNCS = partFiles.flatMap(f => [...fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]))
ok(partFiles.length > 0 && FUNCS.length > 0, `parsed ${FUNCS.length} top-level functions from ${partFiles.length} hub part(s)`)

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
async function openHub () {
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  const errors = [], consoleErrors = []
  p.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)))
  p.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)) })
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    if (!sessionStorage.__seeded) {
      localStorage.clear()
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: 'lion', ageTier: 'cilik' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]')
      sessionStorage.__seeded = 1
    }
  })
  await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 60000 })
  await p.waitForFunction(() => typeof window.openLevelSelect === 'function', { timeout: 30000 }).catch(() => {})
  await sleep(2500)
  return { p, ctx, errors, consoleErrors }
}

// L1 + L2
{
  const { p, ctx, errors, consoleErrors } = await openHub()
  ok(errors.length === 0, `L1 hub: 0 pageerror (${errors.length}${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''})`)
  ok(consoleErrors.length === 0, `L1 hub: 0 console.error (${consoleErrors.length}${consoleErrors.length ? ': ' + consoleErrors.slice(0, 3).join(' | ') : ''})`)
  const missing = await p.evaluate(names => names.filter(n => typeof window[n] !== 'function'), FUNCS)
  ok(missing.length === 0, `L2 ${FUNCS.length - missing.length}/${FUNCS.length} hub-part functions are functions on window${missing.length ? ' - missing: ' + missing.slice(0, 8).join(', ') : ''}`)
  await ctx.close()
}

// L3: each game from the hub, through its real entry, to its own page
const GAMES = [[14, 'games/balapan-kereta.html'], [15, 'games/lokomotif-pemberani.html'], [16, 'games/selamatkan-kereta.html']]
for (const [n, page] of GAMES) {
  const { p, ctx, errors } = await openHub()
  errors.length = 0
  let started = ''
  try {
    await p.evaluate(g => openLevelSelect(g), n)
    const dot = await p.waitForFunction(() => {
      const scr = document.getElementById('screen-level')
      return scr && scr.classList.contains('active') && [...scr.querySelectorAll('*')].find(e => typeof e.onclick === 'function' && /^\s*1\s*$/.test(e.textContent))
    }, { timeout: 15000 }).catch(() => null)
    // caught here: when the entry throws, nothing navigates and this must not crash the gate when the page closes
    const nav = p.waitForNavigation({ waitUntil: 'load', timeout: 60000 }).catch(e => errors.push('navigation: ' + String(e.message || e).slice(0, 120)))
    // the level-1 dot when the level select drew one; otherwise the same call the dot makes
    if (dot && dot.asElement()) await dot.asElement().evaluate(e => e.onclick()); else await p.evaluate(() => startGameWithLevel(1))
    await nav
    started = new URL(p.url()).pathname
  } catch (e) { errors.push('start: ' + String(e.message || e).slice(0, 160)) }
  ok(started.endsWith('/' + page), `L3 G${n}: the hub's entry opens ${page} (at ${started || 'nothing'})`)
  await sleep(3500)
  const file = path.join(SHOTS, `g${n}.png`)
  const buf = await p.screenshot({ path: file })
  const st = await sharp(buf).stats()
  const spread = Math.max(...st.channels.slice(0, 3).map(c => c.stdev))
  ok(spread > 8, `L3 G${n}: the page draws (colour spread ${spread.toFixed(1)}, a blank page is ~0) -> ${file}`)
  ok(errors.length === 0, `L3 G${n}: 0 pageerror from hub to game (${errors.length}${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''})`)
  await ctx.close()
}

await b.close()
console.log(`qa-hub-boot: ${pass} passed, ${fail} failed (${FUNCS.length} hub-part functions, ${HUB_FILES.length} hub files loaded by index.html)`)
process.exit(fail ? 1 : 0)
