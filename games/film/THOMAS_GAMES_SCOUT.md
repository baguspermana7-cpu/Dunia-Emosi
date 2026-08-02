# Thomas & Friends — toongo.io Offline Scouting Report

Scouted 2026-08-02. Goal: enumerate the ~9 Thomas games on toongo.io the owner wants
added offline, with each game's **real asset base URL + engine + crawl recipe**.

## KEY DISCOVERY — how to get the real base URL (deterministic, no ad-gating)

toongo.io game pages (`https://toongo.io/game/<slug>`) load the game into an empty
`<iframe id="game-iframe">` whose `src` is set from `cg.game.src` **only after a
pre-roll ad completes**. In headless puppeteer the ad SDK never fires, so the iframe
stays empty — this is why a naive "click Play + capture iframe" crawl captures nothing.

**The reliable source of truth is toongo's embed loader**, fetchable with plain `curl`:

```
curl -s "https://toongo.io/e/<slug>/index.html"
```

Its inline `<script>var config = {...}</script>` contains the **real** `src` (the
external CDN game URL), plus `width`, `height`, `portrait`. No browser, no ads needed.
Example (jigsaw): `config.src = https://des98fz5jsos4.cloudfront.net/cartoonito/dynamic/web_game/00000000/97/f2260f08-8b98-4229-8df9-1aaefb06facd_1643986633/index.html`

**Important:** the 9 Thomas games are NOT all on the cartoonito CloudFront CDN. They
span **4 different host families + 5 engines**. Each needs a slightly different crawl.

---

## THE 9 GAMES

| # | Display name | Slug suggestion | Engine | Orient (WxH) | Host family | Status |
|---|---|---|---|---|---|---|
| 1 | Rail Muddle | `thomas-rail-muddle` | custom canvas2d (gsap+Howler) | 800×450 L | cartoonito CF `240` | **ALREADY ADDED** |
| 2 | Thomas & Friends Jigsaw | `thomas-jigsaw` | **CreateJS** (EaselJS) | 800×450 L | cartoonito CF `97` | to crawl |
| 3 | Jigsaw (All Engines Go) | `thomas-aeg-jigsaw` | custom canvas2d (gsap+Howler, same stack as Rail Muddle) | 800×450 L | cartoonito CF `238` | to crawl |
| 4 | Musical Tracks | `thomas-musical-tracks` | **Phaser 3 + Spine** ⚠ | 800×450 L | **boomerang** CF `6232` | to crawl — HARDEST |
| 5 | To the Rescue | `thomas-to-the-rescue` | **Construct 3** | 800×450 L | toon-cdn.com | to crawl |
| 6 | Track Repair | `thomas-track-repair` | **CreateJS** (Adobe Animate) | 960×550 L | toon-cdn.com | to crawl |
| 7 | Look Out They're All About | `thomas-look-out` | custom canvas + soundManager2 (legacy Mattel) | 900×450 L | toon-cdn.com | to crawl |
| 8 | Sodor Paint Shop (paint/colour) | `thomas-sodor-paint-shop` | **jQuery/DOM** + soundManager2 + skrollr (official Mattel play-site, `api:2`) | 800×450 L | **S3** `assets.play.thomasandfriends.com` | to crawl |
| 9 | Lift, Load and Haul! | `thomas-lift-load-haul` | **Adobe Flash / SWF** via Ruffle wrapper ⚠ | 960×475 L | toon-cdn.com `/flash/` | to crawl — needs Ruffle |

All 9 are **landscape** (`portrait:false`) — fits the existing borderless landscape `film-play.html`.
New games get registered the same way Rail Muddle is: entries in `games/film-anak.html`
and `games/film-play.html` (rail-muddle appears at film-anak.html:79, film-play.html:120/130).

---

## REAL BASE URLs (config.src from `/e/<slug>/index.html`)

