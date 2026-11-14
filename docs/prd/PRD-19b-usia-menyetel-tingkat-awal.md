# PRD-19b Usia menyetel tingkat awal

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** live bersama PRD-10
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #19
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:** `DuniaProfile.age()` (PRD-19a) menentukan skor awal penguasaan untuk skill yang belum pernah dijawab.
- **Laws:**
  - (L1) avatar baru 9–10 mulai di tier lebih tinggi dari 5–6;
  - (L2) setelah ≥10 jawaban, bukti jawaban mengalahkan usia.
- **Usaha:** S.

## Hasil (2026-11-14)
`DuniaMastery` memulai domain yang belum pernah dijawab dari pita usia anak (`DuniaProfile.ageTier()`, PRD-19a): 5–6 → 10 (tingkat 1), 7–8 → 40 (tingkat 2), 9–10 → 65 (tingkat 3).

**Gate `qa-mastery.mjs` L6:**
- pita lebih tua mulai lebih tinggi;
- setelah 10 jawaban, jawaban yang menentukan: anak 9–10 yang menjawab lemah ada di tingkat 1–2 (19/20 seed), dan anak 5–6 yang menjawab kuat di tingkat 3–4 (20/20).
- Dengan K awal 8, anak kuat 5–6 baru 16/20. Karena itu K awal dinaikkan ke 10 (PRD-10).
