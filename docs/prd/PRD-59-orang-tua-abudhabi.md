# PRD-59 Orang Tua: Pindah ke Abu Dhabi + Latihan Ujian SIM Abu Dhabi

Owner, 2026-11-28: "Pada dunia emosi, buat di hal paling awal itu menu landing page relocation to abudhabi. Deep
research kelengkapan yg dibutuhkan bener2 detail sampai berapa lembar dan biaya yg diperlukan jadi bisa saya pakai utk
checklist dan urutannya dan ada lokasinya yg misal harus ke kemenlu itu ada dimana dokumen, harus sangat comprehensive
dan lengkap dan estimasi biaya masing2 jadi saya bisa prepare uangnya ... dan ada lagi apps utk simulasi ujian SIM agar
saya sebagai orang indo bisa latihan ujian sim, harus sangat accurate presisi dan valid dan update ... jadi ada 2 menu
ya dan harus bisa di save".

## 1. Keputusan owner (2026-11-28)
- Profil: **owner sendiri, visa kerja** yang disponsori pemberi kerja di Abu Dhabi (tanpa keluarga ikut).
- Letak (owner, diperjelas 2026-11-28: "Di menu paling awal ... ada tombol relocation to UAE. Saat di klik ada 2 menu
  landing page yg kelengkapan dokument dan yg sim preparation"): **satu tombol "Relocation to UAE"** di halaman paling
  awal Dunia Emosi (baris kecil "Orang Tua" di bawah tombol main). Tombol membuka **landing page**
  `games/relokasi-uae.html` dengan **dua menu**: "Kelengkapan Dokumen" dan "Persiapan SIM".
- Latihan SIM: **bahasa Indonesia + teks Inggris asli** di setiap soal, dan satu mode "Inggris saja" seperti ujian
  sebenarnya.

## 1b. PRD rinci per menu (owner 2026-11-28: "panduan utama dan satu2nya ... ada status progressnya per masing2 ...
Rancang detail PRD masing2 PRD UIUX, system, skema dll. WF engine semuanya masing2")
- `PRD-59A-kelengkapan-dokumen.md`: UI/UX, sistem, skema data + simpanan, mesin alur kerja (status per langkah dan per
  item bawaan, ketergantungan, langkah berikutnya, uang), hukum L2/L3/L6/L8/L9, status progres.
- `PRD-59B-persiapan-sim.md`: UI/UX, sistem, skema bank soal + simpanan, mesin kuis (Leitner per soal, status per
  topik, kesiapan ujian, susun ujian), alur SIM berstatus, hukum L3/L4/L5/L6/L10, status progres.
- Bagian 2 di bawah adalah ringkasan; bila berbeda, PRD-59A/59B yang berlaku.

## 2. Dua halaman baru
### 2.1 `games/pindah-abudhabi.html` (menu "Pindah ke Abu Dhabi")
- Daftar periksa berurutan per fase: (1) Persiapan di Indonesia, (2) Legalisasi dokumen, (3) Berangkat,
  (4) Setelah tiba di Abu Dhabi. Setiap langkah: dokumen, penerbit, lokasi + alamat lengkap + tautan peta, yang harus
  dibawa (jumlah asli / fotokopi / lembar), waktu proses, biaya (IDR atau AED, tanggal berlaku, sumber), siapa yang
  biasanya membayar (owner / pemberi kerja), dan catatan.
- Ketergantungan terlihat: langkah yang menunggu langkah lain ditandai ("butuh langkah 4 dulu").
- Ringkasan uang: total perkiraan rendah-tinggi per fase dan keseluruhan; kolom "biaya sebenarnya" yang diisi owner;
  kurs AED->IDR yang bisa diubah owner (default ditulis dengan tanggal).
- Status per langkah: belum / sedang / selesai, catatan bebas, tanggal selesai.
- **Simpan**: otomatis di perangkat (localStorage, kunci sendiri, bukan per anak); tombol "Unduh cadangan" (file
  JSON) dan "Pulihkan dari cadangan"; tombol "Cetak / PDF" (tata letak cetak rapi, satu langkah per blok).
- Setiap angka yang belum terkonfirmasi dari sumber resmi diberi label "Perkiraan" dengan alasannya; setiap langkah
  punya tautan sumber dan tanggal cek.

### 2.2 `games/ujian-sim-abudhabi.html` (menu "Latihan Ujian SIM")
- Alur resmi SIM Abu Dhabi untuk pemegang SIM Indonesia (bisa ditukar langsung atau harus kursus; tahapan, jam
  pelajaran, biaya per tahap) sebagai halaman "Alur & biaya" dengan daftar periksa yang tersimpan.
- Bank soal teori disusun dari aturan resmi UAE / Abu Dhabi (UU Lalu Lintas Federal No. 14/2024, buku panduan,
  rambu): setiap soal punya teks Indonesia, teks Inggris, 3-4 pilihan, jawaban, penjelasan singkat, sumber + tanggal.
  Bukan bank soal resmi (tidak dipublikasikan); halaman menyatakannya dengan jujur.
- Mode: Latihan per topik (rambu, prioritas jalan, kecepatan, bundaran, jalur, parkir, cuaca, darurat, denda & black
  points), Ujian simulasi (jumlah soal, batas waktu dan nilai lulus sesuai format resmi yang terverifikasi), Ulang soal
  yang salah, mode bahasa (ID+EN / EN saja).
- **Simpan**: riwayat ujian (tanggal, nilai, lulus/tidak), soal yang salah, kemajuan per topik; cadangan JSON.

### 2.3 Halaman pertama dan landing page
- Halaman pertama, di bawah `.home-buttons`: label kecil "Orang Tua" dan **satu** tombol "Relocation to UAE" (ikon
  gambar, bukan emoji bawaan), sentuh >= 48 px, kontras >= 4.5, tidak menutupi kereta / dekorasi.
- `games/relokasi-uae.html`: judul, ringkasan kemajuan kedua menu (langkah dokumen selesai x/y, uang disiapkan,
  ujian latihan terakhir + nilai), dua kartu besar "Kelengkapan Dokumen" -> `pindah-abudhabi.html` dan "Persiapan SIM"
  -> `ujian-sim-abudhabi.html`, tombol kembali ke Dunia Emosi.

## 3. Hukum (merah dulu, lalu hijau)
- L1 Halaman pertama punya tombol "Relocation to UAE", terlihat tanpa menggulir di 390x844, 844x390 dan 800x1280,
  target >= 48 px, membuka landing page; landing page punya dua menu yang membuka halaman yang benar dan menampilkan
  kemajuan tersimpan keduanya (merah: belum ada).
- L2 Data relokasi: setiap langkah punya penerbit, lokasi, bawaan, biaya (angka + mata uang + tanggal) dan >= 1 URL
  sumber; urutan ketergantungan tidak melingkar dan setiap langkah yang ditunggu muncul lebih dulu; jumlah ringkasan
  = jumlah per langkah (uji node).
- L3 Simpan: mencentang langkah, mengisi biaya sebenarnya dan catatan bertahan setelah muat ulang; cadangan JSON
  diunduh lalu dipulihkan di profil bersih memberi keadaan yang sama (uji browser).
- L4 Bank soal: setiap soal punya teks ID dan EN, tepat satu jawaban benar di antara pilihan, penjelasan, sumber +
  tanggal; tidak ada soal kembar; setiap topik >= 10 soal (uji node).
- L5 Ujian simulasi memakai jumlah soal / waktu / nilai lulus yang tercatat di data beserta sumbernya; menyelesaikan
  ujian menyimpan riwayat; soal salah masuk daftar ulang (uji browser).
- L6 Kedua halaman: 0 error halaman, 0 emoji bawaan sebagai gambar, tanpa geser horizontal di 390 px, cetak/PDF
  berisi semua langkah (uji browser + foto dilihat).
- L7 Tidak ada regresi: qa-app-sweep (halaman dienumerasi dari folder), qa-local-refs, manifest offline, audit-no-emoji.

## 4. Batas jujur
- Biaya dan aturan berubah; setiap angka membawa tanggal dan sumber, dan halaman menampilkan "dicek per <tanggal>".
- Biaya yang dibayar pemberi kerja berbeda per perusahaan; ditampilkan sebagai "biasanya dibayar pemberi kerja".
- Bank soal latihan bukan bank soal resmi; disusun dari aturan dan rambu resmi.

## 5. Hasil riset (2026-11-28; sumber per langkah dan per soal ada di data)
### 5.1 Dokumen (PRD-59A, `uae-docs-data.js`)
- UAE bukan anggota Konvensi Apostille (status HCCH). Rantai ijazah dan transkrip tetap: kampus, Kementerian Hukum
  (AHU, legalisasi biasa, bukan Apostille), Kemlu (Jl. Taman Pejambon 6, Senin-Kamis 08.30-15.30 sejak 13 April 2026),
  lalu satu permohonan digital MOFA UAE (atestasi Kedutaan + MOFA, lewat UAE Pass, serah dokumen di VFS atau BLS).
- 21 langkah dalam 4 fase. Biaya sendiri sekitar Rp2,2 juta sampai Rp8,2 juta (kurs AED 4.500); bagian pemberi kerja
  sekitar Rp22,6 juta (izin kerja MOHRE, asuransi, medical, Emirates ID). Decree-Law 33/2021 melarang pemberi kerja
  membebankan biaya rekrutmen kepada pekerja.
- Belum terkonfirmasi dari sumber resmi (ditandai "perkiraan" di halaman): tarif Kemlu per dokumen, biaya Kedutaan UAE
  dan VFS/BLS, lokasi loket AHU, alamat kantor imigrasi per kota, kewajiban lapor Disnaker/KP2MI untuk profesional
  kontrak langsung, kewajiban SKCK, jam layanan KBRI Abu Dhabi.

### 5.2 SIM (PRD-59B, `uae-sim-bank.js`)
- SIM A Indonesia tidak ada di daftar tukar langsung UAE (57 negara, RTA Januari 2026; Gulf News Mei 2026). Daftar
  TAMM Abu Dhabi sendiri tidak terbaca, jadi kepastian ada saat membuka traffic file. Jalur: tes mata, terjemahan SIM,
  traffic file TAMM (AED 200), sekolah (YDA resmi: Golden Chance AED 1.386,50, Expert 3.277, Beginner 4.201), teori,
  praktik, tes yard, booking (AED 100), tes jalan (AED 200), terbit SIM (AED 300).
- Ujian teori: 45 soal, 30 menit, lulus 36 (YDA). Sumber lain 32/45 atau 45 menit; mulai 1 Januari 2027 lulus 75 %.
  Bahasa ujian: Inggris atau Arab, tidak ada bahasa Indonesia. Karena itu halaman ini punya mode "Inggris saja".
- Batas 120 km/jam minimum E311 dicabut 14 April 2025; E11 turun dari 160 ke 140. Radar Abu Dhabi tanpa toleransi.
- Belum terverifikasi: kelayakan Golden Chance untuk SIM Indonesia, angka lulus resmi ITC, denda dan poin dari teks
  resmi (semua dari pers/agregator, disebut di penjelasan soal), harga 6 jam latihan eksternal.

## 6. Tracker persiapan di halaman Relocation to UAE (owner 2026-11-28)
Owner: "agar mudah diikuti dan sebagai tracker saya apa yang perlu saya siapkan ke uae semuanya".
- Halaman `relokasi-uae.html` dibuka dengan **Tracker persiapan**: satu angka total (langkah selesai dari semua
  langkah: 21 dokumen + 11 SIM), lalu **Yang dikerjakan sekarang**: langkah berikutnya dari dokumen dan dari SIM
  (judul, kantor, biaya), masing-masing langsung membuka langkah itu.
- **Seluruh perjalanan** dalam satu daftar: 4 fase dokumen lalu 3 tahap SIM, masing-masing x dari y selesai dengan
  bilah, ditandai mana yang sedang berjalan. Ketuk membuka fase/tahap itu.
- **Berkas belum siap**: jumlah berkas yang belum dicentang dari semua langkah dokumen, dan biaya sendiri yang masih
  harus disiapkan (sisa, bukan total).
- Data dari mesin yang sama (`UAEFlow.progress/next/money`), tidak ada salinan angka.
- Tautan dalam: `pindah-abudhabi.html#step-<id>` membuka dan menggulir ke langkah itu;
  `ujian-sim-abudhabi.html#ps-<id>` membuka alur SIM pada langkah itu.
- **L15** tracker = jumlah dari kedua alat (status yang disimpan diubah di browser, angka tracker ikut), tautan
  langkah berikutnya membuka langkah itu di halaman tujuan (terbuka, di layar), 3 ukuran layar, 0 error, foto dilihat.

## 7. Rencana induk v2 (owner 2026-11-28, permintaan berturut-turut)
Verbatim: "setiap item parameter, checklist ada tooltip yang bener2 accurate dan mudah dipahami, bisa switch to
indonesia dan english ada toggelnya seamless tanpa reload ulang, bener2 sempurnakan terus prdnya planning yang
sangat2 lengkap, target saya 3 bulan keluarga saya bisa relokasi starting". Sebelumnya: tracker semua persiapan
(§6), visa keluarga per orang (PRD-59C), menu koper (PRD-59D), UI imersif + estimasi timeline, super akurat,
lengkap tanpa ada yang terlewat, terupdate.

### 7.1 Target
- **Hari 0 = hari owner mulai memakai tracker (2026-11-28).** Target: keluarga (istri + anak) mendarat di Abu Dhabi
  paling lambat **hari 90 (2026-02-26)**. Owner berangkat lebih dulu.
- Tracker menghitung dari data: jalur kritis owner (visa kerja, Emirates ID, kontrak sewa Tawtheeq, sertifikat
  gaji) → syarat sponsor keluarga → entry permit istri dan anak; paralel di Indonesia: legalisasi buku nikah dan akta
  kelahiran, paspor anak, dokumen sekolah. Bila jadwal paling lambat melewati hari 90, tracker menulis langkah mana
  yang membuatnya lewat dan berapa hari (bukan hanya merah).

### 7.2 Menu (halaman Relocation to UAE)
1. **Tracker** (§6): total, yang dikerjakan sekarang, seluruh perjalanan, garis waktu menuju target 90 hari.
2. **Kelengkapan Dokumen**: per orang. Saya (visa kerja, 59A), Istri, Anak 1..n (59C). Langkah sponsor ada di Saya.
3. **Persiapan SIM** (59B).
4. **Isi Koper** (59D): per orang, kabin/bagasi.

### 7.3 Bahasa: Indonesia / English, tanpa reload
- Satu tombol bahasa di bilah atas setiap halaman relokasi (ID | EN), pilihan tersimpan dan berlaku di semua
  halaman relokasi.
- Semua teks UI dan isi data punya `{id, en}`; ganti bahasa = render ulang dari state yang sama (tidak ada reload,
  posisi gulir dan langkah yang terbuka tetap).
- Nama resmi (ICP, TAMM, Tawtheeq, Emirates ID, KUA, AHU) tidak diterjemahkan.
- Ujian SIM tetap punya mode "Inggris saja, seperti ujian" sendiri (59B), terpisah dari bahasa UI.

### 7.4 Tooltip di setiap butir
- Setiap langkah, butir bawaan, biaya, istilah (attestation, legalisasi, entry permit, Tawtheeq, medical fitness,
  Emirates ID, black points) punya penjelasan singkat: apa, kenapa perlu, di mana diurus, satu sumber.
- Bentuk: tombol "i" kecil (48 px area ketuk) yang membuka panel; HP: lembar bawah; tablet: popover. Bisa dibuka
  dengan keyboard, tutup dengan Esc/ketuk luar. Bukan atribut `title` (tidak muncul di layar sentuh).
- Isi tooltip dari data (`tip: {id, en}`) dan glosarium bersama (`uae-glossary.js`), tidak ditulis di HTML.
- **L22** setiap langkah dan setiap butir bawaan punya tooltip ID dan EN; setiap istilah glosarium yang muncul di teks
  bisa dibuka; tooltip terbuka penuh di layar pada 390x844 dan 844x390.
- **L23** ganti bahasa: 0 reload (penanda di `window` bertahan), semua teks berubah (tidak ada sisa teks bahasa lain
  di luar nama resmi), langkah yang terbuka dan posisi gulir tetap.

### 7.5 Akurat dan terupdate
- Sumber resmi dulu (ICP, TAMM, u.ae, MoFA UAE, DoH, ADEK, Kemlu, Kemenkum AHU, Kemenag, Imigrasi, Dukcapil,
  Kedutaan UAE Jakarta); sekunder hanya bila resmi diam, ditandai; pertentangan ditulis, bukan dipilih diam-diam.
- Setiap butir membawa `asOf`. Butir yang dicek lebih dari 6 bulan lalu ditandai "perlu dicek ulang" (L18).
- Riset ulang terjadwal sebelum rilis besar; tanggal riset di §5.

### 7.6 Urutan kerja
| No | Bagian | Bukti selesai |
|---|---|---|
| 1 | Tracker landing (§6) + tautan langkah | L15 |
| 2 | Riset visa keluarga sisi UAE + sisi Indonesia + koper (3 agen, sumber resmi) | berkas riset, diperiksa ulang sendiri |
| 3 | Data 59C per orang + mesin jadwal `UAEFlow.schedule` | L16, L17, L21 |
| 4 | Halaman per orang + garis waktu 90 hari | L17, L21, foto |
| 5 | i18n ID/EN tanpa reload di 4 halaman | L23 |
| 6 | Tooltip + glosarium | L22 |
| 7 | Menu Isi Koper | L19, L20 |
| 8 | Gate penuh, rilis, cek live | CI + token live |
