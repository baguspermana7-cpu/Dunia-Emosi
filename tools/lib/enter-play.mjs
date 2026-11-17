// enter-play — from a page's first screen into the thing a child actually plays, for the 10 pages where the survey's
// tapper stayed on a menu (docs/audit/perf-survey-2026-11-17.md, PRD-33). Each recipe copies the entry the page's own
// gates already use (qa-g14-realrace, qa-gt-play, qa-mojo-play, qa-museum-drive, qa-hub-boot, qa-tk-lifecycle,
// qa-film-no-network) and ends with a check read from the page, so a recipe that stops working says so instead of
// measuring a menu. Used by qa-perf-survey.mjs (report) and qa-perf-budget.mjs (gate).
//
//   const { ok, how, tap } = await enterPlay(page, 'games/garasi-tempur.html', { slow: 1 })
//   ok   : the in-page check passed (true for pages with no recipe: their first screen already takes the tapper in)
//   how  : what was done / what failed, one line
//   tap  : 'auto' = let the tapper play; 'none' = the page has nothing for it to tap (a catalogue, a canvas inside an iframe)
//   slow : multiplier on the waits (the survey runs under a 4x CPU throttle)
// entryUrl(pg) is the URL to load: film-play.html shows "Game tidak ditemukan" without ?g=<slug>.
const sleep = ms => new Promise(r => setTimeout(r, ms))

export const FILM_SLUG = 'thomas-track-repair'   // smallest film game that runs in the browser (4.6 MB); its path to the track board is below
export const entryUrl = pg => pg === 'games/film-play.html' ? pg + '?g=' + FILM_SLUG : pg

async function waitFor (p, fn, arg, ms = 30000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await p.evaluate(fn, arg).catch(() => false)) return true
    await sleep(150)
  }
  return false
}

// real touch tap on the first VISIBLE element matching `sel` (whose text matches `text`, a RegExp source); false when none shows up in `ms`
async function tapEl (p, sel, { text = '', ms = 30000 } = {}) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const pt = await p.evaluate((sel, text) => {
      const re = text ? new RegExp(text, 'i') : null
      for (const e of document.querySelectorAll(sel)) {
        const cs = getComputedStyle(e)
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0 || !e.getClientRects().length) continue
        if (re && !re.test(e.textContent || '')) continue
        e.scrollIntoView({ block: 'center', inline: 'center' })
        const r = e.getBoundingClientRect()
        if (r.width < 4 || r.height < 4) continue
        const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1)
        const hit = document.elementFromPoint(x, y)
        if (!hit || !(hit === e || e.contains(hit))) { e.click(); return { done: true } }   // covered: the gates' own way in (a DOM click)
        return { x, y }
      }
      return null
    }, sel, text).catch(() => null)
    if (pt) { if (!pt.done) await p.touchscreen.tap(pt.x, pt.y); return true }
    await sleep(200)
  }
  return false
}

// one tap at a fraction of the film iframe (its canvas fills it): [fx, fy] of the frame's box
async function tapFrame (p, fx, fy) {
  const r = await p.evaluate(() => { const f = document.getElementById('frame'); if (!f) return null; const b = f.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height } })
  if (!r) return false
  await p.touchscreen.tap(r.x + r.w * fx, r.y + r.h * fy)
  return true
}

