#!/usr/bin/env node
// qa-prd42-listen — PRD-42 (docs/prd/PRD-42-ronde-dengar-huruf.md)
//   L1 G3 Huruf Hutan and G8 Susun Kata: every third round is a "dengar lalu pilih" round when the device has an
//      Indonesian voice — a speaker button, the letter / word is spoken (id-ID), the right tap is the spoken one, and the
//      speaker says it again on a tap. Without an Indonesian voice the same round stays a normal round (no silent
//      speaker in front of a child)
//   L2 G11 Kuis Sains: >= 300 different questions (Timmy bank 'umum' + 'logika' joined), every picture they use exists
//      on disk, 20 sessions over all levels have no question twice in a session, and every answer is a choice
//   L3 answers reach DuniaBus ('answer' events from G3, G8, G11 taps); 0 page errors; screenshots (QA_SHOTS=dir) of the
//      listen rounds and a pictured G11 question at 390x844, 844x390, 800x1280 are looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd42-listen.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|pokemondb|showdown|ipapi|googleapis|gstatic|deviceorientation/i

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
async function open ([w, h], errs, { voice = true } = {}) {
  const c = await b.createBrowserContext(), p = await c.newPage()
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(voice => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'on'); sessionStorage.__s = 1
    }
    // a fake device voice: records what would be spoken, no audio
    window.__said = []; window.__ans = []
    addEventListener('dunia:answer', e => window.__ans.push(e.detail))
    const voices = voice ? [{ lang: 'id-ID', name: 'Bahasa Indonesia', default: true, localService: true, voiceURI: 'id' }] : []
    try {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, speak: u => window.__said.push(u.text + '|' + u.lang), cancel () {}, addEventListener () {}, removeEventListener () {} } })
      window.SpeechSynthesisUtterance = function (t) { this.text = t; this.lang = '' }
    } catch (e) {}
  }, voice)
  await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 60000 })
  await p.waitForFunction(() => typeof window.startGameWithLevel === 'function' && window.DuniaSpeak, { timeout: 30000 }).catch(() => {})
  await sleep(800)
  return { c, p }
}
const start = (p, game, level) => p.evaluate((game, level) => {
  state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]
  state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = game; startGameWithLevel(level)
}, game, level)
async function tapEl (p, el) {
  await el.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })); await sleep(250)
  // a child waits for a toast to pass (the achievement toast covers the G3 choices in landscape for a moment)
  for (let k = 0; k < 25 && !(await el.evaluate(e => { const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!t && (t === e || e.contains(t)) })); k++) await sleep(200)
  const bx = await el.boundingBox(); if (!bx) return false
  if (process.env.QA_DEBUG) console.log('    hit', JSON.stringify(await p.evaluate((x, y) => { const t = document.elementFromPoint(x, y); return t ? t.id + '.' + String(t.className).slice(0, 40) + ' ' + t.textContent.slice(0, 12) : null }, bx.x + bx.width / 2, bx.y + bx.height / 2)), JSON.stringify(bx), await p.evaluate(() => innerHeight + ' ' + scrollY))
  await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); return true
}
async function tapText (p, sel, text) {
  const btns = await p.$$(sel)
  for (const x of btns) {
    if ((await x.evaluate(e => e.textContent.trim())) === String(text)) {
      if (await tapEl(p, x)) return true
    }
  }
  return false
}
// G3: answer three rounds right by real taps; report what round 3 was
async function playG3 (p) {
  const rounds = []
  for (let r = 0; r < 3; r++) {
    await sleep(500)
    await p.waitForFunction(() => document.querySelectorAll('#g3-choices .g3-choice-btn:not(.correct):not(.wrong)').length >= 2, { timeout: 6000 }).catch(() => {})
    const st = await p.evaluate(() => ({ rnd: g3State.round, listen: !!document.getElementById('g3-listen'), letter: g3State.isLetterMode, ans: g3State.isLetterMode ? g3State.currentItem.word[g3State.blankPos || 0] : String(Math.min(g3State.currentItem.num, 9)), said: window.__said.slice() }))
    rounds.push(st)
    if (r === 2 && st.listen) {
      if (SH) await p.screenshot({ path: path.join(SH, `g3-listen-${p.viewport().width}x${p.viewport().height}.png`) })
      const before = await p.evaluate(() => window.__said.length)
      await tapEl(p, await p.$('#g3-listen')); await sleep(200)
      st.replay = (await p.evaluate(() => window.__said.length)) > before
    }
    const r0 = await p.evaluate(() => g3State.round)
    st.tapped = await tapText(p, '#g3-choices .g3-choice-btn', st.ans)
    await p.waitForFunction(r0 => g3State.round > r0, { timeout: 6000 }, r0).catch(() => {})
  }
  return rounds
}
async function playG8 (p) {
  const rounds = []
  for (let r = 0; r < 3; r++) {
    await sleep(500)
    const st = await p.evaluate(() => ({ listen: !!document.getElementById('g8-listen'), word: g8State.currentWord, said: window.__said.slice() }))
    rounds.push(st)
    if (r === 2 && st.listen && SH) await p.screenshot({ path: path.join(SH, `g8-listen-${p.viewport().width}x${p.viewport().height}.png`) })
    for (const ch of st.word) {
      const ids = await p.$$eval('#g8-letters .g8-letter-btn:not(.used)', (els, ch) => els.filter(e => e.textContent === ch).map(e => e.id), ch)
      await tapEl(p, await p.$('#' + ids[0]))
      await sleep(330)
    }
    await sleep(2000)
  }
  return rounds
}

