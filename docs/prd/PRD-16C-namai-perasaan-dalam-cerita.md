# PRD-16C Namai perasaan dalam cerita **[ANAK — mekanik emosi baru]**

- **Gelombang:** Gelombang 2 — pengalaman anak & orang tua
- **Status:** live v64.87 (2026-11-22)
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #16
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - di momen cerita yang sudah ada (Timmy kapal menabrak, kereta terlambat), kartu kecil "Timmy merasa apa?" dengan 3 wajah `faces*`;
  - dicatat sebagai `answer` domain `emosi`;
  - tanpa skor/bintang;
  - maksimal satu kartu per level, sekali per hari per game.
- **Laws:**
  - (L1) momen cerita → kartu muncul, satu jawaban dicatat;
  - (L2) tidak pernah muncul di tengah aksi (hanya saat game jeda);
  - (L3) penjelasan suara untuk tiap pilihan;
  - (L4) ringkasan muncul di dasbor perasaan.
- **Usaha:** M.

## Revisi 2026-11-21 (Gelombang 5, berlaku di atas desain di atas)

- **Prasyarat:** PRD-49.
- **Desain:**
  - Momen = `level:end` kalah di Timmy, Kereta dan Mojo. Bukan "kapal menabrak" seperti di PRD lama, karena momen itu tidak ada di kode.
  - Kartu "Timmy merasa apa?" dengan 3 wajah dari `DuniaFeeling.FEELINGS` (`feeling-checkin.js:24-28`) dan kalimat suara.
  - Dicatat lewat `DuniaFeeling`, sehingga dasbor perasaan yang sudah ada (`game.js:4032`) langsung membacanya.
  - Paling banyak sekali per hari per game. Tanpa skor.
- **Laws:**
  - L1: kalah → kartu → 1 catatan.
  - L2: hanya saat jeda/akhir level.
  - L3: tiap pilihan bersuara.
  - L4: muncul di dasbor.
  - L5: kali kedua di hari yang sama tidak muncul.

## Hasil (v64.87, 2026-11-22)

- **Momen di kode, bukan di PRD.** Timmy Kapal dan Mojo tidak bisa kalah (tidak ada akhir level kalah di kode).
  `level:end` dengan `win:false` ada di: Petualangan Mobil (`showGameOver`), Ducky Volley, Kuis Matematika, game
  hub dengan 0 bintang, dan sekarang Balapan Kereta: balapan jadi level di DuniaBus (`level:start` saat "GO",
  `level:end` di `endRace`, kalah = nyawa habis). Kartu muncul di semua itu.
- Kartu "Belum berhasil. Kamu merasa apa?" (anak, bukan Timmy: yang kalah adalah anak) dengan 3 wajah dari
  `DuniaFeeling.FEELINGS`: Senang, Sedih, Marah. Muncul 0,9 detik setelah `level:end`, di atas layar hasil game.
  Tombol lewati selalu ada. Paling banyak sekali per hari per game.
- **L3 direvisi (PRD-55):** tiap pilihan menjawab dengan kalimat tertulis sendiri, tidak dibacakan. Marah dan Sedih
  menawarkan "Tarik napas bareng" bila `DuniaBreath` ada.
- Disimpan di catatan perasaan yang sama (`dunia-feelings`.after), terpisah dari check-in pagi. Dasbor punya baris
  sendiri "Setelah belum berhasil".
- **Perbaikan bus:** `DuniaEmit` memancarkan langsung begitu bus + LearningLog ada, walau pemuat masih memuat modul
  lain; `level:end` lewat sebelum kartu terpasang dan mendahului `level:start` yang masih antre. Sekarang event
  diantrekan sampai pemuat selesai (`save-engine.js`).
- Di peramban otomatis kartu dilewati kecuali URL membawa `?feel=1` (sama seperti check-in pagi), supaya gate yang
  sengaja kalah tidak tertutup kartu.
- Gate `tools/qa-prd16c-feel.mjs` (CI smoke): merah di origin/main 1/10 lalu berhenti, hijau 10/0. Screenshot dilihat.
