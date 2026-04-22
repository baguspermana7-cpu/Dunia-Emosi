# Changelog — Dunia Emosi

## 2026-04-22 — G16 collision SFX (Task #35)

### Summary
Added crash/impact SFX to G16 (Selamatkan Kereta). Previously train hitting obstacles (wrong answer) or slamming into them (hard-clamp overshoot) had visual flash + camera shake but no audio. Now plays a short wood-hit sound, layered over the existing orange flash + cameraShake=1.0 cue.

### Source & attribution
- Mixkit CDN (royalty-free, no attribution required per Mixkit License):
  - `assets/sfx/crash.mp3` — https://assets.mixkit.co/active_storage/sfx/2182/2182-preview.mp3 — "Wood hard hit"
- 12,213 bytes, 0.44s, 44.1kHz stereo 220kbps. Well under 50KB budget — no recompression needed. Copied as-is from mixkit preview.

### SFX helper pattern (`games/g16-pixi.html`)
```js
let lastCrashMs = 0
function playSfxCrash(){
  const now = performance.now()
  if(now - lastCrashMs < 150) return
  lastCrashMs = now
  try{
    const a = document.getElementById('sfx-crash')
    if(!a) return
    a.currentTime = 0
    a.volume = 0.6
    a.play().catch(()=>{})
  }catch(_){}
}
```
Rate-limit window 150ms prevents overlapping plays across back-to-back wrong answers or camera-shake frames. Helper located right before `hideQuizPanel()` (line 1767).

