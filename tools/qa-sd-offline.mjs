// G28 Stinky & Dirty — offline, the way a tablet will meet it. Same Range-honouring
// server as qa-g27-offline (GitHub Pages answers audio with 206; the worker caches only
// whole 200s), killed before the offline checks so an uncached byte is a hard failure.
//   1. online: the app installs its worker, the game is opened once (idle warm-up runs)
//   2. kill the server
//   3. offline: the page reloads, every picture/background/clip the cards use is served,
//      a card NEVER opened online draws all its pictures and can be finished.
// QA_NO_WARM=1 proves the gap the warm-up closes.
import puppeteer from 'puppeteer'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const NO_WARM = !!process.env.QA_NO_WARM
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
let passes = 0
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (ok) passes++; else fails.push(msg) }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.webm': 'audio/webm', '.mp3': 'audio/mpeg', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' }
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'
  const file = path.join(ROOT, p)
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('nf'); return }
  const buf = fs.readFileSync(file)
  const type = MIME[path.extname(file)] || 'application/octet-stream'
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range)
  if (range) {                                   // what GitHub Pages does
    const start = range[1] ? +range[1] : 0
    const end = range[2] ? Math.min(+range[2], buf.length - 1) : buf.length - 1
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${buf.length}`,
      'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 })
    res.end(buf.subarray(start, end + 1)); return
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': buf.length, 'Accept-Ranges': 'bytes' })
  res.end(buf)
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const BASE = `http://127.0.0.1:${server.address().port}`
const sockets = new Set(); server.on('connection', s => { sockets.add(s); s.on('close', () => sockets.delete(s)) })
const kill = () => new Promise(r => { for (const s of sockets) s.destroy(); server.close(() => r()) })

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
try {
  const page = await browser.newPage()
  if (NO_WARM) await page.evaluateOnNewDocument(() => { window.__SD_NO_WARM = true })
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  // sw-reload.js reloads a page once when a fresh worker takes over: every evaluate before
  // the plug is pulled retries through that navigation instead of crashing the gate
  const safe = async fn => { for (let k = 0; k < 8; k++) { try { return await page.evaluate(fn) } catch (e) { if (!/context was destroyed|detached|Cannot find context/i.test(e.message)) throw e; await sleep(1500) } } }
  const ev = async fn => { await page.waitForFunction(() => window.__sd, { timeout: 30000 }).catch(() => {}); return safe(fn) }
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, { timeout: 90000 }).catch(() => {})
  check(await safe(() => !!navigator.serviceWorker.controller), 'the app installs its service worker and takes control')
  await sleep(2500)                               // let a sw-reload of index.html finish first
  for (let k = 0; k < 4; k++) { try { await page.goto(`${BASE}/games/stinky-dirty.html`, { waitUntil: 'load', timeout: 120000 }); break } catch (e) { if (!/context was destroyed|detached|interrupted|ERR_ABORTED/i.test(e.message)) throw e; await sleep(1500) } }
  // sw-reload.js reloads the page once when a fresh worker takes over: retry through it
  const ev0 = async fn => { for (let k = 0; k < 6; k++) { try { await page.waitForFunction(() => window.__sd, { timeout: 30000 }); return await page.evaluate(fn) } catch (e) { if (!/context was destroyed|detached/i.test(e.message)) throw e; await sleep(1500) } } }
  const n = await ev(() => __sd.warmList().length)
  if (!NO_WARM) {
    for (let k = 0; k < 30 && !(await ev(() => __sd.warmed())); k++) await sleep(1000)
    // wait for the CONDITION (every file cached), not a guessed duration: on a loaded
    // machine the idle warm-up takes longer, and a fixed sleep made this gate flaky
    for (let k = 0; k < 90; k++) {
      const left = await ev(async () => { let m = 0; for (const u of __sd.warmList()) if (!(await caches.match(u))) m++; return m })
      if (left === 0) break
      await sleep(1000)
    }
  }
  check(NO_WARM || await ev(() => __sd.warmed()), `the warm-up ran while online (${n} files)`)
  await kill()
  const down = await page.evaluate(async b => { try { await fetch(b + '/index.html?probe=' + Date.now(), { cache: 'no-store' }); return false } catch (e) { return true } }, BASE)
  check(down, 'the server is really gone')
  await page.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {})
  const alive = await page.waitForFunction(() => window.__sd, { timeout: 30000 }).then(() => true).catch(() => false)
  check(alive, 'OFFLINE: the game page itself reloads')
  if (alive) {
    await page.evaluate(() => { __sd.set('rm', true) })
    // every file the cards need is served offline (the page asks for exactly these)
    const miss = await page.evaluate(async () => { const bad = []; for (const u of __sd.warmList()) { try { const r = await fetch(u); if (!r.ok) bad.push(u) } catch (e) { bad.push(u.split('/').slice(-2).join('/')) } } return bad })
    check(miss.length === 0, `OFFLINE: every card picture, background and narration clip is served${miss.length ? ' — ' + miss.length + ' missing, e.g. ' + miss.slice(0, 4).join(', ') : ''}`)
    // a card NEVER opened online plays to the end with all its pictures drawn
    await page.evaluate(() => __sd.playOnly('OBS-04'))
    await page.waitForFunction(() => __sd.state().locked === false, { timeout: 30000 }).catch(() => {})
    const imgs = await page.evaluate(() => [...document.querySelectorAll('#stage img, #answers img')].map(i => i.complete && i.naturalWidth > 0))
    check(imgs.length > 0 && imgs.every(Boolean), `OFFLINE: a card never opened online draws all ${imgs.length} of its pictures`)
    await page.evaluate(() => { document.querySelector('#answers .opt[data-i="1"]').click(); document.getElementById('btn-check').click() })
    await sleep(300)
    check(await page.evaluate(() => !document.getElementById('btn-next').classList.contains('hide')), 'OFFLINE: the card can be answered to the end')
  }
} finally {
  await browser.close()
  try { await kill() } catch (e) {}
}
console.log(`\n${passes} passed, ${fails.length} failed${NO_WARM ? '  (QA_NO_WARM: failures here are the point)' : ''}`)
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS')
process.exit(fails.length ? 1 : 0)
