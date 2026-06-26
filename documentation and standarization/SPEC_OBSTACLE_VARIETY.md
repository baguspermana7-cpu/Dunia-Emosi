Saya ingin Anda mengembangkan gameplay game balapan kereta agar tidak monoton. Saat ini gameplay jangan hanya berupa kereta berjalan lurus di beberapa lane lalu pemain hanya pindah lane untuk menghindari rintangan. Saya ingin gameplay dibuat lebih variatif, interaktif, edukatif, dan menyenangkan untuk anak usia 4–7 tahun.

Game ini harus tetap sederhana, mudah dimainkan, smooth, aman untuk anak, dan tidak membuat frustrasi. Target pemain adalah anak kecil, jadi semua mekanik harus intuitive, visual jelas, animasi halus, reward menyenangkan, dan failure tidak terlalu menghukum.

## 1. Main Objective

Bangun sistem gameplay obstacle yang lebih kaya untuk game balapan kereta anak-anak.

Gameplay harus menggabungkan:

1. Lane switching sederhana.
2. Mini puzzle drag-and-drop.
3. Rintangan interaktif berbasis pertanyaan.
4. Reaction challenge ringan.
5. Collectible challenge.
6. Repair track challenge.
7. Jump / bridge / tunnel / fire obstacle.
8. Station task mini-event.
9. Educational question challenge.
10. Fun cinematic obstacle sequence.

Game harus terasa seperti petualangan kereta, bukan sekadar endless runner biasa.

## 2. Target Player

Target pemain:

* Anak usia 4–7 tahun.
* Bisa bermain dengan bantuan orang tua/kakak.
* Belum tentu bisa membaca cepat.
* Harus bisa memahami mekanik dari visual, warna, bentuk, suara, dan animasi.
* Harus mendapat reward positif walaupun salah.

Design rules:

* Jangan terlalu sulit.
* Jangan butuh refleks terlalu cepat.
* Gunakan bentuk besar, warna jelas, animasi lembut.
* Gunakan voice prompt / icon prompt.
* Gunakan feedback positif:

  * “Good try!”
  * “Almost!”
  * “Great job!”
  * “You fixed the track!”
  * “Let’s try again!”

## 3. Gameplay Core Loop

Core loop game:

1. Kereta berjalan otomatis.
2. Pemain mengumpulkan item positif:

   * Bintang
   * Koin
   * Tiket
   * Gear
   * Batu bara / energy
   * Badge stasiun
3. Pemain menghadapi obstacle.
4. Obstacle bisa diselesaikan dengan:

   * Pindah lane
   * Drag-and-drop bentuk
   * Menjawab pertanyaan
   * Tap timing
   * Pilih jalur benar
   * Matching warna/bentuk
   * Menyusun rel
5. Jika berhasil:

   * Kereta lanjut dengan animasi menyenangkan.
   * Ada sound effect positif.
   * Pemain mendapat reward.
6. Jika gagal:

   * Tidak langsung game over.
   * Kereta melambat.
   * Muncul bantuan visual.
   * Pemain diberi kesempatan ulang.
   * Gunakan soft fail, bukan hukuman keras.

## 4. Jangan Hanya Lane Switching

Lane switching tetap boleh ada, tapi jangan menjadi satu-satunya mekanik.

Lane switching digunakan untuk:

* Menghindari batu kecil
* Menghindari cone
* Mengambil collectible
* Memilih rel kiri/tengah/kanan
* Menghindari genangan air
* Menghindari crate
* Memilih jalur cepat atau aman

Namun obstacle utama harus lebih bervariasi.

## 5. Obstacle Type 1 — Missing Rail Shape Puzzle

Konsep:
Di depan kereta, rel tiba-tiba hilang sebagian. Kereta otomatis berhenti dengan animasi smooth. Pemain harus memperbaiki rel dengan memilih bentuk track yang sesuai.

Contoh:

* Rel hilang berbentuk segitiga.
* Ada 3–4 pilihan potongan rel:

  * Segitiga
  * Lingkaran
  * Persegi
  * Bintang
* Pemain drag-and-drop bentuk yang benar ke area rel yang kosong.

Gameplay:

