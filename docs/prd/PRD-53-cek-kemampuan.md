# PRD-53 — Cek Kemampuan (6 pulau otak + Perkiraan IQ + Papan Juara Otak) [ANAK]

Status: v2.1 dibangun 2026-11-21 (6 pulau, tampilan baru, nama, Perkiraan IQ, papan juara perangkat). Papan
juara online (R3): modul `games/data/cek-cloud.js` siap, belum dirilis; bukti live belum bisa dari mesin kerja
(proxy lokal menolak host Supabase, 502).

Permintaan owner (2026-11-21), berurutan:
1. "Buatkan 1 game/menu untuk IQ test untuk tahu IQ anak saya yang comprehensive, anak saya umur 1 SD".
2. "Pastikan sangat accurate, cari journal dan research agar align".
3. Setelah R1: "UIUX harus align dan bagus, asset jangan pakai stock emoji atau lucide, pakai shared asset agar anak
   saya willing to test dengan happy. Pastikan bisa save input nama anak, dan bisa dilihat di leaderboard IQ.
   Pakai vfx. Nggak usah pakai isian orang tua, anak bisa coba langsung."
   Jawaban: "Buat perkiraan IQ aja" (pribadi), papan "Online semua pemain", nama "Pakai nama di game".
4. "Lebih sempurnakan PRD-nya" → v2.1 (aturan papan, keandalan, privasi nama, suara, gambar Kata ditinjau).

## Keputusan owner
- **Hasil = Perkiraan IQ** (setelah 3 pulau) dengan kisaran ±15 dan satu baris kecil "perkiraan dari permainan,
  bukan tes resmi psikolog". Tidak ada isian orang tua; usia diambil dari kelompok usia di layar nama.
- **Nama** dari pemain aktif di game; bila belum ada pemain, anak mengetik nama sekali di halaman ini.
- **Papan Juara Otak**: tab "Semua pemain" (online, R3) dan "Di perangkat ini". Hanya nama depan.
- Semua gambar dari aset bersama proyek; tidak ada emoji, tidak ada ikon pustaka.

## Nama baru di menu
- Peta: **"Cek Kemampuan"** (`games/cek-kemampuan.html`), dipandu **Profesor Owi** (burung hantu, mascot 006).
- Di halaman: **"Perkiraan IQ"** dan **"Papan Juara Otak"**.
- Bagian "Profil Kemampuan" di halaman Progress (R1) dihapus.

## Pulau
| Pulau (gambar) | Kemampuan (CHC) | Soal | Aturan |
|---|---|---|---|
| Pulau Pola (palm-island) | Penalaran pola (Gf) | Lengkapi pola 2x2 lalu 3x3 | 2 latihan; 24 soal naik; berhenti setelah 3 salah berturut-turut |
| Pulau Bentuk (arch-island) | Ruang (Gv) | Sama atau cermin, diputar 0-180°; salin ubin 2x2/3x3 | 2 latihan; 20 soal; 3 salah berhenti |
| Pulau Ingat (cave-island) | Ingatan kerja (Gwm) | Gambar maju, mundur; kotak menyala (Corsi) | Mulai 2; 2 percobaan per panjang; 2 salah di satu panjang berhenti |
| Pulau Kata (lighthouse-island) | Kosakata (Gc) | Dengar kata, pilih 1 dari 4 gambar satu kelompok (16: hewan/buah/kendaraan → makanan/benda → sayur → sains); "mana yang satu kelompok" (8: hewan, buah, kendaraan, makanan, sayur) | 2 latihan; 24 soal; 3 salah berhenti. Tanpa gambar orang, tubuh, warna. Grup pakaian/musik/olahraga/sekolah dibuang (sprite terpotong, ditinjau di lembar kontak 2026-11-21); "Bulan" dibuang (terlihat seperti biskuit). Bila kelompok rumah = makanan (buah/sayur/makanan), pilihan salah bukan makanan |
| Pulau Cepat (sunset-sea) | Kecepatan (Gs) | "Sama atau beda?" dua gambar; yang beda hanya beda 1 hal | 2 latihan; 85 detik; nilai = benar per menit; > 20 % salah ditandai |
| Pulau Angka (snow-island) | Bilangan (Gq) | Titik mana lebih banyak (1:2 → 5:6, ditutup awan setelah 1,5 s; separuh soal luas total sama); garis bilangan 0-20 lalu 0-100; soal cerita sampai 10 lalu 20 | 1 latihan per bagian; 8 + 7 + 8 soal |

