# G16 Selamatkan Kereta — State Machine Codemap

**Last Updated:** 2026-04-22  
**File**: `games/g16-pixi.html` (~2000 lines)  
**Game**: Railway adventure with obstacle course, character train, 4-obstacle stations, gym badge rewards.

---

## State Machine Overview

All train state transitions are **position-deterministic** or **frame-counted**, never timer-based. The ticker drives updates 60fps; game state depends on checkpoint crossing (worldX position) or accumulated frame counts.

```
┌─────────────┐
│   MOVING    │ ← train accelerates toward next obstacle
└──────┬──────┘
       │ obstacle within stop distance
       ↓
┌──────────────┐
│   STOPPED    │ ← quiz active; train waiting for answer
└──────┬───────┘
       │ answer correct
       ↓
┌──────────────┐
│   CLEARING   │ ← obstacle being removed (mostly transition state)
└──────┬───────┘
       │ obstacle cleared
       ↓
┌──────────────┐
│   BOOSTING   │ ← all obstacles cleared; turbo mode active
└──────┬───────┘
       │ boost timer expires OR next obstacle encountered
       ↓ back to MOVING (or STOPPED if obstacle)
       │
       │ [all obstacles cleared + worldX past threshold]
       ↓
┌──────────────┐
│   ARRIVING   │ ← positional brake engaged; creep to station
└──────┬───────┘
       │ worldX ≤ ARRIVAL_SNAP_DIST from STATION_X
       ↓
┌──────────────┐
│   ARRIVED    │ ← celebration frame counter ticks
└──────┬───────┘
       │ celebrationFrame ≥ CELEBRATION_FRAMES (~2s @ 60fps)
       ↓
    SHOW WIN (modal) + endGame()
```

---

## State Details & Trigger Conditions

### MOVING
**Train in motion, no quiz active.**

```js
S.trainState = 'MOVING'
speed = 2  // base acceleration toward next obstacle
```

**Transitions**:
- → STOPPED: `dist to next obstacle ≤ stopDist` (line 1332)
- → BOOSTING: `cleared === totalObstacles` and timer expires or boost speed engaged (line 1436)
- → ARRIVING: positional checkpoint after all obstacles cleared (line 1418, 1437)

**Visual**: status text off, gentle smoke, normal wheel rotation.

---

### STOPPED
**Quiz panel visible; train halted; player answering.**

```js
S.trainState = 'STOPPED'
speed = 0
S.currentObstacleIdx = index of current obstacle
showQuizPanel(obstacle)  // modal with question
```

**Invariants**:
- Exactly one quiz panel visible
- Train does not advance
- Answer timer ticking (see quiz implementation in `game.js`)

**Transitions**:
- → MOVING: `clearObstacle(obstacle)` called (line 1653) + quiz dismissed
- → MOVING: Bablas-recovery unstick (line 1346) if quiz missing >1.2s
- → DEAD: `triggerDeath()` if train overshoots station

**Visual**: status text "🚨 Jawab!", reduced steam, train at rest.

---

### CLEARING
**Transient state during obstacle removal animation.**

```js
S.trainState = 'CLEARING'
// managed by clearObstacle() function (line 1614)
// pops obstacle from S.obstacles array
// checks if more obstacles remain
```

**Transitions**:
- → MOVING: immediately if more obstacles or not at boost threshold (line 1660)
- → BOOSTING: if `cleared === totalObstacles` and ready for boost (line 1436)

**Visual**: particle burst (explosion effect), obstacle disappears.

---

### BOOSTING
**All obstacles cleared; turbo mode active.**

```js
S.trainState = 'BOOSTING'
S.boostTimer = 2  // seconds
speed = 4  // 2× acceleration
```

**Invariants**:
- `S.cleared === S.totalObstacles` (all questions answered)
- Train in visual turbo mode (speed-lines animation, boosted smoke rate)
- Duration: `boostTimer` (2s max) or until next obstacle

