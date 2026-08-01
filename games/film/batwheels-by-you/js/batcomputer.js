var batcomputer = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
batcomputer.prototype = Object.create(foxmovieclip.prototype);
batcomputer.prototype.constructor = batcomputer;

batcomputer.prototype.awaken = function() {
    let t = this;
    t.eyescontainer = fox.makecontainer(0,-10,t);
    t.mouthcontainer = fox.makecontainer(0,5,t);
    t.eyesglowfilter = new PIXI.filters.GlowFilter({distance:15,outerStrength:1});
    t.eyescontainer.filters = [t.eyesglowfilter];
    t.mouthglowfilter = new PIXI.filters.GlowFilter({distance:15,outerStrength:1,color:0x25B9FC});
    t.mouthcontainer.filters = [t.mouthglowfilter];
    g.comrandomeyes = [1,2,3];
    g.comblinkeyes = 4;
    g.comrandommouth = [1,2,5,6];
    g.comhappymouth = [3,4];
    t.spawn();
};

batcomputer.prototype.spawn = function () {
    let t = this;
    g.batcomputer = t;
    t.nextblink = Date.now()+1000;
    t.nextimpressed = Date.now()+3000;
    t.seteyes(fox.getrandom(g.comrandomeyes, 'comrandomeyes'));
    t.setmouth(fox.getrandom(g.comrandommouth,'comrandommouth'));
};

batcomputer.prototype.impressed = function () {
    let t = this;
    if (Date.now() > t.nextimpressed) {
        t.nextimpressed = Date.now()+3000;
        t.nextblink = Date.now()+1000;
        t.seteyes(3,true);
        t.setmouth(fox.getrandom(g.comhappymouth,'comhappymouth'),true);
    }
}

batcomputer.prototype.seteyes = function (num, once = false) {
    let t = this;
    fox.killchildren(t.eyescontainer);
    t.eyes = fox.spawn('comeyes'+num,0,0,t.eyescontainer);
    let delay = 2000+fox.random(3000);
    if (num === g.comblinkeyes) {
        fox.setanchor(t.eyes,0.5,0);
        delay = 125;
    }
    fox.tweenremoveallfrom(t.eyes);
    fox.tweenscale(t.eyes,{x:1,y:1.2},{x:1,y:1},700,0,g.easing.outElastic());
    if (!once) {
        fox.delayaction(delay, () => {
            if (Date.now() > t.nextblink) {
                // blink
                t.seteyes(g.comblinkeyes);
                t.nextblink = Date.now() + 2000 + fox.random(2000);
            } else {
                t.seteyes(fox.getrandom(g.comrandomeyes, 'comrandomeyes'))
            }
        })
    }
}

batcomputer.prototype.setmouth = function (num, once = false) {
    let t = this;
    fox.killchildren(t.mouthcontainer);
    t.mouth = fox.spawn('commouth'+num,0,0,t.mouthcontainer);
    fox.setanchor(t.mouth,0.5,0);
    fox.tweenremoveallfrom(t.mouth);
    fox.tweenscale(t.mouth,{x:1,y:1.1},{x:1,y:1},500,0,g.easing.inOutCubic());
    let delay = 4000+fox.random(4000);
    if (!once) {
        fox.delayaction(delay, () => {
            t.setmouth(fox.getrandom(g.comrandommouth, 'comrandommouth'))
        })
    }
}