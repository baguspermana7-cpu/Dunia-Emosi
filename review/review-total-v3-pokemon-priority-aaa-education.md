# Review Total V3 - Dunia Emosi sebagai Game Edukasi AAA-Feel dengan Prioritas Pokemon Math Battle

Tanggal: 2026-04-11  
Project: `/home/baguspermana7/rz-work/Apps/dunia-emosi`  
Target user: anak 5-9 tahun  
Prioritas baru dari owner: **Pokemon adalah hook utama karena anak sedang sangat hobi Pokemon. Pokemon dipakai sebagai trik positif untuk membuat anak senang belajar hitung-hitungan.**  
Scope: review total tanpa perubahan kode.

## 0. Pernyataan Arah Baru

Saya setuju dengan keputusan memakai Pokemon sebagai hook belajar, terutama untuk anak yang sedang sangat tertarik Pokemon. Untuk anak 5-9 tahun, motivasi intrinsik sering datang dari dunia yang mereka sukai. Kalau anak sedang suka Pokemon, maka matematika yang dibungkus battle/capture/evolution bisa jauh lebih efektif daripada worksheet angka biasa.

Jadi prioritas review ini berubah:

1. **Prioritas #1: Pertarungan Pokemon / Math Battle harus menjadi flagship utama.**
2. Game lain tetap penting, tetapi harus mendukung "Pokemon learning ecosystem".
3. Kalistung tetap tujuan utama, tetapi pintu masuknya adalah hobi anak.
4. Untuk penggunaan pribadi/keluarga, Pokemon sebagai hook bisa dipakai. Untuk rilis publik/Steam, harus dipikirkan risiko lisensi/IP dan opsi "creature original" nanti.

Review sebelumnya kurang tajam karena saya menilai semua game relatif sejajar. Setelah klarifikasi ini, strategi produk yang lebih benar adalah:

> Jadikan `Dunia Emosi` sebagai game belajar dengan **Pokemon Math Battle sebagai magnet utama**, lalu hubungkan membaca, menulis, menghitung, dan emosi ke dunia Pokemon/creature battle.

## 1. Executive Verdict

`Dunia Emosi` punya bahan mentah yang kuat, tetapi belum punya fokus produk yang cukup tajam. Dengan prioritas baru, fokus terbaik adalah:

```text
Pokemon Battle = core hook
Kalistung = learning mission
Leo = tutor/pendamping
Mini-games lain = training camp untuk memperkuat skill battle
```

Saat ini, Game 10 `Pertarungan Pokemon` secara visual paling dekat ke game sungguhan. Ia punya:

- battle field,
- Pokemon sprite,
- HP bar,
- level Pokemon,
- type badge,
- soal matematika,
- attack animation,
- defeat animation,
- round progression.

Namun Game 10 juga punya blocker fungsional besar:

- `playSound()` dipanggil tetapi tidak didefinisikan.
- background `assets/bg-pokemon-battle.webp` direferensikan tetapi tidak ada.
- level selector menuju game blank karena CSS menyembunyikan level selector.
- battle belum benar-benar mengajar matematika; ia baru menguji jawaban.
- anak bisa salah lalu kena counterattack, tetapi tidak mendapat pembelajaran "kenapa jawabannya salah".

Jadi strategi terbaik:

1. Perbaiki playable flow.
2. Jadikan Pokemon Battle sebagai prioritas polish.
3. Tambahkan variasi game baru berbasis Pokemon: capture, gym, evolution, Pokédex reading, rescue runner, camp care.
4. Integrasikan game lain sebagai latihan skill untuk menang battle.

## 2. Benchmark AAA / Family Game yang Dipakai

### A. Pokemon Mainline Battle

Yang diadopsi:

- turn-based battle,
- HP bar,
- level Pokemon,
- type identity,
- attack feedback,
- menang battle terasa rewarding,
- koleksi Pokemon memberi motivasi.

Kenapa cocok:

- Anak yang suka Pokemon sudah punya motivasi awal.
- Matematika bisa menjadi "energi serangan".
- Jawaban benar langsung punya konsekuensi visual: Pokemon menyerang.

Yang harus dihindari:

