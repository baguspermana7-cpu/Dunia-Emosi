
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

## L84 — parallaxMid groundY must use world coords, not screen height
In G21 Mario Pokemon, `buildMidLayer` placed hills at `_gameH()-30` (screen height minus 30).
The actual game ground is at `10*TILE=640` in world coords (not screen-relative). Using screen
height caused hills to float at varying heights across device sizes (sometimes mid-sky, sometimes
below ground). Fix: always use `10*TILE` directly — the parallaxMid container shares the same
Y origin as the world container (neither is scroll-offset vertically).

## L85 — Pit overlay lines must use ground tile Y, not tile-row - 1
In G21, pit danger overlays used `9*TILE` for the warning band, but the actual ground
is at `10*TILE`. This made the red danger line float one tile (64px) above the pit edge,
looking like a mysterious floating object. Always anchor pit/hazard overlays to the actual
tile row used for ground placement (`10*TILE`) not an assumed row above it.

## L86 — Kodok slot-7 unlock: place trigger at ENTRY POINT, not in a shared util
`_applyKodokSlot7Unlock` was placed in `openLevelSelect` assuming all G13 access flows
through it. But the world-map G13C tile calls `openGymGame()` and G13B calls
`openRegionOverlay()` — neither routes through `openLevelSelect`. Always add unlock
triggers at the actual entry-point functions that the UI calls, not in a shared utility
that MIGHT be called. The internal guard (`dunia-kodok-slot7-v3`) makes duplicate calls safe.

## L87 — Audio fade `setInterval` handles MUST be module-scope, not local
G23 `battleBgmStop` originally created the fade interval as a local `const fade = setInterval(…)`.
If `battleBgmPlay` was called mid-fade (e.g., second TR encounter triggered before exit anim ended),
the stale interval kept decrementing the volume on the now-playing element — silencing the second
battle. Pattern: hoist the handle to module scope (`let _battleFadeInterval = null`), and call
`clearInterval` + null at the top of BOTH play and stop paths. Applies to any fade/animation interval
that interacts with media that can be re-triggered.

## L88 — Never write a "fallback" save key that bypasses the active save scheme
G24 `showWin` had a fallback that wrote to `dunia-0-progress` (legacy slot-0 key) when
`save-engine.js` was unavailable. Result: if save-engine ever failed to load, the player's
avatar-keyed progress was silently corrupted by stale slot-0 writes. Rule: if the save engine
is the canonical path, it MUST load — there is no acceptable fallback. Either remove the
fallback entirely (let the save fail loudly) or ensure the fallback uses the SAME key resolver
the engine uses (`pkey()` in this project). Never re-introduce legacy keys "just in case".

## L89 — Pixi `ov.poly` has no implicit clipping at container bounds
G21 pit overlay's diagonal hash poly used `[i, ..., i-24, i+12, ...]`. With the loop running
to `i < w + TILE*2`, the right vertex `i+12` exceeded the overlay width by up to 11px and
rendered into the adjacent tile (no clipping). Pattern: when drawing repeating shapes inside
a Pixi `Graphics` overlay that should be visually bounded, cap the loop at `bound - maxOffset`
where `maxOffset` is the largest positive vertex offset, OR explicitly clamp each vertex with
`Math.min`. Same fix at left: start at the largest negative vertex offset (`i = 24` here).

## L90 — Duplicate HTML id breaks getElementById updates silently
G13C Gym Ladder badge counter showed "0/87" forever despite the Kodok preset writing 77 trainer
badges to localStorage. Root cause: TWO elements had `id="badge-num"` (line 259 in HUD top + line
344 in Gym Ladder subtitle). `document.getElementById` returns the FIRST match in document order
— so `updateBadgeCount()` updated the hidden HUD counter, never the visible one. Pattern: if
two screens need the same counter, give each its own unique id (e.g., `badge-num` and
`gs-badge-num`) and update BOTH in the setter. Add an HTML lint that grepps for duplicate `id="..."`
attributes per file as part of doc updates.

