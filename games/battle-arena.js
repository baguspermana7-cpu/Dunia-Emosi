/* =============================================================================
 * battle-arena.js — window.BattleArena  (v1.1.1, 2026-07-04, A-317 + A-319 + B-293)
 * =============================================================================
 * v1.1.1 B-293: setSceneVisible(visible) — battle-modes (PvP/Tournament) parks
 * the mounted Adventure scene while its own full-screen root runs, restores it
 * on teardown. .ba-qskin restyled to the cream + brown-outline question look.
 * =============================================================================
 * A-319 screen-by-screen video fidelity (VISUAL ONLY — logic untouched):
 *   - stadium backdrop (assets/background/gym/stadium-video.webp) is the
 *     DEFAULT arena bg, mounted in a LAYERED stage: bg (slow idle drift)
 *     → sparkle motes → fighters → flower/grass FOREGROUND corners in front.
 *     bg/fg counter-shift on lunge + punch-in (transform-only parallax).
 *   - heroMode(on): action-select close-up — bg gets STATIC blur(2px)
 *     brightness(1.05) DOF, player fighter grows, enemy fades (f12).
 *   - quiz (f19): cream chunky question w/ thick brown outline, DARK charcoal
 *     narration pill, white glass answer pills w/ dark numbers, orange energy
 *     AURA behind the attacker while the quiz is open.
 *   - answer (f24): .qz-correct pill gets green glow ring + ✓ badge.
 *   - damage (f29): CAMERA PUNCH-IN to ~1.55 at the hit fighter (280ms out /
 *     ~650ms hold / 300ms back) + bg blur(4px) + chunky ORANGE brown-outlined
 *     damage numbers. Reduced-motion: punch-in skipped, pops kept.
 *   - center-top VS scoreboard chip (cosmetic).
 * =============================================================================
 * SHARED battle-presentation engine for ALL Pokemon battles (M-303 mandate:
 * cross-game concerns live in ONE shared engine — never per-game hardcoded).
 * Adopted by: games/gym-pokemon.html (classic gym) + games/data/battle-modes.js
 * (PvP + tournament, skin classes + FX routing only — its turn logic untouched).
 *
 * Replicates the owner's concept video:
 *   - fighters stand ON the arena field at ground level, player LEFT (large,
 *     ~35% viewport height), enemy RIGHT (~28%), thin white sticker OUTLINE
 *     (4 offset white drop-shadows) + slow idle bob.
 *   - corner HP CARDS: rounded white card w/ name, type chip, Lv chip, green
 *     HP bar + "95/95" text + pokeball team dots. Player top-left, enemy
 *     top-right.
 *   - narration pill bottom-left ("<Pokemon> bersiap menggunakan <Move>!").
 *   - math question floats BIG center (white + warm glow), 4 glassy answer
 *     pills across the bottom (wraps the SHARED window.QuizEngine — the
 *     generation/answer engine is NOT forked, only reskinned via .ba-quiz).
 *   - attack = lunge (ease-out ~250ms) + type-colored glowing orb projectile
 *     with trail; hit = big orange/red damage number pops (scale-in + rise +
 *     fade, staggered) + target flash/knockback ~10px.
 *
 * All JS animation is frame-rate independent (parametric easing over
 * performance.now with dt-clamp) — safe on the owner's throttled tablet.
 * Honors prefers-reduced-motion: lunge/orb/shake skipped, state changes kept.
 * ========================================================================== */
