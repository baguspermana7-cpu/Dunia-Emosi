// G28 Stinky & Dirty — motion gate (PRD §10).
//   - characters breathe (idle animation) and story actions move sprites;
//   - Reduced Motion (setting or OS) turns every animation off, same card still completes;
//   - once the answers are shown, answer controls never move (a finger lands where it aims);
//   - the story plays at >= 20 fps on a 4x-throttled CPU, main-thread frame work stays small.
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log((ok ? '✅ ' : '❌ ') + msg); if (!ok) fails.push(msg) }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
try {
  for (const [w, h] of [[390, 844], [1024, 768]]) {
    const tag = `${w}x${h}`
    const p = await b.newPage()
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
    const errs = []; p.on('pageerror', e => errs.push(e.message))
    const cdp = await p.target().createCDPSession(); await cdp.send('Network.setBypassServiceWorker', { bypass: true })
    await p.goto('http://localhost:8081/games/stinky-dirty.html', { waitUntil: 'networkidle2', timeout: 120000 })
    await p.evaluate(() => { __sd.set('rm', false); __sd.set('voice', false) })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    // story with travel (Pip flies, the ball drops, Rover hops) — count frames while it plays
    await p.evaluate(() => { window.__fr = 0; (function f () { window.__fr++; requestAnimationFrame(f) })(); __sd.playOnly('LIS-10') })
    const t0 = Date.now(); const f0 = await p.evaluate(() => __fr)
    const pos0 = await p.evaluate(() => { const e = document.querySelector('.el'); return e ? e.getBoundingClientRect().left : null })
    await sleep(3000)
    const fps = (await p.evaluate(() => __fr) - f0) / ((Date.now() - t0) / 1000)
    check(fps >= 20, `${tag}: story plays at ${fps.toFixed(0)} fps on a 4x-throttled CPU (>= 20)`)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    const idle = await p.evaluate(() => [...document.querySelectorAll('.el.idle .in')].map(e => getComputedStyle(e).animationName))
    check(idle.length > 0 && idle.every(n => n === 'breathe'), `${tag}: characters breathe while idle (${idle.join(',')})`)
    for (let k = 0; k < 100 && (await p.evaluate(() => __sd.state().locked)); k++) await sleep(100)
    const moved = await p.evaluate(p0 => { const e = document.querySelector('.el'); return e && p0 !== null && Math.abs(e.getBoundingClientRect().left - p0) > 1 }, pos0)
    check(moved, `${tag}: story actions move sprites on the stage`)
    await sleep(700)                               // after the 220 ms entrance + 40 ms stagger
    const a0 = await p.evaluate(() => [...document.querySelectorAll('#answers .opt')].map(o => { const r = o.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)] }))
    await sleep(1500)
    const a1 = await p.evaluate(() => [...document.querySelectorAll('#answers .opt')].map(o => { const r = o.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)] }))
    check(a0.length > 0 && JSON.stringify(a0) === JSON.stringify(a1), `${tag}: answer buttons stay still once shown`)
    // Reduced Motion: no animation anywhere, card still completes
    await p.evaluate(() => { __sd.set('rm', true); __sd.playOnly('LIS-10') })
    for (let k = 0; k < 100 && (await p.evaluate(() => __sd.state().locked)); k++) await sleep(100)
    const anim = await p.evaluate(() => [...document.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); return s.animationName !== 'none' && parseFloat(s.animationDuration) > 0 }).length)
    check(anim === 0, `${tag}: Reduced Motion leaves no running CSS animation (${anim})`)
    check(await p.evaluate(() => __sd.state().locked === false), `${tag}: with Reduced Motion the card still reaches its question`)
    // OS-level reduced motion alone (setting off) also stops the breathing
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await p.evaluate(() => { __sd.set('rm', false); __sd.playOnly('LIS-01') }); await sleep(1500)
    const idleOS = await p.evaluate(() => [...document.querySelectorAll('.el.idle .in')].map(e => getComputedStyle(e).animationName))
    check(idleOS.every(n => n === 'none'), `${tag}: OS "reduce motion" also stops the breathing`)
    check(errs.length === 0, `${tag}: no page errors${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`)
    await p.close()
  }
} finally { await b.close() }
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
