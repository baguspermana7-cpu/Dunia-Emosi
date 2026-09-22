// The app is a PWA on a child's tablet, so "works offline" is a real promise,
// and it failed SILENTLY. sw.js precaches a SHELL list, and the cache token
// moves on every ship, so that list is touched constantly. It used to precache
// with a single cache.addAll(), which is ATOMIC, and swallow the rejection
// with .catch(() => {}) -- so one stale path precached NOTHING while the
// worker still reported a clean install, and the only symptom was a blank page
// the next time the tablet had no wifi. Measured here, then fixed in sw.js by
// caching each entry on its own.
//
// qa-film-offline proves the FILM games offline. The main app and its own game
// pages were never proven. Nothing here is asserted from theory: the HTTP
// server is KILLED before each offline check, so one uncached byte is
// ERR_CONNECTION_REFUSED rather than a quietly-served response.
//
//   1. every SHELL entry resolves on disk (a stale one used to void the lot)
//   2. the service worker installs and takes control
//   2b. the shell is ACTUALLY precached -- installing is not the same thing
//   3. with the server DEAD, index.html still loads and renders its game grid
//   4. with the server DEAD, a precached game page still loads and renders
import puppeteer from 'puppeteer'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

// ---- 1. static: the SHELL list must not name a file that is gone -----------
{
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')
  const m = sw.match(/const SHELL = \[([\s\S]*?)\n\]/)
  const entries = m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []
  const missing = entries.filter(e => {
    const p = e.replace(/^\.\//, '').split('?')[0]
    return p !== '' && p !== '/' && !fs.existsSync(path.join(ROOT, p))
  })
  check(entries.length > 0, `SHELL list found (${entries.length} entries)`)
  check(missing.length === 0, `every SHELL entry exists on disk${missing.length ? ' — MISSING: ' + missing.join(', ') : ''}`)
}

const freePort = () => new Promise(res => {
  const s = net.createServer()
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) })
})
const PORT = await freePort()
const BASE = `http://127.0.0.1:${PORT}`
let srv = null
async function serverUp() {
  if (srv) return
  srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' })
  for (let i = 0; i < 80; i++) {
    try { await fetch(BASE + '/index.html'); return } catch { await sleep(150) }
  }
  throw new Error('server did not come up')
}
async function serverDown() {
  if (!srv) return
  srv.kill('SIGKILL'); srv = null
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/index.html'); await sleep(150) } catch { return }
  }
  throw new Error('server did not go down')
}

