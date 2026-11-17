# PRD-43 Gym Huruf dari kamus ejaan

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** belum mulai
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
