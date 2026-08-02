/* Gotham Getaway — Custom Chaser companion (ADDITIVE, no bundle edits).
 *
 * The game is a webpack build with NO window.Phaser: both bundles share the chunk global
 * `self.webpackChunkwarner_batwheels_getaway` and Phaser lives in a webpack module. To wrap
 * Phaser.Game we push our own chunk whose runtime fn runs INSIDE webpack (gets `require`),
 * resolves the Phaser module, and wraps Phaser.Game so we capture the game instance.
 *
 * Load order (index.html, all defer): phaser bundle -> THIS -> main bundle. So the Phaser
 * module is registered when we run, and main instantiates the (now-wrapped) Phaser.Game.
 *
 * Config (first found wins): window.GG_CHASER {hero,color} | localStorage 'gg_chaser' |
 * URL ?chaser=hero,rrggbb . hero ∈ bam|bibi|redbird|batwing|buff . No config => vanilla game.
 */
(function () {
  'use strict';
  var CHUNK = 'webpackChunkwarner_batwheels_getaway';
  if (typeof self === 'undefined' || window.__ggCustomInstalled) return;
  window.__ggCustomInstalled = true;

  var HEROES = ['bam', 'bibi', 'redbird', 'batwing', 'buff'];
  var PHASER_MODULE_ID = 8068;   // known id; we also scan by signature if it drifts (re-sync safe)

  function log() { try { console.log.apply(console, ['[gg-custom]'].concat([].slice.call(arguments))); } catch (e) {} }

  function readConfig() {
    var c = null;
    try { if (window.GG_CHASER) c = window.GG_CHASER; } catch (e) {}
    if (!c) { try { var ls = localStorage.getItem('gg_chaser'); if (ls) c = JSON.parse(ls); } catch (e) {} }
    if (!c) {
      try {
        var p = new URLSearchParams(location.search).get('chaser');
        if (p) { var a = p.split(','); c = { hero: a[0], color: a[1] ? ('#' + a[1].replace(/^#/, '')) : null }; }
      } catch (e) {}
    }
    if (!c) return null;
    if (c.hero && HEROES.indexOf(c.hero) < 0) c.hero = null;
    return c;
  }

  function hexToRGB01(hex) {
    if (!hex) return null;
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
  }

  // Resolve the Phaser namespace from the webpack require, id-agnostic fallback.
  function resolvePhaser(require) {
    var P = null;
    try { if (require.m && require.m[PHASER_MODULE_ID]) P = require(PHASER_MODULE_ID); } catch (e) {}
    if (P && P.Game && P.AUTO !== undefined) return P;
    // signature scan: a module whose source mentions Phaser's Game + AUTO; require only that one.
    try {
      var m = require.m || {};
      for (var id in m) {
        var src = '';
        try { src = Function.prototype.toString.call(m[id]); } catch (e) { continue; }
        if (src.indexOf('WEBGL') > -1 && src.indexOf('CANVAS') > -1 && src.indexOf('Game') > -1 && src.length > 20000) {
          try { var cand = require(id); if (cand && cand.Game && cand.AUTO !== undefined) { return cand; } } catch (e) {}
        }
      }
    } catch (e) {}
    return (P && P.Game) ? P : null;
  }

  function wrapPhaser(Phaser) {
    if (!Phaser || !Phaser.Game || Phaser.__ggWrapped) return;
    Phaser.__ggWrapped = true;
    var Orig = Phaser.Game;
    var Wrapped = function (cfg) {
      var g = new Orig(cfg);
      try { window.__ggGame = g; hookGame(g, Phaser); } catch (e) { log('hookGame err', e); }
      return g;
    };
    Wrapped.prototype = Orig.prototype;
    try { for (var k in Orig) { if (Object.prototype.hasOwnProperty.call(Orig, k)) Wrapped[k] = Orig[k]; } } catch (e) {}
    Phaser.Game = Wrapped;
    log('Phaser.Game wrapped');
  }

  // hero -> its shared pair-spine asset key (each spine holds hero + paired villain skins)
  var PAIR = { bam: 'bam-prank', bibi: 'bibi-jestah', redbird: 'redbird-ducky', batwing: 'batwing-quizz', buff: 'buff-snowy' };

  function hookGame(game, Phaser) {
    var cfg = readConfig();
    log('game captured; config =', cfg);
    if (!cfg) return;                        // no config -> 100% vanilla game
    var rgb = hexToRGB01(cfg.color);

    var st = { titleDone: false, introDone: false, loadStarted: false, heroSet: false, tinted: false, lastHV: null };

    function activeScene(key) {
      try { var s = game.scene.getScene(key); return (s && s.scene.settings.active) ? s : null; } catch (e) { return null; }
    }
    // find the forward button (play on Title / skip on Intro) and emit its pointer flow
    function tapForward(scene, type) {
      if (!scene.children) return false;
      var list = [];
      scene.children.list.forEach(function (o) {
        if (o.input && o.input.enabled) { var b = o.getBounds(); list.push({ o: o, x: b.centerX, y: b.centerY, w: b.width }); }
      });
      // exclude top-left back + top-right audio corners
      var cand = list.filter(function (t) { return !(t.x < 380 && t.y < 260) && !(t.x > 1500 && t.y < 200); });
      var target = null;
      if (type === 'title') target = cand.filter(function (t) { return t.y > 550; }).sort(function (a, b) { return b.w - a.w; })[0];
      else if (type === 'intro') target = cand.filter(function (t) { return t.x > 1200 && t.y > 450; }).sort(function (a, b) { return (b.x + b.y) - (a.x + a.y); })[0];
      if (!target) return false;
      var P = game.input.activePointer;
      ['pointerover', 'pointerdown', 'pointerup'].forEach(function (ev) { try { target.o.emit(ev, P, 0, 0, { stopPropagation: function () {} }); } catch (e) {} });
      return true;
    }
    function spineLoaded(scene, key) {
      try { var c = scene.cache && scene.cache.custom && scene.cache.custom.spine; return !!(c && c.has && c.has(key)); } catch (e) { return false; }
    }

    var iv = setInterval(function () {
      try {
        // ---- D2: after the picker (a hero was chosen), auto-skip gotham's Title + Intro so the
        //          flow reads picker -> pick villain/city (LevelSelect) -> race. Fail-safe: if the
        //          button isn't found, the user just sees Title/Intro normally.
        if (cfg.hero) {
          var ts = activeScene('Title'); if (ts && !st.titleDone) { if (tapForward(ts, 'title')) st.titleDone = true; }
          var is = activeScene('Intro'); if (is && !st.introDone) { if (tapForward(is, 'intro')) st.introDone = true; }
        }

        var gs = activeScene('Game'); if (!gs) return;
        var vm = null; try { vm = gs.runManager && gs.runManager.vehicleManager; } catch (e) {}
        var hv = vm && vm.HeroVehicle;

        // ---- D3: override which hero chases, BEFORE the vehicle spawns. Only swap once the
        //          chosen hero's pair-spine is loaded (preload it if needed) -> never a blank hero.
        if (cfg.hero && gs.level && gs.level.hero && !st.heroSet && !hv) {
          if (gs.level.hero === cfg.hero) {
            st.heroSet = true;                                   // already the chosen hero
          } else {
            var pair = PAIR[cfg.hero];
            if (pair && spineLoaded(gs, pair)) {
              gs.level.hero = cfg.hero; st.heroSet = true; log('hero ->', cfg.hero);
            } else if (pair && !st.loadStarted) {
              st.loadStarted = true;
              try {
                gs.load.spine(pair, 'assets/animations/' + pair + '.json', 'assets/animations/' + pair + '.atlas', true);
                gs.load.start();                                  // spineLoaded() will pass on a later tick
                log('preloading spine', pair);
              } catch (e) { log('spine load err', e); }
            }
          }
        }

        // ---- D4: recolor the hero Spine. Re-arm when a NEW HeroVehicle spawns (restart/replay).
        if (hv !== st.lastHV) { st.lastHV = hv; st.tinted = false; }
        if (rgb && hv && !st.tinted) {
          var sk = hv.character && hv.character.skeleton;
          if (sk && sk.color) {
            try { sk.color.r = rgb.r; sk.color.g = rgb.g; sk.color.b = rgb.b; st.tinted = true; log('hero tinted', cfg.color); } catch (e) {}
          }
        }
      } catch (e) { log('tick err', e); }
    }, 350);
  }

  // push our webpack chunk: runtime fn runs inside webpack with `require`
  var arr = self[CHUNK] = self[CHUNK] || [];
  arr.push([
    ['gg_hook'], {},
    function (require) {
      try {
        var Phaser = resolvePhaser(require);
        if (Phaser) wrapPhaser(Phaser); else log('Phaser module not found — vanilla');
      } catch (e) { log('chunk err', e); }
    }
  ]);
})();
