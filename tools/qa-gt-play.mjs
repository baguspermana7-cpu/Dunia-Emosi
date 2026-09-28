// G29 Garasi Tempur — play gate. Drives the REAL page with real taps (touch on phones and
// tablets, mouse on the desktop size), the way a child meets it:
//   A) home: zero page errors / console errors / failed requests / HTTP >= 400; the four
//      menu buttons are visible, fully on screen and >= 44 px tall;
//   B) a whole Latihan battle from the home screen (menu -> team -> battle): every human
//      turn follows the coach — read __gt.state().coach, tap the ONE thing that glows
//      (hand card -> #act-go; field truck -> #atkbar attack; Selesai), answer the challenge
//      overlay, wait for the computer; then Monster Rush (tap answers for its 15 s) and
//      the result table with both totals. A battle that needs > 60 human turns, or a turn
//      that stops moving, fails with a state dump;
//   C) layout on every human turn: the battle table (#me-field, #op-field, #hand, #coach,
//      #btn-end; #side-me/#side-op in the older markup) inside the viewport, no horizontal scroll, coach text never empty,
//      the glowing target actually tappable (it is the topmost element somewhere on it)
//      and >= 44 px;
//   D) one run with the 4-card tutorial ON (tapped through #tut-next), one run with
//      prefers-reduced-motion, one 2-player run where BOTH seats are driven by taps;
//   E) 2 players = a FIXED split screen: every control of seat p lives in #half-p<p>
//      (P1 = bottom half, upright; P2 = top half, turned 180°). On every human turn: each
//      seat's hand / SELESAI / DEK / BENSIN / panel / truck / coach stays in ITS half of the
//      screen, the top half really is rotated, only the live half is lit, and across >= 3
//      turn switches nothing moves (same rects as the first turn — no swap, no hand-over).
// QA_SIZES="390x844,..." limits the size matrix ("none" = no 1-player runs) · QA_PVP_SIZES the 2-player runs (QA_SIZES=none QA_EXTRA=pvp QA_PAR=1 = only those, one at a time) · QA_EXTRA=0 skips D · QA_SHOTS=<dir>
// writes screenshots · QA_FAULT=1 injects an engine fault (the gate MUST then fail).
import puppeteer from 'puppeteer'
import fs from 'node:fs'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('❌ ' + msg) } }
const URL = 'http://localhost:8081/games/garasi-tempur.html'
const sizes = v => v === 'none' ? [] : v.split(',').map(s => s.split('x').map(Number))
const SIZES = sizes(process.env.QA_SIZES || '390x844,844x390,360x740,768x1024,1024x768,1280x800')
// 2-player runs: a landscape tablet (the usual way two kids share one) and a phone in portrait
const PVP_SIZES = sizes(process.env.QA_PVP_SIZES || '1024x768,390x844')
const EXTRA = process.env.QA_EXTRA !== '0'
const SHOTS = process.env.QA_SHOTS || ''
const FAULT = !!process.env.QA_FAULT
const MAX_TURNS = 60
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true })

// one browser per run: a page that is not the browser's front tab gets its animation
// frames throttled, which stalls the game's motion promises and even touch dispatch —
// a gate artifact, not a game bug. Each run owns its own front tab.
async function open (w, h, o = {}) {
  const touch = w < 1200
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
  const p = (await b.pages())[0] || await b.newPage()
  p.__browser = b
  await p.setViewport({ width: w, height: h, isMobile: touch, hasTouch: touch })
  if (o.reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  if (FAULT) {
    // mutation test: the 3rd real command the engine is handed throws once. why() calls
    // apply WITHOUT an id, send() always stamps one, so only a real command counts.
    await p.evaluateOnNewDocument(() => {
      let E, n = 0
      Object.defineProperty(window, 'GTEngine', { configurable: true, get: () => E,
        set: v => { E = v; const a = v.apply; v.apply = function (s, c) { if (c && c.id && ++n === 3) throw new Error('QA_FAULT injected'); return a.apply(this, arguments) } } })
    })
  }
  if (process.env.QA_DEBUG) {
    // input trace, printed when a coached tap does not do what the coach promised
    await p.evaluateOnNewDocument(() => {
      window.__trace = []
      const nm = e => e && e.nodeType === 1 ? (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) : String(e)
      for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'lostpointercapture'])
        addEventListener(t, e => { __trace.push(`${Math.round(performance.now())} ${t} ${nm(e.target)} id=${e.pointerId ?? ''}`); if (__trace.length > 60) __trace.shift() }, true)
      addEventListener('DOMContentLoaded', () => {
        const bar = document.getElementById('actbar')
        if (bar) new MutationObserver(() => __trace.push(`${Math.round(performance.now())} actbar -> ${bar.className}`)).observe(bar, { attributes: true, attributeFilter: ['class'] })
        const hand = document.getElementById('hand')
        if (hand) new MutationObserver(() => __trace.push(`${Math.round(performance.now())} hand re-rendered (${hand.children.length})`)).observe(hand, { childList: true })
      })
    })
  }
  const errs = []
  p.on('pageerror', e => errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/favicon/.test(r.url())) errs.push('failed ' + r.url() + ' ' + (r.failure() || {}).errorText) })
  p.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()) })
  const cdp = await p.target().createCDPSession(); await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  let ok = false
  for (const t of [45000, 120000]) { try { await p.goto(URL, { waitUntil: 'networkidle2', timeout: t }); ok = true; break } catch (e) { console.log(`  retry navigation (${e.message.slice(0, 60)})`) } }
  if (!ok) throw new Error('navigation failed twice')
  await p.waitForFunction(() => window.__gt, { timeout: 20000 })
  await p.evaluate(t => { __gt.reset(); __gt.setTut(t) }, !o.tutorial)
  await p.reload({ waitUntil: 'networkidle2' })      // home() re-reads the fresh save
  await p.waitForFunction(() => window.__gt, { timeout: 20000 })
  return { p, errs, touch }
}

