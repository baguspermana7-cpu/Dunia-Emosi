# Responsive Design Engine (RDE) — Codemap

**Last Updated:** 2026-04-22  
**File**: `shared/rz-responsive.js` (~50 lines)  
**Purpose**: Runtime viewport-scale utilities for PixiJS games (world coordinates) and DOM UI (CSS).

---

## Overview

RDE provides two independent scale factors:
1. **`RZ.scale()`** — For DOM UI and PixiJS text overlays. Capped at 1.0; never shrinks below 0.7.
2. **`RZ.trainScale()`** — For game world sprites (trains, characters). Scales from 0.55 to 1.0 based on viewport height.

**Why two scales?** Game world objects (trains) are anchored to world coordinates and should shrink proportionally on mobile. DOM UI (buttons, navbars) should stay readable and have minimum touch targets.

---

## API Reference

```js
window.RZ = {
  scale(),           // CSS UI scale: 0.7x to 1.0x
  trainScale(),      // World sprite scale: 0.55x to 1.0x
  bp(),              // Breakpoint: 'xs' | 'sm' | 'md' | 'lg'
  orient(),          // Orientation: 'landscape' | 'portrait'
  onResize(fn)       // Register resize listener (returns unsubscribe)
}
```

---

## `RZ.scale()`

**Returns a CSS UI scale factor for responsive DOM sizing.**

```js
const scale = window.RZ.scale()
element.style.fontSize = `${16 * scale}px`
```

### Formula

```js
Math.min(1, Math.max(0.7, 0.44 + innerWidth * 0.00175))
```

### Scaling Table

| Viewport Width | Scale |
|---|---|
| 320px (mobile min) | 0.70 |
| 480px (mobile) | 0.84 |
| 768px (tablet) | 1.00 |
| 1024px+ (desktop) | 1.00 |

### Usage Pattern

```js
// In PixiJS game (for text overlays)
const scale = window.RZ.scale()
titleText.scale.set(scale, scale)

// In DOM (for buttons)
button.style.padding = `${16 * scale}px`

// NOT for game world sprites (use trainScale instead)
```

### Key Property

- **Capped at 1.0**: Large viewports never scale up (preserves font readability on 4K displays)
- **Minimum 0.7**: Small viewports capped to 70% to keep UI interactive
- **Width-driven**: Responsive to horizontal space (best for touch button sizing)

---

## `RZ.trainScale()`

**Returns a world-coordinate scale factor for game sprites (trains, characters).**

```js
const trainScale = window.RZ.trainScale()
scaledConfig = CharacterTrain.scaleConfig(baseCfg, trainScale)
CharacterTrain.mount(container, scaledConfig)
```

### Formula

```js
Math.min(1, Math.max(0.55, window.innerHeight / 800))
```

### Scaling Table

| Viewport Height | Scale |
|---|---|
| ≤ 436px | 0.55 |
| 480px (mobile) | 0.60 |
| 667px (iPhone) | 0.83 |
| 800px+ (PC/laptop) | 1.00 |

### Usage Pattern

```js
// Character train scaling (G15, G16)
const rzScale = RZ.trainScale()
const scaledCfg = CharacterTrain.scaleConfig(baseCfg, rzScale)
CharacterTrain.mount(trainContainer, scaledCfg)

// NOT for CSS UI (use scale instead)
```

### Key Properties

- **Height-driven**: Trains are tall sprites; vertical space is limiting factor
- **Scales down to 0.55**: On small viewports, trains compress vertically to fit
- **Independent from `scale()`**: CSS UI stays readable while world sprites shrink

---

## `RZ.bp()`

**Returns a breakpoint string for layout branching.**

```js
const bp = window.RZ.bp()
switch (bp) {
  case 'xs': /* 0-360px */ break
  case 'sm': /* 360-480px */ break
  case 'md': /* 480-768px */ break
  case 'lg': /* 768px+ */ break
}
```

### Breakpoints

| Breakpoint | Width Range | Use Case |
|---|---|---|
| `'xs'` | 0–360px | Small phones (landscape) |
| `'sm'` | 360–480px | Standard phones (portrait) |
| `'md'` | 480–768px | Tablets (portrait) |
| `'lg'` | 768px+ | Tablets (landscape), desktops |

### Usage Pattern

```js
// Show/hide elements based on viewport
if (RZ.bp() === 'xs') {
  // Hide sidebar, use stacked layout
} else {
  // Show sidebar, use flex layout
}

// Game-specific logic
if (RZ.bp() === 'lg') {
  // PC version with full HUD
} else {
  // Mobile version with compact HUD
}
```

---

## `RZ.orient()`

**Returns device orientation.**

```js
const orientation = window.RZ.orient()
if (orientation === 'portrait') {
  // Vertical layout (phones)
} else {
  // Horizontal layout (landscape phones, tablets)
}
```

### Return Values

- `'portrait'` — `innerWidth ≤ innerHeight`
- `'landscape'` — `innerWidth > innerHeight`

---

## `RZ.onResize(fn)`

**Register a resize listener; returns unsubscribe function.**

```js
const unsubscribe = RZ.onResize((rz) => {
  console.log('Scale changed to:', rz.scale())
  // Rebuild UI with new scale
})

// Later, unsubscribe
unsubscribe()
```

### Parameters

- `fn(rz)` — Called immediately with `window.RZ` context, then on every resize.

### Usage Pattern

