/* ============================================================================
 * gt-card.js — window.GTCard. The Garasi Tempur card, drawn in code (PRD v2 §4, §5.2).
 *
 * WHY IN CODE: the owner's sheet had one card frame with baked-in text; a live frame can
 * be translated, read aloud, resized for any screen and re-coloured per Type — and any
 * truck picture from the shared DB just drops into the art window ("karakternya tinggal
 * isi di area kartu").
 *
 * ANATOMY (all sizes in em, so a card is one font-size away from any size):
 *   ┌───────────────────────────┐  .gc  (5 : 7, rounded, Type-coloured rim + pattern)
 *   │ [type chip]  NAME   HP 14 │  .gc-head
 *   │ ┌───────────────────────┐ │  .gc-win  — 3 PARALLAX LAYERS:
 *   │ │  L0 sky/pattern (0.3) │ │     .gc-l0 (background)  moves 0.3 × tilt
 *   │ │  L1 TRUCK ART   (1.0) │ │     .gc-l1 (the picture) moves 1.0 × tilt, breaks the frame on attack
 *   │ └───────────────────────┘ │     .gc-l2 (glare/foil)  moves −0.6 × tilt
 *   │ ⛽ Seruduk           2 ▸ │  .gc-atk (tap target on the table)
 *   │ ⛽⛽ Banting Raksasa   4 ▸ │
 *   │ Kuat vs ARMOR +1   ★★ ⌂ │  .gc-foot (strong-vs rule in words, rarity)
 *   └───────────────────────────┘
 * Type is never colour alone: symbol icon + written name + border pattern (PRD §4).
 *
 * API: GTCard.truck(def, opts) / .part(def) / .action(def) / .fuel() / .back() -> HTML string
 *      GTCard.tilt(el, x, y)  — x,y in [-1,1]: sets the layer offsets (transform only)
 * ==========================================================================*/
