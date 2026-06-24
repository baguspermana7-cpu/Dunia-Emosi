# Train Games Improvement Plan — 100+ Ideas Across All 4 Games

**130 ranked items** (deduped from 166 raw ideas) across **4 train games** (G14, G15, G16, G18) and cross-cutting infrastructure, organized into **8 themed ships**.

> **Numbering note (2026-06-24):** synthesizer named the ships v54.15-v54.22, but v54.15 (3 bug fixes) and v54.16 (G17 hotfix) have already shipped today. When executing this plan, renumber starting from **v54.17** — the section titles below stay accurate (G14 Race Polish, G14 Race Depth, G15 Word Adventure, G16 Hook & Rescue, etc.), only the version stamps shift forward by 2.

## Overview

After deduping 166 raw ideas down to 130 actionable items, I've organized them into 8 themed ships spanning v54.15 through v54.22. The first four ships are single-game polish passes (G14 racing, G15 letter-collection, G16 obstacle-clearing, G18 museum) front-loaded with HIGH/S items that ship in days. Ships v54.19-v54.21 are cross-cutting infrastructure (passport, codex, audio library, achievements, dynamic music, settings drawer) that lift all four games at once. Ship v54.22 collects the bold per-item-approval features (co-op, AR scale, online leaderboard, ghost replay, Train Garage hub, AR mode) — none touch the PROTECTED roster of Casey Jr, Linus, Brave, JZ 711 Dragutin, Malivlak (all character-train items are ENHANCE-only).

---

## v54.15 — G14 Race Polish — Ritual, Stakes, and Identity

*Tighten the racing loop with audio rituals, lane awareness, and reactive world detail*

**17 items**

| Idx | Title | Game | Impact | Cost | Summary |
|---|---|---|---|---|---|
| A1 | 3-2-1-GO countdown with station bell + whistle | g14 | HIGH | S | Pre-race overlay with station-bell ding-ding then steam-whistle on GO before S.running unfreezes |
| A2 | Lane indicator pip column on screen edge | g14 | HIGH | S | 3 vertical dots top-left showing current lane bright, others dim; pulse cyan on switch |
| A3 | Near-miss '+5 PRESSURE!' floating text | g14 | HIGH | S | Reward bravery: floating pink '+5!' on obstacles passed within 1 lane at <50px |
| A4 | Animated heart loss in #lives-hud | g14 | MED | S | Pop-scale heart 1.3x, fade red, rise off-screen + sad-bonk SFX on HP-- |
| A5 | Gap-to-next position chip | g14 | MED | S | Position badge expands to show metric gap: 'P2 +12m to 1st' / 'P1 +8m lead' |
| A6 | Pressure low-fuel siren + red border pulse | g14 | MED | S | When pressure<20, pulse red border + 220Hz pulse SFX every 1s; clears at >30 |
| A7 | Engine-rev SFX preview on train picker | g14 | MED | S | Tap any train card to hear a 0.4s engine sample matching its type |
| A8 | AI bubble shows tiny train silhouette | g14 | MED | S | 12x6px train icon next to each AI bubble so kids know who's taunting them |
| A9 | Slow-mo zoom crash instead of rotation jitter | g14 | MED | S | Stage scale 1->1.08->1 over 400ms + chromatic flash; remove nauseating rotation jitter |
| A10 | Milestone announcement banner — '500m!' | g14 | MED | S | Big floating text + ding at 100/250/500/750m thresholds |
| A11 | AR-style camera tilt during lane switch | g14 | MED | S | Stage tilts ±0.03 rad in switch direction (lerp 400ms) — banked-turn feel |
| A12 | Confetti + golden ribbon at 1st-place finish | g14 | MED | S | 48 confetti particles + golden hex ribbon banner + tada SFX on P1 cross |
| A13 | Best speed reached callout on result | g14 | MED | S | Result modal shows '⚡ 203 km/h max!' + train-specific celebratory line |
| A14 | Cloud shadow projection across lanes | g14 | LOW | S | Each cloud projects faint dark ellipse on ground scrolling with cloud speed |
| A15 | Boost-cooldown smooth fade-down | g14 | LOW | S | Tween speedFactor back over 600ms + steam-burst + descending whir on boost end |
| A16 | Steam puff cluster shape with soft blur | g14 | LOW | S | Replace single circle puff with 3-blob cluster + BlurFilter strength 2, phase-tinted |
| A17 | Floating coin/star pickup tokens every ~180m | g14 | HIGH | M | Gold coin / lightning / heart pickups in random lane: +5 pressure, +10 score, +1 HP cap 3 |

