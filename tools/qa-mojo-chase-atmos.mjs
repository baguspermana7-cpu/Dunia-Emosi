// G31 Rescue Chase ATMOSPHERE gate (games/mojo-chase-atmos.js + games/data/mojo-chase-atmos-data.js).
//   node tools/qa-mojo-chase-atmos.mjs        full gate (needs the local server on :8081)
//   QA_SHEET=0 ...                            skip the contact sheet;  QA_GPU=0 software raster
// Sections: P plans (25 stages x 400 seeds: snow only on snow, space always night, ~50% transitions, labels)
//           R render matrix (every stage x allowed weather x time, both sky modes, no throw, tint/lights sane)
//           T transitions monotonic + lights on at senja and later + callouts fire once
//           B budget on the owner's phone canvas (824x1830): weather+night <= 2 ms, scenic life <= 0.5 ms
//           I integration in the real chase (hooks called, no errors) + the module is a no-op when absent
//           S one contact sheet: 6 stages x 3 atmospheres + sore->malam and rain-onset sequences
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve(import.meta.dirname, '..')
const BASE = process.env.QA_BASE || 'http://localhost:8081'
const url = BASE + '/games/mojo-swoptops.html?unlock=1&chase=1'
const out = process.env.QA_SHOTS || '/tmp/mojo-chase-atmos-qa'; fs.mkdirSync(out, { recursive: true })
const GPU = process.env.QA_GPU !== '0'
const ONLY = process.env.QA_ONLY || ''   // e.g. QA_ONLY=IS reruns integration + sheet only
const on = k => !ONLY || ONLY.includes(k)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const issues = []; let passed = 0
function check (ok, msg) { if (ok) passed++; else { issues.push(msg); console.error('FAIL', msg) } }
const report = {}
const SCRIPTS = ['/games/data/mojo-chase-atmos-data.js', '/games/mojo-chase-atmos.js']

/* ── P. plans (headless) ──────────────────────────────────────────────────────────────────────── */
globalThis.window = globalThis; globalThis.document = { createElement: () => ({ getContext: () => null }) }
for (const f of ['games/data/mojo-chases.js', 'games/data/mojo-chase-atmos-data.js', 'games/mojo-chase-atmos.js']) (0, eval)(fs.readFileSync(path.join(root, f), 'utf8'))
const CH = globalThis.MojoChases, AT = globalThis.MojoChaseAtmos, AD = globalThis.MojoChaseAtmosData
{
  let snowBad = 0, spaceBad = 0, trans = 0, eligible = 0, rainBad = 0, labelBad = 0, detBad = 0
  const RAIN_OK = new Set(['town', 'suburb', 'citynight', 'raincity', 'forest', 'jungle', 'harbour', 'farm'])
  for (const st of CH.STAGES) {
    const kind = AT.kindOf(st); check(AD.POOL[kind], `stage ${st.id}: atmosphere pool resolves (${kind})`)
    for (let seed = 1; seed <= 400; seed++) {
      for (const pre of [false, true]) {
        globalThis.MojoChase.atmosPre = pre
        const p = AT.plan(st, seed)
        if (p.weather === 'salju' && kind !== 'snow' && !p.coreW) snowBad++
        if (p.weather === 'hujan' && !RAIN_OK.has(kind) && !p.coreW) rainBad++
        if (kind === 'space' && (p.t0 !== 4 || p.t1 !== 4)) spaceBad++
        if (pre && !AD.POOL[kind].noTrans) { eligible++; if (p.trans) trans++ }
        const L = AT.labels(p); if (!L.timeLabel || !L.weatherLabel || /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(L.chip)) labelBad++
        if (JSON.stringify(AT.plan(st, seed)) !== JSON.stringify(p)) detBad++
      }
    }
  }
  globalThis.MojoChase.atmosPre = false
  check(snowBad === 0, `plans: no snow outside snow biomes over 25 x 400 seeds x 2 modes (${snowBad})`)
  check(rainBad === 0, `plans: rain only on town/city/forest/harbour-type biomes (${rainBad})`)
  check(spaceBad === 0, `plans: space is always night (${spaceBad})`)
  const rate = trans / eligible; report.transRate = +rate.toFixed(3)
  check(rate > 0.35 && rate < 0.6, `plans: about half the runs roll a mid-race transition (${(rate * 100).toFixed(1)}%)`)
  check(labelBad === 0, `plans: every plan has an Indonesian chip label, no emoji (${labelBad})`)
  check(detBad === 0, `plans: seeded plans are deterministic (${detBad})`)
  check(AT.preview(CH.stage('pantai'), 9).chip.includes(' · '), `preview chip reads like "Sore · Angin sepoi" (${AT.preview(CH.stage('pantai'), 9).chip})`)
}