await serverUp()
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1100, height: 720 })
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 120000 })

  // ---- 2. the worker must actually install and take control ---------------
  let controlled = true
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 60000 })
    .catch(() => { controlled = false })
  check(controlled, 'the service worker installs and takes control')

  // Installing is not the same as precaching: the old addAll() path could
  // report a clean install with an EMPTY shell cache. Count what landed.
  // sw.js broadcasts a reload from its activate handler, which destroys the
  // execution context mid-evaluate; let that settle, and retry once.
  const countCache = () => page.evaluate(async () => {
    const names = await caches.keys()
    let best = 0
    for (const n of names) {
      const k = await (await caches.open(n)).keys()
      if (k.length > best) best = k.length
    }
    return best
  })
  await sleep(4000)
  let cached = await countCache().catch(() => null)
  if (cached === null) { await sleep(3000); cached = await countCache().catch(() => 0) }
  check(cached >= 10, `the cache is populated (${cached} entries)`)

  // A COUNT cannot tell precaching from the fetch handler's runtime caching --
  // loading index.html alone fills ~140 entries either way. museum-kereta.html
  // is in SHELL and index.html never requests it, so it is precache-only and
  // discriminates. Measured on the old atomic addAll() with one stale path:
  // absent, i.e. the entire shell was silently lost while install still
  // reported success. Per-entry: present.
  const precacheOnly = await page.evaluate(async () => {
    for (const n of await caches.keys()) {
      const c = await caches.open(n)
      if (await c.match('./games/museum-kereta.html') || await c.match('/games/museum-kereta.html')) return n
    }
    return null
  }).catch(() => null)
  check(!!precacheOnly, `a precache-ONLY shell asset really was precached (${precacheOnly || 'MISSING — the shell precache silently did nothing'})`)
  if (!controlled) {
    // an install rejection is the whole point of this gate — say why
    const err = await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration()
      return r ? `installing=${!!r.installing} waiting=${!!r.waiting} active=${!!r.active}` : 'no registration'
    })
    console.log(`      registration state: ${err}`)
  }
  // give the precache time to finish before pulling the plug
  await sleep(9000)
  // visit one game page online first so the fetch handler caches it
  await page.goto(`${BASE}/games/museum-kereta.html`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await sleep(6000)

  // ---- 3 + 4. kill the server; anything uncached is now a hard failure ----
  await serverDown()

  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
  // Wait for the app to boot rather than sleeping a fixed beat: a first draft
  // of this gate measured at 3.5s, caught the page half-built, and reported a
  // defect that did not exist.
  await page.waitForFunction(() => {
    const w = document.getElementById('screen-welcome')
    return !!w && w.classList.contains('active')
  }, { timeout: 30000 }).catch(() => {})
  const home = await page.evaluate(() => ({
    welcome: !!document.querySelector('#screen-welcome.active'),
    bodyLen: (document.body && document.body.innerText || '').trim().length,
  }))
  check(home.welcome, 'OFFLINE: index.html boots to its welcome screen')
  check(home.bodyLen > 50, `OFFLINE: index.html still renders (${home.bodyLen} chars of text)`)

  // The game list is NOT on the landing screen. Two earlier drafts of this gate
  // called that an offline defect: the first asserted `.game-tile` on the
  // welcome screen, the second asserted it on the menu — but `.game-tile` does
  // not exist in this markup at all, so ONLINE scores zero too. Reach the menu
  // the way a child does and assert the game NAMES are there, which is what
  // "the list rendered" actually means.
  const WANT = ['Huruf Hutan', 'Susun Kata', 'Jejak Huruf', 'Hitung Binatang', 'Menara Memori']
  const menu = await page.evaluate(async (want) => {
    const btn = [...document.querySelectorAll('button, a, [onclick]')]
      .find(b => /pilih game/i.test(b.textContent || ''))
    if (!btn) return { reached: false, found: [], nodes: 0 }
    btn.click()
    await new Promise(r => setTimeout(r, 2200))
    const m = document.getElementById('screen-menu')
    const txt = (m && m.innerText) || ''
    return {
      reached: !!(m && m.classList.contains('active')),
      found: want.filter(w => txt.includes(w)),
      nodes: m ? m.querySelectorAll('*').length : 0,
    }
  }, WANT)
  check(menu.reached, 'OFFLINE: "Pilih Game" reaches the menu')
  check(menu.nodes > 50, `OFFLINE: the menu is populated (${menu.nodes} nodes)`)
  check(menu.found.length === WANT.length,
    `OFFLINE: the game list names every game (${menu.found.length}/${WANT.length}${menu.found.length < WANT.length ? ' — missing: ' + WANT.filter(w => !menu.found.includes(w)).join(', ') : ''})`)

  await page.goto(`${BASE}/games/museum-kereta.html`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
  await sleep(3500)
  const game = await page.evaluate(() => ({
    bodyLen: (document.body && document.body.innerText || '').trim().length,
    canvasOrCards: document.querySelectorAll('canvas, .g18-card, [class*="card"]').length,
  }))
  check(game.bodyLen > 50, `OFFLINE: a game page still renders (${game.bodyLen} chars of text)`)
  check(game.canvasOrCards > 0, `OFFLINE: the game's own content is there (${game.canvasOrCards} nodes)`)
} finally {
  await browser.close()
  try { await serverDown() } catch (_) {}
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