```
1 rail-muddle (DONE): https://des98fz5jsos4.cloudfront.net/cartoonito/dynamic/web_game/00000000/240/fced2424-f7ef-4d64-a519-172fba79a710_1671043392/
2 jigsaw:             https://des98fz5jsos4.cloudfront.net/cartoonito/dynamic/web_game/00000000/97/f2260f08-8b98-4229-8df9-1aaefb06facd_1643986633/
3 aeg-jigsaw:         https://des98fz5jsos4.cloudfront.net/cartoonito/dynamic/web_game/00000000/238/5f9e0268-1c78-4337-8102-7bd4b72f5c8b_1671041727/
4 musical-tracks:     https://des98fz5jsos4.cloudfront.net/boomerang/dynamic/web_game/00000006/6232/dd293a83-1c30-4d8a-b584-13f36f2710fa_1657210683/
5 to-the-rescue:      https://games.toon-cdn.com/thomas-and-friends/to-the-rescue/
6 track-repair:       https://games.toon-cdn.com/thomas-and-friends/track-repair/
7 look-out:           https://games.toon-cdn.com/thomas-and-friends/look-out-theyre-all-about/
8 sodor-paint-shop:   https://s3.us-west-1.amazonaws.com/assets.play.thomasandfriends.com/Resources/games/sodorpaintshop/  (entry: thomas.html)
9 lift-load-haul:     https://games.toon-cdn.com/flash/index.html?g=thomas-and-friends/lift-load-and-haul/game&r=960/475
                      (Flash player wrapper; actual SWF lives under games.toon-cdn.com/thomas-and-friends/lift-load-and-haul/game.swf)
```

toongo game-page slugs (for `/e/<slug>/index.html`):
`thomas-and-friends-jigsaw`, `thomas-and-friends-all-engines-go-jigsaw`,
`thomas-and-friends-all-engines-go-musical-tracks`, `thomas-and-friends-all-engines-go-to-the-rescue`,
`thomas-and-friends-track-repair`, `thomas-and-friends-look-out-look-out-theyre-all-about`,
`thomas-and-friends-sodor-paint-shop`, `thomas-and-friends-lift-load-and-haul`.

---

## GENERAL CRAWL RECIPE (all games)

The **lesson from the batwheels gotham race**: a static crawl of `index.html` MISSES
assets loaded dynamically at gameplay time (Spine skeletons, per-level atlases, audio
sprites). The recipe must (a) drive the game through real gameplay in puppeteer and
capture EVERY network request, then (b) also probe the CDN for anything the code
references but never fetched.

Puppeteer only resolves when the script lives **inside** `/home/baguspermana7/rz-work/Dunia-Emosi`
(node_modules is at `/home/baguspermana7/rz-work`). Chrome exec is at
`~/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome`.

Launch flags (WebGL games — Phaser/Pixi need this or the canvas stays black):
```
--no-sandbox --disable-setuid-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader
```

**Do NOT load the game via toongo.io** (ad-gated). Load the CDN `index.html` DIRECTLY
in puppeteer with `Referer: https://toongo.io/` set via
`page.setExtraHTTPHeaders({Referer:'https://toongo.io/'})` (some hosts hotlink-check).

Per-game loop:
1. `page.on('request')` / `page.on('response')` → record every URL under the game's base
   dir (dedupe, strip query). Also log 404s and cross-origin fetches (external).
2. Navigate to the base `index.html`, `waitUntil:'networkidle2'`.
3. **Drive gameplay** (engine-specific below) for 60–120 s: click through the title →
   level select → play each level/mode → win/lose screens → replay. Fire pointer events
   on the canvas centre + corners on a timer to trigger interactions.
4. After gameplay, diff referenced-but-unfetched asset paths: grep the main bundle/JSON
   for string literals matching `\.(png|jpg|json|atlas|mp3|ogg|wav|fnt|woff2?|skel)` and
   HEAD-probe each under the base URL; download any that return 200.
5. Mirror-download every captured 200 into `games/film/<slug>/` preserving relative paths.
   Rewrite absolute CDN URLs → relative. Write a `crawl-report.json` (same shape as
   `thomas-rail-muddle/crawl-report.json`).
