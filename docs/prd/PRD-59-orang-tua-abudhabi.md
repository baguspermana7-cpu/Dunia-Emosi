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
  paling lambat **hari 90 (2027-02-26)**. Owner berangkat lebih dulu.
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

## Landing v2 dan rencana yang tidak mundur (owner 2026-11-28: "fix, and improve, no mistake", "gunakan figcraft")
- Desain dibuat dulu di FigCraft (`~/Documents/figcraft/relokasi/gen.py`, angka dari engine), dilihat, dua cacat
  diperbaiki di mockup (angka biaya keluar dari baris, celah di kartu), baru dibangun.
- Kartu "Mulai dari sini": langkah terbuka pertama di jalur terpanjang visa keluarga (yang menentukan tanggal
  berangkat), bukan langkah pertama di daftar. Sebelumnya daftar menunjuk izin tinggal sponsor, padahal akta anak yang
  paling lama dan bisa dikerjakan sekarang. Daftar "Yang dikerjakan sekarang" memakai langkah yang sama.
- Empat menu sebagai kisi 2x2 dengan hitungan dan bilah, juga di angka 0. Di HP miring: hero dan kartu di kiri, menu
  di kanan.
- Bug yang ditutup: perkiraan berangkat dihitung dari tanggal "mulai mengurus". Bila tanggal itu sudah lewat dan
  langkah belum selesai, tanggal berangkat bisa tampil di masa lalu. `UAEFamily.plan()` kini menghitung langkah yang
  tersisa dari hari ini (langkah selesai = 0 hari); target 90 hari tetap dari tanggal mulai.
- Hukum: L21b (`test-uae-data`, 6 uji, merah sebelum `plan()` ada), L24 (`qa-prd59-uae`: kartu = langkah jalur
  terpanjang, tombol membuka langkah itu, mulai 120 hari lalu -> dihitung dari hari ini dan "melewati target"),
  L1 diperluas: empat menu dan tombol "Buka langkah ini" di layar pertama pada 390x844, 844x390, 800x1280.

## 8. Rencana eksekusi v3 (owner 2026-11-28: "sempurnakan prd dan eksekusi", "ensure all deliver on best, refined uiux and process, valid, super valid, sangat comprehensive", "ini long term, taruh di OUT_COUNTRY_RE")

### 8.1 Status tiap hukum (apa yang sudah terbukti, apa yang belum)
| Hukum | Isi | Status | Bukti / perintah |
|---|---|---|---|
| L1 | Landing: 4 menu dan tombol "Buka langkah ini" di layar pertama pada 390x844, 844x390, 800x1280; tautan dari beranda | hijau lokal | `qa-prd59-uae` |
| L2-L14 | Dokumen kerja dan SIM (59A, 59B): data, simpan, cadangan, cetak, kuis, rambu | hijau, live v65.00 di repo mandiri | `test-uae-data`, `test-uae-engines`, `qa-prd59-uae` |
| L15 | Tracker: hitungan, uang, tautan yang membuka langkah | hijau lokal | `qa-prd59-uae` |
| L16-L18 | Visa keluarga: tiap langkah lengkap, per anak, jenjang sekolah, fakta lama ditandai | hijau | `test-uae-data` |
| L19-L20 | Isi koper: aturan bersumber, centang tersimpan | hijau (v65.03): 50 butir bercentang, 6 baris "jangan dibawa" tanpa centang, 2 centang bertahan setelah reload dan terhitung di landing | `qa-prd59-uae` |
| L21, L21b | Jadwal dari `needs`; langkah tersisa dihitung dari hari ini | hijau (6 uji merah dulu) | `test-uae-data` |
| L22 | Tooltip di setiap parameter + glosarium | hijau di dokumen, keluarga, koper (56 tooltip: 38 bersumber https, 18 bertanda saran tanpa aturan; juga dalam EN). Landing tidak punya tooltip: isinya hitungan dan tautan | `qa-prd59-uae` |
| L23 | Bahasa ID/EN tanpa reload | hijau (v65.02): 5 halaman, 1.1k teks + aturan berpola; merah dulu dengan kamus belum lengkap (17-121 teks tersisa per halaman) | `qa-prd59-uae` (30 cek L23), `test-uae-data` (6 cek L23) |
| L24 | "Mulai dari sini" = langkah jalur terpanjang; tanggal tidak mundur | hijau lokal (merah pada mutasi) | `qa-prd59-uae` |
| L25 | Repo mandiri `OUT_COUNTRY_RE` selalu sama dengan sumber | hijau: `qa-relocation-export` 16/0; versi live = ekspor (merah sebelum push: live `79a5d5e1070b`) | `tools/qa-relocation-export.mjs --live <url>` |

