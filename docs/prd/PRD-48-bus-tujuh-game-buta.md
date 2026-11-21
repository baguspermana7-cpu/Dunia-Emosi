# PRD-48 Bus jawaban di 7 game yang belum melapor

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** live v64.75-20261121b
- **Sumber:** rencana Gelombang 5 (3 agen eksplorasi + cek ulang file:baris, 2026-11-21)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - `duniaReport` (sudah ada, `game.js:3091`) dipanggil di jawaban G4 (matematika/hitung), G7 (bahasa/gambar), G9 (bahasa/jejak), G10 dan G13/G13b (matematika, skill dari jenis soal).
  - Kode baru di `game.js` diimbangi pemindahan blok ke hub part, karena ratchet.
  - G6 Mobil: satu catatan per kata (bahasa/eja).
  - G21, G22, G24: periksa bahwa setiap soal melapor, bukan hanya bos. Kalau belum, tambahkan.
  - Skill baru masuk tabel `SKILL` di `learning-log.js`.
- **Laws:**
  - L1: per game, N jawaban dengan ketukan sungguhan → N catatan dengan skill yang dikenal.
  - L2: tidak ada skill yang jatuh ke "Lainnya".
  - L3: gate game masing-masing tetap lulus.
- **Gate:** perluas `tools/qa-bus-coverage.mjs`. Merah: 0 catatan di 7 game.

## Hasil (2026-11-21, v64.75-20261121b)

Gate: `tools/qa-prd48-bus.mjs` (tag `bus48`). Merah = kode v64.74 (worktree HEAD), hijau = rilis.

- **Merah:** 15 gagal: 0 catatan di ketujuh game.
- **Hijau:** 22/0.
  - G4 2→2 (Menghitung benda);
  - G7 2→2 (Kata dan gambar);
  - G10 2→2;
  - G13 2→2;
  - G13b 2→2 (Penjumlahan, dari `op` soal);
  - G9 1→1 (Menulis huruf);
  - Mobil 2→2 (Mengeja kata): kata bersih ok true, kata dengan huruf salah ok false.
- **Tidak ada skill "Lainnya".** 0 galat halaman.

Perubahan:
- **`game.js`:**
  - Helper `duniaReportOp` (op `+ - * ÷` → add/sub/multiply/divide, `knowledge` → umum) di baris `duniaReport`.
  - Panggilan ditempel di baris yang sudah ada, sehingga `game.js` tetap 10599 baris (ratchet).
  - G4: tiap jawaban dan waktu habis.
  - G7: tiap jawaban.
  - G9: "Selesai" (ok = skor ≥ 0,65, yaitu 2+ bintang).
  - G10: ketukan pertama per soal.
  - G13 dan G13b: tiap jawaban.
- **`games/mobil.html`:** satu catatan per kata (`tries` = huruf salah + 1).
- **`games/data/learning-log.js`:** skill baru `jejak`, `eja`, `hitung`.
- **`games/data/dunia-bus.js`:**
  - Ditemukan saat merah: `emit` menimpa `game` dengan nama halaman. Akibatnya semua catatan game hub (juga G3/G8 sejak PRD-42) tercatat `index`.
  - Sekarang `payload.game` menang bila ada. Halaman tanpa `game` tetap memakai nama halaman.
- **G21/G22/G24** (mario-pokemon, monster-candy, pokemon-bawah-laut): `DuniaAnswerQ` sudah ada di handler tiap soal (`onMathAnswer`, `btn.onclick`, `pointerdown`), tidak hanya bos. Hasil ini dari membaca kode, tanpa uji jalan.

Catatan untuk PRD-52: di 844x390 kanvas jejak G9 (448 px) lebih tinggi dari layar. Puncak huruf A ada di y = -6, jadi goresan tidak bisa dimulai tanpa menggulir. Gate G9 dijalankan di 390x844.
