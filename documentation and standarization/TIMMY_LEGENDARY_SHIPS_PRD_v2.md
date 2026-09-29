# Timmy & Kapal Legendaris — PRD v2 (G30)

Owner source: `~/.claude/uploads/…/Timmy_Legendary_Ships_PRD.md` (v1, 124 lines) + 3 mockup sheets
(home landscape/portrait, story intro landscape/portrait, 10-screen flow). Owner 2026-09-28:
"Tambahkan 1 menu utk game baru ini. Dan sempurnakan konsep game ini. Dan buat. Setelah ini saya
kasih semua asset … Ambil asset reusable dari database" + "Ensure semuanya juga animasi,
microinteraction, effect visual dan sound".

## 0. Decisions (made for the owner, change any time)
- **Name on the map:** "Timmy & Kapal Legendaris" (UI Bahasa Indonesia; Arabic words shown RTL;
  English optional later). Tile beside Garasi Tempur in Kota Balapan.
- **Standalone page** like G27–G29: `games/timmy-kapal.html`, offline PWA, per-avatar save, no APIs.
- **Art:** built on art SLOTS (`games/data/tk-art.js`, one key per picture). Until the owner's
  assets arrive every slot points to a shared-library sprite (compass, anchor, lifebuoy, crates,
  sea animals, sailboat, `sd/explorer` as Timmy …) or a code-drawn SVG (ships, ice, waves).
  Dropping the owner's files into the slots re-skins the game with no code change.
- **No "Segera hadir" worlds** (owner rule from G28): every world on the ship list is playable.
  Titanic is the full 13-level flagship; each other world ships a complete 6-level arc built from
  the same level types, deepened when its art arrives.
- **Child safety (v1 §Child safety) is a build rule:** no blood, bodies, drowning, falling people,
  screaming, player death, no "FAILED". Tragedies are told as calm history + remembrance.
  USS Arizona: no weapons, no attack gameplay. Titanic collision: scripted, never a failure.
- **Islamic Studies** content has one toggle (parent); off = those questions/cards disappear cleanly.

## 1. Story frame
Timmy falls asleep reading a book about legendary ships. At midnight a swirling Time Corridor
opens in his bedroom; his compass glows and pulls him in. Each ship is a world holding one
**Time Compass fragment**. Collect 14 → rebuild the compass → return home. His bedroom slowly
becomes a museum of ship models, postcards and history cards.

## 2. Screens (mockup order)
1. **Home** — logo, Timmy on the harbour, big "Mulai Petualangan", 4 tiles (Pilih Kapal, Kamarku,
   Pencapaian, Galeri), "Kapal Legendaris" carousel, learning-category row (Matematika, Studi Islam,
   Bahasa Arab, Pengetahuan Umum, Logika), profile chip (level/XP), parent + settings buttons.
2. **Story intro** — cinematic panels with parallax + narration captions, thumbnails strip
   (landscape) / carousel (portrait), progress dots, Kembali / Lanjut, Skip.
3. **Pilih Kapal** — 14 ship cards (filter chips: Semua, Penjelajahan, Tragedi, Perang & Damai,
   Sains, Favorit), stars total, each card = ship picture + name + value ("Keberanian & Kebaikan").
4. **Peta Level** per ship — dashed route of numbered stops with stars, captain NPC quote, Story button.
5. **Level players** (by level type, §3).
6. **Reward** — stars, checklist ("Sampai tujuan / Semua soal / 3 suvenir"), Knowledge +50, Star +3,
   badge; Ulangi / Level Berikutnya.
7. **Kamar Timmy** (collection hub) — ship models on shelves, postcards, history cards, stickers,
   achievements, learning progress, compass with collected fragments.
8. **Parent area** (hold-to-open gate) — grade (Kelas 1 / Kelas 2 / Adaptif), Islamic Studies on/off,
   narration, sound, reduced motion, timer on/off, progress report, protected reset.

## 3. Level types (the engine — every world is data over these)
| type | what the child does | module |
|---|---|---|
| `story` | watch 2–5 panels (parallax, captions, narration), tap to advance | tk-story |
| `quiz` | 3–5 contextual questions in a scene (crates, lifeboats, stars…), hint ladder | tk-quiz |
| `grid` | **signature:** build a command sequence (MAJU, BELOK KIRI, BELOK KANAN; later AMBIL, TARUH, ULANGI×2/×3, switches, moving ice, currents) and press JALAN; the boat runs step by step; a wrong path pauses on the command that failed, highlights it, lets the child edit — never "game over"; ⭐ for shortest route | tk-grid |
| `steer` | top-down ship control: wheel/drag steering with inertia, wake, gates, icebergs, currents, wind (sail mode); goals: reach zone / pass gates / avoid ice; near-miss spray; the Titanic collision level is scripted (assisted steering, impact inevitable, no failure) | tk-steer |
| `sort` | drag items into groups/containers (supplies, clothes, clean-ocean, capacity) | tk-quiz (drag archetype) |
| `cutscene` | short scripted animation (collision far view, ship breaks seen from a lifeboat — calm, distant) | tk-story |
| `fragment` | collect the Time Compass fragment: celebration, journal entry, postcard | app |

