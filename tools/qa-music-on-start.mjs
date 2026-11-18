#!/usr/bin/env node
// qa-music-on-start (PRD-34 L2) — music still plays once its <audio> is preload="none".
// Per case: fresh 390x844 mobile+touch page, HTMLMediaElement.prototype.play wrapped to record every call, then ONE real
// touch tap on the real start control. PASS = a music play() (the page's #game-bgm, or the hub's sfx-train-bg.mp3) was
// called <= 500 ms after the gesture event that delivered it (touchstart/pointerdown/click; the total from touchstart is printed too) AND that element has no media error 1.5 s later (the bytes really arrived).
//   ducky-volley  : tap #start-overlay           mobil : tap "Mulai!" in #ovl-start
//   lokomotif     : tap the first .tcard          hub G14: openLevelSelect-free legacy race screen: category -> train -> #g14-go-btn
//     (note: in the shipped hub initGame14() redirects to games/balapan-kereta.html, so the hub race screen is only reachable by
//      showing #screen-game14 ourselves; the case proves the lazily created g14BgAudio still plays from g14StartRace.)
// Serves the tree itself on a free port. Usage:
//   TMPDIR=$HOME/.cache/qa-tmp flock -w 1800 /tmp/claude-1000/kereta-browser.lock timeout 600 node tools/qa-music-on-start.mjs
//   QA_ONLY=regex limits the cases. Exit 1 on any failure.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sleep = ms => new Promise(r => setTimeout(r, ms))
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2' }
function serve () {
  const srv = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'
      const f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end() }
      const b = fs.readFileSync(f)
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Content-Length': b.length, 'Cache-Control': 'no-store' }); res.end(b)
    } catch (e) { res.writeHead(404); res.end('nf') }
  })
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, origin: 'http://127.0.0.1:' + srv.address().port + '/' })))
}

function instrument () {
  try {
    localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }]))
    localStorage.setItem('dunia-active-slot', '[0,1]')
  } catch (e) {}
  window.__plays = []; window.__tapT = 0
  const orig = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () {
    const rec = { t: performance.now(), id: this.id || '', src: this.getAttribute('src') || this.src || '', ok: null }
    window.__plays.push(rec)
    const pr = orig.apply(this, arguments)
    if (pr && pr.then) pr.then(() => { rec.ok = true }, e => { rec.ok = false; rec.err = String(e && e.name) })
    return pr
  }
  window.__act = []; for (const ev of ['touchstart', 'pointerdown', 'mousedown', 'click']) addEventListener(ev, () => window.__act.push(performance.now()), true)
  window.__ev = []; for (const ev of ['touchstart', 'touchend', 'click']) addEventListener(ev, e => window.__ev.push(ev + '@' + Math.round(performance.now() - (window.__tapT || 0)) + ':' + ((e.target && (e.target.id || e.target.className)) || '?')), true)
  for (const ev of ['pointerdown', 'touchstart', 'mousedown']) addEventListener(ev, () => { if (!window.__tapT) window.__tapT = performance.now() }, true)
}

async function tapSel (page, sel) {
  await page.waitForSelector(sel, { visible: true, timeout: 20000 })
  // land the tap on a settled page: 30 consecutive animation frames under 40 ms (a page still decoding its art answers a tap late
  // for reasons that are not music's)
  await page.evaluate(() => new Promise(res => { let n = 0, last = performance.now(); const t0 = last; const f = t => { n = (t - last < 40) ? n + 1 : 0; last = t; if (n >= 30 || t - t0 > 15000) res(); else requestAnimationFrame(f) }; requestAnimationFrame(f) }))
  await page.evaluate(() => { window.__tapT = 0 })   // the tap that counts is the LAST one (multi-step cases)
  const h = await page.$(sel); await h.evaluate(e => e.scrollIntoView({ block: 'center' }))
  const b = await h.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
}

