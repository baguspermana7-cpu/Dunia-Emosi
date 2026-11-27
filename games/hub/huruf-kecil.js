/* games/hub/huruf-kecil.js — PRD-58 C9 (docs/prd/PRD-58-kembangkan-dan-sempurnakan.md): lowercase letters in the hub:
 * Jejak Huruf (G9) traces them, Huruf Hutan (G3) pairs them with their capitals.
 * Cut out of game.js like the other hub parts (audit A-18): classic script, shares the hub's global scope, loads after
 * game.js. Adds 26 lowercase paths to LETTER_GUIDES (52 keys), the medium-third sequence LETTER_SEQ_KECIL, and the
 * ghost-glyph fit for lowercase letters.
 * ==========================================================================*/
// PRD-58 C9: lowercase tracing paths (same unit box; the ghost glyph is fitted to each path's own box, so an
// x-height letter sits low, an ascender reaches the top and a descender runs below the bowl). Traced on the medium
// third of the map (levels 8-14); uppercase stays on the easy third, whole words on the hard third.
const LETTER_GUIDES_KECIL = {
  'a':[{x:0.72,y:0.5},{x:0.5,y:0.38},{x:0.28,y:0.5},{x:0.25,y:0.72},{x:0.35,y:0.92},{x:0.55,y:0.95},{x:0.72,y:0.8},{x:0.72,y:0.38},{x:0.72,y:0.95}],
  'b':[{x:0.28,y:0.05},{x:0.28,y:0.95},{x:0.28,y:0.6},{x:0.5,y:0.4},{x:0.72,y:0.5},{x:0.76,y:0.7},{x:0.68,y:0.9},{x:0.5,y:0.95},{x:0.28,y:0.85}],
  'c':[{x:0.74,y:0.48},{x:0.55,y:0.38},{x:0.32,y:0.45},{x:0.25,y:0.66},{x:0.32,y:0.88},{x:0.55,y:0.95},{x:0.74,y:0.85}],
  'd':[{x:0.72,y:0.6},{x:0.5,y:0.4},{x:0.3,y:0.5},{x:0.24,y:0.7},{x:0.32,y:0.9},{x:0.5,y:0.95},{x:0.72,y:0.82},{x:0.72,y:0.05},{x:0.72,y:0.95}],
  'e':[{x:0.27,y:0.68},{x:0.73,y:0.68},{x:0.7,y:0.48},{x:0.5,y:0.38},{x:0.3,y:0.46},{x:0.25,y:0.68},{x:0.32,y:0.88},{x:0.52,y:0.95},{x:0.72,y:0.88}],
  'f':[{x:0.72,y:0.1},{x:0.58,y:0.04},{x:0.45,y:0.12},{x:0.42,y:0.3},{x:0.42,y:0.95},{x:0.25,y:0.42},{x:0.68,y:0.42}],
  'g':[{x:0.72,y:0.38},{x:0.5,y:0.3},{x:0.3,y:0.38},{x:0.26,y:0.52},{x:0.32,y:0.66},{x:0.5,y:0.72},{x:0.72,y:0.6},{x:0.72,y:0.3},{x:0.72,y:0.85},{x:0.6,y:0.94},{x:0.42,y:0.95},{x:0.3,y:0.9}],
  'h':[{x:0.28,y:0.05},{x:0.28,y:0.95},{x:0.28,y:0.6},{x:0.45,y:0.42},{x:0.65,y:0.42},{x:0.72,y:0.58},{x:0.72,y:0.95}],
  'i':[{x:0.5,y:0.4},{x:0.5,y:0.68},{x:0.5,y:0.95},{x:0.5,y:0.18}],
  'j':[{x:0.46,y:0.3},{x:0.46,y:0.6},{x:0.46,y:0.85},{x:0.42,y:0.95},{x:0.37,y:0.95},{x:0.33,y:0.93},{x:0.46,y:0.1}],
  'k':[{x:0.3,y:0.05},{x:0.3,y:0.95},{x:0.3,y:0.72},{x:0.7,y:0.4},{x:0.42,y:0.64},{x:0.72,y:0.95}],
  'l':[{x:0.5,y:0.05},{x:0.5,y:0.35},{x:0.5,y:0.65},{x:0.5,y:0.95}],
  'm':[{x:0.2,y:0.4},{x:0.2,y:0.95},{x:0.2,y:0.55},{x:0.32,y:0.4},{x:0.45,y:0.45},{x:0.5,y:0.6},{x:0.5,y:0.95},{x:0.5,y:0.6},{x:0.62,y:0.4},{x:0.75,y:0.45},{x:0.8,y:0.6},{x:0.8,y:0.95}],
  'n':[{x:0.3,y:0.4},{x:0.3,y:0.95},{x:0.3,y:0.58},{x:0.45,y:0.42},{x:0.62,y:0.42},{x:0.7,y:0.58},{x:0.7,y:0.95}],
  'o':[{x:0.5,y:0.38},{x:0.3,y:0.45},{x:0.24,y:0.66},{x:0.3,y:0.88},{x:0.5,y:0.95},{x:0.7,y:0.88},{x:0.76,y:0.66},{x:0.7,y:0.45},{x:0.5,y:0.38}],
  'p':[{x:0.3,y:0.3},{x:0.3,y:0.95},{x:0.3,y:0.42},{x:0.5,y:0.3},{x:0.7,y:0.38},{x:0.75,y:0.52},{x:0.68,y:0.67},{x:0.5,y:0.72},{x:0.3,y:0.64}],
  'q':[{x:0.7,y:0.42},{x:0.5,y:0.3},{x:0.3,y:0.38},{x:0.25,y:0.52},{x:0.32,y:0.67},{x:0.5,y:0.72},{x:0.7,y:0.62},{x:0.7,y:0.3},{x:0.7,y:0.95}],
  'r':[{x:0.35,y:0.4},{x:0.35,y:0.95},{x:0.35,y:0.6},{x:0.48,y:0.43},{x:0.68,y:0.4}],
  's':[{x:0.7,y:0.45},{x:0.5,y:0.38},{x:0.32,y:0.45},{x:0.34,y:0.6},{x:0.5,y:0.66},{x:0.68,y:0.74},{x:0.68,y:0.88},{x:0.5,y:0.95},{x:0.3,y:0.88}],
  't':[{x:0.45,y:0.15},{x:0.45,y:0.85},{x:0.55,y:0.95},{x:0.7,y:0.92},{x:0.28,y:0.42},{x:0.68,y:0.42}],
  'u':[{x:0.3,y:0.4},{x:0.3,y:0.8},{x:0.4,y:0.94},{x:0.55,y:0.95},{x:0.7,y:0.82},{x:0.7,y:0.4},{x:0.7,y:0.95}],
  'v':[{x:0.25,y:0.4},{x:0.37,y:0.68},{x:0.5,y:0.95},{x:0.63,y:0.68},{x:0.75,y:0.4}],
  'w':[{x:0.15,y:0.4},{x:0.32,y:0.95},{x:0.5,y:0.5},{x:0.68,y:0.95},{x:0.85,y:0.4}],
  'x':[{x:0.28,y:0.4},{x:0.72,y:0.95},{x:0.5,y:0.68},{x:0.72,y:0.4},{x:0.28,y:0.95}],
  'y':[{x:0.26,y:0.3},{x:0.5,y:0.72},{x:0.74,y:0.3},{x:0.52,y:0.78},{x:0.42,y:0.93},{x:0.3,y:0.95}],
  'z':[{x:0.28,y:0.4},{x:0.72,y:0.4},{x:0.28,y:0.95},{x:0.72,y:0.95}]
}
const LETTER_SEQ_KECIL = Object.keys(LETTER_GUIDES_KECIL)
Object.assign(LETTER_GUIDES, LETTER_GUIDES_KECIL)   // game.js: getG9Guides / LETTER_SEQ_PINTAR (taken before this, stays 26)

