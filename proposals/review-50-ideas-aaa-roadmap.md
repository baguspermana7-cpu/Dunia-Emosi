# Deep Review Roadmap - 50 Ide AAA Dunia Emosi

Tanggal review: 2026-06-21  
Sumber: `proposals/50-ideas-aaa.html`  
Scope: review roadmap dan prioritas eksekusi. Tidak mengubah file HTML proposal.

## Ringkasan Keputusan

Dokumen `50-ideas-aaa.html` bagus sebagai visi multi-tahun, tetapi belum tajam sebagai roadmap. Masalah utamanya: banyak ide membesarkan dunia, sosial, live ops, dan produksi sinematik sebelum core learning loop cukup kuat.

Untuk game anak 5-9 tahun, prioritas bukan "lebih besar dulu". Prioritas yang benar:

1. Anak mengerti saat salah.
2. Anak ingin mencoba lagi karena feedback belajar terasa membantu.
3. Orang tua bisa melihat progres skill.
4. Tema Pokemon/monster battle dipakai sebagai motivasi belajar, bukan hanya kosmetik.
5. Semua fitur online, AI, voice, kamera, dan monetisasi harus ditunda sampai safety/privacy jelas.

Rekomendasi saya: jangan pilih ide berdasarkan label AAA/AA/A di proposal. Pilih berdasarkan dampak ke pembelajaran dan feasibility terhadap existing game.

## Prinsip Roadmap Baru

### Build Sequence Yang Benar

Urutan implementasi yang sehat:

1. Stabilkan core game.
2. Tambah feedback belajar spesifik.
3. Tambah skill tracking dan mastery.
4. Tambah daily routine ringan.
5. Tambah 2D hub sebagai launcher yang hidup.
6. Baru tambah online/social/live ops.

Kalau urutan ini dibalik, app akan terlihat besar tetapi learning-nya tetap dangkal.

### Definition of Done Untuk Fitur AAA Anak

Sebuah ide layak masuk roadmap jika memenuhi minimal 4 dari 6:

| Kriteria | Pertanyaan |
|---|---|
| Learning impact | Apakah anak belajar lebih baik, bukan hanya lebih lama main? |
| Short-session fit | Apakah bisa selesai dalam 3-8 menit? |
| Parent-safe | Apakah aman tanpa chat, publik profile, monetisasi, atau data sensitif? |
| Existing game fit | Apakah bisa memakai game yang sudah ada? |
| Pokemon hook | Apakah memanfaatkan hobi anak tanpa membuat dependency IP berbahaya? |
| MVP feasible | Apakah bisa dibuat versi kecil dalam 1-4 minggu? |

## Top 12 Roadmap Yang Saya Pilih

Urutan ini adalah rekomendasi eksekusi, bukan urutan ide di HTML.

| Rank | Ide Asal | Keputusan | Kenapa Masuk |
|---:|---|---|---|
| 1 | #42 Mastery Trees per Subject | Build now | Ini fondasi semua progress belajar. Tanpa ini, XP/bintang hanya reward umum. |
| 2 | #26 ML Adaptive Curriculum | Reshape jadi rule-based adaptive | Jangan mulai dari ML. Mulai dari attempt log + aturan sederhana. |
| 3 | #29 Handwriting Recognition | Reshape jadi stroke feedback MVP | Untuk Game 9, dampak learning besar. ML bisa belakangan. |
| 4 | #31 Daily Pokemon Training Routine | Build now, tanpa punishment | Retention aman dan relevan dengan Pokemon hobby. |
| 5 | #16 Parent-Kid Co-Op Quiz | Build soon | Aman, edukatif, dan cocok untuk anak kecil. |
| 6 | #38 Server-Pushed Daily Quests | Reshape jadi local daily quests dulu | Bisa membuat anak balik tanpa server. |
| 7 | #1 Open-World Hub "Pulau Emosi" | Reshape jadi 2D hub map MVP | Cocok sebagai launcher, tapi jangan 3D open world dulu. |
| 8 | #39 Trainer Level + Prestige | Build soon, non-FOMO | Bagus sebagai meta progress jika skill mastery sudah ada. |
| 9 | #44 Adaptive Music | Build light version | Polish tinggi, bisa kecil: layer music based on state. |
| 10 | #45 Cinematic Sound Design | Build light version | G10 battle akan terasa jauh lebih premium. |
| 11 | #17 Asynchronous Gift System | Later, parent-approved | Bisa offline QR/text, tapi jangan prioritas sebelum mastery. |
| 12 | #6 Player Housing & Decoration | Later | Bagus untuk ownership anak, tapi setelah rewards bermakna. |

