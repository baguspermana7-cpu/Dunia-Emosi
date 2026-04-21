# Review V2 - Benchmark AAA, UI/UX, Animasi, Effect, dan Gameplay Edukasi

Tanggal: 2026-04-11  
Project: `Dunia Emosi`  
Target: anak 5-9 tahun, browser PC/mobile, fokus kalistung + emosi + pembelajaran umum  
Status: review tanpa perubahan kode

## Koreksi Atas Review Sebelumnya

Review sebelumnya kurang kuat karena saya belum menuliskan benchmark game secara eksplisit. Itu membuat rekomendasi terasa terlalu umum. Untuk game anak edukasi yang ingin terasa "AAA", kita tidak bisa hanya bilang "buat UI modern" atau "tambah animasi". Harus jelas:

- AAA-feel dari game apa?
- Edukasi anak dari app/game apa?
- Motion/feedback seperti apa?
- Bagian mana yang cocok ditiru?
- Bagian mana yang tidak cocok untuk anak 5-9?
- Bagaimana diterapkan ke `Dunia Emosi`?

Di review V2 ini saya pakai dua kelompok benchmark:

1. **AAA / premium family game benchmark** untuk polish, UX, game feel, visual clarity, motion, dan onboarding.
2. **Educational kids app benchmark** untuk learning path, scaffolding, phonics, tracing, counting, dan progress belajar.

`Dunia Emosi` tidak perlu meniru budget AAA. Yang harus ditiru adalah **quality bar**: clarity, responsiveness, meaningful animation, feedback yang mengajar, dan loop bermain yang membuat anak ingin lanjut tanpa dimanipulasi.

## Benchmark Utama yang Saya Pakai

### 1. Super Mario Bros. Wonder

Referensi: Nintendo family platformer, game feel, accessibility untuk pemula, level surprise.

Kenapa relevan:

- Anak bisa langsung paham aksi utama.
- Setiap level punya "kejutan" yang membuat gameplay tidak terasa repetitif.
- Ada karakter pemula seperti Yoshi/Nabbit yang lebih forgiving.
- Sistem badge membuat variasi skill tanpa mengubah core game.

Yang harus ditiru:

- **3 detik pertama jelas**: anak tahu harus melakukan apa.
- **Wonder moment**: setiap beberapa soal, ada perubahan dunia kecil yang menyenangkan.
- **Assist mode**: anak 5 tahun tidak boleh langsung gagal keras.
- **Level punya gimmick edukasi**, bukan hanya angka level naik.

Implementasi untuk `Dunia Emosi`:

- Game 6 punya "Wonder Letter Moment": saat kata selesai, kota berubah sesuai kata. Contoh `APEL` selesai -> pohon apel muncul, huruf A bersinar.
- Game 3 tiap 5 level punya variasi dunia: huruf jatuh dari pohon, huruf bersembunyi di daun, huruf berubah jadi hewan.
- Level 1-5 harus punya assist kuat; level 16-20 baru menantang.

### 2. Kirby and the Forgotten Land

Referensi: family-friendly premium feel, karakter ekspresif, soft difficulty, visual readability.

Kenapa relevan:

- Kirby adalah contoh game anak/family yang terasa premium tanpa harus kompleks.
- Dunia jelas, karakter lucu, aksi mudah dipahami.
- Challenge ada, tapi tidak menghukum anak terlalu keras.

Yang harus ditiru:

- **Silhouette jelas**: anak langsung tahu objek mana yang penting.
- **Karakter utama responsif**: ekspresi karakter memberi emosi pada aksi.
- **Satu screen satu tugas**: tidak banyak instruksi bersaing.
- **Forgiving interaction**: salah tidak langsung membuat anak frustrasi.

Implementasi untuk `Dunia Emosi`:

