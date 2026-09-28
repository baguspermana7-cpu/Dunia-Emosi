// qa-tk-lanes.mjs — gate for games/tk-lanes.js (Timmy & Kapal Legendaris, PRD v2 §13: three-lane
// navigation, Collision → Knowledge Challenge → Recover, Titanic "no safe corridor" final).
// Drives the kept harness tools/tk-harness-lanes.html with REAL input (touchscreen taps on the LEFT /
// RIGHT / Cepat buttons, keyboard arrows, a swipe on the sea) and checks:
//   lane change completes within 0.45 s · edge lane holds · boost speeds up · buttons >= 80 px, HUD text >= 12 px
//   · a collision opens the TKQuiz.challenge card and STOPS the loop · a wrong tap climbs the hint ladder,
//   the right tap + "Lanjut Berlayar" resumes the ship in a free lane with brief invulnerability, counted
//   (collisions 1, correct 0, tries 2) · autopilot (real button taps toward state().safeLane) finishes a
//   normal level with 0 collisions, stars collected, onDone payload · final mode ends ONCE with
//   {final:true, stars:3}, shows "Tidak ada jalur aman" + the captain's line with his portrait, goes
//   PLAYER → ASSISTED → CINEMATIC → IMPACT, ignores input in the cinematic, asks no question after the
//   corridor starts — also while the child hammers RIGHT · the DOM never contains gagal/kalah/game over/crash
//   · reduced motion = no particles / shake · p90 >= 24 fps at 4x CPU (390x844, 1024x768) · the rAF loop
//   stops when paused / hidden / destroyed · no page errors.
//   fleet (2026-09-28): Character Selection when no ship is saved, pick persists per avatar, TOP-VIEW sprite in
//   play, LEFT/RIGHT + wheel (Cepat) >= 2x the old size, no control covers the ship, Ganti Kapal, timers pruned.
// Screenshots (390x844, 844x390, 1280x800) -> QA_SHOTS (default: the session scratchpad tk-lanes/).
// QA_FAULT=1 burns 45 ms per frame during the fps probe — the gate MUST fail (proves it can see jank).
// Run: node tools/qa-tk-lanes.mjs   (dev server on :8081)
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const BASE = process.env.QA_URL || 'http://localhost:8081/tools/tk-harness-lanes.html'
const SHOTS = process.env.QA_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-lanes/'
fs.mkdirSync(SHOTS, { recursive: true })
const BAD = /gagal|kalah|game over|crash/i
const sleep = ms => new Promise(r => setTimeout(r, ms))
let fails = 0
const check = (ok, msg) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + msg); if (!ok) fails++ }

// failure-word watcher: records any text ever inserted that matches BAD
const WATCH = () => {
  window.__bad = []
  const re = /gagal|kalah|game over|crash/i
  const scan = () => { const t = document.body.innerText; if (re.test(t)) window.__bad.push(t.slice(0, 200)) }
  new MutationObserver(scan).observe(document.body, { subtree: true, childList: true, characterData: true })
  scan()
}
// in-page autopilot: taps the REAL buttons (pointerdown) toward the lane the director keeps open
const AUTOPILOT = (fight) => {
  window.__autoStop && window.__autoStop()
  const L = document.querySelector('.tkl-left'), R = document.querySelector('.tkl-right')
  const tap = b => b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'touch', isPrimary: true }))
  window.__taps = 0; window.__phases = []
  const id = setInterval(() => {
    const s = window.__h.state()
    if (window.__phases[window.__phases.length - 1] !== s.phase) window.__phases.push(s.phase)
    if (s.sent) { clearInterval(id); return }
    if (fight && s.phase !== 'player') { tap(R); window.__taps++; return }
    if (s.waiting || s.phase !== 'player') return
    const settled = Math.abs(s.x - (s.lane - 1) * 100) < 2
    if (settled && s.lane !== s.safeLane) { tap(s.safeLane < s.lane ? L : R); window.__taps++ }
  }, 60)
  window.__autoStop = () => clearInterval(id)
}
async function open (b, w, h, qs) {
  const p = await b.newPage()
  const errs = []
  p.on('pageerror', e => errs.push(e.message))
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()) })
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: true })
  await p.goto(BASE + '?' + qs, { waitUntil: 'networkidle2' })
  await p.evaluate(WATCH)
  return { p, errs }
}
async function tapEl (p, sel) {
  const r = await p.$eval(sel, e => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } })
  await p.touchscreen.tap(r.x, r.y)
}
const st = p => p.evaluate(() => window.__h.state())
async function waitFor (p, fn, ms, arg) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { const v = await p.evaluate(fn, arg); if (v) return v; await sleep(80) }
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

