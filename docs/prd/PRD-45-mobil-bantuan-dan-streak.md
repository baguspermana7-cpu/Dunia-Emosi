# PRD-45 Mobil: bantuan, streak lambat, kata lebih banyak [ANAK]

- **Gelombang:** Gelombang 4C — gameplay lebih seru & beragam
- **Status:** live v64.73
- **Sumber:** `docs/audit/gameplay-variety-2026-11-17.md` (baca kode per game)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Masalah:** G6 Mobil dan G15 Lokomotif sama-sama "ambil huruf di jalur", tapi G15 jauh lebih kaya: tawaran bantuan dan streak slow-mo (`app.ticker.speed = 0.55` di `g15AcceptAssist`), set kata lebih besar.
- **Desain:** port mekanik itu ke Mobil (kode yang ada, bukan tulis ulang); set kata dari `SpellingData.WORDS`.
- **Laws:**
  - (L1) 3 salah beruntun → tawaran bantuan muncul (sama aturan G15);
  - (L2) streak 5 → slow-mo 2 s lalu kembali normal;
  - (L3) ≥ 60 kata berbeda; screenshot dilihat; gate Mobil lulus.
- **Usaha:** S-M.

## Hasil (v64.73, 2026-11-20)

**Yang berubah di `games/mobil.html`:**
- **Bantuan.** Muncul setelah 3 ubin salah berturut-turut, atau saat nyawa tinggal 1. Game berhenti sejenak dan anak memilih:
  - "Pelan + magnet": `app.ticker.speed` 0,55 selama 5 s. Mobil otomatis pindah ke jalur huruf yang benar terdekat di depan;
  - "+1 Nyawa".

  Hanya sekali per sesi. Bila anak tidak memilih apa pun, tawaran tutup sendiri setelah 8 s. Diport dari G15 (`g15MaybeOfferAssist`/`g15AcceptAssist`), dengan pemicu yang lebih ramah anak.
- **Streak.** Setiap 5 huruf benar berturut-turut:
  - chip "Beruntun 5!" (tanpa emoji);
  - 2 s gerak lambat (0,5), lalu kecepatan kembali 1.

  Chip ada di atas overlay kata-selesai dan di bawah slot huruf.
- **Kata.** Tiap peta menambah kata dari `SpellingData` (kata tunggal 3–8 huruf), dipilih per kategori yang cocok dengan peta. Hasilnya 284 kata berbeda (sebelumnya 88). Per peta paling sedikit 25.
  - Kamus dimuat lewat `DuniaLoad` sebelum daftar kata pertama, dengan batas 1,5 s supaya game tidak pernah tertahan.
  - Bank kata yang dikirim lewat config tetap dipakai apa adanya.

**Bukti (`tools/qa-prd45-mobil.mjs`, `run-gates --tag mobil45`), 13/13:**

| Law | Hasil |
|---|---|
| L1 bantuan | Di 3 ukuran, mode mudah: tawaran muncul tepat di salah ke-3 (tidak di ke-2), game jeda. Pilihan pelan: speed 0,55, magnet membawa mobil ke jalur huruf benar, setelah 5 s kembali 1. Tidak ditawarkan lagi. Mode normal: tawaran muncul saat nyawa 1, "+1 Nyawa" membuat nyawa jadi 2 |
| L2 streak | 5 benar beruntun: chip "Beruntun 5!", speed 0,5; 2 s kemudian 1 (3 ukuran) |
| L3 kata + mata | 284 kata (kota 39, hutan 48, angkasa 27, tubuh 26, pantai 25, sekolah 60, dapur 48, kebun 48). Kata dalam satu sesi tidak berulang. 0 galat. Screenshot tawaran dan chip dilihat; chip pertama menutupi slot (portrait) dan tertutup overlay (landscape), sudah diperbaiki |

**Merah di kode lama:** tidak ada `G6`/`g6OfferAssist`; bank kota 12 kata, angkasa 11, pantai 11.

**Regresi:**
- `qa-mobil-bounds`, `qa-endgame-hang` dan `qa-modal-truth`: ALL PASS.
