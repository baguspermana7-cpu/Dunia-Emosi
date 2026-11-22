#!/usr/bin/env node
// qa-prd22-book — PRD-22 (docs/prd/PRD-22-satu-buku-koleksi-lintas.md): one Buku Koleksi per child across games.
//   L1 a reward from 3 games lands in one book: a hub achievement (checkAchievement), a train obstacle reward
//      (ObstacleEngine._addToStorageList on balapan-kereta, the call the obstacles make), a Timmy compass badge
//      (DuniaEmit 'reward' with src 'timmy', the payload timmy-kapal.js sends); the beranda book button opens it
//   L2 per child: the other avatar's book is empty; switching back shows the first child's rewards again
//   L3 the old device-wide train lists ('train-stickers', 'train-badges') are in the book after the first load
//   L4 0 emoji in the open book (and on the train page's Koleksi button); every picture loads
//   L5 390x844, 844x390, 800x1280: the book fits the screen, close button >= 44 px; screenshots (QA_SHOTS=dir)
//   + the Koleksi button on balapan-kereta opens the same book
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd22-book.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const NOISE = /favicon|googleapis|gstatic|ResizeObserver/i
const EMO = /\p{Extended_Pictographic}/u
if (SH) fs.mkdirSync(SH, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', protocolTimeout: 240000, args: ['--no-sandbox', '--disable-audio-output'] })
const ctx = await b.createBrowserContext()
const errs = []

async function page (url, size = [390, 844]) {
  const p = await ctx.newPage()
  p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(url + ': ' + e.message) })
  await p.setViewport({ width: size[0], height: size[1], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    if (!localStorage.getItem('__qa_seed')) {
      localStorage.clear(); localStorage.setItem('__qa_seed', '1')
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off')
      localStorage.setItem('train-stickers', JSON.stringify(['surabaya_helper'])); localStorage.setItem('train-badges', JSON.stringify(['jakarta_explorer']))
    }
  })
  await p.goto(BASE + url, { waitUntil: 'load', timeout: 120000 })
  return p
}
const book = p => p.evaluate(src => {
  const EMO = new RegExp(src, 'u')
  const m = document.getElementById('rb-book'); if (!m) return null
  const c = m.querySelector('.rb-card').getBoundingClientRect(), x = m.querySelector('.rb-close').getBoundingClientRect()
  return { items: [...m.querySelectorAll('.rb-item')].map(e => e.dataset.src + ':' + e.dataset.id), emoji: EMO.test(m.textContent) ? m.textContent.match(EMO)[0] : '',
    imgs: [...m.querySelectorAll('img')].length, broken: [...m.querySelectorAll('img')].filter(i => !(i.complete && i.naturalWidth > 0)).length,
    fits: c.top >= 0 && c.left >= 0 && c.bottom <= innerHeight + 1 && c.right <= innerWidth + 1, close: Math.round(Math.min(x.width, x.height)), empty: !!m.querySelector('.rb-empty') }
}, EMO.source)
const waitImgs = p => p.waitForFunction(() => [...document.querySelectorAll('#rb-book img')].every(i => i.complete), { timeout: 8000 }).catch(() => {})

