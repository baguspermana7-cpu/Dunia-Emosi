# MARIO GAME SPEC — G21 Mario Pokemon Platformer
> Hotfix #118 | 2026-05-01

## Overview
`games/g21-pixi.html` is a Pixi 8 platformer using authentic NES Super Mario Bros 1
sprites. Pikachu is the player character rendered as a DOM `<img>` GIF overlay for
native animation. All game terrain, enemies, items, and decorations use sprites from
the NES SMB1 reference at `/home/baguspermana7/Bagus_Apps/Supermario/web/game-easy/images/`.

---

## Sprite Naming Convention

Sprites in `assets/mario-pokemon/sprites/` use the `ref-` prefix to distinguish them
from legacy fallback sprites.

| Short Name         | File                     | Native Size | Usage                        |
|--------------------|--------------------------|-------------|------------------------------|
| `ref_block`        | ref-block.png            | 16×16       | Ground sub-row (ty=11)       |
| `ref_ground`       | ref-ground.png           | 16×16       | Ground top row (ty=10)       |
| `ref_brick`        | ref-brick.png            | 32×32       | Platform tiles               |
| `ref_qblock`       | ref-qblock.png           | 32×32       | Question block (lit)         |
| `ref_qblock-anim0` | ref-qblock-anim0.png     | 32×32       | Q-block anim frame 0         |
| `ref_qblock-anim1` | ref-qblock-anim1.png     | 32×32       | Q-block anim frame 1         |
| `ref_goomba0`      | ref-goomba0.png          | 64×64       | Goomba walk frame 0          |
| `ref_goomba1`      | ref-goomba1.png          | 64×64       | Goomba walk frame 1          |
| `ref_coin0`        | ref-coin0.png            | 32×32       | Coin spin frame 0            |
| `ref_coin1`        | ref-coin1.png            | 32×32       | Coin spin frame 1            |
| `ref_coin2`        | ref-coin2.png            | 32×32       | Coin spin frame 2            |
| `ref_mushroom`     | ref-mushroom.png         | 32×32       | Mushroom power-up            |
| `ref_starman`      | ref-starman.png          | 64×64       | Starman / electric mode      |
| `ref_1up`          | ref-1up.png              | 32×32       | 1-UP mushroom                |
| `ref_fireflower`   | ref-fireflower.png       | 64×64       | Fire flower                  |
| `ref_pipe`         | ref-pipe.png             | 32×32       | Vertical pipe                |
| `ref_bush`         | ref-bush.png             | 48×16       | Bush decoration              |
| `ref_cloud`        | ref-cloud.png            | 48×24       | Cloud parallax decoration    |
| `ref_hill`         | ref-hill.png             | 128×128     | Hill parallax mid-layer      |
| `ref_flagpole`     | ref-flagpole.png         | 16×32       | Goal flagpole                |
| `ref_castlewall`   | ref-castlewall.png       | 16×32       | Castle wall tile             |
| `ref_castlebrick`  | ref-castlebrick.png      | 16×16       | Castle brick tile            |
| `ref_castledoor`   | ref-castledoor.png       | 16×32       | Castle door tile             |

**Source**: `/home/baguspermana7/Bagus_Apps/Supermario/web/game-easy/images/` — Construct 3
export of NES SMB1 style sprites.

---

## Theme Palette

| Theme     | CSS Class      | Sky Top   | Sky Mid   | Sky Bot   | Notes                              |
|-----------|----------------|-----------|-----------|-----------|-------------------------------------|
| default   | (none)         | `#5C94FC` | `#6BB6FF` | `#8B6F47` | SMB1 authentic sky blue             |
| cave      | theme-cave     | `#1f2937` | `#374151` | `#1c1917` | Stalactites + crystal decorations   |
| sky       | theme-sky      | `#7dd3fc` | `#bae6fd` | `#7dd3fc` | Floating islands + extra clouds     |
| castle    | theme-castle   | `#4b1a72` | `#7c3aed` | `#1e1b4b` | Tower silhouettes + torch flames    |
| desert    | theme-desert   | `#fbbf24` | `#fde68a` | `#a16207` | Pyramids + sun + cacti              |
| ice       | theme-ice      | `#bfdbfe` | `#dbeafe` | `#93c5fd` | Snowflakes + pine trees + snowmen   |
| lava      | theme-lava     | `#7f1d1d` | `#dc2626` | `#451a03` | Lava pools + ember decorations      |
| final     | theme-final    | `#1e1b4b` | `#312e81` | `#000000` | Stars + nebula + castle battlements |

---

## Level Layout JSON Schema

Each entry in the `LEVELS` array follows this schema:

```js
{
  width: Number,          // World width in tiles
  spawn: { x, y },       // Player spawn in px (e.g. 2*TILE, 8*TILE)
  goal: { x, y },        // Flag goal position in px
  theme: String,          // Optional: 'cave'|'sky'|'castle'|'desert'|'ice'|'lava'|'final'
  bgColor: Number,        // Optional hex background override (legacy)
  ground: [{ x, len }],  // Ground segments (tile columns, len = tile count)
  platforms: [{ x, y, len }], // Suspended brick platforms (tile coords)
  coins: [[tx, ty], ...],     // Coin positions (tile coords)
  goombas: [[tx, ty], ...],   // Enemy spawn positions (tile coords)
  mushrooms: [[tx, ty], ...], // Mushroom power-up positions
  stars: [[tx, ty], ...],     // Starman positions
  spikes: [[tx, ty], ...],    // Spike hazard positions
  qBlocks: [[tx, ty, reward], ...], // Q-block: reward = 'coin'|'mushroom'
  pits: [[startTx, len], ...],      // Gap columns (no ground rendered)
}
```

10 levels total (L1-L10), difficulty scales via enemy count and pit density.

---

## Pikachu Anchor Formula

Pikachu is a DOM `<img>` overlay positioned via CSS `translate3d` synced each frame
from `S.x / S.y` (world coordinates).

```js
const wrapH = S.pikachuState === 'big' ? 118 : 84   // wrap div height in px
const wrapW = S.pikachuState === 'big' ? 118 : 84   // wrap div width in px
const haloFudge = isGIFState ? 10 : 0               // glow offset (GIFs only)
wrap.style.transform = `translate3d(
  ${screenX - wrapW/2}px,
  ${screenY - wrapH + haloFudge}px,
  0
)`
```

- `screenX = S.x - S.camX`
- `screenY = S.y` (world Y; y=bottom of collision body)
- `haloFudge = 10` for GIF states (idle/running/jump/happy) — compensates for
  ~10px transparent glow padding at the bottom of the GIF frames
- `haloFudge = 0` for static PNG states (no halo — cropped)

**Static PNGs** (`pikachu-small-cropped.png`, `pikachu-big-cropped.png`) are cropped
using `scripts/process-mario-sprites.py` — this removes the 370px+ transparent halo
(original PNGs were 512×512 with sprite only in 476×140 and 495×124 area).

---

## Asset Copy Procedure

1. List `/home/baguspermana7/Bagus_Apps/Supermario/web/game-easy/images/`
2. Copy needed sprites to `assets/mario-pokemon/sprites/ref-<name>.png`
3. Run `python3 scripts/process-mario-sprites.py` to crop Pikachu halos
4. Bump cache comment in `games/g21-pixi.html` (line ~214)
5. Stage and commit: `git add games/g21-pixi.html assets/mario-pokemon/sprites/ scripts/`

---

## Texture Loader Pattern

```js
// MARIO_TEXTURES populated by loadAssets() at boot time
let MARIO_TEXTURES = {}

async function loadAssets() {
  const manifest = {
    ref_ground: baseUrl + 'ref-ground.png',
    ref_brick:  baseUrl + 'ref-brick.png',
    // ...
  }
  const out = {}
  for (const [key, url] of Object.entries(manifest)) {
    try {
      const tex = await PIXI.Assets.load(url)
      if (tex?.source) tex.source.scaleMode = 'nearest'  // pixel-art mode
      out[key] = tex
    } catch { out[key] = null }
  }
  MARIO_TEXTURES = out
  return out
}
```

Texture loader gates `initPixi()` — the canvas + game start only after all sprites
load (or fail gracefully with `null`). Every render function checks `if (tex)` before
using sprite, falling back to Pixi Graphics.

---

## File Map

```
games/g21-pixi.html                        — Main game file (2150+ lines)
assets/mario-pokemon/sprites/
  ref-*.png                                — SMB1 NES sprites (27 files)
  pikachu-idle.gif                         — Player idle animation
  pikachu-running.gif                      — Player run animation
  pikachu-jump.gif                         — Player jump animation
  pikachu-happy.gif                        — Player win animation
  pikachu-small-cropped.png                — Cropped static (Pikachu small)
  pikachu-big-cropped.png                  — Cropped static (Pikachu big)
  pikachu-fire.png                         — Fire Pikachu static
assets/mario-pokemon/audio/
  smb_jumpsmall.ogg  smb_coin.ogg
  smb_squish.ogg     smb_powerup.ogg
  smb_takedamage.ogg smb_1up.ogg
  smb_flagpole.ogg   smb_bump.ogg
  (+ 11 more OGG files)
scripts/process-mario-sprites.py           — Pikachu halo crop utility
documentation and standarization/
  MARIO_GAME_SPEC.md                       — This file
```