## 4. Worlds (14 + bedroom tutorial)
0 Kamar Timmy (tutorial: grid basics + story) · 1 RMS Titanic (13 levels, v1 §Titanic sequence) ·
2 HMHS Britannic · 3 Vasa · 4 Cutty Sark · 5 HMS Victory · 6 Mayflower · 7 Endurance · 8 Kon-Tiki ·
9 Calypso · 10 RMS Queen Mary · 11 USS Arizona (remembrance) · 12 USS Missouri ·
13 Nautilus-inspired submarine · 14 Pelabuhan Waktu (finale: combined mechanics, rebuild compass).
Non-Titanic worlds: 6 levels each = story → quiz(theme) → grid(theme) → steer/sort(theme) →
quiz(mixed) → fragment. History cards per world (3), verified wording, calm tone.

## 5. Learning (EducationEngine, `games/tk-quiz.js` + `games/data/tk-questions.js`)
- Domains: Matematika Kelas 1–2 (count, +/− ≤20, compare, groups, capacity, clock, money-free),
  Studi Islam (Rukun Islam, Rukun Iman, wudu order, sholat basics, adab), Bahasa Arab (picture↔word,
  listen→picture, arrange letters; RTL), Pengetahuan Umum (ships, sea, weather, animals, science),
  Logika (patterns, sequences, odd-one-out, spatial).
- Math is generated (never impossible: every generated item validated), others curated.
- **Mastery model** per domain 0–100 → presentation level (v1 §Adaptive learning):
  0–30 objects + narration · 31–60 objects + equation · 61–80 context + optional hint · 81–100 two-step.
- **Hint ladder:** retry → highlight the relevant object → animate counting/grouping → show first step
  → guided completion. Wrong answer = gentle wiggle, never red flash, never loses progress.

## 6. Motion, micro-interaction, VFX, sound (owner: "semuanya … animasi, microinteraction, effect visual dan sound")
- Buttons compress (0.96) and rebound; cards tilt on drag; collectibles magnetise into the Journal icon.
- Correct answer = a physical consequence in the scene (crates load, lifeboat lowers, light turns on).
- Grid: command chips snap into slots with a click; the boat moves tile by tile with wake + bob;
  failure pause = soft bump + wiggle on the failing chip; success = splash + stars fly to the counter.
- Steering: wheel rotates with touch, wake bends with turn rate, near-miss spray, collision low rumble
  + restrained camera impulse (no flashing).
- Story/level map: parallax layers (sky 0.08 → foreground 1.2, v1 §Camera), damped camera, drifting
  clouds/waves/gulls, lantern flicker; reduced motion → fades only.
- Sound: shared SFXEngine cues + original WebAudio synth (waves bed, horn, splash, chime, bell,
  wheel click) — no copyrighted rips; narration later (owner voice files or TTS pipeline like G27/G28).
- Shared engines reused: `games/vfx-engine.js` (bursts, projectiles, auras), `games/data/sfx-engine.js`,
  `games/parallax-engine.js` patterns, `data/save-engine.js`, AssetIndex, gt-fx `anim()` timer-safe.

## 7. Architecture / files
`games/timmy-kapal.html` + `.css` + `.js` (GameState, screens, save, parent gate, map tile target)
· `games/tk-grid.js` (GridProgrammingSystem: pure engine + UI) · `games/tk-steer.js` (ShipController,
canvas top-down) · `games/tk-quiz.js` (EducationEngine, MasteryModel, hint ladder, archetypes) ·
`games/tk-story.js` (panels, cutscenes, parallax) · `games/data/tk-worlds.js` (world + level data) ·
`games/data/tk-questions.js` (curated bank) · `games/data/tk-art.js` (art slots).

### Engine contracts
```
TKGrid.create({ w, h, start:{x,y,dir}, goal:{x,y}, blocks:[{x,y}], items:[{x,y,id}], drop:{x,y},
                currents:[{x,y,dir}], ice:[{x,y,path:[…]}], tools:['F','L','R','P','D','R2','R3'], maxLen })
TKGrid.run(level, program) -> { ok, steps:[{x,y,dir,cmd,event}], failAt: index|null, reason, shortest }
TKGrid.mount(host, level, { onDone({stars, moves}), sfx, lib })       // UI: palette, slots, JALAN, replay
TKSteer.mount(host, level, { onDone({stars, time, hits}), sfx, lib })  // level.mode: 'gates'|'ice'|'scripted'|'sail'|'current'
TKQuiz.mount(host, set, { domain, grade, mastery, onDone({right, asked, hints}), sfx, lib })
TKQuiz.make(domain, level, rng) -> question { prompt, visual, choices[], answer, explain, rtl? }
TKStory.play(host, panels, { onDone, sfx, lib })                      // panels: [{bg, layers[], caption, speaker}]
```

## 8. Save (per avatar, key `dunia-tk-v1`)
`{ xp, level, stars{world:{lvl:n}}, fragments[], cards[], badges[], mastery{domain:n}, settings{grade,
islam, narration, sound, reducedMotion, timer}, seenIntro, lastPlace }` — atomic write (one JSON).

## 9. QA gates
`qa-tk-grid` (engine determinism, every authored grid solvable, shortest route computed, failAt correct),
`qa-tk-steer` (scripted collision never shows failure, gates reachable, fps budget),
`qa-tk-questions` (no impossible item across 5,000 generated, curated bank schema, Islamic toggle removes
all, Arabic RTL), `qa-tk-play` (real taps through Home → Intro → Titanic levels 1–4 + a grid + a steer
level, 390x844 / 844x390 / 1024x768, no soft-lock, targets ≥ 56 px), `qa-tk-offline`, `qa-tk-motion`.

