# Review AAA UI/UX, Animasi, Effect, dan Gameplay Edukasi - Dunia Emosi

Tanggal review: 2026-04-11  
Scope review: source code, dokumentasi lokal, asset, dan inspeksi browser desktop/mobile.  
Catatan batasan: tidak ada perubahan pada kode game. Review ini fokus pada kualitas AAA-feel untuk anak 5-9 tahun, UI/UX, animasi/effect, dan gameplay edukasi kalistung.

## Ringkasan Eksekutif

`Dunia Emosi` punya fondasi ide yang kuat: game edukasi browser untuk anak, banyak mini-game, progress 20 level per game, mode solo/dua pemain, karakter Leo, asset visual, dan kombinasi emosi + kalistung. Potensinya bagus karena sudah mencoba membuat belajar terasa seperti dunia game, bukan sekadar kuis.

Namun status saat ini belum siap disebut AAA-feel. Masalah terbesar bukan kurang fitur, tetapi kurang konsistensi kualitas di alur utama, layout, pedagogi, dan polish teknis. Ada juga blocker fungsional yang membuat game tidak bisa dimainkan normal dari menu:

- Level selector kosong/gelap karena CSS menyembunyikan elemen level.
- Game 10-12 memanggil `playSound()`, tetapi fungsi itu tidak ada, sehingga answer flow error.
- Beberapa layar game desktop tidak punya komposisi visual yang matang: elemen penting muncul terlalu kiri, terlalu banyak area kosong, dan fokus visual tidak jelas.
- Animasi dan effect sudah banyak, tetapi belum terasa "AAA" karena belum punya sistem motion yang konsisten dan meaningful.
- Gameplay edukasi masih dominan multiple choice/recognition. Untuk kalistung 5-9 tahun, game perlu lebih banyak scaffolding, manipulatif visual, feedback belajar, mastery tracking, dan adaptasi level yang benar-benar granular.

Verdict: ini prototype dengan potensi kuat, tetapi untuk mengejar kualitas premium, prioritas pertama adalah memperbaiki alur utama, membuat design system/gameplay template yang konsisten, lalu membangun learning engine yang lebih serius.

## Hal Positif yang Sudah Kuat

### 1. Ambisi produk sudah benar

Game ini tidak hanya satu kuis. Ada banyak mode: emosi, napas, huruf, hitung, memory, runner mobil, tebak gambar, susun kata, tracing huruf, battle matematika, sains, dan tebak bayangan. Untuk anak 5-9 tahun, variasi ini penting karena anak cepat bosan jika format belajar terlalu sama.

### 2. Ada fondasi dunia game, bukan hanya latihan soal

Ada konsep world/zone: Emosi Island, Hutan Belajar, Kota Petualangan, Arena Petualangan. Ini arah yang bagus untuk membuat anak merasa sedang menjelajah dunia, bukan mengerjakan worksheet.

### 3. Beberapa layar sudah punya arah visual premium

Welcome screen mobile terlihat paling matang: background full-bleed, tombol besar, Leo muncul sebagai karakter utama, dan hierarchy tombol cukup jelas. Menu mobile juga sudah lebih modern dibanding UI lama: tile punya glow, icon, kategori dunia, dan tampak seperti game.

### 4. Game 6 punya potensi "game feel" paling kuat

Petualangan Mobil adalah mekanik paling dekat ke game sungguhan: lane, kendaraan, letter collection, obstacle, background map. Ini bisa menjadi "core hook" yang membuat anak tertarik belajar huruf/kata sambil bermain.

### 5. Game 10 menunjukkan arah "combat learning" yang menarik

Pertarungan Pokemon secara mekanik menunjukkan bahwa matematika bisa dibuat lebih seru lewat battle. Ini bagus sebagai referensi internal, walau untuk produk serius harus diganti menjadi IP original kecuali ada lisensi resmi.

### 6. Sudah ada progress, XP, achievement, dashboard

