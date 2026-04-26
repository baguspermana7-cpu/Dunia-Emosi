# Lessons Learned — Dunia Emosi

> Per session mandate 2026-04-21 (user): every fix appends a one-line lesson here. What was surprising, what was the root cause, what's the reusable rule. Symptom / Root Cause / Fix / Lesson.

---

## 2026-04-27 (evening) — Hotfix #101

### L28 — Event delegation > per-card `addEventListener` for re-rendered grids
- **Symptom**: User reported "browser crash. Selalu kle next game/next cities" — entire mobile browser crashed after 3-4 round-trips through region picker → city picker → back. Tab killed by OS, not just the page hung.
- **Root cause**: `renderRegionGrid` (game.js:12482) and `renderCityGrid` (game.js:12553) called `card.addEventListener('click', handler)` for every card on every render. `innerHTML = ...` later dropped the DOM nodes, but the closure each handler captured (city object, parent container reference, callback chain) survived in the listener registry. Each picker re-render added N new closures; nothing released the old ones. After 10 round-trips × ~30 cards × multi-KB closure footprint, mobile heap pressure tripped OOM.
- **Fix**: Single delegated listener per grid container, attached once and gated by `if (grid.dataset.bound === '1') return;` then `grid.dataset.bound = '1'`. The listener uses `e.target.closest('.region-card')` (or `.city-card`) to identify which card was tapped. Idempotent — re-renderable any number of times without re-attaching.
- **Lesson**: Any grid/list renderer that gets called more than once (re-render, navigation, language toggle) MUST use event delegation. Per-element listeners + `innerHTML` rewrite = silent heap leak: the DOM nodes go but the closure refs (and any state they captured) stay in the listener table. The `data-bound` flag pattern makes the delegated listener safely idempotent across re-renders. Audit rule: grep for `\.forEach\(.*addEventListener` over rendered cards — every match is a latent leak.

### L29 — Probe-then-swap for sprite/name atomicity
- **Symptom**: G13b user reported "label says Bulbasaur but sprite shows Pikachu" — the wild Pokemon name flipped instantly when a new wild spawned, but the sprite kept rendering the previous species for 200-1500ms while the new image downloaded.
- **Root cause**: `g13bSpawnWild` set `wspr.src = newUrl` and `wname.textContent = newName` synchronously. Browser keeps painting the old image until the new `src` finishes decoding (CSS rule: `<img>` retains last successful raster until next decode). Meanwhile `textContent` updates immediately. Net effect: stale-sprite + new-name window during every spawn.
- **Fix**: `new Image()` probe — `probe.src = newUrl; probe.onload = () => { wspr.src = newUrl; wname.textContent = newName; }`. Both DOM properties update inside `onload`, so they swap atomically once the network has the bytes. Plus 1500ms watchdog `setTimeout` so a slow/failed network never strands the spawn entirely.
- **Lesson**: Whenever you update a paired (image, label) — or any (slow-side, fast-side) DOM property pair — probe the slow side first and update both inside its `onload`. The G10 `loadSprHD` pattern (game.js:5957) is the canonical example. Same rule applies to (background-image, caption), (audio, transcript), (video poster, title). The naive `el.src = X; lbl.text = Y` pattern always creates a stale-render window proportional to network latency.

### L30 — Type-consistent gameNum keys for multi-namespace persistence
- **Symptom**: Region picker showed 0/N completed for ALL regions despite the user defeating multiple legendaries in G13b. Progress simply never appeared on the picker.
- **Root cause**: G13b is registered with `gameNum = '13b'` (string) in some code paths and `gameNum = 13` (number) in others. The city picker normalized to number `13` when calling `endGame`, so `setCityComplete(state.currentGame, ...)` wrote to `prog.g13.cities` instead of `prog.g13b.cities`. The picker reads from `prog.g13b.cities` → always empty. Two writers, two namespaces, one reader = silent data loss.
- **Fix**: Preserve the `'13b'` string at the city-picker entry point (game.js:12628-12643) so every downstream call to `setCityComplete` / `setLevelComplete` uses the same key. Also added the missing `setCityComplete('13b', ...)` + `setLevelComplete('13b', ...)` calls to the G13b legendary-defeat path, which previously only persisted on timer-survived wins.
- **Lesson**: When a key namespace has heterogeneous types (numbers `1..22` plus suffixed strings `'13b'`, `'13c'`), pick ONE canonical form at the entry boundary and propagate it untouched. Any normalization (`Number(x)`, `String(x)`, `parseInt`) inside the call chain risks aliasing siblings into the wrong bucket. Especially insidious because (a) JS lets you index objects by either, (b) silent writes to wrong key produce no error, just absent reads. Audit rule: if a `gameNum` flows through multiple modules, type it (TypeScript-style mental model) and verify every assignment.

### L31 — Probe before applying inline `style.backgroundImage`
- **Symptom**: G10 Lv.1 Round 3 rendered a "white blank field" instead of the city background. G13b reported a broken-image icon. CSS gradient fallbacks were defined on the parent class but never showed.
- **Root cause**: `loadCityBackground` set `el.style.backgroundImage = "url(" + maybe404Url + ")"`. Inline styles override CSS class rules, so a 404 URL strips the gradient fallback — the element renders the inline rule (which paints nothing for a failed URL) and ignores the class's gradient.
- **Fix**: Probe with `new Image()` before assigning. On `probe.onload`, set `el.style.backgroundImage = url`. On `probe.onerror`, leave `el.style.backgroundImage = ''` so the CSS class's gradient fallback wins via cascade. Same pattern as L29 applied to a different DOM property.
- **Lesson**: Any inline style that overrides a class fallback must be conditional on the asset actually existing. The "set inline first, hope for cascade fallback" pattern silently breaks fallbacks. For background-image specifically, probe the URL or use CSS-only declarations (`background: var(--bg-fallback) url(...)` shorthand) where the fallback co-exists in the same declaration. Also applies to `<source>` `src`, `<video>` `poster`, custom-property `--bg-image` overrides — anywhere inline trumps class.

### L32 — Standalone HTML pages need shared sprite helpers
- **Symptom**: G13c gym Pokemon were rendering 96px CDN PNGs even though the project has 1025 HD WebP sprites at 630×630. User: "Saya sudah bilang jangan pakai sprite/asset non HD." G13c is a standalone Pixi page (its own HTML file), so it can't access game.js's `pokeSpriteAlt2` helper without loading the entire 700KB+ engine.
- **Root cause**: HD sprite path computation (`POKE_IDS[slug]` + zero-pad + slug normalization) lived only inside game.js. Standalone pages either (a) loaded game.js wholesale (bloated), (b) re-implemented the helper inline (drift risk), or (c) fell back to remote CDN (96px). G13c had picked option (c).
- **Fix**: Extracted `POKE_IDS` (1025-entry slug→id map) + 5 helper fns (`pokeSpriteAlt2`, `pokeSpriteSVG`, `pokeSpriteCDN`, `pokeSpriteVariant`, `_slugToAlt2File`) into `games/data/poke-sprite-cdn.js`. ~17KB total. Wrapped as `window.*` for classic-script consumers. Standalone pages now load the small shared module via `<script src="data/poke-sprite-cdn.js"></script>` and get the exact same HD-first cascade as game.js.
- **Lesson**: When the same data table or computation is needed by both the main app and standalone pages, extract it into a small shared module (single file, no build step, classic script with `window.*` exports). Don't (a) duplicate, (b) bloat standalones with the full engine, or (c) silently degrade to a worse fallback. Audit rule: every standalone HTML page that computes asset paths should reuse the same helpers as game.js. Future standalone pages should follow this pattern by default.

