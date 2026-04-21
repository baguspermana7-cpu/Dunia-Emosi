# Lessons Learned — Dunia Emosi

> Per session mandate 2026-04-21 (user): every fix appends a one-line lesson here. What was surprising, what was the root cause, what's the reusable rule. Symptom / Root Cause / Fix / Lesson.

---

## 2026-04-21 (Evening Session)

### PIXI v8 async texture loading

- **Symptom**: G6 vehicle sprite never appeared — stuck on emoji fallback despite image files existing and accessible via HTTP 200.
- **Root cause**: `PIXI.Texture.from(url)` in PIXI v8 is NON-BLOCKING. Failures surface async, so `try/catch` around the call caught nothing. The `Sprite` was created with an unloaded texture; `onerror`-style fallback was impossible.
- **Fix**: `PIXI.Assets.load(url).then(tex => swapSprite).catch(err => keepEmoji)`. Show emoji placeholder immediately, swap to sprite once resolved.
- **Lesson**: In PIXI v8, ALWAYS use `PIXI.Assets.load()` for raster images. Never wrap `Texture.from()` in `try/catch` expecting sync failure. Rule applies to all games that load external images (G6, G10, G13b, G13c, G22).

### Engine default assumption bias (facing direction)

- **Symptom**: User flagged Staryu "still not facing", then corrected to "Pikachu is wrong" — player sprite facing left instead of right.
- **Root cause**: BSE engine defaulted to `natural facing = 'R'` (sprite head points right). But Pokemondb HOME 3D renders actually face the viewer with a slight LEFT bias. Default assumption inverted reality for ~95% of the roster.
- **Fix**: Flipped default to `'L'` in both `games/battle-sprite-engine.js:15` and `game.js:5010`. All per-Pokemon `'L'` overrides became redundant and were removed.
- **Lesson**: Test engine defaults against ACTUAL source data, not abstract notion. When flipping the default eliminates most override entries, the default was wrong.

### CSS multi-row navbar on narrow screens

- **Symptom**: Game header `.game-header` wraps to 2 rows on phones < 360px; children stack vertically (back, title, level, player, pause, stars).
- **Root cause**: Flex container with no `flex-wrap:nowrap` + title with `flex:1` but no `min-width:0` — long title text forces siblings to wrap.
- **Fix**: `.game-header { flex-wrap:nowrap; overflow:hidden }` + `.gh-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }`.
- **Lesson**: Flex children with `flex:1` need `min-width:0` to allow shrinking below content width. Without it, long text blocks can push siblings to a new row even when `nowrap` is set.

### PIXI text button overflow from container

- **Symptom**: G16 quiz answer text leaks out of button boundary.
- **Root cause**: `.choice-btn` had `max-width:120px` + fixed `font-size:clamp(16px,5.5vw,26px)` — long answer strings like "Matahari" or multi-word categories overflow.
- **Fix**: Removed max-width cap, added `overflow:hidden; overflow-wrap:break-word; white-space:normal; line-height:1.2`, reduced default fontSize. JS auto-applies `.long-text` class (smaller font) when any answer >5 chars.
- **Lesson**: Dynamic answer text needs dynamic button sizing OR dynamic font sizing. Static `max-width` + static `font-size` is a recipe for overflow. G22 pattern of measuring `textObjs.map(t => t.width)` is ideal.

### Hardcoded sibling race (end-game freeze)

- **Symptom**: G16 game freezes at end — doesn't advance to result screen.
- **Root cause**: Multiple state transitions (`ARRIVING` → `ARRIVED` → `setTimeout showWin`) in one chain. If ANY step throws or `winShown` flag stays stuck false, the game hangs with no fallback.
- **Fix**: 8-second safety `setTimeout` in `triggerArrival()` that force-fires `showWin()` if normal flow fails, with nested try/catch falling back to `finishGame()`.
- **Lesson**: For single-point-of-failure state transitions (especially ones gated on async animations), ALWAYS add a timeout-based safety net. Pick timeout 2-3× longer than expected normal path.

### Pokemondb sprite inventory expansion

