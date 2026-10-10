# Kereta Pemberani — maze side game: brief (2026-10-10)

Owner (Indonesian): "di game kereta pemberani itu ... mau saya buat side game, jadi di game ini akan ada seperti
game maze yang seperti di mojo tapi game alurnya seperti cerita film brave locomotive, ada story line gantian atau
bersamaan Linus dan Samson. ... improve mazenya dengan sangat immersive dan creative, variatif, complete dengan vfx
dan effect lainnya. ada 3 story line: ... brave locomotive dan malivlak, yang Hellbent (election) itu kamu aja buat
... storyline [Malivlak] untuk kamu ubah jadi permainan maze grid seperti mojo, pastikan sesuai dengan storyline.
yang storyline Brave Locomotive akan saya berikan setelah ini. ... pastikan crop gambar kereta yang saya kasih taruh
di database itu bisa dipakai untuk beberapa kondisi orientasi."

## 1. Sprites into the SHARED database (first; reusable by every game)
Sources (transparent RGBA, 25 views each, ~5x5 layout; look at each sheet first):
- `~/Downloads/Brave locomotive _name_Linus_Blue locomotive sprite sheet with paired eyes.png` (Linus, blue)
- `~/Downloads/Brave locomotive _name_Samson’s 25-view steam locomotive sprite sheet.png` (Samson, dark)
- `~/Downloads/malivlak_name_malivlak Vintage red-orange locomotive sprite sheet.png` (Malivlak)
- `~/Downloads/malivlak_name_Dragutin Green Train Sprite Sheet-2.png` and `..._Dragutin Vintage green railcar sprite atlas-1.png` (Dragutin)
- `~/Downloads/HEllbent _name_win the war speed Bespectacled Silver Locomotive Sprite Sheet-1.png` (silver streamliner)
- `~/Downloads/HEllbent _name_hellbent Mournful vintage steam train sprite sheet.png` (sleepy "Defeatist Limited" engine)
Layout seen by main: rows 1–2 = front, front 3/4 left/right, side left/right, rear, rear 3/4; row 3 = TOP-DOWN views
(nose up / down / left / right and a diagonal) — the maze needs these; rows 4–5 = expressions (happy/neutral/angry/sad)
in front and 3/4. Cut by alpha (reuse/extend `tools/kark_extract.py`; never global colour-key), drop the dark
background halo if any, sticker outline like other library art (`tools/mojo_outline.py`), shared baseline per view set,
same scale per character. Name every crop SEMANTICALLY with orientation + expression, e.g.
`train-char/<char>/top-n|top-e|top-s|top-w|top-ne`, `.../front`, `.../front-34l`, `.../side-l`, `.../side-r`,
`.../rear`, `.../rear-34l`, `.../face-happy`, `.../34l-angry`, … and store `view`, `facing` (deg), `expression`,
`anchor`/`baseline`, w/h in `assets/db/index.json` + `games/data/asset-index.js` (one database). Provide a tiny helper
`games/data/train-sprites.js` (`TrainSprites.pick(char, {facing, view:'top'|'side'|'front', expression})` → key) so
any game asks "Linus facing east, happy, top view" instead of hard-coding filenames. Note in the DB which views are
missing for a character (e.g. no top-ne) so callers fall back gracefully. Hellbent sheets carry printed text
("WIN THE WAR SPECIAL", "DEFEATIST LIMITED 1929"); keep as drawn. One contact sheet per character; look at each.

## 2. The side game — "Kereta Pemberani: Petualangan Rel" (maze/coding grid like Mojo)
Entry: from the Lokomotif Pemberani game (G15, `index.html` tile gtile-15 → openLevelSelect(15); find its menu) add a
clear "Petualangan Rel" side-game card, plus its own page `games/kereta-maze.html`. Study Mojo first and REUSE, don't
fork blindly: `games/prog-grid.js` (grid engine: commands, run, failure reasons, delivery types rider/parcel/wagon/
loco/couple/gate/signal...), `games/mojo-swoptops.js` + `mojo-board-look.*` (board diorama, LOOK table, depth),
`games/mojo-fx.js` (board VFX), the shared `SoalEngine`, `SFXEngine`, `VFX`, save engine (per-avatar). Trains move
on RAIL tiles: the child builds the route/plan (arrows, switch points, couple/uncouple, stop/wait, whistle) and runs
it; the engine turns the sprite by direction using the top-down views; switches, signals, tunnels, bridges, slopes.
Story chapters (pick one on a chapter map; per-avatar stars; everything open like Mojo):
- **Malivlak** — `~/Downloads/Dragutin_Malivlak_20_Skenario_Detail.md`: turn EACH of the 20 scenarios into one level
  whose goal = that scenario's endpoint (e.g. 02 load passengers/luggage/letters then close doors; 04 bring three
  wagons over the bumpy track; 06–07 off-rail field → pond → back on land (fun, never scary); 09 bird in the chimney;
  11–12 tunnel + the bear becomes a passenger; 14 bandage the wheel; 16–17 pass the welcome party and switch the
  signal; 19 wreath and medal; 20 museum). Dragutin appears where the story has him (01–05). Short Indonesian
  story card before and a payoff after each level. Kid-safe: the driver's pipe is never shown smoking; the bear is
  friendly; nobody is hurt.
- **Hellbent ("Lomba ke Kota")** — author 8–10 levels yourself: a kid-friendly race-to-town story between the bright
  silver streamliner and the sleepy old "Defeatist Limited" engine who keeps wanting to give up; theme = don't give
  up, help each other (no politics, no war content beyond the text printed on the sprite). Use it to exercise the
  TWO-TRAIN mechanic below.
- **Brave Locomotive (Linus & Samson)** — the owner will send this storyline next. Now: build the chapter shell and
  the TWO-TRAIN mechanic it needs — "gantian atau bersamaan": levels where the child plans Linus and Samson TAKING
  TURNS (one runs, then the other) and levels where both run AT THE SAME TIME (shared clock, collision/ordering
  rules, coupling, one waits at a signal for the other). 2–3 demo levels with neutral placeholder story text marked
  "draft until owner storyline".
Immersive and varied (cheap, transform/canvas): biome per chapter (station, countryside, pond, mountain/tunnel,
town square, museum), animated steam puffs, wheel/rod motion, whistle and chuff sounds (WebAudio synth), signal
lamps, sparks/dust on switches, birds, the bear, confetti/medal payoff, reduced-motion respected, 60 fps at 4x CPU
(p90 <= 20 ms; machine is loaded by other agents — rerun once before chasing a timing failure).
Questions: optional SoalEngine checkpoints (e.g. a signal box asks a maths question to open), kind on wrong answers.

## Rules
Kids: no emoji (sprites/SVG), no woman without hijab, no skull/weapons/dynamite/spikes/blood, nothing scary.
Offline: new files in `sw.js` SHELL with the current `?v=` token (add only your lines). Gates: `tools/qa-kereta-maze.mjs`
(every level solvable by its reference plan, real-pointer play of one level per chapter, two-train turn + simultaneous
cases, sprite facing matches direction, save/stars per avatar, zero page errors, reduced motion) and a qa for the
sprite DB (every key decodes, view/facing metadata present, contact sheet). Run gates one at a time; read `tail -3`.
Other agents edit: games/vfx-engine.js + Pokemon games (VFX agent), games/mojo-chase*.js (racing agent) — don't touch.
Do NOT git commit or push. Report under 300 words with gate lines and contact-sheet paths.
