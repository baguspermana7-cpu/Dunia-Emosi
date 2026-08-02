# Custom Chaser + Race — proper plan (4-agent synthesis, 2026-08-02)

Owner want: reuse **by-you's REAL customization mechanism** (color · sticker · eyes · mouth · background)
to customize a chaser, then race it — "the best, even if hard, plan proper + perfect."

Researched by 4 parallel Opus agents (by-you mechanism · gotham Spine · bridge architecture ·
standalone-race path). This plan is their synthesis.

═══════════════════════════════════════════════════════════════════════
## THE HARD CONSTRAINT (why "full customization in gotham" is impossible)
═══════════════════════════════════════════════════════════════════════
gotham's chaser is a **Spine skeletal hero**. Verified against the actual Spine JSONs:
- The whole car body **including the mouth/face is baked into ONE flat `chassis` region**. There is
  **no mouth slot, no sticker/decal slot** anywhere. The only face handle is `blink_1` (eyes, 3 blink
  frames). Skins are only {default, hero, villain} — **no color-variant skins**.
- So on gotham's hero, ONLY these customization axes are physically expressible:
  **color** (whole-car `skeleton.color` multiply, or per-slot chassis tint) and **background**
  (scene layers). Eyes = tint/blink only (no new styles). **Sticker + mouth = IMPOSSIBLE without
  authoring new Spine attachments (new art + atlas repack).**
- by-you's customization is **layered PNG atlas frames** (swap a `vehicleNcolorI` sprite, tint/glow it).
  That technique does **not** map onto a Spine rig. The two engines are fundamentally incompatible.

**Conclusion:** no bridge into gotham's runtime can ever carry the full paint job. The color-only
bridge I built earlier is the *most* gotham can express — and its auto-skip caused the oscillation/hang
owner hit. That path is a dead end for "full customization."

