
window.onerror = function(msg, url, line, col, err) {
  console.error('GLOBAL ERROR:', msg, 'at line', line, err)
  return false
}
// ================================================================
// DIFFICULTY CONFIG
// ================================================================
const DIFF = {
  easy:   { rounds: 6,  timer: 20, choices: 3, breatheCycles: 2 },
  medium: { rounds: 10, timer: 15, choices: 4, breatheCycles: 3 },
  hard:   { rounds: 15, timer: 10, choices: 6, breatheCycles: 4 }
}

// ================================================================
// DATA
// ================================================================
const EMOTIONS = [
  { emoji:'😊',name:'Senang',   color:'#F59E0B',animal:'🦁',tip:'💡 Tunjukkan kesenanganmu dengan senyuman! Ceritakan ke teman.',   scenario:'Kamu dapat hadiah ulang tahun yang kamu impikan!',  bodyCue:'Pipi terasa hangat, ingin melompat-lompat',  safeAction:'Tersenyum dan ceritakan ke teman' },
  { emoji:'😢',name:'Sedih',    color:'#60A5FA',animal:'🐰',tip:'💡 Tidak apa-apa bersedih. Ceritakan ke Ayah atau Ibu.',           scenario:'Mainan kesayanganmu rusak dan tidak bisa diperbaiki.',bodyCue:'Mata terasa perih, tenggorokan sesak',       safeAction:'Ceritakan ke Ayah atau Ibu, tidak apa-apa menangis' },
  { emoji:'😠',name:'Marah',    color:'#F87171',animal:'🐯',tip:'💡 Kalau marah, tarik napas 3x. Hitung 1-2-3 pelan-pelan.',       scenario:'Temanmu mengambil mainanmu tanpa izin.',            bodyCue:'Wajah terasa panas, tangan mengepal',        safeAction:'Tarik napas 3x, lalu bilang: aku tidak suka itu' },
  { emoji:'😨',name:'Takut',    color:'#A78BFA',animal:'🐘',tip:'💡 Kalau takut, pegang tangan orang yang kamu sayang.',           scenario:'Kamu sendirian di ruangan gelap.',                  bodyCue:'Jantung berdebar, badan merinding',          safeAction:'Pegang tangan orang yang kamu sayang, nyalakan lampu' },
  { emoji:'😲',name:'Terkejut', color:'#34D399',animal:'🦊',tip:'💡 Terkejut itu normal! Tarik napas, lalu tenangkan diri.',       scenario:'Teman-temanmu berteriak "Selamat Ulang Tahun!" tiba-tiba.', bodyCue:'Napas tertahan sejenak, mata melebar', safeAction:'Tarik napas, tersenyum, bilang terima kasih' },
  { emoji:'😳',name:'Malu',     color:'#F472B6',animal:'🐸',tip:'💡 Semua orang pernah malu. Itu artinya kamu peduli!',            scenario:'Kamu menjawab salah di depan kelas, teman-teman melihat.',  bodyCue:'Pipi memerah, ingin bersembunyi',     safeAction:'Tarik napas dalam, ingat: semua orang pernah salah' },
  { emoji:'🥰',name:'Bahagia',  color:'#FCD34D',animal:'🐼',tip:'💡 Bagikan kebahagiaanmu! Peluk orang yang kamu sayang.',         scenario:'Kamu bermain bersama sahabat terbaik sepanjang hari.',      bodyCue:'Badan terasa ringan, ingin bernyanyi',safeAction:'Peluk orang yang kamu sayang, ceritakan kebahagiaan' },
  { emoji:'😑',name:'Bosan',    color:'#94A3B8',animal:'🐨',tip:'💡 Kalau bosan, coba aktivitas baru. Ajak teman bermain!',        scenario:'Tidak ada yang bisa dilakukan di rumah, semua terasa membosankan.',bodyCue:'Badan lesu, sulit fokus',          safeAction:'Coba aktivitas baru: gambar, main lego, atau ajak teman' },
  { emoji:'😤',name:'Kesal',    color:'#FB923C',animal:'🐺',tip:'💡 Kalau kesal, ceritakan perasaanmu dengan kata-kata.',          scenario:'Adikmu menghancurkan bangunan balok yang kamu buat lama.',  bodyCue:'Rahang mengeras, ingin berteriak',   safeAction:'Ceritakan perasaanmu dengan kata-kata, jangan memukul' },
  { emoji:'🤩',name:'Kagum',    color:'#22D3EE',animal:'🦄',tip:'💡 Rasa kagum itu indah! Eksplorasi hal baru setiap hari.',       scenario:'Kamu melihat pelangi besar setelah hujan deras.',           bodyCue:'Mata berbinar, mulut terbuka kagum',  safeAction:'Tunjukkan ke orang lain, tanya kenapa bisa terjadi' }
]

const ANIMAL_LETTERS = [
  {animal:'🐓',word:'AYAM',      letter:'A',num:1, hint:'Unggas yang berkokok saat matahari terbit setiap pagi'},
  {animal:'🦆',word:'BEBEK',     letter:'B',num:2, hint:'Unggas gempal yang pandai berenang dan berbunyi kwek-kwek'},
  {animal:'🦎',word:'CICAK',     letter:'C',num:3, hint:'Reptil kecil yang merayap di dinding dan memangsa nyamuk'},
  {animal:'🐑',word:'DOMBA',     letter:'D',num:4, hint:'Hewan berkaki empat berbulu sangat tebal penghasil wol'},
  {animal:'🦅',word:'ELANG',     letter:'E',num:5, hint:'Burung besar bercakar tajam yang terbang paling tinggi di langit'},
  {animal:'🦩',word:'FLAMINGO',  letter:'F',num:6, hint:'Burung cantik berwarna merah muda yang sering berdiri dengan satu kaki'},
  {animal:'🐘',word:'GAJAH',     letter:'G',num:7, hint:'Hewan darat terbesar di dunia, punya belalai panjang dan telinga sangat lebar'},
  {animal:'🐯',word:'HARIMAU',   letter:'H',num:8, hint:'Kucing besar bergaris-garis hitam yang jago berburu di hutan'},
  {animal:'🐟',word:'IKAN',      letter:'I',num:9, hint:'Makhluk bersisik yang hidup di air dan bernapas lewat insang'},
  {animal:'🦒',word:'JERAPAH',   letter:'J',num:10,hint:'Hewan berbintik-bintik coklat dengan leher terpanjang di seluruh dunia'},
  {animal:'🐴',word:'KUDA',      letter:'K',num:11,hint:'Hewan berkaki empat yang bisa berlari sangat kencang dan sering ditunggangi manusia'},
  {animal:'🐬',word:'LUMBA',     letter:'L',num:12,hint:'Mamalia laut yang sangat cerdas dan suka melompat tinggi di lautan'},
  {animal:'🐒',word:'MONYET',    letter:'M',num:13,hint:'Hewan pandai berlengan panjang yang jago melompat dan memanjat pohon'},
  {animal:'🦜',word:'NURI',      letter:'N',num:14,hint:'Burung berwarna-warni cerah yang bisa menirukan suara percakapan manusia'},
  {animal:'🦧',word:'ORANG UTAN',letter:'O',num:15,hint:'Kera besar berbulu merah-coklat yang hidup di hutan tropis Kalimantan'},
  {animal:'🐼',word:'PANDA',     letter:'P',num:16,hint:'Hewan berbulu hitam-putih yang sangat gemar memakan batang bambu'},
  {animal:'🦌',word:'RUSA',      letter:'R',num:17,hint:'Hewan berkaki empat yang jantannya memiliki tanduk bercabang-cabang indah'},
  {animal:'🦁',word:'SINGA',     letter:'S',num:18,hint:'Hewan besar berbulu lebat di sekitar kepala yang dijuluki Raja Hutan'},
  {animal:'🐭',word:'TIKUS',     letter:'T',num:19,hint:'Hewan pengerat kecil berekor panjang yang sangat cepat dan gemar mencuri makanan'},
  {animal:'🐛',word:'ULAT',      letter:'U',num:20,hint:'Hewan berbadan lunak dan bersegmen yang kelak berubah menjadi kupu-kupu indah'}
]

const MATCH_PAIRS = [
  {id:'senang',   emoji:'😊',label:'Senang'},
  {id:'sedih',    emoji:'😢',label:'Sedih'},
  {id:'marah',    emoji:'😠',label:'Marah'},
  {id:'takut',    emoji:'😨',label:'Takut'},
  {id:'terkejut', emoji:'😲',label:'Terkejut'},
  {id:'malu',     emoji:'😳',label:'Malu'},
  {id:'bosan',    emoji:'😑',label:'Bosan'},
  {id:'bahagia',  emoji:'🥰',label:'Bahagia'},
  {id:'kesal',    emoji:'😤',label:'Kesal'},
  {id:'kagum',    emoji:'🤩',label:'Kagum'}
]

// Educational match pairs: number-object and letter-word
const MATCH_PAIRS_NUMS = [
  {id:'n1',emoji:'1️⃣',label:'SATU',  emoji2:'🌟',        label2:'1 Bintang', eduTip:'Satu = 1'},
  {id:'n2',emoji:'2️⃣',label:'DUA',   emoji2:'🐘🐘',      label2:'2 Gajah',   eduTip:'Dua = 2'},
  {id:'n3',emoji:'3️⃣',label:'TIGA',  emoji2:'🍎🍎🍎',    label2:'3 Apel',    eduTip:'Tiga = 3'},
  {id:'n4',emoji:'4️⃣',label:'EMPAT', emoji2:'🐸🐸🐸🐸',  label2:'4 Katak',   eduTip:'Empat = 4'},
  {id:'n5',emoji:'5️⃣',label:'LIMA',  emoji2:'🌷🌷🌷🌷🌷',label2:'5 Bunga',   eduTip:'Lima = 5'},
  {id:'n6',emoji:'6️⃣',label:'ENAM',  emoji2:'🐝🐝🐝🐝🐝🐝',label2:'6 Lebah', eduTip:'Enam = 6'},
]
const MATCH_PAIRS_ALPHA = [
  {id:'la',emoji:'A',label:'Huruf A', emoji2:'🐊',label2:'Ayam',   eduTip:'A seperti AYAM'},
  {id:'lb',emoji:'B',label:'Huruf B', emoji2:'🦆',label2:'Bebek',  eduTip:'B seperti BEBEK'},
  {id:'lc',emoji:'C',label:'Huruf C', emoji2:'🦎',label2:'Cicak',  eduTip:'C seperti CICAK'},
  {id:'ld',emoji:'D',label:'Huruf D', emoji2:'🐑',label2:'Domba',  eduTip:'D seperti DOMBA'},
  {id:'le',emoji:'E',label:'Huruf E', emoji2:'🦅',label2:'Elang',  eduTip:'E seperti ELANG'},
  {id:'lg',emoji:'G',label:'Huruf G', emoji2:'🐘',label2:'Gajah',  eduTip:'G seperti GAJAH'},
]

const MATCH_PAIRS_POKE = [
  {id:25, name:'Pikachu',    slug:'pikachu'},
  {id:4,  name:'Charmander', slug:'charmander'},
  {id:7,  name:'Squirtle',   slug:'squirtle'},
  {id:1,  name:'Bulbasaur',  slug:'bulbasaur'},
  {id:39, name:'Jigglypuff', slug:'jigglypuff'},
  {id:52, name:'Meowth',     slug:'meowth'},
  {id:133,name:'Eevee',      slug:'eevee'},
  {id:172,name:'Pichu',      slug:'pichu'},
  {id:94, name:'Gengar',     slug:'gengar'},
  {id:143,name:'Snorlax',    slug:'snorlax'},
  {id:35, name:'Clefairy',   slug:'clefairy'},
  {id:54, name:'Psyduck',    slug:'psyduck'},
]
const MATCH_PAIRS_HEWAN = [
  {id:'hw1',emoji:'🐘',label:'Gajah'},
  {id:'hw2',emoji:'🦁',label:'Singa'},
  {id:'hw3',emoji:'🐯',label:'Harimau'},
  {id:'hw4',emoji:'🦒',label:'Jerapah'},
  {id:'hw5',emoji:'🐬',label:'Lumba-lumba'},
  {id:'hw6',emoji:'🦋',label:'Kupu-kupu'},
  {id:'hw7',emoji:'🐸',label:'Katak'},
  {id:'hw8',emoji:'🦅',label:'Elang'},
  {id:'hw9',emoji:'🐊',label:'Buaya'},
  {id:'hw10',emoji:'🦓',label:'Zebra'},
  {id:'hw11',emoji:'🦊',label:'Rubah'},
  {id:'hw12',emoji:'🐼',label:'Panda'},
]
const MATCH_PAIRS_BUAH = [
  {id:'bu1',emoji:'🍎',label:'Apel'},
  {id:'bu2',emoji:'🍌',label:'Pisang'},
  {id:'bu3',emoji:'🍇',label:'Anggur'},
  {id:'bu4',emoji:'🍓',label:'Stroberi'},
  {id:'bu5',emoji:'🍊',label:'Jeruk'},
  {id:'bu6',emoji:'🍉',label:'Semangka'},
  {id:'bu7',emoji:'🥭',label:'Mangga'},
  {id:'bu8',emoji:'🍍',label:'Nanas'},
  {id:'bu9',emoji:'🥝',label:'Kiwi'},
  {id:'bu10',emoji:'🍑',label:'Persik'},
  {id:'bu11',emoji:'🍒',label:'Ceri'},
  {id:'bu12',emoji:'🍐',label:'Pir'},
]
const MATCH_PAIRS_SAYUR = [
  {id:'sv1',emoji:'🥕',label:'Wortel'},
  {id:'sv2',emoji:'🥦',label:'Brokoli'},
  {id:'sv3',emoji:'🌽',label:'Jagung'},
  {id:'sv4',emoji:'🥬',label:'Selada'},
  {id:'sv5',emoji:'🥒',label:'Timun'},
  {id:'sv6',emoji:'🍆',label:'Terong'},
  {id:'sv7',emoji:'🫑',label:'Paprika'},
  {id:'sv8',emoji:'🧅',label:'Bawang'},
  {id:'sv9',emoji:'🧄',label:'Bawang Putih'},
  {id:'sv10',emoji:'🥔',label:'Kentang'},
  {id:'sv11',emoji:'🌶️',label:'Cabai'},
  {id:'sv12',emoji:'🍄',label:'Jamur'},
]
const MATCH_PAIRS_KENDARAAN = [
  {id:'kd1',emoji:'🚗',label:'Mobil'},
  {id:'kd2',emoji:'🚌',label:'Bus'},
  {id:'kd3',emoji:'🚂',label:'Kereta'},
  {id:'kd4',emoji:'✈️',label:'Pesawat'},
  {id:'kd5',emoji:'🚀',label:'Roket'},
  {id:'kd6',emoji:'🚁',label:'Helikopter'},
  {id:'kd7',emoji:'🚢',label:'Kapal'},
  {id:'kd8',emoji:'🚲',label:'Sepeda'},
  {id:'kd9',emoji:'🏍️',label:'Motor'},
  {id:'kd10',emoji:'🚜',label:'Traktor'},
  {id:'kd11',emoji:'🚒',label:'Pemadam'},
  {id:'kd12',emoji:'🚑',label:'Ambulans'},
]
const MATCH_PAIRS_WARNA = [
  {id:'wr1',emoji:'🔴',label:'Merah'},
  {id:'wr2',emoji:'🟠',label:'Oranye'},
  {id:'wr3',emoji:'🟡',label:'Kuning'},
  {id:'wr4',emoji:'🟢',label:'Hijau'},
  {id:'wr5',emoji:'🔵',label:'Biru'},
  {id:'wr6',emoji:'🟣',label:'Ungu'},
  {id:'wr7',emoji:'⚫',label:'Hitam'},
  {id:'wr8',emoji:'⚪',label:'Putih'},
  {id:'wr9',emoji:'🟤',label:'Coklat'},
  {id:'wr10',emoji:'🩷',label:'Merah Muda'},
  {id:'wr11',emoji:'🩵',label:'Biru Muda'},
  {id:'wr12',emoji:'🟫',label:'Krem'},
]
const MATCH_PAIRS_BENDA = [
  {id:'bd1',emoji:'📚',label:'Buku'},
  {id:'bd2',emoji:'✏️',label:'Pensil'},
  {id:'bd3',emoji:'🪑',label:'Kursi'},
  {id:'bd4',emoji:'🛏️',label:'Kasur'},
  {id:'bd5',emoji:'🪟',label:'Jendela'},
  {id:'bd6',emoji:'🚪',label:'Pintu'},
  {id:'bd7',emoji:'💡',label:'Lampu'},
  {id:'bd8',emoji:'📱',label:'Ponsel'},
  {id:'bd9',emoji:'⌚',label:'Jam'},
  {id:'bd10',emoji:'🎒',label:'Ransel'},
  {id:'bd11',emoji:'🔑',label:'Kunci'},
  {id:'bd12',emoji:'🪞',label:'Cermin'},
]
const MATCH_PAIRS_PROFESI = [
  {id:'pf1',emoji:'👨‍⚕️',label:'Dokter'},
  {id:'pf2',emoji:'👩‍🏫',label:'Guru'},
  {id:'pf3',emoji:'👮',label:'Polisi'},
  {id:'pf4',emoji:'👨‍🍳',label:'Koki'},
  {id:'pf5',emoji:'🧑‍🚒',label:'Pemadam'},
  {id:'pf6',emoji:'👨‍🔧',label:'Montir'},
  {id:'pf7',emoji:'👩‍💼',label:'Pengusaha'},
  {id:'pf8',emoji:'🧑‍🌾',label:'Petani'},
  {id:'pf9',emoji:'🧑‍✈️',label:'Pilot'},
  {id:'pf10',emoji:'👨‍🎨',label:'Seniman'},
  {id:'pf11',emoji:'🧑‍💻',label:'Programmer'},
  {id:'pf12',emoji:'👩‍⚕️',label:'Perawat'},
]
const MATCH_PAIRS_ALAM = [
  {id:'al1',emoji:'🌋',label:'Gunung Berapi'},
  {id:'al2',emoji:'🏔️',label:'Gunung'},
  {id:'al3',emoji:'🏖️',label:'Pantai'},
  {id:'al4',emoji:'🌊',label:'Ombak'},
  {id:'al5',emoji:'🌴',label:'Pohon Kelapa'},
  {id:'al6',emoji:'🌿',label:'Rumput'},
  {id:'al7',emoji:'🌸',label:'Bunga Sakura'},
  {id:'al8',emoji:'🍄',label:'Jamur'},
  {id:'al9',emoji:'🌵',label:'Kaktus'},
  {id:'al10',emoji:'🪨',label:'Batu'},
  {id:'al11',emoji:'🏞️',label:'Danau'},
  {id:'al12',emoji:'🌁',label:'Kabut'},
]
const MATCH_PAIRS_CUACA = [
  {id:'cw1',emoji:'☀️',label:'Cerah'},
  {id:'cw2',emoji:'🌤️',label:'Berawan'},
  {id:'cw3',emoji:'🌧️',label:'Hujan'},
  {id:'cw4',emoji:'⛈️',label:'Badai'},
  {id:'cw5',emoji:'🌩️',label:'Petir'},
  {id:'cw6',emoji:'🌪️',label:'Tornado'},
  {id:'cw7',emoji:'❄️',label:'Salju'},
  {id:'cw8',emoji:'🌈',label:'Pelangi'},
  {id:'cw9',emoji:'🌬️',label:'Angin'},
  {id:'cw10',emoji:'🌫️',label:'Berkabut'},
  {id:'cw11',emoji:'🌞',label:'Matahari'},
  {id:'cw12',emoji:'🌙',label:'Bulan'},
]
const MATCH_PAIRS_MAKANAN = [
  {id:'mk1',emoji:'🍚',label:'Nasi'},
  {id:'mk2',emoji:'🍜',label:'Mie'},
  {id:'mk3',emoji:'🍞',label:'Roti'},
  {id:'mk4',emoji:'🥩',label:'Daging'},
  {id:'mk5',emoji:'🍣',label:'Sushi'},
  {id:'mk6',emoji:'🍕',label:'Pizza'},
  {id:'mk7',emoji:'🍔',label:'Burger'},
  {id:'mk8',emoji:'🍦',label:'Es Krim'},
  {id:'mk9',emoji:'🍰',label:'Kue'},
  {id:'mk10',emoji:'🥗',label:'Salad'},
  {id:'mk11',emoji:'🍲',label:'Sup'},
  {id:'mk12',emoji:'🥪',label:'Sandwich'},
]
const MATCH_PAIRS_SEKOLAH = [
  {id:'sk1',emoji:'📏',label:'Penggaris'},
  {id:'sk2',emoji:'📐',label:'Segitiga'},
  {id:'sk3',emoji:'📚',label:'Buku'},
  {id:'sk4',emoji:'🎒',label:'Tas Sekolah'},
  {id:'sk5',emoji:'🖍️',label:'Krayon'},
  {id:'sk6',emoji:'🖊️',label:'Pena'},
  {id:'sk7',emoji:'🔬',label:'Mikroskop'},
  {id:'sk8',emoji:'🗺️',label:'Peta'},
  {id:'sk9',emoji:'🧮',label:'Kalkulator'},
  {id:'sk10',emoji:'🎨',label:'Cat'},
  {id:'sk11',emoji:'🧪',label:'Tabung Uji'},
  {id:'sk12',emoji:'📓',label:'Buku Tulis'},
]
const ANIMALS_PICKER = ['🦁','🐰','🐘','🦊','🐸','🐯','🐼','🐨']
const ANIMALS_G4 = [
  '🐘','🦁','🐯','🐸','🐰','🦊','🐼','🐨','🐧','🦆','🐓','🐑','🦒','🐴','🦋',
  '🦀','🐢','🐊','🦅','🦭','🦧','🦚','🦜','🦩','🐙','🦑','🐬','🦈','🐳','🦦',
  '🦥','🐝','🐞','🐛','🐿️','🦔','🦎','🦘','🦙','🐐','🦌','🐻','🐺','🦝','🐗',
  '🐪','🦏','🦛','🐆','🦓'
]
const FRUITS_G4 = ['🍎','🍌','🍇','🍓','🍊','🍉','🥭','🍍','🥝','🍑','🍒','🍐','🫐','🍋','🥥','🍈','🍏','🥑','🍅','🍆']
const OBJECTS_G4 = ['📚','⚽','🎈','🎨','✏️','🪑','🛏️','🚗','✈️','🚂','🎸','🥁','🎭','🔭','🎮']
const POKEMON_G4 = [
  // Gen 1 starters & popular
  {id:25,name:'Pikachu'},{id:133,name:'Eevee'},{id:4,name:'Charmander'},{id:7,name:'Squirtle'},
  {id:1,name:'Bulbasaur'},{id:39,name:'Jigglypuff'},{id:52,name:'Meowth'},{id:54,name:'Psyduck'},
  {id:129,name:'Magikarp'},{id:143,name:'Snorlax'},{id:35,name:'Clefairy'},{id:172,name:'Pichu'},
  {id:110,name:'Weezing'},{id:94,name:'Gengar'},{id:113,name:'Chansey'},{id:79,name:'Slowpoke'},
  {id:58,name:'Growlithe'},{id:116,name:'Horsea'},{id:81,name:'Magnemite'},{id:120,name:'Staryu'},
  // Gen 1 evolved
  {id:6,name:'Charizard'},{id:9,name:'Blastoise'},{id:3,name:'Venusaur'},{id:150,name:'Mewtwo'},
  {id:151,name:'Mew'},{id:136,name:'Flareon'},{id:134,name:'Vaporeon'},{id:135,name:'Jolteon'},
  {id:196,name:'Espeon'},{id:197,name:'Umbreon'},{id:37,name:'Vulpix'},{id:63,name:'Abra'},
  {id:92,name:'Gastly'},{id:66,name:'Machop'},{id:74,name:'Geodude'},{id:104,name:'Cubone'},
  {id:109,name:'Koffing'},{id:147,name:'Dratini'},{id:123,name:'Scyther'},{id:137,name:'Porygon'},
  // Gen 2
  {id:152,name:'Chikorita'},{id:155,name:'Cyndaquil'},{id:158,name:'Totodile'},{id:175,name:'Togepi'},
  {id:179,name:'Mareep'},{id:183,name:'Marill'},{id:185,name:'Sudowoodo'},{id:190,name:'Aipom'},
  {id:193,name:'Yanma'},{id:194,name:'Wooper'},{id:198,name:'Murkrow'},{id:199,name:'Slowking'},
  {id:200,name:'Misdreavus'},{id:203,name:'Girafarig'},{id:209,name:'Snubbull'},{id:216,name:'Teddiursa'},
  {id:217,name:'Ursaring'},{id:220,name:'Swinub'},{id:225,name:'Delibird'},{id:228,name:'Houndour'},
  // Gen 3
  {id:252,name:'Treecko'},{id:255,name:'Torchic'},{id:258,name:'Mudkip'},{id:261,name:'Poochyena'},
  {id:270,name:'Lotad'},{id:273,name:'Seedot'},{id:276,name:'Taillow'},{id:278,name:'Wingull'},
  {id:280,name:'Ralts'},{id:285,name:'Shroomish'},{id:287,name:'Slakoth'},{id:293,name:'Whismur'},
  {id:296,name:'Makuhita'},{id:298,name:'Azurill'},{id:300,name:'Skitty'},{id:303,name:'Mawile'},
  {id:304,name:'Aron'},{id:307,name:'Meditite'},{id:311,name:'Plusle'},{id:312,name:'Minun'},
  // Gen 4+
  {id:393,name:'Piplup'},{id:390,name:'Chimchar'},{id:387,name:'Turtwig'},{id:399,name:'Bidoof'},
  {id:403,name:'Shinx'},{id:406,name:'Budew'},{id:420,name:'Cherubi'},{id:427,name:'Buneary'},
  {id:431,name:'Glameow'},{id:440,name:'Happiny'},{id:447,name:'Riolu'},{id:453,name:'Croagunk'},
  {id:479,name:'Rotom'},{id:489,name:'Phione'},{id:495,name:'Snivy'},{id:498,name:'Tepig'},
  {id:501,name:'Oshawott'},{id:509,name:'Purrloin'},{id:519,name:'Pidove'},{id:529,name:'Drilbur'}
]
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const GAME_META = {
  1:{icon:'🎭',name:'Aku Merasa...'},
  2:{icon:'🌬️',name:'Napas Pelangi'},
  3:{icon:'🔤',name:'Huruf Hutan'},
  4:{icon:'🔢',name:'Hitung Binatang'},
  5:{icon:'🃏',name:'Cocokkan Emosi'},
  6:{icon:'🏎️',name:'Petualangan Mobil',iconImg:'assets/car and vehicle/racecar-icon.svg'},
  7:{icon:'🖼️',name:'Tebak Gambar'},
  8:{icon:'🔡',name:'Susun Kata'},
  9:{icon:'✍️',name:'Jejak Huruf'},
  10:{icon:'⚡',name:'Pertarungan Pokemon'},
  11:{icon:'🔬',name:'Kuis Sains'},
  12:{icon:'🌑',name:'Tebak Bayangan'},
  13:{icon:'🔥',name:'Evolusi Math'},
  14:{icon:'🏁',name:'Balapan Kereta'},
  15:{icon:'🚂',name:'Lokomotif Pemberani',iconImg:'assets/train/linus-casey.webp'},
  16:{icon:'🚂',name:'Selamatkan Kereta!',iconImg:'assets/train/lokomotif-front-blue.svg'},
  17:{icon:'🌉',name:'Jembatan Goyang'},
  18:{icon:'🏛️',name:'Museum Ambarawa'},
  19:{icon:'🐦',name:'Pokemon Birds',iconImg:'assets/Pokemon/sprites/pidgeot.png'},
  20:{icon:'🏐',name:'Ducky Volley'},
  21:{icon:'🍄',name:'Mario Pokemon',iconImg:'assets/mario-pokemon/icon.png'},
  22:{icon:'🍬',name:'Monster Candy'},
  '13c':{icon:'🏅',name:'Gym Huruf & Suara'}
}

// XP & Level system
const LEVEL_TIERS = [
  {min:0,   max:29,  icon:'🥚', name:'Telur'},
  {min:30,  max:79,  icon:'🐣', name:'Cilik'},
  {min:80,  max:149, icon:'🐥', name:'Tumbuh'},
  {min:150, max:249, icon:'🦅', name:'Pintar'},
  {min:250, max:9999,icon:'👑', name:'Jagoan'}
]
// Per-player localStorage key prefix.
// Hotfix 2026-04-28: progress is now keyed by AVATAR (lion/rabbit/...),
// not by slot. Two slots that pick the same animal share progress, per
// user mandate "save progress itu ada di 8 karakter itu". Slot fallback
// is kept for boot-time reads before slot row is rendered.
const AVATAR_SLUGS = {
  '🦁':'lion','🐰':'rabbit','🐘':'elephant','🦊':'fox',
  '🐸':'frog','🐯':'tiger','🐼':'panda','🐨':'koala'
}
function _avatarSlug() {
  try {
    const slot = (window._pSlot && window._pSlot[0]) || 0
    const slots = (typeof getPlayerSlots === 'function') ? getPlayerSlots() : []
    const animal = slots && slots[slot] && slots[slot].animal
    return animal ? (AVATAR_SLUGS[animal] || String(animal)) : null
  } catch (_) { return null }
}
function pkey(key) {
  const av = _avatarSlug()
  if (av) return `dunia-avatar-${av}-${key}`
  // Pre-slot-pick boot, or no animal selected yet — fall back to slot key.
  const slot = (window._pSlot && window._pSlot[0]) || 0
  return `dunia-${slot}-${key}`
}
// Migrate old global keys to slot 0 (one-time)
function migrateGlobalKeys() {
  const oldKeys = ['dunia-emosi-xp','dunia-emosi-achievements','dunia-emosi-streak','dunia-progress','dunia-emosi-best-stars']
  const migrated = localStorage.getItem('dunia-migrated-v1')
  if (migrated) return
  for (const k of oldKeys) {
    const val = localStorage.getItem(k)
    if (val !== null) {
      localStorage.setItem(`dunia-0-${k.replace('dunia-emosi-','').replace('dunia-','')}`, val)
      localStorage.removeItem(k)
    }
  }
  localStorage.setItem('dunia-migrated-v1','1')
}
migrateGlobalKeys()

// Hotfix 2026-04-28: migrate slot-keyed progress to avatar-keyed. Per user
// mandate, two slots that pick the same animal must share progress. Old
// dunia-{slot}-* keys are LEFT in place for one release as a rollback safety.
function migrateSlotToAvatar() {
  if (localStorage.getItem('dunia-migrated-v2')) return
  const _slugMap = {
    '🦁':'lion','🐰':'rabbit','🐘':'elephant','🦊':'fox',
    '🐸':'frog','🐯':'tiger','🐼':'panda','🐨':'koala'
  }
  let slots = []
  try { slots = JSON.parse(localStorage.getItem('dunia-players')) || [] } catch (_) {}
  const subkeys = ['progress','xp','achievements','streak','best-stars']
  for (let s = 0; s < slots.length; s++) {
    const slot = slots[s]
    if (!slot || !slot.animal) continue
    const av = _slugMap[slot.animal] || String(slot.animal)
    for (const k of subkeys) {
      const oldKey = `dunia-${s}-${k}`
      const newKey = `dunia-avatar-${av}-${k}`
      const oldVal = localStorage.getItem(oldKey)
      if (oldVal === null) continue
      const newVal = localStorage.getItem(newKey)
      if (newVal === null) {
        localStorage.setItem(newKey, oldVal)
        continue
      }
      // Merge: take the higher star count per game/level; sum xp; union completed.
      try {
        const a = JSON.parse(oldVal)
        const b = JSON.parse(newVal)
        const merged = _mergeProgress(a, b, k)
        localStorage.setItem(newKey, JSON.stringify(merged))
      } catch (_) { /* keep newer if either side malformed */ }
    }
  }
  localStorage.setItem('dunia-migrated-v2','1')
}
function _mergeProgress(a, b, kind) {
  if (kind === 'xp') {
    const av = typeof a === 'number' ? a : parseInt(a) || 0
    const bv = typeof b === 'number' ? b : parseInt(b) || 0
    return Math.max(av, bv)
  }
  if (kind === 'progress' && a && b && typeof a === 'object' && typeof b === 'object') {
    const out = Object.assign({}, b)
    for (const gk of Object.keys(a)) {
      const ag = a[gk]; const bg = out[gk] || { completed: [], stars: {} }
      if (!ag || typeof ag !== 'object') continue
      bg.completed = Array.from(new Set([...(bg.completed || []), ...(ag.completed || [])]))
      bg.stars = Object.assign({}, bg.stars || {})
      const ast = ag.stars || {}
      for (const lv of Object.keys(ast)) {
        bg.stars[lv] = Math.max(bg.stars[lv] || 0, ast[lv] || 0)
      }
      out[gk] = bg
    }
    return out
  }
  // achievements / streak / best-stars: shallow-take per-key max if numeric, else prefer "newer" (b).
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const out = Object.assign({}, a, b)
    for (const k of Object.keys(a)) {
      if (typeof a[k] === 'number' && typeof b[k] === 'number') out[k] = Math.max(a[k], b[k])
    }
    return out
  }
  return b !== undefined ? b : a
}
migrateSlotToAvatar()

function getXP() {
  try { return parseInt(localStorage.getItem(pkey('xp'))||'0') } catch(e){return 0}
}
function addXP(amount) {
  const prev=getXP(), next=prev+amount
  try { localStorage.setItem(pkey('xp'),next) } catch(e){}
  return {prev, next, leveled: getLevelTier(prev).name !== getLevelTier(next).name}
}
function getLevelTier(xp) {
  return LEVEL_TIERS.find(t=>xp>=t.min&&xp<=t.max)||LEVEL_TIERS[0]
}

const ACHIEVEMENTS = {
  first_star:      {icon:'⭐', name:'Bintang Pertama!',  desc:'Dapatkan bintang pertamamu'},
  ten_stars:       {icon:'🌟', name:'10 Bintang!',       desc:'Kumpulkan 10 bintang total'},
  fifty_stars:     {icon:'🏆', name:'50 Bintang! Legenda!', desc:'Kumpulkan 50 bintang'},
  hundred_stars:   {icon:'💎', name:'100 Bintang! Juara!', desc:'Kumpulkan 100 bintang'},
  perfect_emotion: {icon:'🎭', name:'Master Emosi!',     desc:'Selesaikan Aku Merasa'},
  calm_breath:     {icon:'🌈', name:'Napas Pelangi!',    desc:'Selesaikan Napas Pelangi'},
  letter_master:   {icon:'📚', name:'Master Huruf!',     desc:'Selesaikan Huruf Hutan'},
  count_master:    {icon:'🔢', name:'Master Hitung!',    desc:'Selesaikan Hitung Binatang'},
  memory_master:   {icon:'🃏', name:'Master Memori!',    desc:'Selesaikan Cocokkan Emosi'},
  driver_master:   {icon:'🚗', name:'Pembalap Handal!',  desc:'Selesaikan Petualangan Mobil'},
  picture_master:  {icon:'🖼️', name:'Mata Elang!',       desc:'Selesaikan Tebak Gambar'},
  word_master:     {icon:'🔡', name:'Penulis Muda!',     desc:'Selesaikan Susun Kata'},
  trace_master:    {icon:'✍️', name:'Kaligrafer Cilik!', desc:'Selesaikan Jejak Huruf'},
  all_games:       {icon:'🌈', name:'Petualang Sejati!', desc:'Mainkan semua 12 game'},
  streak3:         {icon:'🔥', name:'3 Hari Berturut!',  desc:'Main 3 hari berturut-turut'},
  hard_mode:       {icon:'💪', name:'Berani Sulit!',     desc:'Selesaikan mode Sulit'}
}

// Asset fallback system
const ASSET_FALLBACK = {
  'leo-happy.webp':'🦁','leo-excited.webp':'🦁','leo-sad.webp':'🦁',
  'leo-surprised.webp':'🦁','leo-proud.webp':'🦁','leo-thinking.webp':'🦁',
  'car-red.webp':'🚗','car-blue.webp':'🚙','rocket.png':'🚀','submarine.webp':'🤿',
  'bg-city.webp':null,'bg-forest.webp':null,'bg-space.webp':null,'bg-body.webp':null,'bg-menu.webp':null,
  'obstacle-cone.png':'🚧','obstacle-rock.png':'🪨','obstacle-asteroid.png':'☄️','obstacle-bacteria.png':'🦠',
  'img-ayam.webp':'🐓','img-bebek.webp':'🦆','img-cicak.png':'🦎','img-domba.png':'🐑','img-elang.png':'🦅',
  'img-gajah.png':'🐘','img-harimau.png':'🐯','img-ikan.png':'🐟','img-jerapah.png':'🦒','img-kuda.png':'🐴',
  'img-monyet.png':'🐒','img-panda.png':'🐼','img-rusa.png':'🦌','img-singa.png':'🦁','img-tikus.png':'🐭',
  'img-apel.png':'🍎','img-bola.png':'⚽','img-buku.png':'📚','img-daun.png':'🍃','img-meja.png':'🪑'
}
// webp aliases for word images
Object.entries(ASSET_FALLBACK).forEach(([k,v])=>{ if(k.startsWith('img-')&&k.endsWith('.png')) ASSET_FALLBACK[k.replace('.png','.webp')]=v })
function getAssetEmoji(filename) { return ASSET_FALLBACK[filename] || ASSET_FALLBACK[filename.replace('.webp','.png')] || '❓' }
function renderAsset(filename, size=80) {
  const emoji = getAssetEmoji(filename)
  // Always try webp first (transparent, smaller), fallback to png, then emoji
  const stem = filename.replace(/\.(png|webp|jpg|jpeg)$/i,'')
  const webpSrc = `assets/${stem}.webp`
  const pngSrc  = `assets/${stem}.png`
  return `<img src="${webpSrc}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;" onerror="this.src='${pngSrc}';this.onerror=function(){this.outerHTML='<span style=\\'font-size:${size*0.7}px\\'>${emoji}</span>'}">`
}

// Game 6 word banks
const DRIVE_WORD_BANK = {
  city:   ['BOLA','KUDA','APEL','SAPI','MEJA','KURSI','LAMPU','BUKU','RUMAH','MOBIL','JALAN','TOKO','PASAR','KANTOR','POLISI','DOKTER','SEKOLAH','GEDUNG','BUS','TAKSI','JEMBATAN','KOTA'],
  forest: ['POHON','DAUN','BUNGA','BURUNG','KELINCI','HARIMAU','HUTAN','SUNGAI','BATU','LUMUT','JAMUR','RUSA','BERUANG','RUBAH','KATAK','SEMUT','LEBAH','KUPU','ANGIN','AKAR','RANTING','HEWAN'],
  space:  ['BUMI','MARS','BULAN','BINTANG','PLANET','ROKET','ORBIT','KOMET','GALAKSI','NEBULA','SATELIT','METEOR','ASTRONOT','MATAHARI','VENUS','YUPITER','SATURNUS','URANUS','NEPTUNUS','TELESKOP','ASTEROID','ANGKASA'],
  body:   ['MATA','KAKI','HATI','PARU','GIGI','JANTUNG','OTAK','DARAH','TULANG','OTOT','KULIT','TANGAN','HIDUNG','MULUT','TELINGA','LEHER','PERUT','DADA','BAHU','LUTUT','SIKU','JARI'],
  pantai: ['OMBAK','PASIR','KARANG','IKAN','KEPITING','BINTANG','PERAHU','JALA','LAUT','TERUMBU','CUMI','UDANG','SIPUT','KERANG','PENYU','LUMBA','HIU','PAUS','UBUR','NELAYAN','PANTAI','ANGIN'],
  sekolah:['BUKU','PENSIL','MEJA','KURSI','PAPAN','GURU','MURID','NILAI','UJIAN','KELAS','KANTIN','PERPUS','LAPANGAN','BELAJAR','MENULIS','MEMBACA','BERHITUNG','MENGGAMBAR','PELAJARAN','ISTIRAHAT','TEMAN','PULANG'],
  dapur:  ['NASI','MINYAK','GARAM','GULA','TELUR','AYAM','IKAN','SAYUR','BUAH','PANCI','WAJAN','PISAU','SENDOK','GARPU','PIRING','GELAS','BLENDER','OVEN','KOMPOR','KULKAS','SERBET','MANGKOK'],
  kebun:  ['BUNGA','POHON','DAUN','BUAH','SAYUR','TANAH','AIR','BENIH','CANGKUL','PUPUK','ULAT','KUPU','LEBAH','CACING','SEMUT','MATAHARI','HUJAN','TUMBUH','PANEN','KEBUN','RUMPUT','BENIH']
}
const DRIVE_VEHICLES  = {city:'🚗',forest:'🚗',space:'🚀',body:'🤿',pantai:'⛵',sekolah:'🚌',dapur:'🛺',kebun:'🚜'}
const DRIVE_OBSTACLES = {city:'⛔',forest:'🌵',space:'💥',body:'🦠',pantai:'🪨',sekolah:'🎒',dapur:'🥄',kebun:'🌿'}

// Game 7 image data
const WORD_IMAGES = [
  // --- Animals with image files ---
  {id:'ayam',   emoji:'🐓',word:'AYAM',   file:'img-ayam.webp',   suku:'A-YAM'},
  {id:'bebek',  emoji:'🦆',word:'BEBEK',  file:'img-bebek.webp',  suku:'BE-BEK'},
  {id:'gajah',  emoji:'🐘',word:'GAJAH',  file:'img-gajah.webp',  suku:'GA-JAH'},
  {id:'harimau',emoji:'🐯',word:'HARIMAU',file:'img-harimau.webp',suku:'HA-RI-MAU'},
  {id:'ikan',   emoji:'🐟',word:'IKAN',   file:'img-ikan.webp',   suku:'I-KAN'},
  {id:'jerapah',emoji:'🦒',word:'JERAPAH',file:'img-jerapah.webp',suku:'JE-RA-PAH'},
  {id:'kuda',   emoji:'🐴',word:'KUDA',   file:'img-kuda.webp',   suku:'KU-DA'},
  {id:'monyet', emoji:'🐒',word:'MONYET', file:'img-monyet.webp', suku:'MON-YET'},
  {id:'panda',  emoji:'🐼',word:'PANDA',  file:'img-panda.webp',  suku:'PAN-DA'},
  {id:'singa',  emoji:'🦁',word:'SINGA',  file:'img-singa.webp',  suku:'SIN-GA'},
  {id:'cicak',  emoji:'🦎',word:'CICAK',  file:'img-cicak.webp',  suku:'CI-CAK'},
  {id:'domba',  emoji:'🐑',word:'DOMBA',  file:'img-domba.webp',  suku:'DOM-BA'},
  {id:'elang',  emoji:'🦅',word:'ELANG',  file:'img-elang.webp',  suku:'E-LANG'},
  {id:'rusa',   emoji:'🦌',word:'RUSA',   file:'img-rusa.webp',   suku:'RU-SA'},
  {id:'tikus',  emoji:'🐭',word:'TIKUS',  file:'img-tikus.webp',  suku:'TI-KUS'},
  // --- Objects with image files ---
  {id:'apel',   emoji:'🍎',word:'APEL',   file:'img-apel.webp',   suku:'A-PEL'},
  {id:'bola',   emoji:'⚽',word:'BOLA',   file:'img-bola.webp',   suku:'BO-LA'},
  {id:'buku',   emoji:'📚',word:'BUKU',   file:'img-buku.webp',   suku:'BU-KU'},
  {id:'daun',   emoji:'🍃',word:'DAUN',   file:'img-daun.webp',   suku:'DA-UN'},
  {id:'meja',   emoji:'🪑',word:'MEJA',   file:'img-meja.webp',   suku:'ME-JA'},
  // --- Animals emoji-only ---
  {id:'kucing', emoji:'🐱',word:'KUCING', file:null,suku:'KU-CING'},
  {id:'anjing', emoji:'🐶',word:'ANJING', file:null,suku:'AN-JING'},
  {id:'kelinci',emoji:'🐰',word:'KELINCI',file:null,suku:'KE-LIN-CI'},
  {id:'kura',   emoji:'🐢',word:'KURA',   file:null,suku:'KU-RA'},
  {id:'burung', emoji:'🐦',word:'BURUNG', file:null,suku:'BU-RUNG'},
  {id:'kupu',   emoji:'🦋',word:'KUPU',   file:null,suku:'KU-PU'},
  {id:'lebah',  emoji:'🐝',word:'LEBAH',  file:null,suku:'LE-BAH'},
  {id:'semut',  emoji:'🐜',word:'SEMUT',  file:null,suku:'SE-MUT'},
  {id:'katak',  emoji:'🐸',word:'KATAK',  file:null,suku:'KA-TAK'},
  {id:'ular',   emoji:'🐍',word:'ULAR',   file:null,suku:'U-LAR'},
  {id:'beruang',emoji:'🐻',word:'BERUANG',file:null,suku:'BE-RU-ANG'},
  {id:'lumba',  emoji:'🐬',word:'LUMBA',  file:null,suku:'LUM-BA'},
  // --- Fruits emoji-only ---
  {id:'pisang', emoji:'🍌',word:'PISANG', file:null,suku:'PI-SANG'},
  {id:'jeruk',  emoji:'🍊',word:'JERUK',  file:null,suku:'JE-RUK'},
  {id:'mangga', emoji:'🥭',word:'MANGGA', file:null,suku:'MANG-GA'},
  {id:'anggur', emoji:'🍇',word:'ANGGUR', file:null,suku:'ANG-GUR'},
  {id:'pepaya', emoji:'🍑',word:'PEPAYA', file:null,suku:'PE-PA-YA'},
  {id:'semangka',emoji:'🍉',word:'SEMANGKA',file:null,suku:'SE-MANG-KA'},
  // --- Transport emoji-only ---
  {id:'sepeda', emoji:'🚲',word:'SEPEDA', file:null,suku:'SE-PE-DA'},
  {id:'pesawat',emoji:'✈️',word:'PESAWAT',file:null,suku:'PE-SA-WAT'},
  {id:'kapal',  emoji:'🚢',word:'KAPAL',  file:null,suku:'KA-PAL'},
  {id:'kereta2',emoji:'🚂',word:'KERETA', file:null,suku:'KE-RE-TA'},
  // --- Misc emoji-only ---
  {id:'payung', emoji:'☂️',word:'PAYUNG', file:null,suku:'PA-YUNG'},
  {id:'rumah',  emoji:'🏠',word:'RUMAH',  file:null,suku:'RU-MAH'},
  {id:'bunga',  emoji:'🌸',word:'BUNGA',  file:null,suku:'BUNG-A'},
  {id:'bintang2',emoji:'⭐',word:'BINTANG',file:null,suku:'BIN-TANG'},
  {id:'lampu',  emoji:'💡',word:'LAMPU',  file:null,suku:'LAM-PU'},
  {id:'pena',   emoji:'🖊️',word:'PENA',   file:null,suku:'PE-NA'},
  {id:'gitar',  emoji:'🎸',word:'GITAR',  file:null,suku:'GI-TAR'},
  {id:'nasi',   emoji:'🍚',word:'NASI',   file:null,suku:'NA-SI'},
  {id:'wortel', emoji:'🥕',word:'WORTEL', file:null,suku:'WOR-TEL'},
  {id:'jagung', emoji:'🌽',word:'JAGUNG', file:null,suku:'JA-GUNG'},
  // --- More animals ---
  {id:'sapi',   emoji:'🐄',word:'SAPI',   file:null,suku:'SA-PI'},
  {id:'kambing',emoji:'🐐',word:'KAMBING',file:null,suku:'KAM-BING'},
  {id:'tikus2', emoji:'🐀',word:'TIKUS',  file:null,suku:'TI-KUS'},
  {id:'gorila', emoji:'🦍',word:'GORILA', file:null,suku:'GO-RI-LA'},
  {id:'zebra',  emoji:'🦓',word:'ZEBRA',  file:null,suku:'ZEB-RA'},
  {id:'kuda-nil',emoji:'🦛',word:'BADAK', file:null,suku:'BA-DAK'},
  {id:'pinguin',emoji:'🐧',word:'PINGUIN',file:null,suku:'PIN-GUIN'},
  {id:'flamingo',emoji:'🦩',word:'FLAMINGO',file:null,suku:'FLA-MIN-GO'},
  {id:'merak',  emoji:'🦚',word:'MERAK',  file:null,suku:'ME-RAK'},
  {id:'buaya',  emoji:'🐊',word:'BUAYA',  file:null,suku:'BU-A-YA'},
  {id:'kura2',  emoji:'🐢',word:'KURA-KURA',file:null,suku:'KU-RA KU-RA'},
  {id:'landak', emoji:'🦔',word:'LANDAK', file:null,suku:'LAN-DAK'},
  {id:'kepiting',emoji:'🦀',word:'KEPITING',file:null,suku:'KE-PI-TING'},
  {id:'ubur',   emoji:'🪼',word:'UBUR',   file:null,suku:'U-BUR'},
  {id:'udang',  emoji:'🦐',word:'UDANG',  file:null,suku:'U-DANG'},
  {id:'cumi',   emoji:'🦑',word:'CUMI',   file:null,suku:'CU-MI'},
  {id:'gurita', emoji:'🐙',word:'GURITA', file:null,suku:'GU-RI-TA'},
  {id:'hiu',    emoji:'🦈',word:'HIU',    file:null,suku:'HI-U'},
  {id:'paus',   emoji:'🐋',word:'PAUS',   file:null,suku:'PA-US'},
  {id:'kuda-laut',emoji:'🐠',word:'IKAN HIAS',file:null,suku:'I-KAN HI-AS'},
  {id:'babi',   emoji:'🐷',word:'BABI',   file:null,suku:'BA-BI'},
  {id:'kerbau', emoji:'🐃',word:'KERBAU', file:null,suku:'KER-BAU'},
  {id:'kijang', emoji:'🦌',word:'KIJANG', file:null,suku:'KI-JANG'},
  {id:'serigala',emoji:'🐺',word:'SERIGALA',file:null,suku:'SE-RI-GA-LA'},
  {id:'rubah',  emoji:'🦊',word:'RUBAH',  file:null,suku:'RU-BAH'},
  {id:'berang', emoji:'🦦',word:'BERANG-BERANG',file:null,suku:'BE-RANG BE-RANG'},
  {id:'musang', emoji:'🦨',word:'MUSANG', file:null,suku:'MU-SANG'},
  // --- More foods ---
  {id:'tomat',  emoji:'🍅',word:'TOMAT',  file:null,suku:'TO-MAT'},
  {id:'terong', emoji:'🍆',word:'TERONG', file:null,suku:'TE-RONG'},
  {id:'brokoli',emoji:'🥦',word:'BROKOLI',file:null,suku:'BRO-KO-LI'},
  {id:'labu',   emoji:'🎃',word:'LABU',   file:null,suku:'LA-BU'},
  {id:'cabe',   emoji:'🌶️',word:'CABE',   file:null,suku:'CA-BE'},
  {id:'bawang', emoji:'🧅',word:'BAWANG', file:null,suku:'BA-WANG'},
  {id:'kentang',emoji:'🥔',word:'KENTANG',file:null,suku:'KEN-TANG'},
  {id:'timun',  emoji:'🥒',word:'TIMUN',  file:null,suku:'TI-MUN'},
  {id:'nanas',  emoji:'🍍',word:'NANAS',  file:null,suku:'NA-NAS'},
  {id:'stroberi',emoji:'🍓',word:'STROBERI',file:null,suku:'ST-RO-BE-RI'},
  {id:'ceri',   emoji:'🍒',word:'CERI',   file:null,suku:'CE-RI'},
  {id:'kiwi',   emoji:'🥝',word:'KIWI',   file:null,suku:'KI-WI'},
  {id:'melon',  emoji:'🍈',word:'MELON',  file:null,suku:'ME-LON'},
  {id:'leci',   emoji:'🍑',word:'PERSIK', file:null,suku:'PER-SIK'},
  {id:'kelapa', emoji:'🥥',word:'KELAPA', file:null,suku:'KE-LA-PA'},
  {id:'kurma',  emoji:'🌴',word:'KURMA',  file:null,suku:'KUR-MA'},
  {id:'kacang', emoji:'🥜',word:'KACANG', file:null,suku:'KA-CANG'},
  // --- Household & school objects ---
  {id:'pensil', emoji:'✏️',word:'PENSIL', file:null,suku:'PEN-SIL'},
  {id:'penggaris',emoji:'📏',word:'PENGGARIS',file:null,suku:'PENG-GA-RIS'},
  {id:'gunting',emoji:'✂️',word:'GUNTING',file:null,suku:'GUN-TING'},
  {id:'pulpen', emoji:'🖊️',word:'PULPEN', file:null,suku:'PUL-PEN'},
  {id:'kertas', emoji:'📄',word:'KERTAS', file:null,suku:'KER-TAS'},
  {id:'tas',    emoji:'🎒',word:'TAS',    file:null,suku:'TAS'},
  {id:'kursi',  emoji:'🪑',word:'KURSI',  file:null,suku:'KUR-SI'},
  {id:'pintu',  emoji:'🚪',word:'PINTU',  file:null,suku:'PIN-TU'},
  {id:'jendela',emoji:'🪟',word:'JENDELA',file:null,suku:'JEN-DE-LA'},
  {id:'cermin', emoji:'🪞',word:'CERMIN', file:null,suku:'CER-MIN'},
  {id:'sikat',  emoji:'🪥',word:'SIKAT',  file:null,suku:'SI-KAT'},
  {id:'sabun',  emoji:'🧼',word:'SABUN',  file:null,suku:'SA-BUN'},
  {id:'handuk', emoji:'🧣',word:'HANDUK', file:null,suku:'HAN-DUK'},
  {id:'sendok', emoji:'🥄',word:'SENDOK', file:null,suku:'SEN-DOK'},
  {id:'garpu',  emoji:'🍴',word:'GARPU',  file:null,suku:'GAR-PU'},
  {id:'gelas',  emoji:'🥛',word:'GELAS',  file:null,suku:'GE-LAS'},
  {id:'mangkok',emoji:'🍜',word:'MANGKOK',file:null,suku:'MANG-KOK'},
  {id:'sapu',   emoji:'🧹',word:'SAPU',   file:null,suku:'SA-PU'},
  {id:'ember',  emoji:'🪣',word:'EMBER',  file:null,suku:'EM-BER'},
  // --- Nature ---
  {id:'gunung', emoji:'⛰️',word:'GUNUNG', file:null,suku:'GU-NUNG'},
  {id:'sungai', emoji:'🌊',word:'SUNGAI', file:null,suku:'SU-NGAI'},
  {id:'hutan',  emoji:'🌲',word:'HUTAN',  file:null,suku:'HU-TAN'},
  {id:'danau',  emoji:'🏔️',word:'DANAU',  file:null,suku:'DA-NAU'},
  {id:'pantai', emoji:'🏖️',word:'PANTAI', file:null,suku:'PAN-TAI'},
  {id:'langit', emoji:'☁️',word:'LANGIT', file:null,suku:'LA-NGIT'},
  {id:'angin',  emoji:'💨',word:'ANGIN',  file:null,suku:'A-NGIN'},
  {id:'salju',  emoji:'❄️',word:'SALJU',  file:null,suku:'SAL-JU'},
  {id:'pelangi2',emoji:'🌈',word:'PELANGI',file:null,suku:'PE-LA-NGI'},
  {id:'api',    emoji:'🔥',word:'API',    file:null,suku:'A-PI'},
  {id:'air',    emoji:'💧',word:'AIR',    file:null,suku:'A-IR'},
  {id:'tanah',  emoji:'🪨',word:'BATU',   file:null,suku:'BA-TU'},
  // --- Transport & places ---
  {id:'mobil',  emoji:'🚗',word:'MOBIL',  file:null,suku:'MO-BIL'},
  {id:'bus',    emoji:'🚌',word:'BUS',    file:null,suku:'BUS'},
  {id:'motor',  emoji:'🏍️',word:'MOTOR',  file:null,suku:'MO-TOR'},
  {id:'helikopter',emoji:'🚁',word:'HELIKOPTER',file:null,suku:'HE-LI-KOP-TER'},
  {id:'kapal-selam',emoji:'🚀',word:'ROKET',file:null,suku:'RO-KET'},
  {id:'ambulans',emoji:'🚑',word:'AMBULANS',file:null,suku:'AM-BU-LANS'},
  {id:'pemadam',emoji:'🚒',word:'PEMADAM', file:null,suku:'PE-MA-DAM'},
  {id:'polisi-car',emoji:'🚓',word:'POLISI',file:null,suku:'PO-LI-SI'},
  {id:'sekolah2',emoji:'🏫',word:'SEKOLAH',file:null,suku:'SE-KO-LAH'},
  {id:'pasar',  emoji:'🏪',word:'PASAR',  file:null,suku:'PA-SAR'},
  {id:'masjid', emoji:'🕌',word:'MASJID', file:null,suku:'MAS-JID'},
  {id:'bank',   emoji:'🏦',word:'BANK',   file:null,suku:'BANK'},
  // --- Colors & shapes ---
  {id:'merah',  emoji:'🔴',word:'MERAH',  file:null,suku:'ME-RAH'},
  {id:'biru',   emoji:'🔵',word:'BIRU',   file:null,suku:'BI-RU'},
  {id:'hijau',  emoji:'🟢',word:'HIJAU',  file:null,suku:'HI-JAU'},
  {id:'kuning', emoji:'🟡',word:'KUNING', file:null,suku:'KU-NING'},
  {id:'ungu',   emoji:'🟣',word:'UNGU',   file:null,suku:'U-NGU'},
  {id:'putih',  emoji:'⬜',word:'PUTIH',  file:null,suku:'PU-TIH'},
  {id:'hitam',  emoji:'⬛',word:'HITAM',  file:null,suku:'HI-TAM'},
  {id:'oranye', emoji:'🟠',word:'ORANYE', file:null,suku:'O-RA-NYE'},
  // --- Emotions & people ---
  {id:'senang', emoji:'😊',word:'SENANG', file:null,suku:'SE-NANG'},
  {id:'sedih',  emoji:'😢',word:'SEDIH',  file:null,suku:'SE-DIH'},
  {id:'marah',  emoji:'😠',word:'MARAH',  file:null,suku:'MA-RAH'},
  {id:'takut',  emoji:'😨',word:'TAKUT',  file:null,suku:'TA-KUT'},
  {id:'kaget',  emoji:'😲',word:'KAGET',  file:null,suku:'KA-GET'},
  {id:'malu',   emoji:'😳',word:'MALU',   file:null,suku:'MA-LU'},
  {id:'sakit',  emoji:'🤒',word:'SAKIT',  file:null,suku:'SA-KIT'},
  {id:'sehat',  emoji:'💪',word:'SEHAT',  file:null,suku:'SE-HAT'},
]

// Game 8 word bank (tiered: easy=3-4 letters, medium=5-6, hard=7+)
const WORD_BUILD_BANK = [
  // --- Easy (3-4 huruf) ---
  {word:'AYAM',emoji:'🐓',hint:'Hewan berkokok',tier:'easy'},
  {word:'KUDA',emoji:'🐴',hint:'Hewan berlari cepat',tier:'easy'},
  {word:'IKAN',emoji:'🐟',hint:'Hewan di air',tier:'easy'},
  {word:'BUKU',emoji:'📚',hint:'Untuk baca dan belajar',tier:'easy'},
  {word:'APEL',emoji:'🍎',hint:'Buah berwarna merah',tier:'easy'},
  {word:'BOLA',emoji:'⚽',hint:'Alat bermain yang bulat',tier:'easy'},
  {word:'NASI',emoji:'🍚',hint:'Makanan pokok Indonesia',tier:'easy'},
  {word:'SUSU',emoji:'🥛',hint:'Minuman putih bergizi',tier:'easy'},
  {word:'ROTI',emoji:'🍞',hint:'Makanan dari tepung',tier:'easy'},
  {word:'TOPI',emoji:'🎩',hint:'Dipakai di kepala',tier:'easy'},
  {word:'BAJU',emoji:'👕',hint:'Pakaian yang kita kenakan',tier:'easy'},
  {word:'MADU',emoji:'🍯',hint:'Makanan manis dari lebah',tier:'easy'},
  {word:'BUAH',emoji:'🍓',hint:'Makanan segar dari pohon',tier:'easy'},
  {word:'KOPI',emoji:'☕',hint:'Minuman panas dari biji',tier:'easy'},
  {word:'DADU',emoji:'🎲',hint:'Alat bermain berbentuk kubus',tier:'easy'},
  {word:'BESI',emoji:'⚙️',hint:'Logam keras berwarna abu-abu',tier:'easy'},
  {word:'KAYU',emoji:'🪵',hint:'Bahan dari pohon',tier:'easy'},
  {word:'LAGU',emoji:'🎵',hint:'Musik yang dinyanyikan',tier:'easy'},
  {word:'MATA',emoji:'👀',hint:'Digunakan untuk melihat',tier:'easy'},
  {word:'KAKI',emoji:'🦵',hint:'Digunakan untuk berjalan',tier:'easy'},
  // --- Medium (5-6 huruf) ---
  {word:'PANDA',emoji:'🐼',hint:'Hewan hitam putih suka bambu',tier:'medium'},
  {word:'SINGA',emoji:'🦁',hint:'Raja hutan',tier:'medium'},
  {word:'BEBEK',emoji:'🦆',hint:'Hewan suka air bisa terbang',tier:'medium'},
  {word:'GAJAH',emoji:'🐘',hint:'Hewan terbesar di darat',tier:'medium'},
  {word:'BUNGA',emoji:'🌸',hint:'Bagian indah dari tanaman',tier:'medium'},
  {word:'POHON',emoji:'🌳',hint:'Tumbuhan besar berkayu',tier:'medium'},
  {word:'KUCING',emoji:'🐱',hint:'Hewan peliharaan berbunyi meong',tier:'medium'},
  {word:'ANJING',emoji:'🐶',hint:'Hewan peliharaan setia',tier:'medium'},
  {word:'BURUNG',emoji:'🐦',hint:'Hewan bersayap yang terbang',tier:'medium'},
  {word:'PISANG',emoji:'🍌',hint:'Buah kuning berbentuk melengkung',tier:'medium'},
  {word:'JERUK',emoji:'🍊',hint:'Buah berwarna oranye',tier:'medium'},
  {word:'KELINCI',emoji:'🐰',hint:'Hewan berbulu dengan telinga panjang',tier:'medium'},
  {word:'MANGGA',emoji:'🥭',hint:'Buah tropis berwarna kuning',tier:'medium'},
  {word:'KATAK',emoji:'🐸',hint:'Hewan hijau suka melompat',tier:'medium'},
  {word:'SEMUT',emoji:'🐜',hint:'Serangga kecil pekerja keras',tier:'medium'},
  {word:'LEBAH',emoji:'🐝',hint:'Serangga penghasil madu',tier:'medium'},
  {word:'WORTEL',emoji:'🥕',hint:'Sayuran berwarna oranye',tier:'medium'},
  {word:'JAGUNG',emoji:'🌽',hint:'Tanaman pangan biji kuning',tier:'medium'},
  {word:'ANGGUR',emoji:'🍇',hint:'Buah ungu atau hijau bergerombol',tier:'medium'},
  {word:'GITAR',emoji:'🎸',hint:'Alat musik berdawai',tier:'medium'},
  {word:'PAYUNG',emoji:'☂️',hint:'Pelindung dari hujan',tier:'medium'},
  {word:'PIRING',emoji:'🍽️',hint:'Tempat menyajikan makanan',tier:'medium'},
  {word:'SEPATU',emoji:'👟',hint:'Alas kaki',tier:'medium'},
  {word:'HUJAN',emoji:'🌧️',hint:'Air turun dari langit',tier:'medium'},
  {word:'BINTANG',emoji:'⭐',hint:'Benda bercahaya di langit malam',tier:'medium'},
  // --- Hard (7+ huruf) ---
  {word:'HARIMAU',emoji:'🐯',hint:'Hewan bergaris-garis hitam',tier:'hard'},
  {word:'JERAPAH',emoji:'🦒',hint:'Hewan dengan leher sangat panjang',tier:'hard'},
  {word:'MONYET',emoji:'🐒',hint:'Hewan pandai panjat pohon',tier:'hard'},
  {word:'PELANGI',emoji:'🌈',hint:'Warna-warni setelah hujan',tier:'hard'},
  {word:'BERUANG',emoji:'🐻',hint:'Hewan besar suka madu',tier:'hard'},
  {word:'SEMANGKA',emoji:'🍉',hint:'Buah besar berisi merah',tier:'hard'},
  {word:'KOMPUTER',emoji:'💻',hint:'Mesin cerdas untuk bekerja',tier:'hard'},
  {word:'PESAWAT',emoji:'✈️',hint:'Kendaraan yang terbang',tier:'hard'},
  {word:'KERETA',emoji:'🚂',hint:'Kendaraan di rel panjang',tier:'hard'},
  {word:'KELINCI',emoji:'🐰',hint:'Hewan lompat berbulu lembut',tier:'hard'},
  {word:'SEKOLAH',emoji:'🏫',hint:'Tempat belajar dan bermain',tier:'hard'},
  {word:'JEMBATAN',emoji:'🌉',hint:'Penghubung dua tepi sungai',tier:'hard'},
  {word:'PERPUSTAKAAN',emoji:'📚',hint:'Tempat menyimpan buku',tier:'hard'},
  {word:'MATAHARI',emoji:'☀️',hint:'Bintang paling dekat dengan Bumi',tier:'hard'},
  {word:'INDONESIA',emoji:'🇮🇩',hint:'Negara kita tercinta',tier:'hard'},
  {word:'KUPU-KUPU',emoji:'🦋',hint:'Serangga bersayap indah',tier:'hard'},
  {word:'DINOSAURUS',emoji:'🦕',hint:'Hewan purba yang sudah punah',tier:'hard'},
  {word:'PERSAHABATAN',emoji:'🤝',hint:'Rasa kasih antarteman',tier:'hard'},
  {word:'PETUALANGAN',emoji:'🗺️',hint:'Perjalanan seru dan menantang',tier:'hard'},
  {word:'PENGETAHUAN',emoji:'🧠',hint:'Ilmu yang kita pelajari',tier:'hard'},
  // --- Easy additions ---
  {word:'SAPI',emoji:'🐄',hint:'Hewan penghasil susu',tier:'easy'},
  {word:'BABI',emoji:'🐷',hint:'Hewan gemuk berkaki pendek',tier:'easy'},
  {word:'ULAR',emoji:'🐍',hint:'Hewan melata tanpa kaki',tier:'easy'},
  {word:'KURA',emoji:'🐢',hint:'Hewan bercangkang keras',tier:'easy'},
  {word:'DAUN',emoji:'🍃',hint:'Bagian hijau dari pohon',tier:'easy'},
  {word:'AKAR',emoji:'🌱',hint:'Bagian bawah tanaman',tier:'easy'},
  {word:'BIJI',emoji:'🌰',hint:'Cikal bakal tanaman baru',tier:'easy'},
  {word:'TALI',emoji:'🪢',hint:'Dipakai untuk mengikat',tier:'easy'},
  {word:'SAPU',emoji:'🧹',hint:'Alat membersihkan lantai',tier:'easy'},
  {word:'RODA',emoji:'⚙️',hint:'Bagian bulat pada kendaraan',tier:'easy'},
  {word:'JARI',emoji:'🖐️',hint:'Bagian dari tangan',tier:'easy'},
  {word:'GIGI',emoji:'🦷',hint:'Bagian mulut untuk mengunyah',tier:'easy'},
  {word:'GULA',emoji:'🍬',hint:'Bahan pemanis makanan',tier:'easy'},
  {word:'BATU',emoji:'🪨',hint:'Benda keras dari alam',tier:'easy'},
  {word:'EMAS',emoji:'🏅',hint:'Logam mulia berwarna kuning',tier:'easy'},
  {word:'TAHU',emoji:'🟨',hint:'Makanan dari kedelai',tier:'easy'},
  {word:'MEJA',emoji:'🪑',hint:'Tempat meletakkan benda',tier:'easy'},
  {word:'PENA',emoji:'🖊️',hint:'Alat tulis berisi tinta',tier:'easy'},
  {word:'BIRU',emoji:'💙',hint:'Warna langit dan laut',tier:'easy'},
  {word:'NAGA',emoji:'🐉',hint:'Hewan mitos bernapas api',tier:'easy'},
  {word:'BAYI',emoji:'👶',hint:'Manusia yang baru lahir',tier:'easy'},
  {word:'DUIT',emoji:'💰',hint:'Alat tukar barang',tier:'easy'},
  {word:'KAIN',emoji:'🧵',hint:'Bahan untuk membuat pakaian',tier:'easy'},
  {word:'KACA',emoji:'🪟',hint:'Benda bening dan keras',tier:'easy'},
  {word:'RUSA',emoji:'🦌',hint:'Hewan bertanduk di hutan',tier:'easy'},
  {word:'BULU',emoji:'🪶',hint:'Penutup tubuh burung',tier:'easy'},
  {word:'SAKU',emoji:'👝',hint:'Kantong kecil di baju',tier:'easy'},
  {word:'DURI',emoji:'🌵',hint:'Bagian tajam di tanaman',tier:'easy'},
  {word:'SOFA',emoji:'🛋️',hint:'Kursi empuk panjang',tier:'easy'},
  {word:'TAMU',emoji:'🙋',hint:'Orang yang berkunjung ke rumah',tier:'easy'},
  {word:'CUCI',emoji:'🧼',hint:'Membersihkan dengan air',tier:'easy'},
  {word:'PAGI',emoji:'🌅',hint:'Waktu setelah matahari terbit',tier:'easy'},
  {word:'SORE',emoji:'🌇',hint:'Waktu menjelang senja',tier:'easy'},
  {word:'SIKU',emoji:'💪',hint:'Sendi di tengah lengan',tier:'easy'},
  {word:'JALA',emoji:'🎣',hint:'Alat untuk menangkap ikan',tier:'easy'},
  {word:'API',emoji:'🔥',hint:'Cahaya panas yang menyala',tier:'easy'},
  {word:'TARI',emoji:'💃',hint:'Gerakan tubuh mengikuti irama',tier:'easy'},
  {word:'LELE',emoji:'🐠',hint:'Ikan berkumis dari sungai',tier:'easy'},
  {word:'CUMI',emoji:'🦑',hint:'Hewan laut bertentakel',tier:'easy'},
  {word:'KUTU',emoji:'🦟',hint:'Serangga kecil parasit',tier:'easy'},
  // --- Medium additions ---
  {word:'DOMBA',emoji:'🐑',hint:'Hewan berbulu penghasil wol',tier:'medium'},
  {word:'PENYU',emoji:'🐢',hint:'Kura-kura yang hidup di laut',tier:'medium'},
  {word:'KODOK',emoji:'🐸',hint:'Hewan hijau pelompat',tier:'medium'},
  {word:'ELANG',emoji:'🦅',hint:'Burung pemangsa besar',tier:'medium'},
  {word:'ZEBRA',emoji:'🦓',hint:'Hewan bergaris hitam putih',tier:'medium'},
  {word:'BADAK',emoji:'🦏',hint:'Hewan bercula di hidung',tier:'medium'},
  {word:'TIKUS',emoji:'🐭',hint:'Hewan pengerat kecil',tier:'medium'},
  {word:'RUBAH',emoji:'🦊',hint:'Hewan licik berwarna oranye',tier:'medium'},
  {word:'MACAN',emoji:'🐆',hint:'Hewan berbintik-bintik',tier:'medium'},
  {word:'KERBAU',emoji:'🐃',hint:'Hewan besar membantu membajak sawah',tier:'medium'},
  {word:'MERAH',emoji:'❤️',hint:'Warna darah dan apel',tier:'medium'},
  {word:'HIJAU',emoji:'💚',hint:'Warna pohon dan daun',tier:'medium'},
  {word:'KUNING',emoji:'💛',hint:'Warna pisang dan matahari',tier:'medium'},
  {word:'PUTIH',emoji:'🤍',hint:'Warna salju dan susu',tier:'medium'},
  {word:'HITAM',emoji:'🖤',hint:'Warna gelap tanpa cahaya',tier:'medium'},
  {word:'COKLAT',emoji:'🤎',hint:'Warna tanah dan kayu',tier:'medium'},
  {word:'JINGGA',emoji:'🧡',hint:'Warna antara merah dan kuning',tier:'medium'},
  {word:'HIDUNG',emoji:'👃',hint:'Alat penciuman di wajah',tier:'medium'},
  {word:'BIBIR',emoji:'👄',hint:'Bagian terluar dari mulut',tier:'medium'},
  {word:'KEPALA',emoji:'🧠',hint:'Bagian tubuh paling atas',tier:'medium'},
  {word:'TANGAN',emoji:'🤚',hint:'Bagian tubuh untuk memegang',tier:'medium'},
  {word:'LUTUT',emoji:'🦵',hint:'Sendi di tengah kaki',tier:'medium'},
  {word:'PERUT',emoji:'🫃',hint:'Bagian tubuh tempat makanan',tier:'medium'},
  {word:'MULUT',emoji:'😮',hint:'Alat bicara dan makan',tier:'medium'},
  {word:'RAMBUT',emoji:'💇',hint:'Tumbuh di atas kepala',tier:'medium'},
  {word:'TUBUH',emoji:'🧍',hint:'Seluruh bagian fisik kita',tier:'medium'},
  {word:'TOMAT',emoji:'🍅',hint:'Buah/sayuran berwarna merah bulat',tier:'medium'},
  {word:'TERONG',emoji:'🍆',hint:'Sayuran panjang berwarna ungu',tier:'medium'},
  {word:'TIMUN',emoji:'🥒',hint:'Sayuran panjang hijau berair',tier:'medium'},
  {word:'BAWANG',emoji:'🧅',hint:'Bumbu dapur berbau kuat',tier:'medium'},
  {word:'LOBAK',emoji:'🥬',hint:'Sayuran akar berwarna putih',tier:'medium'},
  {word:'BAYAM',emoji:'🥬',hint:'Sayuran hijau bergizi tinggi',tier:'medium'},
  {word:'PENSIL',emoji:'✏️',hint:'Alat tulis dari kayu',tier:'medium'},
  {word:'KERTAS',emoji:'📄',hint:'Lembaran tipis untuk menulis',tier:'medium'},
  {word:'PULPEN',emoji:'🖊️',hint:'Alat tulis berisi tinta cair',tier:'medium'},
  {word:'KAPAL',emoji:'🚢',hint:'Kendaraan besar di laut',tier:'medium'},
  {word:'MOTOR',emoji:'🛵',hint:'Kendaraan beroda dua bermesin',tier:'medium'},
  {word:'BECAK',emoji:'🛺',hint:'Kendaraan roda tiga bertenaga kayuh',tier:'medium'},
  {word:'RUMAH',emoji:'🏠',hint:'Tempat tinggal keluarga',tier:'medium'},
  {word:'PASAR',emoji:'🏪',hint:'Tempat jual beli barang',tier:'medium'},
  {word:'TAMAN',emoji:'🌿',hint:'Tempat bermain dengan banyak tanaman',tier:'medium'},
  {word:'MASJID',emoji:'🕌',hint:'Tempat ibadah umat Islam',tier:'medium'},
  {word:'MUSEUM',emoji:'🏛️',hint:'Tempat menyimpan benda sejarah',tier:'medium'},
  {word:'KANTOR',emoji:'🏢',hint:'Tempat bekerja',tier:'medium'},
  {word:'DOKTER',emoji:'👨‍⚕️',hint:'Orang yang menyembuhkan penyakit',tier:'medium'},
  {word:'POLISI',emoji:'👮',hint:'Penjaga keamanan dan ketertiban',tier:'medium'},
  {word:'PETANI',emoji:'👨‍🌾',hint:'Orang yang bercocok tanam',tier:'medium'},
  {word:'PILOT',emoji:'👨‍✈️',hint:'Pengemudi pesawat terbang',tier:'medium'},
  {word:'SABUN',emoji:'🧴',hint:'Pembersih berbusa',tier:'medium'},
  {word:'EMBER',emoji:'🪣',hint:'Wadah bulat untuk menampung air',tier:'medium'},
  // --- Hard additions ---
  {word:'KELELAWAR',emoji:'🦇',hint:'Mamalia terbang di malam hari',tier:'hard'},
  {word:'ORANG-UTAN',emoji:'🦧',hint:'Kera besar berambut merah dari Kalimantan',tier:'hard'},
  {word:'MERPATI',emoji:'🕊️',hint:'Burung putih lambang perdamaian',tier:'hard'},
  {word:'LUMBA-LUMBA',emoji:'🐬',hint:'Mamalia laut yang cerdas',tier:'hard'},
  {word:'RAMBUTAN',emoji:'🍈',hint:'Buah berbulu merah rasanya manis',tier:'hard'},
  {word:'ALPUKAT',emoji:'🥑',hint:'Buah hijau berlemak sehat',tier:'hard'},
  {word:'BELIMBING',emoji:'⭐',hint:'Buah berbentuk seperti bintang',tier:'hard'},
  {word:'MANGGIS',emoji:'🍇',hint:'Buah dengan kulit ungu tebal',tier:'hard'},
  {word:'BANDARA',emoji:'✈️',hint:'Tempat pesawat mendarat dan terbang',tier:'hard'},
  {word:'STADION',emoji:'🏟️',hint:'Tempat pertandingan olahraga besar',tier:'hard'},
  {word:'LAPANGAN',emoji:'🏃',hint:'Tempat bermain dan berolahraga',tier:'hard'},
  {word:'PELABUHAN',emoji:'⚓',hint:'Tempat kapal bersandar',tier:'hard'},
  {word:'PELAJAR',emoji:'🎒',hint:'Orang yang sedang belajar di sekolah',tier:'hard'},
  {word:'KARYAWAN',emoji:'💼',hint:'Orang yang bekerja di perusahaan',tier:'hard'},
  {word:'WARTAWAN',emoji:'📰',hint:'Orang yang menulis berita',tier:'hard'},
  {word:'ILMUWAN',emoji:'🔬',hint:'Orang yang melakukan penelitian',tier:'hard'},
  {word:'PEDAGANG',emoji:'🛍️',hint:'Orang yang berjualan barang',tier:'hard'},
  {word:'BERJALAN',emoji:'🚶',hint:'Bergerak dengan kaki perlahan',tier:'hard'},
  {word:'BERLARI',emoji:'🏃',hint:'Bergerak dengan kaki secepat mungkin',tier:'hard'},
  {word:'BERNYANYI',emoji:'🎤',hint:'Mengeluarkan suara berirama',tier:'hard'},
  {word:'BELAJAR',emoji:'📖',hint:'Menuntut ilmu dan pengetahuan',tier:'hard'},
  {word:'BERMAIN',emoji:'🎮',hint:'Bersenang-senang dengan permainan',tier:'hard'},
  {word:'MELUKIS',emoji:'🎨',hint:'Membuat gambar dengan cat',tier:'hard'},
  {word:'MEMASAK',emoji:'👨‍🍳',hint:'Membuat makanan dengan cara dimasak',tier:'hard'},
  {word:'MENULIS',emoji:'✍️',hint:'Membuat tulisan dengan tangan',tier:'hard'},
  {word:'MEMBACA',emoji:'📚',hint:'Melihat dan memahami tulisan',tier:'hard'},
  {word:'MEMBANTU',emoji:'🤝',hint:'Menolong orang yang membutuhkan',tier:'hard'},
  {word:'KELUARGA',emoji:'👨‍👩‍👧‍👦',hint:'Ayah ibu dan anak-anak bersama',tier:'hard'},
  {word:'KEMERDEKAAN',emoji:'🎆',hint:'Kebebasan suatu bangsa dari penjajahan',tier:'hard'},
  {word:'KEBERANIAN',emoji:'🦁',hint:'Sifat tidak takut menghadapi tantangan',tier:'hard'},
  {word:'KEBAIKAN',emoji:'💝',hint:'Sifat suka menolong dan berbagi',tier:'hard'},
  {word:'KEJUJURAN',emoji:'🤞',hint:'Sifat selalu berkata benar',tier:'hard'},
  {word:'BERSYUKUR',emoji:'🙏',hint:'Merasa terima kasih atas semua nikmat',tier:'hard'},
  {word:'PENGALAMAN',emoji:'🗺️',hint:'Hal-hal yang pernah kita lalui',tier:'hard'},
  {word:'PERSATUAN',emoji:'🤜',hint:'Bersatu padu dalam satu tujuan',tier:'hard'},
  {word:'KEHIDUPAN',emoji:'🌱',hint:'Proses tumbuh dan berkembang makhluk hidup',tier:'hard'},
  {word:'PAHLAWAN',emoji:'🦸',hint:'Orang yang berjasa bagi bangsa',tier:'hard'},
  {word:'ASTRONOT',emoji:'👨‍🚀',hint:'Orang yang pergi ke luar angkasa',tier:'hard'},
  {word:'PELAJARAN',emoji:'📝',hint:'Materi yang dipelajari di sekolah',tier:'hard'},
  {word:'PETUALANG',emoji:'🧭',hint:'Orang yang suka menjelajah tempat baru',tier:'hard'},
]

// Game 9 letter guides
const LETTER_GUIDES = {
  'A':[{x:0.5,y:0.05},{x:0.2,y:0.95},{x:0.35,y:0.55},{x:0.65,y:0.55},{x:0.8,y:0.95}],
  'B':[{x:0.2,y:0.05},{x:0.2,y:0.95},{x:0.2,y:0.05},{x:0.65,y:0.15},{x:0.75,y:0.28},{x:0.65,y:0.48},{x:0.2,y:0.48},{x:0.7,y:0.6},{x:0.78,y:0.75},{x:0.65,y:0.9},{x:0.2,y:0.95}],
  'C':[{x:0.75,y:0.2},{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.2,y:0.8},{x:0.5,y:0.95},{x:0.75,y:0.8}],
  'D':[{x:0.2,y:0.05},{x:0.2,y:0.95},{x:0.2,y:0.05},{x:0.55,y:0.1},{x:0.78,y:0.3},{x:0.82,y:0.5},{x:0.78,y:0.7},{x:0.55,y:0.9},{x:0.2,y:0.95}],
  'E':[{x:0.75,y:0.05},{x:0.2,y:0.05},{x:0.2,y:0.5},{x:0.65,y:0.5},{x:0.2,y:0.5},{x:0.2,y:0.95},{x:0.75,y:0.95}],
  'F':[{x:0.75,y:0.05},{x:0.2,y:0.05},{x:0.2,y:0.5},{x:0.65,y:0.5},{x:0.2,y:0.5},{x:0.2,y:0.95}],
  'G':[{x:0.75,y:0.2},{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.2,y:0.8},{x:0.5,y:0.95},{x:0.8,y:0.8},{x:0.8,y:0.5},{x:0.55,y:0.5}],
  'H':[{x:0.2,y:0.05},{x:0.2,y:0.95},{x:0.2,y:0.5},{x:0.8,y:0.5},{x:0.8,y:0.05},{x:0.8,y:0.95}],
  'I':[{x:0.2,y:0.05},{x:0.8,y:0.05},{x:0.5,y:0.05},{x:0.5,y:0.95},{x:0.2,y:0.95},{x:0.8,y:0.95}],
  'J':[{x:0.2,y:0.05},{x:0.8,y:0.05},{x:0.65,y:0.05},{x:0.65,y:0.75},{x:0.5,y:0.9},{x:0.35,y:0.85},{x:0.25,y:0.75}],
  'K':[{x:0.2,y:0.05},{x:0.2,y:0.95},{x:0.2,y:0.5},{x:0.75,y:0.05},{x:0.2,y:0.5},{x:0.75,y:0.95}],
  'L':[{x:0.2,y:0.05},{x:0.2,y:0.95},{x:0.75,y:0.95}],
  'M':[{x:0.1,y:0.95},{x:0.1,y:0.05},{x:0.5,y:0.5},{x:0.9,y:0.05},{x:0.9,y:0.95}],
  'N':[{x:0.1,y:0.95},{x:0.1,y:0.05},{x:0.9,y:0.95},{x:0.9,y:0.05}],
  'O':[{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.2,y:0.8},{x:0.5,y:0.95},{x:0.8,y:0.8},{x:0.9,y:0.5},{x:0.8,y:0.2},{x:0.5,y:0.05}],
  'P':[{x:0.2,y:0.95},{x:0.2,y:0.05},{x:0.65,y:0.1},{x:0.78,y:0.22},{x:0.78,y:0.4},{x:0.65,y:0.52},{x:0.2,y:0.52}],
  'Q':[{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.2,y:0.8},{x:0.5,y:0.95},{x:0.8,y:0.8},{x:0.9,y:0.5},{x:0.8,y:0.2},{x:0.5,y:0.05},{x:0.6,y:0.7},{x:0.85,y:0.95}],
  'R':[{x:0.2,y:0.95},{x:0.2,y:0.05},{x:0.65,y:0.1},{x:0.78,y:0.22},{x:0.78,y:0.4},{x:0.65,y:0.52},{x:0.2,y:0.52},{x:0.75,y:0.95}],
  'S':[{x:0.75,y:0.15},{x:0.5,y:0.05},{x:0.25,y:0.15},{x:0.2,y:0.35},{x:0.5,y:0.5},{x:0.8,y:0.65},{x:0.75,y:0.85},{x:0.5,y:0.95},{x:0.25,y:0.85}],
  'T':[{x:0.1,y:0.05},{x:0.9,y:0.05},{x:0.5,y:0.05},{x:0.5,y:0.95}],
  'U':[{x:0.1,y:0.05},{x:0.1,y:0.75},{x:0.25,y:0.9},{x:0.5,y:0.95},{x:0.75,y:0.9},{x:0.9,y:0.75},{x:0.9,y:0.05}],
  'V':[{x:0.1,y:0.05},{x:0.5,y:0.95},{x:0.9,y:0.05}],
  'W':[{x:0.05,y:0.05},{x:0.25,y:0.95},{x:0.5,y:0.5},{x:0.75,y:0.95},{x:0.95,y:0.05}],
  'X':[{x:0.1,y:0.05},{x:0.9,y:0.95},{x:0.5,y:0.5},{x:0.1,y:0.95},{x:0.9,y:0.05}],
  'Y':[{x:0.1,y:0.05},{x:0.5,y:0.5},{x:0.9,y:0.05},{x:0.5,y:0.5},{x:0.5,y:0.95}],
  'Z':[{x:0.1,y:0.05},{x:0.9,y:0.05},{x:0.1,y:0.95},{x:0.9,y:0.95}]
}
const LETTER_SEQ_CILIK  = ['A','B','C','D','E','F']
const LETTER_SEQ_TUMBUH = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N']
const LETTER_SEQ_PINTAR = Object.keys(LETTER_GUIDES)

// Game 9 number guides (digit dot paths)
const ANGKA_GUIDES = {
  '0':[{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.2,y:0.8},{x:0.5,y:0.95},{x:0.8,y:0.8},{x:0.9,y:0.5},{x:0.8,y:0.2},{x:0.5,y:0.05}],
  '1':[{x:0.3,y:0.2},{x:0.5,y:0.05},{x:0.5,y:0.95},{x:0.2,y:0.95},{x:0.8,y:0.95}],
  '2':[{x:0.2,y:0.2},{x:0.4,y:0.05},{x:0.7,y:0.1},{x:0.8,y:0.3},{x:0.5,y:0.55},{x:0.2,y:0.75},{x:0.15,y:0.95},{x:0.85,y:0.95}],
  '3':[{x:0.2,y:0.1},{x:0.6,y:0.05},{x:0.85,y:0.25},{x:0.6,y:0.48},{x:0.35,y:0.5},{x:0.65,y:0.52},{x:0.88,y:0.75},{x:0.65,y:0.95},{x:0.2,y:0.9}],
  '4':[{x:0.7,y:0.95},{x:0.7,y:0.05},{x:0.15,y:0.65},{x:0.85,y:0.65}],
  '5':[{x:0.8,y:0.05},{x:0.2,y:0.05},{x:0.2,y:0.5},{x:0.65,y:0.48},{x:0.85,y:0.65},{x:0.75,y:0.9},{x:0.4,y:0.95},{x:0.2,y:0.85}],
  '6':[{x:0.75,y:0.15},{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.1,y:0.5},{x:0.15,y:0.75},{x:0.4,y:0.95},{x:0.7,y:0.9},{x:0.85,y:0.7},{x:0.8,y:0.52},{x:0.55,y:0.48},{x:0.2,y:0.5}],
  '7':[{x:0.15,y:0.05},{x:0.85,y:0.05},{x:0.5,y:0.95}],
  '8':[{x:0.5,y:0.05},{x:0.2,y:0.2},{x:0.2,y:0.45},{x:0.5,y:0.5},{x:0.8,y:0.55},{x:0.8,y:0.8},{x:0.5,y:0.95},{x:0.2,y:0.8},{x:0.2,y:0.55},{x:0.5,y:0.5},{x:0.8,y:0.45},{x:0.8,y:0.2},{x:0.5,y:0.05}],
  '9':[{x:0.8,y:0.5},{x:0.5,y:0.48},{x:0.2,y:0.3},{x:0.25,y:0.1},{x:0.5,y:0.05},{x:0.78,y:0.15},{x:0.88,y:0.35},{x:0.85,y:0.5},{x:0.8,y:0.7},{x:0.6,y:0.9},{x:0.4,y:0.95}]
}
const LETTER_SEQ_ANGKA = ['0','1','2','3','4','5','6','7','8','9']

// ================================================================
// STATE
// ================================================================
const state = {
  mode: 'solo',
  players: [
    {name:'Pemain 1',animal:'🦁',stars:0,ageTier:'tumbuh'},
    {name:'Pemain 2',animal:'🐰',stars:0,ageTier:'tumbuh'}
  ],
  currentPlayer: 0,
  currentGame: null,
  selectedLevel: 'medium',
  selectedLevelNum: 1,
  gameStars: [0,0],
  breatheInterval: null,
  g4Timer: null,
  unlockedAchievements: {},
  paused: false
}

// Age tier helpers
function setAge(playerIdx, tier, btn) {
  state.players[playerIdx].ageTier = tier
  const container = document.getElementById('p' + (playerIdx+1) + '-age')
  container.querySelectorAll('.age-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  playClick()
}
function getAgeLetters(tier) {
  if (tier==='cilik')  return ANIMAL_LETTERS.slice(0,6)
  if (tier==='tumbuh') return ANIMAL_LETTERS.slice(0,14)
  return ANIMAL_LETTERS
}
function getAgeMaxCount(tier) {
  if (tier==='cilik')  return 5
  if (tier==='tumbuh') return 10
  return 15
}
function getAgeWordBank(map, tier) {
  const bank = DRIVE_WORD_BANK[map]
  if (tier==='cilik')  return bank.filter(w=>w.length<=4)
  if (tier==='tumbuh') return bank.filter(w=>w.length<=6)
  return bank
}

// ================================================================
// INIT WORLDS
// ================================================================
function initFloatingStars() {
  const container = document.getElementById('floating-stars')
  if (!container) return
  const icons = ['⭐','🌟','✨','💫','🌈','🎈','🎉','🎊','🌸','🍀']
  for (let i=0;i<18;i++) {
    const star = document.createElement('span')
    star.className = 'fstar'
    star.textContent = icons[Math.floor(Math.random()*icons.length)]
    star.style.cssText = `left:${Math.random()*100}vw;animation-duration:${5+Math.random()*8}s;animation-delay:${Math.random()*8}s;font-size:${14+Math.random()*18}px;`
    container.appendChild(star)
  }
}
function initHeartWorld() {
  const c = document.getElementById('world-hearts'); if(!c)return; c.innerHTML=''
  const hearts=['❤️','💖','💕','💗','🩷','💓']
  function spawnHeart(i) {
    const s=document.createElement('span')
    s.textContent=hearts[Math.floor(Math.random()*hearts.length)]
    s.style.cssText=`left:${5+i*11}%;animation-duration:${6+Math.random()*6}s;animation-delay:${Math.random()*5}s;font-size:${16+Math.random()*16}px;cursor:pointer;pointer-events:auto;`
    s.addEventListener('click', () => {
      if(s.classList.contains('popping')) return
      s.classList.add('popping')
      playCorrect()
      setTimeout(() => {
        s.remove()
        setTimeout(() => { if(c.isConnected) spawnHeart(i) }, 1500)
      }, 350)
    })
    c.appendChild(s)
  }
  for(let i=0;i<8;i++) spawnHeart(i)
}
function initCloudWorld() {
  const c = document.getElementById('world-clouds'); if(!c)return; c.innerHTML=''
  const clouds=[{w:120,h:40,t:'18%',dur:'18s',delay:'0s'},{w:90,h:30,t:'35%',dur:'24s',delay:'-8s'},{w:70,h:25,t:'55%',dur:'20s',delay:'-14s'}]
  clouds.forEach(cl=>{const d=document.createElement('div');d.className='cloud';d.style.cssText=`width:${cl.w}px;height:${cl.h}px;top:${cl.t};animation-duration:${cl.dur};animation-delay:${cl.delay};`;d.style.left='-130px';c.appendChild(d)})
}
function initJungleWorld() {
  const c = document.getElementById('world-jungle'); if(!c)return; c.innerHTML=''
  const letters='ABCDEFGHIJKLMNOP'.split('')
  for(let i=0;i<5;i++){const s=document.createElement('span');s.className='jungle-letter';s.textContent=letters[Math.floor(Math.random()*letters.length)];s.style.cssText=`left:${10+i*18}%;top:${10+Math.random()*50}%;animation-duration:${4+Math.random()*4}s;animation-delay:${Math.random()*3}s;`;c.appendChild(s)}
  for(let i=0;i<6;i++){const f=document.createElement('div');f.className='firefly';f.style.cssText=`left:${Math.random()*90}%;top:${Math.random()*80}%;animation-duration:${1.5+Math.random()*2}s;animation-delay:${Math.random()*2}s;`;c.appendChild(f)}
}
function initSavannaWorld() {
  const c=document.querySelector('.world-savanna'); if(!c)return
  c.querySelectorAll('.shimmer-dot').forEach(e=>e.remove())
  for(let i=0;i<8;i++){const d=document.createElement('div');d.className='shimmer-dot';d.style.cssText=`left:${Math.random()*90}%;top:${30+Math.random()*40}%;animation-duration:${1+Math.random()*2}s;animation-delay:${Math.random()*2}s;`;c.appendChild(d)}
}
function initDreamWorld() {
  const c=document.getElementById('world-dream'); if(!c)return; c.innerHTML=''
  for(let i=0;i<12;i++){const s=document.createElement('span');s.className='star-twinkle';s.textContent=['✨','⭐','🌟','💫'][i%4];s.style.cssText=`left:${Math.random()*90}%;top:${Math.random()*80}%;animation-duration:${1.5+Math.random()*2.5}s;animation-delay:${Math.random()*3}s;`;c.appendChild(s)}
  const colors=['rgba(167,139,250,0.25)','rgba(56,189,248,0.2)','rgba(253,164,175,0.2)']
  for(let i=0;i<3;i++){const o=document.createElement('div');o.className='glow-orb';const sz=60+Math.random()*60;o.style.cssText=`width:${sz}px;height:${sz}px;background:${colors[i]};left:${10+i*30}%;top:${20+i*20}%;animation-duration:${4+Math.random()*3}s;animation-delay:${Math.random()*2}s;`;c.appendChild(o)}
}

// ================================================================
// SCREEN NAV
// ================================================================
// Music screens — play on landing, menu, and level select
const MUSIC_SCREENS = new Set(['screen-welcome','screen-menu','screen-level','screen-mode','screen-names'])

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'))
  const el = document.getElementById(id)
  if (!el) return // standalone game screens don't have a div
  el.classList.add('active')
  // Always ensure overlays are hidden on screen change
  const po=document.getElementById('pause-overlay')
  const so=document.getElementById('settings-overlay')
  if(po) po.style.display='none'
  if(so) so.style.display='none'
  window.scrollTo(0,0)
  const screenEl = document.getElementById(id)
  if (screenEl) screenEl.scrollTop = 0
  // Welcome screen effects
  if (id === 'screen-welcome') {
    initWelcomeParticles()
    refreshWelcomeBadges()
  }
  // Backsound: play on menu/landing screens, pause during gameplay
  bgMusicToggle(MUSIC_SCREENS.has(id))
}

// ================================================================
// LEVEL PROGRESSION SYSTEM — 20 levels per game
// ================================================================

// Game metadata with educational descriptions
const GAME_INFO = {
  1:  { desc:'Kenali 10 emosi dasar: senang, sedih, marah, dan lebih banyak lagi!', grad:'rgba(244,63,94,0.35)', glow:'rgba(244,63,94,0.5)' },
  2:  { desc:'Latih pernapasan dalam dengan panduan animasi pelangi yang menenangkan.', grad:'rgba(139,92,246,0.35)', glow:'rgba(139,92,246,0.5)' },
  3:  { desc:'Pelajari huruf A-Z dengan cara yang seru bersama hewan-hewan hutan!', grad:'rgba(20,184,166,0.35)', glow:'rgba(20,184,166,0.5)' },
  4:  { desc:'Belajar berhitung 1-20 dengan memilih jumlah binatang yang tepat!', grad:'rgba(245,158,11,0.35)', glow:'rgba(245,158,11,0.5)' },
  5:  { desc:'Cocokkan kartu emosi dan latih ingatan serta konsentrasimu!', grad:'rgba(167,139,250,0.35)', glow:'rgba(167,139,250,0.5)' },
  6:  { desc:'Balap mobil sambil kumpulkan huruf untuk menyusun kata di jalan!', grad:'rgba(14,165,233,0.35)', glow:'rgba(14,165,233,0.5)' },
  7:  { desc:'Lihat gambar dan pilih kata yang tepat — atau sebaliknya!', grad:'rgba(45,212,191,0.35)', glow:'rgba(45,212,191,0.5)' },
  8:  { desc:'Susun huruf-huruf acak menjadi kata yang benar dari gambar!', grad:'rgba(244,63,94,0.35)', glow:'rgba(244,63,94,0.5)' },
  9:  { desc:'Ikuti titik panduan untuk melatih menulis huruf dengan benar!', grad:'rgba(132,204,22,0.35)', glow:'rgba(132,204,22,0.5)' },
  10: { desc:'Kalahkan Pokemon musuh dengan menjawab soal matematika!', grad:'rgba(255,203,5,0.35)', glow:'rgba(255,203,5,0.5)' },
  11: { desc:'Uji pengetahuan sains — tumbuhan, hewan, dan alam semesta!', grad:'rgba(56,189,248,0.35)', glow:'rgba(56,189,248,0.5)' },
  12: { desc:'Tebak nama hewan dari siluet bayangannya yang tersembunyi!', grad:'rgba(139,92,246,0.35)', glow:'rgba(139,92,246,0.5)' },
  13: { desc:'Kalahkan wild Pokemon dengan menjawab soal matematika — dan evolusi!', grad:'rgba(249,115,22,0.35)', glow:'rgba(249,115,22,0.5)' },
  19: { desc:'Terbangkan Pidgeot melewati rintangan dan jawab soal untuk menang!', grad:'rgba(139,92,246,0.35)', glow:'rgba(139,92,246,0.5)' },
  20: { desc:'Main voli pantai dengan bebek lucu! Kalahkan lawan dan jawab soal!', grad:'rgba(56,189,248,0.35)', glow:'rgba(56,189,248,0.5)' },
  21: { desc:'Petualangan Pikachu ala Mario! Lompat, kumpulkan koin, kalahkan musuh, jawab matematika!', grad:'rgba(232,38,42,0.35)', glow:'rgba(251,191,36,0.55)' },
  22: { desc:'Tangkap permen jatuh dan jawab soal untuk skor tinggi!', grad:'rgba(139,92,246,0.35)', glow:'rgba(139,92,246,0.5)' }
}

// Progress storage
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(pkey('progress')) || '{}') }
  catch(e) { return {} }
}
function saveProgress(prog) {
  try { localStorage.setItem(pkey('progress'), JSON.stringify(prog)) }
  catch(e) {}
}
function getLevelProgress(gameNum) {
  const prog = loadProgress()
  return prog['g'+gameNum] || { completed: [], stars: {} }
}
function setLevelComplete(gameNum, levelNum, stars) {
  const prog = loadProgress()
  const key = 'g'+gameNum
  if (!prog[key]) prog[key] = { completed: [], stars: {} }
  const gp = prog[key]
  if (!gp.completed.includes(levelNum)) gp.completed.push(levelNum)
  if ((gp.stars[levelNum]||0) < stars) gp.stars[levelNum] = stars
  saveProgress(prog)
}

// ================================================================
// GAME 13c — GYM HURUF & SUARA (Phonics Gym)
// ================================================================
const G13C_ITEMS = {
  A: [{e:'🍎',n:'Apel'},{e:'🦢',n:'Angsa'},{e:'🔥',n:'Api'},{e:'🐜',n:'Semut',skip:true},{e:'🌊',n:'Awan'},{e:'🦅',n:'Ayam'/*close*/}],
  B: [{e:'⚽',n:'Bola'},{e:'🎈',n:'Balon'},{e:'📚',n:'Buku'},{e:'🚌',n:'Bus'},{e:'🌸',n:'Bunga'},{e:'🦁',n:'Beruang'/*close*/}],
  C: [{e:'💍',n:'Cincin'},{e:'🦑',n:'Cumi'},{e:'🍫',n:'Coklat'},{e:'🦋',n:'Capung'/*close*/}],
  D: [{e:'🍃',n:'Daun'},{e:'🐑',n:'Domba'},{e:'🌙',n:'Dadu'/*close*/},{e:'🎃',n:'Duren'/*close*/}],
  E: [{e:'🦅',n:'Elang'},{e:'🧊',n:'Es'},{e:'🪣',n:'Ember'}],
  F: [{e:'📷',n:'Foto'},{e:'🌸',n:'Flamingo'/*close*/},{e:'🎠',n:'Ferris'/*close*/}],
  G: [{e:'🐘',n:'Gajah'},{e:'🎸',n:'Gitar'},{e:'⛰️',n:'Gunung'},{e:'🕶️',n:'Gelas'/*close*/},{e:'🌀',n:'Gasing'}],
  H: [{e:'🐯',n:'Harimau'},{e:'🌧️',n:'Hujan'},{e:'🌳',n:'Hutan'/*close*/},{e:'🦋',n:'Hijau'/*close*/}],
  I: [{e:'🐟',n:'Ikan'},{e:'👩',n:'Ibu'},{e:'🦟',n:'Iguana'/*close*/},{e:'🔴',n:'Ijo'/*close*/}],
  J: [{e:'🌽',n:'Jagung'},{e:'⏰',n:'Jam'},{e:'🦒',n:'Jerapah'},{e:'🍄',n:'Jamur'}],
  K: [{e:'🐴',n:'Kuda'},{e:'🐈',n:'Kucing'},{e:'🎂',n:'Kue'},{e:'🐇',n:'Kelinci'},{e:'🦛',n:'Kuda Nil'}],
  L: [{e:'🐬',n:'Lumba'},{e:'🐝',n:'Lebah'},{e:'🎃',n:'Labu'},{e:'🪲',n:'Lalat'},{e:'🌺',n:'Lotus'/*close*/}],
  M: [{e:'☀️',n:'Matahari'},{e:'🥭',n:'Mangga'},{e:'🐒',n:'Monyet'},{e:'🌊',n:'Mawar'/*close*/},{e:'🍯',n:'Madu'}],
  N: [{e:'🍚',n:'Nasi'},{e:'🍍',n:'Nanas'},{e:'🦟',n:'Nyamuk'},{e:'🌙',n:'Ninja'/*close*/}],
  O: [{e:'🦧',n:'Orang Utan'},{e:'🌊',n:'Ombak'},{e:'💊',n:'Obat'},{e:'🦦',n:'Otter'}],
  P: [{e:'🍌',n:'Pisang'},{e:'🌳',n:'Pohon'},{e:'🐼',n:'Panda'},{e:'🎉',n:'Pesta'},{e:'🌊',n:'Pantai'/*close*/}],
  R: [{e:'🦌',n:'Rusa'},{e:'🚀',n:'Roket'},{e:'🦊',n:'Rubah'},{e:'🍇',n:'Rambutan'/*close*/}],
  S: [{e:'🐜',n:'Semut'},{e:'🚲',n:'Sepeda'},{e:'🐄',n:'Sapi'},{e:'⭐',n:'Singa'/*close*/},{e:'🐍',n:'Ular',skip:true}],
  T: [{e:'🎩',n:'Topi'},{e:'🐭',n:'Tikus'},{e:'🥚',n:'Telur'},{e:'🐯',n:'Taring'/*close*/},{e:'🌺',n:'Teratai'}],
  U: [{e:'🪼',n:'Ubur'},{e:'🦐',n:'Udang'},{e:'🛸',n:'UFO'},{e:'🐛',n:'Ulat'}],
  W: [{e:'🥕',n:'Wortel'},{e:'🎨',n:'Warna'},{e:'🦓',n:'Waran'/*close*/}],
  Z: [{e:'🦓',n:'Zebra'},{e:'🫒',n:'Zaitun'}],
}

// Distractors pool (not starting with the target letter)
const G13C_DISTRACTORS = {
  A:['Bola','Kuda','Ikan','Gajah','Pohon'],
  B:['Apel','Gajah','Kucing','Matahari','Nanas'],
  C:['Apel','Bola','Domba','Ikan','Pohon'],
  D:['Apel','Bola','Gajah','Ikan','Pohon'],
  E:['Apel','Bola','Gajah','Kuda','Mangga'],
  F:['Apel','Gajah','Kucing','Lumba','Pisang'],
  G:['Apel','Bola','Ikan','Kucing','Pohon'],
  H:['Apel','Bola','Gajah','Ikan','Kuda'],
  I:['Apel','Bola','Gajah','Kuda','Pohon'],
  J:['Apel','Bola','Gajah','Ikan','Kuda'],
  K:['Apel','Bola','Gajah','Ikan','Pohon'],
  L:['Apel','Bola','Gajah','Ikan','Pohon'],
  M:['Apel','Bola','Gajah','Ikan','Pohon'],
  N:['Apel','Bola','Gajah','Ikan','Kuda'],
  O:['Apel','Bola','Gajah','Ikan','Kuda'],
  P:['Apel','Gajah','Ikan','Kuda','Monyet'],
  R:['Apel','Bola','Gajah','Ikan','Pohon'],
  S:['Apel','Bola','Gajah','Kuda','Pohon'],
  T:['Apel','Bola','Gajah','Kuda','Pohon'],
  U:['Apel','Bola','Gajah','Ikan','Pohon'],
  W:['Apel','Bola','Gajah','Ikan','Pohon'],
  Z:['Apel','Bola','Gajah','Kuda','Pohon'],
}

const G13C_DISTRACTOR_EMOJIS = {
  'Apel':'🍎','Bola':'⚽','Gajah':'🐘','Ikan':'🐟','Pohon':'🌳',
  'Kuda':'🐴','Kucing':'🐈','Matahari':'☀️','Nanas':'🍍','Monyet':'🐒',
  'Mangga':'🥭','Lumba':'🐬','Pisang':'🍌',
}

const G13C_GYM_POKEMON = {
  A:'aipom',B:'bulbasaur',C:'caterpie',D:'dewgong',E:'eevee',
  F:'fennekin',G:'gengar',H:'haunter',I:'ivysaur',J:'jigglypuff',
  K:'kadabra',L:'lapras',M:'meowth',N:'ninetales',O:'onix',
  P:'pikachu',R:'raichu',S:'snorlax',T:'togetic',U:'umbreon',
  W:'wigglytuff',Z:'zubat',
}

const G13C_BG_POOL = [
  'assets/background/gym/g13c-bg-gym-m.webp',
  'assets/background/gym/g13c-bg-forest-m.webp',
  'assets/background/gym/g13c-bg-volcano-m.webp',
  'assets/background/gym/g13c-bg-water-m.webp',
  'assets/background/gym/g13c-bg-gym2-m.webp',
  'assets/background/gym/g13c-bg-water2-m.webp',
  'assets/background/gym/g13c-bg-water3-m.webp',
]

const G13C_LETTERS_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','R','S','T','U','W','Z']

let g13cState = { letter:'', round:0, total:5, correct:0, badges:{} }
try { const s=localStorage.getItem('g13c_badges'); if(s) g13cState.badges=JSON.parse(s) } catch(_){}

function openGymGame() {
  playClick()
  window.location.href = 'games/g13c-pixi.html?v=20260426i'
}

function g13cBuildLetterSelect() {
  const grid = document.getElementById('g13c-letter-grid')
  if (!grid) return
  grid.innerHTML = ''
  document.getElementById('g13c-letter-select').style.display = 'flex'
  document.getElementById('g13c-game-area').style.display = 'none'
  hideGameResult()
  const totalBadges = Object.values(g13cState.badges).filter(Boolean).length
  document.getElementById('g13c-badge-count').textContent = `🏅 ${totalBadges}`
  G13C_LETTERS_ORDER.forEach(l => {
    if (!G13C_ITEMS[l]) return
    const btn = document.createElement('button')
    btn.className = 'g13c-letter-btn' + (g13cState.badges[l] ? ' has-badge' : '')
    btn.innerHTML = `${l}<span class="lbadge">${g13cState.badges[l] === 'gold' ? '🥇' : g13cState.badges[l] === 'silver' ? '🥈' : g13cState.badges[l] === 'bronze' ? '🥉' : ''}</span>`
    btn.onclick = () => g13cStartGym(l)
    grid.appendChild(btn)
  })
}

function g13cStartGym(letter) {
  playClick()
  g13cState.letter = letter
  g13cState.round = 0
  g13cState.correct = 0
  const bg = G13C_BG_POOL[Math.floor(Math.random() * G13C_BG_POOL.length)]
  document.getElementById('g13c-gym-bg').style.backgroundImage = `url('${bg}')`
  document.getElementById('g13c-letter-select').style.display = 'none'
  hideGameResult()
  const ga = document.getElementById('g13c-game-area')
  ga.style.display = 'flex'
  const slug = G13C_GYM_POKEMON[letter] || 'pikachu'
  const pImg = document.getElementById('g13c-pokemon-img')
  // Hotfix #104 (2026-04-28): use shared cascade — was duplicate-URL pattern.
  if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
    attachSpriteCascade(pImg, buildPokeSources(slug, null), '🎮')
  } else {
    pImg.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(slug)) || `https://img.pokemondb.net/sprites/home/normal/${slug}.png`
  }
  pImg.style.display = 'block'
  g13cShowRound()
}

function g13cShowRound() {
  const s = g13cState
  document.getElementById('g13c-target-letter').textContent = s.letter
  // Progress dots
  const dots = document.getElementById('g13c-progress-dots')
  dots.innerHTML = ''
  for (let i = 0; i < s.total; i++) {
    const d = document.createElement('div')
    d.style.cssText = `width:10px;height:10px;border-radius:50%;border:2px solid rgba(255,255,255,0.5);background:${i < s.correct ? '#22c55e' : i === s.round ? '#FCD34D' : 'transparent'}`
    dots.appendChild(d)
  }
  // Pick correct item
  const pool = (G13C_ITEMS[s.letter] || []).filter(it => !it.skip)
  if (!pool.length) { g13cShowResult(); return }
  const correct = pool[Math.floor(Math.random() * pool.length)]
  // Pick 2 distractors
  const distNames = G13C_DISTRACTORS[s.letter] || ['Bola','Gajah','Pohon']
  const shuffledDist = distNames.sort(() => Math.random() - 0.5).slice(0, 2)
  const choices = [
    { ...correct, isCorrect: true },
    ...shuffledDist.map(n => ({ e: G13C_DISTRACTOR_EMOJIS[n] || '❓', n, isCorrect: false }))
  ].sort(() => Math.random() - 0.5)

  const grid = document.getElementById('g13c-choices')
  grid.innerHTML = ''
  document.getElementById('g13c-feedback').textContent = ''
  choices.forEach(ch => {
    const btn = document.createElement('button')
    btn.className = 'g13c-choice-btn'
    btn.innerHTML = `<span style="font-size:36px">${ch.e}</span><span style="font-size:13px;font-weight:900">${ch.n}</span>`
    btn.onclick = () => g13cAnswer(ch.isCorrect, btn, choices, correct)
    grid.appendChild(btn)
  })
}

function g13cAnswer(isCorrect, btn, choices, correct) {
  const s = g13cState
  // Disable all buttons
  document.querySelectorAll('.g13c-choice-btn').forEach(b => b.onclick = null)
  const fb = document.getElementById('g13c-feedback')
  if (isCorrect) {
    btn.classList.add('correct')
    spawnCorrectCardJuice(btn)
    quizStreakHit(btn)
    s.correct++
    playCorrect()
    spawnSparkles(btn)
    fb.style.color = '#22c55e'
    fb.textContent = '✅ Benar! ' + correct.n + ' mulai dengan ' + s.letter
  } else {
    btn.classList.add('wrong')
    spawnWrongShake(btn)
    quizStreakReset()
    // Reveal correct
    document.querySelectorAll('.g13c-choice-btn').forEach(b => {
      const name = b.querySelector('span:last-child')?.textContent
      if (name === correct.n) { b.classList.add('correct'); spawnCorrectCardJuice(b, { burst:false }) }
    })
    playWrong()
    fb.style.color = '#f43f5e'
    fb.textContent = `❌ Yang mulai ${s.letter} adalah ${correct.n} ${correct.e}`
  }
  s.round++
  setTimeout(() => {
    if (s.round >= s.total) g13cShowResult()
    else g13cShowRound()
  }, 1000)
}

function g13cShowResult() {
  const s = g13cState
  const pct = s.correct / s.total
  const badge = pct >= 1 ? 'gold' : pct >= 0.8 ? 'silver' : pct >= 0.6 ? 'bronze' : null
  if (badge) {
    const prev = s.badges[s.letter]
    const rank = { bronze:1, silver:2, gold:3 }
    if (!prev || rank[badge] > rank[prev]) {
      s.badges[s.letter] = badge
      try { localStorage.setItem('g13c_badges', JSON.stringify(s.badges)) } catch(_){}
    }
    setLevelComplete('13c', 1, badge==='gold'?3:badge==='silver'?2:1)
    saveStars()
  }
  const emoji = pct >= 1 ? '🏆' : pct >= 0.6 ? '🏅' : '💪'
  const title = pct >= 1 ? 'Sempurna!' : pct >= 0.6 ? 'Gym Selesai!' : 'Coba Lagi!'
  const badgeDisplay = badge === 'gold' ? '🥇🥇🥇' : badge === 'silver' ? '🥈🥈' : badge === 'bronze' ? '🥉' : '😅'
  const stars = badge === 'gold' ? 5 : badge === 'silver' ? 3 : badge === 'bronze' ? 2 : 1
  showGameResult({
    emoji, title, stars,
    msg: `${badgeDisplay}\n${s.correct}/${s.total} benar — Huruf ${s.letter} ${badge ? 'badge ' + badge + '!' : '— latih lagi!'}`,
    buttons: [
      {label:'Gym Lain 🏅', action:()=>g13cNextLetter()},
      {label:'Kembali ⌂', action:()=>exitGame()}
    ]
  })
}

function g13cNextLetter() {
  hideGameResult()
  g13cBuildLetterSelect()
}

function openLevelSelect(gameNum) {
  state.currentGame = gameNum
  const meta = GAME_META[gameNum]
  const info = GAME_INFO[gameNum] || {}
  const gp = getLevelProgress(gameNum)

  // Banner — set CSS vars for theme coloring
  const banner = document.getElementById('level-game-banner')
  const glow = info.glow || 'rgba(139,92,246,0.5)'
  const glowAlpha = (a) => glow.replace(/[\d.]+\)$/, a+')')
  banner.style.setProperty('--banner-top', glow)
  banner.style.setProperty('--banner-base', info.grad ? `linear-gradient(180deg,${info.grad},#0a0820)` : 'linear-gradient(180deg,#1a0540,#0a0a25)')
  banner.style.setProperty('--icon-glow', glow)
  banner.style.setProperty('--icon-bg', glowAlpha('0.14'))
  banner.style.setProperty('--icon-border', glowAlpha('0.5'))
  // Banner image — use banner-gameN.webp as background if available
  const bannerImg = `assets/banner-game${gameNum}.webp`
  banner.style.backgroundImage = `url('${bannerImg}'), var(--banner-base, linear-gradient(180deg,#1a0540,#0a0a25))`
  banner.style.backgroundSize = 'cover, 100% 100%'
  banner.style.backgroundPosition = 'center, center'

  // Icon
  const iconEl = document.getElementById('level-game-icon')
  if (gameNum === 10) {
    // Task #96: local-first per L16 (was remote-primary)
    const _pikaSrc = (typeof pokeSpriteAlt2 === 'function') ? pokeSpriteAlt2('pikachu') : 'https://img.pokemondb.net/sprites/home/normal/pikachu.png'
    iconEl.innerHTML = `<img src="${_pikaSrc}" style="width:60px;height:60px;image-rendering:auto;display:block;" onerror="this.src='https://img.pokemondb.net/sprites/home/normal/pikachu.png';this.onerror=function(){this.outerHTML='⚡'}">`
  } else if (meta.iconImg) {
    iconEl.innerHTML = `<img src="${meta.iconImg}" style="width:64px;height:70px;display:block;" alt="${meta.icon}">`
  } else {
    iconEl.textContent = meta.icon
  }

  document.getElementById('level-game-name').textContent = meta.name
  document.getElementById('level-game-desc').textContent = info.desc || ''

  // Floating particles
  const ptEl = document.getElementById('lvl-particles')
  if (ptEl) {
    ptEl.innerHTML = ''
    const PEMOJIS = {
      1:['😊','😢','😡','😱','🥰'],2:['🌬️','🌈','✨','💨'],
      3:['📝','🌿','✏️','⭐'],4:['🔢','🐘','🦁','🐅'],
      5:['🃏','🎴','⭐','✨'],6:['🚗','💨','🏎️','🌆'],
      7:['🖼️','🎨','👁️','🌟'],8:['💬','📖','✨','🔤'],
      9:['✍️','✏️','📝','⭐'],10:['⚡','🔥','💧','🍃'],
      11:['🔬','🌿','⭐','🪐'],12:['👁️','🌑','🌟','❓']
    }
    const emjs = PEMOJIS[gameNum] || ['⭐','✨','💫']
    for (let i = 0; i < 7; i++) {
      const p = document.createElement('span')
      p.className = 'lvl-p'
      p.textContent = emjs[i % emjs.length]
      p.style.setProperty('--px', (8+Math.random()*84)+'%')
      p.style.setProperty('--py', (20+Math.random()*60)+'%')
      p.style.setProperty('--psz', (12+Math.random()*14)+'px')
      p.style.setProperty('--pdur', (2.8+Math.random()*3)+'s')
      p.style.setProperty('--pdel', (Math.random()*2.5)+'s')
      p.style.setProperty('--pglow', glow)
      ptEl.appendChild(p)
    }
  }

  // Tier card theme color
  document.querySelectorAll('.lvl-tier-hdr').forEach(hdr => {
    hdr.style.background = glowAlpha('0.18')
  })
  document.querySelectorAll('.lvl-tier-body').forEach(body => {
    body.style.setProperty('--tier-line', glowAlpha('0.25'))
  })

  // Progress bar
  const completed = gp.completed.length
  const totalStars = Object.values(gp.stars||{}).reduce((a,b)=>a+b,0)
  const totalLevels = (state.currentGame === 13 || state.currentGame === 16) ? 40 : (state.currentGame === 19 || state.currentGame === 20 || state.currentGame === 22) ? 30 : 20
  document.getElementById('level-prog-txt').textContent = `${completed} / ${totalLevels} level selesai`
  document.getElementById('level-prog-fill').style.width = (completed/totalLevels*100) + '%'
  document.getElementById('level-total-stars').textContent = '⭐ ' + totalStars

  // Per-tier dot colors + star count
  const numTiers = (state.currentGame === 13 || state.currentGame === 16) ? 8 : (state.currentGame === 19 || state.currentGame === 20) ? 6 : 4
  // Show/hide extended tiers
  for (let t = 5; t <= 8; t++) {
    const tc2 = document.getElementById('level-tier-'+t)
    if (tc2) tc2.style.display = (state.currentGame === 13 || state.currentGame === 16 || state.currentGame === 19 || state.currentGame === 20) ? '' : 'none'
  }
  for (let tier = 1; tier <= numTiers; tier++) {
    const dotsEl = document.getElementById('level-dots-'+tier)
    if (!dotsEl) continue
    dotsEl.innerHTML = ''
    let tierStars = 0
    for (let i = 1; i <= 5; i++) {
      const lvNum = (tier-1)*5 + i
      const isCompleted = gp.completed.includes(lvNum)
      const isUnlocked = lvNum === 1 || gp.completed.includes(lvNum-1)
      const starsGot = Math.max(0, Math.min(5, gp.stars[lvNum] || 0))
      if (isCompleted) tierStars += starsGot
      const cls = 'lvl-bubble' + (isCompleted?' completed':isUnlocked?' unlocked':' locked')
      // Hotfix 2026-04-28: render up to 5 stars (was hard-coded 3) so saved
      // raw GameScoring.calc() values render faithfully.
      const starsStr = isCompleted ? '<span class="lvl-star-filled">'+'★'.repeat(starsGot)+'</span><span class="lvl-star-empty">'+'☆'.repeat(Math.max(0,5-starsGot))+'</span>' : ''
      const dot = document.createElement('div')
      dot.className = cls
      dot.style.setProperty('--bdelay', (((lvNum-1)%5)*0.06)+'s')
      dot.style.setProperty('--bl', glowAlpha('0.9'))
      dot.style.setProperty('--bd', glowAlpha('0.98'))
      dot.style.setProperty('--bb', glowAlpha('0.65'))
      dot.style.setProperty('--bs', glow)
      dot.innerHTML = isUnlocked||isCompleted
        ? `<span class="lvl-num">${lvNum}</span><div class="lvl-stars-row">${starsStr}</div>`
        : `<span class="lvl-lock-icon">🔒</span>`
      if (!dot.classList.contains('locked')) {
        dot.onclick = () => { playClick(); startGameWithLevel(lvNum) }
      }
      dotsEl.appendChild(dot)
    }
    const tsEl = document.getElementById('tier-stars-'+tier)
    if (tsEl) tsEl.textContent = tierStars > 0 ? '⭐'+tierStars : ''
  }

  // Show elements
  document.getElementById('level-progress-row').style.display = 'flex'
  document.getElementById('level-tiers').style.display = 'flex'

  showScreen('screen-level')
}

function startGameWithLevel(levelNum) {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  // Map level 1-20 to difficulty string for backward compat
  state.selectedLevelNum = levelNum
  state.selectedLevel = levelNum <= 13 ? 'easy' : levelNum <= 26 ? 'medium' : 'hard'
  state.gameStars = [0,0]
  state.maxPossibleStars = null
  state.currentPlayer = 0
  // Update level indicator on all game headers
  const lvLabel = `Lv.${levelNum}`
  document.querySelectorAll('.gh-level').forEach(el => { el.textContent = lvLabel })
  if(state.selectedLevel==='hard') checkAchievement('hard_mode')
  // Standalone games navigate to separate HTML — skip showScreen (no screen-gameN div exists)
  const standaloneGames = [6, 14, 15, 16, 19, 20, 21, 22]
  if (!standaloneGames.includes(state.currentGame)) {
    showScreen('screen-game' + state.currentGame)
  }
  const inits = [null,initGame1,initGame2,initGame3,initGame4,initGame5,initGame6,initGame7,initGame8,initGame9,initGame10,initGame11,initGame12,initGame13,initGame14,initGame15,initGame16,initGame17,initGame18,initGame19,initGame20,initGame21,initGame22]
  inits[state.currentGame]()
}

// Legacy compat — old 3-level buttons still work via level mapping
function startGameWithDiff(diff) {
  const lvlMap = { easy: 3, medium: 10, hard: 17 }
  startGameWithLevel(lvlMap[diff] || 1)
}

// ================================================================
// PLAYER SAVE SYSTEM (7 slots)
// ================================================================
const PLAYER_SLOTS_KEY = 'dunia-players'
function getPlayerSlots() {
  try { return JSON.parse(localStorage.getItem(PLAYER_SLOTS_KEY)) || Array(7).fill(null) }
  catch(e) { return Array(7).fill(null) }
}
function setPlayerSlots(slots) { try { localStorage.setItem(PLAYER_SLOTS_KEY, JSON.stringify(slots)) } catch(e){} }
// Which slot is active per player-index (0=P1, 1=P2).
// Hotfix 2026-04-28: persisted to localStorage so navigating to a standalone
// game and back preserves the avatar-keyed save context. Without this,
// `_avatarSlug()` always reads slot 0's animal after page reload.
const ACTIVE_SLOT_KEY = 'dunia-active-slot'
function _loadActiveSlot() {
  try {
    const raw = localStorage.getItem(ACTIVE_SLOT_KEY)
    if (!raw) return [0, 1]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length < 2) return [0, 1]
    return [
      Math.max(0, Math.min(6, parseInt(parsed[0]) || 0)),
      Math.max(0, Math.min(6, parseInt(parsed[1]) || 1)),
    ]
  } catch (_) { return [0, 1] }
}
function _saveActiveSlot() {
  try { localStorage.setItem(ACTIVE_SLOT_KEY, JSON.stringify(window._pSlot)) } catch (_) {}
}
if(!window._pSlot) window._pSlot = _loadActiveSlot()
function renderPlayerSlotRow(playerIdx) {
  const slots = getPlayerSlots()
  const rowId = 'pslot-row-'+playerIdx
  const row = document.getElementById(rowId)
  if(!row) return
  row.innerHTML = ''
  for(let i=0;i<7;i++){
    const s = slots[i]
    const chip = document.createElement('button')
    chip.className = 'pslot-chip' + (!s?' empty':'') + (window._pSlot[playerIdx]===i?' selected':'')
    chip.innerHTML = `<span class="psc-av">${s?s.animal:'➕'}</span>
      <span class="psc-name">${s?s.name.slice(0,5):'Slot '+(i+1)}</span>
      <span class="psc-stars">${s?'⭐'+s.stars:''}</span>`
    chip.onclick = () => { window._pSlot[playerIdx]=i; _saveActiveSlot(); loadSlotIntoForm(playerIdx,i); renderPlayerSlotRow(playerIdx); playClick() }
    row.appendChild(chip)
  }
}
function loadSlotIntoForm(playerIdx, slotIdx) {
  const slots = getPlayerSlots()
  const s = slots[slotIdx]
  const nameInputId = playerIdx===0?'p1-name':'p2-name'
  const animalsId   = playerIdx===0?'p1-animals':'p2-animals'
  const ageId       = playerIdx===0?'p1-age':'p2-age'
  if(s) {
    document.getElementById(nameInputId).value = s.name||''
    state.players[playerIdx].animal = s.animal||'🦁'
    state.players[playerIdx].ageTier = s.ageTier||'tumbuh'
    state.players[playerIdx].stars = s.stars||0
    buildAnimalPicker(animalsId, playerIdx)
    // Update age buttons
    document.getElementById(ageId).querySelectorAll('.age-btn').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.age===s.ageTier)
    })
  } else {
    document.getElementById(nameInputId).value = ''
    state.players[playerIdx].animal = '🦁'
    state.players[playerIdx].ageTier = 'tumbuh'
    state.players[playerIdx].stars = 0
    buildAnimalPicker(animalsId, playerIdx)
  }
}
function savePlayerToSlot(playerIdx) {
  const slotIdx = window._pSlot[playerIdx]
  const slots = getPlayerSlots()
  const nameInputId = playerIdx===0?'p1-name':'p2-name'
  const name = document.getElementById(nameInputId).value.trim()||('Pemain '+(slotIdx+1))
  slots[slotIdx] = {
    name, animal: state.players[playerIdx].animal,
    ageTier: state.players[playerIdx].ageTier,
    stars: state.players[playerIdx].stars||0,
    progress: slots[slotIdx]?.progress||{}
  }
  setPlayerSlots(slots)
}
function saveStarsToSlot() {
  try {
    const slots = getPlayerSlots()
    for(let pi=0;pi<(state.mode==='duo'?2:1);pi++){
      const si = window._pSlot[pi]
      if(slots[si]) slots[si].stars = state.players[pi].stars
    }
    setPlayerSlots(slots)
  } catch(e){}
}

// ================================================================
// MODE & NAMES
// ================================================================
function selectMode(mode) {
  state.mode = mode
  renderPlayerSlotRow(0)
  loadSlotIntoForm(0, window._pSlot[0])
  const p2 = document.getElementById('p2-section')
  if(mode==='duo'){
    p2.style.display='flex'; renderPlayerSlotRow(1); loadSlotIntoForm(1, window._pSlot[1])
  } else {
    p2.style.display='none'
  }
  showScreen('screen-names')
}
function buildAnimalPicker(containerId, playerIdx) {
  const container = document.getElementById(containerId); container.innerHTML=''
  ANIMALS_PICKER.forEach(a=>{
    const btn=document.createElement('button')
    btn.className='animal-btn'+(state.players[playerIdx].animal===a?' selected':'')
    btn.textContent=a
    btn.onclick=()=>{container.querySelectorAll('.animal-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');state.players[playerIdx].animal=a;playClick()}
    container.appendChild(btn)
  })
}
function confirmNames() {
  const n1=document.getElementById('p1-name').value.trim()
  if(n1) state.players[0].name=n1
  if(state.mode==='duo'){const n2=document.getElementById('p2-name').value.trim();if(n2)state.players[1].name=n2}
  // Save to slots
  savePlayerToSlot(0)
  if(state.mode==='duo') savePlayerToSlot(1)
  // Load stars from saved slot
  try {
    const slots=getPlayerSlots()
    const s0=slots[window._pSlot[0]]
    if(s0){state.players[0].stars=s0.stars||0;state.players[0].ageTier=s0.ageTier||'tumbuh'}
    if(state.mode==='duo'){const s1=slots[window._pSlot[1]];if(s1){state.players[1].stars=s1.stars||0;state.players[1].ageTier=s1.ageTier||'tumbuh'}}
    state.unlockedAchievements=JSON.parse(localStorage.getItem(pkey('achievements'))||'{}')
  } catch(e){}
  updateStreak()
  state.currentPlayer=0
  buildMenuHeader()
  showScreen('screen-menu')
}
function saveStars() {
  try {
    const saved=JSON.parse(localStorage.getItem('dunia-emosi-stars')||'{}')
    saved[state.players[0].name]=state.players[0].stars
    if(state.mode==='duo') saved[state.players[1].name]=state.players[1].stars
    localStorage.setItem('dunia-emosi-stars',JSON.stringify(saved))
    saveStarsToSlot()
  } catch(e){}
}

// ================================================================
// STREAK
// ================================================================
function updateStreak() {
  try {
    const today=new Date().toDateString()
    const data=JSON.parse(localStorage.getItem(pkey('streak'))||'{}')
    const lastDay=data.lastDay||''
    const yesterday=new Date(Date.now()-86400000).toDateString()
    if(lastDay===today){}else if(lastDay===yesterday){data.streak=(data.streak||1)+1}else{data.streak=1}
    data.lastDay=today
    localStorage.setItem(pkey('streak'),JSON.stringify(data))
    const streakEl=document.getElementById('streak-badge'),streakText=document.getElementById('streak-text')
    if(data.streak>=2){streakEl.style.display='inline-flex';streakText.textContent=data.streak+' hari'}
    if(data.streak>=3) setTimeout(()=>checkAchievement('streak3'),1000)
    return data.streak
  } catch(e){return 1}
}
function getStreakCount() {
  try{const data=JSON.parse(localStorage.getItem(pkey('streak'))||'{}');return data.streak||1}catch(e){return 1}
}

// ================================================================
// MENU
// ================================================================
function buildMenuHeader() {
  const header=document.getElementById('menu-player-header'); header.innerHTML=''
  const makeChip=(idx)=>{
    const p=state.players[idx],chip=document.createElement('div')
    chip.className='player-chip'+(state.mode==='solo'||idx===state.currentPlayer?' active':'')
    const streak=getStreakCount(),streakHtml=streak>=2?`<span class="p-streak">🔥${streak}</span>`:''
    const xp=getXP(),tier=getLevelTier(xp)
    chip.innerHTML=`<span class="p-animal">${p.animal}</span><span class="p-name">${p.name}</span><span class="p-stars">⭐${p.stars}</span><span style="font-size:13px;background:rgba(139,92,246,0.12);color:var(--brand);border-radius:100px;padding:2px 8px;font-weight:700">${tier.icon}</span>${streakHtml}`
    return chip
  }
  header.appendChild(makeChip(0))
  if(state.mode==='duo') header.appendChild(makeChip(1))
  const banner=document.getElementById('total-stars-banner')
  if(state.mode==='duo'){banner.style.display='flex';const total=state.players[0].stars+state.players[1].stars;banner.innerHTML=`<span class="tsb-label">Total Bintang Hari Ini ✨</span><span class="tsb-value">⭐ ${total}</span>`}
  else banner.style.display='none'
  // Update per-game best stars display on world map nodes
  try {
    const bestStars=JSON.parse(localStorage.getItem(pkey('best-stars'))||'{}')
    const gameIds=[1,2,3,4,5,6,7,8,9,10,11,12,13,'13b','13c',14,15,16,17,18,19,20,22]
    gameIds.forEach(g=>{
      const best=bestStars[g]||0
      const stars=best>0?'⭐'.repeat(Math.min(best,5)):''
      // Update hidden legacy div
      const el=document.getElementById('gstars-'+g); if(el) el.textContent=stars
      // Update visible star label in new world map
      const lbl=document.getElementById('gstars-'+g+'-lbl'); if(lbl) lbl.textContent=stars
    })
  }catch(e){}
}

// ================================================================
// PAUSE SYSTEM
// ================================================================
function pauseGame() {
  if(state.paused) return
  state.paused = true
  if(g6State && g6State.running){cancelAnimationFrame(g6State.animFrame);g6State.running=false;g6State._wasPaused=true}
  if(state.g4Timer){clearInterval(state.g4Timer);state.g4Timer=null;state._g4TimerPaused=true}
  if(state.breatheInterval){clearInterval(state.breatheInterval);state.breatheInterval=null;state._breathePaused=true}
  document.getElementById('pause-overlay').style.display='flex'
  vibrate(30)
}
function resumeGame() {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  if(g6State && g6State._wasPaused){g6State._wasPaused=false;g6State.running=true;driveTick()}
  if(state._g4TimerPaused){state._g4TimerPaused=false;if(typeof startG4Countdown==='function')startG4Countdown()}
  if(state._breathePaused){state._breathePaused=false}
}
function restartCurrentGame() {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  startGameWithLevel(state.selectedLevel)
}
function exitToPauseMenu() {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  exitGame()
}
function openSettingsFromPause() {
  const name=state.players[state.currentPlayer]?.name||'—'
  document.getElementById('settings-player-name').textContent=name
  const sv=localStorage.getItem('dunia-emosi-sound')
  const vv=localStorage.getItem('dunia-emosi-vibrate')
  const sb=document.getElementById('settings-sound-btn')
  const vb=document.getElementById('settings-vibrate-btn')
  sb.textContent=sv==='off'?'OFF':'ON'
  sb.style.background=sv==='off'?'rgba(255,255,255,0.15)':'linear-gradient(135deg,#8B5CF6,#6D28D9)'
  vb.textContent=vv==='off'?'OFF':'ON'
  vb.style.background=vv==='off'?'rgba(255,255,255,0.15)':'linear-gradient(135deg,#8B5CF6,#6D28D9)'
  const mb=document.getElementById('settings-mathadv-btn')
  if(mb){const adv=isMathAdvanced();mb.textContent=adv?'ON':'OFF';mb.style.background=adv?'linear-gradient(135deg,#8B5CF6,#6D28D9)':'rgba(255,255,255,0.15)'}
  document.getElementById('settings-overlay').style.display='flex'
}
function toggleSoundSetting() {
  const next=localStorage.getItem('dunia-emosi-sound')==='off'?'on':'off'
  localStorage.setItem('dunia-emosi-sound',next)
  const btn=document.getElementById('settings-sound-btn')
  btn.textContent=next==='off'?'OFF':'ON'
  btn.style.background=next==='off'?'rgba(255,255,255,0.15)':'linear-gradient(135deg,#8B5CF6,#6D28D9)'
  // Control background music with sound toggle
  const active=document.querySelector('.screen.active')
  bgMusicToggle(next!=='off' && active && MUSIC_SCREENS.has(active.id))
}
function isMathAdvanced(){return localStorage.getItem('dunia-emosi-mathadv')==='on'}
// Task #68 (2026-04-25): centralized math difficulty bounds — see MATH-DIFFICULTY-STANDARD.md
// Default Easy: + and − only, max 20.  Hard (opt-in): + − × ÷, max 50.
function getMathLimits(){
  const adv=isMathAdvanced()
  return {advanced:adv, maxNum:adv?50:20, allowedOps:adv?['+','-','*','/']:['+','-']}
}
function toggleMathAdvanced(){
  const next=isMathAdvanced()?'off':'on'
  localStorage.setItem('dunia-emosi-mathadv',next)
  const btn=document.getElementById('settings-mathadv-btn')
  if(btn){btn.textContent=next==='on'?'ON':'OFF';btn.style.background=next==='on'?'linear-gradient(135deg,#8B5CF6,#6D28D9)':'rgba(255,255,255,0.15)'}
}
function toggleVibrateSetting() {
  const next=localStorage.getItem('dunia-emosi-vibrate')==='off'?'on':'off'
  localStorage.setItem('dunia-emosi-vibrate',next)
  const btn=document.getElementById('settings-vibrate-btn')
  btn.textContent=next==='off'?'OFF':'ON'
  btn.style.background=next==='off'?'rgba(255,255,255,0.15)':'linear-gradient(135deg,#8B5CF6,#6D28D9)'
}
function closeSettings() {
  document.getElementById('settings-overlay').style.display='none'
}

function stopAllGameSounds() {
  stopAmbient()
  battleBgmStop()
  g14StopAllAudio()
  // Stop G13b evolution/roar audio
  if(typeof _g13bEvoAudio !== 'undefined' && _g13bEvoAudio) {
    try { _g13bEvoAudio.pause(); _g13bEvoAudio.currentTime=0 } catch(e){}
  }
  // Clear G13b legendary auto-attack interval
  if(typeof _g13bLegAutoAtk !== 'undefined' && _g13bLegAutoAtk) {
    clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null
  }
  // Stop all HTML audio elements that may be playing
  document.querySelectorAll('audio').forEach(a => {
    if(!a.paused && !['bg-music'].includes(a.id)) {
      try { a.pause(); a.currentTime=0 } catch(e){}
    }
  })
}
function exitGame() {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  document.getElementById('settings-overlay').style.display='none'
  // Cleanup Pixi apps to free GPU memory
  PixiManager.destroyAll()
  playClick(); clearTimers(); stopAllGameSounds(); showScreen('screen-welcome')
}
function backToLevelSelect() {
  state.paused = false
  document.getElementById('pause-overlay').style.display='none'
  document.getElementById('settings-overlay').style.display='none'
  if(g6State?.running){cancelAnimationFrame(g6State.animFrame);g6State.running=false}
  PixiManager.destroyAll() // free WebGL context — prevents "context was lost" freeze
  clearTimers(); stopAllGameSounds(); playClick(); showScreen('screen-level')
}
function clearTimers() {
  if(state.breatheInterval){clearInterval(state.breatheInterval);state.breatheInterval=null}
  if(state.g4Timer){clearInterval(state.g4Timer);state.g4Timer=null}
  if(g6State && g6State.animFrame){cancelAnimationFrame(g6State.animFrame);g6State.running=false}
  if(g13ResultTimeout){clearTimeout(g13ResultTimeout);g13ResultTimeout=null;hideGameResult()}
  if(g9Canvas){
    g9Canvas.removeEventListener('mousedown',g9StartDraw)
    g9Canvas.removeEventListener('mousemove',g9Draw)
    g9Canvas.removeEventListener('mouseup',g9EndDraw)
    g9Canvas.removeEventListener('touchstart',g9TouchStart)
    g9Canvas.removeEventListener('touchmove',g9TouchMove)
    g9Canvas.removeEventListener('touchend',g9EndDraw)
  }
}

// ================================================================
// DOTS
// ================================================================
function buildDots(containerId, total, current) {
  const el=document.getElementById(containerId); if(!el)return; el.innerHTML=''
  const maxDots=Math.min(total,10),step=total/maxDots
  for(let i=0;i<maxDots;i++){const dot=document.createElement('div');const threshold=Math.round(i*step);dot.className='rdot'+(current>threshold?' done':(current===threshold?' current':''));el.appendChild(dot)}
}

// ================================================================
// FLASH
// ================================================================
function flashScreen(type) {
  const el=document.getElementById('flash-overlay')
  el.className='flash-overlay '+type; el.classList.add('show')
  setTimeout(()=>el.classList.remove('show'),300)
  if(type==='red'){const screen=document.querySelector('.screen.active');if(screen){screen.classList.add('shake');setTimeout(()=>screen.classList.remove('shake'),400)}}
}

// ================================================================
// ACHIEVEMENTS
// ================================================================
function checkAchievement(key) {
  if(!state.unlockedAchievements[key]){
    state.unlockedAchievements[key]=true
    try{localStorage.setItem(pkey('achievements'),JSON.stringify(state.unlockedAchievements))}catch(e){}
    showAchievement(key)
  }
}
function checkAchievements(context) {
  const totalStars=state.players[0].stars+state.players[1].stars
  if(totalStars>=1) checkAchievement('first_star')
  if(totalStars>=10) checkAchievement('ten_stars')
  if(totalStars>=50) checkAchievement('fifty_stars')
  if(totalStars>=100) checkAchievement('hundred_stars')
  if(context==='perfect_g1') checkAchievement('perfect_emotion')
  if(context==='done_g2') checkAchievement('calm_breath')
  if(context==='perfect_g3') checkAchievement('letter_master')
  if(context==='perfect_g4') checkAchievement('count_master')
  if(context==='done_g5') checkAchievement('memory_master')
  if(getStreakCount()>=3) checkAchievement('streak3')
}
function showAchievement(key) {
  const ach=ACHIEVEMENTS[key]; if(!ach)return
  const toast=document.getElementById('achievement-toast')
  const BADGE_MAP={first_star:'badge-first-win.webp',perfect_emotion:'badge-perfect.webp',hard_mode:'badge-perfect.webp',memory_master:'badge-pokemon-master.webp',letter_master:'badge-reader.webp',word_master:'badge-reader.webp',streak3:'badge-streak-7.webp'}
  const badgeFile=BADGE_MAP[key]
  const iconEl=document.getElementById('at-icon')
  if(badgeFile){iconEl.innerHTML=`<img src="assets/${badgeFile}" style="width:36px;height:36px;object-fit:contain" onerror="this.outerHTML='${ach.icon}'">`}
  else{iconEl.textContent=ach.icon}
  document.getElementById('at-name').textContent=ach.name
  // Save title in case showComingSoonToast swapped it; restore here.
  const titleEl=toast.querySelector('.at-title')
  if(titleEl)titleEl.textContent='Pencapaian Baru!'
  toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),3500)
}

// Hotfix #105 (2026-04-28): "Segera Hadir" toast for landing tiles whose
// game isn't built yet. Reuses #achievement-toast DOM (single shared toast).
function showComingSoonToast(name, icon) {
  const toast=document.getElementById('achievement-toast')
  if(!toast)return
  const iconEl=document.getElementById('at-icon')
  const nameEl=document.getElementById('at-name')
  const titleEl=toast.querySelector('.at-title')
  if(iconEl)iconEl.textContent=icon||'🚧'
  if(titleEl)titleEl.textContent='Segera Hadir!'
  if(nameEl)nameEl.textContent=name||'Game baru sedang dibuat'
  toast.classList.add('show')
  setTimeout(()=>toast.classList.remove('show'),3000)
}
window.showComingSoonToast = showComingSoonToast

// ================================================================
// FEEDBACK
// ================================================================
let feedbackCallback=null
function showFeedback(correct, starsEarned, customMsg, callback) {
  feedbackCallback=callback
  const emojis=correct?['🎉','⭐','🥳','🏆','🌟','🎊','💫']:['💪','😊','🤗','🌈','🍀']
  const titles=correct?['Benar!','Hebat!','Luar biasa!','Bagus sekali!','Keren!']:['Hampir benar!','Coba lagi!','Ayo terus!','Semangat!']
  document.getElementById('fb-emoji').textContent=emojis[Math.floor(Math.random()*emojis.length)]
  document.getElementById('fb-title').textContent=titles[Math.floor(Math.random()*titles.length)]
  document.getElementById('fb-sub').textContent=customMsg||(correct?'Kamu pintar sekali! 😄':'Tidak apa-apa, kamu pasti bisa! 💪')
  document.getElementById('fb-stars').textContent=starsEarned>0?'⭐'.repeat(Math.min(starsEarned,5)):''
  const leoEl = document.getElementById('fb-leo')
  if(leoEl) leoEl.src = correct ? 'assets/leo-celebrating.webp' : 'assets/leo-angry.webp'
  document.getElementById('overlay-feedback').classList.add('show')
  if(correct&&starsEarned>=3) launchConfetti(1) // light confetti only for 3+ stars
}
function closeFeedback() {
  playClick(); document.getElementById('overlay-feedback').classList.remove('show')
  if(feedbackCallback){feedbackCallback();feedbackCallback=null}
}
function addStars(n, answerEl) {
  // Task #84 verify: defensive guards to prevent freeze if state.gameStars or currentPlayer not init
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  if (state.players && state.players[state.currentPlayer]) {
    state.players[state.currentPlayer].stars = (state.players[state.currentPlayer].stars || 0) + n
  }
  state.gameStars[state.currentPlayer] = (state.gameStars[state.currentPlayer] || 0) + n
  saveStars(); updateGameStarDisplay(); spawnSparkles(answerEl, n)
  if(answerEl) flyStarToCounter(answerEl)
  checkAchievements(null)
}
function updateGameStarDisplay() {
  const gn=state.currentGame
  const gsEl=document.getElementById('g'+gn+'-stars')||document.getElementById('g'+gn+'-stars-hdr')
  if(gsEl){gsEl.textContent='⭐ '+state.gameStars[state.currentPlayer];gsEl.classList.remove('pop');void gsEl.offsetWidth;gsEl.classList.add('pop')}
  const piEl=document.getElementById('g'+gn+'-player-icon')
  if(piEl) piEl.textContent=state.players[state.currentPlayer].animal
  // G6 score mid
  const g6s=document.getElementById('g6-score')
  if(g6s&&gn===6) g6s.textContent='⭐ '+state.gameStars[state.currentPlayer]
}
function flyStarToCounter(srcEl) {
  const gn=state.currentGame
  const counter=document.getElementById('g'+gn+'-stars')||document.getElementById('g'+gn+'-stars-hdr')
  if(!counter||!srcEl)return
  const srcRect=srcEl.getBoundingClientRect(),dstRect=counter.getBoundingClientRect()
  const star=document.createElement('div'); star.className='star-fly'; star.textContent='⭐'
  const tx=dstRect.left-srcRect.left,ty=dstRect.top-srcRect.top
  star.style.cssText=`left:${srcRect.left}px;top:${srcRect.top}px;--tx:${tx}px;--ty:${ty}px;animation-duration:0.6s;`
  document.body.appendChild(star); setTimeout(()=>star.remove(),700)
}

// ================================================================
// RESULT
// ================================================================
// Task #99 (2026-04-27): Section-level try-catch refactor. Previous monolithic
// flow threw on any unguarded DOM/storage access, falling through to fallback.
// Each section now isolated; CRITICAL sections (text + showScreen) always run.
function showResult(mascot, title, msg) {
  if (state._showingResult) return
  state._showingResult = true
  setTimeout(() => { state._showingResult = false }, 1500)

  try { clearTimers(); stopAmbient() } catch(e) { console.warn('[showResult] clearTimers/stopAmbient:', e) }
  try {
    const fb = document.getElementById('overlay-feedback')
    if(fb){ fb.classList.remove('show'); fb.style.display = 'none' }
    const gr = document.getElementById('game-result-overlay')
    if(gr){ gr.classList.remove('show'); gr.style.display = 'none' }
  } catch(e) { console.warn('[showResult] hide overlays:', e) }

  // Hardened state guards (Task #99 — prevent throw on first-session paths)
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  if (!Array.isArray(state.players) || !state.players[state.currentPlayer]) {
    state.players = state.players || []
    state.players[state.currentPlayer] = state.players[state.currentPlayer] || {name:'Pemain',animal:'🦁',stars:0,ageTier:'tumbuh'}
  }

  const totalStars = state.gameStars[0]+state.gameStars[1]
  const maxPossible = state.maxPossibleStars || 5
  const earned = Math.min(5, Math.round(totalStars / maxPossible * 5)) || 0
  const maxStars = 5
  let finalTitle = title || 'Bagus sekali!'
  let finalMsg = msg || `Kamu dapat ${totalStars} bintang! 🌟`
  if (earned === 0) {
    if (/sempurna|hebat|bagus|luar biasa|keren|selesai|berhasil|master|menang/i.test(finalTitle)) {
      finalTitle = 'Coba Lagi!'
    }
    if (/sempurna|hebat|bagus|luar biasa|keren/i.test(finalMsg) || /!$/.test(finalMsg)) {
      finalMsg = 'Belum ada bintang. Jangan menyerah, ayo coba lagi!'
    }
  } else if (earned <= 2 && /sempurna/i.test(finalTitle)) {
    finalTitle = 'Coba Lagi'
  }

  // SECTION 1: text content (CRITICAL — modal must show this)
  try {
    const mascotEl = document.getElementById('result-mascot')
    if (mascotEl) mascotEl.textContent = mascot || state.players[state.currentPlayer].animal
    const titleEl = document.getElementById('result-title')
    if (titleEl) titleEl.textContent = finalTitle
    const starsEl = document.getElementById('result-stars')
    if (starsEl) starsEl.innerHTML = '<span class="rstar filled">★</span>'.repeat(earned)+'<span class="rstar empty">★</span>'.repeat(maxStars-earned)
    const msgEl = document.getElementById('result-msg')
    if (msgEl) msgEl.textContent = finalMsg
  } catch(e) { console.error('[showResult] text section:', e, e && e.stack) }

  // SECTION 2: Next button + duo scores
  try {
    const nextBtn = document.getElementById('result-next-btn')
    if (nextBtn) {
      const curLv = state.selectedLevelNum || 1
      nextBtn.style.display = (curLv < 20 && state.mode !== 'duo' && earned >= 3) ? 'block' : 'none'
    }
    const scoresEl = document.getElementById('result-scores')
    if (scoresEl) {
      if (state.mode === 'duo') {
        scoresEl.style.display = 'flex'
        scoresEl.innerHTML = [0,1].map(i => `<div class="rs-card"><div class="rs-animal">${state.players[i] && state.players[i].animal || '🦁'}</div><div class="rs-name">${state.players[i] && state.players[i].name || 'Pemain'}</div><div class="rs-stars">⭐ ${state.gameStars[i] || 0}</div></div>`).join('')
      } else scoresEl.style.display = 'none'
    }
  } catch(e) { console.warn('[showResult] next/scores:', e) }

  // SECTION 3: best-stars persistence
  try {
    const bs = JSON.parse(localStorage.getItem(pkey('best-stars')) || '{}')
    const starsThisGame = state.gameStars[0]+state.gameStars[1]
    if (!bs[state.currentGame] || starsThisGame > bs[state.currentGame]) {
      bs[state.currentGame] = starsThisGame
      localStorage.setItem(pkey('best-stars'), JSON.stringify(bs))
    }
  } catch(e) { console.warn('[showResult] best-stars:', e) }

  // SECTION 4: XP + level-up (HIGH throw risk — addXP, getLevelTier, DOM nulls)
  try {
    const xpEarned = totalStars * 10
    const xpResult = addXP(xpEarned) || {}
    const xpBanner = document.getElementById('result-xp-banner')
    if (xpBanner) {
      if (xpEarned > 0 && typeof xpResult.next === 'number') {
        const tier = getLevelTier(xpResult.next) || {icon:'⭐',name:'Pemula'}
        xpBanner.style.display = 'flex'
        xpBanner.innerHTML = `<span>+${xpEarned} XP</span><span style="font-size:13px;opacity:0.85">${tier.icon} ${tier.name} — ${xpResult.next} XP total</span>`
        xpBanner.className = 'result-xp-badge'; xpBanner.style.cssText = ''
      } else xpBanner.style.display = 'none'
    }
    const lvlUp = document.getElementById('result-level-up')
    if (lvlUp) {
      if (xpResult.leveled && typeof xpResult.next === 'number') {
        const newTier = getLevelTier(xpResult.next) || {icon:'⭐'}
        const ico = document.getElementById('level-up-icon')
        if (ico) ico.textContent = newTier.icon
        lvlUp.style.display = 'flex'
      } else lvlUp.style.display = 'none'
    }
  } catch(e) { console.warn('[showResult] XP section:', e, e && e.stack) }

  // SECTION 5: deferred achievement checks
  try {
    const gameAchMap = {1:'perfect_emotion',2:'calm_breath',3:'letter_master',4:'count_master',5:'memory_master',6:'driver_master',7:'picture_master',8:'word_master',9:'trace_master'}
    setTimeout(() => {
      try {
        if (gameAchMap[state.currentGame]) checkAchievement(gameAchMap[state.currentGame])
        const played = JSON.parse(localStorage.getItem('dunia-emosi-played-games') || '{}')
        played[state.currentGame] = true
        localStorage.setItem('dunia-emosi-played-games', JSON.stringify(played))
        if (Object.keys(played).length >= 12) checkAchievement('all_games')
      } catch(_) {}
    }, 450)
  } catch(e) { console.warn('[showResult] achievement:', e) }

  // SECTION 6: header + showScreen (CRITICAL — must run, with manual fallback)
  try { if (typeof buildMenuHeader === 'function') buildMenuHeader() } catch(e) { console.error('[showResult] buildMenuHeader:', e) }
  try {
    showScreen('screen-result')
  } catch(e) {
    console.error('[showResult] showScreen failed:', e, e && e.stack)
    try {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
      const sr = document.getElementById('screen-result')
      if (sr) sr.classList.add('active')
    } catch(_) {}
  }

  // SECTION 7: confetti (cosmetic)
  try {
    if (earned >= 5) { launchConfetti(3); launchConfetti(3) }
    else if (earned >= 4) launchConfetti(2)
    else if (earned >= 3) launchConfetti(1)
  } catch(e) { console.warn('[showResult] confetti:', e) }
}
// endGame — called by G10/G11/G12 with raw star count
// Task #94 (2026-04-26): split into try-catch wrapper + fallback so any throw
// in the result chain still shows SOMETHING — guarantee no freeze regardless of bug.
function endGame(stars) {
  try {
    _endGameMain(stars)
  } catch (e) {
    // Task #99: capture full stack so the fallback diagnostic shows the throw site,
    // not just an opaque message. Mobile users without DevTools rely on this.
    const stackInfo = (e && e.stack) || (e && e.message) || String(e)
    console.error('[endGame] CRITICAL — main path threw, showing fallback modal:', e, e && e.stack)
    _endGameFallback(stars, stackInfo)
  }
}

function _endGameMain(stars) {
  console.debug('[endGame] step 1: entering, stars=', stars, 'currentGame=', state.currentGame)
  // Task #70: defensive guard — surface state.currentGame regression
  if (typeof state.currentGame !== 'number') {
    console.error('[endGame] state.currentGame missing — progress may not save.')
  }
  // Defensive guards (Task #94)
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  if (!Array.isArray(state.players) || !state.players[state.currentPlayer]) {
    state.players = state.players || []
    state.players[state.currentPlayer] = state.players[state.currentPlayer] || {name:'Pemain',animal:'🦁',stars:0,ageTier:'tumbuh'}
  }
  // Normalize raw stars to 5-star scale via unified GameScoring engine
  const maxRounds = g10State?.totalRounds || g11State?.total || g12State?.total || 5
  const normalizedStars = GameScoring.calc({ correct: stars || 0, total: maxRounds })
  state.maxPossibleStars = 5
  state.gameStars[state.currentPlayer] = normalizedStars
  state.players[state.currentPlayer].stars = (state.players[state.currentPlayer].stars || 0) + normalizedStars
  console.debug('[endGame] step 2: state writes done, normalizedStars=', normalizedStars)
  // Save level progress
  const lv = state.selectedLevelNum || 1
  const starsEarned = normalizedStars >= 4 ? 3 : normalizedStars >= 2 ? 2 : normalizedStars >= 1 ? 1 : 0
  setLevelComplete(state.currentGame, lv, starsEarned)
  if (state.selectedRegion && state.selectedCity && typeof setCityComplete === 'function') {
    setCityComplete(state.currentGame, state.selectedRegion, state.selectedCity, starsEarned)
  }
  saveStars()
  console.debug('[endGame] step 3: progress saved')
  const p = state.players[state.currentPlayer]
  showResult(p.animal, normalizedStars>=4?'Luar Biasa! 🏆':normalizedStars>=2?'Bagus Sekali! ⭐':'Terus Berlatih! 💪', `Kamu dapat ${normalizedStars} bintang di level ${lv}!`)
  console.debug('[endGame] step 4: showResult called')
}

function _endGameFallback(stars, errMsg) {
  // Task #98 (2026-04-26): feature-parity with main modal + diagnostic display
  // Force-clear stuck flags so future tries work
  state._showingResult = false
  state._showingGameResult = false
  state.maxPossibleStars = null
  // Normalize raw stars to 5-star scale (same as main showResult path)
  let normalizedStars = stars
  try {
    const maxRounds = (typeof g10State !== 'undefined' && g10State?.totalRounds)
                   || (typeof g11State !== 'undefined' && g11State?.total)
                   || (typeof g12State !== 'undefined' && g12State?.total) || 5
    if (typeof GameScoring !== 'undefined') {
      normalizedStars = GameScoring.calc({ correct: stars || 0, total: maxRounds })
    } else {
      normalizedStars = Math.min(5, Math.round((stars || 0) / maxRounds * 5))
    }
  } catch(_) {}
  const safeStars = Math.max(0, Math.min(5, parseInt(normalizedStars) || 0))
  // Save progress (in case main path failed before saveStars)
  try {
    const lv = state.selectedLevelNum || 1
    const starsEarned = safeStars >= 4 ? 3 : safeStars >= 2 ? 2 : safeStars >= 1 ? 1 : 0
    if (typeof setLevelComplete === 'function' && typeof state.currentGame === 'number') {
      setLevelComplete(state.currentGame, lv, starsEarned)
    }
    if (state.selectedRegion && state.selectedCity && typeof setCityComplete === 'function') {
      setCityComplete(state.currentGame, state.selectedRegion, state.selectedCity, starsEarned)
    }
    if (typeof saveStars === 'function') saveStars()
  } catch(_) {}

  // Build feature-parity buttons
  const curLv = state.selectedLevelNum || 1
  const showNext = curLv < 20 && state.mode !== 'duo' && safeStars >= 3
  const existing = document.getElementById('endgame-fallback')
  if (existing) existing.remove()
  const ov = document.createElement('div')
  ov.id = 'endgame-fallback'
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:"Fredoka One",cursive;padding:16px;backdrop-filter:blur(8px)'
  const titleText = safeStars >= 4 ? 'Luar Biasa! 🏆' : safeStars >= 2 ? 'Bagus Sekali! ⭐' : 'Terus Berlatih! 💪'
  const emoji = safeStars >= 4 ? '🏆' : safeStars >= 2 ? '⭐' : '💪'
  // Build buttons
  let btnsHtml = ''
  if (showNext) btnsHtml += `<button id="egfb-next" style="background:linear-gradient(160deg,#a78bfa,#8b5cf6);color:#fff;border:none;border-radius:18px;padding:14px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 4px 0 #6d28d9">▶ Lanjut Level</button>`
  btnsHtml += `<button id="egfb-again" style="background:linear-gradient(160deg,#4ade80,#22c55e);color:#fff;border:none;border-radius:18px;padding:14px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 4px 0 #15803d">🔄 Main Lagi</button>`
  btnsHtml += `<button id="egfb-back" style="background:rgba(139,92,246,0.06);color:#6b5080;border:1.5px solid rgba(139,92,246,0.22);border-radius:18px;padding:14px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit">⌂ Beranda</button>`
  // Task #99 (2026-04-27): show full stack trace + clipboard copy button.
  // errMsg now contains e.stack from endGame catch — escape before injecting.
  const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const diagLink = errMsg
    ? `<details style="margin-top:12px;text-align:left;color:#9b8bb0;font-size:11px"><summary style="cursor:pointer">🐛 Detail diagnostik (klik untuk salin)</summary><pre id="egfb-stack" style="white-space:pre-wrap;background:#fff;padding:8px;border-radius:8px;margin-top:6px;overflow-x:auto;max-height:200px">${escHtml(errMsg)}</pre><button id="egfb-copy" style="margin-top:6px;background:#8b5cf6;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:11px;cursor:pointer;font-family:inherit">📋 Salin ke clipboard</button></details>`
    : ''
  ov.innerHTML = `
    <div style="background:linear-gradient(160deg,#f8f0ff,#ede2f6);border-radius:24px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.5)">
      <div style="font-size:56px">${emoji}</div>
      <h2 style="font-family:'Fredoka One',cursive;color:#3b2066;margin:8px 0;font-size:24px">${titleText}</h2>
      <div style="font-size:34px;letter-spacing:4px;margin:8px 0">${'⭐'.repeat(safeStars)}${'☆'.repeat(5-safeStars)}</div>
      <p style="color:#6b5080;margin:0 0 20px 0;font-size:14px">Kamu dapat ${safeStars} bintang di Level ${curLv}!</p>
      <div style="display:flex;flex-direction:column;gap:8px">${btnsHtml}</div>
      ${diagLink}
    </div>`
  document.body.appendChild(ov)
  // Wire buttons (after DOM insert)
  const closeAndDo = (fn) => () => { try { ov.remove() } catch(_){}; try { fn() } catch(_){} }
  const nextBtn = document.getElementById('egfb-next')
  if (nextBtn) nextBtn.onclick = closeAndDo(() => {
    if (state.selectedRegion && state.selectedCity && typeof openRegionOverlay === 'function') {
      // City-picker path: re-open picker so user picks next unlocked city
      try { exitGame && exitGame() } catch(_){}
      setTimeout(() => openRegionOverlay(state.currentGame), 80)
    } else if (typeof startGameWithLevel === 'function') {
      startGameWithLevel((curLv || 1) + 1)
    }
  })
  document.getElementById('egfb-again').onclick = closeAndDo(() => {
    if (state.selectedRegion && state.selectedCity && typeof openRegionOverlay === 'function') {
      try { exitGame && exitGame() } catch(_){}
      setTimeout(() => openRegionOverlay(state.currentGame), 80)
    } else if (typeof startGameWithLevel === 'function') {
      startGameWithLevel(curLv)
    }
  })
  document.getElementById('egfb-back').onclick = closeAndDo(() => { if (typeof exitGame === 'function') exitGame() })
  // Wire clipboard copy for the diagnostic stack (don't close modal on copy)
  const copyBtn = document.getElementById('egfb-copy')
  if (copyBtn) {
    copyBtn.onclick = (ev) => {
      ev.preventDefault(); ev.stopPropagation()
      const stackEl = document.getElementById('egfb-stack')
      const text = stackEl ? stackEl.textContent : (errMsg || '')
      const done = () => { copyBtn.textContent = '✓ Tersalin' ; setTimeout(() => copyBtn.textContent = '📋 Salin ke clipboard', 1500) }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {
          try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done() } catch(_) {}
        })
      } else {
        try { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done() } catch(_) {}
      }
    }
  }
}
function playAgain() { state._showingResult = false; state.maxPossibleStars = null; startGameWithLevel(state.selectedLevelNum || 1) }
function nextLevel()  { state._showingResult = false; state.maxPossibleStars = null; startGameWithLevel((state.selectedLevelNum||1) + 1) }
function goToMenu()   { state._showingResult = false; state.maxPossibleStars = null; buildMenuHeader(); showScreen('screen-menu') }

// ================================================================
// CONFETTI + SPARKLES
// ================================================================
// intensity: 0=none, 1=light(3★), 2=medium(4★), 3=full(5★)
function launchConfetti(intensity) {
  if(!intensity||intensity<=0)return
  const count=intensity===3?60:intensity===2?30:15
  const colors=intensity===3
    ?['#FCD34D','#FBBF24','#F59E0B','#FFD700','#FDE68A','#F43F5E','#8B5CF6','#14B8A6','#38BDF8','#A3E635']
    :intensity===2?['#F43F5E','#FCD34D','#14B8A6','#38BDF8','#8B5CF6','#A3E635']
    :['#94A3B8','#CBD5E1','#A3E635','#38BDF8']
  const starChance=intensity===3?0.4:intensity===2?0.2:0
  for(let i=0;i<count;i++){setTimeout(()=>{
    const p=document.createElement('div');p.className='confetti-piece'
    const size=(intensity===3?10:7)+Math.random()*(intensity===3?14:10)
    const dx=(Math.random()-0.5)*(intensity===3?300:200)+'px'
    const rot=Math.random()*1080+'deg'
    if(Math.random()<starChance){
      p.style.cssText=`left:${Math.random()*100}vw;background:url('assets/confetti-star.webp') center/contain no-repeat;width:${size}px;height:${size}px;border-radius:0;animation-duration:${1.8+Math.random()*1.4}s;--dx:${dx};--rot:${rot};`
    }else{
      p.style.cssText=`left:${Math.random()*100}vw;background:${colors[Math.floor(Math.random()*colors.length)]};width:${size}px;height:${size*1.4}px;border-radius:${Math.random()>0.5?'50%':'4px'};animation-duration:${1.8+Math.random()*1.4}s;--dx:${dx};--rot:${rot};`
    }
    document.body.appendChild(p);setTimeout(()=>p.remove(),3200)
  },i*(intensity===3?25:40))}
}
function spawnSparkles(btn,starCount) {
  const sc=starCount||0
  const n=sc>=5?12:sc>=3?6:3
  const icons=sc>=5?['⭐','✨','💫','🌟','🏆','🎉']:sc>=3?['⭐','✨','💫','🌟']:['✨','💫']
  const rect=btn?btn.getBoundingClientRect():null
  const cx=rect?(rect.left+rect.width/2)+'px':'50%'
  const cy=rect?(rect.top+rect.height/2)+'px':'40%'
  const maxDist=sc>=5?140:sc>=3?100:60
  const fs=sc>=5?20:sc>=3?16:12
  for(let i=0;i<n;i++){const s=document.createElement('div');s.className='sparkle';const angle=(i/n)*Math.PI*2,dist=50+Math.random()*maxDist;s.style.cssText=`left:${cx};top:${cy};--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;--rot:${Math.random()*360}deg;animation-duration:${0.5+Math.random()*0.5}s;animation-delay:${Math.random()*0.2}s;font-size:${fs+Math.random()*10}px;`;s.textContent=icons[Math.floor(Math.random()*icons.length)];document.body.appendChild(s);setTimeout(()=>s.remove(),1200)}
}

// Card-anchored correct-answer juice: pulse + ring + tick mark + particle burst.
// Overlays are children of the button (position:absolute), so transformed ancestors
// do not misplace them. Particle burst is viewport-level best-effort.
function spawnCorrectCardJuice(btn, opts) {
  if (!btn) return
  const o = opts || {}
  try {
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative'
    btn.style.overflow = 'visible'
    btn.classList.remove('correct-pop')
    void btn.offsetWidth
    btn.classList.add('correct-pop')
    setTimeout(() => btn.classList.remove('correct-pop'), 650)
    const ring = document.createElement('div')
    ring.className = 'correct-ring-overlay'
    btn.appendChild(ring)
    setTimeout(() => { try{ring.remove()}catch(_){} }, 950)
    if (o.tick !== false) {
      const tick = document.createElement('div')
      tick.className = 'correct-tick-overlay'
      tick.textContent = '✓'
      btn.appendChild(tick)
      setTimeout(() => { try{tick.remove()}catch(_){} }, 1400)
    }
    if (o.burst !== false) {
      const r = btn.getBoundingClientRect()
      if (typeof spawnParticleBurst === 'function') spawnParticleBurst(r.left + r.width/2, r.top + r.height/2)
    }
  } catch(_) {}
}

function spawnWrongShake(btn) {
  if (!btn) return
  try {
    btn.classList.remove('wrong-shake'); void btn.offsetWidth
    btn.classList.add('wrong-shake')
    setTimeout(() => btn.classList.remove('wrong-shake'), 550)
  } catch(_) {}
}

// ── Quiz combo streak tracker ──
// Call quizStreakHit(btn) on every correct answer, quizStreakReset() on wrong.
// Streak >= 3 shows escalating floater "COMBO x3!" near the button + excited tone.
let _quizStreak = 0
function quizStreakReset() { _quizStreak = 0 }
function quizStreakHit(btn) {
  _quizStreak++
  if (_quizStreak >= 3 && btn) {
    try {
      const r = btn.getBoundingClientRect()
      const floater = document.createElement('div')
      const tier = _quizStreak >= 7 ? 'LEGEND' : _quizStreak >= 5 ? 'HEBAT' : 'COMBO'
      const color = _quizStreak >= 7 ? '#a855f7' : _quizStreak >= 5 ? '#f43f5e' : '#f59e0b'
      floater.textContent = `${tier} ×${_quizStreak}!`
      floater.style.cssText = `position:fixed; left:${r.left + r.width/2}px; top:${r.top - 16}px; transform:translate(-50%, -50%); font-size:clamp(18px, 5vw, 28px); font-weight:900; color:${color}; text-shadow:0 2px 6px rgba(0,0,0,0.4), 0 0 12px ${color}aa; z-index:9998; pointer-events:none; font-family:var(--font-display,'Fredoka One',sans-serif); letter-spacing:1px; animation:comboFloat 1.1s cubic-bezier(0.34,1.56,0.64,1) forwards;`
      document.body.appendChild(floater)
      setTimeout(() => { try{floater.remove()}catch(_){} }, 1200)
      // Pitched-up chime for combo tier
      try {
        const base = 523 + _quizStreak * 35
        playTone(base, 0.08, 'sine', 0.22)
        setTimeout(() => playTone(base * 1.25, 0.1, 'sine', 0.22), 80)
        setTimeout(() => playTone(base * 1.5, 0.14, 'sine', 0.22), 180)
      } catch(_) {}
    } catch(_) {}
  }
}

// ================================================================
// AUDIO
// ================================================================
let audioCtx=null
function isSoundOn(){return localStorage.getItem('dunia-emosi-sound')!=='off'}
function isVibrateOn(){return localStorage.getItem('dunia-emosi-vibrate')!=='off'}
function vibrate(pattern){if(isVibrateOn()&&navigator.vibrate)navigator.vibrate(pattern)}
function getAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx}
function playTone(freq,dur,type='sine',vol=0.2){if(!isSoundOn())return;try{const ctx=getAudio(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(vol,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);osc.start();osc.stop(ctx.currentTime+dur)}catch(e){}}
function playCorrect(){playTone(523,0.1,'sine',0.2);setTimeout(()=>playTone(659,0.1,'sine',0.2),100);setTimeout(()=>playTone(784,0.2,'sine',0.25),200);setTimeout(()=>playTone(1047,0.3,'sine',0.2),340);vibrate([20,40,20])/* Task #87: haptic parity per AUDIT-2026-04-25 P2-6 — double-tap pattern for correct answer engagement */}
let _wrongAudio=null;function playWrong(){if(!isSoundOn())return;try{if(!_wrongAudio){_wrongAudio=new Audio('assets/wrong-buzzer.mp3');_wrongAudio.volume=0.7}const a=_wrongAudio.cloneNode();a.volume=0.7;a.play().catch(()=>{playTone(280,0.35,'sawtooth',0.1);setTimeout(()=>playTone(220,0.3,'sawtooth',0.08),150)})}catch(e){playTone(280,0.35,'sawtooth',0.1);setTimeout(()=>playTone(220,0.3,'sawtooth',0.08),150)}}
function playClick(){playTone(440,0.06,'sine',0.1)}

// ════════════════════════════════════════════════════════════════════
// Task #80 (2026-04-26): Shared animation + listener helpers per AUDIT-2026-04-25
// Phase 2.1 — Lesson L22 centralized helper pattern
// ════════════════════════════════════════════════════════════════════

/**
 * animateClass — add a CSS class for a given duration, then remove.
 * Replaces 50+ inline `el.classList.add('x'); setTimeout(()=>el.classList.remove('x'), N)` patterns.
 * Null-safe. Force-restart animation by removing class first + reflow.
 * @param {HTMLElement|null} el
 * @param {string} className
 * @param {number} durationMs
 */
function animateClass(el, className, durationMs) {
  if (!el || !className) return
  el.classList.remove(className)
  void el.offsetWidth   // force reflow so re-add restarts animation
  el.classList.add(className)
  setTimeout(() => { try { el.classList.remove(className) } catch(_) {} }, durationMs)
}

/**
 * addTrackedListener — add event listener that's tracked for later cleanup.
 * Replaces ad-hoc addEventListener calls with no removeEventListener counterpart.
 * Use clearTrackedListeners(el) on game exit/swap to prevent memory leaks.
 * @param {HTMLElement|Window|Document} el
 * @param {string} type
 * @param {Function} fn
 * @param {boolean|object} [opts]
 */
const _trackedListeners = new WeakMap()  // el → [{type, fn, opts}]
function addTrackedListener(el, type, fn, opts) {
  if (!el || !type || !fn) return
  el.addEventListener(type, fn, opts)
  let list = _trackedListeners.get(el)
  if (!list) { list = []; _trackedListeners.set(el, list) }
  list.push({type, fn, opts})
}
function clearTrackedListeners(el) {
  if (!el) return
  const list = _trackedListeners.get(el)
  if (!list) return
  for (const {type, fn, opts} of list) {
    try { el.removeEventListener(type, fn, opts) } catch(_) {}
  }
  _trackedListeners.delete(el)
}

if (typeof window !== 'undefined') {
  window.animateClass = animateClass
  window.addTrackedListener = addTrackedListener
  window.clearTrackedListeners = clearTrackedListeners
}
function playBreathIn(){playTone(392,4.0,'sine',0.06)}
function playBreathOut(){playTone(330,4.0,'sine',0.06)}
// Compatibility adapter for legacy playSound() calls
function playSound(kind){if(kind==='correct')return playCorrect();if(kind==='wrong')return playWrong();return playClick()}
// Share game via Web Share API
function shareGame(){if(navigator.share){navigator.share({title:'Dunia Emosi — Game Belajar Seru',text:'Yuk belajar bersama Leo si Singa! Game seru untuk anak 5-10 tahun 🦁',url:location.href}).catch(()=>{})}else{try{navigator.clipboard.writeText(location.href);alert('Link tersalin! Bagikan ke temanmu 📋')}catch(e){}}}

// Background music (menu/landing screens)
let _bgMusicUnlocked = false
function bgMusicToggle(shouldPlay){
  if(!isSoundOn()) return
  const el = document.getElementById('bg-music')
  if(!el) return
  if(shouldPlay){
    el.volume = 0.011
    if(el.paused){
      const p = el.play()
      if(p && p.catch) p.catch(()=>{})
    }
  } else {
    if(!el.paused){
      // Fade out before pausing
      let v = el.volume
      const fade = setInterval(()=>{
        v = Math.max(0, v - 0.008)
        el.volume = v
        if(v <= 0){ clearInterval(fade); el.pause(); el.volume=0.045 }
      }, 60)
    }
  }
}
// Unlock autoplay on first user interaction
document.addEventListener('click', function _unlockMusic(){
  if(!_bgMusicUnlocked){
    _bgMusicUnlocked = true
    const active = document.querySelector('.screen.active')
    if(active && MUSIC_SCREENS.has(active.id)) bgMusicToggle(true)
  }
}, {once:true, capture:true})

// ================================================================
// ATTACK SFX — type-based Pokemon attack sounds
// ================================================================
const G_ATK_SOUNDS = {
  bug:      ['Sounds/Attack/Bug/Attack Order.mp3'],
  dark:     ['Sounds/Attack/Dark/Bite.mp3','Sounds/Attack/Dark/Beat Up.mp3'],
  dragon:   ['Sounds/Attack/Other/Boomburst.mp3'],
  electric: ['Sounds/Attack/Electric/Bolt Strike.mp3'],
  fairy:    ['Sounds/Attack/Fairy/Baby-Doll Eyes.mp3'],
  fighting: ['Sounds/Attack/Fighting/Arm Thrust 2hits.mp3','Sounds/Attack/Fighting/Aura Sphere.mp3'],
  fire:     ['Sounds/Attack/Fire/Blast Burn.mp3','Sounds/Attack/Fire/Blaze Kick.mp3','Sounds/Attack/Fire/Blue Flare.mp3'],
  flying:   ['Sounds/Attack/Flying/Aerial Ace.mp3','Sounds/Attack/Flying/Air Slash.mp3','Sounds/Attack/Flying/Acrobatics.mp3'],
  ghost:    ['Sounds/Attack/Ghost/Astonish.mp3'],
  grass:    ['Sounds/Attack/Grass/Absorb.mp3'],
  ground:   ['Sounds/Attack/Ground/Bone Club.mp3','Sounds/Attack/Ground/Bonemerang 2hits.mp3'],
  ice:      ['Sounds/Attack/Ice/Aurora Beam.mp3','Sounds/Attack/Ice/Avalanche.mp3','Sounds/Attack/Ice/Blizzard.mp3'],
  normal:   ['Sounds/Attack/Normal/Body Slam.mp3','Sounds/Attack/Normal/Barrage 2hits.mp3','Sounds/Attack/Normal/Bind.mp3'],
  poison:   ['Sounds/Attack/Poison/Acid.mp3','Sounds/Attack/Poison/Acid Spray.mp3','Sounds/Attack/Poison/Belch.mp3'],
  psychic:  ['Sounds/Attack/Psychic/Barrier.mp3'],
  rock:     ['Sounds/Attack/Rock/Ancient Power.mp3'],
  steel:    ['Sounds/Attack/Steel/Autotomize.mp3'],
  water:    ['Sounds/Attack/Water/Aqua Jet.mp3','Sounds/Attack/Water/Aqua Tail.mp3'],
}

// Cache Audio elements per unique src to avoid repeated allocation
const _atkAudioCache = {}
function playAttackSound(type) {
  if (!isSoundOn()) return
  const key = (type || 'normal').toLowerCase()
  const pool = G_ATK_SOUNDS[key] || G_ATK_SOUNDS.normal
  const src = pool[Math.floor(Math.random() * pool.length)]
  if (!_atkAudioCache[src]) _atkAudioCache[src] = new Audio(src)
  const audio = _atkAudioCache[src]
  audio.volume = 0.62
  audio.currentTime = 0
  audio.play().catch(() => {})
}

// Battle BGM (G10, G13 battle screens)
let _battleBgmEl = null
function battleBgmPlay(){
  if(!isSoundOn()) return
  if(!_battleBgmEl) _battleBgmEl = document.getElementById('battle-bgm')
  if(!_battleBgmEl) return
  _battleBgmEl.volume = 0.45
  _battleBgmEl.currentTime = 0
  const p = _battleBgmEl.play()
  if(p && p.catch) p.catch(()=>{
    // Retry once — some mobile browsers need a second attempt after gesture context
    setTimeout(()=>{ if(_battleBgmEl && isSoundOn()){ _battleBgmEl.currentTime=0; _battleBgmEl.play().catch(()=>{}) } }, 300)
  })
}
function battleBgmStop(){
  if(!_battleBgmEl) _battleBgmEl = document.getElementById('battle-bgm')
  if(!_battleBgmEl) return
  if(!_battleBgmEl.paused){
    let v = _battleBgmEl.volume
    const fade = setInterval(()=>{
      v = Math.max(0, v - 0.05)
      _battleBgmEl.volume = v
      if(v <= 0){ clearInterval(fade); _battleBgmEl.pause(); _battleBgmEl.volume=0.45 }
    }, 40)
  }
}

// Ambient audio system
let ambientNodes=[]
function stopAmbient(){ambientNodes.forEach(n=>{try{n.stop()}catch(e){}});ambientNodes=[]}
function startAmbient(type){
  stopAmbient()
  try{
    const ctx=getAudio()
    if(type==='city'){
      // Synth city beat: 4/4 kick pattern
      const bpm=100,beat=60/bpm,notes=[220,0,165,0,220,0,165,196]
      notes.forEach((f,i)=>{if(!f)return;const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='square';o.frequency.value=f;g.gain.setValueAtTime(0,ctx.currentTime+i*beat*0.25);g.gain.linearRampToValueAtTime(0.04,ctx.currentTime+i*beat*0.25+0.05);g.gain.linearRampToValueAtTime(0,ctx.currentTime+i*beat*0.25+0.15);o.start(ctx.currentTime+i*beat*0.25);o.stop(ctx.currentTime+i*beat*0.25+0.2);ambientNodes.push(o)})
    } else if(type==='forest'){
      // Bird chirp arpeggios
      const chirps=[784,988,1175,988,784,659,784]
      chirps.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,ctx.currentTime+i*0.18);g.gain.linearRampToValueAtTime(0.05,ctx.currentTime+i*0.18+0.04);g.gain.linearRampToValueAtTime(0,ctx.currentTime+i*0.18+0.12);o.start(ctx.currentTime+i*0.18);o.stop(ctx.currentTime+i*0.18+0.15);ambientNodes.push(o)})
    } else if(type==='space'){
      // Slow pad chord
      [196,247,294].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(0.025,ctx.currentTime+1.5);g.gain.linearRampToValueAtTime(0,ctx.currentTime+5);o.start();o.stop(ctx.currentTime+5);ambientNodes.push(o)})
    } else if(type==='body'){
      // Heartbeat
      [0,0.45].forEach(t=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=80;g.gain.setValueAtTime(0,ctx.currentTime+t);g.gain.linearRampToValueAtTime(0.08,ctx.currentTime+t+0.05);g.gain.linearRampToValueAtTime(0,ctx.currentTime+t+0.25);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+0.3);ambientNodes.push(o)})
    }
  }catch(e){}
}

// ================================================================
// GAME 1: AKU MERASA
// ================================================================
let g1State={}
function initGame1(){
  initHeartWorld()
  const diff=DIFF[state.selectedLevel]
  g1State={round:0,maxRound:diff.rounds,choices:diff.choices,correct:0,answered:false}
  state.currentPlayer=0; updateGameStarDisplay(); buildDots('g1-dots',diff.rounds,0); nextG1Round()
}
function nextG1Round(){
  const totalRounds=state.mode==='duo'?g1State.maxRound*2:g1State.maxRound
  if(g1State.round>=totalRounds){const perfect=g1State.correct>=g1State.maxRound;if(perfect)checkAchievements('perfect_g1');showResult('🎭','Emosi Berhasil!','Kamu mengenal banyak emosi sekarang! 🌟');return}
  if(state.mode==='duo'&&g1State.round===g1State.maxRound){state.currentPlayer=1;g1State.correct=0;updateGameStarDisplay();showFeedback(true,0,`Giliran ${state.players[1].name}! 🎮`,nextG1Round);return}
  g1State.answered=false; document.getElementById('g1-tip').style.display='none'
  const roundInSet=g1State.round%g1State.maxRound; buildDots('g1-dots',g1State.maxRound,roundInSet)
  const shuffled=[...EMOTIONS].sort(()=>Math.random()-0.5),correct=shuffled[0],numChoices=g1State.choices
  // Show scenario context for medium/hard levels
  const scenEl=document.getElementById('g1-scenario')
  if(scenEl){
    const lv=state.selectedLevelNum||1
    if(lv>=6 && correct.scenario){ scenEl.style.display='block'; scenEl.textContent='📖 '+correct.scenario }
    else { scenEl.style.display='none' }
  }
  const pool=shuffled.slice(0,numChoices).sort(()=>Math.random()-0.5)
  if(!pool.find(e=>e.name===correct.name))pool[0]=correct
  const choices=pool.sort(()=>Math.random()-0.5)
  const moodColor=correct.color||'#F43F5E'
  document.getElementById('g1-animal').innerHTML=`<span class="g1-char" style="filter:drop-shadow(0 0 28px ${moodColor}99) drop-shadow(0 8px 16px rgba(0,0,0,0.18));">${correct.animal}</span><span class="g1-emot-bubble">${correct.emoji}</span>`
  document.getElementById('g1-progress-bar').style.width=((roundInSet/g1State.maxRound)*100)+'%'
  const choicesEl=document.getElementById('g1-choices')
  choicesEl.style.gridTemplateColumns=numChoices<=3?'1fr 1fr 1fr':(numChoices<=4?'1fr 1fr':'1fr 1fr 1fr')
  if(numChoices===6)choicesEl.style.gridTemplateColumns='1fr 1fr 1fr'
  choicesEl.innerHTML=''
  choices.forEach(em=>{
    const btn=document.createElement('button'); btn.className='g1-choice-btn'
    btn.innerHTML=`<span class="choice-emoji">${em.emoji}</span><span class="choice-label">${em.name}</span>`
    btn.onclick=()=>{
      if(g1State.answered)return; g1State.answered=true
      const isCorrect=em.name===correct.name
      choicesEl.querySelectorAll('.g1-choice-btn').forEach(b=>{b.style.pointerEvents='none';if(b.querySelector('.choice-label').textContent===correct.name){b.classList.add('correct');if(!isCorrect)spawnCorrectCardJuice(b,{burst:false})}})
      if(!isCorrect){
        btn.classList.add('wrong');spawnWrongShake(btn);quizStreakReset();playWrong();flashScreen('red')
        const tipEl=document.getElementById('g1-tip'); tipEl.style.display='block'
        tipEl.innerHTML=`<span class="tip-icon">${correct.emoji}</span><div class="tip-text"><b>${correct.name}:</b> ${correct.scenario||correct.tip}<br><span style="font-size:12px;opacity:0.75">Tubuh: ${correct.bodyCue||''}</span></div>`
        g1State.round++; setTimeout(nextG1Round,3000)
      } else {
        playCorrect();spawnCorrectCardJuice(btn);quizStreakHit(btn);addStars(1,btn);flashScreen('green');g1State.correct++
        const tipEl=document.getElementById('g1-tip'); tipEl.style.display='block'
        tipEl.innerHTML=`<span class="tip-icon">${correct.animal}</span><div class="tip-text">${correct.tip}<br><span style="font-size:12px;opacity:0.75">👍 Aksi: ${correct.safeAction||''}</span></div>`
        g1State.round++; setTimeout(nextG1Round,2400)
      }
    }
    choicesEl.appendChild(btn)
  })
  if(state.mode==='duo')document.getElementById('g1-progress').textContent=`${state.players[state.currentPlayer].name}`
  else document.getElementById('g1-progress').textContent=''
}

// ================================================================
// GAME 2: NAPAS PELANGI
// ================================================================
const BREATHE_BOX=[
  {name:'Hirup... 🌬️',   sub:'Tarik napas pelan-pelan...',    dur:4,scaleTarget:1.55,color:'#A78BFA'},
  {name:'Tahan! ⏸️',     sub:'Tahan napasmu sebentar...',     dur:4,scaleTarget:1.55,color:'#8B5CF6'},
  {name:'Hembuskan! ☁️', sub:'Keluarkan napas pelan-pelan...',dur:4,scaleTarget:1.0, color:'#14B8A6'}
]
const BREATHE_ADVANCED=[
  {name:'Hirup... 🌬️',   sub:'Tarik napas pelan-pelan...',   dur:4,scaleTarget:1.55,color:'#A78BFA'},
  {name:'Tahan! ⏸️',     sub:'Tahan napasmu...',             dur:6,scaleTarget:1.55,color:'#8B5CF6'},
  {name:'Hembuskan! ☁️', sub:'Keluarkan napas perlahan...',  dur:8,scaleTarget:1.0, color:'#14B8A6'}
]
let g2Cycle=0,g2PhaseIdx=0,g2MaxCycles=3
function initGame2(){
  initCloudWorld(); clearTimers()
  const diff=DIFF[state.selectedLevel]; g2MaxCycles=diff.breatheCycles; g2Cycle=0; g2PhaseIdx=0
  document.getElementById('g2-instruction').textContent='Siap Bernapas?'
  document.getElementById('g2-timer').textContent='4'
  document.getElementById('g2-start-btn').style.display='flex'
  document.getElementById('g2-mascot').textContent=state.players[state.currentPlayer].animal
  document.getElementById('g2-player-icon').textContent=state.players[state.currentPlayer].animal
  document.getElementById('g2-stars').textContent='⭐ 0'
  const cyclesEl=document.getElementById('g2-cycles'); cyclesEl.innerHTML=''
  for(let i=0;i<g2MaxCycles;i++){const d=document.createElement('div');d.className='cycle-dot';d.id='cd'+i;cyclesEl.appendChild(d)}
  setCircleScale(1.0,'#A78BFA')
}
function setCircleScale(scale,color){
  document.getElementById('g2-ring1').style.transform=`scale(${scale})`
  document.getElementById('g2-ring2').style.transform=`scale(${scale})`
  document.getElementById('g2-ring1').style.background=`radial-gradient(circle,${color}55,${color}22)`
  document.getElementById('g2-ring2').style.background=`radial-gradient(circle,${color}99,${color}44)`
  document.getElementById('g2-mascot').style.transform=`scale(${0.85+scale*0.35})`
  document.getElementById('g2-ring1').style.boxShadow=`0 0 ${40*scale}px ${color}60`
}
function g2Speak(text){
  if(!window.speechSynthesis) return
  speechSynthesis.cancel()
  const u=new SpeechSynthesisUtterance(text)
  u.lang='id-ID'; u.rate=0.85; u.pitch=1.1; u.volume=0.9
  speechSynthesis.speak(u)
}
function startBreathing(){document.getElementById('g2-start-btn').style.display='none';g2Cycle=0;g2PhaseIdx=0;runBreathePhase()}
function runBreathePhase(){
  if(g2Cycle>=g2MaxCycles){try{playCorrect()}catch(_){}addStars(3);setCircleScale(1.0,'#14B8A6');document.getElementById('g2-instruction').textContent='Luar biasa! 🌟';document.getElementById('g2-sub').textContent='Napasmu sangat bagus!';document.getElementById('g2-timer').textContent='😊';checkAchievements('done_g2');const doneMsg=state.mode==='duo'?'Kalian bernapas bersama dengan indah! 🌈':'Kamu lebih tenang sekarang! 🌈';showFeedback(true,3,doneMsg,()=>showResult('🌬️','Napas Pelangi!',doneMsg));return}
  const phases=state.selectedLevel==='hard'?BREATHE_ADVANCED:BREATHE_BOX,ph=phases[g2PhaseIdx]
  const startScale=g2PhaseIdx===2?1.55:(g2PhaseIdx===1?1.55:1.0)
  document.getElementById('g2-instruction').textContent=ph.name; document.getElementById('g2-sub').textContent=ph.sub
  g2Speak(ph.name)
  if(g2PhaseIdx===0)playBreathIn(); else if(g2PhaseIdx===2)playBreathOut()
  let sec=ph.dur,elapsed=0; document.getElementById('g2-timer').textContent=sec
  state.breatheInterval=setInterval(()=>{elapsed++;sec--;const prog=elapsed/ph.dur,scale=startScale+(ph.scaleTarget-startScale)*prog;setCircleScale(scale,ph.color);document.getElementById('g2-timer').textContent=Math.max(0,sec);if(elapsed>=ph.dur){clearInterval(state.breatheInterval);g2PhaseIdx++;if(g2PhaseIdx>=phases.length){g2PhaseIdx=0;g2Cycle++;const dot=document.getElementById('cd'+(g2Cycle-1));if(dot)dot.classList.add('done')}setTimeout(runBreathePhase,400)}},1000)
}

// ================================================================
// GAME 3: HURUF HUTAN
// ================================================================
let g3State={}
function initGame3(){
  initJungleWorld()
  const diff=DIFF[state.selectedLevel]
  const tier=state.players[state.currentPlayer].ageTier||'tumbuh'
  const letters=getAgeLetters(tier)
  g3State={round:0,maxRound:diff.rounds,choices:diff.choices,correct:0,answered:false,shuffled:[...letters].sort(()=>Math.random()-0.5)}
  state.currentPlayer=0; updateGameStarDisplay(); buildDots('g3-dots',diff.rounds,0); nextG3Round()
}
function nextG3Round(){
  const totalRounds=state.mode==='duo'?g3State.maxRound*2:g3State.maxRound
  if(g3State.round>=totalRounds){const perfect=g3State.correct>=g3State.maxRound;if(perfect)checkAchievements('perfect_g3');showResult('🔤','Huruf Hutan Selesai!','Kamu jago mengenal huruf dan angka! 📚');return}
  if(state.mode==='duo'&&g3State.round===g3State.maxRound){state.currentPlayer=1;g3State.correct=0;g3State.shuffled=[...ANIMAL_LETTERS].sort(()=>Math.random()-0.5);updateGameStarDisplay();showFeedback(true,0,`Giliran ${state.players[1].name}! 🎮`,nextG3Round);return}
  g3State.answered=false; const roundInSet=g3State.round%g3State.maxRound; buildDots('g3-dots',g3State.maxRound,roundInSet)
  const isLetterMode=(roundInSet/g3State.maxRound)<0.6
  const item=g3State.shuffled[roundInSet%g3State.shuffled.length],numChoices=g3State.choices
  g3State.currentItem=item; g3State.isLetterMode=isLetterMode
  document.getElementById('g3-mode-badge').textContent=isLetterMode?'Level: Huruf 🔤':'Level: Angka 🔢'
  document.getElementById('g3-animal').textContent=item.animal
  document.getElementById('g3-progress-bar').style.width=((roundInSet/g3State.maxRound)*100)+'%'
  if(isLetterMode){
    document.getElementById('g3-word').innerHTML=item.word.split('').map((ch,i)=>i===0?`<span class="g3-letter g3-blank" id="g3-ltr-${i}">_</span>`:`<span class="g3-letter" id="g3-ltr-${i}">${ch}</span>`).join('')
    document.getElementById('g3-hint').textContent=`💡 ${item.hint}`
    const wrongLetters=ALL_LETTERS.split('').filter(l=>l!==item.letter).sort(()=>Math.random()-0.5).slice(0,numChoices-1)
    renderG3Choices([item.letter,...wrongLetters].sort(()=>Math.random()-0.5),item.letter,false,numChoices)
  } else {
    const maxNum=state.selectedLevel==='hard'?9:8,displayCount=Math.min(item.num,9)
    document.getElementById('g3-word').textContent=item.animal.repeat(displayCount)
    document.getElementById('g3-hint').textContent=`Ada berapa ${item.word.toLowerCase()} di atas?`
    const correctNum=displayCount,wrongs=new Set()
    while(wrongs.size<numChoices-1){const r=Math.max(1,Math.min(maxNum,correctNum+Math.floor(Math.random()*6)-3));if(r!==correctNum)wrongs.add(r)}
    renderG3Choices([correctNum,...[...wrongs]].sort(()=>Math.random()-0.5).map(String),String(correctNum),true,numChoices)
  }
  const p=state.mode==='duo'?`${state.players[state.currentPlayer].name} — ${roundInSet+1}/${g3State.maxRound}`:`${roundInSet+1} / ${g3State.maxRound}`
  document.getElementById('g3-progress').textContent=p; g3State.round++
}
function renderG3Choices(choices,correctVal,isNum,numChoices){
  const el=document.getElementById('g3-choices')
  el.style.gridTemplateColumns=numChoices<=3?'1fr 1fr 1fr':(numChoices<=4?'1fr 1fr':'1fr 1fr 1fr')
  el.innerHTML=''
  choices.slice(0,numChoices).forEach(ch=>{
    const btn=document.createElement('button'); btn.className='g3-choice-btn'; btn.textContent=ch
    if(numChoices>4) btn.style.fontSize='32px'
    btn.onclick=()=>{
      if(g3State.answered)return;g3State.answered=true
      const correct=ch===correctVal
      el.querySelectorAll('.g3-choice-btn').forEach(b=>{b.style.pointerEvents='none';if(b.textContent===correctVal){b.classList.add('correct');if(!correct)spawnCorrectCardJuice(b,{burst:false})}})
      const hintEl=document.getElementById('g3-hint')
      if(!correct){
        btn.classList.add('wrong');spawnWrongShake(btn);quizStreakReset();playWrong();flashScreen('red')
        const it=g3State.currentItem
        if(g3State.isLetterMode && it){
          hintEl.innerHTML=`💡 <b>${correctVal}</b>... seperti <b>${it.animal} ${it.word}</b>. Kata ini mulai dengan huruf <b>${correctVal}</b>!`
        } else if(it){
          hintEl.innerHTML=`💡 Coba hitung lagi: ada <b>${it.num}</b> ${it.animal} di atas!`
        }
        setTimeout(nextG3Round,2000)
      }else{
        if(g3State.isLetterMode){const ltr=document.getElementById('g3-ltr-0');if(ltr){ltr.classList.remove('g3-blank');ltr.textContent=g3State.currentItem.word[0];ltr.classList.add('highlight')}}
        playCorrect();spawnCorrectCardJuice(btn);quizStreakHit(btn);addStars(1,btn);flashScreen('green');g3State.correct++
        setTimeout(nextG3Round,1300)
      }
    }
    el.appendChild(btn)
  })
}

// ================================================================
// GAME 4: HITUNG BINATANG
// ================================================================
let g4State={}
function initGame4(){
  initSavannaWorld()
  const diff=DIFF[state.selectedLevel]
  const tier=state.players[state.currentPlayer].ageTier||'tumbuh'
  g4State={round:0,maxRound:diff.rounds,timerSec:diff.timer,choices:diff.choices,correct:0,answered:false,maxCount:getAgeMaxCount(tier),pokemonMode:false,currentCount:0,currentAnimal:'',currentPoke:null,currentChoices:[]}
  state.currentPlayer=0; updateGameStarDisplay(); buildDots('g4-dots',diff.rounds,0)
  // Reset toggle buttons
  document.getElementById('g4-btn-normal').classList.add('active')
  document.getElementById('g4-btn-poke').classList.remove('active')
  nextG4Round()
}
function setG4Mode(isPoke){
  g4State.pokemonMode=isPoke
  document.getElementById('g4-btn-normal').classList.toggle('active',!isPoke)
  document.getElementById('g4-btn-poke').classList.toggle('active',isPoke)
  document.getElementById('g4-mg').textContent=isPoke?'Hitung semua Pokémon-nya ya! 🎮':'Hitung semua binatangnya ya! 🔢'
  if(g4State.currentCount>0){
    clearInterval(state.g4Timer); g4State.answered=false
    renderG4Content(); startG4Timer()
  }
}
function nextG4Round(){
  clearInterval(state.g4Timer)
  const totalRounds=state.mode==='duo'?g4State.maxRound*2:g4State.maxRound
  if(g4State.round>=totalRounds){const perfect=g4State.correct>=g4State.maxRound;if(perfect)checkAchievements('perfect_g4');showResult('🔢','Hitung Selesai!','Kamu jago menghitung! 🔢✨');return}
  if(state.mode==='duo'&&g4State.round===g4State.maxRound){state.currentPlayer=1;g4State.correct=0;updateGameStarDisplay();showFeedback(true,0,`Giliran ${state.players[1].name}! 🎮`,nextG4Round);return}
  g4State.answered=false; g4State.round++
  const roundInSet=(g4State.round-1)%g4State.maxRound; buildDots('g4-dots',g4State.maxRound,roundInSet)
  document.getElementById('g4-progress-bar').style.width=((roundInSet/g4State.maxRound)*100)+'%'
  document.getElementById('g4-progress').textContent=state.mode==='duo'?`${state.players[state.currentPlayer].name} — ${roundInSet+1}/${g4State.maxRound}`:`${roundInSet+1} / ${g4State.maxRound}`
  const maxCount=g4State.maxCount
  g4State.currentCount=1+Math.floor(Math.random()*maxCount)
  // Rotate category every 3 rounds for variety: hewan → buah → benda → ...
  const catIdx=Math.floor((g4State.round-1)/3)%3
  g4State.catIdx=catIdx
  const catPool=[ANIMALS_G4,FRUITS_G4,OBJECTS_G4][catIdx]
  g4State.currentAnimal=catPool[Math.floor(Math.random()*catPool.length)]
  // Pokemon mode: pick target + 2 distractor types, each 1-2 copies
  const pokeIdx=Math.floor(Math.random()*POKEMON_G4.length)
  g4State.currentPoke=POKEMON_G4[pokeIdx]
  const otherPokes=POKEMON_G4.filter((_,i)=>i!==pokeIdx).sort(()=>Math.random()-0.5)
  g4State.distractors=otherPokes.slice(0,2).map(p=>({poke:p,count:1+Math.floor(Math.random()*2)}))
  const wrongs=new Set()
  while(wrongs.size<g4State.choices-1){const r=Math.max(1,Math.min(maxCount,g4State.currentCount+Math.floor(Math.random()*6)-3));if(r!==g4State.currentCount)wrongs.add(r)}
  g4State.currentChoices=[g4State.currentCount,...[...wrongs]].sort(()=>Math.random()-0.5)
  renderG4Content(); startG4Timer()
}
function renderG4Content(){
  const {currentCount:count,currentAnimal,currentPoke,pokemonMode,choices:numChoices}=g4State
  // Render grid
  const grid=document.getElementById('g4-animals'); grid.innerHTML=''
  if(pokemonMode&&currentPoke){
    // Build mixed grid: count copies of target + distractor copies, then shuffle
    const items=[]
    for(let i=0;i<count;i++) items.push(currentPoke)
    const distractors=g4State.distractors||[]
    distractors.forEach(d=>{ for(let i=0;i<d.count;i++) items.push(d.poke) })
    items.sort(()=>Math.random()-0.5)
    // Dynamic size: shrink sprites when many items
    const totalItems = items.length
    const sprSize = totalItems > 12 ? 'clamp(30px,8vw,44px)' : totalItems > 8 ? 'clamp(36px,10vw,52px)' : 'clamp(40px,12vw,64px)'
    items.forEach((poke,i)=>{
      const img=document.createElement('img')
      img.className='g4-animal-item g4-poke-img'
      img.style.width=sprSize; img.style.height=sprSize
      // Hotfix #104 (2026-04-28): shared cascade.
      const slug = poke.name.toLowerCase().replace(/[^a-z0-9-]/g,'')
      if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
        attachSpriteCascade(img, buildPokeSources(slug, poke.id), '🐾')
      } else {
        img.src = `assets/Pokemon/sprites/${slug}.png`
      }
      img.alt=poke.name
      img.style.animationDelay=(i*55)+'ms'
      if(poke.id!==currentPoke.id) img.style.opacity='0.75'
      grid.appendChild(img)
    })
    document.getElementById('g4-question').textContent=`Ada berapa "${currentPoke.name}"? ⚡`
  } else {
    for(let i=0;i<count;i++){const s=document.createElement('span');s.className='g4-animal-item';s.textContent=currentAnimal;s.style.animationDelay=(i*55)+'ms';grid.appendChild(s)}
    // Category-aware label matches the rotating catPool (hewan → buah → benda)
    const _g4CatLabels=['binatang','buah','benda']
    const _g4CatLabel=_g4CatLabels[g4State.catIdx]||'barang'
    document.getElementById('g4-question').textContent=`Ada berapa ${_g4CatLabel}? 🤔`
  }
  // Render choices
  const choicesEl=document.getElementById('g4-choices'); choicesEl.innerHTML=''
  g4State.currentChoices.forEach(ch=>{
    const btn=document.createElement('button'); btn.className='g4-choice-btn'; btn.textContent=ch
    if(numChoices>4)btn.style.fontSize='26px'
    btn.onclick=()=>{if(g4State.answered)return;g4State.answered=true;clearInterval(state.g4Timer);const correct=ch===count;choicesEl.querySelectorAll('.g4-choice-btn').forEach(b=>{b.style.pointerEvents='none';if(parseInt(b.textContent)===count){b.classList.add('correct');if(!correct)spawnCorrectCardJuice(b,{burst:false})}});if(!correct){btn.classList.add('wrong');spawnWrongShake(btn);quizStreakReset();playWrong();flashScreen('red')}else{playCorrect();spawnCorrectCardJuice(btn);quizStreakHit(btn);addStars(1,btn);flashScreen('green');g4State.correct++};setTimeout(nextG4Round,1300)}
    choicesEl.appendChild(btn)
  })
}
function startG4Timer(){
  const fill=document.getElementById('g4-fill'),count=g4State.currentCount
  fill.style.width='100%'; fill.style.background='linear-gradient(90deg,#F59E0B,#FCD34D)'
  let timeLeft=g4State.timerSec
  document.getElementById('g4-timer-text').textContent=timeLeft+' detik'
  state.g4Timer=setInterval(()=>{
    timeLeft--;const pct=(timeLeft/g4State.timerSec)*100;fill.style.width=pct+'%'
    if(timeLeft<=Math.floor(g4State.timerSec*0.35))fill.style.background='linear-gradient(90deg,#F43F5E,#F59E0B)'
    document.getElementById('g4-timer-text').textContent=timeLeft+' detik'
    if(timeLeft<=0){clearInterval(state.g4Timer);if(!g4State.answered){g4State.answered=true;const choicesEl=document.getElementById('g4-choices');choicesEl.querySelectorAll('.g4-choice-btn').forEach(b=>{b.style.pointerEvents='none';if(parseInt(b.textContent)===count)b.classList.add('correct')});playWrong();flashScreen('red');setTimeout(nextG4Round,1300)}}
  },1000)
}

// ================================================================
// GAME 5: MEMORY PINTAR (4 modes)
// ================================================================
let g5State={}, g5Mode='visual', g5SubMode='emosi'

function setG5Mode(mode,btn){
  if(g5State && g5State.started && g5State.flipped!==undefined) return
  g5Mode=mode; playClick(); clearTimers()
  document.querySelectorAll('.g5-mode-tab').forEach(t=>t.classList.remove('active'))
  if(btn) btn.classList.add('active')
  const isVisual=mode==='visual'
  document.getElementById('g5-sub-tabs').style.display=isVisual?'flex':'none'
  document.getElementById('g5-scores').style.display=isVisual?'flex':'none'
  document.getElementById('g5-turn-text').style.display=isVisual?'block':'none'
  document.getElementById('g5-grid').style.display=isVisual?'grid':'none'
  document.getElementById('g5-alt-display').style.display=isVisual?'none':'flex'
  // Route to correct mode init — do NOT call initGame5() which resets g5Mode to 'visual'
  if(mode==='visual') initG5Visual()
  else if(mode==='numeric') initG5Numeric()
  else if(mode==='spatial') initG5Spatial()
  else if(mode==='sequence') initG5Sequence()
}
function setG5SubModeAndOpen(subMode) {
  g5SubMode = subMode
  openLevelSelect(5)
}
function setG5SubMode(sub,btn){
  g5SubMode=sub; playClick()
  document.querySelectorAll('.g5-sub-tab').forEach(t=>t.classList.remove('active'))
  if(btn) btn.classList.add('active')
  const scr=document.getElementById('screen-game5')
  if(scr){
    scr.classList.remove('theme-hewan','theme-buah','theme-poke')
    if(sub==='hewan') scr.classList.add('theme-hewan')
    else if(sub==='buah') scr.classList.add('theme-buah')
    else if(sub==='pokemon') scr.classList.add('theme-poke')
  }
  initG5Visual()
}

function initGame5(){
  initDreamWorld(); clearTimers(); g5Mode='visual'; g5SubMode='emosi'
  // Reset tab UI
  document.querySelectorAll('.g5-mode-tab').forEach((t,i)=>t.classList.toggle('active',i===0))
  document.querySelectorAll('.g5-sub-tab').forEach((t,i)=>t.classList.toggle('active',i===0))
  const scr=document.getElementById('screen-game5')
  if(scr) scr.classList.remove('theme-hewan','theme-buah','theme-poke')
  initG5Visual()
}

// ── Mode 1: Visual (card flip matching) ──
function initG5Visual(){
  // Ensure correct DOM visibility for visual mode
  const sub=document.getElementById('g5-sub-tabs'),sc=document.getElementById('g5-scores'),tt=document.getElementById('g5-turn-text'),gr=document.getElementById('g5-grid'),alt=document.getElementById('g5-alt-display')
  if(sub) sub.style.display='flex'
  if(sc) sc.style.display='flex'
  if(tt) tt.style.display='block'
  if(gr) gr.style.display='grid'
  if(alt) alt.style.display='none'
  const diff=state.selectedLevel
  let totalPairs,gridClass
  if(diff==='easy'){totalPairs=6;gridClass='grid-3x4'}
  else if(diff==='hard'){totalPairs=10;gridClass='grid-4x5'}
  else{totalPairs=8;gridClass=''}
  g5State={cards:[],flipped:[],matched:0,totalPairs,scores:[0,0],currentPlayer:state.currentPlayer,locked:false}
  const flat=[]
  if(g5SubMode==='pokemon'){
    // Sprite (A) ↔ Name text (B) — educational matching
    MATCH_PAIRS_POKE.slice(0,totalPairs).forEach(p=>{
      flat.push({id:p.id,slug:p.slug,label:p.name,flipped:false,matched:false,cardSide:'A'})
      flat.push({id:p.id,slug:p.slug,label:p.name,flipped:false,matched:false,cardSide:'B'})
    })
  } else if(['hewan','buah','sayur','kendaraan','warna','benda','profesi','alam','cuaca','makanan','sekolah'].includes(g5SubMode)){
    // Emoji (A) ↔ Name word (B) — educational matching
    const srcMap={hewan:MATCH_PAIRS_HEWAN,buah:MATCH_PAIRS_BUAH,sayur:MATCH_PAIRS_SAYUR,
      kendaraan:MATCH_PAIRS_KENDARAAN,warna:MATCH_PAIRS_WARNA,benda:MATCH_PAIRS_BENDA,
      profesi:MATCH_PAIRS_PROFESI,alam:MATCH_PAIRS_ALAM,cuaca:MATCH_PAIRS_CUACA,
      makanan:MATCH_PAIRS_MAKANAN,sekolah:MATCH_PAIRS_SEKOLAH}
    const src=srcMap[g5SubMode]||MATCH_PAIRS_HEWAN
    src.slice(0,totalPairs).forEach(item=>{
      flat.push({...item,flipped:false,matched:false,cardSide:'A'})
      flat.push({...item,flipped:false,matched:false,cardSide:'B'})
    })
  } else {
    let pool
    if(diff==='easy') pool=MATCH_PAIRS.slice(0,totalPairs)
    else if(diff==='hard') pool=[...MATCH_PAIRS_NUMS.slice(0,5),...MATCH_PAIRS_ALPHA.slice(0,5)]
    else pool=[...MATCH_PAIRS.slice(0,4),...MATCH_PAIRS_NUMS.slice(0,4)]
    pool.slice(0,totalPairs).forEach(item=>{
      const isEdu=!!(item.emoji2)
      flat.push({...item,flipped:false,matched:false,cardSide:'A'})
      flat.push({...item,emoji:isEdu?item.emoji2:item.emoji,label:isEdu?item.label2:item.label,flipped:false,matched:false,cardSide:'B'})
    })
  }
  g5State.cards=flat.sort(()=>Math.random()-0.5).map((c,i)=>({...c,idx:i}))
  const turnTexts={emosi:'Cocokkan semua pasangan! 🃏',hewan:'Cocokkan gambar & nama hewan! 🐾',buah:'Cocokkan gambar & nama buah! 🍎',sayur:'Cocokkan gambar & nama sayur! 🥕',kendaraan:'Cocokkan kendaraan! 🚗',warna:'Cocokkan nama warna! 🌈',benda:'Cocokkan nama benda! 📦',profesi:'Cocokkan nama profesi! 👩‍⚕️',alam:'Cocokkan gambar alam! 🏔️',cuaca:'Cocokkan jenis cuaca! ⛅',makanan:'Cocokkan nama makanan! 🍜',sekolah:'Cocokkan alat sekolah! 🏫',pokemon:'Cocokkan gambar Pokémon yang sama! ⚡'}
  const scoresEl=document.getElementById('g5-scores')
  if(state.mode==='duo'){scoresEl.innerHTML=[0,1].map(i=>`<div class="g5-player-score ${i===g5State.currentPlayer?'active':''}" id="g5-ps-${i}"><div class="ps-name">${state.players[i].animal} ${state.players[i].name}</div><div class="ps-val" id="g5-score-${i}">0 pasang</div></div>`).join('');document.getElementById('g5-turn-text').textContent=`Giliran ${state.players[g5State.currentPlayer].name}! 🎮`}
  else{scoresEl.innerHTML=`<div class="g5-player-score active" style="flex:none;width:100%;max-width:520px;"><div class="ps-name">${state.players[0].animal} ${state.players[0].name}</div><div class="ps-val" id="g5-score-0">0 pasang</div></div>`;document.getElementById('g5-turn-text').textContent=''}
  const grid=document.getElementById('g5-grid')
  grid.className='g5-grid'+(gridClass?' '+gridClass:'')
  renderG5Grid()
}
function renderG5Grid(){
  const grid=document.getElementById('g5-grid'); grid.innerHTML=''
  g5State.cards.forEach((card,idx)=>{
    const el=document.createElement('div'); el.className='g5-card'
    let back
    if(g5SubMode==='pokemon'){
      if(card.cardSide==='A'){
        // Side A: HD artwork
        const hdSrc=`https://img.pokemondb.net/sprites/home/normal/${card.slug}.png`
        const fbSrc=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${card.id}.png`
        back=`<img class="g5-poke-img" style="width:72px;height:72px;image-rendering:auto;object-fit:contain" src="${hdSrc}" onerror="this.src='${fbSrc}'" alt="${card.label}" loading="lazy">`
      } else {
        // Side B: same HD HOME sprite — consistent art style
        const hdSrc2=`https://img.pokemondb.net/sprites/home/normal/${card.slug}.png`
        const fbSrc2=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${card.id}.png`
        back=`<img class="g5-poke-img" style="width:72px;height:72px;image-rendering:auto;object-fit:contain" src="${hdSrc2}" onerror="this.src='${fbSrc2}'" alt="${card.label}" loading="lazy">`
      }
    } else if(['hewan','buah','sayur','kendaraan','warna','benda','profesi','alam','cuaca','makanan','sekolah'].includes(g5SubMode)){
      if(card.cardSide==='A'){
        back=`<span style="font-size:52px;line-height:1">${card.emoji}</span>`
      } else {
        back=`<span style="font-size:52px;line-height:1">${card.emoji}</span>`
      }
    } else {
      const isLetter=card.cardSide==='A'&&typeof card.id==='string'&&card.id.startsWith('l')
      const eStyle=isLetter?'font-size:48px;font-weight:900;color:#8B5CF6;font-family:var(--font);line-height:1':''
      back=`<span class="card-emoji" style="${eStyle}">${card.emoji}</span><span class="card-label">${card.label}</span>`
    }
    el.innerHTML=`<div class="g5-card-front"></div><div class="g5-card-back">${back}</div>`
    el.onclick=()=>flipG5Card(idx,el); grid.appendChild(el); card.el=el
  })
}

// ── Mode 2: Numeric Memory ──
let g5NumState={}
function initG5Numeric(){
  const alt=document.getElementById('g5-alt-display')
  alt.style.display='flex'; alt.innerHTML=''
  const diff=state.selectedLevel
  const count=diff==='easy'?4:diff==='hard'?9:6
  const cols=diff==='easy'?2:3
  const nums=Array.from({length:count},(_,i)=>i+1).sort(()=>Math.random()-0.5)
  g5NumState={numbers:nums,revealed:true,nextToTap:1,round:1,maxRound:5,count,cols}
  const instr=document.createElement('p'); instr.className='g5-alt-label'; instr.id='g5-num-instr'
  instr.textContent=`Ingat posisi angka, lalu ketuk dari 1 → ${count}! 🔢`
  alt.appendChild(instr)
  const prog=document.createElement('p'); prog.className='g5-alt-sub'; prog.id='g5-num-prog'
  prog.textContent=`Ronde 1/${g5NumState.maxRound} — Hafalkan dalam 3 detik...`
  alt.appendChild(prog)
  const grid=document.createElement('div'); grid.className='g5-num-grid'; grid.id='g5-num-grid'
  grid.style.gridTemplateColumns=`repeat(${cols},1fr)`
  nums.forEach((num,i)=>{
    const cell=document.createElement('div'); cell.className='g5-num-cell'
    cell.dataset.num=num; cell.dataset.i=i
    cell.innerHTML=`<div class="ncell-front">${num}</div><div class="ncell-back">${num}</div>`
    cell.onclick=()=>tapG5NumCell(cell,num)
    grid.appendChild(cell)
  })
  alt.appendChild(grid)
  setTimeout(()=>{
    if(g5Mode!=='numeric') return
    grid.querySelectorAll('.g5-num-cell').forEach(c=>c.classList.add('face-down'))
    g5NumState.revealed=false
    const p=document.getElementById('g5-num-prog'); if(p) p.textContent=`Ketuk angka 1 → ${count} secara berurutan!`
  },3000)
}
function tapG5NumCell(cell,num){
  if(g5NumState.revealed||cell.classList.contains('correct-tap')) return
  if(num===g5NumState.nextToTap){
    cell.classList.add('correct-tap'); playCorrect()
    g5NumState.nextToTap++
    if(g5NumState.nextToTap>g5NumState.count){
      addStars(1); spawnSparkles()
      if(g5NumState.round>=g5NumState.maxRound){
        setTimeout(()=>showResult('🔢','Memory Angka!',`Kamu ingat semua urutan dalam ${g5NumState.maxRound} ronde! 🧠`),800)
      } else {
        g5NumState.round++
        const p=document.getElementById('g5-num-prog'); if(p) p.textContent=`✨ Ronde ${g5NumState.round}/${g5NumState.maxRound} — Hafalkan!`
        setTimeout(()=>{ if(g5Mode==='numeric') initG5Numeric() },1200)
      }
    }
  } else {
    cell.classList.add('wrong-tap'); playWrong(); flashScreen('red')
    if(navigator.vibrate) navigator.vibrate(200)
    setTimeout(()=>cell.classList.remove('wrong-tap'),450)
    // Briefly reveal all as hint
    const grid=document.getElementById('g5-num-grid'); if(!grid) return
    grid.querySelectorAll('.g5-num-cell:not(.correct-tap)').forEach(c=>c.classList.remove('face-down'))
    g5NumState.revealed=true
    setTimeout(()=>{
      grid.querySelectorAll('.g5-num-cell:not(.correct-tap)').forEach(c=>c.classList.add('face-down'))
      g5NumState.revealed=false
    },1500)
  }
}

// ── Mode 3: Spatial Memory ──
let g5SpatState={}
function initG5Spatial(){
  const alt=document.getElementById('g5-alt-display')
  alt.style.display='flex'; alt.innerHTML=''
  const diff=state.selectedLevel
  const sz=diff==='easy'?3:diff==='hard'?5:4
  const lit=diff==='easy'?3:diff==='hard'?8:5
  g5SpatState={sz,lit,pattern:[],taps:[],phase:'show',round:1,maxRound:5}
  const instr=document.createElement('p'); instr.className='g5-alt-label'; instr.id='g5-spat-instr'
  instr.textContent=`Ingat ${lit} kotak yang menyala! 💡`; alt.appendChild(instr)
  const prog=document.createElement('p'); prog.className='g5-alt-sub'; prog.id='g5-spat-prog'
  prog.textContent=`Ronde 1/${g5SpatState.maxRound}`; alt.appendChild(prog)
  const grid=document.createElement('div'); grid.className='g5-spatial-grid'; grid.id='g5-spat-grid'
  grid.style.cssText=`grid-template-columns:repeat(${sz},1fr);max-width:${sz*68}px`
  for(let i=0;i<sz*sz;i++){
    const c=document.createElement('div'); c.className='g5-spatial-cell'; c.dataset.i=i
    c.onclick=()=>tapG5SpatCell(i,c); grid.appendChild(c)
  }
  alt.appendChild(grid)
  showG5SpatPattern()
}
function showG5SpatPattern(){
  const {sz,lit}=g5SpatState
  const total=sz*sz, pat=[]
  while(pat.length<lit){const r=Math.floor(Math.random()*total);if(!pat.includes(r))pat.push(r)}
  g5SpatState.pattern=pat; g5SpatState.taps=[]; g5SpatState.phase='show'
  const grid=document.getElementById('g5-spat-grid'); if(!grid) return
  const cells=grid.querySelectorAll('.g5-spatial-cell')
  cells.forEach(c=>c.className='g5-spatial-cell')
  pat.forEach(i=>{ if(cells[i]) cells[i].classList.add('lit') })
  const instr=document.getElementById('g5-spat-instr'); if(instr) instr.textContent=`Ingat ${lit} kotak yang menyala! 💡`
  setTimeout(()=>{
    if(g5Mode!=='spatial') return
    cells.forEach(c=>c.classList.remove('lit'))
    g5SpatState.phase='recall'
    if(instr) instr.textContent=`Ketuk kotak yang tadi menyala! (0/${lit})`
  },2200)
}
function tapG5SpatCell(idx,cell){
  if(g5SpatState.phase!=='recall'||g5SpatState.taps.includes(idx)) return
  g5SpatState.taps.push(idx)
  const isOk=g5SpatState.pattern.includes(idx)
  cell.classList.add(isOk?'correct-tap':'wrong-tap')
  if(isOk) playCorrect(); else { playWrong(); if(navigator.vibrate) navigator.vibrate(150) }
  const okTaps=g5SpatState.taps.filter(t=>g5SpatState.pattern.includes(t)).length
  const badTaps=g5SpatState.taps.filter(t=>!g5SpatState.pattern.includes(t)).length
  const instr=document.getElementById('g5-spat-instr')
  if(instr) instr.textContent=`Ketuk kotak yang tadi menyala! (${okTaps}/${g5SpatState.lit})`
  if(okTaps===g5SpatState.lit||badTaps>2){
    g5SpatState.phase='done'
    if(okTaps===g5SpatState.lit){ addStars(1); spawnSparkles() } else flashScreen('red')
    const grid=document.getElementById('g5-spat-grid')
    if(grid){ const cells=grid.querySelectorAll('.g5-spatial-cell'); g5SpatState.pattern.forEach(i=>{ if(cells[i]) cells[i].classList.add('lit') }) }
    if(g5SpatState.round>=g5SpatState.maxRound){
      setTimeout(()=>showResult('📍','Memory Posisi!',`Kamu kuasai ${g5SpatState.maxRound} pola lokasi! 🧠`),1200)
    } else {
      g5SpatState.round++
      const prog=document.getElementById('g5-spat-prog'); if(prog) prog.textContent=`Ronde ${g5SpatState.round}/${g5SpatState.maxRound}`
      setTimeout(()=>{ if(g5Mode==='spatial') showG5SpatPattern() },1600)
    }
  }
}

// ── Mode 4: Sequence Memory (Simon Says) ──
let g5SeqState={}
const G5_SEQ_TONES=[523,659,784,988]
function initG5Sequence(){
  const alt=document.getElementById('g5-alt-display')
  alt.style.display='flex'; alt.innerHTML=''
  g5SeqState={seq:[],playerSeq:[],length:1,round:0,maxRound:8,playerTurn:false}
  const status=document.createElement('div'); status.className='g5-alt-label'; status.id='g5-seq-status'
  status.textContent='Siap? Ikuti urutan warnanya! 🎮'; alt.appendChild(status)
  const lvl=document.createElement('div'); lvl.className='g5-seq-level'; lvl.id='g5-seq-lvl'
  lvl.textContent='Level 1'; alt.appendChild(lvl)
  const grid=document.createElement('div'); grid.className='g5-seq-grid'; grid.id='g5-seq-grid'
  for(let i=0;i<4;i++){
    const btn=document.createElement('button'); btn.className='g5-seq-btn'; btn.dataset.c=i
    btn.onclick=()=>tapG5SeqBtn(i); grid.appendChild(btn)
  }
  alt.appendChild(grid)
  const sub=document.createElement('p'); sub.className='g5-alt-sub'; sub.id='g5-seq-sub'
  sub.textContent='Ikuti urutan warna yang muncul'; alt.appendChild(sub)
  setTimeout(()=>nextG5SeqRound(),800)
}
function nextG5SeqRound(){
  if(g5Mode!=='sequence') return
  g5SeqState.round++; g5SeqState.seq.push(Math.floor(Math.random()*4))
  g5SeqState.playerSeq=[]; g5SeqState.playerTurn=false
  const lvl=document.getElementById('g5-seq-lvl'); if(lvl) lvl.textContent=`Level ${g5SeqState.round}`
  const s=document.getElementById('g5-seq-status'); if(s) s.textContent='Perhatikan... 👀'
  playG5Seq()
}
function playG5Seq(){
  let i=0
  const next=()=>{
    if(g5Mode!=='sequence') return
    if(i>=g5SeqState.seq.length){
      g5SeqState.playerTurn=true
      const s=document.getElementById('g5-seq-status'); if(s) s.textContent='Sekarang giliranmu! 👆'
      return
    }
    const c=g5SeqState.seq[i]
    flashG5Btn(c,()=>{ i++; setTimeout(next,300) })
  }
  setTimeout(next,600)
}
function flashG5Btn(c,cb){
  const btn=document.querySelector(`#g5-seq-grid [data-c="${c}"]`)
  if(!btn){ cb(); return }
  btn.classList.add('active'); playTone(G5_SEQ_TONES[c],0.45,'sine',0.12)
  setTimeout(()=>{ btn.classList.remove('active'); cb() },600)
}
function tapG5SeqBtn(c){
  if(!g5SeqState.playerTurn) return
  const expected=g5SeqState.seq[g5SeqState.playerSeq.length]
  g5SeqState.playerSeq.push(c); flashG5Btn(c,()=>{})
  if(c!==expected){
    playWrong(); flashScreen('red'); if(navigator.vibrate) navigator.vibrate(250)
    g5SeqState.playerTurn=false; g5SeqState.playerSeq=[]
    const s=document.getElementById('g5-seq-status'); if(s) s.textContent='Salah! Ulangi urutan... 🔁'
    setTimeout(()=>{ if(g5Mode==='sequence') playG5Seq() },1200)
    return
  }
  if(g5SeqState.playerSeq.length===g5SeqState.seq.length){
    playCorrect(); spawnSparkles(); addStars(1)
    const s=document.getElementById('g5-seq-status'); if(s) s.textContent='Benar! ✨'
    if(g5SeqState.round>=g5SeqState.maxRound){
      setTimeout(()=>showResult('🔗','Memory Urutan!',`Kamu hafal urutan hingga ${g5SeqState.round} langkah! 🧠`),800)
    } else { setTimeout(()=>nextG5SeqRound(),1200) }
  }
}
function flipG5Card(idx,el){
  if(g5State.locked)return; const card=g5State.cards[idx]
  if(card.flipped||card.matched||g5State.flipped.length>=2)return
  el.classList.add('tapping')
  setTimeout(()=>{
    el.classList.remove('tapping')
    card.flipped=true; el.classList.add('flipped'); playClick(); g5State.flipped.push(idx)
    if(g5State.flipped.length===2){g5State.locked=true;setTimeout(checkG5Match,900)}
  },130)
}
function checkG5Match(){
  const[i1,i2]=g5State.flipped,c1=g5State.cards[i1],c2=g5State.cards[i2]
  if(c1.id===c2.id){
    c1.matched=c2.matched=true; c1.el.classList.add('matched'); c2.el.classList.add('matched')
    // Card-anchored juice on both matched cards (no tick — cards already show match visually)
    spawnCorrectCardJuice(c1.el, { tick:false })
    spawnCorrectCardJuice(c2.el, { tick:false, burst:false })
    playCorrect(); spawnSparkles(); flashScreen('green')
    const cp=g5State.currentPlayer; g5State.scores[cp]++
    state.players[cp].stars++; state.gameStars[cp]++; saveStars()
    const scoreEl=document.getElementById('g5-score-'+cp)
    if(scoreEl){
      scoreEl.textContent=g5State.scores[cp]+' pasang'
      scoreEl.classList.remove('g5-score-pop'); void scoreEl.offsetWidth
      scoreEl.classList.add('g5-score-pop')
      setTimeout(()=>scoreEl.classList.remove('g5-score-pop'),400)
    }
    g5State.matched++; checkAchievements(null)
    // Show edu tip for educational pairs
    if(c1.eduTip){
      const tip=document.createElement('div')
      tip.style.cssText='position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(139,92,246,0.95);color:white;padding:10px 20px;border-radius:20px;font-size:15px;font-weight:700;z-index:9999;animation:slideUp 0.3s ease;pointer-events:none;text-align:center;max-width:280px'
      tip.textContent='✨ '+c1.eduTip
      document.body.appendChild(tip); setTimeout(()=>tip.remove(),1800)
    }
    if(g5State.matched>=g5State.totalPairs){checkAchievements('done_g5');setTimeout(()=>{const w=g5State.scores[0]>g5State.scores[1]?0:(g5State.scores[1]>g5State.scores[0]?1:-1);const msg=state.mode==='duo'?(w>=0?`${state.players[w].name} menang dengan ${g5State.scores[w]} pasang! 🏆`:'Seri! Kalian sama-sama hebat! 🤝'):`Kamu berhasil cocokkan semua ${g5State.matched} pasang! 🌟`;showResult('🃏','Cocok Semua!',msg)},700);return}
  } else {
    playWrong(); flashScreen('red'); c1.flipped=c2.flipped=false
    setTimeout(()=>{c1.el.classList.remove('flipped');c2.el.classList.remove('flipped')},500)
    if(state.mode==='duo'){g5State.currentPlayer=g5State.currentPlayer===0?1:0;state.currentPlayer=g5State.currentPlayer;document.getElementById('g5-turn-text').textContent=`Giliran ${state.players[g5State.currentPlayer].name}! 🎮`;document.querySelectorAll('.g5-player-score').forEach((el,i)=>el.classList.toggle('active',i===g5State.currentPlayer))}
  }
  g5State.flipped=[]; setTimeout(()=>{g5State.locked=false},250)
}

// ================================================================
// GAME 6: PETUALANGAN MOBIL
// ================================================================
let g6State = {lane:1,tiles:[],targetWord:'',collectedIdx:0,wordsCompleted:0,totalWords:5,stars:0,map:'city',speed:1.5,frameCount:0,running:false,animFrame:null,penaltyPause:false,wrongCount:0,lives:3}

// G6 Car catalog (emoji + name + SVG color)
const G6_VEHICLE_MAP = {
  sedan:'city', sport:'city', jeep:'forest', truck:'city', van:'city',
  police:'city', taxi:'city', bus:'city', firetruck:'city', ambulance:'city',
  tractor:'forest', scooter:'forest', bike:'forest',
  rocket:'space', heli:'space', sub:'space',
  ship:'body', train:'city'
}
const G6_CARS = [
  {id:'sedan',   e:'🚗',  name:'Sedan',    color:'#DC2626'},
  {id:'sport',   e:'🏎️', name:'Sport',    color:'#E63946'},
  {id:'jeep',    e:'🚙',  name:'Jeep',     color:'#16A34A'},
  {id:'truck',   e:'🚚',  name:'Truk',     color:'#D97706'},
  {id:'van',     e:'🚐',  name:'Van',      color:'#7C3AED'},
  {id:'police',  e:'🚓',  name:'Polisi',   color:'#1D4ED8'},
  {id:'taxi',    e:'🚕',  name:'Taksi',    color:'#CA8A04'},
  {id:'bus',     e:'🚌',  name:'Bis',      color:'#0891B2'},
  {id:'firetruck',e:'🚒', name:'Pemadam',  color:'#B91C1C'},
  {id:'ambulance',e:'🚑', name:'Ambulan',  color:'#F8FAFC'},
  {id:'tractor', e:'🚜',  name:'Traktor',  color:'#65A30D'},
  {id:'rocket',  e:'🚀',  name:'Roket',    color:'#6D28D9'},
  {id:'ship',    e:'🚢',  name:'Kapal',    color:'#0284C7'},
  {id:'heli',    e:'🚁',  name:'Helikopter',color:'#D97706'},
  {id:'scooter', e:'🛵',  name:'Skuter',   color:'#F43F5E'},
  {id:'bike',    e:'🚲',  name:'Sepeda',   color:'#16A34A'},
  {id:'sub',     e:'🛸',  name:'UFO',      color:'#7C3AED'},
  {id:'train',   e:'🚂',  name:'Kereta',   color:'#4B5563'},
]
const G6_COLORS = ['#DC2626','#16A34A','#1D4ED8','#D97706','#7C3AED','#F43F5E','#0891B2','#F97316','#FFFFFF','#111827']
let g6CarState = {selectedCar: G6_CARS[0], selectedColor: '#DC2626'}

function g6BuildCarSelector() {
  const grid = document.getElementById('g6-car-grid')
  const picker = document.getElementById('g6-color-picker')
  if(!grid || !picker) return
  grid.innerHTML = ''
  G6_CARS.forEach((car,i) => {
    const tile = document.createElement('div')
    tile.className = 'g6-car-tile' + (i===0?' selected':'')
    tile.title = car.name
    tile.textContent = car.e
    tile.onclick = () => {
      document.querySelectorAll('.g6-car-tile').forEach(t=>t.classList.remove('selected'))
      tile.classList.add('selected')
      g6CarState.selectedCar = car
      document.getElementById('g6-vehicle-icon').textContent = car.e
      // Auto-switch map based on vehicle type
      const autoMap = G6_VEHICLE_MAP[car.id] || 'city'
      const mapBtn = document.querySelector(`.g6-map-btn[data-map="${autoMap}"]`)
      if(mapBtn) { selectDriveMap(autoMap, mapBtn) }
    }
    grid.appendChild(tile)
  })
  picker.innerHTML = ''
  G6_COLORS.forEach((col,i) => {
    const dot = document.createElement('div')
    dot.className = 'g6-color-dot' + (i===0?' selected':'')
    dot.style.background = col
    dot.onclick = () => {
      document.querySelectorAll('.g6-color-dot').forEach(d=>d.classList.remove('selected'))
      dot.classList.add('selected')
      g6CarState.selectedColor = col
    }
    picker.appendChild(dot)
  })
}

function initGame6() {
  const lv = state.selectedLevelNum || state.selectedLevel || 5
  const map = g6State?.map || 'city'
  const words = Math.max(3, Math.min(10, Math.round(3 + lv * 0.35)))
  const vehicle = DRIVE_VEHICLES[map] || '🚗'
  const wordBank = DRIVE_WORD_BANK[map] || DRIVE_WORD_BANK.city
  try {
    sessionStorage.setItem('g6Config', JSON.stringify({
      mapTheme: map, level: lv, playerIcon: vehicle,
      totalWords: words, wordBank: wordBank
    }))
  } catch(_) {}
  window.location.href = 'games/g6.html'
}
function setupDriveMap(map) {
  g6State.map = map
  const vehicle = DRIVE_VEHICLES[map]
  // Set road map theme class
  const scr=document.getElementById('screen-game6');
  ['map-city','map-forest','map-space','map-body'].forEach(c=>scr.classList.remove(c));
  scr.classList.add('map-'+map);
  // Set background-image directly on road + blurred sides on screen
  const road = document.getElementById('g6-road')
  const bgUrl = `url('assets/bg-${map}.webp')`
  if (road) {
    road.style.backgroundImage = bgUrl
    road.style.backgroundSize = 'cover'
    road.style.backgroundPosition = 'center'
  }
  document.getElementById('screen-game6').style.setProperty('--g6-bg-img', bgUrl)
  // Car is now SVG - update color based on vehicle/map
  const carSvg = document.getElementById('g6-car-svg');
  if(carSvg) {
    const chosenColor = g6CarState?.selectedColor || {city:'#DC2626',forest:'#DC2626',space:'#3B82F6',body:'#F59E0B'}[map] || '#DC2626';
    const bodyRect = carSvg.querySelectorAll('rect')[0];
    if(bodyRect) bodyRect.setAttribute('fill', chosenColor);
  }
  const vImgMap = {city:'car-red.webp',forest:'car-red.webp',space:'rocket.webp',body:'submarine.webp'}
  const vIconEl = document.getElementById('g6-vehicle-icon')
  if(vIconEl) {
    const selectedCar = g6CarState?.selectedCar
    if(selectedCar) vIconEl.textContent = selectedCar.e
    else {
      const vFile = vImgMap[map]
      if(vFile) vIconEl.innerHTML = `<img src="assets/${vFile}" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5))" onerror="this.outerHTML='${vehicle}'">`
      else vIconEl.textContent = vehicle
    }
  }
  pickNextWord()
  document.getElementById('g6-start-overlay').classList.add('visible')
}
function selectDriveMap(map, btn) {
  document.querySelectorAll('.g6-map-btn').forEach(b=>b.classList.remove('active'))
  btn.classList.add('active')
  // Update road map theme class
  const scr=document.getElementById('screen-game6');
  ['map-city','map-forest','map-space','map-body'].forEach(c=>scr.classList.remove(c));
  scr.classList.add('map-'+map);
  const road2 = document.getElementById('g6-road')
  const bgUrl2 = `url('assets/bg-${map}.webp')`
  if (road2) {
    road2.style.backgroundImage = bgUrl2
    road2.style.backgroundSize = 'cover'
    road2.style.backgroundPosition = 'center'
  }
  scr.style.setProperty('--g6-bg-img', bgUrl2)
  if(g6State.running){cancelAnimationFrame(g6State.animFrame);g6State.running=false}
  clearRoadTiles()
  setupDriveMap(map)
}
function pickNextWord() {
  const tier = state.players[state.currentPlayer].ageTier||'tumbuh'
  const bank = getAgeWordBank(g6State.map, tier)
  const validBank = bank.length > 0 ? bank : DRIVE_WORD_BANK[g6State.map]
  const word = validBank[Math.floor(Math.random()*validBank.length)]
  g6State.targetWord = word; g6State.collectedIdx = 0; g6State.wrongCount = 0; g6State.penaltyPause = false; g6State.lives = 3
  document.getElementById('g6-start-word').textContent = word.split('').join(' ')
  document.getElementById('g6-target-word').textContent = word.split('').join(' - ')
  const livesEl = document.getElementById('g6-lives'); if(livesEl) livesEl.textContent = '❤️❤️❤️'
  renderCollectedSlots()
}
function renderCollectedSlots() {
  const el = document.getElementById('g6-collected')
  el.innerHTML = g6State.targetWord.split('').map((letter,i) => {
    const filled = i < g6State.collectedIdx
    const isNext = i === g6State.collectedIdx
    return `<div class="g6-slot ${filled?'filled':''} ${isNext?'g6-slot-next':''}">${filled?letter:`<span class="g6-ghost">${letter}</span>`}</div>`
  }).join('')
}
function beginDrive() {
  document.getElementById('g6-start-overlay').classList.remove('visible')
  document.getElementById('screen-game6').classList.add('racing')
  // Replace SVG with selected emoji vehicle
  const carDiv = document.getElementById('g6-car')
  const car = g6CarState.selectedCar || G6_CARS[0]
  carDiv.innerHTML = `<div class="g6-emoji-vehicle">${car.e}</div>`
  g6State.running = true; g6State.frameCount = 0; g6State.tiles = []
  startAmbient(g6State.map); updateCarPosition(); driveTick()
}
function driveTick() {
  if(!g6State.running) return
  g6State.frameCount++
  if(g6State.frameCount % 90 === 0) spawnDriveTileRow()
  const road = document.getElementById('g6-road')
  const roadH = road.clientHeight
  const toRemove = []
  g6State.tiles.forEach(tile => {
    tile.y += g6State.speed * 2
    tile.el.style.top = tile.y + 'px'
    const carY = roadH - 80, tileBottom = tile.y + 44
    if(tileBottom >= carY && tileBottom <= carY + 60) {
      const tileLaneCenter = [16.6,50,83.3][tile.lane]
      const carLaneCenter  = [16.6,50,83.3][g6State.lane]
      if(Math.abs(tileLaneCenter - carLaneCenter) < 15) {
        handleDriveCollision(tile); toRemove.push(tile)
      }
    }
    if(tile.y > roadH) toRemove.push(tile)
  })
  toRemove.forEach(t=>{if(t.el.parentNode)t.el.remove();g6State.tiles=g6State.tiles.filter(x=>x!==t)})
  if(g6State.frameCount % 300 === 0) g6State.speed = Math.min(g6State.speed + 0.2, 4)
  g6State.animFrame = requestAnimationFrame(driveTick)
}
function spawnDriveTileRow() {
  const word = g6State.targetWord, nextLetter = word[g6State.collectedIdx]
  const diff = state.selectedLevel||'medium'
  const obstacleChance = diff==='easy'?0.08:diff==='medium'?0.15:0.22
  const road = document.getElementById('g6-road')
  const lanePositions = [16.6,50,83.3]
  // Decide: target tile, obstacle, or decoy — one tile per spawn
  const isTarget = Math.random() < 0.5  // 50% chance to spawn the target letter
  const isObstacle = !isTarget && Math.random() < obstacleChance
  const lane = Math.floor(Math.random()*3)
  let type, content
  if(isTarget){type='target';content=nextLetter}
  else if(isObstacle){type='obstacle';content=DRIVE_OBSTACLES[g6State.map]}
  else{const decoys='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(l=>l!==nextLetter);type='decoy';content=decoys[Math.floor(Math.random()*decoys.length)]}
  const el=document.createElement('div'); el.className=`g6-tile ${type}`; el.textContent=content
  el.style.left=lanePositions[lane]+'%'; el.style.top='-50px'
  road.appendChild(el); g6State.tiles.push({el,lane,y:-50,type,content})
  // For lv 1-10 (beginner/intermediate): glow the lane where target appears
  if(type==='target' && (state.selectedLevelNum||10) <= 10){
    const glow=document.createElement('div'); glow.className='g6-lane-glow'
    glow.style.left=['0%','33.3%','66.6%'][lane]
    road.appendChild(glow); setTimeout(()=>glow.remove(),700)
  }
}
function handleDriveCollision(tile) {
  if(g6State.penaltyPause) return
  const word = g6State.targetWord
  const neededLetter = word[g6State.collectedIdx]
  if(tile.type==='target' && tile.content === neededLetter){
    // Correct letter!
    const tileRect=tile.el.getBoundingClientRect(), slotIdx=g6State.collectedIdx
    tile.el.classList.add('collected'); g6State.collectedIdx++; g6State.wrongCount=0
    playCorrect(); renderCollectedSlots(); addStars(1); spawnSparkles()
    g6FlyLetterToSlot(tileRect,tile.content,slotIdx)
    if(g6State.collectedIdx>=word.length){
      g6State.wordsCompleted++; g6State.speed=Math.max(1.5,g6State.speed-0.3)
      if(g6State.wordsCompleted>=g6State.totalWords){
        cancelAnimationFrame(g6State.animFrame); g6State.running=false
        showResult('🚗','Petualangan Selesai!',`Kamu berhasil mengeja ${g6State.wordsCompleted} kata! 🎉`)
      } else {
        showFeedback(true,0,`"${g6State.targetWord}" benar! Kata berikutnya... 🎯`,()=>{
          g6State.running=false; cancelAnimationFrame(g6State.animFrame); clearRoadTiles()
          pickNextWord()
          const ov=document.getElementById('g6-start-overlay'); ov.classList.add('visible')
          setTimeout(()=>{ if(ov.classList.contains('visible')) beginDrive() }, 1500)
        })
      }
    }
  } else if(tile.type==='obstacle'){
    tile.el.classList.add('hit')
    g6WrongLetterPenalty(true)   // obstacles → lose a life
  } else {
    // Decoy OR wrong letter — bounce/slow only, NO life loss
    tile.el.classList.add('hit')
    g6WrongLetterPenalty(false)
  }
}
function updateG6Lives() {
  const el = document.getElementById('g6-lives'); if(!el) return
  const lives = g6State.lives || 0
  el.textContent = '❤️'.repeat(Math.max(0,lives)) + '🤍'.repeat(Math.max(0,3-lives))
  el.classList.remove('hit-flash'); void el.offsetWidth; el.classList.add('hit-flash')
}
function g6WrongLetterPenalty(isWrongLetter) {
  if(g6State.penaltyPause) return
  g6State.penaltyPause = true
  g6State.wrongCount = (g6State.wrongCount||0) + 1
  // Decrement lives on wrong letter hit
  if(isWrongLetter) {
    g6State.lives = Math.max(0, (g6State.lives||3) - 1)
    updateG6Lives()
    // Game over if no lives left
    if(g6State.lives <= 0) {
      cancelAnimationFrame(g6State.animFrame); g6State.running = false
      playWrong()
      setTimeout(() => {
        showResult('🚗','Game Over!',`Kesalahan terlalu banyak! Coba lagi! 💪`)
      }, 400)
      return
    }
  }
  playWrong()
  // Mobile vibration
  if(navigator.vibrate) navigator.vibrate(250)
  // Car shake animation
  const car = document.getElementById('g6-car')
  car.classList.add('car-shake')
  setTimeout(() => car.classList.remove('car-shake'), 480)
  const road = document.getElementById('g6-road')
  // Shake + red tint
  road.style.animation = 'screenShake 0.45s ease'
  road.style.outline = '4px solid rgba(244,63,94,0.8)'
  setTimeout(() => { road.style.animation = ''; road.style.outline = '' }, 500)

  const lv = state.selectedLevelNum || 10
  if(isWrongLetter) {
    const el = document.getElementById('g6-collected')
    if(lv <= 5) {
      // Beginners: slowdown only — no letter reset, just forgive
      g6State.speed = Math.max(0.8, g6State.speed - 0.8)
      el.innerHTML = `<div style="color:#FBBF24;font-weight:900;font-size:14px;padding:4px 10px;background:rgba(251,191,36,0.2);border-radius:10px;animation:wrongShake 0.4s ease">⚠️ Hati-hati! Pelan dulu...</div>`
      setTimeout(() => { renderCollectedSlots(); g6State.penaltyPause = false }, 700)
    } else if(lv <= 10 && g6State.collectedIdx > 0) {
      // Intermediate: remove last collected letter only
      g6State.collectedIdx--
      el.innerHTML = `<div style="color:#FB923C;font-weight:900;font-size:14px;padding:4px 10px;background:rgba(251,146,60,0.2);border-radius:10px;animation:wrongShake 0.4s ease">↩️ Huruf terakhir dihapus</div>`
      setTimeout(() => { renderCollectedSlots(); g6State.penaltyPause = false }, 800)
    } else if(g6State.collectedIdx > 0) {
      // Advanced: full word reset
      g6State.collectedIdx = 0
      clearRoadTiles()
      const wrongX = '❌'.repeat(Math.min(g6State.wrongCount,3))
      el.innerHTML = `<div style="color:#F43F5E;font-weight:900;font-size:15px;padding:5px 12px;background:rgba(244,63,94,0.2);border-radius:10px;animation:wrongShake 0.4s ease">${wrongX} Huruf salah! Ulang dari awal 🔄</div>`
      setTimeout(() => { renderCollectedSlots(); g6State.penaltyPause = false }, 950)
    } else {
      setTimeout(() => { g6State.penaltyPause = false }, 450)
    }
  } else {
    setTimeout(() => { g6State.penaltyPause = false }, 450)
  }
}
function g6FlyLetterToSlot(tileRect,letter,slotIdx){
  const slots=document.getElementById('g6-collected')?.children
  if(!slots||!slots[slotIdx])return
  const slotRect=slots[slotIdx].getBoundingClientRect()
  const fly=document.createElement('div')
  fly.textContent=letter
  fly.style.cssText=`position:fixed;z-index:9999;font-size:28px;font-weight:900;font-family:'Fredoka One',cursive;
    color:#A78BFA;pointer-events:none;
    left:${tileRect.left+tileRect.width/2}px;top:${tileRect.top+tileRect.height/2}px;
    transform:translate(-50%,-50%);
    text-shadow:0 0 16px rgba(167,139,250,0.9);
    transition:left 0.32s cubic-bezier(0.34,1.56,0.64,1),top 0.32s cubic-bezier(0.34,1.56,0.64,1),font-size 0.32s,opacity 0.28s 0.1s;`
  document.body.appendChild(fly)
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    fly.style.left=(slotRect.left+slotRect.width/2)+'px'
    fly.style.top=(slotRect.top+slotRect.height/2)+'px'
    fly.style.fontSize='13px'
    fly.style.opacity='0'
    setTimeout(()=>fly.remove(),420)
  }))
}
function clearRoadTiles(){g6State.tiles.forEach(t=>{if(t.el.parentNode)t.el.remove()});g6State.tiles=[]}
function driveLeft() {if(g6State.lane>0){g6State.lane--;updateCarPosition();playClick()}}
function driveRight(){if(g6State.lane<2){g6State.lane++;updateCarPosition();playClick()}}
function updateCarPosition(){const positions=['16.6%','50%','83.3%'];document.getElementById('g6-car').style.left=positions[g6State.lane]}

// ================================================================
// GAME 7: TEBAK GAMBAR
// ================================================================
let g7State = {}
function initGame7() {
  const diff = state.selectedLevel||'medium'
  g7State = {round:0,maxRound:DIFF[diff].rounds,mode:'img2word',answered:false,shuffled:[...WORD_IMAGES].sort(()=>Math.random()-0.5),usedIds:new Set()}
  state.currentPlayer = 0; updateGameStarDisplay(); nextG7Round()
}
function nextG7Round() {
  const totalRounds = state.mode==='duo'?g7State.maxRound*2:g7State.maxRound
  if(g7State.round>=totalRounds){
    if(state.mode==='duo'&&g7State.round===g7State.maxRound){state.currentPlayer=1;updateGameStarDisplay();showFeedback(true,0,`Giliran ${state.players[1].name}! 🎮`,nextG7Round);return}
    showResult('🖼️','Tebak Gambar Selesai!','Kamu kenal banyak kata! 📚'); return
  }
  g7State.answered = false
  const roundInSet = g7State.round % g7State.maxRound
  const diff = state.selectedLevel||'medium'
  g7State.mode = diff==='easy'?'img2word':(roundInSet<Math.ceil(g7State.maxRound/2)?'img2word':'word2img')
  // Pick unused item — reset pool if exhausted
  let pool = g7State.shuffled.filter(w => !g7State.usedIds.has(w.id))
  if (!pool.length) { g7State.usedIds = new Set(); pool = [...g7State.shuffled] }
  const correct = pool[0]; g7State.usedIds.add(correct.id)
  const decoys = [...WORD_IMAGES].filter(w=>w.id!==correct.id).sort(()=>Math.random()-0.5).slice(0,3)
  const choices = [correct,...decoys].sort(()=>Math.random()-0.5)
  document.getElementById('g7-mode-badge').textContent = g7State.mode==='img2word'?'Mode: Gambar → Kata 🔤':'Mode: Kata → Gambar 🖼️'
  document.getElementById('g7-progress-bar').style.width = ((roundInSet/g7State.maxRound)*100)+'%'
  const displayEl=document.getElementById('g7-display'),questionEl=document.getElementById('g7-question')
  displayEl.classList.remove('anim-correct')
  if(g7State.mode==='img2word'){
    displayEl.innerHTML=`<span style="font-size:min(28vw,min(28vh,140px));line-height:1.1;display:flex;align-items:center;justify-content:center;padding:8%">${correct.emoji}</span>`
    questionEl.textContent='Ayo tebak, ini apa ya? 🤔'
    renderG7WordChoices(choices,correct)
  } else {
    displayEl.innerHTML=`<span style="font-size:min(12vw,56px);font-weight:900;color:#14B8A6;font-family:var(--font-display),var(--font);letter-spacing:2px">${correct.word}</span>`
    questionEl.textContent='Pilih gambar yang benar!'
    renderG7ImgChoices(choices,correct)
  }
  document.getElementById('g7-progress').textContent=state.mode==='duo'?`${state.players[state.currentPlayer].name} — ${roundInSet+1}/${g7State.maxRound}`:`${roundInSet+1} / ${g7State.maxRound}`
  g7State.round++
}
function renderG7WordChoices(choices,correct){
  const el=document.getElementById('g7-choices'); el.style.gridTemplateColumns='1fr 1fr'; el.innerHTML=''
  choices.forEach(ch=>{
    const btn=document.createElement('button'); btn.className='g7-choice-btn'
    btn.innerHTML=`<span class="g7-choice-text">${ch.word}</span>`
    btn.onclick=()=>answerG7(ch.id===correct.id,btn,correct); el.appendChild(btn)
  })
}
function renderG7ImgChoices(choices,correct){
  const el=document.getElementById('g7-choices'); el.style.gridTemplateColumns='1fr 1fr'; el.innerHTML=''
  choices.forEach(ch=>{
    const btn=document.createElement('button'); btn.className='g7-choice-btn'; btn.style.padding='12px 8px'
    btn.innerHTML=`<span class="g7-choice-img">${ch.emoji}</span><span class="g7-choice-text" style="font-size:14px">${ch.word}</span>`
    btn.onclick=()=>answerG7(ch.id===correct.id,btn,correct); el.appendChild(btn)
  })
}
function answerG7(isCorrect,btn,correct){
  if(g7State.answered)return; g7State.answered=true
  document.querySelectorAll('.g7-choice-btn').forEach(b=>b.style.pointerEvents='none')
  const qEl=document.getElementById('g7-question')
  if(isCorrect){
    btn.classList.add('correct'); playCorrect(); addStars(1)
    spawnCorrectCardJuice(btn); quizStreakHit(btn); spawnSparkles(btn); flashScreen('green')
    // Pop the display image
    const dispEl=document.getElementById('g7-display')
    if(dispEl){dispEl.classList.remove('anim-correct');void dispEl.offsetWidth;dispEl.classList.add('anim-correct')}
    // Show syllable breakdown on correct answer
    if(correct.suku && qEl){
      const parts=correct.suku.split('-')
      const html=parts.map((s,i)=>`<span class="g7-suku" style="animation-delay:${i*0.18}s">${s}</span>`).join('<span style="color:rgba(255,255,255,0.4)">-</span>')
      qEl.innerHTML=`<span style="font-size:13px;opacity:0.8">Suku kata: </span>${html}`
    }
    setTimeout(nextG7Round,1600)
  } else {
    btn.classList.add('wrong'); spawnWrongShake(btn); quizStreakReset()
    document.querySelectorAll('.g7-choice-btn').forEach(b=>{
      const txt=b.querySelector('.g7-choice-text')
      if(txt&&(txt.textContent===correct.word)){b.classList.add('correct');spawnCorrectCardJuice(b,{burst:false})}
    })
    playWrong(); flashScreen('red')
    // Shake the display frame
    const dispElW=document.getElementById('g7-display')
    if(dispElW){dispElW.classList.remove('anim-wrong');void dispElW.offsetWidth;dispElW.classList.add('anim-wrong')}
    // Show phonics clue: first letter + syllable hint
    if(qEl){
      const firstLetter=correct.word[0]
      const suku=correct.suku||correct.word
      qEl.innerHTML=`<span style="font-size:13px;opacity:0.8">💡 Mulai dengan huruf </span><b style="font-size:18px;color:#FBBF24">${firstLetter}</b><span style="font-size:13px;opacity:0.8"> — kata: ${suku}</span>`
    }
    setTimeout(nextG7Round,2000)
  }
}

// ================================================================
// GAME 8: SUSUN KATA
// ================================================================
let g8State = {}
function initGame8(){
  const diff=state.selectedLevel||'medium'
  const tier=state.players[state.currentPlayer].ageTier||'tumbuh'
  let bank=[...WORD_BUILD_BANK]
  // Filter by tier (age-based) — prefer tier property if present
  if(tier==='cilik')  bank=bank.filter(w=>w.tier==='easy'||(w.tier==null&&w.word.length<=4))
  if(tier==='tumbuh') bank=bank.filter(w=>w.tier==='easy'||w.tier==='medium'||(w.tier==null&&w.word.length<=6))
  // Also filter by difficulty selection
  if(diff==='easy')   bank=bank.filter(w=>w.tier==='easy'||(w.tier==null&&w.word.length<=4))
  if(diff==='hard')   bank=[...WORD_BUILD_BANK] // all tiers for hard
  if(bank.length===0) bank=[...WORD_BUILD_BANK]
  g8State={round:0,maxRound:DIFF[diff].rounds,answered:false,currentWord:'',userInput:[],shuffled:bank.sort(()=>Math.random()-0.5),availableLetters:[]}
  state.currentPlayer=0; updateGameStarDisplay(); nextG8Round()
}
function nextG8Round(){
  const totalRounds=state.mode==='duo'?g8State.maxRound*2:g8State.maxRound
  if(g8State.round>=totalRounds){
    if(state.mode==='duo'&&g8State.round===g8State.maxRound){state.currentPlayer=1;updateGameStarDisplay();showFeedback(true,0,`Giliran ${state.players[1].name}!`,nextG8Round);return}
    showResult('🔡','Susun Kata Selesai!',`Kamu bisa susun kata! ✍️`); return
  }
  g8State.answered=false
  const roundInSet=g8State.round%g8State.shuffled.length
  const item=g8State.shuffled[roundInSet%g8State.shuffled.length]
  g8State.currentWord=item.word; g8State.userInput=[]
  document.getElementById('g8-progress-bar').style.width=((roundInSet/g8State.maxRound)*100)+'%'
  document.getElementById('g8-hint-img').innerHTML=`<span style="font-size:inherit">${item.emoji}</span>`
  document.getElementById('g8-hint-text').textContent=item.hint
  renderG8Slots()
  const diff=state.selectedLevel||'medium'
  const numExtra=diff==='easy'?2:diff==='medium'?4:6
  const correctLetters=item.word.split('')
  const allLetters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const extra=Array.from({length:numExtra},()=>allLetters[Math.floor(Math.random()*allLetters.length)])
  g8State.availableLetters=[...correctLetters,...extra].sort(()=>Math.random()-0.5)
  renderG8Letters()
  document.getElementById('g8-progress').textContent=state.mode==='duo'?`${state.players[state.currentPlayer].name} — ${roundInSet+1}/${g8State.maxRound}`:`${roundInSet+1} / ${g8State.maxRound}`
  g8State.round++
}
function renderG8Slots(){
  const el=document.getElementById('g8-slots')
  const activeIdx=g8State.userInput.length
  el.innerHTML=g8State.currentWord.split('').map((_,i)=>{
    const filled=g8State.userInput[i]
    const cls=['g8-slot', filled?'filled':'', (!filled&&i===activeIdx)?'active':''].filter(Boolean).join(' ')
    const onclick=filled?`onclick="g8Backspace()"`:''
    return `<div class="${cls}" id="g8-slot-${i}" ${onclick}>${filled||''}</div>`
  }).join('')
}
function renderG8Letters(){
  const el=document.getElementById('g8-letters'); el.innerHTML=''
  g8State.availableLetters.forEach((letter,i)=>{
    const btn=document.createElement('button'); btn.className='g8-letter-btn'; btn.textContent=letter; btn.id=`g8-lbtn-${i}`
    btn.onclick=()=>g8TapLetter(letter,i,btn); el.appendChild(btn)
  })
}
function g8TapLetter(letter,idx,btn){
  if(g8State.answered||btn.classList.contains('used'))return
  if(g8State.userInput.length>=g8State.currentWord.length)return
  const pos=g8State.userInput.length,correct=g8State.currentWord[pos]
  if(letter===correct){
    // Letter fly animation
    btn.classList.add('flying')
    setTimeout(()=>{
      btn.classList.add('used')
      const slotIdx=g8State.userInput.length
      g8State.userInput.push(letter); renderG8Slots(); playClick()
      const slot=document.getElementById(`g8-slot-${slotIdx}`)
      if(slot){slot.classList.add('just-filled');setTimeout(()=>slot.classList.remove('just-filled'),350)}
      if(g8State.userInput.length===g8State.currentWord.length){
        g8State.answered=true
        // Staggered wave + gold celebrate
        g8State.currentWord.split('').forEach((_,i)=>{
          const s=document.getElementById(`g8-slot-${i}`)
          if(s){s.classList.add('correct-flash');setTimeout(()=>s.classList.add('celebrate'),i*65+100)}
        })
        playCorrect(); addStars(2); spawnSparkles(); setTimeout(nextG8Round,1800)
      }
    },220)
  } else {
    const slot=document.getElementById(`g8-slot-${pos}`)
    if(slot){slot.classList.add('wrong-flash');setTimeout(()=>slot.classList.remove('wrong-flash'),400)}
    playWrong()
    // Show specific feedback: which letter is expected
    const hint=document.getElementById('g8-hint-text')
    if(hint){
      const origHint=g8State.shuffled[(g8State.round-1)%g8State.shuffled.length]?.hint||''
      hint.textContent=`Huruf ke-${pos+1} adalah "${correct}", bukan "${letter}"`
      clearTimeout(g8State._hintTimer)
      g8State._hintTimer=setTimeout(()=>{ if(hint) hint.textContent=origHint },1800)
    }
  }
}
function g8Backspace(){
  if(g8State.userInput.length===0)return; g8State.userInput.pop()
  const usedBtns=document.querySelectorAll('.g8-letter-btn.used')
  if(usedBtns.length>0)usedBtns[usedBtns.length-1].classList.remove('used')
  renderG8Slots(); playClick()
}

// ================================================================
// GAME 9: JEJAK HURUF
// ================================================================
let g9State={}, g9Canvas=null, g9Ctx=null, g9Drawing=false, g9UserPath=[]

let g9TraceMode = 'huruf' // 'huruf' or 'angka'
function setG9Mode(mode, btn) {
  g9TraceMode = mode
  document.querySelectorAll('#g9-mode-tabs .g5-sub-tab').forEach(b=>b.classList.remove('active'))
  if(btn) btn.classList.add('active')
  initGame9()
}
function initGame9(){
  const diff=state.selectedLevel||'medium'
  const tier=state.players[state.currentPlayer].ageTier||'tumbuh'
  let seq
  if(g9TraceMode==='angka'){
    seq=LETTER_SEQ_ANGKA
  } else {
    seq=tier==='cilik'?LETTER_SEQ_CILIK:tier==='tumbuh'?LETTER_SEQ_TUMBUH:LETTER_SEQ_PINTAR
  }
  g9State={round:0,maxRound:Math.min(DIFF[diff].rounds,seq.length),sequence:seq,currentLetter:'A',mode:g9TraceMode}
  state.currentPlayer=0
  g9Canvas=document.getElementById('g9-canvas')
  g9Ctx=g9Canvas.getContext('2d')
  // Sync canvas buffer size to CSS display size — must be done after screen is visible
  setTimeout(()=>{
    const _g9sz = g9Canvas.offsetWidth || g9Canvas.clientWidth || 300
    g9Canvas.width = _g9sz; g9Canvas.height = _g9sz
    g9Clear(); renderG9GuideDots()
  }, 100)
  // Remove old listeners first (in case re-init)
  g9Canvas.removeEventListener('mousedown',g9StartDraw)
  g9Canvas.removeEventListener('mousemove',g9Draw)
  g9Canvas.removeEventListener('mouseup',g9EndDraw)
  g9Canvas.removeEventListener('touchstart',g9TouchStart)
  g9Canvas.removeEventListener('touchmove',g9TouchMove)
  g9Canvas.removeEventListener('touchend',g9EndDraw)
  g9Canvas.addEventListener('mousedown',g9StartDraw)
  g9Canvas.addEventListener('mousemove',g9Draw)
  g9Canvas.addEventListener('mouseup',g9EndDraw)
  g9Canvas.addEventListener('touchstart',g9TouchStart,{passive:false})
  g9Canvas.addEventListener('touchmove',g9TouchMove,{passive:false})
  g9Canvas.addEventListener('touchend',g9EndDraw)
  updateGameStarDisplay(); nextG9Round()
}
function nextG9Round(){
  if(g9State.round>=g9State.maxRound){showResult('✍️','Jejak Huruf Selesai!',`Kamu berhasil menulis ${g9State.round} huruf! ✍️`);return}
  g9State.currentLetter=g9State.sequence[g9State.round]; g9UserPath=[]
  document.getElementById('g9-letter-display').textContent=g9State.currentLetter
  document.getElementById('g9-result').style.display='none'
  document.getElementById('g9-next-btn').style.display='none'
  document.getElementById('g9-progress').textContent=`${g9State.round+1} / ${g9State.maxRound}`
  g9Clear(); renderG9GuideDots(); g9State.round++
}
function getG9Guides(letter) {
  return (g9State.mode==='angka' ? ANGKA_GUIDES : LETTER_GUIDES)[letter] || []
}
function renderG9GuideDots(){
  const guides=getG9Guides(g9State.currentLetter),container=document.getElementById('g9-guide-dots'); container.innerHTML=''
  guides.forEach((g,i)=>{const dot=document.createElement('div');dot.className='g9-dot';dot.id=`g9-dot-${i}`;dot.style.left=(g.x*100)+'%';dot.style.top=(g.y*100)+'%';dot.textContent=String(i+1);dot.style.cssText+=';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:rgba(255,255,255,0.9);';container.appendChild(dot)})
}
function g9Clear(){
  if(!g9Ctx)return; const sz=g9Canvas.width||300; g9Ctx.clearRect(0,0,sz,sz); g9UserPath=[]
  const letter=g9State.currentLetter; if(!letter)return
  const fontSize=g9State.mode==='angka'?Math.round(sz*0.8):Math.round(sz*0.73)
  g9Ctx.font=`bold ${fontSize}px Nunito`; g9Ctx.fillStyle='rgba(132,204,22,0.12)'
  g9Ctx.textAlign='center'; g9Ctx.textBaseline='middle'; g9Ctx.fillText(letter,sz/2,sz/2+sz*0.018)
  document.querySelectorAll('.g9-dot').forEach(d=>d.classList.remove('hit'))
}
function g9GetPos(e,canvas){const rect=canvas.getBoundingClientRect(),scaleX=canvas.width/rect.width,scaleY=canvas.height/rect.height;return{x:(e.clientX-rect.left)*scaleX,y:(e.clientY-rect.top)*scaleY}}
function g9StartDraw(e){
  g9Drawing=true; const pos=g9GetPos(e,g9Canvas); g9UserPath.push(pos)
  g9Ctx.beginPath(); g9Ctx.moveTo(pos.x,pos.y)
  g9Ctx.strokeStyle='#84CC16'; g9Ctx.lineWidth=16; g9Ctx.lineCap='round'; g9Ctx.lineJoin='round'
}
function g9Draw(e){
  if(!g9Drawing)return; const pos=g9GetPos(e,g9Canvas); g9UserPath.push(pos)
  g9Ctx.lineTo(pos.x,pos.y); g9Ctx.stroke(); g9Ctx.beginPath(); g9Ctx.moveTo(pos.x,pos.y); checkGuideHits(pos)
}
function g9TouchStart(e){e.preventDefault();if(e.touches[0])g9StartDraw(e.touches[0])}
function g9TouchMove(e){e.preventDefault();if(e.touches[0])g9Draw(e.touches[0])}
function g9EndDraw(){if(!g9Drawing)return;g9Drawing=false;g9Ctx.beginPath();setTimeout(evaluateG9Trace,500)}
function checkGuideHits(pos){
  const sz=g9Canvas.width||300; const guides=getG9Guides(g9State.currentLetter)
  guides.forEach((g,i)=>{const gx=g.x*sz,gy=g.y*sz,d=Math.hypot(pos.x-gx,pos.y-gy);if(d<sz*0.18){const dot=document.getElementById(`g9-dot-${i}`);if(dot)dot.classList.add('hit')}})
}
function evaluateG9Trace(){
  const sz=g9Canvas.width||300; const guides=getG9Guides(g9State.currentLetter)
  if(guides.length===0||g9UserPath.length<5)return
  let hits=0
  guides.forEach(g=>{const gx=g.x*sz,gy=g.y*sz,nearest=g9UserPath.reduce((best,p)=>Math.min(best,Math.hypot(p.x-gx,p.y-gy)),Infinity);if(nearest<sz*0.22)hits++})
  const score=hits/guides.length
  let stars=0,msg=''
  if(score>=0.85){stars=3;msg='Sempurna! Tulisanmu bagus sekali! 🌟'}
  else if(score>=0.65){stars=2;msg='Bagus! Terus berlatih ya! 👍'}
  else if(score>=0.45){stars=1;msg='Hampir! Coba lagi pelan-pelan 😊'}
  else{stars=0;msg='Coba ikuti titik-titik ya! 💪'}
  const resultEl=document.getElementById('g9-result'); resultEl.style.display='block'
  document.getElementById('g9-stars-result').textContent=stars>0?'⭐'.repeat(stars):'💪'
  document.getElementById('g9-result-msg').textContent=msg
  if(stars>0){addStars(stars);playCorrect();spawnSparkles(null,stars)}else playWrong()
  document.getElementById('g9-next-btn').style.display='flex'
}

// ================================================================
// KEYBOARD SUPPORT
// ================================================================
document.addEventListener('keydown',(e)=>{
  if(state.currentGame===6&&g6State.running){
    if(e.key==='ArrowLeft')driveLeft()
    if(e.key==='ArrowRight')driveRight()
  }
})

// ================================================================
// DASHBOARD
// ================================================================
function showDashboard() {
  const p=state.players[state.currentPlayer]
  const xp=getXP(), tier=getLevelTier(xp)
  // Player card
  document.getElementById('dash-player-card').innerHTML=`
    <div style="display:flex;align-items:center;gap:16px;background:white;border-radius:24px;padding:20px;box-shadow:0 8px 24px rgba(139,92,246,0.12);width:100%;max-width:500px;">
      <span style="font-size:52px">${p.animal}</span>
      <div>
        <div style="font-family:var(--font-display);font-size:22px;color:var(--text)">${p.name||'Pemain'}</div>
        <div style="font-size:15px;color:var(--text-light);margin-top:4px">⭐ ${p.stars} bintang</div>
        <div style="font-size:15px;color:var(--brand);font-weight:700;margin-top:2px">${tier.icon} ${tier.name}</div>
      </div>
    </div>`
  // Level card with progress bar
  const nextTier=LEVEL_TIERS.find(t=>t.min>xp)||tier
  const progress=nextTier===tier?100:Math.round(((xp-tier.min)/(nextTier.min-tier.min))*100)
  document.getElementById('dash-level-card').innerHTML=`
    <div style="background:linear-gradient(135deg,#A78BFA,#8B5CF6);border-radius:24px;padding:20px;color:white;width:100%;max-width:500px;box-shadow:0 8px 24px rgba(91,33,182,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-family:var(--font-display);font-size:20px">${tier.icon} Level: ${tier.name}</div>
        <div style="font-size:17px;font-weight:900"><img src="assets/xp-crystal.webp" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;" onerror="this.outerHTML='💎'"> ${xp} XP</div>
      </div>
      <div style="background:rgba(255,255,255,0.25);border-radius:100px;height:12px;overflow:hidden;">
        <div style="background:white;height:100%;width:${progress}%;border-radius:100px;transition:width 1s ease;"></div>
      </div>
      <div style="font-size:13px;margin-top:8px;opacity:0.85">${nextTier===tier?'Max level!':`${nextTier.min-xp} XP lagi ke ${nextTier.icon} ${nextTier.name}`}</div>
    </div>`
  // Achievements
  const unlocked=JSON.parse(localStorage.getItem(pkey('achievements'))||'{}')
  const BADGE_MAP={first_star:'badge-first-win.webp',perfect_emotion:'badge-perfect.webp',hard_mode:'badge-perfect.webp',memory_master:'badge-pokemon-master.webp',letter_master:'badge-reader.webp',word_master:'badge-reader.webp',streak3:'badge-streak-7.webp'}
  const achHtml=Object.entries(ACHIEVEMENTS).map(([key,ach])=>{
    const done=!!unlocked[key]
    const badgeFile=BADGE_MAP[key]
    const iconHtml=badgeFile
      ?`<img src="assets/${badgeFile}" alt="" style="width:40px;height:40px;object-fit:contain;" onerror="this.outerHTML='<span style=font-size:32px>${ach.icon}</span>'">`
      :`<span style="font-size:32px">${ach.icon}</span>`
    return `<div style="display:flex;align-items:center;gap:12px;background:white;border-radius:18px;padding:14px 16px;box-shadow:0 4px 12px rgba(0,0,0,0.06);opacity:${done?1:0.4};width:100%;max-width:500px;">
      ${iconHtml}
      <div><div style="font-weight:800;font-size:15px">${ach.name}</div><div style="font-size:13px;color:var(--text-light)">${ach.desc}</div></div>
      ${done?'<span style="margin-left:auto;color:#14B8A6;font-size:20px">✓</span>':''}
    </div>`
  }).join('')
  document.getElementById('dash-achievements').innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;width:100%;align-items:center;">${achHtml}</div>`
  // Stats
  const streak=getStreakCount()
  const played=JSON.parse(localStorage.getItem('dunia-emosi-played-games')||'{}')
  document.getElementById('dash-stats').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:500px;">
      <div class="dash-stat-card"><div class="dash-stat-num">🔥 ${streak}</div><div class="dash-stat-lbl">Hari Streak</div></div>
      <div class="dash-stat-card"><div class="dash-stat-num">🎮 ${Object.keys(played).length}</div><div class="dash-stat-lbl">Game Dimainkan</div></div>
      <div class="dash-stat-card"><div class="dash-stat-num"><img src="assets/star-reward.webp" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;" onerror="this.outerHTML='⭐'"> ${p.stars}</div><div class="dash-stat-lbl">Total Bintang</div></div>
      <div class="dash-stat-card"><div class="dash-stat-num">${xp} XP</div><div class="dash-stat-lbl">Total XP</div></div>
    </div>`
  showScreen('screen-dashboard')
}

// ================================================================
// BOOT (wrapped in try-catch to prevent page freeze on any error)
// ================================================================
try {
  initFloatingStars()
  buildAnimalPicker('p1-animals',0)
  buildAnimalPicker('p2-animals',1)
  try {
    const data=JSON.parse(localStorage.getItem(pkey('streak'))||'{}')
    if(data.streak>=2){document.getElementById('streak-badge').style.display='inline-flex';document.getElementById('streak-text').textContent=data.streak+' hari'}
  } catch(e){}
} catch(bootErr) { console.error('BOOT ERROR:', bootErr) }
// ================================================================
// PIXIJS — GPU RENDERER (G10, G13, G13b battle FX)
// ================================================================
const PixiManager = {
  _apps: {},

  async init(canvasId) {
    if (!window.PIXI) return null
    const canvas = document.getElementById(canvasId)
    if (!canvas) return null
    const parent = canvas.parentElement
    if (!parent) return null
    this.destroy(canvasId)
    const rect = parent.getBoundingClientRect()
    const w = Math.max(rect.width, 200)
    const h = Math.max(rect.height, 200)
    const app = new PIXI.Application()
    try {
      await app.init({
        canvas, width: w, height: h,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        preference: 'webgl'
      })
    } catch(e) { return null }
    this._apps[canvasId] = app
    return app
  },

  get(id) { return this._apps[id] || null },

  destroy(id) {
    const app = this._apps[id]
    if (!app) return
    try { app.destroy(false, {children:true, texture:true}) } catch(e){}
    delete this._apps[id]
  },

  destroyAll() {
    Object.keys(this._apps).forEach(id => this.destroy(id))
  },

  resize(id) {
    const app = this._apps[id]
    if (!app) return
    const canvas = document.getElementById(id)
    if (!canvas || !canvas.parentElement) return
    const r = canvas.parentElement.getBoundingClientRect()
    try { app.renderer.resize(Math.max(r.width,200), Math.max(r.height,200)) } catch(e){}
  }
}

// ── Pixi helpers: type flash, particles, weather, aura ring, evo rings ──

const _PIXI_TYPE_COLORS = {
  fire:0xff6b35, water:0x4fc3f7, electric:0xffcb05, grass:0x4caf50,
  psychic:0xf95587, ghost:0x705898, ice:0x98d8d8, dark:0x200800,
  fighting:0xc03028, dragon:0x7038f8, normal:0xa8a878, rock:0xb8a038,
  poison:0xa040a0, ground:0xe0c068, flying:0xa890f0, bug:0xa8b820,
  steel:0xb8b8d0, fairy:0xee99ac
}

/* Type screen flash — replaces .poke-flash CSS animation */
function pixiTypeFlash(app, type) {
  if (!app) return
  const color = _PIXI_TYPE_COLORS[type] || 0xa8a878
  const g = new PIXI.Graphics()
  const {width:w, height:h} = app.screen
  g.rect(0, 0, w, h).fill({color, alpha:0.42})
  g.alpha = 0
  app.stage.addChild(g)
  let t = 0
  const fn = (ticker) => {
    t += ticker.deltaTime / 60
    if (t < 0.1) { g.alpha = t / 0.1 * 0.42 }
    else if (t < 0.28) { g.alpha = 0.42 }
    else if (t < 0.6) { g.alpha = 0.42 * (1 - (t - 0.28) / 0.32) }
    else { app.ticker.remove(fn); app.stage.removeChild(g); g.destroy() }
  }
  app.ticker.add(fn)
}

/* Type particle burst — replaces DOM div particles in g10TypeFX() */
function pixiTypeFX(app, type, targetSide) {
  if (!app) return
  const color = _PIXI_TYPE_COLORS[type] || 0xa8a878
  const {width:w, height:h} = app.screen
  const isEnemy = targetSide === 'enemy'
  const xBase = isEnemy ? w * 0.52 : w * 0.05
  const yBase = isEnemy ? h * 0.04 : h * 0.42
  const zW = w * 0.36, zH = h * 0.36
  const container = new PIXI.Container()
  app.stage.addChild(container)
  const N = 10
  const pts = Array.from({length:N}, () => {
    const g = new PIXI.Graphics()
    const r = 5 + Math.random() * 8
    g.circle(0, 0, r).fill({color, alpha:0.9})
    g.x = xBase + Math.random() * zW
    g.y = yBase + Math.random() * zH
    const vx = (Math.random() - 0.5) * 90
    const vy = -(50 + Math.random() * 90)
    const maxLife = 0.55 + Math.random() * 0.45
    container.addChild(g)
    return {g, vx, vy, life:0, maxLife}
  })
  const fn = (ticker) => {
    const dt = ticker.deltaTime / 60
    let alive = false
    pts.forEach(p => {
      p.life += dt
      if (p.life < p.maxLife) {
        alive = true
        p.g.x += p.vx * dt
        p.g.y += p.vy * dt
        p.vy += 40 * dt
        const prog = p.life / p.maxLife
        p.g.alpha = 1 - prog
        p.g.scale.set(1 - prog * 0.4)
      } else { p.g.alpha = 0 }
    })
    if (!alive) {
      app.ticker.remove(fn)
      app.stage.removeChild(container)
      container.destroy({children:true})
    }
  }
  app.ticker.add(fn)
}

/* Aura ring pulse — replaces DOM g10-aura-ring div + CSS animation */
function pixiAuraRing(app, side, auraColor) {
  if (!app) return
  const {width:w, height:h} = app.screen
  // side: 'player' = bottom-left, 'enemy' = top-right
  const cx = side === 'player' ? w * 0.22 : w * 0.72
  const cy = side === 'player' ? h * 0.72 : h * 0.28
  const color = typeof auraColor === 'string'
    ? parseInt(auraColor.replace('#',''), 16)
    : (auraColor || 0xa78bfa)
  const g = new PIXI.Graphics()
  app.stage.addChild(g)
  let t = 0
  const fn = (ticker) => {
    t += ticker.deltaTime / 60
    const prog = t / 0.52
    if (prog < 1) {
      const r = 28 + prog * 52
      const alpha = prog < 0.35 ? prog / 0.35 : 1 - (prog - 0.35) / 0.65
      g.clear()
      g.circle(cx, cy, r).stroke({width: Math.max(1.2, 3 - prog * 2), color, alpha: alpha * 0.85})
    } else {
      app.ticker.remove(fn)
      app.stage.removeChild(g)
      g.destroy()
    }
  }
  app.ticker.add(fn)
}

/* Weather overlay — replaces applyG10Weather() DOM particles */
function pixiWeather(app, type) {
  if (!app) return
  pixiClearWeather(app)
  if (!type || type === 'clear') return
  const {width:w, height:h} = app.screen
  const wc = new PIXI.Container()
  wc._isPixiWeather = true
  app.stage.addChildAt(wc, 0)
  const particles = []

  if (type === 'rain') {
    for (let i = 0; i < 40; i++) {
      const g = new PIXI.Graphics()
      g.rect(0, 0, 1.5, 10).fill({color:0xaed6f1, alpha:0.55})
      g.rotation = 0.3
      g.x = Math.random() * w
      g.y = Math.random() * h
      particles.push({g, speed: 280 + Math.random() * 180})
      wc.addChild(g)
    }
    const fn = (t) => { const dt=t.deltaTime/60; particles.forEach(p => {
      p.g.y += p.speed*dt; p.g.x += p.speed*0.28*dt
      if(p.g.y > h) { p.g.y=-12; p.g.x=Math.random()*w }
    }) }
    wc._fn = fn; app.ticker.add(fn)
  } else if (type === 'snow') {
    for (let i = 0; i < 30; i++) {
      const g = new PIXI.Graphics()
      g.circle(0, 0, 2 + Math.random() * 3.5).fill({color:0xffffff, alpha:0.75})
      g.x = Math.random() * w; g.y = Math.random() * h
      particles.push({g, speed:35+Math.random()*55, wT:Math.random()*Math.PI*2, wb:(Math.random()-0.5)*1.5})
      wc.addChild(g)
    }
    const fn = (t) => { const dt=t.deltaTime/60; particles.forEach(p => {
      p.wT+=dt*1.4; p.g.y+=p.speed*dt; p.g.x+=Math.sin(p.wT)*p.wb
      if(p.g.y>h) { p.g.y=-12; p.g.x=Math.random()*w }
    }) }
    wc._fn = fn; app.ticker.add(fn)
  } else if (type === 'wind') {
    for (let i = 0; i < 22; i++) {
      const len = 18 + Math.random() * 38
      const g = new PIXI.Graphics()
      g.rect(0, -1, len, 1.5).fill({color:0xffffff, alpha:0.22})
      g.x = Math.random() * w; g.y = Math.random() * h
      particles.push({g, speed:200+Math.random()*280, len})
      wc.addChild(g)
    }
    const fn = (t) => { const dt=t.deltaTime/60; particles.forEach(p => {
      p.g.x += p.speed*dt
      if(p.g.x > w+p.len) { p.g.x=-p.len; p.g.y=Math.random()*h }
    }) }
    wc._fn = fn; app.ticker.add(fn)
  } else if (type === 'night') {
    for (let i = 0; i < 18; i++) {
      const g = new PIXI.Graphics()
      g.circle(0, 0, 1.5 + Math.random()*2).fill({color:0xffffc8, alpha:0.8})
      g.x = Math.random()*w; g.y = Math.random()*h*0.6
      particles.push({g, phase:Math.random()*Math.PI*2, speed:1.2+Math.random()*1.8})
      wc.addChild(g)
    }
    const fn = (t) => { const dt=t.deltaTime/60; particles.forEach(p => {
      p.phase+=p.speed*dt; p.g.alpha=0.35+Math.sin(p.phase)*0.45
    }) }
    wc._fn = fn; app.ticker.add(fn)
  } else if (type === 'leaves' || type === 'sandstorm') {
    const color = type === 'leaves' ? 0x7ec850 : 0xe0b860
    for (let i = 0; i < 22; i++) {
      const g = new PIXI.Graphics()
      const r = 3 + Math.random()*4
      g.circle(0, 0, r).fill({color, alpha:0.6})
      g.x = Math.random()*w; g.y = Math.random()*h
      particles.push({g, vx:(type==='leaves'?30:180)+Math.random()*80, vy:(Math.random()-0.5)*40, wT:Math.random()*6})
      wc.addChild(g)
    }
    const fn = (t) => { const dt=t.deltaTime/60; particles.forEach(p => {
      p.wT+=dt*2; p.g.x+=p.vx*dt; p.g.y+=Math.sin(p.wT)*p.vy*dt
      if(p.g.x>w+10) { p.g.x=-10; p.g.y=Math.random()*h }
    }) }
    wc._fn = fn; app.ticker.add(fn)
  }
}

function pixiClearWeather(app) {
  if (!app) return
  const toRemove = app.stage.children.filter(c => c._isPixiWeather)
  toRemove.forEach(c => {
    if (c._fn) { try { app.ticker.remove(c._fn) } catch(e){} }
    app.stage.removeChild(c)
    c.destroy({children:true})
  })
}

/* Evolution rings — replaces 6 CSS g13Ring keyframes */
function pixiEvoRings(app) {
  if (!app) return
  const {width:w, height:h} = app.screen
  const cx = w/2, cy = h/2
  const SIZES = [60,100,150,200,280,360]
  const rings = SIZES.map((maxR, i) => {
    const g = new PIXI.Graphics()
    app.stage.addChild(g)
    return {g, maxR, delay: 0.5 + i*0.3, life: 0}
  })
  let elapsed = 0
  const fn = (ticker) => {
    elapsed += ticker.deltaTime/60
    let anyAlive = false
    rings.forEach(r => {
      if (elapsed < r.delay) { anyAlive = true; return }
      r.life += ticker.deltaTime/60
      const maxLife = r.maxR < 200 ? 2.0 : 2.5
      if (r.life < maxLife) {
        anyAlive = true
        const prog = r.life / maxLife
        const cr = prog * r.maxR
        const alpha = (1 - prog) * 0.75
        const lw = Math.max(0.8, 3.5 - prog * 3)
        r.g.clear()
        r.g.circle(cx, cy, cr).stroke({width:lw, color:0xfbbf24, alpha})
      } else { r.g.clear() }
    })
    if (!anyAlive) {
      app.ticker.remove(fn)
      rings.forEach(r => { app.stage.removeChild(r.g); r.g.destroy() })
    }
  }
  app.ticker.add(fn)
}

/* Evolution particles — replaces 25 DOM divs in g13TriggerEvolution() */
function pixiEvoParticles(app) {
  if (!app) return
  const {width:w, height:h} = app.screen
  const COLORS = [0xfbbf24,0xf97316,0xfacc15,0xffffff,0xfef3c7,0xfb923c]
  const container = new PIXI.Container()
  app.stage.addChildAt(container, 0)
  const N = 32
  const pts = Array.from({length:N}, () => {
    const g = new PIXI.Graphics()
    const r = 3 + Math.random()*5.5
    g.circle(0, 0, r).fill({color: COLORS[Math.floor(Math.random()*COLORS.length)], alpha:0.88})
    g.x = Math.random()*w; g.y = h*0.5 + Math.random()*h*0.5
    container.addChild(g)
    return {g, vx:(Math.random()-0.5)*80, vy:-(55+Math.random()*110),
            delay:Math.random()*3, maxLife:2+Math.random()*3, life:-Math.random()*3}
  })
  let total = 0
  const fn = (ticker) => {
    total += ticker.deltaTime/60
    pts.forEach(p => {
      p.life += ticker.deltaTime/60
      if (p.life < 0) { p.g.alpha=0; return }
      if (p.life > p.maxLife) {
        p.g.x = Math.random()*w; p.g.y = h*0.5+Math.random()*h*0.5
        p.life = 0; return
      }
      const prog = p.life/p.maxLife
      p.g.x += p.vx * ticker.deltaTime/60
      p.g.y += p.vy * ticker.deltaTime/60
      p.vy += 18 * ticker.deltaTime/60
      p.g.alpha = prog < 0.2 ? prog/0.2 : 1-(prog-0.2)/0.8
      p.g.scale.set(Math.max(0.1, 1-prog*0.5))
    })
    if (total > 8.5) {
      app.ticker.remove(fn)
      app.stage.removeChild(container)
      container.destroy({children:true})
    }
  }
  app.ticker.add(fn)
}

/* Burst flash (defeat) — replaces CSS g10Burst animation */
function pixiBurstFlash(app, bxPct, byPct) {
  if (!app) return
  const {width:w, height:h} = app.screen
  const cx = w * bxPct / 100, cy = h * byPct / 100
  const g = new PIXI.Graphics()
  app.stage.addChild(g)
  let t = 0
  const fn = (ticker) => {
    t += ticker.deltaTime/60
    g.clear()
    if (t < 0.15) {
      const r = (t/0.15) * Math.min(w,h)*0.6
      const alpha = t/0.15 * 0.9
      g.circle(cx, cy, r).fill({color:0xffffff, alpha})
    } else if (t < 0.6) {
      const fade = 1 - (t-0.15)/0.45
      g.circle(cx, cy, Math.min(w,h)*0.6).fill({color:0xffee50, alpha: fade*0.4})
    } else {
      app.ticker.remove(fn); app.stage.removeChild(g); g.destroy()
    }
  }
  app.ticker.add(fn)
}

/* G13b combo text pop — Pixi text burst */
function pixiComboText(app, text) {
  if (!app || !window.PIXI) return
  const {width:w, height:h} = app.screen
  const label = new PIXI.Text({text, style:{
    fontFamily:'Fredoka One,sans-serif', fontSize:28, fontWeight:'900',
    fill:0xfbbf24, stroke:{color:0x1a0a00, width:4}, align:'center',
    dropShadow:{color:0x000000, blur:4, distance:3, alpha:0.7}
  }})
  label.anchor.set(0.5)
  label.x = w/2; label.y = h*0.42
  label.alpha = 0
  app.stage.addChild(label)
  let t = 0
  const fn = (ticker) => {
    t += ticker.deltaTime/60
    if (t < 0.12) { label.scale.set(0.4+t/0.12*0.9); label.alpha=t/0.12 }
    else if (t < 0.5) { label.scale.set(1.3-0.3*(t-0.12)/0.38); label.alpha=1 }
    else if (t < 0.9) { label.alpha=1-(t-0.5)/0.4 }
    else { app.ticker.remove(fn); app.stage.removeChild(label); label.destroy() }
  }
  app.ticker.add(fn)
}

// ================================================================
// GAME 10 — PERTARUNGAN POKEMON
// ================================================================
// ── Signature move lookup (slug → [moves]) ───────────────
const POKE_MOVES = {
  // Gen 1
  bulbasaur:['Vine Whip','Razor Leaf'],ivysaur:['Razor Leaf','Solar Beam'],venusaur:['Petal Blizzard','Solar Beam','Petal Dance'],
  charmander:['Ember','Scratch'],charmeleon:['Flamethrower','Dragon Rage'],charizard:['Flamethrower','Wing Attack','Blast Burn'],
  squirtle:['Water Gun','Bubble'],wartortle:['Water Pulse','Aqua Tail'],blastoise:['Hydro Pump','Flash Cannon'],
  caterpie:['String Shot','Bug Bite'],metapod:['Tackle','Harden'],butterfree:['Sleep Powder','Bug Buzz'],
  pikachu:['Thunderbolt','Quick Attack','Volt Tackle'],raichu:['Volt Tackle','Thunder','Thunderbolt'],pichu:['Thundershock','Sweet Kiss'],
  jigglypuff:['Sing','Pound','Hyper Voice'],wigglytuff:['Hyper Voice','Double-Edge','Dazzling Gleam'],
  meowth:['Scratch','Pay Day','Bite'],persian:['Pay Day','Slash','Feint Attack'],
  psyduck:['Water Gun','Confusion'],golduck:['Hydro Pump','Confusion','Aqua Jet'],
  abra:['Teleport','Psybeam'],kadabra:['Psybeam','Psychic'],alakazam:['Psychic','Shadow Ball','Future Sight'],
  geodude:['Rock Throw','Magnitude'],graveler:['Rollout','Rock Blast'],golem:['Stone Edge','Earthquake','Explosion'],
  gastly:['Lick','Hex','Shadow Ball'],haunter:['Shadow Ball','Confuse Ray'],gengar:['Shadow Ball','Sludge Bomb','Hex'],
  magikarp:['Splash','Flail','Tackle'],gyarados:['Hydro Pump','Dragon Dance','Crunch'],
  lapras:['Ice Beam','Surf','Blizzard'],eevee:['Quick Attack','Bite','Last Resort'],
  vaporeon:['Hydro Pump','Water Pulse','Surf'],jolteon:['Thunderbolt','Thunder Wave','Wild Charge'],
  flareon:['Flamethrower','Lava Plume','Fire Spin'],
  snorlax:['Body Slam','Hyper Beam','Giga Impact'],
  articuno:['Blizzard','Ice Beam','Sheer Cold'],zapdos:['Thunder','Thunderbolt','Discharge'],moltres:['Fire Blast','Flamethrower','Heat Wave'],
  dratini:['Dragon Rage','Twister'],dragonair:['Dragon Rush','Aqua Tail','Twister'],dragonite:['Dragon Rush','Hyper Beam','Fire Punch'],
  mewtwo:['Psystrike','Shadow Ball','Aura Sphere'],mew:['Psychic','Aura Sphere','Transform'],
  arcanine:['Flare Blitz','Extreme Speed','Close Combat'],
  clefairy:['Moonblast','Metronome'],clefable:['Moonblast','Meteor Mash','Soft-Boiled'],
  slowpoke:['Water Gun','Confusion'],slowbro:['Psychic','Surf','Slack Off'],
  magmar:['Fire Punch','Flamethrower','Lava Plume'],electabuzz:['Thunderbolt','Thunder Punch','Discharge'],
  machop:['Karate Chop','Low Kick'],machoke:['Cross Chop','Dynamic Punch'],machamp:['Cross Chop','Stone Edge','Dynamic Punch'],
  oddish:['Absorb','Acid'],gloom:['Petal Dance','Sludge Bomb'],vileplume:['Petal Blizzard','Sludge Bomb','Solar Beam'],
  poliwag:['Bubble','Water Gun'],poliwhirl:['Bubblebeam','DoubleSlap'],poliwrath:['Waterfall','Dynamic Punch','Focus Blast'],
  horsea:['Water Gun','Twister'],seadra:['Dragon Breath','Twister','Hydro Pump'],
  vulpix:['Ember','Quick Attack'],ninetales:['Flamethrower','Extrasensory','Fire Spin'],
  exeggcute:['Barrage','Confusion','Leech Seed'],exeggutor:['Psychic','Egg Bomb','Solar Beam'],
  cubone:['Bone Club','Rage'],marowak:['Bonemerang','Earthquake','Stone Edge'],
  kabuto:['Scratch','Aqua Jet'],kabutops:['Slash','Aqua Jet','Stone Edge'],
  omanyte:['Brine','Rock Blast'],omastar:['Hydro Pump','Rock Blast','Ancientpower'],
  koffing:['Sludge','Self-Destruct','Toxic'],weezing:['Sludge Bomb','Nasty Plot','Toxic'],
  seel:['Icy Wind','Aqua Jet'],dewgong:['Ice Beam','Surf','Sheer Cold'],
  cloyster:['Icicle Spear','Shell Smash','Ice Shard'],
  staryu:['Water Gun','Rapid Spin'],starmie:['Psychic','Surf','Ice Beam'],
  kangaskhan:['Mega Punch','Sucker Punch','Dizzy Punch'],
  muk:['Gunk Shot','Sludge Bomb','Poison Gas'],
  pidgey:['Gust','Quick Attack'],pidgeotto:['Wing Attack','Gust'],pidgeot:['Hurricane','Air Slash'],
  rattata:['Hyper Fang','Quick Attack'],raticate:['Hyper Fang','Super Fang','Crunch'],
  spearow:['Peck','Fury Attack'],fearow:['Drill Peck','Aerial Ace','Mirror Move'],
  ekans:['Poison Sting','Bite'],arbok:['Gunk Shot','Glare','Coil'],
  sandshrew:['Sand Attack','Slash'],sandslash:['Earthquake','Slash','Rapid Spin'],
  paras:['Spore','Leech Life'],parasect:['Spore','X-Scissor','Leech Life'],
  venonat:['Poison Powder','Psybeam'],venomoth:['Bug Buzz','Psychic','Stun Spore'],
  mankey:['Karate Chop','Rage'],primeape:['Cross Chop','Close Combat','Rage'],
  growlithe:['Ember','Flamethrower','Crunch'],
  bellsprout:['Vine Whip','Acid'],weepinbell:['Razor Leaf','Sludge Bomb'],
  doduo:['Peck','Fury Attack'],dodrio:['Drill Peck','Jump Kick','Thrash'],
  magneton:['Thunderbolt','Tri Attack','Zap Cannon'],
  shellder:['Icicle Spear','Clamp'],diglett:['Dig','Magnitude'],
  voltorb:['Thunderbolt','Rollout'],electrode:['Thunderbolt','Explosion'],
  goldeen:['Waterfall','Horn Drill'],seaking:['Waterfall','Megahorn','Bounce'],
  tauros:['Horn Attack','Giga Impact'],hitmonchan:['Mach Punch','Fire Punch','Counter'],
  // Gen 2
  chikorita:['Razor Leaf','Vine Whip'],bayleef:['Razor Leaf','Synthesis'],meganium:['Petal Dance','Solar Beam'],
  cyndaquil:['Ember','Quick Attack'],quilava:['Flamethrower','Swift'],typhlosion:['Eruption','Flamethrower'],
  totodile:['Water Gun','Scratch'],croconaw:['Water Gun','Slash'],feraligatr:['Crunch','Waterfall','Ice Fang'],
  togepi:['Metronome','Sweet Kiss'],togetic:['Moonblast','Fairy Wind','Air Slash'],
  marill:['Bubble','Aqua Tail'],azumarill:['Play Rough','Aqua Tail','Superpower'],
  teddiursa:['Scratch','Fury Swipes'],ursaring:['Slash','Hammer Arm','Giga Impact'],
  slugma:['Ember','Smog'],magcargo:['Flamethrower','Rock Blast','Earth Power'],
  swinub:['Powder Snow','Ice Shard'],piloswine:['Icicle Crash','Earthquake','Ice Shard'],
  larvitar:['Bite','Rock Slide'],pupitar:['Crunch','Thrash'],tyranitar:['Crunch','Stone Edge','Hyper Beam'],
  misdreavus:['Astonish','Shadow Ball'],mismagius:['Shadow Ball','Mystical Fire','Power Gem'],
  sneasel:['Ice Shard','Night Slash'],weavile:['Night Slash','Ice Punch','Blizzard'],
  hoppip:['Tackle','Dazzling Gleam'],skiploom:['Bullet Seed','Petal Dance'],
  stantler:['Stomp','Megahorn','Zen Headbutt'],wyrdeer:['Zen Headbutt','Psyshield Bash'],
  snubbull:['Bite','Charm'],granbull:['Play Rough','Crunch','Outrage'],
  piloswine:['Icicle Crash','Earthquake'],
  elekid:['Thundershock','Quick Attack'],electabuzz:['Thunderbolt','Thunder Punch'],electivire:['Thunder Punch','Ice Punch','Wild Charge'],
  magby:['Ember','Fire Punch'],magmortar:['Lava Plume','Fire Blast','Thunderbolt'],
  // Gen 3
  mudkip:['Water Gun','Mud-Slap'],marshtomp:['Mud Shot','Surf'],swampert:['Muddy Water','Earthquake','Hydro Pump'],
  treecko:['Bullet Seed','Quick Attack'],grovyle:['Leaf Blade','Detect'],sceptile:['Leaf Blade','Dragon Claw','Leaf Storm'],
  torchic:['Ember','Peck'],combusken:['Double Kick','Blaze Kick'],blaziken:['Blaze Kick','High Jump Kick','Blast Burn'],
  ralts:['Confusion','Disarming Voice'],kirlia:['Magical Leaf','Psychic'],gardevoir:['Moonblast','Psychic','Dazzling Gleam'],
  beldum:['Take Down','Metal Claw'],metang:['Meteor Mash','Confusion'],metagross:['Meteor Mash','Psychic','Earthquake'],
  electrike:['Spark','Bite'],manectric:['Thunderbolt','Discharge','Overheat'],
  swablu:['Peck','Dragon Breath'],altaria:['Dragon Breath','Moonblast','Dragon Dance'],
  shroomish:['Absorb','Stun Spore'],breloom:['Mach Punch','Spore','Seed Bomb'],
  wailmer:['Water Pulse','Amnesia'],wailord:['Water Spout','Surf','Heavy Slam'],
  meditite:['Meditate','Hi Jump Kick'],medicham:['Hi Jump Kick','Force Palm','Psychic'],
  skitty:['Attract','Copycat'],delcatty:['Play Rough','Attract','Assist'],
  snorunt:['Ice Shard','Crunch'],glalie:['Crunch','Freeze-Dry','Blizzard'],
  bagon:['Bite','Dragon Breath'],shelgon:['Dragon Breath','Protect'],salamence:['Dragon Claw','Flamethrower','Hyper Voice'],
  // Gen 4+
  roggenrola:['Rock Blast','Smack Down'],boldore:['Rock Blast','Power Gem'],gigalith:['Stone Edge','Meteor Beam'],
  litwick:['Ember','Hex'],lampent:['Hex','Will-O-Wisp'],chandelure:['Shadow Ball','Fire Blast'],
  gible:['Dragon Breath','Sand Attack'],gabite:['Dragon Claw','Sand Tomb'],garchomp:['Dragon Claw','Earthquake','Dual Chop'],
  timburr:['Pound','Low Kick'],gurdurr:['Dynamic Punch','Superpower'],conkeldurr:['Dynamic Punch','Hammer Arm','Stone Edge'],
  sandile:['Bite','Torment'],krokorok:['Crunch','Dig'],krookodile:['Crunch','Earthquake','Outrage'],
  // Fallback by type
  _fire:['Ember','Flamethrower','Fire Blast'],_water:['Water Gun','Bubble','Hydro Pump'],
  _grass:['Vine Whip','Razor Leaf','Petal Blizzard'],_electric:['Thunderbolt','Spark','Discharge'],
  _psychic:['Confusion','Psybeam','Psychic'],_ice:['Icy Wind','Ice Shard','Blizzard'],
  _ghost:['Shadow Ball','Hex','Lick'],_dragon:['Dragon Rage','Dragon Breath','Dragon Claw'],
  _rock:['Rock Throw','Rock Blast','Stone Edge'],_ground:['Dig','Magnitude','Earthquake'],
  _fighting:['Karate Chop','Low Kick','Dynamic Punch'],_poison:['Sludge','Acid','Gunk Shot'],
  _dark:['Bite','Crunch','Sucker Punch'],_steel:['Metal Claw','Flash Cannon','Iron Head'],
  _bug:['Bug Bite','Silver Wind','Bug Buzz'],_flying:['Gust','Wing Attack','Air Slash'],
  _normal:['Tackle','Quick Attack','Body Slam'],_fairy:['Fairy Wind','Moonblast','Dazzling Gleam'],
}
function getPokeMove(slug, type) {
  const moves = POKE_MOVES[slug] || POKE_MOVES['_'+(type||'normal').toLowerCase()] || ['Tackle']
  return moves[Math.floor(Math.random() * moves.length)]
}
// Show move name popup above attacker sprite wrap
function showMovePopup(wrapEl, moveName, typeColor) {
  if (!wrapEl || !moveName) return
  const rect = wrapEl.getBoundingClientRect()
  const popup = document.createElement('div')
  popup.className = 'move-popup'
  popup.textContent = moveName
  popup.style.left = (rect.left + rect.width / 2) + 'px'
  popup.style.top = (rect.top - 6) + 'px'
  popup.style.background = typeColor
    ? `linear-gradient(135deg,${typeColor},${typeColor}cc)`
    : 'linear-gradient(135deg,#7C3AED,#4c1d95)'
  document.body.appendChild(popup)
  popup.addEventListener('animationend', () => popup.remove(), {once:true})
}

const POKEMON_DB=[
  {id:1,name:'Bulbasaur',slug:'bulbasaur',type:'grass',type2:'poison',gen:1,tier:1},
  {id:2,name:'Ivysaur',slug:'ivysaur',type:'grass',type2:'poison',gen:1,tier:2},
  {id:3,name:'Venusaur',slug:'venusaur',type:'grass',type2:'poison',gen:1,tier:3},
  {id:4,name:'Charmander',slug:'charmander',type:'fire',gen:1,tier:1},
  {id:5,name:'Charmeleon',slug:'charmeleon',type:'fire',gen:1,tier:2},
  {id:6,name:'Charizard',slug:'charizard',type:'fire',type2:'flying',gen:1,tier:3},
  {id:7,name:'Squirtle',slug:'squirtle',type:'water',gen:1,tier:1},
  {id:8,name:'Wartortle',slug:'wartortle',type:'water',gen:1,tier:2},
  {id:9,name:'Blastoise',slug:'blastoise',type:'water',gen:1,tier:3},
  {id:10,name:'Caterpie',slug:'caterpie',type:'bug',gen:1,tier:1},
  {id:11,name:'Metapod',slug:'metapod',type:'bug',gen:1,tier:2},
  {id:12,name:'Butterfree',slug:'butterfree',type:'bug',type2:'flying',gen:1,tier:3},
  {id:13,name:'Weedle',slug:'weedle',type:'bug',type2:'poison',gen:1,tier:1},
  {id:14,name:'Kakuna',slug:'kakuna',type:'bug',type2:'poison',gen:1,tier:2},
  {id:15,name:'Beedrill',slug:'beedrill',type:'bug',type2:'poison',gen:1,tier:3},
  {id:16,name:'Pidgey',slug:'pidgey',type:'normal',type2:'flying',gen:1,tier:1},
  {id:17,name:'Pidgeotto',slug:'pidgeotto',type:'normal',type2:'flying',gen:1,tier:2},
  {id:18,name:'Pidgeot',slug:'pidgeot',type:'normal',type2:'flying',gen:1,tier:3},
  {id:19,name:'Rattata',slug:'rattata',type:'normal',gen:1,tier:2},
  {id:20,name:'Raticate',slug:'raticate',type:'normal',gen:1,tier:3},
  {id:21,name:'Spearow',slug:'spearow',type:'normal',type2:'flying',gen:1,tier:2},
  {id:22,name:'Fearow',slug:'fearow',type:'normal',type2:'flying',gen:1,tier:3},
  {id:23,name:'Ekans',slug:'ekans',type:'poison',gen:1,tier:2},
  {id:24,name:'Arbok',slug:'arbok',type:'poison',gen:1,tier:3},
  {id:25,name:'Pikachu',slug:'pikachu',type:'electric',gen:1,tier:2},
  {id:26,name:'Raichu',slug:'raichu',type:'electric',gen:1,tier:3},
  {id:27,name:'Sandshrew',slug:'sandshrew',type:'ground',gen:1,tier:2},
  {id:28,name:'Sandslash',slug:'sandslash',type:'ground',gen:1,tier:3},
  {id:29,name:'Nidoran-F',slug:'nidoran-f',type:'poison',gen:1,tier:1},
  {id:30,name:'Nidorina',slug:'nidorina',type:'poison',gen:1,tier:2},
  {id:31,name:'Nidoqueen',slug:'nidoqueen',type:'poison',type2:'ground',gen:1,tier:3},
  {id:32,name:'Nidoran-M',slug:'nidoran-m',type:'poison',gen:1,tier:1},
  {id:33,name:'Nidorino',slug:'nidorino',type:'poison',gen:1,tier:2},
  {id:34,name:'Nidoking',slug:'nidoking',type:'poison',type2:'ground',gen:1,tier:3},
  {id:35,name:'Clefairy',slug:'clefairy',type:'fairy',gen:1,tier:2},
  {id:36,name:'Clefable',slug:'clefable',type:'fairy',gen:1,tier:3},
  {id:37,name:'Vulpix',slug:'vulpix',type:'fire',gen:1,tier:2},
  {id:38,name:'Ninetales',slug:'ninetales',type:'fire',gen:1,tier:3},
  {id:39,name:'Jigglypuff',slug:'jigglypuff',type:'normal',type2:'fairy',gen:1,tier:2},
  {id:40,name:'Wigglytuff',slug:'wigglytuff',type:'normal',type2:'fairy',gen:1,tier:3},
  {id:41,name:'Zubat',slug:'zubat',type:'poison',type2:'flying',gen:1,tier:1},
  {id:42,name:'Golbat',slug:'golbat',type:'poison',type2:'flying',gen:1,tier:1},
  {id:43,name:'Oddish',slug:'oddish',type:'grass',type2:'poison',gen:1,tier:1},
  {id:44,name:'Gloom',slug:'gloom',type:'grass',type2:'poison',gen:1,tier:2},
  {id:45,name:'Vileplume',slug:'vileplume',type:'grass',type2:'poison',gen:1,tier:3},
  {id:46,name:'Paras',slug:'paras',type:'bug',type2:'grass',gen:1,tier:2},
  {id:47,name:'Parasect',slug:'parasect',type:'bug',type2:'grass',gen:1,tier:3},
  {id:48,name:'Venonat',slug:'venonat',type:'bug',type2:'poison',gen:1,tier:2},
  {id:49,name:'Venomoth',slug:'venomoth',type:'bug',type2:'poison',gen:1,tier:3},
  {id:50,name:'Diglett',slug:'diglett',type:'ground',gen:1,tier:2},
  {id:51,name:'Dugtrio',slug:'dugtrio',type:'ground',gen:1,tier:3},
  {id:52,name:'Meowth',slug:'meowth',type:'normal',gen:1,tier:2},
  {id:53,name:'Persian',slug:'persian',type:'normal',gen:1,tier:3},
  {id:54,name:'Psyduck',slug:'psyduck',type:'water',gen:1,tier:2},
  {id:55,name:'Golduck',slug:'golduck',type:'water',gen:1,tier:3},
  {id:56,name:'Mankey',slug:'mankey',type:'fighting',gen:1,tier:2},
  {id:57,name:'Primeape',slug:'primeape',type:'fighting',gen:1,tier:3},
  {id:58,name:'Growlithe',slug:'growlithe',type:'fire',gen:1,tier:2},
  {id:59,name:'Arcanine',slug:'arcanine',type:'fire',gen:1,tier:3},
  {id:60,name:'Poliwag',slug:'poliwag',type:'water',gen:1,tier:1},
  {id:61,name:'Poliwhirl',slug:'poliwhirl',type:'water',gen:1,tier:2},
  {id:62,name:'Poliwrath',slug:'poliwrath',type:'water',type2:'fighting',gen:1,tier:3},
  {id:63,name:'Abra',slug:'abra',type:'psychic',gen:1,tier:1},
  {id:64,name:'Kadabra',slug:'kadabra',type:'psychic',gen:1,tier:2},
  {id:65,name:'Alakazam',slug:'alakazam',type:'psychic',gen:1,tier:3},
  {id:66,name:'Machop',slug:'machop',type:'fighting',gen:1,tier:1},
  {id:67,name:'Machoke',slug:'machoke',type:'fighting',gen:1,tier:2},
  {id:68,name:'Machamp',slug:'machamp',type:'fighting',gen:1,tier:3},
  {id:69,name:'Bellsprout',slug:'bellsprout',type:'grass',type2:'poison',gen:1,tier:1},
  {id:70,name:'Weepinbell',slug:'weepinbell',type:'grass',type2:'poison',gen:1,tier:2},
  {id:71,name:'Victreebel',slug:'victreebel',type:'grass',type2:'poison',gen:1,tier:3},
  {id:72,name:'Tentacool',slug:'tentacool',type:'water',type2:'poison',gen:1,tier:2},
  {id:73,name:'Tentacruel',slug:'tentacruel',type:'water',type2:'poison',gen:1,tier:3},
  {id:74,name:'Geodude',slug:'geodude',type:'rock',type2:'ground',gen:1,tier:1},
  {id:75,name:'Graveler',slug:'graveler',type:'rock',type2:'ground',gen:1,tier:2},
  {id:76,name:'Golem',slug:'golem',type:'rock',type2:'ground',gen:1,tier:3},
  {id:77,name:'Ponyta',slug:'ponyta',type:'fire',gen:1,tier:2},
  {id:78,name:'Rapidash',slug:'rapidash',type:'fire',gen:1,tier:3},
  {id:79,name:'Slowpoke',slug:'slowpoke',type:'water',type2:'psychic',gen:1,tier:2},
  {id:80,name:'Slowbro',slug:'slowbro',type:'water',type2:'psychic',gen:1,tier:3},
  {id:81,name:'Magnemite',slug:'magnemite',type:'electric',type2:'steel',gen:1,tier:2},
  {id:82,name:'Magneton',slug:'magneton',type:'electric',type2:'steel',gen:1,tier:3},
  {id:83,name:'Farfetch&#39;d',slug:'farfetchd',type:'normal',type2:'flying',gen:1,tier:1},
  {id:84,name:'Doduo',slug:'doduo',type:'normal',type2:'flying',gen:1,tier:2},
  {id:85,name:'Dodrio',slug:'dodrio',type:'normal',type2:'flying',gen:1,tier:3},
  {id:86,name:'Seel',slug:'seel',type:'water',gen:1,tier:2},
  {id:87,name:'Dewgong',slug:'dewgong',type:'water',type2:'ice',gen:1,tier:3},
  {id:88,name:'Grimer',slug:'grimer',type:'poison',gen:1,tier:2},
  {id:89,name:'Muk',slug:'muk',type:'poison',gen:1,tier:3},
  {id:90,name:'Shellder',slug:'shellder',type:'water',gen:1,tier:2},
  {id:91,name:'Cloyster',slug:'cloyster',type:'water',type2:'ice',gen:1,tier:3},
  {id:92,name:'Gastly',slug:'gastly',type:'ghost',type2:'poison',gen:1,tier:1},
  {id:93,name:'Haunter',slug:'haunter',type:'ghost',type2:'poison',gen:1,tier:2},
  {id:94,name:'Gengar',slug:'gengar',type:'ghost',type2:'poison',gen:1,tier:3},
  {id:95,name:'Onix',slug:'onix',type:'rock',type2:'ground',gen:1,tier:1},
  {id:96,name:'Drowzee',slug:'drowzee',type:'psychic',gen:1,tier:2},
  {id:97,name:'Hypno',slug:'hypno',type:'psychic',gen:1,tier:3},
  {id:98,name:'Krabby',slug:'krabby',type:'water',gen:1,tier:2},
  {id:99,name:'Kingler',slug:'kingler',type:'water',gen:1,tier:3},
  {id:100,name:'Voltorb',slug:'voltorb',type:'electric',gen:1,tier:2},
  {id:101,name:'Electrode',slug:'electrode',type:'electric',gen:1,tier:3},
  {id:102,name:'Exeggcute',slug:'exeggcute',type:'grass',type2:'psychic',gen:1,tier:2},
  {id:103,name:'Exeggutor',slug:'exeggutor',type:'grass',type2:'psychic',gen:1,tier:3},
  {id:104,name:'Cubone',slug:'cubone',type:'ground',gen:1,tier:2},
  {id:105,name:'Marowak',slug:'marowak',type:'ground',gen:1,tier:3},
  {id:106,name:'Hitmonlee',slug:'hitmonlee',type:'fighting',gen:1,tier:3},
  {id:107,name:'Hitmonchan',slug:'hitmonchan',type:'fighting',gen:1,tier:3},
  {id:108,name:'Lickitung',slug:'lickitung',type:'normal',gen:1,tier:3},
  {id:109,name:'Koffing',slug:'koffing',type:'poison',gen:1,tier:1},
  {id:110,name:'Weezing',slug:'weezing',type:'poison',gen:1,tier:3},
  {id:111,name:'Rhyhorn',slug:'rhyhorn',type:'ground',type2:'rock',gen:1,tier:1},
  {id:112,name:'Rhydon',slug:'rhydon',type:'ground',type2:'rock',gen:1,tier:3},
  {id:113,name:'Chansey',slug:'chansey',type:'normal',gen:1,tier:3},
  {id:114,name:'Tangela',slug:'tangela',type:'grass',gen:1,tier:3},
  {id:115,name:'Kangaskhan',slug:'kangaskhan',type:'normal',gen:1,tier:3},
  {id:116,name:'Horsea',slug:'horsea',type:'water',gen:1,tier:2},
  {id:117,name:'Seadra',slug:'seadra',type:'water',gen:1,tier:3},
  {id:118,name:'Goldeen',slug:'goldeen',type:'water',gen:1,tier:2},
  {id:119,name:'Seaking',slug:'seaking',type:'water',gen:1,tier:3},
  {id:120,name:'Staryu',slug:'staryu',type:'water',gen:1,tier:2},
  {id:121,name:'Starmie',slug:'starmie',type:'water',type2:'psychic',gen:1,tier:3},
  {id:122,name:'Mr. Mime',slug:'mr-mime',type:'psychic',type2:'fairy',gen:1,tier:3},
  {id:123,name:'Scyther',slug:'scyther',type:'bug',type2:'flying',gen:1,tier:3},
  {id:124,name:'Jynx',slug:'jynx',type:'ice',type2:'psychic',gen:1,tier:3},
  {id:125,name:'Electabuzz',slug:'electabuzz',type:'electric',gen:1,tier:3},
  {id:126,name:'Magmar',slug:'magmar',type:'fire',gen:1,tier:3},
  {id:127,name:'Pinsir',slug:'pinsir',type:'bug',gen:1,tier:3},
  {id:128,name:'Tauros',slug:'tauros',type:'normal',gen:1,tier:3},
  {id:129,name:'Magikarp',slug:'magikarp',type:'water',gen:1,tier:2},
  {id:130,name:'Gyarados',slug:'gyarados',type:'water',type2:'flying',gen:1,tier:3},
  {id:131,name:'Lapras',slug:'lapras',type:'water',type2:'ice',gen:1,tier:3},
  {id:132,name:'Ditto',slug:'ditto',type:'normal',gen:1,tier:3},
  {id:133,name:'Eevee',slug:'eevee',type:'normal',gen:1,tier:2},
  {id:134,name:'Vaporeon',slug:'vaporeon',type:'water',gen:1,tier:3},
  {id:135,name:'Jolteon',slug:'jolteon',type:'electric',gen:1,tier:3},
  {id:136,name:'Flareon',slug:'flareon',type:'fire',gen:1,tier:3},
  {id:137,name:'Porygon',slug:'porygon',type:'normal',gen:1,tier:3},
  {id:138,name:'Omanyte',slug:'omanyte',type:'rock',type2:'water',gen:1,tier:2},
  {id:139,name:'Omastar',slug:'omastar',type:'rock',type2:'water',gen:1,tier:3},
  {id:140,name:'Kabuto',slug:'kabuto',type:'rock',type2:'water',gen:1,tier:2},
  {id:141,name:'Kabutops',slug:'kabutops',type:'rock',type2:'water',gen:1,tier:3},
  {id:142,name:'Aerodactyl',slug:'aerodactyl',type:'rock',type2:'flying',gen:1,tier:3},
  {id:143,name:'Snorlax',slug:'snorlax',type:'normal',gen:1,tier:3},
  {id:144,name:'Articuno',slug:'articuno',type:'ice',type2:'flying',gen:1,tier:4},
  {id:145,name:'Zapdos',slug:'zapdos',type:'electric',type2:'flying',gen:1,tier:4},
  {id:146,name:'Moltres',slug:'moltres',type:'fire',type2:'flying',gen:1,tier:4},
  {id:147,name:'Dratini',slug:'dratini',type:'dragon',gen:1,tier:2},
  {id:148,name:'Dragonair',slug:'dragonair',type:'dragon',gen:1,tier:2},
  {id:149,name:'Dragonite',slug:'dragonite',type:'dragon',type2:'flying',gen:1,tier:3},
  {id:150,name:'Mewtwo',slug:'mewtwo',type:'psychic',gen:1,tier:4},
  {id:151,name:'Mew',slug:'mew',type:'psychic',gen:1,tier:4},
  {id:152,name:'Chikorita',slug:'chikorita',type:'grass',gen:2,tier:1},
  {id:153,name:'Bayleef',slug:'bayleef',type:'grass',gen:2,tier:2},
  {id:154,name:'Meganium',slug:'meganium',type:'grass',gen:2,tier:3},
  {id:155,name:'Cyndaquil',slug:'cyndaquil',type:'fire',gen:2,tier:1},
  {id:156,name:'Quilava',slug:'quilava',type:'fire',gen:2,tier:2},
  {id:157,name:'Typhlosion',slug:'typhlosion',type:'fire',gen:2,tier:3},
  {id:158,name:'Totodile',slug:'totodile',type:'water',gen:2,tier:1},
  {id:159,name:'Croconaw',slug:'croconaw',type:'water',gen:2,tier:2},
  {id:160,name:'Feraligatr',slug:'feraligatr',type:'water',gen:2,tier:3},
  {id:161,name:'Sentret',slug:'sentret',type:'normal',gen:2,tier:2},
  {id:162,name:'Furret',slug:'furret',type:'normal',gen:2,tier:3},
  {id:163,name:'Hoothoot',slug:'hoothoot',type:'normal',type2:'flying',gen:2,tier:2},
  {id:164,name:'Noctowl',slug:'noctowl',type:'normal',type2:'flying',gen:2,tier:3},
  {id:165,name:'Ledyba',slug:'ledyba',type:'bug',type2:'flying',gen:2,tier:2},
  {id:166,name:'Ledian',slug:'ledian',type:'bug',type2:'flying',gen:2,tier:3},
  {id:167,name:'Spinarak',slug:'spinarak',type:'bug',type2:'poison',gen:2,tier:2},
  {id:168,name:'Ariados',slug:'ariados',type:'bug',type2:'poison',gen:2,tier:3},
  {id:169,name:'Crobat',slug:'crobat',type:'poison',type2:'flying',gen:2,tier:2},
  {id:170,name:'Chinchou',slug:'chinchou',type:'water',type2:'electric',gen:2,tier:3},
  {id:171,name:'Lanturn',slug:'lanturn',type:'water',type2:'electric',gen:2,tier:3},
  {id:172,name:'Pichu',slug:'pichu',type:'electric',gen:2,tier:1},
  {id:173,name:'Cleffa',slug:'cleffa',type:'fairy',gen:2,tier:1},
  {id:174,name:'Igglybuff',slug:'igglybuff',type:'normal',type2:'fairy',gen:2,tier:2},
  {id:175,name:'Togepi',slug:'togepi',type:'fairy',gen:2,tier:1},
  {id:176,name:'Togetic',slug:'togetic',type:'fairy',type2:'flying',gen:2,tier:2},
  {id:177,name:'Natu',slug:'natu',type:'psychic',type2:'flying',gen:2,tier:2},
  {id:178,name:'Xatu',slug:'xatu',type:'psychic',type2:'flying',gen:2,tier:3},
  {id:179,name:'Mareep',slug:'mareep',type:'electric',gen:2,tier:2},
  {id:180,name:'Flaaffy',slug:'flaaffy',type:'electric',gen:2,tier:1},
  {id:181,name:'Ampharos',slug:'ampharos',type:'electric',gen:2,tier:2},
  {id:182,name:'Bellossom',slug:'bellossom',type:'grass',gen:2,tier:3},
  {id:183,name:'Marill',slug:'marill',type:'water',type2:'fairy',gen:2,tier:2},
  {id:184,name:'Azumarill',slug:'azumarill',type:'water',type2:'fairy',gen:2,tier:3},
  {id:185,name:'Sudowoodo',slug:'sudowoodo',type:'rock',gen:2,tier:3},
  {id:186,name:'Politoed',slug:'politoed',type:'water',gen:2,tier:3},
  {id:187,name:'Hoppip',slug:'hoppip',type:'grass',type2:'flying',gen:2,tier:2},
  {id:188,name:'Skiploom',slug:'skiploom',type:'grass',type2:'flying',gen:2,tier:2},
  {id:189,name:'Jumpluff',slug:'jumpluff',type:'grass',type2:'flying',gen:2,tier:3},
  {id:190,name:'Aipom',slug:'aipom',type:'normal',gen:2,tier:2},
  {id:191,name:'Sunkern',slug:'sunkern',type:'grass',gen:2,tier:1},
  {id:192,name:'Sunflora',slug:'sunflora',type:'grass',gen:2,tier:3},
  {id:193,name:'Yanma',slug:'yanma',type:'bug',type2:'flying',gen:2,tier:2},
  {id:194,name:'Wooper',slug:'wooper',type:'water',type2:'ground',gen:2,tier:2},
  {id:195,name:'Quagsire',slug:'quagsire',type:'water',type2:'ground',gen:2,tier:3},
  {id:196,name:'Espeon',slug:'espeon',type:'psychic',gen:2,tier:2},
  {id:197,name:'Umbreon',slug:'umbreon',type:'dark',gen:2,tier:3},
  {id:198,name:'Murkrow',slug:'murkrow',type:'dark',type2:'flying',gen:2,tier:2},
  {id:199,name:'Slowking',slug:'slowking',type:'water',type2:'psychic',gen:2,tier:3},
  {id:200,name:'Misdreavus',slug:'misdreavus',type:'ghost',gen:2,tier:2},
  {id:201,name:'Unown',slug:'unown',type:'psychic',gen:2,tier:2},
  {id:202,name:'Wobbuffet',slug:'wobbuffet',type:'psychic',gen:2,tier:3},
  {id:203,name:'Girafarig',slug:'girafarig',type:'normal',type2:'psychic',gen:2,tier:3},
  {id:204,name:'Pineco',slug:'pineco',type:'bug',gen:2,tier:2},
  {id:205,name:'Forretress',slug:'forretress',type:'bug',type2:'steel',gen:2,tier:3},
  {id:206,name:'Dunsparce',slug:'dunsparce',type:'normal',gen:2,tier:1},
  {id:207,name:'Gligar',slug:'gligar',type:'ground',type2:'flying',gen:2,tier:2},
  {id:208,name:'Steelix',slug:'steelix',type:'steel',type2:'ground',gen:2,tier:3},
  {id:209,name:'Snubbull',slug:'snubbull',type:'fairy',gen:2,tier:2},
  {id:210,name:'Granbull',slug:'granbull',type:'fairy',gen:2,tier:3},
  {id:211,name:'Qwilfish',slug:'qwilfish',type:'water',type2:'poison',gen:2,tier:2},
  {id:212,name:'Scizor',slug:'scizor',type:'bug',type2:'steel',gen:2,tier:3},
  {id:213,name:'Shuckle',slug:'shuckle',type:'bug',type2:'rock',gen:2,tier:2},
  {id:214,name:'Heracross',slug:'heracross',type:'bug',type2:'fighting',gen:2,tier:3},
  {id:215,name:'Sneasel',slug:'sneasel',type:'dark',type2:'ice',gen:2,tier:2},
  {id:216,name:'Teddiursa',slug:'teddiursa',type:'normal',gen:2,tier:2},
  {id:217,name:'Ursaring',slug:'ursaring',type:'normal',gen:2,tier:3},
  {id:218,name:'Slugma',slug:'slugma',type:'fire',gen:2,tier:2},
  {id:219,name:'Magcargo',slug:'magcargo',type:'fire',type2:'rock',gen:2,tier:3},
  {id:220,name:'Swinub',slug:'swinub',type:'ice',type2:'ground',gen:2,tier:2},
  {id:221,name:'Piloswine',slug:'piloswine',type:'ice',type2:'ground',gen:2,tier:3},
  {id:222,name:'Corsola',slug:'corsola',type:'water',type2:'rock',gen:2,tier:1},
  {id:223,name:'Remoraid',slug:'remoraid',type:'water',gen:2,tier:2},
  {id:224,name:'Octillery',slug:'octillery',type:'water',gen:2,tier:3},
  {id:225,name:'Delibird',slug:'delibird',type:'ice',type2:'flying',gen:2,tier:3},
  {id:226,name:'Mantine',slug:'mantine',type:'water',type2:'flying',gen:2,tier:3},
  {id:227,name:'Skarmory',slug:'skarmory',type:'steel',type2:'flying',gen:2,tier:2},
  {id:228,name:'Houndour',slug:'houndour',type:'dark',type2:'fire',gen:2,tier:2},
  {id:229,name:'Houndoom',slug:'houndoom',type:'dark',type2:'fire',gen:2,tier:3},
  {id:230,name:'Kingdra',slug:'kingdra',type:'water',type2:'dragon',gen:2,tier:3},
  {id:231,name:'Phanpy',slug:'phanpy',type:'ground',gen:2,tier:2},
  {id:232,name:'Donphan',slug:'donphan',type:'ground',gen:2,tier:3},
  {id:233,name:'Porygon2',slug:'porygon2',type:'normal',gen:2,tier:3},
  {id:234,name:'Stantler',slug:'stantler',type:'normal',gen:2,tier:3},
  {id:235,name:'Smeargle',slug:'smeargle',type:'normal',gen:2,tier:1},
  {id:236,name:'Tyrogue',slug:'tyrogue',type:'fighting',gen:2,tier:2},
  {id:237,name:'Hitmontop',slug:'hitmontop',type:'fighting',gen:2,tier:3},
  {id:238,name:'Smoochum',slug:'smoochum',type:'ice',type2:'psychic',gen:2,tier:1},
  {id:239,name:'Elekid',slug:'elekid',type:'electric',gen:2,tier:1},
  {id:240,name:'Magby',slug:'magby',type:'fire',gen:2,tier:1},
  {id:241,name:'Miltank',slug:'miltank',type:'normal',gen:2,tier:3},
  {id:242,name:'Blissey',slug:'blissey',type:'normal',gen:2,tier:3},
  {id:243,name:'Raikou',slug:'raikou',type:'electric',gen:2,tier:4},
  {id:244,name:'Entei',slug:'entei',type:'fire',gen:2,tier:4},
  {id:245,name:'Suicune',slug:'suicune',type:'water',gen:2,tier:4},
  {id:246,name:'Larvitar',slug:'larvitar',type:'rock',type2:'ground',gen:2,tier:1},
  {id:247,name:'Pupitar',slug:'pupitar',type:'rock',type2:'ground',gen:2,tier:1},
  {id:248,name:'Tyranitar',slug:'tyranitar',type:'rock',type2:'dark',gen:2,tier:3},
  {id:249,name:'Lugia',slug:'lugia',type:'psychic',type2:'flying',gen:2,tier:4},
  {id:250,name:'Ho-Oh',slug:'ho-oh',type:'fire',type2:'flying',gen:2,tier:4},
  {id:251,name:'Celebi',slug:'celebi',type:'psychic',type2:'grass',gen:2,tier:4},
  {id:252,name:'Treecko',slug:'treecko',type:'grass',gen:3,tier:1},
  {id:253,name:'Grovyle',slug:'grovyle',type:'grass',gen:3,tier:2},
  {id:254,name:'Sceptile',slug:'sceptile',type:'grass',gen:3,tier:3},
  {id:255,name:'Torchic',slug:'torchic',type:'fire',gen:3,tier:1},
  {id:256,name:'Combusken',slug:'combusken',type:'fire',type2:'fighting',gen:3,tier:2},
  {id:257,name:'Blaziken',slug:'blaziken',type:'fire',type2:'fighting',gen:3,tier:3},
  {id:258,name:'Mudkip',slug:'mudkip',type:'water',gen:3,tier:1},
  {id:259,name:'Marshtomp',slug:'marshtomp',type:'water',type2:'ground',gen:3,tier:2},
  {id:260,name:'Swampert',slug:'swampert',type:'water',type2:'ground',gen:3,tier:3},
  {id:261,name:'Poochyena',slug:'poochyena',type:'dark',gen:3,tier:2},
  {id:262,name:'Mightyena',slug:'mightyena',type:'dark',gen:3,tier:3},
  {id:263,name:'Zigzagoon',slug:'zigzagoon',type:'normal',gen:3,tier:2},
  {id:264,name:'Linoone',slug:'linoone',type:'normal',gen:3,tier:3},
  {id:265,name:'Wurmple',slug:'wurmple',type:'bug',gen:3,tier:1},
  {id:266,name:'Silcoon',slug:'silcoon',type:'bug',gen:3,tier:2},
  {id:267,name:'Beautifly',slug:'beautifly',type:'bug',type2:'flying',gen:3,tier:3},
  {id:268,name:'Cascoon',slug:'cascoon',type:'bug',gen:3,tier:2},
  {id:269,name:'Dustox',slug:'dustox',type:'bug',type2:'poison',gen:3,tier:3},
  {id:270,name:'Lotad',slug:'lotad',type:'water',type2:'grass',gen:3,tier:1},
  {id:271,name:'Lombre',slug:'lombre',type:'water',type2:'grass',gen:3,tier:2},
  {id:272,name:'Ludicolo',slug:'ludicolo',type:'water',type2:'grass',gen:3,tier:3},
  {id:273,name:'Seedot',slug:'seedot',type:'grass',gen:3,tier:1},
  {id:274,name:'Nuzleaf',slug:'nuzleaf',type:'grass',type2:'dark',gen:3,tier:2},
  {id:275,name:'Shiftry',slug:'shiftry',type:'grass',type2:'dark',gen:3,tier:3},
  {id:276,name:'Taillow',slug:'taillow',type:'normal',type2:'flying',gen:3,tier:2},
  {id:277,name:'Swellow',slug:'swellow',type:'normal',type2:'flying',gen:3,tier:3},
  {id:278,name:'Wingull',slug:'wingull',type:'water',type2:'flying',gen:3,tier:2},
  {id:279,name:'Pelipper',slug:'pelipper',type:'water',type2:'flying',gen:3,tier:3},
  {id:280,name:'Ralts',slug:'ralts',type:'psychic',type2:'fairy',gen:3,tier:1},
  {id:281,name:'Kirlia',slug:'kirlia',type:'psychic',type2:'fairy',gen:3,tier:2},
  {id:282,name:'Gardevoir',slug:'gardevoir',type:'psychic',type2:'fairy',gen:3,tier:3},
  {id:283,name:'Surskit',slug:'surskit',type:'bug',type2:'water',gen:3,tier:2},
  {id:284,name:'Masquerain',slug:'masquerain',type:'bug',type2:'flying',gen:3,tier:3},
  {id:285,name:'Shroomish',slug:'shroomish',type:'grass',gen:3,tier:2},
  {id:286,name:'Breloom',slug:'breloom',type:'grass',type2:'fighting',gen:3,tier:3},
  {id:287,name:'Slakoth',slug:'slakoth',type:'normal',gen:3,tier:2},
  {id:288,name:'Vigoroth',slug:'vigoroth',type:'normal',gen:3,tier:3},
  {id:289,name:'Slaking',slug:'slaking',type:'normal',gen:3,tier:1},
  {id:290,name:'Nincada',slug:'nincada',type:'bug',type2:'ground',gen:3,tier:2},
  {id:291,name:'Ninjask',slug:'ninjask',type:'bug',type2:'flying',gen:3,tier:3},
  {id:292,name:'Shedinja',slug:'shedinja',type:'bug',type2:'ghost',gen:3,tier:3},
  {id:293,name:'Whismur',slug:'whismur',type:'normal',gen:3,tier:1},
  {id:294,name:'Loudred',slug:'loudred',type:'normal',gen:3,tier:2},
  {id:295,name:'Exploud',slug:'exploud',type:'normal',gen:3,tier:3},
  {id:296,name:'Makuhita',slug:'makuhita',type:'fighting',gen:3,tier:2},
  {id:297,name:'Hariyama',slug:'hariyama',type:'fighting',gen:3,tier:3},
  {id:298,name:'Azurill',slug:'azurill',type:'normal',type2:'fairy',gen:3,tier:2},
  {id:299,name:'Nosepass',slug:'nosepass',type:'rock',gen:3,tier:3},
  {id:300,name:'Skitty',slug:'skitty',type:'normal',gen:3,tier:2},
  {id:301,name:'Delcatty',slug:'delcatty',type:'normal',gen:3,tier:3},
  {id:302,name:'Sableye',slug:'sableye',type:'dark',type2:'ghost',gen:3,tier:2},
  {id:303,name:'Mawile',slug:'mawile',type:'steel',type2:'fairy',gen:3,tier:3},
  {id:304,name:'Aron',slug:'aron',type:'steel',type2:'rock',gen:3,tier:1},
  {id:305,name:'Lairon',slug:'lairon',type:'steel',type2:'rock',gen:3,tier:2},
  {id:306,name:'Aggron',slug:'aggron',type:'steel',type2:'rock',gen:3,tier:3},
  {id:307,name:'Meditite',slug:'meditite',type:'fighting',type2:'psychic',gen:3,tier:2},
  {id:308,name:'Medicham',slug:'medicham',type:'fighting',type2:'psychic',gen:3,tier:3},
  {id:309,name:'Electrike',slug:'electrike',type:'electric',gen:3,tier:2},
  {id:310,name:'Manectric',slug:'manectric',type:'electric',gen:3,tier:3},
  {id:311,name:'Plusle',slug:'plusle',type:'electric',gen:3,tier:2},
  {id:312,name:'Minun',slug:'minun',type:'electric',gen:3,tier:3},
  {id:313,name:'Volbeat',slug:'volbeat',type:'bug',gen:3,tier:2},
  {id:314,name:'Illumise',slug:'illumise',type:'bug',gen:3,tier:3},
  {id:315,name:'Roselia',slug:'roselia',type:'grass',type2:'poison',gen:3,tier:1},
  {id:316,name:'Gulpin',slug:'gulpin',type:'poison',gen:3,tier:2},
  {id:317,name:'Swalot',slug:'swalot',type:'poison',gen:3,tier:3},
  {id:318,name:'Carvanha',slug:'carvanha',type:'water',type2:'dark',gen:3,tier:2},
  {id:319,name:'Sharpedo',slug:'sharpedo',type:'water',type2:'dark',gen:3,tier:3},
  {id:320,name:'Wailmer',slug:'wailmer',type:'water',gen:3,tier:2},
  {id:321,name:'Wailord',slug:'wailord',type:'water',gen:3,tier:3},
  {id:322,name:'Numel',slug:'numel',type:'fire',type2:'ground',gen:3,tier:2},
  {id:323,name:'Camerupt',slug:'camerupt',type:'fire',type2:'ground',gen:3,tier:3},
  {id:324,name:'Torkoal',slug:'torkoal',type:'fire',gen:3,tier:1},
  {id:325,name:'Spoink',slug:'spoink',type:'psychic',gen:3,tier:2},
  {id:326,name:'Grumpig',slug:'grumpig',type:'psychic',gen:3,tier:3},
  {id:327,name:'Spinda',slug:'spinda',type:'normal',gen:3,tier:1},
  {id:328,name:'Trapinch',slug:'trapinch',type:'ground',gen:3,tier:3},
  {id:329,name:'Vibrava',slug:'vibrava',type:'ground',type2:'dragon',gen:3,tier:2},
  {id:330,name:'Flygon',slug:'flygon',type:'ground',type2:'dragon',gen:3,tier:3},
  {id:331,name:'Cacnea',slug:'cacnea',type:'grass',gen:3,tier:2},
  {id:332,name:'Cacturne',slug:'cacturne',type:'grass',type2:'dark',gen:3,tier:3},
  {id:333,name:'Swablu',slug:'swablu',type:'normal',type2:'flying',gen:3,tier:2},
  {id:334,name:'Altaria',slug:'altaria',type:'dragon',type2:'flying',gen:3,tier:3},
  {id:335,name:'Zangoose',slug:'zangoose',type:'normal',gen:3,tier:2},
  {id:336,name:'Seviper',slug:'seviper',type:'poison',gen:3,tier:3},
  {id:337,name:'Lunatone',slug:'lunatone',type:'rock',type2:'psychic',gen:3,tier:2},
  {id:338,name:'Solrock',slug:'solrock',type:'rock',type2:'psychic',gen:3,tier:3},
  {id:339,name:'Barboach',slug:'barboach',type:'water',type2:'ground',gen:3,tier:2},
  {id:340,name:'Whiscash',slug:'whiscash',type:'water',type2:'ground',gen:3,tier:3},
  {id:341,name:'Corphish',slug:'corphish',type:'water',gen:3,tier:2},
  {id:342,name:'Crawdaunt',slug:'crawdaunt',type:'water',type2:'dark',gen:3,tier:3},
  {id:343,name:'Baltoy',slug:'baltoy',type:'ground',type2:'psychic',gen:3,tier:2},
  {id:344,name:'Claydol',slug:'claydol',type:'ground',type2:'psychic',gen:3,tier:3},
  {id:345,name:'Lileep',slug:'lileep',type:'rock',type2:'grass',gen:3,tier:2},
  {id:346,name:'Cradily',slug:'cradily',type:'rock',type2:'grass',gen:3,tier:3},
  {id:347,name:'Anorith',slug:'anorith',type:'rock',type2:'bug',gen:3,tier:2},
  {id:348,name:'Armaldo',slug:'armaldo',type:'rock',type2:'bug',gen:3,tier:3},
  {id:349,name:'Feebas',slug:'feebas',type:'water',gen:3,tier:2},
  {id:350,name:'Milotic',slug:'milotic',type:'water',gen:3,tier:3},
  {id:351,name:'Castform',slug:'castform',type:'normal',gen:3,tier:2},
  {id:352,name:'Kecleon',slug:'kecleon',type:'normal',gen:3,tier:3},
  {id:353,name:'Shuppet',slug:'shuppet',type:'ghost',gen:3,tier:2},
  {id:354,name:'Banette',slug:'banette',type:'ghost',gen:3,tier:3},
  {id:355,name:'Duskull',slug:'duskull',type:'ghost',gen:3,tier:2},
  {id:356,name:'Dusclops',slug:'dusclops',type:'ghost',gen:3,tier:3},
  {id:357,name:'Tropius',slug:'tropius',type:'grass',type2:'flying',gen:3,tier:2},
  {id:358,name:'Chimecho',slug:'chimecho',type:'psychic',gen:3,tier:3},
  {id:359,name:'Absol',slug:'absol',type:'dark',gen:3,tier:1},
  {id:360,name:'Wynaut',slug:'wynaut',type:'psychic',gen:3,tier:1},
  {id:361,name:'Snorunt',slug:'snorunt',type:'ice',gen:3,tier:2},
  {id:362,name:'Glalie',slug:'glalie',type:'ice',gen:3,tier:3},
  {id:363,name:'Spheal',slug:'spheal',type:'ice',type2:'water',gen:3,tier:1},
  {id:364,name:'Sealeo',slug:'sealeo',type:'ice',type2:'water',gen:3,tier:2},
  {id:365,name:'Walrein',slug:'walrein',type:'ice',type2:'water',gen:3,tier:3},
  {id:366,name:'Clamperl',slug:'clamperl',type:'water',gen:3,tier:2},
  {id:367,name:'Huntail',slug:'huntail',type:'water',gen:3,tier:3},
  {id:368,name:'Gorebyss',slug:'gorebyss',type:'water',gen:3,tier:3},
  {id:369,name:'Relicanth',slug:'relicanth',type:'water',type2:'rock',gen:3,tier:3},
  {id:370,name:'Luvdisc',slug:'luvdisc',type:'water',gen:3,tier:3},
  {id:371,name:'Bagon',slug:'bagon',type:'dragon',gen:3,tier:2},
  {id:372,name:'Shelgon',slug:'shelgon',type:'dragon',gen:3,tier:1},
  {id:373,name:'Salamence',slug:'salamence',type:'dragon',type2:'flying',gen:3,tier:3},
  {id:374,name:'Beldum',slug:'beldum',type:'steel',type2:'psychic',gen:3,tier:2},
  {id:375,name:'Metang',slug:'metang',type:'steel',type2:'psychic',gen:3,tier:2},
  {id:376,name:'Metagross',slug:'metagross',type:'steel',type2:'psychic',gen:3,tier:3},
  {id:377,name:'Regirock',slug:'regirock',type:'rock',gen:3,tier:1},
  {id:378,name:'Regice',slug:'regice',type:'ice',gen:3,tier:3},
  {id:379,name:'Registeel',slug:'registeel',type:'steel',gen:3,tier:3},
  {id:380,name:'Latias',slug:'latias',type:'dragon',type2:'psychic',gen:3,tier:4},
  {id:381,name:'Latios',slug:'latios',type:'dragon',type2:'psychic',gen:3,tier:4},
  {id:382,name:'Kyogre',slug:'kyogre',type:'water',gen:3,tier:4},
  {id:383,name:'Groudon',slug:'groudon',type:'ground',gen:3,tier:4},
  {id:384,name:'Rayquaza',slug:'rayquaza',type:'dragon',type2:'flying',gen:3,tier:4},
  {id:385,name:'Jirachi',slug:'jirachi',type:'steel',type2:'psychic',gen:3,tier:4},
  {id:386,name:'Deoxys',slug:'deoxys',type:'psychic',gen:3,tier:4},
  {id:387,name:'Turtwig',slug:'turtwig',type:'grass',gen:4,tier:1},
  {id:388,name:'Grotle',slug:'grotle',type:'grass',gen:4,tier:2},
  {id:389,name:'Torterra',slug:'torterra',type:'grass',type2:'ground',gen:4,tier:3},
  {id:390,name:'Chimchar',slug:'chimchar',type:'fire',gen:4,tier:1},
  {id:391,name:'Monferno',slug:'monferno',type:'fire',type2:'fighting',gen:4,tier:2},
  {id:392,name:'Infernape',slug:'infernape',type:'fire',type2:'fighting',gen:4,tier:3},
  {id:393,name:'Piplup',slug:'piplup',type:'water',gen:4,tier:1},
  {id:394,name:'Prinplup',slug:'prinplup',type:'water',gen:4,tier:2},
  {id:395,name:'Empoleon',slug:'empoleon',type:'water',type2:'steel',gen:4,tier:3},
  {id:396,name:'Starly',slug:'starly',type:'normal',type2:'flying',gen:4,tier:1},
  {id:397,name:'Staravia',slug:'staravia',type:'normal',type2:'flying',gen:4,tier:2},
  {id:398,name:'Staraptor',slug:'staraptor',type:'normal',type2:'flying',gen:4,tier:3},
  {id:399,name:'Bidoof',slug:'bidoof',type:'normal',gen:4,tier:2},
  {id:400,name:'Bibarel',slug:'bibarel',type:'normal',type2:'water',gen:4,tier:3},
  {id:401,name:'Kricketot',slug:'kricketot',type:'bug',gen:4,tier:2},
  {id:402,name:'Kricketune',slug:'kricketune',type:'bug',gen:4,tier:3},
  {id:403,name:'Shinx',slug:'shinx',type:'electric',gen:4,tier:2},
  {id:404,name:'Luxio',slug:'luxio',type:'electric',gen:4,tier:3},
  {id:405,name:'Luxray',slug:'luxray',type:'electric',gen:4,tier:1},
  {id:406,name:'Budew',slug:'budew',type:'grass',type2:'poison',gen:4,tier:2},
  {id:407,name:'Roserade',slug:'roserade',type:'grass',type2:'poison',gen:4,tier:3},
  {id:408,name:'Cranidos',slug:'cranidos',type:'rock',gen:4,tier:2},
  {id:409,name:'Rampardos',slug:'rampardos',type:'rock',gen:4,tier:3},
  {id:410,name:'Shieldon',slug:'shieldon',type:'rock',type2:'steel',gen:4,tier:2},
  {id:411,name:'Bastiodon',slug:'bastiodon',type:'rock',type2:'steel',gen:4,tier:3},
  {id:412,name:'Burmy',slug:'burmy',type:'bug',gen:4,tier:2},
  {id:413,name:'Wormadam',slug:'wormadam',type:'bug',type2:'grass',gen:4,tier:3},
  {id:414,name:'Mothim',slug:'mothim',type:'bug',type2:'flying',gen:4,tier:1},
  {id:415,name:'Combee',slug:'combee',type:'bug',type2:'flying',gen:4,tier:1},
  {id:416,name:'Vespiquen',slug:'vespiquen',type:'bug',type2:'flying',gen:4,tier:3},
  {id:417,name:'Pachirisu',slug:'pachirisu',type:'electric',gen:4,tier:1},
  {id:418,name:'Buizel',slug:'buizel',type:'water',gen:4,tier:2},
  {id:419,name:'Floatzel',slug:'floatzel',type:'water',gen:4,tier:3},
  {id:420,name:'Cherubi',slug:'cherubi',type:'grass',gen:4,tier:2},
  {id:421,name:'Cherrim',slug:'cherrim',type:'grass',gen:4,tier:3},
  {id:422,name:'Shellos',slug:'shellos',type:'water',gen:4,tier:2},
  {id:423,name:'Gastrodon',slug:'gastrodon',type:'water',type2:'ground',gen:4,tier:3},
  {id:424,name:'Ambipom',slug:'ambipom',type:'normal',gen:4,tier:2},
  {id:425,name:'Drifloon',slug:'drifloon',type:'ghost',type2:'flying',gen:4,tier:3},
  {id:426,name:'Drifblim',slug:'drifblim',type:'ghost',type2:'flying',gen:4,tier:3},
  {id:427,name:'Buneary',slug:'buneary',type:'normal',gen:4,tier:2},
  {id:428,name:'Lopunny',slug:'lopunny',type:'normal',gen:4,tier:3},
  {id:429,name:'Mismagius',slug:'mismagius',type:'ghost',gen:4,tier:2},
  {id:430,name:'Honchkrow',slug:'honchkrow',type:'dark',type2:'flying',gen:4,tier:3},
  {id:431,name:'Glameow',slug:'glameow',type:'normal',gen:4,tier:2},
  {id:432,name:'Purugly',slug:'purugly',type:'normal',gen:4,tier:3},
  {id:433,name:'Chingling',slug:'chingling',type:'psychic',gen:4,tier:1},
  {id:434,name:'Stunky',slug:'stunky',type:'poison',type2:'dark',gen:4,tier:2},
  {id:435,name:'Skuntank',slug:'skuntank',type:'poison',type2:'dark',gen:4,tier:3},
  {id:436,name:'Bronzor',slug:'bronzor',type:'steel',type2:'psychic',gen:4,tier:2},
  {id:437,name:'Bronzong',slug:'bronzong',type:'steel',type2:'psychic',gen:4,tier:3},
  {id:438,name:'Bonsly',slug:'bonsly',type:'rock',gen:4,tier:1},
  {id:439,name:'Mime Jr.',slug:'mime-jr',type:'psychic',type2:'fairy',gen:4,tier:3},
  {id:440,name:'Happiny',slug:'happiny',type:'normal',gen:4,tier:2},
  {id:441,name:'Chatot',slug:'chatot',type:'normal',type2:'flying',gen:4,tier:3},
  {id:442,name:'Spiritomb',slug:'spiritomb',type:'ghost',type2:'dark',gen:4,tier:3},
  {id:443,name:'Gible',slug:'gible',type:'dragon',type2:'ground',gen:4,tier:2},
  {id:444,name:'Gabite',slug:'gabite',type:'dragon',type2:'ground',gen:4,tier:3},
  {id:445,name:'Garchomp',slug:'garchomp',type:'dragon',type2:'ground',gen:4,tier:1},
  {id:446,name:'Munchlax',slug:'munchlax',type:'normal',gen:4,tier:1},
  {id:447,name:'Riolu',slug:'riolu',type:'fighting',gen:4,tier:2},
  {id:448,name:'Lucario',slug:'lucario',type:'fighting',type2:'steel',gen:4,tier:3},
  {id:449,name:'Hippopotas',slug:'hippopotas',type:'ground',gen:4,tier:2},
  {id:450,name:'Hippowdon',slug:'hippowdon',type:'ground',gen:4,tier:3},
  {id:451,name:'Skorupi',slug:'skorupi',type:'poison',type2:'bug',gen:4,tier:2},
  {id:452,name:'Drapion',slug:'drapion',type:'poison',type2:'dark',gen:4,tier:3},
  {id:453,name:'Croagunk',slug:'croagunk',type:'poison',type2:'fighting',gen:4,tier:2},
  {id:454,name:'Toxicroak',slug:'toxicroak',type:'poison',type2:'fighting',gen:4,tier:3},
  {id:455,name:'Carnivine',slug:'carnivine',type:'grass',gen:4,tier:2},
  {id:456,name:'Finneon',slug:'finneon',type:'water',gen:4,tier:3},
  {id:457,name:'Lumineon',slug:'lumineon',type:'water',gen:4,tier:2},
  {id:458,name:'Mantyke',slug:'mantyke',type:'water',type2:'flying',gen:4,tier:3},
  {id:459,name:'Snover',slug:'snover',type:'grass',type2:'ice',gen:4,tier:2},
  {id:460,name:'Abomasnow',slug:'abomasnow',type:'grass',type2:'ice',gen:4,tier:3},
  {id:461,name:'Weavile',slug:'weavile',type:'dark',type2:'ice',gen:4,tier:1},
  {id:462,name:'Magnezone',slug:'magnezone',type:'electric',type2:'steel',gen:4,tier:3},
  {id:463,name:'Lickilicky',slug:'lickilicky',type:'normal',gen:4,tier:3},
  {id:464,name:'Rhyperior',slug:'rhyperior',type:'ground',type2:'rock',gen:4,tier:3},
  {id:465,name:'Tangrowth',slug:'tangrowth',type:'grass',gen:4,tier:3},
  {id:466,name:'Electivire',slug:'electivire',type:'electric',gen:4,tier:3},
  {id:467,name:'Magmortar',slug:'magmortar',type:'fire',gen:4,tier:3},
  {id:468,name:'Togekiss',slug:'togekiss',type:'fairy',type2:'flying',gen:4,tier:3},
  {id:469,name:'Yanmega',slug:'yanmega',type:'bug',type2:'flying',gen:4,tier:3},
  {id:470,name:'Leafeon',slug:'leafeon',type:'grass',gen:4,tier:3},
  {id:471,name:'Glaceon',slug:'glaceon',type:'ice',gen:4,tier:3},
  {id:472,name:'Gliscor',slug:'gliscor',type:'ground',type2:'flying',gen:4,tier:3},
  {id:473,name:'Mamoswine',slug:'mamoswine',type:'ice',type2:'ground',gen:4,tier:3},
  {id:474,name:'Porygon-Z',slug:'porygon-z',type:'normal',gen:4,tier:3},
  {id:475,name:'Gallade',slug:'gallade',type:'psychic',type2:'fighting',gen:4,tier:3},
  {id:476,name:'Probopass',slug:'probopass',type:'rock',type2:'steel',gen:4,tier:3},
  {id:477,name:'Dusknoir',slug:'dusknoir',type:'ghost',gen:4,tier:3},
  {id:478,name:'Froslass',slug:'froslass',type:'ice',type2:'ghost',gen:4,tier:3},
  {id:479,name:'Rotom',slug:'rotom',type:'electric',type2:'ghost',gen:4,tier:1},
  {id:480,name:'Uxie',slug:'uxie',type:'psychic',gen:4,tier:4},
  {id:481,name:'Mesprit',slug:'mesprit',type:'psychic',gen:4,tier:4},
  {id:482,name:'Azelf',slug:'azelf',type:'psychic',gen:4,tier:4},
  {id:483,name:'Dialga',slug:'dialga',type:'steel',type2:'dragon',gen:4,tier:4},
  {id:484,name:'Palkia',slug:'palkia',type:'water',type2:'dragon',gen:4,tier:4},
  {id:485,name:'Heatran',slug:'heatran',type:'fire',type2:'steel',gen:4,tier:1},
  {id:486,name:'Regigigas',slug:'regigigas',type:'normal',gen:4,tier:1},
  {id:487,name:'Giratina',slug:'giratina',type:'ghost',type2:'dragon',gen:4,tier:4},
  {id:488,name:'Cresselia',slug:'cresselia',type:'psychic',gen:4,tier:1},
  {id:489,name:'Phione',slug:'phione',type:'water',gen:4,tier:1},
  {id:490,name:'Manaphy',slug:'manaphy',type:'water',gen:4,tier:1},
  {id:491,name:'Darkrai',slug:'darkrai',type:'dark',gen:4,tier:4},
  {id:492,name:'Shaymin',slug:'shaymin',type:'grass',gen:4,tier:4},
  {id:493,name:'Arceus',slug:'arceus',type:'normal',gen:4,tier:4},
  {id:494,name:'Victini',slug:'victini',type:'psychic',type2:'fire',gen:5,tier:1},
  {id:495,name:'Snivy',slug:'snivy',type:'grass',gen:5,tier:1},
  {id:496,name:'Servine',slug:'servine',type:'grass',gen:5,tier:2},
  {id:497,name:'Serperior',slug:'serperior',type:'grass',gen:5,tier:3},
  {id:498,name:'Tepig',slug:'tepig',type:'fire',gen:5,tier:1},
  {id:499,name:'Pignite',slug:'pignite',type:'fire',type2:'fighting',gen:5,tier:2},
  {id:500,name:'Emboar',slug:'emboar',type:'fire',type2:'fighting',gen:5,tier:3},
  {id:501,name:'Oshawott',slug:'oshawott',type:'water',gen:5,tier:1},
  {id:502,name:'Dewott',slug:'dewott',type:'water',gen:5,tier:2},
  {id:503,name:'Samurott',slug:'samurott',type:'water',gen:5,tier:3},
  {id:504,name:'Patrat',slug:'patrat',type:'normal',gen:5,tier:2},
  {id:505,name:'Watchog',slug:'watchog',type:'normal',gen:5,tier:3},
  {id:506,name:'Lillipup',slug:'lillipup',type:'normal',gen:5,tier:1},
  {id:507,name:'Herdier',slug:'herdier',type:'normal',gen:5,tier:2},
  {id:508,name:'Stoutland',slug:'stoutland',type:'normal',gen:5,tier:3},
  {id:509,name:'Purrloin',slug:'purrloin',type:'dark',gen:5,tier:2},
  {id:510,name:'Liepard',slug:'liepard',type:'dark',gen:5,tier:3},
  {id:511,name:'Pansage',slug:'pansage',type:'grass',gen:5,tier:2},
  {id:512,name:'Simisage',slug:'simisage',type:'grass',gen:5,tier:3},
  {id:513,name:'Pansear',slug:'pansear',type:'fire',gen:5,tier:2},
  {id:514,name:'Simisear',slug:'simisear',type:'fire',gen:5,tier:3},
  {id:515,name:'Panpour',slug:'panpour',type:'water',gen:5,tier:2},
  {id:516,name:'Simipour',slug:'simipour',type:'water',gen:5,tier:3},
  {id:517,name:'Munna',slug:'munna',type:'psychic',gen:5,tier:2},
  {id:518,name:'Musharna',slug:'musharna',type:'psychic',gen:5,tier:3},
  {id:519,name:'Pidove',slug:'pidove',type:'normal',type2:'flying',gen:5,tier:1},
  {id:520,name:'Tranquill',slug:'tranquill',type:'normal',type2:'flying',gen:5,tier:2},
  {id:521,name:'Unfezant',slug:'unfezant',type:'normal',type2:'flying',gen:5,tier:3},
  {id:522,name:'Blitzle',slug:'blitzle',type:'electric',gen:5,tier:2},
  {id:523,name:'Zebstrika',slug:'zebstrika',type:'electric',gen:5,tier:3},
  {id:524,name:'Roggenrola',slug:'roggenrola',type:'rock',gen:5,tier:1},
  {id:525,name:'Boldore',slug:'boldore',type:'rock',gen:5,tier:2},
  {id:526,name:'Gigalith',slug:'gigalith',type:'rock',gen:5,tier:3},
  {id:527,name:'Woobat',slug:'woobat',type:'psychic',type2:'flying',gen:5,tier:2},
  {id:528,name:'Swoobat',slug:'swoobat',type:'psychic',type2:'flying',gen:5,tier:3},
  {id:529,name:'Drilbur',slug:'drilbur',type:'ground',gen:5,tier:2},
  {id:530,name:'Excadrill',slug:'excadrill',type:'ground',type2:'steel',gen:5,tier:3},
  {id:531,name:'Audino',slug:'audino',type:'normal',gen:5,tier:2},
  {id:532,name:'Timburr',slug:'timburr',type:'fighting',gen:5,tier:3},
  {id:533,name:'Gurdurr',slug:'gurdurr',type:'fighting',gen:5,tier:2},
  {id:534,name:'Conkeldurr',slug:'conkeldurr',type:'fighting',gen:5,tier:3},
  {id:535,name:'Tympole',slug:'tympole',type:'water',gen:5,tier:1},
  {id:536,name:'Palpitoad',slug:'palpitoad',type:'water',type2:'ground',gen:5,tier:2},
  {id:537,name:'Seismitoad',slug:'seismitoad',type:'water',type2:'ground',gen:5,tier:3},
  {id:538,name:'Throh',slug:'throh',type:'fighting',gen:5,tier:3},
  {id:539,name:'Sawk',slug:'sawk',type:'fighting',gen:5,tier:3},
  {id:540,name:'Sewaddle',slug:'sewaddle',type:'bug',type2:'grass',gen:5,tier:1},
  {id:541,name:'Swadloon',slug:'swadloon',type:'bug',type2:'grass',gen:5,tier:2},
  {id:542,name:'Leavanny',slug:'leavanny',type:'bug',type2:'grass',gen:5,tier:3},
  {id:543,name:'Venipede',slug:'venipede',type:'bug',type2:'poison',gen:5,tier:1},
  {id:544,name:'Whirlipede',slug:'whirlipede',type:'bug',type2:'poison',gen:5,tier:2},
  {id:545,name:'Scolipede',slug:'scolipede',type:'bug',type2:'poison',gen:5,tier:3},
  {id:546,name:'Cottonee',slug:'cottonee',type:'grass',type2:'fairy',gen:5,tier:2},
  {id:547,name:'Whimsicott',slug:'whimsicott',type:'grass',type2:'fairy',gen:5,tier:3},
  {id:548,name:'Petilil',slug:'petilil',type:'grass',gen:5,tier:2},
  {id:549,name:'Lilligant',slug:'lilligant',type:'grass',gen:5,tier:3},
  {id:550,name:'Basculin',slug:'basculin',type:'water',gen:5,tier:2},
  {id:551,name:'Sandile',slug:'sandile',type:'ground',type2:'dark',gen:5,tier:3},
  {id:552,name:'Krokorok',slug:'krokorok',type:'ground',type2:'dark',gen:5,tier:2},
  {id:553,name:'Krookodile',slug:'krookodile',type:'ground',type2:'dark',gen:5,tier:3},
  {id:554,name:'Darumaka',slug:'darumaka',type:'fire',gen:5,tier:2},
  {id:555,name:'Darmanitan',slug:'darmanitan',type:'fire',gen:5,tier:3},
  {id:556,name:'Maractus',slug:'maractus',type:'grass',gen:5,tier:1},
  {id:557,name:'Dwebble',slug:'dwebble',type:'bug',type2:'rock',gen:5,tier:2},
  {id:558,name:'Crustle',slug:'crustle',type:'bug',type2:'rock',gen:5,tier:3},
  {id:559,name:'Scraggy',slug:'scraggy',type:'dark',type2:'fighting',gen:5,tier:2},
  {id:560,name:'Scrafty',slug:'scrafty',type:'dark',type2:'fighting',gen:5,tier:3},
  {id:561,name:'Sigilyph',slug:'sigilyph',type:'psychic',type2:'flying',gen:5,tier:1},
  {id:562,name:'Yamask',slug:'yamask',type:'ghost',gen:5,tier:2},
  {id:563,name:'Cofagrigus',slug:'cofagrigus',type:'ghost',gen:5,tier:3},
  {id:564,name:'Tirtouga',slug:'tirtouga',type:'water',type2:'rock',gen:5,tier:2},
  {id:565,name:'Carracosta',slug:'carracosta',type:'water',type2:'rock',gen:5,tier:3},
  {id:566,name:'Archen',slug:'archen',type:'rock',type2:'flying',gen:5,tier:2},
  {id:567,name:'Archeops',slug:'archeops',type:'rock',type2:'flying',gen:5,tier:3},
  {id:568,name:'Trubbish',slug:'trubbish',type:'poison',gen:5,tier:2},
  {id:569,name:'Garbodor',slug:'garbodor',type:'poison',gen:5,tier:3},
  {id:570,name:'Zorua',slug:'zorua',type:'dark',gen:5,tier:2},
  {id:571,name:'Zoroark',slug:'zoroark',type:'dark',gen:5,tier:3},
  {id:572,name:'Minccino',slug:'minccino',type:'normal',gen:5,tier:2},
  {id:573,name:'Cinccino',slug:'cinccino',type:'normal',gen:5,tier:3},
  {id:574,name:'Gothita',slug:'gothita',type:'psychic',gen:5,tier:1},
  {id:575,name:'Gothorita',slug:'gothorita',type:'psychic',gen:5,tier:2},
  {id:576,name:'Gothitelle',slug:'gothitelle',type:'psychic',gen:5,tier:3},
  {id:577,name:'Solosis',slug:'solosis',type:'psychic',gen:5,tier:1},
  {id:578,name:'Duosion',slug:'duosion',type:'psychic',gen:5,tier:2},
  {id:579,name:'Reuniclus',slug:'reuniclus',type:'psychic',gen:5,tier:3},
  {id:580,name:'Ducklett',slug:'ducklett',type:'water',type2:'flying',gen:5,tier:2},
  {id:581,name:'Swanna',slug:'swanna',type:'water',type2:'flying',gen:5,tier:3},
  {id:582,name:'Vanillite',slug:'vanillite',type:'ice',gen:5,tier:1},
  {id:583,name:'Vanillish',slug:'vanillish',type:'ice',gen:5,tier:2},
  {id:584,name:'Vanilluxe',slug:'vanilluxe',type:'ice',gen:5,tier:3},
  {id:585,name:'Deerling',slug:'deerling',type:'normal',type2:'grass',gen:5,tier:1},
  {id:586,name:'Sawsbuck',slug:'sawsbuck',type:'normal',type2:'grass',gen:5,tier:2},
  {id:587,name:'Emolga',slug:'emolga',type:'electric',type2:'flying',gen:5,tier:3},
  {id:588,name:'Karrablast',slug:'karrablast',type:'bug',gen:5,tier:2},
  {id:589,name:'Escavalier',slug:'escavalier',type:'bug',type2:'steel',gen:5,tier:3},
  {id:590,name:'Foongus',slug:'foongus',type:'grass',type2:'poison',gen:5,tier:2},
  {id:591,name:'Amoonguss',slug:'amoonguss',type:'grass',type2:'poison',gen:5,tier:3},
  {id:592,name:'Frillish',slug:'frillish',type:'water',type2:'ghost',gen:5,tier:2},
  {id:593,name:'Jellicent',slug:'jellicent',type:'water',type2:'ghost',gen:5,tier:3},
  {id:594,name:'Alomomola',slug:'alomomola',type:'water',gen:5,tier:1},
  {id:595,name:'Joltik',slug:'joltik',type:'bug',type2:'electric',gen:5,tier:2},
  {id:596,name:'Galvantula',slug:'galvantula',type:'bug',type2:'electric',gen:5,tier:3},
  {id:597,name:'Ferroseed',slug:'ferroseed',type:'grass',type2:'steel',gen:5,tier:1},
  {id:598,name:'Ferrothorn',slug:'ferrothorn',type:'grass',type2:'steel',gen:5,tier:3},
  {id:599,name:'Klink',slug:'klink',type:'steel',gen:5,tier:1},
  {id:600,name:'Klang',slug:'klang',type:'steel',gen:5,tier:2},
  {id:601,name:'Klinklang',slug:'klinklang',type:'steel',gen:5,tier:3},
  {id:602,name:'Tynamo',slug:'tynamo',type:'electric',gen:5,tier:1},
  {id:603,name:'Eelektrik',slug:'eelektrik',type:'electric',gen:5,tier:2},
  {id:604,name:'Eelektross',slug:'eelektross',type:'electric',gen:5,tier:3},
  {id:605,name:'Elgyem',slug:'elgyem',type:'psychic',gen:5,tier:2},
  {id:606,name:'Beheeyem',slug:'beheeyem',type:'psychic',gen:5,tier:3},
  {id:607,name:'Litwick',slug:'litwick',type:'ghost',type2:'fire',gen:5,tier:1},
  {id:608,name:'Lampent',slug:'lampent',type:'ghost',type2:'fire',gen:5,tier:2},
  {id:609,name:'Chandelure',slug:'chandelure',type:'ghost',type2:'fire',gen:5,tier:3},
  {id:610,name:'Axew',slug:'axew',type:'dragon',gen:5,tier:1},
  {id:611,name:'Fraxure',slug:'fraxure',type:'dragon',gen:5,tier:2},
  {id:612,name:'Haxorus',slug:'haxorus',type:'dragon',gen:5,tier:3},
  {id:613,name:'Cubchoo',slug:'cubchoo',type:'ice',gen:5,tier:2},
  {id:614,name:'Beartic',slug:'beartic',type:'ice',gen:5,tier:3},
  {id:615,name:'Cryogonal',slug:'cryogonal',type:'ice',gen:5,tier:3},
  {id:616,name:'Shelmet',slug:'shelmet',type:'bug',gen:5,tier:2},
  {id:617,name:'Accelgor',slug:'accelgor',type:'bug',gen:5,tier:3},
  {id:618,name:'Stunfisk',slug:'stunfisk',type:'ground',type2:'electric',gen:5,tier:3},
  {id:619,name:'Mienfoo',slug:'mienfoo',type:'fighting',gen:5,tier:2},
  {id:620,name:'Mienshao',slug:'mienshao',type:'fighting',gen:5,tier:3},
  {id:621,name:'Druddigon',slug:'druddigon',type:'dragon',gen:5,tier:3},
  {id:622,name:'Golett',slug:'golett',type:'ground',type2:'ghost',gen:5,tier:2},
  {id:623,name:'Golurk',slug:'golurk',type:'ground',type2:'ghost',gen:5,tier:3},
  {id:624,name:'Pawniard',slug:'pawniard',type:'dark',type2:'steel',gen:5,tier:2},
  {id:625,name:'Bisharp',slug:'bisharp',type:'dark',type2:'steel',gen:5,tier:3},
  {id:626,name:'Bouffalant',slug:'bouffalant',type:'normal',gen:5,tier:3},
  {id:627,name:'Rufflet',slug:'rufflet',type:'normal',type2:'flying',gen:5,tier:2},
  {id:628,name:'Braviary',slug:'braviary',type:'normal',type2:'flying',gen:5,tier:3},
  {id:629,name:'Vullaby',slug:'vullaby',type:'dark',type2:'flying',gen:5,tier:2},
  {id:630,name:'Mandibuzz',slug:'mandibuzz',type:'dark',type2:'flying',gen:5,tier:3},
  {id:631,name:'Heatmor',slug:'heatmor',type:'fire',gen:5,tier:2},
  {id:632,name:'Durant',slug:'durant',type:'bug',type2:'steel',gen:5,tier:3},
  {id:633,name:'Deino',slug:'deino',type:'dark',type2:'dragon',gen:5,tier:2},
  {id:634,name:'Zweilous',slug:'zweilous',type:'dark',type2:'dragon',gen:5,tier:3},
  {id:635,name:'Hydreigon',slug:'hydreigon',type:'dark',type2:'dragon',gen:5,tier:1},
  {id:636,name:'Larvesta',slug:'larvesta',type:'bug',type2:'fire',gen:5,tier:3},
  {id:637,name:'Volcarona',slug:'volcarona',type:'bug',type2:'fire',gen:5,tier:1},
  {id:638,name:'Cobalion',slug:'cobalion',type:'steel',type2:'fighting',gen:5,tier:4},
  {id:639,name:'Terrakion',slug:'terrakion',type:'rock',type2:'fighting',gen:5,tier:4},
  {id:640,name:'Virizion',slug:'virizion',type:'grass',type2:'fighting',gen:5,tier:4},
  {id:641,name:'Tornadus',slug:'tornadus',type:'flying',gen:5,tier:4},
  {id:642,name:'Thundurus',slug:'thundurus',type:'electric',type2:'flying',gen:5,tier:4},
  {id:643,name:'Reshiram',slug:'reshiram',type:'dragon',type2:'fire',gen:5,tier:4},
  {id:644,name:'Zekrom',slug:'zekrom',type:'dragon',type2:'electric',gen:5,tier:4},
  {id:645,name:'Landorus',slug:'landorus',type:'ground',type2:'flying',gen:5,tier:4},
  {id:646,name:'Kyurem',slug:'kyurem',type:'dragon',type2:'ice',gen:5,tier:4},
  {id:647,name:'Keldeo',slug:'keldeo',type:'water',type2:'fighting',gen:5,tier:1},
  {id:648,name:'Meloetta',slug:'meloetta',type:'normal',type2:'psychic',gen:5,tier:3},
  {id:649,name:'Genesect',slug:'genesect',type:'bug',type2:'steel',gen:5,tier:4},
  {id:650,name:'Chespin',slug:'chespin',type:'grass',gen:6,tier:1},
  {id:651,name:'Quilladin',slug:'quilladin',type:'grass',gen:6,tier:1},
  {id:652,name:'Chesnaught',slug:'chesnaught',type:'grass',type2:'fighting',gen:6,tier:1},
  {id:653,name:'Fennekin',slug:'fennekin',type:'fire',gen:6,tier:1},
  {id:654,name:'Braixen',slug:'braixen',type:'fire',gen:6,tier:2},
  {id:655,name:'Delphox',slug:'delphox',type:'fire',type2:'psychic',gen:6,tier:3},
  {id:656,name:'Froakie',slug:'froakie',type:'water',gen:6,tier:1},
  {id:657,name:'Frogadier',slug:'frogadier',type:'water',gen:6,tier:2},
  {id:658,name:'Greninja',slug:'greninja',type:'water',type2:'dark',gen:6,tier:3},
  {id:659,name:'Bunnelby',slug:'bunnelby',type:'normal',gen:6,tier:1},
  {id:660,name:'Diggersby',slug:'diggersby',type:'normal',type2:'ground',gen:6,tier:2},
  {id:661,name:'Fletchling',slug:'fletchling',type:'normal',type2:'flying',gen:6,tier:3},
  {id:662,name:'Fletchinder',slug:'fletchinder',type:'fire',type2:'flying',gen:6,tier:2},
  {id:663,name:'Talonflame',slug:'talonflame',type:'fire',type2:'flying',gen:6,tier:3},
  {id:664,name:'Scatterbug',slug:'scatterbug',type:'bug',gen:6,tier:1},
  {id:665,name:'Spewpa',slug:'spewpa',type:'bug',gen:6,tier:2},
  {id:666,name:'Vivillon',slug:'vivillon',type:'bug',type2:'flying',gen:6,tier:3},
  {id:667,name:'Litleo',slug:'litleo',type:'fire',type2:'normal',gen:6,tier:2},
  {id:668,name:'Pyroar',slug:'pyroar',type:'fire',type2:'normal',gen:6,tier:3},
  {id:669,name:'Flabebe',slug:'flabebe',type:'fairy',gen:6,tier:1},
  {id:670,name:'Floette',slug:'floette',type:'fairy',gen:6,tier:2},
  {id:671,name:'Florges',slug:'florges',type:'fairy',gen:6,tier:3},
  {id:672,name:'Skiddo',slug:'skiddo',type:'grass',gen:6,tier:2},
  {id:673,name:'Gogoat',slug:'gogoat',type:'grass',gen:6,tier:3},
  {id:674,name:'Pancham',slug:'pancham',type:'fighting',gen:6,tier:2},
  {id:675,name:'Pangoro',slug:'pangoro',type:'fighting',type2:'dark',gen:6,tier:3},
  {id:676,name:'Furfrou',slug:'furfrou',type:'normal',gen:6,tier:3},
  {id:677,name:'Espurr',slug:'espurr',type:'psychic',gen:6,tier:1},
  {id:678,name:'Meowstic',slug:'meowstic',type:'psychic',gen:6,tier:2},
  {id:679,name:'Honedge',slug:'honedge',type:'steel',type2:'ghost',gen:6,tier:1},
  {id:680,name:'Doublade',slug:'doublade',type:'steel',type2:'ghost',gen:6,tier:3},
  {id:681,name:'Aegislash',slug:'aegislash',type:'steel',type2:'ghost',gen:6,tier:3},
  {id:682,name:'Spritzee',slug:'spritzee',type:'fairy',gen:6,tier:2},
  {id:683,name:'Aromatisse',slug:'aromatisse',type:'fairy',gen:6,tier:3},
  {id:684,name:'Swirlix',slug:'swirlix',type:'fairy',gen:6,tier:2},
  {id:685,name:'Slurpuff',slug:'slurpuff',type:'fairy',gen:6,tier:3},
  {id:686,name:'Inkay',slug:'inkay',type:'dark',type2:'psychic',gen:6,tier:2},
  {id:687,name:'Malamar',slug:'malamar',type:'dark',type2:'psychic',gen:6,tier:3},
  {id:688,name:'Binacle',slug:'binacle',type:'rock',type2:'water',gen:6,tier:2},
  {id:689,name:'Barbaracle',slug:'barbaracle',type:'rock',type2:'water',gen:6,tier:3},
  {id:690,name:'Skrelp',slug:'skrelp',type:'poison',type2:'water',gen:6,tier:2},
  {id:691,name:'Dragalge',slug:'dragalge',type:'poison',type2:'dragon',gen:6,tier:3},
  {id:692,name:'Clauncher',slug:'clauncher',type:'water',gen:6,tier:2},
  {id:693,name:'Clawitzer',slug:'clawitzer',type:'water',gen:6,tier:3},
  {id:694,name:'Helioptile',slug:'helioptile',type:'electric',type2:'normal',gen:6,tier:2},
  {id:695,name:'Heliolisk',slug:'heliolisk',type:'electric',type2:'normal',gen:6,tier:3},
  {id:696,name:'Tyrunt',slug:'tyrunt',type:'rock',type2:'dragon',gen:6,tier:2},
  {id:697,name:'Tyrantrum',slug:'tyrantrum',type:'rock',type2:'dragon',gen:6,tier:3},
  {id:698,name:'Amaura',slug:'amaura',type:'rock',type2:'ice',gen:6,tier:2},
  {id:699,name:'Aurorus',slug:'aurorus',type:'rock',type2:'ice',gen:6,tier:3},
  {id:700,name:'Sylveon',slug:'sylveon',type:'fairy',gen:6,tier:3},
  {id:701,name:'Hawlucha',slug:'hawlucha',type:'fighting',type2:'flying',gen:6,tier:3},
  {id:702,name:'Dedenne',slug:'dedenne',type:'electric',type2:'fairy',gen:6,tier:3},
  {id:703,name:'Carbink',slug:'carbink',type:'rock',type2:'fairy',gen:6,tier:3},
  {id:704,name:'Goomy',slug:'goomy',type:'dragon',gen:6,tier:1},
  {id:705,name:'Sliggoo',slug:'sliggoo',type:'dragon',gen:6,tier:1},
  {id:706,name:'Goodra',slug:'goodra',type:'dragon',gen:6,tier:3},
  {id:707,name:'Klefki',slug:'klefki',type:'steel',type2:'fairy',gen:6,tier:2},
  {id:708,name:'Phantump',slug:'phantump',type:'ghost',type2:'grass',gen:6,tier:1},
  {id:709,name:'Trevenant',slug:'trevenant',type:'ghost',type2:'grass',gen:6,tier:3},
  {id:710,name:'Pumpkaboo',slug:'pumpkaboo',type:'ghost',type2:'grass',gen:6,tier:2},
  {id:711,name:'Gourgeist',slug:'gourgeist',type:'ghost',type2:'grass',gen:6,tier:3},
  {id:712,name:'Bergmite',slug:'bergmite',type:'ice',gen:6,tier:2},
  {id:713,name:'Avalugg',slug:'avalugg',type:'ice',gen:6,tier:3},
  {id:714,name:'Noibat',slug:'noibat',type:'flying',type2:'dragon',gen:6,tier:1},
  {id:715,name:'Noivern',slug:'noivern',type:'flying',type2:'dragon',gen:6,tier:3},
  {id:716,name:'Xerneas',slug:'xerneas',type:'fairy',gen:6,tier:4},
  {id:717,name:'Yveltal',slug:'yveltal',type:'dark',type2:'flying',gen:6,tier:4},
  {id:718,name:'Zygarde',slug:'zygarde',type:'dragon',type2:'ground',gen:6,tier:4},
  {id:719,name:'Diancie',slug:'diancie',type:'rock',type2:'fairy',gen:6,tier:4},
  {id:720,name:'Hoopa',slug:'hoopa',type:'psychic',type2:'ghost',gen:6,tier:4},
  {id:721,name:'Volcanion',slug:'volcanion',type:'fire',type2:'water',gen:6,tier:4},
  {id:722,name:'Rowlet',slug:'rowlet',type:'grass',type2:'flying',gen:7,tier:1},
  {id:723,name:'Dartrix',slug:'dartrix',type:'grass',type2:'flying',gen:7,tier:2},
  {id:724,name:'Decidueye',slug:'decidueye',type:'grass',type2:'ghost',gen:7,tier:3},
  {id:725,name:'Litten',slug:'litten',type:'fire',gen:7,tier:1},
  {id:726,name:'Torracat',slug:'torracat',type:'fire',gen:7,tier:2},
  {id:727,name:'Incineroar',slug:'incineroar',type:'fire',type2:'dark',gen:7,tier:3},
  {id:728,name:'Popplio',slug:'popplio',type:'water',gen:7,tier:1},
  {id:729,name:'Brionne',slug:'brionne',type:'water',gen:7,tier:2},
  {id:730,name:'Primarina',slug:'primarina',type:'water',type2:'fairy',gen:7,tier:3},
  {id:731,name:'Pikipek',slug:'pikipek',type:'normal',type2:'flying',gen:7,tier:1},
  {id:732,name:'Trumbeak',slug:'trumbeak',type:'normal',type2:'flying',gen:7,tier:2},
  {id:733,name:'Toucannon',slug:'toucannon',type:'normal',type2:'flying',gen:7,tier:3},
  {id:734,name:'Yungoos',slug:'yungoos',type:'normal',gen:7,tier:1},
  {id:735,name:'Gumshoos',slug:'gumshoos',type:'normal',gen:7,tier:2},
  {id:736,name:'Grubbin',slug:'grubbin',type:'bug',gen:7,tier:3},
  {id:737,name:'Charjabug',slug:'charjabug',type:'bug',type2:'electric',gen:7,tier:2},
  {id:738,name:'Vikavolt',slug:'vikavolt',type:'bug',type2:'electric',gen:7,tier:3},
  {id:739,name:'Crabrawler',slug:'crabrawler',type:'fighting',gen:7,tier:2},
  {id:740,name:'Crabominable',slug:'crabominable',type:'fighting',type2:'ice',gen:7,tier:3},
  {id:741,name:'Oricorio',slug:'oricorio',type:'fire',type2:'flying',gen:7,tier:3},
  {id:742,name:'Cutiefly',slug:'cutiefly',type:'bug',type2:'fairy',gen:7,tier:2},
  {id:743,name:'Ribombee',slug:'ribombee',type:'bug',type2:'fairy',gen:7,tier:3},
  {id:744,name:'Rockruff',slug:'rockruff',type:'rock',gen:7,tier:2},
  {id:745,name:'Lycanroc',slug:'lycanroc',type:'rock',gen:7,tier:3},
  {id:746,name:'Wishiwashi',slug:'wishiwashi',type:'water',gen:7,tier:3},
  {id:747,name:'Mareanie',slug:'mareanie',type:'poison',type2:'water',gen:7,tier:2},
  {id:748,name:'Toxapex',slug:'toxapex',type:'poison',type2:'water',gen:7,tier:3},
  {id:749,name:'Mudbray',slug:'mudbray',type:'ground',gen:7,tier:2},
  {id:750,name:'Mudsdale',slug:'mudsdale',type:'ground',gen:7,tier:3},
  {id:751,name:'Dewpider',slug:'dewpider',type:'water',type2:'bug',gen:7,tier:2},
  {id:752,name:'Araquanid',slug:'araquanid',type:'water',type2:'bug',gen:7,tier:3},
  {id:753,name:'Fomantis',slug:'fomantis',type:'grass',gen:7,tier:2},
  {id:754,name:'Lurantis',slug:'lurantis',type:'grass',gen:7,tier:3},
  {id:755,name:'Morelull',slug:'morelull',type:'grass',type2:'fairy',gen:7,tier:2},
  {id:756,name:'Shiinotic',slug:'shiinotic',type:'grass',type2:'fairy',gen:7,tier:3},
  {id:757,name:'Salandit',slug:'salandit',type:'poison',type2:'fire',gen:7,tier:2},
  {id:758,name:'Salazzle',slug:'salazzle',type:'poison',type2:'fire',gen:7,tier:3},
  {id:759,name:'Stufful',slug:'stufful',type:'normal',type2:'fighting',gen:7,tier:2},
  {id:760,name:'Bewear',slug:'bewear',type:'normal',type2:'fighting',gen:7,tier:3},
  {id:761,name:'Bounsweet',slug:'bounsweet',type:'grass',gen:7,tier:2},
  {id:762,name:'Steenee',slug:'steenee',type:'grass',gen:7,tier:3},
  {id:763,name:'Tsareena',slug:'tsareena',type:'grass',gen:7,tier:2},
  {id:764,name:'Comfey',slug:'comfey',type:'fairy',gen:7,tier:3},
  {id:765,name:'Oranguru',slug:'oranguru',type:'normal',type2:'psychic',gen:7,tier:2},
  {id:766,name:'Passimian',slug:'passimian',type:'fighting',gen:7,tier:3},
  {id:767,name:'Wimpod',slug:'wimpod',type:'bug',type2:'water',gen:7,tier:2},
  {id:768,name:'Golisopod',slug:'golisopod',type:'bug',type2:'water',gen:7,tier:3},
  {id:769,name:'Sandygast',slug:'sandygast',type:'ghost',type2:'ground',gen:7,tier:2},
  {id:770,name:'Palossand',slug:'palossand',type:'ghost',type2:'ground',gen:7,tier:3},
  {id:771,name:'Pyukumuku',slug:'pyukumuku',type:'water',gen:7,tier:3},
  {id:772,name:'Type: Null',slug:'type-null',type:'normal',gen:7,tier:1},
  {id:773,name:'Silvally',slug:'silvally',type:'normal',gen:7,tier:3},
  {id:774,name:'Minior',slug:'minior',type:'rock',type2:'flying',gen:7,tier:3},
  {id:775,name:'Komala',slug:'komala',type:'normal',gen:7,tier:3},
  {id:776,name:'Turtonator',slug:'turtonator',type:'fire',type2:'dragon',gen:7,tier:3},
  {id:777,name:'Togedemaru',slug:'togedemaru',type:'electric',type2:'steel',gen:7,tier:3},
  {id:778,name:'Mimikyu',slug:'mimikyu',type:'ghost',type2:'fairy',gen:7,tier:3},
  {id:779,name:'Bruxish',slug:'bruxish',type:'water',type2:'psychic',gen:7,tier:3},
  {id:780,name:'Drampa',slug:'drampa',type:'normal',type2:'dragon',gen:7,tier:3},
  {id:781,name:'Dhelmise',slug:'dhelmise',type:'ghost',type2:'grass',gen:7,tier:3},
  {id:782,name:'Jangmo-o',slug:'jangmo-o',type:'dragon',gen:7,tier:1},
  {id:783,name:'Hakamo-o',slug:'hakamo-o',type:'dragon',type2:'fighting',gen:7,tier:1},
  {id:784,name:'Kommo-o',slug:'kommo-o',type:'dragon',type2:'fighting',gen:7,tier:3},
  {id:785,name:'Tapu Koko',slug:'tapu-koko',type:'electric',type2:'fairy',gen:7,tier:4},
  {id:786,name:'Tapu Lele',slug:'tapu-lele',type:'psychic',type2:'fairy',gen:7,tier:4},
  {id:787,name:'Tapu Bulu',slug:'tapu-bulu',type:'grass',type2:'fairy',gen:7,tier:4},
  {id:788,name:'Tapu Fini',slug:'tapu-fini',type:'water',type2:'fairy',gen:7,tier:4},
  {id:789,name:'Cosmog',slug:'cosmog',type:'psychic',gen:7,tier:4},
  {id:790,name:'Cosmoem',slug:'cosmoem',type:'psychic',gen:7,tier:4},
  {id:791,name:'Solgaleo',slug:'solgaleo',type:'psychic',type2:'steel',gen:7,tier:4},
  {id:792,name:'Lunala',slug:'lunala',type:'psychic',type2:'ghost',gen:7,tier:4},
  {id:793,name:'Nihilego',slug:'nihilego',type:'rock',type2:'poison',gen:7,tier:1},
  {id:794,name:'Buzzwole',slug:'buzzwole',type:'bug',type2:'fighting',gen:7,tier:1},
  {id:795,name:'Pheromosa',slug:'pheromosa',type:'bug',type2:'fighting',gen:7,tier:1},
  {id:796,name:'Xurkitree',slug:'xurkitree',type:'electric',gen:7,tier:1},
  {id:797,name:'Celesteela',slug:'celesteela',type:'steel',type2:'flying',gen:7,tier:1},
  {id:798,name:'Kartana',slug:'kartana',type:'grass',type2:'steel',gen:7,tier:1},
  {id:799,name:'Guzzlord',slug:'guzzlord',type:'dark',type2:'dragon',gen:7,tier:1},
  {id:800,name:'Necrozma',slug:'necrozma',type:'psychic',gen:7,tier:4},
  {id:801,name:'Magearna',slug:'magearna',type:'steel',type2:'fairy',gen:7,tier:4},
  {id:802,name:'Marshadow',slug:'marshadow',type:'fighting',type2:'ghost',gen:7,tier:4},
  {id:803,name:'Poipole',slug:'poipole',type:'poison',gen:7,tier:1},
  {id:804,name:'Naganadel',slug:'naganadel',type:'poison',type2:'dragon',gen:7,tier:1},
  {id:805,name:'Stakataka',slug:'stakataka',type:'rock',type2:'steel',gen:7,tier:1},
  {id:806,name:'Blacephalon',slug:'blacephalon',type:'fire',type2:'ghost',gen:7,tier:1},
  {id:807,name:'Zeraora',slug:'zeraora',type:'electric',gen:7,tier:4},
  {id:808,name:'Meltan',slug:'meltan',type:'steel',gen:7,tier:1},
  {id:809,name:'Melmetal',slug:'melmetal',type:'steel',gen:7,tier:1},
  {id:810,name:'Grookey',slug:'grookey',type:'grass',gen:8,tier:1},
  {id:811,name:'Thwackey',slug:'thwackey',type:'grass',gen:8,tier:2},
  {id:812,name:'Rillaboom',slug:'rillaboom',type:'grass',gen:8,tier:3},
  {id:813,name:'Scorbunny',slug:'scorbunny',type:'fire',gen:8,tier:1},
  {id:814,name:'Raboot',slug:'raboot',type:'fire',gen:8,tier:2},
  {id:815,name:'Cinderace',slug:'cinderace',type:'fire',gen:8,tier:3},
  {id:816,name:'Sobble',slug:'sobble',type:'water',gen:8,tier:1},
  {id:817,name:'Drizzile',slug:'drizzile',type:'water',gen:8,tier:2},
  {id:818,name:'Inteleon',slug:'inteleon',type:'water',gen:8,tier:3},
  {id:819,name:'Skwovet',slug:'skwovet',type:'normal',gen:8,tier:2},
  {id:820,name:'Greedent',slug:'greedent',type:'normal',gen:8,tier:3},
  {id:821,name:'Rookidee',slug:'rookidee',type:'flying',gen:8,tier:2},
  {id:822,name:'Corvisquire',slug:'corvisquire',type:'flying',gen:8,tier:3},
  {id:823,name:'Corviknight',slug:'corviknight',type:'flying',type2:'steel',gen:8,tier:2},
  {id:824,name:'Blipbug',slug:'blipbug',type:'bug',gen:8,tier:3},
  {id:825,name:'Dottler',slug:'dottler',type:'bug',type2:'psychic',gen:8,tier:2},
  {id:826,name:'Orbeetle',slug:'orbeetle',type:'bug',type2:'psychic',gen:8,tier:3},
  {id:827,name:'Nickit',slug:'nickit',type:'dark',gen:8,tier:2},
  {id:828,name:'Thievul',slug:'thievul',type:'dark',gen:8,tier:3},
  {id:829,name:'Gossifleur',slug:'gossifleur',type:'grass',gen:8,tier:2},
  {id:830,name:'Eldegoss',slug:'eldegoss',type:'grass',gen:8,tier:3},
  {id:831,name:'Wooloo',slug:'wooloo',type:'normal',gen:8,tier:2},
  {id:832,name:'Dubwool',slug:'dubwool',type:'normal',gen:8,tier:3},
  {id:833,name:'Chewtle',slug:'chewtle',type:'water',gen:8,tier:2},
  {id:834,name:'Drednaw',slug:'drednaw',type:'water',type2:'rock',gen:8,tier:3},
  {id:835,name:'Yamper',slug:'yamper',type:'electric',gen:8,tier:2},
  {id:836,name:'Boltund',slug:'boltund',type:'electric',gen:8,tier:3},
  {id:837,name:'Rolycoly',slug:'rolycoly',type:'rock',gen:8,tier:2},
  {id:838,name:'Carkol',slug:'carkol',type:'rock',type2:'fire',gen:8,tier:3},
  {id:839,name:'Coalossal',slug:'coalossal',type:'rock',type2:'fire',gen:8,tier:2},
  {id:840,name:'Applin',slug:'applin',type:'grass',type2:'dragon',gen:8,tier:3},
  {id:841,name:'Flapple',slug:'flapple',type:'grass',type2:'dragon',gen:8,tier:2},
  {id:842,name:'Appletun',slug:'appletun',type:'grass',type2:'dragon',gen:8,tier:3},
  {id:843,name:'Silicobra',slug:'silicobra',type:'ground',gen:8,tier:2},
  {id:844,name:'Sandaconda',slug:'sandaconda',type:'ground',gen:8,tier:3},
  {id:845,name:'Cramorant',slug:'cramorant',type:'flying',type2:'water',gen:8,tier:2},
  {id:846,name:'Arrokuda',slug:'arrokuda',type:'water',gen:8,tier:3},
  {id:847,name:'Barraskewda',slug:'barraskewda',type:'water',gen:8,tier:3},
  {id:848,name:'Toxel',slug:'toxel',type:'electric',type2:'poison',gen:8,tier:2},
  {id:849,name:'Toxtricity',slug:'toxtricity',type:'electric',type2:'poison',gen:8,tier:3},
  {id:850,name:'Sizzlipede',slug:'sizzlipede',type:'fire',type2:'bug',gen:8,tier:2},
  {id:851,name:'Centiskorch',slug:'centiskorch',type:'fire',type2:'bug',gen:8,tier:3},
  {id:852,name:'Clobbopus',slug:'clobbopus',type:'fighting',gen:8,tier:2},
  {id:853,name:'Grapploct',slug:'grapploct',type:'fighting',gen:8,tier:3},
  {id:854,name:'Sinistea',slug:'sinistea',type:'ghost',gen:8,tier:2},
  {id:855,name:'Polteageist',slug:'polteageist',type:'ghost',gen:8,tier:3},
  {id:856,name:'Hatenna',slug:'hatenna',type:'psychic',gen:8,tier:2},
  {id:857,name:'Hattrem',slug:'hattrem',type:'psychic',gen:8,tier:3},
  {id:858,name:'Hatterene',slug:'hatterene',type:'psychic',type2:'fairy',gen:8,tier:2},
  {id:859,name:'Impidimp',slug:'impidimp',type:'dark',type2:'fairy',gen:8,tier:3},
  {id:860,name:'Morgrem',slug:'morgrem',type:'dark',type2:'fairy',gen:8,tier:2},
  {id:861,name:'Grimmsnarl',slug:'grimmsnarl',type:'dark',type2:'fairy',gen:8,tier:3},
  {id:862,name:'Obstagoon',slug:'obstagoon',type:'dark',type2:'normal',gen:8,tier:3},
  {id:863,name:'Perrserker',slug:'perrserker',type:'steel',gen:8,tier:3},
  {id:864,name:'Cursola',slug:'cursola',type:'ghost',gen:8,tier:3},
  {id:865,name:'Sirfetch&#39;d',slug:'sirfetchd',type:'fighting',gen:8,tier:3},
  {id:866,name:'Mr. Rime',slug:'mr-rime',type:'ice',type2:'psychic',gen:8,tier:3},
  {id:867,name:'Runerigus',slug:'runerigus',type:'ground',type2:'ghost',gen:8,tier:3},
  {id:868,name:'Milcery',slug:'milcery',type:'fairy',gen:8,tier:2},
  {id:869,name:'Alcremie',slug:'alcremie',type:'fairy',gen:8,tier:3},
  {id:870,name:'Falinks',slug:'falinks',type:'fighting',gen:8,tier:2},
  {id:871,name:'Pincurchin',slug:'pincurchin',type:'electric',gen:8,tier:3},
  {id:872,name:'Snom',slug:'snom',type:'ice',type2:'bug',gen:8,tier:2},
  {id:873,name:'Frosmoth',slug:'frosmoth',type:'ice',type2:'bug',gen:8,tier:3},
  {id:874,name:'Stonjourner',slug:'stonjourner',type:'rock',gen:8,tier:2},
  {id:875,name:'Eiscue',slug:'eiscue',type:'ice',gen:8,tier:3},
  {id:876,name:'Indeedee',slug:'indeedee',type:'psychic',type2:'normal',gen:8,tier:2},
  {id:877,name:'Morpeko',slug:'morpeko',type:'electric',type2:'dark',gen:8,tier:3},
  {id:878,name:'Cufant',slug:'cufant',type:'steel',gen:8,tier:2},
  {id:879,name:'Copperajah',slug:'copperajah',type:'steel',gen:8,tier:3},
  {id:880,name:'Dracozolt',slug:'dracozolt',type:'electric',type2:'dragon',gen:8,tier:3},
  {id:881,name:'Arctozolt',slug:'arctozolt',type:'electric',type2:'ice',gen:8,tier:3},
  {id:882,name:'Dracovish',slug:'dracovish',type:'water',type2:'dragon',gen:8,tier:3},
  {id:883,name:'Arctovish',slug:'arctovish',type:'water',type2:'ice',gen:8,tier:3},
  {id:884,name:'Duraludon',slug:'duraludon',type:'steel',type2:'dragon',gen:8,tier:3},
  {id:885,name:'Dreepy',slug:'dreepy',type:'dragon',type2:'ghost',gen:8,tier:1},
  {id:886,name:'Drakloak',slug:'drakloak',type:'dragon',type2:'ghost',gen:8,tier:2},
  {id:887,name:'Dragapult',slug:'dragapult',type:'dragon',type2:'ghost',gen:8,tier:3},
  {id:888,name:'Zacian',slug:'zacian',type:'fairy',gen:8,tier:4},
  {id:889,name:'Zamazenta',slug:'zamazenta',type:'fighting',gen:8,tier:4},
  {id:890,name:'Eternatus',slug:'eternatus',type:'poison',type2:'dragon',gen:8,tier:4},
  {id:891,name:'Kubfu',slug:'kubfu',type:'fighting',gen:8,tier:4},
  {id:892,name:'Urshifu',slug:'urshifu',type:'fighting',type2:'dark',gen:8,tier:4},
  {id:893,name:'Zarude',slug:'zarude',type:'dark',type2:'grass',gen:8,tier:4},
  {id:894,name:'Regieleki',slug:'regieleki',type:'electric',gen:8,tier:4},
  {id:895,name:'Regidrago',slug:'regidrago',type:'dragon',gen:8,tier:4},
  {id:896,name:'Glastrier',slug:'glastrier',type:'ice',gen:8,tier:4},
  {id:897,name:'Spectrier',slug:'spectrier',type:'ghost',gen:8,tier:4},
  {id:898,name:'Calyrex',slug:'calyrex',type:'psychic',type2:'grass',gen:8,tier:4},
  {id:899,name:'Wyrdeer',slug:'wyrdeer',type:'normal',type2:'psychic',gen:8,tier:1},
  {id:900,name:'Kleavor',slug:'kleavor',type:'bug',type2:'rock',gen:8,tier:1},
  {id:901,name:'Ursaluna',slug:'ursaluna',type:'ground',type2:'normal',gen:8,tier:1},
  {id:902,name:'Basculegion',slug:'basculegion',type:'water',type2:'ghost',gen:8,tier:1},
  {id:903,name:'Sneasler',slug:'sneasler',type:'poison',type2:'fighting',gen:8,tier:1},
  {id:904,name:'Overqwil',slug:'overqwil',type:'poison',type2:'dark',gen:8,tier:1},
  {id:905,name:'Enamorus',slug:'enamorus',type:'fairy',type2:'flying',gen:8,tier:4},
  {id:906,name:'Sprigatito',slug:'sprigatito',type:'grass',gen:9,tier:1},
  {id:907,name:'Floragato',slug:'floragato',type:'grass',gen:9,tier:2},
  {id:908,name:'Meowscarada',slug:'meowscarada',type:'grass',type2:'dark',gen:9,tier:3},
  {id:909,name:'Fuecoco',slug:'fuecoco',type:'fire',gen:9,tier:1},
  {id:910,name:'Crocalor',slug:'crocalor',type:'fire',gen:9,tier:2},
  {id:911,name:'Skeledirge',slug:'skeledirge',type:'fire',type2:'ghost',gen:9,tier:3},
  {id:912,name:'Quaxly',slug:'quaxly',type:'water',gen:9,tier:1},
  {id:913,name:'Quaxwell',slug:'quaxwell',type:'water',gen:9,tier:2},
  {id:914,name:'Quaquaval',slug:'quaquaval',type:'water',type2:'fighting',gen:9,tier:3},
  {id:915,name:'Lechonk',slug:'lechonk',type:'normal',gen:9,tier:2},
  {id:916,name:'Oinkologne',slug:'oinkologne',type:'normal',gen:9,tier:3},
  {id:917,name:'Tarountula',slug:'tarountula',type:'bug',gen:9,tier:1},
  {id:918,name:'Spidops',slug:'spidops',type:'bug',gen:9,tier:2},
  {id:919,name:'Nymble',slug:'nymble',type:'bug',gen:9,tier:3},
  {id:920,name:'Lokix',slug:'lokix',type:'bug',type2:'dark',gen:9,tier:2},
  {id:921,name:'Pawmi',slug:'pawmi',type:'electric',gen:9,tier:3},
  {id:922,name:'Pawmo',slug:'pawmo',type:'electric',type2:'fighting',gen:9,tier:2},
  {id:923,name:'Pawmot',slug:'pawmot',type:'electric',type2:'fighting',gen:9,tier:3},
  {id:924,name:'Fidough',slug:'fidough',type:'fairy',gen:9,tier:2},
  {id:925,name:'Dachsbun',slug:'dachsbun',type:'fairy',gen:9,tier:3},
  {id:926,name:'Smoliv',slug:'smoliv',type:'grass',type2:'normal',gen:9,tier:2},
  {id:927,name:'Dolliv',slug:'dolliv',type:'grass',type2:'normal',gen:9,tier:3},
  {id:928,name:'Arboliva',slug:'arboliva',type:'grass',type2:'normal',gen:9,tier:2},
  {id:929,name:'Squawkabilly',slug:'squawkabilly',type:'normal',type2:'flying',gen:9,tier:3},
  {id:930,name:'Nacli',slug:'nacli',type:'rock',gen:9,tier:2},
  {id:931,name:'Naclstack',slug:'naclstack',type:'rock',gen:9,tier:3},
  {id:932,name:'Garganacl',slug:'garganacl',type:'rock',gen:9,tier:2},
  {id:933,name:'Charcadet',slug:'charcadet',type:'fire',gen:9,tier:3},
  {id:934,name:'Armarouge',slug:'armarouge',type:'fire',type2:'psychic',gen:9,tier:3},
  {id:935,name:'Ceruledge',slug:'ceruledge',type:'fire',type2:'ghost',gen:9,tier:3},
  {id:936,name:'Tadbulb',slug:'tadbulb',type:'electric',gen:9,tier:2},
  {id:937,name:'Bellibolt',slug:'bellibolt',type:'electric',gen:9,tier:3},
  {id:938,name:'Wattrel',slug:'wattrel',type:'electric',type2:'flying',gen:9,tier:2},
  {id:939,name:'Kilowattrel',slug:'kilowattrel',type:'electric',type2:'flying',gen:9,tier:3},
  {id:940,name:'Maschiff',slug:'maschiff',type:'dark',gen:9,tier:2},
  {id:941,name:'Mabosstiff',slug:'mabosstiff',type:'dark',gen:9,tier:3},
  {id:942,name:'Shroodle',slug:'shroodle',type:'poison',type2:'normal',gen:9,tier:2},
  {id:943,name:'Grafaiai',slug:'grafaiai',type:'poison',type2:'normal',gen:9,tier:3},
  {id:944,name:'Bramblin',slug:'bramblin',type:'grass',type2:'ghost',gen:9,tier:3},
  {id:945,name:'Brambleghast',slug:'brambleghast',type:'grass',type2:'ghost',gen:9,tier:2},
  {id:946,name:'Toedscool',slug:'toedscool',type:'ground',type2:'grass',gen:9,tier:3},
  {id:947,name:'Toedscruel',slug:'toedscruel',type:'ground',type2:'grass',gen:9,tier:2},
  {id:948,name:'Klawf',slug:'klawf',type:'rock',gen:9,tier:3},
  {id:949,name:'Capsakid',slug:'capsakid',type:'grass',gen:9,tier:2},
  {id:950,name:'Scovillain',slug:'scovillain',type:'grass',type2:'fire',gen:9,tier:3},
  {id:951,name:'Rellor',slug:'rellor',type:'bug',gen:9,tier:2},
  {id:952,name:'Rabsca',slug:'rabsca',type:'bug',type2:'psychic',gen:9,tier:3},
  {id:953,name:'Flittle',slug:'flittle',type:'psychic',gen:9,tier:2},
  {id:954,name:'Espathra',slug:'espathra',type:'psychic',gen:9,tier:3},
  {id:955,name:'Tinkatink',slug:'tinkatink',type:'fairy',type2:'steel',gen:9,tier:2},
  {id:956,name:'Tinkatuff',slug:'tinkatuff',type:'fairy',type2:'steel',gen:9,tier:3},
  {id:957,name:'Tinkaton',slug:'tinkaton',type:'fairy',type2:'steel',gen:9,tier:2},
  {id:958,name:'Wiglett',slug:'wiglett',type:'water',gen:9,tier:3},
  {id:959,name:'Wugtrio',slug:'wugtrio',type:'water',gen:9,tier:2},
  {id:960,name:'Bombirdier',slug:'bombirdier',type:'flying',type2:'dark',gen:9,tier:3},
  {id:961,name:'Finizen',slug:'finizen',type:'water',gen:9,tier:2},
  {id:962,name:'Palafin',slug:'palafin',type:'water',gen:9,tier:3},
  {id:963,name:'Varoom',slug:'varoom',type:'steel',type2:'poison',gen:9,tier:2},
  {id:964,name:'Revavroom',slug:'revavroom',type:'steel',type2:'poison',gen:9,tier:3},
  {id:965,name:'Cyclizar',slug:'cyclizar',type:'dragon',type2:'normal',gen:9,tier:2},
  {id:966,name:'Orthworm',slug:'orthworm',type:'steel',gen:9,tier:3},
  {id:967,name:'Glimmet',slug:'glimmet',type:'rock',type2:'poison',gen:9,tier:3},
  {id:968,name:'Glimmora',slug:'glimmora',type:'rock',type2:'poison',gen:9,tier:1},
  {id:969,name:'Greavard',slug:'greavard',type:'ghost',gen:9,tier:3},
  {id:970,name:'Houndstone',slug:'houndstone',type:'ghost',gen:9,tier:3},
  {id:971,name:'Flamigo',slug:'flamigo',type:'flying',type2:'fighting',gen:9,tier:2},
  {id:972,name:'Cetoddle',slug:'cetoddle',type:'ice',gen:9,tier:3},
  {id:973,name:'Cetitan',slug:'cetitan',type:'ice',gen:9,tier:3},
  {id:974,name:'Veluza',slug:'veluza',type:'water',type2:'psychic',gen:9,tier:3},
  {id:975,name:'Dondozo',slug:'dondozo',type:'water',gen:9,tier:2},
  {id:976,name:'Tatsugiri',slug:'tatsugiri',type:'dragon',type2:'water',gen:9,tier:3},
  {id:977,name:'Annihilape',slug:'annihilape',type:'fighting',type2:'ghost',gen:9,tier:2},
  {id:978,name:'Clodsire',slug:'clodsire',type:'poison',type2:'ground',gen:9,tier:3},
  {id:979,name:'Farigiraf',slug:'farigiraf',type:'normal',type2:'psychic',gen:9,tier:2},
  {id:980,name:'Dudunsparce',slug:'dudunsparce',type:'normal',gen:9,tier:3},
  {id:981,name:'Kingambit',slug:'kingambit',type:'dark',type2:'steel',gen:9,tier:1},
  {id:982,name:'Great Tusk',slug:'great-tusk',type:'fighting',type2:'ground',gen:9,tier:2},
  {id:983,name:'Scream Tail',slug:'scream-tail',type:'fairy',type2:'psychic',gen:9,tier:3},
  {id:984,name:'Brute Bonnet',slug:'brute-bonnet',type:'grass',type2:'dark',gen:9,tier:2},
  {id:985,name:'Flutter Mane',slug:'flutter-mane',type:'ghost',type2:'fairy',gen:9,tier:3},
  {id:986,name:'Slither Wing',slug:'slither-wing',type:'bug',type2:'fighting',gen:9,tier:1},
  {id:987,name:'Sandy Shocks',slug:'sandy-shocks',type:'electric',type2:'ground',gen:9,tier:4},
  {id:988,name:'Iron Treads',slug:'iron-treads',type:'ground',type2:'steel',gen:9,tier:1},
  {id:989,name:'Iron Bundle',slug:'iron-bundle',type:'ice',type2:'water',gen:9,tier:1},
  {id:990,name:'Iron Hands',slug:'iron-hands',type:'fighting',type2:'electric',gen:9,tier:1},
  {id:991,name:'Iron Jugulis',slug:'iron-jugulis',type:'dark',type2:'flying',gen:9,tier:1},
  {id:992,name:'Iron Moth',slug:'iron-moth',type:'fire',type2:'poison',gen:9,tier:1},
  {id:993,name:'Iron Thorns',slug:'iron-thorns',type:'rock',type2:'electric',gen:9,tier:1},
  {id:994,name:'Frigibax',slug:'frigibax',type:'dragon',type2:'ice',gen:9,tier:1},
  {id:995,name:'Arctibax',slug:'arctibax',type:'dragon',type2:'ice',gen:9,tier:1},
  {id:996,name:'Baxcalibur',slug:'baxcalibur',type:'dragon',type2:'ice',gen:9,tier:1},
  {id:997,name:'Gimmighoul',slug:'gimmighoul',type:'ghost',gen:9,tier:1},
  {id:998,name:'Gholdengo',slug:'gholdengo',type:'steel',type2:'ghost',gen:9,tier:1},
  {id:999,name:'Wo-Chien',slug:'wo-chien',type:'dark',type2:'grass',gen:9,tier:1},
  {id:1000,name:'Chien-Pao',slug:'chien-pao',type:'dark',type2:'ice',gen:9,tier:2},
  {id:1001,name:'Ting-Lu',slug:'ting-lu',type:'dark',type2:'ground',gen:9,tier:4},
  {id:1002,name:'Chi-Yu',slug:'chi-yu',type:'dark',type2:'fire',gen:9,tier:2},
  {id:1003,name:'Roaring Moon',slug:'roaring-moon',type:'dragon',type2:'dark',gen:9,tier:3},
  {id:1004,name:'Iron Valiant',slug:'iron-valiant',type:'fairy',type2:'fighting',gen:9,tier:4},
  {id:1005,name:'Koraidon',slug:'koraidon',type:'fighting',type2:'dragon',gen:9,tier:2},
  {id:1006,name:'Miraidon',slug:'miraidon',type:'electric',type2:'dragon',gen:9,tier:3},
  {id:1007,name:'Walking Wake',slug:'walking-wake',type:'water',type2:'dragon',gen:9,tier:4},
  {id:1008,name:'Iron Leaves',slug:'iron-leaves',type:'grass',type2:'psychic',gen:9,tier:4},
  {id:1009,name:'Dipplin',slug:'dipplin',type:'grass',type2:'dragon',gen:9,tier:3},
  {id:1010,name:'Poltchageist',slug:'poltchageist',type:'grass',type2:'ghost',gen:9,tier:3},
  {id:1011,name:'Sinistcha',slug:'sinistcha',type:'grass',type2:'ghost',gen:9,tier:3},
  {id:1012,name:'Okidogi',slug:'okidogi',type:'poison',type2:'fighting',gen:9,tier:3},
  {id:1013,name:'Munkidori',slug:'munkidori',type:'poison',type2:'psychic',gen:9,tier:2},
  {id:1014,name:'Fezandipiti',slug:'fezandipiti',type:'poison',type2:'fairy',gen:9,tier:4},
  {id:1015,name:'Ogerpon',slug:'ogerpon',type:'grass',gen:9,tier:4},
  {id:1016,name:'Gouging Fire',slug:'gouging-fire',type:'fire',type2:'dragon',gen:9,tier:4},
  {id:1017,name:'Raging Bolt',slug:'raging-bolt',type:'electric',type2:'dragon',gen:9,tier:4},
  {id:1018,name:'Iron Boulder',slug:'iron-boulder',type:'rock',type2:'psychic',gen:9,tier:4},
  {id:1019,name:'Iron Crown',slug:'iron-crown',type:'steel',type2:'psychic',gen:9,tier:4},
  {id:1020,name:'Terapagos',slug:'terapagos',type:'normal',gen:9,tier:4},
  {id:1021,name:'Pecharunt',slug:'pecharunt',type:'poison',type2:'ghost',gen:9,tier:3},
  {id:1022,name:'Ursaluna (Bloodmoon)',slug:'ursaluna-bloodmoon',type:'ground',type2:'normal',gen:9,tier:3},
  {id:1023,name:'Bloodmoon Ursaluna',slug:'bloodmoon-ursaluna',type:'ground',type2:'normal',gen:9,tier:3},
  {id:1024,name:'Archaludon',slug:'archaludon',type:'steel',type2:'dragon',gen:9,tier:3},
  {id:1025,name:'Hydrapple',slug:'hydrapple',type:'grass',type2:'dragon',gen:9,tier:3}
]

const TYPE_COLORS={fire:'#FF6B35',water:'#4FC3F7',electric:'#FFCB05',grass:'#4CAF50',normal:'#A8A878',psychic:'#F95587',rock:'#B8A038',ice:'#98D8D8',dragon:'#7038F8',ghost:'#705898',flying:'#A890F0',fighting:'#C03028',poison:'#A040A0',ground:'#E0C068',bug:'#A8B820',steel:'#B8B8D0',dark:'#705848',fairy:'#EE99AC'}
const TYPE_EMOJI={fire:'🔥',water:'💧',electric:'⚡',grass:'🍃',normal:'💢',psychic:'🔮',rock:'🪨',ice:'❄️',dragon:'🐉',ghost:'👻',flying:'🌪️',fighting:'👊',poison:'☠️',ground:'💥',bug:'🐛',steel:'⚔️',dark:'🌑',fairy:'✨'}
const TYPE_TEXTCOLOR={electric:'#1a1a1a',ice:'#1a1a1a',normal:'white',rock:'white'}

// Global slug→id lookup built from POKEMON_DB
const POKE_IDS = Object.fromEntries(POKEMON_DB.map(p=>[p.slug,p.id]))
// Global slug→tier lookup (1=basic, 2=1st evo, 3=2nd evo, 4=legendary)
const POKE_TIERS = Object.fromEntries(POKEMON_DB.map(p=>[p.slug,p.tier]))
// Tier-based size scaling for sprite consistency across games
// basic 1.0×, 1st evo 1.2×, 2nd evo / legendary 1.3×
function pokeTierScale(slug){
  const t = POKE_TIERS[slug] || 1
  return ({1:1.0, 2:1.2, 3:1.3, 4:1.3})[t] || 1.0
}

// ─── Pokemon facing + visual-size mapping (data-driven) ─────────────────────
// Sparse maps for per-Pokemon overrides. Grow over time as user flags offenders.
// Default: sprite naturally faces viewer's right ('R'), visual scale 1.0×.
// Natural facing of source sprite. DEFAULT 'L' — Pokemondb HOME 3D renders face viewer with slight LEFT bias.
// Add 'R' override here for Pokemon whose natural HD art faces RIGHT.
// Natural facing of HOME CDN sprites (pokemondb.net/sprites/home/normal).
// DEFAULT is 'R' — empirically most sprites face viewer's right (body angled rightward).
// Override with 'L' here for species whose natural HD art faces viewer-left (user-reported).
const POKE_FACING = {
  // Add species here if their enemy rendering looks wrong:
  // fidough: 'L',
}
function pokeFacing(slug){ return POKE_FACING[slug] || 'R' }
// role: 'player' → bottom-left, faces right toward enemy; 'enemy' → top-right, faces left toward player.
// Always returns an explicit scaleX — never empty — so CSS base transforms can't leak in.
function pokeFlipForRole(slug, role){
  const natural = pokeFacing(slug)
  const want = role === 'enemy' ? 'L' : 'R'
  return natural !== want ? 'scaleX(-1)' : 'scaleX(1)'
}
// Apply facing to an element by setting BOTH the --flip custom property (read by
// CSS @keyframes for atk/hit/defeat/swap) and the inline transform (used when no
// animation is running). Single source of truth for G10/G13/G13b/G13c sprite facing.
function applyPokeFlip(el, slug, role){
  if(!el) return
  const natural = pokeFacing(slug)
  const want = role === 'enemy' ? 'L' : 'R'
  const sign = natural !== want ? -1 : 1
  el.style.setProperty('--flip', sign)
  el.style.transform = 'scaleX(' + sign + ')'
}
// Visual canvas-fill override — compensate for sprites that fill much more
// or less of their 475×475 home PNG than the roster average. Default = 1.0.
const POKE_VISUAL = {
  // 2026-04-21 user-reported
  meowth: 0.85,
  oddish: 0.80,
}
function pokeVisualScale(slug){ return POKE_VISUAL[slug] || 1.0 }
// Combined render scale = tier × visual. Replaces bare pokeTierScale in battle scenes.
function pokeFinalScale(slug){ return pokeTierScale(slug) * pokeVisualScale(slug) }

// Expose to window.BSE for external games (g13c-pixi.html uses this bridge).
// See games/battle-sprite-engine.js for the standalone variant used when game.js is not loaded.
if (typeof window !== 'undefined') {
  window.BSE = window.BSE || {
    init: (_t)=>{}, facing: pokeFacing, flipForRole: pokeFlipForRole,
    visualScale: pokeVisualScale, tierScale: pokeTierScale, finalScale: pokeFinalScale,
    POKE_FACING, POKE_VISUAL,
  }
}

// Canonical type-color palette for auras / projectiles / UI accents.
// Lowercase keys; pokeTypeColor() handles capitalized input via toLowerCase().
const POKE_TYPE_COLORS = {
  fire:'#f97316',water:'#38bdf8',grass:'#4ade80',electric:'#facc15',
  psychic:'#e879f9',ice:'#67e8f9',dragon:'#818cf8',dark:'#6b7280',
  fighting:'#f87171',ghost:'#c084fc',steel:'#94a3b8',fairy:'#f9a8d4',
  rock:'#a8a29e',ground:'#d97706',flying:'#7dd3fc',bug:'#a3e635',
  poison:'#a855f7',normal:'#d1d5db'
}
function pokeTypeColor(type){
  return POKE_TYPE_COLORS[(type || '').toLowerCase()] || '#a78bfa'
}

// Hotfix #104 (2026-04-28) — port G13C type-themed hit particles to G10.
// User: "G10 effect2 pada pokemon yg terkena serangan juga gak ada. Kan
// simple samakan aja dg g13c". Self-contained: keyframes injected once.
const G10_TYPE_HIT_FX = {
  fire:    {emojis:['🔥','✨'],anim:'g10fxRise',  color:'#FF6B35',count:7},
  water:   {emojis:['💧','🌊'],anim:'g10fxRain',  color:'#4FC3F7',count:6},
  electric:{emojis:['⚡','✨'],anim:'g10fxZap',   color:'#FFCB05',count:9},
  grass:   {emojis:['🍃','🌿'],anim:'g10fxSwirl', color:'#4CAF50',count:7},
  dark:    {emojis:['🌑','💢'],anim:'g10fxShadow',color:'#3a0a5a',count:5},
  psychic: {emojis:['🔮','💫'],anim:'g10fxSpiral',color:'#F95587',count:7},
  ice:     {emojis:['❄️','💎'],anim:'g10fxSnow',  color:'#98D8D8',count:7},
  ghost:   {emojis:['👻','💜'],anim:'g10fxFloat', color:'#705898',count:5},
  flying:  {emojis:['🌪️','💨'],anim:'g10fxWind',  color:'#A890F0',count:6},
  dragon:  {emojis:['💫','🐉'],anim:'g10fxSpin',  color:'#7038F8',count:6},
  fighting:{emojis:['💥','👊'],anim:'g10fxBurst', color:'#C03028',count:7},
  rock:    {emojis:['🪨','💥'],anim:'g10fxDrop',  color:'#B8A038',count:5},
  poison:  {emojis:['☠️','💜'],anim:'g10fxFloat', color:'#A040A0',count:5},
  ground:  {emojis:['💥','🌍'],anim:'g10fxBurst', color:'#E0C068',count:6},
  bug:     {emojis:['✨','🌿'],anim:'g10fxSwirl', color:'#A8B820',count:6},
  steel:   {emojis:['⚔️','✨'],anim:'g10fxSpark', color:'#B8B8D0',count:5},
  normal:  {emojis:['💢','✨'],anim:'g10fxBurst', color:'#A8A878',count:5},
  fairy:   {emojis:['✨','💖'],anim:'g10fxSwirl', color:'#EE99AC',count:7},
}
let _g10HitFXStyleInjected = false
function g10EnsureHitFXStyles() {
  if (_g10HitFXStyleInjected) return
  _g10HitFXStyleInjected = true
  const css = `
@keyframes g10fxRise{0%{transform:scale(0) translateY(0);opacity:0.9}50%{transform:scale(1.3) translateY(-45px);opacity:0.8}100%{transform:scale(0.4) translateY(-90px);opacity:0}}
@keyframes g10fxRain{0%{transform:scale(1.2) translateY(-15px);opacity:0.9}100%{transform:scale(0.7) translateY(70px);opacity:0}}
@keyframes g10fxZap{0%{transform:scale(0) rotate(0deg);opacity:1}30%{transform:scale(1.6) rotate(45deg);opacity:1}100%{transform:scale(0.1) rotate(200deg) translateX(70px);opacity:0}}
@keyframes g10fxSwirl{0%{transform:scale(0) rotate(0deg);opacity:1}55%{transform:scale(1.3) rotate(200deg) translateX(35px);opacity:0.7}100%{transform:scale(0.2) rotate(400deg) translateX(70px);opacity:0}}
@keyframes g10fxShadow{0%{transform:scale(0.3);opacity:0.95;filter:brightness(0.1)}40%{transform:scale(2.2);opacity:0.6}100%{transform:scale(4);opacity:0}}
@keyframes g10fxSpiral{0%{transform:scale(0) rotate(0deg) translateY(0);opacity:1}100%{transform:scale(1.6) rotate(720deg) translateY(-55px);opacity:0}}
@keyframes g10fxSnow{0%{transform:scale(1.1) translateY(0) rotate(0deg);opacity:0.9}100%{transform:scale(0.5) translateY(55px) rotate(360deg);opacity:0}}
@keyframes g10fxFloat{0%{transform:scale(0.6) translateY(0);opacity:0.8}50%{transform:scale(1.1) translateY(-35px);opacity:0.5}100%{transform:scale(0) translateY(-65px);opacity:0}}
@keyframes g10fxWind{0%{transform:scale(1) translateX(0);opacity:0.8}100%{transform:scale(1.6) translateX(-90px) translateY(-25px);opacity:0}}
@keyframes g10fxSpin{0%{transform:scale(0) rotate(0deg);opacity:1}100%{transform:scale(2.2) rotate(720deg);opacity:0}}
@keyframes g10fxBurst{0%{transform:scale(0);opacity:1}40%{transform:scale(1.6);opacity:0.9}100%{transform:scale(3.5);opacity:0}}
@keyframes g10fxDrop{0%{transform:scale(1.3) translateY(-25px);opacity:0.9}65%{transform:scale(1) translateY(35px);opacity:0.7}100%{transform:scale(0.7) translateY(55px);opacity:0}}
@keyframes g10fxSpark{0%{transform:scale(0) rotate(0deg);opacity:1}30%{transform:scale(1.6) rotate(-35deg);opacity:1}100%{transform:scale(0.1) rotate(70deg) translateX(60px);opacity:0}}
`
  const styleEl = document.createElement('style')
  styleEl.textContent = css
  document.head.appendChild(styleEl)
}
function g10SpawnTypeHitFX(targetEl, type) {
  g10EnsureHitFXStyles()
  if (!targetEl) return
  const r = targetEl.getBoundingClientRect()
  if (!r.width) return
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2
  const cfg = G10_TYPE_HIT_FX[(type || '').toLowerCase()] || G10_TYPE_HIT_FX.normal
  for (let i = 0; i < cfg.count; i++) {
    const p = document.createElement('span')
    const px = cx + (Math.random() - 0.5) * r.width
    const py = cy + (Math.random() - 0.5) * r.height
    const sz = 18 + Math.random() * 14
    const dur = 0.55 + Math.random() * 0.45
    const del = i * 0.055
    p.style.cssText = `position:fixed;font-size:${sz}px;left:${px}px;top:${py}px;z-index:401;pointer-events:none;animation:${cfg.anim} ${dur}s ${del}s ease-out both;filter:drop-shadow(0 0 6px ${cfg.color});`
    p.textContent = cfg.emojis[i % cfg.emojis.length]
    document.body.appendChild(p)
    setTimeout(() => p.remove(), (dur + del) * 1000 + 100)
  }
}

// Unified attacker aura ring — DOM fallback when Pixi isn't active.
// Caller passes the sprite wrap element; ring is removed after dur ms.
function spawnTypeAura(el, type, dur){
  if (!el) return
  const d = dur || 540
  const color = pokeTypeColor(type)
  const r = document.createElement('div')
  r.className = 'poke-aura-ring'
  r.style.cssText = 'position:absolute;inset:-6px;border:3px solid '+color+';border-radius:50%;box-shadow:0 0 24px '+color+',inset 0 0 16px '+color+';pointer-events:none;z-index:6;animation:pokeAuraRing '+d+'ms ease-out forwards;'
  el.appendChild(r)
  setTimeout(function(){ r.remove() }, d)
}

function pokeSprite(slug){return `assets/Pokemon/sprites/${slug}.png`}
function pokeSpriteArtwork(slug){return `https://img.pokemondb.net/artwork/large/${slug}.jpg`}
// Both legacy names map to identical pokemondb HD raster. Kept as separate
// functions because many call-sites reference each name directly. Cascade
// helpers de-dup URLs at runtime so duplicate calls cost nothing.
function pokeSpriteOnline(slug){return `https://img.pokemondb.net/sprites/home/normal/${slug}.png`}
function pokeSpriteCDN(slug){return pokeSpriteOnline(slug)}
function pokeSpriteBackup(id){return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
function pokeSpriteBack(id){return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${id}.png`}
// SVG variant — 751 vector Pokemon sprites for visual variety
function pokeSpriteSVG(slug){const id=POKE_IDS[slug];return id?`assets/Pokemon/svg/${id}.svg`:null}
// Alt2 HD WebP variant — 1025 Pokemon 630×630 RGBA, covers full Gen 1-9.
// Filename pattern: {NNNN}_{slug}.webp (4-digit zero-padded ID). See TODO Task #37.
// Task #66 fix (2026-04-25): local files use underscore separator + special nidoran case.
function _slugToAlt2File(slug) {
  if (slug === 'nidoran-f') return 'nidoranf'
  if (slug === 'nidoran-m') return 'nidoranm'
  return slug.replace(/-/g, '_')
}
function pokeSpriteAlt2(slug){
  const id = POKE_IDS[slug]
  return id ? `assets/Pokemon/pokemondb_hd_alt2/${String(id).padStart(4,'0')}_${_slugToAlt2File(slug)}.webp` : null
}
// HD priority: alt2 WebP (1025 covered) → local SVG (751 covered) → HD CDN raster. Low-res only as offline fallback.
function pokeSpriteVariant(slug){
  return pokeSpriteAlt2(slug) || pokeSpriteSVG(slug) || pokeSpriteCDN(slug)
}

// ── TRAINER PARTIES ──
const TRAINER_PARTIES = [
  { id:'ash',     name:'Ash',     emoji:'🧢', color:'rgba(239,68,68,0.6)',    glow:'rgba(239,68,68,0.4)',
    party:[
      // Gen 1
      {id:25,  name:'Pikachu',    type:'electric'},
      {id:6,   name:'Charizard',  type:'fire'},
      {id:1,   name:'Bulbasaur',  type:'grass'},
      {id:7,   name:'Squirtle',   type:'water'},
      {id:143, name:'Snorlax',    type:'normal'},
      {id:83,  name:'Farfetchd',  type:'normal'},
      {id:52,  name:'Meowth',     type:'normal'},
      {id:106, name:'Hitmonlee',  type:'fighting'},
      // Gen 2
      {id:154, name:'Meganium',   type:'grass'},
      {id:157, name:'Typhlosion', type:'fire'},
      {id:160, name:'Feraligatr', type:'water'},
      {id:164, name:'Noctowl',    type:'normal'},
      {id:214, name:'Heracross',  type:'bug'},
      // Gen 3
      {id:254, name:'Sceptile',   type:'grass'},
      {id:257, name:'Blaziken',   type:'fire'},
      {id:260, name:'Swampert',   type:'water'},
      {id:333, name:'Swablu',     type:'normal'},
      {id:384, name:'Rayquaza',   type:'dragon'},
      // Gen 4
      {id:389, name:'Torterra',   type:'grass'},
      {id:392, name:'Infernape',  type:'fire'},
      {id:395, name:'Empoleon',   type:'water'},
      {id:448, name:'Lucario',    type:'fighting'},
      {id:445, name:'Garchomp',   type:'dragon'},
      // Gen 5
      {id:497, name:'Serperior',  type:'grass'},
      {id:500, name:'Emboar',     type:'fire'},
      {id:503, name:'Samurott',   type:'water'},
      {id:542, name:'Leavanny',   type:'bug'},
      {id:553, name:'Krookodile', type:'dark'},
      // Gen 6
      {id:658, name:'Greninja',   type:'water'},
      {id:663, name:'Talonflame', type:'fire'},
      {id:701, name:'Hawlucha',   type:'fighting'},
      {id:706, name:'Goodra',     type:'dragon'},
      // Gen 7
      {id:724, name:'Decidueye',  type:'grass'},
      {id:727, name:'Incineroar', type:'fire'},
      {id:730, name:'Primarina',  type:'water'},
      {id:745, name:'Lycanroc',   type:'rock'},
      {id:809, name:'Melmetal',   type:'steel'},
      // Gen 8
      {id:812, name:'Rillaboom',  type:'grass'},
      {id:815, name:'Cinderace',  type:'fire'},
      {id:818, name:'Inteleon',   type:'water'},
      {id:887, name:'Dragapult',  type:'dragon'},
      {id:823, name:'Corviknight',type:'flying'},
    ]},
  { id:'misty',   name:'Misty',   emoji:'🌸', color:'rgba(236,72,153,0.6)',   glow:'rgba(236,72,153,0.4)',
    party:[
      {id:121, name:'Starmie',   type:'water'},
      {id:54,  name:'Psyduck',   type:'water'},
      {id:130, name:'Gyarados',  type:'water'},
      {id:468, name:'Togekiss',  type:'fairy'},
      {id:116, name:'Horsea',    type:'water'},
      {id:184, name:'Azumarill', type:'water'},
    ]},
  { id:'brock',   name:'Brock',   emoji:'🪨', color:'rgba(120,80,30,0.7)',    glow:'rgba(146,64,14,0.5)',
    party:[
      {id:208, name:'Steelix',    type:'steel'},
      {id:74,  name:'Geodude',    type:'rock'},
      {id:205, name:'Forretress', type:'bug'},
      {id:185, name:'Sudowoodo',  type:'rock'},
      {id:453, name:'Croagunk',   type:'poison'},
      {id:259, name:'Marshtomp',  type:'water'},
    ]},
  { id:'clemont', name:'Clemont', emoji:'⚡', color:'rgba(245,158,11,0.6)',   glow:'rgba(245,158,11,0.4)',
    party:[
      {id:695, name:'Heliolisk',  type:'electric'},
      {id:405, name:'Luxray',     type:'electric'},
      {id:82,  name:'Magneton',   type:'electric'},
      {id:702, name:'Dedenne',    type:'electric'},
      {id:652, name:'Chesnaught', type:'grass'},
      {id:659, name:'Bunnelby',   type:'normal'},
    ]},
  { id:'go',      name:'Go',      emoji:'📱', color:'rgba(139,92,246,0.6)',   glow:'rgba(139,92,246,0.4)',
    party:[
      {id:815, name:'Cinderace',  type:'fire'},
      {id:330, name:'Flygon',     type:'dragon'},
      {id:818, name:'Inteleon',   type:'water'},
      {id:59,  name:'Arcanine',   type:'fire'},
      {id:131, name:'Lapras',     type:'water'},
      {id:113, name:'Chansey',    type:'normal'},
    ]},
  { id:'serena',  name:'Serena',  emoji:'💫', color:'rgba(236,72,153,0.5)',   glow:'rgba(167,139,250,0.4)',
    party:[
      {id:700, name:'Sylveon',    type:'fairy'},
      {id:655, name:'Delphox',    type:'fire'},
      {id:674, name:'Pancham',    type:'fighting'},
      {id:133, name:'Eevee',      type:'normal'},
      {id:572, name:'Minccino',   type:'normal'},
      {id:350, name:'Milotic',    type:'water'},
    ]},
  { id:'jessie',  name:'Jessie',  emoji:'🌹', color:'rgba(220,38,38,0.7)',    glow:'rgba(239,68,68,0.5)',
    party:[
      {id:24,  name:'Arbok',      type:'poison'},
      {id:202, name:'Wobbuffet',  type:'psychic'},
      {id:336, name:'Seviper',    type:'poison'},
      {id:269, name:'Dustox',     type:'bug'},
      {id:711, name:'Gourgeist',  type:'ghost'},
      {id:778, name:'Mimikyu',    type:'ghost'},
    ]},
  { id:'james',   name:'James',   emoji:'🌸', color:'rgba(109,40,217,0.65)',  glow:'rgba(139,92,246,0.45)',
    party:[
      {id:110, name:'Weezing',    type:'poison'},
      {id:71,  name:'Victreebel', type:'grass'},
      {id:332, name:'Cacturne',   type:'grass'},
      {id:455, name:'Carnivine',  type:'grass'},
      {id:686, name:'Inkay',      type:'dark'},
      {id:747, name:'Mareanie',   type:'poison'},
    ]},
]

let g10ActiveTrainer = 'ash'
let partyPickerCtx = 'g10' // 'g10' | 'g13b'
let g13bSavedPoke = null   // persists chosen pokemon across G13B rounds

// Hotfix #104 (2026-04-28) — Picker performance overhaul to fix tab-switch
// freeze. Strategy: tab content cache (no rebuild on switch), event
// delegation (1 handler vs 39), debounced tab clicks, IntersectionObserver
// lazy-load (cascade only fires when card enters viewport),
// DocumentFragment batch insert. See plan purring-brewing-flurry.md.
const _partyTabCache = new Map() // trainerId -> HTMLElement (tab pane)
let _partyGridDelegated = false
let _partyTabIO = null
let _partyTabClickT = 0

function _partyGetCurrentId() {
  return (partyPickerCtx === 'g13b' && g13bSavedPoke)
    ? g13bSavedPoke.id
    : (g10State.playerPoke ? g10State.playerPoke.id : -1)
}

function _partyEnsureDelegation(gridEl) {
  if (_partyGridDelegated) return
  _partyGridDelegated = true
  gridEl.addEventListener('click', (ev) => {
    const card = ev.target.closest && ev.target.closest('.g10-party-card')
    if (!card || card.classList.contains('current')) return
    const pokeId = parseInt(card.dataset.pokeId)
    const trainerId = card.dataset.trainerId
    if (!pokeId || !trainerId) return
    const trainer = TRAINER_PARTIES.find(t => t.id === trainerId)
    if (!trainer) return
    const poke = trainer.party.find(p => p.id === pokeId)
    if (!poke) return
    playClick()
    if (partyPickerCtx === 'g13b') { switchG13bPlayerPoke(poke) }
    else { switchPlayerPoke(poke) }
    closePartyPicker()
  })
}

function _partyEnsureIO() {
  if (_partyTabIO || typeof IntersectionObserver === 'undefined') return
  _partyTabIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      const img = e.target
      _partyTabIO.unobserve(img)
      const slug = img.dataset.slug
      const pokeId = parseInt(img.dataset.pokeId)
      if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
        attachSpriteCascade(img, buildPokeSources(slug, pokeId), '🎴')
      } else {
        img.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(slug)) || (typeof pokeSpriteOnline === 'function' ? pokeSpriteOnline(slug) : '')
      }
    }
  }, { rootMargin: '200px 0px' })
}

function _partyBuildTabPane(trainer) {
  const pane = document.createElement('div')
  pane.className = 'g10-tab-pane'
  pane.dataset.trainerId = trainer.id
  const frag = document.createDocumentFragment()
  trainer.party.forEach(poke => {
    const card = document.createElement('div')
    card.className = 'g10-party-card'
    card.dataset.pokeId = poke.id
    card.dataset.trainerId = trainer.id
    const typeColor = TYPE_COLORS[poke.type] || '#888'
    card.style.setProperty('--ptc', typeColor)
    const slug = poke.name.toLowerCase().replace(/\s/g, '-')
    card.innerHTML = `
      <img class="g10-pcard-spr" alt="${poke.name}" loading="lazy" decoding="async" data-slug="${slug}" data-poke-id="${poke.id}">
      <div class="g10-pcard-name">${poke.name}</div>
      <div class="g10-pcard-type" style="background:${typeColor}">${poke.type.charAt(0).toUpperCase() + poke.type.slice(1)}</div>
    `
    frag.appendChild(card)
  })
  pane.appendChild(frag)
  return pane
}

function _partyMarkCurrent(pane) {
  const currentId = _partyGetCurrentId()
  pane.querySelectorAll('.g10-party-card').forEach(card => {
    const isCurrent = parseInt(card.dataset.pokeId) === currentId
    card.classList.toggle('current', isCurrent)
    let badge = card.querySelector('.g10-pcard-curr-badge')
    if (isCurrent && !badge) {
      badge = document.createElement('div')
      badge.className = 'g10-pcard-curr-badge'
      badge.textContent = '✔ Aktif'
      card.insertBefore(badge, card.firstChild)
    } else if (!isCurrent && badge) {
      badge.remove()
    }
  })
}

function openPartyPicker(){
  partyPickerCtx = 'g10'
  const overlay = document.getElementById('g10-party-overlay')
  if(!overlay) return
  overlay.classList.add('open')
  renderTrainerTabs()
  renderPartyGrid(g10ActiveTrainer)
}
function closePartyPicker(){
  const overlay = document.getElementById('g10-party-overlay')
  if(overlay) overlay.classList.remove('open')
  // Resume G13b game-state timers if we paused it on open (Task #64)
  if (partyPickerCtx === 'g13b' && g13bState && g13bState.phase === 'playing') {
    g13bState.paused = false
  }
  // Hotfix #104: tab cache lives across opens for perf, but reset IO so we
  // re-trigger lazy-load on next open (offscreen images may have cleared).
  if (_partyTabIO) { try { _partyTabIO.disconnect() } catch (_) {} _partyTabIO = null }
  // Hotfix #116: restore overlays we defensively hid on open.
  document.querySelectorAll('.g13b-picker-hidden').forEach(el => {
    el.style.display = ''
    el.classList.remove('g13b-picker-hidden')
  })
}
function renderTrainerTabs(){
  const tabsEl = document.getElementById('g10-trainer-tabs')
  if(!tabsEl) return
  tabsEl.innerHTML = ''
  const frag = document.createDocumentFragment()
  TRAINER_PARTIES.forEach(tr => {
    const tab = document.createElement('button')
    tab.className = 'g10-trainer-tab' + (tr.id===g10ActiveTrainer?' active':'')
    tab.dataset.trainerId = tr.id
    tab.style.setProperty('--tc', tr.color)
    tab.style.setProperty('--tc-glow', tr.glow)
    tab.innerHTML = `<span class="g10-tab-emoji">${tr.emoji}</span><span class="g10-tab-name">${tr.name}</span>`
    tab.onclick = () => {
      // Hotfix #104: debounce — 150ms guard against rapid double-click
      const now = Date.now()
      if (now - _partyTabClickT < 150) return
      _partyTabClickT = now
      if (g10ActiveTrainer === tr.id) return
      g10ActiveTrainer = tr.id
      // Just toggle active class instead of full rebuild (closures cleared
      // since we use dataset+delegation now).
      tabsEl.querySelectorAll('.g10-trainer-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.trainerId === tr.id)
      })
      renderPartyGrid(tr.id)
      playClick()
    }
    frag.appendChild(tab)
  })
  tabsEl.appendChild(frag)
}
function renderPartyGrid(trainerId){
  const gridEl = document.getElementById('g10-party-grid')
  if(!gridEl) return
  const trainer = TRAINER_PARTIES.find(t=>t.id===trainerId)
  if(!trainer) return
  _partyEnsureDelegation(gridEl)
  _partyEnsureIO()
  // Move current grid's cards back into their cached pane (so tab swap
  // preserves loaded images + listeners + scroll state).
  const prevTrainerId = gridEl.dataset.activeTrainer
  if (prevTrainerId && prevTrainerId !== trainerId) {
    const prevPane = _partyTabCache.get(prevTrainerId)
    if (prevPane) {
      while (gridEl.firstChild) prevPane.appendChild(gridEl.firstChild)
    }
  }
  // Build (or reuse) target pane.
  let pane = _partyTabCache.get(trainerId)
  if (!pane) {
    pane = _partyBuildTabPane(trainer)
    _partyTabCache.set(trainerId, pane)
  }
  _partyMarkCurrent(pane)
  // Swap pane contents into gridEl (single reflow).
  gridEl.innerHTML = ''
  while (pane.firstChild) gridEl.appendChild(pane.firstChild)
  gridEl.dataset.activeTrainer = trainerId
  // Lazy-observe images that haven't loaded yet.
  if (_partyTabIO) {
    gridEl.querySelectorAll('.g10-pcard-spr').forEach(img => {
      if (img.src && !img.src.startsWith('data:') && img.complete) return
      _partyTabIO.observe(img)
    })
  } else {
    // No IntersectionObserver — fallback to immediate cascade load (still
    // bounded by attachSpriteCascade's MAX_CONCURRENT queue).
    gridEl.querySelectorAll('.g10-pcard-spr').forEach(img => {
      if (img.src) return
      const slug = img.dataset.slug
      const pokeId = parseInt(img.dataset.pokeId)
      if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
        attachSpriteCascade(img, buildPokeSources(slug, pokeId), '🎴')
      }
    })
  }
}
function switchPlayerPoke(poke){
  const s = g10State
  if(!s || s.locked) return
  // Swap out animation
  const pSpr = document.getElementById('g10-pspr')
  if(!pSpr) return
  pSpr.classList.add('spr-swap-out')
  // Show field message
  const fs = document.getElementById('g10-field-status')
  if(fs){ fs.textContent=`Ayo, ${poke.name}!`; fs.classList.add('show'); setTimeout(()=>fs.classList.remove('show'),1200) }
  setTimeout(()=>{
    // Update state
    s.playerPoke = { ...poke, slug: poke.name.toLowerCase().replace(/\s/g,'-'), type: poke.type }
    // Reload back sprite for player
    pSpr.classList.remove('spr-swap-out')
    pSpr.style.imageRendering = 'auto'
    const slug = poke.name.toLowerCase().replace(/\s/g,'-')
    // Hotfix #104 (2026-04-28): cascade via shared helper to kill freeze loop.
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      attachSpriteCascade(pSpr, buildPokeSources(slug, poke.id), '🦊')
    } else {
      pSpr.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(slug)) || pokeSpriteOnline(slug)
    }
    // Apply new Pokemon's facing BEFORE swap-in animation starts so keyframe
    // transform:scaleX(var(--flip)) uses the correct sign during the anim.
    applyPokeFlip(pSpr, slug, 'player')
    pSpr.classList.add('spr-swap-in')
    setTimeout(()=>{
      pSpr.classList.remove('spr-swap-in')
      // Re-apply after animation: guards against animation-fill-mode:forwards
      // locking a stale scaleX if the Pokemon has a non-default natural facing.
      applyPokeFlip(pSpr, slug, 'player')
    },350)
    // Apply tier sizing for new player Pokemon
    const _g10swTierSz = t => ({1:1.0, 2:1.2, 3:1.3, 4:1.3}[t||1] || 1.0)
    const swPTierSc = _g10swTierSz(poke.tier)
    pSpr.style.width = pSpr.style.height = swPTierSc !== 1.0 ? `calc(clamp(140px, min(38vw, 30vh), 320px) * ${swPTierSc})` : ''
    // Update info box
    document.getElementById('g10-pname').textContent = poke.name
    document.getElementById('g10-plv').textContent = 'Lv'+(Math.floor(Math.random()*10)+s.levelNum)
    const ptEl = document.getElementById('g10-ptype')
    ptEl.textContent = poke.type.charAt(0).toUpperCase()+poke.type.slice(1)
    ptEl.style.background = TYPE_COLORS[poke.type]||'#888'
    // Update attack label
    const atkLbl = document.getElementById('g10-atk-lbl')
    if(atkLbl) atkLbl.textContent = `${poke.name.toUpperCase()} MENYERANG!`
  }, 280)
}

function openG13bPartyPicker() {
  partyPickerCtx = 'g13b'
  // Pause game-side timers (legendary auto-attack uses paused-flag guard at game.js:8410)
  // Prevents wild-attack while picker is open and avoids race conditions on close (Task #64)
  if (g13bState && g13bState.phase === 'playing') g13bState.paused = true
  // Hotfix #116: defensively hide lingering result/evo/reward overlays — they sat above
  // picker (z-indices 500/600) and absorbed close-button + tab clicks, freezing the picker.
  const _hideStale = (sel) => {
    document.querySelectorAll(sel).forEach(el => {
      if (getComputedStyle(el).display !== 'none') {
        el.style.display = 'none'
        el.classList.add('g13b-picker-hidden')
      }
    })
  }
  _hideStale('.g13b-result-overlay, .g13-evo-overlay, .gr-overlay, .math-quiz-overlay, #math-quiz-overlay')
  const overlay = document.getElementById('g10-party-overlay')
  if (!overlay) return
  overlay.classList.add('open')
  renderTrainerTabs()
  renderPartyGrid(g10ActiveTrainer)
}

function switchG13bPlayerPoke(poke) {
  g13bSavedPoke = { ...poke, slug: poke.name.toLowerCase().replace(/\s/g, '-') }
  const pspr = document.getElementById('g13b-pspr')
  if (!pspr) return
  // Task #71: local-first per L16. Hotfix 2026-04-28: cascade now goes
  // through attachSpriteCascade (dedup + terminating) to kill freeze loop.
  if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
    attachSpriteCascade(pspr, buildPokeSources(g13bSavedPoke.slug, poke.id), '🦊')
  } else {
    pspr.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(g13bSavedPoke.slug)) || pokeSpriteOnline(g13bSavedPoke.slug)
  }
  // Apply facing to player sprite (was missing — caused wrong-facing post-switch)
  if (typeof applyPokeFlip === 'function') applyPokeFlip(pspr, g13bSavedPoke.slug, 'player')
  const pTier = poke.tier || 1
  const pScale = {1:1.0, 2:1.2, 3:1.3, 4:1.3}[pTier] || 1.0
  pspr.style.width = pspr.style.height = pScale === 1.0 ? '' : `calc(clamp(80px, min(20vw, 18vh), 160px) * ${pScale})`
  const pnameEl = document.getElementById('g13b-pname')
  if (pnameEl) pnameEl.textContent = g13bSavedPoke.name
}

// Legendary & special Pokémon ID sets (used by G10, G13, G13B pools)
const _LEGENDARY_IDS = new Set([144,145,146,150,151,243,244,245,249,250,251,380,381,382,383,384,385,386,480,481,482,483,484,487,491,492,493,638,639,640,641,642,643,644,645,646,649,716,717,718,719,720,721,785,786,787,788,789,790,791,792,800,801,802,807,888,889,890,891,892,893,894,895,896,897,898,905,987,1001,1004,1007,1008,1014,1015,1016,1017,1018,1019,1020])
const _PSEUDO_IDS   = new Set([149,248,373,376,445,635,646,706,784,887])
const _CUTE_IDS     = new Set([1,4,7,25,39,52,133,172,175,216,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912,915,921,924])

// Pokemon pool by level — anak bisa kenal favorit lebih dulu
const G10_POOL = {
  favorite: POKEMON_DB.filter(p => _CUTE_IDS.has(p.id)).map(p => p.id),
  mid:      POKEMON_DB.filter(p => !_LEGENDARY_IDS.has(p.id) && !_PSEUDO_IDS.has(p.id) && !_CUTE_IDS.has(p.id)).map(p => p.id),
  boss:     POKEMON_DB.filter(p => _LEGENDARY_IDS.has(p.id) || _PSEUDO_IDS.has(p.id)).map(p => p.id),
}

// Hotfix #101-G: ring buffer of last 4 enemy ids (was: single _g10LastEnemyId).
// User reported "Variasi per city belum banyak masih Pokemon itu2 aja" — 5-7 species
// in a city pool kept repeating because we only suppressed the most recent pick.
// Tracking last 4 forces fresh picks across rounds while still falling back to
// the full pool when 4 distinct species aren't available.
let _g10RecentEnemies = []
const _G10_RECENT_MAX = 4
function pickPokeForLevel(lv){
  // Task #66 (2026-04-25): if city is selected, pick from city.pack
  // Task #91 (2026-04-26): EXPAND with region pool — current city Pokemon get 3x weight
  // (still feel thematic) but neighboring city Pokemon also appear (variety: 30-50 species
  // per region instead of 5-7 per city). Anti-repeat tracker prevents same enemy 2 rounds in a row.
  try {
    if (state && state.selectedRegion && state.selectedCity && typeof CITY_PACK !== 'undefined') {
      const region = CITY_PACK[state.selectedRegion]
      if (region && region.cities) {
        const currentCity = region.cities.find(c => c.slug === state.selectedCity)
        const cityIds = (currentCity && currentCity.pack) ? currentCity.pack.map(p => p.id) : []
        const regionIds = []
        region.cities.forEach(c => (c.pack || []).forEach(p => regionIds.push(p.id)))
        // 3x weight for current city + 1x for region
        const pool = [...cityIds, ...cityIds, ...cityIds, ...regionIds]
        const ids = [...new Set(pool)]  // dedupe; weighting is via duplication in `pool` for next ratio adjustment
        const found = POKEMON_DB.filter(p => ids.includes(p.id))
        if (found.length >= 2) {
          // Hotfix #101-G: filter against last-4 ring buffer; fall back to pool
          // minus the most-recent if all 4 would be excluded (small pool case).
          let candidates = found.filter(p => !_g10RecentEnemies.includes(p.id))
          if (candidates.length === 0) {
            const lastId = _g10RecentEnemies.length ? _g10RecentEnemies[_g10RecentEnemies.length - 1] : -1
            candidates = found.filter(p => p.id !== lastId)
            if (candidates.length === 0) candidates = found
          }
          const pick = candidates[Math.floor(Math.random() * candidates.length)]
          _g10RecentEnemies.push(pick.id)
          if (_g10RecentEnemies.length > _G10_RECENT_MAX) _g10RecentEnemies.shift()
          return pick
        }
      }
    }
  } catch(_) {}
  // Fallback to legacy level-based pool — also tracked in ring buffer for variety.
  const poolKey = lv<=5?'favorite': lv<=15?'mid':'boss'
  const ids = G10_POOL[poolKey]
  const found = POKEMON_DB.filter(p=>ids.includes(p.id))
  const pool = found.length>=3 ? found : POKEMON_DB  // fallback
  // Apply ring-buffer to legacy fallback so dedupe also works when city pool unavailable.
  let candidates = pool.filter(p => !_g10RecentEnemies.includes(p.id))
  if (candidates.length === 0) candidates = pool
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  _g10RecentEnemies.push(pick.id)
  if (_g10RecentEnemies.length > _G10_RECENT_MAX) _g10RecentEnemies.shift()
  return pick
}

// Task #66: load city background for game-N field if state has selectedCity
function loadCityBackground(fieldEl) {
  if (!fieldEl) return false
  try {
    if (!state || !state.selectedRegion || !state.selectedCity || typeof CITY_PACK === 'undefined') return false
    const region = CITY_PACK[state.selectedRegion]
    const city = region && region.cities && region.cities.find(c => c.slug === state.selectedCity)
    if (!city || !city.bg) return false
    const isMobile = window.innerWidth < 768
    const bgFile = isMobile ? city.bg.mobile : city.bg.pc
    const folder = isMobile ? 'mobile' : 'pc'
    const url = `assets/Pokemon/background/${folder}/${encodeURIComponent(bgFile)}`
    // Hotfix #101-F2: probe before applying. Setting style.backgroundImage on
    // a 404 URL strips the CSS gradient fallback → field goes WHITE
    // (user-reported "round 3 white blank field"). Probe ensures the bg only
    // gets applied if the asset actually loads; on failure, keep CSS gradient.
    const probe = new Image()
    probe.onload = () => {
      probe.onload = probe.onerror = null
      try {
        fieldEl.style.backgroundImage = `url('${url}')`
        fieldEl.style.backgroundSize = 'cover'
        fieldEl.style.backgroundPosition = 'center 22%'
      } catch(_){}
    }
    probe.onerror = () => {
      probe.onload = probe.onerror = null
      // Leave inline backgroundImage empty so CSS class gradient remains visible.
      try { fieldEl.style.backgroundImage = '' } catch(_){}
    }
    probe.src = url
    return true
  } catch(_) { return false }
}

// Level Matrix — tiap level punya config presisi untuk pedagogical scaffolding
const G10_LEVELS = {
  1:  {hp:3, rounds:3,  max:5,  ops:['+'],     attemptsBeforeDamage:3, scaffold:'always'},
  2:  {hp:3, rounds:3,  max:6,  ops:['+'],     attemptsBeforeDamage:3, scaffold:'afterWrong'},
  3:  {hp:3, rounds:4,  max:7,  ops:['+'],     attemptsBeforeDamage:3, scaffold:'afterWrong'},
  4:  {hp:3, rounds:4,  max:8,  ops:['+'],     attemptsBeforeDamage:3, scaffold:'afterWrong'},
  5:  {hp:3, rounds:4,  max:9,  ops:['+'],     attemptsBeforeDamage:3, scaffold:'afterWrong'},
  6:  {hp:4, rounds:5,  max:10, ops:['+'],     attemptsBeforeDamage:3, scaffold:'afterWrong'},
  7:  {hp:4, rounds:5,  max:12, ops:['+','-'], attemptsBeforeDamage:3, scaffold:'afterWrong'},
  8:  {hp:4, rounds:5,  max:13, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  9:  {hp:4, rounds:6,  max:14, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  10: {hp:4, rounds:6,  max:15, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  11: {hp:5, rounds:6,  max:16, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  12: {hp:5, rounds:7,  max:17, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'afterWrong'},
  13: {hp:5, rounds:7,  max:18, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'never'},
  14: {hp:5, rounds:8,  max:19, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'never'},
  15: {hp:5, rounds:8,  max:20, ops:['+','-'], attemptsBeforeDamage:2, scaffold:'never'},
  16: {hp:6, rounds:8,  max:25, ops:['+','-'], attemptsBeforeDamage:1, scaffold:'never'},
  17: {hp:6, rounds:9,  max:30, ops:['+','-'], attemptsBeforeDamage:1, scaffold:'never'},
  18: {hp:6, rounds:9,  max:35, ops:['+','-'], attemptsBeforeDamage:1, scaffold:'never'},
  19: {hp:7, rounds:10, max:40, ops:['+','-'], attemptsBeforeDamage:1, scaffold:'never'},
  20: {hp:7, rounds:12, max:50, ops:['+','-'], attemptsBeforeDamage:1, scaffold:'never', boss:true},
}

// Diagnostic distractors — jawaban salah berbasis miskonsepsi umum anak
function getDiagnosticDistractors(a, b, op, ans){
  const wrong = new Set()
  if(op==='+'){
    wrong.add(ans - 1)     // off-by-one rendah
    wrong.add(ans + 1)     // off-by-one tinggi
    wrong.add(Math.abs(a - b))  // salah operasi: kurang bukannya tambah
    wrong.add(a)           // lupa tambah b
    wrong.add(b)           // lupa tambah a
    wrong.add(ans - 2)
    wrong.add(ans + 2)
  } else {
    wrong.add(ans - 1)     // off-by-one rendah
    wrong.add(ans + 1)     // off-by-one tinggi
    wrong.add(a + b)       // tambah bukannya kurang
    wrong.add(b)           // jawab dengan pengurang
    wrong.add(a)           // jawab dengan yang dikurangi
    wrong.add(ans - 2)
    wrong.add(ans + 2)
  }
  wrong.delete(ans)
  wrong.delete(0)
  const arr = [...wrong].filter(x => x > 0 && x !== ans)
  const result = arr.slice(0, 3)
  let pad = ans + 10
  while(result.length < 3){ if(!result.includes(pad) && pad !== ans) result.push(pad); pad++ }
  return result.slice(0, 3)
}

let g10State={}

function initGame10(){
  // Task #84: defensive resets — prevents dangling flags from previous session crash
  state._showingResult = false
  state._showingGameResult = false
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]   // CRITICAL: avoid undefined[0] in endGame
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  battleBgmPlay()
  // Hotfix #101-H: free any leftover Pixi context from a previous game/level
  // before init. Mobile browsers cap WebGL contexts at ~16; without cleanup,
  // each transition leaks a context until the next init triggers context-loss
  // or a tab crash. destroyAll is idempotent (no-op if nothing to destroy).
  try { if (typeof PixiManager !== 'undefined') PixiManager.destroyAll() } catch(_){}
  loadPixiJS(function(){ PixiManager.init('g10-pixi-canvas').catch(()=>{}) })
  // Hotfix #110/#111: reset sprite element state + flush cascade queue
  // + clear stuck inline CSS (display/opacity/animation/transform/classes)
  // that could survive the previous game's win/death sequence and leave
  // sprite invisible on re-entry. Removed non-existent *-back IDs.
  ;['g10-pspr', 'g10-espr'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (typeof resetSpriteEl === 'function') resetSpriteEl(el)
    if (typeof _resetSprElCss === 'function') _resetSprElCss(el)
  })
  if (typeof flushSpriteQueue === 'function') flushSpriteQueue()
  // Force g10-field background fallback if loadCityBackground fails (no city).
  const _g10Field = document.getElementById('g10-field')
  if (_g10Field) {
    _g10Field.style.display = 'flex'
    if (!_g10Field.style.backgroundImage) {
      _g10Field.style.background = 'linear-gradient(180deg,#5C94FC 0%,#3B82F6 60%,#166534 100%)'
    }
  }
  const p=state.players[state.currentPlayer]
  const _icon=document.getElementById('g10-player-icon'); if(_icon) _icon.textContent=p.animal
  document.getElementById('g10-stars').textContent='⭐ 0'
  const lv = Math.max(1, Math.min(20, state.selectedLevelNum || 1))
  const cfg = G10_LEVELS[lv] || G10_LEVELS[10]
  // Task #66: load city background if selected
  loadCityBackground(document.getElementById('g10-field'))

  let pp=pickPokeForLevel(lv), ep=pickPokeForLevel(lv)
  // Hotfix #101-B: bounded retry — if pool is misconfigured (e.g. city pack
  // with 1 species) the unbounded while pegged CPU at 100% → tab freeze.
  let _retries = 0
  while(ep.id===pp.id && _retries < 10){ ep=pickPokeForLevel(lv); _retries++ }
  if(ep.id===pp.id){
    const fb = POKEMON_DB.filter(p => p.id !== pp.id)
    if(fb.length) ep = fb[Math.floor(Math.random()*fb.length)]
  }

  g10State={
    playerPoke:pp, enemyPoke:ep,
    playerHp:cfg.hp, enemyHp:cfg.hp,
    playerMaxHp:cfg.hp, enemyMaxHp:cfg.hp,
    round:1, totalRounds:cfg.rounds, stars:0, locked:false,
    maxNum:cfg.max, ops:cfg.ops,
    attemptsBeforeDamage:cfg.attemptsBeforeDamage,
    scaffold:cfg.scaffold,
    levelNum:lv, boss:cfg.boss||false
  }
  g10NewBattle()
}

function g10NewBattle(){
  const s=g10State
  s.locked=false

  // Task #99 (2026-04-27): defensive bg refresh per round. Field could go blank
  // mid-game if a CSS animation cleared inline backgroundImage, leaving white field.
  try { loadCityBackground(document.getElementById('g10-field')) } catch(_){}

  // Emoji-as-SVG data URL fallback for catastrophic sprite cascade failure (offline + no local).
  // Without this, all 4 cascade steps failing leaves a broken-image icon — visually "blank field".
  const _emojiSpriteDataURL = (emoji) => `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="70" font-size="80" text-anchor="middle">'+emoji+'</text></svg>')}`

  // Load sprites via shared cascade helper (dedup + terminating).
  // Hotfix 2026-04-28: replaces ad-hoc onerror chain that previously could
  // re-set src to a URL that just failed. See plan purring-brewing-flurry.md.
  function loadSprHD(imgId, slug, pokeId){
    const el=document.getElementById(imgId)
    if(!el) return
    el.className=el.className.replace(/\bspr-\w+/g,'').trim()
    el.style.opacity='1'; el.style.imageRendering='auto'
    el.style.animation=''
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      attachSpriteCascade(el, buildPokeSources(slug, pokeId), '👹')
    } else {
      el.src = pokeSpriteVariant(slug)
    }
  }
  function loadSprPlayer(imgId, pokeId, slug){
    const el=document.getElementById(imgId)
    if(!el) return
    el.className=el.className.replace(/\bspr-\w+/g,'').trim()
    el.style.opacity='1'; el.style.imageRendering='auto'
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      attachSpriteCascade(el, buildPokeSources(slug, pokeId), '🦊')
    } else {
      el.src = pokeSpriteVariant(slug)
    }
  }
  loadSprHD('g10-espr', s.enemyPoke.slug, s.enemyPoke.id)
  loadSprPlayer('g10-pspr', s.playerPoke.id, s.playerPoke.slug)

  // Data-driven facing + final scale. POKE_FACING handles Pokemon whose
  // home sprite faces viewer-left (blanket scaleX(-1) broke them). POKE_VISUAL
  // normalizes sprites that fill more/less of their 475×475 canvas than average.
  const eEl=document.getElementById('g10-espr')
  const pEl=document.getElementById('g10-pspr')
  applyPokeFlip(eEl, s.enemyPoke.slug, 'enemy')
  applyPokeFlip(pEl, s.playerPoke.slug, 'player')
  const eSc = pokeFinalScale(s.enemyPoke.slug)
  const pSc = pokeFinalScale(s.playerPoke.slug)
  if(eEl) eEl.style.width = eEl.style.height = eSc !== 1.0 ? `calc(clamp(140px, min(38vw, 30vh), 320px) * ${eSc})` : ''
  if(pEl) pEl.style.width = pEl.style.height = pSc !== 1.0 ? `calc(clamp(140px, min(38vw, 30vh), 320px) * ${pSc})` : ''
  // Reset wrapper entrance animations so they replay cleanly each battle
  const eWrap=document.getElementById('g10-espr-wrap')
  const pWrap=document.getElementById('g10-pspr-wrap')
  if(eWrap){ eWrap.style.animation='none'; void eWrap.offsetWidth; eWrap.style.animation='' }
  if(pWrap){ pWrap.style.animation='none'; void pWrap.offsetWidth; pWrap.style.animation='' }

  // Names + levels
  document.getElementById('g10-ename').textContent=s.enemyPoke.name
  document.getElementById('g10-pname').textContent=s.playerPoke.name
  document.getElementById('g10-elv').textContent='Lv'+(Math.floor(Math.random()*20)+s.levelNum)
  document.getElementById('g10-plv').textContent='Lv'+(Math.floor(Math.random()*10)+s.levelNum)
  document.getElementById('g10-round').textContent=`Ronde ${s.round}/${s.totalRounds}`
  document.getElementById('g10-battle-status').textContent='Jawab soal untuk menyerang!'

  // Type badges
  function setType(id,type){
    const el=document.getElementById(id)
    el.textContent=type.charAt(0).toUpperCase()+type.slice(1)
    el.style.background=TYPE_COLORS[type]||'#888'
  }
  setType('g10-etype', s.enemyPoke.type)
  setType('g10-ptype', s.playerPoke.type)

  // HP bars
  g10RenderHp('g10-ehpfill','g10-ehpnums', s.enemyHp, s.enemyMaxHp)
  g10RenderHp('g10-phpfill','g10-phpnums', s.playerHp, s.playerMaxHp)

  // Clear field status
  const fs=document.getElementById('g10-field-status')
  fs.textContent=''; fs.classList.remove('show')

  g10GenQuestion()
}

function g10RenderHp(fillId, numsId, hp, maxHp){
  const pct=Math.max(0,(hp/maxHp)*100)
  const el=document.getElementById(fillId)
  el.style.width=pct+'%'
  el.className='g10-hp-fill'+(pct>50?'':pct>25?' hp-mid':' hp-low')
  document.getElementById(numsId).textContent=`${hp}/${maxHp}`
}

function g10GenQuestion(){
  const s=g10State
  // Hotfix #112-H: delegate to shared math-rules per user mandate.
  // Easy = anak TK / SD kelas 1; G10 has 20 levels.
  const _diff = state.selectedLevel || 'easy'
  const _lv = state.selectedLevelNum || 1
  let q, qText, lbl, ans
  if (typeof window.makeGameQuestion === 'function') {
    q = window.makeGameQuestion(_lv, 20, _diff)
    ans = q.ans
    qText = q.q
    s._g10Choices = q.choices
    lbl = `${s.playerPoke.name} menyerang!`
  } else {
    // Fallback: addition only
    const a = Math.floor(Math.random() * 9) + 1, b = Math.floor(Math.random() * 9) + 1
    ans = a + b; qText = `${a} + ${b} = ?`
    s._g10Choices = [ans, ans+1, ans-1, ans+2].sort(() => Math.random() - 0.5)
    lbl = `${s.playerPoke.name} menyerang!`
  }
  s.currentAnswer = ans
  s.currentProblem = { ans }
  s.attempts = 0
  const hint=document.getElementById('g10-hint'); if(hint) hint.innerHTML=''
  const model=document.getElementById('g10-model'); if(model) model.innerHTML=''
  document.getElementById('g10-atk-lbl').textContent=lbl

  // Animate equation swap
  const mathEl=document.getElementById('g10-math')
  mathEl.classList.remove('pop')
  void mathEl.offsetWidth
  mathEl.textContent=qText
  mathEl.classList.add('pop')

  // Hotfix #112-H: choices come from shared math-rules q.choices.
  const opts = (s._g10Choices && Array.isArray(s._g10Choices)) ? s._g10Choices : [ans]
  const grid=document.getElementById('g10-choices')
  grid.innerHTML=''
  opts.forEach(v=>{
    const btn=document.createElement('button')
    btn.className='g10-cbtn'
    btn.textContent=v
    btn.onclick=()=>g10Answer(v,btn)
    grid.appendChild(btn)
  })
}

function g10ShowHint(mode){
  const s=g10State
  const h=document.getElementById('g10-hint')
  const m=document.getElementById('g10-model')
  if(!h||!m) return
  const p=s.currentProblem||{}
  const {a,b,op,ans}=p
  if(mode==='soft'){
    h.innerHTML='🤔 Hampir! Coba hitung lagi...'
    m.innerHTML=''
  } else if(mode==='model'&&a!=null){
    h.innerHTML='💡 Mari kita hitung bersama!'
    const maxOrbs=Math.min(a,10)
    const orbsA=Array.from({length:maxOrbs},(_,i)=>`<span class="g10-orb g10-orb-a" style="--od:${i*0.04}s">⚡</span>`).join('')
    if(op==='+'){
      const maxOrbsB=Math.min(b,8)
      const orbsB=Array.from({length:maxOrbsB},(_,i)=>`<span class="g10-orb g10-orb-b" style="--od:${(maxOrbs+i)*0.04}s">✨</span>`).join('')
      m.innerHTML=`<div class="g10-orbs">${orbsA}<span class="g10-op">+</span>${orbsB}<span class="g10-op">= ${ans}</span></div>`
    } else {
      m.innerHTML=`<div class="g10-orbs">${orbsA}<span class="g10-op">− ${b} = ${ans}</span></div>`
    }
  } else if(mode==='solution'){
    h.innerHTML=`<span style="color:#F43F5E">❌ Jawaban benar: <b style="font-size:16px">${s.currentAnswer}</b></span>`
    m.innerHTML=''
  }
}

function g10Answer(val, btn){
  if(g10State.locked) return
  const s=g10State
  // Hotfix #112-H: support both numeric (math) and string (knowledge) answers
  const ok = String(val) === String(s.currentAnswer)

  if(ok){
    s.locked=true
    s.attempts=0
    document.querySelectorAll('.g10-cbtn').forEach(b=>b.setAttribute('disabled',''))
    btn.classList.add('correct')
    playCorrect()
    const hint=document.getElementById('g10-hint'); if(hint) hint.innerHTML=''
    const model=document.getElementById('g10-model'); if(model) model.innerHTML=''
    // Player attacks enemy
    g10DoAttack(s.playerPoke.type,'player','enemy',()=>{
      s.enemyHp=Math.max(0,s.enemyHp-1)
      g10RenderHp('g10-ehpfill','g10-ehpnums',s.enemyHp,s.enemyMaxHp)
      document.getElementById('g10-battle-status').textContent=''
      setTimeout(()=>{
        if(s.enemyHp<=0) g10EnemyDefeated()
        else { s.locked=false; g10GenQuestion() }
      },400)
    })
  } else {
    s.attempts=(s.attempts||0)+1
    btn.classList.add('wrong')
    btn.setAttribute('disabled','')
    playWrong()

    const maxAttempts = s.attemptsBeforeDamage || 3
    const scaffold = s.scaffold || 'afterWrong'

    if(s.attempts < maxAttempts){
      // Belum mencapai batas — beri scaffold sesuai level
      if(s.attempts===1){
        document.getElementById('g10-battle-status').textContent='🤔 Belum tepat, coba lagi!'
        if(scaffold==='always' || scaffold==='afterWrong') g10ShowHint('soft')
      } else {
        document.getElementById('g10-battle-status').textContent='💡 Yuk lihat caranya...'
        if(scaffold==='always' || scaffold==='afterWrong') g10ShowHint('model')
      }
      // Don't lock — allow retry (wrong button already disabled)
    } else {
      // Mencapai batas — musuh menyerang
      s.locked=true
      document.querySelectorAll('.g10-cbtn').forEach(b=>b.setAttribute('disabled',''))
      g10ShowHint('solution')
      document.getElementById('g10-battle-status').textContent=''
      g10DoAttack(s.enemyPoke.type,'enemy','player',()=>{
        s.playerHp=Math.max(0,s.playerHp-1)
        g10RenderHp('g10-phpfill','g10-phpnums',s.playerHp,s.playerMaxHp)
        setTimeout(()=>{
          if(s.playerHp<=0) g10PlayerDefeated()
          else { s.locked=false; g10GenQuestion() }
        },800)
      })
    }
  }
}

// Type-specific particle FX on battle field — GPU via Pixi, DOM fallback.
// Canonical 18-type coverage (lowercase keys); aligned with g13TypeHitFX.
function g10TypeFX(type, targetSide){
  const pixiApp = PixiManager.get('g10-pixi-canvas')
  if (pixiApp) {
    pixiTypeFX(pixiApp, type, targetSide)
    return
  }
  // DOM fallback (used if Pixi hasn't loaded yet)
  const field=document.getElementById('g10-field')
  if(!field) return
  const CFG={
    fire:    {emojis:['🔥','✨'],anim:'fxRise',  color:'#FF6B35',count:8},
    water:   {emojis:['💧','🌊'],anim:'fxRain',  color:'#4FC3F7',count:7},
    electric:{emojis:['⚡','✨'],anim:'fxZap',   color:'#FFCB05',count:10},
    grass:   {emojis:['🍃','🌿'],anim:'fxSwirl', color:'#4CAF50',count:8},
    dark:    {emojis:['🌑','💢'],anim:'fxShadow',color:'#3a0a5a',count:5},
    psychic: {emojis:['🔮','💫'],anim:'fxSpiral',color:'#F95587',count:7},
    ice:     {emojis:['❄️','💎'],anim:'fxSnow',  color:'#98D8D8',count:7},
    ghost:   {emojis:['👻','💜'],anim:'fxFloat', color:'#705898',count:5},
    flying:  {emojis:['🌪️','💨'],anim:'fxWind',  color:'#A890F0',count:6},
    dragon:  {emojis:['💫','🐉'],anim:'fxSpin',  color:'#7038F8',count:6},
    fighting:{emojis:['💥','👊'],anim:'fxBurst', color:'#C03028',count:7},
    rock:    {emojis:['🪨','💥'],anim:'fxDrop',  color:'#B8A038',count:5},
    poison:  {emojis:['☠️','💜'],anim:'fxFloat', color:'#A040A0',count:5},
    ground:  {emojis:['💥','🌍'],anim:'fxBurst', color:'#E0C068',count:6},
    bug:     {emojis:['✨','🌿'],anim:'fxSwirl', color:'#A8B820',count:6},
    steel:   {emojis:['⚔️','✨'],anim:'fxSpark', color:'#B8B8D0',count:5},
    normal:  {emojis:['💢','✨'],anim:'fxBurst', color:'#A8A878',count:5},
    fairy:   {emojis:['✨','💖'],anim:'fxSwirl', color:'#EE99AC',count:7},
    default: {emojis:['💥','✨'],anim:'fxBurst', color:'#a8a878',count:5},
  }
  const cfg=CFG[(type||'').toLowerCase()]||CFG.default
  const isEnemy=targetSide==='enemy'
  const xBase=isEnemy?52:5, yBase=isEnemy?2:40
  for(let i=0;i<cfg.count;i++){
    const p=document.createElement('span')
    const px=xBase+Math.random()*38, py=yBase+Math.random()*38
    const dur=0.65+Math.random()*0.45, del=i*0.055
    p.style.cssText=`position:absolute;font-size:${18+Math.random()*16}px;left:${px}%;top:${py}%;z-index:9;pointer-events:none;animation:${cfg.anim} ${dur}s ${del}s ease-out both;filter:drop-shadow(0 0 5px ${cfg.color});`
    p.textContent=cfg.emojis[i%cfg.emojis.length]
    field.appendChild(p)
    setTimeout(()=>p.remove(),(dur+del)*1000+100)
  }
}

function g10DoAttack(type, fromSide, toSide, onDone){
  // Hit chain has 8+ DOM accesses; if any node disappears mid-round, throwing
  // would freeze the round. Always call onDone() — visual gloss is optional,
  // round progression is not. Guard each visual section so partial failures
  // (e.g. missing flash el) don't cancel later sections (e.g. defender shake).
  let _doneCalled = false
  const _safeDone = () => { if (_doneCalled) return; _doneCalled = true; try { onDone && onDone() } catch(e){ console.error('[g10DoAttack] onDone threw:', e, e && e.stack) } }
  // Watchdog — if the inner setTimeout chain fails to fire, still progress.
  const _wd = setTimeout(_safeDone, 1500)

  try { playAttackSound(type) } catch(_){}
  const emoji = TYPE_EMOJI[type] || '💥'
  const atkEl = document.getElementById('g10-atk-fx')
  const emojiEl = document.getElementById('g10-atk-emoji')

  // Aura ring on attacker — canonical palette via POKE_TYPE_COLORS
  const typeLow = (type || '').toLowerCase()
  const auraColor = pokeTypeColor(typeLow)
  const fromWrapId = fromSide === 'player' ? 'g10-pspr-wrap' : 'g10-espr-wrap'
  const fromWrapEl = document.getElementById(fromWrapId)
  try {
    const _pixiApp = PixiManager.get('g10-pixi-canvas') || PixiManager.get('g13b-pixi-canvas')
    if (_pixiApp) pixiAuraRing(_pixiApp, fromSide, parseInt(auraColor.replace('#',''), 16))
    else spawnTypeAura(fromWrapEl, typeLow)
  } catch(e){ console.warn('[g10DoAttack] aura:', e) }

  try {
    const atkSlug = fromSide === 'player' ? (g10State.playerPoke ? g10State.playerPoke.slug : '') : (g10State.enemyPoke ? g10State.enemyPoke.slug : '')
    const atkType = fromSide === 'player' ? (g10State.playerPoke ? g10State.playerPoke.type : type) : (g10State.enemyPoke ? g10State.enemyPoke.type : type)
    showMovePopup(fromWrapEl, getPokeMove(atkSlug, atkType), auraColor)
  } catch(e){ console.warn('[g10DoAttack] movePopup:', e) }

  try {
    const atkSprId = fromSide === 'player' ? 'g10-pspr' : 'g10-espr'
    const atkSpr = document.getElementById(atkSprId)
    if (atkSpr) {
      atkSpr.classList.remove('spr-atk'); void atkSpr.offsetWidth
      atkSpr.classList.add('spr-atk')
      setTimeout(() => { try { atkSpr.classList.remove('spr-atk') } catch(_){} }, 400)
    }
  } catch(e){ console.warn('[g10DoAttack] attacker lunge:', e) }

  try { g10TypeFX(type, toSide) } catch(e){ console.warn('[g10DoAttack] typeFX:', e) }

  // Projectile geometry — null-guard target wrap
  let dx = 0, dy = 0, startX = 0, startY = 0
  try {
    const fromRect = fromWrapEl ? fromWrapEl.getBoundingClientRect() : {left:0,top:0,width:80,height:80}
    const toWrapId = toSide === 'enemy' ? 'g10-espr-wrap' : 'g10-pspr-wrap'
    const toWrap = document.getElementById(toWrapId)
    const toRect = toWrap ? toWrap.getBoundingClientRect() : {left:fromRect.left+200,top:fromRect.top,width:80,height:80}
    startX = fromRect.left + fromRect.width / 2
    startY = fromRect.top + fromRect.height / 2
    dx = (toRect.left + toRect.width / 2) - startX
    dy = (toRect.top + toRect.height / 2) - startY
  } catch(e){ console.warn('[g10DoAttack] geom:', e) }

  try {
    if (emojiEl) {
      emojiEl.textContent = emoji
      emojiEl.style.animation = 'none'
      void emojiEl.offsetWidth
    }
    if (atkEl) {
      atkEl.style.left = startX + 'px'
      atkEl.style.top = startY + 'px'
      atkEl.style.opacity = '1'
      atkEl.style.transition = 'none'
      atkEl.animate([
        {transform:`translate(-50%,-50%) scale(0.7)`, opacity:1},
        {transform:`translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5}px)) scale(1.3)`, opacity:1, offset:0.6},
        {transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.8)`, opacity:0}
      ], {duration:360, easing:'ease-in', fill:'forwards'})
    }
  } catch(e){ console.warn('[g10DoAttack] projectile:', e) }

  try {
    const _flashPixi = PixiManager.get('g10-pixi-canvas') || PixiManager.get('g13b-pixi-canvas')
    if (_flashPixi) {
      pixiTypeFlash(_flashPixi, type)
    } else {
      const flash = document.getElementById('poke-flash')
      if (flash) {
        flash.className = 'poke-flash ' + type
        setTimeout(() => { try { flash.className = 'poke-flash' } catch(_){} }, 700)
      }
    }
  } catch(e){ console.warn('[g10DoAttack] flash:', e) }

  // Defender shakes + flashes after projectile arrives — schedule onDone unconditionally
  setTimeout(() => {
    try {
      if (atkEl) atkEl.style.opacity = '0'
      const defSprId = toSide === 'enemy' ? 'g10-espr' : 'g10-pspr'
      const defSpr = document.getElementById(defSprId)
      if (defSpr) {
        defSpr.classList.remove('spr-hit','spr-flash'); void defSpr.offsetWidth
        defSpr.classList.add('spr-hit','spr-flash')
        // Hotfix #104 (2026-04-28): port g13c-style type-themed hit
        // particles directly on the defender sprite bbox. User: "samakan
        // aja dg g13c". Existing g10TypeFX renders at field-edge corners;
        // this adds tight-on-sprite emoji burst with type emojis/anim.
        try { g10SpawnTypeHitFX(defSpr, type) } catch(e){ console.warn('[g10DoAttack] hit fx:', e) }
        setTimeout(() => {
          try { defSpr.classList.remove('spr-hit','spr-flash') } catch(_){}
          clearTimeout(_wd); _safeDone()
        }, 480)
        return
      }
    } catch(e){ console.warn('[g10DoAttack] defender shake:', e) }
    clearTimeout(_wd); _safeDone()
  }, 340)
}

function g10EnemyDefeated(){
  const s=g10State
  // Death animation
  const eSpr=document.getElementById('g10-espr')
  eSpr.classList.remove('spr-defeat'); void eSpr.offsetWidth
  eSpr.classList.add('spr-defeat')

  // Light burst at enemy position — Pixi primary, CSS fallback
  const wrap=document.getElementById('g10-espr-wrap').getBoundingClientRect()
  const bx=((wrap.left+wrap.width/2)/window.innerWidth*100).toFixed(1)
  const by=((wrap.top+wrap.height/2)/window.innerHeight*100).toFixed(1)
  const _burstPixi = PixiManager.get('g10-pixi-canvas')
  if (_burstPixi) {
    pixiBurstFlash(_burstPixi, parseFloat(bx), parseFloat(by))
  } else {
    const burst=document.getElementById('g10-burst-fx')
    burst.style.setProperty('--bx',bx+'%')
    burst.style.setProperty('--by',by+'%')
    burst.classList.remove('show'); void burst.offsetWidth
    burst.classList.add('show')
    setTimeout(()=>burst.classList.remove('show'),950)
  }

  // Stars
  s.stars++
  state.players[state.currentPlayer].stars++
  const starsEl=document.getElementById('g10-stars')
  starsEl.textContent=`⭐ ${s.stars}`
  // Task #90 (Phase 4.2): use shared animateClass helper (Task #80)
  animateClass(starsEl, 'pop', 400)

  const fs=document.getElementById('g10-field-status')
  fs.textContent=`🏆 ${s.enemyPoke.name} kalah!`
  fs.classList.add('show')

  s.round++
  if(s.round>s.totalRounds){
    setTimeout(()=>{ fs.classList.remove('show'); endGame(s.stars) },1400)
    return
  }

  setTimeout(()=>{
    fs.textContent='Musuh baru datang!'
    let next=pickPokeForLevel(s.levelNum)
    // Hotfix #101-B: bounded retry — see initGame10 for rationale.
    let _retries = 0
    while(next.id===s.playerPoke.id && _retries < 10){ next=pickPokeForLevel(s.levelNum); _retries++ }
    if(next.id===s.playerPoke.id){
      const fb = POKEMON_DB.filter(p => p.id !== s.playerPoke.id)
      if(fb.length) next = fb[Math.floor(Math.random()*fb.length)]
    }
    s.enemyPoke=next
    s.enemyHp=s.enemyMaxHp
    setTimeout(()=>g10NewBattle(),300)
  },1300)
}

function g10PlayerDefeated(){
  const s=g10State
  const pSpr=document.getElementById('g10-pspr')
  pSpr.classList.remove('spr-defeat'); void pSpr.offsetWidth
  pSpr.classList.add('spr-defeat')
  const fs=document.getElementById('g10-field-status')
  fs.textContent=`😢 ${s.playerPoke.name} pingsan!`
  fs.classList.add('show')
  setTimeout(()=>{ fs.classList.remove('show'); endGame(s.stars) },1400)
}

function g10ShowAttack(type,target){
  // Legacy alias kept for compatibility
  const fromSide=target==='enemy'?'player':'enemy'
  g10DoAttack(type,fromSide,target,()=>{})
}

// ================================================================
// GAME 11 — KUIS SAINS
// ================================================================
const SCIENCE_QUESTIONS = [
  // TK (usia 5-6) — pertanyaan sangat mudah, visual & konkret
  {tier:'tk', emoji:'🐱', q:'Kucing berbunyi apa?', choices:['Meong','Guk-guk','Moo','Kukuruyuk'], ans:0, explain:'Kucing berbunyi "meong". Anjing berbunyi "guk-guk", sapi berbunyi "moo", dan ayam berbunyi "kukuruyuk"!'},
  {tier:'tk', emoji:'🐟', q:'Ikan tinggal di mana?', choices:['Di pohon','Di air','Di langit','Di tanah'], ans:1, explain:'Ikan tinggal di air — di laut, sungai, atau kolam. Ikan bernapas dengan insang dan berenang menggunakan siripnya.'},
  {tier:'tk', emoji:'☀️', q:'Matahari muncul saat kapan?', choices:['Malam hari','Pagi hari','Saat tidur','Tengah malam'], ans:1, explain:'Matahari muncul di pagi hari dan terbenam di sore hari. Saat malam, Bumi berputar sehingga sisi kita menjauhi matahari.'},
  {tier:'tk', emoji:'🐄', q:'Dari mana susu berasal?', choices:['Sapi','Harimau','Gajah','Ular'], ans:0, explain:'Susu yang kita minum berasal dari sapi. Sapi adalah hewan mamalia yang menghasilkan susu untuk anaknya dan juga untuk kita.'},
  {tier:'tk', emoji:'🌱', q:'Tanaman perlu apa untuk hidup?', choices:['Batu','Air','Pasir','Es'], ans:1, explain:'Tanaman perlu air, cahaya matahari, dan tanah untuk hidup. Air dibawa dari akar ke seluruh bagian tanaman.'},
  {tier:'tk', emoji:'🌈', q:'Pelangi muncul setelah apa?', choices:['Hujan','Angin','Panas terik','Badai salju'], ans:0, explain:'Pelangi muncul setelah hujan! Cahaya matahari melewati tetes-tetes air hujan dan terpecah menjadi tujuh warna indah.'},
  {tier:'tk', emoji:'🐣', q:'Ayam dan bebek menetas dari apa?', choices:['Biji','Telur','Bunga','Tanah'], ans:1, explain:'Ayam dan bebek adalah unggas yang lahir dari telur. Induknya mengerami telur agar hangat sampai menetas.'},
  {tier:'tk', emoji:'🍎', q:'Apel itu warnanya apa?', choices:['Biru','Ungu','Merah atau hijau','Hitam'], ans:2, explain:'Apel bisa berwarna merah, hijau, atau kuning. Warnanya berasal dari zat alami bernama antosianin dan klorofil.'},
  {tier:'tk', emoji:'🐝', q:'Hewan kecil penghasil madu adalah...', choices:['Semut','Kupu-kupu','Lebah','Nyamuk'], ans:2, explain:'Lebah mengumpulkan nektar dari bunga dan mengubahnya menjadi madu di dalam sarangnya. Madu adalah makanan sehat yang manis!'},
  {tier:'tk', emoji:'🌙', q:'Kita tidur saat kapan?', choices:['Pagi','Siang','Malam','Sore'], ans:2, explain:'Kita tidur saat malam hari karena tubuh butuh istirahat setelah beraktivitas. Tidur yang cukup membuat tubuh sehat dan otak lebih cerdas!'},
  {tier:'tk', emoji:'🐘', q:'Gajah punya hidung panjang yang disebut?', choices:['Ekor','Belalai','Sirip','Cakar'], ans:1, explain:'Hidung panjang gajah disebut belalai! Belalai digunakan untuk mengambil makanan, minum air, dan menyapa sesama gajah.'},
  {tier:'tk', emoji:'🐦', q:'Hewan yang bisa terbang di langit adalah?', choices:['Ikan','Burung','Sapi','Kucing'], ans:1, explain:'Burung bisa terbang karena memiliki sayap dan tulang berongga yang ringan. Tidak semua burung bisa terbang — pinguin dan emu tidak bisa!'},
  // CILIK (usia 6-8) — SD kelas 1
  {tier:'cilik', emoji:'🦅', q:'Burung bisa melakukan apa yang tidak bisa dilakukan kucing?', choices:['Terbang','Berlari','Makan','Tidur'], ans:0, explain:'Burung punya sayap dan tulang berongga yang memungkinkannya terbang. Kucing tidak punya sayap, jadi tidak bisa terbang.'},
  {tier:'cilik', emoji:'🌞', q:'Apa yang dibutuhkan tanaman selain air?', choices:['Cahaya matahari','Kegelapan','Es batu','Angin kencang'], ans:0, explain:'Tanaman butuh cahaya matahari untuk fotosintesis — proses membuat makanan dari cahaya, air, dan CO₂. Tanpa cahaya, tanaman akan layu dan mati.'},
  {tier:'cilik', emoji:'🐸', q:'Katak bisa hidup di mana saja?', choices:['Gurun pasir','Air dan darat','Kutub es','Atas pohon'], ans:1, explain:'Katak adalah hewan amfibi yang bisa hidup di air dan di darat. Saat muda (kecebong) hidup di air, saat dewasa bisa di darat.'},
  {tier:'cilik', emoji:'🌱', q:'Dari mana tanaman baru tumbuh?', choices:['Dari batu','Dari biji','Dari angin','Dari awan'], ans:1, explain:'Tanaman baru tumbuh dari biji. Di dalam biji ada calon tanaman kecil yang akan berkecambah jika mendapat air, tanah, dan cahaya.'},
  {tier:'cilik', emoji:'🐻', q:'Beruang tidur panjang saat kapan?', choices:['Musim panas','Musim semi','Musim dingin','Musim gugur'], ans:2, explain:'Beruang berhibernasi (tidur panjang) saat musim dingin karena makanan sulit ditemukan. Mereka menimbun lemak di musim gugur untuk bertahan.'},
  {tier:'cilik', emoji:'🔥', q:'Api akan padam jika terkena apa?', choices:['Angin kencang','Air','Pasir sedikit','Dedaunan'], ans:1, explain:'Api butuh panas, oksigen, dan bahan bakar untuk menyala. Air memadamkan api karena menghilangkan panas dan menghalangi oksigen.'},
  {tier:'cilik', emoji:'💧', q:'Air yang dipanaskan berubah menjadi...', choices:['Es batu','Uap air','Minyak','Susu'], ans:1, explain:'Saat dipanaskan sampai 100°C, air berubah menjadi uap air (gas). Inilah yang kita lihat saat air mendidih di panci.'},
  {tier:'cilik', emoji:'🌿', q:'Bagian tanaman yang menyerap air dari tanah adalah?', choices:['Daun','Bunga','Akar','Batang'], ans:2, explain:'Akar menyerap air dan mineral dari tanah, lalu mengalirkannya ke batang, daun, dan bunga. Akar juga menancapkan tanaman ke tanah agar tidak roboh.'},
  {tier:'cilik', emoji:'🌡️', q:'Benda untuk mengukur panas badan disebut?', choices:['Penggaris','Termometer','Jam','Timbangan'], ans:1, explain:'Termometer digunakan untuk mengukur suhu. Suhu badan normal manusia sekitar 36–37°C. Jika lebih tinggi, mungkin kita demam.'},
  {tier:'cilik', emoji:'🌊', q:'Sungai bermuara ke mana?', choices:['Gunung','Danau atau laut','Hutan','Ladang'], ans:1, explain:'Air sungai mengalir dari tempat tinggi ke tempat rendah, akhirnya bermuara ke danau atau laut. Inilah siklus air di bumi!'},
  {tier:'tumbuh', emoji:'🌊', q:'Apa nama samudra terbesar di dunia?', choices:['Samudra Atlantik','Samudra Hindia','Samudra Pasifik','Samudra Arktik'], ans:2, explain:'Samudra Pasifik adalah samudra terbesar dan terdalam di dunia, menutupi lebih dari sepertiga permukaan bumi. Luasnya melebihi seluruh daratan di Bumi!'},
  {tier:'tumbuh', emoji:'🦁', q:'Hewan apa yang disebut raja hutan?', choices:['Gajah','Harimau','Singa','Serigala'], ans:2, explain:'Singa disebut raja hutan karena keberanian dan kekuatannya. Sebenarnya singa hidup di sabana Afrika, bukan hutan. Singa jantan punya surai lebat yang gagah.'},
  {tier:'tumbuh', emoji:'🌿', q:'Proses apa yang dilakukan tumbuhan untuk membuat makanan?', choices:['Respirasi','Fotosintesis','Evaporasi','Kondensasi'], ans:1, explain:'Fotosintesis adalah proses tumbuhan membuat makanan (glukosa) dari cahaya matahari, air (H₂O), dan karbon dioksida (CO₂). Hasilnya juga menghasilkan oksigen yang kita hirup!'},
  {tier:'tumbuh', emoji:'🐋', q:'Mamalia terbesar di dunia adalah...', choices:['Hiu paus','Gajah Afrika','Paus biru','Jerapah'], ans:2, explain:'Paus biru adalah hewan terbesar yang pernah ada di Bumi — bisa mencapai 30 meter dan 200 ton! Meski hidup di laut, paus biru adalah mamalia yang bernapas dengan paru-paru.'},
  {tier:'tumbuh', emoji:'🌡️', q:'Alat apa yang digunakan untuk mengukur suhu?', choices:['Penggaris','Termometer','Barometer','Teleskop'], ans:1, explain:'Termometer mengukur suhu. Barometer mengukur tekanan udara, teleskop untuk melihat bintang, dan penggaris untuk mengukur panjang.'},
  {tier:'tumbuh', emoji:'🦋', q:'Urutan metamorfosis kupu-kupu yang benar adalah...', choices:['Telur→Kupu→Ulat→Kepompong','Telur→Ulat→Kepompong→Kupu-kupu','Ulat→Telur→Kepompong→Kupu','Kepompong→Telur→Ulat→Kupu'], ans:1, explain:'Kupu-kupu mengalami metamorfosis sempurna: Telur → Ulat (larva) → Kepompong (pupa) → Kupu-kupu (dewasa). Di dalam kepompong, ulat berubah total menjadi kupu-kupu!'},
  {tier:'tumbuh', emoji:'💧', q:'Air mendidih pada suhu berapa derajat Celsius?', choices:['50°C','75°C','100°C','120°C'], ans:2, explain:'Air mendidih pada 100°C di permukaan laut. Di pegunungan tinggi, air mendidih pada suhu lebih rendah karena tekanan udara lebih kecil.'},
  {tier:'tumbuh', emoji:'🌍', q:'Planet manakah yang paling dekat dengan Matahari?', choices:['Venus','Bumi','Mars','Merkurius'], ans:3, explain:'Merkurius adalah planet terdekat dengan Matahari dan terkecil di tata surya kita. Suhu di sana sangat ekstrem: 430°C di siang hari dan -180°C di malam hari!'},
  {tier:'tumbuh', emoji:'🐊', q:'Di mana habitat asli buaya?', choices:['Gurun','Sungai dan rawa','Pegunungan tinggi','Kutub'], ans:1, explain:'Buaya adalah reptil semi-akuatik yang hidup di sungai, danau, dan rawa di daerah tropis. Mereka adalah predator puncak yang sudah ada sejak zaman dinosaurus!'},
  {tier:'tumbuh', emoji:'🌺', q:'Bagian bunga yang menghasilkan serbuk sari disebut...', choices:['Mahkota','Putik','Benang sari','Kelopak'], ans:2, explain:'Benang sari adalah organ jantan bunga yang menghasilkan serbuk sari (pollen). Serbuk sari dibawa serangga atau angin ke putik bunga lain untuk penyerbukan.'},
  {tier:'pintar', emoji:'🌏', q:'Lapisan gas yang melindungi Bumi disebut...', choices:['Hidrosfer','Litosfer','Atmosfer','Biosfer'], ans:2, explain:'Atmosfer adalah lapisan gas yang menyelimuti Bumi. Ia melindungi kita dari radiasi matahari berbahaya dan menjaga suhu Bumi tetap nyaman untuk kehidupan.'},
  {tier:'pintar', emoji:'⚡', q:'Apa yang dihasilkan oleh panel surya?', choices:['Air','Listrik','Panas','Makanan'], ans:1, explain:'Panel surya (photovoltaic) mengubah cahaya matahari menjadi listrik melalui efek fotolistrik. Ini adalah energi terbarukan yang ramah lingkungan karena tidak menghasilkan emisi.'},
  {tier:'pintar', emoji:'🔬', q:'Makhluk hidup yang sangat kecil dan tidak bisa dilihat mata adalah...', choices:['Serangga','Mikroorganisme','Plankton','Amuba besar'], ans:1, explain:'Mikroorganisme (mikroba) adalah makhluk hidup berukuran sangat kecil yang hanya bisa dilihat dengan mikroskop. Contohnya: bakteri, virus, dan jamur mikroskopis. Tidak semua berbahaya — banyak yang bermanfaat!'},
  {tier:'pintar', emoji:'🌊', q:'Rantai makanan di laut: plankton → ikan kecil → ?', choices:['Rumput laut','Ikan besar/paus','Buaya','Penguin'], ans:1, explain:'Rantai makanan laut dimulai dari plankton (produsen), dimakan ikan kecil, lalu dimakan ikan besar atau paus. Predator puncak seperti hiu atau paus orca ada di ujung rantai ini.'},
  {tier:'pintar', emoji:'🌱', q:'Pupuk organik berasal dari...', choices:['Plastik daur ulang','Sisa makhluk hidup','Batubara','Minyak bumi'], ans:1, explain:'Pupuk organik berasal dari sisa makhluk hidup seperti kotoran hewan, sisa tanaman, dan kompos. Pupuk organik menyuburkan tanah secara alami tanpa merusaknya.'},
  {tier:'pintar', emoji:'🌡️', q:'Perubahan iklim global disebabkan oleh meningkatnya...', choices:['Oksigen','Gas rumah kaca (CO2)','Nitrogen','Argon'], ans:1, explain:'Gas rumah kaca seperti CO₂ dan metana memerangkap panas matahari di atmosfer Bumi. Aktivitas manusia (membakar bahan bakar fosil, deforestasi) meningkatkan kadarnya, menyebabkan bumi makin panas.'},
  {tier:'pintar', emoji:'🌲', q:'Hutan hujan tropis banyak ditemukan di...', choices:['Eropa','Afrika utara','Amerika Selatan & Asia Tenggara','Kutub utara'], ans:2, explain:'Hutan hujan tropis tumbuh di sekitar khatulistiwa yang panas dan lembab, seperti Amazon di Amerika Selatan, Kongo di Afrika, dan Kalimantan-Sumatra di Asia Tenggara. Indonesia punya salah satu hutan tropis terluas di dunia!'},
  {tier:'pintar', emoji:'🧬', q:'DNA ditemukan di dalam...', choices:['Mitokondria','Inti sel / nukleus','Dinding sel','Vakuola'], ans:1, explain:'DNA (asam deoksiribonukleat) tersimpan di inti sel (nukleus). DNA adalah "cetak biru" kehidupan yang berisi instruksi untuk membangun dan menjalankan seluruh tubuh kita.'},
  {tier:'pintar', emoji:'⚗️', q:'Benda yang bisa menghantarkan listrik disebut...', choices:['Isolator','Konduktor','Resistor','Kapasitor'], ans:1, explain:'Konduktor adalah bahan yang mudah menghantarkan listrik, seperti tembaga, besi, dan air asin. Isolator (plastik, karet) justru menghambat listrik — itulah kenapa kabel listrik dibungkus plastik.'},
  {tier:'pintar', emoji:'🌕', q:'Gerhana bulan terjadi ketika...', choices:['Bulan menutupi Matahari','Bumi berada di antara Matahari dan Bulan','Matahari menutupi Bulan','Bulan menjauh dari Bumi'], ans:1, explain:'Gerhana bulan terjadi ketika Bumi berada di antara Matahari dan Bulan, sehingga bayangan Bumi jatuh ke Bulan. Bulan tampak merah gelap — disebut "Blood Moon"!'},
]

let g11State={}
function initGame11(){
  const p=state.players[state.currentPlayer]
  document.getElementById('g11-player-icon').textContent=p.animal
  document.getElementById('g11-stars').textContent='⭐ 0'
  const lvl=state.selectedLevel
  // Map level number to question tier (level 1-5 = TK, 6-10 = cilik, 11-15 = tumbuh, 16-20 = pintar)
  const lvlNum = state.selectedLevelNum || 10
  let mapped
  if(lvlNum<=5) mapped='tk'
  else if(lvlNum<=10) mapped='cilik'
  else if(lvlNum<=15) mapped='tumbuh'
  else mapped='pintar'
  let pool=SCIENCE_QUESTIONS.filter(q=>q.tier===mapped)
  if(pool.length<DIFF[lvl].rounds) pool=[...SCIENCE_QUESTIONS].filter(q=>q.tier==='tk'||q.tier==='cilik')
  if(pool.length<DIFF[lvl].rounds) pool=SCIENCE_QUESTIONS
  pool=pool.sort(()=>Math.random()-0.5).slice(0,DIFF[lvl].rounds)
  g11State={pool, idx:0, stars:0, total:pool.length}
  document.getElementById('g11-progress-bar').style.width='0%'
  g11ShowQuestion()
}
function g11ShowQuestion(){
  const s=g11State
  // Hide explain/lanjut on each new question
  const explainEl=document.getElementById('g11-explain')
  const lanjutEl=document.getElementById('g11-lanjut')
  if(explainEl) explainEl.style.display='none'
  if(lanjutEl) lanjutEl.style.display='none'
  if(s.idx>=s.pool.length){endGame(s.stars);return}
  const q=s.pool[s.idx]
  document.getElementById('g11-emoji').textContent=q.emoji
  document.getElementById('g11-question').textContent=q.q
  document.getElementById('g11-progress-bar').style.width=`${(s.idx/s.total)*100}%`
  const ch=document.getElementById('g11-choices')
  ch.innerHTML=''
  q.choices.forEach((c,i)=>{
    const btn=document.createElement('button')
    btn.className='sci-choice'
    btn.textContent=c
    btn.onclick=()=>g11Answer(i,btn)
    ch.appendChild(btn)
  })
}
function g11Answer(idx,btn){
  const s=g11State; const q=s.pool[s.idx]
  const correct=idx===q.ans
  // Disable all choices
  document.getElementById('g11-choices').querySelectorAll('.sci-choice').forEach(b=>b.setAttribute('disabled',''))
  btn.classList.add(correct?'correct':'wrong')
  if(!correct){
    spawnWrongShake(btn); quizStreakReset()
    const btns=document.getElementById('g11-choices').querySelectorAll('.sci-choice')
    btns[q.ans].classList.add('correct')
    spawnCorrectCardJuice(btns[q.ans], { burst:false })
  }
  correct ? playCorrect() : playWrong()
  if(correct){
    spawnCorrectCardJuice(btn); quizStreakHit(btn)
    // Flash sci-correct image briefly
    const sciCorrectEl = document.getElementById('g11-correct-flash')
    if(sciCorrectEl) { sciCorrectEl.style.opacity='1'; setTimeout(()=>sciCorrectEl.style.opacity='0', 800) }
    s.stars++
    state.players[state.currentPlayer].stars++
    document.getElementById('g11-stars').textContent=`⭐ ${s.stars}`
    animateClass(document.getElementById('g11-stars'), 'pop', 400) /* Task #90 */
    s.idx++
    setTimeout(()=>g11ShowQuestion(),900)
  } else {
    // Show explanation + Lanjut button for wrong answers
    const explainEl=document.getElementById('g11-explain')
    const lanjutEl=document.getElementById('g11-lanjut')
    if(q.explain && explainEl){
      explainEl.textContent='💡 ' + q.explain
      explainEl.style.display='block'
    }
    if(lanjutEl) lanjutEl.style.display='block'
    s.idx++
  }
}

function g11Next(){
  const explainEl=document.getElementById('g11-explain')
  const lanjutEl=document.getElementById('g11-lanjut')
  if(explainEl) explainEl.style.display='none'
  if(lanjutEl) lanjutEl.style.display='none'
  g11ShowQuestion()
}

// ================================================================
// GAME 12 — TEBAK BAYANGAN
// ================================================================
const SHADOW_ITEMS=[
  {desc:'Hewan besar berbelalai panjang dan bertelinga lebar', ans:'🐘', wrong:['🦒','🦁','🐊']},
  {desc:'Raja hutan berbulu lebat di lehernya', ans:'🦁', wrong:['🐯','🦊','🐻']},
  {desc:'Hewan hitam-putih yang suka makan bambu', ans:'🐼', wrong:['🦨','🦡','🦥']},
  {desc:'Hewan air yang bisa terbang dengan sayap hitam-putih', ans:'🐧', wrong:['🦆','🕊️','🦅']},
  {desc:'Hewan berkaki empat dan berbulu yang suka menggonggong', ans:'🐕', wrong:['🐈','🐇','🦊']},
  {desc:'Hewan yang bisa mengeluarkan sutra dari tubuhnya', ans:'🕷️', wrong:['🐛','🐝','🦗']},
  {desc:'Buah merah bulat dengan biji kecil di dalamnya', ans:'🍎', wrong:['🍊','🍇','🍓']},
  {desc:'Buah kuning panjang berbentuk melengkung', ans:'🍌', wrong:['🌽','🥒','🫒']},
  {desc:'Hewan laut berwarna merah dengan banyak kaki', ans:'🦞', wrong:['🦀','🐙','🦑']},
  {desc:'Kendaraan yang bisa terbang tinggi di langit', ans:'✈️', wrong:['🚀','🚁','🪂']},
  {desc:'Benda yang dipakai di kaki saat hujan', ans:'👢', wrong:['👟','🥿','👞']},
  {desc:'Alat yang digunakan untuk menulis di kertas', ans:'✏️', wrong:['🖍️','📏','📐']},
  {desc:'Hewan yang punya cangkang dan berjalan lambat', ans:'🐢', wrong:['🦀','🐌','🦔']},
  {desc:'Buah ungu kecil-kecil yang tumbuh bergerombol', ans:'🍇', wrong:['🫐','🍒','🫛']},
  {desc:'Kendaraan besar yang bergerak di atas rel', ans:'🚂', wrong:['🚌','🚢','✈️']},
  {desc:'Hewan berbisa dengan ekor berbentuk panah', ans:'🦂', wrong:['🕷️','🦗','🐝']},
  {desc:'Bintang laut tinggal di...', ans:'🌊', wrong:['🌲','🏔️','🏜️']},
  {desc:'Hewan yang bisa berubah warna seperti bunglon', ans:'🦎', wrong:['🐍','🐊','🦕']},
  {desc:'Buah tropis berduri di luar, manis di dalam', ans:'🍍', wrong:['🥭','🍈','🥥']},
  {desc:'Hewan berkaki delapan yang membuat jaring', ans:'🕷️', wrong:['🦗','🐜','🐝']},
  {desc:'Hewan putih bersih yang menghasilkan susu', ans:'🐄', wrong:['🐑','🐐','🐖']},
  {desc:'Reptil besar yang hidup di sungai Afrika', ans:'🐊', wrong:['🦎','🐢','🐍']},
  {desc:'Serangga kecil kuning-hitam penghasil madu', ans:'🐝', wrong:['🦗','🐛','🐜']},
  {desc:'Planet yang punya cincin indah mengelilinginya', ans:'🪐', wrong:['🌙','⭐','🌞']},
  {desc:'Alat musik petik berdawai banyak', ans:'🎸', wrong:['🥁','🎹','🎺']},
  {desc:'Hewan malam yang bisa terbang dan hidup di gua', ans:'🦇', wrong:['🦉','🐦','🕊️']},
  {desc:'Makanan laut yang berbentuk bulat berlengan banyak', ans:'🐙', wrong:['🦑','🦀','🦞']},
  {desc:'Alat untuk melihat benda jauh di langit', ans:'🔭', wrong:['🔬','📡','🧲']},
  {desc:'Buah jeruk kecil berwarna hijau dengan rasa asam', ans:'🍋', wrong:['🍊','🫒','🥝']},
  {desc:'Hewan yang hidup di hutan dan pandai berayun', ans:'🐒', wrong:['🦧','🦁','🐻']},
]
let g12State={}
function initGame12(){
  const p=state.players[state.currentPlayer]
  document.getElementById('g12-player-icon').textContent=p.animal
  document.getElementById('g12-stars').textContent='⭐ 0'
  const pool=[...SHADOW_ITEMS].sort(()=>Math.random()-0.5).slice(0,DIFF[state.selectedLevel].rounds)
  g12State={pool,idx:0,stars:0,total:pool.length,locked:false}
  document.getElementById('g12-progress-bar').style.width='0%'
  g12ShowQuestion()
}
function g12ShowQuestion(){
  const s=g12State
  if(s.idx>=s.pool.length){endGame(s.stars);return}
  const q=s.pool[s.idx]
  s.locked=false
  document.getElementById('g12-question').textContent=q.desc
  document.getElementById('g12-progress').textContent=`Soal ${s.idx+1}/${s.total}`
  document.getElementById('g12-progress-bar').style.width=`${(s.idx/s.total)*100}%`

  const choices=[{emoji:q.ans,correct:true},...q.wrong.slice(0,3).map(e=>({emoji:e,correct:false}))].sort(()=>Math.random()-0.5)
  const grid=document.getElementById('g12-choices')
  grid.innerHTML=''
  choices.forEach(c=>{
    const btn=document.createElement('button')
    btn.className='shadow-btn'
    btn.innerHTML=`<span class="shadow-icon">${c.emoji}</span>`
    btn.onclick=()=>g12Answer(c.correct,btn,grid)
    grid.appendChild(btn)
  })
}
function g12Answer(correct,btn,grid){
  const s=g12State; if(s.locked)return; s.locked=true
  const q=s.pool[s.idx]  // current question (before idx increment)
  grid.querySelectorAll('.shadow-btn').forEach(b=>{
    b.classList.add('revealed')
    const icon=b.querySelector('.shadow-icon')
    if((icon?icon.textContent:b.textContent)===q.ans) b.classList.add('correct')
  })
  if(!correct) { btn.classList.add('wrong'); spawnWrongShake(btn); quizStreakReset() }
  correct ? playCorrect() : playWrong()
  if(correct){
    // Card-anchored juice (ring + tick + pulse) on the tapped card — stays on card even with transformed ancestors
    spawnCorrectCardJuice(btn)
    quizStreakHit(btn)
    spawnSparkles(btn); flashScreen('green')
    const rfx = document.getElementById('g12-reveal-fx')
    if(rfx) { rfx.style.opacity='1'; setTimeout(()=>rfx.style.opacity='0', 700) }
    s.stars++; state.players[state.currentPlayer].stars++
    document.getElementById('g12-stars').textContent=`⭐ ${s.stars}`
  } else {
    // Highlight correct answer with card juice (no burst — less celebratory for wrong case)
    const correctBtn = Array.from(grid.querySelectorAll('.shadow-btn.correct'))[0]
    if (correctBtn && correctBtn !== btn) spawnCorrectCardJuice(correctBtn, { burst:false })
    // Show clue hint in question area
    const qEl=document.getElementById('g12-question')
    if(qEl) qEl.innerHTML=`${q.desc}<br><span style="color:#FBBF24;font-size:12px;font-weight:700">💡 Jawaban: ${q.ans}</span>`
  }
  s.idx++
  setTimeout(()=>g12ShowQuestion(),1300)
}

// Show XP on welcome screen for returning players
try{
  const xp=getXP(); if(xp>0){const tier=getLevelTier(xp);const el=document.getElementById('welcome-level-badge');if(el){el.style.display='block';el.textContent=`${tier.icon} ${tier.name} — ${xp} XP`}}
}catch(e){}
// Unregister any lingering service workers to prevent stale cache issues
if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister())).catch(()=>{})
}

// ── AAA game result handlers: fire when returning from games/g*.html ──
window.addEventListener('pageshow', function(e) {
  // Process ALL standalone game results and save progress
  for (const gn of [6, 14, 15, 16, 19, 20, 21, 22]) {
    const raw = sessionStorage.getItem(`g${gn}Result`)
    if (raw) {
      try {
        const r = JSON.parse(raw)
        let lv = r.level || 1
        const cfgRaw = sessionStorage.getItem(`g${gn}Config`)
        if (cfgRaw) { try { const c = JSON.parse(cfgRaw); lv = c.level || lv } catch(_){} }
        sessionStorage.removeItem(`g${gn}Result`); sessionStorage.removeItem(`g${gn}Config`)
        // Hotfix 2026-04-28: removed legacy 5★→3★ capping. setLevelComplete
        // accepts the raw 1-5 value; world-map renderer also updated to scale 5.
        const stars = Math.min(5, r.stars || 0)
        setLevelComplete(gn, lv, stars)
        saveStars()
      } catch(_) {}
    }
  }
  // Refresh level select if returning from bfcache
  if (e.persisted && state.currentGame) {
    try { openLevelSelect(state.currentGame) } catch(_) {}
  }
})

// ================================================================
// AAA ENHANCEMENT JS — Visual upgrades
// ================================================================

// HP bar upgrade for Pokemon battle — add gradient HP bars
function renderPokeHpBar(containerId, hp, maxHp) {
  const el = document.getElementById(containerId)
  if (!el) return
  const pct = maxHp > 0 ? (hp / maxHp) * 100 : 0
  const cls = pct > 50 ? '' : pct > 25 ? 'mid' : 'low'
  el.innerHTML = `
    <div style="display:flex;gap:3px;margin-bottom:4px;">
      ${Array.from({length: maxHp}, (_,i) =>
        `<span style="font-size:14px;opacity:${i<hp?1:0.2};filter:${i<hp?'none':'grayscale(1)'};transition:all 0.3s">${i<hp?'❤️':'🖤'}</span>`
      ).join('')}
    </div>
    <div class="poke-hp-bar-track">
      <div class="poke-hp-bar-fill ${cls}" style="width:${pct}%"></div>
    </div>`
}

// Patch g10Answer for shake animation on infobox
const _g10AnsOrig = window.g10Answer
window.g10Answer = function(val, btn) {
  _g10AnsOrig.call(this, val, btn)
  const s = g10State
  setTimeout(() => {
    const correct = val === s.currentAnswer
    if (correct) {
      const card = document.getElementById('g10-enemy-info')
      if (card) { card.classList.remove('shake-enemy'); void card.offsetWidth; card.classList.add('shake-enemy'); setTimeout(()=>card.classList.remove('shake-enemy'), 600) }
    } else {
      const card = document.getElementById('g10-player-info')
      if (card) { card.classList.remove('shake-player'); void card.offsetWidth; card.classList.add('shake-player'); setTimeout(()=>card.classList.remove('shake-player'), 600) }
    }
  }, 50)
}

// Screen transition vibration haptic (mobile)
const origShowScreen = window.showScreen
window.showScreen = function(id) {
  origShowScreen.call(this, id)
  vibrate(8)
}

// Button press haptic
document.addEventListener('touchstart', e => {
  const btn = e.target.closest('.btn, .poke-qbtn, .sci-choice, .shadow-btn, .g6-ctrl-btn, .game-tile, .level-btn, .mode-card, .animal-btn')
  if (btn) vibrate(6)
}, { passive: true })

// Particle burst on correct answer (overlay)
function spawnParticleBurst(x, y) {
  const colors = ['#FCD34D', '#A78BFA', '#2DD4BF', '#F43F5E', '#38BDF8']
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div')
    const angle = (i / 12) * 360
    const dist = 60 + Math.random() * 80
    const color = colors[Math.floor(Math.random() * colors.length)]
    p.style.cssText = `
      position:fixed; left:${x}px; top:${y}px; width:${6+Math.random()*8}px; height:${6+Math.random()*8}px;
      background:${color}; border-radius:50%; pointer-events:none; z-index:9999;
      animation:particleFly 0.7s ease-out forwards;
      --dx:${Math.cos(angle*Math.PI/180)*dist}px;
      --dy:${Math.sin(angle*Math.PI/180)*dist}px;
    `
    document.body.appendChild(p)
    setTimeout(() => p.remove(), 700)
  }
}
// Add particle keyframe if not exists
if (!document.getElementById('particle-style')) {
  const st = document.createElement('style')
  st.id = 'particle-style'
  st.textContent = `@keyframes particleFly { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} }`
  document.head.appendChild(st)
}

// Hook particle burst on correct answers (poke choices)
document.addEventListener('click', e => {
  const btn = e.target.closest('.poke-qbtn')
  if (btn && btn.classList.contains('correct')) {
    spawnParticleBurst(e.clientX, e.clientY)
  }
}, true)

// Init welcome particles on page load
;(function() {
  initWelcomeParticles()
  refreshWelcomeBadges()
  // Welcome screen train station flag: show during pause (38%-55% of 9s = ~3.4s to ~4.95s)
  const flag = document.getElementById('wlc-station-flag')
  if (flag) {
    function wlcFlagLoop() {
      setTimeout(() => { if(flag) flag.style.opacity = '1' }, 3400)
      setTimeout(() => { if(flag) flag.style.opacity = '0' }, 4950)
    }
    wlcFlagLoop()
    setInterval(wlcFlagLoop, 9000)
  }
})()

// ================================================================
// WELCOME SCREEN PARTICLES
// ================================================================
function initWelcomeParticles() {
  const container = document.getElementById('wlc-particles')
  if (!container) return
  container.innerHTML = ''
  // Electric spark + purple energy particles matching Pikachu vs Gengar theme
  const sparkTypes = [
    // Gold/yellow electric sparks
    { color: 'rgba(255,220,40,0.9)',  size: [3,7],   shape: 'diamond' },
    { color: 'rgba(255,245,120,0.8)', size: [2,5],   shape: 'circle'  },
    // Purple energy particles
    { color: 'rgba(180,60,255,0.8)',  size: [4,8],   shape: 'circle'  },
    { color: 'rgba(140,40,220,0.7)',  size: [3,6],   shape: 'diamond' },
    // White electric crackle dots
    { color: 'rgba(255,255,255,0.9)', size: [2,4],   shape: 'circle'  },
    // Orange ember sparks
    { color: 'rgba(255,140,30,0.75)', size: [3,6],   shape: 'circle'  },
  ]
  const count = 26
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div')
    p.className = 'wlc-particle'
    const type = sparkTypes[Math.floor(Math.random() * sparkTypes.length)]
    const sz = type.size[0] + Math.random() * (type.size[1] - type.size[0])
    const left = Math.random() * 96
    const delay = Math.random() * 7
    const dur = 5 + Math.random() * 9
    const skew = (Math.random() - 0.5) * 30
    let shape = ''
    if (type.shape === 'diamond') {
      // diamond shape via clip-path rotation
      shape = `clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);border-radius:0;`
    }
    p.style.cssText = `left:${left}%;bottom:${-20 - Math.random()*30}px;width:${sz}px;height:${sz * (0.8 + Math.random()*1.4)}px;background:${type.color};border-radius:50%;${shape}animation-duration:${dur}s;animation-delay:${delay}s;transform:skewX(${skew}deg);box-shadow:0 0 ${sz*1.5}px ${type.color};`
    container.appendChild(p)
  }
}

// ── LANDING PAGE DAY / DARK MODE ──
function applyLandingMode(mode) {
  const scr = document.getElementById('screen-welcome')
  const btn = document.getElementById('landing-mode-btn')
  const desktopSrc = document.getElementById('wlc-src-desktop')
  const mobileImg  = document.getElementById('wlc-bg-img')
  if (mode === 'day') {
    scr.classList.add('day-mode')
    if (btn) btn.textContent = '☀️'
    if (desktopSrc) desktopSrc.srcset = 'assets/bg-landing-desktop-day.webp'
    if (mobileImg)  mobileImg.src  = 'assets/bg-landing-mobile-day.webp'
  } else {
    scr.classList.remove('day-mode')
    if (btn) btn.textContent = '🌙'
    if (desktopSrc) desktopSrc.srcset = 'assets/bg-landing-desktop.webp'
    if (mobileImg)  mobileImg.src  = 'assets/bg-landing-mobile.webp'
  }
  localStorage.setItem('dunia-emosi-landing-mode', mode)
}
function toggleLandingMode() {
  const current = localStorage.getItem('dunia-emosi-landing-mode') || 'dark'
  applyLandingMode(current === 'dark' ? 'day' : 'dark')
  playClick()
}
;(function() {
  const saved = localStorage.getItem('dunia-emosi-landing-mode') || 'dark'
  applyLandingMode(saved)
})()

// Update welcome HUD badges + counters
function refreshWelcomeBadges() {
  const streakBadge = document.getElementById('streak-badge')
  const streakText = document.getElementById('streak-text')
  const lvlBadge = document.getElementById('welcome-level-badge')
  const xpCountEl = document.getElementById('home-xp-count')
  const starsEl = document.getElementById('home-stars-badge')
  const streak = state.streak || 0
  const xp = state.xp || 0
  if (streakBadge) streakBadge.style.display = streak > 0 ? '' : 'none'
  if (streakText) streakText.textContent = streak
  if (lvlBadge) {
    const tier = LEVEL_TIERS.slice().reverse().find(t => xp >= t.min) || LEVEL_TIERS[0]
    lvlBadge.style.display = xp > 0 ? '' : 'none'
    lvlBadge.textContent = tier.icon + ' ' + tier.name
  }
  if (xpCountEl) xpCountEl.textContent = xp
  if (starsEl) {
    // Count total stars from all games
    let totalStars = 0
    try {
      const saved = JSON.parse(localStorage.getItem('dunia-emosi-stars') || '{}')
      Object.values(saved).forEach(v => { totalStars += (v || 0) })
    } catch(e) {}
    starsEl.textContent = '⭐ ' + totalStars
  }
}

// Pokemon battle entrance — animate sprite on each new battle
const _g10NB2 = window.g10NewBattle
window.g10NewBattle = function() {
  _g10NB2.call(this)
  setTimeout(() => {
    const es = document.getElementById('g10-espr')
    const ps = document.getElementById('g10-pspr')
    if (es) { es.style.animation='none'; void es.offsetWidth; es.style.animation='pokeEnter 0.5s cubic-bezier(0.34,1.56,0.64,1)' }
    if (ps) { ps.style.animation='none'; void ps.offsetWidth; ps.style.animation='pokeEnterPlayer 0.5s cubic-bezier(0.34,1.56,0.64,1)' }
  }, 100)
  // Apply random weather effect to battle field
  applyG10Weather()
}

// ── Battle Arena Weather FX ──
const G10_WEATHERS = ['clear','clear','clear','snow','snow','rain','rain','wind','night','leaves']
function applyG10Weather() {
  const type = G10_WEATHERS[Math.floor(Math.random() * G10_WEATHERS.length)]
  // Pixi weather primary
  const pixiApp = PixiManager.get('g10-pixi-canvas')
  if (pixiApp) {
    pixiWeather(pixiApp, type)
    return
  }
  // DOM weather fallback
  const field = document.getElementById('g10-field')
  if (!field) return
  const old = field.querySelector('.g10-weather')
  if (old) old.remove()
  if (type === 'clear') return
  const layer = document.createElement('div')
  layer.className = `g10-weather g10-wx-${type}`
  if (type === 'snow') {
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('span'); s.className = 'g10-snow-flake'
      s.style.cssText = `left:${Math.random()*100}%;animation-delay:${(Math.random()*5).toFixed(1)}s;animation-duration:${(2.5+Math.random()*3).toFixed(1)}s;font-size:${7+Math.floor(Math.random()*9)}px;opacity:${(0.35+Math.random()*0.5).toFixed(2)}`
      s.textContent = '❄'; layer.appendChild(s)
    }
  } else if (type === 'rain') {
    for (let i = 0; i < 22; i++) {
      const r = document.createElement('span'); r.className = 'g10-rain-drop'
      r.style.cssText = `left:${(Math.random()*110-5).toFixed(1)}%;animation-delay:${(Math.random()*1.5).toFixed(2)}s;animation-duration:${(0.55+Math.random()*0.45).toFixed(2)}s;height:${12+Math.floor(Math.random()*18)}px;opacity:${(0.25+Math.random()*0.3).toFixed(2)}`
      layer.appendChild(r)
    }
  } else if (type === 'wind') {
    for (let i = 0; i < 10; i++) {
      const w = document.createElement('span'); w.className = 'g10-wind-streak'
      w.style.cssText = `top:${(Math.random()*90).toFixed(1)}%;animation-delay:${(Math.random()*2).toFixed(1)}s;animation-duration:${(0.9+Math.random()*0.9).toFixed(1)}s;width:${18+Math.floor(Math.random()*40)}px`
      layer.appendChild(w)
    }
  } else if (type === 'night') {
    for (let i = 0; i < 14; i++) {
      const star = document.createElement('span'); star.className = 'g10-night-star'
      star.style.cssText = `left:${(Math.random()*95).toFixed(1)}%;top:${(Math.random()*55).toFixed(1)}%;animation-delay:${(Math.random()*2.5).toFixed(1)}s;animation-duration:${(1.5+Math.random()*2).toFixed(1)}s;font-size:${5+Math.floor(Math.random()*8)}px`
      star.textContent = '✦'; layer.appendChild(star)
    }
  } else if (type === 'leaves') {
    const leafSet = ['🍂','🍃','🍁']
    for (let i = 0; i < 14; i++) {
      const l = document.createElement('span'); l.className = 'g10-leaf-fx'
      l.style.cssText = `left:${(Math.random()*95).toFixed(1)}%;animation-delay:${(Math.random()*6).toFixed(1)}s;animation-duration:${(3.5+Math.random()*3.5).toFixed(1)}s;font-size:${9+Math.floor(Math.random()*9)}px;opacity:${(0.45+Math.random()*0.45).toFixed(2)}`
      l.textContent = leafSet[Math.floor(Math.random()*3)]; layer.appendChild(l)
    }
  }
  field.appendChild(layer)
}

// ================================================================
// GAME 13 — EVOLUSI MATH ADVENTURE
// ================================================================

// 40 Evolution Chains: [player base, evolved form, wild opponent]
const G13_CHAINS = [
  // === EASY (1-10): addition up to 10 ===
  {id:1, icon:'🌿', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Bulbasaur',slug:'bulbasaur',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Ivysaur',slug:'ivysaur',type:'Grass',tc:'#22C55E'},
   wild:{name:'Oddish',slug:'oddish',type:'Grass',tc:'#22C55E'}},
  {id:2, icon:'🔥', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Charmander',slug:'charmander',type:'Fire',tc:'#F97316'},
   evolved:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:3, icon:'💧', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Squirtle',slug:'squirtle',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Wartortle',slug:'wartortle',type:'Water',tc:'#38BDF8'},
   wild:{name:'Psyduck',slug:'psyduck',type:'Water',tc:'#38BDF8'}},
  {id:4, icon:'🐛', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Caterpie',slug:'caterpie',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Metapod',slug:'metapod',type:'Bug',tc:'#84CC16'},
   wild:{name:'Exeggcute',slug:'exeggcute',type:'Grass',tc:'#22C55E'}},
  {id:5, icon:'⚡', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Poliwag',slug:'poliwag',type:'Water',tc:'#38BDF8'}},
  {id:6, icon:'🐱', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Meowth',slug:'meowth',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Persian',slug:'persian',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'}},
  {id:7, icon:'💪', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Machop',slug:'machop',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Machoke',slug:'machoke',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Geodude',slug:'geodude',type:'Rock',tc:'#A16207'}},
  {id:8, icon:'🪨', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Geodude',slug:'geodude',type:'Rock',tc:'#A16207'},
   evolved:{name:'Graveler',slug:'graveler',type:'Rock',tc:'#A16207'},
   wild:{name:'Cubone',slug:'cubone',type:'Ground',tc:'#D97706'}},
  {id:9, icon:'👻', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Gastly',slug:'gastly',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Slowpoke',slug:'slowpoke',type:'Psychic',tc:'#EC4899'}},
  {id:10, icon:'🐟', diff:'easy', maxNum:10, ops:['+'],
   player:{name:'Magikarp',slug:'magikarp',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'},
   wild:{name:'Lapras',slug:'lapras',type:'Water',tc:'#38BDF8'}},

  // === MEDIUM (11-25): addition + subtraction up to 20 ===
  {id:11, icon:'🌊', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Vaporeon',slug:'vaporeon',type:'Water',tc:'#38BDF8'},
   wild:{name:'Seel',slug:'seel',type:'Ice',tc:'#BAE6FD'}},
  {id:12, icon:'🦊', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Vulpix',slug:'vulpix',type:'Fire',tc:'#F97316'},
   evolved:{name:'Ninetales',slug:'ninetales',type:'Fire',tc:'#F97316'},
   wild:{name:'Flareon',slug:'flareon',type:'Fire',tc:'#F97316'}},
  {id:13, icon:'🌸', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Oddish',slug:'oddish',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Gloom',slug:'gloom',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},
  {id:14, icon:'🔮', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Abra',slug:'abra',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Slowbro',slug:'slowbro',type:'Psychic',tc:'#EC4899'}},
  {id:15, icon:'🦆', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Psyduck',slug:'psyduck',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Golduck',slug:'golduck',type:'Water',tc:'#38BDF8'},
   wild:{name:'Marill',slug:'marill',type:'Water',tc:'#38BDF8'}},
  {id:16, icon:'🐸', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Poliwag',slug:'poliwag',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Poliwhirl',slug:'poliwhirl',type:'Water',tc:'#38BDF8'},
   wild:{name:'Horsea',slug:'horsea',type:'Water',tc:'#38BDF8'}},
  {id:17, icon:'🐠', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Horsea',slug:'horsea',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Seadra',slug:'seadra',type:'Water',tc:'#38BDF8'},
   wild:{name:'Staryu',slug:'staryu',type:'Water',tc:'#38BDF8'}},
  {id:18, icon:'🦭', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Seel',slug:'seel',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Dewgong',slug:'dewgong',type:'Ice',tc:'#BAE6FD'},
   wild:{name:'Cloyster',slug:'cloyster',type:'Ice',tc:'#BAE6FD'}},
  {id:19, icon:'🦴', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Cubone',slug:'cubone',type:'Ground',tc:'#D97706'},
   evolved:{name:'Marowak',slug:'marowak',type:'Ground',tc:'#D97706'},
   wild:{name:'Kangaskhan',slug:'kangaskhan',type:'Normal',tc:'#A3A3A3'}},
  {id:20, icon:'⭐', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Staryu',slug:'staryu',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Starmie',slug:'starmie',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Golduck',slug:'golduck',type:'Water',tc:'#38BDF8'}},
  {id:21, icon:'🥚', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Exeggcute',slug:'exeggcute',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'},
   wild:{name:'Gloom',slug:'gloom',type:'Grass',tc:'#22C55E'}},
  {id:22, icon:'☠️', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Koffing',slug:'koffing',type:'Poison',tc:'#A855F7'},
   evolved:{name:'Weezing',slug:'weezing',type:'Poison',tc:'#A855F7'},
   wild:{name:'Marowak',slug:'marowak',type:'Ground',tc:'#D97706'}},
  {id:23, icon:'🐉', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Dratini',slug:'dratini',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Snorlax',slug:'snorlax',type:'Normal',tc:'#A3A3A3'}},
  {id:24, icon:'🐚', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Omanyte',slug:'omanyte',type:'Rock',tc:'#A16207'},
   evolved:{name:'Omastar',slug:'omastar',type:'Rock',tc:'#A16207'},
   wild:{name:'Kabuto',slug:'kabuto',type:'Rock',tc:'#A16207'}},
  {id:25, icon:'🦀', diff:'medium', maxNum:20, ops:['+','-'],
   player:{name:'Kabuto',slug:'kabuto',type:'Rock',tc:'#A16207'},
   evolved:{name:'Kabutops',slug:'kabutops',type:'Rock',tc:'#A16207'},
   wild:{name:'Omanyte',slug:'omanyte',type:'Rock',tc:'#A16207'}},

  // === HARD (26-40): mixed ops up to 30, some start as stage-1 ===
  // Player starts as first evolution → evolves to final form
  {id:56, icon:'🔥', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
   evolved:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:51, icon:'🌊', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Wartortle',slug:'wartortle',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'},
   wild:{name:'Lapras',slug:'lapras',type:'Water',tc:'#38BDF8'}},
  {id:52, icon:'🌿', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Ivysaur',slug:'ivysaur',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},
  {id:53, icon:'👻', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'}},
  {id:54, icon:'🐉', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'}},
  {id:55, icon:'🔮', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Starmie',slug:'starmie',type:'Psychic',tc:'#EC4899'}},

  // Hard (original #26 moved)
  {id:26, icon:'🔥', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Cyndaquil',slug:'cyndaquil',type:'Fire',tc:'#F97316'},
   evolved:{name:'Quilava',slug:'quilava',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:27, icon:'🐊', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Totodile',slug:'totodile',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Croconaw',slug:'croconaw',type:'Water',tc:'#38BDF8'},
   wild:{name:'Lapras',slug:'lapras',type:'Water',tc:'#38BDF8'}},
  {id:28, icon:'🌱', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Chikorita',slug:'chikorita',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Bayleef',slug:'bayleef',type:'Grass',tc:'#22C55E'},
   wild:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'}},
  {id:29, icon:'🥚', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Togepi',slug:'togepi',type:'Fairy',tc:'#FB7185'},
   evolved:{name:'Togetic',slug:'togetic',type:'Fairy',tc:'#FB7185'},
   wild:{name:'Clefable',slug:'clefable',type:'Fairy',tc:'#FB7185'}},
  {id:30, icon:'💧', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Marill',slug:'marill',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Azumarill',slug:'azumarill',type:'Water',tc:'#38BDF8'},
   wild:{name:'Vaporeon',slug:'vaporeon',type:'Water',tc:'#38BDF8'}},
  {id:31, icon:'🐻', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Teddiursa',slug:'teddiursa',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Ursaring',slug:'ursaring',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Kangaskhan',slug:'kangaskhan',type:'Normal',tc:'#A3A3A3'}},
  {id:32, icon:'🐶', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Snubbull',slug:'snubbull',type:'Fairy',tc:'#FB7185'},
   evolved:{name:'Granbull',slug:'granbull',type:'Fairy',tc:'#FB7185'},
   wild:{name:'Persian',slug:'persian',type:'Normal',tc:'#A3A3A3'}},
  {id:33, icon:'🦖', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Larvitar',slug:'larvitar',type:'Rock',tc:'#A16207'},
   evolved:{name:'Pupitar',slug:'pupitar',type:'Rock',tc:'#A16207'},
   wild:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'}},
  {id:34, icon:'🌋', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Slugma',slug:'slugma',type:'Fire',tc:'#F97316'},
   evolved:{name:'Magcargo',slug:'magcargo',type:'Fire',tc:'#F97316'},
   wild:{name:'Ninetales',slug:'ninetales',type:'Fire',tc:'#F97316'}},
  {id:35, icon:'🐗', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Swinub',slug:'swinub',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Piloswine',slug:'piloswine',type:'Ice',tc:'#BAE6FD'},
   wild:{name:'Dewgong',slug:'dewgong',type:'Ice',tc:'#BAE6FD'}},
  {id:36, icon:'💧', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Mudkip',slug:'mudkip',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Marshtomp',slug:'marshtomp',type:'Water',tc:'#38BDF8'},
   wild:{name:'Psyduck',slug:'psyduck',type:'Water',tc:'#38BDF8'}},
  {id:37, icon:'🍃', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Treecko',slug:'treecko',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Grovyle',slug:'grovyle',type:'Grass',tc:'#22C55E'},
   wild:{name:'Bulbasaur',slug:'bulbasaur',type:'Grass',tc:'#22C55E'}},
  {id:38, icon:'🐓', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Torchic',slug:'torchic',type:'Fire',tc:'#F97316'},
   evolved:{name:'Combusken',slug:'combusken',type:'Fire',tc:'#F97316'},
   wild:{name:'Vulpix',slug:'vulpix',type:'Fire',tc:'#F97316'}},
  {id:39, icon:'🌀', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Ralts',slug:'ralts',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kirlia',slug:'kirlia',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Starmie',slug:'starmie',type:'Psychic',tc:'#EC4899'}},
  {id:40, icon:'⚙️', diff:'hard', maxNum:20, ops:['+','-'],
   player:{name:'Beldum',slug:'beldum',type:'Steel',tc:'#94A3B8'},
   evolved:{name:'Metang',slug:'metang',type:'Steel',tc:'#94A3B8'},
   wild:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'}},

  // === EPIC (level 17-20): 2-stage evolution! Base → Stage1 → Final ===
  {id:61, icon:'🔥', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Charmander',slug:'charmander',type:'Fire',tc:'#F97316'},
   evolved:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:62, icon:'💧', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Squirtle',slug:'squirtle',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Wartortle',slug:'wartortle',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'},
   wild:{name:'Lapras',slug:'lapras',type:'Water',tc:'#38BDF8'}},
  {id:63, icon:'🌿', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Bulbasaur',slug:'bulbasaur',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Ivysaur',slug:'ivysaur',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},
  {id:64, icon:'👻', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Gastly',slug:'gastly',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'},
   evolved2:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'}},
  {id:65, icon:'🐉', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Dratini',slug:'dratini',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'},
   wild:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'}},
  {id:66, icon:'⚙️', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Beldum',slug:'beldum',type:'Steel',tc:'#94A3B8'},
   evolved:{name:'Metang',slug:'metang',type:'Steel',tc:'#94A3B8'},
   evolved2:{name:'Metagross',slug:'metagross',type:'Steel',tc:'#94A3B8'},
   wild:{name:'Starmie',slug:'starmie',type:'Psychic',tc:'#EC4899'}},
  {id:67, icon:'🦖', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Larvitar',slug:'larvitar',type:'Rock',tc:'#A16207'},
   evolved:{name:'Pupitar',slug:'pupitar',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Tyranitar',slug:'tyranitar',type:'Dark',tc:'#4B5563'},
   wild:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'}},
  {id:68, icon:'🌀', diff:'epic', maxNum:20, ops:['+','-'],
   player:{name:'Ralts',slug:'ralts',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kirlia',slug:'kirlia',type:'Psychic',tc:'#EC4899'},
   evolved2:{name:'Gardevoir',slug:'gardevoir',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'}},
  // More epic chains (2-stage, multiplication range)
  {id:69, icon:'🔥', diff:'epic', maxNum:20, ops:['+','-','*'],
   player:{name:'Torchic',slug:'torchic',type:'Fire',tc:'#F97316'},
   evolved:{name:'Combusken',slug:'combusken',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Blaziken',slug:'blaziken',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'}},
  {id:70, icon:'💧', diff:'epic', maxNum:20, ops:['+','-','*'],
   player:{name:'Mudkip',slug:'mudkip',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Marshtomp',slug:'marshtomp',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Swampert',slug:'swampert',type:'Water',tc:'#38BDF8'},
   wild:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'}},
  {id:71, icon:'🌿', diff:'epic', maxNum:20, ops:['+','-','*'],
   player:{name:'Treecko',slug:'treecko',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Grovyle',slug:'grovyle',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Sceptile',slug:'sceptile',type:'Grass',tc:'#22C55E'},
   wild:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'}},

  // === LEGENDARY (level 21-30): multiplication + division, all 2-stage ===
  {id:80, icon:'🌋', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Cyndaquil',slug:'cyndaquil',type:'Fire',tc:'#F97316'},
   evolved:{name:'Quilava',slug:'quilava',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Typhlosion',slug:'typhlosion',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:81, icon:'🌊', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Totodile',slug:'totodile',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Croconaw',slug:'croconaw',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Feraligatr',slug:'feraligatr',type:'Water',tc:'#38BDF8'},
   wild:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'}},
  {id:82, icon:'🌱', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Chikorita',slug:'chikorita',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Bayleef',slug:'bayleef',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Meganium',slug:'meganium',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},
  {id:83, icon:'🐊', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Omanyte',slug:'omanyte',type:'Rock',tc:'#A16207'},
   evolved:{name:'Omastar',slug:'omastar',type:'Rock',tc:'#A16207'},
   wild:{name:'Kabutops',slug:'kabutops',type:'Rock',tc:'#A16207'}},
  {id:84, icon:'⭐', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Jolteon',slug:'jolteon',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'}},
  {id:85, icon:'🌊', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Machop',slug:'machop',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Machoke',slug:'machoke',type:'Fighting',tc:'#EF4444'},
   evolved2:{name:'Machamp',slug:'machamp',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'}},
  {id:86, icon:'💎', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Abra',slug:'abra',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'},
   evolved2:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'}},
  {id:87, icon:'🌟', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Pichu',slug:'pichu',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#FBBF24'},
   evolved2:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Jolteon',slug:'jolteon',type:'Electric',tc:'#FBBF24'}},
  {id:88, icon:'🏆', diff:'legendary', maxNum:20, ops:['+','-','*'],
   player:{name:'Larvitar',slug:'larvitar',type:'Rock',tc:'#A16207'},
   evolved:{name:'Pupitar',slug:'pupitar',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Tyranitar',slug:'tyranitar',type:'Dark',tc:'#4B5563'},
   wild:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'}},

  // === ADDITIONAL EASY (IDs 100-109) ===
  {id:100,icon:'🐦',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Pidgey',slug:'pidgey',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Pidgeotto',slug:'pidgeotto',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Spearow',slug:'spearow',type:'Normal',tc:'#A3A3A3'}},
  {id:101,icon:'🐭',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Rattata',slug:'rattata',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Raticate',slug:'raticate',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'}},
  {id:102,icon:'🔥',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Growlithe',slug:'growlithe',type:'Fire',tc:'#F97316'},
   evolved:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'},
   wild:{name:'Vulpix',slug:'vulpix',type:'Fire',tc:'#F97316'}},
  {id:103,icon:'🌿',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Bellsprout',slug:'bellsprout',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Weepinbell',slug:'weepinbell',type:'Grass',tc:'#22C55E'},
   wild:{name:'Paras',slug:'paras',type:'Bug',tc:'#84CC16'}},
  {id:104,icon:'⭐',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'},
   evolved:{name:'Clefable',slug:'clefable',type:'Fairy',tc:'#FB7185'},
   wild:{name:'Jigglypuff',slug:'jigglypuff',type:'Normal',tc:'#A3A3A3'}},
  {id:105,icon:'🎵',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Jigglypuff',slug:'jigglypuff',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Wigglytuff',slug:'wigglytuff',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'}},
  {id:106,icon:'🐍',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Ekans',slug:'ekans',type:'Poison',tc:'#A855F7'},
   evolved:{name:'Arbok',slug:'arbok',type:'Poison',tc:'#A855F7'},
   wild:{name:'Koffing',slug:'koffing',type:'Poison',tc:'#A855F7'}},
  {id:107,icon:'🦋',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Venonat',slug:'venonat',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Venomoth',slug:'venomoth',type:'Bug',tc:'#84CC16'},
   wild:{name:'Butterfree',slug:'butterfree',type:'Bug',tc:'#84CC16'}},
  {id:108,icon:'🐟',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Goldeen',slug:'goldeen',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Seaking',slug:'seaking',type:'Water',tc:'#38BDF8'},
   wild:{name:'Shellder',slug:'shellder',type:'Water',tc:'#38BDF8'}},
  {id:109,icon:'🏜️',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Sandshrew',slug:'sandshrew',type:'Ground',tc:'#D97706'},
   evolved:{name:'Sandslash',slug:'sandslash',type:'Ground',tc:'#D97706'},
   wild:{name:'Diglett',slug:'diglett',type:'Ground',tc:'#D97706'}},

  // === ADDITIONAL MEDIUM (IDs 110-117) ===
  {id:110,icon:'🐌',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Slowpoke',slug:'slowpoke',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Slowbro',slug:'slowbro',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Golduck',slug:'golduck',type:'Water',tc:'#38BDF8'}},
  {id:111,icon:'🐦',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Doduo',slug:'doduo',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Dodrio',slug:'dodrio',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Fearow',slug:'fearow',type:'Normal',tc:'#A3A3A3'}},
  {id:112,icon:'💥',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Voltorb',slug:'voltorb',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Electrode',slug:'electrode',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Magneton',slug:'magneton',type:'Electric',tc:'#FBBF24'}},
  {id:113,icon:'👻',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Misdreavus',slug:'misdreavus',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Mismagius',slug:'mismagius',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'}},
  {id:114,icon:'🦶',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Mankey',slug:'mankey',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Primeape',slug:'primeape',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Machoke',slug:'machoke',type:'Fighting',tc:'#EF4444'}},
  {id:115,icon:'🧊',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Sneasel',slug:'sneasel',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Weavile',slug:'weavile',type:'Ice',tc:'#BAE6FD'},
   wild:{name:'Dewgong',slug:'dewgong',type:'Ice',tc:'#BAE6FD'}},
  {id:116,icon:'🌿',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Hoppip',slug:'hoppip',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Skiploom',slug:'skiploom',type:'Grass',tc:'#22C55E'},
   wild:{name:'Oddish',slug:'oddish',type:'Grass',tc:'#22C55E'}},
  {id:117,icon:'🦌',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Stantler',slug:'stantler',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Wyrdeer',slug:'wyrdeer',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Tauros',slug:'tauros',type:'Normal',tc:'#A3A3A3'}},

  // === ADDITIONAL HARD (IDs 120-127) ===
  {id:120,icon:'⚡',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Electrike',slug:'electrike',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Manectric',slug:'manectric',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'}},
  {id:121,icon:'🐲',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Swablu',slug:'swablu',type:'Normal',tc:'#BAE6FD'},
   evolved:{name:'Altaria',slug:'altaria',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'}},
  {id:122,icon:'🍄',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Shroomish',slug:'shroomish',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Breloom',slug:'breloom',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Parasect',slug:'parasect',type:'Bug',tc:'#84CC16'}},
  {id:123,icon:'🌊',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Wailmer',slug:'wailmer',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Wailord',slug:'wailord',type:'Water',tc:'#38BDF8'},
   wild:{name:'Lapras',slug:'lapras',type:'Water',tc:'#38BDF8'}},
  {id:124,icon:'🥊',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Meditite',slug:'meditite',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Medicham',slug:'medicham',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Hitmonchan',slug:'hitmonchan',type:'Fighting',tc:'#EF4444'}},
  {id:125,icon:'🐱',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Skitty',slug:'skitty',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Delcatty',slug:'delcatty',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Persian',slug:'persian',type:'Normal',tc:'#A3A3A3'}},
  {id:126,icon:'🧊',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Snorunt',slug:'snorunt',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Glalie',slug:'glalie',type:'Ice',tc:'#BAE6FD'},
   wild:{name:'Piloswine',slug:'piloswine',type:'Ice',tc:'#BAE6FD'}},
  {id:127,icon:'🌿',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Paras',slug:'paras',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Parasect',slug:'parasect',type:'Bug',tc:'#84CC16'},
   wild:{name:'Venomoth',slug:'venomoth',type:'Bug',tc:'#84CC16'}},

  // === ADDITIONAL EPIC (IDs 130-137): 2-stage evolutions ===
  {id:130,icon:'🐲',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Bagon',slug:'bagon',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Shelgon',slug:'shelgon',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Salamence',slug:'salamence',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'}},
  {id:131,icon:'🪨',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Roggenrola',slug:'roggenrola',type:'Rock',tc:'#A16207'},
   evolved:{name:'Boldore',slug:'boldore',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Gigalith',slug:'gigalith',type:'Rock',tc:'#A16207'},
   wild:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'}},
  {id:132,icon:'🕯️',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Litwick',slug:'litwick',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Lampent',slug:'lampent',type:'Ghost',tc:'#7C3AED'},
   evolved2:{name:'Chandelure',slug:'chandelure',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'}},
  {id:133,icon:'🐉',diff:'epic',maxNum:20,ops:['+','-','*'],
   player:{name:'Gible',slug:'gible',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Gabite',slug:'gabite',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Garchomp',slug:'garchomp',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'}},
  {id:134,icon:'💪',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Timburr',slug:'timburr',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Gurdurr',slug:'gurdurr',type:'Fighting',tc:'#EF4444'},
   evolved2:{name:'Conkeldurr',slug:'conkeldurr',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Machamp',slug:'machamp',type:'Fighting',tc:'#EF4444'}},
  {id:135,icon:'⚡',diff:'epic',maxNum:20,ops:['+','-','*'],
   player:{name:'Elekid',slug:'elekid',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Electabuzz',slug:'electabuzz',type:'Electric',tc:'#FBBF24'},
   evolved2:{name:'Electivire',slug:'electivire',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'}},
  {id:136,icon:'🔥',diff:'epic',maxNum:20,ops:['+','-','*'],
   player:{name:'Magby',slug:'magby',type:'Fire',tc:'#F97316'},
   evolved:{name:'Magmar',slug:'magmar',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Magmortar',slug:'magmortar',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:137,icon:'🐊',diff:'epic',maxNum:20,ops:['+','-','*'],
   player:{name:'Sandile',slug:'sandile',type:'Ground',tc:'#D97706'},
   evolved:{name:'Krokorok',slug:'krokorok',type:'Ground',tc:'#D97706'},
   evolved2:{name:'Krookodile',slug:'krookodile',type:'Ground',tc:'#D97706'},
   wild:{name:'Tyranitar',slug:'tyranitar',type:'Dark',tc:'#4B5563'}},

  // === ADDITIONAL LEGENDARY (IDs 140-145) ===
  {id:140,icon:'🦊',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Riolu',slug:'riolu',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Lucario',slug:'lucario',type:'Steel',tc:'#94A3B8'},
   wild:{name:'Machamp',slug:'machamp',type:'Fighting',tc:'#EF4444'}},
  {id:141,icon:'🐉',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Deino',slug:'deino',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Zweilous',slug:'zweilous',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Hydreigon',slug:'hydreigon',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'}},
  {id:142,icon:'🏆',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Trapinch',slug:'trapinch',type:'Ground',tc:'#D97706'},
   evolved:{name:'Vibrava',slug:'vibrava',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Flygon',slug:'flygon',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Garchomp',slug:'garchomp',type:'Dragon',tc:'#6366F1'}},
  {id:143,icon:'🌟',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Axew',slug:'axew',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Fraxure',slug:'fraxure',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Haxorus',slug:'haxorus',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Salamence',slug:'salamence',type:'Dragon',tc:'#6366F1'}},
  {id:144,icon:'💧',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Feebas',slug:'feebas',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Milotic',slug:'milotic',type:'Water',tc:'#38BDF8'},
   wild:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'}},
  {id:145,icon:'🐌',diff:'legendary',maxNum:20,ops:['+','-','*'],
   player:{name:'Goomy',slug:'goomy',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Sliggoo',slug:'sliggoo',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Goodra',slug:'goodra',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#F97316'}},

  // === 2STAGE (levels 18-32): 2-stage evolution, numbers 15-20, addition+subtraction ===
  {id:41,icon:'💪',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Machop',slug:'machop',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Machoke',slug:'machoke',type:'Fighting',tc:'#EF4444'},
   evolved2:{name:'Machamp',slug:'machamp',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Primeape',slug:'primeape',type:'Fighting',tc:'#EF4444'}},
  {id:42,icon:'🔮',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Abra',slug:'abra',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'},
   evolved2:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Slowbro',slug:'slowbro',type:'Psychic',tc:'#EC4899'}},
  {id:43,icon:'🪨',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Geodude',slug:'geodude',type:'Rock',tc:'#A16207'},
   evolved:{name:'Graveler',slug:'graveler',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'},
   wild:{name:'Onix',slug:'onix',type:'Rock',tc:'#A16207'}},
  {id:44,icon:'🌿',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Bellsprout',slug:'bellsprout',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Weepinbell',slug:'weepinbell',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Victreebel',slug:'victreebel',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},
  {id:45,icon:'💜',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Nidoran♀',slug:'nidoran-f',type:'Poison',tc:'#A855F7'},
   evolved:{name:'Nidorina',slug:'nidorina',type:'Poison',tc:'#A855F7'},
   evolved2:{name:'Nidoqueen',slug:'nidoqueen',type:'Poison',tc:'#A855F7'},
   wild:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'}},
  {id:46,icon:'💙',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Nidoran♂',slug:'nidoran-m',type:'Poison',tc:'#A855F7'},
   evolved:{name:'Nidorino',slug:'nidorino',type:'Poison',tc:'#A855F7'},
   evolved2:{name:'Nidoking',slug:'nidoking',type:'Poison',tc:'#A855F7'},
   wild:{name:'Jigglypuff',slug:'jigglypuff',type:'Normal',tc:'#A3A3A3'}},
  {id:47,icon:'⚡',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Pichu',slug:'pichu',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#FBBF24'},
   evolved2:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Voltorb',slug:'voltorb',type:'Electric',tc:'#FBBF24'}},
  {id:48,icon:'⭐',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Cleffa',slug:'cleffa',type:'Fairy',tc:'#FB7185'},
   evolved:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'},
   evolved2:{name:'Clefable',slug:'clefable',type:'Fairy',tc:'#FB7185'},
   wild:{name:'Togetic',slug:'togetic',type:'Fairy',tc:'#FB7185'}},
  {id:49,icon:'🎵',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Igglybuff',slug:'igglybuff',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Jigglypuff',slug:'jigglypuff',type:'Normal',tc:'#A3A3A3'},
   evolved2:{name:'Wigglytuff',slug:'wigglytuff',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Clefairy',slug:'clefairy',type:'Fairy',tc:'#FB7185'}},
  {id:50,icon:'🌱',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Chikorita',slug:'chikorita',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Bayleef',slug:'bayleef',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Meganium',slug:'meganium',type:'Grass',tc:'#22C55E'},
   wild:{name:'Sunflora',slug:'sunflora',type:'Grass',tc:'#22C55E'}},
  {id:57,icon:'🍃',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Hoppip',slug:'hoppip',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Skiploom',slug:'skiploom',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Jumpluff',slug:'jumpluff',type:'Grass',tc:'#22C55E'},
   wild:{name:'Meganium',slug:'meganium',type:'Grass',tc:'#22C55E'}},
  {id:58,icon:'🧊',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Spheal',slug:'spheal',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Sealeo',slug:'sealeo',type:'Ice',tc:'#BAE6FD'},
   evolved2:{name:'Walrein',slug:'walrein',type:'Ice',tc:'#BAE6FD'},
   wild:{name:'Dewgong',slug:'dewgong',type:'Ice',tc:'#BAE6FD'}},
  {id:59,icon:'🐉',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Bagon',slug:'bagon',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Shelgon',slug:'shelgon',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Salamence',slug:'salamence',type:'Dragon',tc:'#6366F1'},
   wild:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'}},
  {id:60,icon:'⚙️',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Aron',slug:'aron',type:'Steel',tc:'#94A3B8'},
   evolved:{name:'Lairon',slug:'lairon',type:'Steel',tc:'#94A3B8'},
   evolved2:{name:'Aggron',slug:'aggron',type:'Steel',tc:'#94A3B8'},
   wild:{name:'Steelix',slug:'steelix',type:'Steel',tc:'#94A3B8'}},
  {id:72,icon:'😴',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Slakoth',slug:'slakoth',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Vigoroth',slug:'vigoroth',type:'Normal',tc:'#A3A3A3'},
   evolved2:{name:'Slaking',slug:'slaking',type:'Normal',tc:'#A3A3A3'},
   wild:{name:'Kangaskhan',slug:'kangaskhan',type:'Normal',tc:'#A3A3A3'}},

  // === NEW: Missing Pokemon chains (user requested) ===
  // Froakie → Frogadier → Greninja (Water/Dark) — 3-stage
  {id:200,icon:'🐸',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Froakie',slug:'froakie',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Frogadier',slug:'frogadier',type:'Water',tc:'#38BDF8'},
   wild:{name:'Psyduck',slug:'psyduck',type:'Water',tc:'#38BDF8'}},
  {id:201,icon:'🐸',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Froakie',slug:'froakie',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Frogadier',slug:'frogadier',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Greninja',slug:'greninja',type:'Dark',tc:'#4B5563'},
   wild:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'}},

  // Taillow → Swellow (Flying) — 2-stage
  {id:202,icon:'🐦',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Taillow',slug:'taillow',type:'Flying',tc:'#A78BFA'},
   evolved:{name:'Swellow',slug:'swellow',type:'Flying',tc:'#A78BFA'},
   wild:{name:'Pidgeotto',slug:'pidgeotto',type:'Normal',tc:'#A3A3A3'}},

  // Gastly → Haunter → Gengar (Ghost) — 3-stage
  {id:203,icon:'👻',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Gastly',slug:'gastly',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'},
   evolved2:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'},
   wild:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'}},

  // Torchic → Combusken → Blaziken (Fire/Fighting) — 3-stage
  {id:204,icon:'🔥',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Torchic',slug:'torchic',type:'Fire',tc:'#F97316'},
   evolved:{name:'Combusken',slug:'combusken',type:'Fire',tc:'#F97316'},
   wild:{name:'Arcanine',slug:'arcanine',type:'Fire',tc:'#F97316'}},
  {id:205,icon:'🔥',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Torchic',slug:'torchic',type:'Fire',tc:'#F97316'},
   evolved:{name:'Combusken',slug:'combusken',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Blaziken',slug:'blaziken',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'}},

  // Fennekin → Braixen → Delphox (Fire/Psychic) — 3-stage
  {id:206,icon:'🦊',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Fennekin',slug:'fennekin',type:'Fire',tc:'#F97316'},
   evolved:{name:'Braixen',slug:'braixen',type:'Fire',tc:'#F97316'},
   wild:{name:'Ninetales',slug:'ninetales',type:'Fire',tc:'#F97316'}},
  {id:207,icon:'🦊',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Fennekin',slug:'fennekin',type:'Fire',tc:'#F97316'},
   evolved:{name:'Braixen',slug:'braixen',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Delphox',slug:'delphox',type:'Psychic',tc:'#EC4899'},
   wild:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'}},

  // Chespin → Quilladin → Chesnaught (Grass/Fighting) — 3-stage
  {id:208,icon:'🌿',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Chespin',slug:'chespin',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Quilladin',slug:'quilladin',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Chesnaught',slug:'chesnaught',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'}},

  // Piplup → Prinplup → Empoleon (Water/Steel) — 3-stage
  {id:209,icon:'🐧',diff:'medium',maxNum:20,ops:['+','-'],
   player:{name:'Piplup',slug:'piplup',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Prinplup',slug:'prinplup',type:'Water',tc:'#38BDF8'},
   wild:{name:'Golduck',slug:'golduck',type:'Water',tc:'#38BDF8'}},
  {id:210,icon:'🐧',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Piplup',slug:'piplup',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Prinplup',slug:'prinplup',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Empoleon',slug:'empoleon',type:'Steel',tc:'#94A3B8'},
   wild:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'}},

  // Turtwig → Grotle → Torterra (Grass/Ground) — 3-stage
  {id:211,icon:'🐢',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Turtwig',slug:'turtwig',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Grotle',slug:'grotle',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Torterra',slug:'torterra',type:'Ground',tc:'#D97706'},
   wild:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'}},

  // Chimchar → Monferno → Infernape (Fire/Fighting) — 3-stage
  {id:212,icon:'🐒',diff:'epic',maxNum:20,ops:['+','-'],
   player:{name:'Chimchar',slug:'chimchar',type:'Fire',tc:'#F97316'},
   evolved:{name:'Monferno',slug:'monferno',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Infernape',slug:'infernape',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Blaziken',slug:'blaziken',type:'Fighting',tc:'#EF4444'}},

  // Snivy → Servine → Serperior (Grass) — 3-stage
  {id:213,icon:'🐍',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Snivy',slug:'snivy',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Servine',slug:'servine',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Serperior',slug:'serperior',type:'Grass',tc:'#22C55E'},
   wild:{name:'Exeggutor',slug:'exeggutor',type:'Grass',tc:'#22C55E'}},

  // Oshawott → Dewott → Samurott (Water) — 3-stage
  {id:214,icon:'🦦',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Oshawott',slug:'oshawott',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Dewott',slug:'dewott',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Samurott',slug:'samurott',type:'Water',tc:'#38BDF8'},
   wild:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'}},

  // Tepig → Pignite → Emboar (Fire/Fighting) — 3-stage
  {id:215,icon:'🐷',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Tepig',slug:'tepig',type:'Fire',tc:'#F97316'},
   evolved:{name:'Pignite',slug:'pignite',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Emboar',slug:'emboar',type:'Fighting',tc:'#EF4444'},
   wild:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'}},

  // Pidgey → Pidgeotto → Pidgeot (Normal/Flying) — 3-stage
  {id:216,icon:'🐦',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Pidgey',slug:'pidgey',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Pidgeotto',slug:'pidgeotto',type:'Flying',tc:'#A78BFA'},
   evolved2:{name:'Pidgeot',slug:'pidgeot',type:'Flying',tc:'#A78BFA'},
   wild:{name:'Swellow',slug:'swellow',type:'Flying',tc:'#A78BFA'}},

  // Caterpie → Metapod → Butterfree (Bug/Flying) — 3-stage
  {id:217,icon:'🐛',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Caterpie',slug:'caterpie',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Metapod',slug:'metapod',type:'Bug',tc:'#84CC16'},
   evolved2:{name:'Butterfree',slug:'butterfree',type:'Bug',tc:'#84CC16'},
   wild:{name:'Venomoth',slug:'venomoth',type:'Bug',tc:'#84CC16'}},

  // Weedle → Kakuna → Beedrill (Bug/Poison) — 3-stage
  {id:218,icon:'🐝',diff:'easy',maxNum:10,ops:['+'],
   player:{name:'Weedle',slug:'weedle',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Kakuna',slug:'kakuna',type:'Bug',tc:'#84CC16'},
   evolved2:{name:'Beedrill',slug:'beedrill',type:'Bug',tc:'#84CC16'},
   wild:{name:'Butterfree',slug:'butterfree',type:'Bug',tc:'#84CC16'}},

  // Nidoran♂ → Nidorino → Nidoking (Poison/Ground) — 3-stage
  {id:219,icon:'🦏',diff:'hard',maxNum:20,ops:['+','-'],
   player:{name:'Nidoran♂',slug:'nidoran-m',type:'Poison',tc:'#A855F7'},
   evolved:{name:'Nidorino',slug:'nidorino',type:'Poison',tc:'#A855F7'},
   evolved2:{name:'Nidoking',slug:'nidoking',type:'Ground',tc:'#D97706'},
   wild:{name:'Rhydon',slug:'rhydon',type:'Rock',tc:'#A16207'}},

  // Geodude → Graveler → Golem (Rock/Ground) — 3-stage
  {id:220,icon:'🪨',diff:'2stage',maxNum:20,ops:['+','-'],
   player:{name:'Geodude',slug:'geodude',type:'Rock',tc:'#A16207'},
   evolved:{name:'Graveler',slug:'graveler',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'},
   wild:{name:'Rhydon',slug:'rhydon',type:'Rock',tc:'#A16207'}},
]

// HP config by difficulty
// Task #67 (2026-04-25): added `stages` flag for 1|2|3-stage evolution support.
// stages=1: player→evolved only (early levels)
// stages=2: player→evolved→evolved2 (mid levels)
// stages=3: player→evolved→evolved2→mega (late levels — MEGA EVOLUTION)
const G13_DIFF = {
  easy:      { playerHp:5, wildHp:8,  attacksToEvo:3, damage:1, wildDamage:1, stages:1 },
  medium:    { playerHp:6, wildHp:10, attacksToEvo:4, damage:1, wildDamage:1, stages:1 },
  hard:      { playerHp:7, wildHp:12, attacksToEvo:5, damage:1, wildDamage:1, stages:2 },
  '2stage':  { playerHp:7, wildHp:13, attacksToEvo:5, damage:1, wildDamage:1, stages:2 },
  epic:      { playerHp:8, wildHp:18, attacksToEvo:4, damage:1, wildDamage:1, stages:2 },
  '3stage':  { playerHp:8, wildHp:24, attacksToEvo:5, damage:1, wildDamage:1, stages:3 },
  legendary: { playerHp:9, wildHp:30, attacksToEvo:5, damage:1, wildDamage:1, stages:3 },
}

// Type color map for badge
const G13_TYPE_COLORS = {
  Fire:'#F97316', Water:'#38BDF8', Grass:'#22C55E', Electric:'#FBBF24',
  Psychic:'#EC4899', Ghost:'#7C3AED', Poison:'#A855F7', Fighting:'#EF4444',
  Rock:'#A16207', Ground:'#D97706', Bug:'#84CC16', Normal:'#A3A3A3',
  Dragon:'#6366F1', Ice:'#BAE6FD', Fairy:'#FB7185', Steel:'#94A3B8',
}

let g13State = {}
let g13ResultTimeout = null

// ════════════════════════════════════════════════════════════════════
// G13 FAMILIES — curated evolution chain selector
// Built 2026-04-24 (16 chains), expanded 2026-04-25 to 44 chains (Task #67)
// 17 popular + 21 Ash + 5 cool + 1 random = 44 options
// 3-stage support: families with `mega` field show Mega/Gmax/special-form at 3stage+legendary tiers
// Sprite strategy: stage 0/1/2 use unique local WebP; stage 3 (mega) reuses stage 2 sprite + visual aura overlay
// ════════════════════════════════════════════════════════════════════

// Task #67: synthetic MAX FORM for chains without canonical Mega/Gmax/special form.
// Reuses stage 2 sprite + gold aura + "MAX FORM" badge so all 3-stage tiers feel equally rewarding.
function synthMaxBoostForm(stage) {
  if (!stage) return null
  return {
    name: 'MAX ' + stage.name,
    slug: stage.slug,
    type: stage.type,
    tc: stage.tc,
    form: 'max-boost',
    aura: 'gold',
    badge: '✨ MAX FORM',
  }
}

// Task #67: Mega/Gmax/Ash-form visual overlay — sprite sama, hanya aura + badge + scale.
// Tidak butuh sprite Mega lokal; gradien CSS + animasi keyframe membuat efek dramatic.
function applyMegaOverlay(pspr, megaForm) {
  if (!pspr || !megaForm) return
  // Apply aura class (rotating glow ring)
  pspr.classList.add('poke-mega-aura', 'aura-' + (megaForm.aura || 'gold'))
  // Floating badge above sprite
  try {
    const wrap = pspr.parentElement
    if (wrap) {
      let badge = wrap.querySelector('.poke-mega-badge')
      if (!badge) {
        badge = document.createElement('div')
        badge.className = 'poke-mega-badge aura-' + (megaForm.aura || 'gold')
        wrap.appendChild(badge)
      } else {
        badge.className = 'poke-mega-badge aura-' + (megaForm.aura || 'gold')
      }
      badge.textContent = megaForm.badge || '⭐ MEGA'
      // Animate-in
      badge.style.animation = 'none'; void badge.offsetWidth
      badge.style.animation = 'megaBadgeBounce 0.5s cubic-bezier(0.34,1.56,0.64,1)'
    }
  } catch(_) {}
}

function clearMegaOverlay(pspr) {
  if (!pspr) return
  pspr.classList.remove('poke-mega-aura', 'aura-gold', 'aura-blue', 'aura-red', 'aura-rainbow')
  try {
    const wrap = pspr.parentElement
    const badge = wrap && wrap.querySelector('.poke-mega-badge')
    if (badge) badge.remove()
  } catch(_) {}
}

// Mega/Gmax/Ash-form helper (Task #67) — sprite reuses stage 2; visual aura overlay only
const _mega = (name, baseSlug, type, tc, form, aura, badge) => ({name, slug: baseSlug, type, tc, form, aura, badge})

const G13_FAMILIES = [
  // ══════════════════════════════════════════════════════════════════
  // ⭐ POPULER (17) — kid-iconic 3-stage chains, generic versions
  // ══════════════════════════════════════════════════════════════════
  {id:'bulbasaur-line', label:'Bulbasaur', series:'Kanto Grass Starter', category:'popular', color:'#22C55E', icon:'🌿',
   player:{name:'Bulbasaur',slug:'bulbasaur',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Ivysaur',slug:'ivysaur',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#22C55E'},
   mega:_mega('Mega Venusaur','venusaur','Grass','#16A34A','mega','rainbow','⭐ MEGA'),
   wild:{name:'Oddish',slug:'oddish',type:'Grass',tc:'#22C55E'}},
  {id:'charmander-line', label:'Charmander', series:'Kanto Fire Starter', category:'popular', color:'#F97316', icon:'🔥',
   player:{name:'Charmander',slug:'charmander',type:'Fire',tc:'#F97316'},
   evolved:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'},
   mega:_mega('Mega Charizard Y','charizard','Fire','#EAB308','mega-y','gold','⭐ MEGA Y'),
   wild:{name:'Growlithe',slug:'growlithe',type:'Fire',tc:'#F97316'}},
  {id:'squirtle-line', label:'Squirtle', series:'Kanto Water Starter', category:'popular', color:'#38BDF8', icon:'💧',
   player:{name:'Squirtle',slug:'squirtle',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Wartortle',slug:'wartortle',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#38BDF8'},
   mega:_mega('Mega Blastoise','blastoise','Water','#0EA5E9','mega','blue','⭐ MEGA'),
   wild:{name:'Psyduck',slug:'psyduck',type:'Water',tc:'#38BDF8'}},
  {id:'pichu-line', label:'Pichu', series:'Electric Mouse Line', category:'popular', color:'#FBBF24', icon:'⚡',
   player:{name:'Pichu',slug:'pichu',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#FBBF24'},
   evolved2:{name:'Raichu',slug:'raichu',type:'Electric',tc:'#FBBF24'},
   wild:{name:'Magnemite',slug:'magnemite',type:'Electric',tc:'#FBBF24'}},
  {id:'caterpie-line', label:'Caterpie', series:'Butterfly Bug', category:'popular', color:'#84CC16', icon:'🦋',
   player:{name:'Caterpie',slug:'caterpie',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Metapod',slug:'metapod',type:'Bug',tc:'#84CC16'},
   evolved2:{name:'Butterfree',slug:'butterfree',type:'Bug',tc:'#84CC16'},
   mega:_mega('Gmax Butterfree','butterfree','Bug','#65A30D','gmax','red','🌟 G-MAX'),
   wild:{name:'Weedle',slug:'weedle',type:'Bug',tc:'#84CC16'}},
  {id:'abra-line', label:'Abra', series:'Psychic Legend', category:'popular', color:'#EC4899', icon:'🔮',
   player:{name:'Abra',slug:'abra',type:'Psychic',tc:'#EC4899'},
   evolved:{name:'Kadabra',slug:'kadabra',type:'Psychic',tc:'#EC4899'},
   evolved2:{name:'Alakazam',slug:'alakazam',type:'Psychic',tc:'#EC4899'},
   mega:_mega('Mega Alakazam','alakazam','Psychic','#DB2777','mega','rainbow','⭐ MEGA'),
   wild:{name:'Drowzee',slug:'drowzee',type:'Psychic',tc:'#EC4899'}},
  {id:'gastly-line', label:'Gastly', series:'Ghost Trio', category:'popular', color:'#7C3AED', icon:'👻',
   player:{name:'Gastly',slug:'gastly',type:'Ghost',tc:'#7C3AED'},
   evolved:{name:'Haunter',slug:'haunter',type:'Ghost',tc:'#7C3AED'},
   evolved2:{name:'Gengar',slug:'gengar',type:'Ghost',tc:'#7C3AED'},
   mega:_mega('Mega Gengar','gengar','Ghost','#6D28D9','mega','rainbow','⭐ MEGA'),
   wild:{name:'Misdreavus',slug:'misdreavus',type:'Ghost',tc:'#7C3AED'}},
  {id:'machop-line', label:'Machop', series:'Fighting Brawler', category:'popular', color:'#EF4444', icon:'💪',
   player:{name:'Machop',slug:'machop',type:'Fighting',tc:'#EF4444'},
   evolved:{name:'Machoke',slug:'machoke',type:'Fighting',tc:'#EF4444'},
   evolved2:{name:'Machamp',slug:'machamp',type:'Fighting',tc:'#EF4444'},
   mega:_mega('Gmax Machamp','machamp','Fighting','#DC2626','gmax','red','🌟 G-MAX'),
   wild:{name:'Mankey',slug:'mankey',type:'Fighting',tc:'#EF4444'}},
  {id:'geodude-line', label:'Geodude', series:'Rock Heavyweight', category:'popular', color:'#A16207', icon:'🪨',
   player:{name:'Geodude',slug:'geodude',type:'Rock',tc:'#A16207'},
   evolved:{name:'Graveler',slug:'graveler',type:'Rock',tc:'#A16207'},
   evolved2:{name:'Golem',slug:'golem',type:'Rock',tc:'#A16207'},
   wild:{name:'Onix',slug:'onix',type:'Rock',tc:'#A16207'}},
  {id:'eevee-vaporeon', label:'Eevee → Vaporeon', series:'Eeveelution Water', category:'popular', color:'#38BDF8', icon:'🌊',
   player:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Vaporeon',slug:'vaporeon',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Vaporeon',slug:'vaporeon',type:'Water',tc:'#0EA5E9'},
   wild:{name:'Flareon',slug:'flareon',type:'Fire',tc:'#F97316'}},
  {id:'eevee-espeon', label:'Eevee → Espeon', series:'Eeveelution Psychic', category:'popular', color:'#EC4899', icon:'✨',
   player:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Espeon',slug:'espeon',type:'Psychic',tc:'#EC4899'},
   evolved2:{name:'Espeon',slug:'espeon',type:'Psychic',tc:'#DB2777'},
   wild:{name:'Umbreon',slug:'umbreon',type:'Dark',tc:'#4B5563'}},
  {id:'eevee-sylveon', label:'Eevee → Sylveon', series:'Eeveelution Fairy', category:'popular', color:'#FB7185', icon:'🎀',
   player:{name:'Eevee',slug:'eevee',type:'Normal',tc:'#A3A3A3'},
   evolved:{name:'Sylveon',slug:'sylveon',type:'Fairy',tc:'#FB7185'},
   evolved2:{name:'Sylveon',slug:'sylveon',type:'Fairy',tc:'#F472B6'},
   wild:{name:'Glaceon',slug:'glaceon',type:'Ice',tc:'#BAE6FD'}},
  {id:'mudkip-line', label:'Mudkip', series:'Hoenn Water Starter', category:'popular', color:'#06B6D4', icon:'💦',
   player:{name:'Mudkip',slug:'mudkip',type:'Water',tc:'#06B6D4'},
   evolved:{name:'Marshtomp',slug:'marshtomp',type:'Water',tc:'#06B6D4'},
   evolved2:{name:'Swampert',slug:'swampert',type:'Water',tc:'#0891B2'},
   mega:_mega('Mega Swampert','swampert','Water','#155E75','mega','blue','⭐ MEGA'),
   wild:{name:'Lotad',slug:'lotad',type:'Water',tc:'#65A30D'}},
  {id:'snivy-line', label:'Snivy', series:'Unova Grass Starter', category:'popular', color:'#65A30D', icon:'🌱',
   player:{name:'Snivy',slug:'snivy',type:'Grass',tc:'#65A30D'},
   evolved:{name:'Servine',slug:'servine',type:'Grass',tc:'#65A30D'},
   evolved2:{name:'Serperior',slug:'serperior',type:'Grass',tc:'#15803D'},
   wild:{name:'Tepig',slug:'tepig',type:'Fire',tc:'#F97316'}},
  {id:'fennekin-line', label:'Fennekin', series:'Kalos Fire Starter', category:'popular', color:'#F59E0B', icon:'🦊',
   player:{name:'Fennekin',slug:'fennekin',type:'Fire',tc:'#F59E0B'},
   evolved:{name:'Braixen',slug:'braixen',type:'Fire',tc:'#F59E0B'},
   evolved2:{name:'Delphox',slug:'delphox',type:'Fire',tc:'#D97706'},
   wild:{name:'Vulpix',slug:'vulpix',type:'Fire',tc:'#F97316'}},
  {id:'sobble-line', label:'Sobble', series:'Galar Water Starter', category:'popular', color:'#0EA5E9', icon:'💧',
   player:{name:'Sobble',slug:'sobble',type:'Water',tc:'#0EA5E9'},
   evolved:{name:'Drizzile',slug:'drizzile',type:'Water',tc:'#0EA5E9'},
   evolved2:{name:'Inteleon',slug:'inteleon',type:'Water',tc:'#0284C7'},
   mega:_mega('Gmax Inteleon','inteleon','Water','#0369A1','gmax','blue','🌟 G-MAX'),
   wild:{name:'Magikarp',slug:'magikarp',type:'Water',tc:'#EF4444'}},
  {id:'munchlax-line', label:'Munchlax', series:'Big Eater', category:'popular', color:'#A78BFA', icon:'🍙',
   player:{name:'Munchlax',slug:'munchlax',type:'Normal',tc:'#A78BFA'},
   evolved:{name:'Snorlax',slug:'snorlax',type:'Normal',tc:'#7C3AED'},
   evolved2:{name:'Snorlax',slug:'snorlax',type:'Normal',tc:'#6D28D9'},
   mega:_mega('Gmax Snorlax','snorlax','Normal','#581C87','gmax','rainbow','🌟 G-MAX'),
   wild:{name:'Slakoth',slug:'slakoth',type:'Normal',tc:'#A3A3A3'}},

  // ══════════════════════════════════════════════════════════════════
  // 🎒 ASH (21) — Ash Ketchum's signature roster across all regions
  // ══════════════════════════════════════════════════════════════════
  {id:'ash-pikachu', label:'Pikachu (Ash)', series:'Ash\'s Partner — Kanto', category:'ash', color:'#FBBF24', icon:'⚡',
   player:{name:'Pichu',slug:'pichu',type:'Electric',tc:'#FBBF24'},
   evolved:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#FBBF24'},
   evolved2:{name:'Pikachu',slug:'pikachu',type:'Electric',tc:'#EAB308'},
   mega:_mega('Gmax Pikachu','pikachu','Electric','#DC2626','gmax','red','🌟 G-MAX'),
   wild:{name:'Spearow',slug:'spearow',type:'Flying',tc:'#A3A3A3'}},
  {id:'ash-charizard', label:'Charizard (Ash)', series:'Ash\'s Charizard — Kanto', category:'ash', color:'#F97316', icon:'🔥',
   player:{name:'Charmander',slug:'charmander',type:'Fire',tc:'#F97316'},
   evolved:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#EA580C'},
   mega:_mega('Mega Charizard X','charizard','Fire','#3B82F6','mega-x','blue','⭐ MEGA X'),
   wild:{name:'Damian-Charmander',slug:'charmander',type:'Fire',tc:'#A3A3A3'}},
  {id:'ash-bulbasaur', label:'Bulbasaur (Ash)', series:'Ash\'s Bulbasaur — Kanto', category:'ash', color:'#22C55E', icon:'🌿',
   player:{name:'Bulbasaur',slug:'bulbasaur',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Ivysaur',slug:'ivysaur',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Venusaur',slug:'venusaur',type:'Grass',tc:'#16A34A'},
   mega:_mega('Mega Venusaur','venusaur','Grass','#15803D','mega','rainbow','⭐ MEGA'),
   wild:{name:'Oddish',slug:'oddish',type:'Grass',tc:'#65A30D'}},
  {id:'ash-squirtle', label:'Squirtle (Ash)', series:'Ash\'s Squirtle Squad — Kanto', category:'ash', color:'#38BDF8', icon:'🐢',
   player:{name:'Squirtle',slug:'squirtle',type:'Water',tc:'#38BDF8'},
   evolved:{name:'Wartortle',slug:'wartortle',type:'Water',tc:'#38BDF8'},
   evolved2:{name:'Blastoise',slug:'blastoise',type:'Water',tc:'#0EA5E9'},
   mega:_mega('Mega Blastoise','blastoise','Water','#0284C7','mega','blue','⭐ MEGA'),
   wild:{name:'Krabby',slug:'krabby',type:'Water',tc:'#EF4444'}},
  {id:'ash-butterfree', label:'Butterfree (Ash)', series:'Caterpie → Butterfree', category:'ash', color:'#84CC16', icon:'🦋',
   player:{name:'Caterpie',slug:'caterpie',type:'Bug',tc:'#84CC16'},
   evolved:{name:'Metapod',slug:'metapod',type:'Bug',tc:'#84CC16'},
   evolved2:{name:'Butterfree',slug:'butterfree',type:'Bug',tc:'#65A30D'},
   mega:_mega('Gmax Butterfree','butterfree','Bug','#15803D','gmax','rainbow','🌟 G-MAX'),
   wild:{name:'Weedle',slug:'weedle',type:'Bug',tc:'#A3A3A3'}},
  {id:'ash-pidgeot', label:'Pidgeot (Ash)', series:'Pidgey → Pidgeot — Kanto', category:'ash', color:'#A78BFA', icon:'🦅',
   player:{name:'Pidgey',slug:'pidgey',type:'Flying',tc:'#A78BFA'},
   evolved:{name:'Pidgeotto',slug:'pidgeotto',type:'Flying',tc:'#A78BFA'},
   evolved2:{name:'Pidgeot',slug:'pidgeot',type:'Flying',tc:'#7C3AED'},
   mega:_mega('Mega Pidgeot','pidgeot','Flying','#6D28D9','mega','rainbow','⭐ MEGA'),
   wild:{name:'Spearow',slug:'spearow',type:'Flying',tc:'#A3A3A3'}},
  {id:'ash-snorlax', label:'Snorlax (Ash)', series:'Munchlax → Snorlax', category:'ash', color:'#A78BFA', icon:'😴',
   player:{name:'Munchlax',slug:'munchlax',type:'Normal',tc:'#A78BFA'},
   evolved:{name:'Snorlax',slug:'snorlax',type:'Normal',tc:'#7C3AED'},
   evolved2:{name:'Snorlax',slug:'snorlax',type:'Normal',tc:'#6D28D9'},
   mega:_mega('Gmax Snorlax','snorlax','Normal','#581C87','gmax','rainbow','🌟 G-MAX'),
   wild:{name:'Lickitung',slug:'lickitung',type:'Normal',tc:'#FB7185'}},
  {id:'ash-heracross', label:'Heracross (Ash)', series:'Johto Bug Power', category:'ash', color:'#1E40AF', icon:'🐞',
   player:{name:'Heracross',slug:'heracross',type:'Bug',tc:'#1E40AF'},
   evolved:{name:'Heracross',slug:'heracross',type:'Bug',tc:'#1E40AF'},
   evolved2:{name:'Heracross',slug:'heracross',type:'Bug',tc:'#1E3A8A'},
   mega:_mega('Mega Heracross','heracross','Bug','#172554','mega','rainbow','⭐ MEGA'),
   wild:{name:'Pinsir',slug:'pinsir',type:'Bug',tc:'#A16207'}},
  {id:'ash-meganium', label:'Meganium (Ash)', series:'Chikorita → Meganium', category:'ash', color:'#22C55E', icon:'🌷',
   player:{name:'Chikorita',slug:'chikorita',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Bayleef',slug:'bayleef',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Meganium',slug:'meganium',type:'Grass',tc:'#16A34A'},
   wild:{name:'Sunkern',slug:'sunkern',type:'Grass',tc:'#FBBF24'}},
  {id:'ash-sceptile', label:'Sceptile (Ash)', series:'Treecko → Sceptile — Hoenn', category:'ash', color:'#22C55E', icon:'🦎',
   player:{name:'Treecko',slug:'treecko',type:'Grass',tc:'#22C55E'},
   evolved:{name:'Grovyle',slug:'grovyle',type:'Grass',tc:'#22C55E'},
   evolved2:{name:'Sceptile',slug:'sceptile',type:'Grass',tc:'#15803D'},
   mega:_mega('Mega Sceptile','sceptile','Grass','#14532D','mega','rainbow','⭐ MEGA'),
   wild:{name:'Seedot',slug:'seedot',type:'Grass',tc:'#A16207'}},
  {id:'ash-glalie', label:'Glalie (Ash)', series:'Snorunt → Glalie — Hoenn', category:'ash', color:'#BAE6FD', icon:'❄️',
   player:{name:'Snorunt',slug:'snorunt',type:'Ice',tc:'#BAE6FD'},
   evolved:{name:'Glalie',slug:'glalie',type:'Ice',tc:'#0EA5E9'},
   evolved2:{name:'Glalie',slug:'glalie',type:'Ice',tc:'#0284C7'},
   mega:_mega('Mega Glalie','glalie','Ice','#0369A1','mega','blue','⭐ MEGA'),
   wild:{name:'Spheal',slug:'spheal',type:'Ice',tc:'#A78BFA'}},
  {id:'ash-infernape', label:'Infernape (Ash)', series:'Chimchar → Infernape — Sinnoh', category:'ash', color:'#EF4444', icon:'🐒',
   player:{name:'Chimchar',slug:'chimchar',type:'Fire',tc:'#F97316'},
   evolved:{name:'Monferno',slug:'monferno',type:'Fire',tc:'#EA580C'},
   evolved2:{name:'Infernape',slug:'infernape',type:'Fire',tc:'#DC2626'},
   wild:{name:'Buizel',slug:'buizel',type:'Water',tc:'#FB923C'}},
  {id:'ash-staraptor', label:'Staraptor (Ash)', series:'Starly → Staraptor — Sinnoh', category:'ash', color:'#A78BFA', icon:'🦅',
   player:{name:'Starly',slug:'starly',type:'Flying',tc:'#A78BFA'},
   evolved:{name:'Staravia',slug:'staravia',type:'Flying',tc:'#7C3AED'},
   evolved2:{name:'Staraptor',slug:'staraptor',type:'Flying',tc:'#6D28D9'},
   wild:{name:'Bidoof',slug:'bidoof',type:'Normal',tc:'#A16207'}},
  {id:'ash-garchomp', label:'Garchomp (Ash)', series:'Gible → Garchomp — Sinnoh/JN', category:'ash', color:'#1E40AF', icon:'🦈',
   player:{name:'Gible',slug:'gible',type:'Dragon',tc:'#1E40AF'},
   evolved:{name:'Gabite',slug:'gabite',type:'Dragon',tc:'#1E40AF'},
   evolved2:{name:'Garchomp',slug:'garchomp',type:'Dragon',tc:'#1E3A8A'},
   mega:_mega('Mega Garchomp','garchomp','Dragon','#172554','mega','rainbow','⭐ MEGA'),
   wild:{name:'Carnivine',slug:'carnivine',type:'Grass',tc:'#65A30D'}},
  {id:'ash-pignite', label:'Pignite (Ash)', series:'Tepig → Emboar — Unova', category:'ash', color:'#F97316', icon:'🐗',
   player:{name:'Tepig',slug:'tepig',type:'Fire',tc:'#F97316'},
   evolved:{name:'Pignite',slug:'pignite',type:'Fire',tc:'#EA580C'},
   evolved2:{name:'Emboar',slug:'emboar',type:'Fire',tc:'#DC2626'},
   wild:{name:'Oshawott',slug:'oshawott',type:'Water',tc:'#0EA5E9'}},
  {id:'ash-krookodile', label:'Krookodile (Ash)', series:'Sandile → Krookodile — Unova', category:'ash', color:'#A16207', icon:'🐊',
   player:{name:'Sandile',slug:'sandile',type:'Ground',tc:'#A16207'},
   evolved:{name:'Krokorok',slug:'krokorok',type:'Ground',tc:'#A16207'},
   evolved2:{name:'Krookodile',slug:'krookodile',type:'Ground',tc:'#78350F'},
   wild:{name:'Scraggy',slug:'scraggy',type:'Dark',tc:'#FBBF24'}},
  {id:'ash-greninja', label:'Greninja (Ash)', series:'Froakie → Ash-Greninja — Kalos', category:'ash', color:'#0EA5E9', icon:'🥷',
   player:{name:'Froakie',slug:'froakie',type:'Water',tc:'#0EA5E9'},
   evolved:{name:'Frogadier',slug:'frogadier',type:'Water',tc:'#0EA5E9'},
   evolved2:{name:'Greninja',slug:'greninja',type:'Water',tc:'#0284C7'},
   mega:_mega('Ash-Greninja','greninja','Water','#1E3A8A','ash-form','blue','💧 ASH-FORM'),
   wild:{name:'Bunnelby',slug:'bunnelby',type:'Normal',tc:'#A78BFA'}},
  {id:'ash-talonflame', label:'Talonflame (Ash)', series:'Fletchling → Talonflame — Kalos', category:'ash', color:'#EF4444', icon:'🔥',
   player:{name:'Fletchling',slug:'fletchling',type:'Flying',tc:'#EF4444'},
   evolved:{name:'Fletchinder',slug:'fletchinder',type:'Fire',tc:'#F97316'},
   evolved2:{name:'Talonflame',slug:'talonflame',type:'Fire',tc:'#DC2626'},
   wild:{name:'Pancham',slug:'pancham',type:'Fighting',tc:'#A3A3A3'}},
  {id:'ash-incineroar', label:'Incineroar (Ash)', series:'Litten → Incineroar — Alola', category:'ash', color:'#EF4444', icon:'🐅',
   player:{name:'Litten',slug:'litten',type:'Fire',tc:'#EF4444'},
   evolved:{name:'Torracat',slug:'torracat',type:'Fire',tc:'#EF4444'},
   evolved2:{name:'Incineroar',slug:'incineroar',type:'Fire',tc:'#B91C1C'},
   wild:{name:'Rowlet',slug:'rowlet',type:'Grass',tc:'#84CC16'}},
  {id:'ash-lucario', label:'Lucario (Ash)', series:'Riolu → Lucario — JN', category:'ash', color:'#3B82F6', icon:'🥋',
   player:{name:'Riolu',slug:'riolu',type:'Fighting',tc:'#3B82F6'},
   evolved:{name:'Lucario',slug:'lucario',type:'Fighting',tc:'#1E40AF'},
   evolved2:{name:'Lucario',slug:'lucario',type:'Fighting',tc:'#1E3A8A'},
   mega:_mega('Mega Lucario','lucario','Fighting','#172554','mega','blue','⭐ MEGA'),
   wild:{name:'Mienfoo',slug:'mienfoo',type:'Fighting',tc:'#FBBF24'}},
  {id:'ash-dragonite', label:'Dragonite (Ash)', series:'Dratini → Dragonite — JN', category:'ash', color:'#F97316', icon:'🐉',
   player:{name:'Dratini',slug:'dratini',type:'Dragon',tc:'#F97316'},
   evolved:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#F97316'},
   evolved2:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#EA580C'},
   wild:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#EF4444'}},

  // ══════════════════════════════════════════════════════════════════
  // 💎 KEREN (5) — pseudo-legendary 3-stage chains
  // ══════════════════════════════════════════════════════════════════
  {id:'dratini-line', label:'Dratini', series:'Dragon of Legends', category:'cool', color:'#6366F1', icon:'🐉',
   player:{name:'Dratini',slug:'dratini',type:'Dragon',tc:'#6366F1'},
   evolved:{name:'Dragonair',slug:'dragonair',type:'Dragon',tc:'#6366F1'},
   evolved2:{name:'Dragonite',slug:'dragonite',type:'Dragon',tc:'#4338CA'},
   wild:{name:'Gyarados',slug:'gyarados',type:'Water',tc:'#38BDF8'}},
  {id:'larvitar-line', label:'Larvitar', series:'Pseudo-Legend Rock', category:'cool', color:'#166534', icon:'🪨',
   player:{name:'Larvitar',slug:'larvitar',type:'Rock',tc:'#166534'},
   evolved:{name:'Pupitar',slug:'pupitar',type:'Rock',tc:'#166534'},
   evolved2:{name:'Tyranitar',slug:'tyranitar',type:'Rock',tc:'#14532D'},
   mega:_mega('Mega Tyranitar','tyranitar','Rock','#052E16','mega','rainbow','⭐ MEGA'),
   wild:{name:'Aggron',slug:'aggron',type:'Steel',tc:'#94A3B8'}},
  {id:'beldum-line', label:'Beldum', series:'Steel Champion', category:'cool', color:'#94A3B8', icon:'🔩',
   player:{name:'Beldum',slug:'beldum',type:'Steel',tc:'#94A3B8'},
   evolved:{name:'Metang',slug:'metang',type:'Steel',tc:'#94A3B8'},
   evolved2:{name:'Metagross',slug:'metagross',type:'Steel',tc:'#64748B'},
   mega:_mega('Mega Metagross','metagross','Steel','#475569','mega','blue','⭐ MEGA'),
   wild:{name:'Scizor',slug:'scizor',type:'Steel',tc:'#94A3B8'}},
  {id:'bagon-line', label:'Bagon', series:'Dragon Ace Hoenn', category:'cool', color:'#0E7490', icon:'🐲',
   player:{name:'Bagon',slug:'bagon',type:'Dragon',tc:'#0E7490'},
   evolved:{name:'Shelgon',slug:'shelgon',type:'Dragon',tc:'#0E7490'},
   evolved2:{name:'Salamence',slug:'salamence',type:'Dragon',tc:'#155E75'},
   mega:_mega('Mega Salamence','salamence','Dragon','#164E63','mega','rainbow','⭐ MEGA'),
   wild:{name:'Flygon',slug:'flygon',type:'Dragon',tc:'#6366F1'}},
  {id:'gible-line', label:'Gible', series:'Land Shark Sinnoh', category:'cool', color:'#1E40AF', icon:'🦈',
   player:{name:'Gible',slug:'gible',type:'Dragon',tc:'#1E40AF'},
   evolved:{name:'Gabite',slug:'gabite',type:'Dragon',tc:'#1E40AF'},
   evolved2:{name:'Garchomp',slug:'garchomp',type:'Dragon',tc:'#1E3A8A'},
   mega:_mega('Mega Garchomp','garchomp','Dragon','#172554','mega','rainbow','⭐ MEGA'),
   wild:{name:'Hydreigon',slug:'hydreigon',type:'Dragon',tc:'#6366F1'}},
]

// Get currently selected family (persisted). Returns null if "random" or unset.
function getG13Family() {
  try {
    const id = localStorage.getItem('g13_lastFamily')
    if (!id || id === 'random') return null
    const fam = G13_FAMILIES.find(f => f.id === id)
    if (fam) return fam
  } catch(_) {}
  return null
}

let g13LastChainId = -1
function g13PickChain(lv) {
  // Task #67 (2026-04-25): rebalanced for 3-stage Mega Evolution at high levels
  // 1-4 easy (1 evo) | 5-9 medium (1 evo) | 10-16 hard (2 evos) | 17-25 2stage (2 evos)
  // 26-35 epic (2 evos harder) | 36-45 3stage (3 evos WITH MEGA) | 46-55 legendary (3 evos hardest)
  const tier = lv <= 4 ? 'easy'
             : lv <= 9 ? 'medium'
             : lv <= 16 ? 'hard'
             : lv <= 25 ? '2stage'
             : lv <= 35 ? 'epic'
             : lv <= 45 ? '3stage'
             : 'legendary'

  // If user picked a specific family, use it — but use difficulty metadata from tier
  const fam = getG13Family()
  if (fam) {
    // Build a synthetic chain from family + tier's difficulty settings
    const tierProto = G13_CHAINS.find(c => c.diff === tier) || G13_CHAINS[0]
    // Task #67: stages-based reveal — 1=evolved only, 2=evolved+evolved2, 3=evolved+evolved2+mega
    const stages = (G13_DIFF[tier] || {}).stages || 2
    let megaForm = null
    if (stages >= 3) {
      // If family has canonical Mega/Gmax/Ash-form, use it; otherwise synthesize MAX FORM
      megaForm = fam.mega || synthMaxBoostForm(fam.evolved2 || fam.evolved || fam.player)
    }
    return {
      id: 'fam_' + fam.id,
      icon: fam.icon,
      diff: tier,
      maxNum: tierProto.maxNum,
      ops: tierProto.ops,
      player: fam.player,
      evolved: stages >= 1 ? fam.evolved : null,
      evolved2: stages >= 2 ? fam.evolved2 : null,
      mega: megaForm,
      wild: fam.wild,
    }
  }

  // Random / default — existing behavior
  let pool = G13_CHAINS.filter(c => c.diff === tier)
  if (!pool.length) pool = [...G13_CHAINS]
  // Prevent immediate repeat — filter out last chain if pool is large enough
  const fresh = pool.filter(c => c.id !== g13LastChainId)
  const pick = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))]
  g13LastChainId = pick.id
  return pick
}

// G13 family selector UI — opens from header 🎒 button
// Task #67 (2026-04-25): expanded to 44 chains across 4 categories with tab filter
let g13FamActiveTab = 'ash'  // default Ash (most kid-recognized)
function openG13FamilySelector() {
  const grid = document.getElementById('g13-fam-grid')
  const tabsEl = document.getElementById('g13-fam-tabs')
  if (!grid) return
  const currentId = (function(){ try { return localStorage.getItem('g13_lastFamily') || 'ash-pikachu' } catch(_) { return 'ash-pikachu' } })()
  // Task #95 (2026-04-26): use pokeSpriteAlt2 (correct format with ID prefix + underscore slug)
  // Was returning broken path 'pokemondb_hd_alt2/${slug}.webp' (missing ID + dash) → 63 broken
  // images → onerror cascade to remote → connection pool blocked → modal freeze (same root
  // cause pattern as Task #64 party picker bug)
  const pokeImg = (slug) => (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(slug)) || `https://img.pokemondb.net/sprites/home/normal/${slug}.png`

  // Determine initial tab from currentId
  if (currentId === 'random') g13FamActiveTab = 'random'
  else {
    const fam = G13_FAMILIES.find(f => f.id === currentId)
    if (fam) g13FamActiveTab = fam.category
  }

  const cardHtml = (fam) => {
    const selCls = fam.id === currentId ? ' g13-fam-selected' : ''
    const catBadge = fam.category === 'popular' ? '⭐ POPULER' : fam.category === 'ash' ? '🎒 ASH' : fam.category === 'cool' ? '💎 KEREN' : '🎲 ACAK'
    const catColor = fam.category === 'popular' ? '#fbbf24' : fam.category === 'ash' ? '#ef4444' : fam.category === 'cool' ? '#c084fc' : '#38bdf8'
    const thumbsHtml = fam.id === 'random'
      ? '<div style="color:rgba(255,255,255,0.6);font-size:13px;font-weight:700;padding:8px 0;">🎲 Acak dari semua evolusi yang ada — tiap level beda Pokémon!</div>'
      : `<div style="display:flex;gap:6px;align-items:center;justify-content:flex-start;flex-wrap:wrap;margin-top:8px;">
          <img src="${pokeImg(fam.player.slug)}" alt="${fam.player.name}" loading="lazy" decoding="async" style="width:38px;height:38px;background:rgba(0,0,0,0.25);border-radius:8px;padding:2px;object-fit:contain;" onerror="this.src='https://img.pokemondb.net/sprites/home/normal/${fam.player.slug}.png';this.onerror=null">
          <span style="color:rgba(255,255,255,0.5);font-size:11px;">→</span>
          <img src="${pokeImg(fam.evolved.slug)}" alt="${fam.evolved.name}" loading="lazy" decoding="async" style="width:38px;height:38px;background:rgba(0,0,0,0.25);border-radius:8px;padding:2px;object-fit:contain;" onerror="this.src='https://img.pokemondb.net/sprites/home/normal/${fam.evolved.slug}.png';this.onerror=null">
          ${fam.evolved2 ? `<span style="color:rgba(255,255,255,0.5);font-size:11px;">→</span>
          <img src="${pokeImg(fam.evolved2.slug)}" alt="${fam.evolved2.name}" loading="lazy" decoding="async" style="width:38px;height:38px;background:rgba(0,0,0,0.25);border-radius:8px;padding:2px;object-fit:contain;" onerror="this.src='https://img.pokemondb.net/sprites/home/normal/${fam.evolved2.slug}.png';this.onerror=null">` : ''}
        </div>`
    const megaIndicator = fam.mega ? '<span class="g13-fam-mega-indicator">⭐ MEGA</span>' : ''
    return `<div class="g13-fam-card${selCls}" data-fam="${fam.id}" style="position:relative;background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02));border:2px solid ${fam.id === currentId ? '#fbbf24' : 'rgba(255,255,255,0.2)'};border-radius:14px;padding:12px;cursor:pointer;transition:transform 0.15s,border-color 0.15s;color:#fff;border-left:5px solid ${fam.color};${fam.id === currentId ? 'box-shadow:0 0 22px rgba(251,191,36,0.5);' : ''}">
      ${megaIndicator}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;padding-right:${fam.mega ? '70px' : '0'};">
        <div style="font-size:15px;font-weight:900;">${fam.icon} ${fam.label}</div>
        ${fam.mega ? '' : `<span style="font-size:9px;font-weight:900;color:${catColor};background:${catColor}22;border:1px solid ${catColor}55;padding:2px 6px;border-radius:8px;letter-spacing:0.5px;">${catBadge}</span>`}
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:2px;">${fam.series}</div>
      ${thumbsHtml}
    </div>`
  }

  // Render category tabs
  const randomFam = {id:'random', label:'Acak / Kejutan', series:'Pokémon beda tiap level!', category:'random', color:'#38bdf8', icon:'🎲'}
  const tabSpec = [
    {id:'ash',     label:'🎒 ASH',     count:G13_FAMILIES.filter(f=>f.category==='ash').length},
    {id:'popular', label:'⭐ POPULER', count:G13_FAMILIES.filter(f=>f.category==='popular').length},
    {id:'cool',    label:'💎 KEREN',   count:G13_FAMILIES.filter(f=>f.category==='cool').length},
    {id:'random',  label:'🎲 ACAK',    count:1},
  ]
  if (tabsEl) {
    tabsEl.innerHTML = tabSpec.map(t =>
      `<button class="g13-fam-tab tab-${t.id}${t.id===g13FamActiveTab?' active':''}" data-tab="${t.id}">${t.label} (${t.count})</button>`
    ).join('')
    tabsEl.querySelectorAll('.g13-fam-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        g13FamActiveTab = btn.getAttribute('data-tab')
        try { playClick && playClick() } catch(_) {}
        openG13FamilySelector()  // re-render with new tab
      })
    })
  }

  // Filter families by active tab
  const filteredFams = g13FamActiveTab === 'random'
    ? [randomFam]
    : G13_FAMILIES.filter(f => f.category === g13FamActiveTab)
  grid.innerHTML = filteredFams.map(cardHtml).join('')

  grid.querySelectorAll('.g13-fam-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-fam')
      try { localStorage.setItem('g13_lastFamily', id) } catch(_) {}
      grid.querySelectorAll('.g13-fam-card').forEach(c => { c.style.borderColor = 'rgba(255,255,255,0.2)'; c.style.boxShadow = 'none' })
      card.style.borderColor = '#fbbf24'
      card.style.boxShadow = '0 0 24px rgba(251,191,36,0.5)'
      // Auto-close + restart level with new family
      setTimeout(() => {
        document.getElementById('g13-fam-overlay').style.display = 'none'
        // Restart current level with the newly-selected family
        try { initGame13() } catch(_) {}
      }, 300)
    })
  })
  document.getElementById('g13-fam-overlay').style.display = 'block'
}
window.openG13FamilySelector = openG13FamilySelector

function initGame13() {
  if (g13ResultTimeout) { clearTimeout(g13ResultTimeout); g13ResultTimeout = null }
  hideGameResult()
  // Auto-open family selector on first visit (no family saved yet)
  try {
    const saved = localStorage.getItem('g13_lastFamily')
    if (!saved) {
      setTimeout(() => { try { openG13FamilySelector() } catch(_){} }, 400)
    }
  } catch(_) {}
  const dbg = document.getElementById('g13-debug-err')
  if (dbg) dbg.style.display = 'none'
  // Hotfix #101-H: free any leftover Pixi context (see initGame10 for rationale)
  try { if (typeof PixiManager !== 'undefined') PixiManager.destroyAll() } catch(_){}
  loadPixiJS(function(){ PixiManager.init('g13-pixi-canvas').catch(()=>{}) })
  // Hotfix #110/#111: reset sprite element state + flush cascade queue
  // + clear stuck CSS. Removed non-existent g13-pspr-back ID.
  ;['g13-pspr', 'g13-wspr'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (typeof resetSpriteEl === 'function') resetSpriteEl(el)
    if (typeof _resetSprElCss === 'function') _resetSprElCss(el)
  })
  if (typeof flushSpriteQueue === 'function') flushSpriteQueue()
  const _g13Field = document.getElementById('g13-field')
  if (_g13Field) {
    _g13Field.style.display = 'flex'
    if (!_g13Field.style.backgroundImage) {
      _g13Field.style.background = 'linear-gradient(180deg,#5C94FC 0%,#3B82F6 60%,#166534 100%)'
    }
  }
  try {
    _initGame13Impl()
  } catch(e) {
    console.error('[G13] crash:', e)
    if (dbg) { dbg.textContent = '⚠️ ' + e.message; dbg.style.display = 'block' }
  }
}
window.initGame13 = initGame13

function _initGame13Impl() {
  // Task #84: defensive resets — match startGameWithLevel state init
  state._showingResult = false
  state._showingGameResult = false
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  battleBgmPlay()
  // Task #66: load city background if selected
  loadCityBackground(document.getElementById('g13-field'))
  const lv = Math.max(1, Math.min(55, state.selectedLevelNum || 1))
  const _FALLBACK = {id:0,icon:'🔥',diff:'easy',maxNum:10,ops:['+'],
    player:{name:'Charmander',slug:'charmander',type:'Fire',tc:'#F97316'},
    evolved:{name:'Charmeleon',slug:'charmeleon',type:'Fire',tc:'#F97316'},
    wild:{name:'Charizard',slug:'charizard',type:'Fire',tc:'#F97316'}}
  let chain
  try { chain = g13PickChain(lv) } catch(e) {}
  if (!chain) chain = _FALLBACK
  let cfg
  try { cfg = G13_DIFF[chain.diff] } catch(e) {}
  if (!cfg) cfg = {playerHp:5, wildHp:8, attacksToEvo:4, damage:1, wildDamage:1}
  // 3-stage chains: override to a longer scenario so all 3 evolutions can happen
  if (chain.evolved2) cfg = G13_DIFF['3stage']

  g13State = {
    chain, lv, cfg,
    playerHp: cfg.playerHp, playerMaxHp: cfg.playerHp,
    wildHp: cfg.wildHp, wildMaxHp: cfg.wildHp,
    evoPoints: 0, evoNeeded: cfg.attacksToEvo,
    evolved: false, evolved2: false, megaForm: false, locked: false,
    attackIdx: 0,
    phase: 'player_attack',
    correctThisExchange: 0,
    currentAnswer: 0,
    stars: 0,
  }

  // Set header
  const lvEl = document.getElementById('g13-level'); if(lvEl) lvEl.textContent = `Lv.${lv}`
  const stEl = document.getElementById('g13-stars'); if(stEl) stEl.textContent = '⭐ 0'
  const bdg = document.getElementById('g13-chain-badge'); if(bdg) bdg.textContent = chain.evolved2 ? `${chain.icon} ${chain.player.name}→${chain.evolved.name}→${chain.evolved2.name}` : `${chain.icon} ${chain.player.name}→${chain.evolved.name}`

  // Ensure overlays hidden, qpanel fully visible
  const evoOv = document.getElementById('g13-evo-overlay'); if(evoOv) evoOv.style.display = 'none'
  hideGameResult()
  // Reset sprite state from previous level (defeat/hit/atk animations)
  const pspr0 = document.getElementById('g13-pspr'); if (pspr0) { pspr0.classList.remove('spr-defeat','spr-hit','spr-flash','spr-atk','wild-die','wild-enter'); if (typeof clearMegaOverlay === 'function') clearMegaOverlay(pspr0) }
  const wspr0 = document.getElementById('g13-wspr'); if (wspr0) wspr0.classList.remove('spr-defeat','spr-hit','spr-flash','spr-atk','wild-die','wild-enter')
  const qp = document.getElementById('g13-qpanel')
  if (qp) { qp.style.opacity = '1'; qp.style.pointerEvents = ''; qp.style.display = 'flex' }
  const evoBtn = document.getElementById('g13-evo-btn')
  if (evoBtn) evoBtn.style.display = 'none'
  const choicesEl2 = document.getElementById('g13-choices')
  if (choicesEl2) choicesEl2.style.display = ''
  const mathEl2 = document.getElementById('g13-math')
  if (mathEl2) mathEl2.style.color = ''

  // Sprite loading: show emoji immediately, replace with image async
  const POKE_IDS = {bulbasaur:1,ivysaur:2,venusaur:3,charmander:4,charmeleon:5,charizard:6,squirtle:7,wartortle:8,blastoise:9,caterpie:10,metapod:11,butterfree:12,pikachu:25,raichu:26,jolteon:135,flareon:136,vaporeon:134,arcanine:59,meowth:52,persian:53,machop:66,machoke:67,machamp:68,geodude:74,graveler:75,golem:76,gastly:92,haunter:93,gengar:94,magikarp:129,gyarados:130,lapras:131,eevee:133,snorlax:143,dratini:147,dragonair:148,dragonite:149,abra:63,kadabra:64,alakazam:65,psyduck:54,golduck:55,slowpoke:79,slowbro:80,poliwag:60,poliwhirl:61,poliwrath:62,horsea:116,seadra:117,vulpix:37,ninetales:38,oddish:43,gloom:44,vileplume:45,exeggcute:102,exeggutor:103,koffing:109,weezing:110,cubone:104,marowak:105,kabuto:140,kabutops:141,omanyte:138,omastar:139,cyndaquil:155,quilava:156,typhlosion:157,totodile:158,croconaw:159,feraligatr:160,chikorita:152,bayleef:153,meganium:154,togepi:175,togetic:176,marill:183,azumarill:184,teddiursa:216,ursaring:217,slugma:218,magcargo:219,swinub:220,piloswine:221,larvitar:246,pupitar:247,tyranitar:248,mudkip:258,marshtomp:259,swampert:260,treecko:252,grovyle:253,sceptile:254,torchic:255,combusken:256,blaziken:257,ralts:280,kirlia:281,gardevoir:282,beldum:374,metang:375,metagross:376,snubbull:209,granbull:210,clefable:36,dewgong:87,seel:86,cloyster:91,staryu:120,starmie:121,kangaskhan:115,muk:89,pichu:172,
    pidgey:16,pidgeotto:17,pidgeot:18,rattata:19,raticate:20,spearow:21,fearow:22,ekans:23,arbok:24,sandshrew:27,sandslash:28,clefairy:35,jigglypuff:39,wigglytuff:40,paras:46,parasect:47,venonat:48,venomoth:49,mankey:56,primeape:57,growlithe:58,bellsprout:69,weepinbell:70,doduo:84,dodrio:85,magneton:82,shellder:90,diglett:50,voltorb:100,electrode:101,goldeen:118,seaking:119,tauros:128,hitmonchan:107,
    misdreavus:200,mismagius:429,sneasel:215,weavile:461,hoppip:187,skiploom:188,stantler:234,wyrdeer:899,
    electrike:309,manectric:310,swablu:333,altaria:334,shroomish:285,breloom:286,wailmer:320,wailord:321,meditite:307,medicham:308,skitty:300,delcatty:301,snorunt:361,glalie:362,
    bagon:371,shelgon:372,salamence:373,roggenrola:524,boldore:525,gigalith:526,litwick:607,lampent:608,chandelure:609,gible:443,gabite:444,garchomp:445,timburr:532,gurdurr:533,conkeldurr:534,elekid:239,electabuzz:125,electivire:466,magby:240,magmar:126,magmortar:467,sandile:551,krokorok:552,krookodile:553,
    riolu:447,lucario:448,deino:633,zweilous:634,hydreigon:635,trapinch:328,vibrava:329,flygon:330,axew:610,fraxure:611,haxorus:612,feebas:349,milotic:350,goomy:704,sliggoo:705,goodra:706,
    onix:95,steelix:208,lairon:305,aggron:306,
    victreebel:71,'nidoran-f':29,nidorina:30,nidoqueen:31,'nidoran-m':32,nidorino:33,nidoking:34,
    cleffa:173,igglybuff:174,sunflora:192,jumpluff:189,
    spheal:363,sealeo:364,walrein:365,
    slakoth:287,vigoroth:288,slaking:289,
    umbreon:197,espeon:196,leafeon:470,glaceon:471,sylveon:700,
    togekiss:468,roserade:407,lopunny:428,honchkrow:430,porygon:137,porygon2:233,porygonz:474}
  // HD CDN first for consistent canvas sizing + predictable orientation.
  // SVG variant is secondary (visual variety for the 751 covered slugs).
  // Local low-res PNG is dropped from this cascade — it produced inconsistent
  // sizes and wrong-facing artwork (2026-04-21 user report).
  // Task #71: local-first sprite per Lesson L16 — was CDN-primary causing wrong facing
  const pokeUrl = slug => pokeSpriteAlt2(slug) || pokeSpriteCDN(slug)
  const pokeUrlRemote = slug => pokeSpriteCDN(slug)
  const pokeFallbackUrl = slug => { const id = POKE_IDS[slug]; return id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` : null }
  const sprFbStyle = 'font-size:min(18vw,11vh);line-height:1;display:flex;align-items:center;justify-content:center;width:clamp(140px, min(34vw, 28vh), 280px);height:clamp(140px, min(34vw, 28vh), 280px);position:relative;z-index:2;'

  // Hotfix #117: use shared cascade (HD WebP 630x630 first) instead of custom
  // tryLoad chain. resetSpriteEl() clears stale onerror closures (#110 pattern).
  function loadSpr(imgId, wrapId, slug, emoji) {
    const wrap = document.getElementById(wrapId)
    if (!wrap) return
    const img = document.getElementById(imgId)
    if (!img) return
    // Reset animation classes and inline styles from previous battle
    img.className = img.className.replace(/\bspr-\S+/g, '').trim()
    img.style.opacity = '1'
    img.style.animation = ''
    img.style.transform = ''
    img.style.display = 'none'  // hide while loading

    // Always show emoji fallback immediately — swap to img only after confirmed load
    const old = wrap.querySelector('.g13-spr-fb'); if (old) old.remove()
    const fb = document.createElement('div')
    fb.className = 'g13-spr-fb'
    fb.style.cssText = sprFbStyle
    fb.textContent = emoji
    wrap.insertBefore(fb, img)

    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      // Cascade: HD WebP 630x630 → SVG → local PNG → CDN fallbacks
      if (typeof resetSpriteEl === 'function') resetSpriteEl(img)
      attachSpriteCascade(img, buildPokeSources(slug, null), emoji, function() {
        const existFb = wrap.querySelector('.g13-spr-fb'); if (existFb) existFb.remove()
        img.style.display = ''
      })
    } else {
      // Legacy fallback: try HD first, then CDN, then PokeAPI
      const urls = [pokeUrl(slug), pokeUrlRemote(slug), pokeFallbackUrl(slug)].filter(Boolean)
      function tryLoad(idx) {
        if (idx >= urls.length) return // all failed, keep emoji
        const test = new Image()
        test.onload = () => {
          const existFb = wrap.querySelector('.g13-spr-fb'); if (existFb) existFb.remove()
          img.src = urls[idx]
          img.style.display = ''
        }
        test.onerror = () => tryLoad(idx + 1)
        test.src = urls[idx]
      }
      tryLoad(0)
    }
  }

  loadSpr('g13-wspr', 'g13-wspr-wrap', chain.wild.slug, chain.icon || '❓')
  loadSpr('g13-pspr', 'g13-pspr-wrap', chain.player.slug, chain.icon || '❓')
  // Apply facing + final scale (tier × visual) to BOTH sprites
  const wImg = document.getElementById('g13-wspr')
  const pImg = document.getElementById('g13-pspr')
  if (wImg) {
    applyPokeFlip(wImg, chain.wild.slug, 'enemy')
    const wScale = pokeFinalScale(chain.wild.slug)
    if (wScale !== 1.0) wImg.style.width = wImg.style.height = `calc(clamp(140px, min(34vw, 28vh), 280px) * ${wScale})`
  }
  if (pImg) {
    applyPokeFlip(pImg, chain.player.slug, 'player')
    const pScale = pokeFinalScale(chain.player.slug)
    if (pScale !== 1.0) pImg.style.width = pImg.style.height = `calc(clamp(140px, min(34vw, 28vh), 280px) * ${pScale})`
  }

  // Wild name/type
  const wnEl = document.getElementById('g13-wname'); if(wnEl) wnEl.textContent = chain.wild.name
  const wlEl = document.getElementById('g13-wlv');   if(wlEl) wlEl.textContent = `Lv${lv + 5}`
  const wtype = document.getElementById('g13-wtype')
  if (wtype) { wtype.textContent = chain.wild.type; wtype.style.background = chain.wild.tc+'33'; wtype.style.color = chain.wild.tc; wtype.style.border = `1px solid ${chain.wild.tc}66` }

  // Player name/type
  const pnEl = document.getElementById('g13-pname'); if(pnEl) pnEl.textContent = chain.player.name
  const plEl = document.getElementById('g13-plv');   if(plEl) plEl.textContent = `Lv${lv}`
  const ptype = document.getElementById('g13-ptype')
  if (ptype) { ptype.textContent = chain.player.type; ptype.style.background = chain.player.tc+'33'; ptype.style.color = chain.player.tc; ptype.style.border = `1px solid ${chain.player.tc}66` }

  g13UpdateHpBars()
  g13UpdateEvoBar()
  // Apply arena background based on wild type
  const field = document.getElementById('g13-field')
  if (field) {
    field.className = field.className.replace(/g13-arena-\S+/g, '').trim()
    field.classList.add('g13-field', `g13-arena-${chain.wild.type}`)
    // Random day/dark, responsive mobile/pc
    const isDark = Math.random() < 0.5
    const isMobile = window.innerWidth <= 768
    const bgKey = isDark
      ? (isMobile ? 'bg-arena-dark-mobile' : 'bg-arena-dark-pc')
      : (isMobile ? 'bg-arena-day-mobile' : 'bg-arena-day-pc')
    field.style.backgroundImage = `url('assets/${bgKey}.webp')`
  }
  g13NextQuestion()
}

function g13UpdateHpBars() {
  const s = g13State
  const wpct = Math.max(0, (s.wildHp / s.wildMaxHp) * 100)
  const ppct = Math.max(0, (s.playerHp / s.playerMaxHp) * 100)
  const wfill = document.getElementById('g13-whpfill')
  const pfill = document.getElementById('g13-phpfill')
  if (wfill) { wfill.style.width = wpct + '%'; wfill.className = 'g13-hp-fill' + (wpct <= 25 ? ' low' : '') }
  if (pfill) { pfill.style.width = ppct + '%'; pfill.className = 'g13-hp-fill' + (ppct <= 25 ? ' low' : '') }
  const wn = document.getElementById('g13-whpnums'); if (wn) wn.textContent = `${s.wildHp}/${s.wildMaxHp}`
  const pn = document.getElementById('g13-phpnums'); if (pn) pn.textContent = `${s.playerHp}/${s.playerMaxHp}`
}

function g13UpdateEvoBar() {
  const s = g13State
  const pct = Math.min(100, Math.round((s.evoPoints / s.evoNeeded) * 100))
  const fill = document.getElementById('g13-evofill')
  const pctEl = document.getElementById('g13-evopct')
  if (fill) {
    fill.style.width = pct + '%'
    if (pct >= 100) fill.classList.add('ready'); else fill.classList.remove('ready')
  }
  if (pctEl) pctEl.textContent = pct + '%'
}

function g13GenQuestion() {
  const s = g13State
  // Hotfix #112-H: delegate to shared math-rules per user mandate.
  // G13 has 20 levels max; level proxy from chain stage (mega/evolved2/evolved/base).
  const _diff = state.selectedLevel || 'easy'
  const _lv = state.selectedLevelNum || 1
  // Stage boost adds difficulty progression within a level
  const stageBoost = s.megaForm ? 6 : s.evolved2 ? 4 : s.evolved ? 2 : 0
  const _effectiveLv = Math.min(40, _lv + stageBoost)
  let q
  if (typeof window.makeGameQuestion === 'function') {
    q = window.makeGameQuestion(_effectiveLv, 40, _diff)
  } else {
    // Fallback: simple addition
    const a = Math.floor(Math.random() * 9) + 1, b = Math.floor(Math.random() * 9) + 1
    q = { q: `${a} + ${b} = ?`, ans: a + b, choices: [a+b, a+b+1, a+b-1, a+b+2].sort(()=>Math.random()-0.5) }
  }
  s.currentAnswer = q.ans
  // expr/wrongs format kept for backward compat with g13NextQuestion
  const wrongs = (q.choices || []).filter(c => String(c) !== String(q.ans))
  return { expr: q.q, ans: q.ans, wrongs: wrongs.slice(0, 3), choices: q.choices }
}

function g13NextQuestion() {
  const s = g13State
  if (s.locked || s.phase === 'victory' || s.phase === 'defeat' || s.phase === 'evo_ready') return
  const q = g13GenQuestion()
  s.currentAnswer = q.ans
  s.locked = false

  const mathEl = document.getElementById('g13-math')
  if (mathEl) { mathEl.textContent = q.expr; mathEl.classList.remove('pop'); void mathEl.offsetWidth; mathEl.classList.add('pop') }
  const atkLbl = document.getElementById('g13-atk-lbl')
  if (atkLbl) atkLbl.textContent = s.evolved ? `⚡ ${s.chain.evolved.name} menyerang!` : `Serang dengan ${s.chain.player.name}!`
  g13SetStatus(`Serangan ${s.attackIdx + 1}`, s.evolved ? 'Beri pukulan terakhir!' : 'Hitung untuk menyerang!')

  // Hotfix #112-H: prefer q.choices (already-shuffled) from shared math-rules.
  const choices = q.choices || [q.ans, ...(q.wrongs||[])].sort(() => Math.random() - 0.5)
  const container = document.getElementById('g13-choices')
  if (!container) return
  container.innerHTML = ''
  choices.forEach(val => {
    const btn = document.createElement('button')
    btn.className = 'g13-choice-btn'
    btn.textContent = val
    btn.onclick = () => g13Answer(val, btn)
    container.appendChild(btn)
  })
}

function g13SpawnAttackEffect(type, fromPlayer, fieldId = 'g13-field') {
  const field = document.getElementById(fieldId)
  if (!field) return
  const typeImg = {Fire:'attack-fx-fire.webp',Water:'attack-fx-water.webp',Grass:'attack-fx-grass.webp',Electric:'attack-fx-electric.webp'}
  const typeEmoji = {Rock:'🪨',Ghost:'👻',Psychic:'🌀',Normal:'⭐',Ice:'❄️',Dragon:'💥',Fighting:'👊',Steel:'⚔️',Poison:'☠️',Bug:'🐛',Fairy:'✨',Ground:'💨',Flying:'🌪️'}
  const hasImg = !!typeImg[type]
  const imgSrc = hasImg ? `assets/${typeImg[type]}` : null
  const emoji = typeEmoji[type] || '💥'
  const fieldRect = field.getBoundingClientRect()
  // Hotfix #112-J part 2: derive projectile origin from ACTUAL sprite bbox
  // (was hardcoded 15%/75%). Now responsive to whatever positioning the
  // diagonal layout uses across portrait/landscape. Falls back to fixed %
  // if sprite wraps not present (e.g. g13 single-sprite layout).
  const playerWrap = (fieldId === 'g13b-field') ? document.getElementById('g13b-pspr-wrap') : document.getElementById('g13-pspr-wrap')
  const wildWrap = (fieldId === 'g13b-field') ? document.getElementById('g13b-wspr-wrap') : document.getElementById('g13-wspr-wrap')
  let fromX, fromY, toX, toY
  if (playerWrap && wildWrap && fieldRect.width > 0) {
    const pr = playerWrap.getBoundingClientRect()
    const wr = wildWrap.getBoundingClientRect()
    const playerXPct = ((pr.left + pr.width/2) - fieldRect.left) / fieldRect.width * 100
    const playerYPct = ((pr.top + pr.height/2) - fieldRect.top) / fieldRect.height * 100
    const wildXPct = ((wr.left + wr.width/2) - fieldRect.left) / fieldRect.width * 100
    const wildYPct = ((wr.top + wr.height/2) - fieldRect.top) / fieldRect.height * 100
    fromX = (fromPlayer ? playerXPct : wildXPct).toFixed(1) + '%'
    fromY = (fromPlayer ? playerYPct : wildYPct).toFixed(1) + '%'
    toX   = (fromPlayer ? wildXPct : playerXPct).toFixed(1) + '%'
    toY   = (fromPlayer ? wildYPct : playerYPct).toFixed(1) + '%'
  } else {
    // Fallback (legacy fixed %)
    fromX = fromPlayer ? '15%' : '75%'
    fromY = fromPlayer ? '70%' : '15%'
    toX   = fromPlayer ? '75%' : '15%'
    toY   = fromPlayer ? '15%' : '70%'
  }
  const proj = document.createElement('div')
  proj.className = 'g13-proj'
  if (hasImg) {
    proj.style.width = '44px'; proj.style.height = '44px'; proj.style.fontSize = '0'
    proj.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 8px rgba(255,255,255,0.8))" alt="">`
  } else { proj.textContent = emoji }
  proj.style.setProperty('--from-x', fromX)
  proj.style.setProperty('--from-y', fromY)
  proj.style.setProperty('--to-x',   toX)
  proj.style.setProperty('--to-y',   toY)
  proj.style.left = fromX
  proj.style.top  = fromY
  field.appendChild(proj)
  setTimeout(() => proj.remove(), 600)
  // Trail particles
  for (let i = 0; i < 3; i++) {
    const trail = document.createElement('div')
    trail.className = 'g13-proj-trail'
    if (hasImg) { trail.style.width = '22px'; trail.style.height = '22px'; trail.style.fontSize = '0'; trail.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;opacity:0.6" alt="">` }
    else { trail.textContent = emoji }
    trail.style.left = `calc(${fromX} + ${(Math.random()-0.5)*20}%)`
    trail.style.top  = `calc(${fromY} + ${(Math.random()-0.5)*20}%)`
    trail.style.animationDelay = `${i*0.08}s`
    field.appendChild(trail)
    setTimeout(() => trail.remove(), 500)
  }
}

// Type-based hit impact FX — spawns particles on the target sprite zone
function g13TypeHitFX(type, onEnemy) {
  const field = document.getElementById('g13-field')
  if (!field) return
  const CFG = {
    Fire:     {emojis:['🔥','✨'], anim:'fxRise',   color:'#FF6B35', count:7},
    Water:    {emojis:['💧','🌊'], anim:'fxRain',   color:'#4FC3F7', count:6},
    Electric: {emojis:['⚡','✨'], anim:'fxZap',    color:'#FFCB05', count:9},
    Grass:    {emojis:['🍃','🌿'], anim:'fxSwirl',  color:'#4CAF50', count:7},
    Dark:     {emojis:['🌑','💢'], anim:'fxShadow', color:'#3a0a5a', count:5},
    Psychic:  {emojis:['🔮','💫'], anim:'fxSpiral', color:'#F95587', count:7},
    Ice:      {emojis:['❄️','💎'], anim:'fxSnow',   color:'#98D8D8', count:7},
    Ghost:    {emojis:['👻','💜'], anim:'fxFloat',  color:'#705898', count:5},
    Flying:   {emojis:['🌪️','💨'], anim:'fxWind',   color:'#A890F0', count:6},
    Dragon:   {emojis:['💫','🐉'], anim:'fxSpin',   color:'#7038F8', count:6},
    Fighting: {emojis:['💥','👊'], anim:'fxBurst',  color:'#C03028', count:7},
    Rock:     {emojis:['🪨','💥'], anim:'fxDrop',   color:'#B8A038', count:5},
    Poison:   {emojis:['☠️','💜'], anim:'fxFloat',  color:'#A040A0', count:5},
    Ground:   {emojis:['💥','🌍'], anim:'fxBurst',  color:'#E0C068', count:6},
    Bug:      {emojis:['✨','🌿'], anim:'fxSwirl',  color:'#A8B820', count:6},
    Steel:    {emojis:['⚔️','✨'], anim:'fxSpark',  color:'#B8B8D0', count:5},
    Normal:   {emojis:['💢','✨'], anim:'fxBurst',  color:'#A8A878', count:5},
    Fairy:    {emojis:['✨','💖'], anim:'fxSwirl',  color:'#EE99AC', count:7},
  }
  const cfg = CFG[type] || CFG.Normal
  // Particle zone: enemy = top-right quarter, player = bottom-left quarter
  const xBase = onEnemy ? 53 : 5
  const yBase = onEnemy ? 5  : 43
  for (let i = 0; i < cfg.count; i++) {
    const p = document.createElement('span')
    const px = xBase + Math.random() * 32
    const py = yBase + Math.random() * 32
    const sz = 18 + Math.random() * 14
    const dur = 0.55 + Math.random() * 0.45
    const del = i * 0.055
    p.style.cssText = `position:absolute;font-size:${sz}px;left:${px}%;top:${py}%;z-index:25;pointer-events:none;animation:${cfg.anim} ${dur}s ${del}s ease-out both;filter:drop-shadow(0 0 6px ${cfg.color});`
    p.textContent = cfg.emojis[i % cfg.emojis.length]
    field.appendChild(p)
    setTimeout(() => p.remove(), (dur + del) * 1000 + 120)
  }
}

function g13Answer(val, btn) {
  const s = g13State
  if (s.locked || s.phase !== 'player_attack') return
  s.locked = true

  // Hotfix #112-H: support both numeric (math) + string (knowledge) answers.
  const correct = String(val) === String(s.currentAnswer)
  btn.classList.add(correct ? 'correct' : 'wrong')
  const choicesEl = document.getElementById('g13-choices')
  if (choicesEl) choicesEl.querySelectorAll('.g13-choice-btn').forEach(b => b.disabled = true)

  // Wrap FX/audio in try so an exception never blocks the transition scheduler below.
  // Task #57 — stuck state "enemy disappears but no modal" was traceable to an
  // exception in the sync FX path preventing the setTimeout() from being scheduled.
  try {
    if (correct) {
      playCorrect()
      vibrate(12)
      s.wildHp = Math.max(0, s.wildHp - s.cfg.damage)
      s.evoPoints = Math.min(s.evoNeeded, s.evoPoints + 1)
      s.correctThisExchange++
      s.stars++
      const starDisp = document.getElementById('g13-stars'); if(starDisp) starDisp.textContent = `⭐ ${s.stars}`
      // Player lunge + attack sound
      const atkType = s.evolved ? s.chain.evolved.type : s.chain.player.type
      playAttackSound(atkType)
      g13SpawnAttackEffect(atkType, true)
      const playerSlugG13 = s.evolved2 ? s.chain.evolved2.slug : (s.evolved ? s.chain.evolved.slug : s.chain.player.slug)
      showMovePopup(document.getElementById('g13-pspr-wrap'), getPokeMove(playerSlugG13, atkType), pokeTypeColor(atkType))
      // Attacker aura (DOM) — Pixi path reserved for g13b-pixi-canvas
      spawnTypeAura(document.getElementById('g13-pspr-wrap'), atkType)
      const pspr = document.getElementById('g13-pspr')
      if (pspr) { pspr.classList.remove('spr-atk'); void pspr.offsetWidth; pspr.classList.add('spr-atk'); setTimeout(()=>pspr.classList.remove('spr-atk'),350) }
      // Wild hit animation + type hit FX
      const wspr = document.getElementById('g13-wspr')
      setTimeout(() => {
        if (wspr) {
          wspr.classList.remove('spr-hit','spr-flash'); void wspr.offsetWidth
          wspr.classList.add('spr-hit','spr-flash')
          setTimeout(()=>wspr.classList.remove('spr-hit','spr-flash'),450)
        }
        g13TypeHitFX(atkType, true)
      }, 300)
      // Flash
      g13TriggerFlash()
      // Particle burst
      try { spawnParticleBurst(btn.getBoundingClientRect().left + btn.offsetWidth/2, btn.getBoundingClientRect().top) } catch(e) {}
    } else {
      playWrong()
      vibrate(30)
      // Player cringe
      const pspr = document.getElementById('g13-pspr')
      if (pspr) { pspr.classList.remove('spr-hit'); void pspr.offsetWidth; pspr.classList.add('spr-hit'); setTimeout(()=>pspr.classList.remove('spr-hit'),400) }
    }
  } catch(e) { console.error('[G13] FX path crashed:', e) }

  try { g13UpdateHpBars() } catch(e) {}
  try { g13UpdateEvoBar() } catch(e) {}
  s.attackIdx++

  // Task #57 failsafe — if wildHp hit 0, schedule an independent watchdog that
  // force-calls g13Victory if the primary transition below hasn't fired within
  // 1800ms (covers any throw / blocked-event-loop case). g13Victory is idempotent.
  if (s.wildHp <= 0 && s.phase !== 'victory') {
    if (g13ResultTimeout) { clearTimeout(g13ResultTimeout); g13ResultTimeout = null }
    setTimeout(() => {
      if (g13State === s && s.wildHp <= 0 && s.phase !== 'victory' && s.phase !== 'defeat') {
        console.warn('[G13] victory watchdog fired — forcing modal')
        g13Victory()
      }
    }, 1800)
  }

  setTimeout(() => {
    if (s.wildHp <= 0) {
      g13Victory()
      return
    }
    // After 3 attacks, ALWAYS trigger wild counter-attack first — evo check runs after counter
    if (s.attackIdx >= 3) {
      g13WildCounterPhase()
    } else {
      s.locked = false
      g13NextQuestion()
    }
  }, 600)
}

function g13WildCounterPhase() {
  const s = g13State
  if (s.phase === 'wild_counter') return   // guard: prevent double-call race condition
  s.phase = 'wild_counter'                  // set phase immediately
  const attacks = s.cfg?.difficulty === 'hard' ? 2 : 1  // reduced from 3 to keep win rate ~99%
  let done = 0
  const qpanel = document.getElementById('g13-qpanel')
  if (qpanel) { qpanel.style.opacity = '0.3'; qpanel.style.pointerEvents = 'none' }
  g13SetStatus(`${s.chain.wild.name} menyerang!`, '⚔️ Bertahan...')

  function doWildAttack(i) {
    if (i >= attacks) {
      // Done — check evo or continue
      if (qpanel) { qpanel.style.opacity = '1'; qpanel.style.pointerEvents = '' }
      s.attackIdx = 0
      s.correctThisExchange = 0
      if (s.playerHp <= 0) { g13Defeat(); return }
      const canEvo1 = !s.evolved && s.evoPoints >= s.evoNeeded
      const canEvo2 = s.evolved && !s.evolved2 && s.chain.evolved2 && s.evoPoints >= s.evoNeeded
      // Task #67: 3rd-stage evolution to Mega/Gmax/Ash-form (only when chain has `mega` field)
      const canEvo3 = s.evolved2 && !s.megaForm && s.chain.mega && s.evoPoints >= s.evoNeeded
      if (canEvo1 || canEvo2 || canEvo3) {
        s.phase = 'evo_ready'
        setTimeout(() => g13ShowEvoButton(), 300)
      } else {
        s.phase = 'player_attack'
        s.locked = false
        g13NextQuestion()
      }
      return
    }
    setTimeout(() => {
      // Wild attack animation + sound
      const wspr = document.getElementById('g13-wspr')
      const pspr = document.getElementById('g13-pspr')
      playAttackSound(s.chain.wild.type)
      g13SpawnAttackEffect(s.chain.wild.type, false)
      showMovePopup(document.getElementById('g13-wspr-wrap'), getPokeMove(s.chain.wild.slug, s.chain.wild.type), null)
      if (wspr) { wspr.classList.remove('spr-atk'); void wspr.offsetWidth; wspr.classList.add('spr-atk'); setTimeout(()=>wspr.classList.remove('spr-atk'),350) }
      setTimeout(() => {
        if (pspr) {
          pspr.classList.remove('spr-hit','spr-flash'); void pspr.offsetWidth
          pspr.classList.add('spr-hit','spr-flash')
          setTimeout(()=>pspr.classList.remove('spr-hit','spr-flash'),450)
        }
        g13TypeHitFX(s.chain.wild.type, false)
        s.playerHp = Math.max(0, s.playerHp - s.cfg.wildDamage)
        g13UpdateHpBars()
        g13TriggerFlash()
        vibrate(20)
        if (s.playerHp <= 0) {
          g13Defeat()
          return
        }
        done++
        doWildAttack(done)
      }, 350)
    }, 800)
  }
  doWildAttack(0)
}

function g13TriggerFlash() {
  const fl = document.getElementById('g13-flash')
  if (fl) { fl.classList.remove('hit-flash'); void fl.offsetWidth; fl.classList.add('hit-flash') }
}

function g13SetStatus(phaseText, battleText) {
  const pt = document.getElementById('g13-phase-txt'); if (pt) pt.textContent = phaseText
  const bt = document.getElementById('g13-battle-status'); if (bt) bt.textContent = battleText
}

function g13ShowEvoButton() {
  const btn = document.getElementById('g13-evo-btn')
  const choices = document.getElementById('g13-choices')
  const math = document.getElementById('g13-math')
  const atk = document.getElementById('g13-atk-lbl')
  if (btn) btn.style.display = 'block'
  if (choices) choices.style.display = 'none'
  if (math) { math.textContent = '⚡ EVO SIAP!'; math.style.color = '#FBBF24' }
  if (atk) atk.textContent = 'Pokemon kamu siap berevolusi!'
  g13SetStatus('EVO 100%!', '⚡ Tekan tombol untuk berevolusi!')
}

function g13DoEvolution() {
  const btn = document.getElementById('g13-evo-btn')
  const choices = document.getElementById('g13-choices')
  const math = document.getElementById('g13-math')
  if (btn) btn.style.display = 'none'
  if (choices) choices.style.display = ''
  if (math) { math.textContent = '— + — = ?'; math.style.color = '' }
  g13TriggerEvolution()
}

function g13TriggerEvolution() {
  const s = g13State
  const overlay = document.getElementById('g13-evo-overlay')
  if (!overlay) return

  // Play evolution SFX via Web Audio
  g13PlayEvoSfx()

  // Set images
  const baseImg = document.getElementById('g13-evo-base-img')
  const evolvedImg = document.getElementById('g13-evo-evolved-img')
  const nameEl = document.getElementById('g13-evo-newname')
  const textEl = document.getElementById('g13-evo-text')
  if (!baseImg || !evolvedImg || !nameEl || !textEl) { overlay.style.display = 'none'; return }
  const POKE_IDS2 = {bulbasaur:1,ivysaur:2,venusaur:3,charmander:4,charmeleon:5,charizard:6,squirtle:7,wartortle:8,blastoise:9,caterpie:10,metapod:11,butterfree:12,pikachu:25,raichu:26,jolteon:135,flareon:136,vaporeon:134,arcanine:59,meowth:52,persian:53,machop:66,machoke:67,machamp:68,geodude:74,graveler:75,golem:76,gastly:92,haunter:93,gengar:94,magikarp:129,gyarados:130,lapras:131,eevee:133,snorlax:143,dratini:147,dragonair:148,dragonite:149,abra:63,kadabra:64,alakazam:65,psyduck:54,golduck:55,slowpoke:79,slowbro:80,poliwag:60,poliwhirl:61,poliwrath:62,horsea:116,seadra:117,vulpix:37,ninetales:38,oddish:43,gloom:44,vileplume:45,exeggcute:102,exeggutor:103,koffing:109,weezing:110,cubone:104,marowak:105,kabuto:140,kabutops:141,omanyte:138,omastar:139,cyndaquil:155,quilava:156,typhlosion:157,totodile:158,croconaw:159,feraligatr:160,chikorita:152,bayleef:153,meganium:154,togepi:175,togetic:176,marill:183,azumarill:184,teddiursa:216,ursaring:217,slugma:218,magcargo:219,swinub:220,piloswine:221,larvitar:246,pupitar:247,tyranitar:248,mudkip:258,marshtomp:259,swampert:260,treecko:252,grovyle:253,sceptile:254,torchic:255,combusken:256,blaziken:257,ralts:280,kirlia:281,gardevoir:282,beldum:374,metang:375,metagross:376,snubbull:209,granbull:210,clefable:36,dewgong:87,seel:86,cloyster:91,staryu:120,starmie:121,kangaskhan:115,muk:89,pichu:172,
    pidgey:16,pidgeotto:17,pidgeot:18,rattata:19,raticate:20,spearow:21,fearow:22,ekans:23,arbok:24,sandshrew:27,sandslash:28,clefairy:35,jigglypuff:39,wigglytuff:40,paras:46,parasect:47,venonat:48,venomoth:49,mankey:56,primeape:57,growlithe:58,bellsprout:69,weepinbell:70,doduo:84,dodrio:85,magneton:82,shellder:90,diglett:50,voltorb:100,electrode:101,goldeen:118,seaking:119,tauros:128,hitmonchan:107,
    misdreavus:200,mismagius:429,sneasel:215,weavile:461,hoppip:187,skiploom:188,stantler:234,wyrdeer:899,
    electrike:309,manectric:310,swablu:333,altaria:334,shroomish:285,breloom:286,wailmer:320,wailord:321,meditite:307,medicham:308,skitty:300,delcatty:301,snorunt:361,glalie:362,
    bagon:371,shelgon:372,salamence:373,roggenrola:524,boldore:525,gigalith:526,litwick:607,lampent:608,chandelure:609,gible:443,gabite:444,garchomp:445,timburr:532,gurdurr:533,conkeldurr:534,elekid:239,electabuzz:125,electivire:466,magby:240,magmar:126,magmortar:467,sandile:551,krokorok:552,krookodile:553,
    riolu:447,lucario:448,deino:633,zweilous:634,hydreigon:635,trapinch:328,vibrava:329,flygon:330,axew:610,fraxure:611,haxorus:612,feebas:349,milotic:350,goomy:704,sliggoo:705,goodra:706}
  // Hotfix #117: use shared cascade (HD WebP 630x630 first) instead of direct src.
  // Legacy pokeUrl kept inside else for safety if helpers not loaded.
  const pokeUrl = slug => (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(slug)) || `https://img.pokemondb.net/sprites/home/normal/${slug}.png`

  // Determine which evolution stage is triggering
  const isStage2 = s.evolved && s.chain.evolved2 && !s.evolved2
  const fromForm = isStage2 ? s.chain.evolved : s.chain.player
  const toForm   = isStage2 ? s.chain.evolved2 : s.chain.evolved
  if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
    if (typeof resetSpriteEl === 'function') resetSpriteEl(baseImg)
    attachSpriteCascade(baseImg, buildPokeSources(fromForm.slug, null), '✨')
    if (typeof resetSpriteEl === 'function') resetSpriteEl(evolvedImg)
    attachSpriteCascade(evolvedImg, buildPokeSources(toForm.slug, null), '⚡')
  } else {
    baseImg.src = pokeUrl(fromForm.slug)
    evolvedImg.src = pokeUrl(toForm.slug)
  }
  nameEl.textContent = toForm.name
  nameEl.classList.remove('show')
  textEl.textContent = 'Sedang berevolusi...'
  baseImg.style.animation = 'none'
  baseImg.style.opacity = '1'
  evolvedImg.style.opacity = '0'

  // Pixi: spawn evolution particles + rings (GPU-accelerated)
  const _g13Pixi = PixiManager.get('g13-pixi-canvas')
  if (_g13Pixi) {
    pixiEvoParticles(_g13Pixi)
    pixiEvoRings(_g13Pixi)
  } else {
    // DOM fallback: particles
    const particleContainer = document.getElementById('g13-evo-particles')
    if (particleContainer) {
      particleContainer.innerHTML = ''
      const emojis = ['✨','⭐','💫','🌟','🔥','⚡','🌈']
      for (let i = 0; i < 25; i++) {
        const p = document.createElement('div')
        p.className = 'g13-evo-particle'
        p.textContent = emojis[Math.floor(Math.random() * emojis.length)]
        p.style.cssText = `left:${Math.random()*100}%;top:${50+Math.random()*50}%;animation-delay:${(Math.random()*3).toFixed(1)}s;animation-duration:${(2+Math.random()*3).toFixed(1)}s;font-size:${10+Math.floor(Math.random()*16)}px;`
        particleContainer.appendChild(p)
      }
    }
    // DOM fallback: rings
    const bgFlash = overlay.querySelector('.g13-evo-bg-flash')
    if (bgFlash) { const cl = bgFlash.cloneNode(true); bgFlash.replaceWith(cl) }
    overlay.querySelectorAll('.g13-evo-ring').forEach(r => { const cl = r.cloneNode(true); r.replaceWith(cl) })
  }

  overlay.style.display = 'flex'

  // Phase timeline
  // 0-2s: silhouette glowing
  // 2-4s: morph starts — silhouette begins blur
  setTimeout(() => {
    if (baseImg) {
      baseImg.style.animation = 'none'
      baseImg.style.transition = 'all 1.5s ease'
      baseImg.style.filter = 'brightness(0) invert(1) drop-shadow(0 0 60px white) drop-shadow(0 0 100px rgba(251,191,36,0.8))'
      baseImg.style.transform = 'scale(1.2)'
    }
    textEl.textContent = 'Cahaya evolusi!'
  }, 2000)

  // 4s: switch to evolved form
  setTimeout(() => {
    if (baseImg) { baseImg.style.opacity = '0'; baseImg.style.transform = 'scale(0.5)' }
    if (evolvedImg) { evolvedImg.style.transition = 'all 0.8s cubic-bezier(0.34,1.56,0.64,1)'; evolvedImg.style.opacity = '1'; evolvedImg.style.transform = 'scale(1.2)' }
    textEl.textContent = `Selamat! Bertransformasi!`
  }, 4000)

  // 5.5s: evolved form settles, name appears
  setTimeout(() => {
    if (evolvedImg) { evolvedImg.style.transform = 'scale(1)'; evolvedImg.style.filter = 'drop-shadow(0 0 20px rgba(249,115,22,0.8)) drop-shadow(0 0 40px rgba(251,191,36,0.5))' }
    nameEl.classList.add('show')
  }, 5500)

  // 7.5s: close overlay, update battle state
  setTimeout(() => {
    overlay.style.display = 'none'

    // Task #67: determine which stage just evolved (1, 2, or 3-Mega)
    const wasStage3 = s.evolved2 && s.chain.mega && !s.megaForm
    const wasStage2 = !wasStage3 && s.evolved && s.chain.evolved2 && !s.evolved2
    const nowForm = wasStage3 ? s.chain.mega : (wasStage2 ? s.chain.evolved2 : s.chain.evolved)

    if (wasStage3) {
      s.megaForm = true
    } else if (wasStage2) {
      s.evolved2 = true
    } else {
      s.evolved = true
    }

    // Reset evo bar for potential next stage
    s.evoPoints = 0
    g13UpdateEvoBar()

    // Update player sprite to new form (Task #67: local-first per Lesson L16)
    const pspr = document.getElementById('g13-pspr')
    if (pspr) {
      // Hotfix #104 (2026-04-28): shared cascade.
      const _eid = (typeof POKE_IDS2 !== 'undefined' && POKE_IDS2) ? POKE_IDS2[nowForm.slug] : null
      if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
        attachSpriteCascade(pspr, buildPokeSources(nowForm.slug, _eid), '⚡')
      } else {
        pspr.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(nowForm.slug)) || `https://img.pokemondb.net/sprites/home/normal/${nowForm.slug}.png`
      }
      // Mega form: 1.3x scale boost on top of normal final scale
      const megaScale = wasStage3 ? 1.3 : 1.0
      pspr.style.width = pspr.style.height = `calc(clamp(140px, min(34vw, 28vh), 280px) * ${pokeFinalScale(nowForm.slug) * megaScale})`
      applyPokeFlip(pspr, nowForm.slug, 'player')
      pspr.style.animation = 'none'; void pspr.offsetWidth
      pspr.style.animation = 'g13EnterFlip 0.6s cubic-bezier(0.34,1.56,0.64,1)'
      // Apply Mega aura overlay if stage 3
      if (wasStage3 && nowForm.aura) {
        applyMegaOverlay(pspr, nowForm)
      } else {
        clearMegaOverlay(pspr)
      }
    }
    // Update player info box
    document.getElementById('g13-pname').textContent = nowForm.name
    const ptype = document.getElementById('g13-ptype')
    ptype.textContent = nowForm.type
    ptype.style.background = nowForm.tc + '33'
    ptype.style.color = nowForm.tc
    ptype.style.border = `1px solid ${nowForm.tc}66`

    // Update chain badge
    const bdg = document.getElementById('g13-chain-badge')
    if (bdg) bdg.textContent = wasStage2 ? `⭐ ${nowForm.name} (MAX!)` : `⚡ ${nowForm.name}`

    // Bonus damage per evo stage
    s.cfg = { ...s.cfg, damage: wasStage2 ? 3 : 2 }

    document.getElementById('g13-qpanel').style.opacity = '1'
    document.getElementById('g13-qpanel').style.pointerEvents = ''
    s.phase = 'player_attack'
    s.attackIdx = 0
    s.locked = false
    const stageTxt = wasStage2 ? `${nowForm.name} FINAL FORM!` : `Evolved!`
    g13SetStatus(stageTxt, `${nowForm.name} siap menyerang!`)
    g13NextQuestion()
  }, 7500)
}

let _g13EvoAudio = null
function g13PlayEvoSfx() {
  try {
    if (!isSoundOn()) return
    // Use the Pokémon evolution MP3 if available
    if (!_g13EvoAudio) {
      _g13EvoAudio = new Audio('assets/pokemon-evolve.mp3')
      _g13EvoAudio.volume = 0.75
    }
    _g13EvoAudio.currentTime = 0
    _g13EvoAudio.play().catch(() => _g13PlayEvoSfxFallback())
  } catch(e) { _g13PlayEvoSfxFallback() }
}
function _g13PlayEvoSfxFallback() {
  try {
    if (!isSoundOn()) return
    const ctx = audioCtx
    const freqs = [220, 330, 440, 550, 660, 880, 1100, 1320]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'sine'
      const t = ctx.currentTime + i * 0.3
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.15, t + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      osc.start(t); osc.stop(t + 0.6)
    })
    const chordFreqs = [440, 550, 660, 880]
    chordFreqs.forEach(freq => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = freq; osc.type = 'triangle'
      const t = ctx.currentTime + 2.4
      gain.gain.setValueAtTime(0.12, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5)
      osc.start(t); osc.stop(t + 1.5)
    })
  } catch(e) {}
}

function g13Victory() {
  const s = g13State
  // Idempotency guard — Task #57 watchdog + primary path may both reach this.
  if (s.phase === 'victory' || s.phase === 'defeat') return
  s.phase = 'victory'
  battleBgmStop()
  try { playCorrect() } catch(_){}
  try { vibrate([30, 20, 40]) } catch(_){}

  // Wild defeat animation
  const wspr = document.getElementById('g13-wspr')
  if (wspr) { wspr.classList.add('spr-defeat') }

  // Victory stars: evolved2 = 5★, evolved once = 4★, no evo = 3★
  // Unified scoring via bonus modifier (perfect win base = 5, deduct per missed evolution)
  let perfStars = 3
  let _g13lv = 1
  try {
    const _g13EvoPenalty = s.evolved2 ? 0 : s.evolved ? -1 : -2
    perfStars = GameScoring.calc({ correct: 1, total: 1, bonus: _g13EvoPenalty })
    _g13lv = s.lv || 1
    // setLevelComplete uses 0-3 star scale for progress persistence; map perfStars (5/4/3 scale) to 3/2/1.
    // Prior code had this mapping INVERTED (>=5→3 but wrote the 0-3 value, causing display to show 3★ for a 5★ run).
    const _g13starsSaved = perfStars >= 5 ? 3 : perfStars >= 4 ? 2 : perfStars >= 3 ? 1 : 0
    setLevelComplete(13, _g13lv, _g13starsSaved)
    // Task #66: mark city as completed if region+city were selected
    if (state.selectedRegion && state.selectedCity && typeof setCityComplete === 'function') {
      setCityComplete(13, state.selectedRegion, state.selectedCity, _g13starsSaved)
    }
    saveStars()
    updateGameStarDisplay()
  } catch(e) { console.error('[G13] victory scoring crashed:', e, e && e.stack) }

  if (g13ResultTimeout) { clearTimeout(g13ResultTimeout); g13ResultTimeout = null }
  g13ResultTimeout = setTimeout(() => {
    g13ResultTimeout = null
    try {
      const finalForm = s.evolved2 ? s.chain.evolved2 : s.evolved ? s.chain.evolved : null
      const msg = s.evolved2
        ? `${s.chain.player.name}→${s.chain.evolved.name}→${s.chain.evolved2.name}! Evolusi sempurna!`
        : s.evolved
          ? `${s.chain.player.name} berhasil berevolusi menjadi ${s.chain.evolved.name}!`
          : `${s.chain.wild.name} dikalahkan — tapi ${s.chain.player.name} belum berevolusi!`
      const btns = [
        {label:'Main Lagi 🔄', action:()=>initGame13()},
      ]
      if((_g13lv||1) < 55) btns.unshift({label:'Level Berikutnya ➡️', action:()=>startGameWithLevel((_g13lv||1)+1)})
      btns.push({label:'Kembali ⌂', action:()=>exitGame()})
      showGameResult({ emoji:'🏆', title: finalForm ? `${finalForm.name} Menang!` : 'Kamu Menang!', stars:perfStars, msg, buttons:btns })
    } catch(e) {
      console.error('[G13] victory modal crashed — using minimal fallback:', e, e && e.stack)
      state._showingGameResult = false  // unstrand modal so retry works
      try {
        showGameResult({ emoji:'🏆', title:'Kamu Menang!', stars:perfStars, msg:'', buttons:[
          {label:'Main Lagi 🔄', action:()=>initGame13()},
          {label:'Kembali ⌂', action:()=>exitGame()}
        ]})
      } catch(_){}
    }
  }, 1000)
}

function g13Defeat() {
  const s = g13State
  if (s.phase === 'victory' || s.phase === 'defeat') return
  s.phase = 'defeat'
  battleBgmStop()
  try { playWrong() } catch(_){}
  try { vibrate([50, 30, 50]) } catch(_){}

  const pspr = document.getElementById('g13-pspr')
  if (pspr) { pspr.classList.add('spr-defeat') }

  if (g13ResultTimeout) { clearTimeout(g13ResultTimeout); g13ResultTimeout = null }
  g13ResultTimeout = setTimeout(() => {
    g13ResultTimeout = null
    showGameResult({
      emoji:'💔', title:'Kalah...', stars:0,
      msg: `${s.chain.wild.name} terlalu kuat! Coba lagi!`,
      buttons: [
        {label:'Main Lagi 🔄', action:()=>initGame13()},
        {label:'Kembali ⌂', action:()=>exitGame()}
      ]
    })
  }, 1200)
}

// ============================================================
// GAME 13B — QUICK FIRE ⚡ 60 Detik Serangan Matematika
// ============================================================
const G13B_MOBILE_BG = [
  'Gemini_Generated_Image_13vm6c13vm6c13vm.webp','Gemini_Generated_Image_3e7nl23e7nl23e7n.webp',
  'Gemini_Generated_Image_61gamh61gamh61ga.webp','Gemini_Generated_Image_dsnyj6dsnyj6dsny.webp',
  'Gemini_Generated_Image_klimtxklimtxklim.webp','Gemini_Generated_Image_ozk0zeozk0zeozk0.webp',
  'Gemini_Generated_Image_qor6mpqor6mpqor6.webp','Gemini_Generated_Image_sg3ymdsg3ymdsg3y.webp',
  'Gemini_Generated_Image_vaean7vaean7vaea.webp','Gemini_Generated_Image_w061r3w061r3w061.webp',
  'Gemini_Generated_Image_za0fyeza0fyeza0f.webp',
]
const G13B_PC_BG = [
  'Gemini_Generated_Image_26eyja26eyja26ey.webp','Gemini_Generated_Image_7k4vs27k4vs27k4v.webp',
  'Gemini_Generated_Image_8lzmsu8lzmsu8lzm.webp','Gemini_Generated_Image_dyn2nwdyn2nwdyn2.webp',
  'Gemini_Generated_Image_fr02m6fr02m6fr02.webp','Gemini_Generated_Image_h4dcu9h4dcu9h4dc.webp',
  'Gemini_Generated_Image_hzmzmhhzmzmhhzmz.webp','Gemini_Generated_Image_ocxx4aocxx4aocxx.webp',
  'Gemini_Generated_Image_u0otymu0otymu0ot.webp','Gemini_Generated_Image_wou0m2wou0m2wou0.webp',
  'Gemini_Generated_Image_yoxnghyoxnghyoxn.webp',
]

// Pokéball types for catch animation
const G13B_BALLS = [
  'pokeball','greatball','heavyball','repeatball','healball',
  'safariball','quickball','luxuryball','timerball','netball'
]

// Wild Pokémon pool — built dynamically from all non-legendary POKEMON_DB entries
const G13B_WILDS = POKEMON_DB
  .filter(p => !_LEGENDARY_IDS.has(p.id))
  .map(p => {
    const t = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : 'Normal'
    return { name: p.name, slug: p.slug, type: t, hp: 1, tier: p.tier || 1 }
  })

// Legendary Pokémon — every 10 kills, needs 3 hits — built from POKEMON_DB legendary IDs
const G13B_LEGENDARIES = (() => {
  const arr = POKEMON_DB
    .filter(p => _LEGENDARY_IDS.has(p.id))
    .map(p => {
      const t = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : 'Psychic'
      return { name: p.name, slug: p.slug, type: t, icon: '🌟', hp: 3, tier: p.tier || 4 }
    })
  // Fisher-Yates shuffle so order is random every page load
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
})()

let g13bState = {}
let g13bLastWildIdx = -1
let _g13bEvoAudio = null
let _g13bLegAutoAtk = null  // interval ID for legendary periodic attacks

function startQuickFire() {
  const lc = document.getElementById('g13b-level-complete')
  if (lc) lc.style.display = 'none'
  const r = document.getElementById('g13b-result')
  if (r) r.style.display = 'none'
  showScreen('screen-game13b')
  setTimeout(() => initGame13b(), 80)
}
window.startQuickFire = startQuickFire

// Task #72: G13b result "Main Lagi"/"Lanjut" — return to City picker if launched via city,
// else fallback to legacy startQuickFire random behavior.
function g13bResultMainLagi() {
  const r = document.getElementById('g13b-result'); if (r) r.style.display = 'none'
  const lc = document.getElementById('g13b-level-complete'); if (lc) lc.style.display = 'none'
  if (state.selectedRegion && state.selectedCity && typeof openRegionOverlay === 'function') {
    // Cleanup G13b state then return to selector
    if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
    try { battleBgmStop && battleBgmStop() } catch(_) {}
    try { PixiManager.destroy('g13b-pixi-canvas') } catch(_) {}
    showScreen('screen-welcome')
    setTimeout(() => openRegionOverlay('13b'), 60)
  } else {
    startQuickFire()
  }
}
window.g13bResultMainLagi = g13bResultMainLagi

// Hotfix #110 (2026-04-29): explicit exit cleanup for g10 + g13.
// Hotfix #111 (2026-04-29): append showScreen('screen-welcome') so back
// button goes HOME (matches g13b pattern). Removed non-existent IDs from
// reset list. Now also clears stuck inline styles + class flags via
// resetSprElCss helper that wipes display/opacity/animation/transform.
function _resetSprElCss(el) {
  if (!el) return
  el.style.display = ''
  el.style.opacity = '1'
  el.style.animation = ''
  el.style.transform = ''
  el.style.visibility = 'visible'
  el.classList.remove('spr-defeat','spr-hit','spr-flash','spr-atk','wild-die','wild-enter','spr-swap-out','spr-swap-in','wspr-hit')
}
function exitGame10() {
  state.paused = false
  try { document.getElementById('pause-overlay').style.display='none' } catch(_){}
  try { document.getElementById('settings-overlay').style.display='none' } catch(_){}
  battleBgmStop(); stopAllGameSounds(); clearTimers()
  try { if (typeof PixiManager !== 'undefined') PixiManager.destroy('g10-pixi-canvas') } catch(_){}
  ;['g10-pspr', 'g10-espr'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (typeof resetSpriteEl === 'function') resetSpriteEl(el)
    _resetSprElCss(el)
  })
  if (typeof flushSpriteQueue === 'function') flushSpriteQueue()
  showScreen('screen-welcome')
}
window.exitGame10 = exitGame10
function exitGame13() {
  state.paused = false
  try { document.getElementById('pause-overlay').style.display='none' } catch(_){}
  try { document.getElementById('settings-overlay').style.display='none' } catch(_){}
  battleBgmStop(); stopAllGameSounds(); clearTimers()
  try { if (typeof PixiManager !== 'undefined') PixiManager.destroy('g13-pixi-canvas') } catch(_){}
  ;['g13-pspr', 'g13-wspr'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (typeof resetSpriteEl === 'function') resetSpriteEl(el)
    _resetSprElCss(el)
  })
  if (typeof flushSpriteQueue === 'function') flushSpriteQueue()
  showScreen('screen-welcome')
}
window.exitGame13 = exitGame13

function exitGame13b() {
  if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
  battleBgmStop()
  // Restore battle BGM src for G10/G13
  if(_battleBgmEl) _battleBgmEl.src = 'assets/Pokemon/sound/06 Battle (VS Wild Pokémon)（１９９７－１９９８｜Ｍ１３） - Satoshi Sakai No Masta - SoundLoadMate.com.mp3'
  clearTimers()
  PixiManager.destroy('g13b-pixi-canvas')
  showScreen('screen-welcome')
}
window.exitGame13b = exitGame13b

function initGame13b() {
  // Task #84: defensive resets
  state._showingResult = false
  state._showingGameResult = false
  if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
  if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
  // G13b uses Ending theme instead of battle BGM
  if(!_battleBgmEl) _battleBgmEl = document.getElementById('battle-bgm')
  if(_battleBgmEl) _battleBgmEl.src = 'assets/Pokemon/sound/29 ~Ending~（１９９７－１９９８｜Ｍ２１） - Satoshi Sakai No Masta - SoundLoadMate.com.mp3'
  battleBgmPlay()
  // Hotfix #101-H: free any leftover Pixi context (see initGame10 for rationale)
  try { if (typeof PixiManager !== 'undefined') PixiManager.destroyAll() } catch(_){}
  loadPixiJS(function(){ PixiManager.init('g13b-pixi-canvas').catch(()=>{}) })
  // Hotfix #110/#111: reset sprite element state + flush queue + CSS reset.
  ;['g13b-pspr', 'g13b-wspr', 'g13b-leg-spr', 'g13b-catch-ball'].forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    if (typeof resetSpriteEl === 'function') resetSpriteEl(el)
    if (typeof _resetSprElCss === 'function') _resetSprElCss(el)
  })
  if (typeof flushSpriteQueue === 'function') flushSpriteQueue()

  // Task #66: prefer city-specific background if selected; else random pool
  const field = document.getElementById('g13b-field')
  const cityBgLoaded = loadCityBackground(field)
  if (!cityBgLoaded) {
    const isMobile = window.innerWidth < 768
    const pool = isMobile ? G13B_MOBILE_BG : G13B_PC_BG
    const folder = isMobile ? 'mobile' : 'pc'
    const pick = pool[Math.floor(Math.random() * pool.length)]
    if (field) {
      field.style.backgroundImage = `url('assets/Pokemon/g13b/background/${folder}/${encodeURIComponent(pick)}')`
      field.style.backgroundSize = 'cover'
      field.style.backgroundPosition = 'center 22%'
    }
  }

  // Clear any leftover legendary auto-attack timer from previous session
  if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
  // Hotfix 2026-04-28: clear transient overlay nodes that leaked across
  // sessions (combo bolts, catch stars, leg sprites) — caused freeze after
  // playing many rounds.
  try {
    const fld = document.getElementById('g13b-field')
    if (fld) {
      fld.querySelectorAll('.g13b-bolt, .g13b-catch-star').forEach(n => n.remove())
    }
    if (typeof _g13bEvoAudio !== 'undefined' && _g13bEvoAudio) {
      try { _g13bEvoAudio.pause(); _g13bEvoAudio.currentTime = 0 } catch(_){}
      _g13bEvoAudio = null
    }
  } catch(_){}
  // Register a one-time cleanup hook so visibilitychange (tab hidden) clears
  // running timers and audio. registerCleanupHook is provided by
  // games/data/freeze-watchdog.js.
  if (typeof window.registerCleanupHook === 'function' && !window.__g13bCleanupRegistered) {
    window.__g13bCleanupRegistered = true
    window.registerCleanupHook(function () {
      try { if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null } } catch(_){}
      try { if (_g13bEvoAudio) { _g13bEvoAudio.pause(); _g13bEvoAudio = null } } catch(_){}
    })
  }

  // Init state
  g13bState = {
    kills: 0, streak: 0, bestCombo: 0,
    isLegendary: false, wildHp: 1, wildMaxHp: 1,
    playerHp: 10, playerMaxHp: 10,
    locked: false, currentAnswer: 0, phase: 'playing',
    legendaryIdx: Math.floor(Math.random() * G13B_LEGENDARIES.length), currentWild: null,
  }

  // Hide result + legendary banner + badge
  const res = document.getElementById('g13b-result')
  if (res) res.style.display = 'none'
  const legBanner = document.getElementById('g13b-leg-banner')
  if (legBanner) legBanner.classList.add('hide')
  const legBadge = document.getElementById('g13b-leg-badge')
  if (legBadge) legBadge.style.display = 'none'

  // Player sprite + name: use saved selection or default Pikachu
  const pspr = document.getElementById('g13b-pspr')
  if (pspr) {
    const saved = g13bSavedPoke
    const pSlug = saved ? saved.slug : 'pikachu'
    const pId = saved && saved.id ? saved.id : (window.POKE_IDS ? window.POKE_IDS[pSlug] : null)
    // Task #71: local-first sprite. Hotfix 2026-04-28: cascade via shared
    // helper terminates after final fallback (no more onerror loop).
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      attachSpriteCascade(pspr, buildPokeSources(pSlug, pId), '⚡')
    } else {
      const localSrc = (typeof pokeSpriteAlt2 === 'function') ? pokeSpriteAlt2(pSlug) : null
      pspr.src = localSrc || pokeSpriteOnline(pSlug)
    }
    const pScale = pokeFinalScale(pSlug)
    pspr.style.width = pspr.style.height = pScale === 1.0 ? '' : `calc(clamp(80px, min(20vw, 18vh), 160px) * ${pScale})`
    applyPokeFlip(pspr, pSlug, 'player')
  }
  const pnameEl = document.getElementById('g13b-pname')
  if (pnameEl) pnameEl.textContent = g13bSavedPoke ? g13bSavedPoke.name : 'Pikachu'

  g13bRenderStreak()
  g13bUpdateKills()
  g13bUpdatePlayerHp()
  g13bSpawnWild()
}

function g13bSpawnWild() {
  const s = g13bState
  s.locked = false

  let wild
  if (s.isLegendary) {
    wild = G13B_LEGENDARIES[s.legendaryIdx % G13B_LEGENDARIES.length]
    s.wildHp = wild.hp; s.wildMaxHp = wild.hp
    const lb = document.getElementById('g13b-leg-badge')
    if (lb) lb.style.display = 'block'
  } else {
    // Task #66: prefer city pack pool if selected
    let pool = G13B_WILDS
    try {
      if (state && state.selectedRegion && state.selectedCity && typeof CITY_PACK !== 'undefined') {
        const region = CITY_PACK[state.selectedRegion]
        const city = region && region.cities && region.cities.find(c => c.slug === state.selectedCity)
        if (city && city.pack && city.pack.length >= 2) {
          // Map city pack to G13B_WILDS shape (id+slug+type+tier)
          const cityPool = []
          for (const cp of city.pack) {
            const dbEntry = POKEMON_DB.find(p => p.id === cp.id)
            if (dbEntry) {
              const t = dbEntry.type ? dbEntry.type.charAt(0).toUpperCase() + dbEntry.type.slice(1) : 'Normal'
              cityPool.push({ name: dbEntry.name, slug: dbEntry.slug, type: t, hp: 1, tier: dbEntry.tier || 1 })
            }
          }
          if (cityPool.length >= 2) pool = cityPool
        }
      }
    } catch(_) {}
    // Avoid immediate repeat
    let idx
    do { idx = Math.floor(Math.random() * pool.length) } while (idx === g13bLastWildIdx && pool.length > 1)
    g13bLastWildIdx = idx
    wild = pool[idx]
    s.wildHp = 1; s.wildMaxHp = 1
    const lb = document.getElementById('g13b-leg-badge')
    if (lb) lb.style.display = 'none'
  }
  s.currentWild = wild

  // Hotfix #101-C: probe-then-swap so sprite + name + status are atomic.
  // Previously `wspr.src = ...` (async load) and `wname.textContent = ...` (sync)
  // ran back-to-back. Browser keeps showing the previous sprite (e.g. Pikachu)
  // until network finishes, while the label flips immediately to "Bulbasaur".
  // User sees wrong sprite + correct label for 200-2000ms — looks like a bug.
  const wspr = document.getElementById('g13b-wspr')
  const wname = document.getElementById('g13b-wname')
  const _setNameAndPanel = () => {
    if (wname) wname.textContent = s.isLegendary ? `★ ${wild.name}` : wild.name
  }
  const _applyWildVisuals = (finalSrc) => {
    if (!wspr) return
    wspr.classList.remove('wild-enter','wild-die','wspr-hit')
    wspr.style.opacity = '1'
    wspr.src = finalSrc
    const tierScale = pokeFinalScale(wild.slug)
    wspr.style.width = wspr.style.height = tierScale === 1.0 ? '' : `calc(clamp(150px, min(40vw, 32vh), 320px) * ${tierScale})`
    applyPokeFlip(wspr, wild.slug, 'enemy')
    void wspr.offsetWidth
    wspr.classList.add('wild-enter')
    wspr.addEventListener('animationend', () => { try { wspr.classList.remove('wild-enter') } catch(_){} }, {once:true})
    _setNameAndPanel()
  }
  if (wspr) {
    const _wLocal = (typeof pokeSpriteAlt2 === 'function') ? pokeSpriteAlt2(wild.slug) : null
    const _wRemote = pokeSpriteOnline(wild.slug)
    const _wPrimary = _wLocal || _wRemote
    const _wSecondary = _wLocal ? _wRemote : null
    // Watchdog — if probe never fires in 1500ms (slow CDN, DNS hang), still update DOM
    let _settled = false
    const _settle = (src) => { if (_settled) return; _settled = true; _applyWildVisuals(src) }
    setTimeout(() => _settle(_wPrimary), 1500)
    const probe = new Image()
    probe.onload = function(){ probe.onload = probe.onerror = null; _settle(_wPrimary) }
    probe.onerror = function(){
      probe.onerror = probe.onload = null
      if (_wSecondary) {
        const probe2 = new Image()
        probe2.onload = function(){ probe2.onload = probe2.onerror = null; _settle(_wSecondary) }
        probe2.onerror = function(){
          probe2.onload = probe2.onerror = null
          // Last resort — show name + use whatever the browser-default broken-image is.
          // CSS sprite img max-width cap (Hotfix #101-F2) prevents it from stretching.
          _settle(_wSecondary)
        }
        probe2.src = _wSecondary
      } else {
        _settle(_wPrimary)
      }
    }
    probe.src = _wPrimary
  } else {
    // Sprite element missing — at least update name so UI text isn't stale.
    _setNameAndPanel()
  }

  g13bUpdateHpBar()

  // Start legendary periodic auto-attack (every 8s they attack even without wrong answer)
  if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
  if (s.isLegendary) {
    _g13bLegAutoAtk = setInterval(() => {
      const st = g13bState
      if (st.phase !== 'playing' || st.locked || st.playerHp <= 0 || !st.isLegendary) {
        clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null; return
      }
      // Task #62 — skip attack while paused. setInterval tick still fires on wall
      // clock (can't easily gate the timer itself), but the callback is a no-op so
      // player is never damaged while the game is paused.
      if (st.paused) return
      // Legendary fires an autonomous strike between questions
      st.locked = true
      g13bWildHitsPlayer(() => { st.locked = false })
    }, 14000)
  }

  g13bNextQuestion()
}

function g13bNextQuestion() {
  const s = g13bState
  if (s.phase !== 'playing') return

  // Hotfix #112-H: delegate to shared math-rules per user mandate.
  // Easy = anak TK / SD kelas 1 (basic + only at L<5). G13b runs as endless
  // mode → use kills as level proxy, max 40.
  const _diff = state.selectedLevel || 'easy'
  const _proxyLv = Math.min(40, Math.max(1, s.kills + 1))
  let q
  if (typeof window.makeGameQuestion === 'function') {
    q = window.makeGameQuestion(_proxyLv, 40, _diff)
  } else {
    // Fallback minimal — addition only.
    const a = Math.floor(Math.random() * 9) + 1, b = Math.floor(Math.random() * 9) + 1
    q = { q: `${a} + ${b} = ?`, ans: a + b, choices: [a+b, a+b+1, a+b-1, a+b+2].sort(()=>Math.random()-0.5) }
  }
  s.currentAnswer = q.ans
  s.questionStartTime = Date.now()
  s._g13bChoices = q.choices

  const mathEl = document.getElementById('g13b-math')
  if (mathEl) {
    mathEl.textContent = q.q
    mathEl.classList.remove('pop'); void mathEl.offsetWidth; mathEl.classList.add('pop')
  }
  const lbl = document.getElementById('g13b-atk-lbl')
  if (lbl) lbl.textContent = s.isLegendary ? `💥 LEGENDARY! Serang ${s.currentWild.name}!` : `⚡ Serang ${s.currentWild.name}!`

  // Hotfix #112-H: choices come from shared math-rules q.choices.
  const container = document.getElementById('g13b-choices')
  if (!container) return
  container.innerHTML = ''
  const choices = (s._g13bChoices && Array.isArray(s._g13bChoices)) ? s._g13bChoices : [q.ans]
  choices.forEach(val => {
    const btn = document.createElement('button')
    btn.className = 'g13b-choice-btn'
    btn.textContent = val
    btn.onclick = () => g13bAnswer(val, btn)
    container.appendChild(btn)
  })
}

function g13bAnswer(val, btn) {
  const s = g13bState
  if (s.locked || s.phase !== 'playing') return
  s.locked = true

  // Hotfix #112-H: support both numeric (math) + string (knowledge) answers.
  const correct = String(val) === String(s.currentAnswer)
  btn.classList.add(correct ? 'correct' : 'wrong')
  const container = document.getElementById('g13b-choices')
  if (container) container.querySelectorAll('.g13b-choice-btn').forEach(b => { b.disabled = true })

  if (correct) {
    playCorrect()
    vibrate(12)
    s.streak++
    if (s.streak > s.bestCombo) s.bestCombo = s.streak
    g13bRenderStreak()

    // Speed bonus: answer in <5 seconds
    const elapsed = Date.now() - (s.questionStartTime || Date.now())
    if (elapsed < 5000) {
      const field = document.getElementById('g13b-field')
      if (field) {
        const bonus = document.createElement('div')
        bonus.textContent = '⚡ CEPAT!'
        bonus.style.cssText = 'position:absolute;top:22%;left:50%;transform:translateX(-50%);font-size:20px;font-weight:900;font-family:"Fredoka One",cursive;color:#FDE047;text-shadow:0 2px 8px rgba(0,0,0,0.7);z-index:30;pointer-events:none;animation:g13bSpeedBonus 0.9s ease forwards;'
        field.appendChild(bonus)
        bonus.addEventListener('animationend', () => bonus.remove(), {once:true})
      }
    }

    // Player attack lunge
    const pspr = document.getElementById('g13b-pspr')
    if (pspr) { pspr.classList.remove('atk'); void pspr.offsetWidth; pspr.classList.add('atk'); setTimeout(()=>pspr.classList.remove('atk'),350) }

    // Field flash
    const flash = document.getElementById('g13b-flash')
    if (flash) { flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit') }

    // Wild hit animation (delayed slightly)
    setTimeout(() => {
      const wspr = document.getElementById('g13b-wspr')
      if (wspr) { wspr.classList.remove('wspr-hit'); void wspr.offsetWidth; wspr.classList.add('wspr-hit'); setTimeout(()=>wspr.classList.remove('wspr-hit'),380) }
    }, 180)

    // Particle burst
    try { spawnParticleBurst(btn.getBoundingClientRect().left + btn.offsetWidth/2, btn.getBoundingClientRect().top) } catch(e) {}

    // Aura ring around player Pokémon before attack — canonical spawnTypeAura helper
    try {
      const playerType = g13bSavedPoke ? g13bSavedPoke.type : 'Electric'
      spawnTypeAura(document.querySelector('.g13b-pspr-wrap'), playerType, 520)
    } catch(e) {}

    // Spawn attack projectile — type based on player's chosen Pokémon
    try {
      const playerType = g13bSavedPoke ? g13bSavedPoke.type : 'Electric'
      playAttackSound(playerType)
      g13SpawnAttackEffect(playerType, true, 'g13b-field')
      showMovePopup(document.getElementById('g13b-pspr-wrap'), getPokeMove(g13bSavedPoke ? g13bSavedPoke.slug : '', playerType), pokeTypeColor(playerType))
    } catch(e) {}

    // COMBO FX at streak >= 3
    if (s.streak >= 3) g13bShowCombo(s.streak)

    // Reduce wild HP
    s.wildHp = Math.max(0, s.wildHp - 1)
    g13bUpdateHpBar()

    setTimeout(() => {
      if (s.wildHp <= 0) {
        g13bKillWild()
      } else if (Math.random() < (s.isLegendary ? 0.40 : 0.20)) {
        // 40% counter-attack for legendary, 20% for regular wild
        g13bWildHitsPlayer(() => { s.locked = false; g13bNextQuestion() })
      } else {
        s.locked = false; g13bNextQuestion()
      }
    }, 480)
  } else {
    playWrong()
    vibrate(30)
    s.streak = 0
    g13bRenderStreak()
    const scr = document.getElementById('screen-game13b')
    if (scr) { scr.classList.remove('shake'); void scr.offsetWidth; scr.classList.add('shake'); setTimeout(()=>scr.classList.remove('shake'),400) }
    // Wrong answer → wild always attacks player
    g13bWildHitsPlayer(() => { s.locked = false; g13bNextQuestion() })
  }
}

function g13bKillWild() {
  const s = g13bState
  // Clear any legendary auto-attack timer
  if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
  const earnedKills = s.isLegendary ? 3 : 1
  const wasLegendary = s.isLegendary
  s.kills += earnedKills
  if (s.isLegendary) { s.legendaryIdx++; s.isLegendary = false }
  try { g13bUpdateKills() } catch(_){}

  // Wild sprite: flash white then shrink (absorbed)
  const wspr = document.getElementById('g13b-wspr')
  if (wspr) { wspr.classList.remove('wild-die'); void wspr.offsetWidth; wspr.classList.add('wild-die') }

  // Show Pokéball catch animation (legendary gets heavyball, others random)
  try { g13bShowCatch(wasLegendary) } catch(_){}

  // Legendary defeated → level complete; otherwise check for next legendary threshold
  if (wasLegendary) {
    setTimeout(() => g13bLevelComplete(), 1900)
    // Task #57 failsafe — if primary transition throws/doesn't fire, force-call within 3.5s
    setTimeout(() => {
      if (g13bState === s && s.phase !== 'done') {
        console.warn('[G13B] level-complete watchdog fired — forcing overlay')
        g13bLevelComplete()
      }
    }, 3500)
  } else {
    const prevKills = s.kills - earnedKills
    const newKills = s.kills
    const prevTens = Math.floor(prevKills / 10)
    const newTens = Math.floor(newKills / 10)
    if (newTens > prevTens) {
      setTimeout(() => g13bTriggerLegendary(), 1800)
    } else {
      // ~25% chance wild escapes and re-attacks before can be caught
      const escapeRoll = Math.random()
      if (!s.isLegendary && escapeRoll < 0.25 && s.kills >= 2) {
        setTimeout(() => g13bWildEscape(), 1800)
      } else {
        setTimeout(() => g13bSpawnWild(), 1700)
      }
    }
  }
}

function g13bWildEscape() {
  const s = g13bState
  if (s.phase !== 'playing') return
  // Show escape banner
  const field = document.getElementById('g13b-field')
  if (field) {
    const banner = document.createElement('div')
    banner.textContent = '💨 KABUR! Serang lagi!'
    banner.style.cssText = 'position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);font-size:18px;font-weight:900;font-family:"Fredoka One",cursive;color:#FCA5A5;background:rgba(0,0,0,0.75);border-radius:14px;padding:8px 18px;z-index:30;pointer-events:none;animation:g13bWildIn 0.35s ease;'
    field.appendChild(banner)
    setTimeout(() => banner.remove(), 1200)
  }
  // Re-spawn same wild at 60% HP
  const wild = s.currentWild
  if (wild) {
    s.wildHp = Math.max(2, Math.round((s.wildMaxHp || 3) * 0.6))
    const wspr = document.getElementById('g13b-wspr')
    if (wspr) {
      // Hotfix #104 (2026-04-28): shared cascade.
      if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
        attachSpriteCascade(wspr, buildPokeSources(wild.slug, wild.id), '👹')
      } else {
        wspr.src = (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(wild.slug)) || pokeSpriteOnline(wild.slug)
      }
      wspr.classList.remove('wild-enter', 'wild-die', 'wspr-hit')
      void wspr.offsetWidth
      wspr.classList.add('wild-enter')
    }
    g13bUpdateHpBar()
    setTimeout(() => { s.locked = false; g13bNextQuestion() }, 900)
  } else {
    setTimeout(() => g13bSpawnWild(), 1000)
  }
}

function g13bShowCatch(isLegendary) {
  const ballEl = document.getElementById('g13b-catch-ball')
  if (!ballEl) return

  // Pick ball type
  const ballName = isLegendary
    ? 'heavyball'
    : G13B_BALLS[Math.floor(Math.random() * G13B_BALLS.length)]
  ballEl.src = `assets/Pokemon/g13b/balls/${ballName}.svg`

  // Reset
  ballEl.classList.remove('popin', 'wobble')
  ballEl.style.display = 'none'

  // Step 1: After 220ms (wild die finishes fading) — ball pops in
  setTimeout(() => {
    ballEl.style.display = 'block'
    ballEl.classList.remove('wobble')
    void ballEl.offsetWidth
    ballEl.classList.add('popin')
  }, 220)

  // Step 2: After 220+380ms — wobble 3 times
  setTimeout(() => {
    ballEl.classList.remove('popin')
    void ballEl.offsetWidth
    ballEl.classList.add('wobble')
  }, 600)

  // Step 3: Stars burst at 700ms
  setTimeout(() => {
    const field = document.getElementById('g13b-field')
    if (!field) return
    const stars = ['⭐','✨','💫','🌟','⚡']
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const dist = 50 + Math.random() * 40
      const cx = Math.round(Math.cos(angle) * dist)
      const cy = Math.round(Math.sin(angle) * dist)
      const star = document.createElement('div')
      star.className = 'g13b-catch-star'
      star.textContent = stars[Math.floor(Math.random() * stars.length)]
      star.style.setProperty('--cx', cx + 'px')
      star.style.setProperty('--cy', cy + 'px')
      star.style.animationDelay = (i * 0.04).toFixed(2) + 's'
      field.appendChild(star)
      star.addEventListener('animationend', () => star.remove(), {once:true})
    }
  }, 700)

  // Step 4: Hide ball after animation completes
  setTimeout(() => {
    ballEl.classList.remove('popin', 'wobble')
    ballEl.style.display = 'none'
  }, 1650)
}

function g13bTriggerLegendary() {
  const s = g13bState
  s.phase = 'legendary_entrance'
  s.isLegendary = true

  const leg = G13B_LEGENDARIES[s.legendaryIdx % G13B_LEGENDARIES.length]

  // Legendary entrance banner
  const banner = document.getElementById('g13b-leg-banner')
  const legSpr = document.getElementById('g13b-leg-spr')
  const legSub = document.getElementById('g13b-leg-sub')
  if (banner) banner.classList.remove('hide')
  if (legSpr) {
    // Hotfix #117: cascade HD WebP first instead of direct 96px CDN assignment.
    if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
      if (typeof resetSpriteEl === 'function') resetSpriteEl(legSpr)
      attachSpriteCascade(legSpr, buildPokeSources(leg.slug, null), leg.icon || '🌟')
    } else {
      // LEGACY-FALLBACK-EXEMPT: only fires when cascade helpers unloaded.
      legSpr.src = `https://img.pokemondb.net/sprites/home/normal/${leg.slug}.png`
      legSpr.onerror = function(){ this.alt = leg.icon || '🌟' }
    }
  }
  if (legSub) legSub.textContent = `${leg.name} muncul! Butuh 3 serangan tepat!`

  // Golden flash + shake
  const flash = document.getElementById('g13b-flash')
  if (flash) {
    flash.style.background = 'rgba(251,191,36,0.75)'
    flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit')
    setTimeout(() => { if (flash) flash.style.background = 'white' }, 60)
  }
  const scr = document.getElementById('screen-game13b')
  if (scr) { scr.classList.remove('shake'); void scr.offsetWidth; scr.classList.add('shake') }

  // Spawn extra lightning bolts
  const field = document.getElementById('g13b-field')
  if (field) {
    for (let i = 0; i < 8; i++) {
      const bolt = document.createElement('div')
      bolt.className = 'g13b-bolt'
      bolt.textContent = '⚡'
      bolt.style.cssText = `left:${8 + Math.random()*84}%;top:${5 + Math.random()*70}%;font-size:${28+Math.floor(Math.random()*18)}px;animation-delay:${(i*0.07).toFixed(2)}s;`
      field.appendChild(bolt)
      bolt.addEventListener('animationend', () => bolt.remove(), {once:true})
    }
  }

  vibrate([80, 40, 80, 40, 120])

  // After 2.2s, hide banner and start legendary battle
  setTimeout(() => {
    if (banner) banner.classList.add('hide')
    s.phase = 'playing'
    g13bSpawnWild()
  }, 2200)
}

function g13bShowCombo(streak) {
  // Lightning bolts
  const field = document.getElementById('g13b-field')
  if (field) {
    const boltCount = Math.min(streak - 1, 7)
    for (let i = 0; i < boltCount; i++) {
      const bolt = document.createElement('div')
      bolt.className = 'g13b-bolt'
      bolt.textContent = streak >= 6 ? '🌟' : '⚡'
      bolt.style.cssText = `left:${10 + Math.random()*80}%;top:${8 + Math.random()*65}%;animation-delay:${(i*0.07).toFixed(2)}s;`
      field.appendChild(bolt)
      bolt.addEventListener('animationend', () => bolt.remove(), {once:true})
    }
  }
  const el = document.getElementById('g13b-combo')
  const txt = document.getElementById('g13b-combo-txt')
  const sub = document.getElementById('g13b-combo-sub')
  if (txt) txt.textContent = `COMBO x${streak}!`
  if (sub) sub.textContent = streak >= 7 ? '🔥 GILA! KAMU TERBAIK!' : streak >= 5 ? '🌟 LUAR BIASA!' : `${streak} serangan berturut!`
  // Pixi combo text — GPU-rendered burst text
  const _g13bPixi = PixiManager.get('g13b-pixi-canvas')
  if (_g13bPixi) {
    pixiComboText(_g13bPixi, `COMBO x${streak}!`)
  } else if (el) {
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show')
    el.addEventListener('animationend', () => el.classList.remove('show'), {once:true})
  }
}

function g13bRenderStreak() {
  const row = document.getElementById('g13b-streak-row')
  if (!row) return
  const dots = row.querySelectorAll('.g13b-streak-dot')
  const activeCount = g13bState.streak > 0 ? ((g13bState.streak - 1) % 3) + 1 : 0
  if (dots.length === 3) {
    dots.forEach((d, i) => { d.classList.toggle('active', i < activeCount) })
  } else {
    row.innerHTML = ''
    for (let i = 0; i < 3; i++) {
      const d = document.createElement('div')
      d.className = 'g13b-streak-dot' + (i < activeCount ? ' active' : '')
      row.appendChild(d)
    }
  }
}

function g13bUpdateHpBar() {
  const s = g13bState
  const fill = document.getElementById('g13b-hp-fill')
  const nums = document.getElementById('g13b-hp-nums')
  const pct = s.wildMaxHp > 0 ? (s.wildHp / s.wildMaxHp) * 100 : 0
  if (fill) { fill.style.width = `${pct}%`; fill.className = 'g13b-hp-fill' + (pct <= 33 ? ' low' : '') }
  if (nums) nums.textContent = `${s.wildHp}/${s.wildMaxHp}`
}

function g13bUpdatePlayerHp() {
  const s = g13bState
  const fill = document.getElementById('g13b-php-fill')
  const nums = document.getElementById('g13b-php-nums')
  const pct = s.playerMaxHp > 0 ? (s.playerHp / s.playerMaxHp) * 100 : 0
  if (fill) { fill.style.width = `${pct}%`; fill.className = 'g13b-php-fill' + (pct <= 33 ? ' low' : '') }
  if (nums) nums.textContent = `${s.playerHp}/${s.playerMaxHp}`
}

function g13bWildHitsPlayer(onDone) {
  const s = g13bState
  // Wild lunge animation
  const wspr = document.getElementById('g13b-wspr')
  if (wspr) { wspr.classList.remove('wild-atk'); void wspr.offsetWidth; wspr.classList.add('wild-atk'); setTimeout(()=>wspr.classList.remove('wild-atk'),400) }
  // Player sprite shakes
  const pspr = document.getElementById('g13b-pspr')
  if (pspr) { pspr.classList.remove('player-hit'); void pspr.offsetWidth; pspr.classList.add('player-hit'); setTimeout(()=>pspr.classList.remove('player-hit'),420) }
  // Red flash
  const flash = document.getElementById('g13b-flash')
  if (flash) { flash.classList.remove('hit','red-hit'); void flash.offsetWidth; flash.classList.add('red-hit') }
  // Move popup on wild sprite
  try { showMovePopup(document.getElementById('g13b-wspr-wrap'), getPokeMove(s.currentWild ? s.currentWild.slug : '', s.currentWild ? (s.currentWild.type||'Normal') : 'Normal'), null) } catch(e) {}
  // Status label
  const lbl = document.getElementById('g13b-atk-lbl')
  const prevLbl = lbl ? lbl.textContent : ''
  if (lbl) lbl.textContent = s.isLegendary
    ? `🌟 SERANGAN LEGENDARIS! ${s.currentWild ? s.currentWild.name : 'Wild'} menyerang!`
    : `💥 ${s.currentWild ? s.currentWild.name : 'Wild'} menyerang!`
  // Reduce player HP
  const dmg = s.isLegendary ? 2 : 1
  s.playerHp = Math.max(0, s.playerHp - dmg)
  g13bUpdatePlayerHp()
  playAttackSound(s.currentWild ? (s.currentWild.type||'normal') : 'normal')
  vibrate(25)
  setTimeout(() => {
    if (lbl && s.phase === 'playing') lbl.textContent = prevLbl
    if (s.playerHp <= 0) {
      g13bGameOver('defeated')
    } else {
      if (onDone) onDone()
    }
  }, 540)
}

function g13bUpdateKills() {
  const el = document.getElementById('g13b-kills')
  if (!el) return
  el.textContent = `💀 ${g13bState.kills}`
  el.classList.remove('pop-kill'); void el.offsetWidth; el.classList.add('pop-kill')
  el.addEventListener('animationend', () => el.classList.remove('pop-kill'), {once:true})
}

function g13bGameOver(reason) {
  const s = g13bState
  if (s.phase === 'done') return
  s.phase = 'done'
  if (_g13bLegAutoAtk) { clearInterval(_g13bLegAutoAtk); _g13bLegAutoAtk = null }
  battleBgmStop()

  const defeated = reason === 'defeated'
  // Task #99 (2026-04-27): direct threshold scoring. Previous bonus-modifier
  // pattern (GameScoring.calc with bonus = tier - 5) applied a perfect-run baseline
  // and deducted shortfall, producing absurd scores like 1★ for "completed" with
  // <5 kills. G13b is threshold-tier survival, NOT accuracy — bonus modifier was
  // semantically wrong here. Defeated = kills earned, completed = win + tier bonus.
  //   defeated: kills≥30→3★, kills≥15→2★, kills≥5→1★, else 0★
  //   completed (timer ran out, still alive): kills≥30→5★, kills≥15→4★, else 3★ (won)
  const stars = defeated
    ? (s.kills >= 30 ? 3 : s.kills >= 15 ? 2 : s.kills >= 5 ? 1 : 0)
    : (s.kills >= 30 ? 5 : s.kills >= 15 ? 4 : 3)
  // Task #66: mark city as completed for region/city progression (only if not defeated)
  try {
    if (!defeated && stars > 0 && state.selectedRegion && state.selectedCity && typeof setCityComplete === 'function') {
      // Hotfix 2026-04-28: removed legacy 5★→3★ capping. Save raw 1-5.
      setCityComplete('13b', state.selectedRegion, state.selectedCity, stars)
    }
  } catch(_) {}
  vibrate([30, 20, 50])
  try { if (stars >= 2) playCorrect() } catch(e) {}

  const delay = defeated ? 600 : 900
  // Task #93 (2026-04-26): unify with showGameResult engine (used by G13) instead of
  // custom #g13b-result modal — consistent style across all games per user feedback.
  setTimeout(() => {
    try {
      const emoji = defeated ? '💀' : (stars >= 3 ? '🏆' : stars >= 2 ? '⚡' : stars >= 1 ? '✨' : '😅')
      const title = defeated
        ? `${s.currentWild ? s.currentWild.name : 'Wild'} mengalahkanmu!`
        : (stars >= 3 ? 'Luar Biasa!' : stars >= 2 ? 'Keren Banget!' : stars >= 1 ? 'Bagus!' : 'Terus Berlatih!')
      const msg = defeated
        ? `HP habis setelah ${s.kills} kemenangan! Combo terbaik: x${s.bestCombo}`
        : `${s.kills} Pokémon dikalahkan • Combo: x${s.bestCombo}  •  Survive 60s!`
      const buttons = [
        { label: 'Main Lagi ⚡', action: () => g13bResultMainLagi() },
        { label: '⌂ Beranda', action: () => exitGame13b() }
      ]
      showGameResult({ emoji, title, stars, msg, buttons })
    } catch (e) {
      console.error('[g13bGameOver] showGameResult failed — fallback to legacy modal:', e, e && e.stack)
      state._showingGameResult = false  // unstrand modal so retry works
      const res = document.getElementById('g13b-result')
      if (res) res.style.display = 'flex'
    }
  }, delay)
}

function g13bLevelComplete() {
  const s = g13bState
  if (s.phase === 'done') return
  s.phase = 'done'
  battleBgmStop()

  // Hotfix #101-D (2026-04-27): legendary defeat = 5★ floor. User feedback on
  // Hotfix #99-C "Perfect harusnya score sempurna tapi ini 3 of 5" — they defeated
  // Terrakion with combo x15, 13 kills, and got 3★. The kill-count thresholds
  // (50/30) were arbitrary; defeating a legendary IS the win condition. Combo and
  // kills are pride bonuses, not gates. Drop to 4★ ONLY if very minimal effort.
  const stars = (s.bestCombo >= 5 || s.kills >= 5) ? 5 : 4
  // Hotfix #101 (D-supplement): persist city completion. g13bGameOver had this
  // but the legendary-victory path (this function) didn't — so users who won by
  // defeating the legendary saw their progress vanish.
  try {
    if (state.selectedRegion && state.selectedCity && typeof setCityComplete === 'function') {
      const _saved = stars >= 5 ? 3 : 2
      setCityComplete('13b', state.selectedRegion, state.selectedCity, _saved)
    }
    if (typeof setLevelComplete === 'function') {
      setLevelComplete('13b', state.selectedLevelNum || 1, stars >= 5 ? 3 : 2)
    }
  } catch(e) { console.warn('[g13bLevelComplete] save:', e, e && e.stack) }
  try { vibrate([50, 30, 80, 30, 120]) } catch(_){}
  try { playCorrect() } catch(e) {}

  // Fireworks burst on the field
  const field = document.getElementById('g13b-field')
  if (field) {
    const fx = ['🌟','✨','💫','⭐','🎉','🎊']
    for (let i = 0; i < 12; i++) {
      const bolt = document.createElement('div')
      bolt.className = 'g13b-bolt'
      bolt.textContent = fx[i % fx.length]
      bolt.style.cssText = `left:${5+Math.random()*90}%;top:${5+Math.random()*75}%;font-size:${22+Math.floor(Math.random()*16)}px;animation-delay:${(i*0.06).toFixed(2)}s;`
      field.appendChild(bolt)
      bolt.addEventListener('animationend', () => bolt.remove(), {once:true})
    }
  }

  setTimeout(() => {
    try {
      // Task #93 (2026-04-26): unify legendary level-complete modal via showGameResult
      const legName = s.currentWild ? s.currentWild.name : 'Legendary'
      const emoji = stars >= 5 ? '🏆' : stars >= 3 ? '🌟' : '⭐'
      const title = 'Level Selesai!'
      const msg = `${legName} berhasil ditaklukkan! • ${s.kills} Pokémon • Combo: x${s.bestCombo}`
      const buttons = [
        { label: 'Lanjut ▶', action: () => g13bResultMainLagi() },
        { label: '⌂ Beranda', action: () => exitGame13b() }
      ]
      showGameResult({ emoji, title, stars, msg, buttons })
    } catch (e) {
      console.error('[g13bLevelComplete] showGameResult failed — fallback to legacy modal:', e, e && e.stack)
      state._showingGameResult = false  // unstrand modal so retry works
      const overlay = document.getElementById('g13b-level-complete')
      if (overlay) overlay.style.display = 'flex'
    }
  }, 800)
  // Failsafe — force fallback overlay visible at 2.2s if showGameResult never displayed
  setTimeout(() => {
    const gr = document.getElementById('game-result-overlay')
    if (gr && !gr.classList.contains('show')) {
      console.warn('[G13B] level-complete watchdog — showGameResult missed, fallback to legacy')
      const overlay = document.getElementById('g13b-level-complete')
      if (overlay) overlay.style.display = 'flex'
    }
  }, 2200)
}

// ============================================================
// HELPER — called from in-game result overlays
// ============================================================
function endGameFromOverlay() {
  hideGameResult()
  endGame(state.gameStars[state.currentPlayer] || 3)
}

// ── Unified Game Result Overlay (G13-G18) ────────────────────
// Task #99 (2026-04-27): section-level try-catch + flag self-clear watchdog.
// G13b "crash semuanya" traced to unguarded DOM access here — single bad node
// killed the entire modal AND left _showingGameResult=true so retry was silent.
function showGameResult({ emoji, title, stars, msg, buttons }) {
  const activeScreen = document.querySelector('.screen.active')
  if (!activeScreen || !activeScreen.id.startsWith('screen-game')) return
  if (state._showingGameResult) return
  state._showingGameResult = true

  // Self-clearing watchdog: if any section throws BEFORE buttons wire up,
  // hideGameResult never fires — clear flag so user can retry.
  let _shown = false
  setTimeout(() => { if (!_shown) state._showingGameResult = false }, 4000)

  try {
    const evo = document.getElementById('g13-evo-overlay')
    if (evo) { evo.classList.remove('show'); evo.style.display = 'none'; evo.style.pointerEvents = 'none' }
  } catch(e) { console.warn('[showGameResult] evo cleanup:', e) }

  // SECTION 1: text content (CRITICAL)
  try {
    const safeStars = Math.min(Math.max(stars||0, 0), 5)
    const eEl = document.getElementById('gr-emoji'); if (eEl) eEl.textContent = emoji || '🏆'
    const tEl = document.getElementById('gr-title'); if (tEl) tEl.textContent = title || 'Selesai!'
    const sEl = document.getElementById('gr-stars'); if (sEl) sEl.textContent = '⭐'.repeat(safeStars) + '☆'.repeat(5-safeStars)
    const mEl = document.getElementById('gr-msg'); if (mEl) mEl.textContent = msg || ''
  } catch(e) { console.error('[showGameResult] text section:', e, e && e.stack) }

  // SECTION 2: buttons (CRITICAL — without these user has no exit)
  try {
    const btns = document.getElementById('gr-btns')
    if (btns) {
      btns.innerHTML = ''
      ;(buttons||[]).forEach((b, i) => {
        const el = document.createElement('button')
        el.className = 'gr-btn ' + (i === 0 ? 'gr-btn-primary' : 'gr-btn-secondary')
        el.textContent = b.label
        el.onclick = () => {
          try { playClick() } catch(_) {}
          try { hideGameResult() } catch(_) {}
          // Wrap action so misbehaving callback doesn't strand modal flag
          setTimeout(() => {
            try { b.action() }
            catch(actionErr) {
              console.error('[showGameResult] button action threw:', actionErr, actionErr && actionErr.stack)
              state._showingGameResult = false
            }
          }, 0)
        }
        btns.appendChild(el)
      })
    }
  } catch(e) { console.error('[showGameResult] buttons section:', e, e && e.stack) }

  // SECTION 3: show overlay (CRITICAL)
  try {
    const ov = document.getElementById('game-result-overlay')
    if (ov) { ov.classList.add('show'); _shown = true }
  } catch(e) { console.error('[showGameResult] show overlay:', e, e && e.stack) }
}
function hideGameResult() {
  state._showingGameResult = false
  document.getElementById('game-result-overlay').classList.remove('show')
}

// ============================================================
// GAME 14 — BALAPAN KERETA 🏁
// ============================================================

// Inline SVG steam locomotive builder — used for animated train in G14 + G17
function buildSteamLocoSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc  = cfg.bodyColor  || '#1a1a2e'
  const wc  = cfg.wheelColor || '#111130'
  const wa  = animate ? ' class="train-wheel"' : ''
  const hasTender = cfg.tender !== false

  const smokeHtml = animate ? `
    <circle class="train-smoke" cx="50" cy="6"   r="8"   fill="rgba(200,200,200,0.88)" style="animation-delay:0s"/>
    <circle class="train-smoke" cx="44" cy="0"   r="6"   fill="rgba(215,215,215,0.70)" style="animation-delay:0.20s"/>
    <circle class="train-smoke" cx="58" cy="-2"  r="7"   fill="rgba(185,185,185,0.60)" style="animation-delay:0.40s"/>
    <circle class="train-smoke" cx="37" cy="-6"  r="5"   fill="rgba(220,220,220,0.45)" style="animation-delay:0.60s"/>
    <circle class="train-smoke" cx="65" cy="-8"  r="6.5" fill="rgba(175,175,175,0.35)" style="animation-delay:0.80s"/>
    <circle class="train-smoke" cx="52" cy="-12" r="4.5" fill="rgba(205,205,205,0.25)" style="animation-delay:1.0s"/>` : ''

  const tenderHtml = hasTender ? `
    <rect x="140" y="32" width="48" height="26" rx="5" fill="${bc}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <rect x="142" y="28" width="44" height="10" rx="3" fill="${wc}"/>
    <ellipse cx="164" cy="28" rx="20" ry="5.5" fill="#1a1a1a"/>
    <rect x="186" y="46" width="12" height="5" rx="2.5" fill="#777"/>
    <circle${wa} cx="153" cy="61" r="9"  fill="${wc}" stroke="#aaa" stroke-width="1.5"/>
    <circle       cx="153" cy="61" r="3"  fill="#aaa"/>
    <circle${wa} cx="171" cy="61" r="9"  fill="${wc}" stroke="#aaa" stroke-width="1.5"/>
    <circle       cx="171" cy="61" r="3"  fill="#aaa"/>` : ''

  const rackHtml = cfg.rack ? `
    <rect x="32" y="65" width="90" height="5" rx="2" fill="#666" opacity="0.8"/>
    <rect x="37"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="48"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="59"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="70"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="81"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="92"  y="65" width="3" height="8" rx="1" fill="#999"/>
    <rect x="103" y="65" width="3" height="8" rx="1" fill="#999"/>` : ''

  const totalW = hasTender ? 200 : 148
  return `<svg viewBox="0 0 ${totalW} 74" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="${hasTender ? 96 : 72}" cy="72" rx="${hasTender ? 84 : 66}" ry="4" fill="rgba(0,0,0,0.22)"/>
  ${tenderHtml}
  <rect x="18" y="44" width="${hasTender ? 126 : 114}" height="7" rx="3" fill="${wc}"/>
  <rect x="22" y="24" width="${hasTender ? 118 : 106}" height="28" rx="11" fill="${bc}"/>
  <rect x="26" y="26" width="${hasTender ? 110 : 98}"  height="9"  rx="5"  fill="rgba(255,255,255,0.09)"/>
  <ellipse cx="24" cy="38" rx="11" ry="15" fill="${bc}"/>
  <ellipse cx="22" cy="38" rx="7.5" ry="11" fill="${wc}" opacity="0.55"/>
  <circle cx="18" cy="32" r="6.5" fill="#FFD166" opacity="0.92"/>
  <circle cx="18" cy="32" r="4"   fill="white"   opacity="0.85"/>
  <rect x="${hasTender ? 120 : 108}" y="12" width="26" height="40" rx="5" fill="${wc}"/>
  <rect x="${hasTender ? 117 : 105}" y="10" width="32" height="7"  rx="3" fill="${bc}"/>
  <rect x="${hasTender ? 124 : 112}" y="17" width="15" height="13" rx="3" fill="#87CEEB" opacity="0.88"/>
  <rect x="42" y="7"  width="11" height="19" rx="3" fill="${wc}"/>
  <rect x="38" y="5"  width="19" height="7"  rx="3" fill="${wc}"/>
  ${smokeHtml}
  <ellipse cx="80" cy="23" rx="15" ry="8" fill="${wc}"/>
  <ellipse cx="${hasTender ? 106 : 94}" cy="23" rx="9" ry="6" fill="${wc}"/>
  <rect    cx="${hasTender ? 109 : 97}" y="19" width="4" height="9" rx="2" fill="#999"/>
  <circle${wa} cx="36"  cy="60" r="9"  fill="${wc}" stroke="#999" stroke-width="1.5"/>
  <circle       cx="36"  cy="60" r="3"  fill="#aaa"/>
  <circle${wa} cx="60"  cy="58" r="14" fill="${wc}" stroke="#bbb" stroke-width="2"/>
  <circle       cx="60"  cy="58" r="5"  fill="#bbb"/>
  <circle${wa} cx="86"  cy="58" r="14" fill="${wc}" stroke="#bbb" stroke-width="2"/>
  <circle       cx="86"  cy="58" r="5"  fill="#bbb"/>
  <circle${wa} cx="112" cy="58" r="14" fill="${wc}" stroke="#bbb" stroke-width="2"/>
  <circle       cx="112" cy="58" r="5"  fill="#bbb"/>
  <rect x="60" y="56" width="52" height="4" rx="2" fill="#888"/>
  <rect x="18" y="54" width="46" height="5" rx="2.5" fill="#666"/>
  <!-- Contrasting body stripe for visibility -->
  <rect x="22" y="36" width="${hasTender ? 116 : 104}" height="4" rx="2" fill="${cfg.stripeColor || '#FFD166'}" opacity="0.80"/>
  ${rackHtml}
</svg>`
}

// Modern/electric train inline SVG (for header icon display)
// Task #81 (2026-04-26): Removed buildModernTrainSVG (dead code, never invoked).
// Replaced by `buildDieselLocoSVG` for all train rendering paths.

// Inline SVG diesel locomotive builder
function buildDieselLocoSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor  || '#1B5E20'
  const ac = cfg.accentColor || '#FFD166'
  const wa = animate ? ' class="train-wheel"' : ''
  const dieselSmokeHtml = animate ? `
    <circle class="diesel-smoke" cx="88" cy="13" r="7"   fill="rgba(20,20,20,0.92)" style="animation-delay:0s"/>
    <circle class="diesel-smoke" cx="80" cy="8"  r="5.5" fill="rgba(30,30,30,0.78)" style="animation-delay:0.18s"/>
    <circle class="diesel-smoke" cx="96" cy="5"  r="6.5" fill="rgba(10,10,10,0.65)" style="animation-delay:0.36s"/>
    <circle class="diesel-smoke" cx="74" cy="0"  r="4.5" fill="rgba(40,40,40,0.50)" style="animation-delay:0.54s"/>
    <circle class="diesel-smoke" cx="100" cy="-2" r="5" fill="rgba(15,15,15,0.38)" style="animation-delay:0.72s"/>` : ''
  return `<svg viewBox="0 0 200 72" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="100" cy="70" rx="88" ry="4" fill="rgba(0,0,0,0.22)"/>
  <rect x="10"  y="32" width="120" height="28" rx="5"   fill="${bc}"/>
  <rect x="10"  y="30" width="120" height="8"  rx="3"   fill="rgba(255,255,255,0.1)"/>
  <rect x="130" y="18" width="52"  height="42" rx="7"   fill="${bc}"/>
  <rect x="128" y="15" width="56"  height="9"  rx="4"   fill="${ac}" opacity="0.88"/>
  <rect x="136" y="24" width="38"  height="22" rx="4"   fill="rgba(135,206,235,0.88)"/>
  <circle cx="14" cy="40" r="5.5" fill="#FFD166" opacity="0.9"/>
  <circle cx="14" cy="40" r="3.5" fill="white"   opacity="0.85"/>
  <rect x="22"  y="34" width="3"  height="20" rx="1.5" fill="rgba(0,0,0,0.28)"/>
  <rect x="30"  y="34" width="3"  height="20" rx="1.5" fill="rgba(0,0,0,0.28)"/>
  <rect x="38"  y="34" width="3"  height="20" rx="1.5" fill="rgba(0,0,0,0.28)"/>
  <rect x="46"  y="34" width="3"  height="20" rx="1.5" fill="rgba(0,0,0,0.28)"/>
  <rect x="10"  y="44" width="120" height="5" rx="2"   fill="${ac}" opacity="0.65"/>
  <rect x="84"  y="20" width="8"  height="16" rx="3"   fill="#333"/>
  <rect x="80"  y="16" width="16" height="7"  rx="3"   fill="#555"/>
  ${dieselSmokeHtml}
  <circle${wa} cx="38"  cy="62" r="9"  fill="#2a2a2a" stroke="#888" stroke-width="1.5"/>
  <circle       cx="38"  cy="62" r="3.5" fill="#aaa"/>
  <circle${wa} cx="64"  cy="62" r="9"  fill="#2a2a2a" stroke="#888" stroke-width="1.5"/>
  <circle       cx="64"  cy="62" r="3.5" fill="#aaa"/>
  <circle${wa} cx="90"  cy="62" r="9"  fill="#2a2a2a" stroke="#888" stroke-width="1.5"/>
  <circle       cx="90"  cy="62" r="3.5" fill="#aaa"/>
  <circle${wa} cx="152" cy="62" r="9"  fill="#2a2a2a" stroke="#888" stroke-width="1.5"/>
  <circle       cx="152" cy="62" r="3.5" fill="#aaa"/>
  <circle${wa} cx="176" cy="62" r="9"  fill="#2a2a2a" stroke="#888" stroke-width="1.5"/>
  <circle       cx="176" cy="62" r="3.5" fill="#aaa"/>
  <rect x="10" y="56" width="168" height="5" rx="2.5" fill="rgba(0,0,0,0.3)"/>
</svg>`
}

// Inline SVG electric/bullet train builder
function buildElectricLocoSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor  || '#1a1a6b'
  const ac = cfg.accentColor || '#00b4d8'
  const wa = animate ? ' class="train-wheel"' : ''
  const sparkHtml = animate ? `
    <polyline class="elec-spark"  points="25,6  18,1  26,4  19,-1" fill="none" stroke="#00f5ff" stroke-width="1.8" stroke-linecap="round"/>
    <polyline class="elec-spark2" points="25,7  30,2  24,5  31,0"  fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
    <circle class="elec-spark"  cx="20" cy="-1" r="2" fill="#00f5ff" opacity="0.9"/>
    <circle class="elec-spark2" cx="31" cy="0"  r="1.5" fill="#ffffff" opacity="0.7"/>
    <polyline class="elec-spark"  points="23,7  17,3  25,5" fill="none" stroke="${ac}" stroke-width="1.5" stroke-linecap="round"/>` : ''
  return `<svg viewBox="0 0 220 64" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="110" cy="62" rx="96" ry="4" fill="rgba(0,0,0,0.2)"/>
  <polygon points="10,52 2,38 2,22 10,12" fill="${bc}"/>
  <rect x="10"  y="12" width="185" height="40" rx="6"  fill="${bc}"/>
  <rect x="10"  y="12" width="185" height="12" rx="6"  fill="rgba(255,255,255,0.13)"/>
  <rect x="195" y="12" width="20"  height="40" rx="6"  fill="${bc}"/>
  <rect x="10"  y="32" width="185" height="5"  rx="2"  fill="${ac}" opacity="0.75"/>
  <circle cx="5"  cy="28" r="5.5" fill="#FFD166" opacity="0.92"/>
  <rect x="24"  y="18" width="30" height="18" rx="4"   fill="rgba(135,206,235,0.88)"/>
  <rect x="68"  y="18" width="30" height="18" rx="4"   fill="rgba(135,206,235,0.88)"/>
  <rect x="118" y="18" width="30" height="18" rx="4"   fill="rgba(135,206,235,0.88)"/>
  <rect x="160" y="18" width="25" height="18" rx="4"   fill="rgba(135,206,235,0.88)"/>
  <rect x="8"   y="8"  width="40" height="5"  rx="2.5" fill="#555"/>
  <rect x="20"  y="5"  width="15" height="5"  rx="2"   fill="#777"/>
  ${sparkHtml}
  <circle${wa} cx="44"  cy="54" r="8" fill="#222" stroke="#999" stroke-width="1.5"/>
  <circle       cx="44"  cy="54" r="3" fill="#aaa"/>
  <circle${wa} cx="84"  cy="54" r="8" fill="#222" stroke="#999" stroke-width="1.5"/>
  <circle       cx="84"  cy="54" r="3" fill="#aaa"/>
  <circle${wa} cx="128" cy="54" r="8" fill="#222" stroke="#999" stroke-width="1.5"/>
  <circle       cx="128" cy="54" r="3" fill="#aaa"/>
  <circle${wa} cx="170" cy="54" r="8" fill="#222" stroke="#999" stroke-width="1.5"/>
  <circle       cx="170" cy="54" r="3" fill="#aaa"/>
</svg>`
}

// ===== HOOD DIESEL (CC201, CC203 — Indonesian GE/EMD hood unit, C-C bogies) =====
function buildHoodDieselSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#1B5E20'
  const ac = cfg.accentColor || '#FFD166'
  const wa = animate ? ' class="train-wheel"' : ''
  const smk = animate ? `
    <circle class="diesel-smoke" cx="68" cy="10" r="7"   fill="rgba(16,16,16,0.92)" style="animation-delay:0s"/>
    <circle class="diesel-smoke" cx="60" cy="5"  r="5.5" fill="rgba(24,24,24,0.76)" style="animation-delay:0.2s"/>
    <circle class="diesel-smoke" cx="76" cy="3"  r="6"   fill="rgba(8,8,8,0.62)"    style="animation-delay:0.4s"/>
    <circle class="diesel-smoke" cx="54" cy="-1" r="4.5" fill="rgba(30,30,30,0.48)" style="animation-delay:0.6s"/>` : ''
  return `<svg viewBox="0 0 215 72" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="107" cy="70" rx="92" ry="4" fill="rgba(0,0,0,0.25)"/>
  <rect x="8" y="45" width="199" height="11" rx="3" fill="#0d0d0d"/>
  <!-- Long hood (machinery section) -->
  <rect x="62" y="20" width="140" height="33" rx="5" fill="${bc}"/>
  <!-- Hood grille vents -->
  <rect x="76"  y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="86"  y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="96"  y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="106" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="116" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="128" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="138" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="150" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="160" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="170" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <rect x="180" y="25" width="3" height="22" rx="1" fill="rgba(0,0,0,0.42)"/>
  <!-- Exhaust stack -->
  <rect x="68" y="10" width="10" height="12" rx="3" fill="#222"/>
  <rect x="65" y="7"  width="16" height="6"  rx="2" fill="#333"/>
  ${smk}
  <!-- Hood accent stripe -->
  <rect x="62" y="40" width="140" height="4" rx="2" fill="${ac}" opacity="0.88"/>
  <!-- Short walkway -->
  <rect x="36" y="26" width="28" height="27" rx="3" fill="${bc}" opacity="0.82"/>
  <!-- Cab (front, left) -->
  <rect x="8"  y="15" width="32" height="38" rx="5" fill="${bc}"/>
  <rect x="6"  y="13" width="36" height="9"  rx="3" fill="${ac}" opacity="0.92"/>
  <rect x="12" y="21" width="11" height="15" rx="3" fill="rgba(135,206,235,0.92)"/>
  <rect x="26" y="21" width="10" height="15" rx="3" fill="rgba(135,206,235,0.92)"/>
  <circle cx="10" cy="40" r="6.5" fill="#FFD166" opacity="0.95"/>
  <circle cx="10" cy="40" r="3.8" fill="white"   opacity="0.9"/>
  <rect x="13" y="37" width="22" height="7" rx="2" fill="rgba(0,0,0,0.55)"/>
  <!-- Couplers -->
  <rect x="2"   y="46" width="9" height="8" rx="2" fill="#555"/>
  <rect x="204" y="46" width="9" height="8" rx="2" fill="#555"/>
  <!-- C bogie 1 (3 axles) -->
  <rect x="10" y="56" width="78" height="10" rx="4" fill="#181818" stroke="#555" stroke-width="1"/>
  <circle${wa} cx="22"  cy="63" r="7" fill="#282828" stroke="#888" stroke-width="1.5"/><circle cx="22"  cy="63" r="2.5" fill="#aaa"/>
  <circle${wa} cx="42"  cy="63" r="7" fill="#282828" stroke="#888" stroke-width="1.5"/><circle cx="42"  cy="63" r="2.5" fill="#aaa"/>
  <circle${wa} cx="62"  cy="63" r="7" fill="#282828" stroke="#888" stroke-width="1.5"/><circle cx="62"  cy="63" r="2.5" fill="#aaa"/>
  <!-- C bogie 2 (3 axles) -->
  <rect x="125" y="56" width="78" height="10" rx="4" fill="#181818" stroke="#555" stroke-width="1"/>
  <circle${wa} cx="137" cy="63" r="7" fill="#282828" stroke="#888" stroke-width="1.5"/><circle cx="137" cy="63" r="2.5" fill="#aaa"/>
  <circle${wa} cx="157" cy="63" r="7" fill="#282828" stroke="#888" stroke-width="1.5"/><circle cx="157" cy="63" r="2.5" fill="#aaa"/>
  <circle${wa} cx="177" cy="63" r="7" fill="#282828" stroke="#888" stroke-width="1.5"/><circle cx="177" cy="63" r="2.5" fill="#aaa"/>
  <rect x="80" y="52" width="42" height="8" rx="3" fill="#080808"/>
</svg>`
}

// ===== DUAL-CAB DIESEL (CC206 — cabs at both ends, C-C bogies) =====
function buildDualCabSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#1a2a4a'
  const ac = cfg.accentColor || '#ff6600'
  const wa = animate ? ' class="train-wheel"' : ''
  const smk = animate ? `
    <circle class="diesel-smoke" cx="112" cy="10" r="7"   fill="rgba(16,16,16,0.92)" style="animation-delay:0s"/>
    <circle class="diesel-smoke" cx="104" cy="5"  r="5.5" fill="rgba(24,24,24,0.75)" style="animation-delay:0.22s"/>
    <circle class="diesel-smoke" cx="120" cy="3"  r="6"   fill="rgba(8,8,8,0.60)"    style="animation-delay:0.44s"/>` : ''
  return `<svg viewBox="0 0 230 70" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="115" cy="68" rx="100" ry="4" fill="rgba(0,0,0,0.25)"/>
  <rect x="8" y="46" width="214" height="10" rx="3" fill="#0a0a0a"/>
  <!-- Body full length -->
  <rect x="10" y="18" width="210" height="32" rx="6" fill="${bc}"/>
  <rect x="10" y="18" width="210" height="10" rx="6" fill="rgba(255,255,255,0.1)"/>
  <!-- Front cab (LEFT) -->
  <rect x="8"  y="13" width="54" height="39" rx="6" fill="${bc}"/>
  <rect x="6"  y="11" width="58" height="10" rx="4" fill="${ac}" opacity="0.95"/>
  <rect x="14" y="20" width="17" height="18" rx="4" fill="rgba(135,206,235,0.92)"/>
  <rect x="35" y="20" width="17" height="18" rx="4" fill="rgba(135,206,235,0.92)"/>
  <circle cx="9"  cy="40" r="7" fill="#FFD166" opacity="0.95"/><circle cx="9" cy="40" r="4" fill="white" opacity="0.9"/>
  <!-- Rear cab (RIGHT) — mirrored -->
  <rect x="168" y="13" width="54" height="39" rx="6" fill="${bc}"/>
  <rect x="166" y="11" width="58" height="10" rx="4" fill="${ac}" opacity="0.95"/>
  <rect x="178" y="20" width="17" height="18" rx="4" fill="rgba(135,206,235,0.92)"/>
  <rect x="199" y="20" width="17" height="18" rx="4" fill="rgba(135,206,235,0.92)"/>
  <circle cx="221" cy="40" r="7" fill="#FFD166" opacity="0.65"/><circle cx="221" cy="40" r="4" fill="white" opacity="0.6"/>
  <!-- Engine hood (centre) -->
  <rect x="62" y="16" width="106" height="36" rx="4" fill="${bc}"/>
  <rect x="70"  y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="79"  y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="88"  y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="100" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="109" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="118" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="130" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="139" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="148" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <rect x="157" y="22" width="3" height="24" rx="1" fill="rgba(0,0,0,0.45)"/>
  <!-- Exhaust -->
  <rect x="107" y="6"  width="10" height="12" rx="3" fill="#222"/>
  <rect x="104" y="3"  width="16" height="6"  rx="2" fill="#333"/>
  ${smk}
  <!-- Full-length accent stripe -->
  <rect x="10" y="42" width="210" height="4" rx="2" fill="${ac}" opacity="0.82"/>
  <rect x="2"  y="46" width="10" height="8" rx="2" fill="#555"/>
  <rect x="218" y="46" width="10" height="8" rx="2" fill="#555"/>
  <!-- Bogie 1 — C (left) -->
  <rect x="10" y="55" width="90" height="10" rx="4" fill="#181818" stroke="#444" stroke-width="1"/>
  <circle${wa} cx="22"  cy="62" r="7" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="22"  cy="62" r="2.5" fill="#aaa"/>
  <circle${wa} cx="42"  cy="62" r="7" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="42"  cy="62" r="2.5" fill="#aaa"/>
  <circle${wa} cx="62"  cy="62" r="7" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="62"  cy="62" r="2.5" fill="#aaa"/>
  <!-- Bogie 2 — C (right) -->
  <rect x="130" y="55" width="90" height="10" rx="4" fill="#181818" stroke="#444" stroke-width="1"/>
  <circle${wa} cx="142" cy="62" r="7" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="142" cy="62" r="2.5" fill="#aaa"/>
  <circle${wa} cx="162" cy="62" r="7" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="162" cy="62" r="2.5" fill="#aaa"/>
  <circle${wa} cx="182" cy="62" r="7" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="182" cy="62" r="2.5" fill="#aaa"/>
</svg>`
}

// ===== EMU (KRL, LRT, MRT — commuter multiple unit, cabs at both ends) =====
function buildEmuSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#0D47A1'
  const ac = cfg.accentColor || '#e53935'
  const wa = animate ? ' class="train-wheel"' : ''
  const spk = animate ? `
    <polyline class="elec-spark"  points="90,4 84,1 92,3 86,-2" fill="none" stroke="#00f5ff" stroke-width="1.8" stroke-linecap="round"/>
    <circle   class="elec-spark2" cx="84" cy="-2" r="1.8" fill="#fff"/>` : ''
  return `<svg viewBox="0 0 250 62" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="125" cy="60" rx="110" ry="4" fill="rgba(0,0,0,0.2)"/>
  <!-- Rear car body -->
  <rect x="152" y="16" width="86" height="34" rx="5" fill="${bc}"/>
  <rect x="152" y="16" width="86" height="10" rx="5" fill="rgba(255,255,255,0.12)"/>
  <rect x="162" y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="182" y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="202" y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="222" y="22" width="12" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <!-- Inter-car bellows -->
  <rect x="140" y="22" width="14" height="26" rx="3" fill="rgba(0,0,0,0.45)"/>
  <!-- Front car (cab) -->
  <polygon points="10,50 2,38 2,26 10,16" fill="${bc}"/>
  <rect x="10" y="14" width="132" height="36" rx="6" fill="${bc}"/>
  <rect x="10" y="14" width="132" height="11" rx="6" fill="rgba(255,255,255,0.12)"/>
  <!-- Accent stripe full length -->
  <rect x="2"  y="38" width="236" height="5" rx="2.5" fill="${ac}" opacity="0.92"/>
  <!-- Headlights -->
  <circle cx="4"  cy="28" r="5.5" fill="#FFD166" opacity="0.95"/><circle cx="4" cy="28" r="3" fill="white" opacity="0.9"/>
  <circle cx="4"  cy="44" r="3.5" fill="#FF6B35" opacity="0.85"/>
  <!-- Panoramic front window -->
  <rect x="14" y="20" width="24" height="17" rx="4" fill="rgba(135,206,235,0.92)"/>
  <!-- Side windows -->
  <rect x="46"  y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="66"  y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="86"  y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <rect x="106" y="22" width="14" height="13" rx="3" fill="rgba(135,206,235,0.88)"/>
  <!-- Pantograph -->
  <rect x="80" y="8" width="40" height="4" rx="2" fill="#555"/>
  <rect x="87" y="4" width="26" height="4" rx="2" fill="#777"/>
  <rect x="94" y="1" width="12" height="4" rx="1.5" fill="#888"/>
  ${spk}
  <!-- Bogies — front car -->
  <rect x="14" y="50" width="50" height="8" rx="3" fill="#111" stroke="#444" stroke-width="1"/>
  <circle${wa} cx="24" cy="56" r="6" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="24" cy="56" r="2" fill="#aaa"/>
  <circle${wa} cx="52" cy="56" r="6" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="52" cy="56" r="2" fill="#aaa"/>
  <rect x="82" y="50" width="50" height="8" rx="3" fill="#111" stroke="#444" stroke-width="1"/>
  <circle${wa} cx="92"  cy="56" r="6" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="92"  cy="56" r="2" fill="#aaa"/>
  <circle${wa} cx="120" cy="56" r="6" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="120" cy="56" r="2" fill="#aaa"/>
  <!-- Bogies — rear car -->
  <rect x="164" y="50" width="62" height="8" rx="3" fill="#111" stroke="#444" stroke-width="1"/>
  <circle${wa} cx="176" cy="56" r="6" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="176" cy="56" r="2" fill="#aaa"/>
  <circle${wa} cx="212" cy="56" r="6" fill="#222" stroke="#888" stroke-width="1.5"/><circle cx="212" cy="56" r="2" fill="#aaa"/>
</svg>`
}

// ===== SHINKANSEN 0 SERIES (round bullet nose, 1964 Tokyo Olympics) =====
function buildShinkansen0SVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#f0f0f0'
  const ac = cfg.accentColor || '#0052cc'
  const wa = animate ? ' class="train-wheel"' : ''
  const spk = animate ? `
    <polyline class="elec-spark"  points="98,4 92,1 100,3" fill="none" stroke="#ffd700" stroke-width="1.5" stroke-linecap="round"/>
    <circle   class="elec-spark2" cx="92" cy="0" r="1.5" fill="#fff"/>` : ''
  return `<svg viewBox="0 0 265 60" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="130" cy="58" rx="114" ry="4" fill="rgba(0,0,0,0.16)"/>
  <!-- Main body -->
  <rect x="40" y="14" width="216" height="36" rx="4" fill="${bc}" stroke="rgba(200,200,200,0.5)" stroke-width="0.8"/>
  <rect x="40" y="14" width="216" height="11" rx="4" fill="rgba(0,0,0,0.03)"/>
  <!-- Iconic ROUND/OVAL nose — the defining 0-series shape -->
  <ellipse cx="34" cy="32" rx="30" ry="22" fill="${bc}" stroke="rgba(200,200,200,0.5)" stroke-width="0.8"/>
  <!-- Blue belly stripe (iconic) -->
  <rect x="4"  y="35" width="252" height="9"  rx="2" fill="${ac}" opacity="0.95"/>
  <!-- Thin upper accent line -->
  <rect x="40" y="27" width="216" height="3.5" rx="1.5" fill="${ac}" opacity="0.5"/>
  <!-- Large circular front window (signature) -->
  <circle cx="32" cy="26" r="13" fill="rgba(100,180,255,0.18)"/>
  <circle cx="32" cy="26" r="10" fill="rgba(135,206,235,0.88)"/>
  <circle cx="32" cy="26" r="7"  fill="rgba(165,220,255,0.92)"/>
  <!-- Headlights (2 small below window) -->
  <circle cx="20" cy="42" r="4.5" fill="#FFD166" opacity="0.92"/><circle cx="20" cy="42" r="2.5" fill="white" opacity="0.9"/>
  <circle cx="40" cy="43" r="3"   fill="#FFD166" opacity="0.72"/>
  <!-- Windows (0-series: square with rounded corners) -->
  <rect x="56"  y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="78"  y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="100" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="122" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="144" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="166" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="188" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="210" y="19" width="15" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <rect x="233" y="19" width="16" height="14" rx="3" fill="rgba(135,206,235,0.85)"/>
  <!-- Pantograph -->
  <rect x="86" y="7" width="44" height="5" rx="2.5" fill="#666"/>
  <rect x="94" y="3" width="28" height="5" rx="2"   fill="#888"/>
  <rect x="102" y="0" width="12" height="4" rx="1.5" fill="#999"/>
  ${spk}
  <!-- Bogies (4 shown for 0-series 16-car train feel) -->
  <rect x="42"  y="50" width="50" height="8" rx="3" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
  <circle${wa} cx="52"  cy="56" r="6" fill="#1a1a1a" stroke="#999" stroke-width="1.5"/><circle cx="52"  cy="56" r="2" fill="#ccc"/>
  <circle${wa} cx="80"  cy="56" r="6" fill="#1a1a1a" stroke="#999" stroke-width="1.5"/><circle cx="80"  cy="56" r="2" fill="#ccc"/>
  <rect x="110" y="50" width="50" height="8" rx="3" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
  <circle${wa} cx="120" cy="56" r="6" fill="#1a1a1a" stroke="#999" stroke-width="1.5"/><circle cx="120" cy="56" r="2" fill="#ccc"/>
  <circle${wa} cx="148" cy="56" r="6" fill="#1a1a1a" stroke="#999" stroke-width="1.5"/><circle cx="148" cy="56" r="2" fill="#ccc"/>
  <rect x="178" y="50" width="50" height="8" rx="3" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
  <circle${wa} cx="188" cy="56" r="6" fill="#1a1a1a" stroke="#999" stroke-width="1.5"/><circle cx="188" cy="56" r="2" fill="#ccc"/>
  <circle${wa} cx="216" cy="56" r="6" fill="#1a1a1a" stroke="#999" stroke-width="1.5"/><circle cx="216" cy="56" r="2" fill="#ccc"/>
</svg>`
}

// ===== HIGH-SPEED TRAIN (N700, E5, TGV, ICE, KTX, CR400 — varying nose) =====
function buildHighSpeedSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#1a1a6b'
  const ac = cfg.accentColor || '#0077cc'
  const wa = animate ? ' class="train-wheel"' : ''
  const nl = cfg.noseLen || 44  // how far the nose tip extends from body
  const spk = animate ? `
    <polyline class="elec-spark"  points="${nl+32},4 ${nl+26},1 ${nl+34},3" fill="none" stroke="${ac}" stroke-width="1.8" stroke-linecap="round"/>
    <circle   class="elec-spark2" cx="${nl+26}" cy="0" r="1.5" fill="#fff"/>` : ''
  return `<svg viewBox="0 0 272 60" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="136" cy="58" rx="120" ry="4" fill="rgba(0,0,0,0.2)"/>
  <!-- Body -->
  <rect x="${nl}" y="14" width="${272-nl}" height="36" rx="5" fill="${bc}"/>
  <rect x="${nl}" y="14" width="${272-nl}" height="11" rx="5" fill="rgba(255,255,255,0.12)"/>
  <!-- Aerodynamic pointed nose -->
  <polygon points="${nl},50 4,36 4,28 ${nl},14" fill="${bc}"/>
  <!-- Accent stripe -->
  <rect x="4" y="36" width="268" height="6" rx="2.5" fill="${ac}" opacity="0.88"/>
  <!-- LED headlight strip on nose -->
  <line x1="${nl-8}" y1="23" x2="${nl+16}" y2="23" stroke="#FFD166" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
  <circle cx="${nl-5}" cy="31" r="4.5" fill="#FFD166" opacity="0.92"/><circle cx="${nl-5}" cy="31" r="2.5" fill="white" opacity="0.9"/>
  <!-- Cab window -->
  <rect x="${nl+4}" y="19" width="22" height="16" rx="4" fill="rgba(135,206,235,0.9)"/>
  <!-- Side windows -->
  <rect x="${nl+34}"  y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+54}"  y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+74}"  y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+94}"  y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+114}" y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+134}" y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <rect x="${nl+154}" y="19" width="14" height="13" rx="3" fill="rgba(135,206,235,0.82)"/>
  <!-- Pantograph -->
  <rect x="${nl+42}" y="7" width="44" height="5" rx="2.5" fill="#666"/>
  <rect x="${nl+50}" y="3" width="28" height="5" rx="2" fill="#888"/>
  <rect x="${nl+58}" y="0" width="12" height="4" rx="1.5" fill="#999"/>
  ${spk}
  <!-- Bogies -->
  <rect x="${nl+4}"  y="50" width="58" height="8" rx="3" fill="#1a1a1a" stroke="#444" stroke-width="1"/>
  <circle${wa} cx="${nl+16}" cy="56" r="6" fill="#111" stroke="#888" stroke-width="1.5"/><circle cx="${nl+16}" cy="56" r="2" fill="#bbb"/>
  <circle${wa} cx="${nl+48}" cy="56" r="6" fill="#111" stroke="#888" stroke-width="1.5"/><circle cx="${nl+48}" cy="56" r="2" fill="#bbb"/>
  <rect x="${nl+80}" y="50" width="58" height="8" rx="3" fill="#1a1a1a" stroke="#444" stroke-width="1"/>
  <circle${wa} cx="${nl+92}"  cy="56" r="6" fill="#111" stroke="#888" stroke-width="1.5"/><circle cx="${nl+92}"  cy="56" r="2" fill="#bbb"/>
  <circle${wa} cx="${nl+124}" cy="56" r="6" fill="#111" stroke="#888" stroke-width="1.5"/><circle cx="${nl+124}" cy="56" r="2" fill="#bbb"/>
</svg>`
}

// ===== SCMaglev L0 (no wheels, superconducting magnetic levitation) =====
function buildMaglevSVG(cfg, opts = {}) {
  const { animate = true, width = 148, height = 64 } = opts
  const bc = cfg.bodyColor || '#1a1a2e'
  const ac = cfg.accentColor || '#00f5ff'
  const spk = animate ? `
    <circle   class="elec-spark"  cx="60" cy="10" r="3"   fill="${ac}" opacity="0.9"/>
    <circle   class="elec-spark2" cx="68" cy="8"  r="2"   fill="#fff"  opacity="0.8"/>
    <polyline class="elec-spark"  points="54,12 60,8 66,10 72,6" fill="none" stroke="${ac}" stroke-width="1.5" stroke-linecap="round"/>` : ''
  return `<svg viewBox="0 0 290 56" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Floating glow (no ground shadow — it levitates) -->
  <ellipse cx="145" cy="54" rx="118" ry="3" fill="rgba(0,200,255,0.08)" opacity="0.6"/>
  <!-- T-channel guideway at bottom -->
  <rect x="16" y="46" width="258" height="8" rx="3" fill="#101020"/>
  <rect x="10" y="49" width="270" height="5" rx="2" fill="#080818" stroke="${ac}" stroke-width="0.8" opacity="0.6"/>
  <!-- Superconducting coil strips (bottom edge) -->
  <rect x="46" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="64" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="82" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="100" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="118" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="136" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="154" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="172" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="190" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="208" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="226" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <rect x="244" y="43" width="12" height="4" rx="2" fill="${ac}" opacity="0.72"/>
  <!-- Main aerodynamic body -->
  <rect x="42" y="13" width="242" height="32" rx="7" fill="${bc}"/>
  <rect x="42" y="13" width="242" height="10" rx="7" fill="rgba(255,255,255,0.1)"/>
  <!-- Ultra-long tapered nose (≈60px) -->
  <polygon points="42,45 4,29 42,13" fill="${bc}"/>
  <circle cx="5" cy="29" r="5" fill="${bc}"/>
  <!-- Cyan accent glow stripe -->
  <rect x="4" y="33" width="280" height="4" rx="2" fill="${ac}" opacity="0.88"/>
  <!-- Cockpit windshield -->
  <rect x="44" y="18" width="24" height="14" rx="3" fill="rgba(135,206,235,0.88)"/>
  <!-- Narrow speed-slit windows -->
  <rect x="76"  y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="100" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="124" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="148" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="172" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="196" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="220" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <rect x="244" y="20" width="16" height="9" rx="3" fill="rgba(135,206,235,0.72)"/>
  <!-- No wheels — MAGLEV! -->
  ${spk}
</svg>`
}

// ===== TRAIN SVG DISPATCHER — routes to correct builder per cfg.builder =====
function dispatchTrainSVG(cfg, opts) {
  const b = cfg.builder
  if (b === 'hood_diesel')  return buildHoodDieselSVG(cfg, opts)
  if (b === 'dual_cab')     return buildDualCabSVG(cfg, opts)
  if (b === 'emu')          return buildEmuSVG(cfg, opts)
  if (b === 'shinkansen_0') return buildShinkansen0SVG(cfg, opts)
  if (b === 'highspeed')    return buildHighSpeedSVG(cfg, opts)
  if (b === 'maglev')       return buildMaglevSVG(cfg, opts)
  if (cfg.isSteam)          return buildSteamLocoSVG(cfg, opts)
  if (cfg.isDiesel)         return buildDieselLocoSVG(cfg, opts)
  if (cfg.isElectric)       return buildElectricLocoSVG(cfg, opts)
  return buildDieselLocoSVG(cfg, opts)
}

// G14 Categories with trains grouped by type
const G14_CATEGORIES = [
  {
    key:'steam', label:'Uap 🇮🇩', emoji:'🚂', color:'#92400e', bg:'rgba(146,64,14,0.25)',
    desc:'10 lokomotif uap Ambarawa & Indonesia',
    trains:[
      { key:'b2507', name:'B 25 07',  sub:'Ambarawa 1902 • Swiss SLM', isSteam:true, rack:true,  tender:false, bodyColor:'#1a1a2e', wheelColor:'#0d0d1a', baseSpeed:1.55, boostMult:1.52, boostDur:1800, color:'#1a1a2e', kmh:30,  desc:'B2507 — Bintang Museum Ambarawa! Kereta rack bergerigi pendaki gunung dari Swiss SLM 1902. ⛰️' },
      { key:'b2521', name:'B 25 21',  sub:'Ambarawa 1912 • Swiss',     isSteam:true, rack:true,  tender:false, bodyColor:'#0d2a0d', wheelColor:'#061606', baseSpeed:1.62, boostMult:1.50, boostDur:1800, color:'#0d2a0d', kmh:32,  desc:'B2521 — Rack Ambarawa-Bedono jalur gunung legendaris, Swiss SLM 1912. 🌄' },
      { key:'c1218', name:'C 12 18',  sub:'Ambarawa 1891 • Jerman',    isSteam:true, rack:false, tender:true,  bodyColor:'#4a1515', wheelColor:'#2a0808', baseSpeed:1.48, boostMult:1.54, boostDur:1750, color:'#4a1515', kmh:28,  desc:'C1218 — Lokomotif TERTUA di Indonesia! Buatan Jerman 1891. Usia 130+ tahun! 🏺' },
      { key:'c5107', name:'C 51 07',  sub:'Ambarawa 1921 • Jerman',    isSteam:true, rack:false, tender:true,  bodyColor:'#0f0f0f', wheelColor:'#050505', baseSpeed:1.65, boostMult:1.49, boostDur:1900, color:'#111', kmh:35,  desc:'C5107 — Lokomotif tender uap Ambarawa buatan Jerman 1921. Pengirim barang era kolonial! 🪨' },
      { key:'d1415', name:'D 14 15',  sub:'Ambarawa 1908 • Hanomag',   isSteam:true, rack:false, tender:false, bodyColor:'#2a1a0a', wheelColor:'#150a00', baseSpeed:1.58, boostMult:1.48, boostDur:1850, color:'#2a1a0a', kmh:30,  desc:'D1415 — Hanomag Jerman 1908! Kekar dan andal, tulang punggung perkebunan Jawa! 💪' },
      { key:'b2801', name:'B 28 01',  sub:'Ambarawa 1907 • Swiss SLM', isSteam:true, rack:true,  tender:false, bodyColor:'#0a1f0a', wheelColor:'#051005', baseSpeed:1.60, boostMult:1.49, boostDur:1800, color:'#0a1f0a', kmh:31,  desc:'B2801 — Rack Swiss 1907! Mendaki lereng Gunung Merbabu dengan penuh keberanian! 🏔️' },
      { key:'c28',   name:'C 28',     sub:'Jawa 1920 • Belanda',       isSteam:true, rack:false, tender:true,  bodyColor:'#0f1540', wheelColor:'#070a25', baseSpeed:1.70, boostMult:1.47, boostDur:1900, color:'#0f1540', kmh:36,  desc:'C28 — Kelas C28 Hindia Belanda 1920. Elegan biru malam di jalur perbukitan! 🌙' },
      { key:'b50',   name:'B 50',     sub:'Jawa 1880 • Jerman',        isSteam:true, rack:false, tender:false, bodyColor:'#2a1e08', wheelColor:'#150f00', baseSpeed:1.42, boostMult:1.56, boostDur:1700, color:'#2a1e08', kmh:25,  desc:'B50 — Salah satu loko tertua Jawa! Jerman 1880-an. Lambat tapi punya legenda! 🦕' },
      { key:'bb302', name:'BB 302',   sub:'Indonesia 1954',             isSteam:true, rack:false, tender:true,  bodyColor:'#5D3A1A', wheelColor:'#3a2010', baseSpeed:2.0,  boostMult:1.45, boostDur:2000, color:'#5D3A1A', kmh:60,  desc:'BB302 — Lokomotif era peralihan Indonesia 1954. Baja murni Tanah Air! 🇮🇩' },
      { key:'bb303', name:'BB 303',   sub:'Indonesia 1956',             isSteam:true, rack:false, tender:true,  bodyColor:'#2A1A08', wheelColor:'#1a0a00', baseSpeed:2.1,  boostMult:1.43, boostDur:2000, color:'#2A1A08', kmh:65,  desc:'BB303 — Lebih bertenaga dari BB302! Kereta masa transisi terbaik Indonesia! ⚡' },
      { key:'e10',   name:'E 10',     sub:'Jawa Barat 1928 • Inggris', isSteam:true, rack:false, tender:true,  bodyColor:'#1C1C3A', wheelColor:'#0a0a20', baseSpeed:1.75, boostMult:1.46, boostDur:1950, color:'#1C1C3A', kmh:40,  desc:'E10 — Lokomotif listrik pertama Hindia Belanda! Jalur Batavia-Buitenzorg 1928. ⚡🏛️' },
      { key:'d300',  name:'D 301',    sub:'Jawa 1954 • USA',           isSteam:true, rack:false, tender:false, bodyColor:'#3D1515', wheelColor:'#1f0a0a', baseSpeed:1.90, boostMult:1.44, boostDur:1950, color:'#3D1515', kmh:55,  desc:'D301 — Lokomotif Amerika era 1950-an! Mesin kuat buatan Baldwin Locomotive Works. 🇺🇸' },
      { key:'b51',   name:'B 51',     sub:'Jawa 1900 • Belanda',       isSteam:true, rack:false, tender:false, bodyColor:'#1A3A1A', wheelColor:'#0a1f0a', baseSpeed:1.50, boostMult:1.53, boostDur:1750, color:'#1A3A1A', kmh:28,  desc:'B51 — Tram lokomotif Belanda 1900! Mungil tapi perkasa di jalanan kota! 🏙️' },
      { key:'c2706',    name:'C 27 06',    sub:'Jawa 1916 • Hartmann',         isSteam:true, rack:false, tender:true,  bodyColor:'#0a1a2a', wheelColor:'#050e17', baseSpeed:1.68, boostMult:1.48, boostDur:1850, color:'#0a1a2a', stripeColor:'#FFD166', kmh:37,  desc:'C2706 — Kelas C27 buatan Hartmann Jerman 1916. Mesin tangguh jalur Priangan! 🌿' },
      { key:'240loco',   name:'2-4-0',       sub:'Eropa 1860 • Klasik',           isSteam:true, rack:false, tender:true,  bodyColor:'#3a1a0a', wheelColor:'#1f0d00', baseSpeed:1.45, boostMult:1.55, boostDur:1700, color:'#3a1a0a', stripeColor:'#e63946', kmh:55,  desc:'2-4-0 — Konfigurasi klasik abad 19: 2 roda depan, 4 roda penggerak. Tulang punggung jalur kereta pertama di Eropa & Amerika! 🏛️🚂' },
      { key:'caseyjr',   name:'Casey Jr',    sub:'Sirkus • Dumbo Disney',         isSteam:true, rack:false, tender:false, bodyColor:'#c0392b', wheelColor:'#7f0000', baseSpeed:1.80, boostMult:1.60, boostDur:1600, color:'#c0392b', stripeColor:'#ffd700', kmh:60,  desc:'Casey Jr — Kereta Sirkus dari film Dumbo (Disney 1941)! "I think I can, I think I can!" Semangat pantang menyerah! 🎪🐘' },
      { key:'malivlakb250', name:'B 250',    sub:'Malivlak • Indonesia',          isSteam:true, rack:false, tender:true,  bodyColor:'#1a2a1a', wheelColor:'#0a150a', baseSpeed:1.55, boostMult:1.50, boostDur:1800, color:'#1a2a1a', stripeColor:'#00c853', kmh:45,  desc:'B250 Malivlak — Lokomotif uap Indonesia yang perkasa! Melintasi hutan dan perkebunan Nusantara dengan gagah. 🌴🇮🇩' },
      { key:'flyingscotsman', name:'Flying Scotsman', sub:'UK 1923 • LNER Apple Green', isSteam:true, rack:false, tender:true, bodyColor:'#2d6a2d', wheelColor:'#1a3d1a', baseSpeed:2.2, boostMult:1.46, boostDur:2000, color:'#2d6a2d', stripeColor:'#FFD700', kmh:160, desc:'Flying Scotsman — BINTANG DUNIA! Loko uap pertama capai 100 mph (160 km/h)! Legenda LNER hijau elegan. 🇬🇧⚡' },
      { key:'bigboy', name:'Big Boy UP 4014', sub:'USA 1941 • Union Pacific', isSteam:true, rack:false, tender:true, bodyColor:'#1a1a1a', wheelColor:'#0d0d0d', baseSpeed:2.0, boostMult:1.55, boostDur:1900, color:'#111', stripeColor:'#FFA500', kmh:130, desc:'Big Boy — TERBESAR & TERBERAT di dunia! 7000 HP, 135 ton, kereta uap Amerika yang perkasa! 🦅🇺🇸' },
      { key:'mallard', name:'Mallard A4', sub:'UK 1938 • LNER Garter Blue', isSteam:true, rack:false, tender:true, bodyColor:'#1a3a6b', wheelColor:'#0d1f3a', baseSpeed:2.5, boostMult:1.48, boostDur:2000, color:'#1a3a6b', stripeColor:'#C0C0C0', kmh:203, desc:'Mallard — REKOR DUNIA ABADI! 203 km/h pada 1938, tak tertandingi lokomotif uap hingga kini! 🏆🇬🇧' },
      { key:'c62japan', name:'C62', sub:'Jepang 1948 • JNR Hitam', isSteam:true, rack:false, tender:true, bodyColor:'#111111', wheelColor:'#060606', baseSpeed:2.3, boostMult:1.47, boostDur:1950, color:'#111', stripeColor:'#e63946', kmh:145, desc:'C62 — Kebanggaan JNR Jepang! Loko uap terbesar Jepang, menarik Tsubame & Hato ekspres elite! 🇯🇵✨' },
      { key:'p36', name:'P36', sub:'Uni Soviet 1950 • LKZ', isSteam:true, rack:false, tender:true, bodyColor:'#2a5f2a', wheelColor:'#163016', baseSpeed:2.1, boostMult:1.48, boostDur:1950, color:'#2a5f2a', stripeColor:'#FFD700', kmh:125, desc:'P36 — Lokomotif uap terakhir dan termegah Uni Soviet! Bintang merah di badan hijau elegan! ⭐🇷🇺' },
      { key:'sar25', name:'SAR Class 25', sub:'Afrika Selatan 1953', isSteam:true, rack:false, tender:true, bodyColor:'#7a1a1a', wheelColor:'#3d0d0d', baseSpeed:1.9, boostMult:1.50, boostDur:1900, color:'#7a1a1a', stripeColor:'#FFC107', kmh:110, desc:'SAR Class 25 — Lokomotif uap terbesar & terkuat Afrika! Mesin kondensasi inovatif! 🦁🌍' },
      { key:'db01', name:'DB Class 01', sub:'Jerman 1926 • Reichsbahn', isSteam:true, rack:false, tender:true, bodyColor:'#1a1a2a', wheelColor:'#0d0d15', baseSpeed:2.0, boostMult:1.49, boostDur:1950, color:'#1a1a2a', stripeColor:'#C0C0C0', kmh:130, desc:'DB Class 01 — Lokomotif ekspres Jerman Reichsbahn era 1920an! Desain klasik Prusia yang kokoh! 🇩🇪🚂' },
      { key:'gwrcastle', name:'GWR Castle', sub:'UK 1923 • Great Western', isSteam:true, rack:false, tender:true, bodyColor:'#8B4513', wheelColor:'#4a2208', baseSpeed:2.1, boostMult:1.47, boostDur:1950, color:'#8B4513', stripeColor:'#FFD700', kmh:150, desc:'GWR Castle Class — Kastil beroda! Desain Collett 1923, sempat jadi terkencang di UK. 🏰🇬🇧' },
      { key:'bb1000id', name:'BB 1000', sub:'Indonesia • Heritage Steam', isSteam:true, rack:false, tender:false, bodyColor:'#8B0000', wheelColor:'#4a0000', baseSpeed:1.95, boostMult:1.52, boostDur:1850, color:'#8B0000', stripeColor:'#FFD700', kmh:85, desc:'BB 1000 — Loko uap heritage Indonesia! Livery merah maroon mewah, simbol kejayaan rel Nusantara! 🇮🇩❤️' },
    ]
  },
  {
    key:'diesel', label:'Diesel', emoji:'🚃', color:'#166534', bg:'rgba(22,101,52,0.25)',
    desc:'Mesin diesel kuat dan handal',
    trains:[
      { key:'cc201',  name:'CC 201',   sub:'Indonesia • EMD Hood Unit',    isDiesel:true, builder:'hood_diesel', bodyColor:'#1B4A1B', accentColor:'#FFD166', baseSpeed:2.6,  boostMult:1.38, boostDur:2100, color:'#1B5E20', kmh:85,  desc:'CC201 — Kuda kerja rel Indonesia! Hood unit C-C, ribuan CC201 melintasi Jawa setiap hari. 💪🇮🇩' },
      { key:'cc203',  name:'CC 203',   sub:'Indonesia • Hood Unit Modern',  isDiesel:true, builder:'hood_diesel', bodyColor:'#0f3d1a', accentColor:'#00e676', baseSpeed:2.8, boostMult:1.36, boostDur:2100, color:'#1A4A1A', kmh:95,  desc:'CC203 — Diesel modern Indonesia! Hood unit lebih bertenaga, livery hijau metalik! 🟢⚡' },
      { key:'cc206',  name:'CC 206',   sub:'Indonesia • GE Dual-Cab C-C',  isDiesel:true, builder:'dual_cab',   bodyColor:'#1a2a4a', accentColor:'#ff6600', baseSpeed:3.0, boostMult:1.35, boostDur:2150, color:'#1a2a4a', kmh:100, desc:'CC206 — GE ES43ACi terbaru Indonesia! Desain kabin ganda (bi-directional), 6 gandar, 4300 HP! 🔶🇺🇸' },
      { key:'bb301',  name:'BB 301',   sub:'Indonesia • Diesel',           isDiesel:true, builder:'hood_diesel', bodyColor:'#3a2800', accentColor:'#ffa500', baseSpeed:2.4,  boostMult:1.40, boostDur:2050, color:'#2a1a00', kmh:75,  desc:'BB301 — Diesel tua tapi kokoh! Masih mengangkut barang di jalur-jalur pinggiran Jawa. 🚛' },
      { key:'de10',   name:'DE 10',    sub:'Jepang • JNR Diesel',          isDiesel:true, bodyColor:'#4a2000', accentColor:'#ff3300', baseSpeed:2.2,  boostMult:1.41, boostDur:2000, color:'#4a2000', kmh:70,  desc:'DE10 — Diesel langsir JNR Jepang! Sangat fleksibel, bisa bolak-balik arah! 🇯🇵' },
      { key:'class66', name:'Class 66', sub:'Inggris • EWS Hood Diesel',   isDiesel:true, builder:'hood_diesel', bodyColor:'#5a1a1a', accentColor:'#ffd700', baseSpeed:2.7,  boostMult:1.37, boostDur:2100, color:'#5a1a1a', kmh:92,  desc:'Class 66 — Hood diesel barang Inggris yang ikonik! Dipakai di seluruh Eropa! 🇬🇧🌍' },
      { key:'sd70m',  name:'SD70M',    sub:'Amerika • EMD Diesel',         isDiesel:true, bodyColor:'#003366', accentColor:'#ff0000', baseSpeed:3.1,  boostMult:1.34, boostDur:2200, color:'#003366', kmh:105, desc:'SD70M — Raksasa rel Amerika! Mesin EMD bertenaga 4300 hp untuk jalur panjang! 🇺🇸🦅' },
      { key:'df8b',   name:'DF8B',     sub:'China • Diesel Hood Unit',     isDiesel:true, builder:'hood_diesel', bodyColor:'#1a3a1a', accentColor:'#ff4444', baseSpeed:2.9,  boostMult:1.35, boostDur:2150, color:'#1a3a1a', kmh:98,  desc:'DF8B — Hood diesel angkut barang China yang perkasa! Tulang punggung jalur batubara! 🇨🇳' },
      { key:'cc205', name:'CC 205', sub:'Indonesia • GE C30ACi', isDiesel:true, builder:'hood_diesel', bodyColor:'#00695c', accentColor:'#e0f2f1', baseSpeed:3.2, boostMult:1.33, boostDur:2200, color:'#004d40', kmh:110, desc:'CC205 — GE C30ACi! Diesel andalan Sumatra, bodi teal elegan angkut batubara Tanjung Enim! 🟢🇮🇩' },
      { key:'cc300', name:'CC 300', sub:'Indonesia • Hyundai Rotem', isDiesel:true, builder:'dual_cab', bodyColor:'#1565c0', accentColor:'#e3f2fd', baseSpeed:3.4, boostMult:1.32, boostDur:2250, color:'#0d47a1', kmh:120, desc:'CC300 — Diesel paling modern Indonesia dari Hyundai Rotem! Dual-cab bertenaga tinggi! 🔵🇰🇷🇮🇩' },
      { key:'cc400', name:'CC 400', sub:'Indonesia • Siemens Eurosprinter', isDiesel:true, builder:'dual_cab', bodyColor:'#4a148c', accentColor:'#e8eaf6', baseSpeed:3.6, boostMult:1.30, boostDur:2300, color:'#311b92', kmh:130, desc:'CC400 — Eurosprinter Siemens! Diesel paling cepat KAI, teknologi Eropa jantung Indonesia! 💜🇩🇪🇮🇩' },
      { key:'alco', name:'ALCO RS-11', sub:'Amerika • Railroad Diesel', isDiesel:true, bodyColor:'#5d3a00', accentColor:'#FFA726', baseSpeed:2.5, boostMult:1.39, boostDur:2050, color:'#3e2800', kmh:105, desc:'ALCO RS-11 — Road Switcher klasik Amerika! Desain ikonik hood unit warisan era 1950an. 🦅🇺🇸' },
      { key:'class47', name:'Class 47', sub:'Inggris • Brush Sulzer', isDiesel:true, builder:'hood_diesel', bodyColor:'#003087', accentColor:'#ffffff', baseSpeed:2.6, boostMult:1.38, boostDur:2100, color:'#003087', kmh:153, desc:'Class 47 — Diesel paling populer di UK! 500+ unit dibangun, menarik hampir semua rute Inggris! 🇬🇧' },
      { key:'renfe333', name:'RENFE 333', sub:'Spanyol • Alsthom', isDiesel:true, builder:'dual_cab', bodyColor:'#8b0000', accentColor:'#ffe0b2', baseSpeed:2.9, boostMult:1.36, boostDur:2150, color:'#7a0000', kmh:160, desc:'RENFE 333 — Diesel ekspres Spanyol! Dual-cab Alsthom Perancis dengan livery merah mewah! 🇪🇸🌹' },
      { key:'kiha261', name:'KiHa 261', sub:'Jepang • JR Hokkaido Diesel', isDiesel:true, builder:'dual_cab', bodyColor:'#1a1a4a', accentColor:'#ff6f61', baseSpeed:3.0, boostMult:1.35, boostDur:2200, color:'#0f0f30', kmh:130, desc:'KiHa 261 — DMU ekspres JR Hokkaido! Dirancang tahan salju, berlari di padang beku! ❄️🇯🇵' },
      { key:'br218', name:'DB Class 218', sub:'Jerman • Henschel V160', isDiesel:true, builder:'hood_diesel', bodyColor:'#003a6b', accentColor:'#cccccc', baseSpeed:2.8, boostMult:1.37, boostDur:2100, color:'#002a50', kmh:140, desc:'DB Class 218 — V160 Henschel! Diesel serbaguna DB yang paling banyak dipakai di Jerman! 🇩🇪🔵' },
      { key:'emd38', name:'EMD GP38', sub:'Amerika • General Motors', isDiesel:true, bodyColor:'#002244', accentColor:'#ff0000', baseSpeed:2.7, boostMult:1.37, boostDur:2100, color:'#001a33', kmh:112, desc:'EMD GP38 — General Purpose General Motors! Tulang punggung jalur regional di seluruh Amerika! 🇺🇸💪' },
      { key:'bb75000', name:'BB 75000', sub:'Perancis • SNCF Diesel', isDiesel:true, builder:'dual_cab', bodyColor:'#003153', accentColor:'#d4af37', baseSpeed:3.1, boostMult:1.34, boostDur:2200, color:'#002040', kmh:120, desc:'BB 75000 — Diesel serbaguna SNCF Perancis! Prima power dual-cab yang handal! 🇫🇷💛' },
    ]
  },
  {
    key:'electric', label:'Listrik', emoji:'⚡', color:'#1e3a8a', bg:'rgba(30,58,138,0.25)',
    desc:'Kereta listrik super cepat',
    trains:[
      { key:'krl',    name:'KRL',             sub:'Commuter Jabodetabek',    isElectric:true, builder:'emu',          bodyColor:'#0D47A1', accentColor:'#e53935', baseSpeed:3.0, boostMult:1.37, boostDur:2200, color:'#0D47A1', kmh:110, desc:'KRL Commuter Line — andalan ibu kota! EMU dua kabin, angkut jutaan penumpang Jakarta! 🏙️🇮🇩' },
      { key:'lrt',    name:'LRT Jakarta',      sub:'Indonesia 2019',           isElectric:true, builder:'emu',          bodyColor:'#c62828', accentColor:'#ffeb3b', baseSpeed:2.8, boostMult:1.38, boostDur:2150, color:'#c62828', kmh:90,  desc:'LRT Jakarta — Kereta ringan melayang di atas kota! EMU modern dan ramah lingkungan! 🌇✨' },
      { key:'mrt',    name:'MRT Jakarta',      sub:'Indonesia 2019',           isElectric:true, builder:'emu',          bodyColor:'#37474f', accentColor:'#26c6da', baseSpeed:3.1, boostMult:1.36, boostDur:2250, color:'#37474f', kmh:115, desc:'MRT Jakarta — EMU pertama Jakarta! Pantograph ganda, sistem CBTC canggih! 🚇💨' },
      { key:'shink0', name:'Shinkansen 0',     sub:'Jepang 1964 • JNR Klasik', isElectric:true, builder:'shinkansen_0', bodyColor:'#f0f0f0', accentColor:'#0052cc', baseSpeed:2.8, boostMult:1.38, boostDur:2100, color:'#f0f0f0', kmh:210, desc:'Shinkansen 0 Series — LEGENDA 1964! Hidung bulat ikonik, debut saat Olimpiade Tokyo. Bapak semua bullet train dunia! 🇯🇵🏅' },
      { key:'shink',  name:'Shinkansen N700',  sub:'Jepang • JR Central',      isElectric:true, builder:'highspeed',    bodyColor:'#1A1A6B', accentColor:'#0077cc', noseLen:44, baseSpeed:3.5, boostMult:1.35, boostDur:2300, color:'#1A1A6B', kmh:285, desc:'Shinkansen N700 — Aerodynamic aero-wing car! 285 km/h, anti-derailment sistem aktif! 🏔️🇯🇵' },
      { key:'e5',     name:'Shinkansen E5',    sub:'Jepang • Hayabusa',        isElectric:true, builder:'highspeed',    bodyColor:'#1B4332', accentColor:'#ff69b4', noseLen:70, baseSpeed:3.6, boostMult:1.34, boostDur:2300, color:'#2C7043', kmh:320, desc:'Shinkansen E5 Hayabusa — Hidung TERPANJANG! 15m "Iguana nose", 320 km/h memecah angin! 🦅💚' },
      { key:'tgv',    name:'TGV Inouï',        sub:'Perancis • SNCF',          isElectric:true, builder:'highspeed',    bodyColor:'#003189', accentColor:'#e63946', noseLen:52, baseSpeed:3.8, boostMult:1.33, boostDur:2400, color:'#003189', kmh:320, desc:'TGV Inouï — Kebanggaan Prancis! Power car di ujung, 320 km/h! 🇫🇷⚡' },
      { key:'ice3',   name:'ICE-3',            sub:'Jerman • DB',              isElectric:true, builder:'highspeed',    bodyColor:'#e8e8e8', accentColor:'#e63946', noseLen:32, baseSpeed:3.7, boostMult:1.34, boostDur:2350, color:'#D0D0D0', kmh:300, desc:'ICE-3 — Motor tersebar (distributed traction) pertama Jerman! 300 km/h tanpa lokomotif terpisah! 🇩🇪🚄' },
      { key:'ktx',    name:'KTX-I',            sub:'Korea Selatan • Korail',   isElectric:true, builder:'highspeed',    bodyColor:'#0A2A7A', accentColor:'#ff6b35', noseLen:50, baseSpeed:3.6, boostMult:1.35, boostDur:2300, color:'#0A2A7A', kmh:305, desc:'KTX-I — Peluru Korea berbasis TGV! 305 km/h Seoul-Busan hanya 2.5 jam! 🇰🇷⚡' },
      { key:'cr400',  name:'CR400AF',          sub:'China • Fuxing',           isElectric:true, builder:'highspeed',    bodyColor:'#b71c1c', accentColor:'#ffc107', noseLen:46, baseSpeed:4.0, boostMult:1.32, boostDur:2450, color:'#b71c1c', kmh:350, desc:'CR400AF Fuxing — Kereta TERCEPAT beroperasi di dunia! 350 km/h jalur China! 🇨🇳🏆' },
      { key:'maglev', name:'SCMaglev L0',      sub:'Jepang • Superconducting', isElectric:true, builder:'maglev',       bodyColor:'#1a1a2e', accentColor:'#00f5ff', baseSpeed:4.5, boostMult:1.30, boostDur:2600, color:'#1a1a2e', kmh:603, desc:'SCMaglev L0 — PEMEGANG REKOR DUNIA! 603 km/h! Melayang di atas rel, roda tidak menyentuh tanah! 🌌🚀' },
      { key:'whoosh', name:'Whoosh KCIC', sub:'Indonesia 2023 • CR400AF', isElectric:true, builder:'highspeed', bodyColor:'#c62828', accentColor:'#e0e0e0', noseLen:46, baseSpeed:3.9, boostMult:1.32, boostDur:2400, color:'#b71c1c', kmh:350, desc:'Whoosh — KERETA CEPAT PERTAMA RI! Jakarta-Bandung 46 menit! CR400AF made in China, milik Indonesia! 🇮🇩🏆🚀' },
      { key:'ice4', name:'ICE 4', sub:'Jerman 2017 • Siemens', isElectric:true, builder:'highspeed', bodyColor:'#f5f5f5', accentColor:'#e63946', noseLen:30, baseSpeed:3.8, boostMult:1.33, boostDur:2350, color:'#ffffff', kmh:250, desc:'ICE 4 — Generasi terbaru ICE Jerman! Kenyamanan & efisiensi terbaik, rangkaian terpanjang 346m! 🇩🇪✨' },
      { key:'acela2', name:'Acela II', sub:'Amerika 2024 • Alstom Avelia', isElectric:true, builder:'highspeed', bodyColor:'#1a3a6b', accentColor:'#cc0000', noseLen:36, baseSpeed:3.6, boostMult:1.34, boostDur:2300, color:'#12284a', kmh:300, desc:'Acela Express 2 — Bullet train Amerika! Alstom Avelia Liberty, koridor NEC Boston-DC! 🇺🇸🗽' },
      { key:'agvitalo', name:'AGV Italo', sub:'Italia 2012 • NTV Italo', isElectric:true, builder:'highspeed', bodyColor:'#c62828', accentColor:'#ff8f00', noseLen:40, baseSpeed:3.7, boostMult:1.33, boostDur:2350, color:'#b71c1c', kmh:300, desc:'AGV Italo — Kereta swasta Italia pertama! Desain Pininfarina nan elegan, 300 km/h di jalur Roma-Milano! 🇮🇹🏎️' },
      { key:'pendolino', name:'Pendolino ETR610', sub:'Italia/Swiss • Alstom', isElectric:true, builder:'emu', bodyColor:'#c62828', accentColor:'#ffd600', baseSpeed:3.4, boostMult:1.35, boostDur:2250, color:'#b71c1c', kmh:250, desc:'Pendolino ETR610 — Kereta miring ikonik! Teknologi tilting di tikungan pegunungan Alpen! ⛰️🇮🇹' },
      { key:'s103', name:'RENFE S-103', sub:'Spanyol • Velaro E Siemens', isElectric:true, builder:'highspeed', bodyColor:'#c0c0c0', accentColor:'#ffeb3b', noseLen:35, baseSpeed:3.8, boostMult:1.33, boostDur:2350, color:'#a0a0a0', kmh:350, desc:'RENFE S-103 Velaro E — TERCEPAT di Eropa saat diluncurkan! 350 km/h jalur AVE Spanyol! 🇪🇸⚡' },
      { key:'ktxsan', name:'KTX-Sancheon', sub:'Korea 2010 • Hyundai Rotem', isElectric:true, builder:'highspeed', bodyColor:'#002366', accentColor:'#00bfff', noseLen:48, baseSpeed:3.7, boostMult:1.34, boostDur:2300, color:'#001a4a', kmh:305, desc:'KTX-Sancheon — Bullet train BUATAN Korea sendiri! Desain dalam negeri 100%, nama dari gunung Sancheon! 🇰🇷🏔️' },
      { key:'shink500', name:'Shinkansen 500', sub:'Jepang 1997 • JR West', isElectric:true, builder:'highspeed', bodyColor:'#1a1a3a', accentColor:'#6699cc', noseLen:80, baseSpeed:3.8, boostMult:1.33, boostDur:2350, color:'#111130', kmh:300, desc:'Shinkansen 500 — HIDUNG TERPANJANG 15m! Desain paling futuristik Shinkansen, menginspirasi desainer dunia! 🛸🇯🇵' },
      { key:'alphax', name:'Alpha-X Series', sub:'Jepang 2019 • JR East R&D', isElectric:true, builder:'highspeed', bodyColor:'#e8e8e8', accentColor:'#ff6600', noseLen:65, baseSpeed:4.1, boostMult:1.31, boostDur:2500, color:'#d0d0d0', kmh:400, desc:'Alpha-X — Prototipe MASA DEPAN JR East! Hidung 22m, target 400 km/h! Kereta paling aerodinamis Jepang! 🔬🇯🇵🚀' },
      { key:'frecciarossa', name:'Frecciarossa 1000', sub:'Italia 2015 • AnsaldoBreda', isElectric:true, builder:'highspeed', bodyColor:'#c62828', accentColor:'#f5f5f5', noseLen:38, baseSpeed:3.8, boostMult:1.33, boostDur:2350, color:'#b71c1c', kmh:400, desc:'Frecciarossa 1000 — Panah Merah Italia! 400 km/h prototype, 300 km/h operasional. Desain Ferrari untuk kereta! 🏎️🇮🇹❤️' },
    ]
  },
]
// Build flat lookup from all category trains
const TRAIN_TYPES_14 = {}
G14_CATEGORIES.forEach(cat => cat.trains.forEach(t => { TRAIN_TYPES_14[t.key] = {...t, category: cat.key} }))
// AI train pool (all trains can appear as AI)
const G14_AI_POOL = Object.values(TRAIN_TYPES_14)

let g14State = {}

// G14 Audio — train station ambient + race BG loop + horn
const g14StationAudio = new Audio('assets/sfx-train-station.mp3')
g14StationAudio.loop = true; g14StationAudio.volume = 0.3
const g14BgAudio = new Audio('assets/sfx-train-bg.mp3')
g14BgAudio.loop = true; g14BgAudio.volume = 0.35
const g14HornAudio = new Audio('assets/sfx-train-horn.mp3')
g14HornAudio.volume = 0.7

function g14StopAllAudio() {
  g14StationAudio.pause(); g14StationAudio.currentTime = 0
  g14BgAudio.pause(); g14BgAudio.currentTime = 0
  g14HornAudio.pause(); g14HornAudio.currentTime = 0
}
function g14ScheduleHorn() {
  if (!g14State.running) return
  g14HornAudio.currentTime = 0
  g14HornAudio.play().catch(()=>{})
  setTimeout(g14ScheduleHorn, 18000 + Math.random() * 12000)
}

function initGame14() {
  battleBgmStop()
  const lv = state.selectedLevelNum || state.selectedLevel || 5
  const diff = state.selectedLevel || 'easy'
  try { sessionStorage.setItem('g14Config', JSON.stringify({ level: lv, difficulty: diff })) } catch(_) {}
  window.location.href = 'games/g14.html'
}

function g14RenderTrainSelect() {
  const wrap = document.getElementById('g14-train-select')
  wrap.innerHTML = ''
  wrap.style.maxWidth = '360px'
  // Step 1: Category cards
  G14_CATEGORIES.forEach(cat => {
    const btn = document.createElement('button')
    btn.className = 'g14-train-select-btn'
    btn.style.cssText = `width:100%;max-width:320px;padding:14px 18px;display:flex;align-items:center;gap:14px;background:${cat.bg};border:2px solid ${cat.color};border-radius:14px;cursor:pointer;text-align:left;`
    btn.innerHTML = `<span style="font-size:32px;line-height:1;">${cat.emoji}</span><div><div style="font-size:15px;font-weight:900;color:white;">${cat.label}</div><div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;">${cat.desc}</div></div><span style="margin-left:auto;font-size:20px;color:rgba(255,255,255,0.35);">›</span>`
    btn.onclick = () => { playClick(); g14ShowTrainsForCategory(cat) }
    wrap.appendChild(btn)
  })
}

function g14ShowTrainsForCategory(cat) {
  const wrap = document.getElementById('g14-train-select')
  wrap.innerHTML = ''
  wrap.style.maxWidth = '380px'
  // Back button
  const backBtn = document.createElement('button')
  backBtn.style.cssText = 'width:100%;max-width:320px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:rgba(255,255,255,0.7);font-size:13px;font-weight:700;padding:8px 14px;cursor:pointer;text-align:left;'
  backBtn.innerHTML = `← Kembali ke Kategori`
  backBtn.onclick = () => { playClick(); g14RenderTrainSelect(); document.getElementById('g14-start-msg').textContent=''; document.getElementById('g14-go-btn-wrap').style.display='none' }
  wrap.appendChild(backBtn)
  const catLabel = document.createElement('div')
  catLabel.style.cssText = 'color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:4px 0;'
  catLabel.textContent = `${cat.emoji} ${cat.label} — Pilih keretamu`
  wrap.appendChild(catLabel)
  // Train grid
  const grid = document.createElement('div')
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px;width:100%;max-width:320px;'
  cat.trains.forEach(cfg => {
    const btn = document.createElement('button')
    btn.className = 'g14-train-select-btn'
    btn.style.padding = '12px 8px'
    const previewHtml = dispatchTrainSVG(cfg, {animate:false, width:80, height:36})
    btn.innerHTML = `<div style="display:block;margin:0 auto 6px;text-align:center;height:38px;display:flex;align-items:center;justify-content:center;">${previewHtml}</div><div style="font-size:12px;font-weight:800;color:white;">${cfg.name}</div><div style="font-size:10px;color:rgba(255,255,255,0.55);">${cfg.sub}</div><div style="font-size:11px;color:#FFD166;font-weight:700;margin-top:2px;">${cfg.kmh} km/h</div>`
    btn.onclick = () => {
      grid.querySelectorAll('.g14-train-select-btn').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      g14State.trainType = cfg.key
      g14State.trainCfg = cfg
      // Update header icon
      const hdrWrap = document.getElementById('g14-train-icon-hdr')
      if (hdrWrap) {
        hdrWrap.innerHTML = dispatchTrainSVG(cfg, {animate:false, width:54, height:24})
      }
      document.getElementById('g14-start-msg').textContent = cfg.desc
      document.getElementById('g14-go-btn-wrap').style.display = 'block'
      playClick()
    }
    grid.appendChild(btn)
  })
  wrap.appendChild(grid)
}

function g14StartRace() {
  if (!g14State.trainCfg) return
  // Switch from station ambient to race BG audio
  g14StopAllAudio()
  g14BgAudio.currentTime = 0
  g14BgAudio.play().catch(()=>{})
  setTimeout(g14ScheduleHorn, 8000)
  // Reset checkpoints
  ;['g14-cp1','g14-cp2','g14-cp3'].forEach(id => {
    const cp = document.getElementById(id)
    if (cp) { cp.classList.remove('reached'); cp.textContent = '🚉' }
  })
  const track = document.getElementById('g14-track')
  g14State.trackW = track.clientWidth
  g14State.speed = g14State.trainCfg.baseSpeed
  g14State.running = true
  // Inject animated player train SVG
  const playerDiv = document.getElementById('g14-player')
  if (playerDiv) {
    const cfg = g14State.trainCfg
    playerDiv.innerHTML = dispatchTrainSVG(cfg, {animate:true, width:200, height:88})
  }
  document.getElementById('g14-start-overlay').style.display = 'none'
  document.getElementById('g14-position').style.display = 'block'
  g14UpdatePlayerPos()
  g14SpawnAI()
  g14Loop()
  playClick()
}

function g14SpawnAI() {
  const ai = []
  const allLanes = [0,1,2]
  const aiLanes = allLanes.filter(l => l !== g14State.lane)
  const pool = [...G14_AI_POOL].sort(() => Math.random() - 0.5)
  const track = document.getElementById('g14-track')
  aiLanes.forEach((lane, i) => {
    const cfg = pool[i % pool.length]
    const variationFactor = 0.97 + Math.random() * 0.06
    const el = document.createElement('div')
    el.className = 'g14-ai-train entering'
    el.style.cssText = `position:absolute;pointer-events:none;`
    el.innerHTML = dispatchTrainSVG(cfg, {animate:true, width:160, height:70})
    const startX = g14State.trackW * (0.55 + i * 0.12)
    el.style.left = startX + 'px'
    el.style.top = `calc(${g14State.laneTopPct[lane]}% - 24px)`
    track.appendChild(el)
    setTimeout(() => el.classList.remove('entering'), 500)
    ai.push({ lane, speed: g14State.trainCfg.baseSpeed * variationFactor, x: startX, el, name: cfg.name })
  })
  g14State.aiTrains = ai
}

function g14Loop() {
  if (!g14State.running) return
  g14State.frame++
  const s = g14State
  const track = document.getElementById('g14-track')
  const trackW = track.clientWidth || s.trackW || 375
  const playerX = trackW * 0.15  // player fixed x position

  // Slow-mode when boost math popup is open — everything crawls so kids can think
  const speedFactor = s.slowMode ? 0.22 : 1

  // Animate rail + parallax scroll speeds based on train speed
  const railSpd = Math.max(0.1, 0.6 / (s.speed * speedFactor)).toFixed(2) + 's'
  document.querySelectorAll('.g14-lane-row').forEach(r => r.style.setProperty('--rspd', railSpd))
  // Treeline strips scroll a bit slower than rails (parallax effect)
  const envSpd = Math.max(0.2, 1.1 / (s.speed * speedFactor)).toFixed(2) + 's'
  document.querySelectorAll('.g14-lane-env').forEach(e => e.style.animationDuration = envSpd)
  // Parallax layers — update animation durations for speed feel
  const fenceEl = document.getElementById('g14-fence')
  const treeEl = document.getElementById('g14-trees')
  if (fenceEl) fenceEl.style.animationDuration = Math.max(0.3, 1.2 / (s.speed * speedFactor)).toFixed(2) + 's'
  if (treeEl) treeEl.style.animationDuration = Math.max(0.8, 3 / (s.speed * speedFactor)).toFixed(2) + 's'

  // Tick down invincibility counter (post-crash grace period)
  if (s.invincible > 0) s.invincible--

  // Move AI trains — relative movement to player (if AI faster, they drift right; if slower, drift left)
  s.aiTrains.forEach(ai => {
    const relSpeed = (ai.speed - s.speed) * 1.8 * speedFactor
    ai.x += relSpeed
    // Wrap: avoid wrapping right through the player zone — jump to far side instead
    if (ai.x < -120) ai.x = trackW + 100
    if (ai.x > trackW + 120) ai.x = -100
    ai.el.style.left = ai.x + 'px'
    // Show "PASS!" when AI train overlaps player in same lane (cosmetic only — no damage)
    if (ai.lane === s.lane && Math.abs(ai.x - playerX) < 80 && !ai._passing) {
      ai._passing = true
      g14ShowPassText()
    } else if (Math.abs(ai.x - playerX) >= 100) {
      ai._passing = false
    }
  })

  // Spawn obstacles
  if (s.frame % s.obstacleInterval === 0) g14SpawnObstacle()

  // Move obstacles left (they come from right)
  const obsSpeed = (s.speed * 2.5 + 1) * speedFactor
  const toRemove = []
  s.obstacles.forEach(obs => {
    obs.x -= obsSpeed
    obs.el.style.left = obs.x + 'px'
    // Collision: obstacle passes through player zone (x=playerX, same lane) — skip if invincible
    if (obs.x <= playerX + 55 && obs.x >= playerX - 20 && obs.lane === s.lane && !obs.hit && !s.invincible) {
      obs.hit = true
      g14Crash()
      toRemove.push(obs)
    }
    if (obs.x < -60) toRemove.push(obs)
  })
  toRemove.forEach(o => {
    if (o.el.parentNode) o.el.remove()
    g14HideLaneWarning(o.lane)
    s.obstacles = s.obstacles.filter(x => x !== o)
  })
  // Show danger warning when obstacle enters warning zone
  s.obstacles.forEach(obs => {
    if (!obs.warned && obs.x < trackW * 0.62) {
      obs.warned = true
      g14ShowLaneWarning(obs.lane)
    }
  })

  // Advance distance
  s.distance += s.speed * 0.12 * speedFactor
  const distFrac = Math.min(1, s.distance / s.finishLine)
  document.getElementById('g14-dist-bar').textContent = `${Math.floor(s.distance)}m`
  document.getElementById('g14-dist-fill').style.width = (distFrac * 100).toFixed(1) + '%'
  document.getElementById('g14-stars').textContent = `🏁 ${Math.floor(s.distance)}m`
  // Checkpoint station markers
  ;[['g14-cp1',0.25],['g14-cp2',0.50],['g14-cp3',0.75]].forEach(([id, threshold]) => {
    if (distFrac >= threshold) {
      const cp = document.getElementById(id)
      if (cp && !cp.classList.contains('reached')) {
        cp.classList.add('reached')
        cp.textContent = '✅'
        try { spawnParticleBurst(cp.getBoundingClientRect().left, cp.getBoundingClientRect().top) } catch(e) {}
      }
    }
  })

  // Speedometer (show km/h from trainCfg, boosted if boosting)
  const dispKmh = Math.round(s.trainCfg.kmh * (s.boosting ? s.trainCfg.boostMult : 1))
  document.getElementById('g14-speedometer').textContent = dispKmh + ' km/h'
  // Wind lines at high speed (31+ km/h)
  const windEl = document.getElementById('g14-wind-lines')
  if (windEl) windEl.style.display = (dispKmh >= 31 && !s.boosting) ? 'block' : 'none'

  // Race position: count how many AI are ahead (x > playerX)
  const aiAhead = s.aiTrains.filter(a => a.x > playerX).length
  const pos = aiAhead + 1
  const medals = ['🥇','🥈','🥉','4️⃣']
  const posEl = document.getElementById('g14-position')
  if (posEl) posEl.textContent = (medals[pos-1] || pos + '.') + ' POSISI ' + pos

  // Pressure auto-recovery
  if (!s.boosting && s.pressure < 100) {
    s.pressure = Math.min(100, s.pressure + 0.35)
    g14UpdatePressure()
  }

  // Check finish
  if (s.distance >= s.finishLine) { g14Finish(true); return }

  s.animFrame = requestAnimationFrame(g14Loop)
}

const G14_OBS_SVGS = [
  // Rock
  `<svg viewBox="0 0 46 34" width="82" height="60"><ellipse cx="23" cy="28" rx="20" ry="6" fill="#4b5563" opacity="0.3"/><polygon points="8,28 15,10 31,8 38,28" fill="#9ca3af"/><polygon points="15,10 23,5 31,8" fill="#d1d5db"/><polygon points="8,28 15,10 6,20" fill="#6b7280"/></svg>`,
  // Warning sign
  `<svg viewBox="0 0 42 38" width="82" height="74"><polygon points="21,2 40,36 2,36" fill="#fbbf24" stroke="#f59e0b" stroke-width="2"/><rect x="19" y="16" width="4" height="11" rx="2" fill="#1f2937"/><circle cx="21" cy="31" r="2.5" fill="#1f2937"/></svg>`,
  // Cow
  `<svg viewBox="0 0 54 42" width="90" height="70"><ellipse cx="27" cy="40" rx="22" ry="4" fill="#374151" opacity="0.2"/><rect x="12" y="20" width="30" height="18" rx="9" fill="white" stroke="#374151" stroke-width="1.5"/><circle cx="27" cy="20" r="11" fill="white" stroke="#374151" stroke-width="1.5"/><circle cx="22" cy="17" r="3" fill="#374151"/><circle cx="32" cy="17" r="3" fill="#374151"/><circle cx="22" cy="17" r="1.2" fill="white"/><circle cx="32" cy="17" r="1.2" fill="white"/><ellipse cx="27" cy="26" rx="5" ry="3" fill="#374151" opacity="0.25"/><line x1="17" y1="38" x2="17" y2="42" stroke="#374151" stroke-width="2"/><line x1="24" y1="38" x2="24" y2="42" stroke="#374151" stroke-width="2"/><line x1="30" y1="38" x2="30" y2="42" stroke="#374151" stroke-width="2"/><line x1="37" y1="38" x2="37" y2="42" stroke="#374151" stroke-width="2"/></svg>`,
  // Log
  `<svg viewBox="0 0 56 30" width="92" height="50"><rect x="4" y="8" width="48" height="16" rx="8" fill="#92400e"/><ellipse cx="52" cy="16" rx="5" ry="8" fill="#a16207"/><ellipse cx="52" cy="16" rx="3" ry="5" fill="#78350f"/><line x1="4" y1="8" x2="4" y2="24" stroke="#78350f" stroke-width="0.5" opacity="0.5"/><line x1="16" y1="8" x2="16" y2="24" stroke="#78350f" stroke-width="0.5" opacity="0.5"/><line x1="30" y1="8" x2="30" y2="24" stroke="#78350f" stroke-width="0.5" opacity="0.5"/><line x1="43" y1="8" x2="43" y2="24" stroke="#78350f" stroke-width="0.5" opacity="0.5"/></svg>`,
  // Broken rail
  `<svg viewBox="0 0 48 36" width="84" height="63"><rect x="0" y="6" width="18" height="5" rx="2" fill="#ef4444" transform="rotate(-15 9 8)"/><rect x="30" y="6" width="18" height="5" rx="2" fill="#ef4444" transform="rotate(15 39 8)"/><rect x="0" y="22" width="18" height="5" rx="2" fill="#ef4444" transform="rotate(10 9 24)"/><rect x="30" y="22" width="18" height="5" rx="2" fill="#ef4444" transform="rotate(-10 39 24)"/><line x1="22" y1="4" x2="26" y2="32" stroke="#fbbf24" stroke-width="2" opacity="0.8"/></svg>`,
  // Chicken
  `<svg viewBox="0 0 38 38" width="72" height="72"><ellipse cx="19" cy="26" rx="14" ry="12" fill="#fbbf24"/><circle cx="19" cy="13" r="8" fill="#fbbf24"/><polygon points="14,13 12,10 17,12" fill="#f97316"/><circle cx="22" cy="11" r="2" fill="#1f2937"/><circle cx="22.7" cy="10.3" r="0.8" fill="white"/><polygon points="14,38 14,30 17,38" fill="#f97316"/><polygon points="24,38 24,30 21,38" fill="#f97316"/><polygon points="12,16 8,14 11,18" fill="#ef4444"/></svg>`,
  // Large rock / boulder
  `<svg viewBox="0 0 50 38" width="88" height="67"><ellipse cx="25" cy="34" rx="22" ry="5" fill="#374151" opacity="0.25"/><circle cx="25" cy="22" r="16" fill="#6b7280"/><circle cx="20" cy="18" r="8" fill="#9ca3af"/><circle cx="31" cy="28" r="5" fill="#4b5563"/></svg>`,
]
function g14SpawnObstacle() {
  const track = document.getElementById('g14-track')
  const trackW = track.clientWidth || 375
  const lane = Math.floor(Math.random() * 3)
  const svgStr = G14_OBS_SVGS[Math.floor(Math.random() * G14_OBS_SVGS.length)]
  const el = document.createElement('div')
  el.className = 'g14-obstacle'
  el.innerHTML = svgStr
  const startX = trackW + 40
  el.style.left = startX + 'px'
  el.style.top = g14State.laneTopPct[lane] + '%'
  track.appendChild(el)
  g14State.obstacles.push({ lane, x: startX, el, hit: false })
}

function g14SpawnSparks(lane) {
  const track = document.getElementById('g14-track')
  if (!track) return
  const topPct = g14State.laneTopPct[lane]
  const colors = ['#fbbf24','#f97316','#ef4444','#fef08a','#fb923c']
  const dirs = [[-30,-40],[30,-40],[-20,-50],[20,-50],[-40,-20],[40,-20],[0,-50],[10,-30],[-10,-30]]
  dirs.forEach(([dx,dy]) => {
    const s = document.createElement('div')
    s.className = 'g14-spark'
    s.style.cssText = `left:calc(13% + 55px);top:${topPct}%;background:${colors[Math.floor(Math.random()*colors.length)]};--sx:${dx}px;--sy:${dy}px;`
    track.appendChild(s)
    setTimeout(() => s.remove(), 500)
  })
}
function g14ShowPassText() {
  const track = document.getElementById('g14-track')
  if (!track) return
  const el = document.createElement('div')
  el.textContent = 'AMAN! 💨'
  el.style.cssText = 'position:absolute;left:18%;font-size:13px;font-weight:900;color:#4ade80;font-family:\'Fredoka One\',cursive;pointer-events:none;z-index:20;animation:g14FloatUp 0.9s ease forwards;text-shadow:0 0 8px rgba(74,222,128,0.8);'
  el.style.top = (g14State.laneTopPct[g14State.lane] || 30) + '%'
  track.appendChild(el)
  setTimeout(() => el.remove(), 900)
}
function g14Crash() {
  if (g14State.hp <= 0) return
  g14State.invincible = 45  // ~750ms grace period at 60fps
  g14State.hp--
  const livesEl = document.getElementById('g14-lives')
  livesEl.innerHTML = '❤️'.repeat(g14State.hp) + '🖤'.repeat(3 - g14State.hp)
  const player = document.getElementById('g14-player')
  if (player) {
    player.style.animation = 'none'
    void player.offsetWidth
    player.style.animation = 'g14Crash 0.5s ease'
    setTimeout(() => { if (player) player.style.animation = '' }, 500)
  }
  g14SpawnSparks(g14State.lane)
  // Dismiss math popup if open
  clearTimeout(g14State.mathTimeout)
  document.getElementById('g14-math-popup').style.display = 'none'
  playWrong()
  vibrate(30)
  if (g14State.hp <= 0) {
    g14State.running = false
    cancelAnimationFrame(g14State.animFrame)
    // Clear all warnings
    ;[0,1,2].forEach(l => g14HideLaneWarning(l))
    document.getElementById('g14-speed-lines').style.display = 'none'
    const _wlA = document.getElementById('g14-wind-lines'); if (_wlA) _wlA.style.display = 'none'
    const _bwA = document.getElementById('g14-boost-wind'); if (_bwA) _bwA.style.display = 'none'
    g14State.slowMode = false
    setTimeout(() => g14ShowResult(false), 600)
  }
}

function g14LaneUp() {
  if (!g14State.running) return
  if (g14State.lane > 0) { g14State.lane--; g14UpdatePlayerPos(); playClick() }
}
function g14LaneDown() {
  if (!g14State.running) return
  if (g14State.lane < 2) { g14State.lane++; g14UpdatePlayerPos(); playClick() }
}
function g14UpdatePlayerPos() {
  const topPct = g14State.laneTopPct[g14State.lane]
  const player = document.getElementById('g14-player')
  if (player) player.style.top = topPct + '%'
  const fire = document.getElementById('g14-boost-fire')
  if (fire && g14State.boosting) fire.style.top = topPct + '%'
  if (g14State.boosting) {
    const wfr = document.getElementById('g14-wfire-r')
    const wff = document.getElementById('g14-wfire-f')
    if (wfr) wfr.style.top = topPct + '%'
    if (wff) wff.style.top = topPct + '%'
  }
  const ind = document.getElementById('g14-lane-indicator')
  if (ind) ind.style.top = ((g14State.lane) * 33.33) + '%'
  // Highlight active lane with neon glow
  document.querySelectorAll('.g14-lane-row').forEach((row, i) => {
    row.classList.toggle('active-lane', i === g14State.lane)
  })
}

function g14Boost() {
  if (!g14State.running || g14State.boosting || g14State.boostCooldown || g14State.pressure < 30) return
  // Slow down the world so kids can think without stress
  g14State.slowMode = true
  // Show math question — boost executes only on correct answer
  const ops = g14State.diff === 'easy' ? ['+'] : g14State.diff === 'medium' ? ['+','-'] : ['+','-','×']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a, b, answer
  if (op === '+') { a = Math.floor(Math.random()*12)+1; b = Math.floor(Math.random()*12)+1; answer = a+b }
  else if (op === '-') { a = Math.floor(Math.random()*15)+6; b = Math.floor(Math.random()*a)+1; answer = a-b }
  else { a = Math.floor(Math.random()*6)+2; b = Math.floor(Math.random()*6)+2; answer = a*b }
  g14State.boostQ = { answer, origSpeed: g14State.speed }
  const wrong = new Set()
  while (wrong.size < 2) {
    const delta = Math.floor(Math.random()*6)+1
    const w = answer + (Math.random() < 0.5 ? delta : -delta)
    if (w !== answer && w > 0) wrong.add(w)
  }
  const choices = [answer, ...[...wrong]].sort(() => Math.random() - 0.5)
  document.getElementById('g14-math-q-text').textContent = `${a} ${op.replace('×','×')} ${b} = ?`
  const choicesEl = document.getElementById('g14-math-choices')
  choicesEl.innerHTML = ''
  choices.forEach(c => {
    const btn = document.createElement('button')
    btn.className = 'g14-math-btn'
    btn.textContent = c
    btn.onclick = () => g14BoostAnswer(c)
    choicesEl.appendChild(btn)
  })
  document.getElementById('g14-math-popup').style.display = 'block'
  clearTimeout(g14State.mathTimeout)
  g14State.mathTimeout = setTimeout(() => {
    document.getElementById('g14-math-popup').style.display = 'none'
    g14State.slowMode = false
  }, 15000)
  playClick()
}

function g14BoostAnswer(val) {
  clearTimeout(g14State.mathTimeout)
  document.getElementById('g14-math-popup').style.display = 'none'
  g14State.slowMode = false  // restore normal speed regardless of answer
  if (!g14State.running || g14State.boosting) return
  if (val === g14State.boostQ.answer) {
    // Correct — execute boost
    g14State.boosting = true
    g14State.boostCooldown = true
    g14State.pressure = Math.max(10, g14State.pressure - 30)
    g14UpdatePressure()
    const origSpeed = g14State.boostQ.origSpeed
    g14State.speed = origSpeed * g14State.trainCfg.boostMult
    document.getElementById('g14-boost-btn').textContent = '🔥 BOOSTING!'
    document.getElementById('g14-boost-btn').style.opacity = '0.6'
    const fireEl = document.getElementById('g14-boost-fire')
    const wFireR = document.getElementById('g14-wfire-r')
    const wFireF = document.getElementById('g14-wfire-f')
    const lanePct = g14State.laneTopPct[g14State.lane] + '%'
    if (fireEl) { fireEl.style.display = 'block'; fireEl.style.top = lanePct }
    if (wFireR) { wFireR.style.display = 'block'; wFireR.style.top = lanePct }
    if (wFireF) { wFireF.style.display = 'block'; wFireF.style.top = lanePct }
    const linesEl = document.getElementById('g14-speed-lines')
    if (linesEl) linesEl.style.display = 'block'
    const windEl = document.getElementById('g14-boost-wind')
    if (windEl) windEl.style.display = 'block'
    playCorrect()
    clearTimeout(g14State.boostTimer)
    g14State.boostTimer = setTimeout(() => {
      g14State.speed = origSpeed
      g14State.boosting = false
      if (fireEl) fireEl.style.display = 'none'
      if (wFireR) wFireR.style.display = 'none'
      if (wFireF) wFireF.style.display = 'none'
      if (linesEl) linesEl.style.display = 'none'
      if (windEl) windEl.style.display = 'none'
      document.getElementById('g14-boost-btn').textContent = '⏳ Cooldown...'
      document.getElementById('g14-boost-ready').style.display = 'none'
      setTimeout(() => {
        g14State.boostCooldown = false
        document.getElementById('g14-boost-btn').textContent = '🔥 BOOST!'
        document.getElementById('g14-boost-btn').style.opacity = '1'
        document.getElementById('g14-boost-ready').style.display = 'block'
        setTimeout(() => { document.getElementById('g14-boost-ready').style.display = 'none' }, 2000)
      }, 3000)
    }, g14State.trainCfg.boostDur)
  } else {
    // Wrong — pressure penalty, no boost
    g14State.pressure = Math.max(10, g14State.pressure - 18)
    g14UpdatePressure()
    const btn = document.getElementById('g14-boost-btn')
    btn.textContent = '❌ Salah!'
    setTimeout(() => { btn.textContent = '🔥 BOOST!' }, 1200)
    playWrong()
    vibrate(20)
  }
}

function g14ShowLaneWarning(lane) {
  const el = document.getElementById('g14-warn-' + lane)
  if (el) el.style.display = 'block'
}
function g14HideLaneWarning(lane) {
  const el = document.getElementById('g14-warn-' + lane)
  if (el) el.style.display = 'none'
}

function g14UpdatePressure() {
  const pct = g14State.pressure
  document.getElementById('g14-pressure-bar').style.width = pct + '%'
  const wrap = document.getElementById('g14-boiler-wrap')
  if (wrap) {
    if (pct >= 60) {
      if (pct >= 80) wrap.classList.add('danger')
      else wrap.classList.remove('danger')
      // Puff steam smoke particles
      if (Math.random() < 0.8) g14EmitSmoke()
    } else {
      wrap.classList.remove('danger')
    }
  }
}

function g14EmitSmoke() {
  const track = document.getElementById('g14-track')
  if (!track) return
  const lane = g14State.lane
  const topPct = ((lane + 0.5) * 33.33) + '%'
  // Spawn 3 particles per call
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('div')
    s.className = i === 2 ? 'g14-boost-smoke rear' : 'g14-boost-smoke'
    s.style.top = topPct
    const sz = (12 + Math.random() * 18) + 'px'
    s.style.width = s.style.height = sz
    s.style.opacity = (0.6 + Math.random() * 0.3).toFixed(2)
    s.style.animationDelay = (i * 0.12) + 's'
    track.appendChild(s)
    setTimeout(() => s.remove(), 1100)
  }
}

function g14Finish(won) {
  g14State.running = false
  g14BgAudio.pause(); g14BgAudio.currentTime = 0
  g14HornAudio.pause(); g14HornAudio.currentTime = 0
  cancelAnimationFrame(g14State.animFrame)
  ;[0,1,2].forEach(l => g14HideLaneWarning(l))
  document.getElementById('g14-speed-lines').style.display = 'none'
  const _wlB = document.getElementById('g14-wind-lines'); if (_wlB) _wlB.style.display = 'none'
  const _bwnd = document.getElementById('g14-boost-wind'); if (_bwnd) _bwnd.style.display = 'none'
  const _bwB = document.getElementById('g14-boiler-wrap'); if (_bwB) _bwB.classList.remove('danger')
  clearTimeout(g14State.mathTimeout)
  document.getElementById('g14-math-popup').style.display = 'none'
  setTimeout(() => g14ShowResult(won), 300)
}

function g14ShowResult(won) {
  const pct = g14State.distance / g14State.finishLine
  const perfStars = won ? (g14State.hp === 3 ? 5 : pct >= 0.9 ? 4 : 3) : (pct >= 0.6 ? 2 : 1)
  state.gameStars[state.currentPlayer] = perfStars
  const cfg = g14State.trainCfg
  const msg = won
    ? `${cfg.name} melaju ${Math.floor(g14State.finishLine)}m! Sisa HP: ${g14State.hp}/3`
    : `Sudah ${Math.floor(g14State.distance)}m dari ${g14State.finishLine}m. Coba lagi!`
  const btns = [{label:'Main Lagi 🔄', action:()=>g14Replay()}]
  if(won && (state.selectedLevelNum||1) < 20) btns.unshift({label:'Level Berikutnya ➡️', action:()=>startGameWithLevel((state.selectedLevelNum||1)+1)})
  btns.push({label:'Kembali ⌂', action:()=>endGameFromOverlay()})
  showGameResult({ emoji:won?'🏆':'💨', title:won?'MENANG!':'Kurang Jauh...', stars:perfStars, msg, buttons:btns })
  if (won) { playCorrect(); endGame(perfStars) }
}

function g14Replay() {
  g14State.obstacles.forEach(o => { if (o.el.parentNode) o.el.remove() })
  g14State.aiTrains.forEach(a => { if (a.el.parentNode) a.el.remove() })
  cancelAnimationFrame(g14State.animFrame)
  initGame14()
  playClick()
}

// ============================================================
// GAME 15 — LOKOMOTIF PEMBERANI 💪
// ============================================================
const G15_WORDS = {
  easy:   [{word:'AYAM',emoji:'🐔'},{word:'IKAN',emoji:'🐟'},{word:'KUDA',emoji:'🐴'},{word:'BUKU',emoji:'📚'},{word:'BOLA',emoji:'⚽'},{word:'MATA',emoji:'👁️'},{word:'SAPI',emoji:'🐄'},{word:'TOPI',emoji:'🎩'}],
  medium: [{word:'GAJAH',emoji:'🐘'},{word:'SINGA',emoji:'🦁'},{word:'PANDA',emoji:'🐼'},{word:'BUNGA',emoji:'🌸'},{word:'RUMAH',emoji:'🏠'},{word:'MAKAN',emoji:'🍽️'},{word:'BURUNG',emoji:'🐦'},{word:'KELINCI',emoji:'🐰'}],
  hard:   [{word:'HARIMAU',emoji:'🐯'},{word:'JERAPAH',emoji:'🦒'},{word:'KUPU-KUPU',emoji:'🦋'},{word:'SEKOLAH',emoji:'🏫'},{word:'PELANGI',emoji:'🌈'},{word:'BINTANG',emoji:'⭐'},{word:'GELOMBANG',emoji:'🌊'}]
}

let g15State = {}

function initGame15() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g15Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/g15-pixi.html'
}

function g15LoadWord() {
  const entry = g15State.words[g15State.wordIdx % g15State.words.length]
  g15State.currentWord = entry.word.replace('-','')
  g15State.currentEmoji = entry.emoji
  g15State.collectedIdx = 0
  g15State.usedTiles = []
  g15RenderChains()
  g15RenderSlots()
  g15RenderImage()
  g15RenderLetterTiles()
  document.getElementById('g15-progress-msg').textContent = `Kata ${g15State.wordIdx + 1} / ${g15State.totalChains}`
}

function g15RenderChains() {
  const wrap = document.getElementById('g15-chains')
  wrap.innerHTML = ''
  for (let i = 0; i < g15State.totalChains; i++) {
    const span = document.createElement('span')
    span.className = 'g15-chain-link'
    span.id = `g15-chain-${i}`
    if (i >= g15State.chainsLeft) span.classList.add('broken')
    wrap.appendChild(span)
  }
  document.getElementById('g15-chain-count').textContent = `⛓️ ${g15State.chainsLeft}`
}

function g15RenderSlots() {
  const wrap = document.getElementById('g15-word-slots')
  wrap.innerHTML = ''
  for (let i = 0; i < g15State.currentWord.length; i++) {
    const slot = document.createElement('div')
    slot.className = 'g15-slot'
    slot.id = `g15-slot-${i}`
    slot.textContent = i < g15State.collectedIdx ? g15State.currentWord[i] : '_'
    if (i < g15State.collectedIdx) slot.classList.add('filled')
    wrap.appendChild(slot)
  }
}

function g15RenderImage() {
  const wrap = document.getElementById('g15-image-wrap')
  wrap.innerHTML = ''
  wrap.style.fontSize = '56px'
  wrap.textContent = g15State.currentEmoji
}

function g15RenderLetterTiles() {
  const word = g15State.currentWord
  const decoys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(c => !word.includes(c))
  const extraCount = Math.max(2, Math.min(5, 10 - word.length))
  const shuffled = [...word.split(''), ...decoys.slice(0, extraCount)].sort(()=>Math.random()-0.5)
  const wrap = document.getElementById('g15-letters')
  wrap.innerHTML = ''
  shuffled.forEach((letter, idx) => {
    const btn = document.createElement('button')
    btn.className = 'g15-letter-tile'
    btn.textContent = letter
    btn.id = `g15-ltile-${idx}`
    btn.onclick = () => g15TapLetter(letter, idx)
    wrap.appendChild(btn)
  })
}

function g15TapLetter(letter, tileIdx) {
  if (!g15State.running) return
  const needed = g15State.currentWord[g15State.collectedIdx]
  const slot = document.getElementById(`g15-slot-${g15State.collectedIdx}`)
  const tile = document.getElementById(`g15-ltile-${tileIdx}`)
  if (letter === needed) {
    g15State.collectedIdx++
    if (slot) { slot.textContent = letter; slot.classList.add('filled','correct') }
    if (tile) tile.classList.add('used')
    playCorrect()
    if (g15State.collectedIdx >= g15State.currentWord.length) {
      setTimeout(() => g15WordComplete(), 300)
    }
  } else {
    if (slot) { slot.classList.add('wrong'); setTimeout(() => slot.classList.remove('wrong'), 400) }
    if (tile) { tile.style.animation = 'g15Shake 0.35s'; setTimeout(() => { tile.style.animation = '' }, 350) }
    playWrong()
  }
}

function g15WordComplete() {
  g15State.wordIdx++
  g15State.chainsLeft = Math.max(0, g15State.chainsLeft - 1)
  const chainIdx = g15State.totalChains - g15State.chainsLeft - 1
  const chainEl = document.getElementById(`g15-chain-${chainIdx}`)
  if (chainEl) {
    chainEl.classList.add('breaking')
    setTimeout(() => { chainEl.classList.remove('breaking'); chainEl.classList.add('broken') }, 600)
  }
  document.getElementById('g15-progress-msg').textContent = '⛓️ Rantai putus! 🎉'
  const trainIcon = document.getElementById('g15-train-icon')
  trainIcon.style.animation = 'g15TrainBounce 0.5s ease-in-out 2'
  setTimeout(() => { trainIcon.style.animation = '' }, 1000)
  if (g15State.chainsLeft <= 0) {
    setTimeout(() => g15Win(), 800)
  } else {
    setTimeout(() => g15LoadWord(), 1000)
  }
}

function g15Win() {
  g15State.running = false
  const perfStars = 5
  state.gameStars[state.currentPlayer] = perfStars
  showGameResult({
    emoji:'🚂', title:'Kereta Bebas!', stars:perfStars,
    msg:`Semua ${g15State.totalChains} rantai putus! Lokomotif pemberani berhasil!`,
    buttons:[{label:'Main Lagi 🔄', action:()=>initGame15()},{label:'Kembali ⌂', action:()=>endGameFromOverlay()}]
  })
  playCorrect()
}

// ============================================================
// GAME 16 — SELAMATKAN KERETA 🆘
// ============================================================
const G16_WORDS = {
  easy:   [{word:'KAIT',emoji:'🪝'},{word:'TALI',emoji:'🪢'},{word:'KUAT',emoji:'💪'},{word:'BISA',emoji:'✅'},{word:'MAJU',emoji:'🚀'},{word:'JAGA',emoji:'🛡️'}],
  medium: [{word:'SELAMAT',emoji:'🎉'},{word:'KERETATALI',emoji:'🚃'},{word:'TARIK',emoji:'💪'},{word:'BERANI',emoji:'🦁'},{word:'JURANG',emoji:'⛰️'},{word:'BANTU',emoji:'🤝'}],
  hard:   [{word:'PERTOLONGAN',emoji:'🆘'},{word:'PEMBERANI',emoji:'🦸'},{word:'JEMBATAN',emoji:'🌉'},{word:'SELAMATKAN',emoji:'✅'},{word:'KEBERANIAN',emoji:'💎'}]
}

let g16State = {}

function initGame16() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g16Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/g16-pixi.html'
}

function g16BeginGame() {
  document.getElementById('g16-start-overlay').style.display = 'none'
  g16State.running = true
  g16StartDangerTimer()
  g16StartPhase1()
}

function g16StartDangerTimer() {
  clearInterval(g16State.dangerInterval)
  g16State.dangerInterval = setInterval(() => {
    if (!g16State.running) { clearInterval(g16State.dangerInterval); return }
    g16State.danger = Math.min(100, g16State.danger + 2)
    document.getElementById('g16-danger-fill').style.width = g16State.danger + '%'
    const victim = document.getElementById('g16-victim-train')
    const rightPct = 8 + (g16State.danger / 100) * 14
    victim.style.right = (22 - rightPct) + '%'
    if (g16State.danger >= 30) victim.classList.add('g16-victim-danger')
    if (g16State.danger >= 100) {
      clearInterval(g16State.dangerInterval)
      g16EndGame(false)
    }
  }, 600)
}

function g16StartPhase1() {
  g16State.phase = 1
  g16State.hookTries = 0
  g16State.hookSuccess = false
  document.getElementById('g16-phase1').style.display = 'flex'
  document.getElementById('g16-phase2').style.display = 'none'
  document.getElementById('g16-hook-result').textContent = ''
  g16UpdateHookTries()
  clearInterval(g16State.needleInterval)
  g16State.needlePos = 0
  g16State.needleDir = 1
  g16State.needleInterval = setInterval(() => {
    g16State.needlePos += g16State.needleDir * g16State.needleSpeed
    if (g16State.needlePos >= 100) { g16State.needlePos = 100; g16State.needleDir = -1 }
    if (g16State.needlePos <= 0)   { g16State.needlePos = 0;   g16State.needleDir = 1  }
    const needle = document.getElementById('g16-needle')
    if (needle) needle.style.left = `calc(${g16State.needlePos}% - 4px)`
    // Show TAP indicator when needle is in green zone (33-67%)
    const tapEl = document.getElementById('g16-tap-indicator')
    if (tapEl) {
      const inGreen = g16State.needlePos >= 33 && g16State.needlePos <= 67
      tapEl.classList.toggle('show', inGreen)
    }
  }, 20)
}

function g16UpdateHookTries() {
  const el = document.getElementById('g16-hook-tries')
  if (el) el.textContent = `Percobaan: ${g16State.hookTries} / ${g16State.maxHookTries}`
}

function g16ThrowHook() {
  if (g16State.hookSuccess || g16State.phase !== 1) return
  const pos = g16State.needlePos
  const inGreen = pos >= 33 && pos <= 67
  g16State.hookTries++
  g16UpdateHookTries()
  const resultEl = document.getElementById('g16-hook-result')
  if (inGreen) {
    clearInterval(g16State.needleInterval)
    g16State.hookSuccess = true
    resultEl.textContent = '✅ KENA! Kait berhasil!'
    resultEl.style.color = '#A5D6A7'
    document.getElementById('g16-throw-btn').disabled = true
    playCorrect()
    // Speed up danger a bit to build tension
    clearInterval(g16State.dangerInterval)
    g16State.dangerInterval = setInterval(() => {
      if (!g16State.running) return
      g16State.danger = Math.min(100, g16State.danger + 1.5)
      document.getElementById('g16-danger-fill').style.width = g16State.danger + '%'
      if (g16State.danger >= 100) { clearInterval(g16State.dangerInterval); g16EndGame(false) }
    }, 600)
    setTimeout(() => {
      document.getElementById('g16-phase1').style.display = 'none'
      document.getElementById('g16-throw-btn').disabled = false
      g16StartPhase2()
    }, 800)
  } else {
    resultEl.textContent = '❌ Meleset! Coba lagi...'
    resultEl.style.color = '#FFCDD2'
    playWrong()
    if (g16State.hookTries >= g16State.maxHookTries) {
      clearInterval(g16State.needleInterval)
      setTimeout(() => g16EndGame(false), 600)
    }
  }
}

function g16StartPhase2() {
  g16State.phase = 2
  const tapsNeeded = g16State.diff === 'easy' ? 5 : g16State.diff === 'medium' ? 8 : 12
  g16State.tapsNeeded = tapsNeeded
  g16State.tapCount = 0
  document.getElementById('g16-phase2').style.display = 'flex'
  document.getElementById('g16-pull-fill').style.width = '0%'
  document.getElementById('g16-tap-count-display').textContent = `TAP 0 / ${tapsNeeded}`
  document.getElementById('g16-word-progress').textContent = `Tarik ${g16State.wordsComplete + 1} / ${g16State.wordsNeeded}`
  const btn = document.getElementById('g16-tap-btn')
  if (btn) btn.style.transform = 'scale(1)'
}

function g16TapPull() {
  if (g16State.phase !== 2) return
  g16State.tapCount++
  // Button bounce animation
  const btn = document.getElementById('g16-tap-btn')
  if (btn) {
    btn.style.transform = 'scale(0.82)'
    btn.style.boxShadow = '0 3px 0 #BF360C,0 0 0 6px rgba(255,160,80,0.25)'
    setTimeout(() => {
      btn.style.transform = 'scale(1.08)'
      btn.style.boxShadow = '0 8px 0 #BF360C,0 0 0 6px rgba(255,160,80,0.4)'
      setTimeout(() => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '' }, 80)
    }, 80)
  }
  // Rope shake
  const rope = document.getElementById('g16-rope')
  if (rope) { rope.style.transform = 'scaleX(0.94) rotate(-1.5deg)'; setTimeout(() => rope.style.transform = '', 90) }
  // Sound
  playTone(Math.min(300 + g16State.tapCount * 25, 900), 0.18, 0.07)
  // Update bar and counter
  const pct = Math.min(100, (g16State.tapCount / g16State.tapsNeeded) * 100)
  document.getElementById('g16-pull-fill').style.width = pct + '%'
  document.getElementById('g16-tap-count-display').textContent = `TAP ${g16State.tapCount} / ${g16State.tapsNeeded}`
  if (g16State.tapCount >= g16State.tapsNeeded) {
    document.getElementById('g16-phase2').style.display = 'none'
    g16PullComplete()
  }
}

function g16PullComplete() {
  g16State.wordsComplete++
  g16State.wordIdx++
  // Reduce danger and move victim train away from cliff
  g16State.danger = Math.max(0, g16State.danger - 25)
  document.getElementById('g16-danger-fill').style.width = g16State.danger + '%'
  const victim = document.getElementById('g16-victim-train')
  const newRight = Math.min(20, 8 + (g16State.danger / 100) * 14)
  victim.style.right = (22 - newRight) + '%'
  document.getElementById('g16-stars-badge').textContent = `🆘 ${g16State.wordsComplete}`
  playCorrect()
  if (g16State.wordsComplete >= g16State.wordsNeeded) {
    clearInterval(g16State.dangerInterval)
    setTimeout(() => g16EndGame(true), 600)
  } else {
    // Go back to Phase 1 (hook throw) for next pull
    setTimeout(() => {
      g16State.hookSuccess = false
      document.getElementById('g16-throw-btn').disabled = false
      g16StartPhase1()
    }, 700)
  }
}

function g16EndGame(won) {
  g16State.running = false
  clearInterval(g16State.needleInterval)
  clearInterval(g16State.dangerInterval)
  document.getElementById('g16-phase1').style.display = 'none'
  document.getElementById('g16-phase2').style.display = 'none'
  const pct = g16State.wordsComplete / g16State.wordsNeeded
  const perfStars = won ? (g16State.danger < 20 ? 5 : g16State.danger < 50 ? 4 : 3) : (pct >= 0.5 ? 2 : 1)
  state.gameStars[state.currentPlayer] = perfStars
  const msg = won
    ? `Berhasil menyelamatkan kereta dengan ${g16State.wordsComplete} tarikan! Saling membantu itu hebat!`
    : `Sudah ${g16State.wordsComplete} dari ${g16State.wordsNeeded} tarikan. Jangan menyerah!`
  showGameResult({
    emoji:won?'🎉':'😢', title:won?'KERETA SELAMAT!':'Kereta Jatuh...', stars:perfStars, msg,
    buttons:[{label:'Main Lagi 🔄', action:()=>initGame16()},{label:'Kembali ⌂', action:()=>endGameFromOverlay()}]
  })
  if (won) playCorrect(); else playWrong()
}

// ============================================================
// GAME 17 — JEMBATAN GOYANG 🌉
// ============================================================
let g17State = {}

function initGame17() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  const diff = lv <= 7 ? 'easy' : lv <= 14 ? 'medium' : 'hard'
  const totalBlocks = diff === 'easy' ? 8 : diff === 'medium' ? 10 : 12
  g17State = {
    diff, lv, totalBlocks,
    blocks: [], currentActive: -1,
    tapped: [], damage: 0, maxDamage: 3,
    timer: 30, timerInterval: null,
    baseDelay: diff === 'easy' ? 1800 : diff === 'medium' ? 1400 : 1000,
    stepDelay: diff === 'easy' ? 50 : diff === 'medium' ? 40 : 30,
    lightTimeout: null, running: false,
    correct: 0, combo: 0, bestCombo: 0, stars: 0
  }
  document.getElementById('g17-level').textContent = `Lv.${lv}`
  document.getElementById('g17-stars-badge').textContent = '🌉 0'
  document.getElementById('g17-combo').textContent = ''
  g17RenderLives()
  const flEl = document.getElementById('g17-floaters'); if(flEl) flEl.innerHTML = ''
  hideGameResult()
  const trainWrap = document.getElementById('g17-train-waiting')
  trainWrap.style.animation = ''
  trainWrap.style.left = '4%'
  // Render a proper steam loco SVG using G14 builder
  const g17Cfg = TRAIN_TYPES_14['malivlakb250'] || TRAIN_TYPES_14['b2507'] || G14_CATEGORIES[0].trains[0]
  trainWrap.innerHTML = buildSteamLocoSVG(g17Cfg, {width:160, height:70, animate:true})
  document.getElementById('g17-start-overlay').style.display = 'flex'
  document.getElementById('g17-cracks').innerHTML = ''
  g17RenderBlocks()
}

function g17RenderBlocks() {
  const bridge = document.getElementById('g17-bridge')
  bridge.innerHTML = ''
  const colors = ['#E53935','#FB8C00','#FDD835','#43A047','#1E88E5','#8E24AA','#00ACC1','#F06292','#78909C','#6D4C41','#26A69A','#EC407A']
  g17State.blocks = []
  for (let i = 0; i < g17State.totalBlocks; i++) {
    const block = document.createElement('div')
    block.className = 'g17-block'
    const num = i + 1
    // Consistent wooden-plank numbers (1..totalBlocks); wooden gradient from CSS.
    block.textContent = `${num}`
    block.dataset.idx = i
    block.onclick = () => g17TapBlock(i)
    bridge.appendChild(block)
    g17State.blocks.push({ el: block, idx: i, tapped: false })
  }
}

function g17StartGame() {
  document.getElementById('g17-start-overlay').style.display = 'none'
  g17State.running = true
  g17State.timer = 30
  g17StartTimer()
  setTimeout(() => g17LightNextBlock(), 400)
}

function g17StartTimer() {
  clearInterval(g17State.timerInterval)
  g17State.timerInterval = setInterval(() => {
    if (!g17State.running) { clearInterval(g17State.timerInterval); return }
    g17State.timer = Math.max(0, g17State.timer - 1)
    const timerText = document.getElementById('g17-timer-text')
    const timerBar = document.getElementById('g17-timer-bar')
    if (timerText) timerText.textContent = g17State.timer
    if (timerBar) timerBar.style.width = (g17State.timer / 30 * 100) + '%'
    if (g17State.timer <= 0) {
      clearInterval(g17State.timerInterval)
      if (g17State.running) g17EndGame(false)
    }
  }, 1000)
}

function g17LightNextBlock() {
  if (!g17State.running) return
  // Find next un-tapped block
  const remaining = g17State.blocks.filter(b => !b.tapped)
  if (remaining.length === 0) {
    g17EndGame(true)
    return
  }
  // Pick random from remaining
  const pick = remaining[Math.floor(Math.random() * remaining.length)]
  g17State.currentActive = pick.idx
  pick.el.classList.add('active')
  // Auto-remove active after timeout (penalty if not tapped)
  const delay = Math.max(500, g17State.baseDelay - g17State.correct * g17State.stepDelay)
  clearTimeout(g17State.lightTimeout)
  g17State.lightTimeout = setTimeout(() => {
    if (!g17State.running) return
    // Missed — apply damage
    if (pick.el.classList.contains('active')) {
      pick.el.classList.remove('active')
      g17State.damage++
      g17State.combo = 0
      document.getElementById('g17-combo').textContent = '💨 Terlewat!'
      document.getElementById('g17-combo').style.color = '#FFCDD2'
      const bg = document.getElementById('g17-bridge-group')
      if (bg) { bg.classList.add('bridge-shake'); setTimeout(() => bg.classList.remove('bridge-shake'), 520) }
      g17AddCrack()
      g17RenderLives()
      const lv = document.getElementById('g17-lives'); if (lv) { lv.classList.remove('heart-loss'); void lv.offsetWidth; lv.classList.add('heart-loss') }
      g17SpawnFloater('dmg', '-1 💔', pick.el)
      playWrong()
      if (g17State.damage >= g17State.maxDamage) {
        g17EndGame(false)
        return
      }
    }
    setTimeout(() => g17LightNextBlock(), 300)
  }, delay)
}

function g17TapBlock(idx) {
  if (!g17State.running) return
  const block = g17State.blocks[idx]
  if (!block || block.tapped) return
  if (idx === g17State.currentActive) {
    // Correct!
    clearTimeout(g17State.lightTimeout)
    block.el.classList.remove('active')
    block.el.classList.add('correct')
    block.tapped = true
    g17State.correct++
    g17State.combo++
    if (g17State.combo > g17State.bestCombo) g17State.bestCombo = g17State.combo
    document.getElementById('g17-stars-badge').textContent = `🌉 ${g17State.correct}`
    const comboEl = document.getElementById('g17-combo')
    if (g17State.combo >= 3) {
      comboEl.textContent = `🔥 COMBO x${g17State.combo}!`
      comboEl.style.color = '#FDD835'
      g17SpawnFloater('combo', `COMBO x${g17State.combo}!`, block.el)
    } else {
      comboEl.textContent = '✅ Tepat!'
      comboEl.style.color = '#A5D6A7'
      g17SpawnFloater('bonus', '+1 ⭐', block.el)
    }
    playCorrect()
    // Juice: particle burst + ring ripple at block center
    try {
      const r = block.el.getBoundingClientRect()
      const cx = r.left + r.width/2, cy = r.top + r.height/2
      spawnParticleBurst(cx, cy)
      const ring = document.createElement('div')
      ring.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:12px;height:12px;border-radius:50%;border:3px solid #4ade80;box-shadow:0 0 16px #4ade80;transform:translate(-50%,-50%) scale(0.5);opacity:0.9;pointer-events:none;z-index:9998;animation:g17CorrectRing 0.55s ease-out forwards;`
      document.body.appendChild(ring)
      setTimeout(()=>ring.remove(), 600)
    } catch(e) {}
    const remaining = g17State.blocks.filter(b => !b.tapped)
    if (remaining.length === 0) {
      clearTimeout(g17State.lightTimeout)
      setTimeout(() => g17EndGame(true), 500)
      return
    }
    setTimeout(() => g17LightNextBlock(), 250)
  } else {
    // Wrong block
    block.el.classList.add('wrong')
    setTimeout(() => block.el.classList.remove('wrong'), 400)
    g17State.damage++
    g17State.combo = 0
    document.getElementById('g17-combo').textContent = '❌ Salah!'
    document.getElementById('g17-combo').style.color = '#FFCDD2'
    // Bridge shake on wrong tap
    const bg = document.getElementById('g17-bridge-group')
    if (bg) { bg.classList.add('bridge-shake'); setTimeout(() => bg.classList.remove('bridge-shake'), 520) }
    g17AddCrack()
    g17RenderLives()
    const lv2 = document.getElementById('g17-lives'); if (lv2) { lv2.classList.remove('heart-loss'); void lv2.offsetWidth; lv2.classList.add('heart-loss') }
    g17SpawnFloater('dmg', '-1 💔', block.el)
    playWrong()
    if (g17State.damage >= g17State.maxDamage) {
      clearTimeout(g17State.lightTimeout)
      g17EndGame(false)
    }
  }
}

function g17AddCrack() {
  const cracks = document.getElementById('g17-cracks')
  const line = document.createElement('div')
  line.className = 'g17-crack-line'
  const top = 15 + Math.random() * 25
  const left = 5 + Math.random() * 60
  const width = 20 + Math.random() * 30
  const angle = -10 + Math.random() * 20
  line.style.cssText = `top:${top}px;left:${left}%;width:${width}%;transform:rotate(${angle}deg);`
  cracks.appendChild(line)
}

function g17RenderLives() {
  const el = document.getElementById('g17-lives'); if (!el) return
  const remaining = Math.max(0, (g17State.maxDamage || 3) - (g17State.damage || 0))
  el.textContent = '❤️'.repeat(remaining) + '🖤'.repeat((g17State.maxDamage || 3) - remaining)
}

function g17SpawnFloater(kind, text, el) {
  const host = document.getElementById('g17-floaters'); if (!host) return
  const f = document.createElement('div')
  f.className = 'g17-floater ' + kind
  f.textContent = text
  const rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null
  const hostRect = host.getBoundingClientRect()
  if (rect) {
    f.style.left = (rect.left - hostRect.left + rect.width/2) + 'px'
    f.style.top  = (rect.top  - hostRect.top) + 'px'
  } else {
    f.style.left = '50%'; f.style.top = '40%'
  }
  host.appendChild(f)
  setTimeout(() => f.remove(), 1200)
}

function g17EndGame(won) {
  g17State.running = false
  clearTimeout(g17State.lightTimeout)
  clearInterval(g17State.timerInterval)
  // Remove active state from current block
  if (g17State.currentActive >= 0 && g17State.blocks[g17State.currentActive]) {
    g17State.blocks[g17State.currentActive].el.classList.remove('active')
  }
  if (won) {
    // Replace static train with animated inline SVG, then cross bridge
    const trainEl = document.getElementById('g17-train-waiting')
    const steamCfg = { isSteam:true, tender:true, rack:false, bodyColor:'#1a1a2e', wheelColor:'#0d0d1a' }
    trainEl.innerHTML = buildSteamLocoSVG(steamCfg, {animate:true, width:120, height:54})
    // Snap off transition so bottom change doesn't cause diagonal slide
    trainEl.style.transition = 'none'
    trainEl.style.position = 'absolute'
    trainEl.style.bottom = '44%'
    void trainEl.offsetWidth  // reflow to apply snap
    trainEl.classList.add('g17-train-cross')
    playCorrect()
  }
  // Unified scoring: accuracy-based with damage as lives-lost proxy
  const _g17MaxDamage = 3
  const perfStars = won
    ? GameScoring.calc({
        correct: g17State.correct,
        total: g17State.totalBlocks,
        lives: Math.max(0, _g17MaxDamage - g17State.damage),
        maxLives: _g17MaxDamage
      })
    : GameScoring.calc({
        correct: g17State.correct,
        total: g17State.totalBlocks
      })
  state.gameStars[state.currentPlayer] = perfStars
  setTimeout(() => {
    const facts = [
      'Jembatan kereta pertama dibangun di Inggris tahun 1825!',
      'Rel kereta terbuat dari baja yang sangat kuat!',
      'Membangun jembatan butuh kerja sama tim yang hebat!'
    ]
    showGameResult({
      emoji:won?'🏆':'💔', title:won?'JEMBATAN SELESAI!':'Jembatan Retak...', stars:perfStars,
      msg:`${g17State.correct}/${g17State.totalBlocks} balok • Combo terbaik: x${g17State.bestCombo}\n${facts[Math.floor(Math.random()*facts.length)]}`,
      buttons:[{label:'Main Lagi 🔄', action:()=>initGame17()},{label:'Kembali ⌂', action:()=>endGameFromOverlay()}]
    })
    if (!won) playWrong()
  }, won ? 1600 : 400)
}

// ============================================================
// GAME 18 — MUSEUM KERETA AMBARAWA 🏛️
// Koleksi Museum Kereta Api Ambarawa + kereta-kereta terkenal dunia
// ============================================================
// G18 inline SVG builder — context-aware for museum gallery
function g18TrainSVG(t, w, h) {
  if (t.isSteam) return buildSteamLocoSVG(t, {animate:false, width:w||120, height:h||52})
  if (t.isDiesel) return buildDieselLocoSVG(t, {animate:false, width:w||120, height:h||52})
  if (t.isElectric) return buildElectricLocoSVG(t, {animate:false, width:w||120, height:h||52})
  return `<span style="font-size:40px;line-height:1;">${t.emoji}</span>`
}

const G18_TRAINS = [
  // ── KOLEKSI MUSEUM KERETA API AMBARAWA ──
  {
    emoji:'🚂', name:'B 2507 — Kereta Bergerigi', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1902,
    fuel:'Batubara (Uap)', speed:30, type:'Lokomotif Rack (Bergerigi)', builder:'SLM Swiss', axles:'B-B',
    isSteam:true, rack:true, tender:false, bodyColor:'#1a1a2e', wheelColor:'#0d0d1a',
    fact:'Bintang utama Museum Ambarawa! B2507 dibuat di Swiss oleh SLM tahun 1902. Punya roda BERGERIGI (cogwheel) khusus untuk mendaki gunung terjal — salah satu dari sedikit kereta rack yang masih ada di dunia! ⛰️',
    funFact:'🏔️ Jalur B2507 punya tanjakan 65‰ — artinya naik 65 meter setiap 1 km! Sangat curam!',
    history:'B2507 dibuat pabrik SLM Winterthur di Swiss tahun 1902 🇨🇭. Memakai sistem gigi ABT — rel tengah bergerigi yang dicengkeram roda gigi lokomotif agar tidak tergelincir di tanjakan ekstrem. Jalur Ambarawa–Bedono resmi dibuka tahun 1905 untuk menghubungkan perkebunan kopi di lereng Gunung Merbabu. Kini B2507 jadi simbol Museum Ambarawa dan kebanggaan Indonesia 🚂🌄🇮🇩',
    route:'Ambarawa ↔ Bedono via Jambu',
    quizHint:'kereta bergerigi pendaki gunung di Ambarawa'
  },
  {
    emoji:'🚂', name:'B 2521 — Rack Ambarawa-Bedono', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1912,
    fuel:'Batubara (Uap)', speed:25, type:'Lokomotif Uap Bergerigi', builder:'SLM Swiss',
    isSteam:true, rack:true, tender:false, bodyColor:'#0d2a0d', wheelColor:'#061606',
    fact:'B2521 melayani jalur Ambarawa–Bedono yang sangat terjal! Melewati perkebunan kopi dan teh di kaki Gunung Merbabu. Kemiringan jalurnya 65‰ — salah satu yang terextrim di dunia! 🌋',
    funFact:'☕ Jalur ini dulu dipakai untuk mengangkut hasil perkebunan kopi & teh ke kota!',
    route:'Ambarawa ↔ Bedono (tanjakan curam)',
    quizHint:'kereta rack jalur Ambarawa-Bedono gunung'
  },
  {
    emoji:'🚂', name:'C 5107 — Lok Tender Kolonial', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1921,
    fuel:'Batubara (Uap)', speed:60, type:'Lokomotif Uap Tender', builder:'Hartmann, Jerman',
    isSteam:true, rack:false, tender:true, bodyColor:'#0f0f0f', wheelColor:'#050505',
    fact:'C5107 buatan pabrik Hartmann, Jerman (1921). Di era Hindia Belanda, mengangkut penumpang & hasil bumi. Kini jadi bintang Kereta Wisata Ambarawa–Tuntang yang masih beroperasi! ☕🚂',
    funFact:'🎉 Kamu bisa naiki kereta wisata ini! Rute Ambarawa–Tuntang sejauh ±5 km!',
    route:'Ambarawa ↔ Tuntang (kereta wisata)',
    quizHint:'kereta wisata uap Ambarawa-Tuntang'
  },
  {
    emoji:'🚂', name:'D 1415 — Tender Hanomag', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1908,
    fuel:'Batubara (Uap)', speed:55, type:'Lokomotif Uap Tender', builder:'Hanomag, Jerman',
    isSteam:true, rack:false, tender:true, bodyColor:'#2a1a0a', wheelColor:'#150a00',
    fact:'D1415 buatan Hanomag, Jerman 1908. Punya tangki air besar (tender) di belakang untuk perjalanan panjang. Dulu mengangkut gula, kopi, dan teh dari perkebunan Jawa! 💨🌿',
    funFact:'🪨 Tender di belakangnya menyimpan batubara untuk 5–6 jam perjalanan!',
    route:'Jalur pegunungan Jawa Tengah',
    quizHint:'kereta uap dengan tender besar di belakang'
  },
  {
    emoji:'🚂', name:'C 1218 — Lokomotif Tertua RI', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1891,
    fuel:'Batubara (Uap)', speed:50, type:'Lokomotif Tank Uap', builder:'Beyer Peacock, Inggris',
    isSteam:true, rack:false, tender:false, bodyColor:'#4a1515', wheelColor:'#2a0808',
    fact:'C1218 adalah salah satu lokomotif TERTUA di Indonesia! Buatan Beyer Peacock, Inggris 1891 — sudah 130+ tahun! Masih terawat baik di Museum Ambarawa. Luar biasa! 🎩👑',
    funFact:'📅 C1218 dibuat saat Indonesia masih bernama Hindia Belanda dan Presiden Soekarno belum lahir!',
    history:'C1218 dioperasikan oleh Staats Spoorwegen (SS), perusahaan kereta pemerintah Hindia Belanda di masa kolonial. Lokomotif ini mengangkut penumpang dan hasil bumi di Pulau Jawa sejak 1891 🚂. C1218 SELAMAT dari dua Perang Dunia dan revolusi kemerdekaan RI — banyak lokomotif lain rusak atau dijarah. Kini jadi saksi bisu sejarah panjang perkeretaapian Indonesia 🇮🇩🎖️',
    route:'Berbagai jalur Jawa era kolonial',
    quizHint:'lokomotif tertua 1891 di Indonesia'
  },
  {
    emoji:'🚂', name:'B 2801 — Rack SLM Merbabu', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1907,
    fuel:'Batubara (Uap)', speed:28, type:'Lokomotif Rack Gunung', builder:'SLM Swiss',
    isSteam:true, rack:true, tender:false, bodyColor:'#0a1f0a', wheelColor:'#051005',
    fact:'B2801 buatan Swiss Locomotive Works 1907. Mesin uap + roda gigi bergabung menaklukkan tanjakan 65‰ — naik 65 meter setiap 1 km! Satu-satunya di dunia yang masih beroperasi tourist! 😱⛰️',
    funFact:'🇨🇭 SLM (Swiss Locomotive Works) juga membuat kereta gunung terkenal di Alpen Swiss!',
    route:'Ambarawa ↔ Bedono (wisata gunung)',
    quizHint:'kereta rack Swiss tanjakan paling curam'
  },
  {
    emoji:'🚂', name:'B 2503 — Rack Pionir', country:'🇮🇩 Ambarawa, Jawa Tengah', year:1898,
    fuel:'Batubara (Uap)', speed:22, type:'Lokomotif Rack Tua', builder:'SLM Swiss',
    isSteam:true, rack:true, tender:false, bodyColor:'#1a0f00', wheelColor:'#0d0700',
    fact:'B2503 adalah lokomotif rack tertua di koleksi Ambarawa! Dibuat SLM Swiss 1898, sudah 125+ tahun! Generasi pertama kereta bergigi di Indonesia yang membuka jalur gunung! 🎖️',
    funFact:'🌄 Tanpa B2503 dan kawan-kawannya, kawasan Bedono & Jambu sulit dijangkau di era kolonial!',
    route:'Ambarawa ↔ Bedono (jalur historis)',
    quizHint:'lokomotif rack tertua Ambarawa 1898'
  },
  {
    emoji:'🚂', name:'C 28 — Biru Malam Kolonial', country:'🇮🇩 Jawa', year:1920,
    fuel:'Batubara (Uap)', speed:70, type:'Lokomotif Tender Cepat', builder:'Hartmann, Jerman',
    isSteam:true, rack:false, tender:true, bodyColor:'#0f1540', wheelColor:'#070a25',
    fact:'Kelas C28 Hindia Belanda 1920! Cat biru malam yang elegan di jalur perbukitan. Lokomotif ini melayani penumpang kelas satu — para tuan tanah dan pejabat Belanda! 🌙👒',
    funFact:'💼 Dulu ada gerbong kelas 1 (pejabat Belanda), kelas 2 (pedagang), dan kelas 3 (rakyat biasa)!',
    route:'Jalur Priangan & Jawa Tengah',
    quizHint:'kereta biru malam C28 Hindia Belanda'
  },
  {
    emoji:'🚃', name:'CC 200 — Setan Ijo', country:'🇮🇩 Indonesia', year:1953,
    fuel:'Solar (Diesel)', speed:120, type:'Lokomotif Diesel Elektrik', builder:'General Electric, Amerika',
    isDiesel:true, bodyColor:'#1a3a1a', accentColor:'#22c55e',
    fact:'CC200 adalah lokomotif diesel PERTAMA Indonesia! General Electric, Amerika 1953. Masinis menjuluki "Setan Ijo" karena cat hijau dan tenaganya dahsyat! Revolusi kereta Indonesia! 🦾🇺🇸',
    funFact:'🟢 "Setan Ijo" artinya Setan Hijau — para masinis takjub dengan kekuatan mesin GE yang luar biasa!',
    history:'Di era Presiden Sukarno, pemerintah Indonesia memesan 27 unit CC200 dari General Electric Amerika tahun 1953 🇺🇸. Ini adalah langkah BESAR memodernisasi perkeretaapian RI — dari lokomotif uap berasap ke diesel bersih dan bertenaga. CC200 menjadi tulang punggung kereta ekspres Jakarta–Surabaya dan membuka era baru transportasi Indonesia. Satu unit masih terawat di Museum Ambarawa 🚆🎖️',
    route:'Jakarta ↔ Surabaya (ekspres awal)',
    quizHint:'diesel pertama Indonesia Setan Ijo GE'
  },
  {
    emoji:'🚂', name:'E 1060 — Listrik Antik 1924', country:'🇮🇩 Indonesia', year:1924,
    fuel:'Listrik', speed:90, type:'Lokomotif Listrik Antik', builder:'Belanda',
    isElectric:true, bodyColor:'#1a1a4a', accentColor:'#ffd700',
    fact:'E1060 membuktikan Indonesia sudah punya kereta LISTRIK sejak 1924 — 100 tahun lalu! Kini jadi koleksi langka di Ambarawa yang sangat berharga. Jarang sekali ada di dunia! ⚡🏆',
    funFact:'💡 Jalur listrik pertama Indonesia: Batavia (Jakarta) – Buitenzorg (Bogor) 1925!',
    route:'Jalur listrik Batavia era kolonial',
    quizHint:'kereta listrik antik Indonesia 1924'
  },
  {
    emoji:'🚂', name:'B 50 — Si Tua Jawa', country:'🇮🇩 Jawa', year:1880,
    fuel:'Batubara (Uap)', speed:45, type:'Lokomotif Tank Tua', builder:'Krupp, Jerman',
    isSteam:true, rack:false, tender:false, bodyColor:'#2a1e08', wheelColor:'#150f00',
    fact:'B50 buatan Krupp Jerman 1880-an! Salah satu lokomotif tertua di Jawa. Lambat tapi legendaris — membangun fondasi perkeretaapian Indonesia di era awal kolonial! 🦕🎖️',
    funFact:'⛏️ Jalur kereta pertama Indonesia dibuka 1867 rute Semarang–Tanggung, hanya 25 km!',
    route:'Jalur Semarang & Jawa Tengah awal',
    quizHint:'kereta tua B50 Krupp Jerman 1880'
  },
  {
    emoji:'🚂', name:'Kereta Wisata Ambarawa', country:'🇮🇩 Ambarawa', year:2000,
    fuel:'Batubara (Uap)', speed:30, type:'Kereta Wisata Heritage', builder:'Gabungan lok tua',
    isSteam:true, rack:false, tender:true, bodyColor:'#5D3A1A', wheelColor:'#3a2010',
    fact:'Kereta Wisata Ambarawa masih beroperasi menggunakan lokomotif uap tua! Rute Ambarawa–Tuntang ±5 km melewati sawah dan danau. Kamu bisa naiki dan rasakan serunya! ☁️🎉🚂',
    funFact:'📸 Inilah satu-satunya jalur kereta bergigi yang masih aktif untuk wisata di Asia Tenggara!',
    route:'Ambarawa ↔ Tuntang (wisata aktif)',
    quizHint:'kereta wisata uap yang bisa dinaiki'
  },
  // ── KERETA TERKENAL DUNIA ──
  {
    emoji:'🚂', name:'Shinkansen N700 — Peluru Jepang', country:'🇯🇵 Jepang', year:2007,
    fuel:'Listrik', speed:320, type:'Kereta Cepat (Shinkansen)', builder:'Kawasaki Heavy Industries',
    isElectric:true, bodyColor:'#1A1A6B', accentColor:'#0077cc',
    fact:'Shinkansen dijuluki "Peluru" karena hidungnya seperti peluru! Tepat waktu hingga detik — keterlambatan rata-rata hanya 36 detik per tahun! Dibanding B2507 Ambarawa, 10× lebih cepat! ⚡🇯🇵',
    funFact:'⏱️ Jika keterlambatan >1 menit, perusahaan minta MAAF resmi dan memberi surat keterlambatan!',
    route:'Tokyo ↔ Osaka (515 km, 2,5 jam)',
    quizHint:'kereta peluru Jepang 320 km/jam'
  },
  {
    emoji:'🚃', name:'Argo Bromo Anggrek', country:'🇮🇩 Indonesia', year:1997,
    fuel:'Solar (Diesel)', speed:120, type:'Kereta Ekspress', builder:'INKA Indonesia',
    isDiesel:true, bodyColor:'#0a1a3a', accentColor:'#f59e0b',
    fact:'Kereta ekspress terbaik Indonesia! Jakarta–Surabaya ±9 jam. Dinamai Gunung Bromo. CC204 sebagai lokomotifnya — 4× lebih cepat dari B2507 Ambarawa! 🌋🏆',
    funFact:'🇮🇩 Gerbong keretanya buatan INKA di Madiun, Jawa Timur! Bangga produk lokal!',
    route:'Jakarta Gambir ↔ Surabaya Gubeng',
    quizHint:'kereta ekspress Jakarta-Surabaya Argo Bromo'
  },
  {
    emoji:'🚂', name:'KRL Commuter Jabodetabek', country:'🇮🇩 Indonesia', year:2013,
    fuel:'Listrik', speed:100, type:'Kereta Listrik Komuter', builder:'Tokyu/Kawasaki (bekas Jepang)',
    isElectric:true, bodyColor:'#0D47A1', accentColor:'#e53935',
    fact:'KRL mengangkut lebih dari 1 JUTA penumpang SETIAP HARI! Tanpa asap dan ramah lingkungan. Beda sekali dengan B2507 Ambarawa yang butuh batubara berkeranjang-keranjang! 🌿💙',
    funFact:'♻️ KRL yang beroperasi di Jakarta dulunya adalah kereta bekas Jepang yang direkondisi ulang!',
    history:'Modernisasi KRL Jabodetabek dimulai serius sejak 2013 ⚡. PT KAI Commuter mengimpor kereta bekas dari Jepang (seri JR 203, 205, 8000, dan Tokyu) lalu merekondisinya di Balai Yasa Manggarai. Jalur Jabodetabek dielektrifikasi penuh dengan listrik aliran atas 1500 VDC. Kini KRL jadi transportasi massal andalan ibu kota — ramah lingkungan dan bebas macet 🚆🌿🇮🇩',
    route:'Bogor/Bekasi/Tangerang ↔ Jakarta',
    quizHint:'kereta listrik 1 juta penumpang sehari Jabodetabek'
  },
  {
    emoji:'🚂', name:'TGV — Kereta Cepat Prancis', country:'🇫🇷 Perancis', year:1981,
    fuel:'Listrik (Nuklir)', speed:574, type:'Train à Grande Vitesse', builder:'Alstom, Perancis',
    isElectric:true, bodyColor:'#003189', accentColor:'#e63946',
    fact:'TGV rekor dunia kereta konvensional — 574 km/jam! Hampir secepat pesawat! Ambarawa ke Jakarta ±350 km: TGV 37 menit, kereta uap Ambarawa 4+ jam! 🚀🇫🇷',
    funFact:'⚛️ Listrik TGV berasal dari energi nuklir Prancis — hijau dan sangat bertenaga!',
    route:'Paris ↔ Lyon (400 km, 2 jam)',
    quizHint:'kereta tercepat konvensional Perancis 574 km/jam'
  },
  {
    emoji:'🚇', name:'MRT Jakarta — Kereta Bawah Tanah', country:'🇮🇩 Indonesia', year:2019,
    fuel:'Listrik', speed:80, type:'Mass Rapid Transit', builder:'Sumitomo, Jepang',
    isElectric:true, bodyColor:'#37474f', accentColor:'#26c6da',
    fact:'MRT Jakarta adalah kereta bawah tanah PERTAMA Indonesia! 16 stasiun, dibangun 10+ tahun. Beda dengan B2507 mendaki gunung, MRT justru menyelam ke bawah tanah kota! 🏙️🚇',
    funFact:'🔭 Stasiun MRT terdalam di Jakarta sampai 26 meter di bawah tanah — sedalam gedung 8 lantai!',
    history:'Ide MRT Jakarta sudah ada sejak awal 1990-an, tapi terus tertunda karena krisis ekonomi 1998 dan banyaknya pergantian pemerintahan 🏙️. Konstruksi akhirnya dimulai 2013 dengan pendanaan dari JICA (Japan International Cooperation Agency) dan teknologi kereta Sumitomo-Nippon Sharyo Jepang 🇯🇵. Setelah 20+ tahun menunggu, MRT Fase 1 resmi beroperasi Maret 2019 — jadi lompatan besar transportasi ibu kota 🚇🇮🇩',
    route:'Lebak Bulus ↔ Bundaran HI (16 km)',
    quizHint:'kereta bawah tanah pertama Indonesia MRT'
  },
  {
    emoji:'🚂', name:'SCMaglev L0 — Kereta Magnet', country:'🇯🇵 Jepang', year:2015,
    fuel:'Magnet Superkonduktor', speed:603, type:'Maglev (Kereta Melayang)', builder:'JR Central, Jepang',
    isElectric:true, bodyColor:'#1a1a2e', accentColor:'#00f5ff',
    fact:'SCMaglev L0 tidak menyentuh rel sama sekali — melayang di atas magnet! 603 km/jam, rekor dunia! Kebalikan B2507 yang bergigi agar tidak tergelincir. Teknologi masa depan! 🧲🚀',
    funFact:'🌡️ Magnet superkonduktor butuh didinginkan hingga −269°C — lebih dingin dari luar angkasa!',
    route:'Tokyo ↔ Nagoya (target 2027, 40 menit)',
    quizHint:'kereta magnet melayang tercepat dunia 603 km/jam'
  },
  {
    emoji:'🚂', name:'CR400 Fuxing — Kereta Tercepat Beroperasi', country:'🇨🇳 China', year:2017,
    fuel:'Listrik', speed:350, type:'High-Speed Rail', builder:'CRRC, China',
    isElectric:true, bodyColor:'#b71c1c', accentColor:'#ffc107',
    fact:'CR400 Fuxing adalah kereta penumpang TERCEPAT yang beroperasi reguler di dunia! 350 km/h setiap hari. China kini punya >40.000 km jalur HSR — lebih panjang dari keliling bumi! 🇨🇳🏆',
    funFact:'🌏 Nama "Fuxing" artinya "Kebangkitan" — simbol kemajuan teknologi China modern!',
    route:'Beijing ↔ Shanghai (1318 km, 4,5 jam)',
    quizHint:'kereta terkencang beroperasi Fuxing China 350 km/jam'
  },
  // ── KERETA LORI TEBU & INDUSTRI ──
  {
    emoji:'🚂', name:'Lori Tebu — Kereta Perkebunan', country:'🇮🇩 Jawa (Cirebon, Madiun, Jogja)', year:1880,
    fuel:'Batubara (Uap)', speed:15, type:'Lokomotif Lori Perkebunan', builder:'Orenstein & Koppel, Jerman',
    isSteam:true, rack:false, tender:false, bodyColor:'#14532D', wheelColor:'#052e16',
    fact:'Lori Tebu adalah kereta KECIL khusus pabrik gula! Rel sempit hanya 60cm, bertugas mengangkut batang tebu dari kebun ke pabrik gula. Masih beroperasi di pabrik Sragi, Tasikmadu, dan Colomadu! 🎋🍬',
    funFact:'🍭 Gula Indonesia dulu terkenal di Eropa — 1 kereta lori bisa mengangkut 4 ton tebu per perjalanan!',
    route:'Kebun tebu ↔ Pabrik gula (rel sempit 600mm)',
    quizHint:'kereta kecil pengangkut tebu pabrik gula'
  },
  {
    emoji:'🚂', name:'CC201 — Diesel Legendaris PT KAI', country:'🇮🇩 Indonesia', year:1977,
    fuel:'Solar (Diesel Elektrik)', speed:100, type:'Lokomotif Diesel Elektrik', builder:'General Electric, USA',
    isDiesel:true, bodyColor:'#FF6B00', accentColor:'#FFD700',
    fact:'CC201 adalah LOKOMOTIF DIESEL paling populer di Indonesia! Dibuat General Electric USA sejak 1977. Warna oranye-hitamnya khas — favorit anak-anak penggemar kereta! 🧡',
    funFact:'🏆 Ada 140+ CC201 yang beroperasi. Satu lok bisa tarik 10-14 gerbong sekaligus!',
    route:'Seluruh Jawa & Sumatera — penumpang & barang',
    quizHint:'lokomotif diesel oranye populer Indonesia CC201'
  },
  {
    emoji:'🚄', name:'KCIC400AF Whoosh — HSR Indonesia', country:'🇮🇩 Indonesia (Jakarta–Bandung)', year:2023,
    fuel:'Listrik', speed:350, type:'High-Speed Rail', builder:'CRRC Qingdao Sifang',
    isElectric:true, bodyColor:'#C8102E', accentColor:'#FFFFFF',
    fact:'Whoosh adalah kereta cepat PERTAMA di Asia Tenggara! 🎉 Dari Jakarta ke Bandung cuma 45 menit (biasanya 3 jam naik mobil). Diresmikan Presiden Jokowi Oktober 2023! 🇮🇩⚡',
    funFact:'💨 Nama "Whoosh" dipilih dari sayembara nasional — singkatan Waktu Hemat Operasi Optimal Sistem Hebat!',
    history:'Proyek kereta cepat ini hasil kerjasama Indonesia–China (KCIC) senilai Rp 108 triliun. Awalnya bersaing dengan Shinkansen Jepang, pemerintah memilih teknologi CRH400 China karena skema pembiayaan lebih fleksibel 🇨🇳🇮🇩. Sempat terkendala pandemi COVID-19 dan pembebasan lahan, akhirnya Whoosh beroperasi Oktober 2023. Jadi simbol kemajuan teknologi Indonesia — tercepat di Asia Tenggara 🚄🏆',
    route:'Halim (Jakarta) ↔ Tegalluar (Bandung) • 142 km',
    quizHint:'kereta cepat pertama Asia Tenggara Jakarta Bandung'
  },
  {
    emoji:'🚂', name:'Argo Parahyangan — Eksekutif Favorit', country:'🇮🇩 Indonesia (Jakarta–Bandung)', year:2010,
    fuel:'Solar (Diesel) + Listrik', speed:120, type:'Kereta Eksekutif Penumpang', builder:'INKA, Madiun',
    isDiesel:true, bodyColor:'#1E40AF', accentColor:'#FCD34D',
    fact:'Argo Parahyangan adalah kereta EKSEKUTIF paling favorit di Pulau Jawa! Dibuat oleh INKA Madiun — industri kereta kebanggaan Indonesia. Melintasi terowongan Sasaksaat dan Jembatan Cisomang! 🏞️',
    funFact:'🇮🇩 INKA Madiun juga ekspor kereta ke Bangladesh, Filipina, dan Selandia Baru!',
    route:'Gambir (Jakarta) ↔ Bandung • 173 km, 3 jam',
    quizHint:'kereta eksekutif Jakarta Bandung Argo Parahyangan INKA'
  },
  {
    emoji:'🚋', name:'LRT Jabodebek — Tanpa Masinis', country:'🇮🇩 Jakarta (GoA Level 3)', year:2023,
    fuel:'Listrik', speed:80, type:'Light Rail Transit (Otomatis)', builder:'INKA + Siemens',
    isElectric:true, bodyColor:'#FF0000', accentColor:'#FFFFFF',
    fact:'LRT Jabodebek adalah kereta TANPA MASINIS (driverless) pertama di Indonesia! 🤖 Dikendalikan komputer sepenuhnya — GoA Level 3. Juga kereta LRT pertama buatan INKA Madiun 🏭',
    funFact:'🤖 Meski tanpa masinis, ada petugas di stasiun yang memantau via komputer pusat!',
    route:'Dukuh Atas ↔ Harjamukti / Jatimulya • 44 km',
    quizHint:'kereta tanpa masinis otomatis Jakarta LRT Jabodebek'
  },
  // ── SEJARAH PANJANG KERETA INDONESIA 1867–2025 ──
  {
    emoji:'🚂', name:'SS 1867 — Kereta Pertama Indonesia', country:'🇮🇩 Semarang, Jawa Tengah', year:1867,
    fuel:'Batubara (Uap)', speed:40, type:'Lokomotif Uap Tender Pionir', builder:'Beyer Peacock, Inggris',
    isSteam:true, rack:false, tender:true, bodyColor:'#3a1f0a', wheelColor:'#1a0f05',
    fact:'Inilah kereta PERTAMA yang pernah berjalan di tanah Indonesia! 🎖️ Tanggal 10 Agustus 1867, lokomotif buatan Beyer Peacock Inggris melintas di rute Semarang–Tanggung sejauh 25 km. Penduduk takjub melihat "kuda besi" berasap untuk pertama kalinya! 🚂💨',
    funFact:'🎉 Peresmiannya dihadiri Gubernur Jenderal Pieter Mijer dan disambut ribuan warga yang belum pernah melihat kereta!',
    history:'Di era Hindia Belanda, perusahaan swasta Nederlandsch-Indische Spoorweg Maatschappij (NISM) membangun jalur kereta pertama Indonesia 🇳🇱. Rute Semarang–Tanggung dibuka 10 Agustus 1867 memakai lebar rel 1435mm (standar Eropa). Tujuan awal: mengangkut hasil bumi dan gula dari pedalaman Jawa ke pelabuhan Semarang. Jadi titik awal sejarah panjang perkeretaapian Indonesia 🚂🌏',
    route:'Semarang ↔ Tanggung (25 km, rute pertama RI)',
    quizHint:'kereta pertama Indonesia 1867 Semarang Tanggung'
  },
  {
    emoji:'🚂', name:'SS 500 — Mogul Kolonial', country:'🇮🇩 Jawa', year:1896,
    fuel:'Batubara (Uap)', speed:65, type:'Lokomotif Uap Mogul (2-6-0)', builder:'Werkspoor, Belanda',
    isSteam:true, rack:false, tender:true, bodyColor:'#1a3a1a', wheelColor:'#0a1f0a',
    fact:'SS 500 adalah lokomotif Mogul 2-6-0 buatan Werkspoor Belanda tahun 1896! Tiga pasang roda penggerak besar membuatnya kuat menarik gerbong panjang. Cat hijau tuanya khas kereta kolonial Hindia Belanda! 🟢🚂',
    funFact:'🍬 SS 500 spesialis mengangkut gula — 1 kereta bisa tarik 20 gerbong gula dari pabrik ke pelabuhan!',
    history:'SS 500 dipesan Staats Spoorwegen dari pabrik Werkspoor Amsterdam, Belanda 🇳🇱 di tahun 1896. Era itu Jawa dikenal sebagai "Gudang Gula Dunia" — 1/3 gula dunia datang dari Indonesia! SS 500 memainkan peran kunci mengangkut tebu dari perkebunan ke pabrik, lalu gula jadi ke pelabuhan untuk diekspor ke Eropa. Menjadi mesin penggerak ekonomi kolonial Hindia Belanda 🏭🍬',
    route:'Jalur Jawa pengangkut gula',
    quizHint:'lokomotif mogul SS500 pengangkut gula kolonial'
  },
  {
    emoji:'🚂', name:'C51 — Dwipanggo Kepresidenan', country:'🇮🇩 Jawa', year:1917,
    fuel:'Batubara (Uap)', speed:75, type:'Lokomotif Uap Ekspres Pacific', builder:'Hanomag, Jerman',
    isSteam:true, rack:false, tender:true, bodyColor:'#4a1515', wheelColor:'#2a0808',
    fact:'C51 "Dwipanggo" adalah lokomotif EKSPRES elegan buatan Hanomag Jerman 1917! Cat merah marunnya berkilau. Biasa menarik kereta kepresidenan dan pejabat tinggi — tampil mewah di zamannya! 👑🚂',
    funFact:'🎩 "Dwipanggo" artinya "Dua Penguasa" — simbol kekuasaan yang diangkut kereta ini!',
    history:'C51 dibuat oleh pabrik Hanomag di Hannover, Jerman tahun 1917 🇩🇪. Hindia Belanda mengimpor lokomotif ini khusus untuk kereta ekspres kelas satu yang mengangkut Gubernur Jenderal, pejabat kolonial, dan tamu penting. Setelah kemerdekaan 1945, C51 sempat dipakai sebagai kereta kepresidenan awal RI 🇮🇩. Kini jadi koleksi berharga pengingat kemewahan perkeretaapian era kolonial 👑',
    route:'Jalur kelas satu Jawa (Jakarta–Surabaya)',
    quizHint:'kereta kepresidenan awal C51 Dwipanggo maroon'
  },
  {
    emoji:'🚂', name:'D52 — Djojobojo Pembangun', country:'🇮🇩 Indonesia', year:1954,
    fuel:'Batubara (Uap)', speed:70, type:'Lokomotif Uap Tender Terakhir', builder:'Krupp, Jerman',
    isSteam:true, rack:false, tender:true, bodyColor:'#0f1a40', wheelColor:'#070e25',
    fact:'D52 "Djojobojo" adalah lokomotif UAP TERAKHIR yang dibeli Indonesia! Dibuat Krupp Jerman tahun 1954 atas pesanan Presiden Sukarno. Cat biru tua gagahnya jadi simbol ambisi pembangunan RI merdeka! 🇮🇩💪',
    funFact:'📜 Nama "Djojobojo" diambil dari ramalan Raja Jayabaya — simbol kemakmuran yang dicita-citakan Sukarno!',
    history:'Pasca-kemerdekaan, Presiden Sukarno ingin membangun kembali ekonomi RI yang hancur akibat perang 🏗️. Beliau memesan 100 unit D52 dari pabrik Krupp Essen, Jerman tahun 1954 — terbesar di dunia saat itu. D52 menjadi kelas lokomotif UAP TERAKHIR yang dibuat untuk Indonesia sebelum era diesel dimulai. Jadi simbol optimisme era Orde Lama dalam membangun bangsa 🇮🇩🎖️',
    route:'Jalur utama Jawa era Orde Lama',
    quizHint:'lokomotif uap terakhir Indonesia D52 Sukarno Krupp'
  },
  {
    emoji:'🚃', name:'BB200 — Diesel Hidraulik Pertama', country:'🇮🇩 Indonesia', year:1957,
    fuel:'Solar (Diesel Hidraulik)', speed:80, type:'Lokomotif Diesel Hidraulik', builder:'Esslingen, Jerman',
    isDiesel:true, bodyColor:'#1a1a1a', accentColor:'#FFD600',
    fact:'BB200 adalah lokomotif DIESEL HIDRAULIK pertama Indonesia! Dibuat pabrik Esslingen Jerman tahun 1957. Cat kuning-hitamnya mencolok — jadi primadona baru era Sukarno! 🟡⚫',
    funFact:'⚙️ Beda dengan CC200 yang diesel-elektrik, BB200 pakai transmisi HIDRAULIK — mesinnya lebih ringkas!',
    history:'Di tahun 1957, Presiden Sukarno melanjutkan modernisasi KAI dengan membeli BB200 dari pabrik Esslingen, Jerman 🇩🇪. Ini adalah lokomotif diesel hidraulik pertama di Indonesia — pelengkap CC200 yang diesel-elektrik. Keduanya menandai berakhirnya dominasi lokomotif uap di jalur utama. BB200 bertugas di jalur sekunder dan menarik kereta penumpang jarak menengah 🚂➡️🚃',
    route:'Jalur sekunder Jawa (Cirebon, Madiun)',
    quizHint:'diesel hidraulik pertama Indonesia BB200 kuning'
  },
  {
    emoji:'🚃', name:'BB301 — Si Bulu Sikat', country:'🇮🇩 Indonesia', year:1964,
    fuel:'Solar (Diesel Hidraulik)', speed:100, type:'Lokomotif Diesel Hidraulik', builder:'Krauss-Maffei, Jerman',
    isDiesel:true, bodyColor:'#E65100', accentColor:'#FFFFFF',
    fact:'BB301 dijuluki "Si Bulu Sikat" karena bentuk hidung kotaknya mirip sikat! 🪥 Buatan Krauss-Maffei Jerman tahun 1964, di era Ganefo. Cat oranye terangnya jadi ciri khas di jalur Sumatera dan Jawa! 🟠',
    funFact:'🏆 Dipesan Sukarno untuk menyambut Ganefo 1963 — olimpiade tandingan yang digelar Indonesia!',
    history:'BB301 dipesan dari pabrik Krauss-Maffei Munich, Jerman 🇩🇪 pada era Ganefo (Games of the New Emerging Forces) 1963–1964. Sukarno ingin menunjukkan kemajuan Indonesia ke negara-negara Non-Blok. Masinis menjuluki BB301 "Si Bulu Sikat" karena bentuk bagian depannya kotak seperti kepala sikat. Unit ini melayani jalur Jawa dan Sumatera selama puluhan tahun 🚃🇮🇩',
    route:'Jalur Sumatera & Jawa Selatan',
    quizHint:'kereta bulu sikat BB301 oranye Ganefo'
  },
  {
    emoji:'🚃', name:'D301 — Pak Pos Pembawa Surat', country:'🇮🇩 Jawa', year:1962,
    fuel:'Solar (Diesel Hidraulik)', speed:100, type:'Lokomotif Diesel Ringan', builder:'Krupp, Jerman',
    isDiesel:true, bodyColor:'#B71C1C', accentColor:'#1a1a1a',
    fact:'D301 dijuluki "Pak Pos" karena sering mengangkut surat dan paket ke pelosok Jawa! ✉️📦 Dibuat Krupp Jerman 1962, warna merah-hitamnya jadi pemandangan akrab di stasiun desa!',
    funFact:'📮 1 gerbong pos bisa bawa 10.000+ surat dan paket sekaligus — jadi kurir cepat era 1960-an!',
    history:'D301 diimpor dari pabrik Krupp, Jerman 🇩🇪 tahun 1962. Di era itu, kereta adalah tulang punggung pengiriman pos Indonesia — Kantor Pos bekerjasama erat dengan KAI. D301 menarik gerbong bagasi khusus berisi surat, paket, dan dokumen ke kota-kota kecil yang belum terjangkau mobil pos. Unit ini jadi penghubung penting sebelum era modernisasi pos dan kargo darat 🚃📬',
    route:'Jalur Jawa (kereta pos & paket)',
    quizHint:'kereta pos D301 merah pengangkut surat'
  },
  {
    emoji:'🚃', name:'CC202 — Rajawali Pengangkut Berat', country:'🇮🇩 Sumatera & Jawa', year:1986,
    fuel:'Solar (Diesel Elektrik)', speed:120, type:'Lokomotif Diesel Berat', builder:'General Electric, USA',
    isDiesel:true, bodyColor:'#1565C0', accentColor:'#FFFFFF',
    fact:'CC202 dijuluki "Rajawali" karena kekuatannya yang luar biasa! 🦅 Dibuat GE Amerika 1986, khusus menarik kereta barang BERAT di Sumatera dan Jawa. Satu CC202 bisa tarik 40+ gerbong batubara sekaligus! 💪',
    funFact:'⛏️ CC202 adalah penarik utama kereta batubara Babaranjang Sumatera — 60 gerbong sepanjang 1 km!',
    history:'CC202 diimpor dari General Electric Amerika 🇺🇸 mulai tahun 1986 untuk memperkuat armada kereta barang Indonesia. Keunggulannya: traksi sangat besar, cocok untuk jalur pegunungan dan muatan super berat. CC202 menjadi andalan PT KAI mengangkut batubara Bukit Asam di Sumatera Selatan dan kargo industri di Jawa. Jasanya menopang ekonomi energi dan logistik nasional 🚆⛏️',
    route:'Tanjung Enim ↔ Tarahan (batubara Sumatera)',
    quizHint:'kereta barang berat CC202 Rajawali GE biru'
  },
  {
    emoji:'🚃', name:'Argo Bromo 1997 — Eksekutif Perdana', country:'🇮🇩 Jakarta–Surabaya', year:1997,
    fuel:'Solar (Diesel)', speed:120, type:'Kereta Eksekutif Perintis', builder:'INKA Madiun',
    isDiesel:true, bodyColor:'#0D47A1', accentColor:'#FF6F00',
    fact:'Argo Bromo 1997 adalah kereta EKSEKUTIF perdana yang memulai era "Argo" di Indonesia! 🏆 Nama diambil dari Gunung Bromo. Gerbongnya buatan INKA Madiun — produk kebanggaan Indonesia! 🌋',
    funFact:'✨ Gerbong kelas eksekutif ini punya AC, kursi reclining, dan TV — mewah di zamannya!',
    history:'Argo Bromo diluncurkan 31 Juli 1997 di era Presiden Soeharto sebagai kereta eksekutif pertama kelas "Argo" 🇮🇩. Nama "Argo" jadi simbol prestise — setiap kereta Argo dinamai gunung di Indonesia (Bromo, Lawu, Muria, dll). Gerbongnya dirancang dan dibuat INKA Madiun, menandai kemandirian industri kereta nasional. Argo Bromo menjadi pionir rute premium Jakarta–Surabaya sebelum digantikan Argo Bromo Anggrek 🚄',
    route:'Jakarta Gambir ↔ Surabaya Pasar Turi',
    quizHint:'kereta argo pertama Indonesia Argo Bromo 1997'
  },
  {
    emoji:'🚃', name:'Taksaka — Nagatatha Yogyakarta', country:'🇮🇩 Jakarta–Yogyakarta', year:1999,
    fuel:'Solar (Diesel)', speed:110, type:'Kereta Eksekutif Malam', builder:'INKA Madiun',
    isDiesel:true, bodyColor:'#1B5E20', accentColor:'#FDD835',
    fact:'Taksaka adalah kereta eksekutif favorit rute Jakarta–Yogyakarta! 🏯 Nama "Taksaka" diambil dari senjata Arjuna dalam kisah Mahabharata — senjata ampuh sang pahlawan! Warna hijau-kuningnya khas! 🟢🟡',
    funFact:'🏹 Dalam Mahabharata, Nagatatha/Taksaka adalah panah sakti Arjuna yang tidak pernah meleset!',
    history:'Taksaka diluncurkan PT KAI tahun 1999 untuk melayani penumpang eksekutif rute Jakarta Gambir ↔ Yogyakarta Tugu 🏯. Gerbongnya diproduksi INKA di Madiun dengan desain elegan dan nyaman untuk perjalanan malam. Nama "Taksaka" dipilih dari khazanah wayang Jawa — merujuk senjata panah Arjuna — mencerminkan identitas budaya kota tujuan Yogyakarta sebagai pusat budaya Jawa 🇮🇩🎭',
    route:'Jakarta Gambir ↔ Yogyakarta Tugu',
    quizHint:'kereta eksekutif Taksaka Jakarta Yogyakarta'
  },
  {
    emoji:'🚇', name:'KRL JR 205 — Hibah Jepang', country:'🇮🇩 Jabodetabek', year:2013,
    fuel:'Listrik (1500 VDC)', speed:100, type:'Kereta Rel Listrik Retrofit', builder:'JR East Jepang (retrofit Indonesia)',
    isElectric:true, bodyColor:'#FFC107', accentColor:'#D32F2F',
    fact:'KRL JR 205 adalah kereta BEKAS dari Jepang yang jadi tulang punggung KRL Jabodetabek! ⚡ Awalnya beroperasi di jalur Yamanote Tokyo, kini setelah direkondisi jadi andalan pulang-pergi kerja warga Jakarta! 🇯🇵➡️🇮🇩',
    funFact:'🗾 Dulu keretanya bertuliskan huruf Kanji Jepang — setelah direkondisi diganti huruf Latin Indonesia!',
    history:'Sejak 2013, PT KAI Commuter mengimpor seri JR 205 bekas dari JR East Jepang 🇯🇵. Kereta ini sudah dipensiunkan di Tokyo, lalu direkondisi di Balai Yasa Manggarai — cat ulang, AC baru, sistem pintu diperbaiki. Hasilnya: armada KRL bertambah banyak dengan biaya jauh lebih murah dari beli baru. JR 205 jadi tulang punggung KRL Jabodetabek yang mengangkut 1 juta+ penumpang per hari 🚆⚡',
    route:'Bogor/Bekasi/Tangerang ↔ Jakarta',
    quizHint:'kereta bekas Jepang JR205 KRL Jabodetabek'
  },
  {
    emoji:'🚋', name:'LRT Palembang — Asian Games 2018', country:'🇮🇩 Palembang, Sumatera Selatan', year:2018,
    fuel:'Listrik', speed:85, type:'Light Rail Transit', builder:'INKA + LEN Indonesia',
    isElectric:true, bodyColor:'#2E7D32', accentColor:'#FBC02D',
    fact:'LRT Palembang adalah kereta LRT pertama di Sumatera! 🏆 Dibangun khusus untuk Asian Games 2018. Seluruh keretanya buatan anak bangsa — INKA Madiun dan LEN Bandung! 🇮🇩🏭',
    funFact:'🏅 Di Asian Games 2018, LRT ini mengangkut ribuan atlet dan penonton ke Stadion Jakabaring!',
    history:'LRT Palembang dibangun khusus menyambut Asian Games 2018 yang diselenggarakan di Jakarta dan Palembang 🏅. Proyek ini membanggakan karena dikerjakan sepenuhnya oleh BUMN Indonesia: gerbong dari PT INKA Madiun, sistem sinyal dari PT LEN Bandung, dan konstruksi oleh PT Waskita Karya. Diresmikan Presiden Jokowi Juli 2018, LRT ini jadi LRT pertama di Sumatera dan simbol kemandirian teknologi transportasi Indonesia 🇮🇩🚆',
    route:'Bandara SMB II ↔ DJKA Jakabaring (23 km)',
    quizHint:'LRT pertama Sumatera Palembang Asian Games'
  }
]

// Child-friendly question bank for ages 5–8 (60+ questions)
const G18_QUESTIONS_BANK = [
  // Bagian kereta
  { q:'Apa nama orang yang mengemudikan kereta?', emoji:'🧑‍✈️', answers:['Masinis','Pilot','Kapten','Sopir bus'], correct:0 },
  { q:'Di mana kereta berjalan?', emoji:'🛤️', answers:['Di atas rel','Di atas jalan raya','Di atas air','Di udara'], correct:0 },
  { q:'Apa gunanya roda kereta?', emoji:'🎡', answers:['Supaya bisa jalan di rel','Supaya bisa terbang','Supaya bisa berenang','Supaya bisa berputar di udara'], correct:0 },
  { q:'Bagian kereta yang menghubungkan satu gerbong ke gerbong lain disebut apa?', emoji:'🔗', answers:['Sambungan/Kopling','Roda','Cerobong','Boiler'], correct:0 },
  { q:'Apa nama tempat kereta berhenti untuk menaikkan penumpang?', emoji:'🏛️', answers:['Stasiun','Terminal bus','Bandara','Pelabuhan'], correct:0 },
  { q:'Cerobong pada kereta uap berguna untuk apa?', emoji:'🏭', answers:['Tempat keluarnya asap','Tempat masuk penumpang','Menyimpan air','Sebagai roda cadangan'], correct:0 },
  { q:'Apa yang membuat kereta uap bisa bergerak?', emoji:'♨️', answers:['Uap panas dari air yang dipanaskan','Bensin seperti mobil','Tenaga angin','Baterai besar'], correct:0 },
  { q:'Boiler pada kereta uap berfungsi untuk apa?', emoji:'🫙', answers:['Memanaskan air menjadi uap','Menyimpan penumpang','Memberi cahaya di malam hari','Mengatur kecepatan'], correct:0 },
  { q:'Kereta yang ditenagai oleh listrik disebut kereta apa?', emoji:'⚡', answers:['Kereta listrik','Kereta uap','Kereta balon','Kereta angin'], correct:0 },
  { q:'Suara khas kereta yang sering kita dengar adalah?', emoji:'📢', answers:['Tuuut tuuut!','Wooosh!','Bzzz!','Splash!'], correct:0 },
  // Fakta sederhana
  { q:'Kereta api bergerak di atas apa?', emoji:'🛤️', answers:['Rel baja','Jalan aspal','Pasir','Rumput'], correct:0 },
  { q:'Berapa jalur rel yang biasanya digunakan kereta?', emoji:'🔢', answers:['Dua jalur (kiri dan kanan)','Satu jalur saja','Empat jalur','Tidak ada jalur'], correct:0 },
  { q:'Apa warna lampu merah di pintu perlintasan kereta artinya?', emoji:'🚦', answers:['Berhenti, kereta akan lewat!','Boleh jalan terus','Kereta sudah pergi','Masuk ke dalam kereta'], correct:0 },
  { q:'Gerbong kereta yang khusus untuk mengangkut barang disebut?', emoji:'📦', answers:['Gerbong barang/kargo','Gerbong penumpang','Gerbong makan','Gerbong tidur'], correct:0 },
  { q:'Kereta yang bisa naik ke gunung pakai rel bergerigi disebut?', emoji:'⛰️', answers:['Kereta gigi/bergigi','Kereta super cepat','Kereta selam','Kereta terbang'], correct:0 },
  { q:'Apa yang harus kita lakukan saat kereta akan melintas di perlintasan?', emoji:'⚠️', answers:['Berhenti dan menunggu','Lari menyeberang cepat','Diam di tengah rel','Melambai ke masinis'], correct:0 },
  { q:'Di Museum Kereta Ambarawa ada banyak kereta tua. Museum ini ada di mana?', emoji:'🗺️', answers:['Jawa Tengah, Indonesia','Bali','Jakarta','Surabaya'], correct:0 },
  { q:'Kereta tercepat di dunia menggunakan teknologi apa?', emoji:'🧲', answers:['Magnet (Maglev)','Roda bergerigi','Baling-baling','Roket'], correct:0 },
  { q:'Rel kereta biasanya terbuat dari apa?', emoji:'⚙️', answers:['Baja/besi','Kayu','Plastik','Karet'], correct:0 },
  { q:'Apa nama tempat tidur di dalam kereta malam?', emoji:'🛏️', answers:['Sleeper / gerbong tidur','Kursi biasa','Bangku taman','Kasur melayang'], correct:0 },
  // Kereta uap
  { q:'Bahan bakar utama kereta uap zaman dulu adalah?', emoji:'🪨', answers:['Batu bara','Bensin','Angin','Listrik'], correct:0 },
  { q:'Asap yang keluar dari cerobong kereta uap berasal dari?', emoji:'💨', answers:['Pembakaran batu bara','Mesin pendingin','Kipas angin','Uap air dingin'], correct:0 },
  { q:'Mengapa roda kereta uap terbuat dari besi?', emoji:'⚙️', answers:['Supaya kuat dan tidak mudah rusak','Supaya ringan','Supaya bisa mengapung','Supaya bisa terbang'], correct:0 },
  { q:'Selain batu bara, kereta uap juga bisa pakai bahan bakar apa?', emoji:'🪵', answers:['Kayu bakar','Gula','Air laut','Daun kering'], correct:0 },
  { q:'Kereta uap mulai banyak digunakan sekitar abad ke berapa?', emoji:'📅', answers:['Abad ke-19 (1800-an)','Abad ke-21 (2000-an)','Abad ke-15 (1400-an)','Abad ke-10 (900-an)'], correct:0 },
  // Kereta diesel & listrik
  { q:'Kereta diesel menggunakan bahan bakar apa?', emoji:'🛢️', answers:['Solar/diesel','Batu bara','Angin','Baterai saja'], correct:0 },
  { q:'Kereta listrik mendapat aliran listrik dari mana?', emoji:'⚡', answers:['Kawat listrik di atas rel atau dari rel ketiga','Baterai di dalam gerbong saja','Panel surya di atap saja','Generator bensin'], correct:0 },
  { q:'Kereta mana yang tidak mengeluarkan asap hitam sama sekali?', emoji:'🌿', answers:['Kereta listrik','Kereta uap','Kereta diesel','Kereta batu bara'], correct:0 },
  // Museum & Ambarawa
  { q:'Museum Kereta Api Ambarawa dulunya adalah sebuah?', emoji:'🏚️', answers:['Stasiun kereta','Pabrik baja','Sekolah masinis','Rumah sakit'], correct:0 },
  { q:'Kereta wisata Ambarawa berjalan melewati daerah yang terkenal karena apa?', emoji:'🌄', answers:['Pemandangan alam yang indah dan pegunungan','Pantai yang panjang','Padang pasir','Hutan es'], correct:0 },
  // Keselamatan
  { q:'Saat naik kereta, kita harus berdiri di belakang garis kuning karena?', emoji:'🟡', answers:['Supaya aman dari kereta yang lewat','Supaya bisa naik lebih cepat','Garis itu untuk hiasan','Agar bisa melihat kereta dari dekat'], correct:0 },
  { q:'Bolehkah kita bermain di atas rel kereta?', emoji:'❌', answers:['Tidak boleh, sangat berbahaya!','Boleh kalau tidak ada kereta','Boleh di malam hari','Boleh kalau bersama orang dewasa'], correct:0 },
  { q:'Apa yang harus kita pegang saat naik tangga kereta?', emoji:'🤝', answers:['Pegangan tangan/handrail','Tas kita','Teman kita saja','Tidak perlu pegang apapun'], correct:0 },
  { q:'Kapan kita boleh masuk ke dalam kereta?', emoji:'🚪', answers:['Setelah pintu terbuka dan penumpang keluar dulu','Langsung saja masuk','Sebelum kereta berhenti','Saat kereta masih berjalan'], correct:0 },
  // Kereta di dunia
  { q:'Kereta Shinkansen yang terkenal berasal dari negara mana?', emoji:'🇯🇵', answers:['Jepang','China','Prancis','Amerika'], correct:0 },
  { q:'Kereta TGV yang super cepat berasal dari negara mana?', emoji:'🇫🇷', answers:['Prancis','Jepang','Jerman','Indonesia'], correct:0 },
  { q:'Apa arti "Shinkansen" dalam bahasa Jepang?', emoji:'🚂', answers:['Jalur baru / kereta peluru','Kereta tua','Kereta angin','Kereta uap'], correct:0 },
  { q:'Kereta Maglev bergerak dengan cara apa yang unik?', emoji:'🧲', answers:['Melayang di atas rel menggunakan magnet','Berjalan di atas air','Menggunakan roda biasa yang sangat cepat','Ditarik oleh pesawat'], correct:0 },
  { q:'Kereta bawah tanah di kota besar biasa disebut apa?', emoji:'🚇', answers:['Subway atau MRT','Bus kota','Trem','Monorel'], correct:0 },
  // Menyenangkan & ringan
  { q:'Berapa banyak rel yang dibutuhkan agar kereta bisa berjalan lurus?', emoji:'🛤️', answers:['Dua (kiri dan kanan)','Satu','Empat','Tiga'], correct:0 },
  { q:'Kereta yang bergelantung di bawah rel atas disebut apa?', emoji:'🚡', answers:['Monorel gantung','Kereta selam','Kereta uap','Kereta angin'], correct:0 },
  { q:'Warna tradisional lokomotif uap Ambarawa kebanyakan adalah?', emoji:'🎨', answers:['Hitam','Merah cerah','Kuning terang','Biru muda'], correct:0 },
  { q:'Kereta barang bisa mengangkut benda-benda berat seperti?', emoji:'⛏️', answers:['Batu bara, kayu, kontainer','Makanan segar saja','Penumpang saja','Buku sekolah saja'], correct:0 },
  { q:'Apa yang terdengar saat roda kereta melintasi sambungan rel?', emoji:'👂', answers:['Klak-klak klak-klak!','Vroom vroom!','Bip bip!','Ciut ciut!'], correct:0 },
  { q:'Kenapa jendela kereta terbuat dari kaca tebal?', emoji:'🪟', answers:['Supaya kuat dan aman untuk penumpang','Supaya terlihat bagus saja','Supaya kereta lebih ringan','Karena kaca murah'], correct:0 },
  { q:'Apa yang dimaksud dengan "kereta ekspres"?', emoji:'⚡', answers:['Kereta yang hanya berhenti di stasiun besar saja','Kereta yang membawa paket ekspedisi','Kereta yang selalu terlambat','Kereta yang berjalan sangat pelan'], correct:0 },
  { q:'Siapa yang bertanggung jawab menjaga keamanan penumpang di dalam kereta?', emoji:'👮', answers:['Petugas/kondektur kereta','Penumpang sendiri','Anak-anak','Tidak ada yang bertanggung jawab'], correct:0 },
  { q:'Apa fungsi klakson/sirine pada kereta?', emoji:'📯', answers:['Memberi peringatan kepada orang di depan kereta','Sebagai lagu pengiring','Untuk mengisi bahan bakar','Untuk membuka pintu'], correct:0 },
  { q:'Kereta yang berjalan di atas satu rel disebut?', emoji:'🚝', answers:['Monorel','Kereta ganda','Kereta uap','Tramway'], correct:0 },
  { q:'Apa yang biasanya dijual di gerbong restoran kereta?', emoji:'🍱', answers:['Makanan dan minuman','Baju dan sepatu','Mainan','Buku pelajaran'], correct:0 },
  { q:'Berapa lama kereta uap zaman dulu biasanya mengisi ulang batu baranya?', emoji:'⏱️', answers:['Di setiap stasiun besar','Setiap 5 menit','Hanya sekali seumur hidup','Tidak perlu diisi ulang'], correct:0 },
  // Extra simple
  { q:'Kereta api adalah kendaraan yang berjalan di atas...?', emoji:'🚂', answers:['Rel','Jalan raya','Lautan','Langit'], correct:0 },
  { q:'Gerbong pertama yang ada mesinnya disebut?', emoji:'🚂', answers:['Lokomotif','Gerbong makan','Gerbong tidur','Gerbong barang'], correct:0 },
  { q:'Apa warna api yang membakar batu bara di dalam kereta uap?', emoji:'🔥', answers:['Merah-oranye','Hijau','Biru dingin','Ungu'], correct:0 },
  { q:'Jika kereta mau belok arah, apa yang diubah?', emoji:'🔀', answers:['Posisi rel (wesel)','Warna kereta','Jumlah penumpang','Nama stasiun'], correct:0 },
  { q:'Kenapa kereta lebih ramah lingkungan daripada pesawat?', emoji:'🌿', answers:['Mengangkut banyak orang dengan bahan bakar lebih sedikit','Bisa terbang tanpa emisi','Kereta tidak menggunakan bahan bakar','Kereta berjalan lebih lambat'], correct:0 },
  { q:'Apa nama baju resmi masinis kereta api?', emoji:'👔', answers:['Seragam masinis','Jas pesta','Baju renang','Baju olahraga'], correct:0 },
  { q:'Museum Ambarawa menyimpan kereta-kereta bersejarah agar?', emoji:'🏛️', answers:['Kita bisa belajar sejarah dan menghargai kereta lama','Kereta bisa berlomba','Kereta bisa dijual kembali','Kereta bisa dipakai masak'], correct:0 },

  // === BAGIAN KERETA INDONESIA ===
  { q:'Apa nama kereta komuter paling terkenal di Jakarta?', emoji:'🚆', answers:['KRL Commuter Line','Kereta Naga','Bus Kota Express','MRT Tanah Abang'], correct:0 },
  { q:'KRL singkatan dari apa?', emoji:'⚡', answers:['Kereta Rel Listrik','Kereta Rel Lama','Kereta Roda Listrik','Kereta Rel Laut'], correct:0 },
  { q:'MRT di Jakarta berjalan di atas dan di bawah apa?', emoji:'🚇', answers:['Di atas jalan (layang) dan di bawah tanah','Hanya di bawah tanah','Hanya di atas air','Di atas pegunungan'], correct:0 },
  { q:'Lokomotif CC 201 adalah kereta jenis apa?', emoji:'🚂', answers:['Lokomotif diesel','Kereta uap','Kereta listrik','Kereta magnet'], correct:0 },
  { q:'Kereta mana yang melayani rute Jakarta–Surabaya paling cepat?', emoji:'🏎️', answers:['Kereta Argo Bromo Anggrek','Kereta Barang','KRL Commuter','Kereta Gigi'], correct:0 },
  { q:'PT KAI singkatan dari apa?', emoji:'🇮🇩', answers:['Kereta Api Indonesia','Kereta Angkut Indonesia','Kendaraan Antar Indonesia','Kapal Angkut Indonesia'], correct:0 },
  { q:'LRT adalah singkatan dari?', emoji:'🚈', answers:['Light Rail Transit','Large Rail Train','Long Route Track','Light Road Train'], correct:0 },
  { q:'Stasiun kereta terbesar dan terkenal di Jakarta adalah?', emoji:'🏛️', answers:['Stasiun Gambir','Stasiun Ambarawa','Stasiun Bogor','Stasiun Bandung'], correct:0 },
  { q:'Kereta Argo dalam bahasa Indonesia berarti apa?', emoji:'⛰️', answers:['Gunung','Laut','Sungai','Angin'], correct:0 },
  { q:'Berapakah kelas pelayanan utama kereta penumpang di Indonesia?', emoji:'🎫', answers:['Tiga kelas: Eksekutif, Bisnis, Ekonomi','Satu kelas saja','Dua kelas saja','Lima kelas'], correct:0 },
  { q:'Jalur kereta api pertama di Indonesia dibangun oleh siapa?', emoji:'📜', answers:['Pemerintah Belanda','Pemerintah Jepang','Pemerintah Indonesia','Pemerintah Inggris'], correct:0 },
  { q:'Kota mana yang terkenal dengan wisata kereta uap Ambarawa?', emoji:'🗺️', answers:['Ambarawa, Jawa Tengah','Yogyakarta','Surabaya','Medan'], correct:0 },
  { q:'Kereta wisata Ambarawa terkenal karena bisa mendaki bukit dengan apa?', emoji:'⚙️', answers:['Rel bergerigi di tengah rel','Roda yang sangat besar','Mesin jet','Baling-baling di bawah'], correct:0 },
  { q:'Di kota mana ada kereta gantung/cable car terkenal di Indonesia?', emoji:'🚡', answers:['Puncak, Jawa Barat','Bali','Lombok','Medan'], correct:0 },
  { q:'Lokomotif D 301 adalah kereta uap yang berjalan di atas rel dengan lebar berapa?', emoji:'📏', answers:['1067 mm (rel sempit)','1435 mm (rel standar)','500 mm (rel mini)','2000 mm (rel lebar)'], correct:0 },

  // === BAGIAN SAINS KERETA ===
  { q:'Mengapa roda kereta dan rel terbuat dari besi/baja?', emoji:'🔩', answers:['Karena besi sangat keras dan tahan lama','Karena besi murah sekali','Karena besi bisa mengapung','Karena besi ringan'], correct:0 },
  { q:'Bagaimana kereta bisa berhenti jika tidak ada rem?', emoji:'🛑', answers:['Tidak bisa, makanya kereta pasti punya rem!','Dengan menabrak tembok','Dengan melompat dari rel','Dengan terbang ke atas'], correct:0 },
  { q:'Kenapa rel kereta ada jarak kecil di setiap sambungannya?', emoji:'🌡️', answers:['Supaya rel bisa memuai saat panas tanpa melengkung','Supaya terlihat indah','Supaya lebih murah','Supaya kereta bisa melompat'], correct:0 },
  { q:'Apa yang dimaksud dengan "trek lurus" pada rel kereta?', emoji:'📐', answers:['Jalur rel yang tidak memiliki tikungan','Rel yang sangat pendek','Rel untuk kereta tua','Rel yang bergelombang'], correct:0 },
  { q:'Kereta Maglev bisa sangat cepat karena tidak ada apa?', emoji:'🧲', answers:['Tidak ada gesekan antara roda dan rel','Tidak ada penumpang','Tidak ada bahan bakar','Tidak ada masinis'], correct:0 },
  { q:'Apa yang terjadi jika rel kereta terlalu panas?', emoji:'🌞', answers:['Rel bisa melengkung dan berbahaya','Kereta menjadi lebih cepat','Rel berubah warna menjadi merah','Kereta bisa terbang'], correct:0 },
  { q:'Mengapa kereta lebih hemat bahan bakar daripada mobil?', emoji:'🌿', answers:['Karena satu kereta bisa angkut ratusan orang sekaligus','Karena kereta lebih kecil','Karena kereta tidak butuh energi','Karena kereta berjalan lebih pelan'], correct:0 },
  { q:'Sistem pengereman kereta modern menggunakan apa?', emoji:'💨', answers:['Rem udara (pneumatik)','Rem tangan biasa','Air panas','Magnet saja'], correct:0 },
  { q:'Apa yang dimaksud dengan "wesel" pada rel kereta?', emoji:'🔀', answers:['Alat untuk memindahkan kereta ke jalur lain','Nama masinis','Jenis bahan bakar','Bagian dari gerbong'], correct:0 },
  { q:'Kereta dapat mengangkut banyak barang berat karena apa?', emoji:'💪', answers:['Karena gesekan roda besi di rel besi sangat kecil','Karena kereta punya sayap','Karena kereta terbuat dari plastik ringan','Karena kereta punya 100 roda'], correct:0 },
  { q:'Panton atau "pantograph" pada kereta listrik berfungsi apa?', emoji:'⚡', answers:['Mengambil listrik dari kawat di atas kepala','Sebagai antena TV','Untuk memberi sinyal ke penumpang','Sebagai rem darurat'], correct:0 },
  { q:'Apa itu "sinyal semaphore" yang digunakan di zaman kereta dulu?', emoji:'🚦', answers:['Alat sinyal berlengan yang memberi tanda aman atau bahaya','Nama stasiun di Jawa','Jenis kereta uap','Bahan bakar kereta'], correct:0 },
  { q:'Mengapa kereta cepat (HSR) memiliki hidung yang sangat runcing?', emoji:'🔺', answers:['Supaya bisa membelah angin dengan lebih mudah','Supaya terlihat keren','Supaya bisa dipakai sebagai senjata','Supaya bisa mengangkut lebih banyak penumpang'], correct:0 },
  { q:'Apa yang terjadi saat dua kereta bertemu di jalur yang sama dan berlawanan arah?', emoji:'😱', answers:['Sangat berbahaya! Itu sebabnya ada sistem sinyal khusus','Kereta saling melompati','Salah satu kereta terbang','Tidak mungkin terjadi'], correct:0 },
  { q:'Apa nama alat yang mengukur kecepatan kereta?', emoji:'🖥️', answers:['Speedometer/tachometer','Termometer','Barometer','Kompas'], correct:0 },

  // === BAGIAN KERETA DUNIA ===
  { q:'Negara mana yang memiliki jaringan kereta cepat (HSR) terpanjang di dunia?', emoji:'🌏', answers:['China','Jepang','Prancis','Jerman'], correct:0 },
  { q:'Kereta ICE yang terkenal berasal dari negara mana?', emoji:'🇩🇪', answers:['Jerman','Italia','Spanyol','Belgia'], correct:0 },
  { q:'Kereta KTX berasal dari negara mana?', emoji:'🇰🇷', answers:['Korea Selatan','Korea Utara','Jepang','Taiwan'], correct:0 },
  { q:'Apa nama kereta cepat terbaru China yang bisa melampaui 350 km/jam?', emoji:'🚂', answers:['CR400 Fuxing','Shinkansen N700','TGV Duplex','ICE 4'], correct:0 },
  { q:'Trans-Siberia Railway adalah rute kereta terpanjang di dunia. Ada di negara mana?', emoji:'🇷🇺', answers:['Rusia','Amerika','Australia','India'], correct:0 },
  { q:'Kereta Orient Express yang terkenal di buku cerita melayani rute di mana?', emoji:'🌍', answers:['Eropa (dari Paris ke Istanbul)','Asia (dari Tokyo ke Beijing)','Afrika (dari Kairo ke Capetown)','Amerika (dari New York ke Los Angeles)'], correct:0 },
  { q:'Berapa kira-kira kecepatan maksimum Shinkansen saat ini?', emoji:'🚂', answers:['Sekitar 320 km/jam','Sekitar 100 km/jam','Sekitar 500 km/jam','Sekitar 50 km/jam'], correct:0 },
  { q:'Apa nama stasiun kereta paling sibuk di dunia yang ada di Jepang?', emoji:'🏙️', answers:['Stasiun Shinjuku, Tokyo','Stasiun Grand Central, New York','Stasiun Waterloo, London','Stasiun Gare du Nord, Paris'], correct:0 },
  { q:'Eurostar adalah kereta yang melintas di bawah laut antara negara mana?', emoji:'🌊', answers:['Inggris dan Prancis','Amerika dan Kanada','Jepang dan Korea','Swedia dan Denmark'], correct:0 },
  { q:'Kereta yang terkenal melewati pegunungan Alpen ada di negara mana?', emoji:'🏔️', answers:['Swiss','Brasil','Australia','Meksiko'], correct:0 },
  { q:'Negara manakah yang pertama kali membuat kereta uap di dunia?', emoji:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', answers:['Inggris','Amerika','Prancis','Jerman'], correct:0 },
  { q:'Siapa penemu lokomotif uap pertama yang terkenal?', emoji:'👨‍🔬', answers:['George Stephenson','Albert Einstein','Thomas Edison','James Watt'], correct:0 },
  { q:'Tahun berapa kereta uap pertama kali berjalan di lintasan penumpang?', emoji:'📅', answers:['Tahun 1825','Tahun 1900','Tahun 1750','Tahun 1950'], correct:0 },
  { q:'Kereta Swiss yang terkenal melewati pegunungan tinggi disebut?', emoji:'⛰️', answers:['Glacier Express','Polar Express','Desert Express','Ocean Express'], correct:0 },
  { q:'Kereta mana yang pernah jadi yang tercepat di dunia dengan 574 km/jam?', emoji:'🏆', answers:['TGV (Prancis)','Shinkansen (Jepang)','Maglev SCMaglev (Jepang)','ICE (Jerman)'], correct:0 },

  // === BAGIAN KESELAMATAN LEBIH BANYAK ===
  { q:'Apa yang harus kamu lakukan jika ketinggalan kereta?', emoji:'😅', answers:['Tunggu kereta berikutnya dengan aman','Kejar kereta sambil berlari di rel','Coba naik ke kereta yang sudah jalan','Melompat ke atas kereta'], correct:0 },
  { q:'Saat di dalam kereta yang penuh sesak, kamu harus?', emoji:'🚶', answers:['Tetap tenang dan berpegangan','Berteriak keras','Mendorong penumpang lain','Lari ke gerbong lain tanpa berpegangan'], correct:0 },
  { q:'Apa yang TIDAK boleh kamu lempar ke luar jendela kereta?', emoji:'🚮', answers:['Semua benda apapun, termasuk sampah!','Hanya kertas','Hanya makanan','Hanya batu'], correct:0 },
  { q:'Saat kereta darurat harus berhenti mendadak, apa yang sebaiknya kamu lakukan?', emoji:'🆘', answers:['Pegang pegangan erat-erat dan duduk','Berdiri dan berlari','Buka pintu dan keluar','Berteriak sekeras mungkin'], correct:0 },
  { q:'Mengapa perlintasan kereta api memiliki palang (portal) yang turun?', emoji:'⛔', answers:['Untuk mencegah kendaraan melintas saat kereta lewat','Karena sedang diperbaiki','Untuk menghitung kendaraan yang lewat','Karena rel sedang basah'], correct:0 },
  { q:'Berapa jauh jarak aman yang harus kamu jaga dari tepi peron kereta?', emoji:'🟡', answers:['Di belakang garis kuning yang ada di peron','Tepat di tepi peron','Satu langkah dari rel','Tidak perlu jaga jarak'], correct:0 },

  // === BAGIAN FAKTA MENARIK ===
  { q:'Kereta barang terpanjang di dunia bisa mencapai panjang berapa kilometer?', emoji:'😲', answers:['Lebih dari 7 km panjangnya!','Hanya 100 meter','Tepat 1 km','Sekitar 500 meter'], correct:0 },
  { q:'Apa nama suara khas yang dihasilkan roda kereta saat melewati sambungan rel?', emoji:'🎵', answers:['Klakson-klakson (clackety-clack)','Zing-zing','Boom-boom','Bip-bip'], correct:0 },
  { q:'Kereta wisata mini yang sering ada di kebun binatang atau taman disebut?', emoji:'🎠', answers:['Kereta mini/kereta kecil','Kereta uap bersar','MRT','Monorel'], correct:0 },
  { q:'Kereta di Disneyland yang mengelilingi taman menggunakan tenaga apa?', emoji:'🎡', answers:['Kereta uap (steam train)','Kereta listrik','Kereta diesel','Kereta angin'], correct:0 },
  { q:'Apa nama kereta legendaris yang ada di film "Polar Express"?', emoji:'🎄', answers:['Kereta Natal ajaib yang pergi ke Kutub Utara','Shinkansen Kutub Utara','KRL Natal','TGV Salju'], correct:0 },
  { q:'Kereta yang membawa susu dan hasil ladang dari desa ke kota biasa disebut?', emoji:'🐄', answers:['Kereta barang / freight train','Kereta penumpang kelas bisnis','Shinkansen perdesaan','MRT pertanian'], correct:0 },
  { q:'Mengapa kereta wisata uap di Ambarawa sangat populer untuk wisata keluarga?', emoji:'❤️', answers:['Karena jarang bisa melihat kereta uap asli yang masih berjalan','Karena sangat cepat','Karena gratis untuk semua orang','Karena ada di semua kota'], correct:0 },
  { q:'Di Eropa, kereta antar kota biasanya disebut apa?', emoji:'🇪🇺', answers:['InterCity atau Intercity Express','LocalCity','SlowCity','NightBus'], correct:0 },
  { q:'Gerbong tidur (sleeper car) di kereta malam biasanya memiliki apa di dalamnya?', emoji:'🌙', answers:['Tempat tidur bersusun dan bantal','Hanya kursi biasa','Kolam renang kecil','Dapur dan kompor'], correct:0 },
  { q:'Kenapa kereta api disebut "kereta api" padahal tidak selalu pakai api?', emoji:'🔥', answers:['Karena dulu kereta pertama menggunakan uap dari api untuk bergerak','Karena kereta terbuat dari besi yang panas','Karena kereta berjalan secepat api','Karena penumpang dilarang membawa api'], correct:0 },
  { q:'Berapa berat sebuah lokomotif kereta uap besar kira-kira?', emoji:'⚖️', answers:['Bisa mencapai 100-200 ton lebih!','Hanya sekitar 1 ton','Sekitar 5 ton','Persis sama dengan truk biasa'], correct:0 },
  { q:'Apa itu "gerbong restorasi" di kereta penumpang?', emoji:'🍽️', answers:['Gerbong tempat penumpang bisa makan dan minum','Gerbong yang sedang diperbaiki','Gerbong untuk menyimpan makanan saja','Gerbong khusus masinis'], correct:0 },

  // === BAGIAN KERETA DAN ALAM ===
  { q:'Mengapa membangun jalur kereta di pegunungan sangat sulit?', emoji:'🏔️', answers:['Karena harus membuat terowongan dan jembatan yang sangat besar','Karena tidak ada tanah datar','Karena gunung bergerak','Karena kereta tidak bisa naik turun'], correct:0 },
  { q:'Terowongan kereta yang menembus gunung biasanya dibangun menggunakan apa?', emoji:'⛏️', answers:['Mesin bor raksasa (TBM) dan dinamit','Tangan manusia saja','Sihir','Air keras'], correct:0 },
  { q:'Jembatan kereta yang sangat tinggi di atas lembah disebut apa?', emoji:'🌉', answers:['Viaduct','Overpass','Flyover','Causeway'], correct:0 },
  { q:'Kereta yang bisa berjalan di atas air menggunakan apa?', emoji:'🌊', answers:['Jembatan atau terowongan bawah laut, bukan langsung di air','Pontoon / rakit besar','Roda khusus anti air','Kereta tidak bisa melewati air'], correct:0 },
  { q:'Saat musim salju, rel kereta bisa tertutup salju. Apa yang dilakukan petugas?', emoji:'❄️', answers:['Membersihkan salju dengan snowplow khusus di kereta','Membiarkan kereta menabrak salju','Menutup semua stasiun permanen','Mengalihkan kereta ke jalan raya'], correct:0 },
  { q:'Di daerah pegunungan yang sangat terjal, kereta bergerigi bisa naik karena?', emoji:'⛰️', answers:['Ada roda gigi yang mengait rel bergerigi di tengah rel','Ada sayap kecil di badan kereta','Mesin yang sangat kuat tanpa tanjakan','Ada perekat di roda kereta'], correct:0 },

  // === BAGIAN GAMBAR / BENTUK KERETA ===
  { q:'Apa ciri khas bentuk kepala kereta uap zaman dulu?', emoji:'🚂', answers:['Memiliki cerobong asap besar di depan','Hidung sangat runcing','Berbentuk kotak persegi','Tidak memiliki kepala sama sekali'], correct:0 },
  { q:'Kereta peluru (bullet train) mendapat namanya karena?', emoji:'🔫', answers:['Bentuk hidungnya yang runcing seperti peluru dan kecepatannya','Karena bisa menembak','Karena suaranya seperti tembakan','Karena terbuat dari bahan seperti peluru'], correct:0 },
  { q:'Warna dominan Shinkansen seri N700 Jepang adalah?', emoji:'🎨', answers:['Putih dengan garis biru','Merah dan kuning','Hitam seluruhnya','Hijau dan emas'], correct:0 },
  { q:'Apa yang ada di atas kepala kereta listrik yang menyentuh kabel listrik di atas?', emoji:'🔌', answers:['Pantograph (semacam tangan besi berbentuk V atau Z)','Antena radio','Kamera pengawas','Bendera nasional'], correct:0 },
  { q:'Gerbong kereta yang paling di belakang sering disebut apa di zaman kereta uap?', emoji:'🔚', answers:['Caboose (gerbong belakang pengawas)','Tender (gerbong batu bara)','Bagasi','Restorasi'], correct:0 },
  { q:'Tender pada kereta uap berfungsi untuk menyimpan apa?', emoji:'🛢️', answers:['Batu bara dan air untuk ketel uap','Penumpang kelas satu','Senjata api','Mesin cadangan'], correct:0 },

  // === PERTANYAAN SAINS ANAK ===
  { q:'Energi apa yang menggerakkan kereta uap?', emoji:'🌡️', answers:['Energi panas yang diubah menjadi energi gerak (mekanik)','Energi cahaya matahari langsung','Energi kimia dari baterai','Energi angkasa luar'], correct:0 },
  { q:'Mengapa jalur rel lebih ramah lingkungan dibanding jalan tol untuk angkutan barang?', emoji:'🌍', answers:['Kereta mengangkut lebih banyak barang dengan emisi lebih sedikit per ton','Rel tidak perlu perawatan','Kereta bisa terbang menghindari kemacetan','Rel terbuat dari bahan daur ulang'], correct:0 },
  { q:'Apa yang membuat kereta lebih aman dari mobil saat hujan deras?', emoji:'🌧️', answers:['Kereta berjalan di rel khusus, tidak terganggu hujan seperti di jalan raya','Kereta punya payung raksasa','Kereta bisa berenang','Kereta tidak pernah hujan'], correct:0 },
  { q:'Apa nama proses mengubah air menjadi uap dengan cara dipanaskan?', emoji:'♨️', answers:['Penguapan (evaporasi)','Pembekuan','Kristalisasi','Kondensasi'], correct:0 },
  { q:'Ketika uap air mendingin dan berubah kembali menjadi air, proses ini disebut?', emoji:'💧', answers:['Kondensasi','Evaporasi','Sublimasi','Kristalisasi'], correct:0 },
  { q:'Mengapa badan kereta terbuat dari baja bukan dari kayu?', emoji:'🔩', answers:['Baja lebih kuat, tahan api, dan tahan lama','Kayu lebih berat dari baja','Baja lebih murah dari kayu','Karena pohon langka'], correct:0 },

  // === PERTANYAAN SEJARAH LOKAL ===
  { q:'Kereta uap B 2507 di Museum Ambarawa dibuat di negara mana?', emoji:'🇨🇭', answers:['Swiss (SLM Winterthur)','Jerman','Belanda','Amerika'], correct:0 },
  { q:'Jalur kereta bergerigi Ambarawa–Bedono dibangun pada tahun berapa?', emoji:'📅', answers:['Sekitar tahun 1900-an (zaman Belanda)','Tahun 1960-an','Tahun 1985','Tahun 2000'], correct:0 },
  { q:'Siapa yang membangun jaringan kereta api pertama di Jawa?', emoji:'🏗️', answers:['Pemerintah Kolonial Belanda','Kerajaan Mataram','Pemerintah Indonesia merdeka','Perusahaan Inggris'], correct:0 },
  { q:'Apa nama perusahaan kereta api Belanda yang pernah beroperasi di Jawa?', emoji:'🇳🇱', answers:['NIS (Nederlandsch-Indische Spoorweg Maatschappij)','VOC Express','Java Rail','Dutch Train Co.'], correct:0 },
  { q:'Setelah Indonesia merdeka, kereta api di Indonesia dikelola oleh?', emoji:'🇮🇩', answers:['PT Kereta Api Indonesia (PT KAI)','Pemerintah Belanda','Perusahaan swasta asing','Tidak ada yang mengelola'], correct:0 },
  { q:'Jalur kereta api pertama di Indonesia ada di kota mana?', emoji:'📍', answers:['Semarang–Tanggung, Jawa Tengah','Jakarta–Bogor','Surabaya–Malang','Bandung–Cimahi'], correct:0 },

  // === PERTANYAAN PENUTUP MENYENANGKAN ===
  { q:'Jika kamu jadi masinis, hal pertama apa yang harus kamu cek sebelum berangkat?', emoji:'✅', answers:['Rem, sinyal, dan kondisi jalur kereta','Warna baju penumpang','Berapa banyak snack di gerbong','Cuaca di luar negeri'], correct:0 },
  { q:'Apa hadiah terbaik untuk seorang anak yang suka kereta api?', emoji:'🎁', answers:['Mainan kereta set atau buku kereta api','Mainan boneka','Sepatu bola','Ikan hias'], correct:0 },
  { q:'Apakah ada kereta api di luar angkasa?', emoji:'🚀', answers:['Belum ada, tapi ada rencana lunar railway di masa depan!','Ya, ada di planet Mars sekarang','Ya, mengelilingi bulan','Tidak mungkin selamanya'], correct:0 },
  { q:'Apa cita-citamu jika berhubungan dengan kereta api?', emoji:'💭', answers:['Jadi masinis, insinyur kereta, atau arsitek stasiun!','Tidak ada pilihan','Hanya bisa jadi penumpang','Tidak ada karir kereta api'], correct:0 },
  { q:'Kenapa belajar tentang kereta api itu penting?', emoji:'📚', answers:['Karena kereta menghubungkan kota, membawa barang, dan ramah lingkungan!','Karena kereta sudah tidak ada lagi','Hanya untuk orang dewasa','Karena tidak ada transportasi lain'], correct:0 },
]

// Quiz session: pick 8 random questions from the bank
const G18_QUIZ_COUNT = 8
let G18_QUIZ_SESSION = []

function g18ShuffleQuiz() {
  const shuffled = [...G18_QUESTIONS_BANK].sort(() => Math.random() - 0.5)
  G18_QUIZ_SESSION = shuffled.slice(0, G18_QUIZ_COUNT)
}

// Legacy alias (used by g18FinishQuiz star calculation)
const G18_QUIZ = G18_QUESTIONS_BANK

let g18State = {}

function initGame19() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g19Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/g19-pixi.html'
}

function initGame20() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g20Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/g20-pixi.html?v=20260424h'
}

function initGame22() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  try { sessionStorage.setItem('g22Config', JSON.stringify({ level: lv })) } catch(_) {}
  window.location.href = 'games/g22-candy.html'
}

function initGame21() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  const diff = state.selectedLevel === 'hard' ? 'hard' : state.selectedLevel === 'medium' ? 'medium' : 'easy'
  try { sessionStorage.setItem('g21Config', JSON.stringify({ level: lv, difficulty: diff })) } catch(_) {}
  window.location.href = 'games/g21-pixi.html?v=20260429h'
}

function initGame18() {
  battleBgmStop()
  const lv = state.selectedLevelNum || 1
  g18State = {
    lv, quizIdx: 0, quizScore: 0, quizActive: false,
    answeredCurrent: false
  }
  document.getElementById('g18-level').textContent = `Lv.${lv}`
  document.getElementById('g18-stars-badge').textContent = '🏛️ 0'
  hideGameResult()
  document.getElementById('g18-modal').classList.remove('open')
  document.getElementById('g18-gallery').style.display = 'block'
  document.getElementById('g18-quiz-view').style.display = 'none'
  g18RenderGallery()
}

function g18RenderGallery() {
  const grid = document.getElementById('g18-card-grid')
  grid.innerHTML = ''
  // Partition: Ambarawa (indices 0-11), Modern Indonesia (🇮🇩 outside Ambarawa), World (everything else)
  const AMBARAWA_END = 12
  const buckets = { ambarawa: [], modernID: [], world: [] }
  G18_TRAINS.forEach((train, i) => {
    if (i < AMBARAWA_END) buckets.ambarawa.push({ train, i })
    else if (train.country && train.country.startsWith('🇮🇩')) buckets.modernID.push({ train, i })
    else buckets.world.push({ train, i })
  })
  const sections = [
    { items: buckets.ambarawa, title: '🏛️ KOLEKSI MUSEUM AMBARAWA', color: '#FFD082', borderCol: 'rgba(255,193,80,0.35)', ruleCol: 'rgba(255,193,100,0.35)' },
    { items: buckets.modernID, title: '🇮🇩 KERETA MODERN INDONESIA',  color: '#FCA5A5', borderCol: 'rgba(252,165,165,0.4)',  ruleCol: 'rgba(252,165,165,0.35)' },
    { items: buckets.world,    title: '🌍 KERETA TERKENAL DUNIA',    color: 'rgba(180,210,255,0.9)', borderCol: 'rgba(100,150,255,0.35)', ruleCol: 'rgba(150,200,255,0.25)' }
  ]
  sections.forEach(sec => {
    if (!sec.items.length) return
    const hdr = document.createElement('div')
    hdr.style.cssText = `grid-column:1/-1;color:${sec.color};font-size:12px;font-weight:900;letter-spacing:1.5px;padding:10px 2px 2px;border-bottom:1.5px solid ${sec.ruleCol};margin-bottom:2px;`
    hdr.textContent = sec.title
    grid.appendChild(hdr)
    sec.items.forEach(({ train, i }) => {
      const card = document.createElement('div')
      card.className = 'g18-card'
      card.style.borderColor = sec.borderCol
      const svgHtml = g18TrainSVG(train, 110, 48)
      card.innerHTML = `
        <div style="width:100%;height:56px;display:flex;align-items:center;justify-content:center;margin-bottom:4px;overflow:hidden;">${svgHtml}</div>
        <div class="g18-card-name" style="font-size:11px;">${train.name}</div>
        <div class="g18-card-country" style="font-size:9px;">${train.country.split(',')[0]}</div>
        <div class="g18-speed-badge">⚡ ${train.speed} km/j</div>
        <div style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:700;margin-top:2px;">${train.year}</div>
      `
      card.onclick = () => g18ShowDetail(i)
      grid.appendChild(card)
    })
  })
}

function g18ShowDetail(idx) {
  _g18CurrentTrainIdx = idx
  const train = G18_TRAINS[idx]
  const emojiEl = document.getElementById('g18-modal-emoji')
  emojiEl.innerHTML = g18TrainSVG(train, 160, 70)
  document.getElementById('g18-modal-name').textContent = train.name
  document.getElementById('g18-modal-country').textContent = `${train.country} • ${train.year}`
  const details = document.getElementById('g18-modal-details')
  const cell = (label, val, emoji='') => `<div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:8px;text-align:center;">
    <div style="color:rgba(255,255,255,0.55);font-size:9px;font-weight:700;letter-spacing:0.5px;">${label}</div>
    <div style="color:white;font-size:12px;font-weight:900;line-height:1.3;margin-top:2px;">${emoji}${val}</div>
  </div>`
  details.innerHTML =
    cell('KECEPATAN MAX', `${train.speed} km/j`, '⚡ ') +
    cell('TAHUN DIBUAT', train.year, '📅 ') +
    cell('BAHAN BAKAR', train.fuel, '⛽ ') +
    cell('TIPE', train.type, '') +
    (train.builder ? cell('PEMBUAT', train.builder, '🏭 ') : '') +
    (train.route ? cell('RUTE', train.route, '🗺️ ') : '') +
    (train.axles ? cell('RODA', train.axles, '⚙️ ') : '')
  // Insert rich history block (after details, before fact) — only if train.history present
  let histEl = document.getElementById('g18-modal-history')
  const factEl = document.getElementById('g18-modal-fact')
  if (!histEl && train.history) {
    histEl = document.createElement('div')
    histEl.id = 'g18-modal-history'
    histEl.innerHTML = '<span id="g18-modal-history-title">📜 SEJARAH & MAKNA</span><div id="g18-modal-history-text"></div>'
    factEl.parentNode.insertBefore(histEl, factEl)
  }
  if (histEl) {
    if (train.history) {
      histEl.style.display = 'block'
      const txt = document.getElementById('g18-modal-history-text')
      if (txt) txt.textContent = train.history
    } else {
      histEl.style.display = 'none'
    }
  }
  factEl.innerHTML =
    `<div style="margin-bottom:6px;">💡 ${train.fact}</div>` +
    (train.funFact ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.12);">${train.funFact}</div>` : '')
  document.getElementById('g18-modal').classList.add('open')
  playClick()
}

function g18CloseModal() {
  document.getElementById('g18-modal').classList.remove('open')
  document.getElementById('g18-story-panel').style.display = 'none'
}

let _g18CurrentTrainIdx = -1
function g18ShowStory() {
  const panel = document.getElementById('g18-story-panel')
  if (panel.style.display !== 'none') { panel.style.display = 'none'; return } // toggle
  panel.style.display = 'block'
  const train = G18_TRAINS[_g18CurrentTrainIdx]
  if (!train) return
  // Generate a child-friendly story from train data
  const stories = [
    `Tahukah kamu? ${train.name} adalah kereta yang dibuat pada tahun ${train.year}. Kereta ini bisa melaju sampai ${train.speed} km/jam! ${train.fact}`,
    `Bayangkan kamu hidup di tahun ${train.year}. Saat itu, ${train.name} adalah kereta yang sangat hebat! Kereta ini menggunakan ${train.fuel} sebagai bahan bakar. ${train.funFact || ''}`,
    `Ayo kita berkenalan dengan ${train.name}! Kereta ini berasal dari ${train.country} dan dibuat tahun ${train.year}. ${train.builder ? 'Kereta ini dibuat oleh ' + train.builder + '.' : ''} ${train.fact}`,
  ]
  const story = stories[Math.floor(Math.random() * stories.length)]
  const extra = train.route ? `\n\n🗺️ Rute: ${train.route}` : ''
  document.getElementById('g18-story-text').textContent = story + extra
}

function g18StartQuiz() {
  g18ShuffleQuiz()
  g18State.quizIdx = 0
  g18State.quizScore = 0
  g18State.quizActive = true
  document.getElementById('g18-gallery').style.display = 'none'
  document.getElementById('g18-quiz-view').style.display = 'flex'
  g18RenderQuestion()
}

function g18RenderQuestion() {
  const q = G18_QUIZ_SESSION[g18State.quizIdx]
  g18State.answeredCurrent = false
  document.getElementById('g18-q-num').textContent = g18State.quizIdx + 1
  const pct=(g18State.quizIdx/G18_QUIZ_SESSION.length)*100
  const fillEl=document.getElementById('g18-quiz-fill');if(fillEl)fillEl.style.width=pct+'%'
  document.getElementById('g18-q-image').textContent = q.emoji
  document.getElementById('g18-q-text').textContent = q.q
  document.getElementById('g18-q-feedback').textContent = ''
  document.getElementById('g18-q-next-wrap').style.display = 'none'
  const opts = document.getElementById('g18-q-options')
  opts.innerHTML = ''
  // Shuffle answers
  const indices = q.answers.map((_,i) => i).sort(() => Math.random() - 0.5)
  indices.forEach(idx => {
    const btn = document.createElement('button')
    btn.className = 'g18-quiz-option'
    btn.textContent = q.answers[idx]
    btn.dataset.ansIdx = idx
    btn.onclick = () => g18AnswerQuestion(idx, q.correct, btn)
    opts.appendChild(btn)
  })
}

function g18AnswerQuestion(picked, correct, btn) {
  if (g18State.answeredCurrent) return
  g18State.answeredCurrent = true
  const opts = document.getElementById('g18-q-options')
  opts.querySelectorAll('.g18-quiz-option').forEach(b => b.style.pointerEvents = 'none')
  const q = G18_QUIZ_SESSION[g18State.quizIdx]
  if (picked === correct) {
    btn.classList.add('correct')
    spawnCorrectCardJuice(btn)
    quizStreakHit(btn)
    g18State.quizScore++
    document.getElementById('g18-q-feedback').textContent = '✅ Benar! Kamu pintar!'
    document.getElementById('g18-q-feedback').style.color = '#A5D6A7'
    playCorrect()
  } else {
    btn.classList.add('wrong')
    spawnWrongShake(btn)
    quizStreakReset()
    // Highlight correct answer
    opts.querySelectorAll('.g18-quiz-option').forEach(b => {
      if (parseInt(b.dataset.ansIdx) === correct) {
        b.classList.add('correct')
        spawnCorrectCardJuice(b, { burst:false })
      }
    })
    document.getElementById('g18-q-feedback').textContent = `❌ Jawaban: ${q.answers[correct]}`
    document.getElementById('g18-q-feedback').style.color = '#FFCDD2'
    playWrong()
  }
  document.getElementById('g18-stars-badge').textContent = `🏛️ ${g18State.quizScore}`
  const nextWrap = document.getElementById('g18-q-next-wrap')
  nextWrap.style.display = 'block'
  const nextBtn = document.getElementById('g18-q-next-btn')
  nextBtn.textContent = g18State.quizIdx >= G18_QUIZ_SESSION.length - 1 ? '🏆 Lihat Hasil!' : '▶ Lanjut'
}

function g18NextQuestion() {
  g18State.quizIdx++
  if (g18State.quizIdx >= G18_QUIZ_SESSION.length) {
    g18FinishQuiz()
  } else {
    g18RenderQuestion()
  }
}

function g18FinishQuiz() {
  const score = g18State.quizScore
  const total = G18_QUIZ_SESSION.length
  // Unified scoring: pure quiz accuracy
  const perfStars = GameScoring.calc({ correct: score, total })
  state.gameStars[state.currentPlayer] = perfStars
  const gradeEmoji = score === 5 ? '🏆' : score >= 3 ? '⭐' : '📚'
  const gradeMsg = score === 5 ? 'SEMPURNA! Kamu ahli kereta!' : score >= 3 ? 'Bagus! Terus belajar!' : 'Jangan lupa baca kartu museumnya ya!'
  document.getElementById('g18-quiz-view').style.display = 'none'
  showGameResult({
    emoji:gradeEmoji, title:gradeMsg, stars:perfStars,
    msg:`Skor kuis: ${score} / ${total} benar\nAda ${G18_TRAINS.length} kereta di museum — sudah kamu pelajari semua?\nSoal berubah setiap main, coba lagi!`,
    buttons:[{label:'Main Lagi 🔄', action:()=>initGame18()},{label:'Kembali ⌂', action:()=>endGameFromOverlay()}]
  })
  if (score >= 3) playCorrect(); else playWrong()
}

// ============================================================
// ZONE KERETA — Landing Page Music & Banner
// ============================================================
const G_ZONE_MUSIC_PARTS = 5
let gZoneMusicAudio = null
let gZoneMusicPlaying = false
let gZoneMusicPart = -1

function g14GetRandomPart() {
  // Avoid repeating the same part
  let part
  do { part = Math.floor(Math.random() * G_ZONE_MUSIC_PARTS) + 1 }
  while (part === gZoneMusicPart && G_ZONE_MUSIC_PARTS > 1)
  return part
}

function g14PlayZoneMusic() {
  if (!isSoundOn()) return
  if (gZoneMusicPlaying && gZoneMusicAudio) return
  const part = g14GetRandomPart()
  gZoneMusicPart = part
  if (gZoneMusicAudio) { gZoneMusicAudio.pause(); gZoneMusicAudio = null }
  const audio = new Audio(`assets/train/brave-loco-part${part}.mp3`)
  audio.volume = 0.45
  gZoneMusicAudio = audio
  gZoneMusicPlaying = true
  audio.play().catch(() => {})
  audio.onended = () => {
    gZoneMusicPlaying = false
    // Play another random part after a short pause
    setTimeout(() => {
      const el = document.getElementById('zone-kereta')
      if (el && document.getElementById('screen-welcome').style.display !== 'none') {
        g14PlayZoneMusic()
      }
    }, 1200)
  }
  const btn = document.getElementById('zone-kereta-music-btn')
  if (btn) btn.textContent = '🔊'
}

function g14StopZoneMusic() {
  if (gZoneMusicAudio) { gZoneMusicAudio.pause(); gZoneMusicAudio.currentTime = 0; gZoneMusicAudio = null }
  gZoneMusicPlaying = false
  const btn = document.getElementById('zone-kereta-music-btn')
  if (btn) btn.textContent = '🎵'
}

function g14ToggleZoneMusic() {
  if (gZoneMusicPlaying) g14StopZoneMusic(); else g14PlayZoneMusic()
}

function g14ZoneHover() {
  if (!gZoneMusicPlaying) g14PlayZoneMusic()
}

function g14ZoneTap() {
  // Touch devices: tap on zone header starts music
  if (!gZoneMusicPlaying) g14PlayZoneMusic()
}

// Stop zone music when entering a game
function stopZoneKeretaMusic() {
  g14StopZoneMusic()
}

// Patch showScreen to stop zone music when leaving home screen
const _origShowScreen = typeof showScreen === 'function' ? showScreen : null
if (_origShowScreen) {
  window.showScreen = function(id) {
    if (id !== 'screen-welcome') g14StopZoneMusic()
    _origShowScreen(id)
  }
}

// ════════════════════════════════════════════════════════════════════
// Task #66 (2026-04-25): Region & City Selector
// Stage A — Region Picker → Stage B — City Picker → game start
// Reference: documentation and standarization/CITY-PROGRESSION-SPEC.md
// Data: games/data/region-meta.js + city-progression.js + city-pokemon-pack.js (TBD)
// ════════════════════════════════════════════════════════════════════

// State: which game (10/13/13b) is using the selector right now
let _citySelectorGame = 10  // default G10
let _citySelectorRegion = null

const REGION_ICON_PATH = 'assets/Pokemon/others/region.webp'
const CITY_ICON_PATH = 'assets/Pokemon/others/cities.webp'

/** Open Stage A — Region Picker. Caller passes which game (10/13/13b). */
function openRegionOverlay(gameNum) {
  _citySelectorGame = gameNum || 10
  if (typeof migrateLegacyLevelsToCity === 'function') {
    try { migrateLegacyLevelsToCity(_citySelectorGame) } catch(_) {}
  }
  renderRegionGrid()
  const ov = document.getElementById('region-overlay')
  if (ov) ov.classList.add('open')
}
function closeRegionOverlay() {
  const ov = document.getElementById('region-overlay')
  if (ov) ov.classList.remove('open')
}
function renderRegionGrid() {
  const grid = document.getElementById('region-grid')
  if (!grid || typeof getAllRegions !== 'function') return
  const regions = getAllRegions()
  grid.innerHTML = regions.map(r => {
    const cp = (typeof getCityProgress === 'function') ? getCityProgress(_citySelectorGame, r.id) : { completed: [] }
    const completed = cp.completed.length
    const total = (typeof CITY_PACK !== 'undefined' && CITY_PACK[r.id]) ? CITY_PACK[r.id].cities.length : r.totalCities
    const filter = `hue-rotate(${r.hueRotate}deg) saturate(${r.saturate}) drop-shadow(0 0 8px ${r.color})`
    return `
      <div class="region-card" data-region="${r.id}" style="--region-color:${r.color};--region-filter:${filter};border-color:${completed===total?'#22C55E':'rgba(255,255,255,0.14)'};">
        <img class="region-card-icon" src="${REGION_ICON_PATH}" alt="${r.name}" loading="lazy" decoding="async">
        <div class="region-card-name">${r.icon} ${r.name}</div>
        <div class="region-card-gen">${r.gen}</div>
        <div class="region-card-progress">${completed}/${total} ⭐</div>
      </div>`
  }).join('')
  // Hotfix #101-A: event delegation. Per-card addEventListener leaked closures
  // every render (innerHTML drops nodes but listener closures persist in heap),
  // accumulating hundreds of orphaned listeners across picker open/close cycles
  // → mobile OOM crash. One delegated listener bound ONCE survives all renders.
  if (!grid.dataset.bound) {
    grid.addEventListener('click', (ev) => {
      const card = ev.target && ev.target.closest && ev.target.closest('.region-card')
      if (!card || !grid.contains(card)) return
      const id = card.getAttribute('data-region')
      if (!id) return
      try { playClick && playClick() } catch(_) {}
      openCityOverlay(id)
    })
    grid.dataset.bound = '1'
  }
}

/** Open Stage B — City Picker for a region */
function openCityOverlay(regionId) {
  _citySelectorRegion = regionId
  closeRegionOverlay()
  renderCityGrid(regionId)
  const ov = document.getElementById('city-overlay')
  if (ov) ov.classList.add('open')
  // Task #88 (P2-1): preload only THIS region's bgs, defer ~20MB across other 9 regions
  // Browser caches WebPs after Image.src, so subsequent game launch is instant.
  prefetchRegionBackgrounds(regionId)
}

// Task #88: prefetch backgrounds for selected region only — saves bandwidth on
// other 9 regions that user doesn't visit yet. Idempotent (browser caches Image()).
const _bgPrefetchedRegions = new Set()
function prefetchRegionBackgrounds(regionId) {
  if (_bgPrefetchedRegions.has(regionId)) return
  _bgPrefetchedRegions.add(regionId)
  if (typeof CITY_PACK === 'undefined' || !CITY_PACK[regionId]) return
  const isMobile = window.innerWidth < 768
  const folder = isMobile ? 'mobile' : 'pc'
  // Stagger requests so we don't saturate the connection pool (max 6 parallel)
  CITY_PACK[regionId].cities.forEach((city, idx) => {
    if (!city.bg) return
    const file = isMobile ? city.bg.mobile : city.bg.pc
    if (!file) return
    setTimeout(() => {
      const img = new Image()
      img.loading = 'lazy'
      img.decoding = 'async'
      img.src = `assets/Pokemon/background/${folder}/${encodeURIComponent(file)}`
    }, idx * 80)  // 80ms apart → spread 1280ms for 16-city region (Hoenn/Kalos)
  })
}
function closeCityOverlay() {
  const ov = document.getElementById('city-overlay')
  if (ov) ov.classList.remove('open')
  _citySelectorRegion = null
}
function backToRegionOverlay() {
  closeCityOverlay()
  renderRegionGrid()
  const ov = document.getElementById('region-overlay')
  if (ov) ov.classList.add('open')
}
function renderCityGrid(regionId) {
  const grid = document.getElementById('city-grid')
  const titleEl = document.getElementById('city-hdr-title')
  if (!grid || typeof REGION_META === 'undefined' || !REGION_META[regionId]) return
  const meta = REGION_META[regionId]
  if (titleEl) titleEl.textContent = `${meta.icon} ${meta.name}`
  // Task #69 hotfix: explicit guard — if CITY_PACK global is missing, surface to console
  // so future regressions (forgotten <script> tag) are caught immediately, not silently
  // hidden behind the "Coming soon" placeholder.
  if (typeof CITY_PACK === 'undefined') {
    console.error('[city-selector] CITY_PACK is not loaded. Check <script src="games/data/city-pokemon-pack.js"> in index.html.')
  }
  const pack = (typeof CITY_PACK !== 'undefined' && CITY_PACK[regionId]) ? CITY_PACK[regionId] : null
  if (!pack || !pack.cities || pack.cities.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:30px;text-align:center;color:rgba(255,255,255,0.6);font-family:'Fredoka One',cursive;">🚧 Kota ${meta.name} sedang disiapkan!<br><span style="font-size:13px;color:rgba(255,255,255,0.4);">Coming soon — kembali lagi nanti ya 😊</span></div>`
    return
  }
  const states = (typeof getCityStates === 'function')
    ? getCityStates(_citySelectorGame, regionId, pack.cities)
    : pack.cities.map(c => ({...c, state: 'available', stars: 0}))
  const filter = `hue-rotate(${meta.hueRotate}deg) saturate(${meta.saturate}) drop-shadow(0 0 6px ${meta.color})`

  grid.innerHTML = states.map((c, i) => {
    const tier = c.tier || 1
    const dots = Array.from({length: 5}, (_, n) =>
      `<span class="dot${n < tier ? ' active' : ''}"></span>`
    ).join('')
    let statusText = ''
    if (c.state === 'completed') {
      statusText = '⭐'.repeat(Math.max(1, c.stars || 1))
    } else if (c.state === 'available') {
      statusText = '▶'
    } else {
      statusText = '🔒'
    }
    const displayName = c.state === 'locked' ? '???' : (c.name || c.slug)
    return `
      <div class="city-card ${c.state}" data-slug="${c.slug}" data-idx="${i+1}"
           style="--region-color:${meta.color};--region-filter:${filter};">
        <img class="city-card-icon" src="${CITY_ICON_PATH}" alt="${displayName}" loading="lazy" decoding="async">
        <div class="city-card-info">
          <div class="city-card-name">${displayName}</div>
          <div class="city-card-meta">
            <span class="city-card-tier">${dots}</span>
            ${c.gym ? `<span style="opacity:0.7;">🏆 ${(c.gym && c.gym.leader) || c.gym}</span>` : ''}
          </div>
        </div>
        <div class="city-card-status">${statusText}</div>
      </div>`
  }).join('')

  // Hotfix #101-A: event delegation on city grid (single listener bound once;
  // see renderRegionGrid for full rationale — closures from per-card listeners
  // were leaking and crashing mobile after a few picker open/close cycles).
  if (!grid.dataset.bound) {
    grid.addEventListener('click', (ev) => {
      const card = ev.target && ev.target.closest && ev.target.closest('.city-card')
      if (!card || !grid.contains(card)) return
      const slug = card.getAttribute('data-slug')
      const idx1 = parseInt(card.getAttribute('data-idx') || '0', 10)
      if (!slug || !idx1) return
      const stateClass = card.classList.contains('locked') ? 'locked'
                       : card.classList.contains('completed') ? 'completed' : 'available'
      if (stateClass === 'locked') {
        try { playClick && playClick() } catch(_) {}
        card.style.animation = 'none'; void card.offsetWidth
        card.style.animation = 'wrongShake 0.4s ease'
        return
      }
      try { playClick && playClick() } catch(_) {}
      // Persist selection + start game. Use _citySelectorRegion (set by openCityOverlay)
      // since regionId param closure is gone with delegation.
      try {
        const _region = _citySelectorRegion
        state.selectedRegion = _region
        state.selectedCity = slug
        state.selectedCityIdx = idx1
        state.selectedLevelNum = idx1
        state.selectedLevel = idx1 <= 13 ? 'easy' : idx1 <= 26 ? 'medium' : 'hard'
        // Hotfix #101-E: preserve string '13b' so endGame's setCityComplete writes
        // to prog.g13b bucket (matches g13bLevelComplete's own writer). Previously
        // normalized to 13 → writes split across prog.g13 / prog.g13b → progress invisible.
        const _g = _citySelectorGame
        if (_g === '13b') state.currentGame = '13b'
        else {
          const _n = (typeof _g === 'number') ? _g : parseInt(_g, 10)
          if (Number.isFinite(_n)) state.currentGame = _n
        }
        state.gameStars = [0, 0]
        state.maxPossibleStars = null
        state.currentPlayer = 0
        state.paused = false
        state._showingResult = false
        state._showingGameResult = false
      } catch(_) {}
      closeCityOverlay()
      const g = _citySelectorGame
      // Hotfix #110: defensive sprite reset before routing to any game,
      // covers the "win → pick different city → broken sprite" repro.
      try {
        ;['g10-pspr','g10-espr','g13-pspr','g13-wspr','g13b-pspr','g13b-wspr','g13b-leg-spr','g13b-catch-ball'].forEach(id => {
          const el = document.getElementById(id)
          if (el && typeof resetSpriteEl === 'function') resetSpriteEl(el)
        })
        if (typeof flushSpriteQueue === 'function') flushSpriteQueue()
      } catch(_){}
      try {
        if (g === 10 && typeof initGame10 === 'function') { showScreen('screen-game10'); setTimeout(initGame10, 80) }
        else if (g === 13 && typeof initGame13 === 'function') { showScreen('screen-game13'); setTimeout(initGame13, 80) }
        else if (g === '13b' && typeof startQuickFire === 'function') { startQuickFire() }
      } catch(e) { console.warn('[city-selector] start failed:', e) }
    })
    grid.dataset.bound = '1'
  }
}

if (typeof window !== 'undefined') {
  window.openRegionOverlay = openRegionOverlay
  window.closeRegionOverlay = closeRegionOverlay
  window.openCityOverlay = openCityOverlay
  window.closeCityOverlay = closeCityOverlay
  window.backToRegionOverlay = backToRegionOverlay
}
