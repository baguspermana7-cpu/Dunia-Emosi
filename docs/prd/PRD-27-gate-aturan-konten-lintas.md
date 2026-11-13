# PRD-27 Gate aturan konten lintas game

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** bagian statis dikerjakan 2026-11-14; bagian browser (emoji tampil, outline putih) belum
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #27
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - `audit-no-emoji.mjs` dan audit outline putih (deteksi cincin terang di tepi alpha sprite) dibuat membaca env URL agar masuk runner (`--tag content`);
  - hijab: checklist manual tetap, tapi gate mendaftar setiap sprite orang baru (diff terhadap `tools/qa-out/people-reviewed.json`) supaya tidak ada yang lolos tanpa ditinjau.
- **Laws:**
  - (L1) emoji yang sudah dipetakan muncul di layar → gagal;
  - (L2) sprite planted dengan ring putih 2 px → gagal;
  - (L3) sprite orang baru yang belum ditinjau → gagal sampai saya tinjau dan catat;
  - (L4) dasbor (`game.js:4041-4110`) bebas emoji.
- **Usaha:** M.

## Hasil bagian 1 (2026-11-14, statis)
**Gate `tools/qa-content-rules.mjs`** (masuk `ci-verify.sh`) mewajibkan dua hal:
- setiap sprite `people/N` yang dipakai kode harus berstatus `ok` di `tools/people-reviewed.json`, yang saya isi dari contact sheet 128 sprite;
- tidak ada pengambilan acak dari pack `people`.

**Bukti merah:** `emoji-map.js` lama gagal di `people/5` (badan berlubang). Kini lulus.

**Daftar `blocked`:** 28 sprite perempuan/anak perempuan tanpa hijab, plus `people/5`.

**Sisa (bagian 2, butuh browser):**
- `audit-no-emoji.mjs` dibuat membaca env URL agar masuk runner;
- deteksi outline putih pada sprite;
- L4 dasbor tanpa emoji.
