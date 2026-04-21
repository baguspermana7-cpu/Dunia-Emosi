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
4. **HD sprites**: primary source = local SVG (when ≤ 751 coverage) → HD CDN (`img.pokemondb.net/sprites/home/normal/{slug}.png`) → low-res local PNG only as offline fallback. Never load `assets/Pokemon/sprites/{slug}.png` as the first try. Canonical helpers: `pokeSpriteVariant(slug)` (game.js) and `SPRITE_HD(slug)` / `SPRITE_LOCAL(slug)` (g13c).
5. **Tier-proportional size**: basic=1.0× / 1st evo=1.2× / 2nd evo=1.3× / legendary=1.3×. Canonical helper: `pokeTierScale(slug)` in `game.js`; g13c has an inline `POKE_TIER` map + its own `pokeTierScale(slug)`. Apply at every sprite-load site + every evolution-form swap.

### Canonical type-color palette

`POKE_TYPE_COLORS` at `game.js:5014` — lowercase keys, all 18 types. Access via `pokeTypeColor(type)` (handles capitalized input). Prior duplicate inline maps in G10 (line ~5639), G13 (~7411), and G13b (~8098, ~8121) have been consolidated.

### Do NOT

- Hardcode type→color maps inline. Use `pokeTypeColor()`.
- Use `image-rendering: pixelated` on HD raster sprites (kills perceived resolution).
- Assign `.evolved` / `.evolved2` CSS classes with `transform: scale(...)` — tier scaling is JS-driven via `pokeTierScale(slug)` inline style.

## Documentation Workflow — MANDATORY (added 2026-04-20)

**Every fix, new pattern, or convention MUST be documented in BOTH places:**

1. `TODO-GAME-FIXES.md` (project root) — add to current session's ✅ COMPLETED block
2. This file (`CODING-STANDARDS.md`) — add a new section if it's a repeatable pattern

**Why**: User mandate. Past issue — fixes silently applied were forgotten and
users had to re-request. Source of truth prevents regression.

**Cross-reference**: `~/.claude/.../feedback_always_document.md` enforces this at
future session start.
