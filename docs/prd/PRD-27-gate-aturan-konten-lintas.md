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

## Hasil bagian 2 (2026-11-14)

- **L1 emoji di layar:** `tools/audit-no-emoji.mjs` (kini juga `tools/qa-no-emoji.mjs` di runner, `--tag content`, dan
  smoke CI) berjalan di 27 tampilan: 7 halaman yang dulu tidak pernah diperiksa ditambahkan (ayo-berhitung, kereta-maze,
  mojo-swoptops, mojo-chase-embed, film-anak, film-play, blippi). Semua lulus. Merah: resolver dimatikan
  (`QA_PLANT=nores`) → beranda 287 emoji terpetakan tertinggal, Kuis 21 → gagal.
- **L4 dasbor:** tampilan `index.html#dashboard` (memanggil `showDashboard()`, hanya subtree `#screen-dashboard`, mode
  ketat) lulus, 848 karakter teks. Merah: satu emoji tanpa art (U+1F9FF) ditanam di dasbor → gagal; ditanam di halaman
  biasa → tercatat sebagai gap, bukan gagal (aturan lama). Catatan: ⭐ yang ditanam langsung diganti sprite oleh resolver
  — itu resolver bekerja, jadi bukan bukti merah.
- **L2 outline putih:** `tools/white-outline.py` (+ `tools/qa-white-outline.mjs`, di `ci-verify.sh` statis): pita tepi
  alpha 2 px ≥50 % hampir putih DAN pita 4 px di dalamnya ≤35 % putih (benda putih seperti kapas/asap tidak terhitung).
  Baseline menyimpan sha1 semua 9180 gambar, jadi CI hanya mendekode berkas baru/berubah: 1,4 s. Merah: sprite people/001
  dengan tepi putih 2 px ditaruh di `assets/` → exit 1 ("NEW WHITE RIM"), dihapus → exit 0.
- **Temuan untuk owner:** 1048 sprite yang dipakai game sudah ber-outline putih (utang tercatat di
  `tools/white-outline-baseline.json`): Pokemon `pokemondb_hd_alt2` 618 (4 game Pokemon), `math/monsters` 276 (cerita
  matematika), `db/elements` 100, sisanya tersebar (linus-body di 3 game kereta, math/heroes). Dikerjakan di PRD-27c.
