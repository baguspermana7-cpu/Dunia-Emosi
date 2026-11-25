# PRD-58 Kembangkan dan sempurnakan: level yang benar, rasa main, kurikulum kelas 1, dasbor, kedalaman, mesin

- **Status:** rancangan 2026-11-26. Dikerjakan per gelombang (58A … 58F), satu gelombang = satu rilis.
- **Sumber:** owner 2026-11-26 "Continue, kembangkan dan sempurnakan. Buat detail super detail prd". Sebelumnya:
  "kerjakan task2 lain yang saya comment, cek to do list dll" (2026-11-25, PRD-57).
- **Dasar:** empat audit baca-kode 2026-11-26 (gameplay, visual/gerak, pembelajaran, mesin), masing-masing dengan
  `file:baris` atau hitungan perintah. Enam temuan terbesar sudah saya buktikan sendiri (tanda **[dicek]**). Sisanya
  dibuktikan merah dulu saat gelombangnya dikerjakan. Temuan yang ternyata salah dicoret, tidak diam-diam dibuang.
- **Pembaca:** owner (keputusan), sesi pelaksana (langkah, berkas, bukti).

## 0. Aturan yang berlaku di semua gelombang

1. **Hukum dulu, bukti merah dulu.** Tiap butir punya hukum yang bisa dicek dengan perintah. Hukum harus gagal di kode
   sekarang (atau di mutasi yang disengaja) sebelum perbaikan dianggap benar.
2. **Lihat hasilnya.** Apa pun yang terlihat anak: screenshot di 390x844, 844x390, 800x1280 dan dilihat.
3. **Anak 6-7 tahun, kelas 1 SD.** Tanpa suara mesin (PRD-55): soal yang butuh membaca harus punya gambar.
   Tanpa emoji sebagai gambar. Tanpa layanan berbayar. Konten aman untuk anak.
4. **Per anak.** Semua simpanan baru memakai kunci per anak (`avatarScopedGet/Set`).
5. **Satu gelombang = satu rilis**: token `?v=` naik, manifest luring dibangun ulang, gate baru masuk `ci-verify.sh`
   dan tag `run-gates.mjs`, CI hijau, token live dicek.
6. **Gate tanpa jeda tetap.** Gate baru tidak boleh `sleep(n)` lalu memeriksa hal yang asinkron (gambar termuat,
   animasi, frame). Tunggu kondisinya (`waitForFunction`), dan timeout jadi kegagalan bernama, bukan `.catch(()=>{})`.
7. **Nama menu baru** dilaporkan ke owner.

## 1. Ringkasan temuan (kenapa PRD ini perlu)

