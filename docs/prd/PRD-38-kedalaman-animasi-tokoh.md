# PRD-38 Kedalaman latar dan tokoh beranimasi (Birds, Bawah Laut)

- **Gelombang:** Gelombang 4B — tampilan lebih detail
- **Status:** belum mulai
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** G19 Pokemon Birds dan G24 Bawah Laut memakai latar datar dan tokoh gambar diam yang hanya bergeser. Ada 41 GIF animasi di `assets/Pokemon/showdown-ani` yang hanya dipakai satu halaman. Mesin paralaks sudah ada (lihat bagian visual di dokumen audit gameplay).
- **Desain:** pakai mesin paralaks yang ada: ≥ 3 lapisan latar dengan kecepatan berbeda; tokoh utama memakai GIF animasi bila tersedia untuk spesiesnya (fallback gambar diam); bayangan jatuh lembut di tanah/air. Tanpa outline putih.
- **Laws:**
  - (L1) gate: ≥ 3 lapisan latar bergerak dengan kecepatan berbeda (ukur posisi 2 detik terpisah);
  - (L2) tokoh utama beranimasi (dua screenshot 200 ms terpisah berbeda di kotak tokoh) untuk spesies yang punya GIF;
  - (L3) gate PRD-33: byte layar pertama naik ≤ 300 KB; survey frame tidak memburuk melewati kebisingan;
  - (L4) screenshot 3 ukuran dilihat; outline gate lulus.
- **Usaha:** M.
