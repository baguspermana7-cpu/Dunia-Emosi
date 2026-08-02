# Gotham Getaway — Custom Chaser: DETAILED plan (owner flow, bug-proofed)

Owner flow (explicit): **1) pilih karakter (chaser)** → **2) custom (warnai) karakter** →
**3) pilih musuh + kota** → **4) kejar-kejaran (race)**. Hero is chosen INDEPENDENTLY of the
villain/city. Must be seamless, no bugs, no breaking, no piling hacks. Effort budget: large (approved).

═══════════════════════════════════════════════════════════════════════
## A. VERIFIED ENGINE FACTS (from the bundle — this is what we build against)
═══════════════════════════════════════════════════════════════════════
- Phaser 3 + **Spine** plugin. Two webpack bundles share `self.webpackChunkwarner_batwheels_getaway`.
  Phaser = webpack **module 8068**; app entry = module 3713. **No `window.Phaser`.**
- Scenes: `Boot · PreloadBatwheels · Title · Intro · LevelSelect · Game · GameUI` + transitions.
- Heroes: `bam · bibi · redbird · batwing · buff`. Villains: `prank · jestah · ducky · quizz · snowy`.
- **Spine skeletons are SHARED per hero+villain PAIR** (each pair-spine holds 2 skins):
  `bam-prank · bibi-jestah · batwing-quizz · redbird-ducky · buff-snowy` (keys le/ce/ue/de/pe).
  Assets live under `assets/animations/<pair>.{json,atlas,png}`, loaded per-scene (loaded/unloaded
  by `AssetManager` via `spineAssetLookup` + `requiredSpineAssets`).
- Hero object: `HeroVehicle` → `.character` = Spine `yt` with:
  `setSkinByName(skin)`, `switchSkin(skin)` (calls `setSkeleton(skinsToSpine.get(skin))` if the
  skin's skeleton differs → **can move to another loaded pair-spine**), `skeleton.color {r,g,b,a}`.
- Level → hero flow: `Game.create → runManager.setupPlayer(factory, level.hero, level)
  → makeHeroProfile(level.hero) → {driver, skin: characterSkinLookup[hero]} → makeHeroVehicle
  → new Vs(...) → this.character = new yt(scene,0,l, profile.skin)`.
- Recolor: `HeroVehicle.character.skeleton.color.{r,g,b}` (0..1 multiply) — recolors the whole car.

## A0-DONE. P0 RESOLVED (2026-08-02) — gotham race un-broken
The crawl (Cartoonito CloudFront) captured menus + bundles + atlases but MISSED every
race-time Spine asset (loaded dynamically via `scene.load.spine`). Confirmed 404: all 5 hero
pair-spines (`bam-prank … buff-snowy`), `charge_strip` + 4 theme variants, `ink`,
`question-cloud`, `snowdrift` — only `BC` was present. gotham's race could not render a hero.
**Recovered ALL from the origin:** `https://des98fz5jsos4.cloudfront.net/cartoonito/dynamic/
web_game/00000000/888/732f981b-f2c3-445e-b438-e2e1dda24dc2_1698151836/assets/animations/<name>.{json,atlas,png}`
(base = the crawl dir path guid). 13 spines × {json+atlas+page png} downloaded (200), placed in
`assets/animations/` AND copied to the owner source tree (re-sync durability). Full asset sweep:
173 needed → 0 missing (only 2 optional SFX `SndThrow`/`SndPickup` absent — also 404 on origin, game
tolerates). Verified: gotham boots Title→Intro with 0 critical 404s, renders perfectly (Intro
skyline). Reaching the Game scene headless is blocked by the Intro cutscene (harness limit, not a
defect) — owner confirms the actual race on device. **RE-SYNC NOTE:** if the game is re-crawled,
the dynamic spines will be missing again → re-run the CloudFront recovery (script pattern above).

## A0. P0 PREREQUISITE (was the blocker — now RESOLVED above)
`assets/animations/` in this copy shows **only `BC.*`** (batcomputer). The 5 hero pair-spines
(`bam-prank.json/.atlas/.png` … `buff-snowy.*`) appear MISSING. If so, the gotham RACE itself
can't load a hero → blank/hung hero, independent of our feature. **Action:** drive to a real race
(each of the 5 levels), watch for `assets/animations/<pair>.*` 404s; if missing, re-copy them from
the owner source (`Documents/temporary/online game to be offline/batwheels/games/...`) — same class
as the earlier BC.* fix. Do NOT build the feature on a game that can't render heroes.

═══════════════════════════════════════════════════════════════════════
## B. THE 4-SCREEN WORKFLOW (owner's order) — where each screen lives
═══════════════════════════════════════════════════════════════════════
Rendered inside the player `film-play.html`, gotham-slug only. Full-screen, same letterbox wrapper,
claymorphism (Dunia theme, ZERO emoji). A shared top strip shows step dots (1·2·3) so a kid sees
progress. "Beranda" (home) stays available on every screen.

**Screen 1 — Pilih Karakter (my UI).** 5 hero cards (Bam/Bibi/Redbird/Batwing/Buff) using the
gotham `level-select` atlas `icon-hero-*` art (cropped to standalone webp at build). Tap a card →
selected glow → "Lanjut". State: `chosen.hero`.

**Screen 2 — Custom / Warnai (my UI).** Big preview of the chosen hero (same icon) recolored LIVE
by CSS filter as a hint; a kid-palette of ~8–10 color swatches + a "Reset warna" (no tint). Tap a
swatch → preview updates + `chosen.color`. "Lanjut". (Sticker/paint-zones = OUT until art authored;
color is the shippable customization — see §F scope.)

**Screen 3 — Pilih Musuh + Kota.** REUSE gotham's own **LevelSelect** (it already pairs a villain +
a city/theme per level — exactly "pilih musuh + kota"). We do NOT rebuild it. After Screen 2, we
load the gotham iframe with the chosen `{hero,color}`; `gg-custom` **auto-advances Title→LevelSelect**
(skip the gotham title so the flow reads 1→2→3 seamlessly). The kid picks the level (villain+city).

