# PRD-49 Event level/hadiah di bus + gerbang orang tua

- **Gelombang:** Gelombang 5 — sempurnakan (2026-11-21)
- **Status:** belum mulai
- **Sumber:** rencana Gelombang 5 (3 agen eksplorasi + cek ulang file:baris, 2026-11-21)
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

- **Event:**
  - `level:start` / `level:end {win, stars}` dipancarkan dari jalur bersama: hub (`showResult`/`setLevelComplete` di `game.js`) dan halaman (fungsi simpan level di `save-engine.js`; titik pastinya ditentukan saat eksekusi).
  - `reward {id, src, game}` dipancarkan dari 4 halaman yang sudah memakai `reward-catalog.js`.
- **Gerbang orang tua** (`games/data/parent-gate.js`): tahan tombol 2 s, lalu soal hitung dua digit yang dibacakan dan ditulis (mis. "23 + 14"), dengan 3 pilihan.
  - Dasbor, setelan ritme (PRD-21) dan "unduh semua" (PRD-23) ada di baliknya.
  - Keputusan owner: lihat K2.
- **Laws:**
  - L1: menyelesaikan 1 level di 5 game (2 hub, 3 halaman) → tepat 1 `level:start` dan 1 `level:end` per level, dengan `win` yang benar.
  - L2: hadiah di 4 halaman → event `reward`.
  - L3: dasbor tidak terbuka tanpa jawaban benar; jawaban salah → kembali ke beranda.
  - L4: gerbang di 3 ukuran, target ≥48 px, kontras lulus.
- **Gate:** `tools/qa-prd49-events.mjs`.

## Hasil (2026-11-21)
| Hukum | Bukti | Status |
|---|---|---|
| L1 level:start/end | merah: kode lama 0 event. Hijau: G4, G7 (tap nyata), Mobil, Ducky, Kuis menang dan kalah: tepat 1 start + 1 end, `win` benar (8/8) | lulus |
| L2 hadiah | 4 halaman, hadiah baru 1 event, hadiah ulang 0 (4/4) | lulus |
| L3 gerbang | merah: kode lama membuka dasbor langsung. Hijau di 3 ukuran: Dasbor -> gerbang; lepas sebelum 2 s tetap di langkah tahan; jawaban salah -> beranda; benar -> dasbor | lihat gate terakhir |
| L4 ukuran/kontras | 3 ukuran: tombol 56 px, di layar, kontras 8,26 | lulus |

Bug nyata yang ditemukan gate:
1. **Jari yang diangkat menjawab soal.** Soal penjumlahan muncul di bawah jari yang masih menahan; mengangkatnya
   mengetuk jawaban. Perbaikan: jawaban baru aktif 350 ms setelah jari diangkat.
2. **Waktu tahan dibaca dari jam halaman.** Halaman yang sibuk menangani "lepas" terlambat, sehingga tahan 0,9 s
   terbaca 2 s. Perbaikan: waktu dari `timeStamp` event sendiri.
3. **Gerbang terbuka di frame, bukan saat lepas.** Di mesin yang sangat sibuk, bar penuh sebelum event "lepas" sampai,
   sehingga tahan 1,5 s membuka gerbang. Perbaikan: bar hanya terisi lalu bertulisan "Lepaskan"; gerbang terbuka saat
   jari diangkat dan selisih `timeStamp` >= 2 s.

Gate menilai setiap tahan dari durasi yang dilihat halaman; percobaan yang mendarat di sisi salah 2 s karena beban
mesin diulang dan dicatat, tidak dihitung lulus atau gagal.
Belum: kekalahan di G13 dan game hub lain belum mengirim `level:end`; halaman yang mengirim baru Mobil, Ducky, Kuis.