Walau user tidak meminta fokus reward/monetisasi, progress tetap penting untuk learning. Anak dan orang tua perlu tahu perkembangan. Fondasi ini sudah ada, tinggal diubah agar lebih pedagogis, bukan hanya jumlah bintang.

### 7. Browser-first adalah keputusan pragmatis

Vanilla HTML/CSS/JS membuat game mudah dibuka di PC dan mobile browser. Untuk tahap prototype, ini mempercepat iterasi.

## Blocker Kritis yang Harus Diperbaiki Dulu

### 1. Level selector tidak terlihat sama sekali

Di inspeksi browser, saat memilih game dari menu, screen aktif adalah `screen-level`, DOM berisi banner dan level, tetapi viewport kosong/gelap. Penyebab kuat terlihat di CSS:

```css
.level-progress-row,.level-tiers { display:none !important; }
.level-game-banner { display:none !important; }
```

Dampaknya besar: user normal tidak bisa mulai game dari flow utama. Ini blocker nomor satu. Semua game bagus di belakangnya tidak berarti kalau anak berhenti di layar kosong.

Rekomendasi:

- Pilih satu sistem level selector: legacy `level-game-banner/level-tiers` atau desain baru `lvl-tier-card/lvl-bubble`.
- Jangan biarkan CSS baru menyembunyikan HTML lama tanpa JS yang merender HTML baru.
- Tambahkan smoke test: dari welcome -> menu -> pilih game -> level 1 terlihat -> klik level -> game berjalan.

### 2. Game 10-12 error saat menjawab

Game 10, 11, dan 12 memanggil `playSound('correct')` atau `playSound('wrong')`, tetapi fungsi `playSound` tidak ditemukan. Di browser muncul:

```text
ReferenceError: playSound is not defined
```

Dampaknya:

- Game battle/sains/bayangan bisa tampil, tetapi answer flow rusak.
- Animasi attack dan progress bisa berhenti.
- Ini menurunkan kepercayaan produk karena bug terjadi pada aksi inti anak: menjawab soal.

Rekomendasi:

- Ganti semua `playSound(...)` ke `playCorrect()` / `playWrong()`, atau buat adapter `playSound(type)`.
- Pastikan semua game pass console-clean test.

### 3. CSS override bertumpuk dan saling bertabrakan

`index.html` adalah single file sekitar 5.894 baris. Banyak selector didefinisikan ulang beberapa kali, misalnya level selector, G6, G10, menu, dark mode, dan AAA enhancement. Ini membuat perubahan UI berisiko tinggi.

Dampaknya sudah nyata: level selector blank karena CSS lama/baru tidak sinkron.

Rekomendasi:

- Pisahkan minimal menjadi `styles/base.css`, `styles/screens.css`, `styles/games.css`, `styles/effects.css`, `app.js`, `data.js`.
- Kalau tetap single-file sementara, susun CSS menjadi satu urutan final dan hapus blok deprecated.
- Buat daftar screen contract: class yang dipakai HTML harus sama dengan class yang dipakai CSS/JS.

### 4. Layout game desktop belum punya stage composition

Di desktop, beberapa game terlihat berat ke kiri dan menyisakan area kosong besar. Contoh:

- Game 1: karakter/pertanyaan di tengah, tetapi pilihan jawaban berada kiri bawah.
- Game 4: binatang dan jawaban berada kiri, pertanyaan di tengah, banyak ruang kosong.
- Game 8: gambar kiri atas, hint tengah, slot dan huruf kiri, tombol hapus melebar seperti bar besar.
- Game 9: tracing canvas kiri, area kanan kosong, ada dua tombol pause.

Untuk AAA-feel, setiap game perlu komposisi layar yang jelas:

- Top: header minimal.
- Center: play stage utama.
- Bottom: answer/action area.
- Feedback layer: muncul di atas stage, bukan menggeser layout.

### 5. Asset/IP risk dan offline risk

Game memakai nama dan sprite Pokemon. Untuk prototype pribadi ini bisa dipakai sebagai referensi, tetapi untuk produk publik/Steam/kids app, ini harus diganti dengan monster/karakter original kecuali ada lisensi resmi.

