#!/usr/bin/env node
// PRD-58 G1, part 2: every game that is its own page (games/*.html) gets a minute of a child's random input: taps on
// whatever is tappable, taps and drags on the play field, the arrow keys and space. Per page:
//   1. no page error and no console error;
//   2. the page still answers afterwards (main thread free, a timer fires within 3 s);
//   3. the quiz page (QUIZ below) reaches their end card (GameModal or their own) within the time limit;
//   4. on an end card nothing from the game covers its main button.
// Pages are enumerated from the filesystem; SKIP names each exemption with its reason.
// QA_ONLY=<regex on the file name> narrows a run; QA_SECS sets the play time for the non-quiz pages (default 60).
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const BASE = (process.env.QA_BASE || 'http://127.0.0.1:8089').replace(/\/$/, '')
const ONLY = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null
const SECS = Number(process.env.QA_SECS || 60)
const SKIP = {
  'film-play.html': 'a video player, nothing to play through (qa-film gates)',
  'film-anak.html': 'a video list, nothing to play through (qa-film gates)',
  'cek-kemampuan.html': 'a 30-minute assessment with its own real-tap gate (qa-prd53-cek, qa-prd56-cek-mode)',
  'mojo-chase-embed.html': 'loaded inside mojo-swoptops, played there',
}
// quiz pages: random answers must reach the end card (hearts run out or the rounds finish). Ayo Berhitung is a
// worksheet with no end card; Ejaan Inggris is solved by spelling a word, which random taps do not do
// end: its end screen (Kuis Matematika has its own, not GameModal); btn: the buttons on it
// start: how a level is opened (random taps wander the map and the menus instead of answering)
const QUIZ = { 'kuis-matematika.html': { secs: 240, end: '#scr-hasil.active', btn: '#scr-hasil button', start: 'window.__g25.startLevel(1)' } }
const pages = fs.readdirSync('games').filter(f => f.endsWith('.html') && !f.startsWith('_') && !SKIP[f] && (!ONLY || ONLY.test(f))).sort()
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']

