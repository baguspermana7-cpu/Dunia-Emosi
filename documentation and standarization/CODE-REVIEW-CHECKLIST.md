# Code Review Checklist — Dunia Emosi

> **Effective**: 2026-04-26
> **Purpose**: Prevent recurrence of regression patterns documented in LESSONS-LEARNED.md
> **Mandate**: Run through this BEFORE every commit. Missing item = NOT done.
> **Reference**: Memory `feedback_structured_verification.md` — "AI doesn't forget. Gaps in plan = gaps in process."

---

## 🔴 BLOCKING — These MUST pass before commit

### 1. Syntax & Build
- [ ] `node --check game.js` exit 0
- [ ] All other modified `.js` files pass `node --check`
- [ ] HTML/CSS visually inspected for typos

### 2. Cross-File Integration Checklist (per `feedback_structured_verification.md`)
**For every NEW JS file `games/data/foo.js` or `shared/bar.js`:**
- [ ] File created with valid syntax (`node --check`)
- [ ] **`<script src="...">` tag added to `index.html`** with cache-bust query
- [ ] Script load order correct: dependencies before consumers
- [ ] **Cache versions bumped ATOMICALLY** across all deploy files (style.css, all data .js, game.js)
- [ ] Defensive `console.error` guard in code that reads expected global if undefined
- [ ] Browser smoke test (NOT just `node --check`):
  - DevTools Network: every `<script>` returns **200 OK** (not 304)
  - DevTools Console: no `X is not defined` errors
  - Tap through critical UI path → expected content renders

