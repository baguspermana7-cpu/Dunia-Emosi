# MASTER PLAN — Dunia Emosi AAA redesign + Math story/tournament/account program

Owner brief (2026-07-14): recreate the supplied design mockups 100% (Figma-exact, AAA kids-mobile
quality — the official-spec prompt applies to every UI game below), build a SHARED HUD/scene super-engine
so all games stay theme-aligned, wire the newly-generated art (2 variants each — Gemini + ChatGPT — use
both for variety), fix 2 bugs, and design+build a big Math program (character DB, Pokémon-style tournament,
adventure story mode, Supabase account with 7 player slots).

Constraints (standing): additive/guarded, never break Pokémon/train games (regression 10/10), plb parked,
one sw bump per batch, verify visually (screenshot vs mockup), accuracy-first labels, offline-WebP.

Design mockups (source of truth) in `~/Downloads` + `~/Pictures/Screenshots`; art in
`~/Documents/temporary/game asset/1/` (Gemini_* + ChatGPT_* sheets + 5 backgrounds).

================================================================
## PHASE 0 — ASSET CROP (unblocks everything)
Crop the `/1` sheets via `tools/crop-db-sheets.py` idiom (white-flood → keep-large → de-fringe → white
outline → WebP q88), BOTH variants kept for variety:
- `db-words-extra` → `assets/db/words/` (sayur/profesi/tubuh/pakaian/olahraga/musik/sekolah) → unblocks P12/M2.
- `db-faces2` (Gemini+ChatGPT) → `assets/db/faces2/` (a+b variants) — richer emotions g1/g5.
- `db-letters` (Gemini+ChatGPT) → `assets/db/letters/` — g3/g8/g9 letter mascots + per-letter objects.
- `db-count` → `assets/db/count/` (g4), `db-road2` → `vehicles2`(g6), `db-sci2` → `science2`(g11),
  `db-breathe` → `assets/db/breathe/` (g2).
- 5 backgrounds → `assets/background/games/{jungle2,cityroad2,calmsky2,lab-space,match-garden}.webp` (parallax bands).
Montage-verify every labeled sheet; add DBLabeled groups; run the wiring loop. Variant picker: `DBSprites`
gains `variant` (a/b) so games can randomize which art shows.

================================================================
## PHASE 1 — SHARED GAME SHELL (super-engine, keystone)
New `games/game-shell.js` (`window.GameShell`) — ONE engine that renders the common AAA chrome seen across
ALL the mockups, configured per game, so themes always align. Renders:
- **Top HUD bar** (wood-ornate, gold-scroll ends): Home + Back pill buttons · title chip (icon+name) ·
  Level pill · lion-avatar chip · Pause · coin/score chip · (right) star + COMBO counter · profile avatar.
- **Backdrop**: themed full-bleed scene (jungle / sky / castle-meadow) with parallax bands + drifting
  clouds/leaves/fireflies (reuses `TrainBackdrop`/`RZParallax` idiom, `Motion` for drift).
- **Mascot speech bubble**: a corner critter (frog/bee/snail/parrot/cow) + rounded bubble; API to push
  lines (drives the math story too).
- **Hint bar** (wood plaque) + **corner hero mascot** ("Ayo Hebat! Kamu bisa").
- **Progress**: star-dot row / gem dots.
- Config: `GameShell.mount(hostEl,{title,icon,theme,mascot,level,onHome,onBack,onPause})` → returns handles
  (`setLevel/setScore/setCombo/setStars/say(text)/setHint/setProgress`). Theme tokens shared (wood browns,
  gold, candy-button palette blue/green/gold/purple) → matches math clay theme + the mockups.
Shared button kit: `.gs-candy-btn` (glossy gradient A/B/C/D from the mockups) + press/idle animation.
Doc `GAME_SHELL_STANDARD.md`. Gate `qa-game-shell.mjs`.

