# Type-Effectiveness System Standard

**Status**: Active (shipped 2026-05-04, commits b91c27a → 58abc2b)
**Module**: `games/data/poke-type-chart.js`
**Tests**: `node scripts/test-type-chart.js` (128 cases)
**Audit**: `python3 scripts/audit-pokemon-types.py` (regression catcher)

---

## Purpose

Teach Pokemon type matchups to kids aged 5-10 through **in-context visual cues**, without menus, tutorials, or memorisation drills. Kids learn by repeated exposure during normal play.

The system spans **4 battle games**: G10 (Pokemon battles), G13 (evolution), G13B (legendary catch), G13C (gym ladder).

---

## Kid-friendly multiplier table

The system maps canonical Pokemon Gen 6+ relationships to **softer multipliers** so wins/losses feel less brutal:

| Canonical Pokemon | Dunia-Emosi | Meaning | UI signal |
|-------------------|-------------|---------|-----------|
| 2.0× (super-effective) | **1.5×** | strong advantage | ✨ Super Efektif! (green bouncy text) |
| 1.0× (neutral) | **1.0×** | normal damage | (no text — anti-spam) |
| 0.5× (resisted) | **0.75×** | mild penalty | 💧 Kurang Efektif… (gray smooth text) |
| 0× (immune) | **0.5×** | very weak (NEVER zero — kid still does *something*) | 💢 Sangat Lemah… (red text) |

Plus the canonical **Same-Type Attack Bonus (STAB)**:
- Pokemon using a move of its own type: **×1.25**
- Combined max: super-effective + STAB = 1.5 × 1.25 = **1.875×** (rounded to integer HP)

---

## 10 visual guidance layers

All layers are **in-context** — they appear where the action happens. Zero menus. Zero tutorials. Pure pattern recognition.

| # | Layer | Where | When | Trigger by |
|---|-------|-------|------|-----------|
| 1 | **Weakness sticker** | Under enemy HP bar | Every turn | `renderWeaknessSticker(el, defType)` |
| 2 | **Move button auto-glow** (G13C) | Move buttons | Each fight-menu open | `getMoveEffectivenessClass(atk, def)` |
| 3 | **Floating hit text** | Above defender on hit | Every super or weak hit | `spawnEffectivenessText(el, mult)` |
| 4 | **Educational first-hit hint** | Top of screen | Once per type-pair per session | `spawnFirstTimeHint(el, atk, def)` |
| 5 | **Bag counter-strong highlight** | G13B bag picker | Bag open | `_partyMarkCounters` in game.js |
| 6 | **Bag counter-weak warning** | G13B bag picker | Bag open | same |
| 7 | **Trainer reveal hint** (G13C) | Enemy reveal message | Battle start + enemy swap | inline in `startBattle()` |
| 8 | **Type emoji name prefix** (G13C) | HP card labels | Every HP update | `typeEmojiPrefix(type)` |
| 9 | **STAB damage bonus** | All 4 games | Every attack | `calcStab(moveType, atkType)` |
| 10 | **Smart enemy AI** (G13C) | Enemy move pick | Enemy turn | 70% optimal / 30% random |

### Combined teaching loop (G13C example)

```
1. Trainer appears: "Misty mengeluarkan Starmie! (🎯 Counter: ⚡ 🌿)"
2. Kid taps Fight menu
3. Thunderbolt button glows green ✨ (auto-eff class)
4. Kid taps Thunderbolt
5. Hit lands: "✨ Super Efektif!" floats up, +damage 1.875×
6. First time only: golden popup "💡 Listrik mengalahkan Air!"
7. After ~20 battles: kid prediction-tests without reading hints
```

---

## Public API (`window.*`)

All exported on `window` by the IIFE at bottom of `poke-type-chart.js`:

### Math
- **`calcTypeMult(attackerType, defenderType): number`** — main effectiveness call. Returns 1.5, 1, 0.75, or 0.5. Case-insensitive, trims whitespace, gracefully returns 1 for invalid/missing types.
- **`calcStab(moveType, attackerType): number`** — returns 1.25 if same type, 1 otherwise.
- **`calcFullMult(moveType, attackerType, defenderType): number`** — combined `stab × eff`.

### Lookups
- **`getWeaknesses(defType, max=2): string[]`** — top-N attacker types whose moves are super-effective vs `defType`. Used by weakness sticker + trainer hints.
- **`getResistances(defType, max=2): string[]`** — attacker types whose moves are resisted by `defType` (semantic opposite).
- **`getMoveEffectivenessClass(atkType, defType): 'super-eff' | 'resist-eff' | ''`** — for G13C move button styling.
- **`typeEmojiPrefix(type): string`** — single emoji for any of 18 canonical types (fire→🔥 etc.). Returns ⚪ for unknown.

