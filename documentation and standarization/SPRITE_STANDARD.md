# SPRITE_STANDARD.md

> Authoritative rules for Pokemon image rendering across g13, g13b, g13c, and any other view that displays a Pokemon sprite.
> Created 2026-05-01 (Hotfix #117) after user reported recurring non-HD sprite appearances despite #101-J HD migration.

## TL;DR

ALL Pokemon `<img>` elements must:
1. Use `attachSpriteCascade(imgEl, buildPokeSources(slug, id), fallbackEmoji)` for dynamic JS-built images
2. Use `pokeImg(slug)` (HD-WebP-first) as the primary `src` for static HTML templates
3. Never set `imgEl.src` directly to a non-HD CDN URL outside a `// LEGACY-FALLBACK-EXEMPT` else-branch

## The cascade order

`buildPokeSources(slug, pokeId)` returns sources in this order. The cascade tries each until one loads:

1. **HD WebP 630×630** — `assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug}.webp` (1025 Pokemon, all gens)
2. **SVG vector** — `assets/Pokemon/svg/{id}.svg` (751 Gen 1-6, scalable)
3. **96px CDN home** — `https://img.pokemondb.net/sprites/home/normal/{slug}.png` (last-resort online)
4. **96px PokeAPI raw** — `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`

Source #1 is the **only** one that's truly HD (630×630 transparent WebP, anti-aliased). Sources #3 and #4 are 96×96 — visible pixelation on retina screens. They're emergency rungs only.

> **Hotfix #120 (2026-05-02)**: `assets/Pokemon/sprites/` (96×96 local PNGs, 1025 files) was **deleted**. These were dead-weight fallbacks that caused pixelated sprites when HD cascade failed. The local PNG step has been **removed** from `buildPokeSources()`. The cascade is now strictly: HD WebP → SVG → CDN pokemondb → CDN PokeAPI.

## Required pattern: dynamic JS-built images

```javascript
const imgEl = document.getElementById('battle-pokemon')
if (typeof attachSpriteCascade === 'function' && typeof buildPokeSources === 'function') {
  if (typeof resetSpriteEl === 'function') resetSpriteEl(imgEl)  // clear stale onerror handlers (Hotfix #110)
  attachSpriteCascade(imgEl, buildPokeSources(slug, pokeId), '🎴')
} else {
  // LEGACY-FALLBACK-EXEMPT: cascade helpers unavailable (offline / standalone page without preload)
  imgEl.src = pokeSpriteAlt2(slug) || `https://img.pokemondb.net/sprites/home/normal/${slug}.png`
}
```

**Why `resetSpriteEl()` matters**: Hotfix #110 found that re-attaching a cascade to a previously-used `<img>` creates a stale onerror closure race. The old onerror still fires for the old slug, polluting the new slug's cascade. `resetSpriteEl()` nulls out `onerror` and `src` before re-attach.

## Required pattern: static HTML template strings

For templates rendered via `el.innerHTML = \`<img src="..." onerror="...">\`` (cannot use `attachSpriteCascade`):

```javascript
const pokeImg = (slug) => (typeof pokeSpriteAlt2 === 'function' && pokeSpriteAlt2(slug)) ||
                          `https://img.pokemondb.net/sprites/home/normal/${slug}.png`

el.innerHTML = `<img src="${pokeImg(slug)}"
                     loading="lazy" decoding="async"
                     onerror="this.src='https://img.pokemondb.net/sprites/home/normal/${slug}.png';this.onerror=null"
                     alt="${name}">`
```

The PRIMARY `src=` MUST be HD (via `pokeImg` or `SPRITE_HD`). The onerror chain is a fallback rung. Never use a 96px CDN URL as the primary `src=`.

## Forbidden patterns

```javascript
// FORBIDDEN: 96px CDN as primary src
imgEl.src = `https://img.pokemondb.net/sprites/home/normal/${slug}.png`

// FORBIDDEN: PokeAPI raw github 96px as primary
imgEl.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

// FORBIDDEN: any CDN URL hardcoded outside the helper functions
const url = 'https://img.pokemondb.net/sprites/home/normal/' + slug + '.png'
```

The regression script `scripts/check-regressions.sh` rule `HD-SPRITE-1` flags these. Annotate legitimate else-branch fallbacks with `// LEGACY-FALLBACK-EXEMPT`.

## `window.POKE_IDS` requirement

`buildPokeSources(slug, pokeId)` needs the Pokemon's national dex ID to construct HD WebP and SVG paths. When `pokeId` is null (common in evolusi/legendary/picker flows), it falls back to `window.POKE_IDS[slug]`.

**game.js** exposes this at load time:
```javascript
const POKE_IDS = Object.fromEntries(POKEMON_DB.map(p => [p.slug, p.id]))  // 1025 entries
window.POKE_IDS = POKE_IDS
```

**Standalone pages** that load `poke-sprite-cdn.js` get their own `window.POKE_IDS` from that module.

> **Rule**: Never declare a local `const POKE_IDS = {...}` subset inside a function — it shadows the global 1025-entry map with an incomplete copy. Always use `window.POKE_IDS` or `POKE_IDS` (the module-level variable).

### window.POKE_IDS Global Exposure (Hotfix #120)

