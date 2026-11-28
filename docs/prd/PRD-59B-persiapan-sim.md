# PRD-59B Persiapan SIM Abu Dhabi (Relocation to UAE, menu 2)

Induk: `PRD-59-orang-tua-abudhabi.md`. Owner, 2026-11-28: "apps utk simulasi ujian SIM agar saya sebagai orang indo
bisa latihan ujian sim, harus sangat accurate presisi dan valid dan update ... Saya akan gunakan itu sebagai panduan
utama dan satu2nya ... ada status progressnya per masing2 ... PRD UIUX, system, skema dll. WF engine".

## 1. Tujuan dan batas
- Owner (WNI, pemegang SIM A Indonesia) memahami **jalur resmi** SIM Abu Dhabi, langkah demi langkah dengan biaya,
  dan **lulus ujian teori** pada percobaan pertama.
- Bahasa: Indonesia + teks Inggris asli di setiap soal; mode "Inggris saja" seperti ujian (keputusan owner).
- Jujur: bank soal ujian resmi tidak dipublikasikan. Soal disusun dari aturan resmi (UU Lalu Lintas Federal UAE
  No. 14/2024 dan peraturannya, situs Abu Dhabi Mobility / TAMM / Polisi Abu Dhabi, buku panduan sekolah mengemudi
  berlisensi) dan rambu resmi. Setiap soal menyebut sumbernya dan tanggal cek.
- Di luar cakupan: latihan praktik jalan (hanya daftar periksa dan tips), emirat lain selain catatan perbedaan.

## 2. Struktur konten
### 2.1 Alur SIM (daftar periksa berstatus, seperti PRD-59A)
Jalur ditentukan riset: (a) apakah SIM Indonesia bisa **ditukar langsung**; bila tidak, (b) jalur kursus: buka berkas
(Traffic File) + tes mata, kelas teori (jam), ujian teori, latihan praktik (jam minimum), penilaian internal, tes
parkir / halaman, tes jalan, terbit SIM. Tiap langkah: apa, di mana, bawa apa, waktu, biaya (AED, tanggal, sumber,
perkiraan atau tidak), dan kesalahan umum. Status Belum / Sedang / Selesai + tanggal + biaya sebenarnya + catatan.

### 2.2 Topik bank soal (masing-masing >= 10 soal)
Rencana awal 11 topik. Riset 2026-11-28 tidak menemukan kisi-kisi resmi per kategori; sumber sekunder (YDA,
drivinginstructor.ae, uaedrivingtest) memakai kelompok di bawah. Topik yang sumbernya bertentangan atau kosong
(belok kanan saat merah, badai pasir, kursi depan anak, tebusan lampu merah, denda bundaran) sengaja tidak dijadikan
soal, karena jawaban yang salah lebih buruk daripada tidak ada soal. Jadi 6 topik, 75 soal:

| id | Topik | Soal | Dasar utama |
|---|---|---|---|
| signs | Rambu (larangan, perintah, peringatan, petunjuk), dengan gambar | 22 | Konvensi Wina (bentuk), panduan rambu UAE |
| priority | Hak jalan, bundaran, kendaraan darurat, pejalan kaki | 10 | UU Federal 14/2024 Pasal 5-6 |
| speed | Batas kecepatan, radar tanpa toleransi, kabut, denda kecepatan | 10 | pers 2025-2026, UU Pasal 5 |
| lanes | Menyalip, garis, bahu jalan, jarak aman | 10 | aturan pelaksana 2027 (pers), polisi Abu Dhabi |
| safety | Sabuk, ponsel, alkohol, anak, bus sekolah, kecelakaan | 12 | UU Pasal 5, 7, 35; polisi Abu Dhabi |
| law | Black points, potongan denda, asuransi, SIM asing, biaya TAMM, format ujian | 11 | UU Pasal 9, 19, 37; halaman TAMM |

### 2.3 Isi satu soal (wajib, uji L4)
`id` stabil, `topic`, `q.id` + `q.en`, `opts[3-4]` masing-masing `id` + `en`, `a` (indeks benar), `ex.id` + `ex.en`
(penjelasan dengan aturan yang dipakai), `sign?` (kunci gambar rambu), `src` (URL), `asOf` (tanggal), `level`
(1 mudah, 2 sedang, 3 sulit), `rule?` (pasal / nama aturan bila ada).

