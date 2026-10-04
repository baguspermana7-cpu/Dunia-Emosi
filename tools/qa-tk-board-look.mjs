// G30 Timmy board look + scene life gate (games/tk-board-look.js/.css).
// Real grid levels of timmy-kapal.html (coast rocks, ice, deep sea, the bedroom deck) at every QA_SIZES size:
//  - layers exist: #tkb-bg (painting copy) under the panels, the board's ground (with the grid's waves), amb, skirt,
//    the vessel's ripple; every rock / iceberg / deck prop is dressed and the art is ordered by row in the DOM
//  - tall art anchored: the image's bottom sits on its tile's bottom (+-3 px, layout boxes)
//  - no art box covers the title plate, the HUD strip, the Perintah panel or the bottom band; the skirt ends above it
//  - tags (z 2) draw above the art (z 1), the vessel (z 5) above both, every added layer is pointer-events:none
//  - elementFromPoint on every palette / action / route button returns that button, and no point on the board
//    (every tile centre) lands inside an added layer
// Plus at 1280x800: pause under an overlay and when hidden, reduced motion = nothing animating in the added layers,
// sounds respect the G30 mute (stub AudioContext counts oscillators), the goal horn fires on a solved level, and the
// idle frame median at 4x CPU <= 18 ms. The look files are injected when the page does not load them yet.
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const BASE = process.env.QA_BASE || 'http://localhost:8081'
const URL_ = BASE + '/games/timmy-kapal.html'
const OUT = process.env.QA_SHOTS || ''; if (OUT) fs.mkdirSync(OUT, { recursive: true })
const sizes = (process.env.QA_SIZES || '1280x800,1024x768,390x844').split(',').map(s => s.split('x').map(Number))
const LEVELS = [['cuttysark', 'cuttysark3'], ['erebus', 'erebus5'], ['maryrose', 'maryrose2'], ['kamar', 'k2'], ['vasa', 'vasa3']]
const sleep = ms => new Promise(r => setTimeout(r, ms))
const issues = []; let passed = 0
function check (ok, msg) { if (ok) passed++; else { issues.push(msg); console.error('FAIL', msg) } }

function stubAudio () {
  window.__oscN = 0
  const P = () => new Proxy({ value: 0 }, { get: (t, k) => (k in t ? t[k] : () => P()), set: (t, k, v) => { t[k] = v; return true } })
  const N = (len) => new Proxy({ length: len || 1024 }, {
    get: (t, k) => {
      if (k in t) return t[k]
      if (k === 'frequency' || k === 'gain' || k === 'Q' || k === 'detune' || k === 'playbackRate' || k === 'pan') return (t[k] = P())
      if (k === 'getChannelData') return () => (t.__ch = t.__ch || new Float32Array(t.length))
      if (k === 'then') return undefined
      return () => N()
    },
    set: (t, k, v) => { t[k] = v; return true }
  })
  function AC () {
    const base = { sampleRate: 44100, state: 'running', destination: N(), resume: () => Promise.resolve(), close: () => Promise.resolve(), suspend: () => Promise.resolve(),
      createOscillator: () => { window.__oscN++; return N() }, createBuffer: (c, n) => N(n), decodeAudioData: () => Promise.resolve(N()), addEventListener () {}, removeEventListener () {} }
    return new Proxy(base, { get: (t, k) => k === 'currentTime' ? performance.now() / 1000 : k in t ? t[k] : (typeof k === 'string' && k.indexOf('create') === 0 ? () => N() : undefined) })
  }
  window.AudioContext = AC; window.webkitAudioContext = AC
}

async function open (browser, w, h, opts = {}) {
  const p = await browser.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, hasTouch: true })
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
  await p.evaluateOnNewDocument(stubAudio)
  if (opts.rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(URL_, { waitUntil: 'networkidle2', timeout: 60000 }); await p.waitForFunction(() => window.__tk && window.TKGrid, { timeout: 30000 })
  for (let tries = 0; tries < 3 && !await p.evaluate(() => !!window.TKBoardLook).catch(() => false); tries++) {
    try { await p.addStyleTag({ url: BASE + '/games/tk-board-look.css' }); await p.addScriptTag({ url: BASE + '/games/tk-board-look.js' }) } catch (e) { await sleep(1500) }
  }
  await p.evaluate(() => { __tk.reset(); __tk.unlockAll() })
  return { p, errors }
}
async function begin (p, wid, lid) {
  const ok = await p.evaluate((wid, lid) => { const w = TKWorlds.get(wid); if (!w) return 'no world'; const k = w.levels.findIndex(l => l.id === lid); if (k < 0) return 'no level'; return __tk.start(wid, k) }, wid, lid)
  if (ok !== 'ok') return ok
  for (let i = 0; i < 6 && !await p.evaluate(() => !!document.querySelector('.tkg-board')); i++) {   // a story intro first: its real Lewati
    await sleep(500); const sk = await p.$('.tks-skip'); if (sk) { await sk.click().catch(() => {}); await sleep(600) }
  }
  await p.waitForFunction(() => window.TKBoardLook && TKBoardLook.state().on && document.querySelector('.tkg-board'), { timeout: 8000 }).catch(() => {})
  await sleep(1300)   // the screen's entrance + the grid's layout + the look's measure (700 ms)
  return 'ok'
}

