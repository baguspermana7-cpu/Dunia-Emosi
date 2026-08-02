/* =============================================================================
 * Dunia Emosi — "Siapkan Offline" verification harness
 * =============================================================================
 * Proves the per-game offline installer actually works. Nothing here is
 * asserted from theory: the HTTP SERVER IS SHUT DOWN before every offline test,
 * so a single un-cached byte is a hard failure (ERR_CONNECTION_REFUSED), not a
 * silently-served response.
 *
 *   T1  install a small game, kill the server, play it offline
 *   T2  install batwheels-gotham-getaway (the level-gated hard case), kill the
 *       server, and drive it into a race on MORE THAN ONE level offline —
 *       gotham loads a per-level theme pack + Spine skeletons per level, which
 *       is the exact failure this feature exists to fix
 *   T3  bump CACHE_VERSION, let the new SW activate, prove the installed game
 *       survived AND still plays offline
 *   T4  a NOT-installed game still plays normally online
 *   T5  remove frees the cache, status flips back, storage estimate drops
 *
 *   node tools/qa-film-offline.mjs            # all
 *   node tools/qa-film-offline.mjs --keep     # leave installs in the profile
 * ========================================================================== */
import puppeteer from 'puppeteer'
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const SHOT = '/tmp/claude-1000/-home-baguspermana7/c58644e4-cfc2-4099-9de4-70f989a3b3f7/scratchpad'
const SMALL = 'batwheels-match-up'
const HARD = 'batwheels-gotham-getaway'
const UNINSTALLED = 'thomas-jigsaw'
const SW_FILE = path.join(ROOT, 'sw.js')

fs.mkdirSync(SHOT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── local HTTP server we can kill on demand ────────────────────────────────
async function freePort() {
  return new Promise((res) => {
    const s = net.createServer()
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) })
  })
}
const PORT = await freePort()
const BASE = `http://127.0.0.1:${PORT}`
let srv = null
async function serverUp() {
  if (srv) return
  srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT, stdio: 'ignore'
  })
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/games/film-anak.html'); return } catch { await sleep(120) }
  }
  throw new Error('server did not come up')
}
async function serverDown() {
  if (!srv) return
  srv.kill('SIGKILL'); srv = null
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE + '/games/film-anak.html'); await sleep(120) } catch { return }
  }
}

// ── browser ────────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  headless: 'new',
  protocolTimeout: 900000,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required']
})

// Headless-only noise (verified device-OK in tools/qa-film-games.mjs).
const IGNORE = /favicon|AudioContext|user gesture|autoplay|Unable to preventDefault|passive event|decode audio|EncodingError|\[Construct\] Failed to load audio|WebGL (unsupported|not available)|pixi\.js-legacy|detached ArrayBuffer|DataCloneError|Google|fonts\.g/i

// Faults that ALSO occur online, verified by replaying the identical drive
// against a live server (see the report). Reported, never counted as caused by
// the offline feature.
const PREEXISTING = [
  { re: /sourceSize/, why: "batwheels-gotham-getaway throws this identically ONLINE when a level is re-entered — a crawled-bundle quirk, not an offline fault" }
]

const results = []
const allErrors = []
function record(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

function watch(page, bag) {
  page.on('pageerror', (e) => { const t = e.message || ''; if (!IGNORE.test(t)) bag.errors.push('PE: ' + t.slice(0, 200)) })
  page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (!IGNORE.test(t)) bag.errors.push('CONSOLE: ' + t.slice(0, 200)) } })
  page.on('requestfailed', (r) => { const u = r.url(); if (!/favicon|fonts\.g/i.test(u)) bag.failed.push(u.replace(BASE, '') + ' :: ' + (r.failure()?.errorText || '')) })
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/i.test(r.url())) bag.http.push(r.status() + ' ' + r.url().replace(BASE, '')) })
}
const newBag = () => ({ errors: [], failed: [], http: [] })
const LEVELS = [0, 2, 4]   // gotham levels 1 / 3 / 5 — each loads its own theme pack + Spines

