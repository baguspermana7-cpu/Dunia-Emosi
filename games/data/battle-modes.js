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
        /* v56.9 A-323: same stadium plate as the Adventure BattleArena so the
           whole PvP/Tournament flow reads as one style. */
        background: url('${_ASSET_BASE}assets/background/gym/g13c-bg-gym-p.webp') center center/cover no-repeat;
        opacity: 0.35;
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
        color: #F1F5F9; margin-bottom: 8px;
      }
      .bm-champion-team-label {
        font-family: 'Fredoka One', cursive;
        font-size: 12px;
        color: #FCD34D;
        letter-spacing: 0.5px;
        margin-top: 10px; margin-bottom: 6px;
      }
      .bm-champion-team-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        max-width: 320px;
        margin: 0 auto 4px;
      }
      .bm-champion-poke {
        border: 2px solid #444;
        border-radius: 10px;
        padding: 4px;
        background: rgba(248,248,240,0.97);
        display: flex; flex-direction: column; align-items: center;
        box-shadow: 2px 2px 0 rgba(0,0,0,0.30);
      }
      .bm-champion-poke-img { width: 42px; height: 42px; object-fit: contain; }
      .bm-champion-poke-fb { font-size: 30px; }
      .bm-champion-poke-name {
        font-family: 'Fredoka One', cursive;
        font-size: 9px; color: #111;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 80px;
      }
      .bm-champion-defeated {
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 12px; color: rgba(255,255,255,0.70);
        margin-top: 6px;
        font-style: italic;
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
  // Match-win chime — shorter than sfxChampion, fires between tournament matches.
  // 3-note ascending, lighter than the full champion fanfare.
  function sfxMatchWin () {
    _tone(523, 0.14, 'triangle', 0.16);
    setTimeout(() => _tone(784, 0.14, 'triangle', 0.16), 100);
    setTimeout(() => _tone(1047, 0.22, 'triangle', 0.18), 200);
  }
  // A5: time-out — 3-note descending blip, distinct from sfxWrong so the player
  // knows the turn ended because of the clock, not a wrong answer.
  function sfxTimeout () {
    _tone(440, 0.12, 'square', 0.14);
    setTimeout(() => _tone(330, 0.14, 'square', 0.13), 110);
    setTimeout(() => _tone(220, 0.22, 'square', 0.16), 230);
  }

  // ── Confetti ────────────────────────────────────────────────────────
  function spawnConfetti (count, originEl, paletteOverride) {
    // v53.3 polish: paletteOverride can be a single hex string OR an array.
    // finishMatch / showChampion pass the winner Pokemon's TYPE_COLOR so
    // the confetti matches the victory type (fire winner → red/orange burst).
    let colors = ['#06B6D4','#0EA5E9','#8B5CF6','#EC4899','#FCD34D','#34D399','#FB923C'];
    if (paletteOverride) {
      if (Array.isArray(paletteOverride) && paletteOverride.length) colors = paletteOverride;
      else if (typeof paletteOverride === 'string') {
        // Mix the type color with bright white-gold accents for contrast.
        colors = [paletteOverride, paletteOverride, '#FCD34D', '#FFFFFF', paletteOverride];
      }
    }
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

  // ── v52 (concern 6): diversified question bank — 80% math / 20% mixed ──
  // Owner: "pertanyaannya jangan matematika semua 20% pertanyaan pertanyaan lain,
  //   misal buah apa yang xxxx atau hewan apa yang xx." Kid-comprehension grade 1-4.
  // The existing choice-button click compares the rendered choice string to the
  // answer string, so non-numeric answers work without any engine change.
  const QUESTION_BANK = {
    fruits: [
      { q:'Buah apa yang berwarna kuning panjang?',     ans:'Pisang',   choices:['Pisang','Apel','Anggur','Semangka'] },
      { q:'Buah apa yang berwarna merah dan bulat?',    ans:'Apel',     choices:['Apel','Pisang','Jeruk','Pir'] },
      { q:'Buah apa yang luarnya hijau, dalamnya merah?', ans:'Semangka', choices:['Semangka','Apel','Mangga','Melon'] },
      { q:'Buah apa yang ungu kecil-kecil?',            ans:'Anggur',   choices:['Anggur','Stroberi','Ceri','Blueberry'] },
      { q:'Buah apa yang oranye dan asam segar?',       ans:'Jeruk',    choices:['Jeruk','Pisang','Mangga','Apel'] },
      { q:'Buah apa yang berwarna oranye dan manis di musim panas?', ans:'Mangga', choices:['Mangga','Jeruk','Pir','Pepaya'] },
      { q:'Buah apa yang kulitnya berduri, dagingnya manis?', ans:'Nanas', choices:['Nanas','Durian','Salak','Apel'] },
      { q:'Buah apa yang baunya tajam tapi rasanya manis?', ans:'Durian', choices:['Durian','Mangga','Pepaya','Jeruk'] },
      { q:'Buah kecil merah yang biasa di atas kue?',   ans:'Ceri',     choices:['Ceri','Stroberi','Anggur','Blueberry'] },
      { q:'Buah apa yang biasa untuk salad, hijau bulat?', ans:'Melon',  choices:['Melon','Apel','Jeruk','Mangga'] }
    ],
    animals: [
      { q:'Hewan apa yang bisa terbang?',               ans:'Burung',   choices:['Burung','Ikan','Kucing','Sapi'] },
      { q:'Hewan apa yang hidup di air?',               ans:'Ikan',     choices:['Ikan','Kuda','Ayam','Anjing'] },
      { q:'Hewan apa yang berkokok di pagi hari?',      ans:'Ayam',     choices:['Ayam','Bebek','Burung','Anjing'] },
      { q:'Hewan apa yang berkata "meong"?',            ans:'Kucing',   choices:['Kucing','Anjing','Sapi','Kambing'] },
      { q:'Hewan apa yang berkata "guk-guk"?',          ans:'Anjing',   choices:['Anjing','Kucing','Bebek','Sapi'] },
      { q:'Hewan apa yang menghasilkan susu?',          ans:'Sapi',     choices:['Sapi','Ayam','Bebek','Kuda'] },
      { q:'Hewan apa yang punya belalai panjang?',      ans:'Gajah',    choices:['Gajah','Jerapah','Singa','Beruang'] },
      { q:'Hewan apa yang lehernya panjang sekali?',    ans:'Jerapah',  choices:['Jerapah','Gajah','Kuda','Unta'] },
      { q:'Hewan apa yang melompat dan punya kantung?', ans:'Kanguru',  choices:['Kanguru','Kelinci','Tupai','Panda'] },
      { q:'Hewan apa yang dijuluki raja hutan?',        ans:'Singa',    choices:['Singa','Harimau','Beruang','Serigala'] },
      { q:'Hewan apa yang sukanya makan wortel?',       ans:'Kelinci',  choices:['Kelinci','Sapi','Kuda','Kambing'] },
      { q:'Hewan apa yang membangun sarang di pohon?',  ans:'Burung',   choices:['Burung','Ikan','Anjing','Sapi'] }
    ],
    colors: [
      { q:'Warna apa hasil merah + kuning?',            ans:'Oranye',   choices:['Oranye','Hijau','Ungu','Biru'] },
      { q:'Warna apa hasil biru + kuning?',             ans:'Hijau',    choices:['Hijau','Ungu','Oranye','Pink'] },
      { q:'Warna apa hasil merah + biru?',              ans:'Ungu',     choices:['Ungu','Hijau','Oranye','Coklat'] },
      { q:'Warna apa langit cerah?',                    ans:'Biru',     choices:['Biru','Merah','Hijau','Hitam'] },
      { q:'Warna apa rumput?',                          ans:'Hijau',    choices:['Hijau','Biru','Coklat','Ungu'] },
      { q:'Warna apa matahari?',                        ans:'Kuning',   choices:['Kuning','Biru','Hijau','Ungu'] },
      { q:'Warna apa salju?',                           ans:'Putih',    choices:['Putih','Hitam','Abu-abu','Biru'] },
      { q:'Warna apa pisang yang matang?',              ans:'Kuning',   choices:['Kuning','Hijau','Merah','Coklat'] }
    ],
    opposites: [
      { q:'Lawan kata BESAR?',                          ans:'Kecil',    choices:['Kecil','Tinggi','Pendek','Lebar'] },
      { q:'Lawan kata TINGGI?',                         ans:'Pendek',   choices:['Pendek','Besar','Kecil','Lebar'] },
      { q:'Lawan kata PANAS?',                          ans:'Dingin',   choices:['Dingin','Hangat','Sejuk','Kering'] },
      { q:'Lawan kata SIANG?',                          ans:'Malam',    choices:['Malam','Pagi','Sore','Subuh'] },
      { q:'Lawan kata BUKA?',                           ans:'Tutup',    choices:['Tutup','Naik','Turun','Berhenti'] },
      { q:'Lawan kata CEPAT?',                          ans:'Lambat',   choices:['Lambat','Tinggi','Rendah','Tebal'] },
      { q:'Lawan kata KAYA?',                           ans:'Miskin',   choices:['Miskin','Hemat','Mahal','Murah'] },
      { q:'Lawan kata TUA?',                            ans:'Muda',     choices:['Muda','Lama','Baru','Lebar'] },
      { q:'Lawan kata GELAP?',                          ans:'Terang',   choices:['Terang','Suram','Pekat','Buram'] },
      { q:'Lawan kata BERAT?',                          ans:'Ringan',   choices:['Ringan','Padat','Tebal','Keras'] }
    ],
    bodyParts: [
      { q:'Bagian tubuh apa untuk melihat?',            ans:'Mata',     choices:['Mata','Telinga','Hidung','Mulut'] },
      { q:'Bagian tubuh apa untuk mendengar?',          ans:'Telinga',  choices:['Telinga','Mata','Hidung','Mulut'] },
      { q:'Bagian tubuh apa untuk mencium bau?',        ans:'Hidung',   choices:['Hidung','Mulut','Mata','Telinga'] },
      { q:'Bagian tubuh apa untuk berjalan?',           ans:'Kaki',     choices:['Kaki','Tangan','Kepala','Mata'] },
      { q:'Bagian tubuh apa untuk memegang?',           ans:'Tangan',   choices:['Tangan','Kaki','Telinga','Hidung'] },
      { q:'Bagian tubuh apa untuk berbicara?',          ans:'Mulut',    choices:['Mulut','Hidung','Mata','Telinga'] },
      { q:'Berapa jumlah jari di satu tangan?',         ans:'5',        choices:['5','4','6','10'] }
    ]
  };
  // 20% non-math sampler. Uses the same {q, ans, choices} shape so the existing
  // choice-render + click-handler work unchanged.
  function pickFromBank (cat) {
    const pool = QUESTION_BANK[cat];
    const q = pool[Math.floor(Math.random() * pool.length)];
    // Shuffle choices so the answer position varies match-to-match.
    return { q: q.q, ans: q.ans, choices: q.choices.slice().sort(() => Math.random() - 0.5) };
  }
  function pickQuestion (level) {
    if (Math.random() >= 0.2) return makeMathQ(level);
    const cats = ['fruits','animals','colors','opposites','bodyParts'];
    return pickFromBank(cats[Math.floor(Math.random() * cats.length)]);
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
  // v56.0 B-289 — the CDN uses HYPHENATED slugs (chien-pao.png); this file's slugs are
  // already underscored for LOCAL filenames. Underscores leaking into CDN URLs made all
  // 26 hyphenated Gen-9 species 404 → giant 🎲 emoji fallback (owner screenshot).
  function cdnSlug (slug) { return String(slug || '').replace(/_/g, '-'); }
  function spritePath (id, slug) {
    // v54.29: owner reported name/sprite mismatch (Dolliv labeled, Growlithe/Dolliv
    // hybrid rendered) — root cause is the LOCAL asset bundle has corrupted /
    // AI-merged files for some Gen 9 species. Switch to the canonical PokemonDB
    // CDN as the PRIMARY source for these known-bad ids; fall through to local
    // for everything else. The onerror handlers throughout the file already
    // catch 404s and replace with the emoji span.
    if (LOCAL_SPRITE_BLOCKLIST.has(id)) {
      return 'https://img.pokemondb.net/sprites/home/normal/' + cdnSlug(slug) + '.png';
    }
    var padded = String(id).padStart(4, '0');
    return _ASSET_BASE + 'assets/Pokemon/pokemondb_hd_alt2/' + padded + '_' + slug + '.webp';
  }
  // Ids whose LOCAL .webp is mis-named or mis-content per audit. Anything in here
  // bypasses the local bundle entirely.
  // v56.0 B-289 — EMPTY again: tools/fix-gen9-sprites.py re-downloaded all 104 corrupt
  // ids (Gen 9 924-1025 + 564/565) from the canonical CDN, deleted the off-by-2 scheme
  // duplicates (0 dup id-prefixes remain), and the fake bloodmoon-ursaluna roster dupe
  // was removed. Local-first restored → Gen 9 first-paint is instant again on the
  // tablet (was CDN-bound 1-3s). Mechanism kept for any future bad id.
  const LOCAL_SPRITE_BLOCKLIST = new Set([]);

  // v54.29 onerror chain: try CDN once if local 404s; then replace with the
  // emoji/star span. Without the CDN step, ALL non-blocklisted corrupted files
  // would silently render their wrong content (no 404 to catch). This catches
  // 404s only (corruption-but-loads stays a manual fix via the blocklist above).
  if (typeof window !== 'undefined' && !window._bmSpriteOnError) {
    // v56.0 B-289 — fallback chain: pokemondb CDN (HYPHENATED slug — was leaking
    // underscores → guaranteed 404) → Pokemon Showdown gen5 (strips separators) →
    // pokeball placeholder image → emoji span only as the absolute last resort.
    window._bmSpriteOnError = function(img, slug, emoji, cls) {
      try {
        if (!img.dataset.bmCdnTried) {
          img.dataset.bmCdnTried = '1';
          img.src = 'https://img.pokemondb.net/sprites/home/normal/' + cdnSlug(slug) + '.png';
          return;
        }
        if (!img.dataset.bmSdTried) {
          img.dataset.bmSdTried = '1';
          img.src = 'https://play.pokemonshowdown.com/sprites/gen5/' +
            cdnSlug(slug).replace(/-/g, '') + '.png';
          return;
        }
        if (!img.dataset.bmBallTried) {
          img.dataset.bmBallTried = '1';
          img.src = _ASSET_BASE + 'assets/Pokemon/pokeballs-png/pokeball.png';
          return;
        }
      } catch(_) {}
      try {
        const span = document.createElement('span');
        span.textContent = emoji || '⭐';
        if (cls) span.className = cls;
        img.replaceWith(span);
      } catch(_) {}
    };
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

  // ── v52 Per-gym arena background (concern 1) ──
  // Map each region to one of the 9 G13C gym-themed background assets.
  const REGION_BG = {
    kanto:  'forest_m.webp',
    johto:  'gym_m.webp',
    hoenn:  'water_m.webp',
    sinnoh: 'gym2_m.webp',
    unova:  'volcano_m.webp',
    kalos:  'gym_p.webp',
    alola:  'water2_m.webp',
    galar:  'water3_m.webp',
    paldea: 'water_p.webp',
    // v53.6 region expansion — Hisui (Legends Arceus, snowy ancient Sinnoh)
    // + Orange Islands (anime archipelago, tropical waters).
    hisui:  'water2_m.webp',
    orange: 'water_m.webp'
  };
  function regionFromTeam (team) {
    if (!team || !team.length) return null;
    for (const p of team) {
      if (p && p._region) return p._region;
    }
    return null;
  }
  function pickArenaBg (team1, team2, matchSeed) {
    const r1 = regionFromTeam(team1);
    const r2 = regionFromTeam(team2);
    matchSeed = matchSeed | 0;
    if (r1 && r2 && r1 === r2) return REGION_BG[r1] || null;
    if (r1 && r2) return REGION_BG[(matchSeed % 2 === 0) ? r1 : r2] || null;
    return REGION_BG[r1 || r2] || null;
  }
  function applyArenaBg (root, team1, team2, matchSeed) {
    const arena = root && root.querySelector('.bm-arena');
    if (!arena) return;
    // v56.9 A-323 — "stylenya sama": the PvP/Tournament arena now uses the SAME
    // stadium plate as the Adventure BattleArena (the CSS default), instead of a
    // per-matchup gym background — so the two battle modes read as one style. The
    // region-themed weather layer below is KEPT for ambiance/variety.
    arena.style.removeProperty('--bm-arena-bg');
    // v53.1: pair the BG swap with a matching weather layer (rain on water gyms,
    // embers on volcano, leaves on forest, sparkle on psychic). regionFromTeam
    // is defined alongside REGION_BG; weather catalog is in WEATHER_BY_REGION.
    try {
      const r1 = regionFromTeam(team1);
      const r2 = regionFromTeam(team2);
      const seed = (matchSeed | 0);
      let useRegion;
      if (r1 && r2 && r1 === r2) useRegion = r1;
      else if (r1 && r2) useRegion = (seed % 2 === 0) ? r1 : r2;
      else useRegion = r1 || r2 || null;
      spawnWeather(arena, useRegion);
    } catch (e) {}
  }

  // ── v52 PvP/Tournament BGM (concerns 5 + 7) ──
  // Port of G13C bgmPlay/bgmStop with PvP-scoped volume = 0.245 (70% of G13C's 0.35).
  // Owner: "backsound saat pvp dan tournament jangan keras pakai 70% volume dari suara gym pokemon."
  // Honours window.__bmMuted (set by mute toggle) on every (re)start.
  var _bmBgmEl = null;
  var _bmBgmVolume = 0.245;
  function bmBgmPlay () {
    try {
      if (!_bmBgmEl) {
        _bmBgmEl = document.createElement('audio');
        _bmBgmEl.dataset.bgm = 'pvp';
        _bmBgmEl.src = _ASSET_BASE + 'assets/Pokemon/sound/18 Pokémon Gym（１９９７－１９９８｜Ｍ５７Ｂ） - Satoshi Sakai No Masta - SoundLoadMate.com.mp3';
        _bmBgmEl.loop = true;
        _bmBgmEl.volume = _bmBgmVolume;
        document.body.appendChild(_bmBgmEl);
      }
      _bmBgmEl.volume = window.__bmMuted ? 0 : _bmBgmVolume;
      _bmBgmEl.currentTime = 0;
      const p = _bmBgmEl.play();
      if (p && p.catch) p.catch(() => {
        setTimeout(() => { try { _bmBgmEl && _bmBgmEl.play().catch(() => {}); } catch (e) {} }, 300);
      });
    } catch (e) {}
  }
  function bmBgmStop () {
    try {
      if (!_bmBgmEl || _bmBgmEl.paused) return;
      let v = _bmBgmEl.volume;
      const fade = setInterval(() => {
        v = Math.max(0, v - 0.04);
        if (_bmBgmEl) _bmBgmEl.volume = v;
        if (v <= 0) {
          clearInterval(fade);
          if (_bmBgmEl) { _bmBgmEl.pause(); _bmBgmEl.volume = _bmBgmVolume; }
        }
      }, 40);
    } catch (e) {}
  }
  function bmBgmSetMuted (muted) {
    window.__bmMuted = !!muted;
    try { localStorage.setItem('bm-mute', muted ? '1' : '0'); } catch (e) {}
    if (_bmBgmEl) _bmBgmEl.volume = muted ? 0 : _bmBgmVolume;
  }
  function bmBgmIsMuted () {
    if (typeof window.__bmMuted !== 'undefined') return !!window.__bmMuted;
    try {
      const stored = localStorage.getItem('bm-mute');
      window.__bmMuted = (stored === '1');
      return window.__bmMuted;
    } catch (e) { window.__bmMuted = false; return false; }
  }

  // ── v53.0 (concern 4): Speed-stat turn order ─────────────────────────────
  // Canonical Pokemon base Speed by species slug. Covers ~120 commonly-picked
  // species (≥95% of POKE_PACKAGES entries). Unknown slug → default 70.
  // Mega forms inherit the base form's Speed unless canonically faster.
  const SPEED_BY_SLUG = {
    // Gen 1 starters + finals
    bulbasaur: 45, ivysaur: 60, venusaur: 80, 'venusaur-mega': 80,
    charmander: 65, charmeleon: 80, charizard: 100,
    'charizard-mega-x': 100, 'charizard-mega-y': 100,
    squirtle: 43, wartortle: 58, blastoise: 78, 'blastoise-mega': 78,
    // Gen 1 commons + early route
    pidgey: 56, pidgeotto: 71, pidgeot: 101,
    caterpie: 45, metapod: 30, butterfree: 70,
    weedle: 50, kakuna: 35, beedrill: 75,
    rattata: 72, raticate: 97, spearow: 70, fearow: 100,
    pikachu: 90, raichu: 110,
    sandshrew: 40, sandslash: 65,
    'nidoran-f': 41, nidorina: 56, nidoqueen: 76,
    'nidoran-m': 50, nidorino: 65, nidoking: 85,
    clefairy: 35, clefable: 60, vulpix: 65, ninetales: 100,
    jigglypuff: 20, wigglytuff: 45, zubat: 55, golbat: 90,
    oddish: 30, gloom: 40, vileplume: 50,
    paras: 25, parasect: 30, venonat: 45, venomoth: 90,
    diglett: 95, dugtrio: 120, meowth: 90, persian: 115,
    psyduck: 55, golduck: 85, mankey: 70, primeape: 95,
    growlithe: 60, arcanine: 95, poliwag: 90, poliwhirl: 90, poliwrath: 70,
    abra: 90, kadabra: 105, alakazam: 120, 'alakazam-mega': 150,
    machop: 35, machoke: 45, machamp: 55,
    bellsprout: 40, weepinbell: 55, victreebel: 70,
    tentacool: 70, tentacruel: 100, geodude: 20, graveler: 35, golem: 45,
    ponyta: 90, rapidash: 105, slowpoke: 15, slowbro: 30, slowking: 30,
    magnemite: 45, magneton: 70, 'farfetch-d': 60, 'farfetchd': 60,
    doduo: 75, dodrio: 110, seel: 45, dewgong: 70,
    grimer: 25, muk: 50, shellder: 40, cloyster: 70,
    gastly: 80, haunter: 95, gengar: 110, 'gengar-mega': 130,
    onix: 70, drowzee: 42, hypno: 67,
    krabby: 50, kingler: 75, voltorb: 100, electrode: 150,
    exeggcute: 40, exeggutor: 55, cubone: 35, marowak: 45,
    hitmonlee: 87, hitmonchan: 76, lickitung: 30,
    koffing: 35, weezing: 60, rhyhorn: 25, rhydon: 40,
    chansey: 50, tangela: 60, kangaskhan: 90,
    horsea: 60, seadra: 85, goldeen: 63, seaking: 68,
    staryu: 85, starmie: 115, 'mr-mime': 90, scyther: 105,
    jynx: 95, electabuzz: 105, magmar: 93, pinsir: 85,
    tauros: 110, magikarp: 80, gyarados: 81,
    lapras: 60, ditto: 48, eevee: 55,
    vaporeon: 65, jolteon: 130, flareon: 65,
    porygon: 40, omanyte: 35, omastar: 55, kabuto: 55, kabutops: 80,
    aerodactyl: 130, snorlax: 30,
    articuno: 85, zapdos: 100, moltres: 90, dratini: 50, dragonair: 70, dragonite: 80,
    mewtwo: 130, mew: 100,
    // Gen 2 starters + finals
    chikorita: 45, bayleef: 60, meganium: 80,
    cyndaquil: 65, quilava: 80, typhlosion: 100,
    totodile: 43, croconaw: 58, feraligatr: 78,
    pichu: 60, cleffa: 15, igglybuff: 15,
    togepi: 20, togetic: 40, mareep: 35, flaaffy: 55, ampharos: 55,
    espeon: 110, umbreon: 65, murkrow: 91, slowking: 30,
    misdreavus: 85, unown: 48, wobbuffet: 33,
    girafarig: 85, pineco: 15, forretress: 40,
    dunsparce: 45, gligar: 85, steelix: 30, snubbull: 30, granbull: 45,
    qwilfish: 85, scizor: 65, shuckle: 5, heracross: 85,
    sneasel: 115, teddiursa: 40, ursaring: 55,
    slugma: 20, magcargo: 30, swinub: 50, piloswine: 50,
    corsola: 35, remoraid: 55, octillery: 45,
    delibird: 75, mantine: 70, skarmory: 70, houndour: 65, houndoom: 95,
    kingdra: 85, phanpy: 40, donphan: 50, porygon2: 60, stantler: 85,
    smeargle: 75, tyrogue: 35, hitmontop: 70,
    smoochum: 65, elekid: 95, magby: 83, miltank: 100, blissey: 55,
    raikou: 115, entei: 100, suicune: 85, larvitar: 41, pupitar: 51, tyranitar: 61,
    'lugia': 110, 'ho-oh': 90, celebi: 100,
    // Gen 3-9 starters (commonly-picked)
    treecko: 70, grovyle: 95, sceptile: 120,
    torchic: 45, combusken: 55, blaziken: 80,
    mudkip: 40, marshtomp: 50, swampert: 60,
    ralts: 40, kirlia: 50, gardevoir: 80, 'gardevoir-mega': 100,
    zigzagoon: 60, poochyena: 35,
    turtwig: 31, grotle: 36, torterra: 56,
    chimchar: 61, monferno: 81, infernape: 108,
    piplup: 40, prinplup: 50, empoleon: 60,
    snivy: 63, servine: 83, serperior: 113,
    tepig: 45, pignite: 55, emboar: 65,
    oshawott: 45, dewott: 55, samurott: 70,
    chespin: 38, quilladin: 57, chesnaught: 64,
    fennekin: 60, braixen: 73, delphox: 104,
    froakie: 71, frogadier: 97, greninja: 122,
    fletchling: 62, talonflame: 126, hawlucha: 118, goomy: 33, goodra: 80, noibat: 116, noivern: 123,
    rowlet: 42, dartrix: 52, decidueye: 70,
    litten: 70, torracat: 90, incineroar: 60,
    popplio: 40, brionne: 50, primarina: 60,
    grookey: 65, thwackey: 90, rillaboom: 85,
    scorbunny: 69, raboot: 84, cinderace: 119,
    sobble: 70, drizzile: 60, inteleon: 120,
    sprigatito: 65, floragato: 87, meowscarada: 123,
    fuecoco: 39, crocalor: 59, skeledirge: 66,
    quaxly: 65, quaxwell: 65, quaquaval: 85,
    terapagos: 80, hatenna: 49,
    // Mega + legend extras
    'lucario-mega': 112, lucario: 90,
    'mewtwo-mega-x': 130, 'mewtwo-mega-y': 140
  };
  function speedFromSlug (slug) {
    if (!slug) return 70;
    const s = SPEED_BY_SLUG[slug];
    return (typeof s === 'number') ? s : 70;
  }

  // ── v53.4 balance (concern 3): canonical Pokemon Atk + Def base stats ──
  // Tuple format: [attack, defense]. Drives the statRatio multiplier in
  // calcDamage so glass-cannon vs tank matchups feel canonical. Unknown
  // slug → neutral [70, 70]. ~120 entries cover the same coverage as
  // SPEED_BY_SLUG (≥95% of POKE_PACKAGES hits + common Pokedex picks).
  const STAT_BY_SLUG = {
    // Gen 1 starters + finals (Atk / Def)
    bulbasaur: [49, 49], ivysaur: [62, 63], venusaur: [82, 83], 'venusaur-mega': [100, 123],
    charmander: [52, 43], charmeleon: [64, 58], charizard: [84, 78],
    'charizard-mega-x': [130, 111], 'charizard-mega-y': [104, 78],
    squirtle: [48, 65], wartortle: [63, 80], blastoise: [83, 100], 'blastoise-mega': [103, 120],
    // Gen 1 commons + Kanto roster
    pidgey: [45, 40], pidgeotto: [60, 55], pidgeot: [80, 75],
    caterpie: [30, 35], metapod: [20, 55], butterfree: [45, 50],
    weedle: [35, 30], kakuna: [25, 50], beedrill: [90, 40],
    rattata: [56, 35], raticate: [81, 60], spearow: [60, 30], fearow: [90, 65],
    pikachu: [55, 40], raichu: [90, 55],
    sandshrew: [75, 85], sandslash: [100, 110],
    'nidoran-f': [47, 52], nidorina: [62, 67], nidoqueen: [92, 87],
    'nidoran-m': [57, 40], nidorino: [72, 57], nidoking: [102, 77],
    clefairy: [45, 48], clefable: [70, 73], vulpix: [41, 40], ninetales: [76, 75],
    jigglypuff: [45, 20], wigglytuff: [70, 45], zubat: [45, 35], golbat: [80, 70],
    oddish: [50, 55], gloom: [65, 70], vileplume: [80, 85],
    paras: [70, 55], parasect: [95, 80], venonat: [55, 50], venomoth: [65, 60],
    diglett: [55, 25], dugtrio: [100, 50], meowth: [45, 35], persian: [70, 60],
    psyduck: [52, 48], golduck: [82, 78], mankey: [80, 35], primeape: [105, 60],
    growlithe: [70, 45], arcanine: [110, 80], poliwag: [50, 40], poliwhirl: [65, 65], poliwrath: [95, 95],
    abra: [20, 15], kadabra: [35, 30], alakazam: [50, 45], 'alakazam-mega': [50, 65],
    machop: [80, 50], machoke: [100, 70], machamp: [130, 80],
    bellsprout: [75, 35], weepinbell: [90, 50], victreebel: [105, 65],
    tentacool: [40, 35], tentacruel: [70, 65], geodude: [80, 100], graveler: [95, 115], golem: [120, 130],
    ponyta: [85, 55], rapidash: [100, 70], slowpoke: [65, 65], slowbro: [75, 110], slowking: [75, 80],
    magnemite: [35, 70], magneton: [60, 95], 'farfetch-d': [90, 55], 'farfetchd': [90, 55],
    doduo: [85, 45], dodrio: [110, 70], seel: [45, 55], dewgong: [70, 80],
    grimer: [80, 50], muk: [105, 75], shellder: [65, 100], cloyster: [95, 180],
    gastly: [35, 30], haunter: [50, 45], gengar: [65, 60], 'gengar-mega': [65, 80],
    onix: [45, 160], drowzee: [48, 45], hypno: [73, 70],
    krabby: [105, 90], kingler: [130, 115], voltorb: [30, 50], electrode: [50, 70],
    exeggcute: [40, 80], exeggutor: [95, 85], cubone: [50, 95], marowak: [80, 110],
    hitmonlee: [120, 53], hitmonchan: [105, 79], lickitung: [55, 75],
    koffing: [65, 95], weezing: [90, 120], rhyhorn: [85, 95], rhydon: [130, 120],
    chansey: [5, 5], tangela: [55, 115], kangaskhan: [95, 80],
    horsea: [40, 70], seadra: [65, 95], goldeen: [67, 60], seaking: [92, 65],
    staryu: [45, 55], starmie: [75, 85], 'mr-mime': [45, 65], scyther: [110, 80],
    jynx: [50, 35], electabuzz: [83, 57], magmar: [95, 57], pinsir: [125, 100],
    tauros: [100, 95], magikarp: [10, 55], gyarados: [125, 79],
    lapras: [85, 80], ditto: [48, 48], eevee: [55, 50],
    vaporeon: [65, 60], jolteon: [65, 60], flareon: [130, 60],
    porygon: [60, 70], omanyte: [40, 100], omastar: [60, 125], kabuto: [80, 90], kabutops: [115, 105],
    aerodactyl: [105, 65], snorlax: [110, 65],
    articuno: [85, 100], zapdos: [90, 85], moltres: [100, 90], dratini: [64, 45], dragonair: [84, 65], dragonite: [134, 95],
    mewtwo: [110, 90], mew: [100, 100],
    // Gen 2 starters + finals
    chikorita: [49, 65], bayleef: [62, 80], meganium: [82, 100],
    cyndaquil: [52, 43], quilava: [64, 58], typhlosion: [84, 78],
    totodile: [65, 64], croconaw: [80, 80], feraligatr: [105, 100],
    pichu: [40, 15], cleffa: [25, 28], igglybuff: [30, 15],
    togepi: [20, 65], togetic: [40, 85], mareep: [40, 40], flaaffy: [55, 55], ampharos: [75, 85],
    espeon: [65, 60], umbreon: [65, 110], murkrow: [85, 42],
    misdreavus: [60, 60], unown: [72, 48], wobbuffet: [33, 58],
    girafarig: [80, 65], pineco: [65, 90], forretress: [90, 140],
    dunsparce: [70, 70], gligar: [75, 105], steelix: [85, 200], snubbull: [80, 50], granbull: [120, 75],
    qwilfish: [95, 75], scizor: [130, 100], shuckle: [10, 230], heracross: [125, 75],
    sneasel: [95, 55], teddiursa: [80, 50], ursaring: [130, 75],
    slugma: [40, 40], magcargo: [50, 120], swinub: [50, 40], piloswine: [100, 80],
    corsola: [55, 95], remoraid: [65, 35], octillery: [105, 75],
    delibird: [55, 45], mantine: [40, 70], skarmory: [80, 140], houndour: [60, 30], houndoom: [90, 50],
    kingdra: [95, 95], phanpy: [60, 60], donphan: [120, 120], porygon2: [80, 90], stantler: [95, 62],
    smeargle: [20, 35], tyrogue: [35, 35], hitmontop: [95, 95],
    smoochum: [30, 15], elekid: [63, 37], magby: [75, 37], miltank: [80, 105], blissey: [10, 10],
    raikou: [85, 75], entei: [115, 85], suicune: [75, 115], larvitar: [64, 50], pupitar: [84, 70], tyranitar: [134, 110],
    'lugia': [90, 130], 'ho-oh': [130, 90], celebi: [100, 100],
    // Gen 3-9 starters (popular picks)
    treecko: [45, 35], grovyle: [65, 45], sceptile: [85, 65],
    torchic: [60, 40], combusken: [85, 60], blaziken: [120, 70],
    mudkip: [70, 50], marshtomp: [85, 70], swampert: [110, 90],
    ralts: [25, 25], kirlia: [35, 35], gardevoir: [65, 65], 'gardevoir-mega': [85, 65],
    zigzagoon: [30, 41], poochyena: [55, 35],
    turtwig: [68, 64], grotle: [85, 85], torterra: [109, 105],
    chimchar: [58, 44], monferno: [78, 52], infernape: [104, 71],
    piplup: [51, 53], prinplup: [66, 68], empoleon: [86, 88],
    snivy: [45, 55], servine: [60, 75], serperior: [75, 95],
    tepig: [63, 45], pignite: [93, 55], emboar: [123, 65],
    oshawott: [55, 45], dewott: [75, 60], samurott: [100, 85],
    chespin: [61, 65], quilladin: [78, 95], chesnaught: [107, 122],
    fennekin: [45, 40], braixen: [59, 58], delphox: [69, 72],
    froakie: [56, 40], frogadier: [63, 52], greninja: [95, 67],
    fletchling: [50, 43], talonflame: [81, 71], hawlucha: [92, 75], goomy: [50, 35], goodra: [100, 70], noibat: [30, 35], noivern: [70, 80],
    rowlet: [55, 55], dartrix: [75, 75], decidueye: [107, 75],
    litten: [65, 40], torracat: [85, 50], incineroar: [115, 90],
    popplio: [54, 54], brionne: [69, 69], primarina: [74, 74],
    grookey: [65, 50], thwackey: [85, 70], rillaboom: [125, 90],
    scorbunny: [71, 40], raboot: [86, 60], cinderace: [116, 75],
    sobble: [40, 40], drizzile: [60, 55], inteleon: [85, 65],
    sprigatito: [61, 54], floragato: [80, 63], meowscarada: [110, 70],
    fuecoco: [45, 59], crocalor: [55, 78], skeledirge: [75, 100],
    quaxly: [65, 45], quaxwell: [85, 65], quaquaval: [120, 80],
    terapagos: [105, 110], hatenna: [30, 45],
    // Mega + legend extras
    'lucario-mega': [145, 88], lucario: [110, 70],
    'mewtwo-mega-x': [190, 100], 'mewtwo-mega-y': [150, 70]
  };
  function attackFromSlug (slug) {
    if (!slug) return 70;
    const s = STAT_BY_SLUG[slug];
    return (s && typeof s[0] === 'number') ? s[0] : 70;
  }
  function defenseFromSlug (slug) {
    if (!slug) return 70;
    const s = STAT_BY_SLUG[slug];
    return (s && typeof s[1] === 'number') ? s[1] : 70;
  }
  // Anti-streak random tiebreak for equal-speed turns. Eliminates residual
  // P1-first bias when two same-speed Pokemon face off.
  function decideTurnOrder (p1, p2, state) {
    const s1 = (p1 && typeof p1.speed === 'number') ? p1.speed : 70;
    const s2 = (p2 && typeof p2.speed === 'number') ? p2.speed : 70;
    if (s1 > s2) return 0;
    if (s2 > s1) return 1;
    state.tiebreakLast = (state.tiebreakLast === 0) ? 1 : 0;
    return state.tiebreakLast;
  }
  // ── v53.0 polish #14: haptics ──
  // Tiny shim around navigator.vibrate. Feature-detects (desktop no-op).
  // Honours v52 mute toggle — one off-switch silences all output channels.
  function bmHaptic (pattern) {
    try {
      if (bmBgmIsMuted()) return;
      if (!navigator || typeof navigator.vibrate !== 'function') return;
      navigator.vibrate(pattern);
    } catch (e) {}
  }

  // ── v53.1 SFX expansion ─────────────────────────────────────────────────
  // White-noise burst via filtered buffer-source — used for water splash + crowd.
  function _noiseBurst (duration, type, vol) {
    try {
      const ctx = _ctx(); if (!ctx) return;
      const sr = ctx.sampleRate;
      const len = Math.max(1, Math.floor(sr * duration));
      const buf = ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      // Pink-ish noise (1/f) for crowd; white noise for water/splash.
      let b0=0, b1=0, b2=0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'pink') {
          b0 = 0.997 * b0 + 0.029591 * white;
          b1 = 0.985 * b1 + 0.032534 * white;
          b2 = 0.950 * b2 + 0.048056 * white;
          data[i] = (b0 + b1 + b2 + white * 0.18) * 0.18;
        } else {
          data[i] = white;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass'; filt.frequency.value = (type === 'pink') ? 600 : 1400; filt.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol || 0.10, ctx.currentTime + 0.02);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      src.connect(filt); filt.connect(g); g.connect(ctx.destination);
      src.start();
      src.stop(ctx.currentTime + duration + 0.02);
    } catch (e) {}
  }
  // Type-specific attack whoosh — fires alongside the visual lunge. Replaces
  // the dead 404'd type-attack SFX path references the v52 plan flagged.
  function sfxAttackByType (type) {
    if (bmBgmIsMuted()) return;
    switch (type) {
      case 'fire':
        _tone(220, 0.06, 'sawtooth', 0.12);
        setTimeout(() => _tone(110, 0.10, 'sawtooth', 0.10), 40);
        break;
      case 'water':
        _noiseBurst(0.18, 'white', 0.09);
        break;
      case 'electric':
        _tone(1300, 0.05, 'square', 0.10);
        setTimeout(() => _tone(680,  0.06, 'square', 0.10), 30);
        setTimeout(() => _tone(1100, 0.05, 'square', 0.10), 70);
        break;
      case 'grass':
        _tone(440, 0.10, 'triangle', 0.10);
        setTimeout(() => _tone(330, 0.08, 'triangle', 0.09), 60);
        break;
      case 'ice':
        _tone(1500, 0.06, 'sine', 0.10);
        setTimeout(() => _tone(900,  0.10, 'sine', 0.09), 50);
        break;
      case 'psychic':
        _tone(720, 0.18, 'sine', 0.10);
        break;
      case 'fighting':
      case 'rock':
      case 'ground':
        _tone(110, 0.10, 'square', 0.13);
        break;
      case 'poison':
        _tone(600, 0.08, 'sine', 0.09);
        setTimeout(() => _tone(420, 0.10, 'sine', 0.08), 60);
        break;
      case 'flying':
      case 'bug':
        _tone(500, 0.05, 'triangle', 0.10);
        setTimeout(() => _tone(380, 0.06, 'triangle', 0.09), 30);
        break;
      case 'ghost':
      case 'dark':
        _tone(180, 0.12, 'sawtooth', 0.10);
        break;
      case 'dragon':
        _tone(140, 0.10, 'sawtooth', 0.12);
        setTimeout(() => _tone(95, 0.16, 'sawtooth', 0.11), 70);
        break;
      case 'steel':
        _tone(2200, 0.04, 'square', 0.09);
        setTimeout(() => _tone(1800, 0.04, 'square', 0.08), 30);
        break;
      case 'fairy':
        _tone(1200, 0.08, 'sine', 0.09);
        setTimeout(() => _tone(1700, 0.10, 'sine', 0.09), 50);
        break;
      default: // normal
        _tone(200, 0.08, 'sine', 0.10);
    }
  }
  // Pink-noise crowd-cheer swell — fires on super-effective + KO.
  function sfxCrowdCheer () {
    if (bmBgmIsMuted()) return;
    _noiseBurst(0.9, 'pink', 0.07);
  }
  // Looping low-HP heartbeat — fires when active Pokemon HP < 25%.
  // Self-stops via _bmHeartTimer reset; idempotent start/stop.
  let _bmHeartTimer = 0;
  function sfxLowHPStart () {
    if (_bmHeartTimer) return;
    const tick = () => {
      if (!_bmHeartTimer) return;
      if (!bmBgmIsMuted()) {
        _tone(80, 0.08, 'square', 0.10);
        setTimeout(() => _tone(60, 0.10, 'square', 0.09), 100);
      }
    };
    _bmHeartTimer = setInterval(tick, 750);
    tick();
  }
  function sfxLowHPStop () {
    if (!_bmHeartTimer) return;
    clearInterval(_bmHeartTimer);
    _bmHeartTimer = 0;
  }

  // ── v53.1 weather per region (couples with v52 REGION_BG) ─────────────
  // Each gym region gets an ambient particle layer that matches its mood.
  // Particles are absolute-positioned divs inside the arena, animated by
  // CSS keyframes (see injectPvPRealCSS). Honours prefers-reduced-motion
  // (the existing v52 @media rule disables animations on .bm-pvp-real *).
  const WEATHER_BY_REGION = {
    kanto:  'leaf',     // grassy plains → leaves
    johto:  'sparkle',  // Pokemon-Gym vibe → sparkle
    hoenn:  'rain',     // water → rain
    sinnoh: 'sparkle',  // psychic gym2 → sparkle
    unova:  'ember',    // volcano → embers
    kalos:  'sparkle',  // elegant region → sparkle
    alola:  'rain',     // tropical island → rain
    galar:  'rain',     // industrial → drizzle
    paldea: 'ember',    // desert grass → embers
    // v53.6: Hisui = ancient snowy Sinnoh → sparkle (snowfall feel)
    //        Orange Islands = anime tropical archipelago → rain (sea spray)
    hisui:  'sparkle',
    orange: 'rain'
  };
  function spawnWeather (arenaEl, regionId) {
    if (!arenaEl) return;
    // Remove any existing layer (re-render or new match).
    const prev = arenaEl.querySelector('.bm-weather-layer');
    if (prev) prev.remove();
    const kind = regionId && WEATHER_BY_REGION[regionId];
    if (!kind) return;
    const layer = document.createElement('div');
    layer.className = 'bm-weather-layer bm-weather-' + kind;
    // 14 particles is enough to look populated without being noisy.
    const count = 14;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'bm-weather-particle';
      // Stagger left% across 0–100, randomise delay + duration so it doesn't
      // look like a synchronised march.
      const left = (i * 100 / count) + ((((i * 37) % 100) / 100) - 0.5) * 8;
      const delay = (i * 0.18) + (((i * 53) % 100) / 100) * 0.5;
      const dur = 2.6 + (((i * 71) % 100) / 100) * 1.8;
      p.style.left = left + '%';
      p.style.animationDelay = '-' + delay + 's';
      p.style.animationDuration = dur + 's';
      if (kind === 'leaf')    p.textContent = (i % 2 ? '🍃' : '🍂');
      else if (kind === 'ember')   p.textContent = '🔥';
      else if (kind === 'sparkle') p.textContent = '✨';
      // rain particles use ::before content from CSS — leave empty
      layer.appendChild(p);
    }
    arenaEl.appendChild(layer);
  }

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
    // v55.0 — AbortController timeout + 3-retry backoff so the load can never
    // hang forever. Owner reported "Memuat Pokedex…" sticking eternally after
    // SW cache thrashing in this session. (Closes B-210, B-211.)
    const TIMEOUT_MS = 15000;
    const MAX_TRIES = 3;
    function attempt (tryNum) {
      const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
      return fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
        .then(r => {
          if (timer) clearTimeout(timer);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(db => {
          _pokeDB = db;
          _slugToId = {};
          db.forEach(p => { _slugToId[p.slug] = p.id; });
          return db;
        })
        .catch(err => {
          if (timer) clearTimeout(timer);
          console.warn('[battle-modes] pokedex fetch try ' + tryNum + '/' + MAX_TRIES + ' failed', err);
          if (tryNum < MAX_TRIES) {
            // Linear backoff: 800ms, 1600ms
            return new Promise(r => setTimeout(r, tryNum * 800)).then(() => attempt(tryNum + 1));
          }
          throw err;
        });
    }
    return attempt(1);
  }
  function slugToId (slug) {
    if (_slugToId && _slugToId[slug]) return _slugToId[slug];
    if (slug && _slugToId) {
      // Strip regional prefix (alolan-vulpix → vulpix) and form suffix
      // (charizard-mega-x → charizard) to find the base-form id.
      const stripped = slug
        .replace(/^(alolan|galarian|hisuian|paldean)-/, '')
        .replace(/-(mega|gmax|primal)(-[xy])?$/, '');
      if (_slugToId[stripped]) return _slugToId[stripped];
      // Final fallback: first segment only
      const base = stripped.split('-')[0];
      if (_slugToId[base]) return _slugToId[base];
    }
    return 0;
  }
  // Convert canonical hyphen-slug to the sprite library's underscore format,
  // strip regional + form prefixes/suffixes so the file always exists.
  //   ho-oh        → ho_oh            (file: 0250_ho_oh.webp)
  //   tapu-koko    → tapu_koko        (file: 0785_tapu_koko.webp)
  //   wo-chien     → wo_chien         (file: 0999_wo_chien.webp)
  //   alolan-vulpix → vulpix          (file: 0037_vulpix.webp — base form only)
  //   charizard-mega-x → charizard    (file: 0006_charizard.webp)
  //   gengar-mega   → gengar          (file: 0094_gengar.webp)
  function spriteSlug (slug) {
    if (!slug) return '';
    return slug
      .replace(/^(alolan|galarian|hisuian|paldean)-/, '')
      .replace(/-(mega|gmax|primal)(-[xy])?$/, '')
      .replace(/-/g, '_');
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
      // v53.0 (concern 4): stamp canonical Pokemon base Speed so decideTurnOrder
      // resolves who acts first. Unknown slug → 70 (neutral).
      speed: speedFromSlug(entry.slug),
      // v53.4 (concern 3): canonical Atk + Def for calcDamage's statRatio.
      attack:  attackFromSlug(entry.slug),
      defense: defenseFromSlug(entry.slug),
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
  // v54.30 (balance): box legendaries + Ultra Beasts blocked from random rolls
  // so a 🎲 Acak Kalos team never produces a 6-Pokemon Mewtwo+Lugia+Rayquaza
  // wipe-team against a base-tier Hoenn Starter team. Players who want
  // legendaries still get them via the "Legendaris" package picks.
  const _LEGEND_BLOCKLIST = new Set([
    150, 249, 250,
    382, 383, 384,
    483, 484, 487,
    643, 644, 646,
    716, 717, 718,
    785, 786, 787, 788,
    791, 792, 800,
    793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806,
    888, 889, 890,
    898, 1005, 1006, 1020
  ]);
  function buildTeamFromRegion (gen, teamSize) {
    if (!_pokeDB) return [];
    const pool = _pokeDB.filter(p =>
      p.gen === gen && !_EXCLUDED_IDS.has(p.id) && !_LEGEND_BLOCKLIST.has(p.id)
    );
    if (!pool.length) return [];
    // Fisher-Yates shuffle (no Math.random bias) — truly random per click.
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
    }
    // v52 (concern 1): stamp _region so renderArena → applyArenaBg can pick the
    // gym-themed BG for "🎲 Acak" random-region teams too.
    const _regionId = (RANDOM_REGIONS.find(r => r.gen === gen) || {}).id || null;
    // v54.30 (balance): HP raised from 80 → 95 so random teams never tower over
    // package teams (Hoenn base 90, final 110). Per-hit cap inside calcDamage
    // is the primary safeguard; this floor smooths the residual edge.
    return shuffled.slice(0, teamSize).map(buildRandomPokemon).map(p => ({ ...p, hp:95, hpMax:95, _region: _regionId }));
  }

  // Adapt G13C-format Pokemon to engine format: add id (from slug→id map), color
  // (from type), pwr on each move (derived from move-name heuristic + STAB).
  // Preserve G13C's per-tier HP (base 90 / final 115 / mega 125-130) — owner:
  // "ikuti alur dan logika game Gym Pokemon yang asli". Match length stays
  // reasonable because pwr scales with STAB + time-mult + elem.
  function adaptPkmFromG13C (pkm) {
    const moves = (pkm.moves || []).slice(0, 4).map(mv => {
      let pwr;
      const isWeak = /^(Tackle|Pound|Scratch|Bide|Withdraw|Growl|Tail Whip|Leer|Endure|Harden|Defense Curl|Smokescreen|Sand Attack|Sing|Howl|Rest|Recover|Heal Bell|Cotton Spore|Lick|Charm|Sweet Kiss|Mean Look|Protect|Astonish|Mimic|Disable|String Shot|Hypnosis|Supersonic|Screech|Confuse Ray|Calm Mind|Teleport|Light Screen|Agility|Double Team|Spikes|Magnitude|Play Nice|Synthesis|Iron Defense|Powder Snow|Sleep Powder)$/.test(mv.name);
      const isQuick = /^(Quick Attack|Bite|Peck|Headbutt|Ember|Water Gun|Vine Whip|Thunder Shock|Confusion|Pound|Spark|Bubble|Absorb|Gust|Mud Slap|Bubble Beam|Mud Shot|Aqua Jet|Wing Attack|Slash|Mach Punch|Ice Shard|Extreme Speed|Bullet Punch|Sonic Boom|Disarming Voice|Rapid Spin|Razor Leaf|Bullet Seed|Leech Seed|Fire Fang|Ice Fang|Thunder Fang|Aerial Ace|Karate Chop|Rock Throw|Bug Bite|Steel Wing)$/.test(mv.name);
      if (isWeak) pwr = 18;
      else if (isQuick) pwr = 24;
      else if (mv.type === pkm.type) pwr = 32;   // STAB-typed signature
      else pwr = 28;
      return { name: mv.name, type: mv.type, pwr };
    });
    // HP from G13C package data — preserves base/final/mega tier scaling.
    const maxHp = pkm.maxHp || pkm.hp || 80;
    return {
      id: slugToId(pkm.slug),
      name: pkm.name,
      slug: pkm.slug,
      type: pkm.type,
      color: TYPE_COLOR[pkm.type] || '#A8A878',
      emoji: '⭐',
      hp: maxHp,    // start at full HP
      hpMax: maxHp,
      // v53.0 (concern 4): canonical Pokemon base Speed for turn-order initiative.
      speed: speedFromSlug(pkm.slug),
      // v53.4 (concern 3): canonical Atk + Def base stats. Drives statRatio
      // inside calcDamage so a glass-cannon (Charizard 84/78) hits harder
      // than a tank-type signature, and a Snorlax (110/65) absorbs less DEF.
      attack:  attackFromSlug(pkm.slug),
      defense: defenseFromSlug(pkm.slug),
      moves
    };
  }

  // Build a fresh team from a package by id. Reads window.POKE_PACKAGES.
  // v52: stamps `_region` (and `_pkgId`) on every team member so renderArena
  // can resolve the gym-themed BG without threading opts through every caller.
  function buildTeamFromPackage (pkgId, teamSize) {
    const packages = getPokePackages();
    const pkg = packages.find(p => p.id === pkgId) || packages[0];
    if (!pkg || !pkg.team) return [];
    return pkg.team.slice(0, teamSize).map(p => {
      const adapted = adaptPkmFromG13C(p);
      adapted._region = pkg.region || null;
      adapted._pkgId  = pkg.id || null;
      return adapted;
    });
  }

  // ── Picker HTML builder (MODULE SCOPE) ────────────────────────────────────
  // Called from BOTH startPvP and startTournament. Was previously inside
  // startPvP's closure → Tournament's renderTourPick threw
  // "renderPkgPickerHtml is not defined". Real-mouse-click + console-error
  // probe (deep-testing standard #6) caught this.
  function renderPkgPickerHtml (teamSize) {
    const all = getPokePackages();
    let tabs = '<div class="bm-region-tabs">';
    REGION_ORDER.forEach(regKey => {
      if (!all.some(p => p.region === regKey)) return;
      const rmeta = REGION_META[regKey];
      tabs += `<button class="bm-region-tab" data-jump="bm-anchor-${regKey}">${rmeta.emoji} ${rmeta.name}</button>`;
    });
    tabs += '<button class="bm-region-tab" data-jump="bm-anchor-random">🎲 Acak</button>';
    tabs += '</div>';
    let html = tabs;
    REGION_ORDER.forEach(regKey => {
      const inRegion = all.filter(p => p.region === regKey);
      if (!inRegion.length) return;
      const rmeta = REGION_META[regKey];
      html += `<div class="bm-section-label" id="bm-anchor-${regKey}">${rmeta.emoji} ${rmeta.name}</div>`;
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
                  <img src="${spritePath(id, spriteSlug(p.slug))}" alt="${escapeHtml(p.name)}"
                       loading="lazy" decoding="async"
                       onerror="window._bmSpriteOnError(this,'${spriteSlug(p.slug)}','⭐','bm-pkg-thumb-fallback')">
                </div>`;
              }).join('')}
            </div>
          </button>
        `;
      });
      html += `</div>`;
    });
    html += `<div class="bm-section-label" id="bm-anchor-random">🎲 Tim Acak · per Region (1024 Pokemon)</div>`;
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
  // Time multiplier curve — owner spec: "dibuat 1.6 max multipliernya" (bumped
  // from 1.3 to 1.6). Linear decay: 0ms → 1.60, 1000ms → 1.54, 5000ms → 1.30,
  // 10000ms → 1.0. Auto-fail at 10000ms.
  const ANSWER_TIMEOUT_MS = 10000;
  // v53.4 balance (concern 3A): tighten cap from 1.6× → 1.4× so a single
  // lucky-fast answer doesn't snowball the match. Slope tuned so 0s = 1.4×
  // and 7s+ floors at 1.0×.
  function timeMultFromElapsed (elapsedMs) {
    if (elapsedMs == null || elapsedMs < 0) return 1.0;
    // v54.30 (balance): ceiling lowered 1.4 → 1.2 to match the type-chart cap
    // ("elemen itu 1.2x max pengali"). Fast answer reward stays, but the
    // worst-case multiplier stack no longer one-shots base-tier Pokemon.
    const raw = 1.2 - (elapsedMs / 1000) * 0.040;
    return Math.max(1.0, Math.min(1.2, raw));
  }
  function typeMult (moveType, defType) {
    // v56.9 review #41 — cover the FULL 18-type roster by delegating to the shared
    // kid-friendly chart (games/data/poke-type-chart.js `calcTypeMult`, M-303)
    // instead of the local 6-type table, so random full-dex teams actually get
    // Super/Tidak-Efektif. Clamp into battle-modes' kid range [0.6,1.2] so the
    // owner's "elemen 1.2x max" cap + the tuned balance are preserved. Falls back
    // to the local table if the shared module isn't loaded.
    try {
      if (typeof global.calcTypeMult === 'function') {
        var m = global.calcTypeMult(moveType, defType);
        if (typeof m === 'number' && m > 0) return Math.min(1.2, Math.max(0.6, m));
      }
    } catch (e) {}
    const t = (TYPE_CHART[moveType] || {})[defType];
    return t == null ? 1.0 : t;
  }
  function calcDamage (atk, move, def, timeMult, mitigation) {
    const stab = move.type === atk.type ? 1.25 : 1.0;
    const tm   = typeMult(move.type, def.type);
    const tMul = (typeof timeMult === 'number' && timeMult > 0) ? timeMult : 1.0;
    // v54.30 balance (no one-shot KOs): statRatio clamp tightened from
    // [0.6, 1.6] → [0.75, 1.35]. Glass-cannon vs tank is still felt, but the
    // 1.6× swing combined with STAB+timeMult was producing 95-125 dmg vs
    // 80-90 HP defenders. New range keeps the lever meaningful while the
    // per-hit cap below guarantees no fresh defender drops 100→0 in one strike.
    const atkStat = (atk && typeof atk.attack === 'number') ? atk.attack : 70;
    const defStat = (def && typeof def.defense === 'number') ? def.defense : 70;
    const statRatio = Math.max(0.75, Math.min(1.35, atkStat / defStat));
    const aSpd = (atk && typeof atk.speed === 'number') ? atk.speed : 70;
    const dSpd = (def && typeof def.speed === 'number') ? def.speed : 70;
    let spdMod = 1.0;
    if (aSpd >= dSpd + 30) spdMod = 1.10;
    else if (aSpd <= dSpd - 30) spdMod = 0.95;
    // v54.30 balance (CRITICAL): per-hit damage cap at 40% of defender hpMax.
    // Owner reported (2026-06-24, screenshot): P1 5 Pokemon alive vs P2 1
    // alive — Malamar (Acak Kalos, default 70/70 stats) one-shotting Hoenn
    // Starter base team. New rule: a fresh defender ALWAYS survives ≥1 hit.
    // Cap scales per defender — final-tier 110 HP caps at 44, base 90 caps at 36.
    // v56.9 A-323 balance: COMEBACK ASSIST — when the defender's side is behind
    // (computed at the call site from team-HP%), incoming damage is softened
    // (~0.90×) so a near-loss can be clawed back. Gated to PvP/Tournament (the
    // only calcDamage caller); layers UNDER the 40%-hpMax per-hit cap so the
    // "no one-shot" guarantee is untouched. Default 1.0 = no change.
    const mit = (typeof mitigation === 'number' && mitigation > 0 && mitigation <= 1) ? mitigation : 1.0;
    const raw = Math.floor(move.pwr * stab * tm * tMul * statRatio * spdMod * mit);
    const cap = Math.floor(((def && def.hpMax) || 90) * 0.40);
    return Math.max(1, Math.min(raw, cap));
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
    // v56.9 review #42 — derive the chip from the SAME source combat now uses
    // (shared getWeaknesses), so it can't advertise a weakness the engine ignores.
    var ws;
    try {
      ws = (typeof global.getWeaknesses === 'function') ? global.getWeaknesses(type, 2) : (WEAKNESS[type] || []);
    } catch (e) { ws = WEAKNESS[type] || []; }
    if (!ws || !ws.length) return '<span class="bm-weak-chip bm-weak-none">⚖ Seimbang</span>';
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

    // v52 (concerns 5+7): wire G13C gym OST at 70% of G13C's base volume (0.245).
    // Tournament sets opts._noBgm = true so its own bmBgmPlay isn't re-triggered
    // by per-match startPvP calls.
    if (!opts._noBgm) {
      bmBgmIsMuted(); // primes window.__bmMuted from localStorage
      bmBgmPlay();
    }

    const root = document.createElement('div');
    root.className = 'bm-pvp-real';
    // v52: marker so teardown knows whether to silence BGM. Tournament's
    // per-match PvP roots set _noBgm → teardown skips bmBgmStop and the OST
    // keeps playing across matches.
    if (opts._noBgm) root.dataset.noBgm = '1';
    document.body.appendChild(root);
    // v56.8 B-293 — PvP owns the whole screen: park the host page's mounted
    // BattleArena Adventure scene (backdrop/motes/cards/VS keep animating
    // underneath otherwise). Restored in teardown(). No-op outside gym-pokemon.
    try { if (window.BattleArena && window.BattleArena.setSceneVisible) window.BattleArena.setSceneVisible(false); } catch (e) {}

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
      // v53.0 (concern 4): initial turn re-decided by decideTurnOrder before the
      // first action menu renders. Tournament path (opts.teams set → preStep =
      // 'battle') decides on state creation; PvP picker path decides in
      // advancePickStep when preStep flips to 'battle'.
      turn: 0,
      tiebreakLast: 1,   // first equal-speed tiebreak picks 0 (parity)
      _initiativeShown: false,
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
      comboCount: [0, 0],
      // v56.9 A-323 balance: DYNAMIC per-round initiative. roundActed tracks who
      // has acted in the current round; when both have, the next round's leader is
      // re-decided by the ACTIVE Pokemon's Speed (decideRoundLead) instead of a
      // blind alternation — breaking the permanent first-mover advantage.
      roundActed: [],
      _lastLead: null
    };
    // v54.30 balance: PvP HP floor — every Pokemon in PvP/Tournament has
    // hpMax ≥ 95 so a Kalos-random team never towers over a Hoenn-Starter
    // base team. Random-region teams build at 95; package teams that come
    // in below 95 (none currently, but defends against future low-HP packs)
    // get raised here. Final-tier 110 and mega-tier 125+ keep their HP.
    function applyPvPHpFloor (team) {
      if (!Array.isArray(team)) return;
      const FLOOR = 95;
      team.forEach(p => {
        if (!p) return;
        if ((p.hpMax || 0) < FLOOR) {
          p.hpMax = FLOOR;
          p.hp    = FLOOR;
        }
      });
    }
    applyPvPHpFloor(state.teams[0]);
    applyPvPHpFloor(state.teams[1]);

    // Active Pokemon shorthand. ALWAYS use this — never read state.teams directly
    // outside engine internals.
    function activePoke (playerIdx) {
      return state.teams[playerIdx][state.activeIdx[playerIdx]];
    }

    // v56.9 A-323 balance helpers.
    // teamHpFrac — a side's remaining team health as a fraction (0..1) across the
    // WHOLE team (fainted count as 0). Drives both the comeback assist and the
    // round-lead speed tiebreak.
    function teamHpFrac (idx) {
      const t = state.teams[idx] || [];
      let hp = 0, mx = 0;
      t.forEach(p => { if (p) { hp += Math.max(0, p.hp || 0); mx += (p.hpMax || 0); } });
      return mx > 0 ? hp / mx : 1;
    }
    // decideRoundLead — who leads the NEXT round: faster ACTIVE Pokemon first
    // (rewards Speed + smart switching). Speed tie → the side BEHIND on team HP
    // leads (comeback); still tied → alternate via tiebreakLast.
    function decideRoundLead () {
      const a0 = activePoke(0), a1 = activePoke(1);
      const s0 = (a0 && typeof a0.speed === 'number') ? a0.speed : 70;
      const s1 = (a1 && typeof a1.speed === 'number') ? a1.speed : 70;
      if (s0 > s1) return 0;
      if (s1 > s0) return 1;
      const h0 = teamHpFrac(0), h1 = teamHpFrac(1);
      if (h0 < h1 - 0.001) return 0;
      if (h1 < h0 - 0.001) return 1;
      state.tiebreakLast = (state.tiebreakLast === 0) ? 1 : 0;
      return state.tiebreakLast;
    }
    // announceRoundLead — brief pill when the round leader CHANGES (reuses the
    // .bm-init-banner styling). Skipped on the very first round (the VS/initiative
    // banner already covers it) and when the leader is unchanged (no spam).
    function announceRoundLead (leaderIdx) {
      if (state._lastLead === leaderIdx) return;
      state._lastLead = leaderIdx;
      if (!state._initiativeShown) return; // round 1 handled by the initiative banner
      try {
        const host = document.querySelector('.bm-pvp-real, .bm-tour');
        if (!host) return;
        const who = activePoke(leaderIdx);
        const nm = (who && who.name) || (opts.players && opts.players[leaderIdx] && opts.players[leaderIdx].name) || ('P' + (leaderIdx + 1));
        const b = document.createElement('div');
        b.className = 'bm-init-banner bm-round-lead';
        b.innerHTML = '<span>⚡</span> <b>' + escapeHtml(nm) + '</b> duluan!';
        host.appendChild(b);
        setTimeout(() => { try { b.classList.add('out'); } catch (e) {} }, 1100);
        setTimeout(() => { try { b.remove(); } catch (e) {} }, 1600);
      } catch (e) {}
    }

    // v53.0 (concern 4): reveal who acts first based on Speed, with a brief
    // banner. Called on transition into the battle phase (both Tournament's
    // direct-to-battle and PvP picker's advancePickStep).
    function revealInitiative () {
      const p1 = activePoke(0), p2 = activePoke(1);
      state.turn = decideTurnOrder(p1, p2, state);
      // v56.9 A-323: seed round-1 leader + clear round tracking so the round-lead
      // pill only fires when the leader actually CHANGES on later rounds.
      state.roundActed = [];
      state._lastLead = state.turn;
      // v53.4 bug fix: re-render so the active q-zone matches the new turn.
      // Previously the initial renderRoot painted with the default turn=0;
      // when Speed flipped the turn to 1 the DOM stayed stale until the next
      // user click, producing "banner says P2 first / bottom (P1) still
      // appears active". Synchronous renderRoot here aligns DOM with state
      // before the VS card dismisses and the user can interact.
      try { renderRoot(); } catch (e) {}
      if (state._initiativeShown) return;
      state._initiativeShown = true;
      const fasterP = state.turn === 0 ? p1 : p2;
      const fasterSpd = state.turn === 0 ? (p1.speed ?? 70) : (p2.speed ?? 70);
      setTimeout(() => {
        const host = document.querySelector('.bm-pvp-real');
        if (!host) return;
        const banner = document.createElement('div');
        banner.className = 'bm-init-banner';
        banner.innerHTML = `<span>⚡</span> <b>${escapeHtml(fasterP.name)}</b> lebih cepat — duluan! <span class="bm-init-spd">Spd ${fasterSpd}</span>`;
        host.appendChild(banner);
        setTimeout(() => { try { banner.classList.add('out'); } catch (e) {} }, 1400);
        setTimeout(() => { try { banner.remove(); } catch (e) {} }, 1900);
      }, 80);
    }

    // v53.1: VS Card intro — full-screen split-screen "P1 vs P2" with both
    // team grids, region pill, and 3-2-1 "FIGHT!" countdown. Auto-dismisses
    // in ~2800ms; tap anywhere to skip. Calls onDone when removed so the
    // initiative banner can follow.
    function showVsCard (onDone) {
      if (state._vsCardShown) { onDone && onDone(); return; }
      state._vsCardShown = true;
      const p1Active = activePoke(0), p2Active = activePoke(1);
      const p1Team = state.teams[0] || [];
      const p2Team = state.teams[1] || [];
      const p1Name = (opts.players && opts.players[0]) ? opts.players[0].name : 'Pemain 1';
      const p2Name = (opts.players && opts.players[1]) ? opts.players[1].name : 'Pemain 2';
      const r1 = regionFromTeam(p1Team), r2 = regionFromTeam(p2Team);
      const r1Meta = (r1 && REGION_META[r1]) || null;
      const r2Meta = (r2 && REGION_META[r2]) || null;
      function teamRowHtml (team, activeIdx) {
        return team.map((p, i) => {
          const isAct = i === activeIdx;
          return `<div class="bm-vs-mini ${isAct ? 'is-active' : ''}" title="${escapeHtml(p.name)}">
            <img alt="" src="${spritePath(p.id, spriteSlug(p.slug))}" onerror="window._bmSpriteOnError(this,'${spriteSlug(p.slug)}','⭐','bm-vs-mini-fb')">
          </div>`;
        }).join('');
      }
      const card = document.createElement('div');
      card.className = 'bm-vs-card';
      card.innerHTML = `
        <div class="bm-vs-half bm-vs-p1">
          <div class="bm-vs-tag"><span class="bm-pvp-badge p1">P1</span> ${escapeHtml(p1Name)}</div>
          <div class="bm-vs-poke-name">${escapeHtml(p1Active.name)}</div>
          ${r1Meta ? `<div class="bm-vs-region">${r1Meta.emoji} ${r1Meta.name}</div>` : ''}
          <div class="bm-vs-mini-row">${teamRowHtml(p1Team, state.activeIdx[0])}</div>
        </div>
        <div class="bm-vs-center">
          <div class="bm-vs-vs">VS</div>
          <div class="bm-vs-countdown" id="bm-vs-cd">3</div>
        </div>
        <div class="bm-vs-half bm-vs-p2">
          <div class="bm-vs-tag"><span class="bm-pvp-badge p2">P2</span> ${escapeHtml(p2Name)}</div>
          <div class="bm-vs-poke-name">${escapeHtml(p2Active.name)}</div>
          ${r2Meta ? `<div class="bm-vs-region">${r2Meta.emoji} ${r2Meta.name}</div>` : ''}
          <div class="bm-vs-mini-row">${teamRowHtml(p2Team, state.activeIdx[1])}</div>
        </div>
        <button class="bm-vs-skip" id="bm-vs-skip">Lewati ▸</button>
      `;
      document.body.appendChild(card);
      const cd = card.querySelector('#bm-vs-cd');
      const seq = ['3', '2', '1', 'FIGHT!'];
      let i = 1;
      const cdTimer = setInterval(() => {
        if (!cd) return;
        cd.textContent = seq[i];
        cd.classList.remove('bm-vs-pulse');
        // re-trigger animation
        void cd.offsetWidth;
        cd.classList.add('bm-vs-pulse');
        i++;
        if (i >= seq.length) clearInterval(cdTimer);
      }, 600);
      const dismiss = () => {
        clearInterval(cdTimer);
        card.classList.add('out');
        setTimeout(() => { try { card.remove(); } catch (e) {}; onDone && onDone(); }, 350);
      };
      const skipBtn = card.querySelector('#bm-vs-skip');
      if (skipBtn) skipBtn.addEventListener('click', dismiss);
      // Auto-dismiss at 2800ms (3 + 2 + 1 + FIGHT! ~600ms each ≈ 2400 + 400 hold)
      setTimeout(dismiss, 2800);
    }

    // Battle-entry sequence: VS card → initiative banner. Both routes converge.
    function beginBattleSequence () {
      showVsCard(() => {
        try { revealInitiative(); } catch (e) {}
      });
    }

    // Tournament path: opts.teams supplied → preStep already 'battle'. Begin
    // the sequence immediately; PvP picker path's advancePickStep does the same.
    if (state.preStep === 'battle') {
      try { beginBattleSequence(); } catch (e) {}
    }
    let _timerRaf = 0;       // RAF handle for tickTimer
    let _timerExpired = false;

    function exitMatch () {
      if (confirm('Keluar dari match?')) {
        // v52 (concerns 5+7): silence BGM only when the user truly exits PvP.
        // Tournament's per-match exit (winner advances) keeps BGM playing.
        if (!opts._noBgm) bmBgmStop();
        // v56.9 review #23/#24: kill the per-turn question-timer RAF and the
        // low-HP heartbeat interval on exit — neither self-stops once the root is
        // detached, so they leaked one loop / one beeping interval per exit.
        try { stopQuestionTimer(); } catch (e) {}
        try { sfxLowHPStop(); } catch (e) {}
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
        <button class="bm-mute-btn" data-mute aria-label="Bisukan musik">${bmBgmIsMuted() ? '🔇' : '🔊'}</button>
        <button class="bm-pause-btn" data-pause aria-label="Jeda permainan">⏸</button>

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
      // v52 (concerns 5+7+polish #6): persistent mute toggle for BGM (and the
      // SFX layer once it consults bmBgmIsMuted()). Survives page reloads via
      // localStorage. Owner: "kasih 10-20 ide super menarik" → mute is item #6.
      const _muteBtn = root.querySelector('[data-mute]');
      if (_muteBtn) _muteBtn.addEventListener('click', () => {
        const next = !bmBgmIsMuted();
        bmBgmSetMuted(next);
        _muteBtn.textContent = next ? '🔇' : '🔊';
      });
      // v53.2 polish #4: pause button — face-to-face snack-break overlay.
      const _pauseBtn = root.querySelector('[data-pause]');
      if (_pauseBtn) _pauseBtn.addEventListener('click', pauseGame);
      // v52 (concern 1): set --bm-arena-bg per the active matchup's region.
      applyArenaBg(root, state.teams[0], state.teams[1], state.matchNo | 0);
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
        <button class="bm-mute-btn" data-mute aria-label="Bisukan musik">${bmBgmIsMuted() ? '🔇' : '🔊'}</button>
        <button class="bm-pause-btn" data-pause aria-label="Jeda permainan">⏸</button>
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
      // v52 (concerns 5+7+polish #6): persistent mute toggle for BGM (and the
      // SFX layer once it consults bmBgmIsMuted()). Survives page reloads via
      // localStorage. Owner: "kasih 10-20 ide super menarik" → mute is item #6.
      const _muteBtn = root.querySelector('[data-mute]');
      if (_muteBtn) _muteBtn.addEventListener('click', () => {
        const next = !bmBgmIsMuted();
        bmBgmSetMuted(next);
        _muteBtn.textContent = next ? '🔇' : '🔊';
      });
      // v53.2 polish #4: pause button — face-to-face snack-break overlay.
      const _pauseBtn = root.querySelector('[data-pause]');
      if (_pauseBtn) _pauseBtn.addEventListener('click', pauseGame);
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

    // renderPkgPickerHtml is now defined at module scope (so startTournament
    // can reach it). startPvP inherits the module-scope binding.

    function wirePickerHandlers (root, playerIdx, advanceFn) {
      // Region quick-nav tabs — scroll the picker scroll-container to the anchor.
      root.querySelectorAll('.bm-region-tab').forEach(t => {
        t.addEventListener('click', () => {
          const targetId = t.getAttribute('data-jump');
          const anchor = root.querySelector('#' + targetId);
          if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      root.querySelectorAll('.bm-pkg-card[data-pkg]').forEach(b => {
        b.addEventListener('click', () => {
          const pkgId = b.getAttribute('data-pkg');
          state.teams[playerIdx] = buildTeamFromPackage(pkgId, state.teamSize);
          applyPvPHpFloor(state.teams[playerIdx]);    // v54.30 balance
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
            applyPvPHpFloor(state.teams[playerIdx]);  // v54.30 balance
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
        <button class="bm-mute-btn" data-mute aria-label="Bisukan musik">${bmBgmIsMuted() ? '🔇' : '🔊'}</button>
        <button class="bm-pause-btn" data-pause aria-label="Jeda permainan">⏸</button>
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
      // v52 (concerns 5+7+polish #6): persistent mute toggle for BGM (and the
      // SFX layer once it consults bmBgmIsMuted()). Survives page reloads via
      // localStorage. Owner: "kasih 10-20 ide super menarik" → mute is item #6.
      const _muteBtn = root.querySelector('[data-mute]');
      if (_muteBtn) _muteBtn.addEventListener('click', () => {
        const next = !bmBgmIsMuted();
        bmBgmSetMuted(next);
        _muteBtn.textContent = next ? '🔇' : '🔊';
      });
      // v53.2 polish #4: pause button — face-to-face snack-break overlay.
      const _pauseBtn = root.querySelector('[data-pause]');
      if (_pauseBtn) _pauseBtn.addEventListener('click', pauseGame);
        wirePickerHandlers(root, playerIdx, advancePickStep);
      };
      if (wasLoaded) {
        draw();
      } else {
        // Show a quick loading state while the 19KB pokemon-db fetches.
        root.innerHTML = `
          <button class="bm-back bm-real-exit" data-exit>×</button>
        <button class="bm-mute-btn" data-mute aria-label="Bisukan musik">${bmBgmIsMuted() ? '🔇' : '🔊'}</button>
        <button class="bm-pause-btn" data-pause aria-label="Jeda permainan">⏸</button>
          <div class="bm-prestep" style="padding-top:60px;">
            <div class="bm-prestep-title">📦 Memuat Pokedex…</div>
            <div class="bm-prestep-sub">Sebentar, sedang siapkan pakettim Pokemon.</div>
          </div>
        `;
        root.querySelector('[data-exit]').addEventListener('click', exitMatch);
      // v52 (concerns 5+7+polish #6): persistent mute toggle for BGM (and the
      // SFX layer once it consults bmBgmIsMuted()). Survives page reloads via
      // localStorage. Owner: "kasih 10-20 ide super menarik" → mute is item #6.
      const _muteBtn = root.querySelector('[data-mute]');
      if (_muteBtn) _muteBtn.addEventListener('click', () => {
        const next = !bmBgmIsMuted();
        bmBgmSetMuted(next);
        _muteBtn.textContent = next ? '🔇' : '🔊';
      });
      // v53.2 polish #4: pause button — face-to-face snack-break overlay.
      const _pauseBtn = root.querySelector('[data-pause]');
      if (_pauseBtn) _pauseBtn.addEventListener('click', pauseGame);
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
        // v53.0 + v53.1: both teams locked-in → VS card intro then Speed initiative.
        try { beginBattleSequence(); } catch (e) {}
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

    // ── v53.2 polish #4: pause / resume snack-break ───────────────────────
    // Owner: critical for face-to-face 2-player so kids can break for snacks.
    // Freezes question timer + BGM; shifts state.questionStartedAt on resume
    // so elapsed time doesn't count the pause. Tap "Lanjut Main" to resume.
    function pauseGame () {
      if (state.paused) return;
      state.paused = true;
      state.pausedAt = Date.now();
      stopQuestionTimer();
      try { if (_bmBgmEl) _bmBgmEl.pause(); } catch (e) {}
      try { sfxLowHPStop(); } catch (e) {}
      showPauseOverlay();
    }
    function resumeGame () {
      if (!state.paused) return;
      state.paused = false;
      // Shift the question-clock baseline forward by the pause duration so
      // the remaining timer matches what the player saw before they paused.
      if (state.questionStartedAt && state.pausedAt) {
        state.questionStartedAt += (Date.now() - state.pausedAt);
      }
      state.pausedAt = 0;
      try { if (_bmBgmEl && !bmBgmIsMuted()) { const p = _bmBgmEl.play(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
      hidePauseOverlay();
      if (state.phase === 'question' && !state.switchForced) startQuestionTimer();
    }
    function showPauseOverlay () {
      if (document.querySelector('.bm-pause-overlay')) return;
      const ov = document.createElement('div');
      ov.className = 'bm-pause-overlay';
      ov.innerHTML = `
        <div class="bm-pause-card">
          <div class="bm-pause-icon">⏸️</div>
          <div class="bm-pause-title">ISTIRAHAT</div>
          <div class="bm-pause-sub">Permainan dijeda — minum dulu, bro!</div>
          <button class="bm-pause-resume" id="bm-pause-resume">▶ Lanjut Main</button>
        </div>
      `;
      document.body.appendChild(ov);
      const resumeBtn = ov.querySelector('#bm-pause-resume');
      if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
    }
    function hidePauseOverlay () {
      const ov = document.querySelector('.bm-pause-overlay');
      if (ov) ov.remove();
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
      // v56.1 A-317 — SHARED BattleArena skin classes (games/battle-arena.js):
      // .ba-cardskin = white rounded HP card, .ba-outline = white sticker
      // outline on the field sprites. Skin-only: layout, P2 180° rotation,
      // selectors (.bm-*) and the cdnSlug/spritePath/_bmSpriteOnError sprite
      // resolution (v56.0 B-289) are all preserved exactly.
      return `
        <section class="bm-arena">
          <!-- Opponent quadrant (P2) — top-right, mirrors .g10-espr-wrap -->
          <div class="bm-arena-opp">
            <div class="bm-info-card ba-cardskin">
              <div class="bm-info-name">${escapeHtml(p2.name)}</div>
              <div class="bm-info-chips">
                <span class="bm-type-chip" style="background:${p2.color};">${TYPE_ICON[p2.type] || ''} ${p2.type}</span>
                ${weaknessChipHtml(p2.type)}
                <span class="bm-speed-pill">⚡ ${p2.speed ?? 70}</span>
              </div>
              <div class="bm-hp-row">
                <span class="bm-hp-lbl">HP</span>
                <div class="bm-hp-bar"><div class="bm-hp-fill ${hpColorClass(p2.hp, p2.hpMax)}" style="width:${(p2.hp/p2.hpMax)*100}%;"></div></div>
              </div>
              <div class="bm-hp-text">${p2.hp}/${p2.hpMax}</div>
              ${renderBenchDots(1)}
            </div>
            <img class="bm-arena-opp-img ba-outline" alt="${escapeHtml(p2.name)}" src="${spritePath(p2.id, spriteSlug(p2.slug))}" onerror="window._bmSpriteOnError(this,'${spriteSlug(p2.slug)}','${p2.emoji}','bm-arena-opp-sprite')">
          </div>

          <!-- Self quadrant (P1) — bottom-left, mirrors .g10-pspr-wrap -->
          <div class="bm-arena-self">
            <img class="bm-arena-self-img ba-outline" alt="${escapeHtml(p1.name)}" src="${spritePath(p1.id, spriteSlug(p1.slug))}" onerror="window._bmSpriteOnError(this,'${spriteSlug(p1.slug)}','${p1.emoji}','bm-arena-self-sprite')">
            <div class="bm-info-card ba-cardskin">
              <div class="bm-info-name">${escapeHtml(p1.name)}</div>
              <div class="bm-info-chips">
                <span class="bm-type-chip" style="background:${p1.color};">${TYPE_ICON[p1.type] || ''} ${p1.type}</span>
                ${weaknessChipHtml(p1.type)}
                <span class="bm-speed-pill">⚡ ${p1.speed ?? 70}</span>
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
          // v52 (concern 6): when qType is 'math', sample from QUESTION_BANK
          // (80% math / 20% non-math: fruits, animals, colors, opposites, body).
          root._questions[playerIdx] = state.qType === 'type'
            ? makeTypeQ()
            : pickQuestion(state.qLevel);
        }
        const q = root._questions[playerIdx];
        return `
          <div class="bm-q-row">
            <!-- A5: 10-second answer countdown — RAF-driven width update -->
            <div class="bm-timer-bar"><div class="bm-timer-fill" style="width:100%;"></div></div>
            <!-- v56.1 A-317 — ba-qskin/ba-glass = SHARED BattleArena skin (glow
                 question + glassy answer pills, concept video). Logic classes
                 (.bm-q-text/.bm-choice/data-c) untouched. -->
            <div class="bm-q-text ba-qskin">${escapeHtml(q.q)}</div>
            <div class="bm-choices" data-pidx="${playerIdx}">
              ${q.choices.map(c => `<button class="bm-choice ba-glass" data-c="${escapeHtml(String(c))}">${escapeHtml(String(c))}</button>`).join('')}
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
            <div class="bm-action-prompt ba-pillskin">Aksi giliranmu, <b>${escapeHtml(meName)}</b>?</div>
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
      // moves phase — show achieved time-mult badge so player sees the bonus.
      // No 🔄 Ganti button here — owner spec: switching happens via action menu
      // BEFORE the question, not as an alternative to a move.
      const lastElapsed = state.lastAnswerElapsed[playerIdx];
      const lastMult = timeMultFromElapsed(lastElapsed);
      const tMultBadge = (lastElapsed != null && lastMult > 1.0)
        ? `<div class="bm-tmult-badge">⚡ ${lastMult.toFixed(2)}× cepat!</div>` : '';
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
                  <img class="bm-switch-img" src="${spritePath(p.id, spriteSlug(p.slug))}" alt="${escapeHtml(p.name)}"
                       loading="lazy" decoding="async"
                       onerror="window._bmSpriteOnError(this,'${spriteSlug(p.slug)}','${p.emoji}','bm-switch-img-fallback')">
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
            // v53.4 anti-spam (concern 4): rapid taps on .bm-move used to
            // fire executeMove 2-3× back-to-back (kid spam-tap = curang).
            // state._moveLock is the truth-source the engine relies on;
            // disabling siblings is the visual cue. Lock resets at every
            // fresh action-phase transition (see executeMove + performSwitch).
            if (state._moveLock) return;
            state._moveLock = true;
            activeZone.querySelectorAll('.bm-move').forEach(x => x.setAttribute('disabled', ''));
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
          state._moveLock = false;  // v53.4: release move-spam guard for next turn
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
        // Forced (after faint) — switching player keeps the turn.
        // v54.18 HOUSE RULE (Switch-Fairness Rule, POKEMON_BALANCE_STANDARD.md):
        // The replacement ALWAYS gets the next attack. Owner: "ganti pokemon
        // karena kalah ya harusnya dapat giliran bukan malah skip giliran."
        // Previously decideTurnOrder ran here — a faster attacker's pokemon
        // could keep initiative against the slower fresh replacement, chain-
        // KO'ing it before it ever moved. Canon-Pokemon allows that; for a
        // 5-10yo PvP game it snowballs unfairly. The NEXT natural round (after
        // the replacement acts) still flows through decideTurnOrder normally;
        // only this single post-faint action is overridden.
        root._questions = null;
        state._moveLock = false;  // v53.4: forced switch → next turn re-enables moves
        state.phase = 'action';
        state.turn = playerIdx;
      } else {
        // Voluntary mid-turn switch — costs the turn, passes to opponent.
        // v53.0: opponent acts next, but Speed still has the final say on who
        // gets the FOLLOWING strike (handled by the standard 1-state.turn
        // flip + revealInitiative on the new active pair next round).
        root._questions = null;
        state._moveLock = false;  // v53.4: voluntary switch → opponent's moves re-enable
        state.phase = 'action';
        state.turn = 1 - playerIdx;
        // Re-evaluate Speed on the new pair so the next "round" flips correctly.
        // The opponent goes next this beat (turn = 1-playerIdx) but their reply
        // ordering hinges on Speed of the new swap-in.
      }
      renderRoot();
    }

    function executeMove (move) {
      const atk = activePoke(state.turn);
      const def = activePoke(1 - state.turn);
      // A5: time-mult derived from the answer elapsed captured in onAnswer.
      const timeMult = timeMultFromElapsed(state.lastAnswerElapsed[state.turn]);
      // v56.9 A-323 balance: COMEBACK ASSIST — if the DEFENDER's side is behind on
      // team HP, soften this hit (~0.90×). Combined with dynamic initiative this
      // keeps close games close without ever producing a one-shot (cap unchanged).
      const _defIdx = 1 - state.turn;
      const _mit = (teamHpFrac(_defIdx) < teamHpFrac(state.turn) - 0.001) ? 0.90 : 1.0;
      const dmg = calcDamage(atk, move, def, timeMult, _mit);
      const tm  = typeMult(move.type, def.type);
      // Attack animation FIRST, then apply damage at impact.
      runAttackAnimation(state.turn, move, dmg, tm, timeMult, () => {
        def.hp = Math.max(0, def.hp - dmg);
        sfxKO();
        // v53.0 polish #14: haptic on hit landed (mobile only; honours mute).
        bmHaptic(30);
        // v53.1: type-specific attack whoosh layered on top of the existing
        // sfxKO thud. Replaces the dead 404'd type-attack SFX paths.
        try { sfxAttackByType(move.type); } catch (e) {}
        // Update HP bars + texts in BOTH halves (both views show both HPs)
        updateHpDisplays();
        setTimeout(() => {
          if (def.hp <= 0) {
            const defIdx = 1 - state.turn;
            const aliveCount = state.teams[defIdx].filter(p => p.hp > 0).length;
            // v53.0 polish #14: deeper haptic when a Pokemon faints.
            bmHaptic(120);
            // v53.3 polish: KO bookkeeping for achievements + stats.
            if (!state.kosByPlayer) state.kosByPlayer = [0, 0];
            if (!state.lostByPlayer) state.lostByPlayer = [0, 0];
            if (!state.maxLostByPlayer) state.maxLostByPlayer = [0, 0];
            state.kosByPlayer[state.turn]++;
            state.lostByPlayer[defIdx]++;
            state.maxLostByPlayer[defIdx] = Math.max(state.maxLostByPlayer[defIdx], state.lostByPlayer[defIdx]);
            const totalKOs = state.kosByPlayer[0] + state.kosByPlayer[1];
            if (totalKOs === 1) spawnAchievement('firstBlood');
            playFaintAnimation(defIdx, () => {
              if (aliveCount === 0) {
                // All fainted — that player loses.
                // v53.1: winner-pose sprite bounce + sparkle burst before the
                // "Menang!" banner so the victory FEELS earned.
                try { playWinPose(state.turn); } catch (e) {}
                setTimeout(() => finishMatch(state.turn), 1400);
                return;
              }
              // A1: force defender to pick next Pokemon. After they pick, they
              // start their next turn at the action menu with the new Pokemon.
              state.switchForced = defIdx;
              state.turn = defIdx;
              state._moveLock = false;  // v53.4: defender's switch-then-attack moves re-enable
              state.phase = 'action';
              // v56.9 A-323: a faint restarts round tracking — the defender's
              // forced switch+turn begins a fresh initiative round.
              state.roundActed = [];
              state._lastLead = defIdx;
              renderRoot();
            });
            return;
          }
          // Turn passes — next player starts at action menu.
          root._questions = null;
          state._moveLock = false;  // v53.4: opponent's moves re-enable next turn
          // v56.9 A-323: DYNAMIC per-round initiative. Mark this attacker as having
          // acted; if the other player still owes an action this round, they go
          // now; once BOTH have acted the round closes and the next leader is
          // re-decided by active-Pokemon Speed (decideRoundLead) — no permanent
          // first-mover lock.
          if (!Array.isArray(state.roundActed)) state.roundActed = [];
          if (state.roundActed.indexOf(state.turn) < 0) state.roundActed.push(state.turn);
          const _other = 1 - state.turn;
          if (state.roundActed.indexOf(_other) < 0) {
            state.turn = _other;                 // finish this round with the other player
          } else {
            state.roundActed = [];               // round complete → new initiative
            state.turn = decideRoundLead();
            announceRoundLead(state.turn);
          }
          state.phase = 'action';
          // v53.3 polish: turn counter drives win-predictor visibility.
          state.turnsPlayed = (state.turnsPlayed | 0) + 1;
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
        // PvP/Tournament VFX parity with Adventure: swirling type-matched charge
        // aura on the attacking Pokémon (owner: "belum ada aura"). Guarded/additive.
        try { if (window.VFX && VFX.domAura) VFX.domAura(attackerSprite, { fx: VFX.typeFx(move.type).aura, duration: 420, scale: 1.3 }); } catch (e) {}
      }
      // Projectile flies attacker → defender (~320ms). Lands at the start of
      // the defender shake / damage frame. Per-move unique projectile via
      // MOVE_PROJECTILE map (Flamethrower differs from Fire Blast, etc.).
      setTimeout(() => {
        spawnProjectile(attackerSprite, defenderPanel, move);
        // …layered with the shared vfx-engine particle projectile (rich fire/
        // electric/leaf flung attacker→defender), matching Adventure mode.
        try {
          if (window.VFX && VFX.domProjectile && attackerSprite && defenderPanel) {
            const a = attackerSprite.getBoundingClientRect(), d = defenderPanel.getBoundingClientRect();
            VFX.domProjectile({ x: a.left + a.width * 0.5, y: a.top + a.height * 0.4 },
                              { x: d.left + d.width * 0.5, y: d.top + d.height * 0.45 },
                              { fx: VFX.typeFx(move.type).proj, size: 78, duration: 300 });
          }
        } catch (e) {}
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
          // v56.1 A-317 — damage numbers routed through the SHARED BattleArena
          // pop (scale-in + rise + fade, staggered echoes); legacy fallback kept.
          if (window.BattleArena && window.BattleArena.damagePopAt) {
            window.BattleArena.damagePopAt(cx, cy, dmg, { mult: tm, sub: effLabel(tm), timeMult: timeMult });
          } else {
            spawnDamageNumber(cx, cy, dmg, tm, timeMult);
          }
          // Type-emoji particles burst at defender (8 particles, type-specific keyframe)
          spawnTypeParticles(cx, cy, move.type);
          // shared vfx-engine glowing impact burst ON the defender (bigger on
          // super-effective) — Adventure-parity "boom" landing the hit.
          try { if (window.VFX && VFX.dom) VFX.dom(cx, cy, { fx: 'boom', size: (tm >= 1.15 ? 150 : 118), blend: 'screen' }); } catch (e) {}
          // Effectiveness rise-text (Super Efektif / Tidak Efektif / Seimbang)
          spawnEffectivenessText(cx, cy - 30, tm);
          // v53.0 polish #2: BIG type-effectiveness splash banner in the arena
          // — complements the small rise-text above. Fires only on ≠1× hits so
          // a routine neutral hit doesn't get drowned out by overlay text.
          spawnEffSplash(tm, arena);
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
          // v53.0 polish #14: 2-burst haptic for super-effective.
          bmHaptic([40, 30, 40]);
          // v53.1: type-tinted screen wash (fire=red, water=blue, …) +
          // pink-noise crowd cheer so a big hit FEELS like a stadium moment.
          try { spawnTypeTint(move.type); } catch (e) {}
          try { sfxCrowdCheer(); } catch (e) {}
        }
        // CRITICAL! pop on super+STAB combo (super-effective AND same-type attack)
        const isStab = move.type === activePoke(attackerIdx).type;
        if (tm >= 1.15 && isStab) {
          spawnCriticalBadge(defenderPanel);
          // v53.0 polish #14: 3-burst haptic for a crit (super+STAB).
          bmHaptic([60, 40, 60]);
        }
        // Combo counter — track super-effective streak per attacker
        if (tm >= 1.15) {
          state.comboCount[attackerIdx]++;
          if (state.comboCount[attackerIdx] >= 2) {
            spawnComboBadge(defenderPanel, state.comboCount[attackerIdx]);
          }
          // v53.3 polish: 3-in-a-row super-effective → achievement (once per match).
          if (state.comboCount[attackerIdx] >= 3) {
            try { spawnAchievement('critStreak'); } catch (e) {}
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
    // Per-move projectile config (overrides the type default).
    // Each entry: emoji core(s) + trail color + size + arc style ('straight'/'arc'/'spiral'/'zigzag').
    const MOVE_PROJECTILE = {
      // Fire variants
      'Ember':           { emoji:'🔥',   trail:'#F97316', size:32 },
      'Flamethrower':    { emoji:'🔥',   trail:'#F97316', size:38, arc:'wave' },
      'Fire Blast':      { emoji:'💥',   trail:'#DC2626', size:44 },
      'Heat Wave':       { emoji:'🌋',   trail:'#DC2626', size:40 },
      'Blaze Kick':      { emoji:'🦵',   trail:'#F97316', size:38 },
      'Flame Charge':    { emoji:'🔥',   trail:'#F59E0B', size:36 },
      'Sacred Fire':     { emoji:'🔥',   trail:'#FCD34D', size:44 },
      'Blast Burn':      { emoji:'💥',   trail:'#DC2626', size:46 },
      'Flame Wheel':     { emoji:'🛞',   trail:'#F97316', size:36 },
      'Flare Blitz':     { emoji:'💥',   trail:'#F97316', size:42 },
      // Water variants
      'Water Gun':       { emoji:'💧',   trail:'#06B6D4', size:32 },
      'Hydro Pump':      { emoji:'🌊',   trail:'#0EA5E9', size:42, arc:'wave' },
      'Hydro Cannon':    { emoji:'🌊',   trail:'#0284C7', size:46 },
      'Bubble':          { emoji:'🫧',   trail:'#06B6D4', size:34 },
      'Bubble Beam':     { emoji:'🫧',   trail:'#06B6D4', size:36 },
      'Surf':            { emoji:'🌊',   trail:'#0EA5E9', size:42 },
      'Aqua Jet':        { emoji:'💧',   trail:'#06B6D4', size:34 },
      'Water Pulse':     { emoji:'💧',   trail:'#06B6D4', size:36, arc:'spiral' },
      'Water Shuriken':  { emoji:'🪐',   trail:'#06B6D4', size:32 },
      'Crabhammer':      { emoji:'🦀',   trail:'#06B6D4', size:38 },
      // Electric variants
      'Thunder Shock':   { emoji:'⚡',   trail:'#FCD34D', size:34 },
      'Thunderbolt':     { emoji:'⚡',   trail:'#FCD34D', size:40, arc:'zigzag' },
      'Thunder':         { emoji:'🌩️',  trail:'#FBBF24', size:44 },
      'Volt Tackle':     { emoji:'⚡',   trail:'#FBBF24', size:38 },
      'Zap Cannon':      { emoji:'⚡',   trail:'#FCD34D', size:42 },
      'Spark':           { emoji:'✨',   trail:'#FCD34D', size:32 },
      'Electro Ball':    { emoji:'⚡',   trail:'#FCD34D', size:36 },
      // Grass variants
      'Vine Whip':       { emoji:'🌿',   trail:'#10B981', size:34 },
      'Razor Leaf':      { emoji:'🍃',   trail:'#10B981', size:34 },
      'Leaf Blade':      { emoji:'🍃',   trail:'#10B981', size:38 },
      'Solar Beam':      { emoji:'🌞',   trail:'#FCD34D', size:44, arc:'beam' },
      'Frenzy Plant':    { emoji:'🌳',   trail:'#10B981', size:46 },
      'Leaf Storm':      { emoji:'🌿',   trail:'#10B981', size:42 },
      'Petal Dance':     { emoji:'🌸',   trail:'#F472B6', size:38 },
      'Absorb':          { emoji:'🍃',   trail:'#10B981', size:30 },
      'Bug Bite':        { emoji:'🪲',   trail:'#A8B820', size:32 },
      'Bullet Seed':     { emoji:'🌱',   trail:'#10B981', size:32 },
      'Leech Seed':      { emoji:'🌱',   trail:'#10B981', size:30 },
      // Ice variants
      'Ice Beam':        { emoji:'❄️',  trail:'#98D8D8', size:38, arc:'beam' },
      'Blizzard':        { emoji:'🥶',   trail:'#98D8D8', size:44 },
      'Ice Shard':       { emoji:'🧊',   trail:'#98D8D8', size:32 },
      'Aurora Beam':     { emoji:'🌈',   trail:'#98D8D8', size:38 },
      'Powder Snow':     { emoji:'❄️',  trail:'#E0F2FE', size:30 },
      // Dragon
      'Dragon Pulse':    { emoji:'🐉',   trail:'#7038F8', size:42, arc:'spiral' },
      'Dragon Claw':     { emoji:'🐾',   trail:'#7038F8', size:38 },
      'Dragon Breath':   { emoji:'🐉',   trail:'#7038F8', size:36 },
      'Dragon Ascent':   { emoji:'🐲',   trail:'#7038F8', size:46 },
      'Outrage':         { emoji:'🐲',   trail:'#7038F8', size:42 },
      'Twister':         { emoji:'🌀',   trail:'#7038F8', size:38 },
      // Ghost / Dark
      'Shadow Ball':     { emoji:'👻',   trail:'#705898', size:40, arc:'spiral' },
      'Dark Pulse':      { emoji:'🌑',   trail:'#705848', size:38, arc:'spiral' },
      'Crunch':          { emoji:'🦷',   trail:'#705848', size:36 },
      'Bite':            { emoji:'🦷',   trail:'#705848', size:32 },
      'Dream Eater':     { emoji:'💤',   trail:'#705898', size:36 },
      // Psychic
      'Psychic':         { emoji:'🔮',   trail:'#F85888', size:40 },
      'Confusion':       { emoji:'😵‍💫', trail:'#F85888', size:34 },
      'Psycho Boost':    { emoji:'🌀',   trail:'#F85888', size:44 },
      'Mist Ball':       { emoji:'🌫️',  trail:'#F85888', size:38 },
      'Luster Purge':    { emoji:'✨',   trail:'#F85888', size:38 },
      // Fighting
      'Karate Chop':     { emoji:'🤚',   trail:'#C03028', size:34 },
      'Brick Break':     { emoji:'👊',   trail:'#C03028', size:36 },
      'Close Combat':    { emoji:'💢',   trail:'#C03028', size:40 },
      'High Jump Kick':  { emoji:'🦵',   trail:'#C03028', size:40 },
      'Mach Punch':      { emoji:'👊',   trail:'#C03028', size:34 },
      'Sky Uppercut':    { emoji:'🥊',   trail:'#C03028', size:38 },
      'Flying Press':    { emoji:'🦅',   trail:'#A890F0', size:38 },
      'Aura Sphere':     { emoji:'💠',   trail:'#C03028', size:40, arc:'spiral' },
      // Flying
      'Gust':            { emoji:'🌪️',  trail:'#A890F0', size:36 },
      'Aerial Ace':      { emoji:'💨',   trail:'#A890F0', size:34 },
      'Wing Attack':     { emoji:'🪽',   trail:'#A890F0', size:34 },
      'Peck':            { emoji:'🐦',   trail:'#A890F0', size:30 },
      'Drill Peck':      { emoji:'🪶',   trail:'#A890F0', size:38 },
      'Air Slash':       { emoji:'💨',   trail:'#A890F0', size:36 },
      'Brave Bird':      { emoji:'🕊️',  trail:'#A890F0', size:40 },
      'Sky Attack':      { emoji:'🦅',   trail:'#FCD34D', size:42 },
      'Fly':             { emoji:'🪽',   trail:'#A890F0', size:36 },
      'Boomburst':       { emoji:'💥',   trail:'#A890F0', size:44 },
      'Hurricane':       { emoji:'🌀',   trail:'#A890F0', size:42 },
      // Rock / Ground
      'Rock Throw':      { emoji:'🪨',   trail:'#B8A038', size:36 },
      'Rock Slide':      { emoji:'⛰️',  trail:'#B8A038', size:40 },
      'Stone Edge':      { emoji:'🪨',   trail:'#B8A038', size:42 },
      'Earthquake':      { emoji:'🌋',   trail:'#E0C068', size:46 },
      'Mud Slap':        { emoji:'🟫',   trail:'#E0C068', size:32 },
      'Mud Shot':        { emoji:'🟫',   trail:'#E0C068', size:32 },
      'Dig':             { emoji:'⛏️',  trail:'#E0C068', size:36 },
      'Magnitude':       { emoji:'📊',   trail:'#E0C068', size:38 },
      // Steel
      'Iron Tail':       { emoji:'⚙️',  trail:'#B8B8D0', size:36 },
      'Iron Head':       { emoji:'⚙️',  trail:'#B8B8D0', size:38 },
      'Steel Wing':      { emoji:'🪽',   trail:'#B8B8D0', size:34 },
      'Flash Cannon':    { emoji:'💿',   trail:'#B8B8D0', size:40 },
      'Meteor Mash':     { emoji:'☄️',  trail:'#B8B8D0', size:42 },
      'Bullet Punch':    { emoji:'👊',   trail:'#B8B8D0', size:32 },
      'Metal Claw':      { emoji:'⚙️',  trail:'#B8B8D0', size:32 },
      // Poison
      'Sludge Bomb':     { emoji:'☠️',  trail:'#A040A0', size:38 },
      'Poison Sting':    { emoji:'☠️',  trail:'#A040A0', size:30 },
      'Poison Jab':      { emoji:'💉',   trail:'#A040A0', size:36 },
      'Cross Poison':    { emoji:'☠️',  trail:'#A040A0', size:36 },
      'Toxic':           { emoji:'☠️',  trail:'#A040A0', size:34 },
      // Fairy
      'Moonblast':       { emoji:'🌙',   trail:'#F472B6', size:42 },
      'Disarming Voice': { emoji:'🎶',   trail:'#F472B6', size:34 },
      'Hyper Voice':     { emoji:'📢',   trail:'#F472B6', size:40 },
      'Dazzling Gleam':  { emoji:'✨',   trail:'#F472B6', size:40 },
      'Play Nice':       { emoji:'💕',   trail:'#F472B6', size:30 },
      'Charm':           { emoji:'💕',   trail:'#F472B6', size:30 },
      // Normal (physical) — usually low-pwr quick hits
      'Tackle':          { emoji:'💢',   trail:'#A8A878', size:32 },
      'Quick Attack':    { emoji:'💨',   trail:'#FFFFFF', size:32 },
      'Slash':           { emoji:'⚔️',  trail:'#A8A878', size:34 },
      'Hyper Beam':      { emoji:'🌟',   trail:'#FCD34D', size:44, arc:'beam' },
      'Body Slam':       { emoji:'💥',   trail:'#A8A878', size:38 },
      'Headbutt':        { emoji:'💢',   trail:'#A8A878', size:34 },
      'Extreme Speed':   { emoji:'💨',   trail:'#FFFFFF', size:36 },
      'Swift':           { emoji:'⭐',   trail:'#FCD34D', size:32 },
      'Take Down':       { emoji:'💢',   trail:'#A8A878', size:36 },
      'Last Resort':     { emoji:'💥',   trail:'#A8A878', size:38 },
      'Scratch':         { emoji:'🐾',   trail:'#A8A878', size:30 },
      'Pound':           { emoji:'💢',   trail:'#A8A878', size:30 }
    };

    function resolveProjectile (move) {
      if (move && MOVE_PROJECTILE[move.name]) return MOVE_PROJECTILE[move.name];
      const typeDefaults = {
        fire:     { emoji:'🔥', trail:'#F97316', size:38 },
        water:    { emoji:'💧', trail:'#06B6D4', size:36 },
        grass:    { emoji:'🌿', trail:'#10B981', size:34 },
        electric: { emoji:'⚡', trail:'#FCD34D', size:36 },
        normal:   { emoji:'⭐', trail:'#FFFFFF', size:34 },
        fairy:    { emoji:'💖', trail:'#F472B6', size:34 },
        poison:   { emoji:'☠️', trail:'#A040A0', size:34 },
        ground:   { emoji:'🪨', trail:'#E0C068', size:36 },
        flying:   { emoji:'💨', trail:'#A890F0', size:34 },
        bug:      { emoji:'🪲', trail:'#A8B820', size:32 },
        psychic:  { emoji:'🔮', trail:'#F85888', size:38 },
        rock:     { emoji:'🪨', trail:'#B8A038', size:36 },
        ghost:    { emoji:'👻', trail:'#705898', size:36 },
        ice:      { emoji:'❄️', trail:'#98D8D8', size:34 },
        dragon:   { emoji:'🐉', trail:'#7038F8', size:40 },
        dark:     { emoji:'🌑', trail:'#705848', size:36 },
        fighting: { emoji:'👊', trail:'#C03028', size:34 },
        steel:    { emoji:'⚙️', trail:'#B8B8D0', size:34 }
      };
      return typeDefaults[move && move.type] || typeDefaults.normal;
    }

    // Projectile flying attacker → defender, per-move emoji + glow.
    // Lands in ~340ms (synced with the lunge-to-impact window) and triggers
    // the impact particle burst on landing. Now per-MOVE unique (Flamethrower
    // differs from Fire Blast, Hydro Pump differs from Bubble, etc.).
    function spawnProjectile (attackerSprite, defenderPanel, move, onLand) {
      if (!attackerSprite || !defenderPanel) { setTimeout(onLand || (()=>{}), 340); return; }
      const a = attackerSprite.getBoundingClientRect();
      const d = defenderPanel.getBoundingClientRect();
      const startX = a.left + a.width * 0.5;
      const startY = a.top + a.height * 0.35;
      const endX   = d.left + d.width * 0.5;
      const endY   = d.top + d.height * 0.45;
      const cfg = resolveProjectile(move);
      const el = document.createElement('div');
      el.textContent = cfg.emoji;
      // Arc style modulates rotation + scale terminal — different feel per move kind.
      const arc = cfg.arc || 'straight';
      const endRotate = arc === 'spiral' ? 900 : arc === 'zigzag' ? 360 : arc === 'beam' ? 0 : arc === 'wave' ? 180 : 540;
      const endScale  = arc === 'beam' ? 1.0 : 1.4;
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
      requestAnimationFrame(() => {
        el.style.left = endX + 'px';
        el.style.top  = endY + 'px';
        el.style.transform = `translate(-50%, -50%) scale(${endScale}) rotate(${endRotate}deg)`;
      });
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

    // v53.1: type-tinted full-screen wash on super-effective hits.
    // 200ms opacity pulse — fire = red flash, water = blue, electric = yellow.
    function spawnTypeTint (type) {
      const TINT = {
        fire:'#ff4500', water:'#1e90ff', electric:'#ffd700',
        ice:'#aeeeff', grass:'#22c55e', psychic:'#d946ef',
        ghost:'#7c3aed', dark:'#475569', dragon:'#9333ea',
        fairy:'#ec4899', poison:'#a21caf', flying:'#7dd3fc',
        rock:'#a16207', ground:'#a16207', bug:'#84cc16',
        steel:'#94a3b8', fighting:'#dc2626', normal:'#ffffff'
      };
      const color = TINT[type] || '#ffffff';
      const el = document.createElement('div');
      el.className = 'bm-type-tint';
      el.style.background = color;
      document.body.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch (e) {} }, 280);
    }

    // v53.0 polish #2: BIG type-effectiveness splash banner — center arena,
    // large readable text. Fires only on ≠1× multipliers (skips neutral hits
    // to avoid overlay-fatigue). Complements the small rise-text above.
    function spawnEffSplash (mult, arenaEl) {
      let label = '', color = '#fff', glow = 'rgba(0,0,0,0.7)';
      if (mult >= 2)        { label = 'AMAT MEMATIKAN!'; color = '#FCD34D'; glow = '#DC2626'; }
      else if (mult >= 1.15){ label = 'SUPER EFEKTIF!';  color = '#FCD34D'; glow = '#EA580C'; }
      else if (mult === 0)  { label = 'TIDAK MEMPAN!';   color = '#E5E7EB'; glow = '#475569'; }
      else if (mult <= 0.75){ label = 'TIDAK EFEKTIF…';  color = '#93C5FD'; glow = '#1E40AF'; }
      else return; // ~1× — skip
      const host = arenaEl || document.querySelector('.bm-arena') || document.body;
      const el = document.createElement('div');
      el.className = 'bm-eff-splash';
      el.textContent = label;
      el.style.color = color;
      el.style.setProperty('--bm-eff-glow', glow);
      host.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch (e) {} }, 1400);
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
      // Single shared arena — surgically update HP bars + texts + sprite danger glow.
      const arena = root.querySelector('.bm-arena');
      if (!arena) return;
      const p1 = activePoke(0);
      const p2 = activePoke(1);
      const p1Fill = arena.querySelector('.bm-arena-self .bm-hp-fill');
      const p1Txt  = arena.querySelector('.bm-arena-self .bm-hp-text');
      const p2Fill = arena.querySelector('.bm-arena-opp .bm-hp-fill');
      const p2Txt  = arena.querySelector('.bm-arena-opp .bm-hp-text');
      const p1Sprite = arena.querySelector('.bm-arena-self-img, .bm-arena-self-sprite');
      const p2Sprite = arena.querySelector('.bm-arena-opp-img, .bm-arena-opp-sprite');
      if (p1Fill) { p1Fill.style.width = (p1.hp / p1.hpMax * 100) + '%'; p1Fill.className = 'bm-hp-fill ' + hpColorClass(p1.hp, p1.hpMax); }
      if (p1Txt)  { p1Txt.textContent = p1.hp + '/' + p1.hpMax; }
      if (p2Fill) { p2Fill.style.width = (p2.hp / p2.hpMax * 100) + '%'; p2Fill.className = 'bm-hp-fill ' + hpColorClass(p2.hp, p2.hpMax); }
      if (p2Txt)  { p2Txt.textContent = p2.hp + '/' + p2.hpMax; }
      // Sprite-level low-HP pulse — kid sees the danger immediately
      const p1Low = p1.hp / p1.hpMax < 0.25 && p1.hp > 0;
      const p2Low = p2.hp / p2.hpMax < 0.25 && p2.hp > 0;
      if (p1Sprite) p1Sprite.classList.toggle('bm-sprite-danger', p1Low);
      if (p2Sprite) p2Sprite.classList.toggle('bm-sprite-danger', p2Low);
      // v53.1: heartbeat audio loop kicks in for the tense low-HP state.
      if (p1Low || p2Low) sfxLowHPStart();
      else                sfxLowHPStop();
      // v53.3 polish: refresh the mid-match win-predictor pill.
      try { refreshPredictor(); } catch (e) {}
    }

    // v53.3 polish: achievements toast queue. Triggers fire from inside the
    // executeMove/finishMatch flow; queue avoids overlapping toasts when
    // multiple achievements land on the same beat (e.g. Sweep + Perfect).
    function spawnAchievement (kind) {
      if (!state.achievements) state.achievements = {};
      if (state.achievements[kind]) return; // dedup per match
      state.achievements[kind] = true;
      const META = {
        firstBlood: { emoji:'🩸', title:'Pukulan Pertama!', sub:'KO pertama di pertandingan' },
        sweep:      { emoji:'🌪️', title:'Sweep!',           sub:'Menang tanpa Pokemon yang faint' },
        comeback:   { emoji:'🔥', title:'Comeback!',        sub:'Balik dari ketinggalan 3+ Pokemon' },
        perfect:    { emoji:'💎', title:'Sempurna!',        sub:'Pokemon terakhir full HP' },
        critStreak: { emoji:'⚡', title:'Combo Listrik!',   sub:'3 super-effective beruntun' }
      };
      const m = META[kind]; if (!m) return;
      const host = document.body;
      const el = document.createElement('div');
      el.className = 'bm-achievement';
      el.innerHTML = `
        <div class="bm-achievement-emoji">${m.emoji}</div>
        <div class="bm-achievement-text">
          <div class="bm-achievement-title">${escapeHtml(m.title)}</div>
          <div class="bm-achievement-sub">${escapeHtml(m.sub)}</div>
        </div>
      `;
      // Stack newer toasts ABOVE existing ones (offset by index).
      const existing = host.querySelectorAll('.bm-achievement').length;
      el.style.bottom = (24 + existing * 78) + 'px';
      host.appendChild(el);
      setTimeout(() => { try { el.classList.add('out'); } catch (e) {} }, 2200);
      setTimeout(() => { try { el.remove(); } catch (e) {} }, 2700);
    }

    // v53.3 polish: mid-match win predictor — Score = total HP ratio +
    // bench-alive bonus. Shown after 3 turns so the prediction isn't
    // 50/50 noise at match start.
    function predictWin () {
      const ratio = (idx) => {
        const team = state.teams[idx];
        const totHp  = team.reduce((s, p) => s + Math.max(0, p.hp), 0);
        const totMax = team.reduce((s, p) => s + Math.max(1, p.hpMax || 1), 0);
        return totHp / totMax;
      };
      const benchAlive = (idx) => state.teams[idx].filter(p => p.hp > 0).length;
      const s1 = ratio(0) + benchAlive(0) * 0.04;
      const s2 = ratio(1) + benchAlive(1) * 0.04;
      const tot = s1 + s2;
      if (tot === 0) return { p1: 50, p2: 50 };
      const p1 = Math.max(5, Math.min(95, Math.round(s1 / tot * 100)));
      return { p1, p2: 100 - p1 };
    }
    function refreshPredictor () {
      if (!state.turnsPlayed || state.turnsPlayed < 3) return;
      const arena = root.querySelector('.bm-arena');
      if (!arena) return;
      const old = arena.querySelector('.bm-predictor');
      if (old) old.remove();
      const pred = predictWin();
      const p1Name = (opts.players && opts.players[0] && opts.players[0].name) || 'P1';
      const p2Name = (opts.players && opts.players[1] && opts.players[1].name) || 'P2';
      const pill = document.createElement('div');
      pill.className = 'bm-predictor';
      pill.innerHTML = `
        <span class="bm-predictor-side bm-predictor-p1" style="flex: ${pred.p1};">
          <span class="bm-predictor-name">${escapeHtml(p1Name)}</span>
          <span class="bm-predictor-pct">${pred.p1}%</span>
        </span>
        <span class="bm-predictor-side bm-predictor-p2" style="flex: ${pred.p2};">
          <span class="bm-predictor-pct">${pred.p2}%</span>
          <span class="bm-predictor-name">${escapeHtml(p2Name)}</span>
        </span>
      `;
      arena.appendChild(pill);
    }

    // v53.1: winner pose — triumphant bounce + sparkle burst on the winning
    // Pokemon's sprite when the LAST opponent Pokemon faints. Fires before
    // finishMatch's banner so the visual reward is anchored to the sprite.
    function playWinPose (winnerIdx) {
      const arena = root.querySelector('.bm-arena');
      if (!arena) return;
      const sel = winnerIdx === 0
        ? '.bm-arena-self-img, .bm-arena-self-sprite'
        : '.bm-arena-opp-img, .bm-arena-opp-sprite';
      const sprite = arena.querySelector(sel);
      if (!sprite) return;
      sprite.classList.add('bm-win-pose');
      // 12 sparkle particles bursting from sprite center.
      const r = sprite.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      for (let i = 0; i < 12; i++) {
        const p = document.createElement('span');
        p.className = 'bm-win-sparkle';
        p.textContent = (i % 2 === 0) ? '✨' : '⭐';
        const angle = (i / 12) * Math.PI * 2;
        const dist = 70 + Math.random() * 40;
        p.style.left = cx + 'px';
        p.style.top  = cy + 'px';
        p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        p.style.animationDelay = (i * 30) + 'ms';
        document.body.appendChild(p);
        setTimeout(() => { try { p.remove(); } catch (e) {} }, 1300 + i * 30);
      }
      // Clean up the class after the keyframe finishes so subsequent matches
      // don't compound the transform.
      setTimeout(() => { try { sprite.classList.remove('bm-win-pose'); } catch (e) {} }, 1500);
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
      // v56.9 review #23/#24: stop the question-timer RAF + low-HP heartbeat the
      // moment the match ends, so neither bleeds into the champion screen / next match.
      try { stopQuestionTimer(); } catch (e) {}
      try { sfxLowHPStop(); } catch (e) {}
      sfxKO();
      // v53.0 polish #14: 5-burst fanfare haptic for match-win.
      bmHaptic([80, 40, 80, 40, 120]);
      // v53.3 polish: end-of-match achievements (deferred so toasts surface
      // alongside the "Menang!" banner). Sweep, comeback, perfect-win.
      try {
        const lostByWinner = (state.lostByPlayer && state.lostByPlayer[winnerIdx]) || 0;
        const maxLost = (state.maxLostByPlayer && state.maxLostByPlayer[winnerIdx]) || 0;
        const winnerActive = activePoke(winnerIdx);
        if (lostByWinner === 0)                                 spawnAchievement('sweep');
        if (maxLost >= 3)                                       spawnAchievement('comeback');
        if (winnerActive && winnerActive.hp >= winnerActive.hpMax) spawnAchievement('perfect');
      } catch (e) {}
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
      // v53.3 polish: confetti palette keyed to winner Pokemon's type color.
      const _winType = activePoke(winnerIdx) && activePoke(winnerIdx).type;
      const _winColor = (_winType && TYPE_COLOR[_winType]) || '#FCD34D';
      spawnConfetti(36, null, _winColor);
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
      /* v52 polish #6 — persistent mute toggle (concerns 5+7) */
      .bm-mute-btn {
        position: fixed; top: 8px; right: 8px; z-index: 9105;
        background: rgba(0,0,0,0.70); color: #fff;
        width: 44px; height: 44px;
        border: none; border-radius: 10px;
        font-size: 20px; line-height: 1; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 150ms ease, transform 120ms ease;
      }
      .bm-mute-btn:hover { background: rgba(0,0,0,0.88); }
      .bm-mute-btn:active { transform: scale(0.92); }

      /* ── v53.0 (concern 4): Speed pill on HP card ──
         Tiny cyan chip showing each Pokemon's canonical base Speed. Sits next
         to the existing type + weakness chips. Owner: "balance" gameplay. */
      .bm-speed-pill {
        display: inline-flex; align-items: center; gap: 2px;
        padding: 1px 7px; border-radius: 100px;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 9px; font-weight: 900;
        color: #0E7490; background: #CFFAFE; border: 1px solid #67E8F9;
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }

      /* ── v53.0 polish: match-start initiative banner ──
         Briefly reveals which Pokemon strikes first (Speed-decided). */
      .bm-init-banner {
        position: fixed; left: 50%; top: 22%;
        transform: translate(-50%, -10px) scale(0.92);
        z-index: 9150;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(15px, 3.6vw, 22px);
        color: #fff;
        background: linear-gradient(135deg, rgba(2,132,199,0.95), rgba(245,158,11,0.95));
        padding: 10px 18px; border-radius: 14px;
        box-shadow: 0 8px 28px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.35);
        opacity: 0;
        animation: bmInitBanner 1500ms cubic-bezier(0.22,1,0.36,1) forwards;
        white-space: nowrap; pointer-events: none;
      }
      .bm-init-banner.out { animation: bmInitBannerOut 400ms ease forwards; }
      .bm-init-banner .bm-init-spd {
        display: inline-block; margin-left: 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78em; opacity: 0.85;
      }
      @keyframes bmInitBanner {
        0%   { transform: translate(-50%, -16px) scale(0.6);  opacity: 0; }
        25%  { transform: translate(-50%, 0) scale(1.06);     opacity: 1; }
        60%  { transform: translate(-50%, 0) scale(1.0);      opacity: 1; }
        100% { transform: translate(-50%, 0) scale(1.0);      opacity: 1; }
      }
      @keyframes bmInitBannerOut {
        0%   { opacity: 1; transform: translate(-50%, 0) scale(1.0); }
        100% { opacity: 0; transform: translate(-50%, -8px) scale(0.92); }
      }

      /* ── v53.0 polish #2: BIG type-effectiveness splash banner ──
         Owner: "kasih 10-20 ide super menarik" — big readable overlay text
         on 2×/0.5×/0× hits, complementing the existing small particle FX. */
      .bm-eff-splash {
        position: absolute; left: 50%; top: 38%;
        transform: translate(-50%, 0) scale(0.4);
        z-index: 9180; pointer-events: none;
        font-family: 'Fredoka One', cursive;
        font-size: clamp(28px, 7vw, 52px);
        font-weight: 900;
        letter-spacing: 1px;
        text-shadow:
          -2px -2px 0 var(--bm-eff-glow, #000),
           2px -2px 0 var(--bm-eff-glow, #000),
          -2px  2px 0 var(--bm-eff-glow, #000),
           2px  2px 0 var(--bm-eff-glow, #000),
           0 6px 18px rgba(0,0,0,0.55),
           0 0 24px var(--bm-eff-glow, rgba(0,0,0,0.5));
        white-space: nowrap;
        opacity: 0;
        animation: bmEffSplash 1300ms cubic-bezier(0.22,1.4,0.36,1) forwards;
      }
      @keyframes bmEffSplash {
        0%   { transform: translate(-50%, 0) scale(0.4) rotate(-3deg); opacity: 0; }
        18%  { transform: translate(-50%, -4px) scale(1.18) rotate(2deg); opacity: 1; }
        35%  { transform: translate(-50%, 0) scale(1.0) rotate(0deg);   opacity: 1; }
        80%  { transform: translate(-50%, 0) scale(1.0) rotate(0deg);   opacity: 1; }
        100% { transform: translate(-50%, -10px) scale(0.92) rotate(0deg); opacity: 0; }
      }

      /* ── v53.1 polish: type-tint full-screen wash on super-effective ── */
      .bm-type-tint {
        position: fixed; inset: 0; z-index: 9180;
        pointer-events: none; opacity: 0;
        mix-blend-mode: screen;
        animation: bmTypeTint 280ms ease-out forwards;
      }
      @keyframes bmTypeTint {
        0%   { opacity: 0; }
        30%  { opacity: 0.45; }
        100% { opacity: 0; }
      }

      /* v54.35: idle bob — sprite breathes up/down ~5px so an in-battle
         arena does not read as static. Animates the CSS individual
         translate property so it composes with .bm-arena-opp-img's
         transform: scaleX(-1) mirror (transform property would otherwise
         overwrite the mirror). Pre-v54.35 the CSS referenced bmSpriteBob
         but no @keyframes existed, so sprites were silently frozen. */
      @keyframes bmSpriteBob {
        0%   { translate: 0 0; }
        50%  { translate: 0 -5px; }
        100% { translate: 0 0; }
      }

      /* ── v53.1 polish: winner pose + sparkle burst on final KO ── */
      .bm-arena-self-img.bm-win-pose,
      .bm-arena-opp-img.bm-win-pose,
      .bm-arena-self-sprite.bm-win-pose,
      .bm-arena-opp-sprite.bm-win-pose {
        animation: bmWinPose 1300ms cubic-bezier(0.22,1.6,0.36,1) forwards !important;
        filter: drop-shadow(0 0 18px rgba(255,210,80,0.9)) drop-shadow(0 6px 18px rgba(0,0,0,0.45));
      }
      @keyframes bmWinPose {
        0%   { transform: translateY(0)     scale(1);    }
        18%  { transform: translateY(-22px) scale(1.10); }
        32%  { transform: translateY(0)     scale(1.02); }
        46%  { transform: translateY(-14px) scale(1.06); }
        60%  { transform: translateY(0)     scale(1.02); }
        74%  { transform: translateY(-8px)  scale(1.04); }
        100% { transform: translateY(0)     scale(1);    }
      }
      .bm-win-sparkle {
        position: fixed; z-index: 9360; pointer-events: none;
        font-size: clamp(18px, 3vw, 26px);
        line-height: 1; transform: translate(-50%, -50%);
        animation: bmWinSparkle 1100ms cubic-bezier(0.22,1.4,0.36,1) forwards;
        filter: drop-shadow(0 0 10px rgba(255,235,140,0.9));
      }
      @keyframes bmWinSparkle {
        0%   { transform: translate(-50%, -50%) scale(0.4);                                            opacity: 0; }
        25%  { transform: translate(calc(-50% + var(--dx) * 0.5), calc(-50% + var(--dy) * 0.5)) scale(1.2); opacity: 1; }
        100% { transform: translate(calc(-50% + var(--dx)),       calc(-50% + var(--dy)))       scale(0.6); opacity: 0; }
      }

      /* ── v53.1 polish: per-region weather (couples with v52 BG swap) ──
         Particles ride a CSS animation; spawnWeather() inserts 14 .bm-weather-particle
         spans into a single .bm-weather-layer DIV nested in .bm-arena. */
      .bm-weather-layer {
        position: absolute; inset: 0;
        pointer-events: none; z-index: 1;
        overflow: hidden;
      }
      .bm-weather-particle {
        position: absolute; top: -20px;
        font-size: clamp(14px, 2.4vw, 20px);
        line-height: 1;
        opacity: 0.78;
        will-change: transform;
        animation: bmWeatherFall 4s linear infinite;
      }
      .bm-weather-leaf .bm-weather-particle    { animation-name: bmWeatherLeaf; }
      .bm-weather-rain .bm-weather-particle    { animation-name: bmWeatherRain; opacity: 0; }
      .bm-weather-rain .bm-weather-particle::before {
        content: ''; display: block;
        width: 2px; height: 16px;
        background: linear-gradient(180deg, rgba(140,200,255,0) 0%, rgba(140,200,255,0.85) 100%);
        border-radius: 1px;
      }
      .bm-weather-rain .bm-weather-particle { opacity: 0.85; }
      .bm-weather-ember .bm-weather-particle   { animation-name: bmWeatherEmber; opacity: 0.85; }
      .bm-weather-sparkle .bm-weather-particle { animation-name: bmWeatherSparkle; opacity: 0.9; }
      @keyframes bmWeatherFall {
        0%   { transform: translateY(-20px); }
        100% { transform: translateY(90vh); }
      }
      @keyframes bmWeatherLeaf {
        0%   { transform: translate(0, -20px)    rotate(0deg); }
        50%  { transform: translate(20px, 30vh)  rotate(180deg); }
        100% { transform: translate(-10px, 90vh) rotate(360deg); }
      }
      @keyframes bmWeatherRain {
        0%   { transform: translate(0, -20px) skewX(-8deg); }
        100% { transform: translate(-20px, 90vh) skewX(-8deg); }
      }
      @keyframes bmWeatherEmber {
        0%   { transform: translate(0, 100vh) scale(0.7); opacity: 0; }
        20%  { opacity: 0.95; }
        100% { transform: translate(20px, -10vh) scale(1.0); opacity: 0; }
      }
      @keyframes bmWeatherSparkle {
        0%   { transform: translate(0, 20vh) scale(0.4); opacity: 0; }
        40%  { transform: translate(8px, 40vh) scale(1.0); opacity: 1; }
        60%  { transform: translate(-6px, 50vh) scale(1.0); opacity: 1; }
        100% { transform: translate(0, 70vh) scale(0.4); opacity: 0; }
      }

      /* ── v53.1 polish: VS Card intro overlay ──
         Full-screen split-screen P1 vs P2 with team grids + countdown.
         Auto-dismisses in 2.8s; tap "Lewati" to skip. */
      .bm-vs-card {
        position: fixed; inset: 0; z-index: 9400;
        display: grid; grid-template-columns: 1fr auto 1fr;
        align-items: stretch;
        background: linear-gradient(135deg, rgba(2,132,199,0.94), rgba(15,23,42,0.94) 40%, rgba(220,38,38,0.94));
        color: #fff;
        font-family: 'Inter', system-ui, sans-serif;
        animation: bmVsCardIn 380ms cubic-bezier(0.22,1,0.36,1) forwards;
        overflow: hidden;
      }
      .bm-vs-card.out { animation: bmVsCardOut 350ms ease forwards; }
      @keyframes bmVsCardIn {
        0%   { opacity: 0; transform: scale(0.98); }
        100% { opacity: 1; transform: scale(1);    }
      }
      @keyframes bmVsCardOut {
        0%   { opacity: 1; transform: scale(1);    }
        100% { opacity: 0; transform: scale(1.04); }
      }
      .bm-vs-half {
        padding: 32px 18px 24px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 10px; text-align: center;
      }
      .bm-vs-p1 { background: linear-gradient(135deg, rgba(59,130,246,0.18), transparent); }
      .bm-vs-p2 { background: linear-gradient(225deg, rgba(220,38,38,0.18), transparent); }
      .bm-vs-tag {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(14px, 3vw, 18px);
        display: flex; align-items: center; gap: 6px;
      }
      .bm-vs-poke-name {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(20px, 5vw, 32px);
        text-shadow: 0 4px 14px rgba(0,0,0,0.6);
      }
      .bm-vs-region {
        font-size: clamp(11px, 2vw, 13px);
        opacity: 0.85;
        padding: 2px 8px; border-radius: 100px;
        background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25);
      }
      .bm-vs-mini-row {
        display: flex; gap: 4px; flex-wrap: nowrap; justify-content: center;
        margin-top: 6px;
      }
      .bm-vs-mini {
        width: clamp(36px, 8vw, 44px); height: clamp(36px, 8vw, 44px);
        border-radius: 10px;
        background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.20);
        display: grid; place-items: center; overflow: hidden;
      }
      .bm-vs-mini.is-active { border-color: #FCD34D; box-shadow: 0 0 12px rgba(252,211,77,0.7); }
      .bm-vs-mini img { width: 100%; height: 100%; object-fit: contain; }
      .bm-vs-mini-fb { font-size: 20px; }
      .bm-vs-center {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 8px; padding: 0 6px;
      }
      .bm-vs-vs {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(40px, 10vw, 64px);
        color: #FCD34D;
        text-shadow: 0 0 18px rgba(252,211,77,0.65), 0 6px 18px rgba(0,0,0,0.55);
        line-height: 1;
      }
      .bm-vs-countdown {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(28px, 7vw, 44px);
        color: #fff;
        text-shadow: 0 4px 14px rgba(0,0,0,0.6);
        min-height: 1.2em;
      }
      .bm-vs-pulse { animation: bmVsPulse 600ms ease-out; }
      @keyframes bmVsPulse {
        0%   { transform: scale(0.4); opacity: 0; }
        45%  { transform: scale(1.20); opacity: 1; }
        100% { transform: scale(1.0); opacity: 1; }
      }
      .bm-vs-skip {
        position: absolute; bottom: 18px; right: 18px;
        padding: 8px 14px; min-height: 38px;
        background: rgba(0,0,0,0.55); color: #fff;
        border: 1px solid rgba(255,255,255,0.25); border-radius: 8px;
        font-size: 13px; cursor: pointer;
      }
      .bm-vs-skip:hover { background: rgba(0,0,0,0.75); }

      /* ── v53.2 polish: pause / resume snack-break ── */
      .bm-pause-btn {
        position: fixed; top: 8px; right: 60px; z-index: 9105;
        background: rgba(0,0,0,0.70); color: #fff;
        width: 44px; height: 44px;
        border: none; border-radius: 10px;
        font-size: 18px; line-height: 1; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 150ms ease, transform 120ms ease;
      }
      .bm-pause-btn:hover  { background: rgba(0,0,0,0.88); }
      .bm-pause-btn:active { transform: scale(0.92); }
      .bm-pause-overlay {
        position: fixed; inset: 0; z-index: 9450;
        background: radial-gradient(circle, rgba(14,165,233,0.30), rgba(15,23,42,0.92));
        display: grid; place-items: center;
        animation: bmPauseIn 250ms ease forwards;
      }
      @keyframes bmPauseIn {
        from { opacity: 0; backdrop-filter: blur(0); }
        to   { opacity: 1; backdrop-filter: blur(4px); }
      }
      .bm-pause-card {
        background: linear-gradient(180deg, rgba(248,250,252,0.97), rgba(226,232,240,0.95));
        color: #0f172a;
        padding: 32px 36px;
        border-radius: 22px;
        border: 2.5px solid #475569;
        box-shadow: 0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.8);
        text-align: center;
        max-width: 360px;
      }
      .bm-pause-icon { font-size: 72px; margin-bottom: 6px; line-height: 1; }
      .bm-pause-title {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(28px, 6vw, 38px);
        margin-bottom: 4px;
        background: linear-gradient(135deg, #0EA5E9, #6366F1);
        -webkit-background-clip: text; background-clip: text; color: transparent;
        letter-spacing: 1px;
      }
      .bm-pause-sub {
        font-size: 14px; color: #475569;
        margin-bottom: 22px;
      }
      .bm-pause-resume {
        font-family: 'Fredoka One', cursive;
        font-size: 18px; padding: 14px 28px; min-height: 56px;
        background: linear-gradient(135deg, #10B981, #059669);
        color: #fff; border: none; border-radius: 14px;
        box-shadow: 0 4px 0 #047857, 0 8px 16px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 100ms ease;
      }
      .bm-pause-resume:hover  { transform: translateY(-1px); }
      .bm-pause-resume:active { transform: translateY(3px); box-shadow: 0 1px 0 #047857; }

      /* ── v53.2 polish: tournament resume prompt secondary button ── */
      .bm-tour-go-secondary {
        background: linear-gradient(135deg, #64748B, #475569) !important;
        box-shadow: 0 4px 0 #334155 !important;
        margin-top: 8px;
      }
      .bm-tour-go-secondary:active { box-shadow: 0 1px 0 #334155 !important; }
      .bm-tour-resume-card {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 12px;
        padding: 14px 16px;
        margin: 12px auto 18px;
        max-width: 360px;
        text-align: left;
      }
      .bm-tour-resume-line { margin: 4px 0; font-size: 14px; color: #f1f5f9; }

      /* ── v53.3 polish: mid-match win predictor pill ──
         Top-center of arena, showing P1 vs P2 win-probability after turn 3.
         The two halves grow proportionally to the prediction. */
      .bm-predictor {
        position: absolute; top: 6px; left: 50%;
        transform: translateX(-50%);
        z-index: 3;
        display: flex; align-items: stretch;
        width: 78%; max-width: 320px; height: 22px;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px; font-weight: 900;
        border: 1.5px solid rgba(0,0,0,0.4);
        pointer-events: none;
      }
      .bm-predictor-side {
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 10px; color: #fff;
        transition: flex 600ms cubic-bezier(0.4,0,0.2,1);
        min-width: 0; white-space: nowrap; overflow: hidden;
      }
      .bm-predictor-name { opacity: 0.85; text-overflow: ellipsis; overflow: hidden; }
      .bm-predictor-pct { font-size: 12px; }
      .bm-predictor-p1 { background: linear-gradient(90deg, #1d4ed8, #3b82f6); }
      .bm-predictor-p2 { background: linear-gradient(90deg, #b91c1c, #ef4444); flex-direction: row-reverse; }

      /* ── v53.3 polish: achievement toast (bottom-right slide-in) ── */
      .bm-achievement {
        position: fixed; right: 16px; bottom: 24px;
        z-index: 9420;
        display: flex; align-items: center; gap: 10px;
        padding: 10px 14px; min-width: 220px; max-width: 320px;
        background: linear-gradient(135deg, #fde68a, #fbbf24);
        color: #422006;
        border: 2px solid #92400e;
        border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.45);
        font-family: 'Inter', system-ui, sans-serif;
        transform: translateX(360px);
        opacity: 0;
        animation: bmAchievementIn 280ms cubic-bezier(0.22,1.4,0.36,1) forwards;
        transition: bottom 220ms ease;
      }
      .bm-achievement.out { animation: bmAchievementOut 400ms ease forwards; }
      @keyframes bmAchievementIn {
        0%   { opacity: 0; transform: translateX(360px) scale(0.9); }
        100% { opacity: 1; transform: translateX(0)     scale(1);   }
      }
      @keyframes bmAchievementOut {
        0%   { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(360px); }
      }
      .bm-achievement-emoji { font-size: 36px; line-height: 1; }
      .bm-achievement-text  { display: flex; flex-direction: column; }
      .bm-achievement-title { font-family: 'Fredoka One', cursive; font-size: 16px; }
      .bm-achievement-sub   { font-size: 11px; opacity: 0.85; margin-top: 1px; }

      /* ── v53.3 polish: tournament summary stats on champion card ── */
      .bm-tour-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px; margin: 14px auto;
        max-width: 380px;
      }
      .bm-tour-stat {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 12px;
        padding: 8px 6px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        text-align: center;
      }
      .bm-tour-stat-val {
        font-family: 'Fredoka One', cursive;
        font-size: clamp(20px, 4.5vw, 28px);
        color: #FCD34D;
        line-height: 1.1;
      }
      .bm-tour-stat-lbl {
        font-size: 11px; opacity: 0.8;
        margin-top: 2px;
        color: rgba(255,255,255,0.85);
      }

      /* ── FIXED 18/62/20 GRID — owner spec refined for safe-area cutoff ──
         Owner: "Kasih margin lagi area bawah agar nggak terpotong" + "masih
         banyak black space" — pulled top down to 18vh (less wasted dark zone),
         arena up to 62vh (more action), bottom 20vh + safe-area padding so
         choice buttons don't get clipped by the device nav bar. */
      /* v56.9 B-295 (owner: "malah kamu taruh di bawah jadi terpotong … margin
         thp tepi layar itu naikkan"): reserve top+bottom safe-area margins and
         use FRACTIONAL rows (not vh) that fill the PADDED height, so the bottom
         action/question zone can never clip under the browser chrome / rounded
         corners / gesture bar. box-sizing:border-box makes the padding subtract
         from the 100dvh instead of overflowing it. */
      .bm-stage-grid {
        display: grid;
        grid-template-rows: 20fr 56fr 24fr;
        height: 100dvh; max-height: 100svh;
        box-sizing: border-box;
        padding: max(6px, env(safe-area-inset-top)) 0 max(12px, env(safe-area-inset-bottom));
      }

      /* ── SHARED ARENA — both Pokemon in one view ── */
      /* v56.9 A-323: PvP/Tournament arena now uses the SAME stadium plate as the
         Adventure BattleArena (assets/background/gym/g13c-bg-gym-p.webp) with a
         slow idle drift — "stylenya sama". applyArenaBg() may still override
         --bm-arena-bg per region for variety. */
      .bm-arena {
        position: relative; overflow: hidden;
        background: linear-gradient(180deg,#6bbfee 0%,#a8d8f8 32%,#a0d870 46%,#5a9e3a 65%,#3e7028 100%);
        --bm-arena-bg: url('${_ASSET_BASE}assets/background/gym/g13c-bg-gym-p.webp');
      }
      .bm-arena::before {
        content: ''; position: absolute; inset: -10% -5%;
        background-image: var(--bm-arena-bg);
        background-position: center center;
        background-size: cover;
        background-repeat: no-repeat;
        opacity: 0.9; pointer-events: none;
        animation: bmArenaDrift 14s ease-in-out infinite alternate;
      }
      @keyframes bmArenaDrift {
        from { transform: translate(-1.2%, 0) scale(1.03); }
        to   { transform: translate(1.2%, -1%) scale(1.03); }
      }
      @media (prefers-reduced-motion: reduce) { .bm-arena::before { animation: none; } }
      /* v52 (concern 2): P2 HP card rotated 180° so the player sitting
         opposite the device reads HP / name / chips right-side-up.
         Bench-dot row counter-rotates so slot order remains L→R from
         P2's seat (slot 1 leftmost).
         Owner: "yang pokemon 2 itu health barnya menghadap ke atas (rotate 180deg)". */
      .bm-arena-opp .bm-info-card {
        transform: rotate(180deg);
        transform-origin: center center;
      }
      .bm-arena-opp .bm-info-card .bm-bench-dots {
        transform: rotate(180deg);
      }
      /* Opponent (P2) — top-right (mirrors .g10-espr-wrap) */
      .bm-arena-opp {
        position: absolute; top: 4%; right: 3%; z-index: 2;
        display: flex; flex-direction: column-reverse; align-items: flex-end;
        gap: 4px; max-width: 56%;
      }
      /* Self (P1) — bottom-left (mirrors .g10-pspr-wrap).
         v59.x P1-clip fix: lift the whole P1 quadrant a bit higher off the arena
         floor (bottom 4% → 7%) so the sprite + HP card clear the row-3 question
         zone / dark "Tunggu giliran" overlay instead of jamming against it.
         Owner: "portrait pokemon 1 tertutup/terpotong area bawah". */
      .bm-arena-self {
        position: absolute; bottom: 7%; left: 3%; z-index: 4;
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
      /* v56.9 A-323: match the Adventure BattleArena HP card (.ba-card) — white,
         soft-rounded, drop-shadow (was the DS beige/hard-border card). */
      .bm-info-card {
        background: rgba(255,255,255,0.96);
        border: none; border-radius: 16px;
        padding: 7px 11px 8px;
        box-shadow: 0 6px 18px rgba(0,0,0,0.28), inset 0 1px 0 #fff;
        min-width: 138px; max-width: 178px;
        color: #1f2937;
      }
      .bm-info-name {
        font-family: 'Fredoka One', cursive; font-size: 13px; color: #111827;
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
      /* Sprite-level low-HP red pulse — fires when active Pokemon hp < 25%.
         Combines with existing sprite-bob; uses drop-shadow so PNG sprites
         still pulse red without changing the sprite color itself. */
      .bm-sprite-danger {
        animation: bmSpriteBob 2200ms ease-in-out infinite, bmSpriteDanger 0.9s ease-in-out infinite !important;
      }
      @keyframes bmSpriteDanger {
        0%, 100% { filter: drop-shadow(0 6px 18px rgba(0,0,0,0.7)) drop-shadow(0 0 0 transparent); }
        50%      { filter: drop-shadow(0 6px 18px rgba(0,0,0,0.7)) drop-shadow(0 0 16px rgba(232,48,48,0.95)) drop-shadow(0 0 26px rgba(232,48,48,0.6)); }
      }
      .bm-hp-text {
        font-size: 9px; font-weight: 700; color: #555;
        font-family: monospace; text-align: right;
      }

      /* ── Q-ZONE (top + bottom) — softer gradient so the inactive zone doesn't read as dead black ── */
      .bm-qzone {
        position: relative;
        /* v56.9 B-295: overflow-y AUTO (was hidden) so a zone that is still too
           tall for its row SCROLLS instead of clipping into a dead end
           (owner: "nggak bisa di scroll lagi layarnya"). */
        overflow-y: auto; overflow-x: hidden;
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

      /* Region quick-nav tabs — sticky top of the picker, horizontal scroll */
      .bm-region-tabs {
        position: sticky; top: -8px;
        display: flex; gap: 4px;
        padding: 6px 4px 6px;
        background: linear-gradient(180deg, rgba(168,216,248,0.95), rgba(168,216,248,0.0));
        backdrop-filter: blur(6px);
        overflow-x: auto;
        scrollbar-width: thin;
        max-width: 100%;
        z-index: 5;
        align-self: stretch;
        margin: 0 -8px;
      }
      .bm-region-tabs::-webkit-scrollbar { height: 4px; }
      .bm-region-tabs::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.25); border-radius: 2px; }
      .bm-region-tab {
        flex-shrink: 0;
        padding: 5px 10px;
        background: rgba(248,248,240,0.95);
        border: 2px solid #444; border-radius: 999px;
        font-family: 'Fredoka One', cursive;
        font-size: 11px; color: #111;
        cursor: pointer;
        box-shadow: 1px 1px 0 rgba(0,0,0,0.25);
        transition: transform 120ms, box-shadow 120ms;
        white-space: nowrap;
      }
      .bm-region-tab:hover { transform: translate(-1px,-1px); box-shadow: 2px 2px 0 rgba(0,0,0,0.30); }
      .bm-region-tab:active { transform: translate(1px,1px); box-shadow: 0 0 0 rgba(0,0,0,0); }

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
      /* v53.4 anti-spam (concern 2): once a move is locked-in the row dims and
         every sibling becomes inert until the next action-phase reset. */
      .bm-move[disabled] {
        opacity: 0.55;
        pointer-events: none;
        cursor: not-allowed;
        filter: grayscale(0.4);
      }
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

      /* ── v56.8 B-293 sempurnakan — LANDSCAPE fit ──
         The portrait 18vh/20vh q-zones are ~70-78px tall on a landscape tablet:
         the question row + choices overflowed off-screen (answer buttons cut
         off = unplayable). Landscape gets taller zones + a compact single-row
         question layout. Zone alternation / rotation logic untouched. */
      @media (orientation: landscape) and (max-height: 600px) {
        .bm-stage-grid { grid-template-rows: 26fr 44fr 30fr; }
        .bm-qzone { padding: 2px 4px 4px; }
        .bm-qzone-inner { max-width: 660px; }
        .bm-q-row { gap: 3px; }
        .bm-timer-bar { height: 4px; margin-bottom: 0; }
        .bm-q-text { font-size: clamp(14px, 5.5vh, 20px); }
        .bm-choices { grid-template-columns: repeat(4, 1fr); max-width: 660px; gap: 5px; }
        .bm-choice { padding: 5px 4px; font-size: clamp(14px, 5vh, 20px); box-shadow: 0 3px 0 var(--btn-shadow); }
        .bm-moves { grid-template-columns: repeat(4, 1fr); max-width: 660px; gap: 5px; }
        .bm-move { padding: 4px 4px; }
        .bm-move-name { font-size: 11px; }
        .bm-action-row { gap: 2px; }
        .bm-action-prompt { font-size: clamp(12px, 4.5vh, 15px); }
        .bm-action-grid { max-width: 430px; gap: 6px; }
        .bm-action-card { flex-direction: row; gap: 7px; padding: 5px 8px; }
        .bm-action-emoji { font-size: 20px; }
        .bm-action-label { font-size: clamp(13px, 4.5vh, 16px); }
        .bm-action-sub { display: none; }
        .bm-qzone-wait { font-size: clamp(13px, 5.5vh, 18px); }
        /* v59.x P1-clip fix (landscape): the arena row is only ~44fr of a short
           screen, so the full-size sprite + HP card overflowed the arena floor
           into the bottom question zone / dark overlay. Cap the sprites smaller
           and lift the P1 quadrant higher so both fighters sit fully inside the
           arena, clear of both q-zones. Symmetric cap keeps P2 balanced. */
        .bm-arena-opp-img, .bm-arena-self-img {
          width: min(30vw, 15vh); height: min(30vw, 15vh);
        }
        .bm-arena-opp-sprite, .bm-arena-self-sprite { font-size: clamp(64px, 14vh, 120px); }
        .bm-arena-self { bottom: 9%; }
        .bm-arena-opp { top: 9%; }
        .bm-info-card { min-width: 118px; max-width: 150px; padding: 5px 9px 6px; }
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
    // CRITICAL: also inject the PvP-real CSS — Tournament's size/picker/action UI
    // reuses .bm-size-card / .bm-pkg-card / .bm-prestep / .bm-action-card /
    // .bm-region-tabs classes which all live in injectPvPRealCSS. Owner reported
    // size step was unclickable because cards rendered without CSS, collapsing
    // to default tiny <button>. _realCssInjected guard makes this idempotent.
    injectPvPRealCSS();
    // v52 (concerns 5+7): start BGM once for the whole tournament. Per-match
    // startPvP calls pass `_noBgm: true` so the music doesn't restart between
    // matches. bmBgmStop fires when the user backs out (see `close()`).
    bmBgmIsMuted();
    bmBgmPlay();
    const root = document.createElement('div');
    root.className = 'bm-tour';
    document.body.appendChild(root);
    // v56.8 B-293 — same scene-park as startPvP (see comment there).
    try { if (window.BattleArena && window.BattleArena.setSceneVisible) window.BattleArena.setSceneVisible(false); } catch (e) {}

    // Tournament steps: count → names → size (3 or 6) → pick (per player) → bracket
    let step = 'count';
    let playerCount = 0;
    let players = [];       // [{ name, idx, team: [], teamSize }]
    let teamSize = 6;
    let pickingPlayer = 0;  // who's currently picking
    let bracket = null;
    let currentMatch = 0;
    // v53.3 polish: tournament-level stats for the post-final summary card.
    let tourStats = {
      startedAt: Date.now(),
      matchesPlayed: 0,
      achievementsFired: {} // dedup across matches
    };

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
          // v53.2 polish #3: pre-fill from localStorage so trainer names
          // persist across tournament sessions.
          let saved = [];
          try {
            const raw = localStorage.getItem('dunia-tour-names');
            if (raw) { const j = JSON.parse(raw); if (Array.isArray(j)) saved = j; }
          } catch (e) {}
          players = Array.from({ length: playerCount }, (_, i) => ({
            name: (typeof saved[i] === 'string') ? saved[i] : '',
            idx: i
          }));
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
        // v53.2 polish #3: persist trainer names for next session.
        try {
          const allNames = players.map(p => p.name || '');
          localStorage.setItem('dunia-tour-names', JSON.stringify(allNames));
        } catch (e) {}
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
        // v52: Tournament's own startTournament boot already started BGM —
        // suppress per-match restart so the gym OST plays continuously.
        _noBgm: true,
        // Pass picked teams — startPvP sees opts.teams so it skips the pre-battle
        // picker and goes straight to the arena with these teams.
        teams: [cloneFreshTeam(aP.team), cloneFreshTeam(bP.team)],
        teamSize: aP.teamSize || teamSize,
        onComplete: (res) => {
          // winnerIdx is 0 or 1 within the match's players
          cur.winner = res.winnerIdx === 0 ? 'a' : 'b';
          currentMatch++;
          // Audio cue between intermediate matches (final winner gets sfxChampion
          // from showChampion). Fires only if more matches remain.
          const flat = flatMatches();
          if (currentMatch < flat.length) {
            try { sfxMatchWin(); } catch (e) {}
          }
          // v53.2 polish #2: persist bracket state after every match so a kid
          // abandoning mid-tournament can pick it back up next session.
          try { saveBracket(); } catch (e) {}
          // v53.3 polish: tournament stats accumulator (totals shown on champion card).
          tourStats.matchesPlayed++;
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
      // v53.2 polish #2: tournament complete → clear the resume save so the
      // next boot starts fresh instead of offering to "lanjutkan" a finished run.
      try { localStorage.removeItem('dunia-tour-save-v1'); } catch (e) {}
      // Collect defeated player names from the bracket
      const defeated = players.filter(p => p !== champP).map(p => p.name);
      // Team grid showcase — champion's picked team with sprites
      const teamGrid = champP.team ? champP.team.slice(0, champP.teamSize || champP.team.length).map(p => {
        const id = slugToId(p.slug);
        const color = TYPE_COLOR[p.type] || '#A8A878';
        return `
          <div class="bm-champion-poke" title="${escapeHtml(p.name)}" style="background:${color}33; border-color:${color};">
            <img class="bm-champion-poke-img" src="${spritePath(id, spriteSlug(p.slug))}" alt="${escapeHtml(p.name)}"
                 onerror="window._bmSpriteOnError(this,'${spriteSlug(p.slug)}','⭐','bm-champion-poke-fb')">
            <div class="bm-champion-poke-name">${escapeHtml(p.name)}</div>
          </div>
        `;
      }).join('') : '';
      // v53.3 polish: tournament summary stats — duration, matches, defeated count.
      const elapsedMin = Math.max(1, Math.round((Date.now() - tourStats.startedAt) / 60000));
      const statsHtml = `
        <div class="bm-tour-stats">
          <div class="bm-tour-stat"><span class="bm-tour-stat-val">${tourStats.matchesPlayed}</span><span class="bm-tour-stat-lbl">⚔️ Pertandingan</span></div>
          <div class="bm-tour-stat"><span class="bm-tour-stat-val">${defeated.length}</span><span class="bm-tour-stat-lbl">😵 Lawan Dikalahkan</span></div>
          <div class="bm-tour-stat"><span class="bm-tour-stat-val">${elapsedMin}m</span><span class="bm-tour-stat-lbl">⏱️ Durasi</span></div>
        </div>
      `;
      const card = document.createElement('div');
      card.className = 'bm-champion';
      card.innerHTML = `
        <div class="bm-champion-card">
          <span class="bm-champion-trophy">🏆</span>
          <div class="bm-champion-title">Juara Tournament!</div>
          <div class="bm-champion-name">${escapeHtml(champP.name)}</div>
          ${teamGrid ? `<div class="bm-champion-team-label">Tim Juara</div><div class="bm-champion-team-grid">${teamGrid}</div>` : ''}
          ${statsHtml}
          ${defeated.length ? `<div class="bm-champion-defeated">Mengalahkan: ${defeated.map(escapeHtml).join(', ')}</div>` : ''}
          <div class="bm-champion-actions">
            <button class="bm-champion-btn" id="bm-tour-again">Main Lagi (pemain sama)</button>
            <button class="bm-champion-btn secondary" id="bm-tour-exit">Selesai</button>
          </div>
        </div>
      `;
      document.body.appendChild(card);
      // v53.3 polish: champion confetti palette keyed to the winning team's
      // active Pokemon type. Reads the first slot if no current active.
      const _champFirst = (champP.team && champP.team[0]) || null;
      const _champColor = (_champFirst && TYPE_COLOR[_champFirst.type]) || '#FCD34D';
      spawnConfetti(60, null, _champColor);
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

    // v53.2 polish #2: tournament save & resume.
    // Save snapshot fires on every match completion (in runCurrentMatch's
    // onComplete). Resume prompt appears on the next boot if a save exists.
    // Auto-clear on showChampion (above) and on user's "Mulai Baru" choice.
    function saveBracket () {
      try {
        const data = {
          v: 1,
          title: opts.title || 'Tournament',
          playerCount, players, teamSize, bracket, currentMatch,
          savedAt: Date.now()
        };
        localStorage.setItem('dunia-tour-save-v1', JSON.stringify(data));
      } catch (e) {}
    }
    function loadSave () {
      try {
        const raw = localStorage.getItem('dunia-tour-save-v1');
        if (!raw) return null;
        const j = JSON.parse(raw);
        if (!j || j.v !== 1 || !Array.isArray(j.players) || !j.bracket) return null;
        // Reject saves that are already complete (defensive).
        const flat = (j.bracket.rounds || []).flat();
        if (flat.length && flat.every(m => m.winner !== null)) return null;
        return j;
      } catch (e) { return null; }
    }
    function restoreFromSave (data) {
      playerCount = data.playerCount;
      players = data.players;
      teamSize = data.teamSize;
      bracket = data.bracket;
      currentMatch = data.currentMatch | 0;
      step = 'bracket';
      renderBracket();
    }
    function renderResumePrompt (data) {
      const flat = (data.bracket.rounds || []).flat();
      const finished = flat.filter(m => m.winner !== null).length;
      const total = flat.length;
      const when = new Date(data.savedAt || Date.now());
      const ago = Math.max(1, Math.round((Date.now() - (data.savedAt || Date.now())) / 60000));
      const names = data.players.map(p => escapeHtml(p.name || '?')).join(' · ');
      root.innerHTML = `
        ${header()}
        <div class="bm-tour-step">
          <h2>📂 Lanjutkan tournament tersimpan?</h2>
          <div class="bm-tour-resume-card">
            <div class="bm-tour-resume-line"><b>🏆 ${escapeHtml(data.title || 'Tournament')}</b></div>
            <div class="bm-tour-resume-line">👥 ${names}</div>
            <div class="bm-tour-resume-line">⚔️ Pertandingan ${finished}/${total} selesai</div>
            <div class="bm-tour-resume-line" style="opacity:0.7; font-size:12px;">Disimpan ${ago} menit lalu</div>
          </div>
          <button class="bm-tour-go" id="bm-tour-resume">▶ Lanjutkan</button>
          <button class="bm-tour-go bm-tour-go-secondary" id="bm-tour-restart">🆕 Mulai Baru</button>
        </div>
      `;
      bindBack();
      const resumeBtn = root.querySelector('#bm-tour-resume');
      const restartBtn = root.querySelector('#bm-tour-restart');
      if (resumeBtn) resumeBtn.addEventListener('click', () => restoreFromSave(data));
      if (restartBtn) restartBtn.addEventListener('click', () => {
        try { localStorage.removeItem('dunia-tour-save-v1'); } catch (e) {}
        renderCount();
      });
    }
    const _existingSave = loadSave();
    if (_existingSave) renderResumePrompt(_existingSave);
    else renderCount();
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
    // v53.2 polish #3: pre-fill from localStorage so the names persist across
    // sessions. Owner-friendly: type once, remembered next time.
    let saved = [];
    try {
      const raw = localStorage.getItem('dunia-pvp-names');
      if (raw) { const j = JSON.parse(raw); if (Array.isArray(j)) saved = j; }
    } catch (e) {}
    let rows = '';
    const palette = ['#3B82F6','#EF4444'];
    for (let i = 0; i < count; i++) {
      const prev = (typeof saved[i] === 'string') ? saved[i] : '';
      rows += `
        <div class="bm-tour-name-row">
          <span class="bm-tour-name-badge" style="background:${palette[i]}25; color:${palette[i]}; border:1px solid ${palette[i]}80;">P${i+1}</span>
          <input class="bm-tour-name-input" type="text" placeholder="Nama pemain ${i+1} (${suggestions[i]})" data-idx="${i}" maxlength="14" value="${escapeHtml(prev)}">
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
      // v53.2 polish #3: persist for next session.
      try { localStorage.setItem('dunia-pvp-names', JSON.stringify(names)); } catch (e) {}
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
    try {
      // v52 (concerns 5+7): silence the gym OST when leaving PvP / Tournament.
      // Tournament's per-match PvP roots carry data-no-bgm so the music keeps
      // playing across matches; only the outer Tournament root tear-down stops it.
      if (root && root.classList) {
        const isTourRoot = root.classList.contains('bm-tour');
        const isStandalonePvP = root.classList.contains('bm-pvp-real') && !root.dataset.noBgm;
        if (isTourRoot || isStandalonePvP) bmBgmStop();
      }
      root.remove();
    } catch (e) {}
    // v56.8 B-293 — un-park the host page's BattleArena Adventure scene.
    // Idempotent; intermediate teardowns (name step, per-match roots) restore
    // it a beat early but the next opaque z9100 root re-hides it before paint.
    try { if (window.BattleArena && window.BattleArena.setSceneVisible) window.BattleArena.setSceneVisible(true); } catch (e) {}
  }

  function escapeHtml (s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ── Export ─────────────────────────────────────────────────────────
  // v53.5: expose canonical Pokemon stat lookups + calcDamage helper so
  // G13C Adventure (separate engine in g13c-pixi.html) can apply the same
  // balance refinements without duplicating the ~120-entry stat maps.
  global.BattleModes = {
    show: show,
    startPvP: startPvP,
    startTournament: startTournament,
    stats: {
      speedFromSlug: speedFromSlug,
      attackFromSlug: attackFromSlug,
      defenseFromSlug: defenseFromSlug,
      // Adventure-friendly damage shaper: takes the engine's base damage and
      // applies Atk/Def stat ratio + Speed-gap modifier.
      // v54.30 balance:
      //   - statRatio clamp tightened [0.6, 1.6] → [0.75, 1.35] (parity w/ PvP).
      //   - per-hit damage cap at 40% of defender hpMax — defender survives a
      //     1st hit even in worst-case stacking. 4th arg defHpMax is OPTIONAL
      //     (backwards-compatible: undefined → 90 baseline → cap 36).
      shapeDamage: function (baseDmg, atkSlug, defSlug, defHpMax) {
        const a = attackFromSlug(atkSlug);
        const d = defenseFromSlug(defSlug);
        const aSpd = speedFromSlug(atkSlug);
        const dSpd = speedFromSlug(defSlug);
        const statRatio = Math.max(0.75, Math.min(1.35, a / d));
        let spdMod = 1.0;
        if (aSpd >= dSpd + 30) spdMod = 1.10;
        else if (aSpd <= dSpd - 30) spdMod = 0.95;
        const raw = Math.max(1, Math.round(baseDmg * statRatio * spdMod));
        const cap = Math.floor(((typeof defHpMax === 'number' && defHpMax > 0) ? defHpMax : 90) * 0.40);
        return Math.min(raw, cap);
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
