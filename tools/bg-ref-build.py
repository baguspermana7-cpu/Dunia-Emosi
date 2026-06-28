#!/usr/bin/env python3
"""
bg-ref-build.py — g14 reference-accurate background pipeline (A-312)
====================================================================
Per owner reference image `assets/train/bg-ref/levelNN.png`, produce:
  1. a per-level PALETTE override (sky / hills / ground colours sampled from the
     reference) so the procedural sky+hills+rail match the reference exactly, and
  2. a vectorised CITY-BAND  (the icon monument + skyline, traced to a layered
     colour SVG via vtracer) → rendered once to a cached texture at runtime.
  3. a MANIFEST `data/g14-journey/levelNN.json` the game loads at scene build.

The procedural sky/hills/rail/props stay animated + cheap (owner's throttled
tablet); only the detailed city band is reference-exact. SVG = flat polygons,
crisp at any size, one draw call when cached to a RenderTexture.

Usage:
  python3 tools/bg-ref-build.py 1-30        # range
  python3 tools/bg-ref-build.py 1,4,7        # list
  python3 tools/bg-ref-build.py all          # every levelNN.* found
  python3 tools/bg-ref-build.py 3 --selftest # synth a fake ref to validate flow

Tuning per level: drop `data/g14-journey/levelNN.json` with a `bandRatios`
{ "skyBot":0.50, "bandTop":0.42, "bandBot":0.72 } (or `skyKeyTol`) BEFORE running
to override the auto defaults; the pipeline preserves your overrides.
"""
import sys, os, json, glob, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_DIR = os.path.join(ROOT, "assets/train/bg-ref")
CITY_DIR = os.path.join(ROOT, "assets/train/cityband")
BACK_DIR = os.path.join(ROOT, "assets/train/backdrop")
MAN_DIR = os.path.join(ROOT, "data/g14-journey")
for d in (REF_DIR, CITY_DIR, BACK_DIR, MAN_DIR):
    os.makedirs(d, exist_ok=True)

DEFAULT_BAND = {"skyBot": 0.50, "bandTop": 0.42, "bandBot": 0.72, "skyKeyTol": 42}
# Y-centres of the 3 rail lanes as a fraction of the IMAGE height — aligned to the
# painted rails in the painterly mockups (consistent template). Per-image tunable
# via a levelNN.json `laneRatios` override before running.
DEFAULT_LANES = {"lanes": [0.62, 0.74, 0.86], "horizon": 0.46, "foreTop": 0.92}
# Crop the painted-in UI bands off the top + bottom so only scenery + rails remain
# (the real CSS HUD provides the UI). Keep rows [top*H .. bot*H]. Per-level override.
DEFAULT_SCENE_CROP = {"top": 0.175, "bot": 0.795}
# v55.75 PARALLAX bands for clean plates: horizontal depth slices of the flat
# painterly image, each scrolled at `speed` × S.speed so the near ground rushes
# by while the horizon drifts (3D-ish motion from one image). Boundaries sit on
# natural ground lines (rails-top, foreground) to minimise tearing. y0/y1 = frac.
DEFAULT_BANDS = [
    {"y0": 0.000, "y1": 0.480, "speed": 0.12},  # sky + far scenery + village (ONE band: no building tear)
    {"y0": 0.480, "y1": 0.568, "speed": 0.55},  # rail bed, far  -.
    {"y0": 0.568, "y1": 0.656, "speed": 0.63},  #               |  eased speed ramp =
    {"y0": 0.656, "y1": 0.744, "speed": 0.75},  #               |  smooth perspective depth
    {"y0": 0.744, "y1": 0.832, "speed": 0.89},  #               |  (far slow -> near fast)
    {"y0": 0.832, "y1": 0.920, "speed": 1.05},  # rail bed, near-'
    {"y0": 0.920, "y1": 1.000, "speed": 1.12},  # foreground grass (fastest)
]
# RASTER backdrop tiers (px width). Runtime picks the smallest tier ≥ screen.width*dpr,
# else the largest. v55.78 A-313 — 3-tier set: 640 (small phones), 1024 (large phones /
# mid), 1600 (near-native, source ≈1672 → crisp on an 11" tablet @dpr2 which needs ~2388px
# and would otherwise upscale the old 1280). Dropping the redundant 960/1280 mids + q80
# keeps the total smaller (owner: "compress a bit") while the tablet gets a sharper plate.
RASTER_TIERS = [1600, 1024, 640]
RASTER_QUALITY = 80   # WebP q80 method6 — visually lossless for painterly art, smaller than q82


