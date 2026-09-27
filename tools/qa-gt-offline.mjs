// G29 Garasi Tempur — offline, the way a tablet will meet it. Same Range-honouring server
// as qa-sd-offline / qa-g27-offline (GitHub Pages answers media with 206; the worker caches
// only whole 200s), killed before the offline checks so an uncached byte is a hard failure.
//   1. online: the app installs its worker, the game is opened once (idle warm-up runs,
//      and the gate waits until every file of __gt.warmList() is in a cache)
//   2. kill the server, then also flip the page into offline mode
//   3. offline: the page reloads, the home screen renders (hero truck drawn), a battle
//      starts, the arena background and every truck sprite on the table load
//      (naturalWidth > 0), and not one request fails.
// QA_NO_WARM=1 proves the gap the warm-up closes (failures are then the point).
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
  if (NO_WARM) await page.evaluateOnNewDocument(() => { window.__GT_NO_WARM = true })
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  // sw-reload.js reloads a page once when a fresh worker takes over: every evaluate before
  // the plug is pulled retries through that navigation instead of crashing the gate
  const safe = async fn => { for (let k = 0; k < 8; k++) { try { return await page.evaluate(fn) } catch (e) { if (!/context was destroyed|detached|Cannot find context/i.test(e.message)) throw e; await sleep(1500) } } }
  const ev = async fn => { await page.waitForFunction(() => window.__gt, { timeout: 30000 }).catch(() => {}); return safe(fn) }
  const nav = async url => { for (let k = 0; k < 4; k++) { try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); return } catch (e) { if (!/context was destroyed|detached|interrupted|ERR_ABORTED|timeout/i.test(e.message)) throw e; await sleep(1500) } } }
  await nav(`${BASE}/index.html`)
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, { timeout: 90000 }).catch(() => {})
  check(await safe(() => !!navigator.serviceWorker.controller), 'the app installs its service worker and takes control')
  // the map tile launches the game (and is where a child starts from)
  check(await safe(() => { const t = document.getElementById('gtile-29'); return !!t && /garasi-tempur\.html/.test(t.getAttribute('onclick') || '') }), 'index map has the Garasi Tempur tile (#gtile-29)')
  await sleep(2500)                               // let a sw-reload of index.html finish first
  await nav(`${BASE}/games/garasi-tempur.html`)
  const n = await ev(() => __gt.warmList().length)
  if (!NO_WARM) {
    for (let k = 0; k < 30 && !(await ev(() => __gt.warmed())); k++) await sleep(1000)
    // wait for the CONDITION (every file cached), not a guessed duration
    let left = -1
    for (let k = 0; k < 150; k++) {
      left = await ev(async () => { let m = 0; for (const u of __gt.warmList()) if (!(await caches.match(u))) m++; return m })
      if (left === 0) break
      await sleep(1000)
    }
    check(left === 0, `every warm-list file is cached before going offline (${left} left of ${n})`)
  }
  check(NO_WARM || await ev(() => __gt.warmed()), `the warm-up ran while online (${n} files)`)
  // a battle started once online so the resumable save does not hide a home-screen gap
  await ev(() => { __gt.reset(); __gt.setTut(true) })
  await kill()
  await page.setOfflineMode(true)
  const down = await page.evaluate(async b => { try { await fetch(b + '/index.html?probe=' + Date.now(), { cache: 'no-store' }); return false } catch (e) { return true } }, BASE)
  check(down, 'the server is really gone')

  const bad = []
  page.on('requestfailed', r => bad.push('failed ' + r.url().replace(BASE, '') + ' ' + ((r.failure() || {}).errorText || '')))
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().replace(BASE, '')) })
  page.on('pageerror', e => bad.push('pageerror ' + e.message))
  await page.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {})
  const alive = await page.waitForFunction(() => window.__gt, { timeout: 30000 }).then(() => true).catch(() => false)
  check(alive, 'OFFLINE: the game page itself reloads')
  if (alive) {
    await sleep(1200)
    const home = await page.evaluate(() => {
      const h = document.getElementById('home-hero')
      return { scr: __gt.state().screen, hero: !!h && h.complete && h.naturalWidth > 0,
        btns: ['btn-adv', 'btn-practice', 'btn-pvp', 'btn-col'].every(id => document.getElementById(id).getBoundingClientRect().height > 0) }
    })
    check(home.scr === 'scr-home' && home.btns, `OFFLINE: home renders with its menu (${home.scr})`)
    check(home.hero, 'OFFLINE: the home hero truck is drawn')
    // start a battle with the real buttons
    const tapSel = async sel => { const r = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel); if (r) { await page.touchscreen.tap(r.x, r.y); await sleep(250) } return !!r }
    await tapSel('#btn-practice'); await tapSel('#team-list .team[data-k="api"]')
    await page.waitForFunction(() => __gt.state().screen === 'scr-battle', { timeout: 10000 }).catch(() => {})
    check((await page.evaluate(() => __gt.state().screen)) === 'scr-battle', 'OFFLINE: a battle starts')
    // let the first turn play out enough for trucks to reach the table
    for (let k = 0; k < 40; k++) { if (await page.evaluate(() => document.querySelectorAll('#side-op .field-card img').length > 0 && !__gt.busy())) break; await sleep(250) }
    await sleep(800)
    const art = await page.evaluate(async () => {
      const bgs = [...document.querySelectorAll('#bt-scene .px-img')].map(e => (getComputedStyle(e).backgroundImage.match(/url\("?(.*?)"?\)/) || [])[1]).filter(Boolean)
      const load = u => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = u })
      const bg = bgs.length ? await load(bgs[0]) : false
      const imgs = [...document.querySelectorAll('#scr-battle img')].filter(i => i.getBoundingClientRect().width > 0)
      for (const i of imgs) if (!i.complete) await new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 3000) })
      const trucks = imgs.filter(i => /gt-truck\//.test(i.src))
      return { bg, bgUrl: bgs[0] || '', trucks: trucks.length, trucksOk: trucks.filter(i => i.naturalWidth > 0).length,
        broken: imgs.filter(i => !(i.naturalWidth > 0)).map(i => i.src.split('/').slice(-2).join('/')) }
    })
    check(art.bg, `OFFLINE: the arena background loads (${art.bgUrl.split('/').pop()})`)
    check(art.trucks > 0 && art.trucksOk === art.trucks, `OFFLINE: every truck sprite on the table loads (${art.trucksOk}/${art.trucks})`)
    check(art.broken.length === 0, `OFFLINE: no broken picture in the battle${art.broken.length ? ' — ' + art.broken.slice(0, 5).join(', ') : ''}`)
    // every file the game can ask for later is served offline
    const miss = await page.evaluate(async () => { const out = []; for (const u of __gt.warmList()) { try { const r = await fetch(u); if (!r.ok) out.push(u) } catch (e) { out.push(u.split('/').slice(-2).join('/')) } } return out })
    check(miss.length === 0, `OFFLINE: every truck sprite, arena, monster and FX frame is served${miss.length ? ' — ' + miss.length + ' missing, e.g. ' + miss.slice(0, 4).join(', ') : ''}`)
    check(bad.length === 0, `OFFLINE: no failed requests / page errors${bad.length ? ' — ' + bad.length + ', e.g. ' + [...new Set(bad)].slice(0, 5).join(' | ') : ''}`)
  }
} finally {
  await browser.close()
  try { await kill() } catch (e) {}
}
console.log(`\n${passes} passed, ${fails.length} failed${NO_WARM ? '  (QA_NO_WARM: failures here are the point)' : ''}`)
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS')
process.exit(fails.length ? 1 : 0)
