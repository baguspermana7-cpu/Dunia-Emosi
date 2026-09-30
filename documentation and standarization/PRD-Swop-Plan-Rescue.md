# PRD --- Mojo Swoptops: Swop, Plan & Rescue

**Version:** 1.0\
**Status:** Pre-production / Game Design Specification\
**Target:** Grade 1--2 SD (approx. 6--8 years)\
**Platform:** Touch-first tablet/mobile/web\
**Genre:** Educational visual-programming puzzle + rescue adventure\
**Core fantasy:** *I am Bo's engineering partner. I decide what Mojo
should become, plan the rescue, test the plan, debug mistakes, and save
Swoppiton.*

------------------------------------------------------------------------

# 1. Executive Summary

The game converts the defining Mojo Swoptops fantasy---changing Mojo's
functional top to solve different problems---directly into gameplay. It
is **not** a quiz app with Mojo artwork.

The dominant interaction is a top-down visual grid. The child observes a
problem, decides whether Mojo needs to transform, chooses a Swop-Top,
assembles visual commands, presses **RUN**, watches Mojo execute
command-by-command, and edits/debugs the plan if it fails.

A mission can require several transformations:

`NORMAL → DOZER → FIRE → CHERRY PICKER → RESCUE`

Two connected questions drive play:

1.  **Capability:** What should Mojo become?
2.  **Algorithm:** What should Mojo do, and in what order?

Math, Bahasa Indonesia, English, tool knowledge, engineering, shapes and
measurement are embedded into mission actions rather than detached
worksheets.

# 2. Product Vision

## 2.1 Product Promise

> **Every meaningful problem should make the child think: "What should
> Mojo become, and what should Mojo do next?"**

## 2.2 Design Pillars

1.  **Swop is gameplay.** Transformation changes available verbs; it is
    never merely cosmetic.
2.  **Plan before acting.** Main loop is Observe → Program → Run → Watch
    → Debug.
3.  **Learning changes the world.** If eight bolts are required and five
    exist, collect three more; do not merely tap "3".
4.  **Mistakes produce information.** No harsh Game Over. Failed plans
    expose the problem and remain editable.
5.  **Multiple solutions where appropriate.** Push a rock, jump it, fly
    around it, or build around it when the scenario allows.
6.  **Varied cognitive rhythm.** Alternate grid planning with
    transformation, action, building, tools, story and educational
    microgames.
7.  **Low reading burden.** Icons, animation, narration and
    environmental cues carry instructions.
8.  **Child agency.** Optional collectibles and alternative routes
    reward exploration without blocking progress.

# 3. Target Player and Learning Goals

Primary audience: Grade 1--2 SD, approximately 6--8 years old. Design
for mixed reading fluency, arithmetic speed, working memory and motor
precision.

  Content              Target Duration
  ------------------ -----------------
  Tutorial puzzle             1--3 min
  Quick mission               3--5 min
  Standard mission           6--10 min
  Story mission              8--12 min
  Planning burst            30--90 sec

Learning domains: sequencing, algorithms, spatial reasoning, debugging,
arithmetic, Bahasa Indonesia, basic English, tool/function recognition,
engineering cause-and-effect, classification, measurement, pattern
recognition and creative problem solving.

# 4. Core Gameplay Loop

``` text
EMERGENCY / STORY
      ↓
OBSERVE WHOLE MAP
      ↓
IDENTIFY PROBLEM
      ↓
DO WE NEED TO SWOP?
      ↓
SELECT SWOP-TOP
      ↓
BUILD COMMAND SEQUENCE
      ↓
RUN
      ↓
WATCH COMMAND-BY-COMMAND
      ↓
SUCCESS? ── NO → DEBUG → EDIT → RUN AGAIN
      │
     YES
      ↓
CONTEXTUAL ACTION / EDUCATION MICROGAME
      ↓
NEW COMPLICATION? ── YES → REASSESS → RE-SWOP → REPROGRAM
      │
      NO
      ↓
FINAL RESCUE → CELEBRATION → REWARD
```

