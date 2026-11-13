# PRD-13 Petunjuk sesuai jenis kesalahan **[ANAK]**

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #13
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:** pengklasifikasi aturan per domain di `games/data/error-kinds.js`:
  - meleset satu;
  - operasi tertukar;
  - b/d atau p/q terbalik;
  - kiri/kanan tertukar di papan Timmy.

  Tiap jenis → petunjuk gambar yang sudah ada (bilah angka, panah) + kalimat suara pendek. Jenis kesalahan dicatat di field `hint` LearningLog.
- **Laws:**
  - (L1) tabel uji: tiap jenis kesalahan → petunjuk yang benar;
  - (L2) jawaban salah acak → petunjuk umum (tidak ada petunjuk keliru);
  - (L3) screenshot petunjuk di 3 ukuran dilihat.
- **Usaha:** M.
