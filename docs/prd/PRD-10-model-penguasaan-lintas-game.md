# PRD-10 Model penguasaan lintas game **[ANAK — mengubah tingkat soal]**

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** inti + Timmy dikerjakan 2026-11-14; generator Kuis/kereta belum memakai tingkat
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #10
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - angkat `TKQuiz.mastery` (`tier`, `levelFor`, `update`) ke `games/data/mastery.js`;
  - skor per skill per avatar diturunkan dari `LearningLog` (Elo sederhana, target peluang benar 70–80%);
  - Timmy memakai modul bersama, dengan migrasi skor domain lama;
  - generator (`soal-engine`, `soal-gen-matematika`, `g23-question-engine`, `tk-quiz`) menerima `targetDifficulty`;
  - mulai dari matematika.
- **Laws:**
  - (L1) simulasi anak lemah vs kuat (20 seed) → tingkat berbeda dalam 15 soal;
  - (L2) tingkat benar anak simulasi stabil 65–85%;
  - (L3) skor dari Kuis terbaca di Timmy (lintas game);
  - (L4) skor Timmy lama termigrasi, tidak turun;
  - (L5) avatar A tidak mengubah B.
- **Gate:** `tools/qa-mastery.mjs` (node vm + jam tiruan) + satu jalur browser.
- **Usaha:** L.

## Hasil (2026-11-14)
**Modul `games/data/mastery.js` (`DuniaMastery`)** — skor 0–100 per domain per anak, diisi dari setiap jawaban di bus. Dimuat di index, Kuis, Ayo Berhitung, Timmy, kereta-maze dan mojo-swoptops, dan di-precache.

**Aturan:** benar di percobaan pertama +K, selain itu −3K. Titik setimbangnya 75 % benar. K mulai 10 dan turun ke 3 setelah 21 jawaban.

**Temuan (L5):** aturan `TKQuiz.mastery` lama (+5 / −3) setimbang di sekitar 35–41 % benar. Anak tiruan berkemampuan sedang hanya benar 41 % di Timmy, dan 75 % dengan aturan bersama.

**Timmy:**
- tingkat soal kini diambil dari `DuniaMastery` (`masteryNow()` di empat tempat);
- skor Timmy lama di-seed sekali sebagai lantai (`S.migrated.mastery1`), jadi tidak ada yang hilang.

**Gate `tools/qa-mastery.mjs`** (node, `ci-verify.sh`), 10 law:
- L1: anak kuat di atas anak lemah setelah 15 soal (20/20 seed);
- L2: 75–76 % benar untuk tiga kemampuan, ≥ 65 % untuk anak di atas tingkat tertinggi;
- L3: drift nol di 75 %;
- L4: per anak, dan seed tidak pernah menurunkan skor;
- L6: lihat PRD-19b.
- Mutasi −3K → −K: L2 merah (51–54 %).

**Gate browser** `qa-bus-coverage` L5: 4 jawaban benar sungguhan di Kuis menaikkan skor bersama dari 10, dan Timmy yang dibuka sesudahnya membaca skor yang sama.

**Belum:**
- Kuis Matematika dan soal kereta/Mojo memilih tingkat sendiri (pilihan level / pack), belum dari `DuniaMastery`. Mengubahnya mengubah alur anak di game itu; dikerjakan sebagai lanjutan.
- Skor per skill (bukan hanya per domain).