**Signature requirement:** Swop commands may occur inside the program
sequence, not only before a level.

# 5. Primary Grid System

## 5.1 Board

Default camera: top-down/high-angle. Logical grid sizes:

  Stage      Grid
  ---------- -----------
  Tutorial   3×3 / 4×4
  Early      4×4 / 5×5
  Standard   5×5 / 6×6
  Advanced   6×6 / 7×7

Grid lines should visually belong to roads, paving, water, grass or
workshop floors rather than look like a spreadsheet.

## 5.2 Mojo Orientation

Mojo occupies one cell and has a heading. Core movement: **Forward, Turn
Left, Turn Right**; Backward unlocks later. Turning changes heading
without moving.

## 5.3 Command Palette

Base commands:

-   ↑ Forward
-   ↶ Turn Left
-   ↷ Turn Right
-   🔄 Swop
-   ✋ Pick Up
-   📦 Drop
-   🛟 Rescue
-   🔘 Activate
-   🧰 Use Tool

Vehicle-specific commands appear only when relevant.

## 5.4 Sequence Slots

Early game: 4 slots. Progression: 6. Later: 9. Advanced programs may
scroll or use nested Repeat blocks.

Support: - drag command to slot; - tap command → tap slot; - reorder; -
replace; - delete; - undo; - clear; - Run.

## 5.5 Run Execution

RUN locks editing, highlights the active command, animates Mojo, applies
the world reaction, marks command completion and advances. Timing must
let the child understand **which instruction caused which result**.

# 6. Swop-Top Functional System

  ------------------------------------------------------------------------------------------
  Swop-Top       Function            Unique         Typical Problem   Learning Affinity
                                     Commands                         
  -------------- ------------------- -------------- ----------------- ----------------------
  Fire           extinguish/rescue   Spray, Ladder  fire              quantity, subtraction

  Dozer          push/clear          Push, Clear    rocks/debris      counting, sorting

  Crane          heavy manipulation  Hook, Lift,    cargo/tree        weight, balance
                                     Rotate, Drop                     

  Chopper        aerial access       Take Off,      blocked/high      spatial reasoning
                                     Land, Rope,                      
                                     Air Rescue                       

  Racer          speed/intercept     Boost, Brake   chase             quick math/patterns

  Boat           water traversal     Tow, Anchor,   river/flood       prediction/direction
                                     Water Rescue                     

  Dumper         material transport  Load, Tip      construction      capacity/addition

  Cherry Picker  vertical reach      Raise, Lower,  roof/tree         height/number line
                                     Rescue                           

  Wrecking Ball  demolition          Swing, Hit     unsafe obstacle   shapes/totals

  Jumper         cross gaps          Jump, Long     holes/platforms   sequence/odd-even
                                     Jump                             

  Monster        rough terrain       Climb, Pull    mud/slope         route planning

  Jet            rapid aerial travel Boost, Air     distant chase     patterns/navigation
                                     Collect                          
  ------------------------------------------------------------------------------------------

Final names/abilities must follow approved franchise assets/licensing.

## 6.1 Mid-Sequence Swop

``` text
01 SWOP → DOZER
02 FORWARD
03 PUSH
04 PUSH
05 SWOP → FIRE
06 FORWARD
07 SPRAY
08 SWOP → CHERRY PICKER
09 RAISE
10 RESCUE
```

This is a signature mechanic.

## 6.2 Incorrect Swop

Never respond with "WRONG". If Racer is chosen for a fire:

> "Racer Mojo is super fast! But how will we put out the fire?"

Show the missing capability visually, then return to selection.

## 6.3 No-Swop Decision

Some problems deliberately require no transformation. If Mojo already
has the needed capability, unnecessary transformation may consume a
command but should not automatically fail the mission.

