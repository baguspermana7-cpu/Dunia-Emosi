/* Owner mockup navigation and art catalog. Mission execution remains in the shared ProgGrid shell. */
(function (W, D) {
  'use strict'
  var A, API, activeRegion = 'kota'
  function node (tag, cls, html) { var e = D.createElement(tag); e.className = cls || ''; if (html) e.innerHTML = html; return e }
  function bind (e, fn) { e.addEventListener('click', fn) }
  function button (text, fn, cls) { var b = node('button', cls || 'btn b-go fk'); b.type = 'button'; b.textContent = text; bind(b, fn); return b }
  function screen (id, title, back) {
    var s = D.getElementById(id)
    if (!s) { s = node('section', 'scr menu-scene'); s.id = id; D.body.appendChild(s) }
    s.innerHTML = ''
    var head = node('header', 'topbar'), arrow = button('Kembali', back || API.home, 'btn b-soft fk')
    head.appendChild(arrow); head.appendChild(node('h1', 'plate fk', title)); s.appendChild(head)
    var content = node('div', 'menu-content'); s.appendChild(content); API.show(id)
    return content
  }
  function backdrop (key) {
    var port = W.matchMedia('(orientation:portrait)').matches
    return A.lib(key + (key === 'mojo-bg/construction' ? '' : port ? '-port' : '-land'))
  }
  function map () {
    var c = screen('scr-regions', 'Peta Swoppiton'), positions = [[25,27],[20,70],[56,20],[76,42],[77,75],[46,84]]
    c.classList.add('region-map')
    W.MojoLevels.REGIONS.forEach(function (r, i) {
      var ready = r.open && r.levels.length > 0
      var b = ready ? button('', function () { activeRegion = r.id; API.episodes(r.id) },'region open') : node('div','region region-place')
      b.setAttribute('data-region', r.id)
      b.style.left = positions[i][0] + '%'; b.style.top = positions[i][1] + '%'
      if (ready) { var img = node('img'); img.src = backdrop(r.bg); img.alt = ''; b.appendChild(img) }
      b.appendChild(node('strong', '', r.title))
      if (ready) b.appendChild(node('span','',r.levels.length + ' misi'))
      c.appendChild(b)
    })
  }
  function info (item) {
    API.overlay('ov-card', '<div class="card collection-detail"><h2 class="fk">' + item.name + '</h2><img src="' + item.src + '" alt="' + item.name + '"><p>' +
      (playable(item.id) ? 'Temukan kemampuan Mojo dalam misi penyelamatan.' : 'Rancangan Swop-Top di bengkel. Misi khususnya sedang disiapkan.') + '</p><div class="row"><button class="btn b-go fk" id="catalog-close">Kembali</button></div></div>')
    bind(D.getElementById('catalog-close'), function () { API.close('ov-card') })
  }
  function playable (id) {
    var form = id === 'base' ? 'normal' : id === 'lift' ? 'cherry' : id
    return W.MojoLevels.LEVELS.some(function (lv) {
      return lv.mojo.form === form || lv.beats.some(function (b) { return (b.forms || []).indexOf(form) >= 0 })
    })
  }
  function collection () {
    var c = screen('scr-collection', 'Koleksi Swoptops'), grid = node('div', 'form-gallery')
    c.appendChild(node('p', 'menu-lead', '44 wujud Mojo dari buku gambar bengkel. Ketuk untuk melihat.'))
    A.catalog.forEach(function (f) {
      var b = button('', function () { info(f) }, 'form-card')
      b.innerHTML = '<img loading="lazy" src="' + f.src + '" alt=""><strong>' + f.name + '</strong>'
      grid.appendChild(b)
    }); c.appendChild(grid)
  }
  function workshop () {
    var c = screen('scr-workshop', 'Bengkel Swoptops'), stage = node('div', 'workshop-stage'), index = 0
    stage.innerHTML = A.mojo('normal','side'); c.appendChild(stage)
    var label = node('h2','fk','Mojo'); c.appendChild(label)
    var availability = node('p','menu-lead'); availability.id = 'workshop-availability'; availability.setAttribute('role','status'); c.appendChild(availability)
    function describe () { availability.textContent = playable(A.catalog[index].id) ? 'Ada di misi penyelamatan.' : 'Gambar bengkel. Misi khusus wujud ini belum tersedia.' }
    describe()
    var row = node('div','row')
    function pick (offset) { index = (index + offset + A.catalog.length) % A.catalog.length; stage.innerHTML = A.mojo(A.catalog[index].id, 'side'); label.textContent = A.catalog[index].name; describe(); API.cue() }
    row.appendChild(button('Sebelumnya', function () { pick(-1) }, 'btn b-soft fk'))
    var next = button('Ganti Wujud', function () { pick(1) }); next.id = 'workshop-next'; row.appendChild(next)
    var missions = button('Lihat Misi', map); missions.id = 'workshop-missions'; row.appendChild(missions)
    c.appendChild(row)
  }
  function learn () {
    var c = screen('scr-learn', 'Belajar Bersama Mojo'), data = W.MojoSoal.words, index = 0
    var card = node('div','learn-card'); c.appendChild(card)
    function draw () {
      var w = data[index], q = W.MojoSoal.word(w.tool, 'id')
      card.innerHTML = '<img src="' + A.src(q.pic) + '" alt=""><h2 class="fk">' + w.id + '</h2><p class="word-en">' + w.en + '</p><p>' + q.use + '</p>'
      card.appendChild(button('Dengarkan Indonesia', function () { API.say(w.id, 'id', true) }, 'btn b-soft fk'))
      card.appendChild(button('Dengarkan Inggris', function () { API.say(w.en, 'en', true) }, 'btn b-soft fk'))
    }
    draw()
    var row = node('div','row')
    row.appendChild(button('Sebelumnya',function () { index = (index + data.length - 1) % data.length; draw() },'btn b-soft fk'))
    row.appendChild(button('Berikutnya',function () { index = (index + 1) % data.length; draw() }))
    c.appendChild(row)
  }
  function profile () {
    var c = screen('scr-profile', 'Petualang Hebat!'), s = API.save(), ids = Object.keys(s.lv), stars = ids.reduce(function (n,k) { return n + s.lv[k].stars },0)
    c.innerHTML = '<img class="profile-bo" src="' + A.src('char/bo') + '" alt="Bo"><h2 class="fk">Tim Penyelamat Swoppiton</h2>'
    var stats = node('div','profile-stats'); c.appendChild(stats)
    ;[[ids.length,'Misi selesai'],[stars,'Bintang'],[Object.keys(s.seen).length,'Wujud dicoba'],[s.rewardBolts,'Lencana baut']].forEach(function (item,i) {
      var p = node('p'), count = node('b'), label = node('span')
      if (i === 3) { var img = node('img'); img.src = A.src('obj/bolt'); img.alt = ''; p.appendChild(img) }
      count.textContent = String(item[0]); label.textContent = item[1]; p.appendChild(count); p.appendChild(label); stats.appendChild(p)
    })
    c.appendChild(button('Lanjutkan Misi',function () { API.start(API.next()) }))
  }
  function picker (b, current, done) {
    if (!(b.best && b.best.length)) return done(null)
    var forms = [], chosen = null
    ;(b.best || []).concat(b.alt || [],b.forms || [],b.decoys || []).forEach(function (f) { if (forms.indexOf(f) < 0) forms.push(f) })
    var o = API.overlay('ov-card','<div class="card form-picker"><h2 class="fk">Pilih Wujud Mojo!</h2><p id="picker-note">' + b.title + '</p><div class="picker-forms" id="picker-forms"></div><div class="row"><button class="btn b-soft fk" id="picker-later">Rencanakan Dulu</button><button class="btn b-go fk" id="picker-go" disabled>Pilih Ini!</button></div></div>')
    var go = D.getElementById('picker-go')
    forms.forEach(function (f) {
      var meta = A.catalog.filter(function (x) { return x.id === (f === 'normal' ? 'base' : f === 'cherry' ? 'lift' : f) })[0]
      if (!meta) return
      var best = b.best.indexOf(f) >= 0, alt = (b.alt || []).indexOf(f) >= 0, allowed = b.forms.indexOf(f) >= 0
      var bt = button('',function () {
        chosen = allowed ? f : null; go.disabled = !allowed
        Array.prototype.forEach.call(o.querySelectorAll('.form-card'),function (x) { x.classList.toggle('selected',x === bt) })
        D.getElementById('picker-note').textContent = allowed ? meta.name + ': tambahkan Swop ke rencanamu.' : meta.name + ' punya tugas lain. Coba lihat alat yang dibutuhkan di misi ini.'
        API.cue()
      }, 'form-card')
      bt.setAttribute('data-form',f)
      bt.innerHTML = '<img src="' + meta.src + '" alt=""><strong>' + meta.name + '</strong>' + (best || alt ? '<span class="form-badge ' + (best ? 'best' : 'alt') + '">' + (best ? 'Paling Tepat' : 'Bisa Juga') + '</span>' : '')
      D.getElementById('picker-forms').appendChild(bt)
    })
    bind(go,function () { if (!chosen) return; API.close('ov-card'); done(chosen === current ? null : chosen) })
    bind(D.getElementById('picker-later'),function () { API.close('ov-card'); done(null) })
  }
  function parentGate (back) {
    var owner = W._activeAvatarSlug ? W._activeAvatarSlug() : null, timer = 0, HOLD_MS = 3000
    var o = API.overlay('ov-card','<div class="card parent-card"><h2 class="fk">Untuk Orang Tua</h2><p>Tahan tombol selama 3 detik untuk mengatur kemajuan Mojo profil anak ini.</p><div class="row"><button class="btn b-go fk" id="mojo-parent-hold" type="button">Tahan 3 detik</button><button class="btn b-soft fk" id="mojo-parent-close" type="button">Kembali</button></div></div>')
    var hold = D.getElementById('mojo-parent-hold')
    function stop () { clearTimeout(timer); timer = 0; hold.classList.remove('holding') }
    function confirm () {
      stop(); if (!hold.isConnected || !o.classList.contains('on')) return
      API.overlay('ov-card','<div class="card parent-card"><h2 class="fk">Hapus kemajuan Mojo?</h2><p>Misi, bintang, checkpoint, wujud yang dicoba, dan lencana Mojo profil anak ini akan dihapus. Pengaturan suara dan bahasa tetap disimpan.</p><div class="row"><button class="btn b-soft fk" id="mojo-reset-no" type="button">Batal</button><button class="btn b-go fk" id="mojo-reset-yes" type="button">Ya, hapus kemajuan</button></div></div>')
      bind(D.getElementById('mojo-reset-no'),back)
      bind(D.getElementById('mojo-reset-yes'),function () { API.reset(owner) })
    }
    function start () { if (timer) return; hold.classList.add('holding'); timer = W.setTimeout(confirm,HOLD_MS) }
    hold.addEventListener('pointerdown',function (e) { if (e.isPrimary && e.button === 0) start() })
    ;['pointerup','pointerleave','pointercancel','blur'].forEach(function (name) { hold.addEventListener(name,stop) })
    hold.addEventListener('keydown',function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start() } })
    hold.addEventListener('keyup',stop)
    bind(D.getElementById('mojo-parent-close'),function () { stop(); back() })
  }
  function setup (api) {
    API = api; A = W.MojoArt
    ;[['btn-levels',map],['btn-workshop',workshop],['btn-collection',collection],['btn-learn',learn],['btn-profile',profile]].forEach(function (x) { bind(D.getElementById(x[0]),x[1]) })
    var c = screen('scr-splash','',API.home); c.classList.add('splash-stage')
    c.innerHTML = '<h1 class="logo fk"><span class="l1">Mojo</span><span class="l2">Swoptops</span></h1><p class="tag fk">Swop · Rencana · Selamatkan</p><div class="splash-art"><img src="' + A.src('char/bo') + '" alt="Bo">' + A.mojo('normal','side') + '</div>'
    c.appendChild(button('Ayo Main!', API.home))
  }
  W.MojoMenu = { setup:setup, map:map, picker:picker, parentGate:parentGate, region:function () { return activeRegion }, background:backdrop, collection:collection }
})(window,document)
