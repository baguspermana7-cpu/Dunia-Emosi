# PRD-08c Bus jawaban di game arkade dan kereta

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** belum mulai
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** hanya 7 berkas memancarkan `DuniaBus 'answer'` (grep 2026-11-17). Sekitar 13 halaman arkade/kereta menjawab soal tanpa melapor, jadi PRD-10 (penguasaan), PRD-11 (pengulangan) dan PRD-20 (kartu berikutnya) buta terhadap mereka.
- **Desain:** sama dengan PRD-08b: satu `emit('answer', {game, domain, skill, item, ok, tries, ms})` di titik jawab tiap game + `level:start/end`.
- **Laws:**
  - (L1) gate memainkan satu level skrip per game → jumlah `answer` = jumlah soal dijawab;
  - (L2) setiap skill ada di `skills.js`;
  - (L3) gate game-game itu tetap lulus.
- **Usaha:** M.
