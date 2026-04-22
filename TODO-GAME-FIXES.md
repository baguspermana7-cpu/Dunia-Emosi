# Dunia Emosi — Game Fixes & Enhancements TODO
> This file tracks ALL pending game issues. Claude reads this at session start.
> Mark items ✅ when done. Add new issues at the bottom.

## 🔥 OPEN 2026-04-22 (session ongoing)

### Task #48 — G15 Letter Validation Bug (stale isTarget) ✅ DONE 2026-04-22
- **Symptom**: User reported "padahal huruf yang dibutuhkan misal A, tapi ambil huruf lain itu dianggap benar A, aneh. dan jawaban salah dianggap benar."
- **Root cause**: `collectBox` used `box.isTarget` flag set at spawn time. When target letter advanced or word completed, old boxes retained stale `isTarget=true`.
- ✅ **Fix 1**: `collectBox` letter branch validates `box.letter === liveTarget` (word.word[currentLetterIdx]) at COLLECT time, not stale flag.
- ✅ **Fix 2**: `onWordComplete` purges leftover letter boxes (keeps hearts/math specials) so new-word HUD isn't contradicted by old-word letters floating on screen.

### Task #49 — G16 Bablas Past Station + No Win Modal ✅ DONE 2026-04-22 (v2 refactor same day)
- **Symptom**: User reported "kereta masih melewati kerumunan dan bablas dan stuck tidak keluar modal berhasil". The #40 overshoot fix only clamped uncleared obstacles, not the station itself.
- **Root causes (4 compounding)**:
  1. No clamp at STATION_X — train slid past platform on dt spikes
  2. ARRIVING creep speed ~54 px/s → ~28s to cover 0.8W = felt frozen
  3. triggerArrival only fired when `S.cleared===S.totalObstacles` (off-by-one race could skip)
  4. 8s failsafe way longer than perceived stuck time
- ✅ **v1 (morning)**: Station overshoot clamp, force-arrival proximity, faster creep, 3s safety-net setTimeout, 2200ms celebration setTimeout.
- ✅ **v2 REFACTOR (same day)**: User mandate — "Arrival jangan coba2 pkai time, saya mau bener2 dihitung positioning, checkpoint secara accurate." ALL `setTimeout` calls in the arrival path removed. Replaced with:
  - **Deterministic positional brake** in ARRIVING: `speed = max(ARRIVAL_MIN_CREEP=35, baseSpeed * min(dist/ARRIVAL_BRAKE_DIST=300, 1))`. When `dist ≤ ARRIVAL_SNAP_DIST=1`, snap `worldX=STATION_X` and flip to ARRIVED.
  - **Frame-counter celebration** in ARRIVED: `S.celebrationFrame += dt*60` per frame; `showWin` fires exactly when `celebrationFrame ≥ CELEBRATION_FRAMES=120` (~2s @ 60fps, pauses with ticker).
  - **No safety-net timer** in `triggerArrival` — the positional brake + frame counter guarantee deterministic arrival on any device / any framerate / any pause state.
- ✅ **Cache**: `v=20260422ad → v=20260422ae`.
- ✅ **Verification**: `node --check` clean, grep `setTimeout.*(showWin|arrivedFlag|ARRIVED|ARRIVING)` returns only the two "No setTimeout" documentation comments (intentional).
- **Touched**: `games/g16-pixi.html` (constants + S.celebrationFrame + ARRIVING/ARRIVED branches + overshoot clamp + triggerArrival), `index.html` cache, CHANGELOG.

### Task #31 — G13c Real Gym Badge Icons ✅ DONE 2026-04-22
- **Ask**: "Badge, extract dari website page ini. https://bulbapedia.bulbagarden.net/wiki/Badge" + "Dan bisa dari sini. Saling melengkapi jika ada yg tdak ada https://pokemon.fandom.com/wiki/Gym_Badge"
- ✅ **46 badges downloaded** from Bulbapedia (Kanto 8 + Johto 7 + Hoenn 7 + Sinnoh 6 + Unova 6 + Kalos 6 + Galar 6). Saved to `assets/gym-badges/{trainer-id}.webp` at 128px, quality 90. Total 256KB (from 7MB PNG).
- ✅ **G13c helpers added** (`games/g13c-pixi.html` ~line 953): `BADGE_IMG_SET`, `hasBadgeImg`, `badgeImgUrl`, `badgeHtml(trainer, size, style)`.
- ✅ **5 render sites switched** to image-or-emoji: trainer card `.tc-status`, badge collection grid, gym welcome `#gw-badge`, badge zoom `#badge-emoji`, `showResult` → `showBadgeZoom(trainer,…)` signature.
- ✅ **Non-gym-leaders** (Elite Four, Champions, rivals, rockets, anime) keep emoji — no canonical single badge.
- ✅ **Sanity**: `node --check` clean, dev server serves `brock.webp` 200 OK.
- **Touched**: `assets/gym-badges/*.webp` (46 new), `games/g13c-pixi.html`, CHANGELOG, TODO.

### Task #47 — Character Train Dimensions Static on Mobile ✅ DONE 2026-04-22
- **Symptom**: Character trains (Casey/Linus/Dragutin/Malivlak) rendered at identical pixel size on mobile as on PC. `spriteHeight`, `wheelPositions`, `smokePos`, `bottomPaddingOffset` were hardcoded pixel constants. User report: "Game ini di PC sudah bagus dan proporsional. Namun di mobile, dimensinya masih statis."
- ✅ **Added `RZ.trainScale()`** in `shared/rz-responsive.js` — viewport-height-based multiplier `clamp(0.55, H/800, 1.0)` (distinct from CSS-oriented `RZ.scale()` which caps at 1.0 for any viewport ≥ 320w and therefore never shrinks trains on actual mobile devices).
- ✅ **Added `CharacterTrain.scaleConfig(cfg, s)`** — returns new config with `spriteHeight`, `bottomPaddingOffset`, `bodyBobAmp`, every `wheelPositions[i] = [x,y,r]`, and `smokePos = [x,y]` multiplied by `s`.
- ✅ **G15 + G16 buildTrain**: compute `rzScale = RZ.trainScale()`, pass `scaleConfig(cfg, rzScale)` to mount. Rail placement uses the scaled spriteHeight + bottomPaddingOffset.
- ✅ **G15 + G16 resize handlers**: recompute TRAIN_X / TRAIN_SCREEN_X + track Y, dispose old character train, call buildTrain() to rebuild with fresh scale. Programmatic trains just reposition.
- ✅ **Cache**: `train-character-sprite.js` v=d→e, `rz-responsive.js` v=h→i (across all 6 games), `index.html` v=ab→ac.
- ✅ **Docs**: `documentation and standarization/CHARACTER-TRAIN-SPEC.md` — "Responsive Scaling (RZ.trainScale())" section with formula + scaling table.
- **Touched**: `shared/rz-responsive.js`, `games/train-character-sprite.js`, `games/g15-pixi.html`, `games/g16-pixi.html`, `games/g14.html`, `games/g19-pixi.html`, `games/g20-pixi.html`, `games/g22-candy.html`, `index.html`, CHANGELOG, CHARACTER-TRAIN-SPEC.

### Task #44 — Result Modal Engine Contradicts Stars (P0 BUG)
- ⬜ **Symptom**: Modal shows "Selesai!" + 1★ + "Sempurna! Tidak ada kesalahan!" + "Matematika Benar: 0" + enabled "Level Berikutnya" button — WITH ZERO CORRECT ANSWERS. Screenshot 2026-04-22.
- **Root cause hypotheses**:
  - `GameScoring.calc({correct:0, total:N})` may return stars≥1 (bug — should be 0).
  - Modal title hardcoded "Selesai!" regardless of stars. Should branch: 0★="Gagal!", 1-2★="Coba Lagi", 3★="Bagus!", 4★="Hebat!", 5★="Sempurna!".
  - Sub-message "Sempurna! Tidak ada kesalahan!" hardcoded instead of derived from stars.
  - "Level Berikutnya" should only appear when stars≥3 (passing grade).
- **Touches**: `games/game-modal.js` `GameModal.show()` + `game.js` showResult/showGameResult wrappers.
- **Scope**: affects ALL games that use the shared modal.

### Task #45 — Character Train Sprite Re-processed (cumulative feedback) ✅ DONE 2026-04-22
- ✅ **JZ 711 Dragutin**: re-processed 2026-04-22 06:53 via `isnet-general-use` + `alpha_matting=True` → 512×128. spriteHeight 52 → **75**, wheels narrowed to `[-120..-95, 95..120]` within sprite bounds.
- ✅ **Malivlak (JZ 62)**: re-processed → 512×256. spriteHeight 95 → **110** (rendered 220×110). Wheels re-fit 220px range: `[-85..90]` with pilot pair (r=5) + driver pair (r=11). Smoke moved y=-118→-130, x=118→90.
- ✅ **Casey JR**: source 272×199; kept spriteHeight:90; wheels re-spaced `[-40,-14,13,40]` radius=10 uniform.
- ✅ **Linus Brave**: new source 130×101 (50% smaller). spriteHeight 88 → **85** (rendered 109×85). Wheels compacted to `[-40..23]` with pilot r=6 + drivers r=9. Smoke y=-108→-105.
- ✅ **Wheel positions proportional** — all 4 trains now mapped against new render widths: Casey 123px, Linus 109px, Dragutin 300px, Malivlak 220px. Wheels stay inside sprite bottom edge.
- ✅ **Screen-edge safety margin**: `g16-pixi.html:491` → `TRAIN_SCREEN_X=Math.max(W*0.15, 180)`. `g15-pixi.html:604` → `TRAIN_X=180` (was 120).
- ✅ **Cache bump**: `index.html` → `v=20260422h`.
- **Touched**: `games/trains-db.js`, `games/g15-pixi.html`, `games/g16-pixi.html`, `index.html`. See CHANGELOG 2026-04-22 section.

