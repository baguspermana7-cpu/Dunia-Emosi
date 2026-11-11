#!/usr/bin/env node
// qa-freeze-card — the freeze recovery card speaks to a child who cannot read: a picture, one big round replay
// button with its own icon, and a spoken line (id-ID) unless the app's sound is off. On a game page and on index.
// Kills the frame chain the way tools/qa-freeze-recovery.mjs does, then reads the card.
// Built 2026-11-11 (docs/PRODUCT-ASSESSMENT-2026-11-10.md idea #2). QA_SHOTS=dir saves a screenshot per page.
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-freeze-card.mjs
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const SHOTS = process.env.QA_SHOTS || ''
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

async function card (path, soundOff, w, h) {
  const p = await b.newPage()
  const cdp = await p.createCDPSession(); await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  await p.setViewport({ width: w, height: h, isMobile: w < 900, hasTouch: w < 900 })
  await p.evaluateOnNewDocument(off => {
    if (off) localStorage.setItem('dunia-emosi-sound', 'off'); else localStorage.removeItem('dunia-emosi-sound')
    window.__said = []
    try { SpeechSynthesis.prototype.speak = function (u) { window.__said.push({ text: u.text, lang: u.lang }) } } catch (e) {}
  }, soundOff)
  await p.goto(`${BASE}/${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await sleep(11000)                                                   // armed 8 s after load
  await p.evaluate(() => { window.requestAnimationFrame = function () { return 0 } })
  await p.waitForSelector('#__freezeRecover', { timeout: 25000 }).catch(() => {})
  await sleep(1200)
  const r = await p.evaluate(() => {
    const d = document.getElementById('__freezeRecover'); if (!d) return null
    const pic = document.getElementById('__freezePic'), go = d.querySelector('.__freezeGo')
    const gb = go && go.getBoundingClientRect()
    return { pic: !!pic && pic.complete && pic.naturalWidth > 0, go: !!go, svg: !!(go && go.querySelector('svg')), size: gb ? Math.min(gb.width, gb.height) : 0,
      inView: !!gb && gb.top >= 0 && gb.bottom <= innerHeight && gb.left >= 0 && gb.right <= innerWidth, label: go ? go.textContent.trim() : '', said: window.__said }
  })
  if (SHOTS && r) await p.screenshot({ path: `${SHOTS}/freeze-card-${path.replace(/\W+/g, '-')}-${w}.png` })
  await p.close()
  return r
}
for (const [path, w, h] of [['games/pokemon-birds.html', 390, 844], ['index.html', 1280, 800]]) {
  const r = await card(path, false, w, h)
  ok(!!r, `${path}: recovery card shown`)
  if (!r) continue
  ok(r.pic, `${path}: the card has a picture that loaded`)
  ok(r.go && r.svg && r.label === 'Main Lagi', `${path}: one round replay button with its own icon (${r.label})`)
  ok(r.size >= 96 && r.inView, `${path}: the button is big (>= 96 px, ${Math.round(r.size)}) and fully on screen`)
  ok(r.said.length === 1 && r.said[0].lang === 'id-ID' && /main lagi/i.test(r.said[0].text), `${path}: the card speaks once in Indonesian (${JSON.stringify(r.said)})`)
}
const q = await card('games/pokemon-birds.html', true, 390, 844)
ok(q && q.said.length === 0, `sound off: the card stays silent (${q && JSON.stringify(q.said)})`)
await b.close()
console.log(`qa-freeze-card: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
