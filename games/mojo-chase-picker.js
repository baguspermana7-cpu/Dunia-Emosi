/* =============================================================================
 * mojo-chase-picker.js — window.MojoChasePicker: the pre-race "Pilih Mojo" screen of the G31 chase.
 *
 * Owner 2026-10-03: "before the 1, 2, 3 countdown there's an opening screen offering a character change".
 * Flow: stage card -> this picker -> resolve cfg with the chosen form -> the core runs the countdown.
 *
 *   MojoChasePicker.run(cfg, api) -> Promise<cfg'>   registered as MojoChase.hooks.beforeStart (api.host = mount host)
 *       cfg' = a NEW object: cfg + { mojo_form, perk, lastForm }   (the input cfg is never mutated)
 *   MojoChasePicker.FORMS                        the offered forms (id, name, perk id, perk line, art)
 *   MojoChasePicker.recommend(stage) -> { rec, alt[] }   "Paling Tepat" + "Bisa Juga" by stage/biome
 *   MojoChasePicker.state()                      QA seam: { open, form, rec }
 *
 * Unlock: UNLOCK maps form -> Balapan stages cleared (>= 1 star); adventure chase beats read the same save,
 * so they offer the same set. The stage's recommended form is always selectable ("Baru!" free trial). Locked
 * forms show as silhouettes ("Selesaikan N tahap lagi"); a tap wiggles and hints. New forms get a celebration card.
 * Save: the chase's per-avatar key 'dunia-g31-chase' ({v:1, st:{..}, form, formsSeen:[..]}); only `form` and the
 * new `formsSeen` field are written and every other field is kept as read. Art: owner sprites only (mojo-hero film art, mojo-rear in-race art,
 * stage card/FAR strip as the blurred backdrop). No emoji. Targets >= 72 px (carousel), Mulai >= 64 px.
 * ==========================================================================*/
