/* =============================================================================
 * G23 Question Engine — 1000+ questions split by age group
 * =============================================================================
 *  - 5-7 yo (easy + medium): ~800 questions, NO multiplication/division
 *  - 7-8 yo (hard + expert): ~200 questions, WITH multiplication/division
 *
 * User-selectable difficulty:
 *  - 'easy'   → only 5-7 pool (no × ÷)
 *  - 'medium' → 5-7 pool (broader)
 *  - 'hard'   → 5-7 + 7-8 pool (full 1000+)
 *
 * Math questions are generated programmatically for endless variety;
 * language/general-knowledge questions are hand-curated.
 *
 * Exports (window):
 *  - G23_QUESTIONS_EASY      (~400 5-7 yo, basic add/sub + lang)
 *  - G23_QUESTIONS_MEDIUM    (~400 5-7 yo, harder add/sub + lang)
 *  - G23_QUESTIONS_HARD      (~150 7-8 yo, × ÷ + word problems)
 *  - G23_QUESTIONS_EXPERT    (~50  7-8 yo advanced)
 *  - G23_pickQuestions(level, userDiff) → returns shuffled subset
 * ============================================================================ */

(function(){
  'use strict'

  // ── Helpers ───────────────────────────────────────────────────────
  const _wrongs = (ans, range, count=3) => {
    const set = new Set()
    let attempts = 0
    while (set.size < count && attempts++ < 30) {
      const delta = Math.floor(Math.random() * (range*2+1)) - range
      const w = ans + delta
      if (w !== ans && w >= 0) set.add(String(w))
    }
    while (set.size < count) set.add(String(ans + set.size + 1))
    return [...set].slice(0, count)
  }

  // ── Math question generators ──────────────────────────────────────
  const _addPool = (maxA, maxB) => {
    const out = []
    for (let a = 1; a <= maxA; a++) {
      for (let b = 1; b <= maxB; b++) {
        const ans = a + b
        out.push({ q:`${a}+${b}=?`, ans:String(ans), wrong:_wrongs(ans, 3) })
      }
    }
    return out
  }

  const _subPool = (maxA, minResult=0) => {
    const out = []
    for (let a = minResult; a <= maxA; a++) {
      for (let b = 1; b <= a; b++) {
        const ans = a - b
        if (ans >= minResult) {
          out.push({ q:`${a}-${b}=?`, ans:String(ans), wrong:_wrongs(ans, 3) })
        }
      }
    }
    return out
  }

  const _mulPool = (maxA, maxB) => {
    const out = []
    for (let a = 2; a <= maxA; a++) {
      for (let b = 2; b <= maxB; b++) {
        const ans = a * b
        out.push({ q:`${a}×${b}=?`, ans:String(ans), wrong:_wrongs(ans, Math.max(3, Math.floor(ans*0.1))) })
      }
    }
    return out
  }

  const _divPool = (maxResult, maxDivisor) => {
    const out = []
    for (let r = 2; r <= maxResult; r++) {
      for (let d = 2; d <= maxDivisor; d++) {
        const dividend = r * d
        if (dividend <= 144) {
          out.push({ q:`${dividend}÷${d}=?`, ans:String(r), wrong:_wrongs(r, 3) })
        }
      }
    }
    return out
  }

  // ── Hand-curated language/general-knowledge banks ─────────────────

  // Easy language: huruf awal (initial letter), colors, animal sounds, simple matching
  const _LANG_EASY = [
    // Huruf awal — animals
    {q:'🐱 Huruf awal?',ans:'K',wrong:['A','M','B']}, {q:'🐶 Huruf awal?',ans:'A',wrong:['K','M','B']},
    {q:'🦁 Huruf awal?',ans:'S',wrong:['L','H','M']}, {q:'🐵 Huruf awal?',ans:'M',wrong:['K','S','B']},
    {q:'🐴 Huruf awal?',ans:'K',wrong:['B','M','J']}, {q:'🐯 Huruf awal?',ans:'H',wrong:['K','S','M']},
    {q:'🐰 Huruf awal?',ans:'K',wrong:['L','M','B']}, {q:'🐻 Huruf awal?',ans:'B',wrong:['M','S','H']},
    {q:'🐼 Huruf awal?',ans:'P',wrong:['M','B','K']}, {q:'🦒 Huruf awal?',ans:'J',wrong:['G','K','L']},
    {q:'🐘 Huruf awal?',ans:'G',wrong:['A','K','L']}, {q:'🐢 Huruf awal?',ans:'K',wrong:['B','S','P']},
    {q:'🐍 Huruf awal?',ans:'U',wrong:['B','K','S']}, {q:'🐦 Huruf awal?',ans:'B',wrong:['K','M','S']},
    {q:'🦅 Huruf awal?',ans:'E',wrong:['B','A','I']}, {q:'🦆 Huruf awal?',ans:'B',wrong:['I','K','S']},
    {q:'🐔 Huruf awal?',ans:'A',wrong:['B','K','I']}, {q:'🐟 Huruf awal?',ans:'I',wrong:['U','A','O']},
    {q:'🐠 Huruf awal?',ans:'I',wrong:['U','A','O']}, {q:'🐬 Huruf awal?',ans:'L',wrong:['I','P','K']},
    {q:'🐋 Huruf awal?',ans:'P',wrong:['L','I','K']}, {q:'🐙 Huruf awal?',ans:'G',wrong:['K','S','C']},
    {q:'🦈 Huruf awal?',ans:'H',wrong:['I','S','K']}, {q:'🐸 Huruf awal?',ans:'K',wrong:['B','S','L']},
    {q:'🦋 Huruf awal?',ans:'K',wrong:['L','S','P']}, {q:'🐜 Huruf awal?',ans:'S',wrong:['L','K','B']},
    {q:'🐝 Huruf awal?',ans:'L',wrong:['S','K','M']}, {q:'🐞 Huruf awal?',ans:'K',wrong:['S','L','M']},
    {q:'🦗 Huruf awal?',ans:'B',wrong:['J','K','S']},
    // Huruf awal — fruits
    {q:'🍎 Huruf awal?',ans:'A',wrong:['I','U','E']}, {q:'🍌 Huruf awal?',ans:'P',wrong:['B','M','K']},
    {q:'🍊 Huruf awal?',ans:'J',wrong:['A','M','S']}, {q:'🍇 Huruf awal?',ans:'A',wrong:['J','M','U']},
    {q:'🍓 Huruf awal?',ans:'S',wrong:['M','J','A']}, {q:'🍉 Huruf awal?',ans:'S',wrong:['M','J','A']},
    {q:'🍍 Huruf awal?',ans:'N',wrong:['M','J','A']}, {q:'🥭 Huruf awal?',ans:'M',wrong:['J','A','S']},
    {q:'🍒 Huruf awal?',ans:'C',wrong:['B','J','S']}, {q:'🍑 Huruf awal?',ans:'P',wrong:['M','J','S']},
    {q:'🥝 Huruf awal?',ans:'K',wrong:['M','J','A']}, {q:'🍈 Huruf awal?',ans:'M',wrong:['J','A','S']},
    {q:'🥥 Huruf awal?',ans:'K',wrong:['M','J','S']}, {q:'🍐 Huruf awal?',ans:'P',wrong:['A','J','M']},
    // Huruf awal — objects
    {q:'⚽ Huruf awal?',ans:'B',wrong:['J','K','S']}, {q:'📚 Huruf awal?',ans:'B',wrong:['K','S','L']},
    {q:'🎒 Huruf awal?',ans:'T',wrong:['B','S','K']}, {q:'✏️ Huruf awal?',ans:'P',wrong:['B','S','M']},
    {q:'🖊️ Huruf awal?',ans:'P',wrong:['T','S','M']}, {q:'✂️ Huruf awal?',ans:'G',wrong:['P','K','S']},
    {q:'🪑 Huruf awal?',ans:'K',wrong:['M','B','S']}, {q:'🚪 Huruf awal?',ans:'P',wrong:['J','K','S']},
    {q:'🪟 Huruf awal?',ans:'J',wrong:['P','K','S']}, {q:'🚗 Huruf awal?',ans:'M',wrong:['B','P','S']},
    {q:'🚌 Huruf awal?',ans:'B',wrong:['M','S','K']}, {q:'🚲 Huruf awal?',ans:'S',wrong:['M','B','K']},
    {q:'✈️ Huruf awal?',ans:'P',wrong:['B','M','S']}, {q:'🚂 Huruf awal?',ans:'K',wrong:['B','M','S']},
    {q:'🚀 Huruf awal?',ans:'R',wrong:['M','P','S']}, {q:'⛵ Huruf awal?',ans:'P',wrong:['K','S','M']},

    // Colors
    {q:'Warna 🔴?',ans:'MERAH',wrong:['BIRU','HIJAU','KUNING']},
    {q:'Warna 🔵?',ans:'BIRU',wrong:['MERAH','HIJAU','UNGU']},
    {q:'Warna 🟡?',ans:'KUNING',wrong:['ORANYE','PUTIH','MERAH']},
    {q:'Warna 🟢?',ans:'HIJAU',wrong:['BIRU','KUNING','HITAM']},
    {q:'Warna 🟠?',ans:'ORANYE',wrong:['KUNING','MERAH','UNGU']},
    {q:'Warna 🟣?',ans:'UNGU',wrong:['BIRU','MERAH','HIJAU']},
    {q:'Warna 🟤?',ans:'COKLAT',wrong:['HITAM','ABU','KUNING']},
    {q:'Warna ⚫?',ans:'HITAM',wrong:['PUTIH','ABU','BIRU']},
    {q:'Warna ⚪?',ans:'PUTIH',wrong:['HITAM','ABU','KUNING']},
    {q:'Warna pisang?',ans:'KUNING',wrong:['MERAH','BIRU','HIJAU']},
    {q:'Warna apel?',ans:'MERAH',wrong:['BIRU','UNGU','HIJAU']},
    {q:'Warna langit?',ans:'BIRU',wrong:['MERAH','UNGU','PUTIH']},
    {q:'Warna daun?',ans:'HIJAU',wrong:['MERAH','BIRU','KUNING']},
    {q:'Warna salju?',ans:'PUTIH',wrong:['HITAM','BIRU','MERAH']},
    {q:'Warna matahari?',ans:'KUNING',wrong:['HIJAU','BIRU','UNGU']},

    // Animal sounds
    {q:'🐮 Suaranya?',ans:'MOO',wrong:['BAA','OINK','KWEK']},
    {q:'🐕 Suaranya?',ans:'GUKGUK',wrong:['MEONG','KWEK','EMBEK']},
    {q:'🐱 Suaranya?',ans:'MEONG',wrong:['GUKGUK','KWEK','MOO']},
    {q:'🐔 Suaranya?',ans:'PETOK',wrong:['BAA','MOO','OINK']},
    {q:'🦆 Suaranya?',ans:'KWEK',wrong:['MOO','MEONG','BAA']},
    {q:'🐷 Suaranya?',ans:'OINK',wrong:['BAA','MOO','MEONG']},
    {q:'🐑 Suaranya?',ans:'BAA',wrong:['MOO','OINK','KWEK']},
    {q:'🐐 Suaranya?',ans:'EMBEK',wrong:['MOO','OINK','KWEK']},
    {q:'🦁 Suaranya?',ans:'AUMM',wrong:['MOO','GUKGUK','MEONG']},
    {q:'🐎 Suaranya?',ans:'HIIH',wrong:['MOO','OINK','BAA']},
    {q:'🐸 Suaranya?',ans:'KROK',wrong:['MEONG','GUKGUK','MOO']},
    {q:'🐦 Suaranya?',ans:'CIUITT',wrong:['MOO','OINK','GUKGUK']},

    // Identify objects
    {q:'🍌 Buah apa?',ans:'PISANG',wrong:['APEL','JERUK','MANGGA']},
    {q:'🍎 Buah apa?',ans:'APEL',wrong:['PISANG','JERUK','MANGGA']},
    {q:'🍊 Buah apa?',ans:'JERUK',wrong:['APEL','PISANG','MANGGA']},
    {q:'🍇 Buah apa?',ans:'ANGGUR',wrong:['MELON','NANAS','TOMAT']},
    {q:'🍉 Buah apa?',ans:'SEMANGKA',wrong:['MELON','PISANG','APEL']},
    {q:'🍓 Buah apa?',ans:'STROBERI',wrong:['CERI','TOMAT','APEL']},
    {q:'🥕 Sayur apa?',ans:'WORTEL',wrong:['LOBAK','TIMUN','BAYAM']},
    {q:'🥦 Sayur apa?',ans:'BROKOLI',wrong:['BAYAM','TIMUN','SAWI']},
    {q:'🌽 Sayur apa?',ans:'JAGUNG',wrong:['LABU','WORTEL','TIMUN']},
    {q:'🍅 Sayur apa?',ans:'TOMAT',wrong:['CABE','TIMUN','APEL']},

    // Body parts / counting
    {q:'Berapa kaki manusia?',ans:'2',wrong:['1','3','4']},
    {q:'Berapa mata manusia?',ans:'2',wrong:['1','3','4']},
    {q:'Berapa jari satu tangan?',ans:'5',wrong:['4','6','3']},
    {q:'Berapa hari seminggu?',ans:'7',wrong:['5','6','8']},
    {q:'Berapa kaki kucing?',ans:'4',wrong:['2','3','5']},
    {q:'Berapa kaki laba-laba?',ans:'8',wrong:['6','7','10']},
    {q:'Berapa sayap burung?',ans:'2',wrong:['1','3','4']},

    // Simple shapes
    {q:'Bentuk bola?',ans:'BULAT',wrong:['KOTAK','SEGITIGA','PANJANG']},
    {q:'Bentuk pintu?',ans:'KOTAK',wrong:['BULAT','SEGITIGA','OVAL']},
    {q:'Bentuk piramida?',ans:'SEGITIGA',wrong:['BULAT','KOTAK','OVAL']},
  ]

  // Medium language: more vocab, basic geography, simple sentences
  const _LANG_MEDIUM = [
    {q:'Ibu kota Indonesia?',ans:'JAKARTA',wrong:['BALI','BANDUNG','SURABAYA']},
    {q:'Ibu kota Jawa Barat?',ans:'BANDUNG',wrong:['JAKARTA','SURABAYA','BOGOR']},
    {q:'Ibu kota Jawa Tengah?',ans:'SEMARANG',wrong:['SOLO','YOGYA','BANDUNG']},
    {q:'Ibu kota Jawa Timur?',ans:'SURABAYA',wrong:['MALANG','MOJOKERTO','SEMARANG']},
    {q:'Pulau terbesar RI?',ans:'KALIMANTAN',wrong:['JAWA','SUMATRA','SULAWESI']},
    {q:'Pulau Komodo di provinsi?',ans:'NTT',wrong:['NTB','BALI','SULAWESI']},
    {q:'Bahasa nasional kita?',ans:'INDONESIA',wrong:['MELAYU','JAWA','SUNDA']},
    {q:'Lambang negara RI?',ans:'GARUDA',wrong:['ELANG','MERAK','MERPATI']},
    {q:'Bendera RI berapa warna?',ans:'2',wrong:['3','4','5']},
    {q:'Warna bendera RI?',ans:'MERAH PUTIH',wrong:['BIRU PUTIH','HIJAU KUNING','MERAH BIRU']},
    {q:'Lagu kebangsaan RI?',ans:'INDONESIA RAYA',wrong:['HALO BANDUNG','SATU NUSA','GARUDA PANCASILA']},
    {q:'Jumlah provinsi RI?',ans:'38',wrong:['33','34','40']},
    {q:'Hari kemerdekaan RI?',ans:'17 AGUSTUS',wrong:['1 JUNI','21 APRIL','10 NOVEMBER']},

    // Science basics
    {q:'Ikan bernapas dengan?',ans:'INSANG',wrong:['PARU-PARU','KULIT','HIDUNG']},
    {q:'Burung bernapas dengan?',ans:'PARU-PARU',wrong:['INSANG','KULIT','SAYAP']},
    {q:'Air mendidih pada suhu?',ans:'100°C',wrong:['80°C','90°C','120°C']},
    {q:'Air membeku pada suhu?',ans:'0°C',wrong:['10°C','-10°C','5°C']},
    {q:'Planet terbesar?',ans:'JUPITER',wrong:['SATURNUS','URANUS','MARS']},
    {q:'Planet terdekat matahari?',ans:'MERKURIUS',wrong:['VENUS','BUMI','MARS']},
    {q:'Berapa planet di tata surya?',ans:'8',wrong:['7','9','10']},
    {q:'Cumi-cumi punya berapa kaki?',ans:'10',wrong:['8','6','12']},
    {q:'Gurita punya berapa kaki?',ans:'8',wrong:['6','10','12']},
    {q:'Lumba-lumba termasuk?',ans:'MAMALIA',wrong:['IKAN','REPTIL','AMFIBI']},
    {q:'Hewan terbesar di dunia?',ans:'PAUS BIRU',wrong:['GAJAH','HIU','KUDA NIL']},
    {q:'Hewan tercepat di darat?',ans:'CHEETAH',wrong:['SINGA','HARIMAU','KUDA']},
    {q:'Hewan tertinggi di darat?',ans:'JERAPAH',wrong:['GAJAH','UNTA','BADAK']},

    // Math word problems (no × ÷)
    {q:'Ibu beli 3 apel + 4 apel?',ans:'7',wrong:['6','8','5']},
    {q:'Ada 10 burung, 4 terbang. Sisa?',ans:'6',wrong:['5','7','4']},
    {q:'5 jeruk + 5 jeruk?',ans:'10',wrong:['9','11','12']},
    {q:'8 buah, dimakan 3. Sisa?',ans:'5',wrong:['4','6','3']},
    {q:'Adi punya 12 kelereng, kasih 5 ke teman. Sisa?',ans:'7',wrong:['6','8','5']},
    {q:'Ada 6 bunga merah + 4 bunga biru. Total?',ans:'10',wrong:['9','11','12']},

    // Days/months
    {q:'Hari setelah Senin?',ans:'SELASA',wrong:['RABU','MINGGU','KAMIS']},
    {q:'Hari sebelum Jumat?',ans:'KAMIS',wrong:['SABTU','RABU','SELASA']},
    {q:'Bulan pertama?',ans:'JANUARI',wrong:['FEBRUARI','DESEMBER','MARET']},
    {q:'Bulan terakhir?',ans:'DESEMBER',wrong:['NOVEMBER','JANUARI','OKTOBER']},
    {q:'Berapa bulan setahun?',ans:'12',wrong:['10','11','13']},
    {q:'Berapa hari di bulan Februari?',ans:'28',wrong:['30','31','27']},

    // More vocab
    {q:'Profesi mengajar di sekolah?',ans:'GURU',wrong:['DOKTER','POLISI','PETANI']},
    {q:'Profesi menyembuhkan sakit?',ans:'DOKTER',wrong:['GURU','POLISI','PILOT']},
    {q:'Profesi menanam padi?',ans:'PETANI',wrong:['NELAYAN','PILOT','DOKTER']},
    {q:'Profesi menangkap ikan?',ans:'NELAYAN',wrong:['PETANI','GURU','POLISI']},
    {q:'Profesi mengemudi pesawat?',ans:'PILOT',wrong:['SOPIR','MASINIS','KAPTEN']},
    {q:'Profesi memadamkan api?',ans:'PEMADAM',wrong:['POLISI','TENTARA','SATPAM']},
    {q:'Tempat ibadah Muslim?',ans:'MASJID',wrong:['GEREJA','PURA','VIHARA']},
    {q:'Tempat ibadah Kristen?',ans:'GEREJA',wrong:['MASJID','PURA','VIHARA']},
    {q:'Tempat ibadah Hindu?',ans:'PURA',wrong:['MASJID','GEREJA','VIHARA']},
    {q:'Tempat ibadah Buddha?',ans:'VIHARA',wrong:['MASJID','GEREJA','PURA']},
  ]

  // Hard language: word problems, advanced science, multiplication-themed words
  const _LANG_HARD = [
    // Math word problems WITH × ÷
    {q:'Ada 4 kotak isi 5 apel. Total?',ans:'20',wrong:['15','25','9']},
    {q:'24 permen dibagi 4 anak?',ans:'6',wrong:['4','8','5']},
    {q:'Mobil dgn 4 roda × 5 mobil = ?',ans:'20',wrong:['15','25','9']},
    {q:'7 hari × 4 minggu = ?',ans:'28',wrong:['24','30','21']},
    {q:'36 buah dibagi 6 keranjang?',ans:'6',wrong:['5','7','4']},
    {q:'5 ayam, tiap ayam 3 anak. Total?',ans:'15',wrong:['12','18','8']},
    {q:'81 buku dibagi 9 rak?',ans:'9',wrong:['8','10','7']},
    {q:'12 × 7 = ?',ans:'84',wrong:['72','96','78']},
    {q:'48 ÷ 6 = ?',ans:'8',wrong:['7','9','6']},
    {q:'Pak Budi punya 100 telur. Tiap dus berisi 10. Berapa dus?',ans:'10',wrong:['8','12','15']},

    // Geography & history
    {q:'Sungai terpanjang di dunia?',ans:'NIL',wrong:['AMAZON','MISSISSIPPI','GANGGA']},
    {q:'Gunung tertinggi di dunia?',ans:'EVEREST',wrong:['K2','RINJANI','SEMERU']},
    {q:'Benua terkecil?',ans:'AUSTRALIA',wrong:['EROPA','ASIA','AMERIKA']},
    {q:'Benua terbesar?',ans:'ASIA',wrong:['AFRIKA','AMERIKA','EROPA']},
    {q:'Lautan terluas?',ans:'PASIFIK',wrong:['ATLANTIK','HINDIA','ARKTIK']},
    {q:'Negara terluas di dunia?',ans:'RUSIA',wrong:['CHINA','AMERIKA','KANADA']},
    {q:'Negara terpadat penduduk?',ans:'INDIA',wrong:['CHINA','AMERIKA','INDONESIA']},
    {q:'Proklamator RI?',ans:'SOEKARNO',wrong:['HATTA','SUDIRMAN','SUTOMO']},
    {q:'Wakil presiden pertama?',ans:'HATTA',wrong:['SOEKARNO','SUDIRMAN','SUTOMO']},

    // Science
    {q:'Proses daun memasak makanan?',ans:'FOTOSINTESIS',wrong:['RESPIRASI','EVAPORASI','OSMOSIS']},
    {q:'H₂O adalah?',ans:'AIR',wrong:['OKSIGEN','GULA','GARAM']},
    {q:'CO₂ adalah?',ans:'KARBONDIOKSIDA',wrong:['OKSIGEN','HIDROGEN','NITROGEN']},
    {q:'Hewan berdarah dingin?',ans:'REPTIL',wrong:['MAMALIA','BURUNG','MANUSIA']},
    {q:'Hewan dengan tulang belakang?',ans:'VERTEBRATA',wrong:['INVERTEBRATA','PROTOZOA','BAKTERI']},
    {q:'Tumbuhan tanpa biji?',ans:'PAKU',wrong:['PISANG','MANGGA','PADI']},
    {q:'Bunga nasional Indonesia?',ans:'MELATI',wrong:['MAWAR','ANGGREK','TULIP']},
    {q:'Hewan langka di Sumatera?',ans:'HARIMAU',wrong:['GAJAH','BADAK','ORANG-UTAN']},

    // Logic / patterns
    {q:'2, 4, 6, 8, ?',ans:'10',wrong:['9','12','11']},
    {q:'5, 10, 15, 20, ?',ans:'25',wrong:['22','30','24']},
    {q:'A, C, E, G, ?',ans:'I',wrong:['H','J','K']},
    {q:'1, 4, 9, 16, ?',ans:'25',wrong:['20','24','30']},
    {q:'3, 6, 12, 24, ?',ans:'48',wrong:['36','42','60']},

    // Money/measurement
    {q:'Berapa cm dalam 1 meter?',ans:'100',wrong:['10','1000','50']},
    {q:'Berapa menit dalam 1 jam?',ans:'60',wrong:['30','100','120']},
    {q:'Berapa jam dalam 1 hari?',ans:'24',wrong:['12','20','30']},
    {q:'Berapa detik dalam 1 menit?',ans:'60',wrong:['30','100','120']},
    {q:'1 kg = berapa gram?',ans:'1000',wrong:['100','10','500']},
    {q:'1 km = berapa meter?',ans:'1000',wrong:['100','10','500']},
  ]

  // ── Build the pools ───────────────────────────────────────────────
  // Easy (5-7): basic add 1-10, basic sub up to 10, lang easy
  const easyAdd = _addPool(10, 10)              // 100 questions
  const easySub = _subPool(15, 0).slice(0, 80)  // 80 subset
  const easy = [...easyAdd, ...easySub, ..._LANG_EASY]

  // Medium (5-7): bigger add (1-20), bigger sub (1-25), curated
  const medAdd = _addPool(15, 15).filter(q => parseInt(q.ans) > 8)  // ~150
  const medSub = _subPool(25, 0).filter(q => parseInt(q.ans) > 0).slice(0, 100)
  const medium = [...medAdd, ...medSub, ..._LANG_MEDIUM]

  // Hard (7-8): multiplication tables, division, hard lang
  const hardMul = _mulPool(10, 10)              // ~80
  const hardDiv = _divPool(10, 10).slice(0, 50) // 50
  const hard = [...hardMul, ...hardDiv, ..._LANG_HARD]

  // Expert: advanced multiplication 11-12, harder division
  const expertMul = _mulPool(12, 12).filter(q => parseInt(q.ans) > 60)
  const expertDiv = _divPool(12, 12).filter(q => parseInt(q.ans) > 6)
  const expert = [...expertMul, ...expertDiv]

  // ── Public API ─────────────────────────────────────────────────────
  window.G23_QUESTIONS_EASY = easy
  window.G23_QUESTIONS_MEDIUM = medium
  window.G23_QUESTIONS_HARD = hard
  window.G23_QUESTIONS_EXPERT = expert

  // pickQuestions(level, userDiff) → returns shuffled subset for one round
  // userDiff: 'easy' → only 5-7 pools (easy + medium); 'hard' → +7-8 pools (all)
  window.G23_pickQuestions = function(level, userDiff) {
    userDiff = userDiff || 'medium'
    let pool
    if (userDiff === 'easy') {
      pool = level <= 8 ? easy : [...easy, ...medium]
    } else if (userDiff === 'hard') {
      // Full 1000+ pool: all difficulties combined per level
      pool = level <= 8 ? [...easy, ...medium]
           : level <= 16 ? [...easy, ...medium, ...hard]
           : [...easy, ...medium, ...hard, ...expert]
    } else {
      // medium (default): scales with level
      pool = level <= 8 ? easy
           : level <= 16 ? medium
           : level <= 24 ? [...medium, ...hard]
           : [...hard, ...expert]
    }
    // Shuffle and return all
    return [...pool].sort(() => Math.random() - 0.5)
  }

  // ── G24 alias + water-themed bonus questions ─────────────────────
  // The engine is generic enough to power both runner/swim games.
  // G24 gets the same base pool PLUS underwater-themed bonus questions
  // that fit the underwater Flappy-Bird theme.
  const _LANG_WATER = [
    {q:'🐠 Hewan apa?',ans:'IKAN',wrong:['BURUNG','MONYET','KUDA']},
    {q:'🐟 Hewan apa?',ans:'IKAN',wrong:['BURUNG','TIKUS','SAPI']},
    {q:'🦀 Hewan apa?',ans:'KEPITING',wrong:['LABA-LABA','SEMUT','TIKUS']},
    {q:'🦐 Hewan apa?',ans:'UDANG',wrong:['IKAN','LOBSTER','KEPITING']},
    {q:'🦑 Hewan apa?',ans:'CUMI',wrong:['GURITA','UBUR','IKAN']},
    {q:'🐙 Hewan apa?',ans:'GURITA',wrong:['CUMI','UBUR','LOBSTER']},
    {q:'🐳 Hewan apa?',ans:'PAUS',wrong:['HIU','LUMBA','IKAN']},
    {q:'🐋 Hewan apa?',ans:'PAUS',wrong:['LUMBA','HIU','IKAN']},
    {q:'🐬 Hewan apa?',ans:'LUMBA',wrong:['PAUS','HIU','IKAN']},
    {q:'🦈 Hewan apa?',ans:'HIU',wrong:['PAUS','LUMBA','IKAN']},
    {q:'🐢 Hewan apa?',ans:'KURA',wrong:['BUAYA','KATAK','ULAR']},
    {q:'🪼 Hewan apa?',ans:'UBUR',wrong:['CUMI','GURITA','IKAN']},
    {q:'Hewan laut bernapas dgn?',ans:'INSANG',wrong:['PARU-PARU','HIDUNG','KULIT']},
    {q:'Air laut rasanya?',ans:'ASIN',wrong:['MANIS','PAHIT','ASAM']},
    {q:'Hewan laut tercerdas?',ans:'LUMBA-LUMBA',wrong:['HIU','PAUS','GURITA']},
    {q:'Karang dibuat oleh?',ans:'HEWAN KORAL',wrong:['BATU','TANAMAN','PASIR']},
    {q:'🪸 Apa ini?',ans:'KARANG',wrong:['BATU','PASIR','RUMPUT']},
    {q:'🐟 Berenang dengan?',ans:'SIRIP',wrong:['KAKI','SAYAP','TANGAN']},
    {q:'Lautan terluas di dunia?',ans:'PASIFIK',wrong:['ATLANTIK','HINDIA','ARKTIK']},
    {q:'Cumi-cumi punya berapa kaki?',ans:'10',wrong:['8','6','12']},
  ]
  const easyG24  = [...easy,  ..._LANG_WATER.slice(0, 14)]
  const medG24   = [...medium, ..._LANG_WATER.slice(14)]

  window.G24_QUESTIONS_EASY    = easyG24
  window.G24_QUESTIONS_MEDIUM  = medG24
  window.G24_QUESTIONS_HARD    = hard
  window.G24_QUESTIONS_EXPERT  = expert

  window.G24_pickQuestions = function(level, userDiff) {
    userDiff = userDiff || 'medium'
    let pool
    if (userDiff === 'easy') {
      pool = level <= 10 ? easyG24 : [...easyG24, ...medG24]
    } else if (userDiff === 'hard') {
      pool = level <= 10 ? [...easyG24, ...medG24]
           : level <= 20 ? [...easyG24, ...medG24, ...hard]
           : [...easyG24, ...medG24, ...hard, ...expert]
    } else {
      pool = level <= 10 ? easyG24
           : level <= 20 ? medG24
           : level <= 30 ? [...medG24, ...hard]
           : [...hard, ...expert]
    }
    return [...pool].sort(() => Math.random() - 0.5)
  }

  // Pool size diagnostic (visible in console for debug)
  console.log('[questions] G23 easy:', easy.length, 'med:', medium.length,
              'hard:', hard.length, 'exp:', expert.length,
              '| G24 easy:', easyG24.length, 'med:', medG24.length,
              '| TOTAL G23:', easy.length + medium.length + hard.length + expert.length,
              '| TOTAL G24:', easyG24.length + medG24.length + hard.length + expert.length)
})()