function measure () {
  const R = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }
  const root = document.querySelector('.tkg'), board = root && root.querySelector('.tkg-board')
  if (!root || !board) return null
  const T = parseFloat(root.style.getPropertyValue('--t')), br = R(board), out = { T, layers: {}, anchor: [], cover: [], order: true, z: {}, pe: [], hits: [], boardHits: [], dressed: 0, blk: 0 }
  out.layers = { bg: !!root.querySelector(':scope > .tkb-bg .tkb-paint'), paintBg: !!(root.querySelector('.tkb-paint') || {}).style?.background,
    ground: !!board.querySelector(':scope > .tkb-ground'), waves: board.querySelectorAll(':scope > .tkb-ground > .tkg-wv').length, amb: !!board.querySelector(':scope > .tkb-amb'),
    skirt: !!board.querySelector(':scope > .tkb-skirt'), rip: !!board.querySelector('.tkg-boat > .tkb-rip') }
  const arts = [...board.querySelectorAll(':scope > .tkg-blk, :scope > .tkg-goal')]
  let lastY = -1; arts.forEach(e => { if (e._y < lastY) out.order = false; lastY = Math.max(lastY, e._y) })
  out.blk = board.querySelectorAll(':scope > .tkg-blk').length; out.dressed = board.querySelectorAll(':scope > .tkg-blk.tkb-a').length
  // anchor: layout boxes, the tile's top-left from its translate
  board.querySelectorAll(':scope > .tkb-a').forEach(e => {
    const im = e.classList.contains('tkg-goal') ? e.querySelector('img.lh') : e.querySelector('img'); if (!im) return
    const tileBottom = (e._y + 1) * T, imBottom = e._y * T + im.offsetTop + im.offsetHeight
    const want = e.classList.contains('tkg-goal') ? tileBottom - 0.08 * T : tileBottom - 0.05 * T
    out.anchor.push({ cls: e.className, y: e._y, d: Math.round(imBottom - want), h: +(im.offsetHeight / T).toFixed(2) })
    const r = R(im), others = ['.tkg-plate', '.tkg-cmd', '.tkg-bot', '.tkg-chap', '.tkg-foot']
    others.forEach(s => { const o = root.querySelector(s); if (!o || !o.offsetParent) return; const q = R(o); if (q.w && q.h && r.l < q.r - 1 && r.r > q.l + 1 && r.t < q.b - 1 && r.b > q.t + 1) out.cover.push(s + ' by ' + e.className) })
    const hud = parseFloat(root.style.getPropertyValue('--top')) || 70
    if (r.t < R(root).t + hud - 1) out.cover.push('HUD strip by ' + e.className)
  })
  const sk = board.querySelector(':scope > .tkb-skirt'), bot = root.querySelector('.tkg-bot')
  if (sk && bot && sk.style.display !== 'none' && bot.offsetParent) { const a = R(sk), q = R(bot); if (q.t > br.b - 2 && a.b > q.t + 1 && a.r > q.l && a.l < q.r) out.cover.push('skirt over the bottom band') }
  const z = s => { const e = board.querySelector(s); return e ? +getComputedStyle(e).zIndex || 0 : null }
  out.z = { art: z('.tkg-blk'), goal: z('.tkg-goal'), stop: z('.tkg-stop'), key: z('.tkg-key'), cur: z('.tkg-cur'), start: z('.tkg-start'), boat: z('.tkg-boat'), amb: z('.tkb-amb') }
  root.querySelectorAll('.tkb-bg, .tkb-bg *, .tkb-ground, .tkb-ground *, .tkb-amb, .tkb-skirt, .tkb-rip').forEach(e => { if (getComputedStyle(e).pointerEvents !== 'none') out.pe.push(e.className) })
  // taps: every visible button returns itself; every tile centre misses the added layers
  root.querySelectorAll('.tkg-pal button, .tkg-cact button, .tkg-hintb, .tkg-slots > *').forEach(b => {
    const r = R(b); if (!r.w || !r.h || r.b < 0 || r.t > innerHeight) return
    const box = b.closest('.tkg-slots'); if (box) { const q = R(box); if (r.l < q.l - 1 || r.r > q.r + 1) return }   // scrolled out of its bar
    const hit0 = document.elementFromPoint(r.l + r.w / 2, r.t + r.h / 2); if (hit0 && hit0.closest && hit0.closest('.tkg-more')) return   // under the bar's own 'more' fade
    const hit = document.elementFromPoint(r.l + r.w / 2, r.t + r.h / 2)
    out.hits.push({ ok: !!hit && (hit === b || b.contains(hit)), what: b.className, got: hit ? hit.className : null })
  })
  board.querySelectorAll(':scope > .tkg-o').forEach(e => {
    const x = br.l + (e._x + 0.5) * T, y = br.t + (e._y + 0.5) * T, hit = document.elementFromPoint(x, y)
    if (hit && hit.closest && hit.closest('.tkb-bg, .tkb-ground, .tkb-amb, .tkb-skirt, .tkb-rip')) out.boardHits.push(e.className + ' -> ' + hit.className)
  })
  return out
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
let shot = false
try {
  for (const [w, h] of sizes) {
    const { p, errors } = await open(browser, w, h)
    for (const [wid, lid] of LEVELS) {
      const tag = `${w}x${h} ${lid}`
      const b = await begin(p, wid, lid)
      if (b !== 'ok') { check(false, `${tag}: could not start (${b})`); continue }
      const m = await p.evaluate(measure)
      if (!m) { check(false, `${tag}: no board`); continue }
      const st = await p.evaluate(() => TKBoardLook.state())
      check(st.on && m.layers.bg && m.layers.paintBg && m.layers.ground && m.layers.waves === 2 && m.layers.amb && m.layers.skirt && m.layers.rip, `${tag}: layers ${JSON.stringify(m.layers)}`)
      check(m.dressed === m.blk, `${tag}: ${m.dressed}/${m.blk} blocks dressed`)
      check(m.order, `${tag}: art ordered by row`)
      const bad = m.anchor.filter(a => Math.abs(a.d) > 3)
      check(!bad.length, `${tag}: art anchored on its tile bottom ${JSON.stringify(bad)}`)
      check(!m.cover.length, `${tag}: covers ${m.cover.join(' | ')}`)
      const z = m.z
      check((z.art == null || z.art === 1) && (z.stop == null || z.stop > 1) && (z.key == null || z.key > 1) && (z.cur == null || z.cur > 1) && z.boat === 5 && z.amb < z.boat, `${tag}: z order ${JSON.stringify(z)}`)
      check(!m.pe.length, `${tag}: added layers catch taps: ${m.pe.slice(0, 4)}`)
      const miss = m.hits.filter(x => !x.ok)
      check(m.hits.length >= 4 && !miss.length, `${tag}: ${m.hits.length} buttons, misses ${JSON.stringify(miss.slice(0, 3))}`)
      check(!m.boardHits.length, `${tag}: board points land in added layers ${m.boardHits.slice(0, 3)}`)
      if (OUT || (!shot && w === 1280 && h === 800 && lid === 'cuttysark3')) {
        await p.evaluate(() => TKBoardLook.actor()); await sleep(450)
        if (OUT) await p.screenshot({ path: `${OUT}/${w}x${h}-${lid}.png` })
        else if (process.env.QA_SHOT) { await p.screenshot({ path: process.env.QA_SHOT }); shot = true }
      }
    }
    if (w === 1280 && h === 800) {
      await begin(p, 'cuttysark', 'cuttysark3')
      // pause: an overlay, then a hidden page
      const pz = await p.evaluate(async () => {
        const o = document.getElementById('pause'), r = document.querySelector('.tkg'), s = []
        o.classList.add('show'); await new Promise(r => setTimeout(r, 60)); s.push(r.classList.contains('tkb-pause'))
        o.classList.remove('show'); await new Promise(r => setTimeout(r, 60)); s.push(r.classList.contains('tkb-pause'))
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); s.push(r.classList.contains('tkb-pause'))
        delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); s.push(r.classList.contains('tkb-pause'))
        const paused = getComputedStyle(document.querySelector('.tkb-paint')).animationPlayState
        return { s, paused }
      })
      check(JSON.stringify(pz.s) === '[true,false,true,false]', `pause under an overlay / when hidden ${JSON.stringify(pz)}`)
      // ambient actors: a fish / dolphin / gull appears and never sits on an occupied tile
      const act = await p.evaluate(async () => { let n = 0; for (let i = 0; i < 4; i++) { TKBoardLook.actor(); await new Promise(r => setTimeout(r, 30)); n = Math.max(n, document.querySelectorAll('.tkb-amb .tkb-actor').length) } return n })
      check(act >= 1, `ambient life spawns (${act})`)
      // sounds: nothing before the first touch, then on; mute (the real speaker button) = zero oscillators
      const snd = await p.evaluate(async () => {
        document.dispatchEvent(new Event('pointerdown'))
        const o1 = window.__oscN, on = TKBoardLook.voice('gull'), o2 = window.__oscN
        return { on, onOsc: o2 - o1 }
      })
      check(snd.on === true && snd.onOsc > 0, `sound on: a gull plays ${JSON.stringify(snd)}`)
      await p.click('#sndfab'); await sleep(200)
      const mu = await p.evaluate(() => { const o0 = window.__oscN; const r = TKBoardLook.voice('waves'); return { r, osc: window.__oscN - o0, pressed: document.getElementById('sndfab').getAttribute('aria-pressed'), soundOn: TKBoardLook.soundOn() } })
      check(mu.r === false && mu.osc === 0 && mu.pressed === 'false' && !mu.soundOn, `muted: no sound ${JSON.stringify(mu)}`)
      await p.click('#sndfab'); await sleep(200)
      await p.evaluate(() => { try { localStorage.setItem('dunia-emosi-sound', 'off') } catch (e) {} })
      const gm = await p.evaluate(() => { const o0 = window.__oscN; const r = TKBoardLook.voice('splash'); return { r, osc: window.__oscN - o0 } })
      check(gm.r === false && gm.osc === 0, `main-app mute key: no sound ${JSON.stringify(gm)}`)
      await p.evaluate(() => { try { localStorage.removeItem('dunia-emosi-sound') } catch (e) {} })
      // perf: idle frames at 4x CPU
      const cdp = await p.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await sleep(600)
      const med = await p.evaluate(() => new Promise(res => { const d = []; let last = 0; function f (t) { if (last) d.push(t - last); last = t; if (d.length < 150) requestAnimationFrame(f); else { d.sort((a, b) => a - b); res(d[d.length >> 1]) } } requestAnimationFrame(f) }))
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
      check(med <= 18, `idle frame median at 4x CPU ${med.toFixed(1)} ms <= 18`)
      // the goal horn: solve the level for real (the grid's own solver, JALAN!)
      await p.evaluate(() => { __tk.fast(true); const h = __tk.handle(); const sol = TKGrid.solve(h.level); h.setProgram(sol.program || sol) })
      await sleep(200); await p.click('.tkg-go')
      const horn = await p.waitForFunction(() => TKBoardLook.log.some(l => l.v === 'horn' && l.played), { timeout: 20000 }).then(() => true).catch(() => false)
      check(horn, `ship horn on the goal ${JSON.stringify(await p.evaluate(() => TKBoardLook.log.slice(-4)))}`)
    }
    check(!errors.length, `${w}x${h}: page errors ${errors.slice(0, 3)}`)
    await p.close()
  }
  // reduced motion: static layers, nothing animating in them, no actors
  {
    const { p, errors } = await open(browser, 1280, 800, { rm: true })
    await begin(p, 'cuttysark', 'cuttysark3')
    // no AudioContext before the child's first touch (this page has had none)
    const pre = await p.evaluate(() => { const o0 = window.__oscN; const r = TKBoardLook.voice('bell'); return { r, osc: window.__oscN - o0 } })
    check(pre.r === false && pre.osc === 0, `no sound before the first touch ${JSON.stringify(pre)}`)
    const r = await p.evaluate(async () => {
      TKBoardLook.actor(); TKBoardLook.fly(); await new Promise(r => setTimeout(r, 300))
      const mine = document.getAnimations().filter(a => { const t = a.effect && a.effect.target; return t && t.closest && t.closest('.tkb-bg, .tkb-ground, .tkb-amb, .tkb-skirt, .tkb-rip, .tkb-a') && a.playState === 'running' && !(t.classList.contains('tkg-o') || t.closest('.tkg-wv')) })
      return { st: TKBoardLook.state(), run: mine.length, which: mine.slice(0, 3).map(a => (a.animationName || 'waapi') + ':' + a.effect.target.className), actors: document.querySelectorAll('.tkb-actor').length, parts: document.querySelectorAll('.tkb-p').length, bg: !!document.querySelector('.tkb-bg .tkb-paint') }
    })
    check(r.st.rm && r.run === 0 && r.actors === 0 && r.parts === 0 && r.bg, `reduced motion is static ${JSON.stringify(r)}`)
    check(!errors.length, `reduced motion: page errors ${errors.slice(0, 3)}`)
    await p.close()
  }
} finally { await browser.close() }
console.log(`qa-tk-board-look: ${passed} passed, ${issues.length} failed`)
if (issues.length) { console.log(issues.slice(0, 30).join('\n')); process.exit(1) }
