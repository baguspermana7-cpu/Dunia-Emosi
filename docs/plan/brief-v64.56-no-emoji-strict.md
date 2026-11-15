# Executor brief — v64.56: no emoji on any screen, every page strict (audit A-17)

Repo: your worktree of `~/rz-work/wt-dunia-cine` (zero-build PWA, vanilla JS). Do NOT commit, push, bump `?v=`
tokens or touch files outside this scope. Main reviews and ships.

## Problem
- Owner rule: no emoji anywhere a child or parent sees. Emoji are allowed in source ONLY when the UISprites resolver
  (`games/data/emoji-map.js` + its resolver) swaps them for a picture before they are seen.
- `tools/audit-no-emoji.mjs` walks the rendered DOM of 27 views. Only 5 are STRICT (line ~36); on the rest an
  UNMAPPED emoji is a "gap" (`tools/qa-out/emoji-gaps.json`), not a failure. It also walks only the first render, so
  emoji drawn later (game screens, result cards, toasts, dialogs) are never seen.
- Static count: 297 distinct emoji in source are not in `emoji-map.js` (`tools/emoji-inventory.mjs`).

## Design
1. Make every view in `PAGES` strict (remove the STRICT carve-out; keep `QA_PLANT` red modes working).
2. Add a second pass per game page that reaches the screens a child actually sees after the first: press the page's own
   start/play control (survey each page; reuse selectors from that page's existing qa-* gate), wait for it to settle,
   walk again. Also walk the hub result card (`showResult` in `game.js`) and the parent dashboard as now. List what
   each page's second pass reaches. Keep total gate time < 8 min on this machine.
3. Fix what renders, in this order of preference:
   a. the emoji already has art in the map under another code point or an existing sprite in `assets/` fits → map it;
   b. the emoji is decoration next to words → remove it (words stay);
   c. it is the only meaning carrier and no art exists → replace with an existing icon from `assets/` (never draw new
      art, never an emoji font, never a white outline). Report every (c) and every case you could not fix as a GAP
      list for the owner (char, page, where, what it means).
   Female characters: only with hijab (do not introduce any new person picture).
4. Static ratchet: `tools/emoji-inventory.mjs` count of unmapped emoji in source may only fall. Record the new number in
   a baseline file next to the other baselines in `tools/` and make the script fail when it rises (`--check`).

## Laws (quote each result)
- L1 RED: the strict gate on the current tree fails and lists pages + chars (quote the summary + first 10 lines).
- L2 GREEN: `node tools/audit-no-emoji.mjs` passes with every view strict, both passes. Plant red still works:
  `QA_PLANT=1 QA_PLANT_PAGE=games/kuis-matematika.html` fails; `QA_PLANT=nores QA_PLANT_PAGE=index.html` fails.
- L3 Screenshots (390x844) of every screen where you replaced or removed an emoji, before and after; give paths.
  Nothing may lose its meaning: a button that showed only an emoji must still show a picture.
- L4 Static ratchet `node tools/emoji-inventory.mjs --check` passes; raising the count by one planted emoji fails.
  Add it to `tools/ci-verify.sh` if it runs < 10 s.
- L5 No regression: `bash tools/ci-verify.sh`; `node tools/run-gates.mjs --only <gates of every game touched>` (list);
  `node tools/qa-regression-sweep.mjs` CLEAN; `node --check` every changed JS file.

## Rules
- Browser gates: `flock -w 1800 /tmp/claude-1000/kereta-browser.lock timeout 900 ...`, `TMPDIR=$HOME/.cache/qa-tmp`
  (`run-gates` takes the lock itself — do not wrap it). One browser at a time. Never `pkill -f`; kill only PIDs you
  started. puppeteer lives in `~/rz-work/node_modules` (symlink into the worktree; remove the symlink before return).
- A gate run from another tree reads files relative to ITS OWN folder: to run a new gate on the old tree, copy it there.
- Machine is loaded by other sessions: perf-only checks failing the same way on the unchanged tree are load (show A/B).
- Read only gate summary lines. A gate that cannot fail proves nothing: show its red run.

## Return (under 45 lines)
Pages and screens walked; red + green summary lines; counts (unmapped in source before/after, rendered emoji before/
after); fixes by kind (a/b/c) with counts; screenshot paths; the GAP list for the owner; L5 lines. Leave changes
uncommitted; give the worktree path.
