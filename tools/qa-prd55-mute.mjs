#!/usr/bin/env node
// qa-prd55-mute — PRD-55 (docs/prd/PRD-55-tanpa-tts-tombol-bisu.md, owner 2026-11-22): nothing is read aloud by the
// browser voice any more, and a mute button is back on the screen being played.
//   L1 with sound on and an Indonesian voice available, speechSynthesis.speak is called 0 times: hub beranda (+ the
//      feeling check-in and the "main berikutnya" card) and a G7 session; and on 6 pages (load + first taps)
//   L2 a G7 session at level 14 has no listen round and no listen button
//   L3 every hub game header and the beranda has a mute button, on screen and >= 44 px (the header's tap rule) at
//      390x844, 844x390, 800x1280; a tap sets 'dunia-emosi-sound' off and back on; while off, a right answer plays no
//      SFXEngine sound
//   L4 the header button and the Settings overlay agree both ways
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd55-mute.mjs   (QA_SHOTS=dir for screenshots)
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

async function open (url, size = [390, 844]) {
  const c = await b.createBrowserContext(), p = await c.newPage(), errs = []
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'on'); sessionStorage.__s = 1
    }
    window.__spoken = []
    if (window.speechSynthesis) {   // an Indonesian voice exists; every line handed to the speaker is recorded
      const fake = { lang: 'id-ID', name: 'Indonesian', default: true, localService: true, voiceURI: 'id' }
      speechSynthesis.getVoices = () => [fake]
      speechSynthesis.speak = u => { window.__spoken.push(String(u && u.text)) }
      try { Object.defineProperty(SpeechSynthesisUtterance.prototype, 'voice', { set () {}, get () { return null }, configurable: true }) } catch (e) {}
    }
  })
  await p.goto(BASE + url, { waitUntil: 'load', timeout: 120000 })
  return { c, p, errs }
}
const spoken = p => p.evaluate(() => window.__spoken.slice())
async function hubGame (p, n, lv) {
  await p.waitForFunction(() => typeof window.startGameWithLevel === 'function', { timeout: 60000 }); await sleep(600)
  await p.evaluate((n, lv) => { state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = n; startGameWithLevel(lv) }, n, lv)
}

