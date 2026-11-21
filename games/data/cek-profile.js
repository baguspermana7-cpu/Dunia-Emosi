/* CekProfile — PRD-53: turns island results into the parent's "Profil Kemampuan". Pure functions.
 *   label(value, target)   "Perlu latihan" / "Sesuai usia" / "Kuat" against the target band (CekTargets)
 *   flags({ms, durMs, planMs, errRate})  reliability: 'cepat' (median answer < 0.8 s: guessing),
 *                          'lama' (session > 2x its planned time), 'salah' (speed island errors > 20 %)
 *   ageMonths('YYYY-MM', now)  the child's age in whole months (targets are read per month band)
 *   basisText(target)      'perkiraan' for a design target, 'kurikulum' / 'penelitian' otherwise
 *   months(band)           age band from the name screen ('5-6' | '7-8' | '9-10') -> months used for the targets
 *   z(id, rec, months)     one island's standing: each target band [lo, hi] is read as the middle half of children
 *                          (25th-75th percentile), so SD = (hi - lo) / 1.35 and z = (value - mid) / SD; an island with
 *                          several parts (Ingat, Angka) averages its parts; lower-is-better targets flip the sign
 *   iq(res, months)        "Perkiraan IQ" = 100 + 15 x mean z over the islands done, rounded, kept in 55-145; needs
 *                          3 islands (null before). A rough game estimate, shown with a +-15 range, not a test score
 *                          (Canivez & Youngstrom 2019 on the limits of ability profiles)
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
    angka: [['angka-banyak', 'banyak'], ['angka-garis', 'garis'], ['angka-hitung', 'hitung']]
  }
  function zOne (v, t) {
    if (!t || typeof v !== 'number' || isNaN(v)) return null
    var sd = Math.max(0.5, (t.hi - t.lo) / 1.35), z = (v - (t.lo + t.hi) / 2) / sd
    return t.lowerBetter ? -z : z
  }
  function z (id, rec, m) {
    var T = W.CekTargets, p = PARTS[id]; if (!T || !p || !rec) return null
    var mm = T.near(m), zs = p.map(function (x) { return zOne(rec[x[1]], T.get(x[0], mm)) }).filter(function (x) { return x !== null })
    return zs.length ? zs.reduce(function (a, b) { return a + b }, 0) / zs.length : null
  }
  // an island answered by guessing (median < 0.8 s) or with > 20 % wrong on the speed island is "kurang pasti"
  function reliable (rec) { return !!rec && !(rec.flags || []).some(function (f) { return f === 'cepat' || f === 'salah' }) }
  function iq (res, m) {
    var zs = Object.keys(PARTS).map(function (id) { var r = res && res[id], rec = r && r.length ? r[r.length - 1] : null; return reliable(rec) ? z(id, rec, m) : null }).filter(function (x) { return x !== null })
    if (zs.length < 3) return null
    var v = Math.round(100 + 15 * zs.reduce(function (a, b) { return a + b }, 0) / zs.length)
    v = Math.max(55, Math.min(145, v))
    return { iq: v, lo: Math.max(40, v - 15), hi: Math.min(160, v + 15), islands: zs.length }
  }
  function stars (zv) { return zv === null || zv === undefined ? 1 : zv >= 0.675 ? 3 : zv >= -0.675 ? 2 : 1 }
  function points (rec) {
    if (!rec) return 0
    var n = (rec.raw || 0) + (rec.maju || 0) + (rec.mundur || 0) + (rec.corsi || 0) + (rec.hitung || 0) + (rec.banyak || 0) + Math.round(rec.rate || 0)
    if (typeof rec.garis === 'number') n += Math.max(0, Math.round((30 - rec.garis) / 3))
    return n * 10
  }
  W.CekProfile = { reliable: reliable, months: months, z: z, iq: iq, stars: stars, points: points, PARTS: PARTS, label: label, flags: flags, median: median, ageMonths: ageMonths, basisText: basisText, LABELS: LABELS, FLAG_TEXT: FLAG_TEXT }
})(typeof window !== 'undefined' ? window : globalThis)
