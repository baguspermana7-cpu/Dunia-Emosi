# Dunia Emosi — Architecture Document

**Version**: 2.2
**Last Updated**: 2026-04-13
**Target Age**: 5–10 years

---

## File Structure

```
dunia-emosi/
├── index.html                          # Main game (single file, ~3500 lines)
├── assets/                             # AI-generated images
│   ├── bg-city.webp                   # Road scrolling background
│   ├── bg-forest.webp
│   ├── bg-space.webp
│   ├── bg-body.webp
│   ├── bg-menu.webp                   # Menu/welcome background
│   ├── leo-happy.png                  # Leo character expressions
│   ├── leo-excited.png
│   ├── leo-sad.png
│   ├── leo-surprised.png
│   ├── leo-proud.png
│   ├── leo-thinking.png
│   ├── leo-waving.png
│   ├── car-red.png                    # Game 6 vehicles
│   ├── car-blue.png
│   ├── rocket.png
│   ├── submarine.png
│   ├── obstacle-cone.png              # Game 6 obstacles
│   ├── obstacle-rock.png
│   ├── obstacle-asteroid.png
│   ├── obstacle-bacteria.png
│   └── img-[word].png                 # 20 word images (Game 7 & 8)
├── prompt/
│   └── image/                         # AI generation prompts
│       ├── README.md
│       ├── 01-backgrounds.md
│       ├── 02-leo-character.md
│       ├── 03-vehicles.md
│       └── 04-word-images.md
└── documentation and standarization/
    ├── ARCHITECTURE.md                 # This file
    ├── GAME-MODULES.md                # Game design specs
    ├── CODING-STANDARDS.md            # Code conventions
    ├── AGE-TIERS.md                   # Age-based content rules
    └── CHANGELOG.md                   # Version history
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| HTML | Semantic HTML5, single file |
| CSS | CSS3 custom properties, animations, Grid/Flexbox |
| JS | Vanilla ES6+, no frameworks |
| Canvas | HTML5 Canvas (Game 9: Letter Tracing only) |
| Audio | Web Audio API (synthesized, no audio files) |
| Storage | localStorage (progress, settings, streak) |
| Fonts | Google Fonts: Nunito + Fredoka One |

---

## Game Modules

| # | ID | Name | Category | Status |
|---|----|----|----------|--------|
| 1 | `game1` | Aku Merasa | Emosi | ✅ Done |
| 2 | `game2` | Napas Pelangi | Emosi | ✅ Done |
| 3 | `game3` | Huruf Hutan | Huruf & Angka | ✅ Done |
| 4 | `game4` | Hitung Binatang | Angka | ✅ Done |
| 5 | `game5` | Cocokkan Emosi | Memory | ✅ Done |
| 6 | `game6` | Petualangan Mobil | Adventure | 🔲 Phase 2 |
| 7 | `game7` | Tebak Gambar | Membaca | 🔲 Phase 2 |
| 8 | `game8` | Susun Kata | Membaca | 🔲 Phase 2 |
| 9 | `game9` | Jejak Huruf | Menulis | 🔲 Phase 2 |

---

## Pokemon Database

| Property | Value |
|----------|-------|
| Source file | `assets/Pokemon/pokemon-db.json` |
| Total entries | 1,025 (Gen 1–9, all Pokémon) |
| Sprite location | `assets/Pokemon/sprites/{slug}.png` (local, primary) |
| Sprite fallback | `https://img.pokemondb.net/sprites/home/normal/{slug}.png` |
| Fields | `id, name, slug, type, type2, gen, tier` |
| Tier system | 1=basic, 2=mid-evo, 3=final-evo, 4=legendary |
| Legendary count | 79 IDs in `_LEGENDARY_IDS` |
| In-game array | `POKEMON_DB` (inline JS, ~79KB) |

**Tier-based size scaling (G13/G13b):**
- tier 1 → 1.0× base size
- tier 2 → 1.2× base size
- tier 3 → 1.3× base size
- tier 4 → 1.6× base size (legendary)

**5-star modal standard:** All game result screens use `⭐`.repeat(n) + `☆`.repeat(5-n) for star display.

---

## State Management

All game state stored in a single `state` object in JS memory, persisted to localStorage on change.

```js
const state = {
  mode: 'solo' | 'duo',
  ageTier: 'cilik' | 'tumbuh' | 'pintar',
  players: [{ name, animal, stars, xp, ageTier }],
  currentPlayer: 0,
  currentGame: null,
  selectedLevel: 'easy' | 'medium' | 'hard',
  gameStars: [0, 0],
  // ... game-specific states
}
```

---

## LocalStorage Keys

| Key | Content |
|-----|---------|
| `dunia-emosi-v2` | Main save data (players, xp, achievements) |
| `dunia-emosi-streak` | Daily streak data |
| `dunia-emosi-settings` | Font scale, contrast, motion, voice |

---

## Difficulty System

Each game reads from `DIFF[state.selectedLevel]`:

```js
const DIFF = {
  easy:   { rounds: 6,  timer: 20, choices: 3, breatheCycles: 2 },
  medium: { rounds: 10, timer: 15, choices: 4, breatheCycles: 3 },
  hard:   { rounds: 15, timer: 10, choices: 6, breatheCycles: 4 }
}
```

---

## Asset Fallback System

All images have emoji fallbacks when `assets/` folder is missing:

```js
const ASSET_FALLBACK = {
  'leo-happy.png':    '🦁',
  'leo-excited.png':  '🦁',
  'car-red.png':      '🚗',
  'car-blue.png':     '🚙',
  'rocket.png':       '🚀',
  'submarine.png':    '🤿',
  'img-ayam.png':     '🐓',
  // ...
}
```
