#!/usr/bin/env node
// qa-drawn-outline — PRD-36. Owner rule: no white sticker outline on any sprite or icon. tools/white-outline.py (PRD-27)
// reads sprite FILES; this reads what the code DRAWS: Pixi vectors and CSS filters, which no file scan can see.
//   site 1  games/balapan-kereta.html  every OBS_ART_DRAW icon (g14ObstacleArt) drawn alone on mid-grey: count the
//           near-white pixels (all channels >= 235) in the outer 3 px ring of the icon's alpha (render scale 2.5, so the
//           ring is the 2-unit dark contour; the icon's own white fill, e.g. the snowman, lies deeper than that)
//   site 2  games/battle-arena.js      the .ba-outline filter (gym-pokemon + battle-modes fighters): a dark disc sprite
//           on mid-grey, near-white pixels in the 3 px ring around the disc
// Self-check first: a disc with a planted 2 px white rim must count > 0 and the same disc without it 0, so a blind counter
// cannot pass. Red = any real site > 0.
//   QA_BASE=http://localhost:8081 node tools/qa-drawn-outline.mjs  (run-gates sets it; QA_BALAPAN_PAGE=/path overrides the page, for red proofs)
import puppeteer from 'puppeteer'

const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const RING = 3, WHITE = 235

// runs in the page: near-white count in the outer RING px of the alpha of an RGBA canvas, composited on mid-grey
const COUNT_FN = `
(function (cv, RING, WHITE) {
  const w = cv.width, h = cv.height, P = RING + 2, W2 = w + 2 * P, H2 = h + 2 * P
  const cx = document.createElement('canvas'); cx.width = W2; cx.height = H2
  const c = cx.getContext('2d'); c.drawImage(cv, P, P)
  const d = c.getImageData(0, 0, W2, H2).data
  let mask = new Uint8Array(W2 * H2)
  for (let i = 0; i < W2 * H2; i++) mask[i] = d[i * 4 + 3] >= 128 ? 1 : 0
  let area = 0; for (let i = 0; i < mask.length; i++) area += mask[i]
  let er = mask
  for (let k = 0; k < RING; k++) {
    const nx = new Uint8Array(W2 * H2)
    for (let y = 1; y < H2 - 1; y++) for (let x = 1; x < W2 - 1; x++) {
      const i = y * W2 + x
      if (er[i] && er[i-1] && er[i+1] && er[i-W2] && er[i+W2] && er[i-W2-1] && er[i-W2+1] && er[i+W2-1] && er[i+W2+1]) nx[i] = 1
    }
    er = nx
  }
  let ring = 0, white = 0
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || er[i]) continue
    ring++
    const a = d[i*4+3] / 255
    const r = d[i*4] * a + 128 * (1 - a), g = d[i*4+1] * a + 128 * (1 - a), b = d[i*4+2] * a + 128 * (1 - a)
    if (r >= WHITE && g >= WHITE && b >= WHITE) white++
  }
  return { area, ring, white }
})`

