# PRD-21 Ritme sesi **[ANAK]**

- **Gelombang:** Gelombang 2 — pengalaman anak & orang tua
- **Status:** live v64.86 (2026-11-22)
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #21
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - setelan orang tua (di balik gerbang dasbor): batas 15/20/30 menit atau mati (default mati);
  - di batas level berikutnya: penutup bergambar "Hari ini kamu belajar…" (dari LearningLog) → layar istirahat.
  - Tidak pernah memotong level.
- **Laws:**
  - (L1) jam tiruan lewat batas di tengah level → kartu baru muncul setelah `level:end`;
  - (L2) default mati = 0 perubahan perilaku;
  - (L3) layar istirahat bisa dibuka lagi hanya lewat gerbang orang tua.
- **Usaha:** M.

## Revisi 2026-11-21 (Gelombang 5, berlaku di atas desain di atas)

- **Prasyarat:** PRD-49.
- **Desain:**
  - Setelan di balik gerbang orang tua: 15/20/30 menit atau mati (default mati).
  - Setelah batas, pada `level:end` berikutnya: kartu "Hari ini kamu belajar…" (`LearningLog.summary` hari ini, gambar skill), lalu layar istirahat.
  - Tidak pernah memotong level.
- **Laws:**
  - L1: dengan jam tiruan, kartu muncul tepat setelah `level:end`.
  - L2: setelan mati = 0 perubahan.
  - L3: layar istirahat hanya bisa dibuka lewat gerbang.
  - L4: 3 ukuran dilihat.

## Hasil (v64.86, 2026-11-22)

- Modul baru `games/data/session-rhythm.js` (DuniaRhythm). Setelan "Waktu main" di Dasbor (di balik gerbang orang
  tua): Mati / 15 / 20 / 30 menit, default Mati. Disimpan `dunia-session-limit` untuk seluruh perangkat.
- Jam sesi (`dunia-session`) mulai di `level:start` pertama; jeda 30 menit tanpa level atau hari baru = sesi baru.
  Hanya ditulis saat batas aktif: dengan setelan Mati modul tidak menulis dan tidak menampilkan apa pun.
- Lewat batas: level yang sedang jalan tetap selesai. Pada `level:end` berikutnya muncul kartu "Hari ini kamu
  belajar" (sampai 3 nama skill dari LearningLog hari ini; tanpa data: "Bermain dan mencoba"), lalu tombol
  "Istirahat dulu" membuka layar istirahat (bulan, "Waktunya istirahat"). Teks tidak dibacakan (PRD-55).
- Layar istirahat bertahan setelah ketukan, Escape, muat ulang, dan di halaman game lain (`save-engine.js` memuat
  modul saat `dunia-rest` ada). Hanya tombol "Orang tua" + gerbang yang membukanya; hari baru juga membukanya.
- Gambar skill per baris tidak dibuat: tidak ada gambar per skill di pustaka; kartu memakai Leo yang sudah ada.
- Gate `tools/qa-prd21-rhythm.mjs` (CI smoke, jam tiruan lewat `Date.now`): merah di origin/main (L1 gagal, lalu
  berhenti: tidak ada kartu), hijau 7/0. Screenshot kartu, layar istirahat, Dasbor dilihat.