(function () {
  'use strict'
  var W = window
  var BASE = (function () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } })()
  function lib (k) { return (W.AssetIndex && AssetIndex.path(k)) || (BASE + 'assets/db/lib/' + k + '.webp') }
  function esc (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') }
  var TYPE_ICON = { POWER: 'gt/type-power', SPEED: 'gt/type-speed', MUD: 'gt/type-mud', STUNT: 'gt/type-stunt', ARMOR: 'gt/type-armor', TECH: 'gt/type-tech' }
  var STARS = { biasa: 1, langka: 2, epik: 3, legenda: 4 }
  var PART_ICON = { tire: 'gt/part-tire', body: 'gt/part-bumper', engine: 'gt/part-engine' }
  var ACT_ICON = { heal: 'gt/repair-kit', draw: 'gt/deck', fuel: 'gt/fuel-can', boost: 'gt/q-math', nitro: 'gt/part-nitro', 'switch': 'gt/winch' }

  function fuelCans (n) {
    if (!n) return '<span class="gc-free">gratis</span>'
    var s = ''; for (var i = 0; i < n; i++) s += '<img class="gc-can" src="' + lib('gt/fuel-can') + '" alt="">'
    return s
  }
  function truck (d, o) {
    o = o || {}
    var T = W.GTCards && GTCards.TYPES[d.type]
    var stars = ''; for (var i = 0; i < (STARS[d.rarity] || 1); i++) stars += '★'
    var hp = o.hp !== undefined ? o.hp : d.hp, max = o.maxHp || d.hp
    var atk = d.attacks.map(function (a, i) {
      var dis = o.fuel !== undefined && o.fuel < (o.fuelNeed ? o.fuelNeed[i] : a.fuel)
      return '<button class="gc-atk' + (dis ? ' off' : '') + '" type="button" data-atk="' + i + '" aria-label="Serang ' + esc(a.name) + ', ' + a.dmg + ' kerusakan">' +
        '<span class="gc-cans">' + fuelCans(a.fuel) + '</span><span class="gc-an">' + esc(a.name) + '</span><b class="gc-dmg">' + (o.preview ? o.preview[i] : a.dmg) + '</b></button>'
    }).join('')
    return '<div class="gc gc-truck gc-' + d.type + (o.cls ? ' ' + o.cls : '') + '" data-card="' + esc(o.inst || d.id) + '" data-type="' + d.type + '" style="--tc:' + (T ? T.color : '#888') + '">' +
      '<div class="gc-head"><img class="gc-ti" src="' + lib(TYPE_ICON[d.type]) + '" alt=""><span class="gc-tn">' + (T ? T.name : d.type) + '</span>' +
      '<span class="gc-name">' + esc(d.name) + '</span><span class="gc-hp' + (hp < max / 3 ? ' low' : '') + '"><small>HP</small><b>' + hp + '</b></span></div>' +
      '<div class="gc-win"><div class="gc-l0"></div><img class="gc-l1" src="' + lib(d.sprite) + '" alt="' + esc(d.name) + '" draggable="false"><div class="gc-l2"></div>' +
      (hp < max ? '<div class="gc-hpbar"><i style="width:' + Math.round(100 * hp / max) + '%"></i></div>' : '') + '</div>' +
      '<div class="gc-atks">' + atk + '</div>' +
      '<div class="gc-foot"><span>Kuat vs ' + d.strongVs + ' +1</span><span class="gc-r gc-r-' + d.rarity + '">' + stars + '</span></div></div>'
  }
  // parts / actions / fuel: header icon + name, picture, ribbon label (mockup "PART - TIRE"), rule text
  var HEAD_ICON = { part: 'gt/tool-kit', action: 'gt/lightning', fuel: 'gt/fuel-can' }
  function small (kind, title, sub, icon, o, rib) {
    o = o || {}
    return '<div class="gc gc-' + kind + (o.cls ? ' ' + o.cls : '') + '" data-card="' + esc(o.inst || '') + '">' +
      '<div class="gc-head"><img class="gc-ti" src="' + lib(HEAD_ICON[kind]) + '" alt=""><span class="gc-name">' + esc(title) + '</span></div>' +
      '<div class="gc-win gc-win-icon"><div class="gc-l0"></div><img class="gc-l1" src="' + lib(icon) + '" alt="" draggable="false"><div class="gc-l2"></div></div>' +
      '<span class="gc-rib">' + rib + '</span><div class="gc-txt">' + esc(sub) + '</div></div>'
  }
  function partText (d) {
    var s = []
    if (d.hp) s.push('HP +' + d.hp)
    if (d.dmg) s.push('Serangan +' + d.dmg)
    if (d.armor) s.push('Kerusakan masuk −' + d.armor)
    if (d.nitro) s.push('Nitro +' + d.nitro)
    if (d.fuelTax) s.push('Butuh bensin +' + d.fuelTax)
    return s.join(' · ')
  }
  var ACT_TEXT = { heal: function (v) { return 'Pulihkan ' + v + ' HP' }, draw: function (v) { return 'Ambil ' + v + ' kartu' }, fuel: function (v) { return 'Bensin +' + v },
    boost: function (v) { return 'Serangan berikut +' + v }, nitro: function (v) { return 'Nitro +' + v }, 'switch': function () { return 'Tukar truk dengan cadangan' } }
  var SLOT_NAME = { tire: 'Ban', body: 'Bodi', engine: 'Mesin' }

  W.GTCard = {
    truck: truck,
    part: function (d, o) { return small('part', d.name, partText(d), PART_ICON[d.slot], o, 'ONDERDIL · ' + SLOT_NAME[d.slot].toUpperCase()) },
    action: function (d, o) { return small('action', d.name, ACT_TEXT[d.effect](d.value), ACT_ICON[d.effect], o, d.effect === 'boost' ? 'TANTANGAN' : 'AKSI') },
    fuel: function (o) { return small('fuel', 'Bensin', 'Isi 1 per giliran. Serangan butuh bensin.', 'gt/fuel-can', o, 'ENERGI') },
    back: function (o) { return '<div class="gc gc-back' + (o && o.cls ? ' ' + o.cls : '') + '"><img src="' + lib('gt/card-back') + '" alt="" draggable="false"></div>' },
    any: function (def, o) {
      if (!def) return this.back(o)
      if (def.cat === 'truck') return truck(def, o)
      if (def.cat === 'part') return this.part(def, o)
      if (def.cat === 'action') return this.action(def, o)
      return this.fuel(o)
    },
    tilt: function (el, x, y) {
      if (!el) return
      var l0 = el.querySelector('.gc-l0'), l1 = el.querySelector('.gc-l1'), l2 = el.querySelector('.gc-l2')
      el.style.transform = 'perspective(700px) rotateY(' + (x * 10).toFixed(2) + 'deg) rotateX(' + (-y * 10).toFixed(2) + 'deg)'
      if (l0) l0.style.transform = 'translate(' + (x * -4) + '%,' + (y * -4) + '%) scale(1.12)'
      if (l1) l1.style.transform = 'translate(' + (x * 7) + '%,' + (y * 5) + '%) scale(1.04)'
      if (l2) l2.style.transform = 'translate(' + (x * -30) + '%,' + (y * -30) + '%)'
    },
    lib: lib, TYPE_ICON: TYPE_ICON
  }
})()
