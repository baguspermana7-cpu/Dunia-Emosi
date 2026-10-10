// qa-gt-fx.mjs — Garasi Tempur attack VFX/SFX gate (games/gt-fx.js), 1280x800 tablet.
//   1. every Type's attack produces wind-up, travel, impact and recoil nodes, and every
//      effect node is gone within 1.5 s (node lifetime AND a clean layer after the attack)
//   2. crit / SUPER: the stamp text and the chromatic punch appear; KO cleans up too
//   3. the effect layer never holds more than 6 effects, the synth never more than 6 voices
//      (4 attacks fired at once must evict / steal, not stack)
//   4. muted: zero oscillators and zero buffer sources are created
//   5. reduced motion: no transform keyframe is animated, sound still plays, nodes clean up
// QA_FAULT=1 raises the caps to 99 — the cap checks MUST fail (proves the gate sees stacking).
// QA_SHEET=<dir> also writes a frame sequence (one attack + one crit) as PNGs into <dir>.
import puppeteer from 'puppeteer'
const URL = process.env.QA_URL || 'http://localhost:8081/games/garasi-tempur.html'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let fails = 0, passes = 0
const check = (ok, msg) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + msg); if (ok) passes++; else fails++ }
const TYPES = ['POWER', 'SPEED', 'MUD', 'STUNT', 'ARMOR', 'TECH']

