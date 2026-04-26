# Architecture Index — Dunia Emosi

> **Single entry point** for understanding the codebase. Read this first.
> **Effective**: 2026-04-26
> **Audience**: Self (future), AI assistants, contributors

---

## 🗺️ Documentation Map

### Required Reading (in order)

| # | Document | When to Read | Size |
|---|----------|-------------|------|
| 1 | **README.md** (root) | Project overview | small |
| 2 | **ARCHITECTURE.md** | High-level architecture | medium |
| 3 | **CODING-STANDARDS.md** | Style + patterns | medium |
| 4 | **CODE-REVIEW-CHECKLIST.md** ⭐ | Before every commit | medium |
| 5 | **LESSONS-LEARNED.md** | Anti-patterns from past bugs (L1-L24) | growing |

### Domain Specifications

| Spec | Domain | Implementation |
|------|--------|----------------|
| **CITY-PROGRESSION-SPEC.md** | Region → City journey (G10/G13/G13b) | Task #66 |
| **G13-EVOLUTION-CHAIN-SPEC.md** | 44 evolution chains + Mega visual overlay | Task #67 |
| **MATH-DIFFICULTY-STANDARD.md** | Easy default, Hard opt-in math rule | Task #68 |
| **CHARACTER-TRAIN-SPEC.md** | G15/G16 train calibration (Casey/Linus/Dragutin/Malivlak) | pre-2026-04 |
| **COLOR-PALETTE.md** | Dreamy Meadow + RDE token system | pre-2026-04 |
| **GAME-REFERENCES.md** | Per-game gameplay reference | maintained |

### Operational Docs

| Doc | Purpose |
|-----|---------|
| **TODO-GAME-FIXES.md** (root) | Active task list. Read at session start. |
| **CHANGELOG.md** | Per-session change log |
| **AUDIT-2026-04-25.md** | 4-dim comprehensive audit + 3-phase roadmap (29 issues) |

---

## 🏗️ Code Architecture

### File Structure

```
Dunia-Emosi/
├── index.html              (2.1 K lines, 142KB) — all 22 game screens inline
├── game.js                 (12.3 K lines, 746KB) — main game logic + state
├── style.css               (6.1 K lines, 328KB) — all styling
├── games/
│   ├── data/
│   │   ├── region-meta.js          — 10 main Pokémon regions metadata
│   │   ├── city-progression.js     — sliding-frontier unlock helpers
│   │   └── city-pokemon-pack.js    — 127 cities × canonical Pokemon packs
│   ├── game-modal.js               — unified modal for standalone Pixi games
│   ├── battle-sprite-engine.js     — BSE (G13c bridge)
│   ├── trains-db.js                — G15 train catalog
│   ├── train-character-sprite.js   — Character Train engine
│   └── *.html                      — 8 standalone Pixi games (g6, g13c, g14-22)
├── shared/
│   └── rz-responsive.js            — RDE responsive token runtime
├── assets/
│   ├── Pokemon/
│   │   ├── pokemondb_hd_alt2/      — 1025 HD WebP sprites (PRIMARY)
│   │   ├── svg/                    — 751 SVG sprites (fallback variant)
│   │   ├── background/             — 178 city backgrounds (PC + mobile)
│   │   ├── others/                 — region.webp, cities.webp icons
│   │   └── sound/                  — BGM + SFX
│   └── (game-specific assets)
└── documentation and standarization/
    └── (this folder — 12 docs)
```