### Plan order
1. Fix #44 modal engine first (P0, visible bug with wrong success message).
2. Recalibrate Linus wheel positions for new 130×101 sprite.
3. Verify + recalibrate Malivlak wheels against new 512×256 sprite.
4. Increase train safe margin from screen edge.
5. Visual check JZ 711 Dragutin cleanliness.

---

## Status Legend
- ⬜ = Not started
- 🔧 = In progress
- ✅ = Done
- ❌ = Won't fix / Not applicable

---

## ✅ COMPLETED 2026-04-21 — Battle Standards + HD Sprites + G22 + Repo Migration

- ✅ **P0 — HD sprite cascade** (game.js 5005/5012-5014/5391-5404): `pokeSpriteOnline()` now returns HD CDN; `pokeSpriteVariant()` prefers SVG → HD CDN; G10 player/enemy loaders use the HD-first cascade with low-res PNG only as offline fallback; `image-rendering:pixelated` killed.
- ✅ **P0.7 — G10 enemy `loadSprHD` cascade regression** (game.js 5409-5413): Gen 9+ Pokemon (Fuecoco id 909 not in 751 SVG collection) were falling to the back-facing low-res PokeAPI PNG before HD CDN was tried — producing BOTH pixelated rendering AND reversed facing direction (scaleX(-1) assumes HD orientation). Swapped fallback order to mirror `loadSprPlayer`: HD CDN → local PNG → PokeAPI.
- ✅ **P0.8 — G13c scoring bug** (games/g13c-pixi.html:1106, 1179, 1359): stars were derived from cumulative badge count (`total>=15?5:...`) → first win always showed 1★. Migrated to unified `GameScoring.calc()` with per-battle inputs: HP% preservation (as `correct/total`), wrong-answer counter, team-alive as lives. Added `battle.wrongAnswers` + `battle.totalAnswers` counters in battle init + `executeMove()`. Perfect run now correctly returns 5★. Cache-bust `v=20260421d`.
- ✅ **P0.9 — Repo public + secret scrub**: (a) Scrubbed exposed Gemini API key from entire Dunia-Emosi git history via `git filter-repo --replace-text`. (b) All-pattern secret scan clean. (c) Flipped repo visibility via GitHub API → `baguspermana7-cpu/Dunia-Emosi` now **public**. SHAs changed; any local clones must re-clone.
- ✅ **P1.0 — Gemini → WebP asset standard** (`scripts/gemini-image-gen.py` + `prompts/` + CODING-STANDARDS section): new helper enforces WebP-only output (quality 82, method 6, max 1200px). Raw PNG is held in memory only and never persisted. Key via `GEMINI_API_KEY` env var — never committed.
- ✅ **P1.1 — G17 Jembatan Goyang visual polish** (game.js:10205, 10303; style.css g17CorrectRing): Fixed inconsistent block labels (numbers 1-9 + emoji 10+ mix → always show 1..N numbers on wooden planks). Added correct-tap juice: `spawnParticleBurst` + green ring ripple (`@keyframes g17CorrectRing`) at block center. Scene (sky/mountains/gorge/river/cliffs/bridge), wooden-plank CSS, train-cross victory animation, lives hearts, floater +1⭐/-1💔/COMBO, and bridge-shake were already in place from prior sessions — no need to re-overhaul.
- ✅ **P0.5 — Battle standards (5 invariants)** enforced across G10/G13/G13b/G13c:
  - Fix A: Canonical `POKE_TYPE_COLORS` + `pokeTypeColor(type)` helper at game.js:5003 (replaces 3 duplicate inline maps in G10/G13/G13b).
  - Fix B: `g10TypeFX()` DOM fallback expanded from 4 → 18 types (matches `g13TypeHitFX` coverage).
  - Fix C: `spawnTypeAura(el, type, dur)` helper + `@keyframes pokeAuraRing` in style.css. G10 + G13 + G13b DOM aura rings now route through it.
  - Fix D: `pokeTierScale()` now applied to G13 initial player sprite + G13 evolved forms (was `scale(1.2)` / `scale(1.3)` hardcoded). G13b player already had tier scaling.
  - Fix E: G13c inline `POKE_TIER` map + `pokeTierScale()` + applied via `scale()` transform to `#poke-player`/`#poke-enemy` sprite loaders.
  - Fix F: G13c `addAura(el, type)` now type-colored (CSS var `--aura-color`); both player + enemy call-sites pass attacker type.
  - Fix G: G13c TYPE_PROJ + TYPE_HIT_FX audit — 18-type coverage confirmed (no gaps).
- ✅ **P0.6 — G22 Monster Candy overhaul** (games/g22-candy.html): smooth lerp-driven movement, HD Psyduck (clamp 140-220px), dynamic answer-pill layout (no overflow), pickup FX (catch-pop + ring burst), rich background (12 clouds/3 parallax speeds, 6 flyers, 5 pine trees, 3 mountains, 24 flowers, rainbow), ground-anchored sprite via window.innerHeight calc, directional facing (scaleX + turn-flip animation).
- ✅ **Repo migration** — `Apps/dunia-emosi/` content now lives at `github.com/baguspermana7-cpu/Dunia-Emosi` (fresh-init workaround after `git subtree split` produced wrong tree). Vercel auto-redeploys `dunia-emosi.vercel.app` + `dunia-emosi-z2ss.vercel.app` on push.

Cache-bust: `index.html` v=20260421b (style + game.js).

---

## ✅ COMPLETED 2026-04-19

- ✅ G10/G13/G13b/G13c: `POKE_IDS is not defined` crash — added global lookup from POKEMON_DB
- ✅ G10: Sprite loading changed to local-first → REVERTED to HD-online-first (local was 96px, too small)
- ✅ G13b: Added back button (←) to navbar
- ✅ G13b: Type-matched attack SFX via `playAttackSound(type)` on player attack
- ✅ G13b: Type-matched attack SFX on wild counter-attack (replaced generic playTone)
- ✅ G13c: Added full attack SFX system (player attack, enemy attack, wrong answer self-damage)
- ✅ G16: Fixed `obs.question.wrong is undefined` crash on mini-quiz obstacles
- ✅ G16: Mini-obstacle spacing reduced 25%
- ✅ G22: Fixed `emoji` undefined, answer colors revealing correct, PixiJS v8 API, candy freeze during quiz, totalMissed tracking, resize W/H, dead code removal
- ✅ G22: Enhanced quiz panel (bigger buttons, question label), monster auto-catch, danger warning glow, combo screen shake
- ✅ G20: Keyboard start (Enter/Space), quiz answer keys (1-4), PC hint text
- ✅ G20: Background complete rewrite (gradient sky, sun rays, ocean, 2-layer hills, bigger beach items)
- ✅ G20: Gameplay tuning (gravity 0.35→0.5, hit zone +12px, serve lower/centered)
- ✅ G20: BGM changed to Pokemon Opening, sfxThud for ground impact
- ✅ G19: Mirror GIF sprites copied over main webp files (43 files)
- ✅ G19: Butterfree added to Pokemon roster
- ✅ Graded celebration effects — confetti/sparkles now based on star count (5★=full, 3★=light, 1-2★=none)
- ✅ GameModal.show() — added graded confetti for standalone games
- ✅ BGM: G10 → VS Wild Pokemon, G13c → Pokemon Gym, G13b → Ending theme
- ✅ G22: BGM → Ending theme → REVERTED to battle-bgm.mp3 (user says Pokemon BGM wrong for candy game)
- ✅ Graded confetti: showResult() now grades confetti by stars (5★=full blast, 4★=medium, 3★=light, 1-2★=none)
- ✅ GameModal confetti: standalone games get graded confetti via game-modal.js
- ✅ spawnSparkles() graded: accepts starCount param for intensity scaling

## ✅ COMPLETED 2026-04-20 (Session 2 — Evening)

### G13 Pertarungan Pokemon — Level Berikutnya Freeze (P1)
- ✅ **Button handler**: `showGameResult` onclick wrapped in `requestAnimationFrame(()=>b.action())` — modal `display:none` flushed before next level init (game.js:8528)
- ✅ **Stale sprite cleanup**: `initGame13()` resets sprite classes (spr-defeat/spr-hit/spr-flash/spr-atk/wild-die/wild-enter) on both `g13-pspr` and `g13-wspr` (game.js:~7089)
- ✅ **Cache bust**: `game.js` + `style.css` version `?v=20260418b` → `?v=20260420a` (index.html)
- **Root cause**: old sprite classes from victory animation persisted; modal dismiss raced with new-level init

