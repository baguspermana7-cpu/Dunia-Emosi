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
    // wait for the slide-in to finish: the toast has the show class and no transition or animation is still running
    // (comparing two polled positions passed mid-slide on a slow renderer: the toast was then measured half off screen)
    await p.waitForFunction(() => { const t = document.getElementById('achievement-toast'); return t && t.classList.contains('show') && t.getAnimations({ subtree: true }).every(a => a.playState !== 'running' && a.playState !== 'pending') }, { timeout: 15000, polling: 100 })
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
    // PRD-58 G2: a badge earned at the end of a level shows on the result screen; the toast must not lie over the
    // result buttons (G3 390x844 covered "Menu"), and it moves by transform, not by animating bottom/top
    const rs = await p.evaluate(async () => {
      state.players = [{ name: 'Ana', animal: 'x', ageTier: 'tumbuh', stars: 0 }, { name: 'Budi', animal: 'y', ageTier: 'tumbuh', stars: 0 }]
      state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = 3; state.gameStars = [5, 0]
      const t = document.getElementById('achievement-toast')
      await new Promise(r => setTimeout(r, 3800))   // the first toast's own 3.5 s timer would close the second one early
      showResult('x', 'Selesai!', 'Bagus')
      await new Promise(r => setTimeout(r, 400))
      showAchievement('first_star')
      await new Promise(r => setTimeout(r, 900))
      const tr = t.getBoundingClientRect()
      const over = [...document.querySelectorAll('#screen-result button')].filter(b => { const q = b.getBoundingClientRect(); return q.width && q.height && q.left < tr.right && q.right > tr.left && q.top < tr.bottom && q.bottom > tr.top }).map(b => b.textContent.trim().slice(0, 16))
      return { over, props: getComputedStyle(t).transitionProperty, on: tr.top >= 0 && tr.bottom <= innerHeight }
    })
    ok(!rs.over.length && rs.on, `G2 ${tag}: on the result screen the toast lies over no result button (${rs.over.join(', ') || 'none'}), on screen ${rs.on}`)
    ok(!/\b(bottom|top)\b/.test(rs.props), `G2 ${tag}: the toast moves by transform, not bottom/top (transition ${rs.props})`)
    if (SH) await p.screenshot({ path: path.join(SH, `prd57-toast-result-${tag}.png`) })
    await p.close()
  }
} finally { await b.close() }
console.log(`qa-prd57-toast: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
