/* =============================================================================
 * kereta-goals.js — the board says what to do WITHOUT reading (owner 2026-10-11: "Nggak jelas sub mission pada grid
 * dan indicator dan vfx — sangat2 immersive dan clear").
 *   - every pick-up thing floats a PICTURE BUBBLE over a glow ring
 *   - every destination shows a translucent GHOST of the item where it lands (and how many it still wants)
 *   - ordered stops are big numbered posts; the next one pulses
 *   - the goals are a PICTURE CHECKLIST over the board ("0/3") that ticks with a pop; when a slot fills a marker flies
 *     from the destination into the checklist, with sparkles and a sound; the finish flag glows once all is done
 *   - every cast figure, animal and prop that matters wears a small NAME TAG (owner: "kasih tulisan nama dia atau
 *     hewan apa"); the labels live in NAMES below, keyed on the art, so any storyline pack reuses them
 * Pure presentation, loaded after data/kereta-pack.js; the engine only calls def.onHud(ctx) after renderHud().
 * Transform / opacity only; off under prefers-reduced-motion (the checklist still ticks, without flight).
 * ==========================================================================*/
(function (W) {
  'use strict'
  var P = W.MojoPack, def = P && P.def
  if (!def || def.id !== 'kereta') return
  var D = W.document, MA = W.MojoArt, PG = W.ProgGrid
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}

  // art key (regex on the RESOLVED database key) -> short Indonesian label. People by name, animals by kind, props by what they are.
  var NAMES = [
    [/story-char\/henry/, 'Henry'], [/story-char\/carter/, 'Carter'], [/story-char\/james/, 'James'], [/story-char\/baron/, 'Baron'],
    [/story-char\/katrina/, 'Katrina'], [/story-char\/scarlet/, 'Scarlet'], [/story-char\/tuan-merah/, 'Tuan Merah'],
    [/story-char\/pelukis/, 'Pelukis'], [/story-char\/mekanik/, 'Mekanik'], [/story-char\/nyonya/, 'Nyonya'], [/story-char\/anak/, 'Anak'],
    [/train-char\/samson/, 'Samson'], [/train-char\/goro/, 'Goro'], [/train-char\/linus/, 'Linus'],
    [/animal\/deer/, 'Rusa'], [/animal\/turtle/, 'Kura-kura'], [/animal\/(vulture|hering|raven|crow)/, 'Burung Hering'], [/animal\/bird/, 'Burung'], [/animal\/rabbit/, 'Kelinci'],
    [/kereta-prop\/log/, 'Kayu'], [/kereta-prop\/barrel/, 'Tong'], [/kereta-prop\/lantern/, 'Lampu'], [/kereta-prop\/coal/, 'Batu bara'],
    [/kereta-prop\/sawmill/, 'Penggergajian'], [/kereta-prop\/engine-house/, 'Depo'], [/kereta-prop\/station/, 'Stasiun'], [/kereta-prop\/farmhouse/, 'Rumah']
  ]
  function resolve (key) { var a = def.art && def.art[key]; return (a && a.key) || key }
  function labelFor (key, o) {
    if (o && o.label) return o.label
    if (o && o.name && o.type !== 'parcel' && o.type !== 'wagon') return o.name
    var k = resolve(key || '')
    for (var i = 0; i < NAMES.length; i++) if (NAMES[i][0].test(k)) return NAMES[i][1]
    return o && o.name || ''
  }
  function src (k) { return MA.src(k) }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function railAt (lv, r, c) { var row = lv.grid.map[r]; return !!row && /[.=]/.test(row.charAt(c)) }
  // under the feet unless that cell is rail; then over the head; a cell off the board counts as free
  function side (lv, r, c) { return railAt(lv, r + 1, c) && !railAt(lv, r - 1, c) ? 'up' : 'down' }
  function addName (host, text, lv, r, c) {
    if (!text || host.querySelector(':scope > .k-name')) return
    var n = el('span', 'k-name ' + side(lv, r, c)); n.textContent = text; host.appendChild(n)
  }

  /* ── pick-up bubbles, ghosts, name tags, numbered posts (built once per object) ───────────────────────── */
  var PICK = { parcel: 1, rider: 1, wagon: 1 }
  function itemArtFor (lv, stop) {
    var f = (lv.objects || []).filter(function (o) { return PICK[o.type] && o.type !== 'wagon' && (stop.accepts === o.id || stop.accepts === o.type || stop.accepts === o.kind) })[0]
    return f ? (f.type === 'rider' ? 'char/' + (f.who || 'kid') : f.art) : null
  }
  function decorate (lv, bi, w) {
    ;(lv.objects || []).forEach(function (o) {
      var d = D.querySelector('.ob[data-id="' + o.id + '"]'); if (!d || d.getAttribute('data-k')) return
      d.setAttribute('data-k', '1')
      var art = o.type === 'rider' ? 'char/' + (o.who || 'kid') : o.art
      if (PICK[o.type] && art) {
        d.appendChild(el('i', 'k-glow')); d.appendChild(el('span', 'k-bubble', '<img alt="" src="' + src(art) + '">'))
      }
      if (o.type === 'stop') {
        var ia = itemArtFor(lv, o)
        if (ia) d.appendChild(el('span', 'k-ghost', '<img alt="" src="' + src(ia) + '"><b></b>'))
      }
      if (/^(stop|patrol|loco|rider|parcel)$/.test(o.type)) addName(d, labelFor(o.art || (o.type === 'rider' && 'char/' + o.who), o), lv, o.at[0], o.at[1])
    })
    var b = lv.beats[bi] || {}, list = b.decor || lv.decor || []
    var casts = D.querySelectorAll('#decor .dec.cast')
    ;[].forEach.call(casts, function (n, i) {
      var d0 = list[i]; if (!d0 || n.getAttribute('data-k')) return
      n.setAttribute('data-k', '1'); addName(n, labelFor(d0.art, d0), lv, d0.at[0], d0.at[1])
    })
  }
  function refresh (lv, w) {
    // ghosts: how many each destination still wants
    ;(lv.objects || []).forEach(function (o) {
      var d = D.querySelector('.ob[data-id="' + o.id + '"]'); if (!d) return
      var live = PG.find(w, o.id) || o
      if (o.type === 'stop') {
        var g = d.querySelector('.k-ghost b'); if (g) { var left = (o.need || 1) - (live.got || 0); g.textContent = left > 1 ? '×' + left : '' }
        d.classList.toggle('k-filled', live.st === 'done' || live.st === 'delivered')
      }
    })
    // numbered posts: the next one of each sequence pulses
    var seqs = {}
    ;(lv.objects || []).forEach(function (o) {
      if (!o.order) return
      var live = PG.find(w, o.id) || o, s = o.seq || '_'
      if (live.st !== 'got' && live.st !== 'carried' && (!seqs[s] || o.order < seqs[s].order)) seqs[s] = o
    })
    ;(lv.objects || []).forEach(function (o) { if (o.order) { var d = D.querySelector('.ob[data-id="' + o.id + '"]'); if (d) { d.classList.add('k-post'); d.classList.toggle('k-next', !!seqs[o.seq || '_'] && seqs[o.seq || '_'].id === o.id) } } })
  }

  /* ── the picture checklist ─────────────────────────────────────────────────────────────────────────── */
  var S = { key: '', have: [] }
  function groupOf (lv, w, ob) {
    var o = ob.id ? (lv.objects || []).filter(function (x) { return x.id === ob.id })[0] : null, live = o && PG.find(w, o.id), icon, need = 1, have = PG.met(w, ob) ? 1 : 0
    switch (ob['do']) {
      case 'deliver':
        need = (o && o.need) || 1; have = live && (live.st === 'delivered' || live.st === 'done') ? need : Math.min(need, (live && live.got) || 0)
        icon = o && itemArtFor(lv, o) || (o && o.art); break
      case 'wagons': need = ob.n || 1; have = Math.min(need, (w.m.train || []).length)
        icon = ((lv.objects || []).filter(function (x) { return x.type === 'wagon' })[0] || {}).art; break
      case 'reach': icon = 'obj/flag'; break
      default: icon = (o && (o.type === 'rider' ? 'char/' + (o.who || 'kid') : o.art)) || 'obj/star'
    }
    return { need: need, have: have, icon: icon || 'obj/star', ob: ob, from: o && o.id, wagon: ob['do'] === 'wagons', reach: ob['do'] === 'reach' }
  }
  function box () {
    var b = D.getElementById('k-check'); if (b) return b
    var wrap = D.getElementById('board-wrap'); if (!wrap) return null
    b = el('div', 'k-check'); b.id = 'k-check'; b.setAttribute('aria-hidden', 'true'); wrap.appendChild(b); return b
  }
  function build (c, groups) {
    var b = box(); if (!b) return
    b.innerHTML = ''
    groups.forEach(function (g, i) {
      var h = '<img class="k-gi" alt="" src="' + src(g.icon) + '">'
      for (var k = 0; k < g.need; k++) h += '<i class="k-slot' + (k < g.have ? ' on' : '') + '"><img alt="" src="' + src(g.icon) + '"></i>'
      var e = el('div', 'k-grp' + (g.have >= g.need ? ' done' : ''), h + '<b>' + g.have + '/' + g.need + '</b>'); e.setAttribute('data-i', i); b.appendChild(e)
    })
  }
  function sparkle (host) {
    if (RM || !host.animate) return
    var r = host.getBoundingClientRect()
    for (var k = 0; k < 8; k++) (function (k) {
      var s = el('i', 'k-spark'); s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px'; D.body.appendChild(s)
      var a = k / 8 * Math.PI * 2, dx = Math.cos(a) * 34, dy = Math.sin(a) * 26
      var an = s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.23,1,.32,1)' })
      an.onfinish = function () { s.remove() }
    })(k)
  }
  function fly (g, slot, from, done) {
    if (RM || !slot.animate) return done()
    var s = slot.getBoundingClientRect(), f = from && from.getBoundingClientRect(); if (!f || !f.width) return done()
    var m = el('img', 'k-fly'); m.alt = ''; m.src = src(g.icon); D.body.appendChild(m)
    var x0 = f.left + f.width / 2 - 20, y0 = f.top + f.height / 2 - 20, x1 = s.left + s.width / 2 - 20, y1 = s.top + s.height / 2 - 20
    var an = m.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1.3)', opacity: 1 }, { transform: 'translate(' + (x0 + x1) / 2 + 'px,' + (Math.min(y0, y1) - 40) + 'px) scale(1.1)', opacity: 1, offset: .5 }, { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.55)', opacity: .9 }], { duration: 640, easing: 'cubic-bezier(.3,.7,.2,1)' })
    an.onfinish = function () { m.remove(); done() }
  }
  function tick (c, groups) {
    var b = box(); if (!b) return
    groups.forEach(function (g, i) {
      var prev = S.have[i] || 0, e = b.querySelector('.k-grp[data-i="' + i + '"]'); if (!e) return
      var slots = e.querySelectorAll('.k-slot')
      if (g.have > prev) {
        var from = g.wagon ? D.getElementById('mojo') : (g.from && D.querySelector('.ob[data-id="' + g.from + '"] img.main'))
        for (var k = prev; k < g.have; k++) (function (k) {
          var sl = slots[k]; if (!sl) return
          fly(g, sl, from, function () {
            sl.classList.add('on', 'pop'); sparkle(sl)
            e.querySelector('b').textContent = Math.min(g.need, Math.max(k + 1, +e.querySelector('b').textContent.split('/')[0])) + '/' + g.need
            if (g.have >= g.need && k === g.have - 1) e.classList.add('done')
          })
        })(k)
        if (g.have < g.need && c.snd && c.snd.collect) c.snd.collect()
        var st = g.from && c.w && PG.find(c.w, g.from); if (st && c.burst && !RM) c.burst(st.r, st.c, '#FFD54A')
      } else if (g.have < prev) {
        [].forEach.call(slots, function (s, k) { s.classList.toggle('on', k < g.have); s.classList.remove('pop') })
        e.classList.toggle('done', g.have >= g.need); e.querySelector('b').textContent = g.have + '/' + g.need
      }
    })
  }
  function finalGlow (lv, w, groups) {
    var rest = groups.filter(function (g) { return !g.reach }), ready = rest.every(function (g) { return g.have >= g.need })
    ;(lv.objects || []).forEach(function (o) { if (o.type === 'flag') { var d = D.querySelector('.ob[data-id="' + o.id + '"]'); if (d) d.classList.toggle('k-final', ready) } })
    var b = D.getElementById('k-check'); if (b) b.classList.toggle('k-ready', ready)
  }

  def.onHud = function (c) {
    try {
      var lv = c.lv, w = c.w, key = lv.id + '/' + c.bi, groups = (c.beat.objectives || []).map(function (ob) { return groupOf(lv, w, ob) })
      decorate(lv, c.bi, w); refresh(lv, w)
      if (S.key !== key || !D.getElementById('k-check') || D.getElementById('k-check').children.length !== groups.length) { S.key = key; build(c, groups) } else tick(c, groups)
      S.have = groups.map(function (g) { return g.have })
      finalGlow(lv, w, groups)
    } catch (e) { if (W.console) console.warn('[kereta-goals]', e) }
  }
})(typeof window !== 'undefined' ? window : globalThis)
