/* ============================================================================
 * sd-session.js — window.SDSession. Builds one G28 session (PRD §8):
 *   5 cards from one world: a warm-up first (an easy, familiar archetype),
 *   unseen cards preferred, one spaced review of a card the child needed help
 *   with (if any), never the same card twice, never more than two identical
 *   interaction archetypes in a row. Deterministic for a given seed (testable).
 *
 *   SDSession.build(cards, worldKey, { seed, history }) -> [card x5]
 *   history: { [cardId]: { seen: n, helped: n, last: timestamp } }
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  var WARM = { image: 1, choice: 1 }
  var SIZE = 5

  function rng (seed) {
    var s = (seed >>> 0) || 1
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000 }
  }
  function shuffle (a, r) {
    a = a.slice()
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t }
    return a
  }
  function runOk (list) {
    for (var i = 2; i < list.length; i++) {
      if (list[i].archetype === list[i - 1].archetype && list[i].archetype === list[i - 2].archetype) return false
    }
    return true
  }

  function build (cards, worldKey, opts) {
    opts = opts || {}
    var r = rng(opts.seed || Date.now())
    var hist = opts.history || {}
    var pool = cards.filter(function (c) { return c.world === worldKey })
    var seen = function (c) { return (hist[c.id] && hist[c.id].seen) || 0 }
    // unseen first, then least-seen; random within equal counts
    var ordered = shuffle(pool, r).sort(function (a, b) { return seen(a) - seen(b) })
    // warm-up: an easy archetype, preferably unseen
    var warm = ordered.filter(function (c) { return WARM[c.archetype] })[0] || ordered[0]
    // spaced review: the most recently helped card (not the warm-up)
    var helped = pool.filter(function (c) { return hist[c.id] && hist[c.id].helped > 0 && c !== warm })
      .sort(function (a, b) { return (hist[b.id].last || 0) - (hist[a.id].last || 0) })
    var review = helped[0] || null
    // greedy: take the next best card that does not make a third identical archetype in
    // a row, preferring a DIFFERENT archetype from the previous card (variety, PRD §5)
    var pick = [warm]
    var want = review ? [review] : []
    function fits (c, list) {
      var n = list.length
      return !(n >= 2 && list[n - 1].archetype === c.archetype && list[n - 2].archetype === c.archetype)
    }
    while (pick.length < SIZE) {
      if (want.length && pick.length === Math.min(3, SIZE - 1) && fits(want[0], pick)) { pick.push(want.shift()); continue }
      var prev = pick[pick.length - 1].archetype
      var cands = ordered.filter(function (c) { return pick.indexOf(c) < 0 && want.indexOf(c) < 0 && fits(c, pick) })
      if (!cands.length) cands = ordered.filter(function (c) { return pick.indexOf(c) < 0 })
      if (!cands.length) break
      var diff = cands.filter(function (c) { return c.archetype !== prev })
      pick.push((diff.length ? diff : cands)[0])
    }
    if (want.length && pick.indexOf(want[0]) < 0) {         // review not placed yet: swap into a fitting slot
      for (var k = SIZE - 1; k >= 1; k--) {
        var trial = pick.slice(); trial[k] = want[0]
        if (runOk(trial)) { pick = trial; break }
      }
    }
    return pick.slice(0, SIZE)
  }

  W.SDSession = { build: build, SIZE: SIZE }
  if (typeof module !== 'undefined' && module.exports) module.exports = W.SDSession
})()
