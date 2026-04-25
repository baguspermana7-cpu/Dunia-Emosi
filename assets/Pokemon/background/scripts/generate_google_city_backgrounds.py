#!/usr/bin/env python3
import argparse
import base64
import io
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PIL import Image


PREDICT_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:predict"
GENERATE_CONTENT_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)
STYLE_SUFFIX = (
    " Rendering style: vibrant anime colouring, modern Pokemon XYZ-inspired TV-anime "
    "background polish, clean cel shading, luminous particles, subtle magical spark "
    "effects, rich gradient skies, crisp outlines, readable layered depth, cinematic "
    "light shafts, and a polished game-ready environment look. Avoid photorealism."
)


def _with_style_suffix(prompt: str) -> str:
    if STYLE_SUFFIX.strip() in prompt:
        return prompt
    return prompt + STYLE_SUFFIX


def _read_jobs(path: Path) -> List[Dict[str, str]]:
    jobs: List[Dict[str, str]] = []
    for line_no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid JSON at {path}:{line_no}: {exc}") from exc
        if "prompt" not in item or "out" not in item:
            raise SystemExit(f"Missing prompt/out at {path}:{line_no}")
        jobs.append(item)
    return jobs


def _aspect_ratio_from_size(size_value: str) -> str:
    normalized = (size_value or "").strip().lower()
    if normalized == "1536x1024":
        return "16:9"
    if normalized == "1024x1536":
        return "9:16"
    if normalized == "1024x1024":
        return "1:1"
    raise SystemExit(f"Unsupported size value for Imagen mapping: {size_value}")


def _build_payload(prompt: str, size_value: str) -> bytes:
    payload = {
        "instances": [{"prompt": _with_style_suffix(prompt)}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": _aspect_ratio_from_size(size_value),
            "imageSize": "1K",
            "personGeneration": "dont_allow",
        },
    }
    return json.dumps(payload).encode("utf-8")


def _build_generate_content_payload(prompt: str, size_value: str) -> bytes:
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {
                "aspectRatio": _aspect_ratio_from_size(size_value),
            }
        },
    }
    return json.dumps(payload).encode("utf-8")


def _extract_image_bytes(response_obj: Dict[str, object]) -> bytes:
    predictions = response_obj.get("predictions")
    if not isinstance(predictions, list) or not predictions:
        raise RuntimeError(f"Unexpected response shape: missing predictions: {response_obj}")

    candidate = predictions[0]
    if not isinstance(candidate, dict):
        raise RuntimeError(f"Unexpected prediction payload: {candidate!r}")

    for key in ("bytesBase64Encoded", "imageBytes", "b64"):
        raw = candidate.get(key)
        if isinstance(raw, str) and raw:
            return base64.b64decode(raw)

    nested = candidate.get("image")
    if isinstance(nested, dict):
        for key in ("imageBytes", "bytesBase64Encoded", "b64"):
            raw = nested.get(key)
            if isinstance(raw, str) and raw:
                return base64.b64decode(raw)

    raise RuntimeError(f"Could not find image bytes in response: {response_obj}")


def _call_http_json(req: Request) -> Dict[str, object]:
    try:
        with urlopen(req, timeout=180) as resp:
            body = resp.read()
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network error: {exc}") from exc

    try:
        return json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON response: {body[:500]!r}") from exc


def _extract_generate_content_image_bytes(response_obj: Dict[str, object]) -> bytes:
    candidates = response_obj.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError(f"Unexpected response shape: missing candidates: {response_obj}")
    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        content = candidate.get("content")
        if not isinstance(content, dict):
            continue
        parts = content.get("parts")
        if not isinstance(parts, list):
            continue
        for part in parts:
            if not isinstance(part, dict):
                continue
            inline_data = part.get("inlineData") or part.get("inline_data")
            if isinstance(inline_data, dict):
                raw = inline_data.get("data")
                if isinstance(raw, str) and raw:
                    return base64.b64decode(raw)
    raise RuntimeError(f"Could not find inline image data in response: {response_obj}")


def _call_imagen(api_key: str, prompt: str, size_value: str, model: str) -> bytes:
    if model.startswith("gemini-"):
        req = Request(
            GENERATE_CONTENT_URL_TEMPLATE.format(model=model),
            data=_build_generate_content_payload(prompt, size_value),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            method="POST",
        )
        parsed = _call_http_json(req)
        return _extract_generate_content_image_bytes(parsed)

    req = Request(
        PREDICT_URL_TEMPLATE.format(model=model),
        data=_build_payload(prompt, size_value),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )
    parsed = _call_http_json(req)
    return _extract_image_bytes(parsed)


