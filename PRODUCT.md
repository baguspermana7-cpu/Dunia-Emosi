# Dunia Emosi — PRODUCT

> Ditulis 2026-08-08 sebagai fondasi yang hilang. Sebelum berkas ini ada, setiap
> perbaikan menciptakan dialeknya sendiri: empat perender kategori berbeda, enam
> varian token `?v=` untuk satu berkas, tiga tabel cermin-sprite yang saling
> bertentangan. Berkas ini + `DESIGN.md` adalah satu-satunya sumber rujukan.
> Isinya diturunkan dari kode yang sudah ada dan dari penolakan berulang pemilik,
> bukan dari selera penulisnya.

`register: product` — desain **melayani** permainan. Anak datang untuk bermain,
bukan untuk mengagumi antarmuka.

---

## Pengguna

**Satu pengguna nyata, bukan persona:** anak berusia sekitar 5 tahun, berbahasa
Indonesia, belum lancar membaca.

Konteksnya menentukan hampir semua keputusan teknis:

- **Tablet Android retina, ter-throttle**, dipegang **lanskap lebar**, dipasang
  sebagai **PWA**. Bukan desktop, bukan potret. Setiap perubahan tata letak
  diverifikasi di lanskap lebar dulu.
- **Sering luring.** Perangkat itu tidak selalu punya jaringan. Fitur yang hanya
  hidup saat daring adalah fitur yang kadang tidak ada.
- **Tidak bisa membaca pesan galat.** Layar yang menampilkan tulisan panjang
  sama saja dengan layar kosong.
- **Tidak bisa memanggil orang dewasa setiap kali macet.** Jalan buntu = sesi
  bermain berakhir.

Pemilik (orang tua) adalah pelapor bug, bukan pemain. Laporannya datang dalam
bahasa gejala — "tiba-tiba tertabrak tanpa tahu itu apa", "kok sisi kanan ada
black screen", "kadang hang/freeze" — dan hampir selalu benar. Perlakukan
laporan gejala sebagai data, lalu cari penyebabnya sendiri.

## Tujuan produk

Anak bisa **membuka, memilih, dan menyelesaikan** satu permainan sendirian,
berulang kali, tanpa bantuan dan tanpa jaringan.

Itu saja. Kedalaman mekanik, jumlah level, dan kemewahan visual semuanya tunduk
pada kalimat di atas.

## Prinsip

1. **Jalan buntu adalah bug paling parah.** Tombol yang diam, layar pemuatan
   yang tak pernah pergi, lapisan tak terlihat yang menelan ketukan — dari kursi
   anak semuanya identik dengan "rusak", dan tidak satu pun muncul di konsol.
   Kelas bug ini sudah berulang: `Sprite.from()` yang mengembalikan tekstur
   kosong tanpa galat, `confirm()` yang ditekan shell PWA lalu mengembalikan
   `false`, `catch` yang memanggil ulang fungsi yang baru saja melempar.
2. **Adil sebelum indah.** Rintangan yang tidak mungkin dilewati, atau level
   yang memberi nol bintang untuk permainan sempurna, merusak lebih dalam
   daripada tata letak yang jelek. Setiap bahaya harus terbukti bisa dilewati
   dengan cara main anak yang sebenarnya, bukan dengan cara main yang optimal.
3. **Gambar dulu, tulisan belakangan.** Pemain belum bisa membaca. Kategori,
   status, dan hasil disampaikan lewat sprite kereta/karakter yang nyata —
   bukan emoji, bukan glif generik. Tulisan hanya pendamping.
4. **Luring adalah keadaan normal, bukan kasus tepi.** Aset yang menentukan
   permainan harus digambar atau dimuat secara eksplisit, tidak pernah
   mengandalkan cache yang kebetulan hangat.
5. **Perbaiki di satu tempat.** Berkas bersama adalah satu-satunya implementasi.
   Menyalin logika ke halaman kedua berarti bug ketiga.
6. **Ukur, jangan tebak.** Klaim visual dibuktikan dengan merender lalu
   menghitung piksel; `getBounds()` berbohong. Klaim keadilan dibuktikan dengan
   mensimulasikan tiap bahaya terhadap kurva lompat nyata per level — puncak
   lompatan adalah jebakan yang sudah sekali meloloskan rintangan mustahil.

## Nada

Hangat, tenang, singkat, **bahasa Indonesia**. Kalimat pendek yang bisa dibacakan
orang tua dalam sekali tarikan napas. Kegagalan dijelaskan, bukan dihakimi:
"Coba lagi ya" — bukan "Gagal!".

## Anti-referensi

Hal-hal yang sudah ditolak pemilik. Menghidupkannya kembali adalah regresi.

- **Emoji sebagai isi permainan atau kroma.** Sudah ada program zero-emoji;
  pemilik eksplisit: *"jangan pakai emoji, pakai gambar salah satu kereta"*.
- **Glif generik menggantikan seni sungguhan** pada objek yang menentukan
  permainan.
- **Tampilan "kacau"** — HUD berdesakan, spanduk bertumpuk, modal meluber.
  Istilah pemilik sendiri, dipakai dua kali.
- **Karakter kereta yang termutilasi** — potongan sprite yang memotong badan,
  sisa latar putih, garis tepi tersisa. Pemilik memeriksa ini per karakter.
- **Kereta menghadap arah yang salah** relatif terhadap arah permainan.
- **Dialog native** (`alert`/`confirm`/`prompt`) di jalur mana pun yang disentuh
  anak.
- **Membangun mekanisme sendiri padahal sudah ada milik permainan itu.**
  Ditolak keras ("Tolol") saat pemilih karakter dibuat ulang alih-alih memakai
  alur yang sudah ada di dalam permainan.

## Batasan teknis yang mengikat desain

- Vanilla ES5, tanpa langkah build. Tidak ada kerangka kerja, tidak ada bundler.
- Dideploy ke **GitHub Pages dan Vercel** sekaligus; jalur harus relatif.
  Pages punya batas ukuran repo, Vercel mencocokkan pola abai secara
  case-insensitive dan pola telanjang cocok di kedalaman mana pun — satu baris
  `Sounds/` di `.vercelignore` pernah menghilangkan 3.160 berkas audio hanya di
  Vercel.
- Service worker menyajikan aset cache-first. **Setiap berkas bersama yang
  berubah wajib naik token `?v=`-nya di semua halaman sekaligus** — token yang
  berbeda antar halaman berarti perbaikan hanya sampai di sebagian halaman.
  Gerbangnya: `node tools/normalize-cache-tokens.mjs --check`.
- 17 halaman permainan + hub film. Daftar lengkap ada di `games/`.
