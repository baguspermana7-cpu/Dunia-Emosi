# Mojo full-PRD implementation backlog

Planning snapshot: 2026-09-30. **2026-10-01 owner decision:** movement arrows are board-absolute (↑ Atas, ↓ Bawah, ← Kiri, → Kanan); see PRD §5.2 note. This is the traceable implementation backlog, not a statement of released features. See [current acceptance](G30-G31-CONTINUATION.md) for verified behavior.

## 1. Scope and verified baseline

The supplied PRD and bible remain the source scope. The existing 16-mission phase originated in an assistant implementation prompt; it is not evidence that the owner cancelled the remainder. This plan does not authorize a narrower release or claim those features are complete.

Source abbreviations below:

- **P** = `documentation and standarization/PRD-Swop-Plan-Rescue.md` (1,055 lines).
- **B** = `documentation and standarization/50-Transformations-250-Scenarios.md` (1,792 lines).
- **A** = `documentation and standarization/MOJO_ASSET_CATALOGUE.json` and `docs/MOJO-ASSET-CATALOGUE.md` (680 catalogued source images; 44 canonical top identities, not 50 implemented forms).
- Source line references refer to these current copied product documents. The original design documents are retained alongside this backlog.

| Area | Actual current implementation | Work still needed for the full specification |
| --- | --- | --- |
| Forms | `games/data/mojo-levels.js:31` defines Normal, Dozer, Fire, Cherry, Jumper, Crane, Chopper. Normal is outside B's 50. Six bible forms have partial engine support; four bible forms appear in missions. | Complete those six capabilities and add the other 44 bible identities with real actions. Neither seven definitions nor 44 catalogue pictures equals 50 functional forms. |
| Missions | 16 IDs: t1–t7, m1–m8, s1. Five mission forms including Normal. School has four checkpoints/beats. | Map any genuinely reusable mission to a specific family; author the remaining family coverage. No current data provides 250 family IDs or complete 50×5 coverage. |
| Shared interpreter | `games/prog-grid.js`: board-absolute arrows up/down/west/east as the default mode (owner decision 2026-10-01: arrows are read from the board, not the car; relative forward/turn kept as optional `mode:'rel'`), deterministic derived heading, in-program Swop, push/hole fill, short jump, resource-limited spray, raise/lower, rescue, pick/hook, drop/release, takeoff/land, repair, REPEAT/IF, solver/hints/checkpoints. | Typed terrain/object/capability extensions described in M1–M5. New verbs need world state, visible consequences, recovery and authoring contracts, not aliases that only change labels. |
| Education | `games/data/soal-pack-mojo.js`: 10 ID/EN vocabulary pairs, collection arithmetic and height sequences through shared SoalEngine. `games/mojo-swoptops.js:965` explicitly dispatches letters and height microgames; collection/water affect the world directly. | Remaining contextual template families in P§11 and build/test P§12. Keep optional encounter questions separate from indispensable world interactions. |
| Regions | Kota Pusat (12 missions) and Pelabuhan (4). Hutan, Pegunungan, Konstruksi, Pulau Ceria are labelled but `open:false`, no levels (`mojo-levels.js:49`). | Real authored episode packs, reachable progression and region-specific scenes for all four; finish water gameplay in Pelabuhan too. |
| Bengkel / Koleksi | `games/mojo-menu.js:46–68`: 44-image catalogue and form carousel, truthful availability text. | Functional capability try-out, unlock/progression integration; persisted cosmetic customization/decorating is absent. Exact cosmetic reward inventory is not fixed by the PRD. |
| Belajar / progress | `mojo-menu.js:69–94`: ten bilingual word cards with pronunciation; profile counts missions/stars/seen forms/bolts. Existing avatar save/checkpoints and parent reset. | Interactive curriculum reuse, discovery/unlock graph, command progression, optional mastery/replay and saved customization. Do not replace existing working profile/isolation behavior. |
| Art | Source catalogue, identity restrictions, provenance and approved full-form sprites are retained. Generic component references exist on sheets 10–13. | Match exact bible form identities to approved art. Generic components are not complete matched assembly sets or directional animation frames. Some form art/actions will require suitable source material before final visual acceptance. |

