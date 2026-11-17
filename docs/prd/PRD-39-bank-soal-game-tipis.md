# PRD-39 Bank soal besar untuk game tipis [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** belum mulai
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:**
  - Ducky Volley hanya 14 soal tetap (`games/ducky-volley.html:182-190`), termasuk emoji di teks soal;
  - Balapan Kereta Side tanpa soal sama sekali;
  - G19 Birds 72 soal; G24 sudah memakai `games/data/g23-question-engine.js`.
- **Desain:** Ducky dan G19 memanggil `g23-question-engine.js` (seperti G24) dengan tier dari `DuniaMastery` (PRD-10). Side Race mendapat gerbang soal di stasiun (pakai mesin soal yang dipakai Balapan Kereta). Soal tanpa emoji; gambar lewat `EmojiMap`/sprite yang ada.
- **Laws:**
  - (L1) simulasi 10 ronde × 20 seed: ≥ 100 soal berbeda di Ducky dan G19;
  - (L2) tiap jawaban memancarkan `DuniaBus 'answer'` dengan skill yang ada di `skills.js`;
  - (L3) anak simulasi kuat vs lemah mendapat tier berbeda dalam 15 soal;
  - (L4) 0 emoji tak terpetakan (gate emoji); screenshot gerbang soal 3 ukuran dilihat.
- **Usaha:** S-M.