---

## v54.16 — G14 Race Depth — Hazards, Cinematics, Math Anchors

*Medium-cost depth additions: biome hazards, cinematic checkpoints, train-themed math, and signature SFX*

**15 items**

| Idx | Title | Game | Impact | Cost | Summary |
|---|---|---|---|---|---|
| B1 | Per-obstacle SFX + reaction animation | g14 | MED | M | Cow moos+jumps, rock shatters, chicken flaps, sign bounces — replace one shared crash tone |
| B2 | Train-themed math problems | g14 | HIGH | M | Word problems with train context: '3 gerbong × 8 penumpang = ?', km/menit etc |
| B3 | Mini-station checkpoint scenes | g14 | MED | M | Replace .cp-dot with station archway + clock-tower drop + bell + flag wave on pass |
| B4 | Cab window driver wave for character trains | g14 | MED | M | Casey/Linus/Dragutin/Malivlak get cab driver sprite — blinks every 4s, waves on P1 finish |
| B5 | Conductor announcer — next station name | g14 | MED | M | KM markers carry real Indonesian station names + PA 'ting-tong' chime 50m before |
| B6 | Light-tree gantry signals over track | g14 | MED | M | Overhead gantry replaces static posts — 3 lights show race position (green/yellow/red) |
| B7 | Photo mode + parent share button on result | g14 | HIGH | M | Result modal 'Tunjukkan Mama' button: PixiExtract toCanvas + frame + watermark PNG |
| B8 | Floating-chip mini quiz mode | g14 | HIGH | M | Optional toggle: quiz as 240px RHS chip; lane controls stay active during answer |
| B9 | Vibrate API on crash + correct quiz | g14 | MED | S | navigator.vibrate([20,40,20]) on crash, [40] on correct, [10] on lane switch |
| B10 | Dynamic kmh needle gauge in HUD | g14 | MED | M | Replace text km/h with 60° arc needle (0 to trainCfg.kmh max); redline + boost glow |
| B11 | Replay-the-crash 2-second rewind | g14 | MED | M | Before modal at HP=0, replay last 2s of recorded state at 0.5x with red vignette |
| B12 | Difficulty-adaptive rubber band (kid mode) | g14 | HIGH | M | After 2 deaths same level: HP+1, OBS_INTERVAL +200ms, regen +0.05; 'Mode Belajar' badge |
| B13 | Daily login spin — bonus train unlock | g14 | MED | M | First-launch-of-day spin: 6 wedges (pressure-start / HP / train unlock / 2x stars / ghost / mystery) |
| B14 | Biome-keyed environmental hazards | g14 | HIGH | L | Desert=sandstorm, Snow=ice patch, Volcano=lava sparks, Urban=lane closure — biome identity |
| B15 | Train livery selector — paint job per train | g14 | MED | L | Unlock 5 liveries per non-character train (festive/stealth/sunset/rainbow/winter) via Pixi tint |

---

## v54.17 — G15 Word Adventure — Lean, Anticipate, Read

*Buttery letter-pickup with banking lean, anticipation previews, voice readout, and graceful mistake forgiveness*

**19 items**

