// qa-mojo-jump.mjs — the Mojo race jump (owner 2026-10-18: "barrier bisa swipe ke atas untuk lompat ... super smooth,
// effect dan VFX"). Swipe up / the LOMPAT button / ArrowUp jump; the big ⬆ button and Shift stay TURBO. A barrier is
// cleared when the jump peaks over it and BROKs when the jump comes too late; the must-jump row shows its "LOMPAT!" cue;
// a film racer jumps too; reduced motion keeps the jump. Server: Dunia on :8081.   node tools/qa-mojo-jump.mjs
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m) } else { fail++; console.log('  ✗ ' + m) } }
const BASE = process.env.BASE || 'http://localhost:8081'
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const st = p => p.evaluate(() => __mojoChase.state())
// a busy machine can make a fresh tab answer "main frame too early": try again instead of dying
async function newPage () { for (let i = 0; i < 5; i++) { try { const p = await b.newPage(); await p.evaluate(() => 1); return p } catch (e) { await sleep(1500) } } return b.newPage() }
async function start (p, id, extra) {
  await p.evaluate(() => { window.__mcNoLeap = 1; window.__mcNoCrashQuiz = 1; window.__mcNoPatterns = 1; window.__mcNoGameOver = 1 })
  p.evaluate((id, ex) => { const c = Object.assign(MojoChases.config(id), ex || {}); return MojoChaseMenu.run(c) }, id, extra || null).catch(() => {})
  await p.waitForSelector('#mc-go, .mcp-go', { timeout: 60000 }); await sleep(400)
  await p.evaluate(() => (document.querySelector('.mcp-go') || document.querySelector('#mc-go')).click())
  for (let i = 0; i < 60; i++) { await p.click('.mc-skip').catch(() => {}); if ((await st(p)).state === 'active') break; await sleep(400) }
  await sleep(1200)
}
// the peak height reached within 0.8 s of the input, sampled every frame inside the page
async function airAfter (p, fn) {
  await p.evaluate(() => { window.__airMax = 0; const t0 = performance.now(); (function f () { window.__airMax = Math.max(window.__airMax, __mojoChase.state().air || 0); if (performance.now() - t0 < 1200) requestAnimationFrame(f) })() })
  await fn(); await sleep(900)
  return p.evaluate(() => window.__airMax)
}
async function waitLanded (p) { for (let i = 0; i < 40; i++) { const s = await st(p); if (!(s.air > 0)) break; await sleep(60) } await sleep(320) }
// put a must-jump row ahead and press jump when it is `secs` away; returns the hit / clear counters after it passed
async function leapAt (p, secs) {
  const s0 = await st(p)
  await p.evaluate(() => __mojoChase.force({ recover: 0, shield: 0, hearts: 3 }))
  // the press is made inside the page on the frame the row reaches `secs` away (no automation latency)
  await p.evaluate(secs => new Promise(res => { __mojoChase.spawnLeap(70); (function poll () { const s = __mojoChase.state(); if (s.leapSecs != null && s.leapSecs <= secs) { __mojoChase.jump(); res() } else requestAnimationFrame(poll) })() }), secs)
  for (let i = 0; i < 80; i++) { const s = await st(p); if (s.leapSecs == null) break; await sleep(60) }
  await waitLanded(p)
  const s1 = await st(p)
  return { hits: s1.leapHits - s0.leapHits, clears: s1.cleanClears - s0.cleanClears, passes: s1.leapPasses - s0.leapPasses }
}
for (const [w, h] of [[390, 844], [844, 390], [1280, 800]]) {
  const tag = w + 'x' + h
  const p = await newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900 })
  await p.goto(BASE + '/games/mojo-swoptops.html?unlock=1&chase=1', { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => window.MojoChaseMenu && window.MojoChases)
  await start(p, 'kota')
  // the four buttons: on screen, apart
  const btns = await p.evaluate(() => ['.mc-btn.l', '.mc-btn.u', '.mc-btn.j', '.mc-btn.r'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom] }))
  const inView = btns.every(r => r[0] >= 0 && r[1] >= 0 && r[2] <= w + 1 && r[3] <= h + 1)
  let overlap = 0; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const a = btns[i], c = btns[j]; overlap += Math.max(0, Math.min(a[2], c[2]) - Math.max(a[0], c[0])) * Math.max(0, Math.min(a[3], c[3]) - Math.max(a[1], c[1])) }
  ok(inView && overlap === 0, `${tag}: ⬅ TURBO LOMPAT ➡ all on screen, none overlapping (${overlap} px² overlap)`)
  // three ways to jump
  const cv = await p.evaluate(() => { const r = document.querySelector('.mc-cv').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.6 } })
  let a = await airAfter(p, async () => { await p.mouse.move(cv.x, cv.y); await p.mouse.down(); await p.mouse.move(cv.x, cv.y - 90, { steps: 4 }); await p.mouse.up() })
  ok(a > 0.2, `${tag}: swipe up jumps (height ${a})`); await waitLanded(p)
  a = await airAfter(p, () => p.click('.mc-btn.j')); ok(a > 0.2, `${tag}: the LOMPAT button jumps (height ${a})`); await waitLanded(p)
  a = await airAfter(p, () => p.keyboard.press('ArrowUp')); ok(a > 0.2, `${tag}: ArrowUp jumps (height ${a})`); await waitLanded(p)
  // TURBO stays on the big button and Shift, and a jump does not spend it
  await p.evaluate(() => __mojoChase.force({ boostCharge: 1, boost: 0 })); await p.keyboard.press('Shift'); await sleep(150)
  ok((await st(p)).boost > 0, `${tag}: Shift still fires TURBO`)
  await p.evaluate(() => __mojoChase.force({ boostCharge: 1, boost: 0 })); await p.click('.mc-btn.u'); await sleep(150)
  ok((await st(p)).boost > 0 && (await st(p)).air === 0, `${tag}: the big ⬆ button is TURBO, not a jump`)
  await p.evaluate(() => __mojoChase.force({ boost: 0, recover: 0, shield: 0 })); await sleep(1500)
  if (w === 390 || w === 1280) {
    // timing: on time = cleared (no BROK, a clean clear); too late = landing on it (BROK)
    const good = await leapAt(p, 0.42)
    ok(good.hits === 0 && good.passes >= 1, `${tag}: a jump started ~0.4 s before the barrier row clears it (hits ${good.hits}, passed under ${good.passes}, clean ${good.clears})`)
    await p.evaluate(() => __mojoChase.force({ recover: 0, shield: 0, hearts: 3 })); await sleep(1200)
    const late = await leapAt(p, 0.03)
    ok(late.hits >= 1, `${tag}: a jump started too late lands on the barrier: BROK (hits ${late.hits})`)
    await p.evaluate(() => __mojoChase.force({ recover: 0, hearts: 3 })); await sleep(1500)
    // the cue
    await p.evaluate(() => __mojoChase.spawnLeap(60))
    let cue = false; for (let i = 0; i < 120 && !cue; i++) { cue = await p.evaluate(() => __mojoChase.state().leapCue && document.querySelector('.mc-leap').classList.contains('on') && getComputedStyle(document.querySelector('.mc-leap')).display !== 'none'); await sleep(40) }
    ok(cue, `${tag}: a must-jump row ahead shows the "LOMPAT!" pill`)
    await p.evaluate(() => __mojoChase.auto({ mode: 'clean' })); await sleep(3500)
    ok((await st(p)).state === 'active', `${tag}: the autopilot jumps the row and races on`)
  }
  ok(!errs.length, `${tag}: no page errors ${errs.slice(0, 2).join(' | ')}`)
  await p.close()
}
// a film racer jumps too; reduced motion keeps the jump
{
  const p = await newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await p.goto(BASE + '/games/mojo-swoptops.html?unlock=1&chase=1', { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => window.MojoChaseMenu && window.MojoChases && window.MojoRacerSheets)
  await start(p, 'stadion', { team: 'film', racer: 'lightning-mcqueen', mode: 'race', targetRacer: 'jackson-storm', teamPicked: true, mojo_form: 'racer' })
  const a = await airAfter(p, () => p.click('.mc-btn.j'))
  ok(a > 0.1, `film racer (McQueen) jumps, with reduced motion on (height ${a})`)
  ok(!errs.length, `film + reduced motion: no page errors ${errs.slice(0, 2).join(' | ')}`)
  await p.close()
}
// the course rules accept the must-jump row and never strand the car
{
  const p = await newPage()
  await p.goto(BASE + '/games/mojo-swoptops.html?unlock=1&chase=1', { waitUntil: 'load', timeout: 90000 })
  const r = await p.evaluate(() => { const R = MojoChaseRules, rows = R.pattern('leap', R.rng(1), {}); return { rows, sim: R.simPatterns(400, 7), leapBlock: R.isBlock('leapbar') } })
  ok(r.rows.length === 3 && r.rows[1].every(x => x === 'leapbar') && !r.leapBlock, `rules: the leap pattern is star / three leapbars / stars, leapbar is passable for the lane rules`)
  ok(r.sim.threeBlock === 0 && r.sim.unreachable === 0, `rules: 400 scheduled patterns, no three-blocker or unreachable row (${JSON.stringify(r.sim).slice(0, 80)})`)
  await p.close()
}
await b.close()
console.log(`\nqa-mojo-jump: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