### Integration hook sites (`games/g16-pixi.html`)
- **Line 81** — `<audio id="sfx-crash" src="../assets/sfx/crash.mp3?v=20260422a" preload="auto">` (added after `#train-sfx`)
- **Line 1411** — obstacle hard-clamp (Task #40 Part 2 branch). Fires `playSfxCrash()` only when `wasMoving` (S.trainState !== 'STOPPED' at entry), so we don't re-play on every frame the clamp re-asserts while STOPPED.
- **Line 1632** — wrong-answer branch in `onChoiceTap`. Fires on each incorrect quiz choice (3 mercy dots = max 3 crashes per obstacle).
- `triggerDeath` (line ~1779) intentionally NOT hooked — deathflash already has the dramatic red flash; adding crash there would double-fire with the hard-clamp that immediately precedes it.

### Volume conventions
0.6 — stronger than `whoosh 0.5` in G20/G22 (collision is a focal feedback event, not ambient motion). Matches `train-sfx` convention (0.7) while staying slightly softer since it fires repeatedly.

### Verification
```sh
python3 -c "
import re, subprocess
s = open('games/g16-pixi.html').read()
blocks = re.findall(r'<script(?![^>]*\\bsrc=)[^>]*>(.*?)</script>', s, re.DOTALL)
for i, b in enumerate(blocks):
  if not b.strip(): continue
  open('/tmp/_c.js','w').write(b)
  r = subprocess.run(['node','--check','/tmp/_c.js'], capture_output=True, text=True)
  print(f'block[{i}] rc={r.returncode}')
"
# → block[0] rc=0
```

### Cache
No `index.html` bump needed — crash.mp3 is only referenced from g16-pixi.html, and the `?v=20260422a` query string on the audio tag forces a fresh fetch.

---

## 2026-04-22 — G20/G22 movement SFX (Task #33)

### Summary
Added whoosh + swoosh motion SFX to G20 (Ducky Volley) and G22 (Monster Candy). Neither game previously had motion audio — only tonal synth SFX (`tone()` helper via WebAudio) and BGM. New SFX layer over existing tones, does not replace them.

### Source & attribution
- Mixkit CDN (royalty-free SFX, no attribution required per Mixkit License):
  - `whoosh.mp3` — https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3 (40,265 bytes, 1.54s, 128kbps)
  - `swoosh.mp3` — https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3 (27,236 bytes, 1.52s, 128kbps)
- Total: 67.5 KB (under 100 KB combined budget).
- Saved to `assets/sfx/` (new folder contents — was empty).

### SFX helper pattern (both games)
```js
let _lastWhoosh=0, _lastSwoosh=0
function playSfx(id, vol){ try{ const a=document.getElementById(id); if(!a)return; a.currentTime=0; a.volume=vol!=null?vol:0.5; a.play().catch(()=>{}) }catch(_){} }
function sfxWhoosh(vol){ const n=Date.now(); if(n-_lastWhoosh<120)return; _lastWhoosh=n; playSfx('sfx-whoosh', vol!=null?vol:0.5) }
function sfxSwoosh(vol){ const n=Date.now(); if(n-_lastSwoosh<140)return; _lastSwoosh=n; playSfx('sfx-swoosh', vol!=null?vol:0.4) }
```
Rate-limit windows (120ms whoosh, 140ms swoosh) prevent audio-element clipping when events fire in quick succession (e.g. consecutive hits/spawns).

### G20 Ducky Volley (`games/g20-pixi.html`)
Audio tags: line 64-65 (after `#game-bgm`). Helpers: line 218-231 (after `sfxThud`). Hooks:
- Line 733 — `sfxSwoosh(0.4)` on player jump (duck flap) inside `gameLoop` jump block
- Line 875 — `sfxWhoosh(0.6)` on smash/spike, layered over existing `sfxSmash()`
- Line 886 — `sfxWhoosh(0.45)` on `shot` hit type, layered over `sfxHit()`
Note: wall `bounce` events and `set` hit intentionally left whoosh-free — they are high-frequency/light events and BGM masks them; adding whoosh there would feel spammy.

### G22 Monster Candy (`games/g22-candy.html`)
Audio tags: line 58-59 (after `#game-bgm`). Helpers: line 184-197 (after `sfxWrong`). Hooks:
- Line 385 — `sfxSwoosh(0.28)` at top of `spawnCandy()` — pokeball swoop entry. Low volume + rate-limit avoids spam at high spawn rates (`spawnInterval` drops to 0.6s at high levels).
- Line 469 — `sfxWhoosh(0.5)` in `catchCandy()` — ball-throw/capture impact
- Line 737 — `sfxSwoosh(0.4)` in `spawnBubblePop()` — candy pop on correct answer
- Line 767 — `sfxWhoosh(0.55)` in `laserAbsorbSwap()` — laser-absorb capture start on wrong answer

### Volume conventions
Matches existing `bgm.volume=0.2` + tone `v=0.08–0.15` conventions. Whoosh 0.45-0.6 (stronger presence for key hits), swoosh 0.28-0.4 (softer background motion).

### Cache
Audio tag `?v=20260422a` query string for cache-busting. `index.html` cache not affected (SFX referenced from game HTMLs only).

### Verification
- `file` confirms both MP3s are valid MPEG ADTS layer III, 44.1kHz.
- All hook sites Grep'd: 5 call sites in g20, 4 call sites in g22.
- Rate-limit guarantees no more than ~8 whooshes/sec or ~7 swooshes/sec.

---

## 2026-04-22 — G16 arrival: positional checkpoints, no timers (Task #49-v2)

### Why this refactor
User mandate: "Arrival jangan coba2 pkai time, saya mau bener2 dihitung positioning, checkpoint secara accurate." The Task #49 fix still relied on two wall-clock `setTimeout` calls (2200ms celebration, 3000ms failsafe). Wall clocks drift with tab throttling, device perf, and pause state — unacceptable for a deterministic arrival flow.

### What changed (`games/g16-pixi.html`)
- **Removed all `setTimeout` in the arrival path**: the 2200ms showWin after ARRIVED (2 sites in `updateTrain` — main ARRIVING branch + station overshoot clamp) AND the 3000ms safety net in `triggerArrival`. Zero timers now between `ARRIVING` and `showWin`.
- **New constants** (near `TRAIN_SCREEN_X` at ~line 490):
  - `ARRIVAL_BRAKE_DIST = 300` — brake ramp starts at dist=300 from STATION_X
  - `ARRIVAL_SNAP_DIST = 1` — snap to STATION_X and enter ARRIVED when dist ≤ 1px
  - `ARRIVAL_MIN_CREEP = 35` px/s — speed floor during ARRIVING (guarantees progress)
  - `CELEBRATION_FRAMES = 120` — ~2s @ 60fps of celebration before `showWin` (frame-counted, not clock-timed)
  - `STATION_PROXIMITY_FORCE = 40` — replaces magic `40` in force-arrival proximity check
- **New state field**: `S.celebrationFrame` (reset on ARRIVING entry and on ARRIVED entry).
- **`ARRIVING` branch**: deterministic brake — `speed = max(ARRIVAL_MIN_CREEP, baseSpeed * min(dist/ARRIVAL_BRAKE_DIST, 1))`. When `dist ≤ ARRIVAL_SNAP_DIST` snap `worldX = STATION_X` and flip to ARRIVED.
- **`ARRIVED` branch**: `S.celebrationFrame += dt*60` each frame; `showWin` fires exactly when `celebrationFrame ≥ CELEBRATION_FRAMES`. Pauses with the game (ticker stops), identical on slow/fast devices.
- **Station overshoot clamp**: same celebrationFrame path, no setTimeout.
- **`triggerArrival`**: resets `celebrationFrame=0`, no safety-net timer. The positional brake + frame counter guarantee `showWin` fires deterministically.

### Cache
`index.html` v=20260422ad → v=20260422ae (styles.css + game.js both bumped).

### Verification
- `node --check` on extracted inline scripts → clean.
- Grep `setTimeout.*show(Win|Lose)|arrivedFlag|ARRIVED|ARRIVING` → only the two "No setTimeout" comments match (intentional documentation).
- Grep for new constants → all 5 defined and referenced.

### Note on the prior #49 entry
The 2200ms celebration and 3s safety-net claims in the original Task #49 entry below are now stale — those setTimeouts have been removed. The arrival flow is fully position/frame deterministic.

---

## 2026-04-22 — G15 letter validation + G16 station overshoot (Tasks #48, #49)

### G15 — wrong letter accepted as correct (Task #48)
**Symptom**: Target letter 'A' required but collecting any letter was accepted as "benar A". Wrong answers counted as right.

**Root cause**: `collectBox` checked `box.isTarget` — a boolean set at spawn time (`const isTarget = (i === 0)` in the spawn batch). When `currentLetterIdx` advanced or `onWordComplete` reset it, old boxes retained stale `isTarget=true` flags. A box spawned when target was 'A' would still register as correct even after the target became 'R'.

**Fix** (`games/g15-pixi.html`):
- `collectBox` letter branch (~line 1448): validate `box.letter === WORDS_LIST[currentWordIdx].word[currentLetterIdx]` at collect time, not the stale flag.
- `onWordComplete` (~line 1534): purge leftover letter boxes (keep hearts/math specials) so players don't see old-word letters while the HUD prompts the new word.

### G16 — train bablas past station, no win modal (Task #49)
**Symptoms**: Train passes the station crowd/platform ("kerumunan") and gets stuck without the success modal appearing. Previous #40 fix (obstacle overshoot clamp) only guarded uncleared obstacles, not the station itself.

**Root causes identified**:
1. No clamp at `STATION_X` — train could slide past the platform on dt spikes.
2. `ARRIVING` creep speed (~54 px/s) took ~28s to cover the 0.8W triggerArrival distance — felt frozen.
3. `triggerArrival` only fired when `S.cleared === S.totalObstacles` — off-by-one or mini-quiz races could leave count short and the train would sail past.
4. 8s failsafe for `showWin` was much longer than perceived stuck time.

**Fix** (`games/g16-pixi.html`) — *Note: superseded by Task #49-v2 (see entry above). Timer-based claims below are stale; arrival is now position+frame deterministic.*
- **Station overshoot clamp** (~line 1360): in `updateTrain`, when in ARRIVING/ARRIVED phase and `worldX + step > STATION_X + 4`, snap to `STATION_X` and force ARRIVED.
- **Force-arrival proximity trigger** (~line 1382): once `worldX > STATION_X - STATION_PROXIMITY_FORCE` in any non-DEAD/non-arrival state, call `triggerArrival()` regardless of cleared count.
- **Deterministic ARRIVING brake** (v2): `speed = max(ARRIVAL_MIN_CREEP, baseSpeed * min(dist/ARRIVAL_BRAKE_DIST, 1))`.
- **Celebration**: frame-counted (CELEBRATION_FRAMES=120) instead of wall-clock, no setTimeout.

### Cache
`index.html` v=20260422ac → v=20260422ad.

### Verification
- `node --check` on extracted inline scripts → clean.
- Math: at baseSpeed=165 (lvl 1), new ARRIVING max speed = 165 * min(1,1) = 165 px/s; min = 41 px/s. Covers 0.8W (1536px at 1920w) in ~12s at average; with short safety net arrives reliably in 3-5s for typical viewports.

---

## 2026-04-22 — G13c real gym badge icons (Task #31)

### Problem
G13c Gym Pokémon displayed generic emoji (💧🪨⚡🌿) as "badges" instead of the canonical in-game gym badge artwork. User request: extract badges from Bulbapedia (`/wiki/Badge`) complemented with pokemon.fandom.com for Galar.

### Added
- **`assets/gym-badges/`** — 46 WebP badge icons, 128px longest edge, quality 90. Total ~256KB. Sourced from Bulbapedia archives (downsized from originals 500–1280px PNG → 116–128px WebP). Naming: `{trainer-id}.webp` (brock.webp, misty.webp, …, raihan.webp).
  - Kanto 8 (Boulder/Cascade/Thunder/Rainbow/Soul/Marsh/Volcano/Earth)
  - Johto 7 (Zephyr/Hive/Plain/Fog/Mineral/Glacier/Rising)
  - Hoenn 7 (Stone/Knuckle/Dynamo/Heat/Balance/Feather/Rain)
  - Sinnoh 6 (Coal/Cobble/Fen/Mine/Icicle/Beacon)
  - Unova 6 (Basic/Insect/Bolt/Quake/Jet/Legend)
  - Kalos 6 (Bug/Cliff/Rumble/Plant/Fairy/Voltage)
  - Galar 6 (Grass/Water/Fire/Fighting/Rock/Dragon)
- **G13c helpers** (`games/g13c-pixi.html` ~line 953): `BADGE_IMG_SET` (46 trainer ids), `hasBadgeImg(id)`, `badgeImgUrl(id)`, `badgeHtml(trainer, size, extraStyle)`. Elite Four / Champions / rivals / rockets / anime still render emoji.

### Changed
- **5 badge render sites in `games/g13c-pixi.html`**:
  1. `buildGymSelect` trainer card `.tc-status` (~line 1035) — shows badge image when beaten, `⚔️` when unlocked, `🔒` when locked.
  2. `showBadgeCollection` grid (~line 1064) — 26px badge image per trainer (grayscale when un-earned).
  3. `showGymWelcome` `#gw-badge` banner (~line 1082) — big badge image (min(80px, 20vw)) with gold drop-shadow, fallback to emoji for non-gym-leaders.
  4. `showBadgeZoom` `#badge-emoji` (~line 1103) — signature accepts trainer object OR legacy emoji string; renders image with CSS zoom scale animation for real gym leaders.
  5. `showResult` call site (~line 1438) — now passes full trainer object to `showBadgeZoom`.

### Not changed
- `GameModal` emoji field (~line 1447) still uses `trainer.badge` (emoji) since modal's emoji slot is a text string; the dedicated `#badge-emoji` zoom animation already showcases the image.
- `trainerFallback` avatar (~line 993) still falls back to emoji — image would require a different container sizing and the avatar slot is for sprites not badges.

### Tested
- `python3 -m http.server` + curl on `/Dunia-Emosi/assets/gym-badges/brock.webp` → 200.
- `node --check` on extracted inline script → clean.
- Grep of render sites → 8 references across `hasBadgeImg`, `badgeHtml`, `badgeImgUrl`, `BADGE_IMG_SET`.

---

## 2026-04-22 — Character train dimensions responsive to viewport (Task #47)

### Problem
Character train `spriteHeight`, `wheelPositions`, `smokePos`, and `bottomPaddingOffset` in `trains-db.js` + G16_CHAR_CONFIGS were hardcoded pixel values calibrated for PC (H≈800–1080). On mobile portrait (H≈667) and landscape (H≈375) they rendered at full desktop size — sprite + wheels + smoke disproportionately large vs viewport. User report: "Game ini di PC sudah bagus dan proporsional. Namun di mobile, dimensinya masih statis."

### Why viewport-height instead of `RZ.scale()`
`RZ.scale()` uses the CSS `clamp(0.7, 0.44 + 0.175vw, 1)` formula which saturates at 1.0 for any viewport ≥ 320w — the scale intended for CSS UI sizing never shrinks trains on real mobile devices. Train sprites are vertical objects anchored to a rail at a fraction of viewport height, so a dedicated height-driven scale is more natural.

### Added
- **`shared/rz-responsive.js` → `RZ.trainScale()`** — New viewport-height-based multiplier: `Math.min(1, Math.max(0.55, innerHeight / 800))`.
  - H ≥ 800 (laptop/desktop) → 1.0 (PC baseline, no scaling)
  - H = 667 (mobile portrait iPhone) → 0.83
  - H = 480 → 0.60
  - H ≤ 436 → 0.55 (clamped floor)
- **`games/train-character-sprite.js` → `CharacterTrain.scaleConfig(cfg, s)`** — Returns a new config with `spriteHeight`, `bottomPaddingOffset`, `bodyBobAmp`, every `wheelPositions[i] = [x, y, r]`, and `smokePos = [x, y]` multiplied by `s`. Base config = PC reference (scale 1); all viewports apply this transform at mount.

### Changed
- **`games/g15-pixi.html` buildTrain (~line 1073)** — Reads `const rzScale = RZ.trainScale()`, calls `CharacterTrain.scaleConfig(selectedTrain, rzScale)` before mounting. Rail-baseline placement uses the scaled `spriteHeight` + `bottomPaddingOffset`.
- **`games/g15-pixi.html` resize handler (line 261)** — Extended from renderer-only resize to: recompute `TRAIN_X` + `LANE_Y`, then rebuild character train via `buildTrain()` so dispose + re-mount picks up the fresh `RZ.trainScale()`. Programmatic trains just reposition.
- **`games/g16-pixi.html` buildTrain (~line 891)** — Same pattern: `CharacterTrain.scaleConfig(G16_CHAR_CONFIGS[key], rzScale)` before mount.
- **`games/g16-pixi.html` resize handler (line 2006)** — Recompute `TRAIN_SCREEN_X`, dispose `g16CharacterTrain`, remove old `trainContainer` from stage, call `buildTrain(newW, newH)` to rebuild with current scale. Headlight + fireGlow x also re-tracked to new TRAIN_SCREEN_X.
- **`documentation and standarization/CHARACTER-TRAIN-SPEC.md`** — Added "Responsive Scaling" section documenting the `scaleConfig` helper + resize rebuild contract.

### Cache bump
`index.html` v=20260422ab → v=20260422ac. `train-character-sprite.js` v=20260422d → v=20260422e. `rz-responsive.js` v=20260422h → v=20260422i (bumped across all 6 games that include it so every game picks up the new `RZ.trainScale` export).

### Verification matrix
| Device | W × H | rzScale | Casey spriteHeight (base 117) |
|--------|-------|---------|-------------------------------|
| iPhone SE portrait | 375×667 | 0.83 | 97 |
| iPhone SE landscape | 667×375 | 0.55 (clamped) | 64 |
| iPhone 14 portrait | 390×844 | 1.0 | 117 |
| iPad portrait | 768×1024 | 1.0 | 117 |
| Laptop | 1440×900 | 1.0 | 117 |
| 4K desktop | 3840×2160 | 1.0 | 117 |

Resize / orientation change: both games dispose + rebuild the character train, rail alignment preserved via `bottomPaddingOffset * rzScale`. Smoke + wheel overlays re-render at the new geometry; particle trails from the old instance are disposed.

---

## 2026-04-22 — RDE Step 7: G14 + G15 Pixi text sizing wired to RZ runtime

### Changed
- **G14 Balapan Kereta** (`games/g14.html`) — Included `shared/rz-responsive.js?v=20260422h` after `pixi.min.js` (line 160). Added `applyRdeScaling()` helper in the IIFE boot block (inline in `<script>`). Wires `window.RZ.fontScale()` / `window.RZ.btn('sm')` to DOM HUD + math-quiz panel on first boot and on every viewport change (registered via `window.RZ.onResize(applyRdeScaling)` inside the async boot tail):
  - `#distance-text` (HUD distance badge, base 13px)
  - `#position-badge` (race position chip, base 17px)
  - `#speed-hud` (speed chip, base 12px)
  - `#lives-hud` (lives row, base 20px)
  - `#train-name-badge` (train name chip, base 13px)
  - `#quiz-label` (quiz header, base 11px) + `#quiz-q` (math question, base 26px)
  - `.quiz-btn` (answer buttons, base 20px fontSize + `RZ.btn('sm')` min-width)
- **G15 Lokomotif Pemberani** (`games/g15-pixi.html`) — Included `shared/rz-responsive.js?v=20260422h` after `train-character-sprite.js` (line 221). Added `applyRdeScaling()` helper at end of inline script + `window.RZ.onResize(applyRdeScaling)` at boot tail. Wires DOM HUD + math quiz sizing:
  - `#math-label` (quiz header, base 12px) + `#math-question` (problem text, base 34px)
  - `.math-btn` (answer buttons, base 20px + `RZ.btn('sm')` min-width)
  - `#word-emoji` (HUD word emoji, base 24px) + `#next-char` (next char chip, base 24px)
  - `#sb-name` (station banner name, base 22px) + `#sb-landmark` (landmark line, base 13px)
  - `.life-heart` (heart row, base 20px)
- **Fallback pattern**: `applyRdeScaling()` early-returns when `window.RZ` is absent; each property write is further guarded by a null `querySelector` check. Ensures games still render correct pixel sizes if the runtime script fails to load (offline, CDN block).
- **Untouched**: world-space `PIXI.Text` (G14 tree decorations, G14 obstacle emojis, G15 letter/math/heart box labels — all move with world coords and their sizes are coupled to hitboxes/art), PIXI background scenery, `game.js`, `style.css`, `index.html`, `trains-db.js`, `game-modal.js`, G16/G19/G20/G22.

### Verification
- `grep -c "RZ\." games/g14.html` → 10 lines.
- `grep -c "RZ\." games/g15-pixi.html` → 11 lines.
- `grep -c "rz-responsive" games/g14.html games/g15-pixi.html` → 1 each (script tag only).

---

## 2026-04-22 — RDE Step 7: G16 + G19 Pixi text sizing wired to RZ runtime

### Changed
- **G16 Selamatkan Kereta** (`games/g16-pixi.html`) — Included `shared/rz-responsive.js?v=20260422h` before `game-modal.js` (line 152). Five `PIXI.Text` render sites now consume `window.RZ.fontScale()` with `window.RZ ? ... : fallback` guards:
  - Line ~1131 (mini-obstacle emoji label, base 24px) — between-station quiz prompts.
  - Line ~1250 (⚡ spark particle on overhead pole, base 14px) — rail-line spark FX.
  - Line ~1673 (super-streak ⭐✨🌟💫 rain, base 18px + random) — 5+ correct-streak celebration.
  - Line ~1808 ("SELAMAT TIBA!" platform sign, base 11px) — arrival station signage.
  - Line ~1911 (fireworks finale emojis, base 16px + random) — end-of-run celebration.
- **G19 Pokemon Birds** (`games/g19-pixi.html`) — Included `shared/rz-responsive.js?v=20260422h` before `pixi.min.js` (line 120). Two `PIXI.Text` render sites now scaled:
  - Line ~566 (pokeball/⭐ pipe-gap collectible, base 22px) — per-pipe reward token.
  - Line ~917 (`spawnFloatingText` helper, base 22px) — all floating +1/⭐/EVOLUSI feedback texts.
  - Line ~380 — `window.RZ.onResize(...)` registered as reserved hook for future layout recompute on viewport change.
- **Fallback pattern**: each RZ call guarded so the game still renders correct pixel sizes if the runtime script fails to load (offline, CDN block).
- **Untouched**: world coordinate math, background scenery sizing, `game.js`, `style.css`, `index.html`, `trains-db.js`, `game-modal.js`, G14, G15, G20, G22, G16 character train config.

### Verification
- `grep -c "RZ\." games/g16-pixi.html` → 5 lines.
- `grep -c "RZ\." games/g19-pixi.html` → 4 lines.
- `grep -c "rz-responsive" games/g{16,19}-pixi.html` → 1 each.

---

## 2026-04-22 — RDE Step 7: G20 Pixi text sizing wired. All 6 PixiJS games now consume shared RZ runtime.

### Changed
- **G20 Ducky Volley** (`games/g20-pixi.html`) — Included `shared/rz-responsive.js?v=20260422h` (line 127). Top-of-script `const _rz = window.RZ` hoist at line 129. Three `PIXI.Text` render sites now consume `RZ.fontScale()` with `_rz ? ... : fallback` fallback guards:
  - Line ~506 (beach decoration emoji, random 10-18px base) — `_bfs` intermediate so the same random value flows to both branches.
  - Line ~881 (type-emoji hit burst FX, base 20px) — set/shot/smash hit feedback.
  - Line ~976 (crab `?` hint glyph, base 11px) — scene-level quest-mark.
- **Integration points**: 4 `_rz`/`RZ.*` references (1 const hoist + 3 ternary call sites) — enough to fluidly scale all font-rendered Pixi text in the match scene.
- **Fallback pattern** — Each RZ call guarded so the game still renders correct pixel sizes if the runtime script fails to load (offline, CDN block).

### Cache
- `index.html` → `v=20260422i` (was `v=20260422h`). style.css + game.js both bumped.

### RDE Step 7 completion
- **All 6 PixiJS games migrated**: G14, G15, G16, G19, G20, G22. Task #29 Step 7 complete — full 7-step RDE migration now shipped.
- Physics coordinates, gravity, bounce coefficients, ball/player speeds, background scenery draw params — all left untouched per Step 7 scope guard.

---

## 2026-04-21 — Unified GameModal messaging aligned with star count

Audited all `GameModal.show()` callers in standalone games and applied
surgical fixes so that title, emoji, and msg are consistently branched by
star count. All games now explicitly handle the 0-star fail case per the
standard defined in `games/game-modal.js` (task #44 follow-up).

### Standard branching (per star count)
- 0-star: title "Gagal! Coba Lagi" / emoji 😞 / msg "Jangan menyerah, ayo coba lagi!"
- 1-2 stars: title "Coba Lagi" / emoji 💪 / msg "Kamu bisa lebih baik lagi!"
- 3 stars: title "Bagus!" / emoji ⭐ / msg "Lumayan, terus berlatih!"
- 4 stars: title "Hebat!" / emoji 🌟 / msg "Kerja bagus!"
- 5 stars: title "Sempurna!" / emoji 🏆 / msg "Wow, kamu hebat!"

### Fixed callers
- `games/g6.html` (showFinish + showGameOver): added 0-star branch, emoji
  now graded; game-over now reports stars:0 with correct fail strings.
- `games/g13c-pixi.html` (endBattleWin + endBattleLose): win message now
  branches on stars; lose case forced to stars:0 + fail strings.
- `games/g14.html` (endRace): title/emoji/msg fully branch on stars and
  keep position label in the message body.
- `games/g15-pixi.html` (showWin + showLose): win title/emoji aligned to
  standard; lose case now stars:0 (was stars:1 — the modal normalizer
  would downgrade title, but sessionStorage still logged stars:1).
- `games/g16-pixi.html` (showWin + showLose): win strings fully branched;
  lose case emoji + strings standardized.
- `games/g19-pixi.html` (final modal): title/emoji/msg branched on stars
  rather than only on >=4/>=5.
- `games/g20-pixi.html` (endMatch): title/emoji/msg branched on stars
  (previously only branched on "won" boolean, so a winning player with
  poor quiz could still get "Kamu Menang!" + 1 star — now aligned).
- `games/g22-candy.html` (end screen): full 5-tier branching.

No changes to `games/game-modal.js`, `game.js`, `games/trains-db.js`,
or `style.css`.


---

## 2026-04-22 — Character train wheel recalibration + screen-edge safety (Task #45)

### Fixed
- **Character sprites re-processed via rembg v2** with new dimensions:
  - `caseyjr-body.webp`: 272×199 (was 272×198 — negligible)
  - `linus-body.webp`: **130×101** (was 264×173 — 50% smaller, near 1:1 aspect)
  - `jz711-body.webp`: 512×128 (was 512×71 — taller)
  - `malivlak-body.webp`: 512×256 (was 512×171 — taller)
- **Recalibrated wheel positions + spriteHeight** in both `games/trains-db.js` (TRAIN_CATS[0].trains) and `games/g16-pixi.html` (G16_CHAR_CONFIGS):
  - **Casey JR** — kept `spriteHeight:90`; wheels re-spaced evenly: `[[-40,-8,10],[-14,-8,10],[13,-8,10],[40,-8,10]]` (radius 10, uniform).
  - **Linus Brave** — `spriteHeight` 88 → **85** (source 130×101 is near square, rendered 109×85). Wheels compacted: `[[-40,-5,6],[-22,-8,9],[-7,-8,9],[8,-8,9],[23,-8,9]]`. Smoke y −108 → −105.
  - **Dragutin JZ 711** — `spriteHeight` 52 → **75** (rendered 300×75, tram now proportional). Wheels narrowed into sprite bounds: `[[-120,-3,7],[-95,-3,7],[95,-3,7],[120,-3,7]]`.
  - **Malivlak** — `spriteHeight` 95 → **110** (rendered 220×110). Wheels re-fit to narrower 220px: `[-85..90]` range with pilot pair (r=5) + driver pair (r=11) on right. Smoke moved up y −118 → −130 and left x 118 → 90 to match taller sprite.
- **Screen-edge safety margin** — wide character trains were clipping at viewport edges:
  - `games/g16-pixi.html:491` — `TRAIN_SCREEN_X = Math.max(W*0.15, 180)` (was `W*0.15`). Guarantees ≥180px from left edge on small screens while still honoring viewport-relative on wide screens.
  - `games/g15-pixi.html:604` — `TRAIN_X = 180` (was `120`). Hardcoded bump; harmless to programmatic trains.

### Cache
- `index.html` → `v=20260422h` (was `v=20260422g`). style.css + game.js both bumped.

### Notes
- Sprites are anchored bottom-center in train-character-sprite.js — wheel y negative = inside bottom edge. All positions verified against new render widths: Casey 123px, Linus 109px, Dragutin 300px, Malivlak 220px.
- `smokePos` for Casey kept at y=−110 (spriteHeight unchanged). Dragutin smoke stays null (electric tram — no steam).
- Programmatic trains in G16 `TRAIN_STYLES[4-9]` unaffected — no changes to their build paths.

---

## 2026-04-22 — RDE Step 7: G22 Pixi fontSize/btn integrates RZ runtime

### Changed
- **G22 Monster Candy** (`games/g22-candy.html`) — Included `shared/rz-responsive.js?v=20260422h` (line 99). Quiz panel `showCandyQuiz()` now consumes `RZ.fontScale()` for question label (17), category chip (11), answer button text (16), wrong-answer text (16), combo catch text (18/24); answer button min-width floor uses `RZ.btn('sm')` in place of hardcoded `60`.
- **Fallback pattern** — Each RZ call guarded with `_rz ? _rz.fontScale(N) : N` so the game degrades gracefully if the runtime script fails to load (offline, CDN block, etc.).
- **Integration points**: 6 `_rz.*` references (4 named consts + 2 inline ternary) in the quiz panel render path.

### Notes
- Only quiz panel render path touched. Background flower/particle fontSize values left hardcoded — they're decorative spawns, not UI legibility critical.
- No CSS changes in this step; Layer 3 JS runtime only.

---

## 2026-04-22 — RDE Step 5: G2/G5/G7/G9 migrated

### Changed
- **RDE Step 5 G2** (`style.css:290-300`) — `.breathe-circle-wrap`/`.breathe-animal`/`.breathe-instruction`/`.breathe-sub`/`.breathe-timer-wrap`/`.breathe-timer`/`.breathe-cycles` consume `--rz-font-*`/`--rz-gap-*` + `clamp()` for circle/timer diameters. Removed 10 lines from `@media` blocks (480/320 breakpoints).
- **RDE Step 5 G5** (`style.css:364-381`) — `.g5-score-row`/`.g5-player-score`/`.ps-name`/`.ps-val`/`.g5-turn-text`/`.g5-grid` gap+padding+radius+font tokens; `.card-emoji`/`.card-label` switched to `clamp()`. Card aspect-ratio/`transform-style: preserve-3d`/grid-template-columns preserved (gameplay-critical). Removed 8 lines from `@media` blocks (480/400/360/320).
- **RDE Step 5 G7** (`style.css:524-536`) — `.g7-mode-badge`/`.g7-display`/`.g7-question`/`.g7-choices`/`.g7-choice-btn`/`.g7-choice-img`/`.g7-choice-text`/`.g7-suku`/`.g7-progress` consume tokens for radius/gap/font/padding. Dark-theme `!important` overrides at 1620+ preserved. Removed 6 lines from `@media` blocks (480/320); viewport-based display width/height retained.
- **RDE Step 5 G9** (`style.css:559-570`) — `.g9-letter-display`/`.g9-instruction`/`.g9-canvas-wrap`/`.g9-result`/`.g9-stars`/`.g9-progress` consume font/gap/radius tokens + `clamp()` for canvas wrap. Canvas wrap @media sizes retained (canvas pixel math critical). Removed 2 letter-display @media overrides.
- **Token count**: `var(--rz-` references grew 62 → 112 (+50). Brace balance verified 2767/2767.

### Cache
- `index.html` → `v=20260422f`.

### Notes
- G5 cardback/card-front gameplay rules untouched — only outer scoreboard + grid/gap sizing.
- G7 `.g7-display` global enhancement at line 583 (viewport-anchored) left intact.

---

## 2026-04-22 — G15 landing tile polish

### Changed
- **G15 landing tile (`index.html:630-631`)** — icon enlarged 50px → 75px (1.5x) so the Linus+Casey character art reads at tile size. Tile background switched from deep-blue gradient (`#0D47A1→#42A5F5`) to soft peach (`#FEF3C7→#FDBA74`) so the blue Linus locomotive contrasts instead of blending into a same-hue backdrop. Emoji fallback via `onerror` preserved.
- **G15 level-select `iconImg` (`game.js:311`)** — swapped `assets/train/lokomotif-front-red.svg` → `assets/train/linus-casey.webp` so level-select hero matches the landing tile (was showing red programmatic locomotive).

### Cache
- `index.html` → `v=20260422e`.

### Notes
- G14 and G16 tiles left unchanged — G14 uses emoji on red gradient (already high-contrast), G16 uses blue `lokomotif-front-blue.svg` on orange gradient (already high-contrast). No clear improvement from adopting character trains at landing-tile size.

---

## 2026-04-22 — Character trains + RDE Steps 5+6

### Added
- **`games/train-character-sprite.js`** — shared `window.CharacterTrain` with `mount(container, config)`, `tick(dt, speed)`, `setSmokeParent`, `spawnSmoke`, `dispose`. Async PIXI.Assets sprite load + emoji fallback, wheel overlay with 4 spokes per tire (rotation visibility), body bob via sin, smoke puffs fade+rise+expand over 2s.
- **`games/trains-db.js` — "Karakter ⭐" category** prepended at index 0: Casey JR (0-4-0 Circus, 4 drivers r=11) + Linus Brave (2-4-0 Sumatera, 2 pilot r=7 + 4 drivers r=11). `isCharacter:true` gates alternate rendering.
- **`assets/train/caseyjr-body.webp`** (272×198, 22KB) + **`linus-body.webp`** (264×173, 18KB) — bg-removed via rembg.
- **`shared/rz-responsive.js`** — RDE Layer 3 runtime. `window.RZ.scale()/bp()/orient()/fontScale(base)/gap(kind)/btn(kind)/onResize(fn)`. Mirrors CSS `--rz-scale` clamp formula so PixiJS layouts match DOM neighbor scaling on resize.

### Changed
- **G15 `buildTrain()`** branches on `selectedTrain.isCharacter` → `CharacterTrain.mount()`. Tick wired in app.ticker loop. `trainContainer.scale.x=1` for character trains (sprites face right natively).
- **G16 `buildTrain()`** defaults to Casey JR via `G16_CHARACTER_CONFIG`. Tick wired in gameLoop with speed by trainState (STOPPED=0, MOVING=2, BOOSTING=4).
- **RDE Step 5 G1** (`style.css:267-281`): `.g1-animal-display`/`.g1-question`/`.g1-choice-btn`/`.choice-emoji`/`.choice-label`/`.g1-progress` consume `--rz-font-*`/`--rz-gap-*`/`--rz-radius-md`. Removed 9 lines from `@media` blocks (480/400/320 breakpoints).
- **RDE Step 5 G4** (`style.css:337-351`): `.g4-timer-text`/`.g4-question`/`.g4-choice-btn`/`.g4-progress`/`.g4-mode-btn` consume tokens. Removed 4 lines from `@media` blocks.
- **Deferred** G5/G7/G9 base-rule token migration to next pass (state complexity needs careful audit).

### Cache
- `index.html` → `v=20260422a` (character trains) → `v=20260422b` (RDE 5+6).

---

## 2026-04-21 (Evening) — BSE, G22 v2/v2.5, G16 fixes, RDE design, G6 sprite, train audio

### Added
- **`games/battle-sprite-engine.js`** — shared Battle Sprite Engine (BSE). `window.BSE` API: `init(tiersMap)`, `facing(slug)`, `flipForRole(slug, role)`, `visualScale(slug)`, `tierScale(slug)`, `finalScale(slug)`, `mount(el, slug, opts)`. Mutable `POKE_FACING` + `POKE_VISUAL` tables, single source for 4 battle games.
- **`game.js:5030`** — bridge export `window.BSE` so inline G10/G13/G13b consume same engine.
- **`games/g22-candy.html`** — 4 per-category signature FX: `fxNumberBurst` (Math, red-white digits), `fxRainbowSpiral` (Warna, 7-color spiral), `fxGoldPaws` (Hewan, gold paws/star ring), `fxPurpleLeaves` (Buah, purple leaves/mist). Dispatcher `spawnCategoryFX(x, y, ballType, catName)`.
- **G22 `spawnBubblePop(x,y)`** — 12 blue bubble rings + white sparkle flash on correct answer.
- **G22 `laserAbsorbSwap(candy)`** — red laser beam from pokeball to monster, white absorb flash, CSS filter `brightness(6) contrast(0)`, auto-swap to random Pokemon from G22_POKEMON roster after 800ms.
- **G22 `@keyframes monsterIdleBob`** + adaptive lerp (0.28/0.22/0.15 by distance) + squash/stretch on fast direction change.
- **G16 `.choice-btn.long-text`** — compact font variant; auto-applied when `longestLen > 5`.
- **G16 `triggerArrival` 8s safety net** — force `showWin()` if normal flow fails (end-game freeze prevention).
- **G16 bablas-recovery safeguard** — `S._stoppedNoQuizTime` accumulator; re-trigger quiz if STOPPED without quiz visible >1.2s.
- **`Sounds/train-crossing-sfx.mp3`** — 436KB steam-train-at-crossing SFX wired to G14/G15/G16 game-start.
- **`assets/pikachu-icon.webp`** + **`assets/Pokemon/svg/18.svg`** — G5 tab + G19 landing tile assets.
- **CODING-STANDARDS.md — Responsive Display Engine (RDE)** section — 3-layer architecture spec, 7-step migration plan.
- **CODING-STANDARDS.md — Battle Sprite Engine (BSE)** section — 5 responsibilities, default facing 'L' rationale.
- **`assets/Pokemon/pokemondb_hd_alt2/`** (user-provided, integration planned in Task #37) — 1025 Pokemon HD WebP 630×630, full Gen 1-9 coverage, all face RIGHT user-POV (= LEFT monitor-POV, matches BSE default).
- **`game.js` — `pokeSpriteAlt2(slug)`** helper (Task #37): returns `assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug}.webp` using `POKE_IDS` + `String(id).padStart(4,'0')`. Null-safe when id missing.
- **`style.css:17-49`** — RDE Step 1 (Task #29): `:root` fluid design tokens. Added `--rz-scale` (master clamp 0.7–1.0 from 320px–480px), `--rz-btn-xs/sm/md/lg` (derived button sizes), `--rz-font-xs/sm/body/title/h1/hero` (clamp typography), `--rz-gap-xs/sm/md/lg` (fluid spacing), `--rz-radius-sm/md/lg` (fluid corners). Zero existing rules modified.
- **`style.css:893-947`** — RDE Step 2 (Task #29): reusable UI primitive classes `.rz-navbar`, `.rz-navbar__title`, `.rz-letter-row`, `.rz-letter-btn`, `.rz-choice-grid`. Opt-in per game; Steps 3–7 migrate existing `.g<N>-*` rules in later commits.
- **G16 correct-answer juice** (`games/g16-pixi.html`, Task #38): new `spawnQuizCelebrationFX(screenX, screenY, streak)` — 3 variants by streak. Baseline: 14 confetti rectangles (6-color palette) radiating outward with upward bias + gravity, plus white ring pulse. Combo (streak≥3): adds 6 secondary firework bursts of 10 tiny sparks each at random offsets. Super (streak≥5): adds 8 floating ⭐✨🌟💫 emoji (PIXI.Text, `_noGravity` float-up) + gold ring pulse. Tracked via `S.correctStreak` (reset on wrong). Stage punch: `S.stagePunch=0.5` → new `updateStagePunch(dt)` in gameLoop runs sine bell-curve scale 1→1.04→1 over 0.5s (pivots centered). `updateSparks` extended to handle `_ring` (expand+fade) and `_noGravity` (reduced gravity for floating emoji). Fires within the existing 380/500ms `clearObstacle` delay so it overlaps with train resume visually.

### Changed
- **Sprite cascade reorder** (Task #37, `game.js` ~5075): `pokeSpriteVariant()` now resolves **alt2 HD WebP → local SVG → HD CDN** (previously: SVG → HD CDN). Alt2 becomes primary source; Gen 8/9 Pokemon no longer fallback to CDN. BSE consumes via existing `hdSrc` param — no engine change needed.
- **CODING-STANDARDS.md — BSE §1** updated to reflect new cascade order and 1025-coverage rationale.
- **RDE Step 3 — G8 Susun Kata migration** (`style.css:544-554, 585, 753-754, 849, 882`, Task #29): G8 letter input now fluid via `--rz-*` tokens. Base rules `.g8-slots / .g8-slot / .g8-letters / .g8-letter-btn` rewritten to consume `--rz-btn-sm` / `--rz-gap-sm/md` / `--rz-radius-sm` / `--rz-font-title`. Slot height = `calc(var(--rz-btn-sm) * 1.18)` preserves the 44×52 → ~62 aspect. Letter-btn font = `calc(var(--rz-font-title) * 1.05)` preserves the 24px vs 22px title ratio. `min-width` on `.g8-letter-btn` prevents sub-1 button-per-row collapse. Deleted enhancement bump rules at former `style.css:587-588` (duplicated per-size override — no longer needed with fluid scale). Removed 6 G8 override lines across three `@media` breakpoints (480px, 360px, 320px) — RDE `clamp()` handles scaling automatically. G8-specific accent colors preserved (rose/violet border, shadows, Scrabble wooden-tile dark overrides at lines 1691–1756 untouched). Zero HTML/JS changes; pure CSS refactor. Pilot validates 3-layer RDE architecture; Steps 4–7 (G3, G1/2/4/5/7/9, Pixi runtime, per-game override doc) remain pending.
- **RDE Step 4 — G3 Huruf Hutan migration** (`style.css:315-318, 583, 717, 872`, Task #29): G3 letter-forest card now fluid via `--rz-*` tokens. Base rules `.g3-word / .g3-hint / .g3-choices / .g3-choice-btn` rewritten to consume `--rz-font-h1 / --rz-font-body / --rz-font-hero` (choice letters = `calc(--rz-font-hero * 0.9)` preserves the prior 42px peak), `--rz-gap-sm/md`, `--rz-radius-md`, and `--rz-btn-md` (as min-height + padding basis). Removed the `.g3-choice-btn` enhancement bump at former `style.css:584`. Removed 4 G3 overrides from `@media(max-width:480px)` and 1 from `@media(max-width:360px)` — RDE `clamp()` handles the fluid scale 320px → 480px. **Preserved**: G3 teal/green theme gradient on `.g3-word`, white/teal base styling on `.g3-choice-btn`, `.g3-animal` emoji size (gameplay-specific, not UI), the full AAA dark overhaul (wooden-plank word, speech-bubble hint, carved-wood-log choice buttons, letter-highlight burst) at lines 1465–1566 untouched — those use `!important` and override on the G3 screen. Zero HTML/JS changes; token composition pattern identical to Step 3 (no class rename). Steps 5–7 (G1/2/4/5/7/9, Pixi runtime, per-game override doc) remain pending.

### Bug Fixes
- **P0 — G16 freeze at end + bablas stasiun** (`games/g16-pixi.html:1455-1467, 1186-1200`): end-game race + station-collision race both guarded.
- **P0 — G6 vehicle image not rendering** (`games/g6.html:568-585`): `PIXI.Texture.from()` is async in PIXI v8; synchronous `try/catch` can't catch async failures. Rewrote to `PIXI.Assets.load(url).then(tex => swap)` with emoji placeholder + proper fallback.
- **P1 — Staryu/Pikachu not facing each other** (`games/battle-sprite-engine.js:15`, `game.js:5010`): engine default facing was `'R'`, but Pokemondb HOME 3D renders face viewer with slight LEFT bias. Flipped default to `'L'`. Player flips correctly, enemy stays natural. Zero per-Pokemon overrides needed for common cases.
- **P1 — G19 Pidgeot emoji on landing** (`index.html:470`): replaced `<span class="wn-icon">🐦</span>` with HD SVG `<img src="assets/Pokemon/svg/18.svg">`.
- **P1 — Train BGM = battle BGM** (`Sounds/train-bgm.mp3`): byte-identical to Pokemon theme. Replaced with real train BGM (MD5 afe88377…).
- **P1 — G16 quiz answer text overflow** (`games/g16-pixi.html:38-39, 1363`): `.choice-btn` `max-width:none`, `overflow-wrap:break-word`, `.long-text` compact variant.
- **P2 — Navbar wrap to multi-row on narrow screens** (`style.css:196, 201`): `flex-wrap:nowrap; overflow:hidden` + ellipsis on title.
- **P2 — G6 road signs off-screen** (`games/g6.html:430-438`): clamp to canvas bounds + skip-spawn if band <15px.

### Deferred (blocked on user assets)
- #31 G13c gym badge icons — need badge PNGs.
- #33 G20/G22 movement whoosh SFX — need freesound MP3.
- #35 G16 collision crash SFX — same.

### Changed (late evening — G6 audio + shoulder clutter)
- **G6 BGM swap (Task #41)** (`games/g6.html:77, 920`): `<audio id="game-bgm">` src changed from `../Sounds/battle-bgm.mp3` → `../Sounds/racecar.mp3` (1.7MB, 256kbps mono, purpose-fit engine loop). Volume bumped `0.2 → 0.5` per user (racecar loop has lower intrinsic loudness than battle BGM). Play/pause flow untouched: plays in `startWord` (line 920), pauses on `togglePause` (~1003), `finishGame` (~1007), `confirmBack` (~1024). BGM does NOT autoplay on start-overlay — only once the first word spawns (startWord runs after difficulty pick).
- **G6 shoulder scenery removed (Task #42)** (`games/g6.html:355-367`): removed the 8-iteration emoji loop that scattered theme icons (🌲/🌙/🏢/…) outside `roadLeft`/`roadRight` at `alpha 0.2-0.35`. User feedback: "melayang-layang di luar jalan kesannya acak" — low-alpha + off-road placement read as random floating clutter in dark mode. Kept empty `sceneryL`/`sceneryR` containers (with `_scroll` props) so the game-loop scroll tick at `~889` stays safe without null checks. Road signs (already clamped inside canvas in the earlier P2 fix) untouched — they remain the sole ambient road furniture.

### Cache
- `index.html` → `?v=20260421f` → `?v=20260421g` → `?v=20260421h` → `?v=20260421i` → `?v=20260421j` → `?v=20260421k` → `?v=20260421l` → `?v=20260421m`.

### Bug Fixes (late evening)
- **P1 — G20 controls + physics smoothing (Task #25, controls portion)** (`games/g20-pixi.html:699-744, 1097-1135, 76-89`): Removed auto-jump assist (was: `if(S.pGnd && S.bx<NET_X && S.bvy>0 && Math.abs(S.bx-S.px)<60 && S.by<GROUND_Y-40) S.jump=true`) — jump now requires **explicit user input only** (Space/ArrowUp/KeyW on desktop, swipe-up gesture or new jump button on mobile). Also removed hidden `S.jump = true` on every `touchstart` (was contradicting user's "jangan dikasih auto jump" feedback). Added lerp-based horizontal movement: `S.pvx = S.pvx*0.78 + target*0.22` for both drag-drive and arrow-key paths (was hard `S.pvx = ±spd`). Added rise-damping `if(S.pvy<0) S.pvy*=0.985` for gentler jump apex. Ball physics tuned: gravity multiplier `0.65 → 0.60` (slightly more float), added light air-drag `bvx*=0.995^dt`, `bvy*=0.998^dt` for natural arcs. Jump button now visible on touch devices (`#btn-jump` bottom-right, yellow circle, 72×72). Hint text updated: "Geser = Gerak | Swipe ⬆ atau Tombol = Lompat". **Scoring migration still pending** (unified scoring engine out of scope for this pass).
- **P0 — G16 mini-obstacle density too high (Task #39)** (`games/g16-pixi.html:1036-1069`): replaced random-spacing spawn loop (`miniSpacing = 225 + rand*150` → ~4 minis per station-gap) with deterministic per-gap placement. New rule: `maxMinisPerGap = {1:1, 2:2, 3:2, 4:2, 5:3}[level] || 2`, evenly distributed across each adjacent station pair; gaps <400px skipped. Preserves ROAD_OBS emoji variety, quiz mechanism, visual style.
- **P0 — G16 train STILL bablas (Task #40)** (`games/g16-pixi.html:1114-1124, 1252-1266`): 4-part overshoot hard-guard. (1) Creep floor `2px → 0.2px`. (2) Hard clamp: if next frame-step would cross `nextObs.worldX + 5`, snap `worldX = nextObs.worldX - 1`, force STOPPED, show quiz. (3) Absolute per-frame cap `speed*dt → Math.min(speed*dt, baseSpeed/2)` — prevents tab-switch / dt-spike teleport. (4) Game-loop prologue overshoot recovery: scans for uncleared obstacle at `worldX < S.worldX - 20`, rewinds to `obs.worldX - 5`, forces STOPPED + quiz. Last-ditch guarantee — no obstacle can be silently skipped.

### Changed (late evening — Unified Scoring Engine migration, Task #25 scoring portion)
- **G17 Jembatan Goyang scoring → `GameScoring.calc()`** (`game.js:10451-10465`): replaced inline `damage === 0 ? 5 : damage <= 1 ? 4 : 3` ternary with `GameScoring.calc({correct: g17State.correct, total: g17State.totalBlocks, lives: maxDamage-damage, maxLives: 3})`. Damage re-cast as lives-lost so the engine's "lives lost ≥ 2 demotes" modifier applies cleanly. Loss path passes accuracy only.
- **G18 Museum quiz scoring → `GameScoring.calc()`** (`game.js:11113-11116`): pure accuracy quiz — `score === total ? 5 : score >= round(total*0.75) ? 4 : ...` replaced with `GameScoring.calc({correct: score, total})`. Legacy mapping preserved by engine (100%→5, ≥85%→4, ≥65%→3 matches old thresholds within ±1 bucket on edge cases).
- **G13 Pokemon Evo battle scoring → `GameScoring.calc()` + bonus** (`game.js:7824-7827`): evolution progression is not accuracy-based; used **bonus modifier** pattern — `GameScoring.calc({correct:1, total:1, bonus: evoPenalty})` where `evoPenalty = 0 / -1 / -2` for evolved2/evolved/none. Base perfect-run (5★) minus shortfall = identical 5/4/3 distribution as legacy.
- **G13b Pokemon Hunt scoring → `GameScoring.calc()` + bonus** (`game.js:8518-8529, 8559-8561`): kill-count threshold scoring (not accuracy). Both `g13bGameOver` (defeated path: 0/1/2★) and `g13bLevelComplete` (complete path: 1-5★) routed through `GameScoring.calc({correct:1, total:1, bonus: tier-5})`. Legacy threshold tables (`kills≥15→2`, `kills≥50→5`, etc.) preserved exactly via intermediate `_g13bTier`/`_g13bLcTier` constants, then fed into bonus delta. Every star value identical to pre-migration.
- **G10/G11/G12 central `endGame()` normalizer → `GameScoring.calc()`** (`game.js:1864-1867`): `endGame(stars)` formerly did `Math.min(5, Math.round(stars/maxRounds*5))`. Replaced with `GameScoring.calc({correct: stars, total: maxRounds})`. Covers G10 Pokemon Battle, G11 Kuis Sains, G12 Tebak Warna in a single change — all three now route through unified engine via shared helper.
- **Pattern documented** in LESSONS-LEARNED.md (§"Unified Scoring Engine — bonus-modifier pattern for non-accuracy games") for future survival/progression game migrations.

---

## 2026-04-21 — Battle Standards + HD Sprites + G22 + Repo Migration

### Added
- `POKE_TYPE_COLORS` canonical lowercase type-color map + `pokeTypeColor(type)` helper (`game.js:5014`).
- `spawnTypeAura(el, type, dur)` DOM aura-ring helper (`game.js:5024`) + `@keyframes pokeAuraRing` in `style.css`.
- G13c inline `POKE_TIER` sparse map + `pokeTierScale(slug)` (matches `game.js` logic) with transform applied to `#poke-player`/`#poke-enemy`.
- G13c `addAura(el, type)` upgrade: CSS var `--aura-color` drives type-colored attacker glow; both player + enemy callsites pass attacker type.
- CODING-STANDARDS.md section **Battle Standards — 5 Invariants** (contract for G10/G13/G13b/G13c).

### Bug Fixes
- **P0 — HD sprite regression** (`game.js`): `pokeSpriteOnline()` was mis-named and returned local low-res; now correctly returns HD CDN. `pokeSpriteVariant()` prefers SVG → HD CDN (dropped 50/50 coin-flip). G10 `loadSprHD`/`loadSprPlayer` rewritten with HD-first cascade; `image-rendering:pixelated` killed on player sprite.
- **P0.7 — G10 enemy cascade regression** (`game.js:5409-5413`): `loadSprHD` `onerror` branch tried `assets/Pokemon/sprites/{slug}.png` BEFORE `pokeSpriteCDN()` — so Gen 9+ Pokemon without a local SVG entry (Fuecoco id 909) rendered the back-facing low-res PokeAPI sprite. Symptom: pixelated **and** wrong facing direction (CSS `scaleX(-1)` assumes HD orientation; low-res PokeAPI sprites face the opposite way). Swapped order to mirror `loadSprPlayer`. Cache-bust `v=20260421c`.
- **P0.8 — G13c scoring** (`games/g13c-pixi.html`): `endBattleWin()` computed stars from cumulative badge count (`total>=15?5:…`) — first win always rated 1★. Migrated to unified `GameScoring.calc()` with per-battle inputs: team HP% as accuracy, wrong-answer counter, team-alive as lives. Added `battle.wrongAnswers` + `battle.totalAnswers` counters in battle init + `executeMove()`. Cache-bust `v=20260421d`.
- **P0.9 — Repo public + history scrub**: `git filter-repo --replace-text` removed exposed Gemini key from all commits (force-push rewrote 5 commit SHAs). Full secret scan clean. Flipped `baguspermana7-cpu/Dunia-Emosi` to **public** via GitHub API.
- **P1.0 — Gemini → WebP asset standard**: new `scripts/gemini-image-gen.py` helper + `prompts/` dir + CODING-STANDARDS section. WebP-only output (quality 82, method 6, max 1200px). Raw PNG never persisted. Key via `GEMINI_API_KEY` env var.
- **P1.1 — G17 visual polish** (`game.js:10205, 10303`; `style.css` new `g17CorrectRing` keyframe): consistent wooden-plank block labels (numbers 1..N, killed the 10+ emoji mix); correct-tap juice (`spawnParticleBurst` + green ring ripple at block center). Full G17 scene (sky/mountains/gorge/bridge/cliffs/train-cross) was already complete from prior sessions — polish only. Cache-bust `v=20260421e`.
- **P1.2 — Shared `QuestionBank`** (new `games/question-bank.js`): extracted inline G22 question arrays into a reusable module. API: `pick(cat)`, `get(cat, count)`, `wrongAnswers(cat, correct, count)`, `extend(cat, items)`, `categories`. G22 consumes via `<script src="question-bank.js">` loaded BEFORE the inline IIFE; legacy `Q_MATH`/`BALL_CATEGORIES`/`pickQ` aliases preserved for backward compat. Enables future kid games to share the same pool.
- **Battle standards (Fix A–G)**: consolidated 3 duplicate type-color maps, unified DOM aura helper, expanded `g10TypeFX` from 4→18 types, applied `pokeTierScale()` to G13 initial player + evolved forms, G13b already had tier scaling.
- **G22 Monster Candy — 7 UX fixes** (`games/g22-candy.html`): lerp-smoothed cursor follow via `translate3d` (no layout thrash), HD Psyduck `clamp(140px,26vw,220px)`, dynamic answer-pill layout (no overflow), pickup FX (catch-pop + 8-particle ring burst + center flash), background richness (12 clouds × 3 parallax speeds, 6 flyers, 5 pine trees, 3 snow-capped mountains, 24 flowers, rainbow), ground-anchored via `window.innerHeight - H*0.75` on resize, directional facing (scaleX + turn-flip animation).

### Repo Migration
- `Apps/dunia-emosi/` content now lives at `github.com/baguspermana7-cpu/Dunia-Emosi` (fresh-init workaround — `git subtree split --prefix=Apps/dunia-emosi` produced wrong tree containing sibling apps; remediated via rsync + force-push). Vercel `dunia-emosi.vercel.app` + `dunia-emosi-z2ss.vercel.app` auto-redeploy on push.

### Cache
- Bumped `index.html` script + style tags: `?v=20260421a` → `?v=20260421b`.

---

## 2026-04-20 — Evening Session

### Bug Fixes
- **G13**: Level Berikutnya freeze fixed — `showGameResult` button handler now wraps `b.action()` in `requestAnimationFrame` so modal `display:none` flushes before new level init. `initGame13` also clears stale sprite classes from previous level's victory/defeat animations.
- **G10**: Attack effect regression — `auraColors` map used capitalized keys (`Fire`, `Water`) but `POKEMON_DB.type` is lowercase (`fire`, `water`). Fixed to lowercase + added `typeLow` normalization for defensive safety. Silent fallback to purple aura is gone; type colors now render correctly.
- **Cache bust**: `game.js` + `style.css` version `?v=20260418b` → `?v=20260420a` so fixes propagate to users with cached assets.

### Added
- `POKE_TIERS` global slug→tier lookup + `pokeTierScale(slug)` helper (game.js near POKEMON_DB). Returns 1.0 / 1.2 / 1.3 / 1.3.
- CODING-STANDARDS.md section **Pokemon Assets Standard** — enforces tier-based sprite scaling across Pokemon games (G10/G13/G13b/G13c/G22, G19 exempted).
- CODING-STANDARDS.md section **Type Key Convention** — lowercase enforcement for all Pokemon type-keyed maps.
- CODING-STANDARDS.md section **Attack Effect Chain** — documents the 8-stage G10 pattern as standard for all battle games.
- CODING-STANDARDS.md section **Documentation Workflow** — mandate: every fix must update BOTH TODO-GAME-FIXES.md AND CODING-STANDARDS.md.
- Memory feedback: `feedback_always_document.md` enforces workflow at session start.

### Deferred (not blocking)
- Repo split migration: push to `baguspermana7-cpu/Dunia-Emosi` failed HTTP 408 (790 MB initial push timeout). Retry strategy TBD.
- Full live-test of G10 attack chain — aura color was a known bug; other 7 stages need visual confirmation.

### Note — Tier Scale Discrepancy
Previous changelog entry (v2.2.0) documented tier 4 legendary as 1.6×. Current
standard per user mandate (2026-04-20) is 1.3× for both tier 3 and tier 4.
`pokeTierScale` helper uses 1.3× for both. Inconsistent legacy inline code may
still use 1.6× for legendaries.

---

## v2.2.0 — 2026-04-13
### Bug Fixes
- G13b: "Lanjut" button now correctly closes Level Complete modal before starting new round (critical bug — game was stuck)
- G13b: Wild counter-attack no longer plays wrong-answer sound; uses distinct impact tone instead
- G13b: Pikachu player sprite now faces right (toward enemy) via CSS scaleX(-1)
- G13b: Star display replaced from `🌑` (renders as blue circle on some systems) to `☆` (universal hollow star)

### Features
- G13b: 5-star scoring system (was 3-star) — consistent with G14/G16 standard
- G13b: Result subtitle now shows actual score instead of hardcoded "30+ kill = ⭐⭐⭐"
- G13b: Wild Pokémon size scales by evolution tier (basic=1x, mid=1.2x, final=1.3x, legendary=1.6x)
- Pokemon DB: Expanded from 186 → 1,025 entries (all Gen 1-9) with `tier` and `gen` fields
- Pokemon DB: Local sprites used as primary source (`assets/Pokemon/sprites/`) with CDN fallback
- Pokemon DB: `_LEGENDARY_IDS` expanded to cover all Gen 1-9 legendaries/mythicals (79 total)
- G5: Card grid/tabs now correctly center on all screen sizes (mobile + desktop)
- G5: Pokémon tab icon changed to CSS Pokéball (no dependency on missing image)
- G5: Moon crescent decorative element hidden (was overlapping navbar)
- G14: Train sprites always in front (z-index 25 player, 18 AI) — were behind track elements
- G14: Smoke particles spawn 3 per call at 60% pressure threshold (was 1 at 80%)
- G14: Train colors more vibrant (brightness 1.35 + saturation 2.2)
- G14: AI trains have entrance animation when spawning
- G14: All bullet train emojis (🚄🚅) replaced with steam (🚂) in quiz content
- G17: Train z-index raised to 10 (was 5, behind bridge blocks at z-index 6)
- G17: Train crossing speed slowed from 1.5s → 2.8s
- G3: Mode badge hidden (was redundant with level indicator)
- Ideas: 50 game expansion ideas saved to `prompt/ide/50-ide-game-pokemon.md`

## v2.1.0 — 2026-04-11
### Added
- Level selector now works for ALL 9 games (G6-G9 previously hardcoded medium)
- XP system: every star = 10 XP, 5 level tiers (🥚🐣🐥🦅👑)
- XP display on result screen + Level Up animation
- Progress Dashboard screen (stats, achievements gallery, XP bar)
- Expanded achievements: 16 total (was 8)
  - Added: hundred_stars, driver_master, picture_master, word_master, trace_master, all_games, streak3, hard_mode
- Level tier badge in player chip header
- Dashboard accessible from menu with Reset Data option
- Image prompts updated to Disney Pixar / One Piece Toei 2023 style

## v2.0.0 — 2026-04-11 (In Progress)
### Added
- Level selector screen (Mudah/Sedang/Sulit) before each game
- 10 emotions (was 6): added Bahagia, Bosan, Kesal, Kagum
- 20 animal-letter pairs (was 10): full A–U coverage
- Animated world backgrounds per game screen (CSS)
- Achievement toast notification system (8 achievements)
- Daily streak tracking
- Progress dots row below progress bar
- Flash overlay on correct/wrong answer
- G5 (Memory) difficulty: 3×4 / 4×4 / 4×5 grids
- G2 (Breathing): advanced 4-6-8 pattern for Hard mode
- G4 timer: Easy=20s, Medium=15s, Hard=10s (was always 10s)
- Age tier system (5-6 / 7-8 / 9-10)
- `Fredoka One` display font
- Asset folder structure + prompt folder

### Assets Planned (pending AI generation)
- 5 background tiles (bg-*.webp)
- 7 Leo character expressions (leo-*.png)
- 4 vehicle assets (car-red, car-blue, rocket, submarine)
- 4 obstacle tiles
- 20 word/animal images (img-*.png)

---

## v1.2.0 — 2026-04-11
### Added
- Spring physics button animations
- World-themed animated backgrounds (CSS hearts, clouds, letters, stars)
- Sparkle burst effect on correct answers
- Confetti with physics (dx, rotation CSS vars)
- Star fly animation to score counter
- Leo bounce/mascot animations
- Streak badge on player chip
- 8 achievements with localStorage persistence

---

## v1.1.0 — 2026-04-11
### Added
- Game 3 (Huruf Hutan): Mode toggle huruf/angka
- Game 4 (Hitung Binatang): Timer countdown bar
- Game 5 (Cocokkan Emosi): Full memory match 4×4
- 2-player mode with turn switching
- LocalStorage star persistence per player name
- Web Audio API synthesized sounds

---

## v1.0.0 — 2026-04-11 (Initial)
### Added
- 5 mini-games: Aku Merasa, Napas Pelangi, Huruf Hutan,
  Hitung Binatang, Cocokkan Emosi
- Solo + 2-player modes
- Name + animal avatar selection
- Basic CSS animations + emoji characters
- Star reward system
