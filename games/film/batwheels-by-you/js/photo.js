var photo = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
photo.prototype = Object.create(foxmovieclip.prototype);
photo.prototype.constructor = photo;

photo.prototype.awaken = function() {
    let t = this;
    t.bgcontainer = fox.makecontainer(0,0,t);
    t.vehiclecontainer = fox.makecontainer(0,0,t);
    t.vehiclebelowmouthcontainer = fox.makecontainer(0,0,t);
    t.vehiclemouthcontainer = fox.makecontainer(0,0,t);
    t.vehiclebeloweyescontainer = fox.makecontainer(0,0,t);
    t.vehicleeyescontainer = fox.makecontainer(0,0,t);
    t.framecontainer = fox.makecontainer(0,0,t);
    // make frame
    let wid = 694;
    let hei = 446;
    fox.makebox(-wid/2,-hei/2,wid,hei,t.framecontainer,0xffffff,1,true,15);
    t.spawn();
};

photo.prototype.spawn = function () {
    let t = this;
    g.photo = t;
    // t.cacheAsBitmap = false;
    fox.killchildren(t.vehiclebelowmouthcontainer);
    fox.killchildren(t.vehiclemouthcontainer);
    fox.killchildren(t.vehiclebeloweyescontainer);
    fox.killchildren(t.vehicleeyescontainer);
    t.bgpic = fox.spawn('background'+t.p.bg,0,0,t.bgcontainer);
    t.vehicle = fox.spawn('vehicle'+t.p.vehicle,0,0,t.vehiclecontainer);
    if (t.p.clr >= 0) t.attach2vehicle('color',t.p.clr);
    if (t.p.hilite >= 0) t.attach2vehicle('hilite',t.p.hilite);
    t.attach2vehicle('sticker',t.p.sticker);
    if (t.p.eyes >= 0) t.attach2vehicle('eyes',t.p.eyes);
    if (t.p.mouth >= 0) t.attach2vehicle('mouth',t.p.mouth);
    t.vehiclemouthcontainer.y = t.vehiclebelowmouthcontainer.y = t.vehicleeyescontainer.y = t.vehiclebeloweyescontainer.y = t.vehiclecontainer.y = -g.backgroundoffset + g.vehiclecontaineroffset[t.p.vehicle];
    t.vehiclemouthcontainer.filters = t.vehicleeyescontainer.filters = t.vehiclebeloweyescontainer.filters = t.vehiclebelowmouthcontainer.filters = null;
    // fox.delayaction(-1,()=> { t.cacheAsBitmap = true });
};

photo.prototype.attach2vehicle = function(item,idx) {
    let t = this;
    let name = 'vehicle'+t.p.vehicle+item+idx;
    let container = t.vehiclecontainer;
    if (item === 'mouth') container = t.vehiclemouthcontainer;
    if (item === 'eyes') container = t.vehicleeyescontainer;
    let xx = g[name] ? g[name].x : 0;
    let yy = g[name] ? g[name].y : 0;
    if (g.vehicle) {
        xx += g.vehicle.x;
        yy += g.vehicle.y;
    }
    if (g.foxpic.hasOwnProperty(name)) {
        let it = fox.spawn(name, xx, yy, container);
        if (item === 'sticker') {
            fox.tint(it,g['vehicle'+t.p.vehicle+'stickertint'][t.p.sclr]);
        }
    }
    // add glow to eyes and mouth
    let colorindex = t.p.clr < 0 ? 8 : t.p.clr;
    let tinteyescolor = g['vehicle'+t.p.vehicle+'tint'][colorindex];
    let tinteyescolorbelow = g['vehicle'+t.p.vehicle+'tintbelow'][colorindex];
    // normally, mouth will have the same tint color as the eyes
    let tintmouthcolor = tinteyescolor;
    let tintmouthcolorbelow = tinteyescolorbelow;
    // ..except for Red & Batwing (these two have different tint for eyes/mouth for default)
    if (t.p.vehicle === 2 && item === 'eyes' && t.p.clr < 0) { tinteyescolor = 0x16ba04; tinteyescolorbelow = 0x15A604; }
    if (t.p.vehicle === 5 && item === 'eyes' && t.p.clr < 0) { tinteyescolor = 0xa71ad5; tinteyescolorbelow = 0xa71ad5; }
    // glow eyes & mouth
    if (item === 'mouth') common.addglow(t.vehiclemouthcontainer,t.vehiclebelowmouthcontainer,tintmouthcolor,tintmouthcolorbelow);
    if (item === 'eyes') common.addglow(t.vehicleeyescontainer,t.vehiclebeloweyescontainer,tinteyescolor,tinteyescolorbelow);
}

photo.prototype.die = function() {
    let t = this;
    // t.cacheAsBitmap = false;
    fox.killchildren(t.vehiclecontainer);
    fox.killchildren(t.vehiclebelowmouthcontainer);
    fox.killchildren(t.vehiclemouthcontainer);
    fox.killchildren(t.vehiclebeloweyescontainer);
    fox.killchildren(t.vehicleeyescontainer);
    fox.killchildren(t.bgcontainer);
    t.kill();
}