// a tap on the part of the element that is really on top (a fanned hand card is half
// covered by its neighbour): null when no point of it can receive the tap
async function spot (p, sel, root) {
  // sample a 9x9 grid over the element; the tap goes to the on-top sample deepest inside
  // the exposed region (not an edge that a glow/bob animation can slide out from under)
  return p.evaluate((s, r) => {
    const els = [...(r ? document.querySelector(r) || document : document).querySelectorAll(s)].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 })
    const e = els[0]; if (!e) return null
    const b = e.getBoundingClientRect(), N = 9, on = []
    for (let j = 0; j < N; j++) { on.push([]); for (let i = 0; i < N; i++) {
      const x = b.left + b.width * (i + 0.5) / N, y = b.top + b.height * (j + 0.5) / N
      const t = x >= 0 && y >= 0 && x <= innerWidth && y <= innerHeight ? document.elementFromPoint(x, y) : null
      on[j].push(!!t && (t === e || e.contains(t)))
    } }
    let best = null, n = 0, cols = new Set()
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (!on[j][i]) continue
      n++; cols.add(i)
      let d = 0; while (d < N && [[i - d - 1, j], [i + d + 1, j], [i, j - d - 1], [i, j + d + 1]].every(([a, c]) => a >= 0 && c >= 0 && a < N && c < N && on[c][a])) d++
      if (!best || d > best.d) best = { d, x: b.left + b.width * (i + 0.5) / N, y: b.top + b.height * (j + 0.5) / N }
    }
    // exposed width: how much of the element a finger can actually land on
    const exposedW = Math.round(cols.size / N * b.width)
    if (!best) return { x: -1, y: -1, w: b.width, h: b.height, covered: true, exposedW: 0 }
    return { x: best.x, y: best.y, w: b.width, h: b.height, exposed: n / (N * N), exposedW }
  }, sel, root || null)
}
async function tap (ctx, sel, root) {
  let r = null
  // the target must hold still (a drawn card flies in AFTER the turn is handed over) and be
  // on top somewhere; a toast or banner passing over it gets a moment to clear
  for (let k = 0; k < 12; k++) {
    const a = await spot(ctx.p, sel, root); await sleep(120); r = await spot(ctx.p, sel, root)
    if (r && a && !r.covered && Math.abs(a.x - r.x) < 1 && Math.abs(a.y - r.y) < 1) break
    await sleep(150)
  }
  if (!r) return { ok: false, why: 'missing' }
  if (r.covered) return { ok: false, why: 'covered/off-screen', r }
  if (ctx.touch) await ctx.p.touchscreen.tap(r.x, r.y); else await ctx.p.mouse.click(r.x, r.y)
  await sleep(90)
  return { ok: true, r }
}
const st = p => p.evaluate(() => __gt.state())
// the answer to the question on screen ("8 − 2 = ?", "3 + 4 = ?"), or null
const solve = (p, sel) => p.evaluate(s => {
  const e = document.querySelector(s); if (!e) return null
  const m = /(\d+)\s*([+\-−–x×:÷])\s*(\d+)/.exec(e.textContent); if (!m) return null
  const a = +m[1], c = +m[3]
  return { '+': a + c, '-': a - c, '−': a - c, '–': a - c, x: a * c, '×': a * c, ':': a / c, '÷': a / c }[m[2]]
}, sel)
// the control a coached step taps: the classic #table ids (1 player) or the live seat's
// own half (2 players: -p0 bottom, -p1 top)
const K = (ctx, k, a) => ctx.pvp
  ? ({ hand: `#hand-p${a}`, actgo: `#act-go-p${a}`, actbar: `#actbar-p${a}`, actwhy: `#act-why-p${a}`, field: `#field-p${a}`, atkbar: `#atkbar-p${a}`, end: `#btn-end-p${a}`, chal: `#chal-p${a}`, coach: `#coach-p${a}` })[k]
  : ({ hand: '#hand', actgo: '#act-go', actbar: '#actbar', actwhy: '#act-why', field: '#me-field', atkbar: '#atkbar', end: '#btn-end', chal: '#chal', coach: '#coach' })[k]
const shot = async (ctx, name) => { if (SHOTS) await ctx.p.screenshot({ path: `${SHOTS}/${ctx.tag}-${name}.png` }) }

