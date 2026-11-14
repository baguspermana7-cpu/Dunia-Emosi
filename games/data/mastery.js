/**
 * DuniaMastery — how well this child knows each domain, across games (docs/prd/PRD-10-model-penguasaan-lintas-game.md).
 * Fed by DuniaBus 'answer' events (Kuis Matematika, Ayo Berhitung, Timmy, Mojo, Kereta), stored per child through
 * save-engine ('dunia-avatar-<slug>-mastery'), read by any game that picks question difficulty.
 *
 *   DuniaMastery.score(domain)        -> 0..100 (a domain never answered starts from the child's age band)
 *   DuniaMastery.tier(domain)         -> 1..4   (the same cut points as TKQuiz.mastery: 30 / 60 / 80)
 *   DuniaMastery.scores()             -> { domain: score } for every domain answered
 *   DuniaMastery.update(m, ok, n)     -> the rule itself, pure (for the gate's simulated children)
 *
 * The rule: right on the first try +K, otherwise -3K. Expected change is zero where the child answers 75 % right on
 * the first try, so a child settles on the level where three in four come out right (TKQuiz's +5 / -3 settles near 35 %).
 * K starts at 10 so a 5-6 child who answers like a strong one is on tier 3-4 within 10 answers (K 8 took ~11, 16 of 20
 * simulated children), and falls to 3 after 21 answers in that domain so one slip does not throw a settled child down.
 * Nothing here throws into a game.
 */
(function () {
  'use strict'
  var W = window
  if (W.DuniaMastery) return
  var KEY = 'dunia-mastery'
  var START = { cilik: 10, tumbuh: 40, pintar: 65 }

  function k (n) { return Math.max(3, 10 - Math.floor((n || 0) / 3)) }
  function update (m, ok, n) {
    var K = k(n)
    return Math.max(0, Math.min(100, (+m || 0) + (ok ? K : -3 * K)))
  }
  function tier (m) { m = +m || 0; return m <= 30 ? 1 : m <= 60 ? 2 : m <= 80 ? 3 : 4 }

  function read () {
    try {
      var raw = W.avatarScopedGet ? W.avatarScopedGet(KEY) : localStorage.getItem(KEY)
      var d = JSON.parse(raw || 'null')
      return d && d.v === 1 && d.d ? d : { v: 1, d: {} }
    } catch (e) { return { v: 1, d: {} } }
  }
  function write (d) {
    try { var s = JSON.stringify(d); if (W.avatarScopedSet) W.avatarScopedSet(KEY, s); else localStorage.setItem(KEY, s) } catch (e) {}
  }
  function start () {
    try { return START[W.DuniaProfile ? W.DuniaProfile.ageTier() : 'tumbuh'] || START.tumbuh } catch (e) { return START.tumbuh }
  }
  function score (domain) {
    var r = read().d[String(domain)]
    return r ? r[0] : start()
  }
  function scores () {
    var d = read().d, o = {}
    for (var x in d) o[x] = d[x][0]
    return o
  }
  // seed a domain from a game's own older score (Timmy kept one per domain in its save): never lowers what is there
  function seed (domain, m) {
    var d = read(), r = d.d[domain]
    if (r && r[0] >= m) return
    d.d[domain] = [Math.max(0, Math.min(100, +m || 0)), r ? r[1] : 0]
    write(d)
  }
  function record (ev) {
    try {
      if (!ev || !ev.domain) return
      var d = read(), dom = String(ev.domain).slice(0, 24), r = d.d[dom] || [start(), 0]
      d.d[dom] = [update(r[0], !!ev.ok, r[1]), r[1] + 1]
      write(d)
    } catch (e) {}
  }

  W.DuniaMastery = { score: score, tier: function (dom) { return tier(score(dom)) }, scores: scores, seed: seed, record: record,
    update: update, tierOf: tier, START: START, KEY: KEY }
  if (W.DuniaBus) W.DuniaBus.on('answer', record)
})()
