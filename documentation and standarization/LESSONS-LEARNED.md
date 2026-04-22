# Lessons Learned — Dunia Emosi

> Per session mandate 2026-04-21 (user): every fix appends a one-line lesson here. What was surprising, what was the root cause, what's the reusable rule. Symptom / Root Cause / Fix / Lesson.

---

## 2026-04-22

### Manual threshold beats AI rembg for cartoon art on white backgrounds

- **Symptom**: Linus Brave character train rendered as a shattered/pecah fragment in G15 + G16 — inner body regions missing, only wheels + partial cab visible.
- **Root cause**: rembg with `u2net` (and even `isnet-general-use` + alpha matting) was trained on photographs. On flat cartoon art, the AI model sees uniform colored regions as "background-like" and erroneously alphas them out. First pass removed 77% of Linus sprite; even gentler pass left inner body holes.
- **Fix**: Deterministic Pillow+numpy threshold. `RGB ≥235 → alpha 0`, `RGB ≥200 → alpha 180` (soft edge). No AI involvement. ~50ms per sprite.
- **Lesson**: For CLEAN cartoon/illustration input with white backgrounds, manual luminance threshold beats AI matting. AI models trained on photos misread flat regions. Rule of thumb: if input is solid-color fills (not photograph textures), use threshold first; reach for AI rembg only when the background is textured/noisy.

### Result modal engine — 3-layer defense against contradictory success messages

- **Symptom**: User screenshot — result modal showed "Selesai!" + 1★ + "Sempurna! Tidak ada kesalahan!" + "Matematika Benar: 0" + enabled Level Berikutnya button — with zero correct answers.
- **Root causes** (compound): (1) `GameScoring.calc` returned 1 star even for zero correct (`else stars = 1`); (2) Caller G15 checked `wrongTaps === 0` but not `mathCorrect === 0` so zero-answers path took success branch; (3) `GameModal.show` forwarded caller-supplied title/msg verbatim with no sanity check.
- **Fix**: 3-layer defense. Layer 1: `GameScoring.calc` returns 0 when `correct <= 0`, allows 0★ through bonus path. Layer 2: `GameModal.show` normalizes 0-star state (force emoji 😞, title "Gagal! Coba Lagi", msg override if it contains success words). Layer 3: per-caller fix — 13 callers audited across 9 games, each now branches title/emoji/msg on actual star count.
- **Lesson**: Shared result modals need DEFENSE-IN-DEPTH. Any single layer can fail (engine bug, caller bug, ambiguous success criteria) — the visible UI should be the last-line guardrail that refuses to display contradictory state (e.g., "Sempurna" text with 0 stars). Add explicit sanity-check assertions at the UI boundary; when they fire, override to a safe fail-state rather than letting garbage render.

### Hybrid rendering: character sprites vs programmatic Graphics

- **Symptom**: G15 had a full parametric `PIXI.Graphics` locomotive builder (5 type-specific `drawBody()` functions). User wanted cartoon character trains that can't be expressed geometrically.
- **Root cause**: Mixing raster sprites + Graphics in the same container requires branching BEFORE existing type-dispatch, because container flip conventions differ (sprites face right natively after rembg; Graphics locomotives drawn facing left then mirrored via `scale.x=-1`).
- **Fix**: `buildTrain()` checks `selectedTrain.isCharacter` FIRST. Character: `scale.x=1` + `CharacterTrain.mount()`. Programmatic: `scale.x=-1` + existing dispatch. Instance tracked for tick + dispose on train swap.
- **Lesson**: When adding a new render paradigm to a dispatch-based system, encode it as a LEAF branch at the top of the dispatcher, not interleaved with existing cases. Document the invariants each paradigm assumes (anchor, flip, coordinate system).

### Mirror CSS clamp formula in JS runtime

- **Symptom**: CSS `--rz-scale` tokens give DOM games fluid scaling, but PixiJS games compute sizing independently → DOM navbar + Pixi sprite coexist at mismatched scales on resize.
- **Root cause**: No shared source of truth between CSS `clamp()` and JS sizing.
- **Fix**: `shared/rz-responsive.js` exposes `window.RZ.scale()` with the SAME formula: `Math.min(1, Math.max(0.7, 0.44 + innerWidth * 0.00175))`. PixiJS games call `RZ.btn('md')` / `RZ.fontScale(22)` for coherent sizing.
- **Lesson**: When a system has CSS-controlled AND JS-controlled visual elements on the same viewport, ship the JS variant as a direct mirror of the CSS formula (or vice versa). One source of truth prevents visual desync on resize/orientation-change.

