/* data/mojo-team-film.js — window.MojoTeams: the Balapan team choice (owner 2026-10-17).
 *
 * Owner: "bisa pilih character mobil Mojo atau balapan yang di film Cars; pilih Mojo -> list yang sekarang; yang film
 * Cars sprite nanti saya kasih. Bukan hanya membalap perampok tapi mengejar perampok atau mengejar musuhnya (mis. tim
 * sponsor rival) -- lebih variatif. Efek balapan, cuaca, daun berguguran: immersive, super smooth."
 *
 * PLACEHOLDER until the owner's film-racer sprites arrive: every racer drives an existing Mojo form (`form`) and the
 * cards say "sprite menyusul". When the pack lands, each racer gets its own rear/side art (add it to MojoChases.FORMS
 * with `team: 'film'` and point `form` at it) -- names and missions stay data here, the chase engine is unchanged.
 * Missions reuse the Mojo chase engine and its stages (their weather + atmosphere: falling leaves, sakura petals, rain,
 * snow, desert dust, night), with `foe` changing who is chased: the robber, or a rival racer of the other team.
 */
(function (W) {
  'use strict'
  var TEAMS = [
    { id: 'mojo', name: 'Tim Mojo', sub: 'Mobil Mojo dan kawan-kawan', card: 'mojo-top/base' },
    { id: 'film', name: 'Tim Film Balap', sub: 'Pembalap dari film — kejar pencuri dan tim rival', card: 'mojo-hero/jet-1', soon: !(W.MojoRacerSheets && Object.keys(W.MojoRacerSheets).length) }
  ]
  // the player's racers (placeholder art = an existing Mojo form until the owner's sprites arrive)
  var RACERS = [
    { id: 'merah', name: 'Si Merah Kilat', line: 'Paling cepat di lintasan!', form: 'racer', color: '#E8432E' },
    { id: 'biru', name: 'Si Biru Juara', line: 'Pandai menyalip di tikungan!', form: 'jet2', color: '#2E7BE8' },
    { id: 'derek', name: 'Truk Derek Ceria', line: 'Kuat menembus lumpur!', form: 'grapple', color: '#B8732E' },
    { id: 'polisi', name: 'Mobil Patroli', line: 'Ahli mengejar pencuri!', form: 'police', color: '#2B3A55' },
    { id: 'damkar', name: 'Mobil Pemadam', line: 'Siap menolong!', form: 'fire', color: '#D93030' },
    { id: 'kargo', name: 'Truk Sponsor', line: 'Besar dan tangguh!', form: 'cargo', color: '#3DA35D' }
  ]
  // the owner's pack (tools/ingest-film-racers.py -> MojoRacerSheets) replaces the placeholders: one racer per sheet set,
  // its own three rear views in the race and its own picture on the chip; it keeps a form underneath for the perk
  var SH = W.MojoRacerSheets, COLS = ['#E8432E', '#2E7BE8', '#F2B705', '#3DA35D', '#8E44AD', '#E67E22', '#16A085', '#C0392B']
  if (SH && Object.keys(SH).length) {
    RACERS = Object.keys(SH).sort(function (a, b) { return (SH[a].order || 99) - (SH[b].order || 99) }).map(function (id, i) {
      var r = SH[id]
      return { id: id, name: r.name || id, line: r.line || 'Siap balapan!', form: r.form || 'racer', color: r.color || COLS[i % COLS.length], pic: r.pic }
    })
  }
  // the missions (owner 2026-10-18: "mengejar Mack, mengejar Sally, balapan sirkuit, mengejar pencuri, dikejar polisi --
  // bener2 variatif"). mode: 'robber' = chase a thief and net him (the classic chase); 'race' = catch the film racer
  // ahead (rival: its id in MojoRacerSheets, alt when the child drives that very racer); 'escape' = a pursuer behind,
  // reach the finish before it catches up. stage = a chase stage (its biome, weather, light and atmosphere).
  var ROB = { n: 'pencuri', N: 'Pencuri', caught: 'Pencuri Tertangkap!' }
  var MISSIONS = [
    { id: 'f-sirkuit', mode: 'race', stage: 'stadion', rival: 'strip-the-king-weathers', alt: 'cal-weathers', title: 'Balap Sirkuit Piala', tag: 'Balap Sirkuit', intro: 'Balapan sirkuit dimulai! Pemimpin balapan ada di depan. Salip dia sebelum garis finis!', outro: 'Kamu memimpin balapan! Penonton bersorak!' },
    { id: 'f-kota', mode: 'robber', stage: 'kota', target: 'thief', title: 'Pencuri Piala', tag: 'Kejar Pencuri', intro: 'Pencuri membawa kabur piala balapan! Kejar dia keliling kota!', outro: 'Piala kembali! Semua mobil bersorak!', item: 'piala balapan' },
    { id: 'f-mack', mode: 'race', stage: 'tol-malam', rival: 'mack', alt: 'red', title: 'Kejar Mack di Jalan Tol', tag: 'Kejar Mack', intro: 'Mack berangkat ke stadion, tapi kotak piala tertinggal! Kejar Mack di jalan tol malam!', outro: 'Kotak piala sampai ke Mack. Terima kasih, kawan!' },
    { id: 'f-sally', mode: 'race', stage: 'gurun', rival: 'sally-carrera', alt: 'flo', title: 'Balapan di Ngarai', tag: 'Kejar Sally', intro: 'Sally mengajak balapan di ngarai batu merah. Susul dia sebelum ujung jalan!', outro: 'Balapan yang seru! Sally tersenyum puas.' },
    { id: 'f-sheriff', mode: 'escape', stage: 'perumahan', pursuer: 'sheriff', alt: 'red', title: 'Kejar-kejaran dengan Sheriff', tag: 'Dikejar Sheriff', intro: 'Sheriff mengajak main kejar-kejaran! Jangan sampai tersusul sampai garis finis. Hindari rintangan!', outro: 'Kamu lolos! Sheriff tertawa: kamu memang cepat!' },
    { id: 'f-chick', mode: 'race', stage: 'musim-gugur', rival: 'chick-hicks', alt: 'jackson-storm', title: 'Chick Hicks Menyalip', tag: 'Kejar Chick', intro: 'Chick Hicks menyalip sambil menerbangkan daun-daun gugur! Kejar dia!', outro: 'Chick Hicks tersusul di tikungan terakhir!' },
    { id: 'f-gurun', mode: 'robber', stage: 'kereta-ngarai', target: 'junk', title: 'Pencuri Ban', tag: 'Kejar Pencuri', intro: 'Pencuri mengambil ban cadangan tim. Kejar dia di jembatan ngarai!', outro: 'Ban cadangan kembali ke garasi!', item: 'ban cadangan' },
    { id: 'f-doc', mode: 'race', stage: 'salju', rival: 'doc-hudson', alt: 'river-scott', title: 'Latihan Bersama Doc', tag: 'Kejar Doc', intro: 'Doc Hudson melatihmu di jalan salju yang licin. Ikuti dan susul dia!', outro: 'Doc bangga: kamu belajar dengan cepat!' },
    { id: 'f-fritter', mode: 'escape', stage: 'proyek', pursuer: 'miss-fritter', alt: 'smokey', title: 'Lari dari Bus Derby', tag: 'Dikejar Bus', intro: 'Bus derby besar ingin menyenggolmu! Ngebut dan jangan sampai tersusul!', outro: 'Kamu lolos dari bus derby! Hebat!' },
    { id: 'f-storm', mode: 'race', stage: 'malam', rival: 'jackson-storm', alt: 'chick-hicks', title: 'Balapan Malam Hujan', tag: 'Kejar Storm', intro: 'Hujan malam membuat jalan licin. Pembalap tercepat ngebut di depan!', outro: 'Kamu menyusulnya di bawah lampu kota!' },
    { id: 'f-hujan', mode: 'robber', stage: 'hujan', target: 'trash', title: 'Pencuri di Kota Hujan', tag: 'Kejar Pencuri', intro: 'Pencuri kabur di tengah hujan deras. Jangan sampai lolos!', outro: 'Pencuri tertangkap walau hujan deras!', item: 'kunci garasi' },
    { id: 'f-final', mode: 'race', stage: 'sakura', rival: 'cruz-ramirez', alt: 'jackson-storm', title: 'Final Piala Sakura', tag: 'Final', intro: 'Final! Kelopak sakura berguguran di lintasan. Juara bertahan ada di depanmu!', outro: 'Kamu juara Final Piala!' }
  ]
  if (RACERS[0] && RACERS[0].pic) TEAMS[1].pic = RACERS[0].pic   // the film team's card shows its lead racer
  W.MojoTeams = { TEAMS: TEAMS, film: { racers: RACERS, missions: MISSIONS } }
})(window)
