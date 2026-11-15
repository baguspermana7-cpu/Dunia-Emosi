# Executor brief — v64.54: one sound check, one speak helper (audit A-13)

Repo: your worktree of `~/rz-work/wt-dunia-cine` (zero-build PWA, vanilla JS). Do NOT commit, push, bump `?v=`
tokens or touch files outside this scope. Main reviews and ships.

## Problem
- The sound setting (`localStorage 'dunia-emosi-sound'`, `'off'` = muted) is read directly in 17 files.
- Speech (`speechSynthesis.speak` / `new SpeechSynthesisUtterance`) is implemented 12 separate times.
- The per-child settings already live in `games/data/save-engine.js` (`DuniaProfile`, PRD-18). Pattern to copy:
  `DuniaProfile.vibrateOn()` + the `navigator.vibrate` guard (lines ~195-207).

## Design
1. `DuniaProfile.soundOn()` in `save-engine.js`, same shape as `vibrateOn()` (`!== 'off'`, try/catch, default on).
2. One speak helper `games/data/speak.js` exposing `window.DuniaSpeak = { say(text, opts), cancel() }`:
   - says nothing when `soundOn()` is false (or when the key is `'off'` if save-engine is not on the page);
   - `id-ID` voice preferred, `opts.lang`, `opts.rate`, `opts.onend`; cancels the previous utterance;
   - start from the most complete of the existing implementations (survey them; `games/tk-hub.js` ~88-117 has a
     voice fallback). Keep each game's current wording, language and rate: behaviour must not change.
3. Migrate every reader and every speech copy to these two. Pages that need the helper load `data/speak.js`
   (add it to `sw.js` SHELL with the same `?v=` token style as the neighbours; main normalises tokens).
   Leave alone: `games/film/**`, `games/lib/**`, writers of the setting (the toggle that SETS the key),
   `save-engine.js` itself.

## Laws (quote each result)
- L1 New gate `tools/qa-sound-one-path.mjs` (node, no browser, < 10 s): 0 direct reads of `'dunia-emosi-sound'`
  outside `save-engine.js`/`speak.js`/setting writers, and 0 `speechSynthesis.speak(` / `new SpeechSynthesisUtterance`
  outside `speak.js` (film/lib excluded). Red on the current tree (expect ~17 readers, ~12 speech copies), green after.
  Add it to `tools/ci-verify.sh`.
- L2 New browser gate `tools/qa-speak-mute.mjs` (reads `QA_BASE`): spy `speechSynthesis.speak`; on 3 pages that
  speak at start (pick from the migrated ones, say which) — sound `'off'` gives 0 calls, `'on'` gives >= 1.
  Red proof: make `say()` ignore `soundOn()` -> the `'off'` case fails; restore.
- L3 No regression: `node tools/qa-profile-settings.mjs` (QA_BASE), `node tools/qa-mojo-sound.mjs`,
  `bash tools/ci-verify.sh`, and `node tools/run-gates.mjs --only` for the gates of each game you touched
  (list them). `node --check` every changed JS file.

## Rules
- Browser gates: `flock -w 1800 /tmp/claude-1000/kereta-browser.lock timeout 900 ...`, `TMPDIR=$HOME/.cache/qa-tmp`
  (`run-gates` already takes the lock itself — do not wrap it). One browser at a time. Never `pkill -f`.
- Read only gate summary lines. A gate that cannot fail proves nothing: show its red run.

## Return (under 40 lines)
Files migrated (reader count before/after, speech copies before/after); the 3 pages used in L2; red + green summary
lines for both new gates; L3 summary lines; anything left on purpose and why. Leave changes uncommitted; give the
worktree path.
