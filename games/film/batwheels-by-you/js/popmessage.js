var popmessage = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
popmessage.prototype = Object.create(foxmovieclip.prototype);
popmessage.prototype.constructor = popmessage;

popmessage.prototype.awaken = function() {
    let t = this;
    t.bg = fox.makelayer(t,0);
    // background box
    t.xska = 500;
    t.yska = 60;
    t.boxbg1 = fox.attachpic('whitepixel',0,0,t); // outline box
    t.boxbg2 = fox.attachpic('whitepixel',0,0,t); // middle box
    t.boxbg1.a.tint = 0xFFFFFF;
    t.boxbg2.a.tint = 0x000000;
    // make text
    let style = fox.textstyle(g.copyfont,33,0xFFCC00,4,0x000000);
    t.txt = fox.attachtext('',0,-2,t, style);
    t.spawn();
};

popmessage.prototype.spawn = function() {
    let t = this;
    fox.delayaction(t.delay,()=> { t.show() });
};

popmessage.prototype.show = function () {
    let t = this;
    fox.bringtotop(t);
    t.scale.y = 1;
    t.bg.interactive = t.blockbuttons;
    t.txt.text = t.message;
    // sfx
    if (t.sfx != null) fox.playsound(t.sfx);
    // white box
    fox.tweenremoveallfrom(t.boxbg1);
    fox.tweenscale(t.boxbg1,{x:0.001,y:0.001},{x:t.xska,y:1.14*t.yska},700,100,g.easing.outElastic());
    // black box
    fox.tweenremoveallfrom(t.boxbg2);
    fox.tweenscale(t.boxbg2,{x:0.001,y:0.001},{x:t.xska,y:t.yska},700,0,g.easing.outElastic());
    // text
    fox.tweenremoveallfrom(t.txt);
    fox.jiggle(t.txt,700,200);
    // removal
    fox.tweenscale(t,t.scale.x,0.001,100,t.delay+t.duration);
    fox.delayaction(t.delay+t.duration+100,()=> t.kill());
};