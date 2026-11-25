# PRD-57 Sisa catatan bug bash: layar miring G3/G7, toast pencapaian

- **Status:** live v64.92 (lihat Hasil)
- **Sumber:** owner 2026-11-25 "kerjakan task2 lain yang saya comment, cek to do list dll". Daftar sisa diambil dari
  `docs/prd/README.md` (status tiap PRD) dan catatan "tidak diubah" di PRD-47.

## Daftar sisa yang diperiksa

| Asal | Catatan | Keputusan |
|---|---|---|
| PRD-47 | G3 di layar miring: pilihan jawaban di bawah lipatan, anak harus menggulir | dikerjakan (L1) |
| PRD-47 | teks toast pencapaian (coklat di ungu tua) kontras rendah | dikerjakan (L3) |
| ditemukan saat L1 | G7 di layar miring: label dua baris mendorong tombol keluar layar pada soal tertentu | dikerjakan (L2) |
| PRD-47 | `games/monster-candy.html:582-584` busur tanpa `moveTo` | tidak diubah: belum ada bug terlihat |
| PRD-47 B4 | `qa-gt-raid` 5/5 berturut-turut belum terbukti (mesin sibuk) | dicoba ulang, lihat Hasil |
| PRD-13 | petunjuk b/d, p/q, kiri/kanan | tetap belum: belum ada game yang mencatat pilihan salah dalam bentuk itu |
| PRD-06 | uji di tablet asli | tetap terblokir: `adb devices` kosong (2026-11-25) |
| PRD-53 R3 | papan online | ditunda owner 2026-11-24 |
| owner 2026-10-17 | sprite monster Garasi Tempur, mobil 3 arah, pack mobil kertas | menunggu aset dari owner |

## Laws

- **L1 G3 layar miring tanpa gulir.** Di 760x360 dan 812x375 keempat tombol jawaban G3 berada di dalam layar tanpa
  menggulir, dan papan petunjuk menampilkan minimal satu baris utuh. Gate `qa-landscape-choices` kini menuntut
  `directlyInView` (dulu cukup "bisa digulir") dan mengukur baris petunjuk.
- **L2 G7 kasus terburuk.** Semua label G7 diisi kata terpanjang ("BUNGA MATAHARI", dua baris): tombol tetap di
  dalam layar 760x360 dan 812x375, tinggi tombol >= 48 px.
- **L3 toast terbaca.** Judul dan nama toast pencapaian >= 4.5 terhadap setiap warna latar gradien, di 390x844 dan
  844x390, toast utuh di layar (`tools/qa-prd57-toast.mjs`).
- **L4 tanpa regresi.** G4 dan G3/G4/G7 tegak tetap lulus; `qa-hub-boot`, `qa-prd47-bugs`, `audit-no-emoji`,
  manifest luring segar.

## Hasil

| Law | Merah (sebelum) | Hijau (sesudah) |
|---|---|---|
| L1 | G3 tombol sampai 452 px di layar 360/375 (lulus lama hanya karena "bisa digulir"); petunjuk tinggi 1-2 px untuk baris 15 px | tombol sampai 350/365 px, tinggi 64 px; petunjuk 15 px = satu baris utuh |
| L2 | label terpanjang: tombol sampai 367 px di layar 360 (soal acak kadang 338, kadang 367) | 342/353 px, tinggi 62 px |
| L3 | judul 1.57, nama 1.05 | judul 9.89, nama 13.33 |
| L4 | `qa-prd50-g7` L5: tombol G7 satu baris 46 px di 844x390 (akibat padding L2 versi pertama) | `min-height:48px`; `qa-prd50-g7` 9/0, `qa-hub-boot` 13/0, `qa-prd47-bugs` 6/0, `qa-game-a11y` 3/0, `audit-no-emoji` bersih |

Ditemukan saat regresi: `qa-prd42-listen` L3 G11 merah juga di kode lama (HEAD bersih, port lain): gate menunggu
tetap 900 ms lalu mengecek gambar sudah termuat; berkas ada di disk dan kodenya benar. Gate kini menunggu gambar
sampai 8 s: hijau 15/0; mutasi alamat gambar `.webpX` → merah di 3 ukuran. Gate ini tidak dijalankan CI.

Penyebab L1: blok "mockup-match" G3 (`style.css`, medali 132 px, tombol 96 px) ditulis sesudah blok layar miring dan
menimpanya; papan petunjuk menyusut di kolom flex. Perbaikan: blok layar miring baru sesudah blok mockup (medali
56 px, ubin huruf 34x38, tombol 64 px, petunjuk satu baris, `flex-shrink:0`).
Penyebab L3: aturan latar ungu (`#1C1030 -> #2D1B69`) menimpa latar emas lama, warna teks tidak ikut diganti.

`qa-landscape-choices` belum pernah dijalankan CI; kini masuk `ci-verify.sh` bersama `qa-prd57-toast` (tag `fit57`).
