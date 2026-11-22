# PRD-56 Cek Kemampuan: mode Normal / Cepat, ganti pemain di dalam game, soal yang aneh dibetulkan [ANAK]

- **Gelombang:** komentar owner (2026-11-22), setelah Gelombang 5
- **Status:** live v64.90 (2026-11-22)
- **Sumber:** owner 2026-11-22:
  - "IQ assessment di awal bisa mode normal atau cepat, cepat ini 1/2 dari keseluruhan test tapi tetap accurate ...
    no mistake, no bug, no error. Harus bener2 accurate dan sempurna. Rancang prd yang sangat comprehensive"
  - "Focus ke yg iq assessment dulu. Dan banyak pertanyaan yg ngebug aneh. ... Buat di game itu sendiri pilihnya
    nggak perlu sampai home jika orang lain mau coba"
  - Keputusan owner (pertanyaan 2026-11-22): Kata dan soal cerita tetap bisa dimainkan sebagai teks, tetapi **tidak
    dihitung ke IQ** sampai ada suara.
- **Aturan selesai:** `docs/prd/README.md` (berlaku penuh; satu PRD = satu rilis)

## Masalah (diaudit, bukan ditebak)
1. **Soal aneh.** Setiap soal dirender di browser (`games/cek-kemampuan.html?seed=7`, 116 soal: Pola 25, Bentuk 22,
   Kata 26, Angka 26, Cepat 17), lalu dilihat dalam lembar kontak (montage). Ditemukan:
   - Kata: 5 gambar kendaraan digambar **dari atas** (Mobil Pemadam terlihat seperti lemari merah; Taksi,
     Ambulans, Mobil Polisi, Mobil). Traktor, Sepeda, Sepeda Motor, Helikopter dan Roket membawa **potongan sprite
     lain** di tepinya. Sawi dan Bayam sama-sama seikat daun hijau, jadi ada dua jawaban benar bagi anak.
   - Kata: gambar pilihan hanya sekitar 60 px (4 sebaris).
   - Bentuk: satu sel = 16 dari 100 unit, jadi bentuk 4 sel hanya sepertiga tombolnya. Pada soal ubin, ubin contoh
     (60 px) meluber keluar kotaknya dan **menimpa tulisan "Contoh"**.
   - Cepat: beda ukuran 82 % lawan 100 % (tiga bintang lawan tiga bintang) terlihat "sama" di layar HP, padahal
     jawabannya "beda".
   - Tombol "Dengar" dan "Dengar lagi" **tidak berbuat apa-apa** sejak PRD-55 mematikan suara. Teks "Dengarkan
     katanya / ceritanya" juga salah.
   - Nama pulau di bilah main terpotong ("Pul...").
2. **Membaca tercampur ke IQ.** Sejak PRD-55, kata di Pulau Kata dan soal cerita Angka hanya tampil sebagai teks.
   Anak kelas 1 diukur kemampuan membacanya, bukan kosakata atau berhitung. Bukti: di `origin/main`, mengubah Kata
   0 -> 24 dan cerita 0 -> 8 menggeser Perkiraan IQ dari **79 ke 110**.
3. **Kebenaran simulasi melingkar.** `tools/sim-cek-iq.mjs` lama mendefinisikan "IQ sejati" sebagai rata-rata replay
   tes yang sama. Simulasi seperti itu tidak bisa membandingkan dua bentuk tes (Normal dan Cepat). Diuji dengan
   kebenaran laten, rumus PRD-54 hanya menutup **86,0 %** kasus dengan rentang "90 %"-nya.
4. **Rasch menganggap posisi = soal.** `CekIRT.theta(ok, max)` mengambil kesulitan dari urutan jawaban. Anggapan ini
   tidak berlaku begitu soal dipilih adaptif.
5. **Tes ulang dirata-rata sama berat**, padahal dua sesi bisa berbeda ketelitiannya.
6. **Ganti pemain harus lewat beranda.** Orang lain (saudara, teman, tamu) tidak bisa mencoba dari halaman ini.

## Desain
### 1. Siapa yang main (di dalam game)
- Bilah atas: tombol nama + chip **"Ganti"**. Tombol ini membuka layar **"Siapa yang main?"** yang berisi:
  - anak-anak keluarga (dari `dunia-players`);
  - tamu yang pernah main di perangkat ini;
  - **pemain baru (tamu)**: isian nama dan pilihan umur 5-6 / 7-8 / 9-10 tahun.
- Memilih anak mengganti `dunia-active-slot`, jadi semua simpanan per avatar ikut pindah. Memilih tamu menyimpan
  `cek-aktif = tamu:<nama>`, daftar tamu ada di `cek-tamu`, dan hasil tamu ada di `cek-kemampuan@<nama>`. Umur tamu
  dipakai untuk target umurnya.
