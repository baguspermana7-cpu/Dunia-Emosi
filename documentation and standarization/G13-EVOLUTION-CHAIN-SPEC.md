# G13 Evolution Chain Spec — Dunia Emosi

> **Effective**: 2026-04-25 (Task #67)
> **Game**: G13 "Evolusi Math" (Pokemon evolution-themed math battle)

## Overview

G13 menampilkan Pokemon yang ber-evolusi saat player jawab math benar. Sebelum 2026-04-25:
- 16 evolution chains (10 popular + 5 cool/pseudo + 1 random)
- Maksimal 2 evolution stages (player → evolved → evolved2)
- Sprite swap pakai remote pokemondb.net (slow, blocks UI)

Setelah 2026-04-25 (Task #67):
- **44 evolution chains** (17 popular + 21 Ash + 5 cool/pseudo + 1 random)
- **Up to 3 evolution stages** (player → evolved → evolved2 → mega/gmax/special-form)
- Sprite **local-first** dari `assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug}.webp`
- **Visual-overlay strategy** untuk Mega Evolution (no separate sprite needed)

## Data Model

### Chain shape (`G13_FAMILIES` di `game.js:7263+`)

```js
{
  id: 'kebab-case-id',
  label: 'Display Name',
  series: 'Region/Series Tag',
  category: 'popular' | 'ash' | 'cool',
  color: '#hex',                            // primary card color
  icon: '🔥',                                // emoji prefix
  
  // 4-stage data (player + 3 evolutions max)
  player:   {name, slug, type, tc},          // stage 0 — base form
  evolved:  {name, slug, type, tc},          // stage 1 — first evolution
  evolved2: {name, slug, type, tc},          // stage 2 — final regular form
  mega: {                                    // OPTIONAL stage 3 — Mega/Gmax/Ash-form
    name: 'Mega Charizard X',
    slug: 'charizard',                       // SAME slug as evolved2 (sprite reuse)
    type: 'Fire',
    tc: '#3B82F6',
    form: 'mega' | 'mega-x' | 'mega-y' | 'gmax' | 'ash-form' | 'max-boost',
    aura: 'gold' | 'blue' | 'red' | 'rainbow',
    badge: '⭐ MEGA' | '🌟 G-MAX' | '💧 ASH-FORM' | '✨ MAX FORM',
  } | null,
  
  wild: {name, slug, type, tc}                // unrelated enemy in battle
}
```

### Categories (44 total)

**⭐ POPULER (17)** — kid-iconic, generic versions
1. Bulbasaur line (Mega Venusaur)
2. Charmander line (Mega Charizard Y)
3. Squirtle line (Mega Blastoise)
4. Pichu → Pikachu → Raichu
5. Caterpie → Butterfree (Gmax)
6. Abra → Alakazam (Mega)
7. Gastly → Gengar (Mega)
8. Machop → Machamp (Gmax)
9. Geodude → Golem
10. Eevee → Vaporeon (Eeveelution Water)
11. Eevee → Espeon (Psychic)
12. Eevee → Sylveon (Fairy)
13. Mudkip → Swampert (Mega)
14. Snivy → Serperior
15. Fennekin → Delphox
16. Sobble → Inteleon (Gmax)
17. Munchlax → Snorlax (Gmax)

**🎒 ASH (21)** — Ash Ketchum signature roster
1. Pikachu (Ash) — Pichu→Pikachu→[Pikachu]→Gmax Pikachu
2. Charizard (Ash) — Charmander→Charmeleon→Charizard→**Mega Charizard X (blue)** ⭐
3. Bulbasaur (Ash) — Mega Venusaur
4. Squirtle (Ash) — Mega Blastoise
5. Butterfree (Ash) — Caterpie line, Gmax
6. Pidgeot (Ash) — Mega Pidgeot
7. Snorlax (Ash) — Munchlax line, Gmax
8. Heracross (Ash) — Mega Heracross
9. Meganium (Ash) — Chikorita → Bayleef → Meganium
10. Sceptile (Ash) — Treecko line, Mega Sceptile
11. Glalie (Ash) — Snorunt line, Mega Glalie
12. Infernape (Ash) — Chimchar line (no Mega, MAX FORM)
13. Staraptor (Ash) — Starly line
14. Garchomp (Ash) — Gible line, Mega
15. Pignite/Emboar (Ash) — Tepig line
16. Krookodile (Ash) — Sandile line
17. Greninja (Ash) — **Ash-Greninja blue form** ⭐
18. Talonflame (Ash) — Fletchling line
19. Incineroar (Ash) — Litten line
20. Lucario (Ash) — Riolu line, Mega
21. Dragonite (Ash) — Dratini line

**💎 KEREN (5)** — pseudo-legendary 3-stage chains
1. Dratini → Dragonite
2. Larvitar → Tyranitar (Mega)
3. Beldum → Metagross (Mega)
4. Bagon → Salamence (Mega)
5. Gible → Garchomp (Mega)

**🎲 ACAK (1)** — pseudo-family pakai random pick dari `G13_CHAINS`

## Difficulty Tier Mapping (`game.js:7237`)

| Tier | Level Range | Stages | HP | wildHp | attacksToEvo |
|------|-------------|--------|----|----|---|
| easy | 1-4 | 1 evolution | 5 | 8 | 3 |
| medium | 5-9 | 1 evolution | 6 | 10 | 4 |
| hard | 10-16 | 2 evolutions | 7 | 12 | 5 |
| 2stage | 17-25 | 2 evolutions | 7 | 13 | 5 |
| epic | 26-35 | 2 evolutions | 8 | 18 | 4 |
| **3stage** | **36-45** | **3 evolutions WITH MEGA** ⭐ | 8 | 24 | 5 |
| **legendary** | **46-55** | **3 evolutions hardest** | 9 | 30 | 5 |

`G13_DIFF[tier].stages` flag controls how many evolutions are rendered:
- 1 → only `evolved` shown (skip `evolved2` + `mega`)
- 2 → `evolved` + `evolved2`
- 3 → `evolved` + `evolved2` + `mega` (or `synthMaxBoostForm` fallback)

## Mega Evolution Visual Strategy

**Constraint**: local sprite pack (1025 base WebP) does NOT include Mega/Gmax/regional variants.

**Solution**: visual-overlay only — sprite stage 2 reused, dramatic effects layered:

1. **Sprite**: same `assets/Pokemon/pokemondb_hd_alt2/{slug}.webp` as `evolved2`
2. **Aura ring**: CSS `filter: drop-shadow()` rotating glow (gold/blue/red/rainbow per form)
3. **Crown badge**: floating "⭐ MEGA" / "🌟 G-MAX" / "💧 ASH-FORM" / "✨ MAX FORM" above sprite
4. **Scale boost**: 1.3x size pump
5. **Animation**: `g13EnterFlip` 0.6s on transform
6. **Audio cue**: existing evolve sound

**Why this works for kids**:
- Anak 5-10 tidak peduli "ini sprite asli Mega Charizard X atau bukan"
- Aura golden + crown badge + scale up = perceived "more powerful"
- Same sprite kept → sprite is recognizable, no confusion

**For chains without canonical Mega**: `synthMaxBoostForm()` membuat MAX FORM dengan gold aura + "✨ MAX FORM" badge. Visual identik dengan canonical Mega — kids equally delighted.

## Sprite Loading (Local-First per Lesson L16)

`g13EvolveComplete` (`game.js:8281+`) sprite swap:

```js
const localSrc = pokeSpriteAlt2(nowForm.slug)      // local first
pspr.src = localSrc || pokeSpriteOnline(nowForm.slug)  // remote fallback
pspr.onerror = () => {                              // 2-stage fallback
  if (pspr.dataset.evolveFallback === '1') {
    const eid = POKE_IDS2[nowForm.slug]
    if (eid) pspr.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${eid}.png`
    pspr.onerror = null; return
  }
  pspr.dataset.evolveFallback = '1'
  pspr.src = pokeSpriteOnline(nowForm.slug)
}
```

Avoids the remote-only crash bug pre-Task #64.

## State Tracking

`g13State` flags (initialized in `_initGame13Impl`):
```js
{
  evolved: false,    // stage 1 reached
  evolved2: false,   // stage 2 reached
  megaForm: false,   // stage 3 reached (Task #67)
  // ...
}
```

Evolution gates (in `g13Answer` post-attack logic):
```js
const canEvo1 = !s.evolved && evoPoints >= evoNeeded
const canEvo2 = s.evolved && !s.evolved2 && s.chain.evolved2 && evoPoints >= evoNeeded
const canEvo3 = s.evolved2 && !s.megaForm && s.chain.mega && evoPoints >= evoNeeded
```

## UI: Category Tabs (`#g13-fam-overlay`)

