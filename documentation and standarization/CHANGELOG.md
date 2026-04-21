# Changelog — Dunia Emosi

## 2026-04-22 — Character trains + RDE Steps 5+6

### Added
- **`games/train-character-sprite.js`** — shared `window.CharacterTrain` with `mount(container, config)`, `tick(dt, speed)`, `setSmokeParent`, `spawnSmoke`, `dispose`. Async PIXI.Assets sprite load + emoji fallback, wheel overlay with 4 spokes per tire (rotation visibility), body bob via sin, smoke puffs fade+rise+expand over 2s.
- **`games/trains-db.js` — "Karakter ⭐" category** prepended at index 0: Casey JR (0-4-0 Circus, 4 drivers r=11) + Linus Brave (2-4-0 Sumatera, 2 pilot r=7 + 4 drivers r=11). `isCharacter:true` gates alternate rendering.
- **`assets/train/caseyjr-body.webp`** (272×198, 22KB) + **`linus-body.webp`** (264×173, 18KB) — bg-removed via rembg.
- **`shared/rz-responsive.js`** — RDE Layer 3 runtime. `window.RZ.scale()/bp()/orient()/fontScale(base)/gap(kind)/btn(kind)/onResize(fn)`. Mirrors CSS `--rz-scale` clamp formula so PixiJS layouts match DOM neighbor scaling on resize.

### Changed
- **G15 `buildTrain()`** branches on `selectedTrain.isCharacter` → `CharacterTrain.mount()`. Tick wired in app.ticker loop. `trainContainer.scale.x=1` for character trains (sprites face right natively).
- **G16 `buildTrain()`** defaults to Casey JR via `G16_CHARACTER_CONFIG`. Tick wired in gameLoop with speed by trainState (STOPPED=0, MOVING=2, BOOSTING=4).
- **RDE Step 5 G1** (`style.css:267-281`): `.g1-animal-display`/`.g1-question`/`.g1-choice-btn`/`.choice-emoji`/`.choice-label`/`.g1-progress` consume `--rz-font-*`/`--rz-gap-*`/`--rz-radius-md`. Removed 9 lines from `@media` blocks (480/400/320 breakpoints).
- **RDE Step 5 G4** (`style.css:337-351`): `.g4-timer-text`/`.g4-question`/`.g4-choice-btn`/`.g4-progress`/`.g4-mode-btn` consume tokens. Removed 4 lines from `@media` blocks.
- **Deferred** G5/G7/G9 base-rule token migration to next pass (state complexity needs careful audit).

### Cache
- `index.html` → `v=20260422a` (character trains) → `v=20260422b` (RDE 5+6).

---

## 2026-04-21 (Evening) — BSE, G22 v2/v2.5, G16 fixes, RDE design, G6 sprite, train audio

