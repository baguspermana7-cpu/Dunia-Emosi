// qa-dunia-cinema.mjs — the cinematic layer (games/dunia-cinema.js) is on EVERY game page and helps without harming
// (owner 2026-11-09: "Semua game di dunia emosi enhance animation nya. Literally semuanya"). Laws, per page:
//   1. the layer is on: DuniaCinema.state().on, the page's theme, light (key/fill/haze/vignette) + particles
//   2. it never takes a tap: elementFromPoint at 5 points never lands on a [data-dcine] layer
//   3. reduced motion: no particles, the lights stop drifting
//   4. a button squashes on press (an added animation, scale below 1) and, released, leaves no press animation behind
//   5. no page error the page does not also throw without the layer (?nocine=1)
//   6. visible but readable: hiding the layer changes the centre of the same frame (mean |dRGB| >= 1.5) but not by much (<= 22)
//   7. a PixiJS page: the post filter (bloom, key/fill, depth fog, DoF, vignette) is on its stage, and its player layer
//      carries a one-sided rim light once that layer exists
//   8. it costs little: at 4x CPU a page under 50 fps bare has switched the layer off (tier 0); a faster page keeps >= 80%
//      of its bare frame rate
//   9. the game's own moments light the scene: VFX.Moment.reward is hooked and a win pulse lifts the key light
//  10. nothing of the game disappears: with the layer the whole frame keeps >= 85% of its edge detail (2026-11-09: a rim
//      filter on Mario's whole-level container wiped the bricks, coins and hills while the centre-crop law passed)
//  11. a smooth page earns the full look on its own: on the GPU, unthrottled, a light page reaches tier 2 within 15 s
//  12. an opaque canvas2D scene (Timmy's sailing and lanes) gets bloom/grade/vignette through DuniaGLFX, drawn over it
//      live, its class still unique, no detail lost, and the game's own canvas back below tier 2
// Pages are enumerated from games/*.html (plus index.html); SKIP names each exemption with its reason.
// Server: ~/rz-work on port 8090.   BASE=http://localhost:8090/<checkout>/ node tools/qa-dunia-cinema.mjs
import puppeteer from 'puppeteer'
import fs from 'fs'
import sharp from 'sharp'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const BASE = process.env.BASE || 'http://localhost:8090/Dunia-Emosi/'
const SKIP = {
  'mojo-chase-embed.html': 'the race framed inside mojo-swoptops (which carries the layer); its own GL post already grades it',
  'blippi.html': 'frames another site (game1)',
  'film-anak.html': 'third-party film bundles, not our games',
  'film-play.html': 'third-party film bundles, not our games'
}
let PAGES = ['index.html'].concat(fs.readdirSync('games').filter(f => f.endsWith('.html') && !f.startsWith('_') && !SKIP[f]).sort().map(f => 'games/' + f))
if (process.env.QA_ONLY) { const re = new RegExp(process.env.QA_ONLY); PAGES = PAGES.filter(p => re.test(p)) }
const THEME = { 'pokemon-bawah-laut': 'sea', 'timmy-kapal': 'sea', 'garasi-tempur': 'garage', 'monster-candy': 'sweet', 'balapan-kereta': 'rail' }
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|googleapis|gstatic|unpkg|AudioContext|play\(\) request/i
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }

// laws 1-7 run with the tier pinned to 2 (?cineq=2): this headless renderer is slow enough that the automatic tier would
// rightly drop the effects; law 8 measures the automatic tier itself
const pin = (url, q) => url + (url.includes('?') ? '&' : '?') + 'cineq=' + q
async function open (b, url, reduced) {
  const p = await b.newPage(); const errs = []
  p.on('pageerror', e => { if (!IGNORE.test(String(e))) errs.push(String(e).slice(0, 140)) })
  // a shader that does not compile on a real WebGL context (precision mismatch, 2026-11-09) only shows as a Pixi console line
  p.on('console', m => { if (/Could not initialize shader|getProgramInfoLog|shader.*(error|failed)/i.test(m.text())) errs.push('shader: ' + m.text().slice(0, 140)) })
  await p.setViewport({ width: 1024, height: 700 })
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(e => errs.push('goto ' + e.message))
  await sleep(2200)
  return { p, errs }
}
// detail energy of the whole frame: summed |dx| + |dy| of luminance (content that vanishes takes its edges with it)
const detail = async buf => {
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true })
  let e = 0; const w = info.width
  for (let y = 0; y < info.height - 1; y++) for (let x = 0; x < w - 1; x++) { const i = y * w + x; e += Math.abs(data[i] - data[i + 1]) + Math.abs(data[i] - data[i + w]) }
  return e
}
const meanDiff = async (a, c, whole) => {
  const crop = { left: 256, top: 175, width: 512, height: 350 }
  const [x, y] = await Promise.all([a, c].map(buf => (whole ? sharp(buf) : sharp(buf).extract(crop)).raw().toBuffer()))
  let s = 0; for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]); return s / x.length
}

