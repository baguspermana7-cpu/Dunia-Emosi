# PRD-50 G7 Tebak Gambar: sprite, pengecoh satu grup, ronde dengar [ANAK]

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** live v64.81 (2026-11-22)
- **Sumber:** rencana Gelombang 5 (3 agen eksplorasi + cek ulang file:baris, 2026-11-21)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - Bank pindah ke sprite DB `assets/db/lib/<k>.webp`, yang sama dengan G11 dan `TKQuestions`; ≥150 item, dan emoji keluar dari bank.
  - Pengecoh dari grup yang sama.
  - Ronde dengar tiap ronde ke-3 (`duniaCanListen`/`duniaSayLine` dari PRD-42).
  - Mode gambar→kata dan kata→gambar tetap ada. Melapor bahasa/gambar.
- **Laws:**
  - L1: ≥150 item bersprite, 0 emoji di render.
  - L2: pengecoh satu grup.
  - L3: ronde dengar hanya jika ada suara id-ID.
  - L4: 1 sesi tanpa item berulang.
  - L5: 3 ukuran dilihat.

## Hasil (v64.81, 2026-11-22)

- Bank `g7BuildPool()` (game.js): DBLabeled (sprite `assets/db/<cat>/NNN.webp`) + `TKQuestions.names`
  (`assets/db/lib/<key>.webp`, nama yang sama dengan G11/Timmy), satu item per nama: 206 item, 8 grup
  (hewan 59, benda 64, makanan 20, kendaraan 20, buah 16, sains 16, alam 7, mainan 4). Grup DBLabeled tanpa sprite
  (sayur, profesi, tubuh, pakaian, olahraga, musik, sekolah, warna) tidak masuk: tidak ada gambarnya.
  `WORD_IMAGES` (bank emoji) dihapus. `tk-questions.js` dimuat saat G7 pertama dibuka (DuniaLoad, seperti G11).
- Pengecoh selalu dari grup jawaban; kata yang awalnya sama (BUKU / BUKU TULIS) tidak jadi pengecoh bila ada pilihan lain.
- Ronde ke-3, 6, 9: dengar lalu pilih gambar (tanpa tulisan), hanya bila `duniaCanListen()`.
- Kata ke gambar: pilihan hanya gambar (dulu nama tertulis di bawah gambar = jawaban terbuka).
- Landscape pendek: kotak soal tidak lagi mengecil sampai hilang (kata tak terlihat), 4 pilihan satu baris,
  ukuran huruf mengikuti panjang kata.
- Gate `tools/qa-prd50-g7.mjs` (CI smoke): merah 0/9 di origin/main, hijau 9/0.
