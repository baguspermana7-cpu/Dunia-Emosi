#!/usr/bin/env node
// qa-feeling-checkin — "Hari ini kamu merasa apa?" once a day per child when the map opens, from real taps.
//   card: 5 faces whose pictures load, big enough (>= 88 px), a skip button >= 48 px, the question spoken in id-ID
//   a pick names the feeling back by voice, is stored for THIS child, goes out on DuniaBus, "Ayo main" closes it
//   not asked twice in a day; a sibling is asked separately; skip closes and counts as answered
//   an automated browser without ?feel=1 is never blocked by the card (the other gates drive the map)
//   the parent dashboard shows the week's feelings; no page errors; screenshots
// Built 2026-11-11, mechanic A of docs/SPEC-EMOSI-REPLACEMENT-2026-11-11.md.
// Usage: QA_BASE=http://127.0.0.1:8097/ node tools/qa-feeling-checkin.mjs   (QA_SHOTS=dir)
import puppeteer from 'puppeteer'
const BASE = process.env.QA_BASE || 'http://localhost:8081/'
const SHOTS = process.env.QA_SHOTS || ''
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const PLAYERS = JSON.stringify([{ name: 'Kakak', animal: '🦁', stars: 0 }, { name: 'Adik', animal: '🐰', stars: 0 }])
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const p = await b.newPage()
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 140)))
await p.evaluateOnNewDocument(() => {
  window.__said = []; window.__bus = []
  try { SpeechSynthesis.prototype.speak = function (u) { window.__said.push({ text: u.text, lang: u.lang }) } } catch (e) {}
  window.addEventListener('dunia:feeling', e => window.__bus.push(e.detail.feeling))
})
async function seed (slot, clear) {
  await p.goto(BASE + 'manifest.json')
  await p.evaluate((pl, s, c) => { if (c) localStorage.clear(); localStorage.setItem('dunia-players', pl); localStorage.setItem('dunia-active-slot', JSON.stringify([s, 1 - s])) }, PLAYERS, slot, clear)
}
async function menu (q, w = 390, h = 844) {
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 900, hasTouch: w < 900 })
  await p.goto(BASE + 'index.html?nocine=1' + q, { waitUntil: 'load' }); await sleep(2200)
  await p.evaluate(() => goToMenu()); await sleep(1500)
}
const shown = () => p.evaluate(() => !!document.getElementById('dfeel'))
const tap = async sel => { const h = await p.$(sel); if (!h) return false; const r = await h.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); return true }

// automated browser, no ?feel=1: never blocked
await seed(0, true); await menu('')
ok(!(await shown()), 'an automated browser without ?feel=1 is not shown the card')

for (const [w, h] of [[390, 844], [1280, 800]]) {
  await seed(0, true); await menu('&feel=1', w, h)
  ok(await shown(), `${w}: the card opens on the map`)
  const c = await p.evaluate(() => {
    const faces = [...document.querySelectorAll('#dfeel .dfeel-face')], skip = document.querySelector('#dfeel .dfeel-skip').getBoundingClientRect()
    return { n: faces.length, ids: faces.map(f => f.dataset.feel), loaded: faces.every(f => { const i = f.querySelector('img'); return i.complete && i.naturalWidth > 0 }),
      minW: Math.min(...faces.map(f => f.getBoundingClientRect().width)), inView: faces.every(f => { const r = f.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth }),
      skip: Math.min(skip.width, skip.height), said: window.__said.slice(),
      // the question must not run under the skip button (caught at 390 px in the first screenshot)
      clash: (() => { const h = document.querySelector('#dfeel h2'), rg = document.createRange(); rg.selectNodeContents(h); return [...rg.getClientRects()].some(t => t.right > skip.left && t.left < skip.right && t.bottom > skip.top && t.top < skip.bottom) })() }
  })
  ok(c.n === 5 && c.ids.join() === 'senang,sedih,marah,takut,capek', `${w}: five faces (${c.ids})`)
  ok(c.loaded, `${w}: every face picture loads`)
  ok(c.minW >= 88 && c.inView, `${w}: faces >= 88 px wide and all on screen (${Math.round(c.minW)})`)
  ok(c.skip >= 48, `${w}: skip button >= 48 px (${c.skip})`)
  ok(!c.clash, `${w}: the question text does not run under the skip button`)
  ok(c.said.length === 1 && c.said[0].lang === 'id-ID' && /merasa apa/.test(c.said[0].text), `${w}: the question is spoken in Indonesian (${JSON.stringify(c.said)})`)
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/feel-ask-${w}.png` })
}
// pick "sedih" by a real tap (still at 1280 from the loop)
ok(await tap('#dfeel .dfeel-face[data-feel="sedih"]'), 'tap the sad face'); await sleep(600)
let r = await p.evaluate(() => ({ line: (document.querySelector('#dfeel .dfeel-line') || {}).textContent, said: window.__said.slice(-1)[0], bus: window.__bus.slice(),
  stored: JSON.parse(localStorage.getItem('dunia-avatar-lion-feelings') || 'null') }))
const today = Object.keys((r.stored || {}).days || {})[0]
ok(/Kamu sedih/.test(r.line) && r.said && /Kamu sedih/.test(r.said.text), `the pick is named back on screen and by voice (${r.line})`)
ok(r.stored && r.stored.days[today] === 'sedih', `stored for this child (${JSON.stringify(r.stored)})`)
ok(r.bus.join() === 'sedih', `sent on DuniaBus (${r.bus})`)
if (SHOTS) await p.screenshot({ path: `${SHOTS}/feel-picked-1280.png` })
ok(await tap('#dfeel .dfeel-go'), 'tap "Ayo main"'); await sleep(400)
ok(!(await shown()), '"Ayo main" closes the card')
await p.evaluate(() => goToMenu()); await sleep(1500)
ok(!(await shown()), 'not asked twice the same day')
// dashboard shows the week
await p.evaluate(() => showDashboard()); await sleep(600)
const dash = await p.evaluate(() => { const e = document.querySelector('#dash-learn .dash-feel'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null })
ok(dash && /Perasaan minggu ini/.test(dash) && /Sedih 1/.test(dash), `dashboard shows the week's feelings (${dash})`)
// sibling is asked separately, and skip works
await seed(1, false); await menu('&feel=1')
ok(await shown(), 'the sibling is asked separately')
ok(await tap('#dfeel .dfeel-skip'), 'tap skip'); await sleep(400)
r = await p.evaluate(() => JSON.parse(localStorage.getItem('dunia-avatar-rabbit-feelings') || 'null'))
ok(!(await shown()) && r && Object.values(r.days)[0] === 'lewat', `skip closes and counts as answered (${JSON.stringify(r)})`)
await p.evaluate(() => goToMenu()); await sleep(1500)
ok(!(await shown()), 'a skipped day is not asked again')
ok(!errs.length, `page errors: ${errs.slice(0, 3).join(' | ')}`)
await b.close()
console.log(`qa-feeling-checkin: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