| Idx | Title | Game | Impact | Cost | Summary |
|---|---|---|---|---|---|
| C1 | Lane-change tween with banking lean | g15 | HIGH | S | Replace instant lane snap with 180ms cubic-bezier tween + ±0.08rad rotation lean |
| C2 | Combo streak chip with escalating juice | g15 | HIGH | S | Visible streak HUD; ≥3 more particles, ≥5 gold trail, ≥7 brief 200ms slow-mo |
| C3 | Per-letter SFX pitch ladder | g15 | HIGH | S | Each correct collect plays a chime climbing C-major scale; full arpeggio on word complete |
| C4 | Last-life heartbeat alert | g15 | HIGH | S | lives===1: heart pulses red, BGM ducks low-pass, screen vignette, gentle haptic |
| C5 | Voice-readout of target letter (TTS) | g15 | HIGH | S | speechSynthesis speaks targetLetter in id-ID at rate 0.8; default ON in easy mode |
| C6 | Anti-frustration assist trigger | g15 | HIGH | S | lives=1 + idx=0 + LVL>10: offer help (slow-mo+magnet) or +1 heart, once per run |
| C7 | Distractor lane randomization fix | g15 | MED | S | Random target lane per wave (kills the 'always lane 0' pattern-match) |
| C8 | Wrong-tap graceful warning tier | g15 | MED | S | First wrong in current word = orange flash + 600ms invincibility, no heart loss |
| C9 | Carriage tilt during boost-out | g15 | MED | S | After word-complete bounce, tilt train -0.05 then back; only steam/heritage types |
| C10 | Heart-box recovery cinematic | g15 | MED | S | On heart pickup: 110% zoom, 'NYAWA KEMBALI!' banner, heart-particle arc to HUD |
| C11 | Rainbow draw-in animation | g15 | MED | S | Rainbow arcs in over 500ms left-to-right then alpha-fades over 750ms |
| C12 | Math timer scales with level + difficulty | g15 | MED | S | Replace fixed 8s: 14s easy / 7-12s medium / 5-10s hard ramping by level |
| C13 | Carriage breathing parallax bob | g15 | LOW | S | Add subtle sin vertical bob to train at all times; pause during _bounceT |
| C14 | Speed-streak visual cue before bump | g15 | LOW | S | Right before gameSpeed bumps, draw 8 white horizontal streak lines fading out |
| C15 | Character train enhanced idle micro-anim | g15 | MED | S | Casey/Linus/Dragutin/Malivlak: blink every 3-5s + smile twitch every 7-10s (ENHANCE only) |
| C16 | Station-themed train suggestion ribbon | g15 | MED | S | Train-select shows 'Direkomendasikan untuk Cirebon: Argo Cheribon' lore matches |
| C17 | Ghost-letter anticipation preview | g15 | HIGH | M | Ghost glyph above #next-char pulses brighter as nearest matching box approaches |
| C18 | Journey-map overlay tied to station-chip | g15 | HIGH | M | Clickable station-chip opens horizontal Surabaya→Merak rail map with chuffing marker |
| C19 | Math quiz iris-wipe train-stops cinematic | g15 | HIGH | M | Train brakes to a stop, station signpost rises with chalkboard math, iris-wipe in |

---

## v54.18 — G16 Hook & Rescue Polish — Stakes, Streaks, Stations

*Convert obstacle-clearing into a felt heroic ride with countdowns, streak HUD, character voice, and clearer danger*

**18 items**

| Idx | Title | Game | Impact | Cost | Summary |
|---|---|---|---|---|---|
| D1 | READY-SET-GO countdown overlay with whistle blast | g16 | HIGH | S | 3-2-1-GO before S.running flips true + rising whistle pitch + steam burst on GO |
| D2 | Quiz panel slide-up with bounce keyframe | g16 | HIGH | S | Replace instant slam-up with 350ms bouncy translateY entrance |
| D3 | Combo streak HUD badge with scale-pop | g16 | HIGH | S | Visible STREAK ×3 FIRE badge; scale 1.4->1 + glow pulse on each increment |
| D4 | Tap-tick SFX on every choice button touch | g16 | HIGH | S | 180Hz square 40ms blip on choice-btn pointerdown before answer resolves |
| D5 | Mid-level milestone banners with haptic | g16 | HIGH | S | On cleared crossing 25/50/75%: 'STATION 3/6 ✓' banner + vibrate(40) |
| D6 | Cinematic 16:9 black bars on ARRIVING | g16 | HIGH | S | Slide black bars + 1->1.05 stage scale + 0.7x slow-mo on ARRIVING state |
| D7 | Train picker idle bob + smoke ring | g16 | HIGH | S | Card preview canvas bobs 2px sine + emits smoke puff every 2.5s |
| D8 | Wrong-answer pedagogical hint flash | g16 | HIGH | S | On wrong: green-flash the correct choice 600ms + 'Yang benar!' before mercy-shake |
| D9 | Question history dedup | g16 | HIGH | S | Persist last 15 q.id in sessionStorage; filter before shuffle to prevent fatigue |
| D10 | Train HEALTH heart icon next to obstacle-count | g16 | HIGH | S | 3-pip heart row; one dims per wrongTaps_station — visible 5★ status mid-level |
| D11 | Steam whistle on station clear | g16 | HIGH | S | Final correct answer of station: whistle SFX + big chimney puff + 8px shake |
| D12 | Tutorial mercy-dot help overlay | g16 | HIGH | S | Level 1 first quiz only: arrow + 'Kamu punya 3 kesempatan!' for 3s, then never again |
| D13 | Mercy-dot explosion + heart-fall on consume | g16 | MED | S | Dot scales 1->1.5 fades, then drops a tiny pink heart with gravity |
| D14 | BGM sidechain duck during quiz panel | g16 | MED | S | When .quiz-panel.show: gain ramps to 0.10; restore 0.25 on close |
| D15 | Telegraph spark frequency reduce + bigger reactions | g16 | MED | S | Sparks rarer (dt*0.12); when fired, 4 yellow particles + brightness pulse |
| D16 | Mini-obstacle destruction burst | g16 | MED | S | On clearMiniObstacle: spawn 6 particles colored by emoji (rock=gray, tree=green) |
| D17 | Smoke color modulation by train state | g16 | MED | S | BOOSTING=darker dense, STOPPED=thin wisps, burst 8 puffs on correct answer |
| D18 | Per-train arrival livery | g16 | MED | S | Pass selectedTrainIdx into buildArrivalStation: flags + sign use train.bodyColor |

