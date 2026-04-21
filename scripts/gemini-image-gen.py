#!/usr/bin/env python3
"""Generate a Gemini image and save as compressed WebP.

Enforces the Dunia-Emosi 'Gemini -> WebP' asset standard
(see documentation and standarization/CODING-STANDARDS.md):
raw PNG output from Gemini is held in memory only and never
written to disk. The final asset is always a compressed WebP.

Usage:
  GEMINI_API_KEY=... python3 scripts/gemini-image-gen.py \\
    --prompt-file prompts/banner-game17.txt \\
    --out assets/banner-game17.webp \\
    [--max-width 1200] [--quality 82] [--method 6]

Env:
  GEMINI_API_KEY  (required)  - your rotated Gemini key

Output:
  WebP only. Exit code 0 on success, non-zero on any failure.
"""
import argparse
import base64
import io
import json
import os
import sys
import urllib.error
import urllib.request

from PIL import Image

MODEL = "gemini-2.5-flash-image-preview"
ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{MODEL}:generateContent"
)


def read_prompt(path: str) -> str:
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read().strip()


def generate(prompt: str, out_path: str, max_width: int, quality: int,
             method: int) -> None:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("ERROR: GEMINI_API_KEY env var not set", file=sys.stderr)
        sys.exit(1)
    url = f"{ENDPOINT}?key={key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=180).read()
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode(errors="replace")[:600]
        print(f"Gemini API HTTP {exc.code}: {body_text}", file=sys.stderr)
        sys.exit(2)

    data = json.loads(resp)
    parts = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if not inline:
            continue
        img_bytes = base64.b64decode(inline["data"])
        img = Image.open(io.BytesIO(img_bytes))
        if img.mode != "RGB":
            img = img.convert("RGB")
        img.thumbnail((max_width, max_width), Image.LANCZOS)
        os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
        img.save(out_path, "WEBP", quality=quality, method=method)
        size = os.path.getsize(out_path)
        print(
            f"OK: {out_path} ({size} bytes, "
            f"{img.size[0]}x{img.size[1]} WebP q={quality})"
        )
        return

    print(
        "No image in Gemini response (first 500 chars):",
        json.dumps(data)[:500],
        file=sys.stderr,
    )
    sys.exit(3)


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Generate a Gemini image and save as WebP."
    )
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--prompt", help="Inline prompt text.")
    src.add_argument(
        "--prompt-file",
        help="Path to a text file containing the prompt.",
    )
    ap.add_argument(
        "--out",
        required=True,
        help="Target path ending in .webp",
    )
    ap.add_argument("--max-width", type=int, default=1200)
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--method", type=int, default=6)
    args = ap.parse_args()

    if not args.out.lower().endswith(".webp"):
        print("ERROR: --out must end with .webp", file=sys.stderr)
        sys.exit(1)

    prompt = args.prompt or read_prompt(args.prompt_file)
    generate(prompt, args.out, args.max_width, args.quality, args.method)


if __name__ == "__main__":
    main()
