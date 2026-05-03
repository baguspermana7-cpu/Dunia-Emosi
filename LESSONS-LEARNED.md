
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

## L79 — standaloneGames + inits arrays must be updated together (2026-05-04)
**Problem**: Added G24 (`initGame24()`) but forgot to add `24` to both `standaloneGames` array AND `inits` array in `startGameWithLevel()`. Result: `showScreen('screen-game24')` fired, found no element, removed `.active` from ALL screens → blank dark page. Navigation never occurred.
**Solution**: Added `24` to `standaloneGames` (prevents showScreen call) AND appended `initGame24` to `inits` at index 24 (enables navigation call).
**Rule**: Every new standalone game requires BOTH: (1) add gameNum to `standaloneGames`, (2) add `initGameN` at correct index in `inits[]`. Also update `totalLevels` and `numTiers` conditionals if non-default (not 20 levels). Check all 5 places in `openLevelSelect` + `startGameWithLevel`.

## L80 — CSS animation overrides JS positioning (2026-05-04)
**Problem**: NPC `inner` element had CSS `animation: seaNpcBob` (-30px bob). The outer `wrap` already had its `top` position set per-frame by JS using per-NPC `bAmp`. The CSS animation on `inner` was double-bobbing with hardcoded -30px instead of the correct per-type amplitude (range: 5-40px).
**Solution**: Remove CSS animation from inner element entirely. JS in `updateNPCs()` already correctly bobs via `n.el.style.top = n.baseY + Math.sin(n.phase)*n.bobAmp`. No separate inner animation needed.
**Rule**: When JS is already driving an element's position each frame, do not also add a CSS animation on the same axis — they compound unpredictably. Use one or the other, not both.

## L81 — CSS `rotate` property is independent of `transform`
When you need a CSS animation (e.g. body wiggle) on a `position:fixed` element that
already uses inline `style.transform` for positioning, animate the CSS `rotate` property
instead of `transform`. The `rotate` individual transform property is additive with
`transform` and CSS animations on it do NOT override the inline `transform` style.
This avoids the need for wrapper divs or JS-driven animation loops.

## L82 — Pokemon Showdown CDN for animated sprites
`https://play.pokemonshowdown.com/sprites/ani/{slug}.gif` provides animated transparent-BG
sprites for all Pokemon. Slugs: lowercase, hyphens for special forms (gyarados-mega,
sharpedo-mega, eternatus-eternamax). All `ani` sprites face LEFT — use flip:true (scaleX -1)
to make directional Pokemon face right. Symmetric Pokemon (Tentacool, Staryu, Mantine, etc.)
use flip:false. No CORS issue on <img> tags.

## L83 — mix-blend-mode:multiply for white-background PNG NPCs
When using PNG/JPG images with white backgrounds as CSS-positioned NPCs in a colored
(non-white) game scene, apply `mix-blend-mode:multiply` to the img element. White pixels
(255,255,255) multiplied with any color = that color (invisible). Dark/black pixels stay dark.
Result: silhouette image appears naturally against any colored background.
