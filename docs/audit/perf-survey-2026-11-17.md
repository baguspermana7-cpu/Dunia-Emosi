# Perf survey 2026-11-17

Tool: `tools/qa-perf-survey.mjs` (report only). 390x844 @2x mobile+touch, CPU throttle 4x, sound off, headless chrome (gpu flags as qa-action-latency), local node server with gzip, service worker bypassed.
Load = navigation timing under throttle; MB/req/js/img = CDP encodedDataLength at load+1 s. Idle = 5 s on the first screen; play = 15 s of the least-tapped-control tapper (tapper scan + screenshot frames excluded; "left page" = taps that navigated away, page reloaded; muted % = share of the window excluded). Frame stats from rAF intervals: p50, p95, % of frames > 33 ms. LT = long tasks (>50 ms) count / total ms. Heap = usedJSHeapSize at end of play. loadavg at start 8.84 8.71 9.28 / end 10.91 10.1 9.6 (8 cpus).

Sorted by play p95, worst first (frame times are quantised to 16.7 ms steps, so ties are broken by long-task ms).

| page | load ms | DCL ms | MB | req | JS MB | img MB | idle p95 | play p50 | play p95 | >33ms % | LT n / ms | heap MB (start>end) | DOM | canv / 2d / GL | taps / actions / left page / muted % | errs (page / console) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| timmy-kapal.html | 2471 | 2391 | 3.101 | 93 | 0.567 | 2.443 | 50 | 16.7 | 83.4 | 20.1 | 19 / 2521 | 6.61>6.872 | 654 | 0 / 0 / 0 | 21 / 17 / 0 / 19 | 0 / 0 |
| gym-pokemon.html | 4904 | 1344 | 9.992 | 375 | 0.228 | 9.618 | 50 | 16.7 | 66.6 | 12.7 | 17 / 3244 | 3.897>8.164 | 1442 | 1 / 0 / 0 | 20 / 14 / 1 / 22 | 0 / 0 |
| pokemon-bawah-laut.html | 2598 | 2356 | 0.47 | 33 | 0.289 | 0.099 | 33.4 | 16.7 | 66.6 | 13.5 | 22 / 2738 | 9.24>20.412 | 132 | 1 / 3 / 4 | 15 / 4 / 2 / 6 | 0 / 0 |
| pokemon-run.html | 2527 | 2287 | 0.791 | 52 | 0.319 | 0.303 | 33.4 | 16.7 | 66.6 | 10.9 | 24 / 2330 | 8.934>12.596 | 193 | 2 / 4 / 3 | 22 / 5 / 1 / 10 | 0 / 0 |
| selamatkan-kereta.html | 4271 | 2985 | 1.662 | 109 | 0.41 | 0.51 | 16.8 | 16.7 | 50.1 | 16.3 | 13 / 2551 | 7.666>15.892 | 1838 | 383 / 22 / 3 | 23 / 5 / 0 / 17 | 0 / 0 |
| film-anak.html | 558 | 554 | 0.312 | 27 | 0.017 | 0.239 | 16.7 | 16.7 | 50.1 | 7.3 | 13 / 1147 | 2.04>8.468 | 1450 | 4 / 0 / 0 | 4 / 3 / 4 / 0 | 0 / 0 |
| pokemon-birds.html | 2583 | 2314 | 0.821 | 39 | 0.281 | 0.225 | 33.4 | 16.7 | 50 | 9.6 | 15 / 2412 | 10.414>16.253 | 125 | 1 / 4 / 4 | 16 / 4 / 2 / 4 | 0 / 0 |
| museum-kereta.html | 2479 | 1041 | 0.571 | 63 | 0.076 | 0.426 | 50 | 16.7 | 50 | 10.8 | 12 / 1970 | 2.19>2.66 | 791 | 0 / 0 / 0 | 21 / 10 / 0 / 30 | 0 / 0 |
| ducky-volley.html | 2182 | 1547 | 2.265 | 36 | 0.301 | 0.046 | 16.8 | 16.7 | 50 | 9.5 | 16 / 1927 | 8.582>16.022 | 130 | 1 / 4 / 3 | 20 / 4 / 2 / 3 | 0 / 0 |
| index.html | 3878 | 3199 | 2.304 | 157 | 0.523 | 0.906 | 50 | 16.7 | 50 | 7.6 | 14 / 1910 | 5.531>6.119 | 1939 | 4 / 0 / 0 | 24 / 12 / 0 / 18 | 0 / 0 |
| monster-candy.html | 3406 | 2847 | 0.728 | 44 | 0.302 | 0.061 | 16.8 | 16.7 | 50 | 8 | 13 / 1797 | 9.223>10.662 | 358 | 0 / 0 / 0 | 15 / 3 / 2 / 4 | 0 / 0 |
| kuis-matematika.html | 1348 | 1134 | 0.836 | 55 | 0.11 | 0.617 | 33.4 | 16.7 | 50 | 9.3 | 16 / 1304 | 2.997>2.618 | 412 | 0 / 0 / 0 | 24 / 12 / 0 / 11 | 0 / 0 |
| balapan-kereta.html | 3015 | 2771 | 1.54 | 92 | 0.507 | 0.236 | 16.8 | 16.7 | 49.9 | 7.9 | 14 / 1685 | 9.712>12.285 | 524 | 2 / 10 / 3 | 24 / 18 / 0 / 9 | 0 / 0 |
| lokomotif-pemberani.html | 6972 | 6675 | 4.836 | 438 | 0.451 | 3.658 | 16.8 | 16.7 | 33.4 | 4.5 | 9 / 1949 | 6.676>6.877 | 752 | 1 / 3 / 3 | 18 / 9 / 0 / 52 | 0 / 0 |
| kereta-maze.html | 1400 | 768 | 1.082 | 42 | 0.165 | 0.818 | 33.3 | 16.7 | 33.4 | 4.8 | 18 / 1752 | 3.569>4.043 | 502 | 4 / 27 / 0 | 25 / 18 / 0 / 11 | 0 / 0 |
| balapan-kereta-side.html | 2532 | 1989 | 0.618 | 64 | 0.417 | 0.145 | 16.7 | 16.7 | 33.4 | 4.3 | 4 / 675 | 8.976>16.716 | 255 | 1 / 3 / 3 | 20 / 8 / 1 / 6 | 0 / 0 |
| mario-pokemon.html | 2315 | 1932 | 0.581 | 46 | 0.284 | 0.152 | 33.4 | 16.7 | 33.4 | 5.3 | 8 / 580 | 8.134>7.321 | 129 | 1 / 3 / 3 | 25 / 4 / 0 / 3 | 0 / 0 |
| mobil.html | 2804 | 2284 | 2.26 | 52 | 0.278 | 0.257 | 33.3 | 16.7 | 33.3 | 3.3 | 13 / 1524 | 8.598>8.275 | 182 | 1 / 3 / 3 | 24 / 7 / 1 / 5 | 0 / 0 |
| mojo-swoptops.html | 1902 | 1833 | 2.53 | 91 | 0.407 | 0.235 | 33.3 | 16.7 | 33.3 | 2.8 | 10 / 1162 | 4.166>4.756 | 605 | 2 / 4 / 0 | 25 / 11 / 0 / 9 | 0 / 0 |
| ayo-berhitung.html | 1538 | 1154 | 0.13 | 20 | 0.056 | 0.02 | 16.8 | 16.7 | 33.3 | 2.6 | 8 / 534 | 2.801>1.943 | 236 | 0 / 0 / 0 | 25 / 19 / 0 / 7 | 0 / 0 |
| ejaan-inggris.html | 936 | 899 | 0.27 | 29 | 0.072 | 0.17 | 33.3 | 16.7 | 33.3 | 1.5 | 4 / 528 | 3.261>2.619 | 470 | 1 / 1 / 0 | 25 / 18 / 0 / 9 | 0 / 1 |
| stinky-dirty.html | 800 | 756 | 0.402 | 25 | 0.114 | 0.2 | 33.4 | 16.7 | 33.2 | 1.7 | 6 / 526 | 3.651>4.436 | 292 | 0 / 2 / 0 | 24 / 13 / 0 / 10 | 0 / 0 |
| film-play.html | 572 | 563 | 0.075 | 9 | 0.014 | 0 | 16.7 | 16.7 | 16.8 | 3.2 | 6 / 520 | 2.459>7.807 | 279 | 0 / 0 / 0 | 4 / 1 / 4 / 0 | 0 / 0 |
| garasi-tempur.html | 1467 | 1382 | 0.897 | 45 | 0.15 | 0.656 | 33.4 | 16.7 | 16.8 | 1.5 | 5 / 362 | 2.618>3.068 | 513 | 0 / 0 / 0 | 25 / 7 / 0 / 11 | 0 / 0 |
| blippi.html | 198 | 137 | 0.002 | 4 | 0 | 0 | 16.7 | 16.7 | 16.7 | 0 | 0 / 0 | 2.27>2.722 | 12 | 0 / 0 / 0 | 0 / 0 / 0 / 1 | 0 / 2 |
| mojo-chase-embed.html | 464 | 464 | 0.263 | 29 | 0.229 | 0 | 16.8 | 16.7 | 16.7 | 0 | 0 / 0 | 3.759>4.033 | 35 | 0 / 0 / 0 | 0 / 0 / 0 / 1 | 0 / 0 |

