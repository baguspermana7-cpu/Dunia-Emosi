# PRD-33 Gate anggaran performa per halaman

- **Gelombang:** Gelombang 4A — performa & kelancaran
- **Status:** belum mulai
- **Sumber:** `docs/audit/perf-survey-2026-11-17.md` (alat `tools/qa-perf-survey.mjs`, CPU 4x, 390x844, dua run)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** belum ada gate yang menahan berat halaman dan jumlah DOM. Survey 2026-11-17 menemukan `gym-pokemon` 9,99 MB / 375 request, `lokomotif-pemberani` 4,8 MB / 438 request, `selamatkan-kereta` ~2.000 node DOM saat main. Tanpa gate, perbaikan PRD-34/35 bisa mundur diam-diam.
- **Kebisingan terukur (dua run, tree sama, load 12-15):** byte dan jumlah request stabil; waktu muat median selisih 143 ms (p90 712 ms); p95 frame melompat 1-3 langkah 16,7 ms di sepertiga halaman; ms long-task p90 selisih 2,2 s. Jadi gate hanya memegang angka yang stabil.
- **Desain:** `tools/qa-perf-budget.mjs` (pakai ulang inti `qa-perf-survey.mjs`, tanpa CPU throttle untuk kecepatan):
  - per halaman: byte layar pertama, jumlah request, byte audio yang diunduh sebelum ketukan pertama, node DOM setelah 15 s main;
  - baseline `tools/perf-budget.json`, ratchet (boleh turun, tidak boleh naik > 5 %); `QA_UPDATE=1` menulis ulang;
  - masuk `tools/run-gates.mjs` (`--tag perf`).
  - Survey (frame, long task) tetap alat laporan, dijalankan per gelombang, bukan gate.
- **Masuk gameplay sungguhan:** tapper berhenti di menu pada 10 halaman (balapan-kereta, balapan-kereta-side, garasi-tempur, lokomotif-pemberani, museum-kereta, mojo-swoptops, timmy-kapal, index, film-play, film-anak). Tambah resep masuk per halaman (`tools/lib/enter-play.mjs`: urutan klik/fungsi masuk yang dipakai gate game itu sendiri) supaya angka "main" benar angka main.
- **Laws:**
  - (L1) laporan per halaman + baseline untuk 27 halaman;
  - (L2) mutasi: menambah `<img>` 1 MB tanpa lazy di hub → gagal; menambah 600 node DOM tersembunyi → gagal;
  - (L3) resep masuk: 25 dari 27 halaman (kecuali blippi iframe dan mojo-chase-embed) mencapai layar main — dibuktikan dengan screenshot yang saya lihat;
  - (L4) dua run berturut-turut di tree sama → keduanya lulus (tidak flake).
- **Usaha:** M.
