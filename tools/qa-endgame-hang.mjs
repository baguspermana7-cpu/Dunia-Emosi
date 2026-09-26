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
// gym-pokemon needed a seam to be testable at all, and the reason is worth
// keeping: `startBattle` is wrapped twice on DOMContentLoaded (weather/music,
// then the Adventure/PvP/Tournament chooser), and because a top-level function
// declaration IS a window property, those wrappers replace the name itself --
// so calling it from a test opened a modal instead of starting a fight. The
// page now captures the raw function before the wrappers install and exposes it
// as `window.__g13c.startBattleRaw`, which is what this gate arms with.
import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE || 'http://localhost:8081'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const fails = []
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails.push(msg) }

// game page → the functions that reach GameModal.show(), with arguments that
// match how the game itself calls them
const ARM_GYM = () => {
  // choose a team (the game opens on its pack picker), then stand a battle up
  // through the seam -- the wrapped startBattle would only open a mode modal
  try {
    const card = document.querySelector('#pkg-overlay .pkg-card[data-unlocked="1"]')
    if (card) card.click()
    const ov = document.getElementById('pkg-overlay')
    if (ov) ov.style.display = 'none'
    if (window.__g13c && !window.__g13c.battle) window.__g13c.startBattleRaw(window.__g13c.TRAINERS[0].id)
    else if (window.__g13c && window.__g13c.battle) window.__g13c.battle.ended = false
  } catch (_) {}
}

// Some end routines guard on a live round (`if (!S.running) return`,
// `if (!battle || battle.ended) return`). Calling them cold is not a test of
// anything, so each game gets an `arm` step that puts it in the state its own
// guard demands -- nothing more.
const ARM = {
  'balapan-kereta.html': () => { if (typeof S !== 'undefined') { S.running = true; S.gameOver = false } },
  'pokemon-run.html': () => { if (typeof S !== 'undefined') { S.running = true; S.gameOver = false; S.started = true } },
  // G15 must be really RUNNING for its end routines to mean anything: the
  // ticker assertion below reads app.ticker, which does not exist until
  // initPixi has built the stage. Calling showWin() on a cold page tested
  // almost nothing and the ticker check came back null.
  'lokomotif-pemberani.html': () => {
    if (typeof gameRunning !== 'undefined' && gameRunning) return
    try {
      selectedTrain = TRAIN_CATALOG.find(t => String(t.key).startsWith('mex_')) ||
                      TRAIN_CATALOG.find(t => t.isCharacter) || TRAIN_CATALOG[0]
      const sel = document.getElementById('train-select'); if (sel) sel.style.display = 'none'
      initPixi()
    } catch (_) {}
  },
  'gym-pokemon.html': ARM_GYM,
  // finish() returns immediately unless a level is actually running, so the
  // ending can only be tested from a started level.
  'kuis-matematika.html': () => {
    try { if (!window.__g25.inProgress()) window.__g25.startLevel(1) } catch (_) {}
  },
  // G27: the ending is the celebration screen that opens when a word is
  // spelled, so a word has to be in progress first.
  'ejaan-inggris.html': () => {
    try { const s = window.__g27.state(); if (!s.word || s.solved) window.__g27.startWord('blue') } catch (_) {}
  },
}

