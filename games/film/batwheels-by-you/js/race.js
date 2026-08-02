// ============================================================================
// race.js  —  RACE MODE (P3 ART / POLISH)
// ----------------------------------------------------------------------------
// A side-scroller "kejar-kejaran" runner that reuses by-you's dormant "fox"
// runner infrastructure to race the EXACT car the child painted, chased by a
// chosen villain across a chosen city. Additive only — registered in
// loadingscreen.js JSscripts; entered via the real flow:
//   title BALAPAN -> pick vehicle -> paint (g.skipclean) -> racepick -> race.
//
// P3 = ALL VISUALS ARE PROCEDURAL + OFFLINE (no crawled/raster assets exist and
// they cannot be created). Everything below is drawn in-engine with PIXI.Graphics
// + canvas gradients + generated silhouette textures:
//   - Sky      : vertical canvas-gradient sprite per city (day/senja/malam/salju)
//                + celestial body (sun/moon) + stars/clouds.
//   - Skyline  : two parallax layers of building silhouettes, drawn once into a
//                RenderTexture then wrap-scrolled at different speeds (Gotham vibe;
//                lit windows at night).
//   - Road     : a converging trapezoid (narrow at the horizon, wide near the
//                camera) with a grass/dirt roadside gradient, curb edges, and
//                perspective center-lane dashes that accelerate + grow as they
//                scroll toward the camera (reads as speed).
//   - Villain  : a stylized procedural vehicle (rounded chassis + tinted canopy +
//                angry eyes + grille + a per-villain menacing accent) with its own
//                bob/tilt and spinning wheels, chasing from behind.
//   - Obstacles: procedural traffic cone (short) + striped barrier (tall).
//   - Charge   : a spinning glowing lightning-bolt collectible (halo disc, no
//                per-frame filter — cheap on a throttled tablet).
//   - Car juice: the painted car stays the hero + fake-drive motion: body bob,
//                jump squash/stretch, ground shadow, dust puffs, speed streaks.
//   - Feel     : screen shake on crash, dust burst on landing, on-brand rounded
//                HUD chips + results panel.
//
// PERFORMANCE: all particles/streaks/dust are POOLED (built once, transformed) —
// zero per-frame PIXI.Graphics allocation in the loop except one cleared+redrawn
// dash graphics (~21 small rects, cheap). Skyline is a static generated texture.
//
// Gameplay (P2) is UNCHANGED: villain chaser gap-model, 2 obstacle types + charge,
// difficulty ramp, jump physics, SAT collision, crash + caught end states, HUD,
// results/restart. Only the DRAW layer was upgraded.
// ============================================================================

