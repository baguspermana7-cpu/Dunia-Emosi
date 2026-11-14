# Audit: assets + content, Dunia Emosi (wt-dunia-cine), read-only, 2026-11-14

Method: Python scanners in scratchpad/ac/ (orph2.py, sus.py, miss.py, emo.py). Corpus = 645 html/js/json/css files (vendored games/film, games/lib and obsidian vault excluded). 17,912 files / 520 MB under assets/. No browser, no project edits.
Skill templates (asset-audit, content-audit, consistency-check) are GDD/registry driven; no GDD/registry exists here, so those sections are NOT ASSESSED and the checks were adapted to web.

## 1. Orphan assets (MEDIUM)
Pipeline: basename token anywhere (7,309 files) > dynamic dir pattern (4,269) > stem word (21) > none (365). Then each "none" was re-proven by raw substring incl. URL-encoded, unicode, `${}` templates; dynamic-dir hits re-checked for a stem that appears nowhere.
Dynamic patterns that cover files (so NOT orphans): game.js:1715 `assets/banner-game${n}.webp`; game.js:9401 bg-arena-*; game.js:5867 `pokemondb_hd_alt2/${id}_${slug}.webp` (1,025 files); games/kereta-art.js:179 + games/data/kereta-pack.js:109 `kereta/bg/<key>-landscape|portrait`; kuis-matematika.html:970 `math/sub-N.webp`; game.js:14657 `train/brave-loco-part${part}.mp3`; pokemon-run.html:739 MountainsLayers dir.
TRUE ORPHANS: 353 files, 23.1 MB (23,103,672 B). Lower bound (basename matching is lenient: a common basename elsewhere hides an orphan).
Top 20 by size:
 6,059,384 assets/train/The Brave Locomotive Original Score.mp3 (only orphan mp3; copyrighted film score)
 4,810,774 assets/car and vehicle/9779.eps (known)
 2,564,053 assets/car and vehicle/9779.jpg
 1,768,582 assets/Pokemon/pokemondb_hd_alt2/pokemon_database.md
 1,751,975 assets/background/MountainDuskGodot/MountainDuskGodot/Music/summer nights.ogg
 1,440,118 assets/train/mighty/_contact.png
   361,082 assets/zone-banner-arena.webp
   264,859 assets/Pokemon/background/batch/pokemon_city_backgrounds_pc.jsonl
   264,503 ..._mobile.jsonl
   262,498 assets/Pokemon/g19/shiny-crobat.webp
   208,480 assets/particle-glow.webp
   169,246 assets/bg-arena-dark-mobile-2.webp
   168,952 assets/leo-waving.webp
   167,638 assets/bg-arena-dark-pc-2.webp
   157,616 assets/bg-arena-day-pc-2.webp
   153,736 assets/progress-gem.webp
   135,908 assets/battle-counter-bg.webp
   134,514 assets/type-badge-template.webp
   130,382 assets/bg-ocean.webp
   124,178 assets/Pokemon/birds/pidgeot-right.webp