if (SH) fs.mkdirSync(SH, { recursive: true })
for (const size of [[390, 844], [844, 390], [800, 1280]]) {
  const tag = `${size[0]}x${size[1]}`
  // L1 G3 + G8 with an Indonesian voice
  {
    const errs = [], { c, p } = await open(size, errs)
    await start(p, 3, 15)
    const g3 = await playG3(p)
    const l = g3[2]
    ok(!g3[0].listen && !g3[1].listen && l.listen && l.letter && l.said.includes('Huruf ' + l.ans + '|id-ID') && l.replay,
      `L1 G3 ${tag}: rounds 1-2 normal, round 3 listen=${l.listen}, spoken ${JSON.stringify(l.said.slice(-1))} answer ${l.ans}, speaker repeats ${l.replay} (rounds ${g3.map(r => r.rnd + (r.tapped ? '' : '!')).join(',')})`)
    const a3 = await p.evaluate(() => window.__ans.filter(a => a.skill === 'awal'))
    await start(p, 8, 15)
    const g8 = await playG8(p)
    const l8 = g8[2]
    ok(!g8[0].listen && !g8[1].listen && l8.listen && l8.said.includes(l8.word.toLowerCase() + '|id-ID'),
      `L1 G8 ${tag}: round 3 listen=${l8.listen}, spoken ${JSON.stringify(l8.said.slice(-1))} word ${l8.word}`)
    const a8 = await p.evaluate(() => window.__ans.filter(a => a.skill === 'susun'))
    ok(a3.length === 3 && a3.every(a => a.ok && a.domain === 'bahasa') && a8.length === 3 && a8.every(a => a.ok) && !errs.length,
      `L3 ${tag}: bus answers G3 ${a3.length} (${a3.map(a => a.item).join(', ')}), G8 ${a8.length}, errors ${errs.slice(0, 2).join(' | ') || 0}`)
    await c.close()
  }
  // L1 without an Indonesian voice: round 3 stays normal
  if (size[0] === 844) {
    const errs = [], { c, p } = await open(size, errs, { voice: false })
    await start(p, 3, 15)
    const g3 = await playG3(p)
    await start(p, 8, 15)
    const g8 = await playG8(p)
    ok(g3.every(r => !r.listen) && g8.every(r => !r.listen) && !errs.length, `L1 no id-ID voice ${tag}: G3 and G8 play 3 normal rounds (listen rounds ${g3.filter(r => r.listen).length + g8.filter(r => r.listen).length})`)
    await c.close()
  }
  // L2 + L3 G11: a pictured Timmy question, a real tap reported
  {
    const errs = [], { c, p } = await open(size, errs)
    await start(p, 11, 3)
    await p.waitForFunction(() => window.TKQuestions && g11State && g11State.pool, { timeout: 15000 }).catch(() => {})
    await sleep(400)
    if (size[0] === 390) {
      const r = await p.evaluate(() => {
        const all = g11AllQuestions(), tk = g11TkPool()
        const distinct = new Set(all.map(q => q.q)).size
        const sessions = []
        for (let k = 0; k < 20; k++) { startGameWithLevel(1 + k % 20); const qs = g11State.pool; sessions.push({ n: qs.length, uniq: new Set(qs.map(q => q.q)).size, okAns: qs.every(q => q.ans >= 0 && q.ans < q.choices.length && (q.answer == null || q.choices[q.ans] === q.answer)) }) }
        return { distinct, tk: tk.length, sci: SCIENCE_QUESTIONS.length, visuals: [...new Set(tk.flatMap(q => q.visual))], sessions }
      })
      const missing = r.visuals.filter(k => !fs.existsSync(path.join(ROOT, 'assets/db/lib', k + '.webp')))
      ok(r.distinct >= 300 && !missing.length, `L2 G11 bank: ${r.distinct} different questions (${r.sci} science + ${r.tk} Timmy), ${r.visuals.length} pictures, missing on disk ${missing.length} ${missing.slice(0, 3).join(' ')}`)
      ok(r.sessions.every(s => s.n > 0 && s.n === s.uniq && s.okAns), `L2 G11 20 sessions: no question twice, every answer a choice (${r.sessions.map(s => s.n + '/' + s.uniq).slice(0, 6).join(' ')} ...)`)
      await start(p, 11, 3); await sleep(400)
    }
    // put a pictured Timmy question first and answer it right by a real tap
    const q = await p.evaluate(() => {
      const t = g11TkPool().find(x => x.visual.length >= 2)
      const ch = t.choices.slice(); g11State.pool[0] = { ...t, choices: ch, ans: ch.indexOf(t.answer) }; g11State.idx = 0; g11ShowQuestion()
      return { q: t.q, answer: t.answer, imgs: document.querySelectorAll('#g11-emoji img').length }
    })
    await sleep(900)
    const loaded = await p.evaluate(() => [...document.querySelectorAll('#g11-emoji img')].every(i => i.complete && i.naturalWidth > 0))
    if (SH) await p.screenshot({ path: path.join(SH, `g11-${tag}.png`) })
    await tapText(p, '#g11-choices .sci-choice', q.answer); await sleep(600)
    const a = await p.evaluate(() => window.__ans.filter(x => x.ok === true).length)
    ok(q.imgs >= 2 && loaded && a >= 1 && !errs.length, `L3 G11 ${tag}: "${q.q}" with ${q.imgs} pictures loaded ${loaded}, right tap reported (${a}), errors ${errs.slice(0, 2).join(' | ') || 0}`)
    await c.close()
  }
}
await b.close()
console.log(`qa-prd42-listen: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
