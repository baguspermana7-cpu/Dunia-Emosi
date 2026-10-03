# Sub-Game PRD --- Mojo Swoptops: 3-Lane Rescue Chase

**Type:** Embedded gameplay module, not standalone game\
**Parent:** *Mojo Swoptops: Swop, Plan & Rescue*\
**Target:** Grade 1--2 SD (\~6--8 years)\
**Camera:** third-person rear chase POV\
**Core:** 3 logical lanes\
**Session:** 60--180 seconds

## 1. Role in the Main Game

This module appears only when the story needs a chase, interception,
urgent delivery, runaway-cargo recovery, suspect pursuit, or rapid
rescue. It changes pacing after the main grid/programming gameplay
without replacing it.

`GRID/PUZZLE → STORY EVENT → SWOP → CHASE → STORY PAYOFF → RETURN TO MAIN LEVEL`

Player fantasy: **choose the correct Mojo form, chase the target, read
three lanes, collect useful items, avoid obstacles, use a rescue gadget,
and complete the story objective.**

## 2. Entry Sequence

1.  Parent-level objective completes.
2.  Short cutscene creates urgency---for example, a cartoon robber
    escapes with an important item.
3.  Bo gives one short instruction.
4.  Player selects Racer/Monster/other suitable Swop-Top.
5.  Transformation animation.
6.  Camera swings behind Mojo.
7.  Three lanes establish visually.
8.  2--3 second control tutorial.
9.  Chase begins.

The transition must feel like the **same level continuing**.

## 3. Core Loop

``` text
TARGET AHEAD
→ READ LEFT/CENTER/RIGHT
→ CHANGE LANE
→ COLLECT STARS / POWER BOX
→ AVOID OBSTACLE
→ BOOST OR RECOVER
→ CLOSE DISTANCE
→ GET CAPTURE GADGET
→ LOCK TARGET
→ USE GADGET
→ SAFE CAPTURE
→ CUTSCENE
→ RETURN TO PARENT LEVEL
```

## 4. Camera

Mojo occupies the lower 20--30% of screen. Camera is slightly elevated
behind the vehicle with mild downward angle. All three lanes, target,
upcoming obstacles and road curvature must remain readable.

Use gentle lateral follow, slight FOV expansion during boost, no
aggressive roll, and an optional reduced-motion mode.

``` text
┌─────────┬─────────┬─────────┐
│  LEFT   │ CENTER  │  RIGHT  │
└─────────┴─────────┴─────────┘
```

Road geometry may curve visually while gameplay remains three logical
lanes.

## 5. Controls

-   Swipe Left → one lane left.
-   Swipe Right → one lane right.
-   Tap/Hold Boost → temporary acceleration.
-   Tap Gadget → contextual mission action.
-   Accessibility alternative: large `[LEFT] [BOOST/ACTION] [RIGHT]`
    buttons.

Lane transition target: **250--400 ms**. Forward movement is automatic;
the child controls lane and tactical actions rather than a realistic
throttle.

## 6. Speed States

  State        Relative Speed Trigger
  ---------- ---------------- ----------------
  Recovery            65--75% collision
  Normal                 100% default
  Boost             120--140% boost
  Climax             scripted final approach

Responsiveness takes priority over realistic physics.

## 7. Target & Rubber-Banding

Target remains visible whenever practical. A simple distance meter shows
`MOJO ●──────● TARGET`.

Clean driving, stars and boosts close the distance; collisions
temporarily increase it. For young players the target must never become
permanently unreachable. Repeated mistakes automatically slow the
target, reduce obstacle pressure, and make the next useful pickup easier
to obtain.

## 8. Lane Objects

**Stars:** positive collectibles, route guides, pattern elements and
optional gadget-meter charge.

**Obstacles:** crate, barrel, cone cluster, hay bale, rock, branch,
puddle/mud, construction barrier, snow pile.

**Gadget boxes:** visually distinct glowing boxes containing Capture
Rocket, Shield, Boost, Magnet, Tow Hook, Water Burst, Star Magnet or
Repair Kit.

Spawn validation must always preserve a reasonable route unless a
deliberate gadget interaction is being taught.

