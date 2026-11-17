# PRD-42 Ronde "dengar" untuk game huruf + bank G11 besar [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** belum mulai
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** G3, G7, G8, G13c semuanya "pilih huruf/kata dari 3-4 tombol" (duplikat). G3 hanya 41 item. G11 Kuis Sains 94 soal padahal `TKQuestions` punya 713 item (domain matematika, umum, arab, logika, islam).
- **Desain:** ronde baru "dengar lalu pilih" memakai klip di `assets/spelling/audio` (sudah ada); diselipkan tiap ronde ke-3 di G3/G8. G11 mengambil soal `umum`/`logika` dari `TKQuestions` dengan tier penguasaan.
- **Laws:**
  - (L1) G3/G8: ronde dengar muncul dan klipnya ada (0 404) dan berbunyi offline;
  - (L2) G11: ≥ 300 soal berbeda tersedia; 20 sesi simulasi tanpa soal kembar dalam satu sesi;
  - (L3) bus `answer` dipancarkan; screenshot dilihat.
- **Usaha:** M.
