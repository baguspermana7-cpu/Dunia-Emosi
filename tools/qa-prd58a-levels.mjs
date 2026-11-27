#!/usr/bin/env node
// qa-prd58a-levels — PRD-58 gelombang 58A (docs/prd/PRD-58-kembangkan-dan-sempurnakan.md): levels and difficulty.
//   C9 G9 lowercase letters on the medium third (52 paths, ghost glyph inside its box)
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
  // C9 G9 lowercase: 52 paths; level 8 (medium) traces lowercase only, level 1 uppercase only; each lowercase ghost
  // glyph really paints ink inside its own path box; a lowercase round still finds a picture
  const c9 = await p.evaluate(async () => {
    try { await document.fonts.load('bold 100px Nunito') } catch (e) {}
    const keys = Object.keys(LETTER_GUIDES).length, out = { keys }
    state.currentGame = 9; state.mode = 'solo'; g9TraceMode = 'huruf'
    for (const lv of [1, 8]) {
      state.selectedLevelNum = lv; state.selectedLevel = levelDiff(9, lv)
      try { initGame9() } catch (e) { return { err: String(e) } }
      out['lv' + lv] = g9State.sequence.slice(0, g9State.maxRound).join('')
    }
    const thin = []
    for (const ch of (typeof LETTER_SEQ_KECIL !== 'undefined' ? LETTER_SEQ_KECIL : [])) {
      const c = document.createElement('canvas'); c.width = c.height = 200
      const x = c.getContext('2d'); g9FillGlyph(x, ch, LETTER_GUIDES[ch], 200, 200)
      const g = LETTER_GUIDES[ch], x0 = Math.min(...g.map(q => q.x)) * 200, x1 = Math.max(...g.map(q => q.x)) * 200
      const y0 = Math.min(...g.map(q => q.y)) * 200, y1 = Math.max(...g.map(q => q.y)) * 200
      // the ink box sits on the path box: top and bottom within 14 px, centred within 10 px (stroke width aside)
      const d = x.getImageData(0, 0, 200, 200).data; let t = 999, bt = -1, l = 999, r = -1
      for (let yy = 0; yy < 200; yy++) for (let xx = 0; xx < 200; xx++) if (d[(yy * 200 + xx) * 4 + 3] > 0) { t = Math.min(t, yy); bt = Math.max(bt, yy); l = Math.min(l, xx); r = Math.max(r, xx) }
      if (bt < 0 || Math.abs(t - y0) > 14 || Math.abs(bt - y1) > 14 || Math.abs((l + r) / 2 - (x0 + x1) / 2) > 10) thin.push(ch + ':' + [t, bt, l, r].join(',') + ' vs ' + [y0, y1, x0, x1].map(Math.round).join(','))
    }
    out.thin = thin; out.n = (typeof LETTER_SEQ_KECIL !== 'undefined' ? LETTER_SEQ_KECIL : []).length
    out.pic = !!g9PicFor('b')
    try { exitGame() } catch (e) {}
    return out
  })
  ok(c9.keys === 52 && c9.n === 26, `C9 G9: LETTER_GUIDES has ${c9.keys} paths (want 52), lowercase ${c9.n}${c9.err ? ' ' + c9.err : ''}`)
  ok(/^[a-z]+$/.test(c9.lv8 || '') && /^[A-Z]+$/.test(c9.lv1 || ''), `C9 G9: level 1 traces "${c9.lv1}", level 8 traces "${c9.lv8}" (want uppercase, then lowercase)`)
  ok(c9.thin && !c9.thin.length && c9.pic, `C9 G9: lowercase ghost glyphs sit on their path box (misses: ${c9.thin && c9.thin.join(' ') || 'none'}), picture for "b" ${c9.pic}`)
  // C9b G3 pair round: at medium, letter-part rounds 2, 5 ... show one letter and ask for its other case (both
  // directions in a session); a right tap is logged as 'besar-kecil'; easy has no pair round
  const c9b = await p.evaluate(async () => {
    const out = { med: [], easy: 0, logged: null }
    // the app always holds two player slots (solo uses slot 0); the A1 block above left one
    state.players = [{ name: 'Ana', animal: '🦁', ageTier: 'tumbuh', stars: 0 }, { name: 'Pemain 2', animal: '🐰', ageTier: 'tumbuh', stars: 0 }]; state.currentPlayer = 0
    state.currentGame = 3; state.mode = 'solo'
    for (const [lvl, n] of [['medium', 8], ['easy', 2]]) {
      state.selectedLevelNum = n; state.selectedLevel = lvl
      try { initGame3() } catch (e) { return { err: String(e) } }
      for (let r = 0; r < g3State.maxRound; r++) {
        g3State.round = r; nextG3Round()
        if (!g3State.isPair) continue
        if (lvl === 'easy') { out.easy++; continue }
        const shown = document.querySelector('#g3-word .g3-pair')?.textContent, btns = [...document.querySelectorAll('#g3-choices .g3-choice-btn')].map(b => b.textContent)
        out.med.push({ shown, ans: g3State.pairAns, btns: btns.join(''), hint: document.getElementById('g3-hint').textContent, mg: document.getElementById('g3-mg').textContent })
      }
    }
    // one real tap on the right answer of a pair round
    state.selectedLevel = 'medium'; initGame3(); g3State.round = 1; nextG3Round()
    const seen = []; const off = window.DuniaBus && DuniaBus.on ? DuniaBus.on('answer', e => seen.push(e)) : null
    const right = [...document.querySelectorAll('#g3-choices .g3-choice-btn')].find(b => b.textContent === g3State.pairAns)
    if (right) right.click()
    await new Promise(r => setTimeout(r, 200)); try { off && off() } catch (e) {}
    out.logged = seen.map(e => e.skill + ':' + e.ok).join(',')
    out.label = window.LearningLog ? LearningLog.label('besar-kecil', 'bahasa') : null
    try { exitGame() } catch (e) {}
    return out
  })
  const pairs = c9b.med || [], up2lo = pairs.filter(x => /^[A-Z]$/.test(x.shown) && x.ans === x.shown.toLowerCase()), lo2up = pairs.filter(x => /^[a-z]$/.test(x.shown) && x.ans === x.shown.toUpperCase())
  ok(pairs.length >= 2 && up2lo.length && lo2up.length && pairs.every(x => x.btns.includes(x.ans) && x.btns.length >= 3 && /pasangan/.test(x.mg) && !/hilang/.test(x.mg)) && c9b.easy === 0,
    `C9b G3 pairs at medium: ${pairs.map(x => x.shown + '>' + x.ans + '[' + x.btns + ']').join(' ')}; easy pair rounds ${c9b.easy}${c9b.err ? ' ' + c9b.err : ''}`)
  ok(/besar-kecil:true/.test(c9b.logged || '') && c9b.label === 'Huruf besar dan kecil', `C9b G3: a right tap on a pair round is logged as ${c9b.logged || 'nothing'} (want besar-kecil:true), dashboard label "${c9b.label}"`)
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
