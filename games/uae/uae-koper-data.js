/* PRD-59D: what the wife packs for herself and the children, Jakarta (CGK) to Abu Dhabi (AUH). Research 2026-11-28.
   item: { id, text, who: 'ibu'|'anak'|'semua', qty (text, per person unless said), loc: 'kabin'|'bagasi'|'pakai'|'jangan',
           tip (the rule behind it, plain words), src: [https], grade: 'resmi'|'sekunder'|'belum' }
   grade 'resmi' = read on the official page; 'sekunder' = official page silent, other source; 'belum' = no source, a
   precaution. Conflicts between sources are listed in `conflicts`, never chosen silently. */
(function (root) {
  'use strict'
  var AS = '2026-11-28'
  var ETI_BAG = 'https://www.etihad.com/en/help/baggage-information'
  var ETI_FAQ = 'https://www.etihad.com/en-ro/help/faq/baggage'
  var ETI_PROH = 'https://www.etihad.com/en/help/baggage-information/prohibited-items'
  var ETI_KIDS = 'https://www.etihad.com/en/help/faq/travel-companions'
  var EMB_MED = 'https://www.uae-embassy.org/permitted-prescriptionsdrugs-while-entering-uae'
  var MED_ANNEX = 'https://www.mofa.gov.ae/-/media/ANNEX%20TO%20TRAVELLERS%20GUIDELINES%20PDF2'
  var DXB_DUTY = 'https://www.dubaicustoms.gov.ae/en/mobile/Pages/DutyPayable.aspx'
  var AD_CUST = 'https://www.adcustoms.gov.ae/Policies-and-Regulations/Restricted-Banned-Commodities'
  var DXB_ARR = 'https://www.dubaiairports.ae/information/arrivals-prohibited-items'
  var BC_CASH = 'https://setkab.go.id/bawa-uangcek-rp100-juta-masukkeluar-pelabuhanbandara-wajib-lapor-bea-dan-cukai'
  var CLIMATE = 'https://visitabudhabi.ae/en/plan-your-trip/essential-info/climate-and-what-to-wear'
  var MOFA_JKT = 'https://www.mofa.gov.ae/en/Missions/Jakarta/Services/Services-for-Individuals/Attestation-Information'
  var ADEK = 'https://www.adek.gov.ae/-/media/Project/TAMM/ADEK/Policies/School-Policies/Teaching-and-Learning/ADEK_S_Student-Administrative-Affairs-Policy_EN_1_2.pdf'
  var ICP_RES = 'https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64'
  var IATA_BAT = 'https://www.iata.org/en/youandiata/travelers/batteries/'
  var i = function (id, text, who, qty, loc, tip, src, grade) { return { id: id, text: text, who: who, qty: qty, loc: loc, tip: tip, src: src, grade: grade } }

  var groups = [
    { id: 'docs', title: 'Map dokumen (tas kabin, dipegang ibu)', intro: 'Semua yang tidak bisa diganti dalam 2 hari dibawa di kabin, tidak di bagasi.', items: [
      i('passport', 'Paspor, sisa masa berlaku lebih dari 6 bulan', 'semua', '1 per orang', 'kabin', 'ICP mensyaratkan paspor berlaku tidak kurang dari 6 bulan untuk izin tinggal keluarga.', [ICP_RES], 'resmi'),
      i('permit', 'Entry permit tiap orang, dicetak', 'semua', '2 salinan per orang, ditambah file di HP', 'kabin', 'Petugas bandara dan maskapai bisa meminta entry permit. Simpan cetakan, jangan hanya di HP yang bisa mati.', [ICP_RES], 'belum'),
      i('nikah', 'Buku nikah asli yang sudah disahkan Kedutaan UAE', 'ibu', 'asli + 2 fotokopi', 'kabin', 'Dipakai untuk izin tinggal istri di Abu Dhabi. Dokumen asli diminta untuk pengesahan, jadi bawa hasilnya, jangan dimasukkan bagasi.', [MOFA_JKT, ICP_RES], 'resmi'),
      i('akta', 'Akta kelahiran asli tiap anak yang sudah disahkan', 'anak', 'asli + 2 fotokopi per anak', 'kabin', 'ICP memakai akta kelahiran untuk membuktikan hubungan dan usia anak; sekolah juga memintanya.', [ICP_RES, ADEK], 'resmi'),
      i('sponsor', 'Salinan dokumen suami: paspor, izin tinggal, Emirates ID, kontrak sewa', 'ibu', '1 set', 'kabin', 'Bila ditanya petugas tentang sponsor. Tidak ada aturan resmi yang mewajibkan dibawa; ini cadangan.', [ICP_RES], 'belum'),
      i('school', 'Rapor terakhir, surat pindah (Transfer Certificate), catatan imunisasi berbahasa Inggris', 'anak', 'asli + 2 salinan per anak', 'kabin', 'ADEK: kelas 2 ke atas wajib laporan belajar dan Transfer Certificate. Catatan imunisasi dipakai perawat sekolah.', [ADEK], 'resmi'),
      i('photo', 'Pas foto latar putih', 'semua', '6 lembar per orang', 'kabin', 'Untuk sekolah dan formulir. Jumlah 6 adalah perkiraan; sebagian besar layanan memakai foto digital.', [], 'belum'),
      i('ticket', 'E-tiket dengan baris jatah bagasi tiap penumpang, dicetak', 'ibu', '1 set', 'kabin', 'Jatah bagasi Etihad tergantung tarif; tarif Basic tidak termasuk bagasi terdaftar. Baca angkanya di tiket sendiri.', [ETI_BAG], 'resmi'),
      i('contacts', 'Kertas berisi nomor suami, penjemput, alamat tinggal di Abu Dhabi, Kedutaan UAE Jakarta +62 21 2598 5500', 'ibu', '1 lembar', 'kabin', 'Cadangan bila HP mati atau baterai habis.', [MOFA_JKT], 'resmi'),
      i('folder', 'Map plastik tahan air dan 2 pulpen', 'ibu', '1 map, 2 pulpen', 'kabin', 'Melindungi dokumen asli; pulpen untuk formulir di perjalanan.', [], 'belum')
    ] },
    { id: 'money', title: 'Uang dan kartu', items: [
      i('aed', 'Uang tunai AED untuk 3 sampai 7 hari pertama', 'ibu', 'jauh di bawah AED 60.000', 'kabin', 'Wajib lapor bea cukai UAE bila membawa lebih dari AED 60.000 (orang dewasa). Uang yang dibawa anak di bawah 18 dihitung ke batas ibu.', [DXB_DUTY, DXB_ARR], 'resmi'),
      i('idr', 'Rupiah tunai seperlunya', 'ibu', 'di bawah Rp 100 juta', 'kabin', 'Keluar Indonesia membawa Rp 100 juta atau lebih wajib lapor Bea Cukai (BC 3.2 dan formulir); rupiah sebesar itu juga butuh izin Bank Indonesia.', [BC_CASH], 'resmi'),
      i('cards', 'Dua kartu debit/kredit internasional dari bank berbeda, disimpan terpisah', 'ibu', '2', 'kabin', 'Bila satu kartu terblokir, masih ada cadangan.', [], 'belum'),
      i('hotline', 'Catatan nomor kartu dan hotline bank', 'ibu', '1 lembar', 'kabin', 'Untuk memblokir kartu bila hilang.', [], 'belum')
    ] },
    { id: 'meds', title: 'Obat dan kesehatan', intro: 'Obat terkontrol butuh izin Kementerian Kesehatan UAE sebelum terbang. Obat biasa tidak.', items: [
      i('rx', 'Obat rutin dalam kemasan asli, belum kedaluwarsa, dengan resep', 'semua', 'cukup 1 bulan (maks. 3 bulan untuk obat biasa)', 'kabin', 'Obat biasa boleh untuk pemakaian pribadi maksimal 3 bulan dengan resep asli. Obat dalam daftar terkontrol hanya untuk masa tinggal atau 1 bulan, mana yang lebih kecil.', [DXB_DUTY, MED_ANNEX], 'resmi'),
      i('letter', 'Surat dokter dan resep berbahasa Inggris untuk setiap obat', 'semua', '1 set per obat', 'kabin', 'Etihad: obat di kabin bersama resep atau surat dokter. Bea cukai memeriksa nama obat di resep.', [ETI_FAQ], 'resmi'),
      i('controlled', 'Obat terkontrol (kodein, tramadol, zolpidem, obat ADHD, diazepam, alprazolam, pregabalin, gabapentin)', 'semua', 'hanya dengan izin', 'jangan', 'Wajib izin Kementerian Kesehatan UAE (MOHAP, gratis, hotline 800 111 11) sebelum terbang, dengan resep dan laporan medis. Tanpa izin jangan dibawa. Cek nama generik, bukan merek.', [EMB_MED, MED_ANNEX], 'resmi'),
      i('kids-kit', 'Parasetamol anak (sirup tanpa kodein), termometer, plester, antiseptik', 'anak', '1 paket kecil', 'kabin', 'Sirup di kabin dihitung cairan: maksimal 100 ml per wadah, total 1 liter dalam kantong plastik bening.', [ETI_FAQ], 'resmi'),
      i('basic', 'Obat alergi, obat maag, oralit, minyak angin', 'semua', '1 paket', 'bagasi', 'Obat bebas tidak perlu izin. Hindari produk berkodein.', [EMB_MED], 'resmi'),
      i('sun', 'Tabir surya, topi, kacamata hitam', 'semua', '1 per orang', 'bagasi', 'Abu Dhabi Juni sampai September rata-rata siang 38-41 derajat. Botol di kabin maksimal 100 ml.', [CLIMATE, ETI_FAQ], 'resmi'),
      i('sanit', 'Hand sanitizer', 'semua', '100 ml di kabin', 'kabin', 'Etihad: hand sanitizer sampai 100 ml di kabin.', [ETI_FAQ], 'resmi'),
      i('glasses', 'Kacamata atau lensa kontak cadangan', 'semua', '1 bagi yang memakai', 'kabin', 'Sulit diganti cepat di negara baru.', [], 'belum')
    ] },
    { id: 'clothes', title: 'Pakaian (untuk 14 hari pertama, dicuci ulang)', intro: 'Bahan katun atau linen ringan. Di dalam ruangan AC dingin, bawa satu lapis hangat. Ke kantor pemerintah: bahu dan kaki tertutup.', items: [
      i('tops', 'Kaos atau blus katun lengan pendek-sedang', 'ibu', '7', 'bagasi', 'Pakaian musim panas cocok hampir sepanjang tahun di Abu Dhabi.', [CLIMATE], 'resmi'),
      i('bottoms', 'Celana panjang ringan atau rok panjang', 'ibu', '4', 'bagasi', 'Visit Abu Dhabi menyarankan bahu dan kaki tertutup saat ke kantor pemerintah, dan lebih tertutup saat Ramadan.', [CLIMATE], 'resmi'),
      i('modest', 'Tunik atau abaya panjang (tidak wajib)', 'ibu', '2', 'bagasi', 'Untuk kantor atau tempat ibadah. Tidak diwajibkan oleh aturan.', [CLIMATE], 'resmi'),
      i('warm', 'Kardigan atau pashmina tipis untuk AC', 'ibu', '2 (1 di kabin)', 'kabin', 'Hotel, mal dan bioskop ber-AC dingin; Visit Abu Dhabi menyarankan pashmina atau jaket.', [CLIMATE], 'resmi'),
      i('kid-tops', 'Baju kasual lengan pendek', 'anak', '7 per anak', 'bagasi', 'Iklim panas sepanjang tahun.', [CLIMATE], 'resmi'),
      i('kid-bottoms', 'Celana selutut atau celana panjang ringan', 'anak', '5 per anak', 'bagasi', 'Pakaian sopan di tempat umum.', [CLIMATE], 'resmi'),
      i('kid-warm', 'Sweater atau jaket tipis', 'anak', '1 per anak', 'kabin', 'Pesawat dan ruangan ber-AC dingin.', [CLIMATE], 'resmi'),
      i('under', 'Pakaian dalam dan kaus kaki', 'semua', '8 per orang', 'bagasi', 'Cukup untuk 1 minggu sambil mencuci.', [], 'belum'),
      i('pj', 'Piyama atau baju tidur', 'semua', '3 per orang', 'bagasi', 'Perkiraan untuk 14 hari dengan mencuci.', [], 'belum'),
      i('swim', 'Baju renang', 'semua', '1 per orang', 'bagasi', 'Baju renang biasa boleh dipakai di pantai umum dan pribadi Abu Dhabi.', [CLIMATE], 'resmi'),
      i('spare', 'Satu setel baju ganti lengkap tiap orang', 'semua', '1 set per orang', 'kabin', 'Bila bagasi terlambat datang.', [], 'belum'),
      i('uniform', 'Seragam sekolah', 'anak', 'jangan beli dulu', 'jangan', 'Setiap sekolah punya seragam sendiri; beli setelah sekolah menentukan.', [], 'belum')
    ] },
    { id: 'shoes', title: 'Sepatu', items: [
      i('sneakers', 'Sepatu tertutup yang nyaman, dipakai di pesawat', 'semua', '1 pasang per orang', 'pakai', 'Menghemat berat bagasi.', [], 'belum'),
      i('sandals', 'Sandal ringan', 'semua', '1 pasang per orang', 'bagasi', 'Untuk rumah dan pantai.', [], 'belum'),
      i('school-shoes', 'Sepatu sekolah', 'anak', '1 pasang per anak', 'bagasi', 'Sesuaikan aturan sekolah baru; bisa juga beli di sana.', [], 'belum')
    ] },
    { id: 'kids', title: 'Anak: perjalanan dan sekolah', items: [
      i('books', 'Buku cerita atau buku aktivitas', 'anak', '2 per anak', 'kabin', 'Penerbangan langsung Jakarta-Abu Dhabi sekitar 8 jam.', [], 'belum'),
      i('comfort', 'Boneka atau selimut kesayangan', 'anak', '1 per anak', 'kabin', 'Membantu anak tenang di tempat baru.', [], 'belum'),
      i('tablet', 'Tablet atau HP dengan pengisi daya dan earphone', 'anak', '1 per anak', 'kabin', 'Perangkat berbaterai litium hanya di tas kabin (IATA).', [IATA_BAT], 'resmi'),
      i('snacks', 'Camilan padat dalam kemasan (biskuit, roti kering)', 'anak', '4 bungkus per anak', 'kabin', 'Makanan cair atau pasta dihitung cairan di kabin (maks. 100 ml). Makanan padat kemasan boleh.', [ETI_FAQ], 'resmi'),
      i('bottle', 'Botol minum kosong', 'semua', '1 per orang', 'kabin', 'Diisi setelah pemeriksaan keamanan.', [], 'belum'),
      i('backpack', 'Ransel kecil anak sebagai tas kabin', 'anak', '1 per anak', 'kabin', 'Etihad ekonomi: satu tas kabin per penumpang, maks. 7 kg dan 56 x 36 x 23 cm.', [ETI_FAQ], 'resmi'),
      i('stationery', 'Alat tulis dan buku tulis', 'anak', '1 set per anak', 'bagasi', 'Mudah dibeli lagi di Abu Dhabi.', [], 'belum'),
      i('meal', 'Pesan menu anak di Etihad paling lambat 24 jam sebelum terbang', 'anak', 'per anak', 'tugas', 'Etihad: menu anak bisa dipesan untuk penerbangan lebih dari 2 jam 50 menit.', [ETI_KIDS], 'resmi'),
      i('bike', 'Sepeda, drone, mainan remote control', 'anak', 'jangan dibawa', 'jangan', 'Bea Cukai Abu Dhabi: boneka, sepeda dan pesawat remote control termasuk barang terbatas yang butuh izin. Beli di Abu Dhabi.', [AD_CUST], 'resmi')
    ] },
    { id: 'tech', title: 'Elektronik', items: [
      i('adapter', 'Adaptor colokan tipe G (tiga kaki, model Inggris) dan satu terminal', 'ibu', '3 adaptor + 1 terminal', 'kabin', 'UAE memakai 230 V 50 Hz colokan tipe G (sumber sekunder). Pengisi daya 100-240 V cukup diberi adaptor.', ['https://www.worldstandards.eu/electricity/plug-voltage-by-country/abu-dhabi/'], 'sekunder'),
      i('phones', 'HP, kabel dan pengisi daya', 'semua', '1 per orang', 'kabin', 'Semua perangkat berbaterai di kabin.', [IATA_BAT], 'resmi'),
      i('powerbank', 'Power bank berlabel Wh terbaca', 'ibu', '1 saja, maksimal 100 Wh', 'kabin', 'Etihad: satu power bank per penumpang, maks. 100 Wh, label Wh harus terbaca, tidak boleh dipakai di pesawat, tidak boleh di bagasi. 20.000 mAh x 3,7 V = 74 Wh.', [ETI_PROH], 'resmi'),
      i('laptop', 'Laptop atau tablet ibu', 'ibu', '1', 'kabin', 'Perangkat litium di kabin.', [IATA_BAT], 'resmi'),
      i('radio', 'Walkie-talkie, telepon satelit, pelacak GPS radio, rokok elektrik', 'semua', 'jangan dibawa', 'jangan', 'Perangkat komunikasi radio dan rokok elektrik termasuk barang terbatas di Bea Cukai Abu Dhabi; Etihad melarang baterai rokok elektrik di bagasi.', [AD_CUST, ETI_BAG], 'resmi')
    ] },
    { id: 'food', title: 'Dapur dan makanan dari Indonesia', intro: 'Makanan kering, dalam kemasan, jumlah pribadi. Tidak ada batas gram resmi yang ditemukan.', items: [
      i('dry', 'Bumbu sachet, kopi, teh, mi instan, sambal kering, kerupuk', 'ibu', 'untuk 2-4 minggu', 'bagasi', 'Makanan dalam jumlah dagang tidak boleh dibawa atas nama pribadi. Toko Asia ada di Abu Dhabi.', [DXB_ARR], 'resmi'),
      i('jars', 'Kecap, sambal botol, minyak (botol kecil)', 'ibu', 'beberapa botol kecil', 'bagasi', 'Di kabin cairan maks. 100 ml per wadah; di bagasi boleh, bungkus rapat.', [ETI_FAQ], 'resmi'),
      i('canned', 'Makanan kemasan tahan lama (rendang kaleng, abon)', 'ibu', '2-4', 'bagasi', 'Kemasan pabrik, jumlah pribadi.', [DXB_ARR], 'sekunder'),
      i('fresh', 'Daging, ayam atau unggas beku, buah segar, biji atau tanaman dengan tanah', 'ibu', 'jangan dibawa', 'jangan', 'Unggas beku dilarang; bibit tanaman dengan tanah tidak boleh dibawa penumpang.', [DXB_ARR], 'resmi'),
      i('betel', 'Daun sirih (paan), naswar, laser pointer merah, alat judi', 'semua', 'jangan dibawa', 'jangan', 'Termasuk barang dilarang Bea Cukai Abu Dhabi.', [AD_CUST], 'resmi')
    ] }
  ]

  var api = {
    checked: AS,
    groups: groups,
    locs: { kabin: 'Tas kabin', bagasi: 'Bagasi', pakai: 'Dipakai', tugas: 'Dikerjakan sebelum terbang', jangan: 'Jangan dibawa' },
    grades: { resmi: 'Sumber resmi', sekunder: 'Sumber sekunder', belum: 'Saran, belum ada aturan' },
    conflicts: [
      'Jatah bagasi terdaftar Etihad Jakarta-Abu Dhabi tidak bisa dibaca tanpa nomor pemesanan: lihat e-tiket tiap penumpang. Tarif Basic tanpa bagasi terdaftar.',
      'Jumlah obat: Bea Cukai Dubai maks. 3 bulan (obat biasa); lampiran MOHAP: masa tinggal atau 1 bulan (obat terkontrol). Bawa 1 bulan, sisanya resep di UAE.',
      'Bentuk resep: halaman Bea Cukai Dubai menyebut disahkan Kedutaan UAE; Etihad cukup resep atau surat dokter. Tanyakan Kedutaan UAE Jakarta.',
      'Tegangan listrik: kebanyakan sumber 230 V, satu menyebut 220 V. Tidak berpengaruh untuk pengisi daya 100-240 V.'
    ]
  }
  root.UAEKoper = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof window !== 'undefined' ? window : globalThis)
