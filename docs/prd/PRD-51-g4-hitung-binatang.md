# PRD-51 G4 Hitung Binatang: sprite, 3 ragam ronde, petunjuk hitung [ANAK]

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** belum mulai
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