// The ghost glyph behind the dots. Called by g9FillGlyph (game.js) for a lowercase letter with the path's box.
function g9FillGlyphKecil (ctx, ch, minX, maxX, maxY, bboxH, W, H) {
  // PRD-58 C9: a lowercase glyph has no common cap height (x-height, ascender, descender), so fit its real ink box
  // to the path's box: height from the measured ascent + descent, baseline lifted by the descent
  ctx.font = 'bold 100px Nunito'
  const m = ctx.measureText(ch), asc = m.actualBoundingBoxAscent || 72, desc = m.actualBoundingBoxDescent || 0
  let fs = bboxH * 100 / Math.max(1, asc + desc)
  const w0 = (m.width || 50) * fs / 100
  if (w0 > W * 0.92) fs *= W * 0.92 / w0
  ctx.font = `bold ${Math.round(fs)}px Nunito`
  ctx.fillStyle = 'rgba(132,204,22,0.14)'
  // centre the INK (not the advance width) on the path's box: j, f, r carry side bearings that pushed the stem off
  const l = (m.actualBoundingBoxLeft || 0) * fs / 100, r = (m.actualBoundingBoxRight || m.width || 50) * fs / 100
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.fillText(ch, (minX + maxX) / 2 * W - (r - l) / 2, maxY * H - desc * fs / 100)
}

// Huruf Hutan (G3) pair round: a capital and its lowercase are the same letter. Called by nextG3Round (game.js) on
// rounds 2, 5, 8 ... of the letter part at medium and hard; the direction alternates (B -> b, then b -> B). The wrong
// choices start with the letters a child mixes up (b d p q, m n u w), the rest are random.
const G3_LOOKALIKE = { b: 'dpq', d: 'bpq', p: 'qbd', q: 'pdb', m: 'nwu', n: 'umh', u: 'nvy', w: 'mv', i: 'jl', j: 'ig', l: 'it' }
function g3PairRound (item, numChoices, roundInSet) {
  const up = item.word[0], lo = up.toLowerCase(), toLower = roundInSet % 2 === 1
  const shown = toLower ? up : lo, ans = toLower ? lo : up
  g3State.pairShown = shown; g3State.pairAns = ans
  document.getElementById('g3-word').innerHTML = `<span class="g3-letter g3-pair" id="g3-ltr-0">${shown}</span>`
  document.getElementById('g3-hint').textContent = `Mana huruf ${toLower ? 'kecil' : 'besar'} dari ${shown}?`
  // the guide's reading line asks for a missing letter; this round asks for a pair (nextG3Round restores the line)
  const mg = document.getElementById('g3-mg'); if (mg) mg.textContent = 'Huruf besar dan huruf kecil: cari pasangannya!'
  const pool = (G3_LOOKALIKE[lo] || '').split('').concat('abcdefghijklmnopqrstuvwxyz'.split('').sort(() => Math.random() - 0.5))
  const wrong = []
  for (const c of pool) { if (c !== lo && wrong.indexOf(c) < 0) wrong.push(c); if (wrong.length >= numChoices - 1) break }
  const opts = [lo].concat(wrong).map(c => toLower ? c : c.toUpperCase())
  renderG3Choices(opts.sort(() => Math.random() - 0.5), ans, false, numChoices)
}
