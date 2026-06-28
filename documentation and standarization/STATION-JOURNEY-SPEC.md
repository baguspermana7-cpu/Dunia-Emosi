# G14 Balapan Kereta — 48-Leg Station Journey Spec (v55.77, A-312)

> **v55.77 update:** `G14_JOURNEY` is now **48 legs** — 33 Indonesia (Gambir→…→Denpasar
> Bali + East-Java extension Mojokerto→Krian→Sidoarjo/Surabaya Gubeng) + 15 worldwide
> scenic rail routes (Swiss Glacier/Bernina, Bavaria, Scotland, Norway, Austria, Italy,
> Riviera, Baikal, Rockies, Canadian Rockies, Japan/Fuji, Arashiyama, Tibet, Kalka–Shimla).
> All 48 painterly plates are built (`data/g14-journey/level01..48.json` + tiers, `index.json`).
> **v55.80:** the 48-leg table is now a shared module `games/train-journey.js` (`window.TRAIN_JOURNEY` +
> `TrainJourney.name(level)`) so all three train games name the SAME leg their backdrop shows — g14 reads it
> (inline fallback), g15 + balapan-kereta-side show a current-leg HUD label and g15's journey-map modal is
> dynamic from it.
> The parallax + speed overlay run through the **shared** `games/train-backdrop.js`
> (`window.TrainBackdrop`) + `games/train-speedfx.js` (`window.TrainSpeedFX`), reused by
> **lokomotif-pemberani** (level→plate, lanes pinned) and **balapan-kereta-side**
> (scenery-only far layer). See CHANGELOG v55.77 + LESSONS L115/L116.

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

---

# Reference-accurate backgrounds (A-312, v55.71) — HYBRID VECTOR method

For L1-30 the owner supplies real reference art and wants the scene to match it
"se persis mungkin, super detail". Locked approach: **auto-trace the city band to a
layered vector + keep sky/hills/rail procedural & animated** (hybrid; light on the
tablet). Fully GUARDED — with no reference for a level, it renders exactly as the
procedural journey above.

### Pipeline — `tools/bg-ref-build.py` (Python + ImageMagick + vtracer)
`python3 tools/bg-ref-build.py 1-30` (or `--selftest` to validate with a synthetic).
Per `assets/train/bg-ref/levelNN.png`:
1. **Palette sample** per zone (sky/hills/ground) → a per-level override merged onto
   the base `day` palette so the procedural sky/hills/rail match the photo.
2. **City-band vectorise** — crop the band; paint the sky above the per-column skyline
   a unique KEY colour (vtracer flattens alpha); `vtracer` → layered SVG; then STRIP
   the key-colour paths so the sky is genuinely transparent → `assets/train/cityband/
   levelNN.svg` (+ a transparent `.webp` fallback).
3. **Manifest** `data/g14-journey/levelNN.json` `{palette, cityband, bandRatios}` and
   append the level to `data/g14-journey/index.json`.
Per-level tuning: pre-drop `data/g14-journey/levelNN.json` with `bandRatios`
`{skyBot,bandTop,bandBot,skyKeyTol}` to override the auto crop before running.

### Runtime — `games/balapan-kereta.html`
- `g14LoadManifest()` (awaited before scene build) reads **index.json** first (so
  levels WITHOUT a manifest never 404 / log a console error), then the level manifest.
- `g14Palette()` precedence: base `day` → biome → **per-level reference palette**.
- `buildFarScenery`: if the level has a `cityband`, `g14AddCityBand()` loads the SVG via
  `PIXI.Assets.load` → ONE **cached Sprite** (crisp vector, single draw call), masked to
  the scenery band, **tinted by time-of-day** (`g14CityTint`, also updated each sky tick).
  No cityband → the procedural `g14Landmark()` drawer (unchanged fallback).

### Accuracy QA — `tools/qa-bg-accuracy.mjs`
`node tools/qa-bg-accuracy.mjs 1-30` renders each level, then montages
**REFERENCE | RENDERED | DIFF** (+ RMSE via `magick compare`) to
`tools/qa-out/bg-accuracy-LNN.png` — tune band-ratios / vtracer params / palette until
each level is "persis". Perf is judged on the owner's device (headless FPS unreliable).

### Workflow when images arrive
drop `bg-ref/levelNN.png` → `bg-ref-build.py 1-30` → `qa-bg-accuracy.mjs 1-30` → review
the montages, tune the misses, re-run → ship in batches (sw bump). L31-40 keep the
procedural drawers unless references are supplied.
