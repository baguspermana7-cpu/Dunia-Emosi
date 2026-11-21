#!/usr/bin/env node
// qa-prd47-bugs — PRD-47 (docs/prd/PRD-47-bug-bash.md): the known bugs stay fixed.
//   B1 Ducky Volley: the background layer has no red/pink stroke in the sky (<= 10 rows hold red: the kite's tail bead) (a beach-ball arc without moveTo drew a
//      line from a stale path point across the whole scene) — counted on the rendered layer at 844x390 and 390x844
//   B2 an achievement toast never covers an answer: while "Bintang Pertama" shows, every G3 choice's centre still
//      hits that choice (elementFromPoint, sampled for the toast's 3.5 s) at 844x390, 390x844, 800x1280
//   B5 the unreachable Gym Huruf (G13c) code is gone and the 13c tile still opens Gym Pokemon
// B3 (MEM-06 fits) is proven by tools/qa-sd-play.mjs, B4 (GT gates) by 5 consecutive green runs of each gate.
// Usage: QA_BASE=http://127.0.0.1:8081 node tools/qa-prd47-bugs.mjs   (B5 runs without QA_BASE too)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
const sleep = ms => new Promise(r => setTimeout(r, ms))
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }

{
  const g = rd('game.js'), ix = rd('index.html')
  const dead = ['g13cBuildLetterSelect', 'g13cStartGym', 'g13cNextLetter'].filter(n => g.includes(n) || ix.includes(n))
  const tile = /id="gtile-13c"[^>]*openGymGame\(\)/.test(ix)
  ok(!dead.length && !ix.includes('id="screen-game13c"') && tile, `B5 G13c dead code: left ${dead.join(',') || 0}, screen-game13c ${ix.includes('id="screen-game13c"')}, tile opens Gym Pokemon ${tile}`)
}

if (process.env.QA_BASE) {
  const { default: puppeteer } = await import('puppeteer')
  const BASE = process.env.QA_BASE.replace(/\/$/, ''), SH = process.env.QA_SHOTS
  if (SH) fs.mkdirSync(SH, { recursive: true })
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const NOISE = /favicon|googleapis|gstatic/i
  // B1
  for (const [w, h] of [[844, 390], [390, 844]]) {
    const c = await b.createBrowserContext(), p = await c.newPage(), errs = []
    p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
    await p.goto(BASE + '/games/ducky-volley.html?nocine=1', { waitUntil: 'load', timeout: 120000 })
    await p.waitForFunction(() => typeof app !== 'undefined' && app && bgLayer && bgLayer.children.length > 0, { timeout: 20000 }).catch(() => {})
    await sleep(800)
    const r = await p.evaluate(() => {
      const vis = app.stage.children.map(c => c.visible)
      app.stage.children.forEach(c => { c.visible = (c === bgLayer) }); app.render()
      const cv = app.renderer.extract.canvas({ target: app.stage, frame: new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height) }), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data
      app.stage.children.forEach((c, i) => { c.visible = vis[i] })
      const sx = cv.width / app.screen.width, skyBottom = (GROUND_Y - 90) * sx
      let n = 0; const rows = new Set()
      for (let y = 0; y < Math.min(cv.height, skyBottom); y++) for (let x = 0; x < cv.width; x++) {
        const i = (y * cv.width + x) * 4, R = d[i], G = d[i + 1], B = d[i + 2]
        if (R > 150 && R - G > 60 && R - B > 50 && Math.abs(G - B) < 45) { n++; rows.add(y) } // red or pink; orange (kite) has G >> B
      }
      return { n, rows: rows.size, url: cv.toDataURL() }
    })
    if (SH) fs.writeFileSync(path.join(SH, `ducky-bg-${w}x${h}.png`), Buffer.from(r.url.split(',')[1], 'base64'))
    // a stray stroke crosses the sky (hundreds of rows); the kite's red tail bead (r 2.5) covers about 5 rows
    ok(r.rows <= 10 && !errs.length, `B1 ${w}x${h}: rows with red/pink in the Ducky sky ${r.rows} (law <= 10; ${r.n} px), errors ${errs.slice(0, 2).join(' | ') || 0}`)
    await c.close()
  }
  // B2
  for (const [w, h] of [[844, 390], [390, 844], [800, 1280]]) {
    const c = await b.createBrowserContext(), p = await c.newPage(), errs = []
    p.on('pageerror', e => { if (!NOISE.test(e.message)) errs.push(e.message) })
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
    await p.evaluateOnNewDocument(() => {
      if (!sessionStorage.__s) {
        localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
        localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
      }
    })
    await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 120000 })
    await p.waitForFunction(() => typeof window.startGameWithLevel === 'function', { timeout: 30000 }).catch(() => {})
    await sleep(600)
    await p.evaluate(() => {
      state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Bima', animal: '🐯', ageTier: 'tumbuh', stars: 0 }]
      state.unlockedAchievements = []; state.mode = 'solo'; state.currentPlayer = 0; state.currentGame = 3; startGameWithLevel(1)
    })
    await p.waitForFunction(() => document.querySelectorAll('#g3-choices .g3-choice-btn').length >= 2, { timeout: 15000 }).catch(() => {})
    // at 844x390 the choices sit below the fold (screen scrolls): scroll down like a child would, then read
    await p.evaluate(() => { const sc = document.querySelector('.screen.active'); if (sc) sc.scrollTop = sc.scrollHeight })
    await sleep(700)
    await p.evaluate(() => addStars(1)) // the first star of the session: the achievement toast fires here, mid-question
    let covered = 0, samples = 0, shot = false
    const t0 = Date.now()
    while (Date.now() - t0 < 3500) {
      const s = await p.evaluate(() => {
        const t = document.getElementById('achievement-toast'), shown = t && t.classList.contains('show')
        let bad = 0
        for (const btn of document.querySelectorAll('#g3-choices .g3-choice-btn')) {
          const r = btn.getBoundingClientRect(); if (!r.width) continue
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          if (r.bottom > innerHeight || r.top < 0) { bad++; continue } // off screen counts as not reachable
          if (!hit || !(hit === btn || btn.contains(hit))) bad++
        }
        return { shown, bad }
      })
      if (s.shown) { samples++; covered += s.bad }
      if (s.shown && !shot && SH && Date.now() - t0 > 600) { await p.screenshot({ path: path.join(SH, `toast-g3-${w}x${h}.png`) }); shot = true }
      await sleep(200)
    }
    ok(samples > 0 && covered === 0 && !errs.length, `B2 ${w}x${h}: toast shown in ${samples} samples, choice centres covered ${covered} times (law 0), errors ${errs.slice(0, 2).join(' | ') || 0}`)
    await c.close()
  }
  await b.close()
}
console.log(`qa-prd47-bugs: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