- Leo harus jadi tutor aktif, bukan dekorasi.
- Setiap game punya satu focal point besar di tengah.
- Gambar objek kata harus original dan readable, bukan emoji kecil.
- Salah jawab harus memunculkan Leo dengan hint, bukan hanya shake merah.

### 3. Mario Kart 8 Deluxe

Referensi: input feel, assist untuk anak/pemula, racing readability, family multiplayer.

Kenapa relevan:

- Game 6 `Petualangan Mobil` sudah menuju lane runner/racing.
- Anak kecil suka kendaraan, gerak cepat, dan collectible.
- Mario Kart membuktikan game cepat tetap bisa ramah pemula dengan assist.

Yang harus ditiru:

- **Steering assist / lane assist** untuk anak kecil.
- **Readable track**: bahaya dan collectible mudah dibedakan.
- **Antisipasi**: pemain melihat objek datang sebelum harus bereaksi.
- **Family mode**: bermain berdua tetap fun, bukan sekadar bergantian.

Implementasi untuk `Dunia Emosi`:

- Game 6 perlu "auto lane hint": lane target huruf berikutnya menyala halus.
- Untuk usia 5-6, mobil bisa magnet ringan ke huruf benar.
- Decoy jangan terlalu sering di early level.
- Obstacle harus punya bentuk dan warna yang sangat beda dari huruf.

### 4. Khan Academy Kids

Referensi: learning path anak usia dini, karakter tutor, reading/math/social-emotional learning.

Kenapa relevan:

- Target usia dekat: early learner.
- Fokus reading, math, social-emotional growth.
- Memakai karakter sebagai guide.
- Pembelajaran tidak berdiri sebagai kuis acak, tapi sebagai path.

Yang harus ditiru:

- **Whole child learning**: kalistung + emosi + kreativitas.
- **Karakter guide**: anak merasa ditemani.
- **Progress bermakna**: orang tua tahu skill apa yang dikuasai.
- **Safe learning environment**: tidak perlu dark pattern.

Implementasi untuk `Dunia Emosi`:

- Dashboard jangan hanya XP/bintang. Harus ada skill: huruf awal, hitung 1-10, tracing A-F, suku kata.
- Leo memberi rekomendasi: "Hari ini kita latihan huruf B dan hitung sampai 8."
- Emosi dan kalistung bisa terhubung: "Leo sedih karena kehilangan huruf A. Ayo bantu cari A."

### 5. ABCmouse / ABCmouse 2

Referensi: learning path reading dan math yang terpisah, grade/level independent, lesson sequence.

Kenapa relevan:

- Anak bisa kuat di membaca tapi lemah di matematika, atau sebaliknya.
- Target kamu mengatakan umur 5 bisa saja mengerjakan level anak 9 tahun. Ini cocok dengan independent level per skill, bukan fixed age.

Yang harus ditiru:

- **Reading path dan Math path terpisah**.
- **Grade/level bisa disesuaikan per subject**.
- **Lesson unit**: belajar -> latihan -> show what you know.
- Progress visual dot-to-dot/path.

Implementasi untuk `Dunia Emosi`:

- Jangan pakai satu ageTier global untuk semua game.
- Buat `readingLevel`, `mathLevel`, `writingLevel`, `emotionLevel`.
- Level 1-20 tiap game harus mengukur skill spesifik.
- Setelah 5 level, ada "Cek Pintar" kecil untuk validasi mastery.

### 6. Duolingo ABC

Referensi: bite-sized lessons, tracing, drag-and-drop, interactive stories, highlighted words.

Kenapa relevan:

- Cocok untuk membaca awal.
- Aktivitas pendek.
- Multi-sensory: lihat, dengar, sentuh/drag, tracing.

Yang harus ditiru:

- **Lesson kecil 30-90 detik**.
- **Interactive story**: kata tidak berdiri sendiri, ada konteks.
- **Word highlight** saat dibaca.
- **Tracing + drag-drop** untuk motorik dan reading.