- battle terlalu lambat,
- UI terlalu rumit,
- banyak teks,
- punishment terlalu berat,
- anak hanya menebak angka untuk melihat animasi.

### B. Mario Kart 8 Deluxe

Yang diadopsi:

- assist untuk pemula,
- readability tinggi,
- game cepat tapi tetap ramah anak,
- input sederhana.

Untuk `Dunia Emosi`:

- Game 6 dan varian Pokemon runner perlu lane assist.
- Anak 5-6 butuh "magnet" ke jawaban benar, bukan langsung gagal.

### C. Super Mario Bros. Wonder

Yang diadopsi:

- setiap level punya kejutan,
- level pendek tapi memorable,
- tidak hanya naik angka difficulty,
- banyak variasi situasi.

Untuk `Dunia Emosi`:

- Tiap 5 level Pokemon Battle harus punya twist: evolution, gym leader, shiny encounter, boss, team battle.

### D. Kirby and the Forgotten Land

Yang diadopsi:

- family-friendly premium feel,
- karakter lucu,
- forgiving challenge,
- visual clear.

Untuk `Dunia Emosi`:

- Pokemon Battle harus tetap ramah anak, bukan terlalu gelap/keras.
- Salah jawab sebaiknya dibantu, bukan langsung membuat anak merasa kalah.

### E. Khan Academy Kids / ABCmouse / Duolingo ABC / LetterSchool

Yang diadopsi:

- learning path,
- skill mastery,
- scaffolding,
- bite-sized lesson,
- tracing and reading support.

Untuk `Dunia Emosi`:

- Battle harus memakai skill map matematika.
- Anak harus belajar proses menghitung, bukan hanya memilih angka.
- Progress harus menunjukkan skill: tambah 1-10, kurang 1-10, number sense, membaca kata Pokemon, dll.

## 3. Bukti Source yang Penting

### Blocker 1 - Level selector disembunyikan

Di `index.html`:

```css
.level-progress-row,.level-tiers { display:none !important; }
.level-game-banner { display:none !important; }
```

Dampak:

- Menu bisa tampil.
- Saat pilih game, `screen-level` aktif.
- Tetapi level selector kosong/gelap.
- Anak tidak bisa mulai game secara normal.

Prioritas:

- Ini harus diperbaiki sebelum polish Pokemon Battle, karena game tidak bisa diakses normal.

### Blocker 2 - Game 10 error saat menjawab

Di `g10Answer`:

```js
playSound(ok?'correct':'wrong')
```

Tetapi tidak ada fungsi `playSound`.

Dampak:

- Saat anak menjawab soal Pokemon Battle, console error muncul.
- Flow attack bisa rusak.
- Ini blocker utama flagship game.

### Blocker 3 - Background battle missing

CSS:

```css
background:url('assets/bg-pokemon-battle.webp') center/cover no-repeat;
```

Asset tidak ada di folder `assets`.

Dampak:

- Browser mencoba load asset dan mendapat 404.
- Battle masih fallback gradient, tapi visual premium tidak lengkap.

### Blocker 4 - Game 9 duplicate pause

Ada dua tombol pause di Game 9:

```html
<button class="gh-pause" onclick="pauseGame()">⏸</button>
<button class="gh-pause" onclick="pauseGame()">⏸</button>
```

Dampak:

- UI terlihat kurang rapi.
- Ini sinyal kurang QA.

### Konten edukasi yang perlu koreksi

Data huruf:

```js
{animal:'🐸',word:'FROG', letter:'F',num:6}
{animal:'🐢',word:'ULAT', letter:'U',num:3}
```

Masalah:

- `FROG` bahasa Inggris, padahal tidak ingin bahasa Inggris.
- `ULAT` memakai emoji kura-kura, membingungkan.

## 4. Prioritas Produk Baru

### Prioritas 1 - Pokemon Math Battle

Ini harus jadi layar terbaik, paling polished, paling playable.

Target:

- Anak masuk, pilih/lihat Pokemon, jawab soal hitung, Pokemon menyerang.
- Kalau salah, game mengajar dengan visual.
- Setelah menang, anak merasa "aku belajar untuk menang battle".

### Prioritas 2 - Pokemon Capture / Collection

