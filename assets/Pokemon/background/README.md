# Pokemon City Background Pack

Generated from Bulbapedia's `List of cities and towns` page on 2026-04-25.

## Structure

- `prompts/`: one Markdown prompt file per city or town, named as `region__city.md`
- `pc/`: target folder for wide PC backgrounds in WebP
- `mobile/`: target folder for tall mobile backgrounds in WebP
- `batch/`: JSONL files ready for the bundled OpenAI image batch CLI
- `data/`: manifest files for tracking assets and sources
- `scripts/`: local generator for Google Imagen batch runs and WebP compression

## Art Direction Rules

- Every prompt reserves the bottom 30% as simplified low-detail foreground for gameplay/UI overlays.
- `pc` uses a wide composition.
- `mobile` uses a tall composition.
- Landmark detail is concentrated in the top 70% of the frame.
- Final output target is WebP under `60 KB` per image when possible while keeping HD readability.
- Prompts use anime-colouring, particle-rich, modern Pokemon XYZ-inspired background styling.
- Prompts avoid characters, Pokemon, text, logos, and watermarks.

## Google Imagen Batch Commands

```bash
python3 "/home/baguspermana7/rz-work/Dunia-Emosi/assets/Pokemon/background/scripts/generate_google_city_backgrounds.py" \
  --api-key "$GEMINI_API_KEY" \
  --input "/home/baguspermana7/rz-work/Dunia-Emosi/assets/Pokemon/background/batch/pokemon_city_backgrounds_pc.jsonl" \
  --out-dir "/home/baguspermana7/rz-work/Dunia-Emosi/assets/Pokemon/background/pc"

python3 "/home/baguspermana7/rz-work/Dunia-Emosi/assets/Pokemon/background/scripts/generate_google_city_backgrounds.py" \
  --api-key "$GEMINI_API_KEY" \
  --input "/home/baguspermana7/rz-work/Dunia-Emosi/assets/Pokemon/background/batch/pokemon_city_backgrounds_mobile.jsonl" \
  --out-dir "/home/baguspermana7/rz-work/Dunia-Emosi/assets/Pokemon/background/mobile"
```

These commands require a valid Google Gemini API key in the shell environment.
