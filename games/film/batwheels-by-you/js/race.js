// ============================================================================
// race.js  —  BALAPAN (RACE MODE)
// ----------------------------------------------------------------------------
// A "kejar-kejaran" chase built on by-you's fox runner infrastructure. The child
// paints a car, picks a villain + a city, then gets chased. The car that races is
// the child's ACTUAL painted car, rebuilt from the saved recipe.
//
// Flow: title BALAPAN -> pick vehicle -> paint (g.skipclean) -> racepick -> race.
//
// ---------------------------------------------------------------------------
// DESIGN NOTES (read before editing)
// ---------------------------------------------------------------------------
// FRAMING. The engine caps its logical screen at aspect 1.2 (main.js resize()),
//   so g.screenwid x g.screenhei is 682x568 inside a 1280x720 wrapper frame — the
//   scene used to render with ~200px black bars down both sides. The race instead
//   draws across the FULL inner window (g.innerwindowwid), i.e. x in [t.L, t.R]
//   with t.L negative, which exactly fills the wrapper. Nothing outside this file
//   changes, so title/paint/gallery keep their layout.
//   t.BL/t.BR are the BUILD bounds (a margin wider than t.L/t.R) so the chase
//   camera can slide without exposing a world edge; t.worldmask clips to t.L/t.R.
//
// THREAT LEGIBILITY. The villain rides the road in the player's lane at a size
//   comparable to the hero car, surges periodically (lunge + smoke + headlight
//   flare) instead of creeping monotonically, and at close range triggers a
//   DANGER state: red edge vignette, pulsing AWAS! chip, alarm tick, and a camera
//   slide that pulls the villain further into frame.
//
// READABILITY (owner bug class: "rintangan objectnya tidak kelihatan jadi tiba2
//   tertabrak tanpa tahu itu apa"). Every spawnable is:
//     - telegraphed for ~40 frames by an edge marker at the object's lane height
//       BEFORE it exists, so nothing ever arrives unannounced;
//     - drawn with a contrast rim whose colour is derived from the city's road
//       luminance, so it separates on snow AND at night;
//     - given a ground contact shadow so it reads as sitting on the road;
//     - collided with a box that matches what is DRAWN. The hero car's box is
//       derived from its measured bounds (was a fixed 60x60 against a ~220px car,
//       so obstacles used to visually enter the car long before impact).
//
// PERFORMANCE. Everything is pooled and built once: obstacles (per type), the
//   charge pickup, dust, smoke, streaks, snow, road scuff, lane dashes, confetti
//   and the telegraph marker. The loop only sets x/y/scale/alpha/tint/visible.
//   There is no PIXI.Graphics / Texture / Container allocation in loop(), and no
//   per-frame PIXI.Text mutation (HUD strings are written only when they change).
//   teardown() destroys the generated textures so replaying never leaks GPU memory.
//
// AUDIO. Only keys that jz/z_audio.jz actually ships are used — the previous
//   'zbump' was never in the pack, so the crash was silent. The engine note is
//   synthesised on the existing WebAudio context (no asset, no dependency).
// ============================================================================

// ---- city backdrops (procedural palettes; bg = by-you background index) ------
var RACE_CITIES = [
    {
        name: 'Siang', bg: 3,
        sky: ['#3e9be0', '#7cc4ef', '#cfeeff'],
        farB: 0x9ab8cc, nearB: 0x6d97b0, win: 0x39566b, winLit: false,
        roadside: ['#6fae54', '#4f8a3c'], asphalt: 0x565c66, asphaltTop: 0x6a7079,
        curb: 0xe8e2d4, mark: 0xf4ecd8,
        sun: 0xfff2ac, moon: false, stars: 0, clouds: 3, snow: false,
        skyTop: 0x4aa3df, skyBand: 0x8fd0f2, hill: 0x3f8e4a, ground: 0x6b4a2b, groundEdge: 0x3d2a17
    },
    {
        name: 'Senja', bg: 5,
        sky: ['#f4a24d', '#ff8a63', '#5b3d7c'],
        farB: 0x7c5a88, nearB: 0x503b64, win: 0xffcf87, winLit: true,
        roadside: ['#7a5a3c', '#4c3626'], asphalt: 0x4b3b47, asphaltTop: 0x5e4a58,
        curb: 0xf0cf9a, mark: 0xe8b877,
        sun: 0xffd27a, moon: false, stars: 6, clouds: 3, snow: false,
        skyTop: 0xf6a14b, skyBand: 0xffcf87, hill: 0x8a5a3c, ground: 0x5a3a24, groundEdge: 0x35210f
    },
    {
        name: 'Malam', bg: 7,
        sky: ['#0e1c3a', '#1b2b4d', '#35456e'],
        farB: 0x1d2d4c, nearB: 0x2b3b60, win: 0xffe27a, winLit: true,
        roadside: ['#2b3a2c', '#17231a'], asphalt: 0x1b2130, asphaltTop: 0x28324a,
        curb: 0x9fb0c8, mark: 0x6a82ad,
        sun: false, moon: 0xf3f0d6, stars: 40, clouds: 0, snow: false,
        skyTop: 0x1b2b4d, skyBand: 0x2c4370, hill: 0x223a55, ground: 0x1d2433, groundEdge: 0x0e1420
    },
    {
        name: 'Salju', bg: 2,
        sky: ['#a5d2e7', '#cdebff', '#eef8ff'],
        farB: 0xbdd6e4, nearB: 0x9fbccd, win: 0x6a86a0, winLit: false,
        // the road must separate from the snow roadside AND the lane marks from
        // the road, or Salju renders as one flat white field
        roadside: ['#e8f3f9', '#cfe0e9'], asphalt: 0xb9ccd8, asphaltTop: 0xcedde6,
        curb: 0xf4fbff, mark: 0x7d95a6,
        sun: 0xfbf3d8, moon: false, stars: 0, clouds: 3, snow: true,
        skyTop: 0x8fc7de, skyBand: 0xcdebff, hill: 0xcfe3ef, ground: 0xe8f2f8, groundEdge: 0xb8ccd6
    }
];

// ---- villains (procedural; each tweaks how hard it chases + its accent) ------
var RACE_VILLAINS = [
    { name: 'Crash',       color: 0xd6382b, eye: 0xffe14d, glass: 0x7a1a12, accent: 'spikes', aggr: 1.00 },
    { name: 'Prof. Pinch', color: 0x8e44c9, eye: 0x8fff5a, glass: 0x4c1670, accent: 'prongs', aggr: 1.18 },
    { name: 'Snowball',    color: 0x3aa6e6, eye: 0xffffff, glass: 0x18688f, accent: 'fin',    aggr: 0.86 },
    { name: 'Duke',        color: 0xef7d1a, eye: 0x2b2b2b, glass: 0x8a4a10, accent: 'horns',  aggr: 1.30 }
];

// set false to silence the synthesised engine note (everything else keeps working)
var RACE_ENGINE_AUDIO = true;

// ============================================================================
// Shared procedural villain draw — used by BOTH the race chaser and the racepick
// cards so they always match. Draws facing RIGHT (travel direction).
// Returns the animatable parts so the chaser can drive them:
//   { wheels:[g,g], teeth, brows:[g,g], eyes:[g,g], lamp, beam }
// racepick ignores the return value.
// ============================================================================
function RACE_drawvillain(parent, v, s) {
    s = s || 1;
    var parts = { wheels: [], eyes: [], brows: [], teeth: null, lamp: null, beam: null };
    var rr = function (x, y, w, h, rad, fill, fa, lw, lc, la) {
        return fox.makeroundedbox(x * s, y * s, w * s, h * s, rad * s, fill, fa, lw, lc, la, parent);
    };

    // headlight beam cone (drawn FIRST so it sits behind the body) — only shown
    // when the chaser is closing in, so the child sees the car get "lit up".
    var beam = new PIXI.Graphics();
    beam.beginFill(0xfff3c0, 0.34);
    beam.drawPolygon([30 * s, -24 * s, 230 * s, -66 * s, 230 * s, 30 * s, 30 * s, -12 * s]);
    beam.endFill();
    beam.beginFill(0xffffff, 0.30);
    beam.drawPolygon([30 * s, -22 * s, 230 * s, -44 * s, 230 * s, 8 * s, 30 * s, -14 * s]);
    beam.endFill();
    // additive so it reads as LIGHT on the road rather than a grey wedge
    beam.blendMode = PIXI.BLEND_MODES.ADD;
    beam.visible = false;
    parent.addChild(beam);
    parts.beam = beam;

    // ground contact shadow
    var sh = new PIXI.Graphics();
    sh.beginFill(0x000000, 0.26);
    sh.drawEllipse(0, 21 * s, 42 * s, 8 * s);
    sh.endFill();
    parent.addChild(sh);

    // lower skirt (darker underbody)
    rr(-32, -6, 64, 22, 8, 0x000000, 0.28, 0, 0, 0);
    // main chassis
    rr(-32, -30, 64, 34, 12, v.color, 1, 3, 0x141414, 1);
    // body sheen (top highlight)
    var sheen = new PIXI.Graphics();
    sheen.beginFill(0xffffff, 0.16);
    sheen.drawRoundedRect(-26 * s, -27 * s, 44 * s, 9 * s, 5 * s);
    sheen.endFill();
    parent.addChild(sheen);
    // canopy / windshield (front-right), tinted glass
    rr(-4, -46, 30, 22, 9, v.glass, 1, 3, 0x141414, 1);
    var ws = new PIXI.Graphics();
    ws.beginFill(0xffffff, 0.35);
    ws.drawRoundedRect(2 * s, -43 * s, 14 * s, 8 * s, 3 * s);
    ws.endFill();
    parent.addChild(ws);
    // angry eyes (front)
    var e1 = rr(9, -40, 13, 10, 4, v.eye, 1, 2, 0x000000, 1); e1.rotation = -0.24;
    var e2 = rr(-6, -40, 13, 10, 4, v.eye, 1, 2, 0x000000, 1); e2.rotation = -0.24;
    parts.eyes.push(e1, e2);
    // pupils
    rr(15, -37, 4, 5, 2, 0x111111, 1, 0, 0, 0);
    rr(0, -37, 4, 5, 2, 0x111111, 1, 0, 0, 0);
    // angry brows — dropped further down in the DANGER state
    var b1 = new PIXI.Graphics();
    b1.beginFill(0x141414, 1); b1.drawRoundedRect(-1 * s, -3 * s, 17 * s, 5 * s, 2 * s); b1.endFill();
    b1.x = 8 * s; b1.y = -46 * s; b1.rotation = 0.30;
    parent.addChild(b1);
    var b2 = new PIXI.Graphics();
    b2.beginFill(0x141414, 1); b2.drawRoundedRect(-1 * s, -3 * s, 17 * s, 5 * s, 2 * s); b2.endFill();
    b2.x = -8 * s; b2.y = -46 * s; b2.rotation = 0.30;
    parent.addChild(b2);
    parts.brows.push(b1, b2);
    // grille / teeth at the front bumper — pivoted so it can "chomp"
    var teeth = new PIXI.Graphics();
    teeth.beginFill(0x141414, 1);
    teeth.drawRoundedRect(0, -6 * s, 20 * s, 12 * s, 3 * s);
    teeth.endFill();
    teeth.beginFill(0xf2f2f2, 0.92);
    for (var ti = 0; ti < 3; ti++) teeth.drawRect((3 + ti * 6) * s, -5 * s, 3 * s, 10 * s);
    teeth.endFill();
    teeth.x = 12 * s; teeth.y = -8 * s;
    parent.addChild(teeth);
    parts.teeth = teeth;
    // headlight
    parts.lamp = rr(28, -22, 7, 8, 3, 0xfff2b0, 1, 1, 0x8a6a10, 1);

    // per-villain menacing accent
    var acc = new PIXI.Graphics();
    var dark = 0x141414;
    if (v.accent === 'spikes') {
        acc.beginFill(0xf2f2f2, 1); acc.lineStyle(1.5 * s, dark, 1);
        for (var i = 0; i < 3; i++) {
            var bx = (-18 + i * 14) * s;
            acc.drawPolygon([bx, -30 * s, bx + 6 * s, -44 * s, bx + 12 * s, -30 * s]);
        }
    } else if (v.accent === 'prongs') {
        acc.lineStyle(3 * s, 0xd7ff9a, 1);
        acc.moveTo(-18 * s, -30 * s); acc.lineTo(-22 * s, -52 * s);
        acc.moveTo(-6 * s, -30 * s); acc.lineTo(-4 * s, -54 * s);
        acc.lineStyle(0); acc.beginFill(0xeaffb0, 1);
        acc.drawCircle(-22 * s, -53 * s, 3.5 * s); acc.drawCircle(-4 * s, -55 * s, 3.5 * s);
        acc.endFill();
    } else if (v.accent === 'fin') {
        acc.beginFill(0xe6f6ff, 1); acc.lineStyle(1.5 * s, 0x2a7fae, 1);
        acc.drawPolygon([-22 * s, -30 * s, -14 * s, -56 * s, -4 * s, -30 * s]);
    } else if (v.accent === 'horns') {
        acc.beginFill(0x3a2a12, 1); acc.lineStyle(1.5 * s, dark, 1);
        acc.drawPolygon([-20 * s, -30 * s, -30 * s, -50 * s, -12 * s, -34 * s]);
        acc.drawPolygon([-2 * s, -32 * s, 6 * s, -52 * s, 12 * s, -32 * s]);
    }
    acc.endFill();
    parent.addChild(acc);

    // exhaust pipe (rear-left)
    rr(-36, -8, 8, 6, 3, 0x2a2a2a, 1, 0, 0, 0);

    // wheels (dark tire + lighter hub + spokes) — returned for spin
    var wpos = [-20, 18];
    for (var w = 0; w < 2; w++) {
        var wheel = new PIXI.Graphics();
        wheel.beginFill(0x0d0d0d, 1); wheel.drawCircle(0, 0, 11 * s); wheel.endFill();
        wheel.beginFill(0x3a3a3a, 1); wheel.drawCircle(0, 0, 6 * s); wheel.endFill();
        wheel.lineStyle(2 * s, 0xbfbfbf, 1);
        for (var sp = 0; sp < 4; sp++) {
            var a = sp * Math.PI / 2;
            wheel.moveTo(0, 0);
            wheel.lineTo(Math.cos(a) * 5.5 * s, Math.sin(a) * 5.5 * s);
        }
        wheel.beginFill(0xdedede, 1); wheel.lineStyle(0); wheel.drawCircle(0, 0, 2 * s); wheel.endFill();
        wheel.x = wpos[w] * s; wheel.y = 8 * s;
        parent.addChild(wheel);
        parts.wheels.push(wheel);
    }
    return parts;
}