Implementasi untuk `Dunia Emosi`:

- Game 7 tidak hanya "Ini gambar apa?" tetapi "Leo melihat AYAM. Kata AYAM dimulai dari A."
- Game 8 harus drag letter ke slot, bukan hanya tap berurutan.
- Tambahkan highlight suku kata: A-YAM, BU-KU, GA-JAH.

### 7. LetterSchool

Referensi: handwriting/tracing, 3-step method, visual/auditory guidance, occupational-therapy-friendly.

Kenapa relevan:

- Game 9 `Jejak Huruf` butuh standar tracing yang jauh lebih tinggi.
- Anak 5-9 punya kemampuan motorik berbeda.

Yang harus ditiru:

- **Tiga tahap per huruf**:
  1. Lihat dan ikuti animasi.
  2. Trace dengan guide.
  3. Coba lebih mandiri.
- **Start dot dan arrow direction**.
- **Audio/visual cue saat anak keluar jalur**.
- **Stroke order**, bukan hanya dekat titik.

Implementasi untuk `Dunia Emosi`:

- Game 9 harus menilai urutan titik, arah stroke, dan coverage path.
- Jangan hanya hit ratio dekat guide dots.
- Buat "ghost stroke" yang menyala.
- Jika salah arah: Leo bilang "Mulai dari titik hijau ya."

### 8. Endless Alphabet

Referensi: letter personality, word puzzle, animation illustrating meaning.

Kenapa relevan:

- Game 8 `Susun Kata` perlu dibuat lebih hidup.
- Anak lebih cepat ingat kata jika huruf dan makna divisualkan.

Yang harus ditiru:

- Huruf punya personality.
- Huruf salah bergerak kembali dengan lucu.
- Setelah kata selesai, ada animasi makna kata.
- Anak belajar vocabulary, bukan hanya ejaan.

Implementasi untuk `Dunia Emosi`:

- Huruf A/Y/A/M bisa "jalan" ke slot.
- Jika kata AYAM selesai, ayam muncul dan berkokok.
- Jika salah huruf, huruf tidak hanya ditolak; huruf memberi clue.

### 9. PBS KIDS Games

Referensi: safe educational mini-game ecosystem, karakter familiar, curriculum-based games.

Kenapa relevan:

- `Dunia Emosi` juga punya banyak mini-game.
- Tantangannya adalah konsistensi kualitas dan kurikulum lintas game.

Yang harus ditiru:

- Setiap game punya learning goal jelas.
- UI aman dan sederhana.
- Karakter dunia membuat anak merasa familiar.
- Mini-game berbeda tetap terasa satu universe.

Implementasi untuk `Dunia Emosi`:

- Semua game harus punya format learning goal:
  - "Skill: mengenal huruf awal"
  - "Skill: menghitung benda 1-10"
  - "Skill: tracing uppercase A"
- Visual style semua game harus satu universe Leo.

## Apa Arti "AAA" untuk Game Anak Edukasi

AAA untuk `Dunia Emosi` bukan berarti:

- grafis realistis,
- dunia 3D mahal,
- particle sebanyak mungkin,
- boss battle besar,
- monetisasi agresif,
- semua layar gelap/neon.

AAA untuk anak edukasi berarti:

1. **Anak langsung paham**

   Dalam 3 detik, anak tahu apa yang harus dilakukan.

2. **Setiap interaksi terasa enak**

   Tap, drag, jawaban benar, jawaban salah, pindah level, semuanya responsif.

3. **Feedback mengajar**

   Salah bukan hukuman. Salah adalah kesempatan belajar.

4. **Motion punya fungsi**

   Animasi menunjukkan sebab-akibat: huruf masuk slot, binatang dihitung, garis tracing menyala.

5. **Karakter terasa hidup**

   Leo tidak hanya muncul di menu; Leo memandu, bereaksi, membantu.

