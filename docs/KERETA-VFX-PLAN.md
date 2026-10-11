# Lokomotif Pemberani — VFX plan per scenario beat (owner 2026-10-11: "VFX pakai semuanya sesuai storyline")

Source of truth for moments: docs/KERETA-BRAVE-ALIGNMENT.md (scenario map). Effects come ONLY from the game library
(`games/data/vfx-db.js` / `assets/vfx/vfx-db.json`, 79 records, every one `cc0` or `public-domain`, played by
`games/vfx-engine.js` + `games/vfx-moments.js`). Nothing is added from the central database in this pass: every id below
already exists, so `tools/build-vfx-library.py` and the uncommitted vfx-db files are untouched. If a later beat needs a
record the library lacks, take it from `~/Documents/temporary/uiux/visual effect/sudah organized/database/blippi-safe.json`
(cc0 / public-domain / owner-supplied only, never `unknown`; `restricted-product-only` only with its credit line),
and list the addition here.

Conventions: size = visible px at 390 wide (scale x1.6 at 1280); dur in ms; "at" = board cell or element; all transform /
opacity, reduced-motion = a single fade. Tints reuse VFX.Moment filters (GOLD, BLUE, CREAM).

| Sc | Beat (from the md) | Effect ids | Where / size / dur |
|---|---|---|---|
| all | pick up an item | bk-star-01 + bk-spark-02 | at cell, 70, 450 |
| all | sub-goal filled (checklist) | bk-star-05 burst, bk-circle-01 ring | at destination, 90, 520; checklist slot pop |
| all | mission done | bk-star-03, bk-magic-02 (confetti via MojoFX) | board centre, 220, 900 |
| 1 | valley loop, birds lift off | bk-smoke-wispy-01 (chimney), bk-cloud-01 drifting shadow | loco chimney, 60, loop 2200 |
| 2 | Henry shovels coal | bk-fire-01 glow in firebox, bk-smoke-01 puff, bk-dirt-02 coal dust | at loco, 80, 600 |
| 3 | climb the grade | heavy steam bk-smoke-wispy-02 x3 staggered, bk-dirt-01 dust at wheels | chimney 90 / wheels 70, loop 800; summit: bk-star-02 |
| 4 | speed, turtle, SUDDEN BRAKE | speed: bk-trace-02 streaks; brake: bk-smoke-puff (big) + bk-spark-04/05 at wheels, bk-dirt-03 | loco, brake 160, 900 + 4 sparks 40, 400; turtle crosses; then bk-star-01 |
| 5 | passengers board, golden light | bk-light-02 rays, bk-flare-01 on station lamp | station, 140, loop 3000 |
| 6 | depot, Baron points | bk-light-03 dust shafts, bk-smoke-wispy-03 | depot door, 120 |
| 7 | Samson rolls in | bk-smoke-07 plumes + bk-dirt-02 at his wheels, bk-effect-02 shake ring | Samson, 180, 1200 |
| 8 | rain begins, leaves alone | rain via fx layer, bk-light-01 lightning flash (screen) at end | full board, 1 flash 160 |
| 9 | POINT OF NO RETURN, searchlight, Goro in tunnel | bk-light-02 beam sweep, bk-flare-01 Goro's headlamp, bk-smoke-wispy-01 from cave mouth | cave mouth, 130, loop 2400 |
| 10 | wreck valley in lightning | bk-light-01 flashes at random 4 s, bk-dirt-01 dust when a wreck leans | wreck, 90, 500 |
| 11 | photo memory, sepia | bk-magic-04 soft glow, bk-star-06 drifting | photo, 60, loop 3000 |
| 14 | haul logs, Carter on logs | bk-smoke-05 labour puffs per move, bk-trace-04 whip crack (air only) + comic text "ctar" | chimney 100; crack 80 above Carter, 300 |
| 16 | lookout, face wide-eyed | bk-flare-01 glint on bridge, bk-light-02 | lookout, 90, 700 |
| 17 | chain strains, snaps, Carter tumbles | strain: bk-spark-03 at wheels loop; snap: bk-spark-06 burst + bk-trace-05 + bk-smoke-puff; Carter: bk-dirt-02 sawdust | coupling, 100, 500 |
| 18 | Goro backs into the cave | bk-smoke-01 swallowed in dark, bk-flare-01 eyes fade | cave, 120, 900 |
| 19 | James shoots, MISSES | muzzle bk-flare-01 + bk-smoke-puff white, comic "DOR!", miss: bk-spark-07 on a rock | James hand 90, rock 50, 350; Linus squash + extra steam bk-smoke-wispy-02 |
| 20 | coaches pulled to land | bk-smoke-wispy-01, bk-star-04 as passengers step out | 80 |
| 21-22 | rescue crossing, shovelling | bk-fire-02 firebox flicker, bk-smoke-05 | cab, 90, loop |
| 23 | truss breaks | bk-dirt-03 debris x6 falling, bk-smoke-07 dust cloud, bk-effect-03 | bridge, 200, 1400 |
| 24 | over the cliff lip | bk-dirt-01 dust cloud big, bk-smoke-wispy-03 | lip, 220, 1600 |
| 25 | survivors gather | bk-smoke-wispy-01 faint, bk-star-09 | 70 |
| 26 | dream: clouds, golden gate | bk-cloud-02 layers, bk-magic-01/03 glow, bk-light-02 rays, bk-star-07 | full board, loop 4000 |
| 27 | workshop welcome | bk-star-01 pops, bk-light-03 | 90 |
| 28 | newspaper cards | bk-star-08 sparkle on headline | 60 |
| 29-30 | new bridge, finale | bk-star-02/05 + MojoFX confetti, bk-cloud-01 | 200, 1800 |

Cast/animals idle VFX (item 5): bk-dirt-02 hoof dust (deer step), bk-star-01 blink-sparkle never used; leaves via the flying-leaves overlay.
Status: items 1 (goal markers) shipped; every beat above is wired together with items 4 onward.
