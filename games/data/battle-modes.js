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
      /* Mode select + PvP setup + Tournament shell — mirrors G10 sky→grass field */
      .bm-modal, .bm-pvp, .bm-tour {
        position: fixed; inset: 0;
        z-index: 9100;
        background: linear-gradient(180deg,#6bbfee 0%,#a8d8f8 32%,#a0d870 46%,#5a9e3a 65%,#3e7028 100%);
        display: flex; flex-direction: column;
        padding: 18px 14px 24px;
        overflow-y: auto;
        font-family: 'Inter', system-ui, sans-serif;
        color: #111;
      }
      .bm-modal::before, .bm-pvp::before, .bm-tour::before {
        content: '';
        position: fixed; inset: -10% -5%;
        background: url('/Dunia-Emosi/assets/bg-pokemon-battle.webp') center center/cover no-repeat;
        opacity: 0.40;
        pointer-events: none; z-index: 0;
      }
      .bm-modal > *, .bm-pvp > *, .bm-tour > * { position: relative; z-index: 1; }
      .bm-header {
        display: flex; align-items: center; gap: 8px;
        padding: 4px 4px 16px;
      }
      /* Back button — DS-style white info box */
      .bm-back {
        width: 44px; height: 44px;
        display: grid; place-items: center;
        background: rgba(248,248,240,0.97);
        border: 2.5px solid #444; border-radius: 10px;
        box-shadow: 3px 3px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.9);
        color: #111; font-size: 20px; font-weight: 900;
        cursor: pointer; font-family: 'Fredoka One', cursive;
      }
      .bm-back:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 rgba(0,0,0,0.35); }
      .bm-title {
        flex: 1; text-align: center;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(18px, 5vw, 26px);
        color: #fff;
        text-shadow: 2px 2px 0 rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.4);
        letter-spacing: 0.5px;
      }
      .bm-intro { text-align: center; padding: 12px 12px 22px; }
      .bm-intro h1 {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(26px, 7vw, 40px);
        margin: 4px 0 10px;
        color: #fff;
        text-shadow: 2px 2px 0 rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.45);
        letter-spacing: 0.5px;
      }
      .bm-intro p {
        display: inline-block;
        padding: 6px 14px;
        background: rgba(248,248,240,0.95);
        border: 2px solid #444; border-radius: 999px;
        color: #111; font-size: 13px; font-weight: 700;
        box-shadow: 2px 2px 0 rgba(0,0,0,0.25);
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
      /* Mode cards — DS-style white info boxes with colored border (mirrors .g10-infobox) */
      .bm-card {
        position: relative;
        display: flex; flex-direction: column; gap: 8px;
        padding: 18px 18px 16px;
        background: rgba(248,248,240,0.97);
        border: 3px solid #444; border-radius: 14px;
        box-shadow: 4px 4px 0 rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.95);
        color: #111;
        font-family: inherit; text-align: left;
        cursor: pointer;
        transition: transform 180ms cubic-bezier(0.34,1.56,0.64,1),
                    box-shadow 180ms;
      }
      .bm-card[data-mode="adventure"]  { border-color: #15803d; }
      .bm-card[data-mode="pvp"]        { border-color: #be185d; }
      .bm-card[data-mode="tournament"] { border-color: #d97706; }
      .bm-card:hover { transform: translate(-2px, -4px); box-shadow: 6px 6px 0 rgba(0,0,0,0.32); }
      .bm-card:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 rgba(0,0,0,0.30); }
      .bm-card-emoji { font-size: 56px; line-height: 1; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.25)); }
      .bm-card h3 {
        font-family: 'Fredoka One', cursive;
        font-size: 22px; margin: 4px 0 2px;
        color: #111;
      }
      .bm-card[data-mode="adventure"]  h3 { color: #15803d; }
      .bm-card[data-mode="pvp"]        h3 { color: #be185d; }
      .bm-card[data-mode="tournament"] h3 { color: #b45309; }
      .bm-card p { font-size: 13px; color: #444; line-height: 1.45; font-weight: 600; }
      .bm-card-cta {
        margin-top: 6px;
        padding: 8px 14px;
        background: #22c55e;
        color: white;
        border-radius: 999px;
        border: 2px solid #111;
        box-shadow: 2px 2px 0 #111;
        font-family: 'Fredoka One', cursive;
        font-size: 13px;
        align-self: flex-start;
      }
      .bm-card[data-mode="pvp"] .bm-card-cta       { background: #ec4899; }
      .bm-card[data-mode="tournament"] .bm-card-cta{ background: #f59e0b; }

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
  // HD sprite path resolver (matches assets/Pokemon/pokemondb_hd_alt2/...)
  function spritePath (id, slug) {
    var padded = String(id).padStart(4, '0');
    return '/Dunia-Emosi/assets/Pokemon/pokemondb_hd_alt2/' + padded + '_' + slug + '.webp';
  }
  const POKE_ROSTER = [
    { id:25,  name:'Pikachu',    emoji:'⚡', slug:'pikachu',    type:'electric', color:'#FCD34D', moves:[
      { name:'Tackle',         type:'normal',   pwr:18 },
      { name:'Quick Attack',   type:'normal',   pwr:22 },
      { name:'Thunder Shock',  type:'electric', pwr:26 },
      { name:'Thunderbolt',    type:'electric', pwr:32 }
    ]},
    { id:4,   name:'Charmander', emoji:'🦎', slug:'charmander', type:'fire', color:'#F97316', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Scratch',        type:'normal', pwr:22 },
      { name:'Ember',          type:'fire',   pwr:26 },
      { name:'Flamethrower',   type:'fire',   pwr:32 }
    ]},
    { id:1,   name:'Bulbasaur',  emoji:'🌿', slug:'bulbasaur', type:'grass', color:'#10B981', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Leech Seed',     type:'grass',  pwr:22 },
      { name:'Vine Whip',      type:'grass',  pwr:26 },
      { name:'Razor Leaf',     type:'grass',  pwr:32 }
    ]},
    { id:7,   name:'Squirtle',   emoji:'🐢', slug:'squirtle', type:'water', color:'#06B6D4', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Bubble',         type:'water',  pwr:22 },
      { name:'Water Gun',      type:'water',  pwr:26 },
      { name:'Hydro Pump',     type:'water',  pwr:32 }
    ]},
    { id:133, name:'Eevee',      emoji:'🦊', slug:'eevee', type:'normal', color:'#A78BFA', moves:[
      { name:'Tackle',         type:'normal', pwr:20 },
      { name:'Quick Attack',   type:'normal', pwr:24 },
      { name:'Bite',           type:'normal', pwr:28 },
      { name:'Swift',          type:'normal', pwr:32 }
    ]},
    { id:39,  name:'Jigglypuff', emoji:'🎀', slug:'jigglypuff', type:'fairy', color:'#F472B6', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Pound',          type:'normal', pwr:22 },
      { name:'Disarming Voice',type:'fairy',  pwr:26 },
      { name:'Hyper Voice',    type:'fairy',  pwr:32 }
    ]},
    { id:37,  name:'Vulpix',     emoji:'🌟', slug:'vulpix', type:'fire', color:'#EF4444', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Quick Attack',   type:'normal', pwr:22 },
      { name:'Ember',          type:'fire',   pwr:26 },
      { name:'Fire Spin',      type:'fire',   pwr:32 }
    ]},
    { id:172, name:'Pichu',      emoji:'⭐', slug:'pichu', type:'electric', color:'#FBBF24', moves:[
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
  function hpColorClass (hp, hpMax) {
    const r = hp / hpMax;
    if (r >= 0.5)  return '';        // green default
    if (r >= 0.25) return 'med';     // yellow
    return 'low';                    // red
  }

  // Type icon + weakness lookup — derived from TYPE_CHART by inversion.
  // "lemah thp" = "weak against" — types whose attacks deal 1.5× to this type.
  const TYPE_ICON = { fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', normal: '⭐', fairy: '🎀' };
  const WEAKNESS = {
    fire:     ['water'],
    water:    ['grass', 'electric'],
    grass:    ['fire'],
    electric: [],
    normal:   [],
    fairy:    []
  };
  function weaknessChipHtml (type) {
    const ws = WEAKNESS[type] || [];
    if (!ws.length) return '<span class="bm-weak-chip bm-weak-none">⚖ Seimbang</span>';
    const inner = ws.map(t => (TYPE_ICON[t] || '') + ' ' + t).join(' · ');
    return `<span class="bm-weak-chip">🔻 Lemah: ${inner}</span>`;
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
    // Demo matchup: Squirtle (water) vs Charmander (fire). Water→fire = SUPER (✨),
    // fire→water = RESIST (💤) — showcases the type-effectiveness standard on
    // both sides' move panels (mirrors G10's super-eff / resist-eff classes).
    const state = {
      turn: 0,
      pokes: [
        { ...POKE_ROSTER[3], hp: 100, hpMax: 100 },  // Squirtle (water)
        { ...POKE_ROSTER[1], hp: 100, hpMax: 100 }   // Charmander (fire)
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

    // Owner spec: 20vh top q-zone + 60vh shared arena (FIXED) + 20vh bottom q-zone.
    // Arena shows BOTH Pokemon (each with DS info card + type chip + 🔻weakness chip + HP).
    // Q-zone roles swap with state.turn — active player sees question/moves, inactive
    // sees opaque "Tunggu giliran" overlay (anti-peek). Top zone rotated 180° so P2
    // (facing the screen upside-down) reads normally. Arena itself is NOT rotated.
    function renderRoot () {
      const p1 = state.pokes[0];
      const p2 = state.pokes[1];

      root.innerHTML = `
        <button class="bm-back bm-real-exit" data-exit>×</button>

        <div class="bm-stage-grid">
          <!-- TOP Q-ZONE (P2) — rotated 180° for face-to-face -->
          <section class="bm-qzone bm-qzone-top" data-state="${state.turn === 1 ? 'active' : 'inactive'}">
            <div class="bm-qzone-inner">${renderQZone(1, p2, p1)}</div>
            <div class="bm-qzone-wait">⌛ Tunggu giliran lawan…</div>
          </section>

          <!-- SHARED ARENA — both Pokemon visible to both players -->
          ${renderArena(p1, p2)}

          <!-- BOTTOM Q-ZONE (P1) — normal orientation -->
          <section class="bm-qzone bm-qzone-bot" data-state="${state.turn === 0 ? 'active' : 'inactive'}">
            <div class="bm-qzone-inner">${renderQZone(0, p1, p2)}</div>
            <div class="bm-qzone-wait">⌛ Tunggu giliran lawan…</div>
          </section>
        </div>
      `;
      root.querySelector('[data-exit]').addEventListener('click', exitMatch);
      wireActiveZone();
    }

    function renderArena (p1, p2) {
      return `
        <section class="bm-arena">
          <!-- Opponent quadrant (P2) — top-right, mirrors .g10-espr-wrap -->
          <div class="bm-arena-opp">
            <div class="bm-info-card">
              <div class="bm-info-name">${escapeHtml(p2.name)}</div>
              <div class="bm-info-chips">
                <span class="bm-type-chip" style="background:${p2.color};">${TYPE_ICON[p2.type] || ''} ${p2.type}</span>
                ${weaknessChipHtml(p2.type)}
              </div>
              <div class="bm-hp-row">
                <span class="bm-hp-lbl">HP</span>
                <div class="bm-hp-bar"><div class="bm-hp-fill ${hpColorClass(p2.hp, p2.hpMax)}" style="width:${(p2.hp/p2.hpMax)*100}%;"></div></div>
              </div>
              <div class="bm-hp-text">${p2.hp}/${p2.hpMax}</div>
            </div>
            <img class="bm-arena-opp-img" alt="${escapeHtml(p2.name)}" src="${spritePath(p2.id, p2.slug)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'bm-arena-opp-sprite',textContent:'${p2.emoji}'}))">
          </div>

          <!-- Self quadrant (P1) — bottom-left, mirrors .g10-pspr-wrap -->
          <div class="bm-arena-self">
            <img class="bm-arena-self-img" alt="${escapeHtml(p1.name)}" src="${spritePath(p1.id, p1.slug)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'bm-arena-self-sprite',textContent:'${p1.emoji}'}))">
            <div class="bm-info-card">
              <div class="bm-info-name">${escapeHtml(p1.name)}</div>
              <div class="bm-info-chips">
                <span class="bm-type-chip" style="background:${p1.color};">${TYPE_ICON[p1.type] || ''} ${p1.type}</span>
                ${weaknessChipHtml(p1.type)}
              </div>
              <div class="bm-hp-row">
                <span class="bm-hp-lbl">HP</span>
                <div class="bm-hp-bar"><div class="bm-hp-fill ${hpColorClass(p1.hp, p1.hpMax)}" style="width:${(p1.hp/p1.hpMax)*100}%;"></div></div>
              </div>
              <div class="bm-hp-text">${p1.hp}/${p1.hpMax}</div>
            </div>
          </div>
        </section>
      `;
    }

    function renderQZone (playerIdx, me, opp) {
      const meName = opts.players[playerIdx].name;
      const badgeClass = playerIdx === 0 ? 'p1' : 'p2';
      const isActive = state.turn === playerIdx;
      if (!isActive) {
        // Inactive — show player name pill only; the .bm-qzone-wait overlay covers content
        return `<div class="bm-qzone-pname"><span class="bm-pvp-badge ${badgeClass}">${badgeClass.toUpperCase()}</span> ${escapeHtml(meName)}</div>`;
      }
      // Active — question phase or moves phase
      if (state.phase === 'question') {
        if (!root._questions) root._questions = [null, null];
        if (!root._questions[playerIdx]) {
          root._questions[playerIdx] = state.qType === 'type' ? makeTypeQ() : makeMathQ(state.qLevel);
        }
        const q = root._questions[playerIdx];
        return `
          <div class="bm-q-row">
            <div class="bm-q-text">${escapeHtml(q.q)}</div>
            <div class="bm-choices" data-pidx="${playerIdx}">
              ${q.choices.map(c => `<button class="bm-choice" data-c="${escapeHtml(String(c))}">${escapeHtml(String(c))}</button>`).join('')}
            </div>
          </div>
        `;
      }
      // moves phase
      return `
        <div class="bm-q-row">
          <div class="bm-q-text">Pilih jurus untuk menyerang ${escapeHtml(opp.name)}:</div>
          <div class="bm-moves" data-pidx="${playerIdx}">
            ${me.moves.map((mv, mi) => {
              const tm = typeMult(mv.type, opp.type);
              const eff = effLabel(tm);
              const effCls = tm >= 1.5 ? ' super-eff' : (tm <= 0.75 ? ' resist-eff' : '');
              return `
                <button class="bm-move${effCls}" data-mi="${mi}">
                  <div class="bm-move-name">${escapeHtml(mv.name)}</div>
                  <div class="bm-move-meta">
                    <span class="bm-real-move-type" data-mt="${mv.type}">${mv.type}</span>
                    <span class="bm-real-move-pwr">PWR ${mv.pwr}</span>
                    ${mv.type === me.type ? '<span class="bm-real-stab">⭐</span>' : ''}
                    ${eff ? `<span class="bm-real-move-eff">${eff}</span>` : ''}
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    function wireActiveZone () {
      const activeZone = root.querySelector(`.bm-qzone[data-state="active"]`);
      if (!activeZone) return;
      if (state.phase === 'question') {
        activeZone.querySelectorAll('.bm-choice').forEach(b => {
          b.addEventListener('click', () => {
            const picked = b.getAttribute('data-c');
            const q = root._questions[state.turn];
            onAnswer(picked, b, q, state.turn);
          });
        });
      } else if (state.phase === 'moves') {
        activeZone.querySelectorAll('.bm-move').forEach(b => {
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
      btn.parentElement.querySelectorAll('.bm-choice').forEach(b => b.setAttribute('disabled',''));
      if (isCorrect) {
        sfxCorrect();
        setTimeout(() => {
          state.phase = 'moves';
          renderRoot();
        }, 650);
      } else {
        sfxWrong();
        btn.parentElement.querySelectorAll('.bm-choice').forEach(b => {
          if (b.getAttribute('data-c') === String(q.ans)) b.classList.add('correct');
        });
        setTimeout(() => {
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
      // Attack animation FIRST, then apply damage at impact.
      runAttackAnimation(state.turn, move, dmg, tm, () => {
        def.hp = Math.max(0, def.hp - dmg);
        sfxKO();
        // Update HP bars + texts in BOTH halves (both views show both HPs)
        updateHpDisplays();
        setTimeout(() => {
          if (def.hp <= 0) {
            playFaintAnimation(1 - state.turn, () => finishMatch(state.turn));
            return;
          }
          // Turn passes — next player's question phase
          root._questions = null;
          state.turn = 1 - state.turn;
          state.phase = 'question';
          renderRoot();
        }, 850);
      });
    }

    function runAttackAnimation (attackerIdx, move, dmg, tm, done) {
      // Shared arena — attacker/defender map to .bm-arena-self / .bm-arena-opp.
      // P1 (index 0) is .bm-arena-self (bottom-left), P2 (index 1) is .bm-arena-opp (top-right).
      const arena = root.querySelector('.bm-arena');
      const atkSelector = attackerIdx === 0 ? '.bm-arena-self-img, .bm-arena-self-sprite' : '.bm-arena-opp-img, .bm-arena-opp-sprite';
      const defPanelSel = attackerIdx === 0 ? '.bm-arena-opp' : '.bm-arena-self';
      const attackerSprite = arena && arena.querySelector(atkSelector);
      const defenderPanel  = arena && arena.querySelector(defPanelSel);
      if (attackerSprite) {
        attackerSprite.classList.add('bm-attack-lunge');
        setTimeout(() => attackerSprite.classList.remove('bm-attack-lunge'), 600);
      }
      if (defenderPanel) {
        setTimeout(() => {
          defenderPanel.classList.add('bm-defender-shake');
          setTimeout(() => defenderPanel.classList.remove('bm-defender-shake'), 360);
        }, 300);
      }
      // Move-type screen tint
      const tint = document.createElement('div');
      const typeColor = ({
        fire: '#F97316', water: '#06B6D4', grass: '#10B981',
        electric: '#FCD34D', normal: '#FFFFFF', fairy: '#F472B6'
      })[move.type] || '#FFFFFF';
      tint.style.cssText = `
        position: fixed; inset: 0; z-index: 9150; pointer-events: none;
        background: radial-gradient(circle, ${typeColor}25 0%, transparent 60%);
        opacity: 0; transition: opacity 200ms ease;
      `;
      document.body.appendChild(tint);
      requestAnimationFrame(() => { tint.style.opacity = '1'; });
      setTimeout(() => { tint.style.opacity = '0'; }, 380);
      setTimeout(() => { try { tint.remove(); } catch (e) {} }, 700);

      // Damage number float-up at defender panel
      setTimeout(() => {
        if (defenderPanel) {
          const r = defenderPanel.getBoundingClientRect();
          spawnDamageNumber(r.left + r.width * 0.7, r.top + r.height * 0.5, dmg, tm);
        }
        // Super-effective extra flash
        if (tm >= 1.5) screenFlash('#FCD34D', 120);
      }, 360);

      // Done at ~700ms after the lunge → applies damage in caller
      setTimeout(done, 750);
    }

    function spawnDamageNumber (x, y, dmg, tm) {
      const el = document.createElement('div');
      const color = tm >= 1.5 ? '#FCD34D' : (tm <= 0.75 ? '#FB923C' : '#67E8F9');
      const effTxt = effLabel(tm);
      el.style.cssText = `
        position: fixed; left: ${x - 60}px; top: ${y}px;
        z-index: 9300; pointer-events: none;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(36px, 8vw, 64px);
        color: ${color};
        text-shadow: 0 4px 14px rgba(0,0,0,0.6);
        animation: bmDmgFloat 1100ms cubic-bezier(0.22,0.61,0.36,1) forwards;
      `;
      el.innerHTML = `-${dmg}` + (effTxt ? `<div style="font-size:0.40em; margin-top:4px;">${effTxt}</div>` : '');
      document.body.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch (e) {} }, 1200);
    }

    function screenFlash (color, dur) {
      const f = document.createElement('div');
      f.style.cssText = `
        position: fixed; inset: 0; z-index: 9200; pointer-events: none;
        background: ${color}; opacity: 0.55;
        transition: opacity ${dur || 200}ms ease-out;
      `;
      document.body.appendChild(f);
      requestAnimationFrame(() => { f.style.opacity = '0'; });
      setTimeout(() => { try { f.remove(); } catch (e) {} }, (dur || 200) + 50);
    }

    function updateHpDisplays () {
      // Single shared arena — one set of HP fills to update (P1 = self, P2 = opp).
      const arena = root.querySelector('.bm-arena');
      if (!arena) return;
      const p1 = state.pokes[0];
      const p2 = state.pokes[1];
      const p1Fill = arena.querySelector('.bm-arena-self .bm-hp-fill');
      const p1Txt  = arena.querySelector('.bm-arena-self .bm-hp-text');
      const p2Fill = arena.querySelector('.bm-arena-opp .bm-hp-fill');
      const p2Txt  = arena.querySelector('.bm-arena-opp .bm-hp-text');
      if (p1Fill) { p1Fill.style.width = (p1.hp / p1.hpMax * 100) + '%'; p1Fill.className = 'bm-hp-fill ' + hpColorClass(p1.hp, p1.hpMax); }
      if (p1Txt)  { p1Txt.textContent = p1.hp + '/' + p1.hpMax; }
      if (p2Fill) { p2Fill.style.width = (p2.hp / p2.hpMax * 100) + '%'; p2Fill.className = 'bm-hp-fill ' + hpColorClass(p2.hp, p2.hpMax); }
      if (p2Txt)  { p2Txt.textContent = p2.hp + '/' + p2.hpMax; }
    }

    function playFaintAnimation (faintedIdx, done) {
      // Single shared arena — fainted Pokemon = the loser's sprite. P1 in self slot, P2 in opp slot.
      const arena = root.querySelector('.bm-arena');
      if (!arena) { setTimeout(done, 900); return; }
      const sel = faintedIdx === 0 ? '.bm-arena-self-img, .bm-arena-self-sprite' : '.bm-arena-opp-img, .bm-arena-opp-sprite';
      const target = arena.querySelector(sel);
      if (target) target.classList.add('bm-faint');
      setTimeout(done, 900);
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
      /* ── Mirrors original .g10-field battle style (style.css:2554) ── */
      .bm-pvp-real {
        position: fixed; inset: 0; z-index: 9100;
        font-family: 'Inter', system-ui, sans-serif;
        color: #111;
        overflow: hidden;
        background: #87CEEB;
      }
      .bm-pvp-real > * { position: relative; z-index: 1; }
      .bm-real-exit {
        position: fixed; top: 8px; left: 8px; z-index: 9105;
        background: rgba(0,0,0,0.70);
        width: 36px; height: 36px;
        font-size: 18px;
      }

      /* ── FIXED 20/60/20 GRID — owner spec ──
         20vh top q-zone + 60vh shared arena (NEVER moves) + 20vh bottom q-zone.
         When turn switches, only the q-zone roles swap. Arena stays put. */
      .bm-stage-grid {
        display: grid;
        grid-template-rows: 20vh 60vh 20vh;
        height: 100dvh; max-height: 100svh;
      }

      /* ── SHARED ARENA — both Pokemon in one view ── */
      .bm-arena {
        position: relative; overflow: hidden;
        background: linear-gradient(180deg,#6bbfee 0%,#a8d8f8 32%,#a0d870 46%,#5a9e3a 65%,#3e7028 100%);
      }
      .bm-arena::before {
        content: ''; position: absolute; inset: -10% -5%;
        background: url('/Dunia-Emosi/assets/bg-pokemon-battle.webp') center center/cover no-repeat;
        opacity: 0.55; pointer-events: none;
      }
      /* Opponent (P2) — top-right (mirrors .g10-espr-wrap) */
      .bm-arena-opp {
        position: absolute; top: 4%; right: 3%; z-index: 2;
        display: flex; flex-direction: column-reverse; align-items: flex-end;
        gap: 4px; max-width: 56%;
      }
      /* Self (P1) — bottom-left (mirrors .g10-pspr-wrap) */
      .bm-arena-self {
        position: absolute; bottom: 4%; left: 3%; z-index: 2;
        display: flex; flex-direction: column; align-items: flex-start;
        gap: 4px; max-width: 60%;
      }
      .bm-arena-opp-img, .bm-arena-self-img {
        /* Responsive sprite ~44vw / 22vh — identical to original .g10-espr / .g10-pspr */
        width: min(44vw, 22vh); height: min(44vw, 22vh);
        object-fit: contain; max-width: 100%; max-height: 100%;
        animation: bmSpriteBob 2200ms ease-in-out infinite;
      }
      .bm-arena-opp-img {
        --flip: -1; transform: scaleX(-1);
        filter: drop-shadow(0 6px 18px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(255,220,50,0.45));
      }
      .bm-arena-self-img {
        --flip: 1; transform: scaleX(1);
        filter: drop-shadow(0 6px 18px rgba(0,0,0,0.7)) drop-shadow(0 0 10px rgba(255,220,50,0.45));
      }
      .bm-arena-opp-sprite, .bm-arena-self-sprite {
        font-size: clamp(96px, 20vh, 180px); line-height: 1;
        filter: drop-shadow(0 6px 14px rgba(0,0,0,0.5));
      }

      /* DS-style info card (mirrors .g10-infobox @ style.css:2564) */
      .bm-info-card {
        background: rgba(248,248,240,0.97);
        border: 2.5px solid #444; border-radius: 10px;
        padding: 5px 9px 6px;
        box-shadow: 3px 3px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.9);
        min-width: 138px; max-width: 175px;
        color: #111;
      }
      .bm-info-name {
        font-family: 'Fredoka One', cursive; font-size: 13px; color: #111;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .bm-info-chips { display: flex; flex-wrap: wrap; gap: 3px; margin: 3px 0 4px; }
      .bm-type-chip {
        display: inline-flex; align-items: center; gap: 3px;
        padding: 1px 7px; border-radius: 100px;
        font-size: 9px; font-weight: 800;
        color: #fff; letter-spacing: 0.3px;
        text-transform: uppercase;
        text-shadow: 0 1px 1px rgba(0,0,0,0.35);
      }
      .bm-weak-chip {
        display: inline-flex; align-items: center; gap: 3px;
        padding: 1px 7px; border-radius: 100px;
        font-size: 9px; font-weight: 800;
        color: #7c2d12;
        background: #FED7AA; border: 1px solid #F97316;
        text-transform: uppercase; letter-spacing: 0.2px;
      }
      .bm-weak-chip.bm-weak-none {
        background: #E0E7FF; color: #312E81; border-color: #818CF8;
      }

      /* HP row (mirrors .g10-hp-row + .g10-hp-track + .g10-hp-fill) */
      .bm-hp-row { display: flex; align-items: center; gap: 4px; }
      .bm-hp-lbl {
        font-size: 10px; font-weight: 900; color: #333;
        font-family: monospace; min-width: 14px;
      }
      .bm-hp-bar {
        flex: 1; height: 8px;
        background: #d0d0c0; border-radius: 100px;
        border: 1px solid #aaa; overflow: hidden;
      }
      .bm-hp-fill {
        height: 100%; border-radius: 100px;
        background: #52D058;
        transition: width 0.6s cubic-bezier(0.4,0,0.2,1), background 0.4s ease;
        position: relative; overflow: hidden;
      }
      .bm-hp-fill::after {
        content: ''; position: absolute; top: 0; left: -100%;
        width: 55%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
        animation: bmHpShine 1.8s ease-in-out infinite;
      }
      .bm-hp-fill.med { background: #F8C030; }
      .bm-hp-fill.low { background: #E83030; animation: bmHpBlink 0.7s ease-in-out infinite; }
      .bm-hp-text {
        font-size: 9px; font-weight: 700; color: #555;
        font-family: monospace; text-align: right;
      }

      /* ── Q-ZONE (top + bottom) ── */
      .bm-qzone {
        position: relative; overflow: hidden;
        background: rgba(14,14,30,0.96);
        border-top: 2px solid rgba(255,255,255,0.07);
        display: grid; place-items: center;
        padding: 6px 10px;
      }
      .bm-qzone-top { border-top: none; border-bottom: 2px solid rgba(255,255,255,0.07); }
      .bm-qzone-inner {
        width: 100%; max-width: 480px;
        display: grid; place-items: center;
      }
      .bm-qzone-top .bm-qzone-inner { transform: rotate(180deg); transform-origin: center; }
      .bm-qzone[data-state="active"]   .bm-qzone-wait { display: none; }
      .bm-qzone[data-state="inactive"] .bm-qzone-inner { visibility: hidden; }
      .bm-qzone-wait {
        position: absolute; inset: 0;
        display: grid; place-items: center;
        background: linear-gradient(180deg, rgba(11,18,38,0.97), rgba(19,26,51,0.99));
        backdrop-filter: blur(12px);
        font-family: 'Fredoka One', cursive;
        color: #FCD34D;
        font-size: clamp(16px, 4vw, 24px);
        text-align: center;
        z-index: 3;
        letter-spacing: 0.5px;
      }
      .bm-qzone-top[data-state="inactive"] .bm-qzone-wait { transform: rotate(180deg); }
      .bm-qzone-pname {
        font-family: 'Fredoka One', cursive; font-size: 13px;
        color: #FCD34D;
      }
      .bm-q-row { width: 100%; display: flex; flex-direction: column; gap: 6px; }
      .bm-q-text {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(16px, 4.5vw, 26px);
        text-align: center;
        color: #fff;
        text-shadow: 0 2px 12px rgba(139,92,246,0.55);
        letter-spacing: 0.5px;
      }
      .bm-attack-lunge {
        animation: bmAttackLunge 600ms cubic-bezier(0.34,1.56,0.64,1) !important;
      }
      @keyframes bmAttackLunge {
        0%   { transform: translateX(0); }
        35%  { transform: translateX(60px) scale(1.08); }
        70%  { transform: translateX(70px) scale(1.10); }
        100% { transform: translateX(0); }
      }
      .bm-defender-shake {
        animation: bmDefShake 360ms ease;
      }
      @keyframes bmDefShake {
        0%, 100% { transform: translateX(0); }
        20%      { transform: translateX(-8px); }
        40%      { transform: translateX(7px); }
        60%      { transform: translateX(-5px); }
        80%      { transform: translateX(4px); }
      }
      .bm-faint {
        animation: bmFaint 900ms cubic-bezier(0.4,0,0.68,0.06) forwards !important;
      }
      @keyframes bmFaint {
        0%   { transform: rotate(0) translateY(0); opacity: 1; }
        100% { transform: rotate(-90deg) translateY(80px); opacity: 0; }
      }
      @keyframes bmDmgFloat {
        0%   { transform: translateY(0) scale(0.5); opacity: 0; }
        30%  { transform: translateY(-20px) scale(1.2); opacity: 1; }
        100% { transform: translateY(-80px) scale(1.0); opacity: 0; }
      }
      @keyframes bmSpriteBob {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-6px); }
      }
      /* Shared HP-bar shine + blink keyframes */
      @keyframes bmHpShine { 0% { left: -100%; } 100% { left: 200%; } }
      @keyframes bmHpBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }

      /* ── Pastel choice buttons — owner spec, with ORIGINAL G13C 5px-raised effect ── */
      .bm-choices, .bm-moves {
        display: grid; grid-template-columns: repeat(2, 1fr);
        gap: 8px; width: 100%; max-width: 420px;
        margin: 0 auto;
      }
      .bm-choice {
        padding: 12px 8px;
        border: 2px solid #111;
        border-radius: 14px;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(18px, 4.5vw, 24px);
        color: #1F2937;
        box-shadow: 0 5px 0 var(--btn-shadow);
        cursor: pointer; position: relative;
        transition: transform 120ms, box-shadow 120ms;
      }
      .bm-choice:nth-child(1) { background:#DDD6FE; --btn-shadow:#7C3AED; }  /* lavender */
      .bm-choice:nth-child(2) { background:#A7F3D0; --btn-shadow:#059669; }  /* mint     */
      .bm-choice:nth-child(3) { background:#FED7AA; --btn-shadow:#D97706; }  /* peach    */
      .bm-choice:nth-child(4) { background:#FBCFE8; --btn-shadow:#BE185D; }  /* rose     */
      .bm-choice:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--btn-shadow); }
      /* Correct: scale-up bounce + cyan glow + dark-green base — preserves G10/G13C effect */
      .bm-choice.correct {
        background: linear-gradient(135deg,#059669,#10B981) !important;
        border-color: #2DD4BF !important; color: #fff !important;
        box-shadow: 0 0 22px rgba(45,212,191,0.55), 0 5px 0 #047857 !important;
        animation: bmChoiceCorrect 0.42s cubic-bezier(0.34,1.56,0.64,1);
      }
      /* Wrong: horizontal shake + rose glow */
      .bm-choice.wrong {
        background: linear-gradient(135deg,#DC2626,#EF4444) !important;
        border-color: #F43F5E !important; color: #fff !important;
        box-shadow: 0 0 22px rgba(244,63,94,0.50), 0 5px 0 #991B1B !important;
        animation: bmChoiceWrong 0.36s ease;
      }
      @keyframes bmChoiceCorrect { 0%,100% { transform: scale(1); } 50% { transform: scale(1.18); } }
      @keyframes bmChoiceWrong {
        0%, 100% { transform: translateX(0); }
        25%      { transform: translateX(-7px); }
        75%      { transform: translateX(7px); }
      }

      /* ── Move buttons — pastel-anchored, same 5px-raised effect ── */
      .bm-move {
        padding: 9px 10px;
        border: 2px solid #111;
        border-radius: 12px;
        background: #FEF3C7; --btn-shadow: #F59E0B;
        color: #1F2937;
        font-family: 'Fredoka One', cursive;
        text-align: left; cursor: pointer; position: relative;
        box-shadow: 0 5px 0 var(--btn-shadow);
        transition: transform 120ms, box-shadow 120ms;
      }
      .bm-move:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--btn-shadow); }
      .bm-move-name { font-size: 13px; margin-bottom: 3px; color: #111; }
      .bm-move-meta {
        display: flex; flex-wrap: wrap; gap: 3px;
        font-size: 8px; letter-spacing: 0.2px; text-transform: uppercase;
      }
      /* Mirror G10 super-eff (✨ green pulse) / resist-eff (💤 dashed amber) standards */
      .bm-move.super-eff {
        background: #BBF7D0 !important; --btn-shadow: #16A34A !important;
        border-color: #16A34A !important;
        animation: bmMoveSuperPulse 1.6s ease-in-out infinite;
      }
      .bm-move.super-eff::before {
        content: '✨'; position: absolute; top: 4px; right: 6px;
        font-size: 14px; text-shadow: 0 0 6px rgba(255,255,255,0.7);
      }
      .bm-move.resist-eff {
        opacity: 0.80;
        background: #FEF3C7 !important;
        border: 2px dashed #D97706 !important;
      }
      .bm-move.resist-eff::before {
        content: '💤'; position: absolute; top: 4px; right: 6px;
        font-size: 14px;
      }
      @keyframes bmMoveSuperPulse {
        0%,100% { box-shadow: 0 5px 0 var(--btn-shadow), 0 0 12px rgba(22,163,74,0.45); }
        50%     { box-shadow: 0 5px 0 var(--btn-shadow), 0 0 22px rgba(22,163,74,0.85); }
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