| # | Temuan | Bukti | Dampak ke anak |
|---|---|---|---|
| T1 | Tingkat **sulit tidak pernah tercapai** di G3, G4, G7, G8, G9, G11 **[dicek]** | peta 4 tier x 5 = 20 level (`game.js:1346`), tombol lanjut berhenti di 20 (`game.js:2031`), tapi `levelNum <= 13 ? 'easy' : <= 26 ? 'medium' : 'hard'` (`game.js:1419`) | anak pintar mentok di "sedang"; level 1-13 sama persis |
| T2 | **G9 hanya melatih A-F / A-J** **[dicek]** | `seq` = `LETTER_SEQ_CILIK` (A-F) / `LETTER_SEQ_TUMBUH` (A-N) dari indeks 0, tanpa acak; `maxRound = min(DIFF.rounds, seq.length)` (`game.js:3576-3578`, `:788-789`) | K-Z tidak pernah ditulis |
| T3 | Mode kata G9 hanya di atas level 20 (tak terjangkau) | `selectedLevelNum > 20` (`game.js:3566`) | fitur PRD-52 tak pernah dilihat |
| T4 | Ronde "dengar" mati tapi slotnya tetap | `duniaCanListen(){ return false }` (`game.js:2673`); slot di `:2700`, `:3320`, `:3441` | tiap ronde ke-3 kosong variasi |
| T5 | **Goyang layar saat salah tidak pernah main** **[dicek]** | `.shake{animation:screenShake}` (`style.css:270`) kalah oleh `.screen.active{animation:screenIn …}` (`style.css:4655`) | jawaban salah tanpa umpan balik visual saat suara mati |
| T6 | **G4 layar miring tertimpa** (pola G3 PRD-57) **[dicek]** | `#screen-game4 .g4-animals-grid{min-height:150px !important}` (`style.css:8037`) sesudah blok miring `max-height:34vh` (`:7863`) | kotak hewan 150 px di layar 390 px |
| T7 | Mastery → kelas di arkade: anak kuat dapat soal kelas 3-4 **[dicek]** | `grade()` = rata-rata tier 1-4 (`soal-arcade.js:45-49`), tier 3-4 menyajikan `mat-sulit` (pecahan, x, kembalian Rp) | anak 6 tahun dapat pecahan |
| T8 | **Cache aset service worker tidak pernah dibersihkan** **[dicek]** | `CACHE_VERSION = 'v63.21-20261003b'` (`sw.js:18`) tidak pernah naik; `activate` hanya hapus cache yang namanya beda (`sw.js:395-403`); tiap rilis URL `?v=` baru | memori HP anak terus bertambah tiap rilis |
| T9 | Kurikulum kelas 1 bolong: bilangan 21-100 dan nilai tempat **0 soal fase A**; bangun datar ~17 soal (generator `sq-bentuk` hanya warna); uang 12 soal dan di atas Rp1.000; huruf kecil 0; suku kata 0; kalimat 0 | audit pembelajaran (hitung `SoalEngine.items()` 1020 butir, 812 fase A) | materi kelas 1 tidak dilatih |
| T10 | Hanya 5 dari 29 game membaca model penguasaan; satu skor untuk semua matematika | `mastery.js:62-66`; daftar di audit | jam lemah tersembunyi di balik tambah yang kuat |
| T11 | Dasbor orang tua hanya 7 hari, 8 keterampilan; 8 jenis matematika tampil "Matematika" | `game.js:3755`, `:3772`; `learning-log.js:89-104` | orang tua tidak melihat tren atau yang lemah |
| T12 | Isi tipis: G3 14 butir di tier default; G22 74 soal; G16 17 soal tingkat ahli; Mario 11-20 mengulang peta 10; buku koleksi diisi 3 sumber saja | audit gameplay | bosan, berulang |
| T13 | Gate CI: jeda tetap lalu cek asinkron masih ada (freeze-card, prd07, prd47, prd53); 137 gate tidak pernah dijalankan (termasuk simpanan per anak, SW reload) | audit mesin | CI merah acak; bug simpanan lolos |
| T14 | Hub memuat ~2 MB JS di awal (50 tag script), `game.js` 10.560 baris, `style.css` 1.669 `!important` | audit mesin | buka lambat di HP murah; CSS saling timpa (T5, T6) |

## 2. Gelombang

Urutan = dampak ke anak per usaha. Setiap butir: **masalah → perubahan → hukum (perintah bukti)**.

---

### 58A Level dan progres yang benar (rilis v64.93) [ANAK]

**A1 Peta tingkat per game.**
- Masalah: T1.
- Perubahan: fungsi tunggal `levelDiff(game, levelNum)` di `game.js` menggantikan `game.js:1419`. Untuk game dengan
  20 level (G3, G4, G7, G8, G9, G11): mudah 1-7, sedang 8-14, sulit 15-20. Game 40/30 level (G10, G13, G13b, G14,
  G16, G24, G19, G20) memakai sepertiga panjang petanya sendiri (`numTiers*5`), sehingga semuanya tetap punya tiga tingkat.
  Simpanan bintang per level tidak berubah (kuncinya nomor level, bukan tingkat).
- Hukum A1: simulasi node atas `levelDiff` untuk tiap game: level 1 → mudah, level terakhir → sulit, ketiga tingkat
  muncul, tidak ada level di luar peta. Merah: kode sekarang memberi 0 "sulit" untuk G3/G4/G7/G8/G9/G11.
  Browser: G3 level 18 → `state.selectedLevel === 'hard'` dan soal memakai bank sulit.

**A2 Level 1-13 tidak lagi sama.**
- Masalah: G3, G4, G7, G8 tidak membaca nomor level (audit: 0 pemakaian `selectedLevelNum`).
- Perubahan: dalam satu tingkat, jumlah pilihan dan ronde naik pelan: pilihan 3 → 4, ronde 6 → 8 (nilai pasti
  ditulis di tabel kode, bukan tebakan saat jalan). G4: jumlah hewan maksimum naik per level.
- Hukum A2: level 1 dan level 7 (tingkat sama) punya konfigurasi berbeda (`choices` atau `rounds`), dicek di node
  dan browser.

**A3 G9 semua huruf, acak, tanpa ulang.**
- Masalah: T2, T3.
- Perubahan: `seq` diambil dari kantong acak (`drawBag('g9h-'+tier, …)`) atas himpunan tier: cilik A-Z huruf besar
  yang sederhana dulu (urutan buku Kurikulum: L, I, T, E, F, H, O, C …) tetapi tetap berputar ke seluruh 26; tumbuh dan
  pintar 26 huruf. Mode kata mulai level 15.
