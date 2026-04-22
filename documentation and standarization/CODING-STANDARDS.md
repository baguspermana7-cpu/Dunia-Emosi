# Dunia Emosi — Coding Standards

---

## CSS Conventions

### Variables (always use, never hardcode)
```css
/* Colors */
var(--orange), var(--green), var(--blue), var(--purple), var(--pink)

/* Spacing */
var(--space-xs), var(--space-sm), var(--space-md), var(--space-lg), var(--space-xl)

/* Typography */
var(--font)      /* Nunito — body text */
var(--font-display)  /* Fredoka One — headings */

/* Effects */
var(--shadow), var(--shadow-lg), var(--radius), var(--radius-sm)
```

### Button Physics (ALWAYS use this pattern)
```css
.btn:active {
  transform: scale(0.93) translateY(4px) !important;
  box-shadow: 0 2px 0 rgba(0,0,0,0.15) !important;
}
```

### Animation Timing Functions
- Spring physics: `cubic-bezier(0.34, 1.56, 0.64, 1)` — for popups, card flips
- iOS modal: `cubic-bezier(0.32, 0.72, 0, 1)` — for screen transitions
- Ease out: `cubic-bezier(0, 0, 0.2, 1)` — for elements entering
- Bounce: `cubic-bezier(0.36, 0.07, 0.19, 0.97)` — for wobble effects

### World Background Pattern (per game screen)
```css
#screen-gameN {
  background: linear-gradient(180deg, [top-color], [mid-color], [bottom-color]);
}
/* Decorative elements: position absolute, pointer-events: none */
.g[N]-world-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
```

---

## JS Conventions

### Game Function Naming
```js
initGame[N]()     // Initialize game state + UI
nextG[N]Round()   // Advance to next question/round
exitGame()        // Return to menu (shared)
showResult()      // Show game over screen (shared)
```

### State Pattern
```js
// NEVER mutate state directly in complex ways
// Use simple assignment only
state.currentPlayer = 0
state.gameStars = [0, 0]

// Game-specific state: use prefixed variables
let g1State = { round: 0, answered: false }
let g4State = { ... }
```

### Content Data Arrays (naming)
```js
const EMOTIONS = [...]         // G1
const ANIMAL_LETTERS = [...]   // G3
const ANIMALS_G4 = [...]       // G4
const MATCH_PAIRS = [...]      // G5
const DRIVE_MAPS = [...]       // G6
const WORD_IMAGES = [...]      // G7 & G8
const TRACE_LETTERS = [...]    // G9
```

### Timer Management
```js
// ALWAYS clear timers on exitGame()
function clearTimers() {
  if (state.breatheInterval) { clearInterval(state.breatheInterval); state.breatheInterval = null; }
  if (state.g4Timer)         { clearInterval(state.g4Timer);         state.g4Timer = null; }
  if (state.driveRaf)        { cancelAnimationFrame(state.driveRaf); state.driveRaf = null; }
}
```

### Audio Pattern
```js
// Web Audio API only — no audio files
// Synthesized tones only
playCorrect()   // 4-note ascending arpeggio
playWrong()     // 2 descending sawtooth tones
playClick()     // Short sine blip
```

---

## HTML Conventions

### Screen IDs
```
screen-welcome
screen-mode
screen-names
screen-level
screen-menu
screen-game1 ... screen-game9
screen-result
```

### Game Header (shared structure)
```html
<div class="game-header">
  <button class="gh-back" onclick="exitGame()">←</button>
  <span class="gh-title">[ICON] [GAME NAME]</span>
  <span class="gh-player" id="gN-player-icon"></span>
  <span class="gh-stars" id="gN-stars">⭐ 0</span>
</div>
<div class="progress-bar-wrap">
  <div class="progress-bar-fill" id="gN-progress-bar" style="width:0%"></div>
</div>
```

