/* PRD-59A §4.2 data: work visa, one Indonesian employee moving alone to Abu Dhabi. Researched 2026-11-28 from the
   sources listed per step (official first; secondary sources are named as such in cost.note). Any number not
   confirmed by an official 2024-2026 source carries est: true and says why. Step and item ids are save keys: never
   rename them after release. */
(function (root) {
  'use strict'
  var D = '2026-11-28'
  var U = {
    imigrasi: 'https://www.imigrasi.go.id/layanan-wni/paspor-republik-indonesia',
    lounge: 'https://imigrasi.go.id/siaran_pers/2024/12/27/pertama-di-jawa-barat-immigration-lounge-di-grand-metropolitan-mall-bekasi',
    mpaspor: 'https://www.imigrasi.go.id/en/2022/06/15/siaran-pers-lakukan-ini-jika-kantor-imigrasi-terdekat-tidak-ditemukan-di-aplikasi-m-paspor',
    kemlu: 'https://legalisasi.kemlu.go.id/en',
    pp21: 'https://peraturan.bpk.go.id/Details/320146/pp-no-21-tahun-2025',
    kontan: 'https://nasional.kontan.co.id/news/tarif-layanan-kemenkum-naik-hingga-233-ini-daftar-biaya-terbarunya',
    ahu: 'https://apostille.ahu.go.id/',
    hcch: 'https://www.hcch.net/en/instruments/conventions/status-table/?cid=41',
    mofaJkt: 'https://www.mofa.gov.ae/en/Missions/Jakarta/Services/Services-for-Individuals/Attestation-Information',
    mofaAtt: 'https://www.mofa.gov.ae/en/services/attestation/',
    mofaFaq: 'https://www.mofa.gov.ae/en/faqs',
    mofaContact: 'https://www.mofa.gov.ae/en/missions/jakarta/contact-us/contact-list',
    mofaMissions: 'https://www.mofa.gov.ae/en/Missions/Foreign-Missions-in-UAE?region=IDN',
    mohreWP: 'https://www.mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022',
    mohreLaw: 'https://www.mohre.gov.ae/assets/download/e82f7872/Federal%20Decree-Law%20No.%2033%20of%202021%20Regarding%20the%20Regulation%20of%20Employment%20Relationship%20and%20its%20amendments_638990571068264034.pdf.aspx',
    mohreDeg: 'https://mohre.gov.ae/en/media-center/news/26/5/2025/mohre-mohesr-launch-digital-integration-project-enabling-verification-of-private-sector-workers',
    mohreIns: 'https://www.mohre.gov.ae/en/media-center/awareness-and-guidance/health-insurance-scheme.aspx',
    uaeRights: 'https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/labour-rights',
    uaePrep: 'https://u.ae/en/information-and-services/jobs/employment-in-the-private-sector/preparing-to-work',
    uaeIns: 'https://u.ae/en/information-and-services/health-and-fitness/Healthcare-access-and-insurance/getting-a-health-insurance',
    uaeEid: 'https://u.ae/en/information-and-services/visa-and-emirates-id/emirates-id',
    uaeFees: 'https://u.ae/en/information-and-services/visa-and-emirates-id/visa-information/visa-fees',
    uaeMed: 'https://u.ae/en/information-and-services/health-and-fitness/health-conditions-for-uae-residence-visa/related-eservices',
    uaeBank: 'https://u.ae/en/information-and-services/finance-and-investment/banking-in-uae',
    icpRes: 'https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64',
    icpId: 'https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a',
    doh: 'https://www.doh.gov.ae/-/media/0BE585B5E6814D81913697DD6E644C02.ashx',
    uu18: 'https://peraturan.go.id/files/uu18-2017bt.pdf',
    p2mi: 'https://peraturan.go.id/files/permen-p2mi-no-27-tahun-2025.pdf',
    cbuae: 'https://rulebook.centralbank.ae/en/rulebook/guidance-licensed-financial-institutions-digital-identification-customer-due-diligence',
    skck: 'https://kabar24.bisnis.com/read/20251127/79/1932153/cara-membuat-skck-online-tanpa-ribet-syarat-dan-biayanya',
    dikti: 'https://www.rctiplus.com/news/detail/gaya-hidup/4729145/cara-legalisir-ijazah-untuk-kuliah-atau-bekerja-ke-luar-negeri-di-kemendikti-saintek',
    medFee: 'https://gulftoday.ae/News/2023/10/03/Abu-Dhabi-offers-3-types-of-medical-tests-for-residency-with-fees-ranging-between-Dhs250-and-Dhs500',
    kbriNews: 'https://rm.id/baca-berita/internasional/332779/dubes-ri-judha-nugraha-jemput-bola-ajak-wni-perbarui-data-diri',
    peduli: 'https://peduliwni.kemlu.go.id/',
    cbPeg: 'https://www.centralbank.ae/en/our-operations/monetary-policy/'
  }
  var map = function (q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) }
  var data = {
    checked: D,
    fx: { aedToIdr: 4500, asOf: D, source: 'patokan tetap 1 USD = 3,6725 AED (CBUAE) dikali kurs USD/IDR sekitar 16.500; ubah ke kurs hari ini' },
    phases: [
      { id: 'prep', title: '1. Persiapan di Indonesia', intro: 'Mulai 2-3 bulan sebelum berangkat. Paspor dan UAE Pass dulu, karena langkah lain memerlukannya.' },
      { id: 'legal', title: '2. Legalisasi ijazah dan transkrip', intro: 'UAE tidak menerima Apostille. Urutannya tetap: kampus, Kementerian Hukum, Kemlu, lalu atestasi UAE. Setiap dokumen diproses sendiri-sendiri; dokumen yang dilaminasi ditolak.' },
      { id: 'visa', title: '3. Visa kerja dan berangkat', intro: 'Diurus pemberi kerja (PRO perusahaan). Hukum kerja UAE melarang pemberi kerja membebankan biaya rekrutmen kepada pekerja.' },
      { id: 'arrive', title: '4. Setelah tiba di Abu Dhabi', intro: 'Visa masuk berlaku sementara. Medical, Emirates ID dan izin tinggal harus selesai sebelum masa visa masuk habis.' }
    ],
    steps: [
      {
        id: 'passport', phase: 'prep', title: 'Paspor (e-paspor 48 halaman)',
        why: 'Paspor harus berlaku minimal 6 bulan saat masuk UAE. Bila tersisa kurang dari itu atau hampir penuh, perpanjang sekarang.',
        issuer: 'Kantor Imigrasi (Ditjen Imigrasi)',
        where: { name: 'Kantor Imigrasi terdekat, pilih di aplikasi M-Paspor', address: 'Bekasi: juga ada Immigration Lounge di Grand Metropolitan Mall, Jl. KH. Noer Ali, Bekasi (kuota 100 per hari kerja, 50 per hari akhir pekan)', hours: 'Sesuai jadwal antrean di M-Paspor', map: map('Immigration Lounge Grand Metropolitan Mall Bekasi'), online: 'https://www.imigrasi.go.id/' },
        bring: [
          { id: 'ktp', text: 'KTP elektronik asli', copies: '1 asli' },
          { id: 'kk', text: 'Kartu Keluarga asli', copies: '1 asli' },
          { id: 'akta', text: 'Akta kelahiran, ijazah atau buku nikah dengan nama dan tanggal lahir yang sama', copies: '1 asli' },
          { id: 'old', text: 'Paspor lama (bila perpanjangan)', copies: '1 asli' },
          { id: 'kode', text: 'Kode pembayaran dan jadwal dari aplikasi M-Paspor', copies: 'di ponsel' }
        ],
        pages: 'Dokumen asli diperlihatkan; fotokopi hanya bila petugas meminta',
        time: 'Perkiraan 3-7 hari kerja sesudah foto dan sidik jari; layanan percepatan bisa selesai hari yang sama',
        cost: { min: 650000, max: 950000, cur: 'IDR', asOf: '2025-09-02', est: false, note: 'e-paspor 5 tahun Rp650.000, 10 tahun Rp950.000; percepatan tambah Rp1.000.000.' },
        payer: 'self', result: 'Paspor dengan masa berlaku 5 atau 10 tahun',
        notes: 'Pilih masa berlaku 10 tahun bila memenuhi syarat agar tidak perlu memperpanjang di Abu Dhabi. Simpan foto halaman data paspor di ponsel; hampir semua langkah berikutnya memintanya.',
        sources: [U.imigrasi, U.mpaspor, U.lounge], checked: D
      },
      {
        id: 'offer', phase: 'prep', title: 'Tawaran kerja dan kontrak ditandatangani',
        why: 'Pengajuan izin kerja ke MOHRE wajib melampirkan tawaran kerja (job offer) yang sudah ditandatangani pekerja.',
        issuer: 'Pemberi kerja di Abu Dhabi (diajukan ke MOHRE)',
        where: { name: 'Lewat email dari HR / PRO perusahaan', online: U.mohreWP },
        bring: [
          { id: 'scan-paspor', text: 'Pindaian halaman data paspor', copies: 'PDF / JPG' },
          { id: 'foto', text: 'Pas foto latar putih', copies: 'berkas digital' },
          { id: 'ttd', text: 'Tawaran kerja yang sudah ditandatangani', copies: 'PDF' },
          { id: 'cek', text: 'Cek tertulis: siapa menanggung tiket, asuransi, biaya visa dan atestasi ijazah', copies: 'catatan' }
        ],
        pages: 'Berkas digital; simpan PDF kontrak',
        time: 'Izin kerja MOHRE sekitar 2 hari kerja setelah diajukan pemberi kerja',
        cost: { min: 0, max: 0, cur: 'IDR', asOf: D, est: false },
        payer: 'employer', result: 'Tawaran kerja dan kontrak (MOHRE)',
        notes: 'Pasal hukum kerja UAE (Decree-Law 33/2021) melarang pemberi kerja menarik biaya rekrutmen dari pekerja, langsung maupun tidak langsung. Minta penggantian biaya paspor dan legalisasi bila belum tertulis.',
        sources: [U.mohreWP, U.mohreLaw, U.uaeRights], checked: D
      },
      {
        id: 'uaepass', phase: 'prep', title: 'Akun UAE Pass (akun dasar)',
        why: 'Atestasi ijazah di portal MOFA UAE hanya bisa diajukan dengan masuk memakai UAE Pass.',
        issuer: 'Pemerintah UAE (aplikasi UAE Pass)',
        where: { name: 'Aplikasi UAE Pass di App Store / Google Play', online: 'https://uaepass.ae/' },
        bring: [
          { id: 'hp', text: 'Ponsel dengan nomor aktif dan email', copies: '-' },
          { id: 'paspor-scan', text: 'Paspor untuk dipindai di aplikasi', copies: '-' }
        ],
        pages: 'Tidak ada kertas', time: 'Beberapa menit',
        cost: { min: 0, max: 0, cur: 'AED', asOf: D, est: false },
        payer: 'self', result: 'Akun UAE Pass dasar (naik ke akun terverifikasi setelah punya Emirates ID, langkah 20)',
        sources: [U.mofaJkt, U.uaeBank], checked: D
      },
      {
        id: 'skck', phase: 'prep', title: 'SKCK (hanya bila pemberi kerja meminta)',
        why: 'Tidak ditemukan aturan resmi bahwa visa kerja Abu Dhabi mewajibkan SKCK. Sebagian perusahaan atau sektor memintanya; tanyakan HR dulu.',
        issuer: 'Polri (daftar lewat aplikasi Polri Super App)',
        where: { name: 'Polres sesuai domisili (cetak), daftar online dulu', online: 'https://skck.polri.go.id/' },
        bring: [
          { id: 'ktp', text: 'KTP', copies: '1 fotokopi' },
          { id: 'kk', text: 'Kartu Keluarga', copies: '1 fotokopi' },
          { id: 'akta', text: 'Akta kelahiran', copies: '1 fotokopi' },
          { id: 'foto', text: 'Pas foto 4x6 latar merah', copies: '6 lembar' },
          { id: 'bpjs', text: 'Kartu BPJS Kesehatan aktif', copies: '1 fotokopi' },
          { id: 'paspor', text: 'Fotokopi paspor (keperluan luar negeri)', copies: '1 fotokopi' }
        ],
        pages: '1 SKCK asli (berlaku 6 bulan)', time: 'Perkiraan 1 hari kerja',
        cost: { min: 0, max: 30000, cur: 'IDR', asOf: '2025-11-27', est: true, note: 'Rp30.000 menurut media (Bisnis, Nov 2025), bukan halaman resmi; Rp0 bila tidak diminta.' },
        payer: 'self', result: 'SKCK',
        notes: 'Bila SKCK dibawa ke UAE, ia memerlukan rantai legalisasi yang sama dengan ijazah (langkah 9-12).',
        sources: [U.skck], checked: D
      },
      {
        id: 'disnaker', phase: 'prep', title: 'Tanya Disnaker: lapor sebagai pekerja migran perseorangan',
        why: 'UU 18/2017 Pasal 63: pekerja yang bekerja untuk pemberi kerja berbadan hukum tanpa agen wajib melapor ke instansi ketenagakerjaan dan Perwakilan RI. Aturan pelaksananya untuk tenaga profesional belum ditemukan.',
        issuer: 'Dinas Tenaga Kerja kabupaten/kota domisili',
        where: { name: 'Disnaker Kota Bekasi atau Disnakertransgi DKI Jakarta (sesuai KTP)', hours: 'Hari kerja; telepon dulu' },
        bring: [
          { id: 'ktp', text: 'KTP', copies: '1 fotokopi' },
          { id: 'kontrak', text: 'Kontrak / tawaran kerja', copies: '1 cetak' },
          { id: 'paspor', text: 'Paspor', copies: '1 fotokopi' },
          { id: 'bpjstk', text: 'Bukti BPJS Ketenagakerjaan', copies: '1 fotokopi' }
        ],
        pages: 'Perkiraan 1 set fotokopi', time: 'Belum terkonfirmasi',
        cost: { min: 0, max: 0, cur: 'IDR', asOf: D, est: true, note: 'Biaya dan kewajiban kartu/registrasi SISKOP2MI untuk profesional kontrak langsung belum terkonfirmasi dari sumber resmi; tanyakan langsung.' },
        payer: 'self', result: 'Kejelasan wajib atau tidak, dan bukti lapor bila diminta',
        sources: [U.uu18, U.p2mi], checked: D
      },
      {
        id: 'bpjs', phase: 'prep', title: 'BPJS dan pajak: tentukan statusnya',
        why: 'UU 18/2017 Pasal 5 mensyaratkan kepesertaan jaminan sosial bagi pekerja migran. BPJS Kesehatan juga diminta untuk SKCK.',
        issuer: 'BPJS Ketenagakerjaan, BPJS Kesehatan, DJP',
        where: { name: 'Aplikasi JMO (BPJS TK), Mobile JKN, kantor pajak terdaftar' },
        bring: [
          { id: 'tk', text: 'Nomor peserta BPJS Ketenagakerjaan', copies: '-' },
          { id: 'kes', text: 'Status BPJS Kesehatan (aktif / akan dinonaktifkan)', copies: '-' },
          { id: 'npwp', text: 'NPWP: tanyakan kewajiban lapor SPT setelah pindah', copies: '-' }
        ],
        pages: 'Tidak ada kertas khusus', time: 'Belum terkonfirmasi',
        cost: { min: 0, max: 0, cur: 'IDR', asOf: D, est: true, note: 'Iuran BPJS pekerja migran perseorangan dan kewajiban pajak setelah pindah belum diriset; angka 0 di sini bukan berarti gratis.' },
        payer: 'self', sources: [U.uu18], checked: D
      },
      {
        id: 'campus', phase: 'legal', title: 'Ijazah dan transkrip: siapkan asli di kampus',
        why: 'Rantai legalisasi memakai dokumen asli. Ijazah dan transkrip masing-masing dihitung satu dokumen.',
        issuer: 'Kampus penerbit (rektorat / bagian akademik)',
        where: { name: 'Bagian akademik kampus' },
        bring: [
          { id: 'ijazah', text: 'Ijazah asli (tidak dilaminasi)', copies: '1 asli' },
          { id: 'transkrip', text: 'Transkrip asli (tidak dilaminasi)', copies: '1 asli' },
          { id: 'ktp', text: 'KTP', copies: '1 fotokopi' },
          { id: 'legalisir', text: 'Fotokopi legalisir kampus untuk arsip', copies: '2 set' }
        ],
        pages: 'Per dokumen 1 asli untuk rantai UAE, ditambah 2 fotokopi legalisir untuk arsip',
        time: 'Perkiraan 1-5 hari kerja',
        cost: { min: 0, max: 150000, cur: 'IDR', asOf: D, est: true, note: 'Tarif berbeda per kampus; tidak ada sumber resmi bersama.' },
        payer: 'self', result: 'Ijazah dan transkrip asli siap dilegalisasi',
        notes: 'Dokumen yang dilaminasi ditolak MOFA UAE. Bila ijazah asli dilaminasi, minta salinan resmi dari kampus.',
        sources: [U.mofaJkt], checked: D
      },
      {
        id: 'dikti', phase: 'legal', title: 'Legalisasi Ditjen Dikti (hanya bila diminta)',
        why: 'Sebagian kasus meminta pengesahan Dikti sebelum Kementerian Hukum. Belum terkonfirmasi wajib untuk UAE; tanyakan ke kampus atau loket Kementerian Hukum.',
        issuer: 'Direktorat Pembelajaran dan Kemahasiswaan, Ditjen Dikti (Kemdiktisaintek)',
        where: { name: 'Kemdiktisaintek, Senayan, Jakarta (layanan legalisasi)', map: map('Kementerian Pendidikan Tinggi Sains dan Teknologi Senayan Jakarta') },
        bring: [
          { id: 'ijazah', text: 'Ijazah asli + legalisir kampus', copies: '1 asli' },
          { id: 'transkrip', text: 'Transkrip asli + legalisir kampus', copies: '1 asli' },
          { id: 'ktp', text: 'KTP', copies: '1 fotokopi' }
        ],
        pages: 'Sesuai permintaan loket', time: 'Belum terkonfirmasi',
        cost: { min: 0, max: 0, cur: 'IDR', asOf: D, est: true, note: 'Biaya tidak ditemukan di sumber resmi; sumber yang ada hanya media lama.' },
        payer: 'self', needs: ['campus'], sources: [U.dikti], checked: D
      },
      {
        id: 'translate', phase: 'legal', title: 'Terjemahan tersumpah (hanya bila dokumen tidak berbahasa Inggris)',
        why: 'Ijazah dan transkrip berbahasa Indonesia saja biasanya perlu terjemahan Inggris oleh penerjemah tersumpah sebelum dilegalisasi. Tanyakan HR apakah diminta.',
        issuer: 'Penerjemah tersumpah (bersertifikat Kementerian Hukum)',
        where: { name: 'Biro penerjemah tersumpah pilihan sendiri' },
        bring: [
          { id: 'ijazah', text: 'Ijazah asli atau fotokopi legalisir', copies: '1' },
          { id: 'transkrip', text: 'Transkrip asli atau fotokopi legalisir', copies: '1' }
        ],
        pages: 'Per dokumen 1 terjemahan dengan cap penerjemah', time: 'Perkiraan 2-5 hari kerja',
        cost: { min: 0, max: 600000, cur: 'IDR', asOf: D, est: true, note: 'Perkiraan untuk 2 dokumen; tarif bebas per biro dan tidak ada sumber resmi. Rp0 bila ijazah sudah dwibahasa.' },
        payer: 'self', needs: ['campus'], sources: [U.mofaJkt], checked: D
      },
      {
        id: 'kemenkum', phase: 'legal', title: 'Legalisasi Kementerian Hukum (Ditjen AHU)',
        why: 'Tanda tangan pejabat kampus disahkan Kementerian Hukum dengan stiker legalisasi. Untuk UAE dipakai legalisasi biasa, bukan Apostille.',
        issuer: 'Kementerian Hukum, Ditjen Administrasi Hukum Umum (AHU)',
        where: { name: 'Ajukan online di portal AHU; ambil sesuai instruksi', address: 'Gedung Ditjen AHU, Jl. H.R. Rasuna Said Kav. 6-7, Kuningan, Jakarta Selatan (konfirmasi lokasi loket sebelum datang)', online: U.ahu, map: map('Ditjen AHU Kementerian Hukum Rasuna Said Kuningan') },
        bring: [
          { id: 'ijazah', text: 'Ijazah asli', copies: '1 asli' },
          { id: 'transkrip', text: 'Transkrip asli', copies: '1 asli' },
          { id: 'ktp', text: 'KTP', copies: '1 fotokopi' },
          { id: 'akun', text: 'Akun portal AHU dan nomor permohonan', copies: '-' }
        ],
        pages: '1 stiker per dokumen (ijazah dan transkrip terpisah)',
        time: 'Perkiraan 3-5 hari kerja',
        cost: { min: 140000, max: 210000, cur: 'IDR', asOf: '2026-08-01', est: true, note: 'Rp70.000 per dokumen sejak 1 Agustus 2026 (PP 30/2026, dilaporkan Kontan); 2-3 dokumen. Teks PP belum dibaca langsung. Apostille Rp150.000 tidak dipakai untuk UAE.' },
        payer: 'self', needs: ['campus'], result: 'Ijazah dan transkrip berstiker Kementerian Hukum',
        notes: 'Indonesia anggota Apostille sejak 2022, tetapi UAE tidak. Jangan memilih Apostille di portal: dokumen Apostille tidak diterima UAE.',
        sources: [U.ahu, U.kontan, U.hcch], checked: D
      },
      {
        id: 'kemlu', phase: 'legal', title: 'Legalisasi Kemlu (Direktorat Konsuler)',
        why: 'Kedutaan UAE hanya menerima dokumen Indonesia yang sudah dilegalisasi Kemlu RI.',
        issuer: 'Kementerian Luar Negeri, Direktorat Konsuler',
        where: { name: 'Kemlu RI, loket legalisasi', address: 'Jl. Taman Pejambon No. 6, Jakarta Pusat 10110. Telepon +62 21 344 1508, email legalisasi.konsuler@kemlu.go.id', hours: 'Senin-Kamis 08.30-15.30 (istirahat 12.00-13.00); Jumat-Minggu dan libur tutup (berlaku sejak 13 April 2026)', online: U.kemlu, map: map('Kementerian Luar Negeri Jl. Taman Pejambon 6 Jakarta Pusat') },
        bring: [
          { id: 'dok', text: 'Dokumen asli berstiker Kementerian Hukum', copies: '1 asli per dokumen' },
          { id: 'nomor', text: 'Nomor permohonan dan bukti bayar dari email Kemlu', copies: 'di ponsel / cetak' },
          { id: 'ktp', text: 'KTP pengambil', copies: '1 asli' }
        ],
        pages: '1 stiker per dokumen',
        time: 'Perkiraan 1-2 hari kerja setelah bayar',
        cost: { min: 20000, max: 210000, cur: 'IDR', asOf: D, est: true, note: 'Tarif resmi tidak terbaca (PP 21/2025 merujuk ke peraturan tarif Kemlu); artikel lama menyebut Rp10.000 per dokumen. Perkiraan Rp10.000-70.000 x 2-3 dokumen. Cek di email tagihan.' },
        payer: 'self', needs: ['kemenkum'], result: 'Dokumen berstiker Kemlu',
        notes: 'Alur online: buat akun, isi formulir, unggah pindaian, tunggu email tagihan, bayar, lalu ambil stiker di loket dengan nomor permohonan. Kemlu tidak melegalisasi untuk negara transit atau negara ketiga.',
        sources: [U.kemlu, U.pp21], checked: D
      },
      {
        id: 'attest', phase: 'legal', title: 'Atestasi Kedutaan UAE + MOFA UAE (satu permohonan digital)',
        why: 'Satu permohonan di portal MOFA mencakup atestasi Kedutaan UAE Jakarta dan MOFA UAE. Tanpa ini ijazah tidak diakui untuk izin kerja.',
        issuer: 'Kedutaan Besar UAE Jakarta dan Kementerian Luar Negeri UAE (MOFA)',
        where: { name: 'Portal mofa.gov.ae, lalu serahkan dokumen di VFS atau BLS', address: 'VFS: Kuningan City Mall Lt. 2 Unit L2-19, Jl. Prof. Dr. Satrio Kav. 18, Jakarta 12940. BLS: Menara Thamrin Unit 805, Jakarta. Kantor konsuler Kedutaan: Menara Sun Life Lt. 2, Mega Kuningan (telepon +62 21 2598 5500)', hours: 'Kantor konsuler Senin-Jumat 09.00-12.00 dan 13.00-16.00', online: U.mofaAtt, map: map('VFS Global Kuningan City Mall Jakarta') },
        bring: [
          { id: 'dok', text: 'Dokumen asli berstiker Kemlu', copies: '1 asli per dokumen' },
          { id: 'fc', text: 'Fotokopi dokumen', copies: '1 per dokumen' },
          { id: 'paspor', text: 'Fotokopi paspor', copies: '1' },
          { id: 'resi', text: 'Resi pembayaran portal MOFA', copies: '1 cetak' }
        ],
        pages: 'Maksimal 3 dokumen per permohonan; tiap dokumen diatestasi terpisah',
        time: 'Perkiraan 3-7 hari kerja (kurir jemput dalam 24 jam; kembali 24-48 jam setelah rilis)',
        cost: { min: 300, max: 1350, cur: 'AED', asOf: '2022-01-01', est: true, note: 'MOFA AED 150 per dokumen pribadi (FAQ resmi). Biaya Kedutaan dan layanan VFS/BLS belum terkonfirmasi; perkiraan AED 150-450 per dokumen x 2-3 dokumen. Biaya atestasi dikembalikan bila ditolak, biaya layanan tidak.' },
        payer: 'either', needs: ['kemlu', 'uaepass'], result: 'Atestasi digital, bisa dicek di verify.mofa.gov.ae',
        notes: 'Langkah portal: masuk UAE Pass, Document Attestation, UAE Embassy and Consulate Abroad, Indonesia, VFS/BLS, Issued Outside Country, Individual. Kirim hasil verifikasi ke HR untuk verifikasi gelar di MOHRE.',
        sources: [U.mofaJkt, U.mofaAtt, U.mofaFaq, U.mofaContact], checked: D
      },
      {
        id: 'permit', phase: 'visa', title: 'Izin kerja MOHRE dan visa masuk (entry permit)',
        why: 'Pemberi kerja mengajukan izin kerja ke MOHRE dan visa masuk ke ICP. Visa masuk dikirim sebagai berkas digital.',
        issuer: 'Pemberi kerja melalui MOHRE dan ICP',
        where: { name: 'Diurus PRO perusahaan; Anda menerima e-visa lewat email', online: U.mohreWP },
        bring: [
          { id: 'evisa', text: 'E-visa (entry permit) dicetak', copies: '2 cetak + di ponsel' },
          { id: 'paspor', text: 'Paspor yang sama dengan di visa', copies: 'asli' }
        ],
        pages: 'E-visa 1 lembar, cetak 2', time: 'Izin kerja sekitar 2 hari kerja; visa masuk beberapa hari kerja',
        cost: { min: 300, max: 3500, cur: 'AED', asOf: D, est: false, note: 'MOHRE: aplikasi AED 50 + izin 2 tahun AED 250 / 1.200 / 3.450 menurut kategori perusahaan. Biaya visa masuk ICP belum terkonfirmasi.' },
        payer: 'employer', needs: ['passport', 'offer'], result: 'E-visa masuk',
        sources: [U.mohreWP, U.uaeFees, U.mohreLaw], checked: D
      },
      {
        id: 'insurance', phase: 'visa', title: 'Asuransi kesehatan',
        why: 'Di Abu Dhabi, pemberi kerja wajib menyediakan asuransi kesehatan bagi karyawan; tanpa polis tidak ada izin tinggal.',
        issuer: 'Perusahaan asuransi terdaftar di DoH Abu Dhabi, dibeli pemberi kerja',
        where: { name: 'HR perusahaan' },
        bring: [{ id: 'kartu', text: 'Kartu asuransi (digital) dan daftar rumah sakit jaringan', copies: 'di ponsel' }],
        pages: 'Kartu digital', time: 'Bersamaan dengan proses visa',
        cost: { min: 320, max: 320, cur: 'AED', asOf: '2025-01-01', est: true, note: 'Paket dasar federal AED 320 per tahun sejak 1 Januari 2025 (sumber sekunder, skema federal); premi aktual Abu Dhabi mengikuti polis perusahaan.' },
        payer: 'employer', needs: ['offer'],
        notes: 'Tanyakan HR soal pembagian biaya berobat (co-pay); dokumen DoH lama menyebut dua aturan yang tampak berbeda.',
        sources: [U.uaeIns, U.mohreIns, U.doh], checked: D
      },
      {
        id: 'travel', phase: 'visa', title: 'Tiket, uang awal, dan berkas yang dibawa di kabin',
        why: 'Hari-hari pertama sebelum gaji dan rekening bank berjalan memerlukan uang tunai atau kartu internasional.',
        issuer: 'Sendiri / pemberi kerja (tiket sesuai kontrak)',
        where: { name: 'Bandara Soekarno-Hatta ke Abu Dhabi (AUH)' },
        bring: [
          { id: 'paspor', text: 'Paspor', copies: 'asli' },
          { id: 'evisa', text: 'E-visa', copies: '2 cetak' },
          { id: 'dok', text: 'Ijazah dan transkrip asli yang sudah diatestasi', copies: 'asli, di tas kabin' },
          { id: 'kontrak', text: 'Kontrak kerja', copies: '1 cetak' },
          { id: 'foto', text: 'Pas foto latar putih', copies: '4 lembar' },
          { id: 'uang', text: 'Uang awal (tunai AED atau kartu debit internasional)', copies: '-' }
        ],
        pages: 'Map dokumen terpisah di tas kabin', time: '-',
        cost: { min: 0, max: 0, cur: 'IDR', asOf: D, est: true, note: 'Tiket mengikuti kontrak (u.ae: biaya perjalanan termasuk kewajiban kontrak). Jumlah uang awal tidak diriset; isi sendiri di biaya sebenarnya.' },
        payer: 'either', needs: ['permit'], sources: [U.uaeRights], checked: D
      },
      {
        id: 'medical', phase: 'arrive', title: 'Tes kesehatan (medical fitness)',
        why: 'Syarat izin tinggal: rontgen dada (TB) dan tes darah untuk pendatang baru di atas 18 tahun.',
        issuer: 'Pusat skrining SEHA / DoH Abu Dhabi',
        where: { name: 'Pusat skrining SEHA, booking di aplikasi SEHA dengan nomor aplikasi visa', online: U.uaeMed, map: map('SEHA visa screening centre Abu Dhabi') },
        bring: [
          { id: 'paspor', text: 'Paspor + e-visa', copies: 'asli' },
          { id: 'eid-app', text: 'Formulir aplikasi Emirates ID / visa dari PRO', copies: '1 cetak' },
          { id: 'foto', text: 'Pas foto', copies: '2' }
        ],
        pages: 'Hasil dikirim langsung ke sistem', time: 'Perkiraan hasil 24-48 jam (reguler)',
        cost: { min: 250, max: 500, cur: 'AED', asOf: '2023-10-03', est: true, note: 'Reguler AED 250, ekspres 350, premier 500 (Gulf Today, Oktober 2023, sekunder).' },
        payer: 'employer', needs: ['permit'], result: 'Hasil fit masuk sistem',
        sources: [U.uaeMed, U.medFee], checked: D
      },
      {
        id: 'eid', phase: 'arrive', title: 'Biometrik, izin tinggal (residence) dan Emirates ID',
        why: 'Emirates ID adalah identitas utama di UAE: bank, nomor ponsel, sewa rumah, SIM.',
        issuer: 'ICP (Federal Authority for Identity, Citizenship, Customs and Port Security)',
        where: { name: 'Pusat layanan ICP / typing centre yang ditunjuk PRO', online: U.icpRes, map: map('ICP customer happiness centre Abu Dhabi') },
        bring: [
          { id: 'paspor', text: 'Paspor + e-visa', copies: 'asli' },
          { id: 'medical', text: 'Hasil medical (di sistem)', copies: '-' },
          { id: 'foto', text: 'Pas foto latar putih', copies: '2' }
        ],
        pages: 'Kartu dikirim kurir', time: 'Perkiraan 3-10 hari kerja',
        cost: { min: 700, max: 700, cur: 'AED', asOf: D, est: false, note: 'Contoh 2 tahun: izin tinggal AED 400 (aplikasi 100 + 100 per tahun + layanan 100) dan Emirates ID AED 300 (100 per tahun + layanan 100), menurut halaman ICP (tanpa tanggal, diambil 28 Nov 2026). Typing centre menambah biaya kecil.' },
        payer: 'employer', needs: ['medical', 'insurance'], result: 'Izin tinggal di sistem + kartu Emirates ID',
        sources: [U.icpRes, U.icpId, U.uaeEid, U.uaeFees], checked: D
      },
      {
        id: 'degree', phase: 'arrive', title: 'Verifikasi gelar dan kontrak kerja di MOHRE',
        why: 'Untuk pekerjaan level keahlian 1-3, gelar dari luar UAE harus diatestasi; pemberi kerja menyerahkannya ke MOHRE (terhubung dengan MoHESR sejak Mei 2025).',
        issuer: 'MOHRE dan MoHESR, diajukan pemberi kerja',
        where: { name: 'Diurus HR / PRO' },
        bring: [
          { id: 'attest', text: 'Bukti atestasi MOFA (langkah 12)', copies: 'PDF' },
          { id: 'kontrak', text: 'Kontrak kerja final untuk ditandatangani digital', copies: '-' }
        ],
        pages: 'Digital', time: 'Belum terkonfirmasi',
        cost: { min: 0, max: 0, cur: 'AED', asOf: D, est: true, note: 'Bagian dari biaya izin kerja pemberi kerja; biaya terpisah tidak ditemukan.' },
        payer: 'employer', needs: ['attest', 'eid'], sources: [U.mohreDeg, U.uaePrep], checked: D
      },
      {
        id: 'uaepass-up', phase: 'arrive', title: 'Naikkan UAE Pass menjadi akun terverifikasi',
        why: 'Akun terverifikasi (dengan Emirates ID) dipakai untuk bank, TAMM, dan layanan pemerintah Abu Dhabi.',
        issuer: 'UAE Pass', where: { name: 'Aplikasi UAE Pass (pindai Emirates ID + wajah)', online: 'https://uaepass.ae/' },
        bring: [{ id: 'eid', text: 'Emirates ID', copies: 'asli' }],
        pages: 'Tidak ada kertas', time: 'Beberapa menit',
        cost: { min: 0, max: 0, cur: 'AED', asOf: D, est: false },
        payer: 'self', needs: ['eid', 'uaepass'], sources: [U.uaeBank, U.cbuae], checked: D
      },
      {
        id: 'bank', phase: 'arrive', title: 'Rekening bank (untuk gaji)',
        why: 'Gaji dibayar lewat sistem upah (WPS) ke rekening bank. Bank wajib memverifikasi Emirates ID.',
        issuer: 'Bank pilihan di UAE',
        where: { name: 'Cabang bank atau aplikasi bank (verifikasi lewat UAE Pass)' },
        bring: [
          { id: 'eid', text: 'Emirates ID', copies: 'asli' },
          { id: 'paspor', text: 'Paspor + visa tinggal', copies: 'asli' },
          { id: 'salary', text: 'Surat keterangan gaji (salary certificate) dari HR', copies: '1' },
          { id: 'alamat', text: 'Bukti alamat (kadang diminta)', copies: '1' }
        ],
        pages: 'Sesuai bank', time: 'Beberapa jam sampai beberapa hari',
        cost: { min: 0, max: 0, cur: 'AED', asOf: D, est: true, note: 'Banyak bank mensyaratkan saldo minimum; angkanya berbeda per bank dan tidak diriset.' },
        payer: 'self', needs: ['uaepass-up'], sources: [U.uaeBank, U.cbuae], checked: D
      },
      {
        id: 'kbri', phase: 'arrive', title: 'Lapor diri ke KBRI Abu Dhabi (Peduli WNI)',
        why: 'Pendataan WNI untuk perlindungan dan layanan konsuler (perpanjang paspor, keadaan darurat).',
        issuer: 'KBRI Abu Dhabi (Kemlu RI)',
        where: { name: 'Online di peduliwni.kemlu.go.id', address: 'KBRI Abu Dhabi: 42 Al Yaqout St, Al Rawdah, Abu Dhabi, P.O. Box 7256. Telepon +971 2 445 4448, email abudhabi.kbri@kemlu.go.id (alamat menurut daftar misi MOFA UAE; telepon dulu sebelum datang)', hours: 'Belum terkonfirmasi dari sumber resmi', online: U.peduli, map: map('Embassy of Indonesia Abu Dhabi Al Rawdah') },
        bring: [
          { id: 'nik', text: 'NIK dan nomor paspor', copies: '-' },
          { id: 'alamat', text: 'Alamat dan nomor ponsel UAE', copies: '-' }
        ],
        pages: 'Tidak ada kertas; bukti lapor lewat email', time: 'Sekitar 5 menit',
        cost: { min: 0, max: 0, cur: 'IDR', asOf: D, est: true, note: 'Layanan online tanpa biaya menurut sumber sekunder.' },
        payer: 'self', needs: ['eid'], sources: [U.peduli, U.mofaMissions, U.kbriNews], checked: D
      }
    ]
  }
  root.UAEDocs = data
  if (typeof module !== 'undefined' && module.exports) module.exports = data
})(typeof window !== 'undefined' ? window : globalThis)
