# VFX Engine Standard — `games/vfx-engine.js` (`window.VFX`)

One shared engine + one frame database for **every animated impact/attack effect** in
Dunia Emosi (M-303 shared-engine mandate — like `SFXEngine`, `QuizEngine`, `SuperQuiz`).
This doc is the **registry so context is never lost**: any game can look here to find an
effect and wire it in three lines.

> Absorbs the A-353 explosion pack (`window.ExplosionFX` is kept as a back-compat alias).

## Frame databases

| Folder | Effects | Source | License |
|---|---|---|---|
| `assets/vfx/explosion/` | smoke, boom, pop | Explosion Pack — Luis Zuno (@ansimuz) | CC0 (no attribution) |
| `assets/vfx/particles/` | fire-sparks, flamethrower, rocket-fire, electric-a, electric-aura, spark1, sparks, water-vortex, leaves, sakuras, poison-cloud, holy-light, gravity, regen, smoke-puff, smoke-cloud | Particle FX 1.3 — Raphael Hatencia (@RaphaelHatencia / RagnaPixel) | **CC-BY 4.0 — credit required** |

Each effect is a transparent WebP frame sequence `…/<fx>/f-1..N.webp`. Frame counts +
`kind` (`burst`/`aura`/`projectile`) live in `assets/vfx/particles/manifest.json` and the
`REGISTRY` at the top of `vfx-engine.js` (keep the two in sync when adding effects).
Blood Splat + Splatter were **excluded** (gory — not kid-safe).

## API

```js
// One-shot burst (PIXI) — explosions, splashes, sparks. container-local coords.
VFX.burst(container, x, y, { fx:'boom', scale:1, onDone })

// Looping aura hugging a sprite for `duration` ms (pre-attack charge). Returns {stop()}.
// target = a PIXI DisplayObject (reads .x/.y each tick if follow) or {x,y}.
const h = VFX.aura(container, sprite, { fx:'fire-sparks', duration:650, scale:1, follow:true })

// Travelling particle attacker→defender, then a small burst at impact (PIXI).
VFX.projectile(container, {x,y}, {x,y}, { fx:'flamethrower', scale:1, onHit })

// DOM-scene variants (BattleArena is DOM). x,y = viewport px.
VFX.dom(x, y, { fx:'boom', size:96, onDone, parent })
const h = VFX.domAura(el, { fx:'fire-sparks', duration:650, scale:1.3 })   // → {stop()}

VFX.preload(fx)          // warm the texture cache before a known impact
VFX.typeFx(type)         // Pokémon move-type → { aura, proj } (see below)
VFX.effects()            // list every registered fx name
```

All calls are **additive + guarded**: missing PIXI / container / frame never throws and
never blocks the caller. `prefers-reduced-motion` collapses auras/projectiles to a single
quick flash.

### Back-compat (A-353)
`window.ExplosionFX.pixi(container,x,y,{variant,scale})` → `VFX.burst(…, {fx:variant})`, and
`ExplosionFX.dom(x,y,{variant,size})` → `VFX.dom(…, {fx:variant})`. Existing crash/faint/hit
call sites keep working.

## Pokémon move-type → effect map (`VFX.TYPE_FX`, used by A-355)

| Type | aura | projectile | | Type | aura | projectile |
|---|---|---|---|---|---|---|
| fire | fire-sparks | flamethrower | | poison | poison-cloud | poison-cloud |
| fighting | fire-sparks | rocket-fire | | psychic | holy-light | holy-light |
| electric | electric-aura | electric-a | | fairy | holy-light | sakuras |
| water | water-vortex | water-vortex | | ghost / dark | gravity | gravity |
| ice | water-vortex | sparks | | dragon | gravity | rocket-fire |
| grass / bug | leaves | leaves | | ground / rock | smoke-cloud | sparks |
| steel | electric-aura | sparks | | flying | holy-light | sparks |
| normal / default | sparks | sparks | | | | |

Unknown type → `{ aura:'smoke-cloud', proj:'sparks' }`.

## Where it's wired
- **A-353 impacts:** balapan-kereta-side (crash + gap-fall), selamatkan-kereta (death),
  pokemon-run (obstacle hit), ducky-volley (smash), gym-pokemon (Pokémon faint "meledak dulu"
  via `BattleArena.faintDrop`).
- **A-355 Pokémon attacks:** aura-before-attack + fire-throw projectile in all 5 Pokémon games
  (gym-pokemon Adventure/PvP/Tournament via `battle-arena.js`; pokemon-run / mario-pokemon /
  pokemon-bawah-laut projectile spawns; pokemon-birds flourish) — layered ON TOP of the
  existing emoji aura/orb, visual-only (never touches battle state).

## Adding a new effect
1. Drop `assets/vfx/<pack>/<fx>/f-1..N.webp` (transparent frames).
2. Add `<fx>` to `REGISTRY` in `vfx-engine.js` (+ the manifest) with `{dir, frames, kind}`.
3. Credit the source in `assets/vfx/CREDITS.txt` if the license requires it.
4. Bump the `?v=` on `vfx-engine.js` across the pages that load it + `sw.js` CACHE_VERSION.
