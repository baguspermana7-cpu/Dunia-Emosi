# PRD-39 Bank soal besar untuk game tipis [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** live v64.65
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

## Hasil (2026-11-20, v64.65)
- Ducky Volley (g20), Pokemon Birds (g19) and Balapan Kereta Side (g14s, new: a question at each of the 4 station
  signs, +5 coins when right, the race paused like an obstacle puzzle) ask from the shared SoalEngine through
  `games/data/soal-arcade.js` (profile `arkade`: kid-safe packs, six topics, grade from the child's DuniaMastery
  tiers on every question). The page banks stay as the fallback.
- First screen stays light: `games/data/soal-arcade-boot.js` loads the ten files of the stack on the child's first
  tap (ready 155-997 ms later in headless, 3 sizes x 3 pages). Requests on the first screen: +1 per page (Ducky
  37 -> 38 on the same tree without PRD-39; baseline raised to 38). Before the loader the stack cost +10 requests and
  +87 kB on Birds.
- Gate `tools/qa-soal-arcade.mjs` (node, in `tools/ci-verify.sh`), 42 checks. Red: the v64.63 tree fails at load
  (0/1); planted defects (`QA_PLANT=1`) fail L4.
  - L1: 10 rounds x 20 seeds = 153 distinct questions per game (law >= 100).
  - L2: 200 answer events for 200 questions per game, 0 skill labels fall to "Lainnya".
  - L3: strong vs weak simulated child, grades after 15 questions 3 vs 1.
  - L4: 0 defective questions served; emoji gate 0 emoji in the DOM on the three pages; the question card looked at
    at 390x844, 844x390 and 800x1280 on all three pages.
- Bank fix: "Ja-ka-rta" -> "Ja-kar-ta" (syllable question in `g23-question-engine.js`).
- Pre-existing, not from this PRD: `qa-g14-side-backdrop` fails on v64.63 too.
