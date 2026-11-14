#!/usr/bin/env node
// run-gates — one runner for the browser gates (idea #5, docs/PRODUCT-ASSESSMENT-2026-11-10.md).
//
// Every gate already names the URL shape it wants in its default: `process.env.QA_BASE || 'http://localhost:8081'`,
// `process.env.QA_URL || 'http://localhost:8081/games/timmy-kapal.html'`, `process.env.BASE || '.../Dunia-Emosi/'`.
// The runner serves this tree on a free port, reads each gate's defaults and hands the gate the same URLs with the
// origin swapped for its own server. No gate is edited and no fixed port is shared with another session.
//
//   node tools/run-gates.mjs --tag timmy            the Timmy gates (qa-tk-*)
//   node tools/run-gates.mjs --tag content          content rules: instruction companions, reviewed people sprites, sprite fill
//   node tools/run-gates.mjs --only 'qa-tk-(steer|lanes)'
//   node tools/run-gates.mjs tools/qa-breathe.mjs   explicit files
//   --list            show what would run, run nothing
//   --timeout 600     seconds per gate (default 600); a gate that needs longer says so in its own source with a line
//                     `// run-gates: timeout <s>` (qa-tk-steer runs ~24 min: a 600 s kill left "detached Frame" as its last word)
//   --lock-wait 3600  seconds to wait for the browser lock (another session's gate) before giving up
//   --out file.json   summary path (default $TMPDIR/run-gates-summary.json)
//
// Each gate runs under the shared browser lock (one headless browser at a time on this machine) and `timeout`.
// A failing gate is run once more: pass on the retry = "flaky" (reported, not hidden), fail twice = "fail".
// A gate that hardcodes a local URL without reading it from the environment only knows that port, so it is reported
// "no-env" and not run; a gate with no local URL at all (node-only, or it serves itself) runs as it is. Exit 1 when any gate fails.
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LOCK = '/tmp/claude-1000/kereta-browser.lock'
const TAGS = { timmy: /^qa-tk-/, mojo: /^qa-mojo-/, dunia: /^qa-dunia-/, calm: /^qa-(breathe|feeling-checkin|freeze-card)\.mjs$/, content: /^qa-(instruction-companion|content-rules|sprite-fill|white-outline|no-emoji)\.mjs$/ }
const ENV_DEFAULT = /process\.env\.([A-Z_]+)\s*\|\|\s*(['"`])(https?:\/\/(?:localhost|127\.0\.0\.1):\d+(?:\/Dunia-Emosi)?)([^'"`]*)\2/g

const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v }
const flag = k => { const i = args.indexOf(k); if (i < 0) return false; args.splice(i, 1); return true }
const tag = opt('--tag'), only = opt('--only'), TIMEOUT = +opt('--timeout', 600), LOCK_WAIT = +opt('--lock-wait', 3600)
const OUT = opt('--out', join(process.env.TMPDIR || tmpdir(), 'run-gates-summary.json'))
const LIST = flag('--list')

let files = args.map(f => resolve(f))
if (!files.length) {
  if (!tag && !only) { console.error('run-gates: give --tag <' + Object.keys(TAGS).join('|') + '>, --only <regex> or files'); process.exit(2) }
  if (tag && !TAGS[tag]) { console.error('run-gates: unknown tag ' + tag); process.exit(2) }
  const re = only ? new RegExp(only) : TAGS[tag]
  files = readdirSync(join(ROOT, 'tools')).filter(f => f.endsWith('.mjs') && f.startsWith('qa-') && re.test(f)).sort().map(f => join(ROOT, 'tools', f))
}

// the env a gate needs: each variable it reads with a localhost default, pointed at our server
function envFor (file, origin) {
  const src = readFileSync(file, 'utf8'), env = {}
  for (const m of src.matchAll(ENV_DEFAULT)) env[m[1]] = origin + m[4]   // '/Dunia-Emosi' prefixes drop: this server serves the tree at its root
  return env
}

// a gate with no env default and no hardcoded local URL needs no server of ours (node-only, or it serves itself)
const HARD = /https?:\/\/(?:localhost|127\.0\.0\.1):\d{2,5}/
const OWN_TIMEOUT = /^\/\/ run-gates: timeout (\d+)\s*$/m
const plan = files.map(f => {
  const src = readFileSync(f, 'utf8'), vars = Object.keys(envFor(f, 'http://x')), own = src.match(OWN_TIMEOUT)
  return { file: f, name: basename(f), vars, timeout: own ? Math.max(TIMEOUT, +own[1]) : TIMEOUT, stuck: !vars.length && HARD.test(src.replace(/^\s*\/\/.*$/gm, '')) }
})
if (LIST) { for (const p of plan) console.log(p.stuck ? 'no-env' : 'run   ', p.name, p.timeout + 's', p.vars.join(' ')); process.exit(0) }

const freePort = () => new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)) }) })
const port = await freePort(), origin = `http://127.0.0.1:${port}`
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' })
const stopServer = () => { try { srv.kill() } catch (e) {} }
process.on('exit', stopServer); process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143))
// identity: the server must hand back THIS file, not another session's tree on a reused port
const me = readFileSync(fileURLToPath(import.meta.url), 'utf8')
let same = false
for (let i = 0; i < 50 && !same; i++) {
  try { same = (await (await fetch(origin + '/tools/run-gates.mjs')).text()) === me } catch (e) {}
  if (!same) await new Promise(r => setTimeout(r, 200))
}
if (!same) { console.error('run-gates: server on ' + origin + ' does not serve this tree'); process.exit(1) }

