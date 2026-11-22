#!/usr/bin/env node
// qa-prd52-g9 — PRD-52 (docs/prd/PRD-52-g9-jejak-huruf.md): G9 Jejak Huruf gets a picture word, a note per stroke and
// stroke-order arrows. Nothing is read aloud (PRD-55).
//   L1 every letter A-Z: its round shows a picture word that starts with that letter (the picture loads), and the
//      letters with fewer than 3 picture words in the library are listed (reported, not hidden)
//   L2 three real strokes -> 3 notes with sound on (AudioContext oscillators), 0 with sound off; a tap is not a stroke;
//      speechSynthesis.speak 0 times
//   L3 arrows: on 'A' one arrow per step long enough to hold one, each pointing from its dot to the next (+-2 deg)
//   L4 word mode (level 25): the word list is the old 60 plus the picture words (>= 120 words), a word with a picture
//      shows it
//   L5 390x844, 844x390, 800x1280: the picture is fully on screen, >= 40 px; the whole canvas and Selesai too (844x390
//      had the canvas below the fold); screenshots (QA_SHOTS=dir) looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd52-g9.mjs
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

async function open (size, sound = 'on') {
  const c = await b.createBrowserContext(), p = await c.newPage(), errs = []
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(sound => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'pintar' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', sound); sessionStorage.__s = 1
    }
    window.__osc = 0; window.__spoken = 0
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) { const o = AC.prototype.createOscillator; AC.prototype.createOscillator = function () { window.__osc++; return o.call(this) } }
    if (window.speechSynthesis) speechSynthesis.speak = () => { window.__spoken++ }
  }, sound)
  await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 120000 })
  await p.waitForFunction(() => typeof window.startGameWithLevel === 'function', { timeout: 60000 }); await sleep(600)
  return { c, p, errs }
}
async function start (p, lv) {
  await p.evaluate(lv => { state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'pintar', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'pintar', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = 9; startGameWithLevel(lv) }, lv)
  await p.waitForFunction(() => typeof g9State !== 'undefined' && g9State.sequence && g9State.round > 0, { timeout: 20000 }).catch(() => {})
  await sleep(700)
}
const pic = p => p.evaluate(() => {
  const el = document.getElementById('g9-pic'), img = el && el.querySelector('img'), r = el && el.getBoundingClientRect()
  return { shown: !!el && !el.hidden, word: (el && el.textContent || '').trim(), loaded: !!img && img.complete && img.naturalWidth > 0, letter: g9State.currentLetter,
    w: img ? Math.round(img.getBoundingClientRect().width) : 0, on: !!r && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 }
})

