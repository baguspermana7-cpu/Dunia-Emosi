
## [2026-05-04] — G24 Bawah Laut (Pokemon Underwater)

### New: games/g24-pixi.html
- Underwater Flappy Bird variant — stalactite/stalagmite cliff obstacles replace pipes
- 40 levels × 4 regions: Kanto (1-10), Johto (11-20), Hoenn (21-30), Sinnoh (31-40, locked)
- 21 water Pokemon families with evo chains (single/2-stage/3-stage+mega)
- Player IS the water Pokemon GIF — NO Ash/Pikachu running sprite anywhere
- `flip: true/false` per evo stage → CSS `scaleX(-1)` for Pokemon facing wrong direction
- Animated Pixi bubbles (22 rising), seaweed sway (14 plants), light ray pulse
- CSS NPC sea creatures: region-specific emoji that swim left with sinusoidal bob
- Region-tab bag picker: [Kanto][Johto][Hoenn][Sinnoh🔒]
- 4 ocean color themes (Coastal/Trench/Tropical Reef/Ice Cavern)
- Asset folder: assets/Pokemon/g24/ (GIFs go here)

### Modified: index.html
- G19 world map node → now calls `openWorldPicker()` (3-way mode picker)
- Added G24 world map node `gtile-24` (🌊 Bawah Laut)
- Added World Picker Modal with Bawah Laut / Tanah / Udara options
- Cache bump → `v=20260504a`

### Modified: game.js
- Added `GAME_META[24]`, `GAME_INFO[24]`, `PEMOJIS[24]`
- Added `initGame24()`, `openWorldPicker()`, `closeWorldPicker()`
- Cache bump → `v=20260504a`

## Session 2026-05-04 (Part 2) — G24 Navigation Fix + Polish

### Fixed: game.js
- `standaloneGames` array: added `24` (was causing blank page freeze)
- `inits[]` array: added `initGame24` at index 24 (navigation was never triggering)
- `totalLevels` / `numTiers` / extended-tier display: added `=== 24` to 40-level conditions
- `openWorldPicker()`: now injects live G19/G23/G24 star progress into modal buttons
- `gameIds` in `refreshWelcomeBadges()`: added `24` so G24 stars display on world map
- Cache bump → `v=20260504b`

### Fixed: games/g24-pixi.html
- NPC bob: removed hardcoded CSS `seaNpcBob` animation, JS per-NPC bAmp now used correctly
- Start overlay: shows selected Pokemon GIF with flip support + emoji fallback
- `_g24HasPendingQuiz()` guard added to `togglePause()` and `openBag()`
- `closeBag()`: resumes game when no quiz pending (was leaving stuck-paused)
- Evolution flash: matches region `THEME.lightColor` hex instead of hardcoded `#7dd3fc`
- BGM volume: reads slider DOM values directly (no `window._volMaster` dependency)
- Sinnoh bag tab: unlocks at `cfg.level >= 31` instead of permanently locked
- HUD badge: shows `🌊 [Region Name]` dynamically

### Fixed: index.html
- World picker modal: added `wpk-stars-*` spans for live star count display
- Cache bump → `v=20260504b`

## 2026-05-04 — Session #127: G24 Animated Sprites Polish

