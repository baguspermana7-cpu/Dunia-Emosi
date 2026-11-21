#!/usr/bin/env node
/* audit-no-emoji.mjs — PERMANENT gate for the ZERO-EMOJI program (owner rule: no emoji anywhere a child or parent sees).
 * Boots every page headless, lets the UISprites resolver run, then walks the RENDERED DOM for pictographic emoji.
 * EVERY view is strict (v64.56, audit A-17): any pictographic character left in the DOM fails, mapped or not.
 *   - MAPPED emoji still on screen  → the resolver missed a swap (bug).
 *   - UNMAPPED emoji                → no art exists: map it, drop it (decoration), or use an existing icon.
 * Two passes per view:
 *   pass 1  the first render (as before);
 *   pass 2  the screens a child reaches next: the page's own start/play control is pressed (up to 3 steps, per-page
 *           selectors first, then a visible start-worded button, then a tap on the canvas), and every game with an end
 *           routine (the inventory in qa-endgame-hang.mjs) is armed and ended so its result card is walked too.
 *           On the hub, the result card (showResult in game.js) is opened through endGame() and every all-literal
 *           showResult(...) call in game.js.
 * Writes tools/qa-out/emoji-gaps.json (char → count + pages + where).
 * QA_PLANT=1 [QA_PLANT_PAGE=index.html#dashboard] writes one unmapped emoji into a page (must fail);
 * QA_PLANT=nores QA_PLANT_PAGE=<page> stops the resolver on that page (its mapped emoji must fail).
 * QA_ONLY=<regex> limits the views; QA_PASS1=1 skips pass 2.
 * Run: node tools/audit-no-emoji.mjs                                          */
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { hubSource } from './lib/hub-src.mjs'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const PAGES = [
  'index.html',
  'games/balapan-kereta.html', 'games/balapan-kereta-side.html', 'games/lokomotif-pemberani.html',
  'games/selamatkan-kereta.html', 'games/museum-kereta.html',
  'games/gym-pokemon.html', 'games/mario-pokemon.html', 'games/monster-candy.html',
  'games/pokemon-run.html', 'games/pokemon-birds.html', 'games/pokemon-bawah-laut.html',
  'games/ducky-volley.html', 'games/kuis-matematika.html', 'games/mobil.html',
  // G27-G30 standalone games (added 2026-09-28; they were never walked)
  'games/ejaan-inggris.html', 'games/stinky-dirty.html', 'games/garasi-tempur.html',
  'games/timmy-kapal.html',
  // PRD-27 part 2 (2026-11-14): the pages this list never walked
  'games/ayo-berhitung.html', 'games/kereta-maze.html', 'games/mojo-swoptops.html', 'games/mojo-chase-embed.html',
  'games/film-anak.html', 'games/film-play.html', 'games/blippi.html',
  // the parent dashboard (index.html, drawn by showDashboard()): strict, only its own subtree is walked
  'index.html#dashboard',
]
// Every view is strict (v64.56): the old 5-view STRICT carve-out let an unmapped emoji on the other 22 views pass
// as a "gap" while a child looked at it.

// pass 2, start: per-page controls tried in order (the first VISIBLE one is pressed; up to 3 presses). Selectors come
// from each page's own qa-* gate or its markup. Pages not listed fall back to a visible start-worded button, then a tap
// in the middle of the screen (the canvas games start on a tap).
const START = {
  'games/balapan-kereta.html': ['#g14-tut-go', '#go-btn', '#gvs-go:not([disabled])', '#gvs-cgo'],
  'games/selamatkan-kereta.html': ['#btn-start'],
  'games/gym-pokemon.html': ['#pkg-overlay .pkg-card[data-unlocked="1"]', '#tcf-go'],
  'games/kuis-matematika.html': ['.br-play', '#tourn-start'],
  'games/ejaan-inggris.html': ['#btn-play'],
  'games/stinky-dirty.html': ['#btn-start', '#btn-go'],
  'games/garasi-tempur.html': ['#si-go', '#act-go'],
  'games/timmy-kapal.html': ['#btn-start'],
  'games/kereta-maze.html': ['#b-start'],
  'games/mojo-swoptops.html': ['#btn-play'],
  'games/film-play.html': ['#pgo:not([disabled])'],
  'games/mobil.html': ['#ovl-start button', '#ovl-start'],
  'games/monster-candy.html': ['#start-overlay'],
  'games/pokemon-run.html': ['#start-overlay'],
  'games/pokemon-birds.html': ['#start-overlay'],
  'games/pokemon-bawah-laut.html': ['#start-overlay'],
  'games/ducky-volley.html': ['#start-overlay'],
}
const START_WORDS = '^\\W{0,3}(mulai|main|ayo|start|play|go|maju|lanjut|siap(?!kan)|pilih)'
const NOT_START = 'offline|unduh|download|kembali|keluar|back|home|beranda|suara|musik|mute|pengaturan|setting|reset|hapus|orang tua|parent'

