#!/usr/bin/env python3
"""
bg-inpaint.py — remove the painted game elements (train, obstacles, quiz bubble,
stars, cones) from the owner's reference backgrounds with LaMa inpainting, so the
backdrop is ONLY scenery + rails (the real game sprites render on top).
(A-312 — owner: "elemen di gambar bg harus dihilangkan … bersih, proper detail").

Per level, the mask = manual element rects from data/g14-journey/levelNN.mask.json
(authored by inspecting each image) PLUS an optional auto bright-prop threshold.
Output: assets/train/bg-clean/levelNN.png (the cleaned plate that bg-ref-build.py
then crops + tiles from).

Usage:
  python3 tools/bg-inpaint.py 7            # one level
  python3 tools/bg-inpaint.py 2-12         # range

Mask config `data/g14-journey/levelNN.mask.json`:
  { "rects": [[x0,y0,x1,y1], ...],   # fractions 0..1 of the image (element boxes)
    "auto": true }                   # also colour-threshold bright cones/stars/bubble
"""
import sys, os, json
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_DIR = os.path.join(ROOT, "assets/train/bg-ref")
CLEAN_DIR = os.path.join(ROOT, "assets/train/bg-clean")
MASK_DIR = os.path.join(ROOT, "data/g14-journey")
os.makedirs(CLEAN_DIR, exist_ok=True)

_MODEL = os.path.join(ROOT, "tools/models/big-lama.pt")
_LAMA = None
_DEV = None
def lama():
    """Load the LaMa TorchScript model directly (the pip wrapper fails to build on
    py3.13; the model + torch+CUDA work fine)."""
    global _LAMA, _DEV
    if _LAMA is None:
        import torch
        _DEV = "cuda" if torch.cuda.is_available() else "cpu"
        _LAMA = torch.jit.load(_MODEL, map_location=_DEV).eval()
    return _LAMA


def _pad_mod8(arr):
    h, w = arr.shape[:2]
    ph, pw = (8 - h % 8) % 8, (8 - w % 8) % 8
    if arr.ndim == 3:
        return np.pad(arr, ((0, ph), (0, pw), (0, 0)), mode="symmetric"), (h, w)
    return np.pad(arr, ((0, ph), (0, pw)), mode="symmetric"), (h, w)


def lama_inpaint(im_pil, mask_pil):
    """Erase the white-mask region and fill it. Returns a PIL RGB image."""
    import torch
    model = lama()
    img = np.asarray(im_pil.convert("RGB"), dtype=np.float32) / 255.0
    msk = (np.asarray(mask_pil.convert("L")) > 0).astype(np.float32)
    img_p, (h, w) = _pad_mod8(img)
    msk_p, _ = _pad_mod8(msk)
    it = torch.from_numpy(img_p).permute(2, 0, 1).unsqueeze(0).to(_DEV)
    mt = torch.from_numpy(msk_p).unsqueeze(0).unsqueeze(0).to(_DEV)
    with torch.no_grad():
        out = model(it, mt)
    out = out[0].permute(1, 2, 0).clamp(0, 1).mul(255).byte().cpu().numpy()[:h, :w]
    from PIL import Image
    return Image.fromarray(out, "RGB")


def build_mask(im, cfg):
    """White (255) where to erase. Manual rects + optional bright-prop threshold."""
    import cv2
    W, H = im.size
    m = np.zeros((H, W), np.uint8)
    for (x0, y0, x1, y1) in cfg.get("rects", []):
        cv2.rectangle(m, (int(x0 * W), int(y0 * H)), (int(x1 * W), int(y1 * H)), 255, -1)
    if cfg.get("auto"):
        # catch the bright orange cones + yellow stars + white speech bubble, but
        # ONLY inside the rail/play band so we don't erase real scenery.
        bandT, bandB = int(H * cfg.get("autoTop", 0.44)), int(H * cfg.get("autoBot", 0.74))
        hsv = cv2.cvtColor(np.array(im.convert("RGB")), cv2.COLOR_RGB2HSV)
        # only the distinctly-saturated game props (orange cones/sparks, yellow
        # stars). NOT white — the quiz bubble is covered by an explicit rect so we
        # never risk masking light rails/ballast.
        orange = cv2.inRange(hsv, (5, 120, 130), (28, 255, 255))
        yellow = cv2.inRange(hsv, (26, 130, 170), (40, 255, 255))
        auto = cv2.bitwise_or(orange, yellow)
        band = np.zeros_like(auto); band[bandT:bandB, :] = 255
        auto = cv2.bitwise_and(auto, band)
        m = cv2.bitwise_or(m, auto)
    # dilate so edges/shadows of the elements are fully covered
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)), iterations=2)
    return m


def process(level):
    from PIL import Image
    import glob
    hits = []
    for ext in ("png", "webp", "jpg", "jpeg"):
        hits += glob.glob(os.path.join(REF_DIR, "level%02d.%s" % (level, ext)))
    if not hits:
        print("L%02d: no source in bg-ref/ — skipped" % level); return False
    im = Image.open(sorted(hits)[0]).convert("RGB")
    mask_path = os.path.join(MASK_DIR, "level%02d.mask.json" % level)
    if not os.path.exists(mask_path):
        print("L%02d: no mask config (%s) — skipped" % (level, os.path.basename(mask_path))); return False
    cfg = json.load(open(mask_path))
    m = build_mask(im, cfg)
    from PIL import Image as I
    mask_img = I.fromarray(m, "L")
    # debug: save the mask overlay
    out = os.path.join(CLEAN_DIR, "level%02d.png" % level)
    res = lama_inpaint(im, mask_img)
    res.convert("RGB").save(out)
    mask_img.save(os.path.join(CLEAN_DIR, "level%02d.mask.png" % level))
    print("L%02d: inpainted -> %s" % (level, os.path.relpath(out, ROOT)))
    return True


def parse_levels(arg):
    out = []
    for part in str(arg).split(","):
        if "-" in part:
            a, b = part.split("-"); out += range(int(a), int(b) + 1)
        elif part.strip():
            out.append(int(part))
    return sorted(set(out))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    for lv in parse_levels(sys.argv[1]):
        process(lv)