// ============================================================================
// Engine note — synthesised on the audio context PIXI.sound already created, so
// it needs no asset, no dependency and no network. Entirely optional: every step
// is guarded and a failure leaves the rest of the race untouched.
// ============================================================================
function RACE_enginehum() {
    var self = { ok: false };
    if (!RACE_ENGINE_AUDIO) return self;
    try {
        var ctx = null;
        if (window.PIXI && PIXI.sound && PIXI.sound.context && PIXI.sound.context.audioContext) {
            ctx = PIXI.sound.context.audioContext;
        }
        if (!ctx || ctx.state === 'closed' || !ctx.createOscillator) return self;
        var out = ctx.createGain(); out.gain.value = 0;
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 4;
        var o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 46;
        var o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 69; o2.detune.value = 8;
        var g2 = ctx.createGain(); g2.gain.value = 0.34;
        o1.connect(lp); o2.connect(g2); g2.connect(lp);
        lp.connect(out); out.connect(ctx.destination);
        o1.start(); o2.start();
        self.ok = true;
        self.ctx = ctx; self.out = out; self.lp = lp; self.o1 = o1; self.o2 = o2;
        self.set = function (level, pitch) {
            try {
                var now = ctx.currentTime;
                out.gain.setTargetAtTime(level, now, 0.08);
                o1.frequency.setTargetAtTime(pitch, now, 0.10);
                o2.frequency.setTargetAtTime(pitch * 1.5, now, 0.10);
                lp.frequency.setTargetAtTime(300 + pitch * 5, now, 0.12);
            } catch (e) { /* context went away — silent */ }
        };
        self.stop = function () {
            try { out.gain.setTargetAtTime(0, ctx.currentTime, 0.05); } catch (e) { }
            try { o1.stop(ctx.currentTime + 0.3); o2.stop(ctx.currentTime + 0.3); } catch (e) { }
            try { setTimeout(function () { try { out.disconnect(); lp.disconnect(); } catch (e) { } }, 500); } catch (e) { }
            self.ok = false;
        };
    } catch (e) {
        self.ok = false;
    }
    return self;
}

var race = function (x, y, params) {
    foxmovieclip.call(this, x, y, params);
};
race.prototype = Object.create(foxmovieclip.prototype);
race.prototype.constructor = race;

race.prototype.awaken = function () {
    this.spawn();
};

race.prototype.spawn = function () {
    let t = this;
    g.race = t;

    // clean slate — destroy the previous run's world + generated textures so a
    // restart never leaks a RenderTexture on the tablet
    t.teardown();

    // resolve chosen city + villain (defaults keep race runnable standalone)
    t.city = (typeof g.raceCity === 'number' && RACE_CITIES[g.raceCity]) ? RACE_CITIES[g.raceCity] : RACE_CITIES[0];
    t.villain = (typeof g.raceVillain === 'number' && RACE_VILLAINS[g.raceVillain]) ? RACE_VILLAINS[g.raceVillain] : RACE_VILLAINS[0];

    t.measureframe();

    // ---- container stack (back -> front) -----------------------------------
    // worldcontainer holds everything that scrolls / shakes / slides; hud + over
    // sit OUTSIDE it so neither the crash shake nor the chase camera rattles the UI.
    t.worldcontainer = fox.makecontainer(0, 0, t);
    t.skycontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.skylinefar = fox.makecontainer(0, 0, t.worldcontainer);
    t.skylinenear = fox.makecontainer(0, 0, t.worldcontainer);
    t.roadcontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.scuffcontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.dashcontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.snowcontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.chasercontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.smokecontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.shadowcontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.obstaclecontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.coincontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.dustcontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.racecar = g.racecar = fox.makecontainer(0, 0, t.worldcontainer);
    t.streakcontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.debugcontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.vignettecontainer = fox.makecontainer(0, 0, t);
    t.inputcontainer = fox.makecontainer(0, 0, t);
    t.hudcontainer = fox.makecontainer(0, 0, t);
    t.overcontainer = fox.makecontainer(0, 0, t);

    // ---- runtime state -----------------------------------------------------
    t.built = false;
    t.over = false;             // true once crashed OR caught
    t.crashed = false;
    t.caught = false;
    t.distance = 0;
    t.basespeed = 5.6;
    t.worldspeed = t.basespeed;
    t.vy = 0;
    // JUMP TUNING. Apex alone is not the test: the hero car's collision box is
    // ~110px wide and the world scrolls ~5.6px/frame, so the car OVERLAPS an
    // obstacle for ~25 frames. The window during which the jump is high enough
    // (2*sqrt(v^2-2gN)/g for an obstacle needing N px) must exceed that overlap,
    // or the obstacle is literally unjumpable. At v=18.6/g=0.80 the window is
    // ~32 frames against the tallest spawnable's 25 — verified in the harness.
    t.gravity = 0.80;
    t.jumpvel = -18.6;
    t.jumpbuffer = 0;           // a tap while airborne fires on landing
    t.grounded = true;
    t.bob = 0;
    t.tick = 0;
    t.shake = 0;
    t.squash = 0;               // car squash/stretch (decays to 0)
    t.pitch = 0;                // body pitch under accel/impact (decays to 0)
    t.camx = 0;                 // chase-camera slide (lerped)
    t.camtarget = 0;
    t.dustcooldown = 0;
    t.obstimer = 64;
    t.pending = null;           // telegraphed item waiting to spawn
    t.pendingtimer = 0;
    t.obstacles = [];
    t.coins = [];
    t.dashes = [];
    t.response = new SAT.Response();
    t.carscale = 0.40;
    t.hudlast = { d: -1, c: -1 };
    t.boosting = 0;
    t.boostsused = 0;
    t.boostneed = 3;            // charges per TURBO
    t.surge = 0;                // frames left in a villain surge
    t.surgetimer = 200;
    t.danger = false;
    t.alarmtick = 0;
    t.gentex = [];              // generated textures to destroy on teardown
    t.debughit = false;         // set true to draw the collision boxes

    // villain chase model — the gaps are set in buildchaser(), once both vehicle
    // widths are known (a centre-to-centre "gap" smaller than half a car plus half
    // a villain means they are already overlapping, which is what P3 shipped)
    t.coinpush = Math.round(t.VW * 0.035);

    // score / charge counters (reuse engine globals)
    g.score = 0;
    g.coins = 0;
    if (typeof g.racebest !== 'number') g.racebest = 0;

    t.buildcar();
    t.layout();
    t.buildchaser();
    t.initfx();
    t.buildobstaclepool();
    t.buildhud();
    t.setupinput();

    t.hum = RACE_enginehum();

    fox.fadescreen();
    t.built = true;
    fox.trace('race ready — ' + t.city.name + ' / ' + t.villain.name + ' — field ' + t.L + '..' + t.R);
};

// ---------------------------------------------------------------------------
// FRAME — resolve the real drawable window. The engine centres a g.screenwid-wide
// scene inside a g.innerwindowwid-wide viewport, so drawing from a negative x out
// to screenwid+|x| fills the wrapper frame completely instead of letterboxing.
// ---------------------------------------------------------------------------
race.prototype.measureframe = function () {
    let t = this;
    let sw = g.screenwid, sh = g.screenhei;
    let iw = (typeof g.innerwindowwid === 'number' && g.innerwindowwid > sw) ? g.innerwindowwid : sw;
    let over = Math.max(0, Math.round((iw - sw) / 2));
    t.L = -over;
    t.R = sw + over;
    t.VW = t.R - t.L;
    t.H = sh;
    t.CX = (t.L + t.R) / 2;
    // build a margin wider than the visible frame so the chase camera slide never
    // exposes an edge of the sky / road / skyline
    t.pad = 80;
    t.BL = t.L - t.pad;
    t.BR = t.R + t.pad;
    t.BW = t.BR - t.BL;
    t.W = t.VW; // legacy alias
};

// ---- teardown: release the previous run so restarts stay flat ---------------
race.prototype.teardown = function () {
    let t = this;
    if (t.hum && t.hum.ok) t.hum.stop();
    t.hum = null;
    // hand the painted-car photo clips back to the fox pool BEFORE destroying
    // anything, so fox.spawn('photo') can reuse them next run
    if (t.car) {
        if (t.car.parent) t.car.parent.removeChild(t.car);
        if (t.car.die) t.car.die();
        t.car = null;
    }
    t.resultcar = null;
    // PIXI.Text owns a private canvas texture; a plain destroy({texture:false})
    // strands it in the TextureCache, which leaked ~15 textures per replay.
    let killtexts = function (node) {
        if (!node || !node.children) return;
        for (let i = node.children.length - 1; i >= 0; i--) {
            let c = node.children[i];
            killtexts(c);
            if (c instanceof PIXI.Text) {
                node.removeChild(c);
                try { c.destroy({ children: true, texture: true, baseTexture: true }); } catch (e) { }
            }
        }
    };
    killtexts(t);
    // drop every graphics tree this scene owns
    for (let i = t.children.length - 1; i >= 0; i--) {
        let c = t.children[i];
        t.removeChild(c);
        if (c.destroy) { try { c.destroy({ children: true, texture: false, baseTexture: false }); } catch (e) { } }
    }
    t.removeChildren();
    // and the textures we generated for it
    if (t.gentex) {
        for (let i = 0; i < t.gentex.length; i++) {
            try { t.gentex[i].destroy(true); } catch (e) { }
        }
    }
    t.gentex = [];
    t.obstacles = [];
    t.coins = [];
    t.pool = null;
    t.dbg = null;
    t.confetti = null;
    t.telegraph = null;
};

