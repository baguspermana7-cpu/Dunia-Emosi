# Asset Pipeline — Dunia Emosi

> **Effective**: 2026-04-26
> **Purpose**: Where new assets go, how the loader chain works, deployment workflow
> **Cross-ref**: `ARCHITECTURE-INDEX.md`, `CODE-REVIEW-CHECKLIST.md`, Lesson L16

---

## 📁 Asset Folder Map

```
assets/
├── Pokemon/
│   ├── pokemondb_hd_alt2/        — 1025 HD WebP @ 630×630, PRIMARY sprite source
│   │   └── 0001_bulbasaur.webp   — Pattern: {id-zero-padded}_{slug}.webp
│   │
│   ├── svg/                       — 751 SVG sprites (Gen 1-7), variant fallback
│   │   └── 1.svg                  — Pattern: {id}.svg
│   │
│   ├── background/                — 178 city backgrounds × 2 (PC + mobile)
│   │   ├── pc/                    — 1408×768 (~16:9), `<region>__<slug>__pc.webp`
│   │   ├── mobile/                — 768×1408 (~9:16), `<region>__<slug>__mobile.webp`
│   │   ├── icon/                  — region/cities icons (Imagen-generated)
│   │   ├── data/
│   │   │   └── pokemon_city_background_manifest.csv  — 178 rows, source of truth
│   │   ├── prompts/               — Imagen prompt MD per city
│   │   ├── batch/                 — JSONL inputs for batch generator
│   │   └── scripts/               — Python generators
│   │
│   ├── others/                    — UI-shared icons
│   │   ├── region.webp            — 256×256, Pokeball+arrow (region selector)
│   │   ├── cities.webp            — 256×256, Pokeball+marker (city selector)
│   │   ├── Region.png             — original PNG source (kept for re-compress)
│   │   └── Cities.png             — original PNG source
│   │
│   ├── g13b/background/{pc,mobile}/  — legacy random bg pool (pre-Task #66)
│   ├── g19/, birds/, trainer/        — game-specific assets
│   ├── pokeballs-png/                — Pokéball variants (catch animation)
│   ├── sprites/                      — low-res PNG fallback
│   ├── sound/                        — BGM + SFX
│   └── pokemon-db.json               — POKEMON_DB seed data
│
├── (game-specific game-asset.webp/...)
├── bg-music.mp3                   — overworld BGM
├── bg-pokemon-battle.webp         — fallback battle bg
├── leo-excited.webp               — mascot variants
└── (etc.)
```

## 🎨 Sprite Loader Cascade (per Lesson L16)

**Hierarchy** — try in order, fall through on error:

```
pokeSpriteAlt2(slug)
  └→ assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug-with-underscore}.webp
  
fallback 1: pokeSpriteOnline(slug) / pokeSpriteCDN(slug)
  └→ https://img.pokemondb.net/sprites/home/normal/{slug}.png

fallback 2: pokeSpriteBackup(id)
  └→ https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png

fallback 3: pokeSpriteSVG(slug)
  └→ assets/Pokemon/svg/{id}.svg

last resort: emoji placeholder
```

