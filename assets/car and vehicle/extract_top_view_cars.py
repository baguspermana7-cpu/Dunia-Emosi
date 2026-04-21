#!/usr/bin/env python3
"""Extract the 12 top-view car sprites from 9779.jpg."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "9779.jpg"
OUT_DIR = ROOT / "top-view"
TARGET_HEIGHT = 168

NAMES = [
    ("white_gt", "White GT"),
    ("yellow_sport", "Yellow Sport"),
    ("white_track", "White Track"),
    ("blue_red_racer", "Blue Red Racer"),
    ("cyan_sedan", "Cyan Sedan"),
    ("white_stripe_gt", "White Stripe GT"),
    ("red_formula", "Red Formula"),
    ("yellow_rally", "Yellow Rally"),
    ("white_coupe", "White Coupe"),
    ("white_roadster", "White Roadster"),
    ("blue_compact", "Blue Compact"),
    ("silver_sedan", "Silver Sedan"),
]


def detect_boxes(image: Image.Image) -> list[tuple[int, int, int, int]]:
    arr = np.array(image.convert("RGB"))
    mask = np.any(arr < 245, axis=2).astype("uint8") * 255
    mask = cv2.morphologyEx(
        mask,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35)),
        iterations=2,
    )
    mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_RECT, (25, 25)), iterations=1)
    _, _, stats, centers = cv2.connectedComponentsWithStats(mask, 8)

    comps = []
    for index, (x, y, w, h, area) in enumerate(stats[1:], start=1):
        if area > 20000 and w > 250 and h > 250:
            comps.append((int(x), int(y), int(w), int(h), float(centers[index][1])))

    comps.sort(key=lambda item: item[4])
    rows: list[list[tuple[int, int, int, int, float]]] = []
    for comp in comps:
        if not rows or abs(rows[-1][0][4] - comp[4]) > 650:
            rows.append([comp])
        else:
            rows[-1].append(comp)

    boxes: list[tuple[int, int, int, int]] = []
    for row in rows:
        row.sort(key=lambda item: item[0])
        boxes.extend((x, y, w, h) for x, y, w, h, _ in row)

    if len(boxes) != 12:
        raise RuntimeError(f"Expected 12 cars, detected {len(boxes)}")
    return boxes


def remove_background(crop: Image.Image) -> Image.Image:
    rgba = np.array(crop.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.int16)
    alpha = rgba[:, :, 3]

    # Only remove the connected near-white area from crop edges so white car
    # bodies remain intact.
    near_white = np.all(rgb > 246, axis=2).astype(np.uint8)
    h, w = near_white.shape
    work = near_white.copy()
    mask = np.zeros((h + 2, w + 2), np.uint8)

    for x in range(w):
        if work[0, x]:
            cv2.floodFill(work, mask, (x, 0), 2)
        if work[h - 1, x]:
            cv2.floodFill(work, mask, (x, h - 1), 2)
    for y in range(h):
        if work[y, 0]:
            cv2.floodFill(work, mask, (0, y), 2)
        if work[y, w - 1]:
            cv2.floodFill(work, mask, (w - 1, y), 2)

    rgba[:, :, 3] = np.where(work == 2, 0, alpha)
    out = Image.fromarray(rgba, "RGBA")
    bbox = out.getchannel("A").getbbox()
    if bbox:
        out = out.crop(bbox)
    pad = 12
    padded = Image.new("RGBA", (out.width + pad * 2, out.height + pad * 2), (0, 0, 0, 0))
    padded.alpha_composite(out, (pad, pad))
    ratio = TARGET_HEIGHT / padded.height
    return padded.resize((round(padded.width * ratio), TARGET_HEIGHT), Image.Resampling.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE)
    rows = []
    for idx, (box, (slug, label)) in enumerate(zip(detect_boxes(image), NAMES), start=1):
        x, y, w, h = box
        margin = 54
        crop = image.crop((max(0, x - margin), max(0, y - margin), min(image.width, x + w + margin), min(image.height, y + h + margin)))
        sprite = remove_background(crop)
        filename = f"top_car_{slug}_{idx:02d}.png"
        sprite.save(OUT_DIR / filename, optimize=True)
        rows.append({"id": f"car_{idx:02d}", "name": label, "file": filename, "width": sprite.width, "height": sprite.height})

    (OUT_DIR / "manifest.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"Extracted {len(rows)} top-view car sprites to {OUT_DIR}")


if __name__ == "__main__":
    main()