// ---- recipe: prefer the picker's carried recipe, then most-recent photo ------
race.prototype.recipe = function () {
    if (g.raceRecipe) return g.raceRecipe;
    if (g.photos && g.photos.length > 0) return g.photos[0];
    // sensible painted default (guards below make missing textures harmless)
    return {
        vehicle: 1, clr: 2, sclr: 2, hilite: -1, sticker: 0,
        eyes: g.vehicle1cleaneyes, mouth: g.vehicle1cleanmouth, bg: 8
    };
};

race.prototype.buildcar = function () {
    let t = this;
    let p = t.recipe();
    // normalise optional fields so photo.spawn never reads undefined
    if (p.vehicle === undefined) p.vehicle = 1;
    if (p.clr === undefined) p.clr = -1;
    if (p.sclr === undefined) p.sclr = 0;
    if (p.hilite === undefined) p.hilite = -1;
    if (p.sticker === undefined) p.sticker = 8;
    if (p.eyes === undefined) p.eyes = -1;
    if (p.mouth === undefined) p.mouth = -1;
    if (p.bg === undefined) p.bg = 8;
    t.p = p;

    // Rebuild the FULLY-PAINTED car from the recipe via a fresh photo instance.
    // photo.prototype.spawn does the real work (attach2vehicle color/sticker/
    // eyes/mouth + common.addglow). Fresh rebuild, NOT the live wash car, whose
    // per-frame expression tweens would fight this loop.
    t.car = fox.spawn('photo', 0, 0, t.racecar, { p: p });

    // Drop photo's portrait background image and its white photo frame — we only
    // want the painted vehicle to race.
    if (t.car.bgcontainer) t.car.bgcontainer.visible = false;
    if (t.car.framecontainer) t.car.framecontainer.visible = false;
};

// ============================================================================
// WORLD LAYOUT — procedural sky / skyline / road + car placement
// ============================================================================
race.prototype.layout = function () {
    let t = this;
    let H = t.H;

    // horizon (sky meets skyline meets road) sits a little above mid so the road
    // gets more of the frame; groundY is the near contact line for car/obstacles.
    t.horizonY = Math.round(H * 0.46);
    t.groundY = H - Math.round(H * 0.15);
    t.vanishX = Math.round(t.CX);

    // clip the scrolling world to the VISIBLE frame so nothing bleeds outside it.
    // HUD / vignette / results sit outside the mask.
    t.worldmask = fox.makebox(t.L, 0, t.VW, H, t, 0xffffff, 1);
    t.worldcontainer.mask = t.worldmask;

    t.buildsky();
    t.buildskyline();
    t.buildroad();

    // ---- CAR placement — left-of-centre, flipped to face travel (right) -----
    // mid-frame: road behind for the chase, road ahead for the obstacle runway
    t.playerX = Math.round(t.L + t.VW * 0.50);
    t.racecar.x = t.playerX;
    t.carbaseY = t.groundY - 14;
    t.racecar.y = t.carbaseY;
    t.racecar.scale.set(-t.carscale, t.carscale); // negative x = face right

    // soft ground shadow under the car (shrinks in the air)
    t.carshadow = new PIXI.Graphics();
    t.carshadow.beginFill(0x000000, 0.30);
    t.carshadow.drawEllipse(0, 0, 52, 10);
    t.carshadow.endFill();
    t.carshadow.x = t.playerX;
    t.carshadow.y = t.groundY + 12;
    t.shadowcontainer.addChild(t.carshadow);

    t.buildwheelfx();
    t.buildcarpoly();
};

// ---------------------------------------------------------------------------
// CAR COLLISION BOX — derived from the car's MEASURED bounds instead of a fixed
// 60x60. The painted vehicles differ in size, and the old fixed box was roughly a
// third of the drawn car, so an obstacle visually entered the bodywork long
// before (or after) the crash registered. A fairness inset keeps it a touch
// smaller than the paint so grazes are forgiven, not invented.
// ---------------------------------------------------------------------------
// measure the car in its PARENT's space: getBounds() would be polluted by the
// stage scale + scene offset, so use local bounds x the container's own scale.
race.prototype.carmetrics = function () {
    let t = this;
    let m = { w: 190, h: 118, cy: -34 };
    try {
        let lb = t.racecar.getLocalBounds();
        if (lb && lb.width > 8 && lb.height > 8) {
            let sx = Math.abs(t.racecar.scale.x) || 1;
            let sy = Math.abs(t.racecar.scale.y) || 1;
            m.w = lb.width * sx;
            m.h = lb.height * sy;
            m.cy = (lb.y + lb.height / 2) * sy;   // centre offset from the car origin
        }
    } catch (e) { /* keep the fallback */ }
    return m;
};

race.prototype.buildcarpoly = function () {
    let t = this;
    let m = t.carmetrics();
    // fairness inset: a touch smaller than the paint so grazes are forgiven, but
    // close enough that a hit always happens on something the child can SEE
    t.carW = Math.round(m.w * 0.66);
    t.carH = Math.round(m.h * 0.62);
    t.carCY = Math.round(m.cy);
    t.carpoly = fox.createSATpolygon(t.boxpoints(t.carW, t.carH), { x: t.racecar.x, y: t.carbaseY + t.carCY });
};

// canvas vertical-gradient sprite (one small texture stretched) — cheap + offline
race.prototype.gradsprite = function (x, w, h, stops, parent) {
    let t = this;
    let cv = document.createElement('canvas');
    cv.width = 8;
    cv.height = Math.max(2, Math.round(h));
    let ctx = cv.getContext('2d');
    let grd = ctx.createLinearGradient(0, 0, 0, cv.height);
    for (let i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], stops[i][1]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, cv.width, cv.height);
    let tex = PIXI.Texture.from(cv);
    t.gentex.push(tex);
    let sp = new PIXI.Sprite(tex);
    sp.x = x;
    sp.width = w;
    sp.height = h;
    parent.addChild(sp);
    return sp;
};

race.prototype.buildsky = function () {
    let t = this;
    let H = t.H, c = t.city;
    let stops = [[0, c.sky[0]], [0.6, c.sky[1]], [1, c.sky[2]]];
    t.gradsprite(t.BL, t.BW, t.horizonY + 10, stops, t.skycontainer);

    // celestial body
    if (c.moon) {
        let m = new PIXI.Graphics();
        m.beginFill(0xffffff, 0.10); m.drawCircle(0, 0, 40); m.endFill();  // halo
        m.beginFill(c.moon, 1); m.drawCircle(0, 0, 26); m.endFill();
        m.beginFill(0x000000, 0.06); m.drawCircle(9, -6, 6); m.drawCircle(-6, 7, 4); m.endFill(); // craters
        m.x = Math.round(t.L + t.VW * 0.80); m.y = Math.round(t.horizonY * 0.32);
        t.skycontainer.addChild(m);
    } else if (c.sun) {
        let s = new PIXI.Graphics();
        s.beginFill(0xffffff, 0.14); s.drawCircle(0, 0, 46); s.endFill();  // halo
        s.beginFill(c.sun, 1); s.drawCircle(0, 0, 30); s.endFill();
        s.x = Math.round(t.L + t.VW * 0.79); s.y = Math.round(t.horizonY * 0.28);
        t.skycontainer.addChild(s);
    }

    // stars (night)
    if (c.stars > 0) {
        let sg = new PIXI.Graphics();
        sg.beginFill(0xffffff, 0.9);
        for (let i = 0; i < c.stars; i++) {
            let sx = t.BL + ((i * 173) % t.BW);
            let sy = (((i * 131) % (t.horizonY - 30)));
            let sr = 0.6 + ((i * 17) % 10) / 10;
            sg.drawCircle(sx, sy, sr);
        }
        sg.endFill();
        t.skycontainer.addChild(sg);
    }

    // clouds (day / senja / snow)
    if (c.clouds > 0) {
        let cg = new PIXI.Graphics();
        let cloudCol = (c === RACE_CITIES[1]) ? 0xffd9b0 : 0xffffff;
        cg.beginFill(cloudCol, 0.82);
        for (let i = 0; i < c.clouds + 1; i++) {
            let cx = Math.round(t.BL + t.BW * (0.10 + i * 0.24));
            let cy = Math.round(t.horizonY * (0.20 + (i % 2) * 0.16));
            cg.drawEllipse(cx, cy, 38, 15);
            cg.drawEllipse(cx + 24, cy + 4, 26, 12);
            cg.drawEllipse(cx - 24, cy + 5, 22, 10);
        }
        cg.endFill();
        t.skycontainer.addChild(cg);
    }
    // haze band that softens the skyline into the road
    let hz = new PIXI.Graphics();
    hz.beginFill(c.winLit ? 0x000000 : 0xffffff, 0.10);
    hz.drawRect(t.BL, t.horizonY - 16, t.BW, 22);
    hz.endFill();
    t.skycontainer.addChild(hz);
};

// draw a strip of building silhouettes into a Graphics, bake to a texture, then
// wrap-scroll two copies. Deterministic per (seed) so both copies + reruns match.
race.prototype.buildskyline = function () {
    let t = this;
    let c = t.city;

    let mkstrip = function (spanW, h, fill, seed, opts) {
        opts = opts || {};
        let gfx = new PIXI.Graphics();
        let rnd = function () {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        let x = 0;
        while (x < spanW) {
            let bw = opts.minW + Math.floor(rnd() * (opts.maxW - opts.minW));
            let bh = opts.minH + Math.floor(rnd() * (opts.maxH - opts.minH));
            let bx = x, by = h - bh;
            gfx.beginFill(fill, 1);
            gfx.drawRect(bx, by, bw, bh);
            if (rnd() > 0.5) gfx.drawRect(bx + bw * 0.3, by - 6, bw * 0.35, 6);
            gfx.endFill();
            if (opts.win !== false) {
                let lit = opts.winLit;
                for (let wy = by + 6; wy < h - 6; wy += 9) {
                    for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) {
                        if (lit && rnd() > 0.62) {
                            gfx.beginFill(opts.win, 0.95);
                        } else if (!lit) {
                            gfx.beginFill(opts.win, 0.35);
                        } else {
                            continue;
                        }
                        gfx.drawRect(wx, wy, 3.5, 4.5);
                        gfx.endFill();
                    }
                }
            }
            x += bw + opts.gap;
        }
        let region = new PIXI.Rectangle(0, 0, spanW, h);
        let tex = g.app.renderer.generateTexture(gfx, PIXI.SCALE_MODES.LINEAR, 1, region);
        gfx.destroy();
        t.gentex.push(tex);
        return tex;
    };

    let wrap = function (tex, y, parent, spanW) {
        let cont = fox.makecontainer(t.BL, y, parent);
        let s1 = new PIXI.Sprite(tex); s1.x = 0;
        let s2 = new PIXI.Sprite(tex); s2.x = spanW;
        cont.addChild(s1); cont.addChild(s2);
        cont.spanW = spanW;
        cont.homex = t.BL;
        return cont;
    };

    // FAR skyline: shorter, desaturated, no lit windows, slow
    let farH = Math.round(t.horizonY * 0.44);
    let farTex = mkstrip(t.BW, farH, c.farB, 12345, { minW: 30, maxW: 60, minH: 20, maxH: farH, gap: 6, win: c.win, winLit: false });
    t.farskyc = wrap(farTex, t.horizonY - farH, t.skylinefar, t.BW);

    // NEAR skyline: taller, richer, lit windows at night, faster
    let nearH = Math.round(t.horizonY * 0.62);
    let nearTex = mkstrip(t.BW, nearH, c.nearB, 6789, { minW: 40, maxW: 78, minH: 30, maxH: nearH, gap: 10, win: c.win, winLit: c.winLit });
    t.nearskyc = wrap(nearTex, t.horizonY - nearH, t.skylinenear, t.BW);
};

