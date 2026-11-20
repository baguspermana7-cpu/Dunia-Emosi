# PRD-31 Lampu dipanggang (pilot)

- **Gelombang:** Gelombang 3 — keandalan & arsitektur
- **Status:** ditutup 2026-11-21 (K3, rencana Gelombang 5 disetujui owner)
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #31
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:** pilot satu sprite utama (kapal Timmy) lewat pipeline Blender→render yang ada (`tool_blender`).
- **Laws:**
  - (L1) A/B screenshot di 3 ukuran, owner pilih;
  - (L2) ukuran berkas ≤ +20%;
  - (L3) tanpa outline putih.
- **Lanjut ke sprite lain hanya bila owner memilih versi baru.** Nilai terendah di register, jadi dikerjakan terakhir.
- **Usaha:** M (pilot).

## Ditutup 2026-11-21

- **PRD-29:** nama `GameShell` bentrok dengan HUD kayu yang tidak diadopsi. Kontrol rumah sudah seragam lewat `DuniaHome`. Nilainya kecil dan biayanya XL.
- **PRD-31:** nilai terendah di register. Pilot baru dikerjakan kalau owner memintanya.
- **PRD-06** tetap terblokir menunggu tablet.
