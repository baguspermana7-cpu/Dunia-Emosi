var particle = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
particle.prototype = Object.create(foxmovieclip.prototype);
particle.prototype.constructor = particle;

particle.prototype.awaken = function() {
    this.spawn();
};

particle.prototype.spawn = function() {
    g.particles.push(this);
    this.active = this.dead = false;
    if (this.delay > 0) {
        fox.delayaction(this.delay, ()=> { this.activate() }, this.ignorepause);
    } else {
        this.activate();
    }
};

particle.prototype.activate = function(){
    this.part = fox.spawn(this.picname,0,0,this,{center:true});
    if (this.ska != 1) fox.setscale(this.part.a,this.ska);
    if (this.tint) fox.tint(this.part,this.tint);
    if (this.facedir) this.part.rotation = Math.atan2(this.ys,this.xs);
    if (this.lifespan > 0) fox.delayaction(this.lifespan, ()=> { this.lifespan = 0 }, this.ignorepause);
    this.active = true;
};

particle.prototype.loop = function() {
    if (!this.active) return;
    this.x += this.xs;
    this.y += this.ys;
    this.xs *= this.xsdiv;
    this.ys *= this.ysdiv;
    this.xs += this.xgrav;
    this.ys += this.ygrav;
    // out of bounds
    if ((this.xs < 0 && this.x < this.xmin) || (this.xs > 0 && this.x > this.xmax) || (this.ys < 0 && this.y < this.ymin) || (this.ys > 0 && this.y > this.ymax)) this.lifespan = 0;
    // rotation
    if (this.ro != 0) this.angle += this.ro;
    // shrinking
    if (this.shrinkdiv < 1) {
        this.shrinkdelay = Math.max(0,this.shrinkdelay-1);
        if (this.shrinkdelay === 0) {
            fox.setscale(this,this.shrinkdiv*this.scale.x);
            if (this.scale.x < 1-this.shrinkdiv) this.lifespan = 0;
        }
    }
    // growing
    if (this.growska > 1) {
        this.growdelay = Math.max(0,this.growdelay-1);
        if (this.growdelay === 0) {
            fox.setscale(this,this.scale.x+(this.growska-this.scale.x)/this.growdiv);
        }
    }
    // fading
    if (this.alphadiv < 1) {
        this.alphadelay = Math.max(0, this.alphadelay - 1);
        if (this.alphadelay === 0) {
            this.alpha *= this.alphadiv;
            if (this.alpha < 0.01) this.lifespan = 0;
        }
    }
    if (this.lifespan === 0) this.die();
};

particle.prototype.die = function () {
    if (this.dead) return;
    g.particles.remove(this);
    this.dead = true;
    this.part.kill();
    this.kill();
};