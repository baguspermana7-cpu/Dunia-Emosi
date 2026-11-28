#!/usr/bin/env node
// PRD-58 G1: "ensure no bug, no mistake for all game" (owner 2026-11-28).
// A tap bot PLAYS every hub game from the first round to the result screen, on an easy and on a hard level, with
// real touch taps on whatever the child could tap (random choices, so right and wrong answers both happen; a drawn
// stroke on a canvas). Per run it must hold:
//   1. no page error and no console error;
//   2. the result screen is reached (a game that never ends, or a round with nothing to tap, is a hang);
//   3. no stall: something tappable or a change on screen at least every 20 s;
//   4. on the result screen nothing from the game is left on top (its main button is the top element at its centre,
//      no hint card, no feedback overlay) -- the Kuis Matematika hint card stayed on the end screen until v64.99.
// QA_ONLY=<regex on "g<id>-<diff>"> narrows a run; QA_SIZES=390x844,844x390 sets the sizes.
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const SHOTS = process.env.QA_SHOTS || ''   // a folder: start, mid and result screenshots per run (PRD-58 G2 polish review)
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true })
const BASE = (process.env.QA_BASE || 'http://127.0.0.1:8089').replace(/\/$/, '')
const ONLY = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null
const SIZES = (process.env.QA_SIZES || '390x844').split(',').map(s => s.split('x').map(Number))
// the games that play inside index.html (the others are their own pages and have their own play gates)
// G17 is not here: Jembatan Goyang was retired (v55.67), initGame17 returns to the map. G18 is the museum: an explore
// screen with no result, so it is checked for errors and stalls only (EXPLORE).
const GAMES = [3, 4, 7, 8, 9, 10, 11, 13, 18]
const EXPLORE = new Set([18])
const LIMIT_MS = Number(process.env.QA_LIMIT_MS || 240000)
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const sleep = ms => new Promise(r => setTimeout(r, ms))

