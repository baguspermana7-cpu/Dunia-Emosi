/* ============================================================================
 * Dunia Emosi — Shared Battle Modes (Adventure / PvP / Tournament)
 * ============================================================================
 * Self-contained module: injects all required DOM + CSS dynamically so it
 * works in both the in-page main app (index.html) AND standalone HTML games
 * (g13c-pixi.html etc.). No external CSS needed.
 *
 * API:
 *   BattleModes.show(opts)  — opens the 3-card mode select modal.
 *     opts = {
 *       gameId:         'g10' | 'g13c' | …
 *       title:          string,           // header in the modal
 *       questionType:   'math' | 'type',  // math = numeric, type = symbol
 *       onAdventure:    fn,               // existing adventure entry — modal closes, caller takes over
 *       onCancel?:      fn,               // back button
 *       // OPTIONAL per-game hooks for advanced cases:
 *       customMathLevel?: number          // for G10 PvP/Tournament — defaults to 5
 *     }
 *
 *   BattleModes.startPvP(opts)         — direct PvP launch (skips modal)
 *   BattleModes.startTournament(opts)  — direct Tournament launch (skips modal)
 *
 *   The PvP + Tournament engines run entirely inside their own injected DOM
 *   layers (z-index 9000-9999), so they overlay any existing game UI without
 *   touching it. When the match ends, the layer is destroyed.
 *
 * Battle mechanics (kid-safe + deterministic — no RNG damage):
 *   - Each player has 5 HP hearts (1 heart = correct answer damage).
 *   - Alternating turns: P1 → P2 → P1 …
 *   - Active player's UI visible, inactive dimmed (anti-peek).
 *   - Question type per game:
 *       math  → window.makeMathQuestionV2 picks (level 5 default, easy tier).
 *       type  → "Pokemon api kuat lawan tipe apa?" with 4 type choices.
 *   - Correct → opponent loses 1 heart. Wrong → no damage to opponent.
 *   - First to 0 HP loses. No streak, no crit, no miss.
 *
 * Tournament:
 *   - 2/3/4 player single-elimination bracket.
 *     · 2 players → 1 match
 *     · 3 players → P3 gets BYE to final
 *     · 4 players → 1v4 + 2v3 semi → final
 *   - Each match runs the PvP engine in sequence.
 *   - Champion screen with bouncing trophy + confetti at end.
 * ========================================================================== */

