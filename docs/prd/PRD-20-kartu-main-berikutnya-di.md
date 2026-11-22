# PRD-20 Kartu "main berikutnya" di hub **[ANAK — hal baru di menu]**

- **Gelombang:** Gelombang 1 — lingkar belajar (inti produk)
- **Status:** live v64.80 (2026-11-22)
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

## Hasil (v64.80, 2026-11-22)

- `games/data/skill-games.js` (SkillGames): MAP nama skill (learning-log.js SKILL) -> game; GAMES id game -> tile hub.
  Kartu `#next-card` di `#screen-menu`: gambar = salinan tile game itu sendiri (sprite, tanpa emoji), nama game,
  tombol main; ketuk = klik tile itu (jalur buka yang sama). Suara "Ayo main <nama>!" sekali per anak dan game per
  kunjungan halaman (DuniaSpeak; suara mati = diam).
- Pilihan: skill terlemah (rasio benar terkecil, >= 5 jawaban, 14 hari) yang punya game belum dimainkan hari ini;
  tidak ada -> game aman (SAFE), dipilih dari anak + tanggal (sama sepanjang hari).
- `learning-log.js`: `dunia-played-day` (per avatar) dari `level:start`; `playedToday()` = itu + game dengan jawaban
  hari ini di log (halaman game tanpa DuniaLevel tetap terhitung).
- Gate `tools/qa-prd20-next.mjs` (CI smoke): merah 0/10 pada pohon lama, hijau 10/0.