1. Kereta mendekati bagian rel rusak.
2. Kamera zoom ringan ke area rel.
3. Kereta berhenti dengan animasi lembut.
4. Area kosong menyala / glowing.
5. Muncul pilihan bentuk besar di bawah layar.
6. Anak drag bentuk ke slot yang sesuai.
7. Jika benar:

   * Potongan rel masuk dengan animasi snap.
   * Rel menyala.
   * Kereta bunyi “toot toot!”
   * Kereta lanjut jalan.
8. Jika salah:

   * Bentuk memantul balik.
   * Muncul hint warna/outline.
   * Tidak ada hukuman keras.
   * Beri kesempatan ulang.

Variasi bentuk:

* Segitiga
* Persegi
* Lingkaran
* Setengah lingkaran
* Panah
* Jembatan kecil
* Rel lurus
* Rel belok kiri
* Rel belok kanan
* Rel naik / ramp
* Rel turun
* Rel silang sederhana

Difficulty scaling:

* Level awal: 2 pilihan.
* Level sedang: 3 pilihan.
* Level lanjut: 4 pilihan.
* Untuk usia 4–5 tahun, gunakan outline bentuk yang sangat jelas.
* Untuk usia 6–7 tahun, boleh tambahkan rotasi ringan, tapi tetap mudah.

## 6. Obstacle Type 2 — Fire Jump Challenge

Konsep:
Ada rintangan api kecil di depan rel. Pemain harus menjawab pertanyaan sederhana agar kereta mendapat power untuk melompati api.

Important:
Api harus dibuat kartun, tidak menakutkan, tidak realistis berbahaya. Gunakan warna cerah, ekspresi playful, dan visual aman untuk anak.

Gameplay:

1. Kereta mendekati api kecil.
2. Kereta melambat.
3. Muncul pertanyaan sederhana.
4. Jika pemain menjawab benar:

   * Kereta mendapat “jump power”.
   * Kereta melompat melewati api dengan animasi lucu.
   * Ada sparkle, trail, dan sound effect.
5. Jika salah:

   * Kereta berhenti sebelum api.
   * Api mengecil.
   * Muncul hint.
   * Pemain boleh coba lagi.

Contoh pertanyaan:

* “Which shape is a triangle?”
* “Which number is 3?”
* “Which color is red?”
* “Count the stars: 1, 2, or 3?”
* “Which animal says meow?”
* “Which track piece fits here?”

Visual:

* Api kecil seperti obstacle kartun.
* Bisa ada firefighter NPC / station helper yang memberi semangat.
* Saat berhasil, kereta melompat dengan pose happy.

## 7. Obstacle Type 3 — Broken Bridge Repair

Konsep:
Kereta menemukan jembatan yang belum lengkap. Pemain harus memasang 1–3 bagian jembatan agar kereta bisa lewat.

Gameplay:

1. Jembatan terlihat putus.
2. Kereta berhenti.
3. Muncul potongan jembatan.
4. Pemain drag-and-drop potongan ke posisi benar.
5. Jika benar, jembatan tersambung.
6. Kereta lewat pelan dengan animasi aman.
7. Setelah lewat, muncul reward.

Variasi:

* 1 missing bridge block
* 2 missing bridge blocks
* Color matching bridge
* Shape matching bridge
* Number order bridge: 1 → 2 → 3

Educational value:

* Shape recognition
* Sequence
* Problem solving
* Fine motor interaction

## 8. Obstacle Type 4 — Tunnel Gate Question

Konsep:
Kereta masuk area tunnel, tapi pintu tunnel hanya terbuka jika pemain memilih jawaban benar.

Gameplay:

1. Tunnel gate tertutup.
2. Muncul pertanyaan visual.
3. Pemain pilih jawaban.
4. Jika benar:

   * Pintu tunnel terbuka.
   * Lampu tunnel menyala.
   * Kereta masuk tunnel.
5. Jika salah:

   * Gate tetap tertutup.
   * Muncul hint.
   * Beri kesempatan ulang.

Variasi pertanyaan:

* Pilih warna yang benar.
* Pilih angka yang benar.
* Cocokkan gambar.
* Pilih huruf awal.
* Pilih arah panah.

Tunnel experience:

* Di dalam tunnel, visual berubah sementara:

  * Lampu tunnel berurutan
  * Echo sound
  * Speed boost ringan
  * Coin trail
* Saat keluar tunnel, background berubah ke area baru.

## 9. Obstacle Type 5 — Falling Rocks / Landslide

Konsep:
Ada batu jatuh di rel. Pemain harus memilih aksi:

* Pindah lane
* Tap untuk membunyikan klakson
* Jawab pertanyaan agar helper crane memindahkan batu
* Drag batu ke samping dengan gesture sederhana

Gameplay variation:

1. Small rock:

   * Hindari dengan pindah lane.
2. Big rock:

   * Kereta berhenti.
   * Pemain drag rock ke area aman.
3. Multiple rocks:

   * Pilih jalur aman.
4. Educational version:

   * Pilih angka/warna yang benar agar crane mengangkat batu.

Visual:

* Batu berbentuk kartun.
* Tidak boleh terlihat berbahaya/menakutkan.
* Gunakan helper character seperti crane, excavator, atau maintenance team.

## 10. Obstacle Type 6 — Water Puddle / Flooded Track

Konsep:
Ada genangan air di rel. Pemain harus memilih solusi.

Gameplay options:

* Pilih lane yang kering.
* Tap pump icon untuk menguras air.
* Drag wooden plank / temporary bridge.
* Jawab pertanyaan agar drain terbuka.

Visual:

* Air biru kartun.
* Splash kecil saat dilewati.
* Jika berhasil, kereta lewat dengan aman.
* Jika gagal, kereta melambat dan cipratan lucu muncul.

Educational angle:

* Cause-effect
* Matching tool to problem
* Environmental awareness

## 11. Obstacle Type 7 — Signal Light Challenge

Konsep:
Kereta mendekati sinyal. Pemain harus memahami warna sinyal.

Gameplay:

* Red = stop
* Yellow = slow
* Green = go

Mini challenge:

1. Muncul sinyal warna.
2. Pemain harus tap tombol sesuai:

   * Stop
   * Slow
   * Go
3. Jika benar, kereta mengikuti instruksi.
4. Jika salah, game memberi correction dengan voice prompt.

Untuk anak:

* Gunakan ikon:

  * Tangan stop
  * Kura-kura untuk slow
  * Panah go
* Jangan terlalu cepat.

## 12. Obstacle Type 8 — Cargo Sorting Challenge

Konsep:
Di stasiun, kereta harus mengantar cargo ke wagon yang benar.

Gameplay:

1. Kereta berhenti di stasiun.
2. Muncul 3 wagon dengan simbol:

   * Buah
   * Mainan
   * Surat
   * Hewan
   * Bentuk
   * Warna
3. Pemain drag cargo ke wagon yang cocok.
4. Jika benar, wagon menyala dan mendapat reward.

Variasi:

* Sort by color
* Sort by shape
* Sort by number
* Sort by object category
* Sort by destination station

Contoh:

* Apel ke wagon makanan.
* Bola merah ke wagon merah.
* Angka 3 ke wagon “3”.
* Segitiga ke wagon segitiga.

## 13. Obstacle Type 9 — Animal Crossing

Konsep:
Ada hewan lucu menyeberang rel. Pemain harus membantu kereta berhenti atau membunyikan bell.

Gameplay:

1. Hewan muncul di depan.
2. Pemain tap bell atau brake button.
3. Kereta berhenti.
4. Hewan lewat dengan aman.
5. Pemain mendapat kindness badge.

Hewan:

* Kucing
* Anjing
* Bebek
* Sapi
* Kambing
* Burung

Safety message:

* Ajarkan “stop and wait”.
* Tidak boleh menampilkan tabrakan.
* Selalu safe and friendly.

## 14. Obstacle Type 10 — Windy Bridge Balance

Konsep:
Kereta melewati jembatan dengan angin. Pemain harus menjaga balance sederhana.

Gameplay:

* Ada meter balance kiri-kanan.
* Pemain tap kiri/kanan perlahan agar kereta tetap stabil.
* Untuk anak kecil, toleransi harus besar.
* Bisa juga dibuat sangat sederhana: pilih ikon “slow speed” agar aman lewat jembatan.

Visual:

* Angin berupa garis kartun.
* Jembatan besar.
* Background indah.
* Tidak menakutkan.

## 15. Obstacle Type 11 — Choose Correct Track

Konsep:
Rel bercabang ke 2–3 jalur. Pemain harus memilih jalur yang benar berdasarkan tanda.

Gameplay:

1. Muncul junction.
2. Ada signage:

   * Station A
   * Station B
   * Bonus route
   * Safe route
3. Pemain swipe/tap jalur.
4. Jika benar, kereta masuk jalur sesuai.
5. Jika salah, kereta masuk jalur pendek dan kembali ke main route tanpa game over.

