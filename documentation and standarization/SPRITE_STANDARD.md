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
3. **Local PNG** — `assets/Pokemon/sprites/{slug}.png` (battle-cropped, ~80px)
4. **96px CDN home** — `https://img.pokemondb.net/sprites/home/normal/{slug}.png` (last-resort online)
5. **96px PokeAPI raw** — `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png`

Source #1 is the **only** one that's truly HD (630×630 transparent WebP, anti-aliased). Sources #4 and #5 are 96×96 — visible pixelation on retina screens. They're emergency rungs only.

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

## Helper inventory (game.js)

| Helper | Purpose | Returns |
|---|---|---|
| `pokeSpriteAlt2(slug)` | HD WebP path | `assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug}.webp` or null |
| `pokeSpriteSVG(slug)` | SVG vector path | `assets/Pokemon/svg/{id}.svg` or null |
| `pokeSprite(slug)` | Local PNG path | `assets/Pokemon/sprites/{slug}.png` |
| `pokeSpriteOnline(slug)` / `pokeSpriteCDN(slug)` | 96px CDN | `https://img.pokemondb.net/sprites/home/normal/{slug}.png` |
| `pokeSpriteBackup(id)` | 96px PokeAPI front | `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png` |
| `pokeSpriteBack(id)` | 96px PokeAPI back | `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/{id}.png` |
| `buildPokeSources(slug, id)` | Cascade-source builder | Array `[HD_WebP, SVG, local, CDN, PokeAPI]` |
| `attachSpriteCascade(imgEl, sources, emoji)` | Apply cascade to img | Sets `src`, attaches dedup'd onerror chain |
| `resetSpriteEl(imgEl)` | Clear stale handlers | Nulls onerror, optionally clears src |

## Helper inventory (g13c-pixi.html)

g13c is a standalone page that loads `data/poke-sprite-cdn.js` independently:

```javascript
const SPRITE_HD_REMOTE = s => `https://img.pokemondb.net/sprites/home/normal/${s}.png` // 96px CDN, last resort
const SPRITE_HD        = s => (typeof pokeSpriteAlt2 === 'function' ? pokeSpriteAlt2(s) : null) || SPRITE_HD_REMOTE(s)
const SPRITE_LOCAL     = s => `../assets/Pokemon/sprites/${s}.png`
```

`SPRITE_HD()` returns true HD WebP first, falls to 96px CDN only if alt2 unavailable. Always use `SPRITE_HD` (not `SPRITE_HD_REMOTE`) as the primary `src=`.

## Audit history

| Hotfix | Sites refactored | Comments |
|---|---|---|
| #101-J | Initial HD migration | `pokeSpriteAlt2` introduced, SPRITE_HD wired in g13c |
| #110 | Sprite re-entry race | `resetSpriteEl` + `flushSpriteQueue` MAX_CONCURRENT 4→8 |
| #117 (this) | game.js direct assignments | 7 cascades added; `attachSpriteCascade` wired in renderFamilyTree, evolution chain, legendary display, evolved-form swap, post-evo player sprite update; remaining `else` branches annotated `// LEGACY-FALLBACK-EXEMPT` |

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
