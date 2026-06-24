# Pokemon Battle Balance Standard

**Status**: Active (v54.30 — 2026-06-24 hard-cap pass on top of v53.0 → v53.5 canonical formula)
**Engines covered**: PvP / Tournament (`games/data/battle-modes.js`) + G13C Adventure (`games/g13c-pixi.html`)
**Shared data**: `SPEED_BY_SLUG`, `STAT_BY_SLUG`, `decideTurnOrder`, `shapeDamage` — all live in `battle-modes.js` and re-exposed via `window.BattleModes.stats` for Adventure to consume.

---

## Purpose

Make Pokemon choices MEANINGFUL across all battle modes by applying canonical Pokemon damage scaling. A 5-year-old picking Charizard should feel the difference from picking Caterpie — both in offence (Charizard hits harder) and defence (Snorlax tanks more). Without this layer every Pokemon felt interchangeable, which defeats the point of having ~120 different species.

Owner's actual words during the v53 series:
- "yang dapat giliran pertama itu diuntungkan secara matematika. sempurnakan konsepnya agar bisa balance."
- "mekanismenya masih kurang balance"
- "harus ada suatu koefisien pengali tambahan utk variable balancer atau suatu standard /popular method"
- "yang mode pokemon, itu imbalance sekali"

---

## The Canonical Damage Formula (v54.30 hard-capped)

```
raw      = floor(
    move.pwr               // base move power (PvP) OR 30-39 random (Adventure)
  * stab                   // 1.25 if move.type === attacker.type else 1.0
  * typeMult               // 0 / 0.5 / 1.0 / 1.2 (cap from TYPE_CHART)
  * timeMult               // PvP only: 1.0 to 1.20 from answer speed  (v54.30: was 1.40)
  * statRatio              // clamp(0.75, 1.35, atk.attack / def.defense)  (v54.30: was 0.6, 1.6)
  * speedMod               // 1.10 if Δspd ≥ +30, 0.95 if Δspd ≤ -30, else 1.0
)
cap      = floor(defender.hpMax * 0.40)   // v54.30 (CRITICAL): per-hit floor on the 1st hit
finalDmg = max(1, min(raw, cap))
```

### Per-hit damage cap (v54.30, CRITICAL)

A fresh defender ALWAYS survives the first hit. Cap = 40% of `defender.hpMax`, so:

| Defender tier | hpMax | Per-hit cap |
|---|---|---|
| Random region (raised) | 95  | 38 |
| Package base           | 90  | 36 |
| Package final          | 110 | 44 |
| Package mega / legend  | 125-130 | 50-52 |

Glass-cannons still hit harder against frail targets; tanks still absorb more (their LARGER hpMax raises the cap). The cap only fires when the raw stack EXCEEDS 40% — for typical matchups (raw 25-40) it never fires.

**Why 0.40, not 0.50**: at 40% per hit, every Pokémon gets 3 meaningful decision points before the KO (100% → 60% → 20% → KO). Each decision is a swap/attack/accept-defeat moment. At 50% it would only be 2 decisions, which feels too quick for a kids' game; at 30% it would feel too slow.

### Why the product matters (the failure that prompted v54.30)

Owner reported a 6-0 wipe via screenshot (2026-06-24): Malamar (Acak Kalos, default 70/70) facing Hoenn Starter base team (Ralts def 25, Poochyena def 35). Pre-v54.30 the worst-case stack was:

```
34 × 1.25 × 1.20 × 1.40 × 1.60 × 1.10 = 125.6  →  one-shots ALL hp 80-110
```

Each layer's cap is defensible. The PRODUCT of caps wasn't checked against the smallest HP bucket. **L163** captures the lesson: when designing multi-layer formulas, write the worst-case product NEXT TO the smallest target HP and clamp the product itself.

### PvP HP-floor (v54.30)

