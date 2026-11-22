#!/usr/bin/env node
// qa-prd21-rhythm — PRD-21 (docs/prd/PRD-21-ritme-sesi.md): the parent's play-time limit.
//   L2 limit off (the default): a hub level ends -> no card, no rest screen, and no session key written
//   L1 limit 20 min, set in the Dasbor behind the parent gate: a level that ends at minute 5 shows nothing; a level
//      during which the (fake) clock passes 20 min shows nothing mid-level and the card right after level:end, with
//      what the child learnt today
//   L3 "Istirahat dulu" -> rest screen; a tap on it, Escape, a reload and a game page keep it up; the gate's "Batal"
//      keeps it; passing the gate opens the app again
//   L4 390x844, 844x390, 800x1280: card and rest screen fit; screenshots (QA_SHOTS=dir) looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd21-rhythm.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|googleapis|gstatic|ResizeObserver/i
if (SH) fs.mkdirSync(SH, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', protocolTimeout: 240000, args: ['--no-sandbox', '--disable-audio-output'] })
const errs = []

async function open (ctx, url, size = [390, 844]) {
  const p = await ctx.newPage()
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(url + ': ' + e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    if (!localStorage.getItem('__qa_seed')) {
      localStorage.clear(); localStorage.setItem('__qa_seed', '1')
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off')
    }
  })
  await p.goto(BASE + url, { waitUntil: 'load', timeout: 120000 })
  return p
}
const hub = async p => { await p.waitForFunction(() => typeof window.startGameWithLevel === 'function' && typeof window.setLevelComplete === 'function', { timeout: 60000 }); await sleep(800) }
const startG4 = p => p.evaluate(() => { state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = 4; startGameWithLevel(1) })
const ui = p => p.evaluate(() => {
  const c = document.getElementById('rh-card'), r = document.getElementById('rh-rest'), box = c && c.querySelector('.rh-box').getBoundingClientRect(), rr = r && r.getBoundingClientRect()
  return { card: !!c, text: c ? c.textContent.replace(/\s+/g, ' ').trim() : '', rest: !!r, cardFits: !!box && box.top >= 0 && box.bottom <= innerHeight + 1 && box.right <= innerWidth + 1,
    restCovers: !!rr && rr.top <= 0 && rr.left <= 0 && rr.bottom >= innerHeight - 1 && rr.right >= innerWidth - 1,
    keys: Object.keys(localStorage).filter(k => /^dunia-(session|rest)/.test(k)) }
})
async function passGate (p, cancel) {
  await p.waitForSelector('#pg-hold', { timeout: 8000 })
  const r = await (await p.$('#pg-hold')).boundingBox()
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await sleep(2300); await p.mouse.up()
  await p.waitForSelector('#pg-q', { timeout: 8000 }); await sleep(500)
  if (cancel) { await p.click('#pg-cancel'); await sleep(300); return }
  await p.evaluate(() => { const el = document.querySelector('.pg-back'); el.querySelector(`.pg-ch button[data-v="${el.__ans}"]`).click() }); await sleep(400)
}

