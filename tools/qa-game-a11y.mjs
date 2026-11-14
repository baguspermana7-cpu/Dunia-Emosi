#!/usr/bin/env node
// qa-game-a11y — PRD-28 (docs/prd/PRD-28-kontras-target-sentuh-semua.md): a 5-year-old's finger needs a big target and
// a child's eyes need text that stands out. Per page (hub + every game page, first screen, 390x844 phone portrait):
//   touch: every visible, enabled button / link / [role=button] / [onclick] / input / select with a side under 48 px.
//          PRIMARY = the buttons a child must hit to play (label starts mulai/main/ayo/lanjut/start/play, or a class
//          naming a choice/answer/option/arrow/start/play control)
//   contrast: text colour against the REAL pixels behind it (a second screenshot with all text made transparent, median
//          luminance under the text box), WCAG ratio < 4.5 (< 3 for large text: >= 24 px, or >= 18.66 px bold).
//          Text with a stroke or a text-shadow is counted apart (an outline carries legibility) and not judged.
//   L1 per-page report + tools/a11y-baseline.json
//   L2 ratchet: a page whose small-target or low-contrast count rises fails; QA_UPDATE=1 rewrites the numbers
//   L3 primary buttons under 48 px: 0 on every page (not a ratchet)
//   red: QA_PLANT=1 shrinks one primary-looking button on the hub to 30 px and adds one grey-on-grey line
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-game-a11y.mjs   (or through tools/run-gates.mjs)
// run-gates: timeout 900
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const BASELINE = path.join(ROOT, 'tools/a11y-baseline.json')
const ONLY = process.env.QA_PAGES ? new RegExp(process.env.QA_PAGES) : null
const pages = ['/index.html', ...fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html') && !f.startsWith('_')).sort().map(f => '/games/' + f)].filter(pg => !ONLY || ONLY.test(pg))
const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {}
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const now = {}, primaryBad = {}
for (const pg of pages) {
  const ctx = await b.createBrowserContext(), p = await ctx.newPage()
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
  await p.evaluateOnNewDocument(() => {
    localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }]))
    localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off')
  })
  try { await p.goto(BASE + pg, { waitUntil: 'load', timeout: 60000 }) } catch (e) { console.log('  ! ' + pg + ' ' + e.message) }
  await sleep(3500)
  // freeze motion so both screenshots see the same frame
  await p.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' })
  if (process.env.QA_PLANT && pg === '/index.html') {
    await p.evaluate(() => {
      const bt = document.createElement('button'); bt.textContent = 'Mulai'; bt.className = 'qa-plant-start'
      bt.style.cssText = 'position:fixed;left:20px;top:300px;width:30px;height:30px;font:12px sans-serif;z-index:99999;padding:0'
      const t = document.createElement('div'); t.textContent = 'Teks abu-abu di atas abu-abu'
      t.style.cssText = 'position:fixed;left:20px;top:360px;font:16px sans-serif;color:#9a9a9a;background:#b4b4b4;z-index:99999;padding:4px'
      document.body.append(bt, t)
    })
  }
  await sleep(300)
  const res = await p.evaluate(() => {
    const W = innerWidth, H = innerHeight
    const vis = e => {
      const r = e.getBoundingClientRect()
      if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.right <= 0 || r.top >= H || r.left >= W) return null
      for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
        const cs = getComputedStyle(x)
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return null
      }
      const cx = Math.min(W - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(H - 1, Math.max(0, r.top + r.height / 2))
      const top = document.elementFromPoint(cx, cy)
      if (top && top !== e && !e.contains(top) && !top.contains(e)) return null // covered by something else
      return r
    }
    const label = e => (e.getAttribute('aria-label') || e.textContent || e.title || e.value || '').replace(/\s+/g, ' ').trim().slice(0, 30)
    const PRIM_TXT = /^(mulai|main|ayo|lanjut|start|play)\b/i, PRIM_CLS = /choice|answer|\bopt|\bans|arrow|dpad|start|play/i
    const small = [], prim = []
    for (const e of document.querySelectorAll('button, a[href], [role=button], [onclick], input:not([type=hidden]), select')) {
      if (e.disabled) continue
      const r = vis(e); if (!r) continue
      if (Math.min(r.width, r.height) >= 48) continue
      const lb = label(e), item = `${lb || e.tagName.toLowerCase() + '.' + (e.className || '').toString().slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`
      small.push(item)
      if (PRIM_TXT.test(lb) || PRIM_CLS.test((e.className || '').toString())) prim.push(item)
    }
    const texts = []
    for (const e of document.querySelectorAll('body *')) {
      if (/^(SCRIPT|STYLE|NOSCRIPT|OPTION|CANVAS|svg)$/i.test(e.tagName)) continue
      let own = ''
      for (const n of e.childNodes) if (n.nodeType === 3) own += n.textContent
      own = own.trim()
      if (!own || !/\p{L}|\p{N}/u.test(own)) continue
      const r = vis(e); if (!r) continue
      const cs = getComputedStyle(e)
      const m = cs.color.match(/[\d.]+/g).map(Number)
      if (m.length > 3 && m[3] < 0.1) continue
      const fs = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700
      const outlined = (cs.textShadow && cs.textShadow !== 'none') || parseFloat(cs.webkitTextStrokeWidth || 0) > 0
      texts.push({ t: own.slice(0, 30), fg: m.slice(0, 3), large: fs >= 24 || (fs >= 18.66 && bold), outlined,
        box: [Math.max(0, r.left), Math.max(0, r.top), Math.min(W, r.right), Math.min(H, r.bottom)].map(Math.round) })
    }
    return { small, prim, texts }
  })
  // the background each text actually sits on: hide all text, screenshot, read the pixels under each box in the page
  await p.addStyleTag({ content: '*{color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important;caret-color:transparent!important}' })
  await sleep(150)
  // two background frames 400 ms apart: a canvas game keeps moving behind its text, so a text counts as low only when it
  // is low on both (a flake otherwise; seen once on a clean tree, 18 vs 17)
  const shots = [await p.screenshot({ encoding: 'base64' })]
  await sleep(400); shots.push(await p.screenshot({ encoding: 'base64' }))
  const lowsOf = png => p.evaluate(async (png, texts) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d'); g.drawImage(img, 0, 0)
    const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    const L = ([r, gg, bb]) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(bb)
    const out = []
    for (const t of texts) {
      if (t.outlined) continue
      const [x0, y0, x1, y1] = t.box, w = x1 - x0, h = y1 - y0
      if (w < 1 || h < 1) continue
      const d = g.getImageData(x0, y0, w, h).data, ls = []
      for (let i = 0; i < d.length; i += 16) ls.push(L([d[i], d[i + 1], d[i + 2]]))
      ls.sort((a, b2) => a - b2)
      const bgL = ls[ls.length >> 1], fgL = L(t.fg)
      const ratio = (Math.max(bgL, fgL) + 0.05) / (Math.min(bgL, fgL) + 0.05)
      if (ratio < (t.large ? 3 : 4.5)) out.push(`${JSON.stringify(t.t)} ${ratio.toFixed(1)}`)
    }
    return out
  }, png, res.texts)
  const [la, lb] = [await lowsOf(shots[0]), await lowsOf(shots[1])]
  const key = x => x.replace(/ [\d.]+$/, '')
  const lows = la.filter(x => lb.some(y => key(y) === key(x)))
  const outlined = res.texts.filter(t => t.outlined).length
  now[pg] = { small: res.small.length, lowContrast: lows.length }
  primaryBad[pg] = res.prim
  console.log(`     ${pg} small ${res.small.length}, primary small ${res.prim.length}, low contrast ${lows.length} of ${res.texts.length - outlined} plain texts (${outlined} outlined)` +
    (res.prim.length ? `\n        primary: ${res.prim.slice(0, 4).join(' | ')}` : '') +
    (lows.length ? `\n        contrast: ${lows.slice(0, 4).join(' | ')}` : '') +
    (res.small.length ? `\n        small: ${res.small.slice(0, 4).join(' | ')}` : ''))
  await ctx.close()
}
await b.close()

