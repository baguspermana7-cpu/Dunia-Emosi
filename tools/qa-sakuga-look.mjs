#!/usr/bin/env node
// qa-sakuga-look — PRD-46 law L5, the eyes: freeze the Sakuga clock in the middle of an impact (look.mjs of the library:
// SakugaFX.paused + advance) and screenshot, per page, at 390x844, 844x390 and 800x1280.
//   QA_LOOK='index.html|games/timmy-kapal.html'      pages (default: hub + five games)
//   QA_AT=0.12                                        seconds into the impact
//   QA_ANSWER='games/kuis-matematika.html'            pages where a CHOICE button is tapped instead of a primary one; the game's handler is
//                                                     blocked and the verdict is sent by the tool (QA_VERDICT=wrong for the wobble, else right)
// Writes tools/qa-out/prd46/<page>-<viewport>.png (full viewport) and <page>.png (one sheet: crop + full per viewport).
// Usage: TMPDIR=$HOME/.cache/qa-tmp flock -w 1800 /tmp/claude-1000/kereta-browser.lock timeout 1500 node tools/qa-sakuga-look.mjs
import fs from 'node:fs'
import puppeteer from 'puppeteer'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
const PAGES = (process.env.QA_LOOK || 'index.html|games/timmy-kapal.html|games/kuis-matematika.html|games/gym-pokemon.html|games/stinky-dirty.html').split('|')
const ANSWER = new Set((process.env.QA_ANSWER || 'games/kuis-matematika.html').split('|'))
const AT = +(process.env.QA_AT || 0.12)
const VPS = [['390x844', 390, 844, 2], ['844x390', 844, 390, 2], ['800x1280', 800, 1280, 1]]
const OUT = 'tools/qa-out/prd46'
const PRE = { 'games/kuis-matematika.html': 'MP.startGame(null)' }   // straight to a question: a choice button to tap
fs.mkdirSync(OUT, { recursive: true })
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio', '--disable-audio-output'] })
const log = []
for (const pg of PAGES) {
  const tag = pg.replace('games/', '').replace('.html', '') + (process.env.QA_SUFFIX || '')
  const shots = []
  for (const [name, w, h, dsf] of VPS) {
    const ctx = await b.createBrowserContext(), p = await ctx.newPage()
    await p.setViewport({ width: w, height: h, deviceScaleFactor: dsf, isMobile: true, hasTouch: true })
    const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 120))); p.on('dialog', d => d.dismiss().catch(() => {}))
    if (pg === 'index.html') await p.evaluateOnNewDocument(() => { try { if (!localStorage.getItem('dunia-players')) { localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: 'lion', ageTier: 'cilik' }])); localStorage.setItem('dunia-active-slot', '[0,1]') } } catch (e) {} })
    await p.goto(`${BASE}/${pg}?nocine=1`, { waitUntil: 'load', timeout: 45000 }).catch(e => errs.push(e.message))
    await sleep(3500)
    const pre = process.env.QA_PRE && pg === 'index.html' ? process.env.QA_PRE : PRE[pg]   // QA_PRE="showScreen('screen-menu')" shows the hub's game cards instead of its home
    if (pre) { await p.evaluate(pre).catch(e => errs.push('pre ' + e.message)); await sleep(1500) }
    const answerMode = ANSWER.has(pg)
    if (answerMode) {   // get to a question: tap the plainest forward buttons until a choice button is on screen
      for (let i = 0; i < 10; i++) {
        const has = await p.evaluate(() => !!document.querySelector('.choices .choice, .kq-choice, .tkq-ans button'))
        if (has) break
        const t = await p.evaluate(() => {
          const bad = /pengaturan|setting|suara|sound|mute|kembali|back|tutup|close|profil|reset|orang|parent|toko|buy|shop/i
          for (const e of document.querySelectorAll('button')) {
            const r = e.getBoundingClientRect(); if (r.width < 30 || r.height < 30 || e.disabled || bad.test(e.id + e.className + e.textContent)) continue
            const x = r.left + r.width / 2, y = r.top + r.height / 2; if (y > innerHeight || x > innerWidth || y < 0) continue
            const hit = document.elementFromPoint(x, y); if (hit === e || e.contains(hit)) return { x, y }
          }
          return null
        })
        if (!t) break
        await p.touchscreen.tap(t.x, t.y); await sleep(900)
      }
    }
    const findTarget = () => p.evaluate(answerMode => {
      const OFF = /pengaturan|setting|orang ?tua|parent|suara|sound|music|musik|mute|full ?screen|share|install|reset|hapus|delete|ganti anak|profil|kembali|keluar|rumah|home|back|exit|close|tutup|batal/i
      const pool = answerMode ? [...document.querySelectorAll('.choices .choice, .kq-choice, .tkq-ans button')] : [...document.querySelectorAll('body *')].filter(e => window.DuniaSakuga && e.tagName !== 'CANVAS' && (e.tagName === 'BUTTON' || e.getAttribute('role') === 'button' || getComputedStyle(e).cursor === 'pointer'))
      for (const e of pool) {
        if (e.disabled) continue
        const label = e.id + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.textContent || '').slice(0, 30)   // not the class: `home-btn` is the hub's MAIN SEKARANG
        if (OFF.test(label)) continue
        const r = e.getBoundingClientRect(); if (r.width < 40 || r.height < 30) continue
        const x = r.left + r.width / 2, y = r.top + r.height / 2; if (y > innerHeight || x > innerWidth || y < 0) continue
        const hit = document.elementFromPoint(x, y); if (!hit || (hit !== e && !e.contains(hit))) continue
        if (!answerMode && !['primary', 'tap'].includes(window.DuniaSakuga.classify(e))) continue
        return { x, y, w: r.width, h: r.height, key: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ')[0], cls: window.DuniaSakuga.classify(e) }
      }
      return null
    }, answerMode)
    let target = await findTarget()
    if (!target) { await sleep(3500); target = await findTarget() }   // a splash may still cover the buttons
    if (!target) { log.push(`${tag} ${name}: no target`); await ctx.close(); continue }
    await p.evaluate(dry => {
      window.SakugaFX.paused = true
      if (dry) document.body.addEventListener('click', e => { e.preventDefault(); e.stopPropagation() }, true)
    }, true)
    await p.touchscreen.tap(target.x, target.y)
    if (answerMode) await p.evaluate(ok => window.dispatchEvent(new CustomEvent('dunia:answer', { detail: { type: 'answer', ok } })), process.env.QA_VERDICT !== 'wrong')   // the game's handler is blocked; this is the verdict it would emit
    await p.evaluate(at => { let n = Math.round(at * 60); while (n-- > 0) window.SakugaFX.advance(1 / 60) }, AT)
    await sleep(80)
    const file = `${OUT}/${tag}-${name}.png`
    await p.screenshot({ path: file, captureBeyondViewport: false })   // beyond-viewport capture resizes the page: the core redraws a cleared canvas on 'resize'
    const pad = 150, clip = { x: Math.max(0, target.x - target.w / 2 - pad), y: Math.max(0, target.y - target.h / 2 - pad), width: Math.min(w, target.w + pad * 2), height: Math.min(h, target.h + pad * 2) }
    clip.width = Math.min(clip.width, w - clip.x); clip.height = Math.min(clip.height, h - clip.y)
    const crop = await p.screenshot({ clip, encoding: 'base64', captureBeyondViewport: false })
    const full = fs.readFileSync(file).toString('base64')
    shots.push({ name, crop, full, w, h, key: target.key, cls: target.cls })
    log.push(`${tag} ${name}: ${target.key} [${target.cls}] ${Math.round(target.w)}x${Math.round(target.h)}${errs.length ? ' ERR ' + errs[0] : ''}`)
    await ctx.close()
  }
  if (shots.length) {   // one sheet per page: per viewport a zoomed crop over the full viewport
    const sp = await b.newPage()
    const dataUrl = await sp.evaluate(async shots => {
      const load = d => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + d })
      const cols = []
      for (const s of shots) cols.push({ s, crop: await load(s.crop), full: await load(s.full) })
      const cw = 420, fh = 520, gap = 10
      const colsInfo = cols.map(c => { const ch = Math.min(420, c.crop.height * cw / c.crop.width), fw = Math.min(cw, c.full.width * fh / c.full.height); return { c, ch, fw } })
      const W = colsInfo.length * (cw + gap) + gap, H = 420 + fh + gap * 3 + 40
      const o = document.createElement('canvas'); o.width = W; o.height = H
      const g = o.getContext('2d'); g.fillStyle = '#2b2b30'; g.fillRect(0, 0, W, H); g.font = '13px monospace'
      colsInfo.forEach(({ c, ch, fw }, i) => {
        const x = gap + i * (cw + gap)
        g.fillStyle = '#d0d0d8'; g.fillText(c.s.name + '  ' + c.s.key + ' [' + c.s.cls + ']', x, 16)
        g.drawImage(c.crop, x, 24, cw, ch)
        g.drawImage(c.full, x, 24 + 420 + gap, fw, fh)
      })
      return o.toDataURL('image/png')
    }, shots)
    fs.writeFileSync(`${OUT}/${tag}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'))
    await sp.close()
  }
}
await b.close()
console.log(log.join('\n'))
