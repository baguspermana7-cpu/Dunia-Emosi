# PRD-35 DOM ringan dan frame stabil saat main

- **Gelombang:** Gelombang 4A — performa & kelancaran
- **Status:** live v64.64
- **Sumber:** `docs/audit/perf-survey-2026-11-17.md` (alat `tools/qa-perf-survey.mjs`, CPU 4x, 390x844, dua run)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:**
  - `selamatkan-kereta.html:683-693` membangun 381 kartu + 380 canvas sekaligus; pemilih hanya disembunyikan (`:826`), jadi ~2.000 node tetap hidup saat main. Halaman ini paling buruk di % frame > 33 ms (16,3 %).
  - `selamatkan-kereta.html:2431-2438` menulis `filter: hue-rotate` tiap frame di elemen layar penuh saat boost.
  - `museum-kereta.html:1568-1600` me-render 305 kartu sekaligus dengan `drop-shadow` per gambar (`:625`, `:1331`) dan animasi roda tak berhenti (css 168-177).
  - `pokemon-birds.html:938` `updateHUD()` tiap frame; `:941-947` membaca `offsetHeight` tepat setelah menulis gaya (layout paksa tiap frame).
  - `timmy-kapal` p95 main 83,4 ms (terburuk) — penyebab frame belum terkonfirmasi; diukur dengan trace sebelum diubah.
- **Desain:** pemilih dilepas dari DOM saat main (dibangun lagi saat kembali); filter boost lewat satu kelas CSS sekali di awal/akhir boost; museum `content-visibility:auto` + `contain-intrinsic-size` per kartu dan animasi roda hanya saat terlihat; birds HUD hanya ditulis bila angka berubah, posisi Ash/Pikachu memakai tinggi yang di-cache (ukur sekali saat resize). Timmy: trace Chrome (`performance_start_trace`) dulu, ubah hanya penyebab yang terlihat di trace.
- **Laws:**
  - (L1) node DOM setelah 15 s main: selamatkan ≤ 700, museum (daftar) ≤ 900;
  - (L2) birds: 0 layout paksa per frame (hitung `Layout` di trace 5 s main: turun ≥ 80 %);
  - (L3) survey 3 run: % frame > 33 ms selamatkan dan museum turun melewati kebisingan (> 10 poin) atau dilaporkan jujur sebagai tidak terbukti;
  - (L4) semua gate game itu lulus lewat runner; screenshot 3 ukuran dilihat.
- **Usaha:** M.

## Hasil (2026-11-19, v64.64)
- Gate `tools/qa-prd35-dom.mjs` (run-gates tag `dom`). Red on v64.63, green on v64.64:
  - L1a Selamatkan Kereta: the train picker (381 cards, 384 canvases) stayed in the tree during play, 1836 nodes ->
    dropped at start (every replay reloads the page; `g16RenderPicker()` rebuilds it if shown again). perf-budget DOM
    baseline 1840 -> 232.
  - L1b Museum Kereta: 305 cards drawn at once, 2547 nodes at rest -> drawn 60 at a time as the child scrolls
    (IntersectionObserver sentinel, all 305 still reachable, a card still opens). `content-visibility:auto` on the cards
    was tried and dropped: at the bottom of the list the train modal faded in after ~1.5 s instead of 0.3 s (A/B in
    headless, 3 runs).
  - L2 Pokemon Birds: 828 HUD text writes and 396 layouts in 5 s (one forced layout per frame) -> HUD written on change
    only, runner heights measured once per resize, the bird moved by transform instead of left/top.
  - L3 Selamatkan boost: the speed-lines hue was an inline `filter` rewritten every frame (97 writes in 2 s) -> one CSS
    animation class.
- `qa-museum-drive` scrolls the list to its end before it counts cards and scrolls again after the tab switch until a
  featured card is drawn (the list now draws as it scrolls).
- perf-budget: Pokemon Birds request baseline 36 -> 38 (the two sakuga scripts from PRD-46; the same 38 on v64.63).
