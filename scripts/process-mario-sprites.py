#!/usr/bin/env python3
"""
Hotfix #118: Pillow script to crop Pikachu glow halo from pikachu-small.png
and pikachu-big.png. The PNG has transparent padding (yellow glow halo) around
the actual sprite — this makes Pikachu appear to float above platforms.

Usage:
    python3 scripts/process-mario-sprites.py

Outputs:
    assets/mario-pokemon/sprites/pikachu-small-cropped.png
    assets/mario-pokemon/sprites/pikachu-big-cropped.png
"""

from pathlib import Path
from PIL import Image

ALPHA_THRESHOLD = 30  # pixels with alpha <= this are considered transparent halo
SPRITE_DIR = Path(__file__).parent.parent / "assets" / "mario-pokemon" / "sprites"

def crop_halo(src_path: Path, dst_path: Path) -> None:
    """Crop transparent halo from sprite using bounding box of opaque pixels."""
    im = Image.open(src_path).convert("RGBA")
    orig_size = im.size

    # Build a version where halo pixels (alpha <= threshold) become fully transparent
    r, g, b, a = im.split()
    import PIL.ImageChops as ops
    # Threshold alpha: set pixels below threshold to 0
    import PIL.ImageOps as imgops
    # Use point() to threshold
    a_thresh = a.point(lambda p: 255 if p > ALPHA_THRESHOLD else 0)
    im_thresh = Image.merge("RGBA", (r, g, b, a_thresh))

    # getbbox returns (left, upper, right, lower) of non-zero pixels
    bbox = im_thresh.getbbox()
    if bbox is None:
        print(f"  WARNING: {src_path.name} appears fully transparent — skipping crop")
        return

    cropped = im.crop(bbox)
    cropped_size = cropped.size

    cropped.save(dst_path, "PNG", optimize=True)
    print(f"  {src_path.name}: {orig_size} -> {cropped_size} (saved to {dst_path.name})")
    halo_px = max(bbox[0], bbox[1], orig_size[0] - bbox[2], orig_size[1] - bbox[3])
    print(f"    Largest halo edge: {halo_px}px")

def main():
    print("=== Pikachu Glow Halo Crop ===")
    targets = [
        ("pikachu-small.png", "pikachu-small-cropped.png"),
        ("pikachu-big.png",   "pikachu-big-cropped.png"),
    ]
    for src_name, dst_name in targets:
        src = SPRITE_DIR / src_name
        dst = SPRITE_DIR / dst_name
        if not src.exists():
            print(f"  SKIP: {src} not found")
            continue
        crop_halo(src, dst)

    print("\nDone. Verify output files:")
    for _, dst_name in targets:
        dst = SPRITE_DIR / dst_name
        if dst.exists():
            im = Image.open(dst)
            print(f"  {dst_name}: {im.size}")
        else:
            print(f"  MISSING: {dst_name}")

if __name__ == "__main__":
    main()
