/* =============================================================================
 * mojo-levels.js — window.MojoLevels. G31 Mojo Swoptops content: the Swop-Top forms (which verbs
 * each unlocks) and every level, data-driven (PRD §27). No gameplay code here.
 *
 * Level schema
 *   id, ch (chapter id), title, place, edu {domain, skill}, icon (art key)
 *   grid {rows, cols, map[], theme}   map chars: . road (drivable)  = bridge  , grass (scenery, NOT drivable)  # building/shelf  T tree  o pit  ~ water
 *   mojo {at:[r,c], h:'N'|'E'|'S'|'W', form}
 *   res {water, bolts}  cap {water, bolts}           starting resources and their caps
 *   objects [{id, type, at:[r,c], …}]                 types: rock fire person toolbox repair crate flag zone bolt drop star
 *       ONE rule (owner 2026-10-03): LEWATI (star bolt drop toolbox flag) is taken by driving onto it;
 *       SEBELAH (rock fire person repair crate) is handled from the cell beside it. Every object stands on
 *       road (LEWATI items, rocks and crates always ON the road) or park grass beside a road, never on # or T; an elevated one carries perch:'balcony'|'tree' (drawn under it).
 *   rev   the layout revision: a checkpoint saved under another rev is rebuilt at its beat (mojo-save.js);
 *         rev 3 = the ROAD rule (2026-10-03: grass is scenery, Mojo drives only on road)
 *       fire {str}   person {elev, perch, who, name, mg}   toolbox {tool, mg:{kind:'letters'}} (walk-over)   repair {needs:{tool, bolts}, opens, elev}
 *   optional [{do:'star', id}]                        never blocks completion (PRD §21)
 *   beats [{ title, story, bo, objectives:[{do, id|at}], slots, budget, forms, palette, prefill, start, alts, math }]
 *       forms   the Swop-Tops allowed in this beat;  palette   the commands shown
 *       budget  the efficiency target (★★★);         slots     the program strip length
 *       starExtra  extra commands the ★★★ budget allows when the optional star is collected in this beat
 *       start   where Mojo stands when the beat begins (a scene cut after a checkpoint)
 *       alts    [{name, forbid, uses}] alternative solutions the gate must prove
 *       math    {kind, about}  a SoalEngine world card Bo reads at the beat start
 *       best / alt / decoys   the "Pilih Wujud Mojo" picker: best fits the FIRST problem (gold "Paling Tepat"), alt
 *               also solves it (silver "Bisa Juga"); other allowed forms and decoys are shown unmarked
 * tools/qa-prog-grid.mjs verifies solvability across beat checkpoints. ProgGrid.verify reports
 * both failures and whether its bounded state search was complete; truncated results are not proof.
 * ==========================================================================*/
