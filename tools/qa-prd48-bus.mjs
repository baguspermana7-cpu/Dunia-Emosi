#!/usr/bin/env node
// qa-prd48-bus — PRD-48 (docs/prd/PRD-48-bus-tujuh-game-buta.md): the 7 games that told nobody what the child answered
// now report every answer on DuniaBus, so the learning log, the parent page and mastery see them.
//   L1 per game, N real taps on the game's own answer buttons -> N records with that game's id
//      G4 Hitung Binatang, G7 Tebak Gambar, G9 Jejak Huruf (a real traced stroke + "Selesai"), G10 Cuaca,
//      G13 Pokemon Battle, G13b Quick Fire (hub), G6 Mobil (one record per finished word)
//   L2 every record's skill has a parent-readable name (LearningLog.label never says "Lainnya")
//   L3 0 page errors
//   L4 a hub record carries the hub game's id (g4, g7...), not the page name 'index'
// G21/G22/G24 already report every question (DuniaAnswerQ in their per-question handlers, read 2026-11-21).
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd48-bus.mjs
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|googleapis|gstatic/i
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

async function open (path, extra, size = [844, 390]) {
  const c = await b.createBrowserContext(), p = await c.newPage(), errs = []
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(extra => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); localStorage.setItem('g13_lastFamily', 'ash-pikachu')
      Object.entries(extra || {}).forEach(([k, v]) => sessionStorage.setItem(k, v)); sessionStorage.__s = 1
    }
    window.__ans = []; addEventListener('dunia:answer', e => window.__ans.push(e.detail))
  }, extra)
  await p.goto(BASE + path, { waitUntil: 'load', timeout: 120000 })
  return { c, p, errs }
}
const tapEl = async (p, el) => { await el.evaluate(e => e.scrollIntoView({ block: 'center' })); const bx = await el.boundingBox(); if (!bx) return false; await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); return true }
async function tapFirst (p, sel, timeout = 15000) {
  const okw = await p.waitForFunction(s => [...document.querySelectorAll(s)].some(e => !e.disabled && e.offsetParent && getComputedStyle(e).pointerEvents !== 'none'), { timeout }, sel).then(() => true).catch(() => false)
  if (!okw) return false
  const el = (await p.$$(sel))[0]
  return tapEl(p, el)
}
async function records (p, game) {
  await sleep(400)
  return p.evaluate(g => (window.__ans || []).filter(a => a.game === g).map(a => ({ skill: a.skill, label: window.LearningLog ? LearningLog.label(a.skill, a.domain) : '?', ok: a.ok })), game)
}
function judge (tag, taps, recs, errs) {
  ok(taps > 0 && recs.length === taps, `L1 ${tag}: ${taps} real answers -> ${recs.length} records (${[...new Set(recs.map(r => r.label))].join(', ') || '-'})`)
  ok(recs.length > 0 && recs.every(r => r.label && r.label !== 'Lainnya'), `L2 ${tag}: every skill has a name (${recs.map(r => r.skill).join(',') || '-'})`)
  ok(!errs.length, `L3 ${tag}: page errors ${errs.slice(0, 2).join(' | ') || 0}`)
}
async function hub (n, size) {
  const r = await open('/index.html?nocine=1', null, size)
  await r.p.waitForFunction(() => typeof window.startGameWithLevel === 'function', { timeout: 60000 })
  await sleep(600)
  await r.p.evaluate(n => { state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = n; startGameWithLevel(1) }, n)
  return r
}