Ada juga asset remote:

- Google Fonts.
- Sprite Pokemon dari GitHub/PokeAPI fallback.
- Missing asset `assets/bg-pokemon-battle.webp`.
- Service worker cache path terlihat spesifik ke `/Apps/dunia-emosi/index.html`, sehingga offline bisa gagal kalau path berubah.

Untuk browser/mobile dan anak-anak, game harus reliable offline/low-network. Semua asset kritis sebaiknya lokal, terkompresi, dan lazy-loaded.

## Review UI/UX AAA

### Kondisi saat ini

UI sudah bergerak dari "jadul" ke "dark premium/glow". Menu mobile cukup menarik, tetapi kualitas belum konsisten di semua layar. Ada dua gaya yang bercampur:

- Gaya pastel anak di awal kode.
- Gaya dark neon/Pokemon battle di override baru.

Masalahnya: "AAA untuk anak" bukan berarti semua dibuat gelap, glow, dan banyak particle. Untuk anak 5-9 tahun, AAA-feel lebih berarti:

- jelas,
- responsif,
- hangat,
- playful,
- mudah dipahami tanpa membaca panjang,
- visual hierarchy sangat kuat,
- feedback terasa hidup,
- tidak melelahkan mata.

### UI yang sudah baik

- Tombol besar di welcome mobile.
- Menu tile punya kategori yang jelas.
- Header game sudah konsisten secara kasar: back, title, avatar, pause, stars.
- Tile game sudah punya visual identity per kategori.
- Game 6 dan Game 10 punya scene yang lebih "game-like" dibanding game lain.

### UI yang perlu diperbaiki

1. **Buat satu layout template untuk semua mini-game**

   Setiap game harus punya struktur:

   ```text
   Header compact
   Objective strip: "Cari huruf A" / "Hitung bebek"
   Main stage: karakter/objek besar
   Interaction zone: jawaban/tombol/drag area
   Feedback overlay: benar/salah/hint
   Progress strip: level, soal, mastery
   ```

2. **Jangan biarkan elemen penting tersebar**

   Anak 5-9 tahun butuh fokus visual. Jangan taruh gambar di kiri, pertanyaan di tengah, pilihan di bawah kiri. Mata anak harus langsung tahu:

   - "Aku harus lihat apa?"
   - "Aku harus tekan apa?"
   - "Apa yang terjadi setelah aku jawab?"

3. **Perbaiki button hierarchy**

   Beberapa tombol terlalu besar untuk aksi sekunder. Contoh di Game 8 dan Game 9, tombol "Hapus" menjadi bar putih sangat dominan. Untuk UX anak:

   - Primary action besar.
   - Secondary action kecil tapi jelas.
   - Dangerous/reset action tidak boleh lebih dominan dari aktivitas belajar.

4. **Kurangi ketergantungan pada emoji sebagai asset utama**

   Emoji cepat untuk prototype, tetapi tidak premium karena tampil beda antar OS/browser. Untuk AAA-feel:

   - Gunakan karakter dan object illustration original.
   - Emoji boleh menjadi fallback atau icon kecil.
   - Word images harus konsisten style, lighting, outline, dan angle.

5. **Dark theme perlu disesuaikan untuk anak**

   Dark/neon bisa keren, tetapi untuk anak 5-9 terlalu gelap bisa terasa seperti battle/action game, bukan dunia belajar hangat. Rekomendasi: pakai "premium bright adventure" untuk learning worlds, dan dark hanya untuk mode khusus seperti space/battle.

6. **Aksesibilitas belum cukup**

   Checklist aksesibilitas di dokumentasi belum sepenuhnya tercermin di kode:

   - Banyak clickable `div` bukan `button`.
   - Icon button banyak tanpa `aria-label`.
   - `user-scalable=no` membatasi zoom.
   - Belum terlihat `prefers-reduced-motion`.
   - Banyak animasi/particle tanpa motion toggle yang benar-benar mengontrol semua effect.
   - Focus state keyboard belum konsisten.

