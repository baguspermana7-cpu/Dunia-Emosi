# PRD-26 Potong padding sprite

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #26
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** `assets/db/people/003.webp` berukuran 200×200, isinya hanya 48×70.
- **Desain:**
  - skrip `tools/trim-sprite-padding.py` (PIL, bbox alpha + margin seragam 4%), dijalankan per pack dengan `--dry-run` dulu (laporan rasio isi);
  - sprite beranimasi (sheet) dikecualikan lewat daftar.
  - Ingat jebakan: tanpa colour-key global.
- **Laws:**
  - (L1) gate `tools/qa-sprite-fill.mjs` → rasio isi ≥60% untuk pack yang diproses (merah sekarang di `people/`);
  - (L2) screenshot halaman yang memakai pack itu: ukuran tampil sama atau lebih besar, tidak terpotong — saya lihat;
  - (L3) token game1 ikut naik.
- **Usaha:** S–M.
