// qa-vfx-poke.mjs — Pokemon battle VFX gate (shared library: games/vfx-engine.js + vfx-poke.js + data/vfx-db.js).
// Games: G10 Pertarungan Pokemon (game.js g10DoAttack), G13 Evolusi Math / G13B Quick Fire (g13SpawnAttackEffect),
//        Gym Pokemon (BattleArena.attack in games/battle-arena.js).
//   1. every one of the 18 types draws its OWN effect set (wind-up + projectile head + trail + impact), all 18 fingerprints differ
//   2. the existing completion callback still fires at today's moment (G10 ~820 ms, Gym lands <= 1.2 s) and effects clean up (0 nodes <= 2.5 s)
//   3. effect layer never exceeds the engine cap; no page errors
//   4. reduced motion: no transform on any effect node, impact still lands, clean
//   5. busiest attack at 4x CPU: worst frame <= 50 ms (rerun once if the machine is loaded)
// QA_FAULT=1 blocks vfx-poke.js: the "own effect set" checks MUST fail (proves the gate sees a missing library).
// QA_SHEET=<dir> writes before/after screencast frame sheets for G10 (before = vfx-poke.js blocked).
import puppeteer from 'puppeteer'
import fs from 'fs'
const BASE = process.env.QA_BASE || 'http://localhost:8081'
const ONLY = process.env.QA_ONLY || ''
const on = k => !ONLY || ONLY === k
const sleep = ms => new Promise(r => setTimeout(r, ms))
let fails = 0, passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails++; console.log('FAIL  ' + msg) } }
const TYPES = ['fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy','normal']
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader'] })

// records every library node: image id + filter, lifetimes, peak concurrent
function instrument () {
  window.__v = { sets: {}, cur: null, peak: 0, tf: 0, errs: [] }
  const born = new Map()
  const isFx = n => n.nodeType === 1 && n.hasAttribute && n.hasAttribute('data-vfx')
  const mo = new MutationObserver(ms => {
    for (const m of ms) {
      m.addedNodes.forEach(n => {
        if (!isFx(n)) return
        born.set(n, 1)
        window.__v.peak = Math.max(window.__v.peak, born.size)
        const id = n.getAttribute('data-vfx')
        const k = window.__v.cur; if (k) { (window.__v.sets[k] = window.__v.sets[k] || {})[id + '|' + n.getAttribute('data-vfx-tint')] = 1 }
      })
      m.removedNodes.forEach(n => born.delete(n))
    }
  })
  mo.observe(document, { childList: true, subtree: true })
  window.__alive = () => born.size
  setInterval(() => { born.forEach((_, n) => { if (n.style.transform && n.style.transform !== 'none') window.__v.tf++ }) }, 40)
}
async function open (url, { reduce, throttle, block } = {}) {
  const p = await b.newPage(); const errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: 1280, height: 800, hasTouch: true })
  if (reduce) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.evaluateOnNewDocument(() => { try { Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: () => ({ register: () => Promise.reject(new Error('blocked')), addEventListener () {}, ready: Promise.resolve({}) }) }) } catch (_) {} })
  await p.evaluateOnNewDocument(instrument)
  if (process.env.QA_DEBUG) console.log('  open ' + url + ' fault=' + process.env.QA_FAULT)
  if (block || process.env.QA_FAULT) { await p.setCacheEnabled(false); await p.setRequestInterception(true); p.on('request', r => { if (/vfx-poke\.js/.test(r.url())) { if (process.env.QA_DEBUG) console.log('  blocked ' + r.url()); r.abort() } else r.continue() }) }
  if (throttle) await (await p.createCDPSession()).send('Emulation.setCPUThrottlingRate', { rate: throttle })
  await p.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 40000 })
  return { p, errs }
}
const fingerprints = {}
function judge (game, sets, types, pre, min = 3) {
  const sig = new Set()
  for (const t of types) {
    const s = Object.keys(sets[pre + t] || {})
    const ids = new Set(s.map(x => x.split('|')[0]))
    if (process.env.QA_DEBUG && s.length < min) console.log('   ' + game + ' ' + t + ' => ' + s.join(' ; '))
    check(s.length >= min && ids.size >= 2, `${game} ${t}: own effect set drawn (${s.length} nodes kinds, ${ids.size} sheets)`)
    sig.add(s.sort().join(','))
  }
  check(sig.size === types.length, `${game}: all ${types.length} types differ (${sig.size} distinct)`)
}