---

## 2026-04-27

### L27 — `onDone`-style continuation callbacks need idempotent wrapper + watchdog
- **Symptom**: G10 hit-effect chain marked 🔧 in TODO since 2026-04-20 — "needs live verification: particles, projectile, flash, defender shake". User reported intermittent G10 freeze after one round.
- **Root cause**: `g10DoAttack` had 8+ unguarded `getElementById(...).classList/.style/.getBoundingClientRect()` calls. If ANY node disappeared mid-round (screen swap, WebGL context lost, transient DOM rebuild) the throw halted the synchronous body — defender shake setTimeout never scheduled → `onDone()` never called → next round never started. Round froze. Fallback (Task #94) doesn't help because it's at game-end level, not hit level.
- **Fix**: Section-isolate each visual phase + idempotent `_safeDone` wrapper around `onDone` + 1500ms watchdog `setTimeout(_safeDone, 1500)`. Both inner timeouts route through `_safeDone`; if either fails to fire (or DOM lookup nulls out), watchdog fires anyway. Round always progresses.
- **Lesson**: Any function that takes a continuation callback (`onDone`, `onComplete`, `onFinish`) and chains setTimeouts must guarantee the callback fires exactly once, even if the body throws partway through. Pattern: `let _called = false; const safe = () => { if (_called) return; _called = true; try { onDone() } catch(e){...} }; setTimeout(safe, MAX_DURATION)` — the watchdog timeout catches everything else. Visual gloss is optional, callback firing is not. Apply to: hit chains, animation completion, transition end handlers, any "do A then call B" flow where A involves DOM that might be torn down.

### L25 — Section-level try-catch for "must always show" UI flows
- **Symptom**: After 4 sessions of patches (Tasks #84/#94/#98), G10/G13/G13b game-end STILL fell into emergency fallback modal on every win. User: "Sama sekali tidak fix issue kamu itu". Defensive fallbacks (Task #94/#98) caught the throw but the daily UX still showed the fallback, never the real modal.
- **Root cause**: `showResult` and `showGameResult` were monolithic — 70+ lines of unguarded DOM access (`document.getElementById('x').textContent = ...`) and unguarded operations (`addXP` localStorage quota, `getLevelTier(undefined)`). A SINGLE bad sub-section threw and aborted the entire modal flow, including the critical "show screen" step. The wrapping try-catch then fell to fallback. So the fallback fired because ANY of 15+ unguarded operations could fail — not because of one specific bug.
- **Fix**: Refactored both modal engines into 7+3 isolated try-catch sections. Critical sections (text + showScreen) always run with manual fallback. Cosmetic sections (XP, confetti) log warning but don't propagate. Plus 4-second self-clearing watchdog for `_showingGameResult` flag (prevented silent early-return on retry).
- **Lesson**: When a UI flow has a "must always succeed" requirement (a result modal user is waiting for), monolithic try-catch is wrong — one failure aborts everything. Section-isolate at the granularity of "user-visible feature": text section, buttons section, persistence section, animation section. Each gets its own try-catch with appropriate severity (CRITICAL = log error + manual recovery; cosmetic = log warn + skip). Also: any flag used as "in-flight" guard MUST have a self-clearing watchdog (timeout) — otherwise a single bad section silently breaks every retry. Apply to: result modals, checkout flows, save-game routines, any user-facing "this must happen" flow.

### L26 — Don't use bonus-modifier scoring pattern for absolute-tier games
- **Symptom**: G13b "Perfect tapi bintang 3 of 5" — defeating a legendary with low kills returned 1★. User correctly called this absurd: defeating a legendary IS the win condition, kill count is a bonus.
- **Root cause**: `GameScoring.calc({correct:1, total:1, bonus:tier-5})` was used as a "perfect-run baseline minus shortfall" pattern, but G13b is threshold-tier survival — tier IS the absolute score, not a delta from perfect. The bonus-modifier indirection produced backwards math: tier 1 (low kills) → bonus -4 → 1★. Same engine being misapplied to two different scoring models (accuracy vs threshold).
- **Fix**: Direct threshold scoring in G13b (`stars = kills >= 50 ? 5 : kills >= 30 ? 4 : 3`). Documented inline that bonus-modifier pattern is for "perfect run + adjustment" (G13's evolution penalty), NOT "absolute tier" (G13b's kill-count survival).
- **Lesson**: Before applying a scoring helper, identify the game's scoring MODEL: accuracy-based (right answers / total), threshold-tier (kills, distance, time), or hybrid (perfect baseline + adjustments). The `GameScoring.calc({correct, total, bonus})` engine is for accuracy + adjustments — don't shoehorn threshold-tier into it via fake correct=1/total=1 with negative bonus. Just use direct threshold scoring (`stars = condition ? N : ...`). Same mistake pattern appears anywhere a unifying engine gets used "because it exists" rather than "because it fits". Audit rule: if you find yourself passing `correct:1, total:1, bonus:X-N`, you're misusing the engine.

---

## 2026-04-25 Evening (continued)

### L23 — Sliding frontier unlock pattern for child-friendly progression
- **Symptom**: Linear "complete level N to unlock N+1" feels rigid for kids age 5-10. But "unlock all" loses sense of journey.
- **Fix**: `unlockedCount = min(2 + completedCount, total)` per region. Two cities always playable (frontier window), each completion opens one more. Replay doesn't add count.
- **Lesson**: For child-targeted progression, use **sliding window of 2** (not 1, not all). Two visible options give choice (kid agency) without overwhelm. One completion → one new option preserves cause-effect connection. Apply to any level-select/world-map pattern: sliding-frontier gives forward momentum + agency. Pure linear (1-at-a-time) frustrates fast learners; pure unlock-all loses progression rhythm.

### L24 — Filter-tinted single asset for color variation across categories
- **Symptom**: Need 10 region cards with distinct colors. Generating 10 colored variants of same icon = 10× asset weight + maintenance burden.
- **Fix**: Single `region.webp` (256×256, 14.7KB) shared across all 10 region cards. Per-region color via CSS `filter: hue-rotate({deg}) saturate({factor}) drop-shadow(0 0 8px {color})`. Region color comes from data (`REGION_META.kanto.hueRotate=0`, `johto=25`, etc.).
- **Lesson**: Single-asset + filter tinting beats per-category asset variants when (a) icon is monochromatic-ish (Pokeball red base), (b) category count >5, (c) variations only need color (not shape). Trade-off: color subtle vs. per-asset wins on dramatic style. Apply to: badge collections, tag colors, category icons, status indicators. Avoid for: complex multi-color illustrations, brand assets, photographic icons.

---

## 2026-04-25 Evening

### L20 — Visual-overlay strategy for missing-asset progression
- **Symptom**: G13 wanted 3-stage evolution sampai Mega Evolution. Sprite Mega forms TIDAK ADA di local pack (hanya 1025 base sprites). Remote fetch melanggar Lesson L16.
- **Root cause**: Game design ingin "Mega" rasa special, tapi assets tidak tersedia. False dichotomy: "fetch remote (lambat)" vs "skip Mega (kurang puas)".
- **Fix**: Visual-overlay only — sprite stage 2 reused + CSS aura ring rotating + crown badge + 1.3× scale + audio cue. Anak-anak 5-10 tahun tidak peduli sprite "asli" Mega — mereka melihat dramatic visual = perceived power.
- **Lesson**: Saat asset progression tidak tersedia, **layer effects in CSS/JS** (aura, glow, particle, scale, badge text). Jangan compromise gameplay rasa karena asset gap. Especially powerful untuk children's games where perception > literal accuracy. Apply pattern: "asset-light progression" = same sprite + escalating visual flair per stage.

### L21 — Tier-stage gating: separate progression dimensions
- **Symptom**: G13 sebelumnya hanya 2-stage hardcoded. Adding 3-stage broke existing chain data (tidak semua chain punya Mega).
- **Root cause**: Single `evolved2` boolean was tying together both "does this chain have stage 2?" AND "do we render stage 2 at this level?". Mixing data-shape concern with progression concern.
- **Fix**: New explicit `stages: 1|2|3` flag in `G13_DIFF` (per tier). Chain data shape stays stable. Render logic checks BOTH `chain.evolved2` (data) AND `tier.stages >= 2` (gate). Same for stage 3 with `chain.mega` AND `tier.stages >= 3`.
- **Lesson**: Saat extending stage progression, separate "data exists" from "progression allows". Two boolean gates are ALWAYS clearer than one combined check. Apply to any RPG-style "does X unlock here" logic — keep DATA shape and PROGRESSION rules independent.

### L22 — Centralized helpers for cross-game settings
- **Symptom**: Multiple games (G10/G13/G13b) had INCONSISTENT enforcement of "easy mode" math rules. G13b stripped × in easy but always capped max at 20. G10 didn't gate by mode at all. Each had its own ad-hoc filter.
- **Root cause**: Settings-driven rules were copy-pasted into each game's question generator. Updates required hunting all callsites.
- **Fix**: Single `getMathLimits()` helper next to `isMathAdvanced()`. Returns `{advanced, maxNum, allowedOps}`. Every math game generator now calls it as first line.
- **Lesson**: Any cross-game user setting needs ONE helper. Pattern: `getXxxLimits()` returns canonical config object derived from `localStorage`. Every game's question/difficulty logic consumes that. Audit table in `XXX-STANDARD.md` documents which games comply. New math game added without calling helper = bug. This pattern scales: same approach should apply to player age tier, audio volume, accessibility flags, etc.

---

## 2026-04-25

### L16 — Local-first sprite policy: never call remote fetcher in grid renderers
- **Symptom**: G13B party picker (🎒) became unresponsive when opened. UI froze 5-15s, then tab crashed. Reproducible only on G13B (G10 picker worked fine despite using same overlay).
- **Root cause**: `renderPartyGrid` (`game.js:5378`) used `pokeSpriteOnline(slug)` which returns `https://img.pokemondb.net/sprites/home/normal/${slug}.png`. Trainer Ash has 41 Pokémon → 41 simultaneous remote PNG fetches + up to 41 GitHub-raw fallbacks via `img.onerror`. On slow mobile networks the connection pool maxed out, main thread blocked on image decode, and pressure built until OS killed the tab. The repo already had **1025 local HD WebP** sprites at `assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug}.webp` and a helper `pokeSpriteAlt2(slug)` (`game.js:5192`) that returned the local path. The renderer just wasn't using it.
- **Fix**: Local-first chain — try `pokeSpriteAlt2(slug)` first, fall back to `pokeSpriteOnline` only if `null`. Onerror chain gated by `dataset.fallback` to prevent loops. Added `loading="lazy"` + `decoding="async"` for browser-managed off-viewport deferral.
- **Lesson**: Any grid renderer that creates ≥10 images at once MUST use a local source by default. Remote URLs are acceptable only as fallback for missing assets. When auditing UI code, grep for `pokeSpriteOnline\|pokeSpriteCDN\|pokeSpriteBackup` in any `.forEach`/`map` over a list — if found, that's a latent multi-fetch bug. The local-first rule applies to all asset types, not just sprites: use local audio, local fonts, local backgrounds whenever the project has them.

### L17 — Modal/picker overlays must pause game-side timers (especially intervals)
- **Symptom**: User stuck in G13B party picker. Even after closing, sometimes HP was lower than before opening. During legendary battle, the wild Pokemon kept attacking while picker was up.
- **Root cause**: `openG13bPartyPicker` only added `.open` class to overlay. `_g13bLegAutoAtk` setInterval (`game.js:8402`, 14s tick during legendary fight) kept firing, calling `g13bWildHitsPlayer` which animated DOM, decremented HP, and could trigger `g13bGameOver` — all while the user thought game was paused because they were on a different "screen". The interval already had a `if (st.paused) return` guard (game.js:8410), but `paused` was never set.
- **Fix**: Set `g13bState.paused = true` in `openG13bPartyPicker` (when phase='playing') and reset to `false` in `closePartyPicker` (when ctx='g13b'). The existing flag-based guard pattern means no clearInterval/setTimeout coordination is needed — just toggle the bit.
- **Lesson**: Every picker/modal/overlay in a game with active timers must have a clear pause-on-open + resume-on-close contract. Audit checklist: opening any overlay should (a) set paused flag, (b) NOT clear pending intervals (keeps cadence), (c) gate every interval/timeout body with the flag. The same audit was done for Task #55 (G19) and Task #62 (G13B legendary) — Task #64 closes that loop for the picker entry path.

### L18 — Mobile bottom safe-area: 10vh + env(safe-area-inset-bottom) for tappable bottom UI
- **Symptom**: User reports G10 answer choices clipped by browser bottom UI bar on mobile. The 2×2 grid put the bottom row in the area where Chrome's URL bar / iOS Safari's tab strip overlapped.
- **Root cause**: `.g10-qpanel` (`style.css:2464`) used `padding:10px 16px 16px` — only 16px bottom clearance. Chrome mobile's auto-hiding URL bar can reclaim 50-60px when scrolling stops; iOS Safari's tab strip is 50px. PWA mode + viewport-fit=cover pushes content into the safe-area-inset-bottom region.
- **Fix**: Bottom padding now `max(10vh, calc(env(safe-area-inset-bottom, 0px) + 16px))`. The `max()` ensures: (a) ≥10% viewport height regardless of CSS env support, (b) safe-area + 16px when env is supported and ≥10vh fallback isn't enough. iPhone SE (667px) → 67px; iPhone 14 (844px) → 89px; both exceed worst-case bottom UI.
- **Lesson**: Any tappable UI in the bottom 100px of the screen needs `padding-bottom: max(10vh, calc(env(safe-area-inset-bottom, 0px) + 16px))` (or larger) to survive Chrome auto-hide URL bar, iOS Safari tab strip, Android nav gesture bar, and PWA notch / home indicator. Don't rely on `env(safe-area-inset-bottom)` alone — many Android browsers don't set it. The 10vh fallback handles them. Apply this to G10/G11/G13/G13B qpanels and any other "bottom-anchored interactive panel" layout.

### L19 — Multi-choice quiz layout: prefer single-row inline over multi-row grid for ≤4 choices
- **Symptom**: G10's 2×2 answer grid felt cramped on mobile and clipped against bottom UI. User wanted G13c-style layout.
- **Root cause**: 2×2 grid uses 2× the vertical space of a 1×4 inline row, putting the bottom row of choices into the danger zone (browser UI overlap). G13c (`#g13c-choices`) uses `grid-template-columns:1fr 1fr 1fr` because it has 4 move buttons + spare slot — visually compact, single tap zone.
- **Fix**: G10 changed to `grid-template-columns:repeat(4, 1fr)` with smaller per-button padding (14px 6px → was 20px 12px), font-size 24px → was 32px, min-height 60px (Apple HIG min 44pt comfortably exceeded). Responsive scaling for narrow phones (480px/400px/360px breakpoints).
- **Lesson**: For ≤4 multiple-choice answers in a kid-friendly mobile-first game, prefer single-row inline (`repeat(N, 1fr)`) over multi-row grid. Trade-offs: inline is harder for tiny tap targets — guard with `min-height: 60px` desktop / `44px` minimum mobile per Apple HIG. Save vertical space for game field + safe-area buffer. If choices are >4 or are long-form text, multi-row is fine — but reserve bottom 10vh regardless.

---

## 2026-04-24

### L13 — `position:fixed` children are NOT viewport-anchored if any ancestor has `transform/filter/perspective`
- **Symptom**: G12 Tebak Bayangan correct-answer sparkles appeared on stage floor BELOW the cards, not on the tapped card. G18 ✓ animation landed in empty space BETWEEN buttons.
- **Root cause**: Both games used `spawnSparkles` / custom effects that create elements with `position:fixed; left:{Xpx}; top:{Ypx}` at the tapped button's `getBoundingClientRect()`. CSS spec: if ANY ancestor has `transform`, `filter`, `perspective`, `will-change: transform`, or `contain: paint`, that ancestor becomes the containing block for descendant `position:fixed` — breaking viewport-anchor assumption. Dunia Emosi has `--rz-scale` transforms on game screens → sparkles rendered relative to screen instead of viewport.
- **Fix**: Created `spawnCorrectCardJuice(btn)` that attaches ring + tick + pulse as `position:absolute` CHILDREN of the button (with `btn.style.position = 'relative'` if static). Children are anchored to the button itself, so ancestor transforms don't matter.
- **Lesson**: For click/tap feedback effects, prefer `position:absolute` children of the interactive element over `position:fixed` siblings at viewport coords. The child-of-button pattern is invariant under ancestor transforms, scroll, zoom, and viewport changes. Only use `position:fixed` for global overlays (toasts, confetti falling from top) where the behavior is desired.

### L14 — Cached battle state makes mid-battle config changes invisible
- **Symptom**: User changed G13C Pokémon package mid-battle. localStorage updated, UI confirmed selection, but the battle's HP dots + sprite stayed unchanged.
- **Root cause**: `battle.playerTeam = deepCloneTeam(getCurrentPackage().team)` clones ONCE at `startBattle()`. After that, `battle.playerTeam` is the source of truth for UI; localStorage mutations don't propagate.
- **Fix**: Hide the package-switcher button during active battle. Only re-show when battle ends (via all 3 modal callbacks: `onAgain` for both win and loss paths + `onBack`).
- **Lesson**: When a game clones config into ephemeral battle state, either (a) make the config source accessible only between battles, or (b) add an explicit "refresh active state from config" path. Hiding the entry point is the simplest UX fix; re-cloning mid-battle invites state desync bugs.

### L15 — Domain-specific picker overlays should mirror existing patterns (G13C → G13 family)
- **Symptom**: Building G13's evolution-family selector from scratch vs matching G13C's package selector style.
- **Fix**: G13's `#g13-fam-overlay` + `#g13-fam-grid` + `.g13-fam-card` mirror G13C's `#pkg-overlay` + `#pkg-grid` + `.pkg-card` — same visual language, same tier-badge pattern, same auto-close timing (280-300ms). Thumbnail rendering uses the existing `pokemondb_hd_alt2/` WebP pack with CDN fallback.
- **Lesson**: When adding a new selector/picker to the app, copy the closest existing pattern rather than inventing a new one. Users already know how G13C's selector works — G13's should feel identical. Cross-game UX consistency > per-game cleverness.

---

## 2026-04-23 Evening

### L7 — Inverted downmap bug: use distinct variable names for display-scale vs persistence-scale
- **Symptom**: G13 perfect evolved run saved 3★ to progress AND displayed 3★ in modal, when should have been 4-5★.
- **Root cause**: Single variable `_g13stars` was used both for `setLevelComplete` (0-3 scale) AND assumed to propagate to `perfStars` (5-scale) display. The formula `perfStars >= 5 ? 3 : perfStars >= 4 ? 2 : 1` did the correct 5→3 downmap but the variable name was ambiguous, and nothing was preventing the downmap result from leaking into display.
- **Fix**: Split the variables. `perfStars` (5-scale) is shown to user; `_g13starsSaved` (0-3 scale) is persisted.
- **Lesson**: When a game has two star scales (display 5-star vs progress 0-3-star), use clearly distinct variable names (`starsDisplay` / `starsSaved`). Never reuse one variable across scales.

### L8 — Z-index overlay traps: always clear stale overlays in show-modal functions
- **Symptom**: G13 result modal appears but buttons don't respond.
- **Root cause**: `.g13-evo-overlay` (z-index 600) sometimes lingered over `.gr-overlay` (z-index 500), silently consuming all clicks on the modal below.
- **Fix**: At the top of `showGameResult()`, hard-clear any overlay that could possibly be above: `el.classList.remove('show'); el.style.display = 'none'; el.style.pointerEvents = 'none'`.
- **Lesson**: If a modal "appears frozen but is visible", the first suspicion should be z-index overlay trap, not the modal code. Show-modal functions should enumerate and clear every overlay class in the game that could float above them.

### L9 — Default facing assumption: distinguish local sprite pack vs CDN
- **Symptom**: G10 Charmander faced wrong direction after my refactor.
- **Root cause**: Assumed `pokeFacing` default `'L'` based on claim in TODO that "HD sprites face left natively". This was true for `/assets/Pokemon/pokemondb_hd_alt2/` WebP pack but NOT for `img.pokemondb.net/sprites/home/normal/` CDN PNGs that G10's `loadSprHD` uses.
- **Fix**: Change default to `'R'` (matches CDN) and update CSS `--flip` base values accordingly.
- **Lesson**: When multiple sprite sources exist in the codebase, document their natural facing orientations explicitly. A sprite-facing default can't be universal — it depends on WHICH source is actually being fetched at runtime. Default assumption should match the MOST-USED source.

### L10 — Stale flags captured at spawn fail after game state advances
- **Symptom**: G6 LAMPU — user already collected L, another L tile treated as "LA".
- **Root cause**: Tile's `_correct` flag captured at SPAWN time. In-flight tile still carries `_correct=true` after the game state advanced past that letter.
- **Fix**: Re-verify at HIT time: `t._letter === S.currentWord[S.letterIdx]`. Ignore stale spawn-time flag.
- **Lesson**: Any boolean flag that reflects game state at a PAST moment is suspect when there's a time delay between capture and use (spawn → collision = ~2-3 seconds). Prefer live lookups over cached flags whenever cheap. Rule of thumb: if state could have changed in the time between flag-set and flag-read, re-derive at read time.

### L11 — PIXI + location.reload race: clean up before reload
- **Symptom**: G6 "Level Berikutnya" click → frozen screen.
- **Root cause**: `location.reload()` fired while PIXI ticker + BGM audio element were still active. Mobile browsers can race the pagehide/reload with the pending ticker callbacks, leaving the transition appearing frozen.
- **Fix**: Before `location.reload()`, call `app.ticker.stop()` + `_bgmEl.pause()`, then `setTimeout(30)` to let the hide-transition settle.
- **Lesson**: Never call `location.reload()` directly from inside a running PIXI game. Pattern: `cleanup() → setTimeout(30) → reload()`. Works on any game engine that has async loops.

### L12 — Sprite swap requires type check, not just property set
- **Symptom**: G6 user picks 🚂 train, game renders blue sport car PNG.
- **Root cause**: Code did `carSprite.text = selectedVehicle` to update the emoji. That works only if `carSprite` is a PIXI.Text. If a PNG had previously loaded, carSprite was replaced with PIXI.Sprite; setting `.text` on a Sprite silently does nothing.
- **Fix**: New `rebuildCarSprite(emoji)` helper explicitly removes the old sprite, creates a new PIXI.Text or PIXI.Sprite based on whether the emoji maps to a PNG, and adds it to the container.
- **Lesson**: When a visual element can be represented by two different PIXI types (Text vs Sprite), never update it via type-specific properties (`.text`, `.texture`). Always provide a `rebuild(stateKey)` helper that recreates the right type from scratch.

---

## 2026-04-23
- **Symptom**: G10 Pokémon facing bug "failed puluhan kali" — every prior patch (adding `style.transform = pokeFlipForRole(...)` after sprite swap) silently reverted.
- **Root cause**: Keyframes hardcoded `transform:scaleX(-1)` at every step. During animation, keyframe value wins over inline style. After `animation-fill-mode:forwards` locks the sprite's final computed value, removing the class doesn't revert — the locked value persists.
- **Fix**: Make keyframes read `scaleX(var(--flip))`. JS sets both `el.style.setProperty('--flip', sign)` AND `el.style.transform = 'scaleX(...)'` for belt-and-suspenders safety. Variable-driven keyframes mean ONE source of truth regardless of animation state.
- **Lesson**: When a per-element visual state needs to survive CSS animations, use a CSS custom property the keyframe reads. Never assume inline `style.transform` wins over keyframes — it doesn't while the animation is active, and `forwards` extends that to permanent.

### L2 — Guard every modal/terminal-state function against double-invocation
- **Symptom**: End-game modal freeze, double XP, stacked achievement toasts.
- **Root cause**: `showResult()` had no entry guard. G5 memory games wrap it in 700–1200ms `setTimeout`; user rapid-taps during delay queue a second call; both execute fully, toasts stack above buttons.
- **Fix**: Entry-guard pattern: `if (state._showingResult) return; state._showingResult = true; setTimeout(()=>{state._showingResult=false}, 1500)`. Cleared on legitimate re-entry hooks (`playAgain`/`nextLevel`/`goToMenu`).
- **Lesson**: Any function that shows a modal or triggers a game-over transition needs a re-entrancy guard. Never assume it's called once — setTimeout chains, click handlers on transitional buttons, and background game-loop checks can all fire overlapping calls.

### L3 — CSS keyframes + custom properties = per-instance animation variants
- **Problem**: G10 has 12 keyframes covering player vs enemy × atk/hit/defeat/swap. Supporting per-Pokemon natural facing used to require duplicating each keyframe.
- **Solution**: Single keyframe using `transform: scaleX(var(--flip)) translateX(-26px) ...`. `--flip` is set per-element in JS. One keyframe, N variants.
- **Lesson**: CSS custom properties inside keyframe `transform` expressions make a keyframe effectively parameterized. Works for scale, rotation, translation. Cuts duplicate keyframe code massively.

### L4 — Scale-dependent positions need per-viewport recomputation on resize
- **G14 wheel offset**: `laneH*0.22 - 19` depends on `laneH`, which changes on orientation. Storing the computed offset as `_wheelOffset` on the PIXI container + re-setting it in the resize handler keeps wheels aligned when user rotates device mid-game.
- **Lesson**: Any derived geometry needs to be recomputed when viewport dimensions change. Cache the derived value on the live object (not as a const) so the resize handler can recalc.

### L5 — Fixed-px character sizes break responsive design; `clamp()` is the pattern
- Old pattern: `font-size: 108px` + 3 media-query overrides (480/360/320).
- New pattern: `font-size: clamp(64px, 18vw, 120px)` + one override for landscape-phone (short viewport).
- **Lesson**: For any emoji/character that must scale proportionally with viewport, `clamp(minPx, preferredVw, maxPx)` beats discrete breakpoint overrides. Four breakpoints become one formula. Landscape-phone (short viewport) still needs its own override because `vw` doesn't capture viewport height.

### L6 — Config data belongs in sessionStorage as a blob, not URL params or globals
- G14 needed `difficulty` passed from `game.js` → standalone `games/g14.html`. Already using sessionStorage for level — extended the same blob.
- **Lesson**: Cross-page config transfer pattern: `sessionStorage.setItem('${gameId}Config', JSON.stringify({level, difficulty, ...}))` on send-side; `try{...JSON.parse(sessionStorage.getItem(...))}catch(_){}` with sane defaults on receive-side. Add fields freely; old receivers ignore unknown keys.

---

## 2026-04-22

### Manual threshold beats AI rembg for cartoon art on white backgrounds

- **Symptom**: Linus Brave character train rendered as a shattered/pecah fragment in G15 + G16 — inner body regions missing, only wheels + partial cab visible.
- **Root cause**: rembg with `u2net` (and even `isnet-general-use` + alpha matting) was trained on photographs. On flat cartoon art, the AI model sees uniform colored regions as "background-like" and erroneously alphas them out. First pass removed 77% of Linus sprite; even gentler pass left inner body holes.
- **Fix**: Deterministic Pillow+numpy threshold. `RGB ≥235 → alpha 0`, `RGB ≥200 → alpha 180` (soft edge). No AI involvement. ~50ms per sprite.
- **Lesson**: For CLEAN cartoon/illustration input with white backgrounds, manual luminance threshold beats AI matting. AI models trained on photos misread flat regions. Rule of thumb: if input is solid-color fills (not photograph textures), use threshold first; reach for AI rembg only when the background is textured/noisy.

### Result modal engine — 3-layer defense against contradictory success messages

- **Symptom**: User screenshot — result modal showed "Selesai!" + 1★ + "Sempurna! Tidak ada kesalahan!" + "Matematika Benar: 0" + enabled Level Berikutnya button — with zero correct answers.
- **Root causes** (compound): (1) `GameScoring.calc` returned 1 star even for zero correct (`else stars = 1`); (2) Caller G15 checked `wrongTaps === 0` but not `mathCorrect === 0` so zero-answers path took success branch; (3) `GameModal.show` forwarded caller-supplied title/msg verbatim with no sanity check.
- **Fix**: 3-layer defense. Layer 1: `GameScoring.calc` returns 0 when `correct <= 0`, allows 0★ through bonus path. Layer 2: `GameModal.show` normalizes 0-star state (force emoji 😞, title "Gagal! Coba Lagi", msg override if it contains success words). Layer 3: per-caller fix — 13 callers audited across 9 games, each now branches title/emoji/msg on actual star count.
- **Lesson**: Shared result modals need DEFENSE-IN-DEPTH. Any single layer can fail (engine bug, caller bug, ambiguous success criteria) — the visible UI should be the last-line guardrail that refuses to display contradictory state (e.g., "Sempurna" text with 0 stars). Add explicit sanity-check assertions at the UI boundary; when they fire, override to a safe fail-state rather than letting garbage render.

### Hybrid rendering: character sprites vs programmatic Graphics

- **Symptom**: G15 had a full parametric `PIXI.Graphics` locomotive builder (5 type-specific `drawBody()` functions). User wanted cartoon character trains that can't be expressed geometrically.
- **Root cause**: Mixing raster sprites + Graphics in the same container requires branching BEFORE existing type-dispatch, because container flip conventions differ (sprites face right natively after rembg; Graphics locomotives drawn facing left then mirrored via `scale.x=-1`).
- **Fix**: `buildTrain()` checks `selectedTrain.isCharacter` FIRST. Character: `scale.x=1` + `CharacterTrain.mount()`. Programmatic: `scale.x=-1` + existing dispatch. Instance tracked for tick + dispose on train swap.
- **Lesson**: When adding a new render paradigm to a dispatch-based system, encode it as a LEAF branch at the top of the dispatcher, not interleaved with existing cases. Document the invariants each paradigm assumes (anchor, flip, coordinate system).

### Mirror CSS clamp formula in JS runtime

- **Symptom**: CSS `--rz-scale` tokens give DOM games fluid scaling, but PixiJS games compute sizing independently → DOM navbar + Pixi sprite coexist at mismatched scales on resize.
- **Root cause**: No shared source of truth between CSS `clamp()` and JS sizing.
- **Fix**: `shared/rz-responsive.js` exposes `window.RZ.scale()` with the SAME formula: `Math.min(1, Math.max(0.7, 0.44 + innerWidth * 0.00175))`. PixiJS games call `RZ.btn('md')` / `RZ.fontScale(22)` for coherent sizing.
- **Lesson**: When a system has CSS-controlled AND JS-controlled visual elements on the same viewport, ship the JS variant as a direct mirror of the CSS formula (or vice versa). One source of truth prevents visual desync on resize/orientation-change.

---

## 2026-04-21 (Evening Session)

### Unified Scoring Engine — bonus-modifier pattern for non-accuracy games (Task #25)

- **Symptom**: `GameScoring.calc({correct, total, ...})` is designed for accuracy-based scoring (100%=5★, 85%=4★…). But three remaining games (G13 evolution, G13b kill-count, partly G17) use **threshold/progression** scoring where "correct/total" has no natural meaning. Naive migration (mapping kills to fake "correct") either drifted from legacy star distributions or required wrapper math that was uglier than the original ternary.
- **Root cause**: Accuracy scoring assumes a linear correct-answer → stars mapping. Survival games ("get 50 kills = 5★") have a piecewise-tier mapping, and progression games ("evolved twice = 5★, once = 4★, none = 3★") have a categorical mapping. Neither fits the accuracy contract cleanly.
- **Fix**: Use the `bonus` parameter as a delta from perfect. Call `GameScoring.calc({correct: 1, total: 1, bonus: tier - 5})` where `tier` is the legacy piecewise result (e.g., `s.kills >= 50 ? 5 : s.kills >= 30 ? 4 : ...`). The engine's internal clamp `min(5, max(1, stars + bonus))` gives back the tier verbatim (since base=5, 5+(tier-5)=tier, clamped). This preserves exact legacy star distribution AND routes through the unified entry point for future instrumentation (telemetry, tuning, A/B tests).
- **Lesson**: When migrating to a shared engine, **don't force every caller into the canonical parameter shape**. Provide a pass-through lane (here: `bonus`) that lets non-canonical callers join the unified code path without distorting their scoring semantics. The payoff: one chokepoint for all games (easy to swap algorithms, add analytics, or apply global balance tweaks), zero regression risk on existing balance. Applies to G13 (`bonus = evoLevel - 2`), G13b (`bonus = killTier - 5`), and any future game whose scoring is tier/threshold-based rather than ratio-based. Accuracy-first callers (G17 Jembatan, G18 Museum) still use the canonical `{correct, total}` shape directly.

### Auto-jump removed for direct control (G20)

- **Symptom**: User feedback on G20 Ducky Volley — "kontrol dan physics g smooth, pergerakan bola dan pemainnya... Jangan dikasih auto jump." Jumping felt non-deterministic; horizontal motion felt twitchy; ball arcs were abrupt.
- **Root cause**: Two hidden auto-jump paths fought the player. (1) `if(S.pGnd && S.bx<NET_X && S.bvy>0 && Math.abs(S.bx-S.px)<60 && S.by<GROUND_Y-40) S.jump=true` — an "assist" that auto-triggered jumps whenever a ball approached, regardless of player intent. (2) Every `touchstart` set `S.jump = true` (comment: "tap = jump") — so any drag-intended tap also fired a jump. Movement was hard-assigned (`S.pvx = ±spd`) instead of lerped, causing instantaneous direction flips with no easing. Ball physics had no air resistance — gravity-only arcs felt arcade-y.
- **Fix**: (a) Deleted the auto-jump assist line entirely. (b) Removed `S.jump = true` from `touchstart`; replaced with a swipe-up gesture (`_touchStartY - curY > 40` while `pGnd`, one-shot via `_swipeJumped` flag) plus a visible `#btn-jump` button on touch devices (72×72 yellow circle, bottom-right). (c) Converted horizontal movement to lerp: `S.pvx = S.pvx*0.78 + target*0.22` in both drag-drive and keyboard paths. Friction raised `0.88 → 0.86`. (d) Added rise damping `if(S.pvy<0) S.pvy*=0.985` for a gentler jump apex. (e) Ball: gravity multiplier `0.65 → 0.60`, plus air drag `bvx*=0.995^dt`, `bvy*=0.998^dt` for smoother arcs. Kept BGM, pause menu, scoring, and collision logic untouched.
- **Lesson**: "Assist" logic that writes input state (`S.jump = true`) on the engine's behalf is a trap. It turns deterministic input into probabilistic input — the player can never predict whether their next tap will cause a jump or a move. If you want to help the player, adjust **physics parameters** (wider hit window, more forgiving collision) or **timing** (buffered input, coyote time), but never synthesize input events. For movement feel, **always lerp** toward target velocity rather than hard-assigning it — the cost is one multiply-add per frame and the feel improvement is dramatic. Touch gestures for jump: swipe-up distance threshold (40px) + one-shot flag prevents rapid re-fire; always pair with an always-visible button for accessibility.

### Frame-rate-independent state transitions (train bablas)

- **Symptom**: G16 train occasionally blew through an obstacle without stopping — state never transitioned through `STOPPED`, so the 1.2s "stopped but no quiz" bablas-recovery guard (Task #34) never fired. Train kept moving past `WORLD_LENGTH+200` → `triggerDeath()` → freeze.
- **Root cause**: Three independent issues compounded. (1) The `maxStep` clamp had a `2px` floor — on dt spikes (tab-switch, slow device, GC pause), accumulated step could exceed the 2px floor and cross the obstacle in a single frame. (2) `speed*dt` was not capped — a 500ms dt spike at boost speed can teleport the train hundreds of pixels. (3) Once past the obstacle, `S.obstacles.find(o => !o.cleared && o.worldX > S.worldX - 10)` picked up the NEXT uncleared obstacle (not the missed one), so the state machine never tried to stop for it.
- **Fix**: 4-part defense. (a) Floor `2px → 0.2px`. (b) Hard clamp: if next step would cross `nextObs.worldX + 5`, snap `worldX = nextObs.worldX - 1` + force STOPPED + call `showQuizPanel` directly; never `+=` that step. (c) Absolute per-frame cap `Math.min(speed*dt, baseSpeed/2)` — no matter what `dt` is, train can't move more than half a base-second per frame. (d) Game-loop prologue scans for any uncleared obstacle at `worldX < S.worldX - 20` and rewinds the train — last-ditch recovery if (a–c) still miss.
- **Lesson**: Any "approach → stop at threshold" state transition must be defended at the STEP level, not the STATE level. State-based guards (STOPPED-no-quiz timer) only fire if the state was entered; if the transition was skipped entirely (because `dt*speed > distance`), no state-based guard will catch it. Cap `speed*dt` to a framerate-independent max, hard-clamp position on crossing, and add a recovery pass that detects "already past" conditions and rewinds. The 2px/0.2px lesson generalizes: threshold floors should be chosen from the rendering tolerance (sub-pixel), not from "feels safe" heuristics.

### Deterministic density vs randomized spacing

- **Symptom**: G16 had 3–4 mini-obstacles per station gap despite a random-spacing formula intended to produce ~3. User wanted 1–2.
- **Root cause**: `miniSpacing = 225 + Math.random()*150` gave an average of 300px, but station spacing is ~1210px → `floor(1210/300) = 4` minis per gap. Random-spacing formulas don't cap density; they sample a rate.
- **Fix**: Replaced with deterministic per-gap placement: iterate adjacent station pairs, place `maxMinisPerGap` minis evenly (`worldX + gap * m / (N+1)`). Difficulty scales via `{1:1, 2:2, 3:2, 4:2, 5:3}[level]`.
- **Lesson**: When a design calls for "1–2 items between anchors", iterate anchor pairs with a loop counter — never rely on random-rate spacing, which produces a distribution, not a guarantee. Random spacing is fine for aesthetic filler (dust, clouds); deterministic placement is required for gameplay-impacting items whose count matters.

### PIXI v8 async texture loading

- **Symptom**: G6 vehicle sprite never appeared — stuck on emoji fallback despite image files existing and accessible via HTTP 200.
- **Root cause**: `PIXI.Texture.from(url)` in PIXI v8 is NON-BLOCKING. Failures surface async, so `try/catch` around the call caught nothing. The `Sprite` was created with an unloaded texture; `onerror`-style fallback was impossible.
- **Fix**: `PIXI.Assets.load(url).then(tex => swapSprite).catch(err => keepEmoji)`. Show emoji placeholder immediately, swap to sprite once resolved.
- **Lesson**: In PIXI v8, ALWAYS use `PIXI.Assets.load()` for raster images. Never wrap `Texture.from()` in `try/catch` expecting sync failure. Rule applies to all games that load external images (G6, G10, G13b, G13c, G22).

### Engine default assumption bias (facing direction)

- **Symptom**: User flagged Staryu "still not facing", then corrected to "Pikachu is wrong" — player sprite facing left instead of right.
- **Root cause**: BSE engine defaulted to `natural facing = 'R'` (sprite head points right). But Pokemondb HOME 3D renders actually face the viewer with a slight LEFT bias. Default assumption inverted reality for ~95% of the roster.
- **Fix**: Flipped default to `'L'` in both `games/battle-sprite-engine.js:15` and `game.js:5010`. All per-Pokemon `'L'` overrides became redundant and were removed.
- **Lesson**: Test engine defaults against ACTUAL source data, not abstract notion. When flipping the default eliminates most override entries, the default was wrong.

### Low-alpha shoulder decorations read as random clutter (G6)

- **Symptom**: G6 player feedback — "melayang-layang di luar jalan kesannya acak" (shoulder emoji decorations feel like random floating junk outside the road). User specifically flagged it in dark mode. Docked engagement during gameplay.
- **Root cause**: `buildScenery` seeded 16 theme emoji (🌲/🌙/🏢/🌸/…) at `alpha 0.2-0.35`, placed on the canvas **outside** `roadLeft`/`roadRight`. Three compounding issues: (a) low alpha + dark background makes the symbols read as "ghost specks" — no clear semantic layer (foreground road ≠ background scenery); (b) random `x` placement across a wide shoulder band means the decorations don't anchor to any visual rhythm (unlike road signs, which spawn periodically at tuned intervals); (c) scroll speed 0.55× road speed gives parallax depth, but without clustering (trees-in-group, buildings-in-row), the eye reads each emoji as a stray glitch rather than "distant scenery".
- **Fix**: Removed the emoji-spawn loop entirely. Kept the empty `sceneryL`/`sceneryR` containers so the game-loop scroll tick (`bg._sceneryL.y += scrollAmt`) stays safe without null-check retrofits. Road signs — which spawn periodically INSIDE the canvas bounds and have clear semantic meaning (🛑/⚠️/🚦) — remain the only ambient road furniture.
- **Lesson**: Ambient decoration needs two properties to NOT read as clutter: (1) visual clustering so the eye groups it as "scenery" instead of "artifact" (rows of trees, strips of buildings — never isolated specks); (2) alpha high enough to be definitively present or absent, never "maybe there". Low alpha + isolated placement + outside-playfield location is the worst-case combo — the decoration becomes indistinguishable from a render bug. When in doubt, remove ambient scenery; it's cheaper to ship less than to tune more. Companion rule: when removing a feature wired to a game-loop tick, preserve the accessor refs as empty stubs rather than adding null checks at the call site — fewer branches, same safety.

### CSS multi-row navbar on narrow screens

- **Symptom**: Game header `.game-header` wraps to 2 rows on phones < 360px; children stack vertically (back, title, level, player, pause, stars).
- **Root cause**: Flex container with no `flex-wrap:nowrap` + title with `flex:1` but no `min-width:0` — long title text forces siblings to wrap.
- **Fix**: `.game-header { flex-wrap:nowrap; overflow:hidden }` + `.gh-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }`.
- **Lesson**: Flex children with `flex:1` need `min-width:0` to allow shrinking below content width. Without it, long text blocks can push siblings to a new row even when `nowrap` is set.

### PIXI text button overflow from container

- **Symptom**: G16 quiz answer text leaks out of button boundary.
- **Root cause**: `.choice-btn` had `max-width:120px` + fixed `font-size:clamp(16px,5.5vw,26px)` — long answer strings like "Matahari" or multi-word categories overflow.
- **Fix**: Removed max-width cap, added `overflow:hidden; overflow-wrap:break-word; white-space:normal; line-height:1.2`, reduced default fontSize. JS auto-applies `.long-text` class (smaller font) when any answer >5 chars.
- **Lesson**: Dynamic answer text needs dynamic button sizing OR dynamic font sizing. Static `max-width` + static `font-size` is a recipe for overflow. G22 pattern of measuring `textObjs.map(t => t.width)` is ideal.

### Hardcoded sibling race (end-game freeze)

- **Symptom**: G16 game freezes at end — doesn't advance to result screen.
- **Root cause**: Multiple state transitions (`ARRIVING` → `ARRIVED` → `setTimeout showWin`) in one chain. If ANY step throws or `winShown` flag stays stuck false, the game hangs with no fallback.
- **Fix**: 8-second safety `setTimeout` in `triggerArrival()` that force-fires `showWin()` if normal flow fails, with nested try/catch falling back to `finishGame()`.
- **Lesson**: For single-point-of-failure state transitions (especially ones gated on async animations), ALWAYS add a timeout-based safety net. Pick timeout 2-3× longer than expected normal path.

### Pokemondb sprite inventory expansion

- **Symptom**: User provided new HD sprite folder — realized previous coverage was ~751 SVGs out of 1025 Pokemon, creating fallback-to-low-res cascade for Gen 8/9.
- **Root cause**: Sprite roster never audited against current dex size (1025 as of Gen 9 DLC).
- **Fix applied** (Task #37): `pokeSpriteAlt2(slug)` added, cascade is now alt2 → SVG → HD CDN. Primary swapped to 1025-set local WebP. BSE `hdSrc` param picks it up unchanged.
- **Lesson**: For data-driven games, inventory the SOURCE data periodically. Audit coverage vs current canonical count before sprinting into code. When a new asset set matches an existing engine's default assumption (facing, dimension), zero override entries needed — a good sign the asset set was chosen well.

### Source data inventory

- **Symptom**: Gen 8/9 Pokemon rendered via remote HD CDN (network latency, offline break) while Gen 1-7 rendered via local SVG — inconsistent cost model across the roster.
- **Root cause**: Local SVG set was frozen at 751 entries when Gen 8 launched. No periodic re-inventory.
- **Fix applied**: Local 1025-WebP set integrated as new top of cascade; SVG demoted to secondary; remote CDN demoted to tertiary. Result: all battle sprites now load locally for 100% of roster.
- **Lesson**: When a local asset set covers <100% of data model, flag it in the cascade comment. Every added data-model entry (new Gen / new DLC) should trigger an asset audit checklist item.

### Fluid CSS tokens replace step-function media queries

- **Symptom**: Same "shrink button/font at narrow width" logic duplicated across 22 games via `@media(max-width:480px) / 400px / 360px` blocks. 60+ lines of stepwise overrides; visual jumps at each breakpoint; letter-input rows went vertical inconsistently.
- **Root cause**: Each game reimplemented its own breakpoint ladder with hand-picked pixel values. No shared scale. `@media` is a step function — it snaps at thresholds instead of interpolating.
- **Fix** (Task #29 Steps 1+2): single `--rz-scale: clamp(0.7, calc(0.44 + 0.175vw), 1)` in `:root`, plus derived `--rz-btn-*`, `--rz-font-*`, `--rz-gap-*`, `--rz-radius-*` tokens. Reusable primitives `.rz-navbar`, `.rz-letter-row`, `.rz-letter-btn`, `.rz-choice-grid` consume the tokens. Migration (Steps 3–7) deletes per-game `@media` blocks one game at a time.
- **Lesson**: `clamp(min, Xvw, max)` and `calc(base * var(--scale))` interpolate CONTINUOUSLY across viewport widths — no visual snap, no stale breakpoint values to maintain. When you catch yourself writing the same `@media(max-width:…)` for the third time, that's the signal to extract a fluid token instead.

### Correct-answer juice — reward scaling by streak (Task #38)

- **Symptom**: G16 "Selamatkan Kereta" — correct quiz answer under-rewarded. Only a green flash + `btn.correct` class; no spatial/physical feedback, no escalation for consecutive correct answers. Children lose engagement signal after 2-3 answers.
- **Root cause**: Single-state success feedback gives a flat reward curve. Players who answer 5-in-a-row get identical juice to first-timers, dampening flow and achievement. "Juice" (game-feel feedback) wasn't tiered against performance.
- **Fix**: Three-tier `spawnQuizCelebrationFX(x, y, streak)` — (1) baseline 14-confetti burst + white ring, (2) streak≥3 adds 6 secondary firework bursts of 10 sparks, (3) streak≥5 adds 8 floating ⭐✨🌟💫 emoji + gold ring pulse. Plus a 0.5s stage-scale "punch" (1→1.04→1 via sine bell-curve) for whole-screen kick. Streak tracked on `S.correctStreak` (reset on wrong). Particles share existing `sparkParticles[]` cull loop, extended with `_ring` (expand+fade, no motion) and `_noGravity` (emoji float-up) branches.
- **Lesson**: Reward feedback should SCALE with performance. Flat juice = flat engagement. Track a streak counter, branch FX by threshold (3/5 are good defaults), and LAYER effects — baseline stays for beginners, extras reward mastery. Stage-level "punch" (brief scale bump via sine curve over ~0.5s) reads as a kick, not a zoom — center-compensate `stage.x/y` so the punch pivots from the middle. Always route new particles through the existing cull pipeline to keep GC pressure constant.

### RDE migration: preserve non-size properties separately from token adoption (G8)

- **Symptom**: Naively replacing G8's base rules with `.rz-letter-btn` via HTML class composition would lose G8's unique visual identity — purple `border:3px solid #DDD6FE`, violet `box-shadow:0 4px 0 #7C3AED`, brand color, `:active` transform-scale, `.used` opacity state, and — critically — the Scrabble wooden-tile dark-theme overrides at `style.css:1691–1756` that depend on selector specificity `.g8-letter-btn` (not `.rz-letter-btn`).
- **Root cause**: RDE's Layer 2 classes (`.rz-letter-btn`) define size/shape/font tokens, but games carry per-game *theme* (colors, shadows, state modifiers, dark overrides). Swapping the class in HTML would decouple the theme from the element and require rewriting every `[data-theme="dark"] .g8-letter-btn` rule to use the shared class. HTML class changes also ripple to JS (`document.querySelectorAll('.g8-letter-btn')` in `game.js` would need a rename).
- **Fix**: Keep `.g8-letter-btn` / `.g8-slot` class names in HTML. Instead of class composition, do **token composition**: rewrite the G8 base rule to consume `--rz-btn-sm`, `--rz-font-title`, `--rz-radius-sm`, `--rz-gap-sm` inline, while preserving every border/shadow/color/transition. Then delete G8 entries from `@media` blocks — the tokens' `clamp()` handles fluid scaling. Preserve a small aspect multiplier where needed (`height: calc(var(--rz-btn-sm) * 1.18)` keeps the 44×52 slot ratio; `font-size: calc(var(--rz-font-title) * 1.05)` keeps the 24px vs 22px title-font ratio). `min-width: var(--rz-btn-sm)` on `.g8-letter-btn` prevents flex-wrap from collapsing a button below one-per-row at 320px.
- **Lesson**: RDE Layer 2 classes are an **opt-in primitive**, not a drop-in replacement. For games with established dark-theme selectors, state modifiers (`.active`, `.filled`, `.used`, `.celebrate`), or JS selectors, the safer migration is **token composition** (keep `.g<N>-*` class, replace hard-coded px with `var(--rz-*)`). Reserve class composition (`.rz-letter-btn .g<N>-accent`) for greenfield games. Also: when replacing a hard-coded dimension, preserve the **ratio** relative to the token's base (e.g., if the original was `52px` and the token's base is `44px`, multiply: `calc(var(--rz-btn-sm) * 1.18)`) — don't just snap to the token's base value or the visual changes uniformly across breakpoints. Finally: removing `@media` entries counts as a code-reduction win (3 breakpoints × 2 rules = 6 lines here), validating Layer 1's `clamp()` promise.

---

## Template for future entries

```
### <topic>
- **Symptom**:
- **Root cause**:
- **Fix**:
- **Lesson**:
```
