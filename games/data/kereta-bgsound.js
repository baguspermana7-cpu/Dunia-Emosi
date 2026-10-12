/* =============================================================================
 * kereta-bgsound.js — a thin background bed under every train board (owner 2026-10-12: "backsound di masing2 scenario,
 * volumenya tipis aja ~20%, yg ditonjolkan SFX"; "pas loopnya fadein out dan sambung loop pas").
 * Original sound, synthesised here (the films' own audio is not redistributed): each scenario's mood + terrain picks
 *   beds    looping layers: wind (a whistle on the mountain and in storms), rain, a river in the gorge, a murmuring
 *           crowd in town and the depot, crickets at dusk and night, and a soft chord pad + music-box line in the
 *           story's own key (brave G, malivlak F, hellbent A; minor in rain, storm and night, maj7 in a dream)
 *   events  one-shots at random moments, so nothing repeats on a clock: birds on dry days, thunder in a storm, far
 *           metal clanks and steam hiss at the depot, a woodpecker in the logging forest, an owl at night
 * Seamless loops: noise beds are rendered a little LONGER than the loop and the tail is folded onto the head with an
 * equal-power crossfade; note-based beds (pad, crickets) are rendered on a circle, so the last notes ring into the start.
 * The whole bed fades in (2.4 s), crossfades between scenarios (2 s), fades out on leaving the board (1.2 s), dips
 * while the narrator speaks, and follows the game's sound switch. Its own AudioContext, unlocked by the first tap.
 * Seam: window.__keretaBg.state() / .bake() / .recipe() for the gates.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var SR = 22050, MASTER = 0.2, XF = 2
  // ── pure DSP (runs in node for the gates) ───────────────────────────────────────────────────────────────────────
  function rng (seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }
  function svf (f, q) { var lo = 0, bp = 0, k = 1 / q, g = 2 * Math.sin(Math.PI * f / SR); return { bp: function (x) { var hi = x - lo - k * bp; bp += g * hi; lo += g * bp; return bp }, set: function (nf) { g = 2 * Math.sin(Math.PI * nf / SR) } } }
  function lp1 (f) { var a = 1 - Math.exp(-2 * Math.PI * f / SR), y = 0; return function (x) { y += a * (x - y); return y } }
  function hp1 (f) { var l = lp1(f); return function (x) { return x - l(x) } }
  // a value that wanders smoothly between lo and hi, a new target every `per` seconds
  function wander (r, lo, hi, per) { var cur = lo + r() * (hi - lo), tgt = cur, n = 0, a = 1 / (per * SR * 0.35); return function () { if (--n <= 0) { tgt = lo + r() * (hi - lo); n = Math.round(per * SR * (0.6 + r() * 0.8)) } cur += (tgt - cur) * a; return cur } }
  function fold (ch, n) { var x = XF * SR, o = new Float32Array(n); o.set(ch.subarray(0, n)); for (var j = 0; j < x; j++) { var t = (j + 0.5) / x; o[j] = ch[j] * Math.sin(t * Math.PI / 2) + ch[n + j] * Math.cos(t * Math.PI / 2) } return o }
  function rms (a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / a.length) }
  function norm (L, R, target) { var k = target / Math.max(1e-6, (rms(L) + rms(R)) / 2), pk = 0, i; for (i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i] * k), Math.abs(R[i] * k)); if (pk > 0.95) k *= 0.95 / pk; for (i = 0; i < L.length; i++) { L[i] *= k; R[i] *= k } return { L: L, R: R } }
  // a noise bed: step(r) gives [left, right] per sample; rendered loop + crossfade, then folded seamless
  function noiseBed (secs, seed, make) {
    var n = secs * SR, m = n + XF * SR, L = new Float32Array(m), R = new Float32Array(m), r = rng(seed), step = make(r)
    for (var i = 0; i < m; i++) { var v = step(); L[i] = v[0]; R[i] = v[1] }
    return norm(fold(L, n), fold(R, n), 0.25)
  }
  var BEDS = {
    wind: function (o) {
      return noiseBed(12, 11, function (r) {
        var bl = 0, br = 0, gl = wander(r, 0.35, 1, 1.8), gr = wander(r, 0.35, 1, 2.1), wh = svf(500, 9), wf = wander(r, 320, 820, 2.6), hpL = hp1(1800), hpR = hp1(1800), lt = lp1(5000)
        return function () {
          var a = r() * 2 - 1, b = r() * 2 - 1; bl = (bl + 0.02 * a) / 1.02; br = (br + 0.02 * b) / 1.02
          var g1 = gl(), g2 = gr(), l = bl * 3.5 * g1, rr = br * 3.5 * g2
          if (o.whistle) { wh.set(wf()); var w = wh.bp(a) * 0.05 * (g1 + g2); l += w; rr += w * 0.8 }
          if (o.bright) { var lv = lt(b); l += hpL(a) * 0.06 * g1; rr += hpR(lv) * 0.06 * g2 }
          return [l, rr]
        }
      })
    },
    rain: function () {
      return noiseBed(10, 23, function (r) {
        var hl = hp1(700), hr = hp1(700), ll = lp1(6000), lr = lp1(6000), dl = 0, dr = 0, df = svf(3000, 6), dt = 0, side = 0
        return function () {
          if (r() < 0.0016) { dl = 1; side = r(); df.set(1800 + r() * 3200) }   // a big drop close by
          dl *= 0.994; dt = df.bp(dl * (r() * 2 - 1)) * 0.9
          return [ll(hl(r() * 2 - 1)) * 0.5 + dt * side, lr(hr(r() * 2 - 1)) * 0.5 + dt * (1 - side)]
        }
      })
    },
    river: function () {
      return noiseBed(11, 37, function (r) {
        var bl = svf(650, 3), br = svf(820, 3), al = wander(r, 0.3, 1, 0.12), ar = wander(r, 0.3, 1, 0.15), lo = lp1(220), bb = 0
        return function () { var x = r() * 2 - 1; bb = (bb + 0.02 * x) / 1.02; var low = lo(bb) * 6; return [bl.bp(x) * al() + low, br.bp(r() * 2 - 1) * ar() + low] }
      })
    },
    murmur: function () {
      return noiseBed(12, 41, function (r) {
        var V = []; for (var v = 0; v < 6; v++) V.push({ f: svf(380 + r() * 520, 4), e: wander(r, 0, 1, 0.18 + r() * 0.1), p: r() })
        var ll = lp1(1400), lr = lp1(1400)
        return function () { var l = 0, rr = 0; for (var i = 0; i < V.length; i++) { var x = V[i].f.bp(r() * 2 - 1) * Math.pow(V[i].e(), 2); l += x * (1 - V[i].p); rr += x * V[i].p } return [ll(l), lr(rr)] }
      })
    },
    // note-based beds are drawn on a circle: index modulo n, so a note ringing past the end continues at the start
    crickets: function () {
      var secs = 9, n = secs * SR, L = new Float32Array(n), R = new Float32Array(n), r = rng(53)
      for (var c = 0; c < 4; c++) {
        var f = 4300 + r() * 600, pan = r(), t = r() * 0.8, per = 0.55 + r() * 0.5
        while (t < secs) {
          for (var p = 0; p < 3; p++) { var s0 = Math.round((t + p * 0.032) * SR), d = Math.round(0.022 * SR); for (var i = 0; i < d; i++) { var v = Math.sin(2 * Math.PI * f * i / SR) * Math.sin(Math.PI * i / d), k = (s0 + i) % n; L[k] += v * (1 - pan); R[k] += v * pan } }
          t += per * (0.85 + r() * 0.3)
        }
      }
      return norm(L, R, 0.2)
    },
    pad: function (o) {
      var BRIGHT = [[36, 52, 55, 60], [33, 52, 57, 60], [29, 53, 57, 60], [31, 50, 55, 59]],   // C Am F G
        DARK = [[33, 52, 57, 60], [29, 53, 57, 60], [36, 52, 55, 60], [28, 52, 55, 59]],      // Am F C Em
        DREAM = [[36, 52, 55, 59], [29, 53, 57, 64], [33, 52, 55, 60], [31, 50, 53, 59]],     // Cmaj7 Fmaj7 Am7 G7
        key = { brave: 7, malivlak: 5, hellbent: 9 }[o.story] || 7, prog = o.feel === 'dark' ? DARK : o.feel === 'dream' ? DREAM : BRIGHT,
        chord = 4, secs = chord * prog.length, n = secs * SR, L = new Float32Array(n), R = new Float32Array(n), r = rng(61)
      function hz (m) { return 440 * Math.pow(2, (m + key - 69) / 12) }
      function note (t0, dur, f, amp, pan, att, rel, pluck) {
        var s0 = Math.round(t0 * SR), d = Math.round((dur + rel) * SR)
        for (var i = 0; i < d; i++) {
          var t = i / SR, env = pluck ? Math.exp(-t / 0.42) * Math.min(1, t / 0.004) : Math.min(1, t / att) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1)
          var v = (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) + (pluck ? 0 : 0.6 * Math.sin(2 * Math.PI * f * 1.003 * t))) * env * amp, k = (s0 + i) % n
          L[k] += v * (1 - pan); R[k] += v * pan
        }
      }
      prog.forEach(function (ch, ci) {
        var t0 = ci * chord
        note(t0, chord, hz(ch[0]), 0.5, 0.5, 0.9, 1.2)
        ch.slice(1).forEach(function (m, j) { note(t0, chord, hz(m), 0.32, 0.3 + j * 0.2, 1.1, 1.4) })
        var step = o.feel === 'bright' ? 0.5 : 1, ord = [1, 2, 3, 2]
        for (var s = 0, q = 0; s < chord - 0.01; s += step, q++) if (q % 2 === 0 || r() < 0.4) note(t0 + s, 0.05, hz(ch[ord[q % 4]] + 12), 0.22, 0.25 + r() * 0.5, 0, 0.9, true)
      })
      return norm(L, R, 0.2)
    }
  }
  // one-shots (mono): generated fresh each time, so no two birds sing alike
  var EVENTS = {
    bird: function (r) {
      var notes = 2 + Math.floor(r() * 5), base = 2600 + r() * 1600, len = 0, parts = []
      for (var i = 0; i < notes; i++) { var d = 0.05 + r() * 0.08; parts.push({ t: len, d: d, f0: base * (0.9 + r() * 0.25), sw: (r() - 0.4) * 1400 }); len += d + 0.035 + r() * 0.09 }
      var a = new Float32Array(Math.round((len + 0.05) * SR))
      parts.forEach(function (p) { var s0 = Math.round(p.t * SR), d = Math.round(p.d * SR), ph = 0; for (var i = 0; i < d; i++) { var u = i / d, f = p.f0 + p.sw * u + 180 * Math.sin(2 * Math.PI * 34 * i / SR); ph += 2 * Math.PI * f / SR; a[s0 + i] += Math.sin(ph) * Math.pow(Math.sin(Math.PI * u), 2) } })
      return a
    },
    thunder: function (r) {
      var a = new Float32Array(5 * SR), l1 = lp1(160), l2 = lp1(160), cr = lp1(900), b = 0, w = wander(r, 0.4, 1, 0.3)
      for (var i = 0; i < a.length; i++) { var t = i / SR, x = r() * 2 - 1; b = (b + 0.03 * x) / 1.03; var env = Math.min(1, t / 0.12) * Math.exp(-t / 1.5); a[i] = (l2(l1(b)) * 14 * w() + (t < 0.4 ? cr(x) * 0.5 * Math.exp(-t / 0.1) : 0)) * env }
      return a
    },
    clank: function (r) {
      var a = new Float32Array(Math.round(1.4 * SR)), hits = r() < 0.5 ? [0] : [0, 0.22 + r() * 0.1], P = [430, 1035, 1720, 2580].map(function (f) { return f * (0.95 + r() * 0.1) }), lo = lp1(1700)
      hits.forEach(function (h, hi) { var s0 = Math.round(h * SR); for (var i = 0; s0 + i < a.length; i++) { var t = i / SR, v = 0; P.forEach(function (f, j) { v += Math.sin(2 * Math.PI * f * t) * Math.exp(-t / (0.5 - j * 0.1)) / (j + 1) }); a[s0 + i] += v * (hi ? 0.6 : 1) } })
      for (var i = 0; i < a.length; i++) a[i] = lo(a[i])
      return a
    },
    hiss: function (r) {
      var d = 1.2 + r() * 0.8, a = new Float32Array(Math.round(d * SR)), h = hp1(2200), l = lp1(7000)
      for (var i = 0; i < a.length; i++) { var t = i / SR; a[i] = l(h(r() * 2 - 1)) * Math.min(1, t / 0.12) * Math.min(1, (d - t) / 0.5) }
      return a
    },
    knock: function (r) {
      var k = 7 + Math.floor(r() * 6), rate = 14 + r() * 5, a = new Float32Array(Math.round((k / rate + 0.1) * SR)), f = svf(1300, 5)
      for (var j = 0; j < k; j++) { var s0 = Math.round(j / rate * SR), amp = 1 - j / k * 0.5; for (var i = 0; i < 0.03 * SR; i++) { var t = i / SR; a[s0 + i] += (Math.sin(2 * Math.PI * 820 * t) * 0.6 + (r() * 2 - 1) * 0.5) * Math.exp(-t / 0.008) * amp } }
      for (var i = 0; i < a.length; i++) a[i] = f.bp(a[i]) * 2
      return a
    },
    owl: function (r) {
      var hoots = [[0, 0.5], [0.85, 0.22], [1.15, 0.6]], a = new Float32Array(Math.round(2 * SR)), f0 = 360 + r() * 50
      hoots.forEach(function (h) { var s0 = Math.round(h[0] * SR), d = Math.round(h[1] * SR), ph = 0; for (var i = 0; i < d; i++) { var u = i / d; ph += 2 * Math.PI * f0 * (1.04 - 0.08 * u) / SR; a[s0 + i] += Math.sin(ph) * Math.pow(Math.sin(Math.PI * u), 1.5) } })
      return a
    }
  }
  function peakNorm (a) { var p = 0, i; for (i = 0; i < a.length; i++) p = Math.max(p, Math.abs(a[i])); if (p > 0) for (i = 0; i < a.length; i++) a[i] /= p; return a }
  // the scenario's sound: a pure function of the story, mood and terrain
  function recipe (story, mood, terr) {
    var wet = mood === 'rain' || mood === 'storm', beds = [], ev = []
    beds.push({ k: 'wind', g: mood === 'storm' ? 0.75 : terr === 'mountain' || terr === 'cloud' ? 0.65 : terr === 'gorge' ? 0.45 : 0.32, o: { whistle: terr === 'mountain' || terr === 'cloud' || mood === 'storm', bright: terr === 'logging' } })
    if (wet) beds.push({ k: 'rain', g: mood === 'storm' ? 0.8 : 0.6 })
    if (terr === 'gorge') beds.push({ k: 'river', g: 0.45 })
    if (terr === 'town' || terr === 'depot') beds.push({ k: 'murmur', g: terr === 'town' ? 0.4 : 0.22 })
    if (mood === 'night' || mood === 'sunset' || mood === 'dream') beds.push({ k: 'crickets', g: mood === 'night' ? 0.35 : 0.16 })
    beds.push({ k: 'pad', g: wet ? 0.35 : 0.55, o: { story: story, feel: wet || mood === 'night' ? 'dark' : mood === 'dream' ? 'dream' : 'bright' } })
    if (!wet && mood !== 'night') ev.push({ k: 'bird', every: terr === 'town' || terr === 'depot' ? 16 : 7, g: 0.22 })
    if (mood === 'storm') ev.push({ k: 'thunder', every: 15, g: 0.9 })
    if (terr === 'depot') ev.push({ k: 'clank', every: 10, g: 0.18 }, { k: 'hiss', every: 18, g: 0.12 })
    if (terr === 'logging') ev.push({ k: 'knock', every: 13, g: 0.2 })
    if (mood === 'night') ev.push({ k: 'owl', every: 20, g: 0.2 })
    return { beds: beds, ev: ev }
  }
  var API = { SR: SR, MASTER: MASTER, recipe: recipe, BEDS: BEDS, EVENTS: EVENTS, rng: rng, peakNorm: peakNorm }
  W.KeretaBgSound = API

  // ── runtime (the train pack only) ───────────────────────────────────────────────────────────────────────────────
  var P = W.MojoPack, def = P && P.def, D = W.document
  if (!def || def.id !== 'kereta' || !D) return
  var STORY = (/[?&]story=([a-z0-9-]+)/.exec(W.location.search) || [])[1] || 'brave'
  var ctx = null, master = null, scene = null, key = '', cache = {}, last = 0, ducked = false
  function soundOn () {
    try { if (localStorage.getItem('dunia-emosi-sound') === 'off') return false } catch (e) {}
    var b = D.getElementById('btn-sound2') || D.getElementById('btn-sound'), a = b && b.getAttribute('aria-pressed')
    return a !== 'false'
  }
  function wantKey () {
    if (D.body.getAttribute('data-scr') !== 'scr-play' || D.hidden || !soundOn()) return ''
    var s = D.getElementById('scr-play'); if (!s) return ''
    return STORY + '|' + (s.getAttribute('data-mood') || 'sun') + '|' + (s.getAttribute('data-terrain') || 'meadow')
  }
  function unlock () {
    if (ctx) { if (ctx.state === 'suspended' && wantKey()) ctx.resume().catch(function () {}); return }
    try { ctx = new (W.AudioContext || W.webkitAudioContext)() } catch (e) { ctx = null; return }
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination)
  }
  ;['pointerdown', 'keydown', 'touchend'].forEach(function (t) { D.addEventListener(t, unlock, true) })
  function bedBuffer (b) {
    var id = b.k + JSON.stringify(b.o || {})
    if (!cache[id]) {
      var keys = Object.keys(cache); if (keys.length > 10) delete cache[keys[0]]
      var d = BEDS[b.k](b.o || {}), buf = ctx.createBuffer(2, d.L.length, SR); buf.copyToChannel(d.L, 0); buf.copyToChannel(d.R, 1); cache[id] = buf
    }
    return cache[id]
  }
  function fadeTo (g, v, secs) { var t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v, t + secs) }
  function drop (sc, secs) { if (!sc) return; fadeTo(sc.gain, 0, secs); setTimeout(function () { sc.src.forEach(function (s) { try { s.stop() } catch (e) {} }); try { sc.gain.disconnect() } catch (e) {} }, secs * 1000 + 120) }
  function build (k) {
    var p = k.split('|'), rc = recipe(p[0], p[1], p[2]), g = ctx.createGain(), sc = { key: k, gain: g, src: [], ev: rc.ev, beds: rc.beds.map(function (b) { return b.k }) }
    g.gain.value = 0; g.connect(master)
    rc.beds.forEach(function (b) {
      var s = ctx.createBufferSource(), bg = ctx.createGain(); s.buffer = bedBuffer(b); s.loop = true; bg.gain.value = b.g
      s.connect(bg); bg.connect(g); s.start(ctx.currentTime + 0.02, Math.random() * s.buffer.duration); sc.src.push(s)
    })
    fadeTo(g, 1, XF)
    return sc
  }
  function fire (e) {
    var a = peakNorm(EVENTS[e.k](Math.random)), buf = ctx.createBuffer(1, a.length, SR), s = ctx.createBufferSource(), g = ctx.createGain()
    buf.copyToChannel(a, 0); s.buffer = buf; g.gain.value = e.g * (0.6 + Math.random() * 0.4)
    var out = g; if (ctx.createStereoPanner) { var pn = ctx.createStereoPanner(); pn.pan.value = Math.random() * 1.6 - 0.8; g.connect(pn); out = pn }
    s.connect(g); out.connect(scene.gain); s.start()
  }
  function tick () {
    var now = Date.now(), dt = last ? Math.min(2, (now - last) / 1000) : 0; last = now
    if (!ctx) return
    var k = wantKey()
    if (!k) {
      if (scene) { var old = scene; scene = null; key = ''; fadeTo(master, 0, D.hidden || !soundOn() ? 0.3 : 1.2); drop(old, 1.3); setTimeout(function () { if (!scene && ctx.state === 'running') ctx.suspend().catch(function () {}) }, 1500) }
      return
    }
    if (ctx.state === 'suspended') { ctx.resume().catch(function () {}); return }
    if (k !== key) {
      var first = !scene, prev = scene; key = k
      try { scene = build(k) } catch (e) { console.warn('[kereta-bgsound] bed failed', e); scene = null; return }
      if (prev) drop(prev, XF)
      if (first) { ducked = false; fadeTo(master, MASTER, 2.4) }
    }
    // the narrator speaks over it: the bed dips to half and comes back
    var talk = false; try { talk = W.speechSynthesis && W.speechSynthesis.speaking } catch (e) {}
    if (!!talk !== ducked) { ducked = !!talk; fadeTo(master, MASTER * (ducked ? 0.5 : 1), ducked ? 0.4 : 1.2) }
    scene.ev.forEach(function (e) { if (Math.random() < dt / e.every) { try { fire(e) } catch (x) {} } })
  }
  setInterval(tick, 400)
  D.addEventListener('visibilitychange', tick)
  W.__keretaBg = { state: function () { return { ctx: ctx ? ctx.state : 'none', key: key, beds: scene ? scene.beds : [], events: scene ? scene.ev.map(function (e) { return e.k }) : [], gain: master ? +master.gain.value.toFixed(3) : 0 } }, recipe: recipe }
})(typeof window !== 'undefined' ? window : globalThis)