═══════════════════════════════════════════════════════════════════════
## THE BEST PATH (recommended) — "Customize → Race" built INSIDE by-you
═══════════════════════════════════════════════════════════════════════
by-you is NOT a small app — it's a full Cartoon Network arcade template (the "fox" engine) that
**already ships dormant runner infrastructure**: an infinite-scroll background (`movingbackground.js`,
currently unused), SAT collision (`fox.createSATpolygon` + SAT.js), a particle system, object pooling,
a 3-ticker game loop, and leftover runner stubs (`startgame`, energy/charge bars, score/coins, bullet
arrays — heritage from the studio's runner/shooter template).

The customized car is a plain `PIXI.Container` (`g.vehiclecontainer`), and by-you **already contains
`photo.js`** which rebuilds the fully-painted car from a saved 8-field recipe
`{vehicle, clr, sclr, sticker, eyes, mouth, bg}` (persisted to `localStorage['BatwheelsData']`).

So the "best, even if hard" answer = **add a RACE mode inside by-you** that reuses the customize stack
+ the customized car + the dormant fox runner engine. The car the child paints is *literally* the car
that races — **full customization survives, stays animated, seamless, and touches no minified bundle,
no cross-engine, no cross-iframe, no synthetic-input fragility.**

### Flow (owner's order, delivered honestly)
1. **Pilih kendaraan** — by-you's 5 vehicles (already exists: select screen).
2. **Custom** — by-you's REAL paint (color · sticker · eyes · mouth · background) — the mechanism
   owner pointed at. Enter via `g.skipclean=1` (jump straight to paint, skip the wash minigame).
3. **Pilih arena/musuh** — a small pre-race pick (villain + backdrop) using by-you's backgrounds.
4. **Kejar-kejaran** — new `race.js` scene: your painted car chases/evades in a side-scroller.

### Architecture (from the standalone-path agent)
Add ONE scene `js/race.js` (a `foxmovieclip` subclass, same pattern as start/photo/gallery):
- **Player build:** port `photo.prototype.spawn` — rebuild the painted car from the saved `p{}` recipe
  into a fresh `g.racecar` container (NEVER reparent the live wash car — its per-frame expression
  tweens would fight the loop). `flipX` to face travel direction.
- **World:** `fox.movingbackground(...)` × N parallax layers, `.move(speed)` each frame (engine primitive).
- **Loop** (driven by `g.ticker1`/`fox.updateall`): ramp world speed (difficulty), spawn obstacles/
  villain/charge from a pool ahead + scroll left, input = tap-jump / swipe-lane, collision via
  `fox.createSATpolygon(car)` vs obstacle polys (SAT.js bundled), charge/score HUD (reuse `g.score`
  + `updatechargebar` stub).
- **End:** crash → results; reuse existing pause/popup infra.
- **Entry:** a "RACE" button on `titlescreen.js` or after paint; pass `g.photos[0]`/current `p{}`.
- **Wire-in:** register `race` in `loadingscreen.js` script list + a `fox.runscene('race')` trigger.

### Effort (honest)
- **Code:** ~3–6 focused days — the hard primitives (scroll, pooling, SAT, car-rebuild recipe,
  persistence, sound) are already present + battle-tested.
- **ART is the long pole:** NO track/road slices, NO villain, NO obstacle, NO collectible, NO drive
  animation exist — and cannot be crawled (they never existed on the origin). Cars are single static
  side-¾ textures (fake drive with a bob/tilt tween). A programmer-art prototype = days; a
  Batwheels-polish look = gated on new art (generate/adapt, then pngquant/webp per project standard).

### Risks + mitigations
- Art is the project, not code → phase art separately; ship a clean programmer-art prototype first.
- Static car textures → fake motion (bob/tilt/parallax + wheel-spin overlay if drawn).
- Flip offsets → eyes/mouth/sticker coords are per-pose hand-tuned; verify after `flipX`.
- 48 MB footprint already → compress all new art (project already uses pngquant + webp).
- PixiJS v5 + bespoke fox engine → build inside its conventions (demonstrated in start/photo/gallery).

═══════════════════════════════════════════════════════════════════════
## INTERIM / ALTERNATIVE (small, safe) — Option 4a
═══════════════════════════════════════════════════════════════════════
If a gotham tie-in is wanted quickly: re-enable the `film-play.html` picker, launch **vanilla gotham**
with `?chaser=hero,hex` + a STRIPPED `gg-custom.js` that does ONLY the tint (D4) [+ optional hero-swap
D3] and **drops the D2 auto-skip** (the child taps through Title/Intro themselves — this deletes the
entire oscillation bug class). Carries only hero + color (all gotham's Spine hero can express). Effort S,
risk Low. This is a *subset*, not the full customization — offer it only as a stopgap.

**Reject:** Option 2 (export PNG → gotham) = static image can't animate + XL minified-bundle surgery.
Option 1 as-written = its auto-skip is exactly what broke on device.

═══════════════════════════════════════════════════════════════════════
## BUILD PHASES (Option 3 — the recommended best)
═══════════════════════════════════════════════════════════════════════
- **P1 SPIKE** — `race.js` scaffold: rebuild the painted car from `p{}` into a race container, one
  parallax scroll layer, one pooled obstacle, tap-jump, SAT collision → crash. Verify headless (Pixi
  renders in headless) + screenshot. Proves the engine reuse end-to-end. NO art yet (boxes).
- **P2 GAMEPLAY** — obstacle/villain/charge spawner + difficulty ramp + lane-change + charge/score HUD
  + crash→results + entry button + `g.skipclean` paint entry. Programmer-art.
- **P3 ART** — track slices, villain, obstacles, collectibles, fake drive motion; compress (pngquant/webp).
- **P4 POLISH + SHIP** — SFX/VO wire, tuning, regression (`qa-film-games` 9/9), device screenshots, ship.

## No-break guarantee
Everything is additive inside by-you (new `race.js` + entry button + reused engine). The paint game +
the other 8 film games are untouched. gotham stays vanilla (already stabilized). No minified-bundle
edits anywhere.
