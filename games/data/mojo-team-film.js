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
    { id: 'f-final', mode: 'race', stage: 'sakura', rival: 'cruz-ramirez', alt: 'jackson-storm', title: 'Final Piala Sakura', tag: 'Final', intro: 'Final! Kelopak sakura berguguran di lintasan. Juara bertahan ada di depanmu!', outro: 'Kamu juara Final Piala!' },
    // round two (owner 2026-10-19: "level balapan sangat kurang"): every new road and time of day, more rivals
    { id: 'f-pantai-senja', mode: 'race', stage: 'pantai-senja', rival: 'bobby-swift', alt: 'cal-weathers', title: 'Balap Pantai Senja', tag: 'Balap Pantai', intro: 'Balapan di jalan pantai saat senja! Pembalap di depan ngebut di tikungan panjang. Susul dia!', outro: 'Hebat! Kamu menyalip di jalan pantai!' },
    { id: 'f-mater', mode: 'escape', stage: 'desa-senja', pursuer: 'tow-mater', alt: 'luigi', title: 'Main Kejar dengan Mater', tag: 'Dikejar Mater', intro: 'Mater mengajak main kejar-kejaran di jalan desa! Jalannya naik turun. Jangan sampai tersusul!', outro: 'Kamu lolos! Mater tertawa senang.' },
    { id: 'f-kota-malam', mode: 'robber', stage: 'kota-malam', target: 'cash', title: 'Pencuri Kota Malam', tag: 'Kejar Pencuri', intro: 'Malam di kota! Pencuri membawa kabur celengan tim balap. Kejar dia!', outro: 'Celengan tim kembali! Terima kasih!', item: 'celengan tim' },
    { id: 'f-ramone', mode: 'race', stage: 'tol-malam', rival: 'ramone', alt: 'fillmore', title: 'Ramone di Jalan Tol', tag: 'Kejar Ramone', intro: 'Ramone pamer cat barunya di jalan tol malam! Susul dia di tikungan panjang!', outro: 'Ramone tersusul! Catnya tetap keren.' },
    { id: 'f-gunung', mode: 'race', stage: 'salju-badai', rival: 'river-scott', alt: 'louise-nash', title: 'Tikungan Gunung Salju', tag: 'Balap Gunung', intro: 'Badai salju di gunung! Jalannya penuh tikungan tajam. Ikuti dan susul pembalap di depan!', outro: 'Kamu juara di tikungan gunung!' },
    { id: 'f-sarge', mode: 'escape', stage: 'hutan-hujan', pursuer: 'sarge', alt: 'fillmore', title: 'Latihan dengan Sarge', tag: 'Dikejar Sarge', intro: 'Sarge melatihmu di hutan basah! Lari sampai finis dan hindari rintangan!', outro: 'Latihan selesai! Sarge memberi hormat.' },
    { id: 'f-hutan', mode: 'robber', stage: 'rimba', target: 'army', title: 'Pencuri Peta Rimba', tag: 'Kejar Pencuri', intro: 'Pencuri membawa peta balapan rimba! Kejar dia di jalan berliku!', outro: 'Peta balapan kembali!', item: 'peta balapan' },
    { id: 'f-cruz', mode: 'race', stage: 'resor', rival: 'cruz-ramirez', alt: 'sally-carrera', title: 'Latihan Pantai Cruz', tag: 'Kejar Cruz', intro: 'Cruz berlatih di pantai resor. Dia cepat sekali! Susul dia!', outro: 'Cruz kagum: kamu cepat sekali!' },
    { id: 'f-luigi', mode: 'race', stage: 'sakura', rival: 'luigi', alt: 'guido', title: 'Luigi di Taman Sakura', tag: 'Kejar Luigi', intro: 'Luigi membawa ban baru dan ngebut di taman sakura! Susul dia!', outro: 'Luigi tersusul! Ban barunya aman.' },
    { id: 'f-stadion-malam', mode: 'race', stage: 'stadion-malam', rival: 'jackson-storm', alt: 'chick-hicks', title: 'Balap Malam Stadion', tag: 'Balap Sirkuit', intro: 'Lampu sorot menyala! Balapan malam di stadion dengan tikungan tajam. Susul yang tercepat!', outro: 'Kamu memimpin balapan malam!' },
    { id: 'f-red', mode: 'escape', stage: 'perumahan-hujan', pursuer: 'red', alt: 'sheriff', title: 'Kejar-kejaran dengan Red', tag: 'Dikejar Red', intro: 'Red si mobil pemadam ikut main kejar-kejaran saat hujan! Jangan sampai tersusul!', outro: 'Kamu lolos! Red menyiram bunga lagi.' },
    { id: 'f-pelabuhan', mode: 'robber', stage: 'pelabuhan-malam', target: 'police-van', title: 'Pencuri di Pelabuhan', tag: 'Kejar Pencuri', intro: 'Pencuri kabur dengan van membawa piston emas! Kejar di pelabuhan malam!', outro: 'Piston emas kembali ke garasi!', item: 'piston emas' },
    { id: 'f-king', mode: 'race', stage: 'kereta-ngarai', rival: 'strip-the-king-weathers', alt: 'doc-hudson', title: 'The King di Ngarai', tag: 'Kejar King', intro: 'Sang juara berlatih di ngarai rel! Jalannya menanjak dan berkelok. Susul dia!', outro: 'The King tersenyum: kamu hebat!' },
    { id: 'f-smokey', mode: 'escape', stage: 'gunung-api-malam', pursuer: 'smokey', alt: 'tow-mater', title: 'Lari dari Smokey', tag: 'Dikejar Smokey', intro: 'Smokey menguji kecepatanmu di jalan gunung malam! Ngebut sampai finis!', outro: 'Smokey bangga: kamu lolos!' },
    { id: 'f-flo', mode: 'race', stage: 'gurun-malam', rival: 'flo', alt: 'lizzie', title: 'Flo di Gurun Bintang', tag: 'Kejar Flo', intro: 'Flo ngebut di bawah bintang gurun! Ikuti lampunya dan susul dia!', outro: 'Flo tersusul. Ayo minum di kafenya!' },
    { id: 'f-kincir', mode: 'race', stage: 'kincir-angin-senja', rival: 'cal-weathers', alt: 'bobby-swift', title: 'Bukit Kincir Bergelombang', tag: 'Balap Bukit', intro: 'Jalan bukit naik turun di antara kincir angin! Susul pembalap di depan!', outro: 'Kamu juara di bukit kincir!' },
    { id: 'f-candi', mode: 'robber', stage: 'candi-kabut', target: 'striped-24', title: 'Pencuri di Candi Berkabut', tag: 'Kejar Pencuri', intro: 'Pencuri membawa bendera finis ke candi berkabut! Kejar dia!', outro: 'Bendera finis kembali!', item: 'bendera finis' },
    { id: 'f-guido', mode: 'race', stage: 'proyek-hujan', rival: 'guido', alt: 'luigi', title: 'Guido di Proyek Basah', tag: 'Kejar Guido', intro: 'Guido membawa alat ganti ban dan ngebut di proyek berlumpur! Susul dia!', outro: 'Guido tersusul! Pit stop siap.' },
    { id: 'f-mack-senja', mode: 'race', stage: 'jembatan-senja', rival: 'mack', alt: 'red', title: 'Kejar Mack di Jembatan', tag: 'Kejar Mack', intro: 'Mack menyeberang jembatan saat senja dan lupa membawa helm tim! Kejar dia!', outro: 'Helm tim sampai ke Mack!' },
    { id: 'f-fillmore', mode: 'escape', stage: 'musim-gugur-hujan', pursuer: 'fillmore', alt: 'sarge', title: 'Kejar-kejaran dengan Fillmore', tag: 'Dikejar Fillmore', intro: 'Fillmore ikut main kejar-kejaran di lembah gugur! Jangan sampai tersusul!', outro: 'Kamu lolos! Fillmore tertawa santai.' },
    { id: 'f-permen', mode: 'robber', stage: 'permen-senja', target: 'yum', title: 'Pencuri Permen', tag: 'Kejar Pencuri', intro: 'Truk usil membawa kotak permen tim! Kejar dia di negeri permen!', outro: 'Kotak permen kembali. Manis sekali!', item: 'kotak permen' },
    { id: 'f-orbit', mode: 'race', stage: 'antariksa-orbit', rival: 'michael-schumacher-ferrari', alt: 'mario-andretti', title: 'Balap Jalur Orbit', tag: 'Balap Orbit', intro: 'Balapan di jalur orbit penuh tikungan! Pembalap tercepat ada di depan!', outro: 'Kamu juara jalur orbit!' },
    { id: 'f-badai', mode: 'race', stage: 'malam-badai', rival: 'chick-hicks', alt: 'jackson-storm', title: 'Balapan Malam Badai', tag: 'Kejar Chick', intro: 'Malam badai, jalan licin! Pembalap usil ngebut di depan. Tetap fokus dan susul!', outro: 'Kamu menyalip di tengah badai!' },
    { id: 'f-grand', mode: 'race', stage: 'stadion', rival: 'lightning-mcqueen', alt: 'strip-the-king-weathers', title: 'Grand Final Piala', tag: 'Grand Final', intro: 'Grand Final! Semua pembalap terbaik ada di sini. Susul juara di depanmu!', outro: 'Kamu juara Grand Final! Piala untukmu!' }
  ]
  if (RACERS[0] && RACERS[0].pic) TEAMS[1].pic = RACERS[0].pic   // the film team's card shows its lead racer
  W.MojoTeams = { TEAMS: TEAMS, film: { racers: RACERS, missions: MISSIONS } }
})(window)
