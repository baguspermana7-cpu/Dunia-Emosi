#!/usr/bin/env node
// qa-prd34-thumbs (PRD-34 L3) — the lazy / smaller thumbnails still draw. 390x844 touch page per case: open the picker, scroll it
// to the end in steps (so every lazy image is brought into range), then count <img> with naturalWidth===0 (broken) and, for the
// Timmy story strip, thumbnail backdrops whose scene url does not decode. Screenshots -> tools/qa-out/prd34/<case>-{top,end}.png.
//   gym-pokemon : #btn-pkg -> #pkg-overlay scrolled; imgs inside #pkg-grid      (also counts ones that fell back to the pokeball)
//   lokomotif   : #train-select scrolled; imgs inside .tcard
//   timmy-kapal : .tks-thumbs scrolled sideways; .tks-t img + .tks-tbg backdrops
// Serves the tree itself on a free port. Exit 1 on any broken image.
//   TMPDIR=$HOME/.cache/qa-tmp flock -w 1800 /tmp/claude-1000/kereta-browser.lock timeout 600 node tools/qa-prd34-thumbs.mjs
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'tools/qa-out/prd34'); fs.mkdirSync(OUT, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' }
function serve () {
  const srv = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'
      const f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end() }
      const b = fs.readFileSync(f)
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Content-Length': b.length, 'Cache-Control': 'no-store' }); res.end(b)
    } catch (e) { res.writeHead(404); res.end('nf') }
  })
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, origin: 'http://127.0.0.1:' + srv.address().port + '/' })))
}
const seed = () => { try { localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }])); localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off') } catch (e) {} }

// scroll the nearest scrollable ancestor of `sel` (or `sel` itself) to its end in steps along `axis`, so every lazy image passes
// through the viewport (a jump to the end would only bring the last ones into range)
async function scrollAll (page, sel, axis) {
  for (let i = 0; i < 200; i++) {
    const more = await page.evaluate((sel, axis) => {
      const k = axis === 'x' ? ['scrollLeft', 'scrollWidth', 'clientWidth'] : ['scrollTop', 'scrollHeight', 'clientHeight']
      let el = document.querySelector(sel); if (!el) return false
      while (el && !(el[k[1]] > el[k[2]] + 4 && /(auto|scroll)/.test(getComputedStyle(el)[axis === 'x' ? 'overflowX' : 'overflowY']))) el = el.parentElement
      if (!el) return false
      el[k[0]] += el[k[2]] * 0.6
      return el[k[0]] + el[k[2]] < el[k[1]] - 2
    }, sel, axis)
    await sleep(150)
    if (!more) break
  }
  await sleep(1500)
}
const imgStats = (page, sel) => page.evaluate(sel => {
  const all = Array.from(document.querySelectorAll(sel))
  const broken = all.filter(i => i.complete && i.naturalWidth === 0).map(i => (i.currentSrc || i.src).split('/').pop())
  const pending = all.filter(i => !i.complete).length
  const pokeball = all.filter(i => /pokeball\.svg/.test(i.currentSrc || i.src)).length
  const thumbs = all.filter(i => /\/thumb\//.test(i.currentSrc || i.src)).length
  const lazy = all.filter(i => i.loading === 'lazy').length
  return { total: all.length, broken, pending, pokeball, thumbs, lazy }
}, sel)

const CASES = [
  { name: 'gym-pokemon', url: 'games/gym-pokemon.html', sel: '#pkg-grid img',
    run: async page => {
      await page.waitForSelector('#btn-pkg, #btn-pkg-gs', { timeout: 30000 }); await sleep(1500)
      await page.evaluate(() => { const b = [document.getElementById('btn-pkg'), document.getElementById('btn-pkg-gs')].find(e => e && e.offsetParent !== null) || document.getElementById('btn-pkg'); b.click() })
      await page.waitForSelector('#pkg-grid .pkg-card', { visible: true, timeout: 15000 }); await sleep(800)
      await page.screenshot({ path: path.join(OUT, 'gym-pokemon-top.png') })
      await scrollAll(page, '#pkg-grid .pkg-card', 'y')
      await page.screenshot({ path: path.join(OUT, 'gym-pokemon-end.png') })
    } },
  { name: 'lokomotif-pemberani', url: 'games/lokomotif-pemberani.html', sel: '.tcard img',
    run: async page => {
      await page.waitForSelector('.tcard', { timeout: 30000 }); await sleep(1200)
      await page.screenshot({ path: path.join(OUT, 'lokomotif-top.png') })
      await scrollAll(page, '.tcard', 'y')
      await page.screenshot({ path: path.join(OUT, 'lokomotif-end.png') })
    } },
  { name: 'timmy-kapal-story', url: 'games/timmy-kapal.html', sel: '.tks-t img',
    run: async page => {
      // Start -> the first level is the intro story; nudge #btn-start (then the go-card) until the story strip exists
      await page.waitForSelector('#btn-start', { visible: true, timeout: 30000 }); await sleep(1500)
      for (let k = 0; k < 8 && !(await page.$('.tks-thumbs .tks-t')); k++) {
        const t = await page.$('#btn-start'); const vis = t && await t.evaluate(e => e.offsetParent !== null)
        const sel = vis ? '#btn-start' : '#gocard.show'
        const h = await page.$(sel); if (h) { const b = await h.boundingBox(); if (b) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2) }
        await sleep(1500)
      }
      await page.waitForSelector('.tks-thumbs .tks-t', { timeout: 20000 }); await sleep(1500)
      await page.screenshot({ path: path.join(OUT, 'timmy-story-top.png') })
      await scrollAll(page, '.tks-thumbs', 'x')
      await sleep(600)
      await page.screenshot({ path: path.join(OUT, 'timmy-story-end.png') })
    } }
]

