#!/usr/bin/env bash
# check-regressions.sh — guards against re-introducing fixed bug classes.
# Run before every commit (or in CI). Each rule references the hotfix that
# introduced it.
#
# Usage:  ./scripts/check-regressions.sh
# Exit:   0 = all clean | 1 = at least one rule failed
#
# Add a new rule by appending a `check_*` function and calling it in `main`.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2

FAIL=0
red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$*"; }

# Helper: report a violation. Args: rule_id, file:line, fix_hint.
violation() {
  red "FAIL [$1]"
  echo "  $2"
  echo "  fix: $3"
  FAIL=1
}

# ---------------------------------------------------------------------------
# Rule G13-LAYOUT-1 (Hotfix #116 / Lesson L57)
# `.g13-field` must NOT have grid-template-rows:1fr inside a media query —
# that collapses the 2x2 diagonal grid and detaches .g13-player-info.
# ---------------------------------------------------------------------------
check_g13_grid_collapse() {
  # Look for grid-template-rows:1fr (with optional whitespace + !important)
  # inside a media-query block that also references .g13-field.
  local hits
  hits=$(awk '
    /^@media/ { in_mq=1; mq_start=NR; buf="" }
    in_mq    { buf = buf "\n" NR ":" $0 }
    /^}/ && in_mq {
      if (buf ~ /\.g13-field/ && buf ~ /grid-template-rows[^}]*1fr[^}]*!important/) {
        print "style.css media block @ line " mq_start
      }
      in_mq=0; buf=""
    }
  ' style.css)
  if [ -n "$hits" ]; then
    violation "G13-LAYOUT-1" "$hits" "remove grid-template-rows:1fr override; keep 2x2 in landscape (see GAME_LAYOUT_STANDARD.md)"
  fi
}

# ---------------------------------------------------------------------------
# Rule G13-LAYOUT-2 (Hotfix #116)
# `.g13-wild-info` and `.g13-player-info` must declare explicit grid-column
# AND grid-row — otherwise auto-flow breaks under media-query changes.
# ---------------------------------------------------------------------------
check_g13_explicit_placement() {
  for sel in '.g13-wild-info' '.g13-player-info'; do
    # Extract the rule body and verify both grid-column and grid-row appear.
    local body
    body=$(awk -v s="$sel" '
      $0 ~ s"\\s*\\{" || $0 ~ s"\\s*$" { in_rule=1 }
      in_rule { print }
      in_rule && /^}/ { in_rule=0 }
    ' style.css)
    if [ -n "$body" ]; then
      echo "$body" | grep -q "grid-column" || violation "G13-LAYOUT-2" "style.css $sel" "add explicit grid-column to $sel"
      echo "$body" | grep -q "grid-row"    || violation "G13-LAYOUT-2" "style.css $sel" "add explicit grid-row to $sel"
    fi
  done
}

