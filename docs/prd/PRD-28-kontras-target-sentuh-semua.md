# PRD-28 Kontras + target sentuh semua game

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #28
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:** generalisasi `qa-index-contrast.mjs` + `touch-target-audit.mjs` menjadi `tools/qa-game-a11y.mjs` (env URL, ratchet seperti PRD-15). Ambang: kontras teks 4.5:1 (3:1 untuk teks besar), target ≥48 px.
- **Laws:**
  - (L1) laporan per game + baseline;
  - (L2) mutasi tombol 30 px → gagal;
  - (L3) semua pelanggaran di **tombol utama** game (mulai, jawaban, panah) diperbaiki sampai 0;
  - sisanya ratchet.
- **Usaha:** M.