// ---------- recipes ----------
const RECIPES = {
  // hub: Main Sekarang -> Main Sendiri -> Lanjut -> world map -> Huruf Hutan -> level 1 (the dot's own onclick, as qa-hub-boot) -> the letter question
  async 'index.html' (p) {
    if (!await tapEl(p, '.home-btn', { text: 'main sekarang' })) return { ok: false, how: 'no "Main Sekarang"' }
    if (!await tapEl(p, '.mode-card')) return { ok: false, how: 'no mode card' }
    if (!await tapEl(p, 'button.btn:not(.btn-back)', { text: 'lanjut' })) return { ok: false, how: 'no "Lanjut" on the player screen' }
    if (!await tapEl(p, '#gtile-3')) return { ok: false, how: 'no Huruf Hutan tile' }
    const dot = await waitFor(p, () => { const e = [...document.querySelectorAll('#screen-level *')].find(e => typeof e.onclick === 'function' && /^\s*1\s*$/.test(e.textContent)); if (e) { e.onclick(); return true } return false })
    if (!dot) return { ok: false, how: 'no level-1 dot' }
    const ok = await waitFor(p, ([s]) => { const e = document.querySelector(s); return !!e && !!e.getClientRects().length }, ['.g3-choice-btn'])
    return { ok, how: 'hub -> Huruf Hutan level 1' + (ok ? '' : ' (no letter choices drawn)') }
  },
  // g14 side-scroller: skip the tutorial, the run starts and the distance counts
  async 'games/balapan-kereta-side.html' (p) {
    await tapEl(p, '.tut-skip', { ms: 4000 })
    const ok = await waitFor(p, () => typeof S !== 'undefined' && S.running === true && S.distance > 1 && !S.paused)
    return { ok, how: 'tutorial skipped, run ' + (ok ? 'running' : 'NOT running') }
  },
  // g14 race (qa-g14-realrace): category -> train -> GO -> Adventure -> tutorial go -> the race countdown/run
  async 'games/balapan-kereta.html' (p) {
    if (!await tapEl(p, '.cat-btn')) return { ok: false, how: 'no category' }
    if (!await tapEl(p, '.train-card')) return { ok: false, how: 'no train card' }
    if (!await tapEl(p, '#go-btn')) return { ok: false, how: 'no GO' }
    if (!await tapEl(p, '.gvs-card[data-mode="adventure"]')) return { ok: false, how: 'no Adventure card' }
    await tapEl(p, '#g14-tut-go', { ms: 3000 })
    const ok = await waitFor(p, () => typeof S !== 'undefined' && S.running === true && !S.paused && !document.querySelector('.gvs-card'), null, 20000)
    return { ok, how: 'category -> train -> GO -> Adventure, race ' + (ok ? 'running' : 'NOT running') }
  },
  // garasi tempur (qa-gt-play): Latihan -> team -> battle; the 5 tutorial cards are tapped through
  async 'games/garasi-tempur.html' (p) {
    if (!await tapEl(p, '#btn-practice')) return { ok: false, how: 'no Latihan tile' }
    if (!await tapEl(p, '#team-list .team[data-k="api"]')) return { ok: false, how: 'no team card' }
    await waitFor(p, () => typeof __gt !== 'undefined' && __gt.state().screen === 'scr-battle')
    for (let i = 0; i < 8; i++) { if (!await p.evaluate(() => document.getElementById('tut').classList.contains('show'))) break; await tapEl(p, '#tut-next', { ms: 2000 }); await sleep(450) }
    const ok = await p.evaluate(() => __gt.state().screen === 'scr-battle' && !document.getElementById('tut').classList.contains('show')).catch(() => false)
    return { ok, how: 'Latihan -> team -> battle' + (ok ? '' : ' (not on the battle screen / tutorial still up)') }
  },
  // lokomotif pemberani: pick a train from the grid, the run starts
  async 'games/lokomotif-pemberani.html' (p) {
    if (!await tapEl(p, '.tcard')) return { ok: false, how: 'no train card' }
    const ok = await waitFor(p, () => typeof gameRunning !== 'undefined' && gameRunning === true && !gamePaused, null, 20000)
    return { ok, how: 'train picked, run ' + (ok ? 'running' : 'NOT running') }
  },
  // museum: a catalogue, no round to play. In use = a card opened (detail modal) and closed, the grid filtered by a tab (qa-museum-drive)
  async 'games/museum-kereta.html' (p) {
    const n = await waitFor(p, () => document.querySelectorAll('#g18-card-grid .g18-card').length > 0)
    if (!n) return { ok: false, how: 'no cards drawn' }
    await tapEl(p, '#g18-card-grid .g18-card'); await sleep(700)
    const open = () => document.getElementById('g18-light-modal').classList.contains('open') || document.getElementById('g18-modal').classList.contains('open')   // a plain card opens the light modal, a featured one the story modal
    const modal = await p.evaluate(open).catch(() => false)
    await p.evaluate(() => { g18CloseLight(); g18CloseModal() }).catch(() => {}); await sleep(400)
    const shut = await p.evaluate(open).then(o => !o).catch(() => false)
    await tapEl(p, '#g18-tabs .g18-tab', { text: 'diesel', ms: 3000 }); await sleep(500)
    const cards = await p.evaluate(() => document.querySelectorAll('#g18-card-grid .g18-card').length).catch(() => 0)
    return { ok: modal && shut && cards > 0, how: `catalogue: card modal ${modal ? 'opened' : 'DID NOT open'}${shut ? ' and closed' : ', NOT closed'}, Diesel tab ${cards} cards`, tap: 'auto' }
  },
  // mojo swoptops (qa-mojo-play): splash -> home -> Ayo Main -> level briefing -> the board with the command tray
  async 'games/mojo-swoptops.html' (p) {
    if (!await tapEl(p, '#scr-splash .splash-stage>.btn')) return { ok: false, how: 'no splash button' }
    if (!await tapEl(p, '#btn-play')) return { ok: false, how: 'no Main button' }
    if (!await tapEl(p, '#in-go')) return { ok: false, how: 'no briefing "Ayo Rencanakan"' }
    await tapEl(p, '#ov-card.on #picker-later', { ms: 1500 })
    const ok = await waitFor(p, () => document.body.dataset.scr === 'scr-play' && !!document.querySelector('#btn-run') && !document.querySelector('#in-go')?.getClientRects().length)
    return { ok, how: 'splash -> Main -> briefing -> board' + (ok ? '' : ' (board not up)') }
  },
  // timmy kapal: Mulai -> the story (Lewati = chapter done) -> reward -> "Lanjut" -> puzzle level 2 with the command tray
  async 'games/timmy-kapal.html' (p, o) {
    if (!await tapEl(p, '#btn-start')) return { ok: false, how: 'no Mulai Petualangan' }
    // the save remembers progress (the keepalive reloads the page): from a fresh save the story comes first (skip -> reward -> Lanjut),
    // later "Mulai" lands on the next level directly. Take whichever shows up until the level handle exists.
    const level = () => p.evaluate(() => typeof __tk !== 'undefined' && __tk.state().screen === 'scr-play' && !!(__tk.handle() && __tk.handle().level)).catch(() => false)
    for (let t0 = Date.now(); Date.now() - t0 < 25000 && !await level();) {
      if (await tapEl(p, '.tks-skip', { ms: 400 })) await sleep(900)
      else if (await tapEl(p, '.tkh-btn', { text: '^lanjut', ms: 400 })) await sleep(900)
      else await sleep(250)
    }
    const ok = await level()
    return { ok, how: 'Mulai -> (story skipped -> Lanjut) -> puzzle level' + (ok ? '' : ' (no level handle)') }
  },
  // film game (qa-film-no-network): wait for the game canvas in the iframe, then PLAY -> engine -> intro SKIP -> the track board.
  // Flash-style canvas, no DOM to read: the taps are fractions of the frame, the timings are the game's own animation.
  async 'games/film-play.html' (p, o) {
    const sl = ms => sleep(ms * (o.slow || 1))
    const up = await waitFor(p, () => { const f = document.getElementById('frame'); const d = f && f.contentDocument; const c = d && d.querySelector('canvas'); return !!c && c.getBoundingClientRect().width >= 200 }, null, 60000)
    if (!up) return { ok: false, how: 'game canvas never came up', tap: 'none' }
    await sl(3500); await tapFrame(p, 0.897, 0.896)      // PLAY
    await sl(4000); await tapFrame(p, 0.5, 0.49)         // Thomas
    await sl(5000); await tapFrame(p, 0.897, 0.09)       // SKIP the intro
    await sl(4000)
    return { ok: true, how: 'thomas-track-repair: PLAY -> Thomas -> SKIP -> track board (canvas: judged on the screenshot)', tap: 'none' }
  },
  // film catalogue: a list of 17 cards (each opens film-play, another page). In use = scrolled to the end and back, which is what loads its lazy images
  async 'games/film-anak.html' (p) {
    await waitFor(p, () => document.querySelectorAll('a.cplay').length > 0)
    await p.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 350)) } scrollTo(0, 0) })
    const n = await p.evaluate(() => document.querySelectorAll('a.cplay').length).catch(() => 0)
    return { ok: n > 0, how: `catalogue: ${n} cards, scrolled end to end`, tap: 'none' }
  },
  // gym pokemon: team -> first gym -> TANTANG -> Adventure -> Maju -> the battle arena (not in the PRD's 10: the tapper ended on the team/dex lists)
  async 'games/gym-pokemon.html' (p) {
    // a fresh save opens the team picker; after the tapper's reload the team is saved and the gym list shows at once: either is fine
    if (!await waitFor(p, () => !!document.querySelector('.pkg-card, .trainer-card')?.getClientRects().length, null, 60000)) return { ok: false, how: 'neither team cards nor gym list rendered (10 MB load)' }
    if (await p.evaluate(() => !!document.querySelector('.pkg-card')?.getClientRects().length)) { if (!await tapEl(p, '.pkg-card')) return { ok: false, how: 'no team card' } }
    if (!await tapEl(p, '.trainer-card')) return { ok: false, how: 'no gym card' }
    if (!await tapEl(p, '#gw-fight')) return { ok: false, how: 'no TANTANG' }
    if (!await tapEl(p, '.bm-card')) return { ok: false, how: 'no Adventure card' }
    if (!await tapEl(p, '#tcf-go')) return { ok: false, how: 'no Maju' }
    const ok = await waitFor(p, () => !!document.querySelector('canvas.weather-fx-canvas')?.getClientRects().length, null, 20000)
    return { ok, how: 'team -> gym -> TANTANG -> Adventure -> Maju -> arena' + (ok ? '' : ' (arena not up)') }
  },
  // mobil: the vehicle picker -> Mulai! -> the lane run (not in the PRD's 10: the tapper ended on the picker)
  async 'games/mobil.html' (p) {
    if (!await tapEl(p, '.ovl-btn', { text: 'mulai' })) return { ok: false, how: 'no Mulai on the vehicle picker' }
    const ok = await waitFor(p, () => typeof S !== 'undefined' && S.running === true && !S.paused, null, 15000)
    return { ok, how: 'picker -> Mulai -> run ' + (ok ? 'running' : 'NOT running') }
  },
  // kereta maze: Mulai Petualangan -> mission briefing -> Susun Langkah -> the board with the command tray (not in the PRD's 10: the tapper ended on its chapter map)
  async 'games/kereta-maze.html' (p) {
    if (!await tapEl(p, '#b-start')) return { ok: false, how: 'no Mulai Petualangan' }
    if (!await tapEl(p, '#kb-go')) return { ok: false, how: 'no Susun Langkah' }
    const ok = await waitFor(p, () => !!document.querySelector('#kg-run')?.getClientRects().length)
    return { ok, how: 'Mulai -> briefing -> board' + (ok ? '' : ' (board not up)') }
  },
  // kuis matematika: MAIN -> world 1 -> level 1-1 -> skill Tambah -> Mulai -> a question (not in the PRD's 10: the tapper ended on the skill chooser)
  async 'games/kuis-matematika.html' (p) {
    if (!await tapEl(p, '.br-play')) return { ok: false, how: 'no MAIN' }
    const node = label => waitFor(p, l => { const n = [...document.querySelectorAll('.node')].find(e => e.textContent.trim() === l); if (n) { n.click(); return true } return false }, label)
    if (!await node('1')) return { ok: false, how: 'no world node' }
    if (!await node('1-1')) return { ok: false, how: 'no level node 1-1' }
    if (!await tapEl(p, '.skill-card.op-card')) return { ok: false, how: 'no skill card' }
    if (!await tapEl(p, '#skill-start')) return { ok: false, how: 'no Mulai' }
    const ok = await waitFor(p, () => !!document.querySelector('.choice')?.getClientRects().length)
    return { ok, how: 'MAIN -> 1 -> 1-1 -> Tambah -> Mulai' + (ok ? '' : ' (no question drawn)') }
  }
}

