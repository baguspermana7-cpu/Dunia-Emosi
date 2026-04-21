# Evolution Math Game — Expansion Ideas

> Based on G13 "Pertarungan Pokémon" (Pokémon Battle Math), which uses 2-stage evolution chains and arithmetic combat mechanics. This game is a hit — here are concepts for sequels and spin-offs.

---

## 1. Evolution Math World — Full RPG Mode

**Concept**: Expand G13 into a world-map RPG where the player travels between biomes (forest, volcano, ocean, cave), each with region-specific Pokémon and math difficulty.

**Key features**:
- 6 biomes × 10 levels each = 60 encounters
- Each biome unlocks a badge (like Pokémon gyms)
- Wild Pokémon have types (Fire/Water/Grass) — type advantage = math bonus (fewer attacks to evolve)
- Boss battles: 3-stage evolution chains with harder equations
- Player builds a team of 3 evolved Pokémon (persistent across levels)

**Math scope**: Addition, subtraction, multiplication, division — scales with biome

---

## 2. Evolution Chain Duel — 2-Player Mode

**Concept**: Two players solve math problems simultaneously. Whoever answers faster lands the attack first.

**Key features**:
- Split-screen (left vs right) on tablet/desktop
- Same equation shown to both players at once
- First correct answer attacks; wrong answer = self-damage
- Each player picks their Pokémon team before battle
- Win 3 rounds to win the duel

**Math scope**: All operations, configurable by age group

**Platform fit**: Tablet classroom play, sibling co-play

---

## 3. Evolution Fusion — Multiplication Focus

**Concept**: Two base Pokémon "fuse" only if the player answers the multiplication problem correctly. Wrong = they remain separate. Success = a powerful fusion sprite.

**Key features**:
- 3×3 grid of base Pokémon "ingredients"
- Player picks two to fuse — game shows multiplication problem
- N correct answers = fully fused legendary Pokémon unlocked
- Fusion journal: a dex of all completed fusions
- Special: "prime fusions" only possible with prime number equations

**Math scope**: Multiplication tables 1–12, then 13–20

---

## 4. Evolution Sprint — Speed Math Arcade

**Concept**: A runner game. The player's Pokémon runs forward automatically. Math questions appear as gates — correct answer = pass through (and gain speed/power), wrong = hit the gate (slow down, lose HP).

**Key features**:
- Solve as many as possible in 60 seconds
- Streak bonus: 5 correct in a row = evolution power-up (faster, jump ability)
- Obstacles: distractor numbers float in the path
- Evolve mid-run for higher score multiplier
- Leaderboard per child (personal best)

**Math scope**: Any operation — gates labeled with the answer choices (A/B/C/D)

---

## 5. Evolution Lab — Division & Fractions

**Concept**: A scientist Pokémon in a lab. To create a new evolution formula, the player must divide ingredients correctly. Each correct division = one drop added to the beaker. Fill the beaker = evolution!

**Key features**:
- Visual: beaker fills up with colored liquid per correct answer
- Pokémon in a lab coat sprite set
- "Experiment failed" if wrong (beaker overflows, comic effect)
- Introduces fractions naturally: "split 12 berries between 4 Pokémon"
- Recipe book: track all successful evolutions

**Math scope**: Division (ages 7+), intro to fractions (ages 8+)

---

## 6. Evolution Tower — Vertical Platformer Math

**Concept**: A tower with 20 floors. Each floor has a math problem guarding the staircase. Solve it → climb one floor. Reach the top floor → evolve. Fall = reset to last checkpoint.

**Key features**:
- 5 towers per "season" (5 Pokémon to evolve per season)
- Each tower has a theme (Ice Tower = subtraction, Fire Tower = multiplication)
- Time pressure: a rising lava/water level
- Collect coins mid-climb for a hint shop
- 3 stars: answer speed, no hints used, no falls

**Math scope**: Mixed operations, scales by tower number

---

## 7. Evolution Encyclopedia — Collect & Learn

**Concept**: Non-combat. The player earns Pokémon entries in a "Pokedex" by answering math quizzes. Each entry shows the evolution chain, fun Pokémon facts (reading comprehension), and a math challenge tied to the Pokémon's stats.

**Key features**:
- 150 entries = full encyclopedia badge
- Stat-based challenges: "Charizard's speed is 100. Bulbasaur's is 45. What's the difference?"
- Reading level adapts to child's age setting
- Shareable: parent can export child's Pokedex as a PDF report card
- Integrates with G13 — Pokémon caught in G13 auto-unlock their entry

**Math scope**: Word problems, stat arithmetic, ratio intro

---

## 8. Evolution Story — Narrative Math Adventure

**Concept**: A full story mode. A young Pokémon trainer (customizable) goes on a journey. At each story beat, a math challenge unlocks the next scene. Wrong answers = comedic detour, not failure.

**Key features**:
- 5-chapter story (30–45 min total playtime)
- Pokémon companions that comment on answers ("Nice try, Pikachu says!")
- Choices matter: pick the Pokémon you answer questions with → affects story ending
- 3 endings: Master (all correct), Explorer (some hints), Adventurer (used many hints)
- Parent dashboard: see per-chapter accuracy

**Math scope**: Mixed, difficulty adapts per chapter

---

## Quick Win Ideas (Low Effort, High Impact)

| Idea | Description | Effort |
|------|-------------|--------|
| **Daily Challenge** | One special chain per day, reward = rare sprite | Low |
| **Evolution Bingo** | 5×5 bingo card of math answers, evolve when Bingo | Low |
| **Reverse Mode** | Show equation result, player types the missing operand | Medium |
| **Sound Quiz** | Audio reads the equation, no text — trains listening | Medium |
| **Parent vs Child** | Parent plays hard version simultaneously | Medium |
| **Season Events** | Ramadan/Lebaran themed Pokémon sprites | Low |
| **Wrong = Mini Game** | Wrong answer triggers a quick penalty mini-game | High |

---

## Technical Expansion Notes

- **G13 current architecture**: Single HTML file, all JS inline — easy to copy logic to new game screen
- **Sprite source**: `img.pokemondb.net/sprites/home/normal/{slug}.png` — 900+ Pokémon available
- **3-stage evolution**: Already supported via `evolved2` field — ready for lab/tower games
- **Math engine**: `generateEquation(maxNum, ops)` is generic — reuse in all spin-offs
- **Difficulty tiers**: `easy/medium/hard/2stage/epic/legendary` — can map to any level system

---

*Created: 2026-04-13 | Game: G13 Pertarungan Pokémon | App: Dunia Emosi*