for (const pg of PAGES) {
  const name = pg.replace(/^games\//, '').replace(/\.html$/, '')
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
  try {
    const { p, errs } = await open(b, pin(BASE + pg, 2))
    const st = await p.evaluate(() => {
      const L = [...document.querySelectorAll('[data-dcine]')], s = window.DuniaCinema && window.DuniaCinema.state()
      return { s, layers: ['dl', 'dp'].every(c => L.some(e => e.classList.contains(c))), pe: L.length && L.every(e => getComputedStyle(e).pointerEvents === 'none') ? 'none' : 'auto' }
    })
    ok(st.s && st.s.on && st.layers && st.pe === 'none', `${name}: the cinematic layer is not on ${JSON.stringify(st)}`)
    if (THEME[name]) ok(st.s && st.s.theme === THEME[name], `${name}: theme ${st.s && st.s.theme}, want ${THEME[name]}`)
    ok(st.s && st.s.particles >= 6, `${name}: only ${st.s && st.s.particles} particles`)
    // 7. a PixiJS game gets the in-scene post filter (bloom, key/fill, depth fog, DoF, vignette) on its stage
    const isPixi = await p.evaluate(() => !!window.PIXI)
    if (isPixi) {
      // a game that builds its Pixi app only once play starts (the train pages) has no app on its menu yet
      const hasApp = await p.evaluate(() => { try { const a = (0, eval)('typeof app!=="undefined"?app:null'); return !!(a && a.stage && a.renderer) } catch (e) { return false } })
      await p.waitForFunction(() => window.DuniaCinema.pixi && window.DuniaCinema.pixi().filter, { timeout: 8000 }).catch(() => {})
      const px = await p.evaluate(() => window.DuniaCinema.pixi ? window.DuniaCinema.pixi() : null)
      ok(!hasApp || (px && px.app && px.filter), `${name}: no cinema filter on the Pixi stage ${JSON.stringify(px)}`)
      await sleep(1500)
      const rim = await p.evaluate(() => window.DuniaCinema.pixi())
      ok(!rim.rimTarget || rim.rims >= 1, `${name}: the player layer exists but has no rim light ${JSON.stringify(rim)}`)
    }
    // 9. the game's own big moments light the scene: VFX.Moment.reward is hooked, and a win pulse lifts the key light
    const mo = await p.evaluate(async () => {
      if (!(window.VFX && window.VFX.Moment)) return { none: true }
      await new Promise(r => setTimeout(r, 1200))
      const hooked = !!window.VFX.Moment.reward.__dcine
      // the pulse shows from the next drawn frame; a 2 fps page may spend its whole 900 ms in two frames, so look at each
      window.DuniaCinema.pulse('win'); const seen = []
      for (let i = 0; i < 3; i++) { await new Promise(r => requestAnimationFrame(r)); seen.push(document.querySelector('.dcine.dl').style.opacity) }
      // the resting level after the pulse: on a Pixi page the light rests at half (the shader lights the scene itself)
      await new Promise(r => setTimeout(r, 1100)); await new Promise(r => requestAnimationFrame(r))
      const rest = +document.querySelector('.dcine.dl').style.opacity
      return { hooked, peak: Math.max(...seen.map(Number)), rest, seen: seen.join('/') }
    })
    if (!mo.none) ok(mo.hooked && mo.peak >= Math.min(1, mo.rest + 0.4) - 1e-6, `${name}: a reward moment does not light the scene ${JSON.stringify(mo)}`)
    const hits = await p.evaluate(() => [[.5, .5], [.15, .2], [.85, .2], [.15, .85], [.85, .85]].map(([x, y]) => { const e = document.elementFromPoint(innerWidth * x, innerHeight * y); return !!(e && e.closest && e.closest('[data-dcine]')) }))
    ok(!hits.some(Boolean), `${name}: a tap lands on the cinematic layer ${JSON.stringify(hits)}`)
    // press: a neutral test button the gate adds at the centre (a page's own buttons navigate, start a round or start
    // sound, and headless audio freezes the whole document timeline - proved 2026-11-09 on Garasi)
    const pr = await p.evaluate(async () => {
      const e = document.createElement('button'); e.className = 'btn qa-press'; e.textContent = 'uji'
      e.style.cssText = 'position:fixed;left:50%;top:50%;width:120px;height:48px;margin:-24px 0 0 -60px;z-index:2147482000'
      document.body.appendChild(e); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const before = getComputedStyle(e).transform
      e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true }))
      // seek the press animation to its squash (a heavy WebGL page may not have drawn a frame yet after a fixed wait)
      const down = e.getAnimations().find(a => a.effect && a.effect.composite === 'add')
      if (down) down.currentTime = 100
      const m = new DOMMatrix(getComputedStyle(e).transform === 'none' ? undefined : getComputedStyle(e).transform), b0 = new DOMMatrix(before === 'none' ? undefined : before)
      const squash = m.d / (b0.d || 1)
      e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, isPrimary: true }))
      await Promise.race([Promise.all(e.getAnimations().filter(a => a.effect && a.effect.composite === 'add').map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 8000))])
      await new Promise(r => setTimeout(r, 50))
      // settled: none of the press animations is still running or holding a value (the button's own animation may move it)
      const left = e.getAnimations().filter(a => a.id === 'dcine-press' && a.playState !== 'finished' && a.playState !== 'idle').length
      e.remove()
      return { tag: e.tagName + '.' + String(e.className).slice(0, 30), squash: +squash.toFixed(3), settled: left === 0, left }
    })
    ok(pr.squash < 0.99 && pr.settled, `${name}: press does not squash and settle ${JSON.stringify(pr)}`)
    // the layer's own effect: the same moment with and without it (a second load differs by its animations alone)
    const pxOn = await p.evaluate(() => !!(window.DuniaCinema.pixi && window.DuniaCinema.pixi().filter))
    const shotA = await p.screenshot({ type: 'png' })
    await p.evaluate(() => { document.querySelectorAll('[data-dcine]').forEach(e => { e.style.display = 'none' }); if (window.DuniaCinema.pixiEnable) window.DuniaCinema.pixiEnable(false) })
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    const shotB = await p.screenshot({ type: 'png' })
    const d = await meanDiff(shotA, shotB)
    // 10. nothing of the game disappears: the frame with the layer keeps >= 85% of the detail of the frame without it
    const [eOn, eOff] = await Promise.all([detail(shotA), detail(shotB)])
    ok(eOn >= eOff * 0.85, `${name}: the game loses detail under the layer (edges ${(eOn / eOff * 100).toFixed(0)}% of bare)`)
    await p.close()
    const base = await open(b, BASE + pg + (pg.includes('?') ? '&' : '?') + 'nocine=1')
    // a page whose Pixi scene is lit by the shader shows its effect as form (edges), not as a colour wash: on a dark night
    // scene the mean change can stay small while the detail rises
    const formed = pxOn && eOn >= eOff * 1.04
    // the effect may show anywhere in the frame (a page that opens on a tutorial card in the middle hid it from the
    // centre crop: balapan-kereta-side, 2026-11-10); the upper bound stays on the centre, where the action is
    const dAll = await meanDiff(shotA, shotB, true)
    ok((d >= 1.5 || dAll >= 1.5 || formed) && d <= 22, `${name}: centre changes by ${d.toFixed(1)}, the frame by ${dAll.toFixed(1)} (want 1.5..22, or added form on a shaded scene; edges ${(eOn / eOff * 100).toFixed(0)}%)`)
    // 8. it costs little: at 4x CPU, once its quality tier has settled, the page keeps >= 80% of its frame rate
    // a tab behind another runs no requestAnimationFrame: bring the measured one to the front first
    const fps = async pg2 => { await pg2.bringToFront(); const c = await pg2.target().createCDPSession(); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await sleep(5000)
      const f = await pg2.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); (function k () { n++; if (performance.now() - t0 < 2500) requestAnimationFrame(k); else r(n / 2.5) })() }))
      await c.send('Emulation.setCPUThrottlingRate', { rate: 1 }); return f }
    // best of two interleaved samples per side: one sample on a loaded machine swung 30 -> 15 fps on its own
    const fOff1 = await fps(base.p)
    const on2 = await open(b, BASE + pg)
    const fOn1 = await fps(on2.p)
    const fOff2 = await fps(base.p), fOn2 = await fps(on2.p)
    const tier = await on2.p.evaluate(() => window.DuniaCinema.state().quality); await on2.p.close()
    const fOff = Math.max(fOff1, fOff2), fOn = Math.max(fOn1, fOn2)
    // a page that cannot hold 50 fps bare is a slow device: the layer must have switched itself off (tier 0, nothing drawn);
    // a page that can must keep >= 80% of its frame rate (raw fps on a shared machine swings too far to compare slow pages)
    if (fOff < 50) ok(tier === 0, `${name}: at 4x CPU the page runs ${fOff.toFixed(0)} fps bare, yet the layer stayed on (tier ${tier})`)
    else ok(fOn >= fOff * 0.8 - 1, `${name}: at 4x CPU the layer costs too much (${fOn.toFixed(0)} fps vs ${fOff.toFixed(0)} without)`)
    const fresh = errs.filter(e => !base.errs.some(x => x.slice(0, 60) === e.slice(0, 60)))
    ok(!fresh.length, `${name}: page errors only with the layer: ${fresh.slice(0, 2).join(' | ')}`)
    await base.p.close()
    const r = await open(b, pin(BASE + pg, 2), true)
    const rm = await r.p.evaluate(async () => {
      const s = window.DuniaCinema && window.DuniaCinema.state(), k = document.querySelector('.dcine.dl'), t1 = k && k.style.backgroundPosition
      await new Promise(res => setTimeout(res, 800))
      return { s, still: !k || k.style.backgroundPosition === t1 }
    })
    ok(rm.s && rm.s.reduced && rm.s.particles === 0 && rm.still, `${name}: reduced motion still moves ${JSON.stringify(rm)}`)
    await r.p.close()
    console.log(`${name}: theme ${st.s && st.s.theme}, particles ${st.s && st.s.particles}, diff ${d.toFixed(1)}, press ${pr.squash}, fps4x ${fOn.toFixed(0)}/${fOff.toFixed(0)} tier ${tier}`)
  } catch (e) { ok(false, `${name}: crashed ${e.message.slice(0, 120)}`) }
  await b.close()
}
// 11. a smooth page earns the full look on its own: unthrottled, a light page reaches tier 2 within 15 s (2026-11-09: one
//     slow loading second sent every 61 fps page to tier 0 for good, so a good tablet showed no effect at all)
for (const pg of ['games/ayo-berhitung.html', 'games/kuis-matematika.html', 'games/stinky-dirty.html'].filter(x => PAGES.includes(x))) {
  // on the machine's GPU, like a real tablet: headless software compositing pays ~70% of a frame for a full-screen blend
  // that a GPU does for free (ayo-berhitung 2026-11-09: tier 2 = 18 fps in software, 61 fps on the GPU)
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist'] })
  const p = await b.newPage(); await p.setViewport({ width: 1024, height: 700 })
  await p.goto(BASE + pg, { waitUntil: 'load' })
  const seen = []
  for (let i = 0; i < 15; i++) { await sleep(1000); seen.push(await p.evaluate(() => window.DuniaCinema.state().quality)) }
  ok(seen.includes(2) && seen.at(-1) >= 1, `${pg}: unthrottled the layer never earns its full look (tiers ${seen.join('')})`)
  await b.close()
}
// 12. an opaque canvas2D scene gets the in-scene half too (bloom, grade, vignette through DuniaGLFX): Timmy's sailing and
//     lane canvases. The copy draws over the scene, the scene's own class stays unique, the picture is live, nothing of
//     the game is lost, and below tier 2 the copy hides and the game's own canvas shows again
for (const [pg, sel] of [['tools/tk-harness-steer.html', '.tks-cv'], ['tools/tk-harness-lanes.html', '.tkl-cv']]) {
  if (process.env.QA_ONLY && !new RegExp(process.env.QA_ONLY).test(pg)) continue
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist'] })
  const p = await b.newPage(); await p.setViewport({ width: 1024, height: 700 })
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 120)))
  await p.goto(BASE + pg + '?cineq=2', { waitUntil: 'load' })
  // the harness pages do not carry the layer; add it exactly as a game page loads it
  await p.addScriptTag({ url: BASE + 'games/dunia-cinema.js?cineq=2' }).catch(e => errs.push('inject ' + e.message))
  await sleep(3500)
  const g = await p.evaluate(async sel => {
    const src = document.querySelector(sel), gl = document.querySelector('canvas.dcine-glfx')
    if (!src || !gl) return { src: !!src, gl: !!gl }
    const r1 = src.getBoundingClientRect(), r2 = gl.getBoundingClientRect()
    return { src: true, gl: true, count: document.querySelectorAll(sel).length, over: Math.abs(r1.left - r2.left) < 2 && Math.abs(r1.top - r2.top) < 2 && Math.abs(r1.width - r2.width) < 2, srcOp: getComputedStyle(src).opacity, glShown: getComputedStyle(gl).display !== 'none' }
  }, sel)
  // live picture, read off the screen (a WebGL canvas without preserveDrawingBuffer reads back blank once shown)
  // (the layer's own particles hidden: they move by themselves and would pass a frozen scene as live)
  await p.evaluate(() => document.querySelectorAll('[data-dcine]').forEach(e => { e.style.visibility = 'hidden' }))
  const f1 = await p.evaluate(() => window.DuniaCinema.glfx().frames)
  const s1 = await p.screenshot(); await sleep(700)
  const f2 = await p.evaluate(() => window.DuniaCinema.glfx().frames)
  await p.evaluate(() => document.querySelectorAll('[data-dcine]').forEach(e => { e.style.visibility = '' }))
  // the picture shows content, and fresh frames keep reaching the GL copy (screen motion alone proved nothing: the
  // harness animates its own overlays, so a frozen copy still looked live)
  g.lum = +(await sharp(s1).greyscale().stats()).channels[0].mean.toFixed(1); g.moved = f2 - f1
  ok(g.src && g.gl && g.over && g.glShown && g.srcOp === '0', `${pg}: no GL copy drawn over the scene ${JSON.stringify(g)}`)
  ok(g.count === 1, `${pg}: the scene's own class ${sel} is no longer unique (${g.count})`)
  ok(g.lum > 15 && g.moved >= 10, `${pg}: the GL copy is not a live picture ${JSON.stringify(g)}`)
  const on = await p.screenshot()
  await p.evaluate(() => { if (window.DuniaCinema && window.DuniaCinema.glfxEnable) window.DuniaCinema.glfxEnable(false); document.querySelectorAll('[data-dcine]').forEach(e => { e.style.display = 'none' }) })
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
  const off = await p.screenshot()
  const [eOn, eOff] = await Promise.all([detail(on), detail(off)])
  ok(eOn >= eOff * 0.85, `${pg}: the scene loses detail under the GL copy (edges ${(eOn / eOff * 100).toFixed(0)}%)`)
  const back = await p.evaluate(sel => { const gl = document.querySelector('canvas.dcine-glfx'); return { srcOp: getComputedStyle(document.querySelector(sel)).opacity, glShown: !!gl && getComputedStyle(gl).display !== 'none' } }, sel)
  ok(back.srcOp === '1' && !back.glShown, `${pg}: switched off, the game's own canvas does not show again ${JSON.stringify(back)}`)
  ok(!errs.length, `${pg}: page errors ${errs.slice(0, 2).join(' | ')}`)
  await b.close()
}
// 13. a DOM hero that jumps stretches on take-off and squashes on landing (Mario's Pikachu): the shape changes on the
//     right frames, the feet stay on the ground while squashed, walking on flat ground adds nothing, and the reduced
//     motion setting turns it off
for (const reduced of [false, true]) {
  if (process.env.QA_ONLY && !/mario/.test(process.env.QA_ONLY)) break
  // tier 0: the squash does not depend on the tier, and the post filter at a pinned tier 2 slowed this software renderer
  // to a few frames a second (Pikachu took 6 s to fall onto the ground)
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist'] })
  const { p, errs } = await open(b, pin(BASE + 'games/mario-pokemon.html', 0), reduced)
  await p.evaluate(() => {
    const cv = document.getElementById('pixi-canvas')
    if (cv) { cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 300 })); cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 200, clientY: 300 })) }
  })
  // a loaded machine (the full gate) takes far longer than 8 s to drop Pikachu onto the ground
  await p.waitForFunction(() => typeof S !== 'undefined' && S.running && S.onGround, { timeout: 30000, polling: 100 }).catch(() => {})
  await sleep(600)
  const key = (type, k) => p.evaluate((type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true })), type, k)
  const n0 = await p.evaluate(() => window.DuniaCinema.body ? window.DuniaCinema.body().anims : -1)
  // walk LEFT, into the level's start wall: walking right ran into a question block on a fast run, and the math prompt
  // then swallowed the jump
  await key('keydown', 'ArrowLeft'); await sleep(900); await key('keyup', 'ArrowLeft'); await sleep(300)
  await p.waitForFunction(() => !S.pendingMath && !S.paused && S.onGround, { timeout: 15000, polling: 100 }).catch(() => {})
  const n1 = await p.evaluate(() => window.DuniaCinema.body ? window.DuniaCinema.body().anims : -1)
  // sample the sprite every frame through one jump: its box height against the resting height, and where its feet are
  await p.evaluate(() => {
    const el = document.getElementById('pikachu-sprite'); window.__jb = []
    const t0 = performance.now()
    const f = () => { const r = el.getBoundingClientRect(); window.__jb.push({ t: performance.now() - t0, h: r.height, w: r.width, bot: r.bottom, g: !!S.onGround }); if (performance.now() - t0 < 2600) requestAnimationFrame(f) }
    requestAnimationFrame(f)
  })
  await sleep(80); await key('keydown', ' '); await sleep(160); await key('keyup', ' ')
  await p.waitForFunction(() => window.__jb.length && window.__jb[window.__jb.length - 1].t >= 6000, { timeout: 30000, polling: 200 }).catch(() => {})
  const j = await p.evaluate(() => ({ s: window.__jb, n: window.DuniaCinema.body ? window.DuniaCinema.body().anims : -1 }))
  const rest = j.s[0], air = j.s.findIndex(x => !x.g), land = air < 0 ? -1 : j.s.findIndex((x, i) => i > air && x.g)
  const hiAir = air < 0 ? 0 : Math.max(...j.s.slice(air, air + 12).map(x => x.h / rest.h))
  const after = land < 0 ? [] : j.s.slice(land, land + 20)
  const loLand = after.length ? Math.min(...after.map(x => x.h / rest.h)) : 1
  const feet = after.length ? Math.max(...after.map(x => Math.abs(x.bot - after[after.length - 1].bot))) : 99
  const tag = reduced ? 'reduced' : 'full'
  ok(!errs.length, `mario ${tag}: page errors ${errs.slice(0, 2).join(' | ')}`)
  const why = await p.evaluate(() => JSON.stringify({ g: S.onGround, pm: !!S.pendingMath, paused: S.paused, over: S.gameOver, run: S.running, n: (window.__jb || []).length }))
  ok(air >= 0 && land > air, `mario ${tag}: the jump never left and landed (air ${air}, land ${land}) ${why}`)
  if (!reduced) {
    ok(n1 === n0 && n0 >= 0, `mario: walking on flat ground fired ${n1 - n0} squash animations (${n0} -> ${n1})`)
    ok(hiAir >= 1.06, `mario: no stretch on take-off (tallest ${hiAir.toFixed(3)} of rest)`)
    ok(loLand <= 0.92, `mario: no squash on landing (shortest ${loLand.toFixed(3)} of rest)`)
    ok(feet <= 1.5, `mario: the feet leave the ground while squashed (${feet.toFixed(1)} px)`)
  } else {
    ok(j.n === n0 && hiAir < 1.02 && loLand > 0.98, `mario reduced: squash still plays (anims ${n0} -> ${j.n}, ${hiAir.toFixed(3)}/${loLand.toFixed(3)})`)
  }
  console.log(`  mario ${tag}: stretch ${hiAir.toFixed(3)} squash ${loLand.toFixed(3)} feet ${feet.toFixed(1)}px anims ${n0}/${n1}/${j.n}`)
  await b.close()
}
// 14. on a phone the in-scene shader adds form without changing the picture's colour (owner screenshot 2026-11-09: Birds
//     came out soft, stair-stepped and washed orange): the filter renders at the game's own resolution, the frame gains
//     edge detail (lit and shaded sides, cast shadows), and its mean brightness and saturation stay within a few
//     percent of the game's own. Same frame on and off (the game's ticker stopped).
const satLum = async buf => {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let L = 0, S = 0, n = 0
  for (let i = 0; i < data.length; i += 3 * 7) { const r = data[i], g = data[i + 1], b = data[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); L += 0.299 * r + 0.587 * g + 0.114 * b; S += mx ? (mx - mn) / mx : 0; n++ }
  return { L: L / n, S: S / n }
}
for (const pg of ['games/pokemon-birds.html', 'games/monster-candy.html', 'games/ducky-volley.html']) {
  if (process.env.QA_ONLY && !new RegExp(process.env.QA_ONLY).test(pg + ' form')) continue
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist'] })
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const errs = []; p.on('pageerror', e => { if (!IGNORE.test(String(e))) errs.push(String(e).slice(0, 120)) })
  await p.goto(pin(BASE + pg, 2), { waitUntil: 'load' }); await sleep(2500)
  for (let i = 0; i < 4; i++) { await p.mouse.click(195, 500); await sleep(300) }
  await sleep(2500)
  const r = await p.evaluate(() => { const a = (0, eval)('typeof app!=="undefined"?app:null'); if (!a) return null; a.ticker.stop(); a.render()
    const f = a.stage.filters && a.stage.filters.find(x => x.resources && x.resources.cine); return { res: a.renderer.resolution, fres: f ? f.resolution : null } })
  const on = await p.screenshot()
  await p.evaluate(() => { window.DuniaCinema.pixiEnable(false); document.querySelectorAll('[data-dcine],canvas.dcine-glfx').forEach(e => { e.style.display = 'none' }); (0, eval)('app').render() })
  const off = await p.screenshot()
  const [eOn, eOff, cOn, cOff] = await Promise.all([detail(on), detail(off), satLum(on), satLum(off)])
  const dL = cOn.L / cOff.L - 1, dS = cOn.S / cOff.S - 1
  console.log(`  form ${pg}: res ${JSON.stringify(r)} edges ${(eOn / eOff * 100).toFixed(0)}% lum ${(dL * 100).toFixed(1)}% sat ${(dS * 100).toFixed(1)}%`)
  ok(r && r.fres === r.res, `${pg}: the scene filter renders at ${r && r.fres}, the game at ${r && r.res} (soft, stair-stepped on a phone)`)
  ok(eOn >= eOff * 1.04, `${pg}: the shader adds no form (edges ${(eOn / eOff * 100).toFixed(0)}% of the game's own)`)
  ok(Math.abs(dL) <= 0.06 && Math.abs(dS) <= 0.08, `${pg}: the shader shifts the colour (brightness ${(dL * 100).toFixed(1)}%, saturation ${(dS * 100).toFixed(1)}%)`)
  ok(!errs.length, `${pg} form: page errors ${errs.slice(0, 2).join(' | ')}`)
  await b.close()
}
// 15. the layer never slows a tap down: on Timmy's route board at tablet size (owner 2026-11-10, a tablet: "gak bisa
//     diperintah, no respond dan glitch") every tap on the arrow adds a command, and the time from the tap to the
//     screen showing it stays within 25 ms of the bare page. A full-screen particle canvas redrawn each frame doubled
//     it (60 -> 130 ms) while the frame rate still read 60, so the auto tier never noticed
const tapLatency = async (q) => {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist'] })
  const p = await b.newPage(); await p.setViewport({ width: 800, height: 1280, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const errs = []; p.on('pageerror', e => { if (!IGNORE.test(String(e))) errs.push(String(e).slice(0, 120)) })
  await p.goto(BASE + 'games/timmy-kapal.html' + q, { waitUntil: 'networkidle2' })
  await p.evaluate(() => { __tk.reset(); __tk.start('kamar', 1) }); await sleep(8000)
  const at = await p.evaluate(() => { const e = document.querySelector('.tkg-chip[data-cmd="E"]') || document.querySelector('.tkg-chip'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  const lat = []
  for (let i = 0; i < 6; i++) {
    await p.evaluate(() => { window.__t = null; new MutationObserver((m, o) => { o.disconnect(); requestAnimationFrame(() => requestAnimationFrame(() => { window.__t = performance.now() - window.__t0 })) }).observe(document.querySelector('.tkg-root') || document.body, { subtree: true, childList: true }); window.__t0 = performance.now() })
    await p.touchscreen.tap(at.x, at.y)
    await p.waitForFunction(() => window.__t != null, { timeout: 10000 }).catch(() => {})
    lat.push(await p.evaluate(() => window.__t == null ? 9999 : window.__t))
    if (i === 3) await p.evaluate(() => __tk.handle().setProgram([]))
    await sleep(350)
  }
  const prog = await p.evaluate(() => __tk.handle().state().program.length)
  const canv = await p.evaluate(() => [...document.querySelectorAll('canvas[data-dcine],.dcine canvas')].length)
  await b.close()
  lat.sort((a, c) => a - c)
  return { med: lat[lat.length >> 1], lat: lat.map(Math.round), prog, canv, errs }
}
if (!process.env.QA_ONLY || /tap|timmy/.test(process.env.QA_ONLY)) {
  const bare = await tapLatency('?nocine=1'), on = await tapLatency('')
  console.log(`  tap latency: bare ${bare.med.toFixed(0)} ms ${JSON.stringify(bare.lat)} | layer ${on.med.toFixed(0)} ms ${JSON.stringify(on.lat)}`)
  ok(on.prog === 2 && bare.prog === 2, `timmy board: taps on the arrow did not all add a command (layer ${on.prog}, bare ${bare.prog} of 2 after the reset)`)
  ok(on.med <= bare.med + 25, `timmy board: a tap takes ${on.med.toFixed(0)} ms to show with the layer, ${bare.med.toFixed(0)} ms bare`)
  ok(on.canv === 0, `timmy board: the layer still draws a full-screen canvas (${on.canv})`)
  ok(!on.errs.length, `timmy board: page errors ${on.errs.slice(0, 2).join(' | ')}`)
}
console.log(`qa-dunia-cinema: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
