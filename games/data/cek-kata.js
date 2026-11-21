/* CekKata — PRD-53 island "Pulau Kata" (verbal knowledge, Gc). Original items from the project's own labelled
 * pictures (DBLabeled, reviewed names):
 *   kata      hear a word (and see it written), pick its picture from 4 of the SAME group (NIH Toolbox Picture
 *             Vocabulary format). Items 1-16, groups climb from everyday (hewan, buah, kendaraan) to rarer
 *             (sains, musik, olahraga, sekolah)
 *   kelompok  two pictures from one group are shown; pick the one of 4 that belongs with them (items 17-24)
 * People and body groups (profesi, tubuh) are never used (hijab rule), nor colours (a colour is not a picture).
 * Reviewed on a contact sheet 2026-11-21: the pakaian, musik, olahraga and sekolah sprites are cropped (one shows
 * another sprite's label), so those groups are out; 'Bulan' reads as a biscuit, so it is out. In "kelompok", buah,
 * sayur and makanan are all food, so when the home group is food the wrong choices come from non-food groups;
 * a name found in two groups (Buku, Sepeda) is never used in "kelompok" (it would have two right answers).
 *   make(i, seed) -> { kind, word?, show?:[item,item], choices:[{group,name,cat,n}], answer }
 */
;(function (W) {
  'use strict'
  var C = W.CekCore, MAX = 24
  var LADDER = [['hewan', 'buah', 'kendaraan'], ['makanan', 'benda'], ['sayur', 'kendaraan'], ['sains', 'sayur']]
  var KEL = ['hewan', 'buah', 'kendaraan', 'makanan', 'sayur'], FOOD = { buah: 1, sayur: 1, makanan: 1 }, OUT = { Bulan: 1 }
  function data () { return W.DBLabeled._data }
  function items (g) { var d = data()[g]; return d.items.filter(function (it) { return !OUT[it[1]] }).map(function (it) { return { group: g, name: it[1], cat: d.cat, n: it[0] } }) }
  function dupNames () {
    var seen = {}, dup = {}
    Object.keys(data()).forEach(function (g) { data()[g].items.forEach(function (it) { if (seen[it[1]] && seen[it[1]] !== g) dup[it[1]] = 1; seen[it[1]] = g }) })
    return dup
  }
  function make (i, seed) {
    var r = C.rng(seed * 3371 + i * 13), out, ans
    if (i < 16) {
      var g = C.pick(r, LADDER[Math.min(3, Math.floor(i / 4))]), pool = C.shuffle(r, items(g)), names = {}
      out = []
      for (var k = 0; k < pool.length && out.length < 4; k++) if (!names[pool[k].name]) { names[pool[k].name] = 1; out.push(pool[k]) }
      ans = out[0]
      var order = C.shuffle(r, [0, 1, 2, 3])
      return { kind: 'kata', word: ans.name, choices: order.map(function (j) { return out[j] }), answer: order.indexOf(0) }
    }
    var dup = dupNames(), groups = C.shuffle(r, KEL), home = groups[0]
    var clean = function (g) { return C.shuffle(r, items(g).filter(function (x) { return !dup[x.name] })) }
    var hs = clean(home), show = [hs[0], hs[1]], right = hs[2]
    var others = groups.slice(1).filter(function (g) { return !(FOOD[home] && FOOD[g]) })
    var pool = C.shuffle(r, others.reduce(function (a, g) { return a.concat(clean(g).slice(0, 2)) }, []))
    var wrong = [], seenG = {}
    pool.forEach(function (x) { if (wrong.length < 3 && !seenG[x.group]) { seenG[x.group] = 1; wrong.push(x) } })
    pool.forEach(function (x) { if (wrong.length < 3 && wrong.indexOf(x) < 0) wrong.push(x) })
    out = [right].concat(wrong)
    var ord = C.shuffle(r, [0, 1, 2, 3])
    return { kind: 'kelompok', show: show, choices: ord.map(function (j) { return out[j] }), answer: ord.indexOf(0) }
  }
  W.CekKata = { make: make, MAX: MAX, LADDER: LADDER, KEL: KEL, FOOD: FOOD, OUT: OUT }
})(typeof window !== 'undefined' ? window : globalThis)
