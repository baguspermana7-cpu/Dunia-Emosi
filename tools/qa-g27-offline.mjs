// G27 Spelling Adventure — offline, the way a tablet will really meet it.
//
// WHY A CUSTOM SERVER. An <audio> element fetches with a Range header, and a
// real host (GitHub Pages) answers 206 Partial Content. The service worker
// only caches whole 200 responses, so a clip that was only PLAYED online is
// never cached and the spelling voice goes silent offline. `python -m
// http.server` ignores Range and always sends 200, so a test on it passes
// while production fails. This server honours Range exactly as a real host
// does, and it is KILLED before the offline checks, so one uncached byte is a
// hard failure rather than a quietly-served response.
//
//   1. online: open the app, let the worker take control, open G27 once
//   2. kill the server
//   3. offline: G27 reloads, the self-hosted font is in use, a word that was
//      NEVER opened online still shows its picture, its clip and every letter
//      clip play, and the word can be spelled to the celebration.
// Run with QA_NO_WARM=1 to prove the gap this closes (the clips then fail).
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

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})
try {
  const page = await browser.newPage()
  if (NO_WARM) await page.evaluateOnNewDocument(() => { window.__G27_NO_WARM = true })
  await page.setViewport({ width: 1024, height: 768 })
  // 1. online: the app registers the worker
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, { timeout: 90000 }).catch(() => {})
  check(await page.evaluate(() => !!navigator.serviceWorker.controller), 'the app installs its service worker and takes control')
  await page.goto(`${BASE}/games/ejaan-inggris.html`, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction(() => window.__g27, { timeout: 30000 })
  // a child plays ONE word online (blue): its clips are PLAYED, i.e. Range-fetched
  await page.evaluate(() => { document.getElementById('btn-play').click(); window.__g27.startWord('blue') })
  await sleep(3500)
  if (!NO_WARM) {
    await page.waitForFunction(() => window.__g27.warmed(), { timeout: 30000 }).catch(() => {})
    await sleep(6000)                           // let the idle warm-up finish
  }
  check(NO_WARM || await page.evaluate(() => window.__g27.warmed()), 'the clip and picture warm-up ran while online')

  // 2. pull the plug
  await kill()
  const down = await page.evaluate(async b => { try { await fetch(b + '/index.html?probe=' + Date.now(), { cache: 'no-store' }); return false } catch (e) { return true } }, BASE)
  check(down, 'the server is really gone (a fresh request fails)')

  // 3. offline
  await page.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {})
  const alive = await page.waitForFunction(() => window.__g27, { timeout: 30000 }).then(() => true).catch(() => false)
  check(alive, 'OFFLINE: the game page itself reloads')
  if (alive) {
    await page.evaluate(() => document.fonts.ready)
    check(await page.evaluate(() => document.fonts.check('24px "Fredoka One"') && [...document.fonts].some(f => /Fredoka/.test(f.family) && f.status === 'loaded')),
      'OFFLINE: the self-hosted Fredoka One is in use')
    // a word NEVER opened online
    await page.evaluate(() => { window.__g27.closeAll(); window.__g27.startWord('computer') }); await sleep(1500)
    check(await page.evaluate(() => { const i = document.getElementById('word-pic'); return i.complete && i.naturalWidth > 0 }),
      'OFFLINE: a word never opened online still shows its picture')
    // every clip must be playable the way the <audio> element asks for it: WITH a Range header
    const audio = await page.evaluate(async () => {
      const want = ['words/computer', 'words/blue'].concat('computer'.split('').map(c => 'letters/' + c))
      const bad = []
      for (const k of want) {
        const u = window.__g27.audioURL(k.split('/')[0], k.split('/')[1])
        try { const r = await fetch(u, { headers: { Range: 'bytes=0-' } }); if (!r.ok) bad.push(k + ' ' + r.status) } catch (e) { bad.push(k + ' failed') }
      }
      // and a real media element actually decodes one
      const decoded = await new Promise(res => {
        const a = new Audio(window.__g27.audioURL('words', 'computer'))
        a.oncanplaythrough = () => res(true); a.onerror = () => res(false); a.load(); setTimeout(() => res(false), 8000)
      })
      return { bad, decoded }
    })
    check(audio.bad.length === 0, `OFFLINE: the word clip and all its letter clips are served to a Range request${audio.bad.length ? ' — ' + audio.bad.join(', ') : ''}`)
    check(audio.decoded, 'OFFLINE: an <audio> element really decodes a clip')
    const won = await page.evaluate(async () => { window.__g27.solve(); await new Promise(r => setTimeout(r, 900)); return document.getElementById('ov-ok').classList.contains('show') })
    check(won, 'OFFLINE: the word can be spelled to the celebration')
  }
} finally {
  await browser.close()
  try { await kill() } catch (e) {}
}
console.log(`\n${passes} passed, ${fails.length} failed${NO_WARM ? '  (QA_NO_WARM: failures here are the point)' : ''}`)
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS')
process.exit(fails.length ? 1 : 0)
