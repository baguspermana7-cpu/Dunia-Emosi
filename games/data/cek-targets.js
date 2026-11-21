/* CekTargets — PRD-53: what a grade-1 child (72-95 months) is expected to reach on each island.
 * These are TARGETS, not norms. CekProfile.iq reads each band as the middle half of children (25th-75th percentile)
 * to give a rough "Perkiraan IQ"; it is an estimate, shown as one. Every line says where it comes from (L7):
 *   kind 'published'  a number read from the cited study; `quote` is the sentence it came from
 *   kind 'curriculum' the Indonesian grade-1 learning outcome (Capaian Pembelajaran Fase A)
 *   kind 'design'     an estimate where no open table could be read; the parent page shows it as "perkiraan"
 * A band [lo, hi] is "Sesuai usia"; below is "Perlu latihan", above is "Kuat". `lowerBetter` flips it (an error %).
 * Sources were read 2026-11-21. Closed or unreachable full texts are named in `note`, never filled from memory.
 */
;(function (W) {
  'use strict'
  var GATHERCOLE = 'Gathercole, Pickering, Ambridge & Wearing (2004) Dev Psychol 40:177-190; WISC-V span administration'
  var T = [
    { id: 'pola', unit: 'soal benar dari 24', kind: 'design', src: 'Indonesian CPM norms: Gusniarti, Rachmawati, Wibisono, Annatagia, Agustina & Rumiani (2021) JP3I 10(2):172-183, Table 7 (Yogyakarta, n = 1779); Schneider & McGrew 2018 (Gf)',
      quote: 'CPM raw out of 36, age 6.5 (n = 40): P25 14.25, P50 18.50, P75 22.75; age 7.5 (n = 148): P25 18.00, P50 23.00, P75 27.00',
      note: 'PRD-54: the Indonesian percentiles scaled from 36 to our 24 CPM-format items (x 2/3): 6.5 y -> 9.5-15, 7.5 y -> 12-18. A linear scaling, not an equating: our items are our own, so the band stays "design".',
      bands: [{ from: 72, to: 83, lo: 9.5, hi: 15 }, { from: 84, to: 95, lo: 12, hi: 18 }] },
    { id: 'bentuk', unit: 'soal benar dari 20', kind: 'design', src: 'Frick, Moehring & Newcombe (2014) TiCS 18:536; Frick, Ferrara & Newcombe (2013)',
      note: '2D rotation is still developing at 5-7 years; mirror images are the usual error.',
      bands: [{ from: 72, to: 83, lo: 7, hi: 13 }, { from: 84, to: 95, lo: 9, hi: 15 }] },
    { id: 'ingat-maju', unit: 'gambar berurutan (maju)', kind: 'design', src: GATHERCOLE,
      note: 'Read 2026-11-21 (PRD-54): WMTB-C Digit Recall 6-7 y M 25.58 SD 3.63 lists correct (Gathercole 2004 Table 2); NLSY WISC-R forward at 7 y M 5.0-5.5 SD 1.7-2.1 (units not defined). Neither is in span lengths, so the band stays an estimate; lists/6 puts the mean near span 4.3-5.',
      bands: [{ from: 72, to: 83, lo: 4, hi: 5 }, { from: 84, to: 95, lo: 4, hi: 6 }] },
    { id: 'ingat-mundur', unit: 'gambar berurutan (mundur)', kind: 'design', src: GATHERCOLE,
      note: 'Backward span is shorter than forward at every age (Gathercole 2004; Giofre et al. 2016).',
      bands: [{ from: 72, to: 83, lo: 2, hi: 3 }, { from: 84, to: 95, lo: 2, hi: 4 }] },
    { id: 'ingat-corsi', unit: 'kotak berurutan', kind: 'design', src: 'Pagulayan et al. (2006) J Clin Exp Neuropsychol 28:1043 (Corsi norms from grade 1)',
      note: 'Pagulayan 2006 table is behind a paywall. Closest open proxy: WMTB-C Block Recall 6-7 y M 22.77 SD 3.67 lists correct (Gathercole 2004 Table 2), near span 4; band = estimate.',
      bands: [{ from: 72, to: 83, lo: 3, hi: 4 }, { from: 84, to: 95, lo: 4, hi: 5 }] },
    { id: 'kata', unit: 'soal benar dari 24', kind: 'design', src: 'NIH Toolbox Picture Vocabulary format (Gershon et al. 2013 Monogr Soc Res Child Dev 78:49-69); items from this game\'s own labelled pictures',
      note: 'The items are new and Indonesian; no norm exists for them. Band = estimate to be checked against real results.',
      bands: [{ from: 72, to: 83, lo: 12, hi: 18 }, { from: 84, to: 95, lo: 14, hi: 20 }] },
    { id: 'cepat', unit: 'jawaban benar per menit', kind: 'design', src: 'NIH Toolbox Pattern Comparison format, 85 s (Carlozzi et al. 2013 Monogr Soc Res Child Dev 78:88-102)',
      note: 'NIH Pattern Comparison number correct in 90 s: age 6 M 40.5 SD 7.9, age 7 M 43.2 SD 7.4 (Carlozzi et al. 2015 Arch Clin Neuropsychol 30:359, Table 3). Our pairs differ in one subtle thing (count, turn), so they take longer; the band stays an estimate. More than 20 % wrong flags the result.',
      bands: [{ from: 72, to: 83, lo: 12, hi: 20 }, { from: 84, to: 95, lo: 15, hi: 24 }] },
    { id: 'angka-garis', unit: '% meleset di garis bilangan 0-100', lowerBetter: true, kind: 'published',
      src: 'Booth & Siegler (2006) Dev Psychol 42:189-201; Siegler & Booth (2004) Child Dev 75:428-444',
      quote: 'kindergartners (percent absolute error = 24% in both studies), first graders (14% vs. 12%), and second graders (10% in both studies)',
      note: 'Re-read 2026-11-21: grade 1 n = 25, mean age 6.8 y, PAE 12 % (Booth & Siegler 2006 Exp. 1, p. 191). Band: grade-1 mean 12-14 %; better than the grade-2 mean (10 %) is "Kuat"; nearer the kindergarten mean (24 %) than grade 1 is "Perlu latihan".',
      bands: [{ from: 72, to: 95, lo: 10, hi: 18 }] },
    { id: 'angka-titik', unit: 'titik benar dari 8', kind: 'design',
      src: 'Lonnemann, Linkersdorfer, Hasselhorn & Lindberg (2013) Front Psychol 4:783, Table 1; Halberda & Feigenson (2008) model',
      quote: 'grade 1 (n = 67, mean age 87 months): Weber fraction w M 0.35, SD 0.14',
      note: 'PRD-54: with p(right) = Phi((q - p) / (w sqrt(p^2 + q^2))) over our 8 trials (ratios 1:2, 2:3, 3:4, 5:6, two each), w = .35 gives 6.1 right; the spread of w (SD .14) plus the guessing of 8 trials gives an observed SD of about 1.4, so the middle half is 5.2-7.0. Old records scored the hardest level instead (angka-banyak).',
      bands: [{ from: 72, to: 95, lo: 5.2, hi: 7 }] },
    { id: 'angka-banyak', unit: 'perbandingan terkecil yang benar', kind: 'design', src: 'Halberda & Feigenson (2008) Dev Psychol 44:1457-1465',
      note: 'Acuity improves from about 3:4 at 3 years to 5:6 at 6 years (as reviewed); the paper full text was blocked (2026-11-21). Level 1=1:2, 2=2:3, 3=3:4, 4=5:6. PRD-54: kept only to read records saved before angka-titik; the level separates children poorly (model: w .26 -> 3.2, w .44 -> 2.8).',
      bands: [{ from: 72, to: 95, lo: 3, hi: 4 }] },
    { id: 'angka-hitung', unit: 'soal cerita benar dari 8', kind: 'curriculum',
      src: 'Capaian Pembelajaran Matematika Fase A, SK Kepala BSKAP No. 032/H/KR/2024',
      note: 'By the end of Fase A (grade 1-2) a child adds and subtracts whole numbers to 20; mid grade 1 is still on the way.',
      bands: [{ from: 72, to: 83, lo: 3, hi: 6 }, { from: 84, to: 95, lo: 4, hi: 7 }] }
  ]
  // PRD-54 B3: a band is the expectation at its centre month; between two centres the edges are read on the straight
  // line between them, so a child of 89 months is not scored as one of 84. Outside the first and last centre: the edge band.
  function get (id, months) {
    var t = T.filter(function (x) { return x.id === id })[0]; if (!t || typeof months !== 'number' || isNaN(months)) return null
    var bs = t.bands, m = near(months), c = function (x) { return (x.from + x.to + 1) / 2 }, lo, hi
    if (m <= c(bs[0])) { lo = bs[0].lo; hi = bs[0].hi } else if (m >= c(bs[bs.length - 1])) { lo = bs[bs.length - 1].lo; hi = bs[bs.length - 1].hi } else {
      for (var i = 0; i < bs.length - 1; i++) {
        var a = c(bs[i]), b = c(bs[i + 1]); if (m < a || m > b) continue
        var f = (m - a) / (b - a); lo = bs[i].lo + f * (bs[i + 1].lo - bs[i].lo); hi = bs[i].hi + f * (bs[i + 1].hi - bs[i].hi); break
      }
    }
    return { id: t.id, unit: t.unit, kind: t.kind, src: t.src, quote: t.quote, note: t.note, lowerBetter: !!t.lowerBetter, lo: lo, hi: hi }
  }
  function near (m) { return Math.max(72, Math.min(95, m)) }   // nearest band for an age outside grade 1
  W.CekTargets = { get: get, near: near, all: function () { return T.slice() }, AGE_MIN: 72, AGE_MAX: 95 }
})(typeof window !== 'undefined' ? window : globalThis)
