// G28 Stinky & Dirty — narration MUTE gate (owner: "suaranya tidak bisa di disable").
// Drives the REAL page with real taps and logs every audio start in the page
// (HTMLMediaElement.play / Audio / speechSynthesis.speak / AudioContext oscillators).
//   A) the speaker on the play screen is the narration switch: tapping it while a clip
//      plays pauses that clip within 200 ms, shows the speaker + red X (aria-pressed=false,
//      label "Suara narasi: mati"), and NOTHING narrates afterwards — story, question,
//      wrong answer ("Ayo lihat lagi"), hints 1+2, "Hebat!", explanation, replay — over
//      several cards; SFX still plays (independent);
//   B) the choice persists after a reload and the parent-settings Narasi switch agrees;
//   C) tapping the speaker again turns it on: the next line narrates;
//   D) parent panel (through the real shape gate): Narasi OFF, Baca Sendiri, Dibacakan
//      Orang Tua each silence a whole card and show the X on the speaker;
//   E) Ketuk untuk Dengar: nothing auto-plays; one replay tap reads the WHOLE story;
//   F) a mode switch while a clip plays stops it within 200 ms (test seam: the parent
//      panel is not reachable mid-card).
// QA_OVERRIDE_DIR=<dir> serves games/<file> from <dir> instead (mutation testing: point
// it at a copy of the unfixed files and the gate must FAIL).
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
let passes = 0
const check = (ok, msg) => { console.log((ok ? '✅ ' : '❌ ') + msg); if (ok) passes++; else fails.push(msg) }
const URL = 'http://localhost:8081/games/stinky-dirty.html'
const OVR = process.env.QA_OVERRIDE_DIR
const SHOTS = process.env.QA_SHOTS || ''

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true })
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.evaluateOnNewDocument(() => {
  window.__log = []
  const now = () => performance.timeOrigin + performance.now()
  const short = s => String(s || '').replace(/^.*\/audio\//, '')
  const op = HTMLMediaElement.prototype.play, pa = HTMLMediaElement.prototype.pause
  HTMLMediaElement.prototype.play = function () { __log.push({ k: 'play', t: now(), src: short(this.currentSrc || this.src), nar: /\/assets\/sd\/audio\//.test(this.src) }); return op.call(this) }
  HTMLMediaElement.prototype.pause = function () { __log.push({ k: 'pause', t: now(), src: short(this.src) }); return pa.call(this) }
  if (window.speechSynthesis) { const sp = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { __log.push({ k: 'play', t: now(), src: 'tts:' + u.text, nar: true }); return sp(u) } }
  const C = window.AudioContext || window.webkitAudioContext
  if (C) { const co = C.prototype.createOscillator; C.prototype.createOscillator = function () { __log.push({ k: 'osc', t: now() }); return co.call(this) } }
  // the moment a tap lands (capture phase, before the page's own handler)
  document.addEventListener('click', e => { window.__tapT = now(); window.__tapId = e.target.closest && (e.target.closest('button') || {}).id }, true)
})
if (OVR) {
  await p.setRequestInterception(true)
  p.on('request', r => {
    const m = /\/games\/([^/?]+)(\?|$)/.exec(r.url()), f = m && path.join(OVR, m[1])
    if (f && fs.existsSync(f)) r.respond({ status: 200, contentType: m[1].endsWith('.html') ? 'text/html' : 'application/javascript', body: fs.readFileSync(f) })
    else r.continue()
  })
}
const cdp = await p.target().createCDPSession(); await cdp.send('Network.setBypassServiceWorker', { bypass: true })

async function tapSel (sel) {
  const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 } }, sel)
  if (!r) return false
  await p.mouse.click(r.x, r.y); await sleep(70); return true
}
const narr = since => p.evaluate(t => __log.filter(e => e.k === 'play' && e.nar && e.t > t).map(e => e.src), since)
const pageNow = () => p.evaluate(() => performance.timeOrigin + performance.now())
const waitFor = async (fn, ms = 15000, arg) => { for (let t = 0; t < ms; t += 100) { if (await p.evaluate(fn, arg)) return true; await sleep(100) } return false }
const waitReady = () => waitFor(() => window.__sd && __sd.state().locked === false, 30000)
const spk = () => p.evaluate(() => {
  const b = document.getElementById('btn-voice'), x = b.querySelector('.vx'), r = b.getBoundingClientRect()
  return { muted: b.classList.contains('muted'), pressed: b.getAttribute('aria-pressed'), label: b.getAttribute('aria-label'),
    xShown: !!x && getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().width > 0, w: r.width, h: r.height,
    onScreen: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }
})
async function answer (card, right) {
  const a = card.answer, n = (card.options || []).length
  switch (card.archetype) {
    case 'choice': case 'image': {
      const pick = right ? a : (await p.evaluate(() => [...document.querySelectorAll('#answers .opt')].filter(o => !o.disabled).map(o => +o.dataset.i))).find(i => i !== a)
      await tapSel(`#answers .opt[data-i="${pick}"]`); break
    }
    case 'multi': for (const i of (right ? a : [[...Array(n).keys()].find(i => !a.includes(i))])) await tapSel(`#answers .opt[data-i="${i}"]`); break
    case 'sequence': for (const i of (right ? a : a.slice().reverse())) await tapSel(`#answers .opt[data-i="${i}"]`); break
    case 'match': for (let l = 0; l < a.length; l++) { await tapSel(`#answers .opt[data-i="L${l}"]`); await tapSel(`#answers .opt[data-i="R${right ? a[l] : a[(l + 1) % a.length]}"]`) } break
    case 'find': await tapSel(`.el[aria-label="${right ? a : card.targets.find(t => t !== a)}"]`); break
    case 'count': for (const d of String(right ? a : a + 1)) await tapSel(`#answers [data-n="${d}"]`); break
    case 'drag': {
      const items = right ? a : [[...Array(n).keys()].find(i => !a.includes(i))]
      for (const i of items) { await tapSel(`#tray .opt[data-i="${i}"]`); await tapSel('#basket') }
      break
    }
  }
}
// play the current card like a child: wrong once (feedback + hint 1), hint button (hint 2),
// replay the story, then the right answer (Hebat + explanation), then Lanjut
async function playCardFully () {
  if (!(await waitReady())) return false
  const card = await p.evaluate(() => SDCards.find(__sd.state().card))
  await answer(card, false); await tapSel('#btn-check'); await sleep(250)
  await tapSel('#btn-hint'); await sleep(250)
  await tapSel('#btn-replay'); await sleep(900)
  await answer(card, true); await tapSel('#btn-check'); await sleep(1200)   // explanation fires 700 ms after
  const ok = await p.evaluate(() => !document.getElementById('btn-next').classList.contains('hide'))
  await tapSel('#btn-next'); await sleep(200)
  return ok
}
async function openParentPanel () {
  await tapSel('#btn-parent'); await sleep(200)
  for (const k of ['c', 't', 's']) await tapSel(`#gate-shapes [data-k="${k}"]`)
  return p.evaluate(() => document.getElementById('ov-parent').classList.contains('show'))
}
async function startSessionByTaps () {
  await tapSel('#btn-start'); await sleep(350); await tapSel('#btn-session'); await sleep(350); await tapSel('#btn-go'); await sleep(200)
  return p.evaluate(() => __sd.state().screen === 'scr-card')
}
async function goHome () {
  await p.evaluate(() => { if (__sd.state().screen === 'scr-card') document.getElementById('btn-quit').click() }); await sleep(100)
  await p.evaluate(() => { const y = document.getElementById('btn-quit-yes'); if (document.getElementById('ov-quit').classList.contains('show')) y.click() }); await sleep(100)
  await p.evaluate(() => { const b = document.querySelector('#scr-map [data-go="scr-home"]'); b && b.click() }); await sleep(150)
}
const shot = async name => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, name + '.png') }) } }