// G4 / G7 / G10 / G13 / G13b: two questions each, a real tap on the first live choice (G4 and G10: the right one —
// since PRD-51 a wrong G4 tap leaves the round open for another try, and only the first tap of a round is reported)
for (const [tag, n, sel, ready] of [
  ['G4', 4, '#g4-choices .g4-choice-btn', () => !g4State.answered],
  ['G7', 7, '.g7-choice-btn', () => !g7State.answered],
  ['G10', 10, '.g10-cbtn:not([disabled])', () => typeof g10State !== 'undefined' && g10State.playerPoke && !g10State.locked],
  ['G13', 13, '.g13-choice-btn:not([disabled])', () => typeof g13State !== 'undefined' && g13State.phase === 'player_attack' && !g13State.locked]
]) {
  const { c, p, errs } = await hub(n)
  let taps = 0
  for (let k = 0; k < 2; k++) {
    const live = await p.waitForFunction(ready, { timeout: 25000 }).then(() => true).catch(() => false)
    if (!live) break
    const before = await p.evaluate(() => (window.__ans || []).length)
    if (await tapFirst(p, tag === 'G10' ? await p.evaluate(() => { const b = [...document.querySelectorAll('.g10-cbtn:not([disabled])')].find(x => x.textContent.trim() === String(g10State.currentAnswer)); if (b) b.setAttribute('data-qa-right', '1'); return b ? '.g10-cbtn[data-qa-right]' : '.g10-cbtn:not([disabled])' }) : tag === 'G4' ? await p.evaluate(() => `#g4-choices .g4-choice-btn[data-v="${g4State.answer}"]`) : sel)) { taps++; await p.waitForFunction(b => window.__ans.length > b, { timeout: 4000 }, before).catch(() => {}) }
    await p.evaluate(() => document.querySelectorAll('[data-qa-right]').forEach(e => e.removeAttribute('data-qa-right')))
    await sleep(2500)  // feedback, then the next question
  }
  judge(tag, taps, await records(p, 'g' + n), errs)
  await c.close()
}
{ // G13b Quick Fire
  const { c, p, errs } = await hub(13)
  await sleep(1500)
  await p.evaluate(() => startQuickFire())
  let taps = 0
  for (let k = 0; k < 2; k++) {
    const live = await p.waitForFunction(() => typeof g13bState !== 'undefined' && g13bState.phase === 'playing' && !g13bState.locked, { timeout: 25000 }).then(() => true).catch(() => false)
    if (!live) break
    if (await tapFirst(p, '.g13b-choice-btn:not([disabled])')) taps++
    await sleep(2500)
  }
  judge('G13b', taps, await records(p, 'g13b'), errs)
  await c.close()
}
{ // G9: trace the letter through its own guide points with a real pointer, then "Selesai"
  // portrait: at 844x390 the 448 px tracing canvas is taller than the screen (noted for PRD-52)
  const { c, p, errs } = await hub(9, [390, 844])
  await p.waitForFunction(() => typeof g9State !== 'undefined' && g9State.currentLetter && document.getElementById('g9-canvas').offsetParent, { timeout: 25000 }).catch(() => {})
  await sleep(800)
  const pts = await p.evaluate(() => {
    const cv = document.getElementById('g9-canvas'); cv.scrollIntoView({ block: 'center' }); const r = cv.getBoundingClientRect()
    return getG9Guides(g9State.currentLetter).map(g => ({ x: r.left + g.x * r.width, y: r.top + g.y * r.height }))
  })
  if (pts.length) {
    await p.mouse.move(pts[0].x, pts[0].y); await p.mouse.down()
    for (const q of pts) await p.mouse.move(q.x, q.y, { steps: 6 })
    await p.mouse.up()
  }
  const done = await p.$('#g9-done-btn')
  const taps = pts.length && done && await tapEl(p, done) ? 1 : 0
  judge('G9', taps, await records(p, 'g9'), errs)
  await c.close()
}
{ // G6 Mobil: two finished words (one clean, one with a wrong letter first)
  const { c, p, errs } = await open('/games/mobil.html?nocine=1', { g6Config: JSON.stringify({ mapTheme: 'city', level: 1, totalWords: 5 }) })
  await p.waitForFunction(() => typeof app !== 'undefined' && app && app.ticker && S.wordList.length > 0, { timeout: 60000 }).catch(() => {})
  await sleep(600)
  await p.evaluate(() => { selectedDiff = 'easy'; startFromSelect() })
  await sleep(500)
  // the car "taps" a letter by driving into it: hitTile is the game's own collision handler
  const word = () => p.evaluate(() => { for (let i = S.letterIdx; i < S.currentWord.length; i++) hitTile({ _letter: S.currentWord[S.letterIdx], x: 100, y: 300, _alive: true }) })
  await word()
  await p.waitForFunction(() => document.getElementById('ovl-wc').classList.contains('show'), { timeout: 5000 }).catch(() => {}) // wordComplete runs 320 ms later
  await p.evaluate(() => { document.getElementById('ovl-wc').classList.remove('show'); startWord() })
  await p.evaluate(() => { S.invincible = 0; const w = S.currentWord[S.letterIdx]; hitTile({ _letter: w === 'Q' ? 'X' : 'Q', x: 100, y: 300, _alive: true }) })
  await word()
  await p.waitForFunction(() => document.getElementById('ovl-wc').classList.contains('show'), { timeout: 5000 }).catch(() => {})
  const recs = await records(p, 'mobil')
  judge('G6', 2, recs, errs)
  ok(recs.length === 2 && recs[0].ok === true && recs[1].ok === false, `L1 G6: clean word ok ${recs[0] && recs[0].ok}, word with a wrong letter ok ${recs[1] && recs[1].ok}`)
  await c.close()
}
await b.close()
console.log(`qa-prd48-bus: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