// ---- city backdrops (procedural palettes; bg = by-you background index) ------
// sky = CSS gradient stops (top->bottom). asphalt/roadside/curb/window/building
// tints drive the procedural road + skyline. sky feature flags: sun/moon/stars/
// clouds/snow make each city instantly readable.
var RACE_CITIES = [
    {
        name: 'Siang', bg: 3,
        sky: ['#3e9be0', '#7cc4ef', '#cfeeff'],
        farB: 0x9ab8cc, nearB: 0x6d97b0, win: 0x39566b, winLit: false,
        roadside: ['#6fae54', '#4f8a3c'], asphalt: 0x565c66, asphaltTop: 0x6a7079,
        curb: 0xe8e2d4, mark: 0xf4ecd8,
        sun: 0xfff2ac, moon: false, stars: 0, clouds: 3, snow: false,
        // legacy P2 fields (kept so anything reading them still works)
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
        roadside: ['#d7e6ee', '#b3c9d4'], asphalt: 0xd7e3ea, asphaltTop: 0xe6f0f5,
        curb: 0x8fb2c4, mark: 0xbcd0dc,
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

// ============================================================================
// Shared procedural villain draw — used by BOTH the race chaser and the racepick
// cards so they always match. Draws facing RIGHT (travel direction). Returns the
// two wheel graphics so the caller can spin them.
//   parent : PIXI.Container to draw into (origin = villain center)
//   v      : a RACE_VILLAINS entry
//   s      : uniform scale (1 = full race size)
// ============================================================================
function RACE_drawvillain(parent, v, s) {
    s = s || 1;
    var wheels = [];
    var rr = function (x, y, w, h, rad, fill, fa, lw, lc, la) {
        return fox.makeroundedbox(x * s, y * s, w * s, h * s, rad * s, fill, fa, lw, lc, la, parent);
    };
    // ground contact shadow
    var sh = new PIXI.Graphics();
    sh.beginFill(0x000000, 0.22);
    sh.drawEllipse(0, 20 * s, 40 * s, 7 * s);
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
    // pupils
    rr(15, -37, 4, 5, 2, 0x111111, 1, 0, 0, 0);
    rr(0, -37, 4, 5, 2, 0x111111, 1, 0, 0, 0);
    // grille / teeth at the front bumper
    var teeth = new PIXI.Graphics();
    teeth.beginFill(0x141414, 1);
    teeth.drawRoundedRect(12 * s, -14 * s, 20 * s, 12 * s, 3 * s);
    teeth.endFill();
    teeth.beginFill(0xf2f2f2, 0.9);
    for (var ti = 0; ti < 3; ti++) teeth.drawRect((15 + ti * 6) * s, -13 * s, 3 * s, 10 * s);
    teeth.endFill();
    parent.addChild(teeth);
    // headlight
    rr(28, -22, 7, 8, 3, 0xfff2b0, 1, 1, 0x8a6a10, 1);

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
        wheels.push(wheel);
    }
    return wheels;
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

    // clean slate (covers pooled re-entry)
    t.removeChildren();

    // resolve chosen city + villain (defaults keep race runnable standalone)
    t.city = (typeof g.raceCity === 'number' && RACE_CITIES[g.raceCity]) ? RACE_CITIES[g.raceCity] : RACE_CITIES[0];
    t.villain = (typeof g.raceVillain === 'number' && RACE_VILLAINS[g.raceVillain]) ? RACE_VILLAINS[g.raceVillain] : RACE_VILLAINS[0];

    // ---- container stack (back -> front) -----------------------------------
    // worldcontainer holds everything that scrolls / shakes; hud + over sit
    // OUTSIDE it so the crash screen-shake never rattles the UI.
    t.worldcontainer = fox.makecontainer(0, 0, t);
    t.skycontainer = fox.makecontainer(0, 0, t.worldcontainer);
    t.skylinefar = fox.makecontainer(0, 0, t.worldcontainer);
    t.skylinenear = fox.makecontainer(0, 0, t.worldcontainer);
    t.roadcontainer = fox.makecontainer(0, 0, t.worldcontainer);
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
    t.inputcontainer = fox.makecontainer(0, 0, t);
    t.hudcontainer = fox.makecontainer(0, 0, t);
    t.overcontainer = fox.makecontainer(0, 0, t);

    // ---- runtime state -----------------------------------------------------
    t.built = false;
    t.over = false;             // true once crashed OR caught
    t.crashed = false;
    t.caught = false;
    t.distance = 0;
    t.basespeed = 4;
    t.worldspeed = t.basespeed;
    t.vy = 0;
    t.gravity = 0.9;
    t.jumpvel = -15.5;
    t.grounded = true;
    t.bob = 0;
    t.tick = 0;
    t.shake = 0;
    t.squash = 0;               // car squash/stretch (decays to 0)
    t.dustcooldown = 0;
    t.obstimer = 70;
    t.obstacles = [];
    t.coins = [];
    t.dashes = [];
    t.response = new SAT.Response();
    t.carscale = 0.42;

    // villain chase model (px gap behind the player)
    t.startgap = 150;
    t.chasergap = t.startgap;
    t.catchgap = 26;
    t.maxgap = 210;
    t.coinpush = 26;

    // score / charge counters (reuse engine globals)
    g.score = 0;
    g.coins = 0;

    t.buildcar();
    t.layout();
    t.buildchaser();
    t.initfx();
    t.buildhud();
    t.setupinput();

    fox.fadescreen();
    t.built = true;
    fox.trace('race scene ready (city=' + t.city.name + ' villain=' + t.villain.name + ')');
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
    // eyes/mouth + common.addglow). Fresh rebuild, NOT the live wash car.
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
    let W = t.W = g.screenwid;
    let H = t.H = g.screenhei;

    // horizon (sky meets skyline meets road) sits mid-low; road recedes above
    // the near action line where the car + obstacles ride.
    t.horizonY = Math.round(H * 0.50);
    t.groundY = H - Math.round(H * 0.14);   // near contact line for car/obstacles
    t.vanishX = Math.round(W * 0.5);

    // clip the scrolling world to the game screen [0,W]x[0,H] so nothing (skyline
    // wrap-sprites, streaks, off-screen spawns) bleeds into the landscape letterbox
    // margins the engine centers the scene inside. HUD/results sit outside the mask.
    t.worldmask = fox.makebox(0, 0, W, H, t, 0xffffff, 1);
    t.worldcontainer.mask = t.worldmask;

    t.buildsky();
    t.buildskyline();
    t.buildroad();

    // ---- CAR placement — left-center, flipped to face travel (right) -------
    t.playerX = Math.round(W * 0.24);
    t.racecar.x = t.playerX;
    t.carbaseY = t.groundY - 16;
    t.racecar.y = t.carbaseY;
    t.racecar.scale.set(-t.carscale, t.carscale); // negative x = face right

    // soft ground shadow under the car (shrinks in the air)
    t.carshadow = new PIXI.Graphics();
    t.carshadow.beginFill(0x000000, 0.30);
    t.carshadow.drawEllipse(0, 0, 46, 9);
    t.carshadow.endFill();
    t.carshadow.x = t.playerX;
    t.carshadow.y = t.groundY + 12;
    t.shadowcontainer.addChild(t.carshadow);

    // CAR collision poly (screen space, axis-aligned box over the car footprint)
    t.carW = 60; t.carH = 60;
    t.carpoly = fox.createSATpolygon(t.boxpoints(t.carW, t.carH),
        { x: t.racecar.x, y: t.carbaseY - 26 });
};

// canvas vertical-gradient sprite (one small texture stretched) — cheap + offline
race.prototype.gradsprite = function (w, h, stops, parent) {
    let cv = document.createElement('canvas');
    cv.width = 8;
    cv.height = Math.max(2, Math.round(h));
    let ctx = cv.getContext('2d');
    let grd = ctx.createLinearGradient(0, 0, 0, cv.height);
    for (let i = 0; i < stops.length; i++) grd.addColorStop(stops[i][0], stops[i][1]);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, cv.width, cv.height);
    let sp = new PIXI.Sprite(PIXI.Texture.from(cv));
    sp.width = w;
    sp.height = h;
    parent.addChild(sp);
    return sp;
};