# 7. Problem--Capability Matrix

  Problem          Capability          Possible Solution
  ---------------- ------------------- --------------------------
  Fire             extinguish          Fire
  Heavy rock       push/lift           Dozer / Crane
  Fallen tree      push/lift           Dozer / Crane
  High rescue      reach/fly           Cherry Picker / Chopper
  Flood            water/fly           Boat / Chopper
  Gap              jump/fly/build      Jumper / Chopper / Build
  Mud              traction            Monster
  Runaway object   speed               Racer / Jet
  Cargo            carry               Dumper
  Unsafe wall      controlled impact   Wrecking Ball

Each level definition declares objectives, valid capabilities,
alternatives, blocked cells, educational gates, collectibles and
recommended command budget.

# 8. Tile/Object Library

**Terrain:** road, grass, sand, mud, water, ice, bridge, ramp,
current/conveyor, one-way path.

**Obstacles:** rock, tree/log, fire, water, gap, crate, debris, barrier,
locked gate, high platform.

**Interactions:** person, animal, cargo, tool, switch, key, repair
point, build point, delivery zone, pickup/drop zone.

**Education:** number, equation, letter, word fragment, shape, color,
measurement, pattern, category.

**Rewards:** star, blueprint fragment, gear, bolt, sticker, cosmetic
workshop object. Optional rewards never block core progression.

# 9. Debugging and Failure UX

No traditional Game Over for logic errors. When Mojo cannot execute a
command:

1.  pause execution;
2.  highlight failed command;
3.  highlight relevant object/capability;
4.  give one short Bo clue;
5.  return to editor with sequence intact;
6.  allow modification and rerun.

Example:

> "Dozer Mojo can push rocks, but she can't spray water. What could we
> change?"

## 9.1 Hint Ladder

1.  no hint;
2.  pulse failed command;
3.  pulse relevant obstacle;
4.  show required capability icon;
5.  highlight candidate Swop-Tops;
6.  ghost-place next correct command.

Do not reveal the whole solution after one mistake.

# 10. Educational System

## 10.1 Mathematics

Target content: - counting; - addition/subtraction; - missing numbers; -
comparison; - number sequences; - odd/even; - grouping; - length and
height; - weight comparison; - capacity; - basic geometry.

**World-action rule:** prefer physical representation over detached
multiple choice.

Bad: `8 - 5 = ?` → tap 3.\
Better: Repair needs 8 bolts, toolbox has 5 → collect exactly 3 more
bolts.

## 10.2 Bahasa Indonesia

Mechanics: - susun huruf; - gambar--kata matching; - collect letters in
order; - simple syllables; - tool/object vocabulary; - instruction
comprehension.

Example: `L-U-P-A → PALU`; the acquired Palu then becomes usable in the
repair.

## 10.3 English

Early vocabulary: HAMMER, ROPE, WHEEL, FIRE, WATER, PUSH, LIFT, LEFT,
RIGHT. Pair words with voice pronunciation, picture and physical
consequence.

## 10.4 Engineering / Practical Knowledge

Child-safe abstract associations: - hammer → nail; - screwdriver →
screw; - wrench → nut/bolt; - saw → wood; - rope → pull/tow; - ladder →
reach; - pump → inflate; - crane → lift.

Do not provide realistic unsafe operating instructions.

## 10.5 Computational Thinking

Progressively teach sequence, orientation, decomposition, cause/effect,
debugging, optimization, repetition and condition/action without
requiring programming terminology.

# 11. Contextual Microgame Library

Grid programming remains dominant; microgames prevent monotony and make
the rescue tangible.

1.  **Pick the Right Tool** --- select a tool for a visible problem,
    then use it.
2.  **Word Scramble** --- `M M H A E R → HAMMER`.
3.  **Letter Route** --- collect R→O→P→E in order on the grid.
4.  **Count & Collect** --- collect exactly the missing quantity.
5.  **Measurement** --- gap 4 units; choose plank 2/4/6.
6.  **Shape Fit** --- match structural parts to silhouettes.
7.  **Pattern Repair** --- red→blue→red→blue→?
8.  **Crane Balance** --- combine weights to match load.
9.  **Sorting** --- Dozer pushes wood/rock/waste into correct zones.
10. **Repair Sequence** --- Inspect→Repair→Test; later five-step
    sequences.