// instrumentation installed before any page script runs
function instrument () {
  window.__q = { osc: 0, src: 0, anims: [], life: [], peak: 0 }
  const P = (window.AudioContext || window.webkitAudioContext).prototype
  const co = P.createOscillator, cb = P.createBufferSource
  P.createOscillator = function () { __q.osc++; return co.apply(this, arguments) }
  P.createBufferSource = function () { __q.src++; return cb.apply(this, arguments) }
  const an = Element.prototype.animate
  Element.prototype.animate = function (kf) { try { __q.anims.push(Object.keys(Object.assign({}, ...(Array.isArray(kf) ? kf : [kf]))).filter(k => k !== 'offset' && k !== 'easing')) } catch (e) {} return an.apply(this, arguments) }
  const born = new Map()
  const fxNode = n => n.nodeType === 1 && ((n.parentNode && n.parentNode.id === 'gtx') || n.hasAttribute('data-ph'))
  new MutationObserver(ms => {
    const now = performance.now()
    for (const m of ms) {
      m.addedNodes.forEach(n => { if (fxNode(n)) born.set(n, { t: now, ph: n.getAttribute('data-ph') || '' }) })
      m.removedNodes.forEach(n => { const b = born.get(n); if (b) { __q.life.push({ ph: b.ph, ms: Math.round(now - b.t) }); born.delete(n) } })
      const L = document.getElementById('gtx'); if (L) __q.peak = Math.max(__q.peak, L.childElementCount)
    }
  }).observe(document, { childList: true, subtree: true })
  window.__qAlive = () => [...born.values()].map(b => ({ ph: b.ph, ms: Math.round(performance.now() - b.t) }))
}
async function boot (b, reduce) {
  const p = await b.newPage(); const errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.setViewport({ width: 1280, height: 800, hasTouch: true })
  if (reduce) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.evaluateOnNewDocument(instrument)
  if (process.env.QA_FAULT) await p.evaluateOnNewDocument(() => { window.__GT_FAULT = 1 })
  await p.goto(URL, { waitUntil: 'networkidle2' })
  await p.evaluate(() => { __gt.setTut(true); __gt.start('free') }); await sleep(2500)
  return { p, errs }
}
// one attack between the two active trucks; resolves when the choreography resolves
const ATTACK = (type, o) => {
  const st = __gt.engine(), q = i => document.querySelector('.field-card[data-inst="' + st.players[i].active.inst + '"] .gc')
  window.__q.life = []; window.__q.anims = []
  return GTFx.attack(Object.assign({ from: q(0), to: q(1), type, dmg: 5, correct: false, sup: false, hpBefore: 12, hpAfter: 7, stage: document.getElementById('bt-scene'), setHp: () => {} }, o || {}))
    .then(() => true)
}
const SNAP = () => ({ gtx: (document.getElementById('gtx') || { childElementCount: 0 }).childElementCount, cardFx: document.querySelectorAll('.fx-red,.fx-flash').length,
  stray: [...document.querySelectorAll('body > div[aria-hidden="true"]')].filter(d => d.id !== 'gtx' && /99999/.test(d.style.zIndex)).length,
  life: window.__q.life, alive: window.__qAlive(), anims: window.__q.anims, st: GTFx.stats() })

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
{
  const { p, errs } = await boot(b, false)
  // 1. every Type
  for (const t of TYPES) {
    await p.evaluate(ATTACK, t); await sleep(1500)
    const s = await p.evaluate(SNAP), ph = new Set(s.life.map(x => x.ph)), long = s.life.filter(x => x.ms > 1500)
    const need = ['windup', 'travel', 'impact', 'recoil'].filter(x => !ph.has(x))
    check(need.length === 0, `${t}: wind-up, travel, impact and recoil nodes appear (missing: ${need.join(',') || 'none'})`)
    check(s.gtx === 0 && s.cardFx === 0 && s.stray === 0 && s.alive.length === 0 && long.length === 0,
      `${t}: ${s.life.length} fx nodes, all gone within 1.5 s (max life ${Math.max(0, ...s.life.map(x => x.ms))} ms, left ${s.gtx + s.cardFx + s.stray + s.alive.length})`)
    // the attacker's truck art must come home: a forwards-filled lunge left it frozen off the card (2026-10-10)
    const pose = await p.evaluate(() => { const st = __gt.engine(); return getComputedStyle(document.querySelector('.field-card[data-inst="' + st.players[0].active.inst + '"] .gc .gc-l1')).transform })
    check(pose === 'none', `${t}: the attacker's truck art is back in its card after the attack (transform ${pose})`)
  }
  // 2. crit + SUPER: stamp + chroma; then KO
  const crit = await p.evaluate(async () => {
    const st = __gt.engine(), q = i => document.querySelector('.field-card[data-inst="' + st.players[i].active.inst + '"] .gc')
    const pr = GTFx.attack({ from: q(0), to: q(1), type: 'POWER', dmg: 9, correct: true, sup: true, hpBefore: 12, hpAfter: 3, stage: document.getElementById('bt-scene'), setHp: () => {} })
    await new Promise(r => setTimeout(r, 900))
    const st2 = document.querySelector('#gtx .gtx-stamp'), ch = document.querySelectorAll('#gtx .gtx-chroma')
    const out = { stamp: st2 ? st2.textContent : '', chroma: [...ch].filter(c => c.style.display !== 'none').length }
    await pr; return out
  })
  check(crit.stamp === 'SUPER!' && crit.chroma === 2, `crit/SUPER: stamp "${crit.stamp}" + chromatic punch (${crit.chroma}/2 copies)`)
  await sleep(1500)
  await p.evaluate(() => { window.__q.life = []; const st = __gt.engine(), q = i => document.querySelector('.field-card[data-inst="' + st.players[i].active.inst + '"]')
    return GTFx.ko(q(1), q(0).querySelector('.gc')) })
  await sleep(1500)
  { const s = await p.evaluate(SNAP), ph = new Set(s.life.map(x => x.ph))
    check(ph.has('ko') && s.life.length >= 4 && s.gtx === 0 && s.alive.length === 0 && s.life.every(x => x.ms <= 1500), `KO: explosion, slow-mo, confetti (${s.life.length} nodes) all gone within 1.5 s`) }
  await p.evaluate(() => { const st = __gt.engine(); const el = document.querySelector('.field-card[data-inst="' + st.players[1].active.inst + '"]'); el.getAnimations().forEach(a => a.cancel()) })
  // 3. caps: 4 attacks at once
  await p.evaluate(() => { __q.peak = 0; GTFx.resetStats() })
  await p.evaluate(async (src) => { const f = (0, eval)('(' + src + ')'); await Promise.all(['POWER', 'TECH', 'MUD', 'ARMOR'].map(t => f(t, { correct: true, sup: true, dmg: 9 }))) }, ATTACK.toString())
  await sleep(1500)
  { const s = await p.evaluate(SNAP), pk = await p.evaluate(() => __q.peak)
    check(pk <= 6, `cap: effect layer peak ${pk} <= 6 with 4 attacks at once (evicted ${s.st.evicted})`)
    check(s.st.vpeak <= 6 && s.st.vstolen > 0, `cap: synth voice peak ${s.st.vpeak} <= 6 (stolen ${s.st.vstolen}, started ${s.st.vstarted})`)
    check(s.gtx === 0 && s.stray === 0, `cap: layer clean after the burst (${s.gtx} left)`) }
  // 4. mute: zero oscillators / buffer sources
  const sound = await p.evaluate(async (src) => { const f = (0, eval)('(' + src + ')'); __q.osc = 0; __q.src = 0; await f('TECH'); return { osc: __q.osc, src: __q.src } }, ATTACK.toString())
  check(sound.osc + sound.src >= 8, `unmuted: an attack synthesises layered sound (${sound.osc} osc + ${sound.src} noise)`)
  const mute = await p.evaluate(async (src) => { const f = (0, eval)('(' + src + ')'); GTFx.mute(true); __q.osc = 0; __q.src = 0
    await f('POWER', { correct: true, sup: true }); await f('MUD'); GTFx.SND.fanfare(); GTFx.SND.ooh(); const r = { osc: __q.osc, src: __q.src }; GTFx.mute(false); return r }, ATTACK.toString())
  check(mute.osc === 0 && mute.src === 0, `muted: zero oscillators (${mute.osc}) and zero buffer sources (${mute.src})`)
  check(errs.length === 0, `no page errors (${errs.join(' | ')})`)
  // optional frame sequence: one attack + one crit
  if (process.env.QA_SHEET) {
    const dir = process.env.QA_SHEET; let n = 0
    for (const o of [{ dmg: 4 }, { dmg: 9, correct: true, sup: false }]) {
      await sleep(600)
      const t0 = Date.now()
      const run = p.evaluate(async (src, o) => { const f = (0, eval)('(' + src + ')'); await f('POWER', o) }, ATTACK.toString(), o)
      while (Date.now() - t0 < 1500) { await p.screenshot({ path: `${dir}/f${String(n++).padStart(2, '0')}-${Date.now() - t0}.jpg`, type: 'jpeg', quality: 55 }) }
      await run       // settle before the next attack, and before the page closes
    }
  }
  await p.close()
}
// 5. reduced motion
{
  const { p, errs } = await boot(b, true)
  let tf = 0, cnt = 0, clean = true, snd = 0
  for (const t of TYPES) {
    await p.evaluate(() => GTFx.resetStats())
    await p.evaluate(ATTACK, t, { correct: true, sup: true }); await sleep(1500)
    const s = await p.evaluate(SNAP)
    tf += s.anims.filter(k => k.includes('transform')).length; cnt += s.life.length; snd += s.st.vstarted
    if (s.gtx || s.cardFx || s.stray || s.alive.length || s.life.some(x => x.ms > 1500)) clean = false
  }
  check(tf === 0, `reduced motion: no transform keyframes during 6 attacks (${tf})`)
  check(cnt > 0 && clean, `reduced motion: fades shown (${cnt} nodes) and cleaned within 1.5 s`)
  check(snd > 0, `reduced motion: sound still plays (${snd} voices)`)
  check(errs.length === 0, `reduced motion: no page errors (${errs.join(' | ')})`)
  await p.close()
}
await b.close()
console.log(`qa-gt-fx: ${passes} pass, ${fails} fail`)
process.exit(fails ? 1 : 0)