### Token maps
- **`TYPE_EMOJI`** — `{fire:'🔥', water:'💧', ...}` for all 18 types
- **`TYPE_COLOR`** — `{fire:'#fb923c', water:'#60a5fa', ...}` (matches G13C inline CSS palette)
- **`TYPE_LABEL_ID`** — `{fire:'Api', water:'Air', ...}` (Indonesian labels)

### UI helpers
- **`renderWeaknessSticker(container, defType): HTMLElement`** — appends `.weakness-sticker` chip. Empty render if no weakness (no "Seimbang" fallback — kids 5-10 don't know the word).
- **`spawnEffectivenessText(targetEl, mult): void`** — floating "Super Efektif!" / "Kurang Efektif…" text. Auto-cleanup at 1.4s. Concurrent cap = 2 (anti pile-up).
- **`spawnFirstTimeHint(targetEl, atkType, defType): void`** — once-per-pair golden popup. Race-safe (in-memory Set + sessionStorage).
- **`playEffectivenessSfx(mult): void`** — short tone cue (sine-wave; subject to future replacement per design review).
- **`applyHitFeedback(targetEl, atkType, defType): number`** — combined call: text + sfx + first-time hint. Returns the multiplier for caller's use.
- **`findCounters(pool, defType, max=3): {pokemon, index, mult}[]`** — for bag picker / pre-battle hints.
- **`getCounterHintHTML(defType): string`** — produces "🎯 Counter: 💧 ⚡" HTML chip.

---

## Damage calc per game

All games follow the same pattern: `Math.max(1, Math.round(baseDamage × calcFullMult(...)))`.

| Game | Base damage | Notes |
|------|------------|-------|
| **G10** | 1 (max HP 3-4 per level) | Resist & neutral both round to 1; super rounds to 2 — visual differentiation via floating text |
| **G13** | `s.cfg.damage` (2-5 per level) | Higher base means resist/super/neutral all visibly differ |
| **G13B** | 1 (player) / 1 or 2 (wild, legendary doubles) | Same as G10 — visual signal is primary |
| **G13C** | `30 + random(10)` | High base, full visible scaling. STAB applied inline in `calcDmg()` |

### G10/G13/G13B auto-attack pattern

Auto-attack games don't have separate move types — the attacker's type IS the move type. STAB always applies:
```js
calcFullMult(pokemonType, pokemonType, defenderType)
```

### G13C select-move pattern

Player picks move from `ep.moves[]` array. Move has its own `type`:
```js
calcFullMult(move.type, attackerPokemon.type, defenderPokemon.type)
```

STAB triggers only when `move.type === attackerPokemon.type`.

---

## CSS classes & tokens

CSS lives in two places (mirror each other):
- `style.css` — main app
- `games/g13c-pixi.html` `<style>` block — standalone G13C

### Weakness sticker
```css
.weakness-sticker { font: 12px / 1.2 var(--font-fredoka); color:#fcd34d; bg:rgba(0,0,0,0.4); border:1px solid rgba(252,211,77,.35); border-radius:10px; padding:3px 8px; }
.weakness-sticker .ws-icon { font-size:16px; filter:drop-shadow(0 0 4px rgba(252,211,77,.45)); }
```

### Effectiveness floating text
```css
.eff-text { position:fixed; z-index:9000; font-family:Fredoka One; pointer-events:none; }
.eff-text.eff-super  { color:#22c55e; animation: effSuperRise 1.2s cubic-bezier(.34,1.56,.64,1) forwards; }
.eff-text.eff-resist { color:#cbd5e1; animation: effSmoothRise 1.2s ease-out forwards; }
.eff-text.eff-immune { color:#f87171; animation: effSmoothRise 1.2s ease-out forwards; }
```

### Move buttons (G13C)
```css
.move-btn.super-eff  { border:2px solid #22c55e !important; box-shadow:0 0 12px rgba(34,197,94,.55); animation: moveSuperPulse 1.6s ease-in-out infinite; }
.move-btn.super-eff::before { content:'✨'; font-size:16px; text-shadow:0 0 6px rgba(255,255,255,.7); }
.move-btn.resist-eff { opacity:.78; border:2px dashed #f59e0b !important; }
.move-btn.resist-eff::before { content:'💤'; font-size:14px; }
```

### Bag tiles
```css
.bag-tile.counter-strong { border:2px solid #22c55e !important; box-shadow:0 0 12px rgba(34,197,94,.55); animation: bagTilePulse 1.8s ease-in-out infinite; }
.bag-tile.counter-strong::after { content:'🎯'; bg:#fff; border-radius:50%; }
.bag-tile.counter-weak   { opacity:.78; border:2px dashed #f59e0b !important; }
.bag-tile.counter-weak::after { content:'🛡'; bg:#fff; border-radius:50%; }
```

### Educational first-hit hint
```css
.eff-learn-hint { position:fixed; top:8%; left:50%; bg:linear-gradient(160deg,#fef3c7,#fde68a); border:3px solid #f59e0b; border-radius:18px; font:15px/1.25 Fredoka One; color:#78350f; box-shadow:0 12px 32px rgba(0,0,0,.35), 0 0 0 2px rgba(139,92,246,.18); flex-wrap:wrap; text-align:center; }
```

---

## Standards & rules (DO / DON'T)

### DO
- ✅ Use `calcFullMult` instead of separate `calcTypeMult` + `calcStab` when both are available
- ✅ Always pass attacker's type as moveType in auto-attack games
- ✅ Verify Pokemon types against canonical primary using `audit-pokemon-types.py` before merging Pokemon-data changes
- ✅ Run `test-type-chart.js` before any change to `poke-type-chart.js`
- ✅ Mirror CSS between `style.css` and `g13c-pixi.html` inline `<style>`
- ✅ Keep multiplier values fixed at 1.5 / 1.0 / 0.75 / 0.5 (changing breaks unit tests + balance)

### DON'T
- ❌ Don't add full immune (0×) — always at least 0.5 for kid-friendliness
- ❌ Don't change move-button colors via raw CSS — use `getMoveEffectivenessClass()` helper
- ❌ Don't bypass the cap by spawning `eff-text` directly — use `spawnEffectivenessText()` which caps concurrent nodes
- ❌ Don't render "Seimbang" fallback text — kids 5-10 don't know the word
- ❌ Don't override `pointer-events` on `.gr-overlay.show` (would break dual click+pointerdown binding)
- ❌ Don't grayscale resist-eff / counter-weak tiles — softens to opacity .78 + amber dashed (drop grayscale entirely)

### THEMATIC OVERRIDES (intentional exceptions to canonical)

Some Pokemon are declared with a NON-primary type for game-design coherence. These pass through the audit script's `THEMATIC_EXCEPTIONS` list:

| Pokemon | Code says | Canonical primary | Why kept |
|---------|-----------|-------------------|----------|
| Pidgey / Pidgeotto / Pidgeot / Doduo / Noctowl | flying | normal (Normal/Flying) | "Flying gym" theme integrity outweighs accuracy |
| Tyranitar | dark | rock | Pokemon fan culture associates Tyranitar with dark |
| Blaziken / Infernape / Emboar | fighting | fire | Starter evos shown as their secondary type for visual identity |
| Hydreigon / Flygon | dragon | dark / ground | Dragon affinity dominates the design |
| Sneasel / Weavile | ice | dark | Originally ice-themed in early Gen 2 lore |

These are documented choices, NOT bugs. Future Pokemon additions should canonical-primary by default.

---

## Testing & audit pipeline

### Pre-commit checks (manual)
```bash
# 1. Math sanity (128 cases)
node scripts/test-type-chart.js
# Expected: "All tests passed."

# 2. Pokemon data accuracy
python3 scripts/audit-pokemon-types.py --ignore-thematic
# Expected: only known exceptions remain (Tyranitar, Blaziken family, etc.)

# 3. Browser smoke test
# Open https://baguspermana7-cpu.github.io/Dunia-Emosi/?reset=sw
# - G10: super-effective hit produces "✨ Super Efektif!" floating text
# - G13B: bag picker shows 🎯 + 🛡 on counter Pokemon
# - G13C: move button auto-glows green vs current enemy
# - G13C: first super-effective hit shows "💡 X mengalahkan Y!"
```

---

## Historical bugs solved

| Date | Symptom | Root cause | Commit |
|------|---------|-----------|--------|
| 2026-05-04 | Browser hangs on G23/G24 launch | `_wrongs()` infinite loop — `set.size`-based formula produces duplicates | 410597c |
| 2026-05-04 | G13C win modal stuck (clicks dead) | z-index 500 < pause-overlay 9999 → stale overlay swallows clicks | b91c27a |
| 2026-05-04 | Weedle shows pixelated despite HD file existing | Sprite cascade raced ALL urls; tiny SVG (10 KB) always beat HD WebP (500 KB) | cc319f1 |
| 2026-05-04 | 102 Gen 9 Pokemon show as non-HD | HD WebP never downloaded for IDs 924-1025 | 958748b |
| 2026-05-04 | 17 Pokemon listed with wrong type (Lucario `steel`, Empoleon `steel`, ...) | Themed-gym contamination — secondary type used as primary | 734501d |

---

## Lessons reinforced

- **L103** defer + inline IIFE = brittle on mobile — never deferred when inline scripts depend
- **L104** PWA cache amplifies stochastic bugs into deterministic hangs
- **L107** Modal stuck = patch z-index + pointer-events + tap binding together
- **L108** Always audit class-wide after any infinite-loop fix
- **L109** Sprite race cascade prefers smallest, not best quality
- **L110** Themed-gym contamination produces wrong Pokemon types

Full text: `LESSONS-LEARNED.md`.
