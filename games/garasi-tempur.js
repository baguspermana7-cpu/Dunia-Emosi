/* ============================================================================
 * garasi-tempur.js — G29 "Garasi Tempur" app: screens, battle table, guide, save.
 * PRD: documentation and standarization/MONSTER_TRUCK_TCG_PRD_v2.md
 *
 * The engine (gt-engine.js) owns every rule and number. This file only:
 *   - turns taps/drags into engine commands (each with a unique id, so a double tap
 *     is one action), shows the engine's refusal reason in plain Indonesian;
 *   - replays the engine's events as motion (gt-fx.js) and re-renders from state;
 *   - GUIDES the child (owner: "workflownya pastikan jelas guided"): a coach line that
 *     always names the next useful step and makes exactly that thing glow, a 3-card
 *     first-battle intro, and friendly reasons instead of silent failures;
 *   - runs Monster Rush (gt-quiz.js) after the last KO, then the final score.
 *
 * SAVE (per avatar via save-engine avatarScopedGet/Set, key "dunia-gt-v1"):
 *   { stage, stars{}, got{truckId:1}, team[3]|null, starter, level, tut, sound, best, battle }
 *   `battle` = the running match (engine state + meta) so a reload resumes it.
 * ==========================================================================*/
(function () {
  'use strict'
  var E = window.GTEngine, C = window.GTCards, TR = window.GTTrucks, Card = window.GTCard, FX = window.GTFx, Q = window.GTQuiz
  var lib = Card.lib
  var KEY = 'dunia-gt-v1', GAME_ID = 29
  function $ (id) { return document.getElementById(id) }
  function esc (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') }

  /* ── content: adventure stages (one per arena backdrop) ─────────────────── */
  var STAGES = [
    { arena: 'stadion-malam', name: 'Stadion Malam', rule: 'malam', types: ['POWER', 'ARMOR'], rar: 'biasa', ai: 'rookie', champ: 'Kapten Baut', mon: ['gt-monster/robo-gorilla', 'Gorila Robot'] },
    { arena: 'kanyon-lava', name: 'Kanyon Air Terjun', rule: 'ramp', types: ['STUNT', 'SPEED'], rar: 'biasa', ai: 'rookie', champ: 'Rara Lompat', mon: ['gt-monster/lava-tortoise', 'Kura-kura Lava'] },
    { arena: 'permen', name: 'Negeri Permen', rule: 'malam', types: ['SPEED', 'STUNT'], rar: 'biasa', ai: 'rookie', champ: 'Momo Manis', mon: ['gt-monster/cupcake-monster', 'Monster Kue'] },
    { arena: 'kuil-hutan', name: 'Kuil Hutan', rule: 'lumpur', types: ['MUD', 'STUNT'], rar: 'langka', ai: 'rookie', champ: 'Pak Lumut', mon: ['gt-monster/forest-ent', 'Raksasa Pohon'] },
    { arena: 'pelabuhan', name: 'Pelabuhan Kapal', rule: 'lumpur', types: ['MUD', 'POWER'], rar: 'langka', ai: 'racer', champ: 'Bajak Bondan', mon: ['gt-monster/pirate-octopus-cannon', 'Gurita Meriam'] },
    { arena: 'salju', name: 'Gunung Salju', rule: 'ramp', types: ['ARMOR', 'TECH'], rar: 'langka', ai: 'racer', champ: 'Salsa Salju', mon: ['gt-monster/snow-golem', 'Manusia Salju Raksasa'] },
    { arena: 'bawah-laut', name: 'Kota Bawah Laut', rule: 'malam', types: ['TECH', 'ARMOR'], rar: 'epik', ai: 'racer', champ: 'Dr. Gelembung', mon: ['gt-monster/deep-angler', 'Ikan Lentera'] },
    { arena: 'pulau-langit', name: 'Pulau Langit', rule: 'ramp', types: ['SPEED', 'TECH'], rar: 'epik', ai: 'racer', champ: 'Kilat Angkasa', mon: ['gt-monster/storm-cloud-2', 'Awan Badai'] },
    { arena: 'gunung-api', name: 'Gunung Api', rule: 'lumpur', types: ['POWER', 'MUD'], rar: 'legenda', ai: 'racer', champ: 'Raja Magma', mon: ['gt-monster/fire-bone-dragon', 'Naga Tulang Api'] }
  ]
  var RUSH_MONSTERS = [['gt-monster/magma-golem', 'Golem Magma'], ['gt-monster/crystal-crab', 'Kepiting Kristal'], ['gt-monster/penguin-king', 'Raja Pinguin'],
    ['gt-monster/jester-box', 'Badut Kotak'], ['gt-monster/robo-shark', 'Hiu Robot'], ['gt-monster/ufo-alien', 'UFO Alien'], ['gt-monster/snow-rabbit', 'Kelinci Salju'],
    ['gt-monster/spike-snail', 'Siput Duri'], ['gt-monster/clock-owl', 'Burung Hantu Jam'], ['gt-monster/bomb-pumpkin', 'Labu Bom'], ['gt-monster/rhino-tank', 'Badak Tank'],
    ['gt-monster/crown-mimic', 'Peti Bergigi'], ['gt-monster/tar-blob', 'Lumpur Hitam'], ['gt-monster/ice-walrus', 'Walrus Es']]
  var RAR_ORDER = ['biasa', 'langka', 'epik', 'legenda']
  function stageTrucks (i) {                         // 3 opponent trucks, deterministic per stage
    var s = STAGES[i], out = [], used = {}
    var cands = TR.ALL.filter(function (t) { return s.types.indexOf(t.type) >= 0 && t.rarity === s.rar })
    if (cands.length < 3) cands = TR.ALL.filter(function (t) { return s.types.indexOf(t.type) >= 0 })
    for (var k = 0; out.length < 3 && k < 60; k++) {
      var t = cands[(i * 7 + k * 5) % cands.length]
      if (!used[t.id]) { used[t.id] = 1; out.push(t.id) }
    }
    return out
  }
  var REASON = {
    gameOver: 'Pertandingan sudah selesai.', notYourTurn: 'Tunggu giliranmu ya.', answerFirst: 'Jawab soalnya dulu.',
    handLimit: 'Tanganmu penuh — buang 1 kartu dulu.', notATruck: 'Itu bukan kartu truk.', benchFull: 'Arena sudah ada trukmu.', swapOnce: 'Ganti truk hanya 1 kali tiap giliran.',
    notFuel: 'Itu bukan bensin.', noTruck: 'Taruh truk di arena dulu.', fuelOncePerTurn: 'Bensin hanya boleh diisi 1 kali tiap giliran.',
    fuelFull: 'Tangki sudah penuh (maks 4).', notAPart: 'Itu bukan onderdil.', fullHP: 'HP truk masih penuh.', nothingToSwitch: 'Belum ada truk cadangan.',
    deckEmpty: 'Tumpukan kartu sudah habis.', noTarget: 'Lawan belum punya truk.', needFuel: 'Bensinnya belum cukup.', notInHand: 'Kartu itu tidak ada di tanganmu.'
  }

  /* ── save ───────────────────────────────────────────────────────────── */
  var P
  function fill (o) {
    o = o || {}
    var got = o.got || {}
    Object.keys(C.STARTERS).forEach(function (k) { C.STARTERS[k].trucks.forEach(function (id) { got[id] = 1 }) })
    return { stage: o.stage || 0, stars: o.stars || {}, got: got, team: o.team || null, starter: o.starter || 'api', level: o.level || 'mudah',
      tut: !!o.tut, sound: o.sound !== false, best: o.best || 0, battle: o.battle || null }
  }
  function load () {
    var raw = null
    try { raw = window.avatarScopedGet ? avatarScopedGet(KEY, null) : localStorage.getItem(KEY) } catch (e) {}
    try { P = fill(raw ? JSON.parse(raw) : null) } catch (e) { P = fill(null) }
  }
  function save () { try { var s = JSON.stringify(P); if (window.avatarScopedSet) avatarScopedSet(KEY, s); else localStorage.setItem(KEY, s) } catch (e) {} }
  load()

  /* ── screens ────────────────────────────────────────────────────────── */
  function show (id) {
    document.querySelectorAll('.scr').forEach(function (s) { s.classList.toggle('active', s.id === id) })
    document.body.setAttribute('data-scr', id)
  }
  var toastT = 0
  function toast (msg, kind) {
    var t = $('toast'); t.textContent = msg; t.className = 'toast show ' + (kind || '')
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = 'toast' }, 2200)
  }
  function tap (el, fn) {
    if (typeof el === 'string') el = $(el)
    if (!el) return
    el.addEventListener('click', function (e) { FX.SND.cue('click'); fn(e) })
  }
  var FEAT = TR.ALL.filter(function (t) { return t.rarity === 'legenda' })
  function home () {
    show('scr-home')
    FX.mountScene($('home-scene'), 'stadion-malam', lib)
    var hero = TR.get(C.STARTERS[P.starter].trucks[0])
    $('home-hero').src = lib(hero.sprite)
    $('hero1').src = lib('gt-truck/truck-001'); $('hero2').src = lib('gt-truck/truck-004')
    $('side-resume').classList.toggle('hide', !P.battle)
    $('lvl-mudah').classList.toggle('on', P.level === 'mudah'); $('lvl-sedang').classList.toggle('on', P.level === 'sedang')
    var got = Object.keys(P.got).filter(function (k) { return P.got[k] }).length
    $('home-got').textContent = got + '/' + TR.ALL.length
    var won = Math.min(P.stage, STAGES.length)
    $('home-stage').textContent = Math.min(won + 1, STAGES.length) + '/' + STAGES.length
    // player card: rank from arenas won; bar = stars earned of all stars
    var stars = Object.keys(P.stars).reduce(function (n, k) { return n + (P.stars[k] || 0) }, 0)
    $('home-rank').textContent = won >= 9 ? 'Juara Legenda' : won >= 6 ? 'Pembalap Hebat' : won >= 3 ? 'Pembalap Muda' : 'Pembalap Pemula'
    $('home-bar').style.transform = 'scaleX(' + (stars / (STAGES.length * 3)) + ')'; $('home-bar-t').textContent = stars + ' / ' + STAGES.length * 3 + ' ★'
    var tier = won >= 6 ? 'Liga Emas' : won >= 3 ? 'Liga Perak' : 'Liga Perunggu', base = won >= 6 ? 6 : won >= 3 ? 3 : 0
    $('league-n').textContent = tier
    $('league-bar').style.transform = 'scaleX(' + Math.min(1, (won - base) / 3) + ')'; $('league-t').textContent = Math.min(3, won - base) + ' / 3'
    var f = FEAT[Math.floor(Date.now() / 864e5) % FEAT.length]         // one legend truck per day
    $('feat-name').textContent = f.name; $('feat-sub').textContent = P.got[f.id] ? 'Truk legenda — sudah di garasimu!' : 'Truk legenda — menangkan Petualangan!'
    $('feat-img').src = lib(f.sprite); $('btn-feat').setAttribute('data-id', f.id)
  }

  /* ── adventure map ──────────────────────────────────────────────────── */
  function adventure () {
    show('scr-map')
    $('map-list').innerHTML = STAGES.map(function (s, i) {
      var open = i <= P.stage, st = P.stars[i] || 0
      var stars = ''; for (var k = 0; k < 3; k++) stars += '<i class="' + (k < st ? 'on' : '') + '">★</i>'
      return '<button class="stage' + (open ? '' : ' locked') + (i === P.stage ? ' next' : '') + '" type="button" data-i="' + i + '"' + (open ? '' : ' aria-disabled="true"') + '>' +
        '<span class="stage-bg" style="background-image:url(\'' + lib('gt-arena/' + s.arena + '-land') + '\')"></span>' +
        '<span class="stage-no fk">' + (i + 1) + '</span><span class="stage-name fk">' + s.name + '</span>' +
        '<span class="stage-champ">' + (open ? 'Lawan: ' + s.champ : 'Terkunci — menangkan arena sebelumnya') + '</span>' +
        '<span class="stage-stars">' + stars + '</span>' + (open ? '' : '<img class="stage-lock" src="' + lib('gt/lock') + '" alt="">') + '</button>'
    }).join('')
    var nx = document.querySelector('.stage.next'); if (nx) setTimeout(function () { try { nx.scrollIntoView({ block: 'center', behavior: FX.reduced() ? 'auto' : 'smooth' }) } catch (e) {} }, 60)
  }
  function stageIntro (i) {
    var s = STAGES[i], ar = C.ARENAS.filter(function (a) { return a.id === s.rule })[0]
    MODE = { kind: 'adv', stage: i }
    $('si-bg').style.backgroundImage = 'url("' + lib('gt-arena/' + s.arena + (innerHeight > innerWidth ? '-port' : '-land')) + '")'
    $('si-title').textContent = 'Arena ' + (i + 1) + ': ' + s.name
    $('si-champ').textContent = s.champ + ' menantangmu!'
    $('si-rule').textContent = ar.rule
    $('si-cards').innerHTML = stageTrucks(i).map(function (id) { return '<div class="si-c">' + Card.truck(TR.get(id)) + '</div>' }).join('')
    show('scr-stage')
  }

  /* ── team picker ────────────────────────────────────────────────────── */
  var MODE = null, PICK = { seat: 0, teams: [null, null] }, CUSTOM = []
  function teamPicker (seat) {
    PICK.seat = seat
    $('team-title').textContent = MODE.kind === 'pvp' ? ('Pemain ' + (seat + 1) + ': pilih tim') : 'Pilih timmu'
    $('team-list').innerHTML = Object.keys(C.STARTERS).map(function (k) {
      var s = C.STARTERS[k]
      return '<button class="team" type="button" data-k="' + k + '"><span class="team-name fk">' + s.name + '</span><span class="team-cards">' +
        s.trucks.map(function (id) { return mini(TR.get(id)) }).join('') + '</span></button>'
    }).join('') +
      '<button class="team team-custom" type="button" data-k="custom"><span class="team-name fk">Tim Saya</span><span class="team-cards">' +
      ((P.team || []).length === 3 ? P.team.map(function (id) { return mini(TR.get(id)) }).join('') : '<span class="team-empty">Pilih 3 truk dari koleksimu</span>') + '</span></button>'
    show('scr-team')
  }
  function mini (d, o) {
    o = o || {}
    var T = C.TYPES[d.type]
    return '<span class="mini' + (o.locked ? ' locked' : '') + (o.sel ? ' sel' : '') + '" data-id="' + d.id + '" style="--tc:' + T.color + '">' +
      '<img src="' + lib(d.sprite) + '" alt="' + (o.locked ? 'belum ditemukan' : esc(d.name)) + '" loading="lazy" draggable="false">' +
      '<b class="mini-hp">' + (o.locked ? '?' : d.hp) + '</b><img class="mini-t" src="' + lib(Card.TYPE_ICON[d.type]) + '" alt="' + T.name + '">' +
      (o.name ? '<span class="mini-n">' + (o.locked ? '???' : esc(d.name)) + '</span>' : '') + '</span>'
  }
  function customPicker () {
    CUSTOM = (P.team || []).slice()
    renderCustom(); show('scr-custom')
  }
  function renderCustom () {
    var got = TR.ALL.filter(function (t) { return P.got[t.id] })
    $('custom-list').innerHTML = got.map(function (t) { return mini(t, { name: 1, sel: CUSTOM.indexOf(t.id) >= 0 }) }).join('')
    $('custom-n').textContent = CUSTOM.length + '/3 dipilih'
    $('custom-ok').disabled = CUSTOM.length !== 3
  }
  function chooseTeam (trucks) {
    PICK.teams[PICK.seat] = trucks
    if (MODE.kind === 'pvp' && PICK.seat === 0) return teamPicker(1)
    startBattle()
  }

  /* ── battle state ───────────────────────────────────────────────────── */
  var S = null, M = null, BUSY = false, SEL = null, CID = 0, AI_RUN = false, ENDARM = false
  function human (pi) { return M.mode === 'pvp' || pi === 0 }
  function view () { return M.mode === 'pvp' ? (S.phase === 'over' ? 0 : S.active) : 0 }
  function startBattle () {
    var seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0
    var opp, arena, oppName, mon, level = 'rookie', stageI = -1
    if (MODE.kind === 'adv') {
      stageI = MODE.stage; var s = STAGES[stageI]
      opp = { trucks: stageTrucks(stageI) }; arena = s.arena; oppName = s.champ; mon = s.mon; level = s.ai
    } else if (MODE.kind === 'pvp') {
      opp = { trucks: PICK.teams[1] }; arena = STAGES[Math.floor(Math.random() * STAGES.length)].arena; oppName = 'Pemain 2'
      mon = RUSH_MONSTERS[Math.floor(Math.random() * RUSH_MONSTERS.length)]
    } else {
      var pool = TR.ALL.filter(function (t) { return t.rarity === 'biasa' })
      var ids = []; while (ids.length < 3) { var t = pool[Math.floor(Math.random() * pool.length)].id; if (ids.indexOf(t) < 0) ids.push(t) }
      opp = { trucks: ids }; arena = STAGES[Math.floor(Math.random() * 4)].arena; oppName = 'Rival Latihan'
      mon = RUSH_MONSTERS[Math.floor(Math.random() * RUSH_MONSTERS.length)]
    }
    var rule = stageI >= 0 ? STAGES[stageI].rule : STAGES.filter(function (x) { return x.arena === arena })[0].rule
    S = E.create({ seed: seed, arena: rule, p1: { name: MODE.kind === 'pvp' ? 'Pemain 1' : 'Kamu', trucks: PICK.teams[0] }, p2: { name: oppName, trucks: opp.trucks } })
    M = { mode: MODE.kind, stage: stageI, bg: arena, ai: level, mon: mon, correct: [0, 0], lost: [0, 0], seed: seed, qseed: seed ^ 0x5bd1e995 }
    ;PICK.teams[0].concat(opp.trucks).forEach(function (id) { P.got[id] = P.got[id] || 0 })   // seen (0) vs owned (1) — collection shows owned
    P.battle = { S: S, M: M }; save()
    openBattle()
  }
  function openBattle () {
    $('chal').className = 'chal'; QR = null; lastQ = null
    SEL = null; BUSY = false; AI_RUN = false; ENDARM = false
    show('scr-battle')
    FX.mountScene($('bt-scene'), M.bg, lib)
    render()
    if (!P.tut) return tutorial(function () { P.tut = true; save(); afterTurnStart(true) })
    afterTurnStart(true)
  }

  /* ── render (state -> DOM), layout = mockup ui-1 / ui-5 ──────────────── */
  var SLOT_IC = { tire: 'gt/part-tire', body: 'gt/part-bumper', engine: 'gt/part-engine' }
  function truckHtml (tr, pi) {
    var d = C.get(S.cards[tr.inst]), mine = pi === view()
    var pv = [0, 1].map(function (i) { var p = S.active === pi ? E.preview(S, i) : null; return p ? p.total : d.attacks[i].dmg })
    var need = d.attacks.map(function (a, i) { var p = S.active === pi ? E.preview(S, i) : null; return p ? p.fuelNeed : a.fuel })
    var html = Card.truck(d, { inst: tr.inst, hp: tr.hp, maxHp: tr.maxHp, fuel: tr.fuel, fuelNeed: need, preview: pv, cls: 'on-field' + (mine ? ' mine' : ' theirs') })
    var slots = ['tire', 'body', 'engine'].map(function (s) {
      var pc = tr.parts[s] ? C.get(S.cards[tr.parts[s]]) : null
      return '<span class="slot' + (pc ? ' full' : '') + '" title="' + (pc ? esc(pc.name) : 'slot ' + ({ tire: 'ban', body: 'bodi', engine: 'mesin' })[s] + ' kosong') + '"><img src="' + lib(SLOT_IC[s]) + '" alt=""></span>'
    }).join('')
    return '<div class="field-card" data-inst="' + tr.inst + '">' + html + '<div class="kit">' + slots + '</div></div>'
  }
  function fieldHtml (pi) {
    var Pl = S.players[pi], mine = pi === view()
    var cans = ''
    if (!mine && Pl.active) { cans = '<div class="opcans">'; for (var i = 0; i < E.RULES.FUEL_MAX; i++) cans += '<i class="' + (i < Pl.active.fuel ? 'full' : '') + '"></i>'; cans += '</div>' }
    return '<div class="active-slot' + (Pl.active ? '' : ' empty') + '" data-drop="active">' +
      (Pl.active ? truckHtml(Pl.active, pi) : '<span class="empty-t"><b>+</b>' + (mine ? 'Taruh truk di sini' : 'Menunggu truk') + '</span>') + '</div>' + cans
  }
  function panelHtml (pi) {
    var Pl = S.players[pi]
    var nitro = ''; for (var n = 0; n < E.RULES.NITRO_FULL; n++) nitro += '<i class="' + (n < Pl.nitro ? 'on' : '') + '"></i>'
    var title = M.mode === 'pvp' ? 'Pembalap' : (pi === 0 ? 'Pembalap Garasi' : (M.stage >= 0 ? 'Juara Arena ' + (M.stage + 1) : 'Rival Latihan'))
    return '<img class="av" src="' + lib(pi === 0 ? 'gt/avatar-player' : 'gt/avatar-opponent') + '" alt="">' +
      '<div class="ppanel-t"><div class="ppanel-n fk">' + esc(Pl.name) + '</div><div class="ppanel-s">' + title + '</div>' +
      '<div class="ppanel-k"><img src="' + lib('gt/trophy') + '" alt="">KO ' + Pl.ko + '/' + E.RULES.KO_TO_WIN +
      '<span class="nitro' + (Pl.nitro >= E.RULES.NITRO_FULL ? ' full' : '') + '" title="Nitro">' + nitro + '</span>' + (Pl.boost ? '<span class="boost">+' + Pl.boost + '</span>' : '') + '</div></div>'
  }
  function dots (n, on) { var h = ''; for (var i = 0; i < n; i++) h += '<i class="' + (i < on ? 'on' : '') + '"></i>'; return h }
  function arenaHtml () {
    var st = STAGES.filter(function (x) { return x.arena === M.bg })[0], ar = C.ARENAS.filter(function (a) { return a.id === S.arena })[0]
    return '<span class="ac-tag">ARENA</span><div class="ac-name fk">' + esc(st.name) + '</div>' +
      '<div class="ac-img" style="background-image:url(\'' + lib('gt-arena/' + M.bg + '-land') + '\')"></div><div class="ac-rule">' + esc(ar.rule) + '</div>'
  }
  // the turn checklist (mockup "Draw / Garage / Action / End"): the guided workflow
  var STEPS = [['draw', 'Ambil kartu'], ['fuel', 'Bensin +1'], ['swap', 'Ganti truk', 1], ['part', 'Bantuan', 1], ['attack', 'Serang!'], ['end', 'Selesai']]
  function turnHtml (now) {
    var me = view(), mine = S.active === me && human(S.active), Pl = S.players[S.active]
    var idx = { draw: 0, truck: 2, fuel: 1, swap: 2, part: 3, attack: 4, end: 5, discard: 0 }[now]
    var hasFuel = Pl.hand.some(function (c) { return C.get(S.cards[c]).cat === 'fuel' })
    var li = STEPS.map(function (s, i) {
      var k = s[0], done = false, skip = false
      if (mine) {
        if (k === 'draw') done = true
        else if (k === 'fuel') done = true                              // automatic
        else if (k === 'swap') { done = Pl.swapped; skip = !done && i < idx }
        else if (k === 'part' || k === 'attack') skip = i < idx
      }
      var cls = mine && i === idx ? 'now' : (done ? 'done' : (skip ? 'skip' : ''))
      return '<li class="st-' + k + ' ' + cls + (s[2] ? ' opt' : '') + '"><i>' + (done ? '✓' : skip ? '–' : (i === idx && mine ? '›' : '')) + '</i>' + s[1] + '</li>'
    }).join('')
    return '<div class="tp-turn fk">Giliran ' + S.turn + '</div><div class="tp-who fk' + (mine ? '' : ' op') + '">' + (mine ? (M.mode === 'pvp' ? esc(Pl.name) : 'Giliranmu') : 'Giliran Lawan') + '</div>' +
      '<ul class="tp-steps">' + li + '</ul>'
  }
  function render () {
    var me = view(), op = 1 - me, O = S.players[op], Pl = S.players[me]
    $('op-panel').innerHTML = panelHtml(op)
    $('me-panel').innerHTML = panelHtml(me)
    $('op-field').innerHTML = fieldHtml(op)
    $('me-field').innerHTML = fieldHtml(me)
    var backs = ''; for (var i = 0; i < Math.min(O.hand.length, 5); i++) backs += '<img src="' + lib('gt/card-back') + '" alt="">'
    $('op-hand').innerHTML = backs
    $('op-ko').innerHTML = dots(E.RULES.KO_TO_WIN, O.ko)
    $('op-cnt').innerHTML = '<img src="' + lib('gt/card-back') + '" alt="">' + O.hand.length + ' Kartu'
    $('me-count').innerHTML = '<span><img src="' + lib('gt/card-back') + '" alt=""> ' + Pl.hand.length + ' Kartu</span>'
    $('arena-card').innerHTML = arenaHtml()
    $('scr-battle').classList.toggle('my-turn', S.active === me && human(S.active))
    $('hand').innerHTML = Pl.hand.map(function (inst, k) {
      var d = C.get(S.cards[inst])
      var strong = d.cat === 'truck' && O.active && d.strongVs === C.get(S.cards[O.active.inst]).type
      return '<div class="hc' + (strong ? ' strong' : '') + '" data-inst="' + inst + '" style="--i:' + k + ';--n:' + Pl.hand.length + '">' + Card.any(d, { inst: inst, cls: 'in-hand' }) + '</div>'
    }).join('')
    $('deck-n').textContent = Pl.deck.length
    var f = Pl.active ? Pl.active.fuel : 0
    $('fuel-segs').innerHTML = dots(E.RULES.FUEL_MAX, f).replace(/class="on"/g, 'class="full"')
    $('fuel-n').textContent = f + '/' + E.RULES.FUEL_MAX
    layoutHand()
    $('atkbar').classList.remove('show')
    guide()
  }
  function layoutHand () {                          // fan: rotate/offset each card around the centre
    var hand = $('hand'), cards = hand.children, n = cards.length
    hand.style.fontSize = ''
    var W0 = hand.clientWidth || innerWidth, cw = cards[0] ? cards[0].offsetWidth : 90
    // every card keeps >= 48 px of itself uncovered for a child's finger: shrink the cards if needed
    var MIN = 56, fit = n > 1 ? W0 - 6 - (n - 1) * MIN : W0
    if (n > 1 && cw > fit && fit > 40) {
      hand.style.fontSize = (parseFloat(getComputedStyle(hand).fontSize) * fit / cw).toFixed(2) + 'px'
      cw = cards[0].offsetWidth
    }
    var span = Math.min(W0 - cw - 4, (n - 1) * cw * 1.02), step = n > 1 ? span / (n - 1) : 0
    for (var i = 0; i < n; i++) {
      var k = i - (n - 1) / 2, el = cards[i]
      var x = k * step, rot = n > 1 ? k * Math.min(4, 18 / n) : 0, y = Math.abs(k) * Math.abs(k) * 1.2
      el.style.setProperty('--x', x.toFixed(1) + 'px'); el.style.setProperty('--r', rot.toFixed(2) + 'deg'); el.style.setProperty('--y', y.toFixed(1) + 'px')
      el.style.zIndex = String(10 + i)
    }
  }

  /* ── GUIDE: the next useful step, in words + a glow on exactly that thing ── */
  function guide () {
    document.querySelectorAll('.guide').forEach(function (e) { e.classList.remove('guide') })
    var coach = $('coach'), me = view()
    if (S.phase === 'over') { coach.innerHTML = ''; coach.setAttribute('data-step', ''); return }
    if (S.active !== me || !human(S.active)) {
      coach.className = 'wait'; coach.setAttribute('data-step', 'wait')
      coach.innerHTML = '<img src="' + lib('gt/timer') + '" alt=""><span>Giliran <b>' + esc(S.players[S.active].name) + '</b>… perhatikan serangannya!</span>'
      $('turn-panel').innerHTML = turnHtml('draw'); return
    }
    coach.className = ''
    var L = E.legal(S), Pl = S.players[me]
    var has = function (t) { return L.filter(function (c) { return c.type === t }) }
    var glowCards = function (list) { list.forEach(function (c) { var el = document.querySelector('#hand .hc[data-inst="' + c.card + '"]'); if (el) el.classList.add('guide') }) }
    var step, msg
    if (Pl.hand.length > E.RULES.HAND_LIMIT) { step = 'discard'; msg = 'Tanganmu penuh (maks 7). Ketuk 1 kartu lalu <b>Buang</b>.'; glowCards(has('discard')) }
    else if (!Pl.active) { step = 'truck'; msg = 'Ketuk kartu <b>TRUK</b> di tanganmu, lalu <b>Taruh di Arena</b>.'; glowCards(has('playTruck')) }
    else if (has('attachFuel').length) { step = 'fuel'; msg = 'Ketuk kartu <b>BENSIN</b>, lalu isi ke trukmu (1× tiap giliran).'; glowCards(has('attachFuel')) }
    else {
      var atk = has('attack'), O = S.players[1 - me], hp = Pl.active.hp, max = Pl.active.maxHp
      var parts = has('attachPart').filter(function (c) { return !Pl.active.parts[C.get(S.cards[c.card]).slot] })
      var fuelShort = !atk.length
      // useful action cards, one at a time (audit: kids ended games holding 2.3 unplayed actions)
      var acts = has('playAction').filter(function (c) {
        var e = C.get(S.cards[c.card]).effect
        return (e === 'heal' && hp <= max - 4) || ((e === 'boost' || e === 'nitro') && atk.length && O.active) || ((e === 'fuel' || e === 'draw') && fuelShort)
      })
      var oType = O.active ? C.get(S.cards[O.active.inst]).type : null
      var strongNow = oType && C.get(S.cards[Pl.active.inst]).strongVs === oType
      var swaps = oType && !strongNow && !Pl.swapped ? has('playTruck').filter(function (c) { return C.get(S.cards[c.card]).strongVs === oType }) : []
      var oStrong = O.active ? C.get(S.cards[O.active.inst]).strongVs : null
      var weakNow = oStrong && C.get(S.cards[Pl.active.inst]).type === oStrong
      if (!swaps.length && weakNow && !Pl.swapped) swaps = has('playTruck').filter(function (c) { return C.get(S.cards[c.card]).type !== oStrong })
      if (!O.active) {
        step = 'end'; msg = 'Lawan belum punya truk. Tekan <b>SELESAI</b> — giliran depan kamu bisa menyerang!'; $('btn-end').classList.add('guide')
      } else if (swaps.length) {
        step = 'swap'; msg = strongNow || !weakNow || C.get(S.cards[swaps[0].card]).strongVs === oType ? 'Truk ini <b>KUAT</b> melawan truk lawan! Ketuk, lalu <b>Ganti</b>.' : 'Trukmu <b>LEMAH</b> melawan lawan ini. Ganti dengan truk ini!'; glowCards(swaps.slice(0, 1))
      } else if (parts.length) {
        step = 'part'; msg = 'Pasang <b>ONDERDIL</b> ini ke trukmu biar makin kuat!'; glowCards(parts.slice(0, 1))
      } else if (acts.length) {
        step = 'part'; msg = 'Pakai kartu <b>BANTUAN</b> ini dulu' + (atk.length ? ', lalu serang!' : '.'); glowCards(acts.slice(0, 1))
      } else if (atk.length) {
        step = 'attack'; msg = 'Ketuk <b>TRUKMU</b> di arena, lalu pilih <b>SERANGAN</b>!'
        var fc = document.querySelector('#me-field .field-card'); if (fc) fc.classList.add('can-atk', 'guide')
      } else {
        var need = Math.min(E.preview(S, 0).fuelNeed, E.preview(S, 1).fuelNeed)
        step = 'end'; msg = 'Bensin ' + Pl.active.fuel + '/' + need + ' — belum cukup untuk menyerang. Tekan <b>SELESAI</b>, nanti isi lagi.'
        $('btn-end').classList.add('guide')
      }
    }
    coach.setAttribute('data-step', step)
    coach.innerHTML = '<img src="' + lib('gt/direction-sign') + '" alt=""><span>' + msg + '</span>'
    $('turn-panel').innerHTML = turnHtml(step)
  }

  /* ── input: select / drag hand cards, tap attacks, end turn ─────────── */
  function myTurn () { return S && S.phase !== 'over' && !BUSY && human(S.active) && S.active === view() }
  function actionFor (inst) {
    var d = C.get(S.cards[inst]), Pl = S.players[S.active]
    if (Pl.hand.length > E.RULES.HAND_LIMIT) return { type: 'discard', label: 'Buang' }
    if (d.cat === 'truck') return { type: 'playTruck', label: Pl.active ? 'Ganti ke Truk Ini' : 'Taruh di Arena' }
    if (d.cat === 'fuel') return { type: 'attachFuel', label: 'Isi ke Truk' }
    if (d.cat === 'part') return { type: 'attachPart', label: (Pl.active && Pl.active.parts[d.slot] ? 'Ganti ' : 'Pasang ') + ({ tire: 'Ban', body: 'Bodi', engine: 'Mesin' })[d.slot] }
    return { type: 'playAction', label: 'Pakai' }
  }
  function why (cmd) {                               // the engine's own refusal, without changing state
    var r = E.apply(S, { type: cmd.type, card: cmd.card, attack: cmd.attack })
    return r.ok ? null : r.reason
  }
  function select (inst) {
    SEL = inst
    if (inst) $('atkbar').classList.remove('show')
    document.querySelectorAll('#hand .hc').forEach(function (h) { h.classList.toggle('sel', h.getAttribute('data-inst') === inst) })
    var bar = $('actbar')
    if (!inst) { bar.classList.remove('show'); document.querySelectorAll('.drop-ok').forEach(function (e) { e.classList.remove('drop-ok') }); return }
    var a = actionFor(inst), reason = why({ type: a.type, card: inst })
    var d = C.get(S.cards[inst])
    $('act-name').textContent = d.name
    $('act-go').textContent = a.label
    $('act-go').disabled = !!reason
    $('act-why').textContent = reason ? (REASON[reason] || '') : hintFor(d)
    bar.classList.add('show')
    document.querySelectorAll('.drop-ok').forEach(function (e) { e.classList.remove('drop-ok') })
    if (!reason) { var z = document.querySelector('#me-field .active-slot'); if (z && a.type !== 'discard') z.classList.add('drop-ok') }
  }
  function hintFor (d) {
    if (d.cat === 'truck') return 'HP ' + d.hp + ' · ' + C.TYPES[d.type].id + ' · kuat melawan ' + d.strongVs + (S.players[S.active].active ? ' · trukmu sekarang kembali ke tumpukan' : '')
    if (d.cat === 'fuel') return 'Serangan butuh bensin. Isi 1 tiap giliran.'
    if (d.cat === 'part') return 'Onderdil tetap terpasang di truk.'
    return 'Kartu aksi dipakai sekali lalu dibuang.'
  }
  function doSelected () {
    if (!SEL || !myTurn()) return
    var a = actionFor(SEL), inst = SEL
    select(null)
    send({ type: a.type, card: inst })
  }
  function atkBar (open) {
    var bar = $('atkbar')
    if (!open || !myTurn() || !S.players[S.active].active) { bar.classList.remove('show'); return }
    select(null)
    var Pl = S.players[S.active], d = C.get(S.cards[Pl.active.inst])
    bar.innerHTML = '<div class="atk-h"><b class="fk">Pilih serangan ' + esc(d.name) + '</b><button type="button" id="atk-x" aria-label="Tutup">✕</button></div>' +
      d.attacks.map(function (a, i) {
        var pv = E.preview(S, i), r = why({ type: 'attack', attack: i })
        var cans = ''; for (var k = 0; k < pv.fuelNeed; k++) cans += '<img src="' + lib('gt/fuel-can') + '" alt="">'
        var tag = pv.type ? '<em class="atk-tag sup">SUPER!</em>' : (pv.weak ? '<em class="atk-tag weak">lemah</em>' : '')
        return '<button type="button" class="atk-b fk' + (r ? ' off' : ' guide') + '" data-atk="' + i + '"><span class="ac">' + (cans || '—') + '</span>' + tag +
          '<span class="an">' + esc(a.name) + '<small>' + (r ? (REASON[r] || '') + (r === 'needFuel' ? ' (butuh ' + pv.fuelNeed + ', punya ' + pv.fuel + ')' : '') : 'Butuh ' + pv.fuelNeed + ' bensin · jawab benar +2') + '</small></span>' +
          '<b class="ad">' + pv.total + '</b></button>'
      }).join('')
    bar.classList.add('show')
    tap('atk-x', function () { atkBar(false) })
  }
  function attackTap (i) {
    if (!myTurn()) return
    var r = why({ type: 'attack', attack: i })
    if (r) { toast(REASON[r] || 'Belum bisa menyerang.', 'warn'); if (r === 'needFuel') FX.pulse($('fuel'), 'nudge'); return }
    select(null); atkBar(false)
    send({ type: 'attack', attack: i })
  }
  function endTap () {
    if (!myTurn()) return
    var canAtk = E.legal(S).some(function (c) { return c.type === 'attack' })
    if (canAtk && !ENDARM) { ENDARM = true; toast('Trukmu masih bisa menyerang! Tekan Selesai sekali lagi kalau mau lewati.', 'warn'); setTimeout(function () { ENDARM = false }, 3500); return }
    ENDARM = false; select(null)
    send({ type: 'endTurn' })
  }
  // drag with light physics: the card follows the finger, tilts with velocity, springs home
  var DRAG = null
  function bindHand () {
    var hand = $('hand')
    hand.addEventListener('pointerdown', function (e) {
      var hc = e.target.closest('.hc'); if (!hc || !myTurn() || DRAG) return
      DRAG = { el: hc, inst: hc.getAttribute('data-inst'), x0: e.clientX, y0: e.clientY, lx: e.clientX, lt: performance.now(), vx: 0, moved: false, id: e.pointerId }
      try { hc.setPointerCapture(e.pointerId) } catch (err) {}
    })
    hand.addEventListener('pointermove', function (e) {
      if (!DRAG || e.pointerId !== DRAG.id) return
      var dx = e.clientX - DRAG.x0, dy = e.clientY - DRAG.y0
      if (!DRAG.moved && Math.hypot(dx, dy) < 12) return
      if (!DRAG.moved) { DRAG.moved = true; DRAG.el.classList.add('dragging'); select(DRAG.inst) }
      var now = performance.now(), dt = Math.max(1, now - DRAG.lt)
      DRAG.vx = DRAG.vx * 0.6 + ((e.clientX - DRAG.lx) / dt) * 0.4; DRAG.lx = e.clientX; DRAG.lt = now
      var rot = Math.max(-18, Math.min(18, DRAG.vx * 14))
      DRAG.el.style.transform = 'translate(calc(-50% + ' + dx + 'px),' + dy + 'px) rotate(' + rot.toFixed(1) + 'deg) scale(1.08)'
      var over = overDrop(e.clientX, e.clientY)
      document.querySelectorAll('.drop-hover').forEach(function (z) { if (z !== over) z.classList.remove('drop-hover') })
      if (over) over.classList.add('drop-hover')
    })
    var up = function (e) {
      if (!DRAG || e.pointerId !== DRAG.id) return
      var d = DRAG; DRAG = null
      document.querySelectorAll('.drop-hover').forEach(function (z) { z.classList.remove('drop-hover') })
      if (!d.moved) { FX.SND.cue('click'); select(SEL === d.inst ? null : d.inst); return }
      var over = overDrop(e.clientX, e.clientY)
      d.el.classList.remove('dragging')
      if (over && over.classList.contains('drop-ok')) { d.el.style.transform = ''; doSelected(); return }
      // spring home (the fan transform comes back through CSS transition)
      d.el.style.transform = ''
      if (over) toast($('act-why').textContent || 'Kartu itu tidak bisa ditaruh di situ.', 'warn')
    }
    hand.addEventListener('pointerup', up); hand.addEventListener('pointercancel', up)
  }
  function overDrop (x, y) {
    var zs = document.querySelectorAll('#me-field [data-drop]')
    for (var i = 0; i < zs.length; i++) { var r = zs[i].getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return zs[i] }
    return null
  }

  /* ── command -> engine -> events -> motion -> render ─────────────────── */
  function rectOf (sel) { var el = document.querySelector(sel); return el ? el.getBoundingClientRect() : null }
  function send (cmd) {
    if (BUSY) return Promise.resolve(false)
    try { var cc = $('coach'); if (cc && cc.innerHTML) cc.className = 'wait' } catch (e) {}
    cmd.id = 'c' + (++CID) + '-' + S.turn; cmd.p = S.active
    var before = S, r
    try { r = E.apply(S, cmd) } catch (err) { toast('Ups, coba lagi ya.', 'warn'); try { console.warn('[gt] apply failed', err) } catch (e) {} return Promise.resolve(false) }
    if (!r.ok) { toast(REASON[r.reason] || 'Belum bisa.', 'warn'); return Promise.resolve(false) }
    BUSY = true
    // watchdog: motion is decoration — if it ever stalls, the state still moves on
    var settled = false
    var dog = r.events.some(function (e) { return e.t === 'challenge' }) ? 0 : setTimeout(function () {
      if (settled) return; settled = true; try { console.warn('[gt] motion watchdog') } catch (e) {}
      S = r.state; BUSY = false; render(); persist(); next(r.events)
    }, 9000)
    return playEvents(before, r).then(function () {
      if (settled) return; settled = true; clearTimeout(dog); BUSY = false; persist(); return next(r.events)
    }).catch(function (e) { if (settled) return; settled = true; clearTimeout(dog); BUSY = false; S = r.state; render(); try { console.warn('[gt] playEvents', e) } catch (x) {} return next(r.events) })
  }
  function persist () { P.battle = S.phase === 'over' ? null : { S: S, M: M }; save() }
  function playEvents (before, r) {
    var ev = r.events, froms = {}, meSide = view() === before.active
    // where cards come FROM (before the DOM changes)
    ev.forEach(function (e) {
      if (e.card && (e.t === 'playTruck' || e.t === 'fuel' || e.t === 'part' || e.t === 'action')) {
        froms[e.card] = meSide ? rectOf('#hand .hc[data-inst="' + e.card + '"]') : rectOf('#op-hand')
      }
    })
    var chain = Promise.resolve()
    var att = ev.filter(function (e) { return e.t === 'attack' })[0]
    if (att) chain = chain.then(function () { return playAttack(before, att, ev) })
    var ch = ev.filter(function (e) { return e.t === 'challenge' })[0]
    return chain.then(function () {
      S = r.state
      if (ch) return challenge(ch)
      render()
      return flyAll(ev, froms, before)
    })
  }
  function flyAll (ev, froms, before) {
    var jobs = []
    ev.forEach(function (e) {
      if (e.t === 'autoFuel' && e.p === view() && human(e.p)) { var fb = $('fuel'); FX.pulse(fb, 'nudge'); FX.SND.fuel(); if (fb) { var fc = FX.center(fb); FX.floatText(fc.x, fc.y - 20, '+1 bensin', 'heal') } }
      if (e.t === 'playTruck' && e.swap) toast('Truk diganti!', 'good')
      if (e.t === 'playTruck') {
        var el = document.querySelector('.field-card[data-inst="' + e.card + '"]')
        jobs.push(FX.flyIn(el, froms[e.card]))
        if (e.to === 'active' && el) setTimeout(function () { var c = FX.center(el); if (window.VFX) VFX.dom(c.x, c.y + c.h * 0.35, { fx: 'smoke', size: c.w * 1.1 }) }, 380)
      }
      if (e.t === 'fuel' && e.card) {
        var cans = e.p === view() ? $('fuel') : document.querySelector('#op-field .opcans')
        if (cans) { jobs.push(FX.flyIn(cans, froms[e.card], { ms: 380 })); FX.pulse(cans, 'nudge') }
        FX.SND.fuel()
      }
      if (e.t === 'part') {
        var pel = document.querySelector('.field-card[data-inst="' + S.players[e.p].active.inst + '"]')
        FX.SND.part(); FX.pulse(pel, 'upgrade')
        if (pel && window.VFX) { var pc = FX.center(pel); VFX.dom(pc.x, pc.y, { fx: 'sparks', size: pc.w, blend: 'screen' }) }
        toast(C.get(S.cards[e.card]).name + ' terpasang!', 'good')
      }
      if (e.t === 'heal') { var hel = document.querySelector('.field-card[data-inst="' + S.players[e.p].active.inst + '"]'); if (hel) { var hc = FX.center(hel); if (window.VFX) VFX.dom(hc.x, hc.y, { fx: 'regen', size: hc.w * 1.2, blend: 'screen' }); FX.floatText(hc.x, hc.y, '+' + e.amount + ' HP', 'heal') } }
      if (e.t === 'action' && e.effect === 'boost') toast('Serangan berikutnya +2!', 'good')
      if (e.t === 'action' && e.effect === 'nitro') toast('Nitro bertambah!', 'good')
      if (e.t === 'switch') toast('Truk ditukar dengan cadangan.', 'good')
      if (e.t === 'koReward' && human(e.p)) toast('Hadiah KO: +1 kartu!', 'good')
      if (e.t === 'promote') toast(C.get(S.cards[e.card]).name + ' maju ke arena!', '')
      if (e.t === 'reshuffle') toast('Tumpukan dikocok ulang.', '')
    })
    var drew = ev.filter(function (e) { return e.t === 'draw' && e.p === view() })
    return Promise.all(jobs).then(function () {
      var ts = ev.filter(function (e) { return e.t === 'turnStart' })[0]
      if (!ts) return
      return banner(ts).then(function () {
        drew.forEach(function (e) { var el = document.querySelector('#hand .hc[data-inst="' + e.card + '"]'); FX.flyIn(el, rectOf('#deck'), { rot: 12, ms: 460 }) })
      })
    })
  }
  function banner (ts) {
    var el = $('banner'), mine = human(ts.p)
    el.innerHTML = '<span class="fk">' + (M.mode === 'pvp' ? 'Giliran ' + esc(S.players[ts.p].name) : (ts.p === 0 ? 'Giliranmu!' : 'Giliran Lawan')) + '</span>' +
      (M.mode === 'pvp' ? '<small>Berikan tabletnya ke ' + esc(S.players[ts.p].name) + '</small>' : '')
    el.className = 'banner show' + (mine ? ' me' : ' op')
    if (mine) FX.SND.go()
    return FX.wait(M.mode === 'pvp' ? 1300 : 850).then(function () { el.className = 'banner' })
  }
  function playAttack (before, att, ev) {
    var from = document.querySelector('.field-card[data-inst="' + att.card + '"] .gc')
    var toCard = document.querySelector('.field-card[data-inst="' + att.target + '"]')
    var to = toCard && toCard.querySelector('.gc')
    if (!from || !to) return Promise.resolve()
    if (att.correct) M.correct[att.p]++
    var d = C.get(before.cards[att.card])
    var hpEl = to.querySelector('.gc-hp b'), bar = to.querySelector('.gc-hpbar i'), max = before.players[1 - att.p].active.maxHp
    return FX.attack({ from: from, to: to, type: d.type, dmg: att.dmg, correct: att.correct, sup: !!(att.breakdown && att.breakdown.type), weak: !!(att.breakdown && att.breakdown.weak), hpBefore: att.hpBefore, hpAfter: att.hpAfter, stage: $('bt-scene'),
      setHp: function (v) {
        if (hpEl) hpEl.textContent = v
        if (!bar) { var w = to.querySelector('.gc-win'); if (w) { w.insertAdjacentHTML('beforeend', '<div class="gc-hpbar"><i></i></div>'); bar = w.querySelector('.gc-hpbar i') } }
        if (bar) bar.style.transform = 'scaleX(' + Math.max(0, v / max) + ')'
        to.querySelector('.gc-hp').classList.toggle('low', v < max / 3)
      } }).then(function () {
      var ko = ev.filter(function (e) { return e.t === 'ko' })[0]
      if (!ko) return
      M.lost[ko.p]++
      return FX.ko(toCard).then(function () {
        FX.floatText(innerWidth / 2, innerHeight * 0.42, 'KO!', 'ko')
        return FX.wait(500)
      })
    })
  }

  /* ── Boost challenge (one Easy question per attack) ─────────────────── */
  var QR = null, lastQ = null
  function qrng () { if (!QR) QR = Q.rng(M.qseed + S.turn * 131); return QR }
  function challenge (ch) {
    var pi = ch.p, Pl = S.players[pi], d = C.get(S.cards[Pl.active.inst]), atk = d.attacks[ch.attack], pv = ch.preview
    var q = lastQ = Q.make(qrng(), P.level, lastQ)
    var parts = ['Serangan ' + pv.base]
    if (pv.parts) parts.push('onderdil +' + pv.parts)
    if (pv.type) parts.push('SUPER vs tipe +' + pv.type)
    if (pv.weak) parts.push('lemah vs tipe −' + pv.weak)
    if (pv.arena) parts.push('arena ' + (pv.arena > 0 ? '+' : '') + pv.arena)
    if (pv.boost) parts.push('boost +' + pv.boost)
    if (pv.nitro) parts.push('NITRO +' + pv.nitro)
    if (pv.armor) parts.push('baja lawan −' + pv.armor)
    var ov = $('chal')
    ov.innerHTML = '<div class="chal-card">' +
      '<div class="chal-h"><img src="' + lib('gt/q-math') + '" alt=""><b class="fk">TANTANGAN MATEMATIKA!</b><span>' + (human(pi) ? 'Soal penambah serangan' : esc(Pl.name) + ' menjawab…') + '</span></div>' +
      '<div class="chal-body"><div class="chal-l">' +
        '<div class="chal-atk"><img src="' + lib(d.sprite) + '" alt=""><span>' + esc(atk.name) + '</span></div>' +
        '<div class="chal-q fk">' + q.text + '</div>' +
        '<div class="chal-ch">' + q.choices.map(function (v) { return '<button class="chal-b fk" type="button" data-v="' + v + '"' + (human(pi) ? '' : ' disabled') + '>' + v + '</button>' }).join('') + '</div>' +
        '<div class="chal-sum">' + (parts.length > 1 ? parts.join(' · ') + ' = ' + pv.total : 'Serangan ' + pv.total) + '</div></div>' +
      '<div class="chal-r"><div><span>Kalau benar:</span><b><i class="y">✓</i>' + (pv.total + 2) + ' kerusakan</b></div>' +
        '<div><span>Kalau salah:</span><b><i class="n">✕</i>' + pv.total + ' kerusakan</b></div></div></div>' +
      '<div class="chal-fb" id="chal-fb"></div></div>'
    ov.className = 'chal show'
    return new Promise(function (res) {
      function answer (v, btn) {
        var ok = v === q.answer
        ov.querySelectorAll('.chal-b').forEach(function (b) { b.disabled = true; if (+b.getAttribute('data-v') === q.answer) b.classList.add('ok') })
        if (!ok && btn) btn.classList.add('no')
        $('chal-fb').innerHTML = ok ? 'Benar! <b>+2 kerusakan</b> dan Nitro bertambah.' : 'Hampir! Jawabannya <b>' + q.answer + '</b>. Serangan tetap jalan.'
        $('chal-fb').className = 'chal-fb ' + (ok ? 'ok' : 'no')
        FX.SND.cue(ok ? 'correct' : 'wrong')
        setTimeout(function () {
          ov.className = 'chal'
          BUSY = false
          send({ type: 'answer', correct: ok }).then(res, res)
        }, ok ? 900 : 1500)
      }
      if (human(pi)) {
        ov.querySelector('.chal-ch').addEventListener('click', function (e) { var b = e.target.closest('.chal-b'); if (b && !b.disabled) answer(+b.getAttribute('data-v'), b) })
      } else {
        // the computer "thinks", then picks — right with its skill's chance
        var ok = E.ai(S, M.ai).correct
        var pick = ok ? q.answer : q.choices.filter(function (v) { return v !== q.answer })[0]
        setTimeout(function () { var b = ov.querySelector('.chal-b[data-v="' + pick + '"]'); if (b) b.classList.add('pick'); answer(pick, b) }, 1300)
      }
    })
  }

  /* ── what happens after a command ─────────────────────────────────────── */
  function next (events) {
    if (S.phase === 'over') return endMatch()
    if (S.phase === 'challenge') return
    var turned = events.some(function (e) { return e.t === 'turnStart' })
    if (turned) return afterTurnStart(false)
    guide()
  }
  function afterTurnStart (first) {
    if (S.phase === 'over') return endMatch()
    if (S.phase === 'challenge') { var pend = S.pending; return challenge({ p: S.active, attack: pend.attack, preview: E.preview(S, pend.attack) }) }
    if (!human(S.active)) return aiTurn()
    guide()
  }
  function aiTurn () {
    if (AI_RUN) return
    AI_RUN = true
    var turn = S.turn, steps = 0
    function step () {
      if (S.phase === 'over') { AI_RUN = false; return endMatch() }
      if (S.active !== 1 || S.turn !== turn || steps++ > 24) {
        AI_RUN = false
        if (S.active === 1 && S.phase === 'garage') return send({ type: 'endTurn' })
        return
      }
      if (S.phase === 'challenge') return                // the challenge overlay answers for the AI
      var c = E.ai(S, M.ai)
      FX.wait(steps === 1 ? 700 : 650).then(function () {
        return send(c)
      }).then(function () { if (S.active === 1 && S.phase !== 'over') step(); else AI_RUN = false })
    }
    step()
  }

  /* ── end of match: Monster Rush, then the final score ─────────────────── */
  function endMatch () {
    if (M.ended) return
    M.ended = true
    P.battle = null; save()
    var w = S.winner
    var el = $('banner')
    el.innerHTML = '<span class="fk">' + (S.draw ? 'Seri!' : esc(S.players[w].name) + ' menang!') + '</span><small>Tunggu… ada yang datang!</small>'
    el.className = 'banner show big'
    if (w === 0 || M.mode === 'pvp') FX.SND.cue('levelup')
    FX.wait(1800).then(function () {
      el.className = 'banner'
      // the monster lands ON the arena (owner: "muncul di tengah besar … mengacaukan"): the battle
      // screen stays visible underneath; data-scr says rush for the gates
      document.body.setAttribute('data-scr', 'scr-rush')
      $('atkbar').classList.remove('show'); $('actbar').classList.remove('show')
      $('rush-host').classList.add('on')
      Q.rush({ host: $('rush-host'), scene: $('bt-scene'), table: $('table'), trucks: [document.querySelector('#me-field .field-card'), document.querySelector('#op-field .field-card')], monster: { key: M.mon[0], name: M.mon[1] }, level: P.level, seed: M.qseed ^ 77, lib: lib,
        players: [{ name: S.players[0].name, human: true }, { name: S.players[1].name, human: M.mode === 'pvp' }],
        aiPace: M.ai === 'racer' ? [2600, 0.8] : [3400, 0.65],
        sfx: { right: function () { FX.SND.cue('correct') }, wrong: function () { FX.SND.cue('wrong') }, tick: FX.SND.tick, go: FX.SND.go },
        onDone: function (res) { $('rush-host').classList.remove('on'); $('rush-host').innerHTML = ''; results(res) } })
    })
  }
  function scoreOf (pi, rush) {
    var Pl = S.players[pi], hp = 0
    if (Pl.active) hp += Pl.active.hp
    Pl.bench.forEach(function (t) { hp += t.hp })
    return [
      ['Menang', S.winner === pi ? 100 : 0], ['KO truk lawan', Pl.ko * 40], ['Sisa HP truk', hp * 2],
      ['Jawaban benar saat serang', M.correct[pi] * 5], ['Bonus Monster Rush' + (rush.best && rush.best[pi] >= 3 ? ' (COMBO!)' : ''), Math.min(rush.points ? rush.points[pi] : rush.right[pi] * Q.RUSH_POINTS, 120)]
    ]
  }
  function results (rush) {
    var rows = [scoreOf(0, rush), scoreOf(1, rush)]
    var tot = rows.map(function (r) { return r.reduce(function (n, x) { return n + x[1] }, 0) })
    var stars = 0
    if (M.mode !== 'pvp' && S.winner === 0) stars = 1 + (rush.right[0] >= rush.right[1] && rush.right[0] > 0 ? 1 : 0) + (M.lost[0] === 0 ? 1 : 0)
    var reward = ''
    if (M.mode === 'adv' && S.winner === 0) {
      var i = M.stage
      P.stars[i] = Math.max(P.stars[i] || 0, stars)
      if (P.stage === i && i < STAGES.length) P.stage = i + 1
      var won = stageTrucks(i).filter(function (id) { return !P.got[id] })
      won.forEach(function (id) { P.got[id] = 1 })
      if (won.length) reward = won.map(function (id) { return mini(TR.get(id), { name: 1 }) }).join('')
      try { if (window.saveLevelProgress) saveLevelProgress(GAME_ID, i + 1, stars) } catch (e) {}
    } else if (M.mode !== 'pvp' && S.winner === 0) {
      var pool = TR.ALL.filter(function (t) { return !P.got[t.id] && (t.rarity === 'biasa' || t.rarity === 'langka') })
      if (pool.length) { var t = pool[Math.floor(Math.random() * pool.length)]; P.got[t.id] = 1; reward = mini(t, { name: 1 }) }
    }
    P.best = Math.max(P.best, tot[0]); save()
    var starH = ''; if (M.mode !== 'pvp') for (var k = 0; k < 3; k++) starH += '<i class="' + (k < stars ? 'on' : '') + '" style="--d:' + (k * 180 + 600) + 'ms">★</i>'
    $('res-title').textContent = S.draw ? 'Seri!' : (M.mode === 'pvp' ? S.players[S.winner].name + ' menang!' : (S.winner === 0 ? 'Kamu menang!' : 'Hampir menang!'))
    $('res-sub').textContent = S.winner === 0 || M.mode === 'pvp' ? 'Hitung skor akhir:' : 'Latih lagi trukmu — kamu pasti bisa!'
    $('res-stars').innerHTML = starH
    $('res-table').innerHTML = [0, 1].map(function (pi) {
      return '<div class="res-col' + (S.winner === pi ? ' lead' : '') + '"><div class="res-name fk">' + esc(S.players[pi].name) + '</div>' +
        rows[pi].map(function (x, j) { return '<div class="res-row" style="--d:' + (j * 160) + 'ms"><span>' + x[0] + '</span><b>' + x[1] + '</b></div>' }).join('') +
        '<div class="res-total fk"><span>Total</span><b data-n="' + tot[pi] + '">0</b></div></div>'
    }).join('')
    $('res-reward').innerHTML = reward ? '<div class="res-rw-t fk">Truk baru bergabung ke garasimu!</div><div class="res-rw">' + reward + '</div>' : ''
    $('res-next').classList.toggle('hide', !(M.mode === 'adv' && S.winner === 0 && M.stage + 1 < STAGES.length))
    show('scr-result')
    document.querySelectorAll('#res-table .res-total b').forEach(function (b) { countUp(b, +b.getAttribute('data-n')) })
    if (stars) setTimeout(function () { FX.SND.cue('star') }, 700)
  }
  function countUp (el, n) {
    if (FX.reduced()) { el.textContent = n; return }
    var t0 = performance.now(), dur = 900
    ;(function f (now) { var k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f) })(t0)
  }

  /* ── tutorial (first battle, and from the pause menu) ──────────────────── */
  var TUT = [
    ['gt/trophy', 'Tujuan', 'Buat <b>3 truk lawan KO</b> (HP jadi 0) untuk menang.'],
    ['gt/fuel-can', 'Tiap giliran', '<b>Bensin terisi sendiri</b> +1 tiap giliran. Kartumu kebanyakan <b>truk</b>: ganti ke truk yang <b>KUAT</b> melawan lawan — seranganmu jadi <b>SUPER (+2)</b>! Tiap KO dapat hadiah 1 kartu.'],
    ['gt/q-math', 'Serang!', 'Ketuk <b>trukmu</b>, lalu pilih serangan. Jawab soal matematika — <b>benar = +2 kerusakan</b>. Salah? Serangan tetap jalan.'],
    ['gt/timer', 'Monster Rush', 'Di akhir pertandingan muncul monster! Jawab soal sebanyak-banyaknya dalam <b>15 detik</b> untuk bonus skor.']
  ]
  function tutorial (done) {
    var i = 0, ov = $('tut')
    function draw () {
      var t = TUT[i]
      ov.innerHTML = '<div class="tut-card"><img src="' + lib(t[0]) + '" alt=""><div class="tut-h fk">' + t[1] + '</div><p>' + t[2] + '</p>' +
        '<div class="tut-dots">' + TUT.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>' }).join('') + '</div>' +
        '<button class="btn b-gold fk" type="button" id="tut-next">' + (i < TUT.length - 1 ? 'Lanjut' : 'Ayo main!') + '</button></div>'
      ov.className = 'tut show'
      tap('tut-next', function () { i++; if (i < TUT.length) draw(); else { ov.className = 'tut'; done && done() } })
    }
    draw()
  }

  /* ── collection ─────────────────────────────────────────────────────── */
  var CF = 'ALL'
  function collection () {
    var types = ['ALL'].concat(Object.keys(C.TYPES))
    $('col-filter').innerHTML = types.map(function (t) {
      return '<button type="button" class="chip' + (t === CF ? ' on' : '') + '" data-t="' + t + '">' + (t === 'ALL' ? 'Semua' : '<img src="' + lib(Card.TYPE_ICON[t]) + '" alt="">' + C.TYPES[t].id) + '</button>'
    }).join('')
    var list = TR.ALL.filter(function (t) { return CF === 'ALL' || t.type === CF })
    $('col-n').textContent = Object.keys(P.got).filter(function (k) { return P.got[k] }).length + '/' + TR.ALL.length + ' truk terkumpul'
    $('col-list').innerHTML = list.map(function (t) { return mini(t, { name: 1, locked: !P.got[t.id] }) }).join('')
    show('scr-col')
  }
  function zoom (id) {
    var d = TR.get(id), ov = $('zoom')
    ov.innerHTML = '<div class="zoom-card">' + Card.truck(d) + '</div><p class="zoom-d">' + esc(d.desc || '') + '</p><button class="btn b-soft fk" type="button" id="zoom-x">Tutup</button>'
    ov.className = 'zoom show'
    var card = ov.querySelector('.gc'), tx = 0, ty = 0, cx = 0, cy = 0, raf = 0
    // tilt physics: pointer sets a target, the card springs toward it (and settles back)
    function tick () { cx += (tx - cx) * 0.14; cy += (ty - cy) * 0.14; Card.tilt(card, cx, cy); if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002) raf = requestAnimationFrame(tick); else raf = 0 }
    function aim (e) { if (FX.reduced()) return; var r = card.getBoundingClientRect(); tx = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1)); ty = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1)); if (!raf) raf = requestAnimationFrame(tick) }
    ov.onpointermove = aim; ov.onpointerdown = aim
    ov.onpointerleave = function () { tx = ty = 0; if (!raf) raf = requestAnimationFrame(tick) }
    tap('zoom-x', function () { ov.className = 'zoom'; ov.innerHTML = '' })
  }

  /* ── pause menu ─────────────────────────────────────────────────────── */
  function pause () { if (BUSY && S && S.phase !== 'challenge') return; $('pause').className = 'pause show'; $('snd-t').textContent = P.sound ? 'Suara: Nyala' : 'Suara: Mati' }
  function setSound (on) {
    P.sound = !!on; FX.mute(!P.sound); save()
    ;['btn-sound', 'p-sound'].forEach(function (id) { var b = $(id); if (!b) return; b.classList.toggle('off', !P.sound); b.setAttribute('aria-pressed', P.sound ? 'true' : 'false'); b.setAttribute('aria-label', P.sound ? 'Suara: nyala' : 'Suara: mati') })
    $('snd-t').textContent = P.sound ? 'Suara: Nyala' : 'Suara: Mati'
  }
  function unpause () { $('pause').className = 'pause' }

  /* ── wiring ─────────────────────────────────────────────────────────── */
  function wire () {
    tap('btn-map', function () { location.href = '../index.html' })
    tap('btn-adv', adventure)
    tap('btn-practice', function () { MODE = { kind: 'free' }; PICK.teams = [null, null]; teamPicker(0) })
    tap('btn-pvp', function () { MODE = { kind: 'pvp' }; PICK.teams = [null, null]; teamPicker(0) })
    tap('btn-col', collection)
    var resume = function () { if (!P.battle) return; S = P.battle.S; M = P.battle.M; M.ended = false; openBattle() }
    tap('side-resume', resume)
    tap('side-mis', adventure); tap('btn-league', adventure); tap('nav-battle', function () { MODE = { kind: 'free' }; PICK.teams = [null, null]; teamPicker(0) })
    tap('btn-garage', function () { MODE = null; customPicker() }); tap('nav-garage', function () { MODE = null; customPicker() })
    tap('nav-cards', collection); tap('nav-home', home)
    tap('btn-learn', function () { tutorial(null) })
    tap('btn-feat', function () { zoom($('btn-feat').getAttribute('data-id')) })
    tap('lvl-mudah', function () { P.level = 'mudah'; save(); home() })
    tap('lvl-sedang', function () { P.level = 'sedang'; save(); home() })
    tap('btn-sound', function () { setSound(!P.sound) })
    document.querySelectorAll('[data-back]').forEach(function (b) { tap(b, function () { var t = b.getAttribute('data-back'); if (t === 'map') adventure(); else if (t === 'team' && MODE) teamPicker(PICK.seat); else home() }) })
    $('map-list').addEventListener('click', function (e) { var b = e.target.closest('.stage'); if (!b) return; FX.SND.cue('click'); var i = +b.getAttribute('data-i'); if (i > P.stage) return toast('Menangkan arena ' + i + ' dulu untuk membuka arena ini.', 'warn'); stageIntro(i) })
    tap('si-go', function () { PICK.teams = [null, null]; teamPicker(0) })
    $('team-list').addEventListener('click', function (e) {
      var b = e.target.closest('.team'); if (!b) return; FX.SND.cue('click')
      var k = b.getAttribute('data-k')
      if (k === 'custom') { if ((P.team || []).length === 3 && !e.target.closest('.mini') && PICK.seat === 0 && b.classList.contains('team-custom') && P.team) return chooseTeam(P.team.slice()); return customPicker() }
      if (PICK.seat === 0) { P.starter = k; save() }
      chooseTeam(C.STARTERS[k].trucks.slice())
    })
    tap('team-edit', customPicker)
    $('custom-list').addEventListener('click', function (e) {
      var m = e.target.closest('.mini'); if (!m) return; FX.SND.cue('click')
      var id = m.getAttribute('data-id'), at = CUSTOM.indexOf(id)
      if (at >= 0) CUSTOM.splice(at, 1); else if (CUSTOM.length < 3) CUSTOM.push(id); else toast('Timmu sudah 3 truk. Ketuk salah satu untuk melepasnya.', 'warn')
      renderCustom()
    })
    tap('custom-ok', function () { P.team = CUSTOM.slice(); save(); if (!MODE) { toast('Tim Saya tersimpan!', 'good'); return home() } chooseTeam(P.team.slice()) })
    $('col-filter').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) { CF = b.getAttribute('data-t'); collection() } })
    $('col-list').addEventListener('click', function (e) { var m = e.target.closest('.mini'); if (!m) return; if (m.classList.contains('locked')) return toast('Menangkan pertandingan untuk menemukan truk ini!', 'warn'); zoom(m.getAttribute('data-id')) })
    bindHand()
    tap('act-go', doSelected)
    tap('act-x', function () { select(null) })
    tap('btn-end', endTap)
    $('me-field').addEventListener('click', function (e) {
      var z = e.target.closest('[data-drop]'); if (z && SEL && z.classList.contains('drop-ok')) return doSelected()
      if (e.target.closest('.field-card')) { FX.SND.cue('click'); atkBar(true) }
    })
    $('atkbar').addEventListener('click', function (e) { var b = e.target.closest('.atk-b'); if (!b) return; FX.SND.cue('click'); attackTap(+b.getAttribute('data-atk')) })
    tap('btn-pause', pause)
    tap('p-resume', unpause)
    tap('p-help', function () { unpause(); tutorial(null) })
    tap('p-sound', function () { setSound(!P.sound) })
    tap('p-quit', function () { unpause(); $('chal').className = 'chal'; $('atkbar').classList.remove('show'); $('actbar').classList.remove('show'); P.battle = S && S.phase !== 'over' ? { S: S, M: M } : null; save(); S = null; home() })
    tap('res-again', function () { if (M.mode === 'adv') stageIntro(M.stage); else { MODE = { kind: M.mode }; PICK.teams = [null, null]; teamPicker(0) } })
    tap('res-next', function () { stageIntro(M.stage + 1) })
    tap('res-home', home)
    addEventListener('resize', function () { if (S && document.body.getAttribute('data-scr') === 'scr-battle') { layoutHand(); FX.setArena($('bt-scene'), M.bg, lib) } })
    setSound(P.sound)
  }

  /* ── offline warm-up (same approach as G27/G28) ──────────────────────── */
  var warmed = false
  function warmList () {
    var u = {}
    function add (x) { if (x) u[x] = 1 }
    STAGES.forEach(function (s) { add(lib('gt-arena/' + s.arena + '-land')); add(lib('gt-arena/' + s.arena + '-port')); add(lib(s.mon[0])) })
    RUSH_MONSTERS.forEach(function (m) { add(lib(m[0])) })
    TR.ALL.forEach(function (t) { add(lib(t.sprite)) })
    ;['type-power', 'type-speed', 'type-mud', 'type-stunt', 'type-armor', 'type-tech', 'fuel-can', 'card-back', 'part-tire', 'part-bumper', 'part-engine', 'part-nitro', 'repair-kit', 'deck', 'winch', 'q-math',
      'trophy', 'timer', 'direction-sign', 'lock', 'avatar-player', 'avatar-opponent', 'end-turn', 'garage', 'map', 'mission-list', 'star-collectible',
      'attack', 'checkered-flag', 'lightning', 'play-confirm', 'q-knowledge', 'repair', 'start-flag', 'tool-kit'].forEach(function (k) { add(lib('gt/' + k)) })
    ;['click', 'correct', 'wrong', 'levelup', 'star'].forEach(function (k) { add(lib.base + 'assets/sfx/' + k + '.mp3') })
    var fx = { boom: 10, pop: 7, smoke: 8 }
    Object.keys(fx).forEach(function (k) { for (var i = 1; i <= fx[k]; i++) add(lib.base + 'assets/vfx/explosion/' + k + '/f-' + i + '.webp') })
    return Object.keys(u)
  }
  lib.base = (function () { try { return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/' } catch (e) { return '/' } })()
  function warm () {
    if (warmed || window.__GT_NO_WARM || !navigator.onLine || !('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
    warmed = true
    var list = warmList(), i = 0
    function nx () { if (i >= list.length) return; fetch(list[i++], { cache: 'no-cache' }).catch(function () {}).then(function () { setTimeout(nx, 30) }) }
    for (var k = 0; k < 3; k++) nx()
  }
  if ('serviceWorker' in navigator) {
    var go = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 1500) })(function () { try { warm() } catch (e) {} }, { timeout: 4000 }) }
    navigator.serviceWorker.ready.then(go).catch(function () {})
    navigator.serviceWorker.addEventListener('controllerchange', go)
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden && S && S.phase !== 'over' && M) { P.battle = { S: S, M: M }; save() } })

  wire()
  home()

  /* test seam — the QA gates drive real screens through this */
  window.__gt = {
    state: function () { return S ? { phase: S.phase, active: S.active, turn: S.turn, winner: S.winner, hand: S.players[view()].hand.length, busy: BUSY, screen: document.body.getAttribute('data-scr'), coach: ($('coach').getAttribute('data-step') || ''), ko: [S.players[0].ko, S.players[1].ko] } : { screen: document.body.getAttribute('data-scr') } },
    engine: function () { return S },
    start: function (kind, stage, teams) { MODE = { kind: kind, stage: stage || 0 }; PICK.teams = teams || [C.STARTERS.api.trucks.slice(), C.STARTERS.baja.trucks.slice()]; startBattle(); return 'ok' },
    legal: function () { return S ? E.legal(S) : [] },
    send: function (c) { return send(c) },
    busy: function () { return BUSY || AI_RUN },
    save: function () { return JSON.parse(JSON.stringify(P)) },
    reset: function () { P = fill({}); save(); return 'ok' },
    setTut: function (v) { P.tut = !!v; save() },
    warmList: warmList, warmed: function () { return warmed },
    stages: STAGES, stageTrucks: stageTrucks
  }
})()
