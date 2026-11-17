// perf-core — the pieces qa-perf-survey (report) and qa-perf-budget (gate) share: a static server that gzips text like GitHub
// Pages, the in-page instrumentation (seeded player, seeded Math.random, tap registry, rAF log, long tasks, canvas contexts)
// and the tapper's element scan. Moved out of qa-perf-survey.mjs unchanged.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const sleep = ms => new Promise(r => setTimeout(r, ms))
export const pageList = () => ['index.html'].concat(fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html') && !f.startsWith('_')).sort().map(f => 'games/' + f))

// ---------- static server (own port, gzip like Pages) ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.txt': 'text/plain', '.wasm': 'application/wasm' }
const GZ = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.svg', '.txt'])
const cache = new Map()
export function startServer () {
  const srv = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(req.url.split('?')[0].split('#')[0])
      if (p.endsWith('/')) p += 'index.html'
      const f = path.join(ROOT, p)
      if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end() }
      const ext = path.extname(f).toLowerCase()
      let ent = cache.get(f)
      if (!ent) {
        const raw = await fs.promises.readFile(f)
        ent = { raw, gz: GZ.has(ext) ? zlib.gzipSync(raw, { level: 6 }) : null }
        if (raw.length < 40e6) cache.set(f, ent)
      }
      const h = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' }
      const useGz = ent.gz && /gzip/.test(req.headers['accept-encoding'] || '')
      const body = useGz ? ent.gz : ent.raw
      h['Content-Length'] = body.length; if (useGz) h['Content-Encoding'] = 'gzip'
      res.writeHead(200, h); res.end(body)
    } catch (e) { res.writeHead(404); res.end('nf') }
  })
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, origin: 'http://127.0.0.1:' + srv.address().port + '/' })))
}

// ---------- in-page instrumentation (runs before any page script) ----------
export function instrument (opt) {   // opt.soundDefault: leave the sound setting as a first-time visitor has it (the budget gate); the survey mutes it
  let s = 20261117   // seeded Math.random: both runs see the same questions
  Math.random = function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  try {
    localStorage.setItem('dunia-players', JSON.stringify([{ name: 'Ana', animal: '🦁', ageTier: 'cilik' }]))
    localStorage.setItem('dunia-active-slot', '[0,1]'); if (!(opt && opt.soundDefault)) localStorage.setItem('dunia-emosi-sound', 'off')
  } catch (e) {}
  // every element that registers a tap handler is tappable; a handler on window/document = taps anywhere
  const TAP = /^(click|pointerdown|pointerup|touchstart|touchend|mousedown|mouseup)$/
  window.__tap = new WeakSet(); window.__anyTap = false
  const add = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    if (TAP.test(type)) { if (this instanceof Element) window.__tap.add(this); else if (this === window || this === document || this === document.body) window.__anyTap = true }
    return add.call(this, type, fn, o)
  }
  // rAF frame log [endTime, interval]
  window.__fr = []; window.__mw = []   // mw = mute windows [a, b] (tapper scan, screenshot)
  let last = 0
  const loop = t => { if (last) { if (window.__fr.length < 20000) window.__fr.push([t, t - last]) } last = t; requestAnimationFrame(loop) }
  requestAnimationFrame(loop)
  window.__lt = []
  // a tap can leave the page (a back button): the document's frame log is stashed under its timeOrigin, absolute times
  const stash = () => { try {
    const to = performance.timeOrigin, segs = JSON.parse(sessionStorage.getItem('__seg') || '{}')
    segs[to] = { fr: window.__fr.map(f => [f[0] + to, f[1]]), lt: window.__lt.map(l => [l[0] + to, l[1]]), mw: window.__mw.map(m => [m[0] + to, m[1] + to]) }
    sessionStorage.setItem('__seg', JSON.stringify(segs))
  } catch (e) {} }
  addEventListener('pagehide', stash)
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]) }).observe({ type: 'longtask', buffered: true }) } catch (e) {}
  // canvases / contexts
  window.__ctx = { '2d': 0, webgl: 0, webgl2: 0, other: 0 }
  const gc = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (t) {
    const r = gc.apply(this, arguments)
    if (r) { if (t === '2d') window.__ctx['2d']++; else if (t === 'webgl' || t === 'experimental-webgl') window.__ctx.webgl++; else if (t === 'webgl2') window.__ctx.webgl2++; else window.__ctx.other++ }
    return r
  }
}