def _hex(rgb):
    return "0x%02x%02x%02x" % (int(rgb[0]), int(rgb[1]), int(rgb[2]))


def _median(arr):
    import numpy as np
    if arr.size == 0:
        return (128, 128, 128)
    return tuple(int(x) for x in np.median(arr.reshape(-1, arr.shape[-1])[:, :3], axis=0))


def _zone(px, y0, y1):
    """Median RGB of horizontal band rows [y0,y1) ignoring near-transparent."""
    import numpy as np
    H = px.shape[0]
    a, b = max(0, int(y0)), min(H, int(y1))
    if b <= a:
        b = min(H, a + 1)
    sl = px[a:b]
    if sl.shape[-1] == 4:
        mask = sl[..., 3] > 40
        vis = sl[mask]
        if vis.size:
            return _median(vis)
    return _median(sl)


def sample_palette(img, band):
    """Sample a procedural palette from the reference so sky/hills/ground match."""
    import numpy as np
    px = np.asarray(img.convert("RGBA"))
    H = px.shape[0]
    skyB = band["skyBot"]
    bandT, bandB = band["bandTop"], band["bandBot"]
    sky_top = _zone(px, 0, H * skyB * 0.34)
    sky_mid = _zone(px, H * skyB * 0.34, H * skyB * 0.7)
    sky_bot = _zone(px, H * skyB * 0.7, H * skyB)
    mtn = _zone(px, H * (skyB - 0.04), H * bandT)            # far hills behind the city
    grnd1 = _zone(px, H * bandB, H * (bandB + (1 - bandB) * 0.5))
    grnd2 = _zone(px, H * (bandB + (1 - bandB) * 0.5), H)
    def darker(c, f=0.78):
        return tuple(int(v * f) for v in c)
    return {
        "skyTop": _hex(sky_top), "skyMid": _hex(sky_mid), "skyBot": _hex(sky_bot),
        "haze": _hex(sky_bot),
        "mtnFar": _hex(mtn),
        "hill1": _hex(darker(grnd1, 0.9)), "hill2": _hex(grnd1), "hill3": _hex(grnd2),
        "grass": _hex(grnd2), "grassDk": _hex(darker(grnd2)),
    }


# Unique key colour painted over the knocked-out sky so vtracer (which FLATTENS
# alpha) traces it as its own colour; the key-colour paths are then stripped from
# the SVG, leaving the sky genuinely transparent. Picked to never collide with art.
KEY_RGB = (253, 0, 254)


def cut_cityband(img, band, out_png_key, out_webp):
    """Crop the city band; everything above the per-column skyline becomes (a) the
    KEY colour in the PNG fed to vtracer, and (b) truly transparent in the WebP
    fallback. Returns (w, h)."""
    import numpy as np
    px = np.asarray(img.convert("RGBA")).copy()
    H, W = px.shape[0], px.shape[1]
    y0, y1 = int(H * band["bandTop"]), int(H * band["bandBot"])
    tol = band.get("skyKeyTol", 42)
    crop = px[y0:y1].copy()
    ch, cw = crop.shape[0], crop.shape[1]
    keyed = crop.copy()
    # Per-column LOCAL sky reference = median of the few rows just ABOVE the band
    # (gradient-safe; each column keys against the sky directly over it). Columns
    # whose "above" is already a building keep their opaque pixels.
    above = px[max(0, y0 - 8):y0, :, :3].astype(np.int16)
    sky_ref = np.median(above, axis=0) if above.shape[0] else np.full((cw, 3), 200)
    for x in range(cw):
        col = crop[:, x, :3].astype(np.int16)
        d = np.abs(col - sky_ref[x]).sum(axis=1)
        hit = np.where(d > tol)[0]
        top = hit[0] if hit.size else ch
        crop[:top, x, 3] = 0                       # webp: real transparency
        keyed[:top, x, :3] = KEY_RGB               # vtracer: key colour
        keyed[:top, x, 3] = 255
    from PIL import Image
    Image.fromarray(keyed, "RGBA").convert("RGB").save(out_png_key)
    Image.fromarray(crop, "RGBA").save(out_webp, "WEBP", quality=92, method=6)
    return (cw, ch)


