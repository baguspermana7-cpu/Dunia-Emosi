# SAVE_ENGINE_STANDARD.md

> Authoritative rules for Dunia Emosi level-progress and badge persistence.
> Created 2026-05-01 (Hotfix #115 follow-through) after standalone games were observed writing to legacy `dunia-0-progress` while the main app reads from avatar-keyed `dunia-avatar-{slug}-progress` — silently dropping stars for non-default avatars.

## TL;DR

Every game that records level completion MUST write through the shared save-engine:

```javascript
// Standard, all games:
window.saveLevelProgress(gameId, level, stars)

// G13c badge ledger:
const key = window.activeAvatarBadgeKey('g13c_badges')
localStorage.setItem(key, JSON.stringify(badges))
```

Direct `localStorage.setItem('dunia-0-progress', ...)` is forbidden except as a `// LEGACY-FALLBACK` else-branch.

## Why

Hotfix #103 (2026-04-28) introduced avatar-keyed save:
- Each player slot stores its own `dunia-avatar-{lion|rabbit|elephant|fox|frog|tiger|panda|koala}-progress` bucket.
- Two slots that pick the same animal share progress (intentional — siblings can co-op).
- `pkey()` in game.js resolves the active avatar; `migrateSlotToAvatar()` runs once on first load, gated by `dunia-migrated-v2` flag.

But standalone game pages (g6/g14/g15-pixi/g16-pixi/g19-pixi/g20-pixi/g21-pixi/g22-candy) didn't load `game.js` and continued writing to the legacy `dunia-0-progress` slot. Symptom: a kid plays g15 as the lion avatar → stars saved to `dunia-0-progress.g15.stars[lv]` → world map (which reads via `pkey('progress')` → `dunia-avatar-lion-progress`) shows zero stars.

`games/data/save-engine.js` (loaded into every standalone HTML at the top) provides:
- `window.saveLevelProgress(gameId, level, stars)` — writes to active avatar's bucket
- `window.activeAvatarBadgeKey(suffix)` — returns avatar-keyed badge key for g13c
- Both fall back to legacy keys if avatar isn't resolvable (e.g., during slot picker before any avatar selected)

## Required pattern

### Level progress (g6, g14, g15, g16, g19, g20, g21, g22)

```javascript
function saveProgress(stars) {
  const lv = (typeof cfg !== 'undefined' ? cfg.level : (typeof S !== 'undefined' ? S.level : 1)) || 1
  if (typeof window.saveLevelProgress === 'function') {
    window.saveLevelProgress('g15', lv, stars)
    return
  }
  // LEGACY-FALLBACK: save-engine not loaded
  try {
    const key = 'dunia-0-progress'
    const prog = JSON.parse(localStorage.getItem(key) || '{}')
    if (!prog.g15) prog.g15 = { completed: [], stars: {} }
    if (!prog.g15.completed.includes(lv)) prog.g15.completed.push(lv)
    if ((prog.g15.stars[lv] || 0) < stars) prog.g15.stars[lv] = stars
    localStorage.setItem(key, JSON.stringify(prog))
  } catch (_) {}
}
```

### G13c gym badges

```javascript
const _g13cBadgeKey = () => (typeof activeAvatarBadgeKey === 'function')
  ? activeAvatarBadgeKey('g13c_badges')
  : 'g13c_badges'

let badges = JSON.parse(localStorage.getItem(_g13cBadgeKey()) || '{}')
// ... earn badge ...
localStorage.setItem(_g13cBadgeKey(), JSON.stringify(badges))
```

## Required HTML setup

Every standalone game MUST load `data/save-engine.js` before any save-block code:

```html
<script src="data/save-engine.js?v=20260501h" defer></script>
```

The script is small (~3 KB, no dependencies) and exposes its API on `window` synchronously after parse.

## Migration (one-shot, on app boot)

`game.js`'s `migrateSlotToAvatar()` runs once per browser, gated by `dunia-migrated-v2` flag:

1. For each slot in `dunia-players`:
   - For each subkey in `['progress','xp','achievements','streak','best-stars']`:
     - Read `dunia-{slotIdx}-{key}` (legacy)
     - Write to `dunia-avatar-{slug}-{key}` (new), merging if both exist
2. **g13c_badges special case** (Hotfix #115 follow-through): the global `g13c_badges` key (pre-#103) is copied to per-avatar keys for ALL 8 animals so existing badges follow the user across avatars.

If `localStorage.removeItem('dunia-migrated-v2')` is called manually, migration re-runs but `_mergeProgress()` keeps the higher star count per level / sums xp / unions completed — safe to re-run.

## Forbidden patterns

```javascript
// FORBIDDEN: direct slot-0 write outside legacy fallback
localStorage.setItem('dunia-0-progress', JSON.stringify(prog))

// FORBIDDEN: direct global g13c_badges write
localStorage.setItem('g13c_badges', JSON.stringify(badges))
```

The regression script `scripts/check-regressions.sh` rule `SAVE-AVATAR-KEYED` catches the first. Annotate legitimate else-branch fallbacks with `// LEGACY-FALLBACK` (or use the existing `if (typeof window.saveLevelProgress === 'function')` guard pattern).

## Helper inventory

| API | File | Purpose |
|---|---|---|
| `window.saveLevelProgress(gameId, level, stars)` | `games/data/save-engine.js` | Avatar-keyed level save + sessionStorage propagation |
| `window.activeAvatarBadgeKey(suffix)` | `games/data/save-engine.js` | Returns `dunia-avatar-{slug}-{suffix}` |
| `pkey(suffix)` | `game.js` | Internal main-app helper (avatar-keyed key resolver) |
| `migrateSlotToAvatar()` | `game.js` | One-shot legacy → avatar migration |
| `_mergeProgress(a, b, kind)` | `game.js` | Star/xp/completed merge logic |

## Audit history

| Hotfix | Sites covered | Status |
|---|---|---|
| #103 | Avatar-keyed scheme introduced; main app `pkey()` + migration | ✅ |
| #115 (`a152b8d`) | save-engine.js created; g6 + g13c wired | ✅ partial |
| #115 follow-through (this) | g14 + g15-pixi + g16-pixi + g19-pixi + g20-pixi + g21-pixi + g22-candy refactored; `migrateSlotToAvatar` extended for g13c_badges | ✅ |

## CI enforcement

`scripts/check-regressions.sh` rule `SAVE-AVATAR-KEYED` scans the 8 standalone games for `localStorage.setItem('dunia-0-progress'` writes and requires the file ALSO contains a `window.saveLevelProgress` or `saveLevelProgress(` reference (proving the new pattern is in use, with the legacy write being a fallback).

## See also

- `LESSONS-LEARNED.md` — (to be added) L62 on save-key drift
- `REGRESSION_CHECKS.md` — full list of regression rules
- `games/data/save-engine.js` — implementation
- `game.js` `migrateSlotToAvatar()` — boot-time migration