// 1. hub achievement
let p = await page('/index.html?nocine=1')
await p.waitForFunction(() => typeof window.checkAchievement === 'function' && typeof state !== 'undefined' && state.players, { timeout: 60000 }).catch(() => {}); await sleep(800)
await p.evaluate(() => { if (typeof checkAchievement !== 'function') return; state.unlockedAchievements = state.unlockedAchievements || {}; delete state.unlockedAchievements.first_star; checkAchievement('first_star') }); await sleep(500)
await p.close()
// 2. train obstacle reward, then the Koleksi button
p = await page('/games/balapan-kereta.html?nocine=1')
await p.waitForFunction(() => window.ObstacleEngine && window.ObstacleEngine._addToStorageList, { timeout: 60000 }).catch(() => {})
await p.evaluate(() => window.ObstacleEngine && window.ObstacleEngine._addToStorageList && window.ObstacleEngine._addToStorageList('train-badges', 'bandung_explorer'))
await p.waitForFunction(() => window.RewardBook && RewardBook.list().some(e => e.id === 'bandung_explorer'), { timeout: 15000 }).catch(() => {})
const kbtn = await p.evaluate(src => { const EMO = new RegExp(src, 'u'); const k = document.getElementById('g14-koleksi-btn'); return k ? { emoji: EMO.test(k.textContent) } : null }, EMO.source)
await p.evaluate(() => { const k = document.getElementById('g14-koleksi-btn'); k.scrollIntoView({ block: 'center' }); k.click() }); await sleep(400); await waitImgs(p)
const kb = await book(p)
if (SH) await p.screenshot({ path: path.join(SH, 'book-kereta-390x844.png') })
ok(!!kbtn && !kbtn.emoji && !!kb && kb.items.includes('obstacle:bandung_explorer') && !kb.emoji, `Koleksi on balapan-kereta: emoji on button ${kbtn && kbtn.emoji}, opens the book ${!!kb}, items ${kb && kb.items.length}`)
await p.close()
// 3. Timmy compass badge
p = await page('/games/timmy-kapal.html?nocine=1')
await p.waitForFunction(() => window.DuniaEmit && window.RewardBook, { timeout: 60000 }).catch(() => {})
await p.evaluate(() => window.DuniaEmit && DuniaEmit('reward', { id: 'lencana-uji', kind: 'badge', src: 'timmy', title: 'Lencana Pelabuhan' })); await sleep(500)
await p.close()
// 4. the book from the beranda, 3 sizes
for (const size of [[390, 844], [844, 390], [800, 1280]]) {
  const tag = size.join('x')
  p = await page('/index.html?nocine=1', size)
  await p.waitForFunction(() => window.showScreen && document.querySelector('#screen-menu .menu-book'), { timeout: 60000 }).catch(() => {})
  await p.evaluate(() => showScreen('screen-menu')); await sleep(800)
  if (SH) await p.screenshot({ path: path.join(SH, `beranda-${tag}.png`) })
  const bb = await p.$('#screen-menu .menu-book'), r = bb && await bb.boundingBox()
  if (r) await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2)
  await sleep(400); await waitImgs(p)
  const k = await book(p)
  if (SH) await p.screenshot({ path: path.join(SH, `book-${tag}.png`) })
  if (tag === '390x844') {
    const src = k ? new Set(k.items.map(i => i.split(':')[0])) : new Set()
    ok(!!k && src.has('hub') && src.has('obstacle') && src.has('timmy') && k.items.includes('hub:first_star') && k.items.includes('timmy:lencana-uji'), `L1 beranda button (${r ? Math.round(r.width) + ' px' : 'missing'}) -> book with ${k && k.items.length} items from ${[...src].join(', ')}`)
    ok(!!k && k.items.includes('obstacle:surabaya_helper') && k.items.includes('obstacle:jakarta_explorer'), `L3 old train lists in the book: ${k && k.items.filter(i => /surabaya_helper|jakarta_explorer/.test(i)).join(' ')}`)
    ok(!!k && !k.emoji && k.imgs === k.items.length && !k.broken, `L4 emoji in book "${k && k.emoji}", pictures ${k && k.imgs} of ${k && k.items.length}, broken ${k && k.broken}`)
  }
  ok(!!k && k.fits && k.close >= 44, `L5 ${tag}: book on screen ${k && k.fits}, close ${k && k.close} px`)
  await p.close()
}
// 5. per child
p = await page('/index.html?nocine=1')
await p.waitForFunction(() => window.RewardBook, { timeout: 60000 }).catch(() => {})
await p.evaluate(() => localStorage.setItem('dunia-active-slot', '[1,0]')); await p.reload({ waitUntil: 'load' })
await p.waitForFunction(() => window.RewardBook, { timeout: 60000 }).catch(() => {}); await sleep(500)
const other = await p.evaluate(() => { if (!window.RewardBook) return { n: -1, empty: false }; RewardBook.open(); return { n: RewardBook.list().length, empty: !!document.querySelector('#rb-book .rb-empty') } })
if (SH) await p.screenshot({ path: path.join(SH, 'book-bima-390x844.png') })
await p.evaluate(() => localStorage.setItem('dunia-active-slot', '[0,1]')); await p.reload({ waitUntil: 'load' })
await p.waitForFunction(() => window.RewardBook, { timeout: 60000 }).catch(() => {}); await sleep(500)
const back = await p.evaluate(() => window.RewardBook ? RewardBook.list().length : -1)
ok(other.n === 0 && other.empty && back >= 5, `L2 Bima's book: ${other.n} items (empty page ${other.empty}); back to Ana: ${back}`)
await p.close()
ok(!errs.length, `page errors ${errs.length} ${errs.slice(0, 2).join(' | ')}`)
await b.close()
console.log(`qa-prd22-book: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
