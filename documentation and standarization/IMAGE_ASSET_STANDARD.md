# Image Asset Standard — Dunia Emosi

**Rule: every served image is a local WebP. No CDN.** Enforced by
`tools/audit-image-formats.mjs` (in the ship checklist).

## WebP vs CDN — decision (owner asked "webp or cdn, mana yang optimal")
**Local WebP wins for this app.** Reasons specific to Dunia Emosi:
- It's an **offline-capable PWA** — `sw.js` precaches/serves same-origin assets. A
  CDN adds a cross-origin network + DNS dependency that **breaks offline** and adds
  latency for tiny sprites.
- Assets are already small same-origin WebP the service worker caches; a CDN buys
  nothing and adds a failure point + a hardcoded-origin hazard (cf. the earlier
  `/Dunia-Emosi/` path regressions).
- A CDN only wins for large, globally-distributed, cache-busting media — not kids'
  game sprites.

## State of the repo (2026-07-12)
The app is **~99 % WebP already**: **3,226 tracked WebP** vs a small set of
grandfathered PNG/GIF. Non-served scratch (`prompt/`, `tools/qa-screenshots/`) is
kept out of Vercel deploys by `.vercelignore` (≈475 MB saved) and isn't fetched by
users on GitHub Pages (unlinked).

## Rules
1. **New game art → WebP.** Photographic/illustration art: lossy `quality≈82–88`.
   **Pixel art** (SMB tiles, retro sprites): **lossless WebP** (`lossless=True`) to
   avoid edge-color bleed.
2. **Keep as-is (documented exceptions):**
   - **PWA/browser icons** (`favicon-32`, `icon-192/512`, `apple-touch-icon`,
     `*-maskable`, `g23-icon`) — the manifest + `<link rel>` expect PNG; tiny.
   - **Animated GIFs** (e.g. `pikachu-*.gif`, `tr-balloon.gif`) — animation fidelity;
     migrate to animated WebP only if verified on the target tablet.
   - Grandfathered legacy sets in the gate's `GRANDFATHER` list (small, shipped).
     Migrate opportunistically; do **not** add new categories there.
3. **Size budget:** flag any served WebP > **260 KB** for review (the gate warns).
   Backdrops intentionally kept crisp for tablet (`train/backdrop/level*-1600.webp`)
   are allowed to exceed it.
4. **Never** point an asset at a third-party CDN/hotlink for core UI. (Existing
   `pokemondb.net`/`pokemonshowdown` sprite fetches are optional enrichment with
   local fallbacks — not core.)

## Pipelines (reusable)
- **Sheet crop → bordered WebP:** `tools/crop-db-sheets.py` (scipy border-flood
  white-bg removal + keep-largest-component + de-fringe + autocrop + thin sticker
  outline + WebP q88). Used for the 600-sprite `assets/db/` set (A-356).
- **GIF → frame WebP DB:** the A-354 particle/explosion extraction (PIL frame
  iterate + trim + downscale + WebP), served by `games/vfx-engine.js`.
- **Bulk recompress:** re-encode an over-budget WebP with PIL `save(...,quality=82)`
  (lossy renders) — e.g. the g23 Pokémon set went 4.6 MB → 74 KB with no visible
  loss (verify with a montage screenshot before committing).

## Gate

### Literal sheet extraction and safe publication (2026-09-30)

- Inventory every supplied sheet and every skipped or merged region. Preserve
  distinct drawings with source-suffixed keys instead of overwriting a reused
  name. Record byte-identical duplicate sheets and restricted-art exclusions.
- Preserve source RGB and white paint. Border-connected paper removal may use
  measured source-local masks; a global white-key operation is unsuitable for
  white hulls, clothing and sails. Inspect complete outputs on light and dark
  backgrounds, including enclosed gaps, captions, wheels and rigging.
- Require valid geometry, nonempty crops, decoded dimensions and compression
  quality before publishing any member of a batch. An error on the last sheet
  must leave the previously published assets and both indexes intact.
- The Mojo and Timmy ingesters use `tools/asset_transaction.py`. Full-index
  publication locks index read/merge, renders both indexes before promotion,
  stages assets, and restores backups after ordinary I/O failures. Failed
  recovery retains backups and reports their paths. Symlink/duplicate targets
  are rejected. This does not claim atomic recovery after power loss.
- Preserve unrelated categories during a merge. The legacy Timmy top-view
  ingest defaults to top views and cannot replace the reviewed HQ side views.
- Run `tools/qa-asset-transaction.py`, `tools/qa-tk-art.py`,
  `tools/qa-mojo-art.py` and `tools/qa-asset-index.mjs` for relevant changes.
  Source-dependent checks explicitly skip if the owner's archived originals
  are unavailable; synthetic failure/rollback checks still run.

The [Mojo source catalogue](../docs/MOJO-ASSET-CATALOGUE.md) distinguishes
preserved illustrations and component panels from implemented game mechanics.

```
node tools/audit-image-formats.mjs      # 0 un-allowlisted PNG/JPG in tracked assets/ ; warns on >260KB WebP
```
Scans **git-tracked** rasters under `assets/` (what actually deploys). Extend
`ALLOW` / `GRANDFATHER` only with written justification.