11. **Build & Test** --- build bridge/ramp then test with simple
    physics.
12. **Math Route** --- route to correct equation result.
13. **Height Control** --- raise platform to correct numbered height.
14. **Water Quantity** --- allocate limited water to fire targets.
15. **Cargo Capacity** --- choose loads whose total matches capacity.
16. **Directional Listening** --- follow narrated left/right/forward
    instructions.
17. **Find the Missing Part** --- visual inspection puzzle.
18. **Memory Toolbox** --- remember 2--4 requested tools/items.
19. **Pattern Road** --- travel through the next valid item in a
    pattern.
20. **Sequence Cards** --- reorder repair/rescue steps.

# 12. Draw / Build / Test System

Creative building is a supporting mechanic.

Possible pieces: - beam/rectangle; - triangular support; - plank; -
wheel; - connector; - spring; - decorative sticker.

Simple evaluation: - path continuity; - basic support; - clearance; -
wheel contact; - approximate stability.

Do not simulate engineering-grade physics. Allow several successful
designs where practical.

A failed test should remain editable:

> "It needs more support!"

The learning message is **"My solution works"**, not "I guessed the
developer's exact hidden arrangement."

# 13. Mission Architecture

A standard mission contains 2--4 meaningful problem beats:

1.  emergency story;
2.  observe map;
3.  first capability decision;
4.  program sequence;
5.  Run;
6.  vehicle-specific action;
7.  complication;
8.  re-Swop;
9.  educational challenge;
10. harder grid plan;
11. climax rescue;
12. celebration/reward.

Typical mission: 1--3 transformations. Major story mission: 3--5.

# 14. Example Mission A --- School Fire Rescue

**Objective:** extinguish two fires and rescue Mia from a balcony.

1.  Emergency call reveals school, fire and Mia.
2.  Mojo begins in normal configuration.
3.  Child identifies extinguishing capability and inserts `SWOP → FIRE`.
4.  Program: `SWOP FIRE → FORWARD → FORWARD → RIGHT → FORWARD → SPRAY`.
5.  Run command-by-command.
6.  Second fire needs 5 water units; local reserve has 2; child obtains
    3.
7.  Fire is extinguished but Mia is above reach.
8.  Re-Swop to Cherry Picker.
9.  Balcony marker is 6 m; child raises platform to 6.
10. Program: `FORWARD → RAISE → RESCUE`.
11. Return to safe zone; celebration.
12. Optional star is available through a longer route.

# 15. Example Mission B --- Storm Across Swoppiton

**Problem 1:** fallen rocks → `SWOP DOZER → FORWARD → PUSH → PUSH`.

**Problem 2:** building fire → `SWOP FIRE → TURN → FORWARD → SPRAY`.

**Problem 3:** child on roof → Cherry Picker or Chopper depending route.

**Problem 4:** flooded exit → Boat or Chopper.

The child learns to decompose one large emergency into several smaller
solvable problems.

# 16. Example Mission C --- Broken Playground

1.  Inspect playground and identify loose board.
2.  Tool choice: hammer/wrench/saw/screwdriver.
3.  Indonesian mode: `P-A-L-U`; English mode: `HAMMER`.
4.  Need 8 nails; only 5 available → collect 3.
5.  Tap-to-hammer repair.
6.  New problem: upper panel is too high.
7.  Swop Cherry Picker.
8.  Program route + Raise.
9.  Height sequence `2,4,6,?` → 8.
10. Final repair and animated playground test.

# 17. Multiple-Solution Puzzle Design

Example: rock blocks direct route.

-   **Dozer:** Swop → Push → continue.
-   **Jumper:** Swop → Jump.
-   **Chopper:** Swop → Take Off → fly over → Land.

All can succeed if level metadata permits. Different solutions may vary
in command count, animation, energy or collectible access. Never call a
valid creative solution "wrong" merely because it is not shortest.

# 18. Programming Progression

## World 1 --- Movement