Untuk anak, aksesibilitas bukan fitur tambahan. Banyak anak memakai tablet, layar kecil, motorik belum stabil, atau butuh instruksi suara.

## Review Animasi dan Effect AAA

### Kekuatan saat ini

Sudah ada banyak usaha ke arah game feel:

- Button press scale.
- Confetti.
- Star fly.
- Flash correct/wrong.
- Particle burst.
- Screen transition.
- Breathing circle.
- G6 moving road.
- G10 attack animation.

Ini bahan bagus. Masalahnya bukan kurang animasi, tetapi animasi belum punya "bahasa" yang konsisten.

### Masalah utama

1. **Effect belum selalu membantu belajar**

   Banyak effect bersifat dekoratif: particle, glow, confetti, shimmer. Untuk game edukasi anak, effect harus menjawab:

   - Apa yang benar?
   - Kenapa benar?
   - Apa langkah berikutnya?
   - Anak sedang maju atau perlu bantuan?

2. **Feedback benar/salah terlalu generik**

   Saat anak salah, game sering hanya shake/red/sound. Itu memberi tahu salah, tapi tidak mengajar. Untuk kalistung, feedback harus spesifik:

   - "AYAM dimulai dari huruf A."
   - "Kamu sudah hitung 7, coba lanjut satu-satu sampai 8."
   - "Huruf G mulai dari garis melengkung ini."

3. **Motion hierarchy belum jelas**

   Semua bisa bergerak: background, hearts, particles, buttons, banners. Kalau terlalu banyak, anak tidak tahu mana yang penting. AAA-feel butuh prioritas:

   - Object belajar bergerak paling kuat.
   - Feedback bergerak sedang.
   - Background bergerak halus.
   - UI chrome hampir tidak bergerak.

4. **Tidak ada reduced motion system**

   Untuk anak sensitif sensorik, semua particle/glow/shake harus bisa dikurangi.

### Rekomendasi sistem animasi AAA

Buat 4 level motion:

1. **Functional motion**

   Untuk menjelaskan aksi:

   - Huruf terbang ke slot saat benar.
   - Binatang diberi nomor saat dihitung.
   - Stroke huruf menyala mengikuti urutan.
   - Jawaban benar bergerak ke progress.

2. **Emotional motion**

   Untuk karakter:

   - Leo memberi ekspresi berbeda: bingung, bangga, memberi hint, tepuk tangan.
   - Hewan di Game 1 menunjukkan ekspresi emosi, bukan hanya emoji + animal.

3. **World motion**

   Untuk suasana:

   - Angin di hutan.
   - Gelembung di laut.
   - Lampu kota.
   - Efek pelan dan tidak mengganggu.

4. **Celebration motion**

   Untuk level complete atau milestone, bukan setiap klik kecil.

   Celebration AAA sebaiknya singkat: 1-2 detik, terasa spesial, lalu langsung kembali ke gameplay.

### Rekomendasi teknis effect

- Untuk mini-game berbasis scene seperti G6/G10, pertimbangkan Phaser atau PixiJS agar animasi, layering, spritesheet, particle, dan input lebih stabil dibanding DOM manual.
- Untuk UI menu, DOM/CSS masih cocok.
- Gunakan asset atlas/spritesheet agar tidak memuat banyak file kecil.
- Buat motion tokens: `fastTap`, `correctPop`, `wrongNudge`, `levelComplete`, `stageEnter`.
- Semua effect harus punya budget: jumlah particle, durasi, dan kapan boleh muncul.

## Review Gameplay Edukasi Kalistung

### Masalah terbesar gameplay edukasi saat ini

Game saat ini masih banyak berupa:

- lihat objek,
- pilih jawaban,
- benar/salah,
- lanjut.

Ini berguna untuk latihan recognition, tetapi belum cukup untuk membuat anak benar-benar belajar kalistung secara mendalam. Untuk usia 5-9, game perlu mengajarkan proses, bukan hanya mengecek jawaban.

