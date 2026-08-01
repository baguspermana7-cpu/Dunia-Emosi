var foxanimation = foxanimation || {};

foxanimation = function (x, y, params) {
    x = typeof x !== 'undefined' ? x : g.hscreenwid;
    y = typeof y !== 'undefined' ? y : g.hscreenhei;
    PIXI.Container.call(this);
    fox.activate(this);
    this.x = x;
    this.y = y;
    this.name = null;
    this.heaven = false;
    this.loopenabled = true;
    this.loopempty = false;
    this.oncompletekill = false;

    // callbacks
    this.oncomplete = undefined;
    this.onrepeat = undefined;

    this.playdir = 1;
    this.looping = 1;
    // fps (default is 0 which mean frame-based animation mode. Any other number means time-based animation)
    this.fps = 0;

    // set vars/properties from params
    for (let key in params) if (params.hasOwnProperty(key)) this[key] = params[key];
    if (this['name'] === undefined) {
        fox.alert('WARNING : foxanimation has no name!');
        // uncomment below to find the source of the problem
        // throw new Error('foxanimation has no name!');
    }

    this.aniname = this.name;
    this.totalframes = 0;
    this.parts = {};
    this.parttype = {};
    this.partrealname = {};
    this._alpha = 1;
    this._flipX = 1;
    this._flipY = 1;
    this._currentframe = 0;
    this.lastupdated = 0;
    this.framepassed = 0;
    this.playing = true;
    this.aniparts = g.foxani[this.aniname];
    this.mylist = this.aniparts['zindex'];
    this.uniqueID = g.foxuniqueID;
    g.foxuniqueID++;

    this.setall();

    Object.defineProperty(this, "wx", {
            get: function () { return this.world.x;},
            set: function (value) {this.world.x = value;}
        }
    );

    Object.defineProperty(this, "wy", {
            get: function () {return this.world.y;},
            set: function (value) {this.world.y = value;}
        }
    );

    Object.defineProperty(this, "depth", {
            get: function () {return this.parent.getChildIndex(this);},
            set: function (value) {this.parent.setChildIndex(this, value);}
        }
    );

    Object.defineProperty(this,"currentframe", {
            get: function () {return this._currentframe;},
            set: function (value) {
                this._currentframe = value;
            }
        }
    );

    Object.defineProperty(this,"alpha", {
            get: function () {return this._alpha;},
            set: function (value) {
                if (this._alpha !== value) this._alpha = value;
            }
        }
    );

    Object.defineProperty(this, "flipX", {
            get: function () {return this._flipX;},
            set: function (value) {
                if (this._flipX !== value) {
                    this._flipX = value;
                    this.scale.x = this._flipX*Math.abs(this.scale.x);
                }
            }
        }
    );

    Object.defineProperty(this, "flipY", {
            get: function () {return this._flipY;},
            set: function (value) {
                if (this._flipY !== value) {
                    this._flipY = value;
                    this.scale.y = this._flipY*Math.abs(this.scale.y);
                }
            }
        }
    );

    this.spawn();
    return this;
};

foxanimation.prototype = Object.create(PIXI.Container.prototype);
foxanimation.prototype.constructor = foxanimation;

foxanimation.prototype.spawn = function () {
    // reset skip flags for all parts (TRUE value will disable rotation/scale/position/alpha changes for that part)
    for (let i = 0; i < this.mylist.length; i++) {
        let key = this.mylist[i];
        let part = this.parts[key];
        part.skiprotation = false;
        part.skipscale = false;
        part.skipposition = false;
        part.skipalpha = false;
    }
    this.resetani();
    this.lastupdated = Date.now();
    this.updateframe();
    // reset callbacks
    this.oncomplete = undefined;
    this.onrepeat = undefined;
};

foxanimation.prototype.loop = function () {
    if (this.playing) {
        if (this.fps === 0) {
            // frame based animation
            this.advanceframe(g.fpsratio);
        } else {
            // time based animation
            this.framepassed = (Date.now()-this.lastupdated)/1000*this.fps;
            if (this.framepassed > 0.5) {
                this.advanceframe(Math.max(1, Math.round(this.framepassed)));
                this.lastupdated = Date.now();
            }
        }
        this.updateframe();
    }
};

