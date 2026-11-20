#!/usr/bin/env node
// qa-prd40-boss — PRD-40 (docs/prd/PRD-40-bos-tiap-sepuluh-level.md): every tenth level of G19 Pokemon Birds,
// G23 Pokemon Run and G24 Bawah Laut ends in a boss (games/data/boss-round.js).
//   L1 finishing level 10 (and 20) starts the boss; finishing level 9 goes straight to the win screen; the module is
//      fetched only then, and a boss level whose module cannot load ends as a normal win (no loop)
//   L2 a child who answers 70 % right (seeded, real taps) beats the boss within 3 minutes; 3 phases are played
//   L3 nothing is saved while the boss is up (leaving mid-boss keeps every saved level as it was); the level is saved
//      once, after the boss falls, and the win screen follows
//   L4 0 page errors; screenshots of the boss (QA_SHOTS=dir) at 390x844, 844x390, 800x1280 are looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd40-boss.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const GAMES = [['pokemon-birds', 'g19'], ['pokemon-run', 'g23'], ['pokemon-bawah-laut', 'g24']]

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
async function open (game, id, level, [w, h], errs) {
  const c = await b.createBrowserContext(), p = await c.newPage()
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument((id, level) => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
    }
    sessionStorage.setItem(id + 'Config', JSON.stringify({ level, pokemon: 0 }))
    window.__saves = []
    // count saves without changing them: wrap the shared save once it is defined
    let real
    Object.defineProperty(window, 'saveLevelProgress', { configurable: true, get () { return real && function () { window.__saves.push([...arguments]); return real.apply(this, arguments) } }, set (v) { real = v } })
  }, id, level)
  await p.goto(BASE + '/games/' + game + '.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(2000)
  return { c, p }
}
const progressOf = p => p.evaluate(() => Object.keys(localStorage).filter(k => /progress/.test(k)).sort().map(k => k + '=' + localStorage.getItem(k)).join('|'))

for (const [game, id] of GAMES) {
  // L1 level 9: no boss
  {
    const errs = [], { c, p } = await open(game, id, 9, [844, 390], errs)
    await p.evaluate(() => showWin()); await sleep(800)
    const r = await p.evaluate(() => ({ boss: !!document.getElementById('boss-round'), saves: window.__saves.length }))
    ok(!r.boss && r.saves === 1, `L1 ${game} level 9: no boss, the level is saved at once (${JSON.stringify(r)}) ${errs.join(' | ')}`)
    await c.close()
  }
  // L1 + L3 level 20: boss starts, leaving mid-boss changes no saved progress
  {
    const errs = [], { c, p } = await open(game, id, 20, [390, 844], errs)
    await p.evaluate(() => { localStorage.setItem('qa-seed-progress', '1') })
    const before = await progressOf(p)
    await p.evaluate(() => showWin()); await p.waitForSelector('#boss-round', { timeout: 8000 }).catch(() => {}); await sleep(300)
    const r = await p.evaluate(() => ({ boss: !!document.getElementById('boss-round'), st: BossRound.state(), saves: window.__saves.length }))
    await p.goto('about:blank'); await sleep(200)
    await p.goto(BASE + '/games/' + game + '.html?nocine=1', { waitUntil: 'load' }); await sleep(800)
    const after = await progressOf(p)
    ok(r.boss && r.st.on && r.st.boss && r.saves === 0 && before === after, `L1/L3 ${game} level 20: boss ${r.st.boss} up, ${r.saves} saves while it is up, saved progress after leaving mid-boss unchanged: ${before === after}`)
    await c.close()
  }
  // L1b the module is loaded only on a boss level (no request on level 9), and when it cannot load (offline, not cached)
  // the boss level ends as a normal win: saved once, no retry loop
  {
    const errs = [], { c, p } = await open(game, id, 10, [844, 390], errs)
    const early = await p.evaluate(() => performance.getEntriesByType('resource').filter(e => /boss-round\.js/.test(e.name)).length)
    await p.setRequestInterception(true)
    p.on('request', r => /boss-round\.js/.test(r.url()) ? r.abort() : r.continue())
    await p.evaluate(() => showWin()); await sleep(1500)
    const r = await p.evaluate(() => ({ boss: !!document.getElementById('boss-round'), saves: window.__saves.length, over: (typeof S !== 'undefined' && !!S.gameOver) }))
    ok(early === 0 && !r.boss && r.saves === 1 && r.over, `L1b ${game}: boss module requested before the win ${early}x; blocked -> normal win, ${r.saves} save(s), win screen ${r.over}`)
    await c.close()
  }
  // L2 + L3 + L4 level 10 at three sizes: beat it with 70 % right answers
  for (const size of [[390, 844], [844, 390], [800, 1280]]) {
    const tag = `${game} ${size[0]}x${size[1]}`, errs = []
    const { c, p } = await open(game, id, 10, size, errs)
    await p.evaluate(() => showWin())
    await p.waitForSelector('#boss-round .br-c', { visible: true, timeout: 8000 }).catch(() => {})
    let seed = 7, rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const t0 = Date.now(), phases = new Set()
    let shot = false, taps = 0
    while (Date.now() - t0 < 180000) {
      const st = await p.evaluate(() => window.BossRound && BossRound.state())
      if (!st || !st.on) break
      phases.add(st.phase)
      const btns = await p.$$('#boss-round .br-c:not(.ok):not(.no)')
      if (btns.length < 2) { await sleep(150); continue }
      const labels = await Promise.all(btns.map(x => x.evaluate(e => e.textContent.trim())))
      const right = rnd() < 0.7
      let i = right ? labels.indexOf(st.answer) : labels.findIndex(l => l !== st.answer)
      if (i < 0) i = 0
      if (SH && !shot && st.phase === 2) { shot = true; fs.mkdirSync(SH, { recursive: true }); await p.screenshot({ path: path.join(SH, `boss-${game}-${size[0]}x${size[1]}.png`) }) }
      const bx = await btns[i].boundingBox(); if (!bx) { await sleep(150); continue }
      await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); taps++
      await sleep(400)
    }
    const secs = Math.round((Date.now() - t0) / 1000)
    await sleep(2500)
    const end = await p.evaluate(() => ({ boss: !!document.getElementById('boss-round'), st: BossRound.state(), saves: window.__saves.map(s => s.slice(0, 2).join(':')), over: (typeof S !== "undefined" && !!S.gameOver) }))
    ok(!end.boss && end.st.hp === 0 && phases.size === 3 && secs <= 180, `L2 ${tag}: boss beaten in ${secs} s with ${end.st.right}/${end.st.asked} right (${taps} taps), phases ${[...phases].join(',')}`)
    ok(end.saves.length === 1 && end.saves[0] === id + ':10' && end.over, `L3 ${tag}: saved once after the boss (${end.saves.join(',')}), win screen ${end.over}`)
    ok(!errs.length, `L4 ${tag}: page errors ${errs.slice(0, 2).join(' | ') || 0}`)
    await c.close()
  }
}
await b.close()
console.log(`qa-prd40-boss: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