**Counting boundary:** B lines 4–5 and 25–30 specify 50 forms × 5 families = **250 scenario families**, each **4–7 authored variants**. A full literal lower-bound implementation is 1,000 variants; seven each would be 1,750. PRD§26 separately suggests a launch structure of eight chapters, 50+ missions, 10–12 forms, 20+ templates and 100+ educational variants. Those are different measures/stages, not competing definitions of “250 levels.” Pending release clarification must state the selected boundary; retain all remaining catalogue rows either way.

## 2. Dependency groups and implementation order

Each group is a reviewable deliverable. Advance dependent content only after its operators and interaction contracts work. Proposed new paths below are proposals, not files already present. Preserve existing mission IDs, shared APIs, avatar saves, child-safe defaults and source art; do not put the entire expansion into the current game controller.

| ID / dependency | Concrete work and likely files | Completion evidence / risk |
| --- | --- | --- |
| D0 — first | Create stable form/family/variant IDs (`F01.1`, `F01.1.v1` etc.), exact source references, capability table, art availability and source-approval disposition. Extract data progressively from `games/data/mojo-levels.js` into proposed `games/data/mojo-forms.js`, `mojo-regions.js`, `mojo-families-*.js`; retain a compatibility facade. Add schema checks and versioned save migration in `games/mojo-save.js`. | Exactly 50 named form rows, 250 family rows, no lost old mission/save IDs; each row has implemented/pending/blocker status. Medium risk: source/asset names differ. |
| D1 — D0 | Extend `games/prog-grid.js` through small shared operator modules under proposed `games/prog-grid/`; register immutable state transitions, terrain traits, object interactions and structured results. Add forward/backward where progression introduces it, repeat depth/budget guards and new IF predicates only as required by authored content. Keep renderer events decoupled from rules. | Existing suite stays green; new action returns success/blocked/invalid-capability/waiting consistently; deterministic replay and safe checkpoint serialization cover new state. High risk: cargo/height/depth/terrain state interacts with Swop and solver. |
| M1–M5 — D1 | Implement the five reusable mechanic groups in the next table; deliver each with a small proving mission before mass authoring. Extend events in `games/mojo-swoptops.js` or focused new render modules and consume literal `mojo-art.js` assets. | Each distinct operator has correct capability restriction, visible world change, recoverable error and event/render binding. High risk; forms sharing primitives still require distinct useful capabilities. |
| E — D1, relevant M group | Generalize contextual microgame dispatch into a shared interaction contract; extend `games/data/soal-pack-mojo.js` and existing shared SoalEngine, with proposed focused `games/mojo-microgames/` views. Implement the 20-template inventory below plus editable build/test. Avoid unsupported kinds silently succeeding. | Learning answer/action changes the relevant world state; wrong attempts preserve program and checkpoint. Optional-question caps never prevent necessary learning. High risk: state continuation and accessibility. |
| C — D0, operators + E per pack | Author all 250 families in the exact appendix, grouped by capabilities. For each: visible problem, board, objective, forms, meaningful learning payload, alternative route where applicable, hint ladder, complication/recovery, optional mastery, witness solution, ID/EN instruction keys. Author at least four meaningfully different variants if completing B's literal minimum; variants five–seven are optional above that minimum unless the owner selects them. | Coverage manifest accounts for every family/variant; no duplicate reskins counted as independent educational designs. Data-only after dependencies exist, but substantial curriculum/design work. High volume, medium implementation risk. |
| W — D0 + ready C packs | Open Hutan, Pegunungan, Konstruksi, Pulau Ceria with actual region packs; map all six geographic regions to story episodes and the eight programming progression stages. Populate region background/portrait choices, briefing, picker, episode list, resume and results through `mojo-menu.js`, `mojo-levels.js`, `mojo-art.js`. | No empty enabled region; each reachable mission belongs to a real region and progression step. Small/large screens retain correct scene, progress and back-navigation. Medium risk. |
| U — D0 + W, M1–M5 | Progression/rewards: capability-based unlocks, contextual picker (2–3 early choices; function groups later), optional mastery, alternate solution/replay records. Bengkel: inspect capability, safe try-out, choose/save approved cosmetic options and workshop decoration if selected from PRD's possible rewards. Reuse profile/save isolation and parent reset; no grind/shop economy added. | Reload/two-avatar/reset preserve correct unlocks, selections and rewards; using hints or a creative valid route does not erase completion. Cosmetic catalogue exactness is an unresolved design detail, not permission to invent 50 cosmetic “forms.” Medium risk. |
| L — E + C metadata | Make Belajar reuse the same math, language, shape/pattern and practical-tool interactions in short contextual practice scenes; offer ID/EN instruction/pronunciation and return to matching missions. Preserve existing word cards as vocabulary reference. Store only useful local practice progress per avatar if needed. | Child performs an action and sees a consequence; no separate question-generation algorithm, disconnected quiz wall or analytics backend introduced. Medium risk. |
| R — each completed group | Update public requirement/capability/asset coverage, load order/cache tokens/offline manifest and relevant version/docs. Run bounded checks below on the frozen selected release; retain unimplemented rows explicitly. | Release evidence names implemented catalogue counts and limitations; remaining full-PRD work is never relabelled as mere pending QA. Medium risk: larger content/asset loading. |

