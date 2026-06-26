# Load-Audit Report — 2026-06-26 (post v55.0)

Read-only audit of every network/async load in the user-facing path. Scope: `index.html`, `game.js`, `games/*.html`, `games/*.js`, `games/data/*.js`, `sw.js`. No `auth.js` exists. Dynamic `import()` count: 0.

## Inventory

| # | File:line | URL / pattern | Timeout | Retry | UI-surfaces error | ~KB | Blast radius |
|---|---|---|---|---|---|---|---|
| 1 | `games/data/battle-modes.js:1480` | `assets/Pokemon/pokemon-db.json` (literal) | **YES** 15s AbortController | **YES** 3 tries, 800/1600 ms backoff | warn() only, no UI | 80 | G13C boot, PvP/Tournament draw |
| 2 | `games/data/sfx-engine.js:157-158` | `{basePath}/pokemon_attack_sfx_manifest.json` + `attack_move_sfx_manifest.json` | **NO** | **NO** | `.catch` warns + flips ready=true (silent) | 453 + 480 = **935** | All Pokemon SFX site-wide |
| 3 | `games/data/cloud-sync.js:88-100, 109, 149, 161` | Supabase REST `${cfg.url}/rest/v1/shared_progress` | **YES** 8 s | **NO** | silent degrade | small | Cloud progress merge (currently no-op — `CLOUD_SYNC_CONFIG` never set) |
| 4 | `sw.js:53-54` (install) | `SHELL[]` = 9 same-origin files | n/a (browser fetch) | n/a | `.catch(()=>{})` — install resolves anyway | ~800 | SW registration; non-blocking, page still works |
| 5 | `sw.js:95, 110` (fetch handler) | every same-origin GET | n/a | n/a | falls back to cache, then `/Dunia-Emosi/` | n/a | Network-first HTML, stale-while-revalidate assets — safe |
| 6 | `games/g21-pixi.html:611-678, 709` | 27× `assets/mario-pokemon/sprites/*.png?v=…` via `PIXI.Assets.load`, **sequential `for…await`** | **NO** per-texture | **NO** | try/catch sets null, warns | ~3 total | **G21 (Mario Pokemon) cannot start** — single hung load freezes the boot await |
| 7 | `games/g22-candy.html:166-173, 244` | 8× pokeball PNGs via `PIXI.Assets.load`, parallel `Promise.all` | NO | NO | `.catch` sets null, fire-and-forget | ~50 | Cosmetic — gameplay continues with Graphics fallback |
| 8 | `games/g14.html:2281, 2468` + `g14-side.html:632` + `g6.html:258,618` | character WebP/PNG via `PIXI.Assets.load` | NO | NO | placeholder drawn first; `.catch` warns | varies | Cosmetic — procedural placeholder already on screen |
| 9 | `games/g19-pixi.html:623-639` (`loadImageTexture`) | wrapped `new Image()` | NO | NO | `img.onerror` rejects | n/a | **Dead code** — defined but never called; bird uses DOM `<img>` directly |
| 10 | `games/g16-pixi.html:415` | character `spriteUrl` via `new Image()` | NO | NO | `onerror` → procedural fallback | small | Cosmetic |
| 11 | `games/g23-pixi.html:948-951` (`_scheduleGifRetry`) | GIF probe with cache-bust | implicit (3-try ladder) | **YES** 1/3/9 s | none — silent | small | Cosmetic — only retries WHEN already on HD fallback |
| 12 | `games/data/poke-sprite-loader.js:108-200` (`attachSpriteCascade`) | priority-cascade probes | **YES** 8 s overall + 3 s primary | parallel race (not retry) | falls back to emoji data URL | varies | Picker/HUD sprite — graceful emoji fallback |
| 13 | `games/g14.html:3211-3212` | `fetch(dataUrl)` where dataUrl is `data:` from canvas | n/a — sync data URL | n/a | wrapped in try/catch | n/a | Share button only — no network |
| 14 | `index.html:32` `<audio preload=none>` + 6 standalone games with `preload="auto"` for BGM/SFX (6.9 / 7.5 MB Gen-1 BGMs in g19, g20, g23) | n/a — browser-level | n/a | n/a | n/a | up to **7 500** | Bandwidth burn, not JS-blocking — but slow 3G stalls audio readiness |

`bg-events.js` Promises (5) and `obstacle-engine.js` Promises (2) are pure `setTimeout`/`requestAnimationFrame` animation drivers — not loaders. Excluded.

## Prioritized recommendations

### P0 — game cannot open
None remaining after v55.0 fixed `loadPokeDB`. Owner's "stuck on Memuat Pokedex…" surface area is closed.

### P1 — game opens, feature broken (FIX NEXT)

1. **G21 Mario boot freeze (row 6).** `loadAssets()` is a sequential `for (const [k,u] of …) { await PIXI.Assets.load(u) }`. `PIXI.Assets.load` has no default network timeout. If any one of the 27 sprite fetches hangs (SW poisoning, partial cache, broken DNS), the await never resolves and the `<div id="loading">` spinner stays forever. Recommend: wrap with `Promise.race([Assets.load(u), timeout(5000)])` AND convert the loop to `Promise.allSettled` for parallel loading + per-texture isolation.

2. **SFX engine 935 KB without timeout (row 2).** Same failure shape as the v55.0 battle-modes bug owner just paid for. The catch handler silently flips `state.ready=true` only AFTER the network resolves — if it hangs, every `await SFXEngine.init()` callsite waits forever (and there are 3 init sites: `index.html:2233`, `g13c-pixi.html:566`, `g23-pixi.html:408`). Recommend: port the battle-modes AbortController+3-retry pattern verbatim. Lowest-risk surgical fix.

### P2 — cosmetic / already-safe (monitor only)

- Cloud-sync (row 3) is dead code today; harden later when keys land.
- Audio preload (row 14) — replace `preload="auto"` with `"metadata"` on the 7 MB BGMs to save mobile data, but it doesn't block JS.
- Rows 7, 8, 10, 11, 12 already have placeholder/fallback so a hung load is visible-but-playable.

## What NOT to touch

- `game.js` itself has zero direct fetches — all loading flows through the libraries above.
- `sw.js` cache strategy is correct (network-first HTML, slim 800 KB SHELL post-v55.0). Don't expand SHELL.

End — 41 fetch/async sites surveyed; 2 actionable hardening targets.
