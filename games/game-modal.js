/**
 * Unified game result modal for standalone game pages
 * Usage: GameModal.show({ title, stars, msg, emoji, onNext, onAgain, onBack, onExtra })
 *   onNext  → "Level Berikutnya ➡️" (optional, primary button)
 *   onAgain → "Main Lagi 🔄"
 *   onBack  → "Kembali 🏠"
 *   onExtra → { label, action } custom button
 */
const GameModal = (() => {
  let overlay;

  function init() {
    if (document.getElementById('gm-overlay')) return;

    const css = document.createElement('style');
    css.textContent = `
      #gm-overlay{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;background:rgba(15,10,30,0.78);backdrop-filter:blur(14px)}
      #gm-overlay.show{display:flex}
      #gm-card{background:linear-gradient(160deg,#f8f0ff,#ede2f6);border:2px solid rgba(180,160,220,0.45);border-radius:28px;padding:32px 24px;text-align:center;width:min(340px,92vw);box-shadow:0 16px 48px rgba(100,60,160,0.18);animation:gmSlideIn .4s cubic-bezier(.34,1.56,.64,1)}
      @keyframes gmSlideIn{from{opacity:0;transform:scale(0.88) translateY(24px)}to{opacity:1;transform:scale(1) translateY(0)}}
      #gm-emoji{font-size:56px;margin-bottom:4px}
      #gm-title{font-size:26px;font-weight:900;color:#3b2066;margin-bottom:8px;font-family:'Fredoka One',sans-serif}
      #gm-stars{font-size:34px;letter-spacing:4px;margin-bottom:8px}
      #gm-msg{color:#6b5080;font-size:14px;margin-bottom:20px;line-height:1.5}
      #gm-btns{display:flex;flex-direction:column;gap:8px}
      .gm-btn{display:block;width:100%;padding:14px;border:none;border-radius:18px;font-size:16px;font-weight:900;cursor:pointer;font-family:'Fredoka One',sans-serif;-webkit-tap-highlight-color:transparent;transition:transform .1s}
      .gm-btn:active{transform:scale(0.93)}
      .gm-btn-primary{background:linear-gradient(160deg,#a78bfa,#8b5cf6);color:#fff;box-shadow:0 4px 0 #6d28d9}
      .gm-btn-green{background:linear-gradient(160deg,#4ade80,#22c55e);color:#fff;box-shadow:0 4px 0 #15803d}
      .gm-btn-secondary{background:rgba(139,92,246,0.06);color:#6b5080;border:1.5px solid rgba(139,92,246,0.22)}
      @keyframes gmConf{0%{transform:translateY(0) translateX(0) rotate(0);opacity:1}100%{transform:translateY(100vh) translateX(var(--dx,0)) rotate(var(--rot,720deg));opacity:0}}
    `;
    document.head.appendChild(css);

    overlay = document.createElement('div');
    overlay.id = 'gm-overlay';
    overlay.innerHTML = '<div id="gm-card"><div id="gm-emoji"></div><div id="gm-title"></div><div id="gm-stars"></div><div id="gm-msg"></div><div id="gm-btns"></div></div>';
    document.body.appendChild(overlay);
  }

  function show({ emoji = '🏆', title = '', stars = 0, msg = '', onNext, onAgain, onBack, onExtra }) {
    init();
    // Coerce contradictory caller inputs: 0-star can never be "Sempurna"/"Hebat"/"Bagus"
    // or show a "Level Berikutnya" button. Standardize fail-state messaging.
    const normalizedStars = Math.max(0, Math.min(5, stars|0));
    let finalEmoji = emoji, finalTitle = title, finalMsg = msg, allowNext = !!onNext;
    if (normalizedStars === 0) {
      finalEmoji = '😞';
      finalTitle = 'Gagal! Coba Lagi';
      // Only override msg if caller provided a success-tone message
      if (/sempurna|hebat|bagus|luar biasa|keren/i.test(finalMsg) || !finalMsg) {
        finalMsg = 'Belum ada jawaban benar. Jangan menyerah, ayo coba lagi!';
      }
      allowNext = false; // no level advance on fail
    } else if (normalizedStars <= 2) {
      // Guard: low stars but caller passed success-tone title OR message — downgrade both.
      // Fixes Task #44 P0: "Selesai!" + 1★ + "Sempurna! Tidak ada kesalahan!" contradiction.
      if (/sempurna|hebat|luar biasa|keren/i.test(finalTitle)) finalTitle = 'Coba Lagi';
      if (/sempurna|tidak ada kesalahan|100%|benar semua|all correct/i.test(finalMsg)) {
        finalMsg = normalizedStars === 1 ? 'Kamu hampir dapat bintang lebih banyak — coba lagi!' : 'Sudah bagus, tapi masih bisa lebih baik!'
      }
    } else if (normalizedStars === 3 && /sempurna|luar biasa/i.test(finalTitle)) {
      finalTitle = 'Bagus!'
    }

    document.getElementById('gm-emoji').textContent = finalEmoji;
    document.getElementById('gm-title').textContent = finalTitle;
    document.getElementById('gm-stars').textContent = '⭐'.repeat(Math.min(normalizedStars,5)) + '☆'.repeat(Math.max(0,5-normalizedStars));
    document.getElementById('gm-msg').textContent = finalMsg;

    const btns = document.getElementById('gm-btns');
    btns.innerHTML = '';

    // Level Berikutnya — green, top priority. Requires stars >= 3 (passing grade) AND caller approval.
    if (allowNext && normalizedStars >= 3) {
      const b = document.createElement('button');
      b.className = 'gm-btn gm-btn-green';
      b.textContent = 'Level Berikutnya ➡️';
      b.onclick = () => { hide(); onNext(); };
      btns.appendChild(b);
    }

    if (onAgain) {
      const b = document.createElement('button');
      b.className = 'gm-btn gm-btn-primary';
      b.textContent = 'Main Lagi 🔄';
      b.onclick = () => { hide(); onAgain(); };
      btns.appendChild(b);
    }
    if (onExtra) {
      const b = document.createElement('button');
      b.className = 'gm-btn gm-btn-secondary';
      b.textContent = onExtra.label;
      b.onclick = () => { hide(); onExtra.action(); };
      btns.appendChild(b);
    }
    if (onBack) {
      const b = document.createElement('button');
      b.className = 'gm-btn gm-btn-secondary';
      b.textContent = 'Kembali 🏠';
      b.onclick = () => { hide(); onBack(); };
      btns.appendChild(b);
    }

    overlay.classList.add('show');

    // Graded celebration effects based on star count
    const stars_fx = normalizedStars;
    if (stars_fx >= 5) {
      _gmConfetti(60, ['#FCD34D','#FBBF24','#FFD700','#F43F5E','#8B5CF6','#14B8A6','#38BDF8','#A3E635'], 0.4, 25)
      setTimeout(() => _gmConfetti(40, ['#FCD34D','#FBBF24','#FFD700','#FDE68A'], 0.5, 30), 300)
    } else if (stars_fx >= 4) {
      _gmConfetti(30, ['#F43F5E','#FCD34D','#14B8A6','#38BDF8','#8B5CF6','#A3E635'], 0.2, 35)
    } else if (stars_fx >= 3) {
      _gmConfetti(12, ['#94A3B8','#CBD5E1','#A3E635','#38BDF8'], 0, 45)
    }
    // 0-2 stars: no celebration — just show modal
  }

  function _gmConfetti(count, colors, starChance, delay) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const p = document.createElement('div')
        p.style.cssText = 'position:fixed;top:-20px;z-index:9999;pointer-events:none;animation:gmConf ' + (1.8+Math.random()*1.4) + 's ease-out forwards;'
        const size = 7 + Math.random() * 12
        const dx = (Math.random() - 0.5) * 260 + 'px'
        const rot = Math.random() * 1080 + 'deg'
        if (Math.random() < starChance) {
          p.textContent = ['⭐','🌟','✨'][Math.floor(Math.random()*3)]
          p.style.cssText += `left:${Math.random()*100}vw;font-size:${size}px;--dx:${dx};--rot:${rot};`
        } else {
          p.style.cssText += `left:${Math.random()*100}vw;width:${size}px;height:${size*1.4}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>0.5?'50%':'3px'};--dx:${dx};--rot:${rot};`
        }
        document.body.appendChild(p)
        setTimeout(() => p.remove(), 3500)
      }, i * delay)
    }
  }

  function hide() {
    if (overlay) overlay.classList.remove('show');
  }

  return { show, hide };
})();

