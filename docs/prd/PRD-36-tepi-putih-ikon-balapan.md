# PRD-36 Hapus tepi putih ikon rintangan Balapan Kereta

- **Gelombang:** Gelombang 4B — tampilan lebih detail
- **Status:** live v64.60
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game) + cek kode 2026-11-17
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah (aturan owner: tanpa outline putih):** `games/balapan-kereta.html:4069` `_oaInk` menggambar stroke putih 5 px (alpha 0,92) sebelum bentuk; dipakai 37 kali untuk ikon rintangan. Gate outline PRD-27 hanya membaca sprite berkas, bukan bentuk vektor yang digambar Pixi.
- **Desain:** buang stroke putih; kontur gelap yang sudah ada tetap. Bila ikon tenggelam di latar, pakai bayangan jatuh gelap tipis (bukan cincin terang). Cek juga sebutan outline di `gym-pokemon`, `museum-kereta`, `battle-arena`, `mojo-swoptops` — catat mana yang benar-benar menggambar tepi putih.
- **Laws:**
  - (L1) gate piksel: render tiap ikon `_oaInk` sendirian di atas latar abu-abu tengah, hitung piksel hampir putih di cincin luar 3 px: merah sekarang (>0), hijau setelahnya (0);
  - (L2) halaman lain yang ditemukan menggambar tepi putih masuk gate yang sama;
  - (L3) screenshot rintangan di 3 ukuran dilihat: ikon tetap terbaca.
- **Usaha:** S.

## Hasil (2026-11-17)
- `_oaInk` (`games/balapan-kereta.html`) tidak lagi menggambar stroke putih 5 px; mata kepiting yang menonjol diberi kontur gelap.
- Ditemukan juga: `games/battle-arena.js` `.ba-outline` memberi 4 drop-shadow putih ke petarung Gym Pokemon dan arena battle-modes. Diganti satu bayangan tepi gelap + bayangan tanah (2 filter, bukan 5).
- Gate `tools/qa-drawn-outline.mjs` (run-gates, tag `content`): uji diri piring dengan cincin putih 2 px = 335 px, tanpa cincin = 0. Ikon balapan kode lama 16.189 px hampir-putih di cincin luar 18 jenis ikon, kode baru 0. `.ba-outline` lama 306, baru 0.
- Screenshot 390x844, 844x390, 800x1280 sebelum/sesudah dilihat: ikon tetap terbaca, tanpa tepi putih. Petarung Gym dilihat di `qa-battle-arena`.
- Regresi: ci-verify lulus; run-gates qa-drawn-outline, qa-white-outline, qa-endgame-hang, qa-g14-realrace, qa-battle-arena, qa-battle-feel, qa-vfx-poke lulus.
- **Sisa (bukan kode):** sprite DB di `assets/db/elements` (sapi, ayam, kaktus, semak, taksi, api) masih membawa tepi putih yang dipanggang di berkas; tercatat di `tools/white-outline-baseline.json` (PRD-27). Garis putih tipis 1,5-1,8 px di badan kereta pemain (`balapan-kereta.html` sekitar 3070, 3132, 3199) belum diubah: menunggu keputusan owner.
