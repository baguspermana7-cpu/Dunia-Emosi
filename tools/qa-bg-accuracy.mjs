// qa-bg-accuracy.mjs — A-312 reference-vs-render accuracy harness.
// Renders each generated g14 level in-game, screenshots it, and builds a
// SIDE-BY-SIDE (reference | rendered) + a difference heatmap with an RMSE score,
// so we can tune band-ratios / vtracer params / palette until each level is
// "persis". Pixi FPS is NOT headless-measurable (software-GL ~3fps) — this judges
// VISUAL accuracy, not perf. Outputs tools/qa-out/bg-accuracy-LNN.png.
//
// Usage:  node tools/qa-bg-accuracy.mjs 1-30   |   1,4,7   |   1
import puppeteer from 'puppeteer'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

function parseLevels(arg) {
  const out = []
  for (const part of String(arg || '').split(',')) {
    if (part.includes('-')) { const [a, b] = part.split('-').map(Number); for (let i = a; i <= b; i++) out.push(i) }
    else if (part.trim()) out.push(Number(part))
  }
  return [...new Set(out)].filter(Boolean)
}
const refFor = (lv) => ['png', 'webp', 'jpg', 'jpeg']
  .map(e => `assets/train/bg-ref/level${String(lv).padStart(2, '0')}.${e}`).find(f => fs.existsSync(f))

const levels = parseLevels(process.argv[2] || '1')
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader'] })
const report = []

for (const lv of levels) {
  const ref = refFor(lv)
  const shot = `${OUT}/_render-L${String(lv).padStart(2, '0')}.png`
  const page = await browser.newPage()
  await page.setViewport({ width: 900, height: 600 })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.evaluateOnNewDocument((level) => {
    sessionStorage.setItem('g14Config', JSON.stringify({ level, trainKey: 'aeg_thomas', train: 'aeg_thomas', difficulty: 'easy' }))
  }, lv)
  try {
    await page.goto('http://localhost:8081/games/balapan-kereta.html', { waitUntil: 'networkidle2', timeout: 20000 })
    await new Promise(r => setTimeout(r, 1500))
    await page.evaluate(() => { try { const t = TRAIN_MAP['aeg_thomas']; if (t) { S.trainCfg = { ...t, variant: 1 }; window.selectedTrainKey = t.key } if (typeof startRace === 'function') startRace() } catch (e) {} })
    await new Promise(r => setTimeout(r, 3000))
    await page.screenshot({ path: shot })
  } catch (e) { errors.push('RENDER: ' + e.message) }
  await page.close()

  let score = null
  const combo = `${OUT}/bg-accuracy-L${String(lv).padStart(2, '0')}.png`
  if (ref && fs.existsSync(shot)) {
    try {
      // crop the scenery band of the render (top ~8%..42% of the frame) and the
      // upper band of the reference, normalise to 600x200, score RMSE + montage.
      const rband = `${OUT}/_rband${lv}.png`, gband = `${OUT}/_gband${lv}.png`, diff = `${OUT}/_diff${lv}.png`
      execFileSync('magick', [ref, '-resize', '600x', '-gravity', 'North', '-crop', '600x200+0+0', '+repage', '-resize', '600x200!', rband])
      execFileSync('magick', [shot, '-crop', '900x200+0+50', '+repage', '-resize', '600x200!', gband])
      try { execFileSync('magick', ['compare', '-metric', 'RMSE', rband, gband, diff]) }
      catch (e) { /* compare exits non-zero but writes the diff + prints score to stderr */ score = (e.stderr || '').toString().trim() }
      execFileSync('magick', ['montage', '-tile', '3x1', '-geometry', '+4+4', '-background', '#222',
        '-label', 'REFERENCE', rband, '-label', 'RENDERED', gband, '-label', 'DIFF', diff, combo])
      for (const f of [rband, gband, diff]) { try { fs.unlinkSync(f) } catch (_) {} }
    } catch (e) { score = 'compare-failed: ' + e.message }
  }
  report.push({ lv, ref: !!ref, score, errors: errors.filter(e => !/favicon|Pokedex|pokemondb|showdown|net::ERR_FILE/i.test(e)), montage: ref ? combo : null })
}
await browser.close()
console.log(JSON.stringify(report, null, 2))
const missing = report.filter(r => !r.ref)
if (missing.length) console.log(`\n(${missing.length} level(s) have no reference image yet in assets/train/bg-ref/)`)
