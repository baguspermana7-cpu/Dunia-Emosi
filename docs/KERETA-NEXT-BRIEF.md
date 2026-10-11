# Lokomotif Pemberani — next work (owner on the tablet, 2026-10-11)

Game: `games/mojo-swoptops.html?pack=kereta` (hub `&hub=1`, tile gtile-15). It is the Mojo maze engine with a
pack: `games/mojo-pack.js`, `games/data/kereta-pack-levels.js`, `games/data/kereta-pack.js`,
`games/data/kereta-cam.js` (main's: standing Linus + Bo/Mojo renames — keep), `games/kereta-pack.css`. Engine hooks
in `games/mojo-swoptops.js`/`mojo-fx.js` must stay inert without `?pack=`. Read first:
`docs/KERETA-BRAVE-ALIGNMENT.md` (scenario→level map, kid-safe rules, immersion checklist),
`docs/KERETA-ON-MOJO-STATUS.md`, the storyline mds in ~/Downloads (`The_Brave_Locomotive_Linus_30_Skenario_Detail.md`,
`Dragutin_Malivlak_20_Skenario_Detail.md`). Done and live: Brave sc 1–16 aligned, moods, terrain, flags, cast gate.

Owner's words driving this list: "Bener2 realistic dan cinematic align" · "Nggak jelas sub mission pada grid dan
indicator dan vfx — sangat2 immersive dan clear" · "masak batubara di atas kepala ... ambil yg belakang dulu nggak
bisa" · "harusnya ngebut, ngerem mendadak ada kura2, kura2 jalan baru lanjut, efek asap banyak saat rem" · "NPC jangan
statis, buat bergerak, parallax overlay, trik keren, lihat Mojo tapi improve" · "ada 4 storyline: Brave Locomotive,
Malivlak, Hellbent dan game original — ini cuma ada 2" · "bukan judulnya Linus karena ada 3 storyline + game ori".

## Do in this order; report after EACH with a 390x844 + 1280x800 frame sheet you looked at
1. **Sub-goals readable on the board, no reading needed**: pick-up things carry a floating picture bubble + glow
   ring; each destination shows a translucent GHOST of the item where it lands; ordered stops are big numbered posts
   with the next one pulsing; the top goal chip becomes a picture checklist ("0/3") that ticks with a pop; on
   completion a sparkle burst, the marker flies into the checklist, a sound; the final goal glows once all are done.
2. **Carry realism + any order**: carried cargo sits IN the tender/wagon behind Linus (never on his head); pick-ups
   and deliveries work in any order the child plans — check `games/prog-grid.js` carry rules and the solver; keep
   qa-prog-grid green.
3. **Hub with 4 storylines** under the title "Lokomotif Pemberani": Brave Locomotive (Petualangan Linus), Malivlak
   (its 20 scenarios, its own cast `malivlak-char/*`, Dragutin), Hellbent "Lomba ke Kota" (silver streamliner vs the
   sleepy "Defeatist Limited", author 8–10 levels, theme: don't give up, help each other; no war content beyond the
   sprite's printed text), and the original game card unchanged. Everything open. The in-game logo/landing names the
   chosen storyline. Build Malivlak ch.1 and Lomba ke Kota ch.1 first so all four cards play, then the rest.
   Cast gate: each storyline uses only its own cast.
4. **Cinematic story beats**, starting with bl04 (sc 4): Linus speeds (speed lines, steam streaming), the turtle
   on the rail, SUDDEN BRAKE (big brake smoke + sparks, Linus squashes forward, Henry lurches in the cab), slow-mo,
   the turtle walks across, then Linus continues. Same treatment for every beat: a short zoom/pan of the board
   container toward the event (never tilt the grid), letterbox fade for story moments, easing with weight, VFX from
   the shared bank (`games/vfx-engine.js`, `games/data/vfx-db.js`, `games/vfx-moments.js`).
5. **Living NPCs + parallax**: every cast figure/animal idles (breathing, sway, head tilt, a blink-like squash,
   periodic pose swap), deer graze and step, birds hop and fly off when Linus passes, a foreground fringe
   (grass/leaves/flowers) at the board edge with a slight parallax drift, cloud shadows sliding over the board, dust
   motes. Start from `games/mojo-board-look.js` idle system, make it better.
6. **Alignment step 3 + chapter 6** of KERETA-BRAVE-ALIGNMENT.md (bl03, bl07, bl15, bl16 small fixes; bl19/bl20;
   sc 25–30).

## Rules
- Kid-safe: no gun/chain/whip/skull/blood; women only with hijab; no emoji; no white sticker ring on any art.
- Board stays flat (owner: "Gridnya jangan dimiring2in"); Linus stands (kereta-cam.js).
- Transform/opacity only, off under prefers-reduced-motion; keep the board responsive.
- Gates: `node tools/qa-kereta-pack.mjs` green; `qa-prog-grid` green when touching prog-grid. Server: localhost:8081
  serves this repo.
- The working tree also has someone's uncommitted Mojo racing files (games/mojo-chase*, vfx-db, vfx-engine) — do
  not touch or revert them. Don't commit; no git stash. Main reviews, plays and pushes. Live token is
  v63.67-20261011a; main bumps it.
