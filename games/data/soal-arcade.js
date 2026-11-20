/* =============================================================================
 * soal-arcade.js — window.SoalArcade. The thin glue that lets an arcade page (Ducky Volley, Pokemon Birds,
 * Balapan Kereta Side) draw its questions from the shared SoalEngine instead of a bank of its own (PRD-39).
 * It is NOT an engine: SoalEngine picks, validates and remembers (per child, per game); this file only
 *   1. defines the 'arkade' profile (kid-safe packs, six topics, short prompts) and one profile per page,
 *   2. turns the child's DuniaMastery tiers into the engine's grade, on EVERY question (a strong child climbs
 *      inside one match; a weak one is held at the easy tier),
 *   3. serves only questions the page can show without a picture slot (no pic / shape), whose emoji all
 *      have a sprite in EmojiMap (the DOM resolver swaps them), that pass SoalEngine.validate,
 *   4. emits DuniaBus 'answer' (domain = topic, skill = kind or topic; both known to learning-log.js).
 *
 *   SoalArcade.next(game[, {seed, history:false}]) -> one question {prompt, choices[], answer, topic, kind, id, grade} | null
 *   SoalArcade.grade(game)                 -> 1..4, the engine grade for this child right now
 *   SoalArcade.answer(q, ok, tries, ms)    -> emits the bus event, returns it (null without a bus)
 *   SoalArcade.GAMES                       -> the page ids that have a profile: g19, g20, g14s
 * ==========================================================================*/
(function (W) {
  'use strict'
  var SE = W.SoalEngine
  if (!SE || W.SoalArcade) return

  var WEIGHTS = { matematika: 40, bahasa: 20, umum: 15, logika: 10, bentuk: 10, emosi: 5 }
  var TOPICS = Object.keys(WEIGHTS)
  var GAMES = ['g19', 'g20', 'g14s']
  var MAX_WORDS = 14

  SE.defineGame('arkade', {
    'extends': 'default',
    topics: TOPICS,
    weights: WEIGHTS,
    // the hard / expert curated banks carry school jargon (fotosintesis, vertebrata); the engine's own
    // generators supply the harder arithmetic for a strong child instead
    packs: ['kids', 'g23-easy', 'g23-medium'],
    general: true,
    choices: { easy: 3, normal: 4 },
    maxWords: { 1: 9, 2: 11, 3: MAX_WORDS, 4: MAX_WORDS },
    scope: 'game'
  })
  GAMES.forEach(function (g) { SE.defineGame(g, { 'extends': 'arkade' }) })

  function tierOf (topic) {
    var M = W.DuniaMastery
    try { return M && M.tierNow ? M.tierNow(topic) : 2 } catch (e) { return 2 }
  }
  // the weighted mean of the child's tiers across the topics this game serves
  function grade () {
    var sum = 0, tot = 0
    TOPICS.forEach(function (t) { sum += WEIGHTS[t] * tierOf(t); tot += WEIGHTS[t] })
    return Math.max(1, Math.min(4, Math.round(sum / tot)))
  }

  var EMOJI = /(?:[\uD83C-\uD83E][\uDC00-\uDFFF]|[☀-➿]|[⬀-⯿])️?/g
  function emojis (s) { return String(s).match(EMOJI) || [] }
  function mapped (q) {
    var em = emojis(q.prompt + ' ' + q.choices.join(' ')), M = W.EmojiMap
    for (var i = 0; i < em.length; i++) if (!(M && M.has && M.has(em[i]))) return false
    return true
  }
  // a page without a picture slot cannot show a counting or shape question, and a choice that is itself an
  // emoji would be redrawn as a sprite by the DOM resolver, so the page could no longer compare it to the answer
  function shown (q) {
    return !(q.pic || q.picA || q.picB || q.picCount || q.shape || q.choicePics || q.picOnly || q.letters || q.listen) &&
      !q.choices.some(function (c) { return emojis(c).length > 0 })
  }
  // Questions in the shared banks that a 5-8 year old cannot answer unambiguously (found by reading all of them):
  // a second option is also right, the answer is contested or changes (leap year, shared islands), or the item
  // needs grammar words or affixes a child has not met. They stay in the banks for the games that already use them.
  var DROP = [
    /^Lawan kata (BARU|GELAP|BAIK|BENAR|CEPAT|PANAS|TINGGI)\?/, /^Sama arti (BAGUS|SUKA|PINTAR|TAKUT)\?/,
    /^Pulau terbesar/, /Februari/, /^Hewan langka di Sumatera/, /^Profesi mengemudi pesawat/, /subjeknya|predikatnya/, /[A-Z]{2,}-?\s*\+\s*-?[A-Z]{2,}/,
    /\uD83E\uDD85|\u26F5|\uD83D\uDC1E/,   // elang (a child says burung), perahu layar (kapal or perahu), kepik (kumbang or kepik)
    /^(\u26AA|\u26AB|\uD83D[\uDD34\uDD35\uDFE0-\uDFE4])\s*Lengkapi/   // a colour circle as the picture of a word: cokelat, coklat?
  ]
  // generated kinds that are drawn by the page that owns the picture: a clock face, a shaded cake, a guess-the-glyph
  var NEEDS_DRAWING = /^(clock|clock5|frac|tebak)$/
  function askable (q) {
    if (NEEDS_DRAWING.test(q.kind || '')) return false
    for (var i = 0; i < DROP.length; i++) if (DROP[i].test(q.prompt)) return false
    return true
  }
  function fit (q) {
    return !!q && shown(q) && askable(q) && mapped(q) && SE.validate(q).length === 0 &&
      q.prompt.trim().split(/\s+/).length <= MAX_WORDS
  }

  var recent = {}
  function next (game, o) {
    var id = GAMES.indexOf(game) >= 0 ? game : 'arkade', skip = {}, q = null, g = grade()
    ;(recent[id] || []).forEach(function (x) { skip[x] = 1 })
    for (var i = 0; i < 30 && !q; i++) {
      var c = null
      var ask = { game: id, context: 'quiz', grade: g, avatar: 'auto', exclude: skip }
      if (o && o.seed != null) ask.seed = o.seed + i * 7919   // a test replays a seed; a page passes nothing
      if (o && o.history === false) ask.history = false
      try { c = SE.one(ask) } catch (e) { c = null }
      if (c) { skip[c.id] = 1; if (fit(c)) q = c }
    }
    if (q) recent[id] = (recent[id] || []).concat([q.id]).slice(-8)
    return q
  }

  function answer (q, ok, tries, ms) {
    try {
      if (!q || !W.DuniaBus) return null
      return W.DuniaBus.emit('answer', { domain: q.topic, skill: q.kind || q.topic, item: q.id, ok: !!ok, tries: tries || 1, ms: ms == null ? null : ms })
    } catch (e) { return null }
  }

  W.SoalArcade = { next: next, grade: grade, answer: answer, GAMES: GAMES.slice(), TOPICS: TOPICS.slice(), fit: fit }
})(typeof window !== 'undefined' ? window : globalThis)