## 9. Collision / "BROK!" Feedback

Collision is funny and recoverable:

1.  impact;
2.  large **BROK!** burst;
3.  harmless chunky debris;
4.  short camera shake;
5.  Mojo bounces/leans;
6.  2--4 cartoon stars orbit the cabin;
7.  temporary speed reduction;
8.  steering remains available;
9.  recovery animation;
10. normal speed resumes.

Target recovery duration: **1.0--1.8 s**. Repeated hits must never stack
into a long loss of control.

## 10. Capture Gadget

The robber mission uses a **cartoon capture gadget**, not realistic
weapon damage.

`Collect box → gadget activates → approach target → lock-on appears → tap → rocket deploys safe stopping effect`

Preferred effects: sticky foam, expanding safety net, cartoon wheel
clamp, inflatable barrier, or magnetic stop. No precision aiming is
required.

## 11. Robber Chase Beat Sheet

1.  **Escape:** robber vehicle takes story item.
2.  **Swop:** Mojo changes to Racer/appropriate form.
3.  **Tutorial:** star trail teaches Left → Center → Right.
4.  **Obstacles:** generous crate spacing.
5.  **Mixed route:** stars + hazards.
6.  **Collision:** BROK → dizzy → slowdown → recovery.
7.  **Gadget pickup:** glowing Capture Rocket box.
8.  **Close gap:** clean driving + boost.
9.  **Lock-on:** target enters capture range.
10. **Capture:** child taps gadget.
11. **Resolution:** target stops safely; police/rescue team arrives;
    item recovered.
12. **Return:** results pass back to parent mission.

## 12. Educational Variants

-   **Number lane:** choose the lane containing the requested answer.
-   **Pattern chase:** predict next Left/Center/Right position.
-   **Letter collection:** collect `R → O → P → E` in order.
-   **Quantity:** collect the required number of energy stars.
-   **Language:** narrated `Left/Right` or `Kiri/Kanan`.

Wrong educational lane gives no bonus rather than causing a hard
failure.

## 13. Difficulty Progression

-   **Tier A:** slow, stars guide lanes, almost no hazards.
-   **Tier B:** moving target + crates + one gadget.
-   **Tier C:** mixed star/obstacle paths and curves.
-   **Tier D:** mud, snow, shallow water, construction debris.
-   **Tier E:** multiple useful gadgets.
-   **Tier F:** lightweight math/pattern/language lane choices.

Increase one major difficulty axis at a time.

## 14. Swop Variants

  Form        Chase behavior
  ----------- ----------------------------------
  Racer       speed + boost
  Monster     rough terrain + light smash
  Fire        pursuit + contextual spray
  Chopper     3 aerial corridors
  Boat        3 river channels
  Snow form   snow-road pursuit
  Tow         catch + attach to runaway object
  Jet         high-speed aerial pursuit

Generic chase logic must be separate from the active Swop ability set.

## 15. HUD

Keep it minimal:

-   Top center: target-distance/progress.
-   Top corner: star count / essential mission count only.
-   Bottom: Left, Boost/Action, Right.
-   One large contextual gadget button.
-   Small Pause button.

**No shop, purchase UI, ads, inventory grid, or unnecessary
statistics.**

## 16. Feedback

-   Star: pop + sparkle + chime.
-   Gadget: box burst + icon flies to HUD.
-   Boost: speed lines + mild FOV increase + trail.
-   Collision: BROK + debris + shake + dizzy stars.
-   Lock: soft reticle + pulse.
-   Capture: 1--2 second cinematic safe-stop sequence.

Bo dialogue during chase stays short: "Left!", "Watch out!", "Rocket
ready!", "We're close!"

## 17. Accessibility & Failure Philosophy

Required: button alternative to swipe, no color-only information,
adjustable motion, reduced shake, no rapid-tap requirement, generous
reaction distance, optional lane assist, narrated objective, pause
anytime.

There is no ordinary Game Over:

`HIT → SLOW → RECOVER → CONTINUE`

After repeated difficulty: target slows, obstacle density drops, safe
star paths increase, required gadget can move toward center lane, and Bo
gives a concise hint.