Every Pokemon in PvP/Tournament has hpMax ≥ 95. Applied by `applyPvPHpFloor(team)` in three sites:
- `startPvP` initial state build (`battle-modes.js:~1871`)
- After package-card click (`~2128`)
- After random-region pick (`~2140`)

Random-region teams now build at 95 HP from the start (was 80). Package teams at HP 90 base / 110 final / 125-130 mega keep their original HP — only the rare sub-95 case is lifted.

### Random-region legendary blocklist (v54.30)

`buildTeamFromRegion` filters out 30 box-legend + Ultra Beast IDs so 🎲 Acak rolls never produce wipe-teams:

```js
const _LEGEND_BLOCKLIST = new Set([
  150, 249, 250, 382, 383, 384, 483, 484, 487,
  643, 644, 646, 716, 717, 718, 785, 786, 787, 788,
  791, 792, 800, 793, 794, 795, 796, 797, 798, 799,
  803, 804, 805, 806, 888, 889, 890,
  898, 1005, 1006, 1020
]);
```

Players still get legendaries via the per-region `Legendaris-…` packages.

### Layer rationale

| Layer | Range | Why it exists |
|---|---|---|
| `move.pwr` / base | 18-34 (PvP), 30-39 random (Adv) | Per-move flavour (weak vs strong moves) |
| `stab` | 1.0 or 1.25 | Reward using moves of own type — canonical Pokemon |
| `typeMult` | 0, 0.5, 1.0, 1.5, 2.0 | Type effectiveness chart (already taught via game) |
| `timeMult` | 1.0 to 1.4 | Reward fast answers without snowballing (PvP only) |
| `statRatio` | 0.6 to 1.6 | **Per-species offence vs defence flavour** — the heaviest lever |
| `speedMod` | 0.95, 1.0, 1.10 | **Speed matters every turn**, not just at initiative |

The **statRatio clamp** [0.6, 1.6] is critical:
- Glass-cannon Pokemon (high Atk, low Def) hit harder but take more.
- Tank Pokemon (low Atk, high Def) hit softer but absorb more.
- Even an extreme matchup (Charizard 84 atk vs Shuckle 230 def → ratio 0.36 → clamped to 0.6) never becomes unwinnable. Match always concludes in a reasonable number of hits.

The **speedMod ±10% / ±5%** is intentionally lighter than statRatio so Speed remains a secondary lever after Atk/Def. The primary Speed effect lives in `decideTurnOrder` (who attacks first).

---

## The Single Source of Truth

`battle-modes.js` owns these data maps and helpers:

```js
const SPEED_BY_SLUG = { pikachu: 90, charizard: 100, snorlax: 30, ... };
const STAT_BY_SLUG  = { pikachu: [55, 40], charizard: [84, 78], snorlax: [110, 65], ... };

function speedFromSlug (slug)   { /* return SPEED_BY_SLUG[slug] || 70 */ }
function attackFromSlug (slug)  { /* return STAT_BY_SLUG[slug]?.[0] || 70 */ }
function defenseFromSlug (slug) { /* return STAT_BY_SLUG[slug]?.[1] || 70 */ }

// Adventure-facing shaper (exposed via window.BattleModes.stats):
function shapeDamage (baseDmg, atkSlug, defSlug) {
  const statRatio = clamp(0.6, 1.6, attackFromSlug(atkSlug) / defenseFromSlug(defSlug));
  const aSpd = speedFromSlug(atkSlug), dSpd = speedFromSlug(defSlug);
  let spdMod = 1.0;
  if (aSpd >= dSpd + 30) spdMod = 1.10;
  else if (aSpd <= dSpd - 30) spdMod = 0.95;
  return max(1, round(baseDmg * statRatio * spdMod));
}
```

PvP/Tournament path: `calcDamage(atk, move, def, timeMult)` reads `atk.attack/defense/speed` (stamped at build time by `adaptPkmFromG13C` + `buildRandomPokemon`). Stat ratio and Speed gap applied inline.

