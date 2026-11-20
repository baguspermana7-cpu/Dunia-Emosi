# PRD-40 Bos tiap 10 level (Birds, G23, Bawah Laut) [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** live v64.69
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** level 1 dan level 20 terasa sama di G19, G23, G24. G10 sudah punya pola bos (`game.js:6371`, `:6384` `boss:true`, kolam spesies `boss` di `:6257`) dan efek ledakan VFX.
- **Desain:** level kelipatan 10 = bos: lawan besar dengan bar HP, 3 fase soal (lebih sulit satu tier tiap fase), perayaan besar saat menang. Pakai pola dan kolam bos G10, tanpa aset baru.
- **Laws:**
  - (L1) level 10/20/30 memanggil mode bos, level lain tidak;
  - (L2) bos selalu bisa dikalahkan (simulasi jawaban benar 70 % → menang ≤ 3 menit);
  - (L3) kalah bos tidak menghapus progres level;
  - (L4) screenshot bos di 3 ukuran dilihat; survey frame tidak memburuk.
- **Usaha:** M.

## Hasil (v64.69, 2026-11-20)

**Modul bersama `games/data/boss-round.js`** (`window.BossRound`), dipanggil di awal `showWin()` G19 Pokemon Birds, G23 Pokemon Run dan G24 Bawah Laut.

**Bos:**
- Level kelipatan 10 berakhir dengan bos yang beranimasi (GIF `assets/Pokemon/showdown-ani`, tanpa aset baru).
- Bos per game, bergilir tiap 10 level:
  - Birds: Lugia, Eternatus, Mega Gyarados;
  - Run: Eternatus, Lugia, Mega Gyarados;
  - Bawah Laut: Mega Gyarados, Mega Sharpedo, Wailord, Kingdra.
- Layar bos: bar HP, 3 fase × 3 jawaban benar. Tiap fase mengambil soal dari bank game itu sendiri dengan level lebih tinggi (+8 di Birds/Bawah Laut, +5 di Run).
- Teks soal dan tombol memakai `renderQuestionText` dan `paintColourChoice` milik game: emoji menjadi gambar, warna menjadi swatch.

**Umpan balik:**
- Benar: bos kena pukul (`HitFeel` bila ada, kilat putih, percikan VFX) dan bar HP turun.
- Ganti fase: banner "Fase N!" dan bos membesar sebentar.
- Salah: bos menyerang (guncang), tidak ada yang diambil, soal berikutnya datang.
- Menang: banner "Bos kalah!" dan `VFX.Moment.celebrate`, lalu layar menang game seperti biasa.

**Aturan lain:**
- Tidak ada kondisi kalah, jadi bos selalu bisa dikalahkan.
- Jawaban dilapor ke learning log (`DuniaAnswerQ`, PRD-08c).
- Level disimpan hanya setelah bos jatuh.

**Bukti (`tools/qa-prd40-boss.mjs`, `run-gates --tag boss`):**

| Law | Hasil |
|---|---|
| L1 level 9 → langsung layar menang + 1 simpan; level 20 → bos muncul | 3/3 game |
| L2 anak 70 % benar (seed, ketukan sungguhan) menang ≤ 3 menit, 3 fase dimainkan | 35–75 s, 9 benar dari 13–17 ketukan, di 3 ukuran × 3 game |
| L3 0 simpan selama bos; keluar di tengah bos → progres tersimpan sama persis; setelah bos tepat 1 simpan (`g19:10`, `g23:10`, `g24:10`) lalu layar menang | 3/3 game, 3 ukuran |
| L4 0 galat halaman; screenshot dilihat | 9/9 |

Kode lama tidak punya `BossRound`, jadi L1 merah (level 10 langsung menang).

**L4 (mata):**
- Putaran pertama: HUD game tembus di belakang overlay dan GIF diperbesar sampai kabur.
- Perbaikan: latar overlay dibuat buram penuh, dan tinggi bos dibatasi 2,4× ukuran asli sprite.

**Biaya:**
- `boss-round.js` dimuat hanya saat level bos selesai, lewat `DuniaLoad` di `save-engine.js`. Level lain tidak mengirim request tambahan.
- Perf ketiga halaman lulus: 128 request untuk 3 halaman, tanpa ✗.
- File itu ikut precache SW, jadi bos juga jalan offline.
- Bila file gagal dimuat, level bos berakhir sebagai menang biasa: 1 simpan, tanpa loop. Dibuktikan dengan memblokir request (L1b, 3/3 game).

**Regresi:**
- `qa-prd38-depth` 14/14;
- `qa-prd08c-bus` 42/42;
- `qa-endgame-hang` ALL PASS.
