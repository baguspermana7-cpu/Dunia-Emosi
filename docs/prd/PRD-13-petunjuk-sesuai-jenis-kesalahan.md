# PRD-13 Petunjuk sesuai jenis kesalahan **[ANAK]**

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** live v64.50
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

## Hasil (2026-11-14, v64.50)

- `games/data/error-kinds.js` (`DuniaErrorKinds`): **meleset satu** (semua bentuk soal angka) dan **tanda tertukar**
  (+ dikerjakan −, − sebagai +, × sebagai +, ÷ sebagai ×; hanya bentuk `standard`/`word`, karena di situ atom = soal yang
  tampil). Selain itu: kalimat umum — tidak ada petunjuk keliru.
- Petunjuk: bilah angka empat kotak (jawaban hijau dengan panah, pilihan anak merah) atau tanda operasi besar + kalimat
  pendek, diucapkan (id-ID) bila suara aktif. Jenisnya masuk `hint` di LearningLog (`recent()` kini membawa `hint`).
- Dipakai di Kuis Matematika; jeda setelah salah 1,25 → 2,4 s bila petunjuknya spesifik.
- **Gate `qa-error-kinds`:** L1 tabel 8 kesalahan → petunjuk benar; L2 8400 pilihan salah, 3046 dapat petunjuk
  spesifik, 0 keliru, 0 "tanda tertukar" pada soal yang ditampilkan terbalik. Mutasi (penjaga bentuk dibuang) → 120
  petunjuk keliru → gagal. Browser 3 ukuran: ketukan salah satu angka → kartu terlihat utuh, jenis tercatat di log,
  soal berikutnya membersihkannya.
- **Ditemukan saat melihat screenshot:** versi pertama kartu terpotong oleh kartu soal (overflow) — bilah angka hilang,
  teks terpotong — padahal gate pertama lulus (hanya mengecek kotak di dalam layar). Gate kini memeriksa tiap bagian
  kartu dengan `elementFromPoint`; versi lama → merah di 3 ukuran; kartu dipindah ke halaman (fixed, tepat di atas
  kartu soal).
- **Belum:** b/d dan p/q (game bahasa) dan kiri/kanan di papan Timmy — tidak ada konsumen yang sudah mencatat pilihan
  salahnya dalam bentuk yang bisa digolongkan; dicatat.