- Hukum A3: 10 sesi berturut-turut (tier tumbuh) → ≥ 20 huruf berbeda ditulis, tidak ada huruf dua kali dalam satu
  sesi. Level 15 membuka kanvas lebar mode kata. Merah: kode sekarang = 10 huruf (A-J).

**A4 Slot "dengar" diganti ronde tanpa suara.**
- Masalah: T4.
- Perubahan: G3 → "mana yang beda" (empat gambar, satu tidak berawalan huruf yang sama); G7 → `word2img` dengan
  pengecoh satu kelompok; G8 → "huruf mana yang hilang" (satu kotak kosong dalam kata bergambar). Semua bergambar.
- Hukum A4: tiap sesi 6 ronde punya ≥ 2 jenis ronde (G3, G7, G8), 0 suara dipanggil (`speechSynthesis` spy),
  jawaban dilaporkan ke bus.

**A5 G10 memakai batas angka per level.**
- Masalah: `max`/`ops` tersimpan per level tapi tidak dibaca (audit `game.js:6247` vs `:6365`).
- Perubahan: diteruskan ke `makeGameQuestion`.
- Hukum A5: 200 soal level 1 tanpa "-" dan ≤ batasnya; level 7 memuat "-".

**A6 Arkade tidak melompat ke soal kelas 3-4.**
- Masalah: T7.
- Perubahan: `grade()` dibatasi `≤ 2` untuk pita usia 5-6 dan 7-8, kecuali orang tua memilih "Sulit" di Setelan.
- Hukum A6: anak tiruan dengan semua tier 4, pita 7-8 → 0 soal `mat-sulit` dalam 200; dengan setelan Sulit → muncul.

**Rilis 58A:** gate `tools/qa-prd58a-levels.mjs` (node + browser), tag `lvl58`.

---

### 58B Rasa main: umpan balik, gerak, layar miring (rilis v64.94) [ANAK]

**B1 Goyang layar saat salah benar-benar main.** T5. Perubahan: `.screen.active.shake{animation:screenShake .4s ease}`
(setelah `style.css:4655`) dan tetap mati saat gerak dikurangi. Hukum: sesudah jawaban salah di G3, `animationName`
layar aktif = `screenShake`; dengan reduced motion = `none`. Merah: sekarang `screenIn`.

**B2 G4 layar miring.** T6. Blok miring baru sesudah `style.css:8058` (pola PRD-57). Hukum: `qa-landscape-choices`
G4 di 760x360 dan 812x375: pilihan langsung terlihat, `min-height` kotak hewan ≤ 34vh, kotak hewan tidak menutupi
pilihan. Sisa G3 (`letter-spacing`, `padding`) ikut dirapikan.

**B3 Tema sinema per layar hub.** Hub selalu "meadow" (`dunia-cinema.js:50-58`, tidak ada `DuniaCinema.set` di
`game.js`). Perubahan: `showScreen` memanggil `DuniaCinema.set(tema)` dari tabel layar→tema (G10/G13 arena, G3 hutan,
G4 sabana, G11 lab, dst). Hukum: buka G10 → `DuniaCinema.state().theme === 'arena'`; kembali ke beranda → tema beranda.

**B4 Denyut menang.** `showResult` dan halaman mandiri (ducky, birds, mario, mobil, monster-candy, pokemon-run)
memanggil `VFX.Moment.celebrate` saat level selesai. Hukum: spy `pulse('win')` ≥ 1 per kemenangan di 7 tempat.

**B5 Gambar diam jadi hidup.** Sprite G10/G13/G13b dan gambar soal G3/G4/G7/G8 diberi napas pelan 2,4 s di
pembungkusnya (transform pembungkus, tidak menyentuh flip sprite). Hukum: dua frame 500 ms berbeda; reduced motion →
identik.

**B6 Gerak dikurangi dihormati di mana-mana.** Goyang di mobil (`mobil.html:793-798`), ducky (`:895-900`),
monster-candy (`:780-787`), mario (`:2445-2450`) dan partikel hub (`game.js:1847, 2294, 2315, 2330, 7116`) membaca
satu helper `duniaReducedMotion()` (OS + setelan `du-reduced-motion`). Hukum: reduced motion diemulasi → 10 frame
sesudah tabrakan `app.stage.x === 0`; jawaban benar di hub → 0 `.confetti-piece`.

