#!/usr/bin/env node
// qa-sprite-fill — PRD-26: sprites fill their box. For every webp in the packs below, the figure (alpha > 16) spans at
// least 60 % of the longer side of its canvas. people/ measured 0.35 median before tools/trim-sprite-padding.py.
// Measured with Pillow (python3), the same reader the trim script uses.
//   node tools/qa-sprite-fill.mjs            (also in tools/ci-verify.sh)
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PACKS = ['assets/db/people']
const py = `
import glob, json, sys
from PIL import Image
out = []
for d in sys.argv[1:]:
    for f in sorted(glob.glob(d + '/*.webp')):
        im = Image.open(f).convert('RGBA')
        bb = im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
        if not bb: out.append([f, 0]); continue
        out.append([f, round(max(bb[2] - bb[0], bb[3] - bb[1]) / max(im.size), 3)])
print(json.dumps(out))
`
const r = spawnSync('python3', ['-c', py, ...PACKS], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 << 20 })
if (r.status !== 0) { console.log('qa-sprite-fill: python failed', r.stderr.slice(0, 300)); process.exit(1) }
const rows = JSON.parse(r.stdout), low = rows.filter(x => x[1] < 0.6)
const med = rows.map(x => x[1]).sort((a, b) => a - b)[rows.length >> 1]
console.log(`qa-sprite-fill: ${rows.length} sprites in ${PACKS.join(', ')}, median fill ${med}, ${low.length} under 0.60${low.length ? ' - ' + low.slice(0, 5).map(x => x.join(' ')).join(', ') : ''}`)
process.exit(rows.length && !low.length ? 0 : 1)