**Screen 4 — Race.** gotham `Game` runs; `gg-custom` forces the chosen hero to be the chaser
(regardless of the level's default hero) and applies the color. Win/lose = gotham's own end screen.

═══════════════════════════════════════════════════════════════════════
## C. DATA FLOW (single source of truth, no races/dupes)
═══════════════════════════════════════════════════════════════════════
- Player writes the choice to the gotham iframe URL: `film/…gotham…/index.html?chaser=<hero>,<rrggbb>`
  (also mirrored to `localStorage.gg_chaser` for restart/replay inside gotham).
- `gg-custom.js` reads it (URL → localStorage → window.GG_CHASER precedence). No config ⇒ vanilla game.
- One direction only (player → game). No postMessage, no cross-frame coupling.

═══════════════════════════════════════════════════════════════════════
## D. gg-custom.js — runtime hook (ALREADY PROVEN for capture; extend for D2–D4)
═══════════════════════════════════════════════════════════════════════
Loaded `<script defer>` between phaser and main bundles. Pushes a webpack chunk whose runtime fn
resolves the Phaser module (id 8068 + signature-scan fallback for re-sync drift) and wraps
`Phaser.Game` to capture the instance. **Status: GREEN, verified headless** (installed+captured,
game boots, all scenes register, no new errors, 9/9 other games unaffected).

- **D1 capture** — done.
- **D2 auto-advance Title→LevelSelect** — when config present, on the `Title` scene's create,
  trigger its "play" transition (call the same nextScene the Play button uses) so Screen 3 appears
  immediately. Guarded: only when config present; vanilla keeps the Title.
- **D3 hero override + spine preload** — on the `Game` scene, BEFORE the vehicle spawns
  (`runManager.vehicleManager.HeroVehicle` still null):
  1. compute the chosen hero's pair-spine key (`bam→bam-prank`, `bibi→bibi-jestah`, …).
  2. if that spine is not in the Phaser spine cache, `scene.load.spine(key, url.json, url.atlas,
     preMultipliedAlpha=true)` (URLs from `assets/animations/<pair>.*`), `scene.load.start()`,
     and gate step 3 on `load 'complete'`.
  3. set `Game.level.hero = chosen.hero` (once) → `makeHeroProfile` now builds the chosen skin;
     the pair-spine is loaded so `new yt(...)` + `switchSkin` succeed.
- **D4 tint** — once `HeroVehicle.character.skeleton.color` exists, set r/g/b from the chosen color (once).
- **Per-run re-arm** — reset the `__ggHeroSet`/`__ggTinted`/`__ggLoaded` flags on each run start
  (`RunStarted` / scene restart / `GameReplay`) so restart & replay reapply.

═══════════════════════════════════════════════════════════════════════
## E. EDGE CASES / "pastikan tidak ada bug" checklist
═══════════════════════════════════════════════════════════════════════
1. No config / "Lewati" on any screen → 100% vanilla gotham (Title kept, no override, no tint).
2. Invalid hero/color in URL → ignored → vanilla.
3. Chosen hero == the level's default hero → override is a no-op, spine already loaded, tint still applies.
4. Chosen hero ≠ default → pair-spine may be unloaded → D3 preload MUST complete before spawn
   (gate on 'complete'; add a timeout fallback → if load fails, keep default hero + still tint, log).
5. AssetManager UNLOADS non-required spines between scenes → mark our loaded spine so it survives the
   run (add to the game's `dynamicSpineAssets` set if reachable, else re-load on each run via D3).
6. Restart / replay (`instantRestart`, `GameReplay`) → per-run re-arm (D4) reapplies hero+tint.
7. Tint scope: ONLY `HeroVehicle.character.skeleton.color` — never villain, HUD, shadow, FX, UI.
8. Hero swap changes voice (`characterToSoundLookup[hero]`) + shadow (`skinToShadowLookup[skin]`) +
   size (`skinsToSize`) — these are keyed off `driverProfile.skin`, so overriding `level.hero`
   BEFORE the profile is built keeps them consistent (no mismatched shadow/voice).
9. Onboarding hand/tutorial references the hero position — verify still aligned post-swap.
10. Title auto-advance (D2) must not double-fire or break the back button.
11. Player pre-screens must LETTERBOX inside the wrapper (no page scroll, no overlap with the
    iframe — the iframe is hidden until Screen 3). Z-index above splash, below the Home button.
12. Perf on throttled tablet: one `step` watcher, self-detaches after apply; screens are static DOM.

═══════════════════════════════════════════════════════════════════════
## F. SCOPE (honest, so we don't over-promise)
═══════════════════════════════════════════════════════════════════════
- ✅ Screen 1 pick hero · ✅ Screen 2 color(tint) · ✅ Screen 3 gotham villain+city · ✅ Screen 4 race.
- ⏳ Sticker / paint-zones / eyes-mouth (full BY-YOU depth): needs NEW Spine skins/attachments
  authored per hero (art work, not code). Phase-2 stretch ONLY if owner funds the art; the color
  customization ships first and is real.

═══════════════════════════════════════════════════════════════════════
## G. BUILD PHASES (each verified before the next — "jangan bertumpuk2")
═══════════════════════════════════════════════════════════════════════
- **P0** clear the spine-asset prerequisite (§A0) — heroes render in a real race, all 5 pairs load.
- **P1** gg-custom hook — DONE (capture GREEN). Extend + prove D3 hero-override + D4 tint in a real
  race, headless (drive Title→LevelSelect→Game). Screenshot hero changed + recolored, gameplay normal.
- **P2** Screen 1 (pilih karakter) + Screen 2 (warnai) in `film-play.html`, gotham-only, claymorphism;
  crop the 5 hero icons to webp. Wire → `?chaser=` → iframe.
- **P3** D2 auto-advance Title→LevelSelect; full 1→2→3→4 walkthrough; both axes verified for ≥2 heroes
  + 2 colors + 2 villains/cities.
- **P4** edge-case hardening (§E), regression `qa-film-games` 9/9 + gotham-vanilla identical,
  FILM_ANAK.md re-sync notes (re-add gg-custom + inject + re-copy spines), owner screenshots, ship.

═══════════════════════════════════════════════════════════════════════
## H. NO-BREAK GUARANTEE
═══════════════════════════════════════════════════════════════════════
Additive only: `gg-custom.js` + one `<script>` tag + player-side pre-screens for one slug + cropped
icon webps. Zero edits to `main`/`phaser` bundles. No config ⇒ gotham byte-for-byte vanilla. Hook
fails safe (module-scan miss or spine-load fail ⇒ default hero, game still runs).
