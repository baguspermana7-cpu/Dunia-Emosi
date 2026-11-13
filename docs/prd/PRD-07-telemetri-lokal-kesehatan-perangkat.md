# PRD-07 Telemetri lokal + "Kesehatan perangkat"

- **Gelombang:** Gelombang 3 — keandalan & arsitektur
- **Status:** belum mulai
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