**Transitions**:
- → MOVING: `boostTimer ≤ 0` (line 1328) or encountered obstacle (line 1326)
- → ARRIVING: positional checkpoint `worldX > STATION_X - W*0.8` (line 1437)

**Visual**: 💨 turbo status text, speed-lines visible, 0.85 target scale, high ember rate.

---

### ARRIVING
**Positional brake engaged; creeping to station.**

```js
S.trainState = 'ARRIVING'
S.celebrationFrame = 0  // reset counter

// Brake curve (line 1350-1363):
if (dist > ARRIVAL_SNAP_DIST) {
  speed = Math.max(
    ARRIVAL_MIN_CREEP,           // 35 px/s floor
    baseSpeed * (dist / ARRIVAL_BRAKE_DIST, 1))
  // Smooth deceleration from baseSpeed → ARRIVAL_MIN_CREEP
  // as distance to STATION_X shrinks
}

// Snap to station when within 1 px (line 1362)
if (dist ≤ ARRIVAL_SNAP_DIST) {
  S.worldX = STATION_X
  S.trainState = 'ARRIVED'
  S.celebrationFrame = 0
}
```

**Constants** (line 490-492):
```js
const ARRIVAL_BRAKE_DIST = 300     // px — brake ramp distance
const ARRIVAL_SNAP_DIST = 1        // px — snap threshold
const ARRIVAL_MIN_CREEP = 35       // px/s — minimum progress speed
```

**Invariants**:
- No setTimeout; progression is frame-deterministic
- Guaranteed to reach station (floor speed prevents stall)
- Brake curve is smooth polynomial falloff
- Single-frame snap when threshold crossed

**Transitions**:
- → ARRIVED: position snap (line 1362-1364)
- → STOPPED: Bablas-recovery clamp (line 1407) if train overshoots from physics error

**Visual**: reduced steam, creeping speed, status text off.

---

### ARRIVED
**Station reached; celebration counter ticking.**

```js
S.trainState = 'ARRIVED'
S.celebrationFrame += (dt * 60)  // increment per frame (line 1373)

// Check for win condition (line 1374)
if (S.celebrationFrame >= CELEBRATION_FRAMES && !S.winShown) {
  showWin()  // modal + end game
  S.winShown = true
}
```

**Constants** (line 487):
```js
const CELEBRATION_FRAMES = 120  // ~2 seconds @ 60fps
```

**Invariants**:
- Frame counter is frame-rate independent (multiplied by `dt*60`)
- Win modal fires exactly once (guarded by `!S.winShown`)
- Pause/unpause doesn't break timing (frame accumulation pauses with ticker)
- No setTimeout; win is deterministic

**Visual**: victory animation (train spinning, particles), celebration message ("Selamat!"), level-up banner.

---

## Bablas-Recovery Safeguard (Line 1389-1407)

**Problem**: Station overshoot on physics errors (dt spikes, tab-switch teleport).  
**Solution**: Positional clamp once in ARRIVING/ARRIVED phase.

```js
const arrivalPhase = S.trainState === 'ARRIVING' || S.trainState === 'ARRIVED'
if (arrivalPhase && S.worldX >= STATION_X) {
  if (S.trainState === 'ARRIVING' && !S.arrivedFlag) {
    S.worldX = STATION_X
    S.trainState = 'ARRIVED'
    S.celebrationFrame = 0
    // No setTimeout here — ARRIVED state handles win modal
  }
  if (S.worldX > STATION_X + 40) {
    S.trainState = 'STOPPED'  // rewind to quiz
  }
}
```

**Trigger**: Detects `worldX >= STATION_X` and corrects.  
**Outcome**: Train cannot overshoot or get stuck; recovery is immediate.

---

## Key Functions

### `triggerArrival()` (Line 1763)
```js
function triggerArrival() {
  if (S.trainState === 'ARRIVING' || S.trainState === 'ARRIVED' || S.gameOver) return
  S.trainState = 'ARRIVING'
  S.celebrationFrame = 0
  // No setTimeout — arrival is driven by position + frame counter in updateTrain
}
```