### Shared mechanic groups (reuse first; cross-dependencies explicit)

| Group | Existing foothold | Required reusable additions | Principal forms |
| --- | --- | --- | --- |
| M1 — handling and reach | Single crate pick/hook/drop; measured vertical lift | Attach/detach/winch/tow relationships; load capacity and ordered cargo slots; controlled lift/rotation/reach; ramps/stacking/placement/length checks; grapple irregular objects; elevated work/rescue. Rope rescue also feeds M4; safe passenger handling feeds M5. | 03,07,08,13,24,25,31,32,48,49 |
| M2 — quantities, collection, supply | Water/bolts, pickups, capped spray | Fill/pump/allocate fluid; energy connectors/transfer; selective sweep/vacuum/release; sorting and material filters; ripe harvest collection; magnet-only metal lift. Different material predicates and resource consequences, not generic collect reskins. Fire ladder depends M1. | 01,17,18,27,28,29,46,47 |
| M3 — terrain, construction and repair | Push/clear into zone, rock fill, tool-gated repair | Dig/scoop/dual-tool side/depth; drill/bore/extract and tunnel connectivity; plow/salt, compact/pave/align; mix recipe/pour; controlled swing/hit with protected targets; field work; bridge length/deployment; editable build/test supports/clearance. M1 handles loads and M2 recipes. | 02,09,16,19,20,21,22,23,26,30,44,45,50 |
| M4 — traversal and rescue environment | Ground steps, short jump, takeoff/land/fly | Boost/brake/interception as deterministic command-time events; long jump/traction/climb/pull; sailing/current/tow/land-water transition/glide; depth/dive/sonar/grab; ring/shore recovery; wind/air collection/rope; launch/docking, rover hop/scan/coordinates. No punitive real-time countdowns or random hazards after planning. | 04,05,06,10,11,12,37,38,39,40,41,42,43 |
| M5 — transport and routing | Direct adjacent rescue, reach goals | Passenger capacity/identity/destination/ordered stops, safe delivery and escort; traffic stop/direct/light rules; deterministic crossings; rail coupling, switch state and wagon ordering. Uses M1 cargo schema and M4 movement/event primitives. | 14,15,33,34,35,36 |

Implementation sequence within mechanics: complete current six partial forms first; M1 cargo/reach and M2 resources next; M3 construction then M4 water/terrain/air followed by depth/space; M5 transport can proceed once M1/event foundations settle. Authoring proceeds alongside each completed mechanism. This avoids blocking all content on the last specialist form.

### Education/build inventory (P§§10–12; no arbitrary extra curriculum)

Existing foundations: Word Scramble, Count & Collect, Height Control and simple Water Quantity. Audit their authored coverage before marking an entire template complete.

