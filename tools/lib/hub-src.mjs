// hub-src — the hub's own code is game.js plus games/hub/*.js (audit A-18: game.js is split into parts, v64.57).
// A static gate that reads "game.js" as text must read all of them, or it silently stops covering the moved code.
// HUB_FILES comes from the <script src> order in index.html, so a part that is not loaded is not counted either.
// Usage: import { HUB_FILES, hubSource } from './lib/hub-src.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '')
export const HUB_FILES = [...html.matchAll(/<script\b[^>]*\bsrc="([^"?#]+)[^"]*"/g)]
  .map(m => m[1])
  .filter(src => src === 'game.js' || /^games\/hub\/[^/]+\.js$/.test(src))

if (HUB_FILES[0] !== 'game.js') throw new Error('hub-src: index.html does not load game.js')

// Every part joined in load order. Joining with '' keeps it byte-identical to the unsplit game.js.
export function hubSource () {
  return HUB_FILES.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('')
}
