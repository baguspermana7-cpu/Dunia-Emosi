/* SkillGames — PRD-20 (docs/prd/PRD-20-kartu-main-berikutnya-di.md, revisi 2026-11-21): the "main berikutnya" card
 * on the beranda (#screen-menu of index.html). One big card: the picture of the game's own hub tile and its name.
 * A tap opens the game through that same tile. (The spoken line "Ayo main ...!" was removed with PRD-55: no TTS.)
 *
 * Which game: the weakest skill with >= 5 answers in the last 14 days (LearningLog.bySkill, parent-readable names),
 * that has a game here (MAP) not played today (LearningLog.playedToday: level:start + answers today). No such skill
 * (a new child, or every game for the weak skills played today) -> a safe learning game, picked from the child and
 * the day, so it stays the same all day. Everything reads the active child's own (avatar-scoped) log.
 *
 *   SkillGames.pick({ rows, played, seed, has }) -> { game, skill, why: 'weak'|'safe' } | null   (pure, for tests)
 *   SkillGames.render()                         -> draws / updates #next-card (called when the beranda shows)
 *   SkillGames.MAP / GAMES                      -> skill name -> game ids; game id -> hub tile id
 * Game ids are what DuniaBus reports: the page name, or 'g<N>' for a game hosted inside index.html.
 */