6. **Progress bermakna**

   Orang tua tahu anak sudah bisa apa, bukan hanya total bintang.

7. **Polish konsisten**

   Semua screen terasa dari game yang sama.

## Benchmark Detail per Aspek

### A. UI/UX

Benchmark utama: Kirby, Mario Wonder, PBS Kids.

Target UI:

- 1 screen = 1 tugas.
- Focal object besar.
- Tombol jawaban besar tapi tidak berantakan.
- Header tidak mencuri perhatian.
- Instruksi maksimal 1 kalimat.
- Untuk anak 5-6, jangan bergantung pada teks panjang.

Masalah di `Dunia Emosi` sekarang:

- Desktop layout banyak kosong.
- Elemen penting sering terlalu kiri.
- Tombol sekunder seperti `Hapus` terlalu dominan.
- Level selector blank.
- Menu mobile bagus, tapi game screen belum setara.
- Banyak clickable `div`, belum semua semantik button.

Target implementasi:

```text
Top 10%: header compact
Middle 55%: stage utama
Bottom 25%: action/answers
Overlay: feedback/hint/celebration
```

### B. Animasi dan Effect

Benchmark utama: Mario Wonder, Endless Alphabet, LetterSchool.

Masalah sekarang:

- Effect banyak, tapi sebagian dekoratif.
- Confetti/particle sering tidak menjelaskan pembelajaran.
- Salah jawab lebih banyak red/shake, belum hint pedagogis.
- Tidak ada motion hierarchy.
- Reduced motion belum menjadi sistem lengkap.

Target animation layers:

1. **Input response**
   - Tap button scale 0.96, 80-120ms.
   - Drag letter follow finger, snap ke slot.

2. **Learning motion**
   - Huruf benar terbang ke slot.
   - Binatang yang disentuh mendapat angka.
   - Stroke path menyala sesuai urutan.

3. **Character reaction**
   - Leo berpikir saat anak diam.
   - Leo menunjuk saat hint.
   - Leo bangga saat mastery.

4. **World reaction**
   - Background berubah kecil saat kata selesai.
   - Bukan particle acak terus-menerus.

5. **Celebration**
   - Hanya untuk milestone: word complete, level complete, skill mastered.

### C. Game Feel

Benchmark utama: Mario Kart 8 Deluxe, Kirby.

Masalah sekarang:

- Game 6 paling punya game feel, tapi spawn random bisa frustrasi.
- Game lain terasa kuis statis.
- Banyak transisi antar soal hanya delay.

Target:

- Setiap mini-game punya "core verb":
  - Game 3: cari/pilih huruf.
  - Game 4: sentuh dan hitung.
  - Game 8: susun/drag kata.
  - Game 9: ikuti/trace garis.
  - Game 6: kumpulkan huruf.
- Core verb harus menyenangkan bahkan sebelum diberi reward.

### D. Gameplay Edukasi

Benchmark utama: Khan Academy Kids, ABCmouse, Duolingo ABC, LetterSchool.

Masalah sekarang:

- Level 1-20 belum benar-benar granular.
- Banyak random question tanpa skill taxonomy.
- Anak bisa benar karena menebak.
- Salah tidak dianalisis.
- Dashboard belum menunjukkan kemampuan belajar.

Target:

- Skill-based progression.
- Adaptive difficulty.
- Scaffolding.
- Mastery tracking.
- Parent-readable progress.

## Rekomendasi Perombakan Level 1-20

Saat ini level 1-20 dipetakan kasar:

```text
1-7 easy
8-14 medium
15-20 hard
```

Ini belum cukup. Level harus naik berdasarkan dimensi edukasi.

### Contoh Game 3 - Huruf Hutan