**Called by**:
- Line 1418: Proximity threshold check (worldX near station)
- Line 1437: Boosting → ARRIVING transition

**Guards**: Idempotent — safe to call multiple times.

---

### `clearObstacle(obstacle)` (Line 1614)
```js
function clearObstacle(obstacle) {
  S.obstacles = S.obstacles.filter(o => o !== obstacle)
  S.cleared++
  spawnParticleBurst(obstacle.x, obstacle.y, 'success')  // VFX
  
  if (S.obstacles.length === 0) {
    // All cleared — ready to boost or arrive
  } else {
    S.trainState = 'MOVING'  // seek next obstacle
  }
}
```

**Called by**: Quiz answer-correct callback in `game.js`.

---

### `updateTrain(dt)` (Line 1200)
**Main game loop update.** Runs every tick (PixiJS `ticker.add()`).

**Orchestrates**:
1. Speed curve based on `trainState` (lines 1222, 1288)
2. Position update + physics (lines 1240-1280)
3. State-machine transitions (lines 1320-1437)
4. Bablas-recovery clamp (lines 1389-1407)
5. Train animation + visual effects (lines 1445-1502)
6. Audio (smoke puffs, etc.)

**Key checkpoint**: Frame counter in ARRIVED state (line 1373).

---

## Shared State (`S` object)

Key fields relevant to state machine (line 470-478):

```js
S = {
  trainState: 'MOVING',            // current state string
  cleared: 0,                      // obstacles answered correctly
  totalObstacles: 4,               // total obstacles in level
  obstacles: [...],                // remaining obstacle objects
  currentObstacleIdx: -1,          // focus for quiz
  celebrationFrame: 0,             // frame counter in ARRIVED state
  worldX: 0,                       // train x position
  gameOver: false,
  winShown: false,                 // guard for showWin modal
  arrivedFlag: false               // legacy; mostly redundant now
}
```

---

## Invariants (Do Not Break)

1. **No setTimeout for state transitions** — All state changes keyed to position or frame count.
2. **Celebration is frame-counted, not timed** — Pause/resume safe; frame accumulation pauses with ticker.
3. **Single quiz visible at a time** — Only when `trainState === 'STOPPED'`.
4. **Bablas-recovery is positional** — Clamp corrects overshoot; no timeout.
5. **ARRIVING → ARRIVED is deterministic** — Snap distance is 1px; floor speed guarantees progress.
6. **showWin fires once** — Guarded by `!S.winShown` flag + frame threshold.

---

## Testing Checklist

- [ ] Start level; train advances to first obstacle and STOPS (quiz appears)
- [ ] Answer correct; obstacle clears; train resumes MOVING
- [ ] Clear all obstacles; train enters BOOSTING (speed-lines visible)
- [ ] Boost duration expires; train resumes MOVING or ARRIVING
- [ ] Train enters ARRIVING phase; creeps smoothly at min speed
- [ ] Train snaps to station (worldX === STATION_X); enters ARRIVED
- [ ] Wait ~2s; win modal appears; "Selamat!" message displays
- [ ] Level advances or replay modal appears
- [ ] Pause game (ticker paused); celebrate timer does not advance
- [ ] Resume game; celebrate timer resumes from where it paused
- [ ] Simulate dt spike; train does not overshoot station (clamp catches it)

---

## Related Code

- **Position update**: `games/g16-pixi.html:1240-1280` (physics + interpolation)
- **Quiz panel**: `game.js:showQuizPanel()` (modal logic)
- **Train renderer**: `games/train-character-sprite.js` (sprite + wheel animation)
- **Responsive scaling**: `games/g16-pixi.html:buildTrain()` + `CharacterTrain.scaleConfig()`
- **Win modal**: `games/game-modal.js:GameModal.show()` (scoring + UI)

