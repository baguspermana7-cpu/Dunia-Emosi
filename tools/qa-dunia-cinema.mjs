// qa-dunia-cinema.mjs — the cinematic layer (games/dunia-cinema.js) is on EVERY game page and helps without harming
// (owner 2026-11-09: "Semua game di dunia emosi enhance animation nya. Literally semuanya"). Laws, per page:
//   1. the layer is on: DuniaCinema.state().on, the page's theme, grade + light (key/fill/haze/vignette) + particles
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
const meanDiff = async (a, c) => {
  const crop = { left: 256, top: 175, width: 512, height: 350 }
  const [x, y] = await Promise.all([a, c].map(buf => sharp(buf).extract(crop).raw().toBuffer()))
  let s = 0; for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]); return s / x.length
}

for (const pg of PAGES) {
  const name = pg.replace(/^games\//, '').replace(/\.html$/, '')
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
  try {
    const { p, errs } = await open(b, pin(BASE + pg, 2))
    const st = await p.evaluate(() => {
      const L = [...document.querySelectorAll('[data-dcine]')], s = window.DuniaCinema && window.DuniaCinema.state()
      return { s, layers: ['dg', 'dl', 'dp'].every(c => L.some(e => e.classList.contains(c))), pe: L.length && L.every(e => getComputedStyle(e).pointerEvents === 'none') ? 'none' : 'auto' }
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
      return { hooked, op: seen.includes('1') ? '1' : seen.join('/') }
    })
    if (!mo.none) ok(mo.hooked && mo.op === '1', `${name}: a reward moment does not light the scene ${JSON.stringify(mo)}`)
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
    ok(d >= 1.5 && d <= 22, `${name}: centre changes by ${d.toFixed(1)} (want 1.5..22)`)
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
console.log(`qa-dunia-cinema: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
