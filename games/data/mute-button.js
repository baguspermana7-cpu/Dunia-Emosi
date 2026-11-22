/* MuteButton — PRD-55 (owner 2026-11-22: "G ada tombol mute lagi"). A speaker button on every game header of the
 * hub (index.html, next to the pause button) and on the beranda (#screen-menu, beside the "back" button). A tap flips
 * the one sound setting ('dunia-emosi-sound', effects + music) through game.js toggleSoundSetting(), so the Settings
 * overlay stays in step. The icon is an SVG (no emoji) and follows the setting: aria-pressed = muted.
 *   MuteButton.sync()   redraws every button from the setting (called after any change)
 */
;(function (W, D) {
  'use strict'
  if (W.MuteButton) return
  var ON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  var OFF = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'

  function muted () { try { return !!W.DuniaSpeak && !W.DuniaSpeak.soundOn() } catch (e) { return false } }   // the one sound check

  function sync () {
    var m = muted()
    D.querySelectorAll('.dunia-mute').forEach(function (b) {
      if (b.dataset.state === (m ? 'off' : 'on')) return
      b.dataset.state = m ? 'off' : 'on'
      b.innerHTML = m ? OFF : ON
      b.setAttribute('aria-pressed', m ? 'true' : 'false')
      b.setAttribute('aria-label', m ? 'Suara mati, ketuk untuk menyalakan' : 'Suara nyala, ketuk untuk mematikan')
    })
  }

  function tap (e) {
    e.stopPropagation()
    if (typeof W.toggleSoundSetting === 'function') W.toggleSoundSetting()   // game.js: the one writer of the setting
    sync()
  }

  function make (cls) {
    var b = D.createElement('button'); b.type = 'button'; b.className = cls + ' dunia-mute'
    b.addEventListener('click', tap)
    return b
  }

  function mount () {
    D.querySelectorAll('.game-header').forEach(function (h) {
      if (h.querySelector('.dunia-mute')) return
      var pause = h.querySelector('.gh-pause')
      var b = make('gh-pause gh-mute')
      if (pause) pause.parentNode.insertBefore(b, pause.nextSibling); else h.appendChild(b)
    })
    var menu = D.getElementById('screen-menu')
    if (menu && !menu.querySelector('.dunia-mute')) {
      var bar = menu.querySelector(':scope > div[style*="justify-content:flex-end"]')
      if (bar) { var m = make('menu-mute'); bar.insertBefore(m, bar.firstChild) }
    }
    sync()
  }

  // the Settings overlay flips the same key: redraw when it is used, and when another tab changes it
  D.addEventListener('click', function (e) { if (e.target && e.target.closest && e.target.closest('#settings-sound-btn')) setTimeout(sync, 0) }, true)
  W.addEventListener('storage', function () { sync() })

  W.MuteButton = { sync: sync, mount: mount }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', mount); else mount()
})(window, document)