| Level | Target skill | Bantuan | Challenge |
|---|---|---|---|
| 1 | Kenal A/B/C | huruf besar + gambar | 2 pilihan |
| 2 | Huruf awal kata | gambar + kata lengkap | 2 pilihan |
| 3 | Huruf awal A-F | audio bunyi awal | 3 pilihan |
| 4 | Bedakan bentuk mirip | B/D, P/R | 3 pilihan |
| 5 | Cek pintar A-F | tanpa hint awal | 4 pilihan |
| 6 | Huruf G-J | gambar + kata | 3 pilihan |
| 7 | Cocokkan huruf-kata | drag huruf | 4 pilihan |
| 8 | Huruf hilang | _YAM = A | 4 pilihan |
| 9 | Suku kata awal | BA, BU, GA | 4 pilihan |
| 10 | Cek pintar 1 | mixed review | adaptive |
| 11-15 | kata lebih panjang | suku kata | distractor mirip |
| 16-20 | mastery | minim hint | kombinasi skill |

### Contoh Game 4 - Hitung Binatang

| Level | Target skill | Bantuan | Challenge |
|---|---|---|---|
| 1 | Hitung 1-3 | objek besar | tidak ada timer |
| 2 | Hitung 1-5 | tap-to-count | tidak ada timer |
| 3 | Subitizing 1-5 | pola dadu | 3 pilihan |
| 4 | Hitung 6-10 | group 5+N | 3 pilihan |
| 5 | Cek pintar 1-10 | tap optional | 4 pilihan |
| 6 | Tambah konkret | 3 apel + 2 apel | visual |
| 7 | Kurang konkret | 7 bebek, 2 pergi | visual |
| 8 | Number line | pilih hasil | 4 pilihan |
| 9 | Word problem | cerita pendek | Leo baca |
| 10 | Cek pintar | mixed | adaptive |
| 11-20 | tambah/kurang lebih kompleks | hint bertahap | timer opsional |

### Contoh Game 8 - Susun Kata

| Level | Target skill | Bantuan | Challenge |
|---|---|---|---|
| 1 | kata 3 huruf | slot + gambar + audio | huruf sedikit |
| 2 | kata 4 huruf | slot + gambar | 1 extra letter |
| 3 | huruf awal | slot pertama menyala | 2 extra letters |
| 4 | suku kata | A-YAM, BU-KU | drag |
| 5 | cek pintar | minim hint | 2 extra |
| 6-10 | kata 5-6 huruf | suku kata | distractor mirip |
| 11-15 | kata panjang | hint terbatas | order memory |
| 16-20 | kalimat pendek | susun kata | comprehension |

### Contoh Game 9 - Jejak Huruf

| Level | Target skill | Bantuan | Challenge |
|---|---|---|---|
| 1 | tracing A | demo otomatis | start dot besar |
| 2 | tracing B | ghost line | arrow |
| 3 | A-C | guide penuh | stroke order |
| 4 | D-F | guide penuh | accuracy |
| 5 | cek pintar | guide tipis | repeat if fail |
| 6-10 | G-N | multi-stroke | hint bertahap |
| 11-15 | O-U | less guide | path accuracy |
| 16-20 | V-Z / kata | freehand lebih mandiri | mastery |

## Rekomendasi Per Game dengan Benchmark

### Game 1 - Aku Merasa

Benchmark: Khan Academy Kids untuk social-emotional learning, Kirby untuk ekspresi karakter.

Masalah:

- Saat ini lebih seperti tebak emoji.
- Anak bisa menebak dari emoji tanpa memahami konteks.
- Tip coping muncul, tapi belum interaktif.

Target:

- Ubah menjadi situasi pendek.
- Anak pilih emosi.
- Anak pilih respon sehat.
- Leo memvalidasi perasaan.

Contoh:

```text
Scene: Mainan Leo rusak.
Pertanyaan 1: Leo merasa apa?
Pertanyaan 2: Apa yang bisa Leo lakukan?
Pilihan: tarik napas / lempar mainan / minta bantuan
```

AAA effect:

- Ekspresi Leo berubah.
- Background color mengikuti emotion zone.
- Setelah memilih coping, animasi Leo tenang.

### Game 2 - Napas Pelangi

Benchmark: calm interaction dari kids mindfulness app, quality bar Khan Academy Kids.

Masalah:

- Interaksi terlalu pasif.
- Anak hanya menunggu timer.

Target:

- Anak mengikuti napas dengan tap/hold atau swipe pelan.
- Lingkaran napas harus punya audio lembut dan visual readable.
- Leo ikut bernapas.

AAA effect:

- Partikel bergerak masuk saat hirup, keluar saat hembus.
- Jangan terlalu ramai.
- Feedback: "Pelan sekali, bagus."

### Game 3 - Huruf Hutan

Benchmark: Duolingo ABC, Endless Alphabet.

Masalah:

- Word bank ada `FROG`, tidak sesuai bahasa Indonesia.
- Beberapa item mismatch seperti `ULAT` dengan emoji kura-kura.
- Masih multiple-choice dominan.

Target:

- Tambahkan phonics Indonesia.
- Huruf punya suara.
- Anak bisa tap huruf di kata.
- Salah memberi hint bunyi awal.

AAA effect:

- Huruf benar tumbuh dari tanah seperti tanaman.
- Huruf salah melompat balik.
- Kata selesai memunculkan animasi objek.

### Game 4 - Hitung Binatang

Benchmark: early math apps, ABCmouse math path.

Masalah:

- Anak memilih angka, tapi tidak benar-benar diajak menghitung.
- Timer bisa membuat anak menebak.
- Layout desktop tidak fokus.

Target:

- Tap-to-count wajib untuk level awal.
- Objek tersusun dalam pola 5+N.
- Setelah tap, muncul nomor di atas binatang.

AAA effect:

- Tiap tap memberi nomor dan bunyi kecil.
- Kelompok 5 diberi lingkaran visual.
- Jika salah, game menunjukkan recount.

### Game 5 - Cocokkan Emosi

Benchmark: memory game anak + PBS Kids safe games.

Masalah:

- Memory match sudah oke, tapi belum punya learning layer kuat.

Target:

- Saat match, tampilkan mini sentence: "Senang: wajah tersenyum."
- Untuk anak 5-6, beri peek awal.
- Setelah dua salah, beri hint satu kartu.

AAA effect:

- Kartu match menyatu jadi badge emosi.
- Leo memberi reaksi.

### Game 6 - Petualangan Mobil

Benchmark: Mario Kart 8 Deluxe untuk assist/input, Mario Wonder untuk world surprise.

Masalah:

- Ini game paling potensial, tapi masih butuh readability dan assist.
- Spawn random 50% target bisa membuat pacing tidak stabil.
- Wrong letter reset bisa frustrasi.

Target:

- Lane target diberi glow.
- Untuk usia 5-6, huruf benar punya magnet.
- Target letter muncul dengan anticipation.
- Setelah kata selesai, ada word payoff animation.

AAA effect:

- Road parallax.
- Camera micro-shake saat obstacle.
- Huruf masuk slot dari jalan ke HUD.
- Kata selesai: scene berubah sesuai kata.

### Game 7 - Tebak Gambar

Benchmark: Duolingo ABC + PBS Kids.

Masalah:

- Masih terlalu dekat dengan flashcard.
- Gambar masih banyak berupa emoji/fallback.

Target:

- Gunakan gambar original.
- Ada audio nama objek.
- Anak bisa mendengar kata dan melihat highlight huruf.

AAA effect:

- Gambar muncul dari scene, bukan card statis.
- Saat benar, objek melakukan animasi pendek.

### Game 8 - Susun Kata

Benchmark: Endless Alphabet, Duolingo ABC.

Masalah:

- Tap letter berurutan kurang tactile.
- Tombol hapus terlalu dominan.
- Salah tidak mengajar.

Target:

- Drag huruf ke slot.
- Huruf aktif sesuai posisi menyala.
- Suku kata diberi grouping.
- Jika salah, beri hint bunyi/suku kata.

AAA effect:

- Huruf punya wajah/personality.
- Huruf snap ke slot dengan squash/stretch.
- Kata selesai jadi animasi objek.

### Game 9 - Jejak Huruf

Benchmark: LetterSchool.

Masalah:

- Ada duplicate pause button.
- Score bisa lolos walau stroke order salah.
- Guide dot belum cukup untuk handwriting learning.

Target:

- 3-step method.
- Start dot, arrow, stroke order.
- Path tolerance.
- Audio cue.
- Lowercase nanti ditambahkan setelah uppercase kuat.

AAA effect:

- Jalur huruf seperti cat/ink menyala.
- Jika keluar jalur, garis memantul halus ke path.
- Setelah berhasil, huruf berubah jadi objek kata.

### Game 10 - Battle Matematika

Benchmark: Mario Wonder untuk spectacle, Mario Kart/Kirby untuk accessibility.

Masalah:

- Error `playSound`.
- Pokemon/IP risk.
- Missing `bg-pokemon-battle.webp`.
- Battle bagus sebagai ide, tetapi harus original.

Target:

- Ganti Pokemon menjadi monster original Dunia Emosi.
- Battle tidak hanya benar/salah. Saat salah, munculkan number line/manipulatif.
- Monster attack berdasarkan skill math.

AAA effect:

- Serangan angka: 4 + 3 menjadi 7 energi.
- HP turun dengan animation readable.
- Monster tidak terasa menyeramkan untuk usia 5.

### Game 11 - Kuis Sains

Benchmark: PBS Kids.

Masalah:

- Beberapa materi terlalu tinggi.
- Tidak core ke kalistung.

Target:

- Jadikan bonus world.
- Untuk anak 5-9, sains harus visual, eksperimen kecil, bukan trivia abstrak.

### Game 12 - Tebak Bayangan

Benchmark: PBS Kids puzzle + vocabulary.

Masalah:

- Potensial untuk inferensi, tapi belum terhubung ke membaca.

Target:

- Setelah memilih jawaban, anak susun kata jawabannya.
- Bisa jadi bridge reading comprehension.

## Rubrik Skor Saat Ini

Skala 1-5. Ini bukan nilai final produk, tapi posisi saat review.

| Aspek | Skor saat ini | Target AAA-feel | Catatan |
|---|---:|---:|---|
| Ide produk | 4 | 5 | Variasi game dan visi bagus |
| Alur utama | 1 | 5 | Level selector blank adalah blocker |
| UI menu mobile | 3.5 | 5 | Arah visual sudah baik |
| UI game desktop | 2 | 5 | Banyak layout kosong/tidak fokus |
| Visual consistency | 2 | 5 | Pastel, dark, Pokemon, emoji bercampur |
| Animation quantity | 4 | 5 | Banyak effect |
| Animation quality/function | 2 | 5 | Belum selalu bermakna edukasi |
| Game feel | 2.5 | 5 | G6/G10 potensial, game lain masih kuis |
| Learning depth | 2 | 5 | Perlu scaffolding dan mastery |
| Age adaptation | 2.5 | 5 | Ada ageTier, tapi belum cukup granular |
| Accessibility | 2 | 5 | Perlu aria, reduced motion, semantic controls |
| Technical stability | 2 | 5 | Ada error runtime dan CSS conflict |

## Top 20 Perbaikan yang Paling Berdampak

