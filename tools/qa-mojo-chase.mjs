// G31 3-Lane Rescue Chase gate (MOJO_CHASE_PRD.md + owner asset/track directives 2026-10-03).
//   node tools/qa-mojo-chase.mjs            full gate (needs the local server on :8081)
//   QA_SIZES=1280x800 QA_FAST=1 ...         one viewport, skip the long rubber-band run
// Sections: A assets (rear sprites aligned, every chase key loads with alpha borders, kid-safe denylist)
//           B headless rules (2,000+ spawns, sequencer, recycle ring, chevrons, education generator)
//           C browser per viewport (real taps + swipes, lane change <= 400 ms, BROK + recovery <= 1.8 s,
//             gadget pickup, lock-on + capture, result returned to the parent, adventure beat, no errors,
//             no emoji, Indonesian text, parallax ratios, frame time) + D rubber band (a crashing autopilot finishes)
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '..')
const BASE = process.env.QA_BASE || 'http://localhost:8081'
const url = BASE + '/games/mojo-swoptops.html?unlock=1&chase=1'
const out = process.env.QA_SHOTS || '/tmp/mojo-chase-qa'; fs.mkdirSync(out, { recursive: true })
const sizes = (process.env.QA_SIZES || '1280x800,1024x768,390x844,844x390').split(',').map(x => x.split('x').map(Number))
const GPU = process.env.QA_GPU !== '0'   // the owner's tablet renders with a GPU; headless needs it asked for
const sleep = ms => new Promise(r => setTimeout(r, ms))
const issues = []; let passed = 0
function check (ok, msg) { if (ok) passed++; else { issues.push(msg); console.error('FAIL', msg) } }
const report = {}

/* ── B. headless rules ─────────────────────────────────────────────────────────────────────────── */
globalThis.window = globalThis
for (const f of ['games/data/mojo-chases.js', 'games/mojo-chase-rules.js', 'games/mojo-chase-track.js', 'games/data/mojo-rear-anchors.js', 'games/data/mojo-chase-anchors.js', 'games/data/mojo-track-anchors.js', 'games/data/mojo-codex-anchors.js']) (0, eval)(fs.readFileSync(path.join(root, f), 'utf8'))
const R = globalThis.MojoChaseRules, CH = globalThis.MojoChases, TR = globalThis.MojoChaseTrack
for (const tier of ['A', 'B', 'C', 'D', 'E']) {
  const s = R.sim(2000, 7 + tier.charCodeAt(0), tier, 0)
  check(s.threeBlock === 0, `rules ${tier}: no row of three blockers over 2000 spawns (${s.threeBlock})`)
  check(s.unreachable === 0, `rules ${tier}: every row keeps a lane reachable with one change (${s.unreachable})`)
  check(s.stars > 200, `rules ${tier}: stars spawn (${s.stars})`)
  report['spawn-' + tier] = s
}
let repeatBad = 0
for (const st of CH.STAGES) for (let seed = 1; seed <= 50; seed++) {
  const q = CH.sequencer(st, seed); let last = null, run = 0
  for (let i = 0; i < 120; i++) { const id = q.next(); run = id === last ? run + 1 : 1; last = id; if (id !== 'straight-a' && run > 2) repeatBad++ }
}
check(repeatBad === 0, `sequencer: no piece more than 2 in a row over 50 seeded runs per stage (${repeatBad})`)
for (const st of CH.STAGES) {
  const t = TR.create(st, 3, {}), ringLen = t.ring.length
  for (let z = 0; z < 3 * 60 * 6000; z += 6000 / 30) t.ensure(Math.floor(z / TR.SEG))   // 3 simulated minutes at base speed
  check(t.ring.length === ringLen && ringLen === TR.RING, `track ${st.id}: recycle ring constant (${t.ring.length})`)
  const ch = t.chevronAudit()
  check(ch.bad === 0, `track ${st.id}: every chevron precedes a curve of its direction (${ch.bad}/${ch.checked})`)
}
for (let i = 0; i < 200; i++) {
  const q = CH.chaseGen(1, R.rng(i + 1), null, {})
  check(q.choices.length === 3 && q.choices.includes(q.answer) && new Set(q.choices).size === 3, 'education: 3 distinct lanes with the answer ' + q.id)
}
const prog = { prog: 0, best: 0, speed: 0.7, elapsed: 0, seconds: 70, hits: 9, hasRocket: true }
for (let t = 0; t < 180 && prog.prog < 1; t += 0.05) { prog.elapsed = t; R.progress(prog, 0.05) }
check(prog.prog >= 1 && prog.elapsed < 130, `rubber band: a permanently dizzy driver still reaches capture range (${prog.elapsed.toFixed(0)} s)`)