Soal tes tidak diberi tanda benar/salah (tidak ada suara benar/salah, tidak ada kilau jawaban): hanya bunyi ketuk
netral, jejak bintang, dan sorakan Owi tiap 5 jawaban yang tidak tergantung benar/salah. Soal latihan mendapat
kilau SakugaFX + suara benar, atau goyang + jawaban yang benar menyala. Akhir pulau: SFX levelup, VFX
`Moment.celebrate`, konfeti sprite, 1-3 bintang, poin, bendera di pulau. Pulau bisa diulang kapan saja; "Istirahat"
menyimpan sesi 24 jam (kecuali Pulau Cepat yang berwaktu).

## Perkiraan IQ (rumus)
- Tiap target [lo, hi] dibaca sebagai separuh tengah anak (persentil 25-75): SD = (hi − lo) / 1,35,
  z = (nilai − (lo+hi)/2) / SD; target "lebih kecil lebih baik" (galat garis bilangan) dibalik tandanya.
  Pulau dengan beberapa bagian (Ingat, Angka) memakai rata-rata z bagiannya.
- **Perkiraan IQ = 100 + 15 × rata-rata z**, dibulatkan, dibatasi 55-145; kisaran ±15; butuh ≥ 3 pulau.
- Usia: kelompok '5-6' → 78 bulan, '7-8' → 90, '9-10' → 114 (dipakai pita terdekat 72-95).
- Bintang pulau: z ≥ 0,675 → 3, z ≥ −0,675 → 2, selain itu 1.
- **Keandalan**: pulau dengan median jawaban < 0,8 s (menebak; hanya pulau satu-ketuk) atau > 20 % salah di Pulau
  Cepat ditandai **"kurang pasti"**, tidak dihitung ke IQ, dan Owi bilang "Pelan-pelan ya, coba lagi besok".
- Hampir semua target berjenis "perkiraan" (design); hanya garis bilangan dari angka terbit (Booth & Siegler 2006)
  dan soal cerita dari kurikulum. Jadi angkanya kasar, dan halaman menyebutnya "perkiraan".

## Main ulang dan sesi
- Pulau selalu bisa dimainkan lagi. Kartu IQ memakai hasil terakhir.
- Papan juara memakai **set hitung**: hasil andal pertama tiap pulau sampai 6 pulau selesai; sesudah itu main ulang
  ≥ 7 hari kemudian boleh menggantinya (latihan berulang tidak menaikkan papan). Layar pulau menyebut tanggalnya.
- Setelah 2 pulau dalam satu duduk, Owi menyarankan istirahat (tidak memblokir). "Istirahat" menyimpan sesi per
  pulau selama 24 jam (Pulau Cepat mulai ulang karena berwaktu).
- Semua petunjuk, kata dan soal cerita diucapkan (`DuniaSpeak`); tombol **"Dengar lagi"** di bar soal.
- Ketukan dalam 300 ms pertama sebuah soal diabaikan (ketuk ganda tidak menjawab soal yang belum dilihat).

## Papan Juara Otak
- "Di perangkat ini": semua anak di `dunia-players`, masing-masing dengan Perkiraan IQ terbaiknya
  (`best` di catatan `cek-kemampuan` miliknya); peringkat IQ, lalu jumlah pulau; seri berbagi peringkat; anak aktif
  disorot. Gambar avatar = sprite UISprites `emo` sesuai hewan pilihan anak.
- Tab bawaan = "Di perangkat ini". Tidak ada jaringan saat halaman dibuka.
- "Semua pemain" (R3, `games/data/cek-cloud.js`): `fetch` biasa ke RPC Supabase (tanpa SDK/CDN), kunci anon publik
  dari `games/data/cloud-config.js`. Satu kode akun per anak (`avatarScoped 'cek-cloud-code'`).
  Nilai = **IQ × 10 + jumlah pulau** (satu skor tertinggi per anak, `submit_score` hanya menyimpan nilai terbesar),
  nama = `Ana|lion`. Jaringan dipakai hanya saat rekor baru dikirim dan saat tab dibuka (pengecualian yang disetujui
  owner untuk aturan tanpa-pihak-ketiga).
- Privasi: hanya nama depan (huruf, maks 12); nama kasar (daftar blokir Indonesia/Inggris) dikirim sebagai
  "Pemain"; gambar avatar; tanpa usia atau data perangkat.
- Sebelum R3 dirilis, tab ini menulis "Sedang offline" dan menampilkan papan perangkat.
- Bintang tile hub `#gstars-cek-lbl` membaca bintang anak aktif dari catatan `cek-kemampuan`.

