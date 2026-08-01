var menubar = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
menubar.prototype = Object.create(foxmovieclip.prototype);
menubar.prototype.constructor = menubar;

menubar.prototype.awaken = function() {
    let t = this;
    t.barcontainer = fox.makecontainer(0,0,t);
    t.tabscontainer = fox.makecontainer(0,0,t);
    t.buttoncontainer = fox.makecontainer(0,0,t);
    t.bg = fox.attachpic('menubarbg',0,-33,t.barcontainer);
    // create other buttons
    let pos = 368;
    t.buttonshutter = fox.attachbutton('button_shutter',pos,0,t.buttoncontainer,()=> { t.takepicture() });
    t.buttoncolor2 = fox.attachbutton('button_color2',pos,0,t.buttoncontainer,()=> { t.rotatestickercolor() });
    t.buttongallery = fox.attachbutton('button_gallery',-pos,0,t.buttoncontainer,()=> { fox.spawn('gallery',0,-60,g.photocontainer) });
    t.spawn();
};

menubar.prototype.spawn = function () {
    let t = this;
    g.menubar = t;
    // tabs
    t.tabs = [];
    t.buttoncontainers = [];
    t.tabitems = ['color','sticker','eyes','mouth','background'];
    t.udafirstap = t.buttonshutter.visible = t.buttoncolor2.visible = t.buttongallery.visible = false;
    t.firststicker = true;
    // create tabs
    t.totaltabs = t.tabitems.length;
    t.tabspacing = t.totaltabs < 6 ? 100 : 90;
    let startx = -0.5*((t.totaltabs-1)*t.tabspacing);
    t.tabpos = -120;
    for (let i = 0; i < t.totaltabs; i++) {
        let it = fox.spawn('button_'+t.tabitems[i],startx+(i*t.tabspacing),t.tabpos+50,t.tabscontainer,{heaven:true});
        it.interactive = true;
        it.on('pointertap',()=> { t.tabtap(i) });
        if (i === 0) g.firsttabposition = it.x;
        t.tabs.push(it);
    }
    t.tabnow = -1;
    t.hidetabs();
    t.createbuttons();
    // hide bar
    t.barcontainer.y = 50;
    t.barcontainer.alpha = 0;

};

menubar.prototype.tabtap = function (num) {
    let t = this;
    if (t.tabnow === num) {
        if (t.tabnow === 4) {
            // show gallery
            fox.spawn('gallery',0,0,g.photocontainer);
        } else {
            return;
        }
    }
    // first tap
    if (!t.udafirstap) {
        t.udafirstap = true;
        if (g.start.finger) g.start.finger.kill();
        // animate-in menubar
        fox.tweenremoveallfrom(t.barcontainer);
        fox.tweenY(t.barcontainer,t.barcontainer.y,0,300,200,g.easing.outSine());
        fox.tweenalpha(t.barcontainer,0,1,200,50);
        t.showbuttons(num);
        // eyes and mouth has 'clean' default index, so we glow the corresponding buttons here
        for (let i = 0; i < t.buttoncontainers[2].buttons.length; i++) {
            common.glowbutton(t.buttoncontainers[2].buttons[i], i === g.eyesnow)
        }
        for (let i = 0; i < t.buttoncontainers[3].buttons.length; i++) {
            common.glowbutton(t.buttoncontainers[3].buttons[i], i === g.mouthnow)
        }
        // recreate the tap
        fox.delayaction(100,()=> { t.tabtap(num) })
    } else {
        t.hidetabs(num);
        t.showbuttons(num);
        t.tabnow = num;
        fox.playsound('ztab');
        if (t.finger2 && t.tabnow !== 1) {
            t.finger2.kill();
            t.finger2 = null;
        }
    }
};

menubar.prototype.rotatestickercolor = function() {
    let t = this;
    g.stickercolornow++;
    if (g.stickercolornow >= g[g.vehiclename+'stickertint'].length) g.stickercolornow = 0;
    common.tintsticker(g[g.vehiclename+'stickertint'][g.stickercolornow]);
    fox.brightfade(g.vehiclestickercontainer, 500, 0, 30);
    if (t.finger2) t.finger2.kill();
};

menubar.prototype.takepicture = function() {
    let t = this;
    let p = {vehicle:g.vehiclenow,clr:g.colornow,sclr:g.stickercolornow,hilite:g.hilitenow,sticker:g.stickernow,eyes:g.eyesnow,mouth:g.mouthnow,bg:g.backgroundnow};
    g.photos.unshift(p);
    fox.playsound('zcamera');
    t.showphotoresult(p);
    common.savehighscore();
    fox.say('zvo'+g.vehiclenow+'happy'+fox.getrandom(g.cleanVO['vehicle'+g.vehiclenow],'vehicle'+g.vehiclenow+'happyVO'));
}

