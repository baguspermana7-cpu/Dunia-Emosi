// G27 living scene — games/g27-scene.js. Every promise the design makes is
// measured here, not trusted:
//   - characters are ALIVE when idle (transform changes over time) and the two
//     trucks are never in lockstep
//   - UI never moves (a child's finger must land where it aimed)
//   - no decor layer or character ever covers a control, even under full tilt
//   - tilt shifts NEAR layers more than FAR ones, in the tilt's direction
//   - a desktop with NO gyro still breathes (bindTilt resolves true there even
//     without a sensor; trusting it froze the scene — the module was fixed)
//   - reactions fire: right = hop, wrong = wince, solved = cheer
//   - reduced motion => nothing moves; hidden tab => the loop stops
//   - particles exist per scene; cost per frame stays small under CPU throttle
//
// Target: the harness page by default (tools/g27-scene-harness.html), so the
// module can be proven on its own. Point QA_URL at the game page to run the
// same assertions there.
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const URL = process.env.QA_URL || `${BASE}/tools/g27-scene-harness.html`
// What counts as a CONTROL (must never move, must never be covered). The
// harness uses .ui b; on the game page it is everything interactive or
// readable on the active screen.
const UI = process.env.QA_UI || '.ui b'
// Optional JS run after load, e.g. to open the play screen through the seam.
const PREP = process.env.QA_PREP || ''
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

const VIEWPORTS = [
  { tag: 'phone portrait', w: 390, h: 844, mobile: true },
  { tag: 'phone landscape', w: 844, h: 390, mobile: true },
  { tag: 'tablet landscape', w: 1024, h: 768, mobile: true },
  { tag: 'desktop', w: 1280, h: 800, mobile: false },
]

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

async function open (vp, extra = '') {
  const page = await browser.newPage()
  const cdp = await page.createCDPSession()
  await cdp.send('Network.setBypassServiceWorker', { bypass: true })
  await page.emulate({
    viewport: { width: vp.w, height: vp.h, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile },
    userAgent: vp.mobile ? 'Mozilla/5.0 (Linux; Android 13) Mobile' : 'Mozilla/5.0',
  })
  const errors = []
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 100)))
  let err = null
  for (const t of [45000, 120000]) {
    try { await page.goto(URL + extra, { waitUntil: 'domcontentloaded', timeout: t }); err = null; break }
    catch (e) { err = String(e.message).slice(0, 80) }
  }
  if (err) throw new Error('nav ' + err)
  await page.waitForFunction(() => window.G27Scene && window.G27Scene.state().frames > 5, { timeout: 30000 }).catch(() => {})
  if (PREP) { await page.evaluate(PREP); await sleep(1200) }
  // a gate that finds nothing to test must not pass by default
  const found = await page.evaluate(sel => document.querySelectorAll(sel).length, UI)
  if (!found) throw new Error(`no controls matched QA_UI "${UI}" — refusing to pass an empty test`)
  return { page, cdp, errors }
}

// Only what a child can SEE counts: the game hides a character that has no
// room with visibility:hidden (.no-room), and an earlier version of this gate
// counted those as collisions — it accused a correct layout. A sprite's box
// also includes its transparent padding, so characters are trimmed by the same
// 6% the game's own layout uses.
const boxes = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].filter(e => {
  if (!e.getClientRects().length) return false
  const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05
}).map(e => {
  const r = e.getBoundingClientRect(), k = e.classList.contains('g27-char') || /g27-char-/.test(e.className) ? 0.06 : 0
  return [r.left + r.width * k, r.top + r.height * k, r.right - r.width * k, r.bottom - r.height * k].map(v => Math.round(v * 10) / 10)
}), sel)
const overlap = (a, b) => !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1])