- **Symptom**: User provided new HD sprite folder — realized previous coverage was ~751 SVGs out of 1025 Pokemon, creating fallback-to-low-res cascade for Gen 8/9.
- **Root cause**: Sprite roster never audited against current dex size (1025 as of Gen 9 DLC).
- **Fix applied** (Task #37): `pokeSpriteAlt2(slug)` added, cascade is now alt2 → SVG → HD CDN. Primary swapped to 1025-set local WebP. BSE `hdSrc` param picks it up unchanged.
- **Lesson**: For data-driven games, inventory the SOURCE data periodically. Audit coverage vs current canonical count before sprinting into code. When a new asset set matches an existing engine's default assumption (facing, dimension), zero override entries needed — a good sign the asset set was chosen well.

### Source data inventory

- **Symptom**: Gen 8/9 Pokemon rendered via remote HD CDN (network latency, offline break) while Gen 1-7 rendered via local SVG — inconsistent cost model across the roster.
- **Root cause**: Local SVG set was frozen at 751 entries when Gen 8 launched. No periodic re-inventory.
- **Fix applied**: Local 1025-WebP set integrated as new top of cascade; SVG demoted to secondary; remote CDN demoted to tertiary. Result: all battle sprites now load locally for 100% of roster.
- **Lesson**: When a local asset set covers <100% of data model, flag it in the cascade comment. Every added data-model entry (new Gen / new DLC) should trigger an asset audit checklist item.

### Fluid CSS tokens replace step-function media queries

- **Symptom**: Same "shrink button/font at narrow width" logic duplicated across 22 games via `@media(max-width:480px) / 400px / 360px` blocks. 60+ lines of stepwise overrides; visual jumps at each breakpoint; letter-input rows went vertical inconsistently.
- **Root cause**: Each game reimplemented its own breakpoint ladder with hand-picked pixel values. No shared scale. `@media` is a step function — it snaps at thresholds instead of interpolating.
- **Fix** (Task #29 Steps 1+2): single `--rz-scale: clamp(0.7, calc(0.44 + 0.175vw), 1)` in `:root`, plus derived `--rz-btn-*`, `--rz-font-*`, `--rz-gap-*`, `--rz-radius-*` tokens. Reusable primitives `.rz-navbar`, `.rz-letter-row`, `.rz-letter-btn`, `.rz-choice-grid` consume the tokens. Migration (Steps 3–7) deletes per-game `@media` blocks one game at a time.
- **Lesson**: `clamp(min, Xvw, max)` and `calc(base * var(--scale))` interpolate CONTINUOUSLY across viewport widths — no visual snap, no stale breakpoint values to maintain. When you catch yourself writing the same `@media(max-width:…)` for the third time, that's the signal to extract a fluid token instead.

### Correct-answer juice — reward scaling by streak (Task #38)

- **Symptom**: G16 "Selamatkan Kereta" — correct quiz answer under-rewarded. Only a green flash + `btn.correct` class; no spatial/physical feedback, no escalation for consecutive correct answers. Children lose engagement signal after 2-3 answers.
- **Root cause**: Single-state success feedback gives a flat reward curve. Players who answer 5-in-a-row get identical juice to first-timers, dampening flow and achievement. "Juice" (game-feel feedback) wasn't tiered against performance.
- **Fix**: Three-tier `spawnQuizCelebrationFX(x, y, streak)` — (1) baseline 14-confetti burst + white ring, (2) streak≥3 adds 6 secondary firework bursts of 10 sparks, (3) streak≥5 adds 8 floating ⭐✨🌟💫 emoji + gold ring pulse. Plus a 0.5s stage-scale "punch" (1→1.04→1 via sine bell-curve) for whole-screen kick. Streak tracked on `S.correctStreak` (reset on wrong). Particles share existing `sparkParticles[]` cull loop, extended with `_ring` (expand+fade, no motion) and `_noGravity` (emoji float-up) branches.
- **Lesson**: Reward feedback should SCALE with performance. Flat juice = flat engagement. Track a streak counter, branch FX by threshold (3/5 are good defaults), and LAYER effects — baseline stays for beginners, extras reward mastery. Stage-level "punch" (brief scale bump via sine curve over ~0.5s) reads as a kick, not a zoom — center-compensate `stage.x/y` so the punch pivots from the middle. Always route new particles through the existing cull pipeline to keep GC pressure constant.

---

## Template for future entries

```
### <topic>
- **Symptom**:
- **Root cause**:
- **Fix**:
- **Lesson**:
```
