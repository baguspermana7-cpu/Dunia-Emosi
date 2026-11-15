# Executor brief — v64.55: side-race save per child, timers rest when hidden, hub images sized (audit A-14, A-15, A-16)

Repo: your worktree of `~/rz-work/wt-dunia-cine` (zero-build PWA, vanilla JS). Do NOT commit, push, bump `?v=`
tokens or touch files outside this scope. Main reviews and ships.

## A-14 Side-race train choice is global, not per child
- `games/balapan-kereta.html:476` and `:6380` write `localStorage 'dunia_side_train'`; `games/balapan-kereta-side.html:542`
  reads it. Every other per-child value goes through `games/data/save-engine.js` (`avatarScopedGet/Set/Remove`,
  ~lines 137-172; check what is exported on `window` and use that). The tutorial flag `G14S_TUT_FLAG`
  (`balapan-kereta-side.html` ~2020-2064) is the same kind of value.
- Fix: both pages read/write these through the save-engine scoped API (load `data/save-engine.js` on the side page if
  it is not there, same `?v=` token as its neighbours). The legacy global key migrates to the active child on first read
  (avatarScopedGet already does this — prove it).

## A-15 Always-on timers keep running in a hidden tab
- Candidates (survey; count every `setInterval` / self-rescheduling `requestAnimationFrame` loop that runs while the page
  is idle): `games/dunia-cinema-pixi.js` (163, 196, 237), `games/kereta-life.js` (46), `games/kereta-pack.js`,
  `games/dunia-home.js`, `games/kuis-matematika.html` (926, 1556, 1716).
- Fix: a timer tick does no work while `document.hidden` (early return), or the loop stops on `visibilitychange` and
  restarts when visible. Smallest change per site. Game state (scores, countdowns a child sees) must not jump when the tab
  comes back: a countdown that should pause must pause, not catch up.

## A-16 Hub images without size
- `index.html` has 35 `<img>` without `width=`/`height=` (static count `grep -o '<img[^>]*>' index.html | grep -vc width=`).
  Images created in `game.js` for hub tiles count too if they lack size.
- Fix: add the intrinsic width/height attributes (read from the files) so the box is reserved; CSS keeps the displayed
  size. Nothing may change size on screen.

## Laws (quote each result)
- L1 `tools/qa-side-train-per-child.mjs` (browser, reads `QA_BASE`): child A picks train X in balapan-kereta, child B
  picks Y; side page shows X for A and Y for B; a legacy global `dunia_side_train` moves to the active child once.
  RED on the current tree (B sees X), GREEN after.
- L2 `tools/qa-hidden-timers.mjs` (browser, reads `QA_BASE`): on each touched page, spy the timer callbacks / count
  work done (e.g. wrap the tick or count rAF frames and DOM writes) for 3 s with `document.hidden` forced true
  (override `document.hidden`/`visibilityState` + dispatch `visibilitychange`): 0 ticks doing work while hidden, > 0
  after becoming visible. RED on the current tree, GREEN after. List the pages.
- L3 Hub layout: `tools/qa-hub-img-size.mjs` (static, node, < 5 s, add to `tools/ci-verify.sh`): 0 `<img>` without
  width and height in `index.html` (and in hub tile templates in `game.js` if any). RED now (35), GREEN after.
  Plus: screenshot the hub at 390x844 and 800x1280 before and after; the two must look the same (pixel diff of the
  rendered tile grid < 0.5 % or explain each difference). Save the screenshots, give paths.
- L4 No regression: `bash tools/ci-verify.sh`; `node tools/run-gates.mjs --only <gates of every game you touched>`
  (list them); `node --check` every changed JS file; `node tools/qa-regression-sweep.mjs` CLEAN.

## Rules
- Browser gates: `flock -w 1800 /tmp/claude-1000/kereta-browser.lock timeout 900 ...`, `TMPDIR=$HOME/.cache/qa-tmp`
  (`run-gates` takes the lock itself — do not wrap it). One browser at a time. Never `pkill -f`; kill only PIDs you
  started. puppeteer lives in `~/rz-work/node_modules` (symlink it into the worktree; remove the symlink before return).
- Machine is loaded (other sessions): a perf-only check (idle frame median, board-look) failing the same way on the
  unchanged tree is load, not your change — show the A/B line if you claim that.
- Read only gate summary lines. A gate that cannot fail proves nothing: show its red run.

## Return (under 40 lines)
Per finding: files changed, before/after counts; red + green summary lines for the three new gates; screenshot paths;
L4 summary lines; anything left on purpose and why. Leave changes uncommitted; give the worktree path.
