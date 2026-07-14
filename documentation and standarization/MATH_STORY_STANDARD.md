# MATH STORY STANDARD — story mode for "Matematika Petualangan" (G25)

> Design + data contract for `games/data/math-stories.js` (`window.MATH_STORIES`).
> Companion to `MATH_ADVENTURE_STANDARD.md`. This doc covers the story/literacy
> layer only; the math engine and screen flow are unchanged.

---

## 1. Goal — math **and** reading

Owner request (P3d): every level-monster gets an Indonesian **name**, and on each
attack a **speech cloud** appears from the hero **and** the monster (alternating),
building a unique, well-written per-level story to the end — so the child learns
**math** (the answer-sprint battle) **and** **reading** (the unfolding narrative).

The narrative is:
- **Kid-safe** — friendly-not-scary monsters; no violence, fear, or sad endings.
- **Warm and encouraging** — every arc ends in friendship / a lesson learned.
- **Value-bearing** — each world teaches one value (keberanian, kebaikan,
  kesabaran, …). See the world table below.
- **Natural Indonesian for ages ~5–9** — short sentences, everyday words, no lorem.

---

## 2. Data schema — `window.MATH_STORIES`

Pure ES5 data file (`var` / IIFE / no arrow / no `const`), guarded by
`if(window.MATH_STORIES) return;` so it is idempotent. Loaded via a normal
`<script src="data/math-stories.js?v=…">` tag (wiring is a separate step).

```
window.MATH_STORIES = {
  WORLDS: 10,
  LEVELS: 10,                 // sub-levels per world
  themes: [ {name, place, value}, … ],   // 10 world themes (1-based)
  monsterPool: [ "Si Guruh", … ],        // ~70 curated kid-safe names
  hand: { 1:{1:{…},…}, 2:{…}, 3:{…} },   // hand-authored worlds 1–3
  get:        function(world, level){…}, // 1-based → level arc (never empty)
  getByGlobal:function(g){…}             // flat 1..100 → level arc
}
```

### Level arc object (what `get()` returns)

| Field | Type | Meaning |
|---|---|---|
| `monster` | string | Curated kid-safe Indonesian monster **name** (unique, friendly). |
| `intro` | string | 1 short sentence — hero meets monster, sets the scene. |
| `banter` | array | 4–8 alternating lines `{who:'hero'\|'monster', text:'…'}` — the arc. |
| `victory` | string | 1 celebratory closing line — hero wins, monster becomes a friend. |
| `_generated` | bool | Present + `true` only on generator output (worlds 4–10 / fallbacks). |

`banter` is a tiny narrative: **challenge → back-and-forth → turning point →
friendship**. It always starts with the monster and alternates strictly.

### Coverage

- **Worlds 1–3 (30 levels): hand-authored**, richly, one bespoke arc per level.
- **Worlds 4–10 (70 levels): generated** by a deterministic, seeded template
  (`genLevel`) that draws a unique monster from `monsterPool`, matches the
  world's value, and varies the challenge/mid/turn lines by a stable seed.
  Output is real readable Indonesian, unique per level — not lorem.
- `get()` / `getByGlobal()` **never return empty**: any world/level not
  hand-authored falls through to the generator. Every one of the 100 levels
  therefore always has a name + intro + banter + victory.

---

## 3. World themes + monster-name curation

`world` is 1-based and equals the game's `curWorld`. Global level
`g = (world-1)*10 + level`.

| World | Theme (`name`) | Value taught |
|---|---|---|
| 1 | Hutan Ceria | keberanian |
| 2 | Padang Bunga | kebaikan |
| 3 | Gua Kristal | kesabaran |
| 4 | Sungai Riang | kerja sama |
| 5 | Bukit Awan | kepercayaan diri |
| 6 | Gurun Emas | ketekunan |
| 7 | Pantai Mutiara | kejujuran |
| 8 | Negeri Salju | ketenangan |
| 9 | Gunung Api | pantang menyerah |
| 10 | Istana Bintang (Raja Iblis) | kebijaksanaan |