### Prinsip yang perlu dipakai

1. **Scaffolding**

   Kalau anak salah, game memberi bantuan bertahap:

   - Hint 1: highlight bagian penting.
   - Hint 2: contoh setengah jalan.
   - Hint 3: pilihan dikurangi.
   - Hint 4: Leo memandu langkah demi langkah.

2. **Mastery, bukan sekadar level**

   Level 1-20 saat ini sebagian besar dipetakan ke `easy`, `medium`, `hard`. Ini terlalu kasar. Anak level 1 dan 7 bisa mendapat variasi yang mirip.

   Setiap level perlu menaikkan aspek spesifik:

   - jumlah pilihan,
   - panjang kata,
   - jenis suku kata,
   - jumlah objek,
   - timer atau tanpa timer,
   - bantuan visual,
   - distraktor yang makin mirip,
   - kebutuhan mengingat,
   - kebutuhan menulis/motorik.

3. **Error harus jadi data belajar**

   Kalau anak salah huruf B vs D, itu bukan sekadar salah. Itu miskonsepsi. Game harus menyimpan pola:

   - huruf yang sering tertukar,
   - angka yang sering salah hitung,
   - kata yang belum dikuasai,
   - perlu bantuan visual atau tidak.

4. **Feedback harus spesifik ke materi**

   Contoh:

   - Salah memilih `B` untuk AYAM: "Dengar bunyi awalnya: A-yam. Huruf awalnya A."
   - Salah menghitung 8 menjadi 9: "Coba sentuh satu bebek satu kali. Kita hitung: 1, 2, 3..."
   - Salah susun kata: "Kata GAJAH mulai dari GA, bukan JA."

5. **Kalistung harus bertahap**

   Membaca:

   - mengenal huruf,
   - bunyi huruf,
   - suku kata,
   - kata pendek,
   - kata panjang,
   - kalimat pendek,
   - memahami instruksi.

   Menghitung:

   - subitizing 1-5,
   - one-to-one counting,
   - angka 1-10,
   - komposisi 5+N,
   - penjumlahan konkret,
   - pengurangan konkret,
   - word problem sederhana.

   Menulis:

   - stroke order,
   - arah garis,
   - bentuk huruf,
   - jarak dan proporsi,
   - kata pendek.

## Review Per Game

| Game | Yang sudah baik | Masalah utama | Improvement prioritas |
|---|---|---|---|
| Game 1 - Aku Merasa | Tema emosi penting untuk anak, ada tip coping | Masih tebak label emosi, belum ada konteks cerita/situasi | Buat skenario pendek: "Leo kehilangan mainan", anak pilih emosi + respon sehat |
| Game 2 - Napas Pelangi | Cocok untuk regulasi emosi, breathing loop jelas | Belum banyak interaksi selain menunggu | Tambahkan sinkron suara lembut, visual napas masuk/keluar, dan feedback "napas stabil" |
| Game 3 - Huruf Hutan | Mengenalkan huruf dan angka dalam satu game | Ada konten tidak konsisten: `FROG` padahal tidak ingin bahasa Inggris; hint kadang terlalu memberi jawaban | Ganti semua word bank Indonesia, tambah bunyi huruf dan suku kata |
| Game 4 - Hitung Binatang | Konsep counting visual kuat | Anak hanya memilih angka, belum diajak menghitung satu-satu | Tambah tap-to-count: tiap binatang disentuh muncul nomor 1, 2, 3 |
| Game 5 - Cocokkan Emosi | Memory match cocok untuk fokus dan working memory | Bisa lebih ramah untuk 5-6 tahun | Tambah peek awal, hint setelah salah berulang, dan match animation karakter |
| Game 6 - Petualangan Mobil | Paling game-like, ada lane runner dan spelling | Spawn target/decoy masih random, penalti reset bisa frustrasi, phonics belum kuat | Jadikan core game: kumpulkan huruf sesuai urutan, preview next letter, word completion cinematic |
| Game 7 - Tebak Gambar | Bagus untuk vocabulary/membaca awal | Masih emoji/label recognition | Gunakan gambar original, audio nama benda, pecah kata menjadi suku kata |
| Game 8 - Susun Kata | Cocok untuk membaca/menulis kata | Layout belum premium, wrong feedback minim, tombol hapus terlalu dominan | Drag huruf ke slot, highlight slot aktif, hint suku kata, animation letter snap |
| Game 9 - Jejak Huruf | Penting untuk motorik menulis | Ada dua tombol pause, scoring bisa digame karena hanya hit dekat titik, stroke order belum kuat | Buat stroke order guide, start dot, direction arrow, path tolerance, dan phase latihan |
| Game 10 - Battle Matematika | Battle membuat matematika lebih seru | `playSound` error, asset Pokemon/IP risk, missing background | Ganti jadi monster original, tambahkan number line/manipulative saat salah |
| Game 11 - Kuis Sains | Menambah variasi pengetahuan | Tidak fokus kalistung; beberapa materi terlalu maju untuk 5-9 | Jadikan bonus, bukan core; filter usia lebih ketat |
| Game 12 - Tebak Bayangan | Bagus untuk vocabulary dan inferensi | Belum tersambung kuat ke membaca | Jadikan reading comprehension ringan: dengar/lihat clue, pilih gambar, lalu susun kata jawabannya |

