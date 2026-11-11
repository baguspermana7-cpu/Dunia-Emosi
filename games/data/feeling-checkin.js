/**
 * DuniaFeeling — "Hari ini kamu merasa apa?" once a day per child, when the map opens. Five big faces, no wrong
 * answer, no stars, a skip button always there. The pick is named back by voice ("Kamu sedih. Tidak apa-apa merasa
 * sedih."), stored per child for the parent dashboard and sent on DuniaBus as 'feeling'.
 *
 *   DuniaFeeling.maybeAsk()   shows the card if this child has not answered today (called from showScreen)
 *   DuniaFeeling.ask()        shows it now
 *   DuniaFeeling.week()       -> { senang: n, sedih: n, ... } over the last 7 days for the active child
 *   DuniaFeeling.FEELINGS     the five, with their picture and spoken line
 *
 * Stored avatar-scoped (save-engine) as 'dunia-feelings' = { days: { 'YYYY-MM-DD': 'sedih' } }, 60 days kept.
 * An automated browser (navigator.webdriver) is not asked unless the page URL carries ?feel=1, so the gates that
 * drive the map are not blocked by a card; tools/qa-feeling-checkin.mjs uses ?feel=1.
 * Mechanic A of docs/SPEC-EMOSI-REPLACEMENT-2026-11-11.md (owner: "kamu putuskan yang terbaik", 2026-11-11).
 */