`game.js` declares `const POKE_IDS = Object.fromEntries(POKEMON_DB.map(...))` — 1025 slug→id entries. This MUST be exposed as `window.POKE_IDS` immediately after declaration (game.js:5512).

**Why:** `buildPokeSources()` in `poke-sprite-loader.js` checks `window.POKE_IDS[slug]` to generate HD WebP paths (`pokemondb_hd_alt2/{NNNN}_{slug}.webp`). Without it, all 5 call sites pass `null` as Pokemon ID → HD WebP + SVG paths SKIPPED → cascade falls to 96px CDN → if CDN fails, emoji fallback.

**Standalone pages** (g6, g13c-pixi, g14, g15-pixi, g16-pixi, g19-pixi, g20-pixi, g21-pixi, g22-candy) load `poke-sprite-cdn.js` which sets its own `window.POKE_IDS`. No conflict — standalone pages set it BEFORE game.js loads.

## Helper inventory (game.js)

| Helper | Purpose | Returns |
|---|---|---|
| `pokeSpriteAlt2(slug)` | HD WebP path | `assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug}.webp` or null |
| `pokeSpriteSVG(slug)` | SVG vector path | `assets/Pokemon/svg/{id}.svg` or null |
| `pokeSpriteOnline(slug)` / `pokeSpriteCDN(slug)` | 96px CDN | `https://img.pokemondb.net/sprites/home/normal/{slug}.png` |
| `pokeSpriteBackup(id)` | 96px PokeAPI front | `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png` |
| `pokeSpriteBack(id)` | 96px PokeAPI back | `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/{id}.png` |
| `buildPokeSources(slug, id)` | Cascade-source builder | Array `[HD_WebP, SVG, CDN, PokeAPI]` |
| `attachSpriteCascade(imgEl, sources, emoji)` | Apply cascade to img | Sets `src`, attaches dedup'd onerror chain |
| `resetSpriteEl(imgEl)` | Clear stale handlers | Nulls onerror, optionally clears src |

## Helper inventory (g13c-pixi.html)

g13c is a standalone page that loads `data/poke-sprite-cdn.js` independently:

```javascript
const SPRITE_HD_REMOTE = s => `https://img.pokemondb.net/sprites/home/normal/${s}.png` // 96px CDN, last resort
const SPRITE_HD        = s => (typeof pokeSpriteAlt2 === 'function' ? pokeSpriteAlt2(s) : null) || SPRITE_HD_REMOTE(s)
// SPRITE_LOCAL removed in Hotfix #120 — assets/Pokemon/sprites/ directory deleted (1025 files)
// const SPRITE_LOCAL  = s => `../assets/Pokemon/sprites/${s}.png`  // DO NOT RESTORE
```

`SPRITE_HD()` returns true HD WebP first, falls to 96px CDN only if alt2 unavailable. Always use `SPRITE_HD` (not `SPRITE_HD_REMOTE`) as the primary `src=`.

> **Hotfix #120 rule**: `SPRITE_LOCAL` references were removed from g13c-pixi.html. Any new onerror cascades in standalone pages must use `SPRITE_HD_REMOTE(slug)` as the last-resort fallback — never reference the deleted `assets/Pokemon/sprites/` path.

## Audit history

| Hotfix | Sites refactored | Comments |
|---|---|---|
| #101-J | Initial HD migration | `pokeSpriteAlt2` introduced, SPRITE_HD wired in g13c |
| #110 | Sprite re-entry race | `resetSpriteEl` + `flushSpriteQueue` MAX_CONCURRENT 4→8 |
| #117 | game.js direct assignments | 7 cascades added; `attachSpriteCascade` wired in renderFamilyTree, evolution chain, legendary display, evolved-form swap, post-evo player sprite update; remaining `else` branches annotated `// LEGACY-FALLBACK-EXEMPT` |
| #120 | window.POKE_IDS + sprites/ cleanup | Exposed `window.POKE_IDS` globally (was private const → null ID → no HD path). Deleted `assets/Pokemon/sprites/` (1025 non-HD PNGs). Removed cascade step. Deleted 2 local POKE_IDS shadow copies. |

## CI enforcement

`scripts/check-regressions.sh` rule `HD-SPRITE-1` runs in pre-commit / CI. It scans for direct non-HD URL assignments and exempts:
- Lines using `pokeImg(...)`, `SPRITE_HD(...)`, `pokeSpriteAlt2(...)` as primary
- Lines inside `onerror="..."` HTML templates
- Lines annotated with `// LEGACY-FALLBACK-EXEMPT` (within 3 lines above)
- URL-builder helper function definitions

## See also

- `LESSONS-LEARNED.md` L59 — the recurring "non-HD sprite" complaint and why direct `.src=` is forbidden
- `REGRESSION_CHECKS.md` — full list of regression rules
- `games/data/poke-sprite-loader.js` — `attachSpriteCascade`, `resetSpriteEl`, `flushSpriteQueue` source
- `games/data/poke-sprite-cdn.js` — `pokeSpriteAlt2`, `pokeSpriteCDN` source for standalone pages
- Mirror: `Apps/second brain/obsidian-knowledge-vault/03-Apps/Dunia-Emosi/sprite-cascade-architecture.md`