const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const fails = []
const log = (...a) => console.log(...a)
try {
  // ---- self-check: planted rim must be seen, clean disc must not ----
  const pg = await b.newPage()
  await pg.setViewport({ width: 400, height: 400 })
  const self = await pg.evaluate((fnSrc, RING, WHITE) => {
    const fn = eval(fnSrc)
    const mk = rim => { const c = document.createElement('canvas'); c.width = c.height = 100; const x = c.getContext('2d')
      if (rim) { x.fillStyle = '#fff'; x.beginPath(); x.arc(50, 50, 42, 0, 7); x.fill() }
      x.fillStyle = '#3a3a3a'; x.beginPath(); x.arc(50, 50, 40, 0, 7); x.fill(); return c }
    return { clean: fn(mk(false), RING, WHITE), rimmed: fn(mk(true), RING, WHITE) }
  }, COUNT_FN, RING, WHITE)
  log(`self-check: disc without rim near-white=${self.clean.white} (ring ${self.clean.ring}); with 2 px white rim near-white=${self.rimmed.white}`)
  if (self.clean.white !== 0 || self.rimmed.white <= 0) { fails.push('self-check: counter cannot tell a rim from none'); }
  await pg.close()

  // ---- site 1: balapan obstacle icons ----
  const p1 = await b.newPage()
  await p1.setViewport({ width: 390, height: 844 })
  const errs = []
  p1.on('pageerror', e => errs.push(e.message))
  await p1.goto(BASE + (process.env.QA_BALAPAN_PAGE || '/games/balapan-kereta.html'), { waitUntil: 'domcontentloaded', timeout: 45000 })
  await p1.waitForFunction(() => typeof OBS_ART_DRAW !== 'undefined' && typeof g14ObstacleArt === 'function' && typeof PIXI !== 'undefined', { timeout: 30000 })
  const r1 = await p1.evaluate(async (fnSrc, RING, WHITE) => {
    const fn = eval(fnSrc)
    const rd = await PIXI.autoDetectRenderer({ width: 200, height: 200, backgroundAlpha: 0, antialias: true })
    const out = {}
    const emojiFor = {}
    for (const e in OBS_ART_KIND) if (!(OBS_ART_KIND[e] in emojiFor)) emojiFor[OBS_ART_KIND[e]] = e
    for (const kind of Object.keys(OBS_ART_DRAW)) {
      const holder = g14ObstacleArt(emojiFor[kind] || '', 44)   // the 44-unit authoring box, drawn at 2.5x below
      const cv = rd.extract.canvas({ target: holder, resolution: 2.5 })
      out[kind] = fn(cv, RING, WHITE)
      holder.destroy({ children: true })
    }
    rd.destroy()
    return { kinds: out, authored: Object.keys(OBS_ART_DRAW).length }
  }, COUNT_FN, RING, WHITE)
  let tot1 = 0, bad1 = []
  for (const [k, v] of Object.entries(r1.kinds)) {
    if (!v.area || !v.ring) { fails.push(`balapan ${k}: nothing rendered (area ${v.area}, ring ${v.ring})`); continue }
    tot1 += v.white
    if (v.white) bad1.push(`${k}=${v.white}`)
  }
  log(`site 1 balapan-kereta obstacle icons: ${r1.authored} kinds rendered, near-white ring pixels total=${tot1}${bad1.length ? ' (' + bad1.join(' ') + ')' : ''}`)
  if (tot1) fails.push(`balapan-kereta: ${bad1.length} obstacle icon(s) carry a white rim, ${tot1} px`)
  if (errs.length) fails.push('balapan page errors: ' + errs.slice(0, 2).join(' | '))
  await p1.close()

  // ---- site 2: battle-arena .ba-outline (real CSS, real <img>, screenshot) ----
  const p2 = await b.newPage()
  await p2.setViewport({ width: 400, height: 400, deviceScaleFactor: 1 })
  await p2.setContent('<!doctype html><body style="margin:0;background:#808080"></body>')
  await p2.addScriptTag({ url: BASE + (process.env.QA_ARENA_JS || '/games/battle-arena.js') })
  const has = await p2.evaluate(() => typeof BattleArena === 'object' && typeof BattleArena.injectCSS === 'function')
  if (!has) { fails.push('battle-arena.js: BattleArena global missing') } else {
    const shot = await p2.evaluate(async () => {
      BattleArena.injectCSS()   // the .ba-* stylesheet
      const c = document.createElement('canvas'); c.width = c.height = 120
      const x = c.getContext('2d'); x.fillStyle = '#3a3a3a'; x.beginPath(); x.arc(60, 60, 40, 0, 7); x.fill()
      const im = document.createElement('img'); im.className = 'ba-sprite ba-outline'
      im.style.cssText = 'position:fixed;left:100px;top:100px;width:120px;height:120px;max-width:none;object-fit:fill'
      await new Promise(r => { im.onload = r; im.src = c.toDataURL() }); document.body.appendChild(im)
      return null
    }).catch(e => 'ERR ' + e.message)
    if (shot) fails.push('battle-arena: ' + shot)
    const png = await p2.screenshot({ clip: { x: 100, y: 100, width: 120, height: 120 }, encoding: 'base64' })
    const r2 = await p2.evaluate(async (b64, fnSrc, RING, WHITE) => {
      // the ring is measured on the DISC's own alpha: rebuild the source disc mask, test the screenshot around it
      const img = new Image(); await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64 })
      const cv = document.createElement('canvas'); cv.width = cv.height = 120; const c = cv.getContext('2d'); c.drawImage(img, 0, 0)
      const d = c.getImageData(0, 0, 120, 120).data
      let white = 0, ring = 0
      for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) {
        const dist = Math.hypot(x + 0.5 - 60, y + 0.5 - 60)
        if (dist < 40 || dist > 40 + RING + 0.5) continue
        ring++
        const i = (y * 120 + x) * 4
        if (d[i] >= WHITE && d[i+1] >= WHITE && d[i+2] >= WHITE) white++
      }
      return { ring, white }
    }, png, COUNT_FN, RING, WHITE)
    log(`site 2 battle-arena .ba-outline: ring ${r2.ring} px around a dark disc, near-white=${r2.white}`)
    if (r2.white) fails.push(`battle-arena .ba-outline: ${r2.white} near-white px in the ring around the sprite`)
  }
  await p2.close()
} catch (e) {
  fails.push('gate error: ' + (e && e.message))
} finally {
  await b.close()
}
if (fails.length) { for (const f of fails) log('FAIL ' + f); log('qa-drawn-outline: FAIL'); process.exit(1) }
log('qa-drawn-outline: ok')
