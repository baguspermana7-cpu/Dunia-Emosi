# EMOJI_GAP — art status (zero-emoji program)

Updated **2026-07-21**. Engine `games/data/emoji-map.js` + `UISprites` resolver swaps
every mapped emoji → DB sprite across all 16 pages. Gate: `node tools/audit-no-emoji.mjs`
= `mapped-left=0` everywhere.

## Progress
- Owner-generated sheets cropped + wired: **ui (47)**, **misc (85)**, **people (128)**,
  **build (117, installed)**. Cropper: `tools/crop-ui-sheet.py` (ui, labeled) +
  `tools/crop-emoji-grid.py` (dense sheets, dual white/checkerboard bg key).
- Gaps: **106 → 33** (69% closed). Every remaining glyph is low-frequency + decorative;
  none are quiz content.

## Remaining 33 (still emoji — need a clean index or cleaner regen)
`node tools/audit-no-emoji.mjs` → `tools/qa-out/emoji-gaps.json` for the live list.

**build scenes** (sheet installed at `assets/db/build`, but the sheet is 117 near-identical
house/building variants → can't index one cell = one concept reliably from it):
🏛 museum · 🏙 city · 🏖 beach · 🌉 bridge · 🏫 school · 🚧 construction · 🏗 crane ·
♨ hot-spring · 🌑 new-moon · 🌌 night-sky · 🌬 wind · 🌧 rain

**people actions** (installed `assets/db/people`, generic avatars already wired; these are
distinct poses hard to pinpoint in 128 look-alike cells):
🤝 handshake · 🏃 runner · 🎓 graduate · 💪 muscle · ⚕ medical · 🤔 think · 🧠 brain

**misc props** (in `assets/db/misc`, ambiguous cells):
🎭 masks · 🃏 joker · 💀 skull · 🪝 hook · 🐾 paw · 🛢 oil-drum · ⛓ chain · 🔱 trident ·
🎲 dice · 🐚 shell · 🍳 fried-egg · 🐦 bird · 🛺 rickshaw · 📍 pin

## To finish the last 33 → literal zero
Best path = **regenerate these ~33 as ONE clean sheet**: transparent PNG (real alpha, NO
gray checkerboard), NO text labels, one icon per cell, 6×6 grid, sticker style. Then I crop
with `crop-emoji-grid.py` + map exactly → audit hits 0 gaps. The current dense multi-variant
sheets are the blocker to precise indexing, not the engine.