race.prototype.buildsky = function () {
    let t = this;
    let W = t.W, H = t.H, c = t.city;
    // gradient sky spanning sky region (down to a bit below horizon so the road
    // gradient overlaps cleanly)
    let stops = [[0, c.sky[0]], [0.6, c.sky[1]], [1, c.sky[2]]];
    t.gradsprite(W, t.horizonY + 10, stops, t.skycontainer);

    // celestial body
    if (c.moon) {
        let m = new PIXI.Graphics();
        m.beginFill(0xffffff, 0.10); m.drawCircle(0, 0, 40); m.endFill();  // halo
        m.beginFill(c.moon, 1); m.drawCircle(0, 0, 26); m.endFill();
        m.beginFill(0x000000, 0.06); m.drawCircle(9, -6, 6); m.drawCircle(-6, 7, 4); m.endFill(); // craters
        m.x = Math.round(W * 0.80); m.y = Math.round(t.horizonY * 0.34);
        t.skycontainer.addChild(m);
    } else if (c.sun) {
        let s = new PIXI.Graphics();
        s.beginFill(0xffffff, 0.14); s.drawCircle(0, 0, 46); s.endFill();  // halo
        s.beginFill(c.sun, 1); s.drawCircle(0, 0, 30); s.endFill();
        s.x = Math.round(W * 0.78); s.y = Math.round(t.horizonY * 0.30);
        t.skycontainer.addChild(s);
    }

    // stars (night)
    if (c.stars > 0) {
        let sg = new PIXI.Graphics();
        sg.beginFill(0xffffff, 0.9);
        for (let i = 0; i < c.stars; i++) {
            let sx = ((i * 73) % W);
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
        for (let i = 0; i < c.clouds; i++) {
            let cx = Math.round(W * (0.14 + i * 0.32));
            let cy = Math.round(t.horizonY * (0.22 + (i % 2) * 0.16));
            cg.drawEllipse(cx, cy, 34, 14);
            cg.drawEllipse(cx + 22, cy + 4, 24, 11);
            cg.drawEllipse(cx - 22, cy + 5, 20, 9);
        }
        cg.endFill();
        t.skycontainer.addChild(cg);
    }
};

// draw a strip of building silhouettes into a Graphics, bake to a texture, then
// wrap-scroll two copies. Deterministic per (seed) so both copies + reruns match.
race.prototype.buildskyline = function () {
    let t = this;
    let W = t.W, c = t.city;

    let mkstrip = function (spanW, h, fill, seed, opts) {
        opts = opts || {};
        let gfx = new PIXI.Graphics();
        // deterministic pseudo-random
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
            // roof detail: a small block or antenna
            if (rnd() > 0.5) gfx.drawRect(bx + bw * 0.3, by - 6, bw * 0.35, 6);
            gfx.endFill();
            // windows
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
        return tex;
    };

    let wrap = function (tex, y, parent, spanW) {
        let cont = fox.makecontainer(0, y, parent);
        let s1 = new PIXI.Sprite(tex); s1.x = 0;
        let s2 = new PIXI.Sprite(tex); s2.x = spanW;
        cont.addChild(s1); cont.addChild(s2);
        cont.spanW = spanW;
        return cont;
    };

    // FAR skyline: shorter, desaturated, no lit windows, slow
    let farH = Math.round(t.horizonY * 0.42);
    let farTex = mkstrip(W, farH, c.farB, 12345, { minW: 30, maxW: 60, minH: 20, maxH: farH, gap: 6, win: c.win, winLit: false });
    t.farskyc = wrap(farTex, t.horizonY - farH, t.skylinefar, W);

    // NEAR skyline: taller, richer, lit windows at night, faster
    let nearH = Math.round(t.horizonY * 0.60);
    let nearTex = mkstrip(W, nearH, c.nearB, 6789, { minW: 40, maxW: 78, minH: 30, maxH: nearH, gap: 10, win: c.win, winLit: c.winLit });
    t.nearskyc = wrap(nearTex, t.horizonY - nearH, t.skylinenear, W);
};

race.prototype.buildroad = function () {
    let t = this;
    let W = t.W, H = t.H, c = t.city;
    let hY = t.horizonY, vx = t.vanishX;

    // roadside ground (grass/dirt/snow) gradient fills below the horizon
    t.gradsprite(W, H - hY, [[0, cssRGB(c.roadside[0])], [1, cssRGB(c.roadside[1])]], t.roadcontainer)
        .y = hY;

    // converging asphalt trapezoid: narrow at horizon -> wide near camera
    t.roadBottomHalf = Math.round(W * 0.46);
    t.roadTopHalf = Math.round(W * 0.05);
    let bl = vx - t.roadBottomHalf, br = vx + t.roadBottomHalf;
    let tl = vx - t.roadTopHalf, tr = vx + t.roadTopHalf;
    let road = new PIXI.Graphics();
    road.beginFill(c.asphalt, 1);
    road.drawPolygon([tl, hY, tr, hY, br, H, bl, H]);
    road.endFill();
    // haze band at the far end of the road
    road.beginFill(c.asphaltTop, 0.7);
    road.drawPolygon([tl, hY, tr, hY, vx + t.roadTopHalf * 3, hY + 26, vx - t.roadTopHalf * 3, hY + 26]);
    road.endFill();
    t.roadcontainer.addChild(road);

    // curb edges (converging lines)
    let curb = new PIXI.Graphics();
    curb.lineStyle(4, c.curb, 1);
    curb.moveTo(tl, hY); curb.lineTo(bl, H);
    curb.moveTo(tr, hY); curb.lineTo(br, H);
    t.roadcontainer.addChild(curb);

    // perspective center-lane dash tokens (drawn each frame into one Graphics)
    t.dashgfx = new PIXI.Graphics();
    t.dashcontainer.addChild(t.dashgfx);
    let ND = 7;
    for (let i = 0; i < ND; i++) t.dashes.push({ p: i / ND });
    t.drawdashes();
};

// draw all perspective dashes for the current frame (cheap: ~ND*3 rounded rects)
race.prototype.drawdashes = function () {
    let t = this;
    let g2 = t.dashgfx;
    let hY = t.horizonY, H = t.H, vx = t.vanishX;
    g2.clear();
    g2.beginFill(t.city.mark, 1);
    let lanes = [-1, 0, 1];
    for (let i = 0; i < t.dashes.length; i++) {
        let p = t.dashes[i].p;
        let pe = p * p;                       // perspective easing (accelerate near)
        let y = hY + (H - hY) * pe;
        let halfw = t.roadTopHalf + (t.roadBottomHalf - t.roadTopHalf) * pe;
        let dw = 3 + 26 * pe;                 // dash width grows toward camera
        let dh = 2 + 16 * pe;                 // dash length grows
        for (let l = 0; l < lanes.length; l++) {
            if (lanes[l] === 0) {
                g2.drawRoundedRect(vx - dw / 2, y - dh / 2, dw, dh, dh / 2);
            } else {
                // side lane hints converge to the vanishing point
                let lx = vx + lanes[l] * halfw * 0.62;
                let sw = dw * 0.5, sh = dh * 0.7;
                g2.drawRoundedRect(lx - sw / 2, y - sh / 2, sw, sh, sh / 2);
            }
        }
    }
    g2.endFill();
};

race.prototype.boxpoints = function (w, h) {
    return [
        { x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 },
        { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }
    ];
};

// ---- villain chaser (procedural) -------------------------------------------
race.prototype.buildchaser = function () {
    let t = this;
    let ch = t.chaser = fox.makecontainer(0, 0, t.chasercontainer);
    t.chaserwheels = RACE_drawvillain(ch, t.villain, 1);
    ch.y = t.groundY - 14;
    ch.x = 8;
    t.chaserbob = 0;
};

// ============================================================================
// FX POOLS — dust puffs, speed streaks, villain smoke, snow (built once)
// ============================================================================
race.prototype.initfx = function () {
    let t = this;
    // dust puffs (kicked up behind the car / landing burst)
    t.dust = [];
    for (let i = 0; i < 18; i++) {
        let d = new PIXI.Graphics();
        d.beginFill(0xffffff, 1); d.drawCircle(0, 0, 5); d.endFill();
        d.visible = false;
        t.dustcontainer.addChild(d);
        t.dust.push({ g: d, life: 0, max: 1, vx: 0, vy: 0, r: 5 });
    }
    // speed streaks (intensify with speed)
    t.streaks = [];
    for (let i = 0; i < 10; i++) {
        let s = new PIXI.Graphics();
        s.beginFill(0xffffff, 0.55); s.drawRoundedRect(0, 0, 30, 2.4, 1.2); s.endFill();
        s.visible = false;
        t.streakcontainer.addChild(s);
        t.streaks.push({ g: s, active: false, len: 30 });
    }
    // villain exhaust smoke
    t.smoke = [];
    for (let i = 0; i < 8; i++) {
        let s = new PIXI.Graphics();
        s.beginFill(0x3a3a3a, 1); s.drawCircle(0, 0, 5); s.endFill();
        s.visible = false;
        t.smokecontainer.addChild(s);
        t.smoke.push({ g: s, life: 0, max: 1, vx: 0, vy: 0, r: 5 });
    }
    // snow (salju only)
    t.snow = [];
    if (t.city.snow) {
        for (let i = 0; i < 26; i++) {
            let s = new PIXI.Graphics();
            s.beginFill(0xffffff, 0.9); s.drawCircle(0, 0, 1.6 + Math.random() * 1.6); s.endFill();
            s.x = Math.random() * t.W;
            s.y = Math.random() * t.horizonY;
            t.snowcontainer.addChild(s);
            t.snow.push({ g: s, vy: 0.5 + Math.random() * 0.9, vx: -0.4 - Math.random() * 0.6 });
        }
    }
};

race.prototype.emitdust = function (x, y, n, spread, tint) {
    let t = this;
    for (let k = 0; k < n; k++) {
        // find a free puff
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

race.prototype.updatefx = function (settling) {
    let t = this;
    // dust
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
    // villain smoke
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
    // speed streaks
    let intensity = Math.max(0, (t.worldspeed - t.basespeed) / 6); // 0..~1
    for (let i = 0; i < t.streaks.length; i++) {
        let s = t.streaks[i];
        if (s.active) {
            s.g.x -= t.worldspeed * 2.1;
            if (s.g.x + s.len < 0) s.active = false, s.g.visible = false;
        } else if (!settling && Math.random() < 0.10 + intensity * 0.30) {
            s.active = true; s.g.visible = true;
            s.g.x = t.W + 10;
            // bias streaks to the road/lower band + a few in the sky for wind
            s.g.y = t.horizonY + Math.random() * (t.groundY - t.horizonY + 20);
            s.len = 20 + Math.random() * 34;
            s.g.width = s.len;
            s.g.alpha = 0.25 + intensity * 0.4;
        }
    }
    // snow
    for (let i = 0; i < t.snow.length; i++) {
        let s = t.snow[i];
        s.g.y += s.vy; s.g.x += s.vx - t.worldspeed * 0.05;
        if (s.g.y > t.groundY) { s.g.y = -4; s.g.x = Math.random() * t.W; }
        if (s.g.x < -4) s.g.x = t.W + 4;
    }
};

// ============================================================================
// HUD — on-brand rounded chips
// ============================================================================
race.prototype.buildhud = function () {
    let t = this;
    let W = t.W;

    // distance chip (top-left)
    let dchip = fox.makeroundedbox(10, 12, 96, 34, 12, 0x0d2136, 0.82, 2, 0x8fd0f2, 0.9, t.hudcontainer);
    let spd = new PIXI.Graphics(); // little speed glyph
    spd.beginFill(0xffe14d, 1);
    spd.drawPolygon([22, 24, 30, 24, 26, 34, 33, 34, 20, 46, 24, 34, 18, 34]);
    spd.endFill();
    t.hudcontainer.addChild(spd);
    t.hudtext = fox.attachtext('0 m', 40, 29, t.hudcontainer, {
        fontFamily: 'fredoka', fontSize: 20, fill: 0xffffff,
        stroke: 0x0a2035, strokeThickness: 4
    }, false);

    // charge chip (top-right)
    fox.makeroundedbox(W - 106, 12, 96, 34, 12, 0x2a1e00, 0.82, 2, 0xffe14d, 0.9, t.hudcontainer);
    // bolt pip
    let bolt = new PIXI.Graphics();
    bolt.beginFill(0xffe14d, 1);
    bolt.drawPolygon([W - 92, 20, W - 84, 20, W - 88, 28, W - 82, 28, W - 96, 40, W - 90, 28, W - 98, 28]);
    bolt.endFill();
    t.hudcontainer.addChild(bolt);
    t.cointext = fox.attachtext('0', W - 20, 29, t.hudcontainer, {
        fontFamily: 'fredoka', fontSize: 20, fill: 0xffe14d,
        stroke: 0x3a2a00, strokeThickness: 4
    }, false);
    t.cointext.anchor.set(1, 0.5); // right-align

    // villain-proximity capsule (top-center) with a mini villain face
    let barW = 150, barH = 12;
    t.probarX = W / 2 - barW / 2 + 16;
    t.probarY = 22;
    t.probarW = barW - 16;
    fox.makeroundedbox(W / 2 - barW / 2 - 4, t.probarY - 8, barW + 12, barH + 16, 12, 0x000000, 0.5, 0, 0, 0, t.hudcontainer);
    // mini villain head icon
    let icon = fox.makecontainer(W / 2 - barW / 2 + 2, t.probarY + barH / 2, t.hudcontainer);
    let ib = fox.makeroundedbox(-9, -9, 18, 15, 5, t.villain.color, 1, 1.5, 0x141414, 1, icon);
    fox.makeroundedbox(-3, -8, 8, 6, 2, t.villain.eye, 1, 1, 0x000000, 1, icon);
    t.probarbg = fox.makeroundedbox(t.probarX, t.probarY, t.probarW, barH, 6, 0x0a0a0a, 0.7, 0, 0, 0, t.hudcontainer);
    t.probarfill = fox.makeroundedbox(t.probarX, t.probarY, t.probarW, barH, 6, 0xe23b2e, 1, 0, 0, 0, t.hudcontainer);
    t.probarfill.pivot.x = 0;
    t.probarfill.scale.x = 0;
    fox.attachtext(t.villain.name, W / 2 + 8, t.probarY + barH + 12, t.hudcontainer, {
        fontFamily: 'fredoka', fontSize: 13, fill: 0xffffff,
        stroke: 0x000000, strokeThickness: 4
    }, true);

    // one-line control hint (fades on first jump)
    t.hint = fox.attachtext('tap / space = lompat', W / 2, t.H - 24, t.hudcontainer, {
        fontFamily: 'fredoka', fontSize: 15, fill: 0xeaf6ff,
        stroke: 0x143b5e, strokeThickness: 4
    }, true);
};

// ---- input -----------------------------------------------------------------
race.prototype.setupinput = function () {
    let t = this;
    // near-invisible full-screen interactive box -> tap/click jumps
    t.inputbox = fox.makebox(0, 0, t.W, t.H, t.inputcontainer, 0x000000, 0.001);
    t.inputbox.interactive = true;
    t.inputbox.on('pointerdown', () => t.jump());
    // keyboard (Space / ArrowUp) — cleaned up in onkill
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
    };
};

race.prototype.jump = function () {
    let t = this;
    if (t.over || !t.grounded) return;
    t.vy = t.jumpvel;
    t.grounded = false;
    t.squash = -0.14;                       // stretch on takeoff
    t.emitdust(t.playerX - 16, t.groundY + 8, 5, 1.4, t.city.mark);
    if (t.hint) { t.hint.visible = false; }
    if (g.sfx && g.sfx['zclick']) fox.playsound('zclick');
};

// ---- per-frame loop (fox ticker) -------------------------------------------
race.prototype.loop = function () {
    let t = this;
    if (!t.built) return;
    t.tick++;

    // screen shake (decays) — applied to the world container only
    if (t.shake > 0) {
        t.shake *= 0.86;
        if (t.shake < 0.3) t.shake = 0;
        t.worldcontainer.x = (Math.random() - 0.5) * t.shake;
        t.worldcontainer.y = (Math.random() - 0.5) * t.shake;
    } else if (t.worldcontainer.x !== 0 || t.worldcontainer.y !== 0) {
        t.worldcontainer.x = 0; t.worldcontainer.y = 0;
    }

    // when over: keep particles settling + wheels/shake animating, no gameplay
    if (t.over) {
        t.updatefx(true);
        if (t.chaserwheels) for (let i = 0; i < t.chaserwheels.length; i++) t.chaserwheels[i].rotation += 0.05;
        return;
    }

    // difficulty ramp
    t.distance += t.worldspeed;
    let ramp = t.distance * 0.0006;
    t.worldspeed = t.basespeed + ramp;
    if (t.hudtext) t.hudtext.text = Math.floor(t.distance / 10) + ' m';

    // ---- scroll the procedural world --------------------------------------
    t.scrollwrap(t.farskyc, t.worldspeed * 0.18);
    t.scrollwrap(t.nearskyc, t.worldspeed * 0.42);
    // perspective dashes advance toward the camera (accelerate near)
    for (let i = 0; i < t.dashes.length; i++) {
        let d = t.dashes[i];
        d.p += t.worldspeed * 0.0016 * (0.3 + d.p * 1.5);
        if (d.p >= 1) d.p -= 1;
    }
    t.drawdashes();

    // ---- jump physics + idle bob (fake drive) -----------------------------
    if (!t.grounded || t.vy < 0) {
        let wasair = !t.grounded;
        t.vy += t.gravity;
        t.racecar.y += t.vy;
        if (t.racecar.y >= t.carbaseY) {
            t.racecar.y = t.carbaseY;
            t.vy = 0;
            if (wasair) {                    // landing beat
                t.squash = 0.20;
                t.shake = Math.max(t.shake, 3);
                t.emitdust(t.playerX - 10, t.groundY + 8, 7, 2.2, t.city.mark);
                t.emitdust(t.playerX + 14, t.groundY + 8, 3, 1.6, t.city.mark);
            }
            t.grounded = true;
        }
        t.racecar.rotation = Math.max(-0.12, Math.min(0.12, t.vy * 0.006));
    } else {
        t.bob += 0.35;
        t.racecar.y = t.carbaseY + Math.sin(t.bob) * 2;
        t.racecar.rotation = Math.sin(t.bob) * 0.02;
        // trickle of dust while driving
        t.dustcooldown--;
        if (t.dustcooldown <= 0) {
            t.emitdust(t.playerX - 18, t.groundY + 8, 1, 1.0, t.city.mark);
            t.dustcooldown = 6;
        }
    }

    // squash/stretch decays toward 0, applied on top of the base scale + flip
    if (t.squash !== 0) {
        t.squash *= 0.80;
        if (Math.abs(t.squash) < 0.005) t.squash = 0;
    }
    t.racecar.scale.x = -t.carscale * (1 + t.squash);
    t.racecar.scale.y = t.carscale * (1 - t.squash);

    // ground shadow follows the car; shrinks/fades with jump height
    let jumpH = t.carbaseY - t.racecar.y;
    let jf = Math.max(0, Math.min(1, jumpH / 130));
    if (t.carshadow) {
        t.carshadow.scale.set(1 - 0.55 * jf, 1 - 0.55 * jf);
        t.carshadow.alpha = 0.30 * (1 - 0.6 * jf);
    }

    // keep car collision poly on the car
    fox.updateSATposition(t.carpoly, { x: t.racecar.x, y: t.racecar.y - 26 });

    // ---- villain chase model ----------------------------------------------
    // creep in with difficulty (and villain aggression); pushed back by charge.
    let creep = (0.06 + Math.min(0.5, t.distance * 0.00004)) * t.villain.aggr;
    t.chasergap -= creep;
    if (t.chasergap > t.maxgap) t.chasergap = t.maxgap;
    // place chaser: sits at left when far, creeps toward player as gap shrinks
    let cx = t.playerX - t.chasergap;
    if (cx < 8) cx = 8;
    t.chaser.x = cx;
    t.chaserbob += 0.4;
    t.chaser.y = (t.groundY - 14) + Math.sin(t.chaserbob) * 2;
    t.chaser.rotation = Math.sin(t.chaserbob) * 0.03;
    if (t.chaserwheels) for (let i = 0; i < t.chaserwheels.length; i++) t.chaserwheels[i].rotation += 0.35 + t.worldspeed * 0.02;
    // villain exhaust smoke
    if (t.tick % 10 === 0) t.emitsmoke(cx - 34, t.chaser.y - 6);
    // proximity bar (0 far .. 1 caught)
    let prox = 1 - Math.max(0, Math.min(1, (t.chasergap - t.catchgap) / (t.startgap - t.catchgap)));
    if (t.probarfill) {
        t.probarfill.scale.x = prox;
        t.probarfill.tint = prox > 0.66 ? 0xff2a1a : (prox > 0.33 ? 0xff8c1a : 0x38b000);
    }
    if (t.chasergap <= t.catchgap) { t.getcaught(); return; }

    // ---- spawner (obstacle OR charge collectible) --------------------------
    t.obstimer--;
    if (t.obstimer <= 0) {
        if (Math.random() < 0.62) t.spawnobstacle();
        else t.spawncoin();
        // spawn rate tightens with distance
        let base = Math.max(38, 72 - t.distance * 0.0009);
        t.obstimer = Math.floor(base + Math.random() * 45);
    }

    // ---- move + recycle + collide obstacles --------------------------------
    for (let i = t.obstacles.length - 1; i >= 0; i--) {
        let ob = t.obstacles[i];
        ob.x -= t.worldspeed;
        fox.updateSATposition(ob.poly, ob);
        t.response.clear();
        if (SAT.testPolygonPolygon(t.carpoly, ob.poly, t.response)) {
            t.crash();
            return;
        }
        if (ob.x + ob.w < -40) {
            t.obstacles.splice(i, 1);
            t.obstaclecontainer.removeChild(ob);
            ob.destroy();
        }
    }

    // ---- move + recycle + collect charge -----------------------------------
    for (let i = t.coins.length - 1; i >= 0; i--) {
        let co = t.coins[i];
        co.x -= t.worldspeed;
        // spin the bolt disc + pulse the halo
        if (co.disc) co.disc.rotation += 0.14;
        if (co.halo) co.halo.scale.set(1 + Math.sin(t.tick * 0.2 + i) * 0.12);
        fox.updateSATposition(co.poly, co);
        t.response.clear();
        if (!co.collected && SAT.testPolygonPolygon(t.carpoly, co.poly, t.response)) {
            co.collected = true;
            g.coins++;
            g.score += 5;
            if (t.cointext) t.cointext.text = '' + g.coins;
            // charge pushes the villain back + a little pop
            t.chasergap = Math.min(t.maxgap, t.chasergap + t.coinpush);
            t.emitdust(co.x, co.y, 6, 2.2, 0xffe14d);
            if (g.sfx && g.sfx['zselect']) fox.playsound('zselect');
            t.coins.splice(i, 1);
            t.coincontainer.removeChild(co);
            co.destroy();
            continue;
        }
        if (co.x + 20 < -40) {
            t.coins.splice(i, 1);
            t.coincontainer.removeChild(co);
            co.destroy();
        }
    }

    // ---- particles / streaks ----------------------------------------------
    t.updatefx(false);
};

// wrap-scroll a two-sprite parallax layer
race.prototype.scrollwrap = function (cont, speed) {
    if (!cont) return;
    cont.x -= speed;
    if (cont.x <= -cont.spanW) cont.x += cont.spanW;
};

race.prototype.emitsmoke = function (x, y) {
    let t = this;
    for (let i = 0; i < t.smoke.length; i++) {
        let s = t.smoke[i];
        if (s.life <= 0) {
            s.g.visible = true;
            s.g.x = x; s.g.y = y;
            s.vx = -t.worldspeed * 0.5 - Math.random();
            s.vy = -0.4 - Math.random() * 0.8;
            s.max = 16 + Math.random() * 10;
            s.life = s.max;
            s.g.scale.set(0.6);
            break;
        }
    }
};

// ============================================================================
// OBSTACLES + COLLECTIBLE (procedural)
// ============================================================================
// type 0 = traffic cone (short), type 1 = striped barrier (tall). Both jumpable.
race.prototype.spawnobstacle = function () {
    let t = this;
    let type = Math.random() < 0.5 ? 0 : 1;
    let ob = fox.makecontainer(0, 0, t.obstaclecontainer);
    let w, h;
    if (type === 0) {
        // traffic cone: orange triangle + white band + dark base
        w = 34; h = 42;
        let base = new PIXI.Graphics();
        base.beginFill(0x000000, 0.22); base.drawEllipse(0, h / 2 - 2, 17, 5); base.endFill();
        ob.addChild(base);
        let cone = new PIXI.Graphics();
        cone.beginFill(0xef6a1a, 1); cone.lineStyle(2, 0xa8420a, 1);
        cone.drawPolygon([-13, h / 2 - 6, 13, h / 2 - 6, 4, -h / 2 + 4, -4, -h / 2 + 4]);
        cone.endFill();
        cone.lineStyle(0);
        cone.beginFill(0xf7f2ea, 1); cone.drawRoundedRect(-11, h / 2 - 20, 22, 7, 2); cone.endFill();
        cone.beginFill(0x3a3a3a, 1); cone.drawRoundedRect(-16, h / 2 - 6, 32, 7, 3); cone.endFill();
        cone.beginFill(0xffffff, 0.25); cone.drawPolygon([-2, -h / 2 + 5, 1, -h / 2 + 5, 6, h / 2 - 8, 3, h / 2 - 8]); cone.endFill();
        ob.addChild(cone);
    } else {
        // striped road barrier: dark posts + yellow/black chevron panel
        w = 30; h = 64;
        let base = new PIXI.Graphics();
        base.beginFill(0x000000, 0.22); base.drawEllipse(0, h / 2 - 2, 16, 5); base.endFill();
        ob.addChild(base);
        let bar = new PIXI.Graphics();
        bar.beginFill(0x2b303a, 1); bar.drawRoundedRect(-4, -h / 2, 8, h, 3); bar.drawRoundedRect(10, -h / 2, 8, h, 3); bar.endFill();
        // panel
        bar.beginFill(0xf5c518, 1); bar.lineStyle(2, 0x1a1d24, 1);
        bar.drawRoundedRect(-15, -h / 2 + 6, 30, 20, 4); bar.endFill();
        bar.lineStyle(0); bar.beginFill(0x1a1d24, 1);
        for (let s = 0; s < 3; s++) bar.drawPolygon([-15 + s * 11, -h / 2 + 24, -9 + s * 11, -h / 2 + 24, -15 + s * 11, -h / 2 + 8, -21 + s * 11, -h / 2 + 8]);
        bar.endFill();
        // reflector light
        bar.beginFill(0xff5a3c, 1); bar.drawCircle(0, h / 2 - 8, 3.5); bar.endFill();
        ob.addChild(bar);
    }
    ob.x = t.W + 44;
    ob.y = t.groundY - h / 2 + 4;
    ob.w = w; ob.h = h;
    // collision poly slightly tighter than the art for fair play
    ob.poly = fox.createSATpolygon(t.boxpoints(w - 8, h - 8), { x: ob.x, y: ob.y });
    t.obstacles.push(ob);
};

// charge collectible — a spinning glowing lightning bolt (halo disc, no filter)
race.prototype.spawncoin = function () {
    let t = this;
    let co = fox.makecontainer(0, 0, t.coincontainer);
    // soft halo (fake glow, cheap)
    let halo = new PIXI.Graphics();
    halo.beginFill(0xffe14d, 0.22); halo.drawCircle(0, 0, 20); halo.endFill();
    halo.beginFill(0xffe14d, 0.16); halo.drawCircle(0, 0, 14); halo.endFill();
    co.addChild(halo);
    // spinning coin disc with a bolt
    let disc = new PIXI.Graphics();
    disc.beginFill(0xffd83a, 1); disc.lineStyle(3, 0xffffff, 1); disc.drawCircle(0, 0, 13); disc.endFill();
    disc.lineStyle(0); disc.beginFill(0xd6a400, 1);
    disc.drawPolygon([-2, -9, 4, -9, 0, -1, 5, -1, -4, 10, -1, 1, -6, 1]);
    disc.endFill();
    co.addChild(disc);
    co.halo = halo; co.disc = disc;
    co.x = t.W + 44;
    co.y = t.groundY - (30 + Math.floor(Math.random() * 70)); // ground..jump height
    co.collected = false;
    co.poly = fox.createSATpolygon(t.boxpoints(26, 26), { x: co.x, y: co.y });
    t.coins.push(co);
};

// ---- end states ------------------------------------------------------------
race.prototype.crash = function () {
    let t = this;
    if (t.over) return;
    t.over = true;
    t.crashed = true;
    t.worldspeed = 0;
    t.shake = 16;                            // hard shake on impact
    t.emitdust(t.playerX + 10, t.carbaseY - 10, 10, 3.0, 0xffd24d);
    if (t.inputbox) t.inputbox.interactive = false;
    if (t.car) t.car.rotation = -0.22; // little tumble
    if (g.sfx && g.sfx['zbump']) fox.playsound('zbump');
    t.results('MENABRAK!', 0xffcc00);
};

race.prototype.getcaught = function () {
    let t = this;
    if (t.over) return;
    t.over = true;
    t.caught = true;
    t.worldspeed = 0;
    t.shake = 10;
    if (t.inputbox) t.inputbox.interactive = false;
    // slam the villain right up behind the car for the "caught" beat
    t.chaser.x = t.playerX - 40;
    if (g.sfx && g.sfx['zbump']) fox.playsound('zbump');
    t.results('TERTANGKAP!', 0xff5a3c);
};

// on-brand rounded results panel (soft shadow + amber header)
race.prototype.results = function (title, titleColor) {
    let t = this;
    let W = t.W, H = t.H;
    // dim
    fox.makebox(0, 0, W, H, t.overcontainer, 0x081018, 0.55);
    // panel
    let pw = Math.min(360, W - 40), ph = 300;
    let px = W / 2, py = H * 0.47;
    fox.makeroundedbox(px - pw / 2 + 6, py - ph / 2 + 10, pw, ph, 22, 0x000000, 0.35, 0, 0, 0, t.overcontainer); // shadow
    fox.makeroundedbox(px - pw / 2, py - ph / 2, pw, ph, 22, 0x123454, 1, 4, 0x8fd0f2, 1, t.overcontainer);      // body
    // header ribbon
    fox.makeroundedbox(px - pw / 2 + 16, py - ph / 2 - 18, pw - 32, 52, 16, 0xf5a623, 1, 4, 0xffffff, 1, t.overcontainer);
    fox.attachtext(title, px, py - ph / 2 + 8, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: 30, fill: 0xffffff,
        stroke: 0x8a4b00, strokeThickness: 6
    }, true);

    // stat rows
    fox.attachtext('JARAK', px, py - ph / 2 + 66, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: 15, fill: 0x9fd0ff, stroke: 0x06203a, strokeThickness: 3
    }, true);
    fox.attachtext(Math.floor(t.distance / 10) + ' m', px, py - ph / 2 + 92, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: 34, fill: 0xffffff, stroke: 0x06203a, strokeThickness: 5
    }, true);
    fox.attachtext(g.coins + ' charge terkumpul', px, py - ph / 2 + 126, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: 17, fill: 0xffe14d, stroke: 0x3a2a00, strokeThickness: 4
    }, true);

    t.makebtn('MAIN LAGI', px, py + 42, 0x2e7d32, () => fox.runscene('race'));
    t.makebtn('MENU', px, py + 104, 0x1565c0, () => fox.runscene('titlescreen'));
};

race.prototype.makebtn = function (label, x, y, color, cb) {
    let t = this;
    let bw = 200, bh = 52;
    let box = fox.makeroundedbox(-bw / 2, -bh / 2, bw, bh, 16, color, 1, 3, 0xffffff, 1, t.overcontainer);
    box.x = x; box.y = y;
    box.interactive = true;
    box.buttonMode = true;
    box.on('pointerdown', () => { fox.playbuttonsfx(); cb(); });
    fox.attachtext(label, x, y, t.overcontainer, {
        fontFamily: 'fredoka', fontSize: 23, fill: 0xffffff,
        stroke: 0x000000, strokeThickness: 5
    }, true);
    return box;
};

// resize hook (main.js resize() calls g[scenename].resize()). The world is built
// once at current dimensions; guard so it never throws pre-build. A full rebuild
// on orientation change is handled by re-running the scene, so keep this minimal.
race.prototype.resize = function () {
    let t = this;
    if (!t.built) return;
    t.W = g.screenwid;
    t.H = g.screenhei;
};

// tiny helper: 0xRRGGBB int -> '#rrggbb' for canvas gradients
function cssRGB(x) {
    if (typeof x === 'string') return x;
    return '#' + ('000000' + x.toString(16)).slice(-6);
}
