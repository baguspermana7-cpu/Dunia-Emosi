# Kereta Pemberani = the Mojo maze, reskinned (owner decision 2026-10-10)

Owner, after rejecting the custom train maze ("jauh sekali dari yang saya mau", "kan bisa belajar adopt dari mojo
maze"), chose: **use the Mojo maze engine** — same screens, board, buttons, hint ladder, Tunjukkan Caranya,
failure feedback, effects as games/mojo-swoptops.html; only the vehicles (Linus, Samson, Malivlak, Dragutin,
the silver streamliner, Defeatist Limited + wagons), the backgrounds (Codex train art) and the stories
(Brave Locomotive, Malivlak, Lomba ke Kota) change. NOT a rewrite, NOT a fork of the UI.

## Approach: a "pack" on top of Mojo, not a copy
1. Read games/mojo-swoptops.js/.html/.css, games/prog-grid.js (delivery engine already has loco, wagon, couple,
   rider, parcel, stop, gate, key...), games/data/mojo-levels.js (incl. the delivery levels d1–d15 with Malivlak
   wagons and Diesel), games/data/mojo-art.js, mojo-board-look.js, mojo-fx.js, mojo-menu.js. Find how the hero
   vehicle art, the narrator chip (Bo), the level set, the region map and the backgrounds are chosen.
2. Add the smallest possible pack switch (e.g. `games/mojo-swoptops.html?pack=kereta` or a thin
   `games/kereta-pemberani.html` that loads the SAME Mojo scripts plus `games/data/kereta-pack.js`) that swaps:
   level set + regions (one region per storyline/chapter), hero art (top-down train sprites from
   TrainSprites.pick: top-n/e/s/w; wagons trail as in the existing loco/wagon delivery types), narrator chip art
   and name (Henry McCloud / Masinis Berpipa / Kilat), backgrounds (assets/kereta/bg/*), result/intro card art.
   Everything else is Mojo code untouched. If Mojo hard-codes something, make it configurable in Mojo (with its
   own gates still green), don't fork it.
3. Levels: port the 64 kereta levels' STORY (titles, goals, cast, questions from soal-pack-kereta.js) onto Mojo
   level data using prog-grid object types (rail = road cells, cargo = parcel, passengers = rider, stations =
   stop, signals/gates = gate/key, wagons = couple). Follow Mojo's level rules: one concept per level, restricted
   palette + prefill early, slots ≈ shortest+2–4, beats for long story levels, decoys only after the concept.
   Verify every level with prog-grid's solver (qa-prog-grid style).
4. Entry: the Lokomotif Pemberani tile opens a hub with the 4 storylines (keep the existing hub page look only
   if it already matches Mojo's menu; otherwise use Mojo's menu/region map skinned), the 4th card = the classic
   game unchanged.
5. Retire games/kereta-play.js / kereta-board.js / kereta-grid.js once the pack replaces them (keep the shared
   assets, kereta-cast staging data, soal-pack-kereta.js).

## Rules
- Sprites: use the existing DB keys; main is re-cutting them without the white ring — don't touch assets.
- No emoji; kid-safe rules as before; women only with hijab.
- Gates: all existing Mojo gates stay green (qa-prog-grid, qa-mojo-interactions, qa-mojo-board-look, qa-mojo-fx,
  qa-mojo-art), plus a pack gate: every kereta level solvable, opens with zero page errors, hint ladder +
  show-me work, hero sprite faces its heading.
- Before reporting: play one level per storyline with real input at 390x844, 844x390 and 1280x800; look at the
  frames. One checkpoint at a time; report under 150 words with the file list. Don't commit.