### Feedback Overlay (shared, one instance)
```html
<div id="overlay-feedback">
  <div class="feedback-card">
    <span class="feedback-emoji" id="fb-emoji"></span>
    <div class="feedback-title" id="fb-title"></div>
    <div class="feedback-sub" id="fb-sub"></div>
    <div class="feedback-stars" id="fb-stars"></div>
    <button onclick="closeFeedback()">Lanjut! ➡️</button>
  </div>
</div>
```

---

## Responsive Display Engine (RDE)

> **Status**: DESIGN SPEC — implementation pending. Replaces per-game `@media` breakpoints.
> **Problem solved**: Inconsistent UI scaling across 22 games, duplicated narrow-screen CSS, letter-input & navbar going vertical on small devices.

### 3-Layer Architecture

**Layer 1 — CSS Design Tokens (`:root`)**
Fluid scaling via `clamp()` + viewport units. Single source of truth.

```css
:root {
  /* ── Fluid master scale (320px=0.7×, 480px+=1.0×) ── */
  --rz-scale: clamp(0.7, calc(0.44 + 0.175vw), 1);

  /* ── Button sizes (auto-scale) ── */
  --rz-btn-xs: calc(36px * var(--rz-scale));
  --rz-btn-sm: calc(44px * var(--rz-scale));  /* letter/choice */
  --rz-btn-md: calc(58px * var(--rz-scale));
  --rz-btn-lg: calc(76px * var(--rz-scale));  /* primary CTA */

  /* ── Typography (independent fluid) ── */
  --rz-font-xs:    clamp(11px, 2vw,  13px);
  --rz-font-sm:    clamp(13px, 2.3vw,15px);
  --rz-font-body:  clamp(14px, 2.5vw,17px);
  --rz-font-title: clamp(17px, 3.5vw,22px);
  --rz-font-h1:    clamp(22px, 5vw,  32px);
  --rz-font-hero:  clamp(28px, 7vw,  48px);

  /* ── Spacing ── */
  --rz-gap-xs: clamp(4px, 1vw, 8px);
  --rz-gap-sm: clamp(8px, 2vw, 12px);
  --rz-gap-md: clamp(12px, 3vw, 20px);
  --rz-gap-lg: clamp(20px, 4vw, 32px);

  /* ── Radii ── */
  --rz-radius-sm: clamp(8px, 1.5vw, 14px);
  --rz-radius-md: clamp(14px, 3vw, 22px);
  --rz-radius-lg: clamp(22px, 4vw, 32px);
}
```

**Layer 2 — Component Classes (consume tokens)**

```css
/* Reusable UI primitives — prefix rz- */
.rz-navbar      { display:flex;flex-wrap:nowrap;align-items:center;
                  gap:var(--rz-gap-sm);overflow:hidden;
                  padding:var(--rz-gap-sm) var(--rz-gap-md); }
.rz-navbar__title { flex:1;min-width:0;overflow:hidden;
                    text-overflow:ellipsis;white-space:nowrap;
                    font-size:var(--rz-font-title);font-weight:900; }

.rz-letter-row  { display:flex;flex-wrap:wrap;justify-content:center;
                  gap:var(--rz-gap-sm);max-width:100%; }
.rz-letter-btn  { width:var(--rz-btn-sm);height:var(--rz-btn-sm);
                  min-width:var(--rz-btn-sm); /* prevent <1 per row */
                  font-size:calc(var(--rz-font-title)*0.9);
                  border-radius:var(--rz-radius-sm); }

.rz-choice-grid { display:grid;gap:var(--rz-gap-sm);
                  grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
                  max-width:100%; }
```

**Layer 3 — JS Runtime (`shared/rz-responsive.js`)**

For PixiJS/Canvas games that need scale factor at runtime.

