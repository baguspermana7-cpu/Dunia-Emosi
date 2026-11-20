# PRD-22 Satu buku koleksi lintas game **[ANAK — hal baru di menu]**

- **Gelombang:** Gelombang 2 — pengalaman anak & orang tua
- **Status:** belum mulai
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
