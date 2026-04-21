# Review Total V4 - Audit Teknis Spesifik Untuk Pokemon Battle, Feedback Belajar, UI/UX AAA

Tanggal review: 2026-04-11  
Project: `/home/baguspermana7/rz-work/Apps/dunia-emosi`  
Scope: review saja. Tidak ada perubahan pada kode game.  
Target anak: 5-9 tahun, web browser PC/mobile, fokus kalistung dan motivasi belajar lewat hobi Pokemon.

## Catatan Anti-Halusinasi

Yang saya sebut sebagai "fakta" di dokumen ini berasal dari source `index.html`, struktur asset, dan inspeksi browser lokal yang sudah dilakukan. Yang saya sebut sebagai "rekomendasi" adalah spesifikasi perbaikan, bukan klaim bahwa fitur itu sudah ada.

Saya tidak akan menulis saran generik seperti "rapikan UI". Setiap poin di bawah menjelaskan komponen, state, event, CSS, algoritma, atau flow belajar yang perlu dibuat/diubah.

## Benchmark Yang Dipakai

Benchmark ini bukan untuk menyalin asset atau IP. Yang diambil adalah prinsip desain game dan edukasinya.

| Referensi | Dipakai Untuk | Prinsip Yang Diadopsi Ke Game Ini |
|---|---|---|
| Pokemon Legends: Z-A / Pokemon battle loop | Prioritas pertama untuk Game 10 | Battle arena, identitas monster, serangan berbasis tipe, HP, encounter, rasa menang setelah jawaban benar. Sumber: https://legends.pokemon.com/en-us/ |
| Super Mario Bros. Wonder | Variasi dan surprise dalam level | Setiap level perlu punya "moment" unik: transformasi rules, power badge, efek dunia berubah, bukan hanya angka bertambah. Sumber: https://www.nintendo.com/us/store/products/super-mario-bros-wonder-switch/ |
| Animal Crossing: New Horizons | Koleksi, pacing santai, personalisasi | Anak tidak harus selalu dikejar timer. Bisa ada koleksi Pokedex, camp, museum, sticker, dan progress yang terasa hangat. Sumber: https://www.nintendo.com/us/store/products/animal-crossing-new-horizons-switch/ |
| Khan Academy Kids | Kurikulum anak kecil dan whole-child learning | Fondasi membaca, menulis, bahasa, matematika, social-emotional learning, dan learning path yang tumbuh bersama anak. Sumber: https://www.khanacademy.org/kids |
| LetterSchool | Feedback menulis huruf | Untuk trace huruf, perlu visual/audio hint ketika anak butuh bantuan, bukan hanya skor akhir. Sumber: https://www.letterschool.com/ |
| Minecraft | Agency dan eksplorasi | Anak diberi ruang membuat/mengumpulkan/mengatur, bukan hanya menjawab soal. Sumber: https://www.minecraft.net/en-us/about-minecraft |

## Kesimpulan Teknis

Game ini punya fondasi yang bagus untuk anak: ada banyak variasi game, tema Pokemon sudah masuk, sistem 20 level sudah ada, local storage progress sudah ada, dan asset Pokemon lokal cukup banyak. Tetapi kualitas saat ini belum mendekati "AAA for kids" karena tiga masalah besar:

1. Flow belajar belum punya feedback instruksional. Mayoritas feedback hanya benar/salah, flash warna, bintang, dan lanjut soal. Anak belum diajak melihat "kenapa jawaban benar" atau "bagaimana memperbaiki kesalahan".
2. Game 10 Pokemon Battle punya potensi paling kuat, tapi sekarang masih punya runtime bug dan loop belajar terlalu menghukum. Salah langsung diserang, bukan dibantu belajar.
3. UI level selector dan beberapa game masih punya masalah teknis nyata: level selector disembunyikan CSS, asset battle hilang, fungsi audio yang dipanggil tidak ada, duplikasi tombol pause, mapping metadata tidak sesuai.

Prioritas pertama sebaiknya bukan membuat semua game terlihat ramai. Prioritas pertama adalah menjadikan Pokemon Battle sebagai "flagship learning loop": jawaban benar memicu serangan, jawaban salah memicu hint bertahap, visual math model muncul, lalu anak bisa mencoba lagi sebelum dihukum.

## Fakta Source Yang Penting

| Area | Evidence Source | Fakta | Dampak |
|---|---:|---|---|
| Struktur app | `index.html` sekitar 5894+ baris, 332 KB | Semua CSS, HTML, JS utama berada di satu file. | Sulit maintain, sulit membuat sistem feedback reusable, rawan override CSS. |
| Asset Pokemon | `assets/Pokemon/sprites`: 1025 file, 4.2 MB | Asset Pokemon lokal sudah banyak. | Kuat untuk hook anak; perlu loading/fallback yang rapi. |
| Total asset | `assets`: 64 MB | Asset cukup besar untuk web anak. | Perlu preload/lazy-load, kalau tidak mobile bisa berat. |
| Viewport | `index.html:5` | `user-scalable=no`. | Buruk untuk aksesibilitas anak/orangtua; zoom browser dimatikan. |
| Level selector | `index.html:2328-2329` | `.level-progress-row,.level-tiers` dan `.level-game-banner` disembunyikan `display:none !important`. | Level selector terlihat kosong/gelap walau JS mengisi data. Ini blocker. |
| Level selector JS | `index.html:4062-4117` | `openLevelSelect()` mengisi banner, progress, level dots, lalu `showScreen('screen-level')`. | Kode JS bekerja, tapi CSS mematikan elemen yang diisi. |
| Level mapping | `index.html:4123-4125` | Level 1-7 easy, 8-14 medium, 15-20 hard. | 20 level secara UI ada, tapi variasi pedagogis masih 3 bucket besar. |
| Difficulty | `index.html:3688-3691` | Hanya `easy`, `medium`, `hard`. | Belum cukup granular untuk anak 5-9 yang bisa lompat kemampuan. |
| Game metadata | `index.html:4027-4029` | Deskripsi game 3/4/5 tidak konsisten dengan nama game di menu. | Anak/orangtua bisa salah ekspektasi sebelum bermain. |
| Game 10 CSS | `index.html:1477-1648` | Battle layout, HP, sprite, question panel, attack FX sudah ada. | Ini bagian visual paling siap jadi flagship. |
| Game 10 missing asset | `index.html:1489` | CSS memakai `assets/bg-pokemon-battle.webp`, tetapi browser menunjukkan asset ini tidak ditemukan. | Background battle jatuh ke gradient saja; rasa premium turun. |
| Game 10 audio bug | `index.html:5715` | `g10Answer()` memanggil `playSound(...)`. | Runtime error karena `playSound` tidak ada. |
| Audio function tersedia | `index.html:4569-4571` | Yang ada adalah `playCorrect()`, `playWrong()`, `playClick()`. | Perbaikan minimal: adapter `playSound` atau ganti call. |
| Game 11/12 bug sama | `index.html:5942`, `index.html:6018` | `playSound(...)` juga dipakai di game 11/12. | Kuis sains dan tebak bayangan juga bisa error ketika menjawab. |
| Game 10 soal | `index.html:5651-5704` | Soal hanya penjumlahan/pengurangan, pilihan 4 angka. | Bagus sebagai MVP, tapi belum ada visual model berhitung. |
| Game 10 wrong flow | `index.html:5728-5738` | Jika salah, musuh langsung menyerang dan HP player turun. | Untuk anak 5-9, ini lebih punitive daripada scaffolded learning. |
| Game 10 patch tambahan | `index.html:6073-6092` | `window.g10Answer` dipatch lagi untuk shake/HP update. | Ada monkey patch global; rawan urutan load dan sulit debug. |
| Settings sound/vibrate | `index.html:4353-4375`, `4567-4571`, `6098`, `6104` | Setting disimpan, tapi `playTone()` dan haptic langsung jalan tanpa cek setting. | Toggle OFF tidak benar-benar mematikan semua audio/haptic. |
| Share button | `index.html:3017` | `shareGame && shareGame()` memakai identifier yang belum tentu terdefinisi. | Bisa ReferenceError saat klik jika `shareGame` tidak dideklarasikan. |
| Game 9 duplicate pause | `index.html:3619-3620` | Ada dua tombol pause berurutan. | UI terlihat tidak polished. |
| Data bahasa | `index.html:3716` | Huruf F memakai kata `FROG`. | Bertentangan dengan target tanpa bahasa Inggris. Harus diganti `FLAMINGO`, `FOTO`, atau hewan Indonesia lain. |
| Data mismatch | `index.html:3730` | Emoji kura-kura dipasangkan dengan kata `ULAT`. | Anak belajar asosiasi salah. |
| Service worker | `index.html:6028-6035` | SW dibuat dari Blob dan cache hanya path `'/Apps/dunia-emosi/index.html'`. | Offline support belum benar untuk asset/game route, dan path hard-coded. |