```js
window.RZ = {
  scale() { return Math.min(1, Math.max(0.7, 0.44 + innerWidth * 0.00175)) },
  bp()    { const w=innerWidth; return w<360?'xs':w<480?'sm':w<768?'md':'lg' },
  orient(){ return innerWidth > innerHeight ? 'landscape' : 'portrait' },
  onResize(fn){ const h=()=>fn(this); addEventListener('resize',h,{passive:true}); h(); return ()=>removeEventListener('resize',h) }
}
```

### Migration Plan (Sequential)

| Step | Target | Result |
|------|--------|--------|
| 1 | Add tokens to `style.css` `:root` | 0 visual change; tokens available |
| 2 | Build `rz-navbar` + `rz-letter-row` classes | Opt-in by game |
| 3 | Migrate G8 Susun Kata (highest pain) | Delete G8-specific `@media` rules |
| 4 | Migrate G3 Huruf Hutan | Delete G3-specific `@media` rules |
| 5 | Migrate remaining DOM games (G1,2,4,5,7,9) | Delete 60+ lines of `@media` |
| 6 | Ship `rz-responsive.js` + wire G14/G15/G16/G19/G20/G22 | Pixi games share scale factor |
| 7 | Document per-game overrides in CHANGELOG | Traceable |

### Non-Goals

- Do NOT replace existing per-game art-direction (G6 road perspective, G14 parallax — game-specific, not UI)
- Do NOT enforce for PixiJS world coordinates (Pixi has own resolution system)
- Do NOT break standalone games already deployed

### Naming Convention

- Prefix all shared tokens: `--rz-*`
- Prefix all shared classes: `rz-*`
- Per-game overrides stay in their existing `.g<N>-*` namespace
- Never inline arbitrary `px` for spacing/font — always token

### Example: Before vs After

**Before** (G8, 3 separate media queries — lines 516, 726, 827):
```css
.g8-letter-btn { width:52px;height:52px;font-size:24px; }
@media(max-width:480px) { .g8-letter-btn { width:46px;height:46px;font-size:21px; } }
@media(max-width:400px) { .g8-letter-btn { width:42px;height:42px;font-size:19px; } }
@media(max-width:360px) { .g8-letter-btn { width:38px;height:38px;font-size:17px; } }
```

**After**:
```css
.g8-letter-btn { /* uses .rz-letter-btn + .g8 accent */ }
```

Delete 4 lines, fluid scaling automatic.

---

## Battle Sprite Engine (BSE)