menubar.prototype.showphotoresult = function(p) {
    let t = this;
    g.photoblocklayercontainer.visible = true;
    fox.addblur(g.workspacecontainer,5, false, 5);
    fox.fadescreen(true,0xffffff,700);
    // make photo
    let it = fox.spawn('photo',0,-40,g.photocontainer,{p});
    let targetska = 0.7;
    let duration = 500;
    fox.tweenscale(it,1,targetska,duration,0,g.easing.inOutSine());
    fox.tweenrotation(it,0,-8,duration,0,g.easing.inOutSine());
    // show gallery button
    if (!t.buttongallery.visible) fox.jiggle(t.buttongallery);
    // fly photo to gallery
    duration = 900;
    let delay = 1000;
    let targetx = t.x+t.buttongallery.x;
    let targety = g.menucontainer.y;
    fox.tweenX(it,it.x,targetx,duration,delay,g.easing.outQuad());
    let tw1 = fox.tweenY(it,it.y,it.y-160,250,delay,g.easing.outSine());
    tw1.once('end',()=> {
        fox.tweenY(it,it.y,targety,duration-250,0,g.easing.inOutSine());
    })
    let tw = fox.tweenscale(it,targetska,0.08,duration,delay)
    tw.once('end',()=> {
        g.photoblocklayercontainer.visible = false;
        fox.jiggle(t.buttongallery);
        fox.playsound('zsaved');
        it.kill();
    })
    fox.removeblur(g.workspacecontainer,true);
}


menubar.prototype.continue = function () {
    let t = this;
    let tw = fox.tweenY(t,t.y,g.screenhei+100,700,0,g.easing.inSine());
    tw.once('end',()=> {
        g.start.beginstep(g.stepnow+1);
        t.die();
    })
}

menubar.prototype.showbuttons = function(num) {
    let t = this;
    // hide all button containers
    for (let i = 0; i < 8; i++) if (t.buttoncontainers[i]) t.buttoncontainers[i].visible = false;
    // show selected container
    let container = t.buttoncontainers[num];
    container.visible = true;
    // animate buttons
    for (let i = 0; i < container.buttons.length; i++) {
        let b = container.buttons[i];
        fox.setscale(b,0.001);
        fox.tweenremoveallfrom(b);
        fox.tweenscale(b,0.001,1,700,20+(i*30),g.easing.outElastic());
    }
}

menubar.prototype.createbuttons = function () {
    let t = this;
    let container;
    for (let num = 0; num < t.tabitems.length; num++) {
        let item = t.tabitems[num];
        // create new buttons
        let prefix = 'menu' + (item === 'background' ? item : g.vehiclenow+item);
        let area = 540;
        let startx = -area/2;
        let defaultindex = g.defaultindexes[item];
        let buttonspacing = area/defaultindex;
        container = t.buttoncontainers[num] = fox.makecontainer(0,0,t.barcontainer);
        container.buttons = [];
        for (let i = 0; i <= defaultindex; i++) {
            let name = prefix+i;
            if (g.foxpic[name] || i === defaultindex) {
                // default button is using the same pic
                if (i === defaultindex) name = 'menudefault';
                // create a hidden rectangular button behind the icon
                let btn = fox.spawn('whitepixel',startx + (i * buttonspacing),0, container);
                btn.alpha = 0;
                fox.setscale(btn,32);
                fox.setanchor(btn,0.5);
                // create icon
                let it = fox.spawn(name, startx + (i * buttonspacing), 0, container, {heaven: true});
                it.idx = i;
                it.tab = num;
                it.item = item;
                it.variablename = t.tabitems + 'now';
                it.selected = false;
                container.buttons.push(it);
                // button functions
                btn.interactive = true;
                btn.on('pointertap', () => {
                    t.menubarbuttonselect(it);
                    if (it.item === 'background') {
                        t.switchbackground(it);
                    } else {
                        t.attach2vehicle(it);
                        g.batcomputer.impressed();
                    }
                    // VO
                    fox.delayaction(300, ()=> { if (fox.random(100) > 80) fox.say('zvo'+g.vehiclenow+'happy'+fox.getrandom(g.cleanVO['vehicle'+g.vehiclenow],'vehicle'+g.vehiclenow+'happyVO')) });
                });
                // initially, select default
                if (i === defaultindex) t.menubarbuttonselect(it);
            }
        }
        container.visible = false;
    }
}

menubar.prototype.switchbackground = function(button) {
    let t = this;
    fox.killchildren(g.photobackgroundcontainer);
    if (button.idx !== g.defaultindexes['background']) {
        // crete new background
        g.background = fox.spawn('background'+button.idx,0,g.backgroundoffset,g.photobackgroundcontainer);
        // add glow
        let glow = fox.spawn('backgroundglow',0,g.backgroundoffset,g.photobackgroundcontainer);
        fox.setscale(glow,2);
        fox.brightfade(g.photobackgroundcontainer,400,0,0);
    }
}

