
## L76 — G24 Player Flip Pattern (2026-05-04)
**Problem**: Water Pokemon GIFs may face left (toward viewer's left) instead of right (swimming direction).
**Solution**: Each evo stage has `flip: true/false`. In `syncSwimmerPos()` and `applyPokemon()`, apply `scaleX(-1)` to the transform string when `flip=true`. Never create separate mirror image files — CSS transform is zero-cost and instantly reversible.
**Rule**: For all future swimming/running games, add `flip` field to sprite data and apply via CSS, not pre-rendered assets.

## L77 — CSS NPC Creatures vs Pixi Objects (2026-05-04)
**Problem**: Want alive-looking background creatures (fish, jellyfish) but adding Pixi sprites for each NPC adds GPU draw calls and texture management overhead.
**Solution**: DOM elements with CSS `animation: seaNpcBob` on inner span (vertical oscillation) + JS translateX on outer wrapper (horizontal movement). 10-15 active NPCs run at near-zero GPU cost because CSS animations run on compositor thread.
**Rule**: For decorative background-only NPCs that don't interact with game physics, prefer CSS animation on DOM elements over Pixi objects.

## L78 — Stalactite/Stalagmite via PIXI.Graphics.poly() (2026-05-04)
**Problem**: How to draw realistic cave cliff obstacles instead of rectangular pipes.
**Solution**: `g.rect(0, fromY, CLIFF_W, bodyH).fill(col)` for the main body, then `g.poly([0, bodyH_end, CLIFF_W, bodyH_end, CLIFF_W/2, toY]).fill(col)` for the tapered tip. Spike length = min(52, bodyH*0.42) to prevent invisible spikes. Add stratification lines + moss circles for realism.
**Rule**: Clip spike length to 40-50% of total obstacle height to ensure the tip is always visible and not degenerate.
