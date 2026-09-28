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
