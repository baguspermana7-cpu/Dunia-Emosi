# GAME_LAYOUT_STANDARD.md

> Authoritative layout rules for Dunia Emosi battle screens (G10, G13, G13B) and modal/overlay z-index ordering.
> Created 2026-05-01 (Hotfix #116) to prevent recurrence of grid-collapse + overlay-click-absorbed bugs.

## 1. Battle field — 2×2 diagonal grid (G10, G13, G13B)

### Grid structure

```
┌───────────────────┬───────────────────┐
│                   │                   │
│  enemy info       │  enemy sprite     │   row 1
│  (top-left)       │  (top-right)      │
│                   │                   │
├───────────────────┼───────────────────┤
│                   │                   │
│  player sprite    │  player info      │   row 2
│  (bottom-left)    │  (bottom-right)   │
│                   │                   │
└───────────────────┴───────────────────┘
       col 1               col 2
```

This is **diagonal POV**: enemy is upper-far (perspective horizon), player is lower-near (camera). Sprites face each other across the diagonal.

### CSS structure (`.g13-field`, `.g10-field`)

```css
.g13-field{
  display:grid;
  grid-template-rows:1fr 1fr;
  grid-template-columns:1fr 1fr;
}
.g13-wild-info  { grid-column:1; grid-row:1; align-self:start;  justify-self:start; }
.g13-wspr-wrap  { grid-column:2; grid-row:1; align-self:start;  justify-self:end;   }
.g13-pspr-wrap  { grid-column:1; grid-row:2; align-self:end;    justify-self:start; }
.g13-player-info{ grid-column:2; grid-row:2; align-self:end;    justify-self:end;   }
```

**EVERY child MUST declare explicit `grid-column` + `grid-row`.** If you omit them, auto-flow rearranges children when media queries change `grid-template-*`, causing detached cards.

### Landscape behavior

**Do NOT collapse the grid in landscape.** Hotfix #112 attempted to flatten to a 1-row layout — that broke `.g13-player-info` whose hardcoded `grid-row:2` then escaped grid bounds.

Correct landscape: keep the 2×2 grid; only enlarge sprites:

```css
@media (orientation:landscape) and (min-aspect-ratio:16/10){
  .g13-spr           { width:clamp(180px, min(28vw, 36vh), 340px); }
  .g13-pspr.evolved  { width:clamp(220px, min(36vw, 44vh), 420px); }
  .g13-wspr-wrap     { padding:14px 24px 22px 0; }
  .g13-pspr-wrap     { padding:0 0 22px 24px; }
}
```

### Portrait behavior

Already covered by base `clamp()` on `.g13-spr` — no media query needed. Compresses gracefully on phones.

---

## 2. Z-index ladder (modals + overlays)

```
1000  toast / notification stack
 850  evolution chain explainer modal
 750  party picker (g10 + g13b "ganti pokemon")    <-- INTERACTIVE
 600  evolution VFX overlay (g13-evo-overlay)
 500  game-result overlay (g13b-result, gr-overlay, gameResult)
 400  pause menu / settings
 300  base modal layer (legacy default)
 100  game stage / battle field content
```

**Rule of thumb**: interactive overlays opened from within an active game scene must outrank ALL passive overlays (results, evo cinematic, reward popups). Match the table above for new modals.

### Defensive hide-and-restore pattern

Even with correct z-index, lingering overlays (e.g., a result modal that didn't close cleanly) can absorb clicks. When opening an interactive picker mid-battle:

```javascript
function openInteractivePicker() {
  // Hide any passive overlay that might still be visible.
  document.querySelectorAll('.g13b-result-overlay, .g13-evo-overlay, .gr-overlay, .math-quiz-overlay')
    .forEach(el => {
      if (getComputedStyle(el).display !== 'none') {
        el.style.display = 'none'
        el.classList.add('picker-temp-hidden')  // marker for restore
      }
    })
  // ...open the picker
}

function closeInteractivePicker() {
  document.querySelectorAll('.picker-temp-hidden').forEach(el => {
    el.style.display = ''
    el.classList.remove('picker-temp-hidden')
  })
  // ...close the picker
}
```

This is a backstop — not a substitute for proper overlay close logic, but bulletproof when state transitions are imperfect.

---

## 3. Validation checklist

When touching battle layout, verify:

- [ ] All children of `.g<N>-field` have explicit `grid-column` AND `grid-row`.
- [ ] Media queries DO NOT change `grid-template-rows` or `grid-template-columns`.
- [ ] Media queries only adjust child `width`, `padding`, or `align-self`.
- [ ] New modals consult the z-index ladder; document additions here.
- [ ] Interactive pickers raise z-index AND defensively hide passive overlays on open.
- [ ] Test in BOTH portrait AND landscape on real devices (or DevTools device emulation).

## 4. References

- Bug introduced in Hotfix #112 (commit `36c73d4`), surfaced and fixed in Hotfix #116 (2026-05-01).
- See `LESSONS-LEARNED.md` L57 + L58.
- Mirror in Obsidian vault: `Apps/second brain/obsidian-knowledge-vault/Dunia-Emosi/g13-battle-layout.md`.
