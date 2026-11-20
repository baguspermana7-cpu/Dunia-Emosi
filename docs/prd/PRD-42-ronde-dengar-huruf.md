# PRD-42 Ronde "dengar" untuk game huruf + bank G11 besar [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** live v64.71
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** G3, G7, G8, G13c semuanya "pilih huruf/kata dari 3-4 tombol" (duplikat). G3 hanya 41 item. G11 Kuis Sains 94 soal padahal `TKQuestions` punya 713 item (domain matematika, umum, arab, logika, islam).
- **Desain:** ronde baru "dengar lalu pilih" memakai klip di `assets/spelling/audio` (sudah ada); diselipkan tiap ronde ke-3 di G3/G8. G11 mengambil soal `umum`/`logika` dari `TKQuestions` dengan tier penguasaan.
- **Laws:**
  - (L1) G3/G8: ronde dengar muncul dan klipnya ada (0 404) dan berbunyi offline;
  - (L2) G11: ≥ 300 soal berbeda tersedia; 20 sesi simulasi tanpa soal kembar dalam satu sesi;
  - (L3) bus `answer` dipancarkan; screenshot dilihat.
- **Usaha:** M.

## Hasil (v64.71, 2026-11-20)

**Diukur dulu:**
- Klip `assets/spelling/audio` berbahasa Inggris. Hasil ASR di `verified.json`: huruf "U" terdengar "You", "Y" terdengar "Why". G3 dan G8 memakai kata Indonesia, jadi klip itu tidak cocok.
- `TKAudio` (klip id-ID Timmy) dirujuk kode tapi tidak ada di repo.
- Karena itu, ronde dengar memakai suara Indonesia perangkat lewat `DuniaSpeak`. Ronde itu hanya dimainkan bila suara aktif dan perangkat punya suara id-ID.
- Tanpa suara id-ID, ronde tetap ronde biasa, jadi tidak ada anak yang menatap speaker yang diam.
- Ini menyimpang dari desain ("klip yang sudah ada") dan dicatat di sini.

**Yang berubah:**
- **G3 Huruf Hutan:** ronde ke-3 di bagian huruf menjadi "Dengar suaranya, lalu ketuk hurufnya".
  - Tombol speaker besar (ikon SVG, bukan emoji).
  - Perangkat mengucapkan "Huruf C". Mengetuk speaker mengulanginya.
  - Pelat hewan disembunyikan; kalimat pemandu berganti.
- **G8 Susun Kata:** kata ke-3 diucapkan, bukan ditampilkan sebagai gambar. Anak menyusun kata yang didengar.
- **G11 Kuis Sains:**
  - Bank soal: 102 soal sains + 309 soal `umum`/`logika` dari `TKQuestions` = **411 soal berbeda** (sebelumnya 102).
  - Soal Timmy tampil dengan gambarnya sendiri dari `assets/db/lib`, dan pilihannya diacak (jawaban Timmy sering di posisi pertama).
  - Yang dibuang: soal yang butuh renderer lain (pics, listen, letters, swatch, seq, Arab) dan 22 soal yang menyebut gambar tanpa membawa gambar.
  - Tidak ada soal kembar dalam satu sesi.
  - `tk-questions.js` dimuat saat G11 pertama dibuka (sudah ada di precache SW).
- **Bus:** jawaban G3, G8 dan G11 dipancarkan ke DuniaBus (`bahasa/awal`, `bahasa/susun`, dan klasifikasi teks untuk G11).

**Bukti (`tools/qa-prd42-listen.mjs`, `run-gates --tag listen`), 15/15:**

| Law | Hasil |
|---|---|
| L1 G3/G8 ronde dengar | Di 3 ukuran: ronde 1–2 biasa, ronde 3 dengar; diucapkan "Huruf C\|id-ID", "cuci\|id-ID"; speaker mengulang. Tanpa suara id-ID: 0 ronde dengar |
| L2 G11 ≥ 300 soal | 411 soal berbeda; 101 gambar, 0 hilang di disk; 20 sesi tanpa soal kembar dan setiap jawaban adalah pilihan |
| L3 bus + mata | G3 3 jawaban, G8 3, G11 ketukan benar dilapor; 0 galat; screenshot G3, G8 dan G11 di 3 ukuran dilihat |

**Pemecahan hub:** `qa-hub-split` memastikan `game.js` hanya boleh menyusut, dan tambahan PRD ini melewati batas (11135 > 11067). Seluruh bagian G11 Kuis Sains (bank + logika, 256 baris) dipindah ke `games/hub/g11-kuis-sains.js`, dengan pola yang sama seperti `g14-g16-trains.js`: dimuat setelah `game.js`, token sama, dan ikut precache. `game.js` sekarang 10880 baris dan batasnya diturunkan ke angka itu. `qa-hub-split` 14/14, `qa-hub-boot` 13/13, `qa-app-offline` ALL PASS.

**Merah di kode lama:** tidak ada `#g3-listen`, `#g8-listen` maupun `g11AllQuestions`; bank G11 hanya 102 soal.

**Regresi:**
- `qa-landscape-choices` pass;
- perf index lulus (soal Timmy tidak dimuat di layar pertama);
- `qa-prd08c-bus` 42/42.

**Belum dibuktikan:** "berbunyi offline" tidak bisa diuji di headless. Suara perangkat bersifat lokal, tapi tidak semua tablet punya suara id-ID, dan untuk itulah syarat `duniaCanListen` ada.

**Temuan lama, tidak diubah:** di landscape, toast pencapaian ("Bintang Pertama") menutupi tombol pilihan G3 sebentar setelah jawaban benar pertama.
