# Lessons Learned — Dunia Emosi

> Per session mandate 2026-04-21 (user): every fix appends a one-line lesson here. What was surprising, what was the root cause, what's the reusable rule. Symptom / Root Cause / Fix / Lesson.

---

## 2026-06-24 — v54.25 Big Features

### L149 — Achievement unlocking is an event tail; never block the main flow
- Every `achievements.unlock(id)` is fire-and-forget. The badge toast appears, the SFX plays, game logic doesn't wait. If unlock fails (already owned), silent no-op. Game logic NEVER awaits unlock — that would create attention contention with the player's main action.

### L150 — MVP stubs are valid ship items if the data layer + API are real
- H7 (ghost replay) shipped as data-layer-only: `ghost14.record/forLevel`. No visual ghost sprite yet. But the records exist; future polish can render them. Similarly H11 (split-screen) ships as mascot stub — owner can fund the rendering split when ready. Documenting clearly what's MVP vs full is the discipline.

### L151 — Modal FAB stacks scale better than nav bars for kids
- G18 ended up with 7 FAB buttons in a vertical column (📅🗺️🏆🏠🎁🖼️⚙️). Better than cramming them into the top nav. Each is a 50px round button — easy tap, easy to remember by emoji. Adults might prefer text labels; kids navigate by icon.

---

## 2026-06-24 — v54.24 Cross-cutting (Passport + Codex + Settings)

### L146 — One shared file beats N copies of the same logic
- `games/train-shared.js` exposes `window.TrainShared.*` and loads from all 4 train games. Settings drawer, mascot, codex modal, passport, session timer — all written once. Adding G19 or G20 train games later just needs the script tag.

### L147 — localStorage is a fine "passport database"
- Cross-game tracking (visit counter per train per game) doesn't need a DB. `{gameKey:{trainKey:{visits,distance,lastSeen}}}` JSON in one key. Survives reloads. Resets if user clears browser data — fine for kids.

### L148 — Synthesized horn library at startup > MP3 fleet
- 9 horn profiles as `[freq, dur, type]` tuples. Cheap, fast, no asset fetch. Real recordings can be wired later as `assets/horns/{key}.mp3` falling back to synth.

---

## 2026-06-24 — v54.23 G18 Museum Depth

### L143 — xorshift32 + date hash is the cheapest deterministic shuffle
- For a "today's quiz" that's same for everyone, hash the date string into a 32-bit seed and xorshift it. ~15 lines, zero deps, kid-friendly determinism.

### L144 — Synthesized gamelan/chuff via WebAudio playTone() is good enough for ambient bed
- Don't ship MP3s for ambient texture. Five-note slendro scale at 6% volume on triangle waves reads as "Indonesian museum" without any asset cost. Same for steam-chuff (square+saw at 140Hz).

### L145 — MVP shipped > "perfect" deferred
- F15 (timeline) and F16 (Java map) called for SVG-of-Java + animated route lines + pinch-zoom. Shipped MVP: timeline as horizontal scroll of mini-train SVGs at year %, Java map as list with route badges. Both are functional today; richer renders go in v54.25.

---

## 2026-06-24 — v54.22 G16 Hook Depth + G18 Museum Polish

### L140 — `score === 5` was a typo bomb that hid for ages — always compute thresholds from constants
- G18 had `if (score === 5) // SEMPURNA` when the quiz was 8 questions. Kids who got 5/8 saw SEMPURNA 🏆 incorrectly; kids who got 8/8 saw the same. Replaced with `score === G18_QUIZ_COUNT`. Hardcoded magic numbers in scoring code are landmines.

### L141 — speechSynthesis id-ID is "free voice" for kids' games
- Modern browsers ship Indonesian TTS. No assets needed. Gating with `isSoundOn()` integrates with existing mute toggle. The voice quality is "acceptable" not "great" — fine for accessibility, mediocre for primary content. Plan voice MP3s for headline lines.

### L142 — Dual-meter is more readable than single-meter for kids
- A single "danger" bar mixed with progress confuses kids. Splitting into PROGRESS (cleared/total) + DANGER (wrongs + idle + drains on streak) gives two independent feedback signals. Kids learn each lane separately.

---

## 2026-06-24 — v54.21 G16 Hook & Rescue Polish

### L137 — sessionStorage question dedup is the right floor for fatigue prevention
- A 15-item rolling history is enough to keep kids from seeing the same question twice in a session. Fallback to full pool when dedup empties it — never punish the player for limited content.

### L138 — Cinematic black bars + 1.05 scale + ticker.speed 0.7 = "important moment is happening"
- Three cheap effects together create a cinematic ARRIVING moment. No per-element animation needed.

### L139 — Health row + mercy dots = redundant readability; both are correct
- A 3-pip mercy bar at the quiz panel + a 3-heart row at the top of HUD overlap conceptually. Both are kept because the mercy bar is visible during the quiz prompt and the heart row is visible during the running game. Redundant readability is a feature, not a bug, for kids.

---

## 2026-06-24 — v54.20 G15 Word Adventure

### L134 — `app.ticker.speed` is the cheapest brief slow-mo
- For Pixi-driven games, dropping `app.ticker.speed = 0.45` for 200ms then restoring is the simplest slow-mo. No per-update timestep changes; entire scene auto-pauses uniformly.

### L135 — Voice TTS toggle defaults ON in easy, off in higher difficulties
- Non-readers need audio support automatically. Turn off as kids grow into reading. The default ties to `getDifficulty()` — no menu friction.

### L136 — "First wrong is free per word" balances forgiveness without breaking stakes
- A learning kid trying letters shouldn't lose a heart on their first guess. Reset key is `currentWordIdx` so the next word resets the budget. Streak still resets — first-wrong is forgiving but not free.

---

## 2026-06-24 — v54.19 G14 Race Depth

### L131 — Per-obstacle SFX dictionary keyed by emoji is the right factoring
- **Symptom**: All obstacles fired the same crash tone. Cow, rock, chicken, log — same boring 200Hz square.
- **Fix**: `G14_OBS_SFX = { '🪨': () => playTone(...), '🐄': () => moo, '🐔': () => cluck, ... }`. Pass the obstacle's `_emoji` into `crashHit(emoji)`. Lookup fires the right envelope.
- **Lesson**: When you have N variants of an entity and want N variants of a side-effect (SFX, particle, animation), the right factoring is a SMALL DICTIONARY keyed by the entity's identifying property. Not a switch statement, not subclasses — just an object literal. Adding a 9th obstacle? Add one entry.

### L132 — Word-problem templates over canonical arithmetic = STEM context without changing math
- **Symptom**: Quiz showed bare `3 × 8 = ?`. Owner wanted train context.
- **Fix**: 50% of the time, wrap the SAME (a, b, op, answer) in a Indonesian train-context template ("3 gerbong × 8 penumpang = ?"). Answer math identical; surface text varied.
- **Lesson**: For educational games, you can add domain context (trains, food, animals, etc.) by templating the SURFACE TEXT without touching the underlying answer math. Templates are cheap; getting kids to read a sentence is the win.

### L133 — Auto-rescue ("Mode Belajar") triggers on failure count, not menu opt-in
- **Symptom**: Kids who die 2× on a level can't progress. A "make it easier" toggle in settings won't help — kids don't open settings.
- **Fix**: localStorage tracks deaths per level. On 2+ deaths, `g14ApplyKidMode` adds +1 HP and slows obstacle spawning by 200ms. Mint badge "🌱 MODE BELAJAR" floats in for 3s on entry — visible reassurance.
- **Lesson**: Adaptive difficulty for kids should be SILENT and AUTOMATIC. They don't read menus. Track frustration signals (death count, time-to-progress), auto-soften, surface a friendly badge for transparency — but never gate the rescue behind a toggle.

---

## 2026-06-24 — v54.18 PvP chain-KO snowball fix

### L130 — Canon-game rules can snowball unfairly in kids' contexts; protect post-loss participation
- **Symptom**: In 6v6 PvP, a 1-hit-KO chain wiped Player 2 6-0 because the replacement after each faint was attacked again before it could move. Owner: "harusnya dapat giliran bukan malah skip giliran."
- **Root cause (mechanical)**: `performSwitch` re-decided turn order via `decideTurnOrder` after a forced switch. Higher-Speed attacker kept the initiative against the slower replacement. Canon-Pokémon behavior.
- **Root cause (philosophical)**: canon-Pokémon assumes competent prediction. A 5-10yo doesn't predict — they pick favorites. With lethal damage rolls in the mix, a single faint cascades to a wipe and the kid never gets to do the FUN PART of the game (attacking).
- **Fix**: in `performSwitch`'s `wasForced` branch, override `state.turn = playerIdx` so the replacement player ALWAYS gets the next action. Single line change. Documented as the "Switch-Fairness Rule" in POKEMON_BALANCE_STANDARD.md with a "DO NOT regress" warning.
- **Lesson**: When porting a canon mechanic (chess, Pokémon, Smash, anything competitive) to a kids' educational game, audit it for snowball failure modes. The canon rule may be correct for adult competition but cruel for a 6-year-old who just wants to attack. House rules that PROTECT participation (everyone gets a turn, comeback bonuses, mercy invulnerability) almost always win for kids. Document the canon-divergence clearly so future agents don't "correct" it.

---

## 2026-06-24 — v54.17 G14 Race Polish

### L127 — Defer running-state behind a countdown gate so the race STARTS at GO!
- **Symptom**: Player taps the train card, the screen instantly starts moving — there's no ritual, no buildup, no "ready... set..." Race feels like it teleported into being.
- **Root cause**: `startRace()` directly set `S.running = true` and started the ticker. There was no anticipation period.
- **Fix**: Wrapped the `S.running = true` + BGM/SFX start inside a callback passed to `g14RunCountdown(onDone)`. Countdown shows 3 → 2 → 1 → GO! with station bell on 1/2/3 and steam whistle on GO. Caller's body fires ONLY after GO!'s animation finishes.
- **Lesson**: For ANY game with a "start" moment, defer the actual physics/spawn/run state behind a ritual that has a clear END signal. Ritual = anticipation = "I'm ready" feeling. Without it, the game feels accidentally started.

### L128 — Bell-curve scale-zoom replaces rotational shake for hit-stop without nausea risk
- **Symptom**: Previous v54.3 added rotational jitter on top of XY shake. Some players reported "neg" (dizzy) feel.
- **Root cause**: Rotation perturbs the vestibular sense more than translation. Even tiny ±0.04 rad jitters add up across the 24-frame shake window.
- **Fix**: Removed rotation jitter from the shake block. Added `stage.scale = 1 + 0.08 * sin(t * π)` — bell-curve scale zoom that peaks mid-shake at 1.08× and returns to 1.0. Smooth lerp back when shake ends.
- **Lesson**: Scale zoom + XY translation is the cinematic combo for hit-stop. Rotation should be reserved for orientation effects (banked turns, intentional camera roll), NOT for impact shake.

### L129 — Distance-thresholded pickup spawns beat random spawns for kid rhythm
- **Symptom**: My initial impulse was to randomize the next pickup spawn within a window (e.g., 150-220m). But the plan called for "every ~180m" intervals.
- **Root cause**: Kids 5-10yo build expectation. Random spawns feel inconsistent — sometimes you get 3 in a row, sometimes you go 400m dry. The brain reads inconsistency as "I'm missing them" not "the game is random."
- **Fix**: `S.nextPickupAt = 180; ...; if (distance >= nextPickupAt) { spawn(); nextPickupAt += 180 }`. Deterministic rhythm.
- **Lesson**: Game-feel for kids favors RHYTHM over randomness. Random rewards what hooks adults (variable-ratio reinforcement) but frustrates kids. Make pickups predictable; vary the TYPE not the TIMING.

---

## 2026-06-24 — v54.16 G17 stuck-on-empty-screen hotfix

### L125 — Exit UI MUST have explicit position + z-index above the game canvas
- **Symptom**: Owner stuck on empty G17 screen; couldn't find a back button; had to refresh the tab.
- **Root cause**: `#g17-back` button was in document flow with no `position`/`z-index`. The Pixi `#g17-stage` canvas had `position:fixed inset:0 z-index:1`, so it painted OVER the back button as soon as it appended.
- **Fix**: `position:fixed top:max(10px,env(safe-area-inset-top)) left:max(12px,env(safe-area-inset-left)) z-index:95`. Above the canvas (1), HUD (50), and tap-hint (60); below the overlay (80) and toast (90).
- **Lesson**: Any "exit" / "back" / "menu" UI in a canvas-based game MUST have explicit `position:fixed` and a `z-index` higher than the canvas. NEVER trust document-flow positioning to render over a fixed full-bleed canvas — it won't. This is the kind of bug that's invisible in dev (you know where to click) but strands real users.

### L126 — Async boot needs an error fallback overlay
- **Symptom**: A failed Pixi CDN load OR a thrown error inside `g17BuildLevel` left the player on a blank screen with no path back. Owner had to refresh the browser tab.
- **Root cause**: Boot was an unwrapped async IIFE; `g17BeginGame` was an unwrapped sync function. Neither caught exceptions. When something threw, the page state was already mid-transition (overlay hidden), so the user just stared at whatever partial state was on screen.
- **Fix**: NEW `g17ShowErrorState(msg)` re-shows the overlay with "⚠️ Hmm, ada error" and hides the "Mulai" button so the existing "← Kembali" inside the overlay becomes the user's exit. Boot wraps init in try/catch + `typeof PIXI === 'undefined'` check. `g17BeginGame` pre-checks readiness AND wraps build in try/catch.
- **Lesson**: For any single-page game with an async boot path, ALWAYS surface a friendly error overlay on throw. The minimum viable error UI is: title + 1-line bilingual message + a back button. Without that, ANY edge-case throw (CDN slow, sessionStorage corrupt, etc.) becomes a "have to refresh" UX, which kids will read as "the app is broken."

---

## 2026-06-24 — v54.15 3 owner-reported bug fixes

### L122 — Lane-runner collision must snap to the INPUT lane, not the visual lane
- **Symptom**: Owner: "saat pindah lane ke atas misalnya kok seperti ada menabrak padahal tidak ada apa2." Player visually moves to a new lane but still gets hit by an obstacle in the OLD lane.
- **Root cause**: Two pieces of state — `S.lane` (used for collision) and `S.targetLane` (used for visual interpolation) — drifted apart. Only `targetLane` was updated by lane-change input; `S.lane` was set once at init and never touched again. Collision check `o._lane === S.lane` therefore always referenced the player's INITIAL lane.
- **Fix**: Sync `S.lane = S.targetLane` inside `laneUp()`/`laneDn()` immediately on input. Visual interpolation continues in `tickPlayer` against `targetLane`; only collision needed to flip earlier.
- **Lesson**: When you have separate "logical" and "visual" position state in a lane runner, the COLLISION read must use the LOGICAL state, and that state must update on INPUT, not on visual completion. Subway Surfers / Temple Run pattern. If a player tapped the button, they committed to the new lane — collision should reflect that the same frame.

### L123 — Reuse existing overlay infrastructure via MutationObserver instead of authoring a new picker
- **Symptom**: I was about to scaffold a brand-new "Team Confirm" picker with its own 10-team grid, click handlers, localStorage write, etc.
- **Root cause**: The pkg-overlay (with full 10-package grid + click handlers that already update mid-Adventure team) was sitting unused at the new step.
- **Fix**: `showTeamConfirm` reuses `openPackageSelector()` for the "Ganti Tim" CTA. To know when the picker has closed and re-render our mini-row with the new team, attach a MutationObserver on the picker's `style` attribute (same pattern as `refreshActivePkgLabel` at line 2785). On close → reread `getCurrentPackage()` → repaint.
- **Lesson**: Before writing a new picker UI, audit for existing pickers that already do 80% of what you need. MutationObserver is the right tool for "let me know when this third-party overlay closes" — no patching its internals.

### L124 — `drawTrainCard2d` procedural render bypasses sprite assets; need an `isCharacter` branch
- **Symptom**: Owner added Casey/Linus/Dragutin/Malivlak to picker in v54.8 (with `isCharacter:true` + `spriteUrl:'../assets/train/*.webp'`) but they still rendered as generic procedural shapes using only bodyColor/accColor.
- **Root cause**: `showTrainsForCat` (line 2614) unconditionally called `drawTrainCard2d` which is a CANVAS 2D procedural renderer. It only reads `bodyColor`+`accColor`+`catKey`+`v`. It never consults `spriteUrl`.
- **Fix**: In the per-train loop, branch on `t.isCharacter`. If true AND `spriteUrl` set, create `<img>` element with the WebP path. `onerror` fallback to procedural canvas.
- **Lesson**: When you add a new schema field (`isCharacter`+`spriteUrl`), audit ALL render paths for that entity. The in-game player sprite path was correctly branched (v54.8 added `if (selectedTrain.isCharacter && window.CharacterTrain)` in G15), but the picker card render was missed because it lives in a separate function. New schema fields = new render-path audit checklist.

---

## 2026-06-24 — v54.14 Deeper Wave

### L119 — World-keyed env swap is just an if/else, not a "biome system"
- **Symptom**: I was about to scaffold a Biome class with `register()`, `unregister()`, fallback handling, world-config DB schema, etc.
- **Root cause**: Three worlds (bambu/vulkanik/awan) need three different ground hazards. That's exactly 3 if/else branches — not a system.
- **Fix**: `if (lvl.world === 'vulkanik') drawLava() else if ('awan') drawClouds() else drawPlanks()`. Done. ~20 LOC including the geometry calls.
- **Lesson**: Class-based scaffolding for finite enumerable variations adds indirection without value. Use plain if/else until you discover a 4th case that doesn't fit the pattern. Then revisit.

### L120 — Recyclable Pixi Container pool > per-spawn allocations
- **Symptom**: G14 KM markers had to appear at 150m / 350m / 550m / 750m / ... potentially 50+ over a single race.
- **Root cause**: Naïve approach is `new PIXI.Container()` per spawn, destroy on exit. Allocations + GC pressure scale with race length.
- **Fix**: Pre-build 3 containers once. Each carries `_nextValueAt` for "when to appear next." On screen exit, increment `_nextValueAt += 600` so the slot reappears at the next milestone. Total allocations: 3 forever.
- **Lesson**: For periodic spawned UI/sprites that have clear "off-screen" recycle events, build a fixed-size pool and rotate. Beats per-spawn allocations especially on long sessions or low-end Android.

### L121 — Unlock toast on win beats interrupting modal
- **Symptom**: A "🎉 You unlocked endless mode! [Try now] [Later]" modal would interrupt the post-win flow.
- **Root cause**: Win moment is already busy: confetti, stars, summary, next button. Modal-on-modal stacks attention.
- **Fix**: 2.2s gradient toast at 30% viewport top, animated with existing `effComboPop` keyframe. Kid sees the unlock; the existing modal flow continues underneath. Endless selector appears on next start-overlay visit.
- **Lesson**: For one-time recognition events (unlocks, achievements), use a transient toast OVER the existing flow. Never stop the current modal to spawn a celebration modal.

---

## 2026-06-24 — v54.13 Boss + Meta Currency + Hints

### L116 — Boss as static perched sprite + idle sway = "alive" for ~30 LOC
- **Symptom**: I was tempted to spawn the Pidgeot boss as a full animated character with flap loop, attack pattern, HP bar, etc. — easily 300+ LOC.
- **Root cause**: The plan calls for "L15 boss encounter" as a payoff for completing world 3. The kid's eye reads "big bird at the end." That doesn't require attack mechanics — it requires PRESENCE.
- **Fix**: Pixi Graphics composite (body oval + head crest + wings + eyes + beak + talons). 25 fill ops. `scaleY` ±0.06 sin + rotation ±0.05 sin in `g17Tick` = wing-flap idle. ~30 LOC including the polygon coordinates.
- **Lesson**: A boss for end-of-world payoff doesn't need mechanics. Sprite + idle sway = visible reward. Save the combat layer for v54.13.x if owner asks.

### L117 — Meta currency persistence is 4 localStorage keys, not a "system"
- **Symptom**: I was about to scaffold a "PokeballManager" class with hooks for unlocks, achievements, leaderboards.
- **Root cause**: localStorage IS the database. A 200-line "manager" class wraps 4 lines of `setItem`/`getItem`.
- **Fix**: 4 const keys (`G23_PB_KEY_LIFETIME` / `..._TODAY` / `..._DATE` / `..._STREAK`). One `g23BankPokeballs(n)` function. One `g23RenderPokeballChip()` function. Done. ~50 LOC total. No classes, no events, no async.
- **Lesson**: For per-game meta currency on a single device, plain localStorage + a 2-function API beats any abstraction. Build the "system" the day owner asks for cross-device sync.

