#!/usr/bin/env node
// qa-name-escape — audit 2026-11-14 A-5 (docs/audit/full-audit-2026-11-14.md): a player name is text, never markup.
//   L1 dashboard player card: a name holding markup shows as literal text, no element is created, no script runs
//   L2 duo result scores: same for both players
//   L3 a normal name still shows as typed
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-name-escape.mjs
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const EVIL = '<img src=x onerror="window.__pwn=1"><b id="pwn">Ana</b>'
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const p = await b.newPage()
await p.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true })
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.evaluateOnNewDocument(() => { try { localStorage.setItem('dunia-emosi-sound', 'off') } catch (e) {} })
await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 60000 })
await new Promise(r => setTimeout(r, 1500))
const r = await p.evaluate(async evil => {
  const wait = ms => new Promise(r => setTimeout(r, ms))
  const out = {}
  state.players[0] = Object.assign({}, state.players[0], { name: evil })
  state.currentPlayer = 0
  try { showDashboard() } catch (e) { out.dashErr = e.message }
  await wait(300)
  const card = document.getElementById('dash-player-card')
  out.dash = { img: card.querySelectorAll('img[onerror], img[src="x"]').length, b: card.querySelectorAll('#pwn').length, text: card.textContent.includes(evil) }
  state.mode = 'duo'
  state.players[1] = Object.assign({}, state.players[1] || { animal: 'x', stars: 0 }, { name: evil })
  state._showingResult = false
  try { showResult('', 'Hebat', '') } catch (e) { out.resErr = e.message }
  await wait(500)
  const sc = document.getElementById('result-scores')
  out.res = { img: sc.querySelectorAll('img[onerror], img[src="x"]').length, b: sc.querySelectorAll('#pwn').length, n: sc.textContent.split(evil).length - 1 }
  state.players[0].name = 'Ana'; state.mode = 'solo'
  try { showDashboard() } catch (e) {}
  await wait(200)
  out.plain = document.getElementById('dash-player-card').textContent.includes('Ana')
  await wait(500)
  out.pwn = !!window.__pwn
  return out
}, EVIL)
ok(!r.dashErr && r.dash.img === 0 && r.dash.b === 0 && r.dash.text, `L1 dashboard shows the name as text ${JSON.stringify(r.dash)}${r.dashErr || ''}`)
ok(!r.resErr && r.res.img === 0 && r.res.b === 0 && r.res.n === 2, `L2 duo result shows both names as text ${JSON.stringify(r.res)}${r.resErr || ''}`)
ok(r.plain, 'L3 a plain name still shows')
ok(!r.pwn, 'L1/L2 no injected handler ran (window.__pwn unset)')
await b.close()
console.log(`qa-name-escape: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