const launched = await puppeteer.launch({ headless: true, protocolTimeout: 300000, args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist'].concat(GPU ? ['--use-angle=vulkan', '--enable-gpu'] : []) })
const browser = { newPage: async () => { const pg = await launched.newPage(); await pg.setBypassServiceWorker(true); return pg } }
async function page (w, h, dpr, inject) {
  const p = await browser.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr || 1 })
  const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()) })
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  // the page now ships the module itself: the "absent" arm serves both atmos scripts empty so the A/B stays a real A/B
  // (and the "present" arm is not a double load)
  let shipped = true
  await p.setRequestInterception(true)
  p.on('request', r => shipped && /\/games\/(data\/)?mojo-chase-atmos(-data)?\.js/.test(r.url()) ? r.respond({ status: 200, contentType: 'application/javascript', body: '' }) : r.continue())
  await p.goto(url, { waitUntil: 'networkidle2' }); await p.waitForFunction(() => window.MojoChaseMenu && window.MojoChases)
  shipped = false
  if (inject) for (const s of SCRIPTS) await p.addScriptTag({ url: BASE + s })
  return { p, errors }
}
try {
  /* ── R + T + B: standalone harness on a phone-sized canvas ─────────────────────────────────────── */
  if (on('R')) {
    const { p, errors } = await page(412, 915, 1, true)
    await p.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 824; c.height = 1830; document.body.appendChild(c)
      const x = c.getContext('2d', { alpha: false }), v = { w: 824, h: 1830, hy: 1830 * 0.4, pr: 2, u: 2, css: 0.5, port: true, cx: 412, playerY: 1830 * 0.8 }
      // a stand-in road: segments projected front to back like MojoChaseTrack.renderRoad
      const segs = []; for (let k = 0; k < 80; k++) { const z1 = 1 + k * 0.6, z2 = z1 + 0.6; segs.push({ i: k, p1: { x: 412, y: v.hy + (v.h - v.hy) / z1, w: 700 / z1 }, p2: { x: 412, y: v.hy + (v.h - v.hy) / z2, w: 700 / z2 } }) }
      window.__H = { c, x, v, segs }
    })
    // R. render matrix
    const R = { combos: 0, bad: [], tintBad: 0, lightBad: 0 }
    for (const pre of [true, false]) for (const sid of CH.STAGES.map(x => x.id)) {
      const o = await p.evaluate((pre, sid) => {
      const H = window.__H, A = MojoChaseAtmos, AD = MojoChaseAtmosData, hk = A.hook, out = { combos: 0, bad: [], tintBad: 0, lightBad: 0 }
      {
        MojoChase.atmosPre = pre
        for (const st of [MojoChases.stage(sid)]) {
          const P = AD.POOL[A.kindOf(st)]
          for (const tk of Object.keys(P.times)) for (const wk of Object.keys(P.weather)) {
            try {
              A.force({ time: tk, weather: wk }); hk.init(H.x, st, null)
              for (let f = 0; f < 12; f++) {
                hk.update(1 / 30, { state: 'active', prog: 0.3, quality: f % 3, paused: false, tunnel: f > 9 ? 0.6 : 0 })
                hk.drawSky(H.x, H.v); for (let k = 0; k < H.segs.length; k++) hk.roadSeg(H.x, H.segs[k], k, H.v); hk.drawOverlay(H.x, H.v)
              }
              for (const L of P.life) A.spawn(L)
              for (let f = 0; f < 4; f++) { hk.update(0.4, { state: 'active', prog: 0.3, quality: 2 }); hk.drawSky(H.x, H.v); hk.drawOverlay(H.x, H.v) }
              const tn = hk.tint(); if (tn && !(tn.a >= 0 && tn.a <= 0.6 && /^rgb\(/.test(tn.c))) out.tintBad++
              const d = A.debug(), lo = hk.lightsOn() > 0; if ((d.t >= 3 && !lo) || (d.t < 2.5 && d.weather !== 'hujan' && lo)) out.lightBad++
              if (pre && wk === 'salju' && d.snow === 0) out.bad.push(st.id + ' ' + tk + ' ' + wk + ': no flakes')
              out.combos++
            } catch (e) { out.bad.push(st.id + ' ' + tk + ' ' + wk + ' ' + pre + ': ' + e.message) }
          }
        }
      }
      A.force(null); MojoChase.atmosPre = false; hk.stop(); return out
      }, pre, sid)
      R.combos += o.combos; R.bad.push(...o.bad); R.tintBad += o.tintBad; R.lightBad += o.lightBad
    }
    report.render = { combos: R.combos }
    check(R.combos > 600 && !R.bad.length, `render: every stage x allowed weather x time renders in both sky modes (${R.combos} combos, ${R.bad.slice(0, 3)})`)
    check(R.tintBad === 0, `render: ambient tint stays a cached rgb() with alpha 0..0.6 (${R.tintBad})`)
    check(R.lightBad === 0, `render: lightsOn() is on exactly when t >= senja (${R.lightBad})`)
    // T. transitions
    const T = await p.evaluate(() => {
      const H = window.__H, A = MojoChaseAtmos, hk = A.hook, said = []; hk.say = (t) => said.push(t)
      const res = {}
      const plan = { 'sore-malam': ['pantai', 't', 1], 'hujan-datang': ['kota', 'wI', 1], 'hujan-reda': ['kota', 'wI', -1], 'salju-tebal': ['salju', 'wI', 1] }
      for (const tr in plan) {
        const [sid, key, dir] = plan[tr]; MojoChase.atmosPre = true; A.force({ trans: tr }); said.length = 0
        hk.init(H.x, MojoChases.stage(sid), null)
        let prev = A.debug()[key], mono = true, lightsAtSenja = true, first = prev, rainbow = false, t0 = A.debug().t
        for (let f = 0; f < 90 * 30; f++) {
          hk.update(1 / 30, { state: 'active', prog: 0.4, quality: 2 }); const d = A.debug(), v = d[key]
          if (dir > 0 ? v < prev - 1e-9 : v > prev + 1e-9) mono = false
          if (d.t >= 3 && !(hk.lightsOn() > 0)) lightsAtSenja = false
          if (d.rainbow >= 0) rainbow = true
          prev = v; if (f % 6 === 0) { hk.drawSky(H.x, H.v); hk.drawOverlay(H.x, H.v) }
        }
        const tod = hk.timeOfDay()
        res[tr] = { mono, first, last: prev, lightsAtSenja, said: said.slice(), rainbow, label: tod && tod.label, t0, chip: tod && tod.chip }
      }
      A.force(null); hk.stop(); hk.say = null; MojoChase.atmosPre = false
      return res
    })
    report.transitions = T
    check(T['sore-malam'].mono && T['sore-malam'].first <= 2 && T['sore-malam'].last === 4, `transition sore->senja->malam is monotonic and lands on night (${T['sore-malam'].first} -> ${T['sore-malam'].last})`)
    check(T['sore-malam'].lightsAtSenja && T['sore-malam'].said.includes(MojoChaseAtmosDataNode().SAY.night), `lights switch on from senja onward and Bo says so (${T['sore-malam'].said})`)
    check(T['hujan-datang'].mono && T['hujan-datang'].first === 0 && T['hujan-datang'].last === 1 && T['hujan-datang'].said.includes(AD.SAY.rainStart), `transition cerah->gerimis->hujan is monotonic + "mulai hujan" callout (${T['hujan-datang'].said})`)
    check(T['hujan-reda'].mono && T['hujan-reda'].last === 0 && T['hujan-reda'].rainbow, `transition hujan->cerah is monotonic and a rainbow follows (${T['hujan-reda'].rainbow})`)
    check(T['salju-tebal'].mono && T['salju-tebal'].last === 1, `transition salju builds up monotonically (${T['salju-tebal'].first} -> ${T['salju-tebal'].last})`)
    const SAYS = new Set(Object.values(AD.SAY).filter(t => t !== AD.SAY.rainStop))
    for (const k in T) { const w = T[k].said.filter(t => SAYS.has(t)); check(new Set(w).size === w.length, `weather/time callouts for ${k} fire once each (${w})`) }
    // B. budget: median per-frame delta vs a stand-in frame, flushed with a 1 px readback
    async function budget (label, setup, rate) {
      const cdp = await p.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate })
      const r = await p.evaluate((setup) => {
        const H = window.__H, A = MojoChaseAtmos, hk = A.hook, x = H.x, v = H.v
        MojoChase.atmosPre = setup.pre; A.force(setup.force); hk.init(x, MojoChases.stage(setup.stage), null)
        for (let f = 0; f < 60; f++) hk.update(1 / 60, { state: 'tutorial', prog: 0.3, quality: 2 })
        if (setup.life) for (const L of setup.life) A.spawn(L)
        // the core's own sky blit (full-size canvas) is what the pre-sky mode replaces, so the raster baseline carries it
        const sk = document.createElement('canvas'); sk.width = v.w; sk.height = Math.round(v.hy); sk.getContext('2d').fillRect(0, 0, 9, 9)
        function baseFrame () { if (setup.pre) x.drawImage(sk, 0, 0); else { x.fillStyle = '#5a8fd0'; x.fillRect(0, 0, v.w, v.hy) } x.fillStyle = '#4a4f58'; x.fillRect(0, v.hy, v.w, v.h - v.hy) }
        function atmos () {
          hk.update(1 / 60, { state: 'tutorial', prog: 0.3, quality: 2 }); hk.drawSky(x, v)
          if (setup.road) for (let k = 0; k < H.segs.length; k++) hk.roadSeg(x, H.segs[k], k, v)
          hk.drawOverlay(x, v)
        }
        const main = [], dA = [], dB = []
        for (let f = 0; f < 140; f++) {
          x.getImageData(0, 0, 1, 1)
          let t0 = performance.now(); atmos(); const m = performance.now() - t0   // main thread: JS + command recording
          x.getImageData(0, 0, 1, 1)
          t0 = performance.now(); baseFrame(); x.getImageData(0, 0, 1, 1); const b = performance.now() - t0
          if (setup.pre) { t0 = performance.now(); atmos(); x.getImageData(0, 0, 1, 1) } else { t0 = performance.now(); baseFrame(); atmos(); x.getImageData(0, 0, 1, 1) }
          const a = performance.now() - t0
          if (f >= 20) { main.push(m); dA.push(a); dB.push(b) }
        }
        const med = a => a.slice().sort((p, q) => p - q)[Math.floor(a.length / 2)]
        const d = A.debug(); A.force(null); hk.stop(); MojoChase.atmosPre = false
        return { delta: med(main), raster: med(dA) - med(dB), base: med(dB), alive: d.alive.length, rain: d.rain, snow: d.snow }
      }, setup)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await cdp.detach()
      return r
    }
    report.budget = {}
    const heavy = [
      ['hujan+malam', { stage: 'malam', pre: true, road: true, force: { time: 'malam', weather: 'hujan', intensity: 1 } }],
      ['salju+malam', { stage: 'salju', pre: true, force: { time: 'malam', weather: 'salju', intensity: 1 } }],
      ['angin+sore', { stage: 'musim-gugur', pre: true, force: { time: 'sore', weather: 'angin' } }],
      ['kabut+senja', { stage: 'kota', pre: true, force: { time: 'senja', weather: 'kabut', intensity: 0.9 } }]
    ]
    for (const [name, s] of heavy) {
      let r = await budget(name, s, 1); if (r.delta > 2) r = await budget(name, s, 1)   // one re-measure: other sessions share this CPU
      report.budget[name] = r
      check(r.delta <= 2, `budget ${name}: atmosphere adds <= 2 ms main-thread per frame on the 824x1830 phone canvas (${r.delta.toFixed(2)} ms; rain ${r.rain}, snow ${r.snow})`)
    }
        heavy.push(['late-sky malam+hujan', { stage: 'kota', pre: false, force: { time: 'malam', weather: 'hujan', intensity: 1 } }])
    { const r = await budget('late', heavy[heavy.length - 1][1], 1); report.budget.late = r; check(r.delta <= 2, `budget late-sky night+rain (today's core): <= 2 ms main-thread (${r.delta.toFixed(2)} ms; raster ${r.raster.toFixed(2)} ms)`) }
    const sceneA = await budget('scenic-off', { stage: 'pantai', pre: true, force: { time: 'sore', weather: 'cerah' } }, 1)
    const sceneB = await budget('scenic-on', { stage: 'pantai', pre: true, force: { time: 'sore', weather: 'cerah' }, life: ['flock', 'dolphin', 'sail'] }, 1)
    const scenic = sceneB.delta - sceneA.delta; report.budget.scenic = { delta: +scenic.toFixed(3), alive: sceneB.alive }
    check(sceneB.alive >= 2 && scenic <= 0.5, `budget scenic life: ${sceneB.alive} creatures alive cost <= 0.5 ms (${scenic.toFixed(2)} ms)`)
    check(!errors.length, `harness: no page errors (${errors.slice(0, 3)})`)
    await p.close()
  }

  /* ── I. integration in the real chase + no-op when absent ─────────────────────────────────────── */
  async function runStage (p, id, force, ms) {
    await p.evaluate(f => { if (window.MojoChaseAtmos) MojoChaseAtmos.force(f) }, force || null)
    const done = p.evaluate(id => MojoChaseMenu.run(MojoChases.config(id)), id).catch(() => null)
    // the picker (when wired) starts the chase with Mulai; the core's intro card otherwise
    await p.waitForSelector('#mc-go, .mcp-go', { timeout: 60000 }); await sleep(450)
    if (await p.$('.mcp-go')) await p.evaluate(() => document.querySelector('.mcp-go').click()); else await p.click('#mc-go')
    const t0 = Date.now(); while (Date.now() - t0 < 20000) { const st = await p.evaluate(() => window.__mojoChase && __mojoChase.state().state); if (st === 'cut' || st === 'countdown' || st === 'active') break; await sleep(200) }
    await p.click('.mc-skip').catch(() => {})
    if (ms > 600) { const t1 = Date.now(); while (Date.now() - t1 < 15000) { const st = await p.evaluate(() => __mojoChase.state().state); if (st === 'active') break; await sleep(200) } }   // past the swop flash
    await sleep(ms || 2600)
    return { done }   // wrapped: an async function returning the promise itself would wait for the whole chase
  }
  async function exitStage (p, h) { const done = h.done; await p.click('.mc-pause').catch(() => {}); await sleep(150); await p.click('#mc-exit').catch(() => {}); await Promise.race([done, sleep(3000)]) }
  if (on('I')) {
    const { p, errors } = await page(412, 915, 1, true)
    const done = await runStage(p, 'pantai', { time: 'sore', weather: 'angin' })
    const d = await p.evaluate(() => MojoChaseAtmos.debug())
    report.integration = { calls: d.calls, t: d.t, weather: d.weather }
    check(d.calls.init >= 1 && d.calls.update > 30 && d.calls.sky > 30 && d.calls.over > 30, `integration: the core calls init/update/drawSky/drawOverlay (${JSON.stringify(d.calls)})`)
    const tod = await p.evaluate(() => __mojoChase && MojoChase.hooks.atmos.timeOfDay())
    check(tod && tod.label === 'Sore' && tod.chip, `integration: timeOfDay() reaches the core state (${tod && tod.chip})`)
    await exitStage(p, done)
    check(!errors.length, `integration: no page errors or 404s (${errors.slice(0, 3)})`)
    await p.close()
  }
  // in-game A/B on the real chase (night + heavy rain, the heaviest look): frame median and the core's own
  // per-frame work median, without and with the module, at CPU 1x and 4x (the owner's phone ~ 4x)
  if (on('I')) {
    report.ab = {}
    for (const rate of [1, 4]) {
      const res = {}
      for (const inject of [false, true, false, true]) {
        const { p } = await page(412, 915, 1, inject)
        const cdp = await p.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate })
        const h = await runStage(p, 'kota', { time: 'malam', weather: 'hujan', intensity: 1 }, 6000)
        const s = await p.evaluate(() => { const s = __mojoChase.state(); return { fm: s.frameMedian, work: s.workMedian[s.quality], q: s.quality } })
        const k = inject ? 'on' : 'off'; res[k] = res[k] ? { fm: Math.min(res[k].fm, s.fm), work: Math.min(res[k].work, s.work), q: Math.min(res[k].q, s.q) } : s
        await exitStage(p, h); await p.close()
      }
      report.ab['x' + rate] = res
      check(res.on.work - res.off.work <= 2 && res.on.fm - res.off.fm <= 1.5 && res.on.q >= res.off.q, `in-game budget at CPU ${rate}x: night + heavy rain adds <= 2 ms work, keeps the frame rate and quality tier (work ${res.off.work.toFixed(1)} -> ${res.on.work.toFixed(1)} ms, frame ${res.off.fm.toFixed(1)} -> ${res.on.fm.toFixed(1)} ms, q ${res.off.q}/${res.on.q})`)
    }
  }
  // C. readability: on the SAME frame, the road-vs-roadside luminance contrast at a row between the horizon and
  // Mojo is read before and after drawOverlay; the atmosphere keeps >= 65% of it in every weather (night included).
  // The DOM HUD is untouched: full opacity, and the module adds no element anywhere.
  if (on('C')) {
    const { p, errors } = await page(412, 915, 1, true)
    const looks = [['kota', 'pagi', 'cerah'], ['kota', 'siang', 'berawan'], ['kota', 'pagi', 'kabut'], ['kota', 'sore', 'hujan'], ['kota', 'malam', 'hujan'], ['hutan', 'siang', 'hujan'],
      ['salju', 'pagi', 'salju'], ['salju', 'malam', 'salju'], ['musim-gugur', 'sore', 'angin'], ['pantai', 'malam', 'cerah'], ['kota', 'senja', 'kabut']]
    report.contrast = {}
    const before = await p.evaluate(() => document.querySelectorAll('*').length)
    for (const [id, time, weather] of looks) {
      const h = await runStage(p, id, { time, weather, intensity: 1 }, 1500)
      const r = await p.evaluate(() => new Promise(res => {
        const hk = MojoChase.hooks.atmos, orig = hk.drawOverlay
        hk.drawOverlay = function (c, v) {
          const y = Math.round(v.hy + 0.55 * (v.playerY - v.hy)), w = v.w
          const lum = d => { const a = []; for (let i = 0; i < d.length; i += 4) a.push((0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255); return a }
          const med = a => a.slice().sort((p, q) => p - q)[a.length >> 1]
          const read = () => { const L = lum(c.getImageData(0, y, w, 1).data); return { road: med(L.slice(Math.round(w * 0.44), Math.round(w * 0.56))), side: med(L.slice(0, Math.round(w * 0.07)).concat(L.slice(Math.round(w * 0.93)))) } }
          const b = read(); orig.call(hk, c, v); const a = read(); hk.drawOverlay = orig
          res({ b: Math.abs(b.road - b.side), a: Math.abs(a.road - a.side), dRoad: a.road - b.road })
        }
      }))
      // HUD opacity with the module drawing vs the same moment with it switched off (__mcOff.atmos): identical
      const hudOp = () => p.evaluate(() => [...document.querySelectorAll('.mc-hud, .mc-btn, .mc-pause, .mc-gadget')].map(e => getComputedStyle(e).opacity).join(','))
      const hudOn = await hudOp(); await p.evaluate(() => { window.__mcOff = Object.assign({}, window.__mcOff, { atmos: 1 }) }); await sleep(250)
      const hudOff = await hudOp(); await p.evaluate(() => { delete window.__mcOff.atmos })
      const hud = hudOn === hudOff ? 1 : hudOn + ' vs ' + hudOff
      const ratio = r.b > 0.03 ? r.a / r.b : 1; report.contrast[`${id}-${time}-${weather}`] = +ratio.toFixed(2)
      check(ratio >= 0.65 && r.dRoad <= 0.12, `contrast ${id} ${time} ${weather}: road vs roadside keeps ${(ratio * 100).toFixed(0)}% (>= 65%), road never washed lighter (${r.dRoad.toFixed(3)})`)
      check(hud === 1, `contrast ${id} ${time} ${weather}: HUD opacity untouched (${hud})`)
      await exitStage(p, h)
    }
    const after = await p.evaluate(() => ({ n: document.querySelectorAll('*').length, atmosDom: document.querySelectorAll('[class*=atmos],[id*=atmos]').length }))
    check(after.atmosDom === 0 && after.n <= before + 5, `the module adds no DOM layer (${after.atmosDom} atmos nodes, ${before} -> ${after.n} elements)`)
    check(!errors.length, `contrast: no page errors (${errors.slice(0, 3)})`)
    await p.close()
  }
  if (on('I')) {
    const { p, errors } = await page(412, 915, 1, false)
    const done = await runStage(p, 'malam', null)
    const s = await p.evaluate(() => ({ atmos: typeof window.MojoChaseAtmos, hook: MojoChase.hooks && MojoChase.hooks.atmos, st: __mojoChase.state().state, frames: __mojoChase.state().frames }))
    check(s.atmos === 'undefined' && !s.hook && s.frames > 30, `no-op when absent: the chase runs without the module (${JSON.stringify(s)})`)
    await exitStage(p, done)
    check(!errors.length, `no-op when absent: no page errors (${errors.slice(0, 3)})`)
    await p.close()
  }

  /* ── S. contact sheet (real chase, phone portrait) ───────────────────────────────────────────── */
  if (process.env.QA_SHEET !== '0' && on('S')) {
    const { p, errors } = await page(412, 915, 1, true)
    const shots = []
    const looks = [
      ['pantai', [{ time: 'siang', weather: 'cerah', life: ['gulls', 'sail'] }, { time: 'sore', weather: 'angin', life: ['flock', 'dolphin'] }, { time: 'malam', weather: 'cerah', life: ['shoot'] }]],
      ['kota', [{ time: 'pagi', weather: 'kabut' }, { time: 'sore', weather: 'hujan', intensity: 0.5 }, { time: 'malam', weather: 'hujan', intensity: 1 }]],
      ['hutan', [{ time: 'siang', weather: 'hujan', intensity: 0.9 }, { time: 'senja', weather: 'cerah', life: ['flock'] }, { time: 'malam', weather: 'cerah', life: ['fireflies', 'shoot'] }]],
      ['salju', [{ time: 'pagi', weather: 'salju', intensity: 0.8 }, { time: 'sore', weather: 'cerah', life: ['flock'] }, { time: 'malam', weather: 'salju', intensity: 0.6 }]],
      ['kereta-ngarai', [{ time: 'siang', weather: 'cerah', life: ['train', 'plane'] }, { time: 'sore', weather: 'angin', life: ['flock', 'train'] }, { time: 'malam', weather: 'cerah', life: ['train', 'shoot'] }]],
      ['stadion', [{ time: 'siang', weather: 'cerah', life: ['blimp'] }, { time: 'senja', weather: 'cerah', life: ['fireworks'] }, { time: 'malam', weather: 'cerah', life: ['fireworks', 'shoot'] }]]
    ]
    const ROW = process.env.QA_SHEET_ROW   // e.g. QA_SHEET_ROW=0 re-shoots the first atmosphere of every stage only
    for (const [id, set0] of looks) for (const f of (ROW != null ? [set0[+ROW]] : set0)) {
      const done = await runStage(p, id, { time: f.time, weather: f.weather, intensity: f.intensity }, 900)   // waits past the swop flash
      if (f.life) { await p.evaluate(L => { for (const k of L) MojoChaseAtmos.spawn(k) }, f.life); await sleep(f.life.includes('fireworks') || f.life.includes('shoot') ? 450 : 2600) } else await sleep(1500)
      const file = `${out}/${id}-${f.time}-${f.weather}.png`; await p.screenshot({ path: file }); shots.push({ file, label: `${id} · ${f.time} · ${f.weather}` })
      await exitStage(p, done)
    }
    const seqs = []
    for (const [name, id, force] of ROW != null ? [] : [['sore-malam', 'pantai', { trans: 'sore-malam', tStart: 0, tDur: 7 }], ['hujan-datang', 'kota', { trans: 'hujan-datang', tStart: 0, tDur: 7 }]]) {
      const done = await runStage(p, id, force, 100)
      await p.evaluate(() => MojoChaseAtmos.retime(0, 7))   // the intro already used the clock: replay it on camera
      for (let k = 0; k < 6; k++) { const file = `${out}/seq-${name}-${k}.png`; await p.screenshot({ path: file }); seqs.push({ file, label: `${name} ${k}` }); await sleep(1400) }
      await exitStage(p, done)
    }
    check(!errors.length, `contact sheet: no page errors while shooting (${errors.slice(0, 3)})`)
    // compose in the browser: 6 columns x 3 atmospheres, then two 6-frame sequence rows
    const data = [...shots, ...seqs].map(s => ({ label: s.label, src: 'data:image/png;base64,' + fs.readFileSync(s.file).toString('base64') }))
    const png = await p.evaluate(async (data) => {
      const TW = 206, TH = 458, c = document.createElement('canvas'); c.width = TW * 6; c.height = TH * 5 + 20; const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height)
      x.font = '12px sans-serif'
      for (let i = 0; i < data.length; i++) {
        const im = new Image(); im.src = data[i].src; await im.decode()
        const per = data.length === 6 ? 1 : 3, col = i < 6 * per ? Math.floor(i / per) : (i - 18) % 6, row = i < 6 * per ? i % per : 3 + Math.floor((i - 18) / 6)
        x.drawImage(im, col * TW, row * TH + (row >= 3 ? 20 : 0), TW, TH); x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(col * TW, row * TH + (row >= 3 ? 20 : 0), TW, 16); x.fillStyle = '#fff'; x.fillText(data[i].label, col * TW + 4, row * TH + (row >= 3 ? 20 : 0) + 12)
      }
      return c.toDataURL('image/png').split(',')[1]
    }, data)
    const sheet = ROW != null ? `${out}/atmos-row-${ROW}.png` : `${out}/atmos-contact-sheet.png`
    fs.writeFileSync(sheet, Buffer.from(png, 'base64')); report.sheet = sheet
    await p.close()
  }
} finally { await launched.close() }
function MojoChaseAtmosDataNode () { return AD }
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1))
console.log(`budget main-thread ms ${JSON.stringify(Object.fromEntries(Object.entries(report.budget || {}).map(([k, v]) => [k, +(+v.delta).toFixed(2)])))} in-game ${JSON.stringify(Object.fromEntries(Object.entries(report.ab || {}).map(([k, v]) => [k, v.off.work.toFixed(1) + '->' + v.on.work.toFixed(1)])))} transRate ${report.transRate}`)
console.log(`${issues.length ? 'FAIL' : 'PASS'} ${passed} passed, ${issues.length} failed${issues.length ? ': ' + issues.slice(0, 4).join(' | ') : ''}`)
process.exit(issues.length ? 1 : 0)
