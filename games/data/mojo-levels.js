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
    { id: 'pelabuhan', title: 'Misi Pelabuhan', sub: 'Dermaga' },
    { id: 'misi', title: 'Misi Besar', sub: 'Sekolah & Bengkel' },
    { id: 'hutan', title: 'Petualangan Hutan', sub: 'Bab 3' },
    { id: 'hutan-misi', title: 'Misi Besar Hutan', sub: 'Kucing & Api' },
    { id: 'gunung', title: 'Jalan Pegunungan', sub: 'Bab 4' },
    { id: 'gunung-misi', title: 'Misi Besar Gunung', sub: 'Puncak Gunung' },
    { id: 'konstruksi', title: 'Proyek Konstruksi', sub: 'Bab 5' },
    { id: 'konstruksi-misi', title: 'Misi Besar Proyek', sub: 'Gedung Baru' },
    { id: 'pulau', title: 'Liburan di Pulau Ceria', sub: 'Bab 6' },
    { id: 'pulau-misi', title: 'Misi Besar Pulau', sub: 'Hari Ceria' }
  ]
  // Peta Swoppiton (owner mockup): six regions, every one with real missions (owner bug 2026-10-04: a locked
  // "Segera hadir" region read as a broken unlock). Regions open in order: a region is open once its first
  // level is unlocked by the shell's rule (finish any level with a star -> the next three open, across regions).
  var REGIONS = [
    { id: 'kota', title: 'Kota Pusat', bg: 'mojo-bg/garage-street', open: true, levels: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 'm1', 'm2', 'm3', 'm4', 's1'] },
    { id: 'pelabuhan', title: 'Pelabuhan', bg: 'mojo-bg/beach-dock', open: true, levels: ['m5', 'm6', 'm7', 'm8', 'm9'] },
    { id: 'hutan', title: 'Hutan', bg: 'mojo-bg/forest-trail', open: true, levels: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
    { id: 'gunung', title: 'Pegunungan', bg: 'mojo-bg/waterfall', open: true, levels: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] },
    { id: 'konstruksi', title: 'Konstruksi', bg: 'mojo-bg/construction', open: true, levels: ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'] },
    { id: 'pulau', title: 'Pulau Ceria', bg: 'mojo-bg/coast', open: true, levels: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] }
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

    /* ── Pelabuhan's fifth mission (2026-10-04: every region has >= 5); placed before s1 so it opens in order ── */
    { id: 'm9', ch: 'pelabuhan', title: 'Lampu Mercusuar', place: 'Dermaga', icon: 'tool/kunci', edu: { domain: 'bahasa', skill: 'susun huruf + hitung lompat' },
      grid: { rows: 4, cols: 5, map: ['~~,~~', '~...~', '~.~.~', '.....'], theme: 'town' }, rev: 3,
      mojo: { at: [3, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'kotak', type: 'toolbox', at: [2, 1], tool: 'kunci', mg: { kind: 'letters', id: 'kunci' } },
        { id: 'lampu', type: 'repair', at: [0, 2], elev: 6, perch: 'pole', needs: { tool: 'kunci' }, what: 'lamp', mg: { id: 'tinggi-mercusuar', step: 2 } },
        { id: 'bintang', type: 'star', at: [2, 3] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Kapal butuh cahaya', story: 'Lampu mercusuar mati. Kapal nelayan tidak bisa melihat dermaga!', bo: 'Perbaiki lampu mercusuar di dermaga. LEWATI kotak alat untuk kunci, lalu jadi Mojo Keranjang: NAIK dan PERBAIKI.',
        objectives: [{ 'do': 'repair', id: 'lampu' }], slots: 12, budget: 7, starExtra: 4, forms: ['normal', 'cherry'], best: ['cherry'], decoys: ['boat'],
        palette: ['up', 'down', 'west', 'east', 'raise', 'repair', 'swop:cherry'] }] },

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
      ] },
    /* ── Hutan (region 3, owner 2026-10-04: every region on the map has real missions) ── */
    { id: 'h1', ch: 'hutan', title: 'Jalan Hutan Tertutup', place: 'Jalan Hutan', icon: 'form/dozer', edu: { domain: 'swop', skill: 'dorong' },
      grid: { rows: 4, cols: 5, map: ['TTTTT', '..o..', 'TTT.T', 'TTT.T'], theme: 'park' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'batu', type: 'rock', at: [1, 1] }, { id: 'flag', type: 'flag', at: [1, 4] }, { id: 'bintang', type: 'star', at: [3, 3] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Batu sesudah badai', story: 'Badai semalam menjatuhkan batu besar di jalan hutan!', bo: 'Antar Mojo ke bendera di ujung hutan. Batu menutup jalan: jadi Dozer, berhenti di SEBELAH batu, lalu DORONG ke lubang.',
        objectives: [{ 'do': 'reach', at: [1, 4] }], slots: 10, budget: 5, starExtra: 4, forms: ['normal', 'dozer'], best: ['dozer'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'push', 'swop:dozer'] }] },

    { id: 'h2', ch: 'hutan', title: 'Api di Hutan', place: 'Hutan Pinus', icon: 'form/fire', edu: { domain: 'matematika', skill: 'pengurangan' },
      grid: { rows: 4, cols: 4, map: ['TTT,', '....', '.TT,', '.TTT'], theme: 'park' }, rev: 3,
      mojo: { at: [3, 0], h: 'N', form: 'normal' },
      res: { water: 1 }, cap: { water: 5 },
      objects: [{ id: 'api', type: 'fire', at: [1, 3], str: 2 }, { id: 'd1', type: 'drop', at: [2, 0] }],
      beats: [{ title: 'Api kecil', story: 'Ada api kecil di ujung jalan hutan. Padamkan sebelum menyebar!', bo: 'Padamkan api di ujung jalan hutan. Api perlu 2 air, tangki baru 1. LEWATI tetes air, jadi Mojo Pemadam, lalu SEMPROT.',
        math: { kind: 'collect', about: 'need=2 have=1 noun=tetes_air' },
        objectives: [{ 'do': 'extinguish', id: 'api' }], slots: 8, budget: 6, forms: ['normal', 'fire'], best: ['fire'], decoys: ['boat'],
        palette: ['up', 'down', 'west', 'east', 'spray', 'swop:fire'] }] },

    { id: 'h3', ch: 'hutan', title: 'Kucing di Pohon Pinus', place: 'Hutan Pinus', icon: 'form/cherry', edu: { domain: 'matematika', skill: 'hitung lompat 2' },
      grid: { rows: 4, cols: 4, map: [',,T,', '....', 'T,.T', 'T,.T'], theme: 'park' }, rev: 3,
      mojo: { at: [3, 2], h: 'N', form: 'normal' },
      objects: [{ id: 'kucing', type: 'person', at: [0, 1], elev: 6, perch: 'tree', who: 'cat', name: 'Kucing', mg: { id: 'tinggi-kucing-hutan', step: 2 } },
        { id: 'bintang', type: 'star', at: [1, 3] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Kucing di pohon tinggi', story: 'Kucing mengejar kupu-kupu sampai ke puncak pohon pinus!', bo: 'Tolong Kucing di atas pohon pinus. Pohonnya tinggi 6: jadi Mojo Keranjang, berhenti di SEBELAH pohon, NAIK, lalu TOLONG.',
        objectives: [{ 'do': 'rescue', id: 'kucing' }], slots: 9, budget: 6, starExtra: 2, forms: ['normal', 'cherry'], best: ['cherry'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'raise', 'rescue', 'swop:cherry'] }] },

    { id: 'h4', ch: 'hutan', title: 'Sungai Hutan', place: 'Tepi Sungai', icon: 'form/jumper', edu: { domain: 'algoritma', skill: 'pola' },
      grid: { rows: 3, cols: 6, map: ['TTTTTT', '..~.~.', 'TTTTTT'], theme: 'park' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'flag', type: 'flag', at: [1, 5] }],
      beats: [{ title: 'Dua aliran sungai', story: 'Jembatan kayu hanyut terbawa arus. Ada dua aliran sungai!', bo: 'Seberangi sungai sampai ke bendera. Mobil tidak bisa masuk air: jadi Mojo Lompat, berhenti di SEBELAH air, lalu LOMPAT.',
        objectives: [{ 'do': 'reach', at: [1, 5] }], slots: 6, budget: 4, forms: ['normal', 'jumper'], best: ['jumper'], decoys: ['boat'],
        palette: ['up', 'down', 'west', 'east', 'jump', 'swop:jumper'] }] },

    { id: 'h5', ch: 'hutan', title: 'Dua Api Hutan', place: 'Hutan Pinus', icon: 'form/fire', edu: { domain: 'matematika', skill: 'penjumlahan' },
      grid: { rows: 4, cols: 5, map: [',,T,T', '.....', 'TT,TT', 'TT,TT'], theme: 'park' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      res: { water: 2 }, cap: { water: 5 },
      objects: [{ id: 'api1', type: 'fire', at: [0, 1], str: 1 }, { id: 'api2', type: 'fire', at: [0, 3], str: 2 }, { id: 'd1', type: 'drop', at: [1, 2] }, { id: 'bintang', type: 'star', at: [1, 4] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Api berderet', story: 'Dua api muncul di tepi jalan hutan!', bo: 'Padamkan dua api di tepi hutan. Api pertama perlu 1 air, api kedua perlu 2. LEWATI tetes air di antaranya, lalu SEMPROT.',
        math: { kind: 'collect', about: 'need=3 have=2 noun=tetes_air' },
        objectives: [{ 'do': 'extinguish', id: 'api1' }, { 'do': 'extinguish', id: 'api2' }], slots: 10, budget: 6, starExtra: 2, forms: ['normal', 'fire'], best: ['fire'], decoys: ['water'],
        palette: ['up', 'down', 'west', 'east', 'spray', 'swop:fire'] }] },

    { id: 'h6', ch: 'hutan-misi', title: 'Penyelamatan Hutan', place: 'Hutan Pinus', icon: 'form/cherry', edu: { domain: 'campuran', skill: 'tiga swop, hitung lompat' },
      grid: { rows: 5, cols: 6, map: ['TT,TTT', 'TT...T', 'TTT,.T', 'TTT,.T', '..o..T'], theme: 'park' }, rev: 3,
      mojo: { at: [4, 0], h: 'E', form: 'normal' },
      res: { water: 1 }, cap: { water: 5 },
      objects: [
        { id: 'batu', type: 'rock', at: [4, 1] }, { id: 'd1', type: 'drop', at: [4, 3] }, { id: 'flag', type: 'flag', at: [4, 4] },
        { id: 'api', type: 'fire', at: [2, 4], str: 2 },
        { id: 'kucing', type: 'person', at: [0, 2], elev: 4, perch: 'tree', who: 'cat', name: 'Kucing', mg: { id: 'tinggi-kucing-pinus', step: 2 } }
      ],
      beats: [
        { title: 'Jalan tertutup', story: 'Kucing terjebak di pohon, dan ada api di jalan hutan! Tapi batu besar menutup jalan.',
          bo: 'Buka jalan hutan sampai ke bendera. Dari SEBELAH batu, jadi Dozer lalu DORONG batu ke lubang.',
          objectives: [{ 'do': 'reach', at: [4, 4] }], slots: 8, budget: 5, forms: ['normal', 'dozer'], best: ['dozer'], decoys: ['racer'],
          palette: ['up', 'down', 'west', 'east', 'push', 'swop:dozer'] },
        { title: 'Api di jalan', story: 'Jalan terbuka! Sekarang api menghalangi jalan ke pohon kucing.',
          bo: 'Padamkan api di jalan hutan. Tangki sudah terisi tetes air. Jadi Mojo Pemadam, berhenti di SEBELAH api, lalu SEMPROT.',
          objectives: [{ 'do': 'extinguish', id: 'api' }], slots: 6, budget: 3, forms: ['dozer', 'fire'], best: ['fire'],
          palette: ['up', 'down', 'west', 'east', 'spray', 'swop:fire'] },
        { title: 'Selamatkan kucing', story: 'Apinya padam! Kucing menunggu di puncak pohon.',
          bo: 'Tolong Kucing di atas pohon. Pohonnya tinggi 4: jadi Mojo Keranjang, NAIK, lalu TOLONG.',
          objectives: [{ 'do': 'rescue', id: 'kucing' }], slots: 9, budget: 7, forms: ['fire', 'cherry'], best: ['cherry'], decoys: ['chopper'],
          palette: ['up', 'down', 'west', 'east', 'raise', 'rescue', 'swop:cherry'] }
      ] },

    /* ── Pegunungan (region 4) ──────────────────────────────────────── */
    { id: 'g1', ch: 'gunung', title: 'Batu Longsor', place: 'Kaki Gunung', icon: 'form/dozer', edu: { domain: 'swop', skill: 'dorong' },
      grid: { rows: 4, cols: 4, map: ['T,,T', 'To..', 'T.TT', 'T.TT'], theme: 'hill' }, rev: 3,
      mojo: { at: [3, 1], h: 'N', form: 'normal' },
      objects: [{ id: 'batu', type: 'rock', at: [2, 1] }, { id: 'flag', type: 'flag', at: [1, 3] }],
      beats: [{ title: 'Batu dari tebing', story: 'Batu menggelinding dari tebing dan menutup jalan gunung!', bo: 'Buka jalan gunung sampai ke bendera. Jadi Dozer, berhenti di SEBELAH batu, lalu DORONG batu ke lubang.',
        objectives: [{ 'do': 'reach', at: [1, 3] }], slots: 7, budget: 5, forms: ['normal', 'dozer'], best: ['dozer'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'push', 'swop:dozer'] }] },

    { id: 'g2', ch: 'gunung', title: 'Dua Lubang', place: 'Jalan Berbatu', icon: 'form/jumper', edu: { domain: 'algoritma', skill: 'arah' },
      grid: { rows: 4, cols: 4, map: ['TTTT', '..o.', 'oTTT', '.TTT'], theme: 'hill' }, rev: 3,
      mojo: { at: [3, 0], h: 'N', form: 'normal' },
      objects: [{ id: 'flag', type: 'flag', at: [1, 3] }],
      beats: [{ title: 'Lubang di tikungan', story: 'Jalan gunung berlubang di dua tempat!', bo: 'Sampai ke bendera di seberang dua lubang. Jadi Mojo Lompat, lalu LOMPAT dari SEBELAH lubang. Ingat arahnya!',
        objectives: [{ 'do': 'reach', at: [1, 3] }], slots: 6, budget: 4, forms: ['normal', 'jumper'], best: ['jumper'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'jump', 'swop:jumper'] }] },

    { id: 'g3', ch: 'gunung', title: 'Jembatan Putus', place: 'Jurang', icon: 'form/jumper', edu: { domain: 'swop', skill: 'dua swop' },
      grid: { rows: 3, cols: 6, map: ['~~~~~,', '..=o=.', '~~~~~~'], theme: 'hill' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'kakek', type: 'person', at: [0, 5], who: 'grandad', name: 'Kakek' }],
      beats: [{ title: 'Kakek di seberang', story: 'Jembatan di atas jurang putus di tengah. Kakek menunggu di seberang!', bo: 'Tolong Kakek di seberang jembatan putus. Jadi Mojo Lompat dan LOMPAT celahnya, lalu Swop jadi Mojo dan TOLONG.',
        objectives: [{ 'do': 'rescue', id: 'kakek' }], slots: 9, budget: 7, forms: ['normal', 'jumper'], best: ['jumper'], decoys: ['boat'],
        palette: ['up', 'down', 'west', 'east', 'jump', 'rescue', 'swop:jumper', 'swop:normal'] }] },

    { id: 'g4', ch: 'gunung', title: 'Neon di Pohon', place: 'Lereng Gunung', icon: 'form/cherry', edu: { domain: 'swop', skill: 'dua swop' },
      grid: { rows: 4, cols: 5, map: ['TTTTT', 'T,TTT', '..o..', 'TTTTT'], theme: 'hill' }, rev: 3,
      mojo: { at: [2, 4], h: 'W', form: 'normal' },
      objects: [{ id: 'batu', type: 'rock', at: [2, 3] }, { id: 'neon', type: 'person', at: [1, 1], elev: 4, perch: 'tree', who: 'neon', name: 'Neon', mg: { id: 'tinggi-neon', step: 2 } },
        { id: 'bintang', type: 'star', at: [2, 0] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Neon memanjat', story: 'Neon memanjat pohon untuk melihat longsor, tapi tidak bisa turun!', bo: 'Tolong Neon di atas pohon gunung. DORONG batu ke lubang, lalu jadi Mojo Keranjang: NAIK dan TOLONG.',
        objectives: [{ 'do': 'rescue', id: 'neon' }], slots: 10, budget: 7, starExtra: 2, forms: ['normal', 'dozer', 'cherry'], best: ['dozer'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'push', 'raise', 'rescue', 'swop:dozer', 'swop:cherry'] }] },

    { id: 'g5', ch: 'gunung', title: 'Lampu Terowongan', place: 'Terowongan', icon: 'tool/obeng', edu: { domain: 'bahasa', skill: 'susun huruf' },
      grid: { rows: 4, cols: 4, map: ['##,#', '....', 'T.TT', 'T.TT'], theme: 'hill' }, rev: 3,
      mojo: { at: [3, 1], h: 'N', form: 'normal' },
      objects: [{ id: 'kotak', type: 'toolbox', at: [2, 1], tool: 'obeng', mg: { kind: 'letters', id: 'obeng' } },
        { id: 'lampu', type: 'repair', at: [0, 2], elev: 4, perch: 'pole', needs: { tool: 'obeng' }, what: 'lamp', mg: { id: 'tinggi-lampu-gunung', step: 2 } }],
      beats: [{ title: 'Terowongan gelap', story: 'Lampu di mulut terowongan mati. Mobil tidak bisa melihat jalan!', bo: 'Perbaiki lampu di mulut terowongan. LEWATI kotak alat untuk obeng, lalu jadi Mojo Keranjang: NAIK dan PERBAIKI.',
        objectives: [{ 'do': 'repair', id: 'lampu' }], slots: 8, budget: 6, forms: ['normal', 'cherry'], best: ['cherry'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'raise', 'repair', 'swop:cherry'] }] },

    { id: 'g6', ch: 'gunung-misi', title: 'Penyelamatan Gunung', place: 'Puncak Gunung', icon: 'form/jumper', edu: { domain: 'campuran', skill: 'tiga swop, hitung lompat' },
      grid: { rows: 5, cols: 6, map: ['TTTT,,', '..=o=.', 'o~~~~~', '.TTTTT', '.TTTTT'], theme: 'hill' }, rev: 3,
      mojo: { at: [4, 0], h: 'N', form: 'normal' },
      objects: [
        { id: 'batu', type: 'rock', at: [3, 0] }, { id: 'flag', type: 'flag', at: [1, 1] },
        { id: 'kakek', type: 'person', at: [0, 4], who: 'grandad', name: 'Kakek' },
        { id: 'oona', type: 'person', at: [0, 5], elev: 6, perch: 'tree', who: 'oona', name: 'Oona', mg: { id: 'tinggi-oona-gunung', step: 2 } }
      ],
      beats: [
        { title: 'Longsor', story: 'Kakek dan Oona terjebak di puncak gunung! Batu longsor menutup jalan naik.',
          bo: 'Buka jalan gunung sampai ke bendera. Jadi Dozer, lalu DORONG batu ke lubang.',
          objectives: [{ 'do': 'reach', at: [1, 1] }], slots: 7, budget: 5, forms: ['normal', 'dozer'], best: ['dozer'], decoys: ['racer'],
          palette: ['up', 'down', 'west', 'east', 'push', 'swop:dozer'] },
        { title: 'Jembatan putus', story: 'Jalan terbuka! Tapi jembatan ke Kakek putus di tengah.',
          bo: 'Tolong Kakek di seberang jembatan. Jadi Mojo Lompat dan LOMPAT celahnya, lalu jadi Mojo dan TOLONG.',
          objectives: [{ 'do': 'rescue', id: 'kakek' }], slots: 7, budget: 5, forms: ['dozer', 'normal', 'jumper'], best: ['jumper'], decoys: ['boat'],
          palette: ['up', 'down', 'west', 'east', 'jump', 'rescue', 'swop:jumper', 'swop:normal'] },
        { title: 'Oona di pohon', story: 'Kakek selamat! Oona menunggu di pohon yang tinggi.',
          bo: 'Tolong Oona di pohon paling tinggi. Pohonnya tinggi 6: jadi Mojo Keranjang, NAIK, lalu TOLONG.',
          objectives: [{ 'do': 'rescue', id: 'oona' }], slots: 6, budget: 4, forms: ['normal', 'cherry'], best: ['cherry'], decoys: ['chopper'],
          palette: ['up', 'down', 'west', 'east', 'raise', 'rescue', 'swop:cherry'] }
      ] },

    /* ── Konstruksi (region 5) ──────────────────────────────────────── */
    { id: 'k1', ch: 'konstruksi', title: 'Peti di Jalan', place: 'Proyek Gedung', icon: 'obj/crate', edu: { domain: 'algoritma', skill: 'aksi' },
      grid: { rows: 3, cols: 5, map: ['#####', '.....', '#####'], theme: 'town' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'peti', type: 'crate', at: [1, 2] }, { id: 'flag', type: 'flag', at: [1, 4] }],
      beats: [{ title: 'Antar peti', story: 'Peti berisi bahan bangunan tertinggal di jalan proyek!', bo: 'Bawa peti ke bendera di proyek. Berhenti di SEBELAH peti, lalu AMBIL. Mojo bisa jalan sambil membawa peti!',
        objectives: [{ 'do': 'reach', at: [1, 4] }], slots: 7, budget: 5, forms: ['normal'],
        palette: ['up', 'down', 'west', 'east', 'pick'] }] },

    { id: 'k2', ch: 'konstruksi', title: 'Gerbang Proyek', place: 'Proyek Gedung', icon: 'tool/kunci', edu: { domain: 'matematika', skill: 'pengurangan' },
      grid: { rows: 4, cols: 5, map: ['##,##', '.....', '.#.#.', '.....'], theme: 'town' }, rev: 3,
      mojo: { at: [3, 0], h: 'E', form: 'normal' },
      res: { bolts: 3 }, cap: { bolts: 6 },
      objects: [{ id: 'gerbang', type: 'repair', at: [0, 2], needs: { tool: 'kunci', bolts: 5 }, what: 'gate' },
        { id: 'kotak', type: 'toolbox', at: [3, 1], tool: 'kunci', mg: { kind: 'letters', id: 'kunci' } },
        { id: 'b1', type: 'bolt', at: [3, 2] }, { id: 'b2', type: 'bolt', at: [2, 2] }, { id: 'bintang', type: 'star', at: [1, 4] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Gerbang macet', story: 'Gerbang proyek rusak. Truk bahan tidak bisa masuk!', bo: 'Perbaiki gerbang proyek yang rusak. Perlu kunci dan 5 baut, kita punya 3. LEWATI kotak alat dan baut, lalu PERBAIKI.',
        math: { kind: 'collect', about: 'need=5 have=3 noun=baut' },
        objectives: [{ 'do': 'repair', id: 'gerbang' }], slots: 10, budget: 5, starExtra: 4, forms: ['normal'],
        palette: ['up', 'down', 'west', 'east', 'repair'] }] },

    { id: 'k3', ch: 'konstruksi', title: 'Lampu Menara', place: 'Menara Proyek', icon: 'form/cherry', edu: { domain: 'matematika', skill: 'hitung lompat 2' },
      grid: { rows: 4, cols: 5, map: [',.###', '#o..#', '#.#.#', '#...#'], theme: 'town' }, rev: 3,
      mojo: { at: [3, 1], h: 'N', form: 'normal' },
      objects: [{ id: 'batu', type: 'rock', at: [2, 1] }, { id: 'bintang', type: 'star', at: [3, 2] },
        { id: 'lampu', type: 'repair', at: [0, 0], elev: 6, perch: 'pole', needs: {}, what: 'lamp', mg: { id: 'tinggi-menara', step: 2 } }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Menara gelap', story: 'Lampu menara proyek mati, dan batu jatuh di jalan!', bo: 'Perbaiki lampu menara proyek. DORONG batu ke lubang, lalu jadi Mojo Keranjang: NAIK dan PERBAIKI.',
        objectives: [{ 'do': 'repair', id: 'lampu' }], slots: 10, budget: 7, starExtra: 2, forms: ['normal', 'dozer', 'cherry'], best: ['dozer'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'push', 'raise', 'repair', 'swop:dozer', 'swop:cherry'] }] },

    { id: 'k4', ch: 'konstruksi', title: 'Peti Berat', place: 'Gudang Proyek', icon: 'form/crane', edu: { domain: 'swop', skill: 'kemampuan' },
      grid: { rows: 4, cols: 4, map: ['...#', '.###', '.###', '.###'], theme: 'town' }, rev: 3,
      mojo: { at: [3, 0], h: 'N', form: 'normal' },
      objects: [{ id: 'peti', type: 'crate', at: [1, 0], heavy: true }, { id: 'flag', type: 'flag', at: [0, 2] }],
      beats: [{ title: 'Peti besi', story: 'Peti besi ini terlalu berat untuk diangkat tangan!', bo: 'Bawa peti berat ke bendera. Jadi Mojo Derek, berhenti di SEBELAH peti, lalu KAIT. Derek bisa jalan sambil membawanya.',
        objectives: [{ 'do': 'reach', at: [0, 2] }], slots: 9, budget: 7, forms: ['normal', 'crane'], best: ['crane'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'hook', 'swop:crane'] }] },

    { id: 'k5', ch: 'konstruksi', title: 'Api di Gudang', place: 'Gudang Proyek', icon: 'form/fire', edu: { domain: 'swop', skill: 'dua swop' },
      grid: { rows: 3, cols: 5, map: ['#,#,#', '.....', '#####'], theme: 'town' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      res: { water: 2 }, cap: { water: 5 },
      objects: [{ id: 'api', type: 'fire', at: [0, 1], str: 2 }, { id: 'neon', type: 'person', at: [0, 3], who: 'neon', name: 'Neon' }, { id: 'bintang', type: 'star', at: [1, 4] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Asap di gudang', story: 'Ada api di depan gudang, dan Neon terjebak di pintu sebelahnya!', bo: 'Padamkan api gudang dan tolong Neon. Jadi Mojo Pemadam lalu SEMPROT, lalu Swop jadi Mojo dan TOLONG.',
        objectives: [{ 'do': 'extinguish', id: 'api' }, { 'do': 'rescue', id: 'neon' }], slots: 10, budget: 7, starExtra: 2, forms: ['normal', 'fire'], best: ['fire'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'spray', 'rescue', 'swop:fire', 'swop:normal'] }] },

    { id: 'k6', ch: 'konstruksi-misi', title: 'Gedung Baru', place: 'Proyek Gedung', icon: 'form/crane', edu: { domain: 'campuran', skill: 'pengurangan, susun huruf, hitung lompat' },
      grid: { rows: 5, cols: 6, map: ['##,#.#', '.....#', '.#####', '.#####', '.#####'], theme: 'town' }, rev: 3,
      mojo: { at: [4, 0], h: 'N', form: 'normal' },
      res: { bolts: 4 }, cap: { bolts: 6 },
      objects: [
        { id: 'kotak', type: 'toolbox', at: [3, 0], tool: 'palu', mg: { kind: 'letters', id: 'palu' } }, { id: 'b1', type: 'bolt', at: [2, 0] },
        { id: 'gerbang', type: 'repair', at: [1, 1], needs: { tool: 'palu', bolts: 5 }, what: 'gate' },
        { id: 'oona', type: 'person', at: [0, 2], elev: 4, perch: 'balcony', who: 'oona', name: 'Oona', mg: { id: 'tinggi-oona-gedung', step: 2 } },
        { id: 'peti', type: 'crate', at: [1, 3], heavy: true }, { id: 'flag', type: 'flag', at: [0, 4] }
      ],
      beats: [
        { title: 'Gerbang rusak', story: 'Gedung baru hampir selesai! Tapi gerbangnya rusak, dan Oona terjebak di lantai atas.',
          bo: 'Perbaiki gerbang proyek dulu. Perlu palu dan 5 baut, kita punya 4. LEWATI kotak alat dan baut, lalu PERBAIKI.',
          math: { kind: 'collect', about: 'need=5 have=4 noun=baut' },
          objectives: [{ 'do': 'repair', id: 'gerbang' }], slots: 6, budget: 4, forms: ['normal'],
          palette: ['up', 'down', 'west', 'east', 'repair'] },
        { title: 'Oona di lantai atas', story: 'Gerbang terbuka! Oona melambai dari lantai atas.',
          bo: 'Tolong Oona di lantai atas gedung. Tingginya 4: jadi Mojo Keranjang, NAIK, lalu TOLONG.',
          objectives: [{ 'do': 'rescue', id: 'oona' }], slots: 7, budget: 5, forms: ['normal', 'cherry'], best: ['cherry'], decoys: ['racer'],
          palette: ['up', 'down', 'west', 'east', 'raise', 'rescue', 'swop:cherry'] },
        { title: 'Peti ke atap', story: 'Oona selamat! Terakhir, peti besi harus diantar ke atap.',
          bo: 'Bawa peti berat ke bendera di atap. Jadi Mojo Derek, berhenti di SEBELAH peti, lalu KAIT.',
          objectives: [{ 'do': 'reach', at: [0, 4] }], slots: 7, budget: 5, forms: ['cherry', 'crane'], best: ['crane'], decoys: ['dozer'],
          palette: ['up', 'down', 'west', 'east', 'hook', 'swop:crane'] }
      ] },

    /* ── Pulau Ceria (region 6) ─────────────────────────────────────── */
    { id: 'p1', ch: 'pulau', title: 'Jalan Pantai', place: 'Pantai Pasir', icon: 'cmd/east', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 4, cols: 5, map: ['~~~~~', '...~~', ',T..,', ',,...'], theme: 'park' }, rev: 3,
      mojo: { at: [1, 0], h: 'E', form: 'normal' },
      objects: [{ id: 'flag', type: 'flag', at: [3, 4] }, { id: 'bintang', type: 'star', at: [2, 3] }],
      optional: [{ 'do': 'star', id: 'bintang' }],
      beats: [{ title: 'Selamat datang di pulau', story: 'Mojo tiba di Pulau Ceria. Ayo jalan-jalan di pantai!', bo: 'Jalan-jalan ke bendera di tepi pantai. Ikuti jalan berbelok, dan LEWATI bintang di jalan!',
        objectives: [{ 'do': 'reach', at: [3, 4] }], slots: 8, budget: 6, forms: ['normal'],
        palette: ['up', 'down', 'west', 'east'] }] },

    { id: 'p2', ch: 'pulau', title: 'Kios Es Terbakar', place: 'Pantai Pasir', icon: 'form/fire', edu: { domain: 'matematika', skill: 'pengurangan' },
      grid: { rows: 4, cols: 4, map: ['~,~~', '...~', '.T.~', '...~'], theme: 'park' }, rev: 3,
      mojo: { at: [3, 2], h: 'W', form: 'normal' },
      res: { water: 1 }, cap: { water: 5 },
      objects: [{ id: 'api', type: 'fire', at: [0, 1], str: 3 }, { id: 'd1', type: 'drop', at: [3, 0] }, { id: 'd2', type: 'drop', at: [2, 0] }],
      beats: [{ title: 'Kios es krim', story: 'Kios es krim di pantai terbakar!', bo: 'Padamkan api di kios es krim pantai. Api perlu 3 air, tangki baru 1. LEWATI dua tetes air, lalu SEMPROT.',
        math: { kind: 'collect', about: 'need=3 have=1 noun=tetes_air' },
        objectives: [{ 'do': 'extinguish', id: 'api' }], slots: 9, budget: 7, forms: ['normal', 'fire'], best: ['fire'], decoys: ['boat'],
        palette: ['up', 'down', 'west', 'east', 'spray', 'swop:fire'] }] },

    { id: 'p3', ch: 'pulau', title: 'Ayunan Pasar Malam', place: 'Pasar Malam', icon: 'tool/obeng', edu: { domain: 'bahasa', skill: 'susun huruf + pengurangan' },
      grid: { rows: 4, cols: 5, map: ['T,,,T', '.....', '.T.T.', '.....'], theme: 'park' }, rev: 3,
      mojo: { at: [3, 2], h: 'N', form: 'normal' },
      res: { bolts: 3 }, cap: { bolts: 6 },
      objects: [{ id: 'ayunan', type: 'repair', at: [0, 2], needs: { tool: 'obeng', bolts: 5 }, what: 'swing' },
        { id: 'kotak', type: 'toolbox', at: [2, 2], tool: 'obeng', mg: { kind: 'letters', id: 'obeng' } },
        { id: 'b1', type: 'bolt', at: [1, 1] }, { id: 'b2', type: 'bolt', at: [1, 3] }],
      beats: [{ title: 'Ayunan berhenti', story: 'Ayunan besar di pasar malam berhenti berputar!', bo: 'Perbaiki ayunan besar di pasar malam. LEWATI kotak alat untuk obeng. Ayunan perlu 5 baut, kita punya 3. Lalu PERBAIKI.',
        math: { kind: 'collect', about: 'need=5 have=3 noun=baut' },
        objectives: [{ 'do': 'repair', id: 'ayunan' }], slots: 9, budget: 7, forms: ['normal'],
        palette: ['up', 'down', 'west', 'east', 'repair'] }] },

    { id: 'p4', ch: 'pulau', title: 'Teman di Pulau Kecil', place: 'Pulau Kecil', icon: 'form/chopper', edu: { domain: 'swop', skill: 'terbang' },
      grid: { rows: 3, cols: 5, map: ['~~~~,', '..~~.', 'TT~~~'], theme: 'park' }, rev: 3,
      mojo: { at: [1, 1], h: 'E', form: 'normal' },
      objects: [{ id: 'neon', type: 'person', at: [0, 4], who: 'neon', name: 'Neon' }],
      beats: [{ title: 'Terjebak di pulau', story: 'Perahu Neon hanyut, dan Neon terjebak di pulau kecil!', bo: 'Tolong Neon di pulau kecil seberang laut. Mobil tidak bisa masuk air: jadi Mojo Heli, TERBANG, lalu TOLONG dari udara.',
        objectives: [{ 'do': 'rescue', id: 'neon' }], slots: 8, budget: 6, forms: ['normal', 'chopper'], best: ['chopper'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'takeoff', 'rescue', 'swop:chopper'] }] },

    { id: 'p5', ch: 'pulau', title: 'Dua Teman di Pantai', place: 'Pantai Pasir', icon: 'form/cherry', edu: { domain: 'algoritma', skill: 'rencana' },
      grid: { rows: 4, cols: 5, map: [',,T,,', '.....', '~~.~~', '~~.~~'], theme: 'park' }, rev: 3,
      mojo: { at: [3, 2], h: 'N', form: 'normal' },
      objects: [{ id: 'kucing', type: 'person', at: [0, 1], elev: 4, perch: 'tree', who: 'cat', name: 'Kucing', mg: { id: 'tinggi-kucing-pantai', step: 2 } },
        { id: 'kakek', type: 'person', at: [0, 3], who: 'grandad', name: 'Kakek' }],
      beats: [{ title: 'Dua teman', story: 'Kakek terkilir di pantai, dan Kucing naik pohon kelapa!', bo: 'Tolong Kakek dan Kucing di tepi pantai. TOLONG Kakek dulu, lalu jadi Mojo Keranjang: NAIK dan TOLONG Kucing.',
        objectives: [{ 'do': 'rescue', id: 'kakek' }, { 'do': 'rescue', id: 'kucing' }], slots: 11, budget: 9, forms: ['normal', 'cherry'], best: ['cherry'], decoys: ['racer'],
        palette: ['up', 'down', 'west', 'east', 'raise', 'rescue', 'swop:cherry'] }] },

    { id: 'p6', ch: 'pulau-misi', title: 'Hari Ceria', place: 'Pulau Ceria', icon: 'form/chopper', edu: { domain: 'campuran', skill: 'pengurangan, susun huruf, terbang' },
      grid: { rows: 4, cols: 6, map: [',T,~~,', '....~.', '.T.T~~', '....~~'], theme: 'park' }, rev: 3,
      mojo: { at: [3, 0], h: 'N', form: 'normal' },
      res: { water: 2, bolts: 2 }, cap: { water: 5, bolts: 6 },
      objects: [
        { id: 'api', type: 'fire', at: [0, 2], str: 2 },
        { id: 'ayunan', type: 'repair', at: [0, 0], needs: { tool: 'palu', bolts: 4 }, what: 'swing' },
        { id: 'kotak', type: 'toolbox', at: [3, 2], tool: 'palu', mg: { kind: 'letters', id: 'palu' } },
        { id: 'b1', type: 'bolt', at: [3, 1] }, { id: 'b2', type: 'bolt', at: [2, 2] },
        { id: 'neon', type: 'person', at: [0, 5], who: 'neon', name: 'Neon' }
      ],
      beats: [
        { title: 'Api di kios', story: 'Hari ini pesta di Pulau Ceria! Tapi kios di pantai terbakar.',
          bo: 'Padamkan api di kios pantai. Jadi Mojo Pemadam, berhenti di SEBELAH api, lalu SEMPROT.',
          objectives: [{ 'do': 'extinguish', id: 'api' }], slots: 8, budget: 6, forms: ['normal', 'fire'], best: ['fire'], decoys: ['boat'],
          palette: ['up', 'down', 'west', 'east', 'spray', 'swop:fire'] },
        { title: 'Ayunan pesta', story: 'Apinya padam! Sekarang ayunan pesta harus diperbaiki.',
          bo: 'Perbaiki ayunan pesta di pojok. Perlu palu dan 4 baut, kita punya 2. LEWATI kotak alat dan baut, lalu PERBAIKI.',
          math: { kind: 'collect', about: 'need=4 have=2 noun=baut' },
          objectives: [{ 'do': 'repair', id: 'ayunan' }], slots: 10, budget: 8, forms: ['normal', 'fire'], best: ['normal'],
          palette: ['up', 'down', 'west', 'east', 'repair', 'swop:normal'] },
        { title: 'Neon di pulau', story: 'Ayunan berputar lagi! Tapi Neon masih di pulau seberang.',
          bo: 'Tolong Neon di pulau seberang. Jadi Mojo Heli, TERBANG di atas air, lalu TOLONG.',
          objectives: [{ 'do': 'rescue', id: 'neon' }], slots: 10, budget: 8, forms: ['normal', 'chopper'], best: ['chopper'], decoys: ['racer'],
          palette: ['up', 'down', 'west', 'east', 'takeoff', 'rescue', 'swop:chopper'] }
      ] }

  ]

  W.MojoLevels = {
    FORMS: FORMS, CHAPTERS: CHAPTERS, LEVELS: LEVELS, REGIONS: REGIONS,
    region: function (id) { for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].levels.indexOf(id) >= 0) return REGIONS[i]; return REGIONS[0] },
    byId: function (id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i]; return null },
    index: function (id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return i; return -1 }
  }
})()
