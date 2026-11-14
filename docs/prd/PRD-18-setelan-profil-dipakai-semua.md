# PRD-18 Setelan profil dipakai semua game

- **Gelombang:** Gelombang 2 — pengalaman anak & orang tua
- **Status:** live v64.51
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #18
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - `DuniaProfile` (PRD-19a) menyimpan per avatar: suara, narasi, getar, gerak dikurangi, usia;
  - migrasi dari kunci global `dunia-emosi-sound` / `-vibrate` (`game.js:2172-2209`);
  - game membaca `DuniaProfile.get(key)`; `prefers-reduced-motion` tetap dihormati.
- **Laws:**
  - (L1) avatar A suara off, B on → masing-masing benar di 3 game;
  - (L2) migrasi tidak mengubah apa yang didengar anak saat ini;
  - (L3) gerak dikurangi mematikan shake di Mojo/Timmy/cinema.
- **Usaha:** M.

## Hasil (2026-11-14, v64.51)

- Semua game tetap membaca kunci global (`dunia-emosi-sound`, `-vibrate`, `-mathadv`; 29 tempat). Tiap anak menyimpan
  salinannya sendiri (`dunia-avatar-<anak>-settings`) di save-engine; salinan anak yang sedang main ditulis ke kunci
  global setiap halaman dimuat dan saat anak diganti di beranda; tombol setelan menyimpan ke anak yang aktif.
- **Migrasi:** sekali, saat pertama dimuat, setelan yang berlaku sekarang disalin ke **setiap** anak yang sudah ada —
  tidak ada yang berubah bagi siapa pun. Anak yang ditambahkan kemudian mulai dari bawaan (suara nyala).
  Versi pertama menyalin hanya ke anak yang sedang main; anak kedua lalu mewarisi "suara mati" milik kakaknya —
  ditangkap gate L1 sebelum rilis.
- Hati-hati yang dicatat di kode: `avatarScopedGet` memindahkan kunci global lama ke satu anak lalu menghapusnya, jadi
  salinan memakai kunci sendiri.
- **Gate `qa-profile-settings`** 8/8: L1 Ana suara mati, Budi nyala — benar di beranda setelah ganti anak dan di Kuis,
  Timmy, Mojo; L2 instalasi lama (suara mati, dua anak) tetap mati untuk keduanya, anak baru nyala; L3 getar dan
  matematika lanjut ikut anak. Regresi: vibrate, profile-age, save-persistence, ayo-per-child, freeze-card, dll. lulus.
- **Belum:** "gerak dikurangi" (L3 PRD lama) — belum ada setelan di menu; menambah tombol = hal baru di menu (perlu
  owner). `prefers-reduced-motion` perangkat tetap dihormati.