---

## v54.19 — G16 Hook Depth + G18 Museum Polish

*Medium-cost depth for G16 (voice, dual-meters, character bubbles) + G18 reading/reveal upgrades*

**18 items**

| Idx | Title | Game | Impact | Cost | Summary |
|---|---|---|---|---|---|
| E1 | Per-character arrival barks (G16) | g16 | HIGH | M | Voice-line MP3 per protected character + 'Hore, kita sampai!' text bubble on arrival |
| E2 | Character thought bubbles (G16 reuse v54 engine) | g16 | HIGH | S | Casey 'Cepat!' on boost, Linus 'Aman!' on station clear, Dragutin 'Hati-hati!' on mercy-loss |
| E3 | Speed-lines + chromatic aberration on BOOSTING (G16) | g16 | HIGH | M | Wake the unused #speed-lines + hue-rotate + RGB-split filter on boost |
| E4 | Dual-meter DANGER model (G16) | g16 | HIGH | M | Rename bar to PROGRESS; add real DANGER meter that fills on wrong/sparks/idle |
| E5 | Adaptive difficulty — slow brake (G16) | g16 | HIGH | M | If wrongTaps_station ≥2: brakeDist 220->300 next station for more reaction time |
| E6 | Fix stale 'score===5' SEMPURNA threshold (G18) | g18 | HIGH | S | Replace magic 5 with score===G18_QUIZ_COUNT so trophy means real 8/8 mastery |
| E7 | Speed badge as proportional bar (G18) | g18 | HIGH | S | Pill becomes a bar width = speed/603 with tortoise/rocket icons at extremes |
| E8 | Trivia kartu hari ini (G18) | g18 | MED | S | Pulsing yellow card with daily-seeded funFact; tap opens the relevant train modal |
| E9 | Speed-tier icons on cards (G18) | g18 | MED | S | Prepend 🐢/🚆/🚀/🚀⚡ tier icon on every card's speed pill with tooltip |
| E10 | Streak pill with fire emoji + 2x at 5 (G18) | g18 | MED | S | Visible 🔥x3 pill scales+rotates per streak; streak 5 = GLODOK flash + 2x stars |
| E11 | ESC / backdrop / swipe-down close (G18) | g18 | MED | S | Multiple modal-exit paths so kids never feel trapped |
| E12 | Aria-live + role=dialog (G18) | g18 | MED | S | aria-modal, aria-live polite, aria-pressed — assistive-tech accessible |
| E13 | Animate locomotive SVGs in modal (G18) | g18 | HIGH | S | Pass animate:true to g18TrainSVG: wheels rotate, side-rods reciprocate, steam plume |
| E14 | SEJARAH text tap-to-reveal chunks (G18) | g18 | MED | S | Split on '. '; show first 2 sentences; 'Baca lebih →' fades in next chunk |
| E15 | Web Speech API id-ID read-aloud (G18) | g18 | HIGH | M | 🔊 button on history + story + quiz; speechSynthesis id-ID gated by isSoundOn |
| E16 | Museum Passport progress (G18) | g18 | HIGH | M | 23 stamp slots; tapping a card stamps it with silhouette + date; gallery header chip |
| E17 | SVG-image quiz questions (G18) | g18 | HIGH | M | 'Yang mana B2507?' renders 4 SVG locomotives as answer buttons for non-readers |
| E18 | Review-the-misses loop on result (G18) | g18 | HIGH | M | Track missed questions; result lists each as tappable card that jumps to train modal |

