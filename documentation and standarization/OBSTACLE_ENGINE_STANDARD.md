# Obstacle Engine Standard

> Version: v54.77 (shipped 2026-06-26)
> Source: `games/obstacle-engine.js`, `games/data/obstacles.js`, `games/data/kids-questions.js`, `games/data/routes.js`
> Spec source: `documentation and standarization/SPEC_OBSTACLE_VARIETY.md`

## Purpose

Child-friendly (age 4-7) modular obstacle system for the Dunia Emosi train games (G14 Balapan Kereta primary; G15 / G16 opt-in). Replaces ad-hoc hardcoded obstacles with a registry-driven JSON-config system that supports drag-drop puzzles, question gates, timing taps, lane choices, memory sequences, balance challenges, animal kindness moments, and station tasks.

**Mandates (non-negotiable):**

1. **Soft-fail default** — Easy mode (default) NEVER decrements HP on puzzle fail. Hard mode (opt-in) decrements HP per wrong tap.
2. **Auto-help at retry 3** — kids never get stuck. Engine shows "🎉 Hebat, kita berhasil bersama! 🎉" + auto-success after 1.2s.
3. **≥88 px tap targets** — large enough for small fingers. Most are 100 px+.
4. **Voice prompt fallback** — Web Speech API (id-ID) attempted on every obstacle; silent fallback if unsupported.
5. **Reduce-motion compliance** — all animations honor `prefers-reduced-motion: reduce` and the v54.51 `localStorage['train-reduce-motion']` toggle.

## Engine API (window.ObstacleEngine)

```js
ObstacleEngine.register(id: string, def: ObstacleDef): void
ObstacleEngine.attach(gameAPI: GameAPI): void
ObstacleEngine.spawn(id: string, opts?: object): Promise<'success' | 'busy' | 'unknown'>
ObstacleEngine.getMode(): 'easy' | 'hard'
ObstacleEngine.setMode(m: 'easy' | 'hard'): void
ObstacleEngine.getAgePreset(): '4' | '5' | '6' | '7'
ObstacleEngine.setAgePreset(a): void
ObstacleEngine.getHighContrast(): boolean
ObstacleEngine.setHighContrast(v): void
ObstacleEngine.suggestedDifficulty(baseTier: number): number
ObstacleEngine.pickAdaptiveCandidates(opts?: {age, baseTier}): string[]
ObstacleEngine.getStickers(): string[]
ObstacleEngine.getBadges(): string[]
ObstacleEngine.getHornUnlocks(): string[]
ObstacleEngine.speak(text: string): void  // Web Speech, silent fallback
ObstacleEngine.spawnSparkles(el: HTMLElement, count: number): void
ObstacleEngine.reducedMotion(): boolean
```

## Obstacle Definition Schema (spec §21 verbatim)

```js
ObstacleEngine.register('missing_rail_triangle', {
  // Identity / classification
  type: 'drag_drop_track_repair',         // category tag
  difficulty: 1,                          // 1 (easy) — 4 (hard)
  ageRange: '4-7',                        // "4-5", "5-7", "6-7", or "4-7"
  allowedLocations: ['*'],                // ['*'] | ['surabaya', 'jakarta', ...]
  allowedJourneyPhases: ['urban_exit'],   // ['*'] | ['suburban', 'arrival', ...]
  requiredAction: 'tap_choice',           // semantic tag

  // Behavior
  questionRequired: false,                // pulls from KidsQuestions if true
  questionCategory: 'shape',              // when questionRequired
  timeLimit: null,                        // ms, or null for no limit
  softFail: true,                         // MUST be true
  maxRetry: 3,                            // 3-tier hint cascade, then auto-help

  // Reward (engine auto-persists sticker/badge/hornUnlock to localStorage)
  reward: { coins: 5, badgeProgress: 1, sound: 'success_chime',
            sticker?: 'surabaya_helper', badge?: 'surabaya_explorer',
            hornUnlock?: 'thomas_horn' },

  // Visual hints
  visual: { cameraZoom: true, highlightSlot: true, snapAnimation: true, successSparkle: true },

  // Accessibility flags (all should be true for child-friendly UX)
  accessibility: { voicePrompt: true, largeTouchTarget: true, reducedMotion: true },

  // Text content
  title: '🛠️ Pilih bentuk rel yang sesuai!',
  hints: ['retry 1 hint', 'retry 2 hint', 'retry 3 hint'],

  // Render + interaction
  interaction: {
    setup(ctx, callbacks) {
      // ctx.body — DOM element to populate
      // ctx.questionData — { q, options, correct, voicePrompt } if questionRequired
      // callbacks.success() — call to complete obstacle
      // callbacks.fail() — call to soft-fail (engine handles retry cascade)
      // callbacks.hint(msg?) — manually show a hint
    },
    teardown(ctx) {
      // cleanup intervals/timeouts; engine clears DOM body
    },
  },

  // Optional visual hooks
  successFx: null,   // function(body) — extra animation on success
  failFx: null,      // function(body) — extra animation on fail
})
```

