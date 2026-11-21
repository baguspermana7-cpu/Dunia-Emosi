# PRD-47 Bug bash: Ducky, toast, MEM-06, gate GT, kode mati G13c

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** live v64.74-20261121a (B4 sebagian, lihat Hasil)
- **Sumber:** rencana Gelombang 5 (3 agen eksplorasi + cek ulang file:baris, 2026-11-21)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **B1 Ducky:**
  - Perbaikan: `moveTo(bbX,bbY)` sebelum tiap busur bola, dan payung digambar sebagai satu path tertutup.
  - **Law:** render `bgLayer` → piksel merah (R>180, G<90) di luar kotak bola+payung = 0. Merah: >0 di kode lama.
- **B2 Toast:**
  - Perbaikan: saat ada soal di layar (`.screen.active` punya tombol jawaban), toast ditunda sampai `showFeedback`/hasil. Di layar pendek (`max-height:500px`) posisinya atas-tengah. `pointer-events:none`.
  - **Law:** G3 844×390, bintang pertama → selama 3,5 s `elementFromPoint` di tengah setiap pilihan = pilihan itu. Merah di kode lama.
- **B3 MEM-06:**
  - Perbaikan: aturan ringkas `match` untuk kartu bergambar dua sisi di portrait mana pun: gambar `clamp(30px,5vh,48px)` dan cerita dibatasi 3 baris.
  - **Law:** `qa-sd-play` hijau di 3 ukuran, dan semua kartu `match` muat tanpa gulir. Merah: MEM-06 di 390×844.
- **B4 Gate GT:**
  - Perbaikan: ganti `sleep` dengan `waitForFunction` pada state (count-up selesai = `data-n === shown`, soal baru = id berubah), dan cek hasil `tap`.
  - **Law:** 5 run berturut-turut hijau untuk tiap gate. Angka gagal/5 sebelum perbaikan dicatat dulu sebagai merah.
- **B5 G13c:**
  - Perbaikan: hapus kode mati `game.js:1415-1651` (kecuali `openGymGame` dan `_applyKodokSlot7Unlock`), `#screen-game13c`, serta rujukan `'13c'` yang tak terpakai. Hasil progres lama tidak disentuh.
  - **Law:** `qa-hub-split` dengan batas baris baru lebih rendah. Tile 13c tetap membuka gym (gate `qa-hub-boot`). 0 rujukan `g13cBuildLetterSelect`.
  - Keputusan owner: lihat K1.

## Hasil (2026-11-21, v64.74-20261121a)

Gate: `tools/qa-prd47-bugs.mjs` (tag `bugs47`, `ci-verify` menjalankan B5 statis). Merah = kode lama (HEAD sebelum rilis), hijau = rilis.

| # | Perbaikan | Merah (kode lama) | Hijau |
|---|---|---|---|
| B1 | `moveTo` sebelum busur bola pantai (dua segmen) dan sebelum tepi payung, `games/ducky-volley.html` | baris langit berwarna merah: 173 (844x390), 454 (390x844) | 0 dan 4 (4 = manik merah ekor layang-layang, r 2,5) |
| B2 | `style.css`: toast `pointer-events:none`; di `max-height:500px` toast turun dari atas (`top:max(8px, safe-area)`) | pusat pilihan G3 tertutup 2x di 844x390 (layar digulir ke bawah, seperti anak) | 0 di 844x390, 390x844, 800x1280 |
| B3 | tidak ada perubahan | tidak bisa dibuat merah: `qa-sd-play` 390x844 72 kartu x 2 jalur ALL PASS (exit 0), MEM 3 ukuran ALL PASS | — |
| B4 | `qa-gt-play`: tunggu count-up selesai (`data-n`), jam rush diperlambat 1/4. `qa-gt-raid`: tunggu modul, bandingkan frame penuh 2 s, tunggu tombol soal baru, pilih jawaban salah dari tombol aktif, cek hasil ketukan, efek `hurt`/`ouch` ditangkap MutationObserver, jam rush 1/4, jendela 4 s | raid 2/5 hijau, play 5/5 | play 5/5 hijau; raid 3/5 hijau di beban mesin load avg 15-28 (sesi lain). **Law 5/5 raid belum terbukti.** Kegagalan tersisa: efek hurt+ouch+bar tidak terjadi dalam 4 s (halaman kelaparan CPU), bukan logika gate |
| B5 | hapus G13c (232 baris `game.js`, 41 baris `index.html`), ratchet `GAME_JS_MAX_LINES` 10599 | 3 fungsi mati + `#screen-game13c` | 0; tile 13c tetap membuka Gym Pokemon; `qa-hub-boot` 13/0 |

Regresi hijau: `qa-hub-boot`, `qa-endgame-hang`, `qa-ducky-parallax`, `qa-prd41-ducky` 11/0, `qa-landscape-choices`, `qa-hub-split` 19/0.

Catatan (tidak diubah):
- `games/monster-candy.html:582-584` memakai pola busur tanpa `moveTo` yang sama; belum ada bug terlihat.
- G3 di 844x390: pilihan jawaban di bawah lipatan (356-452 px), anak harus menggulir.
- Teks toast pencapaian (coklat/emas di ungu tua) kontrasnya rendah.