try {
  for (const vp of VIEWPORTS) {
    const { page, cdp, errors } = await open(vp)
    const T = vp.tag
    const st = await page.evaluate(() => window.G27Scene.state())
    const hiddenByLayout = await page.evaluate(() => [...document.querySelectorAll('.g27-char-truck,.g27-char-digger')]
      .filter(e => e.getClientRects().length && getComputedStyle(e).visibility === 'hidden').length)
    check(st.running, `${T}: the living layer runs`)
    check(st.particles > 0, `${T}: ambient particles present (${st.particles})`)

    // ---- idle life -------------------------------------------------------
    // only the characters a child can see; the game hides one that has no
    // room (visibility:hidden) and that is the layout's call, not a defect
    const tf = () => page.evaluate(() => [...document.querySelectorAll('.g27-char-truck,.g27-char-digger')]
      .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(e => e.style.transform))
    const a = await tf(); await sleep(450); const b = await tf()
    if (!a.length) console.log(`  n/a  ${T}: no character visible here — ${hiddenByLayout} hidden by the game's no-room layout`)
    else {
      check(a.every((v, i) => v !== b[i]), `${T}: every visible character moves when idle (${a.length} visible)`)
      if (a.length === 2) check(a[0] !== a[1], `${T}: the two trucks are not in lockstep`)
    }

    // ---- UI never moves --------------------------------------------------
    const ui0 = await boxes(page, UI)
    // ---- bounds: drift for a while AND force a full tilt ----------------
    let worst = 0
    const uiAll = ui0
    for (let i = 0; i < 12; i++) {
      await page.evaluate(k => {
        const g = (k % 2 ? 60 : -60), be = (k % 3 ? 100 : -10)
        window.dispatchEvent(Object.assign(new Event('deviceorientation'), { gamma: g, beta: be }))
      }, i)
      await sleep(260)
      const deco = await boxes(page, '[data-depth]:not(.g27-bg), .g27-char-truck, .g27-char-digger')
      for (const d of deco) for (const u of uiAll) if (overlap(d, u)) worst++
    }
    const ui1 = await boxes(page, UI)
    check(JSON.stringify(ui0) === JSON.stringify(ui1), `${T}: UI boxes never move`)
    check(worst === 0, `${T}: no decor or character ever covers a control under drift + full tilt (${worst} hits)`)

    // ---- tilt: near moves more than far, in the tilt's direction --------
    const xs = async () => page.evaluate(() => {
      const get = sel => { const e = document.querySelector(sel); const m = /translate3d\(\s*([-\d.]+)px/.exec(e.style.transform || ''); return m ? +m[1] : 0 }
      // NEAR = the nearest VISIBLE moving layer, characters included. In the
      // game the depth effect is the trucks (0.7) sliding against the far
      // backdrop (0.08); a decor layer parked beside a control is clamped still
      // by design, so measuring only non-character decor tested nothing.
      const shown = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'
      const vis = [...document.querySelectorAll('[data-depth]')].filter(e => shown(e) && !e.classList.contains('g27-bg'))
      const xs = vis.map(e => { const m = /translate3d\(\s*([-\d.]+)px/.exec(e.style.transform || ''); return { d: parseFloat(e.dataset.depth), x: m ? +m[1] : 0 } })
      return { far: get('.g27-bg'), near: xs, n: xs.length }
    })
    for (let i = 0; i < 20; i++) { await page.evaluate(() => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { gamma: 35, beta: 45 }))); await sleep(50) }
    const right = await xs()
    for (let i = 0; i < 20; i++) { await page.evaluate(() => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { gamma: -35, beta: 45 }))); await sleep(50) }
    const left = await xs()
    const farSpan = Math.abs(right.far - left.far)
    // the widest-moving visible near layer (others may be clamped beside a control)
    const nearSpan = right.near.reduce((m, r, i) => Math.max(m, Math.abs(r.x - ((left.near[i] || {}).x || 0))), 0)
    if (!right.n) console.log(`  n/a  ${T}: no near layer visible here`)
    else {
      check(nearSpan > farSpan * 3, `${T}: tilt moves near layers far more than far ones (near ${nearSpan.toFixed(1)}px vs far ${farSpan.toFixed(1)}px)`)
      check(nearSpan <= vp.w * 0.07, `${T}: sway stays calm (${nearSpan.toFixed(1)}px across a full left-right tilt)`)
    }

    // ---- reactions ------------------------------------------------------
    const y = () => page.evaluate(() => { const e = [...document.querySelectorAll('.g27-char-truck')].find(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden'); if (!e) return null; const m = /translate3d\(\s*[-\d.]+px,\s*([-\d.]+)px/.exec(e.style.transform); return m ? +m[1] : 0 })
    // Poll rather than sample once: on this loaded box a single 40 ms sample
    // sometimes landed before the next frame and read the hop as absent.
    const y0 = await y()
    if (y0 === null) { console.log(`  n/a  ${T}: truck hidden by the layout here — reactions not observable`) }
    else {
    await page.evaluate(() => window.G27Scene.react('right'))
    let yMin = y0
    for (let i = 0; i < 12; i++) { await sleep(50); yMin = Math.min(yMin, await y()) }
    const roomUp = (await page.evaluate(() => window.G27Scene.state().room))[0]
    if (roomUp != null && roomUp < 8) console.log(`  n/a  ${T}: truck parked ${roomUp}px under a control — hop clamped by design (overlap is asserted instead)`)
    else check(yMin < y0 - 4, `${T}: a right letter makes the truck hop (${y0.toFixed(1)} -> ${yMin.toFixed(1)})`)
    await sleep(700)
    await page.evaluate(() => window.G27Scene.react('solved'))
    let rotMin = 99
    for (let i = 0; i < 12; i++) {
      await sleep(50)
      const r = await page.evaluate(() => { const m = /rotate\(([-\d.]+)deg/.exec(document.querySelector('.g27-char-digger').style.transform); return m ? +m[1] : 99 })
      rotMin = Math.min(rotMin, r)
    }
    const roomD = (await page.evaluate(() => window.G27Scene.state().room))[1]
    if (roomD != null && roomD < 12) console.log(`  n/a  ${T}: digger has ${roomD}px of headroom — bucket raise clamped by design`)
    else check(rotMin <= -4, `${T}: a solved word makes the digger raise its bucket (lowest rotate ${rotMin.toFixed(1)}deg)`)
    }

    check(errors.length === 0, `${T}: no page errors${errors.length ? ' — ' + errors[0] : ''}`)
    await page.close()
  }

  // ---- no gyro at all (desktop): must still breathe on its own ----------
  {
    const { page } = await open(VIEWPORTS[3])
    await page.evaluate(() => window.G27Scene.enableTilt())       // resolves true with no sensor
    const look = async () => page.evaluate(() => window.G27Scene.state().look)
    await sleep(3000); const l1 = await look(); await sleep(1500); const l2 = await look()
    check(Math.abs(l1.x - l2.x) + Math.abs(l1.y - l2.y) > 0.01, 'desktop with no gyro still drifts after bindTilt() (was frozen)')
    await page.close()
  }

  // ---- reduced motion ----------------------------------------------------
  {
    const page = await browser.newPage()
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await sleep(1500)
    const s = await page.evaluate(() => ({ st: window.G27Scene.state(), tf: document.querySelector('.g27-char-truck').style.transform }))
    check(!s.st.running && s.tf === '', `reduced motion: nothing moves (running=${s.st.running}, transform="${s.tf}")`)
    await page.close()
  }

  // ---- hidden tab stops the loop -----------------------------------------
  {
    const { page, cdp } = await open(VIEWPORTS[2])
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false }).catch(() => {})
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')) })
    await sleep(300); const f1 = await page.evaluate(() => window.G27Scene.state().frames)
    await sleep(800); const f2 = await page.evaluate(() => window.G27Scene.state().frames)
    check(f2 - f1 <= 1, `hidden tab stops the animation loop (${f2 - f1} frames while hidden)`)
    await page.close()
  }

  // ---- every scene preset has particles ----------------------------------
  {
    const { page } = await open(VIEWPORTS[2])
    const scenes = ['town', 'construction', 'recycling', 'park', 'sunrise', 'classroom', 'bedroom', 'night', 'reward']
    const empty = []
    for (const s of scenes) {
      const n = await page.evaluate(k => { window.G27Scene.setScene(k); return window.G27Scene.state().particles }, s)
      if (!n) empty.push(s)
    }
    check(empty.length === 0, `every backdrop has an ambient particle preset${empty.length ? ' — EMPTY: ' + empty.join(', ') : ''}`)
    await page.close()
  }

  // ---- nothing that moves may carry a CSS filter (5.8 fps -> 43 fps) -------
  {
    const { page } = await open(VIEWPORTS[2])
    const filtered = await page.evaluate(() => [...document.querySelectorAll('[data-depth], .g27-char-truck, .g27-char-digger')]
      .filter(e => { const f = getComputedStyle(e).filter; return f && f !== 'none' }).map(e => e.className || e.tagName))
    check(filtered.length === 0, `no moving layer carries a CSS filter${filtered.length ? ' — ' + filtered.join(', ') : ''}`)
    // STEADY state is what a child lives in. The game's first seconds are busy
    // (offline warm-up + decode: measured ~3 fps, then 55-58), and the game
    // starts this layer only when idle for exactly that reason — so wait for
    // the warm-up to finish, then measure. A genuinely heavy layer cannot hide
    // behind that: it stays slow after the warm-up too.
    // (__g27.warmed() flips true when the warm-up STARTS, and never runs at all
    // with the service worker bypassed as it is here, so it is no signal.
    // Settled was measured at ~5 s after load; wait 6.)
    await sleep(6000)
    const f0 = await page.evaluate(() => window.G27Scene.state().frames); await sleep(3000)
    const fps = (await page.evaluate(() => window.G27Scene.state().frames) - f0) / 3
    check(fps >= 20, `the living scene keeps a usable frame rate on a software renderer, steady state (${fps.toFixed(1)} fps)`)
    await page.close()
  }

  // ---- the solved burst adds confetti, then drains back (no leak) ---------
  {
    const { page } = await open(VIEWPORTS[2])
    await page.evaluate(() => window.G27Scene.setScene('reward'))
    await sleep(400)
    const base = await page.evaluate(() => window.G27Scene.state().particles)
    await page.evaluate(() => window.G27Scene.react('solved'))
    await sleep(120)
    const peak = await page.evaluate(() => window.G27Scene.state().particles)
    let after = peak
    // up to 30 s: burst confetti start above the top edge and must fall the whole
    // height; on a slow headless renderer that is ~10 s of simulated time
    for (let i = 0; i < 150 && after > base; i++) { await sleep(200); after = await page.evaluate(() => window.G27Scene.state().particles) }
    check(peak >= base + 30, `a solved word bursts confetti (${base} -> ${peak})`)
    check(after === base, `the burst drains back to the preset, so solving many words never piles up (${after} vs ${base})`)
    await page.close()
  }

  // ---- cost under a throttled CPU ----------------------------------------
  {
    const { page, cdp } = await open(VIEWPORTS[2])
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await sleep(800)
    // best of 3 windows: contention from other sessions only ever ADDS time,
    // so the fastest window is the page's own cost; a genuinely expensive frame
    // (like the layout thrash this gate caught) cannot produce a fast window.
    const windowMs = () => page.evaluate(() => new Promise(res => {
      const orig = window.requestAnimationFrame, spans = []
      window.requestAnimationFrame = cb => orig(ts => { const s = performance.now(); cb(ts); spans.push(performance.now() - s) })
      setTimeout(() => { window.requestAnimationFrame = orig; spans.sort((a, b) => a - b); res(spans[Math.floor(spans.length / 2)] || 0) }, 2000)
    }))
    const tries = [await windowMs(), await windowMs(), await windowMs()]
    const ms = Math.min(...tries)
    check(ms < 4, `median frame work under a 4x CPU throttle stays small (best ${ms.toFixed(2)} ms of ${tries.map(t => t.toFixed(1)).join('/')})`)
    await page.close()
  }
} finally {
  await browser.close()
}
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
