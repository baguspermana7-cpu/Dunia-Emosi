/* CekUI — PRD-53 "Cek Kemampuan" screens that are not an item: island map, top bar, island result card, Perkiraan
 * IQ card, Papan Juara Otak, owl guide, celebration effects. All art is shared project sprites (tk-world islands,
 * mascot owl 006, UISprites eco/badge/conf/emo packs); nothing here is an emoji or an icon-font glyph.
 * Effects: SFXEngine cues, SakugaFX kira sparkles, VFX.Moment.celebrate, DuniaCinema.pulse, sprite confetti.
 */
;(function (W) {
  'use strict'
  var D = W.document, $ = function (id) { return D.getElementById(id) }
  var BASE = location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/'
  function asset (p) { return BASE + p }
  function sprite (pack, name) { return (W.UISprites && W.UISprites.path(pack, name)) || '' }
  function esc (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';' }) }
  var ISLES = {
    pola: { name: 'Pulau Pola', art: 'palm-island', at: [20, 24], tip: 'Main pola: susun manik atau balok berulang (merah-biru-merah-biru), lalu tanya "berikutnya apa?".' },
    bentuk: { name: 'Pulau Bentuk', art: 'arch-island', at: [50, 14], tip: 'Main tangram atau puzzle; putar potongannya bersama sebelum dipasang.' },
    ingat: { name: 'Pulau Ingat', art: 'cave-island', at: [80, 24], tip: 'Main "aku pergi ke pasar membeli..." dan tambah satu barang tiap giliran.' },
    kata: { name: 'Pulau Kata', art: 'lighthouse-island', at: [80, 66], tip: 'Baca buku bergambar tiap malam dan tanya nama benda yang jarang dilihat.' },
    cepat: { name: 'Pulau Cepat', art: 'sunset-sea', at: [50, 78], tip: 'Main "cari perbedaan" pada dua gambar, pakai jam pasir.' },
    angka: { name: 'Pulau Angka', art: 'snow-island', at: [20, 66], tip: 'Hitung benda di rumah, lalu tebak "lebih banyak mana?" sebelum menghitung.' }
  }
  var ORDER = ['pola', 'bentuk', 'ingat', 'kata', 'cepat', 'angka']
  function isleArt (id) { return asset('assets/db/lib/tk-world/' + ISLES[id].art + '.webp') }

  // ---------- sound + effects ----------
  function sfx (name) { try { if (W.SFXEngine && W.SFXEngine[name]) W.SFXEngine[name]() } catch (_) {} }
  var lastSaid = ''
  function say (t) { if (t) lastSaid = t; try { if (W.DuniaSpeak) W.DuniaSpeak.say(t) } catch (_) {} }
  function centre (el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }
  function sparkle (el) { try { var p = centre(el); if (W.SakugaFX && W.SakugaFX.kira) { W.SakugaFX.kira(p.x, p.y, { r: 14 }); W.SakugaFX.kira(p.x + 18, p.y - 14, { r: 9 }) } } catch (_) {} }
  function confetti (n) {
    var fx = $('fx'); if (!fx || (W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches)) return
    var kinds = ['conf-pink', 'conf-blue', 'conf-yellow', 'conf-green', 'conf-purple', 'star', 'balloon-gold', 'streamer']
    for (var i = 0; i < (n || 18); i++) {
      var im = D.createElement('img'); im.alt = ''; im.src = sprite('conf', kinds[i % kinds.length])
      im.style.left = (Math.random() * 96) + 'vw'; im.style.animationDelay = (Math.random() * 0.6) + 's'; im.style.animationDuration = (1.4 + Math.random()) + 's'
      fx.appendChild(im)
    }
    setTimeout(function () { fx.innerHTML = '' }, 3200)
  }
  function celebrate (el) {
    sfx('levelup')
    try { if (W.DuniaCinema) W.DuniaCinema.pulse('win') } catch (_) {}
    // size 150: the burst sizes itself from the element otherwise (a 358 px card -> a 650 px sprite, pixelated; PRD-54)
    try { if (W.VFX && W.VFX.Moment) W.VFX.Moment.celebrate(el || centre(D.body), { size: 150 }) } catch (_) {}
    confetti(20)
  }

  // ---------- who is playing ----------
  // PRD-56: someone else can play from this page (no trip to the beranda): a child of the family (the app's own active
  // slot changes, so every avatar-scoped save follows) or a guest with a name and an age band ('cek-tamu' list,
  // 'cek-aktif' = 'tamu:<name>' while a guest plays; the guest's results live under 'cek-kemampuan@<name>')
  function family () { try { return (JSON.parse(localStorage.getItem('dunia-players') || '[]') || []).filter(function (p) { return p && p.name }) } catch (_) { return [] } }
  function guests () { try { var g = JSON.parse(localStorage.getItem('cek-tamu') || '[]'); return Array.isArray(g) ? g.filter(function (x) { return x && x.name }) : [] } catch (_) { return [] } }
  function guestNow () {
    var a = ''; try { a = localStorage.getItem('cek-aktif') || '' } catch (_) {}
    if (a.indexOf('tamu:') !== 0) return null
    var nm = a.slice(5); return guests().filter(function (g) { return g.name === nm })[0] || null
  }
  function me () {
    var players = [], act = 0
    var g = guestNow(); if (g) return { name: g.name, avatar: '', guest: true, age: g.age || '7-8' }
    try { players = JSON.parse(localStorage.getItem('dunia-players') || '[]') || [] } catch (_) {}
    try { act = (JSON.parse(localStorage.getItem('dunia-active-slot') || '[0,1]') || [0])[0] | 0 } catch (_) {}
    var p = players[act]
    if (p && p.name) return { name: W.CekBoard.cleanName(p.name) || 'Kawan', avatar: W.CekBoard.slugOf(p.animal), player: true }
    var n = ''; try { n = localStorage.getItem('cek-nama') || '' } catch (_) {}
    return n ? { name: n, avatar: '', player: false } : null
  }
  function avatarSrc (slug) { return slug && W.CekBoard.EMO[slug] ? sprite('emo', W.CekBoard.EMO[slug]) : asset('assets/db/mascots/012.webp') }
  function topBar (who, stars) {
    $('top').hidden = !who; if (!who) return
    $('me-av').src = avatarSrc(who.avatar); $('me-name').textContent = who.name
    $('me-star').src = sprite('eco', 'star-gold'); $('me-stars').textContent = stars + '/18'
    $('board-ico').src = sprite('badge', 'trophy')
  }

  // ---------- map ----------
  function map (best, onPick) {
    var pts = ORDER.map(function (id) { return ISLES[id].at })
    var route = '<svg class="route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M' + pts.map(function (p) { return p[0] + ' ' + p[1] }).join(' L') + ' Z" fill="none" stroke="#fefdf7" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".85"/></svg>'
    var next = ORDER.filter(function (id) { return !best[id] })[0]
    $('map').innerHTML = route + ORDER.map(function (id) {
      var I = ISLES[id], b = best[id], n = b ? b.stars : 0
      var st = [1, 2, 3].map(function (k) { return '<img alt="" src="' + sprite('eco', k <= n ? 'star-gold' : 'star-empty') + '">' }).join('')
      return '<button type="button" class="isle' + (id === next ? ' next' : '') + '" data-isle="' + id + '" style="left:' + I.at[0] + '%;top:' + I.at[1] + '%" aria-label="' + I.name + (b ? ', ' + n + ' bintang' : '') + '">' +
        '<img class="art" alt="" src="' + isleArt(id) + '">' + (b ? '<img class="flag" alt="" src="' + asset('assets/db/lib/tk-prop/flag-white-star.webp') + '">' : '') +
        '<span class="lbl">' + I.name + '</span><span class="st">' + st + '</span></button>'
    }).join('')
    D.querySelectorAll('#map .isle').forEach(function (b) { b.onclick = function () { sfx('click'); onPick(b.getAttribute('data-isle')) } })
  }
  function guide (t, speak) { $('guide-say').textContent = t; if (speak) say(t) }

  // ---------- island result ----------
  function result (id, stars, points, text) {
    $('done-art').src = isleArt(id); $('t-done').textContent = stars >= 3 ? 'Luar biasa!' : stars === 2 ? 'Hebat!' : 'Bagus, terus berlatih!'
    $('done-stars').innerHTML = [1, 2, 3].map(function (k) { return '<img alt="" src="' + sprite('eco', k <= stars ? 'star-gold' : 'star-empty') + '">' }).join('')
    $('done-text').textContent = text
    var el = $('done-points'), t0 = performance.now()
    ;(function tick (t) { var k = Math.min(1, (t - t0) / 900); el.textContent = Math.round(points * k); if (k < 1) requestAnimationFrame(tick) })(t0)
    if (W.CekMotion) W.CekMotion.stars($('done-stars'))   // PRD-54 A5: stars land one at a time
    try { if (W.CekSea) W.CekSea.flash() } catch (_) {}     // a bloom spike on the sea behind the card
    setTimeout(function () { celebrate($('result-card')) }, 60)
  }

  // ---------- Perkiraan IQ ----------
  // PRD-54 A5: the reveal runs in steps: curtain lifts, trophy drops, the ring fills while the number counts up, the
  // range shows, the island bars grow one by one, then the celebration. Text is set at once (screen readers, gates);
  // only the look is staged. Reduced motion: all steps within 200 ms, fades only.
  var stopReveal = null
  function iqCard (est, zs, unsure) {
    unsure = unsure || []
    if (stopReveal) stopReveal()
    var M = W.CekMotion, ring = $('iq-ring'), num = $('iq-num')
    $('iq-trophy').src = sprite('badge', 'trophy')
    ring.style.strokeDashoffset = '100'
    if (!est) {
      num.textContent = '?'; $('iq-range').textContent = 'Selesaikan 3 pulau untuk melihat perkiraan IQ.'
    } else {
      $('iq-range').textContent = 'kisaran ' + est.lo + '-' + est.hi + ' (90 %, dari ' + est.islands + ' pulau, ' + (est.mode === 'cepat' ? 'mode Cepat' : est.mode === 'campuran' ? 'mode Normal dan Cepat' : 'mode Normal') + ')'
      num.textContent = '0'
    }
    var done = ORDER.filter(function (id) { return (zs[id] !== null && zs[id] !== undefined) || unsure.indexOf(id) >= 0 })
    $('iq-bars').innerHTML = done.map(function (id) {
      var no = unsure.indexOf(id) >= 0, w = no ? 0 : Math.round(Math.max(6, Math.min(100, (zs[id] + 2) / 4 * 100))), out = !W.CekProfile.IN_IQ[id]
      return '<div class="b"><img alt="" src="' + isleArt(id) + '"><div><div class="nm">' + ISLES[id].name + (no ? ' <small class="unsure">kurang pasti</small>' : out ? ' <small class="unsure">belum dihitung</small>' : '') + '</div><div class="track"><div class="fill" style="width:' + w + '%"></div></div></div></div>'
    }).join('')
    $('iq-note').textContent = 'Perkiraan dari permainan, bukan tes resmi psikolog. Kata dan soal cerita belum dihitung (soalnya dibaca).'
    var low = done.filter(function (id) { return unsure.indexOf(id) < 0 }).sort(function (a, b) { return zs[a] - zs[b] })[0]
    $('iq-tip').hidden = !low; if (low) $('iq-tip').textContent = 'Latihan di rumah: ' + ISLES[low].tip
    var fills = D.querySelectorAll('#iq-bars .fill'), bars = 1450, party = bars + fills.length * 150 + 250
    function grow () { fills.forEach(function (f, i) { if (M) M.run(f, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 520, delay: i * 150, easing: M.EASE, fill: 'backwards' }) }) }
    function count (fast) {
      var pct = Math.max(0.04, Math.min(1, (est.iq - 55) / 90)), t0 = performance.now(), dur = fast ? 1 : 1000
      if (M) M.run(ring, [{ strokeDashoffset: 100 }, { strokeDashoffset: 100 - pct * 100 }], { duration: dur, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' })
      ring.style.strokeDashoffset = String(100 - pct * 100)
      ;(function tick (t) { var k = Math.min(1, (t - t0) / dur); num.textContent = Math.round(est.iq * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick) })(t0)
      setTimeout(function () { num.textContent = est.iq }, dur + 50)   // rAF can stall (hidden tab, slow phone): land on the real number
    }
    if (!est) { grow(); return }
    if (!M) { count(true); grow(); setTimeout(function () { celebrate($('iq-trophy')) }, 300); return }
    stopReveal = M.reveal([
      [0, function () { if (!M.reduced()) M.run($('iq-curtain'), [{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: 'ease-out', fill: 'forwards' }) }, 'curtain'],
      [120, function () {
        M.run($('iq-trophy'), [{ opacity: 0, transform: 'translateY(-90px) scale(.7)' }, { opacity: 1, transform: 'translateY(6px) scale(1.06)', offset: 0.75 }, { opacity: 1, transform: 'none' }], { duration: 520, easing: M.POP, fill: 'backwards' })
        setTimeout(function () { try { if (W.VFX && W.VFX.Moment) W.VFX.Moment.puff($('iq-trophy')) } catch (_) {} }, 420)
      }, 'trophy'],
      [250, function (fast) { count(fast) }, 'gauge'],
      [1300, function () { M.run($('iq-range'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: M.EASE, fill: 'backwards' }) }, 'range'],
      [bars, grow, 'bars'],
      [party, function () { celebrate($('iq-trophy')); try { if (W.CekSea) W.CekSea.flash() } catch (_) {} }, 'celebrate']
    ])
  }

  // ---------- Papan Juara Otak ----------
  var MEDAL = ['rank-gold', 'rank-silver', 'rank-bronze']
  function rows (list, mine) {
    if (!list.length) return '<li><span class="pl"></span><img class="av" alt="" src="' + asset('assets/db/mascots/006.webp') + '"><span>Belum ada yang selesai 3 pulau.</span></li>'
    return list.map(function (r) {
      var pl = r.place && r.place <= 3 ? '<img alt="juara ' + r.place + '" src="' + sprite('badge', MEDAL[r.place - 1]) + '">' : (r.place || '-')
      var isMe = r.me || (mine && r.name === mine.name && (r.avatar || '') === (mine.avatar || ''))
      return '<li' + (isMe ? ' class="me"' : '') + '><span class="pl">' + pl + '</span><img class="av" alt="" src="' + avatarSrc(r.avatar) + '"><span>' + esc(r.name) +
        '<small>' + ((r.islands | 0)) + ' pulau' + (r.mode === 'cepat' ? ', Cepat' : r.mode === 'campuran' ? ', campuran' : '') + '</small></span><span class="v">' + (r.iq == null ? '-' : Math.round(+r.iq) || '-') + '</span></li>'
    }).join('')
  }
  var boardTok = 0
  function board (tab, getDevice, mine) {
    var tok = ++boardTok
    D.querySelectorAll('.tab').forEach(function (t) { var on = t.getAttribute('data-tab') === tab; t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false') })
    var dev = getDevice()
    if (tab === 'device') { $('board-note').textContent = 'Anak-anak di perangkat ini.'; $('board-rows').innerHTML = rows(dev); if (W.CekMotion) W.CekMotion.rows($('board-rows')); return Promise.resolve('device') }
    $('board-note').textContent = 'Memuat papan semua pemain...'; $('board-rows').innerHTML = rows(dev)
    return W.CekBoard.online(50).then(function (list) {
      if (tok !== boardTok) return 'stale'
      if (!list) { $('board-note').textContent = 'Sedang offline. Ini papan di perangkat ini.'; return 'offline' }
      $('board-note').textContent = 'Semua pemain. Hanya nama depan yang ditampilkan.'; $('board-rows').innerHTML = rows(list, mine); if (W.CekMotion) W.CekMotion.rows($('board-rows')); return 'online'
    })
  }

  // ---------- owl cheer during items (never says right or wrong) ----------
  var CHEERS = ['Terus, kamu hebat!', 'Semangat!', 'Pelan-pelan saja, kamu bisa!', 'Wah, rajin sekali!', 'Ayo, sedikit lagi!']
  var cheerN = 0
  function cheer () {
    var c = $('cheer'), t = CHEERS[cheerN++ % CHEERS.length]; $('cheer-say').textContent = t; c.classList.add('on')
    setTimeout(function () { c.classList.remove('on') }, 1700)
  }

  W.CekUI = { ISLES: ISLES, ORDER: ORDER, isleArt: isleArt, asset: asset, sprite: sprite, esc: esc, sfx: sfx, say: say, sparkle: sparkle, celebrate: celebrate, confetti: confetti,
    lastSay: function () { return lastSaid || $('hint').textContent }, me: me, family: family, guests: guests, topBar: topBar, map: map, guide: guide, result: result, iqCard: iqCard, board: board, cheer: cheer, avatarSrc: avatarSrc }
})(window)
