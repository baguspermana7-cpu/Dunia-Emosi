/* DuniaParentGate — PRD-49: grown-up pages (Dasbor, "Waktu main", "Unduh semua") sit behind a small gate a young
 * child cannot pass by tapping around:
 *   1. hold a button for 2 s, then let go (letting go early starts over; the gate opens on the lift)
 *   2. a two-digit sum, written and read aloud ("23 + 14"), three answers
 * Right answer -> onPass(). Wrong answer or "Batal" -> the gate closes and onFail() runs (default: back to the
 * beranda). No emoji; every target >= 56 px; white on slate text.
 *   DuniaParentGate.open(onPass, { onFail, title })
 * The gate is a convenience lock for children, not security: anything here is in the page for a grown-up to read.
 */
;(function (W) {
  'use strict'
  var D = W.document, HOLD_MS = 2000, el = null
  function css () {
    if (D.getElementById('pg-css')) return
    var s = D.createElement('style'); s.id = 'pg-css'
    s.textContent = [
      '.pg-back{position:fixed;inset:0;z-index:2000;background:rgba(15,23,42,.82);display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))}',
      '.pg-card{width:min(420px,100%);max-height:100%;overflow:auto;background:#1e293b;color:#f8fafc;border-radius:20px;padding:20px 18px;box-shadow:0 18px 40px rgba(0,0,0,.45);font-family:inherit;text-align:center}',
      '.pg-card h2{margin:0 0 6px;font-size:22px;line-height:1.2}',
      '.pg-card p{margin:0 0 14px;font-size:16px;line-height:1.35;color:#e2e8f0}',
      '.pg-hold{position:relative;width:100%;min-height:64px;border:0;border-radius:16px;background:#334155;color:#f8fafc;font:inherit;font-size:19px;font-weight:800;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}',
      '.pg-hold i{position:absolute;inset:0;width:0;background:#0ea5e9;transition:none}',
      '.pg-hold span{position:relative}',
      '.pg-q{font-size:34px;font-weight:900;letter-spacing:1px;margin:4px 0 14px}',
      '.pg-ch{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}',
      '.pg-ch button{min-height:64px;border:0;border-radius:16px;background:#f59e0b;color:#111827;font:inherit;font-size:26px;font-weight:900}',
      '.pg-x{margin-top:14px;min-height:56px;width:100%;border:2px solid #94a3b8;border-radius:14px;background:transparent;color:#f8fafc;font:inherit;font-size:17px;font-weight:700}'
    ].join('\n')
    D.head.appendChild(s)
  }
  function close () { if (el) { el.remove(); el = null } try { if (W.DuniaSpeak) DuniaSpeak.cancel() } catch (_) {} }
  function home () { try { if (typeof W.showScreen === 'function') W.showScreen('screen-welcome') } catch (_) {} }
  function open (onPass, opts) {
    opts = opts || {}
    close(); css()
    var fail = function () { close(); (opts.onFail || home)() }
    el = D.createElement('div'); el.className = 'pg-back'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Gerbang orang tua')
    el.innerHTML = '<div class="pg-card"><h2>Untuk orang tua</h2><p>' + (opts.title || 'Tahan tombol ini 2 detik.') + '</p>' +
      '<button type="button" class="pg-hold" id="pg-hold"><i></i><span>Tahan di sini</span></button>' +
      '<button type="button" class="pg-x" id="pg-cancel">Batal</button></div>'
    D.body.appendChild(el)
    var hold = el.querySelector('#pg-hold'), bar = hold.querySelector('i'), label = hold.querySelector('span'), t0 = 0, raf = 0
    var stop = function () { t0 = 0; cancelAnimationFrame(raf); bar.style.width = '0'; label.textContent = 'Tahan di sini' }
    var tick = function () {
      if (!t0) return
      var k = Math.min(1, (performance.now() - t0) / HOLD_MS); bar.style.width = (k * 100).toFixed(1) + '%'
      // full bar: say "Lepaskan" and wait. The gate opens on the LIFT, judged by the events' own timestamps: a page
      // too busy to see the lift before the bar fills must not open on its frame clock (qa-prd49 L3 under load)
      if (k >= 1) { label.textContent = 'Lepaskan'; return }
      raf = requestAnimationFrame(tick)
    }
    hold.addEventListener('pointerdown', function (e) { e.preventDefault(); try { hold.setPointerCapture(e.pointerId) } catch (_) {} t0 = e.timeStamp || performance.now(); raf = requestAnimationFrame(tick) })
    // times are the events' own (e.timeStamp): a busy page handling the lift late must not turn 0.9 s into 2 s
    // letting go: a hold of 2 s or more passes even if no frame ran since (a slow tablet), shorter starts over
    hold.addEventListener('pointerup', function (e) { if (!t0) return; if ((e.timeStamp || performance.now()) - t0 >= HOLD_MS) { t0 = 0; cancelAnimationFrame(raf); ask(onPass, fail, true) } else stop() })
    ;['pointercancel', 'lostpointercapture'].forEach(function (ev) { hold.addEventListener(ev, function () { if (t0) stop() }) })   // a cancelled touch never opens the gate
    hold.addEventListener('contextmenu', function (e) { e.preventDefault() })
    el.querySelector('#pg-cancel').onclick = fail
    return el
  }
  function ask (onPass, fail, fingerUp) {
    // the finger that held is still down when the sum appears: lifting it must not tap the answer now under it
    var ready = false, arm = function () { setTimeout(function () { ready = true }, 350) }
    if (fingerUp) arm(); else D.addEventListener('pointerup', arm, { once: true, capture: true })
    var a = 10 + Math.floor(Math.random() * 30), b = 10 + Math.floor(Math.random() * 20), ans = a + b
    var opts = [ans, ans + 10, ans - 1].sort(function () { return Math.random() - 0.5 })
    var card = el.querySelector('.pg-card')
    card.innerHTML = '<h2>Untuk orang tua</h2><p>Berapa hasilnya?</p><div class="pg-q" id="pg-q">' + a + ' + ' + b + '</div>' +
      '<div class="pg-ch">' + opts.map(function (v) { return '<button type="button" data-v="' + v + '">' + v + '</button>' }).join('') + '</div>' +
      '<button type="button" class="pg-x" id="pg-cancel">Batal</button>'
    try { if (W.DuniaSpeak) DuniaSpeak.say(a + ' tambah ' + b + ', berapa hasilnya?') } catch (_) {}
    card.querySelectorAll('.pg-ch button').forEach(function (btn) {
      btn.onclick = function () { if (!ready) return; if (+btn.getAttribute('data-v') === ans) { close(); onPass && onPass() } else fail() }
    })
    card.querySelector('#pg-cancel').onclick = function () { if (ready) fail() }
    el.__ans = ans
  }
  W.DuniaParentGate = { open: open, close: close, HOLD_MS: HOLD_MS }
})(window)
