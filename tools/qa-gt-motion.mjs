// qa-gt-motion.mjs — Garasi Tempur motion budget on a slow tablet (CPU throttled 4x).
// Measures frame rate during (a) the idle battle table, (b) an attack choreography,
// (c) Monster Rush chaos, and checks the arena parallax loop stops in a hidden tab.
// FAIL if the 90th-percentile frame rate (i.e. the slow frames) < 24 during the attack or the rush, or if rAF keeps running hidden.
import puppeteer from 'puppeteer'
const URL = process.env.QA_URL || 'http://localhost:8081/games/garasi-tempur.html'
const SIZES = (process.env.QA_SIZES || '1024x768,390x844').split(',').map(s => s.split('x').map(Number))
const sleep = ms => new Promise(r => setTimeout(r, ms))
let fails = 0
const check = (ok, msg) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + msg); if (!ok) fails++ }
async function fps (p, ms) {
  return p.evaluate(ms => new Promise(res => {
    const t = []; let last = performance.now(), t0 = last
    const f = now => { t.push(now - last); last = now; if (now - t0 < ms) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res(Math.round(1000 / t[Math.floor(t.length * 0.9)])) } }
    requestAnimationFrame(f)
  }), ms)
}
for (const [w, h] of SIZES) {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage(); const errs = []
  // QA_FAULT=1: burn 45 ms per frame — the gate MUST fail (proves it can see jank)
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: true })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  // QA_FAULT=1: burn 45 ms per frame after load — the gate MUST fail (proves it can see jank)
  if (process.env.QA_FAULT) await p.evaluate(() => { const f = () => { const t = performance.now(); while (performance.now() - t < 45); requestAnimationFrame(f) }; requestAnimationFrame(f) })
  const cdp = await p.createCDPSession()
  await p.evaluate(() => { __gt.setTut(true); __gt.start('free') }); await sleep(2500)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const idle = await fps(p, 2000)
  // attack: force a legal attack for the human and measure while it plays
  await p.evaluate(() => { const st = __gt.engine(); st.players[0].active.fuel = 4; const c = __gt.legal().find(x => x.type === 'attack'); if (c) __gt.send(c) })
  await sleep(600)
  await p.evaluate(() => { const b = document.querySelector('#chal.show .chal-b'); if (b) b.click() })
  await sleep(1100)
  const atk = await fps(p, 1500)
  // rush: finish the match fast
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  for (let i = 0; i < 80; i++) {
    const s = await p.evaluate(() => __gt.state()); if (s.screen !== 'scr-battle') break
    await p.evaluate(() => { const st = __gt.engine(); if (st.players[1].active) st.players[1].active.hp = 1; if (st.players[0].active) st.players[0].active.fuel = 4
      const b = document.querySelector('#chal.show .chal-b'); if (b) { b.click(); return } if (__gt.busy() || st.active !== 0 || st.phase !== 'garage') return
      const L = __gt.legal(); const c = L.find(x => x.type === 'discard') || L.find(x => x.type === 'attack') || L.find(x => x.type === 'endTurn'); if (c) __gt.send(c) })
    await sleep(900)
  }
  await p.waitForFunction(() => document.querySelector('.rh-0 .rush-b:not([disabled])'), { timeout: 30000 }).catch(() => {})
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const rush = await fps(p, 3000)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  console.log(`  ${w}x${h} @4x CPU: idle ${idle} fps · attack ${atk} fps · rush ${rush} fps`)
  check(atk >= 24, `${w}x${h}: attack choreography >= 24 fps at 4x CPU (${atk})`)
  check(rush >= 24, `${w}x${h}: Monster Rush >= 24 fps at 4x CPU (${rush})`)
  check(errs.length === 0, `${w}x${h}: no page errors (${errs.join(' | ')})`)
  await b.close()
}
// hidden tab: the parallax loop must stop (it is rAF-driven and checks document.hidden)
{
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: 1024, height: 768 })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.evaluate(() => { __gt.setTut(true); __gt.start('free') }); await sleep(1500)
  const moved = await p.evaluate(() => new Promise(res => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'))
    const bg = document.querySelector('#bt-scene .px-bg'); setTimeout(() => { const a = bg.style.transform; setTimeout(() => res(a !== bg.style.transform), 700) }, 300)
  }))
  check(!moved, 'hidden tab: the arena parallax stops moving')
  await b.close()
}
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails ? 1 : 0)
