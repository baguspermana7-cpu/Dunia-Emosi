# PRD-24 Penghangatan cache Timmy yang sopan

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #24
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** `timmy-kapal.js` `warm()` memvalidasi ulang semua aset tk-* dengan `cache:'no-cache'` setiap halaman dibuka, saat anak bermain.
- **Laws:**
  - (L1) ukur dulu di headless dengan CPU 4x + jaringan "Fast 3G": jumlah request warm selama 30 s pertama dan jeda ketuk p95 dengan dan tanpa warm;
  - (L2) setelah perbaikan, buka halaman kedua kali → 0 request warm ke jaringan untuk aset yang sudah di cache (validasi pakai SW cache, bukan `no-cache`);
  - (L3) offline gate `qa-tk-offline` tetap lulus.
- **Kalau L1 menunjukkan tidak ada beban** → PRD ditutup dengan angka, tanpa ubah kode.
- **Usaha:** S.
