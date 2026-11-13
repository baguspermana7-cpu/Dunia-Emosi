# PRD-23 Indikator siap luring per game

- **Gelombang:** Gelombang 2 — pengalaman anak & orang tua
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #23
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - tiap game punya daftar aset wajib (dari precache SW);
  - beranda menampilkan lencana kecil "siap" (ikon, bukan emoji) bila semua ada di cache;
  - tombol orang tua "unduh semua" saat online.
- **Laws:**
  - (L1) cache dihapus satu aset → lencana hilang untuk game itu saja;
  - (L2) setelah "unduh semua" + offline → semua game dengan lencana bisa dimulai (gate offline per game).
- **Usaha:** M.
