// perf-mojo-chase.mjs -- frame-time probe for the rescue chase: one stage, 12 s at 1280x800, GPU canvas (like the owner tablet),
// CPU throttled by THR (default 4 = tablet-ish). STAGE=<id> picks a stage, PROF=1 prints the top self-time functions.
// Target (owner 2026-10-10 "sangat kurang smooth"): p90 <= 20 ms and zero frames > 50 ms at THR=4.
import puppeteer from 'puppeteer'
const sl = ms => new Promise(r => setTimeout(r, ms))
const THR = +(process.env.THR || 4)
const b = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--enable-gpu'] })
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 })
await p.goto('http://localhost:8081/games/mojo-swoptops.html?unlock=1', { waitUntil: 'networkidle0' })
await p.evaluate(() => { const b = document.querySelector('#scr-splash .splash-stage>.btn'); if (b) b.click() }); await sl(300)
await p.click('#btn-race'); await sl(500)
const stages = await p.$$eval('.race-card', cs => cs.map(c => c.dataset.stage))
const st = process.env.STAGE || stages[0]
const card = await p.$(`.race-card[data-stage="${st}"]`); await card.evaluate(e => e.scrollIntoView({ block: 'center' })); await card.click()
await p.waitForSelector('#mc-go, .mcp-go', { timeout: 20000 }); await sl(500)
await p.evaluate(() => { const g = document.querySelector('.mcp-go') || document.querySelector('#mc-go'); g.click() })
await sl(4500)   // 3-2-1
const cdp = await p.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: THR })
if (process.env.PROF) {
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); await sl(6000)
  const { profile } = await cdp.send('Profiler.stop'); const self = {}, byId = {}
  profile.nodes.forEach(n => byId[n.id] = n)
  const dt = profile.timeDeltas; const cnt = {}; profile.samples.forEach((id, i) => { cnt[id] = (cnt[id] || 0) + (dt[i] || 0) })
  for (const id in cnt) { const n = byId[id]; const k = n.callFrame.functionName + ' ' + (n.callFrame.url.split('/').pop() || '') + ':' + n.callFrame.lineNumber; self[k] = (self[k] || 0) + cnt[id] }
  const tot = Object.values(self).reduce((a, b) => a + b, 0)
  Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log((100 * v / tot).toFixed(1).padStart(5) + '%  ' + k))
}
const r = await p.evaluate(() => new Promise(res => { const d = []; let t0 = performance.now(), last = t0
  function f (t) { d.push(t - last); last = t; if (t - t0 < 12000) requestAnimationFrame(f); else res(d) } requestAnimationFrame(f) }))
r.sort((a, b) => a - b); const q = k => r[Math.floor(r.length * k)].toFixed(1)
console.log(`stage ${st} cpu x${THR}: frames ${r.length} in 12 s = ${(r.length / 12).toFixed(0)} fps; p50 ${q(.5)} p90 ${q(.9)} p99 ${q(.99)} ms; >33ms ${r.filter(x => x > 33).length}, >50ms ${r.filter(x => x > 50).length}`)
console.log('stages', stages.length, stages.slice(0, 30).join(','))
await b.close()
