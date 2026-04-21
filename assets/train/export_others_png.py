#!/usr/bin/env python3
"""Export clean transparent train PNGs for the `others` train asset folder."""

from __future__ import annotations

import csv
import json
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image


TRAIN_DIR = Path(__file__).resolve().parent
DATABASE = TRAIN_DIR / "trains-database.json"
OUTPUT_DIR = TRAIN_DIR / "others"
MAX_WIDTH = 1024
PADDING = 24
DENSITY = 384


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def number(value: str | None, fallback: float = 0.0) -> float:
    if value is None:
        return fallback
    match = re.search(r"-?\d+(?:\.\d+)?", value)
    return float(match.group(0)) if match else fallback


def viewbox_size(root: ET.Element) -> tuple[float, float]:
    view_box = root.get("viewBox")
    if view_box:
        parts = [float(part) for part in re.split(r"[\s,]+", view_box.strip())]
        if len(parts) == 4:
            return parts[2], parts[3]
    return number(root.get("width"), 200), number(root.get("height"), 120)


def is_bottom_track_line(element: ET.Element, width: float, height: float) -> bool:
    if local_name(element.tag) != "line":
        return False
    x1 = number(element.get("x1"))
    x2 = number(element.get("x2"))
    y1 = number(element.get("y1"))
    y2 = number(element.get("y2"))
    return abs(y1 - y2) <= 0.5 and y1 >= height * 0.78 and abs(x2 - x1) >= width * 0.45


def is_bottom_track_rect(element: ET.Element, width: float, height: float) -> bool:
    if local_name(element.tag) != "rect":
        return False
    y = number(element.get("y"))
    w = number(element.get("width"))
    h = number(element.get("height"))
    fill = (element.get("fill") or "").lower()
    greyish = fill in {"#777", "#888", "#999", "#555", "#444"}
    return y >= height * 0.78 and w >= width * 0.45 and h <= height * 0.12 and greyish


def is_bottom_track_ellipse(element: ET.Element, width: float, height: float) -> bool:
    if local_name(element.tag) != "ellipse":
        return False
    cy = number(element.get("cy"))
    rx = number(element.get("rx"))
    return cy >= height * 0.78 and rx >= width * 0.2 and (element.get("fill") or "").lower() == "none"


def sanitize_svg(source: Path) -> str:
    tree = ET.parse(source)
    root = tree.getroot()
    width, height = viewbox_size(root)

    for parent in root.iter():
        for child in list(parent):
            tag = local_name(child.tag)
            if tag == "text":
                parent.remove(child)
            elif is_bottom_track_line(child, width, height):
                parent.remove(child)
            elif is_bottom_track_rect(child, width, height):
                parent.remove(child)
            elif is_bottom_track_ellipse(child, width, height):
                parent.remove(child)

    return ET.tostring(root, encoding="unicode")


def slug(value: str) -> str:
    value = value.strip().lower().replace("×", "x").replace("+", "-plus-")
    value = value.replace("/", "-").replace("'", "")
    value = re.sub(r"[^a-z0-9-]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def alpha_trim(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return image
    image = image.crop(bbox)
    padded = Image.new("RGBA", (image.width + PADDING * 2, image.height + PADDING * 2), (0, 0, 0, 0))
    padded.alpha_composite(image, (PADDING, PADDING))
    if padded.width > MAX_WIDTH:
        ratio = MAX_WIDTH / padded.width
        padded = padded.resize((MAX_WIDTH, round(padded.height * ratio)), Image.Resampling.LANCZOS)
    return padded


def render_png(source_svg: Path, output_png: Path) -> tuple[int, int]:
    cleaned_svg = sanitize_svg(source_svg)
    with tempfile.TemporaryDirectory(prefix="train-export-") as temp_dir:
        temp_svg = Path(temp_dir) / "clean.svg"
        temp_png = Path(temp_dir) / "render.png"
        temp_svg.write_text(cleaned_svg, encoding="utf-8")
        subprocess.run(
            ["magick", "-background", "none", "-density", str(DENSITY), str(temp_svg), str(temp_png)],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        image = alpha_trim(Image.open(temp_png))
    image.save(output_png, optimize=True)
    return image.size


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    data = json.loads(DATABASE.read_text(encoding="utf-8"))
    manifest_rows = []

    for train in data["trains"]:
        if train.get("character"):
            continue
        source_svg = TRAIN_DIR / Path(train["icon"]).name
        if not source_svg.exists():
            continue

        axle_slug = slug(train.get("wheel_arrangement") or train.get("type") or "train")
        filename = f"{axle_slug}_{slug(train['id'])}.png"
        output_png = OUTPUT_DIR / filename
        try:
            width, height = render_png(source_svg, output_png)
        except (ET.ParseError, subprocess.CalledProcessError) as exc:
            print(f"Skipped {source_svg.name}: {exc}")
            continue
        manifest_rows.append(
            {
                "filename": filename,
                "source_svg": source_svg.name,
                "id": train["id"],
                "name": train["name"],
                "wheel_arrangement": train.get("wheel_arrangement", ""),
                "model_type": train.get("model_type", ""),
                "type": train["type"],
                "country": train["country"],
                "year": train["year"],
                "width": width,
                "height": height,
            }
        )

    manifest_path = OUTPUT_DIR / "_manifest.csv"
    with manifest_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(manifest_rows[0].keys()))
        writer.writeheader()
        writer.writerows(manifest_rows)

    print(f"Exported {len(manifest_rows)} PNG files to {OUTPUT_DIR}")
    print(f"Wrote manifest to {manifest_path}")


if __name__ == "__main__":
    main()
