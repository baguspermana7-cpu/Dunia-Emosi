// qa-weather-alive.mjs — games/weather-alive.js on the Titanic steer (owner video "make weather feel alive", 2026-10-17)
//   every kind is alive: rain/storm/hail drop and ripple, snow drifts and piles, fog/wind/heat draw their layers
//   storm: the sky flashes, the thunder is scheduled a beat LATER (not with the flash)
//   rain that passes (65% of the course) -> a rainbow
//   pause freezes the weather; reduced motion: no flash, fewer drops; no page errors
// Server: Dunia on :8081.   node tools/qa-weather-alive.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const BASE = (process.env.BASE || 'http://localhost:8081') + '/tools/tk-harness-steer.html'
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] })
const errs = []
async function open (q) {
  const p = await b.newPage(); p.on('pageerror', e => errs.push(q + ': ' + e.message))
  await p.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true })
  await p.goto(`${BASE}?mode=gates&cd=0&muted=1&seed=7&${q}`, { waitUntil: 'networkidle2' })
  return p
}
const wx = p => p.evaluate(() => __h.state().q.weather)
const counts = {}
for (const k of ['rain', 'storm', 'hail', 'snow', 'fog', 'wind', 'heat']) {
  const p = await open('wx=' + k); await sleep(2600)
  const s = await wx(p); counts[k] = s
  if (k === 'rain' || k === 'storm' || k === 'hail') ok(s && s.drops > 30 && s.ripples > 20, `${k}: drops fall and ripple the water (${s && s.drops} drops, ${s && s.ripples} ripples)`)
  else if (k === 'snow') ok(s && s.drops > 60 && s.pile > 0, `snow: flakes drift (${s && s.drops}) and start to pile up (${s && s.pile.toFixed(4)})`)
  else if (k === 'wind') ok(s && s.leaves >= 10, `wind: leaves blow across (${s && s.leaves})`)
  else ok(s && s.kind === k, `${k}: active`)
  await p.close()
}
ok(counts.storm.drops > counts.rain.drops, `storm is heavier than rain (${counts.storm.drops} > ${counts.rain.drops})`)
// storm: watch for the flash, then the thunder must still be pending right after it
{
  const p = await open('wx=storm')
  const r = await p.evaluate(() => new Promise(res => {
    const t0 = performance.now(); let flashAt = -1, pendingAfter = null
    const tick = () => { const s = __h.state().q.weather, t = performance.now() - t0
      if (flashAt < 0 && s.flash > 0.3) { flashAt = t; pendingAfter = s.thunderPending }
      if (t < 13000 && flashAt < 0) requestAnimationFrame(tick); else res({ flashAt, pendingAfter }) }
    requestAnimationFrame(tick)
  }))
  ok(r.flashAt > 0, `storm: the whole sky flashes (after ${Math.round(r.flashAt)} ms)`)
  ok(r.pendingAfter === true, 'storm: the thunder comes a beat AFTER the flash (still pending at the flash)')
  // pause freezes the weather
  await p.evaluate(() => __h.pause(true)); await sleep(300)
  const a = await wx(p); await sleep(900); const c = await wx(p)
  ok(a.drops === c.drops && a.ripples === c.ripples, `pause freezes the weather (${a.drops}/${a.ripples} -> ${c.drops}/${c.ripples})`)
  await p.close()
}
// a passing shower leaves a rainbow: drive the ship fast to 65%
{
  const p = await open('wx=rain&len=900')
  const got = await p.evaluate(() => new Promise(res => {
    const t0 = performance.now()
    const tick = () => { const s = __h.state().q.weather
      if (s.kind === 'clear' && s.rainbow > 0) return res(s)
      if (performance.now() - t0 > 40000) return res(s)
      requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }))
  ok(got.kind === 'clear' && got.rainbow > 0, `the shower passes -> a rainbow (${got.kind}, rainbow ${got.rainbow.toFixed(1)})`)
  await p.close()
}
// reduced motion: fewer drops, never a flash
{
  const p = await open('wx=storm&rm=1')
  const r = await p.evaluate(() => new Promise(res => { let maxF = 0, maxD = 0; const t0 = performance.now()
    const tick = () => { const s = __h.state().q.weather; maxF = Math.max(maxF, s.flash); maxD = Math.max(maxD, s.drops); if (performance.now() - t0 < 9000) requestAnimationFrame(tick); else res({ maxF, maxD }) }
    requestAnimationFrame(tick) }))
  ok(r.maxF === 0 && r.maxD <= counts.storm.drops * 0.7, `reduced motion: no lightning flash (${r.maxF}), fewer drops (${r.maxD})`)
  await p.close()
}
ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '))
await b.close()
console.log(`\nqa-weather-alive: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
