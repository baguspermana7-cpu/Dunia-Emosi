/* RewardBook — PRD-22 (docs/prd/PRD-22-satu-buku-koleksi-lintas.md): one collection book per child, across games.
 * Every game that gives a reward puts it on DuniaBus as 'reward' { id, kind, src, title? }:
 *   hub achievements (game.js checkAchievement, src 'hub'), the train obstacles (obstacle-engine.js, src 'obstacle'),
 *   Timmy's compass badges (timmy-kapal.js, src 'timmy').
 * The book keeps them per child (avatar-scoped 'dunia-avatar-<slug>-reward-book'), oldest first, one entry per
 * src + id. The sticker / badge / horn lists the four train pages kept before ('train-stickers', 'train-badges',
 * 'train-horn-unlocks', one set for the whole device) move once into the book of the child playing at the time.
 * Pictures come from the shared badge sprite pack (assets/db/badge); no emoji, no new art.
 *   RewardBook.open()      the book, as a modal over the page
 *   RewardBook.list()      the entries of the child playing now
 *   RewardBook.attach()    subscribe to DuniaBus (called again by save-engine when it loads the bus late; idempotent)
 */
;(function (W, D) {
  'use strict'
  if (W.RewardBook) return
  var KEY = 'dunia-reward-book', MIGRATED = 'dunia-reward-book-migrated'
  var SRC = { hub: 'Permainan', obstacle: 'Kereta', timmy: 'Timmy Kapal' }
  var HUB_ICON = { first_star: 'star1', ten_stars: 'star2', fifty_stars: 'trophy', hundred_stars: 'crown-jewel', letter_master: 'medal',
    count_master: 'medal-silver', driver_master: 'rank-gold', picture_master: 'rank-silver', word_master: 'medal-gold2', trace_master: 'rosette',
    all_games: 'crown', streak3: 'winner', hard_mode: 'juara' }

  function read () {
    try { var raw = W.avatarScopedGet ? W.avatarScopedGet(KEY) : localStorage.getItem(KEY); var a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a : [] } catch (e) { return [] }
  }
  function write (a) {
    try { var s = JSON.stringify(a); if (W.avatarScopedSet) W.avatarScopedSet(KEY, s); else localStorage.setItem(KEY, s) } catch (e) {}
  }
  function catalogTitle (kind, id) {
    var C = W.RewardCatalog; if (!C) return ''
    var list = kind === 'sticker' ? C.stickers : kind === 'badge' ? C.badges : kind === 'horn' ? C.hornUnlocks : null
    var hit = (list || []).filter(function (x) { return x.id === id })[0]
    return hit ? hit.name : ''
  }
  function pretty (id) { return String(id).replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase() }) }
  function add (p) {
    if (!p || p.id == null) return false
    var src = String(p.src || 'hub'), id = String(p.id), a = read()
    if (a.some(function (e) { return e.src === src && e.id === id })) return false
    a.push({ id: id, kind: String(p.kind || 'badge'), src: src, title: String(p.title || catalogTitle(p.kind, id) || pretty(id)).slice(0, 60), t: Date.now() })
    write(a)
    return true
  }
  function migrate () {
    try {
      if (localStorage.getItem(MIGRATED) || !(W._activeAvatarSlug && W._activeAvatarSlug())) return
      ;[['train-stickers', 'sticker'], ['train-badges', 'badge'], ['train-horn-unlocks', 'horn']].forEach(function (k) {
        var l = []; try { l = JSON.parse(localStorage.getItem(k[0]) || '[]') } catch (e) {}
        ;(Array.isArray(l) ? l : []).forEach(function (id) { add({ id: id, kind: k[1], src: 'obstacle' }) })
      })
      localStorage.setItem(MIGRATED, '1')
    } catch (e) {}
  }
  function list () { migrate(); return read() }

  var attached = false
  function attach () {
    if (attached || !W.DuniaBus) return
    attached = true
    W.DuniaBus.on('reward', function (ev) { migrate(); add(ev) })
  }

  function icon (e) {
    var name = e.src === 'hub' ? (HUB_ICON[e.id] || 'medal') : e.src === 'timmy' ? 'first'
      : e.kind === 'sticker' ? 'sparkle' : e.kind === 'horn' ? 'rank-bronze' : /_route_complete$/.test(e.id) ? 'trophy-silver' : 'medal-bronze'
    var src = W.UISprites ? W.UISprites.path('badge', name) : ''
    return src ? '<img src="' + src + '" alt="" decoding="async">' : '<span class="rb-dot"></span>'
  }
  function esc (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }

  function css () {
    if (D.getElementById('rb-style')) return
    var st = D.createElement('style'); st.id = 'rb-style'
    st.textContent = '#rb-book{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.55);padding:12px;font-family:inherit}' +
      '#rb-book .rb-card{background:#fffdf7;border-radius:22px;width:min(560px,100%);max-height:calc(100dvh - 24px);display:flex;flex-direction:column;box-shadow:0 14px 40px rgba(0,0,0,.3);overflow:hidden}' +
      '#rb-book .rb-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;background:#fde68a;color:#78350f}' +
      '#rb-book .rb-head h2{margin:0;font-size:20px;font-weight:900}' +
      '#rb-book .rb-count{font-size:13px;font-weight:700}' +
      '#rb-book .rb-close{width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:#78350f;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none}' +
      '#rb-book .rb-body{overflow:auto;padding:10px 14px 16px}' +
      '#rb-book h3{margin:12px 0 6px;font-size:14px;color:#57534e;font-weight:800}' +
      '#rb-book .rb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}' +
      '#rb-book .rb-item{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 6px;border-radius:14px;background:#fff;border:1px solid #e7e5e4;text-align:center}' +
      '#rb-book .rb-item img{width:52px;height:52px;object-fit:contain}' +
      '#rb-book .rb-item b{font-size:12px;line-height:1.2;color:#1f2937}' +
      '#rb-book .rb-dot{width:52px;height:52px;border-radius:50%;background:#fcd34d}' +
      '#rb-book .rb-empty{padding:24px 8px;text-align:center;color:#57534e;font-weight:700}'
    D.head.appendChild(st)
  }
  function close () { var m = D.getElementById('rb-book'); if (m) m.remove(); D.removeEventListener('keydown', onKey) }
  function onKey (e) { if (e.key === 'Escape') close() }
  function open () {
    close(); css()
    var a = list(), groups = {}
    a.forEach(function (e) { (groups[e.src] = groups[e.src] || []).push(e) })
    var body = a.length ? Object.keys(groups).map(function (s) {
      return '<h3>' + esc(SRC[s] || pretty(s)) + '</h3><div class="rb-grid">' + groups[s].map(function (e) {
        return '<div class="rb-item" data-src="' + esc(e.src) + '" data-id="' + esc(e.id) + '">' + icon(e) + '<b>' + esc(e.title) + '</b></div>'
      }).join('') + '</div>'
    }).join('') : '<p class="rb-empty">Belum ada hadiah. Main dulu, ya!</p>'
    var m = D.createElement('div'); m.id = 'rb-book'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Buku Koleksi')
    m.innerHTML = '<div class="rb-card"><div class="rb-head"><div><h2>Buku Koleksi</h2><span class="rb-count">' + a.length + ' hadiah</span></div>' +
      '<button type="button" class="rb-close" aria-label="Tutup"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button></div>' +
      '<div class="rb-body">' + body + '</div></div>'
    m.addEventListener('click', function (e) { if (e.target === m || (e.target.closest && e.target.closest('.rb-close'))) close() })
    D.body.appendChild(m); D.addEventListener('keydown', onKey)
    var c = m.querySelector('.rb-close'); if (c) c.focus()
  }

  // the beranda of the hub (index.html): a book button beside the mute button
  var BOOK = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" fill="currentColor"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="#fde68a"/></svg>'
  function mount () {
    var menu = D.getElementById('screen-menu'); if (!menu || menu.querySelector('.menu-book')) return
    var bar = menu.querySelector(':scope > div[style*="justify-content:flex-end"]'); if (!bar) return
    var b = D.createElement('button'); b.type = 'button'; b.className = 'menu-book'; b.setAttribute('aria-label', 'Buku Koleksi'); b.innerHTML = BOOK
    b.addEventListener('click', function (e) { e.stopPropagation(); open() })
    bar.insertBefore(b, bar.firstChild)
  }

  W.RewardBook = { open: open, close: close, list: list, add: add, attach: attach }
  attach()
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', mount); else mount()
})(window, document)