## 3. UI/UX
### 3.1 Layar (satu halaman, beberapa tampilan)
```
Beranda SIM
 ├─ Bahasa: [Indonesia + Inggris] [Inggris saja]
 ├─ Kesiapan ujian: % (lihat 5.3) + kalimat "Siap ujian" / "Perlu latihan: <topik terlemah>"
 ├─ Ujian simulasi [Mulai]   + [Ulang soal yang salah (n)]
 ├─ Latihan per topik: baris per topik dengan progres (dikuasai x/y, % benar)
 ├─ Rambu: galeri semua rambu + arti (belajar, bukan ujian)
 ├─ Alur dan biaya SIM -> daftar periksa berstatus
 └─ Riwayat ujian (tanggal, nilai, lulus) + cadangan / pulihkan
Soal: nomor x dari y, topik, waktu (ujian), soal ID + EN, gambar rambu, pilihan A-D (ID + EN), penjelasan (latihan)
Hasil: nilai, lulus/belum, daftar yang salah dengan jawaban + penjelasan, [Ulang yang salah] [Kembali]
```
### 3.2 Aturan
- Latihan: penjelasan muncul langsung setelah memilih; pilihan terkunci; benar hijau, salah merah + jawaban benar.
- Ujian: tanpa umpan balik sampai selesai; boleh pindah soal dan mengganti jawaban; waktu habis = selesai otomatis;
  keluar di tengah = ujian tidak dihitung (konfirmasi dua ketukan, bukan `confirm()`).
- Pilihan diacak per sesi; urutan soal diacak; ujian mengambil soal merata dari semua topik.
- Gaya sama dengan PRD-59A 3.3 (token, font, 48 px, kontras, tanpa emoji, gerak ease-out, reduced-motion).
- Rambu digambar sebagai SVG dari kode (`uae-signs.js`), warna dari token, `role=img` + `aria-label`.

## 4. Sistem
### 4.1 Berkas
| Berkas | Peran |
|---|---|
| `games/ujian-sim-abudhabi.html` | kerangka |
| `games/uae/uae-sim-bank.js` | data: format ujian, topik, soal, alur SIM (`window.UAESim`) |
| `games/uae/uae-signs.js` | gambar rambu SVG (`window.UAESigns`) |
| `games/uae/uae-quiz.js` | **mesin kuis** murni: susun ujian, nilai, penguasaan, kesiapan, jadwal ulang |
| `games/uae/uae-flow.js` | mesin daftar periksa (dipakai bersama PRD-59A) untuk alur SIM |
| `games/uae/uae-sim.js` | tampilan + interaksi |
| `games/uae/uae-store.js` | simpan bersama |

### 4.2 Skema data (`uae-sim-bank.js`)
```js
UAESim = {
  checked: 'YYYY-MM-DD',
  format: { count: Number, minutes: Number, pass: Number, verified: Boolean, source?: URL, asOf?: 'YYYY-MM-DD', note?: String },
  topics: [{ id: String, title: String }],
  questions: [{ id, topic, level: 1|2|3, q: {id, en}, opts: [{id, en}], a: Number, ex: {id, en}, sign?: String,
                rule?: String, src: URL, asOf: 'YYYY-MM-DD' }],
  process: { intro: String, notes: [String], steps: [ /* skema langkah PRD-59A 4.2, phase 'sim' */ ] }
}
```
### 4.3 Skema simpanan (`localStorage['dunia-uae-sim-v1']`)
```js
{ v: 1, lang: 'iden'|'en',
  q: { [qid]: { seen: Number, right: Number, streak: Number, last: 'YYYY-MM-DD', box: 0..4 } },  // per soal
  history: [{ date, score, total, pass, secs, byTopic: { [topic]: [right, total] } }],
  process: { steps: { [stepId]: <status langkah PRD-59A 4.3> } } }
```
- Progres per topik dan "soal salah" **diturunkan** dari `q`, tidak disimpan dua kali (satu sumber kebenaran).
- Migrasi dari bentuk awal (`topics`, `wrong`, `process: {id:true}`) ke v1 saat dibaca.