// pass 2, end: the end-routine inventory of tools/qa-endgame-hang.mjs (arm = the state the routine's own guard needs)
const ARM_GYM = () => {
  try {
    const card = document.querySelector('#pkg-overlay .pkg-card[data-unlocked="1"]'); if (card) card.click()
    const ov = document.getElementById('pkg-overlay'); if (ov) ov.style.display = 'none'
    if (window.__g13c && !window.__g13c.battle) window.__g13c.startBattleRaw(window.__g13c.TRAINERS[0].id)
    else if (window.__g13c && window.__g13c.battle) window.__g13c.battle.ended = false
  } catch (_) {}
}
const ARM = {
  'games/balapan-kereta.html': () => { if (typeof S !== 'undefined') { S.running = true; S.gameOver = false } },
  'games/pokemon-run.html': () => { if (typeof S !== 'undefined') { S.running = true; S.gameOver = false; S.started = true } },
  'games/gym-pokemon.html': ARM_GYM,
  'games/kuis-matematika.html': () => { try { if (!window.__g25.inProgress()) window.__g25.startLevel(1) } catch (_) {} },
  'games/ejaan-inggris.html': () => { try { const s = window.__g27.state(); if (!s.word || s.solved) window.__g27.startWord('blue') } catch (_) {} },
}
// content picked by date: render every variant at once so a fact that shows only on some days is walked every run
// (v64.57: CI failed on the day its museum trivia card carried an unmapped emoji; local runs that day passed)
const ALL_DAYS = {
  'games/museum-kereta.html': () => {
    if (typeof G18_TRAINS === 'undefined' || typeof g18ShowDailyTrivia !== 'function') return 'no-trivia'
    const real = Date.prototype.toDateString, hash = d => { let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) >>> 0; return h }
    const day = {}
    for (let k = 0; Object.keys(day).length < G18_TRAINS.length && k < 1e6; k++) { const d = 'd' + k, i = hash(d) % G18_TRAINS.length; if (!(i in day)) day[i] = d }
    let n = 0
    try {
      for (const i of Object.keys(day)) {
        Date.prototype.toDateString = () => day[i]
        g18ShowDailyTrivia()
        const c = document.getElementById('g18-daily-trivia'); if (c) { c.id = 'g18-daily-trivia-' + i; n++ }
      }
    } finally { Date.prototype.toDateString = real }
    return n
  },
}
// every item of a list the child can open one at a time: [setup(i) in the page -> count, label]; each is walked
// (v64.58: a train's detail card and the day's quiz question were reached only on some calendar days)
const EACH = {
  'games/museum-kereta.html': [
    ['detail', () => typeof G18_TRAINS === 'undefined' ? 0 : G18_TRAINS.length,
      i => { try { g18CloseModal() } catch (_) {} g18ShowDetail(i) }],
    ['quiz', () => typeof G18_QUESTIONS_BANK === 'undefined' ? 0 : G18_QUESTIONS_BANK.length,
      i => { try { g18CloseModal() } catch (_) {} if (typeof g18StartQuiz === 'function' && document.getElementById('g18-quiz-view').style.display !== 'flex') g18StartQuiz()
        G18_QUIZ_SESSION = [G18_QUESTIONS_BANK[i]]; g18State.quizIdx = 0; g18RenderQuestion() }],
  ],
  // the attack orb and hit sparks show the attacker's TYPE emoji; which type a run meets is random, so the CI
  // runner met a ghost/fighting/bug/flying one on 2026-11-17 (v64.60 red) that this machine never drew: fire every type
  'games/pokemon-run.html': [
    ['projectile', () => typeof TYPE_PROJ === 'undefined' ? 0 : Object.keys(TYPE_PROJ).length,
      i => { const t = Object.keys(TYPE_PROJ)[i], a = document.body; spawnProjectile(a, a, t, () => {}) }],
    ['hit-sparks', () => typeof TYPE_HIT_FX === 'undefined' ? 0 : Object.keys(TYPE_HIT_FX).length,
      i => { spawnTypeHitFX(document.body, Object.keys(TYPE_HIT_FX)[i]) }],
  ],
}
const END = {
  'games/balapan-kereta.html': [['endRace', []]],
  'games/balapan-kereta-side.html': [['endRace', ['Menang!', 'win']], ['endRace', ['Kalah', 'lose']]],
  'games/kuis-matematika.html': [['__g25.finishWin', []], ['__g25.finishLose', []]],
  'games/ejaan-inggris.html': [['__g27.solve', []]],
  'games/lokomotif-pemberani.html': [['showWin', []], ['showLose', []]],
  'games/selamatkan-kereta.html': [['showWin', []], ['showLose', []]],
  'games/ducky-volley.html': [['endMatch', [true]]],
  'games/monster-candy.html': [['endGame', []]],
  'games/mobil.html': [['showGameOver', []], ['showFinish', []]],
  'games/pokemon-run.html': [['showWin', []], ['showLose', []]],
  'games/pokemon-birds.html': [['showWin', []]],
  'games/pokemon-bawah-laut.html': [['showWin', []]],
  'games/mario-pokemon.html': [['showWinModal', [3]]],
  'games/gym-pokemon.html': [['__g13c.endBattleWin', []], ['__g13c.endBattleLose', []]],
}

