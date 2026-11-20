# PRD-47 Bug bash: Ducky, toast, MEM-06, gate GT, kode mati G13c

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** belum mulai
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