### 8.2 Repo mandiri `OUT_COUNTRY_RE` (jangka panjang)
- **Satu sumber.** Halaman dan data hidup di Dunia Emosi (`games/*.html`, `games/uae/`), tempat semua gate jalan.
  `tools/export-relocation.py <dir>` menyalinnya menjadi aplikasi mandiri: `index.html` (landing), service worker
  sendiri (offline setelah satu kunjungan), manifest dan ikon koper sendiri, dua font, uji, workflow Pages yang
  menjalankan uji sebelum deploy. Repo itu tidak pernah diedit tangan (berkas `SOURCE` mencatat commit asal).
- **Simpanan sama.** Kedua situs berada di `baguspermana7-cpu.github.io`, jadi `localStorage` sama: centang di salah
  satu muncul di yang lain. Custom domain akan memutus ini; jangan dipasang tanpa rencana migrasi (ekspor/impor JSON).
- **L25**: (a) ekspor dua kali = versi service worker yang sama; (b) di hasil ekspor: `test-uae-data` dan
  `test-uae-engines` 0 gagal, 5 halaman 0 error dan 0 permintaan gagal, tidak ada jalur `../`, semua halaman terbuka
  setelah server dimatikan; (c) versi `sw.js` live = versi ekspor terakhir. Perintah: `tools/qa-relocation-export.mjs`
  (dibuat di 8.5 no. 2), dijalankan setiap rilis yang menyentuh `games/uae/` atau 5 halaman.
- Token GitHub hanya untuk repo itu, disimpan owner di `~/.config/out-country-re.token` (600), tidak pernah dicetak.

### 8.3 Bahasa ID/EN tanpa reload (L23), rancangan
- **Ukuran kerja (diukur):** 969 teks data (47.884 karakter): dokumen 319, keluarga 310, glosarium 54, koper 175,
  alur SIM 106, lain 5; ditambah teks antarmuka 5 halaman dan 7 skrip.
- **Cara:** data tetap satu sumber berbahasa Indonesia. Kamus `games/uae/uae-i18n-en.js` berbentuk
  `{ "teks Indonesia": "English text" }` ditambah aturan berpola untuk kalimat berangka
  (`/^(\d+) dari (\d+) selesai$/` -> `$1 of $2 done`). `uae-i18n.js` menerjemahkan simpul teks dan atribut
  (`aria-label`, `placeholder`, `title` dokumen) di tempat, menyimpan teks asli per simpul, dan mengamati perubahan
  DOM (pengamat dilepas selama menulis agar tidak berputar). Ganti bahasa = tukar teks di tempat: tanpa reload,
  langkah yang terbuka dan posisi gulir tetap. Renderer tidak diubah.
- **Tidak diterjemahkan:** nama resmi (ICP, TAMM, Tawtheeq, Emirates ID, KUA, Kemenag, Kemenkum, AHU, Kemlu,
  Disdukcapil, M-Paspor), nama anak, isi yang diketik owner, angka dan mata uang, nama jalan.
- **Tombol:** `ID | EN` di bilah atas tiap halaman (48 px), tersimpan di `dunia-uae-lang-v1`, berlaku di 5 halaman.
  Mode ujian SIM "Inggris saja" tetap terpisah.
- **Hukum L23** (`qa-prd59-uae`, merah dulu dengan kamus kosong):
  1. penanda `window.__noReload` bertahan setelah ganti bahasa dua arah di 5 halaman;
  2. langkah yang terbuka tetap terbuka dan `scrollY` berubah kurang dari 4 px;
  3. dalam mode EN, tidak ada simpul teks terlihat yang masih sama dengan teks Indonesianya, kecuali daftar nama
     resmi dan isi ketikan (daftar pengecualian tertulis di gate, tiap butir beralasan);
  4. kembali ke ID mengembalikan teks persis seperti semula (bandingkan seluruh `innerText`);
  5. `test-uae-data`: setiap teks data punya padanan EN, tidak ada kunci kamus yang yatim.