// tiny static server
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
function serve () {
  return new Promise(res => {
    const s = http.createServer((req, rq) => {
      let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/index.html'
      const abs = path.join(ROOT, f)
      fs.readFile(abs, (e, d) => {
        if (e) { rq.writeHead(404); rq.end('nf'); return }
        rq.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' }); rq.end(d)
      })
    })
    s.listen(0, () => res(s))
  })
}

const WALK = (rootSel) => {
  const EMO = /\p{Extended_Pictographic}/u
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CANVAS: 1 }
  const root = rootSel ? document.querySelector(rootSel) : document.body
  if (!root) return { mapped: { 'NO-ROOT': 1 }, unmapped: {}, gaps: {} }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const mapped = {}, unmapped = {}
  let n
  const has = (window.EmojiMap && window.EmojiMap.has) ? (c) => window.EmojiMap.has(c) : () => false
  while ((n = w.nextNode())) {
    const t = n.nodeValue; if (!t || !EMO.test(t)) continue
    let skip = false
    for (let p = n.parentNode; p; p = p.parentNode) { if (p.nodeType === 1 && SKIP[p.tagName]) { skip = true; break } }
    if (skip) continue
    for (const ch of t) {
      if (!/\p{Extended_Pictographic}/u.test(ch)) continue
      if (has(ch)) mapped[ch] = (mapped[ch] || 0) + 1
      else unmapped[ch] = (unmapped[ch] || 0) + 1
    }
  }
  const gaps = (window.UISprites && window.UISprites.gaps) ? window.UISprites.gaps() : {}
  return { mapped, unmapped, gaps, text: (root.innerText || '').replace(/\s+/g, ' ').trim().length }
}

