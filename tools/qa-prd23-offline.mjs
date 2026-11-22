#!/usr/bin/env node
// qa-prd23-offline — PRD-23 (docs/prd/PRD-23-indikator-siap-luring-per.md): the "siap" badge per game and the
// parent's "Unduh semua game". Serves the tree itself on a free port and KILLS the server for the offline part, so
// one uncached byte is a refused connection, not a quietly served file.
//   L3 games/data/offline-manifest.json equals a fresh build (--check exits 0), and a changed manifest exits 1
//   L0 before "Unduh semua" not every game has its badge (the badge reads the cache, not a flag)
//   Unduh semua (Dasbor, behind the gate) -> every game in the manifest gets its badge, 0 files failed
//   L1 one file used by one game only is dropped from the cache -> that game alone loses its badge
//   L2 server down: every badged game opens (its page loads and draws, 0 page errors; a hub game starts a level),
//      and asks for at most 3 same-origin files it cannot get (tools/record-offline-runtime.mjs records the rest)
//   + screenshot of the map with its badges (QA_SHOTS=dir)
// Usage: node tools/qa-prd23-offline.mjs
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import puppeteer from 'puppeteer'
const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..'), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
if (SH) fs.mkdirSync(SH, { recursive: true })
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'games/data/offline-manifest.json'), 'utf8')).games

// L3
{
  const fresh = spawnSync('node', ['tools/build-offline-manifest.mjs', '--check'], { cwd: ROOT }).status
  const f = path.join(ROOT, 'games/data/offline-manifest.json'), keep = fs.readFileSync(f, 'utf8')
  fs.writeFileSync(f, keep.replace('"files": [', '"files": [\n  "games/old.js",'))
  const stale = spawnSync('node', ['tools/build-offline-manifest.mjs', '--check'], { cwd: ROOT }).status
  fs.writeFileSync(f, keep)
  ok(fresh === 0 && stale === 1, `L3 manifest --check: fresh exits ${fresh}, a changed manifest exits ${stale}`)
}

const freePort = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)) }) })
const PORT = await freePort(), BASE = `http://127.0.0.1:${PORT}/`
let srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' })
for (let i = 0; i < 80; i++) { try { await fetch(BASE + 'index.html'); break } catch { await sleep(150) } }
const b = await puppeteer.launch({ headless: 'new', protocolTimeout: 240000, args: ['--no-sandbox', '--disable-audio-output'] })
const p = await b.newPage()
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
await p.evaluateOnNewDocument(() => {
  if (!localStorage.getItem('__qa_seed')) {
    localStorage.clear(); localStorage.setItem('__qa_seed', '1')
    localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh' }]))
    localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off')
  }
})
await p.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 })
await p.waitForFunction(() => !!navigator.serviceWorker.controller, { timeout: 60000 }).catch(() => {})
await sleep(4000)   // the worker's activate broadcasts a reload
await p.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 120000 })
await p.waitForFunction(() => window.DuniaOffline && typeof showDashboard === 'function' && !!navigator.serviceWorker.controller, { timeout: 60000 }).catch(() => {})
const ids = Object.keys(MAN)
const before = await p.evaluate(() => DuniaOffline.refresh()).catch(() => ({ ready: [] }))
ok(before.ready.length < ids.length, `L0 before Unduh semua: ${before.ready.length} of ${ids.length} games badged`)

await p.evaluate(() => showDashboard(true)); await sleep(600)
await p.evaluate(() => { const b = document.querySelector('#dash-offline .doff-go'); b.scrollIntoView({ block: 'center' }); b.click() })
await p.waitForFunction(() => { const b = document.querySelector('#dash-offline .doff-go'); return b && !b.disabled && /siap/.test(document.querySelector('#dash-offline .doff-note').textContent) }, { timeout: 600000 }).catch(() => {})
const note = await p.evaluate(() => document.querySelector('#dash-offline .doff-note').textContent)
const after = await p.evaluate(() => DuniaOffline.refresh())
await p.evaluate(() => showScreen('screen-menu')); await sleep(800)
const badges = await p.evaluate(() => document.querySelectorAll('.wmap-node .wn-ready').length)
if (SH) await p.screenshot({ path: path.join(SH, 'map-badges-390x844.png') })
ok(after.ready.length === ids.length && badges === ids.length && !/gagal/.test(note), `Unduh semua: "${note}"; badged ${after.ready.length} of ${ids.length}, badges drawn ${badges}`)