## Catatan Konten Edukasi

Beberapa data perlu QA edukasi:

- `FROG` harus diganti ke kata Indonesia jika game tidak memakai bahasa Inggris.
- `ULAT` memakai emoji kura-kura, ini bisa membingungkan.
- `LUMBA` sebaiknya `LUMBA-LUMBA`.
- Beberapa kata panjang seperti `ORANG UTAN`, `HARIMAU`, `JERAPAH` perlu diperkenalkan bertahap.
- Game sains untuk usia 5-9 perlu pemetaan usia lebih hati-hati. Topik seperti DNA, gas rumah kaca, konduktor bisa terlalu tinggi tanpa visual/scaffold.

## Rekomendasi Learning Engine

Untuk membuat gameplay education kuat, jangan hanya random soal. Buat data soal seperti ini:

```js
{
  id: "letter_a_ayam_01",
  skill: "membaca.huruf_awal",
  ageMin: 5,
  ageMax: 7,
  difficulty: 1,
  promptType: "visual_to_letter",
  word: "AYAM",
  answer: "A",
  distractors: ["B", "M", "Y"],
  scaffold: ["highlight_first_letter", "play_initial_sound", "reduce_choices"],
  misconceptionTags: ["huruf_awal", "visual_guessing"]
}
```

Lalu simpan mastery per skill:

```text
membaca.huruf_awal.A = 80%
membaca.suku_kata.GA = 40%
hitung.one_to_one.1_10 = 65%
menulis.stroke_order.A = 30%
```

Dengan ini, game bisa otomatis:

- mengulang materi yang belum dikuasai,
- menaikkan level saat anak siap,
- memberi hint sesuai kesalahan,
- menampilkan progress yang bermakna untuk orang tua/guru.

## Rekomendasi Gameplay Agar Anak Tertarik Belajar

### 1. Jadikan Leo sebagai tutor aktif, bukan hanya mascot

Leo harus muncul di momen belajar:

- memberi instruksi singkat,
- menunjukkan contoh,
- merespon jawaban,
- memberi hint,
- merayakan usaha,
- menenangkan saat salah.

Contoh:

```text
Leo: "Kita cari huruf awal AYAM. Dengar: A... A... AYAM!"
```

### 2. Buat world map yang punya tujuan belajar

Daripada hanya daftar game, buat peta:

```text
Rumah Leo -> Hutan Huruf -> Danau Kata -> Kota Angka -> Arena Cerita
```

Setiap world punya skill utama. Anak merasa berpetualang, orang tua tahu apa yang dipelajari.

### 3. Buat mini-game saling terhubung

