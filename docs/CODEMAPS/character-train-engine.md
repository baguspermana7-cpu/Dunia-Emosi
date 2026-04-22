# Character Train Engine — API Codemap

**Last Updated:** 2026-04-22  
**File**: `games/train-character-sprite.js` (~170 lines)  
**Purpose**: Shared sprite renderer for Casey JR, Linus Brave, Dragutin JZ 711, Malivlak (4 character trains).

---

## Public API

```js
window.CharacterTrain = {
  mount(container, config),      // Returns instance
  scaleConfig(cfg, scale),       // Returns scaled config (immutable)
  createSmokePuff(stage, x, y)   // Create smoke particle
}
```

---

## `mount(container, config)`

**Creates and mounts a character train sprite into a Pixi container.**

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `container` | PIXI.Container | Target container to add sprite, wheels, body bob to. |
| `config` | object | Configuration object (see below). |

### Config Object

```js
config = {
  spriteUrl: string,              // Path to WebP (bg-removed)
  spriteHeight: number,           // Rendered height (px)
  wheelPositions: [[x,y,r], ...], // Wheel overlay coords + radius
  smokePos: [x,y] or null,        // Smoke puff origin
  bottomPaddingOffset: number,    // Y offset for rail alignment
  bodyBobFreq: number,            // Sin-wave frequency
  bodyBobAmp: number,             // Sin-wave amplitude
  smokeInterval: number           // Frames between auto-spawns
}
```

### Return Value

**Instance object** with methods:

```js
instance.tick(dt, speed)          // Called per frame from game loop
instance.setSmokeParent(stage)    // Route smoke to stage
instance.spawnSmoke()             // One-shot smoke puff
instance.setSpeed(n)              // Tune wheel rotation speed
instance.dispose()                // Cleanup wheels + particles
```

### Example Usage

```js
// G15 buildTrain function (line ~1050 in g15-pixi.html)
const rzScale = window.RZ.trainScale() || 1
const scaledCfg = CharacterTrain.scaleConfig(
  TRAINS_DB['casey'], 
  rzScale
)
const trainInstance = CharacterTrain.mount(trainContainer, scaledCfg)
trainInstance.setSmokeParent(app.stage)
```

---

## Instance Methods

### `.tick(dt, speed)`
**Called every frame from the game loop.**

```js
CharacterTrain.mount(...).tick(dt, currentSpeed)
```

**Behavior**:
- Rotates wheel overlays proportionally to `speed`
- Applies body bob animation (sin-wave)
- Auto-spawns smoke every N frames
- Pauses if `disposed === true`

**Parameters**:
- `dt`: Frame delta time (seconds), or `undefined` if single-frame
- `speed`: Current train speed (px/s); determines wheel rotation rate

---

### `.setSmokeParent(stage)`
**Route smoke particles to a different container (usually the stage, not trainContainer).**

```js
trainInstance.setSmokeParent(app.stage)
```

**Why**: Smoke puffs should persist as the train moves. If parented to `trainContainer`, they move with the train and vanish. Parenting to `stage` leaves them behind (visual trail).

---

### `.spawnSmoke()`
**Trigger one smoke puff immediately.**

```js
trainInstance.spawnSmoke()
```

**Usage**: Manual SFX trigger (e.g., when accelerating). Auto-spawning every `smokeInterval` frames is built-in.

---

### `.setSpeed(n)`
**Tune the wheel rotation speed multiplier.**

```js
trainInstance.setSpeed(0.5)  // slow rotation
trainInstance.setSpeed(2.0)  // fast rotation
```

**Default**: 1.0 (uses `.tick(dt, speed)` parameter directly).

---

### `.dispose()`
**Clean up wheels, particles, texture references.**

```js
trainInstance.dispose()
```

**Called by**: Game when switching trains, resizing (rebuild), or exiting game.  
**Idempotent**: Safe to call multiple times; checks `state.disposed` before operating.

---

## `scaleConfig(cfg, scale)`

**Returns a new config object with all dimensions scaled.**

```js
const baseCfg = TRAINS_DB['casey']           // scale=1.0 (PC reference)
const scaledCfg = CharacterTrain.scaleConfig(baseCfg, 0.75)
// scaledCfg.spriteHeight *= 0.75
// scaledCfg.wheelPositions[i] *= 0.75
// scaledCfg.smokePos *= 0.75
// etc.
```

### Scaled Fields

| Field | Multiplier | Immutable? |
|-------|-----------|-----------|
| `spriteHeight` | ✓ scale | ✓ new object |
| `bottomPaddingOffset` | ✓ scale | ✓ new object |
| `bodyBobAmp` | ✓ scale | ✓ new object |
| `wheelPositions[i] = [x,y,r]` | ✓ scale on each | ✓ new array |
| `smokePos = [x,y]` | ✓ scale | ✓ new array |
| Other fields (`smokeInterval`, `bodyBobFreq`) | — | copied as-is |

### Usage Pattern

```js
// G16 buildTrain (line ~884)
const rzScale = window.RZ.trainScale() || 1
const baseConfig = G16_CHAR_CONFIGS['casey']
const scaledConfig = CharacterTrain.scaleConfig(baseConfig, rzScale)
CharacterTrain.mount(trainContainer, scaledConfig)
```

**Important**: Input config is **never mutated**. Returns a fresh object.

---