;(function (global) {
  'use strict';

  // ── CSS injection (one-shot) ──────────────────────────────────────────
  let _cssInjected = false;
  function injectCSS () {
    if (_cssInjected) return;
    const css = `
      .bm-modal, .bm-pvp, .bm-tour {
        position: fixed; inset: 0;
        z-index: 9100;
        background: radial-gradient(circle at center, rgba(11,18,38,0.92), rgba(11,18,38,0.99));
        display: flex; flex-direction: column;
        padding: 18px 14px 24px;
        overflow-y: auto;
        font-family: 'Inter', system-ui, sans-serif;
        color: #F1F5F9;
      }
      .bm-modal::before, .bm-pvp::before, .bm-tour::before {
        content: '';
        position: fixed; inset: 0;
        background:
          radial-gradient(ellipse at 15% 0%, rgba(6,182,212,0.20), transparent 45%),
          radial-gradient(ellipse at 85% 100%, rgba(139,92,246,0.20), transparent 50%);
        pointer-events: none; z-index: -1;
      }
      .bm-header {
        display: flex; align-items: center; gap: 8px;
        padding: 4px 4px 16px;
      }
      .bm-back {
        width: 44px; height: 44px;
        display: grid; place-items: center;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 14px;
        color: #F1F5F9; font-size: 18px;
        cursor: pointer; font-family: inherit;
      }
      .bm-title {
        flex: 1; text-align: center;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(18px, 5vw, 26px);
        background: linear-gradient(135deg, #67E8F9, #C4B5FD);
        -webkit-background-clip: text; color: transparent;
        letter-spacing: 0.5px;
      }
      .bm-intro {
        text-align: center; padding: 12px 12px 22px;
        color: rgba(255,255,255,0.75);
        font-size: 14px;
      }
      .bm-intro h1 {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(28px, 7vw, 44px);
        margin: 4px 0 8px;
        background: linear-gradient(135deg, #FCD34D, #F472B6, #8B5CF6);
        -webkit-background-clip: text; color: transparent;
      }
      .bm-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px; padding: 0 4px;
        max-width: 580px; margin: 0 auto;
        width: 100%;
      }
      @media (min-width: 720px) {
        .bm-grid { grid-template-columns: 1fr 1fr 1fr; }
      }
      .bm-card {
        position: relative;
        display: flex; flex-direction: column; gap: 8px;
        padding: 22px 20px;
        background: rgba(255,255,255,0.05);
        backdrop-filter: blur(20px) saturate(150%);
        border: 1.5px solid rgba(255,255,255,0.12);
        border-radius: 20px;
        color: #F1F5F9;
        font-family: inherit; text-align: left;
        cursor: pointer;
        transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1),
                    border-color 200ms, background 200ms;
      }
      .bm-card[data-mode="adventure"] { border-color: rgba(34,197,94,0.45); background: linear-gradient(135deg, rgba(34,197,94,0.10), rgba(255,255,255,0.04)); }
      .bm-card[data-mode="pvp"]       { border-color: rgba(236,72,153,0.45); background: linear-gradient(135deg, rgba(236,72,153,0.10), rgba(255,255,255,0.04)); }
      .bm-card[data-mode="tournament"]{ border-color: rgba(252,211,77,0.50); background: linear-gradient(135deg, rgba(252,211,77,0.10), rgba(255,255,255,0.04)); }
      .bm-card:hover { transform: translateY(-4px); }
      .bm-card-emoji { font-size: 56px; line-height: 1; filter: drop-shadow(0 6px 18px rgba(0,0,0,0.5)); }
      .bm-card h3 {
        font-family: 'Fredoka One', cursive;
        font-size: 20px; margin: 6px 0 2px;
      }
      .bm-card p { font-size: 13px; color: rgba(255,255,255,0.70); line-height: 1.45; }
      .bm-card-cta {
        margin-top: 8px;
        padding: 7px 14px;
        background: linear-gradient(135deg, #06B6D4, #0EA5E9);
        color: white;
        border-radius: 999px;
        font-weight: 800; font-size: 12px;
        align-self: flex-start;
      }
      .bm-card[data-mode="pvp"] .bm-card-cta       { background: linear-gradient(135deg, #EC4899, #BE185D); }
      .bm-card[data-mode="tournament"] .bm-card-cta{ background: linear-gradient(135deg, #FCD34D, #F59E0B); color: #422006; }

      /* PvP screen */
      .bm-pvp { padding: 0; flex-direction: column; }
      .bm-pvp-zone {
        display: flex; flex-direction: column; justify-content: center;
        padding: 16px 14px;
        position: relative;
        transition: opacity 280ms ease, filter 280ms ease;
      }
      .bm-pvp-zone[data-state="active"] {
        opacity: 1; filter: none;
      }
      .bm-pvp-zone[data-state="inactive"] {
        opacity: 0.40; filter: saturate(0.5);
        pointer-events: none;
      }
      .bm-pvp-zone[data-state="inactive"] .bm-pvp-question { background: rgba(0,0,0,0.45); color: rgba(255,255,255,0.30); }
      .bm-pvp-zone[data-state="inactive"] .bm-pvp-choices { visibility: hidden; }
      .bm-pvp-zone[data-state="inactive"]::after {
        content: 'Tunggu giliran…';
        position: absolute; inset: 0;
        display: grid; place-items: center;
        background: rgba(11,18,38,0.55);
        color: #FCD34D;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(20px, 4.5vw, 28px);
        z-index: 5;
      }

      .bm-pvp-top { grid-row: 1; }
      .bm-pvp-top .bm-pvp-zone-inner { transform: rotate(180deg); }
      .bm-pvp-stage {
        background: linear-gradient(180deg, rgba(0,0,0,0.30), rgba(0,0,0,0.50));
        border-top: 1px solid rgba(255,255,255,0.10);
        border-bottom: 1px solid rgba(255,255,255,0.10);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 12px;
        position: relative;
      }
      .bm-pvp-grid {
        display: grid;
        grid-template-rows: 1fr auto 1fr;
        height: 100dvh;
        max-height: 100svh;
      }
      .bm-pvp-stage-text {
        font-family: 'Fredoka One', cursive;
        color: #FCD34D;
        font-size: clamp(18px, 4vw, 28px);
        text-align: center;
        text-shadow: 0 4px 14px rgba(0,0,0,0.5);
      }
      .bm-pvp-stage-vs {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(28px, 7vw, 48px);
        background: linear-gradient(135deg, #FCD34D, #EC4899);
        -webkit-background-clip: text; color: transparent;
        animation: bmVsPulse 1500ms ease-in-out infinite;
      }
      @keyframes bmVsPulse {
        0%,100% { transform: scale(1); }
        50%     { transform: scale(1.08); }
      }
      .bm-pvp-name {
        display: flex; align-items: center; gap: 8px;
        font-family: 'Fredoka One', cursive;
        font-size: 14px;
        margin-bottom: 6px;
      }
      .bm-pvp-badge {
        padding: 3px 9px; border-radius: 999px;
        font-size: 10px; letter-spacing: 0.5px; font-weight: 800;
      }
      .bm-pvp-badge.p1 { background: rgba(59,130,246,0.30); color: #BFDBFE; border: 1px solid rgba(59,130,246,0.5); }
      .bm-pvp-badge.p2 { background: rgba(239,68,68,0.30); color: #FECACA; border: 1px solid rgba(239,68,68,0.5); }
      .bm-pvp-hp {
        display: flex; gap: 6px; margin-left: auto;
        font-size: 22px;
      }
      .bm-pvp-question {
        background: rgba(255,255,255,0.06);
        border: 1.5px solid rgba(255,255,255,0.12);
        border-radius: 18px;
        padding: 14px 16px;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(18px, 5vw, 28px);
        text-align: center;
        color: #F1F5F9;
        backdrop-filter: blur(16px) saturate(150%);
        margin: 8px 0;
        letter-spacing: 0.8px;
      }
      .bm-pvp-choices {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .bm-pvp-btn {
        padding: 14px 10px;
        background: rgba(255,255,255,0.06);
        border: 1.5px solid rgba(255,255,255,0.20);
        border-radius: 14px;
        color: #F1F5F9;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(18px, 5vw, 24px);
        cursor: pointer;
        transition: transform 180ms cubic-bezier(0.34,1.56,0.64,1), border-color 180ms;
      }
      .bm-pvp-btn:hover { transform: translateY(-2px); border-color: rgba(6,182,212,0.55); }
      .bm-pvp-btn:active { transform: scale(0.96); }
      .bm-pvp-btn.correct {
        background: rgba(16,185,129,0.25) !important;
        border-color: rgba(110,231,183,0.65) !important;
        animation: bmPulse 480ms cubic-bezier(0.34,1.56,0.64,1);
      }
      .bm-pvp-btn.wrong {
        background: rgba(251,146,60,0.20) !important;
        border-color: rgba(253,186,116,0.55) !important;
        animation: bmShake 380ms ease;
      }
      @keyframes bmPulse {
        0%,100% { transform: scale(1); }
        50%     { transform: scale(1.06); }
      }
      @keyframes bmShake {
        0%,100% { transform: translateX(0); }
        25%     { transform: translateX(-6px); }
        50%     { transform: translateX(5px); }
        75%     { transform: translateX(-3px); }
      }

      /* Tournament setup + bracket */
      .bm-tour-step h2 {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(22px, 5vw, 32px);
        text-align: center;
        background: linear-gradient(135deg, #FCD34D, #EC4899);
        -webkit-background-clip: text; color: transparent;
        margin: 8px 0 18px;
      }
      .bm-tour-count {
        display: flex; gap: 14px; justify-content: center; margin-bottom: 22px;
        flex-wrap: wrap;
      }
      .bm-tour-count-btn {
        padding: 16px 22px;
        background: rgba(255,255,255,0.06);
        border: 2px solid rgba(255,255,255,0.18);
        border-radius: 16px;
        color: #F1F5F9;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(22px, 5vw, 30px);
        cursor: pointer;
        min-width: 96px;
        transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1), border-color 180ms, background 180ms;
      }
      .bm-tour-count-btn:hover { transform: translateY(-3px); border-color: #FCD34D; background: rgba(252,211,77,0.10); }
      .bm-tour-names {
        max-width: 480px; margin: 0 auto;
        display: flex; flex-direction: column; gap: 12px;
      }
      .bm-tour-name-row {
        display: flex; gap: 10px; align-items: center;
        background: rgba(255,255,255,0.05);
        border: 1.5px solid rgba(255,255,255,0.12);
        border-radius: 14px; padding: 12px 14px;
      }
      .bm-tour-name-badge {
        font-family: 'Fredoka One', cursive;
        padding: 4px 10px; border-radius: 999px;
        font-size: 12px; flex-shrink: 0;
      }
      .bm-tour-name-input {
        flex: 1; min-width: 0;
        background: transparent;
        border: none;
        color: #F1F5F9;
        font-family: 'Fredoka One', cursive;
        font-size: 18px;
        outline: none;
      }
      .bm-tour-name-input::placeholder { color: rgba(255,255,255,0.40); }
      .bm-tour-go {
        display: block;
        margin: 24px auto 0;
        padding: 14px 36px;
        background: linear-gradient(135deg, #FCD34D, #F59E0B);
        color: #422006;
        border: none;
        border-radius: 999px;
        font-family: 'Fredoka One', cursive;
        font-size: 18px;
        cursor: pointer;
        box-shadow: 0 12px 32px rgba(252,211,77,0.45);
      }
      .bm-tour-go:disabled { opacity: 0.55; cursor: not-allowed; }
      .bm-bracket {
        display: grid; gap: 16px;
        padding: 14px;
        max-width: 760px; margin: 0 auto;
      }
      .bm-bracket-round {
        display: flex; flex-direction: column; gap: 10px;
      }
      .bm-bracket-round h3 {
        font-family: 'Fredoka One', cursive;
        font-size: 14px;
        color: #FCD34D;
        margin-bottom: 4px;
        text-align: center;
        letter-spacing: 1px;
      }
      .bm-bracket-match {
        background: rgba(255,255,255,0.05);
        border: 1.5px solid rgba(255,255,255,0.12);
        border-radius: 14px;
        padding: 10px 14px;
        display: flex; flex-direction: column; gap: 4px;
      }
      .bm-bracket-match[data-state="current"] {
        border-color: #FCD34D;
        animation: bmGlow 1200ms ease-in-out infinite;
      }
      @keyframes bmGlow {
        0%,100% { box-shadow: 0 0 0 0 rgba(252,211,77,0.55); }
        50%     { box-shadow: 0 0 0 12px rgba(252,211,77,0); }
      }
      .bm-bracket-match[data-state="done"] { opacity: 0.7; }
      .bm-bracket-slot {
        display: flex; gap: 8px; align-items: center;
        padding: 4px 0;
        font-family: 'Fredoka One', cursive;
        font-size: 16px;
      }
      .bm-bracket-slot.winner { color: #6EE7B7; }
      .bm-bracket-slot.loser  { color: rgba(255,255,255,0.40); text-decoration: line-through; }
      .bm-bracket-vs { color: rgba(255,255,255,0.40); font-size: 11px; text-align: center; margin: 2px 0; }

      .bm-tour-go-match {
        display: block;
        margin: 18px auto 0;
        padding: 12px 28px;
        background: linear-gradient(135deg, #06B6D4, #0EA5E9);
        color: white;
        border: none; border-radius: 999px;
        font-family: 'Fredoka One', cursive;
        font-size: 16px;
        cursor: pointer;
      }

      /* Champion */
      .bm-champion {
        display: grid; place-items: center;
        position: fixed; inset: 0;
        z-index: 9300;
        background: radial-gradient(circle, rgba(11,18,38,0.95), rgba(0,0,0,0.99));
      }
      .bm-champion-card {
        background: linear-gradient(135deg, rgba(252,211,77,0.20), rgba(236,72,153,0.20));
        border: 2px solid #FCD34D;
        border-radius: 28px;
        padding: 38px 32px;
        text-align: center;
        max-width: 480px;
        backdrop-filter: blur(20px);
      }
      .bm-champion-trophy {
        font-size: clamp(80px, 16vw, 130px);
        display: block; margin: 0 auto 8px;
        filter: drop-shadow(0 18px 40px rgba(252,211,77,0.5));
        animation: bmTrophyDrop 800ms cubic-bezier(0.34,1.56,0.64,1);
      }
      @keyframes bmTrophyDrop {
        0%   { transform: translateY(-200px) scale(0.4); opacity: 0; }
        70%  { transform: translateY(8px) scale(1.15); opacity: 1; }
        100% { transform: translateY(0) scale(1); }
      }
      .bm-champion-title {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(24px, 6vw, 36px);
        background: linear-gradient(135deg, #FCD34D, #EC4899);
        -webkit-background-clip: text; color: transparent;
        margin-bottom: 8px;
      }
      .bm-champion-name {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(20px, 5vw, 28px);
        color: #F1F5F9; margin-bottom: 16px;
      }
      .bm-champion-actions {
        display: flex; gap: 10px; flex-direction: column; margin-top: 16px;
      }
      .bm-champion-btn {
        padding: 12px 24px;
        background: linear-gradient(135deg, #06B6D4, #0EA5E9);
        color: white; border: none; border-radius: 12px;
        font-family: 'Fredoka One', cursive; font-size: 14px;
        cursor: pointer;
      }
      .bm-champion-btn.secondary {
        background: rgba(255,255,255,0.10); color: #F1F5F9;
      }

      @media (prefers-reduced-motion: reduce) {
        .bm-modal *, .bm-pvp *, .bm-tour *, .bm-champion * {
          animation: none !important; transition: none !important;
        }
      }
    `;
    const st = document.createElement('style');
    st.setAttribute('data-bm', 'v1');
    st.textContent = css;
    document.head.appendChild(st);
    _cssInjected = true;
  }

  // ── Audio (Web Audio synth) ─────────────────────────────────────────
  let _ac = null;
  function _ctx () {
    if (_ac) return _ac;
    try { _ac = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { _ac = null; }
    return _ac;
  }
  function _tone (f, d, type, vol) {
    const ctx = _ctx(); if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol || 0.16, ctx.currentTime + 0.01);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + d);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + d + 0.02);
  }
  function sfxCorrect () {
    _tone(523, 0.12, 'triangle', 0.16);
    setTimeout(() => _tone(659, 0.12, 'triangle', 0.16), 90);
    setTimeout(() => _tone(784, 0.20, 'triangle', 0.18), 180);
  }
  function sfxWrong () {
    _tone(330, 0.16, 'sine', 0.14);
    setTimeout(() => _tone(247, 0.20, 'sine', 0.12), 110);
  }
  function sfxTurnSwitch () { _tone(880, 0.10, 'triangle', 0.14); }
  function sfxKO () {
    _tone(440, 0.10, 'square', 0.16);
    setTimeout(() => _tone(220, 0.30, 'square', 0.20), 100);
  }
  function sfxChampion () {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => setTimeout(() => _tone(f, 0.22, 'triangle', 0.18), i * 130));
  }

  // ── Confetti ────────────────────────────────────────────────────────
  function spawnConfetti (count, originEl) {
    const colors = ['#06B6D4','#0EA5E9','#8B5CF6','#EC4899','#FCD34D','#34D399','#FB923C'];
    const rect = originEl ? originEl.getBoundingClientRect() :
      { left: window.innerWidth/2, top: window.innerHeight/3, width: 0, height: 0 };
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.style.cssText = `
        position:fixed; width:8px; height:12px;
        left:${rect.left + rect.width * Math.random()}px;
        top:${rect.top}px;
        background:${colors[i % colors.length]};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        z-index:9999; pointer-events:none;
        transition: transform 1800ms ease-out, opacity 1800ms ease-out;
      `;
      document.body.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transform = `translate(${(Math.random()-0.5)*400}px, ${window.innerHeight*0.6}px) rotate(720deg)`;
        p.style.opacity = '0';
      });
      setTimeout(() => { try { p.remove(); } catch (e) {} }, 2200);
    }
  }

  // ── Question generators ────────────────────────────────────────────
  function makeMathQ (level) {
    const lv = level || 5;
    if (typeof window.makeMathQuestionV2 === 'function') {
      return window.makeMathQuestionV2(lv, 20, 'easy', 'standard');
    }
    // Fallback if math-rules.js absent
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 1 + Math.floor(Math.random() * 6);
    return {
      q: a + ' + ' + b + ' = ?',
      ans: a + b,
      choices: [a+b, a+b+1, a+b-1, a+b+2].sort(() => Math.random() - 0.5)
    };
  }
  const TYPE_QUESTIONS = [
    { q: 'Tipe api kuat lawan tipe apa?',     ans: 'Rumput', choices: ['Rumput','Air','Listrik','Batu'] },
    { q: 'Tipe air kuat lawan tipe apa?',     ans: 'Api',    choices: ['Api','Rumput','Listrik','Es'] },
    { q: 'Tipe rumput kuat lawan tipe apa?',  ans: 'Air',    choices: ['Air','Api','Listrik','Es'] },
    { q: 'Tipe listrik kuat lawan tipe apa?', ans: 'Air',    choices: ['Air','Rumput','Tanah','Api'] },
    { q: 'Tipe es kuat lawan tipe apa?',      ans: 'Naga',   choices: ['Naga','Api','Air','Batu'] },
    { q: 'Tipe batu kuat lawan tipe apa?',    ans: 'Terbang',choices: ['Terbang','Rumput','Air','Es'] },
    { q: 'Tipe psikis kuat lawan tipe apa?',  ans: 'Racun',  choices: ['Racun','Api','Air','Naga'] },
    { q: 'Tipe peri kuat lawan tipe apa?',    ans: 'Naga',   choices: ['Naga','Air','Api','Es'] }
  ];
  function makeTypeQ () {
    const q = TYPE_QUESTIONS[Math.floor(Math.random() * TYPE_QUESTIONS.length)];
    return { q: q.q, ans: q.ans, choices: q.choices.slice().sort(() => Math.random() - 0.5) };
  }

  // ── PvP engine ───────────────────────────────────────────────────────
  function startPvP (opts) {
    injectCSS();
    const root = document.createElement('div');
    root.className = 'bm-pvp';
    root.innerHTML = `
      <div class="bm-pvp-grid">
        <section class="bm-pvp-zone bm-pvp-top" data-state="inactive">
          <div class="bm-pvp-zone-inner">
            <div class="bm-pvp-name">
              <span class="bm-pvp-badge p2">P2</span>
              <span class="bm-pvp-name-text">${escapeHtml(opts.players[1].name)}</span>
              <span class="bm-pvp-hp" data-hp="2"></span>
            </div>
            <div class="bm-pvp-question" data-zone="2">…</div>
            <div class="bm-pvp-choices" data-zone="2"></div>
          </div>
        </section>
        <section class="bm-pvp-stage">
          <div class="bm-pvp-stage-text" id="bm-stage-line">Round 1</div>
          <div class="bm-pvp-stage-vs">VS</div>
          <div class="bm-pvp-stage-text" id="bm-stage-sub">Match ${opts.matchNo || 1}</div>
        </section>
        <section class="bm-pvp-zone bm-pvp-bottom" data-state="active">
          <div class="bm-pvp-zone-inner">
            <div class="bm-pvp-name">
              <span class="bm-pvp-badge p1">P1</span>
              <span class="bm-pvp-name-text">${escapeHtml(opts.players[0].name)}</span>
              <span class="bm-pvp-hp" data-hp="1"></span>
            </div>
            <div class="bm-pvp-question" data-zone="1">…</div>
            <div class="bm-pvp-choices" data-zone="1"></div>
          </div>
        </section>
      </div>
      <button class="bm-back" style="position:fixed;top:14px;left:14px;z-index:9101;" data-exit>×</button>
    `;
    document.body.appendChild(root);
    root.querySelector('[data-exit]').addEventListener('click', () => {
      if (confirm('Keluar dari match?')) {
        teardown(root);
        opts.onCancel && opts.onCancel();
      }
    });

    const state = {
      hp: [5, 5],
      turn: 0,
      level: opts.questionLevel || 5,
      type: opts.questionType || 'math',
      stageLine: opts.stageLineText || 'Round 1'
    };

    function renderHP () {
      for (let p = 0; p < 2; p++) {
        const slot = root.querySelector(`.bm-pvp-hp[data-hp="${p+1}"]`);
        const hearts = '❤️'.repeat(state.hp[p]) + '🖤'.repeat(5 - state.hp[p]);
        slot.textContent = hearts;
      }
    }

    function makeQ () {
      return state.type === 'type' ? makeTypeQ() : makeMathQ(state.level);
    }

    function showTurnFor (playerIdx) {
      // Anti-peek: switch active/inactive
      root.querySelectorAll('.bm-pvp-zone').forEach((z, i) => {
        z.setAttribute('data-state', i === (1 - playerIdx) ? 'active' : 'inactive');
      });
      // (Note: top zone is P2 (idx 1), bottom is P1 (idx 0). i=0 is top zone)
      // Fix the mapping: top zone shows P2 → make active when turn=1.
      const topZone = root.querySelector('.bm-pvp-top');
      const botZone = root.querySelector('.bm-pvp-bottom');
      topZone.setAttribute('data-state', playerIdx === 1 ? 'active' : 'inactive');
      botZone.setAttribute('data-state', playerIdx === 0 ? 'active' : 'inactive');
      // Render question on active player's zone
      const q = makeQ();
      const qEl = root.querySelector(`.bm-pvp-question[data-zone="${playerIdx + 1}"]`);
      const chEl = root.querySelector(`.bm-pvp-choices[data-zone="${playerIdx + 1}"]`);
      qEl.textContent = q.q;
      chEl.innerHTML = '';
      q.choices.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.className = 'bm-pvp-btn';
        btn.textContent = String(c);
        btn.addEventListener('click', () => onAnswer(c, btn, q, playerIdx, chEl));
        chEl.appendChild(btn);
      });
      sfxTurnSwitch();
    }

    function onAnswer (picked, btn, q, playerIdx, chEl) {
      // Disable all buttons in this zone
      chEl.querySelectorAll('.bm-pvp-btn').forEach(b => b.setAttribute('disabled',''));
      const isCorrect = String(picked) === String(q.ans);
      btn.classList.add(isCorrect ? 'correct' : 'wrong');
      if (isCorrect) {
        sfxCorrect();
        // Damage opponent
        const opp = 1 - playerIdx;
        state.hp[opp] = Math.max(0, state.hp[opp] - 1);
        renderHP();
      } else {
        sfxWrong();
      }
      setTimeout(() => {
        if (state.hp[0] <= 0 || state.hp[1] <= 0) {
          const winner = state.hp[0] > 0 ? 0 : 1;
          finishMatch(winner);
          return;
        }
        // Switch turn
        state.turn = 1 - state.turn;
        showTurnFor(state.turn);
      }, 950);
    }

    function finishMatch (winnerIdx) {
      // Show victory banner briefly, then call onComplete
      sfxKO();
      const banner = document.createElement('div');
      banner.style.cssText = `
        position: fixed; inset: 0; z-index: 9200;
        display: grid; place-items: center;
        background: radial-gradient(circle, rgba(252,211,77,0.30), rgba(0,0,0,0.85));
      `;
      banner.innerHTML = `
        <div style="text-align:center; padding:32px;">
          <div style="font-family:'Fredoka One',cursive; font-size:clamp(28px,7vw,52px); background:linear-gradient(135deg,#FCD34D,#EC4899); -webkit-background-clip:text; color:transparent; margin-bottom:12px;">
            🏆 ${escapeHtml(opts.players[winnerIdx].name)} Menang!
          </div>
          <button class="bm-champion-btn" style="font-size:18px; padding:14px 28px;" id="bm-match-next">Lanjut →</button>
        </div>
      `;
      document.body.appendChild(banner);
      spawnConfetti(36);
      banner.querySelector('#bm-match-next').addEventListener('click', () => {
        try { banner.remove(); } catch (e) {}
        teardown(root);
        opts.onComplete && opts.onComplete({ winnerIdx, winnerName: opts.players[winnerIdx].name });
      });
    }

    // Boot
    renderHP();
    showTurnFor(0);
  }

  // ── Tournament engine ────────────────────────────────────────────────
  function startTournament (opts) {
    injectCSS();
    const root = document.createElement('div');
    root.className = 'bm-tour';
    document.body.appendChild(root);

    let step = 'count';     // 'count' | 'names' | 'bracket'
    let playerCount = 0;
    let players = [];
    let bracket = null;
    let currentMatch = 0;

    function header () {
      return `
        <div class="bm-header">
          <button class="bm-back" data-tour-back aria-label="Back">←</button>
          <div class="bm-title">🏆 ${escapeHtml(opts.title || 'Tournament')}</div>
          <div style="width:44px;"></div>
        </div>
      `;
    }

    function renderCount () {
      root.innerHTML = `
        ${header()}
        <div class="bm-tour-step">
          <h2>Berapa Pemain?</h2>
          <div class="bm-tour-count">
            <button class="bm-tour-count-btn" data-count="2">2</button>
            <button class="bm-tour-count-btn" data-count="3">3</button>
            <button class="bm-tour-count-btn" data-count="4">4</button>
          </div>
          <p style="text-align:center; color:rgba(255,255,255,0.65); font-size:13px;">
            Single-elimination KO bracket. Pemenang lanjut ke ronde berikutnya.
          </p>
        </div>
      `;
      bindBack();
      root.querySelectorAll('.bm-tour-count-btn').forEach(b => {
        b.addEventListener('click', () => {
          playerCount = parseInt(b.getAttribute('data-count'));
          players = Array.from({ length: playerCount }, (_, i) => ({ name: '', idx: i }));
          step = 'names';
          renderNames();
        });
      });
    }

    function renderNames () {
      const suggestions = ['Mama','Papa','Kakak','Adik','Om','Tante','Bagas','Ayu'];
      const colors = ['p1','p2','p1','p2'];
      const palette = ['#3B82F6','#EF4444','#10B981','#F59E0B'];
      let rows = '';
      for (let i = 0; i < playerCount; i++) {
        const sug = suggestions[i % suggestions.length];
        rows += `
          <div class="bm-tour-name-row">
            <span class="bm-tour-name-badge" style="background:${palette[i]}25; color:${palette[i]}; border:1px solid ${palette[i]}80;">P${i+1}</span>
            <input class="bm-tour-name-input" type="text" placeholder="Nama pemain ${i+1} (mis. ${sug})" data-idx="${i}" value="${escapeHtml(players[i].name || '')}" maxlength="14">
          </div>
        `;
      }
      root.innerHTML = `
        ${header()}
        <div class="bm-tour-step">
          <h2>Isi Nama Pemain</h2>
          <div class="bm-tour-names">${rows}</div>
          <button class="bm-tour-go" id="bm-tour-start" disabled>Mulai Tournament →</button>
        </div>
      `;
      bindBack();
      const inputs = root.querySelectorAll('.bm-tour-name-input');
      const goBtn = root.querySelector('#bm-tour-start');
      function syncGo () {
        const allFilled = Array.from(inputs).every(inp => inp.value.trim().length > 0);
        goBtn.disabled = !allFilled;
      }
      inputs.forEach(inp => {
        inp.addEventListener('input', () => {
          players[parseInt(inp.getAttribute('data-idx'))].name = inp.value.trim();
          syncGo();
        });
      });
      syncGo();
      goBtn.addEventListener('click', () => {
        bracket = buildBracket(players);
        step = 'bracket';
        renderBracket();
      });
    }

    function buildBracket (ps) {
      // Single-elimination
      const N = ps.length;
      if (N === 2) {
        return {
          rounds: [
            [{ a: 0, b: 1, winner: null, label: 'Final' }]
          ]
        };
      }
      if (N === 3) {
        // P3 gets BYE to final
        return {
          rounds: [
            [{ a: 0, b: 1, winner: null, label: 'Semifinal' }],
            [{ a: 'M1', b: 2, winner: null, label: 'Final' }]
          ]
        };
      }
      // N === 4
      return {
        rounds: [
          [
            { a: 0, b: 3, winner: null, label: 'Semifinal 1' },
            { a: 1, b: 2, winner: null, label: 'Semifinal 2' }
          ],
          [{ a: 'M1', b: 'M2', winner: null, label: 'Final' }]
        ]
      };
    }

    function flatMatches () {
      const flat = [];
      bracket.rounds.forEach((r, ri) => {
        r.forEach((m, mi) => {
          m._r = ri; m._m = mi; m._id = 'M' + (ri === 0 ? mi + 1 : (bracket.rounds[0].length + ri));
          flat.push(m);
        });
      });
      return flat;
    }

    function resolveSlot (slot) {
      // Returns player obj or null if not yet resolved
      if (typeof slot === 'number') return players[slot];
      // slot like 'M1' — find that match and return winner
      const flat = flatMatches();
      const m = flat.find(mm => mm._id === slot);
      if (!m || m.winner === null) return null;
      return resolveSlot(m.a) && m.winner === 'a' ? resolveSlot(m.a) :
             resolveSlot(m.b) && m.winner === 'b' ? resolveSlot(m.b) : null;
    }

    function renderBracket () {
      const flat = flatMatches();
      let html = `${header()}<div class="bm-bracket">`;
      bracket.rounds.forEach((round, ri) => {
        html += `<div class="bm-bracket-round"><h3>${round[0].label.replace(/\\d+$/, '').toUpperCase()}</h3>`;
        round.forEach((m, mi) => {
          const aP = resolveSlot(m.a);
          const bP = resolveSlot(m.b);
          const aName = aP ? aP.name : 'TBD';
          const bName = bP ? bP.name : 'TBD';
          const flatIdx = flat.indexOf(m);
          let stateAttr = 'data-state="pending"';
          if (m.winner !== null) stateAttr = 'data-state="done"';
          if (flatIdx === currentMatch) stateAttr = 'data-state="current"';
          html += `
            <div class="bm-bracket-match" ${stateAttr}>
              <div class="bm-bracket-slot ${m.winner === 'a' ? 'winner' : (m.winner === 'b' ? 'loser' : '')}">⚔️ ${escapeHtml(aName)}</div>
              <div class="bm-bracket-vs">— ${escapeHtml(m.label)} —</div>
              <div class="bm-bracket-slot ${m.winner === 'b' ? 'winner' : (m.winner === 'a' ? 'loser' : '')}">⚔️ ${escapeHtml(bName)}</div>
            </div>
          `;
        });
        html += `</div>`;
      });
      html += `</div>`;

      const allDone = flat.every(m => m.winner !== null);
      if (allDone) {
        const finalMatch = flat[flat.length - 1];
        const champ = finalMatch.winner === 'a' ? resolveSlot(finalMatch.a) : resolveSlot(finalMatch.b);
        showChampion(champ);
        return;
      }

      const cur = flat[currentMatch];
      const aP = resolveSlot(cur.a);
      const bP = resolveSlot(cur.b);
      if (aP && bP) {
        html += `<button class="bm-tour-go-match" id="bm-tour-go-match">▶ Mulai ${escapeHtml(cur.label)}: ${escapeHtml(aP.name)} vs ${escapeHtml(bP.name)}</button>`;
      } else {
        // Shouldn't happen given sequential progression, but show wait
        html += `<p style="text-align:center; color:rgba(255,255,255,0.6); margin-top:14px;">Menunggu hasil ronde sebelumnya…</p>`;
      }

      root.innerHTML = html;
      bindBack();
      const btn = root.querySelector('#bm-tour-go-match');
      if (btn) btn.addEventListener('click', () => runCurrentMatch());
    }

    function runCurrentMatch () {
      const flat = flatMatches();
      const cur = flat[currentMatch];
      const aP = resolveSlot(cur.a);
      const bP = resolveSlot(cur.b);
      startPvP({
        players: [aP, bP],
        matchNo: currentMatch + 1,
        stageLineText: cur.label,
        questionLevel: opts.questionLevel,
        questionType: opts.questionType,
        onComplete: (res) => {
          // winnerIdx is 0 or 1 within the match's players
          cur.winner = res.winnerIdx === 0 ? 'a' : 'b';
          currentMatch++;
          renderBracket();
        },
        onCancel: () => {
          // Stay on bracket, no advance
          renderBracket();
        }
      });
    }

    function showChampion (champP) {
      sfxChampion();
      const card = document.createElement('div');
      card.className = 'bm-champion';
      card.innerHTML = `
        <div class="bm-champion-card">
          <span class="bm-champion-trophy">🏆</span>
          <div class="bm-champion-title">Juara Tournament!</div>
          <div class="bm-champion-name">${escapeHtml(champP.name)}</div>
          <div class="bm-champion-actions">
            <button class="bm-champion-btn" id="bm-tour-again">Main Lagi (pemain sama)</button>
            <button class="bm-champion-btn secondary" id="bm-tour-exit">Selesai</button>
          </div>
        </div>
      `;
      document.body.appendChild(card);
      spawnConfetti(60);
      card.querySelector('#bm-tour-again').addEventListener('click', () => {
        try { card.remove(); } catch (e) {}
        bracket = buildBracket(players);
        currentMatch = 0;
        renderBracket();
      });
      card.querySelector('#bm-tour-exit').addEventListener('click', () => {
        try { card.remove(); } catch (e) {}
        teardown(root);
        opts.onComplete && opts.onComplete({ champion: champP });
      });
    }

    function bindBack () {
      const b = root.querySelector('[data-tour-back]');
      if (!b) return;
      b.addEventListener('click', () => {
        if (step === 'count') {
          teardown(root);
          opts.onCancel && opts.onCancel();
        } else if (step === 'names') {
          step = 'count';
          renderCount();
        } else {
          if (confirm('Keluar dari tournament?')) {
            teardown(root);
            opts.onCancel && opts.onCancel();
          }
        }
      });
    }

    renderCount();
  }

  // ── Mode select modal ───────────────────────────────────────────────
  function show (opts) {
    injectCSS();
    opts = opts || {};
    const root = document.createElement('div');
    root.className = 'bm-modal';
    root.innerHTML = `
      <div class="bm-header">
        <button class="bm-back" data-bm-cancel aria-label="Back">←</button>
        <div class="bm-title">${escapeHtml(opts.title || 'Pilih Mode')}</div>
        <div style="width:44px;"></div>
      </div>
      <div class="bm-intro">
        <h1>Pilih Cara Main</h1>
        <p>Adventure untuk sendiri · PvP berdua · Tournament sekeluarga.</p>
      </div>
      <div class="bm-grid">
        <button class="bm-card" data-mode="adventure">
          <span class="bm-card-emoji">🎮</span>
          <h3>Adventure</h3>
          <p>Main sendiri. Selesaikan level dan kumpulkan bintang.</p>
          <span class="bm-card-cta">Main Sendiri →</span>
        </button>
        <button class="bm-card" data-mode="pvp">
          <span class="bm-card-emoji">👥</span>
          <h3>PvP 1 vs 1</h3>
          <p>Lawan teman di HP yang sama. Gantian jawab soal.</p>
          <span class="bm-card-cta">Lawan Teman →</span>
        </button>
        <button class="bm-card" data-mode="tournament">
          <span class="bm-card-emoji">🏆</span>
          <h3>Tournament</h3>
          <p>2–4 pemain. KO bracket sampai juara.</p>
          <span class="bm-card-cta">Sekeluarga →</span>
        </button>
      </div>
    `;
    document.body.appendChild(root);

    function close () { teardown(root); }

    root.querySelector('[data-bm-cancel]').addEventListener('click', () => {
      close(); opts.onCancel && opts.onCancel();
    });

    root.querySelector('[data-mode="adventure"]').addEventListener('click', () => {
      close();
      opts.onAdventure && opts.onAdventure();
    });

    root.querySelector('[data-mode="pvp"]').addEventListener('click', () => {
      close();
      // Mini name input
      askForNames(2, names => {
        startPvP({
          players: names.map(n => ({ name: n })),
          matchNo: 1,
          stageLineText: 'PvP',
          questionLevel: opts.questionLevel || 5,
          questionType: opts.questionType || 'math',
          onComplete: (res) => {
            // After PvP ends, show simple "Lagi?" prompt
            askReplay('🏆 ' + res.winnerName + ' Menang!', () => {
              startPvP({
                players: names.map(n => ({ name: n })),
                matchNo: 1,
                stageLineText: 'Rematch',
                questionLevel: opts.questionLevel || 5,
                questionType: opts.questionType || 'math',
                onComplete: () => {},
                onCancel: () => {}
              });
            });
          },
          onCancel: () => {}
        });
      });
    });

    root.querySelector('[data-mode="tournament"]').addEventListener('click', () => {
      close();
      startTournament({
        title: opts.title || 'Tournament',
        questionLevel: opts.questionLevel || 5,
        questionType: opts.questionType || 'math',
        onComplete: () => {},
        onCancel: () => {}
      });
    });
  }

  function askForNames (count, cb) {
    injectCSS();
    const root = document.createElement('div');
    root.className = 'bm-modal';
    const suggestions = ['Bagas','Ayu','Adik','Kakak'];
    let rows = '';
    const palette = ['#3B82F6','#EF4444'];
    for (let i = 0; i < count; i++) {
      rows += `
        <div class="bm-tour-name-row">
          <span class="bm-tour-name-badge" style="background:${palette[i]}25; color:${palette[i]}; border:1px solid ${palette[i]}80;">P${i+1}</span>
          <input class="bm-tour-name-input" type="text" placeholder="Nama pemain ${i+1} (${suggestions[i]})" data-idx="${i}" maxlength="14">
        </div>
      `;
    }
    root.innerHTML = `
      <div class="bm-header">
        <button class="bm-back" data-bm-cancel aria-label="Back">←</button>
        <div class="bm-title">👥 Nama Pemain</div>
        <div style="width:44px;"></div>
      </div>
      <div class="bm-tour-step" style="padding-top:12px;">
        <h2>Isi Nama Dulu</h2>
        <div class="bm-tour-names">${rows}</div>
        <button class="bm-tour-go" id="bm-name-go" disabled>Mulai PvP →</button>
      </div>
    `;
    document.body.appendChild(root);

    const inputs = root.querySelectorAll('.bm-tour-name-input');
    const goBtn = root.querySelector('#bm-name-go');
    function sync () {
      const ok = Array.from(inputs).every(inp => inp.value.trim().length > 0);
      goBtn.disabled = !ok;
    }
    inputs.forEach(inp => inp.addEventListener('input', sync));
    sync();
    goBtn.addEventListener('click', () => {
      const names = Array.from(inputs).map(inp => inp.value.trim());
      teardown(root);
      cb(names);
    });
    root.querySelector('[data-bm-cancel]').addEventListener('click', () => teardown(root));
  }

  function askReplay (title, onReplay) {
    const root = document.createElement('div');
    root.className = 'bm-modal';
    root.innerHTML = `
      <div style="flex:1; display:grid; place-items:center;">
        <div style="text-align:center;">
          <div style="font-family:'Fredoka One',cursive; font-size:clamp(24px,6vw,40px); background:linear-gradient(135deg,#FCD34D,#EC4899); -webkit-background-clip:text; color:transparent; margin-bottom:20px;">${escapeHtml(title)}</div>
          <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
            <button class="bm-champion-btn" id="bm-replay">▶ Main Lagi</button>
            <button class="bm-champion-btn secondary" id="bm-exit">✖ Selesai</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    root.querySelector('#bm-replay').addEventListener('click', () => { teardown(root); onReplay(); });
    root.querySelector('#bm-exit').addEventListener('click', () => teardown(root));
  }

  function teardown (root) {
    try { root.remove(); } catch (e) {}
  }

  function escapeHtml (s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── Export ─────────────────────────────────────────────────────────
  global.BattleModes = {
    show: show,
    startPvP: startPvP,
    startTournament: startTournament
  };
})(typeof window !== 'undefined' ? window : globalThis);