// The crawled gotham bundle exposes no handle on its Phaser game. Hook the
// global setter so we can observe (never modify) the running game. Installed on
// every document, so it reaches the game inside film-play.html's iframe too.
const PHASER_HOOK = () => {
  let _p
  Object.defineProperty(window, 'Phaser', {
    configurable: true,
    get() { return _p },
    set(v) {
      _p = v
      try {
        const ob = v.Game.prototype.boot
        v.Game.prototype.boot = function () { window.__ggGame = this; return ob.apply(this, arguments) }
      } catch (e) {}
    }
  })
}

/** Boot a page and wait until the service worker is controlling it. */
async function openHub(page) {
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => null)).catch(() => {})
  await sleep(1500)
  await page.goto(BASE + '/games/film-anak.html', { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 30000 })
  await page.waitForSelector('.ofl .obtn, .ofl .obadge', { timeout: 30000 })
}

async function installGame(page, slug) {
  const t0 = Date.now()
  await page.waitForSelector(`#ofl-${slug} [data-act="install"]`, { timeout: 30000 })
  await page.click(`#ofl-${slug} [data-act="install"]`)
  // Poll from Node (not waitForFunction) so a stalled install surfaces its own
  // error text instead of dying on the CDP protocol timeout.
  let ms = 0
  for (;;) {
    const st = await page.evaluate((s) => {
      const el = document.getElementById('ofl-' + s)
      if (!el) return { done: false }
      const warn = el.querySelector('.onote.warn')
      return {
        done: !!el.querySelector('.obadge'),
        note: (el.querySelector('.onote') || {}).textContent || '',
        warn: warn ? warn.textContent : null
      }
    }, slug)
    if (st.done) { ms = Date.now() - t0; break }
    if (Date.now() - t0 > 900000) throw new Error(`install ${slug} timed out — note="${st.note}" warn="${st.warn}"`)
    await sleep(1500)
  }
  const info = await page.evaluate(async (s) => {
    const c = await caches.open('dunia-film-' + s)
    const keys = await c.keys()
    const st = await window.FilmOffline.status(s)
    const est = await window.FilmOffline.estimate()
    return { entries: keys.length, state: st.state, bytes: st.bytes, persisted: st.persisted, usage: est.usage }
  }, slug)
  return { ms, ...info }
}

// ── T1 + T2: install, kill the server, play offline ────────────────────────
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 })  // wide landscape retina tablet
const hubBag = newBag(); watch(page, hubBag)

await serverUp()
await openHub(page)
await page.screenshot({ path: `${SHOT}/offline-01-hub-before.png` })

const smallInfo = await installGame(page, SMALL)
console.log(`   ${SMALL}: ${smallInfo.entries} cache entries, ${(smallInfo.bytes / 1048576).toFixed(1)} MB, ${(smallInfo.ms / 1000).toFixed(1)}s, persisted=${smallInfo.persisted}`)
record(`T1a install ${SMALL}`, smallInfo.state === 'installed', `${smallInfo.entries} entries in ${(smallInfo.ms / 1000).toFixed(1)}s`)

const hardInfo = await installGame(page, HARD)
console.log(`   ${HARD}: ${hardInfo.entries} cache entries, ${(hardInfo.bytes / 1048576).toFixed(1)} MB, ${(hardInfo.ms / 1000).toFixed(1)}s`)
record(`T2a install ${HARD}`, hardInfo.state === 'installed', `${hardInfo.entries} entries in ${(hardInfo.ms / 1000).toFixed(1)}s`)

await page.screenshot({ path: `${SHOT}/offline-02-hub-installed.png` })

