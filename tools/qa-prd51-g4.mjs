#!/usr/bin/env node
// qa-prd51-g4 — PRD-51 (docs/prd/PRD-51-g4-hitung-binatang.md): G4 Hitung Binatang counts sprites (DBLabeled hewan /
// buah / benda, no emoji) in three kinds of round.
//   L1 one medium session (real taps on the right answer) asks all three kinds: count, flash (1-5 shown 1.5 s, then
//      hidden), compare ("mana yang lebih banyak?", two groups, two picture buttons)
//   L2 two wrong taps on a count round -> the number hint (each sprite gets its number when tapped: 1, 2, 3 ... in tap
//      order) appears right after the 2nd wrong, not after the 1st; the round then still takes the right answer
//   L3 50 random rounds of each kind: the sprites in the grid = the answer (compare: each group = its number, the
//      groups differ); flash 1..5; count within the cap
//   L4 0 emoji in the rendered G4 screen across a session
//   L5 390x844, 844x390, 800x1280: the grid (a 20-item round) and the choices on screen, choices >= 48 px;
//      screenshots (QA_SHOTS=dir) of each kind looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd51-g4.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|googleapis|gstatic/i
if (SH) fs.mkdirSync(SH, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', protocolTimeout: 240000, args: ['--no-sandbox', '--disable-audio-output'] })

async function open (size, tier = 'tumbuh') {
  const c = await b.createBrowserContext(), p = await c.newPage(), errs = []
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(tier => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: tier }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
    }
  }, tier)
  await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 120000 })
  await p.waitForFunction(() => typeof window.startGameWithLevel === 'function', { timeout: 60000 }); await sleep(600)
  return { c, p, errs }
}
const start = (p, lv, tier = 'tumbuh') => p.evaluate((lv, tier) => { state.players = [{ name: 'Ana', animal: '🦁', ageTier: tier, stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: tier, stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = 4; startGameWithLevel(lv) }, lv, tier)
const live = p => p.waitForFunction(() => typeof g4State !== 'undefined' && g4State.kind && !g4State.answered && document.querySelector('#g4-choices .g4-choice-btn:not([disabled])'), { timeout: 8000 }).then(() => true).catch(() => false)
const look = p => p.evaluate(() => {
  const s = g4State, grid = document.getElementById('g4-animals'), scr = document.getElementById('screen-game4'), emo = /\p{Extended_Pictographic}/u
  const vis = el => { const st = getComputedStyle(el); return st.display !== 'none' && st.visibility !== 'hidden' && el.getClientRects().length }
  let txt = ''; const w = document.createTreeWalker(scr, NodeFilter.SHOW_TEXT); let n
  while ((n = w.nextNode())) if (n.parentElement && vis(n.parentElement)) txt += n.textContent
  const groups = [...grid.querySelectorAll('.g4-group')].map(g => g.querySelectorAll('img.g4-animal-item').length)
  const r = grid.getBoundingClientRect()
  const btns = [...document.querySelectorAll('#g4-choices .g4-choice-btn')].map(x => { const q = x.getBoundingClientRect(); return { v: x.dataset.v, w: x.offsetWidth, h: x.offsetHeight, on: q.left >= 0 && q.right <= innerWidth + 1 && q.top >= 0 && q.bottom <= innerHeight + 1 } })
  return { kind: s.kind, answer: s.answer, count: s.currentCount, counts: s.groupCounts || null, max: s.maxCount, items: grid.querySelectorAll('img.g4-animal-item').length, groups,
    emoji: emo.test(txt), gridOn: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, btns }
})
const tapSel = async (p, sel) => { const h = await p.$(sel); if (!h) return false; await h.evaluate(e => e.scrollIntoView({ block: 'nearest' })); await sleep(150); const bx = await h.boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); return true }

// L1 + L4 + L5 screenshots: a medium session at 390x844 by real taps
const shots = {}
async function session (size) {
  const { c, p, errs } = await open(size)
  await start(p, 14)
  const seen = []
  for (let k = 0; k < 30; k++) {
    const done = await p.evaluate(() => { const r = document.getElementById('screen-result'); return !!(r && r.classList.contains('active')) })
    if (done) break
    if (!await live(p)) { await sleep(500); continue }
    await sleep(700)
    const r = await look(p); seen.push(r)
    if (SH && !shots[r.kind + size[0]]) { shots[r.kind + size[0]] = 1; await p.screenshot({ path: path.join(SH, `g4-${r.kind}-${size[0]}x${size[1]}.png`) }) }
    if (r.kind === 'flash') await sleep(1700)   // the pictures hide after 1.5 s; the answer is still taken
    await tapSel(p, `#g4-choices .g4-choice-btn[data-v="${r.answer}"]`)
    await sleep(1700)
  }
  await c.close()
  return { seen, errs }
}
{
  const { seen, errs } = await session([390, 844])
  const kinds = new Set(seen.map(r => r.kind))
  ok(kinds.has('count') && kinds.has('flash') && kinds.has('compare') && seen.length >= 9 && !errs.length, `L1 medium session: ${seen.length} rounds, kinds ${[...kinds].join(',')}, errors ${errs.slice(0, 2).join(' | ') || 0}`)
  ok(seen.length && !seen.some(r => r.emoji), `L4 emoji on screen in ${seen.filter(r => r.emoji).length} of ${seen.length} rounds`)
}
// L2
{
  const { c, p, errs } = await open([390, 844])
  await start(p, 14)
  let found = false
  for (let k = 0; k < 12 && !found; k++) {
    if (!await live(p)) { await sleep(400); continue }
    const r = await look(p)
    if (r.kind !== 'count' || r.btns.length < 3 || r.items < 3) { /* 3 sprites to number: CI drew a count of 1 and read "1,1,1" */ await tapSel(p, `#g4-choices .g4-choice-btn[data-v="${r.answer}"]`); await sleep(1700); continue }
    found = true
    const wrong = r.btns.filter(x => String(x.v) !== String(r.answer)).map(x => x.v)
    await tapSel(p, `#g4-choices .g4-choice-btn[data-v="${wrong[0]}"]`); await sleep(500)
    const h1 = await p.evaluate(() => ({ hint: !!g4State.hint, tappable: document.querySelectorAll('#g4-animals .g4-animal-item.g4-tap').length }))
    await tapSel(p, `#g4-choices .g4-choice-btn[data-v="${wrong[1]}"]`); await sleep(500)
    const h2 = await p.evaluate(() => ({ hint: !!g4State.hint, tappable: document.querySelectorAll('#g4-animals .g4-animal-item.g4-tap').length }))
    // tap three sprites: they get 1, 2, 3 in tap order; a second tap on the first keeps its number
    const items = await p.$$('#g4-animals img.g4-animal-item')
    const order = [Math.min(2, items.length - 1), 0, Math.min(1, items.length - 1)]
    for (const i of order) { const bx = await items[i].boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); await sleep(200) }
    { const bx = await items[order[0]].boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); await sleep(200) }
    const nums = await p.evaluate(ord => { const it = [...document.querySelectorAll('#g4-animals .g4-animal-item')]; return ord.map(i => { const w = it[i].closest('.g4-cell') || it[i].parentElement; const n = w && w.querySelector('.g4-num'); return n ? n.textContent : null }) }, order)
    if (SH) await p.screenshot({ path: path.join(SH, 'g4-hint-390x844.png') })
    await tapSel(p, `#g4-choices .g4-choice-btn[data-v="${r.answer}"]`); await sleep(600)
    const right = await p.evaluate(a => !!document.querySelector(`#g4-choices .g4-choice-btn.correct[data-v="${a}"]`), r.answer)
    ok(!h1.hint && h1.tappable === 0 && h2.hint && h2.tappable === r.items && JSON.stringify(nums) === '["1","2","3"]' && right && !errs.length,
      `L2 after 1 wrong: hint ${h1.hint}; after 2 wrong: hint ${h2.hint}, tappable ${h2.tappable}/${r.items}; numbers in tap order ${JSON.stringify(nums)}; right answer still taken ${right}; errors ${errs.length}`)
  }
  if (!found) ok(false, 'L2 no count round with 3+ choices reached')
  await c.close()
}
// L3: 50 rounds of each kind, drawn straight through the game's own round function
{
  const { c, p, errs } = await open([390, 844])
  await start(p, 30, 'pintar'); await sleep(800)
  const res = { count: [0, 0], flash: [0, 0], compare: [0, 0], bad: [] }
  for (const kind of ['count', 'flash', 'compare']) for (let chunk = 0; chunk < 5; chunk++) {   // 10 rounds per call: one call for 150 timed out
  const part = await p.evaluate(kind => {
    const out = { count: [0, 0], flash: [0, 0], compare: [0, 0], bad: [] }
    for (let i = 0; i < 10; i++) {
      clearInterval(state.g4Timer); clearTimeout(state.g4StartTO); clearTimeout(state.g4FlashTO)
      g4State.forceKind = kind; g4State.round = 1; nextG4Round()
      const grid = document.getElementById('g4-animals'), s = g4State
      const n = grid.querySelectorAll('img.g4-animal-item').length, gs = [...grid.querySelectorAll('.g4-group')].map(g => g.querySelectorAll('img.g4-animal-item').length)
      let good
      if (kind === 'compare') good = s.kind === 'compare' && gs.length === 2 && s.groupCounts && gs[0] === s.groupCounts[0] && gs[1] === s.groupCounts[1] && gs[0] !== gs[1] && String(s.answer) === (gs[0] > gs[1] ? 'a' : 'b')
      else good = s.kind === kind && n === s.currentCount && String(s.answer) === String(n) && n >= 1 && (kind === 'flash' ? n <= 5 : n <= s.maxCount)
      out[kind][good ? 0 : 1]++
      if (!good && out.bad.length < 3) out.bad.push({ kind, n, gs, count: s.currentCount, answer: s.answer, counts: s.groupCounts })
    }
    clearInterval(state.g4Timer); clearTimeout(state.g4StartTO); clearTimeout(state.g4FlashTO)
    return out
  }, kind)
  for (const k of ['count', 'flash', 'compare']) { res[k][0] += part[k][0]; res[k][1] += part[k][1] }
  res.bad.push(...part.bad.slice(0, 3 - res.bad.length))
  }
  ok(!res.count[1] && !res.flash[1] && !res.compare[1] && res.count[0] === 50 && !errs.length, `L3 sprites = answer: count ${res.count[0]}/50, flash ${res.flash[0]}/50, compare ${res.compare[0]}/50 ${JSON.stringify(res.bad)}, errors ${errs.length}`)
  await c.close()
}
// L5: a 20-item count round and each kind at three sizes
for (const size of [[390, 844], [844, 390], [800, 1280]]) {
  const { c, p, errs } = await open(size, 'pintar')
  await start(p, 30, 'pintar'); await live(p)
  const bad = []
  for (const kind of ['count', 'flash', 'compare']) {
    await p.evaluate(kind => { clearInterval(state.g4Timer); clearTimeout(state.g4StartTO); clearTimeout(state.g4FlashTO); g4State.forceKind = kind; if (kind === 'count') g4State.forceCount = g4State.maxCount; g4State.round = 1; g4State.answered = false; nextG4Round() }, kind)
    await sleep(1400)
    const r = await look(p)
    if (SH) await p.screenshot({ path: path.join(SH, `g4-${kind}-${size[0]}x${size[1]}-size.png`) })
    const small = r.btns.filter(x => x.w < 48 || x.h < 48 || !x.on)
    if (!r.gridOn || small.length) bad.push({ kind, items: r.items, gridOn: r.gridOn, small: small.length })
  }
  ok(!bad.length && !errs.length, `L5 ${size[0]}x${size[1]}: grid + choices on screen, >= 48 px (count round of the cap): ${JSON.stringify(bad)}, errors ${errs.length}`)
  await c.close()
}
await b.close()
console.log(`qa-prd51-g4: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
