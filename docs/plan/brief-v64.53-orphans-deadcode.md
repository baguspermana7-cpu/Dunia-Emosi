# Executor brief — v64.53: orphan assets (A-9) + dead functions (A-10)

Repo: `~/rz-work/wt-dunia-cine` (zero-build static PWA). Work in your own worktree. Do NOT commit, push, bump
tokens or edit `sw.js` cache tokens; main does that.

## Goal
Remove files and functions that nothing uses, without changing anything the child sees.

## Laws (each must be measured and quoted in your summary)
- L1 Every removed asset has 0 references: no basename, URL-encoded name or dynamic-pattern match in any
  html/js/css/json of THIS repo **and** of `~/rz-work/game1` (game1 loads Dunia assets).
  Dynamic patterns that keep files alive (never remove these): `banner-game${n}`, `bg-arena-*`,
  `pokemondb_hd_alt2/${id}_${slug}`, `Pokemon/trainer/*`, `showdown-ani/*`, `assets/fonts/*`, kereta level packs,
  anything listed in `sw.js` SHELL.
- L2 Keep (owner decision pending): `assets/Pokemon/sound/*SoundLoadMate.com.mp3` (O-5),
  `games/kereta-maze*`, `games/lokomotif-pemberani*` (O-1), `games/_shell-smoke.html`, `plb.html`,
  `secondbrain.html`, `proposals/` (O-4).
- L3 New gate `tools/qa-no-orphans.mjs` (node, no browser, < 30 s): counts orphan files under `assets/` with the
  same rules; baseline in `tools/orphans-baseline.json`; fails when the count RISES (ratchet), passes when it falls.
  Red proof: copy any `.webp` to `assets/_qa_orphan.webp` -> exit 1; remove -> exit 0.
- L4 Dead functions in `game.js`: a function is dead only if its name appears nowhere else in the repo (including
  `onclick="..."` strings, `window[...]`, other files, game1). List each with its line and the grep that proved it.
  Remove only those. `node --check game.js` passes.
- L5 Nothing visible changes: `node tools/qa-local-refs.mjs` passes; `bash tools/ci-verify.sh` passes;
  `node tools/run-gates.mjs --only 'qa-(regression-sweep|app-offline|no-third-party)\.mjs'` passes.

## Also
- `.gitignore`: `__MACOSX/`, `*.import`, `**/_backup/`.
- Move dev-only `.md` / `.jsonl` prompt files out of `assets/` into `docs/asset-prompts/` (keep relative structure)
  instead of deleting them.
- `git rm` the removed files; list them in `docs/audit/orphans-removed-v64.53.txt` (path + bytes).

## Rules
- One headless browser at a time: wrap any browser gate in
  `flock -w 1800 /tmp/claude-1000/kereta-browser.lock timeout 900 ...`, `TMPDIR=$HOME/.cache/qa-tmp`.
- Never `pkill -f`; kill by PID only. Read only gate summary lines (`tail -3`, grep FAIL).

## Return (short)
Removed: N files / bytes; dead functions: names + lines; gate lines for L3 red, L3 green, L5; anything you kept
and why.
