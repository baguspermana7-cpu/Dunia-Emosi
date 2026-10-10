/* =============================================================================
 * kereta-quiz.js — window.KeretaQuiz: the parchment question card of "Kereta Pemberani: Petualangan Rel".
 * Questions come from the shared SoalEngine (profile 'kereta', packs in data/soal-pack-kereta.js) and are STORY
 * MOMENTS: the signal box (sinyal), loading the wagons (muat), the ticket office (loket), the coal bunker (bunker).
 * A wrong answer is never a failure: the card gives a kind hint and the child tries again; after three tries the
 * right choice glows. Pictures are database sprites (count copies, two groups to compare, picture choices) or an
 * SVG shape — never emoji.
 *   KeretaQuiz.ask(place, root, done)   shows the card inside `root`; done(true) after the right answer
 *   KeretaQuiz.current()                the item on screen (tests read .answer), or null
 *   KeretaQuiz.pick(place)              one question for a place (SoalEngine, per-avatar no-repeat)
 * ==========================================================================*/
(function (W) {
  'use strict'
  var cur = null
  function esc (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  var TITLE = { sinyal: 'Kotak Sinyal', muat: 'Memuat Gerbong', loket: 'Loket Tiket', bunker: 'Bunker Batu Bara' }
  var KIND = ['Hampir benar! ', 'Coba lagi, pelan-pelan saja. ', 'Kamu pasti bisa. ']

  function pick (place) {
    var SE = W.SoalEngine
    try {
      if (SE && SE.pick) {
        var q = SE.pick({ game: 'kereta', packs: ['kereta-' + place], count: 1, avatar: 'auto', pictures: 'sprite' })
        if (q && q[0]) return q[0]
      }
    } catch (e) {}
    var all = W.KeretaQuestions && W.KeretaQuestions.byPlace(place)
    return all && all.length ? all[Math.floor(Math.random() * all.length)] : null
  }
  function sprites (key, n, cls) {
    var h = ''
    for (var i = 0; i < n; i++) h += '<img class="kq-s ' + (cls || '') + '" alt="" decoding="async" src="' + W.KeretaArt.src(key) + '">'
    return h
  }
  function shapeSvg (s) {
    var b = s === 'lingkaran' ? '<circle cx="50" cy="50" r="38"/>' : s === 'persegi' ? '<rect x="14" y="14" width="72" height="72" rx="4"/>' : s === 'segitiga' ? '<path d="M50 12L90 86H10z"/>' : '<rect x="6" y="26" width="88" height="48" rx="4"/>'
    return '<svg class="kq-shape" viewBox="0 0 100 100" aria-hidden="true">' + b + '</svg>'
  }
  function body (q) {
    var h = ''
    if (q.shape) h += '<div class="kq-pic">' + shapeSvg(q.shape) + '</div>'
    else if (q.picA && q.picB) h += '<div class="kq-pic kq-two"><div class="kq-grp">' + sprites(q.picA, q.nA, 'sm') + '</div><div class="kq-vs"></div><div class="kq-grp">' + sprites(q.picB, q.nB, 'sm') + '</div></div>'
    else if (q.pic && q.picCount) h += '<div class="kq-pic"><div class="kq-grp">' + sprites(q.pic, q.picCount, 'sm') + '</div></div>'
    else if (q.pic) h += '<div class="kq-pic">' + sprites(q.pic, 1, '') + '</div>'
    return h
  }
  function ask (place, root, done) {
    var q = pick(place)
    if (!q) { if (done) done(true); return }
    cur = q
    var tries = 0, over = document.createElement('div')
    over.className = 'kq-overlay'; over.setAttribute('role', 'dialog'); over.setAttribute('aria-modal', 'true'); over.setAttribute('aria-label', TITLE[place] || 'Pertanyaan')
    var ch = ''
    q.choices.forEach(function (c, i) {
      var pic = q.choicePics && q.choicePics[c]
      ch += '<button type="button" class="kq-choice" data-i="' + i + '">' + (pic ? '<img alt="" decoding="async" src="' + W.KeretaArt.src(pic) + '">' : '') + '<span>' + esc(c) + '</span></button>'
    })
    over.innerHTML = '<div class="kq-card"><div class="kq-head"><span class="kq-tag">' + esc(TITLE[place] || 'Pertanyaan') + '</span></div>' +
      '<p class="kq-prompt">' + esc(q.prompt) + '</p>' + body(q) + '<div class="kq-choices' + (q.choicePics ? ' kq-picchoice' : '') + '">' + ch + '</div>' +
      '<p class="kq-msg" aria-live="polite"></p></div>'
    root.appendChild(over)
    var msg = over.querySelector('.kq-msg'), btns = [].slice.call(over.querySelectorAll('.kq-choice'))
    function finish () { cur = null; if (over.parentNode) over.parentNode.removeChild(over); if (done) done(true) }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var c = q.choices[+b.getAttribute('data-i')]
        if (W.KeretaFX) W.KeretaFX.sound.unlock()
        if (String(c) === String(q.answer)) {
          b.classList.add('ok'); btns.forEach(function (x) { x.disabled = true })
          msg.textContent = 'Benar! ' + (q.explain || '')
          if (W.KeretaFX) W.KeretaFX.sound.ok()
          setTimeout(finish, W.KeretaFX && W.KeretaFX.reduced() ? 500 : 900)
        } else {
          tries++; b.classList.add('no'); b.disabled = true
          msg.textContent = KIND[Math.min(tries - 1, 2)] + (q.hint1 || '')
          if (W.KeretaFX) W.KeretaFX.sound.boop()
          if (tries >= 3) btns.forEach(function (x) { if (q.choices[+x.getAttribute('data-i')] === q.answer) x.classList.add('glow') })
        }
      })
    })
    if (btns[0]) btns[0].focus({ preventScroll: true })
  }
  W.KeretaQuiz = { ask: ask, pick: pick, current: function () { return cur } }
})(typeof window !== 'undefined' ? window : globalThis)
