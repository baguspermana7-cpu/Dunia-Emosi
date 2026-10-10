# Blippi G32 — build brief, slice 1 (2026-10-10, revised)

Owner, in order:
1. "Rancang dulu gameplay2 frame char placeholder. Nanti saya kasih asset2nya belakangan."
2. "Hanya rancang frame2 placeholder nanti aja saya kasih asset2nya, ini gambar uiux reference pastikan
   sama persis. Nanti tinggal dimasukkan."
= Build the screens EXACTLY like the owner's UI references, with placeholder frames wherever art goes, so the
owner's art can simply be dropped in later. Gameplay is wired, art is placeholder.

## UI references (match layout, proportions, hierarchy, colours, wording — "sama persis")
`docs/blippi/mockups/` (local only, git-ignored). Open each one and measure positions as % of a 1672x941
(16:9) frame; reproduce those positions at 1280x800 / 1024x768 (letterbox the 16:9 stage, never crop UI).
- `hub.png` — DISCOVERY GARAGE hub: logo top centre ("BLIPPI" + "MEGA DISCOVERY ADVENTURE" pill), settings
  top-left, profile badge + lock top-right; Blippi left with bubble "Mau menjelajah?"; map table; Discovery Wall
  board (5 round icons); buggy on a round pad centre; garage right; card bottom-right "Jalan Pertamaku" with
  thumbnail + orange "MULAI PETUALANGAN"; bottom nav bar PETA · KENDARAAN · BENGKEL · PENEMUAN · BERMAIN.
- `map.png` — "PETA PETUALANGAN": back + home top-left; 6 islands KOTA RODA (check), TAMAN AIR (selected:
  glowing ring + orange pin), ECO PARK, KEBUN CERIA (lock), PELABUHAN PENJELAJAH (lock), WONDER LAB (lock);
  Blippi bottom-left; bottom card "Taman Air / Kincir yang Menunggu" + orange "JELAJAHI"; nav with PETA active.
- `vehicles.png` — "PILIH KENDARAAN": back + home; Blippi left with bubble "Ayo alirkan air!"; big vehicle on a
  round pad; carousel BUGGY · TRUK AIR (selected, check) · EXCAVATOR with round prev/next arrows; right panel
  "TRUK AIR", blue pill "COCOK UNTUK MISI INI", two module tiles POMPA / SEMPROT, mission row
  "Taman Air · Kincir yang Menunggu", blue "COBA SEMPROT", orange "PAKAI KENDARAAN"; nav with KENDARAAN active.
- `mission-kincir.png` — mission screen W02-M01 "Kincir yang Menunggu": pause + home top-left, BLIPPI logo
  top-right; title pill; step bar 1 SAMBUNG (active) › 2 BUKA › 3 POMPA; instruction pill "Sambungkan selang ke
  kincir."; water truck left with a hose; water wheel (kincir) right with an inlet pipe; dashed arrow + hand
  pointer from hose end to inlet; tool tray SELANG (active) · KATUP · POMPA; Blippi portrait bottom-left with a
  speaker button; "PETUNJUK" button bottom-right (the reference's second copy misspells it "PEUTNJUK" — use
  PETUNJUK).
UI chrome (buttons, pills, panels, nav bar, step bar, cards, text) is built in HTML/CSS to look like the
reference (rounded cream panels, blue/orange, white outlines, drop shadows, bold rounded font such as Fredoka /
Baloo). ART (characters, vehicles, backgrounds, icons, tools, islands, thumbnails) is placeholder frames.

