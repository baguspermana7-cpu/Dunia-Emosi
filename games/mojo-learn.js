/* =============================================================================
 * mojo-learn.js — window.MojoLearn: "Belajar Bersama Mojo" as a short activity loop (owner 2026-10-01:
 * "not just listen"). Five rounds per session rotate four activities; the words, pictures, options and
 * no-repeat history come from SoalEngine (MojoSoal.lesson, profile g31 context 'learn').
 *   susun   spell the tool's name: tap (or drag) a letter block into the next empty box
 *   pasang  what is this tool for? pick the matching job picture
 *   gambar  hear/see the word, pick the tool picture
 *   awal    pick the first letter of the tool's name
 * A wrong choice shakes and stays available; it never ends a round. The session ends with a reward card
 * (stars + bolts in the profile). ES5, no emoji: owner sprites or drawn SVG only.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var MA, API, L = null
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}
  var EOUT = 'cubic-bezier(.23,1,.32,1)'
  var TITLES = { susun: 'Susun Kata', pasang: 'Pasangkan Alat', gambar: 'Gambar & Kata', awal: 'Huruf Awal' }
  var ASK = {
    susun: { en: 'Susun nama alat ini dalam bahasa Inggris.', id: 'Susun nama alat ini.' },
    pasang: { en: 'Alat ini untuk apa?', id: 'Alat ini untuk apa?' },
    gambar: { en: 'Mana gambar alat ini?', id: 'Mana gambar alat ini?' },
    awal: { en: 'Huruf pertama nama alat ini?', id: 'Huruf pertama nama alat ini?' }
  }
  function node (tag, cls, text) { var e = D.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }
  function btn (cls, label, fn) { var b = node('button', cls); b.type = 'button'; if (label != null) b.textContent = label; if (fn) b.addEventListener('click', fn); return b }
  function img (key, alt) { var i = node('img'); i.src = MA.src(key); i.alt = alt || ''; i.draggable = false; return i }
  function anim (e, frames, ms) { try { return e.animate(frames, { duration: RM ? 0 : ms, easing: EOUT }) } catch (x) { return null } }
  function shake (e) {
    e.classList.add('nope')
    anim(e, RM ? [{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }] : [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], 220)
    W.setTimeout(function () { e.classList.remove('nope') }, 260)
  }
  // Belajar teaches the ENGLISH tool word by default (owner 2026-10-01); a chip switches to Bahasa
  var langPick = 'en'
  function langOf () { return langPick }

  function open (api) {
    API = api; MA = W.MojoArt
    var lang = langOf(), avatar = W._activeAvatarSlug ? W._activeAvatarSlug() : undefined
    var rounds = W.MojoSoal.lesson({ lang: lang, avatar: avatar })
    L = { rounds: rounds, i: 0, lang: lang, mistakes: 0, solved: false, host: api.screen('scr-learn', 'Belajar Bersama Mojo'), done: false }
    L.host.classList.add('learn-host')
    draw()
  }
  function dots () {
    var d = node('div', 'learn-dots'); d.setAttribute('aria-label', 'Ronde ' + (L.i + 1) + ' dari ' + L.rounds.length)
    L.rounds.forEach(function (r, k) { d.appendChild(node('i', k < L.i ? 'on' : k === L.i ? 'now' : '')) })
    return d
  }
  function draw () {
    var r = L.rounds[L.i], host = L.host
    host.innerHTML = ''; L.solved = false
    if (!r) return reward()
    var card = node('div', 'learn-card learn-' + r.kind), pic = node('div', 'learn-pic'), play = node('div', 'learn-play')
    card.setAttribute('data-kind', r.kind)
    var head = node('div', 'learn-head')
    head.appendChild(node('b', 'fk learn-kind', TITLES[r.kind])); head.appendChild(dots())
    var spk = btn('learn-spk', null, function () { API.say(r.word, r.lang, true); if (r.lang === 'en') W.setTimeout(function () { API.say(r.meaning, 'id', true) }, 900) })
    spk.id = 'learn-say'; spk.setAttribute('aria-label', 'Dengarkan kata'); spk.innerHTML = '<i class="ico">' + MA.icon('speak') + '</i>'
    var lg = btn('learn-lang', r.lang === 'en' ? 'EN' : 'ID', function () { langPick = langPick === 'en' ? 'id' : 'en'; API.cue(); open(API) })
    lg.id = 'learn-lang'; lg.setAttribute('aria-label', r.lang === 'en' ? 'Kata bahasa Inggris. Ketuk untuk bahasa Indonesia' : 'Kata bahasa Indonesia. Ketuk untuk bahasa Inggris')
    head.appendChild(lg); head.appendChild(spk)
    play.appendChild(head)
    play.appendChild(node('p', 'learn-ask', ASK[r.kind][r.lang]))
    if (r.kind === 'gambar') { var w = node('div', 'learn-word fk', r.word); pic.appendChild(w) } else pic.appendChild(img(r.pic, r.meaning))
    card.appendChild(pic); card.appendChild(play); host.appendChild(card)
    var foot = node('div', 'learn-foot'); foot.id = 'learn-foot'; play.appendChild(foot)
    if (r.kind === 'susun') susun(r, play)
    else choices(r, play)
    play.appendChild(foot)
    if (r.kind === 'gambar' && r.lang === 'en') W.setTimeout(function () { if (L && L.rounds[L.i] === r) API.say(r.word, 'en', true) }, 350)
  }

  /* ── Susun Kata: letter blocks into the empty boxes ───────────────────── */
  function susun (r, play) {
    var slots = node('div', 'learn-slots'), tiles = node('div', 'learn-tiles')
    slots.id = 'learn-slots'; tiles.id = 'learn-tiles'
    r.slots.forEach(function (ch, k) {
      var s = btn('lslot' + (k < r.prefill ? ' fixed' : ''), k < r.prefill ? ch : '', function () { back(k) })
      s.setAttribute('data-i', k); s.setAttribute('aria-label', k < r.prefill ? 'Huruf ' + ch : 'Kotak ' + (k + 1))
      if (k < r.prefill) s.disabled = true
      slots.appendChild(s)
    })
    r.tiles.forEach(function (ch, k) {
      var t = btn('ltile fk', ch, function () { if (t.__drag) { t.__drag = false; return } place(t, nextEmpty()) })
      t.setAttribute('data-l', ch); t.setAttribute('data-k', k)
      dragable(t)
      tiles.appendChild(t)
    })
    play.appendChild(slots); play.appendChild(tiles)
    function nextEmpty () { var s = slots.children; for (var k = 0; k < s.length; k++) if (!s[k].textContent) return k; return -1 }
    function place (t, k) {
      if (L.solved || k < 0 || t.disabled) return
      var s = slots.children[k]
      if (s.textContent) return
      var from = t.getBoundingClientRect(), to = s.getBoundingClientRect()
      if (t.getAttribute('data-l') !== r.slots[k]) {
        // a gentle "not here": the block hops toward the box, shakes and stays in the tray
        L.mistakes++; API.cue()
        anim(t, [{ transform: 'translate(0,0)' }, { transform: 'translate(' + (to.left - from.left) * 0.25 + 'px,' + (to.top - from.top) * 0.25 + 'px)' }, { transform: 'translate(0,0)' }], 200)
        W.setTimeout(function () { shake(t) }, RM ? 0 : 200)
        return
      }
      t.disabled = true; t.classList.add('used')
      s.textContent = t.textContent; s.setAttribute('data-from', t.getAttribute('data-k')); s.classList.add('filled')
      anim(s, [{ transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px)', opacity: 0.6 }, { transform: 'translate(0,0)', opacity: 1 }], 200)
      API.cue()
      if (nextEmpty() < 0) solved(r)
    }
    function back (k) {
      var s = slots.children[k]
      if (L.solved || !s.textContent || s.classList.contains('fixed')) return
      var t = tiles.querySelector('[data-k="' + s.getAttribute('data-from') + '"]')
      s.textContent = ''; s.classList.remove('filled'); s.removeAttribute('data-from')
      if (t) { t.disabled = false; t.classList.remove('used'); anim(t, [{ transform: 'scale(.85)', opacity: 0.4 }, { transform: 'scale(1)', opacity: 1 }], 180) }
    }
    function dragable (t) {
      var d = null
      t.addEventListener('pointerdown', function (e) { if (t.disabled || L.solved) return; d = { x: e.clientX, y: e.clientY, on: false }; try { t.setPointerCapture(e.pointerId) } catch (x) {} })
      t.addEventListener('pointermove', function (e) {
        if (!d) return
        var dx = e.clientX - d.x, dy = e.clientY - d.y
        if (!d.on && dx * dx + dy * dy > 144) { d.on = true; t.classList.add('dragging') }
        if (d.on) t.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'
      })
      function end (e) {
        if (!d) return
        var was = d.on; d = null; t.classList.remove('dragging'); t.style.transform = ''
        if (!was) return
        t.__drag = true
        var hit = null
        ;[].forEach.call(slots.children, function (s, k) { var b = s.getBoundingClientRect(); if (e.clientX >= b.left - 8 && e.clientX <= b.right + 8 && e.clientY >= b.top - 8 && e.clientY <= b.bottom + 8) hit = k })
        if (hit != null && !slots.children[hit].textContent) place(t, hit)
        W.setTimeout(function () { t.__drag = false }, 0)
      }
      t.addEventListener('pointerup', end); t.addEventListener('pointercancel', function () { d = null; t.classList.remove('dragging'); t.style.transform = '' })
    }
  }

  /* ── Pasangkan Alat / Gambar & Kata / Huruf Awal: pick one of three ──── */
  function choices (r, play) {
    if (r.kind === 'awal') {
      var shown = node('div', 'learn-slots'); shown.id = 'learn-slots'
      r.word.split('').forEach(function (ch, k) { var s = node('span', 'lslot' + (k ? ' fixed' : ' q'), k ? ch : ''); shown.appendChild(s) })
      play.appendChild(shown)
    }
    var row = node('div', 'learn-opts' + (r.kind === 'awal' ? ' letters' : '')); row.id = 'learn-opts'
    r.options.forEach(function (o, k) {
      var b = btn('lopt' + (r.kind === 'awal' ? ' ltile fk' : ''), null, function () {
        if (L.solved || b.disabled) return
        if (!o.ok) { L.mistakes++; API.cue(); shake(b); b.disabled = true; return }
        b.classList.add('right'); API.cue()
        if (r.kind === 'awal') { var q = play.querySelector('.lslot.q'); if (q) { q.textContent = o.label; q.classList.add('filled') } }
        solved(r)
      })
      b.setAttribute('data-ok', o.ok ? '1' : '0'); b.setAttribute('data-k', k)
      if (o.pic) { b.appendChild(img(o.pic, '')); b.appendChild(node('span', '', o.label)) } else b.textContent = o.label
      b.setAttribute('aria-label', o.label)
      row.appendChild(b)
    })
    play.appendChild(row)
  }

  /* ── a round is solved: say the word, sparkle, show its meaning ──────── */
  function solved (r) {
    L.solved = true
    API.say(r.word, r.lang, true)
    var card = L.host.querySelector('.learn-card')
    card.classList.add('solved')
    sparkle(card.querySelector('.learn-pic'))
    var foot = D.getElementById('learn-foot')
    foot.innerHTML = ''
    var mean = node('p', 'learn-mean')
    var name = r.meaning.charAt(0) + r.meaning.slice(1).toLowerCase()
    mean.textContent = (r.lang === 'en' ? r.word + ' = ' + name + '. ' : '') + name + ' untuk ' + r.use + '.'
    foot.appendChild(mean)
    var next = btn('btn b-go fk', L.i + 1 < L.rounds.length ? 'Lanjut' : 'Selesai', function () { L.i++; draw() })
    next.id = 'learn-next'
    foot.appendChild(next)
    anim(foot, [{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], 220)
  }
  function sparkle (host) {
    if (RM || !host) return
    for (var k = 0; k < 8; k++) (function (k) {
      var s = node('i', 'lspark'), a = k / 8 * Math.PI * 2, dx = Math.cos(a) * 70, dy = Math.sin(a) * 60
      s.style.backgroundImage = 'url(' + MA.src('obj/star') + ')'
      host.appendChild(s)
      var an = anim(s, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(1)', opacity: 0 }], 600)
      W.setTimeout(function () { s.remove() }, 650)
      return an
    })(k)
  }

  /* ── reward: stars by how smoothly it went, bolts into the profile ───── */
  function reward () {
    var stars = L.mistakes === 0 ? 3 : L.mistakes <= 2 ? 2 : 1, bolts = stars
    if (!L.done) { L.done = true; L.stars = stars; API.award(bolts) }
    var card = node('div', 'learn-card learn-reward')
    card.setAttribute('data-kind', 'reward')
    var bo = img('mojo-char/bo-celebrate', 'Bo'); bo.className = 'learn-bo'
    var body = node('div', 'learn-play')
    body.appendChild(node('h2', 'fk', 'Hebat!'))
    var st = node('div', 'learn-stars')
    for (var k = 1; k <= 3; k++) { var i = node('i', k <= stars ? 'on' : ''); i.style.backgroundImage = 'url(' + MA.src('obj/star') + ')'; st.appendChild(i) }
    body.appendChild(st)
    var got = node('p', 'learn-got'); got.appendChild(img('obj/bolt', '')); got.appendChild(node('span', '', '+' + bolts + ' lencana baut di Profil'))
    body.appendChild(got)
    var row = node('div', 'row')
    var again = btn('btn b-soft fk', 'Main Lagi', function () { open(API) }); again.id = 'learn-again'
    var home = btn('btn b-go fk', 'Kembali', function () { API.home() }); home.id = 'learn-home'
    row.appendChild(again); row.appendChild(home); body.appendChild(row)
    card.appendChild(bo); card.appendChild(body)
    L.host.appendChild(card)
    API.say('Hebat! Kamu dapat ' + stars + ' bintang.', 'id')
  }

  W.MojoLearn = {
    open: open,
    state: function () { if (!L) return null; var r = L.rounds[L.i]; return { round: L.i, rounds: L.rounds.length, kind: r ? r.kind : 'reward', word: r ? r.word : null, lang: L.lang, solved: L.solved, mistakes: L.mistakes, done: L.done, stars: L.stars || 0, words: L.rounds.map(function (x) { return x.id }) } }
  }
})(window, document)
