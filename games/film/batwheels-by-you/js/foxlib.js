// ------------------------------------------------------------
// VERTICAL SCROLL CONTAINER
// To create: t.scrollingcontainer = fox.make('verticalscrollcontainer',0,0,t); // then just add anything in it
// - Can auto adjust scroll limits based on content. Call setcontentsize() after adding things in it.
// - Can add top & bottom margin (for content that may be positioned in the middle). Call setmargin(top,bottom)
// - Add parameter 'viewsize' if the viewing area is less than whole screen
// ------------------------------------------------------------
var verticalscrollcontainer = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
verticalscrollcontainer.prototype = Object.create(foxmovieclip.prototype);
verticalscrollcontainer.prototype.constructor = verticalscrollcontainer;

verticalscrollcontainer.prototype.awaken = function() {
    let t = this;
    t.ignorepause = true;
    t.loopenabled = true;
    t.topmargin = t.bottommargin = 0;
    t.spawn();
};

verticalscrollcontainer.prototype.spawn = function() {
    let t = this;
    // params
    if (!t.viewsize) t.viewsize = g.screenhei;
    if (!t.contentsize) t.contentsize = g.screenhei;
    t.ys = g.dragspeedy = 0;
    t.ypos = t.y;
    t.ymax = t.ymin = t.ypos;
    t.candrag = true;
};

// set content size (auto or manual)
verticalscrollcontainer.prototype.setcontentsize = function(value = undefined) {
    let t = this;
    // if no value, auto detect content size
    t.contentsize = value === undefined ? Math.max(340,t.height) : value;
    t.ymax = t.ypos;
    t.ymin = t.ypos-t.contentsize-t.topmargin-t.bottommargin+0.5*t.viewsize;
}

// set top and bottom margin
verticalscrollcontainer.prototype.setmargin = function(top,bottom) {
    let t = this;
    t.topmargin = top;
    t.bottommargin = bottom;
    t.setcontentsize();
}

verticalscrollcontainer.prototype.disablescroll = function() {
    let t = this;
    t.candrag = false;
}

verticalscrollcontainer.prototype.enablescroll = function() {
    let t = this;
    t.candrag = true;
}

verticalscrollcontainer.prototype.loop = function() {
    let t = this;
    t.touchdrag();
}

// touch/drag function
// NOTE: we get the g.dragspeedy value from common.onpointerup & common.onpointermove
verticalscrollcontainer.prototype.touchdrag = function() {
    let t = this;
    if (!t.candrag) return;
    if (g.pressing && Math.abs(g.dragspeedy) > 2) {
        t.ys = g.dragspeedy;
        t.ny = Math.max(t.ymin,Math.min(t.ymax,t.y+t.ys));
        t.y = t.ny;
        // IMPORTANT 'touching' variable to help differentiate between swipe and tap
        t.touching = true;
    } else {
        // slow down to stop (when not pressing OR finger is no longer moving)
        t.ys *= g.pressing ? 0.8 : 0.95; // if finger is still pressing on screen, stop faster
        t.ny = Math.max(t.ymin, Math.min(t.ymax, t.y + t.ys));
        t.y = t.ny;
        // if finger is pressing down again content is moving (after a fast swipe), stop movement immediately
        if (g.pressing && !t.touching) t.ys = 0;
        // when not pressing, set t.touching flag to false
        if (!g.pressing) t.touching = false;
    }
}

// ------------------------------------------------------------
// SHAKE CONTAINER
// ------------------------------------------------------------
var shakecontainer = function (x,y,params) { foxmovieclip.call(this,x,y,params) };
shakecontainer.prototype = Object.create(foxmovieclip.prototype);
shakecontainer.prototype.constructor = shakecontainer;
shakecontainer.prototype.awaken = function() { this.spawn() };
shakecontainer.prototype.spawn = function () {
    let t = this;
    if (t.mc.myshaker) {
        // if there's already a shaker for the mc, remove it
        t.xx = t.mc.myshaker.xx;
        t.yy = t.mc.myshaker.yy;
        t.mc.myshaker.kill();
    } else {
        t.xx = t.mc.x;
        t.yy = t.mc.y;
    }
    t.mc.myshaker = t;
    t.flip = true;
    t.starttime = Date.now();
};
shakecontainer.prototype.loop = function () {
    let t = this;
    if (t.xrange === 0) {
        t.mc.y = t.flip? t.yy-fox.random(Math.round(t.yrange)) : t.yy+fox.random(Math.round(t.yrange));
    } else if (t.yrange === 0) {
        t.mc.x = t.flip? t.xx-fox.random(Math.round(t.xrange)) : t.xx+fox.random(Math.round(t.xrange));
    } else {
        t.mc.x = t.xx-Math.round(t.xrange)+fox.random(2*Math.round(t.xrange));
        t.mc.y = t.yy-Math.round(t.yrange)+fox.random(2*Math.round(t.yrange));
    }
    t.flip = !t.flip;
    t.timepassed = Date.now()-t.starttime;
    if (t.timepassed > 0.7*t.duration) {
        if (t.xrange > 0) t.xrange = Math.max(1, 0.9*t.xrange);
        if (t.yrange > 0) t.yrange = Math.max(1, 0.9*t.yrange);
    }
    if (t.timepassed > t.duration) {
        t.mc.x = t.xx;
        t.mc.y = t.yy;
        t.mc.myshaker = null;
        t.kill();
    }
};
// ------------------------------------------------------------
// FADESCREEN
// ------------------------------------------------------------
var fadescreen = function (x,y,params) { foxmovieclip.call(this,x,y,params) };
fadescreen.prototype = Object.create(foxmovieclip.prototype);
fadescreen.prototype.constructor = fadescreen;
fadescreen.prototype.awaken = function() {
    let t = this;
    // make background
    t.boxbg = fox.makebox(-100,-100,g.screenwid+100,g.screenhei+100,t, 0xffffff,0);
    t.spawn();
};
fadescreen.prototype.spawn = function () {
    let t = this;
    g.fadescr = t;
    t.boxbg.tint = t.color;
    t.boxbg.alpha = t.fadeout ? 1 : 0;
    let tw = fox.tweenalpha(t.boxbg,t.fadeout ? 1 : 0,t.fadeout ? 0 : 1,t.duration,t.delay,g.easing.linear());
    // fadeout - kill when tween is done
    if (t.fadeout) tw.once('end', ()=> { t.die() });
};
fadescreen.prototype.die = function () {
    let t = this;
    fox.tweenremoveallfrom(t.boxbg);
    g.fadescr = null;
    t.kill();
};
// ------------------------------------------------------------
// TINTFLASH
// ------------------------------------------------------------
var tintflash = function (x,y,params) { foxmovieclip.call(this,x,y,params) };
tintflash.prototype = Object.create(foxmovieclip.prototype);
tintflash.prototype.constructor = tintflash;
tintflash.prototype.awaken = function() { this.spawn() }
tintflash.prototype.spawn = function () {
    let t = this;
    t.d = 0;
    t.starttime = Date.now();
    t.tintflashflip = true;
};
tintflash.prototype.loop = function () {
    let t = this;
    t.d--;
    if (t.d <= 0) {
        fox.tintcolor(t.mc, t.tintflashflip ? t.clr : 0xffffff);
        t.tintflashflip = !t.tintflashflip;
        t.d = 2;
    }
    if (Date.now()-t.starttime > t.duration) {
        fox.clearcolor(t.mc);
        t.kill();
    }
};