6. Verify offline: `python3 -m http.server` in the slug dir, load in puppeteer with the
   network BLOCKED to any non-localhost host, confirm it renders + plays (screenshot).

---

## PER-GAME CRAWL RECIPES

### 2 · Thomas & Friends Jigsaw — CreateJS (cartoonito CF 97)
- Base: `.../cartoonito/dynamic/web_game/00000000/97/f2260f08-...-facd_1643986633/`
- Engine: CreateJS/EaselJS. Assets under `img/` (+ `img/rotate_screen.png` orientation gate),
  a CreateJS manifest/spritesheet JSON, and an audio dir. Adobe-Animate-style export.
- Drive: pick a jigsaw picture → drag pieces into place → complete → next picture.
  Different pictures load different `img/` spritesheets — **cycle through ALL picture
  choices** so every puzzle image is fetched. Watch for a manifest JSON listing them.

### 3 · Jigsaw (All Engines Go) — custom canvas2d (cartoonito CF 238)
- Base: `.../cartoonito/dynamic/web_game/00000000/238/5f9e0268-...-5c8b_1671041727/`
- Engine: same stack as the already-done Rail Muddle — `webfontloader.js`, `gsap.min.js`,
  `Howler.min.js`, `VisibilityManager.js`, `app.js`; custom `getContext('2d')` renderer
  driving **texture atlases** (23 `atlas` refs in app.js) + Howler audio sprites.
- Copy the Rail Muddle crawl approach exactly (it worked). Expect dirs like
  `json/` (atlas + text.json), `images/`, `audio/`, `fonts/`.
- Drive: title → play → complete a jigsaw → any difficulty/picture variants.

### 4 · Musical Tracks — Phaser 3 + Spine ⚠ HARDEST (boomerang CF 6232)
- Base: `.../boomerang/dynamic/web_game/00000006/6232/dd293a83-...-2710fa_1657210683/`
- Engine: Phaser 3 + **Spine** (46 phaser + 39 spine hits in `main-*.bundle.js`).
  Single webpack bundle `main-a01099e091b0d0652740.bundle.js`. `assets/fonts/`,
  `assets/images/rotate/`. **This is the gotham-race risk case**: Spine `.json/.atlas/.png`
  skeletons and audio are loaded per-scene at runtime, NOT in index.html.
- MUST drive full gameplay AND grep the bundle for every `assets/...` string literal, then
  HEAD-probe. Phaser usually has a pack/manifest JSON under `assets/` — find and mirror it
  first, then fetch every entry. Load WebGL flags. Expect `assets/{spine,audio,images,fonts,json}/`.
- Drive: title → start → play the musical/rhythm interaction (tap notes/tracks) across the
  full song; trigger win screen + replay.

### 5 · To the Rescue — Construct 3 (toon-cdn.com)
- Base: `https://games.toon-cdn.com/thomas-and-friends/to-the-rescue/`
- Engine: **Construct 3** export (`scripts/{supportcheck,offlineclient,main,register-sw}.js`,
  `data.json` = 245 KB c3 project data, 303 `runtime` refs). Has its OWN service worker
  (`register-sw.js`) — disable/ignore SW during crawl; the c3 `offlineclient.js` fetches an
  asset list from `data.json`.
- **Shortcut:** parse `data.json` — Construct lists every image/audio/font/json asset there.
  Mirror `data.json` + `scripts/` + the referenced `images/`, `media/` (audio), `fonts/`.
  Then still drive gameplay to catch any lazily-loaded blobs.
- Drive: title → level select → play rescue level(s) → complete.

### 6 · Track Repair — CreateJS / Adobe Animate (toon-cdn.com)
- Base: `https://games.toon-cdn.com/thomas-and-friends/track-repair/`
- Engine: CreateJS (992 createjs + 45 easeljs hits in `assets/js/libraries.js`; game logic in
  `assets/js/main.js`). Loads `assets/{css,js}/`; expect `assets/{images,img,sounds,audio}/`
  + a CreateJS spritesheet/manifest JSON. 960×550.
