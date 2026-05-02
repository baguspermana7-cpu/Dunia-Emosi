# Dunia Emosi

Children's educational game app (ages 5-10) — emotion learning, math, Pokemon-themed mini-games.

## Live Deployments

| Platform | URL | Notes |
|----------|-----|-------|
| **Vercel** | https://dunia-emosi-z2ss.vercel.app/ | Primary; auto-deploys on push to `main` |
| **GitHub Pages** | https://baguspermana7-cpu.github.io/Dunia-Emosi/ | Alternative; auto-deploys via `.github/workflows/pages.yml` |

## Local Development

Serve from the parent directory (so the `/Dunia-Emosi/` path matches GitHub Pages):

```bash
cd /home/baguspermana7/rz-work
python3 -m http.server 8081
# Then open: http://localhost:8081/Dunia-Emosi/
```

## Project Structure

- `index.html` — main app entry
- `game.js` — main app logic (~14k lines)
- `style.css` — styles (~6k lines)
- `games/` — standalone Pixi.js games (G6, G14-G22)
- `games/data/` — shared modules (sprite loader, save engine, cloud sync, etc.)
- `assets/Pokemon/` — sprites, sounds, backgrounds (~221MB total)
- `documentation and standarization/` — design docs, lessons learned, changelog

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no build step)
- PixiJS 8 for standalone games
- LocalStorage primary save (avatar-keyed)
- Optional Supabase cloud sync via `games/data/cloud-sync.js`