def _strip_key_paths(svg_path):
    """Remove <path> elements whose fill is the sky KEY colour (or a full-canvas
    base layer of it) so the sky reads transparent in Pixi's loadSvg."""
    import re
    txt = open(svg_path).read()
    kr, kg, kb = KEY_RGB

    def near_key(hexc):
        r, g, b = int(hexc[0:2], 16), int(hexc[2:4], 16), int(hexc[4:6], 16)
        return abs(r - kr) + abs(g - kg) + abs(b - kb) < 60
    out, removed = [], 0
    for m in re.finditer(r'<path[^>]*?/>', txt):
        el = m.group(0)
        fm = re.search(r'fill="#([0-9A-Fa-f]{6})"', el)
        if fm and near_key(fm.group(1)):
            removed += 1
            continue
        out.append(el)
    head = txt[:txt.index('<path')] if '<path' in txt else txt.split('>')[0] + '>\n'
    open(svg_path, "w").write(head + "\n".join(out) + "\n</svg>\n")
    return removed


def vectorise(in_png_key, out_svg):
    try:
        import vtracer
    except Exception as e:
        print("  ! vtracer unavailable (%s) — keeping WebP fallback only" % e)
        return False
    # 'cutout' hierarchy = non-overlapping colour regions (no full-canvas base
    # under everything) → the keyed sky becomes its own removable region.
    vtracer.convert_image_to_svg_py(
        in_png_key, out_svg,
        colormode="color", mode="polygon", hierarchical="cutout",
        filter_speckle=4, color_precision=6, layer_difference=16,
        corner_threshold=60, path_precision=3,
    )
    removed = _strip_key_paths(out_svg)
    print("  vtracer ok (%d sky path(s) stripped)" % removed)
    return True


def raster_tiers(ref, level):
    """A/B winner for PAINTERLY art: emit multi-resolution WebP tiers (full scene,
    pixel-perfect, 1 sprite at runtime). Returns the tier list for the manifest."""
    from PIL import Image
    tiers = []
    for w in RASTER_TIERS:
        if w > ref.size[0]:
            continue
        h = round(ref.size[1] * w / ref.size[0])
        im = ref.convert("RGB").resize((w, h), Image.LANCZOS)
        out = os.path.join(BACK_DIR, "level%02d-%d.webp" % (level, w))
        im.save(out, "WEBP", quality=RASTER_QUALITY, method=6)
        tiers.append({"w": w, "src": "assets/train/backdrop/level%02d-%d.webp" % (level, w)})
    return tiers


