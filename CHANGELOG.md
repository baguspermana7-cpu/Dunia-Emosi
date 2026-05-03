
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
