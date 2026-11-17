# PRD-40 Bos tiap 10 level (Birds, G23, Bawah Laut) [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** belum mulai
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** level 1 dan level 20 terasa sama di G19, G23, G24. G10 sudah punya pola bos (`game.js:6371`, `:6384` `boss:true`, kolam spesies `boss` di `:6257`) dan efek ledakan VFX.
- **Desain:** level kelipatan 10 = bos: lawan besar dengan bar HP, 3 fase soal (lebih sulit satu tier tiap fase), perayaan besar saat menang. Pakai pola dan kolam bos G10, tanpa aset baru.
- **Laws:**
  - (L1) level 10/20/30 memanggil mode bos, level lain tidak;
  - (L2) bos selalu bisa dikalahkan (simulasi jawaban benar 70 % → menang ≤ 3 menit);
  - (L3) kalah bos tidak menghapus progres level;
  - (L4) screenshot bos di 3 ukuran dilihat; survey frame tidak memburuk.
- **Usaha:** M.