race.prototype.buildroad = function () {
    let t = this;
    let H = t.H, c = t.city;
    let hY = t.horizonY, vx = t.vanishX;

    // roadside ground (grass/dirt/snow) gradient fills below the horizon
    t.gradsprite(t.BL, t.BW, H - hY, [[0, cssRGB(c.roadside[0])], [1, cssRGB(c.roadside[1])]], t.roadcontainer)
        .y = hY;

    // converging asphalt trapezoid: narrow at horizon -> wide near camera
    // wide enough at the near edge that there is real road BEHIND the player for
    // the villain to occupy — a narrower trapezoid pinned the chase into ~130px
    t.roadBottomHalf = Math.round(t.VW * 0.58);
    t.roadTopHalf = Math.round(t.VW * 0.048);
    let bl = vx - t.roadBottomHalf, br = vx + t.roadBottomHalf;
    let tl = vx - t.roadTopHalf, tr = vx + t.roadTopHalf;
    let road = new PIXI.Graphics();
    road.beginFill(c.asphalt, 1);
    road.drawPolygon([tl, hY, tr, hY, br, H, bl, H]);
    road.endFill();
    road.beginFill(c.asphaltTop, 0.7);
    road.drawPolygon([tl, hY, tr, hY, vx + t.roadTopHalf * 3, hY + 26, vx - t.roadTopHalf * 3, hY + 26]);
    road.endFill();
    t.roadcontainer.addChild(road);

    // curb edges (converging lines)
    let curb = new PIXI.Graphics();
    curb.lineStyle(5, c.curb, 1);
    curb.moveTo(tl, hY); curb.lineTo(bl, H);
    curb.moveTo(tr, hY); curb.lineTo(br, H);
    t.roadcontainer.addChild(curb);

    // --- perspective lane dashes: POOLED sprites, not a per-frame redraw -----
    // (the old drawdashes() cleared and rebuilt a Graphics every frame)
    t.dashgfxpool = [];
    let ND = 8;
    let lanes = [-1, 0, 1];
    for (let i = 0; i < ND; i++) {
        let row = [];
        for (let l = 0; l < lanes.length; l++) {
            let d = new PIXI.Graphics();
            d.beginFill(c.mark, 1);
            d.drawRoundedRect(-0.5, -0.5, 1, 1, 0.4);   // unit token, scaled per frame
            d.endFill();
            t.dashcontainer.addChild(d);
            row.push(d);
        }
        t.dashgfxpool.push(row);
        t.dashes.push({ p: i / ND });
    }
    t.lanes = lanes;

    // --- pooled road scuff patches: sell ground motion beyond the dashes -----
    t.scuffs = [];
    for (let i = 0; i < 9; i++) {
        let s = new PIXI.Graphics();
        s.beginFill(0x000000, 1);
        s.drawRoundedRect(-0.5, -0.5, 1, 1, 0.35);
        s.endFill();
        s.tint = c.winLit ? 0xffffff : 0x000000;
        s.alpha = 0.09;
        t.scuffcontainer.addChild(s);
        t.scuffs.push({ g: s, p: i / 9, lane: (i % 5) - 2, w: 30 + (i * 13) % 60 });
    }

    t.updateroadtokens();
};

// place all perspective tokens for this frame — pure transform, no redraw
race.prototype.updateroadtokens = function () {
    let t = this;
    let hY = t.horizonY, H = t.H, vx = t.vanishX;
    for (let i = 0; i < t.dashes.length; i++) {
        let p = t.dashes[i].p;
        let pe = p * p;                       // perspective easing (accelerate near)
        let y = hY + (H - hY) * pe;
        let halfw = t.roadTopHalf + (t.roadBottomHalf - t.roadTopHalf) * pe;
        let dw = 3 + 30 * pe;
        let dh = 2 + 18 * pe;
        let row = t.dashgfxpool[i];
        for (let l = 0; l < t.lanes.length; l++) {
            let d = row[l];
            if (t.lanes[l] === 0) {
                d.x = vx; d.y = y;
                d.scale.set(dw, dh);
                d.alpha = 1;
            } else {
                // side lane lines: keep the centre dash's proportions so they read
                // as lane markings, not as litter scattered on the tarmac
                d.x = vx + t.lanes[l] * halfw * 0.54;
                d.y = y;
                d.scale.set(dw * 0.78, dh * 0.78);
                d.alpha = 0.7;
            }
        }
    }
    for (let i = 0; i < t.scuffs.length; i++) {
        let s = t.scuffs[i];
        let pe = s.p * s.p;
        let y = hY + (H - hY) * pe;
        let halfw = t.roadTopHalf + (t.roadBottomHalf - t.roadTopHalf) * pe;
        s.g.x = vx + (s.lane / 2.4) * halfw;
        s.g.y = y;
        s.g.scale.set(s.w * pe + 2, 3 * pe + 1);
    }
};

race.prototype.boxpoints = function (w, h) {
    return [
        { x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 },
        { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }
    ];
};

// road half-width at a given screen y (used to keep the chaser on the tarmac)
race.prototype.roadhalfat = function (y) {
    let t = this;
    let f = Math.max(0, Math.min(1, (y - t.horizonY) / (t.H - t.horizonY)));
    return t.roadTopHalf + (t.roadBottomHalf - t.roadTopHalf) * f;
};

// ---- villain chaser (procedural) -------------------------------------------
race.prototype.buildchaser = function () {
    let t = this;
    let ch = t.chaser = fox.makecontainer(0, 0, t.chasercontainer);
    // size the villain against the hero car so it reads as a peer vehicle, not a
    // distant toy (it used to draw at s=1 ≈ 76px next to a ~220px painted car)
    let carw = t.carmetrics().w;
    t.chaserscale = Math.max(1.15, Math.min(2.2, (carw * 0.72) / 76));
    t.chaserparts = RACE_drawvillain(ch, t.villain, t.chaserscale);
    t.chaserwheels = t.chaserparts.wheels;
    t.chaserbaseY = t.groundY - 10;
    ch.y = t.chaserbaseY;
    // keep the chaser on the tarmac: never left of the road edge at its own line
    t.chaserminX = Math.round(t.vanishX - t.roadhalfat(t.chaserbaseY) + 46 * t.chaserscale);
    ch.x = t.chaserminX;
    t.chaserbob = 0;
    t.chaserlunge = 0;

    // ---- gap model, in real pixels ----------------------------------------
    // touchgap = the centre distance at which the villain's nose reaches the car's
    // tail. Everything else is expressed relative to it, so "caught" means the
    // child actually SEES the villain arrive, and the opening gap is real space.
    t.touchgap = Math.round(carw * 0.5 + 40 * t.chaserscale);
    t.catchgap = t.touchgap;
    t.startgap = t.touchgap + Math.round(t.VW * 0.17);
    t.maxgap = t.touchgap + Math.round(t.VW * 0.21);
    t.chasergap = t.startgap;
};

// ============================================================================
// FX POOLS — dust, streaks, smoke, snow, telegraph, confetti (all built once)
// ============================================================================
race.prototype.initfx = function () {
    let t = this;
    // dust puffs (kicked up behind the car / landing burst)
    t.dust = [];
    for (let i = 0; i < 22; i++) {
        let d = new PIXI.Graphics();
        d.beginFill(0xffffff, 1); d.drawCircle(0, 0, 5); d.endFill();
        d.visible = false;
        t.dustcontainer.addChild(d);
        t.dust.push({ g: d, life: 0, max: 1, vx: 0, vy: 0, r: 5 });
    }
    // speed streaks (intensify with speed)
    t.streaks = [];
    for (let i = 0; i < 14; i++) {
        let s = new PIXI.Graphics();
        s.beginFill(0xffffff, 0.55); s.drawRoundedRect(0, 0, 30, 2.6, 1.3); s.endFill();
        s.visible = false;
        t.streakcontainer.addChild(s);
        t.streaks.push({ g: s, active: false, len: 30 });
    }
    // villain exhaust smoke
    t.smoke = [];
    for (let i = 0; i < 12; i++) {
        let s = new PIXI.Graphics();
        s.beginFill(0x3a3a3a, 1); s.drawCircle(0, 0, 5); s.endFill();
        s.visible = false;
        t.smokecontainer.addChild(s);
        t.smoke.push({ g: s, life: 0, max: 1, vx: 0, vy: 0, r: 5 });
    }
    // snow (salju only)
    t.snow = [];
    if (t.city.snow) {
        for (let i = 0; i < 34; i++) {
            let s = new PIXI.Graphics();
            s.beginFill(0xffffff, 0.9); s.drawCircle(0, 0, 1.6 + Math.random() * 1.6); s.endFill();
            s.x = t.BL + Math.random() * t.BW;
            s.y = Math.random() * t.horizonY;
            t.snowcontainer.addChild(s);
            t.snow.push({ g: s, vy: 0.5 + Math.random() * 0.9, vx: -0.4 - Math.random() * 0.6 });
        }
    }
    // DANGER vignette — a pre-built red edge glow, only its alpha moves
    let vg = new PIXI.Graphics();
    let band = Math.round(t.VW * 0.16);
    for (let i = 0; i < 8; i++) {
        let a = 0.055 * (1 - i / 8);
        vg.beginFill(0xff1a0d, a);
        vg.drawRect(t.L, 0, band * (1 - i / 10), t.H);
        vg.drawRect(t.R - band * (1 - i / 10), 0, band * (1 - i / 10), t.H);
        vg.drawRect(t.L, 0, t.VW, 26 * (1 - i / 10));
        vg.drawRect(t.L, t.H - 26 * (1 - i / 10), t.VW, 26 * (1 - i / 10));
        vg.endFill();
    }
    vg.alpha = 0;
    t.vignettecontainer.addChild(vg);
    t.vignette = vg;
};

race.prototype.emitdust = function (x, y, n, spread, tint) {
    let t = this;
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < t.dust.length; i++) {
            let d = t.dust[i];
            if (d.life <= 0) {
                d.g.visible = true;
                d.g.tint = tint;
                d.g.x = x + (Math.random() - 0.5) * 6;
                d.g.y = y;
                d.r = 3 + Math.random() * 4;
                d.g.scale.set(d.r / 5);
                d.vx = -t.worldspeed * 0.4 - Math.random() * spread;
                d.vy = -0.6 - Math.random() * 1.6;
                d.max = 18 + Math.random() * 14;
                d.life = d.max;
                break;
            }
        }
    }
};

race.prototype.emitsmoke = function (x, y, hard) {
    let t = this;
    for (let i = 0; i < t.smoke.length; i++) {
        let s = t.smoke[i];
        if (s.life <= 0) {
            s.g.visible = true;
            s.g.x = x; s.g.y = y;
            s.g.tint = hard ? 0x1c1c1c : 0x3a3a3a;
            s.vx = -t.worldspeed * 0.5 - Math.random() * (hard ? 3 : 1);
            s.vy = -0.4 - Math.random() * 0.8;
            s.max = 16 + Math.random() * (hard ? 18 : 10);
            s.life = s.max;
            s.g.scale.set(hard ? 0.9 : 0.6);
            break;
        }
    }
};

