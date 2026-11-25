#!/usr/bin/env node
// qa-prd57-toast — PRD-57 L3 (docs/prd/PRD-57-sisa-catatan-bug-bash.md): the achievement toast is readable.
// A later rule painted the toast dark purple (#1C1030 -> #2D1B69) while its title and name kept the dark brown
// of the old gold toast (contrast about 1.3). Law: title and name reach 4.5 against EVERY colour stop of the
// toast background, at a phone upright and on its side, and the toast sits fully on screen.
// Usage: QA_BASE=http://127.0.0.1:8089 [QA_SHOTS=dir] node tools/qa-prd57-toast.mjs
import fs from 'node:fs'
import path from 'node:path'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const SH = process.env.QA_SHOTS || ''
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const { default: puppeteer } = await import('puppeteer')
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
try {
  for (const [w, h] of [[390, 844], [844, 390]]) {
    const tag = `${w}x${h}`
    const p = await b.newPage()
    const errs = []
    p.on('pageerror', e => errs.push(String(e).slice(0, 120)))
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
    await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' })
    await p.waitForFunction(() => typeof window.showAchievement === 'function' || typeof showAchievement === 'function', { timeout: 20000 })
    await p.evaluate(() => showAchievement('first_star'))
    // wait for the slide-in to finish: the toast stops moving
    await p.waitForFunction(() => { const t = document.getElementById('achievement-toast'); const r = t.getBoundingClientRect(); const k = r.top + ',' + r.bottom; const same = window.__tk === k; window.__tk = k; return same && t.classList.contains('show') }, { polling: 150, timeout: 5000 })
    const r = await p.evaluate(() => {
      const lum = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }
      const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
      const t = document.getElementById('achievement-toast'), cs = getComputedStyle(t)
      const stops = (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(rgb)
      if (!stops.length) stops.push(rgb(cs.backgroundColor))
      const worst = sel => { const c = rgb(getComputedStyle(t.querySelector(sel)).color); return Math.min(...stops.map(s => ratio(c, s))) }
      const tr = t.getBoundingClientRect()
      return { title: worst('.at-title'), name: worst('.at-name'), stops: stops.length, on: tr.top >= 0 && tr.bottom <= innerHeight && tr.left >= 0 && tr.right <= innerWidth }
    })
    ok(r.title >= 4.5 && r.name >= 4.5, `L3 ${tag}: toast title ${r.title.toFixed(2)}, name ${r.name.toFixed(2)} against the worst of ${r.stops} background stops (need 4.5)`)
    ok(r.on && !errs.length, `L3 ${tag}: toast fully on screen ${r.on}, page errors ${errs.length}`)
    if (SH) { fs.mkdirSync(SH, { recursive: true }); await p.screenshot({ path: path.join(SH, `prd57-toast-${tag}.png`) }) }
    await p.close()
  }
} finally { await b.close() }
console.log(`qa-prd57-toast: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