Battle saja bagus, tapi anak yang suka Pokemon biasanya terdorong oleh:

- menangkap Pokemon,
- mengisi Pokédex,
- evolusi,
- level up,
- bertemu Pokemon baru.

Ini bisa jadi motivasi belajar yang sehat jika tidak memakai monetisasi/gacha.

### Prioritas 3 - Kalistung Training Camp

Game lama seperti Huruf Hutan, Hitung Binatang, Susun Kata, Jejak Huruf bisa diubah menjadi training:

```text
Latihan hitung -> memperkuat serangan
Latihan huruf -> membuka Pokédex
Latihan susun kata -> membaca nama Pokemon
Latihan tracing -> menulis kartu Pokemon
```

## 5. Audit Game 10 - Pertarungan Pokemon

### Yang sudah bagus

Game 10 adalah modul paling dekat dengan game premium:

- Layout battle klasik sudah familiar.
- Ada HP enemy/player.
- Ada Pokemon name dan level.
- Ada type badge.
- Ada math question.
- Ada answer buttons besar.
- Ada attack FX.
- Ada defeat animation.
- Ada rounds.

Ini jauh lebih engaging dibanding quiz biasa.

### Masalah saat ini

#### 1. Soal matematika belum cukup edukatif

Saat ini soal dibuat:

```js
4 - 3 = ?
```

Lalu anak memilih 1 dari 4 jawaban. Ini masih quiz multiple choice.

Yang kurang:

- tidak ada benda visual,
- tidak ada number line,
- tidak ada clue,
- tidak ada penjelasan saat salah,
- tidak ada adaptasi dari kesalahan anak.

#### 2. Pilihan jawaban bisa mendorong menebak

Anak bisa menekan angka random untuk melihat Pokemon bergerak. Kalau goal kita belajar, harus ada layer yang mengurangi random guessing.

Solusi:

- Level awal: anak harus melakukan aksi hitung visual dulu.
- Contoh: ada 4 energi, 3 dipakai, sisa energi harus dihitung.
- Baru kemudian pilih jawaban.

#### 3. Salah jawab terlalu punitive

Saat salah, musuh counterattack. Untuk anak 5-6, ini bisa membuat frustrasi.

Solusi:

- Salah pertama: Leo memberi hint, belum kena damage.
- Salah kedua: baru enemy charge.
- Salah ketiga: enemy attack.

#### 4. Type system belum dimanfaatkan sebagai pembelajaran

Type sekarang hanya badge/warna. Padahal bisa jadi materi belajar:

- Electric = tambah cepat.
- Water = kelompok 10.
- Grass = growing numbers.
- Fire = subtraction/burn away.

#### 5. Belum ada sense of collection

Battle random bagus untuk variasi, tapi anak Pokemon biasanya ingin:

- memilih Pokemon favorit,
- melihat Pokédex,
- menangkap Pokemon,
- menaikkan level Pokemon.

Kalau ini tidak ada, battle cepat terasa repetitif.

## 6. Rekomendasi Redesign Pokemon Math Battle

### Core loop baru

```text
1. Anak memilih buddy Pokemon
2. Musuh muncul
3. Soal matematika muncul sebagai "energy move"
4. Anak menyelesaikan soal dengan visual support
5. Jawaban benar -> serangan Pokemon
6. Jawaban salah -> hint / visual counting
7. Enemy HP turun
8. Menang -> XP Pokemon / capture chance / Pokédex entry
9. Skill mastery tersimpan
```

### Battle UI AAA-feel

Layout:

```text
Top 45%: battle field
Middle 10%: battle text / status
Bottom 45%: math interaction panel
```

Untuk mobile:

```text
Pokemon field tidak terlalu tinggi.
Soal besar.
Jawaban thumb-friendly.
Hint button kecil.
```

Untuk desktop:

```text
Battle field lebar penuh.
Math panel di tengah max-width.
Side panel bisa untuk Leo hint / Pokédex.
```

### Math panel harus visual

Untuk level 1-5:

```text
Soal: 3 + 2 = ?
Visual: ⚡ ⚡ ⚡ + ⚡ ⚡
Anak bisa tap untuk menghitung: 1,2,3,4,5
Jawaban: 5
```

