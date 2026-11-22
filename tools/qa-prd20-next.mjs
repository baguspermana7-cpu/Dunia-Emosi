#!/usr/bin/env node
// qa-prd20-next — PRD-20 (docs/prd/PRD-20-kartu-main-berikutnya-di.md, revisi 2026-11-21): the "main berikutnya" card
// on the beranda (#screen-menu) points at a game for the child's weakest skill that was not played today.
//   L1 a log weak in Pengurangan (3/10) beside a strong Menghitung benda (9/10) and a thin Huruf awal (0/4, < 5 answers)
//      -> the card points at a Pengurangan game (Kuis Matematika first); nothing is read aloud (PRD-55, owner
//      2026-11-22);
//      a tap opens that game (games/kuis-matematika.html)
//   L2 played today (an answer today in Kuis, then a level:start of Ayo Berhitung on the hub) -> neither is picked;
//      with the clock one day later the first game comes back
//   L3 a child with no log -> a card for a safe learning game, the same one after a reload (same day)
//   L4 child A's log and played list do not move child B's card (B weak in Menghitung benda -> Hitung Binatang,
//      though A played it today); a tap on B's card opens the Hitung Binatang level screen
//   L5 at 390x844, 800x1280, 1280x800: card >= 48 px, fully on screen, text contrast >= 4.5, no emoji;
//      screenshots (QA_SHOTS=dir) looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd20-next.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|googleapis|gstatic/i
if (SH) fs.mkdirSync(SH, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const PENGURANGAN = ['kuis-matematika', 'ayo-berhitung', 'g13', 'g13b', 'g10']
const SAFE = ['kuis-matematika', 'ayo-berhitung', 'g4', 'g3', 'g7', 'g8', 'g9', 'g13', 'g13b', 'g10']

// seed: { animal, logs: { slug: { daysAgo: { key: [n, ok] } } }, played: { slug: [games] }, shiftDays, sound }
async function open (seed, size = [390, 844]) {
  const c = await b.createBrowserContext(), p = await c.newPage(), errs = []
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(seed => {
    const day = t => { const x = new Date(t); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2) }
    if (!sessionStorage.__s) {
      localStorage.clear()
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: seed.animal || '🦁', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', seed.sound ? 'on' : 'off')
      Object.entries(seed.logs || {}).forEach(([slug, byAgo]) => {
        const d = { v: 1, days: {}, recent: [] }
        Object.entries(byAgo).forEach(([ago, rows]) => {
          const k = day(Date.now() - ago * 864e5); d.days[k] = {}
          Object.entries(rows).forEach(([key, v]) => { d.days[k][key] = [v[0], v[1], 0, 0] })
        })
        localStorage.setItem('dunia-avatar-' + slug + '-learn-log', JSON.stringify(d))
      })
      Object.entries(seed.played || {}).forEach(([slug, games]) => localStorage.setItem('dunia-avatar-' + slug + '-played-day', JSON.stringify({ day: day(Date.now()), games })))
      sessionStorage.__s = 1
    }
    if (seed.shiftDays) {   // the clock seed.shiftDays later (L2: the next day)
      const RD = Date, off = seed.shiftDays * 864e5
      const FD = function (...a) { return a.length ? new RD(...a) : new RD(RD.now() + off) }
      FD.now = () => RD.now() + off; FD.UTC = RD.UTC; FD.parse = RD.parse; FD.prototype = RD.prototype
      window.Date = FD
    }
    window.__said = []
    const hook = () => { if (window.DuniaSpeak && !DuniaSpeak.__qa) { const s = DuniaSpeak.say; DuniaSpeak.say = (t, o) => { window.__said.push(String(t)); try { return s(t, o) } catch (_) { return false } }; DuniaSpeak.__qa = 1 } }
    document.addEventListener('DOMContentLoaded', hook); addEventListener('load', hook)
  }, seed)
  await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 120000 })
  await sleep(800)
  await p.evaluate(() => { showScreen('screen-menu') })
  await p.waitForSelector('#next-card[data-game]', { timeout: 6000 }).catch(() => {})
  await sleep(500)
  return { c, p, errs }
}
const card = p => p.evaluate(() => { const e = document.getElementById('next-card'); return e ? { game: e.dataset.game, tile: e.dataset.tile, skill: e.dataset.skill || '', text: e.textContent.trim() } : null })
const tap = async (p, sel) => { const h = await p.$(sel); if (!h) return false; await h.evaluate(e => e.scrollIntoView({ block: 'center' })); await sleep(400); const r = await h.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); return true }

const LION_WEAK = { lion: { 1: { 'kuis-matematika|matematika|kurang-standard': [10, 3], 'g4|matematika|count': [10, 9], 'g3|bahasa|awal': [4, 0] } } }