## Game API (passed to ObstacleEngine.attach)

```js
ObstacleEngine.attach({
  pauseTick:   () => void,                      // pause game loop
  resumeTick:  () => void,                      // resume game loop
  slowDown:    (factor: number, durMs: number) => void,
  resumeSpeed: () => void,
  cameraZoom:  (scale: number, durMs: number) => void,
  takeHP:      (n: number) => void,             // only called in Hard mode
  awardReward: (reward: object, obstacleId: string) => void,
})
```

## Soft-fail cascade (engine internal)

| Retry | Engine action |
|---|---|
| 1 | Show generic hint ("Coba lagi! 🌟") |
| 2 | Pulse target slot + hint #2 |
| 3 | Show "🎉 Hebat, kita berhasil bersama! 🎉" → auto-success after 1.2s |

Hard mode adds: `gameAPI.takeHP(1)` per wrong tap (capped at retry 3 auto-help, never causes game-over via puzzle).

## Adaptive difficulty (v54.75)

`suggestedDifficulty(baseTier)`:
- `_state.recentFails >= 2` → `tier = max(1, baseTier - 1)`
- `_state.recentWins  >= 5` → `tier = min(4, baseTier + 1)`

`pickAdaptiveCandidates({age, baseTier})`:
- Filter `_registry` by `def.ageRange` matching current age preset.
- Filter further by `def.difficulty` within ±1 of suggested tier.
- Falls back to full registry if filter yields zero matches.

## High-contrast accessibility (v54.75)

`setHighContrast(true)` adds `obstacle-engine-highcontrast` class to `<html>`. CSS rules force:
- White card background, 6 px black border
- Buttons: white bg, 6 px black border, black text
- Correct: green bg, white text, dark green border
- Wrong: red bg, white text, dark red border
- Title: black text, no shadow

## Reward storage

Engine auto-writes `def.reward.sticker / .badge / .hornUnlock` to localStorage on success:
- `localStorage['train-stickers']` (JSON array, deduped)
- `localStorage['train-badges']` (JSON array, deduped)
- `localStorage['train-horn-unlocks']` (JSON array, deduped)

Route runners can use `ObstacleEngine._addToStorageList(key, item)` for the same path.

## Scripted routes (v54.76)

`window.TrainRoutes` — keyed by routeId, each route has:
- `id`, `locationId`, `name`, `description`
- `sequence`: ordered array of `{type:'wait', durationMs}` | `{obstacleId, overrideReward?}` | `{type:'arrival'}`
- `completionReward`: applied at arrival

`window.findRouteForLocation(locationId)` returns matching route or null. G14 looks this up via `TrainBG._state.location.id`.

5 scripted routes shipped: surabaya (8 beats anchor), jakarta, bandung, yogyakarta, semarang.

## Verification (tools/probe-obstacle-engine.mjs)

`node tools/probe-obstacle-engine.mjs` asserts 14 acceptance criteria:
- ≥20 obstacles registered (currently 52)
- All obstacles `softFail: true`
- All obstacles `maxRetry ≥ 1`
- All obstacles have `reward.coins`
- All obstacles have a11y flags (voicePrompt + largeTouchTarget + reducedMotion)
- Question pool ≥50 (currently 72)
- ≥6 question categories
- ≥1 scripted route (currently 5)
- Surabaya route has ≥7 beats (currently 8)
- Easy mode default, age=5 default, high-contrast=off default
- `suggestedDifficulty` + `pickAdaptiveCandidates` functions present

## Adding a new obstacle

1. Open `games/data/obstacles.js`.
2. Use a generator if your pattern matches: `makeShapeRepairObstacle`, `makeBridgeRepairObstacle`, `makeQuestionGateObstacle`, `makeAnimalCrossingObstacle`, `makeLaneChoiceObstacle`, `makeChooseTrackObstacle`, `makeMemorySequenceObstacle`, `makeCargoSortObstacle`.
3. Or write a new `OE.register(id, def)` block following the schema above.
4. Bump CACHE_VERSION in `sw.js` + cache-bust `data/obstacles.js?v=...` in `g14.html`.
5. Add a CHANGELOG entry.
6. Run `node tools/probe-obstacle-engine.mjs` — all 14 checks should still pass.

## Adding to G15 / G16

The engine is opt-in. Game must:
1. Load script tags for `obstacle-engine.js` + `data/kids-questions.js` + `data/obstacles.js` + (optional) `data/routes.js`.
2. Call `ObstacleEngine.attach({...})` with game-specific pause/reward/HP hooks.
3. Decide a trigger model — fixed timer (G14 pattern), specific obstacle position (rail-based), or modal demand (G15 math quiz integration).

## Lessons referenced

- L177 — Registry freeze pattern, mutable ctx
- L178 — Auto-help at retry 3 prevents stuck kids
- L179 — DOM overlay pointer-events:none on root, auto on body
- L180 — Promise-based spawn for clean tranche extension
- L181 — Web Speech best-effort + silent fallback