## 10. Phase plan
- **P1 (now):** engine + all screens + bedroom tutorial + Titanic 13 levels + 13 other worlds × 6
  levels on placeholder art; menu tile; gates.
- **P2 (owner assets):** ingest owner art into `tk-art.js` slots (crop pipeline + white outline,
  like G29), narration, ship-specific story panels.

## 11. Owner mockups round 2 (2026-09-28, archived `~/Documents/temporary/game asset/timmy-ships/ui-01..11.png`)
- **ui-04 Pilih Kapal:** parchment title plate, filter chips (Semua/Penjelajahan/Tragedi/Perang & Damai/Sains/Favorit),
  ship grid with favourite star, **detail panel** (picture, value, quote, Tahun/Jenis/Panjang/Terkenal karena,
  3 thumbnails) + big "Berlayar!" button; portrait = 2-column grid + detail card below.
- **ui-06 Peta Dunia:** ships as numbered islands joined by dashed routes, stars under each; bottom nav
  (Peta Dunia · Cerita · Tantangan · Belajar · Koleksi); portrait "Lanjutkan Perjalanan".
- **ui-05 / ui-07 grid:** left chapter panel (ship picture, chapter, level checklist), parchment title plate,
  Command palette (absolute arrows ↑→↓←, Ambil/Taruh/Ulangi), Hapus + JALAN!, "Rutemu (maks N langkah)",
  Timmy bubble, penguin-captain tip card. **Absolute arrows are the default for kids** (F/L/R kept for advanced).
- **ui-08 quiz:** domain tabs, parchment question card, sprite visual, 4 answers, stats (Soal, Poin, Beruntun),
  mascot bubbles, bottom step dots (Kuis → Jelajah → Aktivitas → Hadiah).
- **ui-09 Koleksi Kapal:** side categories, search, Owned/Not owned, detail panel (tags, text, specs, Baca Kisah,
  Jadikan Favorit). **ui-10 Level Selesai:** "Hasilmu" table (langkah, waktu, barang, skor kuis), "Hadiah" column,
  **Fakta Sejarah** card, Ulangi / Level Berikutnya / Peta Dunia, chapter progress strip.
- **ui-11 Pengaturan:** Audio (musik, efek, narasi, bisukan semua), Tampilan (efek visual), Permainan (petunjuk,
  tutorial, konfirmasi keluar), Bahasa, Kontrol Orang Tua (gate), profil + lencana.
