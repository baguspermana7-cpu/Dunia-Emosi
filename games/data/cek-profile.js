/* CekProfile — PRD-53: turns island results into the parent's "Profil Kemampuan". Pure functions.
 *   label(value, target)   "Perlu latihan" / "Sesuai usia" / "Kuat" against the target band (CekTargets)
 *   flags({ms, durMs, planMs, errRate})  reliability: 'cepat' (median answer < 0.8 s: guessing),
 *                          'lama' (session > 2x its planned time), 'salah' (speed island errors > 20 %)
 *   ageMonths('YYYY-MM', now)  the child's age in whole months (targets are read per month band)
 *   basisText(target)      'perkiraan' for a design target, 'kurikulum' / 'penelitian' otherwise
 *   months(band)           age band from the name screen ('5-6' | '7-8' | '9-10') -> months used for the targets
 *   z(id, rec, months)     one island's standing: each target band [lo, hi] is read as the middle half of children
 *                          (25th-75th percentile), so SD = (hi - lo) / 1.35 and z = (value - mid) / SD. Ladder islands
 *                          (Pola, Bentuk, Kata) are scored on the Rasch logit scale from the answer pattern (CekIRT);
 *                          an island with several parts (Ingat, Angka) is the standardised composite of its parts
 *                          (part intercorrelation RHO_PART); lower-is-better targets flip the sign
 *   rel(id, rec, months)   the island's reliability: from Rasch information for a ladder island, a stated value otherwise
 *   iq(res, months)        PRD-54 "Perkiraan IQ". Over the reliable islands done (needs 3):
 *                            composite zc = sum z / sqrt(k + k(k-1) R)            (Tellegen & Briggs 1967; R = R_ISLAND)
 *                            reliability rc = 1 - sum(1 - rxx) / (k + k(k-1) R)   (Mosier 1943)
 *                            shown       = 100 + 15 rc zc                         (Kelley 1927 true-score estimate)
 *                            90 % range  = shown +- 1.645 x 15 sqrt(rc (1 - rc))  (standard error of estimate)
 *                          An island redone 7+ days later averages both sittings after taking PRACTICE_Z off the
 *                          second (practice gain), and its reliability rises by Spearman-Brown (k = 2).
 *                          Returns { iq, lo, hi, islands, obs (the composite before Kelley), rel }. A game estimate,
 *                          not a test score (Canivez & Youngstrom 2019 on the limits of ability profiles)
 *   reliable(rec)         false when the island was guessed (flag 'cepat') or the speed island had > 20 % wrong
 *                          ('salah'); such an island is shown as "kurang pasti" and left out of iq()
 *   stars(z) 1-3 stars for the island card; points(rec) the points shown after an island
 */