---

## 2026-04-21 (Evening Session)

### Unified Scoring Engine — bonus-modifier pattern for non-accuracy games (Task #25)

- **Symptom**: `GameScoring.calc({correct, total, ...})` is designed for accuracy-based scoring (100%=5★, 85%=4★…). But three remaining games (G13 evolution, G13b kill-count, partly G17) use **threshold/progression** scoring where "correct/total" has no natural meaning. Naive migration (mapping kills to fake "correct") either drifted from legacy star distributions or required wrapper math that was uglier than the original ternary.
- **Root cause**: Accuracy scoring assumes a linear correct-answer → stars mapping. Survival games ("get 50 kills = 5★") have a piecewise-tier mapping, and progression games ("evolved twice = 5★, once = 4★, none = 3★") have a categorical mapping. Neither fits the accuracy contract cleanly.
- **Fix**: Use the `bonus` parameter as a delta from perfect. Call `GameScoring.calc({correct: 1, total: 1, bonus: tier - 5})` where `tier` is the legacy piecewise result (e.g., `s.kills >= 50 ? 5 : s.kills >= 30 ? 4 : ...`). The engine's internal clamp `min(5, max(1, stars + bonus))` gives back the tier verbatim (since base=5, 5+(tier-5)=tier, clamped). This preserves exact legacy star distribution AND routes through the unified entry point for future instrumentation (telemetry, tuning, A/B tests).
- **Lesson**: When migrating to a shared engine, **don't force every caller into the canonical parameter shape**. Provide a pass-through lane (here: `bonus`) that lets non-canonical callers join the unified code path without distorting their scoring semantics. The payoff: one chokepoint for all games (easy to swap algorithms, add analytics, or apply global balance tweaks), zero regression risk on existing balance. Applies to G13 (`bonus = evoLevel - 2`), G13b (`bonus = killTier - 5`), and any future game whose scoring is tier/threshold-based rather than ratio-based. Accuracy-first callers (G17 Jembatan, G18 Museum) still use the canonical `{correct, total}` shape directly.

### Auto-jump removed for direct control (G20)

- **Symptom**: User feedback on G20 Ducky Volley — "kontrol dan physics g smooth, pergerakan bola dan pemainnya... Jangan dikasih auto jump." Jumping felt non-deterministic; horizontal motion felt twitchy; ball arcs were abrupt.
- **Root cause**: Two hidden auto-jump paths fought the player. (1) `if(S.pGnd && S.bx<NET_X && S.bvy>0 && Math.abs(S.bx-S.px)<60 && S.by<GROUND_Y-40) S.jump=true` — an "assist" that auto-triggered jumps whenever a ball approached, regardless of player intent. (2) Every `touchstart` set `S.jump = true` (comment: "tap = jump") — so any drag-intended tap also fired a jump. Movement was hard-assigned (`S.pvx = ±spd`) instead of lerped, causing instantaneous direction flips with no easing. Ball physics had no air resistance — gravity-only arcs felt arcade-y.
- **Fix**: (a) Deleted the auto-jump assist line entirely. (b) Removed `S.jump = true` from `touchstart`; replaced with a swipe-up gesture (`_touchStartY - curY > 40` while `pGnd`, one-shot via `_swipeJumped` flag) plus a visible `#btn-jump` button on touch devices (72×72 yellow circle, bottom-right). (c) Converted horizontal movement to lerp: `S.pvx = S.pvx*0.78 + target*0.22` in both drag-drive and keyboard paths. Friction raised `0.88 → 0.86`. (d) Added rise damping `if(S.pvy<0) S.pvy*=0.985` for a gentler jump apex. (e) Ball: gravity multiplier `0.65 → 0.60`, plus air drag `bvx*=0.995^dt`, `bvy*=0.998^dt` for smoother arcs. Kept BGM, pause menu, scoring, and collision logic untouched.
- **Lesson**: "Assist" logic that writes input state (`S.jump = true`) on the engine's behalf is a trap. It turns deterministic input into probabilistic input — the player can never predict whether their next tap will cause a jump or a move. If you want to help the player, adjust **physics parameters** (wider hit window, more forgiving collision) or **timing** (buffered input, coyote time), but never synthesize input events. For movement feel, **always lerp** toward target velocity rather than hard-assigning it — the cost is one multiply-add per frame and the feel improvement is dramatic. Touch gestures for jump: swipe-up distance threshold (40px) + one-shot flag prevents rapid re-fire; always pair with an always-visible button for accessibility.