- **Mascot:** a penguin captain gives tips (sprite `animals/penguin` until the owner's art arrives).
- **Still excluded (policy §0):** coins, gems, "+" purchase buttons, "Coming Soon" slots.

## 12. Owner rules round 3 (2026-09-28)
- **No emoji, icon glyphs or generic pictograms** in this game ("jangan pakai emoji icon symbol. Ambil dari sprite"):
  every icon comes from the owner's cropped sprites (tk-prop / tk-ui / tk-char / tk-legend) through one icon helper.
- **No woman without hijab** anywhere in the game ("Jangan ada wanita tanpa hijab"). Female characters =
  tk-char/hijab-* only; tk-char/lady-hat and tk-char/maid are in the shared DB but never used by G30.
- **No shop / coins / gems** still holds: tk-ui/btn-shop, anchor-coin, diamond are ingested but never used.
- Owner assets (2026-09-28): 4 backdrops (tk-scene), 110 props/ships (tk-prop, tk-ship), legend sheet (Timmy,
  bedroom, portal, the 14 legendary ships), 4 more ship sheets, 3 character/UI sheets — all in the shared DB.

## 13. Gap matrix vs latest UI/UX (ui-12 Titanic chapters, 2026-09-28) — before implementing
Legend: ✔ functional · ◐ partial · ✖ missing. "Where" = current implementation.

| UI/UX feature | Exists | Functional | Where / state | Required action |
|---|---|---|---|---|
| World Map | ✔ | ✔ | timmy-kapal.js worldView (islands) | keep |
| Story intro (comic panels) | ✔ | ✔ | tk-story.js | reuse for captain dialogue scenes |
| Ship/world selection | ✔ | ✔ | ships()/detail() | keep |
| **Titanic chapter map** (10 named chapters on parchment map) | ◐ | ◐ | layoutRoute(): 13 numbered levels on a dashed route | restructure Titanic into 10 chapters (steps inside); parchment chapter-map screen |
| Program the Route + queue | ✔ | ✔ | tk-grid.js | reuse for Evacuation |
| Forward / Left / Right | ✔ | ✔ | tk-grid F/L/R (+ absolute arrows default) | keep |
| Pick Up / Drop / Repeat / Clear / GO | ✔ | ✔ | tk-grid P/D/R2/R3, Hapus, JALAN! | keep |
| **Three-lane top-view navigation** | ✖ | – | tk-steer.js is free steering (wheel), not 3 lanes | NEW tk-lanes.js (LEFT / RIGHT / BOOST, auto-forward, big-ship inertia, lane guides, obstacle director, stars) |
| **Collision → Knowledge Challenge → Recover** | ✖ | – | steer bumps only slow the ship | NEW TKQuiz.challenge() single-question overlay, called by tk-lanes on impact |
| Knowledge Challenge (quiz) | ✔ | ✔ | tk-quiz.js mount (separate levels) | expose single-question API |
| Mathematics / Islamic / Arabic / General / Logic | ✔ | ✔ | tk-questions.js 427 items + generated maths | keep |
| Hints ladder | ✔ | ✔ | tk-quiz / tk-grid | keep |
| Adaptive difficulty | ◐ | ◐ | mastery → quiz level; grid/steer not adaptive | lanes difficulty from progress + mastery |
| In-level collectibles (stars/knowledge tokens) | ◐ | ◐ | stars per level only | lanes collect stars/tokens → reward |
| Level scoring / Level Complete / rewards | ✔ | ✔ | tk-hub.js reward | feed lanes results (avoided, stars, answers) |
| Historical facts | ✔ | ✔ | world.cards + reward fact card | add chapter reflection |
| Achievements / learning progress | ✔ | ✔ | tk-hub room/achievements | keep |
| Timmy's Room | ◐ | ◐ | tk-hub room (collection hub); not the bedroom-museum view | return-to-room ending shows collected Titanic model |
| Ship collection / story unlocks / replay | ✔ | ✔ | room, sequential unlocks, replay | keep |
| Checkpoint / save | ◐ | ◐ | per level only | checkpoints before/after cinematics and between chapter steps |
| Portrait / mobile layouts | ✔ | ✔ | all screens tested 390x844 / 844x390 / 1280x800 | keep for new parts |
| **Titanic final unavoidable collision** | ◐ | ◐ | tk-steer mode 'scripted' (free steering) | lanes "no safe corridor": control → assisted → cinematic, captain line, never "failed" |
| **Titanic cinematic (scenes 01–09)** | ◐ | ◐ | 2–3 static story panels | NEW tk-cinema.js layered canvas engine + TitanicFinalSequence components, skip/replay/resume |
| Flooding cutaway (educational) | ✖ | – | – | cinema scene with interactive 3+2 question |
| Evacuation (Program the Route on deck) | ◐ | ◐ | grid t10 deck board | chapter 7 steps: boat deck → passengers → lifejackets → board |
| Lifeboat logic (seats) | ✔ | ✔ | tk-quiz sort (capacity) | add 20−14 seat-count question + 6 seats light up |
| Harbor exploration / board / explore ship | ◐ | ◐ | quiz levels t1–t2 | chapter 2–3 as story + quiz + route steps |
| Rescue + reflection | ◐ | ◐ | t13 quiz + story panel | cinema RescueDawn + reflection card + fragment |

**Cinematic tech choice:** in-engine layered canvas/DOM (`tk-cinema.js`), not Remotion. The game is an offline
PWA that must pause, skip, resume at checkpoints and branch into questions; a Remotion render would be a large
pre-rendered video (MBs per minute, no interactivity, no reduced-motion variant). The cinema engine uses the same
layer model Remotion would (camera, parallax layers, particles, lighting, timed subtitles, audio cues) so the
composition could still be exported with Remotion later if a trailer is wanted.

## 14. Kapal Legenda baru (owner sheet of 25 ships, 2026-09-29)

Owner: "Some of these become levels, and some are only selectable ships. If a ship becomes a level, design a game
aligned with its original story, adapted for children and involving Timmy." Source sheets: side views + top views of
25 historic ships (`~/.claude/uploads/006f0cec-…/4e680baf-image.png`, `857d9a24-image.png`), cropped by another agent to
`assets/db/lib/tk-legend-side/<slug>.webp` + `tk-legend-top/<slug>.webp` and added to the ship picker (TKFleet).
Built as DATA in `games/data/tk-worlds-legends.js` (tk-worlds.js is untouched); gate `tools/qa-tk-legends.mjs`.

### 14.1 Which ships become story worlds (child safety first)
Rule: a ship becomes a world only when its TRUE story has a hopeful core a 6–8-year-old can hear without being
lied to — exploration, discovery, archaeology, a rescue where people were saved, a mystery, courage, teamwork —
and the hard part can be said in one calm sentence without anyone suffering on screen.

| # | Ship (slug) | Decision | Why |
|---|---|---|---|
| 1 | Mary Rose (`mary-rose`) | **World** | The famous part is the 1982 raising: divers + scientists, 28,000 dives, 19,000 objects, years of patient conservation. The loss in 1545 is one sentence ("terbalik dan hilang ke dasar laut"). Value: sabar & teliti. |
| 2 | Queen Anne's Revenge (`queen-annes-revenge`) | **World** | Blackbeard's ship ran onto a sandbar in 1718 and the crew went ashore; found by divers in 1996; bell, anchors, plates and gold dust now in a public museum. A pirate tale told as "taking is wrong, the real treasure is shared". No cannons in play (sprites excluded). Value: jujur & berbagi. |
| 4+5 | HMS Erebus + HMS Terror (`hms-erebus`, `hms-terror`) | **One world** | Two ships of one expedition; the story told is the 170-year SEARCH, won by perseverance and by listening to Inuit memory (Erebus 2014, Terror 2016). The crews' fate is never shown or described; the text says only that the ships "tidak pernah pulang". Value: tekun mencari. |
| 6 | Mary Celeste (`mary-celeste`) | **World** | A true mystery: found sailing with no one aboard, food for six months, lifeboat gone; three Dei Gratia sailors brought her safely to Gibraltar. Told as observation + safety drills ("tetap bersama"); "tidak ada yang tahu pasti ke mana awaknya pergi" — honest, no speculation about harm. Value: teliti & siaga. |
| 7 | SS Republic (`ss-republic`) | **World** | 1909: the first famous radio distress call (CQD); the Baltic came and over 1,500 people were moved to safety. The few people lost in the collision are not mentioned (we never claim "everyone"); the text says "lebih dari 1.500 orang dipindahkan dengan selamat". Named "SS Republic" as on the owner sheet (White Star's RMS Republic, the 1909 ship). Value: minta tolong dengan tenang. |
| 23 | RMS Carpathia (`rms-carpathia`) | **World** | The rescue hero: raced through ice at night, prepared blankets, soup and hot drinks, picked up 705 people from the lifeboats. Closes the loop with the Titanic chapter 10 ("kapal penolong datang"). Value: sigap menolong. |
| 17 | Andrea Doria (`andrea-doria`) | Selectable only | A great rescue (Île de France and others saved ~1,660 people), but 46 people were lost in the collision itself and the arc (fog collision → radio → rescue ships) duplicates SS Republic. Revisit later as a "kapal-kapal penolong" bonus if the owner wants it. |
| 3, 14, 22 | HMS Victory, USS Arizona, Endurance | Selectable only | Already worlds (`victory`, `arizona`, `endurance`); the new side/top art can re-skin them. |
| 8–13, 15, 16, 18–21, 24, 25 | Sultana, Empress of Ireland, Lusitania, Waratah, HMS Hood, Bismarck, Yamato, Wilhelm Gustloff, Edmund Fitzgerald, Doña Paz, Estonia, Kursk, Andrea Gail, Costa Concordia | Selectable only | War ships or disasters whose story IS the loss of life; no honest hopeful core for this age. They sail in steer/lanes as the child's chosen ship only — no story, no facts about the event. |

### 14.2 Placement and saves
The host keys progress two ways: stars by `world.id` + `level.id` (safe), but **unlock order** (`worldOpen(i)`) and
the shared-hub record `saveLevelProgress(GAME_ID, index*20 + k + 1)` by **world index**. Inserting before
Pelabuhan Waktu would move Pelabuhan from index 14 to 20: a child who had it open would find it locked again and
its hub records would be re-attributed to Mary Rose. So the six worlds are **appended after Pelabuhan** (indexes
15–20), chronological: Mary Rose → Queen Anne's Revenge → Erebus & Terror → Mary Celeste → SS Republic →
Carpathia. Story frame: the Time Compass is whole, but it "berputar lagi" — a second voyage, the Legend Ships.
The fragment of each new world is a keepsake piece (`w.fragmentName`: Mawar Emas, Lonceng Jujur, Jarum Utara, Kaca
Pengamat, Gelombang Radio, Lentera Fajar) of the same `S.fragments` save (world id), so no save change is needed.

### 14.3 Shared shape of a legend world
- 6 levels. L1 = `story`: the shared time-travel opening (bedroom → corridor → the year) + 2–4 panels of the real
  history with the old human captain ("Kapten Tua", `tk-char/captain-old`) and his assistant penguin
  (`tk-char/penguin-sailor`). L2–L6 = gameplay, each opened by 1–2 story panels (the next beat). L6 carries the
  fragment; its panels resolve the story and the compass glows; `w.outro` (2 panels) brings Timmy back to his room.
- Quiz levels use the mixed engine (Matematika ≈50%, `TKQuiz.build({mix:true})`); the goal line steers topic and
  the maths kind ("Hitung…" → count, "Bagikan…" → share, "sekoci" → capacity) and never names a ship, place or year.
  Curated questions tagged with the world are preferred by `pick()` (16 added: Morse patterns, honesty, sharing,
  safety drill, kindness, perseverance, careful hands).
- Sort levels read a world-tagged sort set appended to `TKQuestions.sorts` (6 sets). Grid boards use only what
  TKGrid supports: water, blocks, `S`, `G`, `c` pick, `d` drop, currents, moving ice (`board.ice`). All grids are
  "easy" (≤ 3 per world: only the commands the route needs, coach on first visit).
- Sulit (Kelas 3–4): quizzes follow the parent's "Tingkat Soal" setting automatically (`hard` → HARD_KINDS maths,
  grade-3/4 bank items); lanes use `difficulty` 1–2 (raise to 3 for a Sulit variant later); boards have no hard
  twin yet (candidate: `easy:false` + R2/R3 tools).
- Ship art: `ship/<world id>` resolves through `TKArt.OVERRIDE` to `tk-legend-side/<slug>` as soon as it is in the
  AssetIndex (all six are indexed now; Carpathia's slug is `carpathia`, not `rms-carpathia`); until then a stand-in from the library (Mary Rose → tk-ship3/spanish-galleon, QAR → tk-ship2/blackbeard,
  Erebus → tk-ship3/hms-beagle, Mary Celeste → tk-ship3/flying-cloud, Republic → tk-ship3/ss-rotterdam,
  Carpathia → tk-ship3/ss-great-eastern). The keys the other agent confirms in `assets/db/index.json` go into
  `SIDE` in tk-worlds-legends.js (Erebus uses `hms-erebus`; `hms-terror` is listed in `w.legend`).

### 14.4 The six worlds

**A. Mary Rose** (`maryrose`, 1545 / raised 1982) · value **Sabar & Teliti** · cat sains · guide Kapten Tua
(captain-old) · helpers diver, diver-bearded, hijab-officer-tablet (ilmuwan) · fragment **Mawar Emas** ·
backdrops harbor-morning (harbor-dock), deep-sea (underwater), shipyard (island-cliff).
Story beats: (1) Timmy wakes up on a diving boat at Portsmouth, 1982 · (2) the King's ship of 1510, lost in 1545,
kept by soft mud · (3) Timmy dives with the divers · (4) 19,000 objects sorted before lifting · (5) 11 Oct 1982: the
yellow lifting frame raises her while the world watches · (6) years of water and wax sprays: patience saves history.

| # | id | Title | Mode | Gameplay ↔ beat | Mission (≤12 words) | Parameters |
|---|---|---|---|---|---|---|
| 1 | maryrose1 | Kapal di Dasar Laut | story | arrival + history (5 panels) | Timmy tiba di Portsmouth. Dengarkan Kapten! | — |
| 2 | maryrose2 | Peluit Tua | grid | Timmy dives, picks the bosun's whistle | Ambil peluit tua, lalu taruh di keranjang penyelam! | `S.#/.c./#.d` E, P D, par 6 |
| 3 | maryrose3 | Harta di Lumpur | grid | two finds, a current helps | Ambil 2 lonceng tua, awas arus, lalu ke keranjang! | `S.#../.c>../#..#c/..d..` par 11 |
| 4 | maryrose4 | Memilah Temuan | sort | sort finds: music / work / eating | Kelompokkan benda temuan sebelum diangkat! | so-maryrose, 3 bins |
| 5 | maryrose5 | Hari Pengangkatan | steer | tow the fragile hull gently | Tarik Mary Rose pelan-pelan lewat semua gerbang! | gates, boat, 4 gates, day, 2300 |
| 6 | maryrose6 ★ | Museum Mary Rose | quiz | conservation beat, quiz opens the corridor | Hitung benda temuan untuk museum, lalu buka lorong waktu! | umum lead, 4 q |

**B. Queen Anne's Revenge** (`queenanne`, 1718 / found 1996) · value **Jujur & Berbagi** · cat sains · guide
Penyelam Pak Mark (diver-bearded) · helpers Kapten Tua, penguin, hijab-girl-book · fragment **Lonceng Jujur** ·
backdrops research-sea (island-cliff), deep-sea, harbor-day (museum).
Beats: (1) a black-sailed ship: Blackbeard · (2) "taking other people's things is wrong" · (3) 1718 she runs onto a
sandbar, the crew go ashore · (4) 1996 divers find her; Timmy dives · (5) every find goes to the museum · (6) the
real treasure is the one we share.

| # | id | Title | Mode | Gameplay ↔ beat | Mission | Parameters |
|---|---|---|---|---|---|---|
| 1 | queenanne1 | Layar Hitam | story | Blackbeard, the sandbar, the 1996 dive (6 panels) | Timmy melihat kapal bajak laut. Dengarkan Kapten! | — |
| 2 | queenanne2 | Lonceng Kapal | grid | find the 1709 bell | Ambil lonceng kapal, lalu bawa ke perahu penyelam! | `Sc.#/.#../...d` par 7 |
| 3 | queenanne3 | Piring Timah | grid | two plates, ride the current | Ambil 2 piring tua, awas arus, lalu ke perahu! | `Sc>../..#c./#...d` par 8 |
| 4 | queenanne4 | Harta untuk Museum | sort | jewels vs ship tools, all for the museum | Pilah harta untuk dipamerkan di museum! | so-queenanne |
| 5 | queenanne5 | Jujur & Berbagi | quiz | honesty + fair sharing ("Bagikan" → share maths) | Bagikan koin emas dengan adil kepada teman! | umum lead + 3 curated |
| 6 | queenanne6 ★ | Keluar dari Teluk | steer | sail out WITHOUT running aground | Berlayar keluar teluk, jangan sampai kandas! | sail, clipper, 4 gates, obstacle rock |

**C. HMS Erebus & HMS Terror** (`erebus`, 1845 / found 2014 + 2016) · value **Tekun Mencari** · cat penjelajahan ·
guide Kapten Pencari (captain-map) · helpers chef, captain-binoculars, diver · fragment **Jarum Utara** · backdrops
harbor-dawn (sunset-port), antarctic (aurora-ice), deep-sea.
Beats: (1) two ships sail north to find a sea road through the ice · (2) supplies for three years (food, warm
things, a library) · (3) the sea fills with ice · (4) ice closes around them; the ships never come home; searchers
come year after year · (5) an Inuit hunter remembers a mast in the ice · (6) Erebus found 2014, Terror 2016 —
because people did not give up and listened.

| # | id | Title | Mode | Gameplay ↔ beat | Mission | Parameters |
|---|---|---|---|---|---|---|
| 1 | erebus1 | Dua Kapal Berangkat | story | departure (4 panels) | Timmy ikut ekspedisi ke utara yang dingin. | — |
| 2 | erebus2 | Bekal Tiga Tahun | sort | pack for a long trip | Kelompokkan bekal untuk perjalanan panjang! | so-erebus, 3 bins |
| 3 | erebus3 | Laut Penuh Es | steer | steer through floes | Kemudikan kapal di antara bongkahan es! | ice, explorer, day |
| 4 | erebus4 | Kapal Pencari | lanes | the searchers' ship among ice | Kapal pencari melaju di antara es. Pindah jalur! | diff 1, seed 1845, day, 3 titled sections |
| 5 | erebus5 | Peta untuk Tim Pencari | grid | carry the map across moving ice | Bawa peta menyeberangi es ke tim pencari! | `S..#./.#c../...#./#..d.` + moving ice col 4, par 8 |
| 6 | erebus6 ★ | Ditemukan! | quiz | the finds, compass glows | Hitung penyelam yang turun ke kapal, lalu buka lorong waktu! | umum lead, 4 q |

**D. Mary Celeste** (`maryceleste`, 1872) · value **Teliti & Siaga** · cat sains · guide Kapten Morehouse
(captain-binoculars) · helpers Kapten Tua, penguin · fragment **Kaca Pengamat** · backdrops research-sea, old-deck
(ship-deck).
Beats: (1) from the Dei Gratia, a ship sailing strangely · (2) "Halo?" — sails set, deck empty · (3) be a detective:
the log is there, the lifeboat is gone · (4) 1,701 barrels, 9 empty, food for six months · (5) three sailors bring
her safely to Gibraltar · (6) no one knows for sure where the crew went — the lesson is safety drills and staying
together.

| # | id | Title | Mode | Gameplay ↔ beat | Mission | Parameters |
|---|---|---|---|---|---|---|
| 1 | maryceleste1 | Kapal Tanpa Awak | story | the empty ship (5 panels) | Ada kapal aneh di laut. Ayo amati! | — |
| 2 | maryceleste2 | Petunjuk di Dek | grid | collect 3 clues, reach the wheel | Kumpulkan 3 petunjuk, lalu pergi ke kemudi! | deck `Sc./#c./c.G`, P only, par 9 |
| 3 | maryceleste3 | Tong Muatan | sort | barrels vs food stores | Pisahkan tong muatan dan bekal makanan! | so-maryceleste |
| 4 | maryceleste4 | Mata Detektif | quiz | observation (logika lead) | Amati gambarnya dengan teliti, lalu jawab! | logika lead, 4 q |
| 5 | maryceleste5 | Laut Tenang | steer | sail her to port | Layarkan Mary Celeste ke pelabuhan lewat semua gerbang! | sail, clipper, 4 gates, day |
| 6 | maryceleste6 ★ | Latihan Sekoci | grid | safety drill: life vests, muster at the boat | Ambil 2 pelampung, lalu kumpul di sekoci! | deck `S.#./.c../#..#/.c.d` par 9 |

**E. SS Republic** (`republic`, 1909) · value **Minta Tolong dengan Tenang** · cat penyelamatan (new chip) ·
guide Operator Radio Jack (officer-boy) · helpers Kapten Tua, captain-binoculars, hijab-girl-book · fragment
**Gelombang Radio** · backdrops harbor-morning, research-sea.
Beats: (1) New York, a ship with the new wireless · (2) fog; the Florida strikes her side; everyone calm in life
vests · (3) Jack taps CQD again and again · (4) the Baltic hears and comes through the fog · (5) boats ferry people
across, families together · (6) more than 1,500 moved safely; Jack is called a hero.

| # | id | Title | Mode | Gameplay ↔ beat | Mission | Parameters |
|---|---|---|---|---|---|---|
| 1 | republic1 | Kapal Ber-radio | story | radio + fog (6 panels) | Timmy naik kapal yang punya radio! | — |
| 2 | republic2 | Sinyal CQD | quiz | continue short/long signal patterns (Morse) | Lanjutkan pola sinyal radio: pendek dan panjang! | logika lead + 3 Morse items |
| 3 | republic3 | Menembus Kabut | steer | Baltic follows lit buoys at night | Ikuti pelampung lampu menembus kabut! | gates, liner, night, 4 gates, rock |
| 4 | republic4 | Antar Penumpang | grid | ferry 2 passengers to the Baltic | Jemput 2 penumpang, lalu antar ke kapal Baltic! | `S.c.#/#..c./..#../d....` par 12 |
| 5 | republic5 | Kursi Sekoci | sort | capacity: 5 per boat, families together | Tiap sekoci muat 5 orang. Keluarga tetap bersama! | so-republic (capacity) |
| 6 | republic6 ★ | Semua Aman | lanes | Baltic carries everyone to New York; Soal buoys + a lighthouse gate | Antar Baltic ke New York. Ambil pelampung soal! | diff 1, seed 1909, day, questions buoy×2 + gate×1 |

**F. RMS Carpathia** (`carpathia`, 1912) · value **Sigap Menolong** · cat penyelamatan · guide Kapten Rostron
(captain-old — the old human captain) · helpers officer-boy-binoculars (Harold, radio), mechanic-boy, chef,
hijab-officer-tablet · fragment **Lentera Fajar** · backdrops night-ocean (ice-night), rescue-dawn (sunset-port).
Beats: (1) midnight, the radio hears a call for help · (2) "Putar kapal!" — heating stopped, all power to the
engines, lookouts watch for ice · (3) dawn: lifeboats among the ice, picked up one by one · (4) blankets, soup and
hot drinks · (5) counting the boats · (6) 705 people safe; Rostron's medal; on to New York.

| # | id | Title | Mode | Gameplay ↔ beat | Mission | Parameters |
|---|---|---|---|---|---|---|
| 1 | carpathia1 | Panggilan Malam | story | the call + the turn (5 panels) | Carpathia mendengar panggilan minta tolong. | — |
| 2 | carpathia2 | Menembus Malam | lanes | race through ice at night to the lifeboats | Melaju menembus malam. Hindari es, pindah jalur! | diff 2, seed 1204, night, sections Putar Haluan / Es di Malam Hari / Hampir Sampai |
| 3 | carpathia3 | Jemput Sekoci | grid | pick up 3 lifeboats in a staircase order, back to the ship | Jemput 3 sekoci, lalu kembali ke Carpathia! | `Sc.#/#.c./..#c/...d` par 10 |
| 4 | carpathia4 | Selimut & Minuman Hangat | sort | blankets vs hot drinks/soup | Siapkan selimut dan minuman hangat untuk penumpang! | so-carpathia |
| 5 | carpathia5 | Menghitung Sekoci | quiz | count the boats (kindness items) | Hitung sekoci yang dijemput kapal penolong! | umum lead, 4 q |
| 6 | carpathia6 ★ | Menuju New York | steer | carry everyone to New York | Bawa semua penumpang ke New York lewat semua gerbang! | gates, liner, day, 4 gates |

History accuracy notes (editorial review before release, cards carry `verified:false`): the owner brief said
"cocoa" for Carpathia — the sources list soup, coffee, tea (and brandy), so the text says "sup dan minuman hangat";
Republic "semua selamat" is avoided (a few people were lost in the collision); Mary Rose's losses and Erebus/Terror's
crews are not described; QAR's earlier history as a French ship is not told.

### 14.5 Host wiring still needed (owned by the timmy-kapal.* / sw.js agent)
1. `games/timmy-kapal.html`: `<script src="data/tk-worlds-legends.js?v=…"></script>` right after `data/tk-questions.js`
   (before tk-story.js … timmy-kapal.js). The file also works directly after tk-worlds.js (art slots + bank parts
   are then added on DOMContentLoaded).
2. `sw.js`: add `games/data/tk-worlds-legends.js` to the G30 SHELL list; the warm list already walks `WD.WORLDS`
   ships (`Art.src(w.ship)`) and every `tk-*` AssetIndex key, so `tk-legend-side/*` is precached once indexed.
3. Fragment totals: `fragmentStep()` text "dari 14", `say(… dari 14)` and `finish()` `fragment.total: 14` must count
   by series: `WD.WORLDS.filter(w => w.levels.some(l => l.fragment) && (w.series || 'kompas') === series)` — the
   legend worlds would otherwise show "15 dari 14". Title for series 'legenda': "Kepingan Legenda: <w.fragmentName>".
4. Unlock: optional — let the legend series open after Titanic instead of after Pelabuhan
   (`worldOpen(i)`: `if (W[i].series === 'legenda') return i === firstLegend ? worldDone(get('titanic')) : worldDone(W[i-1])`).
   Indexes stay as they are.
5. Per-world art maps in timmy-kapal.js (`CAPT`, `THUMB`, `ISLE`) are keyed by id: read `w.guideArt`, `w.thumb`,
   `w.isle` when present (`CAPT[w.id] || w.guideArt || 'char/captain'`).
6. Story intro/outro: play `w.outro` panels (TKStory) after the fragment reward of a legend world (the "return to
   Timmy's room" beat); the reward's "Kapal Berikutnya" works as is.
7. World select: the ship list now has 20 ship cards (+ the new "Penyelamatan" chip from `TKWorlds.CATS`); the
   Home "Kapal Legendaris" carousel and the room shelf read `WD.WORLDS`, check they scroll/wrap with 20.
   `maxStars()` grows accordingly.
8. TKFleet: the other agent's picker entries should use the same slugs as `w.legend`; the worlds' steer/lanes levels
   sail the child's chosen fleet ship as everywhere else.

### 14.6 QA (`node tools/qa-tk-legends.mjs`)
A (node): existing 15 world ids + indexes unchanged, new worlds appended once; schema per world/level type; every
board solved by an independent solver (par == true shortest == TKGrid.shortest, maxLen ≥ par+2, TKGrid.run 3 stars,
no shorter program); all sprite keys in the AssetIndex (no lady-hat / maid); no banned word (tenggelam karam tewas
meninggal korban perang tempur torpedo senjata bom bencana mati), no emoji; mission lines ≤ 12 words; quiz goals
name no ship/place/year; TKQuiz.build / sortSet resolve each quiz / sort. B (puppeteer, legends injected via request
interception): every level of every new world played to the reward screen at 1280×800 and 390×844, stars saved,
fragments collected, no page errors. Screenshots: `scratchpad/tk-legends/`.

### 14.7 Action rebalance (owner 2026-09-29: "less pure quiz, more action, questions embedded in action")
At most ONE pure quiz level per legend world (gate-enforced). SS Republic's second quiz ("Semua Aman") is now a lanes
rescue run. Every steer / lanes level embeds questions through `questions:{on, count, buoys, gates}` (read by
tk-steer / tk-lanes, answered on the host's Knowledge Challenge card):
maryrose5 gate×1 · queenanne6 collide+buoy×2 · erebus3 collide · erebus4 collide+buoy×2 · maryceleste5 buoy×2 ·
republic3 gate×1 · republic6 buoy×2+gate×1 · carpathia2 collide×3 · carpathia6 buoy×2.
Grid question chests/doors (`q:[{x,y,type,topic}]`) are not in tk-grid.js / TKWorlds.grid yet, so the legend boards
carry none; add them (and teach the gate's solver about doors) when the engine ships them.

Host wiring done (2026-09-29): script tag after tk-questions.js; fragment counts per series (`fragTally`: Kompas n/14,
Legenda n/6, badge "Kepingan Legenda: <fragmentName>"); guide/thumb/isle fall back to `w.guideArt / w.thumb / w.isle`;
`w.outro` plays once after a world's fragment level, before the reward; world-level chips show the world name
(no "Bab N" index). Still open: sw.js SHELL entry (main), unlock placement (atlas agent), tk-hub's room/achievement
compass counts (`x.fragments` / 14 counts ALL fragments incl. legends — should count series 'kompas' only).