// L1 + L3 + L2
{
  const { c, p, errs } = await open([390, 844])
  await start(p, 14)
  const lib = await p.evaluate(() => { const n = {}; Object.keys(LETTER_GUIDES).forEach(L => { n[L] = g9PicPool().filter(x => x.word[0] === L).length }); return n })
  const bad = []
  for (const L of Object.keys(lib)) {
    await p.evaluate(L => { g9State.sequence = [L]; g9State.round = 0; g9State.maxRound = 1; nextG9Round() }, L)
    await p.waitForFunction(() => { const i = document.querySelector('#g9-pic img'); return !i || (i.complete && i.naturalWidth > 0) }, { timeout: 5000 }).catch(() => {})
    const r = await pic(p)
    if (lib[L] && !(r.shown && r.loaded && r.word[0] === L)) bad.push(L + ':' + JSON.stringify(r))
    if (!lib[L] && r.shown) bad.push(L + ': picture without a word in the library')
  }
  const thin = Object.entries(lib).filter(([, n]) => n < 3).map(([L, n]) => L + n)
  ok(!bad.length && Object.values(lib).filter(Boolean).length >= 20 && !errs.length, `L1 26 letters: wrong/missing picture ${bad.length} ${bad.slice(0, 2).join(' ')}; letters with < 3 picture words (reported): ${thin.join(' ') || 'none'}`)
  // L3 arrows on 'A'
  await p.evaluate(() => { g9State.sequence = ['A']; g9State.round = 0; g9State.maxRound = 1; nextG9Round() }); await sleep(300)
  const ar = await p.evaluate(() => {
    const W = g9Canvas.width, H = g9Canvas.height, g = LETTER_GUIDES.A
    const want = []; for (let i = 0; i < g.length - 1; i++) { const dx = (g[i + 1].x - g[i].x) * W, dy = (g[i + 1].y - g[i].y) * H; if (Math.hypot(dx, dy) >= Math.min(W, H) * 0.16) want.push({ i, deg: Math.atan2(dy, dx) * 180 / Math.PI }) }
    const got = [...document.querySelectorAll('#g9-guide-dots .g9-arrow')].map(a => { const m = new DOMMatrix(getComputedStyle(a).transform); return { i: +a.dataset.from, deg: Math.atan2(m.b, m.a) * 180 / Math.PI } })
    const off = want.filter(w => { const x = got.find(o => o.i === w.i); return !x || Math.abs(((x.deg - w.deg + 540) % 360) - 180) > 2 })
    return { want: want.length, got: got.length, off: off.length }
  })
  ok(ar.want >= 3 && ar.got === ar.want && !ar.off, `L3 'A': arrows ${ar.got} of ${ar.want} steps, pointing wrong ${ar.off}`)
  if (SH) await p.screenshot({ path: path.join(SH, 'g9-letter-390x844.png') })
  // L2 strokes, sound on
  const strokes = async () => {
    const r = await (await p.$('#g9-canvas')).boundingBox()
    await p.evaluate(() => { window.__osc = 0 })
    const line = async (x0, y0, x1, y1) => { await p.mouse.move(r.x + r.width * x0, r.y + r.height * y0); await p.mouse.down(); for (let k = 1; k <= 8; k++) await p.mouse.move(r.x + r.width * (x0 + (x1 - x0) * k / 8), r.y + r.height * (y0 + (y1 - y0) * k / 8)); await p.mouse.up(); await sleep(150) }
    await line(0.5, 0.05, 0.2, 0.95); await line(0.5, 0.05, 0.8, 0.95); await line(0.35, 0.55, 0.65, 0.55)
    await p.mouse.click(r.x + r.width * 0.5, r.y + r.height * 0.5); await sleep(200)   // a tap: no note
    return p.evaluate(() => ({ osc: window.__osc, strokes: g9State.strokes, spoken: window.__spoken }))
  }
  const on = await strokes()
  await p.evaluate(() => { localStorage.setItem('dunia-emosi-sound', 'off'); g9Clear() })
  const off = await strokes()
  ok(on.osc === 3 && on.strokes === 3 && off.osc === 0 && !on.spoken && !off.spoken && !errs.length, `L2 3 strokes + 1 tap: notes ${on.osc} with sound on (strokes counted ${on.strokes}), ${off.osc} with sound off, spoken ${on.spoken + off.spoken}, errors ${errs.slice(0, 2).join(' | ') || 0}`)
  await c.close()
}
// L4 word mode
{
  const { c, p, errs } = await open([390, 844])
  await start(p, 25)
  const r = await p.evaluate(() => { const pw = g9PicPool().filter(x => x.word.length >= 3 && x.word.length <= 7).map(x => x.word); return { mode: g9State.wordMode, all: new Set([...WORD_LIST_G9, ...pw]).size, pics: pw.length } })
  await p.evaluate(() => { const w = g9PicPool().find(x => x.word.length >= 3 && x.word.length <= 7); g9State.sequence = [w.word]; g9State.round = 0; g9State.maxRound = 1; nextG9Round() }); await sleep(800)
  const q = await pic(p)
  ok(r.mode && r.all >= 120 && q.shown && q.loaded && !errs.length, `L4 word mode: ${r.all} words (${r.pics} with a picture), "${q.word}" shows its picture ${q.loaded}`)
  if (SH) await p.screenshot({ path: path.join(SH, 'g9-word-390x844.png') })
  await c.close()
}
// L5 sizes
for (const size of [[390, 844], [844, 390], [800, 1280]]) {
  const { c, p, errs } = await open(size)
  await start(p, 14)
  await p.evaluate(() => { g9State.sequence = ['B']; g9State.round = 0; g9State.maxRound = 1; nextG9Round() })
  await p.waitForFunction(() => { const i = document.querySelector('#g9-pic img'); return i && i.complete && i.naturalWidth > 0 }, { timeout: 5000 }).catch(() => {})
  await p.evaluate(() => window.scrollTo(0, 0)); await sleep(300)
  const q = await pic(p)
  const cv = await p.evaluate(() => { const r = document.querySelector('.g9-canvas-wrap').getBoundingClientRect(), d = document.getElementById('g9-done-btn').getBoundingClientRect(); return { cv: r.top >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, h: Math.round(r.height), done: d.bottom <= innerHeight + 1 && d.height >= 44 } })
  ok(q.shown && q.loaded && q.on && q.w >= 40 && cv.cv && cv.done && !errs.length, `L5 ${size.join('x')}: picture "${q.word}" ${q.w} px, on screen ${q.on}; canvas ${cv.h} px on screen ${cv.cv}; Selesai on screen ${cv.done}; errors ${errs.length}`)
  if (SH) await p.screenshot({ path: path.join(SH, `g9-${size.join('x')}.png`) })
  await c.close()
}
await b.close()
console.log(`qa-prd52-g9: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