## Ide Yang Harus Diubah Sebelum Masuk Roadmap

### #1 Open-World Hub "Pulau Emosi"

Source: `50-ideas-aaa.html:555`

Proposal sekarang: 3D top-down open world dengan 5 zona, NPC, cuaca, day/night.

Masalah:

- Terlalu besar untuk fase awal.
- Tidak langsung memperbaiki feedback belajar.
- 3D menambah beban asset, perf mobile, pathing, camera, collision.

Versi roadmap yang benar:

```text
MVP: 2D Pulau Emosi map sebagai launcher hidup.
Zona: Hutan Huruf, Padang Hitung, Arena Monster Math, Taman Emosi, Bengkel Kata.
NPC: 1 mentor per zona.
Quest harian: localStorage, bukan server.
No free roaming dulu. Tap zona -> masuk game existing.
```

Acceptance criteria:

- Anak bisa pilih game dari peta, bukan menu list.
- Setiap zona menampilkan 1 rekomendasi latihan berdasarkan weak skill.
- Ada daily quest 3 item.
- Tidak ada online dependency.

### #26 ML Adaptive Curriculum

Source: `50-ideas-aaa.html:1038`

Proposal sekarang: ML model melihat pattern jawaban anak.

Masalah:

- ML terlalu dini.
- Data anak sensitif.
- Existing app belum punya clean attempt log.

Versi roadmap yang benar:

```text
Phase 1: rule-based adaptive learning.
Track attempt per skill.
Jika anak salah 2x pada skill sama, turunkan difficulty atau munculkan visual hint.
Jika benar 3x beruntun, naikkan challenge sedikit.
```

Data minimal:

```js
{
  playerId: "local-slot-1",
  gameId: 10,
  level: 4,
  skill: "addition_within_10",
  prompt: "7 + 5",
  answer: 12,
  selected: 11,
  correct: false,
  attemptNo: 1,
  misconception: "off_by_one",
  durationMs: 4200,
  timestamp: 1782010000000
}
```

Acceptance criteria:

- App bisa menyebut 3 skill terlemah.
- App bisa merekomendasikan level berikutnya.
- Hint muncul lebih cepat untuk skill yang sering salah.

### #29 Handwriting Recognition

Source: `50-ideas-aaa.html:1086`

Proposal sekarang: TF.js model recognize tulisan tangan.

Masalah:

- ML handwriting tidak perlu jadi fase pertama.
- Untuk anak 5-9, stroke order dan motorik lebih penting daripada klasifikasi huruf final.

Versi roadmap yang benar:

```text
MVP: stroke-order guide.
Anak harus mulai dari titik yang benar.
Dot berikutnya aktif satu per satu.
Jika keluar jalur, muncul arrow/hint.
Skor: start point, stroke order, path closeness, completeness.
```

Acceptance criteria:

- Anak tidak bisa asal coret semua dot untuk dapat skor tinggi.
- Feedback menyebut hal spesifik: "mulai dari atas", "garis tengah lebih panjang".

### #31 Daily Pokemon Training Routine

Source: `50-ideas-aaa.html:1133`

Proposal sekarang: Pokemon active perlu training, skip 3 hari = Pokemon sedih.