## Largest resources at load (top 3 per page)

- timmy-kapal.html: assets/db/lib/tk-scene/jungle-falls-port.webp (Image, 351 kB); assets/db/lib/tk-scene/underwater-port.webp (Image, 272 kB); assets/db/lib/tk-scene/sunset-port-port.webp (Image, 242 kB)
- gym-pokemon.html: assets/Pokemon/pokemondb_hd_alt2/0792_lunala.webp (Image, 79 kB); assets/Pokemon/pokemondb_hd_alt2/0643_reshiram.webp (Image, 77 kB); assets/Pokemon/pokemondb_hd_alt2/0483_dialga.webp (Image, 75 kB)
- pokemon-bawah-laut.html: games/lib/pixi.min.js?v=8 (Script, 220 kB); assets/fonts/Nunito-latin-c67f9657.woff2 (Font, 38 kB); assets/Pokemon/pokemondb_hd_alt2/0129_magikarp.webp (Image, 36 kB)
- pokemon-run.html: games/lib/pixi.min.js?v=8 (Script, 220 kB); assets/background/gym/g13c-bg-forest-m.webp (Image, 115 kB); assets/g23-icon.png?v=20260506i (Image, 60 kB)
- selamatkan-kereta.html: Sounds/train-crossing-sfx.mp3 (Media, 436 kB); games/lib/pixi.min.js?v=8 (Script, 220 kB); Sounds/train-bgm.mp3 (Media, 213 kB)
- film-anak.html: assets/fonts/Baloo2-latin-195f2e7b.woff2 (Font, 32 kB); assets/film-thumbs/thomas-musical-tracks.webp (Image, 31 kB); assets/film-thumbs/thomas-rail-muddle.webp (Image, 17 kB)
- pokemon-birds.html: assets/Pokemon/sound/wing-flap.mp3 (Media, 243 kB); games/lib/pixi.min.js?v=8 (Script, 220 kB); assets/Pokemon/g19/pidgeot.webp (Image, 69 kB)
- museum-kereta.html: games/museum-kereta.html (Document, 51 kB); assets/train/world/006.webp (Image, 17 kB); assets/train/world/019.webp (Image, 17 kB)
- ducky-volley.html: assets/Pokemon/sound/01%20~Opening~%EF%BC%88%EF%BC%91%EF%BC%99%EF%BC%99%EF%BC%97%EF%BC%8D%EF%BC%91%EF%BC%99%EF%BC%99%EF%BC%98%EF%BD%9C%EF%BC%AD%EF%BC%90%EF%BC%91%EF%BC%89%20-%20Satoshi%20Sakai%20No%20Masta%20-%20SoundLoadMate.com.mp3 (Media, 1816 kB); games/lib/pixi.min.js?v=8 (Script, 220 kB); assets/sfx/whoosh.mp3?v=20260422a (Media, 39 kB)
- index.html: assets/sfx-train-bg.mp3 (Media, 436 kB); assets/sfx-train-horn.mp3 (Media, 213 kB); game.js?v=v64.59-20261117a (Script, 173 kB)
- monster-candy.html: Sounds/battle-bgm.mp3 (Media, 230 kB); games/lib/pixi.min.js?v=8 (Script, 220 kB); assets/sfx/whoosh.mp3?v=20260422a (Media, 39 kB)
- kuis-matematika.html: assets/math/map-main.webp (Image, 145 kB); assets/math/sub-1.webp (Image, 130 kB); assets/math/bg-battle.webp (Image, 85 kB)
- balapan-kereta.html: Sounds/train-crossing-sfx.mp3 (Media, 436 kB); games/lib/pixi.min.js?v=8 (Script, 220 kB); Sounds/train-bgm.mp3 (Media, 213 kB)
- lokomotif-pemberani.html: Sounds/train-crossing-sfx.mp3 (Media, 436 kB); games/lib/pixi.min.js?v=8 (Script, 220 kB); Sounds/train-bgm.mp3 (Media, 213 kB)
- kereta-maze.html: assets/train/backdrop/level43-1600.webp (Image, 379 kB); assets/train/backdrop/level34-640.webp (Image, 66 kB); assets/train/backdrop/level20-640.webp (Image, 65 kB)
- balapan-kereta-side.html: games/lib/pixi.min.js?v=8 (Script, 220 kB); games/balapan-kereta-side.html (Document, 35 kB); games/data/obstacles.js?v=v64.59-20261117a (Script, 21 kB)
- mario-pokemon.html: games/lib/pixi.min.js?v=8 (Script, 220 kB); games/mario-pokemon.html (Document, 36 kB); assets/mario-pokemon/sprites/pikachu-idle.gif (Image, 33 kB)
- mobil.html: Sounds/racecar.mp3 (Media, 1730 kB); games/lib/pixi.min.js?v=8 (Script, 220 kB); assets/car%20and%20vehicle/top-view/top_car_white_gt_01.png (Image, 20 kB)
- mojo-swoptops.html: assets/audio/mojo-theme.mp3 (Media, 909 kB); assets/audio/mojo-theme.mp3 (Media, 909 kB); assets/db/lib/mojo-bg/title-clean-port.webp (Image, 69 kB)
- ayo-berhitung.html: assets/fonts/Nunito-latin-c67f9657.woff2 (Font, 38 kB); games/ayo-berhitung.html (Document, 15 kB); assets/db/badge/004.webp (Image, 12 kB)
- ejaan-inggris.html: assets/spelling/scenes/construction-port.webp (Image, 57 kB); assets/spelling/ui/title-logo.webp (Image, 27 kB); assets/spelling/prop/truck.webp (Image, 27 kB)
- stinky-dirty.html: assets/db/lib/sd/world-story-forest-port.webp (Image, 82 kB); assets/db/lib/sd/logo.webp (Image, 41 kB); assets/fonts/Nunito-latin-c67f9657.woff2 (Font, 38 kB)
- film-play.html: assets/fonts/Baloo2-latin-195f2e7b.woff2 (Font, 32 kB); assets/fonts/FredokaOne-latin-ccbe1225.woff2 (Font, 15 kB); games/film-play.html (Document, 12 kB)
- garasi-tempur.html: assets/db/lib/gt-arena/stadion-malam-port.webp (Image, 424 kB); assets/fonts/Nunito-latin-c67f9657.woff2 (Font, 38 kB); games/data/asset-index.js?v=v64.59-20261117a (Script, 30 kB)
- blippi.html: assets/fonts/fonts.css?v=v64.59-20261117a (Stylesheet, 1 kB); games/blippi.html (Document, 1 kB); game1/?dari=dunia (Document, 0 kB)
- mojo-chase-embed.html: games/mojo-chase.js?v=v64.59-20261117a (Script, 52 kB); games/data/asset-index.js?v=v64.59-20261117a (Script, 30 kB); games/mojo-chase-atmos.js?v=v64.59-20261117a (Script, 19 kB)

