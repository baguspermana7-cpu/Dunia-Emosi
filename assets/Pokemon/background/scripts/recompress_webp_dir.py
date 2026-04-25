#!/usr/bin/env python3
import argparse
import io
from pathlib import Path
from typing import Iterable, Tuple

from PIL import Image


def recompress_to_max_bytes(path: Path, max_bytes: int) -> Tuple[bool, int, Tuple[int, int]]:
    src = Image.open(path).convert("RGB")
    original_size = src.size

    quality_steps = [88, 84, 80, 76, 72, 68, 64, 60, 56, 52, 48, 44, 40, 36, 32]
    scale_steps = [1.0, 0.96, 0.92, 0.88, 0.84, 0.80, 0.76, 0.72, 0.68, 0.64]

    best = None
    best_size = original_size
    current_bytes = path.stat().st_size

    for scale in scale_steps:
        if scale == 1.0:
            img = src
        else:
            w = max(1, int(round(original_size[0] * scale)))
            h = max(1, int(round(original_size[1] * scale)))
            img = src.resize((w, h), Image.LANCZOS)
        for quality in quality_steps:
            out = io.BytesIO()
            img.save(out, format="WEBP", quality=quality, method=6)
            data = out.getvalue()
            if best is None or len(data) < len(best):
                best = data
                best_size = img.size
            if len(data) <= max_bytes:
                path.write_bytes(data)
                return True, len(data), img.size

    if best is not None and len(best) < current_bytes:
        path.write_bytes(best)
        return False, len(best), best_size
    return False, current_bytes, original_size


def iter_webps(paths: Iterable[Path]) -> Iterable[Path]:
    for root in paths:
        if root.is_file() and root.suffix.lower() == ".webp":
            yield root
            continue
        if root.is_dir():
            yield from sorted(root.glob("*.webp"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Recompress WebP files to a target max byte size.")
    parser.add_argument("paths", nargs="+", help="Directories or files to process")
    parser.add_argument("--max-bytes", type=int, default=60000)
    args = parser.parse_args()

    processed = 0
    exact_hits = 0
    reduced_only = 0
    untouched = 0

    for file_path in iter_webps([Path(p) for p in args.paths]):
        before = file_path.stat().st_size
        if before <= args.max_bytes:
            untouched += 1
            continue
        processed += 1
        hit_target, after, dims = recompress_to_max_bytes(file_path, args.max_bytes)
        if hit_target:
            exact_hits += 1
            print(f"OK {file_path.name} {before}->{after} {dims[0]}x{dims[1]}")
        else:
            reduced_only += 1
            print(f"WARN {file_path.name} {before}->{after} {dims[0]}x{dims[1]}")

    print(
        f"processed={processed} exact_hits={exact_hits} reduced_only={reduced_only} untouched={untouched}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
