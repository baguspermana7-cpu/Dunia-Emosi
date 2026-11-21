/* CekCore — PRD-53 "Cek Kemampuan": the session rules, pure (no DOM), so tools/test-cek-items.mjs can replay them.
 *   ladder({practice, max, stopAfter})  items climb in difficulty; practice items are not scored;
 *                                        `stopAfter` wrong in a row ends the island (discontinue rule)
 *   span({start, tries, max})            memory span: start length 2, two tries per length, one right of the two
 *                                        moves up a length, two wrong at one length stops; best = longest length
 *                                        with a right answer (WMTB-C / WISC span administration)
 *   rng(seed)                            mulberry32, so a seed replays the same item
 * Rule constants are the PRD's table (L8): SPAN, SPEED_MS (85 s, the NIH Toolbox pattern-comparison length),
 * RATIOS (approximate-number ratios 1:2 -> 5:6, Halberda & Feigenson 2008).
 */
;(function (W) {
  'use strict'
  var SPAN = { start: 2, tries: 2, max: 9 }
  function rng (seed) {
    var a = (seed >>> 0) || 1
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  }
  function pick (r, arr) { return arr[Math.floor(r() * arr.length)] }
  function shuffle (r, arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t } return a }

  function ladder (o) {
    return { kind: 'ladder', practice: o.practice || 0, max: o.max, stopAfter: o.stopAfter || 3, phase: (o.practice ? 'practice' : 'test'), done: 0, idx: 0, raw: 0, miss: 0, log: [] }
  }
  function answer (s, right, ms) {
    if (s.phase === 'done') return s
    if (s.phase === 'practice') { s.done++; if (s.done >= s.practice) s.phase = 'test'; return s }
    s.log.push({ i: s.idx, ok: !!right, ms: ms | 0 }); s.idx++
    if (right) { s.raw++; s.miss = 0 } else s.miss++
    if (s.miss >= s.stopAfter || s.idx >= s.max) s.phase = 'done'
    return s
  }
  function span (o) {
    o = o || {}
    return { kind: 'span', len: o.start || SPAN.start, tries: o.tries || SPAN.tries, max: o.max || SPAN.max, t: 0, wrongHere: 0, best: 0, phase: 'test', log: [] }
  }
  function spanAnswer (s, right, ms) {
    if (s.phase === 'done') return s
    s.log.push({ len: s.len, ok: !!right, ms: ms | 0 })
    if (right) {
      s.best = Math.max(s.best, s.len)
      if (s.len >= s.max) { s.phase = 'done'; return s }
      s.len++; s.t = 0; s.wrongHere = 0; return s
    }
    s.wrongHere++; s.t++
    if (s.wrongHere >= s.tries) s.phase = 'done'
    return s
  }
  W.CekCore = { rng: rng, pick: pick, shuffle: shuffle, ladder: ladder, answer: answer, span: span, spanAnswer: spanAnswer,
    SPAN: SPAN, SPEED_MS: 85000, RATIOS: [[1, 2], [2, 3], [3, 4], [5, 6]], STOP_AFTER: 3 }
})(typeof window !== 'undefined' ? window : globalThis)
