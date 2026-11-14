#!/usr/bin/env node
// qa-no-third-party — audit 2026-11-14 S1/S3/S4 (docs/audit/): the game works without any other host, and never sends
// the child's device to one.
//   L1 loading the hub and every game page makes 0 requests to another origin (fonts, CDN scripts, sprite hosts)
//   L2 with every other origin blocked, the display fonts still load (document.fonts has a loaded face for the
//      family the page's buttons use)
//   L3 the hub gets PixiJS from its own origin (window.PIXI after loadPixiJS)
// Film packs under games/film/ are third-party bundles and are not walked.
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-no-third-party.mjs   [QA_ONLY=regex]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const ORIGIN = new URL(BASE).origin
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const pages = ['index.html', ...fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html') && !f.startsWith('_')).map(f => 'games/' + f)]
  .filter(p => !process.env.QA_ONLY || new RegExp(process.env.QA_ONLY).test(p))
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const out = {}, noFont = []
for (const pg of pages) {
  const c = await b.createBrowserContext(), p = await c.newPage()
  await p.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true })
  await p.setRequestInterception(true)
  const ext = new Set()
  p.on('request', r => {
    const u = r.url()
    if (/^(data|blob|about|chrome-extension):/.test(u) || u.startsWith(ORIGIN)) return r.continue()
    ext.add(new URL(u).host); r.abort()
  })
  await p.evaluateOnNewDocument(() => {
    if (sessionStorage.__s) return
    localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: 'lion', ageTier: 'tumbuh' }]))
    localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
  })
  try { await p.goto(BASE + '/' + pg, { waitUntil: 'load', timeout: 60000 }) } catch (e) { ext.add('LOAD-FAIL ' + e.message.slice(0, 60)) }
  await sleep(2500)
  const font = await p.evaluate(async () => {
    try { await document.fonts.ready } catch (e) {}
    const used = new Set()
    for (const el of document.querySelectorAll('button, h1, h2, .title, body')) used.add(getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g, '').trim())
    // force each family the page asks for: a declared face loads (from this origin, others are blocked), an
    // undeclared one resolves to [] and the browser silently draws a fallback font
    const want = [...used].filter(f => /fredoka|nunito|baloo|cinzel|lora/i.test(f)), missing = []
    for (const f of want) { let got = []; try { got = await document.fonts.load(`700 24px "${f}"`, 'Ab') } catch (e) {} if (!got.length) missing.push(f) }
    return { want, missing }
  })
  if (font.missing.length) noFont.push(`${pg}: ${font.missing.join(',')}`)
  if (pg === 'index.html') {
    const pixi = await p.evaluate(() => new Promise(res => { if (typeof loadPixiJS !== 'function') return res('no loadPixiJS'); loadPixiJS(() => res(typeof PIXI !== 'undefined' ? 'PIXI ' + PIXI.VERSION : 'no PIXI')); setTimeout(() => res(typeof PIXI !== 'undefined' ? 'PIXI ' + PIXI.VERSION : 'timeout'), 8000) }))
    ok(/^PIXI 8/.test(pixi), `L3 hub loads PixiJS from its own origin (${pixi})`)
  }
  if (ext.size) out[pg] = [...ext]
  await c.close()
}
await b.close()
const bad = Object.entries(out)
ok(!bad.length, `L1 ${pages.length} pages, ${bad.length} ask another host${bad.length ? ': ' + bad.map(([k, v]) => k + ' -> ' + v.join(' ')).join(' | ') : ''}`)
ok(!noFont.length, `L2 display fonts load with other hosts blocked${noFont.length ? ' - missing on ' + noFont.join(' | ') : ''}`)
console.log(`qa-no-third-party: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
