#!/usr/bin/env node
// qa-action-latency — idea #30: law 15 (qa-dunia-cinema-input) times a NEUTRAL probe button; this gate times the
// game's OWN actions (answers, arrows, cards, start buttons, the canvas) the way a child plays them.
//
// Per page, twice — bare (?nocine=1) and with the cinema layer — in a fresh browser context with the same seeded
// Math.random, a deterministic tapper plays the page: each step it collects the elements a finger can actually hit
// (hit-tested, visible, not disabled; settings/sound/parent/destructive controls and off-page links are skipped) and
// taps the one tapped least so far, ways back (close/back/home) last (DOM order breaks ties). Every tap is timed from the touch event's own timestamp
// to two frames after the page's handlers ran (input queue + handlers + the frame that shows the result).
//   L1 reach: the tapper reached at least 3 different actions on every page (a gate that taps nothing proves nothing)
//   L2 layer cost: on the actions tapped in BOTH runs, the median with the layer is within 25 ms of bare
//      (over the line once = both sides measured again, the better medians compared, as law 15 does)
//   L3 every tap shows: no tap waits more than 1 s for its frame (a hung handler / blocked main thread)
//   L4 no page error during play with the layer that the bare page does not also throw
// Usage: BASE=http://127.0.0.1:8097/ node tools/qa-action-latency.mjs   (QA_ONLY=regex, QA_TAPS=16, QA_SIZE=tablet)
// or through the runner, which serves the tree itself: node tools/run-gates.mjs --only qa-action-latency
import fs from 'fs'
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const BASE = process.env.BASE || 'http://localhost:8090/Dunia-Emosi/'
const TAPS = +(process.env.QA_TAPS || 16)
const SIZE = process.env.QA_SIZE === 'tablet' ? [800, 1280, 2] : [390, 844, 3]
const SKIP = new Set(['mojo-chase-embed.html', 'blippi.html', 'film-anak.html', 'film-play.html'])
let PAGES = ['index.html'].concat(fs.readdirSync('games').filter(f => f.endsWith('.html') && !f.startsWith('_') && !SKIP.has(f)).sort().map(f => 'games/' + f))
if (process.env.QA_ONLY) { const re = new RegExp(process.env.QA_ONLY); PAGES = PAGES.filter(p => re.test(p)) }
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|googleapis|gstatic|unpkg|AudioContext|play\(\) request/i
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }
const median = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN }

// in the page before any script: seeded Math.random (both runs see the same questions) and the tap timer
function instrument () {
  let s = 20261112
  Math.random = function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  window.__lat = []
  // every element that registers a tap handler is tappable, cursor or not (start overlays are bare divs); a handler
  // on window/document means the game reads taps anywhere (canvas games)
  const TAP = /^(click|pointerdown|pointerup|touchstart|touchend|mousedown|mouseup)$/
  window.__tap = new WeakSet(); window.__anyTap = false
  const add = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    if (TAP.test(type)) { if (this instanceof Element) window.__tap.add(this); else if (this === window || this === document || this === document.body) window.__anyTap = true }
    return add.call(this, type, fn, o)
  }
  addEventListener('pointerdown', e => {
    const k = window.__k, ts = e.timeStamp
    if (!k) return
    window.__k = null
    requestAnimationFrame(() => requestAnimationFrame(() => window.__lat.push({ k, ms: performance.now() - ts })))
  }, true)
}