- Drive: title → play the track-repair puzzle (place/rotate track tiles) across all levels.

### 7 · Look Out They're All About — legacy custom canvas (toon-cdn.com)
- Base: `https://games.toon-cdn.com/thomas-and-friends/look-out-theyre-all-about/`
- Engine: legacy custom canvas (multiple `<canvas>`) + `soundManager2` + `init.js`; references
  `/Resources/js/kids/hideaddressbar_mobile.js` (an official Mattel kids-site game). `scaling:1`.
  Assets under `images/` (`btn_skip.png`, `loader.png`, ...) + a `js/frameworks/soundManager/`
  audio dir. **Watch for absolute `/Resources/...` paths** — those resolve to
  `https://games.toon-cdn.com/Resources/...`, outside the game dir; capture + localise them.
- Drive: intro (skip button) → play the whack-a-mole/spotting interaction → end.

### 8 · Sodor Paint Shop — jQuery/DOM colouring (S3 official Mattel, api:2)
- Base: `https://s3.us-west-1.amazonaws.com/assets.play.thomasandfriends.com/Resources/games/sodorpaintshop/`
  (entry `thomas.html`)
- Engine: jQuery 2.1.1 + soundManager2 + skrollr + jcarousel — DOM/jQuery colouring app, NOT
  canvas-framework. Loads a big `Resources/js/vendor/*` + `Resources/js/thomas/*` stack, images
  under `Images/` and `img/kids/`. **Pulls jQuery from `//ajax.googleapis.com` CDN** — swap that
  to the bundled `Resources/js/vendor/jquery-2.1.1.min.js` (already present) when localising.
  Paths reach up to `/Resources/...` on the same S3 bucket — capture the whole `Resources/`
  subtree the page touches.
- Drive: pick an engine/scene → select colours → paint each region → save/print flow.

### 9 · Lift, Load and Haul! — Adobe Flash / SWF ⚠ needs Ruffle (toon-cdn.com)
- Loader: `https://games.toon-cdn.com/flash/index.html?g=thomas-and-friends/lift-load-and-haul/game&r=960/475`
- The `?g=` param → the SWF at
  `https://games.toon-cdn.com/thomas-and-friends/lift-load-and-haul/game.swf` (verify exact
  filename by watching the Flash wrapper's network request for a `.swf`).
- Engine: **Adobe Flash**. To run offline you need the **Ruffle** WASM player
  (`ruffle.js` + `ruffle.wasm`, self-hosted) pointed at the mirrored `game.swf`. This is a
  different integration path from the HTML5 games — flag for owner: heavier, and Flash
  input/audio via Ruffle can be imperfect. Consider deprioritising or confirming it's wanted.
- Crawl: mirror `game.swf` (+ any sibling swf/asset it externally loads — watch network while
  Ruffle plays it), then bundle Ruffle locally.

---

## NOTES / GOTCHAS
- Set `Referer: https://toongo.io/` on all CDN requests (hotlink protection on toon-cdn.com).
- boomerang(4) + cartoonito(2,3) are on the SAME CloudFront host `des98fz5jsos4.cloudfront.net`
  but DIFFERENT top path (`/boomerang/` vs `/cartoonito/`) — keep them straight.
- 3 distinct "puzzle" games exist: Jigsaw-97 (CreateJS), AEG-Jigsaw-238 (canvas), Track-Repair
  (CreateJS track-tile puzzle). The owner's "puzzle Thomas & Friends" + "another Thomas (shed)"
  most likely map to Track-Repair + one of the jigsaws — confirm with owner which two.
- Recommended crawl order (easiest→hardest): to-the-rescue (Construct data.json lists all) →
  aeg-jigsaw (clone Rail Muddle recipe) → jigsaw-97 → track-repair → look-out → sodor-paint-shop
  → musical-tracks (Spine) → lift-load-haul (Flash/Ruffle, may skip).
```
```