## L91 — Compose CSS rotate keyframes for static-rotated sprites
G24 needs upright Pokemon (Floatzel etc.) rotated -90° in the swim game. The existing
`swimWiggle` keyframe sets `rotate:-5deg → 0deg → 5deg` for Magikarp wiggle. If you also set
`rotate:-90deg` on the same element, the keyframe wipes out the static rotation each frame.
Fix: define a SECOND keyframe set `swimWiggleRot{rotate:-95deg → -90deg → -85deg}` and use
CSS specificity (`.swim-rotate.swim-wiggle{animation:swimWiggleRot ...}`) so rotated sprites
get the offset-aware wiggle. The CSS `rotate` property is independent from `transform`, so
combining `rotate:-90deg` + `transform:scaleX(-1)` is safe and well-supported.

## L92 — Per-type destruction FX make obstacles feel "solid"
G23 obstacles previously just faded out on hit (uniform UX, didn't feel impactful). Per-type
particle bursts (wood splinters scatter, leaves flutter, sparks flash) make each obstacle type
feel distinct and physically real to kids. Pattern: extend the particle structure with motion
fields (`vx, vy, ay, vr, life, maxLife`) once, then write small spawn helpers per type. Floor
bounce (clamp y to GROUND_Y - 4, reverse vy *= -0.4) adds the "things land on the ground"
realism that makes destruction feel grounded. Helpers are pure spawn-only — they don't
update; one shared `updateObsParticles` handles motion + fade for all particle types.

## L93 — Mobile `onclick` has 300ms debounce; use `pointerdown` for game buttons
G23 had double-jump code (`S.jumpCount<2`, `DBLJ_POWER`) but the user couldn't trigger
the second jump because the jump button used `<button onclick="handleJump()">`. On mobile
browsers, `onclick` waits ~300ms after `pointerup` to disambiguate single-tap vs
double-tap-to-zoom — and during that window, additional taps are debounced/dropped.
For action games where rapid taps matter, bind via `pointerdown` instead, call
`e.preventDefault()` to suppress the synthesized click, and add CSS `touch-action:
manipulation` to disable browser touch heuristics. Pattern applies to ANY action button
where every tap matters (jump, fire, attack, dash). Keep `onclick` only for non-time-
critical UI like menu buttons.

## L94 — Without object-fit:contain, fixed width+height stretches sprites
G23 set `#player-img { width:132px; height:110px }` but had no `object-fit`. Default
behavior is to stretch the source image to fill those dimensions, distorting square
sprites to non-square. One-line fix: `object-fit:contain` preserves source aspect
ratio and letterboxes inside the box. Pattern applies whenever you constrain an
img/video to specific width AND height. If you only set one dimension and `auto` the
other, aspect ratio is preserved naturally — but for game sprites where layout
needs uniform box dimensions, `object-fit:contain` is the clean answer.

## L95 — Pick rotate OR scaleX as canonical direction handler, never both
G24 upright Pokemon initially used `rotate:-90deg` + `transform:scaleX(-1)` to make
standing sprites lie horizontal facing right. Result was wrong: head ended up pointing
left-down. The double transformation compounds in a way that's hard to predict —
rotate around an off-center origin (default bottom-center for `#player-img`) plus a
horizontal flip produces a different final orientation than either alone.

Rule: when rotating a sprite for direction, choose ONE direction handler. If `rotate`
is set, do NOT also apply `scaleX(-1)` — rotation alone determines the head direction.
And always force `transform-origin:50% 50%` (sprite center) on rotated sprites so the
visual center stays at the anchor point — the default `50% 100%` (bottom-center) is
designed for upright standing, not horizontal swimming.

Pattern: in renderer code, branch on `rotate` flag:
- `rotate=true` → apply rotation, no flip, transform-origin: center
- `rotate=false, flip=true` → apply scaleX(-1), no rotation
- `rotate=false, flip=false` → no transform

## L96 — Preset scope discipline: never default to "unlock everything"
G13C Kodok slot-7 preset originally wrote ALL 77 trainer badges. User pushback:
"region kanto unlock 100%, tapi region lain itu terbuka 25% saja" — Kanto full,
others partial. The original implementation was the lazy version (just unlock
everything for the privileged slot), which removed all gameplay challenge.

Pattern: when adding a "preset/seed/starter pack" feature, always tier by region
or category with PLAYER PROGRESSION INTENT. Ask: "what should the player still
need to earn?" The preset should answer, not erase. Default to giving the player
a clear starting region (full unlock, so they can see what's possible) plus small
previews of other regions (25% — entices, doesn't satisfy). For category-based
presets (badges, achievements), apply the same tiering: one category fully, others
partially. NEVER write the entire data set as a preset.

## L97 — Per-sprite visual offset for asymmetric image weight
G24 Eternatus appeared too low in the player aura ring even with `object-fit:contain`
+ `transform:translate(-50%,-50%)` (which centers the bounding box). Cause: the
Pokemon's actual visual weight was in the LOWER portion of its source sprite (tall
serpentine pose), so geometric center ≠ visual center.

`object-fit` and transform-origin can only solve symmetric cases. For sprites with
inherent visual-weight asymmetry, add a per-sprite `centerOffsetY` (or `centerOffsetX`)
field — pixel offset applied to the visual position only, NOT the hitbox. Allows
fine-tuning each sprite without changing global rendering rules. Pattern is generic:
any time a sprite has artistic anchor point that differs from its geometric center
(tall Pokemon, wide ships, characters with extended limbs), use a per-instance offset
to compensate.

## L98 — Bump game.js cache version when changing functions in game.js
After shipping #137 (Kodok preset tiered to 27/77), user reported the badge counter
still showed 77/77 — the new code never ran. Root cause: `index.html` referenced
`game.js?v=20260504b` (yesterday's version). Browser cached that version and ignored
the new code on disk. The g13c-pixi.html cache version was bumped (v=20260505k) but
g13c-pixi.html doesn't contain `_applyKodokSlot7Unlock` — that function lives in
game.js, called from `openGymGame()` BEFORE the redirect to g13c-pixi.html.

Pattern: when changing a function in game.js, ALWAYS bump the `?v=` query string
on the `<script src="game.js?v=...">` tag in index.html. Bumping individual game
HTML cache versions only refreshes those pages — it does nothing for index.html's
shared scripts. Same applies to any other file loaded from index.html (region-meta,
city-pokemon-pack, save-engine, etc.) — bump the index.html cache version of THAT
file when its contents change.

Quick rule: "Did I change file X? Search index.html for `src=".*X\?v=` and bump it."

## L99 — ALWAYS check user's local assets folder BEFORE searching external sources
G23 saga: user said "use the GIF from the same folder as Arcanine" and showed
a running Arcanine image. I tried 3 external CDN sources sequentially:
- Pokemon Showdown ani/ (modern, mostly idle)
- Pokemon Showdown gen5ani/ (BW battle stance)
- PokemonDB black-white/anim/normal/ (BW with motion blur)
None matched. Then I asked the user for a URL, and they pointed me to
`/home/baguspermana7/rz-work/Dunia-Emosi/assets/Pokemon/g23/` — they had ALL
the running .webp sprites prepared LOCALLY the whole time. I had even
unnecessarily replaced Lycanroc/Cinderace/Chespin with "Gen 5 equivalents"
because external sources lacked them — when the user had `lycanroc.webp`,
`cinderace.webp`, `chespin.png` in their assets folder.

**Pattern**: when user says "use the {sprite/asset} from {folder}", FIRST
look in the project's assets directory. Common patterns to check:
- `assets/{game-slug}/` (e.g., `assets/Pokemon/g23/`)
- `assets/{type}/` (e.g., `assets/Pokemon/sprites/`)
- `public/`, `static/`, `img/`
Run `ls assets/` for the relevant subdirectory BEFORE searching CDNs.

**Bigger pattern**: the user's project is THEIR domain — they likely have
their own asset organization, naming conventions, and prepared files. Trust
that they've prepared what they need; don't assume they want external sources
when they have local ones. Always grep/ls the project for "{pokemon-name}.*"
or similar before reaching for an external URL.

This wasted 5 commits (#143, #144, #147, plus 2 cache bumps) and significantly
frustrated the user. Avoid this entire class of mistake by spending 30 seconds
exploring the user's assets directory FIRST.
