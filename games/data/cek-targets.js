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
    { id: 'pola', unit: 'soal benar dari 24', kind: 'design', src: 'Raven CPM item ladder (Serbian 2007, Lithuanian 2005 norm studies); Schneider & McGrew 2018 (Gf)',
      note: 'CPM norms are foreign and old (Flynn effect); the band is a starting estimate to be checked against real results.',
      bands: [{ from: 72, to: 83, lo: 8, hi: 15 }, { from: 84, to: 95, lo: 10, hi: 17 }] },
    { id: 'bentuk', unit: 'soal benar dari 20', kind: 'design', src: 'Frick, Moehring & Newcombe (2014) TiCS 18:536; Frick, Ferrara & Newcombe (2013)',
      note: '2D rotation is still developing at 5-7 years; mirror images are the usual error.',
      bands: [{ from: 72, to: 83, lo: 7, hi: 13 }, { from: 84, to: 95, lo: 9, hi: 15 }] },
    { id: 'ingat-maju', unit: 'gambar berurutan (maju)', kind: 'design', src: GATHERCOLE,
      note: 'Gathercole 2004 full text could not be fetched (2026-11-21); band = usual forward span at 6-7 years.',
      bands: [{ from: 72, to: 83, lo: 4, hi: 5 }, { from: 84, to: 95, lo: 4, hi: 6 }] },
    { id: 'ingat-mundur', unit: 'gambar berurutan (mundur)', kind: 'design', src: GATHERCOLE,
      note: 'Backward span is shorter than forward at every age (Gathercole 2004; Giofre et al. 2016).',
      bands: [{ from: 72, to: 83, lo: 2, hi: 3 }, { from: 84, to: 95, lo: 2, hi: 4 }] },
    { id: 'ingat-corsi', unit: 'kotak berurutan', kind: 'design', src: 'Pagulayan et al. (2006) J Clin Exp Neuropsychol 28:1043 (Corsi norms from grade 1)',
      note: 'Pagulayan 2006 normative table is behind a paywall; band = estimate.',
      bands: [{ from: 72, to: 83, lo: 3, hi: 4 }, { from: 84, to: 95, lo: 4, hi: 5 }] },
    { id: 'kata', unit: 'soal benar dari 24', kind: 'design', src: 'NIH Toolbox Picture Vocabulary format (Gershon et al. 2013 Monogr Soc Res Child Dev 78:49-69); items from this game\'s own labelled pictures',
      note: 'The items are new and Indonesian; no norm exists for them. Band = estimate to be checked against real results.',
      bands: [{ from: 72, to: 83, lo: 12, hi: 18 }, { from: 84, to: 95, lo: 14, hi: 20 }] },
    { id: 'cepat', unit: 'jawaban benar per menit', kind: 'design', src: 'NIH Toolbox Pattern Comparison format, 85 s (Carlozzi et al. 2013 Monogr Soc Res Child Dev 78:88-102)',
      note: 'Toolbox raw scores are not open per age; band = estimate. More than 20 % wrong flags the result.',
      bands: [{ from: 72, to: 83, lo: 12, hi: 20 }, { from: 84, to: 95, lo: 15, hi: 24 }] },
    { id: 'angka-garis', unit: '% meleset di garis bilangan 0-100', lowerBetter: true, kind: 'published',
      src: 'Booth & Siegler (2006) Dev Psychol 42:189-201; Siegler & Booth (2004) Child Dev 75:428-444',
      quote: 'kindergartners (percent absolute error = 24% in both studies), first graders (14% vs. 12%), and second graders (10% in both studies)',
      note: 'Band: grade-1 mean 12-14 %; better than the grade-2 mean (10 %) is "Kuat"; nearer the kindergarten mean (24 %) than grade 1 is "Perlu latihan".',
      bands: [{ from: 72, to: 95, lo: 10, hi: 18 }] },
    { id: 'angka-banyak', unit: 'perbandingan terkecil yang benar', kind: 'design', src: 'Halberda & Feigenson (2008) Dev Psychol 44:1457-1465',
      note: 'Acuity improves from about 3:4 at 3 years to 5:6 at 6 years (as reviewed); the paper full text was blocked (2026-11-21). Level 1=1:2, 2=2:3, 3=3:4, 4=5:6.',
      bands: [{ from: 72, to: 95, lo: 3, hi: 4 }] },
    { id: 'angka-hitung', unit: 'soal cerita benar dari 8', kind: 'curriculum',
      src: 'Capaian Pembelajaran Matematika Fase A, SK Kepala BSKAP No. 032/H/KR/2024',
      note: 'By the end of Fase A (grade 1-2) a child adds and subtracts whole numbers to 20; mid grade 1 is still on the way.',
      bands: [{ from: 72, to: 83, lo: 3, hi: 6 }, { from: 84, to: 95, lo: 4, hi: 7 }] }
  ]
  function get (id, months) {
    var t = T.filter(function (x) { return x.id === id })[0]; if (!t || typeof months !== 'number') return null
    var b = t.bands.filter(function (x) { return months >= x.from && months <= x.to })[0]
    return b ? { id: t.id, unit: t.unit, kind: t.kind, src: t.src, quote: t.quote, note: t.note, lowerBetter: !!t.lowerBetter, lo: b.lo, hi: b.hi } : null
  }
  function near (m) { return Math.max(72, Math.min(95, m)) }   // nearest band for an age outside grade 1
  W.CekTargets = { get: get, near: near, all: function () { return T.slice() }, AGE_MIN: 72, AGE_MAX: 95 }
})(typeof window !== 'undefined' ? window : globalThis)
