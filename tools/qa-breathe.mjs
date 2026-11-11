#!/usr/bin/env node
// qa-breathe — "Napas bersama" (games/data/breathe.js), mechanic B of docs/SPEC-EMOSI-REPLACEMENT-2026-11-11.md.
//   the run: in/out cue every 4 s, the cloud is visibly bigger at the top of a breath than at its start, 3 dots,
//   the ending card after 24 s +- 1, spoken cues in id-ID; "Ayo main" closes it and sends DuniaBus calm done:true
//   closing mid-run stops everything (no ending card appears later), calm done:false
//   offered at calm moments only: after Sedih / Marah / Takut in the check-in ("Tarik napas bareng"), not after
//   Senang; on the map after the child's last 3 answers were wrong, once a day; not when they were not all wrong
//   motion: the card enters with a transform; under reduced motion it only fades
// Usage: QA_BASE=http://127.0.0.1:8097/ node tools/qa-breathe.mjs   (QA_SHOTS=dir)
import puppeteer from 'puppeteer'
const BASE = process.env.QA_BASE || 'http://localhost:8081/'
const SHOTS = process.env.QA_SHOTS || ''
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const PLAYERS = JSON.stringify([{ name: 'Kakak', animal: '🦁', stars: 0 }, { name: 'Adik', animal: '🐰', stars: 0 }])
const d = new Date(), DAY = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 140)))
await p.evaluateOnNewDocument(() => {
  window.__said = []; window.__calm = []
  try { SpeechSynthesis.prototype.speak = function (u) { window.__said.push({ text: u.text, lang: u.lang }) } } catch (e) {}
  window.addEventListener('dunia:calm', e => window.__calm.push(e.detail.done))
})
async function seed (slot, extra) {
  await p.goto(BASE + 'manifest.json')
  await p.evaluate((pl, s, ex) => { if (s === 0) localStorage.clear(); localStorage.setItem('dunia-players', pl); localStorage.setItem('dunia-active-slot', JSON.stringify([s, 1 - s])); for (const k in ex) localStorage.setItem(k, ex[k]) }, PLAYERS, slot, extra || {})
}
const page = async q => { await p.goto(BASE + 'index.html?nocine=1' + q, { waitUntil: 'load' }); await sleep(2200) }
const tap = async sel => { const h = await p.$(sel); if (!h) return false; const r = await h.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); return true }
const has = () => p.evaluate(() => !!document.getElementById('dbreath'))
const st = () => p.evaluate(() => { const c = document.querySelector('#dbreath .dbr-cue'), i = document.querySelector('#dbreath .dbr-pic'); return { phase: c && c.dataset.phase, on: document.querySelectorAll('#dbreath .dbr-dots i.on').length, w: i ? i.getBoundingClientRect().width : 0, done: (document.querySelector('#dbreath .dbr-card') || {}).dataset?.doneMs } })

// ── a full run ──
await seed(0, { 'dunia-avatar-lion-feelings': JSON.stringify({ days: { [DAY]: 'senang' } }) })
await page('&feel=1')
await p.evaluate(() => DuniaBreath.open())
const motion = await p.evaluate(() => { const c = document.querySelector('#dbreath .dbr-card'); return c.getAnimations().some(a => a.effect.getKeyframes().some(k => k.transform && k.transform !== 'none')) })
ok(motion, 'the card enters with a transform (scale/translate)')
await sleep(300); const s0 = await st()
ok(await p.evaluate(() => { const i = document.querySelector('#dbreath .dbr-pic'); return i.complete && i.naturalWidth > 0 }), 'the cloud picture loads')
await sleep(3500); const s1 = await st()
if (SHOTS) await p.screenshot({ path: `${SHOTS}/breathe-in.png` })
await sleep(1600); const s2 = await st()
await sleep(4000); const s3 = await st()
ok(s0.phase === 'in' && s1.phase === 'in' && s2.phase === 'out' && s3.phase === 'in', `cues follow in / out every 4 s (${[s0.phase, s1.phase, s2.phase, s3.phase]})`)
ok(s1.w > s0.w * 1.2, `the cloud grows on the in-breath (${Math.round(s0.w)} -> ${Math.round(s1.w)} px)`)
ok(s0.on === 1 && s3.on === 2, `one dot per round (${s0.on}, ${s3.on})`)
await sleep(16500)
const end = await st()
ok(end.done && Math.abs(+end.done - 24000) <= 1000, `the ending card arrives after 24 s +- 1 (${end.done} ms)`)
const said = await p.evaluate(() => window.__said.map(x => x.lang + ':' + x.text))
ok(said.filter(x => /id-ID:Tarik napas$/.test(x)).length === 3 && said.some(x => /Hebat/.test(x)), `cues spoken in Indonesian (${said.length} lines)`)
if (SHOTS) await p.screenshot({ path: `${SHOTS}/breathe-done.png` })
ok(await tap('#dbreath .dbr-go'), 'tap "Ayo main"'); await sleep(400)
ok(!(await has()) && (await p.evaluate(() => window.__calm.join())) === 'true', 'closes and sends calm done:true')