- Papan perangkat menampilkan anak-anak dan tamu. Angkanya **dihitung ulang** dari sesi yang terhitung dengan rumus
  sekarang, bukan dari `best` lama yang dulu ikut menghitung Kata.
- Di HP (<= 440 px) "Papan Juara" menjadi ikon saja dan penghitung bintang di bilah atas disembunyikan (bintang
  tetap terlihat di bawah setiap pulau), supaya bilah atas muat satu baris.

### 2. Mode Normal / Cepat
- Dua kartu di peta pulau:
  - "Normal, sekitar 30 menit, paling teliti";
  - "Cepat, sekitar 15 menit, sedikit kurang teliti".
- Pilihan disimpan per anak atau tamu (`mode` di catatannya). Intro pulau menulis modenya. Pulau yang dijeda tetap
  memakai mode saat ia dimulai.

| Pulau | Normal (tetap) | Cepat |
|---|---|---|
| Pola, Bentuk, Kata | tangga dari soal 1, 2 latihan, berhenti setelah 3 salah | **adaptif (CAT)**: mulai di tengah pita umur (logit); soal berikutnya = soal belum terpakai yang peluang benarnya paling dekat **.55**; panjang tetap Pola 10, Bentuk 9, Kata 10; 1 latihan (ke-2 hanya bila salah) |
| Ingat | maju, mundur, kotak dari panjang 2 | mundur + kotak, mulai panjang 3; dua salah di 3 kembali ke 2 sekali (aturan balik), skor `(mulai - 1) + benar / 2` tetap |
| Cepat | 85 detik | 45 detik, nilai = benar per menit |
| Angka | titik 8, garis 7 (3 garis 0-20 tanpa skor + 4 garis 0-100), cerita 8 | titik 8, garis 0-100 saja (4), cerita dilewati |

Angka .55, 10/9/10, dan titik tetap 8 dipilih oleh simulasi (L1), bukan tebakan. Dengan target .65 dan 9/8 soal,
Cepat gagal hukum RMSE (1,22x). Dengan titik 4, gagal juga.

### 3. Penilaian (kedua mode)
- **Perkiraan IQ = perkiraan skor umum laten G** (SD 15 di populasi), bukan skor bentuk tes tertentu:
  - setiap pulau memberi `x_i = T_i + e_i` (skor sejati + galat yang variansnya diketahui dari keandalan sesi itu);
  - pulau sejati berkorelasi `R_TRUE = .45 / rata-rata keandalan Normal` (dihitung per umur);
  - `G^ = c' S^-1 x` dan rentang 90 % = `+-1.645 x 15 x sqrt(1 - c' S^-1 c)`.
  - Satu rumus melayani Normal, Cepat, campuran, kurang pulau, dan tes ulang. Cepat otomatis lebih lebar
    rentangnya.
- Pulau tangga: Rasch WLE atas **nomor soal yang benar-benar diberikan** (`rec.items`). Tanpa `items` (catatan lama),
  hasilnya identik dengan cara lama.
- Pulau bagian (Ingat, Cepat, Angka): keandalan per bagian, Spearman-Brown untuk bagian yang lebih pendek (Cepat 45/85).
- **Kata dan soal cerita keluar dari IQ** (`IN_IQ`). Pulau Kata tetap memberi bintang dan poin. Di intro tertulis
  "Belum dihitung ke IQ (soal dibaca)", batang IQ-nya bertanda "belum dihitung", dan catatan kartu IQ menyebutnya.
- Tes ulang >= 7 hari: rata-rata **berbobot ketelitian**, dengan koreksi latihan .2 pada sesi kedua.
- Setiap catatan menyimpan `mode`. Kartu IQ: "kisaran a-b (90 %, dari n pulau, mode Cepat/Normal/Normal dan Cepat)".
  Papan perangkat menandai baris "Cepat" atau "campuran".

### 4. Soal yang dibetulkan
- Kata: 12 gambar di atas keluar (`OUT`), alasannya tertulis di kode. Pilihan 2 x 2, sekitar 117 px di HP.
- Bentuk: sel diskalakan `min(24, 84 / sisi terpanjang)`, jadi bentuk mengisi tombolnya. SVG ubin mengikuti kotaknya,
  sehingga "Contoh" tidak tertimpa. Pilihan putar dibuat lebih besar (`--rs`).
- Cepat: ukuran hanya kecil (62 %) atau besar (100 %).
- Tombol "Dengar" / "Dengar lagi" dihapus, teks "Dengarkan" diganti "Baca". Bilah main hanya menulis nama pulau.

