# PRD-45 Mobil: bantuan, streak lambat, kata lebih banyak [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** belum mulai
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** G6 Mobil dan G15 Lokomotif sama-sama "ambil huruf di jalur", tapi G15 jauh lebih kaya: tawaran bantuan dan streak slow-mo (`app.ticker.speed = 0.55` di `g15AcceptAssist`), set kata lebih besar.
- **Desain:** port mekanik itu ke Mobil (kode yang ada, bukan tulis ulang); set kata dari `SpellingData.WORDS`.
- **Laws:**
  - (L1) 3 salah beruntun → tawaran bantuan muncul (sama aturan G15);
  - (L2) streak 5 → slow-mo 2 s lalu kembali normal;
  - (L3) ≥ 60 kata berbeda; screenshot dilihat; gate Mobil lulus.
- **Usaha:** S-M.
