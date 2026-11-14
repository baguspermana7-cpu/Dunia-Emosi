# PRD-08b Bus di semua game soal

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** dikerjakan 2026-11-14 (lihat "Hasil")
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #8
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** hanya 3 pemancar. #10, #11, #13 dan #20 butuh data dari game lain.
- **Desain:**
  - tambah `DuniaBus.emit('answer', {game, domain, skill, item, ok, tries, ms})` + `level:start/end` di game yang punya soal: gerbang edu Mojo, `g23-question-engine`, `soal-engine`, `berhitung-engine`, lokomotif huruf;
  - peta skill di `games/data/skills.js` (id skill + label id-ID + domain), memakai `MATH-DIFFICULTY-STANDARD.md` untuk matematika.
- **Laws:**
  - (L1) gate memainkan satu level skrip di tiap game soal → jumlah `answer` = jumlah soal yang dijawab;
  - (L2) setiap `skill` ada di `skills.js`;
  - (L3) tk-play dan gate tiap game tetap lulus.
- **Usaha:** M.

## Hasil (2026-11-14)
**Pemancar baru** (satu catatan per soal, setelah soal selesai):
- `games/kereta-quiz.js`: soal cerita Kereta Pemberani; domain dari pack, skill = jenis soal.
- `games/mojo-chase-quiz.js`: Kotak Soal saat kejar-kejaran Mojo, termasuk soal cepat setelah tabrakan.
- `games/mojo-learn.js`: Belajar Bersama Mojo. Satu catatan per ronde, dengan domain `bahasa` atau `inggris`.

**Halaman:** `kereta-maze.html` dan `mojo-swoptops.html` kini memuat `dunia-bus.js` + `learning-log.js`.

**Peta skill:** dari rencana awal `skills.js` terpisah, peta skill akhirnya diletakkan di tabel `SKILL` / `DOMAIN` `learning-log.js` yang sudah ada dan sudah dipakai dasbor:
- skill baru: `plus`, `join`, `minus`, `compare`, `max`, `min`, `pattern`, `series`, `shape`, `awal`, `susun`, `gambar`, `pasang`;
- domain baru: `inggris`.
- Tidak ada skill yang jatuh ke "Lainnya".

**Gate `tools/qa-bus-coverage.mjs`** (ketukan sungguhan):
- merah terhadap situs live v64.43: 4 lulus / 8 gagal;
- kode baru: 12/12.

**Belum:** soal-soal di dalam `index.html` (G23/G24 dan game lama di `game.js`), gerbang edu di embed Mojo (tanpa save-engine = tanpa anak), dan lokomotif huruf.