;(function (global) {
  'use strict'

  var CSS_ID = 'ba-arena-css'
  var REDUCED = false
  try {
    REDUCED = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches)
  } catch (_) {}

  var TYPE_COLOR = {
    normal: '#A8A878', fire: '#FF6B35', water: '#4FC3F7', grass: '#4CAF50',
    electric: '#FFCB05', psychic: '#F95587', rock: '#B8A038', ghost: '#705898',
    ice: '#98D8D8', dragon: '#7038F8', dark: '#5a4a42', steel: '#B8B8D0',
    fighting: '#C03028', ground: '#E0C068', flying: '#A890F0', poison: '#A040A0',
    bug: '#A8B820', fairy: '#EE99AC'
  }

  var CSS = [
    /* ── field + fighters ── */
    '.ba-field{position:fixed;inset:0;z-index:20;pointer-events:none}',
    '.ba-fighter{position:absolute;bottom:var(--ba-ground,24%);will-change:transform}',
    '.ba-fighter-player{left:4%}',
    '.ba-fighter-enemy{right:5%}',
    '.ba-fighter::after{content:"";position:absolute;left:50%;bottom:-9px;width:80%;height:16px;',
    'transform:translateX(-50%);background:radial-gradient(ellipse,rgba(0,0,0,.32),rgba(0,0,0,.10) 55%,transparent 72%);',
    'border-radius:50%;z-index:-1}',
    '.ba-bob{animation:baBob 2.8s ease-in-out infinite}',
    '.ba-fighter-enemy .ba-bob{animation-duration:3.3s;animation-delay:.6s}',
    '@keyframes baBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '.ba-sprite{display:block;object-fit:contain;height:min(34svh,44vw);max-width:46vw;transition:opacity .25s}',
    '.ba-fighter-enemy .ba-sprite{height:min(27svh,36vw);max-width:38vw}',
    /* thin white sticker outline — 4 offset white drop-shadows + soft ground shadow.
       Doubled class = specificity (0,2,0) so it also wins over battle-modes'
       .bm-arena-*-img filter rules without !important (keeps .bm-sprite-danger
       animation able to override during low-HP pulse). */
    '.ba-outline.ba-outline{filter:drop-shadow(1.5px 0 0 rgba(255,255,255,.95)) drop-shadow(-1.5px 0 0 rgba(255,255,255,.95)) ',
    'drop-shadow(0 1.5px 0 rgba(255,255,255,.95)) drop-shadow(0 -1.5px 0 rgba(255,255,255,.95)) drop-shadow(0 10px 16px rgba(0,0,0,.45))}',
    '.ba-fighter.ba-faint{transition:transform .55s cubic-bezier(.5,0,.8,.4),opacity .55s ease;transform:translateY(52px);opacity:0}',
    '.ba-faint .ba-bob{animation:none}',
    '.ba-knock-l{animation:baKnockL .38s ease-out}',
    '.ba-knock-r{animation:baKnockR .38s ease-out}',
    '@keyframes baKnockL{0%,100%{translate:0 0}35%{translate:-11px 0}}',
    '@keyframes baKnockR{0%,100%{translate:0 0}35%{translate:11px 0}}',
    '.ba-hitflash{animation:baHitFlash .32s ease}',
    '@keyframes baHitFlash{0%,100%{opacity:1}30%,70%{opacity:.25}}',
    '.ba-stumble{animation:baStumble .45s ease}',
    '@keyframes baStumble{0%,100%{translate:0 0;rotate:0deg}25%{translate:-8px 2px;rotate:-4deg}60%{translate:6px 0;rotate:3deg}}',
    /* ── 2026-10-17 hit feel (owner's "make attacks feel good" video): white blink + squash on impact, a hitstop
       freeze, a heavier knockback, a slash arc, the HP bar's white trail and a shatter on the knockout ── */
    '.ba-sprite.ba-white.ba-white{filter:brightness(0) invert(1) drop-shadow(0 0 6px rgba(255,255,255,.9))}',
    '.ba-squash{transform:scale(1.14,.84);transform-origin:50% 100%}',
    '.ba-knock2-l{animation:baKnock2L .42s cubic-bezier(.2,.9,.3,1)}',
    '.ba-knock2-r{animation:baKnock2R .42s cubic-bezier(.2,.9,.3,1)}',
    '@keyframes baKnock2L{0%{translate:0 0}30%{translate:-24px -4px}62%{translate:3px 0}100%{translate:0 0}}',
    '@keyframes baKnock2R{0%{translate:0 0}30%{translate:24px -4px}62%{translate:-3px 0}100%{translate:0 0}}',
    '.ba-slash{position:fixed;z-index:58;pointer-events:none;overflow:visible}',
    '.ba-slash path{fill:none;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:baSlash .3s ease-out forwards}',
    '@keyframes baSlash{0%{stroke-dashoffset:1;opacity:1}70%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}',
    '.ba-spark{position:fixed;z-index:58;width:5px;height:14px;border-radius:3px;pointer-events:none;transform-origin:50% 50%}',
    '.ba-hp-track{position:relative}',
    '.ba-hp-trail{position:absolute;left:0;top:0;height:100%;width:100%;border-radius:999px;background:#fff;box-shadow:0 0 4px rgba(255,255,255,.9)}',
    '.ba-hp-fill{position:relative}',
    '.ba-crit{position:fixed;z-index:61;pointer-events:none;font-weight:900;font-size:26px;color:#fde047;letter-spacing:1px;',
    'text-shadow:0 2px 0 #b45309,0 0 12px rgba(250,204,21,.8);transform:translate(-50%,-50%) scale(.4);opacity:0;animation:baCrit .9s cubic-bezier(.34,1.56,.64,1) forwards}',
    '@keyframes baCrit{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}25%{transform:translate(-50%,-50%) scale(1.15);opacity:1}75%{opacity:1}100%{transform:translate(-50%,-80%) scale(1);opacity:0}}',
    '.ba-shard{position:fixed;z-index:59;pointer-events:none;background-repeat:no-repeat}',
    /* ── corner HP cards ── */
    '.ba-card{position:fixed;top:var(--ba-card-top,10px);z-index:60;background:rgba(255,255,255,.95);',
    'border-radius:16px;padding:8px 12px 9px;box-shadow:0 6px 18px rgba(0,0,0,.28),inset 0 1px 0 #fff;',
    'min-width:150px;max-width:min(46vw,214px);pointer-events:none;color:#1f2937;font-family:inherit}',
    '.ba-card-player{left:10px}',
    '.ba-card-enemy{right:10px}',
    '.ba-card-name{font-size:14px;font-weight:900;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ba-chips{display:flex;gap:4px;margin:3px 0 5px;flex-wrap:wrap}',
    '.ba-chip{display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;font-size:9.5px;',
    'font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.3)}',
    '.ba-chip-lv{background:#eef0f4;color:#374151;text-shadow:none;border:1px solid #d7dbe2}',
    '.ba-hp-row{display:flex;align-items:center;gap:5px}',
    '.ba-hp-lbl{font-size:9px;font-weight:900;color:#6b7280;letter-spacing:.5px}',
    '.ba-hp-track{flex:1;height:9px;background:#e5e7eb;border-radius:999px;overflow:hidden;border:1px solid #d1d5db}',
    '.ba-hp-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#4ade80,#22c55e);width:100%}',
    '.ba-hp-fill.ba-hp-med{background:linear-gradient(90deg,#fbbf24,#f59e0b)}',
    '.ba-hp-fill.ba-hp-low{background:linear-gradient(90deg,#f87171,#ef4444)}',
    '.ba-hp-text{font-size:11px;font-weight:800;color:#4b5563;text-align:right;margin-top:2px;font-variant-numeric:tabular-nums}',
    '.ba-dots{display:flex;gap:3px;flex-wrap:wrap;margin-top:3px}',
    '.ba-dot{width:14px;height:14px;border-radius:50%;background:linear-gradient(180deg,#e3000b 50%,#fff 50%);',
    'border:1.5px solid #1a1a1a;position:relative;flex-shrink:0}',
    '.ba-dot::before{content:"";position:absolute;left:0;right:0;top:calc(50% - 1px);height:2px;background:#1a1a1a}',
    '.ba-dot::after{content:"";width:4px;height:4px;border-radius:50%;background:#fff;border:1.5px solid #1a1a1a;',
    'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}',
    '.ba-dot.ba-fainted{background:#9ca3af;border-color:#6b7280}',
    '.ba-dot.ba-fainted::before{background:#6b7280}',
    '.ba-dot.ba-fainted::after{background:#d1d5db;border-color:#6b7280}',
    '.ba-card-extra:empty{display:none}',
    /* ── narration pill (bottom-left) ── */
    /* v1.1.0 A-319 (f19): DARK charcoal narration pill w/ white text — the video look. */
    '.ba-narrate{position:fixed;left:10px;bottom:var(--ba-narrate-bottom,12px);z-index:120;max-width:min(78vw,420px);',
    'background:rgba(30,32,40,.92);color:#fff;border-radius:16px;padding:10px 18px;font-size:15px;font-weight:800;',
    'box-shadow:0 6px 16px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.12);line-height:1.3;pointer-events:auto;cursor:pointer;',
    'transition:opacity .18s,transform .18s;transform-origin:left bottom}',
    '.ba-narrate.ba-hidden{opacity:0;transform:scale(.9);pointer-events:none}',
    '.ba-narrate-pop{animation:baNarratePop .22s ease-out}',
    '@keyframes baNarratePop{0%{transform:scale(.92)}60%{transform:scale(1.03)}100%{transform:scale(1)}}',
    /* ── quiz overlay: BIG centered question + glassy bottom pills ── */
    '.ba-quiz{position:fixed;inset:0;z-index:150;pointer-events:none}',
    '.ba-quiz-center{position:absolute;left:0;right:0;top:20%;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 12px}',
    '.ba-quiz-label{background:rgba(255,255,255,.88);color:#7c3aed;border-radius:999px;padding:4px 14px;',
    'font-size:11px;font-weight:900;letter-spacing:1.6px;box-shadow:0 3px 10px rgba(0,0,0,.25)}',
    /* v1.1.0 A-319 (f19): CREAM chunky digits with a THICK dark-brown outline — the
       video look — instead of the warm glow. Fredoka carries a 3px stroke cleanly. */
    '.ba-quiz .qz-question{color:#fff6df;font-family:"Fredoka One",cursive,sans-serif;',
    'font-size:clamp(38px,10vw,72px);font-weight:900;margin-bottom:0;line-height:1.05;',
    '-webkit-text-stroke:3px #5b3a1e;paint-order:stroke fill;',
    'text-shadow:0 3px 0 #5b3a1e,0 6px 14px rgba(0,0,0,.45)}',
    '.ba-quiz .qz-choices{position:absolute;left:50%;transform:translateX(-50%);width:min(94vw,600px);',
    'bottom:calc(12px + env(safe-area-inset-bottom,0px));pointer-events:auto;gap:10px}',
    '.ba-quiz .qz-choices .qz-pill{max-width:none;min-height:56px;border-radius:20px;font-size:clamp(20px,5.4vw,28px);',
    'background:rgba(255,255,255,.30);border:2px solid rgba(255,255,255,.75);color:#fff;',
    'text-shadow:0 2px 4px rgba(0,0,0,.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
    'box-shadow:0 8px 20px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.55)}',
    /* v1.1.0 A-319 (f24): correct answer = green pill + glow ring + ✓ badge */
    '.ba-quiz .qz-choices .qz-pill.qz-correct{background:rgba(74,222,128,.55)!important;border-color:#4ade80!important;',
    'color:#fff!important;box-shadow:0 0 0 4px rgba(74,222,128,.45),0 0 26px rgba(74,222,128,.75),0 8px 20px rgba(0,0,0,.3)!important;',
    'position:relative}',
    '.ba-quiz .qz-choices .qz-pill.qz-correct::after{content:"✓";position:absolute;top:-12px;right:-8px;width:26px;height:26px;',
    'border-radius:50%;background:#22c55e;color:#fff;font-size:17px;font-weight:900;display:grid;place-items:center;',
    'box-shadow:0 2px 6px rgba(0,0,0,.35);-webkit-text-stroke:0;text-shadow:none}',
    /* v1.1.0 A-319 (f24): orange energy AURA behind the attacker while the quiz is open */
    '.ba-aura{position:absolute;left:50%;top:52%;width:130%;height:120%;transform:translate(-50%,-50%);z-index:-1;',
    'pointer-events:none;background:radial-gradient(ellipse at 50% 60%,rgba(255,150,40,.42) 0%,rgba(255,110,20,.20) 42%,transparent 68%);',
    'animation:baAura 1.1s ease-in-out infinite alternate}',
    '.ba-aura::before,.ba-aura::after{content:"";position:absolute;border-radius:50%;border:3px solid rgba(255,170,60,.5);',
    'inset:12% 18%;border-left-color:transparent;border-bottom-color:transparent;animation:baAuraSpin 2.4s linear infinite}',
    '.ba-aura::after{inset:22% 26%;border-color:rgba(255,210,120,.45);border-right-color:transparent;border-top-color:transparent;',
    'animation-duration:1.7s;animation-direction:reverse}',
    '@keyframes baAura{from{opacity:.55;transform:translate(-50%,-50%) scale(.96)}to{opacity:.95;transform:translate(-50%,-50%) scale(1.05)}}',
    '@keyframes baAuraSpin{to{rotate:360deg}}',
    /* v1.1.0 A-319: layered depth — bg idle drift, corner flower FOREGROUND, sparkle motes */
    '.ba-backdrop{transition:filter .35s ease;will-change:transform}',
    /* v56.9 parallax depth bands — a SKY wash on top + a GRASS/field wash on the
       bottom that blend into the stadium plate's own sky/field, so the cover-crop
       stops reading as a chopped photo ("terpotong2 cacat"). They parallax on
       lunge/hit for layered depth. Base plate is left untouched. z1 = over the
       plate (z0), under the fighters (z20). */
    '.ba-sky{position:fixed;top:-8px;left:-8px;right:-8px;height:44%;z-index:1;pointer-events:none;',
    'background:linear-gradient(180deg,#bfe3fb 0%,rgba(155,208,246,.6) 34%,rgba(160,210,246,.16) 70%,transparent 100%);',
    'transition:transform .5s cubic-bezier(.22,.9,.4,1);will-change:transform}',
    '.ba-fieldband{position:fixed;bottom:-8px;left:-8px;right:-8px;height:36%;z-index:1;pointer-events:none;',
    'background:linear-gradient(0deg,#4c8f33 0%,rgba(86,158,58,.62) 32%,rgba(126,182,74,.2) 68%,transparent 100%);',
    'transition:transform .5s cubic-bezier(.22,.9,.4,1);will-change:transform}',
    '.ba-drift{animation:baDrift 14s ease-in-out infinite alternate}',
    '@keyframes baDrift{from{transform:translate(-3px,0) scale(1.02)}to{transform:translate(3px,-2px) scale(1.02)}}',
    '.ba-fg{position:fixed;bottom:0;z-index:40;pointer-events:none;width:min(34vw,330px);',
    'transition:transform .45s cubic-bezier(.22,.9,.4,1);will-change:transform}',
    '.ba-fg-l{left:0}','.ba-fg-r{right:0}','.ba-fg img{display:block;width:100%;height:auto}',
    '.ba-mote{position:fixed;z-index:30;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.85);',
    'box-shadow:0 0 6px rgba(255,255,255,.8);pointer-events:none;animation:baMote linear infinite}',
    '@keyframes baMote{from{transform:translateY(-4vh)}to{transform:translateY(104vh)}}',
    '.ba-vs{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:55;background:rgba(30,32,40,.88);',
    'color:#fff;border-radius:12px;padding:5px 14px;font-size:13px;font-weight:900;letter-spacing:1.5px;',
    'box-shadow:0 4px 10px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.15);pointer-events:none}',
    '.ba-punch{transition:transform .28s cubic-bezier(.22,.9,.3,1);will-change:transform}',
    /* ── projectile orb + trail ── */
    '.ba-orb{position:fixed;width:26px;height:26px;border-radius:50%;z-index:9210;pointer-events:none;',
    'background:radial-gradient(circle at 35% 32%,#fff 0%,var(--ba-c,#fbbf24) 58%,var(--ba-c,#fbbf24) 100%);',
    'box-shadow:0 0 14px var(--ba-c,#fbbf24),0 0 30px var(--ba-c,#fbbf24),0 0 46px rgba(255,255,255,.35);',
    'transform:translate(-50%,-50%)}',
    '.ba-orb-trail{position:fixed;width:12px;height:12px;border-radius:50%;z-index:9209;pointer-events:none;',
    'background:var(--ba-c,#fbbf24);box-shadow:0 0 10px var(--ba-c,#fbbf24);opacity:.7;transform:translate(-50%,-50%);',
    'transition:opacity .3s ease,width .3s,height .3s}',
    /* A-339 P4 — TYPE-themed spinning projectile (grass=🍃, fire=🔥 …) attacker→defender */
    '.ba-proj{position:fixed;z-index:9211;pointer-events:none;font-size:34px;line-height:1;',
    'transform:translate(-50%,-50%) rotate(0deg);filter:drop-shadow(0 0 8px var(--ba-c,#fbbf24));',
    'animation:baProjSpin .5s linear infinite}',
    '@keyframes baProjSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}',
    /* A-339 P4 — WIND-UP charge: type-colored ring pulses + motes swirl around the',
       attacker for ~0.4s before it launches (video: "efek api mengitari badan"). */
    '.ba-charge{position:absolute;left:50%;top:50%;width:118%;height:118%;z-index:5;pointer-events:none;',
    'transform:translate(-50%,-50%);border-radius:50%;border:4px solid var(--ba-c,#fbbf24);',
    'border-right-color:transparent;border-bottom-color:transparent;',
    'box-shadow:0 0 22px var(--ba-c,#fbbf24),inset 0 0 18px var(--ba-c,#fbbf24);',
    'animation:baChargeSpin .5s linear infinite,baChargePulse .42s ease-out forwards}',
    '@keyframes baChargeSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}',
    '@keyframes baChargePulse{0%{opacity:0;width:150%;height:150%}30%{opacity:1}100%{opacity:.85;width:96%;height:96%}}',
    '.ba-charge-mote{position:fixed;z-index:9208;pointer-events:none;font-size:20px;line-height:1;',
    'transform:translate(-50%,-50%);filter:drop-shadow(0 0 6px var(--ba-c,#fbbf24));',
    'transition:left .4s ease-in,top .4s ease-in,opacity .4s ease-in,font-size .4s}',
    /* ── damage number pops ── */
    '.ba-dmg{position:fixed;z-index:9300;pointer-events:none;font-family:"Fredoka One",cursive,sans-serif;font-weight:900;',
    'line-height:1;transform:translate(-50%,-50%);animation:baDmgPop .95s cubic-bezier(.22,.9,.4,1) forwards;',
    'text-shadow:-2px 0 0 #fff,2px 0 0 #fff,0 -2px 0 #fff,0 2px 0 #fff,0 5px 12px rgba(0,0,0,.5)}',
    '.ba-dmg-main{font-size:clamp(38px,9vw,64px);color:#ff7a1a}',
    '.ba-dmg-super{font-size:clamp(46px,11vw,78px);color:#ff3b30}',
    '.ba-dmg-weak{font-size:clamp(28px,7vw,44px);color:#f6a23c}',
    '.ba-dmg-self{font-size:clamp(22px,5.6vw,32px);color:#ef4444}',
    '.ba-dmg-echo{font-size:clamp(20px,5vw,30px);color:#ffb066}',
    '.ba-dmg-sub{display:block;font-size:.34em;margin-top:4px;color:#fff;-webkit-text-stroke:0;',
    'text-shadow:0 2px 6px rgba(0,0,0,.65)}',
    '@keyframes baDmgPop{0%{transform:translate(-50%,-50%) scale(.35);opacity:0}',
    '16%{transform:translate(-50%,-58%) scale(1.18);opacity:1}',
    '30%{transform:translate(-50%,-62%) scale(1);opacity:1}',
    '78%{transform:translate(-50%,calc(-50% - 52px)) scale(1);opacity:.95}',
    '100%{transform:translate(-50%,calc(-50% - 74px)) scale(.9);opacity:0}}',
    /* ── skin classes for battle-modes (PvP/tournament) adoption ──
       Doubled selectors = (0,2,0) so they beat battle-modes' own single-class
       rules regardless of stylesheet order. Position/rotation untouched (P2
       card 180° rotation is an owner mandate — skin only). */
    '.ba-cardskin.ba-cardskin{background:rgba(255,255,255,.95);border:none;border-radius:16px;',
    'box-shadow:0 6px 18px rgba(0,0,0,.28),inset 0 1px 0 #fff;color:#1f2937}',
    '.ba-glass.ba-glass{background:rgba(255,255,255,.30);border:2px solid rgba(255,255,255,.75);color:#fff;',
    'text-shadow:0 2px 4px rgba(0,0,0,.45);border-radius:18px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
    'box-shadow:0 6px 16px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.55)}',
    /* v1.1.1 B-293 — question skin matched to the NEW Adventure look (cream
       digits + dark-brown outline) instead of the old warm glow; stroke scaled
       down for the smaller PvP-zone font. */
    '.ba-qskin.ba-qskin{color:#fff6df;font-weight:900;font-family:"Fredoka One",cursive,sans-serif;',
    '-webkit-text-stroke:2px #5b3a1e;paint-order:stroke fill;',
    'text-shadow:0 2px 0 #5b3a1e,0 4px 10px rgba(0,0,0,.4)}',
    '.ba-pillskin.ba-pillskin{background:rgba(255,255,255,.94);color:#1f2937;border-radius:999px;',
    'padding:8px 16px;box-shadow:0 5px 14px rgba(0,0,0,.28);display:inline-block}',
    /* ── reduced motion: kill decorative loops, keep state visible ── */
    '@media (prefers-reduced-motion: reduce){',
    '.ba-bob,.ba-knock-l,.ba-knock-r,.ba-hitflash,.ba-stumble,.ba-narrate-pop,.ba-aura,.ba-drift,.ba-mote,.ba-proj,.ba-charge,.ba-charge-mote{animation:none!important}',
    '.ba-fighter.ba-faint{transition:none}',
    '.ba-punch,.ba-fg{transition:none}',
    '.ba-dmg{animation-duration:.6s}}'
  ].join('')

  function injectCSS () {
    if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return
    var s = document.createElement('style')
    s.id = CSS_ID
    s.textContent = CSS
    ;(document.head || document.documentElement).appendChild(s)
  }

  function el (tag, cls, parent) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (parent) parent.appendChild(e)
    return e
  }
  function clamp01 (t) { return t < 0 ? 0 : (t > 1 ? 1 : t) }
  function easeOutCubic (t) { return 1 - Math.pow(1 - t, 3) }
  function typeColor (t) {
    return TYPE_COLOR[String(t || '').toLowerCase()] || '#fbbf24'
  }
  function centerOf (node) {
    var r = node.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }
  }

  // ── scene state ────────────────────────────────────────────────────────────
  var S = null // { host, backdrop, field, narrateEl, fighters:{player,enemy}, quiz, opts }

  // v1.1.0 A-319 — asset base: gym-pokemon lives under /games/, index at the root.
  function assetBase () {
    try { return location.pathname.indexOf('/games/') >= 0 ? '../' : '' } catch (_) { return '' }
  }

  function mountScene (hostEl, opts) {
    injectCSS()
    opts = opts || {}
    destroyScene()
    var host = hostEl || document.body
    // A-339 — the DEFAULT arena is a CLEAN, orientation-matched gym plate. The old
    // stadium-video.webp extraction was MUTILATED (baked seams + duplicated cloud
    // tiles + a mismatched right half); owner: "backdrop nggak boleh termutilasi,
    // harus perfect." These two plates are seamless (landscape 16:9 / portrait 9:16).
    var usingDefault = !opts.bg
    function pickCleanBg () {
      var land = (window.innerWidth || 0) >= (window.innerHeight || 1)
      return assetBase() + 'assets/background/gym/' + (land ? 'g13c-bg-gym-p.webp' : 'g13c-bg-gym2-m.webp')
    }
    var bgUrl = opts.bg || pickCleanBg()
    var backdrop = el('div', 'ba-backdrop' + (REDUCED ? '' : ' ba-drift'), host)
    backdrop.style.cssText = 'position:fixed;inset:-8px;z-index:0;background-size:cover;background-position:center;' +
      'background-image:url("' + bgUrl + '")'
    // Clean plates are self-framed (baked sky + trees + field), so the masking
    // sky/field bands + flower foreground — which ONLY existed to hide the old
    // plate's chopped crop — are skipped for the default (kept for themed bg).
    var sky = null, fieldBand = null
    if (opts.depthBands !== false && !usingDefault) {
      sky = el('div', 'ba-sky', host)
      fieldBand = el('div', 'ba-fieldband', host)
    }
    var field = el('div', 'ba-field ba-punch', host)
    if (opts.ground) field.style.setProperty('--ba-ground', opts.ground)
    var fgL = null, fgR = null
    if (opts.foreground !== false && !usingDefault) {
      fgL = el('div', 'ba-fg ba-fg-l', host)
      fgL.innerHTML = '<img alt="" src="' + assetBase() + 'assets/background/gym/stadium-fg-left.webp">'
      fgR = el('div', 'ba-fg ba-fg-r', host)
      fgR.innerHTML = '<img alt="" src="' + assetBase() + 'assets/background/gym/stadium-fg-right.webp">'
    }
    // slow-falling sparkle motes (≤8; pure CSS animation; off under reduced motion)
    var motes = []
    if (!REDUCED && opts.motes !== false) {
      for (var mi = 0; mi < 8; mi++) {
        var m = el('div', 'ba-mote', host)
        m.style.left = (6 + (mi * 12.3) % 88) + 'vw'
        m.style.animationDuration = (9 + (mi % 4) * 3) + 's'
        m.style.animationDelay = (-mi * 2.1) + 's'
        m.style.opacity = String(0.35 + (mi % 3) * 0.2)
        motes.push(m)
      }
    }
    var vsChip = null
    if (opts.vs !== false) { vsChip = el('div', 'ba-vs', host); vsChip.textContent = opts.vsText || 'VS' }
    var narrateEl = el('div', 'ba-narrate ba-hidden', host)
    if (opts.narrateBottom) narrateEl.style.setProperty('--ba-narrate-bottom', opts.narrateBottom)
    if (typeof opts.onNarrateTap === 'function') {
      narrateEl.addEventListener('click', function () { try { opts.onNarrateTap() } catch (_) {} })
    }
    S = {
      host: host,
      backdrop: backdrop,
      sky: sky,
      fieldBand: fieldBand,
      field: field,
      fgL: fgL,
      fgR: fgR,
      motes: motes,
      vsChip: vsChip,
      narrateEl: narrateEl,
      fighters: { player: null, enemy: null },
      quiz: null,
      aura: null,
      opts: opts,
      raf: []
    }
    // A-339 — re-pick the orientation-matched clean plate when the device rotates
    // (A-325: the PWA follows rotation), so the backdrop stays perfect either way.
    if (usingDefault) {
      S._bgResize = function () { if (S && S.backdrop) S.backdrop.style.backgroundImage = 'url("' + pickCleanBg() + '")' }
      try { window.addEventListener('resize', S._bgResize) } catch (_) {}
    }
    return S
  }

  // v1.1.0 A-319 — depth-of-field: static blur on the (static) backdrop only — cheap.
  function setDof (px) {
    if (!S || !S.backdrop) return
    S.backdrop.style.filter = px > 0 ? ('blur(' + px + 'px) brightness(1.05)') : ''
  }

  // v1.1.0 A-319 — parallax kick: bg shifts OPPOSITE the action, foreground WITH it,
  // amplified — visible layer separation (transform-only; springs back via CSS transition).
  function parallaxKick (dirX) {
    if (!S || REDUCED) return
    var d = dirX < 0 ? -1 : 1
    if (S.backdrop) S.backdrop.style.transform = 'translate(' + (-d * 6) + 'px,0) scale(1.02)'
    // v56.9 layered parallax: sky drifts least (far), field band more, fg corners most.
    if (S.sky) S.sky.style.transform = 'translate(' + (-d * 3) + 'px,0)'
    if (S.fieldBand) S.fieldBand.style.transform = 'translate(' + (d * 8) + 'px,0)'
    if (S.fgL) S.fgL.style.transform = 'translate(' + (d * 12) + 'px,0)'
    if (S.fgR) S.fgR.style.transform = 'translate(' + (d * 12) + 'px,0)'
    setTimeout(function () {
      if (!S) return
      if (S.backdrop) S.backdrop.style.transform = ''
      if (S.sky) S.sky.style.transform = ''
      if (S.fieldBand) S.fieldBand.style.transform = ''
      if (S.fgL) S.fgL.style.transform = ''
      if (S.fgR) S.fgR.style.transform = ''
    }, 460)
  }

  // v1.1.0 A-319 (f29) — camera PUNCH-IN toward the hit fighter: field scales ~1.35 at
  // the fighter's screen position, holds, eases back; bg blurs during the close-up.
  function punchIn (side) {
    if (!S || REDUCED || !S.fighters[side]) return
    var c = centerOf(S.fighters[side].img)
    var f = S.field
    f.style.transformOrigin = c.x + 'px ' + c.y + 'px'
    f.style.transform = 'scale(1.35)'
    setDof(4)
    setTimeout(function () {
      if (!S) return
      S.field.style.transform = ''
      setDof(S.quiz ? 2 : 0)
    }, 900)
  }

  // v1.1.1 B-293 — hide/show the whole mounted Adventure scene without tearing
  // it down: battle-modes (PvP/Tournament) calls setSceneVisible(false) when its
  // own full-screen root mounts so the scene's fixed layers stop animating/
  // painting underneath (throttled-tablet perf) and can never bleed through,
  // then setSceneVisible(true) on teardown — Adventure resumes untouched.
  function setSceneVisible (visible) {
    if (!S) return
    if (!visible && S.quiz) closeQuiz()
    var d = visible ? '' : 'none'
    var els = [S.backdrop, S.sky, S.fieldBand, S.field, S.fgL, S.fgR, S.vsChip, S.narrateEl]
    ;['player', 'enemy'].forEach(function (side) {
      var f = S.fighters[side]
      if (f) els.push(f.card)
    })
    if (S.motes) els = els.concat(S.motes)
    for (var i = 0; i < els.length; i++) {
      if (els[i]) els[i].style.display = d
    }
  }

  function setBackdrop (url) {
    if (!S) return
    if (!S.backdrop) {
      S.backdrop = el('div', 'ba-backdrop', S.host)
      S.backdrop.style.cssText = 'position:fixed;inset:0;z-index:0;background-size:cover;background-position:center;'
    }
    S.backdrop.style.backgroundImage = 'url("' + url + '")'
  }

  // ── fighters + cards ───────────────────────────────────────────────────────
  function buildCard (side) {
    var card = el('div', 'ba-card ba-card-' + side, S.host)
    if (S.opts.cardTop) card.style.setProperty('--ba-card-top', S.opts.cardTop)
    card.innerHTML =
      '<div class="ba-card-name"></div>' +
      '<div class="ba-chips"><span class="ba-chip ba-chip-type"></span><span class="ba-chip ba-chip-lv"></span></div>' +
      '<div class="ba-hp-row"><span class="ba-hp-lbl">HP</span>' +
      '<div class="ba-hp-track"><div class="ba-hp-trail"></div><div class="ba-hp-fill"></div></div></div>' +
      '<div class="ba-hp-text"></div>' +
      '<div class="ba-dots"></div>' +
      '<div class="ba-card-extra"></div>'
    return card
  }

  function setFighter (side, opts) {
    if (!S) return null
    opts = opts || {}
    var f = S.fighters[side]
    if (!f) {
      var wrap = el('div', 'ba-fighter ba-fighter-' + side, S.field)
      var bob = el('div', 'ba-bob', wrap)
      var img = el('img', 'ba-sprite ba-outline', bob)
      img.alt = ''
      if (opts.id) img.id = opts.id
      f = S.fighters[side] = {
        wrap: wrap, bob: bob, img: img,
        card: buildCard(side),
        hpAnim: null, hpShown: null
      }
    }
    if (opts.imgUrl) f.img.src = opts.imgUrl
    updateHP(side, opts)
    return f
  }

  function hpClass (pct) { return pct > 50 ? '' : (pct > 20 ? 'ba-hp-med' : 'ba-hp-low') }

  function updateHP (side, data) {
    if (!S || !S.fighters[side]) return
    data = data || {}
    var f = S.fighters[side]
    var card = f.card
    if (data.name != null) card.querySelector('.ba-card-name').textContent = data.name
    var type = data.type || (data.types && data.types[0])
    if (type != null) {
      var chip = card.querySelector('.ba-chip-type')
      chip.textContent = type
      chip.style.background = typeColor(type)
      chip.style.display = ''
    }
    var lvChip = card.querySelector('.ba-chip-lv')
    if (data.level != null) { lvChip.textContent = 'Lv ' + data.level; lvChip.style.display = '' }
    else if (!lvChip.textContent) lvChip.style.display = 'none'
    if (data.team) {
      card.querySelector('.ba-dots').innerHTML = data.team.map(function (p) {
        var down = p && (p.fainted || (typeof p.hp === 'number' && p.hp <= 0))
        return '<div class="ba-dot' + (down ? ' ba-fainted' : '') + '"></div>'
      }).join('')
    }
    if (typeof data.hp === 'number' && typeof data.maxHp === 'number' && data.maxHp > 0) {
      tweenHP(f, Math.max(0, data.hp), data.maxHp)
    }
  }

  function tweenHP (f, hp, maxHp) {
    var fill = f.card.querySelector('.ba-hp-fill')
    var txt = f.card.querySelector('.ba-hp-text')
    if (f.hpShown == null || REDUCED) {
      f.hpShown = hp
      fill.style.width = (hp / maxHp * 100) + '%'
      var tr0 = f.card.querySelector('.ba-hp-trail'); if (tr0) tr0.style.width = (hp / maxHp * 100) + '%'
      fill.className = 'ba-hp-fill ' + hpClass(hp / maxHp * 100)
      txt.textContent = hp + '/' + maxHp
      return
    }
    if (f.hpAnim) cancelAnimationFrame(f.hpAnim)
    var trail = f.card.querySelector('.ba-hp-trail')
    if (trail && hp < f.hpShown) {   // damage: the white trail holds the old value, then drains down behind the bar
      clearTimeout(f.trailT)
      trail.style.transition = 'none'
      trail.style.width = (f.hpShown / maxHp * 100) + '%'
      f.trailT = setTimeout(function () { trail.style.transition = 'width .55s cubic-bezier(.4,0,.2,1)'; trail.style.width = (hp / maxHp * 100) + '%' }, 420)
    } else if (trail) { trail.style.transition = 'none'; trail.style.width = (hp / maxHp * 100) + '%' }
    var last = performance.now()
    function step (now) {
      var dt = Math.min((now - last) / 1000, 0.05) // dt-clamp (throttled tablets)
      last = now
      // frame-rate independent exponential decay toward target
      f.hpShown = hp + (f.hpShown - hp) * Math.exp(-9 * dt)
      if (Math.abs(f.hpShown - hp) < 0.4) f.hpShown = hp
      var pct = f.hpShown / maxHp * 100
      fill.style.width = pct + '%'
      fill.className = 'ba-hp-fill ' + hpClass(pct)
      txt.textContent = Math.round(f.hpShown) + '/' + maxHp
      if (f.hpShown !== hp) f.hpAnim = requestAnimationFrame(step)
      else f.hpAnim = null
    }
    f.hpAnim = requestAnimationFrame(step)
  }

  function cardExtra (side) {
    if (!S || !S.fighters[side]) return null
    return S.fighters[side].card.querySelector('.ba-card-extra')
  }
  function fighterImg (side) {
    return (S && S.fighters[side]) ? S.fighters[side].img : null
  }

  // ── narration pill ─────────────────────────────────────────────────────────
  function narrate (text) {
    if (!S) return
    var n = S.narrateEl
    if (!text) { n.classList.add('ba-hidden'); return }
    n.textContent = text
    n.classList.remove('ba-hidden')
    n.classList.remove('ba-narrate-pop')
    void n.offsetWidth
    n.classList.add('ba-narrate-pop')
  }
  function narrateHide () { if (S) S.narrateEl.classList.add('ba-hidden') }

  // ── quiz (wraps the SHARED QuizEngine — M-303: no fork) ───────────────────
  function showQuiz (opts, cb) {
    if (!S || !global.QuizEngine) { if (cb) cb(null); return null }
    closeQuiz()
    opts = opts || {}
    var ov = el('div', 'ba-quiz', S.host)
    var center = el('div', 'ba-quiz-center', ov)
    if (opts.label) {
      var lab = el('div', 'ba-quiz-label', center)
      lab.textContent = opts.label
    }
    var qEl = el('div', '', center)
    var cEl = el('div', '', ov)
    S.quiz = ov
    // v1.1.0 A-319 (f12/f19): depth-of-field on the backdrop while the quiz/close-up is
    // open + an orange energy AURA behind the attacker (defaults to the player).
    setDof(2)
    var auraSide = (opts.auraSide === false) ? null : (opts.auraSide || 'player')
    if (auraSide && S.fighters[auraSide] && !REDUCED) {
      S.aura = el('div', 'ba-aura', S.fighters[auraSide].wrap)
    }
    global.QuizEngine.fill(qEl, cEl, opts, function (res) {
      // brief hold so the kid SEES the green ✓ ring before the scene moves on (f24)
      setTimeout(function () { closeQuiz(); if (cb) cb(res) }, 60)
    })
    return { close: closeQuiz }
  }
  function closeQuiz () {
    if (S && S.quiz) { try { S.quiz.remove() } catch (_) {} S.quiz = null }
    if (S && S.aura) { try { S.aura.remove() } catch (_) {} S.aura = null }
    setDof(0)
  }

  // A-339 P4 — type → projectile emoji (owner: "razor leaf = daun berputar dari
  // penyerang ke yang diserang"). Used by orbFly + the wind-up charge.
  var BA_TYPE_EMOJI = {
    fire: '🔥', water: '💧', grass: '🍃', electric: '⚡', psychic: '🔮', ghost: '👻',
    ice: '❄️', dragon: '🐉', dark: '🌑', fighting: '👊', rock: '🪨', poison: '☠️',
    steel: '⚔️', bug: '🐛', fairy: '✨', flying: '🌪️', ground: '💨', normal: '💥'
  }
  function baTypeEmoji (type) { return BA_TYPE_EMOJI[type] || null }

  // ── attack: lunge + projectile (type-themed spinning emoji, or glowing orb) ──
  function orbFly (fromEl, toEl, opts, onHit) {
    opts = opts || {}
    var color = opts.color || '#fbbf24'
    if (REDUCED || !fromEl || !toEl) {
      setTimeout(function () { if (onHit) onHit() }, 60)
      return
    }
    var a = centerOf(fromEl)
    var b = centerOf(toEl)
    // A-355 — layer the real "lempar api" particle projectile alongside the emoji
    // orb, attacker→defender, type-matched (visual-only; onHit still fires below).
    var libFly = false
    try {
      // VFX library: type-unique projectile head + trail + impact (lands at `dur`, same as the orb)
      if (global.VFX && global.VFX.Poke && opts.type && global.VFX.Poke.ready()) {
        libFly = global.VFX.Poke.launch(opts.type, fromEl, toEl, { duration: opts.duration || 300, size: 70, superEff: !!opts.superEff, crit: !!opts.crit, arena: (document.querySelector('.ba-field') || {}).parentNode })
      }
    } catch (_) {}
    try {
      if (!libFly && global.VFX && opts.type) {
        global.VFX.domProjectile({ x: a.x, y: a.y }, { x: b.x, y: b.y },
          { fx: global.VFX.typeFx(opts.type).proj, size: 76, duration: opts.duration || 300 })
      }
    } catch (_) {}
    // A-339 P4 — if a type/emoji is given, fly N spinning type-emoji particles
    // (leaves/embers/…) instead of the generic orb. Falls back to the orb.
    var emoji = null   // owner: no emoji projectile — library sprite, else the glowing CSS orb
    var orb, motes = []
    if (emoji) {
      orb = el('div', 'ba-proj', document.body)
      orb.textContent = emoji
      orb.style.setProperty('--ba-c', color)
      // two smaller companion particles for a fuller "spread" of the attack
      for (var m = 0; m < 2; m++) {
        var mo = el('div', 'ba-proj', document.body)
        mo.textContent = emoji
        mo.style.setProperty('--ba-c', color)
        mo.style.fontSize = '22px'
        mo.style.opacity = '0.85'
        motes.push({ el: mo, off: (m === 0 ? -18 : 18), ph: (m === 0 ? 0.5 : 1.4) })
      }
    } else {
      orb = el('div', 'ba-orb', document.body)
      orb.style.setProperty('--ba-c', color)
      if (libFly) orb.style.display = 'none'   // library sprite is the visible projectile
    }
    var dur = opts.duration || 300
    var start = performance.now()
    var lastTrail = 0
    // The caller's move-lock is released by onHit, and onHit only runs when this
    // rAF chain reaches t >= 1. So any way this chain can stop early -- a throw
    // inside step, or rAF never resuming after the screen sleeps mid-strike --
    // leaves `battle._moveLock` true and EVERY move button disabled for good:
    // a frozen battle that still looks alive. Guarantee the ending instead of
    // hoping for it. finish() is idempotent, so the normal path is unchanged.
    var done = false
    function finish () {
      if (done) return
      done = true
      clearTimeout(deadline)
      try { orb.remove() } catch (_) {}
      motes.forEach(function (mm) { try { mm.el.remove() } catch (_) {} })
      if (onHit) onHit()
    }
    var deadline = setTimeout(finish, dur + 600)
    function step (now) {
      if (done) return
      var t = clamp01((now - start) / dur)
      var e = easeOutCubic(t)
      var x = a.x + (b.x - a.x) * e
      var y = a.y + (b.y - a.y) * e - Math.sin(t * Math.PI) * 26 // gentle arc
      orb.style.left = x + 'px'
      orb.style.top = y + 'px'
      for (var i = 0; i < motes.length; i++) {
        motes[i].el.style.left = (x + motes[i].off * (1 - t)) + 'px'
        motes[i].el.style.top = (y + Math.sin(t * Math.PI * 2 + motes[i].ph) * 12) + 'px'
      }
      if (!emoji && !libFly && now - lastTrail > 42) { // orb trail dot (emoji leaves its own spin trail)
        lastTrail = now
        var d = el('div', 'ba-orb-trail', document.body)
        d.style.setProperty('--ba-c', color)
        d.style.left = x + 'px'
        d.style.top = y + 'px'
        requestAnimationFrame(function () { d.style.opacity = '0'; d.style.width = '4px'; d.style.height = '4px' })
        setTimeout(function () { try { d.remove() } catch (_) {} }, 340)
      }
      if (t < 1) requestAnimationFrame(safeStep)
      else finish()
    }
    // A throw anywhere in step() would silently kill the chain and strand the
    // lock, so the chain never runs unguarded.
    function safeStep (now) {
      try { step(now) } catch (e) { console.warn('[battle-arena] orbFly step failed', e); finish() }
    }
    requestAnimationFrame(safeStep)
  }

  // A-339 P4 — WIND-UP: swirl a type-colored charge ring + a few type-emoji motes
  // around the attacker for ~0.4s, THEN call done() to launch (video's "charge"
  // beat before the projectile). No-op under reduced motion.
  function chargeUp (fighter, opts, done) {
    opts = opts || {}
    if (REDUCED || !fighter || !fighter.wrap) { if (done) done(); return }
    var color = opts.color || '#fbbf24'
    var ring = el('div', 'ba-charge', fighter.wrap)
    ring.style.setProperty('--ba-c', color)
    // A-355 — layer the real particle AURA ("api berputar") on the body during
    // wind-up, on top of the emoji ring/motes. Type-matched, visual-only.
    var _vfxAura = null, _libAura = false
    try {
      if (global.VFX && global.VFX.Poke && fighter.img && opts.type && global.VFX.Poke.windup(opts.type, fighter.img, { duration: 420 })) {
        _libAura = true
      } else if (global.VFX && fighter.img) {
        _vfxAura = global.VFX.domAura(fighter.img, { fx: global.VFX.typeFx(opts.type).aura, duration: 420, scale: 1.35 })
      }
    } catch (_) {}
    var emoji = null
    var motes = []
    if (emoji) {
      var c = centerOf(fighter.img)
      for (var i = 0; i < 5; i++) {
        var mo = el('div', 'ba-charge-mote', document.body)
        mo.textContent = emoji
        mo.style.setProperty('--ba-c', color)
        var ang = (i / 5) * Math.PI * 2
        mo.style.left = (c.x + Math.cos(ang) * 46) + 'px'
        mo.style.top = (c.y + Math.sin(ang) * 46) + 'px'
        mo.style.opacity = '0'
        motes.push({ el: mo, cx: c.x, cy: c.y })
        // pull each mote inward toward the body (converging charge)
        ;(function (el2, cx, cy) {
          requestAnimationFrame(function () { requestAnimationFrame(function () {
            el2.style.opacity = '1'; el2.style.left = cx + 'px'; el2.style.top = cy + 'px'; el2.style.fontSize = '13px'
          }) })
        })(mo, c.x, c.y)
      }
    }
    setTimeout(function () {
      try { ring.remove() } catch (_) {}
      try { if (_vfxAura && _vfxAura.stop) _vfxAura.stop() } catch (_) {}
      motes.forEach(function (mm) { try { mm.el.remove() } catch (_) {} })
      if (done) done()
    }, 400)
  }

  function hitReact (side, opts) {
    if (!S || !S.fighters[side]) return
    opts = opts || {}
    var f = S.fighters[side]
    var dir = side === 'enemy' ? 'r' : 'l' // knock away from the center
    var combo = comboStep(side)
    crunch(combo, !!opts.superEff)
    if (REDUCED) { punchIn(side); return }
    f.wrap.classList.remove('ba-knock-l', 'ba-knock-r', 'ba-knock2-l', 'ba-knock2-r')
    f.img.classList.remove('ba-hitflash', 'ba-white')
    f.bob.classList.remove('ba-squash')
    void f.wrap.offsetWidth
    // impact frame: the target blinks pure white and squashes, and holds there (hitstop) before it is shoved back
    f.img.classList.add('ba-white')
    f.bob.classList.add('ba-squash')
    slashAt(f.img, opts.color || '#ffffff', side)
    var hold = opts.superEff ? 110 : 75
    clearTimeout(f.hitT); clearTimeout(f.hitT2)
    f.hitT = setTimeout(function () {
      f.img.classList.remove('ba-white')
      f.bob.classList.remove('ba-squash')
      f.wrap.classList.add('ba-knock2-' + dir)
      f.img.classList.add('ba-hitflash')
      punchIn(side)                                  // v1.1.0 A-319 (f29) camera close-up
      parallaxKick(side === 'enemy' ? 1 : -1)        // layers separate on the impact
      f.hitT2 = setTimeout(function () {
        f.wrap.classList.remove('ba-knock2-' + dir)
        f.img.classList.remove('ba-hitflash')
      }, 460)
    }, hold)
  }

  // hits on the same side within 3 s climb the crunch's pitch (owner's video: "climb the pitch with every hit in a row")
  var COMBO = { side: null, n: 0, t: 0 }
  function comboStep (side) {
    var now = Date.now()
    if (COMBO.side === side && now - COMBO.t < 3000) COMBO.n++
    else { COMBO.side = side; COMBO.n = 1 }
    COMBO.t = now
    return COMBO.n
  }
  var ACX = null
  function crunch (combo, heavy) {
    try {
      var SE = global.SFXEngine
      if (SE && SE._state && SE._state.muted) return
      var AC = global.AudioContext || global.webkitAudioContext
      if (!AC) return
      if (!ACX) ACX = new AC()
      if (ACX.state === 'suspended') ACX.resume()
      var t = ACX.currentTime, rate = Math.pow(1.12, Math.min(6, combo - 1))
      var len = Math.floor(ACX.sampleRate * 0.16), buf = ACX.createBuffer(1, len, ACX.sampleRate), d = buf.getChannelData(0)
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
      var src = ACX.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate
      var bp = ACX.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400 * rate; bp.Q.value = 0.9
      var g = ACX.createGain(); g.gain.setValueAtTime(heavy ? 0.5 : 0.36, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
      src.connect(bp); bp.connect(g); g.connect(ACX.destination); src.start(t)
      var o = ACX.createOscillator(), og = ACX.createGain()   // the thump under the crunch
      o.type = 'sine'; o.frequency.setValueAtTime(150 * rate, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.14)
      og.gain.setValueAtTime(heavy ? 0.55 : 0.4, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
      o.connect(og); og.connect(ACX.destination); o.start(t); o.stop(t + 0.16)
    } catch (_) {}
  }

  // a bright slash arc across the target, and sparks bursting off it
  function slashAt (img, color, side) {
    var c = centerOf(img)
    if (c.w < 4) return
    var sz = Math.max(90, Math.min(220, c.w * 1.1)), ns = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('class', 'ba-slash'); svg.setAttribute('viewBox', '0 0 100 100')
    svg.style.cssText = 'left:' + (c.x - sz / 2) + 'px;top:' + (c.y - sz / 2) + 'px;width:' + sz + 'px;height:' + sz + 'px'
    var d = side === 'enemy' ? 'M14 30 Q52 66 88 74' : 'M86 30 Q48 66 12 74'
    ;[[11, color, 0.55], [5, '#ffffff', 1]].forEach(function (L) {
      var pth = document.createElementNS(ns, 'path')
      pth.setAttribute('d', d); pth.setAttribute('pathLength', '1')
      pth.setAttribute('stroke', L[1]); pth.setAttribute('stroke-width', L[0]); pth.style.opacity = L[2]
      svg.appendChild(pth)
    })
    document.body.appendChild(svg)
    setTimeout(function () { try { svg.remove() } catch (_) {} }, 360)
    for (var i = 0; i < 9; i++) {
      var sp = el('div', 'ba-spark', document.body), a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 60
      sp.style.background = i % 3 ? '#fff7cc' : color
      sp.style.left = c.x + 'px'; sp.style.top = c.y + 'px'
      sp.animate([{ transform: 'translate(-50%,-50%) rotate(' + (a * 57.3 + 90) + 'deg) scale(1)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + Math.cos(a) * r + 'px),calc(-50% + ' + Math.sin(a) * r + 'px)) rotate(' + (a * 57.3 + 90) + 'deg) scale(.2)', opacity: 0 }],
      { duration: 320 + Math.random() * 160, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'forwards' })
      ;(function (sp) { setTimeout(function () { try { sp.remove() } catch (_) {} }, 520) })(sp)
    }
  }

  function attack (fromSide, opts, onHit) {
    if (!S) { if (onHit) onHit(); return }
    opts = opts || {}
    var toSide = fromSide === 'player' ? 'enemy' : 'player'
    var atk = S.fighters[fromSide]
    var tgt = S.fighters[toSide]
    if (!atk || !tgt) { if (onHit) onHit(); return }
    function land () {
      hitReact(toSide, opts)
      if (onHit) onHit()
    }
    try { if (global.VFX && global.VFX.Poke && opts.type) global.VFX.Poke.prime([opts.type]) } catch (_) {}
    if (REDUCED) {
      try { if (global.VFX && global.VFX.Poke && opts.type) global.VFX.Poke.impact(opts.type, tgt.img, { superEff: !!opts.superEff }) } catch (_) {}
      setTimeout(land, 60); return
    }
    // A-339 P4 — WIND-UP charge first (type aura swirls around the attacker ~0.4s),
    // THEN the lunge + projectile launch. Matches the reference video's attack beat.
    chargeUp(atk, opts, function () { doLunge() })
    function doLunge () {
    // lunge: parametric out-and-back toward the target, ease-out, ~250ms out
    var A = centerOf(atk.img)
    var B = centerOf(tgt.img)
    var dx = B.x - A.x
    var dy = B.y - A.y
    var len = Math.sqrt(dx * dx + dy * dy) || 1
    var dist = Math.min(64, len * 0.16)
    var ux = dx / len * dist
    var uy = dy / len * dist * 0.35
    parallaxKick(dx >= 0 ? 1 : -1)   // v1.1.0 A-319 — layers separate on the lunge
    var OUT = 250
    var BACK = 230
    var start = performance.now()
    var fired = false
    function step (now) {
      var elapsed = now - start
      var k
      if (elapsed <= OUT) k = easeOutCubic(clamp01(elapsed / OUT))
      else k = 1 - easeOutCubic(clamp01((elapsed - OUT) / BACK))
      var sc = 1 + 0.06 * k
      atk.wrap.style.transform = 'translate(' + (ux * k) + 'px,' + (uy * k) + 'px) scale(' + sc + ')'
      if (!fired && elapsed >= OUT * 0.72) {
        fired = true
        orbFly(atk.img, tgt.img, opts, land)
      }
      if (elapsed < OUT + BACK) requestAnimationFrame(step)
      else atk.wrap.style.transform = ''
    }
    requestAnimationFrame(step)
    } // end doLunge (A-339 P4)
  }

  function stumble (side) {
    if (!S || !S.fighters[side] || REDUCED) return
    var w = S.fighters[side].wrap
    w.classList.remove('ba-stumble')
    void w.offsetWidth
    w.classList.add('ba-stumble')
    setTimeout(function () { w.classList.remove('ba-stumble') }, 500)
  }

  // ── damage number pops ─────────────────────────────────────────────────────
  function damagePopAt (x, y, amount, opts) {
    injectCSS()
    opts = opts || {}
    var mult = (typeof opts.mult === 'number') ? opts.mult : 1
    var cls = opts.self || opts.small ? 'ba-dmg-self'
      : mult >= 1.5 ? 'ba-dmg-super'
        : mult <= 0.75 ? 'ba-dmg-weak' : 'ba-dmg-main'
    var main = el('div', 'ba-dmg ' + cls, document.body)
    main.style.left = x + 'px'
    main.style.top = y + 'px'
    var html = '-' + amount
    if (opts.sub) html += '<span class="ba-dmg-sub">' + opts.sub + '</span>'
    if (typeof opts.timeMult === 'number' && opts.timeMult > 1.01) {
      html += '<span class="ba-dmg-sub">⚡ ×' + opts.timeMult.toFixed(2) + ' cepat</span>'
    }
    main.innerHTML = html
    setTimeout(function () { try { main.remove() } catch (_) {} }, 1100)
    // staggered smaller echo pops around the target (skipped for small/self pops
    // and under reduced motion — keeps element count low on throttled tablets)
    if (!opts.self && !opts.small && !REDUCED && amount >= 10) {
      var n = mult >= 1.5 ? 2 : 1
      for (var i = 0; i < n; i++) {
        ;(function (i) {
          setTimeout(function () {
            var e = el('div', 'ba-dmg ba-dmg-echo', document.body)
            e.style.left = (x + (i === 0 ? -1 : 1) * (34 + Math.random() * 22)) + 'px'
            e.style.top = (y + (Math.random() - 0.6) * 46) + 'px'
            e.textContent = '-' + amount
            setTimeout(function () { try { e.remove() } catch (_) {} }, 1050)
          }, 120 + i * 130)
        })(i)
      }
    }
  }

  function damagePop (side, amount, opts) {
    if (!S || !S.fighters[side]) return
    var c = centerOf(S.fighters[side].img)
    damagePopAt(c.x + (Math.random() - 0.5) * 30, c.y - c.h * 0.18, amount, opts)
  }

  // ── faint / revive ─────────────────────────────────────────────────────────
  function faintDrop (side) {
    if (!S || !S.fighters[side]) return
    var f = S.fighters[side]
    // A-353 — the fainting Pokémon "meledak dulu": a boom burst over its sprite
    // BEFORE the drop pose settles (visual only — battle state is untouched).
    try {
      if (global.ExplosionFX && f.img) {
        var c = centerOf(f.img)
        global.ExplosionFX.dom(c.x, c.y - c.h * 0.12, { variant: 'boom', size: Math.max(96, c.w * 0.9) })
      }
    } catch (_) {}
    if (!REDUCED) shatter(f, side)
    f.wrap.style.transform = ''
    f.wrap.classList.add('ba-faint')
  }
  // the finisher: the knocked-out sprite breaks into pieces that fly apart; a combo of 3+ adds "xN CRIT!"
  function shatter (f, side) {
    try {
      var r = f.img.getBoundingClientRect(), src = f.img.currentSrc || f.img.src
      if (r.width < 8 || !src) return
      var N = 4, M = 3, w = r.width / N, h = r.height / M
      for (var i = 0; i < N; i++) for (var j = 0; j < M; j++) {
        var sh = el('div', 'ba-shard', document.body)
        sh.style.cssText = 'left:' + (r.left + i * w) + 'px;top:' + (r.top + j * h) + 'px;width:' + w + 'px;height:' + h + 'px;' +
          'background-image:url("' + src.replace(/"/g, '%22') + '");background-size:' + r.width + 'px ' + r.height + 'px;background-position:' + (-i * w) + 'px ' + (-j * h) + 'px'
        var vx = (i - (N - 1) / 2) * 38 + (Math.random() - 0.5) * 30 + (side === 'enemy' ? 30 : -30), vy = -40 - Math.random() * 60
        sh.animate([{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + vx + 'px,' + (vy * 0.4) + 'px) rotate(' + (vx * 0.6) + 'deg)', opacity: 1, offset: 0.45 },
          { transform: 'translate(' + (vx * 1.5) + 'px,' + (90 + j * 20) + 'px) rotate(' + (vx * 1.4) + 'deg)', opacity: 0 }],
        { duration: 700 + Math.random() * 200, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' })
        ;(function (sh) { setTimeout(function () { try { sh.remove() } catch (_) {} }, 950) })(sh)
      }
      if (COMBO.side === side && COMBO.n >= 3) {
        var c = centerOf(f.img), lab = el('div', 'ba-crit', document.body)
        lab.textContent = '\u00d7' + COMBO.n + ' CRIT!'
        lab.style.left = c.x + 'px'; lab.style.top = (c.y - c.h * 0.55) + 'px'
        setTimeout(function () { try { lab.remove() } catch (_) {} }, 950)
      }
    } catch (_) {}
  }
  // ── summon (owner 2026-10-17: "pokemon baru tidak tiba-tiba muncul ... ada VFX summon dulu lalu overlay keluar") ──
  // recall the old fighter (white, shrinks to a point) -> magic circle + flash from the VFX library -> the new one
  // grows out of a white silhouette into colour -> done() (the caller shows its message only then).
  // swap() is the caller's sprite change; it runs while the fighter is invisible.
  var SUMMON_VFX = ['px-magicspell', 'px-sunburn']
  function summon (side, opts, swap, done) {
    opts = opts || {}
    var f = S && S.fighters[side]
    var fin = function () { if (done) { var d = done; done = null; try { d() } catch (_) {} } }
    if (!f || REDUCED) { try { if (swap) swap() } catch (_) {} setTimeout(fin, REDUCED ? 120 : 0); return }
    var tok = f.summonTok = (f.summonTok || 0) + 1
    var live = function () { return S && S.fighters[side] === f && f.summonTok === tok }
    var fainted = f.wrap.classList.contains('ba-faint') || !(f.img.currentSrc || f.img.src)
    var bob = f.bob
    function anim (k, d, ease) { try { return bob.animate(k, { duration: d, easing: ease || 'ease', fill: 'forwards' }) } catch (_) { return null } }
    function swapNow () {
      if (!live()) return fin()
      f.wrap.style.transition = 'none'
      bob.style.opacity = '0'
      try { if (swap) swap() } catch (_) {}
      void f.wrap.offsetWidth
      f.wrap.style.transition = ''
      var c = centerOf(f.wrap)
      try {
        if (global.VFX && global.VFX.play) global.VFX.play(SUMMON_VFX[side === 'enemy' ? 1 : 0], { x: c.x, y: c.y + c.h * 0.1, size: Math.max(140, c.w * 1.5), vis: true, essential: true, z: 57 })
      } catch (_) {}
      var fl = el('div', '', document.body)   // the white flash the new fighter steps out of
      fl.style.cssText = 'position:fixed;z-index:58;pointer-events:none;border-radius:50%;left:' + c.x + 'px;top:' + c.y + 'px;width:' + Math.max(80, c.w) + 'px;height:' + Math.max(80, c.w) + 'px;' +
        'background:radial-gradient(circle,#fff 0,rgba(255,255,255,.85) 30%,rgba(255,255,255,0) 70%);transform:translate(-50%,-50%) scale(.2);opacity:0'
      try { fl.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 1, offset: 0.4 }, { transform: 'translate(-50%,-50%) scale(1.8)', opacity: 0 }], { duration: 520, easing: 'ease-out', fill: 'forwards' }) } catch (_) {}
      setTimeout(function () { try { fl.remove() } catch (_) {} }, 560)
      waitImg(f.img, 700, function () {
        if (!live()) return fin()
        f.img.classList.add('ba-white')
        bob.style.opacity = '1'
        anim([{ transform: 'scale(0)' }, { transform: 'scale(1.16)', offset: 0.65 }, { transform: 'scale(1)' }], 460, 'cubic-bezier(.3,1.4,.5,1)')
        setTimeout(function () { if (live()) f.img.classList.remove('ba-white') }, 300)
        setTimeout(function () { if (live()) { try { bob.getAnimations().forEach(function (a) { a.cancel() }) } catch (_) {} bob.style.transform = '' } fin() }, 520)
      })
    }
    if (fainted) { swapNow(); return }
    f.img.classList.add('ba-white')                 // recall: the old fighter turns to light and shrinks away
    anim([{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.25 }, { transform: 'scale(0)' }], 300, 'ease-in')
    setTimeout(function () { if (!live()) return fin(); f.img.classList.remove('ba-white'); swapNow() }, 320)
  }
  function waitImg (img, max, cb) {
    var t0 = Date.now()
    ;(function chk () {
      if ((img.complete && img.naturalWidth > 0) || Date.now() - t0 > max) return cb()
      setTimeout(chk, 40)
    })()
  }

  function revive (side) {
    if (!S || !S.fighters[side]) return
    var f = S.fighters[side]
    f.wrap.classList.remove('ba-faint')
    f.wrap.style.transform = ''
  }

  function destroyScene () {
    if (!S) return
    closeQuiz()
    ;['player', 'enemy'].forEach(function (side) {
      var f = S.fighters[side]
      if (f) {
        if (f.hpAnim) cancelAnimationFrame(f.hpAnim)
        try { f.card.remove() } catch (_) {}
        try { f.wrap.remove() } catch (_) {}
      }
    })
    try { S.field.remove() } catch (_) {}
    try { S.narrateEl.remove() } catch (_) {}
    if (S.backdrop) { try { S.backdrop.remove() } catch (_) {} }
    if (S.sky) { try { S.sky.remove() } catch (_) {} }
    if (S.fieldBand) { try { S.fieldBand.remove() } catch (_) {} }
    // v1.1.0 A-319 layers
    if (S.fgL) { try { S.fgL.remove() } catch (_) {} }
    if (S.fgR) { try { S.fgR.remove() } catch (_) {} }
    if (S.vsChip) { try { S.vsChip.remove() } catch (_) {} }
    if (S.motes) for (var i = 0; i < S.motes.length; i++) { try { S.motes[i].remove() } catch (_) {} }
    if (S._bgResize) { try { window.removeEventListener('resize', S._bgResize) } catch (_) {} }
    S = null
  }

  global.BattleArena = {
    version: '1.2.0',
    setSceneVisible: setSceneVisible,
    setDof: setDof,
    punchIn: punchIn,
    parallaxKick: parallaxKick,
    injectCSS: injectCSS,
    mountScene: mountScene,
    setBackdrop: setBackdrop,
    setFighter: setFighter,
    updateHP: updateHP,
    cardExtra: cardExtra,
    fighterImg: fighterImg,
    narrate: narrate,
    narrateHide: narrateHide,
    showQuiz: showQuiz,
    closeQuiz: closeQuiz,
    attack: attack,
    orbFly: orbFly,
    stumble: stumble,
    hitReact: hitReact,
    damagePop: damagePop,
    damagePopAt: damagePopAt,
    faintDrop: faintDrop,
    revive: revive,
    summon: summon,
    typeColor: typeColor,
    destroyScene: destroyScene
  }

  // Auto-inject the CSS at load so skin-class adopters (battle-modes PvP /
  // tournament inside index.html + gym-pokemon.html) get the shared look
  // without needing to mount a scene first.
  try { injectCSS() } catch (_) {}
})(typeof window !== 'undefined' ? window : this)