race.prototype.updatefx = function (settling) {
    let t = this;
    for (let i = 0; i < t.dust.length; i++) {
        let d = t.dust[i];
        if (d.life > 0) {
            d.g.x += d.vx; d.g.y += d.vy;
            d.vy += 0.05; d.vx *= 0.98;
            d.life--;
            let f = d.life / d.max;
            d.g.alpha = f * 0.8;
            d.g.scale.set((d.r / 5) * (1.4 - f * 0.4));
            if (d.life <= 0) d.g.visible = false;
        }
    }
    for (let i = 0; i < t.smoke.length; i++) {
        let s = t.smoke[i];
        if (s.life > 0) {
            s.g.x += s.vx; s.g.y += s.vy;
            s.vy -= 0.02;
            s.life--;
            let f = s.life / s.max;
            s.g.alpha = f * 0.5;
            s.g.scale.set(1.4 - f);
            if (s.life <= 0) s.g.visible = false;
        }
    }
    let intensity = Math.max(0, Math.min(1.4, (t.worldspeed - t.basespeed) / 5));
    for (let i = 0; i < t.streaks.length; i++) {
        let s = t.streaks[i];
        if (s.active) {
            s.g.x -= t.worldspeed * 2.4;
            if (s.g.x + s.len < t.BL) { s.active = false; s.g.visible = false; }
        } else if (!settling && Math.random() < 0.09 + intensity * 0.34) {
            s.active = true; s.g.visible = true;
            s.g.x = t.BR;
            s.g.y = t.horizonY + Math.random() * (t.groundY - t.horizonY + 26);
            s.len = 22 + Math.random() * 40 + intensity * 30;
            s.g.width = s.len;
            s.g.alpha = 0.22 + intensity * 0.4;
        }
    }
    for (let i = 0; i < t.snow.length; i++) {
        let s = t.snow[i];
        s.g.y += s.vy; s.g.x += s.vx - t.worldspeed * 0.05;
        if (s.g.y > t.groundY) { s.g.y = -4; s.g.x = t.BL + Math.random() * t.BW; }
        if (s.g.x < t.BL) s.g.x = t.BR;
    }
};

// ---------------------------------------------------------------------------
// WHEEL FX — the painted car's wheels are baked into its texture and cannot
// spin. Rather than overlay fake wheels (which would have to line up with five
// different hand-drawn vehicles and looks broken the moment it doesn't), the
// motion is sold on the GROUND: two spin-blur smears under the car's front/rear
// quarters that stretch with speed, plus contact scuffs. Pooled, transform-only.
// ---------------------------------------------------------------------------
race.prototype.buildwheelfx = function () {
    let t = this;
    let carw = t.carmetrics().w;
    t.spin = [];
    let offs = [-carw * 0.26, carw * 0.24];
    for (let i = 0; i < offs.length; i++) {
        let s = new PIXI.Graphics();
        s.beginFill(0x000000, 0.34);
        s.drawEllipse(0, 0, 20, 4.4);
        s.endFill();
        s.beginFill(0xffffff, 0.20);
        s.drawEllipse(0, 0, 13, 2.0);
        s.endFill();
        s.x = t.playerX + offs[i];
        s.y = t.groundY + 9;
        t.shadowcontainer.addChild(s);
        t.spin.push({ g: s, off: offs[i], ph: i * 1.7 });
    }
};

// ============================================================================
// SPAWNABLE POOL — every obstacle + the charge pickup is built ONCE here and
// then recycled. Nothing in loop() allocates.
//
// Readability rules applied to all of them:
//   1. a contrast rim in the opposite value to the city road, so the silhouette
//      separates on snow (light road) as well as at night (dark road);
//   2. a ground contact shadow, so it reads as standing ON the road;
//   3. a collision box that matches the DRAWN art (a small fairness inset only);
//   4. a telegraph marker fired ~40 frames before the object exists.
// ============================================================================
race.prototype.roadislight = function () {
    let a = this.city.asphalt;
    let lum = 0.299 * ((a >> 16) & 255) + 0.587 * ((a >> 8) & 255) + 0.114 * (a & 255);
    return lum > 128;
};

race.prototype.buildobstaclepool = function () {
    let t = this;
    t.rimcol = t.roadislight() ? 0x141821 : 0xfdfdff;   // opposite value to the road
    t.rimalpha = t.roadislight() ? 0.85 : 0.92;
    t.pool = { 0: [], 1: [], 2: [], coin: [] };
    for (let k = 0; k < 3; k++) {
        for (let i = 0; i < 4; i++) t.pool[k].push(t.makeobstacle(k));
    }
    for (let i = 0; i < 6; i++) t.pool.coin.push(t.makecoin());  // clusters of 3, two clusters can overlap
    t.buildtelegraph();
};

race.prototype.obstaclekinds = function () { return [0, 1, 2]; };

race.prototype.makeobstacle = function (type) {
    let t = this;
    let ob = fox.makecontainer(0, 0, t.obstaclecontainer);
    let w, h, rim = new PIXI.Graphics(), art = new PIXI.Graphics();
    let sh = new PIXI.Graphics();

    if (type === 0) {
        // TRAFFIC CONE — short + wide, unmistakable orange triangle
        w = 50; h = 62;
        rim.beginFill(t.rimcol, t.rimalpha);
        rim.drawPolygon([-24, h / 2 - 4, 24, h / 2 - 4, 9, -h / 2 - 1, -9, -h / 2 - 1]);
        rim.drawRoundedRect(-25, h / 2 - 11, 50, 12, 4);
        rim.endFill();
        art.beginFill(0xef6a1a, 1); art.lineStyle(2.5, 0xa8420a, 1);
        art.drawPolygon([-19, h / 2 - 8, 19, h / 2 - 8, 6, -h / 2 + 4, -6, -h / 2 + 4]);
        art.endFill();
        art.lineStyle(0);
        art.beginFill(0xf7f2ea, 1); art.drawRoundedRect(-15, h / 2 - 30, 30, 10, 3); art.endFill();
        art.beginFill(0xf7f2ea, 1); art.drawRoundedRect(-11, h / 2 - 44, 22, 7, 3); art.endFill();
        art.beginFill(0x3a3a3a, 1); art.drawRoundedRect(-22, h / 2 - 9, 44, 9, 4); art.endFill();
        art.beginFill(0xffffff, 0.28); art.drawPolygon([-3, -h / 2 + 6, 1, -h / 2 + 6, 8, h / 2 - 11, 4, h / 2 - 11]); art.endFill();
    } else if (type === 1) {
        // STRIPED BARRIER — tall + narrow, yellow/black chevrons
        w = 46; h = 80;
        rim.beginFill(t.rimcol, t.rimalpha);
        rim.drawRoundedRect(-23, -h / 2 - 3, 46, 44, 7);
        rim.drawRoundedRect(-11, -h / 2, 13, h, 5);
        rim.drawRoundedRect(10, -h / 2, 13, h, 5);
        rim.drawRoundedRect(-20, h / 2 - 22, 40, 12, 4);      // cross-brace
        rim.endFill();
        art.beginFill(0x2b303a, 1);
        art.drawRoundedRect(-9, -h / 2 + 2, 11, h - 4, 3);
        art.drawRoundedRect(12, -h / 2 + 2, 11, h - 4, 3);
        art.drawRoundedRect(-18, h / 2 - 20, 36, 9, 3);       // cross-brace fills
        art.endFill();                                        // the empty lower box
        art.beginFill(0xf5c518, 1); art.lineStyle(2.5, 0x1a1d24, 1);
        art.drawRoundedRect(-20, -h / 2 + 2, 40, 36, 5); art.endFill();
        art.lineStyle(0); art.beginFill(0x1a1d24, 1);
        for (let s = 0; s < 4; s++) {
            let x0 = -21 + s * 12;
            art.drawPolygon([x0, -h / 2 + 36, x0 + 7, -h / 2 + 36, x0 + 15, -h / 2 + 3, x0 + 8, -h / 2 + 3]);
        }
        art.endFill();
        art.beginFill(0xff5a3c, 1); art.drawCircle(-3, h / 2 - 12, 4.5); art.endFill();
        art.beginFill(0xffd0c4, 1); art.drawCircle(-4.5, h / 2 - 13.5, 1.6); art.endFill();
    } else {
        // CRATE STACK — square silhouette, warm wood, reads instantly different
        w = 62; h = 66;
        rim.beginFill(t.rimcol, t.rimalpha);
        rim.drawRoundedRect(-31, -h / 2 - 2, 62, h + 4, 6);
        rim.endFill();
        art.beginFill(0x9a6a35, 1); art.lineStyle(2.5, 0x4b3115, 1);
        art.drawRoundedRect(-27, -h / 2 + 2, 54, 30, 4);
        art.drawRoundedRect(-21, -h / 2 + 32, 42, 28, 4);
        art.endFill();
        art.lineStyle(2, 0x4b3115, 1);
        art.moveTo(-27, -h / 2 + 17); art.lineTo(27, -h / 2 + 17);
        art.moveTo(-21, -h / 2 + 46); art.lineTo(21, -h / 2 + 46);
        art.lineStyle(0);
        art.beginFill(0xc79a5c, 1);
        art.drawRoundedRect(-24, -h / 2 + 5, 48, 8, 3);
        art.endFill();
        // bat stencil so it belongs in this game
        art.beginFill(0x2b2b2b, 1);
        art.drawPolygon([0, -h / 2 + 38, 9, -h / 2 + 42, 15, -h / 2 + 38, 12, -h / 2 + 48, 0, -h / 2 + 52,
            -12, -h / 2 + 48, -15, -h / 2 + 38, -9, -h / 2 + 42]);
        art.endFill();
    }

    sh.beginFill(0x000000, 0.30);
    sh.drawEllipse(0, h / 2 - 1, w * 0.46, 6);
    sh.endFill();

    ob.addChild(sh); ob.addChild(rim); ob.addChild(art);
    ob.type = type;
    ob.w = w; ob.h = h;
    ob.visible = false;
    ob.active = false;
    ob.baseY = t.groundY - h / 2 + 6;
    // collision box matches the DRAWN art with a small fairness inset
    ob.poly = fox.createSATpolygon(t.boxpoints(w - 12, h - 12), { x: 0, y: 0 });
    return ob;
};

race.prototype.makecoin = function () {
    let t = this;
    let co = fox.makecontainer(0, 0, t.coincontainer);
    // soft halo (fake glow, cheap — no filter)
    let halo = new PIXI.Graphics();
    halo.beginFill(0xffe14d, 0.20); halo.drawCircle(0, 0, 27); halo.endFill();
    halo.beginFill(0xffe14d, 0.16); halo.drawCircle(0, 0, 19); halo.endFill();
    co.addChild(halo);
    // contrast ring so the pickup separates on a bright snow sky too
    let ring = new PIXI.Graphics();
    ring.lineStyle(3, t.rimcol, t.rimalpha * 0.8);
    ring.drawCircle(0, 0, 17);
    co.addChild(ring);
    let disc = new PIXI.Graphics();
    disc.beginFill(0xffd83a, 1); disc.lineStyle(3.5, 0xffffff, 1); disc.drawCircle(0, 0, 15); disc.endFill();
    disc.lineStyle(0); disc.beginFill(0xb98600, 1);
    disc.drawPolygon([-2.5, -11, 5, -11, 0, -1, 6, -1, -5, 12, -1.5, 1, -7, 1]);
    disc.endFill();
    co.addChild(disc);
    co.halo = halo; co.disc = disc;
    co.visible = false;
    co.active = false;
    co.collected = false;
    co.poly = fox.createSATpolygon(t.boxpoints(30, 30), { x: 0, y: 0 });
    return co;
};

// ---- telegraph: warns BEFORE the object exists ------------------------------
race.prototype.buildtelegraph = function () {
    let t = this;
    let tg = fox.makecontainer(0, 0, t.hudcontainer);
    let plate = new PIXI.Graphics();
    plate.beginFill(0x000000, 0.42);
    plate.drawRoundedRect(-26, -25, 52, 50, 12);
    plate.endFill();
    tg.addChild(plate);
    let chev = new PIXI.Graphics();
    chev.beginFill(0xffffff, 1);
    chev.drawPolygon([6, -17, 20, 0, 6, 17, -1, 17, 13, 0, -1, -17]);
    chev.drawPolygon([-13, -17, 1, 0, -13, 17, -20, 17, -6, 0, -20, -17]);
    chev.endFill();
    tg.addChild(chev);
    tg.chev = chev;
    tg.plate = plate;
    tg.visible = false;
    tg.x = t.R + 200;   // park it well off-frame until it is actually needed
    tg.y = t.H / 2;
    t.telegraph = tg;
};

// choose + telegraph the next item; the actual spawn happens when the marker
// has been on screen long enough for a child to read it
race.prototype.queuenext = function () {
    let t = this;
    let coin = Math.random() >= 0.52;
    let type = coin ? -1 : (Math.random() < 0.42 ? 0 : (Math.random() < 0.62 ? 1 : 2));
    let y;
    if (coin) {
        y = t.groundY - (18 + Math.floor(Math.random() * 100));
    } else {
        let proto = t.pool[type][0];
        y = proto.baseY;
    }
    // charges arrive in a short ARC of 2-3 so a boost is actually reachable inside
    // one run; a single pickup every few seconds never filled the meter
    t.pending = { coin: coin, type: type, y: y, n: coin ? (2 + Math.floor(Math.random() * 2)) : 1 };
    t.pendingtimer = 42;
    let tg = t.telegraph;
    tg.visible = true;
    tg.x = t.R - 30;
    tg.y = Math.max(70, Math.min(t.H - 40, y));
    tg.chev.tint = coin ? 0xffe14d : 0xff5a3c;
    tg.plate.tint = coin ? 0x3a2c00 : 0x3a0d06;
    tg.scale.set(1);
    tg.alpha = 1;
};

race.prototype.spawnobstacle = function (type) {
    let t = this;
    if (typeof type !== 'number' || type < 0 || type > 2) type = Math.floor(Math.random() * 3);
    let list = t.pool[type];
    let ob = null;
    for (let i = 0; i < list.length; i++) if (!list[i].active) { ob = list[i]; break; }
    if (!ob) return null;                    // pool exhausted — skip, never allocate
    ob.active = true;
    ob.visible = true;
    ob.alpha = 1;
    ob.scale.set(1);
    ob.rotation = 0;
    ob.x = t.R + 56;
    ob.y = ob.baseY;
    fox.updateSATposition(ob.poly, ob);
    t.obstacles.push(ob);
    return ob;
};

race.prototype.spawncoin = function (y, xoff) {
    let t = this;
    let co = null;
    for (let i = 0; i < t.pool.coin.length; i++) if (!t.pool.coin[i].active) { co = t.pool.coin[i]; break; }
    if (!co) return null;
    co.active = true;
    co.visible = true;
    co.alpha = 1;
    co.scale.set(1);
    co.collected = false;
    co.x = t.R + 56 + (xoff || 0);
    co.y = (typeof y === 'number') ? y : t.groundY - (18 + Math.floor(Math.random() * 100));
    fox.updateSATposition(co.poly, co);
    t.coins.push(co);
    return co;
};

race.prototype.recycle = function (it, list, idx) {
    it.active = false;
    it.visible = false;
    list.splice(idx, 1);
};

// ============================================================================
// HUD — on-brand rounded chips, laid out against the REAL frame edges
// ============================================================================
race.prototype.buildhud = function () {
    let t = this;
    let L = t.L, R = t.R;

    // distance chip (top-left)
    fox.makeroundedbox(L + 14, 12, 116, 38, 13, 0x0d2136, 0.86, 2.5, 0x8fd0f2, 0.9, t.hudcontainer);
    let spd = new PIXI.Graphics();
    spd.beginFill(0xffe14d, 1);
    spd.drawPolygon([L + 28, 22, L + 37, 22, L + 32, 33, L + 40, 33, L + 25, 46, L + 30, 33, L + 23, 33]);
    spd.endFill();
    t.hudcontainer.addChild(spd);
    t.hudtext = fox.attachtext('0 m', L + 50, 31, t.hudcontainer, {
        fontFamily: 'fredoka', fontSize: 21, fill: 0xffffff,
        stroke: 0x0a2035, strokeThickness: 4
    }, false);

    // charge chip (top-right) + boost pips
    fox.makeroundedbox(R - 130, 12, 116, 38, 13, 0x2a1e00, 0.86, 2.5, 0xffe14d, 0.9, t.hudcontainer);
    let bolt = new PIXI.Graphics();
    bolt.beginFill(0xffe14d, 1);
    bolt.drawPolygon([R - 114, 21, R - 105, 21, R - 110, 31, R - 102, 31, R - 118, 45, R - 112, 31, R - 121, 31]);
    bolt.endFill();
    t.hudcontainer.addChild(bolt);
    t.cointext = fox.attachtext('0', R - 24, 31, t.hudcontainer, {
        fontFamily: 'fredoka', fontSize: 21, fill: 0xffe14d,
        stroke: 0x3a2a00, strokeThickness: 4
    }, false);
    t.cointext.anchor.set(1, 0.5);
    // 4 charge pips — fill up to a BOOST
    t.pips = [];
    for (let i = 0; i < t.boostneed; i++) {
        let p = fox.makeroundedbox(R - 130 + i * 39, 54, 34, 8, 4, 0xffffff, 1, 0, 0, 0, t.hudcontainer);
        p.tint = 0x333333;
        p.alpha = 0.55;
        t.pips.push(p);
    }

    // villain-proximity capsule (top-centre) with a mini villain face
    let barW = 210, barH = 15;
    let cx = t.CX;
    t.probarX = cx - barW / 2 + 22;
    t.probarY = 20;
    t.probarW = barW - 22;
    fox.makeroundedbox(cx - barW / 2 - 8, t.probarY - 10, barW + 18, barH + 20, 13, 0x000000, 0.55, 0, 0, 0, t.hudcontainer);
    let icon = fox.makecontainer(cx - barW / 2 + 4, t.probarY + barH / 2, t.hudcontainer);
    fox.makeroundedbox(-11, -11, 22, 18, 6, t.villain.color, 1, 1.8, 0x141414, 1, icon);
    fox.makeroundedbox(-4, -10, 9, 7, 2, t.villain.eye, 1, 1, 0x000000, 1, icon);
    t.hudicon = icon;
    fox.makeroundedbox(t.probarX, t.probarY, t.probarW, barH, 7, 0x0a0a0a, 0.7, 0, 0, 0, t.hudcontainer);
    // NOTE: draw the fill at the ORIGIN and move the Graphics, otherwise scale.x
    // also scales the rect's own x offset and leaves a 1px sliver stranded near
    // x=0 whenever the bar is nearly empty (it did, for the whole of P2/P3).
    t.probarfill = fox.makeroundedbox(0, 0, t.probarW, barH, 7, 0xe23b2e, 1, 0, 0, 0, t.hudcontainer);
    t.probarfill.x = t.probarX;
    t.probarfill.y = t.probarY;
    t.probarfill.scale.x = 0;
    fox.attachtext(t.villain.name + ' mengejar!', cx + 12, t.probarY + barH + 14, t.hudcontainer, {
        fontFamily: 'fredoka', fontSize: 14, fill: 0xffffff,
        stroke: 0x000000, strokeThickness: 4
    }, true);

    // DANGER chip — hidden until the villain is close
    t.dangerchip = fox.makecontainer(cx, t.probarY + barH + 46, t.hudcontainer);
    fox.makeroundedbox(-72, -20, 144, 40, 13, 0xd0180c, 1, 3, 0xffe14d, 1, t.dangerchip);
    fox.attachtext('AWAS!', 0, 0, t.dangerchip, {
        fontFamily: 'fredoka', fontSize: 24, fill: 0xffffff,
        stroke: 0x5a0600, strokeThickness: 5
    }, true);
    t.dangerchip.visible = false;

    // BOOST banner — hidden until a boost fires
    t.boostchip = fox.makecontainer(cx, t.H * 0.32, t.hudcontainer);
    fox.makeroundedbox(-118, -26, 236, 52, 16, 0x0f7d3a, 1, 4, 0xffe14d, 1, t.boostchip);
    fox.attachtext('TURBO!', 0, 0, t.boostchip, {
        fontFamily: 'fredoka', fontSize: 30, fill: 0xffffff,
        stroke: 0x03361a, strokeThickness: 6
    }, true);
    t.boostchip.visible = false;

    // one-line control hint (fades on first jump)
    // bottom-LEFT, clear of the hero car which sits mid-frame on the contact line
    t.hint = fox.attachtext('tap / spasi = lompat', t.L + 172, t.H - 20, t.hudcontainer, {
        fontFamily: 'fredoka', fontSize: 16, fill: 0xeaf6ff,
        stroke: 0x143b5e, strokeThickness: 4
    }, true);
};

// ---- input -----------------------------------------------------------------
race.prototype.setupinput = function () {
    let t = this;
    t.inputbox = fox.makebox(t.L, 0, t.VW, t.H, t.inputcontainer, 0x000000, 0.001);
    t.inputbox.interactive = true;
    t.inputbox.on('pointerdown', () => t.jump());
    // keyboard (Space / ArrowUp) — cleaned up in onkill
    if (t.keyhandler) document.removeEventListener('keydown', t.keyhandler);
    t.keyhandler = function (e) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ' || e.key === 'ArrowUp') {
            e.preventDefault();
            t.jump();
        }
    };
    document.addEventListener('keydown', t.keyhandler);
    t.onkill = function () {
        if (t.keyhandler) document.removeEventListener('keydown', t.keyhandler);
        t.keyhandler = null;
        if (t.hum && t.hum.ok) t.hum.stop();
        t.hum = null;
    };
};

// safe sfx — the pack does NOT ship every name the old code referenced
race.prototype.sfx = function (name, vol) {
    if (g.mutesfx) return;
    if (g.sfx && g.sfx[name]) fox.playsound(name, typeof vol === 'number' ? vol : 1);
};

race.prototype.jump = function () {
    let t = this;
    if (t.over) return;
    // a tap made just before landing is remembered instead of swallowed — small
    // children mash the screen and a dropped input reads as a broken game
    if (!t.grounded) { t.jumpbuffer = 9; return; }
    t.vy = t.jumpvel;
    t.grounded = false;
    t.squash = -0.14;                       // stretch on takeoff
    t.pitch = -0.10;                        // nose up
    t.emitdust(t.playerX - 22, t.groundY + 8, 6, 1.4, t.city.mark);
    if (t.hint) t.hint.visible = false;
    t.sfx('zpop', 0.9);
};

// ---- BOOST: the charge economy's payoff ------------------------------------
race.prototype.startboost = function () {
    let t = this;
    t.boosting = 105;
    t.boostsused++;
    t.chasergap = t.maxgap;
    t.pitch = -0.12;
    t.shake = Math.max(t.shake, 5);
    t.boostchip.visible = true;
    t.boostchip.scale.set(0.6);
    t.emitdust(t.playerX - 40, t.groundY + 6, 12, 4.2, 0xffe14d);
    t.sfx('zdone', 1);
};

// ============================================================================
// per-frame loop (fox ticker)
// ============================================================================
race.prototype.loop = function () {
    let t = this;
    if (!t.built) return;
    t.tick++;

    // ---- camera: shake (impact) + slide (chase framing) --------------------
    let sx = 0, sy = 0;
    if (t.shake > 0) {
        t.shake *= 0.86;
        if (t.shake < 0.3) t.shake = 0;
        sx = (Math.random() - 0.5) * t.shake;
        sy = (Math.random() - 0.5) * t.shake;
    }
    t.camx += (t.camtarget - t.camx) * 0.06;
    t.worldcontainer.x = sx + t.camx;
    t.worldcontainer.y = sy;

    // when over: keep particles settling + wheels animating, no gameplay
    if (t.over) {
        t.updatefx(true);
        if (t.chaserwheels) for (let i = 0; i < t.chaserwheels.length; i++) t.chaserwheels[i].rotation += 0.05;
        t.updateresults();
        return;
    }

    // ---- speed + difficulty ramp -------------------------------------------
    // gentle for the first ~600m, then a steady climb that plateaus so a young
    // player always has a reachable ceiling rather than an instant wall
    if (t.jumpbuffer > 0) t.jumpbuffer--;
    let ramp = Math.min(3.2, t.distance * 0.00046);
    let target = t.basespeed + ramp;
    if (t.boosting > 0) {
        t.boosting--;
        target *= 1.65;
        if (t.boostchip.scale.x < 1) t.boostchip.scale.set(Math.min(1, t.boostchip.scale.x + 0.09));
        if (t.boosting === 0) t.boostchip.visible = false;
        if (t.tick % 2 === 0) t.emitdust(t.playerX - 46, t.groundY + 6, 1, 3.4, 0xffe14d);
    }
    t.worldspeed += (target - t.worldspeed) * 0.08;
    t.distance += t.worldspeed;

    // HUD text only when the displayed value actually changes (no per-frame Text churn)
    let dm = Math.floor(t.distance / 10);
    if (dm !== t.hudlast.d) { t.hudlast.d = dm; t.hudtext.text = dm + ' m'; }

    // ---- scroll the procedural world ---------------------------------------
    t.scrollwrap(t.farskyc, t.worldspeed * 0.16);
    t.scrollwrap(t.nearskyc, t.worldspeed * 0.40);
    for (let i = 0; i < t.dashes.length; i++) {
        let d = t.dashes[i];
        d.p += t.worldspeed * 0.0016 * (0.3 + d.p * 1.5);
        if (d.p >= 1) d.p -= 1;
    }
    for (let i = 0; i < t.scuffs.length; i++) {
        let s = t.scuffs[i];
        s.p += t.worldspeed * 0.0013 * (0.3 + s.p * 1.5);
        if (s.p >= 1) s.p -= 1;
    }
    t.updateroadtokens();

    // ---- jump physics + idle bob (fake drive) ------------------------------
    if (!t.grounded || t.vy < 0) {
        let wasair = !t.grounded;
        t.vy += t.gravity;
        t.racecar.y += t.vy;
        if (t.racecar.y >= t.carbaseY) {
            t.racecar.y = t.carbaseY;
            t.vy = 0;
            if (wasair) {
                t.squash = 0.20;
                t.pitch = 0.09;
                t.shake = Math.max(t.shake, 3.4);
                t.emitdust(t.playerX - 14, t.groundY + 8, 8, 2.2, t.city.mark);
                t.emitdust(t.playerX + 18, t.groundY + 8, 4, 1.6, t.city.mark);
                t.sfx('ztowel', 0.35);
            }
            t.grounded = true;
            if (t.jumpbuffer > 0) { t.jumpbuffer = 0; t.jump(); }
        }
    } else {
        t.bob += 0.35;
        t.racecar.y = t.carbaseY + Math.sin(t.bob) * 2;
        t.dustcooldown--;
        if (t.dustcooldown <= 0) {
            t.emitdust(t.playerX - 24, t.groundY + 8, 1, 1.0, t.city.mark);
            t.dustcooldown = 6;
        }
    }

    // squash/stretch + pitch decay, applied on top of the base scale + flip
    if (t.squash !== 0) { t.squash *= 0.80; if (Math.abs(t.squash) < 0.005) t.squash = 0; }
    if (t.pitch !== 0) { t.pitch *= 0.88; if (Math.abs(t.pitch) < 0.002) t.pitch = 0; }
    t.racecar.scale.x = -t.carscale * (1 + t.squash);
    t.racecar.scale.y = t.carscale * (1 - t.squash);
    t.racecar.rotation = t.pitch + (t.grounded ? Math.sin(t.bob) * 0.018 : Math.max(-0.10, Math.min(0.10, t.vy * 0.005)));

    // ground shadow + wheel spin-blur follow the car
    let jumpH = t.carbaseY - t.racecar.y;
    let jf = Math.max(0, Math.min(1, jumpH / 140));
    if (t.carshadow) {
        t.carshadow.scale.set(1 - 0.55 * jf, 1 - 0.55 * jf);
        t.carshadow.alpha = 0.30 * (1 - 0.6 * jf);
    }
    let spinstretch = 1 + Math.min(1.5, (t.worldspeed - t.basespeed) * 0.34);
    for (let i = 0; i < t.spin.length; i++) {
        let s = t.spin[i];
        s.g.alpha = (1 - jf) * (0.55 + 0.35 * Math.abs(Math.sin(t.tick * 0.55 + s.ph)));
        s.g.scale.set(spinstretch * (0.9 + 0.25 * Math.sin(t.tick * 0.55 + s.ph)), 1 - 0.5 * jf);
    }

    // keep car collision poly on the car
    fox.updateSATposition(t.carpoly, { x: t.racecar.x, y: t.racecar.y + t.carCY });

    // ---- villain chase model ------------------------------------------------
    // Surges instead of a monotone creep: every few seconds it lunges, then eases
    // off. That is what makes it READ as a chase rather than a slider.
    t.surgetimer--;
    if (t.surgetimer <= 0 && t.boosting <= 0) {
        t.surge = 52;
        t.surgetimer = 190 + Math.floor(Math.random() * 130);
        t.chaserlunge = 1;
        t.emitsmoke(t.chaser.x - 40 * t.chaserscale, t.chaser.y - 8, true);
        t.emitsmoke(t.chaser.x - 46 * t.chaserscale, t.chaser.y - 4, true);
    }
    let creep = (0.11 + Math.min(0.55, t.distance * 0.000040)) * t.villain.aggr;
    if (t.surge > 0) { t.surge--; creep *= 3.1; }
    else creep *= 0.45;                       // breathe between surges
    if (t.boosting > 0) creep = -3.2;         // boost throws it back
    t.chasergap -= creep;
    if (t.chasergap > t.maxgap) t.chasergap = t.maxgap;

    let cx = t.playerX - t.chasergap;
    if (cx < t.chaserminX) cx = t.chaserminX;
    t.chaser.x = cx;
    t.chaserbob += 0.42;
    t.chaser.y = t.chaserbaseY + Math.sin(t.chaserbob) * 2.4;
    t.chaser.rotation = Math.sin(t.chaserbob) * 0.03 - (t.surge > 0 ? 0.05 : 0);
    if (t.chaserlunge > 0) {
        t.chaserlunge *= 0.90;
        if (t.chaserlunge < 0.02) t.chaserlunge = 0;
    }
    t.chaser.scale.set(1 + t.chaserlunge * 0.10, 1 - t.chaserlunge * 0.06);
    for (let i = 0; i < t.chaserwheels.length; i++) t.chaserwheels[i].rotation += 0.35 + t.worldspeed * 0.03;
    // chomping grille + blinking eyes make it feel alive
    let ch = t.chaserparts;
    ch.teeth.scale.y = 1 + Math.sin(t.tick * 0.28) * 0.24;
    if (t.tick % 96 < 5) { ch.eyes[0].scale.y = 0.25; ch.eyes[1].scale.y = 0.25; }
    else { ch.eyes[0].scale.y = 1; ch.eyes[1].scale.y = 1; }
    if (t.tick % 7 === 0) t.emitsmoke(cx - 40 * t.chaserscale, t.chaser.y - 6, t.surge > 0);

    // proximity bar (0 far .. 1 caught)
    let prox = 1 - Math.max(0, Math.min(1, (t.chasergap - t.catchgap) / (t.startgap - t.catchgap)));
    t.probarfill.scale.x = prox;
    t.probarfill.tint = prox > 0.66 ? 0xff2a1a : (prox > 0.33 ? 0xff8c1a : 0x38b000);
    t.hudicon.scale.set(1 + (prox > 0.66 ? Math.sin(t.tick * 0.3) * 0.10 : 0));

    // ---- DANGER state: legible warning BEFORE the catch --------------------
    let danger = prox > 0.70;
    if (danger !== t.danger) {
        t.danger = danger;
        t.dangerchip.visible = danger;
        ch.beam.visible = danger;
        if (danger) t.sfx('zwrong', 0.30);
    }
    if (danger) {
        let pulse = 0.5 + 0.5 * Math.sin(t.tick * 0.24);
        t.vignette.alpha = 0.35 + 0.65 * pulse * prox;
        t.dangerchip.scale.set(1 + pulse * 0.10);
        ch.beam.alpha = 0.35 + pulse * 0.45;
        ch.brows[0].rotation = 0.46; ch.brows[1].rotation = 0.46;
        t.camtarget = 34 * prox;               // slide the world so the villain fills more frame
        t.alarmtick--;
        if (t.alarmtick <= 0) { t.sfx('zclick', 0.28); t.alarmtick = Math.round(26 - 14 * prox); }
    } else {
        if (t.vignette.alpha > 0) t.vignette.alpha = Math.max(0, t.vignette.alpha - 0.05);
        ch.brows[0].rotation = 0.30; ch.brows[1].rotation = 0.30;
        t.camtarget = 0;
    }

    if (t.chasergap <= t.catchgap) { t.getcaught(); return; }

    // ---- telegraph + spawner ------------------------------------------------
    if (t.pending) {
        t.pendingtimer--;
        let tg = t.telegraph;
        let ph = 0.5 + 0.5 * Math.sin(t.tick * 0.34);
        tg.scale.set(0.9 + ph * 0.22);
        tg.alpha = 0.65 + ph * 0.35;
        if (t.pendingtimer <= 0) {
            if (t.pending.coin) {
                for (let k = 0; k < t.pending.n; k++) {
                    // shallow arc: middle charge sits a little higher
                    let lift = (k === 1 && t.pending.n > 2) ? 26 : 0;
                    t.spawncoin(t.pending.y - lift, k * 62);
                }
            } else {
                t.spawnobstacle(t.pending.type);
            }
            t.pending = null;
            tg.visible = false;
            let base = Math.max(42, 72 - t.distance * 0.0011);
            t.obstimer = Math.floor(base + Math.random() * 46);
        }
    } else {
        t.obstimer--;
        if (t.obstimer <= 0) t.queuenext();
    }

    // ---- move + recycle + collide obstacles ---------------------------------
    for (let i = t.obstacles.length - 1; i >= 0; i--) {
        let ob = t.obstacles[i];
        ob.x -= t.worldspeed;
        fox.updateSATposition(ob.poly, ob);
        t.response.clear();
        if (SAT.testPolygonPolygon(t.carpoly, ob.poly, t.response)) {
            if (t.boosting > 0) {
                // smashed aside instead of a crash — the boost's second payoff
                t.emitdust(ob.x, ob.y, 9, 3.4, 0xffe14d);
                t.sfx('ztrash', 0.7);
                g.score += 2;
                t.recycle(ob, t.obstacles, i);
                continue;
            }
            t.crash();
            return;
        }
        if (ob.x + ob.w < t.BL) t.recycle(ob, t.obstacles, i);
    }

    // ---- move + recycle + collect charge -------------------------------------
    for (let i = t.coins.length - 1; i >= 0; i--) {
        let co = t.coins[i];
        co.x -= t.worldspeed;
        co.disc.rotation += 0.14;
        co.halo.scale.set(1 + Math.sin(t.tick * 0.2 + i) * 0.12);
        fox.updateSATposition(co.poly, co);
        t.response.clear();
        if (!co.collected && SAT.testPolygonPolygon(t.carpoly, co.poly, t.response)) {
            co.collected = true;
            g.coins++;
            g.score += 5;
            if (g.coins !== t.hudlast.c) { t.hudlast.c = g.coins; t.cointext.text = '' + g.coins; }
            let filled = g.coins % t.boostneed;
            for (let k = 0; k < t.pips.length; k++) {
                let on = (filled === 0 && g.coins > 0) ? true : k < filled;
                t.pips[k].tint = on ? 0xffe14d : 0x333333;
                t.pips[k].alpha = on ? 1 : 0.55;
            }
            t.chasergap = Math.min(t.maxgap, t.chasergap + t.coinpush);
            t.emitdust(co.x, co.y, 7, 2.2, 0xffe14d);
            t.sfx('zselect', 0.85);
            t.recycle(co, t.coins, i);
            if (g.coins > 0 && g.coins % t.boostneed === 0) t.startboost();
            continue;
        }
        if (co.x + 26 < t.BL) t.recycle(co, t.coins, i);
    }

    // ---- particles / streaks / engine ---------------------------------------
    t.updatefx(false);
    if (t.hum && t.hum.ok && t.tick % 5 === 0) {
        let lvl = g.mutesfx ? 0 : 0.055 + (t.boosting > 0 ? 0.035 : 0);
        t.hum.set(lvl, 44 + (t.worldspeed - t.basespeed) * 7 + (t.boosting > 0 ? 16 : 0));
    }

    if (t.debughit) t.drawdebug();
};

