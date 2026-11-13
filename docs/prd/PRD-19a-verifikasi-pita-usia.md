# PRD-19a Verifikasi pita usia

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** dikerjakan 2026-11-14 (lihat "Hasil")
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #19
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:**
  - layar nama menanyakan usia (`index.html` `age-btn`);
  - tidak ada pembaca usia di `games/` — grep `ageBand|avatar.age` tidak menemukan apa pun.
- **Tujuan:** usia per avatar tersimpan dan bisa dibaca semua game lewat `window.DuniaProfile.age()` (modul kecil baru di `games/data/`, dipakai juga oleh PRD-18).
- **Laws:**
  - (L1) memilih 7–8 di layar nama → `DuniaProfile.age()` = `'7-8'` di halaman game mana pun untuk avatar itu;
  - (L2) avatar lain tetap pada usianya sendiri;
  - (L3) avatar lama tanpa usia → `'5-6'` (default produk).
- **Gate:** `tools/qa-profile-age.mjs`. Merah sekarang karena modulnya belum ada.
- **Usaha:** S.

## Hasil (2026-11-14)
**Koreksi PRD:**
- Usia ternyata sudah tersimpan per slot di `dunia-players[i].ageTier` (`cilik` / `tumbuh` / `pintar`).
- Game di dalam `index.html` sudah memakainya (`game.js`, `state.players[i].ageTier || 'tumbuh'`). Yang belum membacanya adalah halaman `games/*.html`.
- L3 di atas salah: anak tanpa usia tercatat dimainkan sebagai 7–8 oleh `game.js`. `DuniaProfile` mengikuti itu supaya satu anak tidak punya dua tingkat.

**Bug nyata yang ditemukan gate (merah di kode lama):**
- Layar nama menyorot "5–6" untuk anak baru, tetapi yang tersimpan `tumbuh` (7–8) bila orang tua tidak mengetuk tombol usia.
- Untuk anak lama tanpa usia tercatat, tidak ada tombol yang menyala sama sekali.

**Perbaikan:**
- Anak baru mulai di `cilik`, sesuai yang terlihat.
- Tombol yang menyala selalu sama dengan yang akan disimpan.
- `window.DuniaProfile.ageTier()` / `.age()` ditambahkan di `games/data/save-engine.js` (sudah dimuat 20 halaman game + index, jadi tanpa tag script baru). Slot dicari lewat avatar yang sedang bermain, sehingga halaman yang mengunci anaknya tetap membaca usia anak itu.

**Gate `tools/qa-profile-age.mjs`** (runner + `ci-verify.sh` smoke):
- kode lama: 2 lulus / 3 gagal (`highlighted cilik, saved tumbuh`; `highlighted null`; `DuniaProfile` tidak ada);
- kode baru: 9/9.
