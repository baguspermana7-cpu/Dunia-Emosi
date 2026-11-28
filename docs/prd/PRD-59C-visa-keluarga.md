# PRD-59C: Visa keluarga (istri dan anak) ke Abu Dhabi

Status: **riset berjalan** (owner 2026-11-28). Bagian dari PRD-59 (Relocation to UAE), menu Kelengkapan Dokumen.

## Permintaan owner (verbatim)
1. "di kelengkapan dokumen utk relokasi persiapan visa saya sebagai pekerja dan apa2 aja yang diperlukan utk visa
   pindah sekalian yang bagian istri dan anak2 saya, bener2 harus specific dokumentnya."
2. "... mungkin keberangkatannya beda saya berangkat dulu dan nanti istri akan siapkan semuanya sendiri bagian visa
   dia izin2 semuanya utk dia dan anak2 saya"
3. "bener2 harus lengkap tidak ada yang miss dan itu terupdate"

## Skenario
- Owner (pekerja, visa kerja, PRD-59A) berangkat dulu, menjadi **sponsor** keluarga di Abu Dhabi.
- Istri menyiapkan dokumen dirinya dan anak-anak sendiri di Indonesia, lalu berangkat terpisah bersama anak-anak.
- Jadi daftar dibagi per **orang** dan per **siapa yang mengerjakan**: Owner di UAE (sponsor: gaji, tempat tinggal,
  pengajuan entry permit, Emirates ID keluarga, asuransi), Istri di Indonesia (dokumen asli, legalisasi, paspor anak,
  sekolah, vaksin, keberangkatan), lalu bersama di UAE (medical istri, biometrik, Emirates ID, sekolah).

## Isi (dari riset, setiap butir dengan sumber + tanggal cek)
- Syarat sponsor: gaji minimum, kontrak sewa terdaftar (Tawtheeq), surat keterangan gaji/kontrak kerja, Emirates ID.
- Istri: paspor, foto, buku nikah/akta nikah dengan rantai legalisasi Indonesia (Kemenag/Kemenkum, Kemlu, Kedutaan
  UAE di Jakarta), lalu attestation MoFA UAE; medical di UAE; Emirates ID; asuransi kesehatan.
- Anak: paspor, akta kelahiran dengan rantai legalisasi yang sama, foto, vaksin; per anak usia sekolah: rapor dan
  surat pindah sekolah terlegalisasi, penyetaraan ADEK; asuransi.
- Pernyataan tentang hal yang tidak diwajibkan (mis. izin ayah untuk anak bepergian dengan ibu), hanya bila
  bersumber.

## Sistem
- Data `uae-family-data.js` memakai skema langkah 59A (`bring`, `cost`, `payer`, `needs`, `sources`, `asOf`) dengan
  `who: owner|wife|child|family` dan `where: id|ae`.
- Anggota keluarga diisi di halaman (nama panggilan, tahun lahir); langkah anak diulang per anak, langkah sekolah
  hanya untuk usia sekolah. Status per orang tersimpan (UAEFlow, kunci baru, dengan migrasi dan cadangan).
- "Terupdate": setiap butir membawa `asOf`; halaman menandai butir yang dicek lebih dari 6 bulan lalu sebagai
  "perlu dicek ulang", dan PRD mencatat tanggal riset.

## Hukum
- L16 setiap langkah keluarga punya `who`, kantor, bawaan spesifik (nama dokumen, asli/salinan, jumlah), biaya,
  sumber https + tanggal; urutan `needs` tanpa siklus; tidak ada butir tanpa sumber.
- L17 menambah 2 anak menghasilkan langkah anak dua kali dengan status terpisah; anak di bawah usia sekolah tidak
  mendapat langkah sekolah; tersimpan setelah reload.
- L18 butir dengan `asOf` > 6 bulan ditandai "perlu dicek ulang" (uji dengan tanggal palsu).

