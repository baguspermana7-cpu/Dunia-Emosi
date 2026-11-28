/* PRD-59C: family residence (wife + children) for an Indonesian employee in Abu Dhabi. Same step schema as
   uae-docs-data.js (PRD-59A) plus:
     who:  'sponsor' (the husband, in the UAE) | 'wife' | 'child' (repeated per child) | 'family' (on arrival)
     land: country of the step, 'id' or 'ae'; where: the office, as in PRD-59A
     days: {min, max} calendar days the step takes, for the timeline (PRD-59C L21); est: true when no source states it
     school: true on child steps that only apply to a child entering Grade 2 or above (ADEK policy 1.5.2)
   Research 2026-11-28 (official first; secondary marked in cost.note / notes). Conflicts are written, not chosen. */
(function (root) {
  'use strict'
  var AS = '2026-11-28'
  var ICP_RES = 'https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64'
  var ICP_VISA = 'https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60'
  var MOFA_JKT = 'https://www.mofa.gov.ae/en/Missions/Jakarta/Services/Services-for-Individuals/Attestation-Information'
  var MOFA_ATT = 'https://www.mofa.gov.ae/en/services/attestation/'
  var KEMLU = 'https://legalisasi.kemlu.go.id/en'
  var AHU = 'https://ahu.go.id/'
  var AHU_FEE = 'https://portal.ahu.go.id/uploads/324489_Matriks%20Jenis%20dan%20Tarif%20PNBP%20Ditjen%20AHU%20PP%2028%202019.pdf'
  var ADEK = 'https://www.adek.gov.ae/-/media/Project/TAMM/ADEK/Policies/School-Policies/Teaching-and-Learning/ADEK_S_Student-Administrative-Affairs-Policy_EN_1_2.pdf'
  var IMI_ANAK = 'https://jogja.imigrasi.go.id/syarat-pembuatan-paspor-anak-dan-cara-mengurusnya/'
  var KEMENAG = 'https://simbi.kemenag.go.id/info-nikah/legalisasi'
  var ICP_EID = 'https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a'
  var DOH_VS = 'https://www.doh.gov.ae/-/media/Feature/Resources/Standards/Visa-Screening-Standard-V15.ashx'
  var IMI_BARU = 'https://jakartabarat.imigrasi.go.id/paspor-baru/'
  var KUA_NU = 'https://nu.or.id/nasional/layanan-legalisasi-buku-nikah-tetap-jalan-meski-wfh-ini-jadwalnya-kEahw'
  var DELOITTE = 'https://www.deloitte.com/middle-east/en/services/tax/perspectives/uae-updated-tenancy-contract-requirements-for-dependent-residence-permit-applications-submitted-in-abu-dhabi.html'
  var DOH_EPI = 'https://www.doh.gov.ae/-/media/B6CBBBAEAB6546FEB67607CF5F11EF03.ashx'
  var GN_MED = 'https://gulfnews.com/living-in-uae/visa-immigration/uae-residence-visa-medical-fitness-test-requirements-explained-1.1731411606564'
  var LAWREP = 'https://thelawreporters.com/are-you-working-in-abu-dhabi-here-s-how-to-sponsor-a-residence-visa-for-your-family'
  var EMB = { name: 'UAE Embassy Jakarta lewat VFS Global atau BLS International', address: 'VFS: Kuningan City Mall lt. 2 unit L2-19, Jl. Dr. Satrio Kav. 18, Jakarta. BLS: Menara Thamrin unit 805, Jl. M.H. Thamrin Kav. 3, Jakarta Pusat. Kedutaan: Menara Sun Life lt. 2, Mega Kuningan', hours: 'VFS 09:00-12:00 dan 13:00-17:00; kedutaan Senin-Jumat 09:00-12:00, 13:00-16:00. Email: JakartaCVO@mofa.gov.ae', online: MOFA_ATT }
  var KEMLU_W = { name: 'Kementerian Luar Negeri (aplikasi STEMPEL ASLI)', address: 'Jl. Taman Pejambon No. 6, Jakarta Pusat (loket pengambilan dikonfirmasi di aplikasi)', online: KEMLU }
  var AHU_W = { name: 'Kementerian Hukum, Ditjen AHU (layanan Legalisasi)', address: 'Daring lewat aplikasi AHU Legalisasi, ambil stiker sesuai petunjuk aplikasi', online: AHU }
  var FX = { aedToIdr: 4500, asOf: AS, source: 'patokan tetap 1 USD = 3,6725 AED (CBUAE) dikali kurs USD/IDR sekitar 16.500; ubah ke kurs hari ini' }
  // PRD-59 §7 L22: every term a step uses gets a plain explanation (tooltip). Matched case-sensitively in the step text.
  var GLOSSARY = [
    { term: 'ICP', tip: 'Federal Authority for Identity, Citizenship, Customs and Port Security: lembaga federal UAE yang menerbitkan entry permit, izin tinggal dan Emirates ID.' },
    { term: 'entry permit', tip: 'Izin masuk UAE untuk tujuan tinggal bersama keluarga. Diajukan sponsor dari UAE, berlaku 60 hari untuk dipakai masuk.' },
    { term: 'Emirates ID', tip: 'Kartu identitas wajib untuk setiap penduduk UAE, termasuk anak. Diterbitkan bersama izin tinggal.' },
    { term: 'UAE Pass', tip: 'Akun digital resmi pemerintah UAE untuk masuk ke layanan online (ICP, MoFA, TAMM). Bisa dibuat lewat aplikasi UAE Pass.' },
    { term: 'TAMM', tip: 'Portal layanan pemerintah Abu Dhabi (tamm.abudhabi), satu pintu untuk banyak layanan emirat.' },
    { term: 'Tawtheeq', tip: 'Pendaftaran resmi kontrak sewa rumah di Abu Dhabi. Sertifikatnya dipakai sebagai bukti tempat tinggal untuk visa keluarga.' },
    { term: 'DoH', tip: 'Department of Health Abu Dhabi: mengatur asuransi kesehatan wajib dan standar tes kesehatan visa.' },
    { term: 'SEHA', tip: 'Abu Dhabi Health Services Company: pengelola pusat skrining kesehatan untuk visa di Abu Dhabi.' },
    { term: 'MoFA', tip: 'Ministry of Foreign Affairs UAE: mengesahkan (attestation) dokumen dari luar negeri agar diakui di UAE.' },
    { term: 'VFS', tip: 'VFS Global: mitra resmi Kedutaan UAE di Jakarta yang menerima berkas pengesahan dokumen atau menjemputnya lewat kurir.' },
    { term: 'BLS', tip: 'BLS International: mitra resmi kedua Kedutaan UAE di Jakarta untuk serah terima berkas pengesahan.' },
    { term: 'STEMPEL ASLI', tip: 'Aplikasi Kemlu untuk legalisasi dokumen: daftar, unggah scan, bayar, lalu ambil stiker legalisasi.' },
    { term: 'Kemenkum', tip: 'Kementerian Hukum (dulu Kemenkumham), Ditjen AHU: legalisasi tanda tangan pejabat pada dokumen sebelum ke Kemlu.' },
    { term: 'AHU', tip: 'Direktorat Jenderal Administrasi Hukum Umum, Kementerian Hukum: unit yang memberi stiker legalisasi.' },
    { term: 'Kemlu', tip: 'Kementerian Luar Negeri RI: legalisasi terakhir di Indonesia sebelum dokumen disahkan Kedutaan UAE.' },
    { term: 'Kemenag', tip: 'Kementerian Agama: melegalisasi buku nikah (Ditjen Bimas Islam) sebelum ke Kemenkum.' },
    { term: 'KUA', tip: 'Kantor Urusan Agama kecamatan: penerbit buku nikah; melegalisir fotokopinya.' },
    { term: 'Dukcapil', tip: 'Dinas Kependudukan dan Pencatatan Sipil: penerbit akta kelahiran dan Kartu Keluarga.' },
    { term: 'M-Paspor', tip: 'Aplikasi Imigrasi untuk mendaftar jadwal dan membayar paspor sebelum datang ke kantor.' },
    { term: 'ADEK', tip: 'Abu Dhabi Department of Education and Knowledge: pengatur sekolah di Abu Dhabi, termasuk syarat pindah sekolah.' },
    { term: 'Transfer Certificate', tip: 'Surat pindah dari sekolah asal yang menyebut kelas terakhir yang sudah selesai. Dipakai sekolah di Abu Dhabi untuk menentukan kelas.' },
    { term: 'Apostille', tip: 'Pengesahan satu langkah antarnegara anggota Konvensi Apostille. UAE bukan anggota, jadi dokumen Indonesia tetap lewat Kemenkum, Kemlu dan Kedutaan.' },
    { term: 'legalisir', tip: 'Pengesahan bahwa fotokopi sama dengan aslinya, atau bahwa tanda tangan pejabat pada dokumen itu asli.' },
    { term: 'meterai', tip: 'Meterai tempel atau elektronik Rp 10.000 untuk surat pernyataan dan surat kuasa.' },
    { term: 'surat kuasa', tip: 'Surat yang memberi izin orang lain (misalnya istri) mengurus atas nama Anda; ditandatangani di atas meterai.' },
    { term: 'airway bill', tip: 'Resi pengiriman kurir. Kedutaan UAE memintanya dicetak bila dokumen dijemput kurir.' },
    { term: 'sponsor', tip: 'Orang yang menjamin izin tinggal keluarga, di sini suami yang sudah bekerja dan punya izin tinggal di UAE.' }
  ]
  var c = function (min, max, cur, est, note) { return { min: min, max: max, cur: cur, asOf: AS, est: !!est, note: note || '' } }

  // the same 3-stage chain for every Indonesian civil document going to the UAE (UAE is not an Apostille party)
  function chain(pre, who, doc, after, bring0) {
    return [
      { id: pre + '-ahu', who: who, land: 'id', phase: who, title: 'Legalisasi ' + doc + ' di Kemenkum (AHU)', issuer: 'Kementerian Hukum, Ditjen AHU', where: AHU_W,
        why: 'UAE bukan negara Apostille, jadi dokumen Indonesia harus lewat rantai legalisasi lama: Kemenkum, lalu Kemlu, lalu Kedutaan UAE. Stiker Kemenkum adalah syarat sebelum Kemlu.',
        bring: [{ id: 'orig', text: doc + ' asli (yang sudah dilegalisasi penerbit bila perlu)', copies: '1 asli' }, { id: 'ktp', text: 'Fotokopi KTP pemohon', copies: '1' }, { id: 'materai', text: 'Meterai Rp 10.000 per dokumen (daftar lama, sekunder)', copies: '1' }, { id: 'spec', text: 'Bila AHU belum punya contoh tanda tangan pejabat penerbit: minta spesimen tanda tangan ke penerbit (KUA/Kemenag atau Dukcapil)', copies: 'bila diminta' }],
        cost: c(50000, 70000, 'IDR', true, 'Per dokumen. Matriks PNBP AHU (PP 28/2019) Rp 50.000; berita PP 30/2026 (mulai 1 Agustus 2026) menyebut Rp 70.000. Belum terkonfirmasi: lihat angka di aplikasi sebelum membayar.'),
        payer: 'self', needs: after, days: { min: 1, max: 5 }, est: true, time: 'Tidak disebut resmi', sources: [AHU, AHU_FEE] },
      { id: pre + '-kemlu', who: who, land: 'id', phase: who, title: 'Legalisasi ' + doc + ' di Kemlu (STEMPEL ASLI)', issuer: 'Kementerian Luar Negeri', where: KEMLU_W,
        why: 'Kedutaan UAE hanya mengesahkan dokumen Indonesia yang sudah dilegalisasi Kemlu.',
        bring: [{ id: 'orig', text: doc + ' asli yang sudah berstiker Kemenkum', copies: '1 asli' }, { id: 'scan', text: 'Unggah di STEMPEL ASLI: scan dokumen, stiker Kemenkum, dan nomor dokumen', copies: 'file' }, { id: 'appno', text: 'Nomor permohonan STEMPEL ASLI dan bukti bayar', copies: '1' }],
        cost: c(0, 0, 'IDR', true, 'Tarif PNBP Kemlu (PP 21/2025) tidak terbaca; jumlahnya muncul di notifikasi pembayaran aplikasi.'),
        payer: 'self', needs: [pre + '-ahu'], days: { min: 3, max: 7 }, est: true, time: 'Tidak disebut resmi', sources: [KEMLU] }
    ]
  }

  var steps = [
    // ---------- sponsor (the husband, in Abu Dhabi) ----------
    { id: 'sp-resident', who: 'sponsor', land: 'ae', phase: 'sponsor', title: 'Izin tinggal dan Emirates ID Anda sudah aktif', issuer: 'ICP', where: { name: 'Lihat Kelengkapan Dokumen, langkah Emirates ID' },
      why: 'Sponsor wajib punya izin tinggal UAE yang berlaku. Izin tinggal keluarga tidak bisa lebih lama dari izin tinggal sponsor.',
      bring: [{ id: 'eid', text: 'Emirates ID Anda', copies: 'salinan digital' }, { id: 'pass', text: 'Paspor Anda dengan izin tinggal', copies: 'salinan digital' }],
      cost: c(0, 0, 'AED', false, 'Biaya ada di langkah Emirates ID pada Kelengkapan Dokumen.'), payer: 'employer', needs: [], days: { min: 0, max: 0 }, time: 'Sudah dilacak di menu Dokumen', sources: [ICP_RES] },
    { id: 'sp-salary', who: 'sponsor', land: 'ae', phase: 'sponsor', title: 'Surat keterangan kerja dan gaji dari HR', issuer: 'Pemberi kerja (HR)', where: { name: 'HR perusahaan Anda' },
      why: 'ICP: gaji minimal AED 4.000 per bulan, atau AED 3.000 bila perusahaan memberi tempat tinggal. Buktinya surat keterangan kerja yang menyebut gaji bulanan dan tunjangan tempat tinggal.',
      bring: [{ id: 'cert', text: 'Employment certificate / salary certificate (menyebut gaji bulanan dan tempat tinggal)', copies: '1 PDF bertanda tangan' }, { id: 'contract', text: 'Kontrak kerja (MOHRE)', copies: 'salinan digital' }],
      cost: c(0, 0, 'AED', false), payer: 'employer', needs: ['sp-resident'], days: { min: 1, max: 5 }, est: true, time: 'Biasanya beberapa hari kerja (perkiraan)', sources: [ICP_RES] },
    { id: 'sp-tenancy', who: 'sponsor', land: 'ae', phase: 'sponsor', title: 'Kontrak sewa terdaftar Tawtheeq dan tagihan listrik/air', issuer: 'Abu Dhabi (DARI / TAMM, Tawtheeq)', where: { name: 'Pemilik rumah atau agen; pendaftaran Tawtheeq lewat DARI atau TAMM', online: 'https://www.tamm.abudhabi' },
      why: 'ICP: tempat tinggal harus layak dan sebanding dengan kapasitas unit untuk keluarga, dibuktikan dengan tagihan air/listrik. Sejak 18 Feb 2025 Abu Dhabi kembali mewajibkan kontrak sewa terdaftar di Abu Dhabi (Tawtheeq) untuk izin tinggal tanggungan (Deloitte, sekunder).',
      bring: [{ id: 'tawtheeq', text: 'Sertifikat kontrak sewa Tawtheeq atas nama Anda', copies: 'PDF' }, { id: 'bill', text: 'Tagihan air/listrik (ADDC atau AADC) alamat tersebut', copies: 'PDF' }],
      cost: c(0, 0, 'AED', true, 'Biaya pendaftaran Tawtheeq dan deposit sewa berbeda per properti; tidak ada angka resmi yang terbaca.'), payer: 'self', needs: ['sp-salary'], days: { min: 3, max: 14 }, est: true, time: 'Tergantung menemukan rumah; pendaftaran beberapa hari', sources: [ICP_RES, DELOITTE] },
    { id: 'sp-insurance', who: 'sponsor', land: 'ae', phase: 'sponsor', title: 'Asuransi kesehatan istri dan setiap anak', issuer: 'Perusahaan asuransi berizin DoH Abu Dhabi', where: { name: 'Lewat HR (polis perusahaan) atau perusahaan asuransi' },
      why: 'ICP mencantumkan asuransi kesehatan yang berlaku sebagai dokumen wajib entry permit dan izin tinggal. DoH mendenda AED 300 per bulan bila tidak diasuransikan.',
      bring: [{ id: 'policy', text: 'Kartu/polis asuransi per orang (istri, anak 1, anak 2, ...)', copies: 'PDF per orang' }],
      cost: c(0, 0, 'AED', true, 'Siapa yang membayar untuk tanggungan bertentangan: pengumuman DoH 2016 menyebut karyawan membayar 50 persen premi tanggungan; pengumuman DoH 2021 dan u.ae menyebut pemberi kerja dan sponsor. Tanyakan HR polis apa yang ditanggung.'), payer: 'either', needs: ['sp-resident'], days: { min: 1, max: 5 }, est: true, time: 'Beberapa hari (perkiraan)', sources: [ICP_RES] },
    { id: 'sp-entry', who: 'sponsor', land: 'ae', phase: 'sponsor', title: 'Ajukan entry permit keluarga di ICP (per orang)', issuer: 'ICP (Federal Authority for Identity, Citizenship, Customs and Port Security)', where: { name: 'ICP Smart Services atau aplikasi UAE ICP, masuk dengan UAE Pass', online: ICP_VISA },
      why: 'Istri dan anak masuk UAE dengan entry permit tujuan izin tinggal keluarga. Entry permit berlaku 60 hari untuk masuk (bisa diperpanjang).',
      bring: [{ id: 'pass', text: 'Scan paspor istri dan setiap anak (berlaku minimal 6 bulan)', copies: 'per orang' }, { id: 'photo', text: 'Foto latar putih istri dan setiap anak', copies: 'per orang' }, { id: 'nikah', text: 'Buku nikah yang sudah dilegalisasi sampai Kedutaan UAE', copies: 'scan' }, { id: 'akta', text: 'Akta kelahiran setiap anak yang sudah dilegalisasi', copies: 'scan per anak' }, { id: 'ins', text: 'Asuransi per orang', copies: 'PDF' }, { id: 'salary', text: 'Surat gaji dan kontrak sewa Tawtheeq', copies: 'PDF' }, { id: 'sponsor', text: 'Paspor, izin tinggal dan Emirates ID Anda (sponsor)', copies: 'scan' }],
      cost: c(300, 800, 'AED', true, 'Per orang. Halaman ICP: biaya permohonan 100, penerbitan 100, layanan pintar 100 (tidak berlabel per kategori). Law Reporters (sekunder, Agustus 2024, Abu Dhabi) menyebut juga deposit AED 5.025; ICP hanya mencantumkan "biaya deposit 20". Tidak bisa dipastikan: lihat layar pembayaran ICP.'),
      payer: 'self', per: 'head', needs: ['sp-resident', 'sp-salary', 'sp-tenancy', 'sp-insurance', 'w-nikah-uae', 'c-akta-uae', 'w-passport', 'c-passport'], days: { min: 2, max: 5 }, time: 'ICP: 2 hari kerja per layanan', sources: [ICP_VISA, ICP_RES, LAWREP] },

    // ---------- wife (in Indonesia) ----------
    { id: 'w-passport', who: 'wife', land: 'id', phase: 'wife', title: 'Paspor istri berlaku lebih dari 6 bulan', issuer: 'Kantor Imigrasi', where: { name: 'Kantor Imigrasi terdekat, jadwal lewat M-Paspor', online: 'https://www.imigrasi.go.id' },
      why: 'ICP mensyaratkan paspor berlaku tidak kurang dari 6 bulan. Karena izin tinggal mengikuti paspor, lebih aman bila masih berlaku lebih dari 1 tahun.',
      bring: [{ id: 'ktp', text: 'e-KTP asli', copies: '1 asli' }, { id: 'kk', text: 'Kartu Keluarga asli', copies: '1 asli' }, { id: 'old', text: 'Paspor lama (bila perpanjangan)', copies: '1 asli' }, { id: 'id2', text: 'Paspor pertama kali: akta kelahiran, ijazah, atau buku nikah sebagai bukti identitas', copies: '1 asli' }],
      cost: c(650000, 950000, 'IDR', true, 'e-paspor: Rp 650.000 (halaman Imigrasi Yogyakarta, angka 2022), Rp 950.000 (berita 2025, PP 45/2024). M-Paspor menampilkan angka pasti sebelum bayar.'), payer: 'self', needs: [], days: { min: 4, max: 14 }, time: '4 hari kerja setelah berkas lengkap (Imigrasi), ditambah antre jadwal', sources: [IMI_ANAK, IMI_BARU, ICP_RES] },
    { id: 'w-nikah-kua', who: 'wife', land: 'id', phase: 'wife', title: 'Legalisir 3 fotokopi buku nikah di KUA kecamatan tempat menikah', issuer: 'KUA Kecamatan yang menerbitkan buku nikah', where: { name: 'KUA Kecamatan tempat akad nikah dulu' },
      why: 'Kemenag pusat mensyaratkan 3 fotokopi buku nikah yang sudah dilegalisir KUA kecamatan penerbit. Tanpa ini berkas ditolak di loket Kemenag.',
      bring: [{ id: 'orig', text: 'Buku nikah asli suami dan istri', copies: '2 asli' }, { id: 'fc', text: 'Fotokopi buku nikah untuk dilegalisir', copies: '3 lembar' }, { id: 'ktp', text: 'Fotokopi KTP suami dan istri', copies: '1 per orang' }],
      cost: c(0, 0, 'IDR', true, 'Tarif KUA untuk legalisir fotokopi tidak tercantum di halaman resmi.'), payer: 'self', needs: [], days: { min: 1, max: 3 }, est: true, time: 'Biasanya hari itu juga (perkiraan)', sources: [KEMENAG] },
    { id: 'w-nikah-kemenag', who: 'wife', land: 'id', phase: 'wife', title: 'Legalisasi buku nikah di Kemenag pusat (Ditjen Bimas Islam)', issuer: 'Kementerian Agama, Ditjen Bimas Islam', where: { name: 'Petugas legalisasi dokumen nikah, Ditjen Bimas Islam', address: 'Gedung Kementerian Agama, Jl. M.H. Thamrin No. 6, Jakarta Pusat, lantai 9', hours: 'Pengaduan: call center 146, WhatsApp 0811-1068-3146', online: KEMENAG },
      why: 'Tanda tangan pejabat di buku nikah disahkan Kemenag sebelum Kemenkum. Isi formulir di loket, petugas memeriksa keabsahan, lalu buku nikah dilegalisir. Karena suami di luar negeri, istri bisa mengurus dengan surat kuasa dari suami.',
      bring: [{ id: 'orig', text: 'Buku nikah asli suami dan istri', copies: '2 asli' }, { id: 'ktp', text: 'Fotokopi KTP atau surat keterangan domisili suami dan istri', copies: '1 per orang' }, { id: 'fc', text: 'Fotokopi buku nikah yang sudah dilegalisir KUA kecamatan', copies: '3 lembar' }, { id: 'kuasa', text: 'Surat kuasa bermeterai dari suami (bila istri yang datang sendiri), dengan fotokopi KTP pemberi dan penerima kuasa', copies: '1 asli' }, { id: 'form', text: 'Formulir pendaftaran legalisasi (diisi di loket)', copies: '1' }],
      cost: c(0, 0, 'IDR', false, 'Kemenag: tidak dipungut biaya.'), payer: 'self', needs: ['w-nikah-kua'], days: { min: 1, max: 3 }, time: 'Pemeriksaan 30 menit sampai 3 hari (standar layanan Kemenag)',
      notes: 'Buku nikah asli nanti diserahkan ke Kedutaan UAE dan dikembalikan berstempel. Simpan fotokopi berlegalisir untuk urusan di Indonesia.', sources: [KEMENAG] }
  ]
  steps = steps.concat(chain('w-nikah', 'wife', 'buku nikah', ['w-nikah-kemenag']))
  steps.push(
    { id: 'w-nikah-uae', who: 'wife', land: 'id', phase: 'wife', title: 'Pengesahan Kedutaan UAE (buku nikah dan akta anak, satu permohonan)', issuer: 'UAE Embassy Jakarta dan MoFA UAE', where: EMB,
      why: 'Satu permohonan digital mencakup pengesahan Kedutaan UAE di Jakarta dan MoFA UAE sekaligus. Maksimal 3 dokumen per permohonan (buku nikah + 2 akta anak muat dalam satu permohonan). Suami bisa mengajukan dari UAE dengan UAE Pass, istri menyerahkan dokumen asli ke VFS/BLS atau kurir.',
      bring: [{ id: 'orig', text: 'Dokumen asli yang sudah berstiker Kemlu (buku nikah, akta kelahiran tiap anak), tidak dilaminasi', copies: '1 asli per dokumen' }, { id: 'copy', text: 'Fotokopi tiap dokumen', copies: '1' }, { id: 'pass', text: 'Fotokopi paspor pemohon', copies: '1' }, { id: 'receipt', text: 'Bukti bayar dari portal MoFA (dicetak)', copies: '1' }, { id: 'awb', text: 'Airway bill kurir (dicetak) bila dokumen dijemput kurir', copies: '1' }, { id: 'sep', text: 'Setiap dokumen didaftarkan sendiri-sendiri di permohonan (tidak digabung)', copies: 'cek' }],
      cost: c(300, 300, 'AED', true, 'Per dokumen. Halaman resmi tidak menampilkan tarif; potongan pencarian menyebut AED 150 Kedutaan + AED 150 MoFA. Ditambah biaya layanan VFS/BLS dan kurir (tidak kembali bila ditolak).'),
      payer: 'self', per: 'doc', needs: ['w-nikah-kemlu', 'c-akta-kemlu'], days: { min: 3, max: 7 }, time: 'MoFA: 3-7 hari kerja lewat kurir; kurir ambil dalam 24 jam, antar 24-48 jam', sources: [MOFA_JKT, MOFA_ATT] },
    { id: 'w-translate', who: 'wife', land: 'ae', phase: 'wife', title: 'Terjemahan Arab buku nikah dan akta (bila diminta)', issuer: 'Penerjemah hukum berlisensi di UAE', where: { name: 'Kantor penerjemah hukum berlisensi (legal translation) di Abu Dhabi' },
      why: 'MoFA menerima dokumen berbahasa Arab atau Inggris, atau dengan terjemahan tersumpah. Sumber sekunder menyebut terjemahan Arab untuk buku nikah. Tanyakan ke JakartaCVO@mofa.gov.ae sebelum membayar penerjemah di Indonesia.',
      bring: [{ id: 'att', text: 'Dokumen yang sudah disahkan Kedutaan/MoFA', copies: 'scan' }],
      cost: c(100, 200, 'AED', true, 'Perkiraan per dokumen; tidak ada tarif resmi.'), payer: 'self', needs: ['w-nikah-uae'], days: { min: 1, max: 3 }, est: true, time: '1-3 hari (perkiraan)', sources: [MOFA_ATT] }
  )

  // ---------- each child (repeated per child on the page) ----------
  steps.push(
    { id: 'c-akta-check', who: 'child', land: 'id', phase: 'child', title: 'Cek kutipan akta kelahiran (nama dan tanggal sama dengan KK dan paspor)', issuer: 'Dukcapil', where: { name: 'Disdukcapil kabupaten/kota' },
      why: 'Kemenkum mencocokkan tanda tangan pejabat penerbit, dan ICP memakai akta untuk membuktikan usia anak. Nama atau tanggal yang beda dengan paspor membuat dokumen ditolak; perbaiki di Dukcapil dulu.',
      bring: [{ id: 'akta', text: 'Kutipan akta kelahiran asli', copies: '1 asli' }, { id: 'kk', text: 'Kartu Keluarga', copies: '1' }, { id: 'ktp', text: 'KTP ayah dan ibu', copies: '1 per orang' }],
      cost: c(0, 0, 'IDR', true, 'Kutipan Dukcapil umumnya gratis (belum diverifikasi dari halaman resmi).'), payer: 'self', needs: [], days: { min: 0, max: 7 }, est: true, time: 'Hari itu juga bila sudah benar', sources: [ICP_RES, MOFA_JKT] },
    { id: 'c-passport', who: 'child', land: 'id', phase: 'child', title: 'Paspor anak (M-Paspor), dengan pernyataan kedua orang tua', issuer: 'Kantor Imigrasi', where: { name: 'Kantor Imigrasi domisili, jadwal lewat M-Paspor (anak 5 tahun ke bawah boleh datang langsung)' },
      why: 'Imigrasi mensyaratkan surat pernyataan kedua orang tua yang bertanggung jawab atas paspor anak. Karena ayah di luar negeri: ayah menandatangani pernyataan (dan surat kuasa) dengan tinta basah lalu mengirimnya. Telepon kantor Imigrasi dulu: apakah pernyataan dari luar negeri diterima, perlu legalisasi atau tidak, dan apakah ibu boleh datang sendiri.',
      bring: [{ id: 'ktp', text: 'e-KTP ayah dan ibu (asli + fotokopi)', copies: '1 per orang' }, { id: 'kk', text: 'Kartu Keluarga (asli + fotokopi)', copies: '1' }, { id: 'akta', text: 'Akta kelahiran anak (asli + fotokopi)', copies: '1' }, { id: 'nikah', text: 'Buku nikah (asli + fotokopi)', copies: '1' }, { id: 'pass', text: 'Fotokopi paspor ayah dan ibu', copies: '1 per orang' }, { id: 'state', text: 'Surat pernyataan orang tua bermeterai, ditandatangani ayah dan ibu', copies: '1 asli' }, { id: 'kuasa', text: 'Surat kuasa bermeterai dari ayah (bila diminta kantor)', copies: '1 asli' }],
      cost: c(350000, 950000, 'IDR', true, 'Angka bertentangan: Rp 350.000 biasa / Rp 650.000 e-paspor (Imigrasi Yogyakarta, 2022) dan Rp 950.000 (berita 2025). Paspor anak berlaku 5 tahun. M-Paspor menampilkan angka pasti.'),
      payer: 'self', needs: ['c-akta-check'], days: { min: 4, max: 14 }, time: '4 hari kerja setelah berkas lengkap, ditambah antre jadwal', sources: [IMI_ANAK] }
  )
  steps = steps.concat(chain('c-akta', 'child', 'akta kelahiran', ['c-akta-check']))
  steps.push(
    { id: 'c-akta-uae', who: 'child', land: 'id', phase: 'child', title: 'Akta kelahiran disahkan Kedutaan UAE', issuer: 'UAE Embassy Jakarta dan MoFA UAE', where: EMB,
      why: 'Diajukan bersama buku nikah (langkah istri: pengesahan Kedutaan UAE). Centang di sini bila akta anak ini sudah kembali dari Kedutaan.',
      bring: [{ id: 'orig', text: 'Akta kelahiran asli berstiker Kemlu', copies: '1 asli' }],
      cost: c(0, 0, 'AED', false, 'Biaya terhitung di langkah pengesahan Kedutaan UAE (istri).'), payer: 'self', needs: ['c-akta-kemlu'], days: { min: 0, max: 0 }, time: 'Bersama langkah istri', sources: [MOFA_JKT] },
    { id: 'c-school-ask', who: 'child', land: 'ae', phase: 'child', school: true, title: 'Pilih sekolah di Abu Dhabi dan minta daftar dokumennya secara tertulis', issuer: 'Sekolah tujuan (aturan ADEK)', where: { name: 'Bagian penerimaan sekolah tujuan' },
      why: 'ADEK menetapkan minimal, tetapi setiap sekolah punya daftar sendiri. Tanyakan tertulis: perlu rapor dan surat pindah disahkan Kedutaan atau tidak, dan dalam bahasa apa.',
      bring: [{ id: 'list', text: 'Email jawaban sekolah tentang dokumen yang diminta', copies: '1' }],
      cost: c(0, 0, 'AED', false), payer: 'self', needs: [], days: { min: 2, max: 10 }, est: true, time: 'Tergantung sekolah', sources: [ADEK] },
    { id: 'c-school-docs', who: 'child', land: 'id', phase: 'child', school: true, title: 'Rapor terakhir dan surat pindah (Transfer Certificate) dari sekolah asal', issuer: 'Sekolah asal (dan Dinas Pendidikan bila perlu disahkan)', where: { name: 'Sekolah asal, lalu Dinas Pendidikan kabupaten/kota' },
      why: 'ADEK: untuk masuk kelas 2 ke atas, dan juga kelas 1 bila pindah di tengah tahun ajaran, wajib laporan hasil belajar dan Transfer Certificate yang menyebut kelas terakhir yang SELESAI; penempatan kelas mengikuti itu. Penyetaraan (equivalency) hanya untuk SMA kelas 10-12, tidak untuk SD.',
      bring: [{ id: 'rapor', text: 'Rapor terakhir, ditandatangani dan distempel kepala sekolah', copies: '1 asli + 2 salinan' }, { id: 'tc', text: 'Surat keterangan pindah / Transfer Certificate, menyebut kelas terakhir yang selesai', copies: '1 asli + 2 salinan' }, { id: 'en', text: 'Versi bahasa Inggris dari sekolah atau terjemahan tersumpah', copies: '1' }],
      cost: c(0, 0, 'IDR', true, 'Rantai pengesahan rapor (Dinas, Kemenkum, Kemlu, Kedutaan) TIDAK disebut sumber resmi; jalankan hanya bila sekolah tujuan memintanya.'), payer: 'self', needs: ['c-school-ask'], days: { min: 2, max: 14 }, est: true, time: 'Tergantung sekolah dan Dinas', sources: [ADEK] },
    { id: 'c-vaccine', who: 'child', land: 'id', phase: 'child', title: 'Catatan imunisasi dalam bahasa Inggris', issuer: 'Puskesmas atau rumah sakit/klinik', where: { name: 'Puskesmas atau rumah sakit dengan layanan internasional' },
      why: 'ADEK: perawat sekolah membuat berkas kesehatan sesuai DoH untuk murid dari luar UAE; DoH melengkapi vaksin (mis. MMR dan cacar air 2 dosis) bila tidak ada catatan. Tidak ada aturan resmi yang mewajibkan terjemahan atau legalisasi.',
      bring: [{ id: 'kia', text: 'Buku KIA / kartu imunisasi asli', copies: '1 asli' }, { id: 'cert', text: 'Surat keterangan imunisasi berbahasa Inggris (nama vaksin dan tanggal) yang ditandatangani dokter', copies: '1 asli + 1 salinan' }],
      cost: c(0, 300000, 'IDR', true, 'Puskesmas umumnya gratis (sekunder); rumah sakit menetapkan tarif sendiri.'), payer: 'self', needs: [], days: { min: 1, max: 5 }, est: true, time: 'Hari itu sampai beberapa hari', sources: [ADEK, DOH_EPI] }
  )

  // ---------- travel and arrival (family) ----------
  steps.push(
    { id: 'f-flight', who: 'family', land: 'id', phase: 'family', title: 'Tiket pesawat Jakarta - Abu Dhabi, dalam 60 hari masa entry permit', issuer: 'Maskapai', where: { name: 'Etihad satu-satunya penerbangan langsung CGK-AUH (sekunder); cek bagasi di e-tiket' },
      why: 'Entry permit harus dipakai masuk dalam 60 hari sejak terbit. Setelah masuk, izin tinggal harus selesai dalam 60 hari; lewat dari itu denda AED 50 per hari.',
      bring: [{ id: 'ep', text: 'Entry permit istri dan setiap anak, dicetak', copies: '2 salinan per orang' }, { id: 'pass', text: 'Paspor istri dan setiap anak', copies: 'asli' }, { id: 'dad', text: 'Salinan paspor, Emirates ID dan surat pernyataan ayah (berjaga-jaga; tidak ada aturan resmi yang mewajibkan)', copies: '1' }, { id: 'docs', text: 'Semua dokumen asli yang sudah disahkan, dalam map di tas kabin', copies: 'asli' }],
      cost: c(0, 0, 'IDR', true, 'Harga tiket berubah; isi biaya nyata di kolom catatan.'), payer: 'self', needs: ['sp-entry'], days: { min: 1, max: 14 }, est: true, time: 'Tergantung jadwal', sources: [ICP_VISA] },
    { id: 'f-medical', who: 'family', land: 'ae', phase: 'family', title: 'Tes kesehatan (medical fitness) istri: pemeriksaan fisik, tes darah, rontgen dada', issuer: 'SEHA Disease Prevention and Screening Centre', where: { name: 'Pusat skrining SEHA di Abu Dhabi (rontgen dada TB)' },
      why: 'ICP mencantumkan laporan medis. Standar skrining visa DoH Abu Dhabi: pemeriksaan klinis, tes darah (antara lain HIV dan Hepatitis B) dan rontgen dada untuk TB. Hanya yang berusia 18 tahun ke atas yang dites (u.ae dan Gulf News); anak di bawah 18 tidak perlu.',
      bring: [{ id: 'pass', text: 'Paspor dan entry permit istri', copies: 'asli' }, { id: 'photo', text: 'Foto latar putih istri', copies: '2 lembar' }],
      cost: c(250, 700, 'AED', true, 'Perkiraan; tarif resmi SEHA tidak terbaca.'), payer: 'self', needs: ['f-flight'], days: { min: 1, max: 3 }, time: 'Hasil 24-48 jam (Gulf News, sekunder)', sources: [ICP_RES, DOH_VS, GN_MED] },
    { id: 'f-residence', who: 'family', land: 'ae', phase: 'family', title: 'Izin tinggal dan Emirates ID istri dan anak (biometrik)', issuer: 'ICP', where: { name: 'ICP Smart Services / TAMM, lalu pusat layanan ICP untuk sidik jari', online: ICP_RES },
      why: 'Izin tinggal keluarga diterbitkan bersama permohonan Emirates ID. Harus selesai dalam 60 hari sejak masuk. Sidik jari dan tanda tangan di pusat layanan ICP hanya untuk yang sudah berusia 15 tahun; anak SD tidak perlu datang untuk biometrik.',
      bring: [{ id: 'medical', text: 'Hasil medical istri', copies: 'digital' }, { id: 'ins', text: 'Asuransi per orang', copies: 'digital' }, { id: 'pass', text: 'Paspor istri dan anak', copies: 'asli' }, { id: 'photo', text: 'Foto latar putih per orang', copies: 'digital' }, { id: 'reuse', text: 'Bukti hubungan keluarga, surat kerja dan tagihan listrik/air yang sama dengan entry permit', copies: 'PDF' }],
      cost: c(300, 1200, 'AED', true, 'Per orang. ICP: permohonan 100 + penerbitan izin tinggal per tahun 100 + layanan pintar 100; Emirates ID terpisah. Angka sekunder berbeda jauh (lihat catatan entry permit).'), payer: 'self', per: 'head', needs: ['f-medical'], days: { min: 2, max: 14 }, time: 'ICP 2 hari kerja; kartu dikirim kurir', sources: [ICP_RES, ICP_EID] },
    { id: 'f-school', who: 'family', land: 'ae', phase: 'family', school: true, title: 'Daftarkan anak di sekolah', issuer: 'Sekolah tujuan (aturan ADEK)', where: { name: 'Sekolah tujuan' },
      why: 'ADEK: akta kelahiran, paspor anak, Emirates ID (anak dari luar UAE boleh menyusul dengan surat pernyataan), paspor dan bukti izin tinggal orang tua.',
      bring: [{ id: 'akta', text: 'Akta kelahiran (yang disahkan)', copies: 'asli + salinan' }, { id: 'pass', text: 'Paspor anak', copies: 'salinan' }, { id: 'eid', text: 'Emirates ID anak, atau surat pernyataan menyusul', copies: 'salinan' }, { id: 'parents', text: 'Paspor dan izin tinggal ayah dan ibu', copies: 'salinan' }, { id: 'tc', text: 'Rapor dan Transfer Certificate', copies: 'asli' }, { id: 'vac', text: 'Catatan imunisasi', copies: 'asli' }, { id: 'form', text: 'Formulir pendaftaran sekolah', copies: '1' }, { id: 'consent', text: 'Persetujuan layanan kesehatan sekolah yang ditandatangani orang tua', copies: '1' }],
      cost: c(0, 0, 'AED', true, 'Uang sekolah tergantung sekolah.'), payer: 'self', needs: ['f-flight', 'c-school-docs', 'c-vaccine'], days: { min: 2, max: 14 }, est: true, time: 'Tergantung sekolah', sources: [ADEK] }
  )

  // the entry permit is filed once the papers from Indonesia are back: list it after the wife and child steps
  var entry = steps.filter(function (x) { return x.id === 'sp-entry' })[0]
  steps = steps.filter(function (x) { return x !== entry })
  steps.splice(steps.map(function (x) { return x.id }).indexOf('f-flight'), 0, entry)
  // one Embassy application carries the marriage book and the children's birth certificates: after both Kemlu steps
  var emb = steps.filter(function (x) { return x.id === 'w-nikah-uae' || x.id === 'w-translate' })
  steps = steps.filter(function (x) { return emb.indexOf(x) < 0 })
  Array.prototype.splice.apply(steps, [steps.map(function (x) { return x.id }).indexOf('c-akta-uae'), 0].concat(emb))

  // PRD-59C §3: child steps are repeated per child. A child step needing a child step needs the SAME child's; any other
  // step needing a child step needs it for EVERY child that has it. Ids become '<id>-<k>' (k = 1..n), titles carry the
  // child's name. School stage decides the school steps (ADEK policy 1.5.2): 'pre' = not yet at school (no school
  // steps), 'g1' = entering Grade 1 (school chosen, no Transfer Certificate), 'g2' = Grade 2 or above (all).
  var STAGES = [{ id: 'g2', title: 'Kelas 2 ke atas' }, { id: 'g1', title: 'Masuk kelas 1' }, { id: 'pre', title: 'Belum sekolah' }]
  var SKIP = { pre: { 'c-school-ask': 1, 'c-school-docs': 1 }, g1: { 'c-school-docs': 1 }, g2: {} }
  function kidOf(x, k) {
    var o = typeof x === 'string' ? { name: x } : Object.assign({}, x || {})
    o.name = String(o.name || '').trim().slice(0, 24) || ('Anak ' + (k + 1)); if (!SKIP[o.stage]) o.stage = 'g2'
    return o
  }
  function build(list) {
    var kids = (list && list.length ? list : ['Anak 1']).slice(0, 6).map(kidOf), isKid = {}, out = []
    steps.forEach(function (x) { if (x.who === 'child') isKid[x.id] = 1 })
    var has = function (base, k) { return !SKIP[kids[k].stage][base] }
    var fan = function (n) { return isKid[n] ? kids.map(function (_, k) { return has(n, k) ? n + '-' + (k + 1) : null }).filter(Boolean) : [n] }
    steps.forEach(function (x) {
      if (!isKid[x.id]) {
        var needs = (x.needs || []).reduce(function (a, n) { return a.concat(fan(n)) }, [])
        if (x.school && !kids.some(function (kd) { return kd.stage !== 'pre' })) return
        // a fee charged per person (wife + each child) or per document (marriage book + each birth certificate)
        var times = x.per ? 1 + kids.length : 1, cost = x.cost
        if (times > 1) cost = Object.assign({}, x.cost, { min: x.cost.min * times, max: x.cost.max * times, note: 'Total untuk ' + times + (x.per === 'doc' ? ' dokumen' : ' orang') + ' (' + x.cost.min.toLocaleString('id-ID') + (x.cost.min !== x.cost.max ? '-' + x.cost.max.toLocaleString('id-ID') : '') + ' ' + x.cost.cur + ' masing-masing). ' + x.cost.note })
        out.push(Object.assign({}, x, { needs: needs, cost: cost }))
        return
      }
      kids.forEach(function (kd, k) {
        if (!has(x.id, k)) return
        out.push(Object.assign({}, x, { id: x.id + '-' + (k + 1), base: x.id, kid: k + 1, phase: 'child-' + (k + 1), title: x.title + ' (' + kd.name + ')',
          needs: (x.needs || []).filter(function (n) { return !isKid[n] || has(n, k) }).map(function (n) { return isKid[n] ? n + '-' + (k + 1) : n }) }))
      })
    })
    var phases = [{ id: 'sponsor', title: 'Saya (sponsor, di Abu Dhabi)' }, { id: 'wife', title: 'Istri (di Indonesia)' }]
      .concat(kids.map(function (kd, k) { return { id: 'child-' + (k + 1), title: kd.name } }))
      .concat([{ id: 'family', title: 'Berangkat dan tiba bersama' }])
    return { checked: AS, fx: FX, phases: phases, steps: out, glossary: GLOSSARY, conflicts: api.conflicts, kids: kids }
  }

  var api = {
    checked: AS, build: build, glossary: GLOSSARY, stages: STAGES,
    who: [{ id: 'sponsor', title: 'Saya (sponsor, di Abu Dhabi)' }, { id: 'wife', title: 'Istri (di Indonesia)' }, { id: 'child', title: 'Anak' }, { id: 'family', title: 'Berangkat dan tiba bersama' }],
    steps: steps,
    conflicts: [
      'Biaya entry permit dan izin tinggal per orang: ICP (100 + 100 + 100) berbeda dengan sumber sekunder (Law Reporters; Gulf News). Pastikan di layar pembayaran ICP.',
      'Deposit untuk sponsor keluarga: ICP tidak menyebut angka; Law Reporters menyebut AED 5.025.',
      'Terjemahan Arab buku nikah: MoFA menerima Inggris; sumber sekunder menyebut Arab. Tanyakan JakartaCVO@mofa.gov.ae.',
      'Siapa membayar asuransi tanggungan: DoH 2016 (karyawan 50 persen) vs DoH 2021 / u.ae (pemberi kerja dan sponsor).',
      
      'Paspor anak saat ayah di luar negeri: aturan tertulis tidak membahas; tanyakan kantor Imigrasi.'
    ]
  }
  root.UAEFamily = api
  if (typeof module !== 'undefined' && module.exports) module.exports = api
})(typeof window !== 'undefined' ? window : globalThis)