The full 20-template inventory is: (1) Pick the Right Tool, (2) Word Scramble, (3) Letter Route, (4) Count & Collect, (5) Measurement, (6) Shape Fit, (7) Pattern Repair, (8) Crane Balance, (9) Sorting, (10) Repair Sequence, (11) Build & Test, (12) Math Route, (13) Height Control, (14) Water Quantity, (15) Cargo Capacity, (16) Directional Listening, (17) Find the Missing Part, (18) Memory Toolbox, (19) Pattern Road, (20) Sequence Cards.

Implement reusable interactions by behavior: choose/apply to a visible object; collect/order on the grid; measure/allocate a physical resource; fit/sort/arrange; sequence/debug; editable build/test. Reuse SoalEngine content/validation while keeping world transitions in ProgGrid. Build/test evaluates continuity, support, clearance, contact and approximate stability; failed builds stay editable and multiple valid designs work. Engineering-grade physics is explicitly unnecessary. Voice remains optional/mutable under owner instructions; directions also have readable/icon equivalents.

### Four missing regions and progression

Geographic placement below is a proposed authoring organization inferred from scene and vehicle function, not an original specified assignment. Use existing backgrounds and match literal source art:

| Region | Finite pack responsibility | Dependencies |
| --- | --- | --- |
| Hutan | Fallen trees/logs, rough trails, safe collection/rescue; grapple/tractor/monster-truck and contextual environmental work. | M1, M2, M3, M4 |
| Pegunungan | Climb, gaps, high rescues, snow access; multi-form mountain recipe. | M1, M3, M4, M5 |
| Konstruksi | Dig, load, lift, mix, pave, bridge/build/test; construction and broken-bridge recipes. | M1, M2, M3, E |
| Pulau Ceria | Land/water transitions, island delivery, shore/underwater rescues; water-family packs. | M1, M4, M5 |

Do not duplicate all 250 families for every region. Assign each family a primary setting and reuse variants only where educationally meaningful. Rail/space/depot/farm episodes need a documented location/scene decision within this six-region map; the sources do not specify additional geographic regions. Eight **programming stages** (movement, interaction, Swop, multi-Swop, Repeat, IF, optimization, open rescue) and eight **suggested story chapters** are separate dimensions from the six regions. Introduce one new concept, reinforce it twice, then combine it with known mechanics (P§19).

All eight cross-form recipes are retained: Landslide→Fire→Rooftop Rescue (Dozer/Fire/Cherry); Flooded Construction Site (Boat/Crane/Dumper); Broken Bridge (Excavator/Cement Mixer/Bridge Layer); Warehouse Emergency (Forklift/Mobile Workshop/Tow Truck); Mountain Route (Monster Truck/Chopper/Ambulance); River Cargo Chase (Racer/Amphibious/Boat); Winter Access (Snow Plow/Street Sweeper/School Bus); Underground Shortcut (Drill Rig **or** Tunnel Borer/Mobile Workshop/Road Roller). Link recipes to existing family IDs where appropriate, rather than automatically adding eight duplicate standalone levels to the count.

## 3. Bounded acceptance

