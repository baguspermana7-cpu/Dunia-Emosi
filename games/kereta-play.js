/* =============================================================================
 * kereta-play.js — window.KeretaPlay: the board screen of "Kereta Pemberani: Petualangan Rel".
 * Owns the program editor (URUTAN LANGKAH slots with repeat counts, the command palette, train tabs for
 * 'turns' levels, two lanes for 'both' levels), the run loop (engine step -> board animation -> next step),
 * the goal HUD, hints, and the win calculation. The engine (kereta-grid.js) decides everything that happens;
 * this file only feeds it the plan and shows what comes back.
 *
 *   KeretaPlay.open(lv, {onWin(result), onExit()})    KeretaPlay.close()    KeretaPlay.debug()
 * A wrong answer or a blocked move is never a failure state: a kind message, then the child edits and runs again.
 * ==========================================================================*/
(function (W) {
  'use strict'
  var KG = W.KeretaGrid, KA = W.KeretaArt, FX = W.KeretaFX, KB = W.KeretaBoard, KQ = W.KeretaQuiz, TS = W.TrainSprites
  var CMD = {
    maju: { c: '#2f6fb8', t: 'Maju', d: 'Maju satu petak ke depan' }, kiri: { c: '#1d8a8a', t: 'Belok Kiri', d: 'Belok kiri lalu maju satu petak' }, kanan: { c: '#b4571d', t: 'Belok Kanan', d: 'Belok kanan lalu maju satu petak' },
    mundur: { c: '#3d6aa0', t: 'Mundur', d: 'Mundur satu petak (tanpa gerbong)' }, sambung: { c: '#6a3fa0', t: 'Sambung', d: 'Sambung gerbong tepat di depan kereta' }, lampu: { c: '#c79a1e', t: 'Lampu', d: 'Nyalakan atau matikan lampu kereta' },
    naik: { c: '#2f8a5a', t: 'Naik', d: 'Naikkan penumpang di samping kereta' }, wesel: { c: '#a0561f', t: 'Wesel', d: 'Atur wesel atau tuas di samping kereta' }, berhenti: { c: '#c0392b', t: 'Berhenti', d: 'Berhenti dan diam' },
    putar: { c: '#8a2f4a', t: 'Putar', d: 'Putar balik di tempat' }, muat: { c: '#8a3b1f', t: 'Muat', d: 'Muat semua barang di samping kereta' }, turun: { c: '#6a3fa0', t: 'Turun', d: 'Turunkan muatan di stasiun samping kereta' },
    tuas: { c: '#a07a10', t: 'Tuas', d: 'Tarik tuas di samping kereta' }, tiup: { c: '#c0831e', t: 'Tiup', d: 'Bunyikan peluit' }, tunggu: { c: '#5a6068', t: 'Tunggu', d: 'Diam satu langkah' }, lepas: { c: '#4a5a78', t: 'Lepas', d: 'Lepas gerbong paling belakang' }
  }
  var REPEAT = ['maju', 'kiri', 'kanan', 'tunggu', 'mundur', 'berhenti']
  var SPEEDS = [1, 2, 0.5]
  var G = {}   // the live game: lv, world0, world, view, P, S, token, running, opt ...
  function $ (id) { return document.getElementById(id) }
  function icon (n, c) { return KA.icon(n, c) }
  function trainMeta (id) { return KA.TRAINS[id] || { char: id, name: id } }
  function face (id, expr) { return KA.src(TS.pick(trainMeta(id).char, { facing: 'sw', view: 'front', expression: expr || 'neutral' })) }
  function esc (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function sfx (k) { try { if (W.SFXEngine && W.SFXEngine.cue && !FX.sound.muted()) W.SFXEngine.cue(k) } catch (e) {} }

  function packLen (plan) { var out = [], cnt = 0, last = null; plan.forEach(function (a) { var k = JSON.stringify(a); if (k === last && cnt < 9) { cnt++; return } out.push(1); last = k; cnt = 1 }); return out.length }

  /* ── program model ──────────────────────────────────────────────────────────────────────────────────── */
  function newProgram () {
    var P = { items: [], lanes: {} }
    G.world0.trains.forEach(function (t) { P.lanes[t.id] = [] })
    return P
  }
  function mode () { return G.lv.mode || 'solo' }
  function lanesList () { return mode() === 'both' ? G.world0.trains.map(function (t) { return t.id }) : ['main'] }
  function laneArr (id) { return id === 'main' ? G.P.items : G.P.lanes[id] }
  function used () { return mode() === 'both' ? Math.max.apply(null, G.world0.trains.map(function (t) { return G.P.lanes[t.id].length })) : G.P.items.length }
  function verbsOf () { var v = (G.lv.verbs || []).slice(); if (mode() === 'both' && v.indexOf('tunggu') < 0) v.push('tunggu'); return v }

  function compile () {
    var out = [], m = mode(), ids = G.world0.trains.map(function (t) { return t.id }), i, k
    if (m === 'both') {
      var ex = ids.map(function (id) { var a = []; G.P.lanes[id].forEach(function (it, idx) { for (var n = 0; n < it.n; n++) a.push({ c: it.c, idx: idx }) }); return a })
      var len = Math.max.apply(null, ex.map(function (a) { return a.length }))
      for (i = 0; i < len; i++) { var act = {}, slots = {}; ids.forEach(function (id, j) { var s = ex[j][i]; act[id] = s ? s.c : 'tunggu'; slots[id] = s ? s.idx : -1 }); out.push({ action: act, slots: slots }) }
      return out
    }
    G.P.items.forEach(function (it, idx) { for (k = 0; k < it.n; k++) { var a = {}; a[m === 'turns' ? it.t : ids[0]] = it.c; out.push({ action: a, slots: { main: idx } }) } })
    return out
  }

  /* ── drawing the editor ─────────────────────────────────────────────────────────────────────────────── */
  function slotHtml (it, idx, lane, bad) {
    var cm = CMD[it.c], tb = it.t && mode() === 'turns' ? '<img class="tb" alt="" src="' + face(it.t) + '" style="position:absolute;left:-5px;top:-5px;width:22px;height:22px;object-fit:contain;background:#fff3d2;border-radius:50%;box-shadow:0 0 0 1.5px var(--brass)">' : ''
    return '<button type="button" class="kslot f' + (G.sel && G.sel.lane === lane && G.sel.i === idx ? ' sel' : '') + '" data-lane="' + lane + '" data-i="' + idx + '" style="--cmd:' + cm.c + '" aria-label="Langkah ' + (idx + 1) + ': ' + cm.t + (it.n > 1 ? ' x' + it.n : '') + '">' + tb +
      '<span class="n">' + (idx + 1) + '</span>' + icon(it.c) + '<span class="lb">' + cm.t + '</span>' + (it.n > 1 ? '<b class="x">x' + it.n + '</b>' : '') + '</button>'
  }
  function drawLanes () {
    var host = $('kg-lanes'), h = ''
    lanesList().forEach(function (id) {
      var arr = laneArr(id), cells = ''
      for (var i = 0; i < G.lv.slots; i++) cells += arr[i] ? slotHtml(arr[i], i, id) : '<span class="kslot" aria-hidden="true"><span class="n">' + (i + 1) + '</span></span>'
      h += '<div class="klane' + (G.S === id ? ' act' : '') + '" data-lane="' + id + '">' + (id === 'main' ? '' : '<img class="who" alt="' + esc(trainMeta(id).name) + '" src="' + face(id) + '">') + cells + '</div>'
    })
    host.innerHTML = h
    if (G.justAdded) { var ja = host.querySelector('.kslot.f[data-lane="' + G.justAdded.lane + '"][data-i="' + G.justAdded.i + '"]'); if (ja) ja.classList.add('pop'); G.justAdded = null }
    $('kg-count').textContent = used() + '/' + G.lv.slots
    ;[].forEach.call(host.querySelectorAll('.kslot.f'), function (b) { b.addEventListener('click', function () { selectSlot(b.getAttribute('data-lane'), +b.getAttribute('data-i')) }) })
    ;[].forEach.call(host.querySelectorAll('.klane'), function (l) { l.addEventListener('click', function (e) { if (e.target === l && mode() === 'both') { G.S = l.getAttribute('data-lane'); drawLanes() } }) })
    drawSlotbar()
  }
  function drawTabs () {
    var h = ''
    if (mode() === 'turns') G.world0.trains.forEach(function (t) { h += '<button type="button" class="ktab" data-t="' + t.id + '" aria-pressed="' + (G.S === t.id) + '"><img alt="" src="' + face(t.id) + '">' + esc(trainMeta(t.id).name) + '</button>' })
    if (mode() === 'both') G.world0.trains.forEach(function (t) { h += '<button type="button" class="ktab" data-t="' + t.id + '" aria-pressed="' + (G.S === t.id) + '"><img alt="" src="' + face(t.id) + '">' + esc(trainMeta(t.id).name) + '</button>' })
    $('kg-tabs').innerHTML = h
    ;[].forEach.call($('kg-tabs').querySelectorAll('.ktab'), function (b) { b.addEventListener('click', function () { G.S = b.getAttribute('data-t'); G.sel = null; drawTabs(); drawLanes() }) })
  }
  function drawPalette () {
    var cmds = ['maju', 'kiri', 'kanan'].concat(verbsOf()), h = ''
    cmds.forEach(function (c) { h += '<button type="button" class="kcmd" data-c="' + c + '" style="--cmd:' + CMD[c].c + '" aria-label="' + CMD[c].t + ': ' + CMD[c].d + '" title="' + CMD[c].d + '">' + icon(c) + '<span>' + CMD[c].t + '</span></button>' })
    $('kg-pal').innerHTML = h
    ;[].forEach.call($('kg-pal').querySelectorAll('.kcmd'), function (b) { b.addEventListener('click', function () { if (G.noClick && Date.now() < G.noClick) return; addCmd(b.getAttribute('data-c')) }); bindDrag(b) })
  }
  function drawSlotbar () {
    var bar = $('kg-slotbar')
    if (!G.sel) { bar.hidden = true; return }
    var arr = laneArr(G.sel.lane), it = arr[G.sel.i]
    if (!it) { G.sel = null; bar.hidden = true; return }
    var rep = REPEAT.indexOf(it.c) >= 0
    bar.hidden = false
    bar.innerHTML = '<span>Langkah ' + (G.sel.i + 1) + ': ' + CMD[it.c].t + '</span>' + (rep ? '<button type="button" data-a="minus" aria-label="Kurangi pengulangan">-</button><b>x' + it.n + '</b><button type="button" data-a="plus" aria-label="Tambah pengulangan">+</button>' : '') +
      '<button type="button" data-a="del">Hapus</button><button type="button" data-a="ok">Selesai</button>'
    ;[].forEach.call(bar.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-a'); resetBoard(true)
        if (a === 'plus') it.n = Math.min(9, it.n + 1); else if (a === 'minus') it.n = Math.max(1, it.n - 1)
        else if (a === 'del') { arr.splice(G.sel.i, 1); G.sel = null } else G.sel = null
        drawLanes()
      })
    })
  }
  function selectSlot (lane, i) { if (G.running) return; G.sel = G.sel && G.sel.lane === lane && G.sel.i === i ? null : { lane: lane, i: i }; drawLanes() }
  function addCmd (c, lane0, idx0) {
    if (G.running) return
    var lane = lane0 || (mode() === 'both' ? G.S : 'main'), arr = laneArr(lane), at = idx0 == null ? arr.length : idx0
    var tail = arr[at - 1], rep = REPEAT.indexOf(c) >= 0
    resetBoard(true); G.hintLvl = 0; if (G.view) G.view.clearGhost()
    if (tail && rep && tail.c === c && tail.n < 9 && (mode() !== 'turns' || tail.t === G.S)) { tail.n++; G.sel = null; hintOff(); sfx('click'); say(null); G.justAdded = { lane: lane, i: at - 1 }; drawLanes(); return } // same command again: repeat count, saves a slot
    if (arr.length >= G.lv.slots) { say('Urutan sudah penuh. Hapus satu langkah dulu.', true); return }
    var it = { c: c, n: 1 }; if (mode() === 'turns') it.t = G.S
    arr.splice(at, 0, it); G.sel = null; hintOff(); sfx('click'); say(null)
    G.justAdded = { lane: lane, i: at }
    drawLanes()
    var sc = $('kg-lanes').querySelector('.klane[data-lane="' + lane + '"]'); if (sc) { var f = sc.querySelectorAll('.kslot.f'); if (f[at]) f[at].scrollIntoView({ block: 'nearest', inline: 'nearest' }) }
  }
  /* drag a command tile into the sequence (a tap still appends); the lane under the finger lights up, the tile lands at the slot nearest to it */
  function bindDrag (btn) {
    var st = null
    btn.addEventListener('pointerdown', function (e) {
      if (G.running || (e.button != null && e.button > 0)) return
      st = { x: e.clientX, y: e.clientY, on: false, id: e.pointerId, ghost: null, lane: null, idx: null }
    })
    function lane (x, y) { var els = document.elementsFromPoint(x, y), l = null; els.forEach(function (n) { if (!l && n.classList && n.classList.contains('klane')) l = n }); return l }
    window.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return
      if (!st.on) { if (Math.abs(e.clientX - st.x) + Math.abs(e.clientY - st.y) < 10) return; st.on = true; var g = btn.cloneNode(true); g.className = 'kcmd kcmd-ghost'; g.style.width = btn.offsetWidth + 'px'; g.style.height = btn.offsetHeight + 'px'; document.body.appendChild(g); st.ghost = g }
      st.ghost.style.left = (e.clientX - st.ghost.offsetWidth / 2) + 'px'; st.ghost.style.top = (e.clientY - st.ghost.offsetHeight / 2) + 'px'
      ;[].forEach.call(document.querySelectorAll('.klane.dropt'), function (n) { n.classList.remove('dropt') })
      var l = lane(e.clientX, e.clientY); st.lane = l ? l.getAttribute('data-lane') : null; st.idx = null
      if (l) { l.classList.add('dropt'); var arr = laneArr(st.lane), fs = [].slice.call(l.querySelectorAll('.kslot.f')), k = arr.length; for (var i = 0; i < fs.length; i++) { var r = fs[i].getBoundingClientRect(); if (e.clientX < r.left + r.width / 2) { k = i; break } } st.idx = k }
    })
    function end (e) {
      if (!st || e.pointerId !== st.id) return
      var was = st; st = null
      if (!was.on) return
      if (was.ghost && was.ghost.parentNode) was.ghost.parentNode.removeChild(was.ghost)
      ;[].forEach.call(document.querySelectorAll('.klane.dropt'), function (n) { n.classList.remove('dropt') })
      G.noClick = Date.now() + 80
      if (e.type === 'pointerup' && was.lane != null && was.idx != null) { if (mode() === 'both' && was.lane !== 'main') G.S = was.lane; addCmd(btn.getAttribute('data-c'), was.lane, was.idx) }
    }
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end)
  }

  /* ── HUD, bubble ────────────────────────────────────────────────────────────────────────────────────── */
  function drawHud () {
    var pr = KG.progress(G.world), h = ''
    pr.forEach(function (g) { h += '<div class="kg-goal' + (g.done ? ' done' : '') + '" title="' + esc(g.label) + '">' + KA.goalIcon(g) + '<span><b>' + g.have + '/' + g.need + '</b><small>' + esc(g.label) + '</small></span></div>' })
    $('kg-hud').innerHTML = h
    var cks = $('kg-card') && $('kg-card').querySelectorAll('.chk')
    if (cks) pr.forEach(function (g, i) { if (cks[i]) cks[i].classList.toggle('done', g.done) })
  }
  function drawCard () {
    var lv = G.lv, pr = KG.progress(G.world0)
    $('kg-card').innerHTML = '<div class="mi">Misi ' + (lv.n < 10 ? '0' : '') + lv.n + '</div><h4>' + esc(lv.title) + '</h4><div class="ill" style="background-image:url(' + KA.plate(lv.bg || 16, 640) + ')"></div>' +
      pr.map(function (g) { return '<div class="chk"><span class="c">' + icon('check') + '</span><span>' + esc(g.label) + '</span></div>' }).join('') + '<button type="button" class="help" id="kg-help" aria-label="Bantuan misi">?</button>'
    $('kg-help').addEventListener('click', function () { var sy = lv.say; say((sy ? sy.who + ': ' + sy.text : lv.pre) + (lv.tip ? ' ' + lv.tip : ''), false) })
  }
  function say (msg, bad) {
    var b = $('kg-bubble')
    if (!msg) { b.hidden = true; return }
    b.textContent = msg; b.hidden = false; b.className = 'kg-bubble' + (bad ? ' bad' : '')
  }
  function hintOff () { [].forEach.call($('kg-pal').querySelectorAll('.kcmd.hint'), function (b) { b.classList.remove('hint') }) }
  function setRunning (on) {
    G.running = on
    $('kg-run').hidden = on; $('kg-live').hidden = !on
    if (!on) { G.paused = false; $('kg-pause').lastChild.textContent = 'Jeda'; $('kg-aksi').hidden = true }
    ;['kg-undo', 'kg-clear', 'kg-hint'].forEach(function (id) { $(id).disabled = on })
    ;[].forEach.call($('kg-pal').querySelectorAll('.kcmd'), function (b) { b.disabled = on })
  }

  /* ── run ────────────────────────────────────────────────────────────────────────────────────────────── */
  function resetBoard (keepMsg) {
    G.token++
    setRunning(false)
    G.world = G.world0
    if (G.view) { G.view.sync(G.world); G.view.clearGhost() }
    drawHud(); marks(null, null)
    if (!keepMsg) say(null)
  }
  function marks (slots, cls) {
    ;[].forEach.call($('kg-lanes').querySelectorAll('.kslot'), function (b) { b.classList.remove('run', 'bad') })
    if (!slots) return
    Object.keys(slots).forEach(function (lane) {
      var b = $('kg-lanes').querySelector('.kslot[data-lane="' + lane + '"][data-i="' + slots[lane] + '"]')
      if (b) { b.classList.add(cls); b.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }
    })
  }
  function run () {
    if (G.running) return
    var acts = compile()
    if (!acts.length) { say('Tambahkan perintah dulu, lalu tekan Jalankan.', false); FX.sound.boop(); return }
    FX.sound.unlock(); resetBoard(); G.hintLvl = 0; G.sel = null; drawSlotbar(); hintOff()
    var tok = G.token; setRunning(true)
    var w = G.world0
    function done (completed) {
      if (tok !== G.token) return
      setRunning(false); marks(null, null)
      if (!completed) { say('Kereta sudah berhenti, tapi misinya belum selesai. Lihat tujuan di atas lalu ubah langkahmu.', false) }
    }
    function next (i, wd, mg) {
      if (tok !== G.token) return
      if (G.paused) { setTimeout(function () { next(i, wd, mg) }, 120); return }
      if (i >= acts.length) { done(false); return }
      $('kg-aksi').hidden = false; $('kg-aksi').textContent = 'Aksi ' + (i + 1) + '/' + acts.length
      marks(acts[i].slots, 'run')
      var r = KG.step(wd, acts[i].action, mg ? { mg: true } : {})
      if (r.status === 'question') {
        KQ.ask(r.needQ.q, $('ks-game'), function () { next(i, wd, true) })
        return
      }
      if (r.status === 'blocked') {
        marks(acts[i].slots, 'bad'); G.view.bonk(r.train || G.world0.trains[0].id, r.reason)
        var nh = null; try { nh = KG.hint(wd, [], { cap: 200000 }) } catch (e0) {}
        var nm = nh ? Object.keys(nh.action).map(function (k) { return (mode() !== 'solo' ? trainMeta(k).name + ': ' : '') + CMD[nh.action[k]].t }).join(', ') : null
        say((KG.MSG[r.reason] || KG.MSG.unknown) + (nm ? ' Coba ' + nm + ' di sini.' : ''), true); setRunning(false)
        return
      }
      var mvA = function (a) { return a && Object.keys(a.action).some(function (k) { return ['maju', 'kiri', 'kanan', 'mundur', 'sambung'].indexOf(a.action[k]) >= 0 }) }
      G.view.apply(r.events, wd, r.world, function () {
        if (tok !== G.token) return
        G.world = r.world; drawHud()
        if (r.completed) { setRunning(false); marks(null, null); win(); return }
        next(i + 1, r.world, false)
      }, { easeIn: !mvA(acts[i - 1]), easeOut: !mvA(acts[i + 1]) })
    }
    next(0, w, false)
  }
  function win () {
    var u = used(), opt = G.opt || u, stars = u <= opt + 1 ? 3 : u <= opt + 4 ? 2 : 1
    G.view.celebrate()
    var tok = G.token, route = routeOf()
    setTimeout(function () { if (tok === G.token && G.cb && G.cb.onWin) G.cb.onWin({ lv: G.lv, stars: stars, used: u, opt: opt, progress: KG.progress(G.world), route: route }) }, FX.reduced() ? 500 : 1300)
  }

  function routeOf () {
    function rl (arr) { return arr.map(function (it) { return { c: it.c, n: it.n } }) }
    if (mode() === 'both') return G.world0.trains.map(function (t) { return { name: trainMeta(t.id).name, cmds: rl(G.P.lanes[t.id]) } })
    return [{ name: null, cmds: rl(G.P.items) }]
  }
  /* ── hint ───────────────────────────────────────────────────────────────────────────────────────────── */
  function hint () {
    if (G.running) return
    var acts = compile().map(function (a) { return a.action }), h = KG.hint(G.world0, acts)
    if (!h) { say('Coba mulai lagi dengan menekan Hapus, lalu susun dari awal.', false); return }
    G.hintLvl = Math.min(3, (G.hintLvl || 0) + 1); hintOff(); if (G.view) G.view.clearGhost()
    var ids = Object.keys(h.action), parts = ids.map(function (id) { return (ids.length > 1 || mode() === 'turns' ? trainMeta(id).name + ': ' : '') + CMD[h.action[id]].t })
    var pre = KG.run(G.world0, acts.slice(0, h.at), { auto: true }).world
    if (G.hintLvl === 1) { say('Petunjuk: langkah ke-' + (h.at + 1) + ' sebaiknya ' + parts.join(', ') + '.', false); ids.forEach(function (id) { var b = $('kg-pal').querySelector('.kcmd[data-c="' + h.action[id] + '"]'); if (b) b.classList.add('hint') }) }
    else if (G.hintLvl === 2) {
      var nx = KG.step(pre, h.action, { auto: true }).world, t0 = nx.trains.filter(function (t) { return t.id === ids[0] })[0]
      say('Lihat panah di papan: kereta harus menuju petak itu.', false); if (t0 && G.view) G.view.ghost(t0.r, t0.c, t0.d)
      ids.forEach(function (id) { var b = $('kg-pal').querySelector('.kcmd[data-c="' + h.action[id] + '"]'); if (b) b.classList.add('hint') })
    } else {
      // fill the next step: keep what works, drop the wrong tail, add the right command
      var lane = mode() === 'both' ? ids[0] : 'main', arr = laneArr(lane), slots = compile()
      if (mode() === 'solo' && slots[h.at - 1]) { var si = slots[h.at - 1].slots.main, k = 0; for (var q = 0; q <= h.at - 1; q++) if (slots[q].slots.main === si) k++; arr.length = si + 1; arr[si].n = k }
      else if (mode() === 'solo') arr.length = 0
      if (mode() === 'both') { var wanted = h.at; if (arr.length > wanted) arr.length = wanted }
      var it = { c: h.action[ids[0]], n: 1 }; if (mode() === 'turns') it.t = ids[0]
      if (arr.length < G.lv.slots) { arr.push(it); G.justAdded = { lane: lane, i: arr.length - 1 } }
      say('Aku isi langkah berikutnya: ' + parts.join(', ') + '. Sekarang kamu lanjutkan!', false); G.hintLvl = 0; drawLanes()
    }
    if (mode() !== 'solo' && ids.length === 1) { G.S = ids[0]; drawTabs() }
  }

  /* ── open / close ───────────────────────────────────────────────────────────────────────────────────── */
  function open (lv, cb) {
    close(); G.hintLvl = 0
    G.lv = lv; G.cb = cb; G.world0 = KG.world(lv); G.world = G.world0; G.token = (G.token || 0) + 1; G.sel = null; G.running = false; G.opt = null
    G.S = mode() === 'solo' ? 'main' : G.world0.trains[0].id
    if (mode() === 'both') G.S = G.world0.trains[0].id
    G.P = newProgram(); G.paused = false
    $('kg-run-t').textContent = lv.runLabel || (lv.mode === 'both' ? 'Jalankan Bersama' : 'Jalankan')
    $('kg-speed').textContent = '1x'; G.speed = 0
    KA.setBg($('kg-bg'), lv, 1024)
    $('kg-title').textContent = 'Misi ' + (lv.n < 10 ? '0' : '') + lv.n + ' · ' + lv.title
    drawPalette(); drawTabs(); drawLanes(); drawCard(); drawHud(); say(lv.tip || null, false)
    $('kg-run').hidden = false; $('kg-live').hidden = true; $('kg-aksi').hidden = true
    G.view = KB.create($('kg-board'), lv, {})
    G.view.reset(G.world0); G.view.setSpeed(1)
    setTimeout(function () { if (G.lv === lv) { try { var pl = KG.solve(KG.world(lv), { cap: 300000 }); G.opt = pl ? packLen(pl) : null } catch (e) { G.opt = null } } }, 600)
  }
  function close () { G.token = (G.token || 0) + 1; if (G.view) { G.view.destroy(); G.view = null } G.running = false; G.lv = null }

  function bind () {
    $('kg-run').addEventListener('click', run)
    $('kg-reset').addEventListener('click', function () { resetBoard(); sfx('click') })
    $('kg-undo').addEventListener('click', function () { if (G.running) return; var lane = mode() === 'both' ? G.S : 'main', a = laneArr(lane); if (a.length) { a.pop(); G.sel = null; resetBoard(true); drawLanes() } })
    $('kg-clear').addEventListener('click', function () { if (G.running) return; G.P = newProgram(); G.sel = null; resetBoard(); drawLanes() })
    $('kg-hint').addEventListener('click', hint)
    $('kg-info').addEventListener('click', function () { $('kg-card').classList.toggle('open') })
    $('kg-pause').addEventListener('click', function () { G.paused = !G.paused; $('kg-pause').lastChild.textContent = G.paused ? 'Lanjut' : 'Jeda' })
    $('kg-speed').addEventListener('click', function () { G.speed = ((G.speed || 0) + 1) % SPEEDS.length; var k = SPEEDS[G.speed]; if (G.view) G.view.setSpeed(k); $('kg-speed').textContent = (k === 0.5 ? '0.5' : k) + 'x' })
  }
  W.KeretaPlay = { open: open, close: close, bind: bind, CMD: CMD, debug: function () { return { G: G, compile: compile, used: used } }, packLen: packLen }
})(typeof window !== 'undefined' ? window : globalThis)