Contoh flow membaca:

1. Game 3: kenal huruf A.
2. Game 7: lihat gambar AYAM.
3. Game 8: susun A-Y-A-M.
4. Game 9: tulis A.
5. Game 6: kumpulkan huruf AYAM di runner.

Ini jauh lebih kuat daripada game berdiri sendiri-sendiri.

### 4. Tambah "learning moment" setelah level

Setelah level selesai, tampilkan bukan hanya bintang, tetapi:

```text
Hari ini kamu belajar:
- Huruf A dari AYAM
- Menghitung sampai 8
- Menulis garis miring pada huruf A
```

Ini membuat progress terasa nyata.

### 5. Hindari addictive loop manipulatif

Untuk anak, targetnya bukan addictive. Targetnya adalah engaging dan sehat:

- sesi pendek 5-10 menit,
- tujuan jelas,
- pause mudah,
- tidak ada tekanan streak berlebihan,
- salah dianggap latihan,
- anak bisa berhenti dengan rasa berhasil.

## Rekomendasi AAA Visual Direction

### Arah visual yang disarankan

Untuk anak 5-9, saya sarankan arah:

```text
Premium bright adventure + soft cinematic lighting + expressive original characters
```

Bukan:

```text
dark neon battle di semua layar
```

Dark battle boleh untuk satu world, tetapi dunia utama sebaiknya hangat dan mengundang.

### Karakter

Leo harus menjadi IP utama. Saat ini Leo ada, tetapi Pokemon terlalu dominan di welcome/battle. Jika ingin game punya identitas sendiri, Leo dan teman-teman original harus menggantikan IP eksternal.

Rekomendasi karakter:

- Leo: tutor utama.
- Momo: teman membaca.
- Kiki: teman menghitung.
- Bubu: teman menulis.
- Monster angka/huruf original untuk battle.

### Asset

`assets` sekitar 64 MB dan sprite Pokemon lebih dari 1000 file. Untuk browser mobile, ini berat kalau tidak diatur.

Rekomendasi:

- Compress PNG besar ke WebP/AVIF.
- Buat sprite atlas untuk animasi.
- Lazy-load asset per game, jangan semua tersedia di awal.
- Hindari remote fallback untuk asset penting.
- Pastikan semua asset punya style konsisten.

## Rekomendasi UX Mobile dan Desktop

### Mobile

Yang baik:

- Welcome mobile sudah paling kuat.
- Menu mobile sudah readable dan menarik.
- G8 mobile lebih masuk akal dibanding desktop.

Yang perlu diperbaiki:

- Level selector blank.
- Beberapa tombol terlalu besar/dominan.
- Text spacing kadang terlalu lebar.
- Bottom action harus tetap reachable tanpa menutupi konten.

### Desktop

Yang perlu diperbaiki besar:

- Jangan hanya stretch mobile layout ke desktop.
- Gunakan central stage dengan max width yang benar.
- Untuk desktop, manfaatkan area kanan/kiri sebagai dekorasi atau companion panel, bukan kosong.

Template desktop:

```text
Left panel: Leo/hint/progress
Center: main game stage
Right panel: current objective/skill
Bottom: answer/input controls
```

## Rekomendasi Teknis Prioritas

### Phase 0 - Fix blocker sebelum polish

Estimasi: 1-3 hari.

1. Perbaiki level selector blank.
2. Perbaiki `playSound is not defined`.
3. Hapus duplicate pause button di Game 9.
4. Perbaiki missing asset `bg-pokemon-battle.webp` atau ganti referensi.
5. Tambah favicon untuk menghilangkan 404.
6. Pastikan sound/vibration setting benar-benar dipakai oleh `playTone` dan haptic handler.
7. Perbaiki `shareGame && shareGame()` karena `shareGame` yang tidak didefinisikan bisa error saat diklik.
8. Buat smoke test manual: semua 12 game bisa start, answer, finish, back to menu.

### Phase 1 - UI/UX foundation

Estimasi: 1-2 minggu.

