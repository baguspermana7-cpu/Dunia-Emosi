// ============================================================================
// racepick.js  —  PRE-RACE PICKER (P2)
// ----------------------------------------------------------------------------
// Owner flow step 3: "pilih musuhnya dan kota" — choose a villain + a city,
// then start the chase. Additive fox scene (registered in loadingscreen.js).
// Reaches here from paint via start.gotorace(); leaves to fox.runscene('race').
//
// Reuses: fox.makecontainer/makeroundedbox/makebox/attachtext (programmer-art
// cards), fox.spawn('photo',{p}) to preview the EXACT painted car (proves the
// recipe carries through), fox.tint for villain swatches. The villain/city
// tables live in race.js (RACE_VILLAINS / RACE_CITIES) so the two stay in sync.
//
// Programmatic hooks for headless verification + real taps both call the same
// methods: selectvillain(i), selectcity(i), startrace(), back().
// ============================================================================

var racepick = function (x, y, params) {
    foxmovieclip.call(this, x, y, params);
};
racepick.prototype = Object.create(foxmovieclip.prototype);
racepick.prototype.constructor = racepick;

racepick.prototype.awaken = function () {
    this.spawn();
};

racepick.prototype.spawn = function () {
    let t = this;
    g.racepick = t;
    t.removeChildren();

    t.villainnow = (typeof g.raceVillain === 'number') ? g.raceVillain : 0;
    t.citynow = (typeof g.raceCity === 'number') ? g.raceCity : 0;

    t.bgcontainer = fox.makecontainer(0, 0, t);
    t.previewcontainer = fox.makecontainer(0, 0, t);
    t.villaincontainer = fox.makecontainer(0, 0, t);
    t.citycontainer = fox.makecontainer(0, 0, t);
    t.uicontainer = fox.makecontainer(0, 0, t);

    t.villaincards = [];
    t.citycards = [];

    t.layout();
    fox.fadescreen();
    fox.trace('racepick scene ready');
};

racepick.prototype.layout = function () {
    let t = this;
    let W = t.W = g.screenwid;
    let H = t.H = g.screenhei;

    // backdrop
    fox.makebox(0, 0, W, H, t.bgcontainer, 0x0e2136, 1);
    fox.makebox(0, 0, W, 62, t.bgcontainer, 0x12365b, 1);

    // title
    fox.attachtext('PILIH MUSUH & KOTA', W / 2, 32, t.uicontainer, {
        fontFamily: 'fredoka', fontSize: 26, fill: 0xffffff,
        stroke: 0x061423, strokeThickness: 6
    }, true);

    // painted-car preview (proves the recipe carried through)
    t.buildpreview();

    // ---- villain row -------------------------------------------------------
    let vy = Math.round(H * 0.40);
    fox.attachtext('MUSUH', 14, vy - 52, t.uicontainer, {
        fontFamily: 'fredoka', fontSize: 16, fill: 0x9fd0ff,
        stroke: 0x061423, strokeThickness: 4
    }, false);
    let vn = RACE_VILLAINS.length;
    let vgap = Math.min(120, (W - 40) / vn);
    let vstart = W / 2 - ((vn - 1) * vgap) / 2;
    for (let i = 0; i < vn; i++) {
        let v = RACE_VILLAINS[i];
        let card = fox.makecontainer(vstart + i * vgap, vy, t.villaincontainer);
        let sel = fox.makeroundedbox(-44, -46, 88, 92, 16, 0xffffff, 1, 4, 0x66ff00, 1, card);
        sel.visible = false;
        card.sel = sel;
        // shared PROCEDURAL villain art (identical to the one that chases in race)
        let art = fox.makecontainer(0, -6, card);
        RACE_drawvillain(art, v, 0.72);
        fox.attachtext(v.name, 0, 44, card, {
            fontFamily: 'fredoka', fontSize: 13, fill: 0xffffff,
            stroke: 0x061423, strokeThickness: 4
        }, true);
        // tap target
        let hit = fox.makebox(-46, -52, 92, 112, card, 0x000000, 0.001);
        hit.interactive = true;
        hit.buttonMode = true;
        (function (idx) { hit.on('pointerdown', () => { fox.playbuttonsfx(); t.selectvillain(idx); }); })(i);
        t.villaincards.push(card);
    }

    // ---- city row ----------------------------------------------------------
    let cy = Math.round(H * 0.68);
    fox.attachtext('KOTA', 14, cy - 46, t.uicontainer, {
        fontFamily: 'fredoka', fontSize: 16, fill: 0x9fd0ff,
        stroke: 0x061423, strokeThickness: 4
    }, false);
    let cn = RACE_CITIES.length;
    let cgap = Math.min(120, (W - 40) / cn);
    let cstart = W / 2 - ((cn - 1) * cgap) / 2;
    for (let i = 0; i < cn; i++) {
        let c = RACE_CITIES[i];
        let card = fox.makecontainer(cstart + i * cgap, cy, t.citycontainer);
        let sel = fox.makeroundedbox(-42, -34, 84, 68, 12, 0xffffff, 1, 4, 0x66ff00, 1, card);
        sel.visible = false;
        card.sel = sel;
        // mini PROCEDURAL scene swatch: sky + skyline silhouette + converging road
        // (a tiny preview of what the race will actually look like for this city)
        let skyHex = (c.sky && c.sky[0]) ? parseInt(c.sky[0].slice(1), 16) : c.skyTop;
        let skyHex2 = (c.sky && c.sky[1]) ? parseInt(c.sky[1].slice(1), 16) : c.skyBand;
        fox.makeroundedbox(-38, -30, 76, 60, 9, skyHex, 1, 3, 0x101010, 1, card);
        fox.makebox(-35, -6, 70, 12, card, skyHex2, 1); // horizon haze band
        // skyline silhouette
        let sil = new PIXI.Graphics();
        sil.beginFill(c.nearB, 1);
        let sx = -34;
        for (let b = 0; b < 7; b++) { let bh = 8 + ((b * 13) % 16); sil.drawRect(sx, 4 - bh, 8, bh); sx += 10; }
        sil.endFill();
        card.addChild(sil);
        // converging road
        let road = new PIXI.Graphics();
        road.beginFill(c.asphalt, 1);
        road.drawPolygon([-4, 4, 4, 4, 30, 28, -30, 28]);
        road.endFill();
        road.lineStyle(1.5, c.curb, 1);
        road.moveTo(-4, 4); road.lineTo(-30, 28);
        road.moveTo(4, 4); road.lineTo(30, 28);
        card.addChild(road);
        fox.attachtext(c.name, 0, 40, card, {
            fontFamily: 'fredoka', fontSize: 13, fill: 0xffffff,
            stroke: 0x061423, strokeThickness: 4
        }, true);
        let hit = fox.makebox(-42, -36, 84, 90, card, 0x000000, 0.001);
        hit.interactive = true;
        hit.buttonMode = true;
        (function (idx) { hit.on('pointerdown', () => { fox.playbuttonsfx(); t.selectcity(idx); }); })(i);
        t.citycards.push(card);
    }

    // ---- buttons -----------------------------------------------------------
    t.startbtn = t.makebtn('MULAI BALAPAN!', W / 2, H - 40, 0x2e7d32, () => t.startrace());
    t.backbtn = t.makebtn('KEMBALI', 70, 34, 0x455a70, () => t.back(), 120, 40, 18);

    // reflect initial selection
    t.selectvillain(t.villainnow, true);
    t.selectcity(t.citynow, true);
};

