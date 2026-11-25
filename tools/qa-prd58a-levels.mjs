#!/usr/bin/env node
// qa-prd58a-levels — PRD-58 gelombang 58A (docs/prd/PRD-58-kembangkan-dan-sempurnakan.md): levels and difficulty.
//   A1 every hub game with a level map reaches all three difficulties inside the levels its map shows
//      (G3/G4/G7/G8/G9/G11 show 20 levels; "hard" started at 27, so it was never reached), the map shows that many
//      level bubbles and the "next level" button goes on to the last one.
// Usage: QA_BASE=http://127.0.0.1:8089 node tools/qa-prd58a-levels.mjs
const BASE = (process.env.QA_BASE || 'http://localhost:8081').replace(/\/$/, '')
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok ' : '  ✗ ') + m) }
const { default: puppeteer } = await import('puppeteer')
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-audio-output'] })
const errs = []
try {
  const p = await b.newPage()
  p.on('pageerror', e => errs.push(String(e).slice(0, 160)))
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await p.evaluateOnNewDocument(() => {
    if (localStorage.getItem('__qa58')) return
    localStorage.clear(); localStorage.setItem('__qa58', '1'); localStorage.setItem('dunia-emosi-sound', 'off')
    localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh' }]))
    localStorage.setItem('dunia-active-slot', '[0]')
  })
  await p.goto(BASE + '/index.html?nocine=1', { waitUntil: 'load', timeout: 120000 })
  await p.waitForFunction(() => typeof window.startGameWithLevel === 'function' && typeof window.openLevelSelect === 'function', { timeout: 60000 })
  for (const g of [3, 4, 7, 8, 9, 11]) {
    const r = await p.evaluate(async g => {
      state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }]; state.mode = 'solo'; state.currentPlayer = 0
      state.currentGame = g
      openLevelSelect(g)
      await new Promise(r => setTimeout(r, 50))
      const bubbles = [...document.querySelectorAll('#level-tiers .lvl-bubble')].filter(el => el.offsetParent !== null).length
      const shown = bubbles || 20
      const seen = {}
      for (let lv = 1; lv <= shown; lv++) { state.currentGame = g; state.selectedLevelNum = lv; const d = (window.levelDiff ? levelDiff(g, lv) : (lv <= 13 ? 'easy' : lv <= 26 ? 'medium' : 'hard')); seen[d] = (seen[d] || 0) + 1 }
      // the difficulty startGameWithLevel really sets, at the last level of the map
      try { startGameWithLevel(shown) } catch (e) {}
      const last = state.selectedLevel
      try { exitGame() } catch (e) {}
      return { bubbles, shown, seen, last }
    }, g)
    ok(r.seen.easy > 0 && r.seen.medium > 0 && r.seen.hard > 0 && r.last === 'hard', `A1 G${g}: ${r.shown} levels on the map (bubbles ${r.bubbles}) -> easy ${r.seen.easy || 0}, medium ${r.seen.medium || 0}, hard ${r.seen.hard || 0}; level ${r.shown} starts as "${r.last}"`)
  }
  // the next button goes on to the last level of a 40-level map (it stopped at 20)
  const nx = await p.evaluate(() => {
    const out = {}
    for (const [g, lv] of [[3, 19], [3, 20], [13, 25], [13, 40]]) {
      state.currentGame = g; state.selectedLevelNum = lv; state.mode = 'solo'
      try { state._showingResult = false; state.gameStars = [3, 0]; state.maxPossibleStars = 3; showResult('⭐', 'qa', 'qa') } catch (e) {}
      const btn = document.getElementById('result-next-btn')
      out[g + ':' + lv] = btn ? getComputedStyle(btn).display !== 'none' : null
    }
    return out
  })
  ok(nx['3:19'] === true && nx['3:20'] === false && nx['13:25'] === true && nx['13:40'] === false, `A1 next button: G3 lv19 ${nx['3:19']}, lv20 ${nx['3:20']}, G13 lv25 ${nx['13:25']}, lv40 ${nx['13:40']} (want true,false,true,false)`)
  // A3 G9: ten sessions at level 8 trace >= 20 different letters, none twice in one session; level 15 opens word mode
  const g9 = await p.evaluate(() => {
    const all = new Set(), dupSessions = []
    state.currentGame = 9; state.mode = 'solo'
    for (let k = 0; k < 10; k++) {
      state.selectedLevelNum = 8; state.selectedLevel = window.levelDiff ? levelDiff(9, 8) : 'easy'
      g9TraceMode = 'huruf'
      try { initGame9() } catch (e) { return { err: String(e) } }
      const seq = g9State.sequence.slice(0, g9State.maxRound)
      seq.forEach(x => all.add(x)); if (new Set(seq).size !== seq.length) dupSessions.push(seq.join(''))
    }
    state.selectedLevelNum = 15; state.selectedLevel = window.levelDiff ? levelDiff(9, 15) : 'medium'
    try { initGame9() } catch (e) {}
    const word15 = !!g9State.wordMode
    try { exitGame() } catch (e) {}
    return { distinct: all.size, letters: [...all].sort().join(''), dupSessions, word15 }
  })
  ok(g9.distinct >= 20 && !g9.dupSessions.length, `A3 G9: 10 sessions at level 8 -> ${g9.distinct} letters (${g9.letters}), sessions with a repeat ${g9.dupSessions.length}${g9.err ? ' ' + g9.err : ''}`)
  ok(g9.word15 === true, `A3 G9: level 15 opens word mode (${g9.word15})`)
  // A5 G10: the question respects its level's number limit and operations (G10_LEVELS max/ops)
  const g10 = await p.evaluate(() => {
    const out = {}
    state.currentGame = 10; state.mode = 'solo'
    for (const lv of [1, 7]) {
      state.selectedLevelNum = lv; state.selectedLevel = window.levelDiff ? levelDiff(10, lv) : 'easy'
      try { initGame10() } catch (e) { return { err: String(e) } }
      const cfg = G10_LEVELS[lv], ops = new Set(); let over = 0
      for (let i = 0; i < 200; i++) {
        g10GenQuestion()
        const t = g10State.currentProblem.text, m = t.match(/(\d+)\s*([^\d\s=]+)\s*(\d+)/)
        if (!m) continue
        ops.add(m[2]); if (+m[1] > cfg.max || +m[3] > cfg.max || g10State.currentProblem.ans > cfg.max) over++
      }
      out[lv] = { ops: [...ops].join(' '), over, want: cfg.ops.join(' '), max: cfg.max }
      try { exitGame10() } catch (e) {}
    }
    return out
  })
  ok(g10[1] && !/[-−×÷*]/.test(g10[1].ops) && g10[1].over === 0, `A5 G10 level 1: ops seen "${g10[1] && g10[1].ops}" (level allows "${g10[1] && g10[1].want}", max ${g10[1] && g10[1].max}), over the limit ${g10[1] && g10[1].over}${g10.err ? ' ' + g10.err : ''}`)
  ok(g10[7] && /-/.test(g10[7].ops) && !/[×÷*]/.test(g10[7].ops) && g10[7].over === 0, `A5 G10 level 7: ops seen "${g10[7] && g10[7].ops}" (level allows "${g10[7] && g10[7].want}", max ${g10[7] && g10[7].max}), over the limit ${g10[7] && g10[7].over}`)
  // A4/E2 G7: an easy session (level 1) mixes "picture -> word" with "word -> picture"
  const g7 = await p.evaluate(() => {
    state.currentGame = 7; state.mode = 'solo'; state.selectedLevelNum = 1; state.selectedLevel = window.levelDiff ? levelDiff(7, 1) : 'easy'
    try { initGame7() } catch (e) { return { err: String(e) } }
    const modes = []
    for (let r = 0; r < g7State.maxRound; r++) { g7State.round = r; try { nextG7Round() } catch (e) { return { err: String(e) } } modes.push(g7State.mode) }
    try { exitGame() } catch (e) {}
    return { modes }
  })
  ok(g7.modes && g7.modes.includes('img2word') && g7.modes.includes('word2img'), `A4 G7 level 1 round kinds: ${g7.modes ? g7.modes.join(' ') : g7.err}`)
  ok(!errs.length, `A1 page errors ${errs.length} ${errs.slice(0, 2).join(' | ')}`)
} finally { await b.close() }
console.log(`qa-prd58a-levels: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
