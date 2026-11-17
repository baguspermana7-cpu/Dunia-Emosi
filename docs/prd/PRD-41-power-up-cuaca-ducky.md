# PRD-41 Power-up dan cuaca untuk Ducky Volley [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** belum mulai
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** Ducky Volley punya satu mekanik (paling tipis bersama Side Race). `sfxPowerup` sudah ada (`ducky-volley.html:152`) tapi tidak ada power-up. `games/data/weather-fx.js` sudah ada.
- **Desain:** 3 power-up (bola besar, lompat tinggi, lambat) muncul setelah jawaban benar; cuaca per set (cerah, angin menggeser bola sedikit, hujan visual saja) lewat `WeatherFX`.
- **Laws:**
  - (L1) 10 set simulasi: ≥ 3 power-up berbeda muncul; ≥ 2 cuaca berbeda;
  - (L2) angin tidak membuat set mustahil (simulasi pemain bot tetap bisa memukul ≥ 80 % bola);
  - (L3) gerak-dikurangi mematikan hujan partikel;
  - (L4) screenshot 3 ukuran dilihat.
- **Usaha:** M.
