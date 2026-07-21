# EMOJI_GAP — art status (zero-emoji program)

Updated **2026-07-21**. Engine `games/data/emoji-map.js` + `UISprites` resolver swaps
every mapped emoji → DB sprite across all 16 pages. Gate: `node tools/audit-no-emoji.mjs`
= `mapped-left=0` everywhere.

## Progress — 106 → 4 (96% closed)
- Owner sheets cropped + wired: **ui (47)**, **misc (85)**, **people (128)**, **extra (45)**,
  **build (117, installed)**. Croppers: `tools/crop-ui-sheet.py` + `tools/crop-emoji-grid.py`
  (dual white/checkerboard bg key).
- **Remaining 4** — 💀 skull · 🎲 dice · 🍳 fried-egg · 🐦 bird. These were on the owner's
  clean sheet but the auto-crop merged/dropped them (adjacent-blob merge). 5 total occurrences
  in the whole app; stay as emoji fallback. To finish: hand-crop from the sheet OR regen those
  4 spaced further apart, then append `assets/db/extra/046-049.webp` + map.

### (historical) earlier remainder before the extra sheet

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
