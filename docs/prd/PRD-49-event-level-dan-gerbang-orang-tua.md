# PRD-49 Event level/hadiah di bus + gerbang orang tua

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** belum mulai
- **Sumber:** rencana Gelombang 5 (3 agen eksplorasi + cek ulang file:baris, 2026-11-21)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Event:**
  - `level:start` / `level:end {win, stars}` dipancarkan dari jalur bersama: hub (`showResult`/`setLevelComplete` di `game.js`) dan halaman (fungsi simpan level di `save-engine.js`; titik pastinya ditentukan saat eksekusi).
  - `reward {id, src, game}` dipancarkan dari 4 halaman yang sudah memakai `reward-catalog.js`.
- **Gerbang orang tua** (`games/data/parent-gate.js`): tahan tombol 2 s, lalu soal hitung dua digit yang dibacakan dan ditulis (mis. "23 + 14"), dengan 3 pilihan.
  - Dasbor, setelan ritme (PRD-21) dan "unduh semua" (PRD-23) ada di baliknya.
  - Keputusan owner: lihat K2.
- **Laws:**
  - L1: menyelesaikan 1 level di 5 game (2 hub, 3 halaman) → tepat 1 `level:start` dan 1 `level:end` per level, dengan `win` yang benar.
  - L2: hadiah di 4 halaman → event `reward`.
  - L3: dasbor tidak terbuka tanpa jawaban benar; jawaban salah → kembali ke beranda.
  - L4: gerbang di 3 ukuran, target ≥48 px, kontras lulus.
- **Gate:** `tools/qa-prd49-events.mjs`.
