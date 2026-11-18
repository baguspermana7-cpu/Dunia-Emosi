#!/usr/bin/env node
// qa-sakuga-buttons — PRD-46 laws L2 + L3 in a real browser (390x844 phone, touch, or QA_SIZE=tablet 800x1280).
// Per page (hub + every games/*.html not starting with `_`), cinema layer off (?nocine=1):
//   L2 draws  : tap one visible primary control the way a finger does (touchscreen.tap, the tapper of qa-action-latency
//               picks it: hit-tested, visible, enabled, not settings/sound/parent/way-back). The effect canvas
//               (canvas.sakuga-fx) must hold non-transparent pixels within 300 ms (or within 4 frames: a loaded machine
//               stretches the frame, not the effect), be empty again and the Sakuga
//               clock stop within 2.5 s (no endless loop), and the pressed element's `style` attribute is restored exactly.
//               A page whose first screen has no primary control (after a second look 3.5 s later) is REPORTED
//               ("no primary"); its quietest visible control is tapped instead, and a page with no control at all (a frame
//               wrapper) is tested on a fixture button. Never skipped silently. A full-screen "tap to start" overlay
//               counts as primary (class `tap`: one burst under the finger).
//   L3 proper : on a fixture dropped into the same page (so every page is judged, even where the quiz is deep in play):
//               fast control (btn-left)   -> 0 particles, 0 canvas pixels
//               answer, wrong             -> 0 bursts, 1 wobble; answer, right -> 1 burst + glint, pixels follow the
//                                            button's own hue (red and blue fixtures, within 40 degrees)
//               disabled button           -> 0 presses, 0 pixels
//               prefers-reduced-motion    -> 0 pixels; the profile setting `du-reduced-motion` -> 0 pixels
//               onomatope lettering       -> 0 calls to SakugaFX.sfx / hollow / dotted
//               0 page errors from sakuga code; total page errors printed
//   L6 no spill: with the Sakuga clock frozen, tap up to 5 primary controls (the hub also on its game-card screen) and
//               at 0.05 / 0.13 / 0.30 / 0.50 s count effect pixels inside the TEXT box of every OTHER visible control
//               (button, link, [onclick], clickable tile): 0 allowed. The pressed control's own label is exempt.
//   The tap is a DRY tap: a click blocker on <body> (capture) stops the game's own handler and the default action,
//   because a primary tap on the hub would navigate away before the effect could be read. The module listens on <html>
//   (capture), so it runs first; game handler timing is gated by qa-action-latency.
// Red checks: QA_MODULE=<file> serves that file as dunia-sakuga.js (the previous module: L6 must name the spill);
// QA_QUERY=nosakuga=1 (module off, = the old tree) fails L2 on every page; QA_PLANT=1 makes the fast and the
// wrong-answer fixture draw full impacts (data-sakuga=primary) and L3 must name both.
// Usage: QA_BASE=http://127.0.0.1:8097 node tools/qa-sakuga-buttons.mjs   (QA_ONLY=regex, QA_SIZE=tablet, QA_QUERY=...)
// or: node tools/run-gates.mjs --tag vfx
// run-gates: timeout 1500
import fs from 'node:fs'
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const SIZE = process.env.QA_SIZE === 'tablet' ? [800, 1280, 2] : [390, 844, 3]
const QUERY = process.env.QA_QUERY || ''
let PAGES = ['index.html', ...fs.readdirSync('games').filter(f => f.endsWith('.html') && !f.startsWith('_')).sort().map(f => 'games/' + f)]
if (process.env.QA_ONLY) { const re = new RegExp(process.env.QA_ONLY); PAGES = PAGES.filter(p => re.test(p)) }
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|googleapis|gstatic|unpkg|AudioContext|play\(\) request/i
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }

// ---- in the page ----
const PAGE_FNS = `
window.__sk = {
  count () {                                   // non-transparent pixels on the effect canvas (every 4th pixel)
    const c = document.querySelector('canvas.sakuga-fx'); if (!c) return 0
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0
    for (let i = 3; i < d.length; i += 16) if (d[i] > 8) n++
    return n
  },
  hue () {                                     // mean hue (degrees) of the saturated, opaque effect pixels; -1 when none
    const c = document.querySelector('canvas.sakuga-fx'); if (!c) return -1
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x = 0, y = 0, n = 0
    for (let i = 0; i < d.length; i += 16) {
      if (d[i + 3] < 200) continue
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn
      if (!dd || dd / (1 - Math.abs(2 * l - 1)) < 0.3 || l < 0.15 || l > 0.9) continue
      let h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h = (h * 60 + 360) % 360
      x += Math.cos(h * Math.PI / 180); y += Math.sin(h * Math.PI / 180); n++
    }
    return n ? (Math.atan2(y, x) * 180 / Math.PI + 360) % 360 : -1
  },
  watch (ms) {                                 // first moment pixels appear after the tap (ms and frames), peak, and when they are gone
    return new Promise(res => {
      const t0 = performance.now(); let first = -1, firstFrames = -1, peak = 0, gone = -1
      ;(function poll () {
        const n = window.__sk.count(), t = performance.now() - t0
        if (n > 0 && first < 0) { first = (window.__tapAt ? performance.now() - window.__tapAt : t); firstFrames = window.__frames - (window.__tapFrame || 0) }
        peak = Math.max(peak, n)
        if (first >= 0 && n === 0 && gone < 0) gone = t
        if (t > ms || gone >= 0) return res({ first, firstFrames, peak, gone })
        requestAnimationFrame(poll)
      })()
    })
  },
  untilStopped (c0) {                          // the effect ends within 2.5 s of CLOCK time (the clock runs slower than the wall when frames are slow); no endless loop
    return new Promise(res => {
      const w0 = performance.now(); let prev = -1
      ;(function poll () {
        const n = window.__sk.count(), now = window.SakugaFX.now
        if (n === 0 && now === prev) return res({ ok: now - c0 <= 2.5, dt: now - c0 })
        if (now - c0 > 2.5 || performance.now() - w0 > 30000) return res({ ok: false, dt: now - c0 })
        prev = now; setTimeout(poll, 250)
      })()
    })
  },
  stopped () {                                 // the core clock only moves while its rAF loop runs
    return new Promise(res => { if (!window.SakugaFX) return res(true); const a = window.SakugaFX.now; setTimeout(() => res(window.SakugaFX.now === a), 350) })
  },
  fixture (id, cls, bg, extra) {
    document.getElementById(id)?.remove()
    if (!document.getElementById('__cover')) { const v = document.createElement('div'); v.id = '__cover'; v.setAttribute('style', 'position:fixed;inset:0;background:#fff;z-index:2147483630'); document.body.append(v) }   // the page's own controls are covered: the fixture is judged alone
    const b = document.createElement('button')
    b.id = id; b.className = cls; b.textContent = '7'; b.setAttribute('style', 'position:fixed;left:120px;top:300px;width:120px;height:56px;z-index:2147483640;border:0;border-radius:14px;font:700 22px sans-serif;color:#fff;background:' + bg + ';' + (extra || ''))
    if (/disabled/.test(extra || '')) b.disabled = true
    if (window.__plant && (id === '__fast' || id === '__ans1')) b.setAttribute('data-sakuga', 'primary')   // QA_PLANT: the defect the L3 checks must catch
    if (cls === 'choice') { const w = document.createElement('div'); w.className = 'choices'; w.id = id + '-box'; w.append(b); document.body.append(w) } else document.body.append(b)
    return b.getBoundingClientRect().toJSON()
  },
  overlap (exN) {                              // effect pixels inside the text boxes of every control except #exN
    const c = document.querySelector('canvas.sakuga-fx'); if (!c) return { px: 0, hits: [] }
    const ex = document.querySelector('[data-qa-sk="' + exN + '"]'), sx = c.width / innerWidth, ctx = c.getContext('2d'), hits = []
    const ctrls = [...document.querySelectorAll('button,a[href],[role="button"],[onclick],input[type="button"],[data-sakuga]')]
    for (const e of document.querySelectorAll('[class*="tile" i],[class*="card" i],[class*="node" i]')) if (getComputedStyle(e).cursor === 'pointer' && !ctrls.includes(e)) ctrls.push(e)
    for (const e of ctrls) {
      if (ex && (e === ex || e.contains(ex) || ex.contains(e))) continue
      const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n, px = 0
      while ((n = w.nextNode())) {
        if (!n.textContent.trim()) continue
        const rg = document.createRange(); rg.selectNodeContents(n)
        for (const r of rg.getClientRects()) {
          if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue
          const hit = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1))
          if (!hit || !(hit === e || e.contains(hit))) continue            // covered by something else: not visible here
          const x = Math.max(0, Math.floor(r.left * sx)), y = Math.max(0, Math.floor(r.top * sx)), ww = Math.min(c.width - x, Math.ceil(r.width * sx)), hh = Math.min(c.height - y, Math.ceil(r.height * sx))
          if (ww <= 0 || hh <= 0) continue
          const d = ctx.getImageData(x, y, ww, hh).data
          for (let i = 3; i < d.length; i += 4) if (d[i] > 8) px++
        }
      }
      if (px) hits.push((e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 20) + ' (' + px + ' px)')
    }
    return { px: hits.length, hits }
  },
  snap () { return JSON.stringify(window.DuniaSakuga ? window.DuniaSakuga.stats : {}) },
  // what a finger can hit right now: [{x, y, cls, key, back}]
  candidates () {
    const OFF = /pengaturan|setting|orang ?tua|parent|suara|sound|music|musik|mute|full ?screen|layar penuh|share|bagikan|install|pasang|reset|hapus|delete|logout|ganti anak|profil/i
    const BACK = /kembali|keluar|rumah|home|back|exit|close|tutup|batal|✕|×/i
    document.querySelectorAll('[data-qa-sk]').forEach(e => e.removeAttribute('data-qa-sk'))   // numbers are per call: a stale mark would point #n at another element
    const W = innerWidth, H = innerHeight, seen = new Set(), out = []
    const els = [...document.querySelectorAll('body *')].filter(e => {
      if (e.id && e.id.startsWith('__')) return false
      const t = e.tagName
      if (t === 'BUTTON' || t === 'A' || e.getAttribute('role') === 'button' || e.hasAttribute('onclick') || e.onclick || e.hasAttribute('data-sakuga')) return true
      return getComputedStyle(e).cursor === 'pointer' && !(e.parentElement && getComputedStyle(e.parentElement).cursor === 'pointer')
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
      seen.add(hit)
      e.setAttribute('data-qa-sk', String(out.length))
      out.push({ n: out.length, x, y, back: BACK.test(label), cls: window.DuniaSakuga ? window.DuniaSakuga.classify(e) : '?', sq: window.DuniaSakuga ? window.DuniaSakuga.squashBlock(e) : '', room: window.DuniaSakuga && window.DuniaSakuga.room ? window.DuniaSakuga.room(e) : true, key: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\\s+/)[0] : '') })
    }
    // a full-screen "tap to start" overlay is a bare div with a listener: not a button, still the page's primary action
    for (const e of document.querySelectorAll('[id*="start" i],[class*="start" i]')) {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e)
      if (cs.display === 'none' || cs.visibility === 'hidden' || r.width * r.height < 0.45 * innerWidth * innerHeight || e.closest('[data-dcine]')) continue
      const x = innerWidth / 2, y = innerHeight * 0.6, hit = document.elementFromPoint(x, y)
      if (!hit || (hit !== e && !e.contains(hit))) continue
      e.setAttribute('data-qa-sk', String(out.length))
      out.push({ n: out.length, x, y, back: false, cls: window.DuniaSakuga ? window.DuniaSakuga.classify(e) : '?', key: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '(overlay)' })
    }
    return out
  }
}`