Forward, Left, Right; 3--4 slots.

## World 2 --- Interaction

Pick, Drop, Rescue, Activate.

## World 3 --- Swop

Introduce functional transformation and one Swop per mission.

## World 4 --- Multi-Swop

Two capabilities in one mission/sequence.

## World 5 --- Repeat

`REPEAT ×2 / ×3 / ×4`.

## World 6 --- Conditional

Icon-led: `IF SEE 🔥 → SPRAY`; `IF ROCK → PUSH`.

## World 7 --- Optimization

Optional fewer-command challenge.

## World 8 --- Open Rescue

Multiple valid Swops/routes and optional objectives.

# 19. Difficulty Model

Difficulty is multi-axis; do not increase every axis simultaneously.

Variables: - grid size; - turns; - command slots; - objective count; -
Swop count; - obstacle count; - educational complexity; - decoy
Swop-Tops; - collectibles; - loops/conditions; - visible vs hidden
information.

**Ramp rule:** introduce one new concept in a low-pressure mission,
reinforce it twice, then combine it with one known mechanic.

# 20. Adaptive Assist

Potential signals: - repeated failure on same command; - hint usage; -
time-to-first-action; - sequence edits; - repeated arithmetic/language
error type.

Adaptive responses: - reduce decoys; - shorten sequence; - add direction
arrows; - narrate instruction; - highlight relevant cells; - provide
manipulatives for math; - simplify spelling temporarily.

Never label the child "slow", "bad" or similar.

# 21. Command Efficiency and Stars

Mission completion is independent from optimization.

Optional mastery: - ★ Complete rescue. - ★★ Complete + optional
objective/collectible. - ★★★ Complete an optional efficiency challenge.

Do not remove a star because the child used a valid creative route
unless the mission explicitly presents efficiency as an optional replay
challenge.

# 22. UX / UI Specification

## 22.1 Landscape Layout

Recommended: - **center/left:** main grid, largest area; - **right:**
command palette; - **bottom:** numbered program strip; - **top:**
mission objective, inventory and minimal status; - **character bubble:**
contextual Bo guidance without covering the grid.

## 22.2 Visual Hierarchy

Priority: 1. grid and Mojo; 2. current objective; 3. command sequence;
4. available commands; 5. optional inventory/reward information.

Avoid dense dashboard styling.

## 22.3 Touch Requirements

-   large touch targets;
-   generous spacing;
-   no essential hover;
-   drag has tap alternative;
-   accidental drag does not delete commands;
-   confirmation only for destructive "clear all", not ordinary edits.

## 22.4 Command Visual Language

Each command needs: - distinct icon; - short label; - consistent
animation; - optional spoken name; - color/category cue.

Do not rely on color alone.

## 22.5 Execution Feedback

During RUN: - active slot enlarges/highlights; - map action synchronizes
with slot; - completed slots visibly settle; - failure command pulses; -
narration remains short.

# 23. Audio and Haptics

Audio is instructional, not merely decorative.

Required categories: - Mojo engine/vehicle sounds; - transformation
click/lock sequence; - command placement; - Run start; - correct
action; - recoverable error; - spray/push/hook/lift; - rescue
celebration; - voice instructions; - word pronunciation.

Use light haptics where platform supports it: command snap,
transformation lock, successful action. Never use aggressive vibration
for mistakes.

# 24. Transformation Presentation

Transformation should be satisfying but short enough not to interrupt
repeated play.

First encounter: 2--4 sec showcase.\
Repeat transformation: 0.8--1.5 sec or skippable accelerated version.

Visual beats: 1. current top releases; 2. new module enters; 3.
alignment; 4. click/lock; 5. ability icon appears; 6. Mojo ready pose.

# 25. Narrative Rules

Story provides purpose, not long exposition.

Each mission needs: - clear person/place/problem; - visible stakes
appropriate for young children; - no frightening injury detail; -
escalation; - positive resolution.

Preferred language: \> "The road is blocked. How can Mojo help?"

Avoid: \> "Select the appropriate heavy-material displacement
configuration."