Clusters: 255 Godot project files under background/MountainDuskGodot (1.8 MB: __MACOSX, .import, .tscn, music; only MountainsLayers/*.png are used); Pokemon/g23/_backup (9 files, 645 KB); 185 .md in assets (2.4 MB, 178 are Pokemon/background/prompts); 6 files assets/Pokemon/birds (551 KB).
CORRECTION to the brief: the "three big mp3s" are NOT orphans except the Original Score. The four Pokemon OST mp3s (6.7 MB, assets/Pokemon/sound/*SoundLoadMate.com.mp3) are referenced (index.html:288, game.js:10255,10270, ducky-volley.html:73, pokemon-run.html:867, battle-modes.js:972). bg-music.mp3 (7.6 MB), sfx-train-station.mp3, bgm-odd/even, mojo-*.mp3 are all referenced. Separate LOW risk: those four are ripped commercial OST files ("SoundLoadMate.com") shipped in a public kids app.
Action: git rm the orphans (keep a list), add .gitignore for __MACOSX/*.import/_backup/prompts; move dev .md/.jsonl out of assets/.

## 2. Missing assets (literal paths): 5,090 literal refs scanned, 4 real misses
- MEDIUM style.css:1221 `url('assets/bg-game7-bayangan.webp')` file does not exist (G7 screen background 404; the gradient layer still paints). Fix: restore file or drop url().
- MEDIUM game.js:349 GAME_META[21].iconImg `assets/mario-pokemon/icon.png` missing; game.js:1727 renders `<img src alt="🍄">`, so the Mario Pokemon level-select shows a broken image with emoji alt text (also breaks the no-emoji rule). Fix: add icon or remove iconImg.
- LOW game.js:1715 requests assets/banner-game21.webp (21 absent; banners exist for 1-20,22). Falls back to gradient, one 404.
- LOW games/battle-arena.js:9 mentions background/gym/stadium-video.webp in a comment only (not a bug). Other 3 hits (tk-art.js:18, gt-trucks.js:2, mascot-sprites.js:3, museum-kereta.html:564) are comments/templates.

## 3. sw.js precache
SHELL has 207 entries; 0 point at missing files (checked every path, ?v= stripped). Total 8.74 MB. Largest: pixi.min.js 796 KB, style.css 428 KB, asset-index.js 244 KB, tk-grid.js 201 KB, star.mp3 192 KB. None above 1 MB, so no HIGH.
- LOW sw.js:60-66 comment says SHELL is "slim ~800KB"; it is 8.7 MB over 207 entries (doc drift; install is per-entry so failures are non-atomic, good).
- LOW sw.js:18 CACHE_VERSION 'v63.21-20261003b' while all SHELL tokens are v64.51-20261114a; works because URLs carry ?v=, but the HTML cache name never changes.

## 4. Content consistency / hub reachability
Hub = 33 gtile nodes in index.html (lines 610-995) + openLevelSelect/Region paths.
- HIGH games/kereta-maze.html (and its 6 kereta-maze*.js/css) has no link from index.html, game.js or any game; only sw.js:241 and a comment (index.html:2497). Tile gtile-15 now goes to mojo-swoptops.html?pack=kereta&hub=1. So the "Kereta Pemberani: Petualangan Rel" hub and the classic Lokomotif Pemberani page (games/lokomotif-pemberani.html, reached only through openLevelSelect(15) fired from kereta-maze, index.html:2506) are unreachable by a child. Action: confirm it was retired; remove or relink.
- MEDIUM G6 Petualangan Mobil: games/mobil.html + GAME_META[6] (game.js:335) + initGame6 exist but there is no gtile-6 and no openLevelSelect(6) caller. Same for G17 Jembatan Goyang (GAME_META[17], initGame17 game.js:12863, screen-game17 index.html:1724, no tile; game.js:12865 notes the standalone page does not exist). Dead or hidden games still in the gate lists (audit-no-emoji walks mobil.html).
- LOW games/_shell-smoke.html is a test page in games/ with no link (not an error, is it deployed?). mojo-chase-embed.html and balapan-kereta-side.html are reached indirectly (embed iframe, balapan-kereta), fine.
Name mismatches for the same game:
- G25: hub tile "Matematika Petualangan" + page title; GAME_META[25] "Kuis Matematika"; file kuis-matematika.html; docs say "Kuis Matematika".
- G22: tile + page "Monster Wants Candy"; GAME_META[22] "Monster Candy".
- G13c: tile + page "Gym Pokémon"; GAME_META['13c'] "Gym Huruf & Suara".
- G15: tile "Lokomotif Pemberani"; target page is Mojo pack titled "Petualangan Linus: The Brave Locomotive" (kereta-pack.js:21,602); kereta-maze title "Kereta Pemberani: Petualangan Rel".
- manifest.json name "Dunia Emosi — Belajar Sambil Bermain" vs index title "Dunia Emosi 🐾" (emoji in title, LOW) vs apple title "Dunia Emosi"; manifest icons all exist; manifest description still advertises "ratusan Pokemon" (LOW).
Action: pick one name per game and drive GAME_META and tile title from one table.

## 5. Owner content rules
Emoji: games/data/emoji-map.js has 500 mapped chars; resolver (ui-sprites.js:128-150) leaves unmapped emoji in the DOM and logs a GAP. Static scan of 206 source files (non-comment lines) found 7,318 emoji literals (game.js 2,362; balapan-kereta.html 599; museum-kereta.html 450; trains-db.js 394; obstacles.js 293; train-world.js 289; index.html 268; gym-pokemon.html 268). 297 distinct are NOT in the map (1,153 occurrences), e.g. flag 🇮🇩 x89 (word game game.js:807 emoji:'🇮🇩'), 🔵 x32 (game.js:194 color labels), 👻 26, 👇 23 (obstacles.js:155 hint text), 🌪 21, 👊 19, 🐛 17, 🇯🇵/🇩🇪 flags, 🛠 🔧. MEDIUM: EMOJI_GAP.md claims "ZERO gaps (2026-07-21)", but the map has grown stale versus code; whether each renders depends on runtime, so this is a static candidate list, not proven in-render (a browser run of tools/audit-no-emoji.mjs is needed; I did not start one). The 4 STRICT pages (timmy-kapal, garasi-tempur, stinky-dirty, ejaan-inggris) have only typographic marks (✕ ★ ✓) in source; no pictographic emoji.
Gate coverage: audit-no-emoji.mjs PAGES covers every games/*.html except _shell-smoke.html, plus index and #dashboard; root-level pages (secondbrain, plan*.html, pokemon-3d.html, credits.html) are not walked (LOW).
Hijab: `node tools/qa-content-rules.mjs` run now = 3 passed 0 failed (5 people sprites in code, all reviewed ok; no random pick from people pack). assets/db/people has 128 sprites; tools/people-reviewed.json: ok 5, blocked 28 ("woman without hijab", plus people/5 damaged), note 281. Docs mentioning the rule: docs/prd/README.md, PRD-27 (lines 10, 25), PRD-26, SPEC-EMOSI-REPLACEMENT, adoption-plan-2026-11-14, G30-G31-CONTINUATION, KERETA-* briefs. LOW: PRD-27 line 10 cites `tools/qa-out/people-reviewed.json` but the gate reads `tools/people-reviewed.json`.

## 6. docs/prd README vs file Status (25 files, 25 index rows, all present)
Mismatches (README says live, file still says in progress):
- PRD-19a file "dikerjakan 2026-11-14", README "live v64.43"
- PRD-24 "dikerjakan", README live v64.44
- PRD-25 "dikerjakan", README live v64.43
- PRD-26 "dikerjakan", README live v64.47 (4 pack)
- PRD-32 "dikerjakan", README live v64.43
- PRD-08b "dikerjakan", README live v64.44
- PRD-10 file: "generator Kuis/kereta belum memakai tingkat"; README: "live v64.44; generator v64.48" (direct contradiction)
- PRD-27 file: "bagian browser (emoji tampil, outline putih) belum"; README "live v64.45 (outline 1048 -> 142)" and tools/qa-no-emoji.mjs now exists; README still says audit-no-emoji is "belum masuk runner" (line 31), also stale.
Consistent: 06, 07, 11, 13, 14, 15, 16C, 17b, 18, 19b, 20, 21, 22, 23, 29, 31. LOW overall; action: README says status is updated "tiap rilis"; update the per-file Status lines the same release.

## Counts
CRITICAL 0 | HIGH 1 | MEDIUM 5 | LOW 9