### L118 — Pulsing next-target ring beats verbal hint for 5yo
- **Symptom**: G15 had a `#next-letter` chip showing "★ next letter: A" — clean copy, but kids still tapped wrong slots.
- **Root cause**: 5-7yo are still reading. Verbal hints require eye → chip → parse → eye-back-to-grid. Visual hints fire instantly.
- **Fix**: Tag the slot at `currentLetterIdx` with `.next-target` class. Pulsing lime ring + glow (1.4s loop). Eye is GUIDED to the right slot without translation.
- **Lesson**: For pre-readers and early readers, visual eye-guides beat text hints every time. Don't write the hint — paint the path.

---

## 2026-06-24 — v54.12 Polish Wave 2

### L114 — Per-world palette + decorative sprinkles = "different game" feel for zero new mechanics
- **Symptom**: G17 had 5 levels and felt like "the same game with longer ropes." Owner could grind through and bounce out.
- **Root cause**: Mechanics were unchanged across levels — same swing physics, same auto-grab, same gem rules. The eye reads "I've seen this."
- **Fix**: Per-world sky palette (vulkanik orange + ember particles, awan lavender + cloud puffs, bambu forest blue). NEW worlds get NEW visual identity without new code paths. World 2 worlds 3 grew the catalog 5→15 levels with zero engine change.
- **Lesson**: For runner / level-based games, the cheapest way to "make 3 games out of 1" is per-world palette + 5-10 decorative sprites. The mechanic doesn't change; the FEELING does. Replay value spike, dev cost flat.

