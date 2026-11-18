# Third-party code shipped in this repo

Everything here is served from this origin (no CDN) so the app keeps working offline.

## Sakuga VFX core (PRD-46)

- File: `games/vendor/sakuga/core.js` (MIT licence text kept in the file header and in `games/vendor/sakuga/LICENSE`)
- Source: https://github.com/finktheartist/sakuga-vfx, `core.js`, commit `c3dabb173928a3ad2372183103caf2e6f50953d0` (2026-11-15)
- Author: Justin Finkelman
- Use: springs and the effect canvas (`window.SakugaFX`). Everything below the header comment is the upstream file unchanged.
  `games/data/dunia-sakuga.js` is ours and drives it. Not used: the `<sakuga-button>` element and the katakana lettering
  (`sfx`, `hollow`, `dotted`).
- To update: copy the new `core.js` under the same header, change the commit above and the header, re-run
  `node tools/qa-sakuga-wired.mjs` and `node tools/run-gates.mjs --tag vfx`.