---

## v54.20 — G18 Museum Depth — Story, Sound, Discovery

*Deeper museum experience: storybook pages, chronological/geographic views, character narrator, ambient gamelan*

**16 items**

| Idx | Title | Game | Impact | Cost | Summary |
|---|---|---|---|---|---|
| F1 | Story panel becomes 3-page swipeable storybook | g18 | HIGH | M | P1 intro+SVG, P2 funFact illustrated, P3 quizHint+CTA; swipe to turn pages |
| F2 | Confetti + brass-band fanfare on 8/8 | g18 | MED | S | Real 8/8: spawnConfetti(48) + major-7 arpeggio + 'MASTER MUSEUM' passport badge |
| F3 | Seeded RNG quiz with no-repeat-last-3 memory | g18 | MED | S | xorshift32 shuffle + filter recent 3 sessions from localStorage |
| F4 | Quiz progress bar tints by accuracy | g18 | LOW | S | Bar background lerps green->amber->red based on correctCount/answered |
| F5 | First-tap glow on 📖 Cerita button | g18 | LOW | S | Soft amber pulse + 'Ada cerita di sini!' arrow until first discovery |
| F6 | Section chapters collapse + golden chevron | g18 | MED | S | Collapsible 3 section headers; section-complete = gold chevron + chime + medal |
| F7 | Long-press steam-loco modal plays whistle | g18 | MED | S | isSteam true + 800ms hold = 1.5s steam whistle WAV + gentle haptic |
| F8 | Steam-chuff BGM bed scales with speed | g18 | MED | S | Looped chuff WebAudio when steam modal opens; interval = 60/speed*8 |
| F9 | Quiz question shows train SVG when subject matches | g18 | MED | M | When question.subjectTrainId set, render g18TrainSVG instead of generic emoji |
| F10 | Gamelan ambient loop in gallery | g18 | MED | M | Soft slendro 30s loop on gallery entry; fades on quiz; ducked under TTS |
| F11 | Hero banner: parallax Stasiun Willem I 1873 | g18 | MED | M | Layered SVG of actual Ambarawa station with scroll-driven parallax depths |
| F12 | Optional 15s soft timer ring with speed bonus | g18 | MED | M | Conic countdown; under 5s = +50% star bonus; expiry no fail, only no bonus |
| F13 | Conductor avatar narrator (Pak Masinis) | g18 | MED | M | Friendly conductor in story-page corner; mouth animates with TTS; waves on turn |
| F14 | Steam-loco rod kinematics teaching mode | g18 | MED | M | Info-i slows wheels to 0.15x and labels piston+rod with one-sentence explainers |
| F15 | Timeline screen 1880→2023 | g18 | HIGH | L | Horizontal scroll, each train as tiny SVG at year position, pinch-zoom, tap=modal |
| F16 | Map of Java with route lines per train | g18 | HIGH | L | SVG of Java + world inset; tap pin animates route line with moving loco token |

---

## v54.21 — Train Passport + Codex + Shared Settings (Cross-Cutting)

*Foundational infrastructure that lifts all four games at once: passport, codex, settings drawer, universal pause, tutor mascot*

**14 items**