```js
// Game-specific resize handler
const unsub = RZ.onResize((rz) => {
  const W = window.innerWidth
  const H = window.innerHeight
  
  // Recompute world dimensions
  TRAIN_X = Math.max(150, Math.round(W * 0.10))
  TRAIN_Y = getTrackY(H)
  
  // Rebuild sprites with new scale
  if (trainInstance) trainInstance.dispose()
  buildTrain()
})

// Cleanup on exit
function exitGame() {
  unsub()
  // ...
}
```

---

## Two-Scale Pattern: CSS UI vs World Sprites

### Context: G15 + G16 Trains

**Problem**: Trains are tall sprites anchored to rail positions. On mobile (viewport height 480), scaling them by CSS width would make them tiny and look wrong.

**Solution**: Two independent scales.

```js
// DOM UI (buttons, labels) — width-responsive, readable
const cssScale = RZ.scale()  // 480px wide → 0.84x
button.style.fontSize = `${16 * cssScale}px`

// Game world (trains) — height-responsive, proportional
const worldScale = RZ.trainScale()  // 480px high → 0.60x
CharacterTrain.mount(container, scaleConfig(baseCfg, worldScale))
```

**Visual**: On mobile, buttons stay 84% size (readable), while trains shrink 60% (to fit vertical space).

---

## Implementation Details

### Single-Use Initialization

```js
window.RZ = {
  scale() {
    return Math.min(1, Math.max(0.7, 0.44 + innerWidth * 0.00175))
  },
  trainScale() {
    return Math.min(1, Math.max(0.55, window.innerHeight / 800))
  },
  bp() {
    const w = innerWidth
    return w < 360 ? 'xs' : w < 480 ? 'sm' : w < 768 ? 'md' : 'lg'
  },
  orient() {
    return innerWidth > innerHeight ? 'landscape' : 'portrait'
  },
  onResize(fn) {
    const h = () => fn(this)
    addEventListener('resize', h, { passive: true })
    h()  // Call immediately
    return () => removeEventListener('resize', h)
  }
}
```

### Passive Event Listener

`{ passive: true }` ensures scroll performance isn't blocked by resize handler.

---

## Game Integration Patterns

### Pattern 1: Simple Scale (DOM games)

```js
// G3 letter buttons
const scale = RZ.scale()
document.querySelectorAll('.g3-letter-btn').forEach(btn => {
  btn.style.width = `${52 * scale}px`
  btn.style.height = `${52 * scale}px`
})
```

### Pattern 2: World + UI Scale (PixiJS games)

```js
// G15 + G16 setup
const cssScale = RZ.scale()       // for text overlays
const trainScale = RZ.trainScale() // for train sprite

// Train sprite
const scaledCfg = CharacterTrain.scaleConfig(baseCfg, trainScale)
CharacterTrain.mount(trainContainer, scaledCfg)

// PIXI.Text labels
gameTitle.scale.set(cssScale, cssScale)
```

### Pattern 3: Resize Handler with Cleanup

```js
function initGame() {
  const unsub = RZ.onResize((rz) => {
    // Recompute world geometry
    W = window.innerWidth
    H = window.innerHeight
    WORLD_WIDTH = W * 0.7
    
    // Rebuild train
    if (trainInstance) trainInstance.dispose()
    buildTrain()
  })
  
  // Store unsub for cleanup
  window.currentGameUnsub = unsub
}

function exitGame() {
  if (window.currentGameUnsub) {
    window.currentGameUnsub()
    window.currentGameUnsub = null
  }
}
```

---

## Testing Checklist

- [ ] `RZ.scale()` returns 1.0 on desktop (1024px+)
- [ ] `RZ.scale()` returns ~0.7 on mobile 320px width
- [ ] `RZ.trainScale()` returns 1.0 on desktop (height 800px+)
- [ ] `RZ.trainScale()` returns ~0.6 on mobile 480px height
- [ ] `RZ.bp()` returns 'lg' on desktop
- [ ] `RZ.bp()` returns 'sm' on phone portrait
- [ ] `RZ.orient()` returns 'portrait' on phone upright
- [ ] `RZ.orient()` returns 'landscape' on phone rotated
- [ ] `RZ.onResize()` fires immediately on call
- [ ] `RZ.onResize()` fires again on window resize
- [ ] Unsubscribe function removes listener (no double-fires after)
- [ ] Train sprites rebuild on resize (old instance disposed, new scale applied)
- [ ] Text overlays scale with `RZ.scale()` on resize
- [ ] No console errors during resize

---

## Related Code

- **CSS token layer**: `style.css:root` (uses `--rz-scale` variable)
- **Character train scaling**: `games/train-character-sprite.js:scaleConfig()`
- **G15 usage**: `games/g15-pixi.html:buildTrain()` + resize handler
- **G16 usage**: `games/g16-pixi.html:buildTrain()` + resize handler
- **Spec + calibration**: `documentation and standarization/CHARACTER-TRAIN-SPEC.md` § Responsive Scaling

---

## Invariants (Do Not Break)

1. **`scale()` capped at 1.0** — Never scales UI up on large viewports.
2. **`trainScale()` minimum 0.55** — Trains never disappear, always visible.
3. **Two independent scales** — CSS UI and world sprites respond to different axes (width vs height).
4. **Passive listeners** — Resize events don't block scroll (no heavy DOM operations in handler).
5. **Idempotent calls** — Multiple `RZ.scale()` calls within same resize handler return same value.

