// Balapan Kereta (Adventure) pickup gate — owner: "kadang ada objectnya tapi kok kayak
// tidak terambil". On a phone held sideways the lanes are 24-53px apart and a pickup of
// the lane below used to hover INSIDE the body of the train one lane up: touched on
// screen, never taken. This drives a real race, stops the game ticker, and steps
// tickPickups() by hand so every pickup is judged frame by frame:
//   - a pickup that visibly sits on the train (>= 40% of it inside the body) MUST be taken;
//   - a pickup that is taken must be in the train's lane or visibly on it (never from afar);
//   - every pickup in the train's own lane is taken;
//   - a 250 ms frame hitch cannot carry a pickup through the train untaken.
// Proven against the pre-fix code: it fails "touches the train and stays untaken" on the
// phone-landscape sizes and "frame hitch" everywhere.
// Needs the dev server on :8081.
import puppeteer from 'puppeteer'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const SIZES = [[844, 390], [640, 360], [1024, 768], [390, 844]]
const fails = []
const check = (ok, msg) => { console.log((ok ? '✅ ' : '❌ ') + msg); if (!ok) fails.push(msg) }
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })

try {
  for (const [w, h] of SIZES) {
    const pg = await b.newPage()
    await pg.setViewport({ width: w, height: h })
    const errs = []
    pg.on('pageerror', e => errs.push(e.message))
    await pg.evaluateOnNewDocument(() => { localStorage.setItem('g14-tutorial-seen', '1'); sessionStorage.setItem('g14-hinted', '1') })
    let ok = false
    for (const t of [45000, 120000]) {
      try { await pg.goto('http://localhost:8081/games/balapan-kereta.html', { waitUntil: 'networkidle2', timeout: t }); ok = true; break } catch (_) {}
    }
    if (!ok) { check(false, `${w}x${h}: page loads`); await pg.close(); continue }
    await sleep(1800)
    const clickWhen = async (sel, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const hit = await pg.evaluate(s => { const e = document.querySelector(s); if (e) { e.click(); return true } return false }, sel); if (hit) return true; await sleep(250) } return false }
    await clickWhen('.gvs-card[data-mode="adventure"]'); await sleep(600)
    await clickWhen('.cat-btn'); await sleep(400)
    await clickWhen('.train-card'); await sleep(300)
    await pg.evaluate(() => { if (typeof g14GoRace === 'function') g14GoRace() }); await sleep(400)
    await pg.evaluate(() => { const g = document.getElementById('g14-tut-go'); if (g) g.click() }); await sleep(6000)

    const r = await pg.evaluate(() => {
      app.ticker.stop()                       // nothing moves unless we step it
      if (!Array.isArray(S.pickups)) S.pickups = []
      const LN = laneYs.length, out = { cases: 0, touchedNotTaken: [], takenFromAfar: [], ownLaneMissed: [], crossLaneTouch: 0, hitchMissed: false }
      const realRandom = Math.random
      const clear = () => { for (const p of S.pickups) { try { L.fx.removeChild(p) } catch (_) {} } S.pickups.length = 0 }
      const place = (lane) => { S.lane = S.targetLane = lane; L.player.y = laneYs[lane] + (L.player._wheelOffset || 0) }
      const spawnIn = (lane) => {
        const seq = [(lane + 0.5) / LN, 0.05]; let k = 0
        Math.random = () => (k < seq.length ? seq[k++] : realRandom())
        try { spawnPickup() } finally { Math.random = realRandom }
        return S.pickups[S.pickups.length - 1]
      }
      const onTrain = (p) => {
        const tb = L.player.getBounds(), r = p._pk || 20, gp = p.getGlobalPosition()
        const ix = Math.max(0, Math.min(gp.x + r, tb.x + tb.width) - Math.max(gp.x - r, tb.x))
        const iy = Math.max(0, Math.min(gp.y + r, tb.y + tb.height) - Math.max(gp.y - r, tb.y))
        return (ix * iy) / (4 * r * r)
      }
      const speed0 = S.speed; S.speed = Math.max(S.speed || 0, 3)
      for (let tl = 0; tl < LN; tl++) {
        for (let pl = 0; pl < LN; pl++) {
          clear(); place(tl)
          const p = spawnIn(pl); if (!p) continue
          out.cases++
          let touched = false, taken = false
          for (let step = 0; step < 4000 && p._alive; step++) {
            if (onTrain(p) >= 0.4) touched = true
            const coins = S.coins || 0, hp = S.hp, pr = S.pressure
            tickPickups(1)
            if (onTrain(p) >= 0.4) touched = true   // it may reach the train and be taken in one tick
            if (!p._alive && ((S.coins || 0) !== coins || S.hp !== hp || S.pressure !== pr || p.x > -60)) taken = true
          }
          const tag = `train lane ${tl}, pickup lane ${pl}`
          if (pl !== tl && touched) out.crossLaneTouch++
          if (touched && !taken) out.touchedNotTaken.push(tag)
          if (taken && pl !== tl && !touched) out.takenFromAfar.push(tag)
          if (pl === tl && !taken) out.ownLaneMissed.push(tag)
        }
      }
      // frame hitch: one 250 ms step (15 frames at 60fps) right across the train's column
      clear(); place(1)
      const p = spawnIn(1); const px = app.screen.width * PLAYER_X
      p.x = px + 100                                   // outside the ±64px magnet: no help from it
      const coins = S.coins || 0
      tickPickups(Math.ceil(200 / (S.speed * 0.9)))   // one step jumps ~200px: from +100 to -100, past the train
      out.hitchMissed = !((S.coins || 0) > coins)     // only a real coin counts, not an off-screen kill
      clear(); S.speed = speed0
      app.ticker.start()
      return out
    })
    const tag = `${w}x${h}`
    check(r.cases >= 9, `${tag}: ${r.cases} lane × lane cases run`)
    check(r.touchedNotTaken.length === 0, `${tag}: no pickup touches the train and stays untaken${r.touchedNotTaken.length ? ' — ' + r.touchedNotTaken.join('; ') : ''}`)
    check(r.takenFromAfar.length === 0, `${tag}: nothing is taken from another lane without touching${r.takenFromAfar.length ? ' — ' + r.takenFromAfar.join('; ') : ''}`)
    check(r.ownLaneMissed.length === 0, `${tag}: every pickup in the train's own lane is taken${r.ownLaneMissed.length ? ' — ' + r.ownLaneMissed.join('; ') : ''}`)
    // Where the train is taller than the lane gap (640x360: 43px train, 24-31px lanes) it
    // physically covers part of the neighbouring lanes; those pickups are then TAKEN (checked
    // above), which is the point. Reported, not failed.
    console.log(`   ${tag}: cross-lane contacts (taken, by the visual rule): ${r.crossLaneTouch}`)
    check(!r.hitchMissed, `${tag}: a 250 ms frame hitch cannot carry a pickup through the train`)
    check(errs.length === 0, `${tag}: no page errors${errs.length ? ' — ' + errs.slice(0, 2).join(' | ') : ''}`)
    await pg.close()
  }
} finally { await b.close() }
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
