# PRD-25 Validator keterselesaian level di CI

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** dikerjakan 2026-11-14 (lihat "Hasil")
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #25
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:** satu `tools/qa-levels-solvable.mjs` (node, tanpa browser) yang memanggil validator yang ada:
  - BFS papan Timmy;
  - `simPatterns` Mojo (`games/mojo-chase-rules.js`);
  - rute kereta (`games/data/kereta-levels-*.js`).
- **Laws:**
  - (L1) semua level terselesaikan;
  - (L2) level yang sengaja dirusak (dinding menutup jalan) → exit 1;
  - (L3) masuk `tools/ci-verify.sh`, durasi <60 s.
- **Usaha:** M.

## Hasil (2026-11-14)
`tools/qa-levels-solvable.mjs` jalan tanpa browser (16 s) dan masuk bagian statis `tools/ci-verify.sh`, jadi diperiksa di setiap push.

**Isi gate:**
- **L1:** memanggil bagian A `qa-tk-grid-levels.mjs` (solver independen, 6747 cek).
- **L2:** `KeretaGrid.verify` pada 64 level kereta; rencana referensi muat di slot.
- **L3:** `MojoChaseRules.simPatterns` 40 × 200 pola, 0 baris buntu.
- **L4:** dua mutasi di dalam gate (level kereta 1 slot, pola Mojo tiga barrier) terbukti tertangkap.

**Bukti merah untuk Timmy:** `par` satu papan di `tk-worlds.js` diubah ke 99, hasilnya L1 ✗ (6746/1). Berkas dikembalikan.

**Temuan sampingan di `qa-kereta-maze.mjs --skip-browser`** (gate ini belum masuk runner/CI):
- Cek "tepat 25 prop" sudah basi. Prop sengaja bertambah jadi 27 (tungku, `b0531bed`). Kini diganti: setiap prop yang disebut game ada di database. Lulus.
- **Masih merah, keputusan konten untuk owner:** 3 pose Malivlak tidak dipakai skenario mana pun sejak `0fd3c977` ("scenes match the film"): `orkes/pemimpin`, `penumpang-ungu/lari`, `penumpang-ungu/lari-2`. Ini tidak menghalangi anak, hanya aset yang menganggur. Tidak saya ubah.
