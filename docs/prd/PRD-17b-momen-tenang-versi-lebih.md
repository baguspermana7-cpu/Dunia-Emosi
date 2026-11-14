# PRD-17b Momen tenang → versi lebih mudah **[ANAK]**

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** live v64.48
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #17
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:** setelah napas (atau "Nanti") yang dipicu frustrasi, soal berikutnya di skill itu turun satu tier lewat `mastery.js`.
- **Laws:**
  - (L1) 3 salah → kartu napas (sudah ada) → soal berikutnya tier −1;
  - (L2) hanya sekali per sesi per skill.
- **Usaha:** S.

## Hasil (2026-11-14, v64.48)

- Saat peta menawarkan napas (3 jawaban salah dalam 30 menit), domain jawaban terakhir dilunakkan:
  `DuniaMastery.soften(domain)` — soal berikutnya di domain itu satu tier lebih mudah, di game mana pun dalam tab yang
  sama (sessionStorage). Bendera hilang dengan jawaban berikutnya di domain itu; sekali per sesi per domain.
- Mojo kejar membaca tier saat soal dibuat; Kuis membuat ulang soal yang akan tampil (tier kampanye satu langkah turun +
  batas angka); Timmy membaca `scoreNow`.
- Catatan pengukuran: tiga salah saja sudah menurunkan skor anak baru dari 40 ke tier 1 (aturan PRD-10 bekerja), jadi
  pelunakan baru terasa pada anak yang riwayatnya panjang. Gate memakai anak dengan 30 jawaban, skor 70.
- **Gate `qa-soften`** (browser, satu tab seperti anak berpindah game → peta → game): L1 peta menawarkan napas + tier
  2 → 1; L2 Mojo kejar ≤ 5 selama lunak, kembali sampai 10 setelah satu jawaban, sekali per sesi; L3 Kuis: soal
  pertama adalah versi yang dibuat ulang, setelah dijawab soal level biasa; L4 batas tier tanpa momen sulit. 9/9.
  Merah: gate terhadap live v64.46 → exit 1 (`DuniaMastery.soft` belum ada). `qa-mastery` L8 (node) 14/14, mesin lama
  → gagal.