## RZ.trainScale() Integration

**Location**: `shared/rz-responsive.js`

```js
window.RZ.trainScale = function() {
  return Math.min(1, Math.max(0.55, window.innerHeight / 800))
}
```

**Formula**: `clamp(0.55, h/800, 1.0)`

| Viewport Height | Scale |
|-----------------|-------|
| ≥ 800 (PC) | 1.00 |
| 667 (iPhone portrait) | 0.83 |
| 480 | 0.60 |
| ≤ 436 | 0.55 (floor) |

**Why separate from CSS scale**: Game world sprites (trains) scale with viewport height. DOM UI (buttons) scale with viewport width. Two independent concerns.

---

## 4 Character Trains

Configs live in:
- **G15**: `games/trains-db.js` (source of truth)
- **G16**: `games/g16-pixi.html` (inlined `G16_CHAR_CONFIGS`)

### Casey JR
- **spriteHeight**: 117 px
- **wheelPositions**: 4 uniform drivers at [[-40,-10,8], [-14,-10,8], [13,-10,8], [40,-10,8]]
- **smokePos**: [-40,-130]
- **bodyBobAmp**: 1.5

### Linus Brave
- **spriteHeight**: 108 px
- **wheelPositions**: 5 wheels (1 pilot r=8 + 4 drivers r=10) at [[-66,-8,8], [-38,-12,10], [-14,-12,10], [10,-12,10], [34,-12,10]]
- **smokePos**: [-42,-132]
- **bodyBobAmp**: 1.5

### Dragutin JZ 711 (tram)
- **spriteHeight**: 75 px
- **wheelPositions**: 4 end-bogie wheels at [[-120,-4,7], [-95,-4,7], [95,-4,7], [120,-4,7]]
- **smokePos**: null (electric, no smoke)
- **bodyBobAmp**: 1.2

### Malivlak (JZ 62 + 3 cars)
- **spriteHeight**: 172 px
- **wheelPositions**: 10 wheels across 3 cars
- **smokePos**: [90,-130]
- **bodyBobAmp**: 1.8

---

## Smoke Particles

### `createSmokePuff(stage, x, y)`

**Creates a single smoke particle sprite.**

```js
const smokePuff = CharacterTrain.createSmokePuff(app.stage, x, y)
// Returns PIXI.Sprite with preset animation (fade + float up)
```

**Lifecycle**:
- Spawned at (x, y)
- Fades out over ~1.2s
- Floats upward (gravity-reversed)
- Auto-removed from stage when complete

**Auto-spawning**: Enabled in `.tick()` if `smokeInterval > 0`.

---

## Invariants (Do Not Break)

1. **Input config immutable** — `scaleConfig()` returns new object, never mutates input.
2. **Wheels drawn as overlays** — Not part of sprite image (allows flexible positioning independent of source art).
3. **Smoke parent = stage, not container** — Smoke particles persist as train moves.
4. **Scale all positional fields together** — `scaleConfig()` ensures consistency (all x/y/r multiplied by same factor).
5. **Dispose before rebuild** — Resize handlers must call `.dispose()` before calling `.mount()` on new config.
6. **No async operations** — All methods are synchronous; safe to call from event handlers.

---

## Resize Behavior (Game-Side)

**G15 + G16 resize handler** (line ~580 in g15, ~500 in g16):

```js
window.addEventListener('resize', () => {
  // Recompute viewport-dependent constants
  TRAIN_X = Math.max(150, Math.min(180, Math.round(W * 0.10)))
  TRAIN_SCREEN_X = Math.max(W * 0.15, 180)
  
  // Dispose old train instance
  if (trainInstance) trainInstance.dispose()
  
  // Rebuild with fresh scale
  buildTrain()  // calls RZ.trainScale() + scaleConfig() + mount()
})
```

**Key invariant**: Trains are **completely rebuilt** on resize, not just repositioned. This ensures responsive dimensions apply correctly.

---

## Testing Checklist

- [ ] Mount train; verify sprite renders at correct height
- [ ] Wheel overlays render on top of sprite
- [ ] Call `.tick(0.016, 100)` 10 times; wheels rotate smoothly
- [ ] Smoke spawns above train (if smokePos is set)
- [ ] Call `.setSpeed(0.5)`; wheel rotation slows proportionally
- [ ] Set viewport to 480px height; call `RZ.trainScale()` returns ~0.60
- [ ] Re-mount with `scaleConfig(baseCfg, 0.60)`; spriteHeight is 60% of base
- [ ] Resize window; train disposes then rebuilds (no memory leak)
- [ ] Electric train (Dragutin, smokePos=null); no smoke appears
- [ ] Multiple trains in one scene; each has independent wheel/smoke state
- [ ] Call `.dispose()`; subsequent `.tick()` calls do nothing

---

## Related Code

- **Responsive scale formula**: `shared/rz-responsive.js:RZ.trainScale()`
- **Config source (G15)**: `games/trains-db.js` (TRAINS_DB object)
- **Config source (G16)**: `games/g16-pixi.html:G16_CHAR_CONFIGS` (inlined)
- **Usage in G15**: `games/g15-pixi.html:buildTrain()` (~line 1050)
- **Usage in G16**: `games/g16-pixi.html:buildTrain()` (~line 884)
- **Spec + calibration**: `documentation and standarization/CHARACTER-TRAIN-SPEC.md`

