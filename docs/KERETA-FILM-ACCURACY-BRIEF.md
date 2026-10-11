# Lokomotif Pemberani — match the films (owner, 2026-10-12)

Owner on the tablet, with film stills: "Lihat kembali filmnya agar interpretasinya ke game scenario bener2 tepat."
The films are in ~/Downloads:
- Malivlak: `YTDown.com_YouTube_Media_JQRy2Qv7lyM_Mali-vlak-Dragutin-Vunak-1959_003_480p.mp4` (10:30)
- Brave Locomotive: `YTDown.com_YouTube_Media_l8mScKWj3kQ_The-Brave-Locomotive_003_480p.mp4`
Frames every 3 s with timestamps are already extracted: `docs/ref-malivlak/mv/f*.jpg` (+ `sheet01..05.jpg`, 8x6 grids)
and `docs/ref-malivlak/bl/f*.jpg` (+ sheets). The owner's own stills: `docs/ref-malivlak/*-image.jpg`. Extract more
frames around a moment with ffmpeg when you need detail (`ffmpeg -ss 00:02:55 -t 10 -i <film> -vf fps=2,scale=480:-1 out%02d.jpg`).
Study the whole film for each storyline BEFORE changing levels; for each level write one line in
docs/KERETA-BRAVE-ALIGNMENT.md (a Malivlak section) "film mm:ss → level beat".

## Owner's specific corrections
1. **Malivlak sc 6–7 (mv06/mv07, film ~2:50–3:10):** a tall WHEAT FIELD that sways (animated stalks, not a flat
   green board) that the train ploughs through, and right after it a POND/LAKE in front that the train MUST cross;
   in the pond Malivlak is SUBMERGED — only the top 10–20% (chimney + cab roof) shows above the water, ripples around
   it, then it comes out on the far bank. The man in purple lying in the field with his suitcase is in this scene.
2. **Grid lines always visible:** every kereta board (all storylines) draws a thin, subtle cell grid
   (e.g. 1px, ~15–20% contrast, also on dark/night moods) so the child can count moves. Owner: "Batas gridnya nggak
   begitu terlihat. Kamu harus selalu kasih walaupun tipis."
3. **Bird in the chimney (mv09):** the bird nests ON Malivlak's chimney (owner stills: a bird sitting in a nest on
   top of the red chimney; the smoke puffs then push the nest/bird off). Redesign the level so the nest is on the
   hero's chimney, not on a separate cell.
4. **Tunnel (mv11):** the tunnel mouth is a stone arch with a SKULL warning sign on a post beside the track, exactly
   as in the film still. OWNER OVERRIDE of the earlier "no skull" rule, for this sign only (cartoon, the film's own
   prop). Record it in the kid-safe table of KERETA-BRAVE-ALIGNMENT.md.
5. Then sweep every other Malivlak and Brave level against its film moment and fix what the board does not show
   (places, props, which characters, what happens). Same for the beats' cinematics/VFX.

## Rules
- Files: the level files (games/data/kereta-pack-levels*.js), games/data/kereta-story.js, kereta-pack.js (ground /
  ambient / grid), kereta-pack.css, tools/qa-kereta-pack.mjs. Engine hooks inert without ?pack=.
- Gates: `QA_STORY=brave|malivlak|hellbent node tools/qa-kereta-pack.mjs` all green; `node tools/qa-prog-grid.mjs`.
- Report after items 1–4 together, then after the sweep: under 200 words, a 1280x800 + 390x844 sheet you LOOKED at
  next to the matching film frame, gate lines, files. Don't commit, no git stash. Main bumps the cache token.
