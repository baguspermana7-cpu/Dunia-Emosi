#!/usr/bin/env node
// qa-prd37-juice — PRD-37 (docs/prd/PRD-37-juice-bersama.md): shared hit-stop, combo meter, celebration.
//   static : G10 + G13 (game.js, hub loads hit-feel.js), G21 Mario Pokemon, G25 Kuis Matematika wire HitFeel;
//            Kuis and Ayo Berhitung wire ComboMeter; Kuis and Ayo Berhitung celebrate a won level/page (VFX.Moment)
//   browser (QA_BASE set), Kuis Matematika at 390x844, 844x390, 800x1280:
//   L1 a right answer lands the attack: HitFeel holds 60-120 ms (asked) and, while it holds, no animation on the page
//      runs (the game screen stops), then everything plays on
//   L2 three right answers in a row show the combo pill "COMBO x3" on screen; a wrong one hides it
//   L3 prefers-reduced-motion: no hold, no flash or squash, no pill bump; the combo number still shows x3
//   L4 0 page errors; screenshots of the hit moment with the combo (QA_SHOTS=dir)
// Usage: node tools/qa-prd37-juice.mjs (static part)  |  QA_BASE=http://127.0.0.1:8081 node tools/qa-prd37-juice.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }

ok(fs.existsSync(path.join(ROOT, 'games/data/hit-feel.js')) && fs.existsSync(path.join(ROOT, 'games/data/combo-meter.js')), 'static: games/data/hit-feel.js and combo-meter.js exist')
{
  const idx = rd('index.html'), g = rd('game.js'), mario = rd('games/mario-pokemon.html'), kuis = rd('games/kuis-matematika.html'), ayo = rd('games/ayo-berhitung.html')
  const n = (s, re) => (s.match(re) || []).length
  ok(/src="games\/data\/hit-feel\.js\?v=/.test(idx) && n(g, /HitFeel\.hit\(/g) >= 3, `static: hub loads hit-feel.js and G10/G13 call HitFeel.hit (${n(g, /HitFeel\.hit\(/g)} calls)`)
  ok(/src="data\/hit-feel\.js\?v=/.test(mario) && /HitFeel\.stop\(/.test(mario) && /HitFeel\.frozen\(\)/.test(mario), 'static: G21 Mario Pokemon holds its loop on a stomp')
  ok(/src="data\/hit-feel\.js\?v=/.test(kuis) && /HitFeel\.hit\(/.test(kuis) && /ComboMeter\.create\(/.test(kuis) && /VFX\.Moment\.celebrate\(/.test(kuis), 'static: Kuis wires HitFeel, ComboMeter and the win celebration')
  ok(/src="data\/combo-meter\.js\?v=/.test(ayo) && /ComboMeter\.create\(/.test(ayo) && /\.celebrate\(/.test(ayo), 'static: Ayo Berhitung wires ComboMeter and the page celebration')
}

if (process.env.QA_BASE) {
  const { default: puppeteer } = await import('puppeteer')
  const BASE = process.env.QA_BASE.replace(/\/$/, ''), SH = process.env.QA_SHOTS
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
  const errs = []
  const runs = [[390, 844, false], [844, 390, false], [800, 1280, false], [390, 844, true]]
  for (const [w, h, rm] of runs) {
    const tag = `${w}x${h}${rm ? ' reduced-motion' : ''}`
    const c = await b.createBrowserContext(), p = await c.newPage()
    p.on('pageerror', e => errs.push(e.message))
    await p.setViewport({ width: w, height: h, isMobile: true, hasTouch: true })
    if (rm) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await p.evaluateOnNewDocument(() => {
      if (sessionStorage.__s) return
      localStorage.clear(); localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0,1]'); localStorage.setItem('dunia-emosi-sound', 'off'); sessionStorage.__s = 1
    })
    await p.goto(BASE + '/games/kuis-matematika.html?nocine=1', { waitUntil: 'load', timeout: 60000 }); await sleep(1200)
    const has = await p.evaluate(() => !!(window.HitFeel && window.ComboMeter))
    if (!has) { ok(false, `browser ${tag}: HitFeel and ComboMeter load on Kuis`); await c.close(); continue }
    await p.evaluate(() => window.__g25.startLevel(1))
    const tapAnswer = async right => {
      await p.waitForFunction(() => document.querySelectorAll('#choices button:not([disabled])').length > 1, { timeout: 15000 }).catch(() => {})
      await sleep(300)
      const cur = await p.evaluate(() => window.__g25.current())
      const btns = await p.$$('#choices button'), labels = await Promise.all(btns.map(x => x.evaluate(e => e.textContent.trim())))
      const i = right ? labels.findIndex(l => l === String(cur.ans)) : labels.findIndex(l => l !== String(cur.ans))
      // watch the hold from inside the page: while HitFeel.frozen(), count running animations
      await p.evaluate(() => {
        window.__hold = { frozenSamples: 0, runningWhileFrozen: 0, playedAfter: false }
        const t0 = performance.now()
        const tick = () => {
          const fz = HitFeel.frozen()
          if (fz) { window.__hold.frozenSamples++; window.__hold.runningWhileFrozen += document.getAnimations().filter(a => a.playState === 'running').length }
          if (!fz && window.__hold.frozenSamples && document.getAnimations().some(a => a.playState === 'running')) window.__hold.playedAfter = true
          if (performance.now() - t0 < 1500) setTimeout(tick, 4)
        }
        tick()
      })
      const r = await btns[i].boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2)
      await sleep(rm ? 700 : 520)
      const st = await p.evaluate(() => ({ hold: window.__hold, log: HitFeel.log.slice(), pill: (() => { const e = document.querySelector('.combo-meter'); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { on: e.classList.contains('on'), text: e.textContent, anim: cs.animationName, inView: r.top >= 0 && r.bottom <= innerHeight && r.width > 40 } })() }))
      return st
    }
    const s1 = await tapAnswer(true)
    await sleep(2400)
    await tapAnswer(true); await sleep(2400)
    const s3 = await tapAnswer(true)
    if (SH) { try { fs.mkdirSync(SH, { recursive: true }); await p.screenshot({ path: path.join(SH, `juice-${w}x${h}${rm ? '-rm' : ''}.png`) }) } catch (e) {} }
    await sleep(2400)
    const sw = await tapAnswer(false)
    if (!rm) {
      const held = s1.log.map(x => x.ms)
      ok(held.length >= 1 && held.every(ms => ms >= 60 && ms <= 120 + 40) && s1.hold.frozenSamples >= 1 && s1.hold.runningWhileFrozen === 0 && s1.hold.playedAfter,
        `L1 ${tag}: the hit holds ${held.join('/') || 'never'} ms (law 60-120 asked; timer slop under load <= 40), ${s1.hold.frozenSamples} samples inside the hold with ${s1.hold.runningWhileFrozen} running animations, animations play on after it: ${s1.hold.playedAfter}`)
      ok(s3.pill && s3.pill.on && /COMBO\s*x3/.test(s3.pill.text) && s3.pill.inView, `L2 ${tag}: three right in a row show "${s3.pill && s3.pill.text}" on screen (${JSON.stringify(s3.pill)})`)
      ok(sw.pill && !sw.pill.on, `L2 ${tag}: a wrong answer hides the combo (on=${sw.pill && sw.pill.on})`)
    } else {
      ok(s3.log.length === 0 && s3.hold.frozenSamples === 0, `L3 ${tag}: no hold at all (${s3.log.length} holds, ${s3.hold.frozenSamples} frozen samples)`)
      ok(s3.pill && s3.pill.on && /COMBO\s*x3/.test(s3.pill.text) && s3.pill.anim === 'none', `L3 ${tag}: the combo number still shows "${s3.pill && s3.pill.text}", without the bump (${s3.pill && s3.pill.anim})`)
    }
    await c.close()
  }
  ok(!errs.length, 'L4 no page errors: ' + errs.slice(0, 3).join(' | '))
  await b.close()
}
console.log(`qa-prd37-juice: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
