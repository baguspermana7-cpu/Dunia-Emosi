#!/usr/bin/env node
// qa-dunia-cinema-input — the cinematic layer must never get between a child's finger and the game. On EVERY page that
// carries the layer, at phone and tablet size, with a real GPU path (the auto tier as a device would run it):
//   1. no point of the screen hit-tests to a layer element (a 7x11 grid of taps all land on the game)
//   2. a tap reaches the screen as fast as without the layer: an injected neutral button toggles a class on
//      pointerdown; tap -> two frames later, median of 6, within 25 ms of the bare page (?nocine=1); a page over the
//      line is measured once more on both sides and the better medians compared (a busy page swings 30 ms bare)
//   3. a press that the browser cancels (a scroll) leaves nothing squashed: no running dcine-press animation and the
//      button's box back to its own size
//   4. no page error that the bare page does not also throw
// Built 2026-11-10 after the owner's tablet showed Timmy's route board "no respond dan glitch": a full-screen particle
// canvas doubled the tap-to-screen time while the frame rate still read 60.
// Usage: BASE=http://127.0.0.1:8097/ node tools/qa-dunia-cinema-input.mjs   (QA_ONLY=regex limits the pages)
import fs from 'fs'
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const BASE = process.env.BASE || 'http://localhost:8090/Dunia-Emosi/'
const SKIP = new Set(['mojo-chase-embed.html', 'blippi.html', 'film-anak.html', 'film-play.html'])
let PAGES = ['index.html'].concat(fs.readdirSync('games').filter(f => f.endsWith('.html') && !f.startsWith('_') && !SKIP.has(f)).sort().map(f => 'games/' + f))
if (process.env.QA_ONLY) { const re = new RegExp(process.env.QA_ONLY); PAGES = PAGES.filter(p => re.test(p)) }
const SIZES = [['phone', 390, 844, 3], ['tablet', 800, 1280, 2]]
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|googleapis|gstatic|unpkg|AudioContext|play\(\) request/i
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }

async function measure (b, url, size) {
  const [, w, h, dpr] = size
  const p = await b.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: true, hasTouch: true })
  const errs = []; p.on('pageerror', e => { if (!IGNORE.test(String(e))) errs.push(String(e).slice(0, 120)) })
  await p.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(e => errs.push('goto ' + e.message))
  await sleep(7000)    // past the layer's 6 s grace, so the auto tier has settled as on a device
  // the probe button sits on top of the page (its own z-index below the layer's), toggles on pointerdown
  await p.evaluate(() => {
    const t = document.createElement('button'); t.id = 'qa-probe'; t.className = 'btn'; t.textContent = 'probe'
    t.style.cssText = 'position:fixed;left:40%;top:45%;width:20%;height:56px;z-index:2147482000;background:#fff;color:#000;border:0'
    t.addEventListener('pointerdown', () => { t.classList.toggle('qa-on'); window.__t1 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => { window.__t = performance.now() - window.__t0 })) })
    document.body.appendChild(t)
  })
  const r = await p.evaluate(() => { const e = document.getElementById('qa-probe').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 } })
  const lat = []
  for (let i = 0; i < 6; i++) {
    await p.evaluate(() => { window.__t = null; window.__t0 = performance.now() })
    await p.touchscreen.tap(r.x, r.y)
    await p.waitForFunction(() => window.__t != null, { timeout: 8000 }).catch(() => {})
    lat.push(await p.evaluate(() => window.__t == null ? 9999 : window.__t))
    await sleep(250)
  }
  lat.sort((a, c) => a - c)
  // hit-test grid: no point lands on a layer element
  const hits = await p.evaluate((w, h) => {
    const bad = []
    for (let i = 0; i < 7; i++) for (let j = 0; j < 11; j++) {
      const x = (i + 0.5) * w / 7, y = (j + 0.5) * h / 11, e = document.elementFromPoint(x, y)
      if (e && e.closest && (e.closest('[data-dcine]') || e.classList.contains('dcine-glfx'))) bad.push(Math.round(x) + ',' + Math.round(y))
    }
    return bad
  }, w, h)
  // a cancelled press (the browser took it as a scroll) leaves nothing squashed
  const cdp = await p.target().createCDPSession()
  const before = await p.evaluate(() => { const e = document.getElementById('qa-probe').getBoundingClientRect(); return { w: e.width, h: e.height } })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] })
  await sleep(120)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await sleep(900)
  const after = await p.evaluate(() => { const t = document.getElementById('qa-probe'), e = t.getBoundingClientRect(); return { w: e.width, h: e.height, running: t.getAnimations().filter(a => a.id === 'dcine-press' && a.playState === 'running').length } })
  const st = await p.evaluate(() => window.DuniaCinema && window.DuniaCinema.state ? window.DuniaCinema.state() : null)
  await p.close()
  return { med: lat[lat.length >> 1], lat: lat.map(Math.round), hits, squashed: Math.abs(after.w - before.w) > 0.5 || Math.abs(after.h - before.h) > 0.5 || after.running > 0, after, before, st, errs }
}

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output', '--enable-gpu', '--use-angle=gl', '--ignore-gpu-blocklist'] })
for (const pg of PAGES) {
  for (const size of SIZES) {
    const tag = `${pg.replace('games/', '').replace('.html', '')} ${size[0]}`
    try {
      const bareUrl = BASE + pg + (pg.includes('?') ? '&' : '?') + 'nocine=1'
      const bare = await measure(b, bareUrl, size)
      const on = await measure(b, BASE + pg, size)
      // a busy home page swings 30 ms between two bare loads (index tablet: 53..85): over the line once, measure both
      // again and compare each side's better median
      if (on.med > bare.med + 25) {
        const bare2 = await measure(b, bareUrl, size), on2 = await measure(b, BASE + pg, size)
        bare.med = Math.min(bare.med, bare2.med); on.med = Math.min(on.med, on2.med); on.lat = on.lat.concat(['|'], on2.lat)
      }
      console.log(`${tag}: tier ${on.st && on.st.quality} tap ${on.med.toFixed(0)} ms (bare ${bare.med.toFixed(0)}) ${JSON.stringify(on.lat)}`)
      ok(on.st && on.st.on, `${tag}: the layer is not on`)
      ok(on.med <= bare.med + 25, `${tag}: a tap takes ${on.med.toFixed(0)} ms to reach the screen with the layer, ${bare.med.toFixed(0)} ms bare ${JSON.stringify(on.lat)} / ${JSON.stringify(bare.lat)}`)
      ok(!on.hits.length, `${tag}: taps land on the layer at ${on.hits.slice(0, 4).join(' ')}`)
      ok(!on.squashed, `${tag}: a cancelled press leaves the button squashed ${JSON.stringify(on.before)} -> ${JSON.stringify(on.after)}`)
      const fresh = on.errs.filter(e => !bare.errs.some(x => x.slice(0, 60) === e.slice(0, 60)))
      ok(!fresh.length, `${tag}: page errors only with the layer: ${fresh.slice(0, 2).join(' | ')}`)
    } catch (e) { ok(false, `${tag}: crashed ${e.message.slice(0, 120)}`) }
  }
}
await b.close()
console.log(`qa-dunia-cinema-input: ${pass}/${pass + fail} checks passed`)
process.exit(fail ? 1 : 0)