Masalah:

- Hukuman emosional bisa buruk untuk anak kecil.
- Jangan bikin anak merasa bersalah karena tidak login.

Versi roadmap yang benar:

```text
Daily Creature Training.
3 latihan pendek per hari: math, reading, calm breathing.
Jika skip, tidak ada punishment.
Saat balik, creature berkata: "Aku siap latihan lagi."
```

Acceptance criteria:

- Sesi selesai 3-5 menit.
- Reward berupa care meter, badge, atau decoration.
- Tidak ada streak shame.

### #35 Battle Pass

Source: `50-ideas-aaa.html:1212`

Keputusan: jangan implement sebagai battle pass.

Alasan:

- Bertentangan dengan arah tidak monetisasi.
- Untuk anak, premium track + FOMO daily missions berisiko.

Versi aman:

```text
Learning Journey Season.
Free only.
No paid tier.
No limited exclusive power.
Reward cosmetic, stickers, story pages.
Parent can disable daily prompts.
```

### #14, #15, #18 Multiplayer Competitive

Sources: `50-ideas-aaa.html:809`, `50-ideas-aaa.html:825`, `50-ideas-aaa.html:876`

Keputusan: parkir.

Alasan:

- Anak 5-9 + real-time social + leaderboard = safety risk.
- WebRTC bukan "no server cost" secara praktis; butuh signaling, reconnect, moderation, abuse handling.
- Competitive leaderboard bisa menggeser fokus dari belajar ke menang.

Versi aman jika nanti:

```text
Local family duel only.
Same device or same Wi-Fi.
No chat.
No public leaderboard.
Parent starts session.
```

### #25 LLM Companion

Source: `50-ideas-aaa.html:1022`

Keputusan: parkir sampai safety spec matang.

Alasan:

- Anak voice input + LLM butuh guardrail kuat.
- Perlu parent consent, logs policy, topic filter, no personal data.
- Biaya API dan failure mode tinggi.

Versi MVP yang aman:

```text
Scripted Professor, not LLM.
100 curated explanations for math, letters, emotion, science.
Only after stable, add parent-enabled LLM mode.
```

## Matrix Semua 50 Ide