**Monster-name curation rule.** Names come from `MONSTER_POOL` (~70 entries).
Rules for any addition:
- Friendly-not-scary. Titles like *Si / Nini / Nyai / Datuk / Pak / Puti / Bang /
  Ki / Raja* + a soft nature word (kabut, embun, lumut, kunang, pelangi…).
- No blood, death, weapons, or genuinely frightening imagery.
- The generator guarantees **no within-world duplicate names** (verified: 0
  duplicates across all 10 worlds). Hand-authored worlds pick their own names in
  the same spirit; a hand-authored slot may reuse a pool name — that is fine.

---

## 4. UX — the alternating hero/monster speech clouds

Where and when the clouds render over the existing battle (`#scr-game`):

- **On level start** — after the `Siap? 3 2 1 Mulai!` intro overlay clears, show
  the `intro` sentence once (a single narration cloud), then reveal `banter[0]`
  (always the monster's opening challenge) above the monster.
- **On each attack / answer** — advance the story by one `banter` line, alternating:
  - **Correct answer → `heroAttack()`** fires: show the next **hero** line as a
    speech cloud rising from the knight (`#fh-hero`).
  - **Monster's turn / wrong answer → `foeAttack()`** context: show the next
    **monster** line as a cloud from the foe (`#fh-foe`).
  - Because `banter` strictly alternates monster→hero→monster→…, stepping one
    line per answered question keeps the two sides talking in turn.
- **On defeat of the monster** (`foeLeft === 0`, or on the results screen) — show
  the `victory` line as the closing cloud, then transition to `#scr-hasil`.

Pacing guidance for the wiring step:
- One `banter` line per **question answered** (not per correct answer only), so
  the arc reaches its turning point regardless of a few misses. If there are more
  questions than banter lines, hold the last line (or repeat the mid line); if
  fewer, the turning-point + friendship lines can be shown together at the end.
- Speech clouds must not cover the `qcard` / answer choices. Anchor hero clouds
  to the hero's upper-left, monster clouds to the foe's upper-right, above the
  `.arena`, below the HUD. Auto-dismiss after ~2.4 s or on the next answer.
- Honour `prefers-reduced-motion` (no bounce; simple fade) and the existing
  landscape squeeze media queries — clouds shrink with the arena.
- Also replace the placeholder `foe-name` (`👾 Monster W-S`) with the story
  `monster` name so the HUD label reads, e.g., `👾 Si Guruh`.

**Tone/safety rules for clouds:** short lines (already ≤ ~60 chars), warm,
encouraging, never mocking the child; a wrong answer never triggers a taunt —
the monster stays kind. Text is `textContent` (never `innerHTML`) to avoid any
injection from the data.

---

## 5. How the game should consume `MATH_STORIES.get()` (wiring — later step)

This file is **data + design only**. The game (`games/kuis-matematika.html`) is
NOT edited here. When wiring later:

```js
// at startGame(): resolve the arc for the current level
var arc = window.MATH_STORIES && window.MATH_STORIES.get(curWorld, curSub);
// or, from the flat global level g:
//   arc = window.MATH_STORIES.getByGlobal(g);
if(arc){
  set('foe-name','👾 '+arc.monster);          // replace placeholder label
  // show arc.intro once after the countdown, then step arc.banter[] per answer,
  // and show arc.victory on monster defeat / results.
}
```

Guard every access (`window.MATH_STORIES && …`) so the game still runs if the
data file fails to load — the existing placeholder monster label is a safe
fallback. Bump the `?v=` cache-bust on the new `<script>` tag and `sw.js`
precache list when wiring ships.

---

## 6. Verification

- `node --check games/data/math-stories.js` must pass.
- Invariants (spot-checked): 10 worlds × 10 levels = 100 arcs; worlds 1–3
  hand-authored (30), worlds 4–10 generated (70); `get()`/`getByGlobal()` never
  return empty; no within-world duplicate monster names; every `banter` starts
  with a `monster` line and strictly alternates.
- When adding hand-authored worlds later, keep the file under ~1500 lines and
  re-run `node --check`.