// Emoji painted on a canvas (ctx.fillText, which PixiJS Text also goes through) never reach the DOM walk. They are
// counted and listed (REPORT, not a failure: the DOM is this gate's contract) so they are not invisible either.
const CANVAS_HOOK = () => {
  const seen = window.__emoCanvas = {}
  const EMO = /\p{Extended_Pictographic}/gu
  const wrap = (proto) => {
    if (!proto) return
    for (const m of ['fillText', 'strokeText']) {
      const orig = proto[m]; if (typeof orig !== 'function') continue
      proto[m] = function (t) { try { const f = String(t).match(EMO); if (f) for (const c of f) seen[c] = (seen[c] || 0) + 1 } catch (_) {} return orig.apply(this, arguments) }
    }
  }
  wrap(window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype)
  wrap(window.OffscreenCanvasRenderingContext2D && OffscreenCanvasRenderingContext2D.prototype)
}

// pass 2: press the next start control; returns { label, x, y } for a real pointer click, or null
const FIND_START = (sels, words, not) => {
  const vis = el => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
    return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05 && !el.disabled
  }
  const at = (el, label) => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { label, x: r.left + r.width / 2, y: r.top + r.height / 2 } }
  for (const s of sels) { const el = [...document.querySelectorAll(s)].find(vis); if (el && !el.dataset.qaPressed) { el.dataset.qaPressed = '1'; return at(el, s) } }
  const W = new RegExp(words, 'i'); const N = new RegExp(not, 'i')
  const el = [...document.querySelectorAll('button, [role="button"], .btn')].filter(vis).find(b => {
    const t = (b.innerText || b.getAttribute('aria-label') || '').trim()
    return !b.dataset.qaPressed && W.test(t) && !N.test(t) && !b.closest('a[href]')
  })
  if (el) { el.dataset.qaPressed = '1'; return at(el, 'text:' + (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 22)) }
  return null
}

// pass 2 end: arm, call the end routine, wait for the result to be drawn
const CALL_END = async (fn, args) => {
  let threw = null
  try { eval(fn).apply(null, args) } catch (e) { threw = String(e.message).slice(0, 80) }
  await new Promise(r => setTimeout(r, fn.indexOf('__g13c') === 0 ? 3600 : 1600))   // gym plays a 3s badge zoom first
  return threw
}

