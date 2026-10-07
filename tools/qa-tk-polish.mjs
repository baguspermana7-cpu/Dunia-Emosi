// G30 Timmy & Kapal Legendaris — the Mojo improvements, ported (owner 2026-10-04: "Apply the improvements made in
// the Mojo game to the other games too, especially the Timmy game"). Real game page, real grid levels:
//   A) Timmy's bubble has a capped height (board, commands and route never move): a long line folds to its first sentence (or "Ketuk untuk membaca") with a
//      Baca pill; the full text opens in a popover that never covers the command panel and stays on screen;
//      it closes by a tap outside and by itself; a short line never folds. The bubble never grows past the viewport.
//   B) no cut-off text: no '…' in a story thumbnail, no element with text-overflow:ellipsis / line-clamp clipping on
//      the story strip or a grid level.
//   C) board VFX (games/tk-fx.js, the Mojo board effects ported): the page loads it (wiring), a bumping run shows
//      move + bump, a solved run shows the goal; never more than TKFx.CAP (6) effects alive, even under a burst;
//      reset clears every node; the pause menu freezes effects; leaving the level removes the layer's nodes;
//      prefers-reduced-motion: no flying droplets and no board shake.
//   D) Petunjuk ladder (the Mojo hint ladder, ported): rung 1 says the mission + the next step, rung 2 adds the
//      shortest length, rung 3 names the next two steps; every rung lights a palette chip and never fills a slot;
//      after rung 3 the card offers "Tunjukkan Caranya": the route fills, the boat sails it naming each step, the
//      board resets, the route stays, and the finished level earns at most 1 star. Two stopped runs make Timmy
//      bob and offer the same. The card fits on screen at 844x390 and 390x844.
//   E) board polish: the goal breathes a ring (none under reduced motion), a vignette sits UNDER every piece.
// QA_SIZES="844x390,..." (default 844x390,1280x800,390x844) · QA_URL · QA_INJECT="tk-fx.js,..." serves the page with
// those scripts added before timmy-kapal.js (to try a module before its <script> line ships; never in a release run)
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import path from 'node:path'

const URL = process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'
const SIZES = (process.env.QA_SIZES || '844x390,1280x800,390x844').split(',').map(s => s.split('x').map(Number))
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
let passes = 0
const check = (ok, msg) => { if (ok) passes++; else { fails.push(msg); console.log('FAIL ' + msg) } }
const LONG = 'Hmm, kapal menabrak tiang kayu di langkah 3. Coba ganti kotak nomor 3 dengan panah ke bawah, lalu tekan JALAN lagi ya! Kamu pasti bisa, ayo coba sekali lagi.'
const overlap = (a, b) => !(a[2] <= b[0] || a[0] >= b[2] || a[3] <= b[1] || a[1] >= b[3])
const CLIPPED = `(() => { const o = []; document.querySelectorAll('body *').forEach(e => { if (!e.offsetParent) return; const c = getComputedStyle(e)
  if ((c.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) || (c.webkitLineClamp !== 'none' && e.scrollHeight > e.clientHeight + 2)) o.push((typeof e.className === 'string' ? e.className : e.tagName) + ': ' + e.textContent.trim().slice(0, 40)) }); return o })()`
const RECT = `(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round) })`

const INJECT = (process.env.QA_INJECT || '').split(',').filter(Boolean)
const ROOT = path.resolve(path.dirname(new globalThis.URL(import.meta.url).pathname), '..')
async function open (browser, w, h, o = {}) {
  const page = await browser.newPage()
  page.errs = []
  page.on('pageerror', e => page.errs.push(e.message))
  page.on('console', m => { if (m.type() === 'error') page.errs.push(m.text()) })
  if (INJECT.length) {
    await page.setRequestInterception(true)
    page.on('request', r => {
      if (r.resourceType() !== 'document' || !/timmy-kapal\.html/.test(r.url())) return r.continue()
      const html = fs.readFileSync(path.join(ROOT, 'games/timmy-kapal.html'), 'utf8')
        .replace(/(<script src="timmy-kapal\.js)/, INJECT.map(f => `<script src="${f}?qa=${Date.now()}"></script>`).join('') + '$1')
      r.respond({ status: 200, contentType: 'text/html', body: html })
    })
  }
  if (INJECT.length) await page.setBypassServiceWorker(true)   // a worker-served reload would drop the injected scripts
  if (o.rm) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.setViewport({ width: w, height: h, hasTouch: true, isMobile: w < 900 })
  await page.goto(URL, { waitUntil: 'networkidle2' })
  await page.evaluate(() => { __tk.unlockAll(); return __tk.start('vasa', 5) })
  await sleep(1800)
  return page
}
const skipStory = page => page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Lewati/.test(x.textContent) && x.offsetParent); if (b) b.click() })
// play a program; resolve with the effect names seen, the most alive at once and the droplet / shake counts
const PLAY = `(prog => new Promise(res => { const h = __tk.handle(), seen = {}; let max = 0, dots = 0, shakes = 0
  const b = document.querySelector('.tkg-board'), iv = setInterval(() => { max = Math.max(max, TKFx.live()); TKFx.names().forEach(n => { seen[n] = 1 })
    dots = Math.max(dots, document.querySelectorAll('.tkfx-dot').length); shakes = Math.max(shakes, b.getAnimations().filter(a => a.effect && a.effect.getKeyframes().some(k => k.translate)).length) }, 25)
  h.setProgram(prog === 'solve' ? TKGrid.solve(h.level) : prog); h.go()
  setTimeout(() => { clearInterval(iv); res({ seen: Object.keys(seen), max, dots, shakes }) }, 5200) }))`
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
try {
  for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`
    const page = await open(browser, w, h), errs = page.errs
    // B) the story strip before the level
    const thumbs = await page.$$eval('.tks-tc', ns => ns.map(n => n.textContent))
    check(thumbs.length > 0, `${tag}: story thumbnails shown`)
    check(thumbs.every(t => !/…|\.\.\./.test(t)), `${tag}: no thumbnail caption is cut with an ellipsis (${thumbs.filter(t => /…|\.\.\./.test(t)).join(' | ')})`)
    const clipStory = await page.evaluate(CLIPPED)
    check(clipStory.length === 0, `${tag}: story screen has no clipped text (${clipStory.join(' | ')})`)
    await skipStory(page)
    await sleep(1600)
    const clipGrid = await page.evaluate(CLIPPED)
    check(clipGrid.length === 0, `${tag}: grid level has no clipped text (${clipGrid.join(' | ')})`)
    // A) the bubble chip
    const short = await page.evaluate(() => { const h = __tk.handle(); h.say('Ayo jalan!', 'good', 4000); return h.chip() })
    check(!short.more && short.shown === 'Ayo jalan!', `${tag}: a short line shows whole, no chip (${JSON.stringify(short)})`)
    const LAY = `JSON.stringify(['.tkg-sea', '.tkg-cmd', '.tkg-route'].map(s => (${RECT})(s)))`
    const lay0 = await page.evaluate(LAY)
    await page.evaluate(t => __tk.handle().say(t, 'bad', 6000), LONG)
    await sleep(450)
    const c = await page.evaluate(() => __tk.handle().chip())
    const R = await page.evaluate(`({ bub: (${RECT})('.tkg-bubble'), pop: (${RECT})('.tkg-bpop'), cmd: (${RECT})('.tkg-cmd'), vw: innerWidth, vh: innerHeight })`)
    check(c.more && c.full === LONG && c.shown.length < LONG.length && !/…/.test(c.shown), `${tag}: a long line folds to a whole short line (${c.shown})`)
    const lay1 = await page.evaluate(LAY)
    check(lay1 === lay0, `${tag}: a long line moves nothing (board, commands, route) (${lay0} -> ${lay1})`)
    check(R.bub[3] <= R.vh + 1 && R.bub[1] >= 0, `${tag}: the bubble is on screen (${R.bub})`)
    const pill = await page.evaluate(`(${RECT})('.tkg-bubble .tkg-baca')`)
    check(pill && pill[0] >= R.bub[0] && pill[2] <= R.bub[2] && pill[1] >= R.bub[1] && pill[3] <= R.bub[3], `${tag}: the Baca pill sits inside the bubble (${pill} in ${R.bub})`)
    check(c.open, `${tag}: feedback opens the popover by itself`)
    check(R.pop && !overlap(R.pop, R.cmd), `${tag}: the popover never covers the command panel (pop ${R.pop} cmd ${R.cmd})`)
    check(R.pop && R.pop[0] >= 0 && R.pop[2] <= R.vw + 1 && R.pop[1] >= 0 && R.pop[3] <= R.vh + 1, `${tag}: the popover is on screen (${R.pop})`)
    // a tap outside closes it; a tap on the chip opens it again
    await page.mouse.click(Math.round((R.cmd[0] + R.cmd[2]) / 2), R.cmd[3] - 4)
    await sleep(250)
    check(!(await page.evaluate(() => __tk.handle().chip().open)), `${tag}: a tap outside closes the popover`)
    await page.mouse.click(Math.round((R.bub[0] + R.bub[2]) / 2), Math.round((R.bub[1] + R.bub[3]) / 2))
    await sleep(250)
    check(await page.evaluate(() => __tk.handle().chip().open), `${tag}: a tap on the chip opens the popover`)
    await sleep(4300)
    check(!(await page.evaluate(() => __tk.handle().chip().open)), `${tag}: the popover closes by itself`)
    check(errs.length === 0, `${tag}: no page errors (${errs.slice(0, 3).join(' | ')})`)
    await page.close()
  }
  // C) board VFX
  {
    const page = await open(browser, 1280, 800), tag = 'vfx 1280x800'
    check(await page.evaluate(() => !!(window.TKFx && TKFx.init)), `${tag}: games/tk-fx.js is loaded by timmy-kapal.html`)
    await skipStory(page); await sleep(1500)
    const bad = await page.evaluate(`(${PLAY})(['E', 'S', 'S', 'S'])`)
    check(bad.seen.includes('move') && bad.seen.includes('bump'), `${tag}: a bumping run shows move + bump (${bad.seen})`)
    check(bad.max <= 6, `${tag}: at most 6 effects alive (${bad.max})`)
    check(bad.dots > 0 && bad.shakes > 0, `${tag}: the bump throws droplets and jolts the board (${bad.dots} / ${bad.shakes})`)
    const burst = await page.evaluate(() => { for (let i = 0; i < 20; i++) TKFx.move(1, 1, 2, 1); return TKFx.live() })
    check(burst <= 6, `${tag}: a burst of 20 effects keeps 6 alive (${burst})`)
    const paused = await page.evaluate(() => new Promise(r => { const h = __tk.handle(); TKFx.goal(1, 1); h.pause(); const n0 = TKFx.live(); setTimeout(() => { const n1 = TKFx.live(); h.resume(); r([n0, n1]) }, 1900) }))
    check(paused[0] > 0 && paused[1] === paused[0], `${tag}: the pause freezes effects (${paused})`)
    const reset = await page.evaluate(() => { TKFx.goal(1, 1); __tk.handle().reset(); return [TKFx.live(), document.querySelectorAll('.tkfx .tkfx-n').length] })
    check(reset[0] === 0 && reset[1] === 0, `${tag}: reset clears every effect (${reset})`)
    const good = await page.evaluate(`(${PLAY})('solve')`)
    check(good.seen.includes('goal'), `${tag}: the solved run ends with the goal effect (${good.seen})`)
    const left = await page.evaluate(() => new Promise(r => { TKFx.goal(1, 1); const q = [...document.querySelectorAll('button')].find(x => /Peta Level/.test(x.textContent)); if (q) q.click(); setTimeout(() => r([TKFx.live(), document.querySelectorAll('.tkfx-n').length]), 400) }))
    check(left[0] === 0 && left[1] === 0, `${tag}: leaving the level (pause menu, Peta Level) removes every effect (${left})`)
    check(page.errs.length === 0, `${tag}: no page errors (${page.errs.slice(0, 3).join(' | ')})`)
    await page.close()
  }
  {
    const page = await open(browser, 844, 390, { rm: true }), tag = 'vfx reduced-motion 844x390'
    await skipStory(page); await sleep(1500)
    const r = await page.evaluate(`(${PLAY})(['E', 'S', 'S', 'S'])`)
    check(r.seen.includes('bump'), `${tag}: the bump still shows (a fade) (${r.seen})`)
    check(r.dots === 0 && r.shakes === 0, `${tag}: no flying droplets, no board shake (${r.dots} / ${r.shakes})`)
    check(page.errs.length === 0, `${tag}: no page errors (${page.errs.slice(0, 3).join(' | ')})`)
    await page.close()
  }
  // D) the Petunjuk ladder + Tunjukkan Caranya
  for (const [w, h] of [[844, 390], [390, 844]]) {
    const page = await open(browser, w, h), tag = `ladder ${w}x${h}`
    await skipStory(page); await sleep(1500)
    const st = () => page.evaluate(() => __tk.handle().state())
    const tapEl = async sel => { const r = await page.evaluate(s => { const e = [...document.querySelectorAll(s)].find(x => x.offsetParent && !x.hidden); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2] }, sel); if (r) await page.mouse.click(r[0], r[1]); await sleep(300); return !!r }
    const lit = () => page.$$eval('.tkg-pal .tkg-chip--hint', e => e.length)
    await tapEl('.tkg-hintb'); await tapEl('.tkg-ask .yes')
    let s1 = await st()
    check(s1.rung === 1 && s1.hints === 1 && (await lit()) >= 1 && s1.program.length === 0, `${tag}: rung 1 lights the next chip, fills nothing (${s1.rung}/${s1.hints})`)
    check(/Coba tambah/.test(s1.message) && s1.message.length > 30, `${tag}: rung 1 says the mission and the next step (${s1.message})`)
    await tapEl('.tkg-hintb'); const s2 = await st()
    check(s2.rung === 2 && /Rute terpendek \d+ langkah/.test(s2.message), `${tag}: rung 2 adds the shortest length (${s2.message})`)
    await tapEl('.tkg-hintb'); const s3 = await st()
    check(s3.rung === 3 && /Dua langkah berikutnya/.test(s3.message) && /Tunjukkan Caranya/.test(s3.message), `${tag}: rung 3 names two steps and points at Tunjukkan Caranya (${s3.message})`)
    await tapEl('.tkg-hintb')
    const card = await page.evaluate(() => { const a = document.querySelector('.tkg-ask'), b = a.getBoundingClientRect(), sb = a.querySelector('.show'); return { on: a.classList.contains('on'), show: !!sb && !sb.hidden && sb.offsetParent !== null, r: [b.left, b.top, b.right, b.bottom].map(Math.round), vw: innerWidth, vh: innerHeight } })
    check(card.on && card.show, `${tag}: after rung 3 the card offers Tunjukkan Caranya`)
    check(card.r[0] >= 0 && card.r[1] >= 0 && card.r[2] <= card.vw && card.r[3] <= card.vh, `${tag}: the card is on screen (${card.r})`)
    await tapEl('.tkg-ask .show')
    const demo = await page.evaluate(() => new Promise(res => { const h = __tk.handle(), said = {}; let sawRun = false
      const iv = setInterval(() => { const s = h.state(); if (s.running) sawRun = true; said[s.message] = 1
        if (sawRun && !s.running && !s.demo && /giliranmu/.test(s.message)) { clearInterval(iv); res({ ok: true, said: Object.keys(said), s }) } }, 40)
      setTimeout(() => { clearInterval(iv); res({ ok: false, said: Object.keys(said), s: h.state() }) }, 20000) }))
    check(demo.ok, `${tag}: the demo sails and hands JALAN back (${demo.said.slice(-3)})`)
    check(demo.said.some(m => /^(Ke (atas|bawah|kiri|kanan)|Maju|Belok)/.test(m)), `${tag}: Timmy names the steps while sailing (${demo.said.slice(0, 4)})`)
    check(demo.s.shown && demo.s.program.length > 0 && !demo.s.done, `${tag}: the route stays, the level is not finished by the demo`)
    const start = await page.evaluate(() => { const h = __tk.handle(); return JSON.stringify(h.state().boat) === JSON.stringify({ x: h.level.start.x, y: h.level.start.y }) })
    check(start, `${tag}: the board is reset to the start after the demo`)
    await tapEl('.tkg-go')
    const done = await page.evaluate(() => new Promise(res => { const iv = setInterval(() => { const s = __tk.save().stars.vasa || {}; if (!__tk.handle() || s.vasa8 != null && document.body.getAttribute('data-scr') !== 'scr-play') { clearInterval(iv); res(s.vasa8) } }, 100); setTimeout(() => { clearInterval(iv); res('timeout') }, 20000) }))
    check(done === 1, `${tag}: finishing after Tunjukkan Caranya saves 1 star (${done})`)
    check(page.errs.length === 0, `${tag}: no page errors (${page.errs.slice(0, 3).join(' | ')})`)
    await page.close()
  }
  {
    const page = await open(browser, 1280, 800), tag = 'two stops 1280x800'
    await skipStory(page); await sleep(1500)
    for (let i = 0; i < 2; i++) await page.evaluate(() => new Promise(res => { const h = __tk.handle(); h.setProgram(['E', 'S', 'S', 'S']); h.go(); const iv = setInterval(() => { if (!h.state().running) { clearInterval(iv); setTimeout(res, 300) } }, 100) }))
    const nudge = await page.evaluate(() => document.querySelector('.tkg-hintb').classList.contains('tkg-hintb--nudge'))
    check(nudge, `${tag}: two stopped runs make Timmy offer help`)
    await page.evaluate(() => document.querySelector('.tkg-hintb').click()); await sleep(300)
    const card = await page.evaluate(() => { const a = document.querySelector('.tkg-ask'), sb = a.querySelector('.show'); return a.classList.contains('on') && !sb.hidden })
    check(card, `${tag}: the first Petunjuk press then offers Tunjukkan Caranya too`)
    // E) polish
    const pol = await page.evaluate(() => { const g = document.querySelector('.tkg-goal'), v = document.querySelector('.tkg-board > .tkg-vig'); return { pulse: getComputedStyle(g, '::after').animationName, vig: !!v, first: !!v && [...v.parentNode.children].indexOf(v) <= 1, z: v && getComputedStyle(v).zIndex } })
    check(pol.pulse === 'tkg-goalp', `${tag}: the goal breathes a ring (${pol.pulse})`)
    check(pol.vig && pol.first && pol.z === '0', `${tag}: the vignette is under every piece (${JSON.stringify(pol)})`)
    check(page.errs.length === 0, `${tag}: no page errors (${page.errs.slice(0, 3).join(' | ')})`)
    await page.close()
  }
} finally { await browser.close() }
console.log(`qa-tk-polish: ${passes} passed, ${fails.length} failed`)
process.exitCode = fails.length ? 1 : 0
