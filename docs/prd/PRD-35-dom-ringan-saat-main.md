# PRD-35 DOM ringan dan frame stabil saat main

- **Gelombang:** Gelombang 4A — performa & kelancaran
- **Status:** belum mulai
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