const b = await puppeteer.launch({ headless: 'new', protocolTimeout: 30000, args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
try {
  for (const f of pages) {
    const c = await b.createBrowserContext(), p = await c.newPage()
    const errs = []
    p.on('pageerror', e => errs.push('pageerror ' + String(e.message || e).slice(0, 200)))
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|net::ERR|WebGL|swiftshader|GPU stall/i.test(m.text())) errs.push('console ' + m.text().slice(0, 200)) })
    await p.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true })
    await p.evaluateOnNewDocument(() => {
      if (sessionStorage.__m) return
      localStorage.clear(); localStorage.setItem('dunia-emosi-sound', 'off')
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: 'x', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0]'); sessionStorage.__m = 1
    })
    // the print buttons (Ayo Berhitung) open print and prompt dialogs that block the page; a parent's feature, not play
    p.on('dialog', d => d.dismiss().catch(() => {}))
    await p.evaluateOnNewDocument(() => { window.print = () => {} })
    const url = BASE + '/games/' + f + '?nocine=1'
    try { await p.goto(url, { waitUntil: 'load', timeout: 120000 }) } catch (e) { ok(false, `${f}: page loads (${String(e.message).slice(0, 100)})`); await c.close(); continue }
    await sleep(2500)
    if (QUIZ[f] && QUIZ[f].start) await p.evaluate(QUIZ[f].start).catch(() => {})
    const limit = (QUIZ[f] ? QUIZ[f].secs : SECS) * 1000, t0 = Date.now()
    let taps = 0, drags = 0, keys = 0, left = 0, ended = false, cover = null
    while (Date.now() - t0 < limit) {
      if (!p.url().startsWith(BASE + '/games/' + f)) { left++; try { await p.goto(url, { waitUntil: 'load', timeout: 60000 }) } catch (_) {} ; await sleep(1500); continue }
      let st
      try {
        st = await p.evaluate(q => {
          const vis = e => { if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false
            const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 && cs.pointerEvents !== 'none' }
          const gm = document.getElementById('gm-overlay')
          const endEl = q ? document.querySelector(q.end) : null
          const end = (!!gm && gm.classList.contains('show') && vis(gm)) || (!!endEl && vis(endEl))
          const NOPE = /keluar|kembali|jeda|pause|exit|back|home|menu|suara|sound|musik|music|bantuan|help|setting|pengaturan|layar penuh|fullscreen|index\.html|history\.back|location/i
          const cand = []
          for (const e of document.querySelectorAll('button, [onclick], [role="button"], [class*="choice"], [class*="-opt"], [class*="btn"]')) {
            if (!vis(e) || e.disabled || e.closest('a[href]')) continue
            const label = (e.getAttribute('aria-label') || '') + ' ' + (e.id || '') + ' ' + (typeof e.className === 'string' ? e.className : '') + ' ' + (e.getAttribute('onclick') || '') + ' ' + (e.textContent || '').trim().slice(0, 24)
            if (NOPE.test(label)) continue
            const q = e.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2)
            if (!t || !(t === e || e.contains(t) || t.contains(e))) continue
            cand.push({ x: q.left + q.width / 2, y: q.top + q.height / 2 })
          }
          const cv = [...document.querySelectorAll('canvas')].filter(vis).map(e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height } }).filter(q => q.w > 150 && q.h > 100)
          return { end, cand, cv }
        }, QUIZ[f] || null)
      } catch (e) { await sleep(800); continue }   // a navigation in flight
      if (st.end && !ended) {
        ended = true
        // checked the moment the end card first shows (the bot plays on afterwards on the non-quiz pages)
        cover = await p.evaluate(sel => {
          const btn = [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 20)
          if (!btn) return 'no button'
          const q = btn.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2)
          return t && (t === btn || btn.contains(t)) ? '' : 'covered by ' + (t ? (t.id || t.className || t.tagName) : 'nothing')
        }, QUIZ[f] ? QUIZ[f].btn : '#gm-btns button').catch(e => 'eval ' + e.message)
        if (QUIZ[f]) break
      }
      const r = Math.random()
      if (st.cand.length && (r < 0.55 || !st.cv.length)) { const k = st.cand[Math.floor(Math.random() * st.cand.length)]; await p.touchscreen.tap(k.x, k.y).catch(() => {}); taps++ }
      else if (st.cv.length && r < 0.8) {
        const q = st.cv[0], x0 = q.x + q.w * Math.random(), y0 = q.y + q.h * Math.random()
        await p.touchscreen.touchStart(x0, y0).catch(() => {})
        for (let s = 1; s <= 6; s++) await p.touchscreen.touchMove(x0 + (Math.random() - 0.5) * 120, y0 + (Math.random() - 0.5) * 80).catch(() => {})
        await p.touchscreen.touchEnd().catch(() => {}); drags++
      } else { await p.keyboard.press(KEYS[Math.floor(Math.random() * KEYS.length)]).catch(() => {}); keys++ }
      await sleep(350)
    }
    // still answering: a timer must fire within 3 s
    const alive = await Promise.race([p.evaluate(() => new Promise(r => setTimeout(() => r(true), 50))).catch(() => false), sleep(3000).then(() => false)])
    const secs = Math.round((Date.now() - t0) / 1000)
    ok(!errs.length, `${f}: no page or console error in ${secs}s (${taps} taps, ${drags} drags, ${keys} keys, left the page ${left}x) ${errs.slice(0, 3).join(' | ')}`)
    ok(alive, `${f}: the page still answers after the random play`)
    if (QUIZ[f]) ok(ended, `${f}: random answers reach the end card within ${QUIZ[f].secs}s (${ended})`)
    if (ended) ok(!cover, `${f}: nothing covers the end card's main button ${cover || ''}`)
    await c.close()
  }
} finally { await b.close() }
console.log(`qa-prd58g-monkey-pages: ${pass} passed, ${fail} failed (${pages.length} pages; skipped ${Object.keys(SKIP).length} with reasons)`)
process.exit(fail ? 1 : 0)