1. **Data completeness:** cheap schema/ID/reference checks over every declared form, family and variant; exact 50/250 inventory, valid coordinates/objects/capabilities/education/assets, no orphan region or unreachable unlock. Replay each authored witness route deterministically with a step bound. Use bounded search for discovery/alternative checks; do not let BFS over every large variant become the only proof or a runaway gate.
2. **Mechanics:** meaningful unit tests for each new operator's success, wrong capability, invalid target, boundary/resource failure, immutability and relevant carrying/height/depth/Swop interaction. Test shared equivalence classes, not fifty copies of the same code. Existing ProgGrid/SoalEngine/save regressions remain required; current passes are baseline, not proof of future extensions.
3. **Learning/content:** each of the 250 family definitions receives source/curriculum review with its visible world consequence and mistake recovery; every authored variant has a distinct recorded design change. Each of the 20 interaction templates receives a real successful and recoverable-wrong flow. Review bilingual instructions and narration controls. Normal cannot trivially bypass the showcased special capability, except intentional alternate/no-Swop puzzles.
4. **Product flows:** real gameplay for each new distinct mechanic and each of the eight cross-form recipes; touch/editor/debug/checkpoint/region/unlock/Bengkel/Belajar/profile flows. Exercise phone/tablet in portrait and landscape for new screen layouts and representative hardest compositions. Do not multiply every mission by every viewport without a layout/state reason; full catalogue data replay remains exhaustive.
5. **Art/audio/performance:** inspect every new form/action frame against approved source, asset decode/reference checks and contact sheets; screenshot actual game composition per distinct renderer/scene type. No placeholder/red mockup actor, forbidden extras, hollow sprites or cosmetic-only functional claims. Measure representative worst-case boards in an isolated browser; test mute/background/reduced-motion/offline/update on a frozen release.
6. **Release statement:** count functional forms, covered families, authored variants, playable regions and interactive learning templates separately. A prototype/launch subset can only be described as such under the actual release decision; a literal full-bible completion requires all 50/250 plus at least 1,000 authored variants and their prerequisites. Do not promise zero bugs beyond the evidence.

## 4. Source ambiguities requiring explicit disposition

| Ambiguity | What the sources actually establish | Safe planning treatment |
| --- | --- | --- |
| Full catalogue versus launch | B specifies 50/250 and 4–7 variants; P§26 recommends 10–12 forms/50+ launch missions. P§43 recommends starting with one polished slice. | Preserve full backlog. The owner’s release decision determines what ships now; neither recommendation erases the bible. |
| Proposed forms | B lines 9–12 explicitly says some expansion forms remain proposals until source/IP approval. | Mark approval/art status per exact name; do not silently certify all 50. This is a constraint inside the supplied production document, not a newly invented approval policy. |
| Verbs differ | B uses Fly/Rope, Sail/Tow, Raise/Extend; P§6 also names TakeOff/Land/AirRescue, Anchor/WaterRescue, Lower/Rescue and Crane Drop. | Reconcile semantic union in D0. Existing aliases may satisfy a behavior, but missing rope/anchor/extend/rotation cannot be called finished because a related verb exists. |
| Scenario authoring detail | Family paragraphs are templates, not ready boards; each family's five education domains follow the same sequence. Labels such as Water-Count Puzzle or Math Lane do not always match that assigned domain. | Preserve exact names and domain tags; author meaningful learning/world payloads and explicitly resolve mismatches, rather than mechanically generating 250 near-identical boards. |
| Four versus seven variants | B says 4–7, not exactly seven. | Four is the finite literal lower bound (1,000); document any selected extra variants. Do not describe 250 single missions as satisfying the variants requirement. |
| Assets versus forms | A has 44 canonical art identities with aliases, source variants and reference components. These do not map one-to-one to B's 50. | Build an exact name/approved-art/action-frame map. Keep unavailable matching art as a concrete dependency; do not generate substitutes or turn reference-only modules into claimed approved full sets. |
| Bengkel/cosmetics | Workshop/customize mockups exist; P§35 lists stickers, decorations, visual customization and postcards as possible rewards. It does not supply a complete saved customization rule set or cosmetic inventory. | Separate functional workshop and capability progression from optional reward examples. Choose a bounded source-backed cosmetic set when implementing that requirement; do not invent a monetized shop, currencies or power upgrades. |
| Belajar | The mockup requires a learning screen; P describes contextual math, language, practical knowledge and 20 gameplay templates, not a standalone graded course. | Reuse contextual interactions for practice; keep flashcards as reference. Exact course packaging is a design decision, not permission to add an unrelated LMS. |
| Geography/chapters/stages | Six mockup regions, eight suggested story chapters and eight programming stages are distinct; farm/rail/space location mapping is absent. | Make one documented assignment table with source-backed scene availability. Do not invent eight additional regions or duplicate the catalogue across all maps. |
| Analytics | P§39 says “if implemented.” | No analytics/backend project is necessary for finishing this game. Local progress and required save integrity remain sufficient unless separately chosen. |

