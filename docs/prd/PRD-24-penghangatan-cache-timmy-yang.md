# PRD-24 Penghangatan cache Timmy yang sopan

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** dikerjakan 2026-11-14 (lihat "Hasil")
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #24
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** `timmy-kapal.js` `warm()` memvalidasi ulang semua aset tk-* dengan `cache:'no-cache'` setiap halaman dibuka, saat anak bermain.
- **Laws:**
  - (L1) ukur dulu di headless dengan CPU 4x + jaringan "Fast 3G": jumlah request warm selama 30 s pertama dan jeda ketuk p95 dengan dan tanpa warm;
  - (L2) setelah perbaikan, buka halaman kedua kali → 0 request warm ke jaringan untuk aset yang sudah di cache (validasi pakai SW cache, bukan `no-cache`);
  - (L3) offline gate `qa-tk-offline` tetap lulus.
- **Kalau L1 menunjukkan tidak ada beban** → PRD ditutup dengan angka, tanpa ubah kode.
- **Usaha:** S.

## Hasil (2026-11-14)
**L1, diukur dulu.**
- Probe dengan server sendiri yang menghitung setiap request. Kondisi: GPU, CPU 4x, halaman dibuka ketiga kalinya dengan semua aset sudah di cache.
- Dengan warm: 692 request ke server dalam 30 s, 31 long task (2130 ms).
- Tanpa warm: 91 request, 18 long task (1735 ms).
- Sebabnya: service worker memakai stale-while-revalidate (`sw.js` `assetCacheFirst`), jadi setiap `fetch` dari warm dijawab dari cache **dan** diunduh ulang dari jaringan lalu ditulis ulang ke cache — ~600 berkas setiap kali Timmy dibuka, sementara anak bermain.

**Perbaikan** (`games/timmy-kapal.js` `warm()`): tiap URL dicek dulu dengan `caches.match`; yang sudah ada dilewati. Kunjungan pertama tetap mengunduh semuanya untuk luring.

**Sesudah perbaikan:** dengan warm 91 request (sama dengan tanpa warm), 10 long task.

**Gate `tools/qa-tk-warm.mjs`** (menyajikan repo sendiri karena harus menghitung request; runner, timeout 900 s):
- L1: kunjungan pertama ≥ 300 request aset;
- L2: membuka lagi menambah ≤ 10 request dibanding tanpa warm.
