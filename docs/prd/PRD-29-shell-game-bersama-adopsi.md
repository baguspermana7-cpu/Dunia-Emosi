# PRD-29 Shell game bersama (adopsi bertahap)

- **Gelombang:** Gelombang 3 — keandalan & arsitektur
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #29
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - `games/data/game-shell.js` membungkus kontrol yang SUDAH ada (rumah, jeda, suara, narasi, pemulihan) — tidak menulis ulang;
  - adopsi per game, satu game per rilis, mulai dari game dengan kontrol paling tidak konsisten (diukur dulu).
- **Laws per game yang diadopsi:**
  - (L1) tombol rumah/jeda/suara ada di posisi sama di 3 ukuran;
  - (L2) semua gate game itu lulus;
  - (L3) `qa-action-latency` tidak memburuk.
- **Usaha:** XL, berjalan lama.
