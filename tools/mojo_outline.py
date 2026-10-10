"""
White STICKER OUTLINE for the G31 Mojo character and vehicle sprites, baked in at ingest.

Owner, 2026-10-03: "There's still a little white. We should give it a white outline line to disguise it." Any pale
edge pixel the cut-out keeps now sits on a clean, deliberate white ring instead of reading as a ragged halo.

    import mojo_outline
    out, (ox, oy) = mojo_outline.outline(rgba_uint8_array, t)   # t = ring thickness in source px

Method (pure function of the input array: deterministic, and every tool applies it ONCE to the clean in-memory
cut-out, never to a published file, so a re-run can never double-outline):
  * silhouette = alpha > 0, EXCLUDING the translucent pure-black floor shadow the cleaners write (rgb 0, alpha < 250):
    that shadow is drawn beneath the ring, so a car stands on its own shadow instead of the shadow getting a halo.
  * exterior = transparent pixels connected to the canvas border. Only the exterior is outlined: an enclosed
    see-through gap (a cab window, the gap between Bo's arm and body) stays transparent, never a white slab.
  * ring = exterior pixels within t px of the silhouette (Euclidean distance transform = a round structuring
    element), pure white at full alpha, with a 1 px anti-aliased outer edge (alpha = t + 0.5 - d).
  * a soft dark ring SHADOW_W px wide outside the white (alpha <= SHADOW_A, fading out) keeps the outline legible
    on snow, clouds and other pale backdrops.
  * the art is composited OVER the ring. A fully opaque art pixel is copied bit-exactly; its 1-3 px anti-aliased
    rim is blended over white, so its leftover pale page pixels become part of the outline.
  * the canvas is padded by pad(t) = t + SHADOW_W + 1 on every side, so nothing is ever clipped; the art moves by
    (pad, pad). Callers that need a tight canvas crop to the bbox and carry the offset.
"""
import numpy as np
from scipy import ndimage

FRAC = 0.025          # ring thickness = 2.5% of the sprite's shorter side ...
MIN_T, MAX_T = 3, 8   # ... clamped to 3-8 source px (renders ~2-3 CSS px at the usual display sizes)
SHADOW_W = 2          # px of soft dark ring outside the white
SHADOW_A = 0.22       # its peak alpha
EDGE_DEPTH = 3        # art pixels this close to the exterior get white beneath them (their anti-aliased rim)
WHITE = 255


def thickness(short_side):
    """Ring thickness (source px) for an art silhouette whose shorter side is short_side px."""
    return int(min(MAX_T, max(MIN_T, round(FRAC * float(short_side)))))


def short_side(rgba):
    """Shorter side of the opaque (alpha >= 128) art bbox; 0 for an empty sprite."""
    a = np.asarray(rgba)[..., 3] >= 128
    ys, xs = np.nonzero(a)
    if not len(ys):
        return 0
    return int(min(ys.max() - ys.min() + 1, xs.max() - xs.min() + 1))


def family_thickness(sprites):
    """ONE thickness for a family drawn at one scale (shared canvas): from the median shorter side."""
    sides = [short_side(s) for s in sprites]
    sides = [s for s in sides if s]
    return thickness(float(np.median(sides))) if sides else MIN_T


def pad(t):
    return int(t) + SHADOW_W + 1


def floor_shadow_mask(rgba):
    """The cleaners' translucent BLACK floor shadow (clean-mojo-sprites.to_shadow): rgb exactly 0, alpha < 250."""
    a = np.asarray(rgba)
    return (a[..., 3] > 0) & (a[..., 3] < 250) & (a[..., :3].max(2) == 0)


def _over(top_rgb, top_a, bot_rgb, bot_a):
    """Porter-Duff OVER, straight alpha, float arrays (a in 0..1)."""
    out_a = top_a + bot_a * (1.0 - top_a)
    num = top_rgb * top_a[..., None] + bot_rgb * (bot_a * (1.0 - top_a))[..., None]
    out_rgb = np.where(out_a[..., None] > 0, num / np.maximum(out_a, 1e-9)[..., None], 0.0)
    return out_rgb, out_a


def rings(mask, t):
    """(white alpha, shadow alpha, exterior) for a silhouette mask already padded by pad(t)."""
    lab, _ = ndimage.label(~mask)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    exterior = np.isin(lab, border[border > 0])
    dist = ndimage.distance_transform_edt(~mask)               # distance to the nearest art pixel
    white = np.where(exterior, np.clip(t + 0.5 - dist, 0.0, 1.0), 0.0)
    depth = ndimage.distance_transform_edt(~exterior)          # art pixels: distance in from the exterior
    white[mask & (depth <= EDGE_DEPTH)] = 1.0
    shadow = np.where(exterior, SHADOW_A * np.clip((t + SHADOW_W + 0.5 - dist) / SHADOW_W, 0.0, 1.0), 0.0)
    return white, shadow, exterior


# Owner 2026-10-10: "asset yang saya kasih itu no background jadi tinggal crop dan nggak perlu ada outline putih".
# MOJO_NO_RING=1 keeps the exact padded canvas and crop box of the ringed sprite (so sizes, anchors, baselines and
# RING tables do not move) but paints NO white ring and NO dark rim: the art is cut straight from its alpha.
import os as _os
NO_RING = _os.environ.get('MOJO_NO_RING') == '1'
_RING_BOX = {}


