/* CekAngka — PRD-53 island "Pulau Angka" (quantitative reasoning, Gq). Three parts, run one after another:
 *   banyak  two dot sets, "mana yang lebih banyak?"; ratios 1:2, 2:3, 3:4, 5:6, two trials each (8). Half the trials
 *           match TOTAL dot area across the two sets, half match dot SIZE, so neither size nor area gives the answer
 *           (Halberda & Feigenson 2008 method). value = the hardest ratio level with both trials right (0-4)
 *   garis   a number line, tap where the number goes: 0-20 (3), then 0-100 (4); value = mean % absolute error on the
 *           0-100 lines (Siegler & Booth 2004; Booth & Siegler 2006: grade-1 mean 12 %)
 *   hitung  short story sums to 10, then to 20, with picture counters (8); ladder, 3 wrong in a row stops
 *           (Capaian Pembelajaran Fase A: add/subtract to 20)
 *   dots(level, seed, kind) -> { a:[{x,y,r}], b:[...], na, nb, ratio:[p,q], more:'a'|'b', kind:'area'|'size' }
 *   line(i, seed)  -> { max, n }          story(i, seed) -> { text, a, b, op, ans, choices:[3], answer, pic }
 */
;(function (W) {
  'use strict'
  var C = W.CekCore
  var BASES = [[[4, 8], [5, 10], [6, 12]], [[6, 9], [8, 12], [10, 15]], [[6, 8], [9, 12], [12, 16]], [[10, 12], [15, 18], [10, 12]]]
  function place (r, n, rad) {   // non-overlapping dots in a 100x100 box
    var out = []
    for (var tries = 0; out.length < n && tries < 4000; tries++) {
      var p = { x: rad + r() * (100 - 2 * rad), y: rad + r() * (100 - 2 * rad), r: rad }
      if (out.every(function (q) { return Math.hypot(p.x - q.x, p.y - q.y) > p.r + q.r + 1.5 })) out.push(p)
    }
    return out
  }
  function dots (level, seed, kind) {
    var r = C.rng(seed * 2741 + level * 17), base = C.pick(r, BASES[level - 1]), more = r() < 0.5 ? 'a' : 'b'
    var nSmall = base[0], nBig = base[1], rBig = 5.2, rSmall = rBig
    if (kind === 'area') rSmall = rBig * Math.sqrt(nBig / nSmall)   // equal total area: the smaller set has bigger dots
    var big = place(r, nBig, rBig), small = place(r, nSmall, rSmall)
    return { a: more === 'a' ? big : small, b: more === 'a' ? small : big, na: more === 'a' ? nBig : nSmall, nb: more === 'a' ? nSmall : nBig,
      ratio: C.RATIOS[level - 1], more: more, kind: kind }
  }
  var LINES = [{ max: 20 }, { max: 20 }, { max: 20 }, { max: 100 }, { max: 100 }, { max: 100 }, { max: 100 }]
  function line (i, seed) { var r = C.rng(seed * 811 + i), L = LINES[i]; var n = L.max === 20 ? 2 + Math.floor(r() * 17) : 3 + Math.floor(r() * 95); return { max: L.max, n: n } }
  function pae (placed, n, max) { return Math.abs(placed - n) / max * 100 }
  var THINGS = [['apel', 'buah', 'Apel'], ['bola', 'benda', 'Bola'], ['ikan', 'hewan', 'Ikan'], ['bebek', 'hewan', 'Bebek']]   // counters drawn from DBLabeled by name
  function story (i, seed) {
    var r = C.rng(seed * 4093 + i * 7), lim = i < 4 ? 10 : 20, op = r() < 0.55 ? '+' : '-', a, b, ans
    if (op === '+') { a = 1 + Math.floor(r() * (lim - 2)); b = 1 + Math.floor(r() * (lim - a - 0.0001)); ans = a + b }
    else { a = 3 + Math.floor(r() * (lim - 2)); b = 1 + Math.floor(r() * (a - 1)); ans = a - b }
    var t = THINGS[Math.floor(r() * THINGS.length)], name = t[0]
    var text = op === '+' ? 'Ada ' + a + ' ' + name + '. Datang lagi ' + b + ' ' + name + '. Sekarang ada berapa ' + name + '?'
      : 'Ada ' + a + ' ' + name + '. Diambil ' + b + ' ' + name + '. Tinggal berapa ' + name + '?'
    var set = [ans], cand = C.shuffle(r, [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, a, b])
    for (var k = 0; set.length < 3 && k < cand.length; k++) if (cand[k] >= 0 && cand[k] <= 30 && set.indexOf(cand[k]) < 0) set.push(cand[k])
    var order = C.shuffle(r, [0, 1, 2])
    return { text: text, a: a, b: b, op: op, ans: ans, choices: order.map(function (j) { return set[j] }), answer: order.indexOf(0), pic: { group: t[1], name: t[2] } }
  }
  W.CekAngka = { dots: dots, line: line, pae: pae, story: story, N_DOTS: 8, N_LINES: LINES.length, N_STORY: 8 }
})(typeof window !== 'undefined' ? window : globalThis)
