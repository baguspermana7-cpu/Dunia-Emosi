#!/usr/bin/env node
// qa-sound-one-path — one sound check and one speech path for the whole app (audit A-13, v64.54).
// The parent's sound setting (localStorage 'dunia-emosi-sound', 'off' = muted) was read directly in 17 files and speech
// (speechSynthesis) was built 12 separate times, each with its own copy of the mute rule. Now:
//   - the setting is read only by DuniaProfile.soundOn() (games/data/save-engine.js) and DuniaSpeak.soundOn()
//     (games/data/speak.js, which defers to DuniaProfile when it is on the page), plus the toggle that WRITES it;
//   - speech is made only by DuniaSpeak.say() in games/data/speak.js.
// Checks (static, no browser):
//   L1 0 reads of the key outside save-engine.js / speak.js / a writer (a read within 2 lines of setItem of the key);
//      0 other code uses of the key literal except storage-event name tests (e.key === '...').
//   L2 0 `speechSynthesis.speak(` and 0 `new SpeechSynthesisUtterance` outside speak.js.
//   L3 every page whose scripts (or inline code) use DuniaSpeak loads data/speak.js before the first use, with no
//      defer mismatch; speak.js is precached in sw.js SHELL; save-engine.js defines DuniaProfile.soundOn.
// Excluded: games/film/**, games/lib/** (vendored / separate), tools, docs, proposals.
// Usage: node tools/qa-sound-one-path.mjs   (in tools/ci-verify.sh)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KEY = 'dunia-emosi-sound'
const OWNERS = new Set(['games/data/save-engine.js', 'games/data/speak.js'])
const t0 = Date.now()
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m) } }

function walk (dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir ? dir + '/' + e.name : e.name
    if (e.isDirectory()) { if (!/^games\/(film|lib)$/.test(rel)) walk(rel, out) } else if (/\.(js|html)$/.test(e.name)) out.push(rel)
  }
  return out
}
const files = fs.readdirSync(ROOT).filter(f => /\.(js|html)$/.test(f)).concat(walk('games')).sort()

// blank comments, keep line numbers (a `//` only counts after whitespace or line start, so URLs survive)
const strip = s => s.replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/(^|[\s;{}])\/\/[^\n]*/g, '$1')

const READ = new RegExp(`getItem\\(\\s*(['"])${KEY}\\1`)
const WRITE = new RegExp(`setItem\\(\\s*(['"])${KEY}\\1`)
const LIT = new RegExp(`(['"])${KEY}\\1`, 'g')
const NAME_TEST = new RegExp(`\\.key\\s*[!=]==?\\s*(['"])${KEY}\\1`, 'g')
const SPEAK = /\bspeechSynthesis\.speak\s*\(/, UTTER = /\bnew\s+(?:[\w$]+\.)?SpeechSynthesisUtterance\b/
let reads = 0, other = 0, speech = 0
for (const f of files) {
  if (f === 'sw.js' || OWNERS.has(f)) continue
  const lines = strip(fs.readFileSync(path.join(ROOT, f), 'utf8')).split('\n')
  lines.forEach((ln, i) => {
    const where = `${f}:${i + 1}`
    if (READ.test(ln)) {
      const writer = lines.slice(i, i + 3).some(l => WRITE.test(l))
      if (!writer) { reads++; ok(false, `${where}: reads '${KEY}' directly (use DuniaSpeak.soundOn())`) }
    }
    const rest = ln.replace(NAME_TEST, '').replace(new RegExp(`(?:get|set)Item\\(\\s*(['"])${KEY}\\1`, 'g'), '')
    if (LIT.test(rest)) { other++; ok(false, `${where}: uses the '${KEY}' literal outside a read/write/event-name test`) }
    LIT.lastIndex = 0
    if (SPEAK.test(ln) || UTTER.test(ln)) { speech++; ok(false, `${where}: speech outside games/data/speak.js (use DuniaSpeak.say())`) }
  })
}
console.log(`  direct reads ${reads}, other key uses ${other}, speech copies ${speech} (${files.length} files)`)

// L3 wiring: pages that use DuniaSpeak load speak.js first (the Timmy harness pages too: gates drive the game there)
const TAG = /<script\b([^>]*)>([\s\S]*?)<\/script>/g
let wired = 0
const harness = fs.readdirSync(path.join(ROOT, 'tools')).filter(f => /^tk-harness-.*\.html$/.test(f)).map(f => 'tools/' + f)
for (const page of files.filter(f => f.endsWith('.html')).concat(harness)) {
  const html = strip(fs.readFileSync(path.join(ROOT, page), 'utf8'))
  let speakAt = -1, speakDefer = false, m
  const users = []
  TAG.lastIndex = 0
  while ((m = TAG.exec(html))) {
    const attrs = m[1], src = (attrs.match(/\bsrc=["']([^"'?#]+)/) || [])[1]
    const defer = /\b(defer|async)\b|type=["']module/.test(attrs)
    if (src) {
      const file = path.posix.normalize(path.posix.join(path.posix.dirname(page), src))
      if (file === 'games/data/speak.js') { if (speakAt < 0) { speakAt = m.index; speakDefer = defer } continue }
      const abs = path.join(ROOT, file)
      if (fs.existsSync(abs) && /\bDuniaSpeak\b/.test(strip(fs.readFileSync(abs, 'utf8')))) users.push({ at: m.index, what: file, defer })
    } else if (/\bDuniaSpeak\b/.test(m[2])) users.push({ at: m.index, what: 'inline script', defer: false })
  }
  if (!users.length) continue
  wired++
  ok(speakAt >= 0, `${page}: uses DuniaSpeak (${users[0].what}) but never loads data/speak.js`)
  if (speakAt < 0) continue
  for (const u of users) {
    ok(speakAt < u.at, `${page}: ${u.what} is loaded before data/speak.js`)
    ok(!speakDefer || u.defer || u.what === 'inline script', `${page}: speak.js is deferred but ${u.what} runs at parse time`)
  }
}
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')
ok(/'\.\/games\/data\/speak\.js\?v=[^']+'/.test(sw), 'sw.js SHELL does not precache games/data/speak.js')
ok(/DuniaProfile\.soundOn\s*=\s*function/.test(fs.readFileSync(path.join(ROOT, 'games/data/save-engine.js'), 'utf8')), 'save-engine.js has no DuniaProfile.soundOn')
console.log(`qa-sound-one-path: ${pass} passed, ${fail} failed (${wired} pages use DuniaSpeak, ${Date.now() - t0} ms)`)
process.exitCode = fail ? 1 : 0
