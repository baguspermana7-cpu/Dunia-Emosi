# Character Train Engine — Spec + Calibration Guide

> Shared between G15 Lokomotif Pemberani + G16 Selamatkan Kereta.
> Engine lives in `games/train-character-sprite.js`.

---

## Engine API

```js
window.CharacterTrain.mount(container, config)
```

**Returns**: instance with methods
- `.tick(dt, speed)` — called every frame from game loop; rotates wheels, bobs body, spawns smoke
- `.setSmokeParent(stage)` — smoke particles render on `stage`, not `container` (so they persist past train movement)
- `.spawnSmoke()` — one-shot manual puff
- `.setSpeed(n)` — tune rotation speed
- `.dispose()` — cleanup wheels + particles when switching trains

**config fields**:

| Field | Type | Purpose |
|-------|------|---------|
| `spriteUrl` | string | Path to bg-removed WebP |
| `spriteHeight` | number (px) | Target rendered height. Sprite scaled proportionally. |
| `wheelPositions` | `[[x,y,r], ...]` | Overlay wheel coords in render-space (after spriteHeight scale). `[]` = no overlay. |
| `smokePos` | `[x,y]` or `null` | Smoke origin in render-space. `null` = electric tram, no smoke. |
| `bottomPaddingOffset` | number | Extra Y offset when placing on rail. Compensates for transparent bottom padding in source art. |
| `bodyBobFreq` / `bodyBobAmp` | numbers | Sin-wave body bob params |
| `smokeInterval` | frames | Auto-spawn smoke every N frames |

---

## 4 Character Trains (Current Calibration)

Synced between `games/trains-db.js` (G15 source) + `games/g16-pixi.html` G16_CHAR_CONFIGS (G16 inline).

### Casey JR
- **Source**: `assets/train/linus casey/caseyJR-flip.jpg`
- **WebP**: `assets/train/caseyjr-body.webp` (267×193 after simple threshold)
- **spriteHeight**: 117 (1.3× design scale)
- **bottomPaddingOffset**: 8
- **Wheel layout**: 0-4-0 (4 uniform drivers)
- **wheelPositions**: `[[-40,-10,8],[-14,-10,8],[13,-10,8],[40,-10,8]]`
- **smokePos**: `[-40,-130]`

### Linus Brave
- **Source**: `assets/train/linus casey/linus flip2.png` (user HD drop, 1355×1161)
- **WebP**: `assets/train/linus-body.webp` (600×446 after erode+outline pipeline)
- **spriteHeight**: 108 (1.2× from user request)
- **bottomPaddingOffset**: 8
- **Wheel layout**: 2-4-0 Sumatera style
- **wheelPositions**: `[[-66,-8,8],[-38,-12,12],[-14,-12,12],[10,-12,12],[34,-12,12]]` — 1 small pilot + 4 drivers
- **smokePos**: `[-42,-132]`

### Dragutin JZ 711 (articulated tram)
- **Source**: `assets/train/linus casey/JZ 711 dragutin.jpeg`
- **WebP**: `assets/train/jz711-body.webp` (600×149 after simple threshold)
- **spriteHeight**: 72
- **bottomPaddingOffset**: 12
- **Wheel layout**: 4 end-bogie wheels (tram has wheels only at ends, not middle articulation)
- **wheelPositions**: `[[-125,-4,7],[-108,-4,7],[106,-4,7],[123,-4,7]]`
- **smokePos**: `null` (electric, no smoke)

### Malivlak (JZ 62 + 3 passenger cars)
- **Source**: `assets/train/linus casey/JZ 62 malivlak.png` (user-cleaned version, 928×553)
- **WebP**: `assets/train/malivlak-body.webp` (700×342 after simple threshold, zero bottom padding)
- **spriteHeight**: 172 (1.2× from user request)
- **bottomPaddingOffset**: 0
- **Wheel layout**: 10 wheels — 3 cars × 2 wheels + 2 small pilots (r=5) + 2 large drivers (r=9)
- **wheelPositions**: `[[-138,-5,7],[-112,-5,7],[-86,-5,7],[-63,-5,7],[-37,-5,7],[-14,-5,7],[23,-4,5],[37,-4,5],[63,-5,9],[101,-5,9]]`
- **smokePos**: `[108,-195]`

---

## Placement Formulas (Rail Alignment)

**G15** (`games/g15-pixi.html` buildTrain around line 1050):
```js
trainContainer.y = LANE_Y[1] + (spriteHeight / 2 - 4) + bottomPaddingOffset
```

**G16** (`games/g16-pixi.html` buildTrain around line 884):
```js
trainContainer.y = getTrackY(H) + 22 + bottomPaddingOffset
```

