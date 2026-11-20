#!/usr/bin/env node
// qa-prd41-ducky — PRD-41 (docs/prd/PRD-41-ducky-power-up-cuaca.md): Ducky Volley gets power-ups after a right answer
// between sets and one weather per set (clear, wind that pushes the ball a little, rain that is only a look).
//   L1 10 levels x 3 sets: >= 2 different weathers in every match; 3 right answers give 3 different power-ups; a wrong
//      answer gives none
//   L2 wind never makes a set impossible: a bot that walks to where the ball will land and jumps still plays >= 80 % of
//      the balls that come to its side, in wind from both directions (calm measured beside it)
//   L3 reduced motion: a rainy set draws no moving rain (no WeatherFX canvas), the label still says the weather;
//      without reduced motion the rain canvas is there
//   L4 0 page errors; screenshots (QA_SHOTS=dir) at 390x844, 844x390, 800x1280 are looked at
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd41-ducky.mjs
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, ''), SH = process.env.QA_SHOTS
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource/i

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
async function open ([w, h], errs, { level = 1, reduced = false } = {}) {
  const c = await b.createBrowserContext(), p = await c.newPage()
  p.on('pageerror', e => { if (!IGNORE.test(e.message)) errs.push(e.message) })
  await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
  if (reduced) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await p.evaluateOnNewDocument(level => {
    if (!sessionStorage.__s) {
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
    }
    sessionStorage.setItem('g20Config', JSON.stringify({ level }))
  }, level)
  await p.goto(BASE + '/games/ducky-volley.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(1500)
  return { c, p }
}
const startPlay = p => p.evaluate(() => { if (!window.__g20) return false; startGame(); return true })

// L1 weather per set over 10 levels, and power-ups from answers
{
  const errs = [], { c, p } = await open([844, 390], errs)
  const has = await startPlay(p)
  const matches = has ? await p.evaluate(() => {
    const out = []
    for (let lv = 1; lv <= 10; lv++) { cfg.level = lv; const w = []; for (let r = 1; r <= 3; r++) { __g20.setWeather(r); w.push(__g20.state().weather) } out.push(w) }
    return out
  }) : []
  const kinds = new Set(matches.flat())
  ok(has && matches.length === 10 && matches.every(m => new Set(m).size >= 2) && kinds.has('windy') && kinds.has('rain') && kinds.has('clear'),
    `L1 10 matches x 3 sets: weathers ${matches.map(m => m.join('/')).slice(0, 2).join(', ')}..., kinds ${[...kinds].join(',')}`)
  // answer between sets by real taps: right, right, right, then wrong
  const got = []
  for (const right of [true, true, true, false]) {
    if (!has) break
    // a power-up runs on its timer, so clear it before each answer: only a NEW one counts
    await p.evaluate(() => { S.powerup = null; pickQ = () => ({ q: '2+2 = ?', ans: '4', w: ['3', '5', '6'] }); __g20.showQuiz() })
    await p.waitForSelector('#quiz-panel.show .qbtn', { visible: true, timeout: 5000 }).catch(() => {})
    const btns = await p.$$('#quiz-choices .qbtn'), labels = await Promise.all(btns.map(x => x.evaluate(e => e.textContent)))
    const i = right ? labels.indexOf('4') : labels.findIndex(l => l !== '4')
    const bx = await btns[i].boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2)
    await sleep(1300)
    got.push(await p.evaluate(() => __g20.state().powerup))
  }
  ok(new Set(got.slice(0, 3)).size === 3 && got.slice(0, 3).every(Boolean) && got[3] === null,
    `L1 power-ups after right, right, right, wrong answers (real taps): ${got.join(', ')}`)
  ok(!errs.length, `L4 L1 page errors ${errs.slice(0, 2).join(' | ') || 0}`)
  await c.close()
}