(function (W, D) {
  'use strict'
  var KEY = 'dunia-g31-chase', SWOP_MS = 420
  var RM = false; try { RM = W.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) {}

  // the offered forms: film art where the owner drew one, the workshop top view otherwise
  var FORMS = [
    { id: 'racer', name: 'Pembalap', perk: 'boost', line: 'Boost lebih cepat!', art: 'mojo-hero/racer' },
    { id: 'monster', name: 'Monster', perk: 'grip', line: 'Lumpur dan batu tidak masalah!', art: 'mojo-hero/monster-2' },
    { id: 'jumper', name: 'Pelompat', perk: 'jump', line: 'Lompat melewati lubang dan batu!', art: 'mojo-hero/monster-1' },
    { id: 'snow-plow', name: 'Bajak Salju', perk: 'snow', line: 'Kuat dan cepat di jalan salju!', art: 'mojo-top/snow-plow' },
    { id: 'dozer', name: 'Dozer', perk: 'recover', line: 'Cepat pulih setelah BROK!', art: 'mojo-hero/dozer-2' },
    { id: 'rescue', name: 'Penyelamat', perk: 'heal', line: 'Semangat cepat terisi lagi!', art: 'mojo-hero/rescue' },
    { id: 'boat', name: 'Perahu', perk: 'splash', line: 'Jago di jalan basah dan air!', art: 'mojo-hero/boat' },
    { id: 'chopper', name: 'Helikopter', perk: 'fly', line: 'Terbang melewati rintangan!', art: 'mojo-hero/chopper-3' },
    { id: 'jet', name: 'Jet', perk: 'boost', line: 'Melesat sangat cepat!', art: 'mojo-hero/jet-4' }
  ]
  // progressive unlock (owner 2026-10-03: "4-6 early, growing until every character is unlocked"):
  // form -> number of Balapan stages cleared (>= 1 star) before it can be picked. 4 at stage 1, 6 by stage 4,
  // all 9 by stage 16 of 25. The stage's "Paling Tepat" form is always selectable there as a free trial ("Baru!").
  var UNLOCK = { racer: 0, monster: 0, dozer: 0, jumper: 0, rescue: 2, 'snow-plow': 3, chopper: 6, boat: 10, jet: 15 }
  var ALT = { racer: ['jet', 'rescue'], monster: ['jumper', 'dozer'], jumper: ['monster', 'racer'], 'snow-plow': ['monster', 'dozer'],
    dozer: ['monster', 'snow-plow'], rescue: ['racer', 'monster'], boat: ['racer', 'rescue'], chopper: ['jet', 'racer'], jet: ['chopper', 'racer'] }

  var LOCK_SVG = '<svg viewBox="0 0 40 44" aria-hidden="true"><path d="M11 19 V13 a9 9 0 0 1 18 0 V19" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><rect x="5" y="18" width="30" height="23" rx="6" fill="#ffcf33" stroke="#7a4220" stroke-width="3"/><circle cx="20" cy="29" r="3.5" fill="#7a4220"/></svg>'
  function lib (k) { return (W.AssetIndex && W.AssetIndex.path(k)) || ('../assets/db/lib/' + k + '.webp') }
  function el (tag, cls, html) { var e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
  function esc (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  // the film hero crop when the owner drew one (data/mojo-art.js), else the listed art
  function cardArt (f) { try { var k = W.MojoArt && W.MojoArt.heroKey && W.MojoArt.heroKey(f.id); if (k) return k } catch (e) {} return f.art }
  function byId (id) { for (var i = 0; i < FORMS.length; i++) if (FORMS[i].id === id) return FORMS[i]; return null }
  function assign (a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o }

  /* recommended form: the stage config wins, else derived from the biome look */
  function recommend (stage) {
    stage = stage || {}
    var look = String(stage.look || stage.biome || ''), rec = stage.recForm && byId(stage.recForm) ? stage.recForm : null
    if (!rec) {
      if (look === 'snow' || stage.sky === 'snow') rec = 'snow-plow'
      else if (/space|sky|air|cloud/.test(look)) rec = 'jet'
      else if (/beach|lake|river|water|sea/.test(look)) rec = 'boat'
      else if (/forest|farm|jungle|autumn|ruins|windfarm|mud|desert|canyon|volcano/.test(look) || stage.weather === 'leaves') rec = 'monster'
      else if (/construction|harbour/.test(look)) rec = 'dozer'
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

  /* rear preview: the in-race sprite with its own anchors (tail lights, exhaust) */
  function rearInfo (id) {
    var RA = W.MojoRearAnchors, key = (RA && RA.forms[id]) || 'base'
    var a = RA && RA.sprites[key], sz = (RA && RA.size) || { w: 281, h: 241 }
    return { key: key, src: lib('mojo-rear/' + key), a: a, w: sz.w, h: sz.h }
  }
  function pct (v, of) { return (100 * v / of).toFixed(2) + '%' }
  function paintRear (box, id) {
    var r = rearInfo(id), img = box.querySelector('img.rear'), fx = box.querySelector('.fx')
    img.src = r.src; box.setAttribute('data-rear', r.key)
    var h = ''
    if (r.a) {
      ;(r.a.lights || []).forEach(function (p) { h += '<i class="lamp" style="left:' + pct(p[0], r.w) + ';top:' + pct(p[1], r.h) + '"></i>' })
      if (r.a.kind !== 'air') (r.a.exhaust || []).forEach(function (p, n) {
        for (var k = 0; k < 3; k++) h += '<i class="puff" style="left:' + pct(p[0], r.w) + ';top:' + pct(p[1], r.h) + ';animation-delay:' + (k * 0.38 + n * 0.17).toFixed(2) + 's"></i>'
      })
    }
    fx.innerHTML = h
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
      var root = el('div', 'mcp' + (RM ? ' rm' : ''))
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Pilih wujud Mojo')
      var cards = FORMS.map(function (f) {
        var locked = AV.selectable.indexOf(f.id) < 0
        if (locked) {
          return '<button type="button" class="mcp-card lock" data-form="' + f.id + '" aria-disabled="true" aria-label="' + esc(f.name) + ' terkunci">' +
            '<img alt="" draggable="false" src="' + lib(cardArt(f)) + '"><i class="padlock">' + LOCK_SVG + '</i><b>Selesaikan ' + AV.need[f.id] + ' tahap lagi</b></button>'
        }
        var badge = f.id === AV.trial ? '<em class="new">Baru!</em>' : f.id === R.rec ? '<em class="gold">Paling Tepat</em>' : R.alt.indexOf(f.id) >= 0 ? '<em class="alt">Bisa Juga</em>' : ''
        return '<button type="button" class="mcp-card" data-form="' + f.id + '" aria-label="' + esc(f.name) + '">' + badge +
          '<img alt="" draggable="false" src="' + lib(cardArt(f)) + '"><b>' + esc(f.name) + '</b></button>'
      }).join('')
      root.innerHTML =
        '<div class="mcp-bg" style="background-image:url(' + lib(bgKey) + ')"></div><div class="mcp-shade"></div>' +
        '<header class="mcp-head"><div class="mcp-plank"><b>' + esc(cfg.title || stage.title || 'Kejar Pencuri!') + '</b><span>' + esc(stage.place || '') + '</span></div></header>' +
        '<div class="mcp-main">' +
          '<div class="mcp-stage"><div class="mcp-line"></div><div class="mcp-portal"></div>' +
            '<div class="mcp-rear"><div class="bob"><img class="rear" alt="" draggable="false"><div class="fx"></div></div><i class="shadow"></i></div></div>' +
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
      // "Wujud baru terbuka: Jet!" one card per new form, film art + sparkle; tap to continue
      function celebrate (list) {
        if (!list.length) return
        var f = byId(list[0]), c = el('div', 'mcp-new')
        c.innerHTML = '<div class="box"><div class="art"><i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i><i class="spark s4"></i>' +
          '<img alt="" draggable="false" src="' + lib(cardArt(f)) + '"></div><h2>Wujud baru terbuka: ' + esc(f.name) + '!</h2><p>' + esc(f.line) + '</p>' +
          '<button type="button" class="mcp-new-ok">Hore!</button></div>'
        root.appendChild(c); cue(cfg, 'levelup')
        c.querySelector('.mcp-new-ok').addEventListener('click', function () { cue(cfg, 'click'); c.remove(); celebrate(list.slice(1)) })
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