Sticky tab strip:
- 🎒 ASH (21) — default selected
- ⭐ POPULER (17)
- 💎 KEREN (5)
- 🎲 ACAK (1)

Each tab → filter `G13_FAMILIES` by `category`. Mega indicator pill (`.g13-fam-mega-indicator`) rendered top-right of each card if `chain.mega` exists.

User selection persisted to `localStorage['g13_lastFamily']`. Default falls back to `'ash-pikachu'` (most kid-recognized) if none saved.

## Math Difficulty Integration

G13 follows `MATH-DIFFICULTY-STANDARD.md`:
- Easy mode (default): + and − only, max 20
- Hard mode: + − × ÷, max 50
- Mega form (3rd stage) adds +15 boost to max (capped by mode limit)

## Adding New Chain

1. Add entry to `G13_FAMILIES` (game.js:7263+)
2. Verify all `slug` values exist in local sprite pack (`pokemondb_hd_alt2/`)
3. If chain has canonical Mega/Gmax: provide `mega` field with `_mega(...)` helper
4. If no canonical: leave `mega` field unset — synth MAX FORM will be used
5. Pick category (`popular` | `ash` | `cool`)
6. Update count in this doc + tabs spec in `openG13FamilySelector`

## Anti-patterns

❌ Don't fetch Mega sprite from remote — use base sprite + aura overlay
❌ Don't create new tier without `stages` flag in `G13_DIFF`
❌ Don't bypass `pickFamilyForTier` — it handles stages cap correctly
❌ Don't use `evolved2.slug` directly when sprite-loading evolved form — always use the resolved chain object from `pickFamilyForTier`

## Relation to Other Standards

- `MATH-DIFFICULTY-STANDARD.md` — math rule applied to questions
- `LESSONS-LEARNED.md` L16 — local-first sprite policy (applied here)
- `LESSONS-LEARNED.md` L20 — visual-overlay for missing assets (this doc's pattern)
- `CHANGELOG.md` 2026-04-25 entry