# ---------------------------------------------------------------------------
# Rule Z-INDEX-1 (Hotfix #116 / Lesson L58)
# `.g10-party-overlay` z-index must be ≥ 700 to outrank evo (600), result/
# reward (500), and base modal (300).
# ---------------------------------------------------------------------------
check_party_overlay_zindex() {
  local zline z
  zline=$(awk '
    /^\.g10-party-overlay\s*\{/ { in_rule=1 }
    in_rule && /z-index/ { print NR ":" $0; exit }
    in_rule && /^}/ { exit }
  ' style.css)
  if [ -z "$zline" ]; then
    violation "Z-INDEX-1" "style.css .g10-party-overlay" "add z-index >= 700"
    return
  fi
  z=$(echo "$zline" | grep -oE '[0-9]+' | tail -1)
  if [ "${z:-0}" -lt 700 ]; then
    violation "Z-INDEX-1" "style.css line $zline" "raise .g10-party-overlay z-index to 750 (above evo:600 and result:500)"
  fi
}

# ---------------------------------------------------------------------------
# Rule HD-SPRITE-1 (Hotfix #117 / Lesson L59)
# Direct `img.src = "https://img.pokemondb.net/sprites/home/normal/..."`
# bypasses the HD WebP cascade. Must use attachSpriteCascade(buildPokeSources)
# instead. Allow only inside cascade fallback chains and in poke-sprite-cdn.js.
# ---------------------------------------------------------------------------
check_hd_sprite_direct_assign() {
  # Flag DIRECT `.src = '<non-HD URL>'` assignments outside the cascade.
  # Exemptions:
  #   1. Lines inside `else { ... }` legacy-fallback after a cascade-guard
  #      `if (typeof attachSpriteCascade)` — must be annotated with comment
  #      `// LEGACY-FALLBACK-EXEMPT` within 3 lines above OR same line.
  #   2. Lines using `pokeImg(...)`, `SPRITE_HD(...)`, or `pokeSpriteAlt2(...)`
  #      as primary src (HD-first via cascade).
  #   3. Lines inside HTML template `onerror="..."` strings (the primary
  #      src is HD via pokeImg/SPRITE_HD; the onerror is a cascade rung).
  #   4. URL-builder helper function definitions (pokeSpriteOnline etc.).
  local files="game.js games/g13c-pixi.html"
  local hits=""
  for f in $files; do
    [ -f "$f" ] || continue
    # awk: track exempt-marker visibility for 3 lines, scan each .src= line.
    local awk_hits
    awk_hits=$(awk -v file="$f" '
      /LEGACY-FALLBACK-EXEMPT|attachSpriteCascade/ { exempt_until = NR + 3 }
      /\.src[[:space:]]*=/ && /(pokemondb\.net\/sprites\/home\/normal|PokeAPI\/sprites\/master\/sprites\/pokemon)/ {
        if (NR <= exempt_until) next
        if ($0 ~ /pokeImg\(|SPRITE_HD\(|pokeSpriteAlt2\(/) next
        if ($0 ~ /onerror="/) next
        if ($0 ~ /^function[[:space:]]+poke|return[[:space:]]+`https/) next
        print file ":" NR ":" $0
      }
    ' "$f")
    [ -n "$awk_hits" ] && hits="$hits\n$awk_hits"
  done
  if [ -n "$hits" ]; then
    violation "HD-SPRITE-1" "$(echo -e "$hits")" "wrap with attachSpriteCascade(imgEl, buildPokeSources(slug, id)) or annotate with // LEGACY-FALLBACK-EXEMPT — see SPRITE_STANDARD.md"
  fi
}

# ---------------------------------------------------------------------------
# Rule PIXI-NO-GRAPHICS-FOR-TILES (Hotfix #118)
# In g21-pixi.html, blocks/bricks/?-blocks/enemies/coins must use PIXI.Sprite
# (real SMB1 textures from /Bagus_Apps/Supermario/), NOT custom Pixi Graphics.
# Stub for now — activated after #118 ships and SMB1 sprites are wired.
# ---------------------------------------------------------------------------
check_g21_uses_real_sprites() {
  if [ ! -f games/g21-pixi.html ]; then return; fi
  if [ ! -f assets/mario-pokemon/sprites/block.png ]; then
    yellow "SKIP [PIXI-NO-GRAPHICS-FOR-TILES] no Mario sprite assets yet"
    return
  fi
  if ! grep -q 'PIXI\.Sprite' games/g21-pixi.html 2>/dev/null; then
    violation "PIXI-NO-GRAPHICS-FOR-TILES" "games/g21-pixi.html" "tiles/enemies must render via PIXI.Sprite using MARIO_TEXTURES — see MARIO_GAME_SPEC.md"
  fi
}

# ---------------------------------------------------------------------------
# Rule SAVE-AVATAR-KEYED (Hotfix #115)
# Standalone games must call window.saveLevelProgress(gameId, level, stars)
# instead of writing directly to 'dunia-0-progress'. Allow legacy fallback in
# else-branches.
# ---------------------------------------------------------------------------
check_avatar_keyed_save() {
  local hits
  hits=$(grep -lE "localStorage\.setItem\s*\(\s*['\"]dunia-0-progress" \
         games/g6.html games/g14.html games/g15-pixi.html games/g16-pixi.html \
         games/g19-pixi.html games/g20-pixi.html games/g21-pixi.html games/g22-candy.html \
         2>/dev/null || true)
  for f in $hits; do
    if ! grep -q 'window\.saveLevelProgress\|saveLevelProgress(' "$f"; then
      violation "SAVE-AVATAR-KEYED" "$f" "import data/save-engine.js and call window.saveLevelProgress(gameId, level, stars)"
    fi
  done
}

# ---------------------------------------------------------------------------
main() {
  green "Dunia-Emosi regression checks"
  echo "----------------------------------------"
  check_g13_grid_collapse
  check_g13_explicit_placement
  check_party_overlay_zindex
  check_hd_sprite_direct_assign
  check_g21_uses_real_sprites
  check_avatar_keyed_save
  echo "----------------------------------------"
  if [ "$FAIL" -eq 0 ]; then
    green "ALL CHECKS PASSED"
  else
    red "REGRESSION DETECTED — see violations above"
    exit 1
  fi
}

main "$@"
