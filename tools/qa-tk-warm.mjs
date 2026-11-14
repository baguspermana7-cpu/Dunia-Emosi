#!/usr/bin/env node
// qa-tk-warm — PRD-24 (docs/prd/PRD-24-penghangatan-cache-timmy-yang.md): Timmy's offline warm-up fills the cache once
// and leaves the network alone afterwards.
//   L1 first visit: the warm-up downloads the art the game needs offline (>= 300 asset requests after the SW takes over)
//   L2 reopening with everything cached: the warm-up adds no network traffic (server hits within 10 of the same reopen
//      with the warm-up switched off). Before the fix every reopen re-requested ~600 files through the SW's
//      stale-while-revalidate, while the child played: 692 vs 91 hits in 30 s.
// The gate serves the repo itself (it has to count what the server receives).
// Usage: node tools/qa-tk-warm.mjs   (or through tools/run-gates.mjs)
// run-gates: timeout 900
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.opus': 'audio/ogg' }
let hits = [], counting = false
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(ROOT, path.normalize(u.endsWith('/') ? u + 'index.html' : u))
  if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return }
  if (counting) hits.push(u)
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); r.end(d) })
}).listen(0, '127.0.0.1')
await new Promise(r => srv.on('listening', r))
const BASE = `http://127.0.0.1:${srv.address().port}/`
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
async function run (noWarm) {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
  const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 })
  if (noWarm) await p.evaluateOnNewDocument(() => { window.__TK_NO_WARM = true })
  const url = BASE + 'games/timmy-kapal.html'
  await p.goto(url, { waitUntil: 'load' }); await p.evaluate(() => navigator.serviceWorker.ready); await sleep(1000)
  hits = []; counting = true
  await p.reload({ waitUntil: 'load' }); await sleep(40000)                 // SW controls the page: the warm-up runs
  const first = hits.filter(h => /\/assets\//.test(h)).length
  hits = []
  await p.reload({ waitUntil: 'load' }); await sleep(30000)                 // the child opens the game again
  counting = false
  const again = hits.length
  await b.close()
  return { first, again }
}
const on = await run(false), off = await run(true)
console.log('  warm on ', JSON.stringify(on), ' warm off', JSON.stringify(off))
ok(on.first >= 300, `L1 first visit warms the offline art (${on.first} asset requests, ${off.first} without the warm-up)`)
ok(on.again <= off.again + 10, `L2 reopen: the warm-up adds no traffic (${on.again} server hits, ${off.again} without it)`)
srv.close()
console.log(`qa-tk-warm: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
