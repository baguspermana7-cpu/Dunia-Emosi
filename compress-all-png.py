#!/usr/bin/env python3
"""Compress every large PNG in dunia-emosi/assets/ to WebP, then rewrite references.

Skips:
  - assets/Pokemon/sprites/   (96x96 pixel art; already tiny, code hard-codes .png)
  - assets/Pokemon/svg/       (vector, not raster)
  - files under 50 KB         (not worth compressing)

For each eligible PNG:
  - Opens preserving alpha
  - Resizes max 1600px (longest edge) with LANCZOS
  - Saves <name>.webp  quality=78 method=6 (lossy, keeps alpha)
  - Records .png -> .webp rename

After conversion, rewrites references in every .html / .js / .css under the
project root so existing calls that used the .png name now point at the new
.webp. The ORIGINAL .png files are then deleted. All-or-nothing per file: if
conversion failed, the .png stays and no reference is rewritten.

Run:  python3 compress-all-png.py
"""
from pathlib import Path
from PIL import Image
import re

ROOT = Path(__file__).parent
ASSETS = ROOT / "assets"
SKIP_DIRS = {ASSETS / "Pokemon" / "sprites", ASSETS / "Pokemon" / "svg"}
MIN_BYTES = 50 * 1024
MAX_EDGE = 1600
WEBP_QUALITY = 78

CODE_EXTS = {".html", ".js", ".css"}


def collect_targets() -> list[Path]:
    out: list[Path] = []
    for p in ASSETS.rglob("*.png"):
        if any(str(p).startswith(str(s)) for s in SKIP_DIRS):
            continue
        if p.stat().st_size < MIN_BYTES:
            continue
        out.append(p)
    return out


def convert(src: Path) -> Path | None:
    dst = src.with_suffix(".webp")
    try:
        img = Image.open(src)
        mode = "RGBA" if img.mode in ("RGBA", "LA", "P") and "transparency" in img.info or img.mode == "RGBA" else "RGB"
        if img.mode != mode:
            img = img.convert(mode)
        w, h = img.size
        if max(w, h) > MAX_EDGE:
            img.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
        img.save(dst, "WEBP", quality=WEBP_QUALITY, method=6)
        return dst
    except Exception as e:
        print(f"FAIL {src}: {e}")
        return None


def rewrite_references(renames: dict[str, str]) -> int:
    """Replace every occurrence of old basename.png with new basename.webp inside
    html/js/css files under ROOT. Only string-literal names are touched (we don't
    touch arbitrary text like "file.png not found" messages — but near misses are
    unlikely because basenames are already unique enough)."""
    touched = 0
    code_files = [
        p for p in ROOT.rglob("*")
        if p.is_file() and p.suffix in CODE_EXTS
    ]
    # Build a single regex of all old basenames for one-pass replace per file
    pattern = re.compile(
        r"\b(" + "|".join(re.escape(Path(old).name) for old in renames) + r")\b"
    )
    lookup = {Path(old).name: Path(new).name for old, new in renames.items()}
    for f in code_files:
        try:
            orig = f.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        new = pattern.sub(lambda m: lookup[m.group(1)], orig)
        if new != orig:
            f.write_text(new, encoding="utf-8")
            touched += 1
    return touched


def main() -> None:
    targets = collect_targets()
    if not targets:
        print("No eligible PNGs found.")
        return

    print(f"Converting {len(targets)} PNG files to WebP...")
    renames: dict[str, str] = {}
    total_before = total_after = 0
    for src in targets:
        before = src.stat().st_size
        dst = convert(src)
        if dst is None:
            continue
        after = dst.stat().st_size
        total_before += before
        total_after += after
        renames[str(src)] = str(dst)
        print(f"  {src.relative_to(ROOT)}: {before // 1024} KB -> {after // 1024} KB")

    print(f"\nRewriting code references in .html / .js / .css...")
    n = rewrite_references(renames)
    print(f"  {n} code file(s) updated")

    print(f"\nDeleting {len(renames)} original .png files...")
    for old in renames:
        try:
            Path(old).unlink()
        except Exception as e:
            print(f"  FAIL unlink {old}: {e}")

    mb_before = total_before / 1024 / 1024
    mb_after = total_after / 1024 / 1024
    pct = (1 - total_after / total_before) * 100 if total_before else 0
    print(f"\nTotal: {mb_before:.1f} MB -> {mb_after:.1f} MB  ({pct:.1f}% smaller)")


if __name__ == "__main__":
    main()