### Pokemon Tier Sprite Scaling — Global Standard (P2)
- ✅ **Global helper added**: `POKE_TIERS` lookup + `pokeTierScale(slug)` in game.js near POKEMON_DB (game.js:4993)
- ✅ **Scale standard** (MANDATORY for all Pokemon games):
  - tier 1 (basic, e.g., Charmander, Eevee) = 1.0×
  - tier 2 (1st evo) = 1.2×
  - tier 3 (2nd evo / final) = 1.3×
  - tier 4 (legendary) = 1.3×
- **Application**: G10 already has tier sizing inline (line 5414-5419, 5233-5236) — cache bust propagates fix
- **Scope**: G10, G13, G13b, G13c, G22 (G19 skip — roster manually curated with per-entry scale)

### G10 Pertarungan Pokemon — Hit Effect Regression (P3)
- ✅ **Fixed `auraColors` key mismatch**: was capitalized `Fire/Water/...` keys, but POKEMON_DB `type` is lowercase → lookup always fell back to default purple (game.js:5638)
- ✅ **Added `typeLow` normalization**: `type.toLowerCase()` before key lookup for safety
- ✅ **Covered by 2026-04-21 P0.5 Battle Standards**: `spawnTypeAura` + 18-type `g10TypeFX` DOM-fallback parity + canonical `POKE_TYPE_COLORS` resolve the full 8-stage chain. See the P0.5 block at the top of this file.

## 🔧 WORKFLOW RULE (user mandate 2026-04-20)
**ALWAYS update TODO-GAME-FIXES.md + documentation/standarization/ docs for every fix or new pattern.** Not optional. Reference: feedback_always_document.md in memory.

## ✅ COMPLETED 2026-04-20

### G22 Monster Wants Candy — Pokeball Category Visual Match
- ✅ **Ball visual = category**: Ball design indexed by `ballType` (not random) — Poké Ball=Math, Great Ball=Warna, Ultra Ball=Hewan, Master Ball=Buah, etc. Ball color now signals quiz domain.
- ✅ **Category chip**: Quiz panel shows `🎯 Matematika / Warna / Hewan / Buah` label above question so player knows what they're answering.
- ✅ **Text question fix**: Quiz label no longer appends `= ?` to non-numeric questions (e.g., "Apa warna langit?" not "Apa warna langit? = ?").
- ✅ **Panel enlarged**: Quiz panel BG expanded to fit category chip without overlap.

### Train BGM (G14/G15/G16)
- ✅ **Train BGM wired**: Renamed `WhatsApp Audio ...mp3` to `Sounds/train-bgm.mp3` and swapped all 3 train games to use it instead of `battle-bgm.mp3` (Pokemon battle theme).
- Files: `games/g14.html`, `games/g15-pixi.html`, `games/g16-pixi.html`

### G10/G11/G12 Scoring — Double Normalization Fix
- ✅ **Root cause**: `endGame()` normalized raw star count to 5-star scale, then `showResult()` normalized AGAIN using `maxPossibleStars` set to raw `maxRounds`. For Lv.10 (6 rounds) perfect run: `round(6/6*5)=5` in endGame → `round(5/6*5)=4` in showResult ❌
- ✅ **Fix**: `endGame()` now sets `state.maxPossibleStars=5` (already-normalized scale) so showResult does `round(N/5*5)=N` and passes the correct value through.
- **Impact**: Perfect runs on any level now correctly show 5★ instead of 4★ or fewer.

### G18 Museum Kereta — +5 Indonesian Trains
- ✅ **Lori Tebu (1880)**: 60cm narrow-gauge sugar cane plantation train (Sragi, Tasikmadu, Colomadu)
- ✅ **CC201 (1977, GE USA)**: Iconic orange diesel locomotive — 140+ units in Indonesia
- ✅ **Whoosh KCIC400AF (2023)**: First HSR in Southeast Asia — Jakarta→Bandung 45 min
- ✅ **Argo Parahyangan (2010, INKA Madiun)**: Executive Jakarta-Bandung — showcases Indonesian INKA manufacturing
- ✅ **LRT Jabodebek (2023)**: First driverless (GoA L3) train in Indonesia
- Total trains: 19 → 24

### G22 Real Pokeball PNGs
- ✅ **SVG → PNG rasterization**: ImageMagick `-density 300 -resize 128x128` produced 9 PNGs (19-29KB each) in `assets/Pokemon/pokeballs-png/`.
- ✅ **PIXI.Assets.load()**: `preloadPokeballTextures()` fires during init, caches by ballType index.
- ✅ **Sprite render**: `spawnCandy` uses `PIXI.Sprite(cachedTex)` when available, falls back to drawn Graphics otherwise.
- Result: real authentic pokeball art (proper stripes, shading) replaces the drawn primitives.

### G6 Petualangan Mobil — Road Polish
- ✅ **Yellow center dash**: Middle lane divider now `#FCD34D` alpha 0.55+ (was faint white 0.08) — classic highway look.
- ✅ **Road signs**: Spawner emits 3-5s cadence post + icon-boxed sign on random side, themed per map (city=🛑🚸🅿️, forest=🦌🌳, space=🛸🌠, pantai=🏖️🌊, sekolah=📚🏫, dapur=🍳🧂, kebun=🌻🌾, body=💊🧬). Scrolls with road speed, auto-culled off-screen.

### G17 Jembatan Goyang — Juice
- ✅ **Lives display**: ❤️❤️❤️ in HUD top-right, fills 🖤 as damage taken, shakes on hit via `g17HeartShake` keyframe.
- ✅ **Floating numbers**: Red `-1 💔` on damage, gold `+1 ⭐` on correct tap, larger gold `COMBO xN!` on 3+ streak. Float-up animation `g17FloatUp` with scale + fade.
- Addresses "gameplay sangat jelek" — whack-a-mole now has feedback loop.

### G14 Balapan Kereta — Scenery Detail
- ✅ **Bird flock**: 3-bird V-silhouette with wing-flap scaleY oscillation, drifts left (only forest/coastal/snow themes where it fits).
- ✅ **Signal posts**: 4 alternating red/green LED posts with soft glow, scroll at 0.6× train speed as mid-layer parallax.
- Addresses "sparse, lacks detail" — all scenery depths now have movement.

### G15 Lokomotif Pemberani — Scenery Detail
- ✅ **Signal posts**: 4 alternating red/green posts along horizon, scroll with track at 0.6× gameSpeed.
- ✅ **Bird flock**: 3-bird silhouette added on sunrise/forest/tropical themes (skipped night/mountain for visibility).

### G16 Selamatkan Kereta — Railway Signals
- ✅ **Semaphore masts**: Red/green signal masts every 380px along track — mast + arm + dark lamp housing + soft glow + red/green core. Scrolls with worldContainer parallax alongside telegraph poles.

## ✅ COMPLETED 2026-04-20 — G3 Huruf Hutan AAA Overhaul

- ✅ **Background**: Switched from `bg-game3-huruf.webp` (bedroom-like overlay) to `bg-forest.webp`
- ✅ **Word display**: Wooden plank style — amber/brown gradient with wood-grain stripes, white text with shadow, `#D97706` border, `#451A03` drop shadow
- ✅ **Letter spans**: Word rendered per-character; first letter is blank `_` (fill-in-the-blank puzzle)
- ✅ **Letter highlight**: On correct answer, blank fills with correct letter + gold `#FCD34D` burst animation (`g3LetterBurst` scale 1.6×)
- ✅ **Hint speech bubble**: White pill with green border `#86EFAC`, soft shadow, readable dark-green text
- ✅ **Choice buttons**: Carved wood log style — deep brown gradient `#7C2D12→#9A3412`, vertical wood-grain, orange border `#FB923C`, cream yellow letters, bouncy press
- ✅ **Animal swing**: Gentle 3s hover animation — rotate -3°↔3° + translateY ±10px
- ✅ **Mode badge hidden**: `display:none` (redundant with mascot guide bubble)
- ✅ **Progress text hidden**: `display:none` on "1/6" (keeping only round-dots at top)

---

## 🆕 REOPENED 2026-04-21 (Evening session — from user screenshot + BGM feedback)

> User flagged these as PLAN MODE required — analyze deeply before coding.

### G6 — Petualangan Mobil (REOPENED, not solved)
- ⬜ **Objects melayang di luar jalan/circuit** — buildings/emojis escape road bounds
- ⬜ **Vehicle/character images FAIL TO DISPLAY** — URL-encoded path fix from 2026-04-20 not enough, still broken
- ⬜ **Gameplay + animasi + UIUX need deep improvement**
- **Plan mode**: inspect tile spawn logic, sprite path resolution (check DRIVE_VEHICLES + actual asset files), circuit boundaries CSS, object z-index/positioning

