# Kereta routes: longer, winding, still on-story (owner 2026-10-12)

Owner (verbatim): "Secara NPC, skenarionya udah oke, tapi jalurnya rata-rata masih lurus dan pendek-pendek, cuma
sekitar dua sampai tiga langkah aja. Jadi kurang menantang. Mungkin jalurnya bisa dibuat lebih bervariasi, misalnya
kayak huruf H. Jadi lurus dulu beberapa langkah, kemudian turun ke bawah beberapa langkah, baru belok ke kanan, dan
seterusnya ... dibuat lebih panjang dan ada variasi arah ... Namun, jalurnya tetap harus align sama skenario."

Applies to the three train storylines on the Mojo engine: brave (games/data/kereta-pack-levels.js), malivlak
(kereta-pack-levels-malivlak.js), hellbent (kereta-pack-levels-hellbent.js).

## Targets (measured on the solver's SHORTEST solution per beat, PG.solve)
- moves = number of movement commands; turns = number of direction changes along the route.
- Chapter-1 opening levels (first 2 of a storyline): moves >= 6, turns >= 1.
- Every other level: moves >= 8, turns >= 2. At least a third of a storyline's levels: moves >= 11, turns >= 3
  (H / S / U / zig-zag shapes: along, down, along, up ...). Big/multi-beat levels count per beat.
- No dead-straight beat except a deliberate wait/timing beat (say so in a comment).
- Routes stay ON-STORY: the rails go where the scene says (gorge trestle, tunnel, pond, station, wheat field,
  depot, festival). Objects keep their story meaning and order; sub-goals sit ALONG the route so the child passes
  them in story order. Use branches/dead-ends sparingly so there is a real choice, never a maze for its own sake.
- Grids may grow (rows 4-6, cols 8-10) if the board still fits 1280x800 and 844x390 without scrolling and tags
  do not overlap. Keep slots = shortest + 2..6 and the 3-star budget reachable (existing gate rules).
- Palette must contain every command the solution needs. If moves get long, it is fine for a level to offer the
  engine's repeat/loop card if the engine supports it (check games/mojo-swoptops.js); do not invent engine code.

## Gates
`QA_STORY=<story> node tools/qa-kereta-pack.mjs` (localhost:8081 serving Dunia-Emosi) and `node tools/qa-prog-grid.mjs`.
The route-shape check (moves/turns per targets above) is added to qa-kereta-pack.mjs by the BRAVE agent only.

## Laptop heat: ONE browser gate at a time across all agents
Wrap every browser gate / screenshot run in: `flock /tmp/claude-1000/kereta-browser.lock <command>`.