// what a finger can hit right now (from qa-action-latency): [{key, x, y, back}] in DOM order
export function candidates () {
  const OFF = /pengaturan|setting|orang ?tua|parent|suara|sound|music|musik|mute|full ?screen|layar penuh|share|bagikan|install|pasang|reset|hapus|delete|logout|ganti anak|profil|pause|jeda|koleksi|galeri|gallery|gate|lock|kunci|🔒|tahan|khusus/i   // + pause / collection / parent-lock: the first run sat in a PAUSE screen (frames stop) and in modals
  const BACK = /kembali|keluar|rumah|home|back|exit|close|tutup|batal|✕|×/i
  const FIRST = /(^|[^a-z])(main|mulai|start|play|ayo|jalan|pilih|siap|go)([^a-z]|$)/i   // start-ish controls are tapped early: the goal is to get INTO the game
  const W = innerWidth, H = innerHeight, seen = new Set(), out = []
  const els = [...document.querySelectorAll('body *')].filter(e => {
    const t = e.tagName
    if (t === 'BUTTON' || t === 'CANVAS' || t === 'A' || e.getAttribute('role') === 'button' || e.hasAttribute('onclick') || e.onclick || e.onpointerdown || e.ontouchstart || window.__tap.has(e)) return true
    return getComputedStyle(e).cursor === 'pointer'
  })
  for (const e of els) {
    if (e.disabled || e.closest('[data-dcine],[aria-hidden="true"],[inert]')) continue
    if (e.tagName === 'A' && !/^(#|javascript:)/.test(e.getAttribute('href') || '#')) continue
    const label = (e.id + ' ' + e.className + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.title || '') + ' ' + (e.textContent || '').slice(0, 40))
    if (OFF.test(label)) continue
    const r = e.getBoundingClientRect()
    if (r.width < 16 || r.height < 16) continue
    const x = Math.min(Math.max(r.left + r.width / 2, 2), W - 2), y = Math.min(Math.max(r.top + r.height / 2, 2), H - 2)
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue
    const hit = document.elementFromPoint(x, y)
    if (!hit || (hit !== e && !e.contains(hit)) || seen.has(hit)) continue
    seen.add(hit)
    const cls = typeof e.className === 'string' ? e.className.trim().split(/\s+/)[0] : ''
    const words = (e.getAttribute('aria-label') || e.textContent || '').replace(/[^A-Za-z]+/g, ' ').trim().toLowerCase().slice(0, 12)
    out.push({ key: e.tagName.toLowerCase() + (e.id ? '#' + e.id : cls ? '.' + cls : words ? ':' + words : ''), x, y, back: BACK.test(label), first: FIRST.test(label) })
  }
  if (out.every(c => c.back) && (window.__anyTap || document.onclick || document.body.onclick)) {
    const x = W / 2, y = H * 0.6, hit = document.elementFromPoint(x, y)
    if (hit && !hit.closest('[data-dcine]')) out.push({ key: 'screen', x, y, back: false })
  }
  return out
}

// one tapper step (the survey's rule): scan what a finger can hit, tap the least-tapped control. `count` is the tally Map.
// The scan is a mute window (not the page's own cost). Returns true when something was tapped.
export async function tapOnce (p, count, { backPenalty = 6, avoid = null } = {}) {   // backPenalty: how many taps of the others before a leave-the-page control is worth one (the survey's 6; the gate raises it); avoid: RegExp on the control's key, never tapped
  let c = await p.evaluate(() => { const a = performance.now(), r = window.__cand(); window.__mw.push([a, performance.now()]); return r }).catch(() => [])
  if (avoid) c = c.filter(t => !avoid.test(t.key))
  if (!c.length) return false
  const w = t => (count.get(t.key) || 0) + (t.back ? backPenalty : 0) - (t.first ? 2 : 0)
  c.sort((a, z) => w(a) - w(z))
  const t = c[0]
  count.set(t.key, (count.get(t.key) || 0) + 1)
  await p.touchscreen.tap(t.x, t.y).catch(() => {})
  return true
}

// elements in this document plus every same-origin iframe inside it (film games run in one; a plain count would call them empty)
export const countDom = () => {
  const n = d => { let c = d.getElementsByTagName('*').length; for (const f of d.getElementsByTagName('iframe')) { try { if (f.contentDocument) c += n(f.contentDocument) } catch (e) {} } return c }
  return n(document)
}
