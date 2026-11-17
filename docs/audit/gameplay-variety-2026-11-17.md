# Gameplay variety and visual detail audit, 2026-11-17

Scope: Dunia Emosi hub (index.html, game.js, games/hub/g14-g16-trains.js) and games/*.html. Read-only code audit, no browser run. Claims cite file:line or say "unconfirmed".

## Shared hub quiz juice (applies to G3, G4, G7, G8, G9, G11 and other in-hub quiz games)

- Difficulty = rounds only: `DIFF` easy 6 / medium 10 / hard 15 rounds, 3/4/6 choices (game.js:9-13). No per-game rule changes between levels.
- Correct answer: card pulse, ring, tick and viewport particle burst `spawnCorrectCardJuice` (game.js:2738-2764); star gain `addStars` (game.js:2336); green screen flash `flashScreen` (game.js:2257); confetti 15/30/60 pieces by star tier `launchConfetti` (game.js:2702); end overlay `showResult` (game.js:2378).
- Wrong: CSS `wrong-shake` on the card (game.js:2766), red flash. No hit-stop anywhere in the shared layer (unconfirmed for individual games; grep found no `hitStop`/`timeScale` in game.js 3075-3968).
- Streak: `quizStreakHit` floater COMBO x3 / HEBAT x5 / LEGEND x7 with rising chime (game.js:2780-2802). Resets on wrong. Pure text floater, no persistent meter.
- UI strings use emoji heavily (spawnSparkles icons game.js:2726-2727, showResult icons). That conflicts with the owner no-emoji rule; unconfirmed whether a runtime emoji-map swaps them (`games/data/emoji-map.js` exists).
- Progression: GAME_INFO 20 levels per game (game.js:1165-1200), `LEVEL_TIERS` 5 named tiers by level number (game.js:354-360), `RETIRED_GAMES = [1,2,5,12]` (game.js:1203).

## G3 Huruf Hutan (hub, game.js:3075-3149)
1. Loop: animal emoji + word with one blank letter, pick the missing letter from 3-6 buttons; last 40% of rounds switch to counting animals (game.js:3089-3090, 3103-3110).
2. Content: `ANIMAL_LETTERS` about 41 items (game.js:40-83), filtered by age tier (`getAgeLetters`, game.js:3080). Rounds 6/10/15 per level.
3. Variety: 2 mechanics (missing letter, count). Blank position random on medium/hard (game.js:3097).
4. Repetition risk after 3 sessions: HIGH. 41-item bag (`pickBag`), identical card layout, only emoji changes.
5. Juice: shared (burst, combo, shake, flash). Progress bar + dots (game.js:3096, `buildDots`). No unlock/collectible. No hit-stop.
6. Visual: single static jungle backdrop `initJungleWorld` (game.js:3078); animal is a text glyph, no animation; no parallax (grep n=0 real layers).
7. Reuses: `initJungleWorld`, `pickBag`, shared juice. Nothing from reward-catalog.

## G4 Hitung Binatang (hub, game.js:3150-3281)
1. Loop: count the animals/fruits/objects shown, pick the number within a per-round timer; toggle for Pokemon variant (game.js:3160-3166).
2. Content: `ANIMALS_G4` 51 emoji (game.js:286-290), `FRUITS_G4`, `OBJECTS_G4`, `POKEMON_G4`, plus `DBSprites.pick('creatures'|'objects')` illustrated sprites (game.js:3187-3190). Count max by age tier.
3. Variety: category rotates every 3 rounds hewan/buah/benda (game.js:3185-3186); Pokemon toggle with 2 distractor types (game.js:3192-3194). 2 mechanics.
4. Repetition risk: HIGH. Same count-and-pick loop, only the picture pool changes.
5. Juice: shared juice + per-round countdown (`startG4Timer`, game.js:3268). No combo meter beyond shared streak.
6. Visual: savanna backdrop `initSavannaWorld` (game.js:3153); items drawn as emoji or static DB sprites, no idle animation.
7. Reuses: `DBSprites` (games/data/db-sprites.js), `pickBag`.

## G7 Tebak Gambar (hub, game.js:3588-3701)
1. Loop: picture to word (or word to picture) with 4 choices (game.js:3609-3625).
2. Content: `WORD_IMAGES` about 154 entries (game.js:541-713) plus `DBLabeled.all()` sprites (game.js:3592-3596). Largest bank of the simple quiz set.
3. Variety: 2 modes img2word / word2img, second half of a level flips direction on medium/hard (game.js:3612-3613). DB-sprite items force img2word and use same-group decoys (game.js:3620-3622). No-repeat via `usedIds` (game.js:3615-3617).
4. Repetition risk: MEDIUM. Big pool, but same 4-card layout.
5. Juice: particle/combo/streak lines at game.js:3668-3688 (shared helpers). Progress bar.
6. Visual: static picture card with shadow (game.js:3632); no animation.
7. Reuses: `DBLabeled` (games/data/db-labeled.js), `DBSprites`.

## G8 Susun Kata (hub, game.js:3702-3804)
1. Loop: tap shuffled letters into slots to spell the word shown by emoji + hint (game.js:3733-3735).
2. Content: `WORD_BUILD_BANK` about 207 words with tier easy/medium/hard (game.js:714-966). Filtered by age tier and difficulty (game.js:3706-3714).
3. Variety: 1 mechanic. Distractor letter count 2/4/6 by level (game.js:3736-3737).
4. Repetition risk: MEDIUM. Large bank, but one action type.
5. Juice: shared sparkle + sound at game.js:3780-3786; timer lines game.js:3792. No combo, no shake.
6. Visual: emoji hint, static; no animation.
7. Reuses: `pickBag('g8')`.

## G9 Jejak Huruf (hub, game.js:3805-3968)
1. Loop: trace a letter or digit on a canvas following dotted guides; word mode above level 20 (game.js:3815-3824).
2. Content: `LETTER_SEQ_CILIK` 6 / `TUMBUH` 14 / PINTAR 26 / `ANGKA` 10 (game.js:967-1034) and `WORD_LIST_G9` (unconfirmed length). Rounds capped by sequence length (game.js:3826).
3. Variety: 3 sub-modes (huruf, angka, word at level 21+). Real trace input, so it is the most hands-on of the early set.
4. Repetition risk: MEDIUM (finite alphabet, but tracing is physically different each time).
5. Juice: one celebration line (game.js:3868) and sparkle/sound at 3962; no streak, no shake. No stroke-accuracy reward beyond pass/fail (unconfirmed).
6. Visual: plain canvas; no brush effect or stroke trail FX seen.
7. Reuses: pointer-capture helpers (game.js:3920-3922).

## G6 Petualangan Mobil (real game: games/mobil.html; the hub copy game.js:3282-3587 is a legacy screen, index.html:196)
1. Loop: steer a 4-lane PixiJS car (`LANES = 4`, mobil.html:198) to collect the next letter of a target word, dodge road obstacles (mobil.html:886-905, 20% of waves are obstacles).
2. Content: 8 theme word banks of 10-12 words each (`WORD_BANKS`, mobil.html:158-167, about 90 words total), 5 words per run (`totalWords: 5`, mobil.html:188), 20 vehicles (`VEHICLES`, mobil.html:230-246), 5+ sky/road `THEMES` (mobil.html:169-175).
3. Variety: speed ramps with level (`BASE_SPEED = 3.2 + min(level,18)*0.22`, mobil.html:200); theme swaps colours and word bank; vehicle choice is cosmetic. 1 mechanic.
4. Repetition risk: HIGH. 5 words per run from about 11, same lane dodge, nothing new appears at higher levels except speed.
5. Juice: shared VFX boom on crash (mobil.html:1025-1026) and pop on word complete (1110); exhaust particles (`spawnExhaust`, 820); screen flash (1334); word-complete overlay with tiered titles (1109-1118); sound via SFXEngine with tone fallback. No combo meter, no hit-stop (unconfirmed).
6. Visual: PixiJS layers sky gradient, scenery, road, signs, markings (`buildBg/buildScenery/buildRoad`, mobil.html:478-660); real top-view car art for only a subset of vehicles, the rest are emoji (mobil.html:225-228); cinema layer on (1398). Car is a static sprite with lane lerp and tilt (`tickCar`, 755).
7. Reuses: `VFX` (games/vfx-engine.js), `DuniaCinema`, `SFXEngine`. Does not use `RZParallax`, `SceneryEngine` or `RewardCatalog`.

## G10 Pertarungan Pokemon (hub, game.js:4460-6984)
1. Loop: pick a Pokemon from a trainer party, answer a math question, correct answers launch a type-coloured attack, wrong answers hurt your HP; defeat enemies in a battle of rounds (`g10GenQuestion` 6581, `g10Answer` 6656, `g10DoAttack` 6780).
2. Content: `POKEMON_DB` 1024 entries (game.js:4588-5630), 12+ `TRAINER_PARTIES` (game.js:5801), `G10_LEVELS` 1-40 explicit + formula beyond (game.js:6351-6411), enemy pools favorite/mid/boss by level (game.js:6254-6259, 6302). Questions come from the shared `makeGameQuestion` (games/data/math-rules.js:478).
3. Variety: ops grow + to +,- (lv7) to x,/ (lv21+); HP, rounds and max number scale; boss every 10th level (game.js:6371, 6384, 6394, 6410). Type attack FX per type (`G10_TYPE_HIT_FX`, game.js:5699; `g10TypeFX` 6736). 18 enemy species repeat suppressed via ring buffer of 4 (game.js:6262). Mechanics: 1 (answer to attack), but the largest asset variety in the product.
4. Repetition risk: MEDIUM. Huge roster but the question is always one arithmetic choice grid, no status moves, no weather, no move selection.
5. Juice: projectile + defender shake + flash (game.js:6784-6830), hit FX per type (5742), VFX.Poke prime (6583), screen shake lines (6891, 6911), stars on win (6940-6970). No combo meter, no hit-stop, no crit/effectiveness feedback tied to answers (unconfirmed), no collectible drop on defeat (unconfirmed).
6. Visual: DOM + PixiJS (`PixiManager`, game.js:4078); sprites are static images with CSS hit/flash classes (`spr-hit`, `spr-flash`); sprite sheets exist elsewhere (`games/battle-sprite-engine.js`, `games/data/gt-monster-sheets.js`) but are not used here (unconfirmed). Random battle weather per battle: `G10_WEATHERS` clear x3, snow x2, rain x2, wind, night, leaves (game.js:7681-7712, Pixi `pixiWeather` game.js:4238), purely cosmetic (no effect on answers); entrance pop-in animation `pokeEnter` per battle (game.js:7667-7672).
7. Reuses: `makeGameQuestion` / math-rules, `VFX.Poke` (games/vfx-poke.js), `POKEMON_DB`. Not wired: `BattleModes` Adventure/PvP/Tournament is only consumed by games/gym-pokemon.html (grep), not by G10.

## G11 Kuis Sains (hub, game.js:6985-7217)
1. Loop: multiple-choice science question with `explain` text after each answer (`g11ShowQuestion` 7144, `g11Answer` 7172, `g11Next` 7209).
2. Content: `SCIENCE_QUESTIONS` about 102 items tiered tk / sd (game.js:6987-7133). Rounds 6/10/15 per level via `DIFF`.
3. Variety: question topic only. 1 mechanic. No images beyond an emoji per question (`G11_EMOJI_SPRITE`, game.js:7134).
4. Repetition risk: HIGH. 102 items across all age tiers means a child sees repeats inside 3 sessions of hard level; the explain text is the only teaching value.
5. Juice: shared only (streak/shake/sound at game.js:7179-7186). No timer, no unlock.
6. Visual: static card, emoji glyph.
7. Reuses: shared quiz juice. Does NOT use `QuizEngine` (games/quiz-engine.js) or `SuperQuiz` (games/data/question-super-engine.js, only referenced from games/data/soal-engine.js, which kereta-maze, mojo-chase-embed, mojo-swoptops and timmy-kapal load).

## G25 Kuis Matematika, hub shell (game.js:7218-7650, DEAD CODE)
Comment at game.js:7219-7223 states it is dead code, live version is games/kuis-matematika.html. About 430 lines of unreachable code; mention only (not deleted per scope). See the standalone page below.

## G13 Evolusi Math Adventure (hub, game.js:7734-9995)
1. Loop: answer math to attack a wild Pokemon; after `attacksToEvo` correct hits the player Pokemon evolves (`g13TriggerEvolution` 9698, cinematic to 9858), win when wild HP is 0 (`g13Victory` 9897).
2. Content: `G13_CHAINS` 142 chain definitions across EASY/MEDIUM/HARD/EPIC/LEGENDARY/2STAGE blocks (game.js:7738-8434), 59 `G13_FAMILIES` curated selectors (game.js:8518+), 7 difficulty presets (`G13_DIFF` 8435-8444).
3. Variety: 1-3 evolution stages (`stages` field), Mega/Gmax/Ash-form aura overlay (game.js:8500-8517), per-chain op sets, type attack FX (`g13SpawnAttackEffect` 9382, `g13TypeHitFX` 9456), evo penalty on wrong (`g13EvoPenalty` 9309), wild counter phase (9595), family selector UI (8964). Distinct mechanics: answer-attack, evolve cinematic, counterattack phase = 3.
4. Repetition risk: LOW-MEDIUM. Evolution is a real payoff and 142 chains is the biggest content set; question grid is still the same.
5. Juice: evolve cinematic + SFX (`g13PlayEvoSfx` 9859), flash (9666), HP bars (9282), evo progress bar (`g13UpdateEvoBar` 9318), celebrate lines 9356/9568. No hit-stop (unconfirmed), no collection persisted after evolving (unconfirmed).
6. Visual: DOM sprites with aura classes, Pixi weather (`applyG10Weather` is shared with G10 and called from the G10 entrance hook, game.js:7676-7712) and mega aura; sprites are static images.
7. Reuses: `POKEMON_DB`, `PixiManager`, `makeGameQuestion`. The `G13_CHAINS` evolution data duplicates what a "Pokedex" collectible could show (see improvements).

## G13b Quick Fire (hub, game.js:9996-10978)
1. Loop: 60 s timer, answer math to defeat a stream of wild Pokemon, catch each (ball picked from 10 ball types, `G13B_BALLS` game.js:10016-10020), legendary every 10 kills needing 3 hits (`g13bTriggerLegendary` 10668), player HP 10 (game.js:10196).
2. Content: `G13B_WILDS` = whole `POKEMON_DB` minus legendaries (game.js:10022-10028, about 900+ species), `G13B_LEGENDARIES` from `_LEGENDARY_IDS` (game.js:10030+), city packs override pool when a city is selected (game.js:10252-10262), mobile/PC backgrounds `G13B_MOBILE_BG`/`G13B_PC_BG` (game.js:9998-10015).
3. Variety: normal wild vs legendary boss every 10 kills, wild escape (`g13bWildEscape` 10576), wild hits player (10790), combo meter with lightning bolts and Pixi combo text (`g13bShowCombo` 10726-10752, `pixiComboText`), catch animation (10611). Mechanics: 4 (timed kill, catch, legendary boss, wild counter).
4. Repetition risk: LOW. Best-paced hub game; 60 s arcade with escalating legendary.
5. Juice: combo bolts + Pixi combo burst (10726), streak render (10755), shake lines 10524/10693/10701, sound 10442/10519, game over/level complete overlays (10842, 10896). Kill counter `g13bUpdateKills` 10834. Best combo tracked (`bestCombo`, game.js:10197). No persistent collection of caught species (unconfirmed).
6. Visual: layered PC/mobile battle backgrounds, static Pokemon art with CSS idle at 10622-10633; no parallax.
7. Reuses: `PixiManager`, `CITY_PACK`, `registerCleanupHook` from freeze-watchdog (game.js:10186-10194). Combo meter here is the strongest reusable one (not shared with other games).

## G13c Gym Huruf & Suara (hub, game.js:1415-1857; launches games/gym-pokemon.html, game.js:1504)
1. Loop: pick a letter, 3-choice "which picture starts with this letter" rounds, progress dots (`g13cShowRound` 1550-1584).
2. Content: `G13C_ITEMS` about 94 words across 26 letters, 3-6 per letter (game.js:1417-1500), with `skip` / `close` flags on rejected items; `G13C_DISTRACTORS` per letter.
3. Variety: 1 mechanic; letter selection grid (`g13cBuildLetterSelect` 1507). Several rows are flagged `/*close*/` (e.g. Awan for A, Ayam shown with an eagle emoji, game.js:1418) meaning wrong-letter or wrong-image entries remain in data.
4. Repetition risk: HIGH. 3-6 words per letter means the same word within a single letter run.
5. Juice: confetti (game.js:1841), streak/shake/sound (1593-1608), progress dots, result screen (1619).
6. Visual: emoji tiles with large glyph, static.
7. Reuses: `launchConfetti`. Real gym (trainers, battle) lives in games/gym-pokemon.html.

## Hub train entries (games/hub/g14-g16-trains.js): G14, G15, G16, G17, G18
- `initGame14/15/16` are redirect stubs to standalone pages (g14-g16-trains.js:637, 1175, 1308); `standaloneGames = [6,14,15,16,19..25]` (game.js:1847). The hub G15 tile actually opens `games/mojo-swoptops.html?pack=kereta&hub=1` (index.html:946, tile id gtile-15), while `initGame15` opens `games/lokomotif-pemberani.html` (g14-g16-trains.js:1175). Two entrances, two different games under one name.
- G17 Jembatan Goyang is removed: `initGame17` hard-exits (g14-g16-trains.js:1670-1680); about 270 lines below are dead code (whack-a-mole, removed v54.7). Mentioned, not touched.
- This file's real payload is train art: SVG builders per type (g14-g16-trains.js:172-503) and `G14_CATEGORIES` with about 68 train entries (g14-g16-trains.js:518-611), reused by the standalone pages.

## G14 Balapan Kereta (games/balapan-kereta.html, 7477 lines)
1. Loop: 3-lane PixiJS rail runner, dodge obstacles, collect pickups, tap BOOST which opens a math chip (QuizEngine) to get a speed burst (`buildQuiz` 5914, `executeBoost`), race AI trains to the station of the leg.
2. Content: 48 route legs (`name: 'A -> B'` rows, balapan-kereta.html:1208-1300; L1-30 Indonesia route, L31-33 East Java, L34-48 world scenic journeys, lines 1208-1247), 6 biome THEMES (1185), TIME_PHASES day/dusk/night (1637), about 68 selectable trains (g14-g16-trains.js:518-611), obstacle pools per biome `OBS_PER_BIOME` (4008), 9 distinct `landmark:` keys across the 48 legs (counted in lines 1208-1300, so legs share silhouettes; `g14Landmark` at balapan-kereta.html:1525, `IndoScene` drawers).
3. Variety: new landmark and region per leg, time-of-day overlay, biome-specific obstacles, pickups (`spawnPickup` 4639), scripted obstacle-engine events with stickers and badges (5397-5426), boost quiz. Distinct mechanics: lane dodge, pickups, boost-quiz, AI race, obstacle-engine scripted route events = 5.
4. Repetition risk: LOW-MEDIUM after 3 sessions (48 legs, real landmarks). Weakest point is the inner loop: the same dodge + same arithmetic chip across all 48 legs.
5. Juice: confetti, particles (1910, 2037), crash zoom 1 to 1.08 instead of rotational shake (3590-3600, deliberate for sensory comfort), slow-mo while the quiz chip is open (4915-4920), reduced-motion respected (`g14ReducedMotion`, 6 uses), streak (1689, 2038), boost FX (`spawnBoostFX`), speed lines (`tickSpeedLines`), sticker collection (RewardCatalog + RewardGallery button, 417). No true hit-stop (the code comment says "hit-stop via scale", 3596).
6. Visual: strongest in the product. Sky, clouds, birds, signal posts, km markers, far/mid/fore scenery with 2.5D parallax (`buildFarScenery` 2269, `buildMidScenery` 2353, `buildForeScenery` 2388, `tickFore`), tracks, contact shadows (`g14ContactShadow`), weather (`tickWeather`), train sprite as WebP with procedural fallback; cinema layer loaded (7475).
7. Reuses and exports: `QuizEngine`, `ObstacleEngine` + `games/data/obstacles.js` (2571 lines), `RewardCatalog` (18 entries, `games/data/reward-catalog.js`), `RewardGallery`, `VFX.Moment`, `train-bg-engine`, `DuniaCinema`.
8. Owner rule check: white sticker outline is drawn on obstacles by design (`_oaInk` white stroke, width 5, alpha 0.92, balapan-kereta.html:4067-4070). Conflicts with "no white sticker outline on sprites" unless that rule only covers characters (unconfirmed).

## G14b Balapan Kereta Side Race (games/balapan-kereta-side.html, 2255 lines, labelled Beta, title line 16)
1. Loop: side-scrolling rail runner with one JUMP button (tap anywhere / Space), avoid obstacles, collect coins and hearts, reach milestones and a finish flag (`setupInput`, `spawnObstacle`, `spawnCoin`, `spawnHeart`, `spawnMilestone`, `spawnFinishFlag`).
2. Content: 5 obstacle types only: rock, branch, barrier, water, cow (`OBSTACLE_TYPES`, balapan-kereta-side.html:1630+). Uses the same leg names as G14 (balapan-kereta.html:1205 comment). Entered only from G14 (balapan-kereta.html:477), not from the hub (index.html has no link; unconfirmed in sw.js only).
3. Variety: terrain height changes (`terrainHeightAt`), time of day (`pickTimeOfDay`), train choice. 1 mechanic, no questions at all (no QuizEngine, so zero learning content).
4. Repetition risk: HIGH. One verb, 5 obstacles.
5. Juice: confetti (120-122), shake (80-81, 1545), particle (325, 564), landing dust (`spawnLandingDust`), pause tips (`G14S_PAUSE_TIPS`), tutorial + countdown + pre-race banner. 2 "armed" CSS squash on the jump button (53). No combo meter, no hit-stop.
6. Visual: shared `SceneryEngine` (scenery-engine.js, loaded 183) with layered mountains and sun, shared painterly backdrop (184, 326), clouds, procedural side loco (`drawProceduralSideLoco`), shadows per obstacle (`_g14sAddShadow`). Parallax n=12.
7. Reuses: `SceneryEngine` (this is its only consumer, grep matrix), `train-bg-engine`, `VFX`, `DuniaCinema`, `RewardCatalog` is loaded but no consumer of its stickers confirmed here.

## G15 Lokomotif Pemberani (games/lokomotif-pemberani.html, 4659 lines)
1. Loop: 3-lane train collects the letters of a target word in order, math boxes ('?') pop a quiz, heart boxes give lives, speed streak and station milestones along the same 48-leg route (`spawnLetterBox` 2208, `spawnSpecialBox` 2226, `showMathQuiz` 2704, `onWordComplete` 2935).
2. Content: `WORDS` easy 15 / medium 15 / hard 12 words (lokomotif-pemberani.html:811-830), `WORD_COUNT = min(3 + floor(level/5), 6)` words per run (line 837-838), math via `genMathQuestion`. Same station route as G14 via shared getCurrentStation.
3. Variety: letter collection + math box + heart box + station ribbon/journey map (`g15ShowJourneyMap`) + assist offer after repeated misses (slow-mo + magnet or +1 life, lines 2385-2396) + speed streak (`g15SpeedStreak`) + train type (steam/diesel/electric/high-speed/heritage body drawers). 5 mechanics.
4. Repetition risk: MEDIUM. 42 words, but the lane/letter loop is the same shape as G6 Mobil.
5. Juice: strongest streak system in the train set (31 streak hits, `g15StreakAdd/Reset`), real slow-mo via `app.ticker.speed = 0.55` in `g15AcceptAssist` (about 2394; a separate `g15BriefSlowMo` also exists), letter chime per index (`g15LetterChime`) and word-complete arpeggio, particle bursts (50 hits), vignette (`g15UpdateVignette`), math "iris" transition (`g15MathIrisIn/Out`), rainbow (`spawnRainbow`), clatter loop (`g15StartClatter`), floating damage labels, TTS toggle (`g15ToggleTTS`). Confetti only at win (2945-2956).
6. Visual: Pixi tracks, 5 procedural body drawers (`drawSteamBody` ... `drawHeritageBody`), cloud/parallax (905-909), character idle (`g15TickCharIdle`), steam emitter, smoke billow, contact shadows (96 shadow hits).
7. Reuses: `VFX`, `VFX.Moment`, `ObstacleEngine`, `RewardCatalog`/`RewardGallery`, `train-bg-engine`, `DuniaCinema` (4657). No `DuniaMastery` feed.

## G16 Selamatkan Kereta (games/selamatkan-kereta.html, 3474 lines)
1. Loop: a train runs toward obstacles on a track; a quiz panel pops, correct answer clears the obstacle (mini obstacle or explosion), wrong answers brake the train; arrive at the station with a fireworks celebration (`showQuizPanel` 2786, `onChoiceTap` 2817, `explodeObstacle`, `triggerArrival` 3057, `spawnFireworks`).
2. Content: `QUESTIONS` easy 26 + medium 21 + hard 20 + expert about 27 entries, 94 `{q:...}` total (selamatkan-kereta.html:850-941, tiers at relative lines 2, 26, 47, 67), 36 `TRAIN_STYLES` (319), 30 `LEVEL_THEMES` (415), `getDifficulty` easy/medium/hard/expert by level (selamatkan-kereta.html:934).
3. Variety: question types are mixed (letter-initial, addition/subtraction, colour); adaptive difficulty extends braking distance when 2+ wrong taps at a station (`g16ApplyAdaptiveDifficulty` 1331, 2453); fresh-question filter (`g16FilterFreshQuestions` 1130); danger meter (`g16TickDanger`); mercy hearts (`g16HeartFallFromMercyDot`); character barks and bubbles (`g16PlayCharacterBark`, `g16CharBubble`). 4 mechanics.
4. Repetition risk: MEDIUM-HIGH. 94 questions across 4 tiers means about 20-27 per tier; the fresh-question filter delays repeats but a child who stays on easy will see everything within 3 sessions. Questions use emoji as the picture (`'🐱 Huruf awal?'`).
5. Juice: strongest FX set of the train pages: streak badge (`g16ShowStreakBadge`), milestone, tap tick, steam burst, brake sparks, quiz celebration FX, fireworks, arrival station build (`buildArrivalStation`), stage punch (`updateStagePunch`), crash SFX, hit-stop at 1095 (unconfirmed whether real or flash), screen shake (66, 843).
6. Visual: Pixi sky/hills/far band/foreground/cliff/track decorations, headlight beam, fire glow, ambient embers and dust; 36 train styles incl. character sprite ones (Casey Jr, line 320); preview bob animation (`g16StartPreviewBob`); parallax n=5.
7. Reuses: `ObstacleEngine`, `RewardCatalog`, `RewardGallery`, `VFX.Moment`, `train-bg-engine`, `DuniaCinema` (3472). No `DuniaMastery` feed.

## G18 Museum Kereta Ambarawa (games/museum-kereta.html, 2262 lines)
1. Loop: browse 36 trains by tab (uap klasik, uap modern, diesel, listrik ...), read story cards, take an 8-question quiz (`G18_QUIZ_COUNT = 8`, line 1158) and collect passport stamps per train world (`g18PassportStamp`, line 1760).
2. Content: `G18_TRAINS` 36 entries (museum-kereta.html:656-1000), `G18_QUESTIONS_BANK` 150 questions (1001-1157), `museum-lore.js` 1655 lines of facts (games/data/museum-lore.js), tab labels (1224), per-child passport via save-engine (1739-1760, v61.5 comment).
3. Variety: browse, story (`g18BuildCerita`, `g18EraStory`), quiz, passport. 3 mechanics, but only the quiz is active play.
4. Repetition risk: LOW. It is a reference experience; seeded shuffle + `g18FilterRecent` avoid repeats (1161-1165).
5. Juice: no-op streak stubs (`quizStreakHit(){ /* no-op */ }`), tone-based SFX (playCorrect 3-note), confetti at result (1822-1831), pop/shake classes. Passport stamps are the only persistent reward. No combo meter.
6. Visual: SVG locomotive builders per type (`buildSteamLocoSVG`, `buildDieselLocoSVG`, `buildElectricLocoSVG`, `g18TrainSVG`), WebP world art with SVG fallback (`g18ArtFallback`), white sticker outline diorama look (museum-kereta.html:576).
7. Reuses: `VFX.Moment`, `DuniaCinema`, SVG loco builders duplicated from g14-g16-trains.js (the same function names `buildSteamLocoSVG` appear in both, unconfirmed whether copied). No `DuniaMastery` feed.

## Question-source finding (applies to G19 to G24)
`games/data/g23-question-engine.js` (486 lines, "1000+ questions split by age group", lines 1-14) exports `G23_pickQuestions` (line 407) and `G24_pickQuestions` (line 462). A script tag exists only in `pokemon-run.html` and `pokemon-bawah-laut.html`, and both call it (`pokemon-run.html:723`, `pokemon-bawah-laut.html` `pickQuestions`). `pokemon-birds.html` and `ducky-volley.html` only carry a comment saying the bank lives there (birds:308, ducky:206) but have no script tag and no call, so they run on tiny legacy banks (72 and 14 questions). `mario-pokemon.html` uses `makeGameQuestion` from math-rules. `monster-candy.html` uses `QuestionBank` (games/question-bank.js, 4 pools math/warna/hewan/buah, about 19 q-lines, only consumer). Pointing birds and ducky at the existing engine is the cheapest variety fix in the product.

## Mastery and learning-log coverage (cross-cutting)
`data/mastery.js` has a script tag only in ayo-berhitung, kereta-maze, kuis-matematika, mojo-swoptops, timmy-kapal. The other pages (all arcade, train, Pokemon and hub games) do not emit `DuniaBus 'answer'` events (grep count 0 for DuniaBus/DuniaMastery/LearningLog), so question difficulty there never adapts to the child. Earlier draft mentions of `DuniaMastery` for train pages were wrong and are removed: the 'mastery' hits in those pages are comments about an achievement (balapan-kereta.html:5575, lokomotif-pemberani.html:3300, selamatkan-kereta.html:3112, museum-kereta.html:1822, 2223).

## G19 Pokemon Birds (games/pokemon-birds.html, 1540 lines)
1. Loop: Flappy-style flight through pipes, a quiz gate at each pipe, evolve the bird Pokemon as progress passes thresholds (`buildPipes`, `showQuiz` , `applyPokemon(evoStage)` pokemon-birds.html:921-923).
2. Content: `QUESTIONS` 72 questions in 4 tiers (pokemon-birds.html:234-311), 6 `LEVEL_THEMES` (364), `PIPE_COUNT = 14 + min(floor((level-1)/5), 6)` pipes per run (396), 29 selectable Pokemon with evolution stages (`G19_POKEMON` 147+).
3. Variety: question colour-swatch rendering for non-readers (`makeColourSwatch`), bird evolution mid-run (923), 6 backgrounds, pokemon bag (`openBag`). 2 mechanics (flap, quiz gate) + evolve.
4. Repetition risk: HIGH. One gate type; 72 questions, same pipe silhouette.
5. Juice: sfx synth tones (flap, score, hit, correct, wrong, 97+), floating text, flash, tickParallax. No confetti beyond win, no combo, no shake beyond CSS (46,48). Win screen with stars (`showWin`).
6. Visual: parallax layers (`tickParallax`, 513-571), static Pokemon image with evolve scale (`applyPokemon`); no animated sprite sheet.
7. Reuses: `DuniaCinema`, `VFX`, `getDifficulty` duplicated verbatim from G16 (same function in selamatkan-kereta.html:934 and pokemon-birds.html).

## G20 Ducky Volley (games/ducky-volley.html, 1602 lines)
1. Loop: beach volleyball vs a CPU duck; physics rally, score a point, quiz after round events (`checkRoundEnd`, `showQuiz` 1345, `updateCPU`, `predictBallLandingX`).
2. Content: only 14 hand-written questions (`QS`, ducky-volley.html:182-190; math 9, colour 3, letter 2). CPU skill scales with level (accuracy 0.62 + level*0.014, line 1148; reaction jitter 1150). Pokemon opponent/player sprite choice (`showPokeSelector`).
3. Variety: per-round physics re-rolled (`randomizePhysics` 300, gravity +-5%, bounce, net height); ambient crab and dolphin (`updateCrab`, `spawnDolphin`); power-up SFX exists (`sfxPowerup`) but a power-up item was not found (unconfirmed). 1 mechanic.
4. Repetition risk: HIGH on questions (14), MEDIUM on rally (physics varies slightly).
5. Juice: sand spray, confetti (`spawnConfetti` 824), ball trail (`spawnTrail`), smash/bounce/whistle/thud SFX (74-152), squash on duck (`drawDuck(... squash)`), shake (49-51, 283). No combo, no hit-stop (unconfirmed).
6. Visual: parallax beach (`initParallax`, 343-370), duck drawn in Pixi Graphics (`drawDuck`), shadow under ball; sprites from poke-sprite-loader. No sprite sheet, procedural duck only.
7. Reuses: `DuniaCinema`, `VFX`, SFXEngine; does not load the shared question engine (see above).

## G21 Mario Pokemon (games/mario-pokemon.html, 2741 lines)
1. Loop: Pixi tile platformer: run/jump with Pikachu, stomp goombas, hit Q-blocks to trigger a math quiz for coin/mushroom/star, shoot bolts, reach the goal (`gameLoop`, `triggerMathQuiz`, `tryFireBolt`, `checkGoal`).
2. Content: 8 hand-authored levels (`LEVELS`, mario-pokemon.html:407-560, comments at relative lines 2, 20, 38, 57, 77, 97, 117, 138: gentle intro, cave, sky, boss-like, desert, ice palace, sky temple), themes default/cave/sky/lava/ice (803-830), questions from `makeGameQuestion` with level cap 30 (lines 484-490) so questions scale beyond level 8.
3. Variety: level themes, pits, spikes, Q-block types (coin/mushroom/star), goombas, bolt power, knockback, lives from coins (`checkLifeFromCoins`), score popups, milestone toasts. Distinct mechanics: platform movement, stomp, quiz block, bolt shot, collectibles = 5. Best variety-per-session among the Pokemon pages.
4. Repetition risk: LOW-MEDIUM; level 9+ repeats the 8 maps (unconfirmed how levels >8 map).
5. Juice: particles (`spawnParticles`), screen shake (`screenShake`, 136-138), combo lines (309-311), score popup, bolt trail, win modal with stars (`showWinModal`), milestone banner, sfx via audio elements (`sfx`). No hit-stop (unconfirmed).
6. Visual: 3-layer parallax (`buildFarLayer`, `buildMidLayer`, `buildNearLayer`, parallax n=50), per-theme decorations (`makeDecoration`), Pikachu as 4 animated GIFs idle/running/jump/happy (`PIKA_ANIMS`, mario-pokemon.html:1623-1628). GIF-based animation, no sprite sheet.
7. Reuses: `makeGameQuestion` (math-rules), `VFX`, `DuniaCinema` squash/stretch on jump (dunia-cinema.js header, "body" hook).

## G22 Monster Candy (games/monster-candy.html, 1350 lines)
1. Loop: candy falls as pokeballs, catch with a Pokemon at the bottom, answering a quiz per ball for category FX (`spawnCandy`, `catchCandy`, `showCandyQuiz`).
2. Content: shared `QuestionBank` pools math/warna/hewan/buah (about 19 q-lines in question-bank.js), 9 ball types cycling 4 categories (monster-candy.html: `BALL_CAT_KEYS`), `BALL_COLORS`, 4 category FX: number burst, rainbow spiral, gold paws, purple leaves (`fxNumberBurst`, `fxRainbowSpiral`, `fxGoldPaws`, `fxPurpleLeaves`), `spawnBubblePop`, laser swap (`laserAbsorbSwap`).
3. Variety: 4 categories + category-specific FX + Pokemon picker (`renderPokePicker`). 2 mechanics (catch, quiz).
4. Repetition risk: MEDIUM-HIGH; small pools (math pool 50 items by 13 max sum).
5. Juice: combo (20 hits at 129, 189, 759), catch rings (`spawnCatchRing`), category FX, VFX combo-milestone pop (script comment line near 1348 for VFX), whoosh/swoosh sfx rate-limited. No unlock.
6. Visual: parallax (`updateParallax`, 271-277), Pokemon sprites static, ball sprites.
7. Reuses: `QuestionBank` (sole consumer), `VFX`, `DuniaCinema`.

## G23 Pokemon Run (games/pokemon-run.html, 2979 lines)
1. Loop: auto-runner with jump, obstacles with embedded quizzes (`spawnObstacle`, `showObstacleQuiz`), quiz gates (`spawnQuizGate`, `showRunnerQuiz`), power-ups (blaze/venom auras and projectiles `spawnPowerUp`, `activatePowerUp`, `spawnPowerUpProj`), plus Team Rocket balloon battle with move selector (`spawnTRBalloon`, `engageTRBattle`, `showMoveSelector`).
2. Content: question engine `G23_pickQuestions` 1000+ items (g23-question-engine.js:1-14), 8 to 16 questions per run (`pickQ` pokemon-run.html:723, `Math.min(8 + floor((level-1)*0.6), 16)`), legacy `QUESTIONS` 53 q (pokemon-run.html:608), 2 BGM tracks by level parity (bgmStart), several power-up types and collectables (`sfxCollectByType`).
3. Variety: 5+ mechanics (jump, obstacle quiz, gate quiz, power-up shot, Team Rocket battle, weather). Richest run-and-quiz page.
4. Repetition risk: LOW.
5. Juice: 86 particle hits, projectile + type hit FX (`spawnProjectile`, `spawnTypeHitFX`), confetti (357, 2352), hit-stop line 344 (unconfirmed real), combo/streak (351-353, 948), shake (131, 165), battle BGM switch, fanfare. Weather (`WeatherFX` loaded).
6. Visual: scrolling bg layers (`initBgLayers`, `scrollBgLayers`), aura particle pools per power-up (blaze/venom bubbles, drips), Team Rocket GIF balloon (line 208).
7. Reuses: `WeatherFX`, `VFX`/`VFX.Poke` (vfx-poke.js), `G23` engine, `DuniaCinema`.

## G24 Pokemon Bawah Laut (games/pokemon-bawah-laut.html, 1815 lines)
1. Loop: swim a Pokemon between stalactites/stalagmites, answer quiz at gates (`createSwimmer`, `buildCliffs`, `showQuiz`).
2. Content: 4 `REGIONS` (Pantai Kanto first, each 10 levels, pokemon-bawah-laut.html:190), per-region NPC sets (`NPC_TYPES_BY_REGION`, 915-921), `QUESTIONS` 68 (317+), whale and diver mega NPCs (`spawnWhale`, `spawnDiver`).
3. Variety: region palette + ambient fauna per 10 levels; bubbles, seaweed, floor (`initBubbles`, `initSeaweed`). 1 mechanic (swim + quiz), very close to G19 flap-and-quiz.
4. Repetition risk: HIGH.
5. Juice: sfx tones (swim, score, hit, correct, wrong), small particles (1226-1332), no combo, no streak, no confetti found (grep n=0), no shake beyond CSS (46-48).
6. Visual: parallax layers (`initParallaxLayers`, `updateParallaxLayers`), ambient creatures; NPC art is emoji (815-921, `🐠 🦈 🐋`), Pokemon sprite static.
7. Reuses: `DuniaCinema`, `VFX`; uses `G24_pickQuestions` from the shared engine (script tag line 164) with the 68-question bank as fallback.

## G25 Matematika Petualangan (games/kuis-matematika.html, 1882 lines; hub tile redirects, game.js:1656)
1. Loop: choose a skill/operation, face a monster in a hero-vs-foe fight, answer math to attack, story banter before and after, earn stars on a 10 x 10 world map (`startGame`, `answer`, `heroAttack`, `foeAttack`, `mpStoryIntro`, `mpVictory`).
2. Content: `WORLDS=10, SUBS=10, MAX_LEVEL=100` (kuis-matematika.html:788), 281 monster sprites each with its own story arc (`MON_COUNT=281`, line 789; `data/math-stories.js`, 1665 lines: `{name, sub, intro, banter[], victory}`), hero roster per operation (`data/math-heroes.js`, 78 lines), question generator `makeMathQuestionV2` with `forceOps` (line 1115; the 5-shape list `G25_SHAPES` is in the dead hub block, game.js:7236, standalone use unconfirmed), tier by level (`tierFor`: easy up to 34, medium to 67, hard beyond; `qCountFor` 6/8/10 questions per run).
3. Variety: operation choice (`toggleSkill`), monster per fight, boss rows (boss n=21 hits, lines 133-199), economy of coins, gems, energy with regeneration (`loadEcon`, `regenEnergy`, `addCoins`, `addGems`, lines 826-880), world map `renderPeta`/`pathSVG`. Mechanics: 4 (fight, skill select, economy/energy, map progression).
4. Repetition risk: LOW. 100 levels, 281 stories, mastery feed to `DuniaMastery`.
5. Juice: confetti (425, 1339, 1413), particles (416-417), combo (313-320), shake (253-313), streak (830-846), cue sounds via SFX engine (774, 909), count-up numbers (`countUp`), damage pop (`dmgPop`), `celebrate` (1169, 1289). No hit-stop found (unconfirmed).
6. Visual: character animation via CSS attack classes `attack-hero`/`attack-foe` (static WebP sprites that translate), 3 background parallax hits (100, 207-209), monsters are WebP stills from `assets/math/monsters/`.
7. Reuses: `makeMathQuestionV2` (math-rules.js), `MathCloud` sync (data/math-cloud.js), `DuniaMastery`, `MATH_STORIES`, `MATH_HEROES`, `DuniaCinema`.

## G26 Ayo Berhitung (games/ayo-berhitung.html, 935 lines + games/data/berhitung-engine.js, 443 lines)
1. Loop: deterministic worksheet of arithmetic cards (seeded session `buildSession({operation, difficulty, questionCount, mode:'worksheet'})`, ayo-berhitung.html:389, 779), hints and word problems, "Ulangi Halaman" replays the identical page.
2. Content: procedural; word-problem templates in Indonesian (`berhitung-engine.js` templates: kelereng, kue, gerbong, permen, buku, ayam). No fixed bank; difficulty and operation chosen by the child.
3. Variety: operation x difficulty x page; word vs symbolic. 1 mechanic, practice not play.
4. Repetition risk: HIGH by design (worksheet), but deterministic seeds make it honest (engine header, lines 1-15).
5. Juice: minimal. Card celebrate `just` class 600 ms (ayo-berhitung.html:596-603), shake 6 hits, no confetti, no particles, no streak. Mastery recorded.
6. Visual: flat cards, sliding pill control (70-74); no scene, no character.
7. Reuses: `Berhitung` engine, `DuniaMastery`, `DuniaCinema`. It is the plainest page in the product and the best candidate for a reward layer.

## G27 Spelling Adventure / Ejaan Inggris (games/ejaan-inggris.html + ejaan-inggris.js 813 lines + g27-scene.js 436 + data/spelling-data.js 498)
1. Loop: hear the word (pre-rendered clip), drag or tap letter tiles into slots to spell it, ask for definition / part of speech / sentence like a spelling bee (`ejaan-inggris.js` header lines 1-21).
2. Content: 330 words in 25 categories (`SpellingData.WORDS`, `CATEGORIES`, checked by running the file in node). Level 1 words up to 5 letters, level 2 longer ones; levels are drills, never locks (spelling-data.js:16-20). Audio per word, letter, definition, sentence, part of speech (ejaan-inggris.js:79-90).
3. Variety: category backdrops with presets (dust, pollen, sunbeam, stars, confetti) and truck/digger character reactions (g27-scene.js header). Mechanic count: 1 (spell) + bee asks.
4. Repetition risk: MEDIUM. 330 words is large, but there is only one verb.
5. Juice: confetti (547-575), per-letter sound, celebration (239-241), progress, character hop on right letter, wince on wrong, cheer on solved word (g27-scene.js lines 12-16). No combo meter, no collectible.
6. Visual: `RZParallax` depth parallax with gyro / pointer / idle Lissajous drift, character bob + engine rock, canvas particle preset per backdrop (g27-scene.js:1-30). Best use of `RZParallax` in the product (it is the only user besides QuizEngine).
7. Reuses: `RZParallax` math (parallax-engine.js), `DuniaSpeak`, `DuniaCinema`.

## G28 The Stinky & Dirty Show (games/stinky-dirty.html + stinky-dirty.js 378 + sd-engine.js 519 + data/sd-cards.js 583)
1. Loop: a short staged story (beats show/move/hop/hide/cover/say), then a question about what happened, 2 hints, explanation (`SDEngine` header lines 1-11).
2. Content: 6 worlds x 12 skill families = 72 cards (`SDCards.WORLDS` 6, `CARDS` 72, checked in node), 8 question archetypes: choice, image, multi, sequence, drag, match, find, count (sd-cards.js header lines 1-20). Each answerable with sound off.
3. Variety: 8 archetypes with staged animation. Highest mechanic variety of the learning games relative to its size.
4. Repetition risk: MEDIUM-LOW. 72 cards only, each a unique story; one card per family at L1 (Phase 1 per header), so levels 2 and 3 are not present (unconfirmed).
5. Juice: sound lines (stinky-dirty.js 3-32), hop/hide animation, `VFX.Moment` loaded (matrix), no confetti on result in stinky-dirty.js (grep n=0) and no streak. Celebration 1 hit (236).
6. Visual: stage with shared sprite library animals (`assets/db/lib`) plus mascot sprites; parallax 4 hits in sd-engine (72, 142, 167), weather 2 (117-118).
7. Reuses: shared `assets/db/lib` sprites, `g27:` props, `VFX.Moment`, `DuniaCinema`.

## G29 Garasi Tempur (games/garasi-tempur.html 206 + garasi-tempur.js 1133 + gt-engine.js 446 + gt-fx.js 559 + gt-quiz.js 411 + data/gt-cards.js)
1. Loop: monster-truck card battle (adventure, vs computer, 2 players on one tablet): pick attack, answer a Boost challenge, replay deterministic engine events (`GTEngine` header: `apply`, `legal`, `ai`, `preview`).
2. Content: 174 trucks, 6 types, 12 parts, 13 actions, 3 fuel, 3 arenas, 4 starters (`GTCards` checked in node, `data/gt-cards.js`, `data/gt-trucks.js`).
3. Variety: type grammar 6 types to 6 effect kinds (POWER fire, TECH electric, MUD water ... gt-fx.js:19), arena modifiers, parts and fuel strategy, AI levels rookie/racer. Mechanics: 5 (type counter, parts, fuel, boost quiz, arena).
4. Repetition risk: LOW. It is the only strategic game; the 2-player mode adds re-play value.
5. Juice: strongest FX phases in the product: wind-up, hit, RECOIL 420 ms blink + smoke + tyre dust, drain, KO slow-mo hang + explosion + card spin + confetti + fanfare (gt-fx.js:10-20); hit-stop 4 hits, `slowmo()` effect (gt-fx.js:348); shake 7; streak 2. Truck art with idle animation in `gt-monster-anim.js`.
6. Visual: card art + monster animation module, parallax 9 hits in gt-fx, shadows 10.
7. Reuses: `VFX` (vfx-engine), `DuniaCinema`, SFXEngine; `GTEngine` is the cleanest pure engine (could back more battle games).

## G30 Timmy & Kapal Legendaris (games/timmy-kapal.html + timmy-kapal.js 1451 + tk-*.js about 12,000 lines + data/tk-*.js)
1. Loop: hub of 21 worlds, each with levels of 7 types: story 7, grid 86, quiz 20, chapter 10, lanes 29, sort 19, steer 19 (190 levels, checked in node via `TKWorlds.WORLDS`); chapters chain steps with cinema scenes, reflection and fragment collection (timmy-kapal.js header lines 6-18).
2. Content: 21 worlds, 190 levels, 7 `LEGENDS` worlds (tk-worlds-legends.js), 713 questions in 5 domains (`TKQuestions.items`), atlas chart (data/tk-atlas.js, 690 lines).
3. Variety: 7 level types in one product, per-avatar save of xp, stars, fragments, cards, badges, mastery (timmy-kapal.js:6-8), chapter cinema checkpointing. Mechanics: 7+.
4. Repetition risk: LOW; largest content set. Risk is discoverability (heavy hub, `tk-hub.js` 1047 lines).
5. Juice: `tk-steer.js` confetti 6, particle 11, shake 7, combo 11, streak 2; `tk-grid.js` particle 17, sound 35; `tk-cinema.js` shake 11, particle 5, parallax 10; "never a game over" design (header). Rewards: fragments, cards, badges, XP.
6. Visual: cinema scenes (tk-cinema.js 2027 lines), sea scene (tk-sea.js), board look (tk-board-look.js), art atlas (data/tk-art.js), parallax per scene; `DuniaGLFX` bloom on the opaque canvas scene (dunia-cinema.js header).
7. Reuses: save-engine, `DuniaMastery`, `VFX.Moment` (tk-lanes, tk-quiz, tk-steer), `DuniaCinema`. Mirrors the Mojo/Kereta programmable-grid family (`tk-grid.js`, 2911 lines, runs the 86 'grid' levels; whether it shares code with `prog-grid.js` and `kereta-grid.js` is unconfirmed).

## G31 Mojo Swoptops and Mojo Chase (games/mojo-swoptops.html + mojo-swoptops.js 2000+ lines + mojo-chase.js + data/mojo-levels.js, mojo-chases.js)
1. Loop: OBSERVE, SWOP (change form), PLAN (build a command program), RUN, DISCOVER, DEBUG, RESCUE (mojo-swoptops.js header 1-10). A "chase" beat (3-lane auto-run with hearts and a capture rocket) runs after a grid beat (mojo-swoptops.js:1760).
2. Content: 56 levels in 18 chapters, 8 forms (`MojoLevels` checked in node), 47 chase stages and 3 adventure chains (`MojoChases.STAGES` 47, `ADVENTURE` 3), packs (`mojo-pack.js`) that reskin the same engine (kereta pack = the G15 hub tile).
3. Variety: programming puzzle + chase + microgames + hint ladder; two game types inside one entry. Mechanics: 4+.
4. Repetition risk: LOW-MEDIUM.
5. Juice: chase: particles 48, hit-stop 9 (mojo-chase.js:102, 330, 603), shake 13, combo 4, confetti 6; swoptops: hit-stop 2 (1410, 1421), confetti 5 (154, 1814). Owner rules baked in: no emoji, no failure words, reduced-motion respected (mojo-chase.js header).
6. Visual: segment-ring track, scene with parallax/weather/light (`mojo-chase-scene.js`, `mojo-chase-atmos.js`), pooled particles (`mojo-chase-fx.js`), hero sprites with turn/rear/top views (mojo-swoptops.js:1976 `CHASE_DIRS`), character sprite-sheet (`sprite-frames` hit at mojo-swoptops.js:1265).
7. Reuses: `ProgGrid` (prog-grid.js), `DuniaGLFX`, `VFX`, `MojoPack` for reskins; `MojoChase.mount()` is an embeddable runtime (games/mojo-chase-embed.html is the 48-line host).

## Kereta Pemberani Petualangan Rel / Kereta Maze (games/kereta-maze.html 161 + kereta-maze.js 333 + kereta-play.js 303 + kereta-grid.js + data/kereta-levels-*.js)
1. Loop: program a train (URUTAN LANGKAH slots with repeat counts: maju, belok kiri, kanan, mundur, sambung) to collect/connect cars to a goal; wrong move never fails (kereta-play.js header).
2. Content: brave 34 (30 + 4 practice), malivlak 20, hellbent 10 (`KeretaLevels` checked in node) plus `KeretaPackLevels` 26 levels; storylines home + peta cerita (kereta-maze.js:2-8).
3. Variety: 4 storylines, 'turns' and 'both lanes' level kinds, trains as tabs. 1 mechanic family (grid programming).
4. Repetition risk: MEDIUM; grid puzzles vary but the editor loop is the same, and this duplicates Mojo's grid engine.
5. Juice: `KeretaFX` (kereta-fx.js), cinematic data (data/kereta-cine.js, kereta-cam.js), weather (data/kereta-weather.js 193 lines), life layer (data/kereta-life.js 236), per-level stars, trophy. Hit-stop not found (unconfirmed).
6. Visual: board art (`KeretaArt`, `KeretaBoard`), train sprites (`TrainSprites`), storyline backdrops (kereta-scene.js).
7. Reuses: `TrainSprites`, `save-engine`, `DuniaMastery`, `sfx-engine`, `DuniaCinema`. Duplicates the programming-grid concept already in `ProgGrid` (mojo) and `tk-grid.js`.

## Blippi Petualangan Penemuan (games/blippi.html, 29 lines)
Iframe shell around `/game1/?dari=dunia` (blippi.html:19). The game lives in a separate repo outside this tree: not auditable here (unconfirmed content, loops, juice). Mentioned in memory (game1 caches Dunia assets cache-first).

## Gym Pokemon (games/gym-pokemon.html, 3197 lines; opened from the G13c letter gym, game.js:1504)
1. Loop: challenge a gym leader with a Pokemon team, answer math to pick a move, type effectiveness decides damage (`getEff`, `calcDmg`, `genMathQuestion`, `showMathQuiz`), earn a badge per leader.
2. Content: 119 trainer entries with teams (`TRAINERS`, gym-pokemon.html:1197-1960), 46 badge images (`assets/gym-badges`), regions via `isPackUnlocked`, 3 modes via `BattleModes.show` (Adventure / PvP / Tournament, gym-pokemon.html:663), weather (`advSpawnWeather`, 50 weather hits).
3. Variety: leaders, regions, battle modes, weather, type chart, move choice. Mechanics: 5. The only page that wires the shared `BattleModes` and `WeatherFX` together.
4. Repetition risk: LOW-MEDIUM.
5. Juice: particles 48, combo 18 (438-440), shake 13, hit-stop 1 (430), confetti 1 (2907), badge collection modal (`showBadgeCollection`), 228 unlock/collect hits.
6. Visual: battle sprite scaling and facing via `BSE` (battle-sprite-engine.js), aura (`addAura`), ripple, per-leader backgrounds (`bg: 'water_m.webp'`), idle bob (white sticker outline noted at gym-pokemon.html:55).
7. Reuses: `BattleModes`, `WeatherFX`, `VFX.Poke`, `BSE`, `QuizEngine`. Owner rule check: `HIJAB_SWAP` replaces female trainer faces with the lead Pokemon (gym-pokemon.html:1467-1469, gate tools/qa-gym-hijab.mjs).

## Film Anak (games/film-anak.html 397, games/film-play.html 646, games/film-offline.js)
Not a game: an offline video library and player (title lines, `film-offline.js`). No loops to rate; listed so the 26-page count is complete. `_shell-smoke.html` (20 lines) is a smoke page for `GameShell` and is not user-facing.

# Cross-cutting findings (evidence for the improvement list)

- Shared engines are under-used. Script-tag consumers counted from the 26 pages: `DuniaCinema` 22 pages but `DuniaCinema.pulse()/set()` has 0 callers anywhere (grep), so the light never reacts to a win or hit (dunia-cinema.js header describes `pulse('win'|'hit')`). `RewardCatalog` + `RewardGallery` 4 train pages only (18 catalog entries, games/data/reward-catalog.js). `SceneryEngine` 1 page (side race). `RZParallax` 1 page (Ejaan). `WeatherFX` 2 pages (gym, run). `QuizEngine` 2 pages (balapan, gym) although its header records an owner mandate that all games share one quiz engine (quiz-engine.js:3-6). `DuniaMastery`/`DuniaBus 'answer'` 5 pages (ayo, kereta-maze, kuis-matematika, mojo-swoptops, timmy). `BattleModes` 1 page (gym).
- Shared juice is uneven. True hit-stop exists in gt-fx.js (`slowmo` 348), mojo-chase.js (102, 330, 603), mojo-swoptops.js (1410), gym-pokemon.html (430). The hub quiz core and all Pokemon arcade pages have none (grep).
- The G10 weather (game.js:7681-7712, cosmetic, random) duplicates `WeatherFX` (games/data/weather-fx.js), which has gameplay modifiers (rain water x1.2, snow ice x1.2) that G10 does not use.
- Animated Pokemon art exists but is barely used: `assets/Pokemon/showdown-ani` has 41 GIFs, used only by pokemon-bawah-laut.html:224, 914; Mario uses 4 Pikachu GIFs (mario-pokemon.html:1623). `POKEMON_DB` has 1024 species, all otherwise static images. `games/battle-sprite-engine.js` only handles scale/facing.
- Owner-rule checks found while reading (no edits made):
  - White sticker outline on sprites: balapan-kereta.html:4067-4070 (`_oaInk`, white stroke width 5), also described at gym-pokemon.html:55, museum-kereta.html:576, battle-arena.js:31, 79, mojo-swoptops.js:417 (baked ring). Conflicts with the owner rule unless the rule is scoped to characters (unconfirmed which are approved).
  - Emoji in UI: heavy in hub game.js (spawnSparkles game.js:2726-2727, G13b combo `⚡`/`🌟` 10733, quiz questions such as `'🐱 Huruf awal?'` selamatkan-kereta.html:852), ducky-volley.html:186-189, NPC art in bawah-laut (915-921). Newer pages (mojo, kereta, spelling, math) follow the no-emoji rule in their headers (mojo-swoptops.js:11, mojo-chase.js:14, vfx-moments.js:9). `data/emoji-map.js` may swap emoji for sprites at runtime (unconfirmed coverage).
  - Women and girls with hijab: gym trainers handled by `HIJAB_SWAP` (gym-pokemon.html:1467-1469, gate tools/qa-gym-hijab.mjs). Other pages not checked (unconfirmed): `G10` `TRAINER_PARTIES` (game.js:5801) uses names Ash etc.; female trainer portraits there are unconfirmed.
- Dead code noted but not touched: G17 body (g14-g16-trains.js:1670+), G25 hub block (game.js:7218-7650), hub G6 (game.js:3282-3587, legacy).

# Top 15 improvements (fun and variety first, then visual detail)

Effort: S under 1 day, M 1-3 days, L more. All proposals are emoji-free, hijab-safe (no new female characters), use existing assets, offline.

1. G19 Birds and G20 Ducky: wire the shared question engine. Add `data/g23-question-engine.js` script tag and call `G24_pickQuestions`/`G23_pickQuestions` with the legacy bank as fallback, exactly as `pokemon-bawah-laut.html` does (pickQuestions). Reuse: games/data/g23-question-engine.js:407, 462. Effort S. Check: across 20 headless runs of each game the set of distinct question strings is at least 150 in Birds and at least 100 in Ducky (now 72 and 14); `grep -c G2[34]_pickQuestions` returns more than 0 in both files.
2. G10 Pertarungan Pokemon: replace its cosmetic weather with `WeatherFX` and show the modifier, add type-effectiveness text ("Efektif!") from `getEff` logic. Reuse: games/data/weather-fx.js (`getMod`), game.js:7681-7712 to delete after, gym-pokemon.html `getEff`. Effort M. Check: with weather rain and a water attack the damage is 1.2x the clear-weather value in a unit probe; no `G10_WEATHERS` references remain.
3. Cross-game collection book. Extend `RewardCatalog` with a "Pokemon dan hewan" category, grant one sticker per star tier in G3-G25 via `DuniaBus.emit('reward')` (planned event in dunia-bus.js:9), show with existing `RewardGallery.open()`. Reuse: games/data/reward-catalog.js, games/reward-gallery.js (`toastEarn`), assets/gym-badges (46 images). Effort M. Check: finishing one level in each of G10, G19, G20, G21, G24 raises the earned count by 5 in `localStorage['train-stickers']` (or new key) and the gallery shows them; gallery count goes from 18 to at least 40 entries.
4. Boss gate every 10th level for G19, G23, G24 (G10 already has it, game.js:6371, 6384, 6394, 6410): a gate with 3x HP that needs 3 correct answers, uses `VFX` 'boom' and the region whale/legendary art. Reuse: G10 level table pattern, `G13B_LEGENDARIES` (game.js:10030), games/vfx-engine.js REGISTRY. Effort M. Check: level 10 of each game spawns a boss gate (DOM probe), a wrong answer does not end the run.
5. G14b Side Race: add a quiz gate every 25 s using `QuizEngine.fill` (already used by balapan-kereta.html:5914) and a duck action beside jump. Today it has 0 questions and 5 obstacles. Reuse: games/quiz-engine.js, `OBSTACLE_TYPES` (balapan-kereta-side.html:1630+), `DuniaBus 'answer'`. Effort S. Check: in a 90 s run at least 3 quiz gates appear and `DuniaMastery.scores()` has a non-empty domain.
6. G20 Ducky Volley: second mechanic plus content. Add 3 power-up drops (it already has `sfxPowerup`, ducky-volley.html:152) and weather mods from `WeatherFX`; point questions at the engine (item 1). Reuse: games/data/weather-fx.js, ducky-volley.html sfx set. Effort M. Check: a 5-point match shows at least 1 power-up pickup and 2 distinct weather kinds over 10 matches.
7. Hub quiz set G3/G7/G8/G11: add a "dengar" round type to G3 and G8 using the pre-rendered letter and word clips (26 letters, 330 words under assets/spelling/audio) and move G11 to `TKQuestions` domains umum/logika (713 items). Reuse: assets/spelling/audio/{letters,words}, games/data/tk-questions.js, `DuniaSpeak`. Effort M. Check: G3 shows at least 3 distinct round kinds per run; G11 question pool above 300 distinct ids.
8. Mastery feed for arcade and train pages (13 pages, 0 emits today): emit `DuniaBus 'answer'` where each page resolves a quiz and cap number range by `DuniaMastery.cap`. Reuse: games/data/dunia-bus.js, games/data/mastery.js (`cap`, `soften`). Effort M. Check: after one run of each page `DuniaMastery.scores()` contains the page's domain; a simulated wrong-heavy child gets a lower max number in G19 within 10 answers.
9. Shared persistent combo meter. Extract G13b's combo bolts + Pixi combo text (`g13bShowCombo` game.js:10726-10752, `pixiComboText`) into a module and replace the text floater `quizStreakHit` (game.js:2780-2802). Also use in Mario, Run, Candy. Reuse: those functions, `VFX.Moment.reward`. Effort S-M. Check: after 3 correct answers a meter element exists in G3, G4, G7, G8, G19, G22; resets to 0 on a wrong answer.
10. Make the cinema light react: call `DuniaCinema.pulse('win')` on stage clear and `pulse('hit')` on damage in the 22 pages that load it (0 callers today). Reuse: games/dunia-cinema.js (`pulse`). Effort S. Check: grep finds at least 15 callers; in a headless probe the key light colour differs between idle and 200 ms after a win.
11. Shared hit-stop. Add `VFX.Moment.hitstop(ms)` (60-90 ms, skipped under reduced motion) from the gt-fx slowmo/hit-stop pattern (gt-fx.js:348) and call it on hits in G10 `g10DoAttack`, G13 `g13TypeHitFX`, G25 `heroAttack`, G21 `onGoombaCollide`. Reuse: games/gt-fx.js, games/vfx-moments.js. Effort S. Check: rAF gap of at least 60 ms right after a hit in a headless run; zero gap with `prefers-reduced-motion`.
12. G13c Gym Huruf rebuild: replace the 94-word `G13C_ITEMS` (3-6 per letter, rows flagged `skip`/`close`, game.js:1417-1500) by `SpellingData.WORDS` (330 words, each with a picture). Reuse: games/data/spelling-data.js (`list`, `picPath`), assets/spelling. Effort M. Check: every letter has at least 8 items, zero rows with a `close` flag, picture present for each.
13. G19 and G24 look: use `SceneryEngine` layers (scenery-engine.js, currently side race only) or `RZParallax` for 3 depth bands and show animated `showdown-ani` Pokemon for the 41 available species (bawah-laut already does, pokemon-bawah-laut.html:224). Reuse: games/scenery-engine.js, games/parallax-engine.js, assets/Pokemon/showdown-ani. Effort M. Check: 3 or more depth layers (`data-depth` or container count) in both pages; Birds selects from at least 20 animated species.
14. G26 Ayo Berhitung reward layer: celebrate on page complete (`VFX.Moment.celebrate`), tier badge per operation from `DuniaMastery.tier`, sticker via item 3. Reuse: games/vfx-moments.js, games/data/mastery.js. Effort S. Check: completing a worksheet fires one celebrate and sets an operation badge; no motion under reduced-motion.
15. G6 Mobil parity with G15: port G15's assist offer (slow-mo + magnet / +1 life, lokomotif-pemberani.html:2385-2396), streak slow-mo (`g15BriefSlowMo`) and extra word banks (G15 has 42 words versus 5 per run from about 11 in mobil). Reuse: lokomotif-pemberani.html functions, mobil.html `WORD_BANKS` (158-167). Effort S-M. Check: a mobil run offers assist after 2 misses; distinct words across 10 runs above 40 (now about 90 in the bank but only 5 per run).

# Five thinnest games (content x mechanics x juice)

1. G20 Ducky Volley: 14 questions (ducky-volley.html:182-190), 1 mechanic, no unlock, no engine questions.
2. G14b Balapan Kereta Side Race: 0 questions, 5 obstacles (balapan-kereta-side.html:1630+), one verb, labelled Beta.
3. G24 Pokemon Bawah Laut: flap-style clone of G19 with no combo, no confetti and no streak (grep n=0 in those lines), 68 legacy questions behind the engine.
4. G13c Gym Huruf & Suara (hub): about 94 words for 26 letters, rows flagged `skip`/`close` (game.js:1417-1500), single verb.
5. G3 Huruf Hutan (hub): 41 items, static emoji card, 2 round types, shared juice only. Runner-ups: G4 Hitung Binatang, G11 Kuis Sains (102 questions all tiers, no timer, no unlock).

# Duplicate pairs and clusters that feel the same

- G10 / G13 / G13b / Gym Pokemon: four variants of "answer math to attack a Pokemon"; only G13b (timer, combo, catch) and Gym (leaders, badges, modes) differ in loop.
- G19 Pokemon Birds / G24 Pokemon Bawah Laut: same flap-and-quiz-gate loop, same `getDifficulty` and question tier shape (selamatkan-kereta.html:934 also copies it).
- G6 Mobil / G15 Lokomotif Pemberani: lane-based letter-word collection; the second has more features.
- G14 Balapan / G14b Side Race: same route and trains, dodge verb in two orientations.
- G15 tile (Mojo Swoptops kereta pack, index.html:946) / Lokomotif Pemberani page / Kereta Maze: three "Kereta Pemberani" experiences, the latter two both rail programming grids, plus `tk-grid.js` and `prog-grid.js` as parallel grid engines (shared code unconfirmed).
- G3 / G7 / G8 / G13c: picture or emoji plus word or letter pick from 3-4 buttons.
- G16 Selamatkan Kereta / G19: brake-or-fly obstacle with question gate and the same easy-to-expert question tiers.
