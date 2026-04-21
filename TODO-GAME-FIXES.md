# Dunia Emosi — Game Fixes & Enhancements TODO
> This file tracks ALL pending game issues. Claude reads this at session start.
> Mark items ✅ when done. Add new issues at the bottom.

## Status Legend
- ⬜ = Not started
- 🔧 = In progress
- ✅ = Done
- ❌ = Won't fix / Not applicable

---

## ✅ COMPLETED 2026-04-21 — Battle Standards + HD Sprites + G22 + Repo Migration

- ✅ **P0 — HD sprite cascade** (game.js 5005/5012-5014/5391-5404): `pokeSpriteOnline()` now returns HD CDN; `pokeSpriteVariant()` prefers SVG → HD CDN; G10 player/enemy loaders use the HD-first cascade with low-res PNG only as offline fallback; `image-rendering:pixelated` killed.
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
- 🔧 **REMAINING**: Full live-test to confirm all 8 effect stages visible (audio → aura → name popup → lunge → particles → projectile → screen flash → shake)

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

## ⬜ PENDING FIXES — BY GAME

### G6 — Petualangan Mobil (Car Letter Collection)
- ✅ **BGM**: Code already reverted to `battle-bgm.mp3` — user needs cache clear
- ✅ **Floating emoji buildings**: Reduced to 8 items, smaller (14-20px), much lower opacity (0.2-0.35), less distracting
- ✅ **Vehicle images empty**: Fixed URL encoding — spaces in path `car and vehicle` → `car%20and%20vehicle`
- ✅ **Buttons**: Removed ⬅️➡️ emoji arrows — now just text "Kiri" / "Kanan" with pastel purple styling
- ⬜ **Overall visual quality**: Road, environment, obstacles need more detail and polish

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
- ⬜ **Gameplay revamp**: User says "gameplay sangat jelek" — needs visual, UI/UX, mechanics, animation overhaul

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
- 🔧 **Real pokeball SVGs**: SVGs not rendering — PixiJS v8 may not load SVG via Sprite.from(). Need to use PIXI.Assets.load() or convert to PNG. Falling back to Graphics for now with distinct colors per ball type.
- ⬜ **Quiz engine**: Don't create inline questions. Use shared question bank (300+ questions in game.js). Build shared quiz engine that G22 and other games can use. Categories: math (easy), bahasa, sains, etc.
- ✅ **No multiplication/division**: Verified — QS bank only has + and - operations
- ✅ **Monster → Psyduck**: Replaced broken monster icon with HD Psyduck sprite (pokemondb.net), local fallback
- ✅ **Pokemon picker in pause menu**: Added 15 Pokemon grid (Psyduck, Pikachu, Eevee, Snorlax, etc). HD sprites from pokemondb. Switching changes catcher character instantly.
- ✅ **Different pokeball = different category**: Ball design now indexed by `ballType` — Poké Ball=Math, Great Ball=Warna, Ultra Ball=Hewan, Master Ball=Buah. Quiz panel shows category chip.
- ✅ **Physics smoothed**: Added sinusoidal wobble/sway to falling pokeballs, tighter speed range
- 🔧 **Visual/UI very ugly**: Significant pass done — start overlay (glassmorphism card + radial accent pools + floating icon), pause overlay (matching card style + glow pause icon), HUD (gold glow score, pill badge, glass buttons). Full major-UI-elements revamp may need reference image from user for further polish.
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
- ⬜ **Find/identify train BGM**: User says they provided train-specific BGM previously. Check `Sounds/` directory and conversation history. The `WhatsApp Audio` file in Sounds/ might be it.
- ⬜ **Assign correct BGM per game type**:
  - Pokemon battle games (G10, G13, G13b, G13c): Pokemon themes ✅
  - Train games (G14, G15, G16): Train BGM (TBD)
  - Car game (G6): Appropriate non-Pokemon BGM
  - Bird game (G19): bgm-odd/bgm-even ✅
  - Volleyball (G20): Pokemon Opening ✅
  - Candy (G22): battle-bgm.mp3 (NOT Pokemon BGM) ✅

### Missing Banner Assets
- ✅ Generated ALL 6 missing banners via Gemini 2.5 Flash Image API: banner-game13 through banner-game18.webp
- **Gemini API key for image gen**: `REDACTED`

---

## NOTES
- G6 code already has `battle-bgm.mp3` — if user still hears Pokemon BGM, it's browser cache
- G14/G15/G16 also already reverted in code — cache issue
- Train BGM: user mentioned providing it before but only `battle-bgm.mp3` and `WhatsApp Audio` exist in `Sounds/`
- G13c trainer image 404s are expected (fallback chain: local → remote CDN → emoji initial)
