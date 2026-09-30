# G30 / G31 continuation acceptance

Status: **in progress; release acceptance pending**. Updated 2026-09-30.

This handoff records the recovered product requirements and current verification boundary. It contains no private conversation transcript. Earlier reported test results are not current release evidence.

## Product scope

- G30 Timmy: preserve the original 15 worlds and six appended legend worlds, the programming grid, free steering, three-lane sailing, cinematic/story progression, shared learning engine, per-avatar saves and the 52-ship gallery.
- G31 Mojo: complete the interrupted initial implementation of seven tutorials, eight early missions and the four-beat school/workshop rescue (16 selectable missions). The engine defines seven forms; five are used by the 16 missions, while crane and chopper have engine tests but no released missions. Normal is outside the design bible's 50, so these counts represent six bible forms with partial engine support and four with missions. The art catalogue represents 44 vehicle identities. The supplied product catalogue contains 50 transformations and 250 scenario families, each recommending four to seven authored variants; it remains the expansion specification, not a claim of implemented content.
- Shared: literal supplied art, usable touch layouts, persistent avatar isolation, correctly scoped service worker installation/update/offline behavior, coherent cache URLs and no regressions to unrelated games.

Product references: [Timmy PRD](../documentation%20and%20standarization/TIMMY_LEGENDARY_SHIPS_PRD_v2.md), [Mojo PRD](../documentation%20and%20standarization/PRD-Swop-Plan-Rescue.md), [50-form design bible](../documentation%20and%20standarization/50-Transformations-250-Scenarios.md).

The 16-mission boundary was an implementation phase chosen during the previous
session, not a cancellation of the broader specification by the owner.
**MJ-14, MJ-19 and MJ-20 remain partial against that full specification:** four
additional regions need playable content; Bengkel currently previews forms;
Belajar currently teaches tool vocabulary; the broader customization,
progression rewards, curriculum and 50-form/250-family content remain unfinished.
Passing this phase's tests does not close those implementation requirements.
The [full implementation backlog](MOJO-FULL-SCOPE.md) retains every exact form
and scenario-family name, required mechanics, learning templates, dependencies
and source ambiguities. It records planned work separately from verified behavior.

## Decisions preserved

- G30 never previews a solution automatically. Its explicit hint highlights a command choice and caps the result at two stars; it does not fill a program slot.
- G31 retains its own PRD's deliberately requested progressive hint ladder. It does not automatically show the route.
- Topic-specific practice remains topic-specific. Mixed learning uses the shared SoalEngine; Arabic is limited to 8 percent and at most one question per four mixed deliveries, with persistent per-avatar accounting.
- The human old captain remains Kapten; the penguin is an assistant. Optional narration is allowed; G30 has no background music and its visible mute remains effective.
- Existing supplied art is preserved. Missing authentic view pairs and unimplemented catalogue forms are disclosed, not replaced with invented art or cosmetic functionality.

## Verification in progress

Current checkpoints include the 238-case programming-engine suite, all 16 Mojo mission UI flows, 78 shared question-engine checks, 77 Timmy mix checks, and 525 Timmy story-panel renders across three sizes (175 distinct panel definitions). These are checkpoints, not a final integrated release result. Source changes require the relevant checks to be refreshed.

Independent Astra HIGH review has identified and driven fixes to lifecycle cancellation, solver completeness, question history resilience, failed asset publication, native touch scrolling, compact-screen actions and foreground occlusion. Final frozen-tree review is still required.

The 680 Mojo images are now published in the working tree after full hash/decode/dimension checks and light/dark visual review. All 1,771 unrelated registry entries, including the 27 HQ ship sides, were preserved; the 2,451-entry JSON/JS asset-index gate passes. Cache `v63.17-20260930a` is aligned across 336 references and 65 versioned entries within the 95-entry shell; 114 shared files have coherent tokens. Neither result is a remote deployment.

