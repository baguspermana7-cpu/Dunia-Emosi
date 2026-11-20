# PRD-38 Kedalaman latar dan tokoh beranimasi (Birds, Bawah Laut)

- **Gelombang:** Gelombang 4B — tampilan lebih detail
- **Status:** live v64.68
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** G19 Pokemon Birds dan G24 Bawah Laut memakai latar datar dan tokoh gambar diam yang hanya bergeser. Ada 41 GIF animasi di `assets/Pokemon/showdown-ani` yang hanya dipakai satu halaman. Mesin paralaks sudah ada (lihat bagian visual di dokumen audit gameplay).
- **Desain:** pakai mesin paralaks yang ada: ≥ 3 lapisan latar dengan kecepatan berbeda; tokoh utama memakai GIF animasi bila tersedia untuk spesiesnya (fallback gambar diam); bayangan jatuh lembut di tanah/air. Tanpa outline putih.
- **Laws:**
  - (L1) gate: ≥ 3 lapisan latar bergerak dengan kecepatan berbeda (ukur posisi 2 detik terpisah);
  - (L2) tokoh utama beranimasi (dua screenshot 200 ms terpisah berbeda di kotak tokoh) untuk spesies yang punya GIF;
  - (L3) gate PRD-33: byte layar pertama naik ≤ 300 KB; survey frame tidak memburuk melewati kebisingan;
  - (L4) screenshot 3 ukuran dilihat; outline gate lulus.
- **Usaha:** M.

## Hasil (v64.68, 2026-11-20)

**Diukur dulu** (`tools/qa-prd38-depth.mjs`, 390×844 / 844×390 / 800×1280).

**L1 sudah benar sebelum PRD ini.**
- Birds: 3 lapisan bergerak, langit-gunung 5, awan jauh 12, awan dekat 66 px/s.
- Bawah Laut: 4 lapisan, sinar 8, gelembung 9, ikan tengah 30, rumput laut depan 70 px/s.
- Rasio lambat/cepat 0,07–0,11 di semua ukuran.
- Masalah "latar datar" di dokumen audit sudah usang. Kode L1 tidak diubah, cukup dikunci dengan gate.
- Merah dibuktikan: dengan `prefers-reduced-motion` (`QA_REDUCED=1`) semua lapisan diam, 0 px/s, dan L1 gagal.

**L2 diperbaiki.**
- Bawah Laut sudah memakai GIF untuk 42 dari 43 pilihan (Magikarp tidak punya GIF dan memakai goyangan).
- Birds memakai gambar diam untuk semua spesies, padahal Lugia dan Gyarados punya GIF di `assets/Pokemon/showdown-ani`.
- Keduanya sekarang GIF (70 dan 59 frame), dicerminkan ke kanan (`mirror:true`, karena GIF Showdown menghadap kiri).
- Spesies lain tetap gambar diam: tidak ada aset baru.
- Gate memilih setiap tahap evolusi lewat `applyPokemon` milik game. Hasilnya merah di HEAD v64.67 (2 tidak tampil sebagai GIF) dan hijau sekarang.

| Law | HEAD v64.67 | v64.68 |
|---|---|---|
| L1 ≥3 lapisan, ≥3 kecepatan, rasio ≤0,5 | 6/6 | 6/6 (reduced-motion: 0/6) |
| L2 spesies ber-GIF tampil sebagai GIF | Birds 0/2, Bawah Laut 42/42 | Birds 2/2, Bawah Laut 42/42 |
| L3 galat halaman | 0 | 0 |

**L3 dan regresi:**
- Perf Birds: 871 kB, 39 request (baseline 38, toleransi 5 %), DOM 134, lulus.
- `qa-prd35-dom` 6/6 dan `qa-birds-parallax` lulus.

**L4:** screenshot Lugia di 844×390 dan 800×1280 sudah dilihat. Lugia menghadap kanan di dalam cincin gelembung, tanpa outline putih. Di 390×844 Lugia tertutup panel soal yang terbuka.
