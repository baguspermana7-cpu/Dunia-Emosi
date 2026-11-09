#!/usr/bin/env node
// qa-index-contrast — every piece of text on the index's dark setup screens (mode, names) is readable: WCAG contrast
// >= 3:1 between the text colour and the background actually rendered under it (the element's box screenshotted with
// its own text made transparent, median pixel). Built 2026-11-09 after the mode cards showed #292524 titles on a dark
// card and the names panel white labels on a white card (a dark-theme block losing to the light one).
// Usage: BASE=http://127.0.0.1:8097/ node tools/qa-index-contrast.mjs
import puppeteer from 'puppeteer'
import sharp from 'sharp'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const BASE = process.env.BASE || 'http://localhost:8090/Dunia-Emosi/'
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
let pass = 0, fail = 0
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 120)))
await p.goto(BASE + 'index.html?nocine=1', { waitUntil: 'load' }); await sleep(2500)
for (const [id, pre] of [['screen-mode', null], ['screen-names', 'solo'], ['screen-names', 'duo']]) {
  await p.evaluate((id, pre) => { if (pre) { try { selectMode(pre) } catch (e) {} } showScreen(id) }, id, pre)
  await sleep(1300)
  // every element with its own visible text inside the screen
  const els = await p.evaluate(id => {
    const out = [], scr = document.getElementById(id)
    scr.querySelectorAll('*').forEach((el, i) => {
      if (!el.offsetParent) return
      const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('')
      if (!txt || /^[\s\p{P}\p{S}]*$/u.test(txt)) return
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
      if (r.width < 4 || r.height < 4 || r.top > innerHeight || r.bottom < 0 || cs.visibility === 'hidden' || +cs.opacity < 0.1) return
      el.setAttribute('data-qa-c', i)
      out.push({ i, txt: txt.slice(0, 28), color: cs.color, x: r.left, y: r.top, w: r.width, h: r.height })
    })
    return out
  }, id)
  for (const e of els) {
    await p.evaluate(i => { const el = document.querySelector(`[data-qa-c="${i}"]`); el.dataset.qaColor = el.style.color; el.style.setProperty('color', 'transparent', 'important'); el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important') }, e.i)
    const clip = { x: Math.max(0, e.x), y: Math.max(0, e.y), width: Math.min(e.w, 390 - Math.max(0, e.x)), height: Math.min(e.h, 844 - Math.max(0, e.y)) }
    const shot = await p.screenshot({ clip })
    await p.evaluate(i => { const el = document.querySelector(`[data-qa-c="${i}"]`); el.style.color = el.dataset.qaColor; el.style.removeProperty('-webkit-text-fill-color') }, e.i)
    const { data } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const px = []; for (let k = 0; k < data.length; k += 3) px.push([data[k], data[k + 1], data[k + 2]])
    px.sort((a, c) => L(a) - L(c)); const bg = px[px.length >> 1]
    const m = e.color.match(/[\d.]+/g).map(Number), fg = [m[0], m[1], m[2]], a = m[3] == null ? 1 : m[3]
    const fgOver = fg.map((v, k) => v * a + bg[k] * (1 - a))
    const r = ratio(fgOver, bg)
    if (r >= 3) pass++
    else { fail++; console.log(`  ✗ ${id}${pre ? '/' + pre : ''} "${e.txt}" contrast ${r.toFixed(2)} (text ${fgOver.map(Math.round)} on ${bg})`) }
  }
}
if (errs.length) { fail++; console.log('  ✗ page errors', errs.slice(0, 2).join(' | ')) }
await b.close()
console.log(`qa-index-contrast: ${pass}/${pass + fail} text elements readable`)
process.exit(fail ? 1 : 0)
