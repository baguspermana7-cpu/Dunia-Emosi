// qa-tk-steer.mjs — gate for games/tk-steer.js (Timmy & Kapal Legendaris, PRD v2 §9 `qa-tk-steer`).
// Drives the kept harness tools/tk-harness-steer.html with REAL input (pointer events on the on-screen
// turn buttons, mouse drag on the wheel, keyboard arrows) and checks:
//   gates + ice finish at 390x844 and 1024x768 · sail + current finish · scripted collision ALWAYS ends in
//   onDone({scripted:true, stars:3}) — also when the child fights the wheel — and the DOM never shows a
//   failure word · 3+ bumps still complete with 1 star · reduced motion = no spray/shake/zoom · wheel drag
//   rotates and snaps back · keyboard steers · p90 frame rate >= 24 fps at 4x CPU · the rAF loop stops when
//   the document is hidden / paused / destroyed · no page errors.
// QA_FAULT=1 burns 45 ms per frame during the fps probe — the gate MUST fail (proves it can see jank).
// Screenshots -> QA_SHOTS (default: the session scratchpad tk-steer/ folder).
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const BASE = process.env.QA_URL || 'http://localhost:8081/tools/tk-harness-steer.html'
const SHOTS = process.env.QA_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-steer/'
fs.mkdirSync(SHOTS, { recursive: true })
const SIZES = [[390, 844], [1024, 768]]
const BAD = /gagal|kalah|game over|failed/i
const sleep = ms => new Promise(r => setTimeout(r, ms))
let fails = 0
const check = (ok, msg) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + msg); if (!ok) fails++ }

// In-page autopilot: steers toward state().aimX/aimY by pressing/releasing the REAL turn buttons
// (pointerdown/pointerup dispatched on .tks-left-btn / .tks-right-btn); trims the sail slider in sail mode.
const AUTOPILOT = () => {
  window.__autoStop && window.__autoStop()
  const h = window.__h
  const L = document.querySelector('.tks-left-btn'), R = document.querySelector('.tks-right-btn')
  const range = document.querySelector('.tks-range')
  let cur = 0
  const ev = (btn, type) => btn.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true }))
  const set = d => {
    if (d === cur) return
    if (cur === -1) ev(L, 'pointerup'); if (cur === 1) ev(R, 'pointerup')
    if (d === -1) ev(L, 'pointerdown'); if (d === 1) ev(R, 'pointerdown')
    cur = d
  }
  const norm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  window.__presses = 0
  const id = setInterval(() => {
    const s = h.state()
    if (s.sent) { set(0); clearInterval(id); return }
    const want = Math.atan2(s.aimX - s.x, -(s.aimY - s.y))
    const e = norm(want - (s.heading + s.yaw * (s.lag + 0.5)))   // + ~0.5 s for the wheel to ramp
    const d = e > 0.04 ? 1 : e < -0.04 ? -1 : 0
    if (d !== cur && d !== 0) window.__presses++
    set(d)
    if (range && s.sailOpt != null && Math.abs(+range.value - s.sailOpt) > 4) {
      range.value = String(Math.round(s.sailOpt)); range.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, 50)
  window.__autoStop = () => { clearInterval(id); set(0) }
}
// Failure-word watcher: records any text node ever inserted that matches BAD
const WATCH = () => {
  window.__bad = []
  const re = /gagal|kalah|game over|failed/i
  const scan = () => { const t = document.body.innerText; if (re.test(t)) window.__bad.push(t.slice(0, 200)) }
  new MutationObserver(scan).observe(document.body, { subtree: true, childList: true, characterData: true })
  scan()
}

async function open (b, w, h, qs) {
  const p = await b.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: true })
  await p.goto(BASE + '?' + qs, { waitUntil: 'networkidle2' })
  await p.evaluate(WATCH)
  return { p, errs }
}
async function waitDone (p, ms) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const d = await p.evaluate(() => window.__done.length ? window.__done[0] : null)
    if (d) return d
    await sleep(250)
  }
  return null
}
async function fps (p, ms) {
  return p.evaluate(ms => new Promise(res => {
    const t = []; let last = performance.now(); const t0 = last
    const f = now => { t.push(now - last); last = now; if (now - t0 < ms) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res(Math.round(1000 / t[Math.floor(t.length * 0.9)])) } }
    requestAnimationFrame(f)
  }), ms)
}

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })

for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`
  // ── gates (Titanic) + ice (Titanic) + sail (Cutty Sark) + current (Kon-Tiki), driven to the finish ──
  for (const [mode, vessel, len, limit] of [['gates', 'liner', 1700, 120000], ['ice', 'liner', 2000, 120000], ['sail', 'clipper', 1700, 120000], ['current', 'raft', 1500, 150000], ['gates', 'boat', 1500, 90000], ['gates', 'sub', 1500, 90000], ['ice', 'explorer', 1800, 120000]]) {
    const heavy = !(mode === 'gates' && vessel !== 'liner') && !(mode === 'ice' && vessel === 'explorer')
    if (!heavy && w !== 390) continue
    const { p, errs } = await open(b, w, h, `mode=${mode}&vessel=${vessel}&len=${len}&seed=11&muted=1`)
    await sleep(2200)
    await p.screenshot({ path: `${SHOTS}${mode}-${vessel}-${tag}-start.png` })
    await p.evaluate(AUTOPILOT)
    let shot = false
    const t0 = Date.now()
    let d = null
    while (Date.now() - t0 < limit) {
      d = await p.evaluate(() => window.__done.length ? window.__done[0] : null)
      if (d) break
      if (!shot && Date.now() - t0 > 9000) { shot = true; await p.screenshot({ path: `${SHOTS}${mode}-${vessel}-${tag}-mid.png` }) }
      await sleep(300)
    }
    const st = await p.evaluate(() => ({ s: __h.state(), presses: window.__presses, bad: window.__bad }))
    check(!!d, `${tag} ${mode}/${vessel}: finished via real button input (${d ? `stars ${d.stars}, ${d.time}s, hits ${d.hits}, nearMiss ${d.nearMiss}, missed ${d.missed}` : 'no onDone; y=' + Math.round(st.s.y) + ' zoneY=' + st.s.zoneY + ' gate ' + st.s.gate + '/' + st.s.gates}; ${st.presses} presses)`)
    if (d && (mode === 'gates' || mode === 'sail')) check(d.missed === 0, `${tag} ${mode}/${vessel}: every gate passed in order (missed ${d.missed})`)
    if (d) check([1, 2, 3].includes(d.stars) && typeof d.time === 'number' && typeof d.nearMiss === 'number', `${tag} ${mode}/${vessel}: onDone payload {stars,time,hits,nearMiss}`)
    await sleep(700)
    await p.screenshot({ path: `${SHOTS}${mode}-${vessel}-${tag}-end.png` })
    check(st.bad.length === 0, `${tag} ${mode}/${vessel}: no failure words in DOM`)
    check(errs.length === 0, `${tag} ${mode}/${vessel}: no page errors (${errs.join(' | ')})`)
    await p.close()
  }

  // ── scripted collision: idle AND fighting the wheel — always a calm scripted end ──
  for (const fight of [0, 1, -1]) {
    const { p, errs } = await open(b, w, h, 'mode=scripted&vessel=liner&len=1600&seed=5&muted=1')
    if (fight) await p.evaluate(dir => { const btn = document.querySelector(dir > 0 ? '.tks-right-btn' : '.tks-left-btn'); btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, pointerType: 'touch' })) }, fight)
    let chip = await p.evaluate(() => document.body.innerText.includes('Kemudi Dibantu'))
    let capShot = false
    const t0 = Date.now(); let d = null
    while (Date.now() - t0 < 90000) {
      const s = await p.evaluate(() => ({ d: window.__done[0] || null, cap: document.querySelector('.tks-caption.is-on') ? document.querySelector('.tks-caption').textContent : '', im: __h.state().impact }))
      if (s.cap && !capShot && fight === 0) { capShot = true; await sleep(1500); await p.screenshot({ path: `${SHOTS}scripted-${tag}-impact.png` }) }
      if (s.d) { d = s.d; break }
      await sleep(250)
    }
    await sleep(1500)
    const r = await p.evaluate(() => ({ bad: window.__bad, text: document.body.innerText, n: window.__done.length, zoneDone: !!document.querySelector('.tks-goal.is-done') }))
    const label = `${tag} scripted${fight ? (fight > 0 ? ' (holding RIGHT)' : ' (holding LEFT)') : ' (no input)'}`
    check(chip, `${label}: "Kemudi Dibantu" chip shown`)
    check(!!d && d.scripted === true && d.stars === 3, `${label}: onDone {scripted:true, stars:3} (${JSON.stringify(d)})`)
    check(/Meski semua sudah berusaha, kapal menabrak gunung es\./.test(r.text), `${label}: calm caption shown`)
    check(r.n === 1 && !r.zoneDone && !/Sampai/.test(r.text), `${label}: onDone fired once, never the zone-finish path (${r.n} calls)`)
    check(r.bad.length === 0 && !BAD.test(r.text), `${label}: DOM never contained gagal/kalah/game over`)
    check(errs.length === 0, `${label}: no page errors (${errs.join(' | ')})`)
    await p.close()
  }

  // ── fps budget: densest scene (ice), CPU throttled 4x ──
  {
    const { p, errs } = await open(b, w, h, 'mode=ice&vessel=liner&len=3200&seed=3&muted=1')
    await p.evaluate(AUTOPILOT)
    await sleep(6000)
    if (process.env.QA_FAULT) await p.evaluate(() => { const f = () => { const t = performance.now(); while (performance.now() - t < 45); requestAnimationFrame(f) }; requestAnimationFrame(f) })
    const cdp = await p.createCDPSession()
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await sleep(2500)   // a device that is slow from the start adapts its render resolution in its first ~1 s
    const f1 = await fps(p, 3000)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    const s = await p.evaluate(() => __h.state())
    console.log(`  ${tag} ice @4x CPU: p90 ${f1} fps (ship y ${Math.round(s.y)}, ${s.ice} bergs, render quality ${s.quality})`)
    check(f1 >= 24, `${tag}: p90 frame rate >= 24 fps at 4x CPU (${f1})`)
    check(errs.length === 0, `${tag}: fps run no page errors`)
    await p.close()
  }
}

// ── scripted at phone-landscape 844x390, the seed that once slid the hull centre past the wall line ──
for (const seed of [7, 12]) {
  const { p, errs } = await open(b, 844, 390, `mode=scripted&vessel=liner&len=1300&seed=${seed}&muted=1`)
  const d = await waitDone(p, 90000)
  await sleep(1500)
  const r = await p.evaluate(() => ({ bad: window.__bad, text: document.body.innerText, n: window.__done.length, zoneDone: !!document.querySelector('.tks-goal.is-done') }))
  check(!!d && d.scripted === true && d.stars === 3 && r.n === 1 && !r.zoneDone && !/Sampai/.test(r.text) && r.bad.length === 0, `844x390 scripted seed ${seed}: one calm scripted end, no zone-finish, no failure words (${JSON.stringify(d)}, ${r.n} calls)`)
  await p.screenshot({ path: `${SHOTS}scripted-844x390-seed${seed}.png` })
  check(errs.length === 0, `844x390 scripted seed ${seed}: no page errors (${errs.join(' | ')})`)
  await p.close()
}

// ── bumps: 3+ bumps still complete (1 star), bump slows the ship; reduced motion = no spray/shake/zoom ──
for (const rm of [0, 1]) {
  const { p, errs } = await open(b, 390, 844, `manual=1&muted=1&rm=${rm}`)
  await p.evaluate(() => __mount({ mode: 'gates', vessel: 'liner', seed: 2, length: 2100,
    gates: [{ x: 0, y: 700, w: 260 }, { x: 0, y: 1250, w: 260 }, { x: 0, y: 1800, w: 260 }],
    ice: [{ x: 0, y: 420, r: 44 }, { x: 0, y: 980, r: 44 }, { x: 0, y: 1520, r: 44 }, { x: 30, y: 1950, r: 44 }] }))
  await p.evaluate(AUTOPILOT)
  let maxParts = 0, maxShake = 0, slowed = false, prevHits = 0, vBefore = 0
  const t0 = Date.now(); let d = null
  while (Date.now() - t0 < 120000) {
    const s = await p.evaluate(() => ({ s: __h.state(), d: window.__done[0] || null }))
    maxParts = Math.max(maxParts, s.s.parts); maxShake = Math.max(maxShake, s.s.shake)
    if (s.s.hits > prevHits) { if (s.s.speed < vBefore * 0.8) slowed = true; prevHits = s.s.hits }
    vBefore = s.s.speed
    if (s.d) { d = s.d; break }
    await sleep(100)
  }
  const lbl = rm ? 'reduced motion' : 'full motion'
  check(!!d && d.hits >= 3 && d.stars === 1, `${lbl}: ${d ? d.hits : '?'} bumps still complete the level with 1 star (${JSON.stringify(d)})`)
  if (!rm) {
    check(slowed, 'full motion: a bump slows the ship')
    check(maxParts > 0 && maxShake > 0, `full motion: bump spray (${maxParts} particles) + restrained camera impulse (${maxShake.toFixed(1)} px, <= 6)`)
    check(maxShake <= 6, 'full motion: camera impulse stays restrained (<= 6 px)')
  } else {
    check(maxParts === 0 && maxShake === 0, `reduced motion: no spray particles, no shake (parts ${maxParts}, shake ${maxShake})`)
  }
  check(errs.length === 0, `${lbl}: no page errors (${errs.join(' | ')})`)
  if (rm) {
    // reduced-motion scripted: no zoom push, still the calm ending
    await p.evaluate(() => { window.__done = []; __mount({ mode: 'scripted', vessel: 'liner', seed: 5, length: 1300 }) })
    const d2 = await waitDone(p, 90000)
    const z = await p.evaluate(() => __h.state().zoom)
    check(!!d2 && d2.scripted && z === 1, `reduced motion scripted: calm end with no camera push (zoom ${z})`)
    await p.screenshot({ path: `${SHOTS}scripted-reduced-390x844.png` })
  }
  await p.close()
}

// ── wheel drag (real mouse) rotates + snaps back; keyboard arrows steer ──
{
  const { p, errs } = await open(b, 1024, 768, 'mode=gates&vessel=boat&len=2400&seed=4&muted=1')
  await sleep(800)
  const r = await p.evaluate(() => { const e = document.querySelector('.tks-wheel').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2, w: e.width } })
  check(r.w >= 120, `wheel is >= 120 px (${Math.round(r.w)})`)
  const h0 = await p.evaluate(() => __h.state().heading)
  await p.mouse.move(r.x, r.y - r.w * 0.4)
  await p.mouse.down()
  for (let i = 1; i <= 10; i++) { const a = -Math.PI / 2 + i * (Math.PI / 2) / 10; await p.mouse.move(r.x + Math.cos(a) * r.w * 0.4, r.y + Math.sin(a) * r.w * 0.4); await sleep(30) }
  await sleep(900)
  const held = await p.evaluate(() => { const s = __h.state(); return { wheel: s.wheel, heading: s.heading, rot: document.querySelector('.tks-wheel svg').style.transform } })
  check(held.wheel > 0.45 && held.heading > h0 + 0.05, `wheel drag clockwise: wheel ${held.wheel.toFixed(2)}, heading turned right (${h0.toFixed(2)} -> ${held.heading.toFixed(2)}), svg ${held.rot}`)
  await p.screenshot({ path: `${SHOTS}wheel-drag-1024x768.png` })
  await p.mouse.up()
  await sleep(900)
  const rel = await p.evaluate(() => __h.state().wheel)
  check(Math.abs(rel) < 0.05, `wheel snaps back to centre after release (${rel.toFixed(3)})`)
  await p.keyboard.down('ArrowLeft'); await sleep(700)
  const kl = await p.evaluate(() => __h.state().wheel)
  await p.keyboard.up('ArrowLeft'); await sleep(900)
  check(kl < -0.5, `keyboard ArrowLeft turns the wheel left (${kl.toFixed(2)})`)
  // hidden document: loop must stop; visible again: resumes
  const hid = await p.evaluate(() => new Promise(res => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    setTimeout(() => { const a = TKSteer._frames; setTimeout(() => { const run = __h.state().running; res({ moved: TKSteer._frames - a, run }) }, 800) }, 150)
  }))
  check(hid.moved === 0 && !hid.run, `hidden document: rAF loop stops (${hid.moved} frames in 800 ms)`)
  const vis = await p.evaluate(() => new Promise(res => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
    const a = TKSteer._frames; setTimeout(() => res(TKSteer._frames - a), 500)
  }))
  check(vis > 5, `visible again: loop resumes (${vis} frames)`)
  // pause (the HUD button) / resume / destroy
  await p.click('.tks-pausebtn')
  const pz = await p.evaluate(() => new Promise(res => { const a = TKSteer._frames; setTimeout(() => res({ n: TKSteer._frames - a, ov: !!document.querySelector('.tks-pause.is-on'), txt: document.querySelector('.tks-pause').innerText }), 500) }))
  check(pz.n === 0 && pz.ov, `pause button: loop stops + calm "Jeda" overlay (${pz.n} frames)`)
  await p.screenshot({ path: `${SHOTS}pause-1024x768.png` })
  await p.click('.tks-resume')
  const rs = await p.evaluate(() => new Promise(res => { const a = TKSteer._frames; setTimeout(() => res(TKSteer._frames - a), 400) }))
  check(rs > 5, `resume: loop runs again (${rs} frames)`)
  const ds = await p.evaluate(() => new Promise(res => { __h.destroy(); const a = TKSteer._frames; setTimeout(() => res({ n: TKSteer._frames - a, root: !!document.querySelector('.tks-root') }), 400) }))
  check(ds.n === 0 && !ds.root, `destroy: loop stopped and DOM removed (${ds.n} frames, root ${ds.root})`)
  check(errs.length === 0, `controls: no page errors (${errs.join(' | ')})`)
  await p.close()
}

// ── determinism: same level + seed = same sea ──
{
  const { p } = await open(b, 390, 844, 'manual=1&muted=1')
  const same = await p.evaluate(() => {
    const a = TKSteer.build({ mode: 'ice', seed: 42 }), c = TKSteer.build({ mode: 'ice', seed: 42 }), e = TKSteer.build({ mode: 'ice', seed: 43 })
    const sig = w => w.ice.map(i => i.x.toFixed(1) + ',' + i.y.toFixed(1)).join(';')
    return { same: sig(a) === sig(c), diff: sig(a) !== sig(e), vessels: TKSteer.vessels.join(',') }
  })
  check(same.same && same.diff, 'build(): same seed = same ice field, other seed differs')
  check(same.vessels === 'boat,liner,clipper,explorer,raft,sub', `all six vessels available (${same.vessels})`)
  await p.close()
}

await b.close()
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails ? 1 : 0)
