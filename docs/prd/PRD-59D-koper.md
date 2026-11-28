# PRD-59D: Kelengkapan relokasi, isi koper (menu ketiga)

Status: **riset berjalan** (owner 2026-11-28). Bagian dari PRD-59, menu baru di halaman Relocation to UAE.

## Permintaan owner (verbatim)
"lalu ada menu juga kelengkapan relokasi bentuknya barang2 misal baju, sepatu atau apa lah utk istri saya persiapkan
pada koper karena mungkin keberangkatannya beda saya berangkat dulu dan nanti istri akan siapkan semuanya sendiri"
"bener2 harus lengkap tidak ada yang miss dan itu terupdate"

## Isi
- Daftar barang per kelompok: dokumen di tas kabin (asli + salinan, map), uang dan kartu, obat (aturan obat yang
  diatur/dilarang UAE, resep, batas jumlah), pakaian per orang sesuai iklim Abu Dhabi dan norma berpakaian, sepatu,
  perlengkapan anak (sekolah, mainan, kursi mobil bila dibawa), elektronik (colokan tipe G, 230 V), dapur/makanan
  (batas bea cukai), barang yang dilarang/dibatasi masuk UAE, aturan bagasi maskapai (berat, power bank).
- Per orang (istri, tiap anak) dengan jumlah; tanda "kabin" atau "bagasi".
- Centang, simpan, cetak, cadangan, sama dengan Kelengkapan Dokumen.

## Hukum
- L19 setiap butir punya kelompok, jumlah atau aturan, kabin/bagasi; setiap aturan (obat, bea cukai, bagasi,
  barang dilarang) punya sumber https + tanggal.
- L20 centang tersimpan per orang, cetak dan cadangan bekerja, 3 ukuran layar, 0 error, foto dilihat.

## Hasil tahap 1 (2026-11-28)
- Menu **Isi Koper** (`games/koper-uae.html`, data `games/uae/uae-koper-data.js`, simpan `dunia-uae-koper-v1`):
  8 kelompok, 56 barang. Setiap barang: siapa (ibu, tiap anak, semua), jumlah, tempat (tas kabin, bagasi, dipakai,
  tugas sebelum terbang, jangan dibawa), penjelasan di tombol info, tingkat sumber (resmi, sekunder, saran) dan tautan.
  Jumlah anak dan nama diambil dari menu Visa Keluarga.
- Aturan resmi yang dibaca 2026-11-28: power bank satu per orang maks. 100 Wh di kabin (Etihad), tas kabin ekonomi
  7 kg 56x36x23 cm (Etihad), cairan 100 ml per wadah total 1 L (Etihad), obat biasa maks. 3 bulan dengan resep (Bea
  Cukai Dubai), obat terkontrol izin MOHAP dan masa tinggal atau 1 bulan (lampiran MOHAP di MoFA), uang di atas AED
  60.000 wajib lapor (orang dewasa; uang anak dihitung ke orang tua), Rp 100 juta ke atas wajib BC 3.2 saat keluar
  Indonesia, barang dilarang dan terbatas Bea Cukai Abu Dhabi (sirih, laser merah, sepeda dan mainan remote control,
  perangkat radio, rokok elektrik), iklim dan pakaian (Visit Abu Dhabi).
- Belum terbukti dari sumber resmi: jatah bagasi terdaftar Etihad CGK-AUH (butuh nomor pemesanan), tegangan listrik
  UAE (sekunder 230 V tipe G), batas gram makanan, syarat sekolah atas pas foto.
- Hukum L19: `node tools/test-uae-data.mjs` (data; merah bila power bank dipindah ke bagasi).