/**
 * Unified scoring engine for all games.
 * Usage: GameScoring.calc({ correct, total, wrong, lives, maxLives, time, maxTime, bonus })
 * Returns 1-5 stars. Perfect play (100% correct, no mistakes) = always 5 stars.
 *
 * Rules:
 *   accuracy = correct / total
 *   100% accuracy → 5★
 *   ≥85% accuracy → 4★
 *   ≥65% accuracy → 3★
 *   ≥40% accuracy → 2★
 *   <40% accuracy → 1★
 *
 * Modifiers (optional):
 *   - lives lost: each life lost reduces max possible by 0.5
 *   - time bonus: finishing under 50% time adds +0.5
 *   - wrong answers: >3 wrong caps max at 4★, >6 wrong caps at 3★
 */
const GameScoring = {
  calc({ correct = 0, total = 1, wrong = 0, lives, maxLives, time, maxTime, bonus = 0 }) {
    if (total <= 0) return 3
    // Zero-correct = FAIL. Always 0 stars regardless of bonus/time.
    if (correct <= 0) return 0
    const accuracy = correct / total

    // Base stars from accuracy
    let stars
    if (accuracy >= 1.0) stars = 5
    else if (accuracy >= 0.85) stars = 4
    else if (accuracy >= 0.65) stars = 3
    else if (accuracy >= 0.40) stars = 2
    else stars = 1

    // Wrong answer penalty: many wrong answers cap the max
    if (wrong > 6 && stars > 3) stars = 3
    else if (wrong > 3 && stars > 4) stars = 4

    // Lives modifier
    if (typeof lives === 'number' && typeof maxLives === 'number' && maxLives > 0) {
      const livesLost = maxLives - lives
      if (livesLost >= 2 && stars > 3) stars = Math.max(3, stars - 1)
    }

    // Time bonus
    if (typeof time === 'number' && typeof maxTime === 'number' && maxTime > 0) {
      if (time < maxTime * 0.5 && stars < 5) stars = Math.min(5, stars + 1)
    }

    // Custom bonus — allow 0 minimum so non-accuracy games can return fail
    stars = Math.min(5, Math.max(0, stars + bonus))

    return stars
  }
};