// hub: the result card (showResult) through endGame() and every all-literal showResult(...) call in game.js
// (template ${...} parts become a number). Each call redraws the same card, so each is walked on its own.
const HUB_CALLS = (() => {
  const src = hubSource()   // game.js + games/hub/*.js (A-18 split)
  const STR = "'(?:[^'\\\\]|\\\\.)*'|`[^`]*`"
  const re = new RegExp('showResult\\(\\s*((?:' + STR + ')\\s*,\\s*(?:' + STR + ')\\s*,\\s*(?:' + STR + '))\\s*\\)', 'g')
  const out = ['endGame(5)', 'endGame(2)', 'endGame(0)']
  let m
  while ((m = re.exec(src))) out.push('showResult(' + m[1].replace(/\$\{[^}]*\}/g, '3') + ')')
  return out
})()
const HUB_CALL = async (call) => {
  try { state._showingResult = false } catch (_) {}
  let threw = null
  try { eval(call) } catch (e) { threw = String(e.message).slice(0, 60) }
  await new Promise(r => setTimeout(r, 700))
  return threw
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const server = await serve()
const port = server.address().port
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const gapAgg = {}     // char -> { count, pages:Set, where:Set }
const canvasAgg = {}  // char -> { count, pages:Set }
const failPages = []
const t0 = Date.now()

const ONLY = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null
for (const rel of PAGES.filter(r => !ONLY || ONLY.test(r))) {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  const [file, view] = rel.split('#')
  await page.evaluateOnNewDocument(CANVAS_HOOK)
  // QA_PLANT=nores: the resolver script is not loaded on QA_PLANT_PAGE, so its mapped emoji stay (the L1 red proof)
  if (process.env.QA_PLANT === 'nores' && rel === process.env.QA_PLANT_PAGE) {
    await page.setRequestInterception(true)
    page.on('request', q => (/ui-sprites\.js/.test(q.url()) ? q.abort() : q.continue()))
  }
  if (view === 'dashboard') {
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik', stars: 12 }]))
      localStorage.setItem('dunia-active-slot', '[0,1]')
    })
  }
  try {
    await page.goto(`http://localhost:${port}/${file}`, { waitUntil: 'networkidle2', timeout: 30000 })
  } catch (_) {}
  if (view === 'dashboard') await page.evaluate(() => { try { showDashboard(true) } catch (e) { console.error(e) } })
  // QA_PLANT=1: one emoji the resolver has no art for (U+1F9FF) is written into the page: the view must fail
  if (process.env.QA_PLANT && process.env.QA_PLANT !== 'nores' && rel === (process.env.QA_PLANT_PAGE || 'games/kuis-matematika.html')) {
    await page.evaluate(sel => { const d = document.createElement('div'); d.textContent = 'Hebat \u{1F9FF}'; (document.querySelector(sel) || document.body).appendChild(d) }, view === 'dashboard' ? '#screen-dashboard' : 'body')
  }
  await sleep(1200)   // let observer + idle sweep settle

  const seen = {}     // char -> { n, mapped, where:Set }
  const reach = []
  const walk = async (where) => {
    let r
    try { r = await page.evaluate(WALK, view === 'dashboard' ? '#screen-dashboard' : null) } catch (e) { r = { mapped: {}, unmapped: {}, text: 0 } }
    // a mapped emoji can sit in the one-frame gap before ui-sprites swaps it (a HUD rewritten every frame on a loaded
    // machine: full UTC run, pokemon-run, v64.61). Look again two frames later: only a mapped emoji still there counts;
    // an unmapped one counts from either look. QA_PLANT=nores (resolver never loads) still fails: nothing swaps it.
    if (Object.keys(r.mapped || {}).length) {
      await sleep(300); await page.evaluate(() => new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f)))).catch(() => {})
      let r2
      try { r2 = await page.evaluate(WALK, view === 'dashboard' ? '#screen-dashboard' : null) } catch (e) { r2 = null }
      if (r2) r = { ...r, mapped: r2.mapped || {}, unmapped: { ...(r2.unmapped || {}), ...(r.unmapped || {}) } }
    }
    for (const [kind, set] of [['mapped', r.mapped], ['unmapped', r.unmapped]]) {
      for (const [ch, c] of Object.entries(set || {})) {
        if (!seen[ch]) seen[ch] = { n: 0, mapped: kind === 'mapped', where: new Set() }
        seen[ch].n = Math.max(seen[ch].n, c); seen[ch].where.add(where)
      }
    }
    return r
  }
  const r1 = await walk('first')
  const sameDoc = () => page.url().split('#')[0].split('?')[0].endsWith('/' + file)

  if (!process.env.QA_PASS1 && !view) {
    if (file === 'index.html') {
      for (const call of HUB_CALLS) {
        const threw = await page.evaluate(HUB_CALL, call).catch(e => String(e.message).slice(0, 60))
        const label = call.slice(0, 26) + (threw ? '!' + threw : '')
        reach.push(label); await walk('result:' + call.slice(0, 26))
      }
    } else {
      // start: up to 3 presses of the page's own controls; a tap mid-screen when nothing matched at all
      for (let i = 0; i < 3; i++) {
        const t = await page.evaluate(FIND_START, START[rel] || [], START_WORDS, NOT_START).catch(() => null)
        if (!t) {
          if (i === 0) { await page.mouse.click(195, 422).catch(() => {}); reach.push('tap-center'); await sleep(1500); if (sameDoc()) await walk('tap-center') }
          break
        }
        await page.mouse.click(t.x, t.y).catch(() => {})
        reach.push(t.label)
        await sleep(1500)
        if (!sameDoc()) { reach.push('left-page'); break }
        await walk('start:' + t.label)
      }
      if (sameDoc() && ALL_DAYS[rel]) {
        const n = await page.evaluate(ALL_DAYS[rel]).catch(e => '!' + String(e.message).slice(0, 60))
        reach.push('all-days:' + n); await sleep(800); await walk('all-days')
      }
      for (const [label, count, open] of (sameDoc() && EACH[rel]) || []) {
        const n = await page.evaluate(count).catch(() => 0)
        let bad = 0
        for (let i = 0; i < n; i++) {
          const threw = await page.evaluate(open, i).catch(e => String(e.message).slice(0, 60))
          if (threw) { bad++; continue }
          // ui-sprites swaps a mapped emoji on the next animation frame (ui-sprites.js schedule): let two frames pass so a
          // HUD rewritten in this instant is judged as the child sees it, not in the gap before the swap
          await sleep(300); await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))).catch(() => {})
          await walk(label + ':' + i)
        }
        reach.push(label + ':' + n + (bad ? ' (' + bad + ' threw)' : ''))
      }
      // end: the result card of every game with an end routine
      if (sameDoc()) {
        for (const [fn, args] of END[rel] || []) {
          if (ARM[rel]) { await page.evaluate(ARM[rel]).catch(() => {}); await sleep(600) }
          const threw = await page.evaluate(CALL_END, fn, args).catch(e => String(e.message).slice(0, 60))
          reach.push('end:' + fn + (threw ? '!' + threw : ''))
          await walk('end:' + fn)
        }
      }
    }
  }
  const canvas = await page.evaluate(() => window.__emoCanvas || {}).catch(() => ({}))
  for (const [ch, c] of Object.entries(canvas)) {
    if (!canvasAgg[ch]) canvasAgg[ch] = { count: 0, pages: new Set() }
    canvasAgg[ch].count += c; canvasAgg[ch].pages.add(rel)
  }

  const chars = Object.entries(seen)
  const mappedN = chars.filter(([, e]) => e.mapped).reduce((a, [, e]) => a + e.n, 0)
  const unmappedN = chars.filter(([, e]) => !e.mapped).reduce((a, [, e]) => a + e.n, 0)
  for (const [ch, e] of chars) {
    if (!gapAgg[ch]) gapAgg[ch] = { count: 0, mapped: e.mapped, pages: new Set(), where: new Set() }
    gapAgg[ch].count += e.n; gapAgg[ch].pages.add(rel); for (const w of e.where) gapAgg[ch].where.add(rel + ' @' + w)
  }
  const ok = mappedN === 0 && unmappedN === 0
  if (!ok) failPages.push(rel)
  const canvasN = Object.values(canvas).reduce((a, b) => a + b, 0)
  console.log(`${ok ? '✅' : '❌'} ${rel.padEnd(34)} mapped-left=${mappedN}  unmapped=${unmappedN}  canvas=${canvasN}  text=${r1.text}`)
  if (reach.length) console.log('     pass 2:', reach.join(' → '))
  if (!ok) console.log('     EMOJI ON SCREEN:', chars.map(([ch, e]) => `${ch}${e.mapped ? '(mapped)' : ''}×${e.n} @${[...e.where].join('/')}`).join('  '))
  await page.close()
}

await browser.close(); server.close()

const cp = ch => [...ch].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' ')
const gaps = Object.entries(gapAgg)
  .map(([ch, e]) => ({ ch, cp: cp(ch), mapped: e.mapped, count: e.count, pages: [...e.pages], where: [...e.where] }))
  .sort((a, b) => b.count - a.count)
const canvasList = Object.entries(canvasAgg)
  .map(([ch, e]) => ({ ch, cp: cp(ch), count: e.count, pages: [...e.pages] }))
  .sort((a, b) => b.count - a.count)
fs.mkdirSync(path.join(ROOT, 'tools/qa-out'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'tools/qa-out/emoji-gaps.json'), JSON.stringify({ distinctGaps: gaps.length, gaps, canvasReport: canvasList }, null, 2))

const secs = Math.round((Date.now() - t0) / 1000)
console.log(`\nemoji on screen: ${gaps.length} distinct · canvas-painted (report only): ${canvasList.length} distinct · ${secs}s`)
if (failPages.length) { console.log(`\n❌ FAIL — ${failPages.length} view(s) show emoji: ${failPages.join(', ')}`); process.exit(1) }
console.log('\n✅ zero emoji in the rendered DOM of every view, both passes')
