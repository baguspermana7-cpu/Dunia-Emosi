# PRD-06 Jalur uji perangkat asli — **TERBLOKIR: owner menyalakan USB debugging + colok tablet**

- **Gelombang:** Gelombang 3 — keandalan & arsitektur
- **Status:** terblokir (lihat judul)
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #6
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - `tools/device-run.sh`: `adb reverse` port runner → Chrome tablet lewat CDP (`adb forward tcp:9222 localabstract:chrome_devtools_remote`);
  - `puppeteer.connect`;
  - subset gate: `qa-action-latency` (QA_SIZE dari layar asli), law 15 Timmy, fps tier, watchdog stall.
- **Laws:**
  - (L1) gate mencetak model perangkat + ms nyata;
  - (L2) satu run penuh tanpa intervensi;
  - (L3) hasil dicatat di asesmen.
- **Bisa disiapkan sebelum tablet ada:** skrip + dry-run terhadap Chrome desktop lewat CDP. Run sesungguhnya menunggu tablet.
- **Usaha:** M.