const CASES = [
  { name: 'ducky-volley', url: 'games/ducky-volley.html', music: p => p.id === 'game-bgm',
    run: async page => { await page.waitForFunction(() => typeof startGame === 'function' && document.getElementById('game-bgm'), { timeout: 20000 }); await sleep(2500); await tapSel(page, '#start-overlay') } },
  { name: 'mobil', url: 'games/mobil.html', music: p => p.id === 'game-bgm',
    run: async page => { await page.waitForFunction(() => document.querySelectorAll('#v-grid *').length > 0 && typeof startFromSelect === 'function', { timeout: 20000 }); await sleep(3000); await tapSel(page, '#ovl-start .ovl-btn') } },
  { name: 'lokomotif-pemberani', url: 'games/lokomotif-pemberani.html', music: p => p.id === 'game-bgm',
    run: async page => { await page.waitForSelector('.tcard', { timeout: 20000 }); await sleep(800); await tapSel(page, '.tcard') } },
  { name: 'hub-g14', url: 'index.html', music: p => /sfx-train-bg/.test(p.src),
    run: async page => {
      await page.waitForFunction(() => typeof g14RenderTrainSelect === 'function' && typeof showScreen === 'function', { timeout: 20000 })
      await page.evaluate(() => { showScreen('screen-game14'); g14RenderTrainSelect() })
      await sleep(400)
      await page.evaluate(() => { const o = document.getElementById('g14-start-overlay'); if (o) o.style.display = 'flex' })
      await tapSel(page, '#g14-train-select .g14-train-select-btn')   // a category
      await sleep(300)
      await tapSel(page, '#g14-train-select .g14-train-select-btn:nth-of-type(2)')   // first train (0 is the back button)
      await sleep(300)
      await page.evaluate(() => { const w = document.getElementById('g14-go-btn-wrap'); if (w) w.style.display = 'block' })
      await tapSel(page, '#g14-go-btn')
    } }
]

const only = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null
const { srv, origin } = await serve()
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--mute-audio'] })
let fails = 0
try {
  for (const c of CASES) {
    if (only && !only.test(c.name)) continue
    const page = await browser.newPage()
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.evaluateOnNewDocument(instrument)
    const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160)))
    let verdict, line
    try {
      await page.goto(origin + c.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await c.run(page)
      await sleep(1500)
      const r = await page.evaluate(() => ({ tap: window.__tapT, plays: window.__plays, act: window.__act, ev: window.__ev, errs: Array.from(document.querySelectorAll('audio')).filter(a => a.error).map(a => a.id + ':' + a.error.code) }))
      const hit = r.plays.filter(p => c.music(p) && r.tap && p.t >= r.tap - 5).sort((a, b) => a.t - b.t)[0]
      // dt = play() minus the gesture event that delivered it (the latest touchstart/pointerdown/mousedown/click before the call):
      // puppeteer's synthetic tap takes ~600 ms between touchstart and click on a mobile page, which is the harness, not the page
      const gest = hit ? Math.max(...r.act.filter(a => a <= hit.t + 1), r.tap) : 0
      const dt = hit ? Math.round(hit.t - gest) : null
      const total = hit ? Math.round(hit.t - r.tap) : null
      const ok = !!hit && dt <= 500 && !r.errs.length
      verdict = ok ? 'PASS' : 'FAIL'
      line = `${verdict} ${c.name}: tap=${r.tap ? 'yes' : 'NO'} music play() ${hit ? dt + ' ms after the gesture event, ' + total + ' ms after touchstart (' + (hit.ok === false ? 'rejected ' + hit.err : 'ok') + ')' : 'NEVER CALLED'} audio errors=${r.errs.length}${errs.length ? ' pageerrors=' + errs.length + ' [' + errs[0] + ']' : ''}; all plays=${r.plays.length}${process.env.QA_DEBUG ? ' ev=' + r.ev.join(' ') : ''}`
    } catch (e) { verdict = 'FAIL'; line = `FAIL ${c.name}: ${String(e.message).split('\n')[0]}` }
    if (verdict !== 'PASS') fails++
    console.log(line)
    await page.close()
  }
} finally { await browser.close(); srv.close() }
console.log(fails ? `music-on-start: ${fails} FAILED` : 'music-on-start: ALL PASS')
process.exit(fails ? 1 : 0)