# 26. Content Structure

Suggested launch scope:

-   8 themed chapters;
-   6--8 missions/chapter;
-   50+ core missions;
-   10--12 Swop-Tops;
-   20+ reusable microgame templates;
-   100+ educational parameter variations;
-   optional replay objectives.

Possible chapters: 1. Welcome to Swoppiton 2. Fix-It Day 3. Fire & Water
4. Building Big 5. Up High 6. River Rescue 7. Stormy Swoppiton 8. Master
Swopper

# 27. Level Data Model

Each level should be data-driven rather than hard-coded.

Example conceptual schema:

``` yaml
level_id: W3_M04
title: School Fire Rescue
grid:
  rows: 5
  columns: 6
mojo:
  start_cell: [4,0]
  heading: east
  initial_form: normal
objectives:
  required:
    - extinguish: fire_01
    - extinguish: fire_02
    - rescue: child_01
  optional:
    - collect: star_01
allowed_swops:
  - fire
  - dozer
  - cherry_picker
command_budget:
  recommended: 10
education:
  domain: mathematics
  skill: subtraction_within_10
assist:
  hint_level_default: 0
```

Implementation can use JSON, ScriptableObject, database rows or
equivalent; the important requirement is authorability without rewriting
gameplay code.

# 28. Object State Model

Objects should expose: - grid position; - orientation if relevant; -
state; - required capability; - allowed interactions; - animation
state; - completion state; - educational payload; - accessibility
narration key.

Examples:

Fire: `burning → sprayed → extinguished`

Rock: `blocking → pushed → cleared`

Child: `waiting → reached → rescued → safe`

Crate: `ground → carried → delivered`

# 29. Program Interpreter Requirements

The command runner should behave deterministically.

Each command returns: - success; - blocked; - invalid-capability; -
objective-completed; - state-changed; - waiting-for-microgame.

Pseudo-flow:

``` text
for command in program:
    validate current state
    highlight command
    attempt command
    if microgame required:
        pause interpreter
        resolve microgame
    if recoverable failure:
        stop
        enter debug mode
    else:
        commit state
continue
```

## 29.1 Determinism

Running the same sequence from the same initial state must produce the
same outcome unless a level explicitly contains a deterministic scripted
event.

Avoid random movement that makes debugging impossible.

## 29.2 Undo / Replay

Before Run, preserve the initial mission state. Replay should restore
deterministic starting state. Where story uses multiple checkpoints,
replay may restore the current beat rather than the entire mission.

# 30. State Machine

Suggested mission states:

`INTRO → OBSERVE → EDIT_PROGRAM → EXECUTING → MICROGAME → DEBUG → BEAT_COMPLETE → COMPLICATION → EDIT_PROGRAM → FINAL_RESCUE → RESULT`

Prevent invalid transitions such as editing while an action animation is
committing world state.

# 31. Checkpointing

Standard mission checkpoints: - start of mission; - after a major
completed rescue beat; - before final challenge.

If a child exits, resume from the latest safe checkpoint.

Do not force replay of a long completed section because of one later
mistake.

# 32. Content Authoring Rules

Every level designer must answer:

1.  What is the visible problem?
2.  What capability solves it?
3.  Is there more than one valid solution?
4.  Why is a Swop necessary---or intentionally unnecessary?
5.  What does the child program?
6.  What visible consequence follows each action?
7.  What educational concept is embedded?
8.  Does that educational concept affect the world?
9.  What happens if the child makes a reasonable mistake?
10. What hint teaches without giving away the whole solution?
11. Is there a new complication?
12. Is the final rescue satisfying?

Reject a level if its educational question can be removed without
changing the mission and nothing else is affected. That indicates the
learning is merely pasted on.

# 33. Level Design Anti-Patterns

Avoid: - every mission being "move to finish"; - every problem having
exactly one obvious vehicle forever; - repeated detached multiple-choice
quizzes; - transformations that only change skin; - long text before
play; - excessive command counts for young children; - resetting the
whole level for one mistake; - invisible rules; - timing-critical
programming before the child understands sequencing; - stars that
pressure the child to abandon creativity; - fake choices where
alternatives always fail; - random hazards that invalidate a correct
program.