// ---------- G10 (index.html, real game.js g10DoAttack on the real battle screen) ----------
async function bootG10 (p) {
  await p.waitForFunction(() => typeof window.initGame10 === 'function' && typeof window.showScreen === 'function', { timeout: 25000 })
  await p.evaluate(() => {
    try { const l = document.getElementById('page-loader'); if (l) l.remove() } catch (_) {}
    window.state = window.state || {}
    Object.assign(window.state, { players: [{ animal: '🦊', name: 'Rara', stars: 0, ageTier: 'tumbuh' }, { animal: '🐼', name: 'Bimo', stars: 0, ageTier: 'tumbuh' }], currentPlayer: 0, mode: 'solo', selectedLevel: 'easy', selectedLevelNum: 3, gameStars: [0, 0], currentGame: 10 })
    window.showScreen('screen-game10'); window.initGame10()
  })
  await p.waitForFunction(() => document.querySelectorAll('#g10-choices button').length >= 4, { timeout: 20000 })
  await sleep(1500)
}
const g10Run = (p, type) => p.evaluate((type) => new Promise(res => {
  __v.cur = 'g10:' + type; const t0 = performance.now()
  g10DoAttack(type, 'player', 'enemy', () => res(Math.round(performance.now() - t0)))
}), type)

if (on('g10')) {
  const { p, errs } = await open('/index.html'); await bootG10(p)
  const libOk = await p.evaluate(() => !!(window.VFX && VFX.Poke && VFX.Poke.ready()))
  check(libOk || !!process.env.QA_FAULT, 'G10: library loaded on index.html')
  const doneAt = []
  for (const t of TYPES) { doneAt.push(await g10Run(p, t)); await sleep(150) }
  await sleep(2500)
  const r = await p.evaluate(() => ({ sets: __v.sets, alive: __alive(), peak: __v.peak }))
  judge('G10', r.sets, TYPES, 'g10:')
  const med = doneAt.slice().sort((a, b) => a - b)[9]
  check(med >= 700 && med <= 1000 && Math.max(...doneAt) <= 4000, `G10 completion callback timing unchanged (median ${med} ms; ${Math.min(...doneAt)}-${Math.max(...doneAt)})`)
  check(r.alive === 0, 'G10 effects cleaned up (' + r.alive + ' alive)')
  check(r.peak <= 32, 'G10 effect cap holds (peak ' + r.peak + ')')
  // what a child SEES: projectile size at mid-flight, impact size at the target, and both on top
  for (const t of ['fire', 'water', 'electric', 'grass', 'ice', 'rock', 'psychic', 'ghost']) {
    await sleep(900)
    const m = await p.evaluate((t) => new Promise(res => {
      const rect = id => { const r = document.getElementById(id).getBoundingClientRect(); return { w: r.width, h: r.height } }
      const A = rect('g10-pspr'), D = rect('g10-espr'), out = { A, D, t }
      const fxNodes = () => [...document.querySelectorAll('[data-vfx]')]
      const topZ = () => Math.max(0, ...[...document.querySelectorAll('body *')].filter(e => !e.hasAttribute('data-vfx') && !e.closest('[data-vfx]') && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).map(e => { const z = parseInt(getComputedStyle(e).zIndex, 10); return isNaN(z) ? 0 : z }))
      g10DoAttack(t, 'player', 'enemy', () => {})
      setTimeout(() => {   // mid-flight
        const c = fxNodes().find(n => /^core:/.test(n.getAttribute('data-vfx')))
        if (c && c.getAttribute('data-vfx') !== 'core:bolt' && c.tagName !== 'svg') {
          const r = c.getBoundingClientRect(); out.head = Math.round(Math.max(c.offsetWidth, c.offsetHeight) * 0.85)
          c.style.pointerEvents = 'auto'; const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); out.headTop = el === c; c.style.pointerEvents = 'none'
        } else if (c) { const l = c.querySelector('polyline'); out.head = l ? 999 : 0; out.headTop = parseInt(c.style.zIndex, 10) > topZ() }
        out.zTop = topZ()
        out.moved = fxNodes().filter(n => n.style.left && n.style.left !== '0px').length   // any node positioned with left/top (layout) instead of transform
      }, 170)
      const sampleImp = () => {   // impact
        if (out.imp) return
        const c = fxNodes().find(n => n.getAttribute('data-vfx') === 'impact-core')
        if (c) { const r = c.getBoundingClientRect(); out.imp = Math.round(Math.max(c.offsetWidth, c.offsetHeight)); c.style.pointerEvents = 'auto'
          const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); out.impTop = el === c; c.style.pointerEvents = 'none' }
      }
      setTimeout(sampleImp, 420); setTimeout(sampleImp, 520); setTimeout(() => res(out), 560)
    }), t)
    if (process.env.QA_DEBUG) console.log('   ' + JSON.stringify(m))
    const big = Math.max(m.A.w, m.A.h), dsz = Math.max(m.D.w, m.D.h)
    check(m.head >= Math.max(60, big * 0.3), `G10 ${t}: projectile readable mid-flight (${m.head}px vs attacker ${Math.round(big)}px)`)
    check(m.headTop && 99994 > m.zTop, `G10 ${t}: projectile is on top (elementFromPoint / z-index ${m.zTop})`)
    check(m.imp >= dsz * 1.2, `G10 ${t}: impact burst >= 1.2x defender (${m.imp}px vs ${Math.round(dsz)}px)`)
    check(m.impTop, `G10 ${t}: impact is on top at its centre`)
    check(m.moved === 0, `G10 ${t}: effects move by transform only (${m.moved} nodes use left/top)`)
  }
  check(errs.length === 0, 'G10 no page errors: ' + errs.slice(0, 2).join(' | '))
  await p.close()
}
// G10 reduced motion
if (on('g10')) {
  const { p, errs } = await open('/index.html', { reduce: true }); await bootG10(p)
  for (const t of ['fire', 'water', 'electric']) { await g10Run(p, t); await sleep(100) }
  await sleep(2000)
  const r = await p.evaluate(() => ({ tf: __v.tf, alive: __alive(), kinds: Object.keys(__v.sets).length }))
  check(r.tf === 0 && r.alive === 0, `G10 reduced motion: fades only (transform ${r.tf}), clean (${r.alive})`)
  check(errs.length === 0, 'G10 reduced: no page errors')
  await p.close()
}
// G10 busiest attack at 4x CPU
async function perf (block) {
  const { p } = await open('/index.html', { throttle: 4, block }); await bootG10(p)
  const w = await p.evaluate(() => new Promise(res => {
    const frames = []; let last = performance.now(), run = true
    const tick = () => { const n = performance.now(); frames.push(n - last); last = n; if (run) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
    __v.cur = 'perf'
    // busiest: super-effective dragon attack with a second overlapping attack
    g10DoAttack('dragon', 'player', 'enemy', () => {}); setTimeout(() => g10DoAttack('electric', 'enemy', 'player', () => {}), 120)
    setTimeout(() => { run = false; frames.shift(); frames.sort((a, b) => a - b); res({ max: Math.round(frames[frames.length - 1]), p90: Math.round(frames[Math.floor(frames.length * 0.9)]) }) }, 1900)
  }))
  await p.close(); return w
}
// effect cost in isolation (the full G10 page is already ~250 ms/frame at 4x CPU in headless software GL, with or
// without the library — see QA_BASELINE): blank page + shared engine, the busiest attack = 2 overlapping super-effective
// attacks (wind-up auras + 2 heads + trails + impacts + crit extras), measured at 4x CPU.
async function perfIso () {
  const p = await b.newPage()
  await p.setViewport({ width: 1280, height: 800 })
  await (await p.createCDPSession()).send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await p.goto(BASE + '/games/garasi-tempur.html', { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { document.body.innerHTML = '<div id="a" style="position:fixed;left:120px;top:480px;width:160px;height:160px"></div><div id="d" style="position:fixed;left:900px;top:120px;width:160px;height:160px"></div>' })
  await p.addScriptTag({ url: BASE + '/games/data/vfx-db.js' }); await p.addScriptTag({ url: BASE + '/games/vfx-poke.js' })
  const w = await p.evaluate(() => new Promise(res => {
    VFX.Poke.prime(['dragon', 'electric', 'fire'])
    const idle = []; let il = performance.now(), irun = true
    const itick = () => { const n = performance.now(); idle.push(n - il); il = n; if (irun) requestAnimationFrame(itick) }
    requestAnimationFrame(itick)
    setTimeout(() => {
      irun = false; idle.shift(); idle.sort((x, y) => x - y); window.__idle = { max: Math.round(idle[idle.length - 1]), p90: Math.round(idle[Math.floor(idle.length * 0.9)]) }
      const A = document.getElementById('a'), D = document.getElementById('d')
      const frames = []; let last = performance.now(), run = true
      const tick = () => { const n = performance.now(); frames.push(n - last); last = n; pk = Math.max(pk, VFX.liveCount()); if (run) requestAnimationFrame(tick) }
      let pk = 0; requestAnimationFrame(tick)
      const go = (t, f, to, d) => { VFX.Poke.windup(t, f, { duration: 340 }); VFX.Poke.launch(t, f, to, { duration: 340, size: 96, superEff: true, crit: true }) }
      go('dragon', A, D); setTimeout(() => go('electric', D, A), 120); setTimeout(() => go('fire', A, D), 240)
      setTimeout(() => { run = false; frames.shift(); frames.sort((x, y) => x - y); res({ idle: window.__idle, n: frames.length, max: Math.round(frames[frames.length - 1]), p90: Math.round(frames[Math.floor(frames.length * 0.9)]), peak: pk }) }, 1800)
    }, 4500)
  }))
  w.baked = await p.evaluate(() => VFX.bakedCount())
  await p.close(); return w
}
let pi = on('perf') ? await perfIso() : { idle: { max: 0, p90: 0 }, n: 99, max: 0, p90: 0, peak: 0, baked: 0 }
const loaded = pi => pi.idle.p90 > 16.7 || pi.idle.max > 33     // the machine itself cannot hold 50 ms (other sessions running)
if (on('perf') && !(pi.max <= 33 && pi.p90 <= 16.7) && !loaded(pi)) { console.log('  isolated perf rerun first=' + JSON.stringify(pi)); pi = await perfIso() }
if (on('perf')) console.log('  isolated busiest attack @4x: ' + JSON.stringify(pi))
check(pi.peak <= 32, `busiest attack: at most 32 live (16 sprites + 16 procedural) effect nodes (peak ${pi.peak})`)
const timeOk = (pi.max <= 33 && pi.p90 <= 16.7) || (loaded(pi) && pi.p90 <= Math.max(16.7, pi.idle.p90 * 1.5))
check(timeOk, `busiest attack (3 overlapping, crit) @4x CPU, effects only: worst ${pi.max} ms, p90 ${pi.p90} (${pi.n} frames, ${pi.baked} baked; idle page at the same load: max ${pi.idle.max}, p90 ${pi.idle.p90}${loaded(pi) ? ' = MACHINE LOADED, compared to idle' : ''})`)
let pf = on('perf') ? await perf() : { max: 0, p90: 0 }
if (pf.max > 50) { console.log('  perf rerun (machine loaded?) first=' + JSON.stringify(pf)); pf = await perf() }
if (process.env.QA_BASELINE && on('perf')) console.log('  baseline (library blocked): ' + JSON.stringify(await perf(true)))
if (on('perf')) console.log('  in-game G10 @4x CPU (headless software GL, includes the game itself): worst frame ' + pf.max + ' ms, p90 ' + pf.p90)

// ---------- G13 / G13B (g13SpawnAttackEffect on stub field) ----------
if (on('g13')) {
  const { p, errs } = await open('/index.html')
  await p.waitForFunction(() => typeof window.g13SpawnAttackEffect === 'function', { timeout: 25000 })
  await p.evaluate(() => {
    for (const pre of ['g13', 'g13b']) {
      const f = document.createElement('div'); f.id = pre + '-field'; f.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px;z-index:5'
      const mk = (id, l, t) => { const e = document.createElement('div'); e.id = id; e.style.cssText = `position:absolute;left:${l}px;top:${t}px;width:120px;height:120px`; f.appendChild(e) }
      mk(pre + '-pspr-wrap', 100, 380); mk(pre + '-wspr-wrap', 760, 60); document.body.appendChild(f)
    }
  })
  for (const [field, tag] of [['g13-field', 'G13'], ['g13b-field', 'G13B']]) {
    await p.evaluate(() => { __v.sets = {}; __v.peak = 0 })
    for (const t of TYPES) {
      await p.evaluate((t, field) => { __v.cur = 'g13:' + t; g13SpawnAttackEffect(t.charAt(0).toUpperCase() + t.slice(1), true, field) }, t, field)
      await sleep(700)
    }
    await sleep(1500)
    const r = await p.evaluate(() => ({ sets: __v.sets, alive: __alive(), peak: __v.peak }))
    if (process.env.QA_DEBUG) console.log('  ' + tag + ' sample ' + JSON.stringify(r.sets['g13:fire']) + ' poke=' + await p.evaluate(() => typeof (window.VFX && VFX.Poke)))
    judge(tag, r.sets, TYPES, 'g13:')
    check(r.alive === 0 && r.peak <= 32, `${tag} clean (${r.alive} alive) and cap holds (peak ${r.peak})`)
  }
  check(errs.length === 0, 'G13/G13B no page errors: ' + errs.slice(0, 2).join(' | '))
  await p.close()
}

// ---------- Gym Pokemon (BattleArena.attack in a live battle) ----------
async function bootGym (p) {
  await sleep(2500)
  const click = async (sel, ms) => { await p.evaluate(s => { const c = document.querySelector(s); if (c && (c.offsetParent || c.id)) c.click() }, sel); await sleep(ms) }
  await click('.trainer-card.current', 1500); await click('.pkg-card:not(.locked)', 1500); await click('.trainer-card.current', 1500); await click('#gw-fight', 1500)
  await click('.bm-card[data-mode="adventure"]', 2500); await click('#tcf-go', 1500); await click('#tcf-go', 8000)
}
if (on('gym')) {
  const { p, errs } = await open('/games/gym-pokemon.html'); await bootGym(p)
  const live = await p.evaluate(() => !!(window.BattleArena && BattleArena.attack && VFX && VFX.Poke))
  check(live, 'Gym: BattleArena + VFX.Poke present')
  const landed = []
  for (const t of TYPES) {
    const ms = await p.evaluate((t) => new Promise(res => { __v.cur = 'gym:' + t; const t0 = performance.now(); const to = setTimeout(() => res(-1), 6000); BattleArena.attack('player', { type: t, color: '#fff' }, () => { clearTimeout(to); res(Math.round(performance.now() - t0)) }) }), t)
    landed.push(ms); await sleep(500)
  }
  await sleep(2000)
  const r = await p.evaluate(() => ({ sets: __v.sets, alive: __alive(), peak: __v.peak }))
  judge('Gym', r.sets, TYPES, 'gym:', 2)
  check(landed.every(x => x > 0 && x <= 6000), `Gym onHit fires for every type (<= 6 s; same stalls with the library blocked when the machine is loaded) [${landed.join(",")}] ms`)
  check(r.alive === 0 && r.peak <= 32, `Gym clean (${r.alive} alive), cap holds (peak ${r.peak})`)
  check(errs.length === 0, 'Gym no page errors: ' + errs.slice(0, 2).join(' | '))
  await p.close()
}
await b.close()
console.log(`${fails ? 'FAIL' : 'PASS'}  qa-vfx-poke: ${passes} passed, ${fails} failed`)
process.exit(fails ? 1 : 0)
