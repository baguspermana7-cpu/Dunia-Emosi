# PRD-23 Indikator siap luring per game

- **Gelombang:** Gelombang 2 — pengalaman anak & orang tua
- **Status:** live v64.88 (2026-11-22)
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #23
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - tiap game punya daftar aset wajib (dari precache SW);
  - beranda menampilkan lencana kecil "siap" (ikon, bukan emoji) bila semua ada di cache;
  - tombol orang tua "unduh semua" saat online.
- **Laws:**
  - (L1) cache dihapus satu aset → lencana hilang untuk game itu saja;
  - (L2) setelah "unduh semua" + offline → semua game dengan lencana bisa dimulai (gate offline per game).
- **Usaha:** M.

## Revisi 2026-11-21 (Gelombang 5, berlaku di atas desain di atas)

- **Desain:**
  - `tools/build-offline-manifest.mjs` menghasilkan `games/data/offline-manifest.json` per game. Isinya rujukan statis halaman + modul `DuniaLoad` + aset lazy yang dipakai level 1–3.
  - Lencana ikon "siap" di tile peta.
  - "Unduh semua" di balik gerbang orang tua.
- **Laws:**
  - L1: satu aset dihapus dari cache → hanya lencana game itu yang hilang.
  - L2: setelah "unduh semua" + offline → setiap game berlencana bisa dimulai (gate offline yang sudah ada).
  - L3: manifest segar: dibangun ulang = tidak berubah, dicek di CI.

## Hasil (v64.88, 2026-11-22)

- `tools/build-offline-manifest.mjs` menulis `games/data/offline-manifest.json`: per tile peta beranda, berkas yang
  dibutuhkan game itu untuk dibuka tanpa internet, persis seperti diminta peramban (`?v=` ikut, karena service worker
  menyimpan per URL). Isinya: halaman + rujukan statisnya, modul pemuat `save-engine.js`, dan berkas yang diminta
  game saat berjalan, direkam oleh `tools/record-offline-runtime.mjs` ke `games/data/offline-runtime.json` (token
  rilis disimpan sebagai `{v}`). Gambar bernomor ikut sekeluarga (deck-chair-2..8), folder dengan >= 8 gambar
  terekam ikut utuh (game memilih acak). Total 28 game, sekitar 158 MB (34 MB = 1024 sprite Pokemon).
- **Perbaikan v64.89+ (CI merah):** di CI, Mojo sampai ke mode kejar (99 prop `mojo-chase/props` tak terekam) dan
  Ejaan memutar kata lain (`audio/words`). Aturan ditambah: folder terekam >= 8 berlaku juga untuk suara; folder yang
  disebut literal di kode game sendiri ikut utuh bila <= 1 MB (yang besar, mis. 150 MB animasi monster, tetap di
  luar). Total jadi sekitar 186 MB. Berkas yang masih terlewat luring dilaporkan gate, tidak menggagalkan: hukum L2
  = game terbuka dan jalan tanpa galat (gambar/suara yang terlewat menyusul saat online). Builder 60 s -> 8 s.
- Tidak dicakup: tile film (punya "Siapkan Offline" sendiri) dan Blippi (membungkus game di `/game1/`, di luar repo).
- Lencana awan hijau bercentang (SVG) di pojok tile bila semua berkas game itu ada di cache. Dibaca dari cache, bukan
  dari bendera: berkas hilang = lencana hilang.
- "Unduh semua game" di Dasbor (di balik gerbang orang tua), dengan ukuran ("Sekitar 186 MB") dan kemajuan.
- **Langkah rilis baru:** setelah `normalize-cache-tokens`, jalankan `node tools/build-offline-manifest.mjs`
  (manifest memuat token). CI menjalankan `--check`. Rekam ulang runtime bila game mengubah apa yang dimuatnya; gate
  L2 memberi tahu.
- Gate `tools/qa-prd23-offline.mjs` (server sendiri, dimatikan untuk bagian luring): merah di origin/main (berhenti:
  tombol Unduh semua tidak ada), hijau 7/0: 28/28 berlencana, satu berkas dihapus = hanya game 25 kehilangan
  lencana, server mati = 12 halaman berlencana terbuka tanpa error, 0 berkas runtime yang tidak didapat (lokal).