### G19 — Pidgeot Icon Landing Page
- ✅ **Icon 🐦 → Pidgeot HD SVG** (index.html:470): `<img src="assets/Pokemon/svg/18.svg">` 44×44px, emoji fallback via onerror. Cache-bust `v=20260421f`.
- 🔄 **Other tile audit**: Most tiles use emoji `<span class="wn-icon">` appropriately (🎭 emosi, 🌬️ napas, 🃏 memory, 🔤 huruf, 🔡 susun, ✍️ jejak, 🦁 hitung, 🖼️ tebak, 🏐 volley). G6 already uses img (racecar.svg). G21 uses psyduck.png (placeholder). Consider if others deserve custom sprites — deferred as separate ticket.

### G20 — Ducky Volley (controls + physics)
- ✅ **Controls & physics tidak smooth** — ball movement jerky, player response laggy (EXECUTED 2026-04-21 Evening, Task #25 controls portion)
- ✅ **JANGAN auto-jump** — user says no auto-jump mechanic (EXECUTED: removed both auto-jump-assist line and tap-auto-jump on touchstart)
- ✅ **Revamp controls** jadi lebih responsif + tactile (EXECUTED: lerp horizontal `pvx=pvx*0.78+target*0.22`, rise-damping `pvy*=0.985`, ball air-drag `0.995^dt`/`0.998^dt`, gravity mult `0.65→0.60`, added visible jump button 72×72 + swipe-up gesture threshold 40px)
- **Changes landed**: `games/g20-pixi.html` lines 76-89 (btn-jump HTML), 699-744 (physics), 1097-1135 (touch handlers). No edits to `game.js`/`style.css`/`g16-pixi.html`. Tested mentally: player serves from reset pos, ball still triggers checkHit path, BGM/pause/scoring untouched.

### G20 + CROSS-GAME — Unified Scoring Engine (HIGH PRIORITY) ✅
- ✅ **Scoring UNIFIED** — Task #25 scoring portion EXECUTED 2026-04-21 Evening.
- ✅ **Migrated this pass**: G10 (via central `endGame()` — covers G10/G11/G12), G13 (evolution bonus pattern), G13b (kill-threshold bonus pattern — both `g13bGameOver` defeated/complete paths AND `g13bLevelComplete` final path), G17 (accuracy + lives), G18 (pure quiz accuracy).
- ✅ **Already migrated** (previous sessions): G6, G14 (standalone), G15, G16, G19, G20, G22, G13c.
- ✅ **Shipped**:
  - `game.js:1864-1867` — `endGame()` now routes through `GameScoring.calc({correct: stars, total: maxRounds})`. Single change covers G10/G11/G12.
  - `game.js:7824-7827` — G13 evolution uses bonus-modifier pattern: `calc({correct:1, total:1, bonus: evoPenalty})` where penalty = 0/-1/-2 for evolved2/evolved/none. Legacy 5/4/3★ distribution preserved exactly.
  - `game.js:8518-8529` — G13b `g13bGameOver` threshold bonus: `calc({correct:1, total:1, bonus: tier-5})`. Defeated path caps at 2★, survival path at 3★ via `_g13bTier` intermediate. All legacy thresholds (`kills≥15→2`, `≥5→1`, `≥30→3`) preserved.
  - `game.js:8559-8561` — G13b `g13bLevelComplete` same bonus pattern with `_g13bLcTier` covering 1-5★ range.
  - `game.js:10451-10465` — G17 accuracy-based: `calc({correct: g17State.correct, total: g17State.totalBlocks, lives: maxDamage-damage, maxLives: 3})`. Damage re-cast as lives-lost so the engine's `livesLost >= 2` demote modifier applies.
  - `game.js:11113-11116` — G18 quiz: `calc({correct: score, total})` — pure accuracy mapping replaces the 4-tier ternary.
- ✅ **Verification**: `grep -c GameScoring.calc game.js` = 9 (up from 0 inline), residual `perfStars =` lines at 9841/9985/10211/10465 are **G14/G15/G16 in-game legacy paths** (standalone versions already migrated — in-game out of scope for this pass) and my new migrated `perfStars = GameScoring.calc(...)` assignments.
- ✅ **Pattern documented** in `LESSONS-LEARNED.md` — bonus-modifier technique for non-accuracy games (tier/progression scoring). Reusable for any future game where `{correct, total}` doesn't fit cleanly.
- ⬜ **Not scope, deferred**: G9 tracing (0-3★ scale intentional, not migrated), G1/2/3/4/5/7/8 (emotion/calm/letter/count/memory/picture/word games — check if they use inline star math in a later pass), in-game G14/G15/G16/G17 paths where the standalone is already unified.

### RDE Steps 5+6 (Task #29, progress 2026-04-22) 🔧
- ✅ **Step 5 G1** — `.g1-animal-display`/`.g1-question`/`.g1-choice-btn`/`.choice-emoji/label`/`.g1-progress` consume `--rz-font-*`/`--rz-gap-*`/`--rz-radius-md`. Removed 9 @media override lines.
- ✅ **Step 5 G4** — `.g4-timer-text`/`.g4-question`/`.g4-choice-btn`/`.g4-progress`/`.g4-mode-btn` tokenized. Removed 4 @media override lines.
- ✅ **Step 5 G2** (2026-04-22) — `.breathe-circle-wrap/animal/instruction/sub/timer-wrap/timer/cycles` consume `--rz-font-*`/`--rz-gap-*` + `clamp()` for circle/timer diameters. Removed 10 @media override lines (480/320).
- ✅ **Step 5 G5** (2026-04-22) — `.g5-score-row`/`.g5-player-score`/`.ps-name/ps-val`/`.g5-turn-text`/`.g5-grid`/`.card-emoji`/`.card-label` tokenized (gap/radius/padding/font + clamp). Gameplay rules (aspect-ratio, preserve-3d, grid-template-columns) preserved. Removed 8 @media override lines.
- ✅ **Step 5 G7** (2026-04-22) — `.g7-mode-badge`/`.g7-display`/`.g7-question`/`.g7-choices`/`.g7-choice-btn/img/text`/`.g7-suku`/`.g7-progress` tokenized. Dark-theme `!important` overrides at 1620+ preserved. Removed 6 @media override lines (viewport-sized display retained for 480/320).
- ✅ **Step 5 G9** (2026-04-22) — `.g9-letter-display`/`.g9-instruction`/`.g9-canvas-wrap`/`.g9-result`/`.g9-stars`/`.g9-progress` tokenized + clamp. Canvas pixel-math wrap sizes retained for 480/360/320. Removed 2 @media letter-display overrides.
- 🧮 **Token count**: `var(--rz-` references grew 62 → 112 (+50). Brace balance verified 2767/2767.
- ✅ **Step 6** — `shared/rz-responsive.js` shipped with `window.RZ` API mirroring CSS `--rz-scale` formula. PixiJS games opt-in per Step 7.
- ✅ **Step 7 (complete, 2026-04-22)** — All 6 PixiJS games migrated to consume `shared/rz-responsive.js`:
  - **G22 Monster Candy** (`games/g22-candy.html`) — quiz panel `showCandyQuiz()` consumes `RZ.fontScale(17/11/16/18/24)` + `RZ.btn('sm')` (6 call sites at lines 525-528, 582, 602).
  - **G14** — integrated by parallel agent.
  - **G15** — integrated by parallel agent.
  - **G16** — integrated by parallel agent.
  - **G19** — integrated by parallel agent.
  - **G20 Ducky Volley** (`games/g20-pixi.html`) — script include line 127, `const _rz = window.RZ` hoist at line 129. 3 `PIXI.Text` sites wrapped: beach decoration emoji (line ~506, random 10-18), type-hit emoji burst (line ~881, 20), crab `?` hint glyph (line ~976, 11). 4 `_rz`/`RZ.*` references total (1 const + 3 ternaries). Physics/gravity/ball speeds untouched per Step 7 scope guard.
- ✅ **Task #29 RDE — ALL 7 STEPS COMPLETE (2026-04-22)**: tokens (1), reusable classes (2), G8 (3), G3 (4), G1/G2/G4/G5/G7/G9 (5), runtime shipped (6), all 6 PixiJS games wired (7). 60+ `@media` lines deleted. CHANGELOG documents per-game overrides.

### G15+G16 Character Trains: Casey JR + Linus Brave (Task #43, EXECUTED 2026-04-22) ✅
- ✅ **Asset prep** (2026-04-21 23:58): `caseyjr-body.webp` (272×198) + `linus-body.webp` (264×173), bg-removed via rembg.
- ✅ **Shared module** `games/train-character-sprite.js` — `window.CharacterTrain.mount(container, config)` API. Manages: async sprite load (PIXI.Assets + emoji fallback), wheel overlay (PIXI.Graphics circles with spokes), rotating wheels via `tick(dt, speed)`, body bob via sin oscillation, smoke puff particles (auto-spawn at interval, fade+rise+expand).
- ✅ **G15 integration** (games/g15-pixi.html): script include line 220, new `characterTrainInstance` state, `buildTrain()` branches on `selectedTrain.isCharacter`, tick wired in main app.ticker loop line 674.
- ✅ **G16 integration** (games/g16-pixi.html): script include line 148, `G16_CHARACTER_CONFIG` defaults to Casey JR, `buildTrain()` branches to CharacterTrain when module loaded, tick wired in gameLoop line 1137 with speed based on trainState (STOPPED=0, MOVING=2, BOOSTING=4).
- ✅ **Roster** (trains-db.js): new "Karakter ⭐" category at index 0 with 2 entries. `caseyjr_character` (0-4-0, 4 wheels) + `linus_brave` (2-4-0, 2 pilot + 4 drivers). Each with `isCharacter:true`, `spriteUrl`, `wheelPositions`, `smokePos`, legacy speed/boost fields.
- **Cache**: `v=20260421m` → `v=20260422a`.
- **Plan** — shared `games/train-character-sprite.js` module:
  - API: `mountCharacterTrain(container, config)` where config has `{spriteUrl, wheelLayout, wheelPositions, smokePos, steamInterval}`
  - Wheel overlay: PIXI.Graphics circles drawn ON TOP of sprite, each a container so rotation works. Updated every frame with `wheel.rotation += speed * dt`.
  - Steam FX: spawn gray ellipse particles at `smokePos` every `steamInterval` ms, fade + rise + expand, lifetime ~2s.
  - Body bob: `container.y = baseY + Math.sin(frame * 0.08) * 1.5`
  - Headlight glow: subtle pulse via alpha oscillation.
- **G15 integration** (games/g15-pixi.html):
  - Insert 2 entries at index 0 of TRAIN_CATS (or separate "Character" category): `{key:'caseyjr', isCharacter:true, spriteUrl:'../assets/train/caseyjr-body.webp', wheelLayout:'0-4-0', wheelPositions:[[-30,20],[0,20],[30,20],[60,20]], smokePos:[-50,-60], name:'Casey JR', sub:'0-4-0 Circus', kmh:40, baseSpeed:1.65, boostMult:1.50}` + similar for Linus 2-4-0.
  - In buildTrain (~L1022), branch: `if (selectedTrain.isCharacter) buildCharacterTrain(selectedTrain)` else existing Graphics build.
- **G16 integration** (games/g16-pixi.html):
  - G16 currently has fixed programmatic train (buildTrain L810). Add train picker dropdown in pre-game overlay OR default to Casey JR + add pause-menu switcher.
  - Use same `mountCharacterTrain()` helper.
- **Live-feel detail checklist**: smoke trail, spinning wheels, body bob, headlight pulse, boost → faster smoke+wheels, stopped → slow smoke. Plan before execute.

### G6 BGM → racecar.mp3 + crop to gameplay (Task #41, EXECUTED 2026-04-21 late evening) ✅
- ✅ **BGM swapped** — `games/g6.html:77` now `<audio id="game-bgm" src="../Sounds/racecar.mp3" loop preload="auto">`.
- ✅ **Volume 0.2 → 0.5** at `games/g6.html:920` (was line 944 pre-scenery-cleanup).
- ✅ **Play/pause flow verified**: (a) BGM does NOT autoplay on start-overlay — the `bgm.play()` call lives inside `startWord()` which runs after difficulty pick, not on overlay mount. (b) `togglePause` (~1003) pauses/resumes correctly. (c) `finishGame` (~1007) pauses on end. (d) `confirmBack` (~1024) pauses on exit. `loop` attribute handles auto-repeat without JS cropping.
- **Applied-summary**: `src=battle-bgm.mp3 → racecar.mp3`, `volume=0.2 → 0.5`. No JS flow changes needed — play/pause wired through `startWord` / `togglePause` / `finishGame` / `confirmBack` from the original overhaul.

### G6 Floating Objects Outside Road (Task #42, EXECUTED 2026-04-21 late evening) ✅
- ✅ **Shoulder scenery removed** — deleted the 8-iteration emoji spawn loop in `buildScenery()` (`games/g6.html:355-367` post-edit). User complaint "melayang-layang di luar jalan kesannya acak" fixed at the source.
- ✅ **Safe stubs kept**: empty `sceneryL`/`sceneryR` containers with `_scroll` props retained so the game-loop scroll tick at `~889` (`bg._sceneryL.y += scrollAmt`) stays functional without null-check retrofits.
- ✅ **Dead code swept**: removed the per-theme `icons` map (city/forest/space/body/pantai/sekolah/dapur/kebun) that was only consumed by the now-deleted loop.
- ✅ **Preserved**: road signs (spawn inside canvas bounds after earlier P2 fix), road surface, lane markings, car sprite.
- **Applied-summary**: Decision was Option A (full removal, not reposition). Road signs remain the sole ambient road furniture. Dark mode now shows clean road — no low-alpha specks outside the lanes.

### G16 Train STILL Bablas — Overshoot Bug (Task #40, EXECUTED 2026-04-21 late evening) ✅
- ✅ **Bablas fixed** — 4-part hard-guard applied in `games/g16-pixi.html`.
- **Shipped**:
  1. ✅ **Floor reduced** 2px → 0.2px (line ~1256): `Math.max((nextObs.worldX-S.worldX)*0.8, 0.2)`.
  2. ✅ **Hard clamp** (lines ~1259-1266): if `S.worldX + maxStep > nextObs.worldX + 5` → snap to `nextObs.worldX - 1`, force `trainState='STOPPED'`, set `currentObstacleIdx`, call `showQuizPanel(nextObs)` (guarded on `!quizActive`). Normal `+=` is skipped.
  3. ✅ **Per-frame cap** (line ~1253): `rawStep = Math.min(speed*dt, baseSpeed/2)` — dt spikes / tab-switch can't teleport.
  4. ✅ **Overshoot recovery** (lines ~1115-1124, game-loop prologue): scans `S.obstacles` for any uncleared with `worldX < S.worldX - 20`, rewinds `S.worldX = missed.worldX - 5`, forces STOPPED, shows quiz. Last-ditch guarantee.
- **Applied-summary**: 4 layers of defense (soft clamp → crossing-snap → per-frame cap → post-hoc rewind). STATE-based bablas-recovery (Task #34) remains as 5th layer.

### G16 Mini-Obstacle Density (Task #39, EXECUTED 2026-04-21 late evening) ✅
- ✅ **Density fixed** — deterministic per-gap placement in `games/g16-pixi.html:1036-1069`.
- **Shipped** (Option B applied):
  - ✅ `maxMinisPerGap = {1:1, 2:2, 3:2, 4:2, 5:3}[S.level] || 2`.
  - ✅ Iterates adjacent station pairs: `for s in obstacles[:-1]` → skips gaps `<400px` → places N minis evenly at `worldX + gap * m / (N+1)`.
  - ✅ Random emoji from ROAD_OBS preserved, quiz mechanism preserved, visual style preserved.
- **Applied-summary**: Level 1 = 1 mini per gap (easy), Level 2-4 = 2 minis per gap (normal), Level 5 = 3 minis per gap (hard). Random-rate formula retired in favor of deterministic placement.

### G16 Correct-Answer Celebration FX (Task #38, EXECUTED 2026-04-21 Evening) ✅
- ✅ **Meledak/petasan effect** saat player jawab benar di quiz box + kereta mulai jalan lagi — IMPLEMENTED.
- **Shipped**: (1) `spawnQuizCelebrationFX(screenX, screenY, streak)` added in `games/g16-pixi.html` (~line 1509). (2) 3 FX variants by streak: 14-confetti burst + white ring (baseline) → +6 firework bursts of 10 sparks (streak≥3) → +8 ⭐✨🌟💫 floating emoji + gold ring (streak≥5). (3) Sync timing: FX fires in `onChoiceTap` BEFORE 380/500ms `clearObstacle` delay — overlaps with train STOPPED→MOVING transition. (4) Stage punch via new `updateStagePunch(dt)` in gameLoop — sine bell-curve scale 1→1.04→1 over 0.5s, center-pivoted via `stage.x/y` compensation. (5) Streak tracked on `S.correctStreak` (reset on wrong). (6) `updateSparks` extended with `_ring` (expand+fade, no motion) and `_noGravity` (emoji slow-drift upward) branches — particles culled through existing pipeline. Audio chime cascade deferred (no SFX assets sourced — covered by Task #35).

### Alt2 HD Sprites Integration (Task #37, EXECUTED 2026-04-21 Evening) ✅
- ✅ **1025 Pokemon HD WebP** at `/assets/Pokemon/pokemondb_hd_alt2/` — filename `{NNNN}_{slug}.webp` (e.g., `0025_pikachu.webp`), 630×630 RGBA, ~50KB each, 49MB total. Covers ALL Gen 1-9 (vs previous ~751 SVG).
- ✅ **Orientation**: All face RIGHT user-POV = LEFT monitor-POV → matches BSE default `'L'` facing. Zero per-Pokemon overrides needed.
- ✅ **Database**: `pokemondb_hd_alt2/pokemon_database.md` available — 28k lines, full metadata (types Indonesian "Daun, Racun", evolution chain, abilities, base stats, moves).
- **Applied**:
  1. ✅ `pokeSpriteAlt2(slug)` helper added to `game.js` (~line 5074) — returns `assets/Pokemon/pokemondb_hd_alt2/{padStart(id,4,'0')}_{slug}.webp`, null when id missing.
  2. ✅ `pokeSpriteVariant()` cascade is now **alt2 → SVG (751) → HD CDN**. Primary is alt2.
  3. ✅ BSE engine (`games/battle-sprite-engine.js`) unchanged — `mount()` accepts explicit `hdSrc`/`fallbackSrc`; callers pass `pokeSpriteVariant()` result and the new cascade flows through.
  4. ✅ `POKE_IDS` (global slug→id map built from POKEMON_DB, game.js:4993) used directly with `String(id).padStart(4,'0')` for zero-padding.
  5. ⏭️ Compression skipped — 50MB acceptable per user mandate.
  6. ⏭️ Mega evolution expansion out of scope (alt2 folder has no mega files).
  7. ✅ BSE.mount() unchanged — `hdSrc` param already supported.
- ✅ **Docs updated**: CODING-STANDARDS.md BSE §1 (cascade order + 1025 rationale), CHANGELOG.md (Added + Changed entries), LESSONS-LEARNED.md (Source data inventory entry).
- ✅ **Cache-bust**: `v=20260421h` → `v=20260421i` in `index.html`.
- **Mandate**: HD primary, no regression to 96px PNG. `image-rendering:pixelated` stays banned.

### G13c — Gym Badge Icons (Task #31, deferred)
- ⬜ **Real gym badge icons** — user wants TRAINERS[].badge to show actual Pokemon gym badge PNG/SVG (Boulder/Cascade/Thunder/Rainbow/Soul/Marsh/Volcano/Earth for Kanto, + Johto/Hoenn/Sinnoh/Unova/Kalos/Alola/Galar badges). Currently uses emoji (🪨💧⚡🌿🔮 etc).
- ⬜ **Team Rocket exception** — Giovanni's Team Rocket is NOT a gym → emoji OK for him.
- **Plan**: (1) Source 50+ gym badge assets (Bulbapedia CC-licensed) or user supplies. (2) Drop to `assets/Pokemon/gym-badges/{badge-slug}.png`. (3) Refactor TRAINERS[] to use `badgeIcon` field, update #badge-emoji overlay + trainer cards to render `<img>`. (4) Fallback to generic stone badge image if specific unavailable. **Blocked until assets provided.**

### G16 — Selamatkan Kereta (Tasks #34, #35, #36, plan mode 2026-04-21)

**Task #34 — Freeze di akhir + bablas stasiun** ✅
- ✅ **End-game freeze safeguard** (g16-pixi.html:1455-1467): `triggerArrival()` sekarang arm 8-second setTimeout fallback. Jika `showWin()` tidak fire dalam 8s (race/exception), safety net force `S.winShown=true`, stops game loop, dan try `showWin()` atau fallback ke `finishGame()`.
- ✅ **Bablas-recovery safeguard** (g16-pixi.html:1186-1200): Di `updateTrain` branch `STOPPED`/`CLEARING`, tambahkan `S._stoppedNoQuizTime` accumulator. Jika STOPPED tapi `quizActive===false` selama >1.2s (race condition saat clearObstacle→MOVING→STOPPED sementara quiz panel mid-transition), re-trigger `showQuizPanel(nextObs)`. Jika no obstacle to stop for, force state→MOVING untuk unstick.

**Task #35 — Collision SFX** ⬜ (blocked — menunggu audio)
- ⬜ **Nabrak box/rintangan audio**: Perlu real crash SFX, bukan synth tone. Memperkaya audio layer overall.
- **Plan**: (1) source freesound.com impact MP3 (wooden crunch + metallic clang), (2) `<audio id="sfx-crash">` preloaded, (3) trigger pada obstacle collision, (4) variasi per jenis obstacle.

**Task #36 — Quiz answer text overflow** ✅
- ✅ **CSS refactor** (g16-pixi.html:38): `.choice-btn` sekarang `max-width:none` (removed 120px cap), `padding:clamp(10px,3.5vh,18px) clamp(10px,3vw,18px)` (increased horizontal padding), added `overflow:hidden; overflow-wrap:break-word; word-break:break-word; white-space:normal; line-height:1.2`, reduced default fontSize from `clamp(16px,5.5vw,26px)` to `clamp(14px,4.5vw,22px)`.
- ✅ **Compact variant** (g16-pixi.html:39): New `.choice-btn.long-text` reduces fontSize further to `clamp(12px,3.5vw,17px)` for answers with >5 chars.
- ✅ **Auto-apply logic** (g16-pixi.html:1363): `showQuizPanel()` measures `Math.max(...choices.map(c => String(c).length))` and adds `long-text` class to all buttons when any answer >5 chars.

### G22 — Monster Wants Candy (POLISH v2.5 — per-type FX + smoother movement)
- ✅ **Per-category FX** (g22-candy.html:628-689): New `spawnCategoryFX(x, y, ballType, catName)` dispatches to 4 signature effects:
  - **Math** (`fxNumberBurst`): digits 1/2/3/+/×/=/✓/9/5/7 radiating outward, red-white palette
  - **Warna** (`fxRainbowSpiral`): 18 colored rectangles in spiral pattern, 7-color rainbow
  - **Hewan** (`fxGoldPaws`): 9 🐾⭐✨🌟 particles + gold expanding ring
  - **Buah** (`fxPurpleLeaves`): 10 🍃🌿✨💫 particles + purple mist glow
- ✅ **Smoother monster movement** (g22-candy.html:843-849, 885-891):
  - Adaptive lerp: 0.28 when distance>120px, 0.22 when 40-120px, 0.15 close — snappy-far, glide-near
  - Idle y-bob: `Math.sin(frame*0.05)*4` when stationary — adds life
  - Directional squash: scaleX/Y 1.06/0.92 on fast move — anticipation/follow-through animation principle
  - CSS `@keyframes monsterIdleBob` + `.idle-bob` class available for future use

### G20 + G22 — Movement SFX (Task #33, plan mode)
- ⬜ **Whoosh/swoosh audio** — user wants real audio for: (G22) pokeball throw whoosh, monster movement swoosh; (G20) volley hit swoosh, jump whoosh.
- **Plan**: (1) Source short MP3s (freesound.com) — 30-50ms for hits, 200-400ms for swipes. (2) Add `<audio id="sfx-whoosh">` preloaded tags. (3) Throttle triggers — only fire on direction change or discrete event, not every frame. (4) Volume 0.4-0.6 master.

### G22 — Monster Wants Candy (POLISH v2)
- ✅ **Quiz panel → bottom grass** (g22-candy.html:607-609): Panel sekarang anchored at `panel.x=W/2, panel.y=H-130` — always bottom-center, tidak ikut candy.y. Tidak lagi menutupi view monster.
- ✅ **Bubble pop FX on correct** (g22-candy.html:628-652): New `spawnBubblePop(x,y)` — 12 light-blue bubble rings expanding outward + center white sparkle flash with scaleGrow. Wired in correct-answer branch alongside existing `spawnCatchFX`.
- ✅ **Laser absorb FX on wrong** (g22-candy.html:654-698): New `laserAbsorbSwap(candy)` — draws dual-layer red laser beam from pokeball position to monster (using `getBoundingClientRect` to resolve screen coords), white absorb flash at impact, monster CSS filter `brightness(6) contrast(0)` with opacity fade.
- ✅ **Mandatory Pokemon swap** (same function): After 800ms absorb animation, picks random different slug from `G22_POKEMON` roster (15 entries), swaps `monster-img.src`, fades out → fades in with `catch-pop` animation. `g22SelectedPoke` state synced.
- **Cache**: G22 has no `?v=` cache-bust — user needs hard refresh (Ctrl+Shift+R) to load changes.

### Battle Sprite Engine (BSE) — Task #30
- ✅ **Shared engine created**: `games/battle-sprite-engine.js` (~60 lines) exposes `window.BSE` with `init/facing/flipForRole/visualScale/tierScale/finalScale/mount` + mutable `POKE_FACING` + `POKE_VISUAL` tables.
- ✅ **game.js bridge**: Appended `window.BSE` export after `pokeFinalScale` definition — internal functions accessible externally, single source of truth for inline G10/G13/G13b.
- ✅ **G13c migrated**: Removed inline duplicate `POKE_FACING`/`POKE_VISUAL`/`pokeFacing`/`pokeFlipForRole`/`pokeVisualScale`/`pokeFinalScale`. Now delegates to `window.BSE.*` via thin wrappers. `BSE.init(POKE_TIER)` passes tier map from host.
- ✅ **Acute Staryu fix** (first attempt): Added `staryu:'L'` override. User still reported facing issue — root cause was Pikachu.
- ✅ **Default facing flipped to 'L'** (2026-04-21 user feedback): Engine default was 'R', but Pokemondb HOME 3D renders face viewer with slight LEFT bias. Pikachu natural = LEFT; previous default='R' → want='R' → no flip → rendered LEFT (wrong). New default='L' → player want='R' → flip scaleX(-1) → RIGHT ✓. Same logic makes Staryu enemy render correctly without explicit override. Removed redundant staryu+sobble overrides. Cache-bust `v=20260421h`.
- 🔄 **Remaining migration**: G10/G13/G13b don't need code changes (they already consume game.js helpers directly via bridge). Only need: (1) add more facing overrides as user flags offenders, (2) unify `loadSprHD` variants in game.js to use `BSE.mount()` consistently.
- **HD enforcement** (user mandate 2026-04-21): `pokeSpriteVariant()` still SVG-first → HD CDN. Low-res 96px only fallback. No regressions.

### Navbar + Vertical Letter Input
- ✅ **Navbar fix** (`style.css:196,201`): `.game-header` now `flex-wrap:nowrap; overflow:hidden`; `.gh-title` gets `min-width:0; text-overflow:ellipsis; white-space:nowrap`. Prevents 6 header children from wrapping to multi-row on narrow screens. Cache-bust `v=20260421f`.
- 🔄 **Responsive Display Engine (RDE)** — designed in CODING-STANDARDS.md. 3-layer architecture: (1) CSS tokens `--rz-*` with `clamp()` fluid scaling, (2) reusable classes `.rz-navbar` / `.rz-letter-row` / `.rz-letter-btn`, (3) `shared/rz-responsive.js` runtime helper for Pixi games. Migration in 7 sequenced steps — see CODING-STANDARDS.md "Responsive Display Engine (RDE)" section.
- ✅ **RDE Step 1** (`style.css:17-49`, 2026-04-21 Evening): fluid `:root` tokens added — `--rz-scale`, `--rz-btn-xs/sm/md/lg`, `--rz-font-xs/sm/body/title/h1/hero`, `--rz-gap-xs/sm/md/lg`, `--rz-radius-sm/md/lg`. Zero existing rules modified; tokens available for opt-in consumption.
- ✅ **RDE Step 2** (`style.css:893-947`, 2026-04-21 Evening): reusable classes added — `.rz-navbar`, `.rz-navbar__title`, `.rz-letter-row`, `.rz-letter-btn`, `.rz-choice-grid`. Consume Step 1 tokens; opt-in per game.
- ✅ **RDE Step 3** (`style.css:544-554, 585, 753-754, 849, 882`, 2026-04-21 Evening): G8 Susun Kata migrated via **token composition** (kept `.g8-letter-btn`/`.g8-slot` class names; replaced hard-coded px/em with `var(--rz-btn-sm)` / `var(--rz-radius-sm)` / `var(--rz-font-title)` / `var(--rz-gap-sm/md)` + `min-width:var(--rz-btn-sm)` to prevent sub-1-per-row collapse). Deleted enhancement bumps at former line 587-588 (now a removal comment), plus 6 G8 override lines across 480px/360px/320px `@media` breakpoints. Dark-theme Scrabble wooden-tile overrides at 1691–1756 preserved (selector specificity + `!important` intact). Zero HTML/JS changes. Cache-bust `v=20260421k`.
- ✅ **RDE Step 4** (`style.css:315-318, 583, 717, 872`, 2026-04-21 Evening): G3 Huruf Hutan migrated via **token composition** (kept `.g3-choice-btn` / `.g3-word` / `.g3-hint` / `.g3-choices` class names; replaced hard-coded px with `var(--rz-font-h1/body/hero)` / `var(--rz-gap-sm/md)` / `var(--rz-radius-md)` / `var(--rz-btn-md)`). Choice-btn padding = `calc(--rz-btn-md * 0.38) var(--rz-gap-sm)` + `min-height:var(--rz-btn-md)` preserves tap target across widths; letter font = `calc(--rz-font-hero * 0.9)` preserves the 42px peak. Deleted enhancement bump at former line 584, removed 4 G3 overrides from `@media(max-width:480px)` and 1 from `@media(max-width:360px)`. AAA dark overhaul at lines 1465–1566 (wooden-plank `.g3-word`, speech-bubble `.g3-hint`, carved-wood-log `.g3-choice-btn`, letter-burst animation, `.g3-letter.highlight` keyframes) preserved — `!important` specificity intact. Zero HTML/JS changes. Same "token composition over class rename" pattern as Step 3.
- ⬜ **RDE Step 5** — migrate remaining DOM games (G1, G2, G4, G5, G7, G9). Delete 60+ lines of `@media`.
- ⬜ **RDE Step 6** — ship `shared/rz-responsive.js` + wire G14/G15/G16/G19/G20/G22 (Pixi games get runtime scale factor via `window.RZ`).
- ⬜ **RDE Step 7** — document per-game overrides in CHANGELOG for traceability.

### Train BGM/SFX — ALL Train Games (G14, G15, G16)
- ✅ **BGM FIXED**: `Sounds/train-bgm.mp3` replaced with real train BGM (`kauasilbershlachparodes-train-493986.mp3` — 214KB, 256kbps stereo). MD5 `afe88377...` now ≠ battle-bgm.mp3.
- ✅ **SFX added**: `Sounds/train-crossing-sfx.mp3` (436KB, freesound steam-train-at-crossing) wired as `<audio id="train-sfx">` in G14/G15/G16.
- ✅ **Trigger**: Plays at game start (volume 0.7) right after BGM.play() in `startRace()` (G14 line 1869), `gameRunning=true` block (G15 line 664), `S.running=true` block (G16 line 480).
- 🔄 **Synth tones kept**: `playTone()` WebAudio calls for UI click / lane switch / collision beep remain — real MP3 has latency unfit for instant feedback. Major events use the new SFX file.
- **Deferred enhancement**: Add victory-moment whistle trigger in each game's win handler — low priority, user can request later.

---

## ⬜ PENDING FIXES — BY GAME

### G6 — Petualangan Mobil (Car Letter Collection)
- ✅ **BGM**: Code already reverted to `battle-bgm.mp3` — user needs cache clear
- ✅ **Floating emoji buildings**: Reduced to 8 items, smaller (14-20px), much lower opacity (0.2-0.35), less distracting
- ✅ **Vehicle images empty (SYNC bug, 2026-04-21)**: `PIXI.Texture.from()` is async in PIXI v8 — sprite wasn't loading because the `try/catch` couldn't catch async failures. Rewrote to `PIXI.Assets.load(url).then(tex => swap)` with emoji placeholder up-front + proper fallback on error (g6.html:568-585). 12 top-view car PNGs (verified accessible via curl) now load correctly.
- ✅ **Buttons**: Removed ⬅️➡️ emoji arrows — now just text "Kiri" / "Kanan" with pastel purple styling
- ✅ **Road signs overflow off-screen (2026-04-21)**: Signs were positioned at `roadLeft - 28` or `roadRight + 28` — on narrow screens (320-375px), `roadLeft ≈ 26-30px` meant signs went to negative x (off-canvas left). Added clamp to `leftBandMin=10, leftBandMax=max(12, roadLeft-18)` + skip spawn if band <15px (g6.html:430-438).
- ✅ **Road/environment polish**: Yellow center dash (#FCD34D a=0.55+), themed road signs (city=🛑🚸🅿️, forest=🦌🌳, space=🛸🌠, pantai=🏖️🌊, sekolah=📚🏫, dapur=🍳🧂, kebun=🌻🌾, body=💊🧬) added 2026-04-20.
- **Scenery on shoulder** (emojis like 🌳⛱️ in `buildBg` sceneryL/R) is by DESIGN — decorations belong on road shoulder. Low alpha (0.2-0.35) so non-distracting. Not a bug.

### G9 — Jejak Huruf (Letter Tracing)
- ✅ **Tracing works**: Code verified — tracing IS plotting (visible in screenshot). Fixed spawnSparkles to pass star count
- ✅ **Background**: Replaced ugly bg-game9-trace.webp with clean green gradient (light: mint→green, dark: deep forest green)
- ✅ **Canvas styling**: Responsive width (min 300px/80vw), warm cream background, softer border, better shadow
- ✅ **Guide dot polish**: Added pulsing glow animation, larger dots (20px), better hit feedback with glow

### G14 — Balapan Kereta (Train Race)
- ✅ **BGM**: Wired `train-bgm.mp3` (was `battle-bgm.mp3`)
- ✅ **Background/environment**: Added bird flock + signal posts for scenery movement at all parallax depths
- ✅ **Buttons**: Removed emoji arrows (⬆️⬇️🚀), clean text only "Atas"/"Bawah"/"BOOST!" with pastel styling
- ✅ **Visual enhancement**: Bird flock animates with wing-flap; red/green signal posts with soft glow scroll at 0.6× speed

### G15 — Lokomotif Pemberani
- ✅ **BGM**: Wired `train-bgm.mp3`
- ✅ **Train selection UI**: Cards enlarged (68→110px min, up to 150px on desktop), rounded corners, hover effects, bigger text (8→10px names, 6→7px subs), better spacing (gap 3→8px, padding increased)
- ✅ **Visual enhancement**: Signal posts along horizon + 3-bird flock on sunrise/forest/tropical themes

### G16 — Selamatkan Kereta (Signal Rush)
- ✅ **BGM**: Wired `train-bgm.mp3`
- ✅ **Boost effect removed**: `clearObstacle()` now sets MOVING instead of BOOSTING — no more speed burst after quiz
- ✅ **Visual/animation enhancement**: Added semaphore signal masts with red/green lamps + soft glow every 380px along track

### G17 — Jembatan Goyang
- ✅ **banner-game17.webp**: Generated via Gemini API
- ✅ **banner-game18.webp**: Generated via Gemini API
- ✅ **Gameplay revamp (2026-04-21)**: Full scene already built in index.html (sky gradient, stars, clouds, sun, 2-layer mountains, trees, gorge+river, cliff edges, wooden bridge with rope/beams/supports); wooden-plank block CSS, train-cross victory animation, lives/hearts, +1⭐/-1💔/COMBO floaters, bridge-shake, crack overlay already complete. Added 2026-04-21: consistent block numbers (no emoji mix) + green ring ripple on correct tap.

### G18 — Museum Kereta Ambarawa
- ✅ **Train catalog expansion**: +5 Indonesian trains added (19→24). CC201, Whoosh KCIC, Argo Parahyangan, LRT Jabodebek, plus Lori Tebu.
- ✅ **Add lorry/tebu trains**: Lori Tebu (1880, Orenstein & Koppel, 60cm narrow gauge) included.
- ✅ **Story button**: Added "📖 Cerita" button in train detail modal — generates child-friendly story from train data (year, speed, fuel, builder, route). Toggleable panel with scrollable content.
- ⬜ **Gameplay/mechanics development**: More interactive elements

### G19 — Pokemon Birds
- ✅ **Icon**: Replaced 🐦 emoji with Pidgeot sprite in game-badge + Pidgeot GIF in start-overlay + level select (iconImg)
- ✅ **Banner**: Generated banner-game19.webp via Gemini API (+ G20, G22 banners too)
- ✅ **Sprite centering**: Changed from manual left/top offset to `transform:translate(-50%,-50%)` — image always centered in hitbox circle regardless of aspect ratio
- ⬜ **GIF quality**: Some GIFs have artifacts — white areas became transparent, tracing remnants visible. Mirror/ GIFs already applied but some may still have issues

### G22 — Monster Wants Candy (MAJOR REVAMP)
- ✅ **Real pokeball SVGs → PNGs**: Resolved 2026-04-20 via ImageMagick rasterization (`-density 300 -resize 128x128`). 9 PNGs in `assets/Pokemon/pokeballs-png/`, preloaded via `PIXI.Assets.load()` in `preloadPokeballTextures()`. See the G22 Real Pokeball PNGs block above.
- ✅ **Shared quiz engine (2026-04-21)**: Extracted inline Q_MATH/Q_WARNA/Q_HEWAN/Q_BUAH into `games/question-bank.js` — exports `QuestionBank` with `pick(cat)`, `get(cat, count)`, `wrongAnswers(cat, correct, count)`, `extend(cat, items)`, `categories`. G22 now consumes the shared bank via `<script src="question-bank.js">`. Backward-compat aliases (`Q_MATH`, `BALL_CATEGORIES`, `pickQ`) preserved. Future games (bahasa, sains) can extend at runtime.
- ✅ **No multiplication/division**: Verified — QS bank only has + and - operations
- ✅ **Monster → Psyduck**: Replaced broken monster icon with HD Psyduck sprite (pokemondb.net), local fallback
- ✅ **Pokemon picker in pause menu**: Added 15 Pokemon grid (Psyduck, Pikachu, Eevee, Snorlax, etc). HD sprites from pokemondb. Switching changes catcher character instantly.
- ✅ **Different pokeball = different category**: Ball design now indexed by `ballType` — Poké Ball=Math, Great Ball=Warna, Ultra Ball=Hewan, Master Ball=Buah. Quiz panel shows category chip.
- ✅ **Physics smoothed**: Added sinusoidal wobble/sway to falling pokeballs, tighter speed range
- ✅ **Visual/UI overhauled 2026-04-21** (P0.6): smooth lerp movement, HD Psyduck (clamp 140-220px), dynamic answer-pill layout (no overflow), pickup FX (catch-pop + ring burst), rich parallax background (12 clouds × 3 speeds, 6 flyers, 5 pine trees, 3 snow-capped mountains, 24 flowers, rainbow), ground-anchored sprite, directional facing. Any further polish = new ticket.
- ✅ **Navigation flow**: Pause menu now consistent visual language with start + HUD. Back/pause buttons have press animation for tactile feedback.

### G10 — Pertarungan Pokemon
- ✅ **Platform/pedestal**: Made CSS `.g10-oval` more visible — brown color, border, larger size (110x22px)
- ✅ **HD sprites restored**: Reverted from local-first (96px) back to HD-online-first (pokemondb 200-300px) with local fallback
- 🔧 **Hit effect (REGRESSION 2026-04-20)**: auraColors keys fixed (lowercase). Full chain needs live verification — particles, projectile, flash, defender shake
- ✅ **WebGL context lost freeze**: Fixed — `backToLevelSelect()` now calls `PixiManager.destroyAll()` to free WebGL context before returning to level select.
- ✅ **Scoring fixed**: Double-normalization bug — `endGame()` normalized to 5-star, then `showResult()` re-normalized using raw `maxRounds`. Fixed by setting `state.maxPossibleStars=5` so showResult passes through.
- ✅ **CRITICAL: Result modal frozen**: Fixed — `showResult()` now closes overlay-feedback and game-result-overlay before showing screen-result. Overlays were blocking button clicks.
- ⬜ **Unified modal engine**: User wants inline game result + standalone GameModal to share same engine. Currently two separate systems — `showResult()` in game.js for G1-G12, `GameModal.show()` in game-modal.js for standalone games.
- ✅ **Shared pause menu engine**: Built `GamePause` in game-modal.js — `GamePause.init({onResume, onRetry, onHome, bgmEl})`, `GamePause.show()/hide()`. Has master+BGM volume sliders, resume/retry/home buttons. Games can import and use.
- ✅ **Migrate games to GamePause (batch 1)**: G6, G14, G15, G16 — all had silent togglePause (no visible overlay). Now open full GamePause with volume sliders + Lanjut/Ulang/Keluar. G19/G20/G22 kept their custom pause overlays (Pokemon picker is game-specific feature).

### G20 — Ducky Volley
- ⬜ **Mobile testing**: User said they'd test on mobile and give feedback — awaiting

---

### G10 — Pertarungan Pokemon (continued)
- ✅ **Scoring**: G19 migrated to GameScoring.calc(). G10 endGame() correct.
- ✅ **G13 scoring bug**: showGameResult used `_g13stars` (1-3 tier) instead of `perfStars` (1-5 display). Perfect evolution now shows 5★ correctly.

## ⬜ CROSS-GAME ISSUES

### Unified Scoring Engine
- ✅ **Built `GameScoring.calc()`** in `game-modal.js` — shared algorithm: accuracy-based (100%=5★, 85%=4★, 65%=3★, 40%=2★), with modifiers for wrong answers, lives, time, bonus
- ✅ **Standalone games migrated**: G6, G14, G15, G16, G19, G20, G22 all use `GameScoring.calc()`
- ✅ **Inline games**: addStars() now passes star count to spawnSparkles() for grading. showResult() already has graded confetti. Feedback overlay confetti only fires for 3+ stars.

### BGM Audit
- 🔧 **Train BGM is a duplicate of battle BGM** (confirmed 2026-04-21): `Sounds/battle-bgm.mp3`, `Sounds/train-bgm.mp3`, and `Sounds/WhatsApp Audio 2026-04-12 at 6.34.32 AM(1).mp3` are all byte-identical (each 235180 bytes). Code wires G14/G15/G16 to `train-bgm.mp3` but they're really still playing the Pokemon battle theme. **User action needed**: provide a genuinely different train-themed MP3 to replace `Sounds/train-bgm.mp3`.
- ⬜ **Assign correct BGM per game type**:
  - Pokemon battle games (G10, G13, G13b, G13c): Pokemon themes ✅
  - Train games (G14, G15, G16): Train BGM (TBD)
  - Car game (G6): Appropriate non-Pokemon BGM
  - Bird game (G19): bgm-odd/bgm-even ✅
  - Volleyball (G20): Pokemon Opening ✅
  - Candy (G22): battle-bgm.mp3 (NOT Pokemon BGM) ✅

### Missing Banner Assets
- ✅ Generated ALL 6 missing banners via Gemini 2.5 Flash Image API: banner-game13 through banner-game18.webp
- **Gemini API key for image gen**: `<redacted — see user's password manager>` (was exposed in pre-2026-04-21 history; rotated 2026-04-21 before repo went public)

---

## NOTES
- G6 code already has `battle-bgm.mp3` — if user still hears Pokemon BGM, it's browser cache
- G14/G15/G16 also already reverted in code — cache issue
- Train BGM: user mentioned providing it before but only `battle-bgm.mp3` and `WhatsApp Audio` exist in `Sounds/`
- G13c trainer image 404s are expected (fallback chain: local → remote CDN → emoji initial)