Current Mojo browser checkpoints: editor 29/29, menus 16/16, native touch 12/12, parent gate/reduced-motion 5/5, lifecycle 9/9 and save/checkpoint 3/3. All 16 actual-control mission flows pass 63 checks; final PWA acceptance passes 54 checks with the origin server stopped, HTTP cache disabled, all nine sounds decoded and played, and previously unvisited content completed offline. Lifecycle includes transient local/shared write recovery, actual two-tab avatar and history isolation, live mute and hub return without cross-awarding stars.

Timmy real-browser lifecycle passes 15 checks and two-tab avatar/reset/mute passes 12. Full steering passes 409 checks with three performance failures retained; the unchanged isolated performance cases subsequently pass both tablet sizes at approximately 60 FPS, including 4x CPU slowdown. The cause of the earlier slow samples is not proven. Shared browser regressions pass: app-map stars 19 checks, legacy avatar/collectible migration 17 checks and app offline 12 checks with the server actually stopped.

Pending integration: remaining Timmy action/atlas/cinema/quiz/offline refresh, settled lifecycle screenshots and short-landscape home character occlusion repair; final review. The broader Mojo specification also remains unfinished as described above.

### Independent integration findings

| Finding | Current disposition |
|---|---|
| An open game writes cached progress into another avatar selected in another tab | Shared session lock, persistence retry and malformed-container contract pass 5/5 tests; both games' real two-tab acceptance passes, including Mojo hub return |
| Mojo completion disappears when leaving during the result delay | Immediate idempotent persistence passes unit and actual departure/reload/write-failure recovery checks; independently reviewed |
| Timmy grid continues behind Pause or while hidden | Coordinated timer/question pause and active elapsed time pass actual manual/background/overlap/queued-answer lifecycle checks |
| Chapter averaging turns a hinted two-star step into a three-star chapter | Persisted per-attempt hint marker passes checkpoint reload and fresh replay checks; chapter reward respects the cap |
| Malformed Mojo save records crash a menu or become HTML | Trusted-data schema normalization, safe text rendering and poisoned form/container regressions pass; independent source/unit review closes the reported defects |
| Late failed audio restarts a sound after mute/unmute | Playback-scoped generation guard passes 4/4 regressions; independent Astra review closes the reported defect |
| Tablet steering falls below its frame-rate threshold at 4x CPU slowdown | Three full-suite failures retained; unchanged isolated cases pass both sizes. Source profiling finds no dominant application hotspot; original failure cause remains unproven |
| Timmy is obscured by controls on a short-landscape first-visit home | Astra visual finding remains open; dedicated character space and fresh/returning screen verification required |

## Source-art boundaries

Thirteen fleet entries have disclosed differences between their supplied side and top illustrations. USS Enterprise and Great Eastern have no dedicated supplied top view. The selectable fleet and facts must not imply those borrowed views are exact historical reconstructions.

Mojo's playable vehicle art uses complete three-quarter illustrations. The source sheets also include generic body, windshield, chassis and accessory panels; these are preserved in the [asset catalogue](MOJO-ASSET-CATALOGUE.md). They do not supply matched modules with compatible pivots for every form or a directional animation atlas. Gameplay keeps the illustration upright with a direction indicator and transitions between complete supplied forms. The transformation vocabulary and state changes are real; the visual treatment does not claim nonexistent source animation frames.

## Complete acceptance checklist

Each ID is retained from the recovery inventory. Closure must cite a current test, render inspection or explicit product boundary. Rows below remain open until the final evidence mapping is recorded.