## Kekuatan Yang Sudah Ada

### 1. Pokemon Hook Sudah Tepat Untuk Motivasi

Game 10 sudah punya struktur battle Pokemon: player Pokemon, enemy Pokemon, HP box, type badge, attack FX, question panel, answer button. Ini bukan sekadar tema tempelan. Secara desain, anak yang suka Pokemon akan paham "jawab soal untuk menyerang" tanpa instruksi panjang.

Yang bagus secara source:

- `POKEMON_DB` sudah cukup besar dan memuat id, name, slug, type.
- `TYPE_COLORS` dan `TYPE_EMOJI` sudah ada, jadi efek tipe bisa dikembangkan.
- `pokeSprite()` sudah memakai asset lokal lebih dulu.
- `g10RenderHp()` sudah punya status HP mid/low.
- `g10DoAttack()` sudah memisahkan visual attack dari jawaban.

### 2. Sistem 20 Level Sudah Ada

`openLevelSelect()` dan `startGameWithLevel()` sudah mendukung 20 level. Ini cocok dengan kebutuhan user: level bukan usia kaku, tetapi interpretasi kemampuan. Anak 5 tahun bisa mencoba level tinggi kalau mampu.

Masalahnya bukan ide level. Masalahnya mapping kesulitan masih terlalu kasar, dan UI selector saat ini tersembunyi.

### 3. Variasi Game Banyak

Ada 12 game: emosi, napas, huruf, hitung, memory, drive spelling, image-word, susun kata, trace huruf, Pokemon math battle, sains, tebak bayangan. Ini aset desain yang bagus karena anak 5-9 cepat bosan jika hanya satu mekanik.

### 4. Beberapa Feedback Dekoratif Sudah Ada

Ada confetti, sparkle, star fly, flash, HP bar, attack animation. Ini jangan dihapus. Yang kurang adalah "feedback belajar" di atas efek dekoratif itu.

Prinsipnya:

- Efek dekoratif tetap untuk emosi menang.
- Feedback belajar harus menjawab: "Aku salah di mana?", "Langkah benar berikutnya apa?", "Kenapa jawaban ini benar?"

## Masalah Kritis Yang Harus Dibenahi Dulu

### P0 - Level Selector Kosong Karena CSS Mematikan Elemen

Evidence:

- CSS menyembunyikan `.level-progress-row`, `.level-tiers`, `.level-game-banner` di `index.html:2328-2329`.
- JS `openLevelSelect()` tetap mengisi elemen-elemen itu di `index.html:4068-4114`.

Dampak:

- Anak memilih game, lalu masuk layar level yang bisa terlihat kosong.
- Semua sistem 20 level tidak terasa ada.
- Ini menghambat semua game, bukan hanya Pokemon.

Spesifikasi perbaikan:

```css
/* Minimal unblock, scoped hanya screen level */
#screen-level.active .level-progress-row,
#screen-level.active .level-tiers {
  display: flex !important;
}

#screen-level.active .level-game-banner {
  display: grid !important;
}
```

Spesifikasi premium setelah unblock:

- `#screen-level` punya layout 3 area: game banner, skill path, level grid.
- Level 1-20 tidak hanya dot. Pakai `button.level-node`.
- Setiap node punya state:
  - `locked`
  - `available`
  - `completed-1star`
  - `completed-2star`
  - `completed-3star`
  - `recommended`
- Untuk Game 10, tiap tier punya nama:
  - Level 1-5: Pemula - Tambah sampai 10
  - Level 6-10: Trainer - Tambah/kurang sampai 15
  - Level 11-15: Gym - missing number dan strategi puluhan
  - Level 16-20: Champion - multi-step ringan, pattern, mental math

### P0 - `playSound` Tidak Ada Tetapi Dipanggil Game 10/11/12

Evidence:

- `g10Answer()` memanggil `playSound(ok?'correct':'wrong')` di `index.html:5715`.
- `g11Answer()` memanggil `playSound(...)` di `index.html:5942`.
- `g12Answer()` memanggil `playSound(...)` di `index.html:6018`.
- Yang tersedia: `playCorrect()`, `playWrong()`, `playClick()` di `index.html:4569-4571`.

Dampak:

- Setelah anak menjawab di Game 10, flow bisa putus dengan ReferenceError.
- Ini merusak flagship Pokemon dan dua game tambahan.

Spesifikasi perbaikan minimal:

```js
function playSound(kind) {
  if (localStorage.getItem('dunia-emosi-sound') === 'off') return;
  if (kind === 'correct') return playCorrect();
  if (kind === 'wrong') return playWrong();
  return playClick();
}
```

Spesifikasi lebih baik:

- Buat `AudioDirector`:
  - `AudioDirector.correctSmall()`
  - `AudioDirector.correctBig()`
  - `AudioDirector.wrongSoft()`
  - `AudioDirector.attack(type)`
  - `AudioDirector.lowHp()`
- Semua fungsi audio cek `dunia-emosi-sound` sebelum membuat oscillator.

### P0 - Game 10 Salah Langsung Dihukum, Belum Mengajar

Evidence:

- Di `index.html:5728-5738`, jawaban salah langsung menjalankan enemy counter attack dan HP player turun.

Dampak belajar:

- Anak umur 5-9 butuh scaffold. Salah pertama seharusnya menghasilkan hint, bukan hukuman penuh.
- Kalau anak belum mengerti konsep, mereka bisa merasa "Pokemon-ku kalah karena aku bodoh", bukan "aku belajar strategi".

Spesifikasi flow baru:

1. Anak memilih jawaban.
2. Jika benar:
   - tombol benar menyala
   - math model memperlihatkan grouping/counting selama 500-900 ms
   - Pokemon player menyerang
   - HP enemy turun
   - lanjut soal
