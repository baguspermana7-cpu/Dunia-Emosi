# DB-Sprite Wiring Loop — adding a new illustrated category to g5/g7/g12

Repeatable process to move a g5 match-mode (and g7/g12) from emoji → illustrated DB sprites.
The engine is now **data-driven**: g5 renders DB sprites for **any `DBLabeled` group** (game.js
`g5DbCards` + the `_g5db = DBLabeled.groups().indexOf(g5SubMode)>=0` gate). So per category the
only real work is: get art → crop → add the labeled group. No per-category g5 code edit.

## The loop (per category C)

1. **Art** — generate `db-<sheet>.png` from the prompt in
   `Documents/temporary/game asset/G1-G12_ENHANCEMENT_ASSETS.md` (GAYA SENI + 10×10 grid, pure-white bg,
   tiny label under each). Drop into that folder.
2. **Crop** — add C to the `SHEETS` dict in `tools/crop-db-sheets.py` (or reuse `crop-math-monsters.py`
   idiom) → run → `assets/db/<cat>/NNN.webp` (white-flood removal + de-fringe + thin white outline + WebP q88).
3. **Montage-verify** — `montage assets/db/<cat>/… -label '%f'` → read by eye; only label sprites you are
   visually SURE of (accuracy rule — never teach a wrong name). Ambiguous → leave as decor only.
4. **Label** — add group C to `games/data/db-labeled.js` `DATA` as `[spriteId,'Nama']` pairs (montage-verified).
5. **Wire** — *(automatic)* g5 sub-mode `C` now renders sprites; g7 (`DBLabeled.all()`) + g12 silhouettes
   pick it up too. No code change needed if the g5 sub-mode tab name === the group name.
6. **Verify** — every `DBLabeled.all()` path resolves 200; SPA 0 console errors; `node tools/qa-shared-engines.mjs`;
   `node tools/qa-regression-sweep.mjs` 10/10; `node tools/qa-math-adventure.mjs` 28/28.
7. **Ship** — commit; bump `?v` on changed JS (+ sw CACHE_VERSION only if batching); push.

## Milestones for sayur / profesi / warna (+ more)

- **M1 — DONE (2026-07-14, no art needed):** g5 wiring made data-driven; **warna** now renders crisp CSS
  colour swatches (side A) ↔ colour name (side B) — colours need no sprite. Loop doc written.
- **M2 — BLOCKED on art (you generate `db-words-extra`):** sayur, profesi, anggota-tubuh, pakaian, olahraga,
  alat-musik, sekolah → crop to `assets/db/words/` + add DBLabeled groups → auto-wire g5/g7/g12.
- **M3:** ship each category as one loop turn (per-category commit).

## Categories & where the art comes from

| g5 mode | current | target | art source |
|---|---|---|---|
| hewan/buah/makanan/benda/kendaraan | ✅ DB sprites | — | existing `db-creatures`/`db-objects`/`db-vehicles` |
| **warna** | ✅ CSS swatches (M1) | done | none needed (colours) |
| **sayur / profesi** | emoji | DB sprites | `db-words-extra` (M2, pending your generation) |
| sekolah / alam / cuaca | emoji | DB sprites | `db-words-extra` / `db-sci2` (M2) |
| emosi | ✅ db/faces | richer | `db-faces2` (P11, optional) |

## Guardrails
Additive + emoji/swatch fallback always (a mode with no DB group falls back cleanly). Accurate labels only.
Never touch the Pokémon/train games. Re-run the 3 gates after each category. See
`DB_SPRITE_INTEGRATION.md` for the accessor API + the label-accuracy rule.