**B7 Umpan balik yang lemah.** G8 huruf salah: ubin yang diketuk bergoyang (`wrongShakeAnim` ≤ 50 ms). G9: titik
panduan diwarnai kena/tidak (piksel titik yang terlewat merah). G18 mengirim `DuniaAnswer` agar ledakan sakuga
jalan (piksel kanvas sakuga tidak transparan sesudah benar). Partikel `.sparkle` memakai sprite, bukan emoji
(0 emoji di `.sparkle`).

**B8 Pindah layar halus.** `showScreen` memberi silang-pudar 180 ms (layar lama opacity antara 0 dan 1 di 90 ms);
deklarasi `screenIn` ganda (`style.css:76-78, 4034, 4655`) disatukan.

**Rilis 58B:** gate `tools/qa-prd58b-feel.mjs`, `qa-landscape-choices` diperluas (G4 sudah ada), tag `feel58`.

---

### 58C Kurikulum kelas 1 yang bolong (rilis v64.95) [ANAK]

Semua soal baru masuk `SoalEngine` (sumber soal bersama), bergambar, bertanda fase A dan tingkat L1-L4.

| Butir | Isi | Jumlah minimum | Hukum (node) |
|---|---|---|---|
| C1 Bilangan 21-100 | membilang ikatan sepuluh + satuan bergambar, sebelum/sesudah, membandingkan, urutan | 120 | fase A dengan angka 21-100 > 0 dan ≥ 15 % sampel L4 |
| C2 Nilai tempat | puluhan/satuan dengan batang dan ikatan bergambar | 60 | jenis `tens-ones` ada di sampel 1.600 |
| C3 Bangun datar | benda nyata → bentuk, hitung sisi/sudut; warna dipisah jadi topik sendiri | 80 unik | ≥ 80 soal bentuk unik dalam 500 tarikan |
| C4 Uang fase A | gambar koin Rp100/200/500 dan uang kertas Rp1.000, menjumlah ≤ Rp1.000 | 40 | 0 jawaban fase A > 1.000 |
| C5 Pengukuran | lebih berat/ringan, lebih tinggi/pendek, lebih panjang, dari L1 | 50 | ≥ 10 % sampel campuran |
| C6 Suku kata | gambar → suku kata awal (dari kata G8 bergambar) | 100 | ≥ 100 butir |
| C7 Kalimat pendek | baca kalimat 3-4 kata → pilih gambar | 60 | ≥ 60 butir, tiap butir 1 gambar benar |
| C8 Emosi bergambar | 48 skenario teks diberi gambar adegan + pilihan wajah | 48 | 100 % butir `emosi` bergambar |
| C9 Huruf kecil | G9: 26 jalur huruf kecil (`LETTER_GUIDES` 52 kunci) dan ronde pasangan besar-kecil di G3 | 26 jalur | `Object.keys(LETTER_GUIDES).length === 52` |

- Batas jujur: gambar baru hanya dari pustaka aset yang ada (`assets/db/lib`, 1.000+ gambar). Butir yang tidak punya
  gambar yang tepat tidak dibuat (dihitung dan dilaporkan), bukan diberi gambar asal.
- Gate: `tools/test-prd58c-curriculum.mjs` (node, masuk `ci-verify.sh` bagian statis) + bukti browser bahwa tiap
  jenis baru tampil utuh di 3 ukuran.

---

### 58D Penguasaan per jenis dan dasbor orang tua (rilis v64.96)

**D1 Satu skor per jenis matematika.** `mastery.js:62-66` menyimpan `matematika:<jenis>` (tambah, kurang, jam, uang,
ukur, bentuk, bilangan100). Skor "matematika" lama tetap dibaca sebagai awal tiap jenis (migrasi tanpa kehilangan).
Hukum: 10 jawaban jam salah menurunkan tier jam, tier tambah tidak berubah.

**D2 Lebih banyak game membaca penguasaan.** G3, G7, G8, G9, G11 (dan arkade lewat `soal-arcade`) memulai tingkat dari
tier keterampilannya bila anak sudah punya ≥ 10 jawaban. Hukum: anak tiruan tier 1 huruf → G3 tingkat mudah; tier 4 →
sulit, untuk kelima game.

**D3 Ulang terjadwal untuk huruf dan kata.** `review-queue.js` menerima butir non-aritmetika (huruf G3, kata G8,
gambar G7). Hukum: huruf yang salah di G3 muncul lagi besok (jam dimajukan di tes).

