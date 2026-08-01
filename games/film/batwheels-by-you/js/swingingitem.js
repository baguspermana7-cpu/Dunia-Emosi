var swingingitem = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
swingingitem.prototype = Object.create(foxmovieclip.prototype);
swingingitem.prototype.constructor = swingingitem;

swingingitem.prototype.awaken = function() {
    let t = this;
    t.spawn();
};

swingingitem.prototype.spawn = function () {
    let t = this;
    t.num = 0;
    if (g.stepnow < 2) {
        // sponge
        t.pic = fox.spawn('wetsponge',0,0,t);
        fox.setanchor(t.pic,0.5,0.35);
        // Swinging vars ==========
        t.swec1 = 0.4;
        t.swec2 = 0.1;
    } else {
        // towel
        t.pic = fox.spawn('drytowel',8,0,t);
        // Swinging vars ==========
        t.swec1 = 0.2;
        t.swec2 = 0.4;
    }
    t.swrotx = g.tool.x; // we use g.tool.x instead of t.x because this swingingitem is inside g.tool (a container)
    t.swxs = 0;
};

swingingitem.prototype.loop = function () {
    let t = this;
    t.oldx = g.tool.x; // we use g.tool.x instead of t.x because this swingingitem is inside g.tool (a container)
    t.oldy = g.tool.y; // we use g.tool.y instead of t.x because this swingingitem is inside g.tool (a container)
    // Swinging --------
    t.swxs = ((g.tool.x-t.swrotx)*t.swec1)+(t.swxs*t.swec2);
    t.swrotx += t.swxs;
    t.angle = 270+fox.deg(Math.atan2(35, -t.swxs));
}