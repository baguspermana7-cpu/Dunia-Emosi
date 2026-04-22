# Dunia Emosi — Codemap Index

**Last Updated:** 2026-04-22  
**Project:** 22+ game modules for ages 5-10, Flutter educational gaming platform.

---

## Overview

This directory contains architectural codemaps for the major subsystems in Dunia Emosi. Each codemap documents the data flow, key modules, API contracts, and invariants for a specific area.

---

## Codemaps

### [G16 Selamatkan Kereta State Machine](./g16-state-machine.md)
**File**: `games/g16-pixi.html`  
**Purpose**: Main railway adventure game with obstacle course + positional-deterministic arrival.  
**Key Insight**: All game-state transitions are driven by positional checkpoints or frame counters — zero setTimeout for state changes.

### [Character Train Engine API](./character-train-engine.md)
**File**: `games/train-character-sprite.js`  
**Purpose**: Shared sprite renderer for Casey/Linus/Dragutin/Malivlak with responsive scaling.  
**Key Insight**: `scaleConfig(cfg, s)` enables viewport-driven responsive dimensions.

### [Responsive Design Engine (RDE)](./responsive-design-engine.md)
**File**: `shared/rz-responsive.js`  
**Purpose**: Runtime viewport-scale utilities for PixiJS games and DOM UI.  
**Key Insight**: Two scales — `RZ.scale()` (CSS UI, capped at 1.0) vs `RZ.trainScale()` (world sprites, scales down to 0.55).

---

## Quick Reference — Architecture Layers

```
┌─────────────────────────────────────┐
│  Games (G1-G22)                     │
│  ├─ DOM games (G1, G2, G3, ...)     │
│  ├─ Pixi games (G6, G13c, ...)      │
│  └─ Hybrid (G15, G16, G20, ...)     │
└──────┬──────────────────────────────┘
       │
┌──────▼──────────────────────────────┐
│  Shared Libraries                   │
│  ├─ game.js (Pokemon DB, helpers)   │
│  ├─ train-character-sprite.js       │
│  ├─ game-modal.js (GameScoring)     │
│  ├─ rz-responsive.js (RDE)          │
│  └─ shared/*.js (utilities)         │
└──────┬──────────────────────────────┘
       │
┌──────▼──────────────────────────────┐
│  Assets                             │
│  ├─ Pokemon (751 SVG + 1025 HD WebP)│
│  ├─ Gym badges (46 WebP)            │
│  ├─ Character trains (4 WebP)       │
│  └─ Backgrounds + effects           │
└─────────────────────────────────────┘
```

---

## Entry Points by Game Type

### PixiJS Games (Render loop driven)
- **G6**: Drive path navigation (parallax)
- **G13c**: Pokemon battle (gym badge collection)
- **G14**: Motion tween sprite animator
- **G15**: Lokomotif Pemberani (character train + letter matching)
- **G16**: Selamatkan Kereta (character train + obstacle course) ← **State machine documented**
- **G19**: Pokemon flying birds (sprite animation + drag)
- **G20**: Match pairs (Pixi cards)
- **G22**: Candy matcher (Pixi grid)

### DOM Games (Event-driven)
- **G1**: Emotions carousel
- **G2**: Emotional situations matching
- **G3**: Animal letter matching (letter-grid)
- **G4**: Letter recognition (letter-scroll)
- **G5**: Memory pairs (card flip)
- **G7**: Word-image matching
- **G8**: Susun Kata (word unscramble)
- **G9**: Letter tracing (canvas)
- **G10**: Pokemon battle (classic DOM)
- **G11**: Tangram puzzle solver
- **G12**: Suara Benda (sound matching)
- **G13**: Pokemon battle (detailed DOM)
- **G13b**: Pokemon battle (team roster)
- **G17**: Jembatan Goyang (bridge crossing)
- **G18**: Balloon pop (drag + collision)
- **G21**: Animal sound memory

---

## Related Documentation

- **[CHARACTER-TRAIN-SPEC.md](../documentation%20and%20standarization/CHARACTER-TRAIN-SPEC.md)** — 4 trains: Casey, Linus, Dragutin, Malivlak. Calibration + responsive scaling formula.
- **[CODING-STANDARDS.md](../documentation%20and%20standarization/CODING-STANDARDS.md)** — JS/CSS conventions, state patterns, timer management, battle invariants.
- **[CHANGELOG.md](../documentation%20and%20standarization/CHANGELOG.md)** — Session-by-session fixes + feature log.
- **[TODO-GAME-FIXES.md](../../TODO-GAME-FIXES.md)** — Pending issues + completion status.

---

## Key Principles

1. **Position-Deterministic State Machines** — Use frame counters or positional checkpoints, never `setTimeout` for state transitions.
2. **Responsive Scaling** — Separate concerns: `RZ.scale()` for CSS UI, `RZ.trainScale()` for world sprites.
3. **Single Source of Truth** — Character train configs synced between `trains-db.js` (G15) and `G16_CHAR_CONFIGS` (G16 inline).
4. **Asset HD-First** — Pokemon sprites: alt2 HD WebP (1025) → SVG (751) → HD CDN → low-res fallback. Never start with low-res.
5. **Immutable Scaling** — `CharacterTrain.scaleConfig()` returns new config, never mutates input.