// play
foxanimation.prototype.play = function () {
    this.playing = true;
};

// pause
foxanimation.prototype.pause = function () {
    this.playing = false;
};

// stop
foxanimation.prototype.stop = function () {
    this.playing = false;
    this._currentframe = 0;
    this.lastupdated = Date.now();
};
// goto and play
foxanimation.prototype.gotoandplay = function (num, reverse = false) {
    this._currentframe = num;
    this.updateframe();
    this.lastupdated = Date.now();
    this.playing = true;
    this.playdir = reverse ? -1 : 1;
};

// goto and stop
foxanimation.prototype.gotoandstop = function (num) {
    this._currentframe = num;
    this.updateframe();
    this.lastupdated = Date.now();
    this.playing = false;
};

// goto and play reverse
foxanimation.prototype.gotoandplayreverse = function (num) {
    this._currentframe = num;
    this.updateframe();
    this.lastupdated = Date.now();
    this.playing = true;
    this.playdir = -1;
};

// return part based on it's key (name)
foxanimation.prototype.getpart = function (key) {
    if (this.parts[key]) {
        return this.parts[key];
    } else {
        // fox.trace('fox.getpart failed: '+key+' not found!');
        return null;
    }
};

// reset foxanimation
foxanimation.prototype.resetani = function () {
    this.playdir = 1;
    if (this.totalframes === 1) {
        this.gotoandstop(0);
    } else {
        this.gotoandplay(0);
    }
    // also reset children that are foxanimations
    for (let i = 0; i < this.mylist.length; i++) {
        let key = this.mylist[i];
        if (this.parttype[key] === 2) this.parts[key].resetani();
    }
};

// advanceframe
foxanimation.prototype.advanceframe = function (num) {
    this._currentframe += this.playdir*num;
    if (this.playdir === 1) {
        if (this._currentframe >= this.totalframes) {
            if (this.looping === 0) {
                // no looping, stop
                this._currentframe = this.totalframes - 1;
                this.playing = false;
                if (this.oncomplete) this.oncomplete();
                if (this.oncompletekill) this.kill();
            } else if (this.looping === 1) {
                // normal looping
                this._currentframe = 0;
                if (this.onrepeat) this.onrepeat();
            } else if (this.looping === 2) {
                // yo-yo
                this.playdir = -1;
                this._currentframe = this.totalframes - 2;
                if (this.onrepeat) this.onrepeat();
            }
        }
    } else if (this.playdir === -1) {
        if (this._currentframe < 0) {
            if (this.looping === 0) {
                // no looping, stop
                this._currentframe = 0;
                this.playing = false;
                if (this.oncomplete) this.oncomplete();
                if (this.oncompletekill) this.kill();
            } else if (this.looping === 1) {
                // normal looping
                this._currentframe = this.totalframes - 1;
                if (this.onrepeat) this.onrepeat();
            } else if (this.looping === 2) {
                // yo-yo
                this.playdir = 1;
                this._currentframe = 1;
                if (this.onrepeat) this.onrepeat();
            }
        }
    }
};