## Tapper reach (menu-suspect = 3 or fewer distinct actions)

- timmy-kapal.html: 21 taps, 17 actions: button#btn-start div#gocard div#play-host div.tks-plate small:kamar timmy button.tks-btn div.tkh span.chip button.tkh-btn i:awal petuala div.tks-cap i:timmy button.tks-skip b:lanjut
- gym-pokemon.html: 20 taps, 14 actions: div.pkg-card button#btn-pkg-gs div.pkg-label span.pkg-tier button#gw-fight p:main sendiri button#tcf-go button#adv-vs-skip div.ba-narrate button#btn-fight button.move-btn button.qz-pill button#btn-back button#btn-badges
- pokemon-bawah-laut.html: 15 taps, 4 actions: screen canvas#pixi-canvas button.choice-btn button#btn-back
- pokemon-run.html: 22 taps, 5 actions: screen canvas#pixi-canvas button#jump-btn button#slide-btn button#btn-back
- selamatkan-kereta.html: 23 taps, 5 actions: button#btn-start canvas#pixi-canvas img.ui-sprite button.gp-btn button.choice-btn
- film-anak.html: 4 taps, 3 actions MENU-SUSPECT: span.play svg span:beranda
- pokemon-birds.html: 16 taps, 4 actions: screen canvas#pixi-canvas button.choice-btn button#btn-back
- museum-kereta.html: 21 taps, 10 actions: img.ui-sprite button#g18-random-btn div#g18-light-modal button.g18-light-close button.g18-tab span.g18-tab-thumb div#g18-daily-trivia div#g18-modal button:storybook button
- ducky-volley.html: 20 taps, 4 actions: div#start-overlay canvas#pixi-canvas button#btn-jump button#btn-back
- index.html: 24 taps, 12 actions: button#landing-mode-btn span button.home-btn div.mode-card button.pslot-chip span.psc-av button.animal-btn button.age-btn button.btn div#gtile-3 screen button.level-back-btn
- monster-candy.html: 15 taps, 3 actions MENU-SUSPECT: div#start-overlay canvas#pixi-canvas button#btn-back
- kuis-matematika.html: 24 taps, 12 actions: button.br-play button.icon-btn div.node div.node-pin span.cap button.skill-card button#skill-start screen button.choice button#bomb-btn img span.mix
- balapan-kereta.html: 24 taps, 18 actions: button#g14-mode-toggle button.cat-btn div#sel-crumb span.cat-thumb button.train-card button#go-btn span.cta button#g14-tut-go canvas#pixi-canvas button#btn-map div#g14-map-ovl button#g14-map-close button#btn-boost img.ui-sprite
- lokomotif-pemberani.html: 18 taps, 9 actions: div#station-intro screen button:tutup span#si-icon div.si-text button.tfbtn img div.tcard canvas#pixi-canvas
- kereta-maze.html: 25 taps, 18 actions: button#b-start button#kb-go button#n-map button#kc-go button#n-char button.kchip canvas.kb-ground button#kg-info button#kg-help button.kcmd span:belok kiri span:belok kanan span.kbtn-ic div.klane
- balapan-kereta-side.html: 20 taps, 8 actions: button.tut-btn button.tut-skip canvas#pixi-canvas img.ui-sprite button:lanjutkan button#btn-jump button:ganti kereta button.tut-rewatch
- mario-pokemon.html: 25 taps, 4 actions: canvas#pixi-canvas button#btn-left button#btn-right button#btn-jump
- mobil.html: 24 taps, 7 actions: button.ovl-btn canvas#pixi-canvas button#btn-left button#btn-right button.gm-btn button#btn-back button.v-btn
- mojo-swoptops.html: 25 taps, 11 actions: button.btn button#btn-play button#in-go button#btn-rule button#rule-say i.ico button#rule-close button#btn-run button#btn-quit button.map-pin button.lvl
- ayo-berhitung.html: 25 taps, 19 actions: button:tambah button:kurang button:kali button:bagi button:cerita button:mudah button:sedang button:sulit button:bebas button button#btn-new button#btn-repeat button#btn-find img.ui-sprite
- ejaan-inggris.html: 25 taps, 18 actions: button#btn-play div.card button#lv1 button#lv2 div.wcard img button#btn-listen div.slot div.tile button#btn-hint screen button.xbtn button#btn-ask button.askb
- stinky-dirty.html: 24 taps, 13 actions: button#btn-start button#btn-session button#btn-go button#btn-quit button.btn button#btn-replay button.opt span.mark button#btn-hint svg span.t button#btn-check button#btn-next
- film-play.html: 4 taps, 1 actions MENU-SUSPECT: svg
- garasi-tempur.html: 25 taps, 7 actions: button#btn-practice button#team-edit div#custom-list span.mini b.mini-hp img.mini-t span.mini-n
- blippi.html: 0 taps, 0 actions MENU-SUSPECT: 
- mojo-chase-embed.html: 0 taps, 0 actions MENU-SUSPECT: 