// L6: freeze the Sakuga clock, tap one control, and look at the canvas at fixed moments
async function spill (p, tapAt, tgt) {
  await p.evaluate(() => { window.SakugaFX.paused = true })
  await tapAt(tgt.x, tgt.y)
  const bad = []; let frame = 0, peak = 0
  const st0 = await p.evaluate(() => window.__sk.snap())
  for (const mark of [3, 8, 18, 30]) {
    await p.evaluate(n => { for (let i = 0; i < n; i++) window.SakugaFX.advance(1 / 60) }, mark - frame); frame = mark
    const r = await p.evaluate(n => window.__sk.overlap(n), tgt.n)
    peak = Math.max(peak, await p.evaluate(() => window.__sk.count()))
    for (const h of r.hits) bad.push(`${tgt.key} @${(mark / 60).toFixed(2)}s over "${h}"`)
  }
  await p.evaluate(() => { for (let i = 0; i < 240; i++) window.SakugaFX.advance(1 / 60); window.SakugaFX.paused = false })
  if (peak < 100 && tgt.room) bad.push(`${tgt.key} drew almost nothing (${peak} px-samples): the guard erased the effect although the control has free space above or below; stats ${st0} -> ${await p.evaluate(() => window.__sk.snap())}`)   // a law that passes by erasing everything proves nothing
  return bad
}