menubar.prototype.attach2vehicle = function(button) {
    let t = this;
    let container = g['vehicle'+button.item+'container'];
    common.clearcontainer(container);
    // NOTE: sticker always need to spawn something, that's why below we have || button.item === 'sticker')
    if (!t.defaultselected || button.item === 'sticker') {
        // spawn item
        let name = g.vehiclename+button.item+button.idx;
        if (button.item === 'sticker' && t.defaultselected) name = g.vehiclename+'sticker-1'; // unique name for sticker default
        let xx = g[name] ? g.vehicle.x+g[name].x : 0;
        let yy = g[name] ? g.vehicle.y+g[name].y : 0;
        let it = fox.spawn(name, xx, yy, container);
        if (button.item === 'sticker') {
            // tint sticker, unless it's default sticker (because it has it's own color)
            if (!t.defaultselected) common.tintsticker(g[g.vehiclename+'stickertint'][g.stickercolornow]);
            if (t.defaultselected) t.buttoncolor2.visible = false;
            if (!t.defaultselected && !t.buttoncolor2.visible) fox.jiggle(t.buttoncolor2);
            if (t.firststicker) {
                t.firststicker = false;
                // show finger
                t.finger2 = fox.spawn('fingertap', t.buttoncolor2.x, t.buttoncolor2.y, t.buttoncontainer);
            }
        } else {
            if (t.finger2) {
                t.finger2.kill();
                t.finger2 = null;
            }
        }
        fox.brightfade(container, 500, 0, 30);
        if (button.item === 'color') {
            // changing color, let's brightfade sticker too
            fox.brightfade(g.vehiclestickercontainer, 500, 0, 30);
        }
    } else {
        // revert to default
        common.clearcontainer(container);
        fox.brightfade(g.vehicle, 500, 0, 30);
    }
    // add glow to eyes and mouth
    // if color is -1 (default color), the tint value is in the last variable in g.vehicle1tint array
    let colorindex = g.colornow < 0 ? 8 : g.colornow;
    let tinteyescolor = g[g.vehiclename + 'tint'][colorindex];
    let tinteyescolorbelow = g[g.vehiclename + 'tintbelow'][colorindex];
    // normally, mouth will have the same tint color as the eyes
    let tintmouthcolor = tinteyescolor;
    let tintmouthcolorbelow = tinteyescolorbelow;
    // ..except for Red & Batwing (these two have different tint for eyes/mouth for default)
    if (g.vehiclenow === 2 && g.colornow < 0 && (button.item === 'eyes' || button.item === 'color')) { tinteyescolor = 0x16ba04; tinteyescolorbelow = 0x15A604; }
    if (g.vehiclenow === 5 && g.colornow < 0 && (button.item === 'eyes' || button.item === 'color')) { tinteyescolor = 0xa71ad5; tinteyescolorbelow = 0xa71ad5; }
    // glow eyes & mouth
    if (button.item === 'mouth' || button.item === 'color') common.addglow(g.vehiclemouthcontainer,g.vehiclebelowmouthcontainer,tintmouthcolor,tintmouthcolorbelow);
    if (button.item === 'eyes' || button.item === 'color') common.addglow(g.vehicleeyescontainer,g.vehiclebeloweyescontainer,tinteyescolor,tinteyescolorbelow);
}

menubar.prototype.menubarbuttonselect = function(button) {
    let t = this;
    let item = button.item;
    t.defaultselected = (button.idx === g.defaultindexes[item]);
    // show button selected
    for (let i = 0; i < button.parent.buttons.length; i++) {
        let it = button.parent.buttons[i];
        it.selected = button === it;
        common.glowbutton(it, it.selected);
        if (it.selected) g[item+'now'] = t.defaultselected ? -1 : button.idx; // save to variable
    }
    button.selected = true;
    button.parent.selection = button.idx;
    fox.playsound('zselect');
}

menubar.prototype.hidetabs = function (exception) {
    let t = this;
    for (let i = 0; i < t.tabs.length; i++) {
        fox.tweenremoveallfrom(t.tabs[i]);
        if (i !== exception) {
            fox.tweenY(t.tabs[i],t.tabs[i].y,t.tabpos+10,300,0,g.easing.outSine());
            fox.tweenscale(t.tabs[i],t.tabs[i].scale.x,0.9,400,0,g.easing.outBack())
            t.tabs[i].filters = null;
        } else {
            // selected tab
            t.tabs[i].y = t.tabpos;
            fox.bringtotop(t.tabs[i]);
            fox.tweenscale(t.tabs[i],1.6,1.1,800,0,g.easing.outElastic())
            t.tabs[i].filters = [g.greenglowbright];
        }
    }
    if (exception === t.tabs.length-1) {
        // selected tab is background, show shutter button
        fox.jiggle(t.buttonshutter);
        if (g.photos.length > 0) fox.jiggle(t.buttongallery);
        t.buttoncolor2.visible = false;
    } else if (exception === 1) {
        // selected tab is sticker, show color2 button
        if (g.stickernow >= 0) fox.jiggle(t.buttoncolor2);
        t.buttonshutter.visible = t.buttongallery.visible = false;
    } else {
        fox.tweenremoveallfrom(t.buttonshutter);
        fox.tweenremoveallfrom(t.buttongallery);
        t.buttonshutter.visible = t.buttoncolor2.visible = t.buttongallery.visible = false;
    }
};

menubar.prototype.die = function (except) {
    let t = this;
    fox.killchildren(t.tabscontainer);
    for (let i = 0; i < 8; i++) if (t.buttoncontainers[i]) fox.killchildren(t.buttoncontainers[i]);
    t.kill();
}