def process(level, selftest=False, mode="raster", force_clean=False):
    from PIL import Image
    man_path = os.path.join(MAN_DIR, "level%02d.json" % level)
    band = dict(DEFAULT_BAND)
    lanes = dict(DEFAULT_LANES)
    if os.path.exists(man_path):
        try:
            prev = json.load(open(man_path))
            band.update(prev.get("bandRatios", {}))
            # read the RAW (uncropped) lane ratios so re-runs are idempotent — the
            # cropped `laneRatios` the runtime uses is derived fresh each build.
            lanes.update(prev.get("laneRatiosRaw", prev.get("laneRatios", {})))
        except Exception:
            pass

    if selftest:
        ref = _synth_ref()
    else:
        # prefer the LaMa-cleaned plate (painted train/obstacles removed) if it
        # exists; else the raw owner reference.
        clean = os.path.join(ROOT, "assets/train/bg-clean", "level%02d.png" % level)
        hits = [clean] if os.path.exists(clean) else []
        for ext in ("png", "webp", "jpg", "jpeg"):
            hits += glob.glob(os.path.join(REF_DIR, "level%02d.%s" % (level, ext)))
            hits += glob.glob(os.path.join(REF_DIR, "level%d.%s" % (level, ext)))
        if not hits:
            print("L%02d: no reference image in assets/train/bg-ref/ — skipped" % level)
            return False
        ref = Image.open(hits[0]).convert("RGBA")   # hits[0] = cleaned plate if present, else raw ref

    # ── RASTER mode (default; A/B-chosen for painterly art) ──
    if mode == "raster":
        palette = sample_palette(ref, band)
        # read per-level config (clean flag + parallax bands + laneRatios)
        prev_cfg = {}
        if os.path.exists(man_path):
            try:
                prev_cfg = json.load(open(man_path))
            except Exception:
                prev_cfg = {}

        # ── CLEAN plate path (v55.75): the owner's "clean version" images are ALREADY
        # scenery + rails only (no UI, no train) → NO inpaint, NO crop. Feed the full
        # frame to the runtime PARALLAX engine, which slices it into depth bands. ──
        # v55.77 — --clean (force_clean) lets brand-new levels (no manifest yet, e.g.
        # 35-48) take this path with DEFAULT_BANDS/DEFAULT_LANES instead of wrongly
        # falling through to the inpaint/crop path meant for the old painted mockups.
        if force_clean or prev_cfg.get("clean"):
            bands = prev_cfg.get("bands", DEFAULT_BANDS)
            lanes2 = dict(lanes)
            lanes2["lanes"] = prev_cfg.get("laneRatios", {}).get("lanes", DEFAULT_LANES["lanes"])
            tiers = raster_tiers(ref, level)
            manifest = {
                "level": level, "mode": "raster", "clean": True,
                "backdrop": {"tiers": tiers, "aspect": round(ref.size[0] / ref.size[1], 4)},
                "bands": bands, "laneRatios": lanes2, "laneRatiosRaw": {"lanes": lanes2["lanes"]},
                "palette": palette,
            }
            json.dump(manifest, open(man_path, "w"), indent=2)
            _index_add(level)
            print("L%02d: CLEAN parallax backdrop (%d bands) + manifest" % (level, len(bands)))
            return True

        # v55.74 — the owner's mockups have the game UI (HUD, controls, station
        # progress bar) PAINTED into the top + bottom bands. Crop to the clean
        # gameplay band so ONLY scenery + rails remain (the real CSS HUD overlays
        # the screen edges). Per-level override: levelNN.json "sceneCrop".
        sc = dict(DEFAULT_SCENE_CROP)
        if os.path.exists(man_path):
            try:
                sc.update(json.load(open(man_path)).get("sceneCrop", {}))
            except Exception:
                pass
        W0, H0 = ref.size
        ct, cb = max(0.0, sc["top"]), min(1.0, sc["bot"])
        if cb - ct < 0.3:
            ct, cb = DEFAULT_SCENE_CROP["top"], DEFAULT_SCENE_CROP["bot"]
        ref = ref.crop((0, int(H0 * ct), W0, int(H0 * cb)))
        # remap the RAW lane Y-ratios into the cropped frame so the rails still
        # align; store both (raw = stable source for idempotent re-runs).
        span = cb - ct
        raw_lanes = list(lanes.get("lanes", DEFAULT_LANES["lanes"]))
        cropped = dict(lanes)
        cropped["lanes"] = [round((r - ct) / span, 4) for r in raw_lanes]
        tiers = raster_tiers(ref, level)
        manifest = {
            "level": level, "mode": "raster",
            "backdrop": {"tiers": tiers, "aspect": round(ref.size[0] / ref.size[1], 4)},
            "laneRatios": cropped, "laneRatiosRaw": {"lanes": raw_lanes},
            "palette": palette,
        }
        json.dump(manifest, open(man_path, "w"), indent=2)
        _index_add(level)
        print("L%02d: RASTER backdrop (%d tiers) + manifest" % (level, len(tiers)))
        return True

    # ── VECTOR mode (city-band cutout; kept for flat-art levels) ──
    palette = sample_palette(ref, band)
    webp = os.path.join(CITY_DIR, "level%02d.webp" % level)
    svg = os.path.join(CITY_DIR, "level%02d.svg" % level)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        tmp = tf.name
    try:
        cut_cityband(ref, band, tmp, webp)         # keyed PNG → tmp, transparent WebP → webp
        has_svg = vectorise(tmp, svg)
    finally:
        os.unlink(tmp)

    manifest = {
        "level": level,
        "bandRatios": band,
        "palette": palette,
        "cityband": ("assets/train/cityband/level%02d.svg" % level) if has_svg else None,
        "citybandWebp": "assets/train/cityband/level%02d.webp" % level,
    }
    json.dump(manifest, open(man_path, "w"), indent=2)
    _index_add(level)
    print("L%02d: palette+%s+manifest written (%s)" % (
        level, "svg" if has_svg else "webp-only", os.path.basename(man_path)))
    return True