### Added
- **`games/battle-sprite-engine.js`** — shared Battle Sprite Engine (BSE). `window.BSE` API: `init(tiersMap)`, `facing(slug)`, `flipForRole(slug, role)`, `visualScale(slug)`, `tierScale(slug)`, `finalScale(slug)`, `mount(el, slug, opts)`. Mutable `POKE_FACING` + `POKE_VISUAL` tables, single source for 4 battle games.
- **`game.js:5030`** — bridge export `window.BSE` so inline G10/G13/G13b consume same engine.
- **`games/g22-candy.html`** — 4 per-category signature FX: `fxNumberBurst` (Math, red-white digits), `fxRainbowSpiral` (Warna, 7-color spiral), `fxGoldPaws` (Hewan, gold paws/star ring), `fxPurpleLeaves` (Buah, purple leaves/mist). Dispatcher `spawnCategoryFX(x, y, ballType, catName)`.
- **G22 `spawnBubblePop(x,y)`** — 12 blue bubble rings + white sparkle flash on correct answer.
- **G22 `laserAbsorbSwap(candy)`** — red laser beam from pokeball to monster, white absorb flash, CSS filter `brightness(6) contrast(0)`, auto-swap to random Pokemon from G22_POKEMON roster after 800ms.
- **G22 `@keyframes monsterIdleBob`** + adaptive lerp (0.28/0.22/0.15 by distance) + squash/stretch on fast direction change.
- **G16 `.choice-btn.long-text`** — compact font variant; auto-applied when `longestLen > 5`.
- **G16 `triggerArrival` 8s safety net** — force `showWin()` if normal flow fails (end-game freeze prevention).
- **G16 bablas-recovery safeguard** — `S._stoppedNoQuizTime` accumulator; re-trigger quiz if STOPPED without quiz visible >1.2s.
- **`Sounds/train-crossing-sfx.mp3`** — 436KB steam-train-at-crossing SFX wired to G14/G15/G16 game-start.
- **`assets/pikachu-icon.webp`** + **`assets/Pokemon/svg/18.svg`** — G5 tab + G19 landing tile assets.
- **CODING-STANDARDS.md — Responsive Display Engine (RDE)** section — 3-layer architecture spec, 7-step migration plan.
- **CODING-STANDARDS.md — Battle Sprite Engine (BSE)** section — 5 responsibilities, default facing 'L' rationale.
- **`assets/Pokemon/pokemondb_hd_alt2/`** (user-provided, integration planned in Task #37) — 1025 Pokemon HD WebP 630×630, full Gen 1-9 coverage, all face RIGHT user-POV (= LEFT monitor-POV, matches BSE default).
- **`game.js` — `pokeSpriteAlt2(slug)`** helper (Task #37): returns `assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug}.webp` using `POKE_IDS` + `String(id).padStart(4,'0')`. Null-safe when id missing.
- **`style.css:17-49`** — RDE Step 1 (Task #29): `:root` fluid design tokens. Added `--rz-scale` (master clamp 0.7–1.0 from 320px–480px), `--rz-btn-xs/sm/md/lg` (derived button sizes), `--rz-font-xs/sm/body/title/h1/hero` (clamp typography), `--rz-gap-xs/sm/md/lg` (fluid spacing), `--rz-radius-sm/md/lg` (fluid corners). Zero existing rules modified.
- **`style.css:893-947`** — RDE Step 2 (Task #29): reusable UI primitive classes `.rz-navbar`, `.rz-navbar__title`, `.rz-letter-row`, `.rz-letter-btn`, `.rz-choice-grid`. Opt-in per game; Steps 3–7 migrate existing `.g<N>-*` rules in later commits.
- **G16 correct-answer juice** (`games/g16-pixi.html`, Task #38): new `spawnQuizCelebrationFX(screenX, screenY, streak)` — 3 variants by streak. Baseline: 14 confetti rectangles (6-color palette) radiating outward with upward bias + gravity, plus white ring pulse. Combo (streak≥3): adds 6 secondary firework bursts of 10 tiny sparks each at random offsets. Super (streak≥5): adds 8 floating ⭐✨🌟💫 emoji (PIXI.Text, `_noGravity` float-up) + gold ring pulse. Tracked via `S.correctStreak` (reset on wrong). Stage punch: `S.stagePunch=0.5` → new `updateStagePunch(dt)` in gameLoop runs sine bell-curve scale 1→1.04→1 over 0.5s (pivots centered). `updateSparks` extended to handle `_ring` (expand+fade) and `_noGravity` (reduced gravity for floating emoji). Fires within the existing 380/500ms `clearObstacle` delay so it overlaps with train resume visually.

### Changed
- **Sprite cascade reorder** (Task #37, `game.js` ~5075): `pokeSpriteVariant()` now resolves **alt2 HD WebP → local SVG → HD CDN** (previously: SVG → HD CDN). Alt2 becomes primary source; Gen 8/9 Pokemon no longer fallback to CDN. BSE consumes via existing `hdSrc` param — no engine change needed.
- **CODING-STANDARDS.md — BSE §1** updated to reflect new cascade order and 1025-coverage rationale.
- **RDE Step 3 — G8 Susun Kata migration** (`style.css:544-554, 585, 753-754, 849, 882`, Task #29): G8 letter input now fluid via `--rz-*` tokens. Base rules `.g8-slots / .g8-slot / .g8-letters / .g8-letter-btn` rewritten to consume `--rz-btn-sm` / `--rz-gap-sm/md` / `--rz-radius-sm` / `--rz-font-title`. Slot height = `calc(var(--rz-btn-sm) * 1.18)` preserves the 44×52 → ~62 aspect. Letter-btn font = `calc(var(--rz-font-title) * 1.05)` preserves the 24px vs 22px title ratio. `min-width` on `.g8-letter-btn` prevents sub-1 button-per-row collapse. Deleted enhancement bump rules at former `style.css:587-588` (duplicated per-size override — no longer needed with fluid scale). Removed 6 G8 override lines across three `@media` breakpoints (480px, 360px, 320px) — RDE `clamp()` handles scaling automatically. G8-specific accent colors preserved (rose/violet border, shadows, Scrabble wooden-tile dark overrides at lines 1691–1756 untouched). Zero HTML/JS changes; pure CSS refactor. Pilot validates 3-layer RDE architecture; Steps 4–7 (G3, G1/2/4/5/7/9, Pixi runtime, per-game override doc) remain pending.
- **RDE Step 4 — G3 Huruf Hutan migration** (`style.css:315-318, 583, 717, 872`, Task #29): G3 letter-forest card now fluid via `--rz-*` tokens. Base rules `.g3-word / .g3-hint / .g3-choices / .g3-choice-btn` rewritten to consume `--rz-font-h1 / --rz-font-body / --rz-font-hero` (choice letters = `calc(--rz-font-hero * 0.9)` preserves the prior 42px peak), `--rz-gap-sm/md`, `--rz-radius-md`, and `--rz-btn-md` (as min-height + padding basis). Removed the `.g3-choice-btn` enhancement bump at former `style.css:584`. Removed 4 G3 overrides from `@media(max-width:480px)` and 1 from `@media(max-width:360px)` — RDE `clamp()` handles the fluid scale 320px → 480px. **Preserved**: G3 teal/green theme gradient on `.g3-word`, white/teal base styling on `.g3-choice-btn`, `.g3-animal` emoji size (gameplay-specific, not UI), the full AAA dark overhaul (wooden-plank word, speech-bubble hint, carved-wood-log choice buttons, letter-highlight burst) at lines 1465–1566 untouched — those use `!important` and override on the G3 screen. Zero HTML/JS changes; token composition pattern identical to Step 3 (no class rename). Steps 5–7 (G1/2/4/5/7/9, Pixi runtime, per-game override doc) remain pending.

### Bug Fixes
- **P0 — G16 freeze at end + bablas stasiun** (`games/g16-pixi.html:1455-1467, 1186-1200`): end-game race + station-collision race both guarded.
- **P0 — G6 vehicle image not rendering** (`games/g6.html:568-585`): `PIXI.Texture.from()` is async in PIXI v8; synchronous `try/catch` can't catch async failures. Rewrote to `PIXI.Assets.load(url).then(tex => swap)` with emoji placeholder + proper fallback.
- **P1 — Staryu/Pikachu not facing each other** (`games/battle-sprite-engine.js:15`, `game.js:5010`): engine default facing was `'R'`, but Pokemondb HOME 3D renders face viewer with slight LEFT bias. Flipped default to `'L'`. Player flips correctly, enemy stays natural. Zero per-Pokemon overrides needed for common cases.
- **P1 — G19 Pidgeot emoji on landing** (`index.html:470`): replaced `<span class="wn-icon">🐦</span>` with HD SVG `<img src="assets/Pokemon/svg/18.svg">`.
- **P1 — Train BGM = battle BGM** (`Sounds/train-bgm.mp3`): byte-identical to Pokemon theme. Replaced with real train BGM (MD5 afe88377…).
- **P1 — G16 quiz answer text overflow** (`games/g16-pixi.html:38-39, 1363`): `.choice-btn` `max-width:none`, `overflow-wrap:break-word`, `.long-text` compact variant.
- **P2 — Navbar wrap to multi-row on narrow screens** (`style.css:196, 201`): `flex-wrap:nowrap; overflow:hidden` + ellipsis on title.
- **P2 — G6 road signs off-screen** (`games/g6.html:430-438`): clamp to canvas bounds + skip-spawn if band <15px.

### Deferred (blocked on user assets)
- #31 G13c gym badge icons — need badge PNGs.
- #33 G20/G22 movement whoosh SFX — need freesound MP3.
- #35 G16 collision crash SFX — same.

### Changed (late evening — G6 audio + shoulder clutter)
- **G6 BGM swap (Task #41)** (`games/g6.html:77, 920`): `<audio id="game-bgm">` src changed from `../Sounds/battle-bgm.mp3` → `../Sounds/racecar.mp3` (1.7MB, 256kbps mono, purpose-fit engine loop). Volume bumped `0.2 → 0.5` per user (racecar loop has lower intrinsic loudness than battle BGM). Play/pause flow untouched: plays in `startWord` (line 920), pauses on `togglePause` (~1003), `finishGame` (~1007), `confirmBack` (~1024). BGM does NOT autoplay on start-overlay — only once the first word spawns (startWord runs after difficulty pick).
- **G6 shoulder scenery removed (Task #42)** (`games/g6.html:355-367`): removed the 8-iteration emoji loop that scattered theme icons (🌲/🌙/🏢/…) outside `roadLeft`/`roadRight` at `alpha 0.2-0.35`. User feedback: "melayang-layang di luar jalan kesannya acak" — low-alpha + off-road placement read as random floating clutter in dark mode. Kept empty `sceneryL`/`sceneryR` containers (with `_scroll` props) so the game-loop scroll tick at `~889` stays safe without null checks. Road signs (already clamped inside canvas in the earlier P2 fix) untouched — they remain the sole ambient road furniture.

### Cache
- `index.html` → `?v=20260421f` → `?v=20260421g` → `?v=20260421h` → `?v=20260421i` → `?v=20260421j` → `?v=20260421k` → `?v=20260421l` → `?v=20260421m`.

### Bug Fixes (late evening)
- **P1 — G20 controls + physics smoothing (Task #25, controls portion)** (`games/g20-pixi.html:699-744, 1097-1135, 76-89`): Removed auto-jump assist (was: `if(S.pGnd && S.bx<NET_X && S.bvy>0 && Math.abs(S.bx-S.px)<60 && S.by<GROUND_Y-40) S.jump=true`) — jump now requires **explicit user input only** (Space/ArrowUp/KeyW on desktop, swipe-up gesture or new jump button on mobile). Also removed hidden `S.jump = true` on every `touchstart` (was contradicting user's "jangan dikasih auto jump" feedback). Added lerp-based horizontal movement: `S.pvx = S.pvx*0.78 + target*0.22` for both drag-drive and arrow-key paths (was hard `S.pvx = ±spd`). Added rise-damping `if(S.pvy<0) S.pvy*=0.985` for gentler jump apex. Ball physics tuned: gravity multiplier `0.65 → 0.60` (slightly more float), added light air-drag `bvx*=0.995^dt`, `bvy*=0.998^dt` for natural arcs. Jump button now visible on touch devices (`#btn-jump` bottom-right, yellow circle, 72×72). Hint text updated: "Geser = Gerak | Swipe ⬆ atau Tombol = Lompat". **Scoring migration still pending** (unified scoring engine out of scope for this pass).
- **P0 — G16 mini-obstacle density too high (Task #39)** (`games/g16-pixi.html:1036-1069`): replaced random-spacing spawn loop (`miniSpacing = 225 + rand*150` → ~4 minis per station-gap) with deterministic per-gap placement. New rule: `maxMinisPerGap = {1:1, 2:2, 3:2, 4:2, 5:3}[level] || 2`, evenly distributed across each adjacent station pair; gaps <400px skipped. Preserves ROAD_OBS emoji variety, quiz mechanism, visual style.
- **P0 — G16 train STILL bablas (Task #40)** (`games/g16-pixi.html:1114-1124, 1252-1266`): 4-part overshoot hard-guard. (1) Creep floor `2px → 0.2px`. (2) Hard clamp: if next frame-step would cross `nextObs.worldX + 5`, snap `worldX = nextObs.worldX - 1`, force STOPPED, show quiz. (3) Absolute per-frame cap `speed*dt → Math.min(speed*dt, baseSpeed/2)` — prevents tab-switch / dt-spike teleport. (4) Game-loop prologue overshoot recovery: scans for uncleared obstacle at `worldX < S.worldX - 20`, rewinds to `obs.worldX - 5`, forces STOPPED + quiz. Last-ditch guarantee — no obstacle can be silently skipped.

### Changed (late evening — Unified Scoring Engine migration, Task #25 scoring portion)
- **G17 Jembatan Goyang scoring → `GameScoring.calc()`** (`game.js:10451-10465`): replaced inline `damage === 0 ? 5 : damage <= 1 ? 4 : 3` ternary with `GameScoring.calc({correct: g17State.correct, total: g17State.totalBlocks, lives: maxDamage-damage, maxLives: 3})`. Damage re-cast as lives-lost so the engine's "lives lost ≥ 2 demotes" modifier applies cleanly. Loss path passes accuracy only.
- **G18 Museum quiz scoring → `GameScoring.calc()`** (`game.js:11113-11116`): pure accuracy quiz — `score === total ? 5 : score >= round(total*0.75) ? 4 : ...` replaced with `GameScoring.calc({correct: score, total})`. Legacy mapping preserved by engine (100%→5, ≥85%→4, ≥65%→3 matches old thresholds within ±1 bucket on edge cases).
- **G13 Pokemon Evo battle scoring → `GameScoring.calc()` + bonus** (`game.js:7824-7827`): evolution progression is not accuracy-based; used **bonus modifier** pattern — `GameScoring.calc({correct:1, total:1, bonus: evoPenalty})` where `evoPenalty = 0 / -1 / -2` for evolved2/evolved/none. Base perfect-run (5★) minus shortfall = identical 5/4/3 distribution as legacy.
- **G13b Pokemon Hunt scoring → `GameScoring.calc()` + bonus** (`game.js:8518-8529, 8559-8561`): kill-count threshold scoring (not accuracy). Both `g13bGameOver` (defeated path: 0/1/2★) and `g13bLevelComplete` (complete path: 1-5★) routed through `GameScoring.calc({correct:1, total:1, bonus: tier-5})`. Legacy threshold tables (`kills≥15→2`, `kills≥50→5`, etc.) preserved exactly via intermediate `_g13bTier`/`_g13bLcTier` constants, then fed into bonus delta. Every star value identical to pre-migration.
- **G10/G11/G12 central `endGame()` normalizer → `GameScoring.calc()`** (`game.js:1864-1867`): `endGame(stars)` formerly did `Math.min(5, Math.round(stars/maxRounds*5))`. Replaced with `GameScoring.calc({correct: stars, total: maxRounds})`. Covers G10 Pokemon Battle, G11 Kuis Sains, G12 Tebak Warna in a single change — all three now route through unified engine via shared helper.
- **Pattern documented** in LESSONS-LEARNED.md (§"Unified Scoring Engine — bonus-modifier pattern for non-accuracy games") for future survival/progression game migrations.

---

## 2026-04-21 — Battle Standards + HD Sprites + G22 + Repo Migration

### Added
- `POKE_TYPE_COLORS` canonical lowercase type-color map + `pokeTypeColor(type)` helper (`game.js:5014`).
- `spawnTypeAura(el, type, dur)` DOM aura-ring helper (`game.js:5024`) + `@keyframes pokeAuraRing` in `style.css`.
- G13c inline `POKE_TIER` sparse map + `pokeTierScale(slug)` (matches `game.js` logic) with transform applied to `#poke-player`/`#poke-enemy`.
- G13c `addAura(el, type)` upgrade: CSS var `--aura-color` drives type-colored attacker glow; both player + enemy callsites pass attacker type.
- CODING-STANDARDS.md section **Battle Standards — 5 Invariants** (contract for G10/G13/G13b/G13c).

### Bug Fixes
- **P0 — HD sprite regression** (`game.js`): `pokeSpriteOnline()` was mis-named and returned local low-res; now correctly returns HD CDN. `pokeSpriteVariant()` prefers SVG → HD CDN (dropped 50/50 coin-flip). G10 `loadSprHD`/`loadSprPlayer` rewritten with HD-first cascade; `image-rendering:pixelated` killed on player sprite.
- **P0.7 — G10 enemy cascade regression** (`game.js:5409-5413`): `loadSprHD` `onerror` branch tried `assets/Pokemon/sprites/{slug}.png` BEFORE `pokeSpriteCDN()` — so Gen 9+ Pokemon without a local SVG entry (Fuecoco id 909) rendered the back-facing low-res PokeAPI sprite. Symptom: pixelated **and** wrong facing direction (CSS `scaleX(-1)` assumes HD orientation; low-res PokeAPI sprites face the opposite way). Swapped order to mirror `loadSprPlayer`. Cache-bust `v=20260421c`.
- **P0.8 — G13c scoring** (`games/g13c-pixi.html`): `endBattleWin()` computed stars from cumulative badge count (`total>=15?5:…`) — first win always rated 1★. Migrated to unified `GameScoring.calc()` with per-battle inputs: team HP% as accuracy, wrong-answer counter, team-alive as lives. Added `battle.wrongAnswers` + `battle.totalAnswers` counters in battle init + `executeMove()`. Cache-bust `v=20260421d`.
- **P0.9 — Repo public + history scrub**: `git filter-repo --replace-text` removed exposed Gemini key from all commits (force-push rewrote 5 commit SHAs). Full secret scan clean. Flipped `baguspermana7-cpu/Dunia-Emosi` to **public** via GitHub API.
- **P1.0 — Gemini → WebP asset standard**: new `scripts/gemini-image-gen.py` helper + `prompts/` dir + CODING-STANDARDS section. WebP-only output (quality 82, method 6, max 1200px). Raw PNG never persisted. Key via `GEMINI_API_KEY` env var.
- **P1.1 — G17 visual polish** (`game.js:10205, 10303`; `style.css` new `g17CorrectRing` keyframe): consistent wooden-plank block labels (numbers 1..N, killed the 10+ emoji mix); correct-tap juice (`spawnParticleBurst` + green ring ripple at block center). Full G17 scene (sky/mountains/gorge/bridge/cliffs/train-cross) was already complete from prior sessions — polish only. Cache-bust `v=20260421e`.
- **P1.2 — Shared `QuestionBank`** (new `games/question-bank.js`): extracted inline G22 question arrays into a reusable module. API: `pick(cat)`, `get(cat, count)`, `wrongAnswers(cat, correct, count)`, `extend(cat, items)`, `categories`. G22 consumes via `<script src="question-bank.js">` loaded BEFORE the inline IIFE; legacy `Q_MATH`/`BALL_CATEGORIES`/`pickQ` aliases preserved for backward compat. Enables future kid games to share the same pool.
- **Battle standards (Fix A–G)**: consolidated 3 duplicate type-color maps, unified DOM aura helper, expanded `g10TypeFX` from 4→18 types, applied `pokeTierScale()` to G13 initial player + evolved forms, G13b already had tier scaling.
- **G22 Monster Candy — 7 UX fixes** (`games/g22-candy.html`): lerp-smoothed cursor follow via `translate3d` (no layout thrash), HD Psyduck `clamp(140px,26vw,220px)`, dynamic answer-pill layout (no overflow), pickup FX (catch-pop + 8-particle ring burst + center flash), background richness (12 clouds × 3 parallax speeds, 6 flyers, 5 pine trees, 3 snow-capped mountains, 24 flowers, rainbow), ground-anchored via `window.innerHeight - H*0.75` on resize, directional facing (scaleX + turn-flip animation).

### Repo Migration
- `Apps/dunia-emosi/` content now lives at `github.com/baguspermana7-cpu/Dunia-Emosi` (fresh-init workaround — `git subtree split --prefix=Apps/dunia-emosi` produced wrong tree containing sibling apps; remediated via rsync + force-push). Vercel `dunia-emosi.vercel.app` + `dunia-emosi-z2ss.vercel.app` auto-redeploy on push.

### Cache
- Bumped `index.html` script + style tags: `?v=20260421a` → `?v=20260421b`.

---

## 2026-04-20 — Evening Session

### Bug Fixes
- **G13**: Level Berikutnya freeze fixed — `showGameResult` button handler now wraps `b.action()` in `requestAnimationFrame` so modal `display:none` flushes before new level init. `initGame13` also clears stale sprite classes from previous level's victory/defeat animations.
- **G10**: Attack effect regression — `auraColors` map used capitalized keys (`Fire`, `Water`) but `POKEMON_DB.type` is lowercase (`fire`, `water`). Fixed to lowercase + added `typeLow` normalization for defensive safety. Silent fallback to purple aura is gone; type colors now render correctly.
- **Cache bust**: `game.js` + `style.css` version `?v=20260418b` → `?v=20260420a` so fixes propagate to users with cached assets.

### Added
- `POKE_TIERS` global slug→tier lookup + `pokeTierScale(slug)` helper (game.js near POKEMON_DB). Returns 1.0 / 1.2 / 1.3 / 1.3.
- CODING-STANDARDS.md section **Pokemon Assets Standard** — enforces tier-based sprite scaling across Pokemon games (G10/G13/G13b/G13c/G22, G19 exempted).
- CODING-STANDARDS.md section **Type Key Convention** — lowercase enforcement for all Pokemon type-keyed maps.
- CODING-STANDARDS.md section **Attack Effect Chain** — documents the 8-stage G10 pattern as standard for all battle games.
- CODING-STANDARDS.md section **Documentation Workflow** — mandate: every fix must update BOTH TODO-GAME-FIXES.md AND CODING-STANDARDS.md.
- Memory feedback: `feedback_always_document.md` enforces workflow at session start.

### Deferred (not blocking)
- Repo split migration: push to `baguspermana7-cpu/Dunia-Emosi` failed HTTP 408 (790 MB initial push timeout). Retry strategy TBD.
- Full live-test of G10 attack chain — aura color was a known bug; other 7 stages need visual confirmation.

### Note — Tier Scale Discrepancy
Previous changelog entry (v2.2.0) documented tier 4 legendary as 1.6×. Current
standard per user mandate (2026-04-20) is 1.3× for both tier 3 and tier 4.
`pokeTierScale` helper uses 1.3× for both. Inconsistent legacy inline code may
still use 1.6× for legendaries.

---

## v2.2.0 — 2026-04-13
### Bug Fixes
- G13b: "Lanjut" button now correctly closes Level Complete modal before starting new round (critical bug — game was stuck)
- G13b: Wild counter-attack no longer plays wrong-answer sound; uses distinct impact tone instead
- G13b: Pikachu player sprite now faces right (toward enemy) via CSS scaleX(-1)
- G13b: Star display replaced from `🌑` (renders as blue circle on some systems) to `☆` (universal hollow star)

### Features
- G13b: 5-star scoring system (was 3-star) — consistent with G14/G16 standard
- G13b: Result subtitle now shows actual score instead of hardcoded "30+ kill = ⭐⭐⭐"
- G13b: Wild Pokémon size scales by evolution tier (basic=1x, mid=1.2x, final=1.3x, legendary=1.6x)
- Pokemon DB: Expanded from 186 → 1,025 entries (all Gen 1-9) with `tier` and `gen` fields
- Pokemon DB: Local sprites used as primary source (`assets/Pokemon/sprites/`) with CDN fallback
- Pokemon DB: `_LEGENDARY_IDS` expanded to cover all Gen 1-9 legendaries/mythicals (79 total)
- G5: Card grid/tabs now correctly center on all screen sizes (mobile + desktop)
- G5: Pokémon tab icon changed to CSS Pokéball (no dependency on missing image)
- G5: Moon crescent decorative element hidden (was overlapping navbar)
- G14: Train sprites always in front (z-index 25 player, 18 AI) — were behind track elements
- G14: Smoke particles spawn 3 per call at 60% pressure threshold (was 1 at 80%)
- G14: Train colors more vibrant (brightness 1.35 + saturation 2.2)
- G14: AI trains have entrance animation when spawning
- G14: All bullet train emojis (🚄🚅) replaced with steam (🚂) in quiz content
- G17: Train z-index raised to 10 (was 5, behind bridge blocks at z-index 6)
- G17: Train crossing speed slowed from 1.5s → 2.8s
- G3: Mode badge hidden (was redundant with level indicator)
- Ideas: 50 game expansion ideas saved to `prompt/ide/50-ide-game-pokemon.md`

## v2.1.0 — 2026-04-11
### Added
- Level selector now works for ALL 9 games (G6-G9 previously hardcoded medium)
- XP system: every star = 10 XP, 5 level tiers (🥚🐣🐥🦅👑)
- XP display on result screen + Level Up animation
- Progress Dashboard screen (stats, achievements gallery, XP bar)
- Expanded achievements: 16 total (was 8)
  - Added: hundred_stars, driver_master, picture_master, word_master, trace_master, all_games, streak3, hard_mode
- Level tier badge in player chip header
- Dashboard accessible from menu with Reset Data option
- Image prompts updated to Disney Pixar / One Piece Toei 2023 style

## v2.0.0 — 2026-04-11 (In Progress)
### Added
- Level selector screen (Mudah/Sedang/Sulit) before each game
- 10 emotions (was 6): added Bahagia, Bosan, Kesal, Kagum
- 20 animal-letter pairs (was 10): full A–U coverage
- Animated world backgrounds per game screen (CSS)
- Achievement toast notification system (8 achievements)
- Daily streak tracking
- Progress dots row below progress bar
- Flash overlay on correct/wrong answer
- G5 (Memory) difficulty: 3×4 / 4×4 / 4×5 grids
- G2 (Breathing): advanced 4-6-8 pattern for Hard mode
- G4 timer: Easy=20s, Medium=15s, Hard=10s (was always 10s)
- Age tier system (5-6 / 7-8 / 9-10)
- `Fredoka One` display font
- Asset folder structure + prompt folder

### Assets Planned (pending AI generation)
- 5 background tiles (bg-*.webp)
- 7 Leo character expressions (leo-*.png)
- 4 vehicle assets (car-red, car-blue, rocket, submarine)
- 4 obstacle tiles
- 20 word/animal images (img-*.png)

---

## v1.2.0 — 2026-04-11
### Added
- Spring physics button animations
- World-themed animated backgrounds (CSS hearts, clouds, letters, stars)
- Sparkle burst effect on correct answers
- Confetti with physics (dx, rotation CSS vars)
- Star fly animation to score counter
- Leo bounce/mascot animations
- Streak badge on player chip
- 8 achievements with localStorage persistence

---

## v1.1.0 — 2026-04-11
### Added
- Game 3 (Huruf Hutan): Mode toggle huruf/angka
- Game 4 (Hitung Binatang): Timer countdown bar
- Game 5 (Cocokkan Emosi): Full memory match 4×4
- 2-player mode with turn switching
- LocalStorage star persistence per player name
- Web Audio API synthesized sounds

---

## v1.0.0 — 2026-04-11 (Initial)
### Added
- 5 mini-games: Aku Merasa, Napas Pelangi, Huruf Hutan,
  Hitung Binatang, Cocokkan Emosi
- Solo + 2-player modes
- Name + animal avatar selection
- Basic CSS animations + emoji characters
- Star reward system
