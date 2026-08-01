var foxmovieclip = foxmovieclip || {};

foxmovieclip = function (x, y, params) {
    x = typeof x !== 'undefined' ? x : g.hscreenwid;
    y = typeof y !== 'undefined' ? y : g.hscreenhei;
    PIXI.Container.call(this);
    fox.activate(this);
    this.x = x;
    this.y = y;
    // enable loop only if that function is not empty
    this.loopenabled = false;
    this.loopempty = fox.functionisempty(this.loop);
    this.name = null;
    this._act = "";
    this._flipX = 1;
    this._flipY = 1;
    this.actdict = {};
    this.acttype = {};
    this.actgo = null;
    this.heaven = false;
    this.uniqueID = g.foxuniqueID;
    g.foxuniqueID++;

    Object.defineProperty(this, "wx", {
            get: function () { return fox.globalpos(this).x;},
            set: function (value) { fox.setglobalpos(this,value,null); }
        }
    );

    Object.defineProperty(this, "wy", {
            get: function () {return fox.globalpos(this).y;},
            set: function (value) {fox.setglobalpos(this,null,value);}
        }
    );

    Object.defineProperty(this, "act", {
            get: function () {return this._act;},
            set: function (value) {
                if (value !== "") {
                    if (this._act !== value) {
                        // first call for this act?
                        if (!this.acttype.hasOwnProperty(value)) {
                            // setup new act
                            this.setupact(value);
                        } else {
                            // switch act
                            this.switchact(value);
                        }
                    }
                } else {
                    this.disableacts();
                }
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
    // set vars/properties from params
    for (let key in params) if (params.hasOwnProperty(key)) this[key] = params[key];
    if (this['name'] === undefined) {
        fox.alert('WARNING : foxmovieclip has no name!');
        // uncomment below to find the source of the problem
        throw new Error('foxmovieclip has no name!');
    }

    this.awaken();
    return this;
};

foxmovieclip.prototype = Object.create(PIXI.Container.prototype);
foxmovieclip.prototype.constructor = foxmovieclip;

foxmovieclip.prototype.awaken = function () {};
foxmovieclip.prototype.spawn = function () {};
foxmovieclip.prototype.loop = function () {};

// setup act
foxmovieclip.prototype.setupact = function (newact) {
    // first, disable all acts
    this.disableacts();
    if (newact in g.foxclip) {
        this.acttype[newact] = "foxclip";
        let it = fox.attachmovie(newact, 0, 0, this, {heaven:this.heaven});
        this.actdict[newact] = it;
        this._act = newact;
        this.actgo = it;
        this.addChild(it);
    } else if (newact in g.foxani) {
        this.acttype[newact] = "foxani";
        let it = fox.attachani(newact, 0, 0, this, {heaven:this.heaven});
        this.actdict[newact] = it;
        this._act = newact;
        this.actgo = it;
        this.addChild(it);
    } else if (newact in g.foxpic) {
        this.acttype[newact] = "foxpic";
        let it = fox.attachpic(newact, 0, 0, this,{center:false, heaven:this.heaven});
        this.actdict[newact] = it;
        this._act = newact;
        this.actgo = it;
        this.addChild(it);
    } else {
        fox.trace(name + ": setup act failed! " + newact + " not found!");
    }
};

// switch act
foxmovieclip.prototype.switchact = function (newact) {
    if (newact === "" || !(newact in this.actdict)) {
        fox.trace("Switchact error! Act "+newact+" not found!");
        return;
    }
    // first, disable all acts
    this.disableacts();
    let it = this.actdict[newact];
    this.actgo = it;
    fox.setvisible(it,true);
    // restart animation
    if (it.isfoxclip) fox.gotoandplay(it,0);
    if (it.isfoxani) it.resetani();
    this._act = newact;
};

// disable acts
foxmovieclip.prototype.disableacts = function () {
    for (let key in this.actdict) {
        if (this.actdict.hasOwnProperty(key)) fox.setvisible(this.actdict[key],false);
    }
    this.actgo = null;
    this._act = "";
};

// reset act - so that any next act (even though the same) will play from first frame
foxmovieclip.prototype.resetact = function () {
    this._act = "";
};

// kill
foxmovieclip.prototype.kill = function (delay = 0, killchildren = true) {
    if (delay !== 0) {
        // delayed kill
        fox.delayaction(delay, ()=> { this.kill() }, true);
    } else {
        // execute onkill
        if (this.onkill) this.onkill();
        // kill spawned children too (by default)
        if (killchildren) fox.killchildren(this);
        this.removeAllListeners();
        this.loopenabled = false;
        if (this.spawned) fox.pooladd(this);
        this.visible = false;
    }
};