Variasi edukasi:

* Pilih jalur dengan angka benar.
* Pilih jalur dengan warna benar.
* Pilih jalur menuju stasiun tujuan.
* Pilih jalur yang memiliki bentuk sama.

## 16. Obstacle Type 12 — Memory Sequence Track

Konsep:
Pemain melihat urutan warna/lampu, lalu harus mengulang urutan agar rel terbuka.

Gameplay:

1. Lampu rel berkedip: merah → biru → kuning.
2. Pemain tap ulang urutan.
3. Jika benar, gate terbuka.
4. Jika salah, ulangi dengan urutan lebih pendek.

Untuk anak 4–7:

* Maksimal 2 warna untuk awal.
* Maksimal 3–4 warna untuk level lanjut.
* Gunakan audio cue.

## 17. Obstacle Type 13 — Friendly Race Boost

Konsep:
Ada kereta teman yang muncul di samping. Pemain bisa mendapat boost dengan menyelesaikan mini question.

Gameplay:

1. Kereta teman muncul.
2. Muncul pertanyaan cepat:

   * “Which one is bigger?”
   * “Find number 5.”
   * “Pick the blue star.”
3. Jika benar, pemain mendapat speed boost.
4. Jika salah, tetap lanjut normal.

Ini bukan obstacle berbahaya, tapi variasi positif.

## 18. Obstacle Type 14 — Station Stop Mini Task

Konsep:
Saat sampai stasiun, pemain diberi tugas singkat sebelum lanjut.

Mini task examples:

* Pick up 3 passengers.
* Match ticket color.
* Load correct cargo.
* Find missing suitcase.
* Help passenger find platform.
* Clean leaves from track.
* Turn on station lights.
* Fix signal lamp.

Gameplay:

* Durasi pendek.
* Reward berupa badge, sticker, atau unlock background baru.
* Bisa jadi checkpoint antar area.

## 19. Obstacle Type 15 — Educational Question Gate

Konsep:
Rintangan tertentu hanya bisa dilewati setelah menjawab pertanyaan edukatif.

Kategori pertanyaan:

* Shape
* Color
* Number
* Counting
* Simple math
* Letter
* Animal
* Object matching
* Direction
* Safety behavior

Contoh:

* “How many stars do you see?”
* “Which one is circle?”
* “Pick the letter A.”
* “Which train is bigger?”
* “Which object is used when raining?”
* “What color is the signal for go?”

Difficulty:

* Age 4:

  * Colors, shapes, count 1–3.
* Age 5:

  * Count 1–5, simple matching.
* Age 6:

  * Count 1–10, simple addition 1+1, sequence.
* Age 7:

  * Easy math, pattern recognition, memory sequence.

## 20. Inspired-by Cartoon Train Adventure, Not Copy-Paste

Gameplay can be inspired by children train adventure shows and episodes, including scenarios like:

* Broken bridge
* Fire obstacle
* Muddy track
* Tunnel problem
* Cargo delivery
* Helping another train
* Animal crossing
* Station rush
* Track repair
* Stormy weather journey
* Lost cargo
* Signal problem
* Friendly race
* Mountain track
* River crossing

Important:
Do not copy exact copyrighted story, character, dialogue, episode scene, music, logo, or asset. Use original fictional implementation inspired by general train adventure themes.

## 21. Obstacle System Architecture

Create modular obstacle engine.

Each obstacle should have data config:

```json
{
  "obstacleId": "missing_track_shape_triangle_01",
  "type": "drag_drop_track_repair",
  "difficulty": 1,
  "ageRange": "4-7",
  "allowedLocations": ["surabaya", "jakarta", "bandung", "tokyo"],
  "allowedJourneyPhases": ["urban_exit", "countryside", "approaching_station"],
  "requiredAction": "drag_and_drop",
  "questionRequired": false,
  "timeLimit": null,
  "softFail": true,
  "maxRetry": 3,
  "reward": {
    "coins": 5,
    "badgeProgress": 1,
    "sound": "success_chime"
  },
  "visual": {
    "cameraZoom": true,
    "highlightMissingSlot": true,
    "snapAnimation": true,
    "successSparkle": true
  },
  "accessibility": {
    "voicePrompt": true,
    "largeTouchTarget": true,
    "reducedMotionOption": true
  }
}
```

## 22. Obstacle Categories

Implement these categories:

1. Avoidance obstacle

   * Lane switch
   * Jump
   * Duck/low bridge if suitable

2. Repair obstacle

   * Missing rail
   * Broken bridge
   * Signal repair
   * Tunnel light repair

3. Question obstacle

   * Answer to open gate
   * Answer to jump obstacle
   * Answer to activate crane/helper

4. Drag-and-drop obstacle

   * Track shape
   * Cargo sorting
   * Bridge block
   * Tool matching

5. Timing obstacle

   * Tap bell
   * Tap brake
   * Tap jump boost
   * Tap signal

6. Route choice obstacle

   * Choose correct branch
   * Choose safe path
   * Choose destination

7. Helper event

   * Help other train
   * Help passenger
   * Help animal
   * Help station staff

## 23. Input Design

Controls must be easy:

* Swipe left/right for lane.
* Tap for jump/bell/brake.
* Drag-and-drop for puzzle.
* Tap answer card for question.
* Long press should be avoided for young children unless optional.
* No complex multi-touch requirement.
* Touch targets must be large.

Input feedback:

* Object grows slightly when touched.
* Drag object follows finger smoothly.
* Valid slot glows.
* Wrong slot gives soft bounce.
* Correct slot gives magnetic snap.
* Use sound cue for touch, drag, snap, success.

## 24. Animation Requirement

All interactions must feel smooth and joyful.

Required animations:

* Kereta slow down before puzzle.
* Camera zoom-in slightly during puzzle.
* Track piece snap into place.
* Bridge repair assembly.
* Fire jump arc.
* Tunnel gate opening.
* Signal light changing.
* Cargo sliding into wagon.
* NPC cheering.
* Reward stars flying to score.
* Train happy bounce after success.
* Gentle fail animation, not scary.

Animation style:

* Rounded
* Soft easing
* Child-friendly
* No harsh shake
* No scary crash
* No sudden loud effects

## 25. Failure Design

Do not use hard fail too often.

Soft fail examples:

* Kereta berhenti aman.
* Helper character muncul.
* Rintangan memberi hint.
* Pemain coba lagi.
* Jawaban salah diberi correction.
* Setelah 2–3 kali salah, sistem bisa auto-help.

Never:

* Jangan tampilkan crash besar.
* Jangan tampilkan kereta rusak parah.
* Jangan tampilkan karakter terluka.
* Jangan buat anak merasa gagal.

Use:

* “Try again!”
* “Almost there!”
* “Let’s fix it together!”
* “The triangle goes here!”

## 26. Reward System

Rewards:

* Stars
* Coins
* Stickers
* Train parts
* Station badges
* Character cheers
* Unlock background theme
* Unlock train color
* Unlock horn sound
* Unlock route postcard

Reward must be frequent:

* Small reward every obstacle.
* Bigger reward every station.
* Badge reward every route.
* Collection reward for replay.

Example:

* Fix 5 tracks → Track Repair Badge.
* Help 3 animals → Kind Helper Badge.
* Complete Surabaya route → Surabaya Explorer Badge.
* Answer 10 shape questions → Shape Master Sticker.

## 27. Difficulty Scaling

Difficulty must adapt slowly.

Level 1:

* Mostly lane switch.
* 2-choice shape puzzle.
* No time pressure.
* Very clear hints.

Level 2:

* 3-choice drag-and-drop.
* Simple question gate.
* Easy cargo sorting.

Level 3:

* 4-choice puzzle.
* Light timing challenge.
* Simple sequence memory.

Level 4:

* Mixed obstacle chain.
* Route selection.
* More complex station task.

Adaptive rules:

* If player fails twice, reduce difficulty.
* If player succeeds repeatedly, add slight variety.
* For age 4–5, keep assist mode active.
* For age 6–7, allow challenge mode.

## 28. Example Gameplay Sequence — Surabaya Route

Create complete gameplay sample for Surabaya level.

Scene:

* Surabaya sunset light rain.
* Kereta keluar dari area urban menuju stasiun.
* Background shows Surabaya-inspired cityscape, wet rails, station lights, NPC with umbrella.

Sequence:

1. Start

   * Kereta berjalan di 3 lane.
   * Pemain collect stars.

2. Small obstacle

   * Ada crate kecil di lane tengah.
   * Pemain swipe ke kiri/kanan.

