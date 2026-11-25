#!/usr/bin/env node
// qa-prd16c-feel — PRD-16C (docs/prd/PRD-16C-namai-perasaan-dalam-cerita.md): after a level the child did not win,
// a card asks "Belum berhasil. Kamu merasa apa?" with three faces.
//   L1 a lost level -> the card -> one record: the train race with no lives left (startRace, hp 0, endRace),
//      Ducky Volley lost 0-2 (endMatch; Mobil retired in PRD-58 E9), a hub game with 0 stars (setLevelComplete) — each stored under its game
//   L2 only once the level is over: nothing during the race; nothing after a level won
//   L3 every face answers with its own written line; speechSynthesis.speak 0 times (PRD-55)
//   L4 the Dasbor shows the picks in their own row "Setelah belum berhasil"
//   L5 a second loss in the same game the same day asks nothing
//   + 390x844, 844x390, 800x1280: the card fits; screenshots (QA_SHOTS=dir) looked at
// The card is skipped in an automated browser unless the URL carries ?feel=1 (as the morning check-in).
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd16c-feel.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|googleapis|gstatic|ResizeObserver|play\(\) request|NotAllowedError/i
if (SH) fs.mkdirSync(SH, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', protocolTimeout: 240000, args: ['--no-sandbox', '--disable-audio-output'] })
const ctx = await b.createBrowserContext()
const errs = []
async function open (url, size = [390, 844]) {
  const p = await ctx.newPage()
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(url + ': ' + e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    if (!localStorage.getItem('__qa_seed')) {
      localStorage.clear(); localStorage.setItem('__qa_seed', '1')
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'on')
      const x = new Date(), d = x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); localStorage.setItem('dunia-feelings', JSON.stringify({ days: { [d]: 'senang' } }))   // the morning check-in is done
    }
    window.__spoken = 0
    if (window.speechSynthesis) speechSynthesis.speak = () => { window.__spoken++ }
  })
  await p.goto(BASE + url, { waitUntil: 'load', timeout: 120000 })
  return p
}
const card = p => p.evaluate(() => { const o = document.getElementById('dfeel'); return o ? { after: o.dataset.after || '', faces: [...o.querySelectorAll('.dfeel-face')].map(b => b.dataset.feel) } : null })
async function pick (p, id) {
  await p.evaluate(id => document.querySelector(`#dfeel .dfeel-face[data-feel="${id}"]`).click(), id); await sleep(400)
  const line = await p.evaluate(() => (document.querySelector('#dfeel .dfeel-line') || {}).textContent || '')
  await p.evaluate(() => { const g = document.querySelector('#dfeel .dfeel-go:not(.dfeel-calm)'); if (g) g.click() }); await sleep(500)
  return line
}
const rec = p => p.evaluate(() => { const k = Object.keys(localStorage).find(k => /feelings$/.test(k) && k !== 'dunia-feelings') || 'dunia-feelings'; const d = JSON.parse(localStorage.getItem(k) || '{}'); return d.after ? Object.values(d.after).reduce((a, x) => Object.assign(a, x), {}) : {} })
const lines = {}

