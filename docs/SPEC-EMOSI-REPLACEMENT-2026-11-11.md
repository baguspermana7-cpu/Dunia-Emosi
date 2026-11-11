# Spesifikasi usulan — pengganti dunia emosi (2026-11-11)

> **Status 2026-11-11: mekanik A (cek perasaan) dibangun** setelah owner menyerahkan keputusan
> ("Kmu ygputuskan yg terbaik"): `games/data/feeling-checkin.js`, gate `tools/qa-feeling-checkin.mjs` 28/28.
> Keputusan yang diambil: wajah bulat `faces*` (netral gender, jadi tidak bertabrakan dengan aturan hijab dan
> tidak menunggu aset baru), lima perasaan (senang, sedih, marah, takut, capek).
> **Mekanik B (napas bersama) dibangun** di hari yang sama: `games/data/breathe.js`, gate `tools/qa-breathe.mjs`.
> Ditawarkan hanya di momen tenang (setelah Sedih/Marah/Takut di cek perasaan; di peta setelah 3 jawaban salah
> berturut, sekali sehari), tidak pernah di atas game yang sedang berjalan. C belum dibangun.
> **Owner mengonfirmasi A dan B tetap jalan** (2026-11-11, setelah bertanya "kok ada game emosi?" dan diberi
> pilihan matikan / napas saja / biarkan: "Ok lah go ahead aja"). G1/G2/G5/G12 tetap pensiun.
>
> Status awal: usulan untuk ditinjau owner.
> Owner memensiunkan G1 Aku Merasa, G2 Napas Pelangi, G5 Cocokkan Emosi, G12
> Tebak Bayangan dan zona Pulau Emosi pada 2026-09-20 karena *sedang membangun
> mekanik pengganti sendiri* (commit `6d9db4b3`, `game.js:1218`). Dokumen ini
> bukan pengganti rancangan owner; ini masukan yang bisa diambil sebagian,
> dengan bukti apa yang sudah tersedia di repo sehingga biayanya rendah.
> Ide #16 di `docs/PRODUCT-ASSESSMENT-2026-11-10.md`.

## 1. Masalah yang dijawab
- Produk bernama "Dunia Emosi" kini tidak punya satu pun aktivitas emosi.
- Tujuan produk (`PRODUCT.md`): anak ~5 tahun, belum lancar membaca, tablet
  lanskap, sering luring, bermain sendiri. Jadi semua di bawah: gambar dan
  suara dulu, teks opsional, tanpa jaringan.

## 2. Bahan yang sudah ada (terverifikasi)
| Bahan | Isi | Lokasi |
|---|---|---|
| Wajah anak ekspresif | 20 sprite: 10 wajah **anak laki-laki** (senang, sedih, marah, takut, kaget, malu, sayang, bosan, kesal, kagum) + 10 kepala hewan avatar (singa, kelinci, harimau, …); wajah anak perempuan berhijab belum ada | `assets/db/emo/` (dilihat lewat lembar kontak 2026-11-11) |
| Wajah bulat | 208 sprite bergaya smiley (`faces` 100, `faces2` 108) | `assets/db/faces*/` |
| Animasi napas | 108 frame: makhluk awan, teratai, riak air | `assets/db/breathe/` |
| Pencatat jawaban per anak | `DuniaBus.emit('answer', …)` → `LearningLog` (domain bisa `emosi`) | `games/data/dunia-bus.js`, `learning-log.js` |
| Save per anak, watchdog, narasi | `save-engine.js`, `freeze-watchdog.js`, klip + TTS `id-ID` | `games/data/`, `games/tk-hub.js:88-117` |

Catatan aturan owner: wajah bergaya emoji adalah **gambar**, bukan karakter
emoji teks, tetapi owner sudah menolak beberapa gaya "slop" — perlu keputusan
owner apakah `faces*` boleh dipakai atau hanya `emo` (gaya anak).

## 3. Tiga mekanik usulan (urut dari termurah)

### A. Cek perasaan (30 detik, di awal sesi) — usulan MVP
- **Alur:** anak membuka aplikasi → satu layar: Timmy/maskot bertanya lewat
  suara "Hari ini kamu merasa apa?" → 5 wajah besar (senang, sedih, marah,
  takut, capek) → anak mengetuk satu → maskot meniru wajah itu + satu kalimat
  suara yang menamai perasaan ("Oh, kamu sedih. Tidak apa-apa merasa sedih.")
  → lanjut ke peta seperti biasa.
- **Pilihan tidak ada yang salah**; tidak ada bintang; tombol lewati selalu ada.
- **Data:** `DuniaBus.emit('feeling', { feeling })`; halaman orang tua (#12)
  menampilkan pola 7 hari ("3 hari sedih minggu ini").
- **Jalan buntu:** tidak mungkin — satu ketukan atau lewati.
- **Terima:** muncul paling banyak sekali per hari per anak; lewati bekerja
  dengan satu ketukan; tanpa teks wajib; gate kontras + target ≥ 88 px.

### B. Napas bersama (alat tenang, dipanggil, bukan level)
- **Alur:** dari tombol tetap di hub, atau otomatis ditawarkan setelah gagal
  3× berturut di satu level (#17) → makhluk awan `breathe/` mengembang 4 detik
  (tarik), mengempis 4 detik (buang), 3 putaran, hitungan suara → kembali ke
  tempat semula.
- **Tidak bisa gagal**; tidak ada skor.
- **Terima:** 3 putaran = 24 ± 1 detik; kembali ke layar yang sama dengan
  state utuh; reduced-motion = skala pelan tanpa partikel.

### C. Namai perasaan dalam cerita (di game yang sudah ada)
- **Alur:** di momen cerita game yang sudah ada (contoh: kapal Timmy menabrak,
  kereta terlambat), sebuah kartu kecil bertanya "Timmy merasa apa?" dengan
  3 wajah; jawaban dicatat sebagai `answer` domain `emosi`.
- **Kenapa:** memakai konteks yang sudah menarik bagi anak, bukan game baru.
- **Terima:** tiap kartu punya satu jawaban yang jelas + penjelasan suara;
  maksimal satu kartu per level.

## 4. Yang **tidak** diusulkan
- Mengembalikan G1/G2/G5/G12 apa adanya (owner memensiunkannya dengan sengaja).
- Pengenalan wajah lewat kamera, chatbot, atau apa pun yang butuh jaringan.
- Skor/bintang untuk perasaan (perasaan tidak benar/salah).

## 5. Keputusan yang dibutuhkan dari owner
1. Apakah salah satu dari A/B/C cocok dengan mekanik yang sedang owner bangun,
   atau owner ingin rancangannya sendiri saja?
2. Gaya wajah: hanya `emo` (anak), atau `faces*` boleh?
3. Aset wajah anak perempuan **berhijab** perlu dibuat sebelum A/C dipakai
   (aturan owner); `emo/` saat ini hanya anak laki-laki.

Setelah owner memilih, implementasi mengikuti pola yang sama dengan pekerjaan
lain di sesi ini: gate merah dulu, lalu hijau, lalu screenshot yang dilihat.
