# PRD-20 Kartu "main berikutnya" di hub **[ANAK — hal baru di menu]**

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** belum mulai
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #20
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:** satu kartu besar bergambar di beranda. Aturan: skill terlemah yang punya game, ditambah game yang belum dimainkan hari ini. Ketuk = buka game itu. Tanpa teks wajib; ada suara.
- **Laws:**
  - (L1) log simulasi lemah di pengurangan → kartu menunjuk game pengurangan;
  - (L2) game yang sudah dimainkan hari ini tidak diulang;
  - (L3) avatar tanpa log → kartu game favorit/acak yang aman;
  - (L4) target ≥48 px, kontras lulus PRD-28.
- **Usaha:** M.

## Revisi 2026-11-21 (Gelombang 5, berlaku di atas desain di atas)

- **Prasyarat:** PRD-48 dan PRD-49.
- **Desain:**
  - `games/data/skill-games.js` memetakan skill → game (id + cara buka), diturunkan dari tabel `SKILL`.
  - Catatan harian per avatar `dunia-played-day` diisi dari `level:start`.
  - Pilihan kartu = skill terlemah dengan ≥5 jawaban (`DuniaMastery.scores()` / `LearningLog.bySkill`) yang punya game belum dimainkan hari ini. Avatar tanpa log → game favorit atau acak yang aman.
  - Bentuk kartu: satu kartu besar bergambar (sprite game yang sudah ada), satu kata, dan suara ("Ayo main Hitung Binatang!"). Tanpa emoji.
- **Laws:**
  - L1: log lemah di pengurangan → kartu menunjuk game pengurangan.
  - L2: game yang sudah dimainkan hari ini tidak dipilih (jam tiruan).
  - L3: avatar tanpa log → kartu yang aman.
  - L4: avatar A tidak memengaruhi B.
  - L5: ≥48 px, kontras lulus, 3 ukuran dilihat.