## 5. Exact 50-form / 250-family authoring ledger

Each row below gives the five original family names in order. Stable planning IDs are **Fnn.1–Fnn.5** in that order; this is an ID proposal, not a modification of source names. All require authored coverage mapping; an existing mission may be credited only after semantic review. `Absent` means no current form definition under that bible identity; shared low-level primitives or art may already exist. M1–M5 identify the primary dependency, with cross-dependencies above.

| ID | Exact form / unique actions | Current support | Group | Five exact scenario families | B line |
| --- | --- | --- | --- | --- | --- |
| F01 | **Fire Engine** — Spray/Ladder | Mission: spray; ladder absent | M2 | 1. Kios Terbakar; 2. Api Berantai; 3. Jalur Api; 4. Water-Count Puzzle; 5. Balcony Rescue | 36 |
| F02 | **Dozer** — Push/Clear | Mission: push/clear-by-push; wider clear actions need mapping | M3 | 1. Batu Jalan; 2. Sortir Debris; 3. Longsor; 4. Pressure Plate; 5. Clear Target Count | 69 |
| F03 | **Crane** — Hook/Lift/Rotate | Engine: hook/release; lift/rotate absent | M1 | 1. Pohon Tumbang; 2. Peti Warna; 3. Counterweight; 4. Balok Jembatan; 5. Mobil Di Lubang | 101 |
| F04 | **Chopper** — Fly/Rope | Engine: takeoff/land/air rescue; rope absent | M4 | 1. Jalan Putus; 2. Letter Hunt; 3. Cliff Rescue; 4. Wind Puzzle; 5. Multi-Trip Rescue | 134 |
| F05 | **Racer** — Boost/Brake | Absent | M4 | 1. Runaway Cargo; 2. Math Lane; 3. Timed Delivery; 4. Balloon Chase; 5. Precision Stop | 166 |
| F06 | **Boat** — Sail/Tow | Absent | M4 | 1. Duck Rescue; 2. Current Intercept; 3. Tow Boat; 4. Island Delivery; 5. River Number Route | 199 |
| F07 | **Dumper** — Load/Tip | Absent | M1 | 1. Angkut Pasir; 2. 12-Block Load; 3. Capacity Puzzle; 4. Gravel Delivery; 5. Catch Fruit | 232 |
| F08 | **Cherry Picker** — Raise/Extend | Mission: raise/lower/rescue/repair; extend absent | M1 | 1. Cat Tree; 2. Street Lamp; 3. Numbered Height; 4. Sign Repair; 5. High Shelf | 264 |
| F09 | **Wrecking Ball** — Swing/Hit | Absent | M3 | 1. Marked Wall; 2. Number-Total Blocks; 3. Shape Demolition; 4. Timing Hit; 5. Safe Demolition | 297 |
| F10 | **Jumper** — Jump/Long Jump | Mission: fixed 2-cell jump; long jump absent | M4 | 1. Gap; 2. Even-Number Platforms; 3. Pattern Platforms; 4. Logs; 5. Airborne Star | 330 |
| F11 | **Monster Truck** — Climb/Pull | Absent | M4 | 1. Mud; 2. Stuck Vehicle; 3. Steep Hill; 4. Target-Sum Route; 5. Rough Cargo | 363 |
| F12 | **Jet** — Boost/Air Collect | Absent | M4 | 1. Windblown Package; 2. Color Pattern; 3. Fuel Route; 4. Number Rings; 5. Urgent Component | 395 |
| F13 | **Tow Truck** — Attach/Winch | Absent | M1 | 1. Broken Car; 2. Tow-Point Match; 3. Mud Recovery; 4. Garage Delivery; 5. Sequence Towing | 428 |
| F14 | **Ambulance** — Pickup/Safe Deliver | Absent | M5 | 1. Clinic Trip; 2. Safe Route; 3. Symbol Destination; 4. Rough-Road Avoidance; 5. Transport Sequence | 461 |
| F15 | **Traffic Rescue** — Stop/Direct/Escort | Absent | M5 | 1. Rescue Crossing; 2. School Escort; 3. Arrow Routing; 4. Intersection; 5. Traffic-Light Order | 494 |
| F16 | **Snow Plow** — Plow/Salt | Absent | M3 | 1. Snow Road; 2. Ice Route; 3. Grit Quantity; 4. House Access; 5. Snow Sorting | 527 |
| F17 | **Street Sweeper** — Sweep/Vacuum | Absent | M2 | 1. Leaves; 2. Waste Sorting; 3. Dirty Tiles; 4. Count Collection; 5. Hopper Capacity | 559 |
| F18 | **Recycling Truck** — Collect/Sort | Absent | M2 | 1. Material Sorting; 2. Color Bins; 3. Count Recyclables; 4. Pickup Route; 5. Depot Delivery | 592 |
| F19 | **Cement Mixer** — Mix/Pour | Absent | M3 | 1. Recipe Quantity; 2. Shape Foundation; 3. Ingredient Order; 4. Capacity Fill; 5. Bridge Footing | 625 |
| F20 | **Road Roller** — Roll/Compact | Absent | M3 | 1. New Road; 2. Tile Pattern; 3. Protected Zone; 4. Pass Counting; 5. Rescue Access | 658 |
| F21 | **Asphalt Paver** — Pave/Align | Absent | M3 | 1. Potholes; 2. New Rescue Route; 3. Length Choice; 4. Road Shape; 5. Connect Roads | 691 |
| F22 | **Excavator** — Dig/Scoop | Absent | M3 | 1. Buried Item; 2. Load Dumper; 3. Depth Count; 4. Soil-Rock Sorting; 5. Drain Trench | 724 |
| F23 | **Backhoe** — Dig/Scoop dual | Absent | M3 | 1. Dig-Refill; 2. Pipe Path; 3. Choose Tool Side; 4. Multi-Material; 5. Drainage | 756 |
| F24 | **Forklift** — Fork/Pick/Place | Absent | M1 | 1. Color Pallets; 2. Size Stacking; 3. Numbered Rack; 4. Load Balance; 5. Warehouse Path | 789 |
| F25 | **Telehandler** — Extend/Lift | Absent | M1 | 1. High Pallet; 2. Reach Length; 3. Over-Obstacle Pickup; 4. Cargo Pattern; 5. Platform Supply | 822 |
| F26 | **Tractor** — Pull/Plow | Absent | M3 | 1. Cart Towing; 2. Field Pattern; 3. Harvest Delivery; 4. Fruit Count; 5. Road Clearing | 855 |
| F27 | **Harvester** — Cut/Collect | Absent | M2 | 1. Ripe Rows; 2. Crop Classification; 3. Target Quantity; 4. Row Pattern; 5. Dumper Transfer | 887 |
| F28 | **Water Tanker** — Fill/Pump | Absent | M2 | 1. Reservoir; 2. Fire Supply; 3. Water Quantity; 4. Tank Capacity; 5. Multi-Stop Supply | 920 |
| F29 | **Energy Service Truck** — Connect/Transfer | Absent | M2 | 1. Vehicle Energy; 2. Battery Delivery; 3. Energy Count; 4. Device Route; 5. Connector Colors | 952 |
| F30 | **Mobile Workshop** — Tool/Repair/Test | Absent | M3 | 1. Hammer-Nail; 2. Wrench-Bolt; 3. Palu/Hammer Spelling; 4. Wheel Size; 5. Repair Sequence | 985 |
| F31 | **Flatbed Carrier** — Ramp/Load | Absent | M1 | 1. Disabled Vehicle; 2. Long Cargo; 3. Packing Puzzle; 4. Clearance Route; 5. Ordered Unload | 1018 |
| F32 | **Car Transporter** — Stack/Unload | Absent | M1 | 1. Three Cars; 2. Destination Order; 3. Empty Slots; 4. Size Arrangement; 5. Depot Unload | 1050 |
| F33 | **School Bus** — Stop/Pickup | Absent | M5 | 1. Numbered Stops; 2. Stop Sequence; 3. Seat Count; 4. Safe Route; 5. Symbol Destinations | 1083 |
| F34 | **Shuttle Van** — Pickup/Route | Absent | M5 | 1. Evacuation; 2. Passenger Matching; 3. Short Route; 4. Capacity; 5. Trip Count | 1116 |
| F35 | **Train Engine** — Couple/Switch | Absent | M5 | 1. Wagon Colors; 2. Track Switch; 3. Wagon Count; 4. Station Cargo; 5. Wagon Pattern | 1149 |
| F36 | **Tram** — Stop/Switch | Absent | M5 | 1. City Route; 2. Correct Stop; 3. Stop Numbers; 4. Track Switch; 5. Road-Closure Transfer | 1182 |
| F37 | **Amphibious Rescue** — Drive/Sail | Absent | M4 | 1. Land-River Chase; 2. Island Cargo; 3. Water Entry; 4. Mixed Route; 5. Rescue-Return | 1215 |
| F38 | **Hovercraft** — Glide/Rescue | Absent | M4 | 1. Swamp; 2. Shallow Rescue; 3. Reed Avoidance; 4. Buoy Pattern; 5. Mud Crossing | 1247 |
| F39 | **Submarine** — Dive/Sonar | Absent | M4 | 1. Sunken Item; 2. Depth Numbers; 3. Reef Route; 4. Underwater Letters; 5. Visual Inspection | 1280 |
| F40 | **Diving Rescue** — Dive/Grab | Absent | M4 | 1. Sunken Toy; 2. Cartoon Net Rescue; 3. Shape Match; 4. Depth Order; 5. Surface Delivery | 1312 |
| F41 | **Lifeguard Rescue** — Ring/Tow | Absent | M4 | 1. Floating Ring; 2. Shore Rescue; 3. Color Ring; 4. Buoy Markers; 5. Safe-Count | 1345 |
| F42 | **Rocket** — Launch/Dock | Absent | M4 | 1. Toy Satellite; 2. Planet Sequence; 3. Orbit Shapes; 4. Dock Matching; 5. Fuel Blocks | 1377 |
| F43 | **Moon Rover** — Hop/Scan | Absent | M4 | 1. Rock Shapes; 2. Craters; 3. Simple Coordinates; 4. Sample Pattern; 5. Base Delivery | 1410 |
| F44 | **Drill Rig** — Drill/Extract | Absent | M3 | 1. Blocked Passage; 2. Marked Layer; 3. Depth Tiles; 4. Drill-Head Shape; 5. Post Hole | 1442 |
| F45 | **Tunnel Borer** — Bore/Advance | Absent | M3 | 1. Hill Shortcut; 2. Connect Points; 3. Root Avoidance; 4. Compass Route; 5. Target Length | 1475 |
| F46 | **Magnet Truck** — Magnet/Lift | Absent | M2 | 1. Metal Sorting; 2. Loose Bolts; 3. Steel Crate; 4. Metal Shapes; 5. Screw Count | 1508 |
| F47 | **Vacuum Truck** — Vacuum/Release | Absent | M2 | 1. Leaves; 2. Loose Balls; 3. Safe Suction Sort; 4. Item Count; 5. Blocked Drain | 1541 |
| F48 | **Grapple Truck** — Grab/Lift | Absent | M1 | 1. Logs; 2. Large Debris; 3. Irregular Object; 4. Length Sorting; 5. Road Clearing | 1574 |
| F49 | **Scissor Lift** — Raise/Work | Absent | M1 | 1. Decorations; 2. Lamp Repair; 3. High Letters; 4. Exact Height; 5. Platform Rescue | 1606 |
| F50 | **Bridge Layer** — Measure/Extend | Absent | M3 | 1. Gap Crossing; 2. Bridge Length; 3. Connect Banks; 4. Panel Count; 5. Convoy Route | 1638 |

Inventory validation for this plan: parsed exactly 50 numbered source headings, exactly five bold numbered family titles under each (250 total), and assigned every form to exactly one primary mechanic group. This validates traceable backlog coverage only; no browser, gameplay or heavy tests ran for this planning task. This inventory validation does not implement or verify the proposed gameplay.
