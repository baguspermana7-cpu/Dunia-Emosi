# REGRESSION_CHECKS.md

> Defensive grep/AST scans that catch known bug classes before they re-emerge.
> Run `./scripts/check-regressions.sh` before every commit (or in CI).
> Created 2026-05-01 in response to user mandate "ensure those bug and other bug not emerge".

## Why this exists

After a bug is fixed, the failure mode lives on as code-pattern muscle memory. A sleepy late-night refactor reintroduces it. CSS specificity flips a media query. A new copy-paste from an old game brings back the legacy `dunia-0-progress` write. Each of L57–L60 in `LESSONS-LEARNED.md` corresponds to a class of bug that a grep-level check can catch in seconds.

This script is **mechanical** — it doesn't understand semantics, only patterns. It will produce false positives sometimes; in those cases, refine the rule with a more specific grep, never weaken it.

## How to run

```bash
./scripts/check-regressions.sh
```

Exit code:
- `0` — all rules passed
- `1` — at least one rule violated; see report

Output is colorized; rule IDs map to lessons (e.g., `G13-LAYOUT-1` → L57, `Z-INDEX-1` → L58, `HD-SPRITE-1` → L59).

## Current rules

| Rule ID | Hotfix | Lesson | What it checks |
|---|---|---|---|
| `G13-LAYOUT-1` | #116 | L57 | No media query collapses `.g13-field` to `grid-template-rows:1fr` |
| `G13-LAYOUT-2` | #116 | L57 | `.g13-wild-info` and `.g13-player-info` declare explicit grid-column AND grid-row |
| `Z-INDEX-1` | #116 | L58 | `.g10-party-overlay` z-index ≥ 700 (above evo:600 and result:500) |
| `HD-SPRITE-1` | #117 | L59 | No direct `img.src = pokemondb.net/sprites/home/normal/...` outside cascade helpers |
| `PIXI-NO-GRAPHICS-FOR-TILES` | #118 | (TBD) | g21-pixi.html uses `PIXI.Sprite` for tiles (after Mario sprites land) |
| `SAVE-AVATAR-KEYED` | #115 | (TBD) | Standalone games use `window.saveLevelProgress` not `dunia-0-progress` direct |

## How to add a rule

1. In `scripts/check-regressions.sh`, append a `check_<short_name>()` function.
2. Use the `violation` helper: `violation "RULE-ID" "file:line" "fix hint"`.
3. Call your function from `main()`.
4. Document the rule in this file's table.
5. Cross-reference the corresponding LESSON entry.

## CI / pre-commit integration

Recommended `.git/hooks/pre-commit`:

```bash
#!/bin/sh
./scripts/check-regressions.sh || {
  echo ""
  echo "Commit blocked by regression check. Override with --no-verify (NOT recommended)."
  exit 1
}
```

Or in CI (GitHub Actions, GitLab CI):

```yaml
- name: Regression checks
  run: ./scripts/check-regressions.sh
```

## Philosophy

Each rule is a **frozen lesson**. When the script flags something, the right response is almost never to weaken the rule — it's to fix the new code to match the standard, OR to demonstrate that the new code is genuinely a different case and tighten the grep to exclude it. If a rule keeps firing, that's a signal that the standard isn't being internalized; address the root cause (training, doc readability) rather than mute the alarm.

## See also

- `LESSONS-LEARNED.md` — narrative for each lesson
- `GAME_LAYOUT_STANDARD.md` — battle field 2×2 grid + z-index ladder
- `SPRITE_STANDARD.md` — HD-WebP cascade order (to be added by #117)
- `MARIO_GAME_SPEC.md` — G21 sprite pipeline (to be added by #118)