Adventure path: `calcDmg(moveType, atkPoke, defPoke)` in `g13c-pixi.html` computes base × eff × stab, then wraps through `BattleModes.stats.shapeDamage(dmg, atkPoke.slug, defPoke.slug)`. The slug-keyed lookup avoids duplicating the maps inside `g13c-pixi.html` (which is HTML+JS inline).

### Why slug-keyed (not stamped on every Pokemon)

Adventure trainer data is dense (78+ trainers × 6 Pokemon × inline data). Adding `attack`/`defense` fields per entry doubles the data file size for no semantic gain — the canonical stat IS slug-derivable. PvP/Tournament stamps the fields because the Pokemon objects get cloned + mutated extensively (HP changes per match), and you don't want repeated lookups in hot paths.

---

## Coverage: SPEED_BY_SLUG + STAT_BY_SLUG

Both maps cover ~120 species hand-picked for ≥95% hit rate against actual game content:

- **All Gen 1 starters + finals + mega forms** (Bulbasaur → Mega Charizard X/Y)
- **All Gen 1 commons in POKE_PACKAGES + G13C TRAINERS** (Pidgey, Caterpie, Pikachu line, Eevee + all 8 evolutions, Snorlax, etc.)
- **All Kanto legendaries** (Articuno, Zapdos, Moltres, Mewtwo + mega, Mew)
- **All Gen 2 starters + finals + popular Eeveelutions** (Cyndaquil → Typhlosion, Pichu, Espeon, Umbreon, Lugia, Ho-Oh)
- **All Gen 3-9 starters + final evolutions** (Treecko, Torchic, Mudkip → Sceptile, Blaziken, Swampert; through Sprigatito → Meowscarada)
- **Selected mega forms**: Gardevoir, Lucario, Gengar, Mewtwo X/Y

Unknown slug → defaults to **70** for all three stats (neutral). The fallback keeps the engine working when a new Pokemon is added before the map is updated; the audit catches it at session-end review.

### When to add a slug to the maps

Add when:
- A new region expansion lands (e.g. v53.4 Alola + Paldea — most species like Decidueye, Cinderace, Meowscarada are ALREADY in the map because Gen 7/8/9 starters were pre-populated)
- A trainer team includes a previously-unmapped legendary or signature Pokemon
- A package in `poke-packages.js` features a new species

Test:
```js
// In browser console, after a battle starts:
window.BattleModes.stats.attackFromSlug('your-new-slug');  // should NOT be 70 (default)
```

---

## Move-spam Anti-Cheat (universal pattern)

Every action button that triggers an irreversible state change needs a per-turn lock. The pattern is uniform across engines:

```js
// 1. On button click — guard + lock + visual disable
if (state._moveLock) return;
state._moveLock = true;
document.querySelectorAll('.move-btn').forEach(b => b.setAttribute('disabled',''));
executeMove(...);

// 2. Reset at every fresh action-phase transition
function showActionMenu () {
  state._moveLock = false;
  // ... rest of action menu render ...
}
```

PvP/Tournament: lock = `state._moveLock`. Reset at 4 sites (turn pass, forced switch, voluntary switch, defender switch-after-KO).
Adventure: lock = `battle._moveLock`. Reset at `showActionMenu()`.

CSS belt-and-suspenders: `.bm-move[disabled] { opacity: 0.55; pointer-events: none; filter: grayscale(0.4); }`.

---

## Switch-Fairness Rule (v54.18, locked 2026-06-24)

After a Pokémon faints and the defending player must bring in a replacement (forced switch), the **replacement ALWAYS gets the next attack** — `decideTurnOrder` is bypassed for that single post-faint action.

### Why this is a house rule, not canon-Pokémon

Canon-Pokémon lets Speed determine the next attacker the round after a switch. For competitive play this is fine — you predict the switch, you bring a speed counter, you win the prediction. For a 5-10-year-old PvP game with potentially lethal damage rolls, that rule **snowballs**: a fast attacker KOs the lead, then the fresh replacement (often slower) gets attacked again before it can move, gets KO'd, and so on. Owner reported a 6-0 wipe where Player 2 never landed a single hit.

