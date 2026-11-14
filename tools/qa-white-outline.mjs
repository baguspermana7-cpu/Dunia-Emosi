#!/usr/bin/env node
// qa-white-outline — PRD-27 part 2, the runner's handle on tools/white-outline.py (owner rule: no white sticker
// outline). New or edited sprites with a white rim fail; the sprites that already had one are listed as debt in
// tools/white-outline-baseline.json. QA_PLANT=1 runs the red proof instead.
//   node tools/qa-white-outline.mjs   (python3 + Pillow; also in tools/ci-verify.sh)
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const r = spawnSync('python3', [path.join(ROOT, 'tools/white-outline.py'), ...(process.env.QA_PLANT ? ['--plant'] : [])], { cwd: ROOT, stdio: 'inherit' })
process.exit(r.status === null ? 1 : r.status)
