# Changelog — Dunia Emosi

## 2026-04-26 Night — Hotfix Bundle #91-#95 (game-end + variety + unification)

Cache bump: `v=20260426g` → `v=20260426h`.

### Critical fixes
- **#91 Pokemon variety**: `pickPokeForLevel` now uses REGION pool (3x city weight + 1x neighbors) — Pallet Town goes from 5→30+ unique enemies. Anti-repeat tracker prevents same enemy 2 rounds in a row.
- **#92 [object Object]**: `renderCityGrid` city.gym was string-coercing object → "[object Object]". Fix: `${c.gym.leader || c.gym}`.
- **#93 G13b modal unification**: `g13bGameOver` + `g13bLevelComplete` refactored to use `showGameResult({...})` instead of custom `#g13b-result`/`#g13b-level-complete` modals. Visual consistency with G13. Legacy HTML kept as fallback.
- **#94 Bulletproof endGame**: Split into `_endGameMain` + try-catch wrapper + `_endGameFallback` minimal DOM modal. 4-step diagnostic console.debug. Guarantees modal shows even if main path throws.
- **#95 G13 family selector freeze**: `pokeImg` was returning broken local path (missing ID prefix + slug normalization) → 63 broken thumbnails → onerror cascade → connection pool blocked. Fix: use `pokeSpriteAlt2`. Same root cause as Task #64.

### Process per user mandate
User: "audit semua, cek semua nggak satu2 begini... Kan kamu ada engine sendiri utk scoring dan modal. Kok bisa beda2"
- Inventoried 4 modal systems
- Unified G13b into showGameResult engine
- Standalone Pixi games (G13c, G14-22) keep GameModal — separate-page constraint
- Full standalone unification deferred to Phase 5 (8h refactor)

