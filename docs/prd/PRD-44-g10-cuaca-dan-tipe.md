# PRD-44 G10: cuaca nyata dan keunggulan tipe [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** belum mulai
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** cuaca G10 hanya kosmetik; tipe Pokemon tidak berpengaruh. G10, G13, G13b dan Gym Pokemon adalah empat varian "jawab matematika untuk menyerang" yang terasa sama.
- **Desain:** G10 memakai `WeatherFX` untuk cuaca yang terlihat; tipe lawan vs tipe Pokemon anak memberi pengali sederhana (2x / 1x / 0,5x) yang DIUMUMKAN dengan gambar (bukan teks panjang). Membedakan G10 dari tiga saudaranya.
- **Laws:**
  - (L1) tabel uji tipe: 18 tipe × 18 tipe → pengali benar (data dari `pokemon-db.json`);
  - (L2) serangan super efektif menampilkan tanda gambar + bunyi berbeda;
  - (L3) tidak ada pertarungan mustahil (simulasi tipe terburuk tetap menang dengan 80 % benar);
  - (L4) screenshot dilihat.
- **Usaha:** M.
