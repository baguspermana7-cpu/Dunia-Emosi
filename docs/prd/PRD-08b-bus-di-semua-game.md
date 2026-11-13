# PRD-08b Bus di semua game soal

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** belum mulai
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
