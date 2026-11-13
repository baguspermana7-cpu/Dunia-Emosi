# PRD-32 Getar halus

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** dikerjakan 2026-11-14 (lihat "Hasil")
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #32
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** getar hanya di beberapa tempat.
- **Tujuan:** `navigator.vibrate(10)` saat jawaban benar dan menang, lewat konsumen `DuniaBus` (`answer ok`, `level:end win`), mengikuti setelan `dunia-emosi-vibrate`.
- **Laws:**
  - (L1) dengan `navigator.vibrate` dipalsukan: jawaban benar di Kuis memanggil `vibrate(10)` 1×;
  - (L2) setelan `off` → 0 panggilan;
  - (L3) jawaban salah → 0 panggilan.
- **Gate:** `tools/qa-vibrate.mjs`.
- **Usaha:** S.

## Hasil (2026-11-14)
**Koreksi PRD (keadaan nyata):**
- Kuis, ketiga game kereta, museum, lokomotif, gym, dan setir Timmy **sudah** bergetar saat menjawab atau beraksi.
- Bug sebenarnya: setelan orang tua "Getar: mati" (`dunia-emosi-vibrate` = `off`) hanya dibaca `game.js`. Ada 15 panggilan `navigator.vibrate` di 7 halaman game yang tetap bergetar walau setelannya dimatikan.

**Perbaikan:**
- Satu penjaga di `games/data/save-engine.js` (dimuat semua halaman itu): `navigator.vibrate` dibungkus sekali dan dijatuhkan bila setelan `off`. Panggilan baru di masa depan otomatis ikut aturan ini.
- Ditambah `DuniaProfile.vibrateOn()`.
- Getar baru untuk game yang belum bergetar (Timmy kuis, Ayo Berhitung) **tidak** ditambahkan. Kuis sudah bergetar sendiri, jadi pendengar bus akan menggandakan getarnya. Bila nanti diinginkan, tempatnya di PRD-18.

**Gate `tools/qa-vibrate.mjs`:**
- jawaban **salah** sungguhan di Kuis (Kuis bergetar saat salah, serangan super, dan kena di PvP — bukan saat benar): setelan on → getar, off → 0;
- 7 halaman dengan setelan off → 0 getar sampai ke perangkat.
- Merah di kode lama: kuis, balapan, selamatkan, museum (dan seterusnya) meneruskan getar walau setelan off.