def outline(rgba, t, shadow=True):
    """rgba (H, W, 4) uint8 -> (outlined (H+2p, W+2p, 4) uint8, (p, p) offset of the original's pixel 0,0)."""
    src = np.asarray(rgba, dtype=np.uint8)
    p = pad(t)
    big = np.zeros((src.shape[0] + 2 * p, src.shape[1] + 2 * p, 4), np.uint8)
    big[p:p + src.shape[0], p:p + src.shape[1]] = src
    floor = floor_shadow_mask(big)
    mask = (big[..., 3] > 0) & ~floor
    if not mask.any():
        return big, (p, p)
    white_a, shadow_a, _ = rings(mask, t)
    if not shadow:
        shadow_a = np.zeros_like(shadow_a)
    black = np.zeros(big.shape[:2] + (3,), np.float64)
    rgb, a = black, shadow_a                                   # soft dark ring
    fa = np.where(floor, big[..., 3] / 255.0, 0.0)
    rgb, a = _over(black, fa, rgb, a)                          # the art's own floor shadow
    rgb, a = _over(np.full_like(black, WHITE), white_a, rgb, a)  # the white ring
    art_a = np.where(floor, 0.0, big[..., 3] / 255.0)
    rgb, a = _over(big[..., :3].astype(np.float64), art_a, rgb, a)
    out = np.dstack([np.clip(np.rint(rgb), 0, 255), np.clip(np.rint(a * 255.0), 0, 255)]).astype(np.uint8)
    opaque = big[..., 3] == 255                                # bit-exact inside the silhouette
    out[opaque] = big[opaque]
    out[out[..., 3] == 0] = 0
    if NO_RING:
        ys, xs = np.nonzero(out[..., 3])
        art = big.copy()
        art[floor] = big[floor]                                 # keep the art's own floor shadow, nothing else
        art[art[..., 3] == 0] = 0
        _RING_BOX[id(art)] = (ys.min(), ys.max() + 1, xs.min(), xs.max() + 1) if len(ys) else None
        return art, (p, p)
    return out, (p, p)


def crop_tight(rgba, offset):
    """Crop an outlined array to its alpha bbox; returns (array, new offset of the original's pixel 0,0)."""
    box = _RING_BOX.pop(id(rgba), None)
    a = np.asarray(rgba)
    if box:                                                    # no-ring mode: crop to where the ring would have been
        y0, y1, x0, x1 = box
    else:
        ys, xs = np.nonzero(a[..., 3])
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return a[y0:y1, x0:x1].copy(), (offset[0] - int(x0), offset[1] - int(y0))


# ---------------------------------------------------------------------------------------------- QA helpers
def _exterior_depth(al):
    solid = al > 0
    lab, _ = ndimage.label(~solid)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    exterior = np.isin(lab, border[border > 0])
    return exterior, ndimage.distance_transform_edt(~exterior)


def ring_mask(rgba, t, white_min=235):
    """The outline as published: near-white (every channel >= white_min, lossy WebP) or translucent pixels within
    t + SHADOW_W + 1.5 px of the coloured art, CONNECTED to the open outside (through translucent pixels too, so
    the ring under a car's tyres is reached across its floor shadow). Enclosed white paint (eye whites, a white
    panel behind a dark rim) and enclosed see-through holes are never part of it."""
    a = np.asarray(rgba)
    al = a[..., 3].astype(np.int16)
    light = a[..., :3].astype(np.int16).min(2) >= white_min
    core = (al >= 200) & ~light
    near = ndimage.distance_transform_edt(~core) <= t + SHADOW_W + 1.5 if core.any() else np.zeros(al.shape, bool)
    soft = (al > 0) & (al < 200)
    cand = (al > 0) & (light | soft) & near
    exterior, _ = _exterior_depth(al)
    reach = ndimage.binary_propagation(exterior, mask=exterior | cand | soft)
    return reach & cand


def peel(rgba, t, white_min=235):
    """The published sprite with its outline ring removed (transparent), so fringe/halo/slab measures see the
    art only. Art is never removed except near-white paint inside the outer band, which is visually ring."""
    a = np.asarray(rgba).copy()
    a[ring_mask(a, t, white_min)] = 0
    return a


def ring_stats(rgba, t, white_min=235):
    """coverage  share of the art's exterior-facing boundary that has an OPAQUE near-white ring pixel within 2 px
       thickness median width of the opaque white ring next to the art (distance to the translucent outside)
       clipped   opaque (alpha >= 200) pixels on the canvas edge rows/columns (a ring cut by the canvas)"""
    a = np.asarray(rgba)
    al = a[..., 3].astype(np.int16)
    ring = ring_mask(a, t, white_min)
    art = (al >= 200) & ~ring          # the floor shadow (translucent) is not art
    exterior, _ = _exterior_depth(al)
    k = np.ones((3, 3), bool)
    outside = ring | exterior
    boundary = art & ndimage.binary_dilation(outside, structure=k)
    # only the boundary that faces the EXTERIOR through the ring (not an enclosed hole)
    reach = ndimage.binary_propagation(exterior, mask=outside)
    boundary &= ndimage.binary_dilation(reach, structure=k)
    white = ring & (al >= 230) & (a[..., :3].astype(np.int16).min(2) >= white_min)
    near = ndimage.binary_dilation(white, structure=k, iterations=2)
    cover = float((boundary & near).sum()) / max(int(boundary.sum()), 1)
    soft = ndimage.distance_transform_edt(al >= 128)          # distance to the translucent outside
    inner = white & ndimage.binary_dilation(art, structure=k)
    width = float(np.median(soft[inner])) if inner.any() else 0.0
    edge = np.zeros(al.shape, bool)
    edge[0] = edge[-1] = True
    edge[:, 0] = edge[:, -1] = True
    return {'coverage': cover, 'thickness': width, 'clipped': int((edge & (al >= 200)).sum())}
