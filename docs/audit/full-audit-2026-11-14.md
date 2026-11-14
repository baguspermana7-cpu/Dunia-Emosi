# Full audit — 2026-11-14 (v64.51)

Run with the Claude Code Game Studios audit checklists (asset-audit, content-audit, consistency-check, tech-debt,
security-audit, perf-profile static, smoke-check/ux-review through the existing browser gates), adapted to a
zero-build web game. Detail per area:

- `docs/audit/2026-11-14-assets-content.md` — orphans, missing assets, precache, reachability, names, content rules, PRD drift
- `docs/audit/2026-11-14-debt-security-perf.md` — security/privacy (child audience), tech debt, static performance

Every finding was re-checked on the unfixed tree before it was accepted (a grep count is not a finding).
CCGS scanner output: `code-markers.sh` 206 TODO / 6 FIXME, **all in vendored film packs and `games/lib`** — own code 0.

## Runtime gates run as part of the audit (local, v64.51 tree)

| Tag / gate | Result |
|---|---|
| content (content-rules, game-a11y, instruction-companion, no-emoji, sprite-fill, white-outline) | 6/6 pass |
| calm: breathe, freeze-card | pass (breathe passed on retry) |
| calm: feeling-checkin | 26/28 → see A-12 |

## Findings and status

Severity: CRITICAL / HIGH / MEDIUM / LOW. **Fixed** = shipped with a gate that failed first.