### Frame-rate-independent state transitions (train bablas)

- **Symptom**: G16 train occasionally blew through an obstacle without stopping — state never transitioned through `STOPPED`, so the 1.2s "stopped but no quiz" bablas-recovery guard (Task #34) never fired. Train kept moving past `WORLD_LENGTH+200` → `triggerDeath()` → freeze.
- **Root cause**: Three independent issues compounded. (1) The `maxStep` clamp had a `2px` floor — on dt spikes (tab-switch, slow device, GC pause), accumulated step could exceed the 2px floor and cross the obstacle in a single frame. (2) `speed*dt` was not capped — a 500ms dt spike at boost speed can teleport the train hundreds of pixels. (3) Once past the obstacle, `S.obstacles.find(o => !o.cleared && o.worldX > S.worldX - 10)` picked up the NEXT uncleared obstacle (not the missed one), so the state machine never tried to stop for it.
- **Fix**: 4-part defense. (a) Floor `2px → 0.2px`. (b) Hard clamp: if next step would cross `nextObs.worldX + 5`, snap `worldX = nextObs.worldX - 1` + force STOPPED + call `showQuizPanel` directly; never `+=` that step. (c) Absolute per-frame cap `Math.min(speed*dt, baseSpeed/2)` — no matter what `dt` is, train can't move more than half a base-second per frame. (d) Game-loop prologue scans for any uncleared obstacle at `worldX < S.worldX - 20` and rewinds the train — last-ditch recovery if (a–c) still miss.
- **Lesson**: Any "approach → stop at threshold" state transition must be defended at the STEP level, not the STATE level. State-based guards (STOPPED-no-quiz timer) only fire if the state was entered; if the transition was skipped entirely (because `dt*speed > distance`), no state-based guard will catch it. Cap `speed*dt` to a framerate-independent max, hard-clamp position on crossing, and add a recovery pass that detects "already past" conditions and rewinds. The 2px/0.2px lesson generalizes: threshold floors should be chosen from the rendering tolerance (sub-pixel), not from "feels safe" heuristics.

### Deterministic density vs randomized spacing

- **Symptom**: G16 had 3–4 mini-obstacles per station gap despite a random-spacing formula intended to produce ~3. User wanted 1–2.
- **Root cause**: `miniSpacing = 225 + Math.random()*150` gave an average of 300px, but station spacing is ~1210px → `floor(1210/300) = 4` minis per gap. Random-spacing formulas don't cap density; they sample a rate.
- **Fix**: Replaced with deterministic per-gap placement: iterate adjacent station pairs, place `maxMinisPerGap` minis evenly (`worldX + gap * m / (N+1)`). Difficulty scales via `{1:1, 2:2, 3:2, 4:2, 5:3}[level]`.
- **Lesson**: When a design calls for "1–2 items between anchors", iterate anchor pairs with a loop counter — never rely on random-rate spacing, which produces a distribution, not a guarantee. Random spacing is fine for aesthetic filler (dust, clouds); deterministic placement is required for gameplay-impacting items whose count matters.

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

### Low-alpha shoulder decorations read as random clutter (G6)

- **Symptom**: G6 player feedback — "melayang-layang di luar jalan kesannya acak" (shoulder emoji decorations feel like random floating junk outside the road). User specifically flagged it in dark mode. Docked engagement during gameplay.
- **Root cause**: `buildScenery` seeded 16 theme emoji (🌲/🌙/🏢/🌸/…) at `alpha 0.2-0.35`, placed on the canvas **outside** `roadLeft`/`roadRight`. Three compounding issues: (a) low alpha + dark background makes the symbols read as "ghost specks" — no clear semantic layer (foreground road ≠ background scenery); (b) random `x` placement across a wide shoulder band means the decorations don't anchor to any visual rhythm (unlike road signs, which spawn periodically at tuned intervals); (c) scroll speed 0.55× road speed gives parallax depth, but without clustering (trees-in-group, buildings-in-row), the eye reads each emoji as a stray glitch rather than "distant scenery".
- **Fix**: Removed the emoji-spawn loop entirely. Kept the empty `sceneryL`/`sceneryR` containers so the game-loop scroll tick (`bg._sceneryL.y += scrollAmt`) stays safe without null-check retrofits. Road signs — which spawn periodically INSIDE the canvas bounds and have clear semantic meaning (🛑/⚠️/🚦) — remain the only ambient road furniture.
- **Lesson**: Ambient decoration needs two properties to NOT read as clutter: (1) visual clustering so the eye groups it as "scenery" instead of "artifact" (rows of trees, strips of buildings — never isolated specks); (2) alpha high enough to be definitively present or absent, never "maybe there". Low alpha + isolated placement + outside-playfield location is the worst-case combo — the decoration becomes indistinguishable from a render bug. When in doubt, remove ambient scenery; it's cheaper to ship less than to tune more. Companion rule: when removing a feature wired to a game-loop tick, preserve the accessor refs as empty stubs rather than adding null checks at the call site — fewer branches, same safety.

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

### RDE migration: preserve non-size properties separately from token adoption (G8)

- **Symptom**: Naively replacing G8's base rules with `.rz-letter-btn` via HTML class composition would lose G8's unique visual identity — purple `border:3px solid #DDD6FE`, violet `box-shadow:0 4px 0 #7C3AED`, brand color, `:active` transform-scale, `.used` opacity state, and — critically — the Scrabble wooden-tile dark-theme overrides at `style.css:1691–1756` that depend on selector specificity `.g8-letter-btn` (not `.rz-letter-btn`).
- **Root cause**: RDE's Layer 2 classes (`.rz-letter-btn`) define size/shape/font tokens, but games carry per-game *theme* (colors, shadows, state modifiers, dark overrides). Swapping the class in HTML would decouple the theme from the element and require rewriting every `[data-theme="dark"] .g8-letter-btn` rule to use the shared class. HTML class changes also ripple to JS (`document.querySelectorAll('.g8-letter-btn')` in `game.js` would need a rename).
- **Fix**: Keep `.g8-letter-btn` / `.g8-slot` class names in HTML. Instead of class composition, do **token composition**: rewrite the G8 base rule to consume `--rz-btn-sm`, `--rz-font-title`, `--rz-radius-sm`, `--rz-gap-sm` inline, while preserving every border/shadow/color/transition. Then delete G8 entries from `@media` blocks — the tokens' `clamp()` handles fluid scaling. Preserve a small aspect multiplier where needed (`height: calc(var(--rz-btn-sm) * 1.18)` keeps the 44×52 slot ratio; `font-size: calc(var(--rz-font-title) * 1.05)` keeps the 24px vs 22px title-font ratio). `min-width: var(--rz-btn-sm)` on `.g8-letter-btn` prevents flex-wrap from collapsing a button below one-per-row at 320px.
- **Lesson**: RDE Layer 2 classes are an **opt-in primitive**, not a drop-in replacement. For games with established dark-theme selectors, state modifiers (`.active`, `.filled`, `.used`, `.celebrate`), or JS selectors, the safer migration is **token composition** (keep `.g<N>-*` class, replace hard-coded px with `var(--rz-*)`). Reserve class composition (`.rz-letter-btn .g<N>-accent`) for greenfield games. Also: when replacing a hard-coded dimension, preserve the **ratio** relative to the token's base (e.g., if the original was `52px` and the token's base is `44px`, multiply: `calc(var(--rz-btn-sm) * 1.18)`) — don't just snap to the token's base value or the visual changes uniformly across breakpoints. Finally: removing `@media` entries counts as a code-reduction win (3 breakpoints × 2 rules = 6 lines here), validating Layer 1's `clamp()` promise.

---

## Template for future entries

```
### <topic>
- **Symptom**:
- **Root cause**:
- **Fix**:
- **Lesson**:
```