| ID | Requirement |
|---|---|
| SH-01 | Use supplied art literally, retain intended character identities and match attached mockup structure; no generic replacement where owner art exists |
| SH-02 | No emoji/icon glyph substitutes; G30 UI icons come from cropped owner sprites; no woman without hijab in game art |
| SH-03 | Transparent sprite extraction preserves white clothing/hulls/eyes/sails, thin rigging and outlines; excludes captions/grid edges; no hollow interiors or mutilation |
| SH-04 | No hardcoded game-private question algorithm; shared SoalEngine, game profiles/themes, grade filters, context overrides and cross-level history |
| SH-05 | Per-avatar saves, progress/stars/XP in shared Dunia workflow; existing avatars/unlocks preserved |
| SH-06 | Touch-first responsive portrait/landscape, tablet text at least 14px, large usable targets (56px design), no clipped art/buttons/labels or blocked play field |
| SH-07 | Smooth useful motion, microinteractions, sound effects; short UI transitions, reduced-motion variant; bounded timers/listeners and paused background |
| SH-08 | Global mute works immediately, persists and stops existing audio; narration optional; no music in G30 |
| SH-09 | PWA install/offline/update flow functional; initial SW activation must not reload active play; coherent cache tokens and shell assets |
| SH-10 | Agent performs testing and fixes; do not hand test burden to owner or claim bug-free beyond actual evidence |
| SH-11 | Preserve older unrelated games/assets, run relevant shared regressions; no broad G27/G28/G29 redesign |
| SH-12 | Preserve historical commit/push directions and finish authorized release only after integrated checks; exact paths, no sweeping parallel edits |
| TK-01 | Standalone Timmy menu tile, home/intro/ship select/map/room/reward/settings complete; original 15 worlds + 6 legend worlds reachable under compatible progression |
| TK-02 | Time-travel frame: bedroom→corridor→ship, contextual learning/helping, fragments→bedroom museum; Kamar scenes use bedroom not iceberg |
| TK-03 | Preserve BOTH free steering and new three-lane navigation; new mode supplements existing gameplay |
| TK-04 | Three lanes visually clear as ocean, auto-forward, left/right/boost with vessel inertia, slight hull roll, curved wake, delayed but responsive lateral motion |
| TK-05 | Dynamic ice/debris/narrow passages, collectibles and checkpoints; normal course always solvable, progressive difficulty from open sea through dense ice |
| TK-06 | Ordinary collision: short impact/spray/shake → pause → age/mastery challenge → explanation/recovery; wrong answer hints/retry no death/game over |
| TK-07 | Titanic final corridor visibly closes, control→assisted→cinema; inevitable story collision not player's failure |
| TK-08 | Layered cinematic: approach, lookout, inertial attempted turn, scrape, interior reaction, flooding cutaway, evacuation transition, lifeboat, break/descent, calm rescue dawn |
| TK-09 | Timmy safely aboard lifeboat before break; no bodies/falling people/gore/drowning or explosive crash; hopeful reflection |
| TK-10 | Flooding 3+2 interaction, evacuation deck routes, lifejacket/helping beats, 20−14 seat allocation, 6 seats illuminate/passengers board, rescue fragment loop |
| TK-11 | Skip/replay/pause/exit/resume cinematic safely; checkpoints before/after and between chapter steps; no soft-lock/double completion |
| TK-12 | Every latest mockup mechanic mapped to implementation (program queue, pick/drop/repeat/clear/go, all subjects, hints, adaptive difficulty, collectibles/scoring/rewards/facts/achievements/progress/room/replay/save) |
| TK-13 | Expanded varied grid scenarios in every world: delivery, rescue, currents, moving hazards, keys/doors, flags, slippery ice, whirlpools, fog/lighthouse, question tiles, advanced functions |
| TK-14 | Early fair 3x3–4x4 boards; later 5x5+ par8–12, one mechanic at a time then combination; every board solvable within maxLen, no duplicates or inert mechanics |
| TK-15 | No pre-run trace/ghost/auto route hints; all four arrows outside first two Kamar boards; patrol loop okay but no predicted next position |
| TK-16 | During/after run current command highlight, landing/wake, exact failing command, collect/drop payoff; explicit hints cap2 stars; completed-route celebration allowed |
| TK-17 | Correct world props: no TITANIC SUPPLIES in Mayflower/non-Titanic; pickup distinct from block, goal/drop ~80% tile, appropriate engine/bed/bench art and goal names |
| TK-18 | Responsive large board: about90–95% available frame; phone full width minus16px gutters; appropriate portrait scroll, run/fail auto-scroll; command slots visible or clear scroll affordance |
| TK-19 | Perintah panel fits commands, tablet slots≥60px, route step labels≥14px, no hand/skip covering route/run/goal/title; facts readable without clipping |
| TK-20 | Sulit functions variant selected via WD.grid(lv,{level:S.settings.level}); custom goal/art fields preserved by world adapter |
| TK-21 | Rebalance every world/chapters toward action; max1 pure quiz per world, other quizzes converted without changing existing ids; Kamar sole quiz5 questions |
| TK-22 | Grid chest/door pauses for shared question then resumes; wrong answer reveals/continues without bonus; exactly-once events and destroyed promise safe |
| TK-23 | Steer/lanes collision/buoy/gate questions; non-final lanes about45–60s with2 buoys+1gate; cooldown/caps; scripted final excluded |
| TK-24 | Phone lanes compact boost pill below field; no ship→horizon corridor occlusion; radar hidden/repositioned; unclipped HUD; steer wheel≤32% viewport height at bottom, ship above |
| TK-25 | No host/module duplicate HUD overlap; pause hidden during question; gentle steer anti-stall around90s and bounded150s without revealing route |
| TK-26 | Obstacles ice/rock/reef show matching art+labels, forwarded through host; Vasa uses rocks/reef |
| TK-27 | Child chooses ship before sailing; side preview ↔ same top sprite, no generic lifeboat substitution; responsive ~2x controls request balanced with later phone constraints |
| TK-28 | Story ship recommendations map world ids (republic→ss-republic etc.), reopened per new world while saved personal choice preserved; named thumbnails |
| TK-29 | 27 legend HQ side crops replace low-res, 52 total; retain thin rigging/white sails, captions/flags excluded, suitable waterline; two new topAlt placeholders disclosed |
| TK-30 | Galeri Kapal reachable home/room, Modern+Legenda all52 browse/pick unlocked, big side/top details/facts/stats; per-avatar choice persists to actual sailing |
| TK-31 | Adventure badges link correct world; per-avatar “Sudah berlayar” and dynamic n/total only increment finished steer/lanes with that ship |
| TK-32 | Six hopeful child-adapted historic worlds: Mary Rose archaeology, QAR honesty, Erebus/Terror perseverance, Mary Celeste observation, Republic radio help, Carpathia rescue |
| TK-33 | Other supplied ships selectable without invented disaster worlds; Timmy involved in story worlds; accurate gentle facts, no unsupported “everyone saved” |
| TK-34 | Original world indices stable; appended legend worlds; added levels cannot relock old completed worlds/next original level, older checkpoints remain usable |
| TK-35 | Branching pan/zoom sea chart with coherent regions/routes/signposts, intuitive current/recommended world, no nodes/labels behind Timmy/chrome |
| TK-36 | Regional seas/banners do not overlap wrong-world nodes; arrow directions follow routes; camera frames current region or Timmy safely; zoom dock/minimap never obstruct; max zoom-out solid sea |
| TK-37 | Grade1–2 default: everyday/just-taught knowledge, math≤20, short3–4 picture options; no ship trivia/history/continents/years as quiz prerequisite; Sulit grades3–4 |
| TK-38 | Arabic sparse (≤8%, max1/4), mixed≈50% math; Islamic toggle removes its questions; easy answer assistance not contradictory with Sulit |
| TK-39 | Explicit subject practice/steps topic-pure; umum/campur/mixed challenges retain mix; subtitle follows current question; topicOnly override deliberate |
| TK-40 | Persistent no-repeat per-avatar across levels/worlds/practice/challenges, unseen before exhaustion, least-recent fallback, generated prompt+numbers and template variety |
| TK-41 | Expanded curated bank and generators, no near duplicates, different container/content nouns; mathematical answers valid and in range |
| TK-42 | Quiz big illustration, compact choices, proportional full Timmy+old captain; long texts fit, Arabic large with harakat, listening word/speaker visible |
| TK-43 | No :has dependence in Android WebView; clock readable≥94px without overlapping prompt, late-loading pictures trigger re-fit, text-only challenge content height |
| TK-44 | Reward praises honestly/kindly at0/partial/all correct, active-only elapsed time; legend fragments distinct n/6 from compass n/14 in reward/room/achievements |
| TK-45 | #btn-map opens sea chart; explicit Keluar to Dunia hub; practice reward action not fake Peta Level; child-safe filters; phone profile/home hint and room tabs fit |
| MJ-01 | Identity is Observe→Swop→Plan→Run→Debug/re-Swop→Rescue, action-first education changes world state, not decorative quiz gating |
| MJ-02 | Heading-based deterministic shared ProgGrid interpreter; Forward/turn separate, capabilities by form, SWOP inside program, object state transitions, repeat/IF/checkpoint foundation |
| MJ-03 | Editor tap+drag alternatives, reorder/replace/delete/undo/clear, capacity bounds; repeated RUN protected; editing locked during execution; active slot sync |
| MJ-04 | Invalid capability/blocked move gently pauses at exact command, world/capability cue, sequence intact, edit/rerun current checkpoint; no punitive game over |
| MJ-05 | No automatic route preview; optional explicit progressive hint ladder (never reveal entire solution after one mistake), completion independent of optimisation |
| MJ-06 | Real form-specific actions: push rock, spray water/fire, raise/reach/rescue etc.; SWOP changes verbs/state, multiple valid solutions accepted |
| MJ-07 | Initial16-phase content: seven interactive tutorials, school/workshop rescue,8 chapter1–2 missions; each solver-proven, meaningful goals not same move-to-finish |
| MJ-08 | Flagship6x6: rock,2fires, reserve2/need5→collect3water; elevated rescue height6 with2,4,6 sequence; need8/have5→collect3bolts; PALU/HAMMER gives tool; optional star and checkpoint |
| MJ-09 | Wrong form selection gives gentle Bo capability hint; level-data best/alt badges “Paling Tepat”/“Bisa Juga”; contextual2–3 early choices, grouped later, no overwhelming50 at once |
| MJ-10 | G31 shared SoalEngine profile/theme/vocabulary; sparse event questions on bump/wrong/pickup/repair/rescue; max1 wrong-step question/run, max3/mission, ~120s cadence, no first tutorial attempt interruption |
| MJ-11 | Preserve necessary world-action learning even when optional question cap is reached; wrong educational response recoverable; curriculum grade1–2 with basic English |
| MJ-12 | Real cyan/turquoise Mojo and supplied Bo/cast; mockup layout correct but mockup red truck/boy explicitly rejected; supplied sprites primary, SVG fallback only |
| MJ-13 | All29 sheet originals inventoried including last5; crop characters/tops/props/UI/FX/tiles/backgrounds with measured cells, captions removed, white preserved, named keys, merge indexes without dropped entries |
| MJ-14 | Mockup screens: splash, menu Misi/Bengkel/Koleksi/Belajar,6-region Swoppiton map, episode, briefing, form picker, planning/execution, success,debug,workshop,collection,learning,profile,parent settings |
| MJ-15 | Region visuals use matching landscape/portrait art; central largest board, right commands, bottom route/run, readable top objective/inventory, Bo does not cover board |
| MJ-16 | First transformation2–4s skippable, repeats0.8–1.5s; release→enter→align→lock→ability→ready with click/lock SFX; normal/reduced motion state stays synchronized |
| MJ-17 | Gentle child-safe scenes, no weapon/skull/dynamite extras used; no hijab rule breach; no emoji, no manipulative monetisation/chat/rankings |
| MJ-18 | Shared world map tile, manifest, shell cache, per-avatar SaveEngine stars/checkpoints, profile/settings/reset parent gate, offline play, global mute |
| MJ-19 | All original50-form/250-family catalogue retained with actual verb/action/scenario/microgame variation; no cosmetic unlocks passed as functional forms |
| MJ-20 | Variant planning4–7 per family,8 cross-form recipes, contextual selector groups and staged form unlocks preserved as authoring backlog when beyond delivered phase |