// L2 bot play in calm and in wind from both sides. Headless draws ~6 frames a second, so the bot drives the game's own
// gameLoop frame by frame (dt 1 = one 60 fps frame) with the real physics, CPU and hit code: 9000 frames = 150 s of play.
async function botRun (wind, frames, seed0) {
  const errs = [], { c, p } = await open([844, 390], errs)
  if (!await startPlay(p)) { await c.close(); return null }
  const r = await p.evaluate((wind, frames, seed0) => {
    app.ticker.stop()
    // seeded: randomizePhysics and the CPU use Math.random, the three runs must differ only in the wind
    let seed = seed0; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    resetRound('player')
    const bot = { hits: 0, miss: 0 }
    let lastC = S.cScore, lastH = S.lastHitter
    for (let f = 0; f < frames; f++) {
      S.weather = wind ? 'windy' : 'clear'; S.wind = wind
      if (S.quizActive) { document.getElementById('quiz-panel').classList.remove('show'); S.quizActive = false; resetRound('cpu') }
      // keep the match going: the score is not the point here
      if (S.pScore >= 1 || S.cScore >= 1) { S.pScore = 0; S.cScore = 0; lastC = 0 }
      if (S.bx < NET_X) {
        S.pTargetX = Math.max(DUCK_R, Math.min(NET_X - DUCK_R, predictBallLandingX() - 6))
        const dx = Math.abs(S.bx - S.px), above = S.py - S.by
        if (dx < 60 && above > 40 && above < 170 && S.bvy > -1) S.jump = true
      } else S.pTargetX = W * 0.22
      gameLoop({ deltaTime: 1 })
      if (S.cScore > lastC) bot.miss++
      lastC = S.cScore
      if (S.lastHitter === 'player' && lastH !== 'player') bot.hits++
      lastH = S.lastHitter
    }
    return bot
  }, wind, frames, seed0)
  await c.close()
  return { ...r, errs }
}
const rates = {}
for (const [label, wind] of [['calm', 0], ['wind to the right', 1], ['wind to the left', -1]]) {
  // three seeds pooled: one bot run swings +-8 points on its own (calm 80-88 %)
  const runs = []; for (const sd of [11, 23, 37]) runs.push(await botRun(wind, 9000, sd))
  const r = runs.every(Boolean) ? { hits: runs.reduce((a, x) => a + x.hits, 0), miss: runs.reduce((a, x) => a + x.miss, 0), errs: runs.flatMap(x => x.errs) } : null
  const n = r ? r.hits + r.miss : 0, rate = n ? r.hits / n : 0
  rates[wind] = rate
  ok(r && n >= 45 && (wind === 0 || rate >= 0.8) && !r.errs.length,
    `L2 ${label}: bot played ${r ? r.hits : 0} of ${n} balls on its side in 3 x 150 s of game time (${Math.round(rate * 100)} %${wind ? ', law >= 80 %' : ', reference'}) ${r ? r.errs.join(' | ') : 'no __g20'}`)
}

// L3 reduced motion: no moving rain, the label still names the weather
for (const reduced of [false, true]) {
  const errs = [], { c, p } = await open([844, 390], errs, { level: 2, reduced })
  await startPlay(p)
  await p.evaluate(() => window.__g20 && __g20.setWeather(2))
  await sleep(2500)
  const r = await p.evaluate(() => ({ w: window.__g20 && __g20.state().weather, canvas: !!document.querySelector('.weather-fx-canvas'), label: document.getElementById('round-text').textContent }))
  ok(r.w === 'rain' && r.canvas === !reduced && /Hujan/.test(r.label) && !errs.length,
    `L3 ${reduced ? 'reduced motion' : 'normal motion'}: rainy set, rain canvas ${r.canvas}, label "${r.label}" ${errs.join(' | ')}`)
  await c.close()
}

// L4 screenshots: a windy set with a fresh power-up, at three sizes
for (const size of [[390, 844], [844, 390], [800, 1280]]) {
  const errs = [], { c, p } = await open(size, errs, { level: 1 })
  await startPlay(p)
  await p.evaluate(() => { __g20.setWeather(2); __g20.grantPowerup() })
  await sleep(400)
  const st = await p.evaluate(() => ({ ...__g20.state(), label: document.getElementById('round-text').textContent, pop: !!document.querySelector('.pw-pop') }))
  if (SH) { fs.mkdirSync(SH, { recursive: true }); await p.screenshot({ path: path.join(SH, `ducky-${size[0]}x${size[1]}.png`) }) }
  ok(st.weather === 'windy' && st.powerup && st.pop && !errs.length, `L4 ${size[0]}x${size[1]}: ${st.weather}, ${st.powerup}, pop ${st.pop}, label "${st.label}", errors ${errs.join(' | ') || 0}`)
  await c.close()
}
await b.close()
console.log(`qa-prd41-ducky: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
