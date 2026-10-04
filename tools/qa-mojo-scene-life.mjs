// G31 Mojo scene life gate (games/mojo-scene-life.js/.css): living overlays on the play background and the board.
//  - every scene painting maps to a theme; per theme the layers exist (paint copy, clouds, rays, haze, particles)
//    and the particle pool stays <= 14 (board tufts <= 10, never more than 20 particles in all)
//  - the paint copy carries the screen's own painting; #msl-bg is under every panel, #msl-board is under every item
//  - elementFromPoint on every item, tag, Mojo and palette button is the same with and without the overlays
//  - every overlay animation animates transform/opacity only
//  - paused off-screen, under an overlay and when the page is hidden; reduced motion: nothing moves
//  - idle frame median at 1280x800, 4x CPU, 10 s, on m3 and s1 <= 18 ms
// The module is injected when the page does not load it yet. QA_SHOTS=dir writes the m3/s1 1280x800 pair.
import puppeteer from 'puppeteer'
import fs from 'node:fs'
const BASE = process.env.QA_BASE || 'http://localhost:8081'
const URL_ = BASE + '/games/mojo-swoptops.html?unlock=1'
const SHOTS = process.env.QA_SHOTS || ''
const sleep = ms => new Promise(r => setTimeout(r, ms))
const issues = []; let passed = 0
function check (ok, msg) { if (ok) passed++; else { issues.push(msg); console.error('FAIL', msg) } }

async function open (browser, w, h, opts = {}) {
  const p = await browser.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('dunia-emosi-sound', 'off') } catch (e) {} })
  if (opts.rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(URL_, { waitUntil: 'networkidle0', timeout: 60000 }); await p.waitForFunction(() => window.__mojo && __mojo.ready && navigator.serviceWorker.controller, { timeout: 30000 }); await sleep(800)
  for (let tries = 0; tries < 3 && !await p.evaluate(() => !!window.MojoSceneLife).catch(() => false); tries++) {
    try { await p.addStyleTag({ url: BASE + '/games/mojo-scene-life.css' }); await p.addScriptTag({ url: BASE + '/games/mojo-scene-life.js' }) } catch (e) { await sleep(1500); await p.waitForFunction(() => window.__mojo && __mojo.ready, { timeout: 30000 }) }
  }
  const sp = await p.$('#scr-splash .splash-stage>.btn'); if (sp) { await sp.click(); await sleep(60) }
  return { p, errors }
}
async function begin (p, id) {
  await p.evaluate(id => __mojo.start(id), id); await sleep(60)
  for (const sel of ['#ov-card.on #in-go', '#ov-card.on #picker-later']) { const b = await p.$(sel); if (b) { await b.click(); await sleep(80) } }
  await p.waitForFunction(() => document.body.dataset.scr === 'scr-play' && document.getElementById('msl-board') && !document.querySelector('.overlay.on'), { timeout: 5000 })
  await sleep(700)
  await p.waitForFunction(() => { const b = document.getElementById('board'); return Math.abs(b.getBoundingClientRect().width - b.offsetWidth) < 1 }, { timeout: 5000 }).catch(() => {})
  await sleep(150)
}

