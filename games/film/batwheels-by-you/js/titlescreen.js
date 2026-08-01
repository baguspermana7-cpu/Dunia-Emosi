var titlescreen = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
titlescreen.prototype = Object.create(foxmovieclip.prototype);
titlescreen.prototype.constructor = titlescreen;

titlescreen.prototype.awaken = function() {
    let t = this;
    t.all = fox.makecontainer(0,0,t);
    t.bgcontainer = fox.makecontainer(0,0,t.all);
    t.titlecontainer = fox.makecontainer(0,0,t.all);
    t.buttoncontainer = fox.makecontainer(0,0,t.all);
    t.selectcontainer = fox.makecontainer(0,0,t.all);
    t.topcontainer = fox.makecontainer(0,0,t.all);
    // background
    t.bg = fox.attachpic('titlebg', 0, 0, t.bgcontainer, true);
    // title text
    t.titletext = fox.attachpic('titlelogo',0,-50-0.1*g.gameoffsety,t.titlecontainer,true);
    // make buttons
    t.buttonshop = fox.attachbutton('button_settings',-140,0,t.buttoncontainer,()=> fox.spawn('popsound',0,84,t.topcontainer));
    t.buttonplay = fox.attachbutton('button_play',0,0,t.buttoncontainer,()=> t.showselection());
    t.buttonsound = fox.attachbutton('button_gallery',140,0,t.buttoncontainer,()=> t.gallery());
    // make vehicle selection
    let spacing = 150;
    let sx = -296;
    t.select = [];
    t.select[0] = fox.attachbutton('select1',sx,0,t.selectcontainer,()=> t.startgame(1));
    t.select[1] = fox.attachbutton('select2',sx+8+spacing,-20,t.selectcontainer,()=> t.startgame(2));
    t.select[2] = fox.attachbutton('select3',sx+2*spacing,0,t.selectcontainer,()=> t.startgame(3));
    t.select[3] = fox.attachbutton('select4',sx+8+3*spacing,-20,t.selectcontainer,()=> t.startgame(4));
    t.select[4] = fox.attachbutton('select5',sx+4*spacing,0,t.selectcontainer,()=> t.startgame(5));
    for (let i = 0; i < t.select.length; i++) {
        t.select[i].pos = {x:t.select[i].x,y:t.select[i].y};
        t.select[i].visible = false;
    }
    t.spawn();
};

titlescreen.prototype.spawn = function() {
    let t = this;
    g.titlescreen = this;
    t.udashow = false;

    fox.bringtotop(t.titletext);
    fox.jiggle(t.titletext,1000,500);
    fox.jiggle(t.buttonshop,700,900);
    fox.jiggle(t.buttonplay,700,1100);
    fox.jiggle(t.buttonsound,700,1300);
    fox.playbackgroundmusic('zloop');

    // hide selection
    for (let i = 0; i < t.select.length; i++) {
        t.select[i].visible = false;
    }

    fox.fadescreen();
    // CN Arcade SDK =========================
    common.analytics('title');
    // =======================================

    t.resize();

};

titlescreen.prototype.showselection = function() {
    let t = this;
    if (t.udashow) return;
    t.udashow = true;
    for (let i = 0; i < t.select.length; i++) {
        let it = t.select[i];
        it.x = it.pos.x+(fox.isEven(i) ? -80 : 80);
        it.y = it.pos.y+(fox.isEven(i) ? 200 : -200);
        fox.delayaction(i*150,()=> {
            it.visible = true;
            fox.tweenmove(it,it.position,it.pos,800,0,g.easing.outElastic());
        })
    }
}

titlescreen.prototype.gallery = function() {
    g.showgallery = true;
    fox.runscene('start');
}

titlescreen.prototype.startgame = function(num) {
    g.vehiclenow = num;
    g.showgallery = false;
    fox.playsound('zvo'+num+'start');
    fox.runscene('start');
}

// adjustments when window resized
titlescreen.prototype.resize = function() {
    let t = this;
    // adjust t.all container and get the scale
    t.all.width = g.screenwid;
    g.ska = t.all.scale.y = t.all.scale.x;
    t.x = g.hscreenwid;
    t.y = g.hscreenhei;
    t.buttoncontainer.y = Math.min(360,(g.hscreenhei-1.5*g.buttonmargin)/g.ska);
    fox.trace('titlescreen resized');
}