# EMOJI_GAP — ✅ COMPLETE (0 gaps)

**2026-07-21 — literal ZERO emoji achieved.** `node tools/audit-no-emoji.mjs` =
`mapped-left=0` AND `gap emoji: 0 distinct` across all 16 pages. app-sweep 16/16, 0 errors.

## What shipped
- Engine: `games/data/emoji-map.js` (`window.EmojiMap`) + `UISprites` resolver (sweep +
  rAF MutationObserver + `pixiSprite` for canvas) swaps EVERY rendered emoji → DB sprite,
  app-wide, fallback-safe. Loaded on all 16 pages.
- Owner-generated sprite sheets, cropped + wired into `assets/db/`:
  `ui` (47) · `misc` (85) · `people` (128) · `extra` (49, incl. the final skull/dice/egg/bird) ·
  `build` (117, installed). Croppers: `tools/crop-ui-sheet.py`, `tools/crop-emoji-grid.py`
  (dual white/checkerboard bg key), quadrant hand-crop for the last 4.
- Gap journey: **106 → 61 → 33 → 4 → 0.**
- A few decorative ambient/no-art emoji mapped to the nearest accurate DB sprite (🦐/🦞→crab,
  🪼→jellyfish[exact], 🦑→octopus, 🦭→dolphin, 🏊→person); underwater diver source-changed
  from the ZWJ `🏊‍♂️` to a single glyph so the resolver swaps it.

## Keeping it at zero
`node tools/audit-no-emoji.mjs` is the permanent gate — run it in the ship suite. If a new
emoji is introduced without a sprite, it shows as a gap; add the art to `assets/db/<cat>` and
a `char → 'cat/NN'` line to `emoji-map.js`.
