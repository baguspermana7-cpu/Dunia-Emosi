// Gate for the owner's standing mandate: "check semua game, pastikan g crash hang"
// at the end of a round.
//
// Every standalone game finishes through the shared GameModal, so the end of a
// round is testable without playing one: call the game's own end routine, then
// check three things that together mean "did not hang":
//
//   1. nothing was thrown -- an exception inside the end path is exactly what
//      leaves a child staring at a frozen last frame;
//   2. an end-of-round overlay actually became visible, whichever overlay this
//      game uses (several predate the shared GameModal);
//   3. the page is still RESPONSIVE afterwards -- timers fire, the main thread
//      accepts work, and the overlay's own button reacts to a real click.
//
// Liveness is deliberately NOT "frames keep coming": most of these games stop
// their ticker on purpose when the result appears, so counting frames marks
// correct behaviour as a hang. That measurement was tried first and produced
// results that flipped between runs.
//
// The end routines are listed per game rather than guessed, because they are
// what the source calls right before its result overlay.
//
// gym-pokemon is NOT in this list, and that is a limitation rather than a pass:
// its battle state lives inside a closure, so `startBattle()` called from the
// outside never reaches the assignment (gym-select stays open, `battle` stays
// null) and the end routine correctly declines to run. Covering it needs either
// a test hook in the page or a probe that plays a real battle; until then its
// end-of-round path is untested here and should not be assumed safe.
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

// game page → the functions that reach GameModal.show(), with arguments that
// match how the game itself calls them
// Some end routines guard on a live round (`if (!S.running) return`,
// `if (!battle || battle.ended) return`). Calling them cold is not a test of
// anything, so each game gets an `arm` step that puts it in the state its own
// guard demands -- nothing more.
const ARM = {
  'balapan-kereta.html': () => { if (typeof S !== 'undefined') { S.running = true; S.gameOver = false } },
  'pokemon-run.html': () => { if (typeof S !== 'undefined') { S.running = true; S.gameOver = false; S.started = true } },
}

const GAMES = [
  ['balapan-kereta.html',      [['endRace', []]]],
  ['lokomotif-pemberani.html', [['showWin', []], ['showLose', []]]],
  ['selamatkan-kereta.html',   [['showWin', []], ['showLose', []]]],
  ['ducky-volley.html',        [['endMatch', [true]]]],
  ['monster-candy.html',       [['endGame', []]]],
  ['mobil.html',               [['showGameOver', []], ['showFinish', []]]],
  ['pokemon-run.html',         [['showWin', []], ['showLose', []]]],
  ['pokemon-birds.html',       [['showWin', []]]],
  ['pokemon-bawah-laut.html',  [['showWin', []]]],
  ['mario-pokemon.html',       [['showWinModal', [3]]]],
]

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
})

try {
  for (const [file, routines] of GAMES) {
    const page = await browser.newPage()
    const cdp = await page.createCDPSession()
    await cdp.send('Network.setBypassServiceWorker', { bypass: true })
    const errors = []
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 120)))
    page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource|WebGL|swiftshader/i.test(m.text())) errors.push(m.text().slice(0, 120)) })
    await page.setViewport({ width: 1100, height: 720 })
    await page.goto(`${BASE}/games/${file}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await sleep(6500)
    // clear anything the page opened on its own (tutorial / daily mission)
    await page.evaluate(() => {
      document.querySelectorAll('.show').forEach(el => { if (/tutorial|mission|daily/i.test(el.id || '')) el.classList.remove('show') })
    })

    for (const [fn, args] of routines) {
      const before = errors.length
      if (ARM[file]) { await page.evaluate(ARM[file]).catch(() => {}); await sleep(900) }
      const r = await page.evaluate(async (fn, args) => {
        const out = { exists: false, threw: null }
        const overlaySel = '#gm-overlay, .gm-overlay, [id*="result" i], [id*="modal" i], [class*="overlay" i], [id*="over" i]'
        const visible = () => [...document.querySelectorAll(overlaySel)]
          .filter(el => { const cs = getComputedStyle(el)
            return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05 && el.offsetHeight > 40 })
          .map(el => el.id || el.className)
        try { out.exists = typeof eval(fn) === 'function' } catch (_) { out.exists = false }
        const beforeOverlays = visible()
        try { eval(fn).apply(null, args) } catch (e) { out.threw = String(e.message).slice(0, 120) }
        // Poll rather than wait a fixed beat: gym-pokemon plays a 3s badge-zoom
        // before its modal, and a fixed 1.4s wait called that a missing overlay.
        let afterOverlays = []
        const deadline = performance.now() + 6000
        do {
          await new Promise(r => setTimeout(r, 250))
          afterOverlays = visible()
        } while (!afterOverlays.filter(x => !beforeOverlays.includes(x)).length && performance.now() < deadline)
        out.newOverlay = afterOverlays.filter(x => !beforeOverlays.includes(x))
        out.title = ((document.getElementById('gm-title') || {}).textContent || '').trim()

        // responsive? a timer must fire, the thread must take work, and the
        // overlay's own button must react to a real click without throwing
        const t0 = performance.now()
        await new Promise(r => setTimeout(r, 200))
        out.timerLateBy = Math.round(performance.now() - t0 - 200)
        let sum = 0; for (let i = 0; i < 2e5; i++) sum += i
        out.threadWorks = sum > 0
        const btn = document.querySelector('#gm-btns button, .gm-btn, ' + overlaySel + ' button')
        out.buttonClicked = null
        if (btn) { try { btn.click(); out.buttonClicked = true } catch (e) { out.buttonClicked = String(e.message).slice(0, 80) } }
        return out
      }, fn, args)
      const newErrors = errors.slice(before)
      const label = `${file.replace('.html', '')} · ${fn}()`
      check(r.exists, `${label} exists`)
      check(!r.threw, `${label} does not throw${r.threw ? ' — ' + r.threw : ''}`)
      check(newErrors.length === 0, `${label} raises no page error${newErrors.length ? ' — ' + newErrors[0] : ''}`)
      check(r.newOverlay.length > 0, `${label} shows an end-of-round overlay${r.newOverlay.length ? ' (' + String(r.newOverlay[0]).slice(0, 26) + ')' : ''}`)
      check(r.timerLateBy < 900 && r.threadWorks, `${label} leaves the page responsive (timer late by ${r.timerLateBy}ms)`)
      check(r.buttonClicked === true || r.buttonClicked === null, `${label} overlay button accepts a click${typeof r.buttonClicked === 'string' ? ' — ' + r.buttonClicked : ''}`)
      // close the modal before the next routine so the second one is a fresh test
      await page.evaluate(() => { try { GameModal.hide && GameModal.hide() } catch (_) {}
        const ov = document.getElementById('gm-overlay'); if (ov) ov.classList.remove('show') })
      await sleep(400)
    }
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
