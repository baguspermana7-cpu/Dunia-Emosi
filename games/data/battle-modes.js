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
        background: url('${_ASSET_BASE}assets/bg-pokemon-battle.webp') center center/cover no-repeat;
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

      /* ── Tournament setup + bracket — DS-card cohesion (owner: "warnanya blend") ── */
      .bm-tour-step h2 {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(22px, 5vw, 32px);
        text-align: center;
        color: #fff;
        text-shadow: 2px 2px 0 rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.45);
        letter-spacing: 0.5px;
        margin: 8px 0 18px;
      }
      .bm-tour-count {
        display: flex; gap: 14px; justify-content: center; margin-bottom: 22px;
        flex-wrap: wrap;
      }
      .bm-tour-count-btn {
        padding: 16px 22px;
        background: rgba(248,248,240,0.97);
        border: 3px solid #444;
        border-radius: 14px;
        color: #111;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(22px, 5vw, 30px);
        cursor: pointer;
        min-width: 96px;
        box-shadow: 4px 4px 0 rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.95);
        transition: transform 180ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 180ms;
      }
      .bm-tour-count-btn:hover { transform: translate(-2px,-4px); box-shadow: 6px 6px 0 rgba(0,0,0,0.32); }
      .bm-tour-count-btn:active { transform: translate(2px,2px); box-shadow: 1px 1px 0 rgba(0,0,0,0.30); }
      .bm-tour-names {
        max-width: 480px; margin: 0 auto;
        display: flex; flex-direction: column; gap: 12px;
      }
      .bm-tour-name-row {
        display: flex; gap: 10px; align-items: center;
        background: rgba(248,248,240,0.97);
        border: 2.5px solid #444;
        border-radius: 12px; padding: 10px 12px;
        box-shadow: 3px 3px 0 rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.95);
      }
      .bm-tour-name-badge {
        font-family: 'Fredoka One', cursive;
        padding: 4px 10px; border-radius: 999px;
        font-size: 12px; flex-shrink: 0;
        border: 2px solid #111; color: #fff;
        box-shadow: 1px 1px 0 #111;
      }
      .bm-tour-name-input {
        flex: 1; min-width: 0;
        background: transparent;
        border: none;
        color: #111;
        font-family: 'Fredoka One', cursive;
        font-size: 18px;
        outline: none;
      }
      .bm-tour-name-input::placeholder { color: rgba(17,24,39,0.45); }
      .bm-tour-go {
        display: block;
        margin: 24px auto 0;
        padding: 14px 36px;
        background: #A7F3D0;
        color: #064E3B;
        border: 3px solid #111;
        border-radius: 16px;
        font-family: 'Fredoka One', cursive;
        font-size: 18px;
        cursor: pointer;
        box-shadow: 0 6px 0 #059669;
        transition: transform 120ms, box-shadow 120ms;
      }
      .bm-tour-go:active { transform: translateY(4px); box-shadow: 0 1px 0 #059669; }
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
        color: #fff;
        text-shadow: 1px 1px 0 rgba(0,0,0,0.55);
        margin-bottom: 4px;
        text-align: center;
        letter-spacing: 1px;
      }
      .bm-bracket-match {
        background: rgba(248,248,240,0.97);
        border: 2.5px solid #444;
        border-radius: 12px;
        padding: 10px 14px;
        display: flex; flex-direction: column; gap: 4px;
        box-shadow: 3px 3px 0 rgba(0,0,0,0.30);
      }
      .bm-bracket-match[data-state="current"] {
        border: 3px solid #F59E0B;
        animation: bmGlow 1200ms ease-in-out infinite;
      }
      @keyframes bmGlow {
        0%,100% { box-shadow: 3px 3px 0 rgba(0,0,0,0.30), 0 0 0 0 rgba(245,158,11,0.65); }
        50%     { box-shadow: 3px 3px 0 rgba(0,0,0,0.30), 0 0 0 14px rgba(245,158,11,0); }
      }
      .bm-bracket-match[data-state="done"] { opacity: 0.65; }
      .bm-bracket-slot {
        display: flex; gap: 8px; align-items: center;
        padding: 4px 0;
        font-family: 'Fredoka One', cursive;
        font-size: 16px;
        color: #111;
      }
      .bm-bracket-slot.winner { color: #047857; }
      .bm-bracket-slot.loser  { color: rgba(17,24,39,0.45); text-decoration: line-through; }
      .bm-bracket-slot.loser .bm-bracket-team { opacity: 0.5; filter: grayscale(0.7); }
      .bm-bracket-slot-line { display: block; }
      .bm-bracket-vs { color: rgba(17,24,39,0.50); font-size: 11px; text-align: center; margin: 2px 0; font-weight: 700; }
      .bm-bracket-team {
        display: flex; gap: 3px; margin-top: 4px;
        flex-wrap: wrap;
      }
      .bm-bracket-mini {
        width: 22px; height: 22px;
        border-radius: 50%;
        border: 1.5px solid #111;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 12px;
        color: #fff;
        text-shadow: 0 1px 1px rgba(0,0,0,0.55);
        box-shadow: 1px 1px 0 rgba(0,0,0,0.30);
      }

      .bm-tour-go-match {
        display: block;
        margin: 18px auto 0;
        padding: 12px 28px;
        background: #FBCFE8;
        color: #831843;
        border: 3px solid #111;
        border-radius: 14px;
        font-family: 'Fredoka One', cursive;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 5px 0 #BE185D;
        transition: transform 120ms, box-shadow 120ms;
      }
      .bm-tour-go-match:active { transform: translateY(4px); box-shadow: 0 1px 0 #BE185D; }

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
  // A5: time-out — 3-note descending blip, distinct from sfxWrong so the player
  // knows the turn ended because of the clock, not a wrong answer.
  function sfxTimeout () {
    _tone(440, 0.12, 'square', 0.14);
    setTimeout(() => _tone(330, 0.14, 'square', 0.13), 110);
    setTimeout(() => _tone(220, 0.22, 'square', 0.16), 230);
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
  // Sprite path resolution must work on BOTH:
  //   - GitHub Pages (baguspermana7-cpu.github.io/Dunia-Emosi/games/...) — needs /Dunia-Emosi/ prefix
  //   - Vercel (dunia-emosi-z2ss.vercel.app/games/...) — root-relative, no prefix
  // Owner: "di vercel bukan gambar pokemon tapi emoji" — fallback firing because
  // the hardcoded /Dunia-Emosi/ path was 404 on Vercel. Detect from location.
  var _ASSET_BASE = (function () {
    try {
      return location.pathname.indexOf('/Dunia-Emosi/') === 0 ? '/Dunia-Emosi/' : '/';
    } catch (e) { return '/'; }
  })();
  function spritePath (id, slug) {
    var padded = String(id).padStart(4, '0');
    return _ASSET_BASE + 'assets/Pokemon/pokemondb_hd_alt2/' + padded + '_' + slug + '.webp';
  }
  function bgPath (file) {
    return _ASSET_BASE + 'assets/' + file;
  }
  // Balance pass for A5 timer mechanic. HP 80, move pwr tuned so a typical match
  // lasts 4-6 hits per side (≈ 2 minutes). Math:
  //   best hit  (super+STAB+1s):  pwr 34 × 1.25 × 1.20 × 1.27 ≈ 65 dmg → ~1.5 hits to KO
  //   typical   (STAB, 5s):       pwr 28 × 1.25 × 1.00 × 1.15 ≈ 40 dmg → 2 hits to KO
  //   neutral   (typed, 5s):      pwr 28 × 1.00 × 1.00 × 1.15 ≈ 32 dmg → 3 hits to KO
  //   weak      (tackle, 5s):     pwr 18 × 1.00 × 1.00 × 1.15 ≈ 20 dmg → 4 hits to KO
  //   worst     (resist, slow):   pwr 18 × 1.00 × 0.75 × 1.00 ≈ 13 dmg → 7 hits to KO
  // Owner: "agar tidak terlalu panjang tapi juga proper dengan mechanism".
  const POKE_ROSTER = [
    { id:25,  name:'Pikachu',    emoji:'⚡', slug:'pikachu',    type:'electric', color:'#FCD34D', moves:[
      { name:'Tackle',         type:'normal',   pwr:18 },
      { name:'Quick Attack',   type:'normal',   pwr:22 },
      { name:'Thunder Shock',  type:'electric', pwr:28 },
      { name:'Thunderbolt',    type:'electric', pwr:34 }
    ]},
    { id:4,   name:'Charmander', emoji:'🦎', slug:'charmander', type:'fire', color:'#F97316', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Scratch',        type:'normal', pwr:22 },
      { name:'Ember',          type:'fire',   pwr:28 },
      { name:'Flamethrower',   type:'fire',   pwr:34 }
    ]},
    { id:1,   name:'Bulbasaur',  emoji:'🌿', slug:'bulbasaur', type:'grass', color:'#10B981', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Leech Seed',     type:'grass',  pwr:22 },
      { name:'Vine Whip',      type:'grass',  pwr:28 },
      { name:'Razor Leaf',     type:'grass',  pwr:34 }
    ]},
    { id:7,   name:'Squirtle',   emoji:'🐢', slug:'squirtle', type:'water', color:'#06B6D4', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Bubble',         type:'water',  pwr:22 },
      { name:'Water Gun',      type:'water',  pwr:28 },
      { name:'Hydro Pump',     type:'water',  pwr:34 }
    ]},
    { id:133, name:'Eevee',      emoji:'🦊', slug:'eevee', type:'normal', color:'#A78BFA', moves:[
      { name:'Tackle',         type:'normal', pwr:20 },
      { name:'Quick Attack',   type:'normal', pwr:24 },
      { name:'Bite',           type:'normal', pwr:30 },
      { name:'Swift',          type:'normal', pwr:34 }
    ]},
    { id:39,  name:'Jigglypuff', emoji:'🎀', slug:'jigglypuff', type:'fairy', color:'#F472B6', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Pound',          type:'normal', pwr:22 },
      { name:'Disarming Voice',type:'fairy',  pwr:28 },
      { name:'Hyper Voice',    type:'fairy',  pwr:34 }
    ]},
    { id:37,  name:'Vulpix',     emoji:'🌟', slug:'vulpix', type:'fire', color:'#EF4444', moves:[
      { name:'Tackle',         type:'normal', pwr:18 },
      { name:'Quick Attack',   type:'normal', pwr:22 },
      { name:'Ember',          type:'fire',   pwr:28 },
      { name:'Fire Spin',      type:'fire',   pwr:34 }
    ]},
    { id:172, name:'Pichu',      emoji:'⭐', slug:'pichu', type:'electric', color:'#FBBF24', moves:[
      { name:'Tackle',         type:'normal',   pwr:18 },
      { name:'Charm',          type:'fairy',    pwr:22 },
      { name:'Thunder Shock',  type:'electric', pwr:28 },
      { name:'Volt Tackle',    type:'electric', pwr:34 }
    ]}
  ];
  // A1 Pre-built packages — consume the SHARED window.POKE_PACKAGES (49 packages,
  // identical to G13C Adventure). Owner: "Ambil dan gunakan package picker yang
  // sudah existing di Gym Pokémon agar isinya konsisten dengan yang ada di sana."
  // Loaded by games/data/poke-packages.js.
  function getPokePackages () {
    return (typeof window !== 'undefined' && Array.isArray(window.POKE_PACKAGES))
      ? window.POKE_PACKAGES
      : [];
  }

  // Region label + emoji map for grouping the 49 packages in the picker.
  const REGION_META = {
    kanto:  { name:'Kanto',  emoji:'🔥' },
    johto:  { name:'Johto',  emoji:'🌅' },
    hoenn:  { name:'Hoenn',  emoji:'🌊' },
    sinnoh: { name:'Sinnoh', emoji:'❄️' },
    unova:  { name:'Unova',  emoji:'🏙️' },
    kalos:  { name:'Kalos',  emoji:'🗼' },
    alola:  { name:'Alola',  emoji:'🌴' },
    galar:  { name:'Galar',  emoji:'🏰' },
    paldea: { name:'Paldea', emoji:'🌵' }
  };
  const REGION_ORDER = ['kanto','johto','hoenn','sinnoh','unova','kalos','alola','galar','paldea'];

  // Tier badge map — G13C ships base / final / mega tiers. Mirror visually.
  const TIER_META = {
    base:  { label:'EVO 1', color:'#22c55e' },
    final: { label:'FINAL', color:'#3b82f6' },
    mega:  { label:'MEGA',  color:'#a855f7' }
  };

  // A1 Random — per-region random teams from the full 1025-Pokemon database.
  // Owner: "Random per region (random terus). Truly random yang tidak ada di ash."
  // Generation → Region mapping (canonical Pokedex). Click on a region card →
  // fresh random team drawn each time; non-deterministic.
  const RANDOM_REGIONS = [
    { gen:1, id:'kanto',  name:'Kanto',  emoji:'🍃', desc:'Region klasik Gen 1' },
    { gen:2, id:'johto',  name:'Johto',  emoji:'🌅', desc:'Region Gen 2' },
    { gen:3, id:'hoenn',  name:'Hoenn',  emoji:'🌊', desc:'Region tropis Gen 3' },
    { gen:4, id:'sinnoh', name:'Sinnoh', emoji:'❄️', desc:'Region salju Gen 4' },
    { gen:5, id:'unova',  name:'Unova',  emoji:'🏙️', desc:'Region modern Gen 5' },
    { gen:6, id:'kalos',  name:'Kalos',  emoji:'🗼', desc:'Region elegan Gen 6' },
    { gen:7, id:'alola',  name:'Alola',  emoji:'🌴', desc:'Region pantai Gen 7' },
    { gen:8, id:'galar',  name:'Galar',  emoji:'🏰', desc:'Region masa raja Gen 8' },
    { gen:9, id:'paldea', name:'Paldea', emoji:'🌵', desc:'Region gurun Gen 9' }
  ];

  // 18-type color table — Pokemon canonical palette (used in arena info card +
  // package thumbnails) so a randomly-generated bug/ghost/dragon Pokemon still
  // renders with its proper type accent.
  const TYPE_COLOR = {
    fire:'#F97316', water:'#06B6D4', grass:'#10B981', electric:'#FCD34D',
    normal:'#A8A878', fairy:'#F472B6', poison:'#A040A0', ground:'#E0C068',
    flying:'#A890F0', bug:'#A8B820', psychic:'#F85888', rock:'#B8A038',
    ghost:'#705898', ice:'#98D8D8', dragon:'#7038F8', dark:'#705848',
    fighting:'#C03028', steel:'#B8B8D0'
  };

  // Typed signature move-name templates per type (for procedurally-built
  // random Pokemon). Tackle + Quick Attack are added universally.
  const MOVE_NAMES = {
    fire:     ['Ember', 'Flamethrower'], water: ['Water Gun', 'Hydro Pump'],
    grass:    ['Vine Whip', 'Razor Leaf'], electric: ['Thunder Shock', 'Thunderbolt'],
    normal:   ['Bite', 'Body Slam'], fairy: ['Disarming Voice', 'Hyper Voice'],
    poison:   ['Poison Sting', 'Sludge Bomb'], ground: ['Mud Slap', 'Earthquake'],
    flying:   ['Gust', 'Air Slash'], bug: ['Bug Bite', 'X-Scissor'],
    psychic:  ['Confusion', 'Psychic'], rock: ['Rock Throw', 'Rock Slide'],
    ghost:    ['Lick', 'Shadow Ball'], ice: ['Powder Snow', 'Ice Beam'],
    dragon:   ['Twister', 'Dragon Pulse'], dark: ['Bite', 'Crunch'],
    fighting: ['Karate Chop', 'Brick Break'], steel: ['Metal Claw', 'Iron Head']
  };

  // Lazy Pokedex fetch — load once. Builds slug→id map so G13C packages
  // (which only ship slugs) can resolve to sprite filenames.
  let _pokeDB = null;
  let _slugToId = null;
  function loadPokeDB () {
    if (_pokeDB) return Promise.resolve(_pokeDB);
    const url = _ASSET_BASE + 'assets/Pokemon/pokemon-db.json';
    return fetch(url).then(r => r.json()).then(db => {
      _pokeDB = db;
      _slugToId = {};
      db.forEach(p => { _slugToId[p.slug] = p.id; });
      return db;
    });
  }
  function slugToId (slug) {
    if (_slugToId && _slugToId[slug]) return _slugToId[slug];
    // Fallback for Mega slugs like 'charizard-mega-x' → use base form 'charizard'.
    if (slug && _slugToId) {
      const base = slug.split('-')[0];
      if (_slugToId[base]) return _slugToId[base];
    }
    return 0;
  }

  // Build a single fresh Pokemon entry from a Pokedex row.
  function buildRandomPokemon (entry) {
    const type = entry.type;
    return {
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      type: type,
      color: TYPE_COLOR[type] || '#A8A878',
      emoji: '🎲',
      moves: [
        { name:'Tackle',       type:'normal', pwr:18 },
        { name:'Quick Attack', type:'normal', pwr:22 },
        { name:(MOVE_NAMES[type] || ['Strike'])[0],                type:type, pwr:28 },
        { name:(MOVE_NAMES[type] || ['Strike'])[1] || (MOVE_NAMES[type] || ['Strike'])[0], type:type, pwr:34 }
      ]
    };
  }

  // Build a fresh random team for the requested region (gen). Excludes the IDs
  // already in POKE_ROSTER so a "random" team never overlaps with Ash-style
  // starters — owner: "Truly random yang tidak ada di ash".
  const _EXCLUDED_IDS = new Set([25, 4, 1, 7, 133, 39, 37, 172]);
  function buildTeamFromRegion (gen, teamSize) {
    if (!_pokeDB) return [];
    const pool = _pokeDB.filter(p => p.gen === gen && !_EXCLUDED_IDS.has(p.id));
    if (!pool.length) return [];
    // Fisher-Yates shuffle (no Math.random bias) — truly random per click.
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
    }
    return shuffled.slice(0, teamSize).map(buildRandomPokemon).map(p => ({ ...p, hp:80, hpMax:80 }));
  }

  // Adapt G13C-format Pokemon to engine format: add id (from slug→id map), color
  // (from type), pwr on each move (derived from move-name heuristic + STAB).
  function adaptPkmFromG13C (pkm) {
    const moves = (pkm.moves || []).slice(0, 4).map(mv => {
      let pwr;
      const isWeak = /^(Tackle|Pound|Scratch|Bide|Withdraw|Growl|Tail Whip|Leer|Endure|Harden|Defense Curl|Smokescreen|Sand Attack|Sing|Howl|Rest|Recover|Heal Bell|Cotton Spore|Lick|Charm|Sweet Kiss|Mean Look|Protect|Astonish|Mimic|Disable|String Shot|Hypnosis|Supersonic|Screech|Confuse Ray|Mist Ball|Calm Mind|Teleport|Light Screen|Agility|Double Team|Spikes|Magnitude|Play Nice)$/.test(mv.name);
      const isQuick = /^(Quick Attack|Bite|Peck|Headbutt|Ember|Water Gun|Vine Whip|Thunder Shock|Confusion|Pound|Spark|Bubble|Absorb|Gust|Mud Slap|Bubble Beam|Mud Shot)$/.test(mv.name);
      if (isWeak) pwr = 18;
      else if (isQuick) pwr = 24;
      else if (mv.type === pkm.type) pwr = 32;   // STAB-typed signature
      else pwr = 28;
      return { name: mv.name, type: mv.type, pwr };
    });
    return {
      id: slugToId(pkm.slug),
      name: pkm.name,
      slug: pkm.slug,
      type: pkm.type,
      color: TYPE_COLOR[pkm.type] || '#A8A878',
      emoji: '⭐',
      hp: 80, hpMax: 80,
      moves
    };
  }

  // Build a fresh team from a package by id. Reads window.POKE_PACKAGES.
  function buildTeamFromPackage (pkgId, teamSize) {
    const packages = getPokePackages();
    const pkg = packages.find(p => p.id === pkgId) || packages[0];
    if (!pkg || !pkg.team) return [];
    return pkg.team.slice(0, teamSize).map(adaptPkmFromG13C);
  }

  // Type chart — element multiplier capped at 1.2× per owner spec ("elemen itu 1.2x max pengali").
  // Resist (0.75) + immune (0.5) floors preserved — defense still meaningful.
  const TYPE_CHART = {
    fire:     { grass: 1.2, water: 0.75, fire: 0.75 },
    water:    { fire: 1.2, grass: 0.75, water: 0.75, electric: 0.5 },
    grass:    { water: 1.2, fire: 0.75, grass: 0.75 },
    electric: { water: 1.2, electric: 0.75, grass: 0.75 },
    normal:   {},
    fairy:    {}
  };
  // Time multiplier curve — owner spec: "1 detik effectnya 1.3 (max pengali)".
  // Linear: 0ms → 1.30, 1000ms → 1.27, 5000ms → 1.15, 10000ms → 1.0. Auto-fail at 10000ms.
  const ANSWER_TIMEOUT_MS = 10000;
  function timeMultFromElapsed (elapsedMs) {
    if (elapsedMs == null || elapsedMs < 0) return 1.0;
    const raw = 1.3 - (elapsedMs / 1000) * 0.03;
    return Math.max(1.0, Math.min(1.3, raw));
  }
  function typeMult (moveType, defType) {
    const t = (TYPE_CHART[moveType] || {})[defType];
    return t == null ? 1.0 : t;
  }
  function calcDamage (atk, move, def, timeMult) {
    const stab = move.type === atk.type ? 1.25 : 1.0;
    const tm   = typeMult(move.type, def.type);
    const tMul = (typeof timeMult === 'number' && timeMult > 0) ? timeMult : 1.0;
    return Math.max(1, Math.floor(move.pwr * stab * tm * tMul));
  }
  function effLabel (mult) {
    if (mult >= 1.15) return 'Super Efektif! ✨';   // threshold tuned to 1.2× cap
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
  // WEAKNESS table — primary type's weakness. Used for the 🔻 Lemah chip.
  // Random Pokemon from full 1025 db may have any of 18 types; types not listed
  // here render as "Seimbang" (the chip code already handles that fallback).
  const WEAKNESS = {
    fire:     ['water'],
    water:    ['grass', 'electric'],
    grass:    ['fire'],
    electric: [],
    normal:   [],
    fairy:    [],
    poison:   ['ground', 'psychic'],
    ground:   ['water', 'grass', 'ice'],
    flying:   ['electric', 'ice', 'rock'],
    bug:      ['fire', 'flying', 'rock'],
    psychic:  ['bug', 'ghost', 'dark'],
    rock:     ['water', 'grass', 'fighting', 'ground', 'steel'],
    ghost:    ['ghost', 'dark'],
    ice:      ['fire', 'fighting', 'rock', 'steel'],
    dragon:   ['ice', 'dragon', 'fairy'],
    dark:     ['fighting', 'bug', 'fairy'],
    fighting: ['flying', 'psychic', 'fairy'],
    steel:    ['fire', 'fighting', 'ground']
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
    // A1 team mechanic — preload teams from opts.teams (Tournament passes pre-picked teams),
    // else default to Mixed Starter 6-team for both sides until pre-battle picker runs.
    const _initSize = opts.teamSize || 6;
    const _initTeams = opts.teams || [
      buildTeamFromPackage('mixed_starter', _initSize),
      buildTeamFromPackage('mixed_starter', _initSize)
    ];
    const state = {
      turn: 0,
      teams: _initTeams,
      activeIdx: [0, 0],
      teamSize: _initSize,
      switchForced: null,
      qType: opts.questionType || 'math',
      qLevel: opts.questionLevel || 5,
      // Pre-battle steps: 'size' → 'pick' → 'battle'. When opts.teams is supplied
      // (e.g. Tournament passes pre-picked teams), jump straight to 'battle'.
      preStep: opts.teams ? 'battle' : 'size',
      pickingPlayer: 0,
      // Per-turn phases — mirror G13C: each turn starts with the action menu,
      // then question (if Serang) or switch (if Ganti), then moves, then animating.
      phase: 'action',     // 'action' | 'question' | 'moves' | 'animating'
      questionStartedAt: 0,
      lastAnswerElapsed: [null, null],
      comboCount: [0, 0]
    };
    // Active Pokemon shorthand. ALWAYS use this — never read state.teams directly
    // outside engine internals.
    function activePoke (playerIdx) {
      return state.teams[playerIdx][state.activeIdx[playerIdx]];
    }
    let _timerRaf = 0;       // RAF handle for tickTimer
    let _timerExpired = false;

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
      // A1: pre-battle steps. Dispatch on state.preStep.
      if (state.preStep === 'size') { renderSizeStep(); return; }
      if (state.preStep === 'pick') { renderPickStep(); return; }

      const p1 = activePoke(0);
      const p2 = activePoke(1);

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
      // A5: start the 10-second answer timer when a fresh question phase shows.
      // (Move phase + animating phase don't tick — RAF self-stops.)
      if (state.phase === 'question' && !state.switchForced) {
        startQuestionTimer();
      } else {
        stopQuestionTimer();
      }
    }

    // ── A1 Pre-battle steps ────────────────────────────────────────────
    function renderSizeStep () {
      stopQuestionTimer();
      root.innerHTML = `
        <button class="bm-back bm-real-exit" data-exit>×</button>
        <div class="bm-prestep">
          <div class="bm-prestep-title">Pilih Mode Tim</div>
          <div class="bm-prestep-sub">Berapa Pokemon yang bertarung?</div>
          <div class="bm-size-grid">
            <button class="bm-size-card" data-size="3">
              <div class="bm-size-emoji">⚡</div>
              <div class="bm-size-name">Cepat</div>
              <div class="bm-size-count">3 Pokemon</div>
              <div class="bm-size-time">~5 menit</div>
            </button>
            <button class="bm-size-card bm-size-card-full" data-size="6">
              <div class="bm-size-emoji">🔥</div>
              <div class="bm-size-name">Lengkap</div>
              <div class="bm-size-count">6 Pokemon</div>
              <div class="bm-size-time">~10 menit</div>
            </button>
          </div>
        </div>
      `;
      root.querySelector('[data-exit]').addEventListener('click', exitMatch);
      root.querySelectorAll('.bm-size-card').forEach(b => {
        b.addEventListener('click', () => {
          const sz = parseInt(b.getAttribute('data-size'));
          state.teamSize = sz;
          state.preStep = 'pick';
          state.pickingPlayer = 0;
          renderRoot();
        });
      });
    }

    // Build picker HTML for the shared G13C 49 packages, grouped by region with
    // section headers + tier badges. Also appends the 9 🎲 Random region cards.
    function renderPkgPickerHtml (teamSize) {
      const all = getPokePackages();
      let html = '';
      // Group by region (per G13C convention)
      REGION_ORDER.forEach(regKey => {
        const inRegion = all.filter(p => p.region === regKey);
        if (!inRegion.length) return;
        const rmeta = REGION_META[regKey];
        html += `<div class="bm-section-label">${rmeta.emoji} ${rmeta.name}</div>`;
        html += `<div class="bm-pkg-grid">`;
        inRegion.forEach(pkg => {
          const tier = TIER_META[pkg.tier] || TIER_META.base;
          const tierBadge = `<span class="bm-pkg-tier" style="background:${tier.color};">${tier.label}</span>`;
          html += `
            <button class="bm-pkg-card" data-pkg="${pkg.id}" style="border-color:${pkg.color};">
              <div class="bm-pkg-head">
                <span class="bm-pkg-name">${escapeHtml(pkg.label)}</span>
                ${tierBadge}
              </div>
              <div class="bm-pkg-desc">${escapeHtml(pkg.series || '')}</div>
              <div class="bm-pkg-thumbs">
                ${pkg.team.slice(0, teamSize).map(p => {
                  const id = slugToId(p.slug);
                  const color = TYPE_COLOR[p.type] || '#A8A878';
                  return `<div class="bm-pkg-thumb" title="${escapeHtml(p.name)}" style="background:${color}22; border-color:${color};">
                    <img src="${spritePath(id, p.slug)}" alt="${escapeHtml(p.name)}"
                         onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'⭐',className:'bm-pkg-thumb-fallback'}))">
                  </div>`;
                }).join('')}
              </div>
            </button>
          `;
        });
        html += `</div>`;
      });
      // Random region cards (always at the bottom)
      html += `<div class="bm-section-label">🎲 Tim Acak · per Region (1025 Pokemon)</div>`;
      html += `<div class="bm-pkg-grid">`;
      RANDOM_REGIONS.forEach(reg => {
        html += `
          <button class="bm-pkg-card bm-pkg-random" data-region="${reg.id}" data-gen="${reg.gen}">
            <div class="bm-pkg-head">
              <span class="bm-pkg-emoji">${reg.emoji}</span>
              <span class="bm-pkg-name">Tim Acak ${reg.name}</span>
            </div>
            <div class="bm-pkg-desc">${reg.desc}</div>
            <div class="bm-pkg-thumbs bm-pkg-thumbs-random">
              ${Array.from({length: teamSize}).map(() => `<div class="bm-pkg-thumb bm-pkg-thumb-random"><span>🎲</span></div>`).join('')}
            </div>
          </button>
        `;
      });
      html += `</div>`;
      return html;
    }

    function wirePickerHandlers (root, playerIdx, advanceFn) {
      root.querySelectorAll('.bm-pkg-card[data-pkg]').forEach(b => {
        b.addEventListener('click', () => {
          const pkgId = b.getAttribute('data-pkg');
          state.teams[playerIdx] = buildTeamFromPackage(pkgId, state.teamSize);
          state.activeIdx[playerIdx] = 0;
          advanceFn(playerIdx);
        });
      });
      root.querySelectorAll('.bm-pkg-card[data-region]').forEach(b => {
        b.addEventListener('click', () => {
          const gen = parseInt(b.getAttribute('data-gen'));
          b.classList.add('bm-pkg-loading');
          loadPokeDB().then(() => {
            const team = buildTeamFromRegion(gen, state.teamSize);
            if (!team.length) { b.classList.remove('bm-pkg-loading'); return; }
            state.teams[playerIdx] = team;
            state.activeIdx[playerIdx] = 0;
            advanceFn(playerIdx);
          }).catch(err => {
            console.warn('[battle-modes] random region pick failed', err);
            b.classList.remove('bm-pkg-loading');
          });
        });
      });
    }

    function renderPickStep () {
      stopQuestionTimer();
      const playerIdx = state.pickingPlayer;
      const meName = opts.players[playerIdx].name;
      const badgeClass = playerIdx === 0 ? 'p1' : 'p2';
      // If pokemon-db isn't loaded yet, the slug→id map is null and all sprites
      // would fall back to file path 0000_{slug}.webp. Load FIRST, then render.
      const wasLoaded = !!_pokeDB;
      const draw = () => {
        root.innerHTML = `
          <button class="bm-back bm-real-exit" data-exit>×</button>
          <div class="bm-prestep">
            <div class="bm-prestep-header">
              <span class="bm-pvp-badge ${badgeClass}">${badgeClass.toUpperCase()}</span>
              <span class="bm-prestep-pname">Giliran <b>${escapeHtml(meName)}</b> memilih tim</span>
            </div>
            <div class="bm-prestep-sub">Pilih satu paket tim · ${state.teamSize} Pokemon</div>
            ${renderPkgPickerHtml(state.teamSize)}
          </div>
        `;
        root.querySelector('[data-exit]').addEventListener('click', exitMatch);
        wirePickerHandlers(root, playerIdx, advancePickStep);
      };
      if (wasLoaded) {
        draw();
      } else {
        // Show a quick loading state while the 19KB pokemon-db fetches.
        root.innerHTML = `
          <button class="bm-back bm-real-exit" data-exit>×</button>
          <div class="bm-prestep" style="padding-top:60px;">
            <div class="bm-prestep-title">📦 Memuat Pokedex…</div>
            <div class="bm-prestep-sub">Sebentar, sedang siapkan pakettim Pokemon.</div>
          </div>
        `;
        root.querySelector('[data-exit]').addEventListener('click', exitMatch);
        loadPokeDB().then(draw).catch(err => {
          console.warn('[battle-modes] pokedex load failed', err);
          draw();   // render anyway with placeholder sprites
        });
      }
    }

    function advancePickStep (playerIdx) {
      if (playerIdx === 0 && opts.players.length > 1) {
        state.pickingPlayer = 1;
        renderRoot();
      } else {
        state.preStep = 'battle';
        renderRoot();
      }
    }

    function startQuestionTimer () {
      stopQuestionTimer();
      _timerExpired = false;
      state.questionStartedAt = Date.now();
      const tick = () => {
        if (state.phase !== 'question' || _timerExpired) return;
        const elapsed = Date.now() - state.questionStartedAt;
        const pct = Math.max(0, 1 - elapsed / ANSWER_TIMEOUT_MS);
        const bars = root.querySelectorAll('.bm-qzone[data-state="active"] .bm-timer-fill');
        bars.forEach(b => {
          b.style.width = (pct * 100) + '%';
          b.className = 'bm-timer-fill' + (pct < 0.25 ? ' low' : pct < 0.5 ? ' mid' : '');
        });
        if (elapsed >= ANSWER_TIMEOUT_MS) {
          _timerExpired = true;
          onTimeout();
          return;
        }
        _timerRaf = requestAnimationFrame(tick);
      };
      _timerRaf = requestAnimationFrame(tick);
    }

    function stopQuestionTimer () {
      if (_timerRaf) { cancelAnimationFrame(_timerRaf); _timerRaf = 0; }
    }

    function onTimeout () {
      // Active player ran out of time — reveal correct, pass turn.
      sfxTimeout();
      const activeZone = root.querySelector('.bm-qzone[data-state="active"]');
      if (activeZone) {
        const q = root._questions && root._questions[state.turn];
        activeZone.querySelectorAll('.bm-choice').forEach(b => {
          b.setAttribute('disabled', '');
          if (q && b.getAttribute('data-c') === String(q.ans)) b.classList.add('correct');
        });
      }
      setTimeout(() => {
        root._questions = null;
        state.turn = 1 - state.turn;
        state.phase = 'question';
        renderRoot();
      }, 1200);
    }

    function renderBenchDots (playerIdx) {
      // A1: bench Pokéball dots row — mirrors G13C .hp-poke-dot.
      const team = state.teams[playerIdx];
      const active = state.activeIdx[playerIdx];
      return `<div class="bm-bench-dots">
        ${team.map((p, i) => `<div class="bm-bench-dot ${p.hp<=0?'fainted':''} ${i===active?'active':''}" title="${escapeHtml(p.name)} ${p.hp}/${p.hpMax}"></div>`).join('')}
      </div>`;
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
              ${renderBenchDots(1)}
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
              ${renderBenchDots(0)}
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
            <!-- A5: 10-second answer countdown — RAF-driven width update -->
            <div class="bm-timer-bar"><div class="bm-timer-fill" style="width:100%;"></div></div>
            <div class="bm-q-text">${escapeHtml(q.q)}</div>
            <div class="bm-choices" data-pidx="${playerIdx}">
              ${q.choices.map(c => `<button class="bm-choice" data-c="${escapeHtml(String(c))}">${escapeHtml(String(c))}</button>`).join('')}
            </div>
          </div>
        `;
      }
      // Forced switch (after faint) — show switch panel only, no other action.
      if (state.switchForced === playerIdx) {
        return renderSwitchPanel(playerIdx, false /*allowCancel*/);
      }
      // Voluntary switch panel — when player toggled it via "Ganti Pokemon"
      // from either the action menu or the move-pick row.
      if (root._switchOpen === playerIdx) {
        return renderSwitchPanel(playerIdx, true /*allowCancel*/);
      }
      // Action menu phase — owner: "Sebelum masuk ke pertanyaan, pemain diberikan
      // pilihan aksi: Serang / Ganti Pokemon." Mirror G13C action menu.
      if (state.phase === 'action') {
        const aliveBench = state.teams[playerIdx].filter((p, i) => i !== state.activeIdx[playerIdx] && p.hp > 0).length;
        return `
          <div class="bm-action-row">
            <div class="bm-action-prompt">Aksi giliranmu, <b>${escapeHtml(meName)}</b>?</div>
            <div class="bm-action-grid">
              <button class="bm-action-card bm-action-attack" data-action="attack">
                <span class="bm-action-emoji">⚔️</span>
                <span class="bm-action-label">Serang!</span>
                <span class="bm-action-sub">Jawab soal untuk menyerang</span>
              </button>
              <button class="bm-action-card bm-action-switch" data-action="switch" ${aliveBench === 0 ? 'disabled' : ''}>
                <span class="bm-action-emoji">🔄</span>
                <span class="bm-action-label">Ganti Pokemon</span>
                <span class="bm-action-sub">${aliveBench === 0 ? 'Tidak ada cadangan' : aliveBench + ' tim siap'}</span>
              </button>
            </div>
          </div>
        `;
      }
      // moves phase — show achieved time-mult badge so player sees the bonus
      const lastElapsed = state.lastAnswerElapsed[playerIdx];
      const lastMult = timeMultFromElapsed(lastElapsed);
      const tMultBadge = (lastElapsed != null && lastMult > 1.0)
        ? `<div class="bm-tmult-badge">⚡ ${lastMult.toFixed(2)}× cepat!</div>` : '';
      const aliveBench = state.teams[playerIdx].filter((p, i) => i !== state.activeIdx[playerIdx] && p.hp > 0).length;
      return `
        <div class="bm-q-row">
          <div class="bm-q-text">Pilih jurus untuk menyerang ${escapeHtml(opp.name)}:</div>
          ${tMultBadge}
          <div class="bm-moves" data-pidx="${playerIdx}">
            ${me.moves.map((mv, mi) => {
              const tm = typeMult(mv.type, opp.type);
              const eff = effLabel(tm);
              const effCls = tm >= 1.15 ? ' super-eff' : (tm <= 0.75 ? ' resist-eff' : '');
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
          ${aliveBench > 0 ? `<button class="bm-switch-btn" data-pidx="${playerIdx}">🔄 Ganti Pokemon</button>` : ''}
        </div>
      `;
    }

    function renderSwitchPanel (playerIdx, allowCancel) {
      const team = state.teams[playerIdx];
      const active = state.activeIdx[playerIdx];
      const title = allowCancel ? 'Pilih Pokemon Pengganti' : '😵 Pokemon pingsan — pilih pengganti!';
      return `
        <div class="bm-switch-panel">
          <div class="bm-switch-title">${title}</div>
          <div class="bm-switch-grid">
            ${team.map((p, i) => {
              const isActive = i === active;
              const isFainted = p.hp <= 0;
              const isDisabled = isActive || isFainted;
              const hpPct = (p.hp / p.hpMax) * 100;
              const hpColor = hpPct > 50 ? '#52D058' : hpPct > 25 ? '#F8C030' : '#E83030';
              return `
                <button class="bm-switch-card ${isActive?'active':''} ${isFainted?'fainted':''}"
                        ${isDisabled?'disabled':''} data-swap="${i}">
                  <img class="bm-switch-img" src="${spritePath(p.id, p.slug)}" alt="${escapeHtml(p.name)}"
                       onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${p.emoji}',className:'bm-switch-img-fallback'}))">
                  <div class="bm-switch-meta">
                    <div class="bm-switch-name">${escapeHtml(p.name)}</div>
                    <div class="bm-switch-hp">
                      <div class="bm-switch-hp-bar"><div style="width:${hpPct}%;background:${hpColor};"></div></div>
                      <span class="bm-switch-hp-text">${p.hp}/${p.hpMax}</span>
                    </div>
                  </div>
                  ${isActive ? '<span class="bm-switch-tag">Aktif</span>' : ''}
                  ${isFainted ? '<span class="bm-switch-tag bm-switch-tag-fainted">Pingsan</span>' : ''}
                </button>
              `;
            }).join('')}
          </div>
          ${allowCancel ? '<button class="bm-switch-back" data-cancel-switch>← Batal</button>' : ''}
        </div>
      `;
    }

    function wireActiveZone () {
      const activeZone = root.querySelector(`.bm-qzone[data-state="active"]`);
      if (!activeZone) return;
      // A1 switch panel — wire BOTH voluntary (Ganti button) and forced (after faint)
      activeZone.querySelectorAll('.bm-switch-card[data-swap]').forEach(b => {
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const targetIdx = parseInt(b.getAttribute('data-swap'));
          performSwitch(state.turn, targetIdx);
        });
      });
      const cancelBtn = activeZone.querySelector('[data-cancel-switch]');
      if (cancelBtn) cancelBtn.addEventListener('click', () => {
        root._switchOpen = null;
        // Return to action menu (not question) so user can pick again.
        state.phase = 'action';
        renderRoot();
      });
      const switchBtn = activeZone.querySelector('.bm-switch-btn');
      if (switchBtn) switchBtn.addEventListener('click', () => {
        root._switchOpen = state.turn; renderRoot();
      });
      // A1: action menu — wire Serang / Ganti
      activeZone.querySelectorAll('.bm-action-card[data-action]').forEach(b => {
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const a = b.getAttribute('data-action');
          if (a === 'attack') {
            state.phase = 'question';
            renderRoot();
          } else if (a === 'switch') {
            root._switchOpen = state.turn;
            renderRoot();
          }
        });
      });
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
            const mv = activePoke(state.turn).moves[mi];
            executeMove(mv);
          });
        });
      }
    }

    function onAnswer (picked, btn, q, playerIdx) {
      const isCorrect = String(picked) === String(q.ans);
      // A5: freeze the timer + record elapsed for this player's time-mult bonus.
      stopQuestionTimer();
      const elapsed = state.questionStartedAt > 0 ? (Date.now() - state.questionStartedAt) : 0;
      state.lastAnswerElapsed[playerIdx] = elapsed;
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
          state.phase = 'action';   // next turn starts at action menu
          renderRoot();
        }, 1400);
      }
    }

    // A1: voluntary or forced switch — change active slot for the given player,
    // then advance turn flow appropriately. HP per slot persists (we only change
    // state.activeIdx — the swapped-out Pokemon retains its current hp).
    function performSwitch (playerIdx, newIdx) {
      const wasForced = state.switchForced === playerIdx;
      state.activeIdx[playerIdx] = newIdx;
      state.switchForced = null;
      root._switchOpen = null;
      state.comboCount[playerIdx] = 0;  // streak resets on switch
      if (wasForced) {
        // Forced (after faint) — switching player keeps the turn; they go to
        // the action menu with the new Pokemon.
        root._questions = null;
        state.phase = 'action';
        state.turn = playerIdx;
      } else {
        // Voluntary mid-turn switch — costs the turn, passes to opponent.
        // Opponent starts at action menu.
        root._questions = null;
        state.phase = 'action';
        state.turn = 1 - playerIdx;
      }
      renderRoot();
    }

    function executeMove (move) {
      const atk = activePoke(state.turn);
      const def = activePoke(1 - state.turn);
      // A5: time-mult derived from the answer elapsed captured in onAnswer.
      const timeMult = timeMultFromElapsed(state.lastAnswerElapsed[state.turn]);
      const dmg = calcDamage(atk, move, def, timeMult);
      const tm  = typeMult(move.type, def.type);
      // Attack animation FIRST, then apply damage at impact.
      runAttackAnimation(state.turn, move, dmg, tm, timeMult, () => {
        def.hp = Math.max(0, def.hp - dmg);
        sfxKO();
        // Update HP bars + texts in BOTH halves (both views show both HPs)
        updateHpDisplays();
        setTimeout(() => {
          if (def.hp <= 0) {
            const defIdx = 1 - state.turn;
            const aliveCount = state.teams[defIdx].filter(p => p.hp > 0).length;
            playFaintAnimation(defIdx, () => {
              if (aliveCount === 0) {
                // All fainted — that player loses
                finishMatch(state.turn);
                return;
              }
              // A1: force defender to pick next Pokemon. After they pick, they
              // start their next turn at the action menu with the new Pokemon.
              state.switchForced = defIdx;
              state.turn = defIdx;
              state.phase = 'action';
              renderRoot();
            });
            return;
          }
          // Turn passes — next player starts at action menu
          root._questions = null;
          state.turn = 1 - state.turn;
          state.phase = 'action';
          renderRoot();
        }, 850);
      });
    }

    function runAttackAnimation (attackerIdx, move, dmg, tm, timeMult, done) {
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
      // Projectile flies attacker → defender (~320ms). Lands at the start of
      // the defender shake / damage frame, so all impact VFX read as caused
      // by the projectile collision.
      setTimeout(() => {
        spawnProjectile(attackerSprite, defenderPanel, move.type);
      }, 40);
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

      // A2 VFX cascade — matches G13C standard. Owner: "effect serangan, dampak combo,
      // text sfx, vfx kok tidak ada. berkurang. saya bilang samakan."
      // Type-coded screen tint kept (above). Now: particles + effectiveness text +
      // viewport shake on super-eff + CRITICAL on super+STAB + knockback push.
      setTimeout(() => {
        if (defenderPanel) {
          const r = defenderPanel.getBoundingClientRect();
          const cx = r.left + r.width * 0.7;
          const cy = r.top + r.height * 0.5;
          spawnDamageNumber(cx, cy, dmg, tm, timeMult);
          // Type-emoji particles burst at defender (8 particles, type-specific keyframe)
          spawnTypeParticles(cx, cy, move.type);
          // Effectiveness rise-text (Super Efektif / Tidak Efektif / Seimbang)
          spawnEffectivenessText(cx, cy - 30, tm);
          // Knockback sprite push on defender (28px) — visible recoil
          if (defenderPanel && tm >= 1.15) {
            const dir = attackerIdx === 0 ? 'right' : 'left';
            defenderPanel.classList.add('bm-knock-' + dir);
            setTimeout(() => defenderPanel.classList.remove('bm-knock-' + dir), 600);
          }
        }
        // Super-effective extra flash + viewport shake — threshold matches 1.2× cap.
        if (tm >= 1.15) {
          screenFlash('#FCD34D', 120);
          applyViewportShake();
        }
        // CRITICAL! pop on super+STAB combo (super-effective AND same-type attack)
        const isStab = move.type === activePoke(attackerIdx).type;
        if (tm >= 1.15 && isStab) {
          spawnCriticalBadge(defenderPanel);
        }
        // Combo counter — track super-effective streak per attacker
        if (tm >= 1.15) {
          state.comboCount[attackerIdx]++;
          if (state.comboCount[attackerIdx] >= 2) {
            spawnComboBadge(defenderPanel, state.comboCount[attackerIdx]);
          }
        } else {
          state.comboCount[attackerIdx] = 0;
        }
      }, 360);

      // Done at ~700ms after the lunge → applies damage in caller
      setTimeout(done, 750);
    }

    function spawnDamageNumber (x, y, dmg, tm, timeMult) {
      const el = document.createElement('div');
      const color = tm >= 1.15 ? '#FCD34D' : (tm <= 0.75 ? '#FB923C' : '#67E8F9');
      const effTxt = effLabel(tm);
      const showTimeMult = (typeof timeMult === 'number' && timeMult > 1.01);
      const tMultTxt = showTimeMult ? `<div style="font-size:0.32em; margin-top:2px; color:#FDE68A;">⚡ ×${timeMult.toFixed(2)} cepat</div>` : '';
      el.style.cssText = `
        position: fixed; left: ${x - 60}px; top: ${y}px;
        z-index: 9300; pointer-events: none;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(36px, 8vw, 64px);
        color: ${color};
        text-shadow: 0 4px 14px rgba(0,0,0,0.6);
        animation: bmDmgFloat 1100ms cubic-bezier(0.22,0.61,0.36,1) forwards;
      `;
      el.innerHTML = `-${dmg}` + (effTxt ? `<div style="font-size:0.40em; margin-top:4px;">${effTxt}</div>` : '') + tMultTxt;
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

    // ── A2 VFX helpers — port from G13C ────────────────────────────────
    // Projectile flying attacker → defender, type-coded emoji core.
    // Lands in ~340ms (synced with the lunge-to-impact window) and triggers
    // the impact particle burst on landing. Owner: "projectile vfx serangannya
    // belum ada" — this fills the visible attack travel.
    function spawnProjectile (attackerSprite, defenderPanel, moveType, onLand) {
      if (!attackerSprite || !defenderPanel) { setTimeout(onLand || (()=>{}), 340); return; }
      const a = attackerSprite.getBoundingClientRect();
      const d = defenderPanel.getBoundingClientRect();
      const startX = a.left + a.width * 0.5;
      const startY = a.top + a.height * 0.35;
      const endX   = d.left + d.width * 0.5;
      const endY   = d.top + d.height * 0.45;
      const config = {
        fire:     { emoji: '🔥', trail: '#F97316', size: 38 },
        water:    { emoji: '💧', trail: '#06B6D4', size: 36 },
        grass:    { emoji: '🌿', trail: '#10B981', size: 34 },
        electric: { emoji: '⚡', trail: '#FCD34D', size: 36 },
        normal:   { emoji: '⭐', trail: '#FFFFFF', size: 34 },
        fairy:    { emoji: '💖', trail: '#F472B6', size: 34 }
      };
      const cfg = config[moveType] || config.normal;
      const el = document.createElement('div');
      el.textContent = cfg.emoji;
      el.style.cssText = `
        position: fixed;
        left: ${startX}px; top: ${startY}px;
        z-index: 9210; pointer-events: none;
        font-size: ${cfg.size}px;
        transform: translate(-50%, -50%) scale(0.6) rotate(0deg);
        filter: drop-shadow(0 0 14px ${cfg.trail}) drop-shadow(0 0 26px ${cfg.trail}aa);
        transition: left 320ms cubic-bezier(0.4,0,0.2,1), top 320ms cubic-bezier(0.4,0,0.2,1), transform 320ms cubic-bezier(0.4,0,0.2,1);
      `;
      document.body.appendChild(el);
      // Trigger movement on the next frame so transition applies
      requestAnimationFrame(() => {
        el.style.left = endX + 'px';
        el.style.top  = endY + 'px';
        el.style.transform = 'translate(-50%, -50%) scale(1.4) rotate(540deg)';
      });
      // Cleanup + invoke landing callback at ~340ms
      setTimeout(() => {
        try { el.remove(); } catch (e) {}
        if (typeof onLand === 'function') onLand();
      }, 340);
    }

    // Type-coded particle burst at defender (8 emojis, type-specific animation).
    function spawnTypeParticles (cx, cy, moveType) {
      const config = {
        fire:     { emojis: ['🔥','✨'], count: 8, anim: 'bmFxRise',  spreadX: 60, spreadY: -90 },
        water:    { emojis: ['💧','🫧'], count: 8, anim: 'bmFxDrop',  spreadX: 50, spreadY: 70 },
        grass:    { emojis: ['🌿','🍃'], count: 7, anim: 'bmFxSwirl', spreadX: 70, spreadY: -60 },
        electric: { emojis: ['⚡','✨'], count: 9, anim: 'bmFxZap',   spreadX: 80, spreadY: -50 },
        normal:   { emojis: ['⭐','✨'], count: 7, anim: 'bmFxBurst', spreadX: 70, spreadY: -70 },
        fairy:    { emojis: ['🎀','💖'], count: 8, anim: 'bmFxFloat', spreadX: 60, spreadY: -80 }
      };
      const cfg = config[moveType] || config.normal;
      for (let i = 0; i < cfg.count; i++) {
        const el = document.createElement('div');
        const emoji = cfg.emojis[i % cfg.emojis.length];
        const dx = (Math.random() - 0.5) * cfg.spreadX;
        const dy = cfg.spreadY * (0.5 + Math.random() * 0.8);
        el.textContent = emoji;
        el.style.cssText = `
          position: fixed; left: ${cx + dx}px; top: ${cy}px;
          z-index: 9220; pointer-events: none;
          font-size: ${18 + Math.random() * 16}px;
          opacity: 0.95;
          animation: ${cfg.anim} 880ms cubic-bezier(0.22,0.61,0.36,1) forwards;
          animation-delay: ${i * 35}ms;
          --dx: ${dx}px; --dy: ${dy}px;
        `;
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 1300 + i * 35);
      }
    }

    // "Super Efektif!" / "Tidak Efektif…" / "Seimbang" rise-text above defender
    function spawnEffectivenessText (cx, cy, mult) {
      const eff = effLabel(mult);
      if (!eff) return;
      const el = document.createElement('div');
      const color = mult >= 1.15 ? '#22C55E' : mult <= 0.75 ? '#F87171' : '#CBD5E1';
      el.textContent = eff;
      el.style.cssText = `
        position: fixed; left: ${cx}px; top: ${cy}px;
        z-index: 9320; pointer-events: none;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(16px, 4vw, 22px);
        font-weight: 900;
        color: ${color};
        text-shadow: 0 2px 6px rgba(0,0,0,0.7), 0 0 14px rgba(0,0,0,0.5);
        transform: translate(-50%, 0) scale(0.6);
        animation: bmEffRise 1200ms cubic-bezier(0.34,1.56,0.64,1) forwards;
        white-space: nowrap;
      `;
      document.body.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch (e) {} }, 1300);
    }

    // CRITICAL! pop on super-effective + STAB combo
    function spawnCriticalBadge (target) {
      if (!target) return;
      const r = target.getBoundingClientRect();
      const el = document.createElement('div');
      el.textContent = 'CRITICAL!';
      el.style.cssText = `
        position: fixed;
        left: ${r.left + r.width * 0.5}px;
        top:  ${r.top - 40}px;
        z-index: 9340; pointer-events: none;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(20px, 5vw, 32px);
        font-weight: 900;
        color: #fff;
        background: linear-gradient(135deg, #F97316, #DC2626);
        padding: 4px 14px;
        border-radius: 999px;
        border: 2px solid #fff;
        box-shadow: 0 0 18px rgba(249,115,22,0.7), 0 4px 14px rgba(0,0,0,0.5);
        transform: translate(-50%, 0) scale(0.3);
        animation: bmCritPop 1100ms cubic-bezier(0.34,1.56,0.64,1) forwards;
        letter-spacing: 1px;
        white-space: nowrap;
      `;
      document.body.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch (e) {} }, 1200);
    }

    // Combo chain badge — appears when ≥2 super-eff hits in a row
    function spawnComboBadge (target, count) {
      if (!target) return;
      const r = target.getBoundingClientRect();
      const el = document.createElement('div');
      el.textContent = `COMBO ×${count}!`;
      const tier = count >= 4 ? { bg: 'linear-gradient(135deg,#A855F7,#EC4899)', border: '#F0ABFC' }
                  : count >= 3 ? { bg: 'linear-gradient(135deg,#06B6D4,#3B82F6)', border: '#7DD3FC' }
                  :              { bg: 'linear-gradient(135deg,#10B981,#22C55E)', border: '#86EFAC' };
      el.style.cssText = `
        position: fixed;
        left: ${r.left + r.width * 0.5}px;
        top:  ${r.top + 10}px;
        z-index: 9330; pointer-events: none;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(15px, 3.5vw, 22px);
        font-weight: 900;
        color: #fff;
        background: ${tier.bg};
        padding: 3px 12px;
        border-radius: 999px;
        border: 2px solid ${tier.border};
        box-shadow: 0 0 14px rgba(34,197,94,0.6);
        transform: translate(-50%, 0) scale(0.5);
        animation: bmComboPop 1000ms cubic-bezier(0.34,1.56,0.64,1) forwards;
        letter-spacing: 0.5px;
        white-space: nowrap;
      `;
      document.body.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch (e) {} }, 1100);
    }

    // Viewport shake — apply to <html> for 380ms on super-effective hits
    function applyViewportShake () {
      const root = document.documentElement;
      root.classList.add('bm-vp-shake');
      setTimeout(() => root.classList.remove('bm-vp-shake'), 380);
    }

    function updateHpDisplays () {
      // Single shared arena — one set of HP fills to update (P1 = self, P2 = opp).
      const arena = root.querySelector('.bm-arena');
      if (!arena) return;
      const p1 = activePoke(0);
      const p2 = activePoke(1);
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
          <div style="font-size:clamp(72px, 16vw, 120px); margin-bottom:8px;">${activePoke(winnerIdx).emoji}</div>
          <div style="font-family:'Fredoka One',cursive; font-size:clamp(28px,7vw,52px); background:linear-gradient(135deg,#FCD34D,#EC4899); -webkit-background-clip:text; color:transparent; margin-bottom:16px;">
            🏆 ${escapeHtml(winName)} Menang!
          </div>
          <div style="color:rgba(255,255,255,0.8); margin-bottom:18px;">${escapeHtml(activePoke(winnerIdx).name)} jadi juara</div>
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

      /* ── FIXED 18/62/20 GRID — owner spec refined for safe-area cutoff ──
         Owner: "Kasih margin lagi area bawah agar nggak terpotong" + "masih
         banyak black space" — pulled top down to 18vh (less wasted dark zone),
         arena up to 62vh (more action), bottom 20vh + safe-area padding so
         choice buttons don't get clipped by the device nav bar. */
      .bm-stage-grid {
        display: grid;
        grid-template-rows: 18vh 62vh 20vh;
        height: 100dvh; max-height: 100svh;
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }

      /* ── SHARED ARENA — both Pokemon in one view ── */
      .bm-arena {
        position: relative; overflow: hidden;
        background: linear-gradient(180deg,#6bbfee 0%,#a8d8f8 32%,#a0d870 46%,#5a9e3a 65%,#3e7028 100%);
      }
      .bm-arena::before {
        content: ''; position: absolute; inset: -10% -5%;
        background: url('${_ASSET_BASE}assets/bg-pokemon-battle.webp') center center/cover no-repeat;
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
      .bm-hp-fill.low {
        background: #E83030;
        animation: bmHpBlink 0.7s ease-in-out infinite, bmHpDanger 1.2s ease-in-out infinite;
      }
      @keyframes bmHpDanger {
        0%,100% { box-shadow: 0 0 0 0 rgba(232,48,48,0); }
        50%     { box-shadow: 0 0 8px 2px rgba(232,48,48,0.7); }
      }
      .bm-hp-text {
        font-size: 9px; font-weight: 700; color: #555;
        font-family: monospace; text-align: right;
      }

      /* ── Q-ZONE (top + bottom) — softer gradient so the inactive zone doesn't read as dead black ── */
      .bm-qzone {
        position: relative; overflow: hidden;
        background: linear-gradient(180deg, rgba(20,20,40,0.92), rgba(14,14,30,0.96));
        border-top: 2px solid rgba(255,255,255,0.07);
        display: grid; place-items: center;
        /* Reduced bottom padding so choice buttons sit higher, less risk of clipping
           by Android nav bar. Horizontal padding 4px keeps content tight. */
        padding: 3px 4px 5px;
      }
      .bm-qzone-bot { padding-bottom: calc(5px + env(safe-area-inset-bottom, 0px)); }
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
      /* A5 — 10-second answer countdown bar */
      .bm-timer-bar {
        width: 100%; height: 5px;
        background: rgba(255,255,255,0.10);
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 2px;
      }
      .bm-timer-fill {
        height: 100%; width: 100%;
        background: linear-gradient(90deg, #67E8F9, #34D399);
        border-radius: 999px;
        transition: width 0.1s linear, background 0.3s ease;
      }
      .bm-timer-fill.mid { background: linear-gradient(90deg, #FCD34D, #F59E0B); }
      .bm-timer-fill.low { background: linear-gradient(90deg, #EF4444, #F87171); animation: bmHpBlink 0.7s ease-in-out infinite; }
      /* Time-mult achievement badge (shows during move phase) */
      .bm-tmult-badge {
        align-self: center;
        font-family: 'Fredoka One', cursive;
        font-size: 11px;
        padding: 2px 10px; border-radius: 999px;
        background: rgba(252,211,77,0.20);
        color: #FDE68A;
        border: 1px solid rgba(252,211,77,0.45);
        letter-spacing: 0.3px;
      }
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
      /* A2 VFX cascade keyframes (port from g13c-pixi.html lines 252-330) */
      @keyframes bmEffRise {
        0%   { transform: translate(-50%, 0)    scale(0.6); opacity: 0; }
        20%  { transform: translate(-50%, -8px) scale(1.15); opacity: 1; }
        35%  { transform: translate(-50%, -14px) scale(1.0); opacity: 1; }
        80%  { transform: translate(-50%, -30px) scale(1.0); opacity: 1; }
        100% { transform: translate(-50%, -48px) scale(0.9); opacity: 0; }
      }
      @keyframes bmCritPop {
        0%   { transform: translate(-50%, 0) scale(0.3) rotate(-12deg); opacity: 0; }
        30%  { transform: translate(-50%, -8px) scale(1.25) rotate(6deg); opacity: 1; }
        60%  { transform: translate(-50%, -10px) scale(1.05) rotate(-2deg); opacity: 1; }
        100% { transform: translate(-50%, -22px) scale(1.0) rotate(0deg); opacity: 0; }
      }
      @keyframes bmComboPop {
        0%   { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
        30%  { transform: translate(-50%, -6px) scale(1.18); opacity: 1; }
        100% { transform: translate(-50%, -28px) scale(1.0); opacity: 0; }
      }
      /* Type-specific particle keyframes — use --dx --dy CSS vars from spawnTypeParticles */
      @keyframes bmFxRise {
        0%   { transform: scale(0.4) translate(0, 0);                opacity: 0.95; }
        50%  { transform: scale(1.2) translate(calc(var(--dx)*0.5), calc(var(--dy)*0.5)); opacity: 0.85; }
        100% { transform: scale(0.5) translate(var(--dx), var(--dy)); opacity: 0; }
      }
      @keyframes bmFxDrop {
        0%   { transform: scale(0.9) translate(0, -10px);            opacity: 0.95; }
        70%  { transform: scale(1.0) translate(calc(var(--dx)*0.8), calc(var(--dy)*0.8)); opacity: 0.6; }
        100% { transform: scale(0.6) translate(var(--dx), var(--dy)); opacity: 0; }
      }
      @keyframes bmFxSwirl {
        0%   { transform: scale(0.3) rotate(0deg) translate(0, 0);                          opacity: 1; }
        60%  { transform: scale(1.1) rotate(200deg) translate(calc(var(--dx)*0.6), calc(var(--dy)*0.5)); opacity: 0.7; }
        100% { transform: scale(0.4) rotate(400deg) translate(var(--dx), var(--dy));        opacity: 0; }
      }
      @keyframes bmFxZap {
        0%   { transform: scale(0) rotate(0deg);                                            opacity: 1; }
        30%  { transform: scale(1.6) rotate(45deg);                                         opacity: 1; }
        100% { transform: scale(0.2) rotate(200deg) translate(var(--dx), var(--dy));        opacity: 0; }
      }
      @keyframes bmFxBurst {
        0%   { transform: scale(0);                                                          opacity: 1; }
        40%  { transform: scale(1.4) translate(calc(var(--dx)*0.5), calc(var(--dy)*0.4));   opacity: 0.95; }
        100% { transform: scale(0.3) translate(var(--dx), var(--dy));                       opacity: 0; }
      }
      @keyframes bmFxFloat {
        0%   { transform: scale(0.6) translate(0, 0);                                        opacity: 0.85; }
        50%  { transform: scale(1.1) translate(calc(var(--dx)*0.4), calc(var(--dy)*0.6));   opacity: 0.7; }
        100% { transform: scale(0) translate(var(--dx), var(--dy));                         opacity: 0; }
      }
      /* Knockback push on defender — direction-aware translate */
      .bm-knock-right { animation: bmKnockR 600ms cubic-bezier(0.18,0.6,0.4,1); }
      .bm-knock-left  { animation: bmKnockL 600ms cubic-bezier(0.18,0.6,0.4,1); }
      @keyframes bmKnockR {
        0%   { transform: translateX(0); }
        30%  { transform: translateX(28px); }
        100% { transform: translateX(0); }
      }
      @keyframes bmKnockL {
        0%   { transform: translateX(0); }
        30%  { transform: translateX(-28px); }
        100% { transform: translateX(0); }
      }
      /* Viewport shake on super-effective — applied to <html> */
      html.bm-vp-shake { animation: bmVpShake 380ms ease; }
      @keyframes bmVpShake {
        0%, 100% { transform: translate(0, 0); }
        20%      { transform: translate(-3px, 1px); }
        40%      { transform: translate(2px, -2px); }
        60%      { transform: translate(-2px, 2px); }
        80%      { transform: translate(2px, 1px); }
      }
      @keyframes bmSpriteBob {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-6px); }
      }
      /* Shared HP-bar shine + blink keyframes */
      @keyframes bmHpShine { 0% { left: -100%; } 100% { left: 200%; } }
      @keyframes bmHpBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }

      /* ── A1 Pre-battle steps — sky bg shows through, DS cards on top ── */
      .bm-prestep {
        position: absolute; inset: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
        padding: 70px 16px 20px;
        gap: 14px; overflow-y: auto;
        z-index: 2;
      }
      .bm-prestep-title {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(22px, 5.5vw, 30px);
        color: #fff;
        text-shadow: 2px 2px 0 rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.45);
      }
      .bm-prestep-sub {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: clamp(12px, 3vw, 14px);
        color: rgba(248,250,252,0.95);
        background: rgba(0,0,0,0.40);
        padding: 4px 12px; border-radius: 999px;
        text-align: center;
      }
      .bm-prestep-header {
        display: flex; align-items: center; gap: 8px;
        background: rgba(248,248,240,0.97);
        border: 2.5px solid #444; border-radius: 12px;
        padding: 6px 12px;
        box-shadow: 3px 3px 0 rgba(0,0,0,0.30);
        font-family: 'Fredoka One', cursive;
        font-size: 14px; color: #111;
      }
      .bm-prestep-pname { font-size: 14px; color: #111; }
      .bm-prestep-pname b { color: #BE185D; }

      /* Team-size mode cards (3 vs 6 Pokemon) */
      .bm-size-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
        max-width: 480px; width: 100%; margin-top: 12px;
      }
      .bm-size-card {
        background: rgba(248,248,240,0.97);
        border: 3px solid #15803d;
        border-radius: 18px;
        padding: 22px 14px 18px;
        box-shadow: 4px 4px 0 rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.95);
        font-family: 'Fredoka One', cursive; color: #111;
        cursor: pointer; text-align: center;
        transition: transform 180ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 180ms;
      }
      .bm-size-card-full { border-color: #BE185D; }
      .bm-size-card:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 rgba(0,0,0,0.30); }
      .bm-size-card:hover { transform: translate(-2px, -4px); box-shadow: 6px 6px 0 rgba(0,0,0,0.32); }
      .bm-size-emoji { font-size: 44px; line-height: 1; margin-bottom: 4px; }
      .bm-size-name { font-size: 22px; margin-bottom: 4px; }
      .bm-size-card.bm-size-card-full .bm-size-name { color: #BE185D; }
      .bm-size-card:not(.bm-size-card-full) .bm-size-name { color: #15803d; }
      .bm-size-count {
        background: #fff; border: 2px solid #111; border-radius: 999px;
        padding: 2px 10px; font-size: 13px;
        display: inline-block; margin-top: 4px;
      }
      .bm-size-time { font-size: 11px; color: #555; margin-top: 4px; }

      /* Package picker grid — DS-style team cards */
      .bm-pkg-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        max-width: 560px; width: 100%; margin-top: 6px;
      }
      @media (min-width: 720px) { .bm-pkg-grid { grid-template-columns: 1fr 1fr 1fr; } }
      .bm-pkg-card {
        background: rgba(248,248,240,0.97);
        border: 2.5px solid #444; border-radius: 12px;
        padding: 8px 10px 10px;
        box-shadow: 3px 3px 0 rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.95);
        font-family: inherit; color: #111;
        cursor: pointer; text-align: left;
        transition: transform 140ms, box-shadow 140ms;
      }
      .bm-pkg-card:hover { transform: translate(-2px,-3px); box-shadow: 5px 5px 0 rgba(0,0,0,0.30); }
      .bm-pkg-card:active { transform: translate(2px,2px); box-shadow: 1px 1px 0 rgba(0,0,0,0.30); }
      .bm-pkg-head { display: flex; align-items: center; gap: 6px; }
      .bm-pkg-emoji { font-size: 22px; }
      .bm-pkg-name { font-family: 'Fredoka One', cursive; font-size: 15px; color: #111; }
      .bm-pkg-desc { font-size: 11px; color: #555; margin: 2px 0 6px; line-height: 1.3; }
      .bm-pkg-thumbs {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
      }
      .bm-pkg-thumb {
        aspect-ratio: 1; border-radius: 8px;
        border: 2px solid #444;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden; background: rgba(248,248,240,0.50);
      }
      .bm-pkg-thumb img { width: 100%; height: 100%; object-fit: contain; }
      .bm-pkg-thumb-fallback { font-size: 22px; line-height: 1; }
      .bm-pkg-tier {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1.5px solid #111;
        color: #fff;
        font-family: 'Fredoka One', cursive;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        box-shadow: 1px 1px 0 #111;
        margin-left: 4px;
      }

      /* Random region card — visually distinct from themed packages */
      .bm-section-label {
        align-self: stretch;
        font-family: 'Fredoka One', cursive;
        font-size: 13px; color: #FCD34D;
        text-shadow: 1px 1px 0 rgba(0,0,0,0.55);
        letter-spacing: 0.5px;
        margin-top: 6px;
      }
      .bm-pkg-random {
        background: linear-gradient(135deg, rgba(196,181,253,0.96), rgba(248,248,240,0.97));
        border-color: #7C3AED;
      }
      .bm-pkg-random .bm-pkg-name { color: #5B21B6; }
      .bm-pkg-thumb-random {
        background: linear-gradient(135deg, #DDD6FE, #C4B5FD);
        border-color: #7C3AED;
      }
      .bm-pkg-thumb-random span {
        font-size: 18px;
        opacity: 0.7;
      }
      .bm-pkg-loading {
        opacity: 0.65;
        pointer-events: none;
        animation: bmPkgLoad 0.8s ease-in-out infinite;
      }
      @keyframes bmPkgLoad {
        0%,100% { transform: scale(1); }
        50%     { transform: scale(0.98); }
      }

      /* Bench dots — VERBATIM mirror of G13C .hp-poke-dot (g13c-pixi.html:67-73).
         Owner: "ikuti alur dan logika game Gym Pokemon yang asli". Pure-CSS
         Pokeball: red top half, white bottom half, black equator line, white
         center button. Info-only — no click handler. */
      .bm-bench-dots {
        display: flex; gap: 4px; margin-top: 6px; align-items: center;
        pointer-events: none;
      }
      .bm-bench-dots::before {
        content: '🎒'; font-size: 11px; margin-right: 2px; pointer-events: none;
      }
      .bm-bench-dot {
        width: 18px; height: 18px; border-radius: 50%;
        background: linear-gradient(180deg, #e3000b 50%, #fff 50%);
        border: 2px solid #1a1a1a;
        position: relative; flex-shrink: 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.6);
        transition: transform 220ms, box-shadow 220ms, background 220ms;
      }
      .bm-bench-dot::before {
        content: ''; position: absolute; left: 0; right: 0;
        top: calc(50% - 1.5px); height: 3px;
        background: #1a1a1a; pointer-events: none;
      }
      .bm-bench-dot::after {
        content: ''; width: 6px; height: 6px; border-radius: 50%;
        background: #fff; border: 2px solid #1a1a1a;
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%); pointer-events: none;
      }
      .bm-bench-dot.active {
        transform: scale(1.18);
        box-shadow: 0 0 0 2px #FCD34D, 0 0 8px rgba(252,211,77,0.9), 0 1px 3px rgba(0,0,0,0.6);
      }
      .bm-bench-dot.fainted {
        background: #6b7280 !important;
        border-color: #4b5563 !important;
        box-shadow: none;
      }
      .bm-bench-dot.fainted::before { background: #4b5563; }
      .bm-bench-dot.fainted::after { background: #9ca3af; border-color: #374151; }

      /* Switch button (in move-pick) */
      .bm-switch-btn {
        margin-top: 6px;
        padding: 8px 16px;
        background: #06B6D4;
        color: #fff;
        border: 3px solid #111;
        border-radius: 12px;
        box-shadow: 0 5px 0 #0891B2;
        font-family: 'Fredoka One', cursive;
        font-size: 14px;
        cursor: pointer;
        transition: transform 120ms, box-shadow 120ms;
        align-self: center;
      }
      .bm-switch-btn:active { transform: translateY(4px); box-shadow: 0 1px 0 #0891B2; }

      /* Switch panel overlay */
      .bm-switch-panel {
        width: 100%; max-width: 480px;
        display: flex; flex-direction: column; gap: 6px;
      }
      .bm-switch-title {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(13px, 3vw, 16px);
        color: #fff;
        text-align: center;
        text-shadow: 0 2px 8px rgba(0,0,0,0.6);
        margin-bottom: 2px;
      }
      .bm-switch-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
      }
      @media (min-width: 540px) { .bm-switch-grid { grid-template-columns: repeat(3, 1fr); } }
      .bm-switch-card {
        position: relative;
        background: rgba(248,248,240,0.97);
        border: 2px solid #444; border-radius: 10px;
        padding: 4px 6px;
        display: flex; align-items: center; gap: 6px;
        font-family: inherit; color: #111;
        cursor: pointer;
        box-shadow: 2px 2px 0 rgba(0,0,0,0.30);
        transition: transform 120ms, box-shadow 120ms;
      }
      .bm-switch-card:not(:disabled):hover { transform: translate(-1px,-2px); box-shadow: 3px 3px 0 rgba(0,0,0,0.30); }
      .bm-switch-card:not(:disabled):active { transform: translate(1px,1px); box-shadow: 1px 1px 0 rgba(0,0,0,0.30); }
      .bm-switch-card:disabled { cursor: not-allowed; }
      .bm-switch-card.active { opacity: 0.65; border-color: #FCD34D; box-shadow: 2px 2px 0 rgba(0,0,0,0.30), 0 0 0 2px #FCD34D; }
      .bm-switch-card.fainted { opacity: 0.45; filter: grayscale(0.8); }
      .bm-switch-img {
        width: 36px; height: 36px; object-fit: contain; flex-shrink: 0;
      }
      .bm-switch-img-fallback { font-size: 30px; flex-shrink: 0; }
      .bm-switch-meta { flex: 1; min-width: 0; }
      .bm-switch-name {
        font-family: 'Fredoka One', cursive; font-size: 11px; color: #111;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .bm-switch-hp { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
      .bm-switch-hp-bar {
        flex: 1; height: 4px;
        background: #d0d0c0; border-radius: 100px;
        border: 1px solid #aaa; overflow: hidden;
      }
      .bm-switch-hp-bar > div {
        height: 100%; border-radius: 100px;
        transition: width 400ms ease;
      }
      .bm-switch-hp-text { font-size: 8px; color: #555; font-family: monospace; }
      .bm-switch-tag {
        position: absolute; top: -4px; right: -4px;
        background: #FCD34D; color: #422006;
        font-family: 'Fredoka One', cursive; font-size: 9px;
        padding: 1px 6px; border-radius: 999px;
        border: 1.5px solid #111;
      }
      .bm-switch-tag.bm-switch-tag-fainted { background: #E83030; color: #fff; }
      .bm-switch-back {
        margin-top: 4px; padding: 6px 14px;
        background: rgba(248,248,240,0.97);
        border: 2px solid #444; border-radius: 10px;
        font-family: 'Fredoka One', cursive; font-size: 12px;
        color: #111;
        cursor: pointer;
        box-shadow: 2px 2px 0 rgba(0,0,0,0.30);
        align-self: center;
      }
      .bm-switch-back:active { transform: translate(2px,2px); box-shadow: 0 0 0 rgba(0,0,0,0); }

      /* ── Action menu (Serang / Ganti) — shown BEFORE the question, owner spec ── */
      .bm-action-row {
        width: 100%; display: flex; flex-direction: column;
        gap: 4px; align-items: center;
      }
      .bm-action-prompt {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(13px, 3.2vw, 17px);
        color: #fff;
        text-shadow: 0 2px 6px rgba(0,0,0,0.55);
        text-align: center;
      }
      .bm-action-prompt b { color: #FCD34D; }
      .bm-action-grid {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 8px; width: 100%; max-width: 380px;
      }
      .bm-action-card {
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 2px;
        padding: 8px 6px;
        border: 3px solid #111;
        border-radius: 14px;
        cursor: pointer;
        box-shadow: 0 5px 0 var(--btn-shadow);
        font-family: 'Fredoka One', cursive;
        color: #1F2937;
        transition: transform 120ms, box-shadow 120ms;
      }
      .bm-action-card:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--btn-shadow); }
      .bm-action-card:disabled { opacity: 0.55; cursor: not-allowed; }
      .bm-action-attack { background: #FED7AA; --btn-shadow: #D97706; }
      .bm-action-switch { background: #A7F3D0; --btn-shadow: #059669; }
      .bm-action-emoji { font-size: clamp(24px, 6vw, 32px); line-height: 1; }
      .bm-action-label { font-size: clamp(14px, 3.5vw, 18px); }
      .bm-action-sub {
        font-size: clamp(9px, 2.2vw, 11px); opacity: 0.75;
        font-family: 'Inter', system-ui, sans-serif; font-weight: 700;
      }

      /* ── Pastel choice buttons — owner spec: tighter horizontal padding ── */
      .bm-choices, .bm-moves {
        display: grid; grid-template-columns: repeat(2, 1fr);
        gap: 6px; width: 100%; max-width: 380px;
        margin: 0 auto;
      }
      .bm-choice {
        padding: 9px 4px;
        border: 2px solid #111;
        border-radius: 12px;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(16px, 4vw, 22px);
        color: #1F2937;
        box-shadow: 0 4px 0 var(--btn-shadow);
        cursor: pointer; position: relative;
        transition: transform 120ms, box-shadow 120ms;
        min-width: 0;
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

      /* ── Move buttons — calm pastel rotation (lavender/mint/peach/rose), original G13C 5px-raised effect ── */
      .bm-move {
        padding: 9px 10px;
        border: 2px solid #111;
        border-radius: 12px;
        background: #DDD6FE; --btn-shadow: #7C3AED;   /* lavender default */
        color: #1F2937;
        font-family: 'Fredoka One', cursive;
        text-align: left; cursor: pointer; position: relative;
        box-shadow: 0 5px 0 var(--btn-shadow);
        transition: transform 120ms, box-shadow 120ms;
      }
      .bm-move:nth-child(2) { background:#A7F3D0; --btn-shadow:#059669; }  /* mint  */
      .bm-move:nth-child(3) { background:#FED7AA; --btn-shadow:#D97706; }  /* peach */
      .bm-move:nth-child(4) { background:#FBCFE8; --btn-shadow:#BE185D; }  /* rose  */
      .bm-move:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--btn-shadow); }
      .bm-move-name { font-size: 13px; margin-bottom: 3px; color: #111; }
      .bm-move-meta {
        display: flex; flex-wrap: wrap; gap: 3px;
        font-size: 8px; letter-spacing: 0.2px; text-transform: uppercase;
      }
      /* Mirror G10 super-eff (✨ green border + pulsing glow) / resist-eff (💤 purple dashed) standards */
      .bm-move.super-eff {
        border: 2px solid #16A34A !important;
        animation: bmMoveSuperPulse 1.6s ease-in-out infinite;
      }
      .bm-move.super-eff::before {
        content: '✨'; position: absolute; top: 4px; right: 6px;
        font-size: 14px; text-shadow: 0 0 6px rgba(255,255,255,0.7);
      }
      .bm-move.resist-eff {
        opacity: 0.80;
        border: 2px dashed #7C3AED !important;   /* purple — never blends with any pastel base */
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
      .bm-real-move-pwr { background: rgba(255,255,255,0.65); color: #1F2937; padding: 1px 5px; border-radius: 5px; font-weight: 800; }
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

    // Tournament steps: count → names → size (3 or 6) → pick (per player) → bracket
    let step = 'count';
    let playerCount = 0;
    let players = [];       // [{ name, idx, team: [], teamSize }]
    let teamSize = 6;
    let pickingPlayer = 0;  // who's currently picking
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
        // After names → team-size step (3 or 6 Pokemon)
        step = 'size';
        renderTourSize();
      });
    }

    function renderTourSize () {
      root.innerHTML = `
        ${header()}
        <div class="bm-tour-step">
          <h2>Pilih Mode Tim</h2>
          <p style="text-align:center; color:#fff; text-shadow:1px 1px 0 rgba(0,0,0,0.55); font-size:13px; margin-top:-4px;">
            Berapa Pokemon yang bertarung di setiap match?
          </p>
          <div class="bm-size-grid" style="margin-top:14px;">
            <button class="bm-size-card" data-size="3">
              <div class="bm-size-emoji">⚡</div>
              <div class="bm-size-name">Cepat</div>
              <div class="bm-size-count">3 Pokemon</div>
              <div class="bm-size-time">~5 menit/match</div>
            </button>
            <button class="bm-size-card bm-size-card-full" data-size="6">
              <div class="bm-size-emoji">🔥</div>
              <div class="bm-size-name">Lengkap</div>
              <div class="bm-size-count">6 Pokemon</div>
              <div class="bm-size-time">~10 menit/match</div>
            </button>
          </div>
        </div>
      `;
      bindBack();
      root.querySelectorAll('.bm-size-card').forEach(b => {
        b.addEventListener('click', () => {
          teamSize = parseInt(b.getAttribute('data-size'));
          step = 'pick';
          pickingPlayer = 0;
          renderTourPick();
        });
      });
    }

    function renderTourPick () {
      const p = players[pickingPlayer];
      const badgeClass = pickingPlayer % 2 === 0 ? 'p1' : 'p2';
      const draw = () => {
        root.innerHTML = `
          ${header()}
          <div class="bm-prestep" style="position:relative; padding-top:20px;">
            <div class="bm-prestep-header">
              <span class="bm-pvp-badge ${badgeClass}">P${pickingPlayer + 1}</span>
              <span class="bm-prestep-pname">Giliran <b>${escapeHtml(p.name)}</b> memilih tim</span>
            </div>
            <div class="bm-prestep-sub">${pickingPlayer + 1}/${playerCount} · ${teamSize} Pokemon</div>
            ${renderPkgPickerHtml(teamSize)}
          </div>
        `;
        bindBack();
        root.querySelectorAll('.bm-pkg-card[data-pkg]').forEach(b => {
          b.addEventListener('click', () => {
            p.team = buildTeamFromPackage(b.getAttribute('data-pkg'), teamSize);
            p.teamSize = teamSize;
            advanceTourPick();
          });
        });
        root.querySelectorAll('.bm-pkg-card[data-region]').forEach(b => {
          b.addEventListener('click', () => {
            const gen = parseInt(b.getAttribute('data-gen'));
            b.classList.add('bm-pkg-loading');
            loadPokeDB().then(() => {
              p.team = buildTeamFromRegion(gen, teamSize);
              p.teamSize = teamSize;
              advanceTourPick();
            }).catch(err => {
              console.warn('[tournament] random region load failed', err);
              b.classList.remove('bm-pkg-loading');
            });
          });
        });
      };
      if (_pokeDB) {
        draw();
      } else {
        root.innerHTML = `
          ${header()}
          <div class="bm-tour-step">
            <h2>📦 Memuat Pokedex…</h2>
            <p style="text-align:center; color:#fff; text-shadow:1px 1px 0 rgba(0,0,0,0.55);">Sebentar, sedang siapkan paket tim Pokemon.</p>
          </div>
        `;
        bindBack();
        loadPokeDB().then(draw).catch(err => {
          console.warn('[tournament] pokedex load failed', err);
          draw();
        });
      }
    }

    function advanceTourPick () {
      if (pickingPlayer < playerCount - 1) {
        pickingPlayer++;
        renderTourPick();
      } else {
        bracket = buildBracket(players);
        step = 'bracket';
        renderBracket();
      }
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
          const aTeam = aP && aP.team ? aP.team : null;
          const bTeam = bP && bP.team ? bP.team : null;
          const teamRow = (team) => team ? `<div class="bm-bracket-team">${
            team.slice(0,6).map(p => `<span class="bm-bracket-mini" title="${escapeHtml(p.name)}" style="background:${p.color};">${TYPE_ICON[p.type]||'•'}</span>`).join('')
          }</div>` : '';
          html += `
            <div class="bm-bracket-match" ${stateAttr}>
              <div class="bm-bracket-slot ${m.winner === 'a' ? 'winner' : (m.winner === 'b' ? 'loser' : '')}">
                <div class="bm-bracket-slot-line">⚔️ ${escapeHtml(aName)}</div>
                ${teamRow(aTeam)}
              </div>
              <div class="bm-bracket-vs">— ${escapeHtml(m.label)} —</div>
              <div class="bm-bracket-slot ${m.winner === 'b' ? 'winner' : (m.winner === 'a' ? 'loser' : '')}">
                <div class="bm-bracket-slot-line">⚔️ ${escapeHtml(bName)}</div>
                ${teamRow(bTeam)}
              </div>
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
      // Fresh HP clone per match — teams persist across the bracket but every
      // match starts with full HP. Owner spec: "fresh team each match".
      const cloneFreshTeam = (team) => team ? team.map(p => ({...p, hp: p.hpMax || 80})) : null;
      startPvP({
        players: [aP, bP],
        matchNo: currentMatch + 1,
        stageLineText: cur.label,
        questionLevel: opts.questionLevel,
        questionType: opts.questionType,
        // Pass picked teams — startPvP sees opts.teams so it skips the pre-battle
        // picker and goes straight to the arena with these teams.
        teams: [cloneFreshTeam(aP.team), cloneFreshTeam(bP.team)],
        teamSize: aP.teamSize || teamSize,
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
          step = 'count'; renderCount();
        } else if (step === 'size') {
          step = 'names'; renderNames();
        } else if (step === 'pick') {
          if (pickingPlayer > 0) { pickingPlayer--; renderTourPick(); }
          else { step = 'size'; renderTourSize(); }
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
