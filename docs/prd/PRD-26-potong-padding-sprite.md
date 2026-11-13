# PRD-26 Potong padding sprite

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** dikerjakan 2026-11-14 (lihat "Hasil")
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #26
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** `assets/db/people/003.webp` berukuran 200×200, isinya hanya 48×70.
- **Desain:**
  - skrip `tools/trim-sprite-padding.py` (PIL, bbox alpha + margin seragam 4%), dijalankan per pack dengan `--dry-run` dulu (laporan rasio isi);
  - sprite beranimasi (sheet) dikecualikan lewat daftar.
  - Ingat jebakan: tanpa colour-key global.
- **Laws:**
  - (L1) gate `tools/qa-sprite-fill.mjs` → rasio isi ≥60% untuk pack yang diproses (merah sekarang di `people/`);
  - (L2) screenshot halaman yang memakai pack itu: ukuran tampil sama atau lebih besar, tidak terpotong — saya lihat;
  - (L3) token game1 ikut naik.
- **Usaha:** S–M.

## Hasil (2026-11-14)
**Ukuran per pack** (isi figur dibagi sisi kanvas terpanjang, median):
- `people` 0,35 (128 dari 128 di bawah 0,60);
- `misc` 0,40;
- `ui` 0,49;
- `extra` 0,56;
- semua pack lain ≥ 0,91.

**Yang dipotong rilis ini: `people/` saja.**
- Pakai `tools/trim-sprite-padding.py`: kotak persegi di sekitar figur + margin 6 %, resolusi asli (tanpa resample), webp kualitas 92.
- Ukuran pack tetap 516 KB. Versi lossless sempat membuatnya 880 KB, jadi tidak dipakai.
- Semua pemakai sprite ini mengukurnya persegi dengan `object-fit: contain` (`games/data/ui-sprites.js`; jalur Pixi menyetel w = h), jadi tidak ada tata letak yang bergeser — figurnya saja yang tampil 2,6× lebih besar.

**Gate `tools/qa-sprite-fill.mjs`** (Pillow; masuk `ci-verify.sh`; job CI memasang Python 3.12 + Pillow 11.3.0):
- sebelum: median 0,35, 128 di bawah 0,60, exit 1;
- sesudah: median 0,896, 0 di bawah, exit 0.

**Temuan saat meninjau seluruh 128 sprite** (contact sheet dilihat):
- Hanya `people/1`–`people/6` yang dipakai, lewat `games/data/emoji-map.js`, dan keenamnya anak laki-laki.
- Pack ini juga berisi banyak perempuan/anak perempuan **tanpa hijab** (antara lain 10–12, 17–18, 23–30, 34–35, 43–47, pasangan 48–53 dan 61). Tidak ada yang dipakai, tapi gambarnya ada di repo. Pengamannya dicatat di PRD-27 (sprite orang yang belum ditinjau = gagal).
- `people/5` berlubang di badan (bekas colour key lama), padahal dipakai untuk 👩 ("Ibu" di `game.js:1457`). 👩 kini memakai `people/4` yang utuh. Pack ini tidak punya figur perempuan berhijab.

**Belum:** `misc/`, `ui/`, `extra/`. Ikon UI bisa jadi sengaja berpadding, jadi tiap pack perlu ditinjau sendiri di rilis berikutnya; gate tinggal ditambah path-nya.