def _index_add(level):
    """Keep data/g14-journey/index.json in sync so the game only fetches a
    manifest for levels that have one (no 404s / console errors elsewhere)."""
    idx_path = os.path.join(MAN_DIR, "index.json")
    levels = []
    if os.path.exists(idx_path):
        try:
            levels = json.load(open(idx_path)).get("levels", [])
        except Exception:
            levels = []
    if level not in levels:
        levels.append(level)
    json.dump({"levels": sorted(set(levels))}, open(idx_path, "w"), indent=2)


def _synth_ref():
    """A fake reference (gradient sky + skyline rectangles + green ground) to
    validate the whole pipeline without a real image."""
    from PIL import Image, ImageDraw
    W, H = 900, 600
    im = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    for y in range(H):
        if y < H * 0.5:
            t = y / (H * 0.5)
            d.line([(0, y), (W, y)], fill=(int(120 + 80 * t), int(180 + 50 * t), 235, 255))
        else:
            d.line([(0, y), (W, y)], fill=(90, 160 - int(40 * (y / H)), 80, 255))
    # skyline buildings within the band 0.42..0.72 (tops stay below bandTop)
    import random
    random.seed(7)
    base = int(H * 0.70)
    for x in range(40, W - 40, 70):
        bh = random.randint(40, 110)
        d.rectangle([x, base - bh, x + 48, int(H * 0.72)], fill=(70, 80, 110, 255))
    # a central "monument" (apex below bandTop=0.42 so its sky keys out cleanly)
    d.polygon([(W // 2 - 26, int(H * 0.72)), (W // 2, int(H * 0.45)), (W // 2 + 26, int(H * 0.72))],
              fill=(60, 70, 90, 255))
    return im


def parse_levels(arg):
    out = []
    if arg == "all":
        for f in glob.glob(os.path.join(REF_DIR, "level*.*")):
            b = os.path.basename(f)
            try:
                out.append(int("".join(c for c in b.split(".")[0] if c.isdigit())))
            except Exception:
                pass
        return sorted(set(out))
    for part in arg.split(","):
        if "-" in part:
            a, b = part.split("-")
            out += range(int(a), int(b) + 1)
        else:
            out.append(int(part))
    return sorted(set(out))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    selftest = "--selftest" in sys.argv
    mode = "vector" if "--vector" in sys.argv else "raster"   # raster = A/B winner (painterly)
    force_clean = "--clean" in sys.argv   # v55.77 — force clean-parallax path for new plates
    levels = parse_levels([a for a in sys.argv[1:] if not a.startswith("--")][0])
    ok = 0
    for lv in levels:
        if process(lv, selftest=selftest, mode=mode, force_clean=force_clean):
            ok += 1
    print("\n%d/%d level(s) built (mode=%s)." % (ok, len(levels), mode))