================================================================
## PHASE 2 — PER-GAME AAA REDESIGN (each adopts GameShell; match its mockup pixel-close)
Workflow per game (owner's Figma-exact spec): analyze mockup → spec → implement with GameShell + real art
(no emoji/placeholder; missing art → TODO) → QA screenshot side-by-side vs mockup → refine until visually
indistinguishable. Gameplay logic UNCHANGED (only presentation).
- **g3 Huruf Hutan** (mockup: jungle, frog bubble, animal-in-oval medallion, wood letter tiles `_UDA`,
  candy letter buttons K/G/F, hint plaque, "Petunjuk ×3" wand button, fox corner). Use `db/creatures`
  for the animal medallion; letter tiles + candy buttons from GameShell kit.
- **g8 Susun Kata** (2 mockups — Disney-castle glass-gem frame + jungle wood-cube; COMBINE/adopt): gem
  image frame, wood slot tray, candy letter tiles (sparkle), red backspace bar, snail/bee mascot, hero corner.
- **g9 Jejak Huruf** (mockup: stone-tablet letter trace w/ star nodes, gold trace glow, Huruf/Angka toggle,
  Hapus/Selesai clay buttons, snail + hero corners, 1/6 gem dots). Keep the pointer-trace mechanic.
- **g7 Tebak Gambar** (mockup: sky bg, parrot mascot, glass-frame animal, big gold-outline "Ayo tebak ini
  apa ya?", 4 glossy gradient answer buttons, Tebak-Gambar logo, star/coin HUD). Use `db-labeled` art.
- **g4 Hitung Binatang** (mockup: jungle, crystal-wood HUD, 6 progress dots, question card, Binatang/Pokémon
  toggle, animal group, cow mascot, 3 glossy number buttons, gold timer bar, 1/6). Keep count mechanic.
Each shipped as its own commit + screenshot proof.

================================================================
## PHASE 3 — MATH PROGRAM (kuis-matematika)
### 3a. Bug: crop double-monster
Some `assets/math/monsters/*.webp` merged 2 adjacent creatures (keep-largest grabbed touching cells).
Montage-audit all 81/100; re-crop offenders (component split by gap, or re-slice from source sheet with
tighter per-cell bbox). Gate: montage QA, no sprite contains 2 bodies.
### 3b. Character DB (heroes)
New `games/data/math-heroes.js` — hero roster with owner art:
Pahlawan(+) [current], Ksatria Pengurangan(−), Ksatria Perkalian(×), Ksatria Pembagian(÷), Putri Pejuang,
… Each: {id,name,op,art(a/b),desc}. Crop owner PNGs (`ksatria pengurangan/pembagian/perkalian`,
`Screenshot …15-21/15-32`) → `assets/math/heroes/`. **Adventure hero changes** per chosen skill/world
(e.g. pick ÷ → Ksatria Pembagian sprite). Wire into battle-arena hero slot (visual only; combat unchanged).
### 3c. Tournament = Pokémon-style
Redesign Turnamen: pick your hero, bracket of 2+ visual opponents (Pahlawan vs Dewi vs …), PvP or multi
(2..N). Characters are VISUAL ONLY (no attack FX) — the fight IS the shared math answer-sprint (existing
tournNext), higher score advances. Design the bracket/lobby concept + implement on the existing engine.
### 3d. Adventure STORY mode (learn math + reading)
Give every level-monster an Indonesian NAME + a per-level MINI-STORY: on each attack, a speech cloud from
the hero AND the monster (alternating) builds a short unique narrative to the level's end. Data:
`games/data/math-stories.js` — per world/level a story arc (intro + per-question banter + victory line),
kid-safe, unique, well-written Indonesian. Renders via GameShell speech-bubble over the battle. Monster
names from a curated list. Concept doc `MATH_STORY_STANDARD.md`.
### 3e. Account + Supabase (7 player slots)
Wire the Math **Profil** (stars/level/accuracy/streak/coins/trophies + name) to a real account. Longterm
schema, EXACTLY 7 player slots (local device profiles → cloud). Reuse the RZ Supabase pattern
([[project_rz_supabase_accounts]]): auth + `profiles` (client-read, writes via SECURITY-DEFINER RPC),
per-slot save/load, offline-first with sync. Audit current local econ/save mechanic + algo first; design
schema (players ≤7, per-player progress JSON, leaderboard). Security-reviewed. Owner runs the one-time
Supabase SQL/deploy. **Design doc first, then implement** — this is its own sub-program.

================================================================
## PHASE 4 — MONSTER CANDY bug
Game shows no objects (owner screenshots). Root-cause: `spawnCandy` likely fails to spawn / textures don't
load (assets/wants candy only has icon.png). Drive it, find why objects don't appear, fix (spawn loop /
texture path / fallback Graphics), screenshot-verify. Regression 10/10.

================================================================
## Sequencing & method
Keystone first: **P0 asset crop → P1 GameShell → P2 per-game redesigns** (g3 first as the reference, then
g7/g4/g8/g9). Math **P3** in parallel track (3a bug + 3b chars + 3d story are art+data; 3c tournament +
3e account are design-first). **P4** quick bug. Heavy visual work delegated to subagents with the Figma-exact
brief + screenshot verification; I review every screenshot vs mockup before commit. Per-game commit; batch
sw bump; gates each (regression 10/10, math 28/28, shared-engines, new qa-game-shell). This is multi-session
— run under the IMPROVEMENT_LOOP, one game/phase per iteration.

================================================================
## PROGRESS LOG (autonomous session 2026-07-15)
SHIPPED + committed on main (gates green throughout: regression 10/10, math 28/28,
shared-engines OK, shell smoke PASS):
- **P4 Monster Candy** FIXED — timer subtracted raw PixiJS frame-delta not seconds → game
  ended (~1s) before first candy spawned. `S.timeLeft -= dt/60`. Drive `tools/qa-monster-candy-drive.mjs`.
- **P3a math double-monster crop** FIXED — mon-29/30/38 held 2 stacked creatures → re-cropped
  single-subject via `tools/fix-double-monsters.py` (erode bridge → largest component → full-mask
  reclaim → outline). mon-9 kitsune false-alarm left as-is.
- **P1 GameShell** BUILT + verified — `games/game-shell.js` (window.GameShell v1.0.0), smoke gate
  `tools/qa-shell-smoke.mjs` renders wood HUD + jungle2 bg + frog bubble + fox cheer + star-dots
  (screenshot matches the g4/g3 mockup chrome near-exactly). NOT yet adopted by any SPA game.
- **P3b Math hero DB** SHIPPED + WIRED — `games/data/math-heroes.js` (Pahlawan +, Ksatria
  Pengurangan −, Perkalian ×, Pembagian ÷) + `byOp()`; cropped art `assets/math/heroes/*.webp`
  (rembg u2net, `tools/crop-math-heroes.py`). `startGame()` now swaps `#fh-hero` + `.br-hero`
  sprite by chosen op (verified: op `−` → pengurangan.webp).
- **P3d Math story data** SHIPPED + PARTIALLY WIRED — `games/data/math-stories.js` (100 level
  arcs: monster name + intro + alternating hero/monster banter + victory; worlds 1-3 hand-authored,
  4-10 seeded-generated; `get()`/`getByGlobal()` never empty) + `MATH_STORY_STANDARD.md`.
  `startGame()` now shows real `arc.monster` name (verified: W1-1 → "Si Guruh"). **Banter
  speech-clouds NOT yet wired** (needs intro-after-countdown + per-answer hero/monster cloud +
  victory line — integration points pinned in MATH_STORY_STANDARD.md §4-5).

### DEFERRED — needs device-level VISUAL iteration (headless SPA won't verify cleanly)
Headless can't render g3-g9 (PixiJS jungle world + the real welcome→mode→names→menu→level flow;
`openLevelSelect`+`startGameWithLevel` alone reverts to welcome / leaves content empty). So these
were NOT shipped unverified (per "verify before claiming fixed" + "don't break approved"):
- **P2 g3/g4/g7/g8/g9 mockup redesigns** — g3 ref = `~/Downloads/Gemini_Generated_Image_8t459y…png`
  (jungle, frog bubble, horse-in-glowing-oval medallion, `_UDA` wood tiles, wood hint plaque,
  K/G/F hex-gem buttons, boy-hero corner). g4 ref = `…rak2gz….png` (matches GameShell HUD almost
  exactly). g7 ref `~/Downloads/tebak gambar.png`, g8 `~/Downloads/susun kata.png`. Current g3
  already has wood word-plank + white hint + clay buttons (base + overrides at style.css 326-335,
  1518-1620, index.html 118-203) — restyle path = ONE appended `#screen-game3`-scoped block +
  medallion wrapper; do it WITH live screenshot iteration on the owner's device/localhost user-flow.
- **P3c Pokémon-style tournament** (design-first), **P3e Supabase 7-slot account** (design-first,
  reuse RZ pattern), **story-banter clouds** (P3d wiring tail).

### P0 crop label-mapping — DONE (crop) / DEFERRED (wire)
8 sheets cropped + committed (0fbf597) but the 6 Gemini sheets are 18×6=108 heterogeneous cells
(count sheet = numbers/dice/dominoes/hands/tally mixed), and `letters` is actually a WORDS sheet.
Accurate per-cell label-mapping not yet done → DBLabeled groups NOT added, assets UNWIRED (harmless).
Do the montage→label mapping before wiring (accuracy-first — never teach wrong names).

================================================================
## Open questions for owner (only if blocking)
- Supabase project: reuse the RZ Supabase project or a new one for Dunia? (affects schema/keys)
- 7 slots = 7 local profiles on one device, or 7 cloud accounts? (assume: 7 local profiles synced to cloud)