Untuk pengurangan:

```text
Soal: 7 - 3 = ?
Visual: 7 energy orbs, 3 orbs menghilang
Sisa yang menyala dihitung
```

Untuk level 6-10:

```text
Number line 0-20.
Anak lompat dari angka ke angka.
```

Untuk level 11-20:

```text
Word problem:
"Pikachu punya 8 berry. Ia memberi 3 ke Eevee. Berapa sisa berry?"
```

### Feedback salah yang benar

Jangan langsung "salah". Gunakan:

```text
Leo: "Hampir. Kita hitung lagi energi yang tersisa."
```

Lalu animasi:

- angka salah shake,
- energi di-highlight,
- count ulang muncul,
- jawaban benar menyala pelan.

### Attack animation

Setiap type punya effect:

- Electric: lightning bolt, cepat, kuning.
- Fire: flame trail, red-orange.
- Water: wave splash.
- Grass: vines/leaves.
- Psychic: purple pulse.
- Ice: freeze crystal.

Tetapi effect harus readable, tidak menutupi soal berikutnya.

### Boss/Gym structure

Supaya level 1-20 lebih menarik:

| Tier | Nama | Level | Struktur |
|---|---|---|---|
| 1 | Training Field | 1-5 | tambah/kurang 1-10 visual |
| 2 | Forest Gym | 6-10 | tambah/kurang 1-20 number line |
| 3 | Thunder Gym | 11-15 | mixed operation + word problem |
| 4 | Champion Arena | 16-20 | boss battle, multi-step |

## 7. Variasi Game Baru yang Disarankan

Berikut 6 variasi game baru yang lebih menarik, semua memakai hook Pokemon/creature dan mengadopsi pola AAA/family games.

### Game Baru 1 - Pokemon Catch Math

Prioritas: sangat tinggi.  
Benchmark: Pokemon capture loop + timing sederhana seperti Mario Party mini-game.

#### Konsep

Anak bertemu Pokemon liar. Untuk melempar Poké Ball, anak harus menjawab soal hitung. Jawaban benar membuat bola lebih akurat. Setelah 2-3 jawaban benar, Pokemon tertangkap dan masuk Pokédex.

#### Learning skill

- hitung 1-10,
- penjumlahan,
- pengurangan,
- number sense,
- estimasi sederhana.

#### Loop

```text
Pokemon muncul -> soal -> jawab -> lempar bola -> shake 1x/2x/3x -> tertangkap
```

#### Kenapa menarik

Anak Pokemon biasanya suka menangkap Pokemon, bukan hanya battle. Capture lebih positif daripada damage terus-menerus. Cocok untuk anak 5-6.

#### AAA effect

- Pokemon idle animation.
- Poké Ball arc.
- Ball shake 3 kali.
- Confetti kecil saat catch.
- Pokédex card reveal.

#### Difficulty

| Level | Math | Catch mechanic |
|---|---|---|
| 1-5 | 1-5 visual count | 1 jawaban benar cukup |
| 6-10 | tambah 1-10 | 2 jawaban benar |
| 11-15 | kurang 1-20 | Pokemon bergerak pelan |
| 16-20 | word problem | rare Pokemon |

#### Catatan penting

Jangan pakai random gacha. Pokemon yang muncul bisa ditentukan dari learning path agar aman untuk anak.

### Game Baru 2 - Pokemon Evolution Lab

Prioritas: tinggi.  
Benchmark: Pokemon evolution payoff + puzzle progression ala Mario Wonder.

#### Konsep

Pokemon berevolusi jika anak menyelesaikan rangkaian soal pola angka, penjumlahan, atau pengurangan. Evolution menjadi reward visual besar untuk mastery, bukan reward acak.

#### Learning skill

- pola angka,
- urutan bilangan,
- skip counting,
- tambah bertahap,
- pengurangan bertahap.

#### Loop

```text
Pokemon kecil -> butuh 3 energy stones -> solve 3 pattern puzzles -> evolution animation
```

#### Contoh soal

```text
2, 4, 6, __
5 + 2 = __
10 - 3 = __
```

#### AAA effect

- Pokemon glowing silhouette.
- Evolution light beam.
- Before/after reveal.
- Music sting khusus evolution.