// L1 + L2: hub
{
  const { c, p, errs } = await open('/index.html?nocine=1')
  await sleep(800); await p.evaluate(() => showScreen('screen-menu')); await sleep(3500)   // check-in + card line
  const beranda = await spoken(p)
  await hubGame(p, 7, 14)
  await p.waitForFunction(() => !!window.TKQuestions, { timeout: 15000 }).catch(() => {})
  const modes = []
  for (let k = 0; k < 4; k++) {
    const live = await p.waitForFunction(() => typeof g7State !== 'undefined' && g7State.cur && !g7State.answered && document.querySelector('.g7-choice-btn'), { timeout: 8000 }).then(() => true).catch(() => false)
    if (!live) break
    await sleep(500)
    const r = await p.evaluate(() => ({ mode: g7State.mode, id: g7State.cur.id, listen: !!document.getElementById('g7-listen') }))
    modes.push(r.mode + (r.listen ? '+btn' : ''))
    const h = await p.$(`.g7-choice-btn[data-id="${r.id}"]`); if (h) await h.evaluate(e => e.click())
    await sleep(2000)
  }
  const all = await spoken(p)
  ok(!all.length && !errs.length, `L1 hub: spoken on beranda ${beranda.length}, after a G7 session ${all.length} ${JSON.stringify(all.slice(0, 3))}, errors ${errs.slice(0, 2).join(' | ') || 0}`)
  ok(modes.length >= 3 && !modes.some(m => /listen|btn/.test(m)), `L2 G7 level 14 with a voice: rounds ${JSON.stringify(modes)}`)
  await c.close()
}
// L1: pages
for (const pg of ['kuis-matematika', 'ayo-berhitung', 'cek-kemampuan', 'lokomotif-pemberani', 'mojo-swoptops', 'timmy-kapal']) {
  const { c, p } = await open(`/games/${pg}.html?nocine=1`)
  await sleep(2500)
  for (let k = 0; k < 3; k++) {   // the first visible buttons, as a child would tap
    await p.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(e => e.offsetParent && !e.disabled && !/kembali|back|home|keluar/i.test(e.textContent + (e.getAttribute('aria-label') || ''))); if (bs[0]) bs[0].click() })
    await sleep(1200)
  }
  const s = await spoken(p)
  ok(!s.length, `L1 ${pg}: spoken ${s.length} ${JSON.stringify(s.slice(0, 2))}`)
  await c.close()
}
// L3 + L4
for (const size of [[390, 844], [844, 390], [800, 1280]]) {
  const tag = size.join('x')
  const { c, p, errs } = await open('/index.html?nocine=1', size)
  await p.waitForFunction(() => typeof window.showScreen === 'function' && window.MuteButton, { timeout: 60000 }).catch(() => {}); await sleep(800)
  const screens = await p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => s.querySelector(':scope > .game-header, .game-header')).map(s => s.id))
  const bad = []
  for (const id of ['screen-menu', ...screens]) {
    await p.evaluate(id => showScreen(id), id); await sleep(700)   // the screen enters at scale(.98): measure after it
    const m = await p.evaluate(id => {
      const btn = document.getElementById(id).querySelector('.dunia-mute'); if (!btn) return { id, none: true }
      const r = btn.getBoundingClientRect()
      return { id, w: Math.round(r.width), h: Math.round(r.height), on: r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1, svg: !!btn.querySelector('svg') }
    }, id)
    if (m.none || m.w < 44 || m.h < 44 || !m.on || !m.svg) bad.push(m)
    if (SH && (id === 'screen-menu' || id === 'screen-game4')) await p.screenshot({ path: path.join(SH, `mute-${id}-${tag}.png`) })
  }
  ok(screens.length >= 10 && !bad.length && !errs.length, `L3 ${tag}: ${screens.length + 1} screens, missing/small/off ${bad.length} ${bad.map(m => m.id.replace('screen-', '') + (m.none ? ':none' : ':' + m.w + 'x' + m.h + (m.on ? '' : ':off'))).join(' ')}, errors ${errs.length}`)
  if (tag !== '390x844') { await c.close(); continue }
  // a real tap on the beranda button, then the G4 header button
  await p.evaluate(() => showScreen('screen-menu')); await sleep(300)
  const tapSel = async sel => { const h = await p.$(sel); await h.evaluate(e => e.scrollIntoView({ block: 'center' })); const r = await h.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await sleep(300) }
  await tapSel('#screen-menu .dunia-mute')
  const k1 = await p.evaluate(() => localStorage.getItem('dunia-emosi-sound'))
  const sfx = await p.evaluate(() => { let n = 0; const S = window.SFXEngine; if (S) { const o = S.correct; S.correct = () => { n++ }; try { playCorrect() } finally { S.correct = o } } return n })
  await tapSel('#screen-menu .dunia-mute')
  const k2 = await p.evaluate(() => localStorage.getItem('dunia-emosi-sound'))
  ok(k1 === 'off' && sfx === 0 && k2 === 'on', `L3 beranda tap: key ${k1} (right-answer SFX while muted ${sfx}), tap again ${k2}`)
  await hubGame(p, 4, 1); await sleep(800)
  await tapSel('#screen-game4 .dunia-mute')
  const st = await p.evaluate(() => { openSettingsFromPause(); return document.getElementById('settings-sound-btn').textContent.trim() })
  await p.evaluate(() => document.getElementById('settings-sound-btn').click()); await sleep(200)
  const back = await p.evaluate(() => document.querySelector('#screen-game4 .dunia-mute').dataset.state)
  ok(st === 'OFF' && back === 'on', `L4 header mute -> Settings shows ${st}; Settings ON -> header ${back}`)
  await c.close()
}
await b.close()
console.log(`qa-prd55-mute: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
