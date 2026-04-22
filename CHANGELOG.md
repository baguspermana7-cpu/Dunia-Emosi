# Changelog

## 2026-04-21 — Unified GameModal messaging aligned with star count

Audited all `GameModal.show()` callers in standalone games and applied
surgical fixes so that title, emoji, and msg are consistently branched by
star count. All games now explicitly handle the 0-star fail case per the
standard defined in `games/game-modal.js` (task #44 follow-up).

### Standard branching (per star count)
- 0-star: title "Gagal! Coba Lagi" / emoji 😞 / msg "Jangan menyerah, ayo coba lagi!"
- 1-2 stars: title "Coba Lagi" / emoji 💪 / msg "Kamu bisa lebih baik lagi!"
- 3 stars: title "Bagus!" / emoji ⭐ / msg "Lumayan, terus berlatih!"
- 4 stars: title "Hebat!" / emoji 🌟 / msg "Kerja bagus!"
- 5 stars: title "Sempurna!" / emoji 🏆 / msg "Wow, kamu hebat!"

### Fixed callers
- `games/g6.html` (showFinish + showGameOver): added 0-star branch, emoji
  now graded; game-over now reports stars:0 with correct fail strings.
- `games/g13c-pixi.html` (endBattleWin + endBattleLose): win message now
  branches on stars; lose case forced to stars:0 + fail strings.
- `games/g14.html` (endRace): title/emoji/msg fully branch on stars and
  keep position label in the message body.
- `games/g15-pixi.html` (showWin + showLose): win title/emoji aligned to
  standard; lose case now stars:0 (was stars:1 — the modal normalizer
  would downgrade title, but sessionStorage still logged stars:1).
- `games/g16-pixi.html` (showWin + showLose): win strings fully branched;
  lose case emoji + strings standardized.
- `games/g19-pixi.html` (final modal): title/emoji/msg branched on stars
  rather than only on >=4/>=5.
- `games/g20-pixi.html` (endMatch): title/emoji/msg branched on stars
  (previously only branched on "won" boolean, so a winning player with
  poor quiz could still get "Kamu Menang!" + 1 star — now aligned).
- `games/g22-candy.html` (end screen): full 5-tier branching.

No changes to `games/game-modal.js`, `game.js`, `games/trains-db.js`,
or `style.css`.
