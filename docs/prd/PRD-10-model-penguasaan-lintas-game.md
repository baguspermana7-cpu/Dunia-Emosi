# PRD-10 Model penguasaan lintas game **[ANAK — mengubah tingkat soal]**

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** belum mulai
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
