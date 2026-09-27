// Balapan Kereta PvP fairness + readability gate — owner: "pvp nggak jelas mekaniknya.
// Masak selalu kalah yg p1 dan position nya tidak sama saat mulai. Boostnya tidak bisa."
//   - both trains start at the SAME x, and P1's controls are on the LEFT;
//   - a perfectly symmetric race (same lane, same input, shared items) is a draw ("Seri"),
//     never a win for whichever player the loop happens to check first;
//   - BOOST after 2 real tokens, by a real tap: that train visibly surges ahead on screen
//     (>= 6% of the track) and gains >= 4 distance on the other;
//   - a tap before BOOST is ready explains itself (chip + shake) and does not boost;
//   - a shared token goes to the train that reaches it first, not to both;
//   - real taps on NAIK / BOOST work at tablet and phone landscape.
// Needs the dev server on :8081.
import puppeteer from 'puppeteer'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log((ok ? '✅ ' : '❌ ') + msg); if (!ok) fails.push(msg) }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })

async function arena (w, h) {
  const page = await b.newPage()
  await page.setViewport({ width: w, height: h, hasTouch: true, isMobile: true })
  const errs = []
  page.on('pageerror', e => errs.push(e.message))
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('g14-tutorial-seen', '1'); sessionStorage.setItem('g14-hinted', '1'); localStorage.removeItem('dunia-pvp-names')
    sessionStorage.setItem('g14Config', JSON.stringify({ level: 1, trainKey: 'aeg_thomas', train: 'aeg_thomas', difficulty: 'easy' }))
  })
  for (const t of [45000, 120000]) { try { await page.goto('http://localhost:8081/games/balapan-kereta.html', { waitUntil: 'domcontentloaded', timeout: t }); break } catch (_) {} }
  await sleep(2500)
  await page.evaluate(() => { try { const t = TRAIN_MAP['aeg_thomas']; S.trainCfg = { ...t, variant: 1 }; window.selectedTrainKey = t.key } catch (e) {} window.g14GoRace() })
  await sleep(500)
  await page.evaluate(() => document.querySelector('.gvs-card[data-mode="pvp"]').click()); await sleep(400)
  await page.type('.gvs-input[data-idx="0"]', 'Satu'); await page.type('.gvs-input[data-idx="1"]', 'Dua')
  await page.evaluate(() => document.querySelector('#gvs-go').click())
  await sleep(4200)   // real 3·2·1·GO
  return { page, errs }
}
const st = page => page.evaluate(() => {
  const o = {}
  for (const s of ['p1', 'p2']) { const P = window.__g14pvp.byside(s); const r = P.train.getBoundingClientRect(); o[s] = { x: P.trainX, px: r.left + r.width / 2, dist: P.dist, lane: P.lane, energy: P.energy, tokens: P.tokens, boosting: performance.now() < P.boostUntil } }
  o.W = document.querySelector('.gvs-scene').clientWidth
  return o
})
const center = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === e } }, sel)