/**
 * Shared Pause Menu for standalone games.
 * Usage: GamePause.init({ onResume, onRetry, onHome, bgmEl })
 *   Call GamePause.show() to open, GamePause.hide() to close.
 *   Provides: volume sliders (master, BGM, SFX), retry, home buttons.
 */
const GamePause = (() => {
  let overlay, _cfg = {}

  function init(cfg) {
    _cfg = cfg || {}
    if (document.getElementById('gp-overlay')) {
      overlay = document.getElementById('gp-overlay')
      return
    }
    const css = document.createElement('style')
    css.textContent = `
      #gp-overlay{position:fixed;inset:0;z-index:8000;display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;background:rgba(0,30,60,0.92);backdrop-filter:blur(8px)}
      #gp-overlay.show{display:flex}
      .gp-title{font-size:28px;font-weight:900;color:#fbbf24;font-family:'Fredoka One',sans-serif}
      .gp-vol-row{display:flex;align-items:center;gap:8px;width:80%;max-width:300px;color:#bfdbfe;font-size:13px;font-weight:700}
      .gp-vol-row input{flex:1;accent-color:#38bdf8}
      .gp-btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px}
      .gp-btn{padding:12px 24px;border-radius:14px;font-size:15px;font-weight:900;cursor:pointer;font-family:'Fredoka One',sans-serif;border:2px solid;transition:transform .1s}
      .gp-btn:active{transform:scale(0.93)}
      .gp-btn-resume{border-color:#4ade80;background:rgba(34,197,94,0.3);color:#4ade80}
      .gp-btn-retry{border-color:#fbbf24;background:rgba(251,191,36,0.2);color:#fbbf24}
      .gp-btn-home{border-color:rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);color:#bfdbfe}
    `
    document.head.appendChild(css)
    overlay = document.createElement('div')
    overlay.id = 'gp-overlay'
    overlay.innerHTML = `
      <div style="font-size:36px">⏸</div>
      <div class="gp-title">PAUSE</div>
      <div class="gp-vol-row">🔊 Master<input type="range" id="gp-vol-master" min="0" max="100" value="80" oninput="GamePause._vol()"></div>
      <div class="gp-vol-row">🎵 BGM<input type="range" id="gp-vol-bgm" min="0" max="100" value="50" oninput="GamePause._vol()"></div>
      <div class="gp-btns">
        <button class="gp-btn gp-btn-resume" onclick="GamePause.hide()">▶ Lanjut</button>
        <button class="gp-btn gp-btn-retry" onclick="GamePause._retry()">🔄 Ulang</button>
        <button class="gp-btn gp-btn-home" onclick="GamePause._home()">🏠 Keluar</button>
      </div>
    `
    document.body.appendChild(overlay)
  }

  function show() {
    if (!overlay) init(_cfg)
    overlay.classList.add('show')
    if (_cfg.onPause) _cfg.onPause()
    if (_cfg.bgmEl) try { _cfg.bgmEl.pause() } catch(_) {}
  }

  function hide() {
    if (overlay) overlay.classList.remove('show')
    if (_cfg.onResume) _cfg.onResume()
    if (_cfg.bgmEl) try { _cfg.bgmEl.play().catch(()=>{}) } catch(_) {}
  }

  function _vol() {
    const master = (document.getElementById('gp-vol-master')?.value || 80) / 100
    const bgm = (document.getElementById('gp-vol-bgm')?.value || 50) / 100
    if (_cfg.bgmEl) _cfg.bgmEl.volume = bgm * master
  }

  function _retry() {
    hide()
    if (_cfg.onRetry) _cfg.onRetry()
    else location.reload()
  }

  function _home() {
    hide()
    if (_cfg.bgmEl) try { _cfg.bgmEl.pause() } catch(_) {}
    if (_cfg.onHome) _cfg.onHome()
    else history.back()
  }

  return { init, show, hide, _vol, _retry, _home }
})();