// L1 + L2: the train race
let p = await open('/games/balapan-kereta.html?nocine=1&feel=1')
await p.waitForFunction(() => typeof window.startRace === 'function' || typeof startRace === 'function', { timeout: 60000 }).catch(() => {})
await sleep(2500)   // the Pixi scene is built after load: startRace before it throws (removeChildren)
await p.evaluate(() => { try { localStorage.setItem('g14-tutorial-seen', '1'); const t = TRAIN_MAP['aeg_thomas'] || Object.values(TRAIN_MAP)[0]; S.trainCfg = { ...t, variant: 1 }; window.selectedTrainKey = t.key; startRace() } catch (e) { window.__qaErr = String(e) } })
await p.waitForFunction(() => window.DuniaFeeling && window.DuniaLevel && DuniaLevel.open(), { timeout: 20000 }).catch(() => {})
await sleep(2000)
const during = await card(p)
const diag = await p.evaluate(() => ({ open: !!(window.DuniaLevel && DuniaLevel.open()), feel: !!window.DuniaFeeling, running: S.running, err: window.__qaErr || '' }))
await p.evaluate(() => { S.hp = 0; endRace() })
await p.waitForSelector('#dfeel', { timeout: 6000 }).catch(() => {})
const kc = await card(p)
await sleep(500)   // the card enters in 260 ms
if (SH) await p.screenshot({ path: path.join(SH, 'after-kereta-390x844.png') })
if (kc) lines.sedih = await pick(p, 'sedih')
const spoken1 = await p.evaluate(() => window.__spoken)
const r1 = await rec(p)
ok(!during && kc && kc.after === 'g14' && kc.faces.join() === 'senang,sedih,marah' && r1.g14 === 'sedih', `L1 race lost: card during the race ${!!during}, after endRace ${kc && kc.after} faces ${kc && kc.faces}, stored ${JSON.stringify(r1)} ${kc ? '' : JSON.stringify(diag)}`)
await p.close()
// L1: Ducky Volley lost 0-2 (Petualangan Mobil was retired, PRD-58 E9), then L5 a second loss
const duckLose = async () => {
  await p.evaluate(() => { try { startGame() } catch (e) { window.__qaErr = String(e) } })
  await p.waitForFunction(() => window.DuniaLevel && DuniaLevel.open(), { timeout: 30000 }).catch(() => console.log('  (ducky level did not open)'))
  await p.evaluate(() => { S.pRounds = 0; S.cRounds = 2; endMatch() })
}
p = await open('/games/ducky-volley.html?nocine=1&feel=1')
await duckLose()
await p.waitForSelector('#dfeel', { timeout: 6000 }).catch(() => {})
const mc = await card(p)
if (mc) lines.marah = await pick(p, 'marah')
await p.reload({ waitUntil: 'load' })
await duckLose(); await sleep(2500)
const again = await card(p)
const spoken2 = await p.evaluate(() => window.__spoken)
const r2 = await rec(p)
ok(mc && mc.after === 'g20' && r2.g20 === 'marah', `L1 Ducky Volley lost: card ${mc && mc.after}, stored ${r2.g20}`)
ok(!again, `L5 second Ducky Volley loss today: card ${!!again}`)
await p.close()
// L1 + L2: hub, a level won then a level with 0 stars; L4 the Dasbor
p = await open('/index.html?nocine=1&feel=1')
await p.waitForFunction(() => typeof window.setLevelComplete === 'function' && typeof window.startGameWithLevel === 'function', { timeout: 60000 }); await sleep(800)
const g4 = () => p.evaluate(() => { state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = 4; startGameWithLevel(1) })
await g4(); await sleep(600); await p.evaluate(() => setLevelComplete(4, 1, 3)); await sleep(1800)
const won = await card(p)
await g4(); await sleep(600); await p.evaluate(() => setLevelComplete(4, 1, 0))
await p.waitForSelector('#dfeel', { timeout: 6000 }).catch(() => {})
const hc = await card(p)
if (hc) lines.senang = await pick(p, 'senang')
const spoken3 = await p.evaluate(() => window.__spoken)
ok(!won && hc && hc.after === 'g4', `L1/L2 hub: card after a level won ${!!won}, after 0 stars ${hc && hc.after}`)
ok(Object.keys(lines).length === 3 && new Set(Object.values(lines)).size === 3 && Object.values(lines).every(Boolean) && !spoken1 && !spoken2 && !spoken3,
  `L3 lines ${JSON.stringify(lines)}; spoken ${spoken1 + spoken2 + spoken3}`)
await p.evaluate(() => { showDashboard(true) }); await sleep(800)
const dash = await p.evaluate(() => { const r = document.querySelector('#dash-learn .dash-feel-after'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : '' })
if (SH) { await p.evaluate(() => document.querySelector('#dash-learn').scrollIntoView()); await p.screenshot({ path: path.join(SH, 'dasbor-after-390x844.png') }) }
ok(/Senang 1/.test(dash) && /Sedih 1/.test(dash) && /Marah 1/.test(dash), `L4 Dasbor row: "${dash}"`)
await p.close()
// sizes
for (const size of [[390, 844], [844, 390], [800, 1280]]) {
  p = await open('/index.html?nocine=1&feel=1', size)
  await p.waitForFunction(() => window.DuniaFeeling && DuniaFeeling.askAfter, { timeout: 60000 }); await sleep(600)
  await p.evaluate(() => DuniaFeeling.askAfter('qa-size-' + innerWidth)); await sleep(600)
  const f = await p.evaluate(() => { const c = document.querySelector('#dfeel .dfeel-card'); if (!c) return null; const r = c.getBoundingClientRect(); return { fits: r.top >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, faces: [...c.querySelectorAll('.dfeel-face')].map(e => Math.round(e.getBoundingClientRect().height)) } })
  if (SH) await p.screenshot({ path: path.join(SH, `after-card-${size.join('x')}.png`) })
  ok(!!f && f.fits && f.faces.every(h => h >= 56), `${size.join('x')}: card fits ${f && f.fits}, faces ${f && f.faces} px`)
  await p.close()
}
ok(!errs.length, `page errors ${errs.length} ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(`qa-prd16c-feel: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