## Errors

- games/ejaan-inggris.html: 0 page, 1 console. Failed to load resource: the server responded with a status of 404 (Not Found)
- games/blippi.html: 0 page, 2 console. Failed to load resource: the server responded with a status of 404 (Not Found)

## Run-to-run spread (same tree, run A then run B)

| page | p95 A / B | >33ms % A / B | long-task ms A / B | load ms A / B |
|---|---|---|---|---|
| timmy-kapal.html | 50.1 / 83.4 | 13.8 / 20.1 | 1534 / 2521 | 2834 / 2471 |
| gym-pokemon.html | 50 / 66.6 | 10.2 / 12.7 | 2923 / 3244 | 4822 / 4904 |
| pokemon-bawah-laut.html | 16.8 / 66.6 | 0 / 13.5 | 94 / 2738 | 2273 / 2598 |
| pokemon-run.html | 16.7 / 66.6 | 0 / 10.9 | 106 / 2330 | 2473 / 2527 |
| selamatkan-kereta.html | 50 / 50.1 | 13.6 / 16.3 | 1739 / 2551 | 3390 / 4271 |
| film-anak.html | 99.9 / 50.1 | 8 / 7.3 | 1222 / 1147 | 701 / 558 |
| pokemon-birds.html | 50 / 50 | 9.5 / 9.6 | 2219 / 2412 | 2516 / 2583 |
| museum-kereta.html | 50 / 50 | 10.7 / 10.8 | 2106 / 1970 | 2436 / 2479 |
| ducky-volley.html | 16.8 / 50 | 0 / 9.5 | 106 / 1927 | 2586 / 2182 |
| index.html | 66.7 / 50 | 16.6 / 7.6 | 1921 / 1910 | 3748 / 3878 |
| monster-candy.html | 50 / 50 | 7.3 / 8 | 1593 / 1797 | 3381 / 3406 |
| kuis-matematika.html | 33.4 / 50 | 6.4 / 9.3 | 900 / 1304 | 1121 / 1348 |
| balapan-kereta.html | 66.6 / 49.9 | 15.8 / 7.9 | 2881 / 1685 | 4287 / 3015 |
| lokomotif-pemberani.html | 50 / 33.4 | 5.3 / 4.5 | 1776 / 1949 | 7684 / 6972 |
| kereta-maze.html | 33.4 / 33.4 | 5.3 / 4.8 | 1585 / 1752 | 1090 / 1400 |
| balapan-kereta-side.html | 83.3 / 33.4 | 17.9 / 4.3 | 3446 / 675 | 2788 / 2532 |
| mario-pokemon.html | 33.4 / 33.4 | 3.9 / 5.3 | 482 / 580 | 2658 / 2315 |
| mobil.html | 33.4 / 33.3 | 5.2 / 3.3 | 1632 / 1524 | 3359 / 2804 |
| mojo-swoptops.html | 33.3 / 33.3 | 3.3 / 2.8 | 774 / 1162 | 2184 / 1902 |
| ayo-berhitung.html | 33.3 / 33.3 | 2.3 / 2.6 | 604 / 534 | 1572 / 1538 |
| ejaan-inggris.html | 33.4 / 33.3 | 3.6 / 1.5 | 814 / 528 | 847 / 936 |
| stinky-dirty.html | 33.3 / 33.2 | 3.3 / 1.7 | 945 / 526 | 598 / 800 |
| film-play.html | 16.8 / 16.8 | 3.7 / 3.2 | 456 / 520 | 461 / 572 |
| garasi-tempur.html | 33.3 / 16.8 | 3.4 / 1.5 | 518 / 362 | 1572 / 1467 |
| blippi.html | 16.7 / 16.7 | 0 / 0 | 0 / 0 | 341 / 198 |
| mojo-chase-embed.html | 16.7 / 16.7 | 0 / 0 | 0 / 0 | 532 / 464 |