racepick.prototype.buildpreview = function () {
    let t = this;
    let p = g.raceRecipe || (g.photos && g.photos.length > 0 ? g.photos[0] : null);
    if (!p) return;
    fox.killchildren(t.previewcontainer);
    let holder = fox.makecontainer(t.W / 2, Math.round(t.H * 0.16), t.previewcontainer);
    let car = fox.spawn('photo', 0, 0, holder, { p: p });
    if (car.bgcontainer) car.bgcontainer.visible = false;
    if (car.framecontainer) car.framecontainer.visible = false;
    holder.scale.set(-0.28, 0.28); // face right, small
    t.previewcar = car;
    fox.attachtext('MOBILMU', t.W / 2, Math.round(t.H * 0.16) + 44, t.previewcontainer, {
        fontFamily: 'fredoka', fontSize: 13, fill: 0xffe14d,
        stroke: 0x061423, strokeThickness: 4
    }, true);
};

racepick.prototype.selectvillain = function (i, silent) {
    let t = this;
    if (i < 0 || i >= t.villaincards.length) return;
    t.villainnow = i;
    g.raceVillain = i;
    for (let k = 0; k < t.villaincards.length; k++) {
        let card = t.villaincards[k];
        card.sel.visible = (k === i);
        card.scale.set(k === i ? 1.08 : 1);
    }
    if (!silent && g.sfx && g.sfx['zselect']) fox.playsound('zselect');
};

racepick.prototype.selectcity = function (i, silent) {
    let t = this;
    if (i < 0 || i >= t.citycards.length) return;
    t.citynow = i;
    g.raceCity = i;
    for (let k = 0; k < t.citycards.length; k++) {
        let card = t.citycards[k];
        card.sel.visible = (k === i);
        card.scale.set(k === i ? 1.08 : 1);
    }
    if (!silent && g.sfx && g.sfx['zselect']) fox.playsound('zselect');
};

racepick.prototype.startrace = function () {
    let t = this;
    g.raceVillain = t.villainnow;
    g.raceCity = t.citynow;
    // keep the painted-car bg in sync with the chosen city (flavor, carried in p)
    if (g.raceRecipe && RACE_CITIES[t.citynow]) g.raceRecipe.bg = RACE_CITIES[t.citynow].bg;
    fox.runscene('race');
};

racepick.prototype.back = function () {
    fox.runscene('titlescreen');
};

racepick.prototype.makebtn = function (label, x, y, color, cb, bw, bh, fs) {
    let t = this;
    bw = bw || 220; bh = bh || 52; fs = fs || 24;
    let box = fox.makeroundedbox(-bw / 2, -bh / 2, bw, bh, 14, color, 1, 3, 0xffffff, 1, t.uicontainer);
    box.x = x; box.y = y;
    box.interactive = true;
    box.buttonMode = true;
    box.on('pointerdown', () => { fox.playbuttonsfx(); cb(); });
    fox.attachtext(label, x, y, t.uicontainer, {
        fontFamily: 'fredoka', fontSize: fs, fill: 0xffffff,
        stroke: 0x000000, strokeThickness: 5
    }, true);
    return box;
};

racepick.prototype.resize = function () {
    let t = this;
    t.W = g.screenwid;
    t.H = g.screenhei;
};
