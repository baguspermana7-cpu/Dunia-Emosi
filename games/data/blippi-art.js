/* G32 Blippi -- THE art map. Every picture the game shows is a SLOT here.
 *
 * To ship art: put assets/blippi/<key>.webp in the repo and add the key to SHIPPED
 * below (no network probing, so offline stays honest). No other code changes.
 * Until a key ships, the slot draws a PLACEHOLDER FRAME in exactly the slot's box:
 * rounded, dashed border, soft tinted fill, a silhouette hint, the slot name in caps.
 *
 * Row: [key, LABEL, kind, widthPx, heightPx, transparent(1)/opaque(0), screen, view/pose]
 * Sizes are pixels at the owner's 1672x941 reference frame. docs/blippi/ART-SLOTS.md
 * is generated from this list. Blippi is never drawn from imagination: owner art only.
 */
(function (w) {
  'use strict'
  var BASE = '../assets/blippi/'
  var SHIPPED = {} // e.g. { 'blippi-menunjuk': true }

  var ROWS = [
    // backgrounds (opaque, full frame)
    ['bg-hub', 'LATAR HUB - GARASI PENEMUAN', 'scene', 1672, 941, 0, 'Hub', 'Taman garasi, pandangan 3/4 dari atas, tanpa karakter dan tanpa kendaraan'],
    ['bg-peta', 'LATAR PETA - LAUTAN', 'scene', 1672, 941, 0, 'Peta', 'Lautan biru dan batu karang saja; pulau terpisah (pulau-*)'],
    ['bg-garasi', 'LATAR GARASI KENDARAAN', 'scene', 1672, 941, 0, 'Kendaraan, Bengkel, Penemuan, Bermain', 'Dalam garasi, lantai kosong untuk alas bundar'],
    ['bg-misi-kincir', 'LATAR TAMAN AIR', 'scene', 1672, 941, 0, 'Misi W02-M01', 'Taman air, jalan batu di depan, tanpa truk dan tanpa kincir'],
    ['bg-misi-jalan', 'LATAR KOTA RODA - SUNGAI', 'scene', 1672, 941, 0, 'Misi W01-M01', 'Sungai melintang kiri-kanan, tepi bawah dan atas rata'],
    // brand + Blippi (owner art only)
    ['logo-blippi', 'LOGO BLIPPI', 'logo', 250, 140, 1, 'Semua layar', 'Logo BLIPPI + dasi kupu-kupu, depan'],
    ['blippi-menunjuk', 'BLIPPI - MENUNJUK', 'person', 330, 640, 1, 'Hub, Peta, Kendaraan', 'Seluruh badan, berdiri, kedua tangan menunjuk ke kanan, tersenyum'],
    ['blippi-potret', 'BLIPPI - POTRET', 'person', 190, 190, 1, 'Misi', 'Kepala dan bahu, tersenyum, menghadap depan'],
    ['blippi-profil', 'BLIPPI - PROFIL', 'person', 92, 92, 1, 'Semua layar', 'Kepala saja, bulat, untuk lencana profil'],
    // hub hotspots
    ['hub-meja-peta', 'MEJA PETA', 'building', 690, 235, 1, 'Hub', 'Diorama pulau di atas meja kayu, 3/4 depan'],
    ['hub-papan', 'PAPAN PENEMUAN', 'building', 244, 225, 1, 'Hub', 'Papan kayu bergantung lampu, depan'],
    ['hub-garasi', 'GARASI PENEMUAN', 'building', 772, 450, 1, 'Hub', 'Bangunan garasi dua pintu, depan 3/4'],
    ['ikon-wall-daun', 'IKON DAUN', 'icon', 76, 76, 1, 'Hub', 'Ikon bulat, depan'],
    ['ikon-wall-cakar', 'IKON CAKAR', 'icon', 76, 76, 1, 'Hub', 'Ikon bulat, depan'],
    ['ikon-wall-planet', 'IKON PLANET', 'icon', 76, 76, 1, 'Hub', 'Ikon bulat, depan'],
    ['ikon-wall-dino', 'IKON DINO', 'icon', 76, 76, 1, 'Hub', 'Ikon bulat, depan'],
    ['ikon-wall-gerigi', 'IKON RODA GIGI', 'icon', 76, 76, 1, 'Hub', 'Ikon bulat, depan'],
    // vehicles
    ['veh-buggy', 'BUGGY - 3/4 DEPAN', 'vehicle', 750, 450, 1, 'Hub, Kendaraan', 'Tiga perempat depan-kiri, di atas tanah rata, bayangan lembut'],
    ['veh-truk-air', 'TRUK AIR - 3/4 DEPAN', 'vehicle', 750, 450, 1, 'Kendaraan', 'Tiga perempat depan-kiri'],
    ['veh-excavator', 'EXCAVATOR - 3/4 DEPAN', 'vehicle', 750, 450, 1, 'Kendaraan', 'Tiga perempat depan-kiri, bucket di depan'],
    ['thumb-buggy', 'BUGGY', 'vehicle', 190, 120, 1, 'Kendaraan', 'Kartu pilihan, tiga perempat'],
    ['thumb-truk-air', 'TRUK AIR', 'vehicle', 190, 120, 1, 'Kendaraan', 'Kartu pilihan, tiga perempat'],
    ['thumb-excavator', 'EXCAVATOR', 'vehicle', 190, 120, 1, 'Kendaraan', 'Kartu pilihan, tiga perempat'],
    ['modul-pompa', 'MODUL POMPA', 'tool', 190, 130, 1, 'Kendaraan, Bengkel', 'Pompa air biru-oranye dengan selang kuning'],
    ['modul-semprot', 'MODUL SEMPROT', 'tool', 190, 130, 1, 'Kendaraan, Bengkel', 'Nozzle semprot dengan percikan air'],
    ['modul-ban-jalan', 'MODUL BAN JALAN', 'tool', 190, 130, 1, 'Kendaraan, Bengkel', 'Ban halus, miring'],
    ['modul-ban-berpola', 'MODUL BAN BERPOLA', 'tool', 190, 130, 1, 'Kendaraan, Bengkel', 'Ban bergerigi, miring'],
    ['modul-bucket-sempit', 'MODUL BUCKET SEMPIT', 'tool', 190, 130, 1, 'Kendaraan, Bengkel', 'Bucket sempit, samping'],
    ['modul-bucket-lebar', 'MODUL BUCKET LEBAR', 'tool', 190, 130, 1, 'Kendaraan, Bengkel', 'Bucket lebar, samping'],
    // map islands (transparent, ocean shows through)
    ['pulau-kota-roda', 'PULAU KOTA RODA', 'island', 640, 250, 1, 'Peta', 'Pulau kota, derek, jembatan; pandangan 3/4 dari atas'],
    ['pulau-taman-air', 'PULAU TAMAN AIR', 'island', 480, 215, 1, 'Peta', 'Pulau dengan kincir MATI (diam)'],
    ['pulau-taman-air-aktif', 'PULAU TAMAN AIR - KINCIR AKTIF', 'island', 480, 215, 1, 'Peta', 'Pulau yang sama, air mengalir dan pancuran menyala'],
    ['pulau-eco-park', 'PULAU ECO PARK', 'island', 560, 300, 1, 'Peta', 'Pulau daur ulang dan taman bermain'],
    ['pulau-kebun-ceria', 'PULAU KEBUN CERIA', 'island', 560, 330, 1, 'Peta', 'Pulau kebun, lumbung merah, traktor'],
    ['pulau-pelabuhan', 'PULAU PELABUHAN', 'island', 480, 300, 1, 'Peta', 'Pulau pelabuhan, kapal, mercusuar'],
    ['pulau-wonder-lab', 'PULAU WONDER LAB', 'island', 510, 310, 1, 'Peta', 'Pulau kubah penemuan dan lintasan'],
    ['thumb-taman-air', 'TAMAN AIR', 'scene', 150, 100, 0, 'Peta, Kendaraan', 'Kincir air kecil, bingkai persegi'],
    ['thumb-jalan-pertamaku', 'JALAN PERTAMAKU', 'scene', 165, 150, 0, 'Hub, Peta', 'Jembatan kayu di atas sungai kecil'],
    // bottom navigation
    ['nav-peta', 'IKON PETA', 'icon', 130, 110, 1, 'Navigasi', 'Peta lipat dengan pin oranye'],
    ['nav-kendaraan', 'IKON KENDARAAN', 'icon', 130, 110, 1, 'Navigasi', 'Buggy kecil, 3/4 depan'],
    ['nav-bengkel', 'IKON BENGKEL', 'icon', 130, 110, 1, 'Navigasi', 'Kunci inggris dan obeng bersilang'],
    ['nav-penemuan', 'IKON PENEMUAN', 'icon', 130, 110, 1, 'Navigasi', 'Kaca pembesar dengan bintang'],
    ['nav-bermain', 'IKON BERMAIN', 'icon', 130, 110, 1, 'Navigasi', 'Tanjakan kayu dan kerucut'],
    // mission W02-M01 (Kincir yang Menunggu)
    ['veh-truk-air-sisi', 'TRUK AIR - SAMPING', 'vehicle', 760, 495, 1, 'Misi W02-M01', 'Tiga perempat samping kiri, gulungan selang di belakang kabin, menghadap kiri'],
    ['prop-kincir-rumah', 'KINCIR AIR - BANGUNAN', 'building', 690, 500, 1, 'Misi W02-M01, Peta', 'Rumah kincir dan kolam TANPA roda (roda terpisah)'],
    ['prop-kincir-roda', 'RODA KINCIR', 'icon', 400, 400, 1, 'Misi W02-M01', 'Roda kayu, depan lurus, titik tengah di tengah gambar (berputar)'],
    ['prop-pipa', 'PIPA MASUK', 'prop', 150, 300, 1, 'Misi W02-M01', 'Pipa biru tegak dengan lubang masuk di sisi kiri'],
    ['prop-selang-ujung', 'UJUNG SELANG', 'prop', 120, 80, 1, 'Misi W02-M01', 'Kepala sambungan oranye, menghadap kanan'],
    ['prop-katup', 'KATUP', 'tool', 100, 100, 1, 'Misi W02-M01', 'Katup roda merah di pipa biru'],
    ['prop-pompa-truk', 'POMPA DI TRUK', 'tool', 180, 120, 1, 'Misi W02-M01', 'Pompa terpasang, depan'],
    ['tool-selang', 'SELANG', 'tool', 150, 100, 1, 'Misi W02-M01', 'Gulungan selang kuning'],
    ['tool-katup', 'KATUP', 'tool', 150, 100, 1, 'Misi W02-M01', 'Katup roda merah'],
    ['tool-pompa', 'POMPA', 'tool', 150, 100, 1, 'Misi W02-M01', 'Pompa air biru-oranye'],
    ['stiker-kincir', 'STIKER KINCIR', 'icon', 220, 220, 1, 'Misi W02-M01, Penemuan', 'Stiker bulat kincir air'],
    // mission W01-M01 (Jalan Pertamaku)
    ['prop-papan', 'PAPAN JEMBATAN', 'prop', 130, 56, 1, 'Misi W01-M01', 'Papan kayu, pandangan atas, melintang'],
    ['veh-buggy-misi', 'BUGGY - SAMPING', 'vehicle', 200, 130, 1, 'Misi W01-M01', 'Samping/atas-miring, menghadap atas layar'],
    ['prop-paket', 'PAKET', 'prop', 90, 80, 1, 'Misi W01-M01', 'Kotak hadiah'],
    ['prop-bendera', 'BENDERA TUJUAN', 'prop', 70, 110, 1, 'Misi W01-M01', 'Bendera di tiang'],
    ['prop-jalur-taman', 'JALUR TAMAN', 'scene', 420, 120, 1, 'Misi W01-M01', 'Jalan taman kecil yang muncul setelah selesai'],
    ['tool-papan', 'PAPAN', 'tool', 150, 100, 1, 'Misi W01-M01', 'Tumpukan papan kayu'],
    ['tool-jalan', 'JALAN', 'tool', 150, 100, 1, 'Misi W01-M01', 'Pedal gas / buggy kecil'],
    ['tool-paket', 'PAKET', 'tool', 150, 100, 1, 'Misi W01-M01', 'Kotak hadiah'],
    ['stiker-buggy', 'STIKER BUGGY', 'icon', 220, 220, 1, 'Misi W01-M01, Penemuan', 'Stiker bulat buggy'],
    // free-play yard
    ['yard-tanjakan', 'TANJAKAN', 'prop', 300, 140, 1, 'Bermain', 'Tanjakan kayu, samping'],
    ['yard-kerucut', 'KERUCUT', 'prop', 70, 90, 1, 'Bermain', 'Kerucut oranye, depan']
  ]

  var CATALOG = []
  var INDEX = {}
  var i
  for (i = 0; i < ROWS.length; i++) {
    var r = ROWS[i]
    var row = { key: r[0], label: r[1], kind: r[2], w: r[3], h: r[4], transparent: !!r[5], screen: r[6], pose: r[7] }
    CATALOG.push(row)
    INDEX[row.key] = row
  }

  var SIL = {
    person: '<circle cx="50" cy="22" r="13"/><path d="M28 94l4-42q18-12 36 0l4 42z"/><path d="M68 56l22-8-2-7-24 4z"/>',
    vehicle: '<path d="M8 58l8-22h44l16 14h16v18H8z"/><circle cx="30" cy="72" r="11"/><circle cx="72" cy="72" r="11"/>',
    building: '<path d="M10 90V46L50 14l40 32v44z"/><rect x="40" y="62" width="20" height="28" fill="#fff" fill-opacity=".45"/>',
    icon: '<circle cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="14" fill="#fff" fill-opacity=".45"/>',
    scene: '<path d="M0 80l24-34 18 22 20-38 38 50z"/><circle cx="78" cy="22" r="10"/>',
    prop: '<rect x="18" y="30" width="64" height="48" rx="8"/><rect x="18" y="30" width="64" height="12" rx="6" fill="#fff" fill-opacity=".4"/>',
    logo: '<rect x="6" y="26" width="88" height="34" rx="12"/><rect x="26" y="68" width="48" height="12" rx="6"/>',
    island: '<ellipse cx="50" cy="70" rx="46" ry="20"/><path d="M26 66l10-26 10 26zM50 66l12-34 12 34z"/>',
    tool: '<rect x="14" y="40" width="72" height="20" rx="10" transform="rotate(-30 50 50)"/><circle cx="26" cy="72" r="12"/>'
  }

  function src (key) { return SHIPPED[key] ? BASE + key + '.webp' : null }

  function labelSize (row) {
    var len = Math.max(6, row.label.length)
    var by = Math.min(row.h * 0.16, (row.w * 0.9) / (len * 0.62))
    return Math.max(10, Math.min(30, Math.round(by)))
  }

  function placeholder (key) {
    var row = INDEX[key] || { key: key, label: String(key).toUpperCase(), kind: 'prop', w: 160, h: 100, transparent: true }
    var d = document.createElement('div')
    d.className = 'ph ph-' + row.kind + (String(key).indexOf('bg-') === 0 ? ' ph-bg' : '')
    d.setAttribute('data-ph', key)
    d.style.setProperty('--fs', labelSize(row) + 'px')
    d.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
      (SIL[row.kind] || SIL.prop) + '</svg><span class="ph-l"></span>'
    d.lastChild.textContent = row.label
    d.lastChild.setAttribute('title', row.label)
    return d
  }

  function fill (el, key) {
    var u = src(key)
    el.setAttribute('data-art', key)
    el.innerHTML = ''
    if (u) {
      var im = new Image()
      im.alt = ''
      im.draggable = false
      im.onerror = function () { el.innerHTML = ''; el.setAttribute('data-art-state', 'ph'); el.appendChild(placeholder(key)) }
      im.src = u
      el.setAttribute('data-art-state', 'art')
      el.appendChild(im)
    } else {
      el.setAttribute('data-art-state', 'ph')
      el.appendChild(placeholder(key))
    }
    return el
  }

  function frame (key) {
    var d = document.createElement('div')
    d.className = 'art'
    return fill(d, key)
  }

  function hiddenUp (e) {
    for (var n = e; n && n.nodeType === 1; n = n.parentNode) {
      var cs = getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return true
    }
    return false
  }
  function hit (a, b) { return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom) }
  // keep label chips from sitting on each other: shift a colliding chip down (then right) inside its own frame
  function spread (root) {
    var st = document.getElementById('stage')
    if (!st) return
    var sr = st.getBoundingClientRect()
    var k = sr.width / 1672 || 1
    var ik = 1 / k
    var chips = [].slice.call(root.querySelectorAll('.ph-l'))
    var obs = [].slice.call(root.querySelectorAll('.pill,.bubble,.cbtn,.obtn,.islbl,.badge,.vcard,.tile,.tool,.fitpill,.hintbtn,.prof,.portrait,.mrow,.title,.step,.instr,.nv,.stk,.mbtn,.ob')).filter(function (o) { return !hiddenUp(o) })
    var placed = []
    var j
    for (j = 0; j < chips.length; j++) {
      var c = chips[j]
      c.style.top = ''
      c.style.left = ''
      if (hiddenUp(c)) continue
      var fr = c.parentNode.getBoundingClientRect()
      var bg = c.parentNode.classList.contains('ph-bg')
      var r0 = c.getBoundingClientRect()
      var baseT = parseFloat(getComputedStyle(c).top) || 0
      var baseL = parseFloat(getComputedStyle(c).left) || 0
      var stepY = r0.height / k + 2
      var okPos = null
      var dy, dx
      for (dy = 0; (baseT + dy) * k + r0.height <= fr.height - 2 * k && !okPos; dy += stepY) {
        for (dx = 0; ((baseL + dx) * k + r0.width <= fr.width - 2 * k || dx === 0) && !okPos; dx += Math.max(24, r0.width / k * 0.5)) {
          if (bg && dx > 0) break
          c.style.top = (baseT + dy) + 'px'
          if (!bg) c.style.left = (baseL + dx) + 'px'
          var rr = c.getBoundingClientRect()
          var clash = false
          var q
          for (q = 0; q < placed.length; q++) if (hit(rr, placed[q])) { clash = true; break }
          for (q = 0; q < obs.length && !clash; q++) if (!obs[q].contains(c) && hit(rr, obs[q].getBoundingClientRect())) clash = true
          if (!clash) okPos = rr
        }
      }
      if (!okPos) { c.style.top = ''; c.style.left = ''; okPos = c.getBoundingClientRect() }
      placed.push(okPos)
    }
    void ik
  }

  w.BlippiArt = { spread: spread, src: src, fill: fill, frame: frame, catalog: CATALOG, index: INDEX, shipped: SHIPPED, base: BASE }
})(window)
