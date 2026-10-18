/* games/dunia-music.js — window.DuniaMusic: background music that loops with no seam and never overlaps another track
 * (owner 2026-10-18: Mojo theme on the menus, "Life Is a Highway" for the film racers, "Nothing Can Stop Me Now" for
 * Blippi's air race; 40-60 % volume; "loop deliver dengan sempurna").
 *
 *   var m = DuniaMusic.track(src, { vol: 0.5 })   // one per song
 *   m.want(bool)        // play / fade out (call it as often as you like; it is idempotent)
 *   m.duck(k)           // 0..1 multiplier (e.g. under a narrator's voice)
 *   m.state()           // { playing, vol, t }
 *
 * The files are prepared by tools/make-music-loop.py: the tail is crossfaded into the head, so the last sample flows
 * into the first. An <audio loop> still clicks or gaps at the wrap (decoder padding), so each track runs TWO players
 * and hands over 0.35 s before the end with an equal-power crossfade -- the wrap is inaudible.
 * One track at a time: wanting a track fades every other DuniaMusic track out first (no two songs at once).
 * Playback starts after the first tap (autoplay rule); a hidden tab pauses everything.
 */
;(function (W, D) {
  'use strict'
  if (W.DuniaMusic) return
  var tracks = [], gesture = false, HAND = 0.35
  ;['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { W.addEventListener(ev, function () { gesture = true }, { capture: true, passive: true }) })
  function track (src, o) {
    o = o || {}
    var A = [new Audio(), new Audio()], cur = 0, vol = 0, wantOn = false, duck = 1, xf = -1, base = o.vol == null ? 0.5 : o.vol
    A.forEach(function (a) { a.preload = 'auto'; a.src = src; a.volume = 0 })
    function play (a) { var p = a.play(); if (p && p.catch) p.catch(function () {}) }
    var T = {
      want: function (v) {
        v = !!v
        if (v && !wantOn) tracks.forEach(function (t) { if (t !== T) t.want(false) })   // one song at a time
        wantOn = v
      },
      duck: function (k) { duck = Math.max(0, Math.min(1, k)) },
      state: function () { return { playing: !A[cur].paused, vol: +vol.toFixed(2), t: +A[cur].currentTime.toFixed(1) } },
      tick: function () {
        var on = wantOn && gesture && !D.hidden
        var target = on ? base * duck : 0
        vol += (target - vol) * 0.16; if (Math.abs(target - vol) < 0.004) vol = target
        var a = A[cur], b = A[1 - cur]
        if (on && a.paused) play(a)
        // hand over to the other player just before the end of the file (equal-power crossfade, HAND seconds)
        var d = a.duration
        if (on && d && isFinite(d) && xf < 0 && a.currentTime > d - HAND) { xf = 0; b.currentTime = 0; play(b) }
        if (xf >= 0) {
          xf = Math.min(1, xf + 0.1 / HAND)
          a.volume = vol * Math.cos(xf * Math.PI / 2); b.volume = vol * Math.sin(xf * Math.PI / 2)
          if (xf >= 1) { a.pause(); a.currentTime = 0; cur = 1 - cur; xf = -1 }
        } else { a.volume = Math.max(0, Math.min(1, vol)); if (!b.paused) b.pause() }
        if (!on && vol <= 0.003) { A.forEach(function (x) { if (!x.paused) x.pause() }) }
      }
    }
    tracks.push(T)
    return T
  }
  setInterval(function () { for (var i = 0; i < tracks.length; i++) tracks[i].tick() }, 100)
  D.addEventListener('visibilitychange', function () { for (var i = 0; i < tracks.length; i++) tracks[i].tick() })
  W.DuniaMusic = { track: track, all: function () { return tracks } }
})(window, document)