Base offsets (`-4` G15 / `+22` G16) derived empirically from the rail-stripe position in each game's background. Tuning constant per game, per-train fine-tune via `bottomPaddingOffset`.

---

## Responsive Scaling (RZ.trainScale())

All geometry in `trains-db.js` + `G16_CHAR_CONFIGS` represents **PC reference (scale = 1)**, calibrated for viewport height ≥ 800. At buildTrain time both games multiply by `window.RZ.trainScale()` before mounting:

```js
const rzScale = (window.RZ && RZ.trainScale()) || 1
const scaledCfg = CharacterTrain.scaleConfig(baseCfg, rzScale)
// scaledCfg.spriteHeight, wheelPositions[i], smokePos, bottomPaddingOffset, bodyBobAmp all * rzScale
CharacterTrain.mount(container, scaledCfg)
```

`CharacterTrain.scaleConfig(cfg, s)` returns a new config with the following fields multiplied by `s`:
- `spriteHeight`
- `bottomPaddingOffset`
- `bodyBobAmp`
- every `[x, y, r]` in `wheelPositions`
- `smokePos = [x, y]`

`RZ.trainScale()` is a **viewport-height-driven** multiplier (distinct from the CSS-oriented `RZ.scale()` which caps at 1.0 for any viewport ≥ 320w):

```js
Math.min(1, Math.max(0.55, window.innerHeight / 800))
```

| Viewport H | Scale |
|------------|-------|
| ≥ 800 (PC / laptop) | 1.00 |
| 667 (iPhone portrait) | 0.83 |
| 480 | 0.60 |
| ≤ 436 | 0.55 (floor) |

Train sprites are vertical, rail-anchored objects — height is the natural axis to scale against. The CSS `RZ.scale()` stays unchanged and keeps driving DOM HUD + PIXI.Text sizing.

**On resize**: both games recompute `TRAIN_X` / `TRAIN_SCREEN_X`, track Y, and rebuild the character train (dispose + re-mount) so the rescaled sprite + wheels + smoke re-anchor to the new rail position. Programmatic trains only reposition (no rescale — they're drawn in PIXI.Graphics at fixed coords).

---

## Responsive TRAIN_X

Both games use:
```js
TRAIN_X = Math.max(150, Math.min(180, Math.round(W * 0.10)))
```

- **Min 150**: accommodates Dragutin's leftmost wheel at x=-125 + 25px safety margin. Reducing below 150 causes sprite to clip viewport left edge.
- **Max 180**: preserves aesthetic spacing on wide desktops.
- **10% of viewport**: smooth scale in between.

Do NOT change these bounds without first auditing all character train wheel positions.

---

## Sprite Preprocessing Pipeline

Use `scripts/process-character-sprite.py` for new sprite drops.

**Background removal strategy by source type**:

| Source | Pipeline | Rationale |
|--------|----------|-----------|
| JPEG with pure white bg | Simple threshold RGB≥245 | Deterministic, fast, no hallucination |
| PNG with gray matte | Threshold RGB≥200 + erode 1px + white outline stroke | Gray mattes need alpha softening |
| PNG with existing transparency | Skip removal, just crop bbox | Don't touch what's already clean |
| Hand-drawn cartoon with inner whites | Simple threshold ONLY (no erode) | Erosion mutilates inner body details |
| Source with horizontal rail lines | Aggressive thin-line stripper (<=6px rows, color std <50) | Rails drawn in source as artistic baseline |

**User preference (strong)**: "jangan mutilasi gambar aslinya" → always prefer simple threshold over AI-based rembg. AI models (u2net, isnet) hallucinate holes on flat cartoon fills.

---

## Invariants (Do Not Break)

1. `trains-db.js` ↔ `G16_CHAR_CONFIGS` must stay synced — G15 reads trains-db directly, G16 uses inline copy. Any field change must touch both.
2. `wheelPositions` empty array `[]` disables overlay. User feedback shows they prefer overlay even when sprite artwork has wheels drawn.
3. `bottomPaddingOffset` is PER-TRAIN, not global — each cartoon source has different bottom padding depending on the artist's framing.
4. Smoke particle parent = `stage`, not `trainContainer` — smoke stays behind as train moves.
5. `trainContainer.scale.x = 1` for character sprites (they face right natively). Programmatic trains use `scale.x = -1` due to different drawing convention.

---

## Known Issues / Open Questions

- Body bob animation affects sprite but wheels stay on baseline — intended, but may look slightly unnatural at high bob amplitudes. Current amp 1.5 is subtle enough.
- Smoke particles don't cull when train exits visible area (standalone games don't typically resize mid-play, so leak is bounded).
- No per-wheel rotation direction — all wheels rotate same direction as train speed. Realistic since drive wheels + idlers all turn same way.
