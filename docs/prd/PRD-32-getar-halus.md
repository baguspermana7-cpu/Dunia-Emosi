# PRD-32 Getar halus

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #32
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** getar hanya di beberapa tempat.
- **Tujuan:** `navigator.vibrate(10)` saat jawaban benar dan menang, lewat konsumen `DuniaBus` (`answer ok`, `level:end win`), mengikuti setelan `dunia-emosi-vibrate`.
- **Laws:**
  - (L1) dengan `navigator.vibrate` dipalsukan: jawaban benar di Kuis memanggil `vibrate(10)` 1×;
  - (L2) setelan `off` → 0 panggilan;
  - (L3) jawaban salah → 0 panggilan.
- **Gate:** `tools/qa-vibrate.mjs`.
- **Usaha:** S.
