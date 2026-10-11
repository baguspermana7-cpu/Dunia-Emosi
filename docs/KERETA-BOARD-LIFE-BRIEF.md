# Lokomotif Pemberani — make the board alive (owner, 2026-10-11)

Owner: "kamu harus super creative untuk membuat board itu tampak hidup. Misal NPC gambar elang botak, itu dibuat
mirroring terus normal jadi kayak noleh-noleh, atau berbunyi. Atau misal ada awan yang bergerak pelan, pelangi dll —
banyak lah overlay atau effect seperti itu. Sempurnakan, agar sangat menarik."

Current life layer: games/data/kereta-life.js (idles on two CSS channels, pose swaps, deer graze, birds fly off,
foreground fringe, cloud shadows, dust motes) on top of the pack's cast layer (games/data/kereta-pack.js renderCast /
decor), moods/terrain (paintGround, ambient), cinematics (kereta-cine.js), story fx (kereta-story.js). Shared VFX bank:
games/vfx-engine.js + games/data/vfx-db.js (use VFX.play, respect each record's blend; kid-safe ids only; never
bk-smoke-puff or electric bolts — see docs/KERETA-VFX-PLAN.md "Effect hygiene"). Sounds: the Mojo engine's SND /
games' shared SFX engine (find it; keep volumes gentle, respect the sound toggle).

## Make it rich — a catalogue to build, each tied to the scene's mood/terrain/story
**Characters (every NPC and animal)**
- Look-around: flip the sprite horizontally every few seconds (scaleX −1 ↔ 1 with a quick squash in between) so
  birds, the vulture, the deer, people "noleh-noleh"; they face Linus when he comes near.
- Voice: a short sound + a tiny speech/sound bubble on tap and occasionally on their own (bird chirp "cuit!",
  vulture "kaak!", deer, turtle, Henry "Ayo!", Baron "Hmph!", Carter "Hei!"), never more than one at a time.
- Tap any NPC/animal: it reacts (hop, spin, wave pose, hearts/notes burst) — kids poke everything.
- Blinks, breathing, idle fidgets stay; vary per character.

**Sky and weather overlays (in front of the backdrop, behind or over the board by depth)**
- Clouds drifting slowly across the sky band and soft cloud SHADOWS over the board (exists — make clouds visible
  too); a rainbow that fades in after rain or on happy beats; sun rays/god rays on sunny boards; drifting mist in
  valleys and the gorge; fireflies at night; falling leaves in forest/logging; snowflakes on the mountain; rain
  splashes on puddles; lightning lighting the board on storm.
- Birds crossing the sky in a V; a butterfly that flutters along the rail; a far train smoke trail on the horizon.

**Ground and props**
- Water cells: moving sheen, little fish jumping, lily pads bobbing, ripples when Linus crosses the bridge.
- Grass and flowers sway in waves across the board (a wind gust passing through); trees sway with leaves falling.
- Station/depot: a flag on the roof waving, a lamp glow pulsing at night, smoke from chimneys.
- Linus: steam puffs from the chimney while idle, a wheel glint, a little bounce when the run starts; when he passes,
  grass bends and dust kicks up.

**Rules**
- Everything matches the scene (no rainbow in a storm, no fireflies at noon, no vulture in the peaceful valley).
- Cheap: transform/opacity only, CSS animations or one rAF; cap simultaneous particles; pause when hidden; all off
  under prefers-reduced-motion; sound respects the toggle and never repeats annoyingly.
- Never covers the rail, goals, markers or name tags; tap targets on NPCs never steal taps from the palette/plan.
- Gate (tools/qa-kereta-pack.mjs): each mood/terrain gets its overlay set; a tap on an NPC reacts; reduced motion
  turns everything off; frame time stays within the existing perf budget.

## Report
Per group (characters, sky/weather, ground/props), with a 390x844 + 1280x800 frame sheet over time you LOOKED at,
gate result, files touched. Don't commit; no git stash. Live token is v63.79-20261011a; main bumps it.

## Use the owner's VFX database first (owner: "saya punya banyak database VFX untuk membuat tampak live")
Before drawing anything by hand, search the owner's central database:
`~/Documents/temporary/uiux/visual effect/sudah organized/` — read VFX-CENTRAL-DATABASE.md, query
`database/effects-catalog.json` (4,595 indexed files with tags such as sparkle, water, cloud, light, fire, leaves,
smoke, star; animation kind static / frame-sequence / spritesheet; blend mode; license; blippi_safe) and the curated
WebP subsets in `curated/` (blippi-owner: 50 owner effects incl. clouds, rainbow, leaves, water splash, droplets,
bubbles, ripples, sparkles, rays). Also the game library (games/data/vfx-db.js, 79 effects) and the Blippi set
(../game1/data/blippi-vfx.js). Use spritesheets/frame sequences for real animated loops (waterfall, fire glow,
fireflies, rain, birds), not only static textures.
Licence gate: cc0 / public-domain / owner-supplied-internal only (restricted-product-only with its credit; never
'unknown'). New effects go into the game library through tools/build-vfx-library.py (extend it; list what you
added; keep qa-vfx-db green), so every game can reuse them. Record in docs/KERETA-VFX-PLAN.md which database
effect is used where.