Spread over all pages: p95: median abs diff 0.1, p90 49.8, max 49.9; median relative 0.3 %, p90 99.4 %. over33: median abs diff 1.6, p90 10.9, max 13.6; median relative 21.8 %, p90 200 %. ltMs: median abs diff 193, p90 2224, max 2771; median relative 13.1 %, p90 179.1 %. load: median abs diff 143, p90 712, max 1272; median relative 13.7 %, p90 28.9 %. A change smaller than these is noise on this loaded machine.

<!-- CAUSES -->
## Reading guide

- Machine load average was 12-15 on 16 cpus (other sessions). Frame times are quantised to 16.7 ms steps, so a play p95 moves in jumps of one step (16.7 / 33.3 / 50 / 66.7); two runs differ by one step on about one page in three. Use ">33 ms %" and long-task ms only as a trend, load ms and MB as solid.
- Tapper reach (2 runs, screenshot-checked): in real gameplay at the screenshot: ducky-volley, mario-pokemon, mobil, monster-candy, pokemon-bawah-laut, pokemon-birds, pokemon-run, selamatkan-kereta, plus quiz or puzzle play on ayo-berhitung, ejaan-inggris, kuis-matematika, stinky-dirty, kereta-maze, gym-pokemon (battle intro). Still on a menu or modal: balapan-kereta (route map), balapan-kereta-side (countdown), garasi-tempur (team picker), lokomotif-pemberani (train picker), museum-kereta (browse list), mojo-swoptops (how-to modal), timmy-kapal (intro story), index (name screen), film-play (list), film-anak (loading, taps navigated away). blippi (iframe of /game1/, not served by this tree) and mojo-chase-embed (embed page) have no tap targets at all. Their numbers measure the menu, not the game.
- Cinema layer A/B (`QA_QUERY=nocine=1`, one run, 6 pages): no consistent gain (selamatkan 11.8 % vs 9-14 %, museum 6.3 % vs 11-21 %, timmy worse at 35 %, ayo/candy equal). Inside noise: the cinema layer is NOT confirmed as a cost on these pages.