**D4 Kartu "main berikutnya" kenal semua keterampilan.** `skill-games.js:26-30` ditambah jam, pola, bentuk, perasaan,
eja, bilangan100. Hukum: baris "Membaca jam" yang lemah menghasilkan kartu.

**D5 Dasbor.** Tambah: tren 4 minggu per keterampilan (log menyimpan 90 hari, `learning-log.js:25`), 10 soal terakhir
yang salah, jumlah ulangan yang jatuh tempo, hasil Cek Kemampuan terakhir, rata-rata waktu jawab (`avgMs`,
`learning-log.js:76`), keterampilan yang belum pernah dilatih, satu baris per jenis matematika, teks kosong yang
menyebut semua game yang melapor. Hukum: log tiruan → baris yang diharapkan tampil; screenshot dilihat di 390 dan 1280.

**Rilis 58D:** `tools/qa-prd58d-mastery.mjs` (node + browser dasbor), tag `mastery58`.

---

### 58E Kedalaman isi (rilis v64.97) [ANAK]

| Butir | Masalah (bukti) | Perubahan | Hukum |
|---|---|---|---|
| E1 G3 isi | 14 dari 41 butir di tier default (`game.js:886`) | ambil dari 224 gambar `DBLabeled` | ≥ 60 butir per tier |
| E2 G7 mudah | hanya `img2word` (`game.js:3319`) | 30 % `word2img` di mudah | kedua jenis muncul di level 1-7 |
| E3 G22 Monster Candy | 74 soal, abaikan level (`monster-candy` `:152`) | `SoalArcade` bertier | ≥ 100 soal berbeda dalam 10x20 seed |
| E4 G16 Selamatkan | 94 soal; 17 untuk level 25+ (`:862`) | `SoalArcade`, soal halaman jadi cadangan | sama dengan E3 |
| E5 Mario 11-20 | peta 10 diulang (`mario-pokemon.html:1107`) | remix (cermin, musuh lebih banyak) + bos di 10 dan 20 | hash tata letak level 11 ≠ level 10; level 10/20 punya bos |
| E6 Soal bos | dari bank halaman lama (`pokemon-birds.html:1235`) | lewat `SoalArcade`/mesin g23 | soal bos tidak ada di `QUESTIONS` halaman |
| E7 Buku koleksi | hanya 3 sumber (`game.js:1862`, `timmy-kapal.js:1189`, `obstacle-engine.js:634`) | hadiah saat level selesai di G19-G25, Gym, Mojo | event `reward` dikirim dari ≥ 10 berkas; buku menampilkannya |
| E8 Nampan huruf | G8/G27 hanya huruf kata itu (`ejaan-inggris.html:364`) | 1-3 huruf pengecoh naik per level | panjang nampan > panjang kata di level 2 |
| E9 Mobil (G6) | tidak ada ubin di peta (`grep gtile-6` = 0) | dipensiunkan (owner): halaman, kode G6, aset khusus G6 dihapus | 0 referensi `mobil.html`/G6; `qa-local-refs`, `qa-app-sweep` hijau |
| E10 G28 Stinky | 72 dari 72 kartu level 1 | kartu level 2-3 dari pola kartu yang ada | ≥ 24 kartu level 2 dan 3 |

---

### 58F Mesin, CI, ukuran (rilis v64.98)