// ── closing mid-run ──
await p.evaluate(() => { window.__calm = []; DuniaBreath.open() }); await sleep(2000)
ok(await tap('#dbreath .dbr-x'), 'tap close mid-run'); await sleep(400)
ok(!(await has()), 'closed at once')
await sleep(23000)
ok(!(await has()) && (await p.evaluate(() => window.__calm.join())) === 'false', 'nothing comes back later; calm done:false')

// ── from the check-in ──
for (const [feel, want] of [['sedih', true], ['marah', true], ['senang', false]]) {
  await seed(0); await page('&feel=1'); await p.evaluate(() => goToMenu()); await sleep(1500)
  await tap(`#dfeel .dfeel-face[data-feel="${feel}"]`); await sleep(700)
  const btn = await p.evaluate(() => !!document.querySelector('#dfeel .dfeel-calm'))
  ok(btn === want, `${feel}: "Tarik napas bareng" ${want ? 'offered' : 'not offered'}`)
  if (feel === 'sedih') {
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/feel-sedih-calm.png` })
    await tap('#dfeel .dfeel-calm'); await sleep(600)
    ok(await has() && !(await p.evaluate(() => !!document.getElementById('dfeel'))), 'tapping it starts the breath and closes the check-in')
  }
}

// ── offered on the map after three wrong answers, once a day ──
const NOW = Date.now(), OLD = NOW - 3 * 864e5
const wrongAt = t => JSON.stringify({ v: 1, days: {}, recent: [[t - 30000, 'kuis-matematika', 'matematika', 'tambah-standard', 'a', false, 1, 900], [t - 20000, 'kuis-matematika', 'matematika', 'tambah-standard', 'b', false, 1, 900], [t - 10000, 'kuis-matematika', 'matematika', 'tambah-standard', 'c', false, 1, 900]] })
const wrong3 = wrongAt(NOW)
const mixed = JSON.stringify({ v: 1, days: {}, recent: [[NOW - 3000, 'k', 'matematika', 'x', 'a', false, 1, 1], [NOW - 2000, 'k', 'matematika', 'x', 'b', true, 1, 1], [NOW - 1000, 'k', 'matematika', 'x', 'c', false, 1, 1]] })
await seed(0, { 'dunia-avatar-lion-feelings': JSON.stringify({ days: { [DAY]: 'senang' } }), 'dunia-avatar-lion-learn-log': wrong3 })
await page(''); await p.evaluate(() => goToMenu()); await sleep(1500)
ok(!(await has()), 'automated browser without ?feel=1: never offered')
await page('&feel=1'); await p.evaluate(() => goToMenu()); await sleep(1500)
const offer = await p.evaluate(() => (document.querySelector('#dbreath h2') || {}).textContent)
ok(offer === 'Mau tarik napas dulu?', `three wrong in a row: offered on the map (${offer})`)
if (SHOTS) await p.screenshot({ path: `${SHOTS}/breathe-offer.png` })
ok(await tap('#dbreath [data-act="later"]'), 'tap "Nanti"'); await sleep(400)
await p.evaluate(() => goToMenu()); await sleep(1500)
ok(!(await has()), 'offered once a day only')
await seed(1, { 'dunia-avatar-rabbit-feelings': JSON.stringify({ days: { [DAY]: 'senang' } }), 'dunia-avatar-rabbit-learn-log': mixed })
await page('&feel=1'); await p.evaluate(() => goToMenu()); await sleep(1500)
ok(!(await has()), 'last three not all wrong: not offered')
await seed(1, { 'dunia-avatar-rabbit-feelings': JSON.stringify({ days: { [DAY]: 'senang' } }), 'dunia-avatar-rabbit-learn-log': wrongAt(OLD) })
await page('&feel=1'); await p.evaluate(() => goToMenu()); await sleep(1500)
ok(!(await has()), 'three wrong answers from days ago: not offered (the child is not stuck now)')

// ── audit 2026-11-11: double taps and leaving the map early ──
const dbl = async sel => { const h = await p.$(sel); const r = await h.boundingBox(); const x = r.x + r.width / 2, y = r.y + r.height / 2; await p.touchscreen.tap(x, y); await sleep(50); await p.touchscreen.tap(x, y) }
await p.evaluate(() => { window.__calm = []; DuniaBreath.open() }); await sleep(800)
await dbl('#dbreath .dbr-x'); await sleep(500)
ok((await p.evaluate(() => window.__calm.join())) === 'false', `double tap on close: calm sent once (${await p.evaluate(() => window.__calm.join())})`)
await p.evaluate(() => { window.__said = []; DuniaBreath.open(); DuniaBreath.open() }); await sleep(8600)
const tn = await p.evaluate(() => window.__said.filter(x => x.text === 'Tarik napas').length)
ok(tn === 2 && (await p.evaluate(() => document.querySelectorAll('#dbreath').length)) === 1, `open twice: one run, cues not doubled ("Tarik napas" x${tn} in 8.6 s, want 2)`)
await p.evaluate(() => { const x = document.querySelector('#dbreath .dbr-x'); x && x.click() }); await sleep(400)
await seed(0); await page('&feel=1'); await p.evaluate(() => goToMenu()); await sleep(1500)
const sk = await p.$('#dfeel .dfeel-skip'), sr = await sk.boundingBox()
const fc = await p.$('#dfeel .dfeel-face[data-feel="marah"]'), fr = await fc.boundingBox()
await p.touchscreen.tap(sr.x + 24, sr.y + 24); await sleep(50); await p.touchscreen.tap(fr.x + fr.width / 2, fr.y + fr.height / 2); await sleep(500)
const kept = await p.evaluate(d => JSON.parse(localStorage.getItem('dunia-avatar-lion-feelings') || '{}').days?.[d], DAY)
ok(kept === 'lewat' && !(await p.evaluate(() => !!document.getElementById('dfeel'))), `a face tapped while the card closes changes nothing (${kept})`)
await seed(0); await page('&feel=1')
await p.evaluate(() => { goToMenu(); setTimeout(() => showScreen('screen-names'), 200) }); await sleep(1500)
ok(!(await p.evaluate(() => !!document.getElementById('dfeel'))), 'map left within 700 ms: no card over the next screen')

// ── tablet and phone landscape: cards fit, buttons big, nothing overlaps ──
for (const [w, h] of [[1024, 600], [844, 390]]) {
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
  await seed(0); await page('&feel=1'); await p.evaluate(() => goToMenu()); await sleep(1500)
  const fit = async id => p.evaluate(id => {
    const c = document.querySelector('#' + id + ' [class$="card"]'); if (!c) return 'no card'
    const r = c.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight + 0.5 || r.left < 0 || r.right > innerWidth + 0.5) return 'card off screen ' + JSON.stringify([r.top, r.bottom, innerHeight])
    const bs = [...c.querySelectorAll('button')].map(b => b.getBoundingClientRect())
    if (bs.some(b => b.width < 48 || b.height < 48)) return 'button under 48 px'
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], b = bs[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) return 'buttons overlap' }
    return 'ok'
  }, id)
  const f1 = await fit('dfeel'); ok(f1 === 'ok', `${w}x${h} check-in: ${f1}`)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/feel-${w}.png` })
  await tap('#dfeel .dfeel-face[data-feel="takut"]'); await sleep(700)
  const f2 = await fit('dfeel'); ok(f2 === 'ok', `${w}x${h} check-in answer: ${f2}`)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/feel-answer-${w}.png` })
  await tap('#dfeel .dfeel-calm'); await sleep(4400)
  const f3 = await fit('dbreath'); ok(f3 === 'ok', `${w}x${h} breathing at the top of a breath: ${f3}`)
  const grown = await p.evaluate(() => { const i = document.querySelector('#dbreath .dbr-pic').getBoundingClientRect(), c = document.querySelector('#dbreath .dbr-card').getBoundingClientRect(); return i.top >= c.top && i.bottom <= c.bottom })
  ok(grown, `${w}x${h} the grown cloud stays inside the card`)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/breathe-${w}.png` })
  await p.evaluate(() => { const x = document.querySelector('#dbreath .dbr-x'); x && x.click() }); await sleep(400)
}
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })

// ── reduced motion: fade only ──
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await p.evaluate(() => DuniaBreath.open())
const rm = await p.evaluate(() => document.querySelector('#dbreath .dbr-card').getAnimations().every(a => a.effect.getKeyframes().every(k => !k.transform || k.transform === 'none')))
ok(rm, 'reduced motion: the card only fades')
ok(!errs.length, `page errors: ${errs.slice(0, 3).join(' | ')}`)
await b.close()
console.log(`qa-breathe: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