> **Status**: DESIGN SPEC — implementation pending (Task #30).
> **Problem solved**: Pokemon battle sprites in G10/G13/G13b/G13c have inconsistent facing direction (e.g., Staryu as enemy faces right instead of left toward player), duplicated sprite-loading cascades, ad-hoc tier scaling, manual scaleX(-1) sprinkled in CSS/JS.

### Goal: Single API for Battle Sprites

```js
BattleSprite.mount(document.getElementById('poke-enemy'), 'staryu', {
  role: 'enemy',      // 'player' | 'enemy' | 'wild'
  type: 'water',      // from POKEMON_DB
  anchor: 'top-right',// 'bottom-left' | 'top-right' | center
  animate: 'enter'    // 'enter' | 'faint' | null
})
```

### Responsibilities (5)

1. **Sprite source cascade — HD ONLY** *(mandate 2026-04-21, updated Task #37)*:
   - Order: **alt2 HD WebP (1025-set, local) → local SVG (751-set) → HD CDN raster (pokemondb official artwork, ~475×475)**.
   - **Primary source is now `assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug}.webp`** — 1025 Pokemon 630×630 RGBA, full Gen 1-9 coverage, all face RIGHT user-POV (= LEFT monitor-POV, matches BSE default `'L'`). Resolved by `pokeSpriteAlt2(slug)` in game.js.
   - **NEVER** use `/sprites/{slug}.png` (our local 96×96) or PokeAPI default 96×96 as primary — only as last-ditch offline fallback, and when used the engine MUST NOT add `image-rendering:pixelated` (killed in 2026-04-21 P0 fix).
   - Rationale: user explicitly mandated HD sprites across all battle games. Low-res 96px sprite is visually jarring against the HD gym backgrounds. alt2 fully covers Gen 8/9 previously fallback-only.
   - **Enforcement**: BSE constructor throws console warning if `<img>` `naturalWidth < 200` and falls back to next source in cascade.
   - Existing helper `pokeSpriteVariant()` (game.js ~5075) encodes the cascade: `pokeSpriteAlt2(slug) || pokeSpriteSVG(slug) || pokeSpriteCDN(slug)`. BSE wraps it, doesn't re-implement.

2. **Tier scale** — Uses `pokeTierScale(slug)` — 1.0× basic / 1.2× stage-1 / 1.3× stage-2 / 1.3× legendary. Already global (game.js:4993).

3. **Facing / orientation** *(new — solves Staryu bug)*:
   - Canonical table `POKE_FACING` (in `games/battle-sprite-engine.js` + mirrored in `game.js`):
     ```js
     POKE_FACING = {
       // Overrides for Pokemon whose natural HD art faces RIGHT (exceptions)
     }
     function facing(slug) { return POKE_FACING[slug] || 'L' }  // DEFAULT 'L'
     ```
   - **Default facing = 'L'** — empirically verified 2026-04-21 that Pokemondb HOME 3D renders face the viewer with slight LEFT bias. Pikachu, Staryu, most Gen 1-9 Pokemon are 'L' natural.
   - Desired facing per role: `player='R'`, `enemy='L'`, `wild='L'`.
   - Engine: `flipForRole(slug, role)` returns `'scaleX(-1)'` if `natural !== want`, else `'scaleX(1)'`.
   - Applied as inline `img.style.transform` — overrides any CSS `transform` on `#poke-player` / `#poke-enemy`.

4. **Type aura ring** — Uses `spawnTypeAura(el, type, dur)` (2026-04-21 P0.5 Fix C). Keep.

5. **Animation primitives** — `enter` (spawn fade+scale), `hit` (shake), `faint` (fade+sink). Reuse existing `pokeHitShakeFlip` keyframe. Engine auto-wraps to preserve `scaleX` sign.

### CSS Rewrite

Remove hardcoded `transform:scaleX(-1)` from `#poke-player` / `#poke-enemy` CSS. Engine sets it via inline style based on `role` + `source_facing`.

```css
/* Before (g13c line 34-35): ad-hoc */
#poke-player{transform:scaleX(-1)}
#poke-enemy{/* no transform */}

/* After: engine-managed */
.bse-sprite{--bse-flip:1;transform:scaleX(var(--bse-flip))}
/* keyframes consume var(--bse-flip) so hit-shake preserves facing */
```

### Dimension — Integrate with RDE

Sprite size = `base * pokeTierScale(slug) * clamp(0.7, rz-scale, 1)`.

Single formula; no more `width:min(140px,30vw)` sprinkled per-game.

### Migration Steps

1. Add `SPRITE_FACING` + `SPRITE_FACING_OVERRIDES` constants to `game.js` near `POKE_TIERS`.
2. Ship `games/battle-sprite.js` with `BattleSprite.mount()`.
3. Migrate G13c (acute Staryu bug) as pilot.
4. Migrate G13 → G13b → G10.
5. Delete duplicated sprite-load + facing code in each game.
6. Document per-Pokemon facing overrides as discovered.

### Acute Fix (Interim)

Before full migration, add to G13c inline CSS:
```css
#poke-enemy{transform:scaleX(-1)}  /* force enemy to face left */
```
…but this breaks Pokemon whose HD sprite is actually left-facing. **Proper fix requires engine.**

### Non-Goals

- Not for G22 catcher sprite (different mechanic — player-controlled catcher, not battle pair)
- Not for G19 flying birds (roster has manually-curated per-entry facing in `g19/*.gif`)

---

## Accessibility Checklist

- [ ] All icon-only buttons have `aria-label`
- [ ] All images have `alt` text
- [ ] Touch targets minimum 44×44px
- [ ] Focus visible rings: `outline: 4px solid var(--orange); outline-offset: 3px`
- [ ] Reduced motion: `@media (prefers-reduced-motion: reduce)` block
- [ ] High contrast: `[data-hc="on"]` CSS block
- [ ] `<html lang="id">` present
- [ ] Color never used alone to convey meaning (always + icon/animation)

---

## Performance Rules

- Use `will-change: transform` on animated elements (remove after animation)
- Particle pool: pre-create DOM nodes, don't create/destroy in animation loop
- Canvas: only for letter tracing (Game 9), avoid for other games
- `requestAnimationFrame` for driving game loop only
- All other animations: CSS transitions/keyframes (GPU composited)
- Image format: WebP for backgrounds, PNG for characters/icons

---

## Pokemon Assets Standard (added 2026-04-20)

### Sprite Tier Scaling — MANDATORY

All Pokemon sprites across Pokemon-based games (G10, G13, G13b, G13c, G22) MUST use
tier-based size scaling for visual consistency. Charizard (tier 3) should never
appear smaller than Eevee (tier 2).

| Tier | Meaning | Scale |
|------|---------|-------|
| 1 | Basic (e.g., Charmander, basic Eevee) | **1.0×** |
| 2 | 1st evolution (e.g., Charmeleon) | **1.2×** |
| 3 | 2nd evolution / final form (e.g., Charizard) | **1.3×** |
| 4 | Legendary (e.g., Mewtwo) | **1.3×** |

Use the global helper defined in `game.js` near POKEMON_DB:

```js
const scale = pokeTierScale(slug)  // returns 1.0 | 1.2 | 1.3
el.style.width = el.style.height = `calc(min(44vw, 22vh) * ${scale})`
```

**Data source**: `POKEMON_DB[].tier` field. Unknown slug → fallback 1.0×.

**Exemption**: G19 (Pokemon birds) has manually-curated `scale:X` per entry in its
roster — do not override with tier helper there.

### Type Key Convention — LOWERCASE ONLY

All Pokemon type-keyed maps (colors, emojis, SFX configs, FX configs) MUST use
lowercase keys to match `POKEMON_DB.type` field values:

```js
// ✅ CORRECT — matches POKEMON_DB.type='fire'
const TYPE_COLORS = { fire:'#f97316', water:'#38bdf8', grass:'#4ade80' }

// ❌ WRONG — lookup silently returns undefined → fallback to default color
const TYPE_COLORS = { Fire:'#f97316', Water:'#38bdf8' }
```

**Rationale**: Past regression (G10 hit effect, 2026-04-20) — `auraColors` map
used capitalized keys. Lookup always failed silently, falling back to purple.
Attack effects looked broken even though all other infrastructure was intact.

**Defensive pattern**: Normalize type at entry point of effect function:
```js
const typeLow = (type || '').toLowerCase()
const color = TYPE_COLORS[typeLow] || DEFAULT
```

### Attack Effect Chain — Standard (G10 pattern)

All Pokemon battle games SHOULD follow this 8-stage attack effect chain for
consistency:

1. `playAttackSound(type)` — type-specific audio cue
2. Aura ring on attacker wrapper (Pixi primary, DOM fallback `.g10-aura-ring`)
3. Move name popup (e.g., "Flamethrower!")
4. `atkSpr.classList.add('spr-atk')` — lunge keyframe animation
5. `g10TypeFX(type, toSide)` — type-specific particle burst at target
6. Projectile flight via `element.animate([...])` WAAPI
7. Screen type flash (`pixiTypeFlash` primary, `.poke-flash` CSS fallback)
8. `defSpr.classList.add('spr-hit', 'spr-flash')` — defender shake + white flash

Timing: ~700ms total. Attacker lunge starts immediately, projectile hits at 340ms,
defender shake completes at 790ms. Adjust `onDone` callback timing if extending.

---

## Battle Standards — 5 Invariants (added 2026-04-21)

All Pokemon battle games (**G10, G13, G13b, G13c**) MUST guarantee these five invariants. They are a contract — regressions count as bugs.

1. **Typed projectile**: attack projectile emoji/color matches the attack's type (and by extension the attacker's type, since attackers use same-type moves). Use `TYPE_EMOJI` / `TYPE_PROJ` maps — never hardcode.
2. **Hit FX on defender by ATTACKER type**: when the projectile lands, the particle burst on the defender's sprite zone is keyed to the attacker's type. Canonical helper: `g13TypeHitFX(type, onEnemy)` (covers 18 types). G10 uses `g10TypeFX(type, targetSide)` which now also has 18-type DOM-fallback parity.
3. **Attacker aura**: during wind-up the attacker sprite emits a type-colored aura ring. Canonical DOM helper: `spawnTypeAura(el, type, dur)` at `game.js:5022`. Pixi path still works where available (`pixiAuraRing`). G13c has an inline `addAura(el, type)` using the `--aura-color` CSS var.
4. **HD sprites**: primary source = local SVG (when ≤ 751 coverage) → HD CDN (`img.pokemondb.net/sprites/home/normal/{slug}.png`) → low-res local PNG only as offline fallback. Never load `assets/Pokemon/sprites/{slug}.png` as the first try. Canonical helpers: `pokeSpriteVariant(slug)` (game.js) and `SPRITE_HD(slug)` / `SPRITE_LOCAL(slug)` (g13c). **Both `loadSprHD` (enemy) and `loadSprPlayer` (player) MUST follow this same cascade order** — drift between them caused the 2026-04-21 Fuecoco regression (low-res PokeAPI sprites face the opposite direction, breaking the `scaleX(-1)` enemy-facing assumption).
5. **Tier-proportional size**: basic=1.0× / 1st evo=1.2× / 2nd evo=1.3× / legendary=1.3×. Canonical helper: `pokeTierScale(slug)` in `game.js`; g13c has an inline `POKE_TIER` map + its own `pokeTierScale(slug)`. Apply at every sprite-load site + every evolution-form swap.
6. **Scoring via `GameScoring.calc()`** (invariant added 2026-04-21): No battle game may hardcode star logic. All must feed per-battle signals (accuracy/HP%, wrong-answer count, lives alive) into `games/game-modal.js:GameScoring.calc({correct,total,wrong,lives,maxLives})`. Cumulative-save metrics (badges collected, total wins, etc.) MUST NOT drive the per-battle star count — that mistake caused the G13c regression where the first win always rated 1★.

### Canonical type-color palette

`POKE_TYPE_COLORS` at `game.js:5014` — lowercase keys, all 18 types. Access via `pokeTypeColor(type)` (handles capitalized input). Prior duplicate inline maps in G10 (line ~5639), G13 (~7411), and G13b (~8098, ~8121) have been consolidated.

### Do NOT

- Hardcode type→color maps inline. Use `pokeTypeColor()`.
- Use `image-rendering: pixelated` on HD raster sprites (kills perceived resolution).
- Assign `.evolved` / `.evolved2` CSS classes with `transform: scale(...)` — tier scaling is JS-driven via `pokeTierScale(slug)` inline style.

## Image Asset Standard — Gemini → WebP (added 2026-04-21)

Any image produced by the Gemini API MUST land on disk as a compressed WebP. **Never commit the raw PNG** output from Gemini — it blows up asset size and slows page loads. Enforced via the helper `scripts/gemini-image-gen.py`.

### Rules

- **Format**: WebP, quality 82, method 6 (max compression effort), max width 1200px.
- **API key**: `GEMINI_API_KEY` env var at runtime. NEVER commit a key to the repo — the 2026-04-21 public-flip required a `git filter-repo` history rewrite because an older session had committed one.
- **Prompts**: stored under `prompts/<asset-name>.txt`. Long prompts stay reviewable + diff-able; invocation stays short.
- **Invocation**:
  ```bash
  cd /home/baguspermana7/rz-work/Dunia-Emosi
  export GEMINI_API_KEY='<paste at runtime; never commit>'
  python3 scripts/gemini-image-gen.py \
    --prompt-file prompts/banner-game17.txt \
    --out assets/banner-game17.webp
  ```
- **Script guarantees**: raw PNG is held in memory only; only the WebP is written. Exit code non-zero on any failure.

### Where this applies

- Banners (`assets/banner-game{1..22}.webp`) — all regenerated this way going forward.
- Character sprites (`assets/leo-*.webp`, `assets/poke-*.webp`, etc.).
- Backgrounds (`assets/bg-*.webp`) — though for these, the existing `process-images.py` drop-and-process flow still applies when assets are sourced manually.

### History

- Rule added after the user observed PNG commits bloating the repo and slowing Vercel first-paint.
- The existing `process-images.py` already enforces WebP for the drop-and-process workflow; this new standard extends the same rule to direct Gemini API calls.

## Position-Deterministic State Machines (added 2026-04-22)

**Used in**: G16 Selamatkan Kereta (train game).

### Principle

Game-state transitions in complex physics-based games MUST be driven by **positional checkpoints** or **frame counters**, never `setTimeout`. This ensures deterministic behavior across all devices, framerates, and pause states.

### Pattern

**Anti-pattern** (❌ WRONG):
```js
function triggerArrival() {
  trainState = 'ARRIVING'
  setTimeout(() => {
    trainState = 'ARRIVED'
    showWin()
  }, 2000)  // FRAGILE — breaks on dt spikes, pause, or framerate variance
}
```

**Correct pattern** (✅ RIGHT):
```js
const CELEBRATION_FRAMES = 120  // ~2s @ 60fps

// State machine driven by position
if (trainState === 'ARRIVING') {
  // Brake curve until snap distance
  if (worldX <= ARRIVAL_SNAP_DIST) {
    worldX = STATION_X  // snap to destination
    trainState = 'ARRIVED'
    celebrationFrame = 0
  }
}

// Frame counter in ARRIVED state
else if (trainState === 'ARRIVED') {
  celebrationFrame += dt * 60  // dt-independent
  if (celebrationFrame >= CELEBRATION_FRAMES && !winShown) {
    showWin()
    winShown = true
  }
}
```

### Key Invariants

1. **State transitions keyed to POSITION or FRAME COUNT** — not elapsed time.
2. **Frame counters multiplied by `dt*60`** — makes them frame-rate independent.
3. **Positional checkpoints use world coordinates** — snap when `worldX ≤ threshold`.
4. **Pause-safe** — ticker pause stops both position updates and frame accumulation.
5. **No setTimeout for state changes** — only for UI animations (modals, effects) that don't affect game state.

### When to Use

- **Position-deterministic**: Train arriving at station, obstacle collision, boundary crossing.
- **Frame-counter**: Celebration delay, visual animation timing, state dwelling (hover before next action).
- **Do NOT use setTimeout**: Game-critical transitions (movement, collision, win conditions).

### Related Documentation

See `docs/CODEMAPS/g16-state-machine.md` for full state diagram + code examples.

---

## Documentation Workflow — MANDATORY (added 2026-04-20)

**Every fix, new pattern, or convention MUST be documented in BOTH places:**

1. `TODO-GAME-FIXES.md` (project root) — add to current session's ✅ COMPLETED block
2. This file (`CODING-STANDARDS.md`) — add a new section if it's a repeatable pattern

**Why**: User mandate. Past issue — fixes silently applied were forgotten and
users had to re-request. Source of truth prevents regression.

**Cross-reference**: `~/.claude/.../feedback_always_document.md` enforces this at
future session start.
