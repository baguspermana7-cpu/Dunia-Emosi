// v55.79 — verify the VISUAL/AUDIO-only gameplay enhancements on g14
// (balapan-kereta.html), WITHOUT introducing any new on-screen text:
//   (1) combo/streak: S.streak exists, milestone FX (3/5/10) runs & adds NO text,
//   (2) silent coin multiplier: streak≥5 → ×1.5, ≥10 → ×2 (capped at ×2),
//   (3) biome-affinity obstacle pools: spawnObstacle weights vary per biome,
//       obstacles actually appear, biome differs across levels,
//   (4) zero console errors, and the pre-existing floating-text node count stays
//       low through a mid-race high-streak burst.
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

// L1 = forest, L6 = volcano, L4 = coastal — three DISTINCT THEMES biomes
// (THEMES order: forest,desert,snow,coastal,urban,volcano; TH = (lvl-1)%6).
const LEVELS = [1, 6, 4]
const IGNORE = /favicon|Pokedex|pokemondb|showdown|net::ERR|Failed to load resource/i

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []

for (const lv of LEVELS) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 600, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
  await page.evaluateOnNewDocument((level) => {
    sessionStorage.setItem('g14Config', JSON.stringify({ level, trainKey: 'aeg_thomas', train: 'aeg_thomas', difficulty: 'easy' }))
  }, lv)
  try {
    await page.goto('http://localhost:8081/games/balapan-kereta.html', { waitUntil: 'networkidle2', timeout: 20000 })
  } catch (e) { errors.push('GOTO: ' + e.message) }
  await sleep(1800)
  await page.evaluate(() => {
    try {
      const t = (typeof TRAIN_MAP !== 'undefined' && TRAIN_MAP['aeg_thomas']) || null
      if (t) { S.trainCfg = { ...t, variant: 1 }; window.selectedTrainKey = t.key }
      if (typeof startRace === 'function') startRace()
    } catch (e) {}
  })
  await sleep(3800) // wait out 3-2-1-GO

  // ── basics ─────────────────────────────────────────────────────────────
  const basics = await page.evaluate(() => ({
    streakDefined: (typeof S !== 'undefined') && (typeof S.streak !== 'undefined'),
    streakIsNumber: (typeof S !== 'undefined') && (typeof S.streak === 'number'),
    biome: (typeof TH !== 'undefined') ? TH.name : null,
    affinityLoaded: !!(window.G14_OBSTACLE_AFFINITY),
    running: (typeof S !== 'undefined') && !!S.running,
  }))

  // ── biome-affinity obstacle spawning ───────────────────────────────────
  // Fire spawnObstacle() many times; assert obstacles appear AND every emoji
  // comes from this biome's pool (weighting must not produce out-of-pool picks).
  const obs = await page.evaluate(() => {
    const beforeN = S.obstacles.length
    const pool = (OBS_PER_BIOME[TH.name] || OBS_EMOJIS)
    const seen = {}
    for (let i = 0; i < 80; i++) { try { spawnObstacle() } catch (e) { return { error: String(e) } } }
    let outOfPool = 0
    for (const o of S.obstacles) {
      const e = o._emoji
      if (e) { seen[e] = (seen[e] || 0) + 1; if (pool.indexOf(e) === -1) outOfPool++ }
    }
    return { spawned: S.obstacles.length - beforeN, distinct: Object.keys(seen).length, outOfPool, pool, seen }
  })

  let streak = null, multiplier = null, noText = null
  let shot = null
  if (lv === LEVELS[0]) {
    // ── milestone FX adds NO floating text ───────────────────────────────
    noText = await page.evaluate(() => {
      const sel = '.g14-milestone,.g14-nearmiss,.g14-station-cinema'
      const before = document.querySelectorAll(sel).length
      let threw = false
      try {
        S.streak = 3; g14StreakMilestone()
        S.streak = 5; g14StreakMilestone()
        S.streak = 10; g14StreakMilestone()
      } catch (e) { threw = true }
      const after = document.querySelectorAll(sel).length
      return { before, after, threw, addedText: after - before }
    })

    // screenshot a mid-race frame at a high streak (particles on canvas)
    await page.evaluate(() => { try { S.streak = 10; g14StreakMilestone() } catch (e) {} })
    await sleep(120)
    shot = `${OUT}/gameplay-streak.png`
    await page.screenshot({ path: shot })

    // ── silent coin multiplier (collect a forced coin pickup) ────────────
    multiplier = await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms))
      function collectCoinWithStreak(st) {
        const before = S.coins || 0
        S.streak = st
        spawnPickup()
        const p = S.pickups[S.pickups.length - 1]
        if (!p) return { ok: false }
        p._kind = 'coin'; p._lane = S.lane
        p.x = app.screen.width * PLAYER_X
        p.y = laneYs[S.lane]
        return { before }
      }
      // streak 6 → ×1.5 → +15
      const a = collectCoinWithStreak(6); await wait(260)
      const gain15 = (S.coins || 0) - a.before
      // streak 20 → capped ×2 → +20
      const b = collectCoinWithStreak(20); await wait(260)
      const gain20 = (S.coins || 0) - b.before
      // streak 1 → ×1 → +10 (baseline)
      const c = collectCoinWithStreak(1); await wait(260)
      const gain10 = (S.coins || 0) - c.before
      return { gain10, gain15, gain20 }
    })

    streak = await page.evaluate(() => ({ value: S.streak }))
  }

  await page.close()
  results.push({
    lv, biome: basics.biome, ...basics, obs, streak, multiplier, noText, shot,
    errors: errors.filter(e => !IGNORE.test(e)),
  })
}
await browser.close()