// what a finger can hit right now: [{key, x, y}] in DOM order
function candidates () {
  // never: settings, sound, parent area, destructive or off-page. Last resort: ways back (a modal's close is the only
  // way on, so it is tapped once nothing else is left)
  const OFF = /pengaturan|setting|orang ?tua|parent|suara|sound|music|musik|mute|full ?screen|layar penuh|share|bagikan|install|pasang|reset|hapus|delete|logout|ganti anak|profil/i
  const BACK = /kembali|keluar|rumah|home|back|exit|close|tutup|batal|✕|×/i
  const W = innerWidth, H = innerHeight, seen = new Set(), out = []
  const els = [...document.querySelectorAll('body *')].filter(e => {
    const t = e.tagName
    if (t === 'BUTTON' || t === 'CANVAS' || t === 'A' || e.getAttribute('role') === 'button' || e.hasAttribute('onclick') || e.onclick || e.onpointerdown || e.ontouchstart || window.__tap.has(e)) return true
    return getComputedStyle(e).cursor === 'pointer'
  })
  for (const e of els) {
    if (e.disabled || e.closest('[data-dcine],[aria-hidden="true"],[inert]')) continue
    if (e.tagName === 'A' && !/^(#|javascript:)/.test(e.getAttribute('href') || '#')) continue
    const label = (e.id + ' ' + e.className + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.title || '') + ' ' + (e.textContent || '').slice(0, 40))
    if (OFF.test(label)) continue
    const r = e.getBoundingClientRect()
    if (r.width < 16 || r.height < 16) continue
    const x = Math.min(Math.max(r.left + r.width / 2, 2), W - 2), y = Math.min(Math.max(r.top + r.height / 2, 2), H - 2)
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue
    const hit = document.elementFromPoint(x, y)
    if (!hit || (hit !== e && !e.contains(hit)) || seen.has(hit)) continue
    // the innermost pointer element owns the hit: an outer card containing this button is skipped by the seen set
    seen.add(hit)
    const cls = typeof e.className === 'string' ? e.className.trim().split(/\s+/)[0] : ''
    // a bare element is named by its words (digits dropped: answers change, the action does not)
    const words = (e.getAttribute('aria-label') || e.textContent || '').replace(/[^A-Za-z]+/g, ' ').trim().toLowerCase().slice(0, 12)
    out.push({ key: e.tagName.toLowerCase() + (e.id ? '#' + e.id : cls ? '.' + cls : words ? ':' + words : ''), x, y, back: BACK.test(label) })
  }
  if (out.every(c => c.back) && (window.__anyTap || document.onclick || document.body.onclick)) {
    const x = W / 2, y = H * 0.6, hit = document.elementFromPoint(x, y)
    if (hit && !hit.closest('[data-dcine]')) out.push({ key: 'screen', x, y, back: false })
  }
  return out
}

async function play (b, url) {
  const ctx = await b.createBrowserContext()
  const p = await ctx.newPage()
  await p.setViewport({ width: SIZE[0], height: SIZE[1], deviceScaleFactor: SIZE[2], isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(instrument)
  const errs = []
  p.on('pageerror', e => { if (!IGNORE.test(String(e))) errs.push(String(e).slice(0, 140)) })
  p.on('dialog', d => d.dismiss().catch(() => {}))
  const home = url.split('#')[0].split('?')[0]
  await p.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(e => errs.push('goto ' + e.message))
  await sleep(7000)   // past the layer's 6 s grace, as law 15
  const count = new Map(), taps = [], missing = []
  let resets = 0
  for (let i = 0; i < TAPS; i++) {
    if (p.url().split('#')[0].split('?')[0] !== home) {     // the tap left the page: come back, at most 3 times
      if (++resets > 3) break
      await p.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(() => {}); await sleep(2500)
    }
    const c = await p.evaluate(candidates).catch(() => [])
    if (!c.length) { await sleep(500); continue }
    const w = t => (count.get(t.key) || 0) + (t.back ? 3 : 0)
    c.sort((a, z) => w(a) - w(z))   // least tapped first, ways back last; stable: DOM order within equal weight
    const t = c[0]
    if (process.env.QA_DEBUG) console.log('   step', i, 'tap', t.key, '| of', c.map(x => x.key + (count.get(x.key) || '')).join(' ').slice(0, 300))
    count.set(t.key, (count.get(t.key) || 0) + 1)
    const before = await p.evaluate(k => { window.__k = k; return window.__lat.length }, t.key).catch(() => 0)
    await p.touchscreen.tap(t.x, t.y).catch(() => {})
    const got = await p.waitForFunction(n => window.__lat && window.__lat.length > n, { timeout: 1000 }, before).then(() => true).catch(() => false)
    if (got) taps.push(await p.evaluate(n => window.__lat[n], before))
    else if (p.url().split('#')[0].split('?')[0] === home && await p.evaluate(() => window.__k).catch(() => null) === null) missing.push(t.key)   // the touch arrived, no frame within 1 s
    await sleep(450)
  }
  await ctx.close()
  return { taps, missing, errs, keys: [...count.keys()] }
}

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist'] })
const summary = []
for (const pg of PAGES) {
  const tag = pg.replace('games/', '').replace('.html', '')
  try {
    const bareUrl = BASE + pg + (pg.includes('?') ? '&' : '?') + 'nocine=1'
    let bare = await play(b, bareUrl), on = await play(b, BASE + pg)
    const cmp = (B, O) => {
      const both = new Set(B.taps.map(t => t.k).filter(k => O.taps.some(t => t.k === k)))
      return { both, bm: median(B.taps.filter(t => both.has(t.k)).map(t => t.ms)), om: median(O.taps.filter(t => both.has(t.k)).map(t => t.ms)) }
    }
    let r = cmp(bare, on)
    if (r.om > r.bm + 25) {      // a busy page swings; measure both again, keep each side's better median
      const bare2 = await play(b, bareUrl), on2 = await play(b, BASE + pg), r2 = cmp(bare2, on2)
      if (r2.both.size >= 3) r = { both: r.both.size >= r2.both.size ? r.both : r2.both, bm: Math.min(r.bm, r2.bm), om: Math.min(r.om, r2.om) }
    }
    const all = on.taps.map(t => t.ms), worst = Math.max(0, ...all)
    console.log(`${tag}: ${on.taps.length} taps on ${on.keys.length} actions, ${r.both.size} shared; median ${r.om.toFixed(0)} ms (bare ${r.bm.toFixed(0)}), worst ${worst.toFixed(0)} ms ${[...r.both].slice(0, 6).join(' ')}`)
    summary.push({ page: tag, taps: on.taps.length, actions: on.keys.length, shared: r.both.size, median: Math.round(r.om), bare: Math.round(r.bm), worst: Math.round(worst), missing: on.missing })
    ok(r.both.size >= 3, `${tag}: L1 only ${r.both.size} actions tapped in both runs (${on.keys.join(' ')})`)
    ok(r.both.size < 3 || r.om <= r.bm + 25, `${tag}: L2 an action takes ${r.om.toFixed(0)} ms to show with the layer, ${r.bm.toFixed(0)} ms bare`)
    ok(!on.missing.length && worst <= 1000, `${tag}: L3 a tap waited over 1 s for its frame (${on.missing.slice(0, 3).join(' ')} worst ${worst.toFixed(0)} ms)`)
    const fresh = on.errs.filter(e => !bare.errs.some(x => x.slice(0, 60) === e.slice(0, 60)))
    ok(!fresh.length, `${tag}: L4 page errors only with the layer: ${fresh.slice(0, 2).join(' | ')}`)
    if (bare.errs.length) console.log(`  note ${tag}: bare page errors too: ${bare.errs.slice(0, 2).join(' | ')}`)
  } catch (e) { ok(false, `${tag}: crashed ${e.message.slice(0, 140)}`) }
}
await b.close()
if (process.env.QA_OUT) fs.writeFileSync(process.env.QA_OUT, JSON.stringify(summary, null, 1))
console.log(`qa-action-latency: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