// L1: a file only one game uses
const count = {}; ids.forEach(id => MAN[id].files.forEach(f => { count[f] = (count[f] || 0) + 1 }))
const pref = ['25', '26', '27', '28'].find(id => MAN[id] && MAN[id].files.some(f => count[f] === 1))
const only = MAN[pref].files.find(f => count[f] === 1 && !/\.html/.test(f))
await p.evaluate(async f => { for (const n of await caches.keys()) await (await caches.open(n)).delete(new Request(new URL(f, location.href).href)) }, only)
const l1 = await p.evaluate(() => DuniaOffline.refresh())
const lost = ids.filter(id => !l1.ready.includes(id))
ok(lost.length === 1 && lost[0] === pref, `L1 dropped ${only} (game ${pref} only) -> badges lost: ${lost.join(', ') || 'none'}`)
await p.evaluate(f => fetch(f), only); await sleep(600)
const back = await p.evaluate(() => DuniaOffline.refresh())
ok(back.ready.length === ids.length, `L1 the file fetched again -> badged ${back.ready.length} of ${ids.length}`)

// L2: server down
srv.kill('SIGKILL'); srv = null
for (let i = 0; i < 60; i++) { try { await fetch(BASE + 'index.html'); await sleep(150) } catch { break } }
const bad = [], gaps = {}
const pages = [...new Set(back.ready.map(id => MAN[id].page))]
for (const pg of pages) {
  const q = await b.newPage(), errs = [], miss = new Set()
  q.on('pageerror', e => errs.push(e.message.slice(0, 120)))
  q.on('requestfailed', r => { const u = r.url(); if (u.startsWith(BASE) && !/favicon\.ico/.test(u)) miss.add(u.slice(BASE.length).split('?')[0]) /* favicon.ico is a 404 online too */ })
  await q.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  let loaded = true
  await q.goto(BASE + pg, { waitUntil: 'load', timeout: 60000 }).catch(() => { loaded = false })
  await sleep(2500)
  const r = await q.evaluate(() => ({ url: location.href, els: document.body ? document.body.querySelectorAll('*').length : 0, text: (document.body && document.body.innerText || '').trim().length })).catch(() => ({ url: 'x', els: 0, text: 0 }))
  let started = true
  if (pg === 'index.html') {
    started = await q.evaluate(() => { state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = 4; startGameWithLevel(1); return new Promise(res => setTimeout(() => res(document.getElementById('screen-game4').classList.contains('active') && !!document.querySelector('#screen-game4 [data-v]')), 1500)) }).catch(() => false)
  }
  if (!loaded || /^chrome-error/.test(r.url) || r.els < 20 || !r.text || errs.length || !started) bad.push(`${pg} loaded ${loaded} els ${r.els} text ${r.text} errors ${errs.length} ${errs[0] || ''} started ${started}`)
  if (miss.size) gaps[pg] = [...miss].slice(0, 3).concat(miss.size > 3 ? ['+' + (miss.size - 3)] : [])
  if (SH && pg === 'games/kuis-matematika.html') await q.screenshot({ path: path.join(SH, 'offline-kuis-390x844.png') })
  await q.close()
}
ok(!bad.length, `L2 server down: ${pages.length} badged pages open, broken ${bad.length} ${bad.slice(0, 2).join(' | ')}`)
const missN = Object.fromEntries(Object.entries(gaps).map(([k, v]) => [k, v.length && /^\+/.test(v[v.length - 1]) ? 3 + +v[v.length - 1].slice(1) : v.length]))
ok(Object.values(missN).every(n => n <= 3), `L2 files a badged game asked for offline and did not get (<= 3 per page; a random pick the recorder did not see): ${JSON.stringify(gaps)}`)
await b.close()
console.log(`qa-prd23-offline: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