# 34. Tutorial Strategy

## Tutorial 1 --- Move Mojo

Teach Forward only.

## Tutorial 2 --- Turn

Introduce Left/Right and orientation.

## Tutorial 3 --- First Action

Reach a character and Rescue.

## Tutorial 4 --- First Swop

Fire ahead. Choose Fire and Spray.

## Tutorial 5 --- Program Before Run

Build 3-command sequence.

## Tutorial 6 --- Debug

Deliberately provide an incomplete sequence; Bo demonstrates editing
rather than failure.

## Tutorial 7 --- Re-Swop

Rock followed by fire: Dozer then Fire.

Tutorials should teach through interaction, not modal text.

# 35. Reward and Progression

Rewards should emphasize discovery and creativity rather than grind.

Possible rewards: - blueprint pages; - new Swop-Top access; - new
command abilities; - stickers; - workshop decorations; - visual
customization; - mission postcards.

Prefer **new capabilities** over numeric power upgrades.

Example Crane progression: 1. Hook/Lift 2. Rotate 3. Magnet attachment
4. Multi-object challenge

Example Chopper: 1. Fly/Land 2. Rope 3. Rescue basket 4. Searchlight

# 36. Replayability

Replay motivations: - alternative Swop solution; - optional
star/blueprint; - fewer-command challenge; - alternate educational
question set; - creative Build solution; - hidden side objective.

Do not use randomization that changes core path after the child has
programmed it.

# 37. Accessibility

Required: - voice-over for mission instructions; - icon + text, not text
alone; - color-independent distinction; - large touch targets; - tap
alternative to drag; - adjustable narration/subtitle state; - reduced
motion option; - no essential time pressure in core educational
puzzles; - readable type and strong contrast; - replay instruction
button.

Consider dyslexia-friendly typography principles and avoid all-caps for
long instructions.

# 38. Safety / Child Experience

-   no external chat;
-   no user-generated public text;
-   no manipulative monetization;
-   no loss streak messaging;
-   no scary injury presentation;
-   no punitive countdown in foundational learning;
-   parent-facing controls separated from child flow;
-   avoid accidental purchases;
-   collect minimum data necessary.

# 39. Analytics / Learning Telemetry

If analytics are implemented, track gameplay events rather than
sensitive profiling.

Useful events: - mission_started; - swop_selected; - command_added; -
program_run; - execution_failed_at_command; - hint_requested; -
microgame_completed; - mission_completed; -
optional_objective_completed.

Useful design metrics: - completion rate; - median retries; - failure
location; - hint escalation; - command count; - valid alternative
solution usage; - time spent planning vs executing.

Do not expose performance rankings between children.

# 40. Technical Architecture Recommendations

Core systems: 1. Grid Manager 2. Level Loader 3. Mojo Controller 4.
Swop/Ability System 5. Command Editor 6. Program Interpreter 7. Object
Interaction System 8. Objective Manager 9. Microgame Manager 10.
Education Content Provider 11. Hint/Assist Manager 12. Dialogue/Voice
Manager 13. Save/Checkpoint Manager 14. Reward/Progression Manager 15.
Audio/Haptic Manager 16. Analytics abstraction

Keep educational content and level data separated from engine logic so
questions, languages and difficulty can be expanded without code
changes.

# 41. Critical Edge Cases / Bug Prevention

## Program Editor

-   dropping command between slots;
-   deleting while dragging;
-   duplicate drag events;
-   sequence exceeding capacity;
-   stale selected command after Swop;
-   nested Repeat overflow;
-   Run tapped repeatedly.

## Grid

-   Mojo facing outside map;
-   two objects occupying same exclusive cell;
-   pushed object leaving map;
-   rescue target becoming unreachable after state change;
-   alternate solution incorrectly blocked.

## Swop

