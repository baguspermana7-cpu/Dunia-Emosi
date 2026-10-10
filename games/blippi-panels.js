/* G32 Blippi -- honest small panels: Bengkel (inspect), Penemuan (stickers), Bermain (free-play yard),
 * Pengaturan and Area Orang Tua. Same chrome and canvas as the four reference screens. */
(function (w) {
  'use strict'
  var B = w.Blippi
  var D = w.BlippiData
  var A = w.BlippiArt
  var raf = null
  var cleanup = []

  function shell (el, pill, navKey) {
    B.bgslot(el, 'bg-garasi')
    B.topLeft(el)
    B.topRight(el)
    B.logo(el, pill, [676, 108, 322, 42])
    var p = B.at(el, 'panel', 150, 170, 1372, 570)
    B.nav(el, navKey, [262, 780, 1175, 145])
    return p
  }
  function leave () {
    if (raf) { cancelAnimationFrame(raf); raf = null }
    var f
    while ((f = cleanup.pop())) f()
  }

  /* ---------- BENGKEL: inspect only ---------- */
  function bengkel (el) {
    var p = shell(el, 'BENGKEL', 'bengkel')
    B.txt(p, 'title ptitle', 0, 18, null, null, 'Bengkel Kendaraan')
    var info = B.at(p, 'mrow', 770, 96, 560, 420)
    info.setAttribute('data-info', 'bengkel')
    var nm = B.txt(info, 'title', 20, 26, 520, 52, 'Pilih satu bagian')
    nm.style.fontSize = '40px'
    var ds = B.txt(info, '', 30, 110, 500, 220, 'Ketuk sebuah bagian untuk melihat apa gunanya. Di sini kita hanya melihat dan belajar.')
    ds.style.cssText += ';font:800 28px/1.3 Nunito,sans-serif;color:#13318A;text-align:center'
    var fo = B.txt(info, '', 30, 340, 500, 60, '')
    fo.style.cssText += ';font:900 26px/1.2 Nunito,sans-serif;color:#1D5FD4;text-align:center'
    var all = []
    D.vehicles.forEach(function (v) { v.modules.forEach(function (m) { all.push({ v: v, m: m }) }) })
    var tiles = []
    all.forEach(function (x, i) {
      var t = B.at(p, 'tile', 40 + (i % 3) * 232, 96 + Math.floor(i / 3) * 214, 215, 190, 'button')
      t.type = 'button'
      t.setAttribute('data-module', x.m.id)
      t.setAttribute('aria-label', x.m.name)
      t.appendChild(A.frame(x.m.art))
      var l = document.createElement('span')
      l.textContent = x.m.name
      t.appendChild(l)
      tiles.push(t)
      t.addEventListener('click', function () {
        B.sfx('tap')
        tiles.forEach(function (o) { o.classList.toggle('sel', o === t) })
        nm.textContent = x.m.name
        ds.textContent = x.m.info
        fo.textContent = 'Dipasang di: ' + B.titleCase(x.v.name)
      })
    })
  }

  /* ---------- PENEMUAN: stickers + world changes ---------- */
  function penemuan (el) {
    var p = shell(el, 'PENEMUAN', 'penemuan')
    var s = B.state()
    var found = 0
    D.stickers.forEach(function (st) { if (s.rewards['reward:' + st.id]) found++ })
    B.txt(p, 'title ptitle', 0, 18, null, null, 'Dinding Penemuan')
    var cnt = B.txt(p, 'ob', 0, 84, 1372, 40, 'Stiker ditemukan: ' + found + ' dari ' + D.stickerTotal)
    cnt.style.cssText += ';font:900 28px/1 Nunito,sans-serif;color:#1D5FD4;text-align:center'
    cnt.setAttribute('data-count', String(found))
    var g = B.at(p, 'dgrid', 36, 140, 1300, 300)
    var i
    for (i = 0; i < D.stickerTotal; i++) {
      var st = D.stickers[i]
      var on = st && s.rewards['reward:' + st.id]
      var d = document.createElement('div')
      d.className = 'stk' + (on ? ' found' : '')
      if (st) d.setAttribute('data-sticker', st.id)
      if (on) { d.appendChild(A.frame(st.art)); d.setAttribute('aria-label', st.name) }
      g.appendChild(d)
    }
    var wl = B.at(p, 'ob', 36, 450, 1300, 100)
    var lines = []
    if (s.world['kota-roda:jalur-taman']) lines.push('Jalur taman di Kota Roda sudah jadi.')
    if (s.world['taman-air:kincir-aktif']) lines.push('Kincir di Taman Air berputar dan airnya mengalir.')
    wl.style.cssText += ';font:800 26px/1.4 Nunito,sans-serif;color:#13318A;text-align:center'
    wl.textContent = lines.length ? lines.join(' ') : 'Selesaikan misi untuk menemukan stiker dan mengubah dunia.'
    wl.setAttribute('data-world-changes', String(lines.length))
  }

  /* ---------- BERMAIN: free-play yard ---------- */
  function bermain (el) {
    var p = shell(el, 'BERMAIN', 'bermain')
    B.txt(p, 'title ptitle', 0, 14, null, null, 'Halaman Main')
    var yard = B.at(p, 'yard', 30, 80, 1312, 400)
    yard.setAttribute('data-yard', '1')
    yard.style.touchAction = 'none'
    var ramp = B.art(yard, 'yard-tanjakan', 560, 120, 300, 140, 'ramp')
    var cones = []
    ;[[250, 80], [330, 270], [1020, 90], [1100, 250]].forEach(function (c) {
      var d = B.art(yard, 'yard-kerucut', c[0], c[1], 60, 78, 'cone')
      cones.push({ el: d, x: c[0] + 30, y: c[1] + 50, hit: false })
    })
    var vid = B.state().vehicle
    var vv = B.vehicleById(vid)
    var car = B.art(yard, vv.thumb, 80, 300, 230, 140, 'veh')
    car.setAttribute('data-car', '1')
    var pos = { x: 195, y: 370 }
    var target = { x: 195, y: 370 }
    var air = 0
    var drag = false
    function move (ev) {
      var r = B.toRef(ev.clientX, ev.clientY)
      var o = B.toRef(yard.getBoundingClientRect().left, yard.getBoundingClientRect().top)
      target = { x: Math.max(60, Math.min(1252, r.x - o.x)), y: Math.max(60, Math.min(340, r.y - o.y)) }
    }
    yard.addEventListener('pointerdown', function (ev) { drag = true; try { yard.setPointerCapture(ev.pointerId) } catch (e) { /* ignore */ } move(ev) })
    yard.addEventListener('pointermove', function (ev) { if (drag) move(ev) })
    function stop () { drag = false }
    yard.addEventListener('pointerup', stop)
    yard.addEventListener('pointercancel', stop)
    yard.addEventListener('lostpointercapture', stop)
    var hb = B.btn(p, 'obtn bbtn', 1060, 496, 270, 62, 'Klakson', function () { B.sfx('honk'); car.firstChild.classList.remove('bounce'); void car.offsetWidth; car.firstChild.classList.add('bounce') })
    hb.textContent = 'KLAKSON'
    hb.setAttribute('data-act', 'klakson')
    var tip = B.txt(p, '', 40, 504, 980, 50, 'Seret di halaman untuk menjalankan ' + B.titleCase(vv.name) + '. Naiki tanjakan dan senggol kerucut!')
    tip.style.cssText += ';font:800 24px/1.2 Nunito,sans-serif;color:#13318A'
    function tick () {
      var dx = target.x - pos.x
      var dy = target.y - pos.y
      pos = { x: pos.x + dx * 0.09, y: pos.y + dy * 0.09 }
      var onRamp = pos.x > 580 && pos.x < 840 && pos.y > 140 && pos.y < 290
      if (onRamp && air === 0 && Math.abs(dx) + Math.abs(dy) > 8) { air = 1; B.sfx('tap') }
      if (!onRamp) air = 0
      car.style.transform = 'translate(' + (pos.x - 115) + 'px,' + (pos.y - 100 - (air ? 28 : 0)) + 'px) scaleX(' + (dx < -4 ? -1 : 1) + ')'
      cones.forEach(function (c) {
        if (!c.hit && Math.abs(c.x - pos.x) < 70 && Math.abs(c.y - pos.y) < 50) { c.hit = true; c.el.classList.add('hit'); car.setAttribute('data-hits', '1'); B.sfx('bad') }
      })
      raf = requestAnimationFrame(tick)
    }
    car.style.left = '0px'
    car.style.top = '0px'
    tick()
  }

  /* ---------- Pengaturan + Area Orang Tua ---------- */
  function settings () {
    var snd
    B.modal({
      title: 'Pengaturan', text: 'Atur suara, atau mulai petualangan dari awal.', h: 460,
      buttons: [
        { id: 'suara', label: B.state().sound ? 'SUARA: NYALA' : 'SUARA: MATI', blue: true, keep: true, fn: function () {
          B.commit(function (s) { s.sound = !s.sound })
          snd.textContent = B.state().sound ? 'SUARA: NYALA' : 'SUARA: MATI'
        } },
        { id: 'ulang', label: 'MULAI ULANG', fn: function () {
          B.modal({ title: 'Mulai dari awal?', text: 'Semua stiker dan kemajuan Blippi akan dihapus.', h: 420, buttons: [
            { id: 'batal', label: 'BATAL', blue: true },
            { id: 'hapus', label: 'HAPUS', fn: function () { B.resetAll(); B.go('hub', null, true) } }
          ] })
        } },
        { id: 'tutup', label: 'TUTUP', blue: true }
      ],
      build: function (m) { snd = m.querySelector('[data-act=suara]') }
    })
  }
  function parent () {
    var s = B.state()
    var n = 0
    D.order.forEach(function (id) { if (s.done[id]) n++ })
    var timer = null
    var m = B.modal({
      title: 'Area Orang Tua', text: 'Tahan tombol di bawah selama 2 detik untuk membuka.', h: 500,
      buttons: [{ id: 'tutup', label: 'TUTUP', blue: true }]
    })
    var hold = B.btn(m, 'obtn', 240, 250, 300, 92, 'Tahan 2 detik', null)
    hold.textContent = 'TAHAN 2 DETIK'
    hold.setAttribute('data-act', 'tahan')
    hold.style.fontSize = '28px'
    hold.addEventListener('pointerdown', function () {
      timer = setTimeout(function () {
        m.querySelector('p').textContent = 'Misi selesai: ' + n + ' dari ' + D.order.length + '. Stiker: ' + Object.keys(s.rewards).length + '. Tidak ada pembelian, iklan, atau pelacakan waktu bermain di game ini.'
        hold.style.display = 'none'
      }, 2000)
    })
    function cancel () { if (timer) { clearTimeout(timer); timer = null } }
    hold.addEventListener('pointerup', cancel)
    hold.addEventListener('pointercancel', cancel)
    hold.addEventListener('pointerleave', cancel)
  }

  B.register('bengkel', bengkel)
  B.register('penemuan', penemuan)
  B.register('bermain', bermain, leave)
  w.BlippiPanels = { settings: settings, parent: parent }
})(window)
