/* =============================================================================
 * games/train-bgm.js   (v55.25)
 * =============================================================================
 * Single source of truth for train-game BGM selection.
 *
 * When a Thomas & Friends character (key prefix 'aeg_') is picked, swap the
 * <audio id="game-bgm"> element's src to one of the two Thomas tracks at 40%
 * volume (mid of owner's 30-50% range). For any other character, fall back to
 * the default ../Sounds/train-bgm.mp3 at the per-game volume.
 *
 * A-303 collision guard: explicit pause() + load() before any src swap so the
 * old buffer halts cleanly. Idempotent — same src → no-op.
 *
 * Used by: g14.html, g14-side.html, g15-pixi.html, g16-pixi.html.
 * ========================================================================== */
;(function () {
  'use strict'

  var THOMAS_TRACKS = [
    '../Sounds/train-bgm-thomas/all-engines-go-theme.mp3',
    '../Sounds/train-bgm-thomas/im-gonna-chug-song.mp3'
  ]
  var DEFAULT_TRACK = '../Sounds/train-bgm.mp3'
  var THOMAS_VOLUME = 0.40 // mid of 0.30-0.50 owner range

  // Stable per-key hash. Each Thomas char ALWAYS plays the same track.
  function hash (str) {
    var h = 0
    for (var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
    return Math.abs(h)
  }

  function pickThomasTrack (trainKey) {
    return THOMAS_TRACKS[hash(String(trainKey)) % THOMAS_TRACKS.length]
  }

  function isThomas (trainKey) {
    return typeof trainKey === 'string' && trainKey.indexOf('aeg_') === 0
  }

  // Last two URL segments are enough to tell tracks apart (handles absolute
  // URLs that the browser canonicalizes).
  function suffix (src) {
    return (src || '').split('/').slice(-2).join('/')
  }

  function setTrack (trainKey, fallbackVolume) {
    var bgm = document.getElementById('game-bgm')
    if (!bgm) return
    var thomasMode = isThomas(trainKey)
    var newSrc = thomasMode ? pickThomasTrack(trainKey) : DEFAULT_TRACK
    var newVol = thomasMode
      ? THOMAS_VOLUME
      : (fallbackVolume != null ? fallbackVolume : (bgm.volume || 0.2))
    if (suffix(bgm.src) !== suffix(newSrc)) {
      try { bgm.pause() } catch (e) {}
      bgm.src = newSrc
      try { bgm.load() } catch (e) {}
    }
    bgm.volume = newVol
  }

  function play () {
    var bgm = document.getElementById('game-bgm')
    if (bgm) { try { bgm.play().catch(function () {}) } catch (e) {} }
  }

  function pauseBgm () {
    var bgm = document.getElementById('game-bgm')
    if (bgm) { try { bgm.pause() } catch (e) {} }
  }

  function stop () {
    var bgm = document.getElementById('game-bgm')
    if (bgm) { try { bgm.pause(); bgm.currentTime = 0 } catch (e) {} }
  }

  window.TrainBGM = {
    setTrack: setTrack,
    play: play,
    pause: pauseBgm,
    stop: stop,
    isThomas: isThomas
  }

  // v55.61 B-252 — kill duplicate / overlapping BGM ("ada 2 backsound").
  // When the page is hidden, backgrounded, or restored from bfcache (a stale
  // game instance that kept playing), pause game-bgm so a freshly-entered race
  // never overlaps a previous one. The race start re-plays explicitly.
  try {
    var _hush = function () { stop() }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) _hush()
    })
    window.addEventListener('pagehide', _hush)
    // bfcache restore: a persisted page may resume its old audio — silence it.
    window.addEventListener('pageshow', function (e) { if (e && e.persisted) _hush() })
  } catch (e) {}
})()
