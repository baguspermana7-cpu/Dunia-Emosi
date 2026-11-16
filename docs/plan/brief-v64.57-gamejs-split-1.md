# Executor brief — v64.57: split game.js, step 1 of N (audit A-18)

Repo: your worktree of `~/rz-work/wt-dunia-cine` (zero-build PWA, vanilla JS). Do NOT commit, push, bump `?v=`
tokens or touch files outside this scope. Main reviews and ships.

## Problem
`game.js` is 14,821 lines, one classic `<script defer>` loaded by `index.html:2455`. Sections are marked by
`// ====` banners (titles at lines 7, 16, 1037, ... 11069 GAME 14 BALAPAN KERETA, 12228 GAME 15, 12361 GAME 16).
Top-level code runs at load: the BOOT block (~4066) calls `initFloatingStars`, `buildAnimalPicker`, `pkey`.

## Step 1 scope: move the tail, change nothing else
Move lines from the `// GAME 14 — BALAPAN KERETA` banner (~11068) to end of file VERBATIM into
`games/hub/g14-g16-trains.js` (new folder `games/hub/`). `game.js` keeps everything before it, byte for byte.
- Load it in `index.html` right after the `game.js` tag, same `defer`, same `?v=` token as its neighbour.
- Add it to `SHELL` in `sw.js` next to wherever `game.js` / `index.html` shell entries are (same token form).
- Classic scripts share one global scope (top-level `let`/`const`/`function` stay visible across files), so the ONLY
  semantic change is hoisting: a function declared in the tail is no longer callable by top-level code that RUNS
  while `game.js` loads, and tail top-level code cannot touch a `let`/`const` of game.js before game.js ran (it
  always runs after, so that is fine). Prove step 1 safe: list every identifier declared at top level in the tail
  and grep `game.js` for uses in code that executes at load (top-level statements, IIFEs, the BOOT block, top-level
  initialisers of `const x = f()`). Quote the result. Anything found → keep that function in game.js and say so.
- If the tail has its own top-level side effects (listeners, IIFEs, `window.X =`), they still run, after game.js:
  check that nothing in game.js reads them at load.

## Gates that read game.js as text
These static tools read `game.js` source and will silently lose coverage of the moved code
(`emoji-inventory.mjs`, `qa-content-rules.mjs`, `qa-game-names.mjs`, `qa-hub-img-size.mjs`, `qa-kodok-slot7.mjs`,
`qa-mojo-integration.mjs`, `qa-sw-reload.mjs`, `audit-no-emoji.mjs`, `qa-local-refs.mjs`, `qa-no-orphans.mjs`
pattern; grep `tools/` for `game.js` yourself — the list may be incomplete). Add `tools/lib/hub-src.mjs` exporting
`HUB_FILES` (read from the `<script src>` order in `index.html`: `game.js` + `games/hub/*.js`) and `hubSource()`
(their concatenation). Point every such tool at it. Per tool, the count it prints must be the SAME before and after
the split (quote before/after lines). `EMOJI_INVENTORY.json`/baselines must not change except file names.

## Laws (quote each result)
- L1 Byte equivalence: `cat game.js games/hub/g14-g16-trains.js` equals the old `game.js` (`git show HEAD:game.js`)
  byte for byte, or differs only by a documented header comment / trailing newline (show `cmp`/`diff | wc -l`).
- L2 New gate `tools/qa-hub-split.mjs` (static, < 5 s, add to `tools/ci-verify.sh`): every `games/hub/*.js` is loaded
  by `index.html` with `defer`, after `game.js`, in a fixed order, with the same `?v=` token as `game.js`, and is in
  `sw.js` SHELL; `game.js` stays under a line ceiling you record (ratchet: may only fall). RED: remove the tag from
  index.html → fails; remove the SHELL entry → fails; restore → passes.
- L3 New gate `tools/qa-hub-boot.mjs` (browser, reads `QA_BASE`): hub loads at 390x844 with 0 `pageerror` and 0
  `console.error`; every top-level function declared in `games/hub/*.js` is `typeof === 'function'` on `window`
  after load; G14, G15 and G16 can be started from the hub through their real entry functions and draw (screenshot
  each, look at them). RED on a mutation: drop the new script tag → fails.
- L4 No regression: `bash tools/ci-verify.sh`; `node tools/run-gates.mjs --only '<gates for G14|G15|G16 and hub>'`
  (grep `tools/` for gates that open index.html and drive G14/G15/G16 — list them); `node tools/audit-no-emoji.mjs`;
  `node tools/qa-regression-sweep.mjs` CLEAN; `node --check` every changed JS file. Offline: the hub gate that runs
  with the network off (grep `offline` in tools/) still passes with the new file.

## Rules
- Browser gates: `flock -w 1800 /tmp/claude-1000/kereta-browser.lock timeout 900 ...`, `TMPDIR=$HOME/.cache/qa-tmp`
  (`run-gates` takes the lock itself — do not wrap it). One browser at a time. Never `pkill -f`; kill only PIDs you
  started. puppeteer lives in `~/rz-work/node_modules` (symlink into the worktree; remove the symlink before return).
- A gate run from another tree reads files relative to ITS OWN folder: to run a new gate on the old tree, copy it there.
- Machine is loaded by other sessions: a perf-only check failing the same way on the unchanged tree is load (A/B).
- Read only gate summary lines. A gate that cannot fail proves nothing: show its red run.

## Return (under 40 lines)
Lines moved; the hoisting check result; L1 cmp line; red+green lines for both new gates; per-tool before/after
counts for the text-reading tools; screenshot paths; L4 summary lines. Leave changes uncommitted; give the worktree
path.
