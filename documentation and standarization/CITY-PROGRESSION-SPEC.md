# City Progression Spec — Dunia Emosi

> **Effective**: 2026-04-25 (Task #66)
> **Scope**: G10 (Math Battle), G13 (Evolusi Math), G13b (Quick Fire) — replaces "Level 1-N random" selector with **Region → City** journey ala anime/game Pokémon official.

## The Rule

User mandate (2026-04-25):
- **Semua region terbuka** dari awal — tidak ada lock antar region
- **Per region: 2 cities selalu terbuka** (frontier window). Setiap completion → 1 city baru terbuka
- **Image actual ratio** — jangan stretch, pakai `background-size: cover`

## Architecture

```
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌─────────┐
│ Game tile    │ →  │ Stage A — Region │ →  │ Stage B — City   │ →  │ Game    │
│ (gtile-N)    │    │ Picker overlay   │    │ Picker overlay   │    │ starts  │
│ openRegion-  │    │ 10 region cards  │    │ N city cards     │    │ with    │
│ Overlay(N)   │    │ (locked/avail/   │    │ (locked/avail/   │    │ city.bg │
│              │    │  done)           │    │  completed)      │    │ + pack  │
└──────────────┘    └──────────────────┘    └──────────────────┘    └─────────┘
```

## Sliding Frontier Unlock Rule

```
unlockedCount[region] = min(2 + completedCount[region], totalCities[region])
```

**Walkthrough** (Kanto = 10 cities):
| Action | Cities visible | Frontier (not-completed) |
|--------|---------------|--------------------------|
| Start | `[1▶][2▶][3🔒]...[10🔒]` | 1, 2 (2 cities) ✓ |
| Beat 1 | `[1✓][2▶][3▶][4🔒]...` | 2, 3 (2 cities) ✓ |
| Beat 2 | `[1✓][2✓][3▶][4▶][5🔒]...` | 3, 4 (2 cities) ✓ |
| Beat out-of-order (skip 1, do 2) | `[1▶][2✓][3▶][4🔒]...` | 1, 3 (2 cities) ✓ |
| Replay completed | no new unlock | (frontier unchanged) |
| Last city left | `[1✓]...[9✓][10▶]` | 10 (1 city) — final |

## Data Structure

### Top-level: `CITY_PACK` (in `games/data/city-pokemon-pack.js`)
```js
const CITY_PACK = {
  kanto: {
    name, gen, color, icon,
    cities: [
      {
        slug: 'pallet-town',         // matches bg filename
        name: 'Pallet Town',
        order: 1,                     // 1-based index in region
        tier: 1,                      // 1-5 difficulty
        anime: 'EP001',               // anime episode debut (optional)
        gym: { leader, type } | null,
        bg: { pc: '...webp', mobile: '...webp' },
        pack: [{ id, slug, type }, ...]   // 5-7 Pokemon
      },
      // ...
    ]
  },
  johto: { ... },
  // ... 10 main regions (Kanto/Johto/Hoenn/Sinnoh/Unova/Kalos/Alola/Galar/Paldea/Hisui)
}
```

**Total**: 127 cities across 10 main regions.
**Side regions** (Sevii/Orre/PMD/Almia/Fiore/Oblivia/Toyland/Pasio/Kitakami/Aeos) — intentionally hidden MVP, can be added Phase 7+.

### Region metadata: `REGION_META` (in `games/data/region-meta.js`)
```js
{
  kanto: { order:1, name:'Kanto', gen:'Gen 1', color:'#EF4444', icon:'🔥',
           hueRotate:0, saturate:1.0, totalCities:10 },
  johto: { order:2, name:'Johto', gen:'Gen 2', color:'#F59E0B', icon:'🌅',
           hueRotate:25, saturate:1.0, totalCities:12 },
  // ...
}
```

`hueRotate` + `saturate` applied as CSS filter to single shared `region.webp` icon — single asset, varied colors per card.

### Progress storage extension: `prog.gN.cities`
```js
prog.g10 = {
  completed: [...legacy levelNum],   // backward-compat
  stars: {...legacy},
  cities: {                           // NEW (Task #66)
    kanto: { completed: ['pallet-town', 'pewter-city'], stars: { 'pallet-town': 3 } },
    johto: { ... }
  },
  cityMigrationDone: '20260425'       // migration flag (idempotent)
}
```

## Helpers (in `games/data/city-progression.js`)

```js
getCityProgress(gameNum, regionId)       // → {completed:[], stars:{}}
setCityComplete(gameNum, regionId, citySlug, stars)
getUnlockedCount(gameNum, regionId)      // sliding frontier rule
isCityUnlocked(gameNum, regionId, idx)   // 1-based check
isCityCompleted(gameNum, regionId, slug)
getCityStars(gameNum, regionId, slug)
getCityStates(gameNum, regionId, cities) // → array with state: locked|available|completed
migrateLegacyLevelsToCity(gameNum)        // one-time migration
```

## Asset Pipeline

### Backgrounds (per city)
- **Source**: Imagen-generated WebP from `assets/Pokemon/background/{pc,mobile}/{region}__{slug}__{folder}.webp`
- **Manifest**: `assets/Pokemon/background/data/pokemon_city_background_manifest.csv`
- **Dimensions**: target PC 1408×768, mobile 768×1408 (aspect 1.83:1 / 0.55:1) — actual sizes vary 1183×676 to 1408×768; aspect close enough for `background-size: cover`
- **Loading**: `loadCityBackground(fieldEl)` helper in `game.js` — picks PC vs mobile by viewport width

### Icons (shared, tinted per region)
- **Region icon**: `assets/Pokemon/others/region.webp` (256×256, 14.7KB compressed dari Region.png 32KB) — Pokeball + arrow/compass shape
- **City icon**: `assets/Pokemon/others/cities.webp` (256×256, 7.5KB compressed dari Cities.png 36KB) — Pokeball as map marker
- **Per-region tinting**: CSS `filter: hue-rotate({region.hueRotate}deg) saturate({region.saturate}) drop-shadow(0 0 8px {region.color})` — single asset, color varies per card

### Pokemon sprites
- Local-first via `pokeSpriteAlt2(slug)` — see Lesson L16
- Slug normalization: `_slugToAlt2File()` handles `mr-mime → mr_mime`, `nidoran-f → nidoranf`, etc.

## Game Integration

### G10 (Math Battle)
- `pickPokeForLevel()` di `game.js:5500` — checks `state.selectedCity` first, falls back to legacy pool
- `initGame10()` calls `loadCityBackground(g10-field)` 
- Victory: `setCityComplete(state.currentGame, region, city, stars)` recorded

### G13 (Evolusi Math)
- `_initGame13Impl()` calls `loadCityBackground(g13-field)`
- Family selector tetap available via 🎒 button — user override the city's canonical chain
- Victory: `setCityComplete(13, region, city, stars)`

### G13b (Quick Fire)
- `initGame13b()` calls `loadCityBackground(g13b-field)` first; falls back to existing random pool if no city selected
- `g13bSpawnWild()` uses city pack as wild pool when city selected
- Game over (won, not defeated): `setCityComplete('13b', region, city, stars)`

## UI Components

### Stage A — Region overlay (`#region-overlay`)
- 10 region cards in grid (mobile 2-col, PC 5-col)
- Each card: tinted region.webp icon + name + gen badge + "X/Y selesai ⭐" progress
- Tap → close A → open B for that region

### Stage B — City overlay (`#city-overlay`)
- N city cards in vertical list (mobile 1-col, PC 3-col)
- Each card: tinted cities.webp icon + name + tier dots + gym info + state status
- States:
  - **Locked**: 🔒 status, name "???", grey, shake on tap
  - **Available**: ▶ status, glow border, full color, name shown
  - **Completed**: ⭐⭐⭐ status, green border, full color
- Tap available/completed → close B → start game with city's bg + pack

### Back navigation
- City overlay has ← button → `backToRegionOverlay()` re-renders Stage A
- ✕ closes either overlay

## Migration Path (one-time, idempotent)

`migrateLegacyLevelsToCity(gameNum)` runs on first launch after Task #66 deploys:
1. Reads legacy `prog.gN.completed = [1,2,3,...]` (level numbers)
2. Maps level 1..N to first N cities of Kanto, then Johto, etc., in REGION_ORDER
3. Preserves star high-water mark
4. Sets `prog.gN.cityMigrationDone = '20260425'` to prevent re-run
5. No data loss — legacy fields kept

## Verification Checklist

1. ✅ `node --check game.js` exit 0
2. ✅ All 127 city slugs resolve to local sprites (audit script)
3. ✅ All 127 PC + mobile bgs present in `assets/Pokemon/background/`
4. **Cold-start test** (clear localStorage):
   - Tap G10 tile → Region overlay opens
   - All 10 regions visible
   - Tap Kanto → City overlay; cities 1-2 available, 3-10 locked
   - Tap Pallet Town → game starts with `kanto__pallet-town__pc.webp` bg + Bulbasaur/Charmander pack
   - Win → return to city picker; Pewter unlocked
5. **Replay test**: complete city → re-open picker → completed shows ⭐⭐⭐
6. **Cross-region test**: from Kanto picker, back → switch to Galar → 2 cities available
7. **Migration test**: plant `prog.g10.completed=[1,2,3]` → reload → first 3 Kanto cities marked done
8. **Mobile viewport** (375×667): bg loads, no stretch, region/city grids responsive
9. **PC viewport** (1920×1080): bg fills, 5-col region / 3-col city grids
10. **Slow 3G throttle**: bg loads progressively, lazy-load icons

## Anti-patterns to Avoid

❌ Don't fetch backgrounds from remote — always local from `assets/Pokemon/background/`
❌ Don't use `background-size: 100% 100%` (= stretch) — must be `cover`
❌ Don't unlock all cities at once — sliding frontier is core mechanic
❌ Don't tie city completion to legacy levelNum directly — use `setCityComplete(gameNum, region, slug, stars)`
❌ Don't add new region without entry in BOTH `REGION_META` (region-meta.js) AND `CITY_PACK` (city-pokemon-pack.js)
❌ Don't bypass icon tinting — single asset reuse via `filter: hue-rotate()` is the standard

## Relation to Other Standards

- `MATH-DIFFICULTY-STANDARD.md` — math rules apply within each city's questions
- `G13-EVOLUTION-CHAIN-SPEC.md` — family selector still works as override per-city
- `LESSONS-LEARNED.md` L16 (local-first sprite), L18 (mobile bottom safe-area), L20 (visual-overlay pattern)
- `CODING-STANDARDS.md` § Asset Loading Rules
- `CHANGELOG.md` 2026-04-25 entry