Owner's literal direction (2026-06-24):
> "ganti pokemon karena kalah ya harusnya dapat giliran bukan malah skip giliran."
> ("Changing pokémon because of losing — they should get a turn, not skip a turn.")

### Mechanic

| State | Behaviour |
|---|---|
| Forced switch after faint (`wasForced === true`) | Replacement player keeps the turn (`state.turn = playerIdx`). `decideTurnOrder` is NOT called. |
| Voluntary mid-fight switch | Unchanged — costs the turn, opponent acts next. |
| Next natural round (after replacement's action) | `decideTurnOrder` runs normally — Speed is back in charge. |

### Code site

`games/data/battle-modes.js` inside `performSwitch`'s `if (wasForced)` branch (~line 2518). The override is a single line: `state.turn = playerIdx`.

### Why this does NOT break tournament integrity

The rule applies symmetrically. Every faint in either direction gives the OTHER side the initiative on the replacement's first attack. In a chain-KO scenario, both sides trade evenly. The rule REMOVES the snowball; it doesn't add a new one. Whoever has more or better-rolled pokémon overall still wins, but losing a single pokémon doesn't lose you the match.

### DO NOT regress

Future agents reviewing `performSwitch` may be tempted to "fix" this back to canon-Pokémon (`state.turn = decideTurnOrder(...)`). That regression has been measured to cause 6-0 wipes. The fairness rule must remain.

---

## What's intentionally NOT in this standard (yet)

- **Status conditions** (paralyse / burn / poison / freeze / sleep). Owner hasn't asked; large engine work; defer.
- **Stat-stage modifiers** (ATK↑ / DEF↓ etc). Canonical Pokemon but adds another layer of complexity for kids. Defer.
- **Critical hits** beyond the existing super-eff + STAB combo. The current `bmCritPop` badge IS the v53 crit signal — sufficient.
- **Items** (held berries, status orbs). Out of scope for the educational game.

---

## Verification

1. **Equal-team test**: P1 + P2 both pick teams of same Pokemon (e.g. all Charmander). Play 20 matches. Win-rate within 7–13 (binomial 95% CI for fair coin).
2. **Glass-cannon vs tank**: Charizard team vs Snorlax team. Charizard's hits land harder per turn than Snorlax's. Match concludes in 4–7 turns (not 12+).
3. **Speed-gap**: Jolteon (spd 130) vs Snorlax (spd 30). Jolteon attacks first every round AND deals ~10% more per hit. Snorlax's hits ~5% softer.
4. **Adventure regression**: pick Bugsy (Bug type, Caterpie family) vs your Charizard. Charizard should now reasonably beat Caterpie family.
5. **Adventure imbalance correction**: pick Lance (Dragonite + legendaries) — should feel genuinely tough as a final boss.

---

## Files

- `games/data/battle-modes.js` — `SPEED_BY_SLUG`, `STAT_BY_SLUG`, helper functions, `calcDamage` integration, BattleModes.stats export.
- `games/g13c-pixi.html` — `calcDmg` wraps through `BattleModes.stats.shapeDamage`.
- `POKEMON_BALANCE_STANDARD.md` — this document.

---

## Cross-references

- `LESSONS-LEARNED.md` L78 (state write before render = stale DOM)
- `LESSONS-LEARNED.md` L79 (move-spam anti-cheat pattern)
- `LESSONS-LEARNED.md` L80 (canonical Atk/Def is THE balance lever, not just Speed)
- `LESSONS-LEARNED.md` L82 (single source of truth via global export)
- `TYPE_EFFECTIVENESS_STANDARD.md` — the type chart that feeds `typeMult`
- `CHANGELOG.md` 2026-06-23 — v52 → v53.5 series