## 18. Rewards

Story progression requires only chase completion. Optional mastery can
track stars, low collisions, educational objective and hidden
collectible. Perfect driving is never required.

## 19. Runtime State Machine

``` text
INACTIVE
→ INTRO_CUTSCENE
→ TRANSFORM
→ CHASE_TUTORIAL
→ CHASE_ACTIVE
   ↳ COLLISION_RECOVERY
   ↳ PICKUP
   ↳ BOOST
   ↳ EDUCATION_EVENT
→ CAPTURE_RANGE
→ GADGET_READY
→ CAPTURE_SEQUENCE
→ RESOLUTION_CUTSCENE
→ RESULT
→ RETURN_TO_PARENT_LEVEL
```

## 20. Parent Integration Contract

Parent passes:

``` yaml
chase_id:
environment:
mojo_form:
target_type:
speed_profile:
obstacle_set:
collectible_set:
gadget:
education_payload:
story_intro:
story_outro:
reward:
return_checkpoint:
```

Module returns:

``` yaml
completed:
stars_collected:
collisions:
gadget_used:
education_result:
optional_objectives:
reward_result:
```

## 21. Example Configuration

``` yaml
chase_id: ROBBER_CHASE_01
environment: swoppiton_coastal_road
mojo_form: racer
target_type: robber_vehicle
lanes: 3
duration_target_seconds: 120

obstacles: [crate, barrel, road_barrier]
collectibles: [star, boost]

gadget:
  type: capture_rocket
  pickup_required: true
  auto_lock: true
  capture_effect: safety_net

education:
  enabled: true
  type: number_lane
  difficulty: grade_1_2

assist:
  rubber_band: true
  auto_recovery: true
  reduce_obstacles_after_failures: 3

resolution:
  police_arrival: true
  return_to_parent_level: true
```

## 22. Technical Components

`ChaseGameManager`, `LaneController`, `RearPOVCamera`,
`AutoForwardMovement`, `LaneObjectSpawner`, `ObstacleController`,
`CollectibleController`, `CollisionFeedbackController`,
`ChaseTargetController`, `RubberBandController`, `GadgetController`,
`LockOnController`, `EducationEventController`, `ChaseHUD`,
`ChaseAudioController`, `ChaseVFXController`, `ChaseResultBridge`.

Use object pooling for stars, crates, barriers, debris, pickups and VFX.

## 23. Critical Edge Cases

Handle:

-   repeated swipe during lane transition;
-   pickup and collision on same frame;
-   boost during dizzy state;
-   target temporarily hidden by road curve;
-   gadget fired at edge of capture range;
-   pause/backgrounding during capture;
-   education prompt while hazard approaches;
-   impossible spawn combinations;
-   object-pool exhaustion.

Never spawn three simultaneous blocking obstacles unless the center
object is an intentional pass-through/gadget mechanic.

## 24. Acceptance Criteria

Vertical slice must demonstrate:

-   rear POV;
-   three stable lanes;
-   swipe + button controls;
-   automatic forward motion;
-   visible chase target and distance meter;
-   stars;
-   crates;
-   BROK collision;
-   debris + dizzy effect + slowdown + recovery;
-   gadget pickup;
-   Capture Rocket HUD;
-   auto-lock;
-   safe target capture;
-   police-arrival payoff;
-   return to parent level;
-   one educational lane event;
-   rubber-band assist;
-   stable mobile performance.

## 25. Recommended First Integration

``` text
MAIN GRID PUZZLE
→ clear blocked road
→ story item stolen
→ SWOP RACER
→ 3-LANE ROBBER CHASE
→ collect stars
→ avoid crates
→ obtain Capture Rocket
→ catch robber
→ police arrive
→ recover item
→ RETURN TO MAIN LEVEL
→ final rescue/repair puzzle
```

## 26. Design Identity

This is **not a separate racing game**. It is a reusable action sequence
inside the Mojo adventure:

**STORY URGENCY → SWOP → REAR-POV CHASE → 3-LANE DECISIONS →
COLLECT/AVOID → GADGET → SAFE CAPTURE → STORY CONTINUES.**
