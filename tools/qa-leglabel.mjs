// v55.80 — verifies the SHARED 48-leg journey leg-name labels render in
// lokomotif-pemberani (g15) and balapan-kereta-side, matching the painterly plate
// each game shows. Boot lifted from qa-g15-backdrop.mjs / qa-g14-side-backdrop.mjs.
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|Pokedex|pokemondb|showdown|net::ERR|Failed to load resource/i
const sleep = ms => new Promise(r => setTimeout(r, ms))

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})

const results = []
let failed = false

// ── A. g15 lokomotif-pemberani ──────────────────────────────────────────────
{
  const G15_LEVEL = 5
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 600, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
  await page.evaluateOnNewDocument((level) => {
    sessionStorage.setItem('g15Config', JSON.stringify({ level }))
  }, G15_LEVEL)
  try {
    await page.goto('http://localhost:8081/games/lokomotif-pemberani.html', { waitUntil: 'networkidle2', timeout: 25000 })
  } catch (e) { errors.push('GOTO: ' + e.message) }
  await sleep(1200)

  // (1) On the train-select screen: open the journey map (real usage = click
  //     #station-intro) and confirm it lists journey legs, not the old 6 cities,
  //     and that it is actually on-screen (parent train-select still visible).
  await page.evaluate(() => { const si = document.getElementById('station-intro'); if (si) si.click() })
  await sleep(600)
  const mapInfo = await page.evaluate(() => {
    const m = document.getElementById('g15-journey-map')
    const route = document.getElementById('g15-journey-route')
    // one label per dot: the inner label div is the LAST child of each dot wrapper
    const labels = route ? [...route.children].map(dot => {
      const divs = dot.querySelectorAll('div'); return divs.length ? (divs[divs.length - 1].textContent || '').trim() : ''
    }).filter(Boolean) : []
    const r = m ? m.getBoundingClientRect() : null
    const oldCities = ['Solo', 'Yogya', 'Merak']
    return {
      mapVisible: !!(m && getComputedStyle(m).display !== 'none' && r && r.width > 0 && r.height > 0),
      stationLabels: labels,
      stillOldStatic: oldCities.every(c => labels.includes(c)),
    }
  })
  await page.screenshot({ path: `${OUT}/g15-journeymap.png` })
  await page.evaluate(() => { if (typeof g15CloseJourneyMap === 'function') g15CloseJourneyMap() })
  await sleep(300)

  // (2) Start the game → verify the in-play leg label.
  await page.evaluate(() => { const c = document.querySelector('#train-grid .tcard'); if (c) c.click() })
  await sleep(3800)
  const label = await page.evaluate(() => {
    const el = document.getElementById('g15-leg-label')
    const nm = document.getElementById('g15-leg-name')
    if (!el || !nm) return { exists: false }
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return {
      exists: true,
      visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0,
      text: (nm.textContent || '').trim(),
      // TrainJourney IS a window prop → read by bare identifier:
      expected: (typeof TrainJourney !== 'undefined' && TrainJourney) ? TrainJourney.name(5) : null,
    }
  })
  await page.screenshot({ path: `${OUT}/leglabel-g15.png` })

  const cleanErrors = errors.filter(e => !IGNORE.test(e))
  const ok = label.exists && label.visible && !!label.text && label.text === label.expected &&
    mapInfo.mapVisible && mapInfo.stationLabels.length > 0 && !mapInfo.stillOldStatic && cleanErrors.length === 0
  if (!ok) failed = true
  results.push({ game: 'g15', level: G15_LEVEL, label, mapInfo, errors: cleanErrors, ok })
  await page.close()
}

// ── B. balapan-kereta-side ──────────────────────────────────────────────────
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 600, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
  await page.evaluateOnNewDocument(() => {
    try { sessionStorage.setItem('g14-side-train', 'aeg_thomas') } catch (_) {}
    try { localStorage.setItem('g14s-tutorial-seen', '1') } catch (_) {}
  })
  try {
    await page.goto('http://localhost:8081/games/balapan-kereta-side.html', { waitUntil: 'networkidle2', timeout: 25000 })
  } catch (e) { errors.push('GOTO: ' + e.message) }
  await sleep(1500)
  await page.evaluate(() => { try { document.body.click() } catch (_) {} })
  await sleep(4200)

  const label = await page.evaluate(() => {
    const el = document.getElementById('g14s-leg-label')
    const nm = document.getElementById('g14s-leg-name')
    if (!el || !nm) return { exists: false }
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    // mounted level = _bgLeg+1; localStorage was advanced to that value, so the
    // CURRENT plate's level = parseInt(localStorage['dunia-side-bgleg']).
    const lvl = parseInt(localStorage['dunia-side-bgleg'] || '0', 10) || 0
    return {
      exists: true,
      visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0,
      text: (nm.textContent || '').trim(),
      mountedLevel: lvl,
      expected: (typeof TrainJourney !== 'undefined' && TrainJourney) ? TrainJourney.name(lvl) : null,
    }
  })
  await page.screenshot({ path: `${OUT}/leglabel-side.png` })

  const cleanErrors = errors.filter(e => !IGNORE.test(e))
  const ok = label.exists && label.visible && !!label.text && label.text === label.expected && cleanErrors.length === 0
  if (!ok) failed = true
  results.push({ game: 'side', label, errors: cleanErrors, ok })
  await page.close()
}

await browser.close()
console.log(JSON.stringify(results, null, 2))
console.log(failed ? '\n❌ leg-label probe FAILED' : '\n✅ both games: leg label visible + matches TrainJourney.name + journey map dynamic + 0 errors')
process.exit(failed ? 1 : 0)
