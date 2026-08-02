# Film Anak — offline show-games section

A landing "Film Anak" zone → hub → full-screen player for owner-supplied offline HTML5
games (Thomas + Batwheels, crawled from toongo.io). Added 2026-08-02.

## Surfaces (Dunia side — must stay zero-emoji + pass gates)
- `index.html` → `.wmap-zone--film` zone (banner + Batwheels/Thomas/Lihat-Semua nodes → hub/player).
- `games/film-anak.html` — hub: claymorphism grid, one card per game (thumb + name) → player.
  Game list is the `THOMAS`/`BATWHEELS` arrays in the inline `<script>`.
- `games/film-play.html?g=<slug>` — full-bleed borderless `<iframe>` (100dvw×100dvh, no chrome)
  + floating translucent back-circle (auto-dim). `GAMES` whitelist gates the slug.
- `assets/film-thumbs/<slug>.webp` — card icons (owner's official show art, 270×152).

## Games (`games/film/<slug>/`) — self-contained, relative paths, code unmodified
Engines vary: Phaser (most batwheels, `HEIGHT_CONTROLS_WIDTH` 1920×768 landscape-lock),
PixiJS/WebGL (`batwheels-by-you`), Construct 3 (`batwheels-pranking-prank`), custom-canvas
(`thomas-rail-muddle`). All render a full-bleed `<canvas>` → the player's 100dvh iframe gives
full-screen, no border, no crop (game scales itself; height fills, width flexes = bg extends).

## Verify — `node tools/qa-film-games.mjs`
Boots every `games/film/*` directly, asserts a sized `<canvas>` + 0 real console errors.
IGNORES headless-only noise (device-OK): crawl 404s, swiftshader WebGL fallback, webm/audio
`EncodingError` decode. Uses ANGLE-swiftshader + 16s boot wait. Green = all games functional.

## SW / size
Games are BIG (~196 MB raw). NOT in the SW SHELL precache — they cache-on-visit via the
existing cache-first fetch handler. `games/film/` is git-ignored until the final compressed
commit (see re-sync).

## "Siapkan Offline" — per-game offline installer (v59.89)
Cache-on-visit is NOT offline capability: several games load assets only when a specific
level/scene is played (gotham-getaway pulls a per-level theme pack + Spine skeletons per
level), so a child who played level 1 online got a broken race on levels 2-5 offline. And
before v59.89 the SW's `activate` deleted every cache that was not the current
`CACHE_VERSION`, so an app deploy wiped everything the child had downloaded.

- `tools/build-film-manifests.mjs` — **RE-RUN THIS WHENEVER ANY FILE OF ANY FILM GAME
  CHANGES** (added / removed / edited). It walks the WHOLE folder — deliberately, because
  whole-folder enumeration is the only guarantee the level-gated assets are covered — and
  writes `games/film/<slug>/offline-manifest.json` (per-file path + size + content hash)
  plus the combined `games/film/offline-index.json`. Idempotent; `--check` exits 2 if the
  manifests are stale. A stale manifest means the hub either misses new files or
  false-flags an installed game as out of date.
- `games/film-offline.js` — `window.FilmOffline`: `status / install / remove / estimate /
  persist`. Downloads a game into its OWN bucket `dunia-film-<slug>` (6 in flight,
  resumable, cancellable). Install state lives INSIDE that bucket at
  `__offline-state.json`, so it is atomic with the data it describes. Installer requests
  carry `X-Dunia-Offline: 1` so the SW steps aside instead of duplicating every byte into
  `dunia-assets-*`.
- `sw.js` — `activate` preserves every `dunia-film-*` key across version bumps; `fetch`
  serves `/games/film/<slug>/**` cache-first from that bucket (`ignoreSearch`, so a game's
  `?hash` cache-busters still hit). Manifests stay network-first (they are the staleness
  oracle). A cache miss falls through to the pre-existing strategies unchanged.
- Invalidation is by CONTENT, never by app version: `manifest.hash !== state.hash` → the
  card offers "Perbarui".

## Verify offline — `node tools/qa-film-offline.mjs`
Installs a small game + `batwheels-gotham-getaway`, then **kills the HTTP server** and
plays them — so one un-cached byte is a hard `ERR_CONNECTION_REFUSED`, not a silently
served response. Drives gotham through its real UI (Title → PLAY → Intro → SKIP →
LevelSelect) into a race on levels 1/3/5. Also bumps `CACHE_VERSION`, re-activates the SW
and proves the install survived and still races offline. 8/8 green as of v59.89.

## GAME EDITS (must RE-APPLY after any re-copy — re-sync wipes them)
1. **Scale FIT (anti-crop)** — 3 games are fixed 1920×768 and overflow/crop narrow screens:
   - `batwheels-breakdown` + `batwheels-gotham-getaway` (Phaser): in `main-*.bundle.js`
     `sed -i 's/Phaser\.Scale\.ScaleModes\.HEIGHT_CONTROLS_WIDTH/Phaser.Scale.ScaleModes.FIT/g'`
   - `batwheels-playroom` (createjs): in `assets/src/Main.js` change `sRatio =yRatio;` →
     `sRatio = Math.min(xRatio, yRatio);`
   The other 6 games are already responsive (canvas = viewport). Verify: canvas ≤ viewport
   at 4:3 / 16:10 / portrait (no overflow).
2. **by-you webp** — `img/foxjpg_2x.json` `meta.image` must say `foxjpg_2x.webp` (see compression).
The player's HOME button + FIT letterbox handle the rest at the shell level (film-play.html,
NOT wiped by re-sync).