// ── A. controls: taps, edge, keyboard, swipe, boost, target sizes, text sizes ──
{
  const { p, errs } = await open(b, 390, 844, 'manual=1&quiz=stub')
  await p.evaluate(() => __mount({ seed: 4, sections: [{ kind: 'open', length: 6000 }] }))
  await sleep(900)
  const tut = await p.evaluate(() => ({ s: __h.state().tutorial, l: document.querySelector('.tkl-left').classList.contains('is-demo'), r: document.querySelector('.tkl-right').classList.contains('is-demo'),
    anim: getComputedStyle(document.querySelector('.tkl-left')).animationName, hint: document.querySelector('.tkl-hint.is-on') ? document.querySelector('.tkl-hint').textContent : '', said: window.__said.join(' | ') }))
  check(tut.s === 1 && tut.l && tut.r && tut.anim === 'tkl-pulse' && /kiri atau kanan/.test(tut.hint) && /kiri atau kanan/.test(tut.said), `first seconds: LEFT/RIGHT pulse (${tut.anim}), ghost arrows (tutorial ${tut.s}), hint + narration ("${tut.said}")`)
  await p.screenshot({ path: `${SHOTS}tutorial-390x844.png` })
  await tapEl(p, '.tkl-left')
  await sleep(470)
  let s = await st(p)
  check(s.lane === 0 && Math.abs(s.x + 100) < 0.5, `390x844 tap LEFT: lane 1 -> 0 finished within 0.47 s (lane ${s.lane}, x ${s.x.toFixed(1)})`)
  await tapEl(p, '.tkl-right'); await sleep(500); await tapEl(p, '.tkl-right'); await sleep(500)
  s = await st(p)
  check(s.lane === 2 && Math.abs(s.x - 100) < 0.5, `two RIGHT taps: lane 2 (lane ${s.lane}, x ${s.x.toFixed(1)})`)
  const tut2 = await p.evaluate(() => ({ s: __h.state().tutorial, b: document.querySelector('.tkl-boost').classList.contains('is-demo'), l: document.querySelector('.tkl-left').classList.contains('is-demo'), said: window.__said.join(' | ') }))
  check(tut2.s === 2 && tut2.b && !tut2.l && /roda kemudi/.test(tut2.said), `after the first lane change the wheel (Cepat) is taught once (tutorial ${tut2.s}, boost pulse ${tut2.b})`)
  await tapEl(p, '.tkl-right'); await sleep(300)
  s = await st(p)
  check(s.lane === 2, 'RIGHT at the edge lane keeps lane 2 (a small nudge, no move)')
  await p.keyboard.press('ArrowLeft'); await sleep(500)
  s = await st(p)
  check(s.lane === 1, `keyboard ArrowLeft changes lane (lane ${s.lane})`)
  // mid-change heading: the hull turns into the lane change, then straightens
  await tapEl(p, '.tkl-left'); await sleep(200)
  const mid = await st(p)
  await sleep(600)
  const after = await st(p)
  check(mid.heading < -0.05 && Math.abs(after.heading) < 0.03, `lane change turns the bow (heading ${mid.heading.toFixed(2)} rad mid-change, ${after.heading.toFixed(3)} after)`)
  // swipe right on the sea
  await p.touchscreen.touchStart(195, 420); await p.touchscreen.touchMove(240, 424); await p.touchscreen.touchMove(290, 426); await p.touchscreen.touchEnd()
  await sleep(500)
  s = await st(p)
  check(s.lane === 1, `swipe right on the sea changes lane (lane ${s.lane})`)
  const v0 = s.speed
  await tapEl(p, '.tkl-boost'); await sleep(900)
  s = await st(p)
  check(s.boost > 0 && s.speed > v0 * 1.3, `Cepat (boost): speed ${Math.round(v0)} -> ${Math.round(s.speed)} u/s`)
  check(s.tutorial === -2 && !(await p.evaluate(() => !!document.querySelector('.is-demo'))), 'tutorial ends after the child boosts')
  await sleep(2200)
  s = await st(p)
  check(s.boost === 0 && s.speed < v0 * 1.15, `boost wears off (speed ${Math.round(s.speed)})`)
  const sizes = await p.evaluate(() => [...document.querySelectorAll('.tkl-turn,.tkl-boost,.tkl-pausebtn')].map(e => { const r = e.getBoundingClientRect(); return [e.className, Math.round(r.width), Math.round(r.height)] }))
  check(sizes.filter(x => /turn|boost/.test(x[0])).every(x => x[1] >= 80 && x[2] >= 80) && sizes.every(x => x[1] >= 56 && x[2] >= 56), `targets: turn/boost >= 80 px, all >= 56 px (${sizes.map(x => x[1] + 'x' + x[2]).join(', ')})`)
  const small = await p.evaluate(() => [...document.querySelectorAll('.tkl-root *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) < 12).map(e => e.className + ':' + getComputedStyle(e).fontSize))
  check(small.length === 0, `HUD text >= 12 px (${small.join(', ') || 'all ok'})`)
  const hudTxt = await p.evaluate(() => document.querySelector('.tkl-tl').innerText)
  check(/Waktu/.test(hudTxt) && /Skor/.test(hudTxt) && /Gunung es dihindari/.test(hudTxt), 'HUD shows Waktu / Skor / Gunung es dihindari')
  // pause / hidden / resume / destroy stop the loop
  await p.evaluate(() => __h.pause()); await sleep(150)
  const f1 = (await st(p)).frames; await sleep(400); const s2 = await st(p)
  check(!s2.running && s2.frames === f1 && s2.paused, 'pause: rAF loop stopped (frames frozen)')
  await p.evaluate(() => __h.resume()); await sleep(300)
  check((await st(p)).running, 'resume: loop running again')
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
  await sleep(150); const f2 = (await st(p)).frames; await sleep(400)
  check((await st(p)).frames === f2 && !(await st(p)).running, 'document hidden: loop stopped')
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')) })
  await sleep(300)
  check((await st(p)).running, 'visible again: loop restarts')
  const gone = await p.evaluate(() => { const h = __h; h.destroy(); const f = TKLanes._frames; return new Promise(r => setTimeout(() => r(!document.querySelector('.tkl-root') && TKLanes._frames === f), 300)) })
  check(gone, 'destroy: root removed, no more frames')
  check(errs.length === 0, `controls: no page errors (${errs.join(' | ')})`)
  await p.close()
}

// ── B. collision → real TKQuiz.challenge → wrong then right → recover (390x844 + 1280x800 + 844x390) ──
for (const [w, h] of [[390, 844], [1280, 800], [844, 390]]) {
  const tag = `${w}x${h}`
  const { p, errs } = await open(b, w, h, 'manual=1')
  await p.evaluate(() => __mount({ seed: 9, sections: [{ kind: 'open', length: 4000 }], objects: [{ type: 'berg', lane: 1, z: 520 }, { type: 'star', lane: 0, z: 1100 }] }))
  const s0 = await waitFor(p, () => { const s = __h.state(); return s.impact ? s : null }, 8000)
  check(!!s0, `${tag}: ship in lane 1 meets the berg (impact)`)
  if (w === 390) {
    await sleep(250)
    const mx = await p.evaluate(() => __h.state())
    await p.screenshot({ path: `${SHOTS}collision-${tag}-impact.png` })
    check(mx.parts > 0 && mx.speed < mx.vmax * 0.8, `${tag}: impact spray (${mx.parts} particles), ship slows (${Math.round(mx.speed)} u/s)`)
  }
  const card = await waitFor(p, () => !!document.querySelector('.tkq-chal.on .tkq-opt'), 6000)
  check(!!card, `${tag}: Knowledge Challenge card opened`)
  await sleep(700)
  let s = await st(p)
  const f1 = s.frames; await sleep(400)
  check(s.waiting && !(await st(p)).running && (await st(p)).frames === f1, `${tag}: game loop stopped while the card is open`)
  const ans = s.challenge && s.challenge.answer
  const badge = await p.evaluate(() => { const bd = document.querySelector('.tkq-chal .tkq-badge'); return bd ? bd.innerText : '' })
  check(!!ans && !!badge, `${tag}: card shows a domain badge "${badge}" and has an answer`)
  const wrongSel = await p.evaluate(a => { const o = [...document.querySelectorAll('.tkq-chal .tkq-opt')].find(x => x.dataset.c !== a && !x.disabled); if (!o) return null; o.setAttribute('data-qa', 'wrong'); return true }, ans)
  if (wrongSel) await tapEl(p, '[data-qa="wrong"]')
  await sleep(700)
  s = await st(p)
  const ladder = await p.evaluate(() => ({ tried: document.querySelectorAll('.tkq-chal .tkq-opt.tried').length, glow: !!document.querySelector('.tkq-chal .tkq-hintbtn.glow'), help: (document.querySelector('.tkq-chal .tkq-help') || {}).textContent || '' }))
  check(s.waiting && s.challenge && s.challenge.wrong === 1 && !s.challenge.answered && ladder.tried === 1, `${tag}: wrong tap: gentle retry (tried ${ladder.tried}, rung ${s.challenge && s.challenge.rung}, lantern glow ${ladder.glow}, hint "${ladder.help.slice(0, 40)}")`)
  if (w !== 844) await p.screenshot({ path: `${SHOTS}challenge-${tag}-hint.png` })
  await p.evaluate(a => { const o = [...document.querySelectorAll('.tkq-chal .tkq-opt')].find(x => x.dataset.c === a); o.setAttribute('data-qa', 'right') }, ans)
  await tapEl(p, '[data-qa="right"]')
  await sleep(900)
  const expl = await p.evaluate(() => { const e = document.querySelector('.tkq-chal .tkq-explain'); return e && !e.hidden ? e.textContent : '' })
  check(expl.length > 3, `${tag}: right answer shows the explanation ("${expl.slice(0, 50)}")`)
  if (w === 844) await p.screenshot({ path: `${SHOTS}challenge-${tag}-explain.png` })
  const nextTxt = await p.evaluate(() => document.querySelector('.tkq-chal .tkq-next').innerText)
  check(/Lanjut Berlayar/.test(nextTxt), `${tag}: button reads "Lanjut Berlayar"`)
  await tapEl(p, '.tkq-chal .tkq-next')
  const back = await waitFor(p, () => { const s = __h.state(); return !document.querySelector('.tkq-chal') && !s.waiting && s.running ? s : null }, 4000)
  check(!!back, `${tag}: card closed, ship sails on`)
  await sleep(900)
  s = await st(p)
  check(s.collisions === 1 && s.correct === 0 && s.tries === 2, `${tag}: counted collisions 1 / correct 0 / tries 2 (${s.collisions}/${s.correct}/${s.tries})`)
  check(s.speed > 40 && s.inv > 0 && s.lane !== 1, `${tag}: recovered: moving (${Math.round(s.speed)} u/s), invulnerable ${s.inv.toFixed(1)} s, moved to a free lane (${s.lane})`)
  if (w === 390) await p.screenshot({ path: `${SHOTS}collision-${tag}-recovered.png` })
  const bad = await p.evaluate(() => window.__bad)
  check(bad.length === 0, `${tag}: no failure words during the challenge`)
  check(errs.length === 0, `${tag}: collision flow no page errors (${errs.join(' | ')})`)
  await p.close()
}

// ── B2. fixed question API (cinema / lifeboat will pass these) ──
{
  const { p, errs } = await open(b, 390, 844, 'manual=1')
  const r = await p.evaluate(async () => {
    const pr = TKQuiz.challenge(document.getElementById('host'), { question: { prompt: 'Ada 3 sekoci penuh, lalu 2 sekoci lagi diturunkan. Berapa semuanya? 3 + 2', choices: [4, 5, 6], answer: 5, explain: '3 + 2 = 5.' }, sound: false })
    await new Promise(r => setTimeout(r, 900))
    const opts = [...document.querySelectorAll('.tkq-chal .tkq-opt')].map(o => o.dataset.c)
    const prompt = document.querySelector('.tkq-chal .tkq-prompt').textContent
    document.querySelector('.tkq-chal .tkq-opt[data-c="5"]').click()
    await new Promise(r => setTimeout(r, 700))
    document.querySelector('.tkq-chal .tkq-next').click()
    const res = await pr
    return { opts, prompt, res, left: !!document.querySelector('.tkq-chal') }
  })
  check(r.opts.length === 3 && r.opts.includes('5') && /3 \+ 2/.test(r.prompt), `fixed question "3 + 2": host choices kept (${r.opts.join(',')})`)
  check(r.res.correct === true && r.res.tries === 1, `fixed question resolves {correct:true, tries:1} (${JSON.stringify(r.res)})`)
  const r2 = await p.evaluate(async () => {
    const pr = TKQuiz.challenge(document.getElementById('host'), { question: { prompt: 'Sekoci muat 20 orang. Sudah ada 14. Berapa kursi kosong? 20 − 14', choices: ['5', '6', '7', '34'], answer: '6', explain: '20 − 14 = 6.', scene: { mode: 'capacity', cap: 20, fill: 14, groups: [] } }, sound: false })
    await new Promise(r => setTimeout(r, 900))
    const seats = document.querySelectorAll('.tkq-chal .tkq-o.seat').length
    document.querySelector('.tkq-chal .tkq-opt[data-c="7"]').click()
    await new Promise(r => setTimeout(r, 500))
    document.querySelector('.tkq-chal .tkq-opt[data-c="6"]').click()
    await new Promise(r => setTimeout(r, 700))
    document.querySelector('.tkq-chal .tkq-next').click()
    return { seats, res: await pr }
  })
  check(r2.seats === 6 && r2.res.correct === false && r2.res.tries === 2, `fixed "20 − 14" with a seat scene: 6 empty seats, wrong-then-right = {correct:false, tries:2} (${r2.seats}, ${JSON.stringify(r2.res)})`)
  const r3 = await p.evaluate(async () => {
    const out = []
    for (let i = 0; i < 6; i++) {
      const pr = TKQuiz.challenge(document.getElementById('host'), { domain: 'campur', world: 'titanic', islam: false, seed: 100 + i, sound: false })
      await new Promise(r => setTimeout(r, 300))
      out.push(pr.ctrl.questions[0].domain + ':' + pr.ctrl.questions[0].id)
      pr.close(); await pr
    }
    return { out, left: document.querySelectorAll('.tkq-chal').length }
  })
  await sleep(400)
  check(r3.out.every(x => !/^islam/.test(x)) && new Set(r3.out).size === r3.out.length, `campur with islam:false: no islam items, no repeats (${r3.out.join(' ')})`)
  check((await p.evaluate(() => document.querySelectorAll('.tkq-chal').length)) === 0, 'promise.close() removes the card')
  check(errs.length === 0, `challenge API no page errors (${errs.join(' | ')})`)
  await p.close()
}

// ── C. autopilot through a whole normal level (real button taps), screenshots at every size ──
for (const [w, h, diff] of [[390, 844, 2], [844, 390, 2], [1280, 800, 3], [1024, 768, 1]]) {
  const tag = `${w}x${h}`
  const { p, errs } = await open(b, w, h, `seed=11&diff=${diff}&scale=0.55&quiz=stub`)
  await p.evaluate(AUTOPILOT, false)
  let shots = 0, d = null, sawSections = new Set()
  const t0 = Date.now()
  while (Date.now() - t0 < 90000) {
    const s = await st(p)
    if (s.section) sawSections.add(s.section)
    if (shots === 0 && s.section === 'sparse') { shots++; await p.screenshot({ path: `${SHOTS}normal-${tag}-sparse.png` }) }
    if (shots === 1 && s.section === 'dense') { shots++; await sleep(1200); await p.screenshot({ path: `${SHOTS}normal-${tag}-dense.png` }) }
    d = await p.evaluate(() => window.__done[0] || null)
    if (d) break
    await sleep(200)
  }
  await sleep(300)
  if (w !== 1024) await p.screenshot({ path: `${SHOTS}normal-${tag}-end.png` })
  const x = await p.evaluate(() => ({ taps: window.__taps, chal: window.__chal.length, n: window.__done.length, bad: window.__bad }))
  check(!!d, `${tag} diff ${diff}: level finished via real taps (${d ? JSON.stringify(d) : 'no onDone'}; ${x.taps} taps)`)
  if (d) {
    check(d.collisions === 0 && x.chal === 0 && d.stars === 3, `${tag}: autopilot on the safe lane never collides (collisions ${d.collisions}, stars ${d.stars})`)
    check(d.starsCollected > 0 && d.avoided > 0 && d.avoided <= d.iceTotal && d.final === false && typeof d.time === 'number', `${tag}: stars collected ${d.starsCollected}/${d.starsTotal}, avoided ${d.avoided}/${d.iceTotal}, tokens ${d.tokens}, score ${d.score}`)
  }
  const nSec = await p.evaluate(() => __h.state().sections)
  check(nSec === 5 && ['sparse', 'more', 'narrow', 'dense'].every(k => sawSections.has(k)), `${tag}: all five sections played (${[...sawSections].join(' > ')}; the short open lead-in may pass before polling starts)`)
  check(x.n === 1, `${tag}: onDone fired once`)
  check(x.bad.length === 0, `${tag}: no failure words`)
  check(errs.length === 0, `${tag}: no page errors (${errs.join(' | ')})`)
  await p.close()
}

// ── D. final Titanic run: no safe corridor → assisted → cinematic → impact → onDone(final) ──
for (const [w, h, fight] of [[390, 844, false], [844, 390, false], [1280, 800, false], [390, 844, true]]) {
  const tag = `${w}x${h}${fight ? ' (hammering RIGHT)' : ''}`
  const { p, errs } = await open(b, w, h, `final=1&seed=5&diff=2&scale=0.6&quiz=stub`)
  await p.evaluate(AUTOPILOT, fight)
  let warnBefore = '', chalAtAssist = -1, warnShot = false, impShot = false, capOk = false, lockOk = null, d = null
  const t0 = Date.now()
  while (Date.now() - t0 < 90000) {
    const s = await st(p)
    if (s.phase !== 'player' && chalAtAssist < 0) {
      chalAtAssist = await p.evaluate(() => window.__chal.length)
      await sleep(400)
      capOk = await p.evaluate(() => { const c = document.querySelector('.tkl-cap.is-on'), im = c && c.querySelector('img'); return !!(c && im && im.naturalWidth > 0 && /Gunung es di depan! Pegangan/.test(c.innerText)) })
    }
    if (s.warn && !warnShot) {
      warnShot = true
      await sleep(500)
      if (!fight) await p.screenshot({ path: `${SHOTS}final-${w}x${h}-warn.png` })
    }
    if (s.phase === 'cinematic' && !warnBefore) warnBefore = s.warn ? 'yes' : 'no'
    if (s.phase === 'cinematic' && lockOk === null && !fight) {
      const lane0 = s.lane
      await tapEl(p, '.tkl-left'); await sleep(250)
      const s2 = await st(p)
      lockOk = s2.lane === lane0 || s2.lane === 1
    }
    if (s.phase === 'impact' && !impShot && !fight) { impShot = true; await sleep(700); await p.screenshot({ path: `${SHOTS}final-${w}x${h}-impact.png` }) }
    d = await p.evaluate(() => window.__done[0] || null)
    if (d) break
    await sleep(120)
  }
  await sleep(800)
  const r = await p.evaluate(() => ({ phases: window.__phases, chal: window.__chal.length, n: window.__done.length, bad: window.__bad, html: document.body.innerHTML, warn: (document.querySelector('.tkl-warn.is-on') || {}).innerText || '' }))
  check(!!d && d.final === true && d.stars === 3, `${tag}: onDone {final:true, stars:3} (${JSON.stringify(d)})`)
  check(r.n === 1, `${tag}: onDone fired once (${r.n})`)
  check(/Tidak ada jalur aman/.test(r.warn) && warnBefore === 'yes', `${tag}: calm chip "Tidak ada jalur aman" shown before control is taken (${warnBefore})`)
  check(capOk, `${tag}: captain portrait + "Gunung es di depan! Pegangan — aku bantu!"`)
  const order = ['assisted', 'cinematic', 'impact'].map(k => r.phases.indexOf(k))
  check(order.every(i => i > 0) && order[0] < order[1] && order[1] < order[2], `${tag}: control PLAYER → ASSISTED → CINEMATIC → IMPACT (${r.phases.join(' > ')})`)
  if (!fight) check(lockOk === true, `${tag}: input ignored during the cinematic`)
  check(chalAtAssist >= 0 && r.chal === chalAtAssist, `${tag}: no question asked once the corridor starts (${chalAtAssist} before, ${r.chal} after)`)
  check(r.bad.length === 0 && !BAD.test(r.html), `${tag}: DOM never contained gagal/kalah/game over/crash`)
  check(errs.length === 0, `${tag}: no page errors (${errs.join(' | ')})`)
  await p.close()
}

// ── E. reduced motion: collision without particles / shake / camera push, same information ──
{
  const { p, errs } = await open(b, 390, 844, 'manual=1&rm=1&quiz=stub')
  await p.evaluate(() => __mount({ seed: 2, sections: [{ kind: 'open', length: 3000 }], objects: [{ type: 'berg', lane: 1, z: 450 }] }))
  let maxP = 0, maxS = 0, hit = false
  const t0 = Date.now()
  while (Date.now() - t0 < 7000) {
    const s = await st(p)
    maxP = Math.max(maxP, s.parts); maxS = Math.max(maxS, s.shake)
    if (s.collisions) hit = true
    if (hit && !s.waiting && !s.impact) break
    await sleep(50)
  }
  const pop = await p.evaluate(() => { const e = document.querySelector('.tkl-pop.is-big'); return e ? e.textContent : '' })
  check(hit && maxP === 0 && maxS === 0, `reduced motion: collision counted with 0 particles / 0 shake (${maxP}, ${maxS})`)
  check(/berlayar lagi/.test(pop), `reduced motion: recovery message still shown ("${pop}")`)
  check(errs.length === 0, `reduced motion no page errors (${errs.join(' | ')})`)
  await p.close()
}

// ── G. frame-time trace (unthrottled): lane change + collision + challenge open/close + resume ──
{
  const { p, errs } = await open(b, 390, 844, 'manual=1')
  await p.evaluate(() => {
    window.__ft = []; let last = performance.now()
    const f = now => { window.__ft.push([now, now - last]); last = now; requestAnimationFrame(f) }
    requestAnimationFrame(f)
    __mount({ seed: 6, tutorial: false, sections: [{ kind: 'open', length: 5000 }], objects: [{ type: 'berg', lane: 0, z: 760 }] })
  })
  await sleep(1200)
  const tLane = await p.evaluate(() => performance.now())
  await tapEl(p, '.tkl-left')
  await sleep(1000)
  const tLane1 = await p.evaluate(() => performance.now())
  await waitFor(p, () => __h.state().impact, 8000)
  const tHit = await p.evaluate(() => performance.now())
  await waitFor(p, () => !!document.querySelector('.tkq-chal.on .tkq-opt'), 6000)
  await sleep(900)
  const ans = (await st(p)).challenge.answer
  await p.evaluate(a => [...document.querySelectorAll('.tkq-chal .tkq-opt')].find(x => x.dataset.c === a).setAttribute('data-qa', 'right'), ans)
  await tapEl(p, '[data-qa="right"]'); await sleep(900)
  await tapEl(p, '.tkq-chal .tkq-next')
  await waitFor(p, () => !document.querySelector('.tkq-chal') && __h.state().running, 4000)
  await sleep(1200)
  const tEnd = await p.evaluate(() => performance.now())
  const ft = await p.evaluate(() => window.__ft)
  const stat = (a, z) => { const d = ft.filter(x => x[0] >= a && x[0] <= z).map(x => x[1]).sort((m, n) => m - n); const q = k => d[Math.min(d.length - 1, Math.floor(d.length * k))]; return { n: d.length, p50: +q(0.5).toFixed(1), p90: +q(0.9).toFixed(1), max: +d[d.length - 1].toFixed(1), over33: d.filter(x => x > 33.4).length } }
  const lane = stat(tLane, tLane1), hit = stat(tHit, tEnd)
  console.log(`  frame trace lane change (1 s): ${JSON.stringify(lane)} ms`)
  console.log(`  frame trace collision -> card open -> answer -> close -> resume: ${JSON.stringify(hit)} ms`)
  check(lane.p90 <= 20 && lane.max <= 50, `lane change is smooth: p90 ${lane.p90} ms (<= 20), worst ${lane.max} ms (<= 50)`)
  check(hit.p90 <= 20 && hit.over33 <= 3, `collision + challenge + resume is smooth: p90 ${hit.p90} ms, ${hit.over33} frames over 33 ms (<= 3), worst ${hit.max} ms`)
  check(errs.length === 0, `frame trace no page errors (${errs.join(' | ')})`)
  await p.close()
}

// ── F. fps: densest field, CPU throttled 4x ──
for (const [w, h] of [[390, 844], [1024, 768]]) {
  const { p, errs } = await open(b, w, h, 'seed=3&diff=3&sections=dense,extreme,dense&quiz=stub')
  await p.evaluate(AUTOPILOT, false)
  await sleep(3000)
  if (process.env.QA_FAULT) await p.evaluate(() => { const f = () => { const t = performance.now(); while (performance.now() - t < 45); requestAnimationFrame(f) }; requestAnimationFrame(f) })
  const cdp = await p.createCDPSession()
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await sleep(2500)
  const f1 = await fps(p, 3000)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  const s = await st(p)
  console.log(`  ${w}x${h} dense @4x CPU: p90 ${f1} fps (render quality ${s.quality}, section ${s.section})`)
  check(f1 >= 24, `${w}x${h}: p90 frame rate >= 24 fps at 4x CPU (${f1})`)
  check(errs.length === 0, `${w}x${h}: fps run no page errors`)
  await p.close()
}

// ── H. fleet (owner 2026-09-28): Character Selection, top-view sprite, 2x controls, no overlap, timers pruned ──
{
  const FLEET = process.env.QA_FLEET_SHOTS || '/tmp/claude-1000/-home-baguspermana7/006f0cec-d381-48ee-882e-83cf434d8153/scratchpad/tk-fleet/'
  fs.mkdirSync(FLEET, { recursive: true })
  // sizes BEFORE this change (tk-lanes CSS, measured): turn 88 / 80 on a short screen, wheel (Cepat) 104 / 88
  const OLDT = (w, h) => (w > h && h < 500) ? 80 : 88
  const OLDB = (w, h) => (w > h && h < 500) ? 88 : 104
  const EMOJI = /\p{Extended_Pictographic}/u
  for (const [w, h, dpr] of [[1280, 800, 2], [1340, 800, 1], [1024, 768, 1], [800, 1280, 1], [390, 844, 1], [844, 390, 1]]) {
    const tag = `fleet ${w}x${h}`
    const p = await b.newPage(); const errs = []
    p.on('pageerror', e => errs.push(e.message))
    await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: w < 900, hasTouch: true })
    await p.goto(BASE + `?ship=pick&fresh=1&avatar=ql${w}&quiz=stub&seed=7`, { waitUntil: 'networkidle2', timeout: 60000 })
    await p.evaluate(WATCH)
    await sleep(700)
    const sel = await p.evaluate(() => ({ on: !!document.querySelector('.tkf-root'), st: __h.state(), n: document.querySelectorAll('.tkf-card').length, text: document.querySelector('.tkf-root').innerText }))
    await p.screenshot({ path: `${FLEET}lanes-select-${w}x${h}.png` })
    check(sel.on && sel.st.selecting && !sel.st.running && sel.n === 25 && !EMOJI.test(sel.text), `${tag}: no saved ship -> Character Selection first (25 cards, no emoji, game waits)`)
    await p.evaluate(() => document.querySelector('.tkf-card[data-id="cruise"]').scrollIntoView({ inline: 'center' }))
    await p.click('.tkf-card[data-id="cruise"]'); await sleep(300); await p.click('.tkf-cta'); await sleep(1500)
    const g = await p.evaluate(() => ({ s: __h.state(), saved: localStorage.getItem('tk-fleet-ql' + innerWidth) }))
    check(g.s.ship === 'cruise' && g.saved === 'cruise' && /tk-top\/cruise\.webp/.test(g.s.art || '') && g.s.artReady, `${tag}: pick -> the cruise ship sails, saved per avatar, TOP-VIEW sprite loaded (${(g.s.art || '').split('/').slice(-2).join('/')})`)
    const c = await p.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); const L = r('.tkl-left'), R = r('.tkl-right'), B = r('.tkl-boost'); return { L: [L.left, L.right, L.bottom, L.width], R: [R.left, R.right, R.bottom, R.width], B: B.width } })
    const kT = Math.min(c.L[3], c.R[3]) / OLDT(w, h), kB = c.B / OLDB(w, h), needB = (w > h && h < 500) ? 1.5 : 2
    check(kT >= 2 && kB >= needB - 0.01, `${tag}: LEFT/RIGHT ${Math.round(c.L[3])} px = ${kT.toFixed(2)}x (>= 2x of ${OLDT(w, h)}), wheel (Cepat) ${Math.round(c.B)} px = ${kB.toFixed(2)}x (>= ${needB}x of ${OLDB(w, h)})`)
    check(c.L[1] < w / 2 && c.R[0] > w / 2 && c.L[2] > h * 0.8 && c.R[2] > h * 0.8, `${tag}: LEFT bottom-left, RIGHT bottom-right`)
    await p.evaluate(AUTOPILOT)
    let overlap = 0, samples = 0
    for (let i = 0; i < 24; i++) {
      const o = await p.evaluate(() => {
        const s = __h.state(), sr = s.shipRect
        return [...document.querySelectorAll('.tkl-turn,.tkl-boost,.tkl-lever,.tkl-radar,.tkl-stat,.tkl-obj')].filter(e => e.offsetWidth && getComputedStyle(e).display !== 'none' && +getComputedStyle(e).opacity > 0.1).some(e => { const b = e.getBoundingClientRect(); return b.left < sr.right && b.right > sr.left && b.top < sr.bottom && b.bottom > sr.top })
      })
      samples++; if (o) overlap++
      if (i === 10) await p.screenshot({ path: `${FLEET}lanes-play-${w}x${h}.png` })
      await sleep(250)
    }
    check(overlap === 0, `${tag}: no control covers the ship (${overlap}/${samples} samples overlapped)`)
    const bad = await p.evaluate(() => window.__bad)
    if (w === 1280) {
      await p.evaluate(() => window.__autoStop && window.__autoStop())
      await p.click('.tkl-shipbtn'); await sleep(500)
      const sw = await p.evaluate(() => ({ on: !!document.querySelector('.tkf-root'), run: __h.state().running }))
      check(sw.on && !sw.run, `${tag}: HUD "Ganti Kapal" opens the picker and holds the run`)
      await p.click('.tkf-card[data-id="lifeboat"]'); await sleep(250); await p.click('.tkf-cta'); await sleep(900)
      const s2 = await p.evaluate(() => __h.state())
      check(s2.ship === 'lifeboat' && s2.running && /tk-top\/lifeboat/.test(s2.art), `${tag}: new pick -> restarted with the lifeboat`)
      // the timeout list stays small over a long run (fired timers remove themselves)
      await p.evaluate(AUTOPILOT); await sleep(12000)
      const tm = await p.evaluate(() => __h.state().timers)
      check(tm <= 6, `${tag}: pending timers pruned (${tm} after 12 s of play)`)
    }
    check(bad.length === 0 && errs.length === 0, `${tag}: no failure words, no page errors (${errs.join(' | ')})`)
    await p.close()
  }
}

await b.close()
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS')
process.exit(fails ? 1 : 0)
