# PRD-43 Gym Huruf dari kamus ejaan

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** ditutup tanpa ubah kode (target tidak terjangkau anak), 2026-11-20
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** G13c Gym Huruf hanya ~94 kata untuk 26 huruf, dengan baris data yang ditandai `skip`/`close`. `SpellingData.WORDS` punya 330 kata bergambar.
- **Desain:** G13c membangun soal dari `SpellingData.WORDS` (kata bergambar, buang baris bertanda), menjaga mekanik pertarungan yang ada.
- **Laws:**
  - (L1) ≥ 20 dari 26 huruf punya ≥ 3 kata; huruf tanpa kata dilaporkan;
  - (L2) 0 kata bertanda `skip`/`close` tampil;
  - (L3) setiap kata punya gambar yang ada (0 404);
  - (L4) gate G13c lulus; screenshot dilihat.
- **Usaha:** M.

## Hasil (2026-11-20): ditutup, keputusan untuk owner

**Diukur dulu, di browser (index, 844×390):**
- Tile peta "13c" menjalankan `openGymGame()` dan mendarat di `/games/gym-pokemon.html` (Gym Pokémon), bukan Gym Huruf.
- Satu-satunya pemanggil `g13cBuildLetterSelect()` adalah tombol kembali di dalam `#screen-game13c` itu sendiri.
- `startGameWithLevel` tidak punya init untuk `'13c'`, karena array `inits` hanya berindeks angka.
- Kesimpulan: Gym Huruf (G13c) adalah kode yatim. Tidak ada anak yang bisa membukanya sekarang.

**Mengapa tidak dikerjakan:** memperbaiki data game yang tidak bisa dibuka tidak menolong anak mana pun. Membukanya lagi berarti menambah item di peta, padahal tile itu dulu sengaja diarahkan ke Gym Pokémon. Itu keputusan owner, bukan saya.

**Yang sudah diukur, bila owner ingin membukanya lagi:**
- `SpellingData.WORDS` punya 326 kata Indonesia (`id`) yang semuanya bergambar (0 gambar hilang).
- 18 dari 22 huruf gym punya ≥ 3 kata bergambar. F (flamingo), W (wortel) dan Z (zebra) hanya punya 1, N punya 2 (nanas, nasi).
- Law L1 PRD ini (≥ 20 huruf punya ≥ 3 kata) **tidak** terpenuhi oleh data yang ada: 18, bukan 20. Untuk F, N, W dan Z perlu kata atau gambar baru.
- Data lama G13c juga bermasalah:
  - tanda `/*close*/` hanya komentar, jadi pasangan emoji yang salah (🦁 "Beruang", ⭐ "Singa", 🌊 "Awan") tetap akan tampil;
  - item hanya berupa emoji.