| # | Ide | Keputusan | Roadmap Note |
|---:|---|---|---|
| 1 | Open-World Hub "Pulau Emosi" | Reshape | 2D hub map MVP dulu, bukan 3D open world. |
| 2 | Procedural Pokemon Habitat | Park | Terlalu jauh, tidak memperbaiki learning core. |
| 3 | Dynamic Weather + Day/Night | Later | Bisa local time only; hindari weather API dulu. |
| 4 | World-Changing Seasonal Events | Later | Event kecil seasonal, bukan live-event besar. |
| 5 | Pokemon Photo Safari | Park | Kamera/AI scoring/safety terlalu dini. |
| 6 | Player Housing | Later | Bagus untuk ownership, setelah reward economy jelas. |
| 7 | Living Dungeon Generator | Park | Procedural dungeon + leaderboard terlalu besar. |
| 8 | 20-Episode Story | Park | Produksi konten besar, bukan core learning. |
| 9 | Branching Narrative | Later | Bisa micro-choice di emotion game dulu. |
| 10 | Evolution Cinematic | Later | Buat 1 generic evolution animation, bukan per Pokemon. |
| 11 | Voice-cast Pokemon | Park | 1025 samples tidak realistis dan IP risk. |
| 12 | Backstory Cards | Later | Bagus untuk emotional learning, mulai static card. |
| 13 | Boss Reveal | Later | Buat lightweight CSS/canvas reveal untuk G10 boss. |
| 14 | Real-Time PvP | Avoid now | Child safety dan infra risk tinggi. |
| 15 | Guild Weekly Wars | Avoid now | Social/competition tidak cocok fase awal. |
| 16 | Parent-Kid Co-Op | Build soon | Aman, edukatif, high impact. |
| 17 | Async Gift | Later | Hanya parent-approved QR/text, no public friend graph. |
| 18 | Tournament | Avoid now | Competitive online tidak prioritas anak 5-9. |
| 19 | Mentor Mode | Later | Bagus, tapi bisa digabung dengan parent co-op. |
| 20 | Pokemon Designer Studio | Later | Ubah jadi original creature studio. |
| 21 | Quiz Creator Marketplace | Park | Marketplace/moderation terlalu besar. Local quiz creator bisa later. |
| 22 | Storyboard Builder | Park | Bagus kreatif, tapi scope besar. |
| 23 | Music Remix Studio | Park | Tidak terkait core kalistung. |
| 24 | G6 Level Designer | Later | Useful setelah G6 engine stabil. |
| 25 | LLM Companion | Park | Mulai scripted professor dulu. |
| 26 | ML Adaptive Curriculum | Build now reshaped | Rule-based adaptive learning dulu. |
| 27 | AI Bedtime Stories | Park | LLM child-safety dan cost. |
| 28 | Speech Recognition | Later | Bisa browser feature optional, parent-enabled. |
| 29 | Handwriting Recognition | Build soon reshaped | Stroke feedback dulu, ML belakangan. |
| 30 | Breeding System | Park | IP/mechanic kompleks, bukan core. |
| 31 | Daily Training | Build now | Tanpa punishment dan tanpa FOMO. |
| 32 | Trading Card Game | Park | Spin-off multi-tahun, bukan roadmap 12 bulan. |
| 33 | Career Mode | Later | Bisa jadi 8-week learning journey sederhana. |
| 34 | 3D Type Chart | Park | Tidak relevan untuk kalistung 5-9. |
| 35 | Battle Pass | Avoid as written | Ubah ke free learning journey. |
| 36 | Weekend Raids | Park | Time-gated FOMO + online/live ops. |
| 37 | Global Challenge | Park | Server/community metric terlalu dini. |
| 38 | Daily Quests | Build now reshaped | Local daily quest JSON/static first. |
| 39 | Trainer Level | Build soon | Harus terhubung ke mastery, bukan grind. |
| 40 | Pokedex Completionist | Later reshaped | Ubah rare spawn menjadi learning unlock. |
| 41 | Year-End Recap | Later | Bagus setelah telemetry lokal rapi. |
| 42 | Mastery Trees | Build now | Fondasi roadmap. |
| 43 | Orchestral Soundtrack | Park | Polish mahal, bukan bottleneck utama. |
| 44 | Adaptive Music | Build light | 2-3 layers per state cukup. |
| 45 | Cinematic Sound Design | Build light | SFX G10/G6 bisa cepat menaikkan feel. |
| 46 | Voice Cast Mascots | Park | Mulai dengan short mascot barks/TTS offline later. |
| 47 | Native Capacitor | Later | Setelah web app stabil. |
| 48 | AR Mode | Park | Kamera, privacy, platform complexity. |
| 49 | Cloud Save | Later | Mulai export/import local save dulu. |
| 50 | Smart TV Mode | Later | Bisa setelah responsive landscape solid. |

## Roadmap 0-90 Hari

### Sprint 0 - Audit dan Stabilitas (3-5 hari)

Goal: existing game tidak crash dan level/progress bisa dipercaya.

Deliverables:

1. Fix error runtime di game utama.
2. Pastikan level selector tampil dan 20 level bisa dipilih.
3. Pastikan sound/vibrate setting benar-benar bekerja.
4. Pastikan G10 Pokemon/monster math battle tidak error saat answer.
5. Pastikan save progress tidak rusak.

Acceptance criteria:

- Anak bisa main Game 4, 8, 9, 10 tanpa console error fatal.
- Orang tua bisa melihat progress minimal per game.
- Tidak ada asset critical 404 untuk screen utama.