## UI dan timeline (owner 2026-11-28: "UIUX nya harus sangat bagus, immersive sehingga sangat mudah dipahami, dan
estimasi timeline"; "harus super accurate")
- Satu layar per orang (Saya, Istri, Anak 1, Anak 2 ...) dengan foto/ikon orang, bukan daftar panjang campuran.
- **Estimasi timeline**: setiap langkah punya lama proses minimum-maksimum (hari kerja, bersumber). Mesin menghitung
  jadwal paling cepat dan paling lambat dari `needs` (jalur kritis), mulai dari tanggal yang dipilih (mis. tanggal
  owner berangkat). Tampilan garis waktu per orang: minggu ke-N, kapan istri bisa berangkat paling cepat, apa yang
  bisa dikerjakan bersamaan. Angka tanpa sumber lama proses ditandai "perkiraan" dengan alasannya.
- Super akurat: setiap biaya, syarat dan lama proses dari sumber resmi (ICP, TAMM, u.ae, MoFA UAE, Kemlu, Kemenag,
  Kemenkum, Kedutaan UAE Jakarta, ADEK); sumber sekunder hanya bila resmi tidak memuat, ditandai, dan bertentangan
  dicatat bukan dipilih diam-diam.
- **L21** jadwal: langkah tidak pernah mulai sebelum semua `needs` selesai; total paling cepat = jalur kritis
  (uji dengan contoh tangan); mengubah tanggal mulai menggeser semua tanggal.

## Hasil tahap 1 (2026-11-28)
- Menu baru **Visa Keluarga** (`games/visa-keluarga-uae.html`) di landing Relocation to UAE. Data
  `games/uae/uae-family-data.js`: 24 langkah dasar (sponsor 5, istri 7, per anak 9, berangkat dan tiba 4), diulang per
  anak dengan `UAEFamily.build(kids)`; tahap sekolah per anak (belum sekolah, masuk kelas 1, kelas 2 ke atas) menentukan
  langkah sekolah (ADEK 1.5.2). Status tersimpan di `dunia-uae-family-v1`, anak dan tanggal mulai di
  `dunia-uae-family-meta-v1`.
- Rantai buku nikah sesuai standar layanan Kemenag (simbi.kemenag.go.id/info-nikah/legalisasi, dicek 2026-11-28):
  3 fotokopi dilegalisir KUA kecamatan penerbit, lalu loket Ditjen Bimas Islam (Jl. M.H. Thamrin 6, lantai 9, gratis,
  30 menit sampai 3 hari, surat kuasa bila diwakili), lalu Kemenkum AHU, Kemlu STEMPEL ASLI, satu permohonan digital
  Kedutaan UAE + MoFA lewat VFS/BLS (maks. 3 dokumen, tiap dokumen terdaftar sendiri, airway bill bila kurir).
- Verifikasi silang oleh Codex (12 celah, read-only). Yang dicek ulang di sumber dan masuk: syarat Kemenag di atas,
  biometrik ICP hanya usia 15 tahun ke atas (ICP serviceid ...5a), skrining DoH = pemeriksaan klinis, darah, rontgen
  (Visa Screening Standard V15). Yang masuk sebagai "bila diminta" karena belum dibaca sendiri: spesimen tanda tangan
  AHU, unggahan STEMPEL ASLI, formulir dan persetujuan kesehatan sekolah.
- Timeline (L21): `UAEFlow.schedule` di halaman: tanggal mulai, perkiraan berangkat, jalur terpanjang, selesai per
  bagian, dibanding target 90 hari. Contoh 2 anak kelas 2+: 15 sampai 62 hari.
- Tooltip (L22): tombol info di setiap kolom langkah (untuk apa, penerbit, lokasi, bawaan, lembar, waktu, biaya,
  pembayar, catatan, sumber, status, biaya sebenarnya, catatan pribadi) dan di ringkasan; daftar istilah (27 istilah:
  ICP, Tawtheeq, STEMPEL ASLI, ...) muncul per langkah. Berlaku juga di Kelengkapan Dokumen (renderer sama).
- L18: label "perlu dicek ulang" bila tanggal cek lebih dari 6 bulan (`UAEFlow.stale`).
- Belum: tombol bahasa Inggris (L23), menu Isi Koper (59D). Biaya ICP per orang dan deposit tetap bertentangan dan
  tampil di "Perlu dikonfirmasi".