1. Buat design system final: colors, typography, spacing, buttons, cards, stage, modal.
2. Buat satu template screen game.
3. Re-layout Game 1, 4, 8, 9 agar stage-centered.
4. Buat responsive desktop dan mobile berbeda, bukan satu layout dipaksa.
5. Buat motion system: correct, wrong, hint, complete, transition.

### Phase 2 - Gameplay education

Estimasi: 2-4 minggu.

1. Buat skill taxonomy kalistung.
2. Buat content bank bertag skill/usia/difficulty.
3. Buat adaptive mastery sederhana.
4. Tambah feedback edukatif spesifik.
5. Perbaiki Game 3, 4, 8, 9 sebagai core kalistung.
6. Hubungkan game menjadi learning path.

### Phase 3 - AAA game feel

Estimasi: 4-8 minggu.

1. Ganti asset Pokemon menjadi IP original.
2. Buat Leo companion animation.
3. Polish G6 sebagai flagship mini-game.
4. Polish battle math menjadi monster original.
5. Tambah audio design: click, correct, wrong, level complete, ambient per world.
6. Optimasi asset dan performa.

### Phase 4 - Playtesting anak

Minimal test:

- 5 anak usia 5-6.
- 5 anak usia 7-8.
- 5 anak usia 9.

Observasi:

- Apakah anak tahu harus klik apa?
- Apakah anak bisa mulai game tanpa bantuan?
- Apakah anak mengerti kenapa jawabannya salah?
- Apakah anak mau main lagi setelah 5 menit?
- Game mana yang paling membuat mereka fokus?
- UI mana yang membingungkan?

## Prioritas Core Kalistung

Kalau harus memilih, fokus dulu ke 4 game ini:

1. **Huruf Hutan**

   Jadikan game pengenalan huruf + bunyi huruf + kata awal.

2. **Hitung Binatang**

   Jadikan game number sense: tap-to-count, grouping 5, tambah/kurang visual.

3. **Susun Kata**

   Jadikan game membaca/menulis kata: drag letter, suku kata, word animation.

4. **Jejak Huruf**

   Jadikan game motorik menulis: stroke order, guide, path, correction.

Game 6 bisa menjadi wrapper yang menyenangkan untuk mengulang materi dari 4 core game.

## Checklist AAA-Feel untuk Setiap Game

Sebelum satu mini-game dianggap premium, harus lolos checklist ini:

- Bisa dimulai dari menu tanpa error.
- Satu objective jelas dalam 3 detik pertama.
- Anak bisa tahu area yang harus disentuh.
- Layout bagus di 390x844 dan 1280x720.
- Jawaban benar punya animation yang menjelaskan hasil.
- Jawaban salah punya hint, bukan hanya red/shake.
- Ada suara yang membantu, bukan hanya beep.
- Tidak ada console error.
- Tidak ada asset missing.
- Bisa selesai dan kembali ke menu.
- Progress tersimpan.
- Ada reduced-motion fallback.
- Konten sesuai usia dan bahasa Indonesia.

## Kesimpulan

Kekuatan terbesar game ini adalah visinya: membuat anak belajar lewat dunia game yang variatif. Fondasi data, screen, progress, dan beberapa visual effect sudah ada. Namun untuk menjadi game edukasi anak yang terasa AAA, langkah berikutnya harus lebih disiplin:

1. Fix blocker alur utama.
2. Rapikan sistem UI/layout agar semua game punya komposisi premium.
3. Ubah animasi dari dekorasi menjadi feedback belajar.
4. Bangun learning engine kalistung yang adaptif dan spesifik.
5. Ganti semua IP eksternal dengan karakter original.
6. Test langsung ke anak.

Saat ini game paling potensial untuk jadi flagship adalah Game 6, lalu Game 8 dan Game 9 jika edukasi dan polish-nya diperkuat. Menu mobile sudah punya arah visual yang cukup baik, tetapi level selector dan layout game harus segera dibereskan agar pengalaman anak tidak terputus.
