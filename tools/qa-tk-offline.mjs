// G30 Timmy & Kapal Legendaris — offline, the way a tablet will meet it. Modelled on
// qa-gt-offline: a Range-honouring server (GitHub Pages answers media with 206; the worker
// caches only whole 200s), KILLED before the offline checks so one uncached byte is a hard
// failure rather than a quietly-served response.
//   1. online: the app installs its worker, the game page is opened ONCE and only its home
//      screen is shown (no level is played online, so runtime caching cannot mask a gap);
//      the gate waits until every file of __tk.warmList() is in a cache
//   2. kill the server, then also flip the page into offline mode
//   3. offline: the page reloads, the home screen renders, the world map opens, and the
//      first two levels of the first world are played to the reward screen; no picture is
//      broken and not one request fails.
// A failure names the files the offline pass could not get — each one is a file the page
// uses that neither sw.js SHELL nor __tk.warmList() covers.
// QA_NO_WARM=1 proves the gap the warm-up closes (failures are then the point).
// QA_WORLD=<id> picks the world whose first two levels are played (default: the first).
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
  if (range) {
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

async function tapSel (p, sel) {
  const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
  if (!r) return false
  await p.touchscreen.tap(r.x, r.y); return true
}
// Same driver as qa-tk-play (story skip, quiz/sort/grid/steer), trimmed to what the first
// world's opening levels need; a level type it cannot drive falls back to the test seam.
async function playLevel (p) {
  const t0 = Date.now()
  while (Date.now() - t0 < 90000) {
    const st = await p.evaluate(() => ({ s: __tk.state(), lv: __tk.level(), skip: !!document.querySelector('.tks-skip') }))
    if (st.s.screen === 'scr-reward') return true
    if (st.skip) { await tapSel(p, '.tks-skip'); await sleep(500); continue }
    if (!st.lv) { await sleep(300); continue }
    const type = st.lv.type
    if (type === 'quiz') {
      const q = await p.evaluate(() => { const h = __tk.handle(); return h && h.state ? h.state() : null })
      if (!q) { await sleep(300); continue }
      if (q.answered) { if (!(await tapSel(p, '.tkq-next:not([disabled])'))) await sleep(300); await sleep(450); continue }
      if (await p.evaluate(() => !!document.querySelector('.tkq-tile'))) {
        for (const ch of [...String(q.answer)]) {
          const r = await p.evaluate(c => { const t = [...document.querySelectorAll('.tkq-tile')].find(x => !x.disabled && !x.classList.contains('used') && x.textContent.trim() === c); if (!t) return null; const b = t.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, ch)
          if (r) { await p.touchscreen.tap(r.x, r.y); await sleep(250) }
        }
        await sleep(900); continue
      }
      if (!(await tapSel(p, `.tkq-ans [data-c="${String(q.answer).replace(/"/g, '\\"')}"]`))) return false
      await sleep(900); continue
    }
    if (type === 'sort') {
      const done = await p.evaluate(() => { const h = __tk.handle(); return h && h.state ? h.state().done : false })
      if (done) { await tapSel(p, '.tkq-next:not([disabled])'); await sleep(700); continue }
      const plan = await p.evaluate(() => {
        const h = __tk.handle(); const el = document.querySelector('.tkq-tray .tkq-item'); if (!el || !h.set) return null
        const set = h.set, it = set.items.filter(i => i.id === el.dataset.id)[0]; if (!it) return null
        if (it.bin !== '*') return { id: it.id, bin: it.bin }
        if (!window.__qaPlan) {
          const bins = set.bins.map(b => ({ id: b.id, left: b.cap })), items = set.items.slice().sort((a, b) => b.n - a.n), out = {}
          const go = i => { if (i === items.length) return true; for (const b of bins) if (b.left >= items[i].n) { b.left -= items[i].n; out[items[i].id] = b.id; if (go(i + 1)) return true; b.left += items[i].n } return false }
          go(0); window.__qaPlan = out
        }
        return { id: it.id, bin: window.__qaPlan[it.id] }
      })
      if (!plan) { await sleep(400); continue }
      await tapSel(p, `.tkq-tray .tkq-item[data-id="${plan.id}"]`); await sleep(200)
      await tapSel(p, `.tkq-bin[data-bin="${plan.bin}"]`); await sleep(550)
      continue
    }
    if (type === 'grid') {
      const ok = await p.evaluate(() => { const h = __tk.handle(); if (!h || !h.level || !window.TKGrid) return false; const sol = TKGrid.solve(h.level); if (!sol) return false; h.setProgram(sol.program || sol); return true })
      if (!ok) return false
      await sleep(300); await tapSel(p, '.tkg-go'); await sleep(2500)
      continue
    }
    if (type === 'steer') {
      const drove = await p.evaluate(() => { const h = __tk.handle(); if (h && h.autopilot) { h.autopilot(true); return 'auto' } if (h && h.finish) { h.finish(); return 'finish' } return null })
      if (!drove) await p.evaluate(() => __tk.finish(2))
      await sleep(1500); continue
    }
    await sleep(400)
  }
  return false
}
// every picture on screen, <img> and CSS background alike, must have loaded
const brokenArt = p => p.evaluate(async () => {
  const load = u => new Promise(res => { const i = new Image(); i.onload = () => res(i.naturalWidth > 0); i.onerror = () => res(false); i.src = u })
  const urls = new Set()
  document.querySelectorAll('img').forEach(i => { if (i.getBoundingClientRect().width > 0 && i.src && !i.src.startsWith('data:')) urls.add(i.src) })
  document.querySelectorAll('body *').forEach(e => {
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) return
    const m = (getComputedStyle(e).backgroundImage || '').match(/url\("?(.*?)"?\)/g) || []
    m.forEach(x => { const u = x.replace(/^url\("?|"?\)$/g, ''); if (!u.startsWith('data:')) urls.add(u) })
  })
  const bad = []
  for (const u of urls) if (!(await load(u))) bad.push(u.split('/').slice(-2).join('/'))
  return { n: urls.size, bad }
})

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
try {
  const page = await browser.newPage()
  if (NO_WARM) await page.evaluateOnNewDocument(() => { window.__TK_NO_WARM = true })
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  const safe = async fn => { for (let k = 0; k < 8; k++) { try { return await page.evaluate(fn) } catch (e) { if (!/context was destroyed|detached|Cannot find context/i.test(e.message)) throw e; await sleep(1500) } } }
  const ev = async fn => { await page.waitForFunction(() => window.__tk, { timeout: 30000 }).catch(() => {}); return safe(fn) }
  const nav = async url => { for (let k = 0; k < 4; k++) { try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); return } catch (e) { if (!/context was destroyed|detached|interrupted|ERR_ABORTED|timeout/i.test(e.message)) throw e; await sleep(1500) } } }
  await nav(`${BASE}/index.html`)
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, { timeout: 90000 }).catch(() => {})
  check(await safe(() => !!navigator.serviceWorker.controller), 'the app installs its service worker and takes control')
  check(await safe(() => { const t = document.getElementById('gtile-30'); return !!t && /timmy-kapal\.html/.test(t.getAttribute('onclick') || '') }), 'index map has the Timmy & Kapal tile (#gtile-30)')
  await sleep(2500)
  await nav(`${BASE}/games/timmy-kapal.html`)
  const n = await ev(() => __tk.warmList().length)
  if (!NO_WARM) {
    let left = -1, missing = []
    for (let k = 0; k < 150; k++) {
      const r = await ev(async () => { const m = []; for (const u of __tk.warmList()) if (!(await caches.match(u))) m.push(u.split('/').slice(-2).join('/')); return m })
      left = r.length; missing = r
      if (left === 0) break
      await sleep(1000)
    }
    check(left === 0, `every warm-list file is cached before going offline (${left} left of ${n}${left ? ', e.g. ' + missing.slice(0, 4).join(', ') : ''})`)
  }
  const WORLD = process.env.QA_WORLD || await ev(() => TKWorlds.WORLDS[0].id)
  await ev(() => { __tk.reset() })
  await kill()
  await page.setOfflineMode(true)
  const down = await page.evaluate(async b => { try { await fetch(b + '/index.html?probe=' + Date.now(), { cache: 'no-store' }); return false } catch (e) { return true } }, BASE)
  check(down, 'the server is really gone')

  const bad = []
  page.on('requestfailed', r => { if (!/^data:/.test(r.url())) bad.push('failed ' + r.url().replace(BASE, '')) })
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().replace(BASE, '')) })
  page.on('pageerror', e => bad.push('pageerror ' + e.message))
  await page.reload({ waitUntil: 'load', timeout: 60000 }).catch(() => {})
  const alive = await page.waitForFunction(() => window.__tk, { timeout: 30000 }).then(() => true).catch(() => false)
  check(alive, 'OFFLINE: the game page itself reloads')
  if (alive) {
    await sleep(1500)
    const home = await page.evaluate(() => __tk.state().screen)
    check(!!home, `OFFLINE: the home screen renders (${home})`)
    const artHome = await brokenArt(page)
    check(artHome.bad.length === 0, `OFFLINE: every picture on the home screen loads (${artHome.n - artHome.bad.length}/${artHome.n})${artHome.bad.length ? ' — ' + artHome.bad.slice(0, 6).join(', ') : ''}`)
    await page.evaluate(id => __tk.open(id), WORLD); await sleep(1200)
    const artMap = await brokenArt(page)
    check(artMap.bad.length === 0, `OFFLINE: every picture on the ${WORLD} world map loads (${artMap.n - artMap.bad.length}/${artMap.n})${artMap.bad.length ? ' — ' + artMap.bad.slice(0, 6).join(', ') : ''}`)
    for (let k = 0; k < 2; k++) {
      await page.evaluate((id, k) => { window.__qaPlan = null; __tk.start(id, k) }, WORLD, k)
      await sleep(900)
      const type = await page.evaluate(() => __tk.level() && __tk.level().type)
      const artLv = await brokenArt(page)
      check(artLv.bad.length === 0, `OFFLINE: ${WORLD}#${k + 1} (${type}) — every picture loads (${artLv.n - artLv.bad.length}/${artLv.n})${artLv.bad.length ? ' — ' + artLv.bad.slice(0, 6).join(', ') : ''}`)
      const ok = await playLevel(page)
      check(ok, `OFFLINE: ${WORLD}#${k + 1} (${type}) is played to the reward screen`)
      const artRw = await brokenArt(page)
      check(artRw.bad.length === 0, `OFFLINE: ${WORLD}#${k + 1} reward screen — every picture loads${artRw.bad.length ? ' — ' + artRw.bad.slice(0, 6).join(', ') : ''}`)
    }
    const uniq = [...new Set(bad)]
    check(uniq.length === 0, `OFFLINE: no failed requests / page errors${uniq.length ? ' — ' + uniq.length + ':\n      ' + uniq.slice(0, 40).join('\n      ') : ''}`)
  }
} finally {
  await browser.close()
  try { await kill() } catch (e) {}
}
console.log(`\n${passes} passed, ${fails.length} failed${NO_WARM ? '  (QA_NO_WARM: failures here are the point)' : ''}`)
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS')
process.exit(fails.length ? 1 : 0)
