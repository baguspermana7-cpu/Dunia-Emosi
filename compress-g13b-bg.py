#!/usr/bin/env python3
"""Compress G13b Gemini PNG backgrounds to WebP.

Mobile: max 780x1400, quality 75
PC:     max 1280x2240, quality 80

Idempotent: skips files where a fresher .webp already exists.
Run from Apps/dunia-emosi/:  python3 compress-g13b-bg.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent / "assets/Pokemon/g13b/background"
TARGETS = [
    (ROOT / "mobile", (780, 1400), 75),
    (ROOT / "pc",     (1280, 2240), 80),
]


def compress(src: Path, max_wh: tuple[int, int], quality: int) -> Path:
    dst = src.with_suffix(".webp")
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return dst
    img = Image.open(src).convert("RGB")
    img.thumbnail(max_wh, Image.LANCZOS)
    img.save(dst, "WEBP", quality=quality, method=6)
    return dst


def main() -> None:
    total_before = total_after = 0
    for folder, max_wh, q in TARGETS:
        if not folder.is_dir():
            print(f"skip (missing): {folder}")
            continue
        for src in sorted(folder.glob("Gemini_Generated_Image_*.png")):
            before = src.stat().st_size
            dst = compress(src, max_wh, q)
            after = dst.stat().st_size
            total_before += before
            total_after += after
            print(f"{src.name}: {before // 1024} KB -> {dst.name}: {after // 1024} KB")
    mb_before = total_before / 1024 / 1024
    mb_after = total_after / 1024 / 1024
    pct = (1 - total_after / total_before) * 100 if total_before else 0
    print(f"\nTotal: {mb_before:.1f} MB -> {mb_after:.1f} MB  ({pct:.1f}% smaller)")


if __name__ == "__main__":
    main()
