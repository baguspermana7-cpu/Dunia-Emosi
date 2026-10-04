// G31 Mojo board "immersive diorama" gate (games/mojo-board-look.js/.css + mojo-board-paint.js).
// Every level at 1280x800, 1024x768, 844x390, 390x844:
//  - tall art anchored: its image box bottom sits on the cell bottom (+-4 px, layout boxes)
//  - the cat's box sits on the tree's top 30%
//  - no art box intersects the top bar, palette, plan strip or Bo chip
//  - elementFromPoint on every visible palette button returns that button
//  - z order: a lower row always draws over an upper row; Mojo over its own row
//  - every raised thing reports its perch point (MojoBoardLook.perchPoint): the friend's feet, >= ~1 cell up
// Plus (1280x800): reduced motion leaves no ambient animation running; a meow is scheduled at level open and on
// approach (stub AudioContext); mute gives zero oscillators; idle frame median at 4x CPU <= 20 ms.
// The look files are injected when the page does not load them yet (as qa-mojo-chase does for the picker).
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const BASE = process.env.QA_BASE || 'http://localhost:8081'
const URL_ = BASE + '/games/mojo-swoptops.html?unlock=1'
const OUT = process.env.QA_SHOTS || '/tmp/mojo-look'; fs.mkdirSync(OUT, { recursive: true })
const sizes = (process.env.QA_SIZES || '1280x800,1024x768,844x390,390x844').split(',').map(s => s.split('x').map(Number))
const SHOTS = (process.env.QA_SHOT_LEVELS || 'm3,m6,m5,s1').split(',')
const sleep = ms => new Promise(r => setTimeout(r, ms))
const issues = []; let passed = 0
function check (ok, msg) { if (ok) passed++; else { issues.push(msg); console.error('FAIL', msg) } }

