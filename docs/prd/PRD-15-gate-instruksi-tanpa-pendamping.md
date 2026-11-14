# PRD-15 Gate instruksi tanpa pendamping

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** selesai (gate di CI, 2026-11-14)
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #15
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Laws:**
  - (L1) gate `tools/qa-instruction-companion.mjs` menghitung per game teks instruksi >40 karakter yang terlihat tanpa sprite/ikon/klip suara dalam 120 px;
  - (L2) angka awal disimpan di `tools/qa-out/instruction-baseline.json`; gate gagal bila angka **naik** (ratchet);
  - (L3) merah dibuktikan: menyisipkan satu paragraf polos di satu game → gagal.
- **Hasil:** daftar ini menjadi input PRD-14.
- **Usaha:** S.

## Hasil (2026-11-14)

- Gate `tools/qa-instruction-companion.mjs`: beranda + 25 halaman game, layar pertama, 800×1280. Pendamping = gambar
  yang **benar-benar termuat** (img dengan `naturalWidth > 0`, svg, canvas, video, latar `url()`) dalam 120 px, bukan yang
  lebih besar dari setengah layar; atau kata yang sama diucapkan lewat `speechSynthesis` (direkam, tidak diputar).
- **L1:** 0 blok tanpa pendamping di 26 halaman. Probe mentah: layar pertama berisi menu dan label pendek; satu-satunya
  kalimat panjang ("Susun langkah. Jalankan misi. Jadilah pemberani.", kereta-maze) berada di samping gambar.
- **L2:** baseline `tools/instruction-baseline.json` (bukan `tools/qa-out/`, karena folder itu di-gitignore dan CI tidak
  melihatnya). Halaman yang naik = gagal; `QA_UPDATE=1` menulis angka baru.
- **L3 merah → hijau:** `QA_PLANT=1` (satu paragraf polos di beranda) → gagal; `QA_PLANT=say` (kalimat sama diucapkan) →
  lulus; `QA_PLANT=pic` dengan gambar nyata → lulus, dengan berkas gambar yang tidak ada → gagal (versi pertama gate
  menghitung img rusak sebagai gambar — diperbaiki).
- Disambungkan: `tools/ci-verify.sh` (CI_SMOKE) + `node tools/run-gates.mjs --tag content`.
- **Batas yang diketahui:** gate hanya melihat layar pertama. Teks instruksi di dalam permainan (soal, "Cara Bermain")
  belum dijangkau; PRD-14 perlu mengekstrak string itu dari kode, bukan dari daftar ini.
