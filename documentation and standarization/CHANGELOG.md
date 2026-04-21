# Changelog — Dunia Emosi

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
