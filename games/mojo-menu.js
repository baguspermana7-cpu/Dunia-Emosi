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
  // Peta Swoppiton (owner mockup "World Map"): the painted map with six numbered pins where its own
  // blue circles are drawn, and a region card per place. Two regions are open; the other four are
  // honest "Segera" cards that answer a tap instead of doing nothing.
  var PINS = { kota:[27.4,36.5], pelabuhan:[34.5,57.6], hutan:[65,49.5], gunung:[83,32.1], konstruksi:[81.7,87], pulau:[52.8,80.1] }
  function regionStats (r) {
    var s = API.save(), done = 0, stars = 0
    r.levels.forEach(function (id) { var rec = s.lv[id]; if (rec) { done++; stars += rec.stars || 0 } })
    return { done: done, stars: stars, total: r.levels.length }
  }
  function map () {
    var c = screen('scr-regions', 'Peta Swoppiton'), nextRegion = W.MojoLevels.region(API.next()).id
    c.classList.add('region-map')
    var art = node('div', 'wmap'), cards = node('div', 'wcards'), stage = node('div', 'wmap-box')
    var pic = node('img', 'wmap-img'); pic.src = A.lib('mojo-bg/map'); pic.alt = ''; stage.appendChild(pic)
    art.appendChild(stage); c.appendChild(art); c.appendChild(cards)
    var head = D.querySelector('#scr-regions .topbar'), total = 0, max = 0
    W.MojoLevels.REGIONS.forEach(function (r, i) {
      var ready = r.open && r.levels.length > 0, st = regionStats(r)
      total += st.stars; max += st.total * 3
      var go = function () { if (ready) { activeRegion = r.id; API.cue(); API.episodes(r.id) } else { API.cue(); API.toast(r.title + ': segera hadir — misi baru sedang dibuat!') } }
      // the pin on the painted map
      var pin = node('button', 'map-pin' + (ready ? '' : ' locked') + (r.id === nextRegion ? ' next' : ''))
      pin.type = 'button'; pin.setAttribute('data-pin', r.id); pin.setAttribute('aria-label', r.title + (ready ? '' : ' (segera)'))
      pin.style.left = PINS[r.id][0] + '%'; pin.style.top = PINS[r.id][1] + '%'
      pin.innerHTML = ready ? '<b class="fk">' + (i + 1) + '</b>' : '<i class="ico">' + A.icon('lock') + '</i>'
      bind(pin, go); stage.appendChild(pin)
      // the region card
      var b = ready ? node('button', 'region open') : node('div', 'region region-place locked')
      if (ready) b.type = 'button'; else { b.setAttribute('role', 'button'); b.tabIndex = 0; b.setAttribute('aria-disabled', 'true'); b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } }) }
      if (r.id === nextRegion) b.classList.add('next')
      b.setAttribute('data-region', r.id)
      var th = node('img', 'rthumb'); th.src = backdrop(A.regionScene(r)); th.alt = ''; th.loading = 'lazy'; b.appendChild(th)
      var num = node('i', 'rnum fk'); num.textContent = String(i + 1); b.appendChild(num)
      b.appendChild(node('strong', '', r.title))
      var sub = node('span', 'rsub')
      if (ready) sub.innerHTML = '<img src="' + A.src('obj/star') + '" alt="">' + st.stars + '/' + (st.total * 3) + '<em class="rcount"> · ' + st.done + '/' + st.total + ' misi</em>'
      else sub.innerHTML = '<i class="ico">' + A.icon('lock') + '</i>Segera hadir — misi baru sedang dibuat!'   // honest: no content yet, not a progress lock
      b.appendChild(sub)
      bind(b, go); cards.appendChild(b)
    })
    var pill = node('span', 'starpill fk'); pill.innerHTML = '<img src="' + A.src('obj/star') + '" alt=""><b>' + total + '/' + max + '</b>'
    head.appendChild(node('span', 'sp')); head.appendChild(pill)
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
    // the owner's film Mojo first (sheet 30), then the 44 forms from the workshop drawing book
    c.appendChild(node('p', 'menu-lead', A.heroCatalog.length + ' gaya Mojo versi film, lalu ' + A.catalog.length + ' wujud dari buku gambar bengkel. Ketuk untuk melihat.'))
    A.showcase.forEach(function (f, i) {
      if (i === 0 || i === A.heroCatalog.length) grid.appendChild(node('h2', 'form-gallery-head fk', i === 0 ? 'Mojo Versi Film' : 'Buku Gambar Bengkel'))
      var b = button('', function () { info(f) }, 'form-card' + (f.film ? ' film' : ''))
      b.innerHTML = '<img loading="lazy" src="' + f.src + '" alt=""><strong>' + f.name + '</strong>'
      grid.appendChild(b)
    }); c.appendChild(grid)
  }
  // Bengkel (owner mockup "Garage"): Mojo on the swap stand, a carousel of the 44 forms, the form's
  // one-line ability, its commands as icons, and a friendly badge for forms that have no mission yet.
  function formOf (id) { return id === 'base' ? 'normal' : id === 'lift' ? 'cherry' : id }
  function workshop () {
    var c = screen('scr-workshop', 'Bengkel Swoptops'), index = 0
    c.classList.add('ws')
    var show = node('div', 'ws-show'), stage = node('div', 'ws-stage'), stand = node('img', 'ws-stand'), car = node('div', 'ws-car')
    stand.src = A.lib('mojo-prop/swap-stand'); stand.alt = ''
    stage.appendChild(stand); stage.appendChild(car)
    var prev = button('', function () { pick(-1) }, 'ws-arrow l'), next = button('', function () { pick(1) }, 'ws-arrow r')
    prev.innerHTML = '<img src="' + A.lib('mojo-ui/chevron-left-sheet15') + '" alt="">'; prev.setAttribute('aria-label', 'Wujud sebelumnya'); prev.id = 'workshop-prev'
    next.innerHTML = '<img src="' + A.lib('mojo-ui/chevron-right-sheet15') + '" alt="">'; next.setAttribute('aria-label', 'Wujud berikutnya'); next.id = 'workshop-next'
    show.appendChild(prev); show.appendChild(stage); show.appendChild(next)
    var info = node('div', 'ws-info'), name = node('h2', 'fk ws-name'), ability = node('p', 'ws-ability'), verbs = node('div', 'ws-verbs'), count = node('span', 'ws-count')
    var badge = node('p', 'ws-badge'); badge.id = 'workshop-availability'; badge.setAttribute('role', 'status')
    info.appendChild(count); info.appendChild(name); info.appendChild(ability); info.appendChild(verbs); info.appendChild(badge)
    var row = node('div', 'row ws-row')
    var missions = button('Lihat Misi', map); missions.id = 'workshop-missions'
    var coll = button('Koleksi', API.collection || collection, 'btn b-soft fk'); coll.id = 'workshop-collection'
    row.appendChild(coll); row.appendChild(missions); info.appendChild(row)
    c.appendChild(show); c.appendChild(info)
    function draw () {
      var f = A.showcase[index], form = formOf(f.id), def = W.MojoLevels.FORMS[form], ok = playable(f.id)
      // film poses lead the carousel; the workshop drawings follow with their own (previous) art
      car.innerHTML = '<img class="owner-mojo' + (f.film ? ' owner-hero' : '') + ' owner-side" src="' + f.src + '" alt="">'
      car.classList.toggle('film', !!f.film)
      name.textContent = f.id === 'base' ? 'Mojo' : 'Mojo ' + f.name
      ability.textContent = f.ability.charAt(0).toUpperCase() + f.ability.slice(1) + '.'
      count.textContent = (f.film ? 'Versi Film · ' : '') + (index + 1) + ' / ' + A.showcase.length
      verbs.innerHTML = ''
      ;(def ? def.verbs : []).forEach(function (v) { var i = node('i', 'ws-verb'); i.style.background = A.CAT[v] || '#546E7A'; i.innerHTML = A.icon(v); i.setAttribute('title', v); verbs.appendChild(i) })
      badge.className = 'ws-badge ' + (ok ? 'ready' : 'soon')
      badge.textContent = ok ? 'Ada di misi penyelamatan!' : 'Segera di misi baru!'
      anim(car, [{ transform: 'translateY(-10px) scale(.96)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }], 220)
    }
    function pick (offset) { index = (index + offset + A.showcase.length) % A.showcase.length; draw(); API.cue() }
    draw()
  }
  function anim (e, frames, ms) { try { if (W.matchMedia('(prefers-reduced-motion: reduce)').matches) return null; return e.animate(frames, { duration: ms, easing: 'cubic-bezier(.23,1,.32,1)' }) } catch (x) { return null } }
  function learn () {
    W.MojoLearn.open({ screen: screen, say: API.say, cue: API.cue, save: API.save, award: API.award, home: API.home })
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
      bt.innerHTML = '<img src="' + (A.heroKey(f) ? A.lib(A.heroKey(f)) : meta.src) + '" alt=""><strong>' + meta.name + '</strong>' + (best || alt ? '<span class="form-badge ' + (best ? 'best' : 'alt') + '">' + (best ? 'Paling Tepat' : 'Bisa Juga') + '</span>' : '')
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
    // the owner's title painting (logo + film Mojo) cut ABOVE its painted buttons, so the only buttons
    // on screen are the real ones; the HTML logo stays for screen readers
    c.innerHTML = '<h1 class="logo fk sr-only"><span class="l1">Mojo</span><span class="l2">Swoptops</span></h1><p class="tag fk sr-only">Swop · Rencana · Selamatkan</p>'
    c.appendChild(button('Ayo Main!', API.home))
  }
  W.MojoMenu = { setup:setup, map:map, workshop:workshop, learn:learn, picker:picker, parentGate:parentGate, region:function () { return activeRegion }, background:backdrop, collection:collection }
})(window,document)