### Module Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│                       INDEX.HTML (entry)                          │
│  Loads in order:                                                  │
│  1. style.css                                                     │
│  2. games/data/region-meta.js   (defer)                           │
│  3. games/data/city-progression.js   (defer)                      │
│  4. games/data/city-pokemon-pack.js   (defer)                     │
│  5. game.js   (defer)                                             │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                          GAME.JS (monolith)                       │
│                                                                   │
│  ┌─ State management ─────────────────┐                           │
│  │ state{}, gXState{}, _showingResult │                           │
│  │ state.currentGame, gameStars[]     │                           │
│  └────────────────────────────────────┘                           │
│                                                                   │
│  ┌─ Helpers ──────────────────────────┐                           │
│  │ animateClass, addTrackedListener   │  (Task #80)               │
│  │ pokeSpriteAlt2, applyPokeFlip      │                           │
│  │ getMathLimits, GameScoring         │                           │
│  │ playClick, playCorrect, playWrong  │                           │
│  └────────────────────────────────────┘                           │
│                                                                   │
│  ┌─ Game modules (inline) ────────────┐                           │
│  │ initGame1..5    (vanilla DOM)      │                           │
│  │ initGame6       → games/g6.html    │                           │
│  │ initGame7..8    (vanilla DOM)      │                           │
│  │ initGame9       (canvas drawing)   │                           │
│  │ initGame10      (Pokemon Battle)   │                           │
│  │ initGame11..12  (quizzes)          │                           │
│  │ initGame13      (Evolusi Math)     │                           │
│  │ initGame13b     (Quick Fire)       │                           │
│  │ initGame13c     → games/g13c-pixi  │                           │
│  │ initGame14      → games/g14.html   │                           │
│  │ initGame15..22  → games/*-pixi.html│                           │
│  └────────────────────────────────────┘                           │
│                                                                   │
│  ┌─ Region/City Selector (Task #66) ──┐                           │
│  │ openRegionOverlay, openCityOverlay │                           │
│  │ renderRegionGrid, renderCityGrid   │                           │
│  └────────────────────────────────────┘                           │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│            STANDALONE PIXI GAMES (separate HTML pages)            │
│                                                                   │
│  games/g6.html      Petualangan Mobil                             │
│  games/g13c-pixi.html  Gym Pokémon (uses GameModal)               │
│  games/g14.html     Balapan Kereta                                │
│  games/g15-pixi.html  Linus Lulus Linus                           │
│  games/g16-pixi.html  Selamatkan Kereta                           │
│  games/g19-pixi.html  Pokemon Birds                               │
│  games/g20-pixi.html  Ducky Volley                                │
│  games/g22-candy.html Monster Wants Candy                         │
│                                                                   │
│  Each: independent state, own ticker, own pause flag.             │
│  Shared: game-modal.js (unified result modal)                     │
└──────────────────────────────────────────────────────────────────┘
```

### State Lifecycle (Critical — per Task #84 root cause)

```
┌─────────────────┐
│ User taps tile  │  e.g. gtile-10 (G10 Pertarungan Pokemon)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ ENTRY PATH (one of these MUST run first)    │
│                                             │
│ Path A (legacy):                            │
│   openLevelSelect(N)                        │
│      └→ startGameWithLevel(lv)              │
│         └→ INIT state.gameStars=[0,0]       │  ← REQUIRED for endGame
│         └→ INIT state.currentPlayer=0       │
│         └→ INIT state.maxPossibleStars=null │
│                                             │
│ Path B (city picker - Task #66):            │
│   openRegionOverlay(N)                      │
│      └→ Region card tap                     │
│         └→ openCityOverlay(regionId)        │
│            └→ City card tap (renderCityGrid)│
│               └→ INIT state.* (matching A)  │  ← Task #84 fix here
│               └→ INIT state.selectedRegion  │
│               └→ INIT state.selectedCity    │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│ initGameN()                                 │
│   - Defensive guards (Task #84):            │
│     if (!Array.isArray(state.gameStars))    │
│       state.gameStars = [0, 0]              │
│   - Reset _showingResult, _showingGameResult│
│   - Build game UI                           │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│ GAMEPLAY                                    │
│   - addStars(n) → state.gameStars[cp]+=n    │  ← also defensive (Task #84-verify)
│   - Pause overlay → state.paused=true       │
│   - Resume → state.paused=false             │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│ GAME-END                                    │
│                                             │
│ G10 win path:                               │
│   g10EnemyDefeated()                        │
│      └→ if final round: endGame(stars)      │
│         └→ showResult(...)                  │
│            └→ state.gameStars[0]+[1]        │  ← would throw if uninit
│            └→ setLevelComplete(...)         │
│            └→ setCityComplete(...) (Task#66)│
│            └→ buildMenuHeader()             │
│            └→ showScreen('screen-result')   │
│                                             │
│ G13 win path:                               │
│   g13Victory() → showGameResult(...)        │
│                                             │
│ G13b win/lose path:                         │
│   g13bGameOver() → custom modal             │
│   g13bResultMainLagi() → openRegionOverlay  │
│                                             │
│ G13c (standalone):                          │
│   endBattleWin/Lose → GameModal.show(...)   │
└─────────────────────────────────────────────┘
```

**CRITICAL**: Both Path A and Path B MUST initialize the same set of state properties. This was the Task #84 bug — Path B (city picker) missed `state.gameStars` init → endGame threw → freeze.

---

## 🛠️ Adding a New Feature

### Adding a 23rd Game

1. **Decide module location**:
   - Vanilla DOM game (low-medium complexity) → inline in `game.js` (`initGame23`)
   - Pixi/canvas-heavy → standalone HTML in `games/g23-pixi.html`
2. **Add tile** in `index.html` (`<div class="wmap-node" id="gtile-23" onclick="...">`)
3. **Implement**:
   - Inline path: write `initGame23()` + state object + render functions
   - Standalone: copy from `games/g20-pixi.html` template, customize
4. **Math compliance** (if math): use `getMathLimits()` per MATH-DIFFICULTY-STANDARD.md
5. **Audio feedback** (per UX): include `playCorrect()` and `playWrong()` calls
6. **State init** (CRITICAL per Task #84): mirror `startGameWithLevel` setup
7. **Documentation**:
   - Add to ARCHITECTURE-INDEX.md (this file) — module layout section
   - Add to GAME-REFERENCES.md
   - TODO-GAME-FIXES.md task entry
   - CHANGELOG.md
8. **Cross-File Integration Checklist** (per CODE-REVIEW-CHECKLIST.md)
9. **Browser smoke test** before commit

### Adding a New Region (e.g., 11th region)

1. Add entry in `games/data/region-meta.js` (`REGION_META[regionId]`)
2. Add to `REGION_ORDER` array
3. Add cities to `games/data/city-pokemon-pack.js`
4. Generate background WebPs in `assets/Pokemon/background/{pc,mobile}/`
5. Update CITY-PROGRESSION-SPEC.md region count
6. Cache bump

### Adding a New Math Game

1. Use `getMathLimits()` helper (per MATH-DIFFICULTY-STANDARD.md)
2. Add to compliance audit table in MATH-DIFFICULTY-STANDARD.md
3. Audio + visual feedback (`playCorrect`, `spawnCorrectCardJuice`)
4. State init via legacy or new path

---

## 🔑 Key Conventions

### Cache Versioning
- Format: `?v=YYYYMMDDX` where X = a/b/c/... letter for same-day deploys
- ATOMIC across all files in single deploy (style.css, all data .js, game.js)
- Hardcoded in `openGymGame()` for G13c — must update manually

### Naming
- Per-game state: `gNState` for inline games (e.g., `g10State`, `g13bState`)
- Functions: `initGameN`, `g{N}{Action}` (e.g., `g10EnemyDefeated`, `g13Victory`)
- DOM IDs: `g{N}-{element}` (e.g., `g10-pspr`, `g13-pspr-wrap`)
- Storage keys: `dunia-emosi-{purpose}` for localStorage

### State Properties (must be initialized at game start)
- `state.currentGame` — number (10, 13, 14, etc.)
- `state.selectedLevelNum` — number (1-N within game)
- `state.selectedLevel` — string ('easy'/'medium'/'hard')
- `state.gameStars` — array `[0, 0]` (per-player stars this session)
- `state.currentPlayer` — number (0 or 1)
- `state.maxPossibleStars` — number or null
- `state.paused` — boolean
- `state._showingResult` — flag for showResult guard
- `state._showingGameResult` — flag for showGameResult guard
- (City picker only): `state.selectedRegion`, `state.selectedCity`, `state.selectedCityIdx`

### Asset Loading
- **Local-first** per Lesson L16: `pokeSpriteAlt2(slug) || pokeSpriteOnline(slug)`
- 2-stage `onerror` fallback chain
- `loading="lazy" decoding="async"` on all non-critical `<img>`

### Pause Contract (per Lesson L17)
- Open modal/overlay → set `state.paused = true`
- Close → `state.paused = false`
- Tickers/intervals: `if (state.paused) return` at body start
- Don't `clearInterval` — keeps cadence

---

## 📊 Project Stats (2026-04-26)

| Metric | Value |
|--------|-------|
| Game modules | 22+ |
| Pokémon sprites (local) | 1025 HD WebP + 751 SVG |
| City backgrounds | 178 (PC) + 178 (mobile) |
| Pokemon canonical packs | 127 cities × 5-7 species |
| G13 evolution chains | 44 (17 popular + 21 Ash + 5 cool + 1 random) |
| Lessons learned | L1-L24 |
| Total assets | ~224 MB |
| Lines of code (game.js) | 12.3 K |

## Process Mandates

These are NON-NEGOTIABLE — established via user feedback (memory `feedback_*.md` files):

1. **No "I forgot" excuses** — gaps are PROCESS gaps, not memory gaps. Every plan MUST include integration checklist.
2. **Read `TODO-GAME-FIXES.md` at session start** — track active fixes
3. **Update LESSONS-LEARNED.md per fix** — every regression becomes a permanent guard
4. **Update CHANGELOG.md per session** — chronological record
5. **Memory sync at session END** — preserve context for future sessions
6. **CODE-REVIEW-CHECKLIST.md before every commit**

## Known Tech Debt

Per AUDIT-2026-04-25.md, deferred to Phase 3+ (after stabilization):
- `game.js` modular split (12.3 K lines → per-game modules) — 40-60h
- Sprite IndexedDB lazy preload — 2.5h
- Audio MP3 → OGG re-encode (saves 12-15MB) — 1.5h
- CI/CD setup (vercel.json + GitHub Actions) — 6-10h
- JSDoc critical paths — 6-8h
- Bg image lazy-load by region — 2h

## Quick Decision Tree

| Question | Answer |
|----------|--------|
| Where do I add a new feature? | See "Adding a New Feature" above |
| What's the cache version? | Check `index.html:9` (current latest) |
| Why is X freezing? | Check Lesson L17 (pause), L18 (safe-area), Task #84 (state init) |
| Why is sprite invisible? | Check Lesson L16 (local-first), Task #71 (orientation) |
| Why is button unresponsive? | Check :active parity (Task #76), z-index, pointer-events |
| Where to log new fix? | TODO-GAME-FIXES.md + CHANGELOG.md + LESSONS-LEARNED.md if pattern is reusable |
| Where to read regression history? | LESSONS-LEARNED.md L1-L24 |

---

**Last updated**: 2026-04-26 (after Task #84 critical freeze fix)
**Maintainer**: Solo dev project