const b = await puppeteer.launch({ headless: 'new', protocolTimeout: 30000, args: ['--no-sandbox', '--disable-audio-output', '--autoplay-policy=no-user-gesture-required'] })
try {
  for (const [w, h] of SIZES) for (const g of GAMES) for (const diff of ['easy', 'hard']) {
    const tag = `g${g}-${diff}`
    if (ONLY && !ONLY.test(tag)) continue
    const c = await b.createBrowserContext(), p = await c.newPage()
    const errs = []
    p.on('pageerror', e => errs.push('pageerror ' + String(e.message || e).slice(0, 200)))
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon|net::ERR/.test(m.text())) errs.push('console ' + m.text().slice(0, 200)) })
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
    await p.evaluateOnNewDocument(() => {
      if (sessionStorage.__m) return
      localStorage.clear(); localStorage.setItem('dunia-emosi-sound', 'off')
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: 'x', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0]'); sessionStorage.__m = 1
    })
    await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 120000 })
    await p.waitForFunction(() => typeof window.startGameWithLevel === 'function' && typeof window.openLevelSelect === 'function', { timeout: 60000 })
    const lv = await p.evaluate((g, diff) => {
      state.players = [{ name: 'Ana', animal: 'x', ageTier: 'tumbuh', stars: 0 }, { name: 'Budi', animal: 'y', ageTier: 'tumbuh', stars: 0 }]
      state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = g
      let lv = 1
      if (diff === 'hard') for (let k = 1; k <= 60; k++) if (levelDiff(g, k) === 'hard') { lv = k; break }
      window.__qaRes = 0
      const sr = window.showResult
      window.showResult = function () { window.__qaRes++; return sr.apply(this, arguments) }
      openLevelSelect(g); startGameWithLevel(lv)
      return lv
    }, g, diff)
    const t0 = Date.now()
    let lastAct = Date.now(), taps = 0, strokes = 0, stall = 0, reached = false, lastSig = '', froze = false, shot = {}
    while (Date.now() - t0 < LIMIT_MS) {
      const st = await Promise.race([p.evaluate(() => {
        const vis = e => { if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false
          const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 && cs.pointerEvents !== 'none' }
        const res = document.getElementById('screen-result')
        // the battle games (G10, G13) end on their own result card, #game-result-overlay (showGameResult), not #screen-result
        const gr = document.getElementById('game-result-overlay')
        const resOn = (!!res && res.classList.contains('active') && vis(res)) || (!!gr && vis(gr) && !!gr.querySelector('button'))
        const scr = [...document.querySelectorAll('.screen.active, [id^="screen-game"].active')].filter(vis)
        let roots = [...scr, ...['overlay-feedback', 'game-result-overlay'].map(i => document.getElementById(i)).filter(vis)]
        // a sheet or info card laid over the game (G10 "Ganti Pokemon", G18 museum facts) lives outside the screen:
        // a child closes it, so the bot may tap inside it, including its close button
        let modal = null
        for (const e of document.elementsFromPoint(innerWidth / 2, innerHeight / 2)) { let a = e; while (a && a !== document.body && getComputedStyle(a).position !== 'fixed') a = a.parentElement; if (a && a !== document.body && !scr.some(sc => sc.contains(a) || a.contains(sc))) { modal = a; break } else break }
        if (modal) roots = [modal]
        const NOPE = /g9-mode|g9-tab|mode-tab|keluar|kembali|jeda|pause|exit|back|home|menu|suara|sound|musik|music|bantuan|help|ganti|setting/i
        const cand = []
        for (const r of roots) for (const e of r.querySelectorAll('button, [onclick], [role="button"], .choice, [class*="choice"], [class*="-opt"], [class*="card"]')) {
          if (!vis(e) || e.disabled || e.closest('[disabled]')) continue
          const label = (e.getAttribute('aria-label') || '') + ' ' + (e.id || '') + ' ' + (typeof e.className === 'string' ? e.className : '') + ' ' + (e.getAttribute('onclick') || '') + ' ' + (e.textContent || '').trim().slice(0, 24)
          if (!(modal && /tutup|close|×|✕|ok|mengerti|lanjut/i.test(label)) && (NOPE.test(label) || /exitGame|goHome|showScreen\('screen-menu|togglePause|openSettings/.test(label))) continue
          const q = e.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2)
          if (!t || !(t === e || e.contains(t) || t.contains(e))) continue
          cand.push({ x: q.left + q.width / 2, y: q.top + q.height / 2, k: label.slice(0, 40) })
        }
        const cv = [...document.querySelectorAll('.screen.active canvas')].filter(vis).map(e => { const q = e.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height } }).filter(q => q.w > 100 && q.h > 100)
        const sig = (document.querySelector('.screen.active') || document.body).innerText.length + ':' + cand.map(c => c.k).join('|').length
        return { resOn, res: window.__qaRes, cand, cv, sig, scr: scr.map(s => s.id).join(',') }
      }).catch(() => null), sleep(15000).then(() => null)])
      if (!st) { froze = true; break }   // the main thread did not answer in 15 s: the game froze the tab
      if (SHOTS && (taps === 0 || taps === 5) && !shot[taps]) { shot[taps] = 1; await p.screenshot({ path: `${SHOTS}/${tag}-${w}x${h}-${taps ? '2mid' : '1start'}.png` }).catch(() => {}) }
      if (st.resOn) { reached = true; break }
      if (st.sig !== lastSig) { lastSig = st.sig; lastAct = Date.now() }
      if (st.cv.length && (strokes < taps / 3 || !st.cand.length)) {
        // a drawn stroke across the canvas (G9 tracing; a dot counts as no stroke)
        const q = st.cv[0]
        await p.touchscreen.touchStart(q.x + q.w * 0.25, q.y + q.h * 0.2)
        for (let s = 1; s <= 14; s++) await p.touchscreen.touchMove(q.x + q.w * (0.25 + 0.5 * s / 14), q.y + q.h * (0.2 + 0.6 * Math.abs(Math.sin(s / 3))))
        await p.touchscreen.touchEnd(); strokes++; lastAct = Date.now()
      } else if (st.cand.length) {
        const k = st.cand[Math.floor(Math.random() * st.cand.length)]
        await p.touchscreen.tap(k.x, k.y); taps++
      }
      if (Date.now() - lastAct > 20000) { stall++; if (SHOTS) await p.screenshot({ path: `${SHOTS}/${tag}-${w}x${h}-stall.png` }).catch(() => {}); break }
      if (EXPLORE.has(g) && Date.now() - t0 > 60000) break   // a minute of exploring is the check
      await sleep(450)
    }
    const end = reached ? await p.evaluate(() => {
      // games ending through showGameResult() put the result in #game-result-overlay above the game screen
      const gro = document.getElementById('game-result-overlay')
      const ov = !!gro && getComputedStyle(gro).display !== 'none' && gro.getBoundingClientRect().width > 0
      const res = ov ? gro : document.getElementById('screen-result')
      const btn = [...res.querySelectorAll('button')].find(e => e.getBoundingClientRect().width > 20)
      let top = null
      if (btn) { const q = btn.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); top = !!t && (t === btn || btn.contains(t)) }
      const fb = document.getElementById('overlay-feedback')
      const fbOn = !!fb && fb.classList.contains('show')
      const left = [...document.querySelectorAll('.dek')].length
      const other = [...document.querySelectorAll('.screen.active')].map(s => s.id).filter(i => i !== 'screen-result' && !ov)
      return { top, fbOn, left, other }
    }) : null
    if (SHOTS && reached) { await sleep(900); await p.screenshot({ path: `${SHOTS}/${tag}-${w}x${h}-3result.png` }).catch(() => {}) }
    const secs = Math.round((Date.now() - t0) / 1000)
    ok(!errs.length, `${w}x${h} ${tag} (Lv.${lv}): no page or console error ${errs.slice(0, 3).join(' | ')}`)
    if (EXPLORE.has(g)) ok(!stall && !froze, `${w}x${h} ${tag}: a minute of exploring, no stall, no freeze (${taps} taps, stall ${stall}, froze ${froze})`)
    else ok(reached && !stall && !froze, `${w}x${h} ${tag}: played to the result screen (${reached}, froze ${froze}, ${secs}s, ${taps} taps, ${strokes} strokes, stall ${stall})`)
    if (reached) ok(end.top && !end.fbOn && !end.left && !end.other.length, `${w}x${h} ${tag}: nothing from the game is left on the result screen (button on top ${end.top}, feedback ${end.fbOn}, hint cards ${end.left}, other screens ${end.other.join(',') || 'none'})`)
    await Promise.race([c.close().catch(() => {}), sleep(10000)])   // a frozen tab may not close
  }
} finally { await b.close() }
console.log(`qa-prd58g-monkey: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