async function checkHome (ctx) {
  const h = await ctx.p.evaluate(() => ['btn-adv', 'btn-practice', 'btn-pvp', 'btn-col'].map(id => {
    const e = document.getElementById(id), b = e.getBoundingClientRect(), cs = getComputedStyle(e)
    return { id, vis: cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0, on: b.left >= -1 && b.top >= -1 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1, h: Math.round(b.height) }
  }))
  for (const x of h) {
    check(x.vis && x.on, `${ctx.tag} home: #${x.id} visible and fully on screen`)
    check(x.h >= 44, `${ctx.tag} home: #${x.id} >= 44 px tall (${x.h})`)
  }
  check(await ctx.p.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth), `${ctx.tag} home: no horizontal scroll`)
  // every home button/label: on screen, and its words not cut off by the tile
  const hb = await ctx.p.evaluate(() => {
    const name = e => e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.')
    const off = [], cut = []
    for (const e of document.querySelectorAll('#scr-home button, #scr-home button *')) {
      const cs = getComputedStyle(e), b = e.getBoundingClientRect()
      if (cs.display === 'none' || cs.visibility === 'hidden' || b.width < 2) continue
      if (e.tagName === 'BUTTON' && (b.left < -2 || b.right > innerWidth + 2 || b.top < -2 || b.bottom > innerHeight + 2)) off.push(name(e))
      if (e.textContent.trim() && !e.children.length && (e.scrollWidth > e.clientWidth + 2)) cut.push(name(e) + ' "' + e.textContent.trim().slice(0, 20) + '"')
      // text wider than the tile that holds it (tile clips with overflow:hidden)
      const tile = e.closest('button')
      if (tile && tile !== e && e.textContent.trim() && !e.children.length) { const t = tile.getBoundingClientRect(); if (b.right > t.right + 2 || b.left < t.left - 2) cut.push(name(e) + ' "' + e.textContent.trim().slice(0, 20) + '" wider than its tile') }
    }
    return { off, cut }
  })
  check(hb.off.length === 0, `${ctx.tag} home: every button on screen${hb.off.length ? ' — ' + hb.off.slice(0, 5).join(', ') : ''}`)
  check(hb.cut.length === 0, `${ctx.tag} home: no label cut off by its tile${hb.cut.length ? ' — ' + hb.cut.length + ': ' + hb.cut.slice(0, 5).join(' | ') : ''}`)
  await shot(ctx, 'home')
}

// layout of the battle table on a human turn
async function checkTable (ctx, seen) {
  const L = await ctx.p.evaluate(() => {
    const out = {}
    // the battle table: my field, the opponent's field, hand, coach, Selesai (the first
    // selector of each pair that exists — the table markup has had two shapes)
    for (const alts of [['#me-field', '#side-me'], ['#op-field', '#side-op'], ['#hand'], ['#coach'], ['#btn-end']]) {
      const s = alts.find(x => document.querySelector(x)) || alts[0], e = document.querySelector(s)
      if (!e) { out[s] = false; continue }
      const b = e.getBoundingClientRect()
      out[s] = b.left >= -1 && b.top >= -1 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1 && b.width > 0
    }
    // anything else on the table that sticks out of the screen, or whose text is cut off
    // by its own box (hand cards fan by design and the backdrop is full-bleed: skipped)
    const name = e => e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.')
    const vis = e => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 }
    const els = [...document.querySelectorAll('#table *')].filter(e => !e.closest('#hand, #bt-scene, .hc') && vis(e))
    const offscreen = [], clipped = []
    for (const e of els) {
      const b = e.getBoundingClientRect(); if (b.width < 2 || b.height < 2) continue
      if (b.left < -2 || b.top < -2 || b.right > innerWidth + 2 || b.bottom > innerHeight + 2) offscreen.push(name(e) + ` [${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.right)},${Math.round(b.bottom)}]`)
      const cs = getComputedStyle(e)
      if (/hidden|clip/.test(cs.overflowX + cs.overflowY) && e.textContent.trim() && !e.querySelector('img') &&
          (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) && cs.textOverflow !== 'ellipsis') clipped.push(name(e) + ' "' + e.textContent.trim().slice(0, 24) + '"')
    }
    // pieces of the table that must not sit on top of each other (a covered HP number or
    // a label under the Selesai button is information the child cannot read)
    const R = sel => { const e = document.querySelector(sel); if (!e || !vis(e)) return null; const b = e.getBoundingClientRect(); return b.width > 1 ? b : null }
    const ov = (a, c) => a && c ? Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) * Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)) : 0
    const overlaps = []
    for (const [x, y] of [['#deck', '#fuel'], ['#fuel', '#btn-end'], ['#deck', '#btn-end'], ['#coach', '#me-field .field-card'], ['#coach', '#op-field .field-card'],
      ['#me-panel', '#me-field .field-card'], ['#op-panel', '#op-field .field-card'], ['#turn-panel', '#op-field .field-card'], ['#turn-panel', '#me-field .field-card'],
      ['#arena-card', '#op-field .field-card'], ['#arena-card', '#me-field .field-card'], ['#me-count', '#me-field .field-card'], ['#turn-panel', '#coach'], ['#arena-card', '#coach']]) {
      const a = ov(R(x), R(y)); if (a > 40) overlaps.push(`${x} x ${y} (${Math.round(a)} px²)`)
    }
    // words that spill out of their tile (drawn over a neighbour, not clipped)
    const TILES = '#fuel, #deck, #btn-end, #me-panel, #op-panel, #turn-panel, #arena-card, #coach, #me-count, #op-cnt, .obox'
    for (const e of document.querySelectorAll('#table *')) {
      if (e.closest('#hand, #bt-scene, .hc, .field-card') || !vis(e)) continue
      const tile = e.closest(TILES); if (!tile) continue
      for (const n of e.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue
        const rg = document.createRange(); rg.selectNodeContents(n)
        const t = rg.getBoundingClientRect(), T = tile.getBoundingClientRect()
        if (t.width && (t.left < T.left - 2 || t.right > T.right + 2 || t.top < T.top - 2 || t.bottom > T.bottom + 2)) overlaps.push(`text "${n.textContent.trim().slice(0, 20)}" spills out of ${name(tile)}`)
      }
    }
    return { out, overlaps, offscreen: offscreen.slice(0, 6), nOff: offscreen.length, clipped: clipped.slice(0, 6), nClip: clipped.length, hscroll: document.scrollingElement.scrollWidth > innerWidth, coach: document.getElementById('coach').textContent.trim(),
      endH: Math.round((document.getElementById('btn-end') || document.body).getBoundingClientRect().height) }
  })
  for (const [s, ok] of Object.entries(L.out)) if (!ok && !seen.has('off' + s)) { seen.add('off' + s); check(false, `${ctx.tag}: ${s} inside the viewport`) }
  for (const o of L.overlaps) if (!seen.has('ov' + o.split(' (')[0])) { seen.add('ov' + o.split(' (')[0]); await shot(ctx, 'FAIL-overlap'); check(false, `${ctx.tag}: battle table pieces do not overlap — ${o}`) }
  if (L.nOff && !seen.has('offall')) { seen.add('offall'); await shot(ctx, 'FAIL-offscreen'); check(false, `${ctx.tag}: nothing on the battle table sticks out of the screen (${L.nOff}: ${L.offscreen.join(', ')})`) }
  if (L.nClip && !seen.has('clip')) { seen.add('clip'); check(false, `${ctx.tag}: no text cut off by its box on the battle table (${L.nClip}: ${L.clipped.join(' | ')})`) }
  if (L.hscroll && !seen.has('hs')) { seen.add('hs'); check(false, `${ctx.tag}: no horizontal scroll in battle`) }
  if (!L.coach && !seen.has('coach')) { seen.add('coach'); check(false, `${ctx.tag}: coach text never empty on the human's turn`) }
  if (L.endH < 44 && !seen.has('endh')) { seen.add('endh'); check(false, `${ctx.tag}: Selesai >= 44 px (${L.endH})`) }
}

