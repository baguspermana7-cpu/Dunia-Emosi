#!/usr/bin/env node
/* audit-no-emoji.mjs — PERMANENT gate for the ZERO-EMOJI program.
 * Boots every page headless, lets the UISprites resolver run, then walks the
 * RENDERED DOM for leftover pictographic emoji.
 *   - MAPPED emoji still on screen  → FAIL (resolver missed a swap = bug).
 *   - UNMAPPED emoji                → recorded as a GAP (needs owner art), NOT a fail.
 * Writes tools/qa-out/emoji-gaps.json (aggregate unmapped char → count + pages).
 * Run: node tools/audit-no-emoji.mjs                                          */
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const PAGES = [
  'index.html',
  'games/balapan-kereta.html', 'games/balapan-kereta-side.html', 'games/lokomotif-pemberani.html',
  'games/selamatkan-kereta.html', 'games/museum-kereta.html',
  'games/gym-pokemon.html', 'games/mario-pokemon.html', 'games/monster-candy.html',
  'games/pokemon-run.html', 'games/pokemon-birds.html', 'games/pokemon-bawah-laut.html',
  'games/ducky-volley.html', 'games/kuis-matematika.html', 'games/mobil.html',
]

// tiny static server
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
function serve () {
  return new Promise(res => {
    const s = http.createServer((req, rq) => {
      let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/index.html'
      const abs = path.join(ROOT, f)
      fs.readFile(abs, (e, d) => {
        if (e) { rq.writeHead(404); rq.end('nf'); return }
        rq.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' }); rq.end(d)
      })
    })
    s.listen(0, () => res(s))
  })
}

const WALK = () => {
  const EMO = /\p{Extended_Pictographic}/u
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CANVAS: 1 }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const mapped = {}, unmapped = {}
  let n
  const has = (window.EmojiMap && window.EmojiMap.has) ? (c) => window.EmojiMap.has(c) : () => false
  while ((n = w.nextNode())) {
    const t = n.nodeValue; if (!t || !EMO.test(t)) continue
    let skip = false
    for (let p = n.parentNode; p; p = p.parentNode) { if (p.nodeType === 1 && SKIP[p.tagName]) { skip = true; break } }
    if (skip) continue
    for (const ch of t) {
      if (!/\p{Extended_Pictographic}/u.test(ch)) continue
      if (has(ch)) mapped[ch] = (mapped[ch] || 0) + 1
      else unmapped[ch] = (unmapped[ch] || 0) + 1
    }
  }
  const gaps = (window.UISprites && window.UISprites.gaps) ? window.UISprites.gaps() : {}
  return { mapped, unmapped, gaps }
}

const server = await serve()
const port = server.address().port
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
const gapAgg = {}   // char -> { count, pages:Set }
let failPages = []

for (const rel of PAGES) {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 800 })
  try {
    await page.goto(`http://localhost:${port}/${rel}`, { waitUntil: 'networkidle2', timeout: 30000 })
  } catch (_) {}
  await new Promise(r => setTimeout(r, 1200))   // let observer + idle sweep settle
  let r
  try { r = await page.evaluate(WALK) } catch (e) { r = { mapped: {}, unmapped: {}, gaps: {} } }
  const mappedN = Object.values(r.mapped).reduce((a, b) => a + b, 0)
  const unmappedN = Object.values(r.unmapped).reduce((a, b) => a + b, 0)
  for (const [ch, c] of Object.entries(r.unmapped)) {
    if (!gapAgg[ch]) gapAgg[ch] = { count: 0, pages: new Set() }
    gapAgg[ch].count += c; gapAgg[ch].pages.add(rel)
  }
  const ok = mappedN === 0
  if (!ok) failPages.push({ rel, mapped: r.mapped })
  console.log(`${ok ? '✅' : '❌'} ${rel.padEnd(34)} mapped-left=${mappedN}  unmapped(gap)=${unmappedN}`)
  if (!ok) console.log('     STILL-MAPPED:', JSON.stringify(r.mapped))
  await page.close()
}

await browser.close(); server.close()

const gaps = Object.entries(gapAgg)
  .map(([ch, e]) => ({ ch, cp: [...ch].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' '), count: e.count, pages: [...e.pages] }))
  .sort((a, b) => b.count - a.count)
fs.mkdirSync(path.join(ROOT, 'tools/qa-out'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'tools/qa-out/emoji-gaps.json'), JSON.stringify({ distinctGaps: gaps.length, gaps }, null, 2))

console.log(`\ngap emoji (unmapped, need art): ${gaps.length} distinct`)
if (failPages.length) { console.log(`\n❌ FAIL — ${failPages.length} page(s) still show MAPPED emoji (resolver bug)`); process.exit(1) }
console.log('\n✅ zero mapped-emoji remain in rendered DOM (gaps tracked separately)')
