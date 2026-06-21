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

  // ── Pokemon roster (balanced) + type chart ─────────────────────────
  // All Pokemon normalized to HP 100. Move power 18-32 → 3-5 hits to KO.
  // Owner: "antar pokemon imbang jangan dibuat imba walaupun itu legendaris".
  const POKE_ROSTER = [
    { id:25,  name:'Pikachu',    emoji:'⚡', type:'electric', color:'#FCD34D', moves:[
      { name:'Tackle',         type:'normal',   pwr:18 },
      { name:'Quick Attack',   type:'normal',   pwr:22 },
      { name:'Thunder Shock',  type:'electric', pwr:26 },
      { name:'Thunderbolt',    type:'electric', pwr:32 }
    ]},
    { id:4,   name:'Charmander', emoji:'🦎', type:'fire', color:'#F97316', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Scratch',        type:'normal', pwr:22 },
      { name:'Ember',          type:'fire',   pwr:26 },
      { name:'Flamethrower',   type:'fire',   pwr:32 }
    ]},
    { id:1,   name:'Bulbasaur',  emoji:'🌿', type:'grass', color:'#10B981', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Leech Seed',     type:'grass',  pwr:22 },
      { name:'Vine Whip',      type:'grass',  pwr:26 },
      { name:'Razor Leaf',     type:'grass',  pwr:32 }
    ]},
    { id:7,   name:'Squirtle',   emoji:'🐢', type:'water', color:'#06B6D4', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Bubble',         type:'water',  pwr:22 },
      { name:'Water Gun',      type:'water',  pwr:26 },
      { name:'Hydro Pump',     type:'water',  pwr:32 }
    ]},
    { id:133, name:'Eevee',      emoji:'🦊', type:'normal', color:'#A78BFA', moves:[
      { name:'Tackle',         type:'normal', pwr:20 },
      { name:'Quick Attack',   type:'normal', pwr:24 },
      { name:'Bite',           type:'normal', pwr:28 },
      { name:'Swift',          type:'normal', pwr:32 }
    ]},
    { id:39,  name:'Jigglypuff', emoji:'🎀', type:'fairy', color:'#F472B6', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Pound',          type:'normal', pwr:22 },
      { name:'Disarming Voice',type:'fairy',  pwr:26 },
      { name:'Hyper Voice',    type:'fairy',  pwr:32 }
    ]},
    { id:37,  name:'Vulpix',     emoji:'🌟', type:'fire', color:'#EF4444', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Quick Attack',   type:'normal', pwr:22 },
      { name:'Ember',          type:'fire',   pwr:26 },
      { name:'Fire Spin',      type:'fire',   pwr:32 }
    ]},
    { id:172, name:'Pichu',      emoji:'⭐', type:'electric', color:'#FBBF24', moves:[
      { name:'Tackle',         type:'normal',   pwr:18 },
      { name:'Charm',          type:'fairy',    pwr:22 },
      { name:'Thunder Shock',  type:'electric', pwr:26 },
      { name:'Volt Tackle',    type:'electric', pwr:32 }
    ]}
  ];
  // Simple type chart — kid-friendly. 1.5 super-effective, 0.75 not very, 1.0 neutral.
  const TYPE_CHART = {
    fire:     { grass: 1.5, water: 0.75, fire: 0.75 },
    water:    { fire: 1.5, grass: 0.75, water: 0.75, electric: 0.5 },
    grass:    { water: 1.5, fire: 0.75, grass: 0.75 },
    electric: { water: 1.5, electric: 0.75, grass: 0.75 },
    normal:   {},
    fairy:    {}
  };
  function typeMult (moveType, defType) {
    const t = (TYPE_CHART[moveType] || {})[defType];
    return t == null ? 1.0 : t;
  }
  function calcDamage (atk, move, def) {
    const stab = move.type === atk.type ? 1.25 : 1.0;
    const tm   = typeMult(move.type, def.type);
    return Math.max(1, Math.floor(move.pwr * stab * tm));
  }
  function effLabel (mult) {
    if (mult >= 1.5)  return 'Super Efektif! ✨';
    if (mult <= 0.75) return 'Tidak Efektif…';
    return null;
  }

  // ── PvP engine (proper mirror split-screen, 1:1 same as original) ────
  // No picker. Each player gets a Pokemon from the roster. Same battle
  // mechanics on both halves (Pokemon sprite + HP + name + type). Active
  // player answers their question to unlock attack. Wrong = skip turn.
  function startPvP (opts) {
    injectCSS();
    injectPvPRealCSS();

    const root = document.createElement('div');
    root.className = 'bm-pvp-real';
    document.body.appendChild(root);

    // Default Pokemon (deterministic, fair): P1 = Pikachu, P2 = Charmander.
    // Type matchup is roughly even (electric vs fire — neutral both ways).
    const state = {
      turn: 0,
      pokes: [
        { ...POKE_ROSTER[0], hp: 100, hpMax: 100 },  // Pikachu
        { ...POKE_ROSTER[1], hp: 100, hpMax: 100 }   // Charmander
      ],
      qType: opts.questionType || 'math',
      qLevel: opts.questionLevel || 5,
      phase: 'question'   // 'question' | 'moves' | 'animating'
    };

    function exitMatch () {
      if (confirm('Keluar dari match?')) {
        teardown(root);
        opts.onCancel && opts.onCancel();
      }
    }

    function renderRoot () {
      // Same battle UI in TOP and BOTTOM halves. Top is rotated 180° so
      // two players face each other on the same device.
      // Each half shows: opponent's Pokemon (small at top), own Pokemon
      // (big at center), HP bars for both, and the question/move panel.
      const p1 = state.pokes[0];
      const p2 = state.pokes[1];

      root.innerHTML = `
        <button class="bm-back bm-real-exit" data-exit>×</button>

        <div class="bm-mirror-grid">
          <!-- TOP HALF — P2's view (rotated 180° for face-to-face) -->
          <section class="bm-mirror-half bm-mirror-top" data-state="${state.turn === 1 ? 'active' : 'inactive'}">
            <div class="bm-mirror-inner">
              ${renderHalf(1, p2, p1)}
            </div>
            <div class="bm-mirror-wait">Tunggu giliran lawan…</div>
          </section>

          <!-- BOTTOM HALF — P1's view (normal orientation) -->
          <section class="bm-mirror-half bm-mirror-bot" data-state="${state.turn === 0 ? 'active' : 'inactive'}">
            <div class="bm-mirror-inner">
              ${renderHalf(0, p1, p2)}
            </div>
            <div class="bm-mirror-wait">Tunggu giliran lawan…</div>
          </section>
        </div>
      `;
      root.querySelector('[data-exit]').addEventListener('click', exitMatch);
      // Wire question/move buttons on active side
      wireActiveSide();
    }

    function renderHalf (playerIdx, me, opp) {
      const meName = opts.players[playerIdx].name;
      const oppName = opts.players[1 - playerIdx].name;
      const badgeClass = playerIdx === 0 ? 'p1' : 'p2';
      const qData = root._questions && root._questions[playerIdx];
      // Question or moves panel content
      let panelHtml = '';
      if (state.phase === 'question') {
        // Generate question for this half only if missing
        if (!qData) {
          const q = state.qType === 'type' ? makeTypeQ() : makeMathQ(state.qLevel);
          if (!root._questions) root._questions = [null, null];
          root._questions[playerIdx] = q;
        }
        const q = root._questions[playerIdx];
        panelHtml = `
          <div class="bm-half-question">Jawab untuk menyerang:</div>
          <div class="bm-half-q-text">${escapeHtml(q.q)}</div>
          <div class="bm-half-choices" data-pidx="${playerIdx}">
            ${q.choices.map(c => `<button class="bm-half-choice" data-c="${escapeHtml(String(c))}">${escapeHtml(String(c))}</button>`).join('')}
          </div>
        `;
      } else if (state.phase === 'moves') {
        const isAttacker = (state.turn === playerIdx);
        if (isAttacker) {
          panelHtml = `
            <div class="bm-half-question">Pilih jurus untuk menyerang:</div>
            <div class="bm-half-moves" data-pidx="${playerIdx}">
              ${me.moves.map((mv, mi) => {
                const eff = effLabel(typeMult(mv.type, opp.type));
                return `
                  <button class="bm-half-move" data-mi="${mi}">
                    <div class="bm-half-move-name">${escapeHtml(mv.name)}</div>
                    <div class="bm-half-move-meta">
                      <span class="bm-real-move-type" data-mt="${mv.type}">${mv.type}</span>
                      <span class="bm-real-move-pwr">PWR ${mv.pwr}</span>
                      ${mv.type === me.type ? '<span class="bm-real-stab">⭐</span>' : ''}
                      ${eff ? `<span class="bm-real-move-eff">${eff}</span>` : ''}
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          `;
        } else {
          panelHtml = `<div class="bm-half-question">Lawan sedang memilih jurus…</div>`;
        }
      }

      return `
        <div class="bm-half-head">
          <span class="bm-pvp-badge ${badgeClass}">${badgeClass.toUpperCase()}</span>
          <span class="bm-half-pname">${escapeHtml(meName)}</span>
        </div>

        <!-- Opponent Pokemon mini panel (top of player's view) -->
        <div class="bm-half-opp">
          <div class="bm-half-opp-info">
            <div class="bm-half-opp-name">${opp.emoji} ${escapeHtml(opp.name)} <span class="bm-half-typetag" style="background:${opp.color}22; color:${opp.color}; border:1px solid ${opp.color}55;">${opp.type}</span></div>
            <div class="bm-half-hp">
              <div class="bm-half-hp-bar"><div class="bm-half-hp-fill ${opp.hp/opp.hpMax < 0.3 ? 'low' : ''}" style="width:${(opp.hp/opp.hpMax)*100}%;"></div></div>
              <span class="bm-half-hp-text">${opp.hp}/${opp.hpMax}</span>
            </div>
          </div>
          <div class="bm-half-opp-sprite" style="color:${opp.color};">${opp.emoji}</div>
        </div>

        <!-- Own Pokemon panel (bigger, faces opponent) -->
        <div class="bm-half-self">
          <div class="bm-half-self-sprite" style="color:${me.color};">${me.emoji}</div>
          <div class="bm-half-self-info">
            <div class="bm-half-self-name">${me.emoji} ${escapeHtml(me.name)} <span class="bm-half-typetag" style="background:${me.color}22; color:${me.color}; border:1px solid ${me.color}55;">${me.type}</span></div>
            <div class="bm-half-hp">
              <div class="bm-half-hp-bar"><div class="bm-half-hp-fill ${me.hp/me.hpMax < 0.3 ? 'low' : ''}" style="width:${(me.hp/me.hpMax)*100}%;"></div></div>
              <span class="bm-half-hp-text">${me.hp}/${me.hpMax}</span>
            </div>
          </div>
        </div>

        <!-- Question / Move panel -->
        <div class="bm-half-panel">
          ${panelHtml}
        </div>
      `;
    }

    function wireActiveSide () {
      // Find active player's choice buttons and bind click
      const activeHalf = root.querySelector(state.turn === 0 ? '.bm-mirror-bot' : '.bm-mirror-top');
      if (!activeHalf) return;
      if (state.phase === 'question') {
        activeHalf.querySelectorAll('.bm-half-choice').forEach(b => {
          b.addEventListener('click', () => {
            const picked = b.getAttribute('data-c');
            const q = root._questions[state.turn];
            onAnswer(picked, b, q, state.turn);
          });
        });
      } else if (state.phase === 'moves') {
        activeHalf.querySelectorAll('.bm-half-move').forEach(b => {
          b.addEventListener('click', () => {
            const mi = parseInt(b.getAttribute('data-mi'));
            const mv = state.pokes[state.turn].moves[mi];
            executeMove(mv);
          });
        });
      }
    }

    function onAnswer (picked, btn, q, playerIdx) {
      const isCorrect = String(picked) === String(q.ans);
      btn.classList.add(isCorrect ? 'correct' : 'wrong');
      btn.parentElement.querySelectorAll('.bm-half-choice').forEach(b => b.setAttribute('disabled',''));
      if (isCorrect) {
        sfxCorrect();
        // Transition to move-pick phase. Both halves re-render — active shows
        // move grid, inactive shows "Lawan sedang memilih jurus…" inverted.
        setTimeout(() => {
          state.phase = 'moves';
          renderRoot();
        }, 650);
      } else {
        sfxWrong();
        // Reveal correct
        btn.parentElement.querySelectorAll('.bm-half-choice').forEach(b => {
          if (b.getAttribute('data-c') === String(q.ans)) b.classList.add('correct');
        });
        setTimeout(() => {
          // Turn passes — clear questions, next player's turn
          root._questions = null;
          state.turn = 1 - state.turn;
          state.phase = 'question';
          renderRoot();
        }, 1400);
      }
    }

    function executeMove (move) {
      const atk = state.pokes[state.turn];
      const def = state.pokes[1 - state.turn];
      const dmg = calcDamage(atk, move, def);
      const tm  = typeMult(move.type, def.type);
      def.hp = Math.max(0, def.hp - dmg);
      sfxKO();
      // Show damage briefly via overlay
      flashDamage(dmg, tm);
      setTimeout(() => {
        if (def.hp <= 0) {
          finishMatch(state.turn);
          return;
        }
        // Turn passes — next player's question phase
        root._questions = null;
        state.turn = 1 - state.turn;
        state.phase = 'question';
        renderRoot();
      }, 1600);
    }

    function flashDamage (dmg, eff) {
      const ov = document.createElement('div');
      const effTxt = effLabel(eff);
      ov.style.cssText = `
        position: fixed; inset: 0; z-index: 9150; pointer-events: none;
        display: grid; place-items: center;
        background: ${eff >= 1.5 ? 'rgba(252,211,77,0.25)' : 'rgba(6,182,212,0.20)'};
      `;
      ov.innerHTML = `
        <div style="font-family:'Fredoka One',cursive; font-size:clamp(48px,12vw,96px); color:${eff >= 1.5 ? '#FCD34D' : '#67E8F9'}; text-shadow: 0 4px 18px rgba(0,0,0,0.6); animation: bmDmgPop 480ms cubic-bezier(0.34,1.56,0.64,1);">
          -${dmg}
          ${effTxt ? `<div style="font-size:0.45em; margin-top:6px;">${effTxt}</div>` : ''}
        </div>
      `;
      document.body.appendChild(ov);
      setTimeout(() => { try { ov.remove(); } catch (e) {} }, 1500);
    }

    function finishMatch (winnerIdx) {
      sfxKO();
      const winName = opts.players[winnerIdx].name;
      const banner = document.createElement('div');
      banner.style.cssText = `
        position: fixed; inset: 0; z-index: 9200;
        display: grid; place-items: center;
        background: radial-gradient(circle, rgba(252,211,77,0.30), rgba(0,0,0,0.88));
      `;
      banner.innerHTML = `
        <div style="text-align:center; padding:32px;">
          <div style="font-size:clamp(72px, 16vw, 120px); margin-bottom:8px;">${state.pokes[winnerIdx].emoji}</div>
          <div style="font-family:'Fredoka One',cursive; font-size:clamp(28px,7vw,52px); background:linear-gradient(135deg,#FCD34D,#EC4899); -webkit-background-clip:text; color:transparent; margin-bottom:16px;">
            🏆 ${escapeHtml(winName)} Menang!
          </div>
          <div style="color:rgba(255,255,255,0.8); margin-bottom:18px;">${escapeHtml(state.pokes[winnerIdx].name)} jadi juara</div>
          <button class="bm-champion-btn" style="font-size:18px; padding:14px 28px;" id="bm-match-next">Lanjut →</button>
        </div>
      `;
      document.body.appendChild(banner);
      spawnConfetti(36);
      banner.querySelector('#bm-match-next').addEventListener('click', () => {
        try { banner.remove(); } catch (e) {}
        teardown(root);
        opts.onComplete && opts.onComplete({ winnerIdx, winnerName: winName });
      });
    }

    // Boot — go straight to battle, no picker
    renderRoot();
  }

  // CSS for the proper mirror split-screen PvP layout
  let _realCssInjected = false;
  function injectPvPRealCSS () {
    if (_realCssInjected) return;
    const css = `
      .bm-pvp-real {
        position: fixed; inset: 0; z-index: 9100;
        background: linear-gradient(180deg, #0B1226 0%, #131A33 100%);
        font-family: 'Inter', system-ui, sans-serif;
        color: #F1F5F9;
        overflow: hidden;
      }
      .bm-real-exit {
        position: fixed; top: 8px; left: 8px; z-index: 9105;
        background: rgba(0,0,0,0.70);
        width: 36px; height: 36px;
        font-size: 18px;
      }

      /* MIRROR SPLIT — 50/50 portrait, P2 top rotated 180° */
      .bm-mirror-grid {
        display: grid;
        grid-template-rows: 1fr 1fr;
        height: 100dvh; max-height: 100svh;
      }
      .bm-mirror-half {
        position: relative;
        overflow: hidden;
        transition: opacity 280ms ease, filter 280ms ease;
        background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.20));
        border-bottom: 1px solid rgba(255,255,255,0.10);
      }
      .bm-mirror-half:last-child { border-bottom: none; }
      .bm-mirror-top .bm-mirror-inner { transform: rotate(180deg); transform-origin: center; height: 100%; }
      .bm-mirror-inner {
        height: 100%;
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        padding: 8px 12px;
      }
      .bm-mirror-half[data-state="active"]   .bm-mirror-wait { display: none; }
      .bm-mirror-half[data-state="inactive"] .bm-mirror-wait {
        display: grid; place-items: center;
        position: absolute; inset: 0;
        background: rgba(11,18,38,0.78);
        backdrop-filter: blur(4px);
        font-family: 'Fredoka One', cursive;
        color: #FCD34D;
        font-size: clamp(18px, 4.5vw, 28px);
        text-align: center;
        z-index: 3;
      }
      .bm-mirror-top.bm-mirror-half[data-state="inactive"] .bm-mirror-wait {
        transform: rotate(180deg);
      }
      .bm-mirror-half[data-state="inactive"] .bm-mirror-inner {
        filter: saturate(0.4) brightness(0.55);
      }

      /* Player header */
      .bm-half-head {
        display: flex; align-items: center; gap: 8px;
        padding: 4px 4px 6px;
      }
      .bm-half-pname { font-family: 'Fredoka One', cursive; font-size: 14px; }

      /* Opponent mini panel (top of player's half) */
      .bm-half-opp {
        display: flex; align-items: center; gap: 10px;
        padding: 6px 10px;
        background: rgba(0,0,0,0.30);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 12px;
      }
      .bm-half-opp-info { flex: 1; min-width: 0; }
      .bm-half-opp-name { font-family: 'Fredoka One', cursive; font-size: 13px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
      .bm-half-opp-sprite { font-size: clamp(28px, 6vw, 44px); line-height: 1; flex-shrink: 0; }

      /* Own Pokemon panel (bigger, center-stage) */
      .bm-half-self {
        display: flex; align-items: center; gap: 12px;
        padding: 8px 10px;
        margin: 8px 0;
      }
      .bm-half-self-sprite {
        font-size: clamp(64px, 11vh, 96px);
        line-height: 1; flex-shrink: 0;
        filter: drop-shadow(0 8px 22px rgba(0,0,0,0.5));
        animation: bmSpriteBob 2200ms ease-in-out infinite;
      }
      @keyframes bmSpriteBob {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-6px); }
      }
      .bm-half-self-info { flex: 1; min-width: 0; }
      .bm-half-self-name { font-family: 'Fredoka One', cursive; font-size: 15px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
      .bm-half-typetag { padding: 1px 6px; border-radius: 999px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; }

      /* HP bar */
      .bm-half-hp { display: flex; gap: 6px; align-items: center; margin-top: 4px; }
      .bm-half-hp-bar {
        flex: 1; height: 8px;
        background: rgba(255,255,255,0.10);
        border-radius: 4px; overflow: hidden;
      }
      .bm-half-hp-fill {
        height: 100%;
        background: linear-gradient(90deg, #10B981, #34D399);
        transition: width 480ms ease;
      }
      .bm-half-hp-fill.low { background: linear-gradient(90deg, #EF4444, #F87171); }
      .bm-half-hp-text { font-family: 'Fredoka One', cursive; font-size: 11px; min-width: 56px; text-align: right; }

      /* Question / move panel */
      .bm-half-panel {
        background: rgba(0,0,0,0.30);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 12px;
        padding: 10px 12px;
        display: flex; flex-direction: column; gap: 8px;
      }
      .bm-half-question {
        font-family: 'Fredoka One', cursive;
        font-size: 12px;
        color: rgba(255,255,255,0.78);
        text-align: center;
      }
      .bm-half-q-text {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(15px, 3.8vw, 20px);
        text-align: center;
        padding: 8px 10px;
        background: rgba(255,255,255,0.06);
        border-radius: 10px;
      }
      .bm-half-choices, .bm-half-moves {
        display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
      }
      .bm-half-choice {
        padding: 10px 8px;
        background: rgba(255,255,255,0.06);
        border: 1.5px solid rgba(255,255,255,0.20);
        border-radius: 10px;
        color: #F1F5F9;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(14px, 3.5vw, 18px);
        cursor: pointer;
        transition: transform 180ms cubic-bezier(0.34,1.56,0.64,1), border-color 180ms;
      }
      .bm-half-choice:hover { transform: translateY(-2px); border-color: rgba(6,182,212,0.55); }
      .bm-half-choice:active { transform: scale(0.96); }
      .bm-half-choice.correct {
        background: rgba(16,185,129,0.25) !important;
        border-color: rgba(110,231,183,0.65) !important;
        animation: bmPulse 480ms cubic-bezier(0.34,1.56,0.64,1);
      }
      .bm-half-choice.wrong {
        background: rgba(251,146,60,0.22) !important;
        border-color: rgba(253,186,116,0.55) !important;
      }

      .bm-half-move {
        padding: 8px 10px;
        background: rgba(255,255,255,0.06);
        border: 1.5px solid rgba(255,255,255,0.20);
        border-radius: 10px;
        color: #F1F5F9;
        font-family: 'Fredoka One', cursive;
        text-align: left;
        cursor: pointer;
        transition: transform 180ms cubic-bezier(0.34,1.56,0.64,1), border-color 180ms;
      }
      .bm-half-move:hover { transform: translateY(-2px); border-color: rgba(252,211,77,0.55); }
      .bm-half-move:active { transform: scale(0.96); }
      .bm-half-move-name { font-size: 13px; margin-bottom: 4px; }
      .bm-half-move-meta {
        display: flex; flex-wrap: wrap; gap: 3px;
        font-size: 8px; letter-spacing: 0.3px; text-transform: uppercase;
      }
      .bm-real-move-type {
        padding: 1px 5px; border-radius: 5px; font-weight: 800;
        background: rgba(255,255,255,0.10);
      }
      .bm-real-move-type[data-mt="fire"]     { background: rgba(249,115,22,0.25); color: #FED7AA; }
      .bm-real-move-type[data-mt="water"]    { background: rgba(6,182,212,0.25); color: #67E8F9; }
      .bm-real-move-type[data-mt="grass"]    { background: rgba(16,185,129,0.25); color: #6EE7B7; }
      .bm-real-move-type[data-mt="electric"] { background: rgba(252,211,77,0.25); color: #FDE68A; }
      .bm-real-move-type[data-mt="normal"]   { background: rgba(255,255,255,0.15); color: #E5E7EB; }
      .bm-real-move-type[data-mt="fairy"]    { background: rgba(244,114,182,0.25); color: #FBCFE8; }
      .bm-real-move-pwr { background: rgba(252,211,77,0.20); color: #FDE68A; padding: 1px 5px; border-radius: 5px; font-weight: 800; }
      .bm-real-stab { color: #FCD34D; }
      .bm-real-move-eff { color: #86EFAC; font-weight: 800; }

      @keyframes bmDmgPop {
        0%   { transform: scale(0.4); opacity: 0; }
        60%  { transform: scale(1.20); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }

      @media (prefers-reduced-motion: reduce) {
        .bm-pvp-real *, .bm-pvp-real *::before, .bm-pvp-real *::after {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
    const st = document.createElement('style');
    st.setAttribute('data-bm-real', 'v2');
    st.textContent = css;
    document.head.appendChild(st);
    _realCssInjected = true;
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
