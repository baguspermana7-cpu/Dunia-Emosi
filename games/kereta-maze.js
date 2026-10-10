/* =============================================================================
 * kereta-maze.js — window.KeretaMaze: the screens of "Kereta Pemberani: Petualangan Rel".
 *   top nav (BERANDA . PETA CERITA . KARAKTER, back, sound, settings) on every screen
 *   home (the hub of FOUR storylines) -> PETA CERITA (chapter list + story map of numbered mission stops)
 *   -> mission briefing -> board (kereta-play.js) -> MISI SELESAI (stars, trophy, route driven); KARAKTER; guide.
 * Storylines: brave (Linus & Samson, 30 + 4 practice), malivlak (20), hellbent "Lomba ke Kota" (10) and the
 * CLASSIC Lokomotif Pemberani game (G15), left exactly as it was and reached through the world map's level select.
 * Everything is open (like Mojo); stars are saved per avatar by the shared save engine (g15b / g15m / g15h).
 * URL (tests and shortcuts): ?story=brave|malivlak|hellbent  &level=N  &screen=home|chap|brief|game|coll
 * ==========================================================================*/
(function (W) {
  'use strict'
  var KA = W.KeretaArt, KG = W.KeretaGrid, KP = W.KeretaPlay, FX = W.KeretaFX, TS = W.TrainSprites, LV = W.KeretaLevels
  var ST = KA.STORIES, ORDER = ['brave', 'malivlak', 'hellbent', 'classic']
  var S = { story: 'brave', chap: 0, level: 1, screen: 'home' }
  function $ (id) { return document.getElementById(id) }
  function esc (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function icon (n, c) { return KA.icon(n, c) }
  function lsGet (k) { try { return localStorage.getItem(k) } catch (e) { return null } }
  function lsSet (k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  function slug () { try { return W._activeAvatarSlug ? W._activeAvatarSlug() : null } catch (e) { return null } }
  function scoped (suffix) { var a = slug(); return a ? 'dunia-avatar-' + a + '-' + suffix : suffix }
  function levels (story) { return LV[story] || [] }
  function face (id, expr, f) { var m = KA.TRAINS[id] || { char: id }; return KA.src(TS.pick(m.char, { facing: f == null ? 'sw' : f, view: 'front', expression: expr || 'neutral' })) }
  function sfxClick () { try { if (W.SFXEngine && W.SFXEngine.cue && !FX.sound.muted()) W.SFXEngine.cue('click') } catch (e) {} }
  function pad2 (n) { return (n < 10 ? '0' : '') + n }
  function starsHtml (n) { var h = ''; for (var i = 1; i <= 3; i++) h += icon('star', i > n ? 'off' : ''); return h }

  /* ── progress (the shared save engine's per-avatar record) ──────────────────────────────────────────── */
  function progRecord () {
    var a = slug(), key = a ? 'dunia-avatar-' + a + '-progress' : 'dunia-0-progress'
    try { var p = JSON.parse(lsGet(key) || '{}'); return p && typeof p === 'object' ? p : {} } catch (e) { return {} }
  }
  function prog (story) {
    var g = progRecord()[ST[story].gid] || {}, stars = g.stars || {}, done = Array.isArray(g.completed) ? g.completed : []
    return { done: done, stars: stars }
  }
  function counts (story) { var L = levels(story), main = L.filter(function (l) { return l.n <= (ST[story].mainCount || 999) }).length, p = prog(story), dm = p.done.filter(function (n) { return n <= (ST[story].mainCount || 999) }).length; return { main: main, extra: L.length - main, doneMain: dm, doneExtra: p.done.length - dm } }
  function totalStars (story) { var p = prog(story), n = 0; levels(story).forEach(function (l) { n += p.stars[l.n] || 0 }); return n }
  function nextLevel (story) {
    var p = prog(story), L = levels(story)
    for (var i = 0; i < L.length; i++) if (p.done.indexOf(L[i].n) < 0) return L[i].n
    return L.length ? L[0].n : 1
  }
  function chapOf (story, n) { var c = ST[story].chapters; for (var i = 0; i < c.length; i++) if (n >= c[i].from && n <= c[i].to) return i; return 0 }
  function chars () { try { return JSON.parse(lsGet(scoped('kereta-chars')) || '[]') } catch (e) { return [] } }
  function meet (id) { var c = chars(); if (c.indexOf(id) < 0) { c.push(id); lsSet(scoped('kereta-chars'), JSON.stringify(c)) } }
  function remember () { lsSet(scoped('kereta-last'), JSON.stringify({ story: S.story, level: S.level })) }
  function lvOf (n) { return levels(S.story).filter(function (l) { return l.n === n })[0] }
  function firstOpen (ci) { var c = ST[S.story].chapters[ci], p = prog(S.story); for (var l = c.from; l <= c.to; l++) if (p.done.indexOf(l) < 0) return l; return c.from }

  /* ── screens + nav ──────────────────────────────────────────────────────────────────────────────────── */
  function icons (root) { [].forEach.call((root || document).querySelectorAll('[data-ico]'), function (e) { e.innerHTML = icon(e.getAttribute('data-ico')) }) }
  var TAB = { home: 'home', chap: 'map', brief: 'map', game: 'map', res: 'map', coll: 'char' }
  function show (name) {
    ;[].forEach.call(document.querySelectorAll('.ks'), function (s) { if (s.id !== 'ks-' + name) { s.classList.remove('in'); s.classList.remove('on') } })
    var el = $('ks-' + name); el.classList.add('on')
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in') }) })
    $('app').setAttribute('data-screen', name); S.screen = name
    if (name !== 'game') KP.close()
    closeDlg()
    ;[].forEach.call(document.querySelectorAll('.knav-tab'), function (t) { if (t.getAttribute('data-t') === TAB[name]) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current') })
  }
  function goBack () {
    var s = S.screen
    if (s === 'home') { W.location.href = '../index.html'; return }
    if (s === 'chap' || s === 'coll') { drawHome(); show('home'); return }
    if (s === 'brief' || s === 'res' || s === 'game') { openChap(true); return }
  }

  /* 1 ── home ─────────────────────────────────────────────────────────────────────────────────────────── */
  function heroesHtml (id) {
    var st = ST[id]
    if (id === 'classic') return '<div class="kh-glow"></div><div class="kh-hero c"><img alt="" src="' + KA.base() + 'assets/train/linus-casey.webp"></div>'
    return '<div class="kh-glow"></div>' + (st.heroes[1] ? '<div class="kh-hero b"><img alt="" src="' + face(st.heroes[1], 'happy', 'sw') + '"></div>' : '') + '<div class="kh-hero a"><img alt="" src="' + face(st.heroes[0], 'happy', 'sw') + '"></div>'
  }
  function planHtml (st) {
    var hero = st.heroes && st.heroes[0] ? KA.TRAINS[st.heroes[0]].char : 'linus'
    var eng = KA.src(TS.pick(hero, { facing: 'e', view: 'top' }))
    var tiles = [['maju', 'Maju'], ['kanan', 'Kanan'], ['kiri', 'Kiri'], ['berhenti', 'Berhenti']].map(function (t, i) { return '<div class="tile"><b>' + (i + 1) + '</b>' + icon(t[0]) + '</div>' }).join('')
    return '<span class="lab">Rencanakan Langkahmu</span><div class="mini"><div class="rail"></div><img alt="" src="' + eng + '" style="left:8%;top:22%;height:42%"><img alt="" src="' + KA.src('gt/pine-tree') + '" style="left:34%;top:-4%;height:42%"><img alt="" src="' + KA.src('gt/pine-tree') + '" style="left:60%;top:52%;height:44%"><img alt="" src="' + KA.src('mojo-prop/building-station') + '" style="right:4%;top:6%;height:48%"></div><div class="tiles">' + tiles + '</div>'
  }
  function drawHome () {
    var st = ST[S.story], L = levels(S.story), p = prog(S.story), done = p.done.length, isC = S.story === 'classic'
    $('kh-bg').style.backgroundImage = 'url(' + KA.plate(st.plate, 1600) + ')'
    $('kh-heroes').innerHTML = heroesHtml(S.story)
    $('kh-t1').textContent = st.title; $('kh-t2').textContent = st.subtitle || st.sub
    $('kh-plan').innerHTML = planHtml(st); $('kh-plan').style.display = isC ? 'none' : ''
    var chs = st.chapters, cur = chapOf(S.story, nextLevel(S.story)), tray = ''
    if (isC) tray = '<span class="lab">Game Aslinya</span><div class="row"><button type="button" class="kcard" id="tr-classic"><span class="pic" style="background-image:url(' + KA.plate(st.cover, 640) + ')"></span><b>Lokomotif Pemberani</b><small>' + esc(st.blurb) + '</small></button></div>'
    else {
      var start = Math.min(cur, Math.max(0, chs.length - 3)), cards = ''
      for (var i = start; i < Math.min(chs.length, start + 3); i++) cards += '<button type="button" class="kcard" data-i="' + i + '"><span class="pic" style="background-image:url(' + KA.chapPic(chs[i]) + ')"></span><span class="num">' + (i + 1) + '</span><b>' + esc(chs[i].name) + '</b></button>'
      tray = '<span class="lab">Pilih Bab</span><div class="row">' + cards + '</div><div class="meta">' + done + ' dari ' + L.length + ' misi selesai • ' + totalStars(S.story) + ' bintang</div>'
    }
    $('kh-tray').innerHTML = tray
    ;[].forEach.call($('kh-tray').querySelectorAll('.kcard[data-i]'), function (b) { b.addEventListener('click', function () { sfxClick(); S.chap = +b.getAttribute('data-i'); S.level = firstOpen(S.chap); drawChap(); show('chap') }) })
    var tc = $('tr-classic'); if (tc) tc.addEventListener('click', openClassic)
    $('t-start').textContent = isC ? 'Main Game Aslinya' : (done ? 'Lanjutkan Petualangan' : 'Mulai Petualangan')
    var nav = ''
    ORDER.forEach(function (id) { var s = ST[id], n = levels(id).length, d = prog(id).done.length; nav += '<button type="button" class="kst" data-s="' + id + '" aria-pressed="' + (id === S.story) + '"><span class="pic" style="background-image:url(' + KA.plate(s.cover, 640) + ')"></span><span><b>' + esc(s.title) + '</b><small>' + (id === 'classic' ? 'Game aslinya' : counts(id).doneMain + '/' + counts(id).main + ' misi cerita') + '</small></span></button>' })
    $('kh-stories').innerHTML = nav
    ;[].forEach.call($('kh-stories').querySelectorAll('.kst'), function (b) { b.addEventListener('click', function () { sfxClick(); S.story = b.getAttribute('data-s'); drawHome() }) })
    $('b-chap').style.display = isC ? 'none' : ''
  }
  function openClassic () { try { sessionStorage.setItem('keretaClassic', '1') } catch (e) {} W.location.href = '../index.html' }
  function startStory () {
    if (S.story === 'classic') { openClassic(); return }
    S.level = nextLevel(S.story); S.chap = chapOf(S.story, S.level); openBrief(S.level)
  }

  /* 2 ── PETA CERITA ──────────────────────────────────────────────────────────────────────────────────── */
  function stopLayout (n) {
    // a serpentine: rows of up to 12 stops, each row running the other way, so no two stops ever touch
    var rows = Math.ceil(n / 12), per = Math.ceil(n / rows), out = []
    for (var i = 0; i < n; i++) {
      var row = Math.floor(i / per), j = i - row * per, cnt = Math.min(per, n - row * per), u = cnt > 1 ? j / (per - 1) : 0.5
      var x = 6 + 88 * (row % 2 ? 1 - u : u)
      var y = rows === 1 ? 50 + 16 * Math.sin(j * 0.95) : 16 + 68 * row / (rows - 1) + 4 * Math.sin(j * 1.3)
      out.push({ x: x, y: y })
    }
    return out
  }
  function drawChap () {
    var st = ST[S.story], chs = st.chapters, L = levels(S.story), n = L.length, p = prog(S.story), c = chs[S.chap]
    $('kc-bg').style.backgroundImage = 'url(' + KA.plate(c.plate, 1600) + ')'
    var done = p.done.length
    var list = ''
    chs.forEach(function (ch, i) {
      var cnt = 0; for (var k = ch.from; k <= ch.to; k++) if (p.done.indexOf(k) >= 0) cnt++
      list += '<button type="button" class="kp-ch" data-i="' + i + '" aria-pressed="' + (i === S.chap) + '"><span class="pic" style="background-image:url(' + KA.chapPic(ch) + ')"></span><span>' + esc(ch.name) + '<small>' + cnt + '/' + (ch.to - ch.from + 1) + ' misi</small></span>' + icon('chev') + '</button>'
    })
    $('kp-side').innerHTML = '<div class="kp-bab">Bab ' + (S.chap + 1) + '</div><h2 class="kp-name">' + esc(c.name) + '</h2><div class="kp-thumb" style="background-image:url(' + KA.chapPic(c) + ')"></div>' +
      '<div class="kp-prog">' + icon('star') + '<span>' + counts(S.story).main + ' misi cerita' + (counts(S.story).extra ? ' + ' + counts(S.story).extra + ' latihan' : '') + '</span><span class="bar"><i style="width:' + Math.round(done * 100 / n) + '%"></i></span><em>' + done + ' / ' + n + '</em></div><div class="kp-list">' + list + '</div>'
    ;[].forEach.call($('kp-side').querySelectorAll('.kp-ch'), function (b) { b.addEventListener('click', function () { sfxClick(); S.chap = +b.getAttribute('data-i'); S.level = firstOpen(S.chap); drawChap() }) })
    var pts = stopLayout(n)
    var d = pts.map(function (q, i) { if (!i) return 'M' + q.x + ' ' + q.y; var a = pts[i - 1], mx = (a.x + q.x) / 2; return 'C' + mx + ' ' + a.y + ' ' + mx + ' ' + q.y + ' ' + q.x + ' ' + q.y }).join(' ')
    var h = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + '" fill="none" stroke="#2b1a0e" vector-effect="non-scaling-stroke" style="stroke-width:12px;stroke-linecap:round"/><path d="' + d + '" fill="none" stroke="#c89b3c" vector-effect="non-scaling-stroke" style="stroke-width:4px;stroke-dasharray:2 9"/></svg>'
    chs.forEach(function (ch) { var q = pts[ch.from - 1] || pts[0]; h += '<span class="kp-area" style="left:' + Math.min(88, Math.max(10, q.x)) + '%;top:' + Math.max(0, q.y - 11) + '%">' + esc(ch.name) + '</span>' })
    L.forEach(function (l, i) {
      var isDone = p.done.indexOf(l.n) >= 0
      h += '<button type="button" class="kp-stop' + (isDone ? ' done' : '') + '" data-l="' + l.n + '" style="left:' + pts[i].x + '%;top:' + pts[i].y + '%" aria-pressed="' + (l.n === S.level) + '" aria-label="Misi ' + l.n + ': ' + esc(l.title) + '">' + (isDone ? icon('check') : pad2(l.n)) + '</button>'
    })
    $('kp-map').innerHTML = h
    ;[].forEach.call($('kp-map').querySelectorAll('.kp-stop'), function (b) { b.addEventListener('click', function () { sfxClick(); S.level = +b.getAttribute('data-l'); S.chap = chapOf(S.story, S.level); drawChap() }) })
    var lv = lvOf(S.level), sc = p.stars[S.level] || 0
    $('kc-card').innerHTML = '<div class="pic" style="background-image:url(' + KA.plate(lv.bg || c.plate, 640) + ')"></div><div><h3>Misi ' + pad2(lv.n) + ' · ' + esc(lv.title) + '</h3><p>' + esc(lv.pre.split('. ')[0]) + '.</p><div class="kc-stars" aria-label="' + sc + ' bintang">' + starsHtml(sc) + '</div></div><button type="button" class="kbtn kbtn-teal kbtn-lg" id="kc-go"><span>Lihat Misi</span><span class="kbtn-ic">' + icon('play') + '</span></button>'
    $('kc-go').addEventListener('click', function () { openBrief(S.level) })
  }
  function openChap (keep) {
    if (S.story === 'classic') { openClassic(); return }
    if (!keep) { S.level = nextLevel(S.story) }
    S.chap = chapOf(S.story, S.level); drawChap(); show('chap')
  }

  /* 3 ── briefing ─────────────────────────────────────────────────────────────────────────────────────── */
  function illSprites (lv, goals) {
    var out = [], seen = {}
    goals.forEach(function (g) { var v = g.sprite || KA.CARGO[g.kind] || KA.goalSprite(g); if (v && !seen[v]) { seen[v] = 1; out.push(v) } })
    return out.slice(0, 3)
  }
  function castOf (lv) { return ((W.KeretaCast && W.KeretaCast[lv.ch] && W.KeretaCast[lv.ch][lv.n]) || []) }
  function castName (k) { return (W.KeretaCast && W.KeretaCast.names && W.KeretaCast.names[k]) || '' }
  function castRow (lv) {
    var c = castOf(lv).slice(0, 4)
    return c.length ? '<div class="kb-cast">' + c.map(function (k) { return '<figure><img alt="" src="' + KA.src(k) + '"><figcaption>' + esc(castName(k)) + '</figcaption></figure>' }).join('') + '</div>' : ''
  }
  var SPK = { Henry: 'story-char/henry/point', Baron: 'story-char/baron/angkuh', Scarlet: 'story-char/scarlet/ramah', Katrina: 'story-char/katrina/khawatir' }
  function spk (say) { return say.sprite || SPK[say.who] || null }
  function openBrief (n) {
    var lv = lvOf(n); if (!lv) return
    S.level = n; S.chap = chapOf(S.story, n); remember()
    lv.trains.forEach(function (t) { meet(t.id) })
    var goals = KG.progress(KG.world(lv)), t0 = lv.trains[0]
    KA.setBg($('kb-bg'), lv, 1600)
    var heroes = lv.trains.map(function (t, i) { return '<div class="kh-hero ' + (i ? 'b' : 'a') + '"><img alt="" src="' + face(t.id, t.mood || 'happy', i ? 'se' : 'sw') + '"></div>' }).join('')
    $('kb-hero').innerHTML = '<div class="kh-glow"></div>' + heroes
    var steps = lv.steps || goals.slice(0, 4).map(function (g) { return { icon: g.icon, text: g.label, sprite: g.sprite } })
    var sh = steps.map(function (s, i) { return '<div class="kstep"><span class="n">' + (i + 1) + '</span>' + KA.goalIcon({ icon: s.icon, sprite: s.sprite }) + '<span>' + esc(s.text) + '</span></div>' }).join('')
    var spr = illSprites(lv, goals).map(function (k, i, a) { return '<img alt="" src="' + KA.src(k) + '" style="left:' + (18 + i * 30) + '%">' }).join('')
    var m = lv.mode === 'turns' ? 'Dua kereta bergantian: pilih kereta, lalu beri perintah satu per satu.' : lv.mode === 'both' ? 'Dua kereta berjalan bersamaan. Gunakan Tunggu supaya tidak bertabrakan.' : ''
    var goalText = lv.goalText || goals.map(function (g) { return g.label }).join(', ')
    $('kb-paper').innerHTML = '<span class="kb-ribbon">Briefing Misi</span><div class="mi">Misi ' + pad2(n) + '</div><h2>' + esc(lv.title) + '</h2><div class="kb-ill" style="background-image:url(' + KA.plate(lv.bg || 16, 1024) + ')">' + spr + '</div>' +
      castRow(lv) + '<p class="kb-goal">Tujuan:<b>' + esc(goalText) + '</b></p><p class="kb-story">' + esc(lv.pre) + '</p><div class="ksteps" style="grid-template-columns:repeat(' + Math.min(4, steps.length) + ',1fr)">' + sh + '</div>' + (m ? '<p class="kb-tip">' + esc(m) + '</p>' : '') + (lv.tip ? '<p class="kb-tip">' + esc(lv.tip) + '</p>' : '') +
      '<button type="button" class="kbtn kbtn-teal kbtn-lg" id="kb-go"><span>Susun Langkah</span><span class="kbtn-ic">' + icon('play') + '</span></button>'
    var c0 = castOf(lv).filter(function (k) { return !/^animal\//.test(k) && !/^train-char\//.test(k) })[0]
    var say = lv.say || { who: c0 ? castName(c0).replace(/ \(.*$/, '') : ((KA.TRAINS[t0.id] || {}).name || 'Linus'), text: lv.pre.split('. ')[0] + '.', sprite: c0 }
    var whoT = lv.trains.filter(function (t) { return (KA.TRAINS[t.id] || {}).name === say.who })[0], isTrain = !!whoT, who = whoT || t0
    $('kb-say').innerHTML = (isTrain ? '<img alt="" src="' + face(who.id, who.mood || 'happy', 'sw') + '">' : (spk(say) ? '<img class="cs" alt="" src="' + KA.src(spk(say)) + '">' : '<span class="av">' + KA.placeholder(say.who) + '</span>')) + '<div><b>' + esc(say.who) + ':</b>' + esc(say.text) + '</div>'
    $('kb-go').addEventListener('click', function () { FX.sound.unlock(); openGame(n) })
    show('brief')
  }

  /* 4 ── board ────────────────────────────────────────────────────────────────────────────────────────── */
  function openGame (n) {
    var lv = lvOf(n); if (!lv) return
    S.level = n; show('game')
    KP.open(lv, { story: S.story, onWin: function (r) { onWin(lv, r) }, onExit: function () { openChap(true) } })
  }

  /* 5 ── result ───────────────────────────────────────────────────────────────────────────────────────── */
  var rfx = null
  function routeHtml (r) {
    var rows = r.route || [], h = ''
    rows.forEach(function (row) {
      var st = row.cmds.map(function (c) { return '<span class="st" style="--cmd:' + KP.CMD[c.c].c + '" title="' + KP.CMD[c.c].t + '">' + icon(c.c) + (c.n > 1 ? '<b>x' + c.n + '</b>' : '') + '</span>' }).join('')
      h += (row.name ? '<div class="rowname">' + esc(row.name) + '</div>' : '') + '<div class="strip">' + st + '<span class="end">' + icon('deliver') + '</span></div>'
    })
    return '<div class="kr-route"><div class="lab">Rute yang dilalui</div>' + h + '</div>'
  }
  function onWin (lv, r) {
    var st = ST[S.story]
    try { if (typeof W.saveLevelProgress === 'function') W.saveLevelProgress(st.gid, lv.n, r.stars) } catch (e) {}
    KA.setBg($('kr-bg'), lv, 1600)
    var cheer = castOf(lv).filter(function (k) { return /^(story-char|malivlak-char)\//.test(k) }).slice(0, 2).map(function (k, i) { return '<div class="kr-cheer" style="left:' + (i ? 66 : 54) + '%;animation-delay:' + (i * .25) + 's"><img alt="" src="' + KA.src(k) + '"></div>' }).join('')
    $('kr-hero').innerHTML = cheer + '<div class="kh-glow"></div>' + lv.trains.map(function (t, i) { return '<div class="kh-hero ' + (i ? 'b' : 'a') + '"><img alt="" src="' + face(t.id, 'happy', i ? 'se' : 'sw') + '"></div>' }).join('')
    var rows = r.progress.map(function (g) { return '<div class="krow">' + KA.goalIcon(g) + '<span class="nm">' + esc(g.label) + '</span><b>' + g.have + '/' + g.need + '</b><span class="ok">' + icon('check') + '</span></div>' }).join('')
    var last = lv.n >= levels(S.story).length
    $('kr-wrap').innerHTML = '<img class="kr-trophy" alt="" src="' + KA.src('game/trophy-gold') + '"><div class="kr-stars" aria-label="' + r.stars + ' bintang">' + starsHtml(r.stars) + '</div><h2 class="kplaque kr-title">Misi Selesai</h2><div class="kr-card kpar"><p><b>' + esc(lv.title) + '</b></p><p>' + esc(lv.post) + '</p>' + rows + routeHtml(r) + '<p class="kb-draft">Langkah dipakai: ' + r.used + (r.opt ? ' (paling singkat: ' + r.opt + ')' : '') + '</p></div>' +
      '<div class="kr-btns"><button type="button" class="kbtn kbtn-teal kbtn-lg" id="kr-next"><span>' + (last ? 'Peta Cerita' : 'Misi Berikutnya') + '</span><span class="kbtn-ic">' + icon('play') + '</span></button><button type="button" class="kbtn kbtn-wood" id="kr-again"><span class="kbtn-ic">' + icon('reset') + '</span><span>Ulangi Misi</span></button></div>'
    $('kr-next').addEventListener('click', function () { if (last) openChap(true); else openBrief(lv.n + 1) })
    $('kr-again').addEventListener('click', function () { openGame(lv.n) })
    show('res')
    var cv = $('kr-fx')
    if (!rfx) rfx = FX.particles(cv)
    rfx.resize(W.innerWidth, W.innerHeight)
    FX.sound.fanfare()
    for (var k = 0; k < 4; k++) setTimeout(function () { rfx.burst('confetti', Math.random() * W.innerWidth, W.innerHeight * 0.15, 14) }, k * 220)
  }

  /* 6 ── KARAKTER: Kereta | Tokoh | Per Misi ─────────────────────────────────────────────────────────── */
  var COLL = ['linus', 'samson', 'malivlak', 'dragutin', 'kilat', 'lemas']
  var VIEWS = [['front', 'Depan', 180], ['side', 'Samping', 270], ['top', 'Atas', 90], ['rear', 'Belakang', 0]]
  var EXPR = { neutral: 'Biasa', happy: 'Senang', sad: 'Sedih', angry: 'Marah' }
  var CS = { tab: 'kereta', id: 'linus', view: 'front', expr: 'neutral', who: null, pose: null, story: 'malivlak' }
  function castGroups () {
    var g = {}, order = []
    ;['malivlak', 'brave'].forEach(function (st) { var T = W.KeretaCast[st] || {}; Object.keys(T).forEach(function (n) { T[n].forEach(function (k) { var gk = k.split('/').slice(0, 2).join('/'); if (!g[gk]) { g[gk] = { key: gk, poses: [], where: {} }; order.push(gk) } if (g[gk].poses.indexOf(k) < 0) g[gk].poses.push(k); (g[gk].where[st] = g[gk].where[st] || []).indexOf(+n) < 0 && g[gk].where[st].push(+n) }) }) })
    return order.map(function (k) { return g[k] })
  }
  function groupName (gp) { return castName(gp.poses[0]).replace(/ \(.*$/, '') }
  function drawColl () {
    $('kk-bg').style.backgroundImage = 'url(' + KA.plate(20, 1600) + ')'
    var tabs = [['kereta', 'Kereta'], ['tokoh', 'Tokoh'], ['misi', 'Per Misi']]
    var th = '<div class="kk-tabs">' + tabs.map(function (t) { return '<button type="button" class="kchip" data-tab="' + t[0] + '" aria-pressed="' + (CS.tab === t[0]) + '">' + t[1] + '</button>' }).join('') + '</div>'
    $('kk-tabsrow').innerHTML = th
    ;[].forEach.call($('kk-tabsrow').querySelectorAll('[data-tab]'), function (b) { b.addEventListener('click', function () { sfxClick(); CS.tab = b.getAttribute('data-tab'); drawColl() }) })
    if (CS.tab === 'tokoh') drawTokoh(); else if (CS.tab === 'misi') drawMisi(); else drawKereta()
  }
  function drawKereta () {
    var met = chars(), h = ''
    COLL.forEach(function (id) { var m = KA.TRAINS[id], ok = met.indexOf(id) >= 0; h += '<button type="button" class="kk-card' + (ok ? '' : ' lock') + '" data-id="' + id + '" aria-pressed="' + (id === CS.id) + '"><img alt="" src="' + face(id, 'happy', 'sw') + '"><b>' + (ok ? esc(m.name) : 'Belum bertemu') + '</b></button>' })
    $('kk-grid').innerHTML = h
    ;[].forEach.call($('kk-grid').querySelectorAll('.kk-card'), function (b) { b.addEventListener('click', function () { sfxClick(); CS.id = b.getAttribute('data-id'); CS.expr = 'neutral'; drawColl() }) })
    var m = KA.TRAINS[CS.id], ok = met.indexOf(CS.id) >= 0, ch = m.char
    var exprs = {}; TS.list(ch).forEach(function (k) { exprs[TS.info(k).expression] = 1 })
    var key = TS.pick(ch, { view: CS.view, facing: (VIEWS.filter(function (v) { return v[0] === CS.view })[0] || VIEWS[0])[2], expression: CS.expr })
    var vh = VIEWS.map(function (v) { return '<button type="button" class="kchip" data-v="' + v[0] + '" aria-pressed="' + (v[0] === CS.view) + '">' + v[1] + '</button>' }).join('')
    var eh = Object.keys(exprs).map(function (e) { return '<button type="button" class="kchip" data-e="' + e + '" aria-pressed="' + (e === CS.expr) + '">' + (EXPR[e] || e) + '</button>' }).join('')
    var miss = TS.missing(ch)
    $('kk-detail').innerHTML = '<h3>' + (ok ? esc(m.name) : 'Karakter terkunci') + '</h3><p style="margin:0">' + (ok ? esc(m.role) : 'Mainkan misi yang memuat karakter ini untuk bertemu dengannya.') + '</p><div class="kk-show"><img alt="' + esc(m.name) + '" src="' + KA.src(key) + '"' + (ok ? '' : ' style="filter:brightness(0) opacity(.45)"') + '></div><div class="kk-views">' + vh + '</div><div class="kk-expr">' + eh + '</div>' +
      (miss.length ? '<p class="kk-miss">' + miss.length + ' tampak atas dibuat dengan memutar atau membalik gambar asli.</p>' : '')
    ;[].forEach.call($('kk-detail').querySelectorAll('[data-v]'), function (b) { b.addEventListener('click', function () { CS.view = b.getAttribute('data-v'); drawColl() }) })
    ;[].forEach.call($('kk-detail').querySelectorAll('[data-e]'), function (b) { b.addEventListener('click', function () { CS.expr = b.getAttribute('data-e'); drawColl() }) })
  }
  function drawTokoh () {
    var G = castGroups(); if (!CS.who || !G.some(function (g) { return g.key === CS.who })) { CS.who = G[0].key; CS.pose = null }
    $('kk-grid').innerHTML = G.map(function (g) { return '<button type="button" class="kk-card" data-g="' + g.key + '" aria-pressed="' + (g.key === CS.who) + '"><img alt="" src="' + KA.src(g.poses[0]) + '"><b>' + esc(groupName(g)) + '</b></button>' }).join('')
    ;[].forEach.call($('kk-grid').querySelectorAll('.kk-card'), function (b) { b.addEventListener('click', function () { sfxClick(); CS.who = b.getAttribute('data-g'); CS.pose = null; drawColl() }) })
    var g = G.filter(function (x) { return x.key === CS.who })[0], pose = CS.pose && g.poses.indexOf(CS.pose) >= 0 ? CS.pose : g.poses[0]
    var chips = g.poses.map(function (k) { return '<button type="button" class="kchip" data-p="' + k + '" aria-pressed="' + (k === pose) + '">' + esc((castName(k).match(/\((.*)\)/) || [0, k.split('/')[2]])[1]) + '</button>' }).join('')
    var wh = ['malivlak', 'brave'].filter(function (st) { return g.where[st] }).map(function (st) { return (st === 'brave' ? 'Brave Locomotive' : 'Malivlak') + ': misi ' + g.where[st].sort(function (a, b) { return a - b }).join(', ') }).join(' \u2022 ')
    $('kk-detail').innerHTML = '<h3>' + esc(groupName(g)) + '</h3><p style="margin:0">' + esc(castName(pose)) + '</p><div class="kk-show"><img alt="' + esc(castName(pose)) + '" src="' + KA.src(pose) + '"></div><div class="kk-views">' + chips + '</div><p class="kk-miss">Muncul di ' + esc(wh) + '</p>'
    ;[].forEach.call($('kk-detail').querySelectorAll('[data-p]'), function (b) { b.addEventListener('click', function () { CS.pose = b.getAttribute('data-p'); drawColl() }) })
  }
  function drawMisi () {
    $('kk-grid').innerHTML = [['malivlak', 'Malivlak'], ['brave', 'Brave Locomotive']].map(function (t) { return '<button type="button" class="kk-card" data-st="' + t[0] + '" aria-pressed="' + (CS.story === t[0]) + '"><b>' + t[1] + '</b><small>' + Object.keys(W.KeretaCast[t[0]]).length + ' misi</small></button>' }).join('')
    ;[].forEach.call($('kk-grid').querySelectorAll('.kk-card'), function (b) { b.addEventListener('click', function () { sfxClick(); CS.story = b.getAttribute('data-st'); drawColl() }) })
    var T = W.KeretaCast[CS.story], L = (LV[CS.story] || [])
    $('kk-detail').innerHTML = '<h3>Tokoh per misi</h3><div class="kk-misi">' + Object.keys(T).map(Number).sort(function (a, b) { return a - b }).map(function (n) {
      var lv = L.filter(function (l) { return l.n === n })[0]
      return '<div class="kk-row"><b>' + pad2(n) + (lv ? ' ' + esc(lv.title) : '') + '</b><div class="figs">' + T[n].map(function (k) { return '<figure><img alt="" loading="lazy" src="' + KA.src(k) + '"><figcaption>' + esc(castName(k)) + '</figcaption></figure>' }).join('') + '</div></div>'
    }).join('') + '</div>'
  }

  /* dialogs ─────────────────────────────────────────────────────────────────────────────────────────── */
  function dlg (html) { var o = $('kov'); o.innerHTML = '<div class="kdlg kpar">' + html + '</div>'; o.hidden = false; o.addEventListener('click', function f (e) { if (e.target === o) { closeDlg(); o.removeEventListener('click', f) } }) }
  function closeDlg () { var o = $('kov'); o.hidden = true; o.innerHTML = '' }
  function guide () {
    var cmds = ['maju', 'kiri', 'kanan', 'mundur', 'putar', 'berhenti', 'tunggu', 'muat', 'naik', 'turun', 'sambung', 'lepas', 'tuas', 'wesel', 'lampu', 'tiup'].map(function (c) { return '<span style="--cmd:' + KP.CMD[c].c + '">' + icon(c) + KP.CMD[c].t + '</span>' }).join('')
    dlg('<h3>Cara Bermain</h3><ol><li>Baca misi dan lihat tujuannya.</li><li>Susun urutan langkah dengan menekan tombol di Kotak Aksi. Menekan perintah yang sama lagi akan mengulanginya. Sentuh sebuah langkah untuk mengubah pengulangannya atau menghapusnya.</li><li>Tekan Jalankan dan lihat kereta bekerja. Kalau terhenti, baca pesannya, ubah langkah, dan coba lagi. Tidak ada yang salah, kamu hanya belajar.</li><li>Kadang ada pertanyaan di kotak sinyal, loket, bunker, atau saat memuat. Jawab dengan benar untuk lanjut.</li></ol><div class="kcmdrow">' + cmds + '</div><p style="font-size:14px">Kereta hanya bisa berjalan di atas rel. Belok kiri dan kanan membuat kereta maju satu petak ke arah itu.</p><button type="button" class="kbtn kbtn-teal" id="d-ok">Mengerti</button>')
    $('d-ok').addEventListener('click', closeDlg)
  }
  function settings () {
    dlg('<h3>Pengaturan</h3><label><input type="checkbox" id="s-snd"' + (FX.sound.muted() ? '' : ' checked') + '> Suara menyala</label><label><input type="checkbox" id="s-lite"' + (FX.lite() ? ' checked' : '') + '> Efek ringan (gerak lebih sedikit)</label><button type="button" class="kbtn kbtn-teal" id="d-ok">Selesai</button>')
    $('s-snd').addEventListener('change', function (e) { FX.sound.setMute(!e.target.checked); sndIcons() })
    $('s-lite').addEventListener('change', function (e) { FX.setLite(e.target.checked) })
    $('d-ok').addEventListener('click', closeDlg)
  }
  function sndIcons () { $('n-snd').innerHTML = icon(FX.sound.muted() ? 'mute' : 'sound') }

  /* boot ────────────────────────────────────────────────────────────────────────────────────────────── */
  function init () {
    try { if (typeof W.lockGameAvatarSession === 'function') W.lockGameAvatarSession() } catch (e) {}
    icons(); KP.bind()
    $('kh-loco').innerHTML = icon('loco'); $('n-loco').innerHTML = icon('loco'); $('n-back').innerHTML = icon('back'); $('n-set').innerHTML = icon('gear')
    $('ic-start').innerHTML = icon('play'); $('ic-chap').innerHTML = icon('chev'); $('ic-guide').innerHTML = icon('book')
    sndIcons()
    $('b-start').addEventListener('click', function () { FX.sound.unlock(); startStory() })
    $('b-chap').addEventListener('click', function () { openChap() })
    $('b-guide').addEventListener('click', guide); $('n-set').addEventListener('click', settings)
    $('n-snd').addEventListener('click', function () { FX.sound.setMute(!FX.sound.muted()); FX.sound.unlock(); sndIcons() })
    $('n-back').addEventListener('click', goBack)
    $('n-home').addEventListener('click', function () { drawHome(); show('home') })
    $('n-map').addEventListener('click', function () { openChap(S.screen !== 'home') })
    $('n-char').addEventListener('click', function () { drawColl(); show('coll') })
    var q = {}; try { (W.location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) { var a = kv.split('='); if (a[0]) q[a[0]] = decodeURIComponent(a[1] || '') }) } catch (e) {}
    if (q.mute === '1') FX.sound.setMute(true)
    if (q.story && ST[q.story]) S.story = q.story
    else { try { var last = JSON.parse(lsGet(scoped('kereta-last')) || 'null'); if (last && ST[last.story]) { S.story = last.story; S.level = last.level } } catch (e) {} }
    drawHome()
    var n = parseInt(q.level, 10)
    if (q.screen === 'chap') { if (n) S.level = n; openChap(!!n) }
    else if (q.screen === 'coll') { drawColl(); show('coll') }
    else if (q.screen === 'brief' && n) openBrief(n)
    else if (q.screen === 'game' && n) openGame(n)
    else show('home')
    sndIcons()
  }
  W.KeretaMaze = { S: S, init: init, show: show, openBrief: openBrief, openGame: openGame, onWin: onWin, prog: prog, drawHome: drawHome, drawChap: drawChap, openChap: openChap }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init()
})(typeof window !== 'undefined' ? window : globalThis)
