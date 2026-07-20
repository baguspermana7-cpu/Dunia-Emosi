# EMOJI_GAP — art still needed to reach literal ZERO emoji

Status **2026-07-21**. The zero-emoji engine (`games/data/emoji-map.js` + `UISprites`
resolver) now swaps **every mapped emoji** for a real DB sprite across all 16 pages —
gate `node tools/audit-no-emoji.mjs` = `mapped-left=0` everywhere.

The **106 emoji below have NO sprite in `assets/db/`**, so they stay as emoji until you
generate art. They are almost entirely **UI-control glyphs + scene/building + people** —
none are quiz content (all animals/fruit/food/vehicles/veg quiz items already resolve to
sprites). Auto-refresh this list any time: `node tools/audit-no-emoji.mjs` →
`tools/qa-out/emoji-gaps.json`.

Generate the sheets below (your usual **10×10 dense sheet, transparent PNG, thick kid
sticker outline, flat pastel, centered per cell**). I crop with
`tools/crop-monster-sheet.py`, add the cat to `assets/db/`, extend `emoji-map.js`, re-run
the gate. Each sheet closes a whole group at once.

---

## SHEET 1 — `ui` icon pack  (highest impact — kills ~40 of the gaps, incl. 🔒×128, ⏸×41, ▶×23)
One cohesive flat-pastel UI icon set, rounded, soft shadow, kid-friendly. 40 cells:

`lock`🔒 · `pause`⏸ · `play`▶ · `prev`◀ · `next`⏭ · `rewind`⏮ · `stop` · `sound-on`🔊 · `mute`🔇 ·
`vibrate`📳 · `settings-gear`⚙ · `home`🏠 · `map`🗺 · `refresh`🔄 · `replay`🔁 · `undo`↩ · `check`✅ ·
`cross-close`❌✖ · `warning`⚠ · `alarm`🚨 · `sos`🆘 · `search`🔍 · `trash`🗑 · `edit`📝 · `write`✍ ·
`up`⬆ · `down`⬇ · `left` · `right`➡ · `point-up`👆 · `star-flag-finish`🏁 · `traffic-light`🚦 ·
`dot-green`🟢 · `dot-red`🔴 · `dot-yellow`🟡 · `timer`⏱ · `hourglass`⏳ · `calendar`📅 · `chart`📊 ·
`target`🎯 · `question`❓ · `numbers`🔢 · `letters-abc`🔤🔡 · `music-note`🎵 · `game-pad`🎮 · `upload`📤 · `link`🔗

## SHEET 2 — `build` buildings + scenes
`home-house`🏠 · `school`🏫 · `museum`🏛 · `city`🏙 · `beach`🏖 · `bridge`🌉 · `construction`🚧 ·
`crane-build`🏗 · `hot-spring`♨ · `night-sky`🌌 · `new-moon`🌑 · `wind`🌬 · `rain`🌧 · `sunrise-city`🌅

## SHEET 3 — `people` friendly kid characters
`person`👤 · `boy`👦 · `girl`🧒 · `man`👨 · `woman`👩 · `couple`👫 · `handshake`🤝 · `runner`🏃 ·
`doctor-cross`⚕ · `graduate`🎓 · `brain-think`🧠🤔 · `muscle`💪

## SHEET 4 — `misc` remaining props
`sword`⚔ · `bag-backpack`🎒 · `dice`🎲 · `abacus`🧮 · `palette`🎨 · `theater-masks`🎭 · `picture`🖼 ·
`microscope`🔬 · `hook`🪝 · `pickaxe`⛏ · `chain`⛓ · `trident`🔱 · `card-joker`🃏 · `skull`💀 ·
`ghost-monster`👾 · `paw`🐾 · `shell`🐚 · `whale`🐋 · `cat`🐱 · `bird`🐦 · `ramen`🍜 · `fried-egg`🍳 ·
`shopping-cart`🛒 · `box`📦 · `folder`🗂 · `oil-drum`🛢 · `ufo`🛸 · `passport`🛂 · `hearts`💗💖💕 ·
`bus`🚌 · `auto-rickshaw`🛺 · `pin`📍

---

### After you generate
Drop the sheet(s) in the temp asset folder + tell me the grid. I crop → `assets/db/<cat>/` →
extend `emoji-map.js` → `node tools/audit-no-emoji.mjs` should then report **0 gaps** and the
app is literally emoji-free. Until then these ~106 glyphs remain as emoji (safe fallback, no
blanks) and everything else is already sprite art.
