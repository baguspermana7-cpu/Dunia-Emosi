/* DuniaRhythm — PRD-21 (docs/prd/PRD-21-ritme-sesi.md): the parent sets how long a play session lasts (15, 20 or
 * 30 minutes, or off; default off). Past that limit nothing is cut short: when the level being played ends
 * (DuniaBus 'level:end'), a card says what the child learnt today (LearningLog, today only), then a rest screen
 * covers the app. Only the parent gate (DuniaParentGate) opens it again; a new day opens it by itself.
 * Storage (device-wide, like the other parent settings):
 *   'dunia-session-limit'  '0' | '15' | '20' | '30'   (minutes; missing = '0' = off)
 *   'dunia-session'        { start, last }             the session clock, only written while a limit is set; a gap
 *                                                      of 30 minutes without a level starts a new session
 *   'dunia-rest'           'YYYY-MM-DD'                the rest screen is up for that day
 * With the limit off this module writes nothing and shows nothing.
 *   DuniaRhythm.limit() / setLimit(min) / attach() / mountSetting(host)
 */
;(function (W, D) {
  'use strict'
  if (W.DuniaRhythm) return
  var LIMIT = 'dunia-session-limit', SESS = 'dunia-session', REST = 'dunia-rest', GAP = 30 * 60000
  var me = D.currentScript && D.currentScript.src || ''
  var ROOT = me ? me.replace(/games\/data\/session-rhythm\.js.*$/, '') : ''
  function now () { return Date.now() }
  function day (t) { var d = new Date(t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) }
  function get (k) { try { return localStorage.getItem(k) } catch (e) { return null } }
  function set (k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch (e) {} }
  function limit () { var m = parseInt(get(LIMIT) || '0', 10); return [15, 20, 30].indexOf(m) >= 0 ? m : 0 }
  function sess () { try { return JSON.parse(get(SESS) || 'null') } catch (e) { return null } }

  function onStart () {
    if (!limit()) return
    var s = sess(), t = now()
    if (!s || t - s.last > GAP || day(s.start) !== day(t)) s = { start: t, last: t }
    s.last = t; set(SESS, JSON.stringify(s))
  }
  function onEnd () {
    var m = limit(); if (!m) return
    var s = sess(), t = now(); if (!s) return
    s.last = t; set(SESS, JSON.stringify(s))
    if (t - s.start >= m * 60000) setTimeout(card, 600)   // after the game's own end-of-level screen has drawn
  }

  function css () {
    if (D.getElementById('rh-style')) return
    var st = D.createElement('style'); st.id = 'rh-style'
    st.textContent = '.rh-back{position:fixed;inset:0;z-index:1900;display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit}' +
      '#rh-card{background:rgba(15,23,42,.55)}' +
      '#rh-card .rh-box{background:#fffdf7;border-radius:24px;width:min(420px,100%);max-height:calc(100dvh - 32px);overflow:auto;padding:18px;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,.3)}' +
      '#rh-card img{width:96px;height:96px;object-fit:contain}' +
      '#rh-card h2{margin:6px 0 10px;font-size:22px;color:#1f2937}' +
      '#rh-card ul{list-style:none;margin:0 0 14px;padding:0;display:flex;flex-direction:column;gap:6px}' +
      '#rh-card li{background:#ecfccb;color:#365314;border-radius:12px;padding:10px 12px;font-weight:800;font-size:17px}' +
      '.rh-go{min-height:56px;width:100%;border:0;border-radius:16px;background:#65a30d;color:#fff;font:inherit;font-size:19px;font-weight:900;cursor:pointer}' +
      '#rh-rest{background:linear-gradient(180deg,#1e1b4b,#312e81 55%,#3730a3);color:#eef2ff;flex-direction:column;gap:14px;text-align:center}' +
      '#rh-rest h2{margin:0;font-size:30px}#rh-rest p{margin:0;font-size:18px;color:#c7d2fe}' +
      '#rh-rest .rh-parent{position:absolute;bottom:max(16px,env(safe-area-inset-bottom));right:16px;min-height:48px;padding:0 16px;border:1px solid rgba(199,210,254,.5);border-radius:14px;background:transparent;color:#c7d2fe;font:inherit;font-size:15px;font-weight:700;cursor:pointer}'
    D.head.appendChild(st)
  }
  function learnt () {
    var L = W.LearningLog; if (!L || !L.summary) return []
    var seen = {}, out = []
    L.summary({ days: 1 }).forEach(function (r) { var l = L.label ? L.label(r.skill, r.domain) : r.skill; if (!seen[l] && l !== 'Lainnya') { seen[l] = 1; out.push(l) } })
    return out.slice(0, 3)
  }
  function esc (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function card () {
    if (D.getElementById('rh-card') || D.getElementById('rh-rest')) return
    css()
    var items = learnt()
    var m = D.createElement('div'); m.id = 'rh-card'; m.className = 'rh-back'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true')
    m.innerHTML = '<div class="rh-box"><img src="' + ROOT + 'assets/leo-celebrating.webp" alt=""><h2>Hari ini kamu belajar</h2>' +
      (items.length ? '<ul>' + items.map(function (l) { return '<li>' + esc(l) + '</li>' }).join('') + '</ul>' : '<ul><li>Bermain dan mencoba</li></ul>') +
      '<button type="button" class="rh-go">Istirahat dulu</button></div>'
    D.body.appendChild(m)
    m.querySelector('.rh-go').onclick = function () { m.remove(); set(REST, day(now())); rest() }
  }
  function rest () {
    if (D.getElementById('rh-rest')) return
    css()
    var r = D.createElement('div'); r.id = 'rh-rest'; r.className = 'rh-back'; r.setAttribute('role', 'dialog'); r.setAttribute('aria-modal', 'true'); r.setAttribute('aria-label', 'Waktunya istirahat')
    r.innerHTML = '<svg viewBox="0 0 120 120" width="140" height="140" aria-hidden="true"><path d="M78 18a44 44 0 1 0 24 64A36 36 0 0 1 78 18z" fill="#fde68a"/>' +
      '<circle cx="28" cy="26" r="3" fill="#fef3c7"/><circle cx="100" cy="30" r="2.5" fill="#fef3c7"/><circle cx="20" cy="84" r="2" fill="#fef3c7"/></svg>' +
      '<h2>Waktunya istirahat</h2><p>Main lagi nanti, ya.</p><button type="button" class="rh-parent">Orang tua</button>'
    D.body.appendChild(r)
    var stop = function (e) { if (e.target.closest && e.target.closest('.rh-parent')) return; e.stopPropagation() }
    r.addEventListener('click', stop, true)
    r.querySelector('.rh-parent').onclick = function () {
      if (!W.DuniaParentGate) return
      W.DuniaParentGate.open(function () { set(REST, null); set(SESS, JSON.stringify({ start: now(), last: now() })); r.remove() }, { onFail: function () {} })
    }
  }
  function checkRest () {
    var d = get(REST); if (!d) return
    if (d !== day(now())) { set(REST, null); return }   // a new day opens the app again
    rest()
  }

  var attached = false
  function attach () {
    if (attached || !W.DuniaBus) return
    attached = true
    W.DuniaBus.on('level:start', onStart); W.DuniaBus.on('level:end', onEnd)
  }
  function setLimit (m) {
    m = [15, 20, 30].indexOf(+m) >= 0 ? +m : 0
    if (m) set(LIMIT, String(m)); else { set(LIMIT, null); set(SESS, null) }
    return m
  }
  // the parent's setting, drawn into a host (the hub Dasbor, behind the parent gate)
  function mountSetting (host) {
    if (!host || host.querySelector('.rh-set')) return
    var box = D.createElement('div'); box.className = 'rh-set'
    box.innerHTML = '<h3 class="dash-section-title">Waktu main</h3><div class="rh-opts" role="radiogroup" aria-label="Waktu main">' +
      [0, 15, 20, 30].map(function (m) { return '<button type="button" role="radio" data-m="' + m + '">' + (m ? m + ' menit' : 'Mati') + '</button>' }).join('') + '</div>' +
      '<p class="rh-note">Lewat batas, level yang sedang dimainkan tetap selesai. Lalu layar istirahat.</p>'
    var paint = function () { var cur = limit(); box.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-checked', +b.dataset.m === cur ? 'true' : 'false') }) }
    box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-m]'); if (b) { setLimit(b.dataset.m); paint() } })
    host.appendChild(box); paint()
  }

  W.DuniaRhythm = { limit: limit, setLimit: setLimit, attach: attach, mountSetting: mountSetting, card: card, rest: rest }
  attach()
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', checkRest); else checkRest()
})(window, document)
