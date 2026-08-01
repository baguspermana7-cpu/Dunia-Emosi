var pausescreen = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
pausescreen.prototype = Object.create(foxmovieclip.prototype);
pausescreen.prototype.constructor = pausescreen;

pausescreen.prototype.awaken = function() {
    let t = this;
    t.yy = -160;
    // make background
    t.bg = fox.makelayer(t,0.7,0x000001);
    // GAME PAUSED
    let styletitle = fox.textstyle(g.titlefont,55,g.titlefillcolor);
    styletitle.lineHeight = 56;
    t.texttitle = fox.attachtext('GAME\nOPTIONS',0, t.yy,t,styletitle,true);
    t.texttitle.filters = [g.textglowfilter];
    // buttons
    t.buttonresume = fox.attachbutton('button_play',0, (t.yy+150),t,()=> {t.resumeplay()});
    t.soundoptions = fox.make('popsound',0,(t.yy+270),t);
    t.buttonhome = fox.attachbutton('button_home',0, (t.yy+336),t,()=> {fox.popconfirmation('QUIT GAME',g.hscreenwid,g.hscreenhei,t.back2home)});
    // make version number
    common.makeversionnumber(g.hscreenwid-40, g.hscreenhei-16,t);
    t.spawn();
};

pausescreen.prototype.spawn = function () {
    let t = this;
    g.pausescr = t;
    fox.pausegame();
    t.uda = false;
    g.noclick = 3;
    t.x = g.hscreenwid;
    t.y = g.hscreenhei;
    t.soundoptions.showbuttons();
    fox.tweenremoveallfrom(t.bg);
    fox.tweenremoveallfrom(t.texttitle);
    fox.tweenremoveallfrom(t.buttonresume);
    fox.tweenremoveallfrom(t.soundoptions);
    fox.tweenremoveallfrom(t.buttonhome);
    fox.jiggle(t.texttitle,700,100);
    fox.jiggle(t.buttonresume,700,300);
    fox.jiggle(t.soundoptions,700,500);
    fox.jiggle(t.buttonhome,700,700);
    fox.tweenalpha(t.bg,0,1,300,0,g.easing.linear());
    // mute all sounds
    PIXI.sound.muteAll();
    // CN Arcade SDK =========================
    common.analytics('pause');
    // =======================================
};

pausescreen.prototype.resumeplay = function() {
    let t = this;
    if (!t.uda) {
        t.uda = true;
        // remove pause menu
        fox.tweenremoveallfrom(t.bg);
        fox.tweenremoveallfrom(t.texttitle);
        fox.tweenremoveallfrom(t.buttonresume);
        fox.tweenremoveallfrom(t.soundoptions);
        fox.tweenremoveallfrom(t.buttonhome);
        fox.tweenscale(t.texttitle,1,0.001,100,100,g.easing.inSine());
        fox.tweenscale(t.buttonresume,1,0.001,100,200,g.easing.inSine());
        fox.tweenscale(t.soundoptions,1,0.001,100,300,g.easing.inSine());
        fox.tweenscale(t.buttonhome,1,0.001,100,400,g.easing.inSine());
        // fade out background
        let tw = fox.tweenalpha(t.bg,t.bg.alpha,0,500,0,g.easing.linear());
        tw.once('end', ()=> t.removeme());
    }
};

pausescreen.prototype.back2home = function () {
    g.pausescr = null;
    // unmute all sounds
    if (!g.mute) PIXI.sound.unmuteAll();
    fox.runscene('titlescreen',false);
    fox.resumegame();
};

pausescreen.prototype.removeme = function () {
    let t = this;
    g.pausescr = null;
    // unmute all sounds
    if (!g.mute) PIXI.sound.unmuteAll();
    fox.resumegame();
    t.kill();
};