#!/usr/bin/env node
// qa-prd58b-feel — PRD-58 gelombang 58B (docs/prd/PRD-58-kembangkan-dan-sempurnakan.md): how a game feels.
//   B1 a wrong answer shakes the screen: after flashScreen('red') the active screen runs screenShake (the later
//      `.screen.active{animation:screenIn}` rule used to win, so the shake never played); with reduced motion the
//      shake has no visible duration.
// Usage: QA_BASE=http://127.0.0.1:8089 node tools/qa-prd58b-feel.mjs
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const { default: puppeteer } = await import('puppeteer')
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const errs = []
try {
  for (const reduce of [false, true]) {
    const p = await b.newPage()
    p.on('pageerror', e => errs.push(String(e).slice(0, 160)))
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }])
    await p.evaluateOnNewDocument(() => {
      if (sessionStorage.getItem('__qa58b')) return
      sessionStorage.setItem('__qa58b', '1'); localStorage.clear(); localStorage.setItem('dunia-emosi-sound', 'off')
      localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
      localStorage.setItem('dunia-active-slot', '[0]')
    })
    await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 120000 })
    await p.waitForFunction(() => typeof window.flashScreen === 'function' && document.querySelector('.screen.active'), { timeout: 60000 })
    for (const target of [null, 'screen-game3', 'screen-game10']) {
    const r = await p.evaluate(async target => {
      if (target) { try { showScreen(target) } catch (e) {} }
      const scr = document.querySelector('.screen.active')
      await new Promise(r => setTimeout(r, 600))   // let the screen's own entrance finish
      flashScreen('red')
      const cs = getComputedStyle(scr)
      const name = cs.animationName, dur = parseFloat(cs.animationDuration) * (cs.animationDuration.endsWith('ms') ? 1 : 1000)
      // read the shake at fixed points of its own timeline (20 % and 40 % = the -8 / +8 px keyframes). Sampling a few
      // animation frames was speed-dependent: on a slow CI runner 8 frames ran past the 400 ms shake and read 0 px.
      let moved = 0
      const an = scr.getAnimations().find(a => a.animationName === 'screenShake')
      if (an) {
        an.pause()
        for (const f of [0.2, 0.4]) {
          an.currentTime = dur * f
          moved = Math.max(moved, Math.abs(new DOMMatrix(getComputedStyle(scr).transform).m41))
        }
        an.finish()
      }
      return { id: scr.id, name, dur, moved: Math.round(moved * 10) / 10 }
    }, target)
    if (!reduce) ok(r.name === 'screenShake' && r.moved >= 2, `B1 wrong answer on #${r.id}: animation "${r.name}" ${r.dur} ms, screen moved ${r.moved} px sideways (want screenShake, >= 2 px)`)
    else ok(r.moved < 0.5, `B1 reduced motion on #${r.id}: animation "${r.name}" ${r.dur} ms, screen moved ${r.moved} px (want < 0.5)`)
    }
    // B6 decorative particles: none under reduced motion, some without
    const parts = await p.evaluate(() => {
      document.querySelectorAll('.g-confetti-burst,.sparkle').forEach(e => e.remove())
      try { spawnCorrectConfetti(); spawnSparkles(null, 5) } catch (e) { return -1 }
      return document.querySelectorAll('.g-confetti-burst,.sparkle').length
    })
    ok(reduce ? parts === 0 : parts > 0, `B6 hub ${reduce ? 'reduced motion' : 'normal'}: ${parts} confetti/sparkle nodes after a right answer (want ${reduce ? '0' : '> 0'})`)
    await p.close()
    // B6 Mario: the body shake class only without reduced motion
    const m = await b.newPage()
    m.on('pageerror', e => errs.push(String(e).slice(0, 160)))
    await m.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true })
    await m.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }])
    await m.goto(BASE + '/games/mario-pokemon.html', { waitUntil: 'load', timeout: 120000 })
    await m.waitForFunction(() => typeof window.screenShake === 'function', { timeout: 60000 })
    const shook = await m.evaluate(() => { screenShake(); return document.body.classList.contains('shake') })
    ok(shook === !reduce, `B6 mario ${reduce ? 'reduced motion' : 'normal'}: body shakes ${shook} (want ${!reduce})`)
    await m.close()
  }
  // B4 hub: a level won with >= 3 stars plays VFX.Moment.celebrate
  {
    const p = await b.newPage()
    p.on('pageerror', e => errs.push(String(e).slice(0, 160)))
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
    await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 120000 })
    await p.waitForFunction(() => typeof window.showResult === 'function', { timeout: 60000 })
    const ready = await p.waitForFunction(() => window.VFX && VFX.Moment && VFX.Moment.ready(), { timeout: 20000 }).then(() => true, () => false)
    await p.evaluate(() => {
      window.__cel = 0; if (window.VFX && VFX.Moment) { const o = VFX.Moment.celebrate; VFX.Moment.celebrate = function () { window.__cel++; return o.apply(this, arguments) } }
      state.currentGame = 3; state.selectedLevelNum = 4; state.mode = 'solo'; state._showingResult = false; state.gameStars = [3, 0]; state.maxPossibleStars = 3
      showResult('⭐', 'qa', 'qa')
    })
    const cel = await p.waitForFunction(() => window.__cel > 0, { timeout: 5000 }).then(() => true, () => false)
    ok(ready && cel, `B4 hub: VFX.Moment ready ${ready}, a won level calls celebrate ${cel}`)
    await p.close()
  }
  // B4 arcade pages: the shared DuniaWin loader really draws the moment, and each page's win path asks for it
  for (const [f, fn] of [['ducky-volley', 'if (won)'], ['pokemon-birds', 'S.level % 10 !== 0'], ['mario-pokemon', 'function onWin'], ['monster-candy', 'stars >= 1'], ['pokemon-run', 'S.level % 10 !== 0']]) {
    const p = await b.newPage()
    p.on('pageerror', e => errs.push(f + ': ' + String(e).slice(0, 160)))
    await p.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true })
    await p.goto(BASE + '/games/' + f + '.html', { waitUntil: 'load', timeout: 120000 })
    const has = await p.waitForFunction(() => window.DuniaWin && window.VFX, { timeout: 30000 }).then(() => true, () => false)
    await p.evaluate(() => { try { DuniaWin.celebrate() } catch (e) {} })
    const live = await p.waitForFunction(() => window.VFX && VFX.Moment && VFX.Moment.ready() && (VFX.liveCount() > 0 || VFX.Moment.live() > 0), { timeout: 10000, polling: 50 }).then(() => true, () => false)
    const src = (await import('node:fs')).readFileSync(new URL('../games/' + f + '.html', import.meta.url), 'utf8')
    const wired = src.split('\n').some(l => l.includes(fn) && l.includes('DuniaWin.celebrate()')) || (f === 'mario-pokemon' && /function onWin\(\) \{[\s\S]{0,120}DuniaWin\.celebrate\(\)/.test(src))
    ok(has && live && wired, `B4 ${f}: DuniaWin loaded ${has}, moment drawn ${live}, win path calls it ${wired}`)
    await p.close()
  }
  // B6 ducky / monster-candy shake their PIXI stage from JS: the guard has to sit on the line that starts the shake
  const fs = await import('node:fs')
  const duck = fs.readFileSync(new URL('../games/ducky-volley.html', import.meta.url), 'utf8')
  const candy = fs.readFileSync(new URL('../games/monster-candy.html', import.meta.url), 'utf8')
  ok(/if\(!_reducedMotion\) S\.shakeTimer=10/.test(duck) && !/^\s*S\.shakeTimer=10/m.test(duck), 'B6 ducky: every shake start is guarded by _reducedMotion')
  ok(/S\.combo >= 5 && !_candyReducedMotion/.test(candy), 'B6 monster-candy: the combo shake is guarded by _candyReducedMotion')
  ok(!errs.length, `page errors ${errs.length} ${errs.slice(0, 2).join(' | ')}`)
} finally { await b.close() }
console.log(`qa-prd58b-feel: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
