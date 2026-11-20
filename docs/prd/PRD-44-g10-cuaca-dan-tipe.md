# PRD-44 G10: cuaca nyata dan keunggulan tipe [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** live v64.72
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** cuaca G10 hanya kosmetik; tipe Pokemon tidak berpengaruh. G10, G13, G13b dan Gym Pokemon adalah empat varian "jawab matematika untuk menyerang" yang terasa sama.
- **Desain:** G10 memakai `WeatherFX` untuk cuaca yang terlihat; tipe lawan vs tipe Pokemon anak memberi pengali sederhana (2x / 1x / 0,5x) yang DIUMUMKAN dengan gambar (bukan teks panjang). Membedakan G10 dari tiga saudaranya.
- **Laws:**
  - (L1) tabel uji tipe: 18 tipe × 18 tipe → pengali benar (data dari `pokemon-db.json`);
  - (L2) serangan super efektif menampilkan tanda gambar + bunyi berbeda;
  - (L3) tidak ada pertarungan mustahil (simulasi tipe terburuk tetap menang dengan 80 % benar);
  - (L4) screenshot dilihat.
- **Usaha:** M.

## Hasil (v64.72, 2026-11-20)

**Diukur dulu, dan sebagian masalah PRD ternyata usang:**
- Tipe sudah berpengaruh di G10 sejak lama:
  - `g10Answer` memakai `calcFullMult` (tabel 18×18 versi ramah anak: 1,5 / 1 / 0,75 / 0,5, plus STAB 1,25);
  - `applyHitFeedback` sudah menampilkan "Super Efektif!", bunyi efektivitas, kilat dan ledakan bintang.
- Yang benar-benar hanya kosmetik adalah cuaca. Lebih buruk lagi, G10 menjalankan dua sistem cuaca sekaligus:
  - cuaca Pixi milik G10;
  - `WeatherFX` acak dari `index.html`, dengan badge emoji yang sering menyebut cuaca lain.

**Ditemukan saat membuktikan L3:**
- HP anak tidak pulih antar-musuh. Di level 16–20 dan 29–40 (setiap salah = diserang), anak yang 80 % benar praktis tidak bisa menang, bahkan dengan tipe netral.
- Simulasi Monte Carlo atas tabel `G10_LEVELS` asli, pasangan terburuk, 80 % benar: 0 % menang di level 16–20 dan 29–40.

**Yang berubah:**
- **Cuaca berpengaruh (×1,2 untuk satu atau dua tipe):**
  - cerah: Api;
  - hujan: Air, Listrik;
  - salju: Es;
  - berangin: Terbang;
  - malam: Gelap, Hantu;
  - daun: Tanaman, Serangga.
  - Karena damage bilangan bulat, serangan netral tipe yang diperkuat naik dari 1 ke 2 HP. Tidak ada tipe yang dilemahkan.
- **Pengumuman bergambar:** di awal pertarungan muncul pita "Hujan ▲ [Air] [Listrik]", pil berwarna sesuai `TYPE_COLOR`, tanpa emoji. Pita mengecil ke atas setelah 2,6 s.
- `WeatherFX` tidak lagi dijalankan di layar G10 (G13 dan G13b tidak diubah).
- **Tidak ada pertarungan mustahil:**
  - serangan musuh selalu memakan tepat 1 HP anak. Tipenya tetap terlihat lewat teks dan FX;
  - anak pulih penuh setiap musuh baru datang.
  - Tantangan tetap ada: anak yang 60 % benar masih kalah di level tinggi (4 % menang di level 20, menurut model).
- `applyG10Weather` dipindah ke `games/hub/g10-weather.js`, karena `game.js` hanya boleh menyusut (10880 → 10829 baris).

**Bukti (`tools/qa-prd44-g10.mjs`, `run-gates --tag g10`), 9/9:**

| Law | Hasil |
|---|---|
| L1 tabel 18×18 | Nilai {0,5, 0,75, 1, 1,5}; 14/14 pasangan kanonik benar; 18 tipe di pokemon-db (1024 Pokemon), 0 tidak dikenal |
| L2 tanda + damage | Air ke Api: 2 HP + "Super Efektif!". Listrik netral: 1 HP saat cerah, 2 HP saat hujan (ketukan sungguhan). Pita cuaca dengan 2 pil di 3 ukuran |
| L3 tidak mustahil | Di halaman: serangan Api super-efektif ke Tanaman = 1 HP; musuh berikutnya, anak 3/3. Model 40 level, pasangan terburuk, 80 % benar: terendah 91 % (level 18); law ≥ 85 % |
| L4 mata, 0 galat | Screenshot 390×844, 844×390, 800×1280 dilihat: satu pita cuaca, tanpa chip kedua |

**Merah di kode lama:** tidak ada `g10WeatherMult`/pita; serangan Api ke Tanaman memakan 2 HP; HP tidak pulih; model aturan lama 0 % di level 16+.

**Regresi:**
- `qa-hub-split` 19/19;
- `qa-hub-boot` 13/13;
- `qa-endgame-hang` ALL PASS;
- perf index lulus;
- `qa-landscape-choices` pass.