3. Jika salah percobaan pertama:
   - tidak ada enemy attack
   - tombol salah shake
   - munculkan hint visual: "Coba hitung kelompok pertama dulu."
   - answer button tetap aktif kecuali tombol salah dibuat disabled
4. Jika salah percobaan kedua:
   - tampilkan step-by-step model
   - contoh: `7 + 5`: tampilkan 7 orb kuning, 5 orb biru, lalu gabungkan jadi 12
   - anak boleh memilih lagi
5. Jika salah percobaan ketiga:
   - baru enemy attack kecil
   - HP turun 1
   - tetap tampilkan jawaban benar dan penjelasan

State yang perlu ditambah:

```js
g10State.currentProblem = {
  a: 7,
  b: 5,
  op: '+',
  ans: 12,
  strategy: 'make10',
  attempts: 0,
  wrongValues: []
}
```

### P0 - Background Battle Hilang

Evidence:

- CSS `index.html:1489` memuat `assets/bg-pokemon-battle.webp`.
- Browser menunjukkan request asset ini gagal.

Dampak:

- Field battle tidak terlihat premium; fallback hanya gradient.

Spesifikasi perbaikan:

- Tambahkan asset lokal dengan path persis `assets/bg-pokemon-battle.webp`, atau ganti CSS ke asset yang benar-benar ada.
- Jangan remote untuk background utama. Untuk anak dan mobile, background harus reliable.
- Tambahkan fallback class:

```css
.g10-field.bg-missing::before {
  background:
    radial-gradient(circle at 80% 20%, rgba(255,255,255,.32), transparent 20%),
    linear-gradient(180deg,#6bbfee 0%,#a8d8f8 32%,#73bf55 48%,#3e7028 100%);
}
```

### P1 - Monkey Patch `window.g10Answer` Membuat Flow Sulit Diprediksi

Evidence:

- `g10Answer` didefinisikan di `index.html:5706`.
- Lalu dipatch lagi di `index.html:6073-6092`.

Dampak:

- Untuk debug anak menjawab salah/benar, ada dua lapis logic.
- Jika nanti `g10Answer` diubah menjadi multi-attempt learning, patch ini bisa menjalankan efek HP pada waktu yang salah.

Spesifikasi perbaikan:

- Gabungkan patch ke satu `g10Answer()` resmi.
- Pisahkan efek ke function:
  - `g10ApplyAnswerVisual(ok, btn)`
  - `g10ApplyLearningFeedback(ok, val)`
  - `g10ResolveBattleAction(ok)`
  - `g10UpdateBattleUI()`

### P1 - Settings Tidak Mengontrol Audio/Haptic Secara Konsisten

Evidence:

- Setting disimpan di `index.html:4353-4375`.
- `playTone()` langsung membuat oscillator di `index.html:4568`.
- Haptic langsung memanggil `navigator.vibrate` di `index.html:4331`, `6098`, `6104`.

Dampak:

- Orangtua bisa mematikan sound/vibrate, tetapi efek masih berjalan.
- Untuk anak sensitif sensorik, ini masalah UX.

Spesifikasi perbaikan:

```js
function isSoundOn() {
  return localStorage.getItem('dunia-emosi-sound') !== 'off';
}

function isVibrateOn() {
  return localStorage.getItem('dunia-emosi-vibrate') !== 'off';
}

function vibrate(pattern) {
  if (!isVibrateOn()) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}
```

Semua call `navigator.vibrate(...)` harus lewat wrapper `vibrate(...)`.

## Prioritas Pertama: Pokemon Battle Menjadi Flagship Learning Game

### Nilai Positif Game 10 Saat Ini

Game 10 adalah aset paling kuat di project ini karena:

- Anak yang hobi Pokemon langsung punya alasan emosional untuk menjawab soal.
- Visual loop battle sudah masuk: sprite, HP, tipe, attack.
- Data Pokemon sudah cukup besar.
- Level sudah bisa diskalakan via `selectedLevelNum`.
- Soal math sudah berada di tempat yang benar: question panel bawah seperti "battle command".

Game 10 tidak perlu dibuang. Yang perlu dilakukan adalah mengubahnya dari "quiz dengan kulit Pokemon" menjadi "battle belajar matematika dengan scaffolding".

### Masalah Desain Belajar Saat Ini

Current loop:

```text
lihat soal -> pilih angka -> benar: serang, salah: diserang -> soal baru
```

Loop yang lebih tepat untuk anak 5-9:

```text
lihat soal -> coba strategi -> pilih angka
  -> benar: validasi cara hitung -> serang -> reward
  -> salah pertama: hint ringan -> coba lagi
  -> salah kedua: visualisasi langkah -> coba lagi
  -> salah ketiga: jawaban dibuka + enemy attack kecil -> lanjut
```

Kenapa ini penting:

- Anak kecil butuh immediate feedback, tapi bukan sekadar benar/salah.
- "Salah" harus menjadi momen belajar, bukan langsung kegagalan.
- Efek battle tetap ada, tetapi battle action harus mengikuti pembelajaran.

### Struktur DOM Yang Perlu Ditambah Di Game 10

Tambahkan layer belajar di dalam `.g10-qpanel`, bukan mengganti battle field.

Usulan struktur:

```html
<div class="g10-qpanel">
  <div class="g10-round-row">...</div>
  <div class="g10-atk-lbl" id="g10-atk-lbl"></div>
  <div class="g10-math-wrap">
    <div class="g10-math" id="g10-math"></div>
    <div class="g10-model" id="g10-model" aria-live="polite"></div>
  </div>
  <div class="g10-hint" id="g10-hint"></div>
  <div class="g10-choices" id="g10-choices"></div>
  <div class="g10-explain" id="g10-explain"></div>
</div>
```

CSS behavior:

- `g10-model` default height tetap, supaya layout tidak loncat saat hint muncul.
- `g10-hint` punya state `empty`, `soft`, `model`, `solution`.
- `g10-explain` hanya muncul setelah jawaban benar atau setelah attempt ketiga.
- Gunakan fixed height/min-height:

```css
.g10-model { min-height: 52px; display:flex; justify-content:center; align-items:center; gap:6px; }
.g10-hint { min-height: 28px; text-align:center; font-weight:800; }
.g10-explain { min-height: 34px; font-size:14px; line-height:1.25; }
```

### Math Model Renderer Untuk Game 10

Saat ini `g10GenQuestion()` hanya menyimpan `s.currentAnswer`. Perlu menyimpan problem lengkap:

```js
function g10SetProblem(a, b, op) {
  const ans = op === '+' ? a + b : a - b;
  g10State.currentProblem = {
    a, b, op, ans,
    attempts: 0,
    wrongValues: [],
    strategy: pickMathStrategy(a, b, op, g10State.levelNum)
  };
  g10State.currentAnswer = ans; // tetap untuk compat lama
}
```

Renderer:

```js
function renderMathModel(problem, mode) {
  if (problem.op === '+') return renderAdditionModel(problem, mode);
  return renderSubtractionModel(problem, mode);
}
```

Mode:

- `hidden`: tidak tampil saat soal pertama muncul.
- `hint`: tampilkan dua kelompok tanpa jawaban.
- `count`: animasi count satu per satu.
- `solve`: tampilkan jawaban dan grouping.

Contoh untuk `7 + 5`:

```text
[7 orb kuning] + [5 orb biru]
hint 1: "Hitung dari 7: 8, 9, 10, 11, 12"
hint 2: "7 butuh 3 untuk jadi 10, sisa 2, jadi 12"
```

Contoh untuk `13 - 6`:

```text
[13 orb] -> coret 6 -> sisa 7
hint 1: "Mulai dari 13, mundur 6 langkah"
hint 2: "13 - 3 = 10, lalu -3 lagi = 7"
```

### Integrasi Tipe Pokemon Dengan Strategi Belajar

Jangan hanya memakai type untuk warna/emoji serangan. Jadikan type sebagai gaya latihan. Ini membuat Pokemon terasa bermakna secara gameplay.

| Type | Strategi Belajar | Contoh Soal | Feedback Visual |
|---|---|---|---|
| Electric | quick count / mental math cepat | `6 + 2`, `9 + 1` | angka menyala seperti charge, count cepat |
| Water | grouping puluhan | `8 + 5`, `14 - 6` | orb mengalir masuk ke wadah 10 |
| Fire | subtraction / take away | `12 - 4` | flame kecil membakar 4 token, sisa token dihitung |
| Grass | growth sequence | `2, 4, 6, ?` | daun tumbuh per pola |
| Psychic | missing number | `? + 5 = 12` | angka misteri dibuka bertahap |
| Rock/Ground | place value | `10 + 7`, `20 - 3` | blok puluhan dan satuan |
| Ice | slow focus | soal sulit diberi freeze timer dan hint lebih lama | tombol jawaban muncul bertahap |

Implementasi:

```js
function pickMathStrategyByType(type, levelNum, op) {
  if (type === 'water') return 'make10';
  if (type === 'fire') return 'takeAway';
  if (type === 'psychic' && levelNum >= 11) return 'missingNumber';
  if (type === 'grass' && levelNum >= 8) return 'sequence';
  return op === '+' ? 'countOn' : 'countBack';
}
```

### Level Matrix Game 10 Yang Lebih Tepat Untuk Usia 5-9

Jangan mapping level hanya ke `easy/medium/hard`. Untuk Game 10, level perlu punya object config sendiri.

```js
const G10_LEVELS = {
  1:  { max:5,  ops:['+'], model:'always', attemptsBeforeDamage:3, distractor:'far' },
  2:  { max:6,  ops:['+'], model:'afterWrong', attemptsBeforeDamage:3, distractor:'near' },
  3:  { max:8,  ops:['+'], model:'afterWrong', attemptsBeforeDamage:3, distractor:'near' },
  4:  { max:10, ops:['+'], model:'afterWrong', attemptsBeforeDamage:2, strategy:'countOn' },
  5:  { max:10, ops:['+'], model:'afterWrong', attemptsBeforeDamage:2, strategy:'make10Intro' },
  6:  { max:10, ops:['-'], model:'afterWrong', attemptsBeforeDamage:3, strategy:'takeAway' },
  7:  { max:12, ops:['+','-'], model:'afterWrong', attemptsBeforeDamage:2 },
  8:  { max:15, ops:['+'], strategy:'make10', attemptsBeforeDamage:2 },
  9:  { max:15, ops:['-'], strategy:'countBack', attemptsBeforeDamage:2 },
  10: { max:15, ops:['+','-'], mixed:true, attemptsBeforeDamage:2 },
  11: { max:20, ops:['+'], missingNumber:true, attemptsBeforeDamage:2 },
  12: { max:20, ops:['-'], missingNumber:true, attemptsBeforeDamage:2 },
  13: { max:20, ops:['+','-'], twoStepLite:true, attemptsBeforeDamage:2 },
  14: { max:20, ops:['+','-'], timer:'soft', attemptsBeforeDamage:2 },
  15: { max:20, ops:['+','-'], noModelFirst:true, attemptsBeforeDamage:1 },
  16: { max:30, ops:['+'], placeValue:true, attemptsBeforeDamage:2 },
  17: { max:30, ops:['-'], placeValue:true, attemptsBeforeDamage:2 },
  18: { max:30, ops:['+','-'], pattern:true, attemptsBeforeDamage:1 },
  19: { max:40, ops:['+','-'], challenge:true, attemptsBeforeDamage:1 },
  20: { max:50, ops:['+','-'], boss:true, attemptsBeforeDamage:1 }
}
```

Untuk anak 5 yang mampu, dia boleh main level tinggi. Yang berubah adalah scaffold:

- kalau akurasi rendah, hint muncul lebih cepat.
- kalau akurasi tinggi, hint dikurangi.
- ini lebih baik daripada memaksa umur.

### Adaptive Learning Untuk Game 10

Tambahkan attempt tracking:

```js
g10State.skillStats = {
  addWithin10: { correct:0, wrong:0, streak:0 },
  subWithin10: { correct:0, wrong:0, streak:0 },
  make10: { correct:0, wrong:0, streak:0 },
  missingNumber: { correct:0, wrong:0, streak:0 }
};
```

Saat anak salah:

```js
recordSkillAttempt(problem.strategy, false);
```

Saat anak benar:

```js
recordSkillAttempt(problem.strategy, true);
```

Aturan adaptasi:

- 3 benar beruntun: naikkan distractor near, kurangi visual model.
- 2 salah pada skill sama: munculkan model sejak awal untuk 2 soal berikutnya.
- Jika salah pada operasi minus terus, pakai `takeAway` visual, bukan ganti ke soal random.

### Answer Button Yang Lebih Edukatif

Saat ini 4 pilihan angka dekat jawaban. Ini bagus, tapi distractor harus diagnosis miskonsepsi.

Untuk `8 + 5 = 13`, distractor jangan random saja:

- `12`: off-by-one
- `10`: berhenti di puluhan
- `14`: count terlalu jauh
- `3`: salah operasi minus

Generator:

```js
function getDiagnosticDistractors(problem) {
  const {a,b,op,ans} = problem;
  if (op === '+') return uniqueValid([ans-1, ans+1, 10, Math.abs(a-b)]);
  return uniqueValid([ans-1, ans+1, a+b, b]);
}
```

Manfaat:

- Kalau anak pilih `a+b` pada soal minus, feedback bisa spesifik: "Kamu menjumlahkan, padahal tanda ini minus."
- Kalau anak off-by-one, feedback: "Hitunganmu hampir benar, coba cek satu langkah terakhir."

### Battle Feedback Timeline

Gunakan timeline agar terasa AAA dan tidak acak:

```text
0 ms      Button answer pressed
80 ms     Button squash + sound click
180 ms    Correct/wrong state
350 ms    Learning model appears
900 ms    If correct: Pokemon attack windup
1200 ms   Attack impact + HP drain
1600 ms   Stars/XP micro reward
1900 ms   Next question transition
```

Untuk wrong first attempt:

```text
0 ms      Wrong button pressed
120 ms    Wrong shake
300 ms    Hint panel appears
700 ms    Wrong button disabled, other buttons remain
No HP loss
```

### Pokemon Pool Untuk Anak

Source sekarang memilih random dari `POKEMON_DB`. Ini memberi variasi, tetapi untuk anak yang hobi Pokemon, favorite recognition lebih penting daripada random penuh.

Spesifikasi:

```js
const G10_FAVORITE_POOL = [
  'pikachu','charmander','bulbasaur','squirtle',
  'eevee','jigglypuff','snorlax','mewtwo',
  'lucario','greninja','charizard'
];
```