- **Mutu terjemahan:** dikerjakan per berkas oleh subagen dengan glosarium tetap (legalisation, attestation, entry
  permit, residence permit, marriage certificate, birth certificate, sponsor), lalu saya baca ulang seluruhnya:
  angka, nama kantor, dan syarat tidak boleh berubah. Uji: setiap angka dan nama resmi di teks ID muncul sama di EN.

### 8.4 Fakta yang belum terkonfirmasi (tidak dibulatkan jadi "benar")
| Fakta | Yang diketahui | Cara memastikan |
|---|---|---|
| Biaya ICP entry permit dan izin tinggal per orang | ICP 100+100+100; sumber sekunder lebih tinggi | layar pembayaran ICP saat mengajukan |
| Deposit sponsor keluarga AED 5.025 | hanya sumber sekunder | tanya PRO perusahaan atau ICP 600522222 |
| Terjemahan Arab buku nikah | MoFA menerima Inggris; sekunder menyebut Arab | email JakartaCVO@mofa.gov.ae |
| Pembayar asuransi tanggungan | DoH 2016 vs 2021 berbeda | HR pemberi kerja |
| Tarif legalisasi Kemenkum | Rp 50.000 vs Rp 70.000 | layar pembayaran AHU Online |
| Jatah bagasi Etihad CGK-AUH | tergantung tarif | e-tiket tiap orang |
| Langkah izin obat MOHAP | lampiran MOHAP di MoFA | portal MOHAP saat mengajukan |
| Listrik 230 V tipe G | sekunder | tidak kritis; adaptor universal |
| Jumlah pas foto sekolah | belum ada sumber | sekolah tujuan |
Di aplikasi: tiap butir ini bertanda "perkiraan" atau masuk daftar "Perlu dikonfirmasi"; owner mengisi angka nyata di
kolom "biaya yang dibayar" dan catatan.

### 8.5 Urutan eksekusi
| No | Pekerjaan | Hukum | Selesai bila |
|---|---|---|---|
| 1 | Rilis v65.01: landing v2 + `plan()`; CI GitHub hijau; tombol relokasi live di beranda Dunia Emosi | L1, L21b, L24 | token live v65.01, `home-uae-link` ada di `index.html` live |
| 2 | `tools/qa-relocation-export.mjs` + ekspor ulang + push ke `OUT_COUNTRY_RE` | L25 | versi `sw.js` live = ekspor |
| 3 | Blok browser koper (L20) dan tooltip di landing/koper (L22) | L20, L22 | `qa-prd59-uae` |
| 4 | ID/EN tanpa reload | L23 | 8.3 butir 1-5 |
| 5 | Laporan ke owner: tiap hukum dengan bukti; yang belum terbukti ditulis lebih dulu | semua | - |

### 8.6 Hasil L23 (v65.02)
- Sumber terjemahan: `games/uae/i18n/*.json` (teks Indonesia -> Inggris) dan `rules.js` (aturan berpola); `tools/build-uae-i18n.py`
  menulis `uae-i18n-en.js` (`--check` gagal bila basi). Mesin: `uae-i18n.js`.
- Urutan cari: teks persis, lalu templat angka (`3 dari 21 selesai` -> `{0} dari {1} selesai`), lalu aturan (tanggal,
  "Tunggu langkah ...", gabungan `A, B` yang hanya diterjemahkan bila setiap bagian punya padanan).
- Saat ganti bahasa, elemen di tengah layar dijaga di tempatnya; halaman yang sedang di puncak tetap di puncak.
- Isi soal ujian SIM memakai mode bahasanya sendiri (`data-noi18n`).
- Batas jujur: gate L23 memeriksa keadaan awal tiap halaman. Teks keadaan lain (hasil ujian, peringatan terlambat,
  toast) diterjemahkan dari daftar literal renderer, tetapi belum diuji di browser satu per satu. Teks baru di data
  tanpa padanan akan menggagalkan `test-uae-data`.
- v65.03: gate koper menemukan satu butir berperingkat "sumber sekunder" tanpa sumber (adaptor colokan tipe G). Sumber
  ditambahkan setelah dibaca: worldstandards.eu, Abu Dhabi = tipe G, 230 V, 50 Hz (sekunder).
