# Dunia Emosi - tech debt / security+privacy / perf (static) audit
Tree: /home/baguspermana7/rz-work/wt-dunia-cine (read-only; no files edited, no browser, no git change). Date 2026-11-14.
Scope: index.html, game.js, games/*.html|js, games/data/*.js, sw.js, vercel.json. games/film/** and games/lib/** only for library versions.
Method: grep/awk/python over the tree; every finding below was opened at the cited line. Scratch scripts: .../scratchpad/s/

Totals: CRITICAL 0 | HIGH 1 | MEDIUM 9 | LOW 6 (+ 6 verified-clean checks)

## SECURITY & PRIVACY (child audience)

S1 HIGH - Google Fonts loaded at runtime on the hub and 19 game pages (child IP + UA sent to Google on every launch; fails offline).
 Evidence: index.html:7 `<link href="https://fonts.googleapis.com/css2?family=Nunito...Fredoka...Baloo 2">`; `grep -rl fonts.googleapis` = 23 html files (19 served games/hub + secondbrain.html, plb.html, tools/, proposals/). sw.js:400 `if (url.origin !== self.location.origin) return` so fonts are never cached -> offline tablet falls back to system font AND online every start calls Google.
 Action: self-host the 4 families as woff2 under assets/fonts, @font-face with font-display:swap, add to SW SHELL; delete the <link>s.

S2 MEDIUM - Unescaped player name into innerHTML.
 Evidence: game.js:2477 `<div class="rs-name">${state.players[i].name || 'Pemain'}</div>` and game.js:4084 `${p.name||'Pemain'}` (innerHTML at ~4079). Name source: index.html:484/501 input maxlength=12 -> game.js:2023 `state.players[0].name=n1` (no escaping). maxlength is not enforced for values restored from localStorage ('dunia-players', game.js:427/1335/1899) or from cloud restore (math-cloud.js syncs every key matching ^(mp_|dunia)). Self-XSS only today (12 chars ~ cannot hold a working payload), but markup like `<b>`/`<img>` breaks layout, and the cloud-restore path makes it a stored-injection path when cloud is enabled. Note a local `esc` exists at game.js:4059 but only inside another function scope.
 Action: use textContent, or one shared escHtml (see T3) at these two sites; clamp name on load (slice(0,12)).

S3 MEDIUM - Third-party sprite hosts hit at runtime.
 Evidence: img.pokemondb.net: 31 refs, live fallbacks at game.js:1575, 3266, 5846; games/monster-candy.html:116,977,1257,1275; games/ducky-volley.html:1391,1538; games/pokemon-run.html:477,1996-2006,2632. play.pokemonshowdown.com: 5 refs; raw.githubusercontent.com (game.js:5853-5854, but pokeSpriteBackup/Back are dead, see T6). Not cached by SW (S1). Each request leaks IP + Referer to a non-child-safe third party whenever a local webp is missing.
 Action: ensure local asset coverage (a gate: every slug resolves locally), delete CDN fallbacks; add `<meta name="referrer" content="no-referrer">` as defence.

S4 MEDIUM - Unpinned CDN scripts, no SRI, run in the app origin.
 Evidence: index.html:2348 `https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js` (floating major); games/data/math-cloud.js:39 `@supabase/supabase-js@2` (floating, only when cloud on); secondbrain.html:12 unpkg vis-network (dev page). A vendored pixi.min.js already exists: games/lib/pixi.min.js.
 Action: load PixiJS from the local copy / pin exact version + integrity hash; vendor supabase-js if cloud ever ships.

S5 MEDIUM - Cloud sync of child data is wired, inert, but has no parent gate / consent step.
 Evidence: games/kuis-matematika.html:784 bakes `window.MATH_SUPABASE={url:'https://iaiyoazomujscqrpknbq.supabase.co',anonKey:'eyJ...role":"anon"...'}`; math-cloud.js:10-33,38-40: when localStorage mp_cloud_on='1' (set by a button in root plb.html) it uploads every key matching ^(mp_|dunia) (player names, progress) and leaderboard name via submitScore. The anon key is public by design (role=anon) = NOT a leaked secret; no service_role found anywhere (grep). plb.html contains owner setup steps incl. "Rotate service_role + sb_secret_ yang dulu bocor" (plb.html:370) - confirm rotation happened. plb.html is a root page; check it is not served to children (.vercelignore does not list it as far as read).
 Not verified: RLS/RPC hardening in supabase/dunia-cloud-v2.sql (outside this audit).
 Action: keep inert; before enabling, gate behind a parent PIN + consent text, never sync raw names (use avatar slug), exclude plb.html/secondbrain.html/proposals from deploy.

S6 LOW - No security/privacy headers.
 Evidence: vercel.json has only Cache-Control/CORS rules (grep -c "X-Frame|Content-Security" = 0); the repo also deploys to GitHub Pages (.github/workflows/pages.yml, .nojekyll) where headers cannot be set. assets/* served with Access-Control-Allow-Origin:* (vercel.json:7).
 Action: add Referrer-Policy: no-referrer, X-Content-Type-Options: nosniff, a CSP (script-src 'self' + whatever remains) in vercel.json and equivalent <meta> tags in index.html.

S7 LOW - Old vendored libs (games/film, out of scope except version note): jQuery 3.6.0 (games/film/thomas-jigsaw/src/jquery-3.6.0.min.js), PixiJS v4/v5 bundles (EOL), Phaser 3 x25, createjs. No specific CVE verified; track for the film packs only.

S8 LOW - mojo-chase-embed.js loads a script URL from the query string; safeUrl() (line 11) restricts to same-origin, so risk is limited to the origin's own files. Fine, listed for completeness.

Verified clean (no finding): eval/new Function = 0 hits; postMessage: 2 listeners (games/blippi.html:21 checks e.origin===location.origin; game.js:7516 / sw-reload.js:54 are SW messages) and sender mojo-chase-embed.js:10 uses location.origin; external <a href=http>/window.open/location.href=http = 0 hits (no leave-the-app link, no parent gate needed); SW only caches same-origin GET (sw.js:397-400) and its message handler only accepts the 'SKIP_WAITING' string; film-play.html:292 slug is regex-stripped + whitelist before iframe src; no analytics/tracker domains found (only the hosts above); no secrets besides the public anon key. games/data/{learning-log,review-queue,mastery}.js contain no innerHTML.

## TECH DEBT (impact / effort)

T1 MEDIUM (impact M, effort M) - 14 independent SpeechSynthesis implementations, no shared narration module.
 Evidence: `grep -l SpeechSynthesisUtterance` = games/lokomotif-pemberani.html:2359, selamatkan-kereta.html, museum-kereta.html, tk-hub.js:114, obstacle-engine.js, mojo-swoptops.js:94, tk-quiz.js:918/928, train-shared.js:363, data/breathe.js:27, error-kinds.js:49, feeling-checkin.js:50, kereta-bgsound.js, freeze-watchdog.js:195, game.js:14005. Rates differ (0.85/0.8/0.95), several call cancel() blindly, each re-checks mute itself (T2).
 Action: one DuniaSpeak.say(text,{lang,rate}) honouring the sound setting + cancel policy; migrate file by file.

T2 MEDIUM (M/S) - Sound setting read straight from localStorage in 17 files / 21 sites with copy-pasted try/catch.
 Evidence: 'dunia-emosi-sound' at game.js:2179,2192,2839, error-kinds.js:45, stinky-dirty.js:41, garasi-tempur.js:992, timmy-kapal.js:180/1290, mojo-board-look.js:388, tk-board-look.js:294, mojo-chase-quiz.js:140, mojo-chase-menu.js:36, ejaan-inggris.js:54, kereta-bgsound.js:171, feeling-checkin.js:46, kereta-life.js:97; also a second mute key 'bm-mute' (2 sites). save-engine.js:209-212 already owns the per-child settings keys (SETTING_KEYS) but exports no reader.
 Action: add DuniaSettings.soundOn() to save-engine.js (already loaded by 21 of 26 game pages) and replace the copies; fold 'bm-mute' into it.

T3 MEDIUM (M/S) - 21 files define their own HTML escaper, with different behaviour.
 Evidence: games/sd-engine.js:150 and ejaan-inggris.js:614 escape only & and < (no quote, so unsafe if used in an attribute); garasi-tempur.js:24, gt-card.js:30 escape & < "; tk-quiz.js:56 numeric entities; balapan-kereta.html:6792 escapes 4 chars; game.js:4059 and 2673 (escHtml, no quote) separate again. Meanwhile game.js:2477/4084 escape nothing (S2).
 Action: one shared esc in games/data (e.g. dunia-bus.js or a new util) escaping & < > " '; add a gate banning local copies.

T4 MEDIUM (M/M) - Direct localStorage scattered: 257 getItem/setItem/removeItem calls in 50 game files (game.js 82, games/*.html 76, games/*.js 78, games/data 64), only 21 of 26 game pages load save-engine.js. game.js parses the same 'dunia-players' key in at least 3 places (427, 1335, 1899 via PLAYER_SLOTS_KEY while others use the literal). games/balapan-kereta-side.html writes localStorage but references neither saveLevelProgress nor save-engine (awk over games/*.html: only page with setItem>0 and 0 refs).
 Action: route progress writes of balapan-kereta-side through saveLevelProgress; export one DuniaProfile.getSlots(); remove literal duplicates.

T5 MEDIUM (M/L) - God files. game.js = 14,960 lines / 899 KB, 449 top-level functions and 179 top-level const/let; it mixes hub UI, profile + XP + tiers, dashboard (game.js:4059-4115), per-game logic for g3/g4/g7/g8/g10..., battle code, TTS (14005), SW registration + update reload (7499-7525), error overlay (2673). 12 files exceed 2,000 lines: games/balapan-kereta.html 7,476 (491 KB, inline CSS+JS+markup), data/battle-modes.js 5,802, data/train-world.js 5,020, lokomotif-pemberani.html 4,664, selamatkan-kereta.html 3,473, gym-pokemon.html 3,190, pokemon-run.html 2,979, tk-grid.js 2,911, mario-pokemon.html 2,740, data/obstacles.js 2,571, tk-steer.js 2,383, museum-kereta.html 2,256. 731 innerHTML assignments total (game.js 142 + 589 in games/) - XSS surface (S2) scales with this.
 Action: split game.js along existing "// ──" section banners (105 of them) into games/hub-*.js loaded with defer; extract inline scripts of the >3,000-line pages to .js.

T6 LOW (L/S) - Dead top-level functions in game.js: 17 of 449 (3.8%) referenced exactly once in the whole 9.6 MB of JS/HTML (word-count; a string-dispatched call would show a 2nd hit): emoFaceSrc, g10ShowAttack, g18QuestionElapsedSec, g6BuildCarSelector, getDiagnosticDistractors, getMathLimits (game.js:2205), playBreathIn, playBreathOut, pokeSprite (5846), pokeSpriteArtwork, pokeSpriteBack, pokeSpriteBackup, renderAsset, renderPokeHpBar, resetBag (1117), startGameWithDiff, stopZoneKeretaMusic. pokeSpriteArtwork/Backup/Back are the only builders of raw.githubusercontent / pokemondb artwork URLs - removing them also removes S3 surface.
 Action: delete after a final grep of dynamic access (window[...]).

T7 NONE - Global name collisions: python scan of index.html + 26 games/*.html, resolving every classic <script src> and inline script, comparing column-0 const/let/class/function/var names per page -> 0 collisions (script /scratchpad/s/coll.py). Caveat: indented top-level declarations, type=module and dynamically injected scripts not covered.

## PERFORMANCE (static)

P1 LOW-MEDIUM - Hub payload: game.js 899 KB + style.css 428 KB + index.html 175 KB (~1.5 MB raw) on every cold start; games/data/asset-index.js is a single 242,961-char line (244 KB). game.js is loaded `defer` (index.html:2451) and only 5 non-deferred <script> tags exist in index.html, none in <head> with src -> no render-blocking script finding. Action: minify/gzip check on host; split game.js (T5).

P2 LOW - Images without dimensions: index.html has 44 <img>, 44 lack width/height (static markup; layout shift on tablets). Action: add width/height or CSS aspect-ratio.

P3 LOW - Always-on timers without a hidden-state pause (no visibilitychange/document.hidden in the file): games/data/kereta-life.js:235 (350/160/1200 ms), games/dunia-cinema-pixi.js:163,196,237, games/dunia-home.js:46 (250 ms), games/data/kereta-pack.js:476, games/kuis-matematika.html:927 (1 s, screen-guarded but not hidden-guarded). Mitigations that exist: games/data/freeze-watchdog.js:77,328 clears stale game intervals on visibilitychange; browsers clamp hidden timers to ~1 Hz. Action: gate these on document.hidden.

P4 LOW - 589+142 innerHTML rebuilds (T5) are the likely main-thread cost on mid-range tablets; profile before changing.

Verified clean: rAF loops - game.js 3 rAF / 10 cancelAnimationFrame; train-vfx.js loops self-terminate when queues empty (97,290,407); pokemon-run.html rAF uses are one-shot (583-2155); gt-fx.js/g27-scene.js/tk-lanes.js/tk-cinema.js handle visibilitychange. No inline blob >1 MB.

## Top actions (order)
1 Self-host fonts (S1)  2 Escape/textContent the two name sinks + shared esc (S2,T3)  3 Drop CDN sprite fallbacks + referrer policy (S3,S6)  4 Vendor/pin Pixi (S4)  5 Sound/TTS/save shared modules (T1,T2,T4)  6 Parent gate + data minimisation before cloud sync (S5)  7 Split game.js (T5)