<!-- TOP10 -->
## Top 10 problems, with cause in code

Numbers are the mean of two runs unless stated. "Confirmed" = the code line exists and the byte/DOM count matches what the browser measured; the frame-time effect itself is only confirmed where stated.

1. selamatkan-kereta: DOM 2032 nodes, 383 canvases, long tasks 2.5 s, heap 6.5 to 13.8 MB, 10-16 % frames over 33 ms. CONFIRMED: `games/selamatkan-kereta.html:683-693` builds one card plus one `<canvas>` for every train of the first package (381 cards, probed live: 380 `.ts-preview` canvases); only the drawing is lazy (`lazykey`, line 693). `startGame()` (line 826) hides the picker with `display:none` and never removes it, so ~1,500 nodes stay in the tree while playing. Per-frame frame cost of the leftover tree: unconfirmed.
2. selamatkan-kereta, in-game: `games/selamatkan-kereta.html:2431-2438` writes `speedLines.style.filter = 'hue-rotate(..)'` every frame while BOOSTING, on `#speed-lines` which is `position:fixed; inset:0` (css line 123): a full-screen filter repaint per frame. Present in code; whether the tapper reached BOOSTING is unconfirmed, so the frame impact is unconfirmed.
3. museum-kereta: play p95 50-66 ms, 11-21 % frames over 33 ms, long tasks 2.1-3.3 s on a static list. CONFIRMED render-all: `games/museum-kereta.html:1568-1600` `g18RenderGallery()` creates all 305 cards in one loop (probed: 2,544 DOM nodes, 310 img) and each image carries an inline `filter:drop-shadow` (lines 625, 1331, css 85-90), plus infinite SVG wheel animations (css 168-177) on every procedural card. Share of each: unconfirmed.
4. timmy-kapal: 20-35 % frames over 33 ms (worst in the set), p95 up to 83 ms, 2.4 MB of images on the first screen. CONFIRMED bytes: `games/tk-story.js:105` builds a thumbnail for every story panel with `background: Art.scene(p.scene)` (the full 240-350 KB scene webp, e.g. `jungle-falls-port` 351 KB, `underwater-port` 272 KB) even for thumbs scrolled off the strip. Frame cost: unconfirmed (the intro is mostly a still scene).
5. gym-pokemon: 10.0 MB, 375 requests, load 4.8-5.9 s, long tasks 1.6-3.2 s. CONFIRMED: `games/gym-pokemon.html:3004-3008` renders every package's team as `<img src=pokemondb_hd_alt2/....webp>` (630x630, 30-80 KB each) with no `loading="lazy"`, shown at 36x36 px (css line 42). 9.6 MB of the 10 MB is these images.
6. lokomotif-pemberani: slowest load (5.0-7.7 s), 438 requests, 4.8 MB (3.7 MB images). CONFIRMED: `games/lokomotif-pemberani.html:3551-3560` the 375 train cards each create an `<img>` with no `loading`/`decoding` (the filter chips at 3503-3507 do set `lazy`), and `:263,266` two `<audio preload="auto">` fetch train-bgm.mp3 and train-crossing-sfx.mp3 (213 + 436 kB) before any play.
7. index (hub): 2.3 MB, 157 requests, DOM 1,939, load 3.7-5.7 s, long tasks 1.9-2.9 s. CONFIRMED bytes: `games/hub/g14-g16-trains.js:613-617` constructs three `new Audio('assets/sfx-train-*.mp3')` at script top level, so the hub fetches 436 + 213 kB mp3 for a game nobody opened, and the script itself is 247 kB parsed at load (`index.html:2456`). The 1.9k DOM nodes: cause unconfirmed.
8. ducky-volley and mobil: 2.27 MB and 2.26 MB at load. CONFIRMED: `games/ducky-volley.html:73` and `games/mobil.html:89` `<audio ... preload="auto">` on a 1.8 MB (Opening mp3) and 1.7 MB (racecar.mp3) file; each is 80 % of the page weight.
9. pokemon-birds: 15 MB heap, 33-50 ms p95. Per-frame DOM work CONFIRMED in code: `games/pokemon-birds.html:938` calls `updateHUD()` (three `textContent` writes, defined line 1188) from the game loop every frame, and `:941-947` reads `offsetHeight` right after style writes (forced layout each frame). The same loop style repeats for bird/runner `left/top` writes (`:951-955`). Frame impact: unconfirmed. (pokemon-run is NOT a cause: its HUD is throttled `S.frame%30`, `pokemon-run.html:2876`; monster-candy's `updateHUD` is event-driven, not per frame.)
10. balapan-kereta / balapan-kereta-side: highest heap in the set (balapan-kereta-side 17-22 MB, balapan-kereta 9-12 MB), long tasks up to 3.4 s in one run (1.3 s in the other), load 2.5-4.3 s. `games/balapan-kereta.html` is 491,604 bytes of inline source, the largest page (next: 277 kB). Cause of the heap and of the long tasks: UNCONFIRMED.

Also seen, not in the top 10: every game shows 0.4-2.5 s of long tasks per 15 s at 4x CPU even on a static quiz (ayo-berhitung 0.6-1.6 s); the cinema A/B above does not explain it. `blippi.html` logs 2 console errors (its `/game1/` iframe 404s on this tree), `ejaan-inggris.html` 1.
