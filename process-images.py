#!/usr/bin/env python3
"""
Dunia Emosi — Image Processor
Removes background from AI-generated images in prompt/image/files/
and copies them to the correct assets/ folder.

Usage:
  python3 process-images.py

Drop your AI-generated images into:
  prompt/image/files/

Naming convention (same as asset filenames):
  leo-happy.png, bg-city.webp, battle-arena-bg.webp, etc.

Files with prefix bg-* or *-bg.* are treated as BACKGROUNDS (no bg removal).
All other files: background is removed and saved as PNG with transparency.
"""

import os
import sys
import shutil
from pathlib import Path
from PIL import Image

SCRIPT_DIR = Path(__file__).parent
INPUT_DIR = SCRIPT_DIR / "prompt/image/files"
ASSETS_DIR = SCRIPT_DIR / "assets"
POKEMON_ASSETS_DIR = ASSETS_DIR / "Pokemon"

# Files that should NOT have background removed (backgrounds, arena bg, etc.)
BG_PATTERNS = ['bg-', '-bg.', 'arena-bg', 'sci-bg', 'shadow-bg', 'counter-bg', 'zone-bg']

# Where each file goes
ROUTE_MAP = {
    # Leo characters
    'leo-': ASSETS_DIR,
    # Vehicles/characters
    'car-': ASSETS_DIR,
    'rocket': ASSETS_DIR,
    'submarine': ASSETS_DIR,
    # Word images
    'img-': ASSETS_DIR,
    # Battle UI
    'battle-': ASSETS_DIR,
    'type-badge': ASSETS_DIR,
    'poke-': ASSETS_DIR,
    # Science/shadow game
    'sci-': ASSETS_DIR,
    'shadow-': ASSETS_DIR,
    # General UI
    'particle-': ASSETS_DIR,
    'confetti-': ASSETS_DIR,
    'progress-': ASSETS_DIR,
    'zone-': ASSETS_DIR,
    'arena-': ASSETS_DIR,
    # Pokemon counter bg
    'pokemon-counter': ASSETS_DIR,
    # Backgrounds
    'bg-': ASSETS_DIR,
}


def is_background(filename):
    """Check if this file is a background (skip bg removal)."""
    fname = filename.lower()
    for pat in BG_PATTERNS:
        if pat in fname:
            return True
    return False


def get_dest_dir(filename):
    """Determine destination directory based on filename prefix."""
    fname = filename.lower()
    for prefix, dest in ROUTE_MAP.items():
        if fname.startswith(prefix.lower()) or prefix.lower() in fname:
            return dest
    return ASSETS_DIR  # default


def remove_background(input_path, output_path):
    """Remove background using rembg."""
    try:
        from rembg import remove
        with open(input_path, 'rb') as f:
            input_data = f.read()
        output_data = remove(input_data)
        with open(output_path, 'wb') as f:
            f.write(output_data)
        return True
    except Exception as e:
        print(f"  ⚠ rembg failed: {e}, trying PIL method...")
        return remove_bg_pil(input_path, output_path)


def remove_bg_pil(input_path, output_path):
    """Fallback: remove white/checker background using PIL color tolerance."""
    try:
        img = Image.open(input_path).convert("RGBA")
        data = img.getdata()
        new_data = []
        for item in data:
            r, g, b, a = item
            # Remove near-white pixels (common AI output background)
            if r > 240 and g > 240 and b > 240:
                new_data.append((r, g, b, 0))
            else:
                new_data.append(item)
        img.putdata(new_data)
        img.save(output_path, 'PNG')
        return True
    except Exception as e:
        print(f"  ✗ PIL method also failed: {e}")
        return False


def convert_background(input_path: Path, output_path: Path) -> bool:
    """Convert background to proper WebP (resize to 800×600, RGB, no alpha needed)."""
    try:
        img = Image.open(input_path).convert('RGB')
        # Resize to 800×600 — good resolution for a game road background
        img = img.resize((800, 600), Image.LANCZOS)
        img.save(str(output_path), 'WEBP', quality=82, method=4)
        size_kb = output_path.stat().st_size // 1024
        print(f"  ✓ [BG] {input_path.name} → {output_path.name} ({size_kb}KB, real WebP 800×600)")
        return True
    except Exception as e:
        print(f"  ✗ Background conversion failed: {e}")
        return False


def process_file(input_path):
    filename = input_path.name
    stem = input_path.stem
    suffix = input_path.suffix.lower()

    dest_dir = get_dest_dir(filename)
    dest_dir.mkdir(parents=True, exist_ok=True)

    is_bg = is_background(filename)

    if is_bg:
        # Backgrounds: ALWAYS convert to real WebP (AI outputs PNG regardless of extension)
        dest_path = dest_dir / (stem + '.webp')
        return convert_background(input_path, dest_path)
    else:
        # Character/UI images: remove background, save as WebP (transparent, 90% smaller)
        dest_filename = stem + '.webp'
        dest_path = dest_dir / dest_filename
        # First remove bg to a temp PNG, then convert to WebP
        tmp_path = dest_dir / (stem + '_tmp.png')
        print(f"  ⚙ Removing BG: {filename} → {dest_path.relative_to(SCRIPT_DIR)}")
        success = remove_background(str(input_path), str(tmp_path))
        if success:
            # Convert PNG → WebP (keeps transparency, 90% smaller)
            try:
                from PIL import Image as _PILImage
                _img = _PILImage.open(str(tmp_path))
                _img.save(str(dest_path), 'WEBP', quality=88, method=6)
                tmp_path.unlink(missing_ok=True)
            except Exception:
                shutil.move(str(tmp_path), str(dest_path))
            size_kb = dest_path.stat().st_size // 1024
            print(f"  ✓ Done ({size_kb}KB)")
        return success


def main():
    if not INPUT_DIR.exists():
        INPUT_DIR.mkdir(parents=True)
        print(f"Created input folder: {INPUT_DIR}")
        print("Drop your AI-generated images there and run again.")
        return

    files = [f for f in INPUT_DIR.iterdir() if f.is_file() and f.suffix.lower() in
             {'.png', '.jpg', '.jpeg', '.webp', '.bmp'}]

    if not files:
        print(f"No images found in {INPUT_DIR}")
        print("Drop PNG/JPG/WebP files there and run again.")
        return

    print(f"Processing {len(files)} image(s)...\n")
    ok = 0
    fail = 0
    for f in sorted(files):
        print(f"[{f.name}]")
        if process_file(f):
            ok += 1
        else:
            fail += 1
        print()

    print(f"{'='*40}")
    print(f"Done: {ok} success, {fail} failed")
    if ok > 0:
        print(f"Images placed in: assets/")
    if fail > 0:
        print("Failed files were NOT moved — check errors above.")


if __name__ == '__main__':
    main()