### Process — Task #90 (also today, didn't get its own changelog entry)
- `animateClass` migration applied to G10 + G11 stars-pop (proves Task #80 helper utility)

---

## 2026-04-26 — Phase 3 Polish (Tasks #87-#89)

Cache bump: `v=20260426e` → `v=20260426f`.

### Haptic feedback parity (Task #87)
- `playCorrect()` now triggers `vibrate([20, 40, 20])` — double-tap pattern
- Previously only `playWrong()` had haptic — engagement gap for 5-7yo
- Gated by `isVibrateOn()` user setting

### Region-aware bg lazy preload (Task #88)
- `prefetchRegionBackgrounds(regionId)` called from `openCityOverlay`
- Preloads only current region's bgs (~2MB) instead of all 178 (~21MB)
- Stagger 80ms apart, idempotent, browser-cached
- Saves ~18MB bandwidth on first session

### ASSET-PIPELINE.md (Task #89)
- New ~250-line doc covering folder map, sprite cascade, bg pipeline, audio pipeline, deployment workflow
- "Adding a new sprite/bg/region/asset" step-by-step guides
- Documents slug normalization gotcha (mr-mime → mr_mime), WebP browser support, Mega sprite strategy

---

## 2026-04-26 — Documentation Phase 3 (Tasks #85-#86)

### Task #85 — CODE-REVIEW-CHECKLIST.md
- Comprehensive ~280-line checklist enforcing 4 tiers (BLOCKING/HIGH-PRIORITY/NICE-TO-HAVE) of pre-commit verification
- Each item references specific past bug (#69-#84) and Lesson Learned (L16-L24)
- Operationalizes `feedback_structured_verification.md` mandate
- Pre-commit verification bash script included

### Task #86 — ARCHITECTURE-INDEX.md
- Master codebase entry point document (~330 lines)
- Documentation map, code architecture tree, state lifecycle ASCII diagram
- "Adding a new {feature,region,math game}" step-by-step guides
- Key conventions, project stats, known tech debt, decision tree
- Cross-references all 12 docs in `documentation and standarization/`

### Why
- Task #84 root cause was procedural gap (state property propagation missed in city picker plan)
- These docs codify procedural safeguards to prevent recurrence
- AUDIT-2026-04-25.md Phase 3 P2-8 + P2-10 satisfied

### Touched
- `documentation and standarization/CODE-REVIEW-CHECKLIST.md` (NEW)
- `documentation and standarization/ARCHITECTURE-INDEX.md` (NEW)
- TODO-GAME-FIXES.md, this CHANGELOG

---

## 2026-04-26 CRITICAL Hotfix — Task #84: post-victory freeze (G10/G13/G13b/G13c)

Cache bump: `v=20260426c` → `v=20260426d`.

**Bug**: All 4 games (G10/G13/G13b/G13c) freeze/error after game-end (win OR lose). Modal never appears, user stuck.

**Root cause**: Task #66 city selector bypassed `startGameWithLevel()` → didn't init `state.gameStars`/`currentPlayer`/`maxPossibleStars` → `showResult` throws TypeError on `state.gameStars[0]` (undefined) → silent crash.

**Fix**: 5 init points + 1 defensive guard in `showResult`:
- `renderCityGrid` city tap — full state init matching `startGameWithLevel`
- `initGame10`, `_initGame13Impl`, `initGame13b` — defensive resets
- `showResult` line 1836 — guard before reading `state.gameStars[0]`

**Process**: per `feedback_structured_verification.md` — comprehensive state-property audit mandatory when bypassing legacy entry points.

---

## 2026-04-26 — Audit Phase 2 (Tasks #80-#82)

Cache bump: `v=20260426a` → `v=20260426b`.

### Shared helpers (Task #80)
- `animateClass(el, className, durationMs)` — replaces 50+ inline class-add+setTimeout patterns
- `addTrackedListener` + `clearTrackedListeners` — WeakMap registry to prevent leaked listeners (audit found 27 add vs 12 remove imbalance)
- Per Lesson L22 (centralized helper pattern). Migration to existing callsites is incremental.

### Dead code removal (Task #81)
- `_initGame14_legacy` (58 lines) — replaced by standalone `games/g14.html`
- `_initGame16_legacy` (32 lines) — replaced by `games/g16-pixi.html`
- `buildModernTrainSVG` (24 lines) — replaced by `buildDieselLocoSVG`
- **114 lines removed**, no function references remaining

### Audit corrections (Task #82)
- Bahasa Indonesia spot-check: already mostly Indonesian; audit over-flagged
- Pause integration: G15/G14/G16/G20 already have `gamePaused` checks in main tickers; audit incorrectly flagged L17 violation

---

## 2026-04-26 — Audit Phase 1 Quick Wins (Tasks #73-#79)

Cache bump: `v=20260425e` → `v=20260426a`. From AUDIT-2026-04-25.md Phase 1 implementation.

### Performance (Tasks #73)
- Battle BGM `preload="auto"` → `"none"` (saves 7.5MB initial bandwidth)
- 3 data scripts now `defer` — unblock HTML parsing by ~51KB
- 34 `<img>` tags lazy-load — defer ~400KB menu deco/achievement assets

### Accessibility WCAG 2.1 AAA (Task #74)
- `@media (prefers-reduced-motion: reduce)` block — disable animations for autism/ADHD/vestibular/photosensitivity users
- Mandatory for compliance; many children have undiagnosed sensitivities

### Mobile UX (Tasks #75, #76)
- L18 safe-area pattern applied to `#screen-game3` and `#screen-game4` (was `15vh !important` only — could clip below mobile bottom UI)
- `@media(max-width:360px)` override: tap targets `min-width: 44px; min-height: 44px` per Apple HIG (RDE token `--rz-scale: 0.7` was scaling below)
- `:active` parity for `.mode-card`, `.g10-party-card` hover-only patterns — iOS touch feedback restored

### Code quality (Tasks #77, #78, #79)
- G13c gym Pokemon sprite: remote-only → local-first per Lesson L16
- `.btn-back` contrast: rgba(255,255,255,0.1) ~1.5:1 → rgba(0,0,0,0.4) + 2px white border >10:1 (WCAG AA pass)
- G2 Napas Pelangi: added `playCorrect()` audio on session complete

### Audit corrections
- G7 Tebak Gambar + G11 Kuis Sains audited — already had `playCorrect()` (UX audit over-counted)
- Dead code removal deferred to Phase 2 — too large for hotfix bundle

### Touched
- `index.html` (audio preload, 3 defer, 34 img lazy, cache bump)
- `style.css` (reduced-motion, safe-area, tap targets, :active, contrast)
- `game.js` (G13c sprite, G2 audio)
- TODO-GAME-FIXES.md, this CHANGELOG, memory

---

## 2026-04-25 Late Hotfix — Tasks #70/#71/#72 bundle (G10/G13/G13b post-city-progression)

Cache bump: `v=20260425d` → `v=20260425e`.

### Task #70 — G10 stuck after winning final round (state.currentGame missing)
- City selector launched games without setting `state.currentGame` → `endGame()` silently corrupted + UI didn't transition
- Fix: derive `state.currentGame` from `_citySelectorGame` in `renderCityGrid` (number for G10/G13, parsed 13 for G13b)
- Added defensive console.error guard in `endGame()` for future regressions

### Task #71 — Sprite remote-primary regression (Lesson L16 incomplete)
- 5 callsites in G13/G13b still loaded sprites from REMOTE pokemondb.net as PRIMARY → caused wrong-facing player + invisible legendary sprites
- Switched to local-first cascade across:
  - `switchG13bPlayerPoke` (party picker → player)
  - G13 `loadSpr` helper
  - G13 evolve sprite swap
  - G13b player init + wild spawn + wild re-spawn
- All now use `pokeSpriteAlt2(slug) || pokeSpriteOnline(slug)` with 2-stage onerror fallback

### Task #72 — G13b modal "Main Lagi/Lanjut" returns to City picker
- Added `g13bResultMainLagi()` helper — routes to `openRegionOverlay('13b')` if launched via city picker; falls back to `startQuickFire()` for legacy random mode
- Both `g13b-result` and `g13b-level-complete` modal buttons now call new helper

### Process
- Reinforced `feedback_structured_verification.md` mandate: state-property propagation audit + grep audit for asset-source changes

### Touched
- `game.js` (renderCityGrid, endGame, 6 sprite local-first fixes, g13bResultMainLagi)
- `index.html` (2 modal redirects + 4 cache bumps)
- `TODO-GAME-FIXES.md`, this CHANGELOG, memory

---

## 2026-04-25 Hotfix — Task #69: CITY_PACK script load fix

Cache bump: `v=20260425c` → `v=20260425d` (atomic across all 4 files).

- **Bug**: City overlay showed "🚧 Coming soon" for ALL regions on Vercel deploy.
- **Root cause**: `games/data/city-pokemon-pack.js` (created in commit `4cddc31`) was not registered as `<script>` in `index.html` → `CITY_PACK` undefined globally.
- **Fix** (`index.html`):
  - Added `<script src="games/data/city-pokemon-pack.js?v=20260425d">`
  - Bumped 4 cache versions atomically (style.css, region-meta, city-progression, game.js → all `v=20260425d`)
- **Hardening**: explicit `console.error` guard in `renderCityGrid` if `CITY_PACK` undefined, surfaces future regressions immediately.
- **Process**: new internal mandate — every plan with new module file MUST include Cross-File Integration Checklist (script tag registration, cache versioning, browser smoke test).

---

## 2026-04-25 Late — City Progression System (127 cities, 10 regions)

Cache bump: `v=20260425b` → `v=20260425c`.

### Region → City progression replaces "Level 1-N" selector [Task #66]
- **Goal**: G10/G13/G13b — replace random level selector dengan journey ala anime/game Pokémon. 127 cities across 10 main regions (Kanto-Paldea+Hisui).
- **Unlock rule**: Sliding frontier — `unlockedCount = min(2 + completedCount, totalCities)` per region. Always 2 cities playable per region; each completion opens 1 more. Replay tidak menambah unlock count. All regions terbuka dari awal.
- **Data layer**:
  - `games/data/region-meta.js` — 10 region meta (color, icon, gen badge, hue-rotate filter for icon tinting)
  - `games/data/city-progression.js` — unlock helpers (`getUnlockedCount`, `isCityUnlocked`, `isCityCompleted`, `setCityComplete`, `getCityStates`, `migrateLegacyLevelsToCity`)
  - `games/data/city-pokemon-pack.js` — 127 cities × 5-7 Pokemon each = ~700 Pokemon entries with canonical packs (gym leader teams, route encounters, anime episodes)
- **UI**:
  - Stage A `#region-overlay` — 10 region cards (mobile 2-col, PC 5-col), tinted shared `region.webp` icon (14.7KB compressed dari Region.png 32KB)
  - Stage B `#city-overlay` — N city cards (mobile 1-col, PC 3-col), tinted shared `cities.webp` icon (7.5KB compressed dari Cities.png 36KB)
  - 3 visual states: 🔒 locked / ▶ available / ⭐⭐⭐ completed
- **Game wire-up**:
  - Game tiles `gtile-10/13/13b` onclick → `openRegionOverlay(N)` instead of legacy `openLevelSelect(N)`
  - `pickPokeForLevel()` (game.js:5500) — checks `state.selectedCity`, prefers city pack
  - `loadCityBackground(fieldEl)` helper — loads city bg via `background-size:cover` (no stretch)
  - G10/G13/G13b `initGame*` calls `loadCityBackground` first
  - G13b `g13bSpawnWild()` uses city pack as wild pool when city selected
  - Victory paths: G10/G13/G13b call `setCityComplete(gameNum, region, citySlug, stars)`
- **Migration**: legacy `prog.gN.completed=[1,2,3...]` → first N cities of Kanto/Johto/etc. via `migrateLegacyLevelsToCity()`. Idempotent via `cityMigrationDone:'20260425'` flag.
- **Asset coverage**: 127 PC + 127 mobile background WebP (manifest-verified). 498 unique Pokemon slugs (audit-clean against local 1025 sprite pack).
- **Slug normalization**: `_slugToAlt2File()` helper handles `mr-mime → mr_mime`, `nidoran-f → nidoranf` (local files use underscore, pokeapi uses dash)
- **Spec**: `documentation and standarization/CITY-PROGRESSION-SPEC.md`

### Touched
- `game.js` (loadCityBackground helper, pickPokeForLevel city-aware, _slugToAlt2File slug normalizer, openRegionOverlay/openCityOverlay/closeRegionOverlay/closeCityOverlay/backToRegionOverlay/renderRegionGrid/renderCityGrid, initGame10/13/13b bg load, g13bSpawnWild city pool, victory paths setCityComplete)
- `style.css` — `.region-overlay`, `.city-overlay`, `.region-card`, `.city-card` (with locked/available/completed states), `@keyframes regionSlideUp`/`cityNewlyUnlocked`
- `index.html` — `#region-overlay`+`#city-overlay` structures, gtile-10/13/13b onclick redirects, script imports for region-meta + city-progression + city-pokemon-pack, cache bump `v=20260425c`
- `assets/Pokemon/others/region.webp`+`cities.webp` — compressed from PNG (44%+21% size reduction)
- New files: `games/data/{region-meta,city-progression,city-pokemon-pack}.js`
- New doc: `documentation and standarization/CITY-PROGRESSION-SPEC.md`
- Updated: `LESSONS-LEARNED.md` (L23 sliding-frontier unlock, L24 filter-tinted single asset)
- `TODO-GAME-FIXES.md` Task #66 ✅

---

## 2026-04-25 Evening — G13 Evolution Expansion (44 chains, Mega) + Math Difficulty Rule

Cache bump: `v=20260425a` → `v=20260425b`.

### G13 Evolusi Math — 44 evolution chains with 3-stage Mega Evolution [Task #67]
- **Goal**: 15+ popular + 20+ Ash + scenario evolusi 1x/2x/3x bertahap by level. Mega di level tengah dst.
- **Data**: `G13_FAMILIES` expanded 16 → 44 chains
  - 17 popular: kid-iconic generic (Bulbasaur, Charmander, Squirtle, Pichu, Caterpie, Abra, Gastly, Machop, Geodude, 3 Eeveelutions, Mudkip, Snivy, Fennekin, Sobble, Munchlax)
  - **21 Ash**: Pikachu, Charizard X, Bulbasaur, Squirtle, Butterfree (Gmax), Pidgeot (Mega), Snorlax (Gmax), Heracross (Mega), Meganium, Sceptile (Mega), Glalie (Mega), Infernape, Staraptor, Garchomp (Mega), Pignite, Krookodile, **Greninja (Ash-Greninja)**, Talonflame, Incineroar, **Lucario (Mega)**, Dragonite
  - 5 cool/pseudo: Dratini, Larvitar (Mega Tyranitar), Beldum (Mega Metagross), Bagon (Mega Salamence), Gible (Mega Garchomp)
  - 1 random pseudo
- **Tier expansion** (`G13_DIFF`): added `stages: 1|2|3` flag per tier
  - 1-4 easy / 5-9 medium: stages=1 (1 evolution only)
  - 10-16 hard / 17-25 2stage / 26-35 epic: stages=2 (2 evolutions)
  - **36-45 3stage / 46-55 legendary: stages=3 (Mega Evolution)** ⭐
- **3rd-stage flow**: new `canEvo3` gate + `s.megaForm` flag + `synthMaxBoostForm()` helper untuk chains tanpa canonical Mega
- **Visual-overlay strategy** (per Lesson L20): Mega forms reuse stage 2 sprite + CSS aura ring (gold/blue/red/rainbow) + crown badge + 1.3× scale. No Mega-specific sprites needed (1025 local base sprites cukup). See `applyMegaOverlay()` / `clearMegaOverlay()` helpers.
- **Sprite localization** (per Lesson L16): evolution sprite swap di `g13EvolveComplete` (game.js:8300) sekarang `pokeSpriteAlt2()` first, fallback remote — fixes pre-existing remote-only crash potential di evolve animation
- **Selector UI**: category tabs (🎒 ASH default / ⭐ POPULER / ⭐ KEREN / 🎲 ACAK) sticky di overlay header. Mega indicator pill on family cards. `lazy` + `decoding=async` on grid thumbnails.
- **Default selection**: `'ash-pikachu'` (most kid-recognized) saat first open
- **Spec**: `G13-EVOLUTION-CHAIN-SPEC.md`

### Math Difficulty Rule — Easy default, Hard opt-in [Task #68]
- **Rule**: Easy (default) = + and − only, max 20. Hard (opt-in via Settings) = + − × ÷, max 50.
- **Centralized helper**: `getMathLimits()` (game.js:1640+) returns `{advanced, maxNum, allowedOps}` — single source of truth
- **Patched generators**:
  - G10 `g10GenQuestion` (game.js:5670)
  - G13 `g13GenQuestion` (game.js:7892) + megaForm boost +15
  - G13b `g13bGenQuestion` (game.js:8710) + base max raised 20→30 at kills 30+
- **Audit**: G1/G3/G4/G5/G7/G10/G11/G12/G13/G13b all reviewed, all compliant
- **Default state**: `localStorage['dunia-emosi-mathadv']` undefined → easy mode → ✓ child-safe
- **Spec**: `MATH-DIFFICULTY-STANDARD.md`

### Touched
- `game.js` — G13_DIFF (stages flag), G13_FAMILIES (44 entries), g13PickChain, g13GenQuestion, g13Answer (canEvo3), g13EvolveComplete (sprite localize + Mega overlay), openG13FamilySelector (tabs), getMathLimits, g10GenQuestion, g13bGenQuestion, synthMaxBoostForm, applyMegaOverlay, clearMegaOverlay
- `style.css` — `.poke-mega-aura`, `.aura-{gold,blue,red,rainbow}`, `@keyframes megaPulse(Rainbow)`, `.poke-mega-badge`, `@keyframes megaBadgeBounce`, `.g13-fam-tabs`, `.g13-fam-tab`, `.g13-fam-mega-indicator`
- `index.html` — `#g13-fam-tabs` strip + cache bump `v=20260425b`
- `TODO-GAME-FIXES.md` — Task #67 + #68 ✅
- `documentation and standarization/`:
  - **NEW**: `G13-EVOLUTION-CHAIN-SPEC.md` (formal spec)
  - **NEW**: `MATH-DIFFICULTY-STANDARD.md` (formal spec)
  - **UPDATE**: `LESSONS-LEARNED.md` (L20-L22)

---

## 2026-04-25 — G13B picker crash fix + G10 choices layout

Cache bump: `v=20260424i` → `v=20260425a`.

### G13B (Quick Fire) — party picker stuck + tab crash fix [Task #64]
- **Symptom**: User reported picker (🎒) opens but ✕ doesn't work, then tab crashes after a few seconds. Stuck at pokemon selection screen.
- **Fix 1 — local-first sprite** (`game.js:5377-5388` renderPartyGrid): switched from `pokeSpriteOnline` (remote pokemondb.net) to `pokeSpriteAlt2` (local `assets/Pokemon/pokemondb_hd_alt2/...webp`). Trainer Ash has 41 Pokémon → previously triggered 41+ remote fetches simultaneously, blocking the main thread on slow mobile networks until OOM-tab-kill. Added `loading="lazy"` + `decoding="async"`. Two-stage onerror chain (local → remote → github raw) gated by `dataset.fallback` to prevent loops.
- **Fix 2 — pause game while picker is open** (`game.js:5333-5341` closePartyPicker, `game.js:5440-5451` openG13bPartyPicker): set `g13bState.paused = true` on open and `false` on close (only when ctx=g13b and phase='playing'). Reuses existing `_g13bLegAutoAtk` interval guard at `game.js:8410` — no clearInterval/restart logic needed. Prevents legendary auto-attack from damaging player while picker is up.
- **Fix 3 — current-Pokemon detection** (`game.js:5363-5365`): `currentId` now reads `g13bSavedPoke.id` when `partyPickerCtx === 'g13b'`. Previously always read `g10State.playerPoke.id` even in G13B context, so the "✔ Aktif" badge never appeared in G13B.

### G10 (Math Battle) — answer choices 4-inline + 10vh bottom safe-area [Task #65]
- **Symptom**: User reported 2×2 choices grid getting clipped by mobile browser bottom UI (Chrome auto-hide URL bar, iOS Safari tab strip). Wanted G13c-style horizontal compact layout.
- **Fix 1 — 4-inline grid** (`style.css:2485` `.g10-choices`): `grid-template-columns:1fr 1fr` → `repeat(4, 1fr)`. Gap 12px → 8px. Max-width 460px → 480px. All 4 choices on a single row.
- **Fix 2 — smaller buttons** (`style.css:2498-2509` `.g10-cbtn`): padding 20px 12px → 14px 6px, font-size 32px → 24px, border-radius 20px → 14px, added `min-height:60px` (Apple HIG min 44pt). Box-shadow drop adjusted 5px → 4px for tighter visual.
- **Fix 3 — bottom safe-area** (`style.css:2466` `.g10-qpanel`): `padding-bottom:16px` → `max(10vh, calc(env(safe-area-inset-bottom, 0px) + 16px))`. iPhone SE → 67px; iPhone 14 → 89px clearance — exceeds worst-case mobile bottom UI overlap.
- **Fix 4 — responsive media queries** (`style.css:2268-2288`): scaled `.g10-cbtn` for narrow viewports — 480px: 20px font + 52px min-height; 400px: 18px + 48px (also bumped qpanel padding to use the safe-area max-formula); 360px: 16px + 44px (still meets Apple HIG).

### Touched
- `game.js` (renderPartyGrid, openG13bPartyPicker, closePartyPicker)
- `style.css` (.g10-choices, .g10-cbtn, .g10-qpanel + 3 media queries)
- `TODO-GAME-FIXES.md` (Task #64 + #65 ✅)
- `documentation and standarization/LESSONS-LEARNED.md` (L16-L19)

---

## 2026-04-24 — G13 family selector + G13C mid-battle button hide + card juice across quiz games + Museum Ambarawa expansion

Cache bump: `v=20260423d` → `v=20260424c` (3 patch cycles: a/b/c).

### G13 (Evolusi Math) — curated evolution-chain selector
- New `G13_FAMILIES` array (`game.js:7205`): **15 curated** evolution chains — 10 popular (Bulbasaur, Charmander, Squirtle, Pichu, Caterpie, Abra, Gastly, Machop, Geodude, Eevee) + 5 cool pseudo-legendary (Dratini, Larvitar, Beldum, Bagon, Gible). Each card shows full 3-stage evolution preview.
- New `openG13FamilySelector()` UI: grid overlay with card thumbnails from `pokemondb_hd_alt2/` WebP pack. "Random" pseudo-family prepended as first option — picks from existing 142-entry `G13_CHAINS` pool per level.
- `g13PickChain(lv)` now honors `localStorage.g13_lastFamily`. Synthetic chain uses family's Pokémon refs + level-tier difficulty metadata. evolved2 gated behind medium+ tiers.
- New `🎒` button in `#g13` header opens the selector; picking restarts current level with new family.

### G13C (Gym Pokémon) — hide 🎒 Tim button during active battle
- `startBattle()` sets `#btn-pkg.style.display = 'none'`. Button re-appears on gym-select via all 3 modal callbacks (`onAgain`/`onBack` for both win and loss paths).
- Root cause: `battle.playerTeam` was cloned at battle-init, so mid-battle team swaps had no effect — user saw old roster despite updating localStorage. Hiding the button prevents confusion entirely.

### P1/P2/P5 — Card-anchored correct-answer juice (all quiz games)
- New `spawnCorrectCardJuice(btn, opts)` + `spawnWrongShake(btn)` helpers (`game.js:1946`): ring overlay + ✓ tick + pulse attached as `position:absolute` *children* of the button — survives transformed ancestors (where `position:fixed` sparkles got misplaced).
- CSS keyframes: `correctPopAnim` 0.58s, `correctRingAnim` 0.85s green ring ripple, `correctTickAnim` 1.25s ✓ bounce, `wrongShakeAnim` 0.5s horizontal shake.
- Wired into G1, G3, G4, G7, G11, G12, G18. When user picks wrong, correct card also gets juice (no burst — less celebratory).
- **P1 G18 fixed**: ✓ lands ON the selected button, not empty space between buttons.
- **P2 G12 fixed**: Burst on tapped card, not stage floor below. (User reported as "G17 Tebak Hewan" but actual game was G12 with animal-shadow cards.)

### P3 — Museum Ambarawa expansion
- Modal widened `.g18-modal-box` max-width 340px → **560px** with scroll cap `max-height:88vh`. `#g18-modal-details` grid now `auto-fit minmax(110px, 1fr)`.
- New `#g18-modal-history` section with gold left-border + 300-400 char narrative. Rendered when train has `history` field.
- **9 new Indonesian trains** in `G18_TRAINS` (27 → 36): SS 1867 Semarang–Tanggung pioneer, C51 Dwipanggo kepresidenan, D52 Djojobojo Soekarno era, BB200 diesel pertama, BB301 Bulu Sikat Ganefo, CC202 Rajawali Sumatera, Taksaka, LRT Palembang Asian Games 2018, KA Bandara Soetta Railink, KRL JR 205 retrofit.
- **6 existing entries enriched** with `history`: B2507 (SLM Winterthur rack), C1218 (Staats Spoorwegen), CC200 Setan Ijo (Sukarno diesel revolution), KRL Commuter, Whoosh KCIC, MRT Jakarta.

---

## 2026-04-23 Night — Character train polish (ratio scale + outline + smoke follow)

Cache bump: `rz-responsive.js` + `train-character-sprite.js` → `v=20260423c`.

- **Character train ratio-driven scale**: Replaced PC-reference `trainScale()` clamp with viewport-ratio formula `h * 0.00078` bounded `[0.32, 0.55]`. Character height now ≈ 7% of viewport across all devices (was ~11% on PC baseline, ~13% on mobile).
- **White outline underlay**: White-tinted sprite clone 6% larger, alpha 0.85, rendered behind the main sprite — gives crisp silhouette edge against dark G16 night theme.
- **Smoke follows train live**: `spawnSmoke()` now reads `container.y` (live) instead of `state.baseY` (mount-time snapshot). Smoke stays with train across bobs, lane switches, and resizes.

---

## 2026-04-23 Evening — 7 bugs + 2 bonuses (scoring, modal freeze, sprite facing, physics, collision, vehicle render, letter collection, reload freeze)

Cache bump: `v=20260423a` → `v=20260423b`.

- **G13 scoring**: Fixed inverted star mapping at `game.js:7895` — perfect evolved runs now show correct 4-5★ instead of 3★.
- **G13 modal freeze**: Added `_showingGameResult` guard + hard-clear of evo overlay (z-index 600 trap) + `setTimeout` instead of RAF on button actions.
- **G10 Charmander facing**: Flipped `pokeFacing` default `'L'` → `'R'` (HD CDN sprites naturally face screen-right). Swapped `.g10-espr/--flip` and `.g10-pspr/--flip` CSS defaults accordingly.
- **Ducky Volley**: Hit upward impulse 1.5× (`-1.8 → -2.7`, min `-1.4 → -2.1`). `MAX_BALL_V` raised 3.8 → 5.0 so boosted arc isn't clipped.
- **Monster Candy collision**: Trigger at neck area (`monsterY - spriteH*0.67`) instead of foot line. Live sprite height from `offsetHeight`.
- **Monster Candy pop**: Scale-squash keyframe (0.9 → 1.12 → 1) + golden glow, 0.48s cubic-bezier-overshoot. 
- **G6 vehicle render**: New `rebuildCarSprite()` swaps PIXI.Text ↔ PIXI.Sprite on start. Non-car emojis (🚂🚀🛸) now correctly render as glyph, not blue sport car.
- **G6 duplicate letter**: `hitTile` re-verifies `t._letter === S.currentWord[S.letterIdx]` at hit time instead of trusting stale `_correct` spawn flag.
- **G6 reload freeze**: `cleanupBeforeReload()` stops PIXI ticker + BGM before `location.reload()`, wrapped in `setTimeout(30)` to let hide-transition finish.

---

## 2026-04-23 — Omnibus: G10 facing root-cause, modal guard, G14 fixes, responsive, G13C packages

Cache bump: `v=20260423a`.

### Bugs
- **G10 Pokémon facing** — Complete refactor. All 12 atk/hit/defeat/swap keyframes migrated from hardcoded `scaleX(-1)` to `scaleX(var(--flip))`. New `applyPokeFlip(el,slug,role)` helper writes both the CSS custom property and inline transform. `switchPlayerPoke` reapplies flip before AND after swap animation (guards `animation-fill-mode:forwards`). Fixes dozens of repeat-reported facing bugs across every combat animation.
- **End-game modal freeze** — Added `state._showingResult` double-invocation guard (auto-released 1.5s or on playAgain/nextLevel/goToMenu). Overlays now hard-cleared with inline `display:none`. Achievement toast cascade deferred 450ms so modal renders responsive first.
- **G14 train — 3 bugs** — (a) `c.scale.x=1` lock on player container (defensive against backward-facing). (b) Wheel-to-rail offset `max(0, laneH*0.22 − 19)` shifts container so wheels visually sit on bottom rail. (c) Difficulty multiplier added: easy=1.6×, hard=0.85× obstacle interval. `cfg.difficulty` now piped through sessionStorage. Easy floor raised 900ms→1300ms.

### Responsive overhaul
- Fixed-px character/emoji sizes (`.g1-char`, `.g3-animal`, `.g8-hint-img`, `.result-mascot`) converted to `clamp()` with mobile-first min values.
- New breakpoints: 768px (tablet), 1200px (desktop), landscape-phone (orientation:landscape + max-height:500px).
- `--rz-scale` now scales up to 1.2× on desktop (was capped 1.0×).
- All 7 PIXI canvas resize handlers capped at 1400×1000 (g14, g13c, g15-pixi, g16-pixi, g19-pixi, g20-pixi, g22-candy).

### Feature — G13C 10 Pokémon team packages
- Replaced single `PLAYER_TEAM` with `PLAYER_PACKAGES` array: 10 themed teams, 60 Pokémon, 240 moves.
  - Tim Ash Kanto Awal (base) · Final · Tim Ash XY Awal (base) · Final · Tim Horizons · Starter Hoenn · Tim Evoli · Bintang Mega · Burung Legendaris · Klub Pseudo-Legend
- HP tiers: base=90, final=105–115, mega=120–130 (balance across packages).
- New `🎒 Tim` HUD button opens a fullscreen selector (theme-colored cards, 6 sprite thumbs, tier badge). Selection persists in `localStorage.g13c_lastPackage`; battle init reads the current package.
- Mega / Horizons sprites (sprigatito, fuecoco, quaxly, terapagos, hatenna, charizard-mega-x, venusaur-mega, etc.) fall back to HD CDN via existing `SPRITE_HD` helper.

---

## 2026-04-22 — Pause-bypass fixes in G13b + G15 (Tasks #62, #63)

Follow-ups from Task #55 audit which identified pause-state leaks in two other games.

### #62 — G13b legendary auto-attack (game.js:8106)
`_g13bLegAutoAtk` setInterval (14s cadence) invoked `g13bWildHitsPlayer()` without checking pause state — legendary Pokemon could damage the player while game was paused. Added `if (st.paused) return;` guard inside the interval callback. Timer tick still fires on wall clock but the damage-application is gated.

### #63 — G15 math-quiz wall-clock timer (games/g15-pixi.html:1493)
8-second math quiz setTimeout continued counting during pause → quiz could auto-fail while the user was paused. `togglePause()` now halts + resumes the timer: on pause, `clearTimeout` + record remaining (`performance.now() - _mathTimerStart`); on resume, restart setTimeout with the remaining duration. Timer fill CSS animation frozen with `transition:none` during pause and re-started with remaining-width interpolation on resume.

### Verification
- `node --check game.js` + inline-script check on `games/g15-pixi.html` → clean.

---

## 2026-04-22 — G15/G16 rail-anchor + 5% TRAIN_X (Tasks #60, #59)

### User mandate
Screenshot: Casey JR wheels floating above rail in G16. User: "ini masih posisinya terlalu ke atas. Jadi terlihat terbang tidak berjalan di rail" + "jarak 5% dari total lebar layar".

### New engine helpers (`games/train-character-sprite.js`)
- `CharacterTrain.wheelAnchor(cfg)` — returns Y offset of LOWEST wheel bottom, from `wheelPositions`. Replaces per-train magic `bottomPaddingOffset` with a self-reporting derivation.
- `CharacterTrain.computeTrainX(cfg, viewportWidth, pct)` — returns TRAIN_X targeting `pct` of viewport (default 5%), clamped to the train's leftmost wheel safe-min.

### Algorithm
```
railSurfaceY (G15) = LANE_Y[playerLane] + 14  // top of upper rail line in lane
railSurfaceY (G16) = getTrackY(H) - 5          // top of rail tie strip
trainContainer.y = railSurfaceY - wheelAnchor(scaledCfg)
trainContainer.x = computeTrainX(scaledCfg, W, 0.05)
```
Wheel bottom LANDS EXACTLY on drawn rail surface for Casey / Linus / Dragutin / Malivlak, any viewport, any RZ.trainScale().

### Changed
- **`games/g15-pixi.html`** — buildTrain character branch rewritten. initPixi + resize handlers use `max(40, W*0.05)`. Cache `train-character-sprite.js` v=e → v=f.
- **`games/g16-pixi.html`** — buildTrain character branch rewritten. `S.trainBaseY` stored in state and reused in per-frame bob update (updateTrain ~line 1466) so character train doesn't snap to legacy `tY-18`. initPixi + resize handlers use `max(40, W*0.05)`.
- **`index.html`** — v=ad → v=af.

### Verification
- `node --check` clean on all modified files.
- Algorithm math per train (scale=1): Casey anchor=-2 → wheel bottom on rail. Linus=0, Dragutin=3, Malivlak=4 — all land on railSurfaceY exactly.

### `bottomPaddingOffset` deprecation
Kept for backward-compat but no longer used for rail alignment. New optional `visualOffset` field replaces it as a pure artistic nudge (default 0).

---

## 2026-04-22 — G13 stuck-no-modal fix (Task #57)

### Summary
Fixed G13 Evolusi Pokemon, G13b Quick Fire, and G13c Gym Badges battle flows where the enemy could faint but the victory/defeat modal never appeared. User reported: "di tengah sesi atau sudah akhir ini tiba2 berhenti stuck pokemon lawan hilang tapi nggak ada modal keluar". All three games relied on single-point `setTimeout()` chains to transition from `hp<=0` → fainting animation → result modal; any mid-sequence exception or race condition could leave the state permanently stuck at `wildHp=0, phase='player_attack', locked=true`.

### Root causes (5 compounding)
1. **`g13Answer` sync FX block** (`game.js:~7485`): long synchronous audio + DOM writes (`showMovePopup`, `spawnTypeAura`, sprite class toggles) executed **before** the 600ms transition `setTimeout`. Any throw in that block (e.g., `btn.getBoundingClientRect()` on a stale button, or `playAttackSound` on a blocked autoplay context) short-circuited the scheduler → no victory call.
2. **`g13Victory` non-idempotent**: no entry guard — if both the primary path AND a future watchdog called it, `setLevelComplete` / `saveStars` ran twice and modal would conflict.
3. **`g13bKillWild` single timer**: `setTimeout(() => g13bLevelComplete(), 1900)` was the only trigger for the legendary victory overlay. Background-tab throttling (Chrome clamps to 1s min for inactive tabs) or a thrown callback meant the overlay never showed.
4. **`g13bLevelComplete` unguarded inner setTimeout**: the 800ms-delayed `overlay.style.display='flex'` block had no try/catch. A `GameScoring.calc` throw (seen once with malformed state) blocked the display call silently.
5. **`g13c-pixi.html queueMsgs` race**: `queueMsg` auto-advances every 1200ms via `setTimeout(advanceMsg)`. A user tap during the tail of the auto-advance window drained the queue before the `finalCb` (`endBattleWin` / `endBattleLose`) fired → battle never ended.

### Fix pattern — deterministic failsafe watchdogs
Same pattern as Task #49 G16 arrival (position-deterministic state machine). The primary setTimeout path stays as the happy path; each terminal state additionally gets an independent watchdog. End-of-battle functions are now idempotent.

### Fix details

**`game.js` g13Answer (~L7485)**
- Wrapped entire FX block (correct + wrong branches) in try/catch so an FX exception never blocks the scheduler below.
- Wrapped `g13UpdateHpBars()` / `g13UpdateEvoBar()` in try/catch.
- NEW: **victory watchdog** — if `s.wildHp <= 0 && s.phase !== 'victory'` after answer, schedule `setTimeout(() => g13Victory(), 1800)` alongside the primary 600ms transition.

**`game.js` g13Victory (~L7846)**
- NEW: idempotency guard `if (s.phase === 'victory' || s.phase === 'defeat') return`.
- Wrapped `playCorrect` / `vibrate` / scoring / modal setTimeout body in try/catch.
- NEW: minimal-fallback modal (stars-only) if the full modal construction throws.

**`game.js` g13Defeat (~L7888)**
- NEW: same idempotency guard + try/catch on `playWrong`/`vibrate`.

**`game.js` g13bKillWild (~L8264)**
- NEW: after legendary branch `setTimeout(() => g13bLevelComplete(), 1900)`, schedule an **independent watchdog** at 3500ms that force-calls `g13bLevelComplete()` if `phase !== 'done'`. (The function's own idempotency guard makes the double-call safe.)
- Wrapped `g13bUpdateKills()` and `g13bShowCatch()` in try/catch.

**`game.js` g13bLevelComplete (~L8614)**
- Wrapped `GameScoring.calc` + `vibrate` in try/catch with safe defaults.
- Wrapped the 800ms-delayed overlay-setup block in try/catch with fallback `overlay.style.display='flex'`.
- NEW: **2200ms overlay watchdog** that force-sets `display:flex` if `getComputedStyle(overlay).display === 'none'` at that point.

**`games/g13c-pixi.html` playerTurn + enemyTurn**
- After every `queueMsgs(..., () => endBattleWin())` / `queueMsgs(..., () => endBattleLose())` call, schedule a **6000ms `battle.ended` watchdog** that force-calls the end function if the msg queue chain has broken. `endBattleWin` and `endBattleLose` already guard with `if(!battle||battle.ended) return`, so the race is safe.

### Constraints honored
- No rewrite of the battle loop — fix is additive (guards + watchdogs).
- Primary happy path is unchanged — all correct-answer battles still flow through the existing setTimeout chain. The failsafe only fires if the stuck state is actually reached.
- Watchdog durations are longer than the longest expected primary transition: 1800ms > 600ms (g13), 3500ms > 1900ms (g13b kill), 2200ms > 800ms (g13b overlay), 6000ms > ~5s max queueMsgs chain (g13c).

### Touched
- `game.js` — g13Answer, g13Victory, g13Defeat, g13bKillWild, g13bLevelComplete
- `games/g13c-pixi.html` — playerTurn (correct-answer + wrong-answer branches), enemyTurn
- `TODO-GAME-FIXES.md` — Task #57 entry
- `documentation and standarization/CHANGELOG.md` — this entry

### Verification
- `node --check game.js` → clean (rc=0).
- `g13c-pixi.html` — all 3 inline `<script>` blocks syntax-validated via `new Function(body)` → clean.

### Edge case (logged, low risk)
If user exits to menu/level select DURING the 1800ms/6000ms watchdog window, `showGameResult`'s existing guard (`game.js:8627` — `!activeScreen.id.startsWith('screen-game')` returns silently) correctly suppresses the modal. This is the desired behaviour — no rogue modal after exit.

---

## 2026-04-22 — G19 quiz bypass fix + pause-state audit (Task #55)

### Summary
Fixed a G19 (Pokemon Birds) bug where a user could bypass the collision math quiz by tapping the pause button (or opening the Ganti Pokemon bag) after hitting a pipe. Naive `togglePause()` just flipped `S.paused`, so the bird resumed flying mid-air without answering the quiz that had just blocked it. `closeBag()` had the same blind spot — closing the bag after a Pokemon swap didn't re-surface the pending quiz panel.

### Fixes (games/g19-pixi.html)
1. **`_g19HasPendingQuiz()` helper** — centralized check for `S.currentPipe && S.currentPipe.hit && !S.currentPipe.passed`.
2. **`togglePause()` guard** (~L1139) — if pending quiz, refuse to unpause. Hide pause-overlay + bag-overlay, re-show `#quiz-panel.show`, set status text to "Jawab Soal!", keep `S.paused=true`. User must answer before resuming.
3. **`closeBag()` guard** (~L1123) — after hiding bag, if pending quiz, re-surface quiz panel and keep S.paused=true. Swap is allowed; quiz still next.
4. **`openBag()` cleanup** (~L1095) — hide quiz panel while bag is open so UI is clean; closeBag re-surfaces.

### Audit — other games scanned for similar pause-bypass patterns
- **G16** (`games/g16-pixi.html:2056`): GOOD. `quizActive` + `trainState==='STOPPED'` gate in ticker; pause overlay z-index 8000 covers quiz-panel z-index 200; quiz re-appears on resume.
- **G14** (`games/g14.html:1913`): GOOD. Boost quiz is opt-in player action, not a blocking gate. `S.quizOpen` prevents re-entry.
- **G22** (`games/g22-candy.html:983`): GOOD. `S.quizActive` gates loop; quiz panel is PIXI fxLayer overlay that persists through pause.
- **G13c** (`games/g13c-pixi.html`): N/A. No pause button; turn-based cannot be bypassed.
- **G13/G13b** (`game.js:1586-1610`): AMBIGUOUS — turn-based quiz is safe but `_g13bLegAutoAtk` setInterval (L8106, 14 s legendary auto-attack) ignores `state.paused` and keeps hitting the player while "paused". Filed **Task #62**.
- **G15** (`games/g15-pixi.html:281`): AMBIGUOUS — main ticker gates correctly on `gamePaused||mathQuizActive`, BUT the 8 s math-quiz `setTimeout` (L1493) is wall-clock and auto-fails the question during pause. Filed **Task #63**.

### Touched
- `games/g19-pixi.html` — `togglePause()`, `closeBag()`, `openBag()`, new `_g19HasPendingQuiz()` helper
- `TODO-GAME-FIXES.md` — Task #55 DONE, Tasks #62 and #63 OPEN
- `documentation and standarization/CHANGELOG.md` (this entry)

### Verification
`node --check` clean (rc=0) on extracted inline script block from g19-pixi.html.

---

## 2026-04-22 — G20 controls + physics + AI (Task #56)

### Summary
G20 Ducky Volley had three user-reported defects: no mobile control hint in the start overlay, a post-jump "auto-slide" where the duck drifted backward on its own, and an AI opponent so passive that "cukup lempar ke area musuh, pasti musuhnya g bisa balikin." All three shipped in a single pass. Physics constants (GRAVITY, JUMP_POWER, MOVE_SPD), hit-type mechanics (set / shot / smash), Task #33 whoosh/swoosh SFX, BGM, pause overlay, Pokemon picker, and scoring are all untouched.

### Fix 1 — Mobile control hint
`games/g20-pixi.html` lines 123-131. A new `#mobile-hint` div lives inside `#start-overlay` alongside the existing `#pc-hint`. The single init script now branches on `'ontouchstart' in window`: touch devices see the mobile hint (drag = gerak, swipe-up or tombol kuning = lompat, tap angka = jawab), desktop sees the keyboard hint. Matches the pattern used elsewhere in the game for `#btn-jump` visibility.

### Fix 2 — Auto-slide after jump
Root cause was `S.pTargetX` persistence across touch release. When the player dragged and then lifted the finger, `_touchActive` flipped to false but `pTargetX` retained the last drag destination; the game loop's drag-lerp (`S.pvx = S.pvx*0.78 + tv*0.22`) kept easing `pvx` toward that stale target, so a drag + jump produced residual horizontal motion that read as "duck slides on its own."

Changes:
- `touchend` (line ~1173) and new `touchcancel` handler both null `S.pTargetX`.
- Idle friction branch (line ~728) split by ground state: `S.pvx *= S.pGnd ? 0.80 : 0.94`. Stronger friction on ground kills drift on landing; lighter in-air preserves intentional jump-arc momentum.
- `if (Math.abs(S.pvx) < 0.08) S.pvx = 0` — snap-to-rest kills sub-pixel micro-drift that would otherwise ooze the duck one-two pixels over several seconds.

### Fix 3 — Smarter AI
Previous `updateCPU` (line ~908) only predicted ball landing when `S.bx > NET_X`. While the ball was on the player's side, the CPU camped at a fixed `W*0.75`, ignoring any lob aimed at the open corner of its own half. This is exactly what the user exploited.

New AI:
- New helper `predictBallLandingX()` forward-integrates ball physics (gravity × 0.60 factor, 0.995/0.998 drag per frame, `powerup==='slow'` speed multiplier) up to 180 frames and returns projected landing X. Mirrors the main-loop ball update exactly so predictions stay in sync.
- Target selection: if ball is on CPU side OR traveling toward CPU (`S.bvx > 0.3`), target the predicted landing. Otherwise blend predicted landing with `W*0.75` (neutral court center). Level 4+ CPUs use prediction even for ball on player side; Lv1-3 stay neutral — keeps low levels beatable.
- Level scaling:
  - `accuracy = min(0.55 + level*0.040, 0.92)` — cap so even Lv10 can misread occasionally.
  - `spd = MOVE_SPD * (0.88 + level*0.012)` — CPU can't outrun player's base speed at low levels.
  - `reactJitter = max(0.08, 0.30 - level*0.025)` — Lv1 hesitates ~30% of frames, Lv10 ~8%.
- Misread: when the accuracy roll fails, aim is offset by `±60px * (1 - level*0.08)`. Lower levels whiff more wildly, high levels only slightly.
- Jump: fires when ball is on CPU side, within 100px horizontal, and between NET_TOP and GROUND_Y-50. Accepts both descending balls AND fast-rising-but-high lobs (previous `bvy > 0` gate ignored the latter). Slight power variation `JUMP_POWER * (0.88 + rand*0.08)` + level-scaled commit probability `0.55 + level*0.04` so jumps don't look scripted.

### Touched
- `games/g20-pixi.html` — lines 123-131 (mobile hint), lines 722-737 (drag/friction), lines 908-985 (updateCPU rewrite + new `predictBallLandingX`), lines 1173-1183 (touchend/touchcancel target clear).
- `TODO-GAME-FIXES.md` — Task #56 entry marked DONE, session summary count 7 → 8.
- `documentation and standarization/CHANGELOG.md` — this entry.

### Verification
`node --check` clean on all three extracted inline `<script>` blocks (rc=0). No new external files or assets required. Task #33 SFX audio elements remain at lines 64-65 and all three hook sites (jump, smash, shot) are untouched.

### Edge cases
- Keyboard users: unchanged — `S.pTargetX` is only set by touch input, so the fix for "auto-slide" is a no-op on desktop. Keyboard left/right still drives `S.moveL` / `S.moveR` through the same lerp branch.
- Touch users: holding a drag works identically (pTargetX tracks live). Lifting the finger now commits to a clean stop instead of carrying momentum toward the last target.
- AI rebalance: Lv1 is still winnable — hesitation + misreads + slower movement combine to ~40-50% CPU pickup rate on typical lobs. Lv5 reads landings consistently. Lv10 should feel like a skilled opponent but never impossible (accuracy capped at 0.92, jitter never zero).

---

## 2026-04-22 — G16 scoring + force-arrival guard (Task #61)

### Summary
Fixed G16 (`games/g16-pixi.html`) scoring bug where a perfect run showed "Bagus! 3/5 stars" even though every station quiz was answered correctly. Root cause was a mix of `S.wrongTaps` being polluted by mini-obstacle wrong taps (minor math-quiz slips) and an edge case where the Task #49 proximity force-arrival could trigger before the final station quiz completed, under-counting `S.cleared`. Perfect play now deterministically returns 5 stars.

### Fixes
1. **`calcStars()` perfect-play guarantee** (line ~1824)
   - If `S.cleared === S.totalObstacles` and station wrongs === 0, return 5 immediately — short-circuits `GameScoring.calc` and any downstream penalty (wrong>3 cap, time-bonus path, etc.).
2. **Separate station vs mini wrong-tap counters** (line ~1629, `onChoiceTap`)
   - New `S.wrongTaps_station` drives `calcStars`. `S.wrongTaps_mini` is tracked for telemetry only. Legacy `S.wrongTaps` still increments for station wrongs to keep any UI/debug code working.
   - Mini-obstacle wrong taps are a minor slip (quick math question) and no longer demote the main star rating.
3. **Force-arrival guard** (line ~1420, `updateTrain`)
   - Proximity-based `triggerArrival()` now skipped if any uncleared station obstacle still lies ahead or at the train's current position. Prevents the ARRIVE state firing before the last quiz increments `S.cleared`.

### Touched
- `games/g16-pixi.html` — `calcStars()`, `onChoiceTap()` wrong-branch, `updateTrain()` force-arrival block
- `documentation and standarization/CHANGELOG.md` (this entry)
- `TODO-GAME-FIXES.md` (Task #61 marked DONE)

### Verification
`node --check` on the extracted inline script block returned rc=0.

---

## 2026-04-22 — G6 vehicle sprite mapping (Task #54)

### Summary
Fixed G6 Petualangan Mobil so the in-game top-view sprite actually matches the vehicle the player picked in the picker. Previously `buildCar()` used `cfg.carIdx || Math.floor(Math.random() * 12)` to index into a hardcoded list of 12 sport/race-car PNGs, completely ignoring `cfg.playerIcon` / `selectedVehicle`. Pick a bajaj 🛺 → still race as a random sport car. Mapping is now deterministic by emoji, with a sensible PNG for the 10 car-type emojis and an emoji-only render for the 10 non-car vehicles (bajaj, sepeda, heli, roket, etc.) that have no matching PNG.

### Mapping rationale (`games/g6.html:552-571`)
```js
const EMOJI_TO_CAR_PNG = {
  '🚗': 'top_car_cyan_sedan_05.png',       // Sedan — generic sedan
  '🏎️': 'top_car_red_formula_07.png',      // Sport — red formula (iconic racer)
  '🚙': 'top_car_white_gt_01.png',         // Jeep — white GT (closest SUV silhouette)
  '🚚': 'top_car_white_coupe_09.png',      // Truk — fallback
  '🚐': 'top_car_white_roadster_10.png',   // Bemo/Van — fallback
  '🚓': 'top_car_blue_compact_11.png',     // Polisi — blue matches police blue
  '🚕': 'top_car_yellow_sport_02.png',     // Taksi — yellow matches taxi yellow
  '🚌': 'top_car_silver_sedan_12.png',     // Bis — fallback
  '🚒': 'top_car_red_formula_07.png',      // Pemadam — red fire-engine
  '🚑': 'top_car_white_track_03.png',      // Ambulan — white
  // No PNG for: 🚜🛵🚲🛺🚀🚢🚁🚂🛸🚤 → emoji fallback
}
```

### Why non-cars fall through to emoji
Our only top-view PNGs are sport/race/sedan cars. Rendering a random sport car for a 🚀 rocket or 🛺 bajaj is exactly the bug we're fixing. The PIXI.Text emoji sprite is always created as a placeholder; when `carPngName == null` we skip the PNG load entirely and the emoji stays as the final sprite. This is also why the emoji placeholder needs to render immediately (not after PNG load) — prevents flash of empty sprite for non-car selections.

### Guard structure
`PIXI.Assets.load()` is now wrapped in `if (carUrl) { ... }`. If the emoji isn't in `EMOJI_TO_CAR_PNG`, no fetch, no network 404 spam. Previously every vehicle selection triggered a load attempt regardless of whether it had any chance of matching.

### Touched
- `games/g6.html` lines 552-587 (buildCar PNG selection block)
- `documentation and standarization/CHANGELOG.md` (this entry)
- `TODO-GAME-FIXES.md` (Task #54 marked DONE)

### Verification
`node --check` clean on the IIFE script block (rc=0).

---

## 2026-04-22 — G16 collision SFX (Task #35)

### Summary
Added crash/impact SFX to G16 (Selamatkan Kereta). Previously train hitting obstacles (wrong answer) or slamming into them (hard-clamp overshoot) had visual flash + camera shake but no audio. Now plays a short wood-hit sound, layered over the existing orange flash + cameraShake=1.0 cue.

### Source & attribution
- Mixkit CDN (royalty-free, no attribution required per Mixkit License):
  - `assets/sfx/crash.mp3` — https://assets.mixkit.co/active_storage/sfx/2182/2182-preview.mp3 — "Wood hard hit"
- 12,213 bytes, 0.44s, 44.1kHz stereo 220kbps. Well under 50KB budget — no recompression needed. Copied as-is from mixkit preview.

### SFX helper pattern (`games/g16-pixi.html`)
```js
let lastCrashMs = 0
function playSfxCrash(){
  const now = performance.now()
  if(now - lastCrashMs < 150) return
  lastCrashMs = now
  try{
    const a = document.getElementById('sfx-crash')
    if(!a) return
    a.currentTime = 0
    a.volume = 0.6
    a.play().catch(()=>{})
  }catch(_){}
}
```
Rate-limit window 150ms prevents overlapping plays across back-to-back wrong answers or camera-shake frames. Helper located right before `hideQuizPanel()` (line 1767).

### Integration hook sites (`games/g16-pixi.html`)
- **Line 81** — `<audio id="sfx-crash" src="../assets/sfx/crash.mp3?v=20260422a" preload="auto">` (added after `#train-sfx`)
- **Line 1411** — obstacle hard-clamp (Task #40 Part 2 branch). Fires `playSfxCrash()` only when `wasMoving` (S.trainState !== 'STOPPED' at entry), so we don't re-play on every frame the clamp re-asserts while STOPPED.
- **Line 1632** — wrong-answer branch in `onChoiceTap`. Fires on each incorrect quiz choice (3 mercy dots = max 3 crashes per obstacle).
- `triggerDeath` (line ~1779) intentionally NOT hooked — deathflash already has the dramatic red flash; adding crash there would double-fire with the hard-clamp that immediately precedes it.

### Volume conventions
0.6 — stronger than `whoosh 0.5` in G20/G22 (collision is a focal feedback event, not ambient motion). Matches `train-sfx` convention (0.7) while staying slightly softer since it fires repeatedly.

### Verification
```sh
python3 -c "
import re, subprocess
s = open('games/g16-pixi.html').read()
blocks = re.findall(r'<script(?![^>]*\\bsrc=)[^>]*>(.*?)</script>', s, re.DOTALL)
for i, b in enumerate(blocks):
  if not b.strip(): continue
  open('/tmp/_c.js','w').write(b)
  r = subprocess.run(['node','--check','/tmp/_c.js'], capture_output=True, text=True)
  print(f'block[{i}] rc={r.returncode}')
"
# → block[0] rc=0
```

### Cache
No `index.html` bump needed — crash.mp3 is only referenced from g16-pixi.html, and the `?v=20260422a` query string on the audio tag forces a fresh fetch.

---

## 2026-04-22 — G20/G22 movement SFX (Task #33)

### Summary
Added whoosh + swoosh motion SFX to G20 (Ducky Volley) and G22 (Monster Candy). Neither game previously had motion audio — only tonal synth SFX (`tone()` helper via WebAudio) and BGM. New SFX layer over existing tones, does not replace them.

### Source & attribution
- Mixkit CDN (royalty-free SFX, no attribution required per Mixkit License):
  - `whoosh.mp3` — https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3 (40,265 bytes, 1.54s, 128kbps)
  - `swoosh.mp3` — https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3 (27,236 bytes, 1.52s, 128kbps)
- Total: 67.5 KB (under 100 KB combined budget).
- Saved to `assets/sfx/` (new folder contents — was empty).

### SFX helper pattern (both games)
```js
let _lastWhoosh=0, _lastSwoosh=0
function playSfx(id, vol){ try{ const a=document.getElementById(id); if(!a)return; a.currentTime=0; a.volume=vol!=null?vol:0.5; a.play().catch(()=>{}) }catch(_){} }
function sfxWhoosh(vol){ const n=Date.now(); if(n-_lastWhoosh<120)return; _lastWhoosh=n; playSfx('sfx-whoosh', vol!=null?vol:0.5) }
function sfxSwoosh(vol){ const n=Date.now(); if(n-_lastSwoosh<140)return; _lastSwoosh=n; playSfx('sfx-swoosh', vol!=null?vol:0.4) }
```
Rate-limit windows (120ms whoosh, 140ms swoosh) prevent audio-element clipping when events fire in quick succession (e.g. consecutive hits/spawns).

### G20 Ducky Volley (`games/g20-pixi.html`)
Audio tags: line 64-65 (after `#game-bgm`). Helpers: line 218-231 (after `sfxThud`). Hooks:
- Line 733 — `sfxSwoosh(0.4)` on player jump (duck flap) inside `gameLoop` jump block
- Line 875 — `sfxWhoosh(0.6)` on smash/spike, layered over existing `sfxSmash()`
- Line 886 — `sfxWhoosh(0.45)` on `shot` hit type, layered over `sfxHit()`
Note: wall `bounce` events and `set` hit intentionally left whoosh-free — they are high-frequency/light events and BGM masks them; adding whoosh there would feel spammy.

### G22 Monster Candy (`games/g22-candy.html`)
Audio tags: line 58-59 (after `#game-bgm`). Helpers: line 184-197 (after `sfxWrong`). Hooks:
- Line 385 — `sfxSwoosh(0.28)` at top of `spawnCandy()` — pokeball swoop entry. Low volume + rate-limit avoids spam at high spawn rates (`spawnInterval` drops to 0.6s at high levels).
- Line 469 — `sfxWhoosh(0.5)` in `catchCandy()` — ball-throw/capture impact
- Line 737 — `sfxSwoosh(0.4)` in `spawnBubblePop()` — candy pop on correct answer
- Line 767 — `sfxWhoosh(0.55)` in `laserAbsorbSwap()` — laser-absorb capture start on wrong answer

### Volume conventions
Matches existing `bgm.volume=0.2` + tone `v=0.08–0.15` conventions. Whoosh 0.45-0.6 (stronger presence for key hits), swoosh 0.28-0.4 (softer background motion).

### Cache
Audio tag `?v=20260422a` query string for cache-busting. `index.html` cache not affected (SFX referenced from game HTMLs only).

### Verification
- `file` confirms both MP3s are valid MPEG ADTS layer III, 44.1kHz.
- All hook sites Grep'd: 5 call sites in g20, 4 call sites in g22.
- Rate-limit guarantees no more than ~8 whooshes/sec or ~7 swooshes/sec.

---

## 2026-04-22 — G16 arrival: positional checkpoints, no timers (Task #49-v2)

### Why this refactor
User mandate: "Arrival jangan coba2 pkai time, saya mau bener2 dihitung positioning, checkpoint secara accurate." The Task #49 fix still relied on two wall-clock `setTimeout` calls (2200ms celebration, 3000ms failsafe). Wall clocks drift with tab throttling, device perf, and pause state — unacceptable for a deterministic arrival flow.

### What changed (`games/g16-pixi.html`)
- **Removed all `setTimeout` in the arrival path**: the 2200ms showWin after ARRIVED (2 sites in `updateTrain` — main ARRIVING branch + station overshoot clamp) AND the 3000ms safety net in `triggerArrival`. Zero timers now between `ARRIVING` and `showWin`.
- **New constants** (near `TRAIN_SCREEN_X` at ~line 490):
  - `ARRIVAL_BRAKE_DIST = 300` — brake ramp starts at dist=300 from STATION_X
  - `ARRIVAL_SNAP_DIST = 1` — snap to STATION_X and enter ARRIVED when dist ≤ 1px
  - `ARRIVAL_MIN_CREEP = 35` px/s — speed floor during ARRIVING (guarantees progress)
  - `CELEBRATION_FRAMES = 120` — ~2s @ 60fps of celebration before `showWin` (frame-counted, not clock-timed)
  - `STATION_PROXIMITY_FORCE = 40` — replaces magic `40` in force-arrival proximity check
- **New state field**: `S.celebrationFrame` (reset on ARRIVING entry and on ARRIVED entry).
- **`ARRIVING` branch**: deterministic brake — `speed = max(ARRIVAL_MIN_CREEP, baseSpeed * min(dist/ARRIVAL_BRAKE_DIST, 1))`. When `dist ≤ ARRIVAL_SNAP_DIST` snap `worldX = STATION_X` and flip to ARRIVED.
- **`ARRIVED` branch**: `S.celebrationFrame += dt*60` each frame; `showWin` fires exactly when `celebrationFrame ≥ CELEBRATION_FRAMES`. Pauses with the game (ticker stops), identical on slow/fast devices.
- **Station overshoot clamp**: same celebrationFrame path, no setTimeout.
- **`triggerArrival`**: resets `celebrationFrame=0`, no safety-net timer. The positional brake + frame counter guarantee `showWin` fires deterministically.

### Cache
`index.html` v=20260422ad → v=20260422ae (styles.css + game.js both bumped).

### Verification
- `node --check` on extracted inline scripts → clean.
- Grep `setTimeout.*show(Win|Lose)|arrivedFlag|ARRIVED|ARRIVING` → only the two "No setTimeout" comments match (intentional documentation).
- Grep for new constants → all 5 defined and referenced.

### Note on the prior #49 entry
The 2200ms celebration and 3s safety-net claims in the original Task #49 entry below are now stale — those setTimeouts have been removed. The arrival flow is fully position/frame deterministic.

---

## 2026-04-22 — G15 letter validation + G16 station overshoot (Tasks #48, #49)

### G15 — wrong letter accepted as correct (Task #48)
**Symptom**: Target letter 'A' required but collecting any letter was accepted as "benar A". Wrong answers counted as right.

**Root cause**: `collectBox` checked `box.isTarget` — a boolean set at spawn time (`const isTarget = (i === 0)` in the spawn batch). When `currentLetterIdx` advanced or `onWordComplete` reset it, old boxes retained stale `isTarget=true` flags. A box spawned when target was 'A' would still register as correct even after the target became 'R'.

**Fix** (`games/g15-pixi.html`):
- `collectBox` letter branch (~line 1448): validate `box.letter === WORDS_LIST[currentWordIdx].word[currentLetterIdx]` at collect time, not the stale flag.
- `onWordComplete` (~line 1534): purge leftover letter boxes (keep hearts/math specials) so players don't see old-word letters while the HUD prompts the new word.

### G16 — train bablas past station, no win modal (Task #49)
**Symptoms**: Train passes the station crowd/platform ("kerumunan") and gets stuck without the success modal appearing. Previous #40 fix (obstacle overshoot clamp) only guarded uncleared obstacles, not the station itself.

**Root causes identified**:
1. No clamp at `STATION_X` — train could slide past the platform on dt spikes.
2. `ARRIVING` creep speed (~54 px/s) took ~28s to cover the 0.8W triggerArrival distance — felt frozen.
3. `triggerArrival` only fired when `S.cleared === S.totalObstacles` — off-by-one or mini-quiz races could leave count short and the train would sail past.
4. 8s failsafe for `showWin` was much longer than perceived stuck time.

**Fix** (`games/g16-pixi.html`) — *Note: superseded by Task #49-v2 (see entry above). Timer-based claims below are stale; arrival is now position+frame deterministic.*
- **Station overshoot clamp** (~line 1360): in `updateTrain`, when in ARRIVING/ARRIVED phase and `worldX + step > STATION_X + 4`, snap to `STATION_X` and force ARRIVED.
- **Force-arrival proximity trigger** (~line 1382): once `worldX > STATION_X - STATION_PROXIMITY_FORCE` in any non-DEAD/non-arrival state, call `triggerArrival()` regardless of cleared count.
- **Deterministic ARRIVING brake** (v2): `speed = max(ARRIVAL_MIN_CREEP, baseSpeed * min(dist/ARRIVAL_BRAKE_DIST, 1))`.
- **Celebration**: frame-counted (CELEBRATION_FRAMES=120) instead of wall-clock, no setTimeout.

### Cache
`index.html` v=20260422ac → v=20260422ad.

### Verification
- `node --check` on extracted inline scripts → clean.
- Math: at baseSpeed=165 (lvl 1), new ARRIVING max speed = 165 * min(1,1) = 165 px/s; min = 41 px/s. Covers 0.8W (1536px at 1920w) in ~12s at average; with short safety net arrives reliably in 3-5s for typical viewports.

---

## 2026-04-22 — G13c real gym badge icons (Task #31)

### Problem
G13c Gym Pokémon displayed generic emoji (💧🪨⚡🌿) as "badges" instead of the canonical in-game gym badge artwork. User request: extract badges from Bulbapedia (`/wiki/Badge`) complemented with pokemon.fandom.com for Galar.

### Added
- **`assets/gym-badges/`** — 46 WebP badge icons, 128px longest edge, quality 90. Total ~256KB. Sourced from Bulbapedia archives (downsized from originals 500–1280px PNG → 116–128px WebP). Naming: `{trainer-id}.webp` (brock.webp, misty.webp, …, raihan.webp).
  - Kanto 8 (Boulder/Cascade/Thunder/Rainbow/Soul/Marsh/Volcano/Earth)
  - Johto 7 (Zephyr/Hive/Plain/Fog/Mineral/Glacier/Rising)
  - Hoenn 7 (Stone/Knuckle/Dynamo/Heat/Balance/Feather/Rain)
  - Sinnoh 6 (Coal/Cobble/Fen/Mine/Icicle/Beacon)
  - Unova 6 (Basic/Insect/Bolt/Quake/Jet/Legend)
  - Kalos 6 (Bug/Cliff/Rumble/Plant/Fairy/Voltage)
  - Galar 6 (Grass/Water/Fire/Fighting/Rock/Dragon)
- **G13c helpers** (`games/g13c-pixi.html` ~line 953): `BADGE_IMG_SET` (46 trainer ids), `hasBadgeImg(id)`, `badgeImgUrl(id)`, `badgeHtml(trainer, size, extraStyle)`. Elite Four / Champions / rivals / rockets / anime still render emoji.

### Changed
- **5 badge render sites in `games/g13c-pixi.html`**:
  1. `buildGymSelect` trainer card `.tc-status` (~line 1035) — shows badge image when beaten, `⚔️` when unlocked, `🔒` when locked.
  2. `showBadgeCollection` grid (~line 1064) — 26px badge image per trainer (grayscale when un-earned).
  3. `showGymWelcome` `#gw-badge` banner (~line 1082) — big badge image (min(80px, 20vw)) with gold drop-shadow, fallback to emoji for non-gym-leaders.
  4. `showBadgeZoom` `#badge-emoji` (~line 1103) — signature accepts trainer object OR legacy emoji string; renders image with CSS zoom scale animation for real gym leaders.
  5. `showResult` call site (~line 1438) — now passes full trainer object to `showBadgeZoom`.

### Not changed
- `GameModal` emoji field (~line 1447) still uses `trainer.badge` (emoji) since modal's emoji slot is a text string; the dedicated `#badge-emoji` zoom animation already showcases the image.
- `trainerFallback` avatar (~line 993) still falls back to emoji — image would require a different container sizing and the avatar slot is for sprites not badges.

### Tested
- `python3 -m http.server` + curl on `/Dunia-Emosi/assets/gym-badges/brock.webp` → 200.
- `node --check` on extracted inline script → clean.
- Grep of render sites → 8 references across `hasBadgeImg`, `badgeHtml`, `badgeImgUrl`, `BADGE_IMG_SET`.

---

## 2026-04-22 — Character train dimensions responsive to viewport (Task #47)

### Problem
Character train `spriteHeight`, `wheelPositions`, `smokePos`, and `bottomPaddingOffset` in `trains-db.js` + G16_CHAR_CONFIGS were hardcoded pixel values calibrated for PC (H≈800–1080). On mobile portrait (H≈667) and landscape (H≈375) they rendered at full desktop size — sprite + wheels + smoke disproportionately large vs viewport. User report: "Game ini di PC sudah bagus dan proporsional. Namun di mobile, dimensinya masih statis."

### Why viewport-height instead of `RZ.scale()`
`RZ.scale()` uses the CSS `clamp(0.7, 0.44 + 0.175vw, 1)` formula which saturates at 1.0 for any viewport ≥ 320w — the scale intended for CSS UI sizing never shrinks trains on real mobile devices. Train sprites are vertical objects anchored to a rail at a fraction of viewport height, so a dedicated height-driven scale is more natural.

### Added
- **`shared/rz-responsive.js` → `RZ.trainScale()`** — New viewport-height-based multiplier: `Math.min(1, Math.max(0.55, innerHeight / 800))`.
  - H ≥ 800 (laptop/desktop) → 1.0 (PC baseline, no scaling)
  - H = 667 (mobile portrait iPhone) → 0.83
  - H = 480 → 0.60
  - H ≤ 436 → 0.55 (clamped floor)
- **`games/train-character-sprite.js` → `CharacterTrain.scaleConfig(cfg, s)`** — Returns a new config with `spriteHeight`, `bottomPaddingOffset`, `bodyBobAmp`, every `wheelPositions[i] = [x, y, r]`, and `smokePos = [x, y]` multiplied by `s`. Base config = PC reference (scale 1); all viewports apply this transform at mount.

### Changed
- **`games/g15-pixi.html` buildTrain (~line 1073)** — Reads `const rzScale = RZ.trainScale()`, calls `CharacterTrain.scaleConfig(selectedTrain, rzScale)` before mounting. Rail-baseline placement uses the scaled `spriteHeight` + `bottomPaddingOffset`.
- **`games/g15-pixi.html` resize handler (line 261)** — Extended from renderer-only resize to: recompute `TRAIN_X` + `LANE_Y`, then rebuild character train via `buildTrain()` so dispose + re-mount picks up the fresh `RZ.trainScale()`. Programmatic trains just reposition.
- **`games/g16-pixi.html` buildTrain (~line 891)** — Same pattern: `CharacterTrain.scaleConfig(G16_CHAR_CONFIGS[key], rzScale)` before mount.
- **`games/g16-pixi.html` resize handler (line 2006)** — Recompute `TRAIN_SCREEN_X`, dispose `g16CharacterTrain`, remove old `trainContainer` from stage, call `buildTrain(newW, newH)` to rebuild with current scale. Headlight + fireGlow x also re-tracked to new TRAIN_SCREEN_X.
- **`documentation and standarization/CHARACTER-TRAIN-SPEC.md`** — Added "Responsive Scaling" section documenting the `scaleConfig` helper + resize rebuild contract.

### Cache bump
`index.html` v=20260422ab → v=20260422ac. `train-character-sprite.js` v=20260422d → v=20260422e. `rz-responsive.js` v=20260422h → v=20260422i (bumped across all 6 games that include it so every game picks up the new `RZ.trainScale` export).

### Verification matrix
| Device | W × H | rzScale | Casey spriteHeight (base 117) |
|--------|-------|---------|-------------------------------|
| iPhone SE portrait | 375×667 | 0.83 | 97 |
| iPhone SE landscape | 667×375 | 0.55 (clamped) | 64 |
| iPhone 14 portrait | 390×844 | 1.0 | 117 |
| iPad portrait | 768×1024 | 1.0 | 117 |
| Laptop | 1440×900 | 1.0 | 117 |
| 4K desktop | 3840×2160 | 1.0 | 117 |

Resize / orientation change: both games dispose + rebuild the character train, rail alignment preserved via `bottomPaddingOffset * rzScale`. Smoke + wheel overlays re-render at the new geometry; particle trails from the old instance are disposed.

---

## 2026-04-22 — RDE Step 7: G14 + G15 Pixi text sizing wired to RZ runtime

### Changed
- **G14 Balapan Kereta** (`games/g14.html`) — Included `shared/rz-responsive.js?v=20260422h` after `pixi.min.js` (line 160). Added `applyRdeScaling()` helper in the IIFE boot block (inline in `<script>`). Wires `window.RZ.fontScale()` / `window.RZ.btn('sm')` to DOM HUD + math-quiz panel on first boot and on every viewport change (registered via `window.RZ.onResize(applyRdeScaling)` inside the async boot tail):
  - `#distance-text` (HUD distance badge, base 13px)
  - `#position-badge` (race position chip, base 17px)
  - `#speed-hud` (speed chip, base 12px)
  - `#lives-hud` (lives row, base 20px)
  - `#train-name-badge` (train name chip, base 13px)
  - `#quiz-label` (quiz header, base 11px) + `#quiz-q` (math question, base 26px)
  - `.quiz-btn` (answer buttons, base 20px fontSize + `RZ.btn('sm')` min-width)
- **G15 Lokomotif Pemberani** (`games/g15-pixi.html`) — Included `shared/rz-responsive.js?v=20260422h` after `train-character-sprite.js` (line 221). Added `applyRdeScaling()` helper at end of inline script + `window.RZ.onResize(applyRdeScaling)` at boot tail. Wires DOM HUD + math quiz sizing:
  - `#math-label` (quiz header, base 12px) + `#math-question` (problem text, base 34px)
  - `.math-btn` (answer buttons, base 20px + `RZ.btn('sm')` min-width)
  - `#word-emoji` (HUD word emoji, base 24px) + `#next-char` (next char chip, base 24px)
  - `#sb-name` (station banner name, base 22px) + `#sb-landmark` (landmark line, base 13px)
  - `.life-heart` (heart row, base 20px)
- **Fallback pattern**: `applyRdeScaling()` early-returns when `window.RZ` is absent; each property write is further guarded by a null `querySelector` check. Ensures games still render correct pixel sizes if the runtime script fails to load (offline, CDN block).
- **Untouched**: world-space `PIXI.Text` (G14 tree decorations, G14 obstacle emojis, G15 letter/math/heart box labels — all move with world coords and their sizes are coupled to hitboxes/art), PIXI background scenery, `game.js`, `style.css`, `index.html`, `trains-db.js`, `game-modal.js`, G16/G19/G20/G22.

### Verification
- `grep -c "RZ\." games/g14.html` → 10 lines.
- `grep -c "RZ\." games/g15-pixi.html` → 11 lines.
- `grep -c "rz-responsive" games/g14.html games/g15-pixi.html` → 1 each (script tag only).

---

## 2026-04-22 — RDE Step 7: G16 + G19 Pixi text sizing wired to RZ runtime

### Changed
- **G16 Selamatkan Kereta** (`games/g16-pixi.html`) — Included `shared/rz-responsive.js?v=20260422h` before `game-modal.js` (line 152). Five `PIXI.Text` render sites now consume `window.RZ.fontScale()` with `window.RZ ? ... : fallback` guards:
  - Line ~1131 (mini-obstacle emoji label, base 24px) — between-station quiz prompts.
  - Line ~1250 (⚡ spark particle on overhead pole, base 14px) — rail-line spark FX.
  - Line ~1673 (super-streak ⭐✨🌟💫 rain, base 18px + random) — 5+ correct-streak celebration.
  - Line ~1808 ("SELAMAT TIBA!" platform sign, base 11px) — arrival station signage.
  - Line ~1911 (fireworks finale emojis, base 16px + random) — end-of-run celebration.
- **G19 Pokemon Birds** (`games/g19-pixi.html`) — Included `shared/rz-responsive.js?v=20260422h` before `pixi.min.js` (line 120). Two `PIXI.Text` render sites now scaled:
  - Line ~566 (pokeball/⭐ pipe-gap collectible, base 22px) — per-pipe reward token.
  - Line ~917 (`spawnFloatingText` helper, base 22px) — all floating +1/⭐/EVOLUSI feedback texts.
  - Line ~380 — `window.RZ.onResize(...)` registered as reserved hook for future layout recompute on viewport change.
- **Fallback pattern**: each RZ call guarded so the game still renders correct pixel sizes if the runtime script fails to load (offline, CDN block).
- **Untouched**: world coordinate math, background scenery sizing, `game.js`, `style.css`, `index.html`, `trains-db.js`, `game-modal.js`, G14, G15, G20, G22, G16 character train config.

### Verification
- `grep -c "RZ\." games/g16-pixi.html` → 5 lines.
- `grep -c "RZ\." games/g19-pixi.html` → 4 lines.
- `grep -c "rz-responsive" games/g{16,19}-pixi.html` → 1 each.

---

## 2026-04-22 — RDE Step 7: G20 Pixi text sizing wired. All 6 PixiJS games now consume shared RZ runtime.

### Changed
- **G20 Ducky Volley** (`games/g20-pixi.html`) — Included `shared/rz-responsive.js?v=20260422h` (line 127). Top-of-script `const _rz = window.RZ` hoist at line 129. Three `PIXI.Text` render sites now consume `RZ.fontScale()` with `_rz ? ... : fallback` fallback guards:
  - Line ~506 (beach decoration emoji, random 10-18px base) — `_bfs` intermediate so the same random value flows to both branches.
  - Line ~881 (type-emoji hit burst FX, base 20px) — set/shot/smash hit feedback.
  - Line ~976 (crab `?` hint glyph, base 11px) — scene-level quest-mark.
- **Integration points**: 4 `_rz`/`RZ.*` references (1 const hoist + 3 ternary call sites) — enough to fluidly scale all font-rendered Pixi text in the match scene.
- **Fallback pattern** — Each RZ call guarded so the game still renders correct pixel sizes if the runtime script fails to load (offline, CDN block).

### Cache
- `index.html` → `v=20260422i` (was `v=20260422h`). style.css + game.js both bumped.

### RDE Step 7 completion
- **All 6 PixiJS games migrated**: G14, G15, G16, G19, G20, G22. Task #29 Step 7 complete — full 7-step RDE migration now shipped.
- Physics coordinates, gravity, bounce coefficients, ball/player speeds, background scenery draw params — all left untouched per Step 7 scope guard.

---

## 2026-04-21 — Unified GameModal messaging aligned with star count

Audited all `GameModal.show()` callers in standalone games and applied
surgical fixes so that title, emoji, and msg are consistently branched by
star count. All games now explicitly handle the 0-star fail case per the
standard defined in `games/game-modal.js` (task #44 follow-up).

### Standard branching (per star count)
- 0-star: title "Gagal! Coba Lagi" / emoji 😞 / msg "Jangan menyerah, ayo coba lagi!"
- 1-2 stars: title "Coba Lagi" / emoji 💪 / msg "Kamu bisa lebih baik lagi!"
- 3 stars: title "Bagus!" / emoji ⭐ / msg "Lumayan, terus berlatih!"
- 4 stars: title "Hebat!" / emoji 🌟 / msg "Kerja bagus!"
- 5 stars: title "Sempurna!" / emoji 🏆 / msg "Wow, kamu hebat!"

### Fixed callers
- `games/g6.html` (showFinish + showGameOver): added 0-star branch, emoji
  now graded; game-over now reports stars:0 with correct fail strings.
- `games/g13c-pixi.html` (endBattleWin + endBattleLose): win message now
  branches on stars; lose case forced to stars:0 + fail strings.
- `games/g14.html` (endRace): title/emoji/msg fully branch on stars and
  keep position label in the message body.
- `games/g15-pixi.html` (showWin + showLose): win title/emoji aligned to
  standard; lose case now stars:0 (was stars:1 — the modal normalizer
  would downgrade title, but sessionStorage still logged stars:1).
- `games/g16-pixi.html` (showWin + showLose): win strings fully branched;
  lose case emoji + strings standardized.
- `games/g19-pixi.html` (final modal): title/emoji/msg branched on stars
  rather than only on >=4/>=5.
- `games/g20-pixi.html` (endMatch): title/emoji/msg branched on stars
  (previously only branched on "won" boolean, so a winning player with
  poor quiz could still get "Kamu Menang!" + 1 star — now aligned).
- `games/g22-candy.html` (end screen): full 5-tier branching.

No changes to `games/game-modal.js`, `game.js`, `games/trains-db.js`,
or `style.css`.


---

## 2026-04-22 — Character train wheel recalibration + screen-edge safety (Task #45)

### Fixed
- **Character sprites re-processed via rembg v2** with new dimensions:
  - `caseyjr-body.webp`: 272×199 (was 272×198 — negligible)
  - `linus-body.webp`: **130×101** (was 264×173 — 50% smaller, near 1:1 aspect)
  - `jz711-body.webp`: 512×128 (was 512×71 — taller)
  - `malivlak-body.webp`: 512×256 (was 512×171 — taller)
- **Recalibrated wheel positions + spriteHeight** in both `games/trains-db.js` (TRAIN_CATS[0].trains) and `games/g16-pixi.html` (G16_CHAR_CONFIGS):
  - **Casey JR** — kept `spriteHeight:90`; wheels re-spaced evenly: `[[-40,-8,10],[-14,-8,10],[13,-8,10],[40,-8,10]]` (radius 10, uniform).
  - **Linus Brave** — `spriteHeight` 88 → **85** (source 130×101 is near square, rendered 109×85). Wheels compacted: `[[-40,-5,6],[-22,-8,9],[-7,-8,9],[8,-8,9],[23,-8,9]]`. Smoke y −108 → −105.
  - **Dragutin JZ 711** — `spriteHeight` 52 → **75** (rendered 300×75, tram now proportional). Wheels narrowed into sprite bounds: `[[-120,-3,7],[-95,-3,7],[95,-3,7],[120,-3,7]]`.
  - **Malivlak** — `spriteHeight` 95 → **110** (rendered 220×110). Wheels re-fit to narrower 220px: `[-85..90]` range with pilot pair (r=5) + driver pair (r=11) on right. Smoke moved up y −118 → −130 and left x 118 → 90 to match taller sprite.
- **Screen-edge safety margin** — wide character trains were clipping at viewport edges:
  - `games/g16-pixi.html:491` — `TRAIN_SCREEN_X = Math.max(W*0.15, 180)` (was `W*0.15`). Guarantees ≥180px from left edge on small screens while still honoring viewport-relative on wide screens.
  - `games/g15-pixi.html:604` — `TRAIN_X = 180` (was `120`). Hardcoded bump; harmless to programmatic trains.

### Cache
- `index.html` → `v=20260422h` (was `v=20260422g`). style.css + game.js both bumped.

### Notes
- Sprites are anchored bottom-center in train-character-sprite.js — wheel y negative = inside bottom edge. All positions verified against new render widths: Casey 123px, Linus 109px, Dragutin 300px, Malivlak 220px.
- `smokePos` for Casey kept at y=−110 (spriteHeight unchanged). Dragutin smoke stays null (electric tram — no steam).
- Programmatic trains in G16 `TRAIN_STYLES[4-9]` unaffected — no changes to their build paths.

---

## 2026-04-22 — RDE Step 7: G22 Pixi fontSize/btn integrates RZ runtime

### Changed
- **G22 Monster Candy** (`games/g22-candy.html`) — Included `shared/rz-responsive.js?v=20260422h` (line 99). Quiz panel `showCandyQuiz()` now consumes `RZ.fontScale()` for question label (17), category chip (11), answer button text (16), wrong-answer text (16), combo catch text (18/24); answer button min-width floor uses `RZ.btn('sm')` in place of hardcoded `60`.
- **Fallback pattern** — Each RZ call guarded with `_rz ? _rz.fontScale(N) : N` so the game degrades gracefully if the runtime script fails to load (offline, CDN block, etc.).
- **Integration points**: 6 `_rz.*` references (4 named consts + 2 inline ternary) in the quiz panel render path.

### Notes
- Only quiz panel render path touched. Background flower/particle fontSize values left hardcoded — they're decorative spawns, not UI legibility critical.
- No CSS changes in this step; Layer 3 JS runtime only.

---

## 2026-04-22 — RDE Step 5: G2/G5/G7/G9 migrated

### Changed
- **RDE Step 5 G2** (`style.css:290-300`) — `.breathe-circle-wrap`/`.breathe-animal`/`.breathe-instruction`/`.breathe-sub`/`.breathe-timer-wrap`/`.breathe-timer`/`.breathe-cycles` consume `--rz-font-*`/`--rz-gap-*` + `clamp()` for circle/timer diameters. Removed 10 lines from `@media` blocks (480/320 breakpoints).
- **RDE Step 5 G5** (`style.css:364-381`) — `.g5-score-row`/`.g5-player-score`/`.ps-name`/`.ps-val`/`.g5-turn-text`/`.g5-grid` gap+padding+radius+font tokens; `.card-emoji`/`.card-label` switched to `clamp()`. Card aspect-ratio/`transform-style: preserve-3d`/grid-template-columns preserved (gameplay-critical). Removed 8 lines from `@media` blocks (480/400/360/320).
- **RDE Step 5 G7** (`style.css:524-536`) — `.g7-mode-badge`/`.g7-display`/`.g7-question`/`.g7-choices`/`.g7-choice-btn`/`.g7-choice-img`/`.g7-choice-text`/`.g7-suku`/`.g7-progress` consume tokens for radius/gap/font/padding. Dark-theme `!important` overrides at 1620+ preserved. Removed 6 lines from `@media` blocks (480/320); viewport-based display width/height retained.
- **RDE Step 5 G9** (`style.css:559-570`) — `.g9-letter-display`/`.g9-instruction`/`.g9-canvas-wrap`/`.g9-result`/`.g9-stars`/`.g9-progress` consume font/gap/radius tokens + `clamp()` for canvas wrap. Canvas wrap @media sizes retained (canvas pixel math critical). Removed 2 letter-display @media overrides.
- **Token count**: `var(--rz-` references grew 62 → 112 (+50). Brace balance verified 2767/2767.

### Cache
- `index.html` → `v=20260422f`.

### Notes
- G5 cardback/card-front gameplay rules untouched — only outer scoreboard + grid/gap sizing.
- G7 `.g7-display` global enhancement at line 583 (viewport-anchored) left intact.

---

## 2026-04-22 — G15 landing tile polish

### Changed
- **G15 landing tile (`index.html:630-631`)** — icon enlarged 50px → 75px (1.5x) so the Linus+Casey character art reads at tile size. Tile background switched from deep-blue gradient (`#0D47A1→#42A5F5`) to soft peach (`#FEF3C7→#FDBA74`) so the blue Linus locomotive contrasts instead of blending into a same-hue backdrop. Emoji fallback via `onerror` preserved.
- **G15 level-select `iconImg` (`game.js:311`)** — swapped `assets/train/lokomotif-front-red.svg` → `assets/train/linus-casey.webp` so level-select hero matches the landing tile (was showing red programmatic locomotive).

### Cache
- `index.html` → `v=20260422e`.

### Notes
- G14 and G16 tiles left unchanged — G14 uses emoji on red gradient (already high-contrast), G16 uses blue `lokomotif-front-blue.svg` on orange gradient (already high-contrast). No clear improvement from adopting character trains at landing-tile size.

---

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
