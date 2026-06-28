// v55.8x — verify the g14 PLAY-ARENA layout + controls redesign:
//  (1) the train (L.player) bottom edge sits ABOVE the #ctrl-area top (no overlap),
//  (2) the character height reads ~1.3-1.6 x laneH (prominent, fills its lane),
//  (3) obstacle size ~0.7-0.95 x laneH (proportional to the lane),
//  (4) all 3 laneYs sit inside the play band [topHUD, controlTop],
//  (5) every control button renders >=48px,
//  (6) 0 console / page errors.
// Boots like verify-v5576-parallax.mjs (sessionStorage g14Config, set S.trainCfg
// from TRAIN_MAP['aeg_thomas'], startRace(), wait out the ~3.8s countdown).
// S / L / laneYs / laneH / G14_UNIFORM_H / OBS_SIZE are LEXICAL globals -> bare names.
import puppeteer from 'puppeteer'
import fs from 'fs'

const OUT = 'tools/qa-out'
fs.mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { w: 1280, h: 720,  label: 'landscape-desktop' },
  { w: 1024, h: 1366, label: 'portrait-tablet' },
  { w: 1024, h: 768,  label: 'landscape-tablet' },
  { w: 390,  h: 800,  label: 'phone-portrait' },
]

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []

for (const vp of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('g14Config', JSON.stringify({ level: 3, trainKey: 'aeg_thomas', train: 'aeg_thomas', difficulty: 'easy' }))
  })
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
  await sleep(4000)   // wait out the 3-2-1-GO countdown, then race runs

  const m = await page.evaluate(() => {
    const out = { ok: true }
    try {
      out.laneYs = (typeof laneYs !== 'undefined') ? laneYs.slice() : null
      out.laneH = (typeof laneH !== 'undefined') ? laneH : null
      out.uniformH = (typeof G14_UNIFORM_H !== 'undefined') ? G14_UNIFORM_H : null
      out.obsSize = (typeof OBS_SIZE !== 'undefined') ? OBS_SIZE : null
      out.sLane = (typeof S !== 'undefined') ? S.lane : null
      // player display bounds (full footprint incl. ground glow → overlap check)
      if (typeof L !== 'undefined' && L.player && !L.player.destroyed) {
        const b = L.player.getBounds()
        out.playerTop = b.y; out.playerBottom = b.y + b.height
        out.playerH = b.height
      }
      // the character sprite alone → honest "character height" vs laneH
      if (typeof L !== 'undefined' && L.playerCharImg && !L.playerCharImg.destroyed) {
        out.charH = L.playerCharImg.getBounds().height
      }
      // control area top in canvas/screen space
      const ctrl = document.getElementById('ctrl-area')
      const cr = ctrl ? ctrl.getBoundingClientRect() : null
      out.ctrlTop = cr ? cr.top : null
      out.ctrlH = cr ? cr.height : null
      // top HUD bottom
      const hud = document.getElementById('hud-top')
      const hr = hud ? hud.getBoundingClientRect() : null
      out.hudBottom = hr ? hr.bottom : null
      // control button sizes
      const btnIds = ['btn-up', 'btn-dn', 'btn-boost', 'btn-pause', 'btn-mute', 'btn-map', 'btn-back']
      out.btns = {}
      for (const id of btnIds) {
        const el = document.getElementById(id)
        if (el) { const r = el.getBoundingClientRect(); out.btns[id] = { w: Math.round(r.width), h: Math.round(r.height) } }
      }
    } catch (e) { out.ok = false; out.err = e.message }
    return out
  })

  await page.screenshot({ path: `${OUT}/g14lay-${vp.w}x${vp.h}.png` })

  // ── assertions ──
  const fails = []
  const cleanErrors = errors.filter(e => !/favicon|Pokedex|pokemondb|showdown|net::ERR|Failed to load resource/i.test(e))
  if (cleanErrors.length) fails.push('console errors: ' + cleanErrors.slice(0, 3).join(' | '))

  if (m.laneYs && m.ctrlTop != null && m.hudBottom != null) {
    for (let i = 0; i < m.laneYs.length; i++) {
      if (m.laneYs[i] < m.hudBottom - 2) fails.push(`lane${i} ${Math.round(m.laneYs[i])} above HUD ${Math.round(m.hudBottom)}`)
      if (m.laneYs[i] > m.ctrlTop + 2) fails.push(`lane${i} ${Math.round(m.laneYs[i])} below ctrlTop ${Math.round(m.ctrlTop)}`)
    }
  } else fails.push('missing lane/ctrl/hud geometry')

  if (m.playerBottom != null && m.ctrlTop != null) {
    if (m.playerBottom > m.ctrlTop + 1) fails.push(`player bottom ${Math.round(m.playerBottom)} overlaps ctrlTop ${Math.round(m.ctrlTop)}`)
  } else fails.push('missing player bounds')

  const charMeasure = m.charH != null ? m.charH : m.playerH
  if (charMeasure != null && m.laneH) {
    const ratio = charMeasure / m.laneH
    if (ratio < 1.3 || ratio > 1.6) fails.push(`char/laneH ratio ${ratio.toFixed(2)} out of [1.3,1.6]`)
  }
  if (m.obsSize != null && m.laneH) {
    const r = m.obsSize / m.laneH
    if (r < 0.68 || r > 0.97) fails.push(`obs/laneH ratio ${r.toFixed(2)} out of [0.68,0.97]`)
  }
  for (const [id, sz] of Object.entries(m.btns || {})) {
    if (Math.min(sz.w, sz.h) < 48) fails.push(`btn ${id} ${sz.w}x${sz.h} < 48px`)
  }

  results.push({
    vp: `${vp.w}x${vp.h} (${vp.label})`,
    laneYs: m.laneYs && m.laneYs.map(Math.round), laneH: m.laneH && Math.round(m.laneH),
    uniformH: m.uniformH, obsSize: m.obsSize, sLane: m.sLane,
    playerH: m.playerH && Math.round(m.playerH),
    charH: m.charH && Math.round(m.charH),
    charRatio: charMeasure && m.laneH ? +(charMeasure / m.laneH).toFixed(2) : null,
    obsRatio: m.obsSize && m.laneH ? +(m.obsSize / m.laneH).toFixed(2) : null,
    playerBottom: m.playerBottom && Math.round(m.playerBottom),
    ctrlTop: m.ctrlTop && Math.round(m.ctrlTop), ctrlH: m.ctrlH && Math.round(m.ctrlH),
    hudBottom: m.hudBottom && Math.round(m.hudBottom),
    btns: Object.fromEntries(Object.entries(m.btns || {}).map(([k, v]) => [k, `${v.w}x${v.h}`])),
    fails,
  })
  await page.close()
}
await browser.close()

console.log(JSON.stringify(results, null, 2))
const bad = results.filter(r => r.fails.length)
console.log(bad.length ? `\n❌ ${bad.length} viewport(s) with layout issues` : '\n✅ g14 play-arena layout verified at all viewports, 0 errors')
process.exit(bad.length ? 1 : 0)
