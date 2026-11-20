# PRD-08c Bus jawaban di game arkade dan kereta

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** live v64.67
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** hanya 7 berkas memancarkan `DuniaBus 'answer'` (grep 2026-11-17). Sekitar 13 halaman arkade/kereta menjawab soal tanpa melapor, jadi PRD-10 (penguasaan), PRD-11 (pengulangan) dan PRD-20 (kartu berikutnya) buta terhadap mereka.
- **Desain:** sama dengan PRD-08b: satu `emit('answer', {game, domain, skill, item, ok, tries, ms})` di titik jawab tiap game + `level:start/end`.
- **Laws:**
  - (L1) gate memainkan satu level skrip per game → jumlah `answer` = jumlah soal dijawab;
  - (L2) setiap skill ada di `skills.js`;
  - (L3) gate game-game itu tetap lulus.
- **Usaha:** M.

## Hasil (v64.67, 2026-11-20)

**Cara kerja.**
- `games/data/save-engine.js` (sudah dimuat semua halaman ini) sekarang punya `DuniaAnswer(payload)` dan `DuniaAnswerQ(teksSoal, ok)`.
- Bus, learning log dan mastery dimuat saat jawaban **pertama**: 0 request tambahan di layar pertama.
- Jawaban yang masuk sambil menunggu dikirim berurutan setelah bus siap.
- `DuniaAnswerQ` membaca domain dan skill dari teks soal:
  - angka dengan operator menjadi tambah/kurang/kali/bagi;
  - teks lain menjadi huruf awal, pola, bentuk, menghitung, perasaan atau pengetahuan umum.
- `QuizEngine.fill/ask` melapor setiap jawaban secara default, sehingga Balapan Kereta, Gym Pokemon dan Battle Arena ikut melapor. Side Race memakai `bus:false` karena SoalArcade sudah melapor di sana.

**Titik jawab yang disambung:**
- Pokemon Run (3 jenis kuis);
- Pokemon Bawah Laut;
- Monster Candy;
- Lokomotif Pemberani (kuis hitung + tiap huruf yang dipilih);
- Mario Pokemon (gerbang hitung);
- Selamatkan Kereta;
- Museum Kereta (kuis kereta);
- Garasi Tempur (`gt-quiz.js`, hanya pemain 1 — pemain 2 teman/komputer). Jawaban Monster Rush disimpan dulu dan dilapor saat ronde berhenti: lapor per ketukan menurunkan ketukan rush di `qa-gt-play` 768×1024 dari 5 menjadi 1–2 (terbukti dengan menukar hanya `gt-quiz.js` ke versi HEAD: kembali 5).
- Stinky & Dirty (domain dari dunia kartu);
- Ejaan Inggris (satu jawaban per kata, benar bila tanpa huruf salah).

**Bukti (`tools/qa-prd08c-bus.mjs`, masuk `ci-verify.sh` statis + `run-gates --tag bus`):**

| Law | Kode lama (v64.63) | Kode baru |
|---|---|---|
| Statis: 13 titik jawab melapor | 0/13 | 13/13 |
| L1: per halaman (12 halaman), 1 jawaban = 1 event + 1 baris log, 0 request di layar pertama, 0 galat | 0 event di semua halaman | 12/12 |
| L2: label orang tua bukan "Lainnya" | null | Pengurangan, Huruf awal, Pola, Bentuk, Menghitung benda, Pengetahuan umum |
| L3: ketuk sungguhan pil QuizEngine (salah) | — | 1 record, `ok:false`, skill `tambah`, ms terukur |
| L3: ketuk sungguhan gerbang hitung Mario (benar lalu salah) | — | `true`, `false` (2 record) |
| L3: Monster Rush Garasi, 4 ketukan | — | 0 laporan selama ronde, 4 setelah ronde (asked 4) |

Totalnya 42/42 di kode baru.

Gate ini juga menangkap galat saya sendiri: satu suntingan menempelkan `if(...)` ke baris komentar di Pokemon Run (`Unexpected token 'else'`). Kesalahan itu diperbaiki sebelum rilis.

**Penyesuaian dari desain:**
- `skills.js` tidak pernah dibuat. Peta skill yang benar-benar dipakai adalah `LearningLog.label` (`games/data/learning-log.js`), jadi L2 diukur di sana.
- `level:start/end` **tidak** ditambahkan. Belum ada satu pun pendengar (`grep "on('level:"` kosong), jadi event itu tidak berguna sampai ada konsumennya (PRD-21 ritme sesi).
- L1 tidak memainkan satu level penuh per game. Yang dibuktikan per halaman adalah jalur lapor; dua titik jawab dibuktikan dengan ketukan sungguhan. Sisanya dibuktikan statis dan dengan parse setiap skrip inline.

**Ikut di rilis ini:**
- `tools/qa-game-a11y.mjs` mengukur ulang sekali halaman yang naik di atas baseline, di tab baru.
- Alasannya: CI v64.64 dan v64.66 gagal karena Selamatkan Kereta mencatat kontras rendah 1 (lokal 0 dalam 3/3).
- `QA_PLANT` tetap gagal setelah ukur ulang, jadi regresi sungguhan tetap tertangkap.

**Regresi game yang disentuh** (beban mesin ~15–22, A/B dengan v64.63):
- Lulus: battle-arena, bus-coverage, g15-math-pause, g27-spelling, monster-candy-drive, soal-arcade, g14-obstacle-quiz, gym-drive, mario-parallax, museum-drive, run-parallax.
- `qa-gt-raid` goyah di kedua pohon: baru 46 dan 44 dari 48, lama 44 dan 46 dari 48.
- `qa-sd-play` MEM-06 "all answers fit without scrolling" 390×844 gagal juga di v64.63, jadi sudah ada sebelumnya.
- `tools/perf-budget.json`: baseline Mario Pokemon (38→41 request), Monster Candy (35→37) dan Bawah Laut (33→35 request, 493→522 kB) dinaikkan.
  - Angkanya **sama persis di HEAD v64.66** (A/B 2×), jadi kenaikan itu dari sakuga + hit-feel (v64.64–66), bukan dari PRD ini.
  - Dari PRD ini sendiri hanya +1,2 kB (`save-engine.js`).
  - Request bus/log/mastery di layar pertama: 0 (daftar request diperiksa per halaman).
