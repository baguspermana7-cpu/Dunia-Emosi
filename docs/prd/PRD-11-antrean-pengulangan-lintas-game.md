# PRD-11 Antrean pengulangan lintas game **[ANAK]**

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #11
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - `games/data/review-queue.js`: item salah → jadwal 1/3/7 hari per avatar;
  - gerbang soal (peti tanya Timmy, gerbang edu Mojo, Kuis) mengambil satu item jatuh tempo dulu;
  - item disajikan dengan gambar berbeda bila generator mendukung.
- **Laws:**
  - (L1) dengan jam tiruan, item salah hari ini muncul di game lain besok;
  - (L2) tidak lebih dari 1 dari 3 soal berasal dari antrean;
  - (L3) benar → pindah ke 3 hari, lalu 7 hari, lalu keluar;
  - (L4) antrean per avatar.
- **Usaha:** M.