try {
  await p.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 })
  await p.evaluate(() => { localStorage.removeItem('dunia-sd-settings'); window.__SD_NO_WARM = true })
  await p.reload({ waitUntil: 'networkidle2' })

  // ── A: mute with the speaker while a clip plays
  check(await startSessionByTaps(), 'A: session starts from home with real taps')
  const s0 = await spk()
  check(!s0.muted && s0.pressed === 'true' && /nyala/.test(s0.label || '') && !s0.xShown, `A: speaker starts ON (label "${s0.label}", no X)`)
  check(s0.w >= 56 && s0.h >= 56 && s0.onScreen, `A: speaker is >= 56 px and on screen (${Math.round(s0.w)}x${Math.round(s0.h)})`)
  const playing = await waitFor(() => __log.some(e => e.k === 'play' && e.nar), 15000)
  check(playing, 'A: narration plays in Baca Otomatis (sanity)')
  const clip = await p.evaluate(() => __log.filter(e => e.k === 'play' && e.nar).pop().src)
  await shot('sd-mute-on')
  await tapSel('#btn-voice')
  const tMute = await p.evaluate(() => window.__tapT)
  await sleep(250)
  const stopped = await p.evaluate((t, src) => {
    const a = __log.find(e => e.k === 'pause' && e.src === src && e.t >= t)
    return a ? Math.round(a.t - t) : -1
  }, tMute, clip)
  check(stopped >= 0 && stopped <= 200, `A: playing clip ${clip} paused ${stopped} ms after the tap (<= 200)`)
  const s1 = await spk()
  check(s1.muted && s1.pressed === 'false' && /mati/.test(s1.label || '') && s1.xShown, `A: speaker shows the X when off (label "${s1.label}", aria-pressed=${s1.pressed})`)
  check((await p.evaluate(() => __sd.settings().voice)) === false, 'A: narration saved as OFF')
  await shot('sd-mute-off')
  const afterA = tMute + 1
  let cardsOk = 0
  for (let k = 0; k < 3; k++) if (await playCardFully()) cardsOk++
  check(cardsOk === 3, `A: played ${cardsOk}/3 cards through wrong -> hint -> hint 2 -> replay -> right -> Lanjut`)
  const leakA = await narr(afterA)
  check(leakA.length === 0, `A: zero narration clips after muting (${leakA.length}${leakA.length ? ': ' + leakA.slice(0, 4).join(', ') : ''})`)
  check((await p.evaluate(t => __log.filter(e => e.k === 'osc' && e.t > t).length, afterA)) > 0, 'A: sound effects still play while narration is off (independent)')

  // ── B: persists after reload, parent switch agrees
  await p.reload({ waitUntil: 'networkidle2' })
  check((await p.evaluate(() => __sd.settings().voice)) === false, 'B: OFF survives a reload')
  check(await openParentPanel(), 'B: parent gate opens with circle -> triangle -> square')
  check(await p.evaluate(() => { const s = document.querySelector('[data-opt="voice"]'); return !s.classList.contains('on') && s.getAttribute('aria-pressed') === 'false' }), 'B: parent Narasi switch shows OFF too')
  await tapSel('#ov-parent [data-close="ov-parent"]'); await sleep(150)
  const tB = await pageNow()
  check(await startSessionByTaps(), 'B: new session after reload')
  check((await spk()).muted, 'B: speaker shows the X after reload')
  check(await playCardFully(), 'B: a card plays through after reload')
  const leakB = await narr(tB)
  check(leakB.length === 0, `B: zero narration after reload (${leakB.length}${leakB.length ? ': ' + leakB.slice(0, 4).join(', ') : ''})`)

  // ── C: tap the speaker again -> on; the next line narrates
  await waitReady()
  await tapSel('#btn-voice')
  const s2 = await spk()
  check(!s2.muted && s2.pressed === 'true' && !s2.xShown, `C: speaker back ON (label "${s2.label}")`)
  const tC = await pageNow()
  await tapSel('#btn-replay')
  check(await waitFor(t => __log.some(e => e.k === 'play' && e.nar && e.t > t), 6000, tC), 'C: after turning it on, the next line narrates (replay)')
  check((await p.evaluate(() => __sd.settings().voice)) === true, 'C: saved as ON')
  await goHome()

  // ── D: every parent control silences a whole card and shows the X
  for (const [label, act] of [
    ['Narasi OFF', async () => { await tapSel('#ov-parent [data-opt="voice"]') }],
    ['Baca Sendiri', async () => { await tapSel('#seg-mode [data-m="self"]') }],
    ['Dibacakan Orang Tua', async () => { await tapSel('#seg-mode [data-m="parent"]') }]
  ]) {
    await p.evaluate(() => { localStorage.setItem('dunia-sd-settings', JSON.stringify({ mode: 'auto', voice: true, sfx: true, music: false, rm: true })) })
    await p.reload({ waitUntil: 'networkidle2' })
    check(await openParentPanel(), `D ${label}: parent panel open`)
    await act(); await sleep(100)
    await tapSel('#ov-parent [data-close="ov-parent"]'); await sleep(150)
    const t = await pageNow()
    await startSessionByTaps()
    check((await spk()).muted, `D ${label}: speaker shows the X`)
    check(await playCardFully(), `D ${label}: card plays through`)
    const leak = await narr(t)
    check(leak.length === 0, `D ${label}: zero narration (${leak.length}${leak.length ? ': ' + leak.slice(0, 4).join(', ') : ''})`)
    await goHome()
  }

  // ── E: Ketuk untuk Dengar — silent until a tap; one replay tap reads the whole story
  await p.evaluate(() => { localStorage.setItem('dunia-sd-settings', JSON.stringify({ mode: 'auto', voice: true, sfx: true, music: false, rm: true })) })
  await p.reload({ waitUntil: 'networkidle2' })
  await openParentPanel(); await tapSel('#seg-mode [data-m="tap"]'); await tapSel('#ov-parent [data-close="ov-parent"]'); await sleep(150)
  const tE = await pageNow()
  await startSessionByTaps(); await waitReady()
  check((await narr(tE)).length === 0, 'E: Ketuk untuk Dengar: nothing narrates on its own')
  check(!(await spk()).muted, 'E: speaker shows ON (narration available on tap)')
  // a card with two verified story clips (the session's own pick may be text-only)
  await p.evaluate(() => __sd.playOnly('LIS-01')); await waitReady()
  const eCard = await p.evaluate(() => SDCards.find(__sd.state().card))
  const want = await p.evaluate(c => c.story.map((_, i) => c.id + '-s' + i).filter(k => SDAudio.has(k)).length, eCard)
  const tE2 = await pageNow()
  await tapSel('#btn-replay')
  await waitFor((a) => __log.filter(e => e.k === 'play' && e.nar && e.t > a[0]).length >= a[1], 30000, [tE2, want])
  const gotE = (await narr(tE2)).filter(s => s.startsWith(eCard.id + '-s'))
  check(want > 0 && gotE.length >= want, `E: one replay tap reads the whole story (${gotE.length}/${want} lines)`)
  await goHome()

  // ── F: mode change mid-clip stops the clip (seam: the panel is not reachable mid-card)
  await p.evaluate(() => { localStorage.setItem('dunia-sd-settings', JSON.stringify({ mode: 'auto', voice: true, sfx: true, music: false, rm: true })) })
  await p.reload({ waitUntil: 'networkidle2' })
  await startSessionByTaps()
  await waitFor(() => __log.some(e => e.k === 'play' && e.nar), 15000)
  const fClip = await p.evaluate(() => __log.filter(e => e.k === 'play' && e.nar).pop().src)
  const tF = await p.evaluate(() => { const t = performance.timeOrigin + performance.now(); __sd.set('mode', 'self'); return t })
  await sleep(250)
  const fStop = await p.evaluate((t, src) => { const a = __log.find(e => e.k === 'pause' && e.src === src && e.t >= t); return a ? Math.round(a.t - t) : -1 }, tF, fClip)
  check(fStop >= 0 && fStop <= 200, `F: switching to Baca Sendiri mid-clip pauses it (${fStop} ms)`)
  check((await spk()).muted, 'F: speaker shows the X after the mode switch')
  // turning the speaker on from Baca Sendiri returns to Baca Otomatis
  await tapSel('#btn-voice')
  check(await p.evaluate(() => __sd.settings().mode === 'auto' && __sd.settings().voice === true), 'F: speaker ON from Baca Sendiri -> Baca Otomatis, narration on')

  check(errs.length === 0, `no page errors${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`)
} finally {
  try { await p.evaluate(() => localStorage.removeItem('dunia-sd-settings')) } catch (e) {}
  await b.close()
}
console.log(`\n${passes} passed, ${fails.length} failed`)
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS')
process.exit(fails.length ? 1 : 0)
