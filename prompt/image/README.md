# AI Image Generation Guide — Dunia Emosi

## Overview

| File | Count | Priority |
|------|-------|----------|
| Backgrounds (`bg-*.webp`) | 5 | 🔴 High — needed for Game 6 |
| Leo Character (`leo-*.png`) | 7 | 🔴 High — used everywhere |
| Vehicles (`car-*.png`, etc.) | 4 | 🔴 High — Game 6 |
| Obstacle tiles (`obstacle-*.png`) | 4 | 🟡 Medium |
| Word images (`img-*.png`) | 20 | 🟡 Medium — needed for Game 7 & 8 |

**Total: 40 images**

## Where to put generated images

All images → `/home/baguspermana7/rz-work/Apps/dunia-emosi/assets/`

## Recommended AI Generator

- **Gemini** or **DALL-E 3** for backgrounds (best quality)
- **Adobe Firefly** or **Stable Diffusion** for consistent character sheets
- Use the same generator session for Leo to maintain consistency

## Important: Avoid Copyright Triggers

Do NOT use these phrases in prompts — AI generators will refuse:
- ❌ Disney, Pixar, specific movie titles (Cars, Lightyear, Finding Nemo, etc.)
- ❌ One Piece, Naruto, or any specific anime title
- ❌ Pokemon, Pikachu, Pokeball, or any Nintendo IP
- ✅ Use instead: "3D CGI children's animation style", "vibrant anime illustration style"
- ✅ For game assets: "fantasy creature", "battle arena", "magic sphere"

## Generation Order

1. `leo-happy.png` (test character first)
2. Remaining 6 Leo expressions (same session/style)
3. `bg-city.webp` (test background)
4. Remaining 4 backgrounds
5. Vehicles (4 files)
6. Word images (can batch 4-5 at a time)
7. Obstacle tiles

## Prompt Files

1. `01-backgrounds.md` — 5 background tiles + 1 optional
2. `02-leo-character.md` — 7 Leo expressions
3. `03-vehicles.md` — 4 vehicles + 4 obstacles
4. `04-word-images.md` — 20 word/animal images