/* ── A. assets ─────────────────────────────────────────────────────────────────────────────────── */
const RA = globalThis.MojoRearAnchors, CA = globalThis.MojoChaseAnchors, TA = globalThis.MojoTrackAnchors
const rearKeys = Object.keys(RA.sprites).map(n => 'mojo-rear/' + n)
const chaseKeys = []
for (const [fam, F] of Object.entries(CA.families)) for (const n of Object.keys(F.sprites)) chaseKeys.push(`mojo-chase/${fam}/${n}`)
for (const [fam, F] of Object.entries(TA.families)) for (const n of Object.keys(F.sprites)) chaseKeys.push(`mojo-chase/${fam === 'trackprops' ? 'props' : 'signs'}/${n}`)
for (const n of Object.keys(TA.far)) chaseKeys.push('mojo-chase/far/' + n)
for (const n of Object.keys(TA.biome)) chaseKeys.push('mojo-chase/biome/' + n)
const gameSrc = ['games/mojo-chase.js', 'games/mojo-chase-track.js', 'games/mojo-chase-scene.js', 'games/mojo-chase-menu.js', 'games/data/mojo-chases.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n')
for (const bad of CA.denylist) check(!new RegExp(`['"/]${bad}['"/.]`).test(gameSrc), `kid-safe: excluded asset "${bad}" is never referenced`)
for (const st of CH.STAGES) {
  const CX = globalThis.MojoCodexAnchors
  if (st.cfar) { check(CX.far[st.cfar] && CX.far[st.cfar].horizon > 0.4, `stage ${st.id}: Codex FAR strip + horizon anchor resolve (${st.cfar})`); chaseKeys.push('mojo-chase/cfar/' + st.cfar) } else check(TA.far[st.far], `stage ${st.id}: FAR strip resolves (${st.far})`)
  if (st.cmid) { check(CX.mid[st.cmid], `stage ${st.id}: Codex MID strip resolves (${st.cmid})`); chaseKeys.push('mojo-chase/cmid/' + st.cmid) } else if (st.mid) check(TA.far[st.mid], `stage ${st.id}: MID strip resolves`)
  if (st.cardKey) chaseKeys.push('mojo-chase/' + st.cardKey)
  check(TA.sky[st.sky], `stage ${st.id}: sky palette resolves (${st.sky})`)
  check(st.cardKey ? TA.biome25[st.cardKey.split('/')[1].replace(/^\d+-/, '')] : TA.biome[st.card], `stage ${st.id}: stage card resolves`)
  check(CA.families.vehicles.sprites[st.target] && !CA.denylist.includes(st.target), `stage ${st.id}: target vehicle resolves and is kid-safe (${st.target})`)
  for (const p of TR.BIOME[st.biome].props) check(TR.PROP_KEY[p[0]], `stage ${st.id}: prop ${p[0]} has a key`)
}
check(CH.STAGES.length === 25, `25 stages, one per owner biome (${CH.STAGES.length})`)
check(['malam', 'tol-malam', 'antariksa'].every(id => CH.stage(id).night === true), 'night stages turn the headlights on')

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist'].concat(GPU ? ['--use-angle=vulkan', '--enable-gpu'] : []) })
try {
  {
    const p = await browser.newPage()
    await p.goto(BASE + '/games/mojo-swoptops.html', { waitUntil: 'domcontentloaded' })
    const res = await p.evaluate(async (rear, keys) => {
      function load (k) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = AssetIndex.path(k) }) }
      const out = { rear: [], other: [] }
      for (const k of rear) {
        const i = await load(k); if (!i) { out.rear.push({ k, ok: false }); continue }
        const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; const x = c.getContext('2d'); x.drawImage(i, 0, 0)
        const d = x.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height
        let border = 0; for (let xx = 0; xx < W; xx++) border = Math.max(border, d[(xx) * 4 + 3], d[((H - 1) * W + xx) * 4 + 3])
        for (let yy = 0; yy < H; yy++) border = Math.max(border, d[(yy * W) * 4 + 3], d[(yy * W + W - 1) * 4 + 3])
        let base = -1; for (let yy = H - 1; yy >= 0 && base < 0; yy--) { let n = 0; for (let xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] >= 128) n++; if (n >= 3) base = yy }
        out.rear.push({ k, ok: true, border, base, w: W, h: H })
      }
      for (const k of keys) { const i = await load(k); out.other.push({ k, ok: !!(i && i.naturalWidth) }) }
      return out
    }, rearKeys, chaseKeys)
    const bases = res.rear.filter(r => r.ok).map(r => r.base)
    for (const r of res.rear) { check(r.ok, `rear sprite loads ${r.k}`); if (r.ok) check(r.border === 0, `rear sprite has clear alpha at the borders ${r.k} (${r.border})`) }
    check(Math.max(...bases) - Math.min(...bases) <= 2 && new Set(res.rear.map(r => r.w + 'x' + r.h)).size === 1, `rear sprites share one canvas and a baseline within 2 px (${Math.min(...bases)}..${Math.max(...bases)})`)
    for (const r of res.other) check(r.ok, `chase asset loads ${r.k}`)
    report.assets = { rear: res.rear.length, chase: res.other.length }
    await p.close()
  }

  /* ── C. browser per viewport ─────────────────────────────────────────────────────────────────── */
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u
  const ENGLISH = /\b(the|chase|robber|mission|catch|ready|pause|score|level|left|right)\b/i
  async function openStage (p, stage) {
    await p.evaluate(() => { const b = document.querySelector('#scr-splash .splash-stage>.btn'); if (b) b.click() })
    await sleep(250)
    await p.click('#btn-race'); await sleep(400)
    check(await p.evaluate(() => document.body.dataset.scr === 'scr-race'), 'the Balapan menu entry opens the stage list')
    const card = await p.$(`.race-card[data-stage="${stage}"]`)
    await card.evaluate(e => e.scrollIntoView({ block: 'center' })); await card.click()
    await p.waitForSelector('#mc-go', { timeout: 20000 }); await sleep(300)
  }
  async function state (p) { return p.evaluate(() => __mojoChase.state()) }
  async function waitState (p, fn, ms) { const t = Date.now(); while (Date.now() - t < ms) { const s = await state(p); if (fn(s)) return s; await sleep(150) } return state(p) }
  for (const [width, height] of sizes) {
    const p = await browser.newPage(); await p.setViewport({ width, height, deviceScaleFactor: 1, hasTouch: width < 900 })
    const errors = []
    p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()) })
    await p.goto(url, { waitUntil: 'networkidle2' }); await p.waitForFunction(() => window.MojoChaseMenu && window.__mojo)
    await openStage(p, width === 1280 ? 'pantai' : width === 390 ? 'kota' : width === 844 ? 'malam' : 'gurun')
    await p.screenshot({ path: `${out}/${width}-intro.png` })
    await p.click('#mc-go')
    let s = await waitState(p, s => s.state === 'active', 9000)
    check(s.state === 'active', `${width}: tutorial hands over to the chase (${s.state})`)
    // HUD sizes: targets >= 56 px, text >= 14 px
    const hud = await p.evaluate(() => {
      const r = sel => { const e = document.querySelector(sel); const b = e.getBoundingClientRect(); return [b.width, b.height] }
      const txt = [...document.querySelectorAll('.mc-hud *')].filter(e => e.childElementCount === 0 && e.textContent.trim() && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).map(e => [e.textContent.trim(), parseFloat(getComputedStyle(e).fontSize)])
      return { l: r('.mc-btn.l'), r: r('.mc-btn.r'), u: r('.mc-btn.u'), g: r('.mc-gadget'), pause: r('.mc-pause'), txt, all: document.getElementById('chase-host').innerText }
    })
    for (const k of ['l', 'r', 'u', 'g', 'pause']) check(Math.min(...hud[k]) >= 56, `${width}: ${k} target >= 56 px (${hud[k].map(Math.round)})`)
    for (const [t, f] of hud.txt) check(f >= 14, `${width}: text "${t}" >= 14 px (${f})`)
    check(!EMOJI.test(hud.all), `${width}: no emoji in the chase`)
    check(!ENGLISH.test(hud.all), `${width}: HUD text is Indonesian (${hud.all.replace(/\s+/g, ' ').slice(0, 80)})`)
    // real tap: lane change <= 400 ms
    const lane0 = s.lane
    const btn = await p.$(lane0 > 0 ? '.mc-btn.l' : '.mc-btn.r')
    if (width < 900) await btn.tap(); else await btn.click()
    await sleep(500); s = await state(p)
    check(s.lane !== lane0 && s.lastLaneMs > 0 && s.lastLaneMs <= 400, `${width}: tap changes lane in <= 400 ms (${Math.round(s.lastLaneMs)} ms)`)
    // real swipe on the road
    const lane1 = s.lane, dir = lane1 > 0 ? -1 : 1
    await p.mouse.move(width / 2, height * 0.6); await p.mouse.down(); await p.mouse.move(width / 2 + dir * 120, height * 0.6, { steps: 4 }); await p.mouse.up()
    await sleep(500); s = await state(p)
    check(s.lane === lane1 + dir, `${width}: a swipe changes lane (${lane1} -> ${s.lane})`)
    // boost frame sequence + BROK + recovery (a real collision: a crate is put in Mojo's lane)
    await p.evaluate(() => __mojoChase.emitTest('boost'))
    for (let f = 0; f < (width === 1280 || width === 390 ? 20 : 3); f++) { await p.screenshot({ path: `${out}/${width}-boost-${String(f).padStart(2, '0')}.png` }); await sleep(100) }
    await p.evaluate(() => __mojoChase.emitTest('brok'))
    for (let f = 0; f < (width === 1280 || width === 390 ? 20 : 3); f++) { await p.screenshot({ path: `${out}/${width}-brok-${String(f).padStart(2, '0')}.png` }); await sleep(100) }
    s = await waitState(p, s => s.recoveryMs.length > 0, 4000)
    check(s.brok >= 1 && s.recoveryMs.length && s.recoveryMs[0] <= 1800 && s.recoveryMs[0] >= 1000, `${width}: BROK then control back in 1.0-1.8 s (${s.recoveryMs})`)
    await p.evaluate(() => __mojoChase.emitTest('star'))
    for (let f = 0; f < (width === 1280 || width === 390 ? 20 : 3); f++) { await p.screenshot({ path: `${out}/${width}-star-${String(f).padStart(2, '0')}.png` }); await sleep(100) }
    // play it out with the clean autopilot (it steers with the same laneTo/boost the buttons use)
    await p.evaluate(() => __mojoChase.auto({ mode: 'clean', boost: true }))
    s = await waitState(p, s => s.hasRocket, 120000)
    check(s.hasRocket && s.boxes >= 1, `${width}: the capture-rocket box is picked up (${s.boxes} boxes)`)
    s = await waitState(p, s => s.state === 'lock' || s.state === 'capture', 120000)
    check(s.state === 'lock' || s.state === 'capture', `${width}: lock-on in capture range (${s.state} ${s.prog.toFixed(2)})`)
    if (s.state === 'lock') await p.screenshot({ path: `${out}/${width}-lock.png` })
    s = await waitState(p, s => s.state === 'capture', 8000)
    for (let f = 0; f < (width === 1280 || width === 390 ? 20 : 4); f++) { await p.screenshot({ path: `${out}/${width}-capture-${String(f).padStart(2, '0')}.png` }); await sleep(100) }
    s = await waitState(p, s => s.state === 'result', 15000)
    check(s.state === 'result', `${width}: capture + police payoff reach the result (${s.state})`)
    check(s.edu && s.edu.asked, `${width}: the education lane event ran (${s.eduPrompt})`)
    check(s.elapsed >= 45 && s.elapsed <= 130, `${width}: session length ${s.elapsed.toFixed(0)} s within 45-130 s`)
    const par = s.par, rat = k => par[k] / par.road
    check(Math.abs(rat('far') / 0.05 - 1) <= 0.1 && Math.abs(rat('mid') / 0.2 - 1) <= 0.1 && Math.abs(rat('roadside') / 0.7 - 1) <= 0.1, `${width}: parallax ratios 0.05/0.20/0.70 (${rat('far').toFixed(3)}/${rat('mid').toFixed(3)}/${rat('roadside').toFixed(3)})`)
    report['frames-' + width] = { frameMedian: s.frameMedian, workMedianPerTier: s.workMedian, quality: s.quality, missing: s.missing }
    check(!s.missing.length, `${width}: every stage image loaded (${s.missing})`)
    await p.screenshot({ path: `${out}/${width}-result.png` })
    await p.click('#mc-done'); await sleep(600)
    check(await p.evaluate(() => !document.getElementById('chase-host') && document.body.dataset.scr === 'scr-race'), `${width}: the result returns to the parent menu`)
    check(await p.evaluate(() => Object.keys(MojoChaseMenu.load().st).length >= 1), `${width}: stars saved per avatar`)
    if (width === 1280) {
      // the adventure beat: run the m1 chase beat through the parent hook and get the result back
      const got = p.evaluate(() => new Promise(res => MojoChaseMenu.beat('m1', 0, r => res(r))))
      await p.waitForSelector('#mc-go', { timeout: 20000 }); await p.click('#mc-go'); await sleep(2500)
      await p.evaluate(() => { __mojoChase.force({ prog: 0.97, best: 0.97, hasRocket: true, rocket: 1 }); __mojoChase.auto({ mode: 'clean' }) })
      await waitState(p, s => s.state === 'result', 40000); await p.click('#mc-done')
      const r = await got
      check(r && r.completed && r.chase_id === 'ADV_M1_ROTI' && r.reward_result.stars >= 1, `adventure beat m1 returns its result to the parent (${JSON.stringify(r).slice(0, 120)})`)
      // night stage start frame
      await openStage(p, 'malam'); await p.click('#mc-go'); await sleep(4000)
      await p.screenshot({ path: `${out}/1280-night.png` })
      for (let f = 0; f < 20; f++) { await p.screenshot({ path: `${out}/1280-night-${String(f).padStart(2, '0')}.png` }); await sleep(100) }
      await p.click('.mc-pause'); await sleep(300); await p.click('#mc-exit'); await sleep(500)
    }
    check(!errors.length, `${width}: no page errors (${errors.slice(0, 3)})`)
    await p.close()
  }

  /* ── E. no leaks over 5 replays (+ PRD §23 edge cases: repeated swipes, boost while dizzy, pause in capture,
     rotation mid-chase, pause during the intro) ─────────────────────────────────────────────────── */
  {
    const p = await browser.newPage(); await p.setViewport({ width: 1024, height: 768 }); const errors = []
    p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()) }); p.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()) })
    await p.goto(url, { waitUntil: 'networkidle2' }); await p.waitForFunction(() => window.MojoChaseMenu)
    for (let k = 0; k < 5; k++) {
      const done = p.evaluate(st => MojoChaseMenu.run(MojoChases.config(st)), ['pantai', 'kota', 'hutan', 'malam', 'salju'][k])
      await p.waitForSelector('#mc-go', { timeout: 20000 })
      await p.click('.mc-pause'); await sleep(200)
      check(await p.$('#mc-go'), `replay ${k}: pause during the intro keeps the start button`)
      await p.click('#mc-go'); await waitState(p, s => s.state === 'active', 8000)
      for (let i = 0; i < 6; i++) { await p.click(i % 2 ? '.mc-btn.r' : '.mc-btn.l'); await sleep(40) }   // repeated taps mid-transition
      await p.evaluate(() => { __mojoChase.emitTest('brok'); __mojoChase.emitTest('boost'); __mojoChase.emitTest('star') })   // boost while dizzy, pickup + hit together
      await p.setViewport({ width: 768, height: 1024 }); await sleep(400); await p.setViewport({ width: 1024, height: 768 }); await sleep(300)   // rotation mid-chase
      if (k === 0) {
        await p.evaluate(() => __mojoChase.force({ prog: 0.99, best: 0.99, hasRocket: true, rocket: 1 }))
        await waitState(p, s => s.state === 'lock', 6000); await p.click('.mc-gadget'); await sleep(250)
        await p.click('.mc-pause'); await sleep(600)
        const ps = await state(p); check(ps.paused && ps.state === 'capture', `pause during the capture holds it (${ps.state})`)
        await p.click('#mc-resume'); const rs = await waitState(p, s => s.state === 'result', 12000); check(rs.state === 'result', 'the capture resumes to the result')
        await p.click('#mc-done')
      } else { await p.click('.mc-pause'); await sleep(200); await p.click('#mc-exit') }
      const r = await done
      check(r && (k === 0 ? r.completed : r.exited), `replay ${k}: result returned (${r && JSON.stringify(r).slice(0, 60)})`)
      const f0 = await p.evaluate(() => window.__mcFrames); await sleep(400); const f1 = await p.evaluate(() => window.__mcFrames)
      check(f0 === f1, `replay ${k}: the frame loop stopped (${f0} -> ${f1})`)
      check(await p.evaluate(() => !document.getElementById('chase-host') && MojoChaseFX.live() === 0), `replay ${k}: host removed and particle pool reset`)
    }
    check(!errors.length, `replays: no console errors, warnings or 404s (${errors.slice(0, 3)})`)
    await p.close()
  }

  /* ── F. every stage loads and renders its start frame without errors (contact sheet of 25) + perf ───────── */
  {
    const p = await browser.newPage(); await p.setViewport({ width: 1280, height: 800 }); const errors = []
    p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()) })
    await p.goto(url, { waitUntil: 'networkidle2' }); await p.waitForFunction(() => window.MojoChaseMenu)
    fs.mkdirSync(out + '/stages', { recursive: true })
    for (const st of CH.STAGES) {
      const done = p.evaluate(id => MojoChaseMenu.run(MojoChases.config(id)), st.id)
      await p.waitForSelector('#mc-go', { timeout: 20000 }); await p.click('#mc-go'); await sleep(3200)
      const s = await state(p)
      check(!s.missing.length && s.state !== 'load', `stage ${st.id}: all art decoded and running (${s.missing})`)
      await p.screenshot({ path: `${out}/stages/${st.id}.png` })
      await p.click('.mc-pause'); await sleep(150); await p.click('#mc-exit'); await done
    }
    check(!errors.length, `25 stages: no page errors or 404s (${errors.slice(0, 3)})`)
    // perf: 10 s of chase, frame-interval percentiles + main-thread work per frame (deterministic, load-independent)
    const done = p.evaluate(() => MojoChaseMenu.run(MojoChases.config('pantai')))
    await p.waitForSelector('#mc-go'); await p.click('#mc-go'); await sleep(1500)
    await p.evaluate(() => __mojoChase.auto({ mode: 'clean', boost: true })); await sleep(10000)
    const s = await state(p), a = s.frameTimes.slice(-600).sort((x, y) => x - y), pq = f => a[Math.floor(a.length * f)]
    report.perf = { p50: pq(0.5), p95: pq(0.95), p99: pq(0.99), dropped: a.filter(x => x > 25).length, frames: a.length, workMedianPerTier: s.workMedian, quality: s.quality }
    check(Math.max(...Object.values(s.workMedian)) <= 12, `perf: main-thread work per frame <= 12 ms at every tier (${JSON.stringify(s.workMedian)})`)
    if (process.env.QA_PERF_STRICT) check(pq(0.95) <= 16.8, `perf: p95 frame <= 16.7 ms (${pq(0.95)})`)
    await p.click('.mc-pause'); await sleep(150); await p.click('#mc-exit'); await done
    await p.close()
  }

  /* ── D. rubber band: a crashing autopilot still finishes ─────────────────────────────────────── */
  if (!process.env.QA_FAST) {
    const p = await browser.newPage(); await p.setViewport({ width: 1280, height: 800 })
    await p.goto(url, { waitUntil: 'networkidle2' }); await p.waitForFunction(() => window.MojoChaseMenu)
    const done = p.evaluate(() => MojoChaseMenu.run(MojoChases.config('pantai', { seconds: 70 })))
    await p.waitForSelector('#mc-go', { timeout: 20000 }); await p.click('#mc-go'); await sleep(2000)
    await p.evaluate(() => __mojoChase.auto({ mode: 'crash' }))
    const s = await waitState(p, s => s.state === 'result', 200000)
    check(s.state === 'result' && s.hits >= 3, `rubber band: a crashing autopilot (${s.hits} hits) still catches the robber in ${s.elapsed.toFixed(0)} s`)
    check(s.recoveryMs.every(ms => ms <= 1800), `rubber band: every recovery <= 1.8 s (${s.recoveryMs.slice(0, 8)})`)
    report.crash = { hits: s.hits, elapsed: s.elapsed }
    await p.click('#mc-done'); await done
    await p.close()
  }
} finally { await browser.close() }
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1))
console.log(JSON.stringify(report, null, 1))
console.log(`qa-mojo-chase: ${passed} passed, ${issues.length} failed`)
if (issues.length) process.exitCode = 1
