var poptutorial = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
poptutorial.prototype = Object.create(foxmovieclip.prototype);
poptutorial.prototype.constructor = poptutorial;

poptutorial.prototype.awaken = function() {
    let t = this;
    g.tutorialpopup = t;
    // set vars
    t.choseAd = false;
    t.state = 1;
    t.wdiv = 36;
    t.rnow = 0;
    t.ro = 30;
    t.wedges = [1,2,3,2,4,3,2,3];
    t.nexttic = t.ticspacing = 6;
    g.noclick = 9999999999999;
    // create layer to block buttons below
    fox.makelayer(t,0,undefined,()=> t.close());
    // box background
    t.boxbg = common.makeboxbg(360,t,g.popbgcolor);
    let yy = 0;
    // make text
    let titlestyle = fox.textstyle(g.titlefont,33,g.titlefillcolor,7,0x000000);
    fox.attachtext('INSTRUCTIONS',0, yy-128,t,titlestyle);
    // button
    t.buttonclose = fox.attachbutton('button_no',124,(yy-178),t,()=> t.close());
    t.spawn();
};

poptutorial.prototype.spawn = function() {
    let t = this;
    t.uda = false;
    t.buttonclose.interactive = true;
    // animation
    t.ani = fox.spawn('instructions',0,0,t);
    // animate
    fox.tweenY(t, t.y, g.hscreenhei+40, 1000, 0, g.easing.outElastic());
    fox.disableinput(1000); // disable input during tween
    if (g.autoplay) fox.delayaction(1000,()=> { t.close() });
};

poptutorial.prototype.close = function() {
    let t = this;
    if (!t.uda) {
        t.uda = true;
        t.buttonclose.interactive = false;
        fox.remove(this, 100, 0);
        g.tutorialpopup = null;
        common.startgame();
    }
};