function runOnce (file, env, timeout) {
  const t0 = Date.now()
  // -E 75: a lock we never got is "lock-busy", not a failure of the gate
  const r = spawnSync('flock', ['-E', '75', '-w', String(LOCK_WAIT), LOCK, 'timeout', String(timeout), 'node', file], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20,
    env: { ...process.env, ...env, TMPDIR: process.env.TMPDIR || join(process.env.HOME, '.cache/qa-tmp') }
  })
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n')
  const err = out.find(l => /^\s*(\w*Error|TimeoutError|ProtocolError)\b.*:/.test(l))
  const last = r.status === 124 ? 'timed out after ' + timeout + ' s' + (err ? ' (' + err.trim().slice(0, 150) + ')' : '') : (err || out[out.length - 1]).trim().slice(0, 200)
  return { code: r.status, ms: Date.now() - t0, last, fails: out.filter(l => /✗|❌|FAIL\b/.test(l)).slice(0, 5) }
}

const results = []
for (const p of plan) {
  if (p.stuck) { results.push({ gate: p.name, status: 'no-env' }); console.log('no-env  ', p.name, '(hardcoded port, not run)'); continue }
  const env = envFor(p.file, origin)
  let a = runOnce(p.file, env, p.timeout), status = a.code === 0 ? 'pass' : a.code === 75 ? 'lock-busy' : 'fail', retry = null
  if (status === 'fail') { retry = runOnce(p.file, env, p.timeout); if (retry.code === 0) status = 'flaky'; else if (retry.code === 75) status = 'lock-busy' }
  results.push({ gate: p.name, status, env, first: a, retry })
  console.log(status.padEnd(8), p.name, Math.round((a.ms + (retry ? retry.ms : 0)) / 1000) + 's', '|', (retry || a).last)
  if (status === 'fail') for (const l of (retry || a).fails) console.log('          ', l.trim())
}
const count = s => results.filter(r => r.status === s).length
const summary = { origin, at: new Date().toISOString(), pass: count('pass'), flaky: count('flaky'), fail: count('fail'), noEnv: count('no-env'), lockBusy: count('lock-busy'), results }
writeFileSync(OUT, JSON.stringify(summary, null, 1))
console.log(`run-gates: ${summary.pass} pass, ${summary.flaky} flaky, ${summary.fail} fail, ${summary.noEnv} no-env, ${summary.lockBusy} lock-busy (summary ${OUT})`)
stopServer()
process.exit(summary.fail || summary.lockBusy ? 1 : 0)