Level 1-5:

- Player Pokemon pilih dari favorite pool.
- Enemy juga dari pool yang recognizable.

Level 6-15:

- Tambah Pokemon tipe berbeda.

Level 16-20:

- Boss pool: Dragon, Legendary, final stage.

Teknis:

```js
function pickPokemonForLevel(levelNum, side) {
  const pool = levelNum <= 5 ? favoritePool :
               levelNum <= 15 ? midPool :
               bossPool;
  return weightedRandom(pool, side === 'player' ? 'favorite' : 'challenge');
}
```

### Legal/IP Note

Kalau game ini hanya untuk penggunaan pribadi anak, Pokemon hook bisa jadi sangat efektif. Kalau targetnya publik, Steam, App Store, atau web umum, asset/nama Pokemon tidak boleh dipakai tanpa lisensi. Solusi profesionalnya:

- Private build: tetap Pokemon untuk anak sendiri.
- Public build: buat "monster battle learning" dengan creature original yang terinspirasi struktur koleksi/battle, bukan menyalin Pokemon.

## Sistem Feedback Belajar Yang Harus Dibuat

Saat ini feedback global `showFeedback()` di `index.html:4454-4464` bersifat motivasional. Itu bagus untuk emosi, tetapi belum mengajar langkah.

Buat layer baru: `LearningFeedbackDirector`.

### Struktur Data Attempt

```js
const attempt = {
  game: 10,
  level: 8,
  skill: 'make10',
  prompt: '8 + 5 = ?',
  correctAnswer: 13,
  selectedAnswer: 12,
  isCorrect: false,
  attemptNumber: 1,
  misconception: 'offByOne',
  responseMs: 4200
};
```

### API Yang Disarankan

```js
const LearningFeedback = {
  showHint(attempt) {},
  showModel(problem, mode) {},
  showMisconception(attempt) {},
  showCorrectReason(problem) {},
  clear() {}
};
```

### Misconception Detector

```js
function detectMathMisconception(problem, selected) {
  const {a,b,op,ans} = problem;
  if (selected === ans - 1 || selected === ans + 1) return 'offByOne';
  if (op === '-' && selected === a + b) return 'usedAddition';
  if (op === '+' && selected === Math.abs(a - b)) return 'usedSubtraction';
  if (selected === a || selected === b) return 'usedOperand';
  return 'unknown';
}
```

Feedback text harus pendek dan anak-friendly:

- `offByOne`: "Hampir. Coba hitung satu langkah lagi."
- `usedAddition`: "Tandanya minus. Kita ambil sebagian, bukan tambah."
- `usedSubtraction`: "Tandanya plus. Dua kelompok digabung."
- `usedOperand`: "Itu salah satu angka soal. Jawabannya jumlah/sisa setelah dihitung."

### Feedback Belajar Harus Lebih Banyak Dari Dekorasi

Yang dipertahankan:

- confetti
- sparkle
- HP drain
- attack FX
- screen flash
- star fly

Yang ditambah:

- visual model
- hint bertahap
- salah spesifik
- jawaban benar dengan alasan
- retry tanpa hukuman langsung
- progress skill, bukan hanya bintang

Rasio ideal:

- 40% visual reward
- 60% learning feedback

Untuk anak 5-9, reward membuat mau lanjut, tetapi learning feedback membuat kemampuan naik.

## Audit UI/UX Teknis Per Area

### App Shell

Masalah:

- Semua screen memakai `.screen` global dengan `min-height:100vh`, padding global, lalu game tertentu override dengan fixed/absolute.
- Banyak style inline di HTML game 11/12.
- CSS override tersebar: ada style awal, dark override, mobile override, dan patch akhir.

Spesifikasi arsitektur UI:

```css
.game-screen {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr;
}

.game-hud {
  height: var(--hud-h);
  display: grid;
  grid-template-columns: 44px 1fr auto 44px;
  align-items: center;
}

.game-stage {
  min-height: 0;
  display: grid;
}

.learning-panel {
  min-height: 120px;
}
```

Tujuan:

- Header konsisten di semua game.
- Stage dan panel belajar punya ukuran stabil.
- Tidak ada tombol yang muncul ganda.
- Mobile pakai `100dvh`, bukan hanya `100vh`.

### Desktop Layout

Observasi browser:

- Game 1 dan Game 4 di desktop terlihat banyak ruang kosong.
- Game 8 desktop punya elemen kiri/center yang tidak proporsional dan tombol "Hapus" terlalu dominan.
- Game 9 desktop canvas kiri, ruang kanan kosong.

Spesifikasi:

- Desktop game non-fullscreen pakai `grid-template-columns: minmax(360px, 520px) minmax(360px, 560px)`.
- Sisi kiri untuk visual/stage.
- Sisi kanan untuk question, choices, feedback.
- Mobile collapse menjadi satu kolom.
- Jangan pakai `max-width:480px` untuk semua bagian desktop; bedakan mobile dan desktop.

Contoh:

```css
@media (min-width: 820px) {
  .edu-game-layout {
    display:grid;
    grid-template-columns:minmax(360px,520px) minmax(380px,560px);
    gap:24px;
    align-items:center;
    width:min(1120px, calc(100vw - 48px));
    margin-inline:auto;
  }
}
```

### Mobile Layout

Masalah:

- `user-scalable=no` membatasi zoom.
- Beberapa button/tile besar tetapi tidak selalu memperhatikan safe-area.
- Fixed screen untuk Game 10 bagus untuk battle, tapi perlu `dvh` dan safe-area.

Spesifikasi:

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