## Laws dan bukti
- **L1 akurasi** (`tools/sim-cek-iq.mjs 2000`). 2000 anak 84 bulan dengan pulau sejati diketahui memainkan aturan
  asli (`CekCore.ladder` / `CekCore.cat`, `CekProfile.iq`).

  | | bias | RMSE | r(kebenaran) | rentang 90 % menutup | kemiringan | waktu |
  |---|---|---|---|---|---|---|
  | Normal | -0,15 | 4,67 | ,948 | 90,4 % | 1,024 | ~27,5 menit |
  | Cepat | -0,16 | 5,52 | ,927 | 89,1 % | 1,023 | ~14,8 menit |

  - Cepat vs Normal: RMSE 5,52 <= 1,2 x 4,67; r(Cepat, Normal) ,875 >= r(Normal, Normal ulang) ,898 - ,05; pita sama
    83,5 % (Normal-vs-Normal 85,6 %).
  - Juga hijau di 3 aliran acak lain.
  - Merah:
    - rumus PRD-54 pada kebenaran laten menutup 86,0 %;
    - mutasi "CAT pilih soal termudah" -> bias 1,38, RMSE 6,26 (gagal).
- **L2 setengah waktu.** Sim: 14,8 / 27,5 menit = 54 %. Real tap (qa-prd56):
  - Pola 10, Bentuk 9, Kata 10 soal (Normal sampai 24 / 20 / 24);
  - Ingat 2 bagian;
  - Cepat 45 detik (pulau 56 detik termasuk latihan);
  - Angka 8 + 4.
- **L3 CAT/IRT benar** (`test-cek-items`, 2000 benih):
  - 10 soal, tidak ada yang terulang, semua di 0-23;
  - theta dengan nomor 0..n-1 sama dengan cara lama (selisih < 1e-9);
  - satu jawaban benar lagi selalu menaikkan theta;
  - nilainya hingga (finite) di 0 benar dan semua benar;
  - aturan balik span: dua salah di 3 -> 2, lalu dua benar -> skor 2.
- **L4 membaca keluar dari IQ.** Kata 0 -> 24 dan cerita 0 -> 8: IQ 97 -> 97 (main: 79 -> 110).
- **L5 main real tap** (`qa-prd56-cek-mode`, 14/14; `qa-prd53-cek` 25/25):
  - 91 layar di 390 x 844 + layar pemilih di 1280 x 800 dan 800 x 1280;
  - 0 galat halaman, 0 emoji, tombol >= 48 px dan di layar, kontras terendah 5,59.
- **L6 simpanan:**
  - mode tahan reload dan per anak (Ana Cepat, Bima tetap Normal);
  - pulau yang dijeda dilanjutkan dalam mode awalnya;
  - tamu Rina (5-6 -> 78 bulan) punya catatan sendiri yang kosong;
  - main sebagai tamu tidak menulis log belajar anak keluarga yang aktif (`DuniaLevel`): tamu 0, Bima 1; mutasi tanpa penjaga -> tamu 1 (merah);
  - tes ulang berbobot ketelitian sesuai rumus (unit);
  - anak yang sama dalam Cepat mendapat rentang lebih lebar daripada dalam Normal.
- **A1-A3 soal** (`test-cek-items`, merah 3/3 di main, hijau 3/3):
  - 0 pasangan ukuran tipis (main: 4960 dari 4960);
  - 0 gambar Kata terlarang dalam 2000 x 24 soal;
  - bentuk 4 sel membentang 84 dari 100 unit (main: 64).
- **L7 tanpa regresi:** `test-cek-items` 73/73, `qa-prd53-cek` 25/25, manifest offline dibangun ulang, gate rilis.

## Batas yang jujur
- Simulasi membuktikan hitungan dan kesetaraan Normal-vs-Cepat **dengan anggapan** pita target. Sebagian besar pita
  masih "perkiraan" (PRD-53/54). Cepat tidak bisa lebih teliti dari Normal, hanya dekat; rentangnya mengatakan itu.
- Laju 45 detik dibandingkan dengan pita 85 detik (anggapan: laju per menit sama). Setiap sesi menyimpan `mode` supaya
  norma per mode bisa diperiksa nanti.
- Kesulitan soal dirancang (-2,5..+2,5 logit), belum dikalibrasi pada anak. CAT memakai anggapan yang sama dengan
  penilaian Rasch yang sudah ada.
- Papan **online** menyimpan nilai tertinggi per nama (`submit_score`). Angka lama yang dulu ikut menghitung Kata tetap
  di sana sampai anak itu bermain lagi dan nilainya lebih tinggi. Papan perangkat sudah dihitung ulang.
