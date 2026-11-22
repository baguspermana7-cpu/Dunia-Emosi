# PRD-07 Telemetri lokal + "Kesehatan perangkat"

- **Gelombang:** Gelombang 3 — keandalan & arsitektur
- **Status:** live v64.89 (2026-11-22)
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #7
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - `games/data/telemetry.js`: ring buffer ≤200 entri per perangkat;
  - pasif lewat `PerformanceObserver` (`event` durationThreshold 16, `longtask`);
  - isi: stall/galat dari watchdog lewat bus, p50/p95 jeda ketuk per game;
  - dasbor orang tua menampilkan "Kesehatan perangkat" + ekspor teks.
- **Laws:**
  - (L1) setelah sesi skrip, p95 per game tampil dan cocok dengan pengukuran gate ±10 ms;
  - (L2) overhead per ketukan <2 ms (A/B pakai `qa-action-latency`);
  - (L3) buffer tidak melebihi 200 entri / 30 KB;
  - (L4) jank buatan 60 ms terlihat di halaman.
- **Usaha:** M.

## Revisi 2026-11-21 (Gelombang 5, berlaku di atas desain di atas)

- **Desain:** `games/data/telemetry.js`, ring buffer ≤200 entri / 30 KB, berisi:
  - stall watchdog (`freeze-watchdog.js` ikut memancarkan ke bus);
  - galat;
  - jumlah long task per game.

  Bukan gate p95, karena PRD-33 menunjukkan angka frame terlalu bising. Hasilnya tampil di dasbor (di balik gerbang), dengan ekspor teks.
- **Laws:**
  - L1: jank buatan 300 ms tercatat.
  - L2: galat buatan tercatat.
  - L3: buffer ≤200 / 30 KB.
  - L4: overhead per ketukan <2 ms (A/B `qa-action-latency`).

## Hasil (v64.89, 2026-11-22)

- `games/data/telemetry.js` (DuniaTelemetry), dimuat oleh `freeze-watchdog.js` (folder dan token `?v=` yang sama),
  jadi ada di setiap halaman game yang punya watchdog. Hanya di perangkat: `localStorage['dunia-telemetry']`, tidak
  dikirim ke mana pun.
- Isi: temuan watchdog lewat event `dunia-freeze` (stall, render-stall, boot-slow, error, rejection -> promise),
  long task >= 200 ms sebagai `jank`, dan hitungan semua long task per game (`lt`). `g` = G-nomor bila layar game hub
  terbuka, selain itu nama halaman.
- Buffer: <= 200 entri dan <= 30 KB, yang tertua dibuang.
- Dasbor (di balik gerbang): "Kesehatan perangkat" dengan chip Tersendat / Galat / Macet / Gambar berhenti, atau
  "Semua lancar"; tombol "Salin laporan" (teks; bila clipboard ditolak, teks tampil untuk dipilih).
- Gate `tools/qa-prd07-telemetry.mjs`: merah di origin/main (L1/L2 tidak tercatat), hijau 6/0: jank 300 ms di G4
  dan di kuis-matematika, blok 4.5 s = stall G4, galat + rejection tercatat, 500 entri -> 181 / 29 896 byte, Dasbor
  dan laporan.
- **L4 overhead:** A/B `qa-action-latency` di index.html, bergantian 2x: tanpa telemetri median 61 / 66 ms, dengan
  telemetri 65 / 62 ms (rata-rata sama, 63.5 ms). Selisih per putaran (+-4 ms) adalah derau ukur per frame, bukan
  biaya: telemetri tidak memasang pendengar input apa pun. Tidak dijadikan gate CI (terlalu bising, sama seperti
  PRD-33).
- Catatan: galat dari skrip lintas-asal tercatat sebagai "Script error." (aturan peramban); galat sebelum
  telemetry.js termuat hanya ada di `__freezeLog` watchdog.
