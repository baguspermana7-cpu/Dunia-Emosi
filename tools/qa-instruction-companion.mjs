#!/usr/bin/env node
// qa-instruction-companion — PRD-15 (docs/prd/PRD-15-gate-instruksi-tanpa-pendamping.md): a 5-year-old cannot read a
// paragraph, so text that tells the child what to do needs a picture next to it or a voice that reads it.
// Per page (the hub and every game page, first screen, 800x1280 tablet), count visible text blocks longer than 40
// characters that have NO companion:
//   - a picture within 120 px (img / svg / canvas / video / an element with a background-image url), not counting
//     pictures larger than half the screen (backgrounds and the game canvas would otherwise excuse everything), or
//   - the same words spoken through speechSynthesis within the first seconds (recorded, never played).
//   L1 the count per page is printed (this list is the input of PRD-14, narration coverage)
//   L2 ratchet: a page whose count rises above tools/instruction-baseline.json fails; a page that drops is reported so
//      the baseline can be lowered (QA_UPDATE=1 writes the new numbers)
//   L3 red: QA_PLANT=1 inserts one plain paragraph on the hub, which must fail L2; QA_PLANT=pic (a picture beside it)
//      and QA_PLANT=say (the same words spoken) must pass, so the gate measures the companion, not the text
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-instruction-companion.mjs   (or through tools/run-gates.mjs)
// run-gates: timeout 900
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const BASELINE = path.join(ROOT, 'tools/instruction-baseline.json')
const PLANT = !!process.env.QA_PLANT
const sleep = ms => new Promise(r => setTimeout(r, ms))
const ONLY = process.env.QA_PAGES ? new RegExp(process.env.QA_PAGES) : null
const pages = ['/index.html', ...fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html') && !f.startsWith('_')).sort().map(f => '/games/' + f)].filter(pg => !ONLY || ONLY.test(pg))
const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {}
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--autoplay-policy=no-user-gesture-required'] })
const now = {}, detail = {}
for (const pg of pages) {
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  await p.setViewport({ width: 800, height: 1280, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }]))
    localStorage.setItem('dunia-active-slot', '[0,1]')
    window.__said = []
    try {
      const S = window.speechSynthesis
      if (S) S.speak = u => { window.__said.push(String(u && u.text || '')) }
    } catch (e) {}
  })
  try { await p.goto(BASE + pg, { waitUntil: 'load', timeout: 60000 }) } catch (e) { console.log('  ! ' + pg + ' ' + e.message) }
  await sleep(3500)
  if (PLANT && pg === '/index.html') {
    await p.evaluate(mode => {
      const d = document.createElement('p')
      d.textContent = 'Ketuk tombol hijau di bawah untuk mulai bermain bersama teman barumu hari ini.'
      d.style.cssText = 'position:fixed;left:40px;top:600px;width:600px;font:24px sans-serif;color:#000;background:#fff;z-index:99999;margin:0;padding:8px'
      document.body.appendChild(d)
      if (mode === 'pic') { const i = document.createElement('img'); i.src = 'assets/db/people/001.webp'; i.style.cssText = 'position:fixed;left:660px;top:600px;width:80px;height:80px;z-index:99999'; document.body.appendChild(i) }
      if (mode === 'say') { const u = new SpeechSynthesisUtterance(d.textContent); speechSynthesis.speak(u) }
    }, process.env.QA_PLANT)
    await sleep(800)
  }
  const r = await p.evaluate(() => {
    const W = innerWidth, H = innerHeight, norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const said = (window.__said || []).map(norm).join(' | ')
    const vis = e => {
      const r = e.getBoundingClientRect()
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > H || r.left > W) return null
      for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
        const cs = getComputedStyle(x)
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return null
      }
      return r
    }
    const pics = []
    for (const e of document.querySelectorAll('body *')) {
      const t = e.tagName
      const isPic = (t === 'IMG' && e.complete && e.naturalWidth > 0) || t === 'svg' || t === 'CANVAS' || t === 'VIDEO' || /url\(/.test(getComputedStyle(e).backgroundImage)
      if (!isPic) continue
      const r = vis(e)
      if (r && r.width * r.height <= W * H / 2) pics.push(r)
    }
    const gap = (a, c) => Math.max(0, Math.max(a.left, c.left) - Math.min(a.right, c.right), Math.max(a.top, c.top) - Math.min(a.bottom, c.bottom))
    const out = []
    for (const e of document.querySelectorAll('body *')) {
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(e.tagName)) continue
      let own = ''
      for (const n of e.childNodes) if (n.nodeType === 3) own += n.textContent
      own = own.replace(/\s+/g, ' ').trim()
      if (own.length <= 40) continue
      const r = vis(e)
      if (!r) continue
      const near = pics.some(q => gap(r, q) <= 120)
      const spoken = said && said.includes(norm(own).slice(0, 30))
      if (!near && !spoken) out.push(own.slice(0, 70))
    }
    return out
  })
  now[pg] = r.length; detail[pg] = r
  await ctx.close()
}
await b.close()

let up = 0, down = 0
for (const pg of pages) {
  const was = base[pg]
  const line = `${pg} ${now[pg]}` + (was === undefined ? ' (new page)' : ` (baseline ${was})`) + (now[pg] ? ': ' + detail[pg].slice(0, 3).map(s => JSON.stringify(s)).join(', ') : '')
  if (was !== undefined && now[pg] > was) { up++; ok(false, 'L2 more unaccompanied text than the baseline ' + line) } else console.log('     ' + line)
  if (was !== undefined && now[pg] < was) down++
}
ok(!up, `L2 no page has more unaccompanied instruction text than ${path.relative(ROOT, BASELINE)} (${up} page(s) above)`)
ok(pages.every(pg => pg in base) || !!process.env.QA_UPDATE, `L2 every page has a baseline (${pages.filter(pg => !(pg in base)).join(' ') || 'all'})`)
const total = Object.values(now).reduce((a, x) => a + x, 0)
console.log(`  L1 total unaccompanied blocks: ${total} on ${pages.filter(pg => now[pg]).length} of ${pages.length} pages; ${down} page(s) below baseline`)
if (process.env.QA_UPDATE) { fs.writeFileSync(BASELINE, JSON.stringify({ ...base, ...now }, null, 1) + '\n'); console.log('  baseline written: ' + BASELINE) }
console.log(`qa-instruction-companion: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
