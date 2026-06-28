# G14 Balapan Kereta — 40-Level Station Journey Spec (v55.69, B-275)

Each level of *Balapan Kereta* is one leg of a west→east journey. The background is
**data-driven and unique per level** — no two levels share the same look.

## Single source of truth: `G14_JOURNEY[40]`
Defined in `games/balapan-kereta.html`. Each entry:

```js
{ name, region, biome, landmark }
```

- **L1-20 — Indonesia, Java west→east**: Merak → Rangkasbitung → Jakarta Kota →
  Gambir → Bekasi → … → Yogyakarta → Madiun → Mojokerto → **Surabaya Gubeng (L20)**.
- **L21-30 — Europe**: London, Paris, Amsterdam, Berlin, Swiss Alps, Roma, Wina,
  Praha, Madrid, Istanbul.
- **L31-36 — America**: New York, Chicago, Rocky Mountains, San Francisco, Grand
  Canyon, Washington DC.
- **L37-40 — Russia**: Moskwa, St. Petersburg, Trans-Siberia, Vladivostok.

`g14Journey()` returns `G14_JOURNEY[(cfg.level-1) % 40]`; `g14StationName()` returns
its `name` (used by the conductor announce + the checkpoint cinematic — the last
waypoint announces the destination station).

## Biome palette — `g14Palette()`
Returns `Object.assign({}, IndoScene.palette('day'), G14_BIOMES[biome])`. The biome
override only changes land-defining colors (`haze, mtnFar, hill1-3, grass, grassDk,
sawah*, ballast, tie`); the **sky gradient stays time-of-day driven** (race progress).
Biomes: `javaLush, coastal, urbanID, highlandID, arid, englishGrey, parisGold,
dutchFlat, alpine, germanCrisp, romanWarm, americaBlue, canyonRed, russiaCold, taiga`.
Snow biomes (`alpine/russiaCold/taiga`) whiten `grass` + `ballast` so the lanes read snowy.

## Landmark — `g14Landmark(key, W, baseY, pal, h)`
Returns a `PIXI.Container` of **flat-fill silhouettes** (batched; no Pixi gradients).
Keys: `none, volcano, monas, tugu, eiffel, clocktower, skyline, windmill, alps, domes,
colosseum, bridge`. **Only `volcano` carries `_craterX/_craterY`** → the smoke plume
fires for volcano landmarks only (others leave crater coords undefined; `L._smoke=null`).

## Regional props
`buildMidScenery` + the near scenery band gate Indonesian signatures to **L1-20 only**:
international legs drop palms (→ roadside trees) and rice paddies (→ plain rolling hills)
so palms/sawah never appear in Paris or Moscow. Gate: `(cfg.level||1) > 20`.

## Adding / editing a level
1. Edit the `G14_JOURNEY` row (name/region/biome/landmark).
2. New biome → add to `G14_BIOMES` (override only the land colors that differ).
3. New landmark → add a branch to `g14Landmark` (flat fills, centered `cx=W*0.52`,
   volcano-style `(W, baseY, pal, h)` signature).
4. Re-run `tools/qa-g14-journey.mjs` (screenshots a sample set; Pixi FPS is NOT
   headless-measurable — judge VISUALS via the screenshots, perf on the owner's device).

## Verification (M-302)
`node tools/qa-g14-journey.mjs` renders levels 1/4/13/17/20/21/22/25/31/37/40, asserts
0 console errors + journey data, and writes `tools/qa-out/g14-L*.png`. Confirm each
sampled level shows a DISTINCT background + its signature landmark + station name.