**Slug normalization** (per Task #66 fix):
- `mr-mime` → file `mr_mime` (underscore separator for multi-word)
- `nidoran-f` → file `nidoranf` (no separator for gendered)
- `tapu-koko` → file `tapu_koko`
- `ho-oh` → file `ho_oh`
- See `_slugToAlt2File()` helper in `game.js:5264`

**Code pattern** (Lesson L16 mandate):
```js
// LOCAL FIRST — always
const localSrc = pokeSpriteAlt2(slug)
img.src = localSrc || pokeSpriteOnline(slug)

// Two-stage onerror chain
img.onerror = function() {
  if (this.dataset.fallback === '1') {
    // already tried fallback once — give up
    this.alt = 'fallback emoji'; this.onerror = null; return
  }
  this.dataset.fallback = '1'
  this.src = pokeSpriteOnline(slug)
}
```

**Anti-patterns** (these caused production bugs):
- ❌ Remote URL as PRIMARY (caused Tasks #64, #71)
- ❌ No `dataset.fallback` guard → infinite onerror retry loop
- ❌ Bulk render >10 sprites with remote primary → connection pool exhausted (Task #64)

## 🌅 Background Image Pipeline

### Generation Workflow

1. **Manifest** in `assets/Pokemon/background/data/pokemon_city_background_manifest.csv`:
   ```csv
   section,region,english_name,page_title,city_url,summary,reference_image,prompt_md,pc_output,mobile_output
   ```
2. **Prompts** in `prompts/<region>__<slug>.md` — XYZ-anime style, reserve bottom 30% for UI overlay
3. **Generate** via `scripts/generate_google_city_backgrounds.py` (Imagen API)
4. **Output**: WebP files in `pc/` and `mobile/` directories
5. **Verify dimensions** — PC ~1408×768, mobile ~768×1408 (±10% acceptable for `cover`)
6. **Compression target**: <60KB per file (Imagen output usually meets)

### Loading at Runtime

`loadCityBackground(fieldEl)` (`game.js:5616`):
```js
const isMobile = window.innerWidth < 768
const bgFile = isMobile ? city.bg.mobile : city.bg.pc
const folder = isMobile ? 'mobile' : 'pc'
fieldEl.style.backgroundImage = `url('assets/Pokemon/background/${folder}/${encodeURIComponent(bgFile)}')`
fieldEl.style.backgroundSize = 'cover'        // NEVER 100% 100% (= stretch)
fieldEl.style.backgroundPosition = 'center 22%'
```

### Lazy Preload Strategy (Task #88)

`prefetchRegionBackgrounds(regionId)` (`game.js:12251`) — invoked when user opens City overlay for a region:
- Iterates `CITY_PACK[regionId].cities`
- Stagger: 80ms apart between `new Image()` calls (avoid pool saturation)
- Idempotent via `_bgPrefetchedRegions` Set
- Browser caches Image.src → subsequent game launch instant

**Why lazy**: 178 PC + 178 mobile bgs = 23MB total. Preloading all upfront wastes 20MB when user only plays 1 region.

## 🎵 Audio Pipeline

```
assets/Pokemon/sound/
├── 06 Battle (VS Wild Pokémon)... .mp3   — battle BGM (~7.5MB)
├── 29 ~Ending~... .mp3                    — G13b BGM (Quick Fire)
├── (other Pokemon themed BGMs)
└── (SFX clips)
```

### Loading Rules

- `<audio preload="none">` — avoid eager 7.5MB load (per Task #73)
- Trigger `.play()` only when entering game screen
- Use `vibrate(pattern)` for haptic feedback parity (Task #87)

### Future: MP3 → OGG Vorbis (deferred Phase 3)

- Saves ~40% file size (12-15MB total)
- ffmpeg batch command: `ffmpeg -i input.mp3 -c:a libvorbis -b:a 96k output.ogg`
- Test audio quality post-encode
- Update `<audio src="...">` to point to `.ogg`
- Provide `<source>` fallback for older browsers

## 🆕 Adding New Assets

### Adding a Pokemon Sprite

1. Generate/source HD WebP @ 630×630 RGBA
2. Naming: `{id-4-digit-padded}_{slug-with-underscore}.webp`
   - e.g., `1027_charizard.webp`, `0122_mr_mime.webp`
3. Place in `assets/Pokemon/pokemondb_hd_alt2/`
4. Verify slug matches `POKEMON_DB` entry slug (see `game.js:4133`)
5. If new slug, add to `POKE_IDS` map (per `g13EvolveComplete` line 8341)

### Adding a City Background

1. Add row to `pokemon_city_background_manifest.csv`
2. Write prompt MD in `prompts/<region>__<slug>.md`
3. Generate PC + mobile WebP
4. Place in `assets/Pokemon/background/{pc,mobile}/`
5. Add city entry to `games/data/city-pokemon-pack.js` (canonical Pokemon pack)
6. Verify `region` matches `REGION_META` key (region-meta.js)
7. Cache bump

### Adding a Region (e.g., 11th main region)

1. Add to `REGION_META` in `games/data/region-meta.js`
2. Add to `REGION_ORDER` array
3. Set `hueRotate` value for icon tinting (CSS filter)
4. Generate region.webp / cities.webp tinting variants if not using filter
5. Add cities to `CITY_PACK` (city-pokemon-pack.js)
6. Generate all city backgrounds (manifest CSV + Imagen)
7. Update `CITY-PROGRESSION-SPEC.md` region count
8. Cache bump

### Adding a Game-Specific Asset

1. Create folder under `assets/Pokemon/g{NN}/` if game-specific (e.g., `g19/birds/`)
2. Reference via relative path in game.js or standalone HTML
3. If using PixiJS: load via `PIXI.Assets.load(path)` 
4. Document in `GAME-REFERENCES.md`

## 🚢 Deployment

### Cache-Bust Versioning

- Format: `?v=YYYYMMDDX` where X = a/b/c/d/... letter for same-day deploys
- ATOMIC across these 5 files in `index.html`:
  - `style.css?v=...`
  - `games/data/region-meta.js?v=...`
  - `games/data/city-progression.js?v=...`
  - `games/data/city-pokemon-pack.js?v=...`
  - `game.js?v=...`
- Plus hardcoded URLs:
  - `openGymGame()` → `g13c-pixi.html?v=...` (game.js:1106)
  - Standalone Pixi pages may have own cache versions in their HTML

### Bulk Bump Command

```bash
sed -i 's/v=PREV_VERSION/v=NEW_VERSION/g' index.html
# Verify all updated:
grep -E "v=2026[0-9]+[a-z]" index.html
```

### Vercel Deploy

- Auto-rebuild on `git push origin main`
- Wait ~30-60s post-push before testing
- Force fresh fetch: `https://emosi-z2ss.vercel.app/?cb=$(date +%s)`
- DevTools Network → confirm new files return **200 OK** (not 304)

## 🚨 Known Gotchas

- **Pokemon slug normalization**: local files use `_` separator, pokeapi uses `-`. Always pipe through `_slugToAlt2File()`.
- **WebP browser support**: Safari <14 didn't support — modern phones all support since 2020. Acceptable for our 5-10yo target audience.
- **Mega/Gmax sprites**: NOT in local pack. Use base sprite + CSS aura overlay (Lesson L20, G13-EVOLUTION-CHAIN-SPEC.md).
- **Background dimensions**: Imagen output varies (1183×676 to 1408×768). All within ~3% aspect ratio. `background-size: cover` handles gracefully — DO NOT stretch.
- **localStorage quota**: Saving 178+ city completed flags + stars is small (~2KB), but combined with `dunia-emosi-played-games`, `best-stars`, `progress`, achievements... watch out. Verified <50KB total in normal use.

## Cross-References

- `CODE-REVIEW-CHECKLIST.md` § 5 (Local-First Asset Policy)
- `CITY-PROGRESSION-SPEC.md` § "Asset Pipeline" subsection
- `G13-EVOLUTION-CHAIN-SPEC.md` § "Sprite reuse strategy"
- `LESSONS-LEARNED.md` L16 (local-first), L18 (mobile bg), L20 (visual-overlay)
- `ARCHITECTURE-INDEX.md` § "Adding a New Feature"

---

**Last updated**: 2026-04-26
