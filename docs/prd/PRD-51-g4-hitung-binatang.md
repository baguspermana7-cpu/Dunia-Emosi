# PRD-51 G4 Hitung Binatang: sprite, 3 ragam ronde, petunjuk hitung [ANAK]

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** live v64.82 (2026-11-22)
- **Sumber:** rencana Gelombang 5 (3 agen eksplorasi + cek ulang file:baris, 2026-11-21)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - Sprite hewan/buah dari DB menggantikan larik emoji.
  - 3 ragam ronde:
    - lihat sekilas 1–5 (subitizing, tampil 1,5 s);
    - hitung sampai 10/20 sesuai tier;
    - "mana yang lebih banyak".
  - Setelah 2 salah, petunjuk: setiap benda diberi nomor saat diketuk. Pola ini dipakai ulang dari petunjuk PRD-13.
  - Tingkat dari `DuniaMastery`.
- **Laws:**
  - L1: 3 ragam muncul dalam 1 sesi medium.
  - L2: petunjuk muncul tepat setelah salah ke-2.
  - L3: jumlah sprite di layar = jawaban, di 50 ronde acak.
  - L4: 0 emoji di render.
  - L5: 3 ukuran dilihat.

## Hasil (v64.82, 2026-11-22)

- Gambar dari DBLabeled (hewan / buah / benda, sama dengan G7); larik emoji ANIMALS_G4 / FRUITS_G4 / OBJECTS_G4 dihapus.
- Ronde berputar: hitung (sampai 10 atau 20: usia, dibatasi `DuniaMastery.cap('matematika', ..., {1:10, 2:10})`) ->
  lihat sekilas (1-5, tampil 1,5 s lalu bersembunyi) -> mana yang lebih banyak (dua kelompok, jawab dengan gambar).
  Mode Pokémon tetap hitung biasa.
- Salah pertama: tombol itu mati, boleh coba lagi. Salah kedua (hitung/sekilas): gambar muncul lagi, waktu berhenti,
  tiap gambar yang diketuk diberi nomor 1, 2, 3 sesuai urutan ketuk. Bintang hanya untuk benar di percobaan pertama.
  Yang dilaporkan ke DuniaBus hanya ketukan pertama (`count` / `compare`).
- Ditemukan dan diperbaiki: pembuat pilihan salah berputar tanpa akhir bila jawabannya di tepi dan diminta 6 pilihan
  (level sulit, jawaban 1). Bug lama, sudah ada sebelum PRD ini.
- Landscape pendek (844x390): dua kolom (gambar kiri; soal, mode, pilihan, waktu kanan); dulu pilihan di bawah lipatan.
- PRD-20: skill "Membandingkan" kini menunjuk G4.
- Regresi tertangkap qa-prd48-bus: aturan dua kolom tanpa `.active` membuat layar G4 tampil di atas G10/G13 di landscape; dibatasi ke `#screen-game4.active`.
- Gate `tools/qa-prd51-g4.mjs` (CI smoke): merah di origin/main (tidak ada yang lulus), hijau 7/0.
