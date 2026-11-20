/* =============================================================================
 * soal-arcade-boot.js — PRD-39. Loads the shared question stack (SoalEngine + its banks + SoalArcade) for an
 * arcade page on the child's FIRST tap, not with the page: the ten files are ~90 kB and ten requests the first
 * screen does not need (perf budget, PRD-33). Until they arrive the page asks from its own small bank, which is
 * what `SoalArcade.next` returning nothing already means on every page.
 *
 *   <script src="data/soal-arcade-boot.js?v=TOKEN" data-extra="../quiz-engine.js"></script>
 *
 * data-extra: more files to load first, relative to this folder. Every file is loaded in order, one after the
 * other (each bank registers itself with the engine loaded before it), with this script's own ?v= token, and is
 * skipped when the page already has it. `soal-arcade-ready` fires on window when the last one has run.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  if (W.SoalArcadeBoot) return
  var me = D.currentScript, src = (me && me.src) || ''
  var base = src.replace(/[^/]*$/, ''), query = src.indexOf('?') >= 0 ? src.slice(src.indexOf('?')) : ''
  var LIST = ['dunia-bus.js', 'learning-log.js', 'mastery.js', 'super-quiz-data.js', 'question-super-engine.js',
    'kids-questions.js', 'g23-question-engine.js', 'soal-engine.js', 'soal-gen-matematika.js', 'soal-arcade.js']
  var extra = me && me.getAttribute('data-extra') ? me.getAttribute('data-extra').split(',') : []
  var started = false

  function name (s) { return String(s).split('?')[0].split('/').pop() }
  function have (f) {
    var s = D.scripts
    for (var i = 0; i < s.length; i++) if (name(s[i].getAttribute('src') || '') === name(f)) return true
    return false
  }
  function load () {
    if (started) return
    started = true
    var todo = extra.concat(LIST).filter(function (f) { return !have(f) })
    ;(function nextFile () {
      var f = todo.shift()
      if (!f) { try { W.dispatchEvent(new Event('soal-arcade-ready')) } catch (e) {} return }
      var s = D.createElement('script')
      s.src = base + f + query
      s.onload = s.onerror = nextFile
      D.head.appendChild(s)
    })()
  }

  W.SoalArcadeBoot = { load: load, LIST: LIST.slice() }
  ;['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
    W.addEventListener(ev, load, { once: true, passive: true, capture: true })
  })
})(window, document)