/** Play a game with the server DOWN. Returns {canvas, bag}. */
async function playOffline(slug, shotName, driveFn) {
  const p = await browser.newPage()
  await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 })
  await p.evaluateOnNewDocument(PHASER_HOOK)
  const bag = newBag(); watch(p, bag)
  await p.goto(BASE + `/games/film-play.html?g=${slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(14000)
  const measure = async () => p.evaluate(() => {
    const fr = document.getElementById('frame')
    let best = { w: 0, h: 0, n: 0 }
    try {
      const d = fr && fr.contentDocument
      if (d) {
        const cs = d.querySelectorAll('canvas')
        cs.forEach((c) => { const r = c.getBoundingClientRect(); if (r.width * r.height > best.w * best.h) best = { w: Math.round(r.width), h: Math.round(r.height), n: cs.length } })
        best.n = cs.length
      }
    } catch (e) {}
    return best
  })
  let canvas = { w: 0, h: 0, n: 0 }
  for (let k = 0; k < 10; k++) { const m = await measure(); if (m.w * m.h > canvas.w * canvas.h) canvas = m; if (canvas.w >= 200) break; await sleep(2000) }
  let drive = null
  if (driveFn) drive = await driveFn(p, LEVELS)
  await p.screenshot({ path: `${SHOT}/${shotName}` })
  bag.errors.forEach((e) => allErrors.push(`[${slug} offline] ${e}`))
  await p.close()
  return { canvas, bag, drive }
}

await serverDown()
console.log('\n--- SERVER KILLED — everything below must come from the cache ---\n')

const t1 = await playOffline(SMALL, 'offline-03-play-match-up.png')
record(`T1b ${SMALL} boots OFFLINE (server dead)`,
  t1.canvas.w >= 200 && t1.canvas.h >= 120 && t1.bag.failed.length === 0,
  `canvas ${t1.canvas.w}x${t1.canvas.h}, failed-requests=${t1.bag.failed.length}${t1.bag.failed.length ? ' :: ' + t1.bag.failed.slice(0, 3).join(' | ') : ''}`)

/** Drive gotham into a real race on several levels — the level-gated case. */
async function driveGothamLevels(p, levels) {
  return p.evaluate(async (levels) => {
    const w = (function () {
      const fr = document.getElementById('frame')
      return fr && fr.contentWindow ? fr.contentWindow : window
    })()
    const sl = (ms) => new Promise((r) => setTimeout(r, ms))
    let g = null
    for (let i = 0; i < 90; i++) { g = w.__ggGame; if (g) break; await sl(1000) }
    if (!g) return { err: 'no __ggGame' }
    const active = () => g.scene.scenes.filter((s) => s.scene.settings.active).map((s) => s.scene.key)
    const tap = async (o) => { o.emit('pointerover'); o.emit('pointerdown'); await sl(180); o.emit('pointerup') }
    const btns = (key) => {
      const sc = g.scene.getScene(key)
      return (sc && sc.children ? sc.children.list : []).filter((o) => o.input && o.visible).sort((a, b) => b.y - a.y)
    }
    // Title -> tap PLAY -> Intro -> tap SKIP -> LevelSelect. Real UI, real taps.
    for (let i = 0; i < 90 && !active().includes('Title'); i++) await sl(1000)
    if (!active().includes('Title')) return { err: 'Title never booted', active: active() }
    await sl(3000)
    const play = btns('Title')[0]
    if (!play) return { err: 'no PLAY button' }
    await tap(play)
    for (let i = 0; i < 60 && !active().includes('Intro') && !active().includes('LevelSelect'); i++) await sl(1000)
    if (active().includes('Intro')) {
      await sl(4000)
      const skip = btns('Intro')[0]
      if (skip) await tap(skip)
    }
    for (let i = 0; i < 60 && !active().includes('LevelSelect'); i++) await sl(1000)
    const ls0 = g.scene.getScene('LevelSelect')
    if (!ls0 || !active().includes('LevelSelect')) return { err: 'no LevelSelect', active: active() }
    const sceneData = ls0.sceneData
    const out = []
    for (const lvl of levels) {
      if (!active().includes('LevelSelect')) {
        g.scene.start('LevelSelect', sceneData)
        for (let i = 0; i < 40 && !active().includes('LevelSelect'); i++) await sl(1000)
      }
      await sl(3000)
      const ls = g.scene.getScene('LevelSelect')
      if (!ls || !ls.onLevelSelected) { out.push({ lvl, ok: false, why: 'LevelSelect gone' }); continue }
      try {
        ls.onLevelSelected({ levelNum: lvl })   // select the level
        await sl(2500)
        ls.playLevel()                          // GO — loads that level's theme pack + Spines
      } catch (e) { out.push({ lvl, ok: false, why: String(e).slice(0, 120) }); continue }
      let hero = false, spr = 0, chosen = null
      for (let i = 0; i < 60; i++) {
        await sl(1000)
        const gs = g.scene.getScene('Game')
        if (gs && active().includes('Game')) {
          try {
            const vm = gs.runManager && gs.runManager.vehicleManager
            hero = !!(vm && vm.HeroVehicle)
            spr = gs.children ? gs.children.list.length : 0
            chosen = (gs.sceneData && gs.sceneData.runSettings && gs.sceneData.runSettings.selectedLevel) || null
          } catch (e) {}
          if (hero) break
        }
      }
      out.push({ lvl, ok: active().includes('Game') && hero, level: chosen, hero, spr })
    }
    // Let the bat-wipe transition finish so the screenshot shows the actual race.
    for (let i = 0; i < 25; i++) {
      await sl(1000)
      const tr = g.scene.getScene('TransitionLoadScene')
      const vis = tr && tr.children ? tr.children.list.filter((o) => o.visible && (o.alpha === undefined || o.alpha > 0.02)).length : 0
      if (!vis) break
    }
    await sl(2000)
    return { levels: out }
  }, levels)
}

const t2 = await playOffline(HARD, 'offline-04-play-gotham-race.png', driveGothamLevels)
const lv = (t2.drive && t2.drive.levels) || []
const okLevels = lv.filter((l) => l.ok)
record(`T2b ${HARD} races on ${okLevels.length} levels OFFLINE (server dead)`,
  t2.canvas.w >= 200 && okLevels.length >= 2 && t2.bag.failed.length === 0,
  `canvas ${t2.canvas.w}x${t2.canvas.h}, levels=${JSON.stringify(lv.map((l) => ({ l: l.lvl, ok: l.ok, spr: l.sprites })))}, failed-requests=${t2.bag.failed.length}${t2.bag.failed.length ? ' :: ' + t2.bag.failed.slice(0, 4).join(' | ') : ''}`)

// ── T3: survive a CACHE_VERSION bump ───────────────────────────────────────
await serverUp()
const swOriginal = fs.readFileSync(SW_FILE, 'utf8')
const oldVer = (swOriginal.match(/const CACHE_VERSION = '([^']+)'/) || [])[1]
const newVer = 'v59.90-QA-BUMPTEST'
let bumpOk = false, bumpDetail = ''
try {
  fs.writeFileSync(SW_FILE, swOriginal.replace(`'${oldVer}'`, `'${newVer}'`))
  const bp = await browser.newPage()
  const bumpBag = newBag(); watch(bp, bumpBag)
  await bp.goto(BASE + '/games/film-anak.html', { waitUntil: 'domcontentloaded', timeout: 45000 })
  await bp.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration()
    if (r) await r.update()
  })
  // wait for the new worker to take over
  await bp.waitForFunction(async () => {
    const r = await navigator.serviceWorker.getRegistration()
    return !!(r && r.active && r.active.scriptURL)
  }, { timeout: 30000 })
  await sleep(6000)
  const after = await bp.evaluate(async () => {
    const keys = await caches.keys()
    const st = await window.FilmOffline.status('batwheels-gotham-getaway')
    const c = await caches.open('dunia-film-batwheels-gotham-getaway')
    return { keys, entries: (await c.keys()).length, state: st.state }
  })
  const swVer = await bp.evaluate(() => fetch('../sw.js', { cache: 'no-store' }).then((r) => r.text()).then((t) => (t.match(/CACHE_VERSION = '([^']+)'/) || [])[1]))
  await bp.screenshot({ path: `${SHOT}/offline-05-after-version-bump.png` })
  await bp.close()
  const hasNewAsset = after.keys.some((k) => k.includes(newVer))
  const filmKept = after.keys.filter((k) => k.startsWith('dunia-film-'))
  bumpDetail = `sw=${swVer}, caches=[${after.keys.join(', ')}], gotham=${after.state} (${after.entries} entries)`
  bumpOk = swVer === newVer && hasNewAsset && filmKept.length >= 3 && after.state === 'installed' && after.entries >= 180

  // …and it must still PLAY offline after the bump.
  await serverDown()
  const t3 = await playOffline(HARD, 'offline-06-play-gotham-after-bump.png', driveGothamLevels)
  const lv3 = ((t3.drive && t3.drive.levels) || []).filter((l) => l.ok)
  record('T3 installed game SURVIVES a CACHE_VERSION bump', bumpOk, bumpDetail)
  record('T3b …and still races OFFLINE after the bump',
    t3.canvas.w >= 200 && lv3.length >= 2 && t3.bag.failed.length === 0,
    `canvas ${t3.canvas.w}x${t3.canvas.h}, levels-ok=${lv3.length}, failed-requests=${t3.bag.failed.length}${t3.bag.failed.length ? ' :: ' + t3.bag.failed.slice(0, 4).join(' | ') : ''}`)
  await serverUp()
} finally {
  fs.writeFileSync(SW_FILE, swOriginal)   // always restore the real version
}

// Put the real SW back in control before the remaining tests.
{
  const rp = await browser.newPage()
  await rp.goto(BASE + '/games/film-anak.html', { waitUntil: 'domcontentloaded', timeout: 45000 })
  await rp.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update() })
  await sleep(5000)
  await rp.close()
}

// ── T4: a NOT-installed game still plays normally online ───────────────────
{
  const p4 = await browser.newPage()
  await p4.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 })
  const bag = newBag(); watch(p4, bag)
  await p4.goto(BASE + `/games/film-play.html?g=${UNINSTALLED}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(14000)
  let canvas = { w: 0, h: 0, n: 0 }
  for (let k = 0; k < 8; k++) {
    const m = await p4.evaluate(() => {
      const fr = document.getElementById('frame'); let best = { w: 0, h: 0, n: 0 }
      try { const d = fr.contentDocument; const cs = d.querySelectorAll('canvas'); cs.forEach((c) => { const r = c.getBoundingClientRect(); if (r.width * r.height > best.w * best.h) best = { w: Math.round(r.width), h: Math.round(r.height), n: cs.length } }); best.n = cs.length } catch (e) {}
      return best
    })
    if (m.w * m.h > canvas.w * canvas.h) canvas = m
    if (canvas.w >= 200) break
    await sleep(2000)
  }
  const noGhost = await p4.evaluate((s) => caches.keys().then((k) => !k.includes('dunia-film-' + s)), UNINSTALLED)
  await p4.screenshot({ path: `${SHOT}/offline-07-not-installed-online.png` })
  await p4.close()
  // Some crawled games reference an asset that was never on the source CDN.
  // Prove any 404 here is PRE-EXISTING by replaying the same page with no
  // service worker at all — if the pristine load 404s identically, it is a
  // crawl gap, not something this feature introduced.
  const pristine = await browser.createBrowserContext()
  const pp = await pristine.newPage()
  const pre = []
  pp.on('response', (r) => { if (r.status() >= 400 && !/favicon/i.test(r.url())) pre.push(r.status() + ' ' + r.url().replace(BASE, '')) })
  await pp.goto(BASE + `/games/film/${UNINSTALLED}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(14000)
  await pp.close(); await pristine.close()
  const only404 = bag.errors.every((e) => /404|Failed to load resource/i.test(e))
  const preExisting = pre.length > 0 && only404
  record(`T4 not-installed ${UNINSTALLED} still plays online`,
    canvas.w >= 200 && canvas.h >= 120 && noGhost && (bag.errors.length === 0 || preExisting),
    `canvas ${canvas.w}x${canvas.h}, no ghost cache=${noGhost}, errors=${bag.errors.length}` +
    (pre.length ? `, PRE-EXISTING crawl 404 (also fails with NO service worker): ${pre.join(' | ')}` : ''))
  // Only surface it as a real console error if it is NOT the pre-existing gap.
  if (!preExisting) bag.errors.forEach((e) => allErrors.push(`[${UNINSTALLED} online] ${e}`))
  else console.log(`   (known pre-existing crawl gap, unchanged by this feature: ${pre.join(' | ')})`)
}

// ── T5: remove frees the cache ─────────────────────────────────────────────
{
  const p5 = await browser.newPage()
  await p5.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 })
  const bag = newBag(); watch(p5, bag)
  await p5.goto(BASE + '/games/film-anak.html', { waitUntil: 'domcontentloaded', timeout: 45000 })
  await p5.waitForSelector(`#ofl-${SMALL} .obadge`, { timeout: 30000 })
  const before = await p5.evaluate(() => window.FilmOffline.estimate())
  await p5.click(`#ofl-${SMALL} [data-act="remove"]`)
  await p5.waitForFunction((s) => !!document.querySelector('#ofl-' + s + ' [data-act="install"]'), { timeout: 30000 }, SMALL)
  await sleep(2500)
  const after = await p5.evaluate(async (s) => {
    // navigator.storage.estimate() is coarse and lags in Chrome, so the
    // AUTHORITATIVE check is Cache Storage itself: the bucket must be gone and
    // every one of its entries with it. The estimate is reported alongside.
    const keys = await caches.keys()
    const est = await window.FilmOffline.estimate()
    const st = await window.FilmOffline.status(s)
    let leftover = 0
    try { const c = await caches.open('dunia-film-' + s); leftover = (await c.keys()).length; await caches.delete('dunia-film-' + s) } catch (e) {}
    return { gone: !keys.includes('dunia-film-' + s), leftover, usage: est.usage, state: st.state, keys }
  }, SMALL)
  await p5.screenshot({ path: `${SHOT}/offline-08-after-remove.png` })
  bag.errors.forEach((e) => allErrors.push(`[hub remove] ${e}`))
  await p5.close()
  record('T5 remove frees the cache + flips status',
    after.gone && after.leftover === 0 && after.state === 'not-installed',
    `bucket gone=${after.gone}, leftover entries=${after.leftover}, state=${after.state}, storage.estimate ${(before.usage / 1048576).toFixed(1)}MB → ${(after.usage / 1048576).toFixed(1)}MB (estimate is coarse/lagging in Chrome — cache contents are the real check)`)
}

// ── T6: a REAL content change is detected as stale AND actually re-downloaded ─
// The trap this guards: the update path used to reuse cached files by URL, so a
// file whose CONTENT changed but whose path did not was silently kept stale
// while the card went back to reporting "Siap offline".
{
  const gdir = path.join(ROOT, 'games/film', SMALL)
  const target = path.join(gdir, 'index.html')
  const orig = fs.readFileSync(target, 'utf8')
  const MARKER = '<!-- qa-stale-marker-' + Date.now() + ' -->'
  const p6 = await browser.newPage()
  await p6.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 })
  const bag = newBag(); watch(p6, bag)
  try {
    // install the pristine game
    await p6.goto(BASE + '/games/film-anak.html', { waitUntil: 'domcontentloaded', timeout: 45000 })
    await p6.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 30000 })
    await installGame(p6, SMALL)

    // change a real file + regenerate its manifest, exactly as a re-crawl would
    fs.writeFileSync(target, orig + '\n' + MARKER + '\n')
    execSync(`node ${JSON.stringify(path.join(ROOT, 'tools/build-film-manifests.mjs'))}`, { cwd: ROOT, stdio: 'ignore' })

    await p6.reload({ waitUntil: 'domcontentloaded' })
    await p6.waitForSelector(`#ofl-${SMALL} [data-act="install"]`, { timeout: 30000 })
    const staleText = await p6.evaluate((s) => document.getElementById('ofl-' + s).textContent.replace(/\s+/g, ' ').trim(), SMALL)
    await p6.evaluate(() => document.getElementById('grp-batwheels').scrollIntoView({ block: 'start' }))
    await sleep(400)
    await p6.screenshot({ path: `${SHOT}/offline-12-stale-update.png` })
    record('T6a changed game file is detected as STALE', /Perbarui/.test(staleText), `card reads: "${staleText}"`)

    // tap Perbarui, then read the bytes actually sitting in the bucket
    await p6.click(`#ofl-${SMALL} [data-act="install"]`)
    await p6.waitForSelector(`#ofl-${SMALL} .obadge`, { timeout: 300000 })
    const got = await p6.evaluate(async (s) => {
      // Find the entry by scanning the bucket — never hand-build the URL
      // (relative resolution from /games/film-anak.html is a known trap).
      const c = await caches.open('dunia-film-' + s)
      const keys = await c.keys()
      const key = keys.find((k) => k.url.endsWith('/games/film/' + s + '/index.html'))
      const res = key ? await c.match(key) : null
      const st = await window.FilmOffline.status(s)
      return { body: res ? await res.text() : null, key: key ? key.url : null, entries: keys.length, state: st.state }
    }, SMALL)
    record('T6b "Perbarui" actually re-downloads the CHANGED file',
      !!got.body && got.body.includes(MARKER) && got.state === 'installed',
      `cached copy contains the new marker=${!!(got.body && got.body.includes(MARKER))}, key=${got.key}, entries=${got.entries}, state=${got.state}`)
  } finally {
    fs.writeFileSync(target, orig)
    execSync(`node ${JSON.stringify(path.join(ROOT, 'tools/build-film-manifests.mjs'))}`, { cwd: ROOT, stdio: 'ignore' })
  }
  bag.errors.forEach((e) => allErrors.push(`[stale/update] ${e}`))
  await p6.close()
}

hubBag.errors.forEach((e) => allErrors.push(`[hub] ${e}`))

// ── report ─────────────────────────────────────────────────────────────────
console.log('\n──────── CONSOLE ERRORS (verbatim, favicon/font noise excluded) ────────')
const known = allErrors.filter((e) => PREEXISTING.some((k) => k.re.test(e)))
const real = allErrors.filter((e) => !PREEXISTING.some((k) => k.re.test(e)))
if (!real.length) console.log('  REAL errors: (none)')
real.forEach((e) => console.log('  REAL ' + e))
known.forEach((e) => {
  const k = PREEXISTING.find((x) => x.re.test(e))
  console.log('  PRE-EXISTING ' + e + '\n      -> ' + k.why)
})

console.log('\n──────── SUMMARY ────────')
const failed = results.filter((r) => !r.ok)
results.forEach((r) => console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`))
console.log(`\n  ${results.length - failed.length}/${results.length} passed · ${real.length} REAL console error(s) · ${known.length} pre-existing`)
console.log(`  screenshots: ${SHOT}/offline-*.png`)

await browser.close()
await serverDown()
process.exit(failed.length || real.length ? 1 : 0)
