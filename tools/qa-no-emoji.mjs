#!/usr/bin/env node
// qa-no-emoji — PRD-27 part 2, the runner's handle on tools/audit-no-emoji.mjs (it starts its own server): no mapped
// emoji left in the rendered DOM of the hub, the parent dashboard and every game page; strict pages none at all.
// run-gates: timeout 900
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const r = spawnSync('node', [path.join(ROOT, 'tools/audit-no-emoji.mjs')], { cwd: ROOT, stdio: 'inherit' })
process.exit(r.status === null ? 1 : r.status)
