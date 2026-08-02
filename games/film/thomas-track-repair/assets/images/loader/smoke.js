(function (lib, cjs) {

var p; // shortcut to reference prototypes
lib.ssMetadata = [];


// symbols:



(lib.steampuffstackpuff = function() {
	this.initialize(ph.loader.get('sprites-loader'), 'smoke/stack');
}).prototype = p = new cjs.Sprite();
p.nominalBounds = new cjs.Rectangle(0,0,300,441);


(lib.steampuffwide = function() {
	this.initialize(ph.loader.get('sprites-loader'), 'smoke/wide');
}).prototype = p = new cjs.Sprite();
p.nominalBounds = new cjs.Rectangle(0,0,432,300);// helper functions:

function mc_symbol_clone() {
	var clone = this._cloneProps(new this.constructor(this.mode, this.startPosition, this.loop));
	clone.gotoAndStop(this.currentFrame);
	clone.paused = this.paused;
	clone.framerate = this.framerate;
	return clone;
}

function getMCSymbolPrototype(symbol, nominalBounds, frameBounds) {
	var prototype = cjs.extend(symbol, cjs.MovieClip);
	prototype.clone = mc_symbol_clone;
	prototype.nominalBounds = nominalBounds;
	prototype.frameBounds = frameBounds;
	return prototype;
	}


(lib.steampuffwide_1 = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 1
	this.instance = new lib.steampuffwide();
	this.instance.parent = this;
	this.instance.setTransform(-216,-150);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = getMCSymbolPrototype(lib.steampuffwide_1, new cjs.Rectangle(-216,-150,432,300), null);


(lib.steampuffstack = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 1
	this.instance = new lib.steampuffstackpuff();
	this.instance.parent = this;
	this.instance.setTransform(-150,-410.5);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(1));

}).prototype = getMCSymbolPrototype(lib.steampuffstack, new cjs.Rectangle(-150,-410.5,300,441), null);


(lib.Steamchugging = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 14
	this.instance = new lib.steampuffwide_1();
	this.instance.parent = this;
	this.instance.setTransform(9.2,-301.4,0.835,1.013,77.2);
	this.instance.alpha = 0.398;

	this.timeline.addTween(cjs.Tween.get(this.instance).to({scaleX:0.91,scaleY:1.21,rotation:40.3,x:-67.2,y:-315.3,alpha:0.301},14).to({scaleX:0.83,scaleY:0.87,rotation:2.7,x:-192.9,y:-230.4,alpha:0.051},19).to({_off:true},1).wait(1).to({_off:false,scaleX:0.44,scaleY:0.57,rotation:96.7,x:12.2,y:-156.7},0).to({scaleX:0.69,scaleY:0.9,rotation:93.1,x:22.9,y:-253.3,alpha:0.301},20).to({scaleX:0.84,scaleY:1.01,rotation:79,x:11.2,y:-299.4,alpha:0.398},8).wait(1));

	// Layer 16
	this.instance_1 = new lib.steampuffwide_1();
	this.instance_1.parent = this;
	this.instance_1.setTransform(15.1,-152.8,0.485,0.668,54.9);
	this.instance_1.alpha = 0.051;

	this.timeline.addTween(cjs.Tween.get(this.instance_1).to({scaleX:0.86,scaleY:1.07,rotation:75,x:-16.1,y:-291.5,alpha:0.5},24).to({scaleX:0.9,scaleY:1.05,rotation:69.2,x:-74.9,y:-294.1,alpha:0.398},16).to({scaleX:0.77,scaleY:0.89,rotation:36.6,x:-136.3,y:-221,alpha:0.051},21).to({_off:true},1).wait(2));

	// Layer 17
	this.instance_2 = new lib.steampuffwide_1();
	this.instance_2.parent = this;
	this.instance_2.setTransform(14.4,-153.1,0.42,0.599,84.2);
	this.instance_2.alpha = 0.051;
	this.instance_2._off = true;

	this.timeline.addTween(cjs.Tween.get(this.instance_2).wait(2).to({_off:false},0).to({scaleX:0.67,scaleY:0.85,rotation:93.1,x:27.6,y:-309.6,alpha:0.5},26).to({scaleX:0.83,scaleY:1.04,rotation:57.5,x:-71.5,y:-337.8},14).to({scaleX:0.83,rotation:35.9,x:-177.1,y:-336.5,alpha:0.051},21).wait(1));

	// Layer 18
	this.instance_3 = new lib.steampuffwide_1();
	this.instance_3.parent = this;
	this.instance_3.setTransform(-70.6,-307.3,0.928,0.967,53.3);
	this.instance_3.alpha = 0.398;

	this.timeline.addTween(cjs.Tween.get(this.instance_3).to({scaleX:0.72,scaleY:0.73,rotation:23.2,x:-163.2,y:-192.3,alpha:0.051},14).to({_off:true},1).wait(2).to({_off:false,scaleX:0.44,scaleY:0.55,rotation:87.5,x:26,y:-160.2},0).to({scaleX:0.65,scaleY:0.76,rotation:107.8,x:46.6,y:-285.3,alpha:0.5},23).to({scaleX:0.93,scaleY:1.11,rotation:86.7,x:-2.2,y:-291.6,alpha:0.602},15).to({scaleX:0.93,scaleY:0.97,rotation:55.5,x:-67.6,y:-307.3,alpha:0.398},8).wait(1));

	// Layer 6
	this.instance_4 = new lib.steampuffwide_1();
	this.instance_4.parent = this;
	this.instance_4.setTransform(-83.5,-276.9,0.87,1.105,0,41.4,43.9);
	this.instance_4.alpha = 0.398;

	this.timeline.addTween(cjs.Tween.get(this.instance_4).to({scaleX:0.8,scaleY:0.77,skewX:4.6,skewY:7.8,x:-210.6,y:-203.1,alpha:0.051},24).to({_off:true},1).wait(2).to({_off:false,scaleX:0.59,scaleY:0.77,skewX:44,skewY:47.1,x:-1.2,y:-165},0).to({scaleX:0.76,scaleY:0.89,skewX:60.9,skewY:64.4,x:-26.8,y:-279.9,alpha:0.5},21).to({scaleX:0.87,scaleY:1.11,skewX:45.5,skewY:48,x:-83.5,y:-276.9,alpha:0.398},15).wait(1));

	// Layer 12
	this.instance_5 = new lib.steampuffwide_1();
	this.instance_5.parent = this;
	this.instance_5.setTransform(-19.1,-276.1,0.608,0.846,71.4);
	this.instance_5.alpha = 0.199;

	this.timeline.addTween(cjs.Tween.get(this.instance_5).to({scaleX:0.94,scaleY:1.15,rotation:55.1,x:-27.2,y:-300.8,alpha:0.75},19).to({scaleX:0.88,scaleY:0.85,rotation:4.3,x:-178.7,y:-213.1,alpha:0.051},21).to({_off:true},1).wait(2).to({_off:false,scaleX:0.44,scaleY:0.58,rotation:78.7,x:17.6,y:-142.8},0).to({scaleX:0.61,scaleY:0.85,rotation:71.4,x:-16.4,y:-258.8,alpha:0.199},20).wait(1));

	// Layer 13
	this.instance_6 = new lib.steampuffwide_1();
	this.instance_6.parent = this;
	this.instance_6.setTransform(19.8,-196.8,0.535,0.735,89.2);
	this.instance_6.alpha = 0.102;

	this.timeline.addTween(cjs.Tween.get(this.instance_6).to({scaleX:0.79,scaleY:0.93,rotation:64.6,x:-24.8,y:-304.6,alpha:0.602},23).to({scaleX:0.79,scaleY:0.93,rotation:18.9,x:-168,y:-247.4,alpha:0.051},24).to({_off:true},1).wait(2).to({_off:false,scaleX:0.48,scaleY:0.65,rotation:98.8,x:30.9,y:-146.8},0).to({scaleX:0.54,scaleY:0.74,rotation:89.2,x:19.8,y:-196.8,alpha:0.102},13).wait(1));

	// Layer 15
	this.instance_7 = new lib.steampuffwide_1();
	this.instance_7.parent = this;
	this.instance_7.setTransform(-47.9,-336.1,0.759,0.948,98.8);
	this.instance_7.alpha = 0.5;

	this.timeline.addTween(cjs.Tween.get(this.instance_7).to({scaleX:0.81,scaleY:1.07,rotation:97.6,x:-92,y:-248.1},8).to({scaleX:0.8,scaleY:0.84,rotation:27.1,x:-153,y:-216.1,alpha:0.051},21).to({_off:true},1).wait(2).to({_off:false,scaleX:0.44,scaleY:0.63,rotation:80.5,x:-0.9,y:-143},0).to({scaleX:0.57,scaleY:0.86,rotation:100.8,x:3.1,y:-270.1,alpha:0.301},21).to({scaleX:0.76,scaleY:0.95,rotation:104.1,x:-47.9,y:-336.1,alpha:0.5},10).wait(1));

	// Layer 19
	this.instance_8 = new lib.steampuffwide_1();
	this.instance_8.parent = this;
	this.instance_8.setTransform(-188.1,-225,0.884,0.879,34.8);
	this.instance_8.alpha = 0.102;

	this.timeline.addTween(cjs.Tween.get(this.instance_8).to({scaleX:0.79,scaleY:0.79,rotation:16.5,x:-218.1,y:-161,alpha:0.051},7).to({_off:true},1).wait(3).to({_off:false,scaleX:0.46,scaleY:0.59,rotation:92.3,x:6,y:-166},0).to({scaleX:0.77,scaleY:0.98,rotation:98.4,x:19,y:-278,alpha:0.301},23).to({scaleX:0.99,scaleY:1.1,rotation:92.6,x:-40,alpha:0.5},14).to({scaleX:0.88,scaleY:0.88,rotation:38.1,x:-182.1,y:-230,alpha:0.102},15).wait(1));

	// stack
	this.instance_9 = new lib.steampuffstack();
	this.instance_9.parent = this;
	this.instance_9.setTransform(0,0,1,1,0,0,0,0,1);
	this.instance_9.alpha = 0.301;

	this.timeline.addTween(cjs.Tween.get(this.instance_9).to({scaleX:0.82,alpha:0.398},14).to({scaleX:1,alpha:0.301},14).to({scaleX:0.85,alpha:0.398},13).to({scaleX:1,alpha:0.301},22).wait(1));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(-420.2,-554.7,617.5,584.2);


// stage content:
(lib.Animation = function(mode,startPosition,loop) {
	this.initialize(mode,startPosition,loop,{});

	// Layer 1
	this.instance = new lib.Steamchugging("synched",0);
	this.instance.parent = this;
	this.instance.setTransform(347.9,228.5,0.666,0.666,0,0,0,-2,-219.8);

	this.timeline.addTween(cjs.Tween.get(this.instance).wait(64));

}).prototype = p = new cjs.MovieClip();
p.nominalBounds = new cjs.Rectangle(344.3,205.5,411.2,389);
// library properties:
lib.properties = {
	width: 550,
	height: 400,
	fps: 24,
	color: "#FFFFFF",
	opacity: 1.00,
	manifest: [
		{src:"images/steampuffstackpuff.png?1480617780748", id:"steampuffstackpuff"},
		{src:"images/steampuffwide.png?1480617780748", id:"steampuffwide"}
	],
	preloads: []
};

})(window.animSmoke=window.animSmoke||{}, createjs = createjs||{});