# PRD-15 Gate instruksi tanpa pendamping

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #15
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Laws:**
  - (L1) gate `tools/qa-instruction-companion.mjs` menghitung per game teks instruksi >40 karakter yang terlihat tanpa sprite/ikon/klip suara dalam 120 px;
  - (L2) angka awal disimpan di `tools/qa-out/instruction-baseline.json`; gate gagal bila angka **naik** (ratchet);
  - (L3) merah dibuktikan: menyisipkan satu paragraf polos di satu game → gagal.
- **Hasil:** daftar ini menjadi input PRD-14.
- **Usaha:** S.
