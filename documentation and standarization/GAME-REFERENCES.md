# Dunia Emosi — Game Design References
## Classic Game Mechanics to Adopt

---

## 1. LANE-SWITCH RUNNER (Game 6: Petualangan Mobil)

**Reference**: Subway Surfers, Temple Run, Road Rush
**Why it works**: Hyper-casual, intuitive, instant feedback, builds confidence fast

**Mechanics to adopt**:
- 3-lane system with tap L/R button to switch
- Auto-scrolling background (CSS `background-position` animation)
- Letter tiles fall from top at constant intervals
- Speed increases progressively (ease into difficulty)
- "Miss" = letter passed without collect = visual indicator (flash lane)
- Collect feedback: brief scale-up + color flash on correct tile

**Implementation hint**:
```js
// Tile generation schedule
const SPAWN_INTERVAL = 60 // frames between tile rows
// Lane positions: 16.6%, 50%, 83.3% of container width
```

**From Temple Run**: Gradual power-up collection (collect letters = build word = big reward)
**From Subway Surfers**: Visual lane preview (player sees what's coming, time to react)

---

## 2. LETTER LEARNING (Game 3 & Game 7)

**Reference**: Starfall, ABCmouse, Endless Alphabet
**Why it works**: Phonics + visual + audio tripling makes letters stick faster

**Mechanics to adopt from Endless Alphabet**:
- Letters have personality (animate, wiggle, make sounds when tapped)
- Word is shown at top, letters scrambled below — tap to place in order
- Each letter "walks" to its correct slot when selected
- Wrong placement: letter shakes and walks back
- When word complete: animation celebration + word pronounced

**Mechanics from Starfall**:
- Phonics sound plays when tapping any letter (A sounds "Aaa" for Ayam)
- Letters appear in both uppercase and lowercase simultaneously
- Tracking dots show pen strokes for tracing

**For Dunia Emosi**:
- When child taps letter in Huruf Hutan → play letter sound via Web Speech API
- Wrong answer: letter "bounces back" with shake animation
- Correct: letter "flies" to answer slot with trail

---

## 3. MEMORY MATCH (Game 5: Cocokkan Emosi)

**Reference**: Classic Concentration card game, Peppa Pig Memory
**Why it works**: Pure working memory exercise, satisfaction from matching

**Mechanics to adopt**:
- **Peek mechanic**: On game start, show ALL cards for 2 seconds then flip — builds initial memory map
- **Reveal order**: After 2 mismatches, briefly show 1 random unmatched card (hint for younger children)
- **Wrong pair penalty**: Both cards flip back with visible "shake" — reinforces memory
- **Match celebration**: Matched pair stays face-up + glows + character pops up

**Child psychology insight**:
- Ages 5-6: need larger cards, 3x4 max grid
- Ages 7-8: 4x4 grid comfortable
- Ages 9-10: 4x5 or timed variant

**For Dunia Emosi**:
- Easy: 2-second peek at start + hint after 3 wrong
- Medium: 1-second peek at start
- Hard: No peek, no hint

---

## 4. EMOTION LEARNING (Game 1: Aku Merasa)

**Reference**: Zones of Regulation, Sesame Street apps, Feelings Monster
**Why it works**: Emotion labels + physical cues + coping strategies together

**Mechanics from Zones of Regulation**:
- Color zones (red=angry, blue=sad, yellow=silly/scared, green=calm)
- Each emotion has a "zone color" — use consistent color per emotion
- Breathing/coping technique immediately follows emotion identification

**From Sesame Street "Breathe, Think, Do"**:
- Situation shown → child identifies emotion → choose response
- Multiple choice responses, not just emotion names
- Stories make abstract emotions concrete

**For Dunia Emosi**:
- Add emotion "zone color" border to each choice button
- After correct answer: show coping technique (not just text tip, but animated)
- Hard mode: remove emoji, show only animal face + situation description

**Emotion color zones** (consistent across all games):
- 😊 Senang → `#FFD166` warm yellow
- 😢 Sedih → `#90CAF9` soft blue
- 😠 Marah → `#EF5350` red
- 😨 Takut → `#CE93D8` purple
- 🥰 Bahagia → `#F48FB1` soft pink
- 😑 Bosan → `#B0BEC5` grey-blue
- 😲 Terkejut → `#FFB74D` orange

---

## 5. COUNTING/MATH (Game 4: Hitung Binatang)

**Reference**: Osmo Numbers, Prodigy Math, Todo Math
**Why it works**: Visual counting with finger pointing, immediate validation

**Mechanics from Todo Math**:
- Tap each animal once as you count (prevents re-counting)
- Each tapped animal shows a number above it
- Counter at top increments with each tap
- After counting done → choose answer

**Mechanics from Osmo Numbers**:
- Objects group into clusters of 5 (subitizing — fastest way to count)
- Arrange animals in 5+N pattern for numbers 6-10

**For Dunia Emosi**:
- Add a "tap to count" mode in Medium/Hard: each animal gets highlighted when tapped, counter increments
- Numbers 1-5: animals arranged in dice pattern (easy subitizing)
- Numbers 6-10: two groups visible

---

## 6. LETTER TRACING (Game 9: Jejak Huruf)

**Reference**: Letter School, Writing Wizard, Handwriting Without Tears
**Why it works**: Motor + visual + audio combined builds writing foundation

**Mechanics from Letter School**:
- Letter displayed in 3 phases: full outline → stroke order guides → blank
- Start dot at correct starting position (stroke entry point)
- Arrow shows stroke direction
- Colored "paint" fills in as user traces
- 3 colored dots show stroke sequence for multi-stroke letters

**Mechanics from Writing Wizard**:
- Speed doesn't matter — accuracy matters
- If user goes too far off path → gentle redirect (line snaps back)
- Star particles follow the drawing stroke
- Guide dots glow sequentially to show correct path

**Canvas implementation approach**:
```js
// Draw letter outline (ghost)
ctx.strokeStyle = 'rgba(200,200,200,0.5)'
ctx.lineWidth = 40
// Draw user's trace over it
ctx.strokeStyle = '#A855F7'  // purple trace color
ctx.lineWidth = 36
// Guide dots: glow when user is near them
```

---

## 7. ADVENTURE MAP NAVIGATION

**Reference**: Candy Crush Saga, Cut the Rope, Plants vs Zombies map
**Why it works**: Progression is visible, goals are clear, curiosity drives engagement

**Mechanics from Candy Crush**:
- World map shows completed/locked/current stages
- Stars on each stage show past performance
- Path between stages = clear visual progression
- Locked stages: slightly greyed + padlock

**Mechanics from Cut the Rope**:
- Each "world" has a theme (jungle/candy/time travel)
- Stars collected unlock next world
- Returning to old world shows full star count

**For Dunia Emosi** (Phase 3):
```
Adventure Map Layout:
🏠 Leo's House (Home)
    |
🏝️ Emosi Island (Games 1-2)
    |
📚 Hutan Huruf (Games 3 + 9)
    |
🏙️ Kota Hitung (Games 4 + 8)
    |
🚗 Petualangan Road (Game 6)
    |
🔬 Tubuh Sains (Bonus content)
```

---

## 8. REWARD & PROGRESSION SYSTEMS

**Reference**: Duolingo, Khan Academy Kids, Toca Boca
**Why it works**: Variable reward schedule + collectibles = sustained engagement

**From Duolingo**:
- Streak system: "Don't break the chain" (daily play)
- XP + hearts system
- Weekly goals with celebration
- Lingot/gem currency for cosmetics

**From Khan Academy Kids**:
- Character grows/changes as child progresses
- Sticker collection (physical-feeling reward for digital)
- World unlocks tell a story (not just game unlocks)
- Parent dashboard shows progress

**From Toca Boca**:
- No failure states — exploration is always rewarded
- Sandbox areas between structured games
- Character customization keeps kids returning

**For Dunia Emosi reward system**:
- Stars → XP → Levels (🥚→🐣→🐥→🦅→👑)
- Sticker collection (emoji-based, 30 stickers to unlock)
- Leo's appearance changes: starts with no accessories,
  unlocks bow tie (10 stars), sunglasses (50 stars), crown (200 stars)
- Achievement badges (25 total)
- Streak flame counter + weekly challenge

---

## 9. BREATHING/CALM MECHANICS

**Reference**: Breathe, Think, Do (Sesame Street), Calm Kids, Headspace for Kids
**Why it works**: Visual + tactile + guided = multi-sensory regulation

**From Sesame Street Breathe Think Do**:
- Monster character models the frustrated state before breathing
- 3-step cue: STOP → BREATHE → SOLVE
- Child controls the breathing (blows bubbles = breathe out)
- Playful not clinical

**From Headspace for Kids**:
- Guiding character shrinks/grows with breath
- Nature sounds accompany breathing
- Post-session "how do you feel?" check-in

**For Dunia Emosi**:
- Leo shows "frustrated face" before breathing starts
- Leo's body expands/contracts with the circle
- After 3 cycles: Leo transforms to calm happy face + rainbow
- Add post-session: "Sekarang kamu merasa lebih baik?" → child taps emoji

---

## KEY TAKEAWAYS FOR IMPLEMENTATION

| Mechanic | Game | Priority | Effort |
|----------|------|----------|--------|
| Peek + hint in memory | Game 5 | 🔴 High | Low |
| Tap-to-count animals | Game 4 | 🔴 High | Medium |
| Letter tap sound (Speech) | Game 3 | 🔴 High | Low |
| Stroke order guides (Canvas) | Game 9 | 🟡 Medium | High |
| Lane preview highlight | Game 6 | 🟡 Medium | Medium |
| Leo emotional arc (breathe) | Game 2 | 🔴 High | Low |
| Emotion zone colors | Game 1 | 🟡 Medium | Low |
| Sticker collection system | Menu | 🟢 Low | Medium |
| Adventure world map | Menu | 🟢 Low | High |
