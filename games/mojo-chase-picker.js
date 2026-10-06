/* =============================================================================
 * mojo-chase-picker.js — window.MojoChasePicker: the pre-race "Pilih Mojo" screen of the G31 chase.
 *
 * Owner 2026-10-03: "before the 1, 2, 3 countdown there's an opening screen offering a character change".
 * Flow: stage card -> this picker -> resolve cfg with the chosen form -> the core runs the countdown.
 *
 *   MojoChasePicker.run(cfg, api) -> Promise<cfg'>   registered as MojoChase.hooks.beforeStart (api.host = mount host)
 *       cfg' = a NEW object: cfg + { mojo_form, perk, lastForm }   (the input cfg is never mutated)
 *   MojoChasePicker.FORMS                        the offered forms = MojoChases.FORMS rows (id, name, perk, line, card, rear, kind, unlock)
 *   MojoChasePicker.recommend(stage) -> { rec, alt[] }   "Paling Tepat" + "Bisa Juga" by stage/biome
 *   MojoChasePicker.state()                      QA seam: { open, form, rec }
 *
 * Unlock: UNLOCK maps form -> Balapan stages cleared (>= 1 star); adventure chase beats read the same save,
 * so they offer the same set. The stage's recommended form is always selectable ("Baru!" free trial). Locked
 * forms show as silhouettes ("Selesaikan N tahap lagi"); a tap wiggles and hints. New forms get a celebration card.
 * Save: the chase's per-avatar key 'dunia-g31-chase' ({v:1, st:{..}, form, formsSeen:[..]}); only `form` and the
 * new `formsSeen` field are written and every other field is kept as read. Art: owner sprites only (card + preview = the SIDE art of MojoChases.FORMS: mojo-hero film art or mojo-top; the race uses the row's mojo-rear sprite,
 * stage card/FAR strip as the blurred backdrop). No emoji. Targets >= 72 px (carousel), Mulai >= 64 px.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var KEY = 'dunia-g31-chase', SWOP_MS = 420
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}

  // the offered forms = THE table in data/mojo-chases.js (MojoChases.FORMS): the card and the big preview show the
  // row's SIDE art, the race drives the row's REAR sprite of the same machine (owner 2026-10-04)
  var FALLBACK = [
    { id: 'racer', name: 'Mojo', perk: 'boost', line: 'Boost lebih cepat!', side: 'mojo-top/base', rear: 'base', kind: 'ground', unlock: 0 },
    { id: 'monster', name: 'Monster', perk: 'grip', line: 'Lumpur dan batu tidak masalah!', side: 'mojo-hero/monster-2', rear: 'monster-2', kind: 'ground', unlock: 0 },
    { id: 'jumper', name: 'Pelompat', perk: 'jump', line: 'Lompat melewati lubang, jalan licin, dan rintangan rendah!', side: 'mojo-hero/monster-1', rear: 'monster', kind: 'ground', unlock: 0 },
    { id: 'excavator', name: 'Ekskavator', perk: 'grip', line: 'Lumpur dan batu tidak masalah!', side: 'mojo-hero/dozer-1', rear: 'excavator', kind: 'ground', unlock: 0 }
  ]
  var FORMS = (W.MojoChases && W.MojoChases.FORMS && W.MojoChases.FORMS.length ? W.MojoChases.FORMS : FALLBACK).filter(function (f) { return f.kind !== 'water' })
  // progressive unlock (owner 2026-10-03: "4-6 early, growing until every character is unlocked"): form -> Balapan
  // stages cleared (>= 1 star). The stage's "Paling Tepat" form is always selectable there as a free trial ("Baru!").
  var UNLOCK = {}; FORMS.forEach(function (f) { UNLOCK[f.id] = f.unlock || 0 })
  var ALT0 = { racer: ['delivery', 'jet'], monster: ['jumper', 'excavator'], jumper: ['monster', 'racer'], 'snow-plow': ['monster', 'tow'],
    dozer: ['excavator', 'crane'], rescue: ['fire', 'racer'], fire: ['rescue', 'crane'], cargo: ['delivery', 'tow'], chopper: ['plane', 'jet'],
    tow: ['cargo', 'monster'], wrecking: ['excavator', 'dump'], boat: ['racer', 'jumper'], dump: ['cargo', 'excavator'], crane: ['dozer', 'cargo'], delivery: ['cargo', 'racer'], excavator: ['monster', 'cargo'], plane: ['chopper', 'jet'], jet: ['plane', 'chopper'] }
  var ALT = {}; FORMS.forEach(function (f) { ALT[f.id] = (ALT0[f.id] || []).filter(function (a) { return UNLOCK.hasOwnProperty(a) }) })

  var LOCK_SVG = '<svg viewBox="0 0 40 44" aria-hidden="true"><path d="M11 19 V13 a9 9 0 0 1 18 0 V19" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><rect x="5" y="18" width="30" height="23" rx="6" fill="#ffcf33" stroke="#7a4220" stroke-width="3"/><circle cx="20" cy="29" r="3.5" fill="#7a4220"/></svg>'
  function lib (k) { return (W.AssetIndex && W.AssetIndex.path(k)) || ('../assets/db/lib/' + k + '.webp') }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function esc (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  // the film hero crop when the owner drew one (data/mojo-art.js), else the listed art
  function cardArt (f) { return f.side }
  function byId (id) { for (var i = 0; i < FORMS.length; i++) if (FORMS[i].id === id) return FORMS[i]; return null }
  function assign (a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o }

  /* recommended form: the stage config wins, else derived from the biome look */
  function recommend (stage) {
    stage = stage || {}
    var look = String(stage.look || stage.biome || ''), rec = stage.recForm && byId(stage.recForm) ? stage.recForm : null
    if (!rec) {
      // no snow-plow (no matching side/rear pair): snow and rough ground both get the grippy Monster
      if (/space|sky|air|cloud/.test(look)) rec = 'jet'
      else if (/snow|forest|farm|jungle|autumn|ruins|windfarm|mud|desert|canyon|volcano/.test(look) || stage.sky === 'snow' || stage.weather === 'leaves') rec = 'monster'
      else if (/harbour/.test(look)) rec = 'cargo'
      else if (/construction/.test(look)) rec = 'excavator'
      else rec = 'racer'
    }
    return { rec: rec, alt: (ALT[rec] || []).slice() }
  }

  /* per-avatar save (same key and reader rules as mojo-chase-menu.js; only `form` is touched) */
  function readSave () {
    var raw = null, o = null
    try { raw = W.avatarScopedGet ? W.avatarScopedGet(KEY, null) : W.localStorage.getItem(KEY) } catch (e) { raw = null }
    try { o = raw ? JSON.parse(raw) : null } catch (e) { o = null }
    return o && typeof o === 'object' ? o : { v: 1, st: {} }
  }
  function saveForm (id) { return writeSave({ form: id }) }

  function cleared (sv) {
    var st = sv && sv.st && typeof sv.st === 'object' ? sv.st : {}, n = 0
    for (var k in st) if (st[k] && +st[k].stars >= 1) n++
    return n
  }
  /* which forms a child may pick on this stage: unlocked by cleared stages, plus the stage's pick as a trial */
  function available (sv, stage) {
    var n = cleared(sv), rec = recommend(stage).rec, unlocked = [], selectable = [], need = {}
    FORMS.forEach(function (f) {
      var req = UNLOCK[f.id] || 0
      if (n >= req) unlocked.push(f.id); else need[f.id] = req - n
      if (n >= req || f.id === rec) selectable.push(f.id)
    })
    return { cleared: n, unlocked: unlocked, selectable: selectable, need: need, trial: unlocked.indexOf(rec) < 0 ? rec : null }
  }
  // forms unlocked since the last picker: seen list is a NEW save field (`formsSeen`); the first run seeds it silently
  function newlyUnlocked (sv, av) {
    if (!sv || !Array.isArray(sv.formsSeen)) return []
    return av.unlocked.filter(function (id) { return sv.formsSeen.indexOf(id) < 0 })
  }
  function writeSave (patch) {
    var next = assign(readSave(), patch)
    if (!next.v) next.v = 1
    if (!next.st) next.st = {}
    try { var j = JSON.stringify(next); if (W.avatarScopedSet) W.avatarScopedSet(KEY, j); else W.localStorage.setItem(KEY, j); return true } catch (e) { console.warn('[Mojo picker] save failed', e); return false }
  }

  function soundOn (cfg) { try { return typeof cfg.sound === 'function' ? cfg.sound() !== false : true } catch (e) { return true } }
  function cue (cfg, k) { if (!soundOn(cfg)) return; try { if (W.SFXEngine && W.SFXEngine.cue) W.SFXEngine.cue(k) } catch (e) {} }

  /* the big preview: the SIDE art of the form (owner: "only the game itself uses the rear view"), wheels on the
     start line, idle bounce + ground shadow; data-side = the art shown, data-rear = the race sprite of the same machine */
  function rearKey (id) { var RA = W.MojoRearAnchors, f = byId(id); return (f && f.rear) || (RA && RA.forms[id]) || 'base' }
  // the turnaround forms show their front 3/4 DIAGONAL view here (row field `preview`); data-card = the card art
  function previewArt (f) { return f.preview || cardArt(f) }
  function paintRear (box, id) {
    var f = byId(id), side = f ? previewArt(f) : 'mojo-top/base', img = box.querySelector('img.side')
    img.src = lib(side); box.setAttribute('data-side', side); box.setAttribute('data-card', f ? cardArt(f) : side); box.setAttribute('data-rear', rearKey(id))
  }

  var cur = null   // the open picker (one at a time)

  function run (cfg, api) {
    cfg = cfg || {}
    var CH = W.MojoChases, stage = (CH && CH.stage && CH.stage(cfg.stage)) || (CH && CH.STAGES && CH.STAGES[0]) || {}
    var R = recommend(stage), sv = readSave(), saved = sv.form, AV = available(sv, stage), fresh = newlyUnlocked(sv, AV)
    var ok = function (id) { return !!id && !!byId(id) && AV.selectable.indexOf(id) >= 0 }
    var start = cfg.picked && ok(cfg.mojo_form) ? cfg.mojo_form : ok(saved) ? saved : R.rec
    writeSave({ formsSeen: AV.unlocked.slice() })
    var host = (api && api.host) || D.getElementById('chase-host') || D.body
    if (W.MojoChaseQuiz && W.MojoChaseQuiz.reset) try { W.MojoChaseQuiz.reset({ stage: stage.id }) } catch (e) {}

    return new Promise(function (resolve) {
      var formId = start, lock = false, closed = false
      var bgKey = stage.cardKey ? 'mojo-chase/' + stage.cardKey : stage.cfar ? 'mojo-chase/cfar/' + stage.cfar : 'mojo-chase/far/' + (stage.far || 'swoppiton')
      // the board never reads "Ngarai Batu Merah / Ngarai Batu Merah": a title equal to the place becomes the mission line
      var title0 = cfg.title || stage.title || 'Kejar Pencuri!', place = stage.place || ''
      var head = place && title0.trim().toLowerCase() === place.trim().toLowerCase() ? 'Kejar Pencuri!' : title0
      if (head === place) place = ''
      var root = el('div', 'mcp' + (RM ? ' rm' : ''))
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Pilih wujud Mojo')
      var cards = FORMS.map(function (f) {
        var locked = AV.selectable.indexOf(f.id) < 0
        if (locked) {
          return '<button type="button" class="mcp-card lock" data-form="' + f.id + '" aria-disabled="true" aria-label="' + esc(f.name) + ' terkunci">' +
            '<img alt="" draggable="false" data-key="' + esc(cardArt(f)) + '" src="' + lib(cardArt(f)) + '"><i class="padlock">' + LOCK_SVG + '</i><b>Selesaikan ' + AV.need[f.id] + ' tahap lagi</b></button>'
        }
        var badge = f.id === AV.trial ? '<em class="new">Baru!</em>' : f.id === R.rec ? '<em class="gold">Paling Tepat</em>' : R.alt.indexOf(f.id) >= 0 ? '<em class="alt">Bisa Juga</em>' : ''
        return '<button type="button" class="mcp-card" data-form="' + f.id + '" aria-label="' + esc(f.name) + '">' + badge +
          '<img alt="" draggable="false" data-key="' + esc(cardArt(f)) + '" src="' + lib(cardArt(f)) + '"><b>' + esc(f.name) + '</b></button>'
      }).join('')
      root.innerHTML =
        '<div class="mcp-bg" style="background-image:url(' + lib(bgKey) + ')"></div><div class="mcp-shade"></div>' +
        '<header class="mcp-head"><div class="mcp-plank"><b>' + esc(head) + '</b>' + (place ? '<span>' + esc(place) + '</span>' : '') + '</div></header>' +
        '<div class="mcp-main">' +
          '<div class="mcp-stage"><div class="mcp-line"></div><div class="mcp-portal"></div>' +
            '<div class="mcp-rear"><div class="bob"><img class="side" alt="" draggable="false"></div><i class="shadow"></i></div></div>' +
          '<div class="mcp-side">' +
            '<div class="mcp-info"><p class="mcp-ask">Pilih wujud Mojo!</p><h2 class="mcp-name"></h2><p class="mcp-perk"></p><span class="mcp-badge"></span></div>' +
            '<div class="mcp-car"><button type="button" class="mcp-nav prev" aria-label="Sebelumnya"><svg viewBox="0 0 40 40"><path d="M26 6 L10 20 L26 34" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
              '<div class="mcp-track">' + cards + '</div>' +
              '<button type="button" class="mcp-nav next" aria-label="Berikutnya"><svg viewBox="0 0 40 40"><path d="M14 6 L30 20 L14 34" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>' +
            '<button type="button" class="mcp-go" id="mcp-go">Mulai!</button>' +
          '</div>' +
        '</div>'
      host.appendChild(root)
      var q = function (s) { return root.querySelector(s) }
      var rearBox = q('.mcp-rear'), track = q('.mcp-track')

      function show (id, animate) {
        var f = byId(id); if (!f || AV.selectable.indexOf(id) < 0) return
        formId = id
        q('.mcp-name').textContent = f.name
        q('.mcp-perk').textContent = f.line
        var b = q('.mcp-badge'), isRec = id === R.rec, isAlt = R.alt.indexOf(id) >= 0
        b.className = 'mcp-badge' + (isRec ? ' gold' : isAlt ? ' alt' : ' none'); b.textContent = isRec ? (id === AV.trial ? 'Paling Tepat - coba gratis' : 'Paling Tepat') : isAlt ? 'Bisa Juga' : ''
        ;[].forEach.call(track.children, function (c) { var on = c.getAttribute('data-form') === id; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false') })
        var card = track.querySelector('[data-form="' + id + '"]')
        if (card) { var cr = card.getBoundingClientRect(), tr = track.getBoundingClientRect(), tl = track.scrollLeft + (cr.left - tr.left) - (tr.width - cr.width) / 2; try { track.scrollTo({ left: tl, behavior: animate && !RM ? 'smooth' : 'auto' }) } catch (e) { track.scrollLeft = tl } }
        if (!animate) { paintRear(rearBox, id); return }
        // the swop: a portal opens, Mojo spins into it, the new form clicks into place
        lock = true; root.classList.add('locked')
        cue(cfg, 'swoosh')
        rearBox.classList.remove('swop-in'); root.classList.remove('portal'); void rearBox.offsetWidth
        root.classList.add('portal'); rearBox.classList.add('swop-out')
        setTimeout(function () {
          if (closed) return
          paintRear(rearBox, id); rearBox.classList.remove('swop-out'); rearBox.classList.add('swop-in')
        }, RM ? 0 : SWOP_MS / 2)
        setTimeout(function () {
          if (closed) return
          cue(cfg, 'click'); rearBox.classList.remove('swop-in'); root.classList.remove('portal', 'locked'); lock = false
        }, RM ? 60 : SWOP_MS)
      }
      function step (d) {
        if (lock) return
        var L = AV.selectable, i = Math.max(0, L.indexOf(formId))
        show(L[(i + d + L.length) % L.length], true)
      }
      track.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.mcp-card'); if (!b || lock) return
        var id = b.getAttribute('data-form')
        if (b.classList.contains('lock')) { wiggle(b, id); return }
        if (id !== formId) show(id, true)
      })
      var hintT = 0
      function wiggle (b, id) {
        b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle')
        var hint = q('.mcp-ask'), f = byId(id)
        hint.textContent = f.name + ': selesaikan ' + AV.need[id] + ' tahap lagi, ya!'; root.classList.add('hinting')
        cue(cfg, 'click'); clearTimeout(hintT)
        hintT = setTimeout(function () { hint.textContent = 'Pilih wujud Mojo!'; root.classList.remove('hinting') }, 1800)
      }
      q('.mcp-nav.prev').addEventListener('click', function () { step(-1) })
      q('.mcp-nav.next').addEventListener('click', function () { step(1) })
      // swipe on the big preview changes the form; the carousel strip scrolls natively
      var sw = null, stg = q('.mcp-stage')
      stg.addEventListener('pointerdown', function (e) { sw = { x: e.clientX, y: e.clientY } })
      stg.addEventListener('pointerup', function (e) {
        if (!sw) return; var dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1)
      })
      stg.addEventListener('pointercancel', function () { sw = null })
      function key (e) {
        if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'Enter') go(); else return
        e.preventDefault(); e.stopPropagation()
      }
      D.addEventListener('keydown', key, true)
      function go () {
        if (closed) return
        closed = true; D.removeEventListener('keydown', key, true)
        cue(cfg, 'click'); saveForm(formId)
        var f = byId(formId)
        cur = null
        root.classList.add('out')
        setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root) }, RM ? 0 : 180)
        if (typeof cfg.onForm === 'function') try { cfg.onForm(formId) } catch (e) {}
        resolve(assign(cfg, { mojo_form: formId, perk: f.perk, perk_text: f.line, lastForm: formId, picked: true }))
      }
      q('.mcp-go').addEventListener('click', go)
      cur = { root: root, get: function () { return formId }, rec: R.rec, go: go, av: AV, fresh: fresh.slice() }
      show(formId, false)
      celebrate(fresh.slice())
      // "Wujud baru terbuka: Jet!" - ONE card for everything that unlocked since the last picker (owner 2026-10-04: 2-3
      // forms open per stage): one form = its big art, several = a row of their side art, each with its name; tap to continue
      function celebrate (list) {
        if (!list.length) return
        var fs = list.map(byId).filter(Boolean); if (!fs.length) return
        var names = fs.map(function (f) { return f.name }), joined = names.length < 2 ? names[0] : names.slice(0, -1).join(', ') + ' dan ' + names[names.length - 1]
        var c = el('div', 'mcp-new'), spk = '<i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i><i class="spark s4"></i>'
        var art = fs.length === 1 ? '<div class="art">' + spk + '<img alt="" draggable="false" src="' + lib(cardArt(fs[0])) + '"></div>'
          : '<div class="art many">' + spk + fs.map(function (f) { return '<figure><img alt="" draggable="false" data-form="' + f.id + '" src="' + lib(cardArt(f)) + '"><figcaption>' + esc(f.name) + '</figcaption></figure>' }).join('') + '</div>'
        c.innerHTML = '<div class="box">' + art + '<h2>Wujud baru terbuka: ' + esc(joined) + '!</h2><p>' + esc(fs.length === 1 ? fs[0].line : 'Coba semuanya di balapan!') + '</p>' +
          '<button type="button" class="mcp-new-ok">Hore!</button></div>'
        root.appendChild(c); cue(cfg, 'levelup')
        c.querySelector('.mcp-new-ok').addEventListener('click', function () { cue(cfg, 'click'); c.remove() })
      }
      if (cfg.say) try { cfg.say('Pilih wujud Mojo, lalu tekan Mulai!') } catch (e) {}
    })
  }

  function state () { return { open: !!cur, form: cur ? cur.get() : null, rec: cur ? cur.rec : null, selectable: cur ? cur.av.selectable.slice() : null, trial: cur ? cur.av.trial : null, fresh: cur ? cur.fresh.slice() : null } }

  W.MojoChasePicker = { run: run, FORMS: FORMS, UNLOCK: UNLOCK, recommend: recommend, available: available, cleared: cleared, state: state, readSave: readSave, version: 2 }

  /* hook registration (core contract: MojoChase.hooks.beforeStart(cfg, api) -> Promise<cfg>) */
  // copy-on-register: the core's exported hooks object may BE its defaults table, and it compares
  // hooks.beforeStart against that default to know a picker ran, so it must never be mutated in place
  if (W.MojoChase) W.MojoChase.hooks = assign(W.MojoChase.hooks || {}, { beforeStart: run })
})(window, document)