| Butir | Masalah (bukti) | Perubahan | Hukum |
|---|---|---|---|
| F1 Cache SW | T8 | `CACHE_VERSION` ikut token rilis; `activate` menghapus entri aset yang `?v=`-nya bukan token sekarang (kecuali `dunia-film-*`) | gate: pasang SW, naikkan token, muat ulang → 0 URL token lama di `ASSET_CACHE` |
| F2 Jeda tetap di gate | `qa-freeze-card.mjs:28/33`, `qa-prd07-telemetry.mjs:43-46`, `qa-prd47-bugs.mjs:39/43`, `qa-prd53-cek.mjs:213, 215-216, 327-328` | `waitForFunction` atas kondisi nyata; timeout = gagal bernama | gate lint: 0 `sleep(n)` diikuti cek asinkron dalam 6 baris tanpa `waitFor*` |
| F3 Gate yatim | 137 gate tidak dijalankan; termasuk `qa-avatar-scoped-saves`, `qa-save-persistence`, `qa-sw-reload`, `qa-pause-leaks`, `qa-freeze-recovery`, `test-berhitung-engine`, `test-super-quiz` | masukkan yang penting ke CI; sisanya diarsip dengan daftar tertulis | daftar yatim = daftar tertulis yang disetujui |
| F4 Timer tersembunyi | gate A-15 hanya 3 halaman (`qa-hidden-timers.mjs:18-22`) | `PAGES` dari `readdirSync` | ≥ 28 halaman diperiksa |
| F5 Simpanan global | `dunia-emosi-stars` berkunci nama (`game.js:1603-1606`); `mp_best`, `train-stickers`, `train-badges`, `dunia-tour-save-v1` global | lewat helper per anak + migrasi | `qa-avatar-scoped-saves` diperluas, di CI |
| F6 Muatan hub | 2 MB JS awal, 50 script; `battle-modes.js` 271 KB, `g14-g16-trains.js` 242 KB | muat modul pertarungan/kereta/vfx saat layarnya dibuka | JS awal hub < 800 KB di `qa-perf-budget` |
| F7 Gambar berat | 160 gambar > 500 KB, `mecha-*-idle.webp` 2-2,3 MB, 873 PNG | konversi webp, lembar animasi ≤ 1 MB | `audit-image-formats` di CI; 0 berkas > 1 MB |
| F8 Ratchet CSS/JS | 1.669 `!important`; `GAME_JS_MAX_LINES` 10.599 dengan kelonggaran 39 | ratchet `!important` dan selektor ganda; ratchet game.js menuntut penurunan | hitungan hanya boleh turun |
| F9 Halaman dev ikut terbit | `plb.html` 497 KB, `proposals/`, `plan*.html`, `pokemon-3d.html` | ditambahkan ke langkah prune deploy | URL live 404 |
| F10 Waktu CI | ~45 menit, berurutan | shard paralel (statis + 2-3 shard browser), cache unduhan Chrome | dinding verify < 20 menit, 5 run |

## 3. Keputusan owner (2026-11-26)

1. **E9 Mobil (G6): pensiunkan.** Halaman `games/mobil.html`, kode G6 di hub dan aset yang hanya dipakai G6 dihapus
   dalam 58E; tidak ada tautan atau gate yang tertinggal (`qa-local-refs`, `qa-app-sweep` hijau).
2. **A6: batasi kelas 2** untuk pita usia 5-6 dan 7-8; soal kelas 3-4 hanya bila orang tua memilih "Sulit".
3. **Urutan: 58A dulu**, lalu 58B, 58C, 58D, 58E, 58F.

## 4. Batas jujur

- Akurasi kurikulum diukur dari jumlah dan sebaran soal, bukan dari hasil belajar anak sungguhan.
- Tren dasbor baru terisi setelah anak bermain beberapa minggu; di tes diisi data tiruan.
- Perbaikan mesin (F6, F10) diukur di mesin ini dan runner CI, bukan di HP murah anak.
- Uji di tablet asli (PRD-06) tetap terblokir sampai tablet tersambung.

## 5. Hasil (diisi per gelombang)

| Gelombang | Rilis | Merah → hijau | Status |
|---|---|---|---|
| 58A | v64.93 | lihat 5.1 | A1, A3, A5, A6 selesai; A2, A4 pindah ke 58A-2 |
| 58B | v64.94 | lihat 5.2 | B1, B4, B6 selesai; B2 terukur sudah lulus; B3, B5, B7, B8 pindah ke 58B-2 |
| 58C | v64.95 | | belum |
| 58D | v64.96 | lihat 5.4 | D4 sebagian (v64.94); sisanya belum |
| 58E | v64.97 | lihat 5.5 | E9 Mobil dipensiunkan (v64.95); sisanya belum |
| 58F | v64.98 | lihat 5.3 | F1 dan F2 sebagian selesai lebih awal (v64.94); sisanya belum |

### 5.1 Hasil 58A (2026-11-26)

| Butir | Merah (HEAD bersih, port lain) | Hijau |
|---|---|---|
| A1 | G3/G4/G7/G8/G9/G11: mudah 13, sedang 7, sulit 0; level 20 mulai "medium"; tombol lanjut G13 berhenti di level 20 | mudah 7, sedang 7, sulit 6; level 20 = "hard"; tombol lanjut G3 sampai 19, G13 sampai 39 |
| A3 | G9: 10 sesi level 8 = 6 huruf (A-F); level 15 tanpa mode kata | 26 huruf, 0 sesi berulang; level 15 membuka mode kata |
| A5 | G10 level 1: 177 dari 200 soal di atas batas 5 | 0 di atas batas; level 1 hanya "+", level 7 "+ -" |
| A6 | mutasi batas ke 4: anak kuat tanpa saklar sampai kelas 4 (`qa-soal-arcade` 3 gagal) | kelas tertinggi 2 dalam 200 soal; dengan saklar tetap naik ke >= 3 (L3) |

