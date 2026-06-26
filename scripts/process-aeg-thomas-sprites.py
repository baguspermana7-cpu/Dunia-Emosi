#!/usr/bin/env python3
"""
process-aeg-thomas-sprites.py  (v54.68)

Reads 25 selected Thomas All Engines Go PNGs from assets/train/Thomas/characters/,
trims transparent borders, resizes so max dim = 600 px (aspect preserved), saves
as WebP at assets/train/aeg/<slug>.webp. Emits assets/train/aeg/_meta.json with
per-character native + trimmed dims for traceability and tuning.

Filter: 25 rail characters (excludes 6 non-rail vehicles per owner instruction).

Usage:
  python3 scripts/process-aeg-thomas-sprites.py

Requires: Pillow (PIL).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow (PIL) required. Install with: pip install Pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "assets" / "train" / "Thomas" / "characters"
OUT_DIR = ROOT / "assets" / "train" / "aeg"
META_FILE = OUT_DIR / "_meta.json"

MAX_DIM = 600
WEBP_QUALITY = 85

INCLUDED = {
    "thomas":              "050-thomas.png",
    "percy":               "035-percy.png",
    "james":               "029-james.png",
    "edward":              "017-edward.png",
    "henry":               "027-henry.png",
    "gordon":              "023-gordon.png",
    "emily":               "018-emily.png",
    "duck":                "016-duck.png",
    "toby":                "051-toby.png",
    "hiro":                "028-hiro.png",
    "ashima":              "003-ashima.png",
    "bruno":               "007-bruno.png",
    "carly":               "009-carly.png",
    "sandy":               "040-sandy.png",
    "salty":               "039-salty.png",
    "winston":             "057-winston.png",
    "trainiac":            "052-trainiac.png",
    "yong-bao":            "058-yong-bao.png",
    "diesel":              "014-diesel.png",
    "kenji":               "031-kenji.png",
    "kana":                "030-kana.png",
    "nia":                 "034-nia.png",
    "annie-and-clarabel":  "002-annie-and-clarabel.png",
    "slip-coaches":        "045-slip-coaches.png",
    "troublesome-tankers": "053-troublesome-tankers.png",
    "farona-and-frederico":"020-farona-and-frederico.png",
}

ARCHETYPE = {
    "tiny":     {"chars": {"percy","bruno","duck","kana","winston"},                "spriteHeight": 100},
    "standard": {"chars": {"thomas","james","edward","henry","toby","emily","hiro",
                           "nia","ashima","carly"},                                 "spriteHeight": 115},
    "express":  {"chars": {"gordon","yong-bao","kenji","salty","sandy"},            "spriteHeight": 125},
    "diesel":   {"chars": {"diesel"},                                               "spriteHeight": 115},
    "long":     {"chars": {"annie-and-clarabel","slip-coaches","troublesome-tankers",
                           "farona-and-frederico","trainiac"},                      "spriteHeight": 105},
}


def slug_archetype(slug: str) -> str:
    for name, info in ARCHETYPE.items():
        if slug in info["chars"]:
            return name
    return "standard"


def slug_height(slug: str) -> int:
    return ARCHETYPE[slug_archetype(slug)]["spriteHeight"]


def process_one(slug: str, src_name: str) -> dict | None:
    src = SRC_DIR / src_name
    if not src.exists():
        print(f"  ! missing source: {src_name}")
        return None
    img = Image.open(src).convert("RGBA")
    native_w, native_h = img.size

    bbox = img.getbbox()
    if bbox is None:
        print(f"  ! fully transparent: {src_name}")
        return None
    img = img.crop(bbox)
    trimmed_w, trimmed_h = img.size

    longer = max(trimmed_w, trimmed_h)
    if longer > MAX_DIM:
        scale = MAX_DIM / longer
        new_w = max(1, int(round(trimmed_w * scale)))
        new_h = max(1, int(round(trimmed_h * scale)))
        img = img.resize((new_w, new_h), Image.LANCZOS)
    final_w, final_h = img.size

    out = OUT_DIR / f"{slug}.webp"
    img.save(out, "WEBP", quality=WEBP_QUALITY, method=6)
    out_size_kb = out.stat().st_size / 1024

    sprite_height = slug_height(slug)
    print(f"  {slug:24s}  src {native_w:4d}x{native_h:4d}  trim {trimmed_w:4d}x{trimmed_h:4d}  "
          f"out {final_w:3d}x{final_h:3d}  {out_size_kb:5.1f} KB  H={sprite_height}")

    return {
        "slug": slug,
        "source": src_name,
        "nativeW": native_w,
        "nativeH": native_h,
        "trimmedW": trimmed_w,
        "trimmedH": trimmed_h,
        "outputW": final_w,
        "outputH": final_h,
        "outputBytes": out.stat().st_size,
        "archetype": slug_archetype(slug),
        "suggestedSpriteHeight": sprite_height,
    }


def main() -> int:
    if not SRC_DIR.exists():
        print(f"ERROR: source dir not found: {SRC_DIR}")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Processing {len(INCLUDED)} Thomas AEG sprites:")
    print(f"  src: {SRC_DIR}")
    print(f"  out: {OUT_DIR}")
    print()

    meta = []
    for slug, src_name in INCLUDED.items():
        result = process_one(slug, src_name)
        if result is not None:
            meta.append(result)

    META_FILE.write_text(json.dumps(meta, indent=2))
    total_kb = sum(m["outputBytes"] for m in meta) / 1024
    print()
    print(f"Done. {len(meta)} sprites processed, {total_kb:.0f} KB total.")
    print(f"Meta: {META_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
