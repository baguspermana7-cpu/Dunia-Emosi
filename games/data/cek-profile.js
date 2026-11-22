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
    var idx = rec.items && rec.ok && rec.items.length === rec.ok.length ? rec.items : null   // PRD-56: Cepat mode items are chosen adaptively
    var th = rec.ok && rec.ok.length ? I.theta(rec.ok, max, idx) : I.thetaOfRaw(Math.min(max - 0.5, Math.max(0.5, rec.raw)), max)
    var n = rec.ok && rec.ok.length ? rec.ok.length : Math.min(max, rec.raw + 3)
    return { z: (th - (a + b) / 2) / sd, rel: Math.max(0, Math.min(0.95, 1 - 1 / (I.info(th, n, max, idx) * sd * sd))) }
  }
  // PRD-56: the parts of a non-ladder island, each with its own reliability. PART_REL is the reliability of a part at
  // its Normal length (design values, stated in PRD-53/54: span parts .5 each = Ingat .75; dots .25 for 8 trials;
  // number line .5; the 85 s speed task .8). A Cepat sitting gives a part a fraction `LEN` of that length, and its
  // reliability follows Spearman-Brown. Parts are congeneric (each = sqrt(r) x the island + error), so two parts
  // correlate sqrt(r1 r2) and the unit-weighted sum has reliability S^2 / (S^2 + sum(1 - r)), S = sum sqrt(r).
  // Normal Ingat: S = 3 sqrt(.5) -> .75, exactly PRD-54's REL.ingat.
  var PART_REL = { 'angka-banyak': 0.25, 'ingat-maju': 0.5, 'ingat-mundur': 0.5, 'ingat-corsi': 0.5, 'angka-titik': 0.25, 'angka-garis': 0.5, 'angka-hitung': 0.5, cepat: 0.8 }
  var LEN = { cepat: { cepat: 45 / 85 } }
  function sb (r, k) { return k * r / (1 + (k - 1) * r) }
  function partRel (target, mode) { var r = PART_REL[target] || 0.5, k = (LEN[mode] || {})[target]; return k ? sb(r, k) : r }
  // PRD-56 (owner 2026-11-22): since PRD-55 turned the machine voice off, the Kata word and the story problems are shown
  // as text, so they measure reading in a grade-1 child, not vocabulary or arithmetic. They stay playable (stars,
  // points) but leave the IQ until there is sound.
  var IN_IQ = { pola: 1, bentuk: 1, ingat: 1, cepat: 1, angka: 1 }, NOT_IN_IQ_PART = { 'angka-hitung': 1 }
  function parts (id, rec, m, iqOnly) {
    var T = W.CekTargets, p = PARTS[id]; if (!T || !p || !rec) return []
    return p.filter(function (x) { return !(iqOnly && NOT_IN_IQ_PART[x[0]]) }).map(function (x) {
      var old = typeof rec[x[1]] !== 'number' && x[2]
      var zv = old ? zOne(rec[x[3]], T.get(x[2], m)) : zOne(rec[x[1]], T.get(x[0], m))
      return zv === null ? null : { z: zv, t: old ? x[2] : x[0], r: partRel(old ? x[2] : x[0], rec.mode) }
    }).filter(Boolean)
  }
  function z (id, rec, m, iqOnly) {
    if (!PARTS[id] || !rec) return null
    if (LADDER[id] && W.CekIRT) { var L = ladder(id, rec, m); if (L) return L.z }
    var ps = parts(id, rec, m, iqOnly); if (!ps.length) return null
    if (ps.length === 1) return ps[0].z
    var k = ps.length, rho = 0, np = 0
    for (var i = 0; i < k; i++) for (var j = i + 1; j < k; j++) { rho += Math.sqrt(ps[i].r * ps[j].r); np++ }
    return comp(ps.map(function (x) { return x.z }), rho / np)
  }
  function rel (id, rec, m, iqOnly) {
    if (LADDER[id] && W.CekIRT) { var L = ladder(id, rec, m); if (L) return L.rel }
    var ps = parts(id, rec, m, iqOnly); if (!ps.length) return REL[id] || 0.7
    var S = 0, E = 0; ps.forEach(function (x) { S += Math.sqrt(x.r); E += 1 - x.r })
    return S * S / (S * S + E)
  }
  // an island answered by guessing (median < 0.8 s) or with > 20 % wrong on the speed island is "kurang pasti"
  function reliable (rec) { return !!rec && !(rec.flags || []).some(function (f) { return f === 'cepat' || f === 'salah' }) }
  // ---------- PRD-56: the estimate on the child's ability scale ----------
  // PRD-54 shrank a unit-weighted composite toward 100 (Kelley). That estimates the true score of THAT form, in that
  // form's own units, so a shorter form (Cepat) would sit on a different scale than Normal. PRD-56 estimates the child's
  // latent general score G (SD 15 in the population) directly: every island i gives x_i = T_i + e_i, its true score T_i
  // (unit variance) plus error of known variance ev_i; true islands correlate R_TRUE; G is the standardised sum of the 5
  // true islands of the IQ battery. Under the normal model the best linear predictor is G^ = c' S^-1 x with
  // S = C_T + diag(ev), c_i = cov(G, T_i), and its error variance 1 - c' S^-1 c gives the 90 % range. One formula serves
  // Normal, Cepat, a mix, fewer islands and a retest (two sittings are two looks at the same T_i).
  //   x of a sitting: its z (in band units: the band is the Normal form's 25th-75th percentile, so its true variance is
  //   the Normal reliability rN) divided by sqrt(rN); ev = (1 - r) / r with r the reliability of THIS sitting's form
  //   relative to the same true variance (ladder: from test information; parts: PART_REL by Spearman-Brown).
  var BATTERY = 5   // islands in the IQ (IN_IQ)
  var rTrue = {}
  // true-island correlation: the stated observed correlation between islands (R_ISLAND .45) over their mean Normal
  // reliability at this age (cached per month)
  function R_TRUE (m) {
    m = m || 84
    if (rTrue[m] !== undefined) return rTrue[m]
    var ids = Object.keys(IN_IQ), sum = 0
    ids.forEach(function (id) { sum += popRel(id, m) })
    rTrue[m] = Math.min(0.95, R_ISLAND / (sum / ids.length)); return rTrue[m]
  }
  // the reliability of the Normal form for a child in the middle of the band (its true variance in band units)
  function popRel (id, m) {
    if (LADDER[id]) {
      var t = W.CekTargets && W.CekTargets.get(id, m), max = id === 'bentuk' ? 20 : 24
      if (!t) return 0.6
      var L = ladder(id, { raw: Math.round((t.lo + t.hi) / 2), max: max }, m); return L ? L.rel : 0.6
    }
    var S = 0, E = 0
    PARTS[id].forEach(function (x) { if (!NOT_IN_IQ_PART[x[0]]) { var r = PART_REL[x[0]]; S += Math.sqrt(r); E += 1 - r } })
    return S * S / (S * S + E)
  }
  // one sitting -> { x, ev } on the true scale of island id (null when it gives nothing)
  function look (id, rec, m, laterSitting) {
    if (!rec) return null
    var rN = popRel(id, m), pz = laterSitting ? PRACTICE_Z : 0
    if (LADDER[id] && W.CekIRT) {
      var L = ladder(id, rec, m); if (!L) return null
      var errBand = Math.max(1e-6, 1 - L.rel)   // L.rel = 1 - 1/(info sd^2), in band units
      return { x: (L.z - pz) / Math.sqrt(rN), ev: errBand / rN }
    }
    var ps = parts(id, rec, m, true); if (!ps.length) return null
    var P = 0, X = 0
    ps.forEach(function (q) {
      var target = q.t, rn = PART_REL[target] || 0.5, rm = q.r, ev = (1 - rm) / rm
      X += ((q.z - pz) / Math.sqrt(rn)) / ev; P += 1 / ev
    })
    return { x: X / P, ev: 1 / P }
  }
  function island (id, list, m) {
    if (!IN_IQ[id]) return null
    var l = list || [], last = l[l.length - 1]; if (!reliable(last)) return null   // a flagged latest sitting leaves the IQ until redone
    var prev = l.length > 1 && reliable(l[l.length - 2]) ? l[l.length - 2] : null
    var b1 = look(id, last, m, false); if (!b1) return null
    var looks = [b1]
    if (prev && (last.at || 0) - (prev.at || 0) >= 7 * 864e5) {
      var b0 = look(id, prev, m, false), b1r = look(id, last, m, true)
      if (b0 && b1r) looks = [b0, b1r]
    }
    var P = 0, X = 0; looks.forEach(function (q) { X += q.x / q.ev; P += 1 / q.ev })
    var ev = 1 / P
    return { id: id, x: X / P, ev: ev, rel: 1 / (1 + ev), n: looks.length, mode: last.mode === 'cepat' ? 'cepat' : 'normal' }
  }
  function solve (A, y) {   // Gaussian elimination with partial pivoting (A is small and positive definite)
    var n = y.length, M = A.map(function (r, i) { return r.concat([y[i]]) })
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
      var t = M[c]; M[c] = M[p]; M[p] = t
      for (var r2 = c + 1; r2 < n; r2++) { var f = M[r2][c] / M[c][c]; for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k] }
    }
    var out = new Array(n)
    for (var i = n - 1; i >= 0; i--) { var s2 = M[i][n]; for (var j = i + 1; j < n; j++) s2 -= M[i][j] * out[j]; out[i] = s2 / M[i][i] }
    return out
  }
  // is = [{ x, ev }] over the reliable islands -> the shown estimate (pure; tools/test-cek-items.mjs, tools/sim-cek-iq.mjs)
  function composite (is, rt) {
    var k = is.length; if (k < 3) return null
    rt = rt || R_TRUE(84)
    var cg = (1 + (BATTERY - 1) * rt) / Math.sqrt(BATTERY + BATTERY * (BATTERY - 1) * rt)
    var S = is.map(function (a, i) { return is.map(function (b, j) { return i === j ? 1 + a.ev : rt }) })
    var c = is.map(function () { return cg })
    var w = solve(S, c)
    var g = 0, v = 0; for (var i = 0; i < k; i++) { g += w[i] * is[i].x; v += w[i] * c[i] }
    var sdPost = Math.sqrt(Math.max(0, 1 - v))
    var iqv = Math.max(55, Math.min(145, Math.round(100 + 15 * g)))
    var half = 1.645 * 15 * sdPost
    return { iq: iqv, lo: Math.max(40, Math.round(100 + 15 * g - half)), hi: Math.min(160, Math.round(100 + 15 * g + half)), islands: k,
      g: g, sd: 15 * sdPost, rel: Math.round(v * 100) / 100 }
  }
  function iq (res, m) {
    var is = Object.keys(IN_IQ).map(function (id) { return island(id, res && res[id], m) }).filter(Boolean)
    var e = composite(is, R_TRUE(m)); if (e) e.mode = modeOf(res)
    return e
  }
  // PRD-56: where a Cepat ladder starts: the centre of the child's age band, in logits
  function startTheta (id, m, max) {
    var I = W.CekIRT, t = W.CekTargets && W.CekTargets.get(id, m); if (!I || !t) return 0
    return (I.thetaOfRaw(t.lo, max) + I.thetaOfRaw(t.hi, max)) / 2
  }
  // the mode of the sittings an IQ is made of: 'normal', 'cepat' or 'campuran'
  function modeOf (res) {
    var ms = {}; Object.keys(IN_IQ).forEach(function (id) { var l = res && res[id]; var r = l && l[l.length - 1]; if (r && reliable(r)) ms[r.mode === 'cepat' ? 'cepat' : 'normal'] = 1 })
    var k = Object.keys(ms); return k.length > 1 ? 'campuran' : k[0] || 'normal'
  }
  function stars (zv) { return zv === null || zv === undefined ? 1 : zv >= 0.675 ? 3 : zv >= -0.675 ? 2 : 1 }
  function points (rec) {
    if (!rec) return 0
    var n = (rec.raw || 0) + (rec.maju || 0) + (rec.mundur || 0) + (rec.corsi || 0) + (rec.hitung || 0) + (rec.banyak || 0) + Math.round(rec.rate || 0)
    if (typeof rec.garis === 'number') n += Math.max(0, Math.round((30 - rec.garis) / 3))
    return n * 10
  }
  // PRD-56 Cepat mode: items per adaptive island, set by tools/sim-cek-iq.mjs (Cepat RMSE <= 1.2 x Normal at <= 55 % of the time)
  var CAT_N = { pola: 10, bentuk: 9, kata: 10 }
  W.CekProfile = { CAT_N: CAT_N, R_TRUE: R_TRUE, popRel: popRel, look: look, partRel: partRel, IN_IQ: IN_IQ, startTheta: startTheta, modeOf: modeOf, composite: composite, reliable: reliable, rel: rel, island: island, R_ISLAND: R_ISLAND, PRACTICE_Z: PRACTICE_Z, months: months, z: z, iq: iq, stars: stars, points: points, PARTS: PARTS, label: label, flags: flags, median: median, ageMonths: ageMonths, basisText: basisText, LABELS: LABELS, FLAG_TEXT: FLAG_TEXT }
})(typeof window !== 'undefined' ? window : globalThis)
