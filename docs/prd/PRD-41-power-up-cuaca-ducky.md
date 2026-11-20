# PRD-41 Power-up dan cuaca untuk Ducky Volley [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** live v64.70
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

## Hasil (v64.70, 2026-11-20)

**Diukur dulu:**
- Ducky Volley sudah punya 4 power-up lewat kepiting (bola besar, turbo, super lompat, bola lambat). Power-up itu hilang di setiap poin, karena `resetRound` menghapusnya. Akibatnya power-up hampir tidak pernah terasa.
- Label HUD power-up memakai emoji (🔴🔵🟢🟡).

**Yang berubah:**
- **Power-up dari jawaban.** Jawaban benar di kuis antar-set memberi power-up bergilir: Bola Besar, Super Lompat, Bola Lambat (15 s), ditandai pita "Bola Besar!".
  - Jawaban salah tidak memberi apa pun.
  - Power-up kini habis menurut timernya sendiri, tidak lagi hilang di poin pertama.
  - Label HUD tanpa emoji.
- **Cuaca per set.** Set 1, 2 dan 3 bergiliran cerah, angin dan hujan. Urutannya bergantung pada level, jadi setiap match punya lebih dari satu cuaca.
  - Angin mendorong bola ke samping (`WIND_ACC` 0,005 px/frame²), arahnya bergantian. Prediksi CPU ikut membaca angin.
  - Hujan hanya tampilan, lewat `WeatherFX` dengan `badge:false`, karena badge bawaannya memakai emoji.
  - `weather-fx.js` dimuat hanya saat set berangin atau hujan (lewat `DuniaLoad`) dan ikut precache SW.
  - Label HUD dan banner ronde menyebut cuacanya ("Round 2/3 · Angin \u2192").
- **Gerak dikurangi:** tidak ada hujan atau garis angin yang bergerak. Label tetap menyebut cuacanya.

**Bukti (`tools/qa-prd41-ducky.mjs`, `run-gates --tag ducky`), 11/11:**

| Law | Hasil |
|---|---|
| L1 10 level × 3 set | Tiap match punya ≥ 2 cuaca; cerah, angin dan hujan semua muncul. Ketukan sungguhan benar, benar, benar, salah → big, jump, slow, tidak ada |
| L2 angin tidak membuat set mustahil | Bot menjalankan `gameLoop` asli frame demi frame, 3 seed × 150 s waktu game per kondisi. Tenang 86 % (80/93), angin ke kanan 89 % (101/113), angin ke kiri 91 % (51/56); law ≥ 80 % |
| L3 gerak dikurangi | Set hujan: tidak ada kanvas hujan, label "Hujan". Gerak normal: kanvas ada |
| L4 screenshot 3 ukuran dilihat, 0 galat | 390×844, 844×390 dan 800×1280 |

**Merah di kode lama:** tidak ada `__g20`, cuaca maupun power-up dari jawaban. Satu run bot memang berayun ±8 poin (tenang 80–88 %), karena itu 3 seed digabung.

**Regresi:**
- `qa-ducky-parallax` PASS;
- perf ducky lulus (38 request);
- `qa-soal-arcade` 42/42;
- `qa-endgame-hang` ALL PASS.

**Catatan mata:** garis merah diagonal di kiri sudah ada sebelumnya (juga di set cerah) dan bukan bagian perubahan ini.
