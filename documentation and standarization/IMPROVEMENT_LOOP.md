# Dunia Emosi — AUTONOMOUS IMPROVEMENT LOOP (standing prompt for Claude)

> **How to use:** at the start of a session, tell Claude *"run the improvement loop"* (or paste this file).
> Claude then repeats the ITERATION below, shipping one safe enhancement at a time across ALL games,
> until a stop condition is hit. Owner may interrupt/redirect anytime; explicit owner requests always
> outrank this backlog.

## Mission
Continuously make every Dunia Emosi game **better** — fewer bugs, clearer UX, richer visuals/VFX, more
content — WITHOUT breaking anything that already works. Small, verified, reversible steps. Ship + record
each one.

## Non-negotiables (never violate)
1. **Never break the good games.** The 10 Pokémon + train games must stay green: `node tools/qa-regression-sweep.mjs` = 10/10 after every change.
2. **Additive + guarded.** New behaviour behind a capability check with a fallback (emoji/text/existing). A missing asset/engine must degrade, never crash.
3. **plb.html — DO NOT TOUCH** (owner reviewing; A-340).
4. **Accuracy first.** Only label a DB sprite you are visually SURE of (montage-verify). Never teach a wrong name. Ambiguous → decor only.
5. **Verify before claiming fixed.** Screenshot/DOM-drive UI changes; don't report done on code-only.
6. **Don't over-bump the SW.** Batch changes; ONE `sw.js` CACHE_VERSION bump per ship-batch (cache-thrash caused the B-209/210/211 + the "effect hilang" false-regressions). Per-file `?v` bump is enough for a single JS change (new key = fresh fetch).
7. **No new heavy deps / no external CDNs for core assets** (offline PWA — local WebP wins).

## The gates (must pass before every commit that touches them)
- `node tools/qa-regression-sweep.mjs` → 10/10 (always).
- `node tools/qa-math-adventure.mjs` → 28/28 (if math touched).
- `node tools/qa-shared-engines.mjs` → 13/13 (if a shared engine touched).
- `node tools/qa-g12-dbshadow.mjs`, `qa-side-gap-jump.mjs` (if those areas touched).
- SPA change → boot index.html headless, assert 0 console errors.
- Sandbox: puppeteer resolves only from the project dir → put drive `.mjs` under `tools/`, embed an http server (copy `tools/qa-side-gap-jump.mjs`).

## THE ITERATION (repeat until a stop condition)
1. **Pick ONE target** using the priority heuristic below. State it in one line.
2. **Scope + locate.** grep/read the exact code. If it needs an asset that doesn't exist → mark BLOCKED, record it, pick another. Don't invent art.
3. **Reproduce/understand first** (for a bug: screenshot or DOM-drive the current wrong behaviour).
4. **Implement** the smallest additive/guarded change. Match surrounding code style.
5. **Verify:** run the relevant gate(s) + a targeted drive/screenshot proving the change. If red → fix or revert; never ship red.
6. **Commit** one focused change (conventional message, the *why*). Bump `?v` on changed JS; batch the `sw.js` bump.
7. **Record:** TaskCreate/Update + one line in the memory file. Then push (or batch-push at end of the session's batch).
8. **Repeat** from 1.

## Target-selection heuristic (high → low)
1. **Owner-reported bug / regression** (anything the owner flagged, still open).
2. **Correctness/fairness bug** found while playing (unfair hit, softlock, wrong answer, 404, console error).
3. **Responsive/layout** breakage (portrait AND landscape; content clipped, unreadable, off-screen).
4. **Clarity/UX** (confusing flow, invisible text, dead button, missing feedback).
5. **Visual polish / theme consistency** (adopt the math clay/navy theme on any non-Pokémon/non-train game screen still off-theme; richer VFX via `window.VFX`; parallax depth).
6. **Content depth** (more quiz items, more illustrated DB sprites where art EXISTS, richer modes) — via the DB-sprite loop (`DB_SPRITE_WIRING_LOOP.md`).
7. **Engine robustness** (guards, presets, pooling, a new gate) — additive only.

Where to look each round: cycle the game list so coverage is even —
`g1 Aku Merasa · g2 Napas Pelangi · g3 Huruf Hutan · g4 Hitung Binatang · g5 Cocokkan Emosi ·
g6 Petualangan Mobil(mobil.html) · g7 Tebak Gambar · g8 Susun Kata · g9 Jejak Huruf · g11 Kuis Sains ·
g12 Tebak Bayangan · Math(kuis-matematika) · Museum · the Pokémon set · the train set`.
Drive each in portrait AND landscape; note anything clipped/janky/off-theme → that's the next target.

## Known BLOCKED (needs owner art — skip until dropped, keep noting)
- g5 **sayur / profesi** + the richer g1–g8 sheets → need `db-words-extra` / the P11 sheets from
  `Documents/temporary/game asset/G1-G12_ENHANCEMENT_ASSETS.md` generated + dropped. When a sheet lands:
  run the loop in `DB_SPRITE_WIRING_LOOP.md` (crop → montage-verify labels → `db-labeled.js` group → auto-wires g5/g7/g12 → gates → ship).

## Ship discipline
- Commit per focused change. Group a session's changes into ONE ship-batch → ONE `sw.js` CACHE_VERSION bump
  (activate purges old caches, refreshing overwritten assets like re-cropped sprites) + `?v` bumps on the
  changed JS across every page that loads them → push. HTML is network-first (no `?v` needed).
- After push, update memory + tasks so the next session's loop starts from a clean ledger.

## Stop conditions (report, then wait)
- All gates green AND a full game-cycle pass surfaced no safe art-free target → summarize what's left
  (blocked-on-art items, owner-only actions like the PWA reinstall) and ask for direction.
- Any gate goes red and can't be fixed in-iteration → stop, report the failure, don't push.
- Owner interrupts → follow the new instruction; resume the loop after.

## Companion docs
`DB_SPRITE_WIRING_LOOP.md` (add illustrated category) · `DB_SPRITE_INTEGRATION.md` (accessor API + label
rule) · `VFX_ENGINE_STANDARD.md` (window.VFX) · `IMAGE_ASSET_STANDARD.md` (WebP mandate) ·
`G1-G12_ENHANCEMENT_ASSETS.md` (art-gen prompts). Shared engines: `vfx-engine.js` (VFX), `quiz-engine.js`
(QuizEngine), `sfx-engine.js` (SFXEngine), `db-sprites.js`/`db-labeled.js` (DBSprites/DBLabeled), `motion.js`.
