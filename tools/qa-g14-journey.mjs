// Headless visual probe for g14 (balapan-kereta) B-275/B-278 — renders sample
// levels and captures a screenshot + console errors per level. Pixi FPS is NOT
// measurable headless (software-GL), so we judge VISUALS via screenshots.
import puppeteer from 'puppeteer'
import fs from 'fs'

const LEVELS = [1, 4, 13, 17, 20, 21, 22, 25, 31, 37, 40]
const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})

const summary = []
for (const lv of LEVELS) {
  const page = await browser.newPage()
  await page.setViewport({ width: 900, height: 600, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
  // Seed the config the standalone page reads, then load.
  await page.evaluateOnNewDocument((level) => {
    sessionStorage.setItem('g14Config', JSON.stringify({ level, trainKey: 'aeg_thomas', train: 'aeg_thomas', difficulty: 'easy' }))
  }, lv)
  try {
    await page.goto('http://localhost:8081/games/balapan-kereta.html', { waitUntil: 'networkidle2', timeout: 20000 })
  } catch (e) { errors.push('GOTO: ' + e.message) }
  await new Promise(r => setTimeout(r, 1500))
  // pick a Thomas train + start the race so the scene + trains-on-rail render
  await page.evaluate(() => {
    try {
      const t = (typeof TRAIN_MAP !== 'undefined' && TRAIN_MAP['aeg_thomas']) || null
      if (t) { S.trainCfg = { ...t, variant: 1 }; window.selectedTrainKey = t.key }
      if (typeof startRace === 'function') startRace()
    } catch (e) {}
  })
  await new Promise(r => setTimeout(r, 3200))
  // probe in-page journey state
  const info = await page.evaluate(() => {
    try {
      const j = (typeof g14Journey === 'function') ? g14Journey() : null
      const pal = (typeof g14Palette === 'function') ? g14Palette() : null
      return { station: j && j.name, biome: j && j.biome, landmark: j && j.landmark, grass: pal && pal.grass, hasFar: !!(window.L && L.far), tracks: !!(window.L && L.tracks) }
    } catch (e) { return { err: String(e) } }
  })
  await page.screenshot({ path: `${OUT}/g14-L${String(lv).padStart(2, '0')}.png` })
  summary.push({ lv, ...info, errors: errors.filter(e => !/favicon|Pokedex|pokemondb|showdown|net::ERR/i.test(e)) })
  await page.close()
}
await browser.close()
console.log(JSON.stringify(summary, null, 2))
const bad = summary.filter(s => s.errors.length || !s.station)
console.log(bad.length ? `\n❌ ${bad.length} level(s) with issues` : '\n✅ all sample levels clean')