// optional collision-box overlay (verification aid; off in play)
race.prototype.drawdebug = function () {
    let t = this;
    if (!t.dbg) {
        t.dbg = new PIXI.Graphics();
        t.debugcontainer.addChild(t.dbg);
    }
    let d = t.dbg;
    d.clear();
    d.lineStyle(2, 0x00ff88, 1);
    d.drawRect(t.carpoly.pos.x - t.carW / 2, t.carpoly.pos.y - t.carH / 2, t.carW, t.carH);
    d.lineStyle(2, 0xff3355, 1);
    for (let i = 0; i < t.obstacles.length; i++) {
        let ob = t.obstacles[i];
        d.drawRect(ob.x - (ob.w - 12) / 2, ob.y - (ob.h - 12) / 2, ob.w - 12, ob.h - 12);
    }
    d.lineStyle(2, 0xffdd33, 1);
    for (let i = 0; i < t.coins.length; i++) {
        let co = t.coins[i];
        d.drawRect(co.x - 15, co.y - 15, 30, 30);
    }
};

// wrap-scroll a two-sprite parallax layer
race.prototype.scrollwrap = function (cont, speed) {
    if (!cont) return;
    cont.x -= speed;
    if (cont.x <= cont.homex - cont.spanW) cont.x += cont.spanW;
};

// ---- end states ------------------------------------------------------------
race.prototype.crash = function () {
    let t = this;
    if (t.over) return;
    t.over = true;
    t.crashed = true;
    t.worldspeed = 0;
    t.shake = 18;
    t.pitch = 0.24;
    t.emitdust(t.playerX + 14, t.carbaseY - 12, 12, 3.0, 0xffd24d);
    if (t.inputbox) t.inputbox.interactive = false;
    if (t.car) t.car.rotation = -0.22;
    if (t.hum && t.hum.ok) t.hum.set(0, 40);
    t.sfx('zwrong', 1);
    t.results('MENABRAK!');
};

race.prototype.getcaught = function () {
    let t = this;
    if (t.over) return;
    t.over = true;
    t.caught = true;
    t.worldspeed = 0;
    t.shake = 12;
    if (t.inputbox) t.inputbox.interactive = false;
    // slam the villain right up behind the car for the "caught" beat
    t.chaser.x = t.playerX - Math.round(t.touchgap * 0.80);
    t.chaserlunge = 1;
    if (t.vignette) t.vignette.alpha = 0.9;
    if (t.hum && t.hum.ok) t.hum.set(0, 40);
    t.sfx('zwrong', 1);
    t.results('TERTANGKAP!');
};

// ============================================================================
// RESULTS — a landscape panel that puts the child's OWN painted car centre stage
// ============================================================================
race.prototype.results = function (title) {
    let t = this;
    let L = t.L, R = t.R, H = t.H, cx = t.CX;
    let metres = Math.floor(t.distance / 10);
    let isbest = metres > g.racebest;
    if (isbest) g.racebest = metres;

    if (t.telegraph) t.telegraph.visible = false;
    if (t.dangerchip) t.dangerchip.visible = false;
    if (t.boostchip) t.boostchip.visible = false;
    if (t.hint) t.hint.visible = false;
    if (t.vignette) t.vignette.alpha = 0;
    t.hudcontainer.alpha = 0.35;   // keep the run readable but push it back

    // dim
    fox.makebox(L, 0, t.VW, H, t.overcontainer, 0x081018, 0.62);

    let pw = Math.min(620, t.VW - 60), ph = 328;
    let px = cx, py = H * 0.50;
    fox.makeroundedbox(px - pw / 2 + 7, py - ph / 2 + 11, pw, ph, 24, 0x000000, 0.35, 0, 0, 0, t.overcontainer);
    fox.makeroundedbox(px - pw / 2, py - ph / 2, pw, ph, 24, 0x123454, 1, 4, 0x8fd0f2, 1, t.overcontainer);
    // header ribbon
    fox.makeroundedbox(px - pw / 2 + 22, py - ph / 2 - 20, pw - 44, 56, 17, 0xf5a623, 1, 4, 0xffffff, 1, t.overcontainer);
    fox.attachtext(title, px, py - ph / 2 + 9, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: 31, fill: 0xffffff,
        stroke: 0x8a4b00, strokeThickness: 6
    }, true);

    // ---- LEFT: the painted car, reparented (no second photo build) ---------
    let plateX = px - pw / 2 + 168;
    let plateY = py + 24;
    fox.makeroundedbox(plateX - 152, plateY - 92, 304, 176, 20, 0x0b2237, 1, 3, 0xffe14d, 0.9, t.overcontainer);
    t.resultcar = fox.makecontainer(plateX, plateY + 12, t.overcontainer);
    if (t.car && t.car.parent) {
        t.car.parent.removeChild(t.car);
        t.car.rotation = 0;
        t.resultcar.addChild(t.car);
        t.resultcar.scale.set(-0.40, 0.40);
    }
    fox.attachtext('MOBILMU', plateX, plateY - 74, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: 16, fill: 0xffe14d,
        stroke: 0x061423, strokeThickness: 4
    }, true);

    // confetti for a new personal best (pooled; animated by updateresults)
    t.confetti = [];
    if (isbest) {
        for (let i = 0; i < 26; i++) {
            let c = new PIXI.Graphics();
            c.beginFill(0xffffff, 1);
            c.drawRoundedRect(-4, -2.5, 8, 5, 2);
            c.endFill();
            c.tint = [0xffe14d, 0x63e6ff, 0xff7ac2, 0x8fff8f, 0xffa33a][i % 5];
            c.x = plateX + (Math.random() - 0.5) * 280;
            c.y = plateY - 92 - Math.random() * 80;
            t.overcontainer.addChild(c);
            t.confetti.push({ g: c, vy: 1 + Math.random() * 1.6, vx: (Math.random() - 0.5) * 1.2, sp: (Math.random() - 0.5) * 0.3 });
        }
    }
    t.resultbob = 0;

    // ---- RIGHT: the numbers -------------------------------------------------
    let sx = px + pw / 2 - 172;
    fox.attachtext('JARAK', sx, py - 82, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: 15, fill: 0x9fd0ff, stroke: 0x06203a, strokeThickness: 3
    }, true);
    fox.attachtext(metres + ' m', sx, py - 52, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: 38, fill: 0xffffff, stroke: 0x06203a, strokeThickness: 5
    }, true);
    fox.attachtext(g.coins + ' charge · ' + t.boostsused + ' turbo', sx, py - 18, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: 16, fill: 0xffe14d, stroke: 0x3a2a00, strokeThickness: 4
    }, true);
    fox.attachtext(isbest ? 'REKOR BARU!' : ('rekor: ' + g.racebest + ' m'), sx, py + 10, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: isbest ? 20 : 15,
        fill: isbest ? 0x8fff8f : 0x9fd0ff, stroke: 0x06203a, strokeThickness: 4
    }, true);

    t.makebtn('MAIN LAGI', sx, py + 52, 0x2e7d32, () => fox.runscene('race'), 244, 50, 23);
    t.makebtn('GANTI MUSUH', sx, py + 110, 0x1565c0, () => fox.runscene('racepick'), 244, 46, 20);
    // MENU lives in the dim, clear of the panel + its header ribbon
    t.makebtn('MENU', L + 82, 34, 0x455a70, () => fox.runscene('titlescreen'), 128, 42, 18);

    // the child's own car's character reacts — reuses the shipped voice lines
    let vn = (t.p && t.p.vehicle) ? t.p.vehicle : (g.vehiclenow || 1);
    let bank = isbest ? 'happy' : 'progress';
    let pick = 1 + Math.floor(Math.random() * 3);
    fox.delayaction(520, () => { t.sfx('zvo' + vn + bank + pick, 1); }, true);
    if (isbest) fox.delayaction(180, () => { t.sfx('zsaved', 0.9); }, true);
};

// results-screen animation (car bob + confetti); driven from loop() when over
race.prototype.updateresults = function () {
    let t = this;
    if (!t.resultcar) return;
    t.resultbob += 0.06;
    t.resultcar.y += Math.sin(t.resultbob) * 0.34;
    t.resultcar.rotation = Math.sin(t.resultbob * 0.8) * 0.02;
    if (!t.confetti) return;
    for (let i = 0; i < t.confetti.length; i++) {
        let c = t.confetti[i];
        c.g.y += c.vy;
        c.g.x += c.vx;
        c.g.rotation += c.sp;
        if (c.g.y > t.H) { c.g.y = -10; c.g.x = t.CX + (Math.random() - 0.5) * t.VW * 0.7; }
    }
};

race.prototype.makebtn = function (label, x, y, color, cb, bw, bh, fs) {
    let t = this;
    bw = bw || 210; bh = bh || 52; fs = fs || 23;
    let box = fox.makeroundedbox(-bw / 2, -bh / 2, bw, bh, 16, color, 1, 3, 0xffffff, 1, t.overcontainer);
    box.x = x; box.y = y;
    box.interactive = true;
    box.buttonMode = true;
    box.on('pointerdown', () => { fox.playbuttonsfx(); cb(); });
    fox.attachtext(label, x, y, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: fs, fill: 0xffffff,
        stroke: 0x000000, strokeThickness: 5
    }, true);
    return box;
};

// resize hook (main.js resize() calls g[scenename].resize()). The world is built
// once at the current dimensions; a real orientation change re-runs the scene.
race.prototype.resize = function () {
    let t = this;
    if (!t.built) return;
    let oldL = t.L, oldR = t.R, oldH = t.H;
    t.measureframe();
    // a real geometry change needs a rebuild — defer it out of main.js's resize()
    if ((t.L !== oldL || t.R !== oldR || t.H !== oldH) && !t.rebuilding) {
        t.rebuilding = true;
        fox.delayaction(60, () => { t.rebuilding = false; if (g.scenename === 'race') fox.runscene('race'); }, true);
    }
};

// tiny helper: 0xRRGGBB int -> '#rrggbb' for canvas gradients
function cssRGB(x) {
    if (typeof x === 'string') return x;
    return '#' + ('000000' + x.toString(16)).slice(-6);
}