## Placeholder frames (the key ask)
ONE art map `games/data/blippi-art.js` (`BlippiArt.src(key)`): if `assets/blippi/<key>.webp` exists (list the
shipped keys in the map; no network probing) it is used, else a PLACEHOLDER FRAME is drawn in exactly the slot's
box from the reference: rounded rectangle, dashed border, soft tinted fill, a simple silhouette hint where it
helps (person / vehicle / building / icon), and the slot name in caps ("BLIPPI — MENUNJUK", "TRUK AIR — 3/4 DEPAN",
"KINCIR AIR", "IKON PETA", "PULAU TAMAN AIR"). Swapping art must need NO code change beyond adding the file key.
Write `docs/blippi/ART-SLOTS.md`: every slot key, which screen, intended pixel size at 1672x941, view/pose,
transparent or opaque, so the owner knows exactly what to send. Never draw Blippi from imagination and never
use library art for Blippi.

## Gameplay to wire (placeholder art, real logic)
Read `docs/blippi/PRD-v3.md` §5.2, 7, 8, 11.2–11.3, 12, 15, 21–24, 30.1 for intent. Content
(`games/data/blippi-missions.js`, stable ids, Indonesian lines, reward keys) separate from runtime.
1. Navigation between all four screens + honest simple panels for BENGKEL / PENEMUAN / BERMAIN (inspect-only,
   stickers found, a small free-play yard) — no "Segera Hadir", nothing dead.
2. W02-M01 "Kincir yang Menunggu" exactly as the mission reference: step 1 drag the hose end to the inlet (real
   pointer drag with snap + a kind "coba lagi" bounce if dropped wrong), step 2 choose KATUP and turn/tap the
   valve, step 3 choose POMPA and hold to pump; water flows (CSS/SVG), the wheel turns, success payoff, the map's
   Taman Air island shows the working wheel afterwards, reward granted ONCE (idempotent key). Choosing a wrong
   tool for the current step explains kindly; PETUNJUK escalates (glow → arrow → hand demo).
3. W01-M01 "Jalan Pertamaku" (from the hub card) using the same mission-screen template: place bridge boards
   across a gap (left/right route choice), then drive the buggy over the built path (hold to go) to deliver, park
   path appears. If time is short, deliver W02-M01 fully first.
4. Vehicle pick: the carousel changes the selected vehicle and panel; "COCOK UNTUK MISI INI" only when the
   vehicle's capability tags fit the mission; PAKAI KENDARAAN starts the mission with that vehicle.
5. Save/resume per avatar via `avatarScopedGet`/`avatarScopedSet` (see `games/ejaan-inggris.js`), pause, pointer
   cancel safe.

## Engineering rules
- Vanilla ES5, window globals, no build. Files: `games/blippi.html` (replace the current stub; keep the name —
  the landing tile points at it), `games/blippi.css`, `games/blippi.js` (+ split modules if > ~600 lines),
  `games/data/blippi-art.js`, `games/data/blippi-missions.js`.
- Kids' rules: no emoji anywhere (SVG/sprites only), no woman without hijab, no skull/weapons/dynamite/spikes/
  blood. Touch targets >= 56 px. transform/opacity motion, prefers-reduced-motion respected.
- Offline: add every new file to `sw.js` SHELL with the same `?v=` token as sibling entries; run
  `node tools/normalize-cache-tokens.mjs --check`.
- Gate `tools/qa-blippi.mjs` (puppeteer, http://localhost:8081, start the server with
  `setsid nohup python3 -m http.server 8081 >/dev/null 2>&1 &` if down): the four screens at 1280x800, 1024x768,
  844x390 and 390x844 (portrait: show a "putar perangkat" landscape prompt or a stacked layout — no overlap, no
  horizontal scroll); every slot renders a placeholder with its label; W02-M01 completed by REAL pointer input;
  wrong-tool / wrong-drop paths are kind; reward and world change persist across reload and are granted once;
  zero page errors. Run alone; read `tail -3` only.
- Visual check against the references: ONE side-by-side contact sheet (reference left, ours right) per screen,
  looked at once, then fix obvious layout drift.
- Do NOT git commit or push; the main session reviews and commits. Touch only Blippi files + sw.js SHELL lines.

## Report (under 300 words)
What works, file list, gate summary line, differences from the references, path of the side-by-side sheets.