## UNIVERSAL FIT WRAPPER (film-play.html — the real fix for stretch/zoom/crop on device)
Owner's WIDE RETINA tablet showed games zoomed/cropped/stretched: each engine's own scaler,
fed a huge/odd device viewport at high DPR, over-scales. Fix = **iframe locked to each game's
fixed DESIGN size** (so the game's scaler sees a sane native window = no internal zoom), then a
CSS `transform: scale(min(vw/W, vh/H))` centered = letterbox-fit to the real screen. Engine- +
DPR-agnostic. Aspect always preserved, whole design always visible = zoom/crop/stretch impossible.
Per-game design map `DIM` in film-play.html (measured via `tools/_qa-dim.mjs`):
- Phaser 1920×768: breakdown, gotham-getaway, playroom
- 16:10 1440×900: jigsaw, match-up  ·  1280×800: toy-trouble, thomas-rail-muddle
- 16:9 1280×720: by-you, pranking-prank  (default 1280×720 for anything unmapped)
Verify geometry: `node tools/_qa-fit.mjs` (loads player at wide-retina, asserts frame ≤ vp,
centered, no page-scroll). If a NEW game is added, measure it + add a DIM entry.

## RE-SYNC RUNBOOK (owner finalizes games in a parallel session → run this to ship them)
Source: `/home/baguspermana7/Documents/temporary/online game to be offline` (batwheels/ + thomas/).
1. Re-copy: `batwheels/games/batwheels-* → games/film/`; `thomas/game/rail-muddle → games/film/thomas-rail-muddle`.
   Copy any NEW games too. Thumbs: `batwheels/assets/thumbs/*.webp` + `thomas/assets/rail-muddle.webp → assets/film-thumbs/`.
2. If the game set changed: update the `THOMAS`/`BATWHEELS` arrays in `film-anak.html`, the `GAMES`
   whitelist in `film-play.html`, and (optionally) the landing preview nodes in `index.html`.
3. Compress: `pngquant` in-place on every `games/film/**/*.png` > 500 KB (keeps filenames → no ref
   changes). Biggest win: `batwheels-by-you/img/fox*_2x.png` (~36 MB). Re-verify after.
4. `node tools/qa-film-games.mjs` → ALL PASS. Then `node tools/qa-app-sweep.mjs` (existing 16) +
   `node tools/audit-no-emoji.mjs` (Dunia surfaces clean).
5. Un-ignore + commit games: remove `games/film/` from `.gitignore`, `git add games/film assets/film-thumbs`,
   bump sw, commit + push.
6. Screenshot hub + player + a couple games for owner review.
