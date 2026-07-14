# DB Sprite Integration — where the A-356 asset DB is wired into the games

The 600-sprite asset database (`assets/db/`, 6 categories × 100 WebP, built by
`tools/crop-db-sheets.py`) is surfaced to the learning games through two shared
accessors. This doc records **which game uses which category**, the API, the
label-accuracy rule, and the documented emoji-only exceptions.

## Shared accessors (M-303: one shared engine, never per-game hardcoded)

| Module | Global | Purpose |
|---|---|---|
| `games/data/db-sprites.js` | `window.DBSprites` | Raw path/pick over the 6 categories. `path(cat,n)`, `pick(cat)`, `pickN(cat,k)`, `categories()`. Sprites are **unlabeled** — use only where a name is not required (counting, visual matching). |
| `games/data/db-labeled.js` | `window.DBLabeled` | Curated Indonesian labels over a **confident subset**. `groups()`, `label(g)`, `pick(g)`, `question(g)` → `{src,answer,choices[4]}`, `all()` → `[{id,group,cat,n,name,src}]`, `count(g)`, `total()`. |

### DBLabeled groups (137 labeled items)

| group | DB category | count | used by |
|---|---|---|---|
| `hewan` | creatures | 48 | g5, g7, g12 |
| `buah` | objects (1–20) | 16 | g5, g7, g12 |
| `makanan` | objects (21–40) | 14 | g5, g7, g12 |
| `benda` | objects (41–100) | 24 | g5, g7, g12 |
| `kendaraan` | vehicles | 19 | g5, g7, g12 |
| `sains` | science | 16 | g7, g12 |

## Game-by-game wiring

- **g4 Hitung Binatang** — counts illustrated with `DBSprites` (`creatures` for
  animals, `objects` for things). Visual only, no names needed.
- **g5 Dunia Mimpi (match pairs)** — `g5DbCards(mode,k)` in `game.js` maps any
  DBLabeled group (`hewan/buah/makanan/benda/kendaraan/sains`) to `{id,dbsrc,label}`
  cards. Emoji fallback if a mode lacks enough labeled items for the difficulty
  (max 10 pairs at `hard`). `emosi` sub-mode uses `db/faces` via `emoFaceSrc()`.
- **g7 Tebak Gambar** — `g7BuildPool()` appends `DBLabeled.all()` as picture→word
  questions with **same-group decoys**. New `kendaraan`/`sains` groups flow in
  automatically.
- **g12 Tebak Bayangan** — ~half the round pool is `DBLabeled.question(group)`
  rendered as a **black silhouette** (`filter:brightness(0)`) with readable name
  choices; answering reveals the full-colour art. Emoji-silhouette questions
  (`SHADOW_ITEMS`) remain the other half / fallback.

## The label-accuracy rule (non-negotiable)

DB art is unlabeled, so `DBLabeled` only contains items whose identity is
**visually unambiguous and kid-recognizable**. Every label was montage-verified
by eye (`montage assets/db/<cat>/… -label`) before being trusted. Ambiguous
sprites (colour-variant cars, the repeated boy character in `faces` 31–60,
lookalike animals) are **left out** — never teach a wrong name.

Cross-group name collisions are avoided (e.g. the science lightbulb/tree/flower
were skipped because `benda` already owns `Lampu`/`Pohon`/`Bunga`).

## Emoji-only exceptions (documented, not a regression)

`sayur` (vegetables) and `profesi` (professions) have **no clean DB category**
(objects has no vegetables; `faces` 31–60 is one repeated character), so their
g5 sub-modes stay on the existing emoji sets. This is intentional.

## Asset-usage optimality (P10 audit, 2026-07-13)

Owner: "pastikan sprite database, vfx database gif dll digunakan se-optimal mungkin."
State of the pipeline (already optimal where noted):
- **Formats:** all DB + VFX assets are WebP (A-357); >260KB gate `audit-image-formats.mjs`.
- **VFX load:** `vfx-engine.js loadTex()` memoizes per-effect (`_tex`/`_pending`) and lazy-loads
  on first `burst`/`aura` — no re-fetch, no eager preload. Frame counts in the REGISTRY match disk.
- **DB img decode:** g1/g4/g5/g7/g12 `<img>` carry `decoding="async"` (+ `loading="lazy"` on the
  off-screen match-grid + bubble sprites); the active g7 question image loads eagerly.
- **Coverage:** creatures/objects/vehicles/faces/science all rendered (g4/g5/g7/g12). VFX registry
  effects are all callable presets (incl. `spark1`) — available to games; none is broken.

**Documented reserve / exceptions (not a regression):**
- `assets/db/elements` (100 sprites) = RPG/economy **UI icons** (coin/gem/heart/star/trophy/chest/…),
  NOT quiz-able content. Kept as a reserve icon set (alternative to `assets/math/icons`); intentionally
  not wired into a game. If adopted later for economy theming, un-reserve here.
- `sayur` / `profesi` stay emoji (no clean DB set) — see above.

## Gates

- `tools/qa-g12-dbshadow.mjs` — silhouette renders + reveals, 4 name choices, emoji path intact, 0 errors.
- `tools/qa-regression-sweep.mjs` — 10/10 Pokémon+train games clean (never break the good games).
- `tools/qa-math-adventure.mjs` — 24/24 (math game unaffected).
- Path integrity: every `DBLabeled.all()` `src` resolves 200 (137/137 verified on disk).