## 5. Mesin (`uae-quiz.js`, murni)
### 5.1 Status per soal (Leitner sederhana, kotak 0-4)
```
benar: box = min(4, box + 1), streak + 1        salah: box = 0, streak = 0
dikuasai = box >= 3 (benar 3 kali berturut-turut)
"Ulang soal yang salah" = soal dengan seen > 0 dan box == 0
```
### 5.2 Status per topik
`baru` (belum ada soal dilihat) -> `belajar` (ada yang dilihat) -> `dikuasai` (>= 80 % soal topik box >= 3).
Ditampilkan sebagai "dikuasai x dari y" + bar.

### 5.3 Kesiapan ujian
`siap = rata-rata 3 ujian terakhir >= batas lulus` **dan** setiap topik >= 60 % benar dari soal yang dilihat **dan**
ujian terakhir lulus. Persen kesiapan = rata-rata per topik dari (soal dikuasai / soal topik). Kalimat menyebut topik
terlemah. Tidak ada janji "pasti lulus".

### 5.4 Susun ujian
`exam(bank, format, seed)`: `format.count` soal tanpa ulang, kuota per topik sebanding jumlah soal topik (pembulatan
Hamilton), urutan dan pilihan diacak dengan seed (dapat diulang untuk uji).

### 5.5 Fungsi
`record(saved, qid, ok, date)` (baru, tidak memutasi), `topicState(bank, saved, topic)`, `readiness(bank, saved)`,
`exam(bank, format, seed)`, `grade(run)`, `wrongList(bank, saved)`, `migrate(raw)`.

### 5.6 Alur SIM
Memakai `uae-flow.js` yang sama dengan PRD-59A (status, blocked, next, progress, money dalam AED -> Rp).

## 6. Hukum (merah dulu, lalu hijau)
- L4 bank: semua kolom 2.3; satu jawaban dalam jangkauan; pilihan berbeda; tidak ada soal kembar; setiap topik >= 10;
  setiap `sign` tergambar; setiap soal punya URL + tanggal; bank >= 1 ujian.
- L10 mesin kuis (node): ujian tanpa soal ganda, jumlah = format, setiap topik terwakili bila kuota >= 1, seed sama
  -> ujian sama; `record` tidak memutasi; kotak naik/turun sesuai 5.1; kesiapan 0 tanpa data dan 100 bila semua
  dikuasai dan 3 ujian lulus; migrasi bentuk lama tidak kehilangan riwayat.
- L5 browser: ujian memakai format data; waktu tampil; selesai menyimpan riwayat dengan per topik; soal salah masuk
  daftar ulang; latihan menampilkan penjelasan; mode Inggris saja tidak menampilkan teks Indonesia di soal.
- L3 simpan: riwayat, progres soal, bahasa, status alur SIM bertahan setelah muat ulang; cadangan pulih di profil
  kosong.
- L6 tampil: 0 galat, tanpa geser samping di 390, target >= 44 px, foto 3 ukuran dilihat, rambu terbaca.

## 7. Status progres pekerjaan (PRD ini, 2026-11-28)
| Bagian | Status | Bukti |
|---|---|---|
| PRD | selesai | dokumen ini |
| Riset SIM (sumber resmi + sekunder bernama) | selesai | PRD-59 §5.2 |
| Bank soal | 91 soal, 6 topik (16 soal rambu memakai gambar asli UAE) | `test-uae-data` |
| Alur SIM (11 langkah, mesin alur kerja yang sama) | selesai | `test-uae-data`, L8 di `qa-prd59-uae` |
| Mesin kuis `uae-quiz.js` | selesai; ujian memberi rambu 30 % (13 dari 45, `share` per topik, sumber sekunder, resmi tidak dipublikasikan); topik yang kurang soal menyerahkan kursinya | `test-uae-engines` 33/0, L10 merah pada mutasi |
| Rambu asli (§8) | selesai: 125 berkas Commons (112 domain publik, 11 CC0, 2 CC BY 4.0), 2,1 MB, lokal | L11 `test-uae-data` 1268/0; L12 125/125 tampil, 0 dari luar situs |
| Gambar ulang | hanya rambu rumah sakit (dipakai 1 soal, tidak ada berkas UAE bebas); gambar ulang lain disembunyikan | galeri |
| Peta perjalanan (§9) | selesai: 3 tahap, 11 langkah, 6 kategori + level, langkah berikutnya ditandai | L13 di `qa-prd59-uae`, foto dilihat |
| Luring | halaman + 125 rambu terbuka tanpa jaringan setelah satu kunjungan (SW akar didaftarkan `sw-reload.js`) | L14: merah tanpa SW, hijau 125/125 |
| Hasil ujian | per topik, "Jawaban Anda" vs "Jawaban benar", penghitung waktu disembunyikan | L5 |
| Halaman (kesiapan, topik, ujian berwaktu, galeri) | selesai | `qa-prd59-uae` 80/0 |
| Rilis | v65.00 | CI penuh |

