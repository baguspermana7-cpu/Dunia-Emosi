# PRD-22 Satu buku koleksi lintas game **[ANAK — hal baru di menu]**

- **Gelombang:** Gelombang 2 — pengalaman anak & orang tua
- **Status:** live v64.85 (2026-11-22)
- **Sumber:** `docs/PRODUCT-ASSESSMENT-2026-11-10.md` ide #22
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Desain:**
  - `reward-catalog.js` (sudah dipakai 4 halaman) menjadi satu buku per avatar;
  - game lain memancarkan `reward` lewat bus;
  - buku dibuka dari beranda;
  - pakai art yang sudah ada saja, gap dilaporkan.
- **Laws:**
  - (L1) hadiah dari 3 game berbeda muncul di satu buku;
  - (L2) per avatar;
  - (L3) hadiah lama dari 4 halaman termigrasi;
  - (L4) screenshot buku di 3 ukuran dilihat.
- **Usaha:** L.

## Revisi 2026-11-21 (Gelombang 5, berlaku di atas desain di atas)

- **Prasyarat:** PRD-49 (`reward`).
- **Desain:**
  - Satu buku per avatar, dibuka dari beranda.
  - Isinya hadiah dari bus. Ikon katalog emoji diganti sprite yang sudah ada; gap dilaporkan, tanpa art baru.
  - Hadiah lama dari 4 halaman dimigrasikan.
  - Tombol "Koleksi" di `balapan-kereta.html:417` membuka buku yang sama.
- **Laws:**
  - L1: hadiah dari 3 game muncul di satu buku.
  - L2: per avatar.
  - L3: hadiah lama ikut pindah.
  - L4: 0 emoji.
  - L5: 3 ukuran dilihat.

## Hasil (v64.85, 2026-11-22)

- Modul baru `games/data/reward-book.js` (RewardBook): satu buku per anak (`dunia-avatar-<slug>-reward-book`),
  diisi dari DuniaBus `reward`. Pemancar: pencapaian hub (`checkAchievement`, src `hub`), rintangan kereta
  (`obstacle-engine.js`, src `obstacle`, sudah ada sejak PRD-49), lencana kompas Timmy (`timmy-kapal.js`, src `timmy`).
- Dibuka dari tombol buku di beranda (di samping tombol bisu) dan dari tombol "Koleksi" di `balapan-kereta.html`
  (ikon emoji diganti sprite piala). Halaman kereta lain memuat buku lewat pemuat bus (`save-engine.js`).
- Daftar lama `train-stickers` / `train-badges` / `train-horn-unlocks` (satu untuk seluruh perangkat) dipindah
  sekali ke buku anak yang sedang main saat itu. Anak lain mulai kosong: daftar lama tidak tahu milik siapa.
- Gambar dari pak sprite badge (`assets/db/badge`). Gap dilaporkan: tidak ada gambar khusus per rute kereta atau per
  kapal Timmy; dipakai medali/piala umum.
- Lencana Timmy di gate dipancarkan dengan payload yang sama dengan `timmy-kapal.js`, bukan dengan menamatkan level
  (jalur level Timmy tidak dijalankan di gate ini).
- Gate `tools/qa-prd22-book.mjs` (CI smoke): merah di origin/main 1/8, hijau 9/0. Screenshot 3 ukuran dilihat.
