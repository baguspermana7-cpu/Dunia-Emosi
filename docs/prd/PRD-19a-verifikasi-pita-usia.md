# PRD-19a Verifikasi pita usia

- **Gelombang:** Gelombang 0 — verifikasi & pagar murah (tanpa fitur anak)
- **Status:** belum mulai
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