;(function (W, D) {
  'use strict'
  if (W.SkillGames) return
  var GAMES = {
    'kuis-matematika': 'gtile-25', 'ayo-berhitung': 'gtile-26', g13: 'gtile-13', g13b: 'gtile-13b', g10: 'gtile-10',
    g4: 'gtile-4', g3: 'gtile-3', g8: 'gtile-8', g7: 'gtile-7', g9: 'gtile-9', g19: 'gtile-19', g20: 'gtile-20'
  }
  // learning-log.js SKILL names -> games that ask that skill (in order of preference), from each game's DuniaAnswer
  // calls: Kuis (tambah/kurang/kali/bagi), Ayo Berhitung (add/sub/multiply/divide), G13/G13b/G10 (duniaReportOp),
  // G4 count, G3 awal, G8 susun, G7 gambar, G9 jejak
  var OPS = ['kuis-matematika', 'ayo-berhitung', 'g13', 'g13b', 'g10']
  var MAP = {
    'Penjumlahan': OPS, 'Pengurangan': OPS, 'Perkalian': OPS, 'Pembagian': OPS,
    'Menghitung benda': ['g4'], 'Berhitung': ['g4', 'ayo-berhitung'], 'Membandingkan': ['g4'],   // PRD-51: G4 compare rounds
    'Huruf awal': ['g3'], 'Menyusun kata': ['g8'], 'Kata dan gambar': ['g7'], 'Menulis huruf': ['g9'],
    // PRD-58 D4: the arcade pages (SoalArcade, g19 Pokemon Birds, g20 Ducky Volley) are the games that ask Pola and
    // Bentuk (measured: 400 draws each). Membaca jam, Mengeja kata, Mengenal perasaan have no hub game reporting them
    // yet, so they get no card rather than a wrong one.
    'Pola': ['g19', 'g20'], 'Bentuk': ['g19', 'g20']
  }
  var SAFE = ['g4', 'kuis-matematika', 'g3', 'g7', 'ayo-berhitung', 'g8', 'g9']
  var MIN_N = 5, DAYS = 14

  function hash (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

  function pick (o) {
    var rows = o.rows || [], played = o.played || [], has = o.has || function () { return true }
    var free = function (g) { return played.indexOf(g) < 0 && has(g) }
    var weak = rows.filter(function (r) { return r.n >= MIN_N && MAP[r.skill] })
      .sort(function (a, b) { return a.rate - b.rate || b.n - a.n })
    for (var i = 0; i < weak.length; i++) {
      var g = MAP[weak[i].skill].filter(free)[0]
      if (g) return { game: g, skill: weak[i].skill, why: 'weak' }
    }
    var pool = SAFE.filter(free)
    if (!pool.length) pool = SAFE.filter(has)
    if (!pool.length) return null
    return { game: pool[hash(String(o.seed || '')) % pool.length], skill: '', why: 'safe' }
  }

  function tileOf (g) { var t = D.getElementById(GAMES[g]); return t && t.getClientRects().length ? t : null }
  function today () { var x = new Date(); return x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate() }

  var spokenFor = ''
  function render () {
    var menu = D.getElementById('screen-menu'), LL = W.LearningLog
    if (!menu || !LL) return null
    var who = (W._activeAvatarSlug && W._activeAvatarSlug()) || 'anak'
    var p = pick({ rows: LL.bySkill({ days: DAYS }), played: LL.playedToday(), seed: who + '|' + today(), has: tileOf })
    var card = D.getElementById('next-card')
    if (!p) { if (card) card.hidden = true; return null }
    var tile = tileOf(p.game), name = tile.getAttribute('title') || ''
    if (!card) {
      card = D.createElement('button'); card.type = 'button'; card.id = 'next-card'; card.className = 'next-card'
      var anchor = D.getElementById('total-stars-banner') || D.getElementById('menu-player-header')
      if (anchor && anchor.parentNode === menu) menu.insertBefore(card, anchor.nextSibling); else menu.insertBefore(card, menu.firstChild)
      card.addEventListener('click', function () { var t = tileOf(card.dataset.game); if (t) t.click() })
    }
    if (card.dataset.game !== p.game) {
      card.textContent = ''
      var pic = tile.querySelector('.wmap-node-bldg')
      if (pic) { pic = pic.cloneNode(true); pic.removeAttribute('id'); pic.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id') }); card.appendChild(pic) }
      var word = D.createElement('span'); word.className = 'nc-word'; word.textContent = name; card.appendChild(word)
      var go = D.createElement('span'); go.className = 'nc-go'; go.setAttribute('aria-hidden', 'true')
      go.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>'
      card.appendChild(go)
      if (W.UISprites && W.UISprites.applyAll) try { W.UISprites.applyAll(card) } catch (_) {}
    }
    card.hidden = false
    card.dataset.game = p.game; card.dataset.tile = GAMES[p.game]; card.dataset.skill = p.skill; card.dataset.why = p.why
    card.setAttribute('aria-label', 'Ayo main ' + name)
    // the spoken line, once per child and game per page visit (sound off -> DuniaSpeak stays quiet)
    var key = who + '|' + p.game
    if (spokenFor !== key && W.DuniaSpeak && !W.DuniaSpeak.off) { /* PRD-55: DuniaSpeak.off -> no line at all */ spokenFor = key; speakLater(card, 'Ayo main ' + name + '!') }
    return p
  }
  // game.js asks the daily feeling check-in (or offers a breath) 700 ms after the beranda shows; that question goes
  // first. The line waits until no dialog is open, and is dropped if the child left the beranda or the card changed.
  function dialogOpen () { return !!D.querySelector('#dfeel, [role="dialog"]:not([hidden])') }
  function speakLater (card, line) {
    var game = card.dataset.game, menu = D.getElementById('screen-menu'), mo = null
    function go () {
      if (!menu.classList.contains('active') || card.dataset.game !== game || card.hidden) return
      if (dialogOpen()) {
        if (!mo && typeof MutationObserver !== 'undefined') { mo = new MutationObserver(function () { if (!dialogOpen()) { mo.disconnect(); setTimeout(go, 300) } }); mo.observe(D.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }) }
        return
      }
      try { W.DuniaSpeak.say(line, { lang: 'id-ID', rate: 0.9 }) } catch (_) {}
    }
    setTimeout(go, 1000)
  }

  // draw whenever the beranda becomes the active screen (showScreen adds .active), and after a level:start
  function watch () {
    var menu = D.getElementById('screen-menu')
    if (!menu || typeof MutationObserver === 'undefined') return
    // oldValue: a leave and a return inside one task (two records in one batch) still counts as a return
    new MutationObserver(function (recs) {
      var back = recs.some(function (r) { return !/(^|\s)active(\s|$)/.test(r.oldValue || '') })
      if (back && menu.classList.contains('active')) setTimeout(render, 0)
    }).observe(menu, { attributes: true, attributeFilter: ['class'], attributeOldValue: true })
    if (menu.classList.contains('active')) render()
  }
  W.SkillGames = { pick: pick, render: render, MAP: MAP, GAMES: GAMES, SAFE: SAFE }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', watch); else watch()
})(window, document)