// update frame
foxanimation.prototype.updateframe = function () {
    // iterate each part
    for (let i = 0; i < this.mylist.length; i++) {
        let key = this.mylist[i];
        let part = this.parts[key];
        let partdic = this.aniparts[key];
        let xx = partdic["x"];
        let yy = partdic["y"];
        let xska = partdic["xska"];
        let yska = partdic["yska"];
        let ro = partdic["ro"];
        let alpa = partdic["alpha"];
        if (alpa[this._currentframe] <= 0) {
            // part invisible, foxanimation will skip this frame and not update position/scale/alpha/rotation
            part.alpha = 0;
            // look for a flag to reset animation (marked by not only the alpha is zero, the part's also scaled tiny)
            if (alpa[this._currentframe] === 0 && Math.abs(xska[this._currentframe]) < 0.03 && Math.abs(yska[this._currentframe]) < 0.03) {
                if (this.parttype[key] === 1) {
                    // foxclip
                    part.a.stop(); // just stop here, and continue playing foxclip later below (when part becomes visible)
                } else if (this.parttype[key] === 2) {
                    // foxani
                    part.resetani();
                }
            }
        } else {
            // part visible
            if (!part.skipposition && part.x !== xx[this._currentframe]) part.x = xx[this._currentframe];
            if (!part.skipposition && part.y !== yy[this._currentframe]) part.y = yy[this._currentframe];
            if (!part.skipscale && part.scale.x !== xska[this._currentframe]) part.scale.x = xska[this._currentframe];
            if (!part.skipscale && part.scale.y !== yska[this._currentframe]) part.scale.y = yska[this._currentframe];
            if (!part.skiprotation && part.rotation !== ro[this._currentframe]) part.rotation = ro[this._currentframe];
            if (!part.skipalpha && part.alpha !== alpa[this._currentframe]) part.alpha = alpa[this._currentframe];
            // this is a foxclip, check if we need to reset/restart playing animatedSprite
            if (this.parttype[key] === 1) {
                if ((this._currentframe > 0 && alpa[this._currentframe - 1] === -9) || (this._currentframe === 0 && alpa[this.totalframes-1] === -9)) {
                    // restart animatedSprite
                    part.a.gotoAndPlay(0);
                }
            }
        }
    }
};

// cek duplicate (name ending with "copy", "copy2", "copy15", etc.);
foxanimation.prototype.cekduplicate = function (pname) {
    if (pname.length > 4 && pname.substring(pname.length - 4, pname.length) === "copy") {
        return pname.substring(0, pname.length - 4);
    } else if (pname.length > 5 && pname.substring(pname.length - 5, pname.length - 1) === "copy") {
        return pname.substring(0, pname.length - 5);
    } else if (pname.length > 6 && pname.substring(pname.length - 6, pname.length - 2) === "copy") {
        return pname.substring(0, pname.length - 6);
    } else if (pname.length > 7 && pname.substring(pname.length - 7, pname.length - 3) === "copy") {
        return pname.substring(0, pname.length - 7);
    } else if (pname.length > 8 && pname.substring(pname.length - 8, pname.length - 4) === "copy") {
        return pname.substring(0, pname.length - 8);
    }
    return pname;
};

foxanimation.prototype.setall = function () {
    let pname,key,it,pdic;
    // iterate each part
    for (let i = 0; i < this.mylist.length; i++) {
        key = pname = this.mylist[i];
        // dictionary of this part
        pdic = this.aniparts[key];
        // detect if this part is a copy
        pname = this.cekduplicate(pname);
        this.partrealname[key] = pname;
        if (pname in g.foxclip) {
            this.parttype[key] = 1;
            it = fox.attachmovie(pname, 0, 0, this, {heaven:this.heaven});
        } else if (pname in g.foxani) {
            this.parttype[key] = 2;
            it = fox.attachani(pname, 0, 0, this, {heaven:this.heaven});
        } else if (pname in g.foxpic) {
            this.parttype[key] = 3;
            it = fox.attachsprite(pname,0,0,this, {heaven:this.heaven});
            it.anchor.set(pdic['pivotx'],pdic['pivoty']);
            it.name = pname;
        } else if (typeof window[pname] === 'function') {
            it = fox.make(pname,0,0,this);
            this.parttype[key] = 4;
        } else {
            // part not found, replace with red box
            it = fox.attachpic('whitepixel',0,0,this,{center:false});
            it.a.scale.set(4);
            it.a.tint = 0xCC0000;
            it.name = pname;
            this.parttype[key] = 3;
            fox.alert("Warning! Foxani '" + this.aniname + "' : part '" + pname + "' not found!");
        }
        this.parts[key] = it;
    }
    this.totalframes = parseInt(pdic["totalframes"]);
};

// kill
foxanimation.prototype.kill = function (delay = 0, killchildren = true) {
    if (delay > 0) {
        // delayed kill
        fox.delayaction(delay, ()=> { this.kill(); });
    } else {
        // kill spawned children too (by default)
        if (killchildren) fox.killchildren(this);
        this.loopenabled = false;
        if (this.spawned) fox.pooladd(this);
        this.visible = false;
    }
};