try {
  for (const [w, h] of [[1024, 600], [844, 390]]) {
    const tag = `${w}x${h}`
    // ── start + layout ──
    let { page, errs } = await arena(w, h)
    const s0 = await st(page)
    check(Math.abs(s0.p1.x - s0.p2.x) < 0.01, `${tag}: both trains start at the same x (${s0.p1.x.toFixed(1)}% / ${s0.p2.x.toFixed(1)}%)`)
    const ov = await page.evaluate(() => { const a = document.querySelector('.gvs-train.p1').getBoundingClientRect(), c = document.querySelector('.gvs-train.p2').getBoundingClientRect(); return Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top)) * Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) })
    check(s0.p1.lane !== s0.p2.lane && ov === 0, `${tag}: at the start the two trains are on separate lanes and do not overlap (overlap ${Math.round(ov)}px²)`)
    const sides = await page.evaluate(() => ({ s1: document.querySelector('.gvs-side.p1').getBoundingClientRect().left, s2: document.querySelector('.gvs-side.p2').getBoundingClientRect().left, t1: document.querySelector('.gvs-side.p1 .gvs-ptag').textContent }))
    check(sides.s1 < sides.s2 && sides.t1 === 'PEMAIN 1', `${tag}: PEMAIN 1 controls are on the left`)

    // ── early tap: feedback, no boost ──
    const sb1 = await center(page, '.gvs-foot.p1 .sb')
    check(sb1.top, `${tag}: P1 BOOST is the top element at its centre (tappable)`)
    await page.touchscreen.tap(sb1.x, sb1.y); await sleep(150)
    const early = await page.evaluate(() => ({ chip: !!document.querySelector('.gvs-foot.p1 .gvs-need'), shake: document.querySelector('.gvs-foot.p1 .sb').classList.contains('shake'), boosting: performance.now() < window.__g14pvp.byside('p1').boostUntil }))
    check(early.chip && early.shake && !early.boosting, `${tag}: an early BOOST tap shows "kurang" + shakes, and does not boost`)

    // ── real lane tap (P1 starts on the top lane, so TURUN) ──
    const dn1 = await center(page, '.gvs-side.p1 .gvs-slane:nth-of-type(2)')
    const laneBefore = (await st(page)).p1.lane
    await page.touchscreen.tap(dn1.x, dn1.y); await sleep(120)
    check((await st(page)).p1.lane === laneBefore + 1, `${tag}: a real tap on P1 TURUN moves P1 down a lane`)
    await page.evaluate(() => { const P = window.__g14pvp.byside('p1'); P.lane = 1; P._setLane() })

    // ── 2 real tokens → BOOST by a real tap → visible surge ──
    await page.evaluate(() => { window.__g14pvp.byside('p2').lane = 0; window.__g14pvp.byside('p2')._setLane() })   // keep P2 out of P1's tokens
    for (let k = 0; k < 2; k++) { await page.evaluate(() => window.__g14pvp.spawnToken('p1')); await sleep(900) }
    const pre = await st(page)
    check(pre.p1.energy >= 50, `${tag}: two tokens make BOOST ready (energy ${pre.p1.energy})`)
    await page.touchscreen.tap(sb1.x, sb1.y); await sleep(100)
    check((await st(page)).p1.boosting, `${tag}: a real tap on P1 BOOST boosts P1`)
    await sleep(2100)
    const post = await st(page)
    const gainDist = (post.p1.dist - pre.p1.dist) - (post.p2.dist - pre.p2.dist)
    const aheadPx = post.p1.px - post.p2.px
    check(gainDist >= 4, `${tag}: BOOST gains ${gainDist.toFixed(1)} distance on the other train (>= 4)`)
    check(aheadPx >= 0.06 * post.W, `${tag}: P1 is visibly ahead after BOOST (${Math.round(aheadPx)}px = ${(100 * aheadPx / post.W).toFixed(1)}% of track)`)

    // ── shared token: the train that reaches it first takes it ──
    await page.evaluate(() => {
      const G = window.__g14pvp, R = G.race
      R.nextTok = R.nextHaz = Infinity                                   // only the token we place counts
      for (const it of R.tk.concat(R.hz)) { it.on = false; it.el.classList.remove('on') }
      G.setDist('p1', 60); G.setDist('p2', 50); for (const s of ['p1', 'p2']) { const P = G.byside(s); P.lane = 1; P._setLane() }
    })
    await sleep(300)
    const t0 = await st(page)
    await page.evaluate(() => window.__g14pvp.spawnToken('p1'))
    await sleep(1500)
    const t1 = await st(page)
    check(t1.p1.tokens === t0.p1.tokens + 1 && t1.p2.tokens === t0.p2.tokens, `${tag}: a shared token goes to the train that reaches it first only (P1 +${t1.p1.tokens - t0.p1.tokens}, P2 +${t1.p2.tokens - t0.p2.tokens})`)
    check(errs.length === 0, `${tag}: no page errors${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`)
    await page.close()

    // ── symmetric race ends in a draw ──
    ;({ page, errs } = await arena(w, h))
    await page.evaluate(() => { const G = window.__g14pvp; for (const s of ['p1', 'p2']) { G.setDist(s, 93); const P = G.byside(s); P.lane = 1; P._setLane() } })
    let title = null
    for (let i = 0; i < 40 && !title; i++) { await sleep(300); title = await page.evaluate(() => { const e = document.querySelector('.gvs-panel h1'); return e ? e.textContent : null }) }
    check(!!title && /Seri/.test(title), `${tag}: a perfectly symmetric race is a draw, not a win for either side ("${title}")`)
    check(errs.length === 0, `${tag}: no page errors (draw)${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`)
    await page.close()
  }
} finally { await b.close() }
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