// 2 players: the fixed split screen (E)
async function checkPv (ctx, seen, stats, s) {
  const L = await ctx.p.evaluate(() => {
    const R = e => { if (!e) return null; const b = e.getBoundingClientRect(); return b.width > 1 && b.height > 1 ? { l: b.left, t: b.top, r: b.right, b: b.bottom, cy: b.top + b.height / 2 } : null }
    const parts = ['hand', 'btn-end', 'deck', 'fuel', 'panel', 'coach']
    const seats = [0, 1].map(p => {
      const o = {}
      for (const k of parts) o[k] = R(document.getElementById(k + '-p' + p))
      o.truck = R(document.querySelector('#field-p' + p + ' .field-card, #field-p' + p + ' .active-slot'))
      return o
    })
    const tf = p => getComputedStyle(document.querySelector('#half-p' + p + ' .pv-in')).transform
    const vis = e => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 }
    const name = e => e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.')
    const offscreen = [], clipped = [], overlaps = []
    for (const e of document.querySelectorAll('#pvp *')) {
      if (e.closest('.u-hand, .hc, .pop-bar, .chal') || !vis(e)) continue
      const b = e.getBoundingClientRect(); if (b.width < 2 || b.height < 2) continue
      if (b.left < -2 || b.top < -2 || b.right > innerWidth + 2 || b.bottom > innerHeight + 2) offscreen.push(name(e) + ` [${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.right)},${Math.round(b.bottom)}]`)
      const cs = getComputedStyle(e)
      if (/hidden|clip/.test(cs.overflowX + cs.overflowY) && e.textContent.trim() && !e.querySelector('img') &&
          (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) && cs.textOverflow !== 'ellipsis') clipped.push(name(e) + ' "' + e.textContent.trim().slice(0, 24) + '"')
    }
    const ov = (a, c) => a && c ? Math.max(0, Math.min(a.r, c.r) - Math.max(a.l, c.l)) * Math.max(0, Math.min(a.b, c.b) - Math.max(a.t, c.t)) : 0
    for (const [p, S] of seats.entries()) for (const [x, y] of [['deck', 'fuel'], ['fuel', 'btn-end'], ['deck', 'btn-end'], ['coach', 'truck'], ['panel', 'truck'], ['panel', 'coach'], ['hand', 'truck'], ['hand', 'panel'], ['hand', 'coach']]) {
      const a = ov(S[x], S[y]); if (a > 40) overlaps.push(`P${p + 1} ${x} x ${y} (${Math.round(a)} px²)`)
    }
    // the middle band's two turn labels and arena chips: nothing in it sits on top of each other
    const mids = ['#pv-who-0', '#pv-who-1', '#pv-arena-0', '#pv-arena-1', '#btn-pause-pv'].map(q => [q, R(document.querySelector(q))])
    for (let i = 0; i < mids.length; i++) for (let j = i + 1; j < mids.length; j++) { const a = ov(mids[i][1], mids[j][1]); if (a > 40) overlaps.push(`${mids[i][0]} x ${mids[j][0]} (${Math.round(a)} px²)`) }
    return { seats, tf: [tf(0), tf(1)], on: [0, 1].map(p => document.getElementById('half-p' + p).classList.contains('on')),
      coach: [0, 1].map(p => ({ txt: document.getElementById('coach-p' + p).textContent.trim(), step: document.getElementById('coach-p' + p).getAttribute('data-step') })),
      offscreen: offscreen.slice(0, 6), nOff: offscreen.length, clipped: clipped.slice(0, 6), nClip: clipped.length, overlaps,
      hscroll: document.scrollingElement.scrollWidth > innerWidth, oldTable: getComputedStyle(document.getElementById('table')).display, H: innerHeight }
  })
  const once = (k, ok, msg) => { if (!ok && !seen.has(k)) { seen.add(k); check(false, `${ctx.tag}: ${msg}`) } else if (ok && !seen.has('ok' + k)) { seen.add('ok' + k); check(true, msg) } }
  const a = s.active
  once('oldtable', L.oldTable === 'none', 'the 1-player table is not drawn in 2-player mode')
  once('rot0', L.tf[0] === 'none', `P1's half (bottom) is upright (${L.tf[0]})`)
  once('rot1', /^matrix\(-1, 0, 0, -1/.test(L.tf[1]), `P2's half (top) is turned 180° to face P2 (${L.tf[1]})`)
  once('lit', L.on[a] && !L.on[1 - a], `only the live seat's half is lit (active P${a + 1}, on=${L.on})`)
  once('coachlive', !!L.coach[a].txt && L.coach[a].step !== 'wait', `the live seat's coach names a step ("${L.coach[a].txt.slice(0, 30)}")`)
  once('coachwait', L.coach[1 - a].step === 'wait' && !!L.coach[1 - a].txt, `the waiting seat's coach says wait ("${L.coach[1 - a].txt.slice(0, 30)}")`)
  for (const [p, S] of L.seats.entries()) for (const [k, r] of Object.entries(S)) {
    const inHalf = r && (p === 0 ? r.cy > L.H / 2 : r.cy < L.H / 2)
    once(`half${p}${k}`, inHalf, `P${p + 1}'s ${k} stays in the ${p === 0 ? 'BOTTOM' : 'TOP'} half (centre y ${r ? Math.round(r.cy) : 'missing'} of ${L.H})`)
  }
  // nothing swaps: every seat part keeps the rect it had on the first human turn
  if (!stats.pvRef) stats.pvRef = L.seats
  else if (stats.lastActive !== a) {
    stats.switches = (stats.switches || 0) + 1
    const moved = []
    for (const p of [0, 1]) for (const k of ['hand', 'btn-end', 'deck', 'fuel', 'panel']) {
      const A = stats.pvRef[p][k], B = L.seats[p][k]
      if (!A || !B || Math.abs(A.l - B.l) > 2 || Math.abs(A.t - B.t) > 2 || Math.abs(A.r - B.r) > 2 || Math.abs(A.b - B.b) > 2) moved.push(`P${p + 1} ${k}`)
    }
    if (moved.length && !seen.has('moved')) { seen.add('moved'); await shot(ctx, 'FAIL-swap'); check(false, `${ctx.tag}: nothing moves when the turn passes (switch ${stats.switches}: ${moved.join(', ')})`) }
    if (stats.switches <= 3 && !moved.length) check(true, `${ctx.tag}: turn switch ${stats.switches} (to P${a + 1}): both halves stayed put`)
    if (stats.switches === 1) await shot(ctx, 'pvp-switch1')
  }
  stats.lastActive = a
  for (const o of L.overlaps) if (!seen.has('ov' + o.split(' (')[0])) { seen.add('ov' + o.split(' (')[0]); await shot(ctx, 'FAIL-overlap'); check(false, `${ctx.tag}: split-screen pieces do not overlap — ${o}`) }
  if (L.nOff && !seen.has('offall')) { seen.add('offall'); await shot(ctx, 'FAIL-offscreen'); check(false, `${ctx.tag}: nothing on the split screen sticks out (${L.nOff}: ${L.offscreen.join(', ')})`) }
  if (L.nClip && !seen.has('clip')) { seen.add('clip'); check(false, `${ctx.tag}: no text cut off by its box on the split screen (${L.nClip}: ${L.clipped.join(' | ')})`) }
  if (L.hscroll && !seen.has('hs')) { seen.add('hs'); check(false, `${ctx.tag}: no horizontal scroll in battle`) }
}

