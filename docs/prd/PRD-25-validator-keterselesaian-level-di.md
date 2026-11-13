# PRD-25 Validator keterselesaian level di CI

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #25
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:** satu `tools/qa-levels-solvable.mjs` (node, tanpa browser) yang memanggil validator yang ada:
  - BFS papan Timmy;
  - `simPatterns` Mojo (`games/mojo-chase-rules.js`);
  - rute kereta (`games/data/kereta-levels-*.js`).
- **Laws:**
  - (L1) semua level terselesaikan;
  - (L2) level yang sengaja dirusak (dinding menutup jalan) → exit 1;
  - (L3) masuk `tools/ci-verify.sh`, durasi <60 s.
- **Usaha:** M.
