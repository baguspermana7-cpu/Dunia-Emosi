var popsound = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
popsound.prototype = Object.create(foxmovieclip.prototype);
popsound.prototype.constructor = popsound;

popsound.prototype.awaken = function() {
    let t = this;
    t.bglayer = fox.makelayer(t,0.2,0x000001);
    t.isi = fox.makecontainer(0,0,t);
    // background box
    t.boxbg = common.makeboxbg(164,t.isi,0xEFCD7E);
    let style = fox.textstyle(g.copyfont,30,g.copyfillcolor,'left',5,g.titlestrokecolor);
    t.buttonmusic1 = fox.attachbutton('button_music_on',0,0,t.isi,()=> t.togglemusic());
    t.buttonmusic2 = fox.attachbutton('button_music_off',0,0,t.isi,()=> t.togglemusic());
    t.buttonsfx1 = fox.attachbutton('button_sfx_on',0,0,t.isi,()=> t.togglesfx());
    t.buttonsfx2 = fox.attachbutton('button_sfx_off',0,0,t.isi,()=> t.togglesfx());
    t.buttonclose = fox.attachbutton('button_close',155,-75,t.isi,()=> t.close());
    // make version number
    t.version = common.makeversionnumber(112,65,t.isi);
    t.spawn();
};

popsound.prototype.spawn = function () {
    let t = this;
    t.notpause = g.scenename !== 'start';
    t.bglayer.visible = t.notpause;
    t.boxbg.visible = t.notpause;
    t.showbuttons();
    if (t.notpause) {
        t.buttonclose.visible = t.version.visible = true;
        fox.jiggle(t.isi);
    } else {
        t.buttonclose.visible = t.version.visible = false;
    }
};

popsound.prototype.showbuttons = function() {
    let t = this;
    let xx = 60;
    t.buttonmusic1.x = g.mutemusic ? -5000:-xx;
    t.buttonmusic2.x = !g.mutemusic ? -5000:-xx;
    t.buttonsfx1.x = g.mutesfx ? -5000:xx;
    t.buttonsfx2.x = !g.mutesfx ? -5000:xx;
};

popsound.prototype.togglemusic = function() {
    let t = this;
    t.togglebuttons(t.buttonmusic1,t.buttonmusic2);
    g.mutemusic = !g.mutemusic;
    common.applymutemusic();
};

popsound.prototype.togglesfx = function() {
    let t = this;
    t.togglebuttons(t.buttonsfx1,t.buttonsfx2);
    g.mutesfx = !g.mutesfx;
    common.applymutesfx();
};

popsound.prototype.close = function() {
    common.savehighscore();
    fox.remove(this, 100, 0);
};

popsound.prototype.togglebuttons = function(button1,button2) {
    if (button1.x < -1000) {
        button1.x = button2.x;
        button2.x = -5000;
    } else {
        button2.x = button1.x;
        button1.x = -5000;
    }
};