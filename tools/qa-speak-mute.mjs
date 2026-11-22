#!/usr/bin/env node
// qa-speak-mute — the parent's sound setting silences speech everywhere it now goes through DuniaSpeak.say()
// (games/data/speak.js, audit A-13, v64.54). speechSynthesis.speak is spied (recorded, never played) on three pages that
// speak on their own, each through a different migrated file, with the setting 'off' and then 'on':
//   index.html?feel=1             the feeling check-in asks its question when the map opens   (feeling-checkin.js)
//   games/kuis-matematika.html    a wrong answer one away from the right one says its hint     (error-kinds.js)
//   games/pokemon-birds.html      the freeze recovery card says "Main lagi" after a stall      (freeze-watchdog.js)
// 'off' must give 0 calls, 'on' at least 1. A child is on the device, so save-engine's per-child settings are in play.
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-speak-mute.mjs
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const errs = []
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

const PAGES = [
  { name: 'index feeling check-in', path: '/index.html?nocine=1&feel=1', async run (p) { await sleep(2200); await p.evaluate(() => goToMenu()); await sleep(2000) } },
  { name: 'kuis-matematika hint', path: '/games/kuis-matematika.html?nocine=1', async run (p) {
    await sleep(1200); await p.evaluate(() => window.__g25.startLevel(1))
    for (let k = 0; k < 4; k++) {
      await p.waitForFunction(() => document.querySelectorAll('#choices button:not([disabled])').length > 1, { timeout: 15000 }).catch(() => {})
      await sleep(300)
      const cur = await p.evaluate(() => window.__g25.current())
      const btns = await p.$$('#choices button'), labels = await Promise.all(btns.map(x => x.evaluate(e => e.textContent.trim())))
      let i = labels.findIndex(l => Math.abs(Number(l) - Number(cur.ans)) === 1)
      if (i < 0) i = labels.findIndex(l => l !== String(cur.ans))
      const r = await btns[i].boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2)
      await sleep(600)
      if (await p.evaluate(() => !!document.querySelector('.dek'))) return
      await sleep(2400)
    }
  } },
  { name: 'pokemon-birds freeze card', path: '/games/pokemon-birds.html', async run (p) {
    await sleep(11000)                                                 // the watchdog arms 8 s after load
    await p.evaluate(() => { window.requestAnimationFrame = function () { return 0 } })
    await p.waitForSelector('#__freezeRecover', { timeout: 25000 }).catch(() => {})
    await sleep(1200)
  } }
]

async function said (pg, sound) {
  const c = await b.createBrowserContext(), p = await c.newPage()
  p.on('pageerror', e => errs.push(`${pg.name}: ${String(e).slice(0, 120)}`))
  const cdp = await p.createCDPSession(); await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(sound => {
    window.__said = []
    try { SpeechSynthesis.prototype.speak = function (u) { window.__said.push(u.text) } } catch (e) {}
    if (sessionStorage.__s) return
    localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
    localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', sound); sessionStorage.__s = 1
  }, sound)
  await p.goto(BASE + pg.path, { waitUntil: 'load', timeout: 60000 })
  await pg.run(p)
  const r = await p.evaluate(() => ({ said: window.__said.slice(), key: localStorage.getItem('dunia-emosi-sound'), helper: !!window.DuniaSpeak }))
  await c.close()
  return r
}

for (const pg of PAGES) {
  const off = await said(pg, 'off'), on = await said(pg, 'on')
  ok(off.helper && on.helper, `${pg.name}: DuniaSpeak is on the page`)
  ok(off.key === 'off' && off.said.length === 0, `${pg.name}: sound 'off' -> ${off.said.length} speak calls (want 0) ${JSON.stringify(off.said).slice(0, 120)}`)
  // PRD-55 (owner 2026-11-22): no machine-read speech at all, also with sound on
  ok(on.key !== 'off' && on.said.length === 0, `${pg.name}: sound 'on' -> ${on.said.length} speak calls (want 0, PRD-55) ${JSON.stringify(on.said).slice(0, 120)}`)
  console.log(`  ${pg.name}: off ${off.said.length}, on ${on.said.length}`)
}
ok(!errs.length, 'no page errors: ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`qa-speak-mute: ${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0