const dump = ctx => ctx.p.evaluate(() => {
  const s = __gt.state(), E = __gt.engine(), g = id => document.getElementById(id) || document.getElementById(id + '-p' + s.active) || { className: '', textContent: '' }
  return JSON.stringify({ s, chal: g('chal').className, actbar: g('actbar').className,
    coach: g('coach').textContent, guides: [...document.querySelectorAll('.guide')].map(e => e.id || e.className),
    legal: __gt.legal().map(c => c.type), pending: E && E.pending, tut: document.getElementById('tut').className })
})

// one human step following the coach. returns a label for the log, or null when it could not act
async function humanStep (ctx, seen, stats) {
  const s = await st(ctx.p)
  const step = s.coach, a = s.active, k = n => K(ctx, n, a)
  if (step === 'truck' || step === 'fuel' || step === 'part' || step === 'swap' || step === 'discard') {
    const t = await tap(ctx, `${k('hand')} .hc.guide`)
    if (!t.ok) { if (!seen.has('g' + step)) { seen.add('g' + step); await shot(ctx, 'FAIL-glow-' + step); check(false, `${ctx.tag}: coach says "${step}" but the glowing hand card can't be tapped (${t.why})`) } return null }
    if (t.r.exposedW < 44 && !seen.has('exp' + step)) { seen.add('exp' + step); await shot(ctx, 'FAIL-exposed-' + step); check(false, `${ctx.tag}: the glowing "${step}" hand card shows >= 44 px a finger can hit (${t.r.exposedW} px of ${Math.round(t.r.w)})`) }
    const bar = await ctx.p.evaluate(q => ({ show: document.querySelector(q[0]).classList.contains('show'), dis: document.querySelector(q[1]).disabled, why: document.querySelector(q[2]).textContent }), [k('actbar'), k('actgo'), k('actwhy')])
    if (!bar.show || bar.dis) { if (!seen.has('bar' + step)) { seen.add('bar' + step); await shot(ctx, 'FAIL-bar-' + step); if (process.env.QA_DEBUG) console.log((await ctx.p.evaluate(() => __trace.slice(-25))).join('\n'), '\n tapped at', JSON.stringify(t.r)); check(false, `${ctx.tag}: a glowing "${step}" card opens an enabled action button (show=${bar.show} disabled=${bar.dis} ${bar.why})`) } return null }
    if (!stats.shotMid && step !== 'truck') { stats.shotMid = true; await shot(ctx, 'battle-select') }
    const g = await tap(ctx, k('actgo'))
    if (g.ok && g.r.h < 44 && !seen.has('acth')) { seen.add('acth'); check(false, `${ctx.tag}: action button >= 44 px (${Math.round(g.r.h)})`) }
    if (!g.ok) { check(false, `${ctx.tag}: action button tappable (${g.why})`); return null }
    return step
  }
  if (step === 'attack') {
    // tap the glowing truck on my field -> the attack chooser opens -> tap an enabled attack
    const fc = await tap(ctx, `${k('field')} .field-card.guide, ${k('field')} .field-card`)
    if (!fc.ok) { if (!seen.has('gfc')) { seen.add('gfc'); await shot(ctx, 'FAIL-truck-tap'); check(false, `${ctx.tag}: my truck card on the field is tappable to attack (${fc.why})`) } return null }
    await ctx.p.waitForFunction(q => document.querySelector(q + '.show .atk-b'), { timeout: 3000 }, k('atkbar')).catch(() => {})
    if (!stats.shotAtk) { stats.shotAtk = true; await shot(ctx, 'battle-mid') }
    const t = await tap(ctx, `${k('atkbar')} .atk-b.guide:not(.off)`, k('atkbar'))
    if (!t.ok) { if (!seen.has('gatk')) { seen.add('gatk'); await shot(ctx, 'FAIL-attack-chooser'); check(false, `${ctx.tag}: the attack chooser shows a glowing, tappable attack (${t.why})`) } return null }
    if (t.r.h < 44 && !seen.has('atkh')) { seen.add('atkh'); await shot(ctx, 'FAIL-attack-size'); check(false, `${ctx.tag}: attack button >= 44 px tall (${Math.round(t.r.w)}x${Math.round(t.r.h)})`) }
    const on = await ctx.p.evaluate(q => { const b = document.querySelector(q).getBoundingClientRect(); return b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1 }, k('atkbar'))
    if (!on && !seen.has('atkon')) { seen.add('atkon'); check(false, `${ctx.tag}: the attack chooser is fully on screen`) }
    return step
  }
  if (step === 'end') {
    const t = await tap(ctx, k('end'))
    if (!t.ok) { check(false, `${ctx.tag}: Selesai tappable (${t.why})`); return null }
    return step
  }
  if (!seen.has('step' + step)) { seen.add('step' + step); check(false, `${ctx.tag}: coach names a known step on the human's turn (got "${step}")`) }
  return null
}