const only = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null
const { srv, origin } = await serve()
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] })
let fails = 0
try {
  for (const c of CASES) {
    if (only && !only.test(c.name)) continue
    const page = await browser.newPage()
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.evaluateOnNewDocument(seed)
    let line
    try {
      await page.goto(origin + c.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await c.run(page)
      const st = await imgStats(page, c.sel)
      let bg = ''
      if (/timmy/.test(c.name)) {
        // backdrops are CSS backgrounds: every thumbnail must have painted one (IntersectionObserver) and its url must decode
        const b = await page.evaluate(async () => {
          const els = Array.from(document.querySelectorAll('.tks-tbg')); let unpainted = 0, bad = 0
          for (const e of els) {
            const m = /url\("?([^")]+)"?\)/.exec(e.style.background || getComputedStyle(e).backgroundImage || '')
            if (e.getAttribute('data-scene') != null) unpainted++
            if (m) { const ok = await new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = m[1] }); if (!ok) bad++ }
          }
          return { n: els.length, unpainted, bad }
        })
        bg = ` backdrops=${b.n} unpainted=${b.unpainted} undecodable=${b.bad}`
        if (b.bad) st.broken.push('bg x' + b.bad)
      }
      const ok = st.total > 0 && !st.broken.length && !st.pending
      line = `${ok ? 'PASS' : 'FAIL'} ${c.name}: imgs=${st.total} broken=${st.broken.length}${st.broken.length ? ' [' + st.broken.slice(0, 4).join(',') + ']' : ''} pending=${st.pending} lazy=${st.lazy} thumbs=${st.thumbs} pokeballFallback=${st.pokeball}${bg}`
      if (!ok) fails++
    } catch (e) { fails++; line = `FAIL ${c.name}: ${String(e.message).split('\n')[0]}` }
    console.log(line)
    await page.close()
  }
} finally { await browser.close(); srv.close() }
console.log(fails ? `prd34-thumbs: ${fails} FAILED` : 'prd34-thumbs: ALL PASS')
process.exit(fails ? 1 : 0)