// ── evaluate ──────────────────────────────────────────────────────────────
console.log(JSON.stringify(results, null, 2))

const biomes = new Set(results.map(r => r.biome))
const first = results.find(r => r.lv === LEVELS[0])

const checks = []
const fail = (cond, msg) => { checks.push({ ok: !!cond, msg }) }

for (const r of results) {
  fail(r.streakDefined && r.streakIsNumber, `L${r.lv}: S.streak is a number`)
  fail(r.affinityLoaded, `L${r.lv}: G14_OBSTACLE_AFFINITY loaded`)
  fail(r.obs && !r.obs.error && r.obs.spawned > 0, `L${r.lv}: obstacles spawned (${r.obs && r.obs.spawned})`)
  fail(r.obs && r.obs.outOfPool === 0, `L${r.lv}: all spawns within biome pool (outOfPool=${r.obs && r.obs.outOfPool})`)
  fail(r.errors.length === 0, `L${r.lv}: 0 console errors (${r.errors.length})`)
}
fail(biomes.size >= 3, `biome varies across levels (${[...biomes].join(',')})`)
fail(first.noText && first.noText.addedText === 0 && !first.noText.threw, `milestone FX adds NO floating text (added=${first.noText && first.noText.addedText})`)
fail(first.multiplier && first.multiplier.gain10 === 10, `streak<5 coin = +10 (${first.multiplier && first.multiplier.gain10})`)
fail(first.multiplier && first.multiplier.gain15 === 15, `streak≥5 coin = +15 ×1.5 (${first.multiplier && first.multiplier.gain15})`)
fail(first.multiplier && first.multiplier.gain20 === 20, `streak≥10 coin = +20 ×2 capped (${first.multiplier && first.multiplier.gain20})`)

console.log('\n── checks ──')
for (const c of checks) console.log(`${c.ok ? '✅' : '❌'} ${c.msg}`)
const bad = checks.filter(c => !c.ok)
console.log(bad.length ? `\n❌ ${bad.length} check(s) failed` : '\n✅ all gameplay-enhancement checks passed')
process.exit(bad.length ? 1 : 0)
