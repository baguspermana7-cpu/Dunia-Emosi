# PRD-48 Bus jawaban di 7 game yang belum melapor

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** belum mulai
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