;(function (W) {
  'use strict'
  var LABELS = { low: 'Perlu latihan', mid: 'Sesuai usia', high: 'Kuat' }
  function label (v, t) {
    if (!t || typeof v !== 'number' || isNaN(v)) return ''
    var lo = v < t.lo, hi = v > t.hi
    if (t.lowerBetter) return lo ? LABELS.high : hi ? LABELS.low : LABELS.mid
    return lo ? LABELS.low : hi ? LABELS.high : LABELS.mid
  }
  function median (a) { var s = a.filter(function (x) { return x > 0 }).sort(function (x, y) { return x - y }); if (!s.length) return 0; var m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
  function flags (r) {
    var f = [], ms = r.ms || []
    if (ms.length >= 4 && median(ms) < 800) f.push('cepat')
    if (r.planMs && r.durMs > 2 * r.planMs) f.push('lama')
    if (typeof r.errRate === 'number' && r.errRate > 0.2) f.push('salah')
    return f
  }
  var FLAG_TEXT = { cepat: 'menjawab sangat cepat (mungkin menebak)', lama: 'sesi jauh lebih lama dari biasanya', salah: 'banyak salah di soal kecepatan' }
  function ageMonths (birth, now) {
    var m = /^(\d{4})-(\d{1,2})$/.exec(String(birth || '')); if (!m) return null
    now = now || new Date()
    var a = (now.getFullYear() - +m[1]) * 12 + (now.getMonth() + 1 - +m[2])
    return a >= 0 && a < 240 ? a : null
  }
  function basisText (t) { return !t ? '' : t.kind === 'design' ? 'perkiraan' : t.kind === 'curriculum' ? 'kurikulum' : 'penelitian' }
  var BANDS = { '5-6': 78, '7-8': 90, '9-10': 114 }
  function months (band) { return BANDS[band] || 90 }
  var PARTS = {
    pola: [['pola', 'raw']], bentuk: [['bentuk', 'raw']], kata: [['kata', 'raw']], cepat: [['cepat', 'rate']],
    ingat: [['ingat-maju', 'maju'], ['ingat-mundur', 'mundur'], ['ingat-corsi', 'corsi']],
    angka: [['angka-titik', 'titik', 'angka-banyak', 'banyak'], ['angka-garis', 'garis'], ['angka-hitung', 'hitung']]   // [target, key, old target, old key]
  }
  // design constants, each stated (PRD-54 B4-B6). R_ISLAND .45: a design value; the WISC-V subtest correlation tables are
  // not open (read 2026-11-21); the open WMTB-C table gives .38 for digit forward vs backward at 6-7 (Gathercole et al. 2004 T4). RHO_PART: parts of one island (span forward/backward/Corsi; dots/line/sums) share more, .5.
  // REL: reliability of the non-ladder islands. Ingat: three parts at RHO_PART by Spearman-Brown = .75. Angka .65: its dot
  // part alone is about .25 (8 trials; binomial noise against the spread of grade-1 Weber fractions, see angka-titik).
  // Cepat: one 85 s speed task, .8 (design, below the usual test-retest of pattern-comparison tasks).
  // PRACTICE_Z: retest gain per subtest about one month later: WISC-IV d .13-.48, Digit Span .18, Matrix Reasoning .23
  // (Williams, Weiss & Rolfhus 2003, WISC-IV Technical Report 2, Table 2); .2 is the subtest middle.
  var R_ISLAND = 0.45, RHO_PART = 0.5, REL = { ingat: 0.75, cepat: 0.8, angka: 0.65 }, PRACTICE_Z = 0.2, LADDER = { pola: 1, bentuk: 1, kata: 1 }
  function zOne (v, t) {
    if (!t || typeof v !== 'number' || isNaN(v)) return null
    var sd = Math.max(0.5, (t.hi - t.lo) / 1.35), z = (v - (t.lo + t.hi) / 2) / sd
    return t.lowerBetter ? -z : z
  }
  function comp (zs, r) { var k = zs.length; return zs.reduce(function (a, b) { return a + b }, 0) / Math.sqrt(k + k * (k - 1) * r) }
  // a ladder island on the logit scale: the band's raw counts become logits through the test curve, the child's logit
  // comes from the answer pattern (old records kept only the raw count: that count is read through the same curve)
  function ladder (id, rec, m) {
    var I = W.CekIRT, t = W.CekTargets.get(id, m), max = rec.max || 24; if (!I || !t || typeof rec.raw !== 'number') return null
    var a = I.thetaOfRaw(t.lo, max), b = I.thetaOfRaw(t.hi, max), sd = Math.max(0.2, (b - a) / 1.35)
    var th = rec.ok && rec.ok.length ? I.theta(rec.ok, max) : I.thetaOfRaw(Math.min(max - 0.5, Math.max(0.5, rec.raw)), max)
    var n = rec.ok && rec.ok.length ? rec.ok.length : Math.min(max, rec.raw + 3)
    return { z: (th - (a + b) / 2) / sd, rel: Math.max(0, Math.min(0.95, 1 - 1 / (I.info(th, n, max) * sd * sd))) }
  }
  function z (id, rec, m) {
    var T = W.CekTargets, p = PARTS[id]; if (!T || !p || !rec) return null
    if (LADDER[id] && W.CekIRT) { var L = ladder(id, rec, m); if (L) return L.z }
    var zs = p.map(function (x) { return typeof rec[x[1]] !== 'number' && x[2] ? zOne(rec[x[3]], T.get(x[2], m)) : zOne(rec[x[1]], T.get(x[0], m)) }).filter(function (x) { return x !== null })
    return zs.length ? comp(zs, RHO_PART) : null
  }
  function rel (id, rec, m) {
    if (LADDER[id] && W.CekIRT) { var L = ladder(id, rec, m); if (L) return L.rel }
    return REL[id] || 0.7
  }
  // an island answered by guessing (median < 0.8 s) or with > 20 % wrong on the speed island is "kurang pasti"
  function reliable (rec) { return !!rec && !(rec.flags || []).some(function (f) { return f === 'cepat' || f === 'salah' }) }
  // one island's z and reliability from its saved sittings (the page keeps the last two)
  function island (id, list, m) {
    var l = list || [], last = l[l.length - 1]; if (!reliable(last)) return null   // a flagged latest sitting leaves the IQ until redone
    var prev = l.length > 1 && reliable(l[l.length - 2]) ? l[l.length - 2] : null
    var z1 = z(id, last, m); if (z1 === null) return null
    var r1 = rel(id, last, m)
    if (prev && (last.at || 0) - (prev.at || 0) >= 7 * 864e5) {
      var z0 = z(id, prev, m)
      if (z0 !== null) { var rr = (rel(id, prev, m) + r1) / 2; return { z: (z0 + z1 - PRACTICE_Z) / 2, rel: 2 * rr / (1 + rr), n: 2 } }
    }
    return { z: z1, rel: r1, n: 1 }
  }
  // is = [{ z, rel }] over the reliable islands -> the shown estimate (pure; tools/test-cek-items.mjs Q1, tools/sim-cek-iq.mjs)
  function composite (is) {
    var k = is.length; if (k < 3) return null
    var den = k + k * (k - 1) * R_ISLAND
    var zc = comp(is.map(function (x) { return x.z }), R_ISLAND)
    var rc = Math.max(0.3, 1 - is.reduce(function (a, x) { return a + (1 - x.rel) }, 0) / den)
    var v = Math.max(55, Math.min(145, Math.round(100 + 15 * rc * zc)))
    var half = 1.645 * 15 * Math.sqrt(rc * (1 - rc))
    return { iq: v, lo: Math.max(40, Math.round(v - half)), hi: Math.min(160, Math.round(v + half)), islands: k,
      obs: Math.round(100 + 15 * zc), rel: Math.round(rc * 100) / 100 }
  }
  function iq (res, m) {
    return composite(Object.keys(PARTS).map(function (id) { return island(id, res && res[id], m) }).filter(Boolean))
  }
  function stars (zv) { return zv === null || zv === undefined ? 1 : zv >= 0.675 ? 3 : zv >= -0.675 ? 2 : 1 }
  function points (rec) {
    if (!rec) return 0
    var n = (rec.raw || 0) + (rec.maju || 0) + (rec.mundur || 0) + (rec.corsi || 0) + (rec.hitung || 0) + (rec.banyak || 0) + Math.round(rec.rate || 0)
    if (typeof rec.garis === 'number') n += Math.max(0, Math.round((30 - rec.garis) / 3))
    return n * 10
  }
  W.CekProfile = { composite: composite, reliable: reliable, rel: rel, island: island, R_ISLAND: R_ISLAND, PRACTICE_Z: PRACTICE_Z, months: months, z: z, iq: iq, stars: stars, points: points, PARTS: PARTS, label: label, flags: flags, median: median, ageMonths: ageMonths, basisText: basisText, LABELS: LABELS, FLAG_TEXT: FLAG_TEXT }
})(typeof window !== 'undefined' ? window : globalThis)