async function battle (ctx, o = {}) {
  const { p } = ctx
  const seen = new Set(), stats = { humanTurns: 0, steps: 0, chal: 0, turnsSeen: new Set() }
  const t0 = Date.now()
  let lastSig = '', lastMove = Date.now(), ok = true
  while (true) {
    const s = await st(p)
    if (s.screen === 'scr-rush' || s.screen === 'scr-result') break
    if (Date.now() - t0 > 12 * 60000) { check(false, `${ctx.tag}: battle finishes inside 12 min — ${await dump(ctx)}`); ok = false; break }
    // tutorial cards
    if (await p.evaluate(() => document.getElementById('tut').classList.contains('show'))) {
      stats.tut = (stats.tut || 0) + 1
      if (stats.tut === 1) await shot(ctx, 'tutorial')
      const t = await tap(ctx, '#tut-next'); if (!t.ok) { check(false, `${ctx.tag}: tutorial "Lanjut" tappable (${t.why})`); ok = false; break }
      await sleep(250); continue
    }
    // challenge overlay (human seat): answer with a tap
    // (2 players: the challenge opens in the attacker's own half — #chal-p0 bottom, #chal-p1 top)
    const chal = await p.evaluate(() => { const c = document.querySelector('#chal.show, #scr-battle .chal.show'); return c ? { n: c.querySelectorAll('.chal-b:not([disabled])').length, id: c.id } : { n: -1 } })
    if (chal.n > 0) {
      stats.chal++
      if (stats.chal === 1) await shot(ctx, 'challenge')
      if (o.pvp) {
        const a = (await st(p)).active
        if (chal.id !== `chal-p${a}` && !seen.has('chalhalf')) { seen.add('chalhalf'); check(false, `${ctx.tag}: the challenge opens in the attacker's half (#chal-p${a}, got #${chal.id})`) }
        if (a === 1 && !stats.shotChal2) { stats.shotChal2 = true; await shot(ctx, 'challenge-p2') }
      }
      // a child who knows the sums: right on 2 of every 3 questions, wrong on the 3rd
      const ans = await solve(p, `#${chal.id} .chal-q`)
      const wrong = stats.chal % 3 === 0 || ans == null
      const t = await tap(ctx, ans == null ? '.chal-b:not([disabled])' : wrong ? `.chal-b:not([disabled]):not([data-v="${ans}"])` : `.chal-b[data-v="${ans}"]`, '#' + chal.id)
      if (t.ok && t.r.h < 44 && !seen.has('chalh')) { seen.add('chalh'); check(false, `${ctx.tag}: challenge answer >= 44 px (${Math.round(t.r.h)})`) }
      if (!t.ok) { check(false, `${ctx.tag}: challenge answer tappable (${t.why})`); ok = false; break }
      await sleep(300); continue
    }
    const busy = await p.evaluate(() => __gt.busy())
    const mine = await p.evaluate(() => document.getElementById('scr-battle').classList.contains('my-turn'))
    const sig = JSON.stringify([s.turn, s.active, s.phase, s.hand, s.coach, s.ko, busy])
    if (sig !== lastSig) { lastSig = sig; lastMove = Date.now() }
    if (Date.now() - lastMove > 25000) { await shot(ctx, 'FAIL-stuck'); check(false, `${ctx.tag}: battle keeps moving (stuck 25 s) — ${await dump(ctx)}`); ok = false; break }
    if (busy || !mine || s.phase === 'over' || s.phase === 'challenge') { await sleep(120); continue }
    // a human turn, settled (2 players: P1 and P2 share a turn number)
    if (!stats.turnsSeen.has(s.turn + ':' + s.active)) {
      stats.turnsSeen.add(s.turn + ':' + s.active); stats.humanTurns++
      if (stats.humanTurns > MAX_TURNS) { check(false, `${ctx.tag}: battle ends within ${MAX_TURNS} human turns — ${await dump(ctx)}`); ok = false; break }
    }
    await sleep(60)
    if (ctx.pvp) await checkPv(ctx, seen, stats, s); else await checkTable(ctx, seen)
    const did = await humanStep(ctx, seen, stats)
    if (!did) {                                     // could not follow the coach: try ending the turn so the run goes on
      await tap(ctx, K(ctx, 'end', s.active)); await sleep(200); await tap(ctx, K(ctx, 'end', s.active))
    } else stats.steps++
    await sleep(150)
  }
  if (!ok) return stats
  // Monster Rush
  await p.waitForFunction(() => __gt.state().screen === 'scr-rush', { timeout: 15000 }).catch(() => {})
  check((await st(p)).screen === 'scr-rush', `${ctx.tag}: the battle ends in Monster Rush`)
  await p.waitForFunction(() => document.querySelector('#rush-host .rush-b:not([disabled])'), { timeout: 12000 }).catch(() => {})
  let rushTaps = 0, rushShot = false
  const r0 = Date.now()
  while ((await st(p)).screen === 'scr-rush' && Date.now() - r0 < 40000) {
    const halves = o.pvp ? ['.rh-0', '.rh-1'] : ['.rh-0']
    for (const [hi, hsel] of halves.entries()) {
      const ans = await solve(p, `#rush-q${hi}`)
      const t = await tap(ctx, `${hsel} .rush-b:not([disabled])${ans != null ? `[data-v="${ans}"]` : ''}`, '#rush-host')
      if (t.ok) { rushTaps++; if (t.r.h < 44 && !seen.has('rushh')) { seen.add('rushh'); check(false, `${ctx.tag}: rush answer >= 44 px (${Math.round(t.r.h)})`) } }
      if (!rushShot && rushTaps >= 2) { rushShot = true; await shot(ctx, 'rush') }
    }
    await sleep(250)
  }
  check(rushTaps >= 3, `${ctx.tag}: Monster Rush answers can be tapped (${rushTaps} taps)`)
  if (o.pvp) check((stats.switches || 0) >= 3, `${ctx.tag}: the 2-player run saw >= 3 turn switches with nothing moving (${stats.switches || 0})`)
  await p.waitForFunction(() => __gt.state().screen === 'scr-result', { timeout: 15000 }).catch(() => {})
  await sleep(1500)                                 // count-up
  // (2 players: the result is split too — #res-half-p1 on top turned to face P2, #res-half-p0
  // upright at the bottom, each with its own outcome and its own Main Lagi / Kembali)
  const res = await p.evaluate(pv => { const R = pv ? '#res-pv' : '#res-table'; return { scr: __gt.state().screen, cols: document.querySelectorAll(R + ' .res-col').length,
    tot: [...document.querySelectorAll(R + ' .res-total b')].map(b => ({ shown: b.textContent, n: b.getAttribute('data-n') })),
    title: pv ? [1, 0].map(i => document.querySelector('#res-half-p' + i + ' .rp-title').textContent).join(' / ') : document.getElementById('res-title').textContent,
    btns: (pv ? ['res-again-p0', 'res-home-p0', 'res-again-p1', 'res-home-p1'] : ['res-again', 'res-home']).map(id => { const b = document.getElementById(id).getBoundingClientRect(); return b.height >= 44 && b.bottom <= innerHeight + 1 && b.top >= -1 && b.left >= -1 && b.right <= innerWidth + 1 }),
    pvHalf: pv ? [0, 1].map(i => { const el = document.getElementById('res-half-p' + i), r = el.getBoundingClientRect(), cy = r.top + r.height / 2
      const bt = document.getElementById('res-again-p' + i).getBoundingClientRect(), by = bt.top + bt.height / 2
      return { rot: getComputedStyle(el.querySelector('.rp-in')).transform, inHalf: i === 0 ? cy > innerHeight / 2 && by > innerHeight / 2 : cy < innerHeight / 2 && by < innerHeight / 2,
        title: el.querySelector('.rp-title').textContent, ko: el.querySelectorAll('.rp-ko .kodots i').length, prize: !!el.querySelector('.rp-prize img') } }) : null,
    hscroll: document.scrollingElement.scrollWidth > innerWidth } }, !!o.pvp)
  if (o.pvp) {
    const [h0, h1] = res.pvHalf, w = await p.evaluate(() => __gt.engine().winner), draw = await p.evaluate(() => __gt.engine().draw)
    check(h0.rot === 'none' && /^matrix\(-1, 0, 0, -1/.test(h1.rot) && h0.inHalf && h1.inHalf, `${ctx.tag}: split result — P1 half upright at the bottom, P2 half turned 180° on top (${h0.rot} / ${h1.rot})`)
    check([h0, h1].every((h, i) => h.title === (draw ? 'Seri!' : w === i ? 'Kamu Menang!' : 'Hampir! Ayo main lagi') && h.ko === 3 && h.prize), `${ctx.tag}: each seat reads its own outcome + KO pips + prize ("${h0.title}" / "${h1.title}", winner P${w + 1})`)
  }
  check(res.scr === 'scr-result' && res.cols === 2 && res.tot.length === 2 && res.tot.every(t => t.n !== null && /^\d+$/.test(t.shown) && t.shown === t.n),
    `${ctx.tag}: result shows #res-table with two totals (${JSON.stringify(res.tot)} "${res.title}")`)
  check(res.btns.every(Boolean), `${ctx.tag}: result buttons (Main Lagi / Menu) on screen WITHOUT scrolling and >= 44 px (a child will not look for them below the fold)`)
  check(!res.hscroll, `${ctx.tag}: result has no horizontal scroll`)
  await shot(ctx, 'result')
  console.log(`  ${ctx.tag}: ${stats.humanTurns} human turns, ${stats.steps} coached steps, ${stats.chal} challenges, ${rushTaps} rush taps, ${Math.round((Date.now() - t0) / 1000)} s — "${res.title}"`)
  return stats
}

async function run (w, h, o = {}) {
  const tag = `${w}x${h}${o.label ? '-' + o.label : ''}`
  let ctx
  try { ctx = { ...(await open(w, h, o)), tag, pvp: !!o.pvp } } catch (e) { check(false, `${tag}: the page loads and exposes __gt — ${e.message}`); return }
  try {
    await checkHome(ctx)
    // home -> team picker -> battle, by taps
    const btn = o.pvp ? '#btn-pvp' : '#btn-practice'
    let t = await tap(ctx, btn); check(t.ok, `${tag}: ${btn} tappable (${t.why || ''})`)
    await sleep(300)
    t = await tap(ctx, '#team-list .team[data-k="api"]'); check(t.ok, `${tag}: team card tappable (${t.why || ''})`)
    if (o.pvp) { await sleep(300); t = await tap(ctx, '#team-list .team[data-k="baja"]'); check(t.ok, `${tag}: player 2 team tappable (${t.why || ''})`) }
    await sleep(600)
    check((await st(ctx.p)).screen === 'scr-battle', `${tag}: a battle starts from the home screen by taps`)
    const stats = await battle(ctx, o)
    if (o.tutorial) check(stats.tut === 4, `${tag}: the tutorial shows 4 cards (${stats.tut || 0})`)
    const errs = ctx.errs
    check(errs.length === 0, `${tag}: no page errors / console errors / failed requests${errs.length ? ' — ' + errs.slice(0, 4).join(' | ') : ''}`)
  } catch (e) {
    check(false, `${tag}: gate crashed — ${e.message}`)
  } finally { await ctx.p.__browser.close() }
}

{
  const jobs = SIZES.map(([w, h]) => () => run(w, h))
  if (EXTRA) {
    if (process.env.QA_EXTRA !== 'pvp') {         // QA_EXTRA=pvp: only the 2-player runs
      jobs.push(() => run(390, 844, { tutorial: true, label: 'tutorial' }))
      jobs.push(() => run(844, 390, { reduced: true, label: 'reduced-motion' }))
    }
    for (const [w, h] of PVP_SIZES) jobs.push(() => run(w, h, { pvp: true, label: 'pvp' }))
  }
  // three pages at a time: a battle is mostly waiting on the computer's paced turns
  const PAR = +(process.env.QA_PAR || 3)
  let i = 0
  await Promise.all(Array.from({ length: Math.min(PAR, jobs.length) }, async () => { while (i < jobs.length) await jobs[i++]() }))
}
console.log(`\n${passes} passed, ${fails.length} failed${FAULT ? '  (QA_FAULT: a failure here is the point)' : ''}`)
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS')
process.exit(fails.length ? 1 : 0)