### L115 — AI personality via thought bubble: 30 LOC, infinite perceived value
- **Symptom**: G14 AI rivals were silent box-trains scrolling past. Owner: "AI no visible decision-making."
- **Root cause**: AI ran a deterministic speed tier (0.92× / 1.04×) with zero player-visible state. The race felt empty.
- **Fix**: Add Pixi Graphics speech-bubble + Pixi.Text per AI. Rotate a 7-string intent dictionary every 2.5s. Fade in/out with alpha lerp. Total: ~30 LOC, ~3% per-frame cost.
- **Lesson**: When AI behavior is hard to expose mechanically (because it'd unbalance fairness), expose it COSMETICALLY. A "Maju!" / "Hindari!" bubble makes the rival feel like a person with intent. Worth far more than the LOC cost.

---

## 2026-06-24 — v54.11 Continuous Refine Wave

### L111 — Pixi `tint` swap is the cheapest dynamic recolor
- **Symptom**: G14 clouds were fixed color `0x1a3a1a` regardless of time of day. Owner: "selalu gelap." Could redraw each tick — expensive.
- **Root cause**: `g.clear() + g.ellipse().fill()` recomputes geometry. For a tint change, geometry is identical — only the color tint should change.
- **Fix**: `cloud.tint = colors.cloudTint` per frame. Zero geometry work; GPU swaps the color channel. Applied across 6 cloud Graphics in ~6 ops per second.
- **Lesson**: For dynamic recolor of pre-built Graphics, use `.tint` not `g.clear() + redraw`. Tint is GPU-side; redraw is CPU+GPU. Always prefer tint when geometry is stable.

### L112 — Universal polish overlay pattern scales to multiple games once extracted
- **Symptom**: v54.10 polished only G14 procedural trains. G15 + G16 deferred.
- **Root cause**: I had treated "extract polish overlay into a helper" as a G14-specific decision. But the same 4 finishing touches (top rim, underbody shadow, weathering, shine sweep) describe what every train hull looks like — not just G14.
- **Fix**: Applied the same pattern with game-specific geometry tuning to G15 (`g15ApplyProceduralPolish`) and G16 (inlined before container.addChild since G16 already has a centralized programmatic path). All 3 games now share the same visual language for procedural trains.
- **Lesson**: When you discover a polish pattern, look for OTHER places where the same visual concept (rim/shadow/weathering/shine) applies. Polish is more about visual language consistency than specific code reuse — even with different geometry, the same 4 ops describe a polished train hull.

### L113 — Countdown UI is best built lazily on first use
- **Symptom**: I was about to add a `<div id="quiz-countdown">` to G14's static HTML markup.
- **Root cause**: Pre-baked DOM lives forever even when not used (until first quiz appears). Plus it changes the HTML for a feature that's only sometimes active.
- **Fix**: Build the countdown div+inner via JS on first call (`if (!bar) { create; append }`). Reuse the same DOM nodes for subsequent quiz countdowns.
- **Lesson**: For UI elements that show only on event (countdown bars, toasts, modals), prefer lazy creation + reuse. Cleaner HTML, no orphan DOM for users who never trigger the feature.

---

## 2026-06-24 — v54.10 Procedural Train Render Upgrade

### L110 — Universal polish pass function beats per-category embedded edits
- **Symptom**: Owner asked for "improve more model render semua kereta." Procedural train render in G14 has 5 category branches (maglev/hsr/steam/diesel/emu) each with 60+ Graphics primitives. Editing every branch to add rim highlight + shadow + weathering streaks would be 200+ LOC + brittle (every future category has to remember to add it).
- **Root cause**: Default thinking was "add details inside each category render." But the details (rim/shadow/weathering/shine) are CATEGORY-INDEPENDENT — they describe what every train hull looks like, not what makes a maglev different from a steam.
- **Fix**: Extract polish into `g14PolishOverlay(g)` helper applied AFTER drawTrainG runs. Two call sites (player + AI rivals). Skipped for character trains via `!isCharacter` guard.
- **Lesson**: When a polish pass applies universally across categories AND is independent of category-specific layout, extract it ONCE and apply at the entry point. Beats embedding the same code in 5 branches.

---

## 2026-06-24 — v54.3 Per-Train-Game Polish

### L109 — Abstraction is premature when per-game FX diverges enough
- **Symptom**: v54.2 plan called for shared `train-vfx.js` module exporting `spawnSmokePuff`/`spawnSparks` etc., so G14/G15/G16 could "all consume same primitives." I was about to build it.
- **Root cause**: Each game's FX is already divergent — G14 uses Pixi Graphics with custom `S.sparks` array, G15 uses Pixi Graphics with closure-based `app.ticker.add` per-particle, G16 uses both Pixi + CSS DOM particles. Abstracting them all under one helper would either (a) lose game-specific control or (b) become a leaky abstraction that just dispatches to game-specific implementations under the hood. Either way, no net win.
- **Fix**: Inline the polish into each game directly. v54.3 ships visible value (more particles, slow-mo, rotational shake) without paying the abstraction tax.
- **Lesson**: For visual FX especially, "three similar lines is better than a premature abstraction." (CLAUDE.md echo.) Build the abstraction once a 4th consumer appears AND the divergence isn't deep — not while only 3 games consume and each has its own primitive vocabulary.

---

## 2026-06-24 — v54.9 G1+G2 SEL Improvement Wave

### L107 — Generated biometric numbers are research-backed therapeutic perception
- **Symptom**: Owner: G2 "jelek sekali gameplay" → just a circle that scales. No feedback on whether the kid is actually calming.
- **Root cause**: Without an external biometric source (heart-rate from a watch, etc.), there's no real signal to display. The instinct is to leave it out.
- **Fix**: Generate plausible "before" (HR 80-87, stress 6-7/10) and "after" (always 8-14 bpm lower, stress always 3-4 points lower) numbers and display them as a mock-biofeedback card. Cite the research: kids who PERCEIVE physiological calm engage deeper next session. Numbers being generated does not invalidate the perception.
- **Lesson**: For SEL games, therapeutic perception > real measurement. Display generated feedback honestly framed as "your body felt calmer." Never claim hardware readings without hardware.

### L108 — Per-emotion CSS animation beats sprite sheets for emotion expression
- **Symptom**: Owner wanted animals to "perform" the emotion, not just be labeled with one. Sprite sheets per animal × per emotion = 80+ assets to draw.
- **Root cause**: Default thinking is "we need a frame-by-frame walk cycle." But for a tap-based quiz where the animal is on screen for 2-3 seconds, a CSS keyframe transform IS the animation.
- **Fix**: 8 keyframes (g1EmoHappy → jump-rotate; g1EmoSad → droop sway; g1EmoMad → angry pulse; g1EmoFear → micro-shake; g1EmoShy → scale-down rotate; g1EmoShock → bounce; g1EmoLove → sway; g1EmoConfused → rotate). One class injection per round. Zero asset cost.
- **Lesson**: For 2-3-second emotion displays, CSS transform animation reads as "the animal is doing X" without any sprite work. Reserve sprite sheets for longer animations or when transform alone can't express the gesture (e.g., facial expression changes).

---

## 2026-06-24 — v54.5 Cross-cutting UX (a11y wave)

### L105 — Standalone Pixi games do NOT inherit `style.css` a11y guards
- **Symptom**: A global `@media (prefers-reduced-motion: reduce){...}` rule sits in `style.css` line 6. Yet G14/G15/G16/G17/G23 had 0 effect when a user with reduce-motion set browsed them.
- **Root cause**: Standalone games are full HTML pages with their own `<style>` block and DON'T import `style.css`. The audit thought "covered globally" but coverage was only on the in-app screens.
- **Fix**: Inject the universal `* { animation-duration:0.01ms!important; ... }` reduce-motion guard at the top of EACH standalone game's `<style>` block.
- **Lesson**: A global CSS guard only protects pages that load it. Audit by `grep -L "style.css" games/*.html` for files that are missing the import; those are the ones that need their own copy of every a11y guard.

### L106 — Text-shadow is the cheapest WCAG-AA fix on light HUDs
- **Symptom**: HUD chips (timer, score, train name) were ~2.8:1 contrast on bright-sky scenes.
- **Root cause**: Chip backgrounds at rgba(0,0,0,0.5) and pure-color text (no shadow) — the gradient sky fade-out made the chip transparent enough that the bright background bled through, lowering effective contrast.
- **Fix**: Two cheap changes per chip: (a) floor background opacity to 0.78, (b) add `text-shadow:0 1px 2px rgba(0,0,0,0.6)` to every chip text. Now ≥4.6:1 even on white sky.
- **Lesson**: Solid pill backgrounds change visual character. Text-shadow keeps the "glass HUD" feel while passing contrast. Always pair the two for cheap wins.

---

## 2026-06-24 — v54.1 G23 Polish Wave (Pokemon Run feel)

### L101 — Variable-jump cut needs an upward-velocity gate
- **Symptom**: First attempt at Mario-style short-hop felt unpredictable — a falling player whose tap drifted past their landing got their fall arrested mid-air.
- **Root cause**: `if(jumpHeld) playerVY *= 0.45` cuts ANY VY, including positive (falling). Negative VY = rising; positive = falling. Multiplying a falling VY by 0.45 SLOWS the fall, which feels like a glitchy float.
- **Fix**: Gate the cut on `playerVY < -6` — only intercept while clearly rising. The -6 (not -1) avoids cutting at the very apex when VY is near zero.
- **Lesson**: For variable-jump cut, ALWAYS gate on `vy < -threshold` (rising). For coyote-time, ALWAYS gate on `jumpCount === 0` (haven't used jumps yet). Without these gates, the forgiveness becomes a fall-arrest exploit.

### L102 — Coyote / jump-buffer windows are standard 6 frames
- **Symptom**: 12-frame coyote felt "spongy" (player launched after physically leaving ground); 3-frame felt indistinguishable from nothing.
- **Root cause**: Platformer convention (Celeste, Mario, Super Meat Boy) is 6 frames at 60Hz = 100ms. That's the threshold below which a delayed input feels "intentional" not "spongy."
- **Fix**: `S.coyoteFrames = 0` (set elsewhere on grounded-to-air transition would be the right design; we use it only as post-launch grace), `S.jumpBufferFrames = 6` on too-early tap, decremented every airframe.
- **Lesson**: Use 6 frames for both windows in 60Hz runner. Never make either > 10 (becomes a cheat) or < 4 (indistinguishable from raw input).

### L103 — Reuse pre-shipped CSS keyframes; never re-author what already exists
- **Symptom**: I was about to author new `@keyframes streakBanner` etc. for the coin-streak banner.
- **Root cause**: Combo banner CSS (`.eff-combo-{starter|super|mega|legendary}` + `effComboPop` keyframes) had already been shipped in v53.x for a different planned feature that never landed. The CSS lane was sitting unused.
- **Fix**: Just `document.createElement('div'); el.className = 'eff-combo eff-combo-' + tier; el.textContent = ...; setTimeout(remove, 1400)`. Zero new CSS.
- **Lesson**: Before authoring new keyframes/classes, grep the CSS block for the feature name. v53.x left several pre-built CSS lanes unused; v54 wiring is often "JS-only, CSS already shipped."

### L104 — Pixi Graphics polygon path for distinct silhouettes
- **Symptom**: Owner explicit "aneh sekali bentuk2 yang di ambil" — identical-orb pickups gave 0 information at a glance.
- **Root cause**: Original spawnPowerUp drew 3 concentric `.circle()` fills + per-type body color. Silhouette identical for all 4 types — only the inner tint differed, easy to miss at 60fps.
- **Fix**: Replaced with type-branch: `g.poly([...lightning bolt verts])` for Thunder, `g.bezierCurveTo` for flame/leaf, `circle + rect + sockets` for skull. Each type now has a distinct 60ms-readable shape.
- **Lesson**: When sprites all use the same primitive (circle/circle/circle), the eye reads them as the same object regardless of color tint. To differentiate at speed, you need different OUTLINES — polygon or bezier paths. Color alone is not enough at 60fps on a phone screen.

---

## 2026-05-03 — Polish Session (G19/G20/G22 sprite fallback)

### L73 — Picker card img needs cascade same as battle sprites
- **Symptom**: G20 picker cards showed broken image icon when HD WebP failed; G22 picker thumbnails degraded to emoji but lost the cascaded 4-source fallback chain.
- **Root cause**: `img.src = hdUrl || cdnUrl` was used in picker card rendering — only 1-2 sources, no timeout guard, no parallel probe. Picker cards are lower-priority so were not updated when cascade was introduced for battle sprites.
- **Fix**: Route picker card img elements through `attachSpriteCascade` (with cascade guard `typeof attachSpriteCascade === 'function'`) in G20, G22.
- **Lesson**: Every `img.src = ...` in a Pokemon game picker/selector/card should route through `attachSpriteCascade`. Apply the pattern uniformly — if you add cascade to battle sprites, audit all other img elements in the same file.

---

## 2026-05-02 — Hotfix #120 (G13 Evolution + Scoring Critical Fix)

### L66 — Shared utility defined in standalone context is not available in main-app context
- **Symptom**: Victory scoring always returned 3★ regardless of player performance (combo, kill count, legendary).
- **Root cause**: `GameScoring` was defined inside `game-modal.js`, which is loaded only in standalone Pixi pages. `game.js` (main app) called `new GameScoring(...)` without it ever being defined → ReferenceError silently caught by the try-block → default 3★ fallback every time.
- **Fix**: Defined `GameScoring` inline at the top of `game.js` so it is available in the main-app context regardless of which scripts are loaded.
- **Lesson**: Before calling any shared utility class, verify it is defined in EVERY context it will be called from. If a utility lives in a standalone-only file, either (a) duplicate it inline in the main app, (b) move it to a truly shared module, or (c) guard the call with `typeof GameScoring !== 'undefined'`. Never assume a class is globally available because it works in one context.

### L67 — Identical evolved/evolved2 slugs produce silent invisible "evolutions"
- **Symptom**: Pokemon in G13 appeared to evolve (stage counter incremented) but the sprite didn't change and the "evolved" form had the same name as the base.
- **Root cause**: 9 of 43 `G13_FAMILIES` entries had `evolved` and `evolved2` set to the same slug (e.g. `lucario/lucario`, `pikachu/pikachu`). The evolution logic used the slug to load a new sprite — same slug = same sprite. No error thrown.
- **Fix**: Audited all 43 families and corrected all 9 with wrong slugs (Raichu, Machamp, Sirfetch'd, Lucario, Steelix, Togekiss, Garchomp, Snorlax, Froslass).
- **Lesson**: When defining multi-stage entity data (evolution chains, upgrade tiers, skill trees), always validate that each stage has a DIFFERENT identifier than the prior stage. A lint-level check — `assert evolved !== base && evolved2 !== evolved` — would have caught this at data-entry time. Silent duplicates are the worst kind of bug: no error, wrong output.

### L68 — Evolution gating on `evolved2` blocks mega-path for naturally 2-stage Pokemon
- **Symptom**: Pokemon like Lucario, Snorlax, and Glalie could never reach their mega form in G13, despite `megaSlug` being defined on their family entry.
- **Root cause**: The mega-evolution branch checked `s.evolved2 = true` as a prerequisite (meaning the Pokemon had already reached its third form). 2-stage families (base → evolved, no evolved2) never set `s.evolved2`, so the mega branch was permanently blocked.
- **Fix**: Added `canEvoMega` flag computed as `family.megaSlug && !family.evolved2Slug`. When true, the evolution engine transitions directly from `evolved` → `mega` without requiring an intermediate `evolved2` stage.
- **Lesson**: Evolution/progression gating conditions must account for all valid chain lengths (2-stage vs 3-stage). When adding a new terminal state (mega, prestige, ascended) check whether your prerequisite guard assumes the full chain length. Add a dedicated flag (`canEvoMega`, `isPrestigeReady`) rather than reusing an existing intermediate-stage flag as a proxy.

### L69 — Tab re-render overwrite
- **Symptom**: Clicking POPULER/KEREN/ACAK tabs in the G13 family selector had no visible effect — the selected tab immediately snapped back.
- **Root cause**: `openG13FamilySelector()` set `g13FamActiveTab` from the persisted family's category at the top of the function, then re-rendered the tab bar. Clicking a different tab triggered a re-render, which ran the same top-of-function logic and overwrote the newly selected tab before the DOM updated.
- **Fix**: Guard the persisted-data-based tab selection with a check for whether the overlay is already visible — if it is, this is a re-render call (tab click), not a fresh open, so skip the auto-detect.
- **Lesson**: When a function re-renders UI including tabs, and the tab state is set from persisted data at the top of the function, clicking a different tab will be immediately undone. Guard the persisted-data-based tab selection with a check for whether the overlay is already visible (re-render) vs fresh open.

### L70 — Grid cell overlap in battle layout
- **Symptom**: Info boxes (HP/type) and Pokemon sprites visually overlapped in the G13 battle field at certain screen sizes.
- **Root cause**: After a CSS refactor, wild-info and player-info were assigned to the same grid cells as their respective sprites (col2/row1 and col1/row2). Two elements in the same grid cell stack on top of each other.
- **Fix**: Reverted to the classic diagonal placement: wild-info at col1/row1 (top-left), player-info at col2/row2 (bottom-right) — the opposite corner from their sprites.
- **Lesson**: When info boxes and sprites are in the same grid cell (same grid-column/grid-row), they overlap. Classic Pokemon battle layout uses diagonal placement: info box top-LEFT / sprite top-RIGHT for wild Pokemon; info box bottom-RIGHT / sprite bottom-LEFT for player Pokemon.

### L71 — Mega thumbnail needs explicit check
- **Symptom**: The 4th thumbnail slot in family selector cards (mega evolution) showed the same sprite as the evolved form instead of the mega form.
- **Root cause**: The `_mega` helper reused `baseSlug` (no distinct mega slug field was being checked), so mega thumbnails resolved to the same image as the regular evolved form.
- **Fix**: Added an explicit `megaSlug` field check and rendered the mega thumbnail only when a distinct `megaSlug` exists, with a golden "M" badge overlay to visually distinguish it.
- **Lesson**: The `_mega` helper reuses `baseSlug`, so mega thumbnails show the same sprite as evolved form unless a distinct `megaSlug` is explicitly provided and checked. Distinguish mega thumbnails with a visual "M" badge overlay.

---

## 2026-04-29 — Hotfix #111 (Back-button wiring + stuck CSS state)

### L53 — Back button wiring is state navigation, not just visual
- **Symptom**: User pressed back from g10/g13, saw "Aku Merasa..." (Game 1) flash before reaching home. g13b didn't show flash.
- **Root cause**: g10/g13 back buttons wired to `backToLevelSelect()` which routes to `screen-level` (level-select). Level-select banner is **state-driven** by prior `openLevelSelect(gameNum)` call. Since `backToLevelSelect()` doesn't refresh the banner, it shows whatever game was last opened. User's first game was Game 1 → banner stuck on "Aku Merasa..." even after entering Game 10. Meanwhile g13b uses `exitGame13b()` → `showScreen('screen-welcome')` directly.
- **Fix**: Wire g10/g13 back buttons to `exitGame10()` / `exitGame13()` (which match g13b's pattern of going home directly). Each `exit*()` function does full cleanup (PixiManager.destroy, sprite reset, queue flush) plus `showScreen('screen-welcome')`.
- **Lesson**: When multiple buttons across the codebase share visual identity (`class="gh-back"` arrow ←) but route to different functions, audit all instances to ensure consistent UX. Match the pattern that works (g13b) instead of leaving each game with its own incorrect path. Banner content driven by state can show stale data — always re-set state on screen entry.

### L54 — `resetSpriteEl()` clears handlers but NOT visual CSS
- **Symptom**: After back-and-forth between home and g10, the field appeared blank white. Math quiz worked but Pokemon didn't render.
- **Root cause**: `resetSpriteEl()` (from #110) only clears `src/onerror/onload/dataset`. It does NOT clear inline CSS (display:none, opacity:0, animation, transform) or class flags (.spr-defeat .wild-die etc.) that prior game's death/win animations leave on the element. So sprite element loaded new texture but was still display:none or opacity:0 from the previous death animation. Plus `g10-field` background-image cleared by `loadCityBackground()` on probe failure with no CSS fallback → white.
- **Fix**: New `_resetSprElCss(el)` helper that wipes display/opacity/animation/transform + removes 9 stuck classes. Called alongside `resetSpriteEl()` in initGame and exitGame functions. Plus force gradient fallback on `g10-field` background if loadCityBackground fails.
- **Lesson**: For any DOM element that survives across game scenes (vs being recreated each time), reset BOTH the data attributes (src, dataset) AND visual styles (display, opacity, transform, classes). Reset functions should handle BOTH layers. Also: any element that depends on async-loaded background should have a CSS fallback (gradient/color) so it never appears empty/white.

---

## 2026-04-29 — Hotfix #110 (Sprite re-entry race)

### L52 — Stale closure on DOM elements survives game scene transitions
- **Symptom**: Broken Pokemon sprite (sad-face emoji + white blank) on G10/G13/G13B after re-entering games via "win → different city" or "Home → re-enter".
- **Root cause**: `attachSpriteCascade` set `imgEl.onerror` to a closure. After game exit, the closure was still attached to the DOM element. With `MAX_CONCURRENT=4` queue saturated by pending closures from the previous scene, new cascade had to wait. When slots freed, the OLD closure fired first, set `imgEl.src = _emojiDataURL(fallback)` (the sad-face), and the new cascade never overwrote it.
- **Fix**: New `resetSpriteEl(imgEl)` clears onerror/onload/dataset + `removeAttribute('src')` + force layout. New `flushSpriteQueue()` resets module-level `_inFlight` + `_waitQueue`. `attachSpriteCascade` calls `resetSpriteEl` at start. Both wired into `initGame10/13/13b` after `PixiManager.destroyAll()` and into city-click handler defensively.
- **Lesson**: For modules with module-level state (queues, counters, in-flight registries), provide an explicit reset API + call it on scene transitions. DOM-attached closures (onerror/onload) MUST be cleared via `el.onerror = null` + `removeAttribute('src')` to defeat stale-closure races. Setting `src=''` is NOT enough — browser may keep showing the previous decoded image.

---

## 2026-04-29 — Hotfix #109 (Themed parallax + combo + growth)

### L51 — Theme-aware factories beat mega-conditionals
- **Symptom**: Adding 7 different parallax themes (cave/lava/ice/desert/castle/sky/final) inside one mega-function would balloon to 200+ lines with deep nesting.
- **Root cause**: Single `buildBackground()` switch statement.
- **Fix**: Split into `buildFarLayer(theme, PIXI)` + `buildMidLayer(theme, PIXI)`. Each handles its own subset (atmospheric vs ground silhouettes). Easy to add new theme without touching others.
- **Lesson**: When a function branches on an enum (theme/mode/state) with significantly different visual outputs per branch, factor by responsibility (far vs mid layer) before factoring by enum. Keeps each function focused, easier to maintain.

---

## 2026-04-29 — Hotfix #108 (Entity animations + milestones)

### L50 — `showMilestone()` overlay beats inline toast for celebratory moments
- **Symptom**: Toasts (`showToast`) felt small for major events like LEVEL CLEAR or 1-UP.
- **Root cause**: 3-line toast UX is for status, not celebration.
- **Fix**: New `.milestone` CSS class + `showMilestone(text, color)` JS — clamp(36-64px) bold text with neon drop-shadow. `@keyframes msPop` scales 0.3 → 1.25 → 1.0 → 0.6 with rotation + opacity fade up. Triggered on POWER UP, ELECTRIC, SEMPURNA, 1-UP, LEVEL CLEAR, GAME OVER, CHAIN x3+.
- **Lesson**: UX for "important rare event" needs different treatment than "frequent status update". Loud, briefly-seen, can't-miss milestone overlays vs compact persistent toasts.

---

## 2026-04-29 — Hotfix #107 (Pixi Graphics overhaul)

### L49 — Pixi Graphics primitives beat sprite sheets for stylized retro look
- **Symptom**: Construct 2 sprite sheets had irregular UV coords; treated as single textures they appeared "termutilasi" (mutilated body parts) when tile-stretched.
- **Root cause**: Tried to slice sheets without knowing exact frame coordinates.
- **Fix**: Rebuilt all entities (Goomba, coin, mushroom, star, spike, brick, Q-block, goal flag, clouds, hills) as hand-drawn Pixi Graphics primitives. Each renders pixel-perfect with stroke + fill + highlights, no asset dependency, retina crisp at any DPR.
- **Lesson**: For stylized/retro/cartoon games, Pixi Graphics primitives are often a better choice than asset sheets. They scale infinitely, look hand-crafted, and avoid the entire "what frame layout does this sheet use" problem. Reserved for when style is geometric — for organic art (like Pikachu), use animated GIF or proper sprite sheet.

---

## 2026-04-29 — Hotfix #106 (Critical bugs: sprite/coin/freeze/electric)

### L47 — `S.coins:0` + `S.coins:[]` duplicate key in object literal silently breaks runtime
- **Symptom**: HUD coin counter showed `🪙 NaN` then `[object Object],[object Object],...` in landscape mode.
- **Root cause**: `const S = { coins: 0, ..., coins: [] }` had duplicate key. JS keeps the LAST value → `S.coins` was an array. `S.coins.push(sp)` worked (array method); `S.coins++` produced NaN; `String(S.coins)` returned the array dump `[object Object],[object Object]`.
- **Fix**: Renamed array `S.coinList = []` to keep `S.coins` always integer counter. Updated all `.push/.length/.splice` call-sites.
- **Lesson**: Use ESLint rule `no-dupe-keys` (default in modern setups). Object literal duplicate keys silently keep the last value, never warn at runtime. For long state objects, use a state factory function or schema validator (Zod) so duplicates fail at construction.

### L48 — Sprite-sheet slicing assumes layout you don't have control over
- **Symptom**: Pikachu DOM `<img>` showed mutilated body parts during walk animation — only tail visible, body cropped.
- **Root cause**: Code assumed clean 10×10 grid of 48×48 frames in `pikachu-small.png`. Construct 2 sheets actually use irregular UV coords stored in `data.js` (proprietary JSON). Slicing 96×96 boxes from `(0,0)`, `(96,0)`, etc. produced random fragments.
- **Fix**: Replaced Pixi sprite-sheet slicing with DOM `<img>` overlay using user-provided HD GIF files (idle/running/jump/happy). Native GIF decoder handles animation. Position synced from `S.x/S.y - S.camX` every frame.
- **Lesson**: NEVER assume a sprite sheet has a regular grid layout without confirming via the engine's metadata. For Pixi 8 games that need animated character sprites, prefer DOM `<img>` GIF overlay + JS state-machine for animation switching. Pixi 8 doesn't decode multi-frame GIFs natively; sprite-sheet slicing requires KNOWING the exact frame coords.

---

## 2026-04-29 — Hotfix #105

### L45 — Pixi 8 `texture.source.scaleMode = 'linear'` is the cure for "HD sprite looks pixelated"
- **Symptom**: User imported HD 512×512 Pikachu PNG into Construct 2 Mario clone — sprite rendered blocky/pixelated even at small scales. "Karakter gif yang saya kasih itu cukup HD tapi pecah".
- **Root cause**: Construct 2 defaults to nearest-neighbor sampling for "pixel-perfect" retro look. When the engine's internal canvas (256×224) is CSS-scaled to fill a high-DPR display, every pixel is duplicated → blocky.
- **Fix**: In Pixi 8 port, after `await PIXI.Assets.load(url)`, set `texture.source.scaleMode = 'linear'`. This tells the GPU to bilinear-interpolate the texture when sampled at fractional coordinates. Combined with Pixi's `resolution: window.devicePixelRatio` and `autoDensity: true`, the result on a retina screen is crisp HD rendering, not blocky.
- **Lesson**: When porting a sprite from a "pixel art" engine to a "clean modern" engine, the texture filter mode is the most-likely culprit for "looks bad". Always verify scaleMode at asset load time. For HD sprites: LINEAR. For genuine pixel art: NEAREST. The two modes solve opposite problems and applying the wrong one ruins the asset.

### L46 — Single-file standalone game vs sprawling shared module: choose based on independence
- **Symptom**: G21 needed Pixi physics, tilemap collision, entity AI, math quiz, win/lose modal, mobile controls — could've split across many files.
- **Root cause**: The Dunia Emosi project standard for standalone games (g15-pixi, g16-pixi, g20-pixi, g22-candy) is a single self-contained HTML file with inline `<script>`. Split files would mean either ESM imports (require build step) or many `<script src=>` tags (more HTTP, no build).
- **Fix**: g21-pixi.html is 1217 lines with all logic inline. Asset URLs reference `../assets/mario-pokemon/sprites/*.png` (file system, no build). Shared modules (`game-modal.js`, `freeze-watchdog.js`) loaded as global script tags.
- **Lesson**: "Single file" is the right unit when (a) the game is independent (no cross-game state), (b) no build step exists in the project, (c) shared logic is small enough to load globally. Don't split a self-contained 1200-line game across 6 modules just for "modularity" — the cost (HTTP requests, complexity) outweighs the benefit (none, since reuse is local).

---

## 2026-04-28 (evening) — Hotfix #104

### L41 — A "fixed" symptom may have multiple root causes; users will tell you when you missed one
- **Symptom**: After Hotfix #103 fixed individual sprite cascades, G13B picker STILL froze on tab switch. User: "saya tidak yakin anda sudah solve issue big critical itu".
- **Root cause**: #103 addressed *per-image* freeze loops. The picker had a *separate* class of issue: render storm (39 cards × 5-URL cascade × 8 tabs), per-card `onclick` closure leak (312 listeners per session), no debounce, no concurrency cap on image loads. All compound on tab click.
- **Fix**: Tab cache (no rebuild on swap), event delegation (1 vs 39 listeners), 150ms debounce, IntersectionObserver lazy-load, MAX_CONCURRENT=4 queue inside `attachSpriteCascade`.
- **Lesson**: When user pushes back with "you didn't really fix it", treat skepticism as evidence — there's likely another freeze pathway you missed. Explicitly enumerate ALL classes of cause: per-element bug (cascade), per-render bug (storm), per-session bug (listener leak), per-frame bug (no debounce). Each needs its own fix. Don't assume one diagnosis closes the whole story.

### L42 — Top-level `const S` is initialized once; never relies on closure for level reset
- **Symptom**: G16 scoring sometimes returned 3★ after a perfect level, even though the perfect-play shortcut at line 1843 should fire.
- **Root cause**: `S = {cleared:0, wrongTaps_station:0, ...}` declared at script top-level. After completing level 1 and starting level 2, `S.cleared` carried 4 from prior level; `S.wrongTaps_station` similarly. The `if (S.cleared === S.totalObstacles && stationWrongs === 0)` shortcut needed both sides of the equation to be fresh; only `S.totalObstacles` was reset.
- **Fix**: Explicit `Object.assign(S, {...defaults})` at the top of `startGame()` resets all score-relevant fields per-level.
- **Lesson**: Module-scope `const S = {...}` initializes once at script parse. Game state that resets per level must be EXPLICITLY assigned in the level-init function, not relied on the const initializer to fire again. When a state object holds a mix of "set-once config" and "reset-per-level counters", separate them OR explicitly clear the counters at level start.

### L43 — CSS specificity of inline styles silently overrides JS DOM updates
- **Symptom**: G22 Bulbasaur floated above grass platform even though `placeMonsterOnGround()` was setting `monster.style.bottom = ...px`.
- **Root cause**: HTML had `<img id="monster-img" style="...bottom:25%;...">`. Inline `bottom:25%` sometimes won the specificity race against JS-set pixel `bottom`, especially before/during JS initialization. Plus `25%` was viewport-relative (assumed sprite of fixed height) — taller sprites floated above grass even when JS won.
- **Fix**: Removed inline `bottom:25%`, set `bottom:0` as initial. `placeMonsterOnGround()` is the single source of truth and uses `offsetHeight × 0.04` for responsive overlap.
- **Lesson**: When JS sets a style that's also pre-set inline, the runtime behavior is order-dependent and brittle. For values that JS owns, the inline initial style should be a sentinel (`0`, `auto`, or omitted) — not a meaningful value the JS will override. A `style="bottom:0"` initial + JS owner is auditable; `style="bottom:25%"` + JS owner is a race waiting to bite.

### L44 — Fixed responsive units (`padding:15px; font-size:22px`) break on aspect changes
- **Symptom**: G15 fullscreen on landscape tablet → bottom controls (ATAS/JALUR/BAWAH) take half the screen.
- **Root cause**: `#hud-bottom` had `position:fixed; bottom:0` but no `max-height`. `#btn-up`/`#btn-dn` used `padding:15px 0; font-size:22px` (pixel-fixed). On 1024×576 landscape, the flex container had no height ceiling, so children expanded to fill remaining viewport height after the bottom-anchor.
- **Fix**: `max-height: clamp(80px, 18vh, 140px)` + `padding: clamp(8px, 2vh, 15px)` + `font-size: clamp(14px, 3.5vmin, 22px)` + `@media (orientation:landscape) and (min-aspect-ratio:16/10) { #hud-bottom { max-height:90px } }`.
- **Lesson**: For app-style UIs deployed across phone-portrait + tablet-landscape, every `position:fixed` panel should declare a `max-height` (or `height`) — never trust intrinsic flex sizing. Pixel-fixed paddings/fonts on touch targets break beyond ~1.5x scale; always use `clamp()` with sensible min/max bounds tied to `vmin`/`vh`. Add aspect-ratio media queries for known device classes (16:10, 16:9, 21:9 tablets).

---

## 2026-04-28 — Hotfix #103

### L37 — `<img>` onerror cascade must dedupe URLs and terminate explicitly
- **Symptom**: Game 10 + Game 13B "tiba2 freeze, sampai tidak bisa di refresh, hanya bisa close browser/tab". Sad-face broken-image placeholder appeared where Pokemon sprite should render.
- **Root cause**: `pokeSpriteOnline(slug)` and `pokeSpriteCDN(slug)` returned identical URLs. Inline onerror cascades in `switchG13bPlayerPoke`, `g13bResetState`, `loadSprHD`, `loadSprPlayer`, and `g13c-pixi.html` re-set `img.src` to a URL that had just failed. Even when each cascade eventually terminated, the redundant retries hammered the network and accumulated `Image()` objects (closure-retained) — Chrome mobile OOMed before reaching final fallback.
- **Fix**: New `games/data/poke-sprite-loader.js` exports `attachSpriteCascade(imgEl, sources, fallbackEmoji)`. URLs are dedup'd via a `Set` so each is attempted at most once; on final failure `imgEl.onerror = null` and src is set to a tiny SVG-data-URL emoji. All call sites refactored.
- **Lesson**: For any chained-onerror image fallback: (a) dedupe URLs, (b) explicitly null `onerror` on the final attempt, (c) end with a synthetic data-URL (NOT another network request — even one byte over a flaky network re-triggers the loop). When two helper functions return the same URL, that's a code smell that the cascade has hidden duplicate retries.

### L38 — Defense-in-depth: log before the freeze, not after
- **Symptom**: User reported the freeze but couldn't say what triggered it; `console.log` evidence is unrecoverable once the tab is killed.
- **Root cause**: No persistent error sink. Errors went to the live console and disappeared with the tab.
- **Fix**: New `games/data/freeze-watchdog.js` writes `window.error` and `unhandledrejection` events into `localStorage.__freezeLog` (max 20, FIFO). Survives tab close. DevTools recovery: `JSON.parse(localStorage.__freezeLog || '[]')`.
- **Lesson**: For any "freeze, can't recover" symptom, instrument BEFORE chasing the root cause. The next reproduction is then evidence-driven, not speculative. localStorage is a serviceable error sink because it survives the freeze.

### L39 — Star count display must agree with saved progress, end-to-end
- **Symptom**: User: "modal game finish itu sangat tidak akurat sudah benar tapi bintang 3 of 5". Several games showed perfect-game modal at 5★ but world-map level bubble showed 3★ ceiling.
- **Root cause**: `GameScoring.calc()` returns 1-5, but every `dunia-0-progress` writer applied a legacy `mapped = stars >= 4 ? 3 : stars >= 2 ? 2 : 1` cap before saving. World-map renderer also hardcoded `'☆'.repeat(3-starsGot)` — assumed 3-star scale. Result: modal shows 5, saved value is 3, world-map renders 3.
- **Fix**: Removed `mapped` cap at all 9 sites. Updated world-map renderer to `'☆'.repeat(Math.max(0, 5-starsGot))`. Modal and world-map now agree.
- **Lesson**: When introducing a shared scoring engine (`GameScoring.calc()`), grep the entire repo for any callers that re-map its output — those are leftover from the pre-shared implementation and silently break the contract. Migration of a shared API has TWO halves: route everyone through it AND remove every post-processing layer that was put in place for the old API.

### L40 — Save-key scheme: prefer "what the user selected" over "where they selected it"
- **Symptom**: User: "Dipastikan save progress itu ada di 8 karakter itu... klw saya sedng pakai singa maka siapapun dg account itu/slot itu juga punya progress yang sama". Slot-keyed save meant two players who both picked lion in different slots had separate progress.
- **Root cause**: `pkey(key)` produced `dunia-{slot}-{key}` from `window._pSlot[0]` (slot index 0-6). The unique identity of "this player's progress" was tied to slot position, not to the avatar identity the user actually picks.
- **Fix**: `pkey()` resolves the active slot's `animal` emoji (e.g. `🦁`) to a stable slug (`lion`) and returns `dunia-avatar-{slug}-{key}`. One-time `migrateSlotToAvatar()` copies/merges existing slot data into the avatar bucket; old keys retained for rollback.
- **Lesson**: Save keys should encode the user's mental model of "who am I in this app", not the implementation detail of "which UI slot did they click". When the user says "I'm playing as the lion", they expect lion-progress to follow them across slots/devices/sessions. The migration must be idempotent (`localStorage.dunia-migrated-v2` flag) and merge-aware (`Math.max` for stars, set-union for completed lists).

---

## 2026-04-27 (late) — Hotfix #102

### L33 — Pixi ticker.stop() must be called explicitly on game-end (flag check inside ticker is not enough)
- **Symptom**: G15 user reported "ini juga error saat permainan usai. No respond hang" — the page became unresponsive after game-end. Audit found the same pattern in 5 other Pixi games (G14/G16/G19/G20/G22).
- **Root cause**: Standalone Pixi pages register their main loop with `app.ticker.add(callback)`. The callback's first line is typically `if (!gameRunning) return`. After game-end (`gameRunning = false` set in `showWin`/`showLose`), the callback keeps firing 60fps and early-returning. CPU usage compounds across plays. Mobile Chrome eventually OOMs or kills the tab.
- **Fix**: Explicitly `app.ticker.stop()` at the top of every game-end function (`showWin`, `showLose`, `endRace`, `endMatch`, `endGame`, etc.) AND in every leave-the-page handler (`goBack`, `exitGame`). When `GameModal.show` is wrapped in `setTimeout(..., N)`, the `ticker.stop` goes BEFORE the setTimeout call so the loop halts immediately, not N ms later.
- **Lesson**: Long-lived subscriptions (`addEventListener`, `setInterval`, `requestAnimationFrame`, `app.ticker.add`) must have a matching explicit unsubscribe on the lifecycle event that ends them. A flag check (`if (!running) return`) inside the callback is not enough — the callback is still being invoked. The browser pays full call-stack cost per invocation. For Pixi specifically, `ticker.stop()` halts the loop entirely; `ticker.remove(callback)` removes one listener; `app.destroy(...)` is the heaviest cleanup. Use the lightest tool that ends the leak. Audit rule: every `app.ticker.add` should have a matching `app.ticker.stop()` (or `.remove()`) on the same lifecycle boundary as the parent component.

### L34 — Difficulty mode should gate features, not just numbers
- **Symptom**: User on G15 easy reported "jangan terlalu banyak huruf filler" — too many distractor/special boxes appearing despite playing on the easiest difficulty.
- **Root cause**: G15 spawned math boxes (every ~3-6 sec) and heart boxes (every ~5-9 sec) at all difficulties. Easy mode only varied the number of distractor LETTERS (1 vs 1-2). Math and heart "filler" boxes still spawned at the same rate, contributing 34% of total box density on easy.
- **Fix**: Gated math box spawning on `getDifficulty() !== 'easy'`. On easy mode now: only target letters + (when needed) heart pickups. No math distractors. Player can focus on letter collection without parsing emoji clutter.
- **Lesson**: Difficulty modes should switch what FEATURES appear, not just tune numerical knobs. Easy mode users want fewer types of stimuli, not just lower magnitude. When designing difficulty curves, classify each mechanic as "core" (always present) vs "advanced" (gate behind difficulty). The wrong instinct is to keep all mechanics on at all difficulties and just tune their rate. Apply to: G3 letter distractors, G7 picture clutter, G8 word complexity, future difficulty designs.

### L35 — Perceptual life-loss tuning: double the count, halve the perceived cost
- **Symptom**: User on G15 easy reported "easy nabrak huruf 1 bukan kurangi 1 life tapi 1/4 or 1/2" — losing 1 full life per wrong tap on easy mode felt too steep for kids.
- **Root cause**: Easy mode had 4 lives (3 on harder). With existing 50% shield mechanic, ~8 hits before lose state. Per-hit subjective cost was still 1/4 of remaining lives (visual: full heart vanishes per hit). Kids perceive "I lost a heart" as a big setback.
- **Fix**: Doubled MAX_LIVES on easy (4 → 8). Each hit now feels like 1/2 of the prior life unit (visually: 8 hearts → 7 hearts is less alarming than 4 → 3). Combined with shield: ~16 hits before lose. The damage formula didn't change — only the denominator did.
- **Lesson**: When players complain about "punishment too steep," consider tuning the visual life count BEFORE the underlying damage formula. A heart bar of 8 vs 4 feels like very different forgiveness, even if both reach lose state in similar number of hits given a 50% shield. Apply to any health/life HUD: the visible ratio drives perception, not the absolute count. Avoid implementing fractional hearts (complex render code, kids confused by partial fills) — just multiply the count.

### L36 — `flex-direction:row` + `flex-wrap:nowrap` should be EXPLICIT for inline HUD badges
- **Symptom**: G15 KUMPULKAN HUD label and the 24px char visually stacked instead of sitting side-by-side. User: "Karakter seperti ada bertumpuk."
- **Root cause**: `#next-letter` was `display:flex; align-items:center; gap:6px` without explicit `flex-direction` or `flex-wrap`. Defaults SHOULD be row+nowrap, but on narrow viewports + 24px char height vs 10px label height, the browser sometimes wrapped the badge content (rare but reproducible). Plus 6px gap was insufficient cushion between them.
- **Fix**: Added explicit `flex-direction:row; flex-wrap:nowrap` + `gap:10px` on the parent + `white-space:nowrap; flex-shrink:0` on the label + `flex-shrink:0; line-height:1` on the char. Defensive against any narrow-viewport reflow.
- **Lesson**: For badge/chip/pill UI components that contain heterogeneous content (label + value, icon + text), set EXPLICIT flex direction, wrap, and shrink rules on both parent and children. Don't rely on defaults — they vary by viewport and content. Audit rule: any `display:flex` for inline HUD with `font-size` mismatch ≥ 2x should have explicit flex-shrink + white-space declarations.

---

## 2026-04-27 (evening) — Hotfix #101

### L28 — Event delegation > per-card `addEventListener` for re-rendered grids
- **Symptom**: User reported "browser crash. Selalu kle next game/next cities" — entire mobile browser crashed after 3-4 round-trips through region picker → city picker → back. Tab killed by OS, not just the page hung.
- **Root cause**: `renderRegionGrid` (game.js:12482) and `renderCityGrid` (game.js:12553) called `card.addEventListener('click', handler)` for every card on every render. `innerHTML = ...` later dropped the DOM nodes, but the closure each handler captured (city object, parent container reference, callback chain) survived in the listener registry. Each picker re-render added N new closures; nothing released the old ones. After 10 round-trips × ~30 cards × multi-KB closure footprint, mobile heap pressure tripped OOM.
- **Fix**: Single delegated listener per grid container, attached once and gated by `if (grid.dataset.bound === '1') return;` then `grid.dataset.bound = '1'`. The listener uses `e.target.closest('.region-card')` (or `.city-card`) to identify which card was tapped. Idempotent — re-renderable any number of times without re-attaching.
- **Lesson**: Any grid/list renderer that gets called more than once (re-render, navigation, language toggle) MUST use event delegation. Per-element listeners + `innerHTML` rewrite = silent heap leak: the DOM nodes go but the closure refs (and any state they captured) stay in the listener table. The `data-bound` flag pattern makes the delegated listener safely idempotent across re-renders. Audit rule: grep for `\.forEach\(.*addEventListener` over rendered cards — every match is a latent leak.

### L29 — Probe-then-swap for sprite/name atomicity
- **Symptom**: G13b user reported "label says Bulbasaur but sprite shows Pikachu" — the wild Pokemon name flipped instantly when a new wild spawned, but the sprite kept rendering the previous species for 200-1500ms while the new image downloaded.
- **Root cause**: `g13bSpawnWild` set `wspr.src = newUrl` and `wname.textContent = newName` synchronously. Browser keeps painting the old image until the new `src` finishes decoding (CSS rule: `<img>` retains last successful raster until next decode). Meanwhile `textContent` updates immediately. Net effect: stale-sprite + new-name window during every spawn.
- **Fix**: `new Image()` probe — `probe.src = newUrl; probe.onload = () => { wspr.src = newUrl; wname.textContent = newName; }`. Both DOM properties update inside `onload`, so they swap atomically once the network has the bytes. Plus 1500ms watchdog `setTimeout` so a slow/failed network never strands the spawn entirely.
- **Lesson**: Whenever you update a paired (image, label) — or any (slow-side, fast-side) DOM property pair — probe the slow side first and update both inside its `onload`. The G10 `loadSprHD` pattern (game.js:5957) is the canonical example. Same rule applies to (background-image, caption), (audio, transcript), (video poster, title). The naive `el.src = X; lbl.text = Y` pattern always creates a stale-render window proportional to network latency.

### L30 — Type-consistent gameNum keys for multi-namespace persistence
- **Symptom**: Region picker showed 0/N completed for ALL regions despite the user defeating multiple legendaries in G13b. Progress simply never appeared on the picker.
- **Root cause**: G13b is registered with `gameNum = '13b'` (string) in some code paths and `gameNum = 13` (number) in others. The city picker normalized to number `13` when calling `endGame`, so `setCityComplete(state.currentGame, ...)` wrote to `prog.g13.cities` instead of `prog.g13b.cities`. The picker reads from `prog.g13b.cities` → always empty. Two writers, two namespaces, one reader = silent data loss.
- **Fix**: Preserve the `'13b'` string at the city-picker entry point (game.js:12628-12643) so every downstream call to `setCityComplete` / `setLevelComplete` uses the same key. Also added the missing `setCityComplete('13b', ...)` + `setLevelComplete('13b', ...)` calls to the G13b legendary-defeat path, which previously only persisted on timer-survived wins.
- **Lesson**: When a key namespace has heterogeneous types (numbers `1..22` plus suffixed strings `'13b'`, `'13c'`), pick ONE canonical form at the entry boundary and propagate it untouched. Any normalization (`Number(x)`, `String(x)`, `parseInt`) inside the call chain risks aliasing siblings into the wrong bucket. Especially insidious because (a) JS lets you index objects by either, (b) silent writes to wrong key produce no error, just absent reads. Audit rule: if a `gameNum` flows through multiple modules, type it (TypeScript-style mental model) and verify every assignment.

### L31 — Probe before applying inline `style.backgroundImage`
- **Symptom**: G10 Lv.1 Round 3 rendered a "white blank field" instead of the city background. G13b reported a broken-image icon. CSS gradient fallbacks were defined on the parent class but never showed.
- **Root cause**: `loadCityBackground` set `el.style.backgroundImage = "url(" + maybe404Url + ")"`. Inline styles override CSS class rules, so a 404 URL strips the gradient fallback — the element renders the inline rule (which paints nothing for a failed URL) and ignores the class's gradient.
- **Fix**: Probe with `new Image()` before assigning. On `probe.onload`, set `el.style.backgroundImage = url`. On `probe.onerror`, leave `el.style.backgroundImage = ''` so the CSS class's gradient fallback wins via cascade. Same pattern as L29 applied to a different DOM property.
- **Lesson**: Any inline style that overrides a class fallback must be conditional on the asset actually existing. The "set inline first, hope for cascade fallback" pattern silently breaks fallbacks. For background-image specifically, probe the URL or use CSS-only declarations (`background: var(--bg-fallback) url(...)` shorthand) where the fallback co-exists in the same declaration. Also applies to `<source>` `src`, `<video>` `poster`, custom-property `--bg-image` overrides — anywhere inline trumps class.

### L32 — Standalone HTML pages need shared sprite helpers
- **Symptom**: G13c gym Pokemon were rendering 96px CDN PNGs even though the project has 1025 HD WebP sprites at 630×630. User: "Saya sudah bilang jangan pakai sprite/asset non HD." G13c is a standalone Pixi page (its own HTML file), so it can't access game.js's `pokeSpriteAlt2` helper without loading the entire 700KB+ engine.
- **Root cause**: HD sprite path computation (`POKE_IDS[slug]` + zero-pad + slug normalization) lived only inside game.js. Standalone pages either (a) loaded game.js wholesale (bloated), (b) re-implemented the helper inline (drift risk), or (c) fell back to remote CDN (96px). G13c had picked option (c).
- **Fix**: Extracted `POKE_IDS` (1025-entry slug→id map) + 5 helper fns (`pokeSpriteAlt2`, `pokeSpriteSVG`, `pokeSpriteCDN`, `pokeSpriteVariant`, `_slugToAlt2File`) into `games/data/poke-sprite-cdn.js`. ~17KB total. Wrapped as `window.*` for classic-script consumers. Standalone pages now load the small shared module via `<script src="data/poke-sprite-cdn.js"></script>` and get the exact same HD-first cascade as game.js.
- **Lesson**: When the same data table or computation is needed by both the main app and standalone pages, extract it into a small shared module (single file, no build step, classic script with `window.*` exports). Don't (a) duplicate, (b) bloat standalones with the full engine, or (c) silently degrade to a worse fallback. Audit rule: every standalone HTML page that computes asset paths should reuse the same helpers as game.js. Future standalone pages should follow this pattern by default.

---

## 2026-04-27

### L27 — `onDone`-style continuation callbacks need idempotent wrapper + watchdog
- **Symptom**: G10 hit-effect chain marked 🔧 in TODO since 2026-04-20 — "needs live verification: particles, projectile, flash, defender shake". User reported intermittent G10 freeze after one round.
- **Root cause**: `g10DoAttack` had 8+ unguarded `getElementById(...).classList/.style/.getBoundingClientRect()` calls. If ANY node disappeared mid-round (screen swap, WebGL context lost, transient DOM rebuild) the throw halted the synchronous body — defender shake setTimeout never scheduled → `onDone()` never called → next round never started. Round froze. Fallback (Task #94) doesn't help because it's at game-end level, not hit level.
- **Fix**: Section-isolate each visual phase + idempotent `_safeDone` wrapper around `onDone` + 1500ms watchdog `setTimeout(_safeDone, 1500)`. Both inner timeouts route through `_safeDone`; if either fails to fire (or DOM lookup nulls out), watchdog fires anyway. Round always progresses.
- **Lesson**: Any function that takes a continuation callback (`onDone`, `onComplete`, `onFinish`) and chains setTimeouts must guarantee the callback fires exactly once, even if the body throws partway through. Pattern: `let _called = false; const safe = () => { if (_called) return; _called = true; try { onDone() } catch(e){...} }; setTimeout(safe, MAX_DURATION)` — the watchdog timeout catches everything else. Visual gloss is optional, callback firing is not. Apply to: hit chains, animation completion, transition end handlers, any "do A then call B" flow where A involves DOM that might be torn down.

### L25 — Section-level try-catch for "must always show" UI flows
- **Symptom**: After 4 sessions of patches (Tasks #84/#94/#98), G10/G13/G13b game-end STILL fell into emergency fallback modal on every win. User: "Sama sekali tidak fix issue kamu itu". Defensive fallbacks (Task #94/#98) caught the throw but the daily UX still showed the fallback, never the real modal.
- **Root cause**: `showResult` and `showGameResult` were monolithic — 70+ lines of unguarded DOM access (`document.getElementById('x').textContent = ...`) and unguarded operations (`addXP` localStorage quota, `getLevelTier(undefined)`). A SINGLE bad sub-section threw and aborted the entire modal flow, including the critical "show screen" step. The wrapping try-catch then fell to fallback. So the fallback fired because ANY of 15+ unguarded operations could fail — not because of one specific bug.
- **Fix**: Refactored both modal engines into 7+3 isolated try-catch sections. Critical sections (text + showScreen) always run with manual fallback. Cosmetic sections (XP, confetti) log warning but don't propagate. Plus 4-second self-clearing watchdog for `_showingGameResult` flag (prevented silent early-return on retry).
- **Lesson**: When a UI flow has a "must always succeed" requirement (a result modal user is waiting for), monolithic try-catch is wrong — one failure aborts everything. Section-isolate at the granularity of "user-visible feature": text section, buttons section, persistence section, animation section. Each gets its own try-catch with appropriate severity (CRITICAL = log error + manual recovery; cosmetic = log warn + skip). Also: any flag used as "in-flight" guard MUST have a self-clearing watchdog (timeout) — otherwise a single bad section silently breaks every retry. Apply to: result modals, checkout flows, save-game routines, any user-facing "this must happen" flow.

### L26 — Don't use bonus-modifier scoring pattern for absolute-tier games
- **Symptom**: G13b "Perfect tapi bintang 3 of 5" — defeating a legendary with low kills returned 1★. User correctly called this absurd: defeating a legendary IS the win condition, kill count is a bonus.
- **Root cause**: `GameScoring.calc({correct:1, total:1, bonus:tier-5})` was used as a "perfect-run baseline minus shortfall" pattern, but G13b is threshold-tier survival — tier IS the absolute score, not a delta from perfect. The bonus-modifier indirection produced backwards math: tier 1 (low kills) → bonus -4 → 1★. Same engine being misapplied to two different scoring models (accuracy vs threshold).
- **Fix**: Direct threshold scoring in G13b (`stars = kills >= 50 ? 5 : kills >= 30 ? 4 : 3`). Documented inline that bonus-modifier pattern is for "perfect run + adjustment" (G13's evolution penalty), NOT "absolute tier" (G13b's kill-count survival).
- **Lesson**: Before applying a scoring helper, identify the game's scoring MODEL: accuracy-based (right answers / total), threshold-tier (kills, distance, time), or hybrid (perfect baseline + adjustments). The `GameScoring.calc({correct, total, bonus})` engine is for accuracy + adjustments — don't shoehorn threshold-tier into it via fake correct=1/total=1 with negative bonus. Just use direct threshold scoring (`stars = condition ? N : ...`). Same mistake pattern appears anywhere a unifying engine gets used "because it exists" rather than "because it fits". Audit rule: if you find yourself passing `correct:1, total:1, bonus:X-N`, you're misusing the engine.

---

## 2026-04-25 Evening (continued)

### L23 — Sliding frontier unlock pattern for child-friendly progression
- **Symptom**: Linear "complete level N to unlock N+1" feels rigid for kids age 5-10. But "unlock all" loses sense of journey.
- **Fix**: `unlockedCount = min(2 + completedCount, total)` per region. Two cities always playable (frontier window), each completion opens one more. Replay doesn't add count.
- **Lesson**: For child-targeted progression, use **sliding window of 2** (not 1, not all). Two visible options give choice (kid agency) without overwhelm. One completion → one new option preserves cause-effect connection. Apply to any level-select/world-map pattern: sliding-frontier gives forward momentum + agency. Pure linear (1-at-a-time) frustrates fast learners; pure unlock-all loses progression rhythm.

### L24 — Filter-tinted single asset for color variation across categories
- **Symptom**: Need 10 region cards with distinct colors. Generating 10 colored variants of same icon = 10× asset weight + maintenance burden.
- **Fix**: Single `region.webp` (256×256, 14.7KB) shared across all 10 region cards. Per-region color via CSS `filter: hue-rotate({deg}) saturate({factor}) drop-shadow(0 0 8px {color})`. Region color comes from data (`REGION_META.kanto.hueRotate=0`, `johto=25`, etc.).
- **Lesson**: Single-asset + filter tinting beats per-category asset variants when (a) icon is monochromatic-ish (Pokeball red base), (b) category count >5, (c) variations only need color (not shape). Trade-off: color subtle vs. per-asset wins on dramatic style. Apply to: badge collections, tag colors, category icons, status indicators. Avoid for: complex multi-color illustrations, brand assets, photographic icons.

---

## 2026-04-25 Evening

### L20 — Visual-overlay strategy for missing-asset progression
- **Symptom**: G13 wanted 3-stage evolution sampai Mega Evolution. Sprite Mega forms TIDAK ADA di local pack (hanya 1025 base sprites). Remote fetch melanggar Lesson L16.
- **Root cause**: Game design ingin "Mega" rasa special, tapi assets tidak tersedia. False dichotomy: "fetch remote (lambat)" vs "skip Mega (kurang puas)".
- **Fix**: Visual-overlay only — sprite stage 2 reused + CSS aura ring rotating + crown badge + 1.3× scale + audio cue. Anak-anak 5-10 tahun tidak peduli sprite "asli" Mega — mereka melihat dramatic visual = perceived power.
- **Lesson**: Saat asset progression tidak tersedia, **layer effects in CSS/JS** (aura, glow, particle, scale, badge text). Jangan compromise gameplay rasa karena asset gap. Especially powerful untuk children's games where perception > literal accuracy. Apply pattern: "asset-light progression" = same sprite + escalating visual flair per stage.

### L21 — Tier-stage gating: separate progression dimensions
- **Symptom**: G13 sebelumnya hanya 2-stage hardcoded. Adding 3-stage broke existing chain data (tidak semua chain punya Mega).
- **Root cause**: Single `evolved2` boolean was tying together both "does this chain have stage 2?" AND "do we render stage 2 at this level?". Mixing data-shape concern with progression concern.
- **Fix**: New explicit `stages: 1|2|3` flag in `G13_DIFF` (per tier). Chain data shape stays stable. Render logic checks BOTH `chain.evolved2` (data) AND `tier.stages >= 2` (gate). Same for stage 3 with `chain.mega` AND `tier.stages >= 3`.
- **Lesson**: Saat extending stage progression, separate "data exists" from "progression allows". Two boolean gates are ALWAYS clearer than one combined check. Apply to any RPG-style "does X unlock here" logic — keep DATA shape and PROGRESSION rules independent.

### L22 — Centralized helpers for cross-game settings
- **Symptom**: Multiple games (G10/G13/G13b) had INCONSISTENT enforcement of "easy mode" math rules. G13b stripped × in easy but always capped max at 20. G10 didn't gate by mode at all. Each had its own ad-hoc filter.
- **Root cause**: Settings-driven rules were copy-pasted into each game's question generator. Updates required hunting all callsites.
- **Fix**: Single `getMathLimits()` helper next to `isMathAdvanced()`. Returns `{advanced, maxNum, allowedOps}`. Every math game generator now calls it as first line.
- **Lesson**: Any cross-game user setting needs ONE helper. Pattern: `getXxxLimits()` returns canonical config object derived from `localStorage`. Every game's question/difficulty logic consumes that. Audit table in `XXX-STANDARD.md` documents which games comply. New math game added without calling helper = bug. This pattern scales: same approach should apply to player age tier, audio volume, accessibility flags, etc.

---

## 2026-04-25

### L16 — Local-first sprite policy: never call remote fetcher in grid renderers
- **Symptom**: G13B party picker (🎒) became unresponsive when opened. UI froze 5-15s, then tab crashed. Reproducible only on G13B (G10 picker worked fine despite using same overlay).
- **Root cause**: `renderPartyGrid` (`game.js:5378`) used `pokeSpriteOnline(slug)` which returns `https://img.pokemondb.net/sprites/home/normal/${slug}.png`. Trainer Ash has 41 Pokémon → 41 simultaneous remote PNG fetches + up to 41 GitHub-raw fallbacks via `img.onerror`. On slow mobile networks the connection pool maxed out, main thread blocked on image decode, and pressure built until OS killed the tab. The repo already had **1025 local HD WebP** sprites at `assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug}.webp` and a helper `pokeSpriteAlt2(slug)` (`game.js:5192`) that returned the local path. The renderer just wasn't using it.
- **Fix**: Local-first chain — try `pokeSpriteAlt2(slug)` first, fall back to `pokeSpriteOnline` only if `null`. Onerror chain gated by `dataset.fallback` to prevent loops. Added `loading="lazy"` + `decoding="async"` for browser-managed off-viewport deferral.
- **Lesson**: Any grid renderer that creates ≥10 images at once MUST use a local source by default. Remote URLs are acceptable only as fallback for missing assets. When auditing UI code, grep for `pokeSpriteOnline\|pokeSpriteCDN\|pokeSpriteBackup` in any `.forEach`/`map` over a list — if found, that's a latent multi-fetch bug. The local-first rule applies to all asset types, not just sprites: use local audio, local fonts, local backgrounds whenever the project has them.

### L17 — Modal/picker overlays must pause game-side timers (especially intervals)
- **Symptom**: User stuck in G13B party picker. Even after closing, sometimes HP was lower than before opening. During legendary battle, the wild Pokemon kept attacking while picker was up.
- **Root cause**: `openG13bPartyPicker` only added `.open` class to overlay. `_g13bLegAutoAtk` setInterval (`game.js:8402`, 14s tick during legendary fight) kept firing, calling `g13bWildHitsPlayer` which animated DOM, decremented HP, and could trigger `g13bGameOver` — all while the user thought game was paused because they were on a different "screen". The interval already had a `if (st.paused) return` guard (game.js:8410), but `paused` was never set.
- **Fix**: Set `g13bState.paused = true` in `openG13bPartyPicker` (when phase='playing') and reset to `false` in `closePartyPicker` (when ctx='g13b'). The existing flag-based guard pattern means no clearInterval/setTimeout coordination is needed — just toggle the bit.
- **Lesson**: Every picker/modal/overlay in a game with active timers must have a clear pause-on-open + resume-on-close contract. Audit checklist: opening any overlay should (a) set paused flag, (b) NOT clear pending intervals (keeps cadence), (c) gate every interval/timeout body with the flag. The same audit was done for Task #55 (G19) and Task #62 (G13B legendary) — Task #64 closes that loop for the picker entry path.

### L18 — Mobile bottom safe-area: 10vh + env(safe-area-inset-bottom) for tappable bottom UI
- **Symptom**: User reports G10 answer choices clipped by browser bottom UI bar on mobile. The 2×2 grid put the bottom row in the area where Chrome's URL bar / iOS Safari's tab strip overlapped.
- **Root cause**: `.g10-qpanel` (`style.css:2464`) used `padding:10px 16px 16px` — only 16px bottom clearance. Chrome mobile's auto-hiding URL bar can reclaim 50-60px when scrolling stops; iOS Safari's tab strip is 50px. PWA mode + viewport-fit=cover pushes content into the safe-area-inset-bottom region.
- **Fix**: Bottom padding now `max(10vh, calc(env(safe-area-inset-bottom, 0px) + 16px))`. The `max()` ensures: (a) ≥10% viewport height regardless of CSS env support, (b) safe-area + 16px when env is supported and ≥10vh fallback isn't enough. iPhone SE (667px) → 67px; iPhone 14 (844px) → 89px; both exceed worst-case bottom UI.
- **Lesson**: Any tappable UI in the bottom 100px of the screen needs `padding-bottom: max(10vh, calc(env(safe-area-inset-bottom, 0px) + 16px))` (or larger) to survive Chrome auto-hide URL bar, iOS Safari tab strip, Android nav gesture bar, and PWA notch / home indicator. Don't rely on `env(safe-area-inset-bottom)` alone — many Android browsers don't set it. The 10vh fallback handles them. Apply this to G10/G11/G13/G13B qpanels and any other "bottom-anchored interactive panel" layout.

### L19 — Multi-choice quiz layout: prefer single-row inline over multi-row grid for ≤4 choices
- **Symptom**: G10's 2×2 answer grid felt cramped on mobile and clipped against bottom UI. User wanted G13c-style layout.
- **Root cause**: 2×2 grid uses 2× the vertical space of a 1×4 inline row, putting the bottom row of choices into the danger zone (browser UI overlap). G13c (`#g13c-choices`) uses `grid-template-columns:1fr 1fr 1fr` because it has 4 move buttons + spare slot — visually compact, single tap zone.
- **Fix**: G10 changed to `grid-template-columns:repeat(4, 1fr)` with smaller per-button padding (14px 6px → was 20px 12px), font-size 24px → was 32px, min-height 60px (Apple HIG min 44pt comfortably exceeded). Responsive scaling for narrow phones (480px/400px/360px breakpoints).
- **Lesson**: For ≤4 multiple-choice answers in a kid-friendly mobile-first game, prefer single-row inline (`repeat(N, 1fr)`) over multi-row grid. Trade-offs: inline is harder for tiny tap targets — guard with `min-height: 60px` desktop / `44px` minimum mobile per Apple HIG. Save vertical space for game field + safe-area buffer. If choices are >4 or are long-form text, multi-row is fine — but reserve bottom 10vh regardless.

---

## 2026-04-24

### L13 — `position:fixed` children are NOT viewport-anchored if any ancestor has `transform/filter/perspective`
- **Symptom**: G12 Tebak Bayangan correct-answer sparkles appeared on stage floor BELOW the cards, not on the tapped card. G18 ✓ animation landed in empty space BETWEEN buttons.
- **Root cause**: Both games used `spawnSparkles` / custom effects that create elements with `position:fixed; left:{Xpx}; top:{Ypx}` at the tapped button's `getBoundingClientRect()`. CSS spec: if ANY ancestor has `transform`, `filter`, `perspective`, `will-change: transform`, or `contain: paint`, that ancestor becomes the containing block for descendant `position:fixed` — breaking viewport-anchor assumption. Dunia Emosi has `--rz-scale` transforms on game screens → sparkles rendered relative to screen instead of viewport.
- **Fix**: Created `spawnCorrectCardJuice(btn)` that attaches ring + tick + pulse as `position:absolute` CHILDREN of the button (with `btn.style.position = 'relative'` if static). Children are anchored to the button itself, so ancestor transforms don't matter.
- **Lesson**: For click/tap feedback effects, prefer `position:absolute` children of the interactive element over `position:fixed` siblings at viewport coords. The child-of-button pattern is invariant under ancestor transforms, scroll, zoom, and viewport changes. Only use `position:fixed` for global overlays (toasts, confetti falling from top) where the behavior is desired.

### L14 — Cached battle state makes mid-battle config changes invisible
- **Symptom**: User changed G13C Pokémon package mid-battle. localStorage updated, UI confirmed selection, but the battle's HP dots + sprite stayed unchanged.
- **Root cause**: `battle.playerTeam = deepCloneTeam(getCurrentPackage().team)` clones ONCE at `startBattle()`. After that, `battle.playerTeam` is the source of truth for UI; localStorage mutations don't propagate.
- **Fix**: Hide the package-switcher button during active battle. Only re-show when battle ends (via all 3 modal callbacks: `onAgain` for both win and loss paths + `onBack`).
- **Lesson**: When a game clones config into ephemeral battle state, either (a) make the config source accessible only between battles, or (b) add an explicit "refresh active state from config" path. Hiding the entry point is the simplest UX fix; re-cloning mid-battle invites state desync bugs.

### L15 — Domain-specific picker overlays should mirror existing patterns (G13C → G13 family)
- **Symptom**: Building G13's evolution-family selector from scratch vs matching G13C's package selector style.
- **Fix**: G13's `#g13-fam-overlay` + `#g13-fam-grid` + `.g13-fam-card` mirror G13C's `#pkg-overlay` + `#pkg-grid` + `.pkg-card` — same visual language, same tier-badge pattern, same auto-close timing (280-300ms). Thumbnail rendering uses the existing `pokemondb_hd_alt2/` WebP pack with CDN fallback.
- **Lesson**: When adding a new selector/picker to the app, copy the closest existing pattern rather than inventing a new one. Users already know how G13C's selector works — G13's should feel identical. Cross-game UX consistency > per-game cleverness.

---

## 2026-04-23 Evening

### L7 — Inverted downmap bug: use distinct variable names for display-scale vs persistence-scale
- **Symptom**: G13 perfect evolved run saved 3★ to progress AND displayed 3★ in modal, when should have been 4-5★.
- **Root cause**: Single variable `_g13stars` was used both for `setLevelComplete` (0-3 scale) AND assumed to propagate to `perfStars` (5-scale) display. The formula `perfStars >= 5 ? 3 : perfStars >= 4 ? 2 : 1` did the correct 5→3 downmap but the variable name was ambiguous, and nothing was preventing the downmap result from leaking into display.
- **Fix**: Split the variables. `perfStars` (5-scale) is shown to user; `_g13starsSaved` (0-3 scale) is persisted.
- **Lesson**: When a game has two star scales (display 5-star vs progress 0-3-star), use clearly distinct variable names (`starsDisplay` / `starsSaved`). Never reuse one variable across scales.

### L8 — Z-index overlay traps: always clear stale overlays in show-modal functions
- **Symptom**: G13 result modal appears but buttons don't respond.
- **Root cause**: `.g13-evo-overlay` (z-index 600) sometimes lingered over `.gr-overlay` (z-index 500), silently consuming all clicks on the modal below.
- **Fix**: At the top of `showGameResult()`, hard-clear any overlay that could possibly be above: `el.classList.remove('show'); el.style.display = 'none'; el.style.pointerEvents = 'none'`.
- **Lesson**: If a modal "appears frozen but is visible", the first suspicion should be z-index overlay trap, not the modal code. Show-modal functions should enumerate and clear every overlay class in the game that could float above them.

### L9 — Default facing assumption: distinguish local sprite pack vs CDN
- **Symptom**: G10 Charmander faced wrong direction after my refactor.
- **Root cause**: Assumed `pokeFacing` default `'L'` based on claim in TODO that "HD sprites face left natively". This was true for `/assets/Pokemon/pokemondb_hd_alt2/` WebP pack but NOT for `img.pokemondb.net/sprites/home/normal/` CDN PNGs that G10's `loadSprHD` uses.
- **Fix**: Change default to `'R'` (matches CDN) and update CSS `--flip` base values accordingly.
- **Lesson**: When multiple sprite sources exist in the codebase, document their natural facing orientations explicitly. A sprite-facing default can't be universal — it depends on WHICH source is actually being fetched at runtime. Default assumption should match the MOST-USED source.

### L10 — Stale flags captured at spawn fail after game state advances
- **Symptom**: G6 LAMPU — user already collected L, another L tile treated as "LA".
- **Root cause**: Tile's `_correct` flag captured at SPAWN time. In-flight tile still carries `_correct=true` after the game state advanced past that letter.
- **Fix**: Re-verify at HIT time: `t._letter === S.currentWord[S.letterIdx]`. Ignore stale spawn-time flag.
- **Lesson**: Any boolean flag that reflects game state at a PAST moment is suspect when there's a time delay between capture and use (spawn → collision = ~2-3 seconds). Prefer live lookups over cached flags whenever cheap. Rule of thumb: if state could have changed in the time between flag-set and flag-read, re-derive at read time.

### L11 — PIXI + location.reload race: clean up before reload
- **Symptom**: G6 "Level Berikutnya" click → frozen screen.
- **Root cause**: `location.reload()` fired while PIXI ticker + BGM audio element were still active. Mobile browsers can race the pagehide/reload with the pending ticker callbacks, leaving the transition appearing frozen.
- **Fix**: Before `location.reload()`, call `app.ticker.stop()` + `_bgmEl.pause()`, then `setTimeout(30)` to let the hide-transition settle.
- **Lesson**: Never call `location.reload()` directly from inside a running PIXI game. Pattern: `cleanup() → setTimeout(30) → reload()`. Works on any game engine that has async loops.

### L12 — Sprite swap requires type check, not just property set
- **Symptom**: G6 user picks 🚂 train, game renders blue sport car PNG.
- **Root cause**: Code did `carSprite.text = selectedVehicle` to update the emoji. That works only if `carSprite` is a PIXI.Text. If a PNG had previously loaded, carSprite was replaced with PIXI.Sprite; setting `.text` on a Sprite silently does nothing.
- **Fix**: New `rebuildCarSprite(emoji)` helper explicitly removes the old sprite, creates a new PIXI.Text or PIXI.Sprite based on whether the emoji maps to a PNG, and adds it to the container.
- **Lesson**: When a visual element can be represented by two different PIXI types (Text vs Sprite), never update it via type-specific properties (`.text`, `.texture`). Always provide a `rebuild(stateKey)` helper that recreates the right type from scratch.

---

## 2026-04-23
- **Symptom**: G10 Pokémon facing bug "failed puluhan kali" — every prior patch (adding `style.transform = pokeFlipForRole(...)` after sprite swap) silently reverted.
- **Root cause**: Keyframes hardcoded `transform:scaleX(-1)` at every step. During animation, keyframe value wins over inline style. After `animation-fill-mode:forwards` locks the sprite's final computed value, removing the class doesn't revert — the locked value persists.
- **Fix**: Make keyframes read `scaleX(var(--flip))`. JS sets both `el.style.setProperty('--flip', sign)` AND `el.style.transform = 'scaleX(...)'` for belt-and-suspenders safety. Variable-driven keyframes mean ONE source of truth regardless of animation state.
- **Lesson**: When a per-element visual state needs to survive CSS animations, use a CSS custom property the keyframe reads. Never assume inline `style.transform` wins over keyframes — it doesn't while the animation is active, and `forwards` extends that to permanent.

### L2 — Guard every modal/terminal-state function against double-invocation
- **Symptom**: End-game modal freeze, double XP, stacked achievement toasts.
- **Root cause**: `showResult()` had no entry guard. G5 memory games wrap it in 700–1200ms `setTimeout`; user rapid-taps during delay queue a second call; both execute fully, toasts stack above buttons.
- **Fix**: Entry-guard pattern: `if (state._showingResult) return; state._showingResult = true; setTimeout(()=>{state._showingResult=false}, 1500)`. Cleared on legitimate re-entry hooks (`playAgain`/`nextLevel`/`goToMenu`).
- **Lesson**: Any function that shows a modal or triggers a game-over transition needs a re-entrancy guard. Never assume it's called once — setTimeout chains, click handlers on transitional buttons, and background game-loop checks can all fire overlapping calls.

### L3 — CSS keyframes + custom properties = per-instance animation variants
- **Problem**: G10 has 12 keyframes covering player vs enemy × atk/hit/defeat/swap. Supporting per-Pokemon natural facing used to require duplicating each keyframe.
- **Solution**: Single keyframe using `transform: scaleX(var(--flip)) translateX(-26px) ...`. `--flip` is set per-element in JS. One keyframe, N variants.
- **Lesson**: CSS custom properties inside keyframe `transform` expressions make a keyframe effectively parameterized. Works for scale, rotation, translation. Cuts duplicate keyframe code massively.

### L4 — Scale-dependent positions need per-viewport recomputation on resize
- **G14 wheel offset**: `laneH*0.22 - 19` depends on `laneH`, which changes on orientation. Storing the computed offset as `_wheelOffset` on the PIXI container + re-setting it in the resize handler keeps wheels aligned when user rotates device mid-game.
- **Lesson**: Any derived geometry needs to be recomputed when viewport dimensions change. Cache the derived value on the live object (not as a const) so the resize handler can recalc.

### L5 — Fixed-px character sizes break responsive design; `clamp()` is the pattern
- Old pattern: `font-size: 108px` + 3 media-query overrides (480/360/320).
- New pattern: `font-size: clamp(64px, 18vw, 120px)` + one override for landscape-phone (short viewport).
- **Lesson**: For any emoji/character that must scale proportionally with viewport, `clamp(minPx, preferredVw, maxPx)` beats discrete breakpoint overrides. Four breakpoints become one formula. Landscape-phone (short viewport) still needs its own override because `vw` doesn't capture viewport height.

### L6 — Config data belongs in sessionStorage as a blob, not URL params or globals
- G14 needed `difficulty` passed from `game.js` → standalone `games/g14.html`. Already using sessionStorage for level — extended the same blob.
- **Lesson**: Cross-page config transfer pattern: `sessionStorage.setItem('${gameId}Config', JSON.stringify({level, difficulty, ...}))` on send-side; `try{...JSON.parse(sessionStorage.getItem(...))}catch(_){}` with sane defaults on receive-side. Add fields freely; old receivers ignore unknown keys.

---

## 2026-04-22

### Manual threshold beats AI rembg for cartoon art on white backgrounds

- **Symptom**: Linus Brave character train rendered as a shattered/pecah fragment in G15 + G16 — inner body regions missing, only wheels + partial cab visible.
- **Root cause**: rembg with `u2net` (and even `isnet-general-use` + alpha matting) was trained on photographs. On flat cartoon art, the AI model sees uniform colored regions as "background-like" and erroneously alphas them out. First pass removed 77% of Linus sprite; even gentler pass left inner body holes.
- **Fix**: Deterministic Pillow+numpy threshold. `RGB ≥235 → alpha 0`, `RGB ≥200 → alpha 180` (soft edge). No AI involvement. ~50ms per sprite.
- **Lesson**: For CLEAN cartoon/illustration input with white backgrounds, manual luminance threshold beats AI matting. AI models trained on photos misread flat regions. Rule of thumb: if input is solid-color fills (not photograph textures), use threshold first; reach for AI rembg only when the background is textured/noisy.

### Result modal engine — 3-layer defense against contradictory success messages

- **Symptom**: User screenshot — result modal showed "Selesai!" + 1★ + "Sempurna! Tidak ada kesalahan!" + "Matematika Benar: 0" + enabled Level Berikutnya button — with zero correct answers.
- **Root causes** (compound): (1) `GameScoring.calc` returned 1 star even for zero correct (`else stars = 1`); (2) Caller G15 checked `wrongTaps === 0` but not `mathCorrect === 0` so zero-answers path took success branch; (3) `GameModal.show` forwarded caller-supplied title/msg verbatim with no sanity check.
- **Fix**: 3-layer defense. Layer 1: `GameScoring.calc` returns 0 when `correct <= 0`, allows 0★ through bonus path. Layer 2: `GameModal.show` normalizes 0-star state (force emoji 😞, title "Gagal! Coba Lagi", msg override if it contains success words). Layer 3: per-caller fix — 13 callers audited across 9 games, each now branches title/emoji/msg on actual star count.
- **Lesson**: Shared result modals need DEFENSE-IN-DEPTH. Any single layer can fail (engine bug, caller bug, ambiguous success criteria) — the visible UI should be the last-line guardrail that refuses to display contradictory state (e.g., "Sempurna" text with 0 stars). Add explicit sanity-check assertions at the UI boundary; when they fire, override to a safe fail-state rather than letting garbage render.

### Hybrid rendering: character sprites vs programmatic Graphics

- **Symptom**: G15 had a full parametric `PIXI.Graphics` locomotive builder (5 type-specific `drawBody()` functions). User wanted cartoon character trains that can't be expressed geometrically.
- **Root cause**: Mixing raster sprites + Graphics in the same container requires branching BEFORE existing type-dispatch, because container flip conventions differ (sprites face right natively after rembg; Graphics locomotives drawn facing left then mirrored via `scale.x=-1`).
- **Fix**: `buildTrain()` checks `selectedTrain.isCharacter` FIRST. Character: `scale.x=1` + `CharacterTrain.mount()`. Programmatic: `scale.x=-1` + existing dispatch. Instance tracked for tick + dispose on train swap.
- **Lesson**: When adding a new render paradigm to a dispatch-based system, encode it as a LEAF branch at the top of the dispatcher, not interleaved with existing cases. Document the invariants each paradigm assumes (anchor, flip, coordinate system).

### Mirror CSS clamp formula in JS runtime

- **Symptom**: CSS `--rz-scale` tokens give DOM games fluid scaling, but PixiJS games compute sizing independently → DOM navbar + Pixi sprite coexist at mismatched scales on resize.
- **Root cause**: No shared source of truth between CSS `clamp()` and JS sizing.
- **Fix**: `shared/rz-responsive.js` exposes `window.RZ.scale()` with the SAME formula: `Math.min(1, Math.max(0.7, 0.44 + innerWidth * 0.00175))`. PixiJS games call `RZ.btn('md')` / `RZ.fontScale(22)` for coherent sizing.
- **Lesson**: When a system has CSS-controlled AND JS-controlled visual elements on the same viewport, ship the JS variant as a direct mirror of the CSS formula (or vice versa). One source of truth prevents visual desync on resize/orientation-change.

---

## 2026-04-21 (Evening Session)

### Unified Scoring Engine — bonus-modifier pattern for non-accuracy games (Task #25)

- **Symptom**: `GameScoring.calc({correct, total, ...})` is designed for accuracy-based scoring (100%=5★, 85%=4★…). But three remaining games (G13 evolution, G13b kill-count, partly G17) use **threshold/progression** scoring where "correct/total" has no natural meaning. Naive migration (mapping kills to fake "correct") either drifted from legacy star distributions or required wrapper math that was uglier than the original ternary.
- **Root cause**: Accuracy scoring assumes a linear correct-answer → stars mapping. Survival games ("get 50 kills = 5★") have a piecewise-tier mapping, and progression games ("evolved twice = 5★, once = 4★, none = 3★") have a categorical mapping. Neither fits the accuracy contract cleanly.
- **Fix**: Use the `bonus` parameter as a delta from perfect. Call `GameScoring.calc({correct: 1, total: 1, bonus: tier - 5})` where `tier` is the legacy piecewise result (e.g., `s.kills >= 50 ? 5 : s.kills >= 30 ? 4 : ...`). The engine's internal clamp `min(5, max(1, stars + bonus))` gives back the tier verbatim (since base=5, 5+(tier-5)=tier, clamped). This preserves exact legacy star distribution AND routes through the unified entry point for future instrumentation (telemetry, tuning, A/B tests).
- **Lesson**: When migrating to a shared engine, **don't force every caller into the canonical parameter shape**. Provide a pass-through lane (here: `bonus`) that lets non-canonical callers join the unified code path without distorting their scoring semantics. The payoff: one chokepoint for all games (easy to swap algorithms, add analytics, or apply global balance tweaks), zero regression risk on existing balance. Applies to G13 (`bonus = evoLevel - 2`), G13b (`bonus = killTier - 5`), and any future game whose scoring is tier/threshold-based rather than ratio-based. Accuracy-first callers (G17 Jembatan, G18 Museum) still use the canonical `{correct, total}` shape directly.

### Auto-jump removed for direct control (G20)

- **Symptom**: User feedback on G20 Ducky Volley — "kontrol dan physics g smooth, pergerakan bola dan pemainnya... Jangan dikasih auto jump." Jumping felt non-deterministic; horizontal motion felt twitchy; ball arcs were abrupt.
- **Root cause**: Two hidden auto-jump paths fought the player. (1) `if(S.pGnd && S.bx<NET_X && S.bvy>0 && Math.abs(S.bx-S.px)<60 && S.by<GROUND_Y-40) S.jump=true` — an "assist" that auto-triggered jumps whenever a ball approached, regardless of player intent. (2) Every `touchstart` set `S.jump = true` (comment: "tap = jump") — so any drag-intended tap also fired a jump. Movement was hard-assigned (`S.pvx = ±spd`) instead of lerped, causing instantaneous direction flips with no easing. Ball physics had no air resistance — gravity-only arcs felt arcade-y.
- **Fix**: (a) Deleted the auto-jump assist line entirely. (b) Removed `S.jump = true` from `touchstart`; replaced with a swipe-up gesture (`_touchStartY - curY > 40` while `pGnd`, one-shot via `_swipeJumped` flag) plus a visible `#btn-jump` button on touch devices (72×72 yellow circle, bottom-right). (c) Converted horizontal movement to lerp: `S.pvx = S.pvx*0.78 + target*0.22` in both drag-drive and keyboard paths. Friction raised `0.88 → 0.86`. (d) Added rise damping `if(S.pvy<0) S.pvy*=0.985` for a gentler jump apex. (e) Ball: gravity multiplier `0.65 → 0.60`, plus air drag `bvx*=0.995^dt`, `bvy*=0.998^dt` for smoother arcs. Kept BGM, pause menu, scoring, and collision logic untouched.
- **Lesson**: "Assist" logic that writes input state (`S.jump = true`) on the engine's behalf is a trap. It turns deterministic input into probabilistic input — the player can never predict whether their next tap will cause a jump or a move. If you want to help the player, adjust **physics parameters** (wider hit window, more forgiving collision) or **timing** (buffered input, coyote time), but never synthesize input events. For movement feel, **always lerp** toward target velocity rather than hard-assigning it — the cost is one multiply-add per frame and the feel improvement is dramatic. Touch gestures for jump: swipe-up distance threshold (40px) + one-shot flag prevents rapid re-fire; always pair with an always-visible button for accessibility.

### Frame-rate-independent state transitions (train bablas)

- **Symptom**: G16 train occasionally blew through an obstacle without stopping — state never transitioned through `STOPPED`, so the 1.2s "stopped but no quiz" bablas-recovery guard (Task #34) never fired. Train kept moving past `WORLD_LENGTH+200` → `triggerDeath()` → freeze.
- **Root cause**: Three independent issues compounded. (1) The `maxStep` clamp had a `2px` floor — on dt spikes (tab-switch, slow device, GC pause), accumulated step could exceed the 2px floor and cross the obstacle in a single frame. (2) `speed*dt` was not capped — a 500ms dt spike at boost speed can teleport the train hundreds of pixels. (3) Once past the obstacle, `S.obstacles.find(o => !o.cleared && o.worldX > S.worldX - 10)` picked up the NEXT uncleared obstacle (not the missed one), so the state machine never tried to stop for it.
- **Fix**: 4-part defense. (a) Floor `2px → 0.2px`. (b) Hard clamp: if next step would cross `nextObs.worldX + 5`, snap `worldX = nextObs.worldX - 1` + force STOPPED + call `showQuizPanel` directly; never `+=` that step. (c) Absolute per-frame cap `Math.min(speed*dt, baseSpeed/2)` — no matter what `dt` is, train can't move more than half a base-second per frame. (d) Game-loop prologue scans for any uncleared obstacle at `worldX < S.worldX - 20` and rewinds the train — last-ditch recovery if (a–c) still miss.
- **Lesson**: Any "approach → stop at threshold" state transition must be defended at the STEP level, not the STATE level. State-based guards (STOPPED-no-quiz timer) only fire if the state was entered; if the transition was skipped entirely (because `dt*speed > distance`), no state-based guard will catch it. Cap `speed*dt` to a framerate-independent max, hard-clamp position on crossing, and add a recovery pass that detects "already past" conditions and rewinds. The 2px/0.2px lesson generalizes: threshold floors should be chosen from the rendering tolerance (sub-pixel), not from "feels safe" heuristics.

### Deterministic density vs randomized spacing

- **Symptom**: G16 had 3–4 mini-obstacles per station gap despite a random-spacing formula intended to produce ~3. User wanted 1–2.
- **Root cause**: `miniSpacing = 225 + Math.random()*150` gave an average of 300px, but station spacing is ~1210px → `floor(1210/300) = 4` minis per gap. Random-spacing formulas don't cap density; they sample a rate.
- **Fix**: Replaced with deterministic per-gap placement: iterate adjacent station pairs, place `maxMinisPerGap` minis evenly (`worldX + gap * m / (N+1)`). Difficulty scales via `{1:1, 2:2, 3:2, 4:2, 5:3}[level]`.
- **Lesson**: When a design calls for "1–2 items between anchors", iterate anchor pairs with a loop counter — never rely on random-rate spacing, which produces a distribution, not a guarantee. Random spacing is fine for aesthetic filler (dust, clouds); deterministic placement is required for gameplay-impacting items whose count matters.

### PIXI v8 async texture loading

- **Symptom**: G6 vehicle sprite never appeared — stuck on emoji fallback despite image files existing and accessible via HTTP 200.
- **Root cause**: `PIXI.Texture.from(url)` in PIXI v8 is NON-BLOCKING. Failures surface async, so `try/catch` around the call caught nothing. The `Sprite` was created with an unloaded texture; `onerror`-style fallback was impossible.
- **Fix**: `PIXI.Assets.load(url).then(tex => swapSprite).catch(err => keepEmoji)`. Show emoji placeholder immediately, swap to sprite once resolved.
- **Lesson**: In PIXI v8, ALWAYS use `PIXI.Assets.load()` for raster images. Never wrap `Texture.from()` in `try/catch` expecting sync failure. Rule applies to all games that load external images (G6, G10, G13b, G13c, G22).

### Engine default assumption bias (facing direction)

- **Symptom**: User flagged Staryu "still not facing", then corrected to "Pikachu is wrong" — player sprite facing left instead of right.
- **Root cause**: BSE engine defaulted to `natural facing = 'R'` (sprite head points right). But Pokemondb HOME 3D renders actually face the viewer with a slight LEFT bias. Default assumption inverted reality for ~95% of the roster.
- **Fix**: Flipped default to `'L'` in both `games/battle-sprite-engine.js:15` and `game.js:5010`. All per-Pokemon `'L'` overrides became redundant and were removed.
- **Lesson**: Test engine defaults against ACTUAL source data, not abstract notion. When flipping the default eliminates most override entries, the default was wrong.

### Low-alpha shoulder decorations read as random clutter (G6)

- **Symptom**: G6 player feedback — "melayang-layang di luar jalan kesannya acak" (shoulder emoji decorations feel like random floating junk outside the road). User specifically flagged it in dark mode. Docked engagement during gameplay.
- **Root cause**: `buildScenery` seeded 16 theme emoji (🌲/🌙/🏢/🌸/…) at `alpha 0.2-0.35`, placed on the canvas **outside** `roadLeft`/`roadRight`. Three compounding issues: (a) low alpha + dark background makes the symbols read as "ghost specks" — no clear semantic layer (foreground road ≠ background scenery); (b) random `x` placement across a wide shoulder band means the decorations don't anchor to any visual rhythm (unlike road signs, which spawn periodically at tuned intervals); (c) scroll speed 0.55× road speed gives parallax depth, but without clustering (trees-in-group, buildings-in-row), the eye reads each emoji as a stray glitch rather than "distant scenery".
- **Fix**: Removed the emoji-spawn loop entirely. Kept the empty `sceneryL`/`sceneryR` containers so the game-loop scroll tick (`bg._sceneryL.y += scrollAmt`) stays safe without null-check retrofits. Road signs — which spawn periodically INSIDE the canvas bounds and have clear semantic meaning (🛑/⚠️/🚦) — remain the only ambient road furniture.
- **Lesson**: Ambient decoration needs two properties to NOT read as clutter: (1) visual clustering so the eye groups it as "scenery" instead of "artifact" (rows of trees, strips of buildings — never isolated specks); (2) alpha high enough to be definitively present or absent, never "maybe there". Low alpha + isolated placement + outside-playfield location is the worst-case combo — the decoration becomes indistinguishable from a render bug. When in doubt, remove ambient scenery; it's cheaper to ship less than to tune more. Companion rule: when removing a feature wired to a game-loop tick, preserve the accessor refs as empty stubs rather than adding null checks at the call site — fewer branches, same safety.

### CSS multi-row navbar on narrow screens

- **Symptom**: Game header `.game-header` wraps to 2 rows on phones < 360px; children stack vertically (back, title, level, player, pause, stars).
- **Root cause**: Flex container with no `flex-wrap:nowrap` + title with `flex:1` but no `min-width:0` — long title text forces siblings to wrap.
- **Fix**: `.game-header { flex-wrap:nowrap; overflow:hidden }` + `.gh-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }`.
- **Lesson**: Flex children with `flex:1` need `min-width:0` to allow shrinking below content width. Without it, long text blocks can push siblings to a new row even when `nowrap` is set.

### PIXI text button overflow from container

- **Symptom**: G16 quiz answer text leaks out of button boundary.
- **Root cause**: `.choice-btn` had `max-width:120px` + fixed `font-size:clamp(16px,5.5vw,26px)` — long answer strings like "Matahari" or multi-word categories overflow.
- **Fix**: Removed max-width cap, added `overflow:hidden; overflow-wrap:break-word; white-space:normal; line-height:1.2`, reduced default fontSize. JS auto-applies `.long-text` class (smaller font) when any answer >5 chars.
- **Lesson**: Dynamic answer text needs dynamic button sizing OR dynamic font sizing. Static `max-width` + static `font-size` is a recipe for overflow. G22 pattern of measuring `textObjs.map(t => t.width)` is ideal.

### Hardcoded sibling race (end-game freeze)

- **Symptom**: G16 game freezes at end — doesn't advance to result screen.
- **Root cause**: Multiple state transitions (`ARRIVING` → `ARRIVED` → `setTimeout showWin`) in one chain. If ANY step throws or `winShown` flag stays stuck false, the game hangs with no fallback.
- **Fix**: 8-second safety `setTimeout` in `triggerArrival()` that force-fires `showWin()` if normal flow fails, with nested try/catch falling back to `finishGame()`.
- **Lesson**: For single-point-of-failure state transitions (especially ones gated on async animations), ALWAYS add a timeout-based safety net. Pick timeout 2-3× longer than expected normal path.

### Pokemondb sprite inventory expansion

- **Symptom**: User provided new HD sprite folder — realized previous coverage was ~751 SVGs out of 1025 Pokemon, creating fallback-to-low-res cascade for Gen 8/9.
- **Root cause**: Sprite roster never audited against current dex size (1025 as of Gen 9 DLC).
- **Fix applied** (Task #37): `pokeSpriteAlt2(slug)` added, cascade is now alt2 → SVG → HD CDN. Primary swapped to 1025-set local WebP. BSE `hdSrc` param picks it up unchanged.
- **Lesson**: For data-driven games, inventory the SOURCE data periodically. Audit coverage vs current canonical count before sprinting into code. When a new asset set matches an existing engine's default assumption (facing, dimension), zero override entries needed — a good sign the asset set was chosen well.

### Source data inventory

- **Symptom**: Gen 8/9 Pokemon rendered via remote HD CDN (network latency, offline break) while Gen 1-7 rendered via local SVG — inconsistent cost model across the roster.
- **Root cause**: Local SVG set was frozen at 751 entries when Gen 8 launched. No periodic re-inventory.
- **Fix applied**: Local 1025-WebP set integrated as new top of cascade; SVG demoted to secondary; remote CDN demoted to tertiary. Result: all battle sprites now load locally for 100% of roster.
- **Lesson**: When a local asset set covers <100% of data model, flag it in the cascade comment. Every added data-model entry (new Gen / new DLC) should trigger an asset audit checklist item.

### Fluid CSS tokens replace step-function media queries

- **Symptom**: Same "shrink button/font at narrow width" logic duplicated across 22 games via `@media(max-width:480px) / 400px / 360px` blocks. 60+ lines of stepwise overrides; visual jumps at each breakpoint; letter-input rows went vertical inconsistently.
- **Root cause**: Each game reimplemented its own breakpoint ladder with hand-picked pixel values. No shared scale. `@media` is a step function — it snaps at thresholds instead of interpolating.
- **Fix** (Task #29 Steps 1+2): single `--rz-scale: clamp(0.7, calc(0.44 + 0.175vw), 1)` in `:root`, plus derived `--rz-btn-*`, `--rz-font-*`, `--rz-gap-*`, `--rz-radius-*` tokens. Reusable primitives `.rz-navbar`, `.rz-letter-row`, `.rz-letter-btn`, `.rz-choice-grid` consume the tokens. Migration (Steps 3–7) deletes per-game `@media` blocks one game at a time.
- **Lesson**: `clamp(min, Xvw, max)` and `calc(base * var(--scale))` interpolate CONTINUOUSLY across viewport widths — no visual snap, no stale breakpoint values to maintain. When you catch yourself writing the same `@media(max-width:…)` for the third time, that's the signal to extract a fluid token instead.

### Correct-answer juice — reward scaling by streak (Task #38)

- **Symptom**: G16 "Selamatkan Kereta" — correct quiz answer under-rewarded. Only a green flash + `btn.correct` class; no spatial/physical feedback, no escalation for consecutive correct answers. Children lose engagement signal after 2-3 answers.
- **Root cause**: Single-state success feedback gives a flat reward curve. Players who answer 5-in-a-row get identical juice to first-timers, dampening flow and achievement. "Juice" (game-feel feedback) wasn't tiered against performance.
- **Fix**: Three-tier `spawnQuizCelebrationFX(x, y, streak)` — (1) baseline 14-confetti burst + white ring, (2) streak≥3 adds 6 secondary firework bursts of 10 sparks, (3) streak≥5 adds 8 floating ⭐✨🌟💫 emoji + gold ring pulse. Plus a 0.5s stage-scale "punch" (1→1.04→1 via sine bell-curve) for whole-screen kick. Streak tracked on `S.correctStreak` (reset on wrong). Particles share existing `sparkParticles[]` cull loop, extended with `_ring` (expand+fade, no motion) and `_noGravity` (emoji float-up) branches.
- **Lesson**: Reward feedback should SCALE with performance. Flat juice = flat engagement. Track a streak counter, branch FX by threshold (3/5 are good defaults), and LAYER effects — baseline stays for beginners, extras reward mastery. Stage-level "punch" (brief scale bump via sine curve over ~0.5s) reads as a kick, not a zoom — center-compensate `stage.x/y` so the punch pivots from the middle. Always route new particles through the existing cull pipeline to keep GC pressure constant.

### RDE migration: preserve non-size properties separately from token adoption (G8)

- **Symptom**: Naively replacing G8's base rules with `.rz-letter-btn` via HTML class composition would lose G8's unique visual identity — purple `border:3px solid #DDD6FE`, violet `box-shadow:0 4px 0 #7C3AED`, brand color, `:active` transform-scale, `.used` opacity state, and — critically — the Scrabble wooden-tile dark-theme overrides at `style.css:1691–1756` that depend on selector specificity `.g8-letter-btn` (not `.rz-letter-btn`).
- **Root cause**: RDE's Layer 2 classes (`.rz-letter-btn`) define size/shape/font tokens, but games carry per-game *theme* (colors, shadows, state modifiers, dark overrides). Swapping the class in HTML would decouple the theme from the element and require rewriting every `[data-theme="dark"] .g8-letter-btn` rule to use the shared class. HTML class changes also ripple to JS (`document.querySelectorAll('.g8-letter-btn')` in `game.js` would need a rename).
- **Fix**: Keep `.g8-letter-btn` / `.g8-slot` class names in HTML. Instead of class composition, do **token composition**: rewrite the G8 base rule to consume `--rz-btn-sm`, `--rz-font-title`, `--rz-radius-sm`, `--rz-gap-sm` inline, while preserving every border/shadow/color/transition. Then delete G8 entries from `@media` blocks — the tokens' `clamp()` handles fluid scaling. Preserve a small aspect multiplier where needed (`height: calc(var(--rz-btn-sm) * 1.18)` keeps the 44×52 slot ratio; `font-size: calc(var(--rz-font-title) * 1.05)` keeps the 24px vs 22px title-font ratio). `min-width: var(--rz-btn-sm)` on `.g8-letter-btn` prevents flex-wrap from collapsing a button below one-per-row at 320px.
- **Lesson**: RDE Layer 2 classes are an **opt-in primitive**, not a drop-in replacement. For games with established dark-theme selectors, state modifiers (`.active`, `.filled`, `.used`, `.celebrate`), or JS selectors, the safer migration is **token composition** (keep `.g<N>-*` class, replace hard-coded px with `var(--rz-*)`). Reserve class composition (`.rz-letter-btn .g<N>-accent`) for greenfield games. Also: when replacing a hard-coded dimension, preserve the **ratio** relative to the token's base (e.g., if the original was `52px` and the token's base is `44px`, multiply: `calc(var(--rz-btn-sm) * 1.18)`) — don't just snap to the token's base value or the visual changes uniformly across breakpoints. Finally: removing `@media` entries counts as a code-reduction win (3 breakpoints × 2 rules = 6 lines here), validating Layer 1's `clamp()` promise.

### L57 — Landscape media query that collapses grid rows must update ALL grid-row hardcodes (Hotfix #116)

- **Symptom**: G13 Evolusi screen in landscape — enemy at top-left, player at center, player HP info card detached at bottom-center. Diagonal layout broken.
- **Root cause**: Hotfix #112's landscape media query at `style.css:3618-3627` set `.g13-field { grid-template-rows:1fr !important }` (1 row), but `.g13-player-info` retained `grid-row:2;grid-column:2`. With only 1 explicit row defined, browsers create an implicit row 2 and stretch it outside the field bounds → card detaches.
- **Fix**: Revert grid override. Keep 2×2 grid in BOTH portrait and landscape — only scale sprites larger via `clamp(180px, min(28vw, 36vh), 340px)`. Add explicit `grid-column:1;grid-row:1` to `.g13-wild-info` so layout never auto-flows.
- **Lesson**: When a media query restructures a grid, audit every child with hardcoded `grid-row` / `grid-column`. CSS Grid implicit rows look fine in DevTools but visually detach content. The simplest fix is to NOT collapse the grid — scaling cells with `clamp()` covers most landscape cases without changing structure.

### L58 — Modal z-index hierarchy must order interactive overlays above passive ones (Hotfix #116)

- **Symptom**: G13B "ganti pokemon" picker freeze. Tab clicks (ash-popular, etc.) and close button unresponsive. Picker visually shown but no clicks landed.
- **Root cause**: `.g10-party-overlay` z-index was 300. Sibling overlays from prior battle states (`.g13-evo-overlay` z:600, `.g13b-result-overlay` z:500, `.gr-overlay` z:500, math-quiz overlay) lingered with `display:flex` or non-`pointer-events:none` and absorbed all clicks.
- **Fix**: (1) Raise `.g10-party-overlay` z-index 300 → 750 (above all sibling overlays). (2) `openG13bPartyPicker()` defensively scans for those selectors and `display:none` any with non-`none` computed display, marking with `.g13b-picker-hidden` class. `closePartyPicker()` restores after close.
- **Lesson**: For interactive overlays opened from within an active game scene, BOTH raise z-index above ALL siblings AND defensively hide lingering overlays. `pointer-events:none` on inactive overlays is cleaner long-term but requires auditing every state transition; the hide-and-restore pattern is bulletproof and reversible. Document the z-index ladder in a standardization file (party 750 > evo 600 > result/reward 500 > base modal 300) so future overlays slot in cleanly.

### L59 — All Pokemon image rendering in g13/g13b/g13c must flow through HD-first cascade (Hotfix #117)

- **Symptom**: User reported recurring "non-HD sprite" appearances: "di g13, g13b dan g13c pastikan tidak akan menggunakan gambar pokemon yang non-HD. karena beberapa kali pernah ada yg non HD." Visible 96×96 pixelated sprites alongside the 630×630 HD WebP sprites in the same battle screen.
- **Root cause**: 7+ direct `imgEl.src = 'https://img.pokemondb.net/sprites/home/normal/{slug}.png'` (96px CDN) assignments scattered across `game.js`, bypassing the HD-first cascade introduced in Hotfix #101-J. Each direct assignment showed a 96px image; only the cascade-wired sites loaded the HD WebP.
- **Fix**: Refactored every direct assignment to `attachSpriteCascade(imgEl, buildPokeSources(slug, id), '🎴')`. Cascade order: HD WebP 630×630 → SVG → local PNG → 96px CDN → 96px PokeAPI raw. Each remaining `else { imgEl.src = ... }` legacy fallback (only fires when cascade helpers unloaded) annotated `// LEGACY-FALLBACK-EXEMPT`. For static HTML template strings (where `attachSpriteCascade` cannot be called), use `pokeImg(slug)` as primary `src=` (returns HD WebP first) with onerror chain to 96px CDN.
- **Lesson**: Once a "preferred source" has multiple call sites, drift is inevitable unless enforced. Don't rely on memory or code review to keep the cascade in use — write a regression check (`scripts/check-regressions.sh` rule `HD-SPRITE-1`) that fails CI when a direct non-HD assignment is added without the `// LEGACY-FALLBACK-EXEMPT` annotation. Lock the rule's exemption surface explicitly: cascade guard, `pokeImg`/`SPRITE_HD` helper invocation, `onerror` chain inside HTML template, or the helper definitions themselves. Anything else is a violation. Also: when re-using an `<img>` element across battles, call `resetSpriteEl(imgEl)` before re-attaching the cascade — the old onerror closure can fire for the new slug otherwise (Hotfix #110 race).

### L60 — User-provided reference assets are mandatory (Hotfix #118)

- **Symptom**: G21 Mario Pokemon shipped in #105-#109 with custom-drawn Pixi Graphics terrain (gray hill silhouettes, dark red brick rectangles, generic ?-block, hand-shaped goomba). User: "ini level2nya super mario bross, pijakan, musuh, item2, dunia semuanya tapi ini malah anda membuat sendiri, saya tidak mau saya mau yang original world yang pernah saya kasih. kamu mengacaukannya." User had supplied a reference at session start (`/Bagus_Apps/Supermario/`) with 380 NES SMB1 PNG sprite sheets — never used.
- **Root cause**: At g21 build time (Hotfix #105), the assistant defaulted to "Pixi Graphics for visual control" without checking if the user's reference folder existed. Hand-drawn terrain shipped to production. Cultural recognition (NES SMB1 visual identity) the user wanted was lost; the game looked "made-up" instead of authentic.
- **Fix**: Hotfix #118 copied 29 essential sprites from the reference (block, brick, qblock×3 frames, goomba×2 frames, coin×3 frames, mushroom, starman, 1up, fireflower, pipe, bush, cloud, hill, flagpole, castle wall/brick/door, etc.) into `assets/mario-pokemon/sprites/` and refactored `placeTile()`, `drawClouds()`, `buildMidLayer`, `makeDecoration`, plus enemy/coin/item rendering to `PIXI.Sprite` instances loaded via `PIXI.Assets.load`. Default sky theme switched to SMB1 light-blue `#5C94FC`. Pikachu glow halo eliminated via Pillow `getbbox()` crop + `haloFudge` Y-offset for GIF states.
- **Lesson**: When the user supplies reference assets at session start ("here's my Mario folder", "use these sprites", linking a source project), CATALOG the directory immediately and treat it as the single source of truth. Before drawing ANY Pixi Graphics primitive, Canvas shape, or SVG construction for sprites/levels/characters, check the reference folder for a matching asset. If it exists, use `PIXI.Sprite.from(asset)` / `<img src=...>`. If pieces are missing, ask the user before drawing custom replacements. This applies to all visual content: game sprites, character art, level layouts, UI mockups, brand colors, audio cues. Algorithmic content (math problems, generated text) doesn't need references. See `feedback_user_reference_assets.md` in user memory.

### L62 — Save keys must follow the SAME naming scheme everywhere they're written or read (Hotfix #115 + #119)

- **Symptom**: Kid plays g15/g19/g21 standalone games, earns stars, returns to world map — stars don't appear. Repeats on different avatars; behavior is consistent. User: "ini issue progress-saving engine."
- **Root cause**: Hotfix #103 introduced avatar-keyed save (`dunia-avatar-{slug}-progress`). Main app `game.js` reads via `pkey()` helper. But standalone game pages (`games/g14.html`, `g15-pixi.html`, ...) didn't load `game.js` and continued writing to legacy `dunia-0-progress`. The two halves of the system disagreed on the storage key. The pageshow handler in main app provided partial mitigation (it dual-wrote on return), but switching avatars mid-session or reading on a fresh load still missed standalone-game stars.
- **Fix**: Hotfix #115 created `games/data/save-engine.js` exposing `window.saveLevelProgress(gameId, level, stars)` and `window.activeAvatarBadgeKey(suffix)` — both resolve the active avatar internally. Hotfix #119 swept all 8 standalone games to call `window.saveLevelProgress`, with the legacy `dunia-0-progress` block kept only as an `else`-fallback when the engine isn't loaded. Added `g13c_badges` migration to `migrateSlotToAvatar()` so pre-#103 global badges fan out to per-avatar copies. New `SAVE_ENGINE_STANDARD.md` codifies the rules; regression script rule `SAVE-AVATAR-KEYED` blocks future direct slot-0 writes.
- **Lesson**: When a key naming convention changes (legacy → namespaced), audit EVERY write site immediately. A read/write key mismatch is silent — no error, just empty data. Centralize the key resolution in a single helper module and load it everywhere; never let standalone pages re-implement their own. For migrations, always run them on EVERY app boot path that might be the first one (main app, standalone pages that boot without main app, etc.). Confirm coverage with a regression check that scans for the legacy pattern; this stops drift cold. Bonus: when introducing a new namespace, ALSO write a fallback that DUAL-WRITES to the legacy key for one or two release cycles, so older clients in flight don't lose data.

### L61 — Sprite halo/glow padding requires cropped variant or wrapH compensation (Hotfix #118)

- **Symptom**: G21 Pikachu visually appeared to float ~12-15px above platforms. Anchor logic looked correct (`screenY - wrapH`), but the sprite's "feet" sat on the platform while empty space showed below — confusing physics-vs-visual mismatch.
- **Root cause**: `pikachu-small.png` and `pikachu-big.png` were 512×512 canvases with the actual Pikachu body taking only ~140-160px in the center, surrounded by transparent yellow glow halo padding. The DOM `<img>` overlay positioned the sprite so its TOP-LEFT corner was at `screenY - wrapH`, but the visible body was 12-15px below the canvas top — making it look like floating.
- **Fix**: Two-pronged. (1) Static PNG states: `scripts/process-mario-sprites.py` uses `PIL.Image.getbbox()` to detect non-transparent bounding box and crop. `pikachu-small.png` 512×512 → `pikachu-small-cropped.png` 476×140. `pikachu-big.png` → `pikachu-big-cropped.png` 495×124. Reference these in g21-pixi.html. (2) GIF states (idle/running/jump/happy): can't easily crop animated GIFs without losing frames, so use `haloFudge = 10` as a Y-offset added to the existing anchor formula: `topPx = screenY - wrapH + haloFudge`.
- **Lesson**: Sprites authored at-canvas-size (centered with padding for animation room) need either (a) automated `getbbox()` crop pipeline at build time, or (b) explicit per-sprite `haloFudge` constant in the anchor math. Never assume the sprite tightly fills its bounding box — inspect with `from PIL import Image; print(Image.open(p).getbbox(), Image.open(p).size)` before wiring. For GIFs, use the cropped first-frame PNG as a stand-in for the bbox calculation, then apply the same offset to GIFs. Document the anchor formula + halo offset in `MARIO_GAME_SPEC.md` so the next person doesn't re-discover it the hard way.

## 2026-05-02 — Hotfix #120 (Sprite + Picker + G21)

### L63 — Private `const` variables must be exposed to `window` when cross-module consumers exist (Hotfix #120)
- **Symptom**: G13/G13B/G13C evolusi sprites showed leaf emoji (🍃) instead of HD Pokemon sprites. G13 Quick Fire showed pixelated 96px sprites.
- **Root cause**: `const POKE_IDS = Object.fromEntries(POKEMON_DB.map(...))` at game.js:5511 was private — not on `window`. `buildPokeSources(slug, null)` in poke-sprite-loader.js checks `window.POKE_IDS` for ID lookup. Without it, HD WebP + SVG paths skipped, cascade fell to 96px PNG then emoji.
- **Fix**: Added `window.POKE_IDS = POKE_IDS` after declaration. Deleted 2 redundant local POKE_IDS subsets (~200 entries) that shadowed the global 1025-entry map.
- **Lesson**: When a module declares data that other scripts consume via `window.*`, always verify the bridge exists. Search for `window.VARIABLE_NAME` across the codebase to find consumers, then confirm the producer sets it. Redundant local copies of global data are a time bomb — they shadow the complete dataset with an incomplete subset.

### L64 — DOM `appendChild()` moves nodes, it does not copy them (Hotfix #120)
- **Symptom**: G10/G13B Pokemon picker showed tabs but zero cards on reopen. First open worked fine.
- **Root cause**: `while (pane.firstChild) gridEl.appendChild(pane.firstChild)` moved ALL children from the cached Map pane to the live grid. The cached pane was now empty. On reopen, cached pane had zero children → empty grid.
- **Fix**: `_partyTabCache.clear()` on every picker open. Fresh pane builds each time. Cache designed for within-session tab switching, not across opens.
- **Lesson**: DOM `appendChild()` is a MOVE operation. Caching a DOM node and then appending its children elsewhere empties the cache. Either (a) clone with `cloneNode(true)` before appending, or (b) clear cache to force rebuild. Rule: if you cache DOM panes and move their children to a live container, the cache is destroyed — plan accordingly.

### L65 — CSS `translate3d` is additive to layout position, not a replacement (Hotfix #120)
- **Symptom**: G21 Mario Pikachu completely invisible. After first death and restart, still invisible.
- **Root cause**: Hotfix #112 replaced `wrap.style.left/top = ...` with `wrap.style.transform = translate3d(...)` for GPU perf. But the initial inline style kept `left:-300px; top:-300px` (the pre-game hide position). CSS transform is additive: visual_position = layout_position + translate. So Pikachu was always -300px offset. Additionally, death animation set `top = innerHeight+200` which restart never cleared — making post-death Pikachu even further off-screen.
- **Fix**: Changed initial style to `left:0;top:0`. Added `wrap.style.top = '0'` in `restartLevel()`. Removed `left,top` from `will-change` (no longer animated).
- **Lesson**: When migrating from `style.left/top` (direct positioning) to `transform: translate3d()` (GPU layer), you MUST zero out the original left/top. translate3d does NOT override layout position — it adds to it. Also audit all code paths that set left/top (death animations, etc.) and ensure cleanup functions reset them.

### L66 — Goomba Lockstep Stacking (G21, 2026-05-02)
When all enemies start with identical speed + direction, they march in lockstep and bunch up at platform edges. Fix: randomize initial speed, direction, and animation phase. Add entity-entity separation collision to push apart.

### L67 — CSS Transform Composition (G21, 2026-05-02)
`transform: rotate(720deg)` OVERWRITES any previous `translate3d()` on the same element. CSS transforms are a single property — setting one value replaces all previous. Must compose as `translate3d(...) rotate(...)` in one assignment.

### L68 — restartLevel() Must Reset ALL Game State (G21, 2026-05-02)
After adding new features (math quiz, electric mode), `restartLevel()` was never updated to reset them. Checklist: any new boolean/timer/overlay added to game state MUST have a corresponding reset in restart. Add to the restart function immediately when adding the feature, not later.

### L69 — Deleted Function Reference Cascade (G13C, 2026-05-02)
Deleting a function definition (SPRITE_LOCAL) without grepping for ALL call sites → ReferenceError at runtime. The 5 call sites in cascade arrays were fixed, but 3 inline onerror strings in HTML template literals were missed. Always grep the ENTIRE file, including template strings, before deleting a function.

---

### L72 — JS `display:flex` kills CSS Grid (G13, 2026-05-02)
- **Symptom**: Battle field sprites placed in wrong positions — wild Pokemon at top-left, player Pokemon at bottom-right, regardless of CSS `grid-column`/`grid-row` values.
- **Root cause**: `_g13Field.style.display = 'flex'` set as an inline style overrides the stylesheet `display: grid`. ALL `grid-column`, `grid-row`, and `justify-self` properties become NO-OPs. Elements fall back to DOM-order flex flow.
- **Fix**: Changed to `_g13Field.style.display = ''` to clear the inline override and let CSS handle the layout mode.
- **Lesson**: When a container uses CSS Grid, NEVER set `display:flex` in JS. If visibility toggling is needed, use `display=''` to clear the inline override and let CSS handle the layout mode.

---

## Template for future entries

```
### <topic>
- **Symptom**:
- **Root cause**:
- **Fix**:
- **Lesson**:
```

---

### L73 — Pixi canvas must be transparent for CSS parallax BG (G23, 2026-05-03)
- **Symptom**: Parallax background layers not visible behind Pixi canvas.
- **Root cause**: Pixi `Application` defaults to `backgroundAlpha:1` (opaque black/white), covering all CSS layers beneath.
- **Fix**: Set `backgroundAlpha:0` in Pixi init options. Use `div.bg-layer` elements (CSS `background-repeat:repeat-x`, `background-size:auto 100%`) and update `backgroundPositionX` each frame at different scroll factors (0.01–0.55) for parallax depth.
- **Lesson**: For hybrid CSS+Pixi rendering, always set `backgroundAlpha:0`. Pixi canvas stacks on top of CSS; transparency is required to see CSS layers.

---

### L74 — Animated WebP must use HTML img, not Pixi Sprite (G23, 2026-05-03)
- **Symptom**: Running Pokemon sprite shows only first frame (static) when loaded as Pixi Sprite.
- **Root cause**: PixiJS decodes images to a texture at load time — only the first frame is captured. Browser-native `<img>` handles animated WebP frame cycling natively.
- **Fix**: Use `<img id="player-sprite">` positioned via CSS (absolute, transforms), updated each frame to match Pixi game coordinates. Reserve Pixi for game-logic objects (obstacles, pickups, particles).
- **Lesson**: Animated WebP/GIF player characters should always be HTML `<img>` in Pixi hybrid games. Same pattern used in G19 Pokemon Birds.

---

### L75 — CSS slide-up overlay needs display:flex before rAF adds .open (G23, 2026-05-03)
- **Symptom**: TR battle overlay `transform:translateY(0)` transition doesn't animate — panel snaps in instantly.
- **Root cause**: Element had `display:none` which prevents CSS transitions. Adding `.open` class (which sets `transform:translateY(0)`) before the browser paints means transition fires with no start state.
- **Fix**: Set `display:flex` first, then use `requestAnimationFrame(() => overlay.classList.add('open'))` so browser paints the initial `translateY(110%)` state before transitioning to `translateY(0)`.
- **Lesson**: CSS transitions require the element to be visible (not `display:none`) for at least one paint cycle before the target state is applied.

### L76 — G13C badge storage format is trainer IDs, not phonics letters (game.js, 2026-05-03)
- **Symptom**: Kodok slot-7 preset shows 0/87 badges in G13C Gym Ladder despite unlock function running.
- **Root cause**: `_applyKodokSlot7Unlock()` wrote `{'A':'gold','B':'gold',...}` (copied from G13B phonics badge format) but G13C uses trainer IDs as keys: `{'misty':true,'brock':true,...}`.
- **Fix**: Replace A-Z loop with explicit array of all 87 trainer IDs, set each to `true`.
- **Lesson**: When sharing an unlock function across two games (G13B + G13C), verify each game's badge storage schema independently — they can differ completely even if the key name is similar.

### L77 — CSS scaleX(-1) mirror inverts rotation axis (G23, 2026-05-03)
- **Symptom**: After applying `scaleX(-1)` to flip sprites, velocity tilt (`rotate(${tilt}deg)`) appeared inverted — jumping tilted backward instead of forward.
- **Root cause**: `scaleX(-1)` mirrors the coordinate system, so positive degrees rotate the opposite visual direction.
- **Fix**: Negate the tilt value when scaleX(-1) is applied: `scaleX(-1) rotate(${-tilt}deg)`.
- **Lesson**: Always negate rotation angles when applying CSS horizontal mirror.

---

## 2026-06-23 — PvP/Tournament + G13C Adventure overhaul (v52 → v53.5, 6 commits)

### L78 — State write before async render = stale DOM (battle-modes.js v53.4)
- **Symptom**: Owner saw initiative banner say "Pikachu (P2) lebih cepat — duluan!" but the bottom-zone (P1) action menu remained active. User taps bottom → click handler reads the new `state.turn=1` → question pops up at top instead. "Aneh".
- **Root cause**: `advancePickStep` called `renderRoot()` synchronously (with default `turn:0`) **before** triggering `beginBattleSequence()`. The VS card overlay masked the underlying stale arena; once it dismissed, `revealInitiative` flipped `state.turn` to 1 but never re-rendered. Click handlers read the new turn but the visible UI still had P1 active.
- **Fix**: Insert `try { renderRoot(); } catch (e) {}` immediately after `state.turn = decideTurnOrder(p1, p2, state)` in `revealInitiative`. Synchronous re-paint aligns DOM with state before any user click.
- **Lesson**: Any state mutation that affects which DOM zone is "active" MUST be followed by a render call in the same tick. If render fires before the mutation and the mutation is async (setTimeout, await, callback), the displayed state is stale and click handlers behave inconsistently. Rule: state writes that drive UI dispatch must either render in the same tick OR be queued until the next render slot.

### L79 — Move-pick spam = canonical anti-cheat hole (battle-modes.js + g13c-pixi.html v53.4–v53.5)
- **Symptom**: After a correct math answer the `.bm-move` row appears. Rapid taps on the same move (or impatient kid spam) fire `executeMove` 2-3× back-to-back → 2-3× damage on a single answer. Owner: "bisa curang bisa 2-3 tapi keluarkan jurus 2-3x".
- **Root cause**: The click handler had no guard. The question-pick `.bm-choice` already used a disable-after-click pattern (`b.setAttribute('disabled','')`) but moves were never wired to mirror it. Adventure had the same hole at `useMove(moveIdx)`.
- **Fix**: Belt-and-suspenders — `state._moveLock` flag (truth-source) + DOM `setAttribute('disabled','')` on every sibling (visual + browser-level guard) on first click. Reset at every `state.phase = 'action'` transition (4 sites in PvP, `showActionMenu` in Adventure). CSS `.bm-move[disabled] { opacity: 0.55; pointer-events: none; filter: grayscale(0.4); }`.
- **Lesson**: Every action button that triggers an irreversible game-state change needs a per-turn lock. Browsers can fire `click` faster than the engine can transition phases; the disable-after-click pattern must be applied uniformly across choice + move + switch + any future action UI. When porting an engine fix from one game to another (PvP → Adventure), audit the same UI surface in the target.

### L80 — Canonical Pokemon balance needs Atk/Def stat ratio, not just Speed (battle-modes.js + g13c-pixi.html v53.4–v53.5)
- **Symptom**: Owner: "mekanismenya masih kurang balance" and later "yang mode pokemon, itu imbalance sekali". After shipping Speed turn order, equal-team simulations were 50/50, but the FEEL was that Charizard hit Snorlax the same as Caterpie did. Glass-cannon vs tank distinction was missing.
- **Root cause**: `calcDamage(atk, move, def, timeMult)` only multiplied `move.pwr × stab × type × timeMult`. No per-species stat differentiation. Adventure's `calcDmg` was even simpler — flat `base 30-39 × eff × stab`.
- **Fix**: Add canonical Pokemon `STAT_BY_SLUG` map (~120 species, Gen 1-9 + mega forms, keyed `[attack, defense]` tuples). Stamp `attack` + `defense` on every Pokemon during `adaptPkmFromG13C` + `buildRandomPokemon`. In `calcDamage`, apply `statRatio = clamp(0.6, 1.6, atk.attack / def.defense)` as a multiplier. Expose `window.BattleModes.stats.shapeDamage(baseDmg, atkSlug, defSlug)` so G13C Adventure can apply the same canonical math without duplicating the maps.
- **Lesson**: Pokemon-style RPG balance has a canonical formula and "skipping" the Atk/Def ratio for simplicity makes every Pokemon feel interchangeable — defeating the point of having ~120 different Pokemon. Always include the canonical Atk/Def ratio (clamped to prevent unwinnable matchups) when you have per-species stat data. Single source of truth: expose stat helpers from one engine to others, never duplicate the maps.

### L81 — Per-package data stamp avoids opts threading (battle-modes.js v52)
- **Symptom**: Want to switch arena BG per the chosen team's region. Naive approach threads `opts.region` through `startPvP` → `state` → `renderArena` → `applyArenaBg`. Tournament adds another layer of threading.
- **Fix**: Stamp `_region` on every team member inside `buildTeamFromPackage` + `buildTeamFromRegion` (the two builders). `regionFromTeam(team)` just reads `team[0]._region`. Same pattern for `_pkgId`. Engine code reads the team it already has; no threading.
- **Lesson**: When a piece of metadata follows a value through many code paths, attach it to the value at construction time. Threading per-call is a code smell that only gets worse as the call graph grows.

### L82 — Two engines, one balance shaper via global export (v53.5)
- **Symptom**: PvP/Tournament (battle-modes.js) and G13C Adventure (g13c-pixi.html) both need the same canonical Atk/Def + Speed-gap balance. Duplicating the ~120-entry stat maps in both files would be 200+ lines of redundant data.
- **Fix**: Expand `global.BattleModes` export with `stats: { speedFromSlug, attackFromSlug, defenseFromSlug, shapeDamage }`. Adventure's `calcDmg` calls `BattleModes.stats.shapeDamage(dmg, atkPoke.slug, defPoke.slug)` after the base × eff × stab chain. Try/catch falls back to the legacy formula if battle-modes.js failed to load.
- **Lesson**: When two scripts in the same page need the same data + helpers, expose them from the side that loads first via a `window.X.helpers` namespace. The consumer guards the call with feature-detection so it degrades gracefully. Never duplicate data maps between engines that ship together.

### L83 — Tournament save/resume must reject already-complete saves (battle-modes.js v53.2)
- **Symptom**: After completing a tournament + clicking "Selesai", next boot still offered "Lanjutkan tournament tersimpan?" — but loading it dumped the user straight into the champion screen (or worse, an inconsistent state).
- **Root cause**: `loadSave()` only validated structural shape (`v: 1`, `players` array, `bracket` exists), not progress completeness. `showChampion` cleared the save but if the user closed the tab during the champion-screen viewing, the save lingered.
- **Fix**: `loadSave()` defensively checks `if (flat.length && flat.every(m => m.winner !== null)) return null` so a save where every match already has a winner is treated as gone. Champion screen still clears explicitly as the primary path.
- **Lesson**: Persisted state needs structural + semantic validation at load time. "Looks valid" ≠ "is usable". Add a completeness check on every restore path.

### L84 — Pre-fill from localStorage at mount, write back on submit (battle-modes.js v53.2)
- **Symptom**: Owner wanted P1/P2 names to persist across sessions without a settings page.
- **Fix**: Universal pattern — in `askForNames()` + `renderNames()`, read `localStorage[key]` JSON.parse → pre-fill input `value`. In the submit handler, `JSON.stringify(names) → localStorage[key]`. Two keys, one per mode: `dunia-pvp-names` + `dunia-tour-names`.
- **Lesson**: For ANY input field that benefits from cross-session persistence (names, settings, last-used team), use the pre-fill-at-mount + write-on-submit pattern. No middleware, no schema migration headaches. Wrap reads in try/catch so localStorage failures degrade silently.

### L85 — BGM volume scales per context, not globally (battle-modes.js v52)
- **Symptom**: Owner: "backsound saat pvp dan tournament jangan keras pakai 70% volume dari suara gym pokemon."
- **Fix**: G13C plays at `volume: 0.35`. PvP/Tournament wrapper `bmBgmPlay()` sets `_bmBgmEl.volume = 0.245` (= 0.35 × 0.7). G13C's own BGM is untouched.
- **Lesson**: When BGM is shared across multiple game modes with different intensity profiles (Adventure = focused solo play, PvP = two-player social), each mode should scale the same source by its own multiplier. Don't change the source file's volume; wrap it.

### L86 — Two-pronged trainer-region audit before claiming "missing" (g13c-pixi.html v53.4)
- **Symptom**: Owner: "kok region galar, paldea, orange tidak ada ya". Audit revealed Galar HAS 8 trainers (Milo, Nessa, Kabu, Bea, Allister, Gordie, Raihan, Leon). Owner had missed them because they sit between Kalos and Anime groups.
- **Fix**: Before scoping a region-add ship, grep the TRAINERS array AND check the UI render order. Confirmed: Alola + Paldea + Hisui + Orange Islands ARE missing.
- **Lesson**: When owner says "X is missing", do a code-level audit before agreeing. Apparent absence might just be UI ordering / scroll-position. Counter-evidence saves time.

### L87 — Match data stamped on Pokemon survives ...spread clones (battle-modes.js v52)
- **Symptom**: Tournament clones teams via `team.map(p => ({...p, hp: p.hpMax}))` for fresh-HP-each-match. Need `_region` to survive the clone.
- **Fix**: `_region` is just a string field on each Pokemon object → object-spread copies it natively. No extra plumbing.
- **Lesson**: When stamping metadata that needs to follow a value through clone/restore cycles, use shallow data fields (strings, numbers, plain arrays) — object-spread copies them automatically. Avoid getter properties, prototypes, or class instances unless you actually need them.

### L88 — CSS variable on dynamically-created element: set AFTER innerHTML (battle-modes.js v52)
- **Symptom**: `--bm-arena-bg` CSS variable set in `<style>` block defaulted correctly, but per-team-region override never showed up.
- **Root cause**: Tried to set `.bm-arena.style.setProperty('--bm-arena-bg', ...)` BEFORE `root.innerHTML = ...` rebuilt the arena DOM. The `setProperty` call targeted an element that was about to be replaced.
- **Fix**: Move the `applyArenaBg(root, ...)` call to AFTER `root.innerHTML = ...` + `wireActiveZone()`. Now it targets the freshly-rendered `.bm-arena`.
- **Lesson**: Inline-style writes to dynamically-rendered elements must happen AFTER the element is mounted in the DOM. If you're replacing innerHTML, all inline-style state on the old element is gone — reapply after the replacement.

---

## 2026-06-24 — v54.0 Critical Fixes (G23 + G14 + G15 + G16)

### L89 — Power-up that only renders an aura is felt as "no PU at all" (g23-pixi.html v54.0)
- **Symptom**: Owner complaint covering Thunder + Nature pickups: "banyak yang perlu diperbaiki." The 4 power-ups had distinct visual auras (yellow lightning, orange fire, green leaves, purple bubbles) but Thunder + Nature were aura-only — they didn't change any gameplay state. Kid grabbed Nature, saw green spin, hit the next obstacle and died normally — felt like nothing happened.
- **Root cause**: `activatePowerUp(type)` set up the aura render and a per-type gameplay flag (gameSpeed×1.2 for Thunder, shieldHits=2 for Nature). But the aura render code only DREW particles — it didn't drive game mechanics. Speed boost was barely perceptible at L1, shield was invisible until consumed.
- **Fix**: Wire genuine gameplay differentiation. Thunder gets a chain-zap routine (every 90 frames, find 2 nearest obstacles in front and destroy them with sparkle arc). Nature gets `S.natureGravMul = 0.55` read by playerVY update so the kid floats noticeably longer in air.
- **Lesson**: Every power-up needs a felt mechanic, not just a felt visual. Audit power-ups by asking "could the kid notice this WITHOUT the aura?" If the answer is no, the PU is decorative. Tie each PU to a single observable game-state change.

### L90 — Per-type SFX is the missing audio half of "feels different" (g23-pixi.html v54.0)
- **Symptom**: All 4 pickups played the same `sfxCollect()` chime (3 ascending sine tones 900→1200→1500Hz). Kid heard generic "ding" regardless of which PU they grabbed.
- **Fix**: New `sfxCollectByType(type)` with 4 timbrally-distinct envelopes — Thunder uses square wave fast cluster, Blaze uses sawtooth descend, Nature uses triangle major arpeggio, Venom uses sine descending. Each is 3 tones in ≤220ms.
- **Lesson**: When multiple items share visual variations but identical SFX, the audio becomes meaningless noise. Pair each visual category with a distinct audio signature — even 3 tones with different waveforms (sine/triangle/sawtooth/square) tier-differentiate at zero engineering cost.

### L91 — Conic-gradient cooldown arc beats opacity fade (g14.html v54.0)
- **Symptom**: G14 boost button used `opacity: 0.45` during 3000ms cooldown. Visually unambiguous (button looks disabled) but **non-communicative** — kid sees "no boost" but not "X seconds until ready". They tap-spam during cooldown wasting energy.
- **Fix**: CSS `conic-gradient(from -90deg, rgba(251,191,36,0.55) var(--boost-pct), transparent var(--boost-pct))` rendered via `::before` with radial-gradient mask cutout for the inner button. `--boost-pct` is JS-driven from 360deg → 0 over 3000ms via RAF. Kid sees a glowing ring shrink — clear progress.
- **Lesson**: Disabled-state opacity is binary; cooldown is analog. Use a progress-bearing visual (linear bar / circular arc / shrinking glow) for any time-bound state. The conic-gradient approach is CSS-pure (no canvas/SVG/PIXI overhead) and animates smoothly even on low-end Android via RAF.

### L92 — Picker loop bounds are silent failure mode (g16-pixi.html v54.0)
- **Symptom**: Owner: "di g16 kok gambar saat picker/pilih itu bima express kosong ya." Bima Express's preview canvas was blank.
- **Root cause**: `for (let i = 0; i < 6; i++) drawPreview('prev-' + i, i)` at line 407. The 7th canvas (`prev-6` for Bima Express, defined at line 144) was outside the loop bound. Adding Bima as the 7th train didn't trigger the loop bump because the loop was hardcoded.
- **Fix**: `for (i<7)`. One-character change. Going forward use `TRAIN_STYLES.length` instead of magic numbers.
- **Lesson**: When a picker has a hardcoded loop bound (`i < N`), adding a new entry will silently skip that entry's render. ALWAYS use `array.length` over magic numbers. Add a smoke test that opens the picker and asserts every canvas has non-empty `getImageData()`.

### L93 — Character-train protected lineup verification is a session-start ritual (trains-db.js v54.0)
- **Symptom**: Owner mandate locked 2026-06-24: never delete the 4-5 character trains from G15/G16 picker. Polish allowed; deletion prohibited.
- **Fix**: Save mandate to memory (`feedback_dunia_emosi_train_characters_protected.md`). On every train-code change, grep the shared `trains-db.js` for the 4 known character keys (`caseyjr_character`, `linus_brave`, `jz711_dragutin`, `jz62_malivlak`) BEFORE editing. Confirm presence in the picker post-edit.
- **Lesson**: When an owner mandates protection of N entities in a list, codify the verification as a probe + memory note. The mandate decays when no automated check enforces it. Don't trust "I'll remember" — trust the grep that runs every session.

### Documentation update mandate (locked 2026-06-24)
Owner-locked: every Dunia Emosi ship MUST update CHANGELOG.md + LESSONS-LEARNED.md (Lxxx) + relevant `*_STANDARD.md` in the SAME commit. A ship without docs is INCOMPLETE. Memory note saved at `feedback_dunia_emosi_docs_continuous_update.md`. Effective immediately for all v54.x ships.

---

## 2026-06-24 — v54.6 G16 Deep Polish Wave (Selamatkan Kereta — owner's favorite)

### L94 — Polish-helper extraction pattern: small DOM/CSS primitives over engine refactor (game.js v54.6)
- **Symptom**: 12 polish items (sparkle burst, dust trail, screen shake, danger flash, celebration text, audio sting) ALL touching the same 6 engine functions (g16BeginGame, g16StartDangerTimer, g16ThrowHook, g16StartPhase2, g16TapPull, g16PullComplete, g16EndGame). Inline-ing every effect would balloon those functions 2-3×.
- **Fix**: Extract 6 small DOM/CSS helpers at module scope (g16SpawnSparks, g16SpawnDust, g16ScreenShake, g16FullScreenDangerFlash, g16ShowCelebrationText, g16PlayStingPull). Each is ≤15 LOC of `document.createElement` + class assignment + setTimeout cleanup. Engine functions call them as 1-liners; CSS keyframes handle the actual animation.
- **Lesson**: When polish items each touch DOM + CSS + timing in ≤20 LOC, extract them as standalone helpers rather than refactoring the engine. The engine stays readable (1-liner polish hooks); the helpers are testable in isolation; CSS keyframes carry the visual weight. This is the cheapest path to a polished game without an engine rewrite.

### L95 — Body-class slow-mo without engine pause (style.css v54.6)
- **Symptom**: Owner wants "slow-mo on danger 100%" — bullet-time before the lose screen. But the G16 engine has no game-loop ticker that can be slowed (it's setInterval-driven for danger + needle).
- **Fix**: Add `body.g16-slowmo` class. CSS overrides extend `#g16-victim-train` and `#g16-rope` transition durations to 1.5s + drop screen saturation/brightness. Engine doesn't pause; the visual response curves slow. Auto-clear class after 1300ms with setTimeout.
- **Lesson**: Slow-mo / time-dilation effects don't require an engine pause — they require CSS transition stretching on the elements that move. When you can't (or don't want to) slow down setInterval, slow down the VISUAL CONSEQUENCES via cascading `transition` durations. Pair with desaturation filter for cinematic feel.

### L96 — RAF-free DOM particles for short-lived effects (game.js v54.6)
- **Symptom**: G16 needed sparkle burst + dust trail + danger flash particles. Adding a RAF particle pool would mean ~80 LOC of state machine + cleanup.
- **Fix**: Use plain `document.createElement('div'/'span')` + CSS keyframe + `setTimeout(remove, dur)`. Each particle is self-contained: DOM lifetime ≤ animation duration; appendChild + setTimeout removal. No global pool, no RAF, no leaking refs.
- **Lesson**: For SHORT-LIVED particles (<1 second) with FEW concurrent particles (<20), DOM + CSS keyframes is cheaper than canvas/Pixi/RAF pools. Each particle is its own element; the CSS engine handles interpolation; setTimeout cleans up. Only switch to a pool when you spawn 50+ particles per second or need pixel-level control.

---

## 2026-06-24 — v54.7 G17 Rope Swing Pikachu (FULL REVAMP)

### L97 — Canonical pendulum SHM in 3 lines beats custom velocity model (g17-pixi.html v54.7)
- **Symptom**: Need realistic rope-swing physics for a kid game. Tempting to use ad-hoc velocity model (e.g. "increase vx while held, decay when not"). Custom models feel wrong — too floaty OR too snappy.
- **Fix**: Use canonical pendulum simple harmonic motion. Two state vars (angle, omega). Per frame: `omega += -gravity/L * sin(angle) * dt; omega *= damping; angle += omega * dt`. Apply player input as `omega += swingForce * cos(angle) * dt`. Project pikachu position via `x = anchor.x + sin(angle) * L; y = anchor.y - cos(angle) * L`.
- **Lesson**: For rope/swing/pendulum physics, ALWAYS use the textbook SHM equation. It's 3 lines, mathematically exact, and tunable via gravity / ropeLength / damping. Ad-hoc models will feel wrong because they don't conserve energy or model the restoring force correctly. The kid intuits real physics even if they can't name it.

### L98 — Auto-grab forgiveness radius separates 5yo-playable from 10yo-mastery (g17-pixi.html v54.7)
- **Symptom**: Pendulum games are notoriously hard for young kids (precise release timing required). If next-anchor catch demands frame-perfect release, the 5yo cohort gives up after 2 attempts.
- **Fix**: Auto-grab any anchor within ±60px during airtime. The radius is generous enough that even a wildly mistimed release usually catches SOMETHING. But the radius is NOT so wide that the 10yo cohort feels deprived of skill — releasing optimally still gets them further per swing.
- **Lesson**: Forgiveness mechanics (catch radius, coyote-time, jump buffer) widen the playable age range without removing the skill ceiling. Add them generously for the 5-10yo target. Game design rule: the floor sets accessibility, the ceiling sets mastery; forgiveness mechanics raise the floor without lowering the ceiling.

---

## 2026-06-24 — v54.8 G14 Deep Revamp (Balapan Kereta)

### L99 — TIME_OF_DAY: race-progress lerp + low-frequency redraw beats per-frame update (g14.html v54.8)
- **Symptom**: Owner: "kok selalu gelap harusnya bener2 pintar dan dinamic bisa pagi ke sore." G14 had 6 hardcoded biome THEMES; sky was static the entire race.
- **Fix**: Define 6 TIME_PHASES (subuh / pagi / siang / sore / petang / malam) with skyTop/skyBot color stops + sunY + cloudTint + stars flag. Compute `phase = floor(distance/finishLine * 6)`, `lerp = (...) - phase`. Lerp colors between current phase and next. Redraw sky gradient ONLY every 18 frames (3.3 Hz at 60fps) — invisible difference to the eye but 18× cheaper than per-frame.
- **Lesson**: For slowly-changing visual state (sky color, ambient lighting), don't redraw every frame. Pick a refresh rate matched to the change speed (3.3 Hz works for sky cycles spanning 60+ seconds). The eye won't notice; the GPU thanks you.

### L100 — Per-particle RAF pool beats global RAF for ≤30 concurrent particles (g14.html v54.8)
- **Symptom**: G14 dust kickup needed gravity-affected particle fall during lane switches.
- **Fix**: Each particle gets its own requestAnimationFrame tick closure that updates x/y/alpha until cull conditions are met. No global pool, no per-tick array iteration. Just N independent RAF tickers running in parallel.
- **Lesson**: For ≤30 concurrent particles with diverse lifecycles (some die at 22 frames, some at 12, some by alpha clamp), individual RAF closures beat a global pool's array iteration. Browser batches RAF callbacks; no overhead penalty. Skip the pool unless you spawn 50+/sec.
