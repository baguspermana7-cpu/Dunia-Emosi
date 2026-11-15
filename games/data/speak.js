/*
 * speak.js — the one speech path and the one sound check for every page (audit A-13, v64.54).
 *
 *   DuniaSpeak.soundOn()        the parent's sound setting ('dunia-emosi-sound' = 'off' is muted). Defers to
 *                               DuniaProfile.soundOn() (save-engine.js) when that is on the page; reads the key itself
 *                               otherwise (film pages, the Mojo embed, the Timmy harnesses). Default: on.
 *   DuniaSpeak.say(text, opts)  speaks `text`, cancelling the line before it. Says nothing while soundOn() is false.
 *                               opts: lang ('id-ID'), rate, pitch, volume, voice (a SpeechSynthesisVoice; default: the
 *                               first voice of `lang`, for Indonesian also one named "Indonesia"), onend, and
 *                               always (true: skip the soundOn() check — only for a game that keeps its own override of
 *                               the setting, e.g. Timmy, where a child's tap on its speaker unmutes that game).
 *                               Returns true when a line was handed to speechSynthesis.
 *   DuniaSpeak.cancel()         stops the current line.
 *
 * Before v64.54 the setting was read in 17 files and speech built 12 times; tools/qa-sound-one-path.mjs keeps it one.
 * Each caller passes its own wording, language and rate, so what a child hears did not change.
 */
(function (W) {
  if (!W || W.DuniaSpeak) return

  function soundOn () {
    try { var P = W.DuniaProfile; if (P && typeof P.soundOn === 'function') return P.soundOn() } catch (e) {}
    try { return W.localStorage.getItem('dunia-emosi-sound') !== 'off' } catch (e) { return true }
  }

  function pickVoice (lang) {
    try {
      var vs = W.speechSynthesis.getVoices() || [], base = String(lang || '').split(/[-_]/)[0]
      var re = new RegExp('^' + base + '([-_]|$)', 'i')
      return vs.filter(function (v) { return re.test(v.lang) })[0] ||
        (base === 'id' ? vs.filter(function (v) { return /indonesia/i.test(v.name) })[0] : null) || null
    } catch (e) { return null }
  }

  function cancel () { try { W.speechSynthesis && W.speechSynthesis.cancel() } catch (e) {} }

  function say (text, opts) {
    var o = opts || {}
    if (!text || (!o.always && !soundOn())) return false
    try {
      var S = W.speechSynthesis
      if (!S || !W.SpeechSynthesisUtterance) return false
      var u = new W.SpeechSynthesisUtterance(String(text))
      u.lang = o.lang || 'id-ID'
      if (o.rate != null) u.rate = o.rate
      if (o.pitch != null) u.pitch = o.pitch
      if (o.volume != null) u.volume = o.volume
      var v = o.voice || pickVoice(u.lang); if (v) u.voice = v
      if (typeof o.onend === 'function') u.onend = o.onend
      S.cancel()
      S.speak(u)
      return true
    } catch (e) { return false }
  }

  W.DuniaSpeak = { say: say, cancel: cancel, soundOn: soundOn }
})(typeof window !== 'undefined' ? window : this)
