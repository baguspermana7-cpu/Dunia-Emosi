# PRD-34 Diet unduhan: gambar malas, audio saat perlu

- **Gelombang:** Gelombang 4A — performa & kelancaran
- **Status:** live v64.62
- **Sumber:** `docs/audit/perf-survey-2026-11-17.md` (alat `tools/qa-perf-survey.mjs`, CPU 4x, 390x844, dua run)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah (terukur, penyebab dicek di kode):**
  - `gym-pokemon.html:3004-3008`: thumbnail 36 px memuat webp 630 px tanpa `loading=lazy` → 9,6 dari 10 MB.
  - `lokomotif-pemberani.html:3551-3560`: 375 gambar kartu tanpa lazy; `:263`/`:266` `preload="auto"` 650 KB mp3.
  - `ducky-volley.html:73` (1,8 MB) dan `mobil.html:89` (1,7 MB) `preload="auto"` musik → ~80 % berat halaman.
  - `games/hub/g14-g16-trains.js:613-617`: tiga `new Audio()` saat hub dimuat (~650 KB) untuk game yang belum dibuka.
  - `games/tk-story.js:105`: thumbnail cerita Timmy memakai webp scene penuh (~2,4 MB di layar pertama).
- **Desain:**
  - gambar di luar layar: `loading="lazy" decoding="async"` + `width/height`;
  - thumbnail kecil: pakai varian kecil bila sudah ada di `assets/` (cek dulu); bila tidak ada, buat sekali dengan skrip (PIL, tanpa colour-key, tanpa outline) ke folder `thumb/`, dan precache tetap benar;
  - musik: `preload="none"`, `load()` saat tombol mulai (gesture pertama tetap memutar musik);
  - hub G14: `new Audio()` dipindah ke fungsi buka G14 (lazy, sekali).
- **Laws:**
  - (L1) byte layar pertama (gate PRD-33): gym ≤ 2 MB, lokomotif ≤ 2 MB, ducky ≤ 0,6 MB, mobil ≤ 0,6 MB, hub turun ≥ 600 KB, timmy turun ≥ 1,5 MB;
  - (L2) musik tetap berbunyi: gate memalsukan `HTMLMediaElement.play` dan memastikan musik dipanggil ≤ 500 ms setelah ketukan mulai di 4 halaman itu;
  - (L3) gambar thumbnail tampil (screenshot dilihat, 0 gambar rusak: `naturalWidth>0` setelah scroll);
  - (L4) gate offline game itu tetap lulus (aset baru masuk precache);
  - (L5) bila sprite berubah, token game1 ikut naik.
- **Usaha:** M.

## Hasil (2026-11-18, v64.62)
- First-screen MB (qa-perf-survey, 390x844, CPU 4x): gym 9.99 -> 1.03, lokomotif 4.84 -> 1.68, ducky 2.27 -> 0.49,
  mobil 2.26 -> 0.57, hub 2.30 -> 1.67, timmy 3.10 -> 1.30.
- How: 1024 Pokemon thumbs at 96 px (`assets/Pokemon/pokemondb_hd_alt2/thumb/`, `tools/make-poke-thumbs.py`) for 36-48 px
  chips, falling back to the HD sprite; lazy train-card images in Lokomotif; `preload="none"` on game music (bytes move on
  `play()`); the G14 hub audio objects are created on first use; Timmy carousel / ship list / story-strip backdrops paint
  when within reach of the viewport (IntersectionObserver, disconnected on story finish/destroy).
- Gates: `qa-music-on-start` (4 games call `play()` within 500 ms of the start tap; red with the call removed: 4 x
  "NEVER CALLED"), `qa-prd34-thumbs` (0 broken thumbs), `qa-perf-budget` (6 pages, all at or below the PRD-33 baseline).
- A/B against HEAD on the same loaded machine: board-look, cinema, steer, ui-audit and games-pwa fail on HEAD too
  (perf medians, timeouts, the known `mojo-highway.mp3` miss). `qa-tk-story-art` hung only on the new tree: it waited
  for every `<img>` load and the strip thumbs are lazy now; the gate waits for eager images (stage sprites) only.
- Frame A/B (gym, timmy): no regression shown; gym runs reached different screens (old tapper stuck on the menu).