// L2: off
{
  const ctx = await b.createBrowserContext(), p = await open(ctx, '/index.html?nocine=1')
  await hub(p); await startG4(p); await sleep(800)
  await p.evaluate(() => setLevelComplete(4, 1, 3)); await sleep(1500)
  const u = await ui(p)
  ok(!u.card && !u.rest && !u.keys.length, `L2 limit off: card ${u.card}, rest ${u.rest}, keys written ${JSON.stringify(u.keys)}`)
  await ctx.close()
}
// L1 + L3
{
  const ctx = await b.createBrowserContext(), p = await open(ctx, '/index.html?nocine=1')
  await hub(p)
  await p.evaluate(() => showDashboard()); await passGate(p); await sleep(500)
  const opt = await p.$('#dash-rhythm [data-m="20"]')
  if (opt) { await opt.evaluate(e => e.scrollIntoView({ block: 'center' })); await opt.click(); await sleep(200) }
  if (SH) await p.screenshot({ path: path.join(SH, 'dasbor-waktu-main-390x844.png') })
  const lim = await p.evaluate(() => ({ k: localStorage.getItem('dunia-session-limit'), on: document.querySelector('#dash-rhythm [aria-checked="true"]')?.dataset.m }))
  // a short level: ends at minute 5
  await startG4(p); await sleep(600)
  await p.evaluate(() => { window.__now = window.__now || Date.now; Date.now = () => window.__now() + 5 * 60000 })
  await p.evaluate(() => setLevelComplete(4, 1, 3)); await sleep(1500)
  const early = await ui(p)
  // a long level: the clock passes 20 min in the middle
  await p.evaluate(() => { Date.now = window.__now })
  await startG4(p); await sleep(600)
  await p.evaluate(() => { Date.now = () => window.__now() + 21 * 60000 })
  await p.evaluate(() => DuniaAnswer({ domain: 'matematika', skill: 'count', item: 'qa hitung', ok: true, tries: 1, ms: 900 })); await sleep(1200)
  const mid = await ui(p)
  await p.evaluate(() => setLevelComplete(4, 1, 3)); await sleep(1500)
  const after = await ui(p)
  if (SH) await p.screenshot({ path: path.join(SH, 'card-390x844.png') })
  ok(lim.k === '20' && lim.on === '20' && !early.card && !mid.card && after.card && /Hari ini kamu belajar/.test(after.text) && /Menghitung|Hitung|Matematika/i.test(after.text),
    `L1 limit ${lim.k} (Dasbor shows ${lim.on}): card at minute 5 ${early.card}, mid-level past 20 min ${mid.card}, after level:end ${after.card} "${after.text.slice(0, 70)}"`)
  // L3
  await p.click('#rh-card .rh-go'); await sleep(400)
  const r0 = await ui(p)
  if (SH) await p.screenshot({ path: path.join(SH, 'rest-390x844.png') })
  await p.mouse.click(195, 300); await p.keyboard.press('Escape'); await sleep(300)
  const r1 = await ui(p)
  await p.reload({ waitUntil: 'load' }); await sleep(1500)
  const r2 = await ui(p)
  const g = await open(ctx, '/games/kuis-matematika.html?nocine=1'); await g.waitForFunction(() => document.getElementById('rh-rest'), { timeout: 15000 }).catch(() => {})
  const r3 = await ui(g); await g.close()
  await p.click('#rh-rest .rh-parent'); await passGate(p, true)
  const r4 = await ui(p)
  await p.click('#rh-rest .rh-parent'); await passGate(p)
  const r5 = await ui(p)
  ok(r0.rest && r1.rest && r2.rest && r3.rest && r4.rest && !r5.rest && !r5.keys.includes('dunia-rest'),
    `L3 rest: up ${r0.rest}, after tap + Escape ${r1.rest}, after reload ${r2.rest}, on kuis-matematika ${r3.rest}, after Batal ${r4.rest}, after the gate ${r5.rest} (keys ${JSON.stringify(r5.keys)})`)
  await ctx.close()
}
// L4
for (const size of [[390, 844], [844, 390], [800, 1280]]) {
  const ctx = await b.createBrowserContext(), p = await open(ctx, '/index.html?nocine=1', size)
  await hub(p)
  await p.evaluate(() => DuniaRhythm.card()); await sleep(500)
  const c = await ui(p)
  if (SH) await p.screenshot({ path: path.join(SH, `card-${size.join('x')}.png`) })
  await p.evaluate(() => { document.getElementById('rh-card').remove(); DuniaRhythm.rest() }); await sleep(300)
  const r = await ui(p)
  if (SH) await p.screenshot({ path: path.join(SH, `rest-${size.join('x')}.png`) })
  ok(c.cardFits && r.restCovers, `L4 ${size.join('x')}: card fits ${c.cardFits}, rest covers the screen ${r.restCovers}`)
  await ctx.close()
}
ok(!errs.length, `page errors ${errs.length} ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(`qa-prd21-rhythm: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
