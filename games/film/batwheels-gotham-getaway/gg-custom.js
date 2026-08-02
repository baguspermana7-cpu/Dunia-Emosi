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

  function hookGame(game, Phaser) {
    var cfg = readConfig();
    log('game captured; config =', cfg);
    if (!cfg) return;                        // vanilla
    var rgb = hexToRGB01(cfg.color);

    game.events.on('step', function () {
      var gs;
      try { gs = game.scene && game.scene.getScene && game.scene.getScene('Game'); } catch (e) { return; }
      if (!gs) return;
      var vm = null;
      try { vm = gs.runManager && gs.runManager.vehicleManager; } catch (e) {}

      // (a) override chaser hero BEFORE the vehicle is spawned
      if (cfg.hero && gs.level && gs.level.hero && gs.level.hero !== cfg.hero && !gs.__ggHeroSet) {
        if (!vm || !vm.HeroVehicle) {
          try { gs.level.hero = cfg.hero; gs.__ggHeroSet = true; log('hero ->', cfg.hero); } catch (e) {}
        }
      }
      // (b) recolor the hero Spine once it exists
      if (rgb && vm && vm.HeroVehicle && !gs.__ggTinted) {
        var spine = vm.HeroVehicle.character;
        var skel = spine && spine.skeleton;
        if (skel && skel.color) {
          try {
            skel.color.r = rgb.r; skel.color.g = rgb.g; skel.color.b = rgb.b;
            gs.__ggTinted = true; log('hero tinted', cfg.color);
          } catch (e) { log('tint err', e); }
        }
      }
    });
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
