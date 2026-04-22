#!/usr/bin/env python3
"""Extract side-view train crops from public Freepik search preview images.

The script intentionally uses only public listing metadata and skips premium
items. It does not download source vectors, bypass login, or remove watermarks.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import math
import re
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from bs4 import BeautifulSoup
from PIL import Image


DEFAULT_BASE_URL = "https://www.freepik.com/vectors/db-train"
TRAIN_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = TRAIN_DIR / "others"
SOURCE_DOMAIN = "https://www.freepik.com"


@dataclass
class FreepikItem:
    id: int
    name: str
    slug: str
    url: str
    preview_url: str
    preview_width: int
    preview_height: int
    author: str
    page: int


def fetch_url(url: str, timeout: int = 40) -> bytes:
    result = subprocess.run(
        [
            "curl",
            "-L",
            "--fail",
            "--silent",
            "--show-error",
            "--max-time",
            str(timeout),
            url,
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout


def listing_url(base_url: str, page: int) -> str:
    return base_url if page == 1 else f"{base_url.rstrip('/')}/{page}"


def parse_listing(html: bytes, page: int) -> tuple[list[FreepikItem], int]:
    soup = BeautifulSoup(html, "html.parser")
    script = soup.find("script", id="__NEXT_DATA__")
    if not script or not script.string:
        raise RuntimeError(f"Freepik page {page} did not contain __NEXT_DATA__ JSON")

    data = json.loads(script.string)
    page_props = data["props"]["pageProps"]
    items: list[FreepikItem] = []
    for raw in page_props.get("items", []):
        if raw.get("premium") or raw.get("type") != "vector":
            continue
        preview = raw.get("preview") or {}
        preview_url = preview.get("url")
        if not preview_url:
            continue
        name = raw.get("name") or raw.get("slug") or f"freepik-{raw['id']}"
        author = ((raw.get("author") or {}).get("name") or "").strip()
        items.append(
            FreepikItem(
                id=int(raw["id"]),
                name=name.strip(),
                slug=(raw.get("slug") or slugify(name)).strip(),
                url=raw.get("url") or "",
                preview_url=preview_url,
                preview_width=int(preview.get("width") or 0),
                preview_height=int(preview.get("height") or 0),
                author=author,
                page=page,
            )
        )
    return items, int(page_props.get("lastPage") or page)


def slugify(value: str, max_len: int = 72) -> str:
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value[:max_len].strip("-") or "train"


def estimate_model_label(name: str) -> tuple[str, str, str]:
    text = name.lower()
    if any(word in text for word in ["steam", "antique", "locomotive", "old train"]):
        return "estimated-steam-locomotive", "estimated", "steam locomotive"
    if "diesel" in text:
        return "estimated-diesel-locomotive", "estimated", "diesel locomotive"
    if any(word in text for word in ["metro", "subway", "underground", "mrt"]):
        return "estimated-metro-emu", "estimated", "metro EMU"
    if "tram" in text:
        return "estimated-tram", "estimated", "tram / light rail"
    if any(word in text for word in ["high-speed", "high speed", "bullet", "speeding", "express"]):
        return "estimated-high-speed-emu", "estimated", "high-speed EMU"
    if any(word in text for word in ["wagon", "carriage"]):
        return "estimated-rail-car", "estimated", "rail car / wagon"
    return "estimated-train-sideview", "estimated", "generic train side-view"


def decode_image(data: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(data))
    image.load()
    return image.convert("RGBA")


def border_background(rgb: np.ndarray) -> np.ndarray:
    top = rgb[: max(2, rgb.shape[0] // 40), :, :]
    bottom = rgb[-max(2, rgb.shape[0] // 40) :, :, :]
    left = rgb[:, : max(2, rgb.shape[1] // 40), :]
    right = rgb[:, -max(2, rgb.shape[1] // 40) :, :]
    border = np.concatenate(
        [top.reshape(-1, 3), bottom.reshape(-1, 3), left.reshape(-1, 3), right.reshape(-1, 3)],
        axis=0,
    )
    return np.median(border, axis=0)


def foreground_mask(image: Image.Image) -> np.ndarray:
    rgba = np.array(image.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.int16)
    alpha = rgba[:, :, 3]
    bg = border_background(rgb)
    diff = np.sqrt(np.sum((rgb - bg) ** 2, axis=2))
    mask = ((diff > 30) & (alpha > 10)).astype(np.uint8) * 255

    height, width = mask.shape
    open_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    close_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (max(19, width // 45), max(7, height // 140)),
    )
    dilate_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (max(15, width // 60), max(5, height // 180)),
    )
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, open_kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, close_kernel, iterations=1)
    mask = cv2.dilate(mask, dilate_kernel, iterations=1)
    return mask


def merge_boxes(boxes: list[tuple[int, int, int, int]], image_width: int, image_height: int) -> list[tuple[int, int, int, int]]:
    if not boxes:
        return []

    boxes = sorted(boxes, key=lambda box: (box[1], box[0]))
    merged: list[tuple[int, int, int, int]] = []
    for box in boxes:
        x, y, w, h = box
        joined = False
        for index, existing in enumerate(merged):
            ex, ey, ew, eh = existing
            same_row = abs((y + h / 2) - (ey + eh / 2)) <= max(h, eh) * 0.55
            gap = max(x - (ex + ew), ex - (x + w), 0)
            if same_row and gap <= image_width * 0.04:
                nx = min(x, ex)
                ny = min(y, ey)
                nr = max(x + w, ex + ew)
                nb = max(y + h, ey + eh)
                merged[index] = (nx, ny, nr - nx, nb - ny)
                joined = True
                break
        if not joined:
            merged.append(box)
    return merged


def candidate_boxes(image: Image.Image) -> list[tuple[int, int, int, int, float]]:
    mask = foreground_mask(image)
    height, width = mask.shape
    count, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)

    raw_boxes: list[tuple[int, int, int, int]] = []
    min_width = max(95, int(width * 0.16))
    min_height = max(24, int(height * 0.035))
    for index in range(1, count):
        x, y, w, h, area = stats[index]
        aspect = w / max(h, 1)
        if w < min_width or h < min_height:
            continue
        if aspect < 2.05:
            continue
        if area < width * height * 0.002:
            continue
        if h > height * 0.55 and w > width * 0.75:
            continue
        if y > height * 0.90:
            continue
        raw_boxes.append((int(x), int(y), int(w), int(h)))

    merged = merge_boxes(raw_boxes, width, height)
    boxes: list[tuple[int, int, int, int, float]] = []
    for x, y, w, h in merged:
        aspect = w / max(h, 1)
        score = aspect * math.sqrt(w * h)
        pad_x = max(8, int(w * 0.04))
        pad_y = max(8, int(h * 0.12))
        x0 = max(0, x - pad_x)
        y0 = max(0, y - pad_y)
        x1 = min(width, x + w + pad_x)
        y1 = min(height, y + h + pad_y)
        boxes.append((x0, y0, x1 - x0, y1 - y0, score))

    boxes.sort(key=lambda box: (box[1], box[0]))
    return boxes[:10]


def remove_connected_background(crop: Image.Image) -> Image.Image:
    rgba = np.array(crop.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.int16)
    alpha = rgba[:, :, 3]
    bg = border_background(rgb)
    diff = np.sqrt(np.sum((rgb - bg) ** 2, axis=2))
    candidate = ((diff < 36) & (alpha > 0)).astype(np.uint8)

    h, w = candidate.shape
    flood_mask = np.zeros((h + 2, w + 2), np.uint8)
    work = candidate.copy()
    for x in range(w):
        if work[0, x]:
            cv2.floodFill(work, flood_mask, (x, 0), 2)
        if work[h - 1, x]:
            cv2.floodFill(work, flood_mask, (x, h - 1), 2)
    for y in range(h):
        if work[y, 0]:
            cv2.floodFill(work, flood_mask, (0, y), 2)
        if work[y, w - 1]:
            cv2.floodFill(work, flood_mask, (w - 1, y), 2)

    remove = work == 2
    rgba[:, :, 3] = np.where(remove, 0, alpha)
    result = Image.fromarray(rgba, "RGBA")
    bbox = result.getchannel("A").getbbox()
    if bbox:
        result = result.crop(bbox)
    pad = max(12, round(result.width * 0.025))
    padded = Image.new("RGBA", (result.width + pad * 2, result.height + pad * 2), (0, 0, 0, 0))
    padded.alpha_composite(result, (pad, pad))
    return padded


def normalize_output(image: Image.Image, max_width: int) -> Image.Image:
    if image.width > max_width:
        ratio = max_width / image.width
        image = image.resize((max_width, max(1, round(image.height * ratio))), Image.Resampling.LANCZOS)
    elif image.width < 420:
        ratio = 420 / image.width
        image = image.resize((420, max(1, round(image.height * ratio))), Image.Resampling.LANCZOS)
    return image


def item_pages(base_url: str, max_pages: int) -> Iterable[tuple[int, list[FreepikItem], int]]:
    last_page = max_pages
    for page in range(1, max_pages + 1):
        html = fetch_url(listing_url(base_url, page))
        items, reported_last_page = parse_listing(html, page)
        last_page = min(max_pages, reported_last_page)
        yield page, items, last_page
        if page >= last_page:
            break
        time.sleep(0.15)


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-crops", type=int, default=420)
    parser.add_argument("--max-pages", type=int, default=50)
    parser.add_argument("--max-width", type=int, default=1024)
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--manifest-name", default="_freepik_manifest.csv")
    return parser


def main() -> None:
    args = build_arg_parser().parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output_dir / args.manifest_name
    rows: list[dict[str, object]] = []
    seen_item_ids: set[int] = set()
    crop_count = 0

    for page, items, last_page in item_pages(args.base_url, args.max_pages):
        print(f"page {page}/{last_page}: {len(items)} free vector previews")
        for item in items:
            if item.id in seen_item_ids:
                continue
            seen_item_ids.add(item.id)

            try:
                image = decode_image(fetch_url(item.preview_url))
            except (subprocess.CalledProcessError, urllib.error.URLError, OSError, RuntimeError) as exc:
                print(f"  skip download {item.id}: {exc}")
                continue

            boxes = candidate_boxes(image)
            if not boxes:
                continue

            label, confidence, model_guess = estimate_model_label(item.name)
            for crop_index, (x, y, w, h, score) in enumerate(boxes, start=1):
                crop = image.crop((x, y, x + w, y + h))
                crop = remove_connected_background(crop)
                if crop.width < 180 or crop.height < 32:
                    continue
                crop = normalize_output(crop, args.max_width)

                filename = f"freepik_{label}_{item.id}_{crop_index:02d}_{slugify(item.slug, 48)}.png"
                output_path = args.output_dir / filename
                crop.save(output_path, optimize=True)
                rows.append(
                    {
                        "filename": filename,
                        "source_id": item.id,
                        "source_page": item.page,
                        "source_name": item.name,
                        "source_url": item.url,
                        "search_url": args.base_url,
                        "preview_url": item.preview_url,
                        "author": item.author,
                        "crop_index": crop_index,
                        "estimated_model": model_guess,
                        "confidence": confidence,
                        "bbox_x": x,
                        "bbox_y": y,
                        "bbox_width": w,
                        "bbox_height": h,
                        "score": round(score, 2),
                        "output_width": crop.width,
                        "output_height": crop.height,
                    }
                )
                crop_count += 1
                if crop_count >= args.target_crops:
                    break
            if crop_count >= args.target_crops:
                break
        if crop_count >= args.target_crops:
            break

    if rows:
        with manifest_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
    print(f"created {crop_count} crops in {args.output_dir}")
    print(f"manifest: {manifest_path}")


if __name__ == "__main__":
    main()