**Anti-example** (what caused Task #69 — "Coming soon" placeholder bug):
- `city-pokemon-pack.js` was created and `node --check` passed
- BUT script tag never added to `index.html` → CITY_PACK undefined at runtime
- Silent fallback to "Coming soon" placeholder for all 10 regions on Vercel deploy

### 3. State Property Audit (per Task #84)
**When adding new game entry path or bypassing legacy `startGameWithLevel`:**
- [ ] `state.gameStars = [0, 0]` initialized
- [ ] `state.currentPlayer = 0` initialized
- [ ] `state.maxPossibleStars = null` initialized
- [ ] `state.paused = false` reset
- [ ] `state.selectedLevelNum` set
- [ ] `state.selectedLevel` ('easy'/'medium'/'hard') set
- [ ] `state.currentGame` set (number)
- [ ] `state._showingResult = false` reset
- [ ] `state._showingGameResult = false` reset

**Anti-example** (Task #84): renderCityGrid set `state.selectedRegion/City/LevelNum` but missed `state.gameStars` → endGame's `state.gameStars[0]+state.gameStars[1]` threw TypeError → freeze in all 4 games.

**Defensive pattern** at every `initGameN`:
```js
if (!Array.isArray(state.gameStars)) state.gameStars = [0, 0]
if (typeof state.currentPlayer !== 'number') state.currentPlayer = 0
state._showingResult = false
state._showingGameResult = false
```

### 4. Cache Versioning Atomicity
- [ ] All cache-bust query params (`?v=YYYYMMDDX`) updated to SAME version across:
  - `index.html` `<link rel="stylesheet" href="style.css?v=...">`
  - `index.html` `<script src="games/data/region-meta.js?v=...">`
  - `index.html` `<script src="games/data/city-progression.js?v=...">`
  - `index.html` `<script src="games/data/city-pokemon-pack.js?v=...">`
  - `index.html` `<script src="game.js?v=...">`
  - Hardcoded URLs in code (e.g., `openGymGame()` → `g13c-pixi.html?v=...`)
- [ ] `sed -i 's/v=PREV/v=NEW/g' index.html` followed by grep verification

**Anti-example**: G13c launch URL had stale `v=20260424g` for 4 deploys, served old code.

---

## 🟡 HIGH-PRIORITY — Strong recommendation, document if skipped

### 5. Local-First Asset Policy (per Lesson L16)
- [ ] **Sprite/image**: ALWAYS local-first via `pokeSpriteAlt2(slug)` → fallback remote
- [ ] **Background**: local WebP from `assets/Pokemon/background/`, `background-size: cover` (NEVER stretch)
- [ ] Lazy loading: `loading="lazy" decoding="async"` on grid renders ≥10 images
- [ ] **Mega/special forms**: visual-overlay only (CSS aura + badge), NO separate sprite (per Lesson L20)
- [ ] Audit grep for `pokeSpriteOnline\|pokeSpriteCDN` after asset-related changes — every usage must be FALLBACK only, not primary

**Anti-example** (Task #71): G13b `pspr.src = pokeSpriteOnline(pSlug)` was REMOTE-primary → 41 fetches blocked main thread on slow networks → tab freeze.

### 6. Modal/Overlay Pause Contract (per Lesson L17)
- [ ] Open modal → set `gameState.paused = true`
- [ ] Close modal → set `gameState.paused = false`
- [ ] Active intervals/tickers gate via `if (state.paused) return`
- [ ] Do NOT clearInterval — keeps cadence; flag-based pausing only
- [ ] Test: 14s pause → verify legendary auto-attack does NOT fire

### 7. Touch UX (per Lesson L18, P0-6)
- [ ] No `:hover` rule without `:active` parity (iOS lacks hover state)
- [ ] Tappable elements ≥44×44pt (Apple HIG) — explicit `min-width: 44px; min-height: 44px` for `@media(max-width:360px)`
- [ ] Bottom-anchored interactive panels: `padding-bottom: max(10vh, calc(env(safe-area-inset-bottom, 0px) + 16px))`
- [ ] No `pointer-events: none` on tappable elements unless intentional

### 8. Math Difficulty Compliance (per MATH-DIFFICULTY-STANDARD.md)
**For new math game generators:**
- [ ] Call `getMathLimits()` first
- [ ] Cap `maxNum` against `_ml.maxNum` (20 easy, 50 hard)
- [ ] Filter `ops` against `_ml.allowedOps` (+/− easy, +−×÷ hard)
- [ ] Add `'+'` fallback if filter result is empty
- [ ] Add to compliance table in MATH-DIFFICULTY-STANDARD.md

### 9. Accessibility (WCAG 2.1 AAA per Task #74)
- [ ] No new animation that lacks `@media (prefers-reduced-motion: reduce)` consideration (top-level rule covers most cases)
- [ ] Color contrast ≥4.5:1 for text (≥3:1 for large)
- [ ] Audio feedback for correct answer in any new math/quiz game (`playCorrect()`)

### 10. Documentation Sync
- [ ] `TODO-GAME-FIXES.md` — task entry with Symptom/Root Cause/Fix/Touched
- [ ] `documentation and standarization/CHANGELOG.md` — session entry
- [ ] `documentation and standarization/LESSONS-LEARNED.md` — if new pattern discovered (LN entry)
- [ ] Memory file (`~/.claude/projects/-home-baguspermana7/memory/`) — session log
- [ ] If new behavior added: relevant SPEC doc updated (CITY-PROGRESSION-SPEC, G13-EVOLUTION-CHAIN-SPEC, etc.)
- [ ] If new module file: ARCHITECTURE-INDEX.md cross-referenced

---

## 🟢 NICE-TO-HAVE — Quality polish

### 11. Code Quality
- [ ] No `console.log` (use `console.warn`/`console.error` only for legitimate errors)
- [ ] No new TODO/FIXME without ticket reference
- [ ] Functions <50 lines preferred
- [ ] Files <800 lines preferred (game.js exempt — Phase 2 split planned)
- [ ] Null-guard DOM access: `const el = document.getElementById('x'); if (!el) return`

### 12. Animation Helpers (per Task #80)
- [ ] Use `animateClass(el, 'spr-hit', 480)` instead of inline `el.classList.add(...) + setTimeout(remove)`
- [ ] Combined animation rules: when JS adds 2+ classes that BOTH have `animation:` property, add explicit combined rule (e.g., `.cls1.cls2 { animation: A, B; }`) per Task #83 fix

### 13. Event Listener Hygiene (per Task #80)
- [ ] Use `addTrackedListener(el, type, fn)` for new listeners
- [ ] Call `clearTrackedListeners(el)` on game exit/swap
- [ ] Audit: `addEventListener` count ≈ `removeEventListener` count (per Lesson L22 audit)

### 14. Performance
- [ ] Audio `preload="none"` unless audio plays within 5s of page load
- [ ] `<script>` tags use `defer` unless required upfront
- [ ] All `<img>` use `loading="lazy" decoding="async"` unless above-the-fold critical

---

## 📋 Pre-Commit Verification Script

```bash
cd /home/baguspermana7/rz-work/Dunia-Emosi

# 1. Syntax
node --check game.js || { echo "❌ game.js syntax error"; exit 1 }
node --check games/data/region-meta.js || exit 1
node --check games/data/city-progression.js || exit 1
node --check games/data/city-pokemon-pack.js || exit 1

# 2. Cache version atomic check (all should match latest version)
echo "Cache versions in index.html:"
grep -oE "\?v=[0-9]+[a-z]" index.html | sort -u

# 3. State init audit (5+ defensive guards)
COUNT=$(grep -c "if (!Array.isArray(state.gameStars))" game.js)
echo "Defensive state.gameStars guards: $COUNT (should be ≥5)"

# 4. Remote-primary sprite audit (should be ZERO except as fallback)
grep -nE "\.src = pokeSprite(Online|CDN)\(" game.js | head

# 5. Console.log leak check (should be ZERO)
grep -cE "console\.log\(" game.js

# 6. Critical local files exist
for f in style.css game.js games/data/region-meta.js games/data/city-progression.js games/data/city-pokemon-pack.js; do
  test -f "$f" || { echo "❌ Missing: $f"; exit 1 }
done

echo "✅ Pre-commit checks passed"
```

---

## 🚨 Red Flags (STOP and investigate)

- TypeError in browser console after deploy
- "Coming soon" placeholder for content that should exist (sprite registration gap)
- Game freezes after victory/defeat (state property gap)
- Sprite invisible (404 on remote, missing local)
- Player sprite faces wrong direction (sprite-source orientation mismatch)
- Tap target ignores touch on iOS (`:hover` without `:active`)
- Modal opens but buttons don't respond (`pointer-events: none` or z-index conflict)
- `localStorage` writes fail silently (quota exceeded)

---

## Why This Checklist Exists

Production bugs prevented by this checklist (chronological):
- **#69** — `<script>` tag forgotten → CITY_PACK undefined → "Coming soon" for 127 cities
- **#70** — `state.currentGame` not propagated to city picker path
- **#71** — Sprite remote-primary regression (Lesson L16 incomplete)
- **#72** — G13b modal returned to wrong screen post-victory
- **#83** — CSS animation conflict between `.spr-hit` and `.spr-flash`
- **#84** — `state.gameStars` undefined → all 4 games freeze post-victory

Pattern: each was a **gap in the implementation plan**, not a coding error. Every gap traced to:
- Missing cross-file integration (script tag, cache version)
- Missing state propagation (legacy entry vs new entry diverged)
- Missing audit (when changing primary asset source, didn't grep all callsites)

**This checklist closes those gaps systematically.**

## Relation to Other Standards

- `MATH-DIFFICULTY-STANDARD.md` — Math rule #8 above
- `CITY-PROGRESSION-SPEC.md` — State init audit #3 above
- `G13-EVOLUTION-CHAIN-SPEC.md` — Modal pause #6, asset #5
- `LESSONS-LEARNED.md` — L16-L24 referenced in #5-#13
- `CODING-STANDARDS.md` — supplements with general Pythonic-style guidance
- Memory `feedback_structured_verification.md` — Cross-File Integration mandate
- `AUDIT-2026-04-25.md` — Phase 1-3 implementation roadmap