(function () {
  'use strict'
  var W = window
  if (W.DuniaFeeling) return
  var KEY = 'dunia-feelings', KEEP = 60
  var SELF = (document.currentScript && document.currentScript.src) || ''
  var ASSET = function (p) { return SELF ? new URL('../../assets/db/' + p, SELF).href : '' }
  var FEELINGS = [
    { id: 'senang', name: 'Senang', img: 'faces/001.webp', line: 'Kamu senang! Asyik, ayo bermain.' },
    { id: 'sedih', name: 'Sedih', img: 'faces/003.webp', line: 'Kamu sedih. Tidak apa-apa merasa sedih.' },
    { id: 'marah', name: 'Marah', img: 'faces/005.webp', line: 'Kamu marah. Tarik napas pelan-pelan, ya.' },
    { id: 'takut', name: 'Takut', img: 'faces2/007.webp', line: 'Kamu takut. Kamu aman di sini.' },
    { id: 'capek', name: 'Capek', img: 'faces2/005.webp', line: 'Kamu capek. Boleh istirahat dulu, ya.' }
  ]

  function today (t) {
    var x = t ? new Date(t) : new Date()
    return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2)
  }
  function read () {
    try {
      var raw = W.avatarScopedGet ? W.avatarScopedGet(KEY) : localStorage.getItem(KEY)
      var d = JSON.parse(raw || 'null')
      if (d && d.days && typeof d.days === 'object') return d
    } catch (e) {}
    return { days: {} }
  }
  function write (d) {
    try { var s = JSON.stringify(d); if (W.avatarScopedSet) W.avatarScopedSet(KEY, s); else localStorage.setItem(KEY, s) } catch (e) {}
  }
  function soundOn () { try { return localStorage.getItem('dunia-emosi-sound') !== 'off' } catch (e) { return true } }
  function say (text) {
    try {
      if (!soundOn() || !W.speechSynthesis) return
      var u = new SpeechSynthesisUtterance(text); u.lang = 'id-ID'; u.rate = 0.95
      W.speechSynthesis.cancel(); W.speechSynthesis.speak(u)
    } catch (e) {}
  }
  function hasChild () {
    try { var p = JSON.parse(localStorage.getItem('dunia-players') || '[]'); return Array.isArray(p) && p.length > 0 } catch (e) { return false }
  }
  function forced () { return /[?&]feel=1\b/.test(location.search) }

  function store (id) {
    var d = read(), cut = today(Date.now() - KEEP * 864e5)
    d.days[today()] = id
    Object.keys(d.days).forEach(function (k) { if (k < cut) delete d.days[k] })
    write(d)
  }

  function css () {
    if (document.getElementById('dfeel-css')) return
    var s = document.createElement('style'); s.id = 'dfeel-css'
    s.textContent = [
      '#dfeel{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(12,10,26,.78);font-family:inherit}',
      '#dfeel .dfeel-card{position:relative;width:100%;max-width:640px;background:#FFF8E7;border:3px solid #FFD6A0;border-radius:28px;box-shadow:0 10px 0 #D4956A;padding:22px 16px 18px;text-align:center;color:#3A2B12}',
      '#dfeel h2{margin:0 0 14px;padding:0 52px;font-size:22px;font-weight:900;line-height:1.25}',   // clear of the 48 px skip button on both sides
      '#dfeel .dfeel-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}',
      '#dfeel .dfeel-face{width:104px;min-height:120px;border:0;border-radius:22px;background:#fff;box-shadow:0 4px 0 #E8C99A;cursor:pointer;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:4px;font:inherit;font-size:15px;font-weight:900;color:#3A2B12}',
      '#dfeel .dfeel-face img{width:76px;height:76px;object-fit:contain}',
      '#dfeel .dfeel-face:active{transform:translateY(3px);box-shadow:0 1px 0 #E8C99A}',
      '#dfeel .dfeel-skip{position:absolute;top:10px;right:10px;width:48px;height:48px;border:0;border-radius:50%;background:#F1E4C8;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '#dfeel .dfeel-big{width:150px;height:150px;object-fit:contain;display:block;margin:0 auto 8px}',
      '#dfeel .dfeel-line{font-size:18px;font-weight:800;margin:0 0 16px}',
      '#dfeel .dfeel-go{min-height:56px;padding:0 32px;border:0;border-radius:18px;background:#FFD968;box-shadow:0 5px 0 #D4A017;font:inherit;font-size:18px;font-weight:900;color:#3A2B12;cursor:pointer}',
      '@media (max-width:420px){#dfeel h2{font-size:20px}#dfeel .dfeel-face{width:88px}#dfeel .dfeel-face img{width:64px;height:64px}}'
    ].join('\n')
    document.head.appendChild(s)
  }

  function close () { var o = document.getElementById('dfeel'); if (o) o.remove() }

  function answered (f) {
    store(f.id)
    if (W.DuniaBus) W.DuniaBus.emit('feeling', { feeling: f.id })
    var card = document.querySelector('#dfeel .dfeel-card'); if (!card) return
    card.innerHTML = ''
    var img = document.createElement('img'); img.className = 'dfeel-big'; img.alt = ''; img.src = ASSET(f.img)
    var p = document.createElement('p'); p.className = 'dfeel-line'; p.textContent = f.line
    var go = document.createElement('button'); go.className = 'dfeel-go'; go.textContent = 'Ayo main'
    go.addEventListener('click', close)
    card.appendChild(img); card.appendChild(p); card.appendChild(go)
    say(f.line)
  }

  function ask () {
    if (document.getElementById('dfeel')) return
    css()
    var o = document.createElement('div'); o.id = 'dfeel'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Hari ini kamu merasa apa?')
    var card = document.createElement('div'); card.className = 'dfeel-card'
    var skip = document.createElement('button'); skip.className = 'dfeel-skip'; skip.setAttribute('aria-label', 'Lewati')
    skip.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="#3A2B12" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
    skip.addEventListener('click', function () { store('lewat'); close() })
    var h = document.createElement('h2'); h.textContent = 'Hari ini kamu merasa apa?'
    var row = document.createElement('div'); row.className = 'dfeel-row'
    FEELINGS.forEach(function (f) {
      var b = document.createElement('button'); b.className = 'dfeel-face'; b.dataset.feel = f.id; b.setAttribute('aria-label', f.name)
      var img = document.createElement('img'); img.alt = ''; img.src = ASSET(f.img)
      var t = document.createElement('span'); t.textContent = f.name
      b.appendChild(img); b.appendChild(t)
      b.addEventListener('click', function () { answered(f) })
      row.appendChild(b)
    })
    card.appendChild(skip); card.appendChild(h); card.appendChild(row)
    o.appendChild(card); document.body.appendChild(o)
    say('Hari ini kamu merasa apa?')
  }

  function maybeAsk () {
    try {
      if (!hasChild()) return false
      if (navigator.webdriver && !forced()) return false
      if (read().days[today()]) return false
      ask(); return true
    } catch (e) { return false }
  }

  function week () {
    var d = read().days, out = {}, cut = today(Date.now() - 6 * 864e5)
    Object.keys(d).forEach(function (k) { if (k >= cut && d[k] !== 'lewat') out[d[k]] = (out[d[k]] || 0) + 1 })
    return out
  }

  W.DuniaFeeling = { maybeAsk: maybeAsk, ask: ask, week: week, FEELINGS: FEELINGS, KEY: KEY }
})()