- Saklar "Sulit" untuk A6 = setelan yang sudah ada **Perkalian & Pembagian** (`dunia-emosi-mathadv`) di Setelan;
  pita 9-10 tahun juga tanpa batas. Tidak ada menu baru.
- Tingkat sulit kini benar-benar tercapai, jadi `DIFF.hard` diturunkan dari 15 ronde / timer 10 s ke 12 ronde / 15 s
  (dulu tidak pernah dipakai, ditulis untuk anak yang lebih besar).
- G10: skema bantuan hitung (bola) kini mendapat angka a/b untuk + dan - (dulu tidak pernah tampil karena a kosong).
- `qa-landscape-choices` kini memeriksa tiap ukuran di mudah DAN sulit (G3/G4/G7: semua pilihan di layar tanpa gulir).
- **A4/E2 G7 (v64.94):** tingkat mudah dulu hanya "gambar -> kata"; kini tiap ronde ke-3 (slot dengar lama) "kata -> gambar".
  Mutasi baris lama: 6 ronde img2word (merah); sesudah: img2word x4 + word2img x2 (hijau), `qa-prd50-g7` 9/0.
- **A2 dan A4 (G3, G8) belum:** A4 bukan ronde kosong (tanpa suara, slot dengar kembali ke ronde biasa), jadi ini soal variasi;
  A2 butuh tabel per level per game. Keduanya dikerjakan di 58A-2.

### 5.2 Hasil 58B (2026-11-26)

Gate `tools/qa-prd58b-feel.mjs` (tag `feel58`): HEAD v64.93 bersih 8 lulus / 11 gagal, sesudah perbaikan 19 / 0.

| Butir | Merah | Hijau |
|---|---|---|
| B1 goyang salah | beranda, G3, G10: animasi `screenIn`, layar bergeser 0 px | `screenShake` 400 ms, bergeser 7,6-7,9 px; reduced motion 0 px |
| B4 momen menang | hub: `VFX.Moment` tidak dimuat, 0 panggilan; 5 halaman arkade tanpa momen | hub memanggil `celebrate` saat menang >= 3 bintang; ducky, birds, mario, monster-candy, pokemon-run memuat `games/data/win-moment.js` dan efeknya tergambar (screenshot: dua ledakan kilau emas di judul, ±400 ms) |
| B6 gerak dikurangi | hub 13 partikel, mario tetap goyang | hub 0 partikel, mario tidak goyang; ducky dan monster-candy goyang kamera dijaga flag reduced motion halaman itu |

- Level bos (kelipatan 10) di birds dan pokemon-run tidak memanggil momen kedua: `boss-round.js` sudah merayakannya.
- B2 (G4 layar miring): diukur di 760x360 dan 812x375 pada mudah dan sulit; semua pilihan di layar (paling bawah 279/294 px). Penimpaan `min-height:150px` tidak memotong pilihan, jadi tidak diubah.
- B3 belum: lapisan sinema hub ada di belakang latar game yang buram; ganti tema harus dibuktikan terlihat dulu (screenshot), baru dikerjakan.
- Statis: dua cek sumber (ducky, monster-candy) membaca pohon kerja, jadi lulus juga di run merah; bukti merahnya dari mario dan hub.

### 5.3 58F-F1 cache service worker (dikerjakan lebih awal, v64.94)

- Merah: `tools/test-prd58f-sw-trim.mjs` (sw.js di vm node, `caches` tiruan, picu `activate`): salinan `game.js` dan
  `style.css` bertoken rilis lama tetap ada sesudah aktivasi.
- Perubahan: `sw.js` punya `RELEASE` (token rilis, ikut naik dengan sed rilis); `activate` menghapus entri
  `ASSET_CACHE` yang `?v=`-nya berformat token rilis tapi bukan `RELEASE`. Berkas tanpa versi (gambar, suara, unduhan
  luring) dan ember `dunia-film-*` tidak disentuh.
- Hijau 7/0 (termasuk `RELEASE` sama dengan token daftar precache). `qa-sw-reload` 9/0.
- Aman karena semua halaman hanya memakai satu token rilis (`git grep`: 2.287 rujukan, satu token).

### 5.4 58D-D4 kartu "main berikutnya" (sebagian, v64.94)