-   action remains visible after incompatible transformation;
-   Swop animation completes but capability state does not;
-   rapid Swop commands desynchronize model/animation;
-   transforming while carrying incompatible cargo.

## Execution

-   user backgrounds app mid-command;
-   animation interrupted;
-   microgame closes unexpectedly;
-   replay restores visuals but not logical state;
-   audio narration continues after mission reset.

## Save

Persist only safe checkpoints, not partially committed command
animations.

# 42. Acceptance Criteria --- Core Prototype

A vertical slice is successful when:

-   player can view a grid mission;
-   Mojo has orientation;
-   player can build/reorder/delete commands;
-   Run executes deterministically;
-   active command is visually indicated;
-   at least 3 Swop-Tops change available actions;
-   Swop can occur mid-sequence;
-   an invalid capability pauses into debug mode;
-   sequence can be edited and rerun;
-   at least one math microgame affects world state;
-   at least one language/tool microgame affects world state;
-   one mission contains two transformations;
-   one puzzle supports two valid solutions;
-   mission can complete without reading long text;
-   no ordinary logic mistake requires full mission restart.

# 43. Recommended Vertical Slice

Build one polished 5×5 or 6×6 **School/Workshop Rescue** with:

-   Normal Mojo;
-   Dozer;
-   Fire;
-   Cherry Picker;
-   rock obstacle;
-   two fires;
-   elevated child rescue;
-   bolt-count math challenge;
-   PALU/HAMMER tool challenge;
-   optional star;
-   debug hint;
-   transformation animation;
-   command strip;
-   checkpoint after first major beat.

This single slice tests almost every unique product hypothesis before
producing dozens of levels.

# 44. Definition of Fun

A level is not considered successful merely because it teaches the
intended curriculum.

The child should experience: 1. **Curiosity:** "What happened?" 2.
**Recognition:** "I know what Mojo needs!" 3. **Planning:** "First this,
then this." 4. **Anticipation:** pressing RUN. 5. **Satisfaction:**
watching the plan work. 6. **Discovery:** a new complication appears. 7.
**Mastery:** fixing a failed plan. 8. **Payoff:** visible rescue/repair.
9. **Agency:** "That was my solution."

# 45. Final Product Identity

The game should never feel like:

> "Answer school questions to make a cartoon car move."

It should feel like:

> **"Swoppiton has a real problem. I choose what Mojo becomes, program
> the rescue, use the right tools and knowledge, test my idea, fix it
> when necessary, and make the rescue work."**

The defining loop is:

**OBSERVE → SWOP → PLAN → RUN → DISCOVER → DEBUG/RE-SWOP → RESCUE**

Everything---math, language, tools, creative building, physics and
story---supports that loop.

------------------------------------------------------------------------

# Appendix A --- Example Full Program

``` text
MISSION: Fallen rocks + fire + rooftop rescue

01  SWOP → DOZER
02  FORWARD
03  PUSH
04  PUSH
05  TURN RIGHT
06  FORWARD
07  SWOP → FIRE
08  SPRAY
09  FORWARD
10  SWOP → CHERRY PICKER
11  RAISE
12  RESCUE
```

# Appendix B --- Example Conditional Program

``` text
REPEAT ×3
    FORWARD
    IF SEE FIRE
        SPRAY
```

# Appendix C --- Core Design Review Checklist

Before approving a mission:

-   [ ] Problem is visually understandable.
-   [ ] Swop decision has functional meaning.
-   [ ] Commands produce readable consequences.
-   [ ] Educational content is contextual.
-   [ ] Mistakes are recoverable.
-   [ ] Hint ladder exists.
-   [ ] No unnecessary text wall.
-   [ ] Touch controls work without precision dragging.
-   [ ] Mission has pacing variation.
-   [ ] Objective state cannot deadlock.
-   [ ] Replay is deterministic.
-   [ ] Optional challenge does not block completion.
-   [ ] At least one satisfying action/rescue payoff exists.
-   [ ] New mechanics are introduced before being combined.
-   [ ] Audio/voice can explain essential instructions.
