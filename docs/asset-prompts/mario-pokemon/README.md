# Mario Pokemon Assets

Drop the tile icon here as `icon.png` (44×44px recommended, transparent PNG).

If `icon.png` is missing, the landing tile falls back to a 🍄 emoji.

## Suggested icon
- Pikachu wearing a red Mario cap (M letter on the front)
- Or a Pokemon with a power-up mushroom
- Mario palette: red `#E8262A` + gold `#FBBF24` (matches the tile gradient)

## Future game files
When the actual game is built, place:
- `index.html` (or game logic in main `game.js`)
- Sprite assets, level data, etc.
- Background art for fullscreen play

The landing tile is wired at `index.html` `gtile-21` and currently
calls `showComingSoonToast('Mario Pokemon','🍄')` on click.
