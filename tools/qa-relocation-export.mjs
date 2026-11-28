// PRD-59 L25: the standalone Relocation to UAE app (OUT_COUNTRY_RE) is always the same as its source here.
//   a) two exports give the same service-worker version (deterministic)
//   b) on the export: unit tests 0 failed, no path leaves the app, 5 pages load with 0 errors and 0 failed
//      requests, fonts loaded, no sideways scroll at 390 px, every page still loads after the server is stopped
//   c) with --live <url>: the live sw.js version equals this export's
// Usage: node tools/qa-relocation-export.mjs [--live https://baguspermana7-cpu.github.io/OUT_COUNTRY_RE]
import puppeteer from 'puppeteer'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const live = process.argv.includes('--live') ? process.argv[process.argv.indexOf('--live') + 1] : ''
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const PAGES = ['', 'pindah-abudhabi.html', 'visa-keluarga-uae.html', 'koper-uae.html', 'ujian-sim-abudhabi.html']
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' }
const swVersion = dir => (/const VERSION = '([0-9a-f]+)'/.exec(fs.readFileSync(path.join(dir, 'sw.js'), 'utf8')) || [])[1]

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reloc-export-'))
const A = path.join(tmp, 'a'), B = path.join(tmp, 'b')
let browser, srv
try {
  for (const d of [A, B]) execFileSync('python3', [path.join(ROOT, 'tools/export-relocation.py'), d], { stdio: 'pipe' })
  const va = swVersion(A), vb = swVersion(B)
  ok(!!va && va === vb, `L25a: two exports give the same service-worker version (${va} / ${vb})`)

  for (const t of ['test-uae-data.mjs', 'test-uae-engines.mjs']) {
    let out = ''
    try { out = execFileSync('node', [path.join('tests', t)], { cwd: A, encoding: 'utf8' }) } catch (e) { out = String(e.stdout || e.message) }
    const last = out.trim().split('\n').pop()
    ok(/ 0 failed$/.test(last), `L25b: ${t} on the export: ${last}`)
  }
  const html = PAGES.map(p => fs.readFileSync(path.join(A, p || 'index.html'), 'utf8')).join('\n')
  ok(!html.includes('../') && !/sw-reload\.js/.test(html), 'L25b: no page points outside the app or loads the Dunia Emosi service-worker helper')
  const listed = JSON.parse(/const FILES = (\[[\s\S]*?\])\n/.exec(fs.readFileSync(path.join(A, 'sw.js'), 'utf8'))[1])
  const missing = listed.filter(f => f !== './' && !fs.existsSync(path.join(A, f)))
  ok(listed.length > 100 && !missing.length, `L25b: service worker lists ${listed.length} files, ${missing.length} missing on disk`)

  let up = true
  srv = http.createServer((q, r) => {
    if (!up) { r.destroy(); return }
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
    const f = path.join(A, p)
    if (!f.startsWith(A) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f))
  }).listen(0, '127.0.0.1')
  await new Promise(r => srv.on('listening', r))
  const base = `http://127.0.0.1:${srv.address().port}/`
  browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const p = await browser.newPage(), errs = [], bad = []
  p.on('pageerror', e => errs.push(String(e).slice(0, 140)))
  p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().replace(base, '/')) })
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  for (const f of PAGES) {
    await p.goto(base + f, { waitUntil: 'networkidle0', timeout: 60000 })
    const r = await p.evaluate(() => ({ h1: !!document.querySelector('h1'), font: document.fonts.check('16px Nunito') && document.fonts.check('16px "Fredoka One"'), ox: document.documentElement.scrollWidth - innerWidth, out: [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin) && !h.startsWith(location.origin + '/')).length }))
    ok(r.h1 && r.font && r.ox <= 0, `L25b: ${f || 'index.html'} renders (heading ${r.h1}, fonts ${r.font}, sideways ${r.ox})`)
  }
  ok(!errs.length && !bad.length, `L25b: page errors ${errs.length}, failed requests ${bad.length} ${[...errs, ...bad].slice(0, 3).join(' | ')}`)
  await p.goto(base, { waitUntil: 'networkidle0' })
  await p.evaluate(() => navigator.serviceWorker.ready)
  await p.reload({ waitUntil: 'networkidle0' })
  up = false
  for (const f of PAGES) {
    let r = false
    try { await p.goto(base + f, { waitUntil: 'load', timeout: 15000 }); r = await p.evaluate(() => !!document.querySelector('h1') && document.fonts.check('16px Nunito')) } catch (e) { r = false }
    ok(r, `L25b: ${f || 'index.html'} loads with the server stopped (offline)`)
  }
  if (live) {
    const t = await (await fetch(live.replace(/\/$/, '') + '/sw.js?x=' + Date.now())).text()
    const lv = (/const VERSION = '([0-9a-f]+)'/.exec(t) || [])[1]
    ok(lv === va, `L25c: live service-worker version ${lv} = this export ${va}`)
  }
} finally {
  if (browser) await browser.close()
  if (srv) srv.close()
  fs.rmSync(tmp, { recursive: true, force: true })
}
console.log(`qa-relocation-export: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