| Idx | Title | Game | Impact | Cost | Summary |
|---|---|---|---|---|---|
| G1 | Train Passport — Cross-Game Sticker Album | all | HIGH | M | localStorage passport stamps per completion across G14/G15/G16/G18; viewable from any pause |
| G2 | Universal Train Codex (Wikipedia-for-Kids) | all | HIGH | M | Tap any train portrait: 2-page entry with flag, 3 facts, top speed, voice preview, ID, games it stars in |
| G3 | Universal Settings + Parental Controls Drawer | all | HIGH | M | One panel from every pause: master/SFX/music sliders, motion, colorblind, EN/ID, session limit, parent gate |
| G4 | Universal Pause Menu with big buttons | all | HIGH | S | Shared component: Resume/Restart/Garage/Settings/Quit; ≥64px targets, icon+label |
| G5 | Train-Tutorial Mascot — Pak Stasiun | all | MED | M | Single station-master mascot (NOT a train) for tutorials, hints, end-cheers across all 4 games |
| G6 | Train Stats Card — loading screen | all | MED | S | Pre-level: chosen train's speed, country flag, year, fuel type — sneaks STEM into loading |
| G7 | Distance / Visit Counter Per Train Per Game | all | MED | S | 'Casey has raced 14.2km in G14 with you' — concrete relationship numbers in codex |
| G8 | Whistle Greeting When Switching Games | all | LOW | S | Switching games same session pre-selects last train + plays signature horn as 'hello again' |
| G9 | Weather + Time-of-Day Sync Across Games | all | MED | M | TIME_OF_DAY palette is session-shared: sunset in G14 = sunset windows in G18 |
| G10 | Character Train Polish Pass — Idle Animations | all | MED | M | Centralized idle micro-anims in sprite engine — all 4 games inherit the polish (ENHANCE only) |
| G11 | Shared Train Horn / SFX Library | all | MED | S | train-audio.js with playHorn/Chuff/Whistle per train; signature horn per protected character |
| G12 | Character Voice-Line Library (EN/ID) | all | MED | M | 10-15 short clips per protected character on start/levelup/nearmiss/idle, bilingual |
| G13 | Bilingual Word-of-the-Day Banner | all | MED | S | Daily EN↔ID train word ribbon shared across all 4 games; tap plays audio in both |
| G14 | Soft Session Timer with Wind-Down | all | HIGH | M | Parent-set 15/20/30min limit; 2min warning: train slows, Pak Stasiun signals end, garage locks |

---

## v54.22 — Big Features — Achievements, Music, Bold Modes

*Per-item approval ship: achievement system, dynamic music tempo, bold features (co-op, ghost, AR, garage, leaderboard, birthday)*

**13 items**

| Idx | Title | Game | Impact | Cost | Summary |
|---|---|---|---|---|---|
| H1 | Achievement Badge Wall (60-80 badges) | all | HIGH | M | Cross-game wall: 'First whistle with Linus', 'Visit 10 exhibits with Dragutin' etc — collection drive |
| H2 | Daily Conductor Challenge | all | HIGH | M | Rotating daily mission spanning 2 games (e.g. race Casey + collect 5 letters with Brave); daily sticker |
| H3 | Streak + Gentle Comeback Mode | all | MED | S | Cross-game day-streak; breaks open with Casey waving 'Welcome back!' — no shame |
| H4 | Adaptive Difficulty — Frustration & Flow Sensor | all | HIGH | M | 3 fails = hints, 3 perfects = speed-star badge + optional harder mode; shared across games |
| H5 | Dynamic Music Tempo Tied to Train Speed | g14+g15+g16 | MED | M | BGM playbackRate 0.85-1.25x scales with speed/combo across 3 action games |
| H6 | Birthday Train Mode | all | MED | S | Once per device-set birthday: confetti, party hats on protected trains, cake exhibit in G18 |
| H7 | Replay ghost — chase your best run (G14) | g14 | HIGH | L | Save best-time per level as ghost trail; replay as semi-transparent train next attempt |
| H8 | Cosmetic Unlock System — Hats/Scarves/Lanterns | all | HIGH | L | Earn cosmetics from any game; sprite-layer overlay shows them on chosen train everywhere |
| H9 | Train Garage — Pre-Game Hub | all | HIGH | L | Shared garage: 5 protected trains parked, pick train then pick game; cosmetics carry into play |
| H10 | Photo Frame in G18 of Action-Game Highlights | g14+g15+g16+g18 | MED | M | G18 Memory Hall: auto-captured best moments from action games hang as framed paintings |
| H11 | Cooperative 2-player split-screen (G14) | g14 | HIGH | L | Vertical split, P1 W/S+AD, P2 arrows+swipe; shared distance goal, both must finish |
| H12 | AR-style 'Lihat ukuran asli' (G18) | g18 | HIGH | L | getUserMedia camera + translucent full-scale train silhouette = tactile sense of scale |
| H13 | Co-op 'Pemandu Museum' two-player (G18) | g18 | HIGH | L | Hot-seat: questions alternate P1 purple / P2 orange; shared star bar; passport credits both |

---

_Source: ultraplan workflow `wbvjxrcqw` ran 2026-06-24, 10 parallel agents, ~830K tokens._