#### Kenapa efektif

Evolution adalah motivasi natural Pokemon. Anak merasa belajar menghasilkan perubahan nyata.

### Game Baru 3 - Pokemon Gym Math Challenge

Prioritas: tinggi.  
Benchmark: gym leader progression Pokemon + boss level Mario.

#### Konsep

Setiap gym punya tema matematika:

- Grass Gym: tambah dengan benda.
- Water Gym: grouping 10.
- Electric Gym: quick addition.
- Fire Gym: subtraction.
- Psychic Gym: pattern/logic.

Anak melawan 3 trainer kecil lalu Gym Leader.

#### Learning skill

- structured progression,
- mastery per operation,
- endurance ringan.

#### Loop

```text
Trainer 1 -> Trainer 2 -> Trainer 3 -> Gym Leader -> badge
```

#### AAA effect

- Gym intro banner.
- Trainer portrait.
- Boss HP lebih besar.
- Badge reveal after mastery.

#### Kenapa menarik

Anak punya target jelas: dapat badge. Ini lebih kuat daripada "level 8".

### Game Baru 4 - Pokédex Detective Reading

Prioritas: tinggi untuk membaca.  
Benchmark: Duolingo ABC + Pokédex collection.

#### Konsep

Anak membuka Pokédex. Ada bayangan Pokemon dan clue pendek. Anak membaca/mendengar clue, lalu memilih Pokemon atau menyusun nama Pokemon.

#### Learning skill

- membaca kata,
- memahami instruksi,
- suku kata,
- matching visual-text,
- vocabulary Indonesia.

#### Contoh

```text
Clue: "Pokemon ini suka listrik."
Pilihan: Pikachu / Squirtle / Bulbasaur

Susun kata: P I K A C H U
```

#### AAA effect

- Pokédex scan line.
- Silhouette reveal.
- Data card unlock.
- Voice-like beep, but child-friendly.

#### Kenapa cocok

Anak belajar membaca karena ingin tahu Pokemon apa yang muncul.

### Game Baru 5 - Pokemon Rescue Runner

Prioritas: medium-high.  
Benchmark: Mario Kart assist + lane runner.

#### Konsep

Mirip Game 6, tapi misinya menyelamatkan Pokemon. Anak mengendarai kendaraan dan mengumpulkan angka/huruf yang benar untuk membuka jalan.

#### Learning skill

- huruf,
- angka,
- quick recognition,
- fokus visual,
- koordinasi motorik.

#### Loop

```text
Target: kumpulkan angka hasil 3+2
Jalan 3 lane
Ambil 5, hindari decoy
Pokemon terselamatkan
```

#### AAA effect

- Lane glow ke target.
- Rescue cage unlock.
- Pokemon happy animation.
- Assist mode untuk usia 5-6.

#### Kenapa menarik

Lebih action daripada quiz. Anak merasa sedang menolong Pokemon, bukan mengerjakan soal.

### Game Baru 6 - Pokemon Camp Care

Prioritas: medium.  
Benchmark: Animal Crossing/Tamagotchi/Toca Boca style caring loop.

#### Konsep

Anak merawat Pokemon di camp: memberi berry, membersihkan, memilih mainan, menenangkan Pokemon. Setiap aktivitas memakai kalistung ringan.

#### Learning skill

- counting,
- sequencing,
- membaca instruksi,
- emosi/regulasi,
- rutinitas.

#### Contoh aktivitas

```text
Beri Pikachu 4 berry.
Susun kata: BOLA.
Pilih emosi Eevee: senang/sedih/marah.
Trace huruf P untuk Pikachu.
```

#### AAA effect

- Pokemon bereaksi lucu.
- Camp terasa hidup.
- Aktivitas pendek.
- Tidak ada gagal keras.

#### Kenapa penting

Tidak semua anak ingin battle terus. Camp memberi ruang santai, emosi, dan bonding.

## 8. Rekomendasi Integrasi Game Lama ke Pokemon Learning Ecosystem

### Game 3 - Huruf Hutan menjadi Pokemon Letter Forest

Alih-alih huruf acak, anak mencari huruf untuk nama Pokemon.

Contoh:

```text
Pikachu kehilangan huruf P.
Cari P di hutan.
```

### Game 4 - Hitung Binatang menjadi Berry Count

Alih-alih menghitung binatang random, anak menghitung berry/energy untuk Pokemon.

Contoh:

```text
Bulbasaur butuh 6 berry. Hitung berry satu-satu.
```

### Game 8 - Susun Kata menjadi Pokemon Name Builder

Anak menyusun nama Pokemon atau kata benda Indonesia yang berhubungan dengan Pokemon.

Contoh:

```text
API, AIR, DAUN, BATU, BOLA
PIKACHU, EEVEE, MEW
```

Untuk usia 5-6 jangan mulai dari nama panjang. Mulai dari:

- API,
- AIR,
- BATU,
- BOLA,
- MEW.

### Game 9 - Jejak Huruf menjadi Pokemon Trainer Writing

Anak menulis huruf awal Pokemon:

- P untuk Pikachu,
- E untuk Eevee,
- M untuk Mew,
- B untuk Bulbasaur.

Setelah tracing berhasil, kartu Pokemon terbuka.

## 9. Desain Progress Belajar yang Lebih Cocok

Jangan hanya:

```text
XP, bintang, level
```

Tambahkan skill map:

```text
Matematika
- Hitung 1-5: 90%
- Hitung 1-10: 70%
- Tambah 1-10: 45%
- Kurang 1-10: 30%

Membaca
- Huruf awal: 80%
- Suku kata: 40%
- Susun kata: 35%

Menulis
- Trace A-F: 60%
```

Untuk anak:

```text
Pikachu makin kuat karena kamu jago tambah 1-10.
```

Untuk orang tua:

```text
Anak sering salah di pengurangan 8-3, 9-4, 7-5.
```

## 10. Prinsip UX untuk Anak yang Suka Pokemon

### 1. Jangan mulai dari menu terlalu banyak

Anak harus bisa langsung:

```text
MAIN -> Pokemon Battle
```

Tombol utama di welcome sebaiknya:

```text
⚡ Battle Pokemon
```

Lalu tombol lain:

```text
Latihan
Pokédex
Camp
Progress
```

### 2. Pokemon favorit harus muncul cepat

Jika anak suka Pokemon tertentu, berikan pilihan buddy:

- Pikachu,
- Eevee,
- Charmander,
- Squirtle,
- Bulbasaur,
- Mew.

Jangan random full dari 1000 Pokemon di awal. Terlalu banyak pilihan bisa membingungkan.

### 3. Sesi pendek

Untuk usia 5-9:

- 1 battle: 60-120 detik.
- 1 capture: 30-60 detik.
- 1 tracing: 30-90 detik.
- 1 gym: 5-8 menit.

### 4. Salah harus tetap terasa aman

Pokemon enemy boleh menyerang, tapi jangan membuat anak takut gagal.

Gunakan:

```text
Salah pertama = hint
Salah kedua = shield retak
Salah ketiga = enemy attack
```

## 11. Rekomendasi UI/Visual untuk Pokemon Battle

### Battle field

Yang sekarang:

- sudah mirip classic Pokemon battle,
- ada info box,
- ada HP bar,
- ada sprite.

Yang perlu:

- background battle asset harus ada,
- field harus lebih hidup,
- Pokemon harus punya idle animation,
- ground shadow harus konsisten,
- attack hit impact harus lebih readable.

### Math panel

Yang sekarang:

- soal besar,
- jawaban 2x2.

Yang perlu:

- visual manipulative,
- hint area,
- voice/text prompt,
- correct explanation.

Contoh panel:

```text
Pikachu memakai Thunder Count!

3 + 2 = ?

⚡ ⚡ ⚡  +  ⚡ ⚡

[4] [5] [6] [7]
```

Jika anak pilih 4:

```text
Leo: "Coba hitung semua petirnya: 1, 2, 3, 4, 5."
```

## 12. Rekomendasi Animasi Pokemon Battle

### Current effect yang sudah ada

- sprite slide-in,
- attack lunge,
- hit shake,
- flash,
- defeat burst,
- HP shine.

Ini bagus sebagai fondasi.

### Yang harus ditambah

