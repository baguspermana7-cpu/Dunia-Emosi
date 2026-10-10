# Shared VFX library + per-game integration — brief (2026-10-10)

Owner (Indonesian, twice): "game pertarungan pokemon itu effect serangan, projectile itu sangat kurang immersive
saya ada banyak visual effect, tambahkan pada game pokemon juga, dan juga titanic, stinky and dirty, mojo, garasi
tempur dan blippi dan juga game2 lain game kereta semuanya, dan pastikan sesuai align dengan gameplay. semua fx ada
disini, di organized dan di data agar bisa dipakai kembali utk game2 lainnya yang lebih immersive."
= Pokemon battle attack effects and projectiles are far from immersive. Use the owner's many VFX in Pokemon, Titanic,
Stinky & Dirty, Mojo, Garasi Tempur, Blippi and all train games, aligned with each game's gameplay. Organize them as
DATA so every game can reuse them.

## Sources
- Raw packs: `/home/baguspermana7/Documents/temporary/uiux/visual effect/` (4,595 files).
- Codex's organized catalogue (read first): `.../visual effect/sudah organized/VFX-CENTRAL-DATABASE.md`,
  `database/effects-catalog.json` (id, source_path, sha256, dims, frames, tags, animation.kind, blend_mode,
  license.status/credit, blippi_safe), `database/blippi-safe.json`, `curated/`.
- LICENSE GATE (hard): ship only `cc0`, `public-domain`, `owner-supplied-internal`, and `restricted-product-only`
  (embedded in the game with credit, never as a downloadable pack). `unknown` (~3,700 files, e.g. "VFX Free Pack",
  SlashFX, Pipoya LightPillar, "Effect and FX Pixel All Free") = discovery only UNTIL you find and read the license
  file inside that pack's folder (readme/license.txt) and it permits use in a free web game; record the exact
  license text path and terms in the database. If no license text exists, do not ship it.

## Build (Dunia-Emosi repo, shared by all games; game1/Blippi loads it same-origin via ../Dunia-Emosi/)
1. `assets/vfx/<id>.webp` — web-ready derivatives: frame sequences packed into ONE horizontal spritesheet per
   effect (lossless/near-lossless WebP, trimmed, max 256 px frame for big bursts, 128 for small), static textures as is.
   Keep total size modest (target < 25 MB; the site must stay under GitHub Pages' 1 GB, it is ~753 MB now).
2. `games/data/vfx-db.js` (window.VFXDB) + `assets/vfx/vfx-db.json`: id, file, frames, cols, fw, fh, fps, loop,
   blend, anchor, scale hint, tags (fire, water, electric, grass, ice, rock, psychic, normal, impact, hit, slash-soft,
   sparkle, smoke, dust, splash, heal, shield, level-up, coin, star, confetti, portal, beam, projectile, trail...),
   kid_safe, license {status, credit, file}, source sha256.
3. Extend the existing shared engine `games/vfx-engine.js` (window.VFX — read it first: domAura, domProjectile, ...)
   with `VFX.play(id|query, {x,y,parent,scale,blend,rotate,onDone})`, `VFX.projectile(id, from, to, {trail, impact})`,
   `VFX.pick({tags, kid_safe:true})` — DOM sprite with CSS steps() animation or canvas when the game already has one;
   pool nodes, cap concurrent effects, preload per scene, respect prefers-reduced-motion (fade only), clean up.
4. `credits.html` (or a credits panel in the parents' area) listing every shipped pack with its license/credit.
5. Gate `tools/qa-vfx-db.mjs`: every db entry decodes, frame math matches the sheet, license is a shippable status,
   no kid-unsafe tags shipped (no blood, gore, skull, weapon, real explosion of people); `VFX.play` cleans up; cap holds.

## Integrate, aligned with gameplay (one game at a time; gate + one before/after frame sheet each)
1. Pokemon battle first (G10 "Pertarungan Pokemon" `games/` — find its attack code; also Quick Fire, Evolusi Math,
   Gym Pokemon): per Pokemon TYPE a wind-up aura, a projectile that travels from attacker to target, an impact burst
   on hit, a type-coloured trail, a crit/super-effective extra; miss = a soft whiff; heal/shield for status moves.
   Timing must match the existing damage/HP-drain and sound; nothing may block input longer than today.
2. Garasi Tempur (`games/gt-fx.js` already has a type grammar: swap its procedural bursts for library sprites where
   better, keep its caps and gates `qa-gt-fx.mjs`).
3. Titanic / Timmy (`games/timmy-kapal*`, `games/tk-*`), Stinky & Dirty (`games/stinky-dirty*`), Mojo board
   (`games/mojo-fx.js`) and chase (`games/mojo-chase-fx.js`), train games (Balapan Kereta, Lokomotif Pemberani,
   Selamatkan Kereta, Museum), then Blippi (game1, child-safe set only: blippi_safe = true).
Kids' rules everywhere: no blood, skulls, weapons, dynamite, spikes, scary effects; explosions only as soft cartoon
puffs/sparkles; respect reduced motion; 60 fps at 4x CPU (p90 <= 20 ms) during the busiest effect.
Do NOT git commit/push — main reviews and commits per game.