- Diukur, bukan ditebak: 400 soal `SoalArcade` per game (g19, g20, g14s) melaporkan Matematika, Pengetahuan umum,
  Bahasa, Pola, Bentuk. Jadi `Pola` dan `Bentuk` -> g19 (Pokemon Birds), g20 (Ducky Volley).
- `Membaca jam`, `Mengeja kata` (hanya Mobil, yang dipensiunkan), `Mengenal perasaan`: belum ada game hub yang
  melaporkannya, jadi tidak diberi kartu (lebih baik tanpa kartu daripada kartu yang salah). Masuk 58C/58D.
- `tools/test-prd58d-skills.mjs`: berkas lama 0/4, baru 4/0.
- Temuan untuk D1 (diukur, 400 soal g19): 219 soal matematika dilaporkan dengan `skill: 'matematika'` (tanpa jenis),
  jadi dasbor menulis "Matematika", bukan Penjumlahan/Pengurangan. Hanya `pattern` (19) yang punya jenis.
- **F2 sebagian (v64.94):** `qa-freeze-card` (tunggu gambar kartu sampai 8 s, ganti jeda 1,2 s; mutasi alamat gambar
  -> 9/11 merah, hijau 11/11) dan `qa-prd07-telemetry` (tunggu entri jank sampai 8 s, ganti jeda 800 ms; hijau 6/0).
  Timeout kini mencetak alasannya, bukan `.catch(() => {})` diam. Sisa: `qa-prd47-bugs` (tekstur latar ducky),
  `qa-prd53-cek`.
- **F4 ditunda:** gate timer tersembunyi memalsukan `document.hidden` tanpa pelambatan asli browser, jadi loop rAF
  setiap game akan terhitung sebagai kerja. Perlu daftar berkas per halaman, tidak bisa dari `readdirSync` saja.

### 5.5 58E-E9 Mobil (G6) dipensiunkan (v64.95)

- Dihapus: `games/mobil.html`; kode G6 di `game.js` (306 baris: peta, mobil, jalur, kata); layar `#screen-game6` dan
  CSS G6 di `index.html`; jeda/lanjut/keluar dan tombol panah G6; entri `mobil` di peta tema sinema.
- `game.js` 10.596 -> 10.278 baris; ratchet `GAME_JS_MAX_LINES` 10.599 -> 10.299.
- Gate: `qa-mobil-bounds`, `qa-prd45-mobil`, `qa-modal-truth`, `_qa-mobil-dup` dihapus (hanya menguji Mobil);
  entri Mobil keluar dari `audit-no-emoji`, `qa-endgame-hang`, `qa-mobile-touch`, `qa-sakuga-look`, `enter-play`,
  `qa-music-on-start`, audit perf/visual/sentuh, baseline a11y/instruksi/perf. `qa-prd16c-feel` L1/L5 kini memakai
  Ducky Volley yang kalah 0-2 (hijau 10/0); blok G6 keluar dari `qa-prd48-bus` dan `qa-prd49-events`.
- Lencana "Pembalap Handal!" tidak bisa didapat lagi: disembunyikan, kecuali untuk anak yang sudah memilikinya.
- Tidak dihapus: 169 aturan CSS G6 di `style.css` (banyak di daftar selektor bersama; dibersihkan dengan ratchet F8),
  gambar dan suara (dipakai game lain atau belum dipastikan tunggal), dokumen lama, `plb.html`/`secondbrain.html`
  (halaman dev, F9).

### 5.6 58D-D1 jenis soal matematika arkade (v64.96)

- Merah: 219 dari 238 jawaban matematika arkade (g19/g20/g14s, 400 soal) berlabel hanya "Matematika": bank g23
  tidak membawa `kind`.
- Perubahan: `SoalArcade.answer` menurunkan jenis dari soal berbentuk `a op b = ?` (+ tambah, - kurang, x kali,
  : bagi); soal lain tetap memakai topiknya.
- Hijau: 0 dari 238 (`qa-soal-arcade` D1, 48/0).

### 5.7 58E-E8 nampan huruf: temuan audit sebagian salah

- G8 **sudah** punya huruf pengecoh: 2 / 4 / 6 untuk mudah / sedang / sulit (`game.js`, `numExtra`). Klaim audit
  "hanya huruf kata itu" salah untuk G8; dicoret.
- G27 (Ejaan Inggris) memang hanya huruf kata itu, tetapi game ini latihan lomba ejaan yang dirancang owner ("semua
  kata di level 1 dan level 2, bisa diulang2, utk persiapan lomba") dan tata letak nampannya dihitung dari panjang
  kata. Tidak diubah tanpa keputusan owner.
