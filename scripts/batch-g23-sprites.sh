#!/bin/bash
# Batch process all G23 Pokemon runner sprites.
# Run from repo root: bash scripts/batch-g23-sprites.sh
#
# Output: assets/Pokemon/g23/*.webp|png
# All sprites: 480×400px physical (240×200 CSS at DPR=2), transparent, bottom-aligned.

set -e
UPLOADS="/home/baguspermana7/.claude/uploads/c58644e4-cfc2-4099-9de4-70f989a3b3f7"
OUT="assets/Pokemon/g23"
PY="python3 scripts/process-g23-sprite.py"
COMMON="--canvas-w 240 --canvas-h 200 --dpr 2 --quality 92"

echo "=== G23 Sprite Batch Processor ==="
echo "Output dir: $OUT"
echo ""

# ── White/simple background GIFs ─────────────────────────────

echo "[1/16] Arcanine (complex scene bg → rembg)"
$PY "$UPLOADS/e8f70355-1001069511.gif" "$OUT/arcanine.webp" \
  $COMMON --method rembg

echo "[2/16] Lycanroc Dusk (white bg)"
$PY "$UPLOADS/04674913-1001069522.gif" "$OUT/lycanroc.webp" \
  $COMMON --method auto --tolerance 30 --fringe 1

echo "[3/16] Cinderace pixel (white bg, faces LEFT → mirror)"
$PY "$UPLOADS/7691c84c-1001069521.gif" "$OUT/cinderace.webp" \
  $COMMON --method auto --tolerance 18 --fringe 0 --mirror

echo "[4/16] Eevee (white bg)"
$PY "$UPLOADS/10d668ae-1001069514.gif" "$OUT/eevee.webp" \
  $COMMON --method auto --tolerance 26 --fringe 1

echo "[5/16] Pichu (white bg)"
$PY "$UPLOADS/d6460aae-1001069515.gif" "$OUT/pichu.webp" \
  $COMMON --method auto --tolerance 30 --fringe 1

echo "[6/16] Umbreon (white bg, large 1280×720)"
$PY "$UPLOADS/86dd4d46-1001069516.gif" "$OUT/umbreon.webp" \
  $COMMON --method auto --tolerance 26 --fringe 1

echo "[7/16] Raichu (white bg, large 1200×675)"
$PY "$UPLOADS/1dc5c0be-1001069518.gif" "$OUT/raichu.webp" \
  $COMMON --method auto --tolerance 32 --fringe 1

echo "[8/16] Sandshrew (white bg, 48 frames)"
$PY "$UPLOADS/e06c20e0-1001069529.gif" "$OUT/sandshrew.webp" \
  $COMMON --method auto --tolerance 25 --fringe 1

echo "[9/16] Mudkip pixel (white bg)"
$PY "$UPLOADS/4b5b5f51-1001069530.gif" "$OUT/mudkip.webp" \
  $COMMON --method auto --tolerance 18 --fringe 0

# ── Already-transparent WebP (just place on canvas) ──────────

echo "[10/16] Pikachu chibi (already transparent)"
$PY "$UPLOADS/665d18fa-1001069512.webp" "$OUT/pikachu.webp" \
  $COMMON --method skip

echo "[11/16] Jolteon pixel (already transparent)"
$PY "$UPLOADS/8fc8530e-1001069513.webp" "$OUT/jolteon.webp" \
  $COMMON --method skip

echo "[12/16] Emolga pixel (already transparent, 98 frames)"
$PY "$UPLOADS/6bb92a2d-1001069527.webp" "$OUT/emolga.webp" \
  $COMMON --method skip

echo "[13/16] Furret (already transparent, 16 frames)"
$PY "$UPLOADS/e61095a1-1001069528.webp" "$OUT/furret.webp" \
  $COMMON --method skip

# ── Psyduck: complex scene bg (anime floor/wall) → rembg ─────

echo "[14/16] Psyduck (anime scene bg → rembg)"
$PY "$UPLOADS/2c337e15-1001069533.webp" "$OUT/psyduck.webp" \
  $COMMON --method rembg

# ── Static PNGs ───────────────────────────────────────────────

echo "[15/16] Chespin (white bg, static PNG)"
$PY "$UPLOADS/e8d06923-1001069519.png" "$OUT/chespin.png" \
  $COMMON --method auto --tolerance 25 --fringe 1

echo "[16/16] Lucario pixel (white bg, faces LEFT → mirror, static PNG)"
$PY "$UPLOADS/f1828f5e-1001069517.png" "$OUT/lucario.png" \
  $COMMON --method auto --tolerance 18 --fringe 0 --mirror

echo ""
echo "=== All done ==="
ls -lh "$OUT/"