// the two iframe hosts: a frame onto another page / game, nothing for the tapper (qa-perf-survey: 0 taps)
const NO_TAP = new Set(['games/blippi.html', 'games/mojo-chase-embed.html'])

// still in play? (read from the page; the tapper can wander onto a map or a dialog). Pages with no check are always "in play".
const IN_PLAY = {
  'index.html': () => !!document.querySelector('.g3-choice-btn')?.getClientRects().length,
  'games/balapan-kereta-side.html': () => typeof S !== 'undefined' && S.running === true && !S.gameOver,
  'games/balapan-kereta.html': () => typeof S !== 'undefined' && S.running === true && !S.gameOver,
  'games/garasi-tempur.html': () => __gt.state().screen === 'scr-battle',
  'games/lokomotif-pemberani.html': () => typeof gameRunning !== 'undefined' && gameRunning === true,
  'games/mojo-swoptops.html': () => document.body.dataset.scr === 'scr-play',
  'games/timmy-kapal.html': () => __tk.state().screen === 'scr-play' && !document.querySelector('#pause.show'),
  'games/mobil.html': () => typeof S !== 'undefined' && S.running === true,
  'games/gym-pokemon.html': () => !!document.querySelector('canvas.weather-fx-canvas')?.getClientRects().length,
  'games/kereta-maze.html': () => !!document.querySelector('canvas.kb-ground')?.getClientRects().length,
  'games/kuis-matematika.html': () => !!document.querySelector('.choice')?.getClientRects().length
}
export const isPlaying = async (p, pg) => IN_PLAY[pg] ? await p.evaluate(IN_PLAY[pg]).catch(() => false) : true

// controls the budget tapper never taps on a page: tabs that leave the board for another screen (key = the tapper's tag#id / tag.class)
const AVOID = { 'games/kereta-maze.html': /^button#n-(home|map|char)$/ }
export const avoidFor = pg => AVOID[pg] || null

export const hasRecipe = pg => !!RECIPES[pg]

export async function enterPlay (p, pg, o = {}) {
  const r = RECIPES[pg]
  if (!r) return { ok: true, how: NO_TAP.has(pg) ? 'iframe host: first screen only' : 'first screen (the tapper reaches play on its own)', tap: NO_TAP.has(pg) ? 'none' : 'auto' }
  try { const out = await r(p, o); return { tap: 'auto', ...out } } catch (e) { return { ok: false, how: 'recipe threw: ' + String(e.message || e).slice(0, 120), tap: 'auto' } }
}
