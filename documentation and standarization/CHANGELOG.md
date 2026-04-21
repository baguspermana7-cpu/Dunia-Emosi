# Changelog — Dunia Emosi

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