## Tempat dan layar
- Tile "Cek Kemampuan" ada di zona **Menara Memori** (zona otak) di Pilih Game.
- HP dimiringkan (tinggi ≤ 500 px): layar "Putar HP-mu jadi tegak, ya!" menutup halaman (soal berwaktu tidak boleh
  perlu scroll). Tablet mendatar (1280x800) dan tegak (800x1280) dimainkan penuh.

## Sumber (dibaca 2026-11-21)
| Keputusan | Sumber | Status baca |
|---|---|---|
| 6 kemampuan = CHC broad abilities | Schneider & McGrew 2018 (lewat ringkasan sekunder) | sekunder |
| Profil bukan diagnosis | Canivez & Youngstrom 2019, CHC Challenges | ringkasan |
| Format soal tablet usia 3-15 | Weintraub et al. 2013, NIH Toolbox CB (SRCD Monograph 78(4)) | abstrak |
| Tanpa efek game saat soal dinilai | Lumsden et al. 2016 (JMIR Serious Games 4(2) e11); JMIR SG 2021 | ringkasan |
| Pola 2x2 / 3x3 | Raven CPM norm studies (Serbia 2007, Lituania 2005) | abstrak |
| Putaran + cermin | Frick, Moehring & Newcombe 2014; Frick, Ferrara & Newcombe 2013 | ringkasan |
| Span maju/mundur/Corsi | Gathercole et al. 2004; Pagulayan et al. 2006 | **teks penuh tidak terjangkau** (proxy 502 / paywall) |
| Garis bilangan 0-100 (R2) | Booth & Siegler 2006: PAE TK 24 %, kelas 1 12 % (14 % di Siegler & Booth 2004), kelas 2 10 %; kelas 1: 56 % linear, 40 % log | **teks penuh, dikutip** |
| Banyak-sedikit 1:2 sampai 5:6 (R2) | Halberda & Feigenson 2008 (lewat ulasan; teks penuh diblokir) | sekunder |
| Hitung sampai 20 (R2) | CP Matematika Fase A, SK Kepala BSKAP 032/H/KR/2024 | salinan dokumen |

Konsekuensi jujur: semua target R1 berjenis **design** (ditampilkan "perkiraan"), karena tabel norma span dan
penalaran tidak bisa dibaca langsung. Satu-satunya target `published` (garis bilangan) dipakai di R2.

## Hukum (bukti)
- L1 generator: satu jawaban benar per soal, 2.000 seed (Kata, Cepat, Angka) — `tools/test-cek-items.mjs`.
- L2 alur dengan ketukan nyata: Pola 8+3, Bentuk 5+3, Kata 10+3, Ingat rentang 3, Cepat 12+4 → 8,5/menit + tanda,
  Angka titik level 2 / garis ±12 % / cerita 5 — `tools/qa-prd53-cek.mjs`.
- L3 keandalan: pulau bertanda keluar dari IQ dan tampil "kurang pasti".
- L9 nama: nama + hewan pemain di bar atas; tanpa pemain nama ditanya sekali dan bertahan setelah reload; nama kasar
  → "Pemain".
- L10 IQ: tengah → 100, atas → 110, batas 55/145, galat garis dibalik, < 3 pulau → tanpa angka; angka di layar =
  `CekProfile.iq`.
- L11 papan: peringkat + seri + sorot anak aktif + per anak; enkode IQ×10+pulau; offline → "Sedang offline".
- L12 efek: 0 suara benar/salah di soal bernilai; latihan benar → `correct`; akhir pulau → `levelup` + `celebrate`.
- L13 tampilan 390x844, 1280x800, 800x1280 (844x390 = layar putar): 0 galat, tanpa emoji, gambar termuat, tombol ≥ 48 px, kontras ≥ 4,5,
  screenshot dilihat; lembar kontak gambar Kata dilihat.
- L6 offline: kunjungan kedua mulai tanpa jaringan.
- L14 hub: tile + bintang; bagian `#dash-cek` hilang; `game.js` tetap 10599 baris.

## Hasil (v64.77, 2026-11-21)
- `test-cek-items`: 49/0; mutasi (tanda balik, SD salah, pasangan Cepat 2 beda, grup orang, seri, filter keandalan,
  daftar blokir, enkode, aturan makanan) masing-masing merah.
- `qa-prd53-cek` 390x844: 19/0. Tiga ukuran + layar putar: 50/1 (satu ukuran tombol tab 390 sekali, lalu 19/0 saat
  diulang). Screenshot setiap layar dilihat.
- `audit-no-emoji`: 0 emoji di DOM. `qa-local-refs`: 1073/1073.
- Belum: papan online (R3), proxy lokal menolak host Supabase (502); Pulau Cepat penuh hanya di run pertama v2.
