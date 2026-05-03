
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