def _retry_delay_seconds(exc: Exception) -> Optional[float]:
    text = str(exc)
    patterns = [
        r"Please retry in ([0-9]+(?:\.[0-9]+)?)s",
        r"retryDelay\": \"([0-9]+)s\"",
        r"retryDelay\": \"([0-9]+(?:\.[0-9]+)?)s\"",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                return None
    return None


def _convert_to_webp_under_limit(
    png_or_jpeg_bytes: bytes,
    *,
    max_bytes: int,
) -> Tuple[bytes, Dict[str, object]]:
    img = Image.open(io.BytesIO(png_or_jpeg_bytes)).convert("RGB")
    original_size = img.size
    current = img

    quality_steps = [92, 88, 84, 80, 76, 72, 68, 64, 60, 56, 52, 48, 44, 40]
    scale_steps = [1.0, 0.96, 0.92, 0.88, 0.84, 0.80, 0.76, 0.72]

    best: Optional[bytes] = None
    best_meta: Dict[str, object] = {}

    for scale in scale_steps:
        if scale != 1.0:
            w = max(1, int(round(original_size[0] * scale)))
            h = max(1, int(round(original_size[1] * scale)))
            current = img.resize((w, h), Image.LANCZOS)
        else:
            current = img

        for quality in quality_steps:
            out = io.BytesIO()
            current.save(
                out,
                format="WEBP",
                quality=quality,
                method=6,
            )
            data = out.getvalue()
            size_now = len(data)

            if not best or size_now < len(best):
                best = data
                best_meta = {
                    "quality": quality,
                    "size": current.size,
                    "bytes": size_now,
                }

            if size_now <= max_bytes:
                return data, {
                    "quality": quality,
                    "size": current.size,
                    "bytes": size_now,
                    "original_size": original_size,
                }

    if best is None:
        raise RuntimeError("Failed to produce WEBP output.")
    return best, {
        "quality": best_meta["quality"],
        "size": best_meta["size"],
        "bytes": best_meta["bytes"],
        "original_size": original_size,
        "warning": "Could not reach max-bytes target; wrote smallest WEBP variant found.",
    }


def _iter_selected(
    jobs: List[Dict[str, str]],
    *,
    start_index: int,
    end_index: Optional[int],
    limit: Optional[int],
) -> Iterable[Tuple[int, Dict[str, str]]]:
    selected = jobs[start_index - 1 :]
    if end_index is not None:
        selected = selected[: max(0, end_index - start_index + 1)]
    if limit is not None:
        selected = selected[:limit]
    for idx, job in enumerate(selected, start=start_index):
        yield idx, job


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Pokemon city backgrounds with Google Imagen.")
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--model", default="imagen-4.0-fast-generate-001")
    parser.add_argument("--input", required=True, help="JSONL file produced for a single aspect ratio")
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--max-bytes", type=int, default=60 * 1024)
    parser.add_argument("--start-index", type=int, default=1)
    parser.add_argument("--end-index", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--sleep-seconds", type=float, default=1.0)
    parser.add_argument("--max-attempts", type=int, default=3)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    input_path = Path(args.input)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    jobs = _read_jobs(input_path)

    summary: List[Dict[str, object]] = []
    for idx, job in _iter_selected(
        jobs,
        start_index=args.start_index,
        end_index=args.end_index,
        limit=args.limit,
    ):
        out_name = Path(str(job["out"])).with_suffix(".webp").name
        out_path = out_dir / out_name

        if out_path.exists() and not args.overwrite:
            print(f"[{idx}/{len(jobs)}] skip existing {out_path.name}", file=sys.stderr)
            continue

        prompt = str(job["prompt"])
        size_value = str(job.get("size", "1024x1024"))

        print(f"[{idx}/{len(jobs)}] generating {out_path.name}", file=sys.stderr)
        if args.dry_run:
            print(json.dumps({"out": str(out_path), "size": size_value, "prompt": _with_style_suffix(prompt)}))
            continue

        image_bytes = None
        last_error: Optional[Exception] = None
        for attempt in range(1, max(args.max_attempts, 1) + 1):
            try:
                image_bytes = _call_imagen(args.api_key, prompt, size_value, args.model)
                break
            except Exception as exc:  # Retry transient API failures for long batch runs.
                last_error = exc
                if attempt >= max(args.max_attempts, 1):
                    raise
                wait_s = _retry_delay_seconds(exc)
                if wait_s is None:
                    wait_s = min(30.0, 3.0 * attempt)
                print(
                    f"[{idx}/{len(jobs)}] attempt {attempt} failed: {exc}; retrying in {wait_s:.1f}s",
                    file=sys.stderr,
                )
                time.sleep(wait_s)
        if image_bytes is None:
            raise RuntimeError(f"Image generation failed: {last_error}")
        webp_bytes, meta = _convert_to_webp_under_limit(image_bytes, max_bytes=args.max_bytes)
        out_path.write_bytes(webp_bytes)

        result = {
            "index": idx,
            "output": str(out_path),
            "bytes": meta["bytes"],
            "size": meta["size"],
            "original_size": meta["original_size"],
        }
        if "warning" in meta:
            result["warning"] = meta["warning"]
            print(f"[{idx}/{len(jobs)}] warning {out_path.name}: {meta['warning']}", file=sys.stderr)
        summary.append(result)
        print(
            f"[{idx}/{len(jobs)}] wrote {out_path.name} {meta['size'][0]}x{meta['size'][1]} {meta['bytes']} bytes",
            file=sys.stderr,
        )
        time.sleep(max(args.sleep_seconds, 0.0))

    summary_path = out_dir / "_generation_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Wrote summary to {summary_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
