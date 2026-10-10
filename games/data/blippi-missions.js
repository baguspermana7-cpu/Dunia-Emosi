/* G32 Blippi -- CONTENT. Stable ids, Indonesian lines, reward keys.
 * Runtime (games/blippi*.js) reads this and never hardcodes a mission line.
 * PRD v3 refs: 10.1 vehicles, 10.2 capability tags, 11.2-11.3 catalogue, 13.2-13.3 rewards, 16.2 hint ladder.
 */
(function (w) {
  'use strict'

  var VEHICLES = [
    { id: 'buggy', name: 'BUGGY', art: 'veh-buggy', thumb: 'thumb-buggy', tags: ['drive_land', 'observe'],
      say: 'Ayo jelajah!', demo: { id: 'honk', label: 'COBA KLAKSON' },
      modules: [
        { id: 'ban-jalan', name: 'BAN JALAN', art: 'modul-ban-jalan', info: 'Ban halus. Melaju mulus di jalan yang keras.' },
        { id: 'ban-berpola', name: 'BAN BERPOLA', art: 'modul-ban-berpola', info: 'Ban bergerigi. Tidak mudah tergelincir di lumpur.' }
      ] },
    { id: 'truk-air', name: 'TRUK AIR', art: 'veh-truk-air', thumb: 'thumb-truk-air', tags: ['pump_water', 'spray'],
      say: 'Ayo alirkan air!', demo: { id: 'spray', label: 'COBA SEMPROT' },
      modules: [
        { id: 'pompa', name: 'POMPA', art: 'modul-pompa', info: 'Pompa mendorong air dari tangki lewat selang.' },
        { id: 'semprot', name: 'SEMPROT', art: 'modul-semprot', info: 'Nozzle semprot. Air keluar jauh dan terarah.' }
      ] },
    { id: 'excavator', name: 'EXCAVATOR', art: 'veh-excavator', thumb: 'thumb-excavator', tags: ['dig'],
      say: 'Ayo gali pasirnya!', demo: { id: 'dig', label: 'COBA GALI' },
      modules: [
        { id: 'bucket-sempit', name: 'BUCKET SEMPIT', art: 'modul-bucket-sempit', info: 'Bucket sempit. Cocok untuk parit kecil.' },
        { id: 'bucket-lebar', name: 'BUCKET LEBAR', art: 'modul-bucket-lebar', info: 'Bucket lebar. Sekali gali dapat banyak pasir.' }
      ] }
  ]

  var WORLDS = [
    { id: 'kota-roda', name: 'KOTA RODA', mission: 'W01-M01', art: 'pulau-kota-roda', box: [15, 70, 640, 250], label: [275, 293, 235, 50], thumb: 'thumb-jalan-pertamaku' },
    { id: 'taman-air', name: 'TAMAN AIR', mission: 'W02-M01', art: 'pulau-taman-air', artDone: 'pulau-taman-air-aktif', box: [625, 150, 480, 215], label: [750, 322, 208, 48], thumb: 'thumb-taman-air' },
    { id: 'eco-park', name: 'ECO PARK', locked: 'Terbuka setelah Taman Air.', art: 'pulau-eco-park', box: [1090, 95, 560, 300], label: [1248, 320, 215, 50] },
    { id: 'kebun-ceria', name: 'KEBUN CERIA', locked: 'Terbuka setelah Eco Park.', art: 'pulau-kebun-ceria', box: [155, 355, 560, 330], label: [307, 598, 220, 50] },
    { id: 'pelabuhan', name: 'PELABUHAN PENJELAJAH', locked: 'Terbuka setelah Kebun Ceria.', art: 'pulau-pelabuhan', box: [665, 385, 480, 300], label: [800, 606, 248, 66] },
    { id: 'wonder-lab', name: 'WONDER LAB', locked: 'Terbuka setelah pulau lain selesai.', art: 'pulau-wonder-lab', box: [1130, 395, 510, 310], label: [1303, 634, 218, 50] }
  ]

  var MISSIONS = {
    'W01-M01': {
      id: 'W01-M01', world: 'kota-roda', title: 'Jalan Pertamaku', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['drive_land'], vehicle: 'buggy', bg: 'bg-misi-jalan',
      reward: { key: 'reward:W01-M01', sticker: 'stiker-buggy', stickerName: 'Stiker Buggy' },
      worldDelta: 'kota-roda:jalur-taman',
      steps: [
        { id: 'pasang', label: 'PASANG', tool: 'papan', toolName: 'PAPAN', toolArt: 'tool-papan', icon: 'plank',
          instr: 'Pilih satu jalur, lalu pasang tiga papan.',
          wrong: 'Belum waktunya. Sekarang kita pasang papan dulu.' },
        { id: 'jalan', label: 'JALAN', tool: 'jalan', toolName: 'JALAN', toolArt: 'tool-jalan', icon: 'wheel',
          instr: 'Tahan tombol JALAN agar buggy melaju.',
          wrong: 'Pasang papan dulu, baru buggy bisa jalan.' },
        { id: 'antar', label: 'ANTAR', tool: 'paket', toolName: 'PAKET', toolArt: 'tool-paket', icon: 'box',
          instr: 'Ketuk paket untuk mengantar ke bendera.',
          wrong: 'Antar paketnya setelah sampai di bendera.' }
      ],
      lines: {
        start: 'Ada sungai di depan. Ayo buat jalan!',
        pickRoute: 'Bagus! Sekarang pasang papannya satu per satu.',
        board: 'Satu papan terpasang!',
        built: 'Jembatan jadi! Tahan JALAN untuk menyeberang.',
        arrive: 'Sampai! Ketuk paketnya untuk mengantar.',
        retryNear: 'Tidak apa-apa. Coba ketuk tempat papan yang bergaris.',
        wrongTool: 'Belum waktunya. Pakai alat yang menyala oranye ya.',
        win: 'Hore! Jalur taman pertama sudah jadi!'
      },
      hints: ['Papan yang bergaris menunggu kamu.', 'Ketuk tempat papan yang bergaris, satu per satu.', 'Lihat tanganku. Ketuk di sini!']
    },
    'W02-M01': {
      id: 'W02-M01', world: 'taman-air', title: 'Kincir yang Menunggu', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['pump_water'], vehicle: 'truk-air', bg: 'bg-misi-kincir',
      reward: { key: 'reward:W02-M01', sticker: 'stiker-kincir', stickerName: 'Stiker Kincir', vehicle: 'truk-air' },
      worldDelta: 'taman-air:kincir-aktif',
      steps: [
        { id: 'sambung', label: 'SAMBUNG', tool: 'selang', toolName: 'SELANG', toolArt: 'tool-selang', icon: 'hose',
          instr: 'Sambungkan selang ke kincir.',
          wrong: 'Sambungkan selang dulu. Katup dan pompa dipakai nanti.' },
        { id: 'buka', label: 'BUKA', tool: 'katup', toolName: 'KATUP', toolArt: 'tool-katup', icon: 'valve',
          instr: 'Pilih katup, lalu putar untuk membuka.',
          wrong: 'Pilih katup untuk membuka jalan air. Pompa nanti ya.' },
        { id: 'pompa', label: 'POMPA', tool: 'pompa', toolName: 'POMPA', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Pilih pompa, lalu tahan untuk memompa.',
          wrong: 'Pompa dipakai setelah katup terbuka.' }
      ],
      lines: {
        start: 'Kincirnya menunggu air. Ayo sambungkan selang!',
        connected: 'Tersambung! Sekarang buka katupnya.',
        retry: 'Hampir! Coba lagi, dekatkan ke lubang pipa.',
        opened: 'Katup terbuka! Sekarang pompa airnya.',
        pumping: 'Terus pompa...',
        pickValve: 'Pilih katup dulu di bawah.',
        pickPump: 'Pilih pompa dulu di bawah.',
        win: 'Hore! Kincirnya berputar!'
      },
      hints: ['Ujung selang bercahaya. Seret ke lubang pipa.', 'Ikuti panah: dari ujung selang ke lubang pipa.', 'Lihat tanganku. Seret seperti ini!']
    }
  }

  var STICKERS = [
    { id: 'W01-M01', name: 'Stiker Buggy', art: 'stiker-buggy' },
    { id: 'W02-M01', name: 'Stiker Kincir', art: 'stiker-kincir' }
  ]

  var HUB_LINES = {
    hub: 'Mau menjelajah?',
    map: 'Pilih pulau, lalu ketuk JELAJAHI.',
    park: 'Pilih kendaraanmu!'
  }

  w.BlippiData = {
    version: 1,
    vehicles: VEHICLES,
    worlds: WORLDS,
    missions: MISSIONS,
    stickers: STICKERS,
    hubLines: HUB_LINES,
    firstMission: 'W01-M01',
    order: ['W01-M01', 'W02-M01'],
    stickerTotal: 30
  }
})(window)
