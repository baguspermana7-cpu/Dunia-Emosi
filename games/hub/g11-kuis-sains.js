// ================================================================
// games/hub/g11-kuis-sains.js — cut from game.js (v64.71, PRD-42) when G11 joined the Timmy question bank.
// A classic script after game.js (same global scope, same cache token); index.html loads it and sw.js precaches it.
// tools/qa-hub-split.mjs keeps the order and the token.
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

  // ── Expansion pack (2026-06-21) — +80 questions across tiers + topics ──
  // Topics rotate through: Biologi (hewan, tumbuhan, tubuh), Fisika (cahaya,
  // suara, magnet, listrik, gerak), Kimia ringan (zat, perubahan), Astronomi
  // (planet, bulan, bintang), Ekologi/Bumi (cuaca, lingkungan, daur ulang).

  // ── TK tier extra (15 new) ──
  {tier:'tk', emoji:'🐶', q:'Anjing berbunyi apa?', choices:['Meong','Guk-guk','Moo','Ngeong'], ans:1, explain:'Anjing berbunyi "guk-guk". Anjing adalah sahabat manusia yang setia dan suka bermain.'},
  {tier:'tk', emoji:'🐢', q:'Hewan apa yang berjalan paling lambat?', choices:['Kelinci','Kura-kura','Cheetah','Kuda'], ans:1, explain:'Kura-kura berjalan sangat lambat karena cangkangnya berat. Tapi kura-kura bisa hidup sampai ratusan tahun!'},
  {tier:'tk', emoji:'❄️', q:'Salju turun saat musim apa?', choices:['Panas','Hujan','Dingin','Semi'], ans:2, explain:'Salju turun saat musim dingin di negara yang punya 4 musim. Salju adalah air hujan yang membeku jadi serpihan putih.'},
  {tier:'tk', emoji:'👃', q:'Kita bernapas menggunakan apa?', choices:['Mulut saja','Hidung','Telinga','Mata'], ans:1, explain:'Kita bernapas terutama lewat hidung. Udara masuk ke hidung lalu ke paru-paru.'},
  {tier:'tk', emoji:'🦷', q:'Untuk mengunyah makanan kita pakai apa?', choices:['Mata','Hidung','Gigi','Telinga'], ans:2, explain:'Gigi digunakan untuk mengunyah makanan jadi halus. Jangan lupa sikat gigi pagi dan malam ya!'},
  {tier:'tk', emoji:'🌻', q:'Bunga matahari menghadap ke...', choices:['Tanah','Matahari','Bawah','Belakang'], ans:1, explain:'Bunga matahari selalu menghadap matahari! Itu sebabnya namanya bunga matahari.'},
  {tier:'tk', emoji:'🍌', q:'Pisang biasanya berwarna apa saat matang?', choices:['Biru','Hijau','Kuning','Hitam'], ans:2, explain:'Pisang matang berwarna kuning. Saat masih muda hijau, dan jika terlalu lama warnanya bisa coklat.'},
  {tier:'tk', emoji:'🦒', q:'Hewan apa yang lehernya paling panjang?', choices:['Gajah','Jerapah','Singa','Kuda nil'], ans:1, explain:'Jerapah punya leher paling panjang — bisa sampai 2 meter! Itu membantu jerapah makan daun pohon tinggi.'},
  {tier:'tk', emoji:'⭐', q:'Bintang muncul saat kapan?', choices:['Siang','Pagi','Malam','Sore'], ans:2, explain:'Bintang muncul di langit malam. Sebenarnya bintang juga ada di siang hari, tapi cahaya matahari terlalu terang sehingga tidak terlihat.'},
  {tier:'tk', emoji:'🐧', q:'Penguin tinggal di tempat yang...', choices:['Panas','Dingin bersalju','Gurun','Hutan tropis'], ans:1, explain:'Penguin tinggal di tempat dingin bersalju seperti Antartika. Tubuh penguin tebal dan berlemak supaya hangat.'},
  {tier:'tk', emoji:'🍯', q:'Madu dibuat oleh hewan...', choices:['Semut','Lebah','Capung','Belalang'], ans:1, explain:'Madu dibuat oleh lebah dari sari bunga. Lebah mengumpulkan nektar lalu mengubahnya jadi madu di sarang.'},
  {tier:'tk', emoji:'👁️', q:'Untuk melihat kita pakai...', choices:['Telinga','Mata','Hidung','Tangan'], ans:1, explain:'Mata digunakan untuk melihat. Jaga mata kita ya: jangan main HP terlalu dekat dan terlalu lama.'},
  {tier:'tk', emoji:'☔', q:'Saat hujan kita pakai...', choices:['Topi','Payung atau jas hujan','Kacamata','Sepatu boots saja'], ans:1, explain:'Saat hujan kita pakai payung atau jas hujan supaya tidak basah. Kalau basah-kuyup bisa masuk angin.'},
  {tier:'tk', emoji:'🍃', q:'Daun jatuh dari pohon karena...', choices:['Sudah tua','Tertawa','Ditiup angin atau musim gugur','Mau menari'], ans:2, explain:'Daun jatuh karena angin atau saat musim gugur. Daun yang gugur akan jadi pupuk alami untuk tanah.'},
  {tier:'tk', emoji:'🥚', q:'Telur biasanya berasal dari...', choices:['Ikan saja','Ayam atau burung','Pohon','Batu'], ans:1, explain:'Telur biasanya berasal dari ayam, bebek, atau burung lain. Beberapa hewan seperti ikan, ular, dan kura-kura juga bertelur.'},

  // ── Cilik tier extra (15 new) ──
  {tier:'cilik', emoji:'🧲', q:'Magnet bisa menarik benda yang terbuat dari...', choices:['Kayu','Plastik','Besi atau baja','Kaca'], ans:2, explain:'Magnet menarik logam seperti besi, baja, dan nikel. Magnet tidak menarik kayu, plastik, atau kaca.'},
  {tier:'cilik', emoji:'🔆', q:'Bumi berputar mengelilingi apa?', choices:['Bulan','Bintang','Matahari','Mars'], ans:2, explain:'Bumi berputar mengelilingi Matahari selama 1 tahun (365 hari). Bumi juga berputar pada porosnya sendiri selama 24 jam (1 hari).'},
  {tier:'cilik', emoji:'🌬️', q:'Angin sebenarnya adalah...', choices:['Udara bergerak','Air bergerak','Tanah bergerak','Cahaya bergerak'], ans:0, explain:'Angin adalah udara yang bergerak. Angin terjadi karena perbedaan tekanan udara — udara dingin bergerak ke tempat udara panas.'},
  {tier:'cilik', emoji:'🦴', q:'Yang menyokong tubuh kita supaya bisa berdiri adalah...', choices:['Kulit','Tulang','Rambut','Kuku'], ans:1, explain:'Tulang menyokong tubuh kita. Manusia dewasa punya 206 tulang. Tulang juga melindungi organ penting seperti otak dan jantung.'},
  {tier:'cilik', emoji:'❤️', q:'Organ yang memompa darah ke seluruh tubuh adalah...', choices:['Paru-paru','Jantung','Ginjal','Hati'], ans:1, explain:'Jantung memompa darah ke seluruh tubuh. Jantung bekerja tanpa henti, sekitar 100.000 kali sehari!'},
  {tier:'cilik', emoji:'🌬️', q:'Saat berlari, napas kita jadi...', choices:['Lebih cepat','Berhenti','Lebih lambat','Sama saja'], ans:0, explain:'Saat berlari, otot butuh lebih banyak oksigen, jadi napas kita lebih cepat untuk menarik lebih banyak udara.'},
  {tier:'cilik', emoji:'🌗', q:'Bulan tidak menghasilkan cahaya sendiri — cahaya bulan berasal dari...', choices:['Bintang','Matahari','Lampu','Listrik'], ans:1, explain:'Bulan tidak punya cahaya sendiri. Bulan terlihat bersinar karena memantulkan cahaya matahari.'},
  {tier:'cilik', emoji:'🥶', q:'Air berubah jadi es saat suhunya...', choices:['Sangat panas','Sangat dingin (di bawah 0°C)','Hangat','Sedang'], ans:1, explain:'Air membeku jadi es pada suhu 0°C atau di bawahnya. Saat membeku, air menjadi padat.'},
  {tier:'cilik', emoji:'🌊', q:'Air laut rasanya...', choices:['Manis','Asin','Pahit','Tawar'], ans:1, explain:'Air laut rasanya asin karena mengandung banyak garam. Garam berasal dari batuan dan tanah yang terbawa sungai ke laut.'},
  {tier:'cilik', emoji:'☁️', q:'Awan terbentuk dari...', choices:['Asap','Uap air','Debu','Kapas'], ans:1, explain:'Awan terbentuk dari uap air yang naik ke langit dan mengembun. Saat uap air sudah banyak, jatuh kembali sebagai hujan.'},
  {tier:'cilik', emoji:'🦷', q:'Berapa kali sehari kita harus sikat gigi?', choices:['Sekali','Dua kali (pagi & malam)','5 kali','Setiap habis makan saja'], ans:1, explain:'Sikat gigi minimal 2 kali sehari: pagi dan malam sebelum tidur. Itu menjaga gigi sehat dan bebas dari kuman.'},
  {tier:'cilik', emoji:'🦇', q:'Hewan apa yang aktif di malam hari?', choices:['Ayam','Kelelawar','Kupu-kupu','Lebah'], ans:1, explain:'Kelelawar aktif di malam hari. Kelelawar adalah satu-satunya mamalia yang bisa terbang!'},
  {tier:'cilik', emoji:'🌽', q:'Jagung tumbuh dari... ', choices:['Akar','Biji','Daun','Batang yang dipotong'], ans:1, explain:'Jagung tumbuh dari bijinya. Setiap biji bisa jadi satu tanaman baru.'},
  {tier:'cilik', emoji:'🐝', q:'Madu rasanya...', choices:['Asam','Manis','Pahit','Asin'], ans:1, explain:'Madu rasanya manis dan menyehatkan. Madu juga bisa jadi obat alami untuk batuk ringan.'},
  {tier:'cilik', emoji:'🌎', q:'Bumi kita berbentuk...', choices:['Datar','Bulat (seperti bola)','Kotak','Segitiga'], ans:1, explain:'Bumi berbentuk bulat seperti bola, sedikit pepat di kutubnya. Itu sebabnya kita tidak jatuh saat berjalan!'},

  // ── Tumbuh tier extra (15 new) ──
  {tier:'tumbuh', emoji:'🔊', q:'Suara merambat lewat...', choices:['Hampa udara','Udara, air, atau benda padat','Hanya kabel','Cahaya'], ans:1, explain:'Suara butuh medium (udara, air, atau benda padat) untuk merambat. Di luar angkasa yang hampa udara, suara tidak bisa merambat.'},
  {tier:'tumbuh', emoji:'💡', q:'Cahaya merambat dengan kecepatan...', choices:['Lambat','Sedang','Sangat cepat (300.000 km/detik)','Sama dengan suara'], ans:2, explain:'Cahaya merambat dengan kecepatan ~300.000 km/detik di hampa udara — yang tercepat di alam semesta. Itu sebabnya kilat terlihat dulu sebelum suara guruh terdengar.'},
  {tier:'tumbuh', emoji:'🦴', q:'Tulang paling kecil di tubuh manusia ada di...', choices:['Jari','Telinga','Hidung','Kaki'], ans:1, explain:'Tulang terkecil ada di telinga tengah: stapes (tulang sanggurdi), ukurannya hanya 2-3 mm! Tulang ini membantu kita mendengar.'},
  {tier:'tumbuh', emoji:'🌡️', q:'Saat air mendingin sampai 0°C, air...', choices:['Mendidih','Membeku','Menguap','Hilang'], ans:1, explain:'Pada 0°C, air membeku menjadi es. Es adalah wujud padat dari air. Volumenya sedikit lebih besar dari air cair.'},
  {tier:'tumbuh', emoji:'🌋', q:'Lava panas keluar dari...', choices:['Gunung es','Gunung berapi','Bukit pasir','Laut dalam'], ans:1, explain:'Lava adalah magma yang keluar dari gunung berapi. Suhunya bisa mencapai 700-1.200°C! Indonesia punya banyak gunung berapi aktif.'},
  {tier:'tumbuh', emoji:'🌍', q:'Negara Indonesia berada di benua...', choices:['Eropa','Asia','Afrika','Amerika'], ans:1, explain:'Indonesia berada di benua Asia, tepatnya Asia Tenggara. Indonesia adalah negara kepulauan terbesar di dunia dengan lebih dari 17.000 pulau!'},
  {tier:'tumbuh', emoji:'🌪️', q:'Angin yang berputar sangat kencang disebut...', choices:['Pelangi','Tornado','Pelana','Halo'], ans:1, explain:'Tornado atau angin puting beliung adalah angin yang berputar sangat kencang dan bisa menghancurkan benda di jalurnya.'},
  {tier:'tumbuh', emoji:'🌌', q:'Galaksi tempat tata surya kita disebut...', choices:['Andromeda','Bima Sakti','Sombrero','Triangulum'], ans:1, explain:'Tata surya kita berada di Galaksi Bima Sakti (Milky Way). Galaksi ini berisi lebih dari 100 miliar bintang!'},
  {tier:'tumbuh', emoji:'💧', q:'Siklus air di Bumi terdiri dari: penguapan, kondensasi, dan...', choices:['Pendinginan','Presipitasi (hujan)','Letusan','Gempa'], ans:1, explain:'Siklus air: air menguap dari laut/sungai, lalu mengembun jadi awan, kemudian turun sebagai hujan (presipitasi). Siklus ini terus berulang.'},
  {tier:'tumbuh', emoji:'🐝', q:'Lebah dan kupu-kupu membantu tanaman dengan cara...', choices:['Menyiram','Memindahkan serbuk sari (polinasi)','Memakan hama','Menggigit daun'], ans:1, explain:'Lebah dan kupu-kupu adalah polinator — mereka memindahkan serbuk sari antar bunga supaya tanaman bisa berbuah. Tanpa polinator, banyak buah dan sayur tidak akan tumbuh.'},
  {tier:'tumbuh', emoji:'🪴', q:'Tumbuhan menghirup gas... dan melepaskan gas...', choices:['O₂; CO₂','CO₂; O₂','N₂; O₂','H₂; CO₂'], ans:1, explain:'Saat fotosintesis, tumbuhan menyerap CO₂ dan melepaskan O₂. Itulah mengapa pohon disebut "paru-paru Bumi" — mereka membersihkan udara kita.'},
  {tier:'tumbuh', emoji:'♻️', q:'Sampah plastik bisa kita kurangi dengan cara...', choices:['Membakar','Reduce, Reuse, Recycle (3R)','Membuang ke sungai','Menimbun di tanah'], ans:1, explain:'3R: Reduce (kurangi pakai plastik), Reuse (pakai ulang), Recycle (daur ulang). Plastik butuh ratusan tahun untuk hancur — sebisa mungkin hindari sekali pakai.'},
  {tier:'tumbuh', emoji:'🦠', q:'Yang menyebabkan flu dan banyak penyakit menular adalah...', choices:['Polusi udara','Virus','Cuaca dingin saja','Stress'], ans:1, explain:'Virus adalah mikroba yang menyebabkan flu, demam, dan banyak penyakit. Virus sangat kecil — perlu mikroskop khusus untuk melihatnya. Cuci tangan dan tutup mulut saat batuk membantu mencegah penyebaran.'},
  {tier:'tumbuh', emoji:'⚡', q:'Petir adalah...', choices:['Cahaya bintang','Listrik di awan','Tabrakan planet','Sinar matahari'], ans:1, explain:'Petir adalah pelepasan muatan listrik raksasa antar awan atau dari awan ke tanah. Suhunya bisa lebih panas dari permukaan matahari! Suara guruh muncul setelah kilat karena suara lebih lambat dari cahaya.'},
  {tier:'tumbuh', emoji:'🧠', q:'Pusat kendali tubuh kita adalah...', choices:['Jantung','Otak','Perut','Tulang punggung'], ans:1, explain:'Otak adalah pusat kendali tubuh — mengatur gerakan, pikiran, ingatan, dan perasaan. Otak berkomunikasi dengan tubuh lewat saraf tulang punggung.'},

  // ── Pintar tier extra (15 new) ──
  {tier:'pintar', emoji:'🪐', q:'Planet terbesar di tata surya adalah...', choices:['Mars','Bumi','Jupiter','Saturnus'], ans:2, explain:'Jupiter adalah planet terbesar di tata surya — bisa muat 1.300 Bumi di dalamnya! Jupiter punya bintik merah raksasa yang sebenarnya badai berusia ratusan tahun.'},
  {tier:'pintar', emoji:'⚛️', q:'Materi terkecil yang masih punya sifat zat disebut...', choices:['Molekul','Atom','Sel','Bakteri'], ans:1, explain:'Atom adalah unit terkecil materi yang masih punya sifat sebuah zat. Di dalam atom ada proton, neutron, dan elektron. Atom-atom bergabung jadi molekul.'},
  {tier:'pintar', emoji:'💨', q:'Tiga wujud zat yang umum adalah padat, cair, dan...', choices:['Es','Gas','Awan','Asap'], ans:1, explain:'Tiga wujud zat utama: padat (seperti batu), cair (seperti air), dan gas (seperti uap). Ada juga wujud keempat yaitu plasma — ditemukan di matahari dan petir.'},
  {tier:'pintar', emoji:'🌍', q:'Lapisan terluar Bumi yang kita pijak disebut...', choices:['Inti dalam','Mantel','Kerak Bumi','Magma'], ans:2, explain:'Kerak Bumi adalah lapisan terluar tempat kita tinggal. Tebalnya 5-70 km. Di bawahnya ada mantel (cair panas) lalu inti (besi-nikel sangat panas).'},
  {tier:'pintar', emoji:'🌪️', q:'Gempa bumi disebabkan oleh...', choices:['Hujan deras','Pergerakan lempeng tektonik','Angin kencang','Letusan kembang api'], ans:1, explain:'Gempa bumi terjadi saat lempeng tektonik di kerak Bumi bergeser atau bertabrakan. Indonesia berada di "Cincin Api Pasifik" sehingga sering ada gempa dan gunung berapi.'},
  {tier:'pintar', emoji:'🌊', q:'Tsunami biasanya dipicu oleh...', choices:['Hujan deras','Gempa besar di bawah laut','Angin musim','Banjir sungai'], ans:1, explain:'Tsunami umumnya dipicu oleh gempa besar di bawah laut yang menggerakkan air dalam jumlah besar. Saat di laut dalam, ombak rendah, tapi makin tinggi saat mendekati pantai dangkal.'},
  {tier:'pintar', emoji:'🔬', q:'Sel adalah unit terkecil dari...', choices:['Awan','Makhluk hidup','Batu','Logam'], ans:1, explain:'Sel adalah unit terkecil dari makhluk hidup. Tubuh manusia terdiri dari triliunan sel. Ada banyak jenis sel: sel saraf, sel darah, sel otot, dan banyak lagi.'},
  {tier:'pintar', emoji:'☀️', q:'Energi terbarukan yang berasal dari matahari disebut...', choices:['Energi nuklir','Energi surya','Energi angin','Energi air'], ans:1, explain:'Energi surya berasal dari matahari, ditangkap pakai panel surya. Bersih, ramah lingkungan, dan tidak akan habis selama matahari masih bersinar.'},
  {tier:'pintar', emoji:'🌬️', q:'Pembangkit listrik tenaga angin memakai...', choices:['Bahan bakar fosil','Turbin angin','Pemanas air','Pembakaran sampah'], ans:1, explain:'Pembangkit listrik tenaga angin (PLTB) memakai turbin angin raksasa yang berputar saat ditiup angin. Turbin tersambung ke generator yang menghasilkan listrik. Bebas polusi!'},
  {tier:'pintar', emoji:'💎', q:'Benda paling keras yang dikenal di alam adalah...', choices:['Besi','Berlian (intan)','Emas','Marmer'], ans:1, explain:'Berlian (intan) adalah zat alami terkeras yang dikenal. Berlian terbuat dari karbon yang tertekan sangat kuat di dalam Bumi selama jutaan tahun.'},
  {tier:'pintar', emoji:'🧪', q:'Asam dicampur basa akan menghasilkan...', choices:['Ledakan besar','Garam dan air','Logam','Plastik'], ans:1, explain:'Reaksi asam + basa menghasilkan garam + air. Contoh: cuka (asam) + soda kue (basa) menghasilkan gas CO₂ — itulah kenapa adonan kue mengembang.'},
  {tier:'pintar', emoji:'🦴', q:'Tulang anak-anak biasanya... dibanding orang dewasa', choices:['Lebih sedikit','Lebih banyak (270+)','Sama persis','Setengahnya'], ans:1, explain:'Bayi lahir dengan ~270 tulang. Saat tumbuh dewasa, banyak tulang menyatu sehingga dewasa hanya punya 206 tulang. Tulang anak juga lebih lentur supaya tidak mudah patah.'},
  {tier:'pintar', emoji:'🪐', q:'Saturnus terkenal karena memiliki...', choices:['Atmosfer hijau','Cincin yang indah','Bulan terbanyak','Pegunungan tertinggi'], ans:1, explain:'Saturnus terkenal karena cincinnya yang spektakuler. Cincin Saturnus terbuat dari pecahan es dan batu yang mengorbit planet itu.'},
  {tier:'pintar', emoji:'🦠', q:'Vaksinasi bekerja dengan cara...', choices:['Mengobati saat sakit','Melatih sistem imun mengenali kuman','Menghilangkan kuman dari udara','Membuat kebal seumur hidup tanpa syarat'], ans:1, explain:'Vaksin berisi versi lemah/mati dari kuman, melatih sistem imun mengenali dan melawannya. Saat kuman asli menyerang, tubuh sudah siap. Vaksin menyelamatkan jutaan nyawa setiap tahun.'},
  {tier:'pintar', emoji:'🌳', q:'Hutan lindung penting untuk...', choices:['Tempat membangun pabrik','Menjaga air, udara, & satwa liar','Lokasi tambang','Sumber daging'], ans:1, explain:'Hutan lindung menjaga sumber air bersih, menyerap CO₂, menghasilkan oksigen, dan menjadi rumah bagi banyak satwa liar. Tanpa hutan, banyak masalah lingkungan akan muncul.'},

  // ── 'easy/medium/hard' tiers shared with other quiz games — keep
  //    additional kid-friendly science-themed entries minimal here to
  //    avoid polluting other games' pools. (Mapping done in g11LevelStart.)
]

