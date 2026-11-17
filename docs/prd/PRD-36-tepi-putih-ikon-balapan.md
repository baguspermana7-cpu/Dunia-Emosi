# PRD-36 Hapus tepi putih ikon rintangan Balapan Kereta

- **Gelombang:** Gelombang 4B — tampilan lebih detail
- **Status:** belum mulai
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game) + cek kode 2026-11-17
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah (aturan owner: tanpa outline putih):** `games/balapan-kereta.html:4069` `_oaInk` menggambar stroke putih 5 px (alpha 0,92) sebelum bentuk; dipakai 37 kali untuk ikon rintangan. Gate outline PRD-27 hanya membaca sprite berkas, bukan bentuk vektor yang digambar Pixi.
- **Desain:** buang stroke putih; kontur gelap yang sudah ada tetap. Bila ikon tenggelam di latar, pakai bayangan jatuh gelap tipis (bukan cincin terang). Cek juga sebutan outline di `gym-pokemon`, `museum-kereta`, `battle-arena`, `mojo-swoptops` — catat mana yang benar-benar menggambar tepi putih.
- **Laws:**
  - (L1) gate piksel: render tiap ikon `_oaInk` sendirian di atas latar abu-abu tengah, hitung piksel hampir putih di cincin luar 3 px: merah sekarang (>0), hijau setelahnya (0);
  - (L2) halaman lain yang ditemukan menggambar tepi putih masuk gate yang sama;
  - (L3) screenshot rintangan di 3 ukuran dilihat: ikon tetap terbaca.
- **Usaha:** S.
