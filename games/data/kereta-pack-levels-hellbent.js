/* =============================================================================
 * kereta-pack-levels-hellbent.js — "Lomba ke Kota" on the MOJO engine (owner 2026-10-11, corrected the same day).
 * HERO = the old steam train "Si Gigih" (slow but determined, form 'gigih', sprite train-char/defeatist); RIVAL = the proud, fast
 * silver streamliner "Kilat Perak" (form 'kilat', sprite train-char/silver). Both race to the town festival: Kilat shows off and
 * gets into trouble, Gigih keeps going and helps, they finish as friends. 15 levels: 9 driven by Gigih (60%), 6 by Kilat (40%);
 * the other train is a patrol / NPC in most of them. Kid-safe, no war content. Coal is loaded into the firebox, never carried.
 * Own cast only: train-char/defeatist + silver and shared scenery.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var MOVE = ['up', 'down', 'west', 'east']
  var CHAPTERS = [{ id: 'hb-ch1', title: 'Mulai Lomba', sub: 'Bab 1' }, { id: 'hb-ch2', title: 'Jalan Bersama', sub: 'Bab 2' }, { id: 'hb-ch3', title: 'Pesta di Kota', sub: 'Bab 3' }]
  var REGIONS = [{ id: 'hb-ch1', title: 'Mulai Lomba', bg: 'bg-hb-start', card: 'card-hb-start', open: true, levels: ['hb01', 'hb02', 'hb03', 'hb04', 'hb05'] },
    { id: 'hb-ch2', title: 'Jalan Bersama', bg: 'bg-hb-padang', card: 'card-hb-padang', open: true, levels: ['hb06', 'hb07', 'hb08', 'hb09', 'hb10'] },
    { id: 'hb-ch3', title: 'Pesta di Kota', bg: 'bg-hb-kota', card: 'card-hb-kota', open: true, levels: ['hb11', 'hb12', 'hb13', 'hb14', 'hb15'] }]
  var LIB = {
    'train/gigih': 'train-char/defeatist/34l-neutral', 'train/gigih-b': 'train-char/defeatist/34l-sad', 'train/kilat': 'train-char/silver/34l-happy', 'train/kilat-b': 'train-char/silver/34l-angry',
    'obj/semangat': 'mojo-prop/star', 'obj/hb-batu': 'kereta-prop/coal-pile', 'obj/hb-bak': 'kereta-prop/barrel',
    'train/hb-gerbong': 'mojo-train/coach-slip', 'obj/hb-panggung': 'kereta-prop/station-small', 'obj/hb-sinyal': 'kereta-tile/signal-red'
  }
  var G = 'train-char/defeatist/front-34l', K = 'train-char/silver/front-34l'
  function L (o) { o.rev = 1; o.autoAim = true; return o }
  var LEVELS = [
    // ── Bab 1 "Mulai Lomba" ───────────────────────────────────────────────────────────────────────
    // 01 GIGIH: Kilat Perak whooshes across the line at the start; Gigih waits his turn, then chugs to the flag
    L({ id: 'hb01', ch: 'hb-ch1', cards: [
        { bg: 'bg-hb-start', art: [{ k: G, x: 36, s: 58 }], text: 'Si Gigih, lokomotif tua, ikut lomba ke kota. Ia pelan, tapi tidak mau menyerah.' },
        { bg: 'bg-hb-start', art: [{ k: K, x: 36, s: 58 }], text: 'Kilat Perak melesat di depan. Tunggu ia lewat dulu, Gigih!' }
      ], terrain: 'meadow', mood: 'sun', n: 1, title: 'Gigih Berangkat Pelan', place: 'Garis Start', icon: 'cmd/wait', bg: 'bg-hb-start', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 3, cols: 8, map: [',T,.,,T,', '........', ',,T.,,,,'], theme: 'town' },
      bunting: { at: [0, 0], n: 8 },
      sign: { at: [2, 0], text: 'START', w: 2 },
      mojo: { at: [1, 0], h: 'E', form: 'gigih' },
      decor: [{ at: [2, 6], art: 'animal/bird-blue/fly', label: 'Burung Pengumum' }, { at: [2, 4], art: 'animal/deer/stand', label: 'Pak Rusa (juri)' }],
      objects: [
        { id: 'sinyal', type: 'patrol', at: [0, 3], name: 'Kilat Perak', art: 'train/kilat', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Tunggu Kilat lewat', story: 'Kilat melesat dulu. Gigih menunggu, lalu jalan.',
        bo: 'Tunggu Kilat Perak lewat, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['gigih'], palette: ['east', 'wait'] }] }),

    // 02 KILAT: the proud racer fetches the festival flag to the stage, showing off his speed
    L({ id: 'hb02', ch: 'hb-ch1', cards: [
        { bg: 'bg-hb-padang', art: [{ k: K, x: 36, s: 58 }], text: 'Kilat Perak sangat cepat. Ia pamer: aku yang pertama sampai!' },
        { bg: 'bg-hb-padang', art: [{ k: 'animal/rabbit/run', x: 14, s: 40 }, { k: K, x: 52, s: 58 }], text: 'Tapi bendera pesta belum terpasang. Bawa ke panggung dulu.' }
      ], terrain: 'meadow', mood: 'sun', n: 2, title: 'Kilat Antar Bendera', place: 'Padang Hijau', icon: 'cmd/deliver', bg: 'bg-hb-padang', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 3, cols: 8, map: [',,,,,,,,', '........', ',.,.,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [2, 5], art: 'animal/rabbit/sit', label: 'Kelinci Penonton', react: 'animal/rabbit/run' }, { at: [0, 2], art: 'kereta-prop/pine' }],
      objects: [
        { id: 'bendera', type: 'parcel', at: [2, 1], kind: 'bendera', name: 'Bendera pesta', art: 'game/flag-red' },
        { id: 'panggung', type: 'stop', at: [0, 6], accepts: 'bendera', art: 'obj/hb-panggung', name: 'Panggung pesta', pay: 'horn' }
      ],
      beats: [{ title: 'Bendera untuk panggung', story: 'Kilat membawa bendera pesta ke panggung.',
        bo: 'Antar bendera ke panggung pesta.', objectives: [{ 'do': 'deliver', id: 'panggung' }], slots: 14, budget: 10, forms: ['kilat'], palette: MOVE.concat(['pick', 'deliver']) }] }),

    // 03 GIGIH: his firebox is nearly empty; he loads coal into it and goes on
    L({ id: 'hb03', ch: 'hb-ch1', cards: [
        { bg: 'bg-hb-padang', art: [{ k: G, x: 36, s: 58 }], text: 'Tungku Si Gigih hampir kosong. Ia butuh batu bara.' },
        { bg: 'bg-hb-padang', art: [{ k: G, x: 36, s: 58 }], text: 'Sedikit demi sedikit, Gigih mengisi tungku dan jalan lagi.' }
      ], terrain: 'meadow', mood: 'sun', n: 3, title: 'Gigih Isi Tungku', place: 'Padang Hijau', icon: 'cmd/load', bg: 'bg-hb-padang', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 3, cols: 8, map: [',,,,,,,,', '........', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 3], h: 'E', form: 'gigih' },
      res: { sand: 0 }, cap: { sand: 2 },
      decor: [{ at: [0, 5], art: 'animal/cardinal/fly', label: 'Burung Kardinal' }, { at: [2, 6], art: 'animal/deer/graze' }],
      objects: [
        { id: 'tumpukan', type: 'pile', at: [0, 1], res: 'sand', n: 1, art: 'obj/hb-batu', name: 'Batu bara' },
        { id: 'tungku', type: 'hole', at: [1, 6], need: 2, res: 'sand', art: 'obj/hb-bak', name: 'Bak batu bara' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Isi tungku Gigih', story: 'Batu bara masuk ke tungku. Uap naik lagi!',
        bo: 'Isi bak batu bara, lalu ke bendera.', objectives: [{ 'do': 'fill', id: 'tungku' }, { 'do': 'reach', at: [1, 7] }], slots: 16, budget: 12, forms: ['gigih'], palette: ['east', 'west', 'up', 'load', 'dump'] }] }),

    // 04 KILAT: waits for the starting flag at the red signal, impatient
    L({ id: 'hb04', ch: 'hb-ch1', cards: [
        { bg: 'bg-hb-start', art: [{ k: K, x: 36, s: 58 }], text: 'Kilat Perak tidak sabar. Ia mau berangkat sebelum aba-aba!' },
        { bg: 'bg-hb-start', art: [{ k: 'animal/rabbit/run', x: 14, s: 40 }, { k: K, x: 52, s: 58 }], text: 'Kelinci Wasit mengibarkan bendera. Tunggu dulu, Kilat!' }
      ], terrain: 'meadow', mood: 'sun', n: 4, title: 'Kilat Tidak Sabar', place: 'Sinyal Merah', icon: 'cmd/wait', bg: 'bg-hb-start', edu: { domain: 'algoritma', skill: 'menunggu giliran' },
      grid: { rows: 3, cols: 8, map: [',T,,.,,,', '........', ',,,,.,T,'], theme: 'town' },
      sign: { at: [2, 0], text: 'TUNGGU', w: 2 },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [2, 2], art: 'animal/deer/stand', label: 'Pak Rusa (juri)' }],
      objects: [
        { id: 'wasit', type: 'patrol', at: [0, 4], name: 'Kelinci Wasit', art: 'animal/rabbit/run', path: [[0, 4], [1, 4], [2, 4], [2, 4], [1, 4], [0, 4]], phase: 1 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Tunggu aba-aba', story: 'Kilat harus sabar. Tunggu kelinci lewat.',
        bo: 'Tunggu kelinci lewat, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['kilat'], palette: ['east', 'wait'] }] }),

    // 05 GIGIH: Kilat is sulking at the red signal (he lost his turn); Gigih brings him two stars of courage
    L({ id: 'hb05', ch: 'hb-ch1', cards: [
        { bg: 'bg-hb-padang', art: [{ k: K, x: 36, s: 58 }], text: 'Kilat Perak berhenti di sinyal merah. Ia cemberut dan mau pulang.' },
        { bg: 'bg-hb-padang', art: [{ k: G, x: 36, s: 58 }], text: 'Gigih tahu cara menolong: dua bintang semangat.' }
      ], terrain: 'meadow', mood: 'sun', n: 5, title: 'Semangat untuk Kilat', place: 'Sinyal Merah', icon: 'cmd/pick', bg: 'bg-hb-padang', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 3, cols: 8, map: [',,,,,,,,', '........', ',.,.,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'gigih' },
      decor: [{ at: [2, 5], art: 'animal/rabbit/sit', label: 'Kelinci Penonton', react: 'animal/rabbit/run' }, { at: [0, 2], art: 'kereta-prop/pine' }],
      objects: [
        { id: 'b1', type: 'parcel', at: [2, 1], kind: 'semangat', name: 'Bintang semangat', art: 'obj/semangat' },
        { id: 'b2', type: 'parcel', at: [2, 3], kind: 'semangat', name: 'Bintang semangat', art: 'obj/semangat' },
        { id: 'kilat', type: 'stop', at: [0, 6], accepts: 'semangat', need: 2, art: 'train/kilat-b', art2: 'train/kilat', name: 'Kilat Perak', pay: 'wave' }
      ],
      beats: [{ title: 'Semangati Kilat', story: 'Kilat cemberut. Gigih membawa bintang semangat.',
        bo: 'Turunkan dua bintang di Kilat Perak.', objectives: [{ 'do': 'deliver', id: 'kilat' }], slots: 20, budget: 16, forms: ['gigih'], palette: MOVE.concat(['pick', 'deliver']) }] }),

    // ── Bab 2 "Jalan Bersama" ─────────────────────────────────────────────────────────────────────
    // 06 GIGIH: the hill is steep; he hitches two wagons of festival goods and climbs, chuff by chuff
    L({ id: 'hb06', ch: 'hb-ch2', cards: [
        { bg: 'bg-hb-kota', art: [{ k: G, x: 10, s: 58 }, { k: K, x: 54, s: 58 }], text: 'Kilat sudah di puncak bukit. Si Gigih mendaki dengan dua gerbong.' },
        { bg: 'bg-hb-kota', art: [{ k: G, x: 36, s: 58 }], text: 'Uff, uff! Pelan-pelan, Gigih pasti sampai.' }
      ], terrain: 'meadow', mood: 'sunset', n: 6, title: 'Gigih Mendaki Bukit', place: 'Kaki Bukit', icon: 'cmd/couple', bg: 'bg-hb-kota', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,.', '........', ',.,.,,,,', ',,,,,,,,'], theme: 'hill' },
      sign: { at: [3, 1], text: 'TANJAKAN', w: 2 },
      mojo: { at: [1, 0], h: 'E', form: 'gigih' },
      decor: [{ at: [3, 5], art: 'train/kilat' }],
      objects: [
        { id: 'g1', type: 'wagon', at: [2, 1], art: 'train/hb-gerbong', name: 'Gerbong pertama' },
        { id: 'g2', type: 'wagon', at: [2, 3], art: 'train/hb-gerbong', name: 'Gerbong kedua' },
        { id: 'flag', type: 'flag', at: [0, 7] }
      ],
      beats: [{ title: 'Naik tanjakan', story: 'Gigih menarik dua gerbong naik bukit.',
        bo: 'Gandeng dua gerbong, lalu ke bendera.', objectives: [{ 'do': 'wagons', n: 2 }, { 'do': 'reach', at: [0, 7] }], slots: 14, budget: 10, forms: ['gigih'], palette: ['up', 'east', 'down', 'couple'] }] }),

    // 07 KILAT: one-train bridge; Kilat zooms ahead, then sees Gigih coming and learns to wait
    L({ id: 'hb07', ch: 'hb-ch2', cards: [
        { bg: 'bg-hb-padang', art: [{ k: K, x: 10, s: 58 }, { k: G, x: 54, s: 58 }], text: 'Jembatan kecil hanya muat satu kereta. Si Gigih sudah di tengah.' },
        { bg: 'bg-hb-padang', art: [{ k: K, x: 36, s: 58 }], text: 'Kilat mau menyerobot, tapi ia ingat: sabar itu baik.' }
      ], terrain: 'meadow', mood: 'sun', n: 7, title: 'Kilat Menunggu Gigih', place: 'Jembatan Kecil', icon: 'cmd/wait', bg: 'bg-hb-padang', edu: { domain: 'algoritma', skill: 'bergiliran' },
      grid: { rows: 4, cols: 8, map: [',,,.,,,,', '...=....', ',,,.,,,,', ',T,,,,,,'], theme: 'town' },
      sign: { at: [2, 5], text: 'SATU KERETA', w: 3 },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [3, 5], art: 'animal/deer/graze' }],
      objects: [
        { id: 'gigih', type: 'patrol', at: [0, 3], name: 'Si Gigih', art: 'train/gigih', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Giliran di jembatan', story: 'Jembatan hanya cukup untuk satu kereta. Sabar!',
        bo: 'Tunggu Si Gigih lewat, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['kilat'], palette: ['east', 'wait'] }] }),

    // 08 GIGIH: Kilat's signal box is stuck; Gigih opens it and keeps going
    L({ id: 'hb08', ch: 'hb-ch2', cards: [
        { bg: 'bg-hb-padang', art: [{ k: K, x: 36, s: 58 }], text: 'Kotak sinyal macet. Kilat bingung dan berhenti.' },
        { bg: 'bg-hb-padang', art: [{ k: G, x: 36, s: 58 }], text: 'Klik! Gigih membuka sinyal. Kilat berseru terima kasih.' }
      ], terrain: 'meadow', mood: 'sun', n: 8, title: 'Gigih Buka Sinyal', place: 'Kotak Sinyal', icon: 'cmd/east', bg: 'bg-hb-padang', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', ',,T,,,,,', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'gigih' },
      decor: [{ at: [3, 1], art: 'animal/deer/stand', label: 'Pak Rusa (juri)' }, { at: [2, 5], art: 'train/kilat-b', react: 'train/kilat' }, { at: [0, 6], art: 'animal/bird-blue/fly' }],
      objects: [
        { id: 'sinyal', type: 'mark', at: [1, 4], order: 1, seq: 'sinyal', art: 'obj/hb-sinyal', name: 'Sinyal' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Buka sinyalnya', story: 'Gigih membuka sinyal supaya semua bisa jalan.',
        bo: 'Buka sinyal, lalu ke bendera.', objectives: [{ 'do': 'visit', id: 'sinyal' }, { 'do': 'reach', at: [1, 7] }], slots: 11, budget: 7, forms: ['gigih'], palette: ['east'] }] }),

    // 09 BIG GIGIH: the tunnel. Gigih goes in, waits for Kilat to whoosh by on the other line, then comes home
    L({ id: 'hb09', ch: 'hb-ch2', cards: [
        { bg: 'bg-hb-start', art: [{ k: G, x: 8, s: 58 }, { k: K, x: 56, s: 58 }], text: 'Dua kereta menuju terowongan dari arah berlawanan.' },
        { bg: 'bg-hb-padang', art: [{ k: G, x: 36, s: 58 }], text: 'Gigih tidak takut gelap. Ia menunggu, lalu maju terus!' }
      ], big: true, quiet: true, terrain: 'mountain', mood: 'sunset', n: 9, title: 'Gigih di Terowongan', place: 'Petualangan Besar', icon: 'cmd/wait', bg: 'bg-hb-start',
      bgs: ['bg-hb-start', 'bg-hb-padang'], edu: { domain: 'campuran', skill: 'bergiliran' },
      celebrate: [],
      grid: { rows: 4, cols: 8, map: [',,,,.,,,', '........', ',,,,.,,,', ',,T,,,,,'], theme: 'hill' },
      mojo: { at: [1, 0], h: 'E', form: 'gigih' },
      objects: [
        { id: 'kilat', type: 'patrol', at: [0, 4], name: 'Kilat Perak', art: 'train/kilat', path: [[0, 4], [1, 4], [2, 4], [2, 4], [1, 4], [0, 4]], phase: 1 },
        { id: 'f1', type: 'flag', at: [1, 7] },
        { id: 'f2', type: 'flag', at: [1, 0] }
      ],
      beats: [
        { title: 'Masuk terowongan', story: 'Kilat datang dari arah lain. Gigih menunggu.', hide: ['f2'],
          decor: [{ at: [0, 7], art: 'kereta-tile/tunnel-portal' }, { at: [3, 5], art: 'animal/rabbit/sit' }],
          bo: 'Tunggu Kilat Perak, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['gigih'], palette: ['east', 'wait'] },
        { title: 'Berpapasan sambil melambai', story: 'Mereka berpapasan sambil melambai. Gigih pulang.', hide: ['f1'], start: { at: [1, 6], h: 'W' },
          decor: [{ at: [0, 7], art: 'kereta-tile/tunnel-portal' }, { at: [3, 5], art: 'animal/rabbit/sit' }],
          bo: 'Tunggu Kilat Perak, lalu ke bendera.', objectives: [{ 'do': 'reach', at: [1, 0] }], slots: 10, budget: 7, forms: ['gigih'], palette: ['west', 'wait'] }
      ] }),

    // 10 KILAT: gives way on the side track so slow Gigih can cross (the proud one learns)
    L({ id: 'hb10', ch: 'hb-ch2', cards: [
        { bg: 'bg-hb-padang', art: [{ k: G, x: 10, s: 58 }, { k: K, x: 54, s: 58 }], text: 'Si Gigih jalan pelan di depan. Kilat tidak bisa menyalip.' },
        { bg: 'bg-hb-padang', art: [{ k: K, x: 36, s: 58 }], text: 'Memberi jalan bukan kalah. Kilat minggir dengan senyum.' }
      ], terrain: 'meadow', mood: 'sun', n: 10, title: 'Kilat Memberi Jalan', place: 'Jalur Samping', icon: 'cmd/down', bg: 'bg-hb-padang', edu: { domain: 'algoritma', skill: 'memberi jalan' },
      grid: { rows: 4, cols: 8, map: [',,,,,.,,', '........', ',,,.,.,,', ',,,.,,,,'], theme: 'town' },
      sign: { at: [3, 4], text: 'MINGGIR', w: 2 },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [3, 6], art: 'kereta-prop/pine' }],
      objects: [
        { id: 'samping', type: 'mark', at: [3, 3], order: 1, seq: 'samping', art: 'obj/hb-sinyal', name: 'Jalur samping' },
        { id: 'gigih', type: 'patrol', at: [0, 5], name: 'Si Gigih', art: 'train/gigih', path: [[0, 5], [1, 5], [2, 5], [2, 5], [1, 5], [0, 5]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Minggir dulu', story: 'Gigih jalan pelan. Kilat memberi jalan.',
        bo: 'Ke jalur samping, lalu ke bendera.', objectives: [{ 'do': 'visit', id: 'samping' }, { 'do': 'reach', at: [1, 7] }], slots: 16, budget: 12, forms: ['kilat'], palette: ['east', 'west', 'down', 'up', 'wait'] }] }),

    // ── Bab 3 "Pesta di Kota" ─────────────────────────────────────────────────────────────────────
    // 11 GIGIH: the long road before town; fire up again, but Kilat crosses the line, so wait and coal up
    L({ id: 'hb11', ch: 'hb-ch3', cards: [
        { bg: 'bg-hb-padang', art: [{ k: G, x: 36, s: 58 }], text: 'Kota sudah dekat, tapi tungku Gigih hampir padam lagi.' },
        { bg: 'bg-hb-padang', art: [{ k: G, x: 10, s: 58 }, { k: K, x: 54, s: 58 }], text: 'Kilat melintas cepat. Gigih mengisi tungku dan tetap jalan.' }
      ], terrain: 'meadow', mood: 'sunset', n: 11, title: 'Gigih Isi Tungku Lagi', place: 'Padang Hijau', icon: 'cmd/load', bg: 'bg-hb-padang', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 4, cols: 8, map: [',,,.,,,,', '........', ',,,.,,,,', ',,,,,,,,'], theme: 'town' },
      mojo: { at: [1, 0], h: 'E', form: 'gigih' },
      res: { sand: 0 }, cap: { sand: 2 },
      decor: [{ at: [3, 6], art: 'animal/deer/graze' }, { at: [0, 2], art: 'animal/cardinal/fly', label: 'Burung Kardinal' }],
      objects: [
        { id: 'tumpukan', type: 'pile', at: [0, 5], res: 'sand', n: 1, art: 'obj/hb-batu', name: 'Batu bara' },
        { id: 'tungku', type: 'hole', at: [1, 6], need: 2, res: 'sand', art: 'obj/hb-bak', name: 'Bak batu bara' },
        { id: 'kilat', type: 'patrol', at: [0, 3], name: 'Kilat Perak', art: 'train/kilat', path: [[0, 3], [1, 3], [2, 3], [2, 3], [1, 3], [0, 3]], phase: 2 },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Isi tungku, tunggu Kilat', story: 'Isi tungku Gigih, tunggu Kilat lewat, jalan terus.',
        bo: 'Isi bak batu bara, lalu ke bendera.', objectives: [{ 'do': 'fill', id: 'tungku' }, { 'do': 'reach', at: [1, 7] }], slots: 15, budget: 12, forms: ['gigih'], palette: ['east', 'west', 'up', 'load', 'dump', 'wait'] }] }),

    // 12 KILAT: opens the signal for Gigih (the apology), then goes on
    L({ id: 'hb12', ch: 'hb-ch3', cards: [
        { bg: 'bg-hb-kota', art: [{ k: K, x: 10, s: 58 }, { k: G, x: 54, s: 58 }], text: 'Sinyal ke kota masih merah. Si Gigih tertahan di belakang.' },
        { bg: 'bg-hb-kota', art: [{ k: K, x: 36, s: 58 }], text: 'Kilat sadar ia sering pamer. Kali ini ia membukakan jalan.' }
      ], terrain: 'town', mood: 'sunset', n: 12, title: 'Kilat Membuka Jalan', place: 'Gerbang Kota', icon: 'cmd/east', bg: 'bg-hb-kota', edu: { domain: 'algoritma', skill: 'urutan' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', ',,,,T,,,', ',,,,,,,,'], theme: 'town' },
      bunting: { at: [0, 2], n: 5 },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [2, 1], art: 'train/gigih' }, { at: [3, 5], art: 'animal/deer/stand', label: 'Pak Rusa (juri)' }],
      objects: [
        { id: 'sinyal', type: 'mark', at: [1, 5], order: 1, seq: 'sinyal', art: 'obj/hb-sinyal', name: 'Sinyal kota' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Buka sinyal kota', story: 'Kilat membuka sinyal untuk Gigih.',
        bo: 'Buka sinyal kota, lalu ke bendera.', objectives: [{ 'do': 'visit', id: 'sinyal' }, { 'do': 'reach', at: [1, 7] }], slots: 11, budget: 7, forms: ['kilat'], palette: ['east'] }] }),

    // 13 GIGIH: Kilat broke down near the finish; Gigih hitches him and brings him over the line (nobody is left behind)
    L({ id: 'hb13', ch: 'hb-ch3', cards: [
        { bg: 'bg-hb-kota', art: [{ k: K, x: 10, s: 58 }, { k: G, x: 54, s: 58 }], text: 'Kilat Perak mogok dekat garis akhir. Tidak ada yang tertinggal!' },
        { bg: 'bg-hb-kota', art: [{ k: 'animal/cardinal/fly', x: 14, s: 40 }, { k: K, x: 52, s: 58 }], text: 'Kilat berbisik: terima kasih, Gigih. Maaf aku pamer tadi.' }
      ], cine: { end: { fx: [{ id: 'bk-star-02', at: [1, 7], size: 180, n: 2, spread: 40 }, { id: 'bk-light-02', at: [1, 7], size: 260, delay: 250 }] } }, terrain: 'town', mood: 'sunset', n: 13, title: 'Gigih Menolong Kilat', place: 'Garis Akhir', icon: 'cmd/couple', bg: 'bg-hb-kota', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 4, cols: 8, map: [',,,,,,,,', '........', ',.,,,,,,', ',,,,,,,,'], theme: 'town' },
      bunting: { at: [0, 3], n: 5 },
      crowd: { at: [0, 0], n: 4 },
      sign: { at: [2, 5], text: 'GARIS AKHIR', w: 3 },
      mojo: { at: [1, 0], h: 'E', form: 'gigih' },
      decor: [{ at: [3, 5], art: 'animal/deer/graze' }, { at: [0, 6], art: 'kereta-prop/pine' }],
      objects: [
        { id: 'kilat', type: 'wagon', at: [2, 1], art: 'train/kilat-b', name: 'Kilat Perak' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [{ title: 'Jangan tinggalkan teman', story: 'Gigih menggandeng Kilat. Mereka tiba bersama.',
        bo: 'Gandeng Kilat Perak, lalu ke garis akhir bendera.', objectives: [{ 'do': 'wagons', n: 1 }, { 'do': 'reach', at: [1, 7] }], slots: 11, budget: 8, forms: ['gigih'], palette: ['east', 'down', 'up', 'couple'] }] }),

    // 14 KILAT: fast Kilat is first into town and brings the star to the star stage
    L({ id: 'hb14', ch: 'hb-ch3', cards: [
        { bg: 'bg-hb-kota', art: [{ k: K, x: 36, s: 58 }], text: 'Kilat masuk kota lebih dulu. Kali ini ia mau berguna.' },
        { bg: 'bg-hb-kota', art: [{ k: K, x: 10, s: 58 }, { k: 'animal/bird-blue/fly', x: 56, s: 40 }], text: 'Panggung bintang masih kosong. Antar bintangnya, Kilat!' }
      ], terrain: 'town', mood: 'sunset', n: 14, title: 'Kilat Antar Bintang', place: 'Panggung Bintang', icon: 'cmd/deliver', bg: 'bg-hb-kota', edu: { domain: 'matematika', skill: 'membilang 1-2' },
      grid: { rows: 3, cols: 8, map: [',,,,,,,,', '........', ',.,.,,,,'], theme: 'town' },
      bunting: { at: [0, 0], n: 8 },
      mojo: { at: [1, 0], h: 'E', form: 'kilat' },
      decor: [{ at: [2, 5], art: 'animal/deer/graze' }],
      objects: [
        { id: 'bintang', type: 'parcel', at: [2, 3], kind: 'bintang', name: 'Bintang', art: 'obj/semangat' },
        { id: 'piala', type: 'stop', at: [0, 6], accepts: 'bintang', art: 'game/trophy-cup', name: 'Panggung bintang', pay: 'horn' }
      ],
      beats: [{ title: 'Bintang untuk panggung', story: 'Kilat membawa bintang ke panggung bintang.',
        bo: 'Antar bintang ke panggung bintang.', objectives: [{ 'do': 'deliver', id: 'piala' }], slots: 14, budget: 10, forms: ['kilat'], palette: MOVE.concat(['pick', 'deliver']) }] }),

    // 15 BIG GIGIH: the party in town. Flag and star go to their stages, then the two friends cross the line together
    L({ id: 'hb15', ch: 'hb-ch3', cards: [
        { bg: 'bg-hb-kota', art: [{ k: G, x: 36, s: 58 }], text: 'Pesta Besar dimulai di kota! Si Gigih tiba dengan uap mengepul.' },
        { bg: 'bg-hb-kota', art: [{ k: G, x: 10, s: 58 }, { k: K, x: 54, s: 58 }], text: 'Dua sahabat tidak pernah menyerah. Mereka tiba bersama.' }
      ], big: true, cine: { end: { letterbox: 2400, fx: [{ id: 'bk-star-02', at: [1, 7], size: 220, n: 3, spread: 50 }, { id: 'bk-light-02', at: [1, 7], size: 320, delay: 300 }] } }, terrain: 'town', mood: 'sunset', n: 15, title: 'Pesta di Kota', place: 'Petualangan Besar', icon: 'cmd/deliver', bg: 'bg-hb-kota',
      bgs: ['bg-hb-kota', 'bg-hb-kota', 'bg-hb-kota'], edu: { domain: 'campuran', skill: 'urutan perjalanan' },
      celebrate: [],
      grid: { rows: 4, cols: 8, map: [',,,.,.,,', '........', ',,.,,,.,', ',,,,,,,,'], theme: 'town' },
      bunting: { at: [0, 0], n: 8 },
      crowd: { at: [3, 0], n: 8 },
      mojo: { at: [1, 0], h: 'E', form: 'gigih' },
      decor: [{ at: [3, 4], art: 'animal/deer/graze', label: 'Pak Rusa (juri)' }, { at: [3, 1], art: 'animal/bird-blue/fly' }, { at: [3, 6], art: 'train/kilat' }],
      objects: [
        { id: 'bendera', type: 'parcel', at: [0, 3], kind: 'bendera', name: 'Bendera pesta', art: 'game/flag-red' },
        { id: 'bintang', type: 'parcel', at: [0, 5], kind: 'bintang', name: 'Bintang', art: 'obj/semangat' },
        { id: 'panggung', type: 'stop', at: [2, 6], accepts: 'bendera', art: 'obj/hb-panggung', name: 'Panggung pesta', pay: 'horn' },
        { id: 'piala', type: 'stop', at: [2, 2], accepts: 'bintang', art: 'game/trophy-cup', name: 'Panggung bintang', pay: 'horn' },
        { id: 'flag', type: 'flag', at: [1, 7] }
      ],
      beats: [
        { title: 'Bendera untuk panggung', story: 'Ada pesta besar di kota. Pasang bendera dulu.', hide: ['bintang', 'piala', 'flag'],
          bo: 'Antar bendera ke panggung pesta.', objectives: [{ 'do': 'deliver', id: 'panggung' }], slots: 11, budget: 8, forms: ['gigih'], palette: MOVE.concat(['pick', 'deliver']) },
        { title: 'Bintang untuk panggung', story: 'Sekarang bintang semangat untuk panggung bintang.', hide: ['bendera', 'panggung', 'flag'], start: { at: [1, 4], h: 'E' },
          bo: 'Antar bintang ke panggung bintang.', objectives: [{ 'do': 'deliver', id: 'piala' }], slots: 9, budget: 6, forms: ['gigih'], palette: MOVE.concat(['pick', 'deliver']) },
        { title: 'Garis akhir bersama', story: 'Pesta dimulai. Dua sahabat tidak pernah menyerah!', hide: ['bendera', 'bintang', 'panggung', 'piala'], start: { at: [1, 3], h: 'E' },
          bo: 'Bawa Si Gigih ke bendera di garis akhir.', objectives: [{ 'do': 'reach', at: [1, 7] }], slots: 7, budget: 4, forms: ['gigih'], palette: ['east'] }
      ] })

  ]
  var NARR = { name: 'Gigih', full: 'Si Gigih', art: { wave: 'train-char/defeatist/face-chip', think: 'train-char/defeatist/face-chip', celebrate: 'train-char/defeatist/face-chip', tools: 'train-char/defeatist/face-chip' } }
  var STORY = { id: 'hellbent', hero: 'gigih', heroName: 'Si Gigih', narrator: NARR, saveKey: 'dunia-g15k-kereta-hellbent2', logo: ['Lomba', 'ke Kota'], docTitle: 'Lomba ke Kota', collection: 'Teman-Teman Lomba',
    heroes: { gigih: { name: 'Si Gigih', sprite: 'defeatist', color: '#6B5B4B' }, kilat: { name: 'Kilat Perak', sprite: 'silver', color: '#8FA3B8' } },
    pins: { 'hb-ch1': [20, 55], 'hb-ch2': [50, 38], 'hb-ch3': [80, 52] },
    cast: [
      { id: 'gigih', name: 'Si Gigih', ability: 'Lokomotif uap tua yang pelan tapi tidak pernah menyerah.', key: 'train-char/defeatist/34l-neutral' },
      { id: 'kilat', name: 'Kilat Perak', ability: 'Kereta perak yang sangat cepat dan suka pamer, tapi hatinya baik.', key: 'train-char/silver/34l-happy' },
      { id: 'wasit', name: 'Kelinci Wasit', ability: 'Mengibarkan bendera tanda mulai. Jangan berangkat sebelum ia lewat!', key: 'animal/rabbit/run' },
      { id: 'rusa', name: 'Pak Rusa', ability: 'Juri lomba. Ia menilai siapa yang paling baik hati.', key: 'animal/deer/stand' },
      { id: 'pengumum', name: 'Burung Pengumum', ability: 'Mengumumkan kabar lomba dari atas kereta.', key: 'animal/bird-blue/fly' },
      { id: 'kardinal', name: 'Burung Kardinal', ability: 'Penonton setia yang bernyanyi di sepanjang jalur.', key: 'animal/cardinal/fly' }
    ] }
  W.KeretaPackLevels = { HERO: 'gigih', STORY: STORY, CHAPTERS: CHAPTERS, REGIONS: REGIONS, LEVELS: LEVELS, LIB: LIB }
})(typeof window !== 'undefined' ? window : globalThis)