// L1
{
  const { c, p, errs } = await open({ logs: LION_WEAK, sound: true })
  await sleep(2000)   // the old line came ~1 s after the beranda showed
  const k = await card(p), said = await p.evaluate(() => window.__said)
  ok(k && k.game === 'kuis-matematika' && k.skill === 'Pengurangan' && said.length === 0 && !errs.length,
    `L1 weak Pengurangan -> card ${k && k.game} (skill ${k && k.skill}, "${k && k.text}"), spoken ${JSON.stringify(said)}, errors ${errs.slice(0, 2).join(' | ') || 0}`)
  if (SH) await p.screenshot({ path: path.join(SH, 'next-card-390x844.png') })
  const nav = p.waitForNavigation({ timeout: 10000 }).catch(() => null)
  await tap(p, '#next-card'); await nav
  const url = p.url()
  ok(/games\/kuis-matematika\.html/.test(url), `L1 a tap opens the game: ${url.replace(BASE, '')}`)
  await c.close()
}
// L2
{
  const logs = { lion: { ...LION_WEAK.lion, 0: { 'kuis-matematika|matematika|tambah-standard': [1, 1] } } }
  const { c, p, errs } = await open({ logs })
  const k1 = await card(p)
  await p.evaluate(() => { DuniaBus.emit('level:start', { game: 'ayo-berhitung', level: 1 }); showScreen('screen-welcome'); showScreen('screen-menu') })
  await sleep(500)
  const k2 = await card(p), stored = await p.evaluate(() => localStorage.getItem('dunia-avatar-lion-played-day'))
  ok(k1 && k1.game === 'ayo-berhitung' && k2 && k2.game === 'g13' && PENGURANGAN.includes(k2.game) && /ayo-berhitung/.test(stored || '') && !errs.length,
    `L2 played today: Kuis answered today -> ${k1 && k1.game}; Ayo Berhitung level:start -> ${k2 && k2.game} (stored ${stored}), errors ${errs.length}`)
  await c.close()
  const n = await open({ logs, shiftDays: 1 })
  const k3 = await card(n.p)
  ok(k3 && k3.game === 'kuis-matematika', `L2 one day later (fake clock): card back to ${k3 && k3.game}`)
  await n.c.close()
}
// L3
{
  const { c, p, errs } = await open({ animal: '🐰' })
  const k1 = await card(p)
  await p.reload({ waitUntil: 'load' }); await sleep(800); await p.evaluate(() => showScreen('screen-menu')); await sleep(600)
  const k2 = await card(p)
  ok(k1 && SAFE.includes(k1.game) && k2 && k2.game === k1.game && !errs.length, `L3 no log -> safe card ${k1 && k1.game}, after reload ${k2 && k2.game}, errors ${errs.length}`)
  await c.close()
}
// L4
{
  const logs = { ...LION_WEAK, rabbit: { 1: { 'g4|matematika|count': [10, 2], 'kuis-matematika|matematika|kurang-standard': [10, 9] } } }
  const { c, p, errs } = await open({ animal: '🐰', logs, played: { lion: ['g4', 'kuis-matematika'] } })
  const k = await card(p)
  ok(k && k.game === 'g4' && k.skill === 'Menghitung benda' && !errs.length, `L4 child B (weak Menghitung benda, A played G4 today) -> ${k && k.game} (${k && k.skill}), errors ${errs.length}`)
  await tap(p, '#next-card'); await sleep(1200)
  const lv = await p.evaluate(() => { const s = document.querySelector('.screen.active'); return s && s.id })
  ok(lv === 'screen-level' || lv === 'screen-game4', `L4 a tap on B's card opens Hitung Binatang: active screen ${lv}`)
  await c.close()
}
// L5
for (const [w, h] of [[390, 844], [800, 1280], [1280, 800]]) {
  const { c, p, errs } = await open({ logs: LION_WEAK }, [w, h])
  const m = await p.evaluate(() => {
    const e = document.getElementById('next-card'); if (!e) return null
    e.scrollIntoView({ block: 'nearest' })
    const r = e.getBoundingClientRect()
    const rgb = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
    const lum = c => { const a = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2] }
    let low = 99
    e.querySelectorAll('.nc-word').forEach(t => {
      const fg = rgb(getComputedStyle(t).color), bg = rgb(getComputedStyle(e).backgroundColor)
      const L1 = lum(fg), L2 = lum(bg), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); low = Math.min(low, cr)
    })
    return { w: e.offsetWidth, h: e.offsetHeight, on: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1, low: +low.toFixed(2), emoji: /\p{Extended_Pictographic}/u.test(e.textContent), img: !!e.querySelector('img, .wmap-node-bldg') }
  })
  ok(m && m.w >= 48 && m.h >= 48 && m.on && m.low >= 4.5 && !m.emoji && m.img && !errs.length, `L5 ${w}x${h}: ${JSON.stringify(m)}, errors ${errs.length}`)
  if (SH) await p.screenshot({ path: path.join(SH, `next-card-${w}x${h}-view.png`) })
  await c.close()
}
await b.close()
console.log(`qa-prd20-next: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
