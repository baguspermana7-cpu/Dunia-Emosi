// Parallax QA — boots all 4 train games, screenshots BOTH orientations, checks
// depth layers render + counts non-asset console errors. Usage:
//   node tools/qa-parallax.mjs [tag]     tag defaults to 'now' (→ qa-out/px-<game>-<orient>-<tag>.png)
import puppeteer from 'puppeteer'
import fs from 'fs'
const TAG = process.argv[2] || 'now'
const OUT = 'tools/qa-out'; fs.mkdirSync(OUT, { recursive: true })
const IGNORE = /favicon|pokemondb|showdown|net::ERR|Failed to load resource|the server responded|AudioContext|play\(\)|NotAllowedError|autoplay/i
const BASE = 'http://localhost:8081/games/'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const ORIENTS = [[1024, 768, 'land'], [768, 1024, 'port']]

const GAMES = [
  { key: 'g14', file: 'balapan-kereta.html',
    pre: () => { localStorage.setItem('g14-tutorial-seen', '1'); sessionStorage.setItem('g14-hinted', '1'); sessionStorage.setItem('g14Config', JSON.stringify({ level: 3, trainKey: 'aeg_thomas', train: 'aeg_thomas', difficulty: 'easy' })) },
    start: () => { try { const t = (typeof TRAIN_MAP !== 'undefined' && TRAIN_MAP['aeg_thomas']) || null; if (t) { S.trainCfg = { ...t, variant: 1 }; window.selectedTrainKey = t.key } if (typeof startRace === 'function') startRace() } catch (e) {} } },
  { key: 'g15', file: 'lokomotif-pemberani.html',
    pre: () => { localStorage.setItem('g14-tutorial-seen', '1'); sessionStorage.setItem('g15Config', JSON.stringify({ level: 3 })) },
    start: () => { try { if (typeof TRAIN_CATALOG !== 'undefined') selectedTrain = TRAIN_CATALOG[0]; const ts = document.getElementById('train-select'); if (ts) ts.style.display = 'none'; if (typeof initPixi === 'function') initPixi(); } catch (e) {} },
    post: () => { try { gameRunning = true } catch (e) {} } },
  { key: 'g16', file: 'selamatkan-kereta.html',
    pre: () => { sessionStorage.setItem('g16Config', JSON.stringify({ level: 3 })) },
    start: () => { try { if (typeof startGame === 'function') startGame() } catch (e) {} },
    post: () => { try { if (window.S) { S.running = true } } catch (e) {} } },
  { key: 'side', file: 'balapan-kereta-side.html',
    pre: () => { try { localStorage.setItem('g14s-tutorial-seen', '1'); sessionStorage.setItem('g14-side-train', 'aeg_thomas') } catch (e) {} },
    start: () => {},
    post: () => { try { if (window.S) S.running = true; ['tutorial-overlay', 'prerace', 'countdown'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none' }) } catch (e) {} } },
]

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const report = []
for (const g of GAMES) {
  for (const [w, h, orient] of ORIENTS) {
    const page = await browser.newPage()
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
    const errs = []
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    page.on('pageerror', e => errs.push('PE:' + e.message))
    await page.evaluateOnNewDocument(g.pre)
    try { await page.goto(BASE + g.file, { waitUntil: 'domcontentloaded', timeout: 30000 }) } catch (e) { errs.push('GOTO ' + e.message) }
    await sleep(1400)
    await page.evaluate(g.start)
    await sleep(2600)
    if (g.post) await page.evaluate(g.post)
    await sleep(1400)
    // measure whether the backdrop container + layered children exist
    const info = await page.evaluate(() => {
      const out = { stageChildren: 0, backdropBands: 0, sceneryLayers: 0, fgLayers: 0 }
      try { out.stageChildren = (typeof app !== 'undefined' && app.stage) ? app.stage.children.length : 0 } catch (e) {}
      try { out.backdropBands = (typeof g15Backdrop !== 'undefined' && g15Backdrop && g15Backdrop.bands) ? g15Backdrop.bands.length : 0 } catch (e) {}
      try { if (!out.backdropBands && typeof sideBackdrop !== 'undefined' && sideBackdrop && sideBackdrop.bands) out.backdropBands = sideBackdrop.bands.length } catch (e) {}
      try { out.sceneryLayers = (typeof sideScenery !== 'undefined' && sideScenery && sideScenery.container) ? sideScenery.container.children.length : 0 } catch (e) {}
      try { out.fgLayers = (typeof g16Foreground !== 'undefined' && g16Foreground && g16Foreground.children) ? g16Foreground.children.length : 0 } catch (e) {}
      return out
    })
    const fn = `${OUT}/px-${g.key}-${orient}-${TAG}.png`
    await page.screenshot({ path: fn })
    const realErrs = errs.filter(e => !IGNORE.test(e))
    report.push({ game: g.key, orient, ...info, errors: realErrs.length, sample: realErrs.slice(0, 3) })
    await page.close()
  }
}
await browser.close()
console.log(JSON.stringify(report, null, 2))
const bad = report.filter(r => r.errors > 0)
console.log(bad.length ? `\nX ${bad.length} view(s) with console errors` : `\nOK: 0 console errors across ${report.length} views`)