// a silent AudioContext that counts oscillators
function stubAudio (muted) {
  if (muted) try { localStorage.setItem('dunia-emosi-sound', 'off') } catch (e) {}
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
  const p = await browser.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
  await p.evaluateOnNewDocument(stubAudio, !!opts.muted)
  if (opts.rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(URL_, { waitUntil: 'networkidle0', timeout: 60000 }); await p.waitForFunction(() => window.__mojo && __mojo.ready && navigator.serviceWorker.controller, { timeout: 30000 }); await sleep(800)
  for (let tries = 0; tries < 3 && !await p.evaluate(() => !!window.MojoBoardLook).catch(() => false); tries++) {
    try {   // a first visit can still be reloaded once by sw-reload.js: settle and retry
      await p.addStyleTag({ url: BASE + '/games/mojo-board-look.css' })
      await p.addScriptTag({ url: BASE + '/games/mojo-board-paint.js' }); await p.addScriptTag({ url: BASE + '/games/mojo-board-look.js' })
    } catch (e) { await sleep(1500); await p.waitForFunction(() => window.__mojo && __mojo.ready, { timeout: 30000 }) }
  }
  const sp = await p.$('#scr-splash .splash-stage>.btn'); if (sp) { await sp.click(); await sleep(60) }
  return { p, errors }
}
async function begin (p, id) {
  if (process.env.QA_TRACE) console.log('begin', id); await p.evaluate(id => __mojo.start(id), id); await sleep(60)
  for (const sel of ['#ov-card.on #in-go', '#ov-card.on #picker-later']) { const b = await p.$(sel); if (b) { await b.click(); await sleep(80) } }
  await p.waitForFunction(() => window.MojoBoardLook && MojoBoardLook.state().on && document.body.dataset.scr === 'scr-play', { timeout: 5000 })
  await sleep(650)   // the headroom settles over two frames + the game's ResizeObserver
  // and the screen's entrance (a scale) has finished: the board's drawn size equals its layout size
  await p.waitForFunction(() => { const b = document.getElementById('board'); return Math.abs(b.getBoundingClientRect().width - b.offsetWidth) < 1 }, { timeout: 5000 }).catch(() => {})
  await sleep(150)
}

function measure () {
  const R = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } }
  const cell = parseFloat(document.getElementById('board').style.getPropertyValue('--cell'))
  const out = { cell, anchor: [], cat: null, hits: [], palette: [], z: [] }
  const rowOf = e => { const m = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/.exec(e.style.transform || ''); return m ? Math.round(+m[2] / cell) : null }
  // anchor: layout boxes (offset*), unaffected by idle transforms
  document.querySelectorAll('#objs > .ob.mbl-a, #decor > .dec.mbl-a').forEach(d => {
    if (d.classList.contains('gone')) return
    const im = d.querySelector(d.classList.contains('mbl-perch') ? 'img.perch' : d.classList.contains('mbl-balc') ? null : 'img')
    if (!im) return
    out.anchor.push({ id: d.getAttribute('data-id') || d.getAttribute('data-rc'), gap: d.offsetHeight - (im.offsetTop + im.offsetHeight) })
  })
  const cat = document.querySelector('#objs > .ob.mbl-cat')
  if (cat) {
    const tr = cat.querySelector('img.perch'), ct = cat.querySelector('img.main')
    out.cat = { treeTop: tr.offsetTop, treeH: tr.offsetHeight, treeL: tr.offsetLeft, treeW: tr.offsetWidth, catBottom: ct.offsetTop + ct.offsetHeight, catMid: ct.offsetLeft + ct.offsetWidth / 2 }
  }
  // art boxes vs chrome
  const chrome = [['top bar', '#scr-play .p-top'], ['palette', '#palette'], ['plan strip', '#scr-play .p-strip'], ['Bo chip', '#bo']]
    .map(([n, s]) => { const e = document.querySelector(s); return e && e.offsetParent !== null ? [n, R(e)] : null }).filter(Boolean)
  const art = [...document.querySelectorAll('#objs > .ob.mbl-a > img, #decor > .dec.mbl-a > img, .mbl-bld > img, #mbl-skirt, #objs > .ob.mbl-a > .tag, .mbl-tail')]
  art.forEach(a => {
    const r = R(a); if (r.w < 1 || r.h < 1 || getComputedStyle(a).opacity === '0') return
    chrome.forEach(([n, c]) => { const ix = Math.min(r.r, c.r) - Math.max(r.l, c.l), iy = Math.min(r.b, c.b) - Math.max(r.t, c.t); if (ix > 1 && iy > 1) out.hits.push(`${a.className || a.tagName} in ${(a.closest('[data-id],[data-rc]') || a).getAttribute('data-id') || ''} x ${n}`) })
  })
  // palette buttons are what a finger hits
  const pal = document.getElementById('palette'), pr = pal && R(pal)
  if (pal) pal.querySelectorAll('[data-cmd]').forEach(b => {
    const r = R(b), x = (r.l + r.r) / 2, y = (r.t + r.b) / 2
    if (y < pr.t + 2 || y > pr.b - 2 || x < pr.l || x > pr.r || x > innerWidth || y > innerHeight) return
    const hit = document.elementFromPoint(x, y); if (!(hit === b || b.contains(hit))) out.palette.push(b.getAttribute('data-cmd') + ' -> ' + (hit ? hit.className || hit.tagName : 'null'))
  })
  // z order by row
  const items = [...document.querySelectorAll('#objs > .ob:not(.gone), #decor > .dec, .mbl-bld')].map(e => ({ row: e.classList.contains('dec') || e.classList.contains('mbl-bld') ? +e.getAttribute('data-rc').split(',')[0] : rowOf(e), z: +getComputedStyle(e).zIndex || 0, id: e.getAttribute('data-id') || e.getAttribute('data-rc') }))
  items.forEach(a => items.forEach(b => { if (a.row != null && b.row != null && a.row < b.row && !(a.z < b.z)) out.z.push(`${a.id}(r${a.row},z${a.z}) !< ${b.id}(r${b.row},z${b.z})`) }))
  // Mojo: over everything on its own row, and over the next row's scenery (trees, buildings) so it is never hidden
  const mj = document.getElementById('mojo'), mr = rowOf(mj), mz = +getComputedStyle(mj).zIndex
  items.forEach(a => { if (a.row === mr && !(a.z < mz)) out.z.push(`mojo z${mz} under ${a.id} on its row`) })
  document.querySelectorAll('#decor > .dec, .mbl-bld').forEach(e => { const r = +e.getAttribute('data-rc').split(',')[0], z = +getComputedStyle(e).zIndex; if (r === mr + 1 && !(z < mz)) out.z.push(`mojo z${mz} hidden by scenery ${e.getAttribute('data-rc')}`) })
  return out
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], protocolTimeout: 30000 })
try {
  for (const [w, h] of sizes) {
    const { p, errors } = await open(browser, w, h)
    const levels = process.env.QA_LEVELS ? process.env.QA_LEVELS.split(',') : await p.evaluate(() => __mojo.levels())
    for (const id of levels) {
      await begin(p, id)
      const m = await p.evaluate(measure)
      const bad = m.anchor.filter(a => Math.abs(a.gap) > 4)
      check(m.anchor.length > 0 && !bad.length, `${w}x${h} ${id}: art anchored to the cell bottom (${bad.map(a => a.id + ':' + a.gap.toFixed(1)).join(' ')})`)
      if (m.cat) {
        const c = m.cat, ok = c.catBottom >= c.treeTop && c.catBottom <= c.treeTop + 0.3 * c.treeH && c.catMid >= c.treeL && c.catMid <= c.treeL + c.treeW
        check(ok, `${w}x${h} ${id}: the cat sits on the tree's top 30% (bottom ${c.catBottom.toFixed(0)} vs tree ${c.treeTop.toFixed(0)}+${(0.3 * c.treeH).toFixed(0)})`)
        check(c.treeH >= 1.85 * m.cell, `${w}x${h} ${id}: the cat's tree is ~2 cells tall (${(c.treeH / m.cell).toFixed(2)})`)
      }
      // rescue staging (games/mojo-fx.js): every raised thing reports the point a ladder must reach — a raised
      // friend's feet on its perch (layout box, +-2 px), at least ~1 cell up for the tall tree and the balcony
      const pp = await p.evaluate(() => (__mojo.state().objects || []).filter(o => o.elev).map(o => {
        const d = document.querySelector('#objs > .ob[data-id="' + o.id + '"]'), im = d && d.querySelector('img.main'), q = MojoBoardLook.perchPoint(o.id)
        const c = parseFloat(document.getElementById('board').style.getPropertyValue('--cell')), t = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px/.exec(d.style.transform)
        return { id: o.id, type: o.type, perch: o.perch || '', q, feet: im && t ? [+t[1] + im.offsetLeft + im.offsetWidth / 2, +t[2] + im.offsetTop + im.offsetHeight] : null, cellTop: o.r * c, cell: c }
      }))
      for (const x of pp) {
        check(!!x.q && x.q.elev > 0, `${w}x${h} ${id}: ${x.id} reports a perch point (${JSON.stringify(x.q)})`)
        if (x.q && x.type === 'person') check(Math.hypot(x.q.x - x.feet[0], x.q.y - x.feet[1]) <= 2, `${w}x${h} ${id}: ${x.id} perch point = the friend's feet (${x.q.x.toFixed(0)},${x.q.y.toFixed(0)} vs ${x.feet.map(v => v.toFixed(0))})`)
        if (x.q && x.perch) check(x.q.y <= x.cellTop + 0.1 * x.cell, `${w}x${h} ${id}: ${x.id} perch point is at least ~1 cell up (tall art: ${x.q.y.toFixed(0)} <= ${(x.cellTop + 0.1 * x.cell).toFixed(0)})`)
      }
      check(!m.hits.length, `${w}x${h} ${id}: no art over the chrome (${m.hits.slice(0, 3).join('; ')})`)
      check(!m.palette.length, `${w}x${h} ${id}: palette buttons take the tap (${m.palette.slice(0, 3).join('; ')})`)
      check(!m.z.length, `${w}x${h} ${id}: depth by row (${m.z.slice(0, 3).join('; ')})`)
      if (w === 1280 && SHOTS.includes(id)) await p.screenshot({ path: `${OUT}/${id}-1280.png` })
    }
    check(!errors.length, `${w}x${h}: no page errors (${errors.slice(0, 3).join(' | ')})`)
    await p.close()
  }

  // sound: a meow at level open, a nearer (higher, sooner) meow on approach
  {
    const { p, errors } = await open(browser, 1280, 800)
    await begin(p, 'm3'); await sleep(1800)
    const a = await p.evaluate(() => ({ log: MojoBoardLook.log.slice(), osc: window.__oscN }))
    check(a.log.some(l => l.v === 'meow' && l.kind === 'open' && l.played) && a.osc > 0, `sound: a meow at level open (${JSON.stringify(a.log.map(l => l.v + ':' + l.kind))}, osc ${a.osc})`)
    await sleep(2200)
    await p.evaluate(() => { const c = parseFloat(document.getElementById('board').style.getPropertyValue('--cell')), cat = __mojo.state().objects.find(o => o.who === 'cat'); document.getElementById('mojo').style.transform = `translate(${cat.c * c}px,${(cat.r + 1) * c}px)` })
    await sleep(1400)
    const b = await p.evaluate(() => ({ log: MojoBoardLook.log.slice(), near: MojoBoardLook.state().near }))
    check(b.near && b.log.some(l => l.v === 'meow' && l.kind === 'near' && l.pitch > 1 && l.played), `sound: a higher meow when Mojo comes near (${JSON.stringify(b.log.map(l => l.v + ':' + l.kind))})`)
    // idle frame budget at 4x CPU
    const cdp = await p.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    const med = await p.evaluate(() => new Promise(res => { const d = []; let last = 0; function f (t) { if (last) d.push(t - last); last = t; if (d.length < 90) requestAnimationFrame(f); else { d.sort((x, y) => x - y); res(d[d.length >> 1]) } } requestAnimationFrame(f) }))
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    check(med <= 20, `perf: idle frame median at 4x CPU ${med.toFixed(1)} ms <= 20`)
    check(!errors.length, `sound page: no page errors (${errors.slice(0, 3).join(' | ')})`)
    await p.close()
  }
  // mute: the voice is still scheduled, but no oscillator is ever made
  {
    const { p, errors } = await open(browser, 1280, 800, { muted: true })
    await begin(p, 'm3'); await sleep(2000)
    const a = await p.evaluate(() => ({ log: MojoBoardLook.log.slice(), osc: window.__oscN }))
    check(a.log.some(l => l.v === 'meow') && a.log.every(l => !l.played) && a.osc === 0, `mute: zero oscillators (osc ${a.osc}, ${JSON.stringify(a.log.map(l => l.v + ':' + l.played))})`)
    check(!errors.length, `mute page: no page errors (${errors.slice(0, 3).join(' | ')})`)
    await p.close()
  }
  // reduced motion: no ambient actors, no running look animations
  {
    const { p, errors } = await open(browser, 1280, 800, { rm: true })
    for (const id of ['m3', 'm5']) {
      await begin(p, id); await sleep(6500)
      const r = await p.evaluate(() => ({ actors: document.querySelectorAll('.mbl-actor').length, anims: document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.mbl-a,.mbl-amb,.mbl-ground,.mbl-tail')).map(a => a.animationName || a.effect.target.className) }))
      check(!r.actors && !r.anims.length, `reduced motion ${id}: no ambient life running (actors ${r.actors}, anims ${r.anims.slice(0, 4).join(',')})`)
    }
    check(!errors.length, `rm page: no page errors (${errors.slice(0, 3).join(' | ')})`)
    await p.close()
  }
} finally { await browser.close() }
console.log(`qa-mojo-board-look: ${passed} passed, ${issues.length} failed${issues.length ? '' : ' — PASS'}`)
process.exit(issues.length ? 1 : 0)