## 8. Rambu asli dan UI lebih realistis (owner 2026-11-28)
Owner: "Deep research jika ada gambar2 utk ujian itu harus yg asli usahakan cari crawling di internet. Harus accurate
dan comprehensive." Lalu: "gambar dan uiux enhance, sedetail dan serealistis accurate".

### 8.1 Sumber gambar (urutan pilihan)
1. **Wikimedia Commons, kategori "Diagrams of road signs of the United Arab Emirates"**: SVG yang digambar mengikuti
   manual rambu resmi UAE/Abu Dhabi, berlisensi bebas (domain publik atau CC). Diunduh sekali, disimpan lokal di
   `games/uae/signs/` (aplikasi tetap luring), setiap berkas dicatat judul Commons, URL, lisensi, pembuat di
   `games/uae/signs/CREDITS.json` dan ditampilkan di galeri rambu.
2. Manual resmi (Abu Dhabi Manual on Uniform Traffic Control Devices / standar rambu ITC) sebagai acuan untuk
   mencocokkan bentuk, warna, dan teks Arab-Inggris. Gambar manual tidak disalin bila lisensinya tidak jelas.
3. Gambar bank soal resmi sekolah (EDC, YDA) **tidak** dipakai: berhak cipta dan tidak dipublikasikan.
4. SVG gambaran sendiri (`uae-signs.js`) hanya cadangan untuk rambu yang tidak ada di Commons, dan diberi tanda.

### 8.2 UI
- Rambu ditampilkan besar seperti di layar ujian (latar netral, tiang tidak digambar, ukuran tetap), dengan teks
  bilingual bila rambu aslinya bilingual.
- Soal rambu dalam ujian simulasi memakai gambar asli; galeri rambu per kelompok (larangan, perintah, peringatan,
  petunjuk) dengan nama Inggris (seperti ujian) dan Indonesia.

### 8.3 Hukum
- **L11** setiap rambu yang dipakai soal punya berkas lokal dari sumber 1 (atau tanda cadangan), lisensi tercatat
  bebas (PD/CC0/CC BY/CC BY-SA), dan URL sumber https; merah bila ada rambu tanpa kredit.
- **L12** galeri dan soal menampilkan berkas lokal itu (bukan jaringan) pada 390x844, 844x390, 800x1280; foto dilihat.

## 9. Peta perjalanan: seluruh proses terlihat (owner 2026-11-28)
Owner: "alurnya klw ada levelnya atau kategory ujian harus bagus agar juga bisa terlihat keseluruhan proses dengan
sempurna".
- Beranda SIM dibuka dengan **Peta perjalanan SIM**: 3 tahap berurutan (Berkas di TAMM; Sekolah mengemudi; Tes jalan
  dan SIM). Setiap tahap memuat langkahnya (11 langkah dari data) dengan status (belum, sedang, selesai, menunggu)
  dan hitungan x dari y.
- Langkah "Kelas teori dan ujian teori" memuat **kategori ujian** (6 topik bank soal) dengan **level** masing-masing
  (Baru, Belajar, Dikuasai) dan kesiapan ujian dalam persen. Legenda menjelaskan arti level: Baru = belum dicoba;
  Belajar = sudah dicoba; Dikuasai = minimal 80 % soal topik itu dijawab benar 3 kali berturut-turut.
- Ketuk tahap atau langkah membuka tampilan alur pada langkah itu; ketuk kategori membuka latihan topik itu.
- Data: `process.stages = [{id, title, steps: [stepId...]}]`.
- **L13** setiap langkah alur ada di tepat satu tahap, urutan tahap mengikuti urutan langkah; peta merender 3 tahap,
  11 langkah, 6 kategori dengan level; status di peta sama dengan status yang disimpan (uji browser).

Halaman Kelengkapan Dokumen (PRD-59A) mendapat peta fase yang sama di atas: 4 fase, x dari y langkah, tautan ke fase.