// The list is the INVENTORY of games with an end routine, not the list of games
// the owner has complained about: the untested pages are the ones nobody looked
// at, so they are where the defects actually sit. balapan-kereta-side and
// kuis-matematika were added 2026-09-22 for that reason.
// ayo-berhitung is deliberately absent: a finished page there is a toast and a
// fanfare, with no overlay and no ticker, so none of this gate's assertions
// would mean anything on it.
const GAMES = [
  ['balapan-kereta.html',      [['endRace', []]]],
  ['balapan-kereta-side.html', [['endRace', ['Menang!', 'win']], ['endRace', ['Kalah', 'lose']]]],
  ['kuis-matematika.html',     [['__g25.finishWin', []], ['__g25.finishLose', []]]],
  ['ejaan-inggris.html',       [['__g27.solve', []]]],
  ['lokomotif-pemberani.html', [['showWin', []], ['showLose', []]]],
  ['selamatkan-kereta.html',   [['showWin', []], ['showLose', []]]],
  ['ducky-volley.html',        [['endMatch', [true]]]],
  ['monster-candy.html',       [['endGame', []]]],
  ['mobil.html',               [['showGameOver', []], ['showFinish', []]]],
  ['pokemon-run.html',         [['showWin', []], ['showLose', []]]],
  ['pokemon-birds.html',       [['showWin', []]]],
  ['pokemon-bawah-laut.html',  [['showWin', []]]],
  ['mario-pokemon.html',       [['showWinModal', [3]]]],
  ['gym-pokemon.html',         [['__g13c.endBattleWin', []], ['__g13c.endBattleLose', []]]],
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
    // This box runs several agent sessions at once, so a cold nav can lose the
    // CPU for a minute. That is contention, not a hang, and it used to abort the
    // whole sweep on whichever game happened to be next: retry once, longer.
    let navFailed = null
    for (const t of [45000, 120000]) {
      try { await page.goto(`${BASE}/games/${file}`, { waitUntil: 'domcontentloaded', timeout: t }); navFailed = null; break }
      catch (e) { navFailed = String(e.message).slice(0, 120) }
    }
    if (navFailed) {
      check(false, `${file} · page loads (${navFailed})`)
      await page.close()
      continue
    }
    await sleep(6500)
    // clear anything the page opened on its own (tutorial / daily mission)
    await page.evaluate(() => {
      document.querySelectorAll('.show').forEach(el => { if (/tutorial|mission|daily/i.test(el.id || '')) el.classList.remove('show') })
    })

    for (const [fn, args] of routines) {
      const before = errors.length
      if (ARM[file]) {
        await page.evaluate(ARM[file]).catch(() => {})
        await sleep(900)
        if (file === 'lokomotif-pemberani.html') {
          await page.waitForFunction(() => typeof gameRunning !== 'undefined' && gameRunning, { timeout: 25000 }).catch(() => {})
          await sleep(1500)
        }
      }
      const r = await page.evaluate(async (fn, args) => {
        const out = { exists: false, threw: null }
        // Most games end in a modal over the board; kuis-matematika swaps to a
        // full result SCREEN instead, so a modal-only selector would call a
        // perfectly good ending a missing overlay.
        const overlaySel = '#gm-overlay, .gm-overlay, [id*="result" i], [id*="modal" i], [class*="overlay" i], [id*="over" i], #scr-hasil.active, #ov-ok.show'
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
        // Sample three times and keep the BEST. A single sample measures the
        // whole machine, not the page: this box runs several agent sessions at
        // once, and one contended sample reported the side racer's win path
        // 1118ms late. Measured in isolation, both its endings come back
        // 0-23ms, so that number was the gate describing the load average.
        // The best of three is the page's own cost with the starvation removed;
        // a genuinely blocked thread cannot produce a fast sample at all.
        let best = Infinity
        for (let i = 0; i < 3; i++) {
          const t0 = performance.now()
          await new Promise(r => setTimeout(r, 200))
          best = Math.min(best, Math.round(performance.now() - t0 - 200))
        }
        out.timerLateBy = best
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
      // G15 hung after a round until Hotfix #102-C stopped its Pixi ticker; a
      // ticker left running is the exact shape of "no respond hang", so the
      // stop is asserted rather than trusted.
      if (file === 'lokomotif-pemberani.html') {
        const t = await page.evaluate(() => ({
          ticker: (typeof app !== 'undefined' && app.ticker) ? app.ticker.started : null,
          running: typeof gameRunning !== 'undefined' ? gameRunning : null,
          boxes: typeof letterBoxes !== 'undefined' ? letterBoxes.length : null,
        }))
        check(t.ticker === false, `${label} stops the Pixi ticker (started=${t.ticker})`)
        check(t.running === false, `${label} clears gameRunning`)
        check(t.boxes === 0, `${label} clears the letter boxes (${t.boxes} left)`)
      }

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