#screen-game10 {
  min-height: 100dvh;
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
}
```

Ubah viewport:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

## Audit Per Game Saat Ini

### Game 1 - Aku Merasa

Kekuatan:

- Topik social-emotional cocok untuk anak.
- `EMOTIONS` punya tip per emosi di `index.html:3697-3707`.
- Feedback setelah answer sudah menunjukkan tip di `index.html:4634-4635`.

Kelemahan teknis:

- Anak hanya memilih nama emosi dari ekspresi. Belum ada konteks "kenapa merasa begitu".
- Wrong answer hanya flash merah dan lanjut setelah 2.4 detik.
- Tip muncul, tetapi tidak mengikat ke aksi belajar yang bisa dilakukan anak.

Spesifikasi improve:

- Tambahkan `scenario` ke setiap emotion:

```js
{ name:'Marah', scenario:'Mainanmu direbut teman.', bodyCue:'Wajah panas, tangan mengepal', safeAction:'Tarik napas 3 kali lalu bilang: aku tidak suka.' }
```

- UI round:
  - stage: karakter dengan ekspresi
  - context card: kejadian pendek
  - choices: 3-6 emosi
  - after answer: `Kenapa?`, `Tubuh terasa?`, `Aksi aman?`

- Wrong feedback:
  - jangan langsung lanjut.
  - tampilkan "Coba lihat alis/mulutnya" atau "Di cerita ini dia kehilangan mainan."

### Game 2 - Napas Pelangi

Kekuatan:

- Cocok untuk self-regulation anak.
- Ada `breatheCycles` di difficulty.

Kelemahan:

- Lebih seperti latihan animasi, belum ada game feel yang kuat.
- Tidak perlu dibuat kompetitif; harus calming.

Spesifikasi improve:

- Tambahkan `breathPhaseState`:
  - `inhale`
  - `hold`
  - `exhale`
  - `rest`
- Visual:
  - orb/karakter membesar saat inhale
  - mengecil saat exhale
  - progress petal per cycle
- Feedback:
  - bukan benar/salah
  - "Pelan, ikuti lingkaran"
  - "Bagus, napas keluar lebih panjang"

### Game 3 - Huruf Hutan / Metadata Mismatch

Kekuatan:

- Data huruf-hewan tersedia.
- Ada age tier helper `getAgeLetters()` di `index.html:3940-3943`.

Kelemahan teknis:

- `GAME_INFO` line `4027` mendeskripsikan game 3 sebagai memory emosi, padahal metadata menu tampaknya mengarah ke game huruf.
- Data `FROG` di `index.html:3716` tidak sesuai target tanpa English.
- Anak bisa menerima asosiasi bahasa yang tidak diinginkan.

Spesifikasi improve:

- Samakan `GAME_META`, `GAME_INFO`, tile title, dan actual game.
- Ganti data:
  - `FROG` -> `FLAMINGO` atau `FOTO` kalau bukan hewan.
  - Pastikan semua kata Indonesia.
- Feedback per huruf:
  - jika salah pilih huruf, tampilkan bunyi awal: "A... Ayam. Mulai dengan A."
  - highlight huruf pertama pada kata.

### Game 4 - Hitung Binatang / Pokemon Count Mode

Kekuatan:

- Ada Pokemon mode di `g4State.pokemonMode`.
- `renderG4Content()` sudah bisa render target Pokemon dan distractor di `index.html:4791-4808`.

Kelemahan teknis:

- Anak langsung memilih angka; belum ada interaksi menghitung objek satu per satu.
- Distractor Pokemon dibuat opacity 0.75, tapi belum ada "target finder" yang jelas.
- Timer bisa memberi pressure sebelum anak memahami cara menghitung.

Spesifikasi improve:

- Untuk level 1-5, wajib tap objek untuk menghitung:

```js
g4State.countedIds = new Set();
g4State.tapCount = 0;
```

- Setiap target Pokemon diberi `data-target="true"` dan `data-counted="false"`.
- Saat tap target:
  - muncul angka kecil `1`, `2`, `3`
  - item masuk state `counted`
  - counter panel update
- Tombol jawaban disabled sampai anak minimal tap semua target pada level awal.
- Untuk level 6+, anak boleh langsung jawab, tapi tombol "Bantu Hitung" tersedia.

### Game 5 - Memory

Kekuatan:

- Memory cocok untuk anak dan relatif ringan.
- Feedback benar/salah sudah ada.

Kelemahan:

- Kalau tujuan kalistung, memory perlu membawa konten belajar, bukan hanya matching.

Spesifikasi improve:

- Pair bukan hanya emoji sama:
  - angka `5` dengan lima objek
  - huruf `A` dengan `AYAM`
  - kata `IBU` dengan gambar keluarga
- Setelah match:
  - tampilkan micro explanation: "5 cocok dengan lima benda."

### Game 6 - Drive Spelling

Kekuatan:

- Ini salah satu game paling game-like: mobil, lane, obstacle, target letter.
- `spawnDriveTileRow()` sudah punya target/obstacle/decoy di `index.html:4994-5010`.

Kelemahan teknis:

- Target letter spawn chance fixed 50%.
- Wrong decoy bisa reset progress dari awal di `index.html:5053-5062`.
- Untuk anak 5-6, reset semua huruf bisa terasa terlalu keras.

Spesifikasi improve:

- Spawn scheduler jangan pure random. Gunakan queue:

```js
g6State.spawnPlan = [
  {type:'target', letter:needed, lane:hintLane},
  {type:'decoy', letter:nearLetter},
  {type:'obstacle'}
];
```

- Level 1-5:
  - target lane glow 700 ms sebelum tile turun.
  - salah hanya kehilangan 1 star/slowdown, bukan reset kata.
- Level 6-10:
  - wrong letter menghapus huruf terakhir, bukan semua.
- Level 11+:
  - baru boleh reset current word untuk challenge.

Feedback belajar:

- Saat butuh huruf `A`, slot A berdenyut.
- Decoy yang salah menampilkan: "Kita butuh A untuk A-Y-A-M."
- Setelah kata selesai, mobil melewati signboard berisi kata dan gambar.

### Game 7 - Gambar-Kata

Kekuatan:

- Cocok untuk reading vocabulary.

Kelemahan:

- Jika hanya pilih gambar/kata, feedback belum menekankan phonics/suku kata.

Spesifikasi improve:

- Split kata ke suku kata:
  - `KU-DA`
  - `A-YAM`
  - `I-KAN`
- Saat jawaban benar:
  - highlight suku kata satu per satu.
- Saat salah:
  - tampilkan clue awal: "Kata ini mulai dengan K."

### Game 8 - Susun Kata

Kekuatan:

- Logic tap letter sudah jelas.
- `g8TapLetter()` mengecek huruf sesuai posisi di `index.html:5189-5204`.

Kelemahan teknis:

- Interaksi hanya tap sesuai urutan. Belum drag/drop, belum ada active slot yang jelas.
- Wrong letter hanya flash slot dan sound.
- Tombol "Hapus" terlihat terlalu dominan di desktop dari inspeksi browser.

Spesifikasi improve:

- Tambahkan `activeSlotIndex`.
- Slot aktif punya outline/glow.
- Letter bisa tap atau drag.
- Wrong letter feedback:
  - "Huruf pertama K, bukan B."
  - highlight huruf yang benar selama 600 ms.
- Backspace button:
  - jadikan icon kecil di sebelah slot, bukan bar besar.

State:

```js
g8State = {
  currentWord: 'KUDA',
  activeSlotIndex: 0,
  userInput: [],
  attemptsBySlot: [0,0,0,0]
};
```

### Game 9 - Jejak Huruf

Kekuatan:

- `LETTER_GUIDES` lengkap A-Z.
- Canvas trace sudah ada.
- `evaluateG9Trace()` memberi skor bintang berdasarkan hit ratio.

Kelemahan teknis:

- `checkGuideHits()` di `index.html:5274-5277` menandai dot sebagai hit jika dekat, tanpa urutan stroke.
- `evaluateG9Trace()` di `index.html:5278-5293` menilai nearest distance ke semua dot, bukan path order dan stroke direction.
- Anak bisa mencoret acak dekat titik dan tetap mendapat skor lumayan.

Spesifikasi improve:

- Ubah `LETTER_GUIDES` menjadi stroke sequence:

```js
LETTER_STROKES.A = [
  [{x:.5,y:.05},{x:.2,y:.95}],
  [{x:.5,y:.05},{x:.8,y:.95}],
  [{x:.35,y:.55},{x:.65,y:.55}]
];
```

- Tambahkan:

```js
g9State.currentStroke = 0;
g9State.currentDot = 0;
g9State.offPathCount = 0;
```

- Hit detection harus sequential:
  - dot berikutnya aktif.
  - dot setelahnya belum bisa hit.
  - kalau anak keluar path, tampilkan gentle redirect arrow.

Feedback:

- "Mulai dari atas."
- "Tarik garis ke bawah kiri."
- "Sekarang garis kanan."
- "Terakhir garis tengah."

Ini meniru prinsip LetterSchool: feedback visual/audio saat anak butuh bantuan, bukan hanya skor akhir.

### Game 10 - Pokemon Battle

Sudah dibahas detail sebagai prioritas utama. Tambahan teknis:

- `g10GenQuestion()` harus menghasilkan problem object, bukan hanya text dan answer.
- `g10Answer()` harus support multi-attempt.
- `g10DoAttack()` hanya dipanggil setelah learning feedback selesai.
- `g10RenderHp()` harus menjadi satu-satunya sumber update HP; hindari patch duplicate.
- Sprite loading harus punya placeholder skeleton.
- Background battle harus lokal dan ada.

### Game 11 - Kuis Sains

Kekuatan:

- Data pertanyaan tiered `tk`, `cilik`, `tumbuh`, `pintar`.
- Mapping level 1-5, 6-10, 11-15, 16-20 sudah ada di `index.html:5902-5908`.

Kelemahan teknis:

- `playSound` undefined seperti Game 10.
- Feedback salah hanya highlight correct, lalu lanjut 1 detik.
- Untuk sains, anak butuh alasan singkat.

Spesifikasi improve:

- Tambahkan field `explain` pada `SCIENCE_QUESTIONS`.

```js
{ q:'Ikan tinggal di mana?', ans:1, explain:'Ikan bernapas dan bergerak di air.' }
```

- Wrong flow:
  - highlight correct
  - tampilkan explanation 2 detik
  - tombol "Lanjut" untuk anak lambat membaca, bukan auto 1 detik

### Game 12 - Tebak Bayangan

Kekuatan:

- Deskripsi verbal melatih pemahaman baca.
- Pilihan emoji sederhana untuk anak.

Kelemahan teknis:

- `playSound` undefined.
- Jika salah, semua revealed tetapi tidak ada clue parsing.
- Beberapa item punya jawaban yang ambigu secara edukasi, contoh "Hewan kecil kuning-hitam penghasil madu" jawabannya madu, bukan lebah (`index.html:5974`).

Spesifikasi improve:

- Jawaban harus objek/hewan, bukan produk, kecuali pertanyaan eksplisit "menghasilkan apa".
- Tambahkan clue chunk:

```js
{ desc:'Hewan kecil kuning-hitam yang menghasilkan madu', ans:'lebah', emoji:'bee', clueParts:['kecil','kuning-hitam','menghasilkan madu'] }
```

- Saat salah:
  - highlight clue yang paling membedakan.
  - "Yang menghasilkan madu adalah lebah."

## Variasi Game Tambahan Pokemon-Style Yang Lebih Menarik

User meminta 3-6 variasi tambahan. Saya sarankan 6, tetapi implementasi bisa bertahap. Semuanya fokus belajar, bukan monetisasi.

### 1. Pokemon Catch Math

Target belajar:

- Penjumlahan/pengurangan 1-20.
- Number sense dan quick recognition.

Core loop:

```text
Pokemon liar muncul -> soal math muncul -> anak pilih Pokeball angka -> benar: bola dilempar -> Pokemon tertangkap -> masuk Pokedex
```

State:

```js
catchState = {
  encounterPokemon,
  problem,
  attempts,
  catchMeter,
  collection: loadCollection()
};
```

UI:

- Field rumput full screen.
- Pokemon muncul dengan idle animation.
- 4 Pokeball angka di bawah.
- Hint button: "Bantu Hitung".

Feedback belajar:

- Salah pertama: Pokeball goyang tapi tidak dilempar.
- Hint muncul dengan orb count.
- Benar: throw arc, shake 3 kali, catch.

Difficulty:

- Level 1-5: addition <= 10, model selalu tersedia.
- Level 6-10: subtraction <= 15.
- Level 11-15: mixed operations.
- Level 16-20: missing number / boss catch.

Kenapa menarik:

- Anak tidak hanya menang battle, tapi mengoleksi Pokemon.
- Cocok dengan hobi Pokemon dan memberi alasan replay tanpa monetisasi.

### 2. Pokemon Evolution Lab

Target belajar:

- Urutan angka, skip counting, pattern, membaca instruksi pendek.

Core loop:

```text
Pokemon butuh energi evolusi -> anak menyusun crystal angka/pola -> energi penuh -> Pokemon evolve
```

Contoh challenge:

- `2, 4, 6, ?`
- `5, 10, 15, ?`
- `Pilih angka yang lebih besar`
- `Urutkan 3, 1, 2`

State:

```js
evoState = {
  basePokemon,
  evolutionTarget,
  pattern,
  slots,
  placedValues,
  energy: 0
};
```

Feedback belajar:

- Crystal salah tidak hilang; dia memantul ke tray.
- Hint: "Polanya tambah 2."
- Setelah benar, energy beam mengisi evolution meter.

AAA adoption:

- Dari Pokemon: evolution sebagai emotional reward.
- Dari Mario Wonder: transformasi visual sebagai payoff.

### 3. Pokemon Gym Math Challenge

Target belajar:

- Skill mastery per operasi.
- Anak merasa naik ranking tanpa perlu monetisasi.

Core loop:

```text
Pilih Gym type -> lawan 3 trainer -> boss gym -> dapat badge belajar
```

Gym examples:

- Electric Gym: tambah cepat <= 10.
- Water Gym: make 10.
- Fire Gym: subtraction.
- Grass Gym: sequence.
- Psychic Gym: missing number.
- Rock Gym: place value.

State:

```js
gymState = {
  gymType,
  trainerIndex,
  badgeProgress,
  skillStats
};
```

Feedback belajar:

- Setiap gym punya tutor line pendek.
- Boss tidak hanya lebih sulit, tapi menuntut strategi gym itu.

Teknis:

- Bisa reuse `g10DoAttack()`, `g10RenderHp()`, `MathModelRenderer`.
- Ini membuat investasi Game 10 reusable.

### 4. Pokedex Detective Reading

Target belajar:

- Membaca kata/kalimat pendek bahasa Indonesia.
- Vocabulary dan clue comprehension.

Core loop:

```text
Professor memberi clue -> anak baca clue -> pilih Pokemon yang cocok -> Pokedex entry terbuka
```

Contoh:

- "Aku berwarna kuning. Aku punya listrik. Aku berkata pika." -> Pikachu
- Untuk public non-licensed build: pakai creature original.

State:

```js
dexState = {
  clueParts,
  revealedClues,
  choices,
  attempts
};
```

Feedback belajar:

- Salah: highlight kata kunci yang belum diperhatikan.
- Benar: kata kunci menyala dan entry terbuka.

Teknis:

- Reuse Game 12 clue parsing.
- Tambahkan `readAloud` optional memakai Web Speech API jika parent mengaktifkan.

### 5. Pokemon Rescue Runner

Target belajar:

- Huruf awal, suku kata, spelling cepat.

Core loop:

```text
Pokemon tersesat di jalan -> anak mengumpulkan huruf/suku kata dengan runner lane -> kata lengkap -> Pokemon diselamatkan
```

Ini evolusi Game 6.

State:

```js
rescueState = {
  targetWord,
  targetSyllables,
  collected,
  lane,
  speed,
  rescueMeter
};
```

Feedback belajar:

- Jika butuh suku kata `KU`, lane `KU` glow.
- Salah: "Kita butuh KU untuk KU-DA."
- Benar: Pokemon mendekat/tersenyum.

Teknis:

- Reuse Game 6 road engine.
- Tambah scheduler, bukan random pure.

### 6. Pokemon Camp Care

Target belajar:

- Kalistung campuran: counting, reading short command, emotion care.

Core loop:

```text
Pokemon di camp butuh makan/mandi/istirahat -> anak membaca instruksi -> hitung item -> beri item yang tepat -> Pokemon happy
```

Contoh task:

- "Beri 3 berry."
- "Pilih berry merah."
- "Pikachu sedih. Pilih aksi yang baik."
- "Susun kata: B-O-L-A."

State:

```js
campState = {
  activePokemon,
  needs: ['hungry','sad','sleepy'],
  task,
  inventory,
  affection
};
```

Feedback belajar:

- Salah jumlah: item kembali ke tray, counter visual muncul.
- Salah aksi emosi: karakter memberi hint "Kalau sedih, kita hibur pelan-pelan."
- Benar: affection meter naik, Pokemon idle animation berubah.

Kenapa penting:

- Ini menyeimbangkan battle yang kompetitif dengan care loop yang hangat.
- Cocok untuk anak kecil dan bisa menggabungkan Game 1 emosi.

## Roadmap Implementasi Teknis

### Tahap 1 - Unblock dan Stabilkan

| Task | File Area | Alasan | Acceptance Criteria |
|---|---|---|---|
| Tampilkan level selector lagi | `index.html:2328-2329` | Semua game bergantung pada level select | Setelah pilih game, banner, progress, dan 20 level terlihat di mobile/desktop |
| Tambah `playSound` adapter | dekat audio functions `index.html:4566-4571` | Game 10/11/12 error saat answer | Klik jawaban tidak menimbulkan ReferenceError |
| Fix missing battle background | `index.html:1489` atau asset path | Visual Game 10 flagship | Network tidak 404 untuk background battle |
| Hapus duplicate pause Game 9 | `index.html:3619-3620` | Polish UI | Hanya satu pause button tampil |
| Fix data bahasa | `index.html:3716`, `3730` | Target tidak English, asosiasi benar | Tidak ada `FROG`; turtle tidak dipasangkan dengan `ULAT` |
| Fix share button guard | `index.html:3017` | Hindari ReferenceError | Klik Bagikan tidak crash walau shareGame belum ada |

### Tahap 2 - Pokemon Battle Learning Upgrade

| Task | Area | Acceptance Criteria |
|---|---|---|
| Ubah problem ke object | `g10GenQuestion()` | `g10State.currentProblem` berisi `a,b,op,ans,strategy,attempts` |
| Multi-attempt answer flow | `g10Answer()` | Salah pertama/kedua memberi hint; enemy attack baru sesuai config |
| Tambah math visual model | DOM/CSS `.g10-model` | Addition/subtraction tampil sebagai token/orb |
| Diagnostic distractors | answer generator | Wrong feedback bisa menyebut jenis kesalahan |
| Type-based strategy | level/problem generator | Pokemon type mempengaruhi jenis soal/feedback |
| Remove monkey patch | `index.html:6073-6092` | `g10Answer()` hanya satu jalur resmi |

### Tahap 3 - Feedback Belajar Reusable

| Task | Acceptance Criteria |
|---|---|
| `LearningFeedbackDirector` | Bisa dipakai Game 4, 8, 9, 10, 11, 12 |
| Attempt logging local | localStorage menyimpan skill stats ringan |
| Hint text per misconception | Salah tidak hanya "wrong", tapi spesifik |
| Parent progress view | Orangtua tahu skill mana yang kuat/lemah |

### Tahap 4 - UI/UX AAA Pass

| Task | Acceptance Criteria |
|---|---|
| Unified HUD | Semua game punya back/title/player/pause/stars konsisten |
| Desktop 2-column layout | Game 1/4/8/9 tidak kosong sebelah |
| Mobile safe-area | Tidak ada tombol terpotong notch/nav bar |
| Stable panel heights | Hint/feedback tidak membuat layout loncat |
| Asset loading skeleton | Sprite/background tidak blank saat loading |

### Tahap 5 - Tambah Variasi Pokemon-Style

Urutan saya sarankan:

1. Pokemon Catch Math - paling cepat karena reuse Game 10 math dan sprites.
2. Pokemon Evolution Lab - reward visual kuat.
3. Pokemon Gym Math Challenge - progression jangka panjang.
4. Pokedex Detective Reading - reading comprehension.
5. Pokemon Rescue Runner - reuse Game 6.
6. Pokemon Camp Care - gabungkan kalistung dan emosi.

## Testing Yang Harus Dilakukan Setelah Perbaikan

### Browser Functional

- Mobile width 360, 390, 430.
- Tablet width 768.
- Desktop width 1366, 1440.
- Chrome/Chromium dan Firefox.

### Game 10 Test Cases

| Case | Expected |
|---|---|
| Level 1 answer benar | Pokemon player attack, HP enemy turun, no console error |
| Level 1 salah pertama | Hint muncul, HP player tidak turun |
| Level 1 salah ketiga | Jawaban benar ditunjukkan, enemy attack boleh terjadi |
| Sound OFF | Tidak ada tone |
| Vibrate OFF | Tidak ada haptic |
| Sprite missing | fallback tampil tanpa infinite error |
| Background missing | fallback visual tetap premium, console tidak banjir |

### Learning Test With Child

Catat:

- Apakah anak tahu apa yang harus dilakukan tanpa dibacakan?
- Ketika salah, apakah anak bisa memperbaiki pada attempt berikutnya?
- Apakah anak ingin replay karena Pokemon/catch/evolution, bukan karena dipaksa?
- Apakah orangtua bisa melihat skill yang perlu dilatih?

## Definisi "AAA For Kids" Untuk Project Ini

Untuk project ini, "AAA" bukan berarti budget besar atau 3D berat. Definisi yang realistis:

1. Tidak ada blocker/crash di flow utama.
2. Game feel kuat: animasi, sound, impact, timing, polish.
3. Feedback belajar spesifik dan membantu anak memperbaiki jawaban.
4. Visual stabil di mobile dan desktop.
5. Progress anak terasa bermakna tanpa monetisasi.
6. Tema Pokemon dipakai sebagai motivasi belajar, bukan hanya dekorasi.
7. Level 1-20 benar-benar berbeda secara skill, bukan hanya easy/medium/hard.

## Prioritas Akhir Yang Paling Penting

Jika hanya punya waktu pendek, lakukan ini dulu:

1. Fix level selector kosong.
2. Fix `playSound` undefined.
3. Fix Game 10 wrong flow menjadi hint-first.
4. Tambah visual math model di Game 10.
5. Fix missing `bg-pokemon-battle.webp`.
6. Buat diagnostic distractor dan misconception feedback.

Setelah itu, baru polish dekorasi, transisi, dan variasi game baru.

Kesimpulan saya: fondasi game ini sudah punya arah yang benar, terutama karena Pokemon Battle bisa menjadi hook belajar yang sangat kuat untuk anak yang sedang hobi Pokemon. Tetapi supaya menjadi game edukasi premium, dekorasi tidak cukup. Game perlu mengajari anak saat salah, menunjukkan cara berpikir saat benar, dan membuat setiap serangan Pokemon terasa sebagai hasil dari pemahaman matematika.