let g11State={}
// PRD-42: Kuis Sains also asks the Timmy bank's 'umum' and 'logika' items (games/data/tk-questions.js, loaded on the
// first G11 start). Kept: plain multiple-choice items whose pictures exist in assets/db/lib; dropped: items built for
// another renderer (pics, listen, letters, swatch, seq, Arabic) and items that point at a picture they do not carry.
const G11_TK_SKIP=['pics','listen','letters','swatch','seq','ar','rtl','tr','trs','islam']
const G11_TK_TIER={1:'tk',2:'cilik',3:'tumbuh',4:'pintar'}
let _g11TkTried=false
function g11TkPool(){
  const T=window.TKQuestions; if(!T||!Array.isArray(T.items)) return []
  return T.items.filter(i=>(i.domain==='umum'||i.domain==='logika')&&!G11_TK_SKIP.some(k=>i[k]!=null)&&Array.isArray(i.choices)&&i.choices.indexOf(i.answer)>=0
      &&((i.visual||[]).length||!/gambar|lihat/i.test(i.prompt+' '+(i.hint1||''))))
    .map(i=>({tier:G11_TK_TIER[i.level]||'cilik', visual:i.visual||[], q:i.prompt, choices:i.choices.slice(), answer:i.answer, explain:i.explain||'', id:i.id}))
}
function g11AllQuestions(){ return SCIENCE_QUESTIONS.concat(g11TkPool()) }
function initGame11(){
  if(!window.TKQuestions&&!_g11TkTried&&window.DuniaLoad){ _g11TkTried=true; DuniaLoad('tk-questions.js',initGame11); return }
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
  const ALL=g11AllQuestions()
  let pool=ALL.filter(q=>q.tier===mapped)
  if(pool.length<DIFF[lvl].rounds) pool=ALL.filter(q=>q.tier==='tk'||q.tier==='cilik')
  if(pool.length<DIFF[lvl].rounds) pool=ALL
  // no question twice in one session (same prompt text), and the Timmy items' choices shuffled (their answer is often first)
  const seen=new Set()
  pool=[...pool].sort(()=>Math.random()-0.5).filter(q=>!seen.has(q.q)&&seen.add(q.q)).slice(0,DIFF[lvl].rounds)
    .map(q=>{ if(q.answer==null) return q; const ch=[...q.choices].sort(()=>Math.random()-0.5); return {...q,choices:ch,ans:ch.indexOf(q.answer)} })
  g11State={pool, idx:0, stars:0, total:pool.length}
  document.getElementById('g11-progress-bar').style.width='0%'
  g11ShowQuestion()
}
// g11 — upgrade the question emoji to a crisp DB sprite when confidently mapped
// (existing art: science/creatures/objects). Additive; emoji fallback on 404.
const G11_EMOJI_SPRITE={
  '☀️':['science',1],'🌙':['science',2],'⭐':['science',3],'🌍':['science',4],'🔭':['science',8],
  '🧲':['science',10],'🔋':['science',11],'🌋':['science',16],'🏔️':['science',17],'🌈':['science',18],
  '☁️':['science',19],'❄️':['science',22],'💧':['science',25],'🔥':['science',26],'🧊':['science',27],
  '🌳':['science',29],'🍃':['science',30],'🌸':['science',31],'🌱':['science',32],'🌵':['science',34],'🍄':['science',35],
  '🍎':['objects',1],'🍌':['objects',2],
  '🐔':['creatures',1],'🐣':['creatures',1],'🐕':['creatures',12],'🐶':['creatures',12],'🐘':['creatures',31],
  '🦁':['creatures',28],'🐄':['creatures',37],'🐒':['creatures',42],'🐟':['creatures',51],'🐬':['creatures',53],
  '🐢':['creatures',57],'🐸':['creatures',58]
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
  const emEl=document.getElementById('g11-emoji')
  const spr=G11_EMOJI_SPRITE[q.emoji]
  if(q.visual&&q.visual.length){
    const sz=q.visual.length===1?92:q.visual.length===2?70:52
    emEl.innerHTML=q.visual.map(k=>`<img src="assets/db/lib/${k}.webp" alt="" decoding="async" style="width:${sz}px;height:${sz}px;object-fit:contain;margin:0 3px;filter:drop-shadow(0 6px 10px rgba(0,0,0,.28))">`).join('')
  } else if(!q.emoji){
    emEl.textContent=''
  } else if(spr && window.DBSprites){
    emEl.innerHTML=`<img src="${DBSprites.path(spr[0],spr[1])}" alt="" decoding="async" style="width:92px;height:92px;object-fit:contain;filter:drop-shadow(0 6px 10px rgba(0,0,0,.28))" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${q.emoji}'}))">`
  } else {
    emEl.textContent=q.emoji
  }
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
  try{ if(window.DuniaAnswerQ) DuniaAnswerQ(q.q,correct) }catch(e){} // PRD-42
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