3. Missing rail puzzle

   * Rel depan hilang berbentuk segitiga.
   * Kereta berhenti.
   * Pemain drag potongan segitiga ke slot.
   * Rel tersambung.
   * Kereta lanjut.

4. Fire obstacle

   * Api kecil muncul di rel.
   * Muncul pertanyaan: “Which shape is triangle?”
   * Pemain pilih jawaban benar.
   * Kereta mendapat jump power dan melompati api.

5. Signal challenge

   * Sinyal merah muncul.
   * Pemain tap tombol stop.
   * Sinyal berubah hijau.
   * Kereta lanjut.

6. Animal crossing

   * Kucing menyeberang.
   * Pemain tap bell/brake.
   * Kucing lewat aman.
   * Pemain mendapat kindness star.

7. Station task

   * Kereta sampai stasiun Surabaya-inspired.
   * Pemain bantu memasukkan 3 cargo ke wagon sesuai warna.
   * Setelah selesai, muncul badge “Surabaya Helper”.

8. End

   * Kereta keluar stasiun.
   * Background berubah ke petang/malam.
   * Pemain unlock next route.

## 29. Content Library Required

Buat minimal 20 obstacle types:

1. Small crate lane obstacle
2. Rock lane obstacle
3. Missing straight rail
4. Missing triangle rail
5. Missing bridge block
6. Fire jump question
7. Tunnel gate question
8. Signal red/yellow/green
9. Cargo sorting
10. Animal crossing
11. Water puddle
12. Flooded track pump
13. Choose correct branch
14. Memory light sequence
15. Friendly race boost
16. Station passenger pickup
17. Lost suitcase matching
18. Windy bridge slow mode
19. Muddy track cleaning
20. Helper crane rock removal

Each obstacle must include:

* Visual description
* Player action
* Success animation
* Fail behavior
* Reward
* Difficulty
* Suitable age
* Audio cue
* Asset requirement

## 30. Educational Integration

Obstacle must support educational questions without making the game feel like school.

Question types:

* Shape recognition
* Color recognition
* Counting
* Simple addition
* Pattern
* Memory
* Direction
* Object matching
* Safety behavior
* Emotional/social kindness

Question design:

* Use images more than text.
* Use voice prompt.
* Provide 2–4 answer choices.
* Use large cards.
* Use friendly feedback.
* Avoid long reading.

## 31. Safety and Child-Friendly Design

Mandatory:

* No scary crash.
* No realistic disaster.
* No intense fire.
* No injury.
* No aggressive enemy.
* No punishment-heavy design.
* No dark horror tone.
* Keep all obstacles playful, safe, and educational.

Fire, flood, rocks, and broken bridge must be cartoon-styled and framed as problem-solving adventure.

## 32. Technical Deliverables

Please produce:

1. Gameplay enhancement architecture.
2. Modular obstacle system design.
3. Obstacle JSON schema.
4. Input system design.
5. Drag-and-drop mechanic specification.
6. Question challenge mechanic.
7. Soft-fail and retry system.
8. Reward system.
9. Difficulty scaling system.
10. At least 20 obstacle definitions.
11. Full Surabaya route gameplay example.
12. UI/UX flow for each obstacle type.
13. Animation requirements.
14. Audio feedback requirements.
15. Accessibility settings.
16. Testing checklist.
17. Acceptance criteria.

## 33. Acceptance Criteria

This gameplay enhancement is accepted only if:

* Gameplay is not limited to straight lane switching.
* At least 20 obstacle variations exist.
* Missing rail drag-and-drop puzzle works smoothly.
* Fire jump question challenge works.
* Track repair, bridge repair, tunnel, signal, cargo, animal crossing, and station tasks are included.
* Game remains easy and enjoyable for children age 4–7.
* Failure is soft and supportive.
* Educational content is integrated naturally.
* Animations are smooth and child-friendly.
* Obstacle variety prevents boredom.
* Gameplay readability remains clear.
* Difficulty scales gradually.
* System is modular and extensible.
* New obstacles can be added by config, not hardcoding.
* The Surabaya route has a complete sample sequence.

## 34. Important Instruction

Do not create a boring endless runner where the player only moves left and right. Build this as a child-friendly interactive train adventure engine with varied obstacles, mini puzzles, questions, helper moments, station tasks, and joyful animations.

The final experience should feel like a fun train adventure where the child repairs tracks, helps passengers, solves simple questions, jumps over cartoon obstacles, chooses safe routes, and travels through beautiful stations and cities.