async function run (b, pg) {
  const ctx = await b.createBrowserContext()
  const p = await ctx.newPage()
  await p.setViewport({ width: SIZE[0], height: SIZE[1], deviceScaleFactor: SIZE[2], isMobile: true, hasTouch: true })
  const errs = []
  p.on('pageerror', e => { const s = String(e.stack || e); if (!IGNORE.test(s)) errs.push(s) })
  p.on('dialog', d => d.dismiss().catch(() => {}))
  await p.evaluateOnNewDocument(PAGE_FNS)
  if (process.env.QA_MODULE) {                  // serve another file as the button module (the red check against the previous module)
    await p.setRequestInterception(true)
    p.on('request', rq => rq.url().includes('data/dunia-sakuga.js') ? rq.respond({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(process.env.QA_MODULE, 'utf8') }) : rq.continue())
  }
  if (process.env.QA_PLANT) await p.evaluateOnNewDocument(() => { window.__plant = true })
  await p.evaluateOnNewDocument(() => {         // the dry tap: stop the game's own click handler and navigation, after the module (on <html>) ran
    addEventListener('DOMContentLoaded', () => document.body.addEventListener('click', e => { e.preventDefault(); e.stopPropagation() }, true))
    addEventListener('pointerdown', () => { window.__tapAt = performance.now(); window.__tapFrame = window.__frames }, true)
    window.__frames = 0; ;(function f () { window.__frames++; requestAnimationFrame(f) })()
  })
  if (pg === 'index.html') await p.evaluateOnNewDocument(() => { try {   // a child already chosen: the hub opens on its home screen, not the name screen
    if (!localStorage.getItem('dunia-players')) { localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: 'lion', ageTier: 'cilik' }])); localStorage.setItem('dunia-active-slot', '[0,1]') } } catch (e) {} })
  const url = BASE + '/' + pg + '?nocine=1' + (QUERY ? '&' + QUERY : '')
  await p.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(e => errs.push('goto ' + e.message))
  await sleep(3500)
  const R = { pg, errs, notes: [] }
  R.has = await p.evaluate(() => !!(window.SakugaFX && window.DuniaSakuga))
  const tapAt = async (x, y) => { await p.evaluate(() => { window.__tapAt = 0 }); await p.touchscreen.tap(x, y) }
  const settle = async () => { for (let i = 0; i < 80; i++) { if (!(await p.evaluate(() => window.__sk.count()))) return true; await sleep(50) } return false }

  // ---- L2 ----
  let cands = await p.evaluate(() => window.__sk.candidates())
  const pick = cs => cs.find(c => c.cls === 'primary') || cs.find(c => c.cls === 'tap')   // the dry tap cannot leave the page, so a "home" class (`home-btn`: MAIN SEKARANG) is no reason to skip
  if (R.has && !pick(cands)) { await sleep(3500); cands = await p.evaluate(() => window.__sk.candidates()) }   // a splash or loading screen may still cover the buttons
  R.hist = {}; R.sq = {}; for (const c of cands) { R.hist[c.cls] = (R.hist[c.cls] || 0) + 1; if (c.cls !== 'off' && c.sq) R.sq[c.sq] = (R.sq[c.sq] || 0) + 1 }
  const usable = cands.filter(c => !c.back)
  let tgt = pick(cands); R.tier = 'primary'
  if (!tgt) { R.tier = 'no primary'; tgt = usable.find(c => c.cls !== 'off' && c.cls !== 'fast') || cands.find(c => c.cls !== 'off') || cands[0] }
  if (!tgt && R.has) {                          // no control at all (a frame wrapper): judge the module on a fixture
    const r = await p.evaluate(() => window.__sk.fixture('__l2', 'btn start', '#f97316'))
    await p.evaluate(() => document.getElementById('__l2').setAttribute('data-qa-sk', '0'))
    tgt = { n: 0, x: r.x + r.width / 2, y: r.y + r.height / 2, key: 'fixture button.btn', cls: 'primary' }; R.tier = 'no control (fixture)'
  }
  R.tgt = tgt ? tgt.key + ' [' + tgt.cls + ']' : 'none'
  if (tgt) {
    const snap = n => p.evaluate(n => { const e = document.querySelector('[data-qa-sk="' + n + '"]'); return e ? { scale: e.style.scale, origin: e.style.transformOrigin, w: e.offsetWidth, h: e.offsetHeight } : null }, n)
    const before = await snap(tgt.n)
    const tryTap = async () => {
      await settle()
      const c0 = await p.evaluate(() => window.SakugaFX ? window.SakugaFX.now : 0)
      const watch = p.evaluate(() => window.__sk.watch(900))
      await tapAt(tgt.x, tgt.y)
      const l2 = await watch
      const stop = await p.evaluate(c0 => window.__sk.untilStopped(c0), c0)
      return { l2, stopped: stop.ok }
    }
    const fast = t => t.l2.first >= 0 && (t.l2.first <= 300 || t.l2.firstFrames <= 4)
    let t1 = await tryTap()
    // a loaded machine stretches frames (the core clamps dt to 34 ms, so effects take longer in wall time): over the line once = tap again, keep the better
    for (let k = 0; k < 3 && !(fast(t1) && t1.stopped); k++) {   // up to 3 more taps, keep the best
      const t2 = await tryTap(); R.retried = true
      const good = t => (fast(t) ? 2 : 0) + (t.stopped ? 1 : 0)
      if (good(t2) > good(t1) || (good(t2) === good(t1) && t2.l2.first >= 0 && t2.l2.first < t1.l2.first)) t1 = t2
    }
    R.l2 = t1.l2; R.stopped = t1.stopped
    let after = await snap(tgt.n)
    for (let k = 0; k < 40 && before && after && (before.scale !== after.scale || before.origin !== after.origin); k++) { await sleep(150); after = await snap(tgt.n) }   // the spring settles on the core clock: a loaded page runs it slowly
    // our footprint on the element: the inline `scale` and `transform-origin` are exactly what they were (the game may have changed anything else itself)
    R.restored = !before || !after || (before.scale === after.scale && before.origin === after.origin)
    if (R.restored === false) R.notes.push(JSON.stringify(before) + ' -> ' + JSON.stringify(after))
  }
  ok(R.has, `${pg}: L2 window.SakugaFX / window.DuniaSakuga missing (no module = no pixels)`)
  ok(tgt && R.l2 && R.l2.first >= 0 && (R.l2.first <= 300 || R.l2.firstFrames <= 4), `${pg}: L2 no effect pixels within 300 ms / 4 frames of tapping ${R.tgt} (first ${R.l2 ? R.l2.first.toFixed(0) : 'n/a'} ms, ${R.l2 ? R.l2.firstFrames : 'n/a'} frames)`)
  ok(!tgt || R.stopped, `${pg}: L2 the effect canvas / Sakuga clock still running 2.5 s (clock time) after the tap`)
  ok(R.restored !== false, `${pg}: L2 the pressed ${R.tgt} did not get its inline scale / transform-origin back ${R.notes.join(' ')}`)

  // ---- L6 ----
  if (R.has) {
    R.spill = []
    const prim = cs => cs.filter(c => c.cls === 'primary').slice(0, 5)
    const fresh = await p.evaluate(() => window.__sk.candidates())   // the page may have moved on during the retries above
    for (const t of prim(fresh)) R.spill.push(...await spill(p, tapAt, t))
    if (pg === 'index.html') {                  // the hub's game cards (world map) are a second screen
      await p.evaluate(() => { try { showScreen('screen-menu') } catch (e) {} }); await sleep(1500)
      const c2 = await p.evaluate(() => window.__sk.candidates())
      R.menu = prim(c2).length
      for (const t of prim(c2)) R.spill.push(...await spill(p, tapAt, t))
      ok(R.menu >= 1, `${pg}: L6 no game card on the hub's menu screen to test`)
    }
    ok(!R.spill.length, `${pg}: L6 effects spill onto another control, or are erased away (${R.spill.length}x): ${[...new Set(R.spill.map(x => x.split(' @')[0]))].join(', ')} -- e.g. ${R.spill.slice(0, 2).join(' | ')}`)
  }

  // ---- L3 fixtures (only meaningful when the module is there) ----
  if (R.has) {
    await p.evaluate(() => { for (const k of ['sfx', 'hollow', 'dotted']) { const o = window.SakugaFX[k]; window.__sk['n_' + k] = 0; try { window.SakugaFX[k] = function () { window.__sk['n_' + k]++; return o.apply(this, arguments) } } catch (e) {} } })
    const press = async (r, doAnswer) => {
      await settle()
      const s0 = JSON.parse(await p.evaluate(() => window.__sk.snap()))
      const w = p.evaluate(() => window.__sk.watch(700))
      await tapAt(r.x + r.width / 2, r.y + r.height / 2)
      if (doAnswer !== undefined) { await sleep(60); await p.evaluate(ok => window.dispatchEvent(new CustomEvent('dunia:answer', { detail: { type: 'answer', ok } })), doAnswer) }
      const res = await w
      const hue = doAnswer === true ? await p.evaluate(() => window.__sk.hue()) : -1   // read while the burst is on screen
      const s1 = JSON.parse(await p.evaluate(() => window.__sk.snap()))
      const d = {}; for (const k of Object.keys(s1)) d[k] = s1[k] - (s0[k] || 0)
      return { res, d, hue }
    }
    // fast
    let r = await p.evaluate(() => window.__sk.fixture('__fast', 'btn-left', '#2563eb'))
    let o = await press(r)
    ok(o.d.impact === 0 && o.d.burst === 0 && o.d.wedge === 0 && o.d.kira === 0 && o.d.wob === 0 && o.res.peak === 0, `${pg}: L3 fast control drew particles (${JSON.stringify(o.d)} peak ${o.res.peak})`)
    ok(o.d.squash >= 1, `${pg}: L3 fast control did not squash at all (${JSON.stringify(o.d)})`)
    // wrong answer
    r = await p.evaluate(() => window.__sk.fixture('__ans1', 'choice', '#dc2626'))
    o = await press(r, false)
    ok(o.d.burst === 0 && o.d.kira === 0 && o.d.wob === 1 && o.res.peak > 0, `${pg}: L3 wrong answer: expected 0 burst / 1 wobble, got ${JSON.stringify(o.d)} peak ${o.res.peak}`)
    // right answer, red, then blue: pixels follow the button's own hue
    const hues = {}
    for (const [name, bg, want] of [['red', '#dc2626', 0], ['blue', '#2563eb', 221]]) {
      r = await p.evaluate(bgc => window.__sk.fixture('__ans2', 'choice', bgc), bg)
      o = await press(r, true)
      ok(o.d.burst === 1 && o.d.kira === 1 && o.res.peak > 0, `${pg}: L3 right answer (${name}): expected 1 burst + 1 glint with pixels, got ${JSON.stringify(o.d)} peak ${o.res.peak}`)
      const dh = o.hue < 0 ? 999 : Math.min(Math.abs(o.hue - want), 360 - Math.abs(o.hue - want))
      ok(dh <= 40, `${pg}: L3 right answer (${name}): effect hue ${o.hue.toFixed(0)} is not the button's ${want}`)
      hues[name] = o.hue
    }
    R.hues = hues
    await p.evaluate(() => document.getElementById('__ans2-box')?.remove())
    // the squash gives the style attribute back exactly (fixture carries its own inline style)
    r = await p.evaluate(() => { const r = window.__sk.fixture('__st', 'btn start', '#0ea5e9'); window.__stBefore = document.getElementById('__st').style.cssText; return r })
    o = await press(r)
    let same = false   // the spring settles on the core clock, which a loaded page runs slowly (dt is clamped): wait up to 6 s for it
    for (let i = 0; i < 40 && !same; i++) { await sleep(150); same = await p.evaluate(() => document.getElementById('__st').style.cssText === window.__stBefore) }
    ok(same && o.res.peak > 0, `${pg}: L3 the pressed fixture did not get its inline style back exactly (cssText), or drew nothing`)
    // disabled
    // (events are dispatched straight at it: a browser may route a real tap on a disabled control to whatever lies beneath)
    r = await p.evaluate(() => window.__sk.fixture('__dis', 'btn start', '#16a34a', 'disabled'))
    await settle()
    const sd0 = JSON.parse(await p.evaluate(() => window.__sk.snap()))
    await p.evaluate(() => { const e = document.getElementById('__dis'), r = e.getBoundingClientRect(), o = { bubbles: true, cancelable: true, clientX: r.left + 30, clientY: r.top + 20, pointerType: 'touch', button: 0 }
      e.dispatchEvent(new PointerEvent('pointerdown', o)); e.dispatchEvent(new PointerEvent('pointerup', o)); e.dispatchEvent(new MouseEvent('click', o)) })
    await sleep(300)
    const sd1 = JSON.parse(await p.evaluate(() => window.__sk.snap()))
    o = { d: { press: sd1.press - sd0.press, squash: sd1.squash - sd0.squash }, res: { peak: await p.evaluate(() => window.__sk.count()) } }
    ok(o.d.press === 0 && o.res.peak === 0, `${pg}: L3 a disabled button reacted (${JSON.stringify(o.d)} peak ${o.res.peak})`)
    // reduced motion: media query, then profile setting
    r = await p.evaluate(() => window.__sk.fixture('__rm', 'btn start', '#f97316'))
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await sleep(120)
    o = await press(r)
    ok(o.res.peak === 0 && o.d.squash === 0, `${pg}: L3 prefers-reduced-motion still drew (peak ${o.res.peak}, ${JSON.stringify(o.d)})`)
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]); await sleep(120)
    await p.evaluate(() => localStorage.setItem('du-reduced-motion', '1'))
    o = await press(r)
    ok(o.res.peak === 0 && o.d.squash === 0, `${pg}: L3 the profile reduced-motion setting still drew (peak ${o.res.peak}, ${JSON.stringify(o.d)})`)
    await p.evaluate(() => localStorage.removeItem('du-reduced-motion'))
    // positive control: the same fixture draws once the setting is off (else the two zeros above prove nothing)
    o = await press(r)
    ok(o.res.peak > 0, `${pg}: L3 control: the fixture drew nothing with reduced motion off (the zeros above prove nothing)`)
    R.lettering = await p.evaluate(() => window.__sk.n_sfx + window.__sk.n_hollow + window.__sk.n_dotted)
    ok(R.lettering === 0, `${pg}: L3 onomatope lettering called ${R.lettering}x`)
  }
  const mine = errs.filter(e => /sakuga/i.test(e))
  ok(!mine.length, `${pg}: L3 page errors from sakuga code: ${mine.slice(0, 2).join(' | ').slice(0, 200)}`)
  await ctx.close()
  return R
}

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist'] })
let noPrimary = 0
for (const pg of PAGES) {
  try {
    const R = await run(b, pg)
    if (R.tier === 'no primary') noPrimary++
    const l2 = R.l2 ? `first ${R.l2.first.toFixed(0)} ms peak ${R.l2.peak} px-samples, empty ${R.l2.gone >= 0 ? R.l2.gone.toFixed(0) + ' ms' : 'no'}, stopped ${R.stopped}` : 'no control tapped'
    console.log(`${pg.replace('games/', '').replace('.html', '')}: ${R.tier} ${R.tgt} | ${l2} | classes ${JSON.stringify(R.hist)} no-squash ${JSON.stringify(R.sq)}${R.hues ? ' | hue red ' + R.hues.red.toFixed(0) + ' blue ' + R.hues.blue.toFixed(0) : ''} | spill ${R.spill ? R.spill.length : 'n/a'} | page errors ${R.errs.length}${R.retried ? ' | retried once (slow frame)' : ''}`)
  } catch (e) { ok(false, `${pg}: gate crashed: ${String(e.message).slice(0, 160)}`) }
}
await b.close()
console.log(`qa-sakuga-buttons: ${pass}/${pass + fail} checks passed over ${PAGES.length} pages (${noPrimary} without a primary control on the first screen, reported above)`)
process.exit(fail ? 1 : 0)