| ID | Sev | Finding | Status |
|---|---|---|---|
| A-1 | HIGH | Google Fonts at runtime on hub + 19 pages; never cached (SW skips cross-origin) → child's IP to Google on every launch, fallback font offline. 6 more pages (Timmy, Mojo, Stinky, Garasi, film-play, mojo-chase-embed) asked for Nunito and never loaded it at all | Fixed v64.52: `assets/fonts/` (15 woff2, 368 KB, latin+latin-ext) + `fonts.css` on 26 pages, precached; `qa-no-third-party` L2 |
| A-2 | HIGH | Hub loaded PixiJS from `cdn.jsdelivr.net` (`pixi.js@8` floating, no SRI) → no hub GPU effects offline | Fixed v64.52: local `games/lib/pixi.min.js?v=8` (8.18.1, already precached); L3 |
| A-3 | MEDIUM | Sprite fallbacks to `img.pokemondb.net`, `play.pokemonshowdown.com`, `raw.githubusercontent.com` (31+ sites); Gym fetched 94 trainer sprites from Showdown on every visit; Pokemon Bawah Laut used 41 Showdown GIFs | Fixed v64.52: trainers + GIFs vendored (`assets/Pokemon/trainer/`, `assets/Pokemon/showdown-ani/`), every other fallback points to the local pokeball; L1 = 0 hosts on 26 pages. Five trainers Showdown never had (cissy, danny, drake, luana, rudy) now show their lead Pokemon instead of a 404 (`qa-regression-sweep` caught the same-origin 404) |
| A-4 | LOW | No privacy headers | Fixed v64.52 on Vercel: `Referrer-Policy: no-referrer`, `nosniff`, `Permissions-Policy` (camera self — train-shared uses it). GitHub Pages cannot set headers. CSP not added: every page relies on inline scripts, so a CSP would need `unsafe-inline` and add little |
| A-5 | MEDIUM | Player name rendered unescaped into innerHTML (`game.js:2477`, `:4084`); 21 local escapers, two skip quotes | Fixed v64.52: one `escHtml` (quotes too) at both sinks; `sd-engine` `esc` now quote-safe (it fills `aria-label="..."`); `ejaan-inggris` `esc` fills text only, left as is. `qa-name-escape` red on v64.51 (1/4: 4 injected `<img>`, handler ran), green after |
| A-6 | MEDIUM | Gym shows 42 female trainers without hijab (owner rule) — live before via the CDN; Pokemon Run's Team Rocket pool shows Jessie | Fixed v64.52: `HIJAB_SWAP` (42) in `gym-pokemon.html` — card, welcome card, battle portrait and every retry show the lead Pokemon, never the sprite file; Jessie left Pokemon Run's pool. `qa-gym-hijab` red on v64.51 (2/8: 42 sprite requests), green after |
| A-7 | MEDIUM | Missing assets: `assets/mario-pokemon/icon.png` (level-select shows a broken image with emoji alt), `bg-game7-bayangan.webp`, `banner-game21.webp` | Fixed v64.52: level icon = local mushroom sprite (alt no longer an emoji); the missing game-7 background layer removed (render unchanged: the file never loaded); banners only for games that have one. `qa-local-refs` now checks every asset literal in `game.js`/`style.css`: red on v64.51 (2), green after |
| A-8 | MEDIUM | Same game, different names (hub tile vs `GAME_META`): G25, G22, G13c | Fixed v64.52: `GAME_META` follows the visible tile name (G10 Pokémon, G13c Gym Pokémon, G25 Matematika Petualangan; G22 already matched, only its tooltip differs). `qa-game-names` (CI) red 3 → green |
| A-9 | MEDIUM | 353 orphan asset files, 23.1 MB (incl. copyrighted film score, `.eps`, Godot project, `__MACOSX`, 185 prompt `.md`) | Planned v64.54 after checking game1 (shares these assets) |
| A-10 | LOW | 17 dead functions in `game.js` | Planned v64.54 |
| A-11 | LOW | PRD file Status lines out of date vs README (8 files) | Fixed (docs) |
| A-20 | — | `qa-tk-board-look` idle frame at 4x CPU failed during the audit runs (66.7 ms vs 18) | Not a regression: same 66.7 ms on v64.51 and on the R1 tree back-to-back at load 19-22 (other sessions' browsers). Re-run when the machine is quiet |
| A-21 | MEDIUM | Gate runner: its own HTTP server died mid-run under load and every later gate failed `ERR_CONNECTION_REFUSED` (R1 run: 5 gates) | Fixed: `run-gates` checks the server before each gate and restarts it (logged, counted in the summary). Proven by killing the server mid-gate: restart 1, retry pass, next gate pass |
| A-22 | MEDIUM | Three Mojo gates were not wired and had gone red on live v64.51: `dunia-music.js` not precached (no music offline), two unit gates stale (`fxCall`, `setInterval` missing in their sandbox) | Fixed v64.52: precached; sandboxes updated; all three in `ci-verify.sh` |
| A-12 | — | `qa-feeling-checkin` read the skip button at 46 px: sampled mid-entrance (scale 0.95 → 1), not a small button | Gate fixed: waits for finite animations; 28/28 |
| A-13 | MEDIUM | Sound setting read in 17 files / 21 sites; 14 separate speech implementations | Planned v64.55: one `DuniaSettings.soundOn()` / one speak helper |
| A-14 | MEDIUM | 257 direct localStorage calls; `balapan-kereta-side` saves outside save-engine | Planned v64.55 |
| A-15 | LOW | Always-on timers without a hidden-tab pause (kereta-life, dunia-cinema-pixi, dunia-home, kereta-pack, kuis) | Planned v64.55 |
| A-16 | LOW | 44 `<img>` in `index.html` without width/height | Planned v64.55 |
| A-17 | MEDIUM | 297 distinct emoji in source not in `emoji-map.js` (static candidates; runtime gate is strict on 7 pages only) | Planned: widen the runtime gate to every page, then map/replace what renders |
| A-18 | MEDIUM | God files: `game.js` 14,960 lines, `balapan-kereta.html` 7,476 | Planned: split along existing section banners, one file per release, gates before/after |
| A-19 | LOW | `sw.js` comment "SHELL ~800 KB" (really ~8.7 MB); `CACHE_VERSION` never bumped | Comment fixed v64.52. `CACHE_VERSION` left on purpose: URLs carry `?v=`; bumping it would make every tablet re-download all cached assets |

## Owner decisions (not changed without a yes)

| ID | Question |
|---|---|
| O-1 | `games/kereta-maze.html` ("Kereta Pemberani: Petualangan Rel") and through it the classic `lokomotif-pemberani.html` are unreachable: tile 15 now opens the Mojo kereta pack. Keep hidden, or give it a tile? |
| O-2 | G6 Petualangan Mobil and G17 Jembatan Goyang exist but have no hub tile. Keep hidden, or add? (new menu entries need your name for them) |
| O-3 | Cloud sync (`math-cloud.js`) is dormant; if ever switched on it uploads names + progress with no parent gate, and loads `supabase-js@2` from a CDN. Keep dormant, or design a parent-gated version? |
| O-4 | `games/_shell-smoke.html`, `plb.html`, `secondbrain.html`, `proposals/` are deployed dev pages (plb/secondbrain/proposals still load Google Fonts and unpkg). Remove from deploy? |
| O-5 | Four Pokemon OST mp3s (6.7 MB) are ripped commercial music (`SoundLoadMate.com` in the name). Keep? |