// what a finger hits on every item, tag, Mojo and palette button
function hits () {
  const out = []
  const pts = []
  document.querySelectorAll('#objs > .ob:not(.gone), #objs > .ob .tag, #mojo, #palette [data-cmd], #btn-run, #slots, #bo').forEach(e => {
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return
    const x = r.left + r.width / 2, y = r.top + r.height / 2
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return
    pts.push([x, y, e])
  })
  pts.forEach(([x, y]) => { const h = document.elementFromPoint(x, y); out.push(h ? (h.id || h.className || h.tagName) + '' : 'null') })
  return out
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'], protocolTimeout: 60000 })
try {
  // ── themes + layering + hit tests ──
  {
    const { p, errors } = await open(browser, 1280, 800)
    const expect = { 'fire-station': 'fire', 'forest-fire': 'fire', 'garage-harbour': 'coast', 'pirate-pier': 'coast', 'beach-cove': 'coast', 'coastal-road': 'coast',
      'night-highway': 'night', 'space-road': 'space', underwater: 'deep', 'snow-road': 'snow', 'ice-floes': 'snow', 'fallen-tree': 'forest', 'mud-road': 'forest',
      fairground: 'fair', 'rooftop-cat': 'sky', rockslide: 'sky', 'broken-bridge': 'sky' }
    for (const id of ['m3', 's1', 'm5', 't1']) {
      await begin(p, id)
      const L = await p.evaluate(() => {
        const scr = document.getElementById('scr-play'), bg = document.getElementById('msl-bg'), mb = document.getElementById('msl-board'), board = document.getElementById('board')
        const kids = [...board.children], z = e => getComputedStyle(e).zIndex
        const items = [...document.querySelectorAll('#objs > .ob, #decor > .dec, #mojo')].map(e => +z(e))
        return { first: scr.firstElementChild === bg, bgZ: z(bg), paint: bg.querySelector('.msl-paint').style.backgroundImage === scr.style.backgroundImage && !!scr.style.backgroundImage,
          theme: bg.getAttribute('data-msl'), mbZ: z(mb), order: kids.indexOf(mb) > kids.indexOf(document.getElementById('board-bg')) && kids.indexOf(mb) < kids.indexOf(document.getElementById('decor')),
          clip: getComputedStyle(mb).overflow, itemsZ: items, parts: document.querySelectorAll('.msl-p').length, tufts: document.querySelectorAll('.msl-tuft').length,
          shadow: [...document.querySelectorAll('.msl-cs')].map(e => getComputedStyle(e).backgroundImage.match(/rgba\([^)]*\)/g).map(c => +c.split(',')[3].replace(')', ''))).flat() }
      })
      check(L.first && L.bgZ === '-1' && L.paint, `${id}: #msl-bg is the screen's first child at z -1 and carries its painting (${JSON.stringify([L.first, L.bgZ, L.paint])})`)
      check(L.order && L.mbZ === 'auto' && L.clip === 'hidden' && L.itemsZ.every(v => v > 0), `${id}: #msl-board over the ground, under every item (z ${L.mbZ}, items ${L.itemsZ.join(',')}), clipped`)
      check(L.parts <= 14 && L.tufts <= 10 && L.parts > 0, `${id}: particle pool ${L.parts} <= 14, tufts ${L.tufts} <= 10`)
      check(Math.max(...L.shadow) <= 0.12, `${id}: cloud shadow alpha <= .12 (${Math.max(...L.shadow)})`)
      // hit tests: identical with and without the overlays
      const a = await p.evaluate(hits)
      await p.evaluate(() => { document.getElementById('msl-bg').style.display = 'none'; document.getElementById('msl-board').style.display = 'none' })
      const b = await p.evaluate(hits)
      await p.evaluate(() => { document.getElementById('msl-bg').style.display = ''; document.getElementById('msl-board').style.display = '' })
      const diff = a.map((h, i) => h !== b[i] ? h + ' vs ' + b[i] : null).filter(Boolean)
      check(a.length > 5 && !diff.length && !a.some(h => /msl-/.test(h)), `${id}: elementFromPoint unchanged on ${a.length} items/tags/Mojo/palette (${diff.slice(0, 3).join('; ')})`)
      // only transform / opacity animate
      const props = await p.evaluate(() => {
        const bad = new Set(); let n = 0
        document.getAnimations().forEach(an => {
          const t = an.effect && an.effect.target; if (!t || !t.closest || !(t.closest('#msl-bg,#msl-board') || t.classList.contains('mbl-skirt'))) return
          n++; an.effect.getKeyframes().forEach(k => Object.keys(k).forEach(q => { if (!['offset', 'easing', 'composite', 'computedOffset', 'transform', 'opacity'].includes(q)) bad.add(q) }))
        })
        return { n, bad: [...bad] }
      })
      check(props.n >= 8 && !props.bad.length, `${id}: ${props.n} overlay animations, transform/opacity only (${props.bad.join(',')})`)
    }
    // every painting maps to its theme with its own layers
    for (const [file, th] of Object.entries(expect)) {
      const r = await p.evaluate(f => {
        document.getElementById('scr-play').style.backgroundImage = 'url("../assets/db/lib/mojo-bg/' + f + '-land.webp")'
        return new Promise(res => setTimeout(() => {
          const bg = document.getElementById('msl-bg'), vis = s => { const e = bg.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' }
          const kinds = [...new Set([...bg.querySelectorAll('.msl-p')].map(e => e.className.split(' ').find(c => /^msl-(?!p$|anim$)/.test(c))))]
          res({ theme: bg.getAttribute('data-msl'), n: bg.querySelectorAll('.msl-p').length, kinds, haze: vis('.msl-haze'), rays: vis('.msl-rays'), clouds: vis('.msl-cl1'), paint: vis('.msl-paint') })
        }, 30))
      }, file)
      const want = { fire: ['ember'], coast: ['glint'], night: ['star'], space: ['star'], deep: ['bubble'], snow: ['snow'], forest: ['firefly'], fair: ['conf'], sky: ['petal'] }[th]
      check(r.theme === th && r.paint && r.n > 0 && r.n <= 14 && want.every(k => r.kinds.includes('msl-' + k)) && r.haze === (th === 'fire') && r.rays === !['night', 'space'].includes(th) && r.clouds === !['space', 'deep'].includes(th),
        `theme ${file} -> ${th}: ${JSON.stringify(r)}`)
    }
    // pause: under an overlay, when the page is hidden, off the play screen
    await p.evaluate(() => { document.getElementById('scr-play').style.backgroundImage = ''; MojoSceneLife.rebuild() })
    const ps = await p.evaluate(async () => {
      const scr = document.getElementById('scr-play'), st = () => scr.classList.contains('msl-pause') && document.getAnimations().filter(a => a.effect.target.closest && a.effect.target.closest('#msl-bg,#msl-board') && a.playState === 'running').length === 0
      const t = ms => new Promise(r => setTimeout(r, ms)), o = {}
      o.play = !scr.classList.contains('msl-pause')
      const ov = document.getElementById('ov-mg'); ov.classList.add('on'); await t(50); o.overlay = st(); ov.classList.remove('on'); await t(50); o.back = !scr.classList.contains('msl-pause')
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); await t(50); o.hidden = st()
      delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); await t(50); o.shown = !scr.classList.contains('msl-pause')
      return o
    })
    check(ps.play && ps.overlay && ps.back && ps.hidden && ps.shown, `pause: overlay / hidden page pause every overlay animation, resume after (${JSON.stringify(ps)})`)
    await p.click('#btn-quit').catch(() => {}); await sleep(300)
    const off = await p.evaluate(() => ({ scr: document.body.dataset.scr, pause: document.getElementById('scr-play').classList.contains('msl-pause') }))
    check(off.scr !== 'scr-play' && off.pause, `pause: off the play screen (${JSON.stringify(off)})`)
    check(!errors.length, `themes page: no page errors (${errors.slice(0, 3).join(' | ')})`)
    await p.close()
  }
  // ── reduced motion: nothing moves ──
  {
    const { p, errors } = await open(browser, 1280, 800, { rm: true })
    for (const id of ['m3', 's1']) {
      await begin(p, id); await sleep(1500)
      const r = await p.evaluate(() => ({ parts: document.querySelectorAll('.msl-p,.msl-tuft').length, layers: !!document.getElementById('msl-bg') && !!document.getElementById('msl-board'),
        anims: document.getAnimations().filter(a => a.playState === 'running' && a.effect.target.closest && (a.effect.target.closest('#msl-bg,#msl-board') || a.effect.target.classList.contains('mbl-skirt'))).map(a => a.animationName) }))
      check(r.layers && !r.parts && !r.anims.length, `reduced motion ${id}: static (particles ${r.parts}, running ${r.anims.slice(0, 4).join(',')})`)
    }
    check(!errors.length, `rm page: no page errors (${errors.slice(0, 3).join(' | ')})`)
    await p.close()
  }
  // ── perf: idle frame median at 1280x800, 4x CPU, 10 s ──
  {
    const { p, errors } = await open(browser, 1280, 800)
    for (const id of ['m3', 's1']) {
      await begin(p, id); await sleep(800)
      if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: `${SHOTS}/scene-life-${id}-1280.png` }) }
      const cdp = await p.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
      const m = await p.evaluate(() => new Promise(res => { const d = []; let last = 0, t0 = 0; function f (t) { if (!t0) t0 = t; if (last) d.push(t - last); last = t; if (t - t0 < 10000) requestAnimationFrame(f); else { d.sort((x, y) => x - y); res({ med: d[d.length >> 1], p90: d[Math.floor(d.length * 0.9)], n: d.length }) } } requestAnimationFrame(f) }))
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.detach()
      console.log(`perf ${id}: median ${m.med.toFixed(1)} ms, p90 ${m.p90.toFixed(1)}, ${m.n} frames`)
      check(m.med <= 18, `perf ${id}: idle frame median at 4x CPU over 10 s ${m.med.toFixed(1)} ms <= 18 (p90 ${m.p90.toFixed(1)}, ${m.n} frames)`)
    }
    check(!errors.length, `perf page: no page errors (${errors.slice(0, 3).join(' | ')})`)
    await p.close()
  }
} finally { await browser.close() }
console.log(`qa-mojo-scene-life: ${passed} passed, ${issues.length} failed${issues.length ? '' : ' — PASS'}`)
process.exit(issues.length ? 1 : 0)
