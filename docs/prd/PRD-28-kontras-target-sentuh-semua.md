# PRD-28 Kontras + target sentuh semua game

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** live v64.46
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #28
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:** generalisasi `qa-index-contrast.mjs` + `touch-target-audit.mjs` menjadi `tools/qa-game-a11y.mjs` (env URL, ratchet seperti PRD-15). Ambang: kontras teks 4.5:1 (3:1 untuk teks besar), target ≥48 px.
- **Laws:**
  - (L1) laporan per game + baseline;
  - (L2) mutasi tombol 30 px → gagal;
  - (L3) semua pelanggaran di **tombol utama** game (mulai, jawaban, panah) diperbaiki sampai 0;
  - sisanya ratchet.
- **Usaha:** M.

## Hasil (2026-11-14, v64.46)

- Gate baru `tools/qa-game-a11y.mjs` (bukan tambalan dua audit lama yang hardcode port): beranda + 25 halaman game,
  layar pertama, 390×844. Target sentuh: sisi < 48 px. Kontras: warna teks melawan **piksel nyata** di belakangnya
  (screenshot kedua dengan semua teks transparan; dua frame 400 ms terpisah, teks dihitung rendah hanya bila rendah di
  keduanya — tanpa itu satu run bersih pernah 18 vs 17). Teks ber-stroke/bayangan dihitung terpisah.
- **L1:** 82 target kecil, 17 teks kontras rendah di 26 halaman (`tools/a11y-baseline.json`, ratchet).
- **L2 merah:** tombol "Mulai" 30 px + satu baris abu di atas abu ditanam di beranda → naik di atas baseline → gagal
  (tombol terukur 44×44: ada `min-height:44px` global, tetap < 48).
- **L3 tombol utama:** 1 → 0. Mobil "Mulai!" 45 px → 52 px. Ditemukan juga: di layar landscape tombol itu berada 140 px
  di bawah layar dalam kartu yang menggulung (sudah begitu di HEAD) — kini menempel di bawah kartu, terlihat dan bisa
  diketuk di 3 ukuran.
- **Kontras tombol mulai diperbaiki** (dilihat sebelum/sesudah): Selamatkan Kereta "Mulai!" 1,7 → hijau tua, Balapan
  Kereta tombol jalan (pola sama), Stinky "Mulai Petualangan" 2,0 → oranye tua (#C26203, 4,2:1), Mojo "Ayo Main!" 2,5 →
  hijau tua.
- Sisa 17 teks kontras rendah (label kecil Ayo Berhitung, "← Kembali", subjudul Garasi) + 82 target kecil = ratchet.