(function () {
  'use strict'
  var W = (typeof window !== 'undefined' ? window : globalThis)
  var PG = W.ProgGrid

  // Swop-Tops (PRD §6): the verbs each form unlocks. the arrows (and swop) are always available.
  var FORMS = {
    normal: { name: 'Mojo', verbs: ['pick', 'drop', 'rescue', 'repair'], color: '#F2552C', ability: 'repair' },
    dozer: { name: 'Mojo Dozer', verbs: ['push'], color: '#F4B400', ability: 'push' },
    fire: { name: 'Mojo Pemadam', verbs: ['spray'], color: '#E53935', ability: 'spray' },
    cherry: { name: 'Mojo Keranjang', verbs: ['raise', 'lower', 'rescue', 'repair'], color: '#FB8C00', ability: 'raise' },
    jumper: { name: 'Mojo Lompat', verbs: ['jump'], color: '#43A047', ability: 'jump' },
    crane: { name: 'Mojo Derek', verbs: ['hook', 'release'], color: '#8D6E63', ability: 'hook' },
    chopper: { name: 'Mojo Heli', verbs: ['takeoff', 'land', 'rescue'], fly: true, color: '#1E88E5', ability: 'takeoff' }
  }
  if (PG) for (var f in FORMS) PG.defineForm(f, { verbs: FORMS[f].verbs, fly: FORMS[f].fly })

  var CHAPTERS = [
    { id: 'belajar', title: 'Belajar Bersama Bo', sub: 'Tutorial' },
    { id: 'ch1', title: 'Selamat Datang di Swoppiton', sub: 'Bab 1' },
    { id: 'ch2', title: 'Hari Perbaikan', sub: 'Bab 2' },
    { id: 'misi', title: 'Misi Besar', sub: 'Sekolah & Bengkel' }
  ]
  // Peta Swoppiton (owner mockup): six regions, two with content now
  var REGIONS = [
    { id: 'kota', title: 'Kota Pusat', bg: 'mojo-bg/garage-street', open: true, levels: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 'm1', 'm2', 'm3', 'm4', 's1'] },
    { id: 'pelabuhan', title: 'Pelabuhan', bg: 'mojo-bg/beach-dock', open: true, levels: ['m5', 'm6', 'm7', 'm8'] },
    { id: 'hutan', title: 'Hutan', bg: 'mojo-bg/forest-trail', open: false, levels: [] },
    { id: 'gunung', title: 'Pegunungan', bg: 'mojo-bg/waterfall', open: false, levels: [] },
    { id: 'konstruksi', title: 'Konstruksi', bg: 'mojo-bg/construction', open: false, levels: [] },
    { id: 'pulau', title: 'Pulau Ceria', bg: 'mojo-bg/coast', open: false, levels: [] }
  ]
  var MOVE = ['up', 'down', 'west', 'east']   // board-absolute arrows (owner decision 2026-10-01)

  var LEVELS = [
    /* ── tutorials (PRD §34) ──────────────────────────────────────────── */
    { id: 't1', ch: 'belajar', title: 'Jalan, Mojo!', icon: 'cmd/east', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 3, cols: 3, map: ['T,T', '...', 'T,T'], theme: 'town' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'flag', type: 'flag', at: [1, 2] }],
      beats: [{ title: 'Ke bendera', story: 'Bo menunggu di bendera. Ayo jalan!', bo: 'Bendera ada di kanan. LEWATI sampai ke bendera: tekan panah KANAN, lalu JALAN.',
        objectives: [{ 'do': 'reach', at: [1, 2] }], slots: 3, budget: 2, forms: ['normal'], palette: ['east'] }] },

    { id: 't2', ch: 'belajar', title: 'Ganti Arah!', icon: 'cmd/up', edu: { domain: 'algoritma', skill: 'arah' },
      grid: { rows: 3, cols: 3, map: ['...', '.##', '.#T'], theme: 'town' }, rev: 3,
      mojo: { at: [2, 0], h: 'N', form: 'normal' },
      objects: [{ id: 'flag', type: 'flag', at: [0, 2] }],
      beats: [{ title: 'Ke atas, lalu ke kanan', story: 'Benderanya di pojok atas. Ikuti jalannya!', bo: 'Bawa Mojo ke bendera di pojok atas. Satu panah = satu kotak: ATAS membawa Mojo naik, KANAN membawa Mojo ke kanan.',
        objectives: [{ 'do': 'reach', at: [0, 2] }], slots: 6, budget: 4, forms: ['normal'], palette: MOVE }] },

    { id: 't3', ch: 'belajar', title: 'Tolong Teman', icon: 'cmd/rescue', edu: { domain: 'algoritma', skill: 'aksi' },
      grid: { rows: 4, cols: 4, map: ['T,,T', ',...', '....', 'T,,T'], theme: 'park' }, rev: 3,
      mojo: { at: [2, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'neon', type: 'person', at: [1, 2], who: 'neon', name: 'Neon' }],
      beats: [{ title: 'Neon butuh bantuan', story: 'Neon tersesat di taman. Jemput dia!', bo: 'Berhenti di SEBELAH Neon, lalu pakai TOLONG. Mojo menoleh sendiri ke Neon.',
        objectives: [{ 'do': 'rescue', id: 'neon' }], slots: 5, budget: 3, forms: ['normal'], palette: ['up', 'down', 'west', 'east', 'rescue'] }] },

    { id: 't4', ch: 'belajar', title: 'Swop Pertama', icon: 'form/fire', edu: { domain: 'swop', skill: 'kemampuan' },
      grid: { rows: 4, cols: 4, map: ['TT##', '....', ',,,,', 'TTTT'], theme: 'town' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      res: { water: 2 }, cap: { water: 5 },
      objects: [{ id: 'api', type: 'fire', at: [1, 3], str: 1 }],
      beats: [{ title: 'Api di kios', story: 'Api di depan kios! Mojo harus jadi apa?', bo: 'Padamkan api di ujung jalan. Mojo Pemadam bisa menyemprot air: taruh SWOP PEMADAM, berhenti di SEBELAH api, lalu SEMPROT.',
        objectives: [{ 'do': 'extinguish', id: 'api' }], slots: 5, budget: 4, forms: ['normal', 'fire', 'dozer'], best: ['fire'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'spray', 'push', 'swop:fire', 'swop:dozer'] }] },

    { id: 't5', ch: 'belajar', title: 'Rencana 3 Langkah', icon: 'ui/plan', edu: { domain: 'algoritma', skill: 'rencana' },
      grid: { rows: 3, cols: 3, map: ['T,T', ',..', '..T'], theme: 'park' }, rev: 3,
      mojo: { at: [2, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'flag', type: 'flag', at: [1, 2] }],
      beats: [{ title: 'Tiga langkah saja', story: 'Hanya ada 3 kotak rencana. Pikirkan dulu, baru jalan!', bo: 'Bawa Mojo ke bendera dengan 3 panah saja. Bayangkan dulu jalannya: panah mana saja yang membawa Mojo ke sana?',
        objectives: [{ 'do': 'reach', at: [1, 2] }], slots: 3, budget: 3, forms: ['normal'], palette: MOVE }] },

    { id: 't6', ch: 'belajar', title: 'Perbaiki Rencana', icon: 'ui/debug', edu: { domain: 'algoritma', skill: 'debug' },
      grid: { rows: 4, cols: 4, map: ['TT##', '....', ',,,,', 'TTTT'], theme: 'town' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      res: { water: 2 }, cap: { water: 5 },
      objects: [{ id: 'api', type: 'fire', at: [1, 3], str: 1 }],
      beats: [{ title: 'Rencana Bo', story: 'Bo sudah membuat rencana. Jalankan dulu, lalu kita perbaiki bersama!', bo: 'Padamkan api dengan rencana Bo. Tekan JALAN. Kalau berhenti, kita cari perintah yang perlu diubah.',
        objectives: [{ 'do': 'extinguish', id: 'api' }], slots: 5, budget: 4, forms: ['normal', 'fire'], prefill: ['east', 'east', 'spray'],
        palette: ['up', 'down', 'west', 'east', 'spray', 'swop:fire'] }] },

    { id: 't7', ch: 'belajar', title: 'Swop Lagi!', icon: 'form/dozer', edu: { domain: 'swop', skill: 'multi-swop' },
      grid: { rows: 3, cols: 5, map: ['TTTTT', '..o..', 'TTTTT'], theme: 'town' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      res: { water: 2 }, cap: { water: 5 },
      objects: [{ id: 'batu', type: 'rock', at: [1, 1] }, { id: 'api', type: 'fire', at: [1, 4], str: 1 }],
      beats: [{ title: 'Batu lalu api', story: 'Batu menutup jalan, dan di ujung ada api!', bo: 'Padamkan api di ujung jalan. Batu menutup jalan: berhenti di SEBELAH batu, jadi Dozer dan DORONG. Lalu Swop jadi Mojo Pemadam dan SEMPROT api.',
        objectives: [{ 'do': 'extinguish', id: 'api' }], slots: 8, budget: 6, forms: ['normal', 'dozer', 'fire'], best: ['dozer'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'push', 'spray', 'swop:dozer', 'swop:fire'] }] },

    /* ── chapter 1: Welcome to Swoppiton ──────────────────────────────── */
    { id: 'm1', ch: 'ch1', title: 'Batu di Jalan', place: 'Toko Roti', icon: 'form/dozer', edu: { domain: 'swop', skill: 'dorong' },
      grid: { rows: 5, cols: 5, map: ['##.##', 'T..,T', 'T,o,T', 'T#.#T', 'T#.#T'], theme: 'town' }, rev: 3,
      mojo: { at: [4, 2], h: 'N', form: 'normal' },
      objects: [{ id: 'batu', type: 'rock', at: [3, 2] }, { id: 'flag', type: 'flag', at: [0, 2] }, { id: 'bintang', type: 'star', at: [1, 1] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Antar ke toko roti', story: 'Batu besar jatuh di jalan ke toko roti. Bagaimana Mojo bisa lewat?', bo: 'Antar Mojo ke bendera di toko roti. Dari SEBELAH batu, Dozer bisa DORONG. Kalau batu masuk lubang, jalannya rata lagi! Bintang di jalan kecil diambil dengan LEWAT di atasnya.',
        objectives: [{ 'do': 'reach', at: [0, 2] }], slots: 12, budget: 5, starExtra: 2, forms: ['normal', 'dozer', 'fire'], best: ['dozer'], decoys: ['racer', 'boat'],
        palette: ['up', 'down', 'west', 'east', 'push', 'spray', 'swop:dozer', 'swop:fire'] }] },

    { id: 'm2', ch: 'ch1', title: 'Kios Terbakar', place: 'Pasar', icon: 'form/fire', edu: { domain: 'matematika', skill: 'pengurangan' },
      grid: { rows: 4, cols: 4, map: ['#.##', '..,,', '.,T,', '..,,'], theme: 'town' }, rev: 3,
      mojo: { at: [3, 0], h: 'N', form: 'fire' },
      res: { water: 1 }, cap: { water: 5 },
      objects: [{ id: 'api', type: 'fire', at: [0, 1], str: 3 }, { id: 'd1', type: 'drop', at: [2, 0] }, { id: 'd2', type: 'drop', at: [1, 0] }],
      beats: [{ title: 'Air yang cukup', story: 'Kios di pasar terbakar. Mojo sudah jadi Mojo Pemadam!', bo: 'Api ini perlu 3 air. Tangki Mojo baru 1. LEWATI tetes air biru, lalu berhenti di SEBELAH api dan SEMPROT.',
        math: { kind: 'collect', about: 'need=3 have=1 noun=tetes_air' },
        objectives: [{ 'do': 'extinguish', id: 'api' }], slots: 8, budget: 4, forms: ['fire', 'dozer'], best: ['fire'], decoys: ['boat'],
        palette: ['up', 'down', 'west', 'east', 'spray', 'push', 'swop:fire', 'swop:dozer'] }] },

    { id: 'm3', ch: 'ch1', title: 'Kucing di Pohon', place: 'Taman Kota', icon: 'form/cherry', edu: { domain: 'matematika', skill: 'barisan bilangan' },
      grid: { rows: 4, cols: 4, map: [',,,,', ',,.,', 'T,.,', '...T'], theme: 'park' }, rev: 3,
      mojo: { at: [3, 1], h: 'E', form: 'normal' },
      objects: [{ id: 'kucing', type: 'person', at: [0, 2], elev: 4, perch: 'tree', who: 'cat', name: 'Kucing', mg: { id: 'tinggi-kucing', step: 1 } }],
      beats: [{ title: 'Kucing di atas pohon', story: 'Kucing Bu Rina naik pohon dan tidak bisa turun!', bo: 'Tolong kucing di atas pohon. Pohonnya tinggi 4: jadi Mojo Keranjang, berhenti di SEBELAH pohon, NAIK, lalu TOLONG.',
        objectives: [{ 'do': 'rescue', id: 'kucing' }], slots: 8, budget: 6, forms: ['normal', 'cherry', 'fire'], best: ['cherry'], decoys: ['racer', 'chopper'],
        palette: ['up', 'down', 'west', 'east', 'raise', 'lower', 'rescue', 'spray', 'swop:cherry', 'swop:fire'] }] },

    { id: 'm4', ch: 'ch1', title: 'Api Berantai', place: 'Jalan Pasar', icon: 'form/fire', edu: { domain: 'algoritma', skill: 'pola' },
      grid: { rows: 3, cols: 5, map: ['T.T.T', '.....', 'TTTTT'], theme: 'town' }, rev: 3,
      mojo: { at: [1, 1], h: 'N', form: 'normal' },
      res: { water: 2 }, cap: { water: 5 },
      objects: [{ id: 'api1', type: 'fire', at: [0, 1], str: 1 }, { id: 'api2', type: 'fire', at: [0, 3], str: 1 }, { id: 'bintang', type: 'star', at: [1, 4] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Dua api', story: 'Dua kios berderet terbakar!', bo: 'Padamkan dua api di depan kios. Berhenti di SEBELAH api yang dekat dan SEMPROT, lalu pindah ke SEBELAH api berikutnya.',
        objectives: [{ 'do': 'extinguish', id: 'api1' }, { 'do': 'extinguish', id: 'api2' }], slots: 12, budget: 5, starExtra: 2, forms: ['normal', 'fire', 'dozer'], best: ['fire'], decoys: ['water'],
        palette: ['up', 'down', 'west', 'east', 'spray', 'push', 'swop:fire', 'swop:dozer'] }] },

    /* ── chapter 2: Fix-It Day ────────────────────────────────────────── */
    { id: 'm5', ch: 'ch2', title: 'Ayunan Rusak', place: 'Taman Bermain', icon: 'tool/palu', edu: { domain: 'bahasa', skill: 'susun huruf + pengurangan' },
      grid: { rows: 5, cols: 5, map: ['T,,,T', ',...,', ',.,.,', ',...,', 'T,.,T'], theme: 'park' }, rev: 3,
      mojo: { at: [4, 2], h: 'N', form: 'normal' },
      res: { bolts: 4 }, cap: { bolts: 6 },
      objects: [{ id: 'ayunan', type: 'repair', at: [0, 2], needs: { tool: 'palu', bolts: 6 }, what: 'swing' },
        { id: 'kotak', type: 'toolbox', at: [2, 1], tool: 'palu', mg: { kind: 'letters', id: 'palu' } },
        { id: 'b1', type: 'bolt', at: [3, 1] }, { id: 'b2', type: 'bolt', at: [1, 1] }, { id: 'b3', type: 'bolt', at: [3, 3] }, { id: 'bintang', type: 'star', at: [1, 3] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Perbaiki ayunan', story: 'Ayunan di taman bermain rusak. Kita perlu alat dan baut!', bo: 'Perbaiki ayunan di ujung taman. LEWATI kotak alat untuk mendapat palu. Ayunan perlu 6 baut, kita baru punya 4. Lalu berhenti di SEBELAH ayunan dan PERBAIKI.',
        math: { kind: 'collect', about: 'need=6 have=4 noun=baut' },
        objectives: [{ 'do': 'repair', id: 'ayunan' }], slots: 10, budget: 6, starExtra: 2, forms: ['normal'],
        palette: ['up', 'down', 'west', 'east', 'repair'] }] },

    { id: 'm6', ch: 'ch2', title: 'Lampu Jalan', place: 'Jalan Taman', icon: 'form/cherry', edu: { domain: 'matematika', skill: 'hitung lompat 2' },
      grid: { rows: 4, cols: 4, map: ['TT,T', '...,', 'T,.T', 'T,.T'], theme: 'town' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'lampu', type: 'repair', at: [1, 3], elev: 4, perch: 'pole', needs: {}, what: 'lamp', mg: { id: 'tinggi-lampu', step: 2 } },
        { id: 'flag', type: 'flag', at: [3, 2] }],
      beats: [
        { title: 'Lampu mati', story: 'Lampu jalan mati. Nanti malam gelap!', bo: 'Lampunya tinggi 4. Jadi Mojo Keranjang, berhenti di SEBELAH lampu, NAIK, lalu PERBAIKI.',
          objectives: [{ 'do': 'repair', id: 'lampu' }], slots: 6, budget: 5, forms: ['normal', 'cherry'],
          palette: ['up', 'down', 'west', 'east', 'raise', 'lower', 'repair', 'swop:cherry', 'swop:normal'] },
        { title: 'Pulang ke bengkel', story: 'Lampu menyala! Sekarang pulang ke bendera.', bo: 'Sekarang pulang ke bendera di bawah. Lampu sudah menyala dan keranjang sudah turun. LEWATI jalan sampai ke bendera!',
          objectives: [{ 'do': 'reach', at: [3, 2] }], slots: 6, budget: 2, forms: ['normal', 'cherry'],
          palette: MOVE }] },

    { id: 'm7', ch: 'ch2', title: 'Longsor', place: 'Jalan Bukit', icon: 'form/dozer', edu: { domain: 'swop', skill: 'tiga swop' },
      grid: { rows: 3, cols: 5, map: ['TTTTT', '..o..', 'TTTTT'], theme: 'hill' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      res: { water: 2 }, cap: { water: 5 },
      objects: [{ id: 'batu', type: 'rock', at: [1, 1] }, { id: 'api', type: 'fire', at: [1, 3], str: 2 }, { id: 'kakek', type: 'person', at: [1, 4], who: 'grandad', name: 'Kakek' }],
      beats: [{ title: 'Kakek terjebak', story: 'Longsor! Batu jatuh, ada api kecil, dan Kakek terjebak di ujung jalan.', bo: 'Tolong Kakek di ujung jalan. Tiga masalah, tiga Swop: setiap kali berhenti di SEBELAH masalahnya, lalu DORONG, SEMPROT, dan TOLONG.',
        objectives: [{ 'do': 'rescue', id: 'kakek' }], slots: 9, budget: 8, forms: ['normal', 'dozer', 'fire'], best: ['dozer'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'push', 'spray', 'rescue', 'swop:normal', 'swop:dozer', 'swop:fire'] }] },

    { id: 'm8', ch: 'ch2', title: 'Jembatan Lompat', place: 'Sungai Kecil', icon: 'form/jumper', edu: { domain: 'algoritma', skill: 'dua cara' },
      grid: { rows: 3, cols: 5, map: ['TTTTT', '...o.', 'TT.TT'], theme: 'hill' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'batu', type: 'rock', at: [1, 1] }, { id: 'flag', type: 'flag', at: [1, 4] }, { id: 'bintang', type: 'star', at: [2, 2] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Seberangi lubang', story: 'Ada batu dan lubang di jalan ke bendera. Ada dua cara!', bo: 'Sampai ke bendera di seberang lubang. Dari SEBELAH batu: DORONG batu ke lubang, atau LOMPAT batu dan lubang. Pilih caramu!',
        objectives: [{ 'do': 'reach', at: [1, 4] }], slots: 10, budget: 5, starExtra: 2, forms: ['normal', 'dozer', 'jumper'], best: ['jumper'], alt: ['dozer'], decoys: ['boat'],
        palette: ['up', 'down', 'west', 'east', 'push', 'jump', 'swop:dozer', 'swop:jumper'],
        alts: [{ name: 'dozer', forbid: ['swop:jumper'], uses: 'push' }, { name: 'jumper', forbid: ['swop:dozer'], uses: 'jump' }] }] },

    /* ── the vertical slice (PRD §43): School/Workshop Rescue ─────────── */
    { id: 's1', ch: 'misi', title: 'Penyelamatan Sekolah', place: 'Sekolah & Bengkel', icon: 'form/cherry', edu: { domain: 'campuran', skill: 'pengurangan, susun huruf, hitung lompat' },
      grid: { rows: 6, cols: 6, map: ['#.#.##', '..#..#', '..#..#', '..#.##', '....o.', 'T,##,,'], theme: 'school' }, rev: 3,
      mojo: { at: [4, 0], h: 'E', form: 'normal' },
      res: { water: 4, bolts: 5 }, cap: { water: 5, bolts: 8 },
      objects: [
        { id: 'batu', type: 'rock', at: [4, 2] },
        { id: 'api1', type: 'fire', at: [3, 3], str: 2 },
        { id: 'api2', type: 'fire', at: [0, 3], str: 5 },
        { id: 'd1', type: 'drop', at: [2, 3] }, { id: 'd2', type: 'drop', at: [1, 3] }, { id: 'd3', type: 'drop', at: [1, 4] },
        { id: 'kotak', type: 'toolbox', at: [2, 1], tool: 'palu', mg: { kind: 'letters', id: 'palu' } },
        { id: 'b1', type: 'bolt', at: [3, 0] }, { id: 'b2', type: 'bolt', at: [2, 0] }, { id: 'b3', type: 'bolt', at: [3, 1] },
        { id: 'gerbang', type: 'repair', at: [1, 1], needs: { tool: 'palu', bolts: 8 }, what: 'gate' },
        { id: 'mia', type: 'person', at: [0, 1], elev: 6, perch: 'balcony', who: 'oona', name: 'Oona', mg: { id: 'tinggi-mia', step: 2 } },
        { id: 'bintang', type: 'star', at: [4, 5] }
      ],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [
        { title: 'Api pertama', story: 'Sekolah Swoppiton terbakar, dan Oona si anak anjing terjebak di balkon! Batu besar menutup jalan.',
          bo: 'Padamkan api pertama di sekolah. Dari SEBELAH batu, Dozer bisa DORONG dan Mojo Lompat bisa LOMPAT. Lalu berhenti di SEBELAH api dan SEMPROT!',
          objectives: [{ 'do': 'extinguish', id: 'api1' }], slots: 10, budget: 6, starExtra: 4, forms: ['normal', 'dozer', 'jumper', 'fire'], best: ['dozer'], alt: ['jumper'], decoys: ['racer'],
          palette: ['up', 'down', 'west', 'east', 'push', 'jump', 'spray', 'swop:dozer', 'swop:jumper', 'swop:fire'],
          alts: [{ name: 'dozer', forbid: ['swop:jumper'], uses: 'push' }, { name: 'jumper', forbid: ['swop:dozer'], uses: 'jump' }] },
        { title: 'Api besar', story: 'Api kedua lebih besar! Api ini perlu 5 air.',
          bo: 'Padamkan api besar di atas. Tangki Mojo tinggal 2: LEWATI tetes air biru dulu, lalu berhenti di SEBELAH api dan SEMPROT!',
          math: { kind: 'collect', about: 'need=5 have=2 noun=tetes_air' },
          objectives: [{ 'do': 'extinguish', id: 'api2' }], slots: 8, budget: 6, forms: ['fire'], palette: ['up', 'down', 'west', 'east', 'spray'] },
        { title: 'Gerbang rusak', story: 'Apinya padam! Tapi gerbang ke balkon Oona rusak. Mojo kembali ke bengkel.',
          bo: 'Gerbang perlu palu dan 8 baut. Kita punya 5 baut. LEWATI kotak alat dan baut, lalu berhenti di SEBELAH gerbang dan PERBAIKI!',
          math: { kind: 'collect', about: 'need=8 have=5 noun=baut' },
          start: { at: [4, 0], h: 'N' },
          objectives: [{ 'do': 'repair', id: 'gerbang' }], slots: 8, budget: 7, forms: ['normal', 'fire'], best: ['normal'],
          palette: ['up', 'down', 'west', 'east', 'repair', 'spray', 'swop:normal', 'swop:fire'] },
        { title: 'Selamatkan Oona', story: 'Gerbang terbuka! Oona menunggu di balkon yang tinggi.',
          bo: 'Tolong Oona di balkon yang tinggi. Balkonnya tinggi 6. Berhenti di SEBELAH balkon. Mojo mana yang bisa NAIK ke atas?',
          objectives: [{ 'do': 'rescue', id: 'mia' }], slots: 6, budget: 4, forms: ['normal', 'cherry', 'dozer'], best: ['cherry'], decoys: ['racer', 'boat'],
          palette: ['up', 'down', 'west', 'east', 'raise', 'lower', 'rescue', 'push', 'swop:cherry', 'swop:normal', 'swop:dozer'] }
      ] }
  ]

  W.MojoLevels = {
    FORMS: FORMS, CHAPTERS: CHAPTERS, LEVELS: LEVELS, REGIONS: REGIONS,
    region: function (id) { for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].levels.indexOf(id) >= 0) return REGIONS[i]; return REGIONS[0] },
    byId: function (id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i]; return null },
    index: function (id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return i; return -1 }
  }
})()