1. Fix level selector blank.
2. Fix `playSound is not defined`.
3. Hapus duplicate pause button Game 9.
4. Ganti Pokemon dengan monster original.
5. Buat design system final: bright premium kids adventure.
6. Buat layout template semua game.
7. Re-layout desktop agar stage centered.
8. Ubah Game 4 menjadi tap-to-count.
9. Ubah Game 8 menjadi drag-and-drop letters.
10. Ubah Game 9 menjadi 3-step tracing.
11. Tambahkan Leo sebagai active tutor.
12. Buat skill taxonomy kalistung.
13. Pisahkan reading/math/writing/emotion level.
14. Tambahkan feedback salah yang spesifik.
15. Tambahkan audio instruksi dan phonics Indonesia.
16. Kurangi decorative particle; perkuat functional motion.
17. Tambahkan reduced motion.
18. Optimasi asset 64 MB dan lazy-load per game.
19. Tambahkan smoke test untuk semua game.
20. Playtest anak nyata usia 5-6, 7-8, 9.

## Reference Matrix Singkat

| Reference | Dipakai untuk | Ditiru ke Dunia Emosi |
|---|---|---|
| Super Mario Bros. Wonder | surprise, accessibility beginner, level novelty | Wonder moments per level, assist mode |
| Kirby and the Forgotten Land | soft premium family game, clarity | Leo expressive tutor, readable stage |
| Mario Kart 8 Deluxe | lane/racing assist, family game feel | G6 lane assist, readable collectibles |
| Khan Academy Kids | whole child learning path | dashboard skill-based, Leo guide |
| ABCmouse | reading/math separate paths | separate mastery per subject |
| Duolingo ABC | bite-sized literacy, tracing, stories | 30-90s lessons, word highlighting |
| LetterSchool | handwriting method | 3-step tracing, stroke order |
| Endless Alphabet | living letters, word payoff | animated letters and word meaning |
| PBS KIDS Games | safe mini-game ecosystem | consistent universe, clear learning goals |

## Sumber Benchmark yang Dicek

- Nintendo - Super Mario Bros. Wonder: https://www.nintendo.com/us/store/products/super-mario-bros-wonder-switch/
- Nintendo - Kirby and the Forgotten Land: https://www.nintendo.com/us/store/products/kirby-and-the-forgotten-land-switch/
- Nintendo - Mario Kart 8 Deluxe: https://www.nintendo.com/us/store/products/mario-kart-8-deluxe-switch/
- Khan Academy Kids: https://en.khanacademy.org/kids
- ABCmouse Learning Paths: https://support.abcmouse.com/hc/en-us/articles/34386400234263-Getting-Started-with-the-Learning-Paths-in-ABCmouse-2
- Duolingo ABC App Store listing: https://apps.apple.com/us/app/learn-to-read-duolingo-abc/id1440502568
- LetterSchool official site: https://www.letterschool.com/
- Endless Alphabet App Store listing: https://apps.apple.com/us/app/endless-alphabet/id591626572
- PBS KIDS Games App Store listing: https://apps.apple.com/us/app/pbs-kids-games/id1050773989

## Kesimpulan V2

Kalau targetnya "AAA untuk anak belajar", benchmark paling penting bukan satu game, tetapi gabungan:

- **Mario Wonder** untuk surprise dan level novelty.
- **Kirby** untuk soft premium clarity.
- **Mario Kart** untuk assist dan game feel kendaraan.
- **Khan Academy Kids / ABCmouse** untuk learning path.
- **Duolingo ABC / LetterSchool / Endless Alphabet** untuk kalistung yang benar.
- **PBS Kids** untuk ekosistem mini-game yang aman dan konsisten.

`Dunia Emosi` punya potensi karena sudah punya banyak mini-game dan karakter Leo. Tetapi kualitas AAA tidak akan datang dari menambah effect lagi. Kualitas AAA akan datang dari:

1. Alur utama tanpa bug.
2. Layout yang sangat jelas.
3. Motion yang mengajar.
4. Leo sebagai tutor hidup.
5. Learning path berbasis skill.
6. Game 6/8/9 dipoles sebagai flagship kalistung.
7. Semua konten dan asset menjadi original, konsisten, dan sesuai usia.