### G24 Pokemon Bawah Laut
- All Pokemon now use Pokemon Showdown animated GIFs as primary sprite source
- Magikarp exception: HD WebP + CSS `rotate` micro-wiggle simulates swimming motion
- Fixed facing direction for all Pokemon (flip:true for fish, flip:false for symmetric)
- Added max-height:28vh to prevent tall evolutions (Gyarados) from overflowing screen
- Anglerfish NPC added to all 4 regions (1-in-6 spawn) — image silhouette with mix-blend-mode
- Fixed Johto/Hoenn bag tabs incorrectly locked (regression from #126 ALL tab commit)
- Cache: v=20260504c

## 2026-05-05 — #128 G21 Mario Pokemon Terrain + Mushroom Fixes
- Hills/mountains now sit at correct ground level (10*TILE, not _gameH()-30)
- Pit danger overlay anchored to actual ground row (no more floating red line)
- Mushrooms now walk left/right like Goombas (velocity 0.8–1.3, edge-turning)
- Mushroom side-hit → math quiz; stomp still kills mushroom + score
- Player feet overlap on platforms reduced (haloFudge 10 → 4)
- Cache: g21-pixi.html v=20260505d, game.js updated

## 2026-05-05 — #129 Kodok Slot-7 Preset Fix (game.js)
- Fixed: `_applyKodokSlot7Unlock` never triggered because world-map tile uses `openGymGame()` not `openLevelSelect`
- Added unlock call to `openGymGame()` (G13C tile) and `openRegionOverlay()` (G13B tile)
- G21 code review fixes: pit overlay diagonal no longer bleeds left; patrol anchor uses `!== undefined` guard

## 2026-05-05 — #130 Deep Code Review Round-2 Fixes (G21/G23/G24/game.js)
- **HIGH** G23 `battleBgm` fade interval leak — fade handle now stored at module scope, cleared in both `battleBgmPlay` and `battleBgmStop` so concurrent calls do not mute the next battle
- **HIGH** G24 `showWin` slot-0 fallback key — removed legacy `dunia-0-progress` write that bypassed avatar-keyed scheme; `save-engine.js` is the only path now
- **MED** G21 pit overlay right-edge bleed — loop bound capped at `w + TILE*2 - 12` so `i+12` vertex stays in overlay (no more bleed into the tile to the right)
- **MED** G21 Q-block mushroom death animation — added `_g21Vx: 1` so death-anim `scale.x` sign is correct (previously `undefined >= 0` produced mirrored squash)
- **MED** game.js slot-7 unlock conditions aligned — both `openLevelSelect` and `openRegionOverlay` trigger only on `gameNum === '13b'` (removed dead `'13c'` arm and incorrect `13`/`'13'` arms that fired on G13A)
- **MED** G24 `_g24HasPendingQuiz` stale `currentCliff` — `goBack()` now nulls `S.currentCliff` to prevent stale-state guard after navigation
- **MED** G24 anglerfish white-PNG bg — added `mix-blend-mode:multiply` to img-type NPCs (L83 pattern); reset on emoji fallback
- **MED** G23 `closeBag` BGM resume — `openBag` now calls `bgmPause()`, `closeBag` calls `bgmResume()` and resets pause state when no quiz is pending
- **LOW** G24 trailing version comment added (`<!-- g24-pixi v20260505e -->`) for cache-bust tracing parity with G23
- Cache bumps: g21-pixi v=20260505e, g23-pixi v=20260505e, g24-pixi v=20260505e

## 2026-05-05 — #131 G24 NPC Direction + Spawn Polish (g24-pixi.html)
- **NPC sprites flipped to face left** (movement direction). All NPCs use `transform:scaleX(-1)` so they no longer appear to swim "mundur" (backward). Player Pokemon faces RIGHT (forward); NPCs must face LEFT to look like correct motion.
- **Whale direction reversed** L→R → R→L (`spawn at W+120, move LEFT`). Now consistent with all other NPCs (right-to-left flow, opposite to player swimmer's left-to-right swim).
- **Spawn cadence reduced**: delay 2.2-5.7s → **5-9.5s**; concurrent NPC cap at 5; whale max 1 in flight; diver max 1 in flight. Mutually exclusive spawn (one type per cycle, not three).
- **Crab is now benthic**: spawns at `FLOOR_Y - sz*0.7` (seafloor), bobAmp=0 (no floating bounce), speed 0.22 (slower walking pace).
- **Anglerfish PNG dropped** in favor of Pokemon Showdown `lanturn` GIF — real anglerfish Pokemon with glowing lure, transparent BG, no mix-blend-mode hack needed.
- **Scuba diver fixed**: `🤿` (mask only) → `🏊‍♂️` (person swimming, full body). Faces left to match motion.
- Cache bump: g24-pixi.html v=20260505f

## 2026-05-04 — #132 G24 Flip+Rotate + G13C Badge Counter

**G13C — "0/87 BADGE DIRAIH" never updated despite Kodok preset working**
- Root cause: `games/g13c-pixi.html` had TWO HTML elements with `id="badge-num"` and `id="total-trainers"` (lines 259 + 344). `getElementById` returned the FIRST match (hidden HUD top counter), never updating the visible Gym Ladder subtitle counter (stuck on hardcoded default `87`).
- Renamed Gym Ladder IDs to `gs-badge-num` / `gs-total-trainers`; default 87 → 77 (TRAINERS.length).
- `updateBadgeCount()` now updates BOTH counters atomically. L90.

**G24 — Pokemon facing wrong direction (7 entries) + 5 upright Pokemon**
- Set `flip:true` on Mantine×2, Wailmer, Mantyke (Showdown sprites face LEFT, need flip to face RIGHT = swim direction).
- Added `rotate:true, wiggle:true` on Buizel, Floatzel, Lugia, Eternatus, Eternamax Eternatus (upright-pose Pokemon now lie horizontal in swim game).
- New CSS class `.swim-rotate{rotate:-90deg}` + `@keyframes swimWiggleRot` composes wiggle on rotated sprites. L91.
- Lugia bag card 🕊️ dove emoji → real Lugia (HD source `lugia.gif` → `lugia.webp`; gif failed silently). Cascade fallback: `hd → src (Showdown URL) → emoji`.
- Renderer paths updated (createSwimmer, applyPokemon, renderBagGrid, refreshStartIcon) all handle the rotate prop.
- Cache: g24-pixi v=20260505g, g13c-pixi v=20260505g

## 2026-05-04 — #133 G23 Pokemon Run — GIF + DUCK + FX

**Player Pokemon GIF disappeared (showed static HD)**
- `setupPlayerImg` previously cascaded `gif → hd` permanently on first error. Added self-healing retry: probes the GIF URL with cache-bust at 1s/3s/9s exponential backoff (max 3 attempts) and swaps back to GIF when it loads.
- Same retry attached to `applyPokemon` swap path.

**"⬇ DUCK" text label rode along with mid-bar/mid-rock obstacles**
- Removed both `PIXI.Text` labels at lines 768-769 and 778-779. Visual was cluttered and read like "duct" on small screens. The large green slide button (#slide-btn) remains as the obvious slide cue.

**Obstacles lacked solid-hit feel and per-type destruction effects**
- Rewrote `destroyObs` with type dispatch:
  - `box`/`tall`/`double` → 6 wood splinters fly up + outward, gravity pulls to floor, bounce
  - `spike` → 5 purple triangle shards scatter
  - `bush` → 7 green leaves flutter down with rotation
  - `rock`/`mid-rock` → 4 gray rubble chunks bounce on floor
  - `mid-bar` → 8 blue spark particles radial + screen flash
  - `high-bird` → 5 white feathers float down
- Extended `_obsParticles` shape with `vx, vy, ay, vr, life, maxLife` for motion; `updateObsParticles` handles both motion shards and legacy whole-obstacle fade. L92.
- `gfx._g23Type` now tagged on creation for dispatch.

**Pickup vs obstacle ambiguity**
- `spawnPowerUp` now uses unified GOLD aura (0xFCD34D outer halo + 0xFBBF24 mid glow) + 4 sparkle dots + upward chevron above the orb — clearly "collect me". Body keeps per-type tint (⚡🔥🍃💜) for variety. Obstacles keep RED outline glow (0xFF4444) — clearly "avoid me".

- Cache: g23-pixi v=20260505g

## 2026-05-04 — #134 G23 Jump + Hitbox Fixes

**Double jump unreachable**
- Root: `<button onclick="handleJump()">` — `onclick` on mobile has 300ms debounce, blocking rapid double-tap. The double-jump code (`S.jumpCount<2`, `DBLJ_POWER=-12.0`) was already implemented but never reached.
- Fix: replaced `onclick` with `pointerdown` listener on jump and slide buttons. `e.preventDefault()` blocks emulated click. Added `touch-action:manipulation` to disable touch debounce.
- Visual cue: jump button glows GOLD with "2x" badge while a second jump is still available. Cleared on landing or when 2nd jump consumed.

**Pokemon size non-uniform / distorted**
- Root: `#player-img` had no `object-fit` — `width:132px;height:110px` stretched square sprites to 132×110.
- Fix: added `object-fit:contain` to `#player-img` CSS — preserves source aspect ratio, all Pokemon now render proportionally inside the uniform 132×110 hitbox box.

**Hitbox crown gap (player took hits to invisible head zone)**
- Root: `HIT_MARGIN=20` made player hitbox top sit 20px below visual top, so obstacles passing through "above" the visual head still triggered hits.
- Fix: HIT_MARGIN 20 → 12 (more symmetric, closer to visual silhouette).

**Obstacle hitbox didn't match visual**
- Root: collision used `+4` inset on all sides — visually-touching obstacle edges didn't trigger collision; player clipped through edges.
- Fix: removed inset; hitbox = visual fill rect exactly. Obstacles now feel solid.

- Cache: g23-pixi v=20260505h
- Lesson L93: mobile `onclick` has 300ms debounce — use `pointerdown` for game action buttons