const up = pages.filter(pg => base[pg] && (now[pg].small > base[pg].small || now[pg].lowContrast > base[pg].lowContrast))
for (const pg of up) ok(false, `L2 ${pg} rose above the baseline: ${JSON.stringify(now[pg])} vs ${JSON.stringify(base[pg])}`)
ok(!up.length, `L2 no page has more small targets or low-contrast texts than ${path.relative(ROOT, BASELINE)}`)
ok(pages.every(pg => pg in base) || !!process.env.QA_UPDATE, `L2 every page has a baseline (${pages.filter(pg => !(pg in base)).join(' ') || 'all'})`)
const primTotal = Object.values(primaryBad).reduce((a, x) => a + x.length, 0)
ok(primTotal === 0, `L3 primary play buttons under 48 px: ${primTotal}${primTotal ? ' - ' + Object.entries(primaryBad).filter(([, v]) => v.length).map(([k, v]) => k + ': ' + v.join(', ')).join(' / ') : ''}`)
const tot = k => Object.values(now).reduce((a, x) => a + x[k], 0)
console.log(`  L1 totals: ${tot('small')} small targets, ${tot('lowContrast')} low-contrast texts on ${pages.length} pages`)
if (process.env.QA_UPDATE) { fs.writeFileSync(BASELINE, JSON.stringify({ ...base, ...now }, null, 1) + '\n'); console.log('  baseline written: ' + BASELINE) }
console.log(`qa-game-a11y: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
