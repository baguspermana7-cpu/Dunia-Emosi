# PRD-18 Setelan profil dipakai semua game

- **Gelombang:** Gelombang 2 — pengalaman anak & orang tua
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #18
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - `DuniaProfile` (PRD-19a) menyimpan per avatar: suara, narasi, getar, gerak dikurangi, usia;
  - migrasi dari kunci global `dunia-emosi-sound` / `-vibrate` (`game.js:2172-2209`);
  - game membaca `DuniaProfile.get(key)`; `prefers-reduced-motion` tetap dihormati.
- **Laws:**
  - (L1) avatar A suara off, B on → masing-masing benar di 3 game;
  - (L2) migrasi tidak mengubah apa yang didengar anak saat ini;
  - (L3) gerak dikurangi mematikan shake di Mojo/Timmy/cinema.
- **Usaha:** M.
