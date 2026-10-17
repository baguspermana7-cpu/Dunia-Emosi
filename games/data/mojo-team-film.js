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
    { id: 'film', name: 'Tim Film Balap', sub: 'Pembalap dari film — kejar pencuri dan tim rival', card: 'mojo-hero/jet-1', soon: true }
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
  // the missions: who is chased (robber / rival), where (a chase stage = its biome, weather, atmosphere), with what
  var ROB = { n: 'pencuri', N: 'Pencuri', caught: 'Pencuri Tertangkap!' }
  var RIVAL = { n: 'rival', N: 'Rival', caught: 'Rival Terkejar!' }
  var MISSIONS = [
    { id: 'f-kota', stage: 'kota', type: 'robber', foe: ROB, target: 'thief', title: 'Pencuri Piala', intro: 'Pencuri membawa kabur piala balapan! Kejar dia keliling kota!', outro: 'Piala kembali! Penonton bersorak!', item: 'piala balapan' },
    { id: 'f-gugur', stage: 'musim-gugur', type: 'rival', foe: RIVAL, target: 'speed', title: 'Rival di Hutan Gugur', intro: 'Tim rival menyalip di hutan musim gugur. Daun berjatuhan — kejar dia!', outro: 'Kamu menyusul rival di tikungan terakhir!', item: 'bendera finis' },
    { id: 'f-malam', stage: 'malam', type: 'rival', foe: RIVAL, target: 'vroom', title: 'Balapan Malam Hujan', intro: 'Hujan malam membuat jalan licin. Rival ngebut di depan!', outro: 'Rival terkejar di bawah lampu kota!', item: 'helm juara' },
    { id: 'f-gurun', stage: 'gurun', type: 'robber', foe: ROB, target: 'junk', title: 'Pencuri Ban di Gurun', intro: 'Pencuri mengambil ban cadangan tim. Debu gurun beterbangan!', outro: 'Ban cadangan kembali ke garasi!', item: 'ban cadangan' },
    { id: 'f-salju', stage: 'salju', type: 'rival', foe: RIVAL, target: 'rich', title: 'Rival di Jalan Salju', intro: 'Jalan salju licin. Rival mencoba kabur ke puncak!', outro: 'Rival terkejar di tengah salju!', item: 'syal tim' },
    { id: 'f-sakura', stage: 'sakura', type: 'rival', foe: RIVAL, target: 'speed', title: 'Kelopak Sakura', intro: 'Kelopak sakura berguguran di lintasan. Kejar rival yang licik!', outro: 'Kamu juara jalur sakura!', item: 'pita juara' },
    { id: 'f-hujan', stage: 'hujan', type: 'robber', foe: ROB, target: 'trash', title: 'Pencuri di Kota Hujan', intro: 'Pencuri kabur di tengah hujan deras. Jangan sampai lolos!', outro: 'Pencuri tertangkap walau hujan deras!', item: 'kunci garasi' },
    { id: 'f-stadion', stage: 'stadion', type: 'rival', foe: RIVAL, target: 'vroom', title: 'Final Piala', intro: 'Final di stadion! Rival terkuat ada di depanmu.', outro: 'Kamu juara Final Piala!', item: 'piala emas' }
  ]
  W.MojoTeams = { TEAMS: TEAMS, film: { racers: RACERS, missions: MISSIONS } }
})(window)