1. **Idle loop**

   Pokemon bernapas/bergerak halus.

2. **Anticipation**

   Sebelum attack, Pokemon charge 0.3 detik.

3. **Type attack**

   Electric/fire/water/grass punya effect beda.

4. **Math-to-attack transformation**

   Jawaban benar berubah menjadi energi serangan.

   Contoh:

   ```text
   angka 5 -> 5 petir -> Pikachu menyerang
   ```

5. **Learning hint animation**

   Saat salah, jangan flash merah saja. Tampilkan proses hitung ulang.

## 13. Roadmap Prioritas Implementasi

### Sprint 0 - Membuat game bisa dimainkan

Prioritas mutlak:

1. Fix level selector blank.
2. Fix `playSound`.
3. Fix missing `bg-pokemon-battle.webp`.
4. Pastikan Game 10 bisa start dari menu, jawab, attack, menang, result, kembali menu.
5. Tambahkan smoke test khusus Game 10.

### Sprint 1 - Pokemon Battle MVP premium

1. Welcome CTA langsung ke Pokemon Battle.
2. Pilih buddy Pokemon.
3. Battle 3 ronde.
4. Math visual support untuk tambah/kurang.
5. Hint saat salah.
6. Attack animation per type minimal electric/fire/water/grass.
7. Result screen: Pokemon naik level.

### Sprint 2 - Pokemon Catch Math

1. Encounter screen.
2. Soal hitung untuk melemahkan/catch.
3. Pokédex card unlock.
4. 10 Pokemon awal.

### Sprint 3 - Pokemon Gym Math Challenge

1. Gym map.
2. 4 gym pertama.
3. Badge reveal.
4. Skill mastery per gym.

### Sprint 4 - Reading integration

1. Pokédex Detective.
2. Pokemon Name Builder.
3. Huruf awal nama Pokemon.
4. Audio/read-aloud.

### Sprint 5 - Writing and emotion integration

1. Trainer Writing.
2. Pokemon Camp Care.
3. Emotion/calm down mini-game with Pokemon.

## 14. Score Prioritas Setelah Arah Baru

| Area | Prioritas | Alasan |
|---|---:|---|
| Game 10 Pokemon Math Battle | 1 | Hook utama anak |
| Level selector / playable flow | 1 | Tanpa ini game tidak bisa dimulai |
| Math visual feedback | 1 | Membuat battle benar-benar edukatif |
| Pokemon capture/collection | 2 | Motivasi kuat untuk anak Pokemon |
| Game 6 runner | 3 | Bisa jadi Pokemon Rescue Runner |
| Game 8 word builder | 3 | Penting untuk membaca |
| Game 9 tracing | 4 | Penting tapi butuh redesign |
| Game 1/2 emosi/napas | 5 | Bisa diintegrasikan ke Pokemon Camp |
| Game 11/12 | 6 | Bonus, bukan core awal |

## 15. Kesimpulan Total

Arah terbaik bukan membuat semua mini-game dipoles bersamaan. Itu terlalu melebar.

Strategi yang lebih kuat:

```text
Jadikan Pokemon Math Battle sebagai game utama.
Buat anak senang belajar hitung karena ingin menang/catch/evolve Pokemon.
Gunakan mini-game lain sebagai training dan variasi.
```

Kalau dilakukan benar, `Dunia Emosi` bisa berubah dari kumpulan mini-game menjadi:

```text
Pokemon-inspired learning adventure untuk kalistung anak 5-9.
```

Prioritas paling cepat:

1. Fix blocker Game 10 dan level selector.
2. Ubah battle dari quiz menjadi visual math battle.
3. Tambahkan capture/evolution/gym sebagai variasi.
4. Jadikan membaca/menulis masuk lewat Pokédex dan nama Pokemon.
5. Gunakan Leo sebagai tutor yang menjelaskan, bukan hanya mascot.

Catatan rilis publik:

Untuk penggunaan pribadi anak, memakai Pokemon sebagai hook masuk akal. Untuk rilis publik/Steam, perlu strategi IP: lisensi resmi atau ganti menjadi creature original yang terinspirasi mekanik Pokemon, bukan memakai nama/sprite Pokemon langsung.