### Sprint 1 - Learning Event System (1 minggu)

Goal: semua improvement learning punya data dasar.

Implementasi:

```js
const LearningEvents = {
  logAttempt(event) {},
  getSkillStats(playerId) {},
  getWeakSkills(playerId, limit = 3) {},
  recommendNext(playerId) {}
};
```

Skill taxonomy awal:

| Subject | Skill |
|---|---|
| Math | count_to_5, count_to_10, add_within_10, sub_within_10, make_10 |
| Reading | letter_sound, first_letter, build_word, picture_word |
| Writing | trace_start, stroke_order, path_accuracy |
| Emotion | identify_emotion, body_cue, safe_action |
| Calm | inhale_exhale, complete_cycle |

Acceptance criteria:

- Setiap jawaban menghasilkan attempt event.
- LocalStorage menyimpan stats per player slot.
- Ada helper untuk akurasi skill 7 hari terakhir.

### Sprint 2 - Game 10 Learning Feedback MVP (1-2 minggu)

Goal: Pokemon/monster math battle menjadi flagship learning, bukan quiz biasa.

Implementasi:

1. `g10State.currentProblem = { a, b, op, ans, skill, attempts, wrongValues }`
2. Salah pertama: hint ringan, HP tidak turun.
3. Salah kedua: visual model count/grouping, HP tidak turun.
4. Salah ketiga: enemy attack kecil, tampilkan jawaban dan reason.
5. Benar: tampilkan reason singkat lalu player attack.

Visual model:

- Addition: dua kelompok orb digabung.
- Subtraction: orb dicoret/diambil.
- Make 10: 8 + 5 menjadi 8 + 2 + 3.

Acceptance criteria:

- Anak yang salah masih bisa mencoba lagi.
- Feedback salah menyebut kesalahan spesifik: off-by-one, tanda operasi salah, operand picked.
- Battle animation terjadi setelah learning feedback.

### Sprint 3 - Mastery Tree MVP (1 minggu)

Goal: progress bukan hanya bintang.

MVP screen:

```text
Matematika
[Menghitung 1-5] 100%
[Menghitung 1-10] 80%
[Tambah sampai 10] 55%
[Kurang sampai 10] 30%

Rekomendasi hari ini:
Game 10 Level 4
Game 4 Level 6
```

Acceptance criteria:

- Skill node update dari attempt events.
- Node unlock berdasarkan mastery, bukan hanya jumlah main.
- Parent bisa tahu kelemahan anak.

### Sprint 4 - Daily Training Routine MVP (1 minggu)

Goal: retention aman tanpa monetisasi/FOMO.

Daily set:

1. 3 soal math battle.
2. 1 kata susun.
3. 1 napas pelangi.

Reward:

- Care meter naik.
- Sticker/decor unlock.
- No punishment kalau skip.

Acceptance criteria:

- Daily routine selesai 3-5 menit.
- Tidak ada "missed streak shame".
- Daily task mengambil rekomendasi dari weak skill.

### Sprint 5 - Game 9 Stroke Feedback MVP (1-2 minggu)

Goal: handwriting punya feedback teknik.

Implementasi:

```js
LETTER_STROKES = {
  A: [
    [{x:.5,y:.05},{x:.2,y:.95}],
    [{x:.5,y:.05},{x:.8,y:.95}],
    [{x:.35,y:.55},{x:.65,y:.55}]
  ]
};
```

Scoring:

- start point: 25%
- stroke order: 30%
- path closeness: 30%
- completion: 15%

Acceptance criteria:

- Anak tidak bisa asal coret untuk skor tinggi.
- Feedback: "mulai dari atas", "ikuti garis kiri", "garis tengah belum selesai".

### Sprint 6 - 2D Pulau Emosi MVP (1-2 minggu)

Goal: ide #1 masuk sebagai hub kecil yang realistis.

MVP:

- Static 2D map.
- 5 zona.
- 1 NPC mentor.
- Daily quest panel.
- Tap zona masuk game existing.

Acceptance criteria:

- Menu terasa seperti dunia hidup.
- Tidak ada free roaming 3D.
- Rekomendasi belajar tampil natural via NPC.

## Roadmap 3-6 Bulan

### Theme: From Game Collection to Learning Adventure

Build:

1. Parent-Kid Co-Op Quiz (#16)
2. Trainer Level connected to mastery (#39)
3. Local Daily Quest System (#38)
4. Lightweight Adaptive Music (#44)
5. Cinematic SFX pack for Game 10 and Game 6 (#45)
6. Evolution generic cinematic (#10 reshaped)
7. Static story/backstory cards (#12 reshaped)

Do not build yet:

- PvP
- Guild
- Battle pass
- LLM
- AR
- marketplace

### Parent-Kid Co-Op Spec

Mode: same device.

Flow:

```text
Parent side: hint/action prompt.
Kid side: answer/tap/drag.
After round: parent praise prompt + learning explanation.
```

Examples:

- Math: parent sees "ajak anak hitung dari angka besar", kid chooses answer.
- Emotion: parent sees "tanyakan kenapa karakter sedih", kid picks emotion.
- Reading: parent reads word, kid picks image.

Safety:

- No online.
- No recording.
- No external sharing.

### Trainer Level Spec

Do not reward raw grind only.

XP formula:

```text
XP = base_completion + skill_mastery_bonus + retry_learning_bonus
```

Important: "retry_learning_bonus" rewards correction after mistake. Anak harus merasa belajar dari salah, bukan hanya perfect score.

## Roadmap 6-12 Bulan

### Theme: Polished Creature Learning World

Build:

1. Housing/decoration (#6) as reward sink.
2. Creature Designer Studio (#20 reshaped) using original creatures.
3. G6 Level Designer local-only (#24).
4. Year-end/monthly recap (#41) if telemetry exists.
5. Export/import save before cloud save (#49).
6. Smart TV responsive mode light (#50) after landscape UI stable.

Maybe build:

- Speech recognition (#28) as parent-enabled optional feature.
- Local quiz creator (#21 reshaped), no marketplace.

Still avoid:

- public social
- global leaderboard
- premium battle pass
- camera AR
- LLM companion for children without parent mode

## Roadmap 12-24 Bulan

Only after core learning metrics improve:

1. Server-backed daily quest.
2. Cloud save.
3. Parent account.
4. Curated sharing.
5. Limited online family/friend features.
6. Native app wrapper.
7. AI companion in parent-gated mode.

The 12-24 month roadmap must start with compliance and privacy, not features.

## Roadmap Yang Sebaiknya Tidak Dibangun Dalam 12 Bulan

| Ide | Alasan |
|---|---|
| #2 Procedural Habitat | Scope besar, impact belajar rendah. |
| #7 Living Dungeon Generator | Banyak content/system, bisa mengalihkan dari kalistung. |
| #8 20-Episode Voice Story | Produksi konten mahal. |
| #11 Voice-cast 1025 Pokemon | Tidak realistis dan IP risk. |
| #14 Real-Time PvP | Child safety dan infra. |
| #15 Guild Wars | Social pressure. |
| #18 Tournament | Competition risk untuk anak kecil. |
| #23 Music Studio | Tidak prioritas kalistung. |
| #30 Breeding System | Kompleks dan IP risk. |
| #32 Trading Card Game | Spin-off multi-tahun. |
| #35 Battle Pass | Monetisasi/FOMO, tidak sesuai arah. |
| #36 Weekend Raids | Time-gated FOMO. |
| #37 Global Challenge | Server/community safety. |
| #43 Orchestral Album | Polish mahal, bukan bottleneck. |
| #46 Voice Cast Audition | Konten mahal. |
| #48 AR Mode | Camera/privacy/platform. |

## Perbaikan Halaman Proposal Itu Sendiri

Jika halaman `50-ideas-aaa.html` mau dibuat lebih actionable, tambahkan field ini ke setiap idea card:

```text
Learning Impact: High / Medium / Low
Child Safety Risk: Low / Medium / High
MVP Version: 1-2 sentence
Requires Online: Yes / No
Uses Personal Data: Yes / No
Recommended Phase: Now / Next / Later / Park
```

Contoh rewrite untuk #1:

```text
Open-World Hub "Pulau Emosi"
Recommended Phase: Next
MVP: 2D map dengan 5 zona sebagai launcher game existing.
Learning Impact: Medium
Safety Risk: Low
Requires Online: No
First Build: static map + NPC recommendation + local daily quest.
```

Contoh rewrite untuk #26:

```text
Adaptive Curriculum
Recommended Phase: Now
MVP: rule-based skill recommendation dari attempt logs.
Learning Impact: Very High
Safety Risk: Low if local-only
Requires Online: No
First Build: skill taxonomy + local stats + recommended next level.
```

## Final Recommended Roadmap

### Month 1

Build:

- Learning event log
- Game 10 hint-first feedback
- Visual math model
- Mastery tree MVP
- Local daily training

Outcome:

- Anak mendapat feedback belajar.
- Orang tua mulai bisa melihat skill.
- Pokemon/monster hook menjadi learning engine.

### Month 2

Build:

- Game 9 stroke feedback
- Game 4 tap-to-count feedback
- Game 8 active slot and letter hint
- Daily quests local
- Trainer XP connected to mastery

Outcome:

- Kalistung lebih kuat.
- UI reward mulai meaningful.

### Month 3

Build:

- 2D Pulau Emosi hub
- NPC recommendation
- Parent-Kid Co-Op Quiz MVP
- Cinematic SFX for G10/G6
- Adaptive music light

Outcome:

- App terasa seperti game world, tapi tetap ringan.
- Anak punya daily path yang jelas.

### Month 4-6

Build:

- Housing/decor reward
- Creature collection original/public-safe variant
- Generic evolution cinematic
- Monthly recap
- Export/import save

Outcome:

- Long-term motivation naik.
- Progress terasa personal.

### Month 7-12

Build only if metrics support it:

- Local quiz creator
- G6 map designer local
- Parent dashboard advanced
- Optional speech practice parent-enabled
- Native wrapper exploration

Outcome:

- Game mulai menjadi platform belajar, bukan hanya collection mini-games.

## KPI Yang Harus Dipakai

Jangan pakai KPI "berapa lama anak main" saja. Untuk anak, durasi terlalu lama bukan selalu bagus.

KPI utama:

| KPI | Target |
|---|---|
| Correction success | Anak benar setelah hint minimal 60% |
| Repeat learning | Anak mau coba ulang skill yang salah |
| Session length | 5-12 menit sehat |
| Parent clarity | Orang tua tahu 1-3 skill lemah |
| Skill mastery | Akurasi skill naik dari minggu ke minggu |
| Frustration rate | Salah 3x beruntun turun |

## Kesimpulan

Roadmap terbaik bukan membangun semua 50 ide. Roadmap terbaik adalah memilih sedikit ide yang memperkuat loop belajar.

Prioritas paling tajam:

1. #42 Mastery Trees
2. #26 Adaptive Curriculum versi rule-based
3. #29 Handwriting Feedback versi stroke-order
4. #31 Daily Training tanpa punishment
5. #1 Pulau Emosi versi 2D hub
6. #16 Parent-Kid Co-Op
7. #38 Daily Quest local
8. #39 Trainer Level berbasis mastery
9. #44/#45 Audio polish ringan

Dengan roadmap ini, Dunia Emosi bisa bergerak dari "banyak mini-game" menjadi "game belajar anak yang punya arah, feedback, progres, dan motivasi Pokemon/monster battle yang efektif".
