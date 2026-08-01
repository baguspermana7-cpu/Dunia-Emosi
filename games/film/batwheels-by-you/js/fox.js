var fox = fox || {};

fox = {
    // blur display object
    addblur: function(it, amount, fadein = false, quality = 3) {
        let targetamount = amount;
        if (fadein) amount = 1;
        it.blurfilter = new PIXI.filters.KawaseBlurFilter(amount,quality,true);
        if (!it.filters) {
            it.filters = [it.blurfilter];
        } else {
            it.filters.push(it.blurfilter);
        }
        if (fadein) {
            for (let  i = 1; i < targetamount; i++) {
                fox.delayaction(i*100,()=> { it.blurfilter.blur++ }, true);
            }
        }
        return it.blurfilter;
    },

    removeblur: function(it, fadeout = false) {
        if (it.blurfilter) it.filters.remove(it.blurfilter);
    },

    // add PIXI.BLEND_MODES to foxpic/foxani
    // list of all blend modes supported by PIXI:
    // ADD,ADD_NPM,COLOR,COLOR_BURN,COLOR_DODGE,DARKEN,DIFFERENCE,ERASE,
    // EXCLUSION,HARD_LIGHT,HUE,LIGHTEN,LUMINOSITY,MULTIPLY,NONE,NORMAL,
    // NORMAL_NPM,OVERLAY,SATURATION,SCREEN,SCREEN_NPM,SOFT_LIGHT,SRC_ATOP,
    // SUBTRACT,XOR,SRC_IN,SRC_OUT,SRC_OVER,DST_ATOP,DST_IN,DST_OUT,DST_OVER,
    blendmode: function(it,blend = PIXI.BLEND_MODES.ADD) {
        if (it.isfoxpic || it.isfoxclip) {
            it.a.blendMode = blend
        }
    },

    // get duplicate values betwen 2 arrays
    // returns an array with all the duplicates
    getduplicatesbetweenarrays: function(array1,array2) {
        return array1.filter(function (val) {
            return array2.indexOf(val) != -1;
        });
    },

    // load data from my server
    loaddata: function(url,callback) {
        fox.trace('Loading data..');
        // send request
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", url, true);
        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xmlhttp.onload = function(evt) {
            fox.trace('Data loaded.');
            // replace &#34; to normal quotes before parsing
            // NOTE: the default .replace() behavior is to replace only the first match,
            // the /g modifier (global) tells it to replace all occurrences (/&#34;/g)
            let res = xmlhttp.responseText.replace(/&#34;/g,'\"');
            if (callback) {
                // send result via callback (standard way)
                callback(JSON.parse(res));
            } else {
                return JSON.parse(res);
            }
        }
        xmlhttp.onerror = function(evt) {
            fox.trace(evt);
            fox.trace("Error reading data from server!");
        }
        xmlhttp.send();
    },

    // save data to my server
    savedata: function(url,data,callback) {
        fox.trace('Sending data..');
        // send request
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", url, true);
        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xmlhttp.onload = function(evt) {
            // success
            fox.popmessage('Data saved.');
            if (callback) callback();
        };
        xmlhttp.onerror = function(evt) {
            fox.trace(evt);
            fox.trace("Error writing data to server!");
        }
        xmlhttp.send("data="+data);
    },

    // lets you know local storage size
    localstoragesize: function() {
        let _lsTotal = 0,
            _xLen, _x;
        for (_x in localStorage) {
            if (!localStorage.hasOwnProperty(_x)) {
                continue;
            }
            _xLen = ((localStorage[_x].length + _x.length) * 2);
            _lsTotal += _xLen;
            // fox.trace(_x.substr(0, 50) + " = " + (_xLen / 1024).toFixed(2) + " KB")
        }
        fox.trace("Local storage size = " + (_lsTotal / 1024).toFixed(2) + " KB");
    },

    // send log to my server
    // NOTE: log filename is 'laporanlog.txt'
    sendlog: function(message,callback) {
        fox.trace('Sending log..');
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", "https://www.ferryhalim.com/tulislog.php", true);
        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xmlhttp.onreadystatechange = function() {
            if (this.readyState === 4 || this.status === 200){
                // success
                if (callback) callback();
            }
        };
        xmlhttp.send("msg="+message);
    },

    // split integer number into parts
    // Example: fox.splitnumber(17,5) -> [4,4,3,3,3] ---> total of all the array elements is 17 (original number)
    //          fox.splitnumber(9,4) -> [3,2,2,2] ---> total of all the array elements is 9 (original number)
    splitnumber: function(number, parts) {
        const remainder = number % parts
        const baseValue = (number - remainder) / parts
        return Array(parts).fill(baseValue).fill(baseValue + 1, 0, remainder)
    },

    // returns a sorted array of keys from an object based on a property
    /* Example:
    var data = {
        Josh: { age: 30, married: true },
        April : { age: 15, married: false },
        Ben: { age: 65, married: true },
    }
    console.log( fox.sortobject(data,'age) )
    Result would be:
    [
        {"key": "April", "value": 15},
        {"key": "Josh", "value": 30},
        {"key": "Ben", "value": 65}
    ]
    */
    sortobject: function(obj,prop) {
        let arr = [];
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                arr.push({key,value:obj[key][prop]});
            }
        }
        arr.sort(function(a, b) { return a.value - b.value; });
        //arr.sort(function(a, b) { a.value.toLowerCase().localeCompare(b.value.toLowerCase()); }); //use this to sort as strings
        return arr;
    },

    // generate hitmap from spritesheet (for pixel-perfect hitTest)
    // Note: this is actually lossy and not 'perfect' because :
    //          1. Finger touch doesn't need to be pixel-perfect
    //          2. To avoid old devices crash when generating 'perfect' hitmap
    //          3. Perfect hitmap array for 4096 x 4096 bitmap takes too much memory
    //          4. A hitmap scale of 0.125 from 4096 is good enough for interaction
    generatehitmap: function(atlas) {
        let t = this;
        // get base texture of the atlas
        let basetex = g.loader.resources[atlas].spritesheet.baseTexture;
        // create texture from base texture
        let sourcetexture = fox.texturefrombasetexture(basetex);
        // scale down the base texture
        let texture = fox.rescalebasetexture(sourcetexture,g.hitmapscale);
        // use this scaled-down texture to create hitmap
        basetex.hitmap = fox.extractalphapixels(texture);
    },

    // create a new texture from base texture
    // Note: use x,y,wid,hei params to get only a rectangular part from the base texture (for example, you just want one pic from a spritesheet)
    // Usage: let basetex = g.loader.resources['foxani3'].spritesheet.baseTexture;
    //        let newtexture = fox.texturefrombasetexture(basetex); // if no x,y parameter, will return the whole basetexture as texture
    texturefrombasetexture: function (basetexture,x,y,wid,hei) {
        if (typeof x === 'undefined') {
            x = y = 0; // default values
            wid = basetexture.width;
            hei = basetexture.height;
        }
        return new PIXI.Texture(basetexture, new PIXI.Rectangle(x,y,wid,hei))
    },

    // rescale base texture (will return a PIXI.RenderTexture)
    // Usage:   let basetex = g.loader.resources['foxani3'].spritesheet.baseTexture; // first define the base texture
    //          var sourcetexture = fox.texturefrombasetexture(basetex); // create source texture from base texture
    //          let texture = fox.rescalebasetexture(sourcetexture,0.25); // create a new texture that is 25% in size
    //          let sprite = new PIXI.Sprite(texture); // create a sprite that uses the new render texture
    //          t.addChild(sprite);
    rescalebasetexture: function (basetexture, scale = 1) {
        let renderer = g.app.renderer;
        // create texture from base texture
        let sourcetexture = fox.texturefrombasetexture(basetexture);
        // create sprite and container to resize the texture
        let container = new PIXI.Container();
        let sprite = new PIXI.Sprite(sourcetexture);
        sprite.scale.x = sprite.scale.y = scale;
        container.addChild(sprite);
        // render the original again in scaled mode
        let rendertex = PIXI.RenderTexture.create({ width: scale * sourcetexture.width, height: scale * sourcetexture.height });
        renderer.render(container, {renderTexture:rendertex});
        // return the scaled texture
        return rendertex;
    },

    // Extract only alpha pixels from texture (modified from PIXI.Extract function g.app.renderer.plugins.extract.pixels(texture))
    extractalphapixels: function(renderTexture) {
        let renderer = g.app.renderer;
        let resolution;
        let frame;
        let bytesperpixel = 4;
        resolution = renderTexture.baseTexture.resolution;
        frame = renderTexture.frame;
        // bind the buffer
        renderer.renderTexture.bind(renderTexture);
        let width = frame.width * resolution;
        let height = frame.height * resolution;
        let pixels = new Uint8Array(bytesperpixel * width * height);
        let arr = new Uint8Array(width * height);
        // read pixels to the array
        let gl = renderer.gl;
        gl.readPixels(frame.x * resolution, frame.y * resolution, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        // create Alpha array only from the RGBA pixels array
        for (let i = 0; i < pixels.length; i += 4) arr[i/4] = pixels[i+3];
        return arr;
    },

    // get texture (snapshot) of a display object (sprite/container), with scaling option
    // for example, safari game: take photos of the screen, scale it down, and create a photo book
    // Usage: let tex = fox.getdisplayobjecttexture(g.app.stage,0.3,0,0,370,300);
    //         let pic = new PIXI.Sprite(tex);
    //         t.addChild(pic);
    // Note: - if using this function multiple times, it's best to reuse the renderTexture to save memory!
    //       - PIXI.RenderTexture.create has no way to change rectangle x,y position (only width & height), but you can do STEP 2 where you put the renderTexture from STEP 1 into another container and position/scale it
    getdisplayobjecttexture: function (displayobject, scale = 1, x = 0, y = 0, width, height) {
        width = typeof width !== 'undefined' ? width : displayobject.width;
        height = typeof height !== 'undefined' ? height : displayobject.height;
        let renderer = g.app.renderer;
        // STEP 1: get original texture
        let renderTexture = PIXI.RenderTexture.create({ width: x+width, height: y+height });
        renderer.render(displayobject, {renderTexture});
        // STEP 2: create sprite and container to resize and offset x,y the texture
        let container = new PIXI.Container();
        let sprite = new PIXI.Sprite(renderTexture);
        sprite.anchor.x = sprite.anchor.y = 0;
        sprite.scale.x = sprite.scale.y = scale;
        sprite.x = scale * -x;
        sprite.y = scale * -y;
        container.addChild(sprite);
        // render the original again in scaled mode
        let renderscaledTexture = PIXI.RenderTexture.create({ width: scale * width, height: scale * height });
        renderer.render(container, {renderTexture:renderscaledTexture});
        return renderscaledTexture;
    },

    // convert texture to base64
    texture2base64: function(texture) {
      return g.app.renderer.plugins.extract.base64(texture);
    },

    // take screenshot and save the texture to g.foxpic
    screenshot: function(x = 0, y = 0, width = g.screenwid, height = g.screenhei, scale = 1, name = '') {
        if (name === '') name = 'screenshot';
        let tex = fox.getdisplayobjecttexture(g.app.stage,scale,x,y,width,height);
        if (name !== 'screenshot' && g.foxpic.hasOwnProperty(name)) {
            fox.alert('fox.screenshot failed! g.foxpic already has '+name);
        } else {
            g.foxpic[name] = tex.clone();
        }
    },

    // draw polygon
    drawpolygon: function(parent, vertexarray, color = 0xff0000, alpha = 0.5, outline = false) {
        let polygon = new PIXI.Polygon(vertexarray);
        let a = new PIXI.Graphics();
        if (outline) a.lineStyle({width: 2, color, alpha, alignment: 0.5}); // outline only
        if (!outline) a.beginFill(color, alpha); // solid polygon
        a.drawPolygon(polygon);
        parent.addChild(a);
    },

    // Shrink or enlarge images to fit certain area (while keeping aspect ratio)
    aspectratiofit: function(picWidth, picHeight, maxWidth, maxHeight) {
        let ratio = Math.min(maxWidth / picWidth, maxHeight / picHeight);
        return {ratio, width:picWidth*ratio, height:picHeight*ratio};
    },

    getatlasresolution: function(atlasname) {
        return (g.ratio > 2 && (atlasname.includes('foxpic') || atlasname.includes('foxani'))) ? '_4x' : g.ratio >= 2 ? '_2x' : '_1x';
    },

    // fit text to fit width (in pixels)
    textfitwidth: function(txt,wid) {
        if (txt.textWidth > wid) txt.scale.x = wid/txt.textWidth;
    },

    // load JS
    // usage: fox.loadJS(['js/level5bg.js','js/level5items.js'],()=> { t.oncomplete() })
    loadJS: function(arr,onComplete,onProgress = null) {
        // create manifest based on arr
        let manifest = [];
        for (let  i = 0; i < arr.length; i++) {
            manifest.push({id:i,src:arr[i]})
        }
        // create preloadJS queue
        let queue = new createjs.LoadQueue();
        queue.on('complete',onComplete);
        if (onProgress) queue.on('progress',onProgress);
        queue.on('error', (e)=> { console.log('Preload error', e) });
        queue.loadManifest(manifest);
    },

    // returns true if the string ends with 4 digits
    endswithdigits: function(str, digits = 4) {
        return /.*[^\d]\d{4}\s*$/.test(str);
    },

    // set mc invisible including children
    setvisible: function(it,visible = true) {
        it.visible = visible;
        for (let  i = 0; i < it.children.length; i++) {
            fox.setvisible(it.children[i],visible);
        }
    },

    // tell a foxmovieclip to wander around
    // WARNING: currently this will replace any 'onkill' function! See new 'onkill' below
    wander: function(it,params) {
        params = typeof params !== 'undefined' ? params : {}; // params
        params.xmin = typeof params.xmin !== 'undefined' ? params.xmin : 0;
        params.ymin = typeof params.ymin !== 'undefined' ? params.ymin : 0;
        params.xmax = typeof params.xmax !== 'undefined' ? params.xmax : 100;
        params.ymax = typeof params.ymax !== 'undefined' ? params.ymax : 100;
        params.xs = typeof params.xs !== 'undefined' ? params.xs : 0; // horizontal speed
        params.ys = typeof params.ys !== 'undefined' ? params.ys : 0; // vertical speed
        params.flipturnX = typeof params.flipturnX !== 'undefined' ? params.flipturnX : true; // flip whenever turning left-right
        params.flipturnY = typeof params.flipturnY !== 'undefined' ? params.flipturnY : true; // flip whenever turning up down
        params.lifespan = typeof params.lifespan !== 'undefined' ? params.lifespan : -1; // in miliseconds
        params.killoutofbounds = typeof params.killoutofbounds !== 'undefined' ? params.killoutofbounds : false; // kill when going over the bounds/edges (instead of turning back)
        it.wandervars = fox.clone(params);
        // add wander function into this foxmovieclip
        if (!it.wanderfunction) {
            it.wanderfunction = function () {
                if (!it.wandervars.active) return;
                it.x += it.wandervars.xs;
                it.y += it.wandervars.ys;
                // cek limits
                if (it.wandervars.xs > 0 && it.x > it.wandervars.xmax) {
                    if (it.wandervars.killoutofbounds) {
                        it.kill();
                    } else {
                        it.x = it.wandervars.xmax;
                        it.wandervars.xs = -it.wandervars.xs;
                        if (it.wandervars.flipturnX) it.flipX = -1;
                    }
                } else if (it.wandervars.xs < 0 && it.x < it.wandervars.xmin) {
                    if (it.wandervars.killoutofbounds) {
                        it.kill();
                    } else {
                        it.x = it.wandervars.xmin;
                        it.wandervars.xs = -it.wandervars.xs;
                        if (it.wandervars.flipturnX) it.flipX = 1;
                    }
                }
                if (it.wandervars.ys > 0 && it.y > it.wandervars.ymax) {
                    if (it.wandervars.killoutofbounds) {
                        it.kill();
                    } else {
                        it.y = it.wandervars.ymax;
                        it.wandervars.ys = -it.wandervars.ys;
                        if (it.wandervars.flipturnY) it.flipY = -1;
                    }
                } else if (it.wandervars.ys < 0 && it.y < it.wandervars.ymin) {
                    if (it.wandervars.killoutofbounds) {
                        it.kill();
                    } else {
                        it.y = it.wandervars.ymin;
                        it.wandervars.ys = -it.wandervars.ys;
                        if (it.wandervars.flipturnY) it.flipY = 1;
                    }
                }
            }
            // add to loop function OR replace loop function with wanderfunction
            if (!it.loopempty) {
                it.loop = fox.mergefunctions(it.loop, it.wanderfunction, it, it);
            } else {
                it.loop = it.wanderfunction;
            }
            fox.activate(it);
            if (it.wandervars.flipturnX) it.flipX = it.wandervars.xs < 0 ? -1:1;
            if (it.wandervars.flipturnY) it.flipY = it.wandervars.ys < 0 ? -1:1;
            // add onkill function to disable wanderfunction when killed (otherwise it'll be wandering the next time you spawn it)
            it.onkill = function() { it.wandervars.active = false };
        }
        // activate loop
        it.loopempty = false;
        it.loopenabled = true;
        it.wandervars.active = true;
        if (it.wandervars.lifespan > 0) fox.delayaction(it.wandervars.lifespan, () => { it.kill() });
    },

    // merge functions into one (useful if you need to add more to 'loop' function)
    /* Usage example:
    start.prototype.tes1 = function(value=0) { fox.trace(this.num1+value) }
    start.prototype.tes2 = function(value=0) { fox.trace(this.num2+value) }
    start.prototype.spawn = function() {
        this.num1 = 777;
        this.num2 = 888;
        // now let's replace tes1 and make it a combination of tes1 & tes2
        this.tes1 = fox.mergefunctions(this.tes1,this.tes2,this,this,1); // -> the '1' is because tes1 accepts 1 parameter
        this.tes1(1,5); // -> result will be 778 & 893
    }
     */
    mergefunctions: function(function1, function2, instance1, instance2, numberOfArgumentsToPassToFunc1,arguments) {
        return function() {
            var _arguments  = Array.prototype.slice.apply(arguments);
            var _arguments1 = _arguments.slice(0, numberOfArgumentsToPassToFunc1);
            var _arguments2 = _arguments.slice(numberOfArgumentsToPassToFunc1);
            var that = this;
            (function(function1, function2) {
                if (typeof function1 == "function") {
                    if (typeof instance1 != "undefined") {
                        function1.apply(instance1, _arguments1);
                    }
                    else if (that == window) {
                        function1.apply(function1, _arguments1);
                    }
                    else {
                        var compare = mergeFunctions(function(){}, function(){});
                        if (that.toString() == compare.toString()) {
                            function1.apply(function1, _arguments1);
                        }
                        else {
                            function1.apply(that, _arguments1);
                        }
                    }
                }
                if (typeof function2 == "function") {
                    if (typeof instance2 != "undefined") {
                        function2.apply(instance2, _arguments2);
                    }
                    else if (that == window) {
                        function2.apply(function2, _arguments2);
                    }
                    else {
                        var compare = mergeFunctions(function(){}, function(){});
                        if (that.toString() == compare.toString()) {
                            function2.apply(function2, _arguments2);
                        }
                        else {
                            function2.apply(that, _arguments2);
                        }
                    }
                }
            })(function1, function2);
        }
    },

    // white flash mc (make it bright white, and then fade to normal)
    // NOTE: for performance, you can disable glow filter by setting glowdistance to 0
    brightfade: function(mc, duration = 400, delay = 0, glowdistance = 80) {
        let arr = [];
        if (mc.brightfade_tweenadjustmentfilter) mc.brightfade_tweenadjustmentfilter.stop(true);
        if (mc.brightfade_tweenglowfilter) mc.brightfade_tweenglowfilter.stop(true);
        // is glow enabled?
        if (glowdistance > 0) {
            // add glow
            mc.brightfade_glowfilter = new PIXI.filters.GlowFilter({distance: glowdistance, outerStrength: 2});
            arr.push(mc.brightfade_glowfilter);
            mc.brightfade_tweenglowfilter = fox.tween(mc.brightfade_glowfilter, {distance: glowdistance, outerStrength: 2}, {distance: 0, outerStrength: 0}, duration-50, delay, g.easing.linear());
        }
        // make it bright all white
        mc.brightfade_adjustmentfilter = new PIXI.filters.AdjustmentFilter({contrast:0,brightness:3});
        arr.push(mc.brightfade_adjustmentfilter);
        mc.brightfade_tweenadjustmentfilter = fox.tween(mc.brightfade_adjustmentfilter,{contrast:0,brightness:3},{contrast:1,brightness:1},duration,delay, g.easing.linear());
        mc.brightfade_tweenadjustmentfilter.once('end',()=> {
            if (mc.filters) {
                mc.filters.remove(mc.brightfade_adjustmentfilter);
                mc.brightfade_adjustmentfilter = mc.brightfade_tweenadjustmentfilter = undefined;
                if (mc.brightfade_tweenglowfilter) {
                    mc.filters.remove(mc.brightfade_glowfilter);
                    mc.brightfade_glowfilter = mc.brightfade_tweenglowfilter = undefined;
                }
            }
        });
        mc.filters = arr;
    },

    // light RGB (using pixi-heaven)
    // Note: use fox.attachpic/fox.attachani with param {heaven=true} to create pixi-heaven sprites
    lightcolor: function(mc,R,G,B) {
        if (mc.isfoxpic || mc.isfoxclip) {
            try {
                mc.a.color.setLight(R, G, B);
            } catch (e) {
                fox.warn('fox.lightcolor failed on '+mc.name+'! If using t.act, make sure t.heaven=true!');
            }
        } else if (mc.issprite) {
            try {
                mc.color.setLight(R, G, B);
            } catch (e) {
                fox.warn('fox.lightcolor failed on '+mc.name+'!');
            }
        } else if (mc.isfoxani) {
            for (let  i = 0; i < mc.children.length; i++) {
                fox.lightcolor(mc.children[i],R,G,B);
            }
        }
    },

    // dark RGB (using pixi-heaven)
    // Note: use fox.attachpic/fox.attachani with param {heaven=true} to create pixi-heaven sprites
    darkcolor: function(mc,R,G,B) {
        if (mc.isfoxpic || mc.isfoxclip) {
            try {
                mc.a.color.setDark(R, G, B);
            } catch (e) {
                fox.warn('fox.darkcolor failed on '+mc.name+'! If using t.act, make sure t.heaven=true!');
            }
        } else if (mc.issprite) {
            try {
                mc.color.setDark(R, G, B);
            } catch (e) {
                fox.warn('fox.darkcolor failed on '+mc.name+'!');
            }
        } else if (mc.isfoxani) {
            for (let  i = 0; i < mc.children.length; i++) {
                fox.darkcolor(mc.children[i],R,G,B);
            }
        }
    },

    // Make whole sprite of one color - tint color RGB (using pixi-heaven)
    // Note: use fox.attachpic/fox.attachani with param {heaven=true} to create pixi-heaven sprites
    //       fox.tintcolor(t.mc, 0xff0000);
    tintcolor: function(mc,clr) {
        if (mc.isfoxpic || mc.isfoxclip) {
            try {
                mc.a.tint = clr;
                mc.a.color.dark[0] = mc.a.color.light[0];
                mc.a.color.dark[1] = mc.a.color.light[1];
                mc.a.color.dark[2] = mc.a.color.light[2];
                mc.a.color.invalidate();
            } catch (e) {
                fox.warn('fox.tintcolor failed on '+mc.name+'! If using t.act, make sure t.heaven=true!');
            }
        } else if (mc.issprite) {
            try {
                mc.tint = clr;
                mc.color.dark[0] = mc.color.light[0];
                mc.color.dark[1] = mc.color.light[1];
                mc.color.dark[2] = mc.color.light[2];
                mc.color.invalidate();
            } catch (e) {
                fox.warn('fox.tintcolor failed on '+mc.name+'!');
            }
        } else if (mc.isfoxani) {
            for (let  i = 0; i < mc.children.length; i++) {
                fox.tintcolor(mc.children[i],clr);
            }
        }
    },

    // clear tint (using pixi-heaven)
    clearcolor: function(mc) {
        if (mc.isfoxpic || mc.isfoxclip) {
            try {
                mc.a.color.clear();
                mc.a.color.invalidate(); // must invalidate after clear
            } catch (e) {
                fox.warn('fox.clearcolor failed on '+mc.name+'!');
            }
        } else if (mc.issprite) {
            try {
                mc.color.clear();
                mc.color.invalidate(); // must invalidate after clear
            } catch (e) {
                fox.warn('fox.clearcolor failed on '+mc.name+'!');
            }
        } else if (mc.isfoxani) {
            for (let  i = 0; i < mc.children.length; i++) {
                fox.clearcolor(mc.children[i]);
            }
        }
    },

    // pop image
    popimage: function(name,x,y,parent,params) {
        params = typeof params !== 'undefined' ? params : {}; // params
        ska = typeof params.ska !== 'undefined' ? params.ska : 1; // scale
        duration = typeof params.duration !== 'undefined' ? params.duration : 1000; // tween duration
        delay = typeof params.delay !== 'undefined' ? params.delay : 0; // delay before popping
        showtime = typeof params.showtime !== 'undefined' ? params.showtime : 500; // showing time before disappear
        let it = fox.spawn(name,x,y,parent, {center:true});
        let tw = fox.tweenscale(it,2*ska,ska,duration,delay,g.easing.outElastic());
        tw.once('end',()=> { fox.remove(it,200,duration+showtime) });
        if (delay > 0) {
            it.visible = false;
            tw.once('start',()=> { it.visible = true });
        }
    },

    // display console log on game screen
    // you can activate by tapping 3x top-right corner of the game screen at loading screen
    // or by calling fox.showlog()
    showlog: function() {
        if (g.showinglog) return;
        g.showinglog = true;
        // create log text
        let logstyle = {fontFamily:'arialnarrow',fontSize:14,fill:0xFFFFFF,stroke:0x000000,strokeThickness:3,lineHeight:16,wordWrap:true,wordWrapWidth:g.screenwid};
        g.logtext = fox.attachtext('',2,0,g.logcontainer, logstyle,false);
        fox.setanchor(g.logtext,0,0);
        // create scrolling bar
        let wid = 20;
        let hei = 80;
        g.logscrollbarbg = fox.makebox(g.screenwid-wid,0,wid,g.screenhei,g.logcontainer,0x000000,0.3);
        g.logscrollbar = fox.makebox(g.screenwid-wid+2,2,wid-4,hei,g.logcontainer,0xffffff,1);
        g.logscrollbar.interactive = true;
        g.logscrollbar.size = hei;
        g.logscrollbar.min = g.logscrollbar.y;
        g.logscrollbar.max = g.logscrollbar.y+g.screenhei-hei-4;
        g.logscrollbar.range = g.logscrollbar.max-g.logscrollbar.min;
        g.logscrollbar
            .on('pointerdown', (e)=> {
                g.logscrollbar.dragging = true;
                g.logscrollbar.offsety = e.data.getLocalPosition(g.logscrollbar.parent).y-g.logscrollbar.y;
            })
            .on('pointerup', (e)=> {
                g.logscrollbar.dragging = false;
            })
            .on('pointerupoutside', (e)=> {
                g.logscrollbar.dragging = false;
            })
            .on('pointermove', (e)=> {
                if (g.logscrollbar.dragging) {
                    let newPosition = e.data.getLocalPosition(g.logscrollbar.parent);
                    g.logscrollbar.y = Math.max(g.logscrollbar.min,Math.min(g.logscrollbar.max,Math.round(newPosition.y-g.logscrollbar.offsety)));
                    g.logtext.y = -((g.logscrollbar.y-g.logscrollbar.min)/g.logscrollbar.range)*(g.logtext.height-g.hscreenhei);
                }
            })
        // create show/hide button
        let buttoncontainer = fox.makecontainer(g.screenwid-wid-5-20,20,g.logcontainer);
        fox.makebox(-20,-20,40,40,buttoncontainer,0x66FF00,0.7);
        // make 'X'
        let xcontainer = fox.makecontainer(0,0,buttoncontainer);
        fox.makebox(-10,-3,20,6,xcontainer,0xFFFFFF);
        fox.makebox(-3,-10,6,20,xcontainer,0xFFFFFF);
        xcontainer.angle = 45;
        buttoncontainer.interactive = true;
        buttoncontainer.on('pointertap',()=> {
            g.logscrollbar.visible = !g.logscrollbar.visible;
            g.logtext.visible = !g.logtext.visible;
            g.logscrollbarbg.visible = !g.logscrollbarbg.visible;
        });
        // hijack console.log
        let cl = console.log;
        console.log = function(message) {
            // remove '%c ' from message
            let msg = message.replace('%c ','');
            // remove quotes from message
            msg = msg.replace(/['"]+/g, '')
            g.logtext.text += '\n'+msg;
            g.logtext.y = g.screenhei-g.logtext.height;
            g.logscrollbar.y = g.logtext.height/(g.logtext.height+g.hscreenhei)*(g.logscrollbar.max-g.logscrollbar.min-g.logscrollbar.size);
            cl.apply(this, arguments)
        }
        let cw = console.warn;
        console.warn =  function(message) {
            // remove '%c ' from message
            let msg = message.replace('%c ','');
            // remove quotes from message
            msg = msg.slice(1, -2);
            g.logtext.text += '\n'+msg;
            g.logtext.y = g.screenhei-g.logtext.height;
            g.logscrollbar.y = g.logtext.height/(g.logtext.height+g.hscreenhei)*(g.logscrollbar.max-g.logscrollbar.min-g.logscrollbar.size);
            cw.apply(this, arguments)
        }
        let ce = console.error;
        console.error =  function(message) {
            // remove '%c ' from message
            let msg = message.replace('%c ','');
            // remove quotes from message
            msg = msg.slice(1, -2);
            g.logtext.text += '\n'+msg;
            g.logtext.y = g.screenhei-g.logtext.height;
            g.logscrollbar.y = g.logtext.height/(g.logtext.height+g.hscreenhei)*(g.logscrollbar.max-g.logscrollbar.min-g.logscrollbar.size);
            ce.apply(this, arguments)
        }
        // show game info
        common.showappinfo();
    },

    // create moving background
    movingbackground: function(picname,x,y,parent,range,speedmultiplier) {
        return fox.spawn('movingbackground',x,y,parent,{bg:picname,range,speedmultiplier})
    },

    // create a sprite particle (with movement parameters)
    particle: function(picname,x,y,parent,params) {
        let xs = typeof params.xs !== 'undefined' ? params.xs : 0;
        let ys = typeof params.ys !== 'undefined' ? params.ys : 0;
        let xgrav = typeof params.xgrav !== 'undefined' ? params.xgrav : 0;
        let ygrav = typeof params.ygrav !== 'undefined' ? params.ygrav : 0;
        let xsdiv = typeof params.xsdiv !== 'undefined' ? params.xsdiv : 1; // multiplier to reduce xs
        let ysdiv = typeof params.ysdiv !== 'undefined' ? params.ysdiv : 1; // multiplier to reduce ys
        let ska = typeof params.ska !== 'undefined' ? params.ska : 1; // particle scale
        let growska = typeof params.growska !== 'undefined' ? params.growska : 1; // grow target scale
        let growdiv = typeof params.growdiv !== 'undefined' ? params.growdiv : 8; // grow particle
        let growdelay = typeof params.growdelay !== 'undefined' ? params.growdelay : 0; // delay before growing
        let shrinkdiv = typeof params.shrinkdiv !== 'undefined' ? params.shrinkdiv : 1; // shrink particle (to oblivion)
        let shrinkdelay = typeof params.shrinkdelay !== 'undefined' ? params.shrinkdelay : 0; // delay before shrinking
        let ro = typeof params.ro !== 'undefined' ? params.ro : 0;
        let alphadiv = typeof params.alphadiv !== 'undefined' ? params.alphadiv : 1; // multiplier to reduce alpha
        let alphadelay = typeof params.alphadelay !== 'undefined' ? params.alphadelay : 0; // delay before alpha start fading
        let xmin = typeof params.xmin !== 'undefined' ? params.xmin : x-1000;
        let xmax = typeof params.xmax !== 'undefined' ? params.xmax : x+1000;
        let ymin = typeof params.ymin !== 'undefined' ? params.ymin : y-1000;
        let ymax = typeof params.ymax !== 'undefined' ? params.ymax : y+1000;
        let facedir = typeof params.facedir !== 'undefined' ? params.facedir : true;
        let lifespan = typeof params.lifespan !== 'undefined' ? params.lifespan : -1; // in miliseconds
        let delay = typeof params.delay !== 'undefined' ? params.delay : 0; // in miliseconds
        let tint = typeof params.tint !== 'undefined' ? params.tint : null;
        let ignorepause = typeof params.ignorepause !== 'undefined' ? params.ignorepause : false;
        return fox.spawn('particle',x,y,parent,{picname,tint,delay,ska,growska,growdiv,growdelay,shrinkdiv,shrinkdelay,facedir,xs,ys,xgrav,ygrav,xsdiv,ysdiv,ro,alphadiv,alphadelay,xmin,xmax,ymin,ymax,lifespan,ignorepause});
    },

    // particle burst (explode)
    // NOTE: particles tint can be multiple colors (use array)
    // example: fox.particleburst('fxcircle3', 0, 0, g.topcontainer, {total:20,delay:100,tint:0xFFCC00,startscale:0.1,scalerange:0.3,startspeed:5,speedrange:10})
    //         fox.particleburst('fxline1', 0, 0, g.topcontainer, {total:20,facedir:true,startscale:0.5,scalerange:0.5,startspeed:10,speedrange:10})
    particleburst: function(picname,x,y,parent,params) {
        let ignorepause = typeof params.ignorepause !== 'undefined' ? params.ignorepause : false;
        if (typeof params.delay !== 'undefined') {
            // if there is a delay requested, set delayaction
            fox.delayaction(params.delay,()=> {
                params.delay = undefined;
                fox.particleburst(picname,x,y,parent,params) });
            return;
        }
        let total = typeof params.total !== 'undefined' ? params.total : 40;
        let startspeed = typeof params.startspeed !== 'undefined' ? params.startspeed : 10; // base speed
        let speedrange = typeof params.speedrange !== 'undefined' ? params.speedrange : 20; // speed range
        let startscale = typeof params.startscale !== 'undefined' ? params.startscale : 1;  // beginning base scale
        let scalerange = typeof params.scalerange !== 'undefined' ? params.scalerange : 0; // beginning scale range
        let growska = typeof params.growska !== 'undefined' ? params.growska : 1; // grow target scale
        let growdiv = typeof params.growdiv !== 'undefined' ? params.growdiv : 8; // grow particle
        let growdelay = typeof params.growdelay !== 'undefined' ? params.growdelay : 0; // delay before growing
        let shrinkdiv = typeof params.shrinkdiv !== 'undefined' ? params.shrinkdiv : 1; // shrink div
        let shrinkdelay = typeof params.shrinkdelay !== 'undefined' ? params.shrinkdelay : 0; // delay before shrinking
        let speeddiv = typeof params.speeddiv !== 'undefined' ? params.speeddiv : 0.8;
        let speeddivrange = typeof params.speeddivrange !== 'undefined' ? params.speeddivrange : 0.1;
        let randomangle = typeof params.randomangle !== 'undefined' ? params.randomangle : true;
        let facedir = typeof params.facedir !== 'undefined' ? params.facedir : true;
        let emitrange = typeof params.emitrange !== 'undefined' ? params.emitrange : 0; // starting range circle
        let alphadiv = typeof params.alphadiv !== 'undefined' ? params.alphadiv : 0.9; // multiplier to reduce alpha
        let alphadelay = typeof params.alphadelay !== 'undefined' ? params.alphadelay : 10; // delay before alpha start fading
        let tintcolors = typeof params.tint !== 'undefined' ? params.tint : null; // tint can be just one OR multiple colors (use array)
        let duration = typeof params.duration !== 'undefined' ? params.duration : 0; // in miliseconds
        let delayperparticle = duration > 0 ? Math.round(duration/total) : 0;
        let ro = 360/total;
        let burst = [];
        for (let i = 0; i < total; i++) {
            let prm = {};
            let ang = randomangle ? (ro*i)-(0.5*ro)+(0.01*fox.random(ro*100)) : ro*i;
            let angrad = fox.rad(ang);
            let pcos = Math.cos(angrad);
            let psin = Math.sin(angrad);
            let speed = startspeed+0.1*fox.random(10*speedrange);
            prm.xs = pcos*speed;
            prm.ys = psin*speed;
            prm.xsdiv = prm.ysdiv = speeddiv+(0.001*fox.random(speeddivrange*1000));
            prm.facedir = facedir;
            prm.alphadiv = alphadiv;
            prm.alphadelay = alphadelay;
            prm.delay = delayperparticle*i;
            prm.tint = Array.isArray(tintcolors) ? tintcolors[i%tintcolors.length] : tintcolors;
            prm.ska = startscale+0.01*fox.random(scalerange*100);
            prm.shrinkdiv = shrinkdiv;
            prm.shrinkdelay = shrinkdelay;
            prm.growska = growska;
            prm.growdiv = growdiv;
            prm.growdelay = growdelay;
            prm.ignorepause = ignorepause;
            let p = fox.particle(picname,x-(emitrange/2)+fox.random(emitrange),y-(emitrange/2)+fox.random(emitrange),parent,prm);
            burst.push(p);
        }
        return burst;
    },

    // process pics from a base64 atlas and put all the textures in g.foxpic
    base64atlas2foxpic: function(atlas) {
        let sprite = PIXI.Sprite.from(atlas.meta.image);
        let spritesheet = new PIXI.Spritesheet(sprite.texture.baseTexture, atlas, 2*parseFloat(atlas.meta.scale));
        spritesheet.parse(()=>{});
        // add images to g.foxpic
        for (let key in spritesheet.textures) {
            if (spritesheet.textures.hasOwnProperty(key)) {
                g.foxpic[key] = spritesheet.textures[key];
            }
        }
    },

    formatdate: function(ms) {
        let result = "";
        let d = new Date(ms);
        result += d.getFullYear()+"/"+(d.getMonth()+1)+"/"+d.getDate() +
            " "+ d.getHours()+":"+d.getMinutes()
            // +":"+d.getSeconds()+" "+d.getMilliseconds();
        return result;
    },

    // format time into string (00:00:00)
    formattime: function(seconds) {
        return [
            parseInt(seconds / 60 / 60), // hour
            parseInt(seconds / 60 % 60), // minute
            parseInt(seconds % 60) // seconds
        ]
            .join(":")
            .replace(/\b(\d)\b/g, "0$1")
    },

    // shake container
    shake: function(mc, duration = 800, xrange = 10, yrange = 0) {
        return fox.spawn('shakecontainer',0,0,g.scene,{mc,xrange,yrange,duration});
    },

    // tint flash
    // usage: fox.tintflash(mc,0xff0000,800,0xffcc00); endtint is the final tint at the end
    tintflash: function(mc,duration = 800,clr = 0xff0000, endtint = 0xffffff) {
        return fox.spawn('tintflash',0,0,g.scene,{mc,clr,duration,endtint});
    },

    // make all children of a container draggable with mouse/keyboard
    // usage: click & drag with mouse OR click and then use arrow keys to move
    draggablechildren: function(container) {
        if (!g.localtesting) return;
        for (let i = 0; i < container.children.length; i++) {
            fox.draggable(container.children[i]);
        }
    },

    // make an object draggable (move with keyboard keys optional)
    // WARNING : if you also want to detect tapping on the object, you must
    //           use 'dragging_tap_callback' instead of 'pointertap'!!
    // usage: you can add callbacks to the object (if needed)  :
    //        - dragging_start_callback
    //        - dragging_end_callback
    //        - dragging_move_callback
    //        - dragging_tap_callback
    //        - dragging_key_down_callback (if using keyboard is TRUE)
    //        - dragging_key_up_callback (if using keyboard is TRUE)
    draggable: function(it, usekeyboard = false, lockhorizontal = false, lockvertical = false) {
        it.interactive = true;
        it.presstime = 0;
        it.lockhorizontal = lockhorizontal;
        it.lockvertical = lockvertical;
        it
            .on('pointerdown', (e)=> fox.draggingstart(it,e))
            .on('pointerup', (e)=> fox.draggingend(it,e))
            .on('pointerupoutside', (e)=> fox.draggingend(it,e))
            .on('pointermove', (e)=> fox.draggingmove(it,e))
        if (usekeyboard) {
            document.addEventListener('keydown', (key) => fox.draggableonkeydown(it, key));
            document.addEventListener('keyup', (key) => fox.draggableonkeyup(it, key));
        }
    },

    draggableonkeydown: function(it,key) {
        if (g.foxdraggableselection == it) {
            it.presstime++;
            let speed = 1;
            if (it.presstime > 25) speed = Math.min(20,Math.round((it.presstime-20)/3));
            if (key.keyCode === 38) it.y-=speed; // up
            if (key.keyCode === 40) it.y+=speed; // down
            if (key.keyCode === 37) it.x-=speed; // left
            if (key.keyCode === 39) it.x+=speed; // right
        }
    },

    draggableonkeyup: function(it,key) {
        if (g.foxdraggableselection == it) {
            it.presstime = 0;
            fox.trace(it.name + ' x:' + it.x + ' y:' + it.y);
        }
    },

    draggingstart: function(it,e) {
        it.event_data = e.data;
        it.event_dragging = true;
        it.event_dragging_starttime = Date.now();
        it.event_dragging_oldx = it.x;
        it.event_dragging_oldy = it.y;
        it.event_dragging_offsetx = it.event_data.getLocalPosition(it.parent).x-it.x;
        it.event_dragging_offsety = it.event_data.getLocalPosition(it.parent).y-it.y;
        g.foxdraggableselection = it;
        // dragging start callback
        if (it.dragging_start_callback) it.dragging_start_callback();
    },

    draggingend: function(it,e) {
        it.event_data = null;
        it.event_dragging = false;
        let tapping = false;
        let pressduration = Date.now()-it.event_dragging_starttime;
        if (pressduration < 200) {
            let dx = it.x-it.event_dragging_oldx;
            let dy = it.y-it.event_dragging_oldy;
            let dist = dx*dx+dy*dy;
            if (dist < 100) tapping = true
        }
        if (tapping) {
            // tap callback
            if (it.dragging_tap_callback) it.dragging_tap_callback();
        } else {
            // dragging end callback
            if (it.dragging_end_callback) it.dragging_end_callback();
        }
        g.foxdraggableselection = null;
    },

    draggingmove: function(it,e) {
        if (it.event_dragging) {
            let newPosition = it.event_data.getLocalPosition(it.parent);
            if (!it.lockhorizontal) it.x = Math.round(newPosition.x-it.event_dragging_offsetx);
            if (!it.lockvertical) it.y = Math.round(newPosition.y-it.event_dragging_offsety);
            // dragging move callback
            if (it.dragging_move_callback) it.dragging_move_callback();
        }
    },

    // set frame rate for movieclip or foxanimation
    setframerate: function(it,fps) {
        let tipe = 0;
        try { if (it.a.constructor.name === 'AnimatedSprite') tipe = 1; } catch (e) {}
        try { if (it.a.animState.constructor.name === 'AnimationState') tipe = 2; } catch (e) {}
        try { if (it.constructor.name === 'foxanimation') tipe = 3; } catch (e) {}
        if (tipe === 1) it.a.animationSpeed = fps / 60; // normal Animated Sprite
        if (tipe === 2) it.a.animState.animationSpeed = fps / 60;
        if (tipe === 3) it.fps = fps;
        return tipe;
    },

    // return number sign positive/negative/zero (-1,0,1)
    // NOTE: string "0" will return as 1 [ fox.sign("0") -> 1 ]
    sign: function (x) {
        return x ? x < 0 ? -1 : 1 : 0;
    },

    // make color gradient (returns array of colors)
    // example:
    //     fox.colorgradient(.3,.3,.3,0,2,4); // -> this will create basic rainbow gradient
    //
    //     .. and below is how to make color cycle that repeats every 6 steps:
    //     center = 128;
    //     width = 127;
    //     steps = 6;
    //     frequency = 2*Math.PI/steps;
    //     fox.colorgradient(frequency,frequency,frequency,0,2,4,center,width,50);
    colorgradient: function (frequency1, frequency2, frequency3, phase1, phase2, phase3, center, width, len) {
        frequency1 = typeof frequency1 !== 'undefined' ? frequency1 : 0.3;
        frequency2 = typeof frequency2 !== 'undefined' ? frequency2 : 0.3;
        frequency3 = typeof frequency3 !== 'undefined' ? frequency3 : 0.3;
        phase1 = typeof phase1 !== 'undefined' ? phase1 : 0;
        phase2 = typeof phase2 !== 'undefined' ? phase2 : 2;
        phase3 = typeof phase3 !== 'undefined' ? phase3 : 4;
        center = typeof center !== 'undefined' ? center : 128;
        width = typeof width !== 'undefined' ? width : 127;
        len = typeof len !== 'undefined' ? len : 50;
        let colors = [];
        for (let i = 0; i < len; ++i) {
            let red = Math.sin(frequency1*i + phase1) * width + center;
            let grn = Math.sin(frequency2*i + phase2) * width + center;
            let blu = Math.sin(frequency3*i + phase3) * width + center;
            let arr = [red/255,grn/255,blu/255]; // must div 255 because PIXI rgb2hex uses 0..1 values
            colors.push(PIXI.utils.rgb2hex(arr));
        }
        return colors;
    },

    // shrink object and kill it
    // usage: fox.remove(button,700,100);
    remove: function(it, duration = 150, delay = 0, killchildren = true) {
        let tw = fox.tweenscale(it,it.scale,{x:0.001,y:0.001},duration,delay,g.easing.outQuad());
        tw.once('end',()=> it.kill(0,killchildren));
        return tw;
    },

    // activate an object by adding it to g.activeitems array
    // all items in this array will have their loop function updated every frame
    activate: function(it) {
        if (!it.loopempty && !g.activeitems.includes(it)) g.activeitems.push(it);
        // activate children too
        for (let i = 0; i < it.children.length; i++) fox.activate(it.children[i]);
    },

    // update all
    updateall: function() {
        // update foxmovieclip loops
        for (let i = 0; i < g.activeitems.length; i++) {
            if (g.activeitems[i].loopenabled && g.activeitems[i].visible) g.activeitems[i].loop();
        }
        // update delayed actions
        for (let key in g.delayactions) {
            if (g.delayactions.hasOwnProperty(key)) {
                let it = g.delayactions[key];
                if (it.delay > 0 ? Date.now()-it.starttime >= it.delay : g.gameframenow-it.starttime >= -it.delay) {
                    it.callback();
                    delete g.delayactions[key];
                }
            }
        }
        // update repeat actions
        for (let key in g.repeatactions) {
            if (g.repeatactions.hasOwnProperty(key)) {
                let it = g.repeatactions[key];
                if (it.delay > 0 ? Date.now()-it.starttime >= it.delay : g.gameframenow-it.starttime >= -it.delay) {
                    it.starttime = it.delay > 0 ? Date.now() : g.gameframenow;
                    it.callback();
                    if (it.count > 0) {
                        it.count--;
                        if (it.count === 0) delete g.repeatactions[key];
                    }
                }
            }
        }
    },

    // update ignore-pause items
    updateignorepauseitems: function() {
        // update foxmovieclip loops that 'ignore-pause'
        for (let i = 0; i < g.activeitems.length; i++) {
            if (g.activeitems[i].ignorepause && g.activeitems[i].loopenabled && g.activeitems[i].visible) {
                // run loop function in 'ignore-pause' item and its children
                fox.runloopwithchildren(g.activeitems[i]);
            }
        }
        // update delayed actions that 'ignore-pause'
        for (let key in g.delayactions) {
            if (g.delayactions.hasOwnProperty(key)) {
                let it = g.delayactions[key];
                if (it.ignorepause) {
                    if (it.delay > 0 ? Date.now() - it.starttime >= it.delay : g.gameframenow - it.starttime >= -it.delay) {
                        it.callback();
                        delete g.delayactions[key];
                    }
                }
            }
        }
        // update repeat actions that 'ignore-pause'
        for (let key in g.repeatactions) {
            if (g.repeatactions.hasOwnProperty(key)) {
                let it = g.repeatactions[key];
                if (it.ignorepause) {
                    if (it.delay > 0 ? Date.now() - it.starttime >= it.delay : g.gameframenow - it.starttime >= -it.delay) {
                        it.starttime = it.delay > 0 ? Date.now() : g.gameframenow;
                        it.callback();
                        if (it.count > 0) {
                            it.count--;
                            if (it.count === 0) delete g.repeatactions[key];
                        }
                    }
                }
            }
        }
    },

    // update loop in this mc, along with its children/grandchildren/..
    runloopwithchildren: function(mc) {
        if (mc.visible && mc.loopenabled) mc.loop();
        for (let i = 0; i < mc.children.length; i++) {
            fox.runloopwithchildren(mc.children[i]);
        }
    },

    // pause all tweens
    pausetweens: function() {
        for (let i = 0; i < PIXI.tweenManager.tweens.length; i++) {
            PIXI.tweenManager.tweens[i].stop();
        }
    },

    // pause all tweens
    resumetweens: function() {
        for (let i = 0; i < PIXI.tweenManager.tweens.length; i++) {
            PIXI.tweenManager.tweens[i].start();
        }
    },

    // bring to top
    bringtotop: function(it,secondtry = false) {
        // if parent is null, it's probably because of newly spawned mc
        // so we give it one more try on the next frame
        if (!it.parent) {
            if (!secondtry) fox.delayaction(-1,()=> { fox.bringtotop(it,true) })
        } else {
            // first, make sure parent sorting is enabled
            it.parent.sortableChildren = true;
            let zmax = 0;
            for (let i = 0; i < it.parent.children.length; i++) {
                zmax = Math.max(zmax, it.parent.children[i].zIndex)
            }
            it.zIndex = zmax + 1;
        }
    },

    // send to back
    sendtoback: function(it,secondtry = false) {
        // if parent is null, it's probably because of newly spawned mc
        // so we give it one more try on the next frame
        if (!it.parent) {
            if (!secondtry) fox.delayaction(-1,()=> { fox.sendtoback(it,true) })
        } else {
            // first, make sure parent sorting is enabled
            it.parent.sortableChildren = true;
            for (let i = 0; i < it.parent.children.length; i++) {
                it.parent.children[i].zIndex++;
            }
            it.zIndex = 0;
        }
    },

    // show FPS
    showFPS: function(parent, color = 0xCC0000) {
        if (g.showFPStext == null) {
            // create text
            let style = fox.textstyle('Arial',20,color);
            g.showFPStext = fox.attachtext('',10,10,parent,style,false);
            fox.repeataction(500,()=> {
                g.showFPStext.text = Math.round(PIXI.Ticker.shared.FPS);
            });
            style = null;
        }
        return null;
    },

    // text style
    // note: since PIXI.text 'align' property only works for multiline, we use anchor to set align left/right in fox.attachtext
    textstyle: function(font,size,color,strokethickness,strokecolor,shadowalpha,shadowangle,shadowblur,shadowcolor,shadowdistance) {
        strokethickness = typeof strokethickness !== 'undefined' ? strokethickness : 0;
        shadowalpha = typeof shadowalpha !== 'undefined' ? shadowalpha : 0;
        let style = {fontFamily:font,fontSize:size,fill:color,letterSpacing:0.1,padding:strokethickness};
        if (strokethickness != null && strokethickness > 0) {
            Object.assign(style,{strokeThickness:strokethickness,stroke:strokecolor});
        }
        if (shadowalpha > 0) {
            Object.assign(style,{dropShadow:true,dropShadowAlpha:shadowalpha,dropShadowAngle:shadowangle,dropShadowBlur:shadowblur,dropShadowColor:shadowcolor,dropShadowDistance:shadowdistance});
        }
        return style;
    },

    // generate a random point within a circle (uniformly). Based on https://stackoverflow.com/a/5838055/5224246
    getrandompointincircle: function(radius) {
        let t = 2 * Math.PI * Math.random();
        let r = Math.sqrt(Math.random());
        let x = r * Math.cos(t) * radius;
        let y = r * Math.sin(t) * radius;
        return {x,y}
    },

    // check if point is inside a rectangle
    pointinrectangle: function(px,py,x1,y1,x2,y2) {
        return (px >= x1) && (px <= x2) && (py >= y1) && (py <= y2)
    },

    // make container
    makecontainer: function(x = g.hscreenwid, y = g.hscreenhei, parent = g.scene, sortchildren = false, name) {
        let it = new PIXI.Container();
        it.x = x;
        it.y = y;
        if (typeof name !== 'undefined') it.name = name;
        it.sortableChildren = sortchildren;
        parent.addChild(it);
        return it;
    },

    // make particle container
    makeparticlecontainer: function(x = g.hscreenwid, y = g.hscreenhei, parent = g.scene, params, name) {
        let it = new PIXI.ParticleContainer(1500,params);
        it.x = x;
        it.y = y;
        if (typeof name !== 'undefined') it.name = name;
        parent.addChild(it);
        return it;
    },

    // move movieclip to another container while retaining it's world position and transform
    // NOTE: to ensure the function work properly, 'container' must be a PIXI.Container
    move2container: function(mc, container) {
        if (container.constructor.name !== 'Container') fox.alert('fox.move2container 2nd param is not a Container! Function may not work properly.');
        mc._recursivePostUpdateTransform();
        container._recursivePostUpdateTransform();
        let mat = mc.worldTransform.clone();
        mat.prepend(container.worldTransform);
        mc.transform.setFromMatrix(mat);
        container.addChild(mc);
        return null;
    },

    // get global position (works great! Lets you know mc's global pos when you put it inside a rotating/scaling container)
    // NOTE: for some reason, sometimes you don't need divide with g.userscale. So if result is wrong, try setting 'applyuserscale' to FALSE)
    globalpos: function(mc,applyuserscale = true) {
        let res = mc.getGlobalPosition();
        if (applyuserscale) {
            res.x /= g.userscale;
            res.y /= g.userscale;
        }
        return res;
    },

    // Set global position
    // This is a long winded way to set global position because PIXI doesn't have that function
    // Since it's hacky & expensive to calculate, use it sparingly
    setglobalpos: function(mc,x,y) {
        // first, we move the movieclip to stage container
        let container = mc.parent;
        fox.move2container(mc,g.app.stage);
        if (typeof x !== 'undefined') mc.x = x;
        if (typeof y !== 'undefined') mc.y = y;
        // then we bring it back to it's previous container
        fox.move2container(mc,container);
        return null;
    },

    // get global point from a local coordinates
    globalpointpos: function(x,y,parent) {
        let res = new PIXI.Point();
        if (parent) {
            parent.toGlobal({x,y},res);
        } else {
            res.x = x;
            res.y = y;
        }
        return res;
    },

    // check if a point is inside sprite (pixel perfect)
    // usage: fox.hittestpoint(enemy,bullet.x,bullet.y,bullet.parent);
    hittestpoint: function(mc,pointX,pointY,pointparent) {
        let point = fox.globalpointpos(pointX,pointY,pointparent);
        if (mc.isfoxpic) {
            return mc.a.containsPoint(point);
        } else {
            return mc.containsPoint(point);
        }
    },

    pooladd: function(it) {
        try {
            if (it.name.length > 0) {
                if (!g.foxpool.hasOwnProperty(it.name)) g.foxpool[it.name] = [];
                g.foxpool[it.name].push(it);
                it.inpool = true;
                it.spawned = false;
                it.parent.removeChild(it);
                fox.tweenremoveallfrom(it);
                return true;
            }
        } catch (e) {
            fox.alert('fox.pooladd ERROR!');
        }
        return false;
    },

    // round number to decimal limit (to avoid those floating 0.000000x)
    // usage: fox.roundto(1.023456, 2); -> round number to 2 digits decimal
    roundto: function(num, digits = 0) {
        num = Math.round(num+'e'+digits);
        return Number(num+'e-'+digits);
    },

    // format time (in seconds) into string ('00:00:00')
    time2string : function (seconds) {
        seconds = Math.floor(seconds);
        let hours = Math.floor(seconds / 3600);
        seconds -= hours*3600;
        let minutes = Math.floor(seconds / 60);
        seconds -= minutes*60;
        if (hours   < 10) {hours   = "0"+hours;}
        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        // return hours+':'+minutes+':'+seconds;
        return minutes+':'+seconds;
    },

    // get minimum property value from an array of objects
    min: function(arr, keystr) {
        let lowest = Number.POSITIVE_INFINITY;
        let highest = Number.NEGATIVE_INFINITY;
        let tmp;
        for (let i= arr.length-1; i>=0; i--) {
            tmp = arr[i][keystr];
            if (tmp < lowest) lowest = tmp;
            if (tmp > highest) highest = tmp;
        }
        return lowest;
    },

    // get maximum property value from an array of objects
    max: function(arr, keystr) {
        let highest = Number.NEGATIVE_INFINITY;
        let tmp;
        for (let i= arr.length-1; i>=0; i--) {
            tmp = arr[i][keystr];
            if (tmp > highest) highest = tmp;
        }
        return highest;
    },

    // create SAT polygon for this mc (based on SAT polygon data array g.SATpolygon)
    // usage: t.bunny.SATpoly = fox.createSATpolygon(g.SATpolygon['bunny']);
    createSATpolygon: function(points,center) {
        // polygon position is at the center (0,0) by default
        center = typeof center !== 'undefined' ? center : {x:0,y:0};
        let arr = [];
        for (let i = 0; i < points.length; i++) {
            arr.push(new SAT.Vector(points[i].x,points[i].y));
        }
        let res = new SAT.Polygon(new SAT.Vector(center.x,center.y), arr);
        res.ID = fox.uuid();
        return res;
    },

    // draw SATpolygon
    // How to use: put 'fox.drawSATpolygon(t.SATpoly,g.playercontainer)' inside the loop function of the movieclip
    // NOTE: alwaysredraw -> by default we only draw the polygon once at the start. After that, we just set position & rotation
    drawSATpolygon: function(SATpoly,parent,alwaysredraw = false) {
        let it;
        // check if polygon graphics already created before
        if (g.SATpolydrawings.hasOwnProperty(SATpoly.ID)) {
            // reuse the graphics
            it = g.SATpolydrawings[SATpoly.ID];
        } else {
            // create new graphics
            it = new PIXI.Graphics();
            parent.addChild(it);
            g.SATpolydrawings[SATpoly.ID] = it;
        }
        if ((it.width === 0 && it.height === 0) || alwaysredraw) {
            // draw the polygon
            it.clear();
            it.lineStyle(1,0xFF0000,1);
            for (let i = 1; i < SATpoly.points.length; i++) {
                let p1 = SATpoly.points[i];
                let p0 = SATpoly.points[i-1];
                it.moveTo(p1.x,p1.y);
                it.lineTo(p0.x,p0.y);
            }
            it.moveTo(SATpoly.points[0].x,SATpoly.points[0].y);
            it.lineTo(SATpoly.points[SATpoly.points.length-1].x,SATpoly.points[SATpoly.points.length-1].y);
        }
        // set position and rotation
        it.x = SATpoly.pos.x;
        it.y = SATpoly.pos.y;
        it.rotation = SATpoly.angle;
        return null;
    },

    // update SATposition to match object position
    updateSATposition: function(SATpoly,it) {
        SATpoly.pos.x = it.x;
        SATpoly.pos.y = it.y;
        return null;
    },

    // update SATrotation to match object rotation
    updateSATrotation: function(SATpoly,it) {
        SATpoly.setAngle(it.rotation);
        return null;
    },

    // get center of points array
    getcenter: function(points){
        // Find min max to get center
        // Sort from top to bottom
        points.sort((a,b)=>a.y - b.y);
        // Get center y
        const cy = (points[0].y + points[points.length -1].y) / 2;
        // Sort from right to left
        points.sort((a,b)=>b.x - a.x);
        // Get center x
        const cx = (points[0].x + points[points.length -1].x) / 2;
        // Center point
        return {x:cx,y:cy};
    },

    // Sort points array counterclockwise
    sortcounterclockwise: function(arr,center) {
        arr.sort(function(a,b)  {
            let aTanA = Math.atan2((a.y - center.y),(a.x - center.x));
            let aTanB = Math.atan2((b.y - center.y),(b.x - center.x));
            if (aTanA < aTanB) return 1;
            else if (aTanB < aTanA) return -1;
            return 0;
        });
    },

    // reflect point on a line
    reflect : function(point, line_p0, line_p1) {
        let dx, dy, a, b, x, y;
        dx = line_p1.x - line_p0.x;
        dy = line_p1.y - line_p0.y;
        a = (dx * dx - dy * dy) / (dx * dx + dy * dy);
        b = 2 * dx * dy / (dx * dx + dy * dy);
        x = Math.round(a * (point.x - line_p0.x) + b * (point.y - line_p0.y) + line_p0.x);
        y = Math.round(b * (point.x - line_p0.x) - a * (point.y - line_p0.y) + line_p0.y);
        return { x:x, y:y };
    },

    // returns true if browser is Internet Explorer
    usingIE : function() {
        return (navigator.userAgent.indexOf('MSIE')!==-1 || navigator.appVersion.indexOf('Trident/') > 0);
    },

    // tint (normal PIXI tint, affect children)
    // usage: fox.tint(it,0x66FF00);
    tint : function(it,clr) {
        if (typeof it.tint === 'number') it.tint = clr;
        for (let i = 0; i < it.children.length; i++) {
            let foo = it.children[i];
            fox.tint(foo,clr);
        }
        return null;
    },

    // gradient tint
    gradienttint : function(it, duration = 500, colorarray = g.gradienttintcolors) {
        it.gradientindex = 0;
        it.gradientcolors = colorarray;
        it.visible = true;
        fox.tint(it,0xFFFFFF);
        fox.tweenremoveallfrom(it);
        it.gradienttintfinishtime = Date.now()+duration;
        it.tw = fox.tween(it,{value:0},{value:100},500,0,g.easing.linear(),-1,true);
        it.tw.on('update', ()=> {
            fox.tint(it, it.gradientcolors[it.gradientindex]);
            it.gradientindex++;
            if (it.gradientindex >= it.gradientcolors.length) it.gradientindex = 0;
            if (Date.now() > it.gradienttintfinishtime) {
                it.visible = false;
                it.tw.stop();
            }
        });
    },

    // check for local storage accessibility (for Safari)
    ceklocalstorage : function() {
        if (typeof localStorage === 'object') {
            try {
                localStorage.setItem('localStorage', 'test');
                localStorage.removeItem('localStorage');
            } catch (e) {
                fox.alert('Browser in private mode, cannot save data');
            }
        }
    },

    // deep clone an object (note: as long as the object does not use function in it)
    clone: function (obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // report total count of spawned object(s) in foxpool
    // usage: name is optional. if name is not specified, everything in the pool is reported
    poolreport: function(name) {
        fox.trace('foxpool report : start ----------------------');
        let all = {};
        for (let i = 0; i < g.foxpool.length; i++) {
            let it = g.foxpool[i];
            if (name === undefined || name === it.name) {
                if (all[it.name] === undefined) {
                    all[it.name] = 1;
                } else {
                    all[it.name]++;
                }
            }
        }
        for (let key in all) {
            fox.trace(key+' = '+all[key]);
        }
        fox.trace('foxpool report : end ==========================');
    },

    // spawn (for any objects)
    // usage: fox.spawn('pic1',0,0,t,{center:false,framerate:30,looping:2,oncompletekill:true,ignorepause:true})
    // optional parameters: center (default true), framerate, looping (0=no,1=yes,2=yoyo), oncompletekill (default false)
    // NOTE: use kill() to remove spawned objects. They will be automatically put back into g.foxpool when killed
    spawn: function (name, x, y, parent, params) {
        let center = true;
        let heaven = false;
        let framerate = undefined;
        let looping = undefined;
        let ignorepause = false;
        let oncompletekill = false;
        if (params) {
            if (params.hasOwnProperty('center')) center = params['center'];
            if (params.hasOwnProperty('heaven')) heaven = params['heaven'];
            if (params.hasOwnProperty('framerate')) framerate = params['framerate'];
            if (params.hasOwnProperty('ignorepause')) ignorepause = params['ignorepause'];
            if (params.hasOwnProperty('looping')) looping = params['looping'];
            if (params.hasOwnProperty('oncompletekill')) {
                oncompletekill = params['oncompletekill'];
                if (oncompletekill) looping = 0;
            }
        }
        let it = null;
        // first try to find in pool
        if (g.foxpool.hasOwnProperty(name) && g.foxpool[name].length > 0) it = g.foxpool[name].pop();
        // not in pool? create brand new
        if (it == null) {
            // fox.trace('fox.spawn creating new '+name);
            if (name in g.foxclip) {
                it = fox.attachmovie(name, x, y, parent, params);
                // fox.trace('fox.spawn '+name+' is a clip');
            } else if (name in g.foxani) {
                it = fox.attachani(name, x, y, parent, {looping:1, heaven, oncompletekill});
                // fox.trace('fox.spawn '+name+' is a foxani');
            } else if (name in g.foxpic) {
                it = fox.attachpic(name, x, y, parent, {center,heaven});
                // fox.trace('fox.spawn '+name+' is a pic');
            } else if (typeof window[name] === 'function') {
                it = fox.make(name, x, y, parent, params);
                // fox.trace('fox.spawn '+name+' is a class');
            } else {
                // not found
                fox.alert('fox.spawn failed - '+name+' not found!');
                return null;
            }
            // count all newly created
            if (!g.madenew[name]) g.madenew[name] = {total:0,limit:50};
            g.madenew[name].total++;
            if (g.madenew[name].total >= g.madenew[name].limit) {
                if (g.madenew[name].total <= 100) fox.warn('fox.spawn has created '+g.madenew[name].total+' '+name);
                if (g.madenew[name].total >= 200) fox.alert('WARNING! fox.spawn has created '+g.madenew[name].total+' '+name+'!');
                g.madenew[name].limit += 50;
            }
        } else {
            // spawned from pool
            it.filters = null;
            it.x = x;
            it.y = y;
            it.flipX = it.flipY = it.alpha = 1;
            it.scale.set(1,1);
            it.visible = true;
            it.interactive = false;
            it.removeAllListeners();
            it.rotation = 0;
            if (it.heaven) fox.clearcolor(it);
            parent.addChild(it);
            for (let key in params) if (params.hasOwnProperty(key)) it[key] = params[key];
            fox.activate(it);
            it.spawn();
            // activate all acts too
            for (let key in it.actdict) {
                if (it.actdict.hasOwnProperty(key)) fox.activate(it.actdict[key]);
            }
            if (it.isfoxclip) {
                // init the clip based on the new parameters
                framerate = framerate || g.defaultframerate;
                fox.initclip(it,framerate,looping,oncompletekill);
            }
            if (it.isfoxpic) it.a.anchor.set(center ? 0.5 : 0);
        }
        if (it) {
            it.inpool = false;
            it.visible = it.spawned = true;
            it.ignorepause = ignorepause;
            g.allspawned.push(it);
            // enable loop
            if (!it.loopenabled && !it.loopempty) it.loopenabled = true;
        } else {
            fox.alert('fox.spawn failed - '+name+' not found!');
        }
        return it;
    },

    // spawn particle
    // usage: fox.spawnparticle('fxsmoke',0,0,t,{heaven:true})
    spawnparticle: function (name, x, y, parent, params) {
        let heaven = false;
        let center = true;
        if (params) {
            if (params.hasOwnProperty('center')) center = params['center'];
            if (params.hasOwnProperty('heaven')) heaven = params['heaven'];
        }
        let it = null;
        // first try to find in pool
        if (g.foxpool.hasOwnProperty(name) && g.foxpool[name].length > 0) it = g.foxpool[name].pop();
        // not in pool? create brand new
        if (it == null) {
            // fox.trace('fox.spawnparticle creating new '+name);
            it = fox.attachsprite(name,x,y,parent,params);
            // add kill function
            it.kill = function () {
                it.removeAllListeners();
                fox.pooladd(it);
                it.alpha = 0;
            };
            // count all newly created
            if (!g.madenew[name]) g.madenew[name] = {total:0,limit:300};
            g.madenew[name].total++;
            if (g.madenew[name].total >= g.madenew[name].limit) {
                if (g.madenew[name].total <= 100) fox.warn('fox.spawn has created '+g.madenew[name].total+' '+name);
                if (g.madenew[name].total >= 200) fox.alert('WARNING! fox.spawn has created '+g.madenew[name].total+' '+name+'!');
                g.madenew[name].limit += 100;
            }
        } else {
            // fox.trace('spawning '+name);
            // spawned from pool
            it.x = x;
            it.y = y;
            it.scale.set(1,1);
            it.alpha = 1;
            it.interactive = false;
            it.removeAllListeners();
            it.rotation = 0;
            if (it.heaven) fox.clearcolor(it);
            parent.addChild(it);
            it.anchor.set(center ? 0.5 : 0);
        }
        it.inpool = false;
        it.spawned = true;
        g.allspawned.push(it);
        return it;
    },

    // disable all input
    // if only for some time, set the 'duration' value. Otherwise this will disable input permanently
    disableinput: function (duration = 0) {
        g.inputenabled = false;
        if (duration > 0) fox.delayaction(duration, ()=> { g.inputenabled = true; }, true)
        return null;
    },

    // enable all input
    enableinput: function() {
        g.inputenabled = true;
        return null;
    },

    // disable button created with fox.attachbutton. This uses an 'enabled' flag that was set during fox.attachbutton.
    // if only for some time, set the 'duration' value. Otherwise this will disable the button permanently
    disablebutton: function (button, duration = 0) {
        button.enabled = false;
        if (duration > 0) fox.delayaction(duration, ()=> { button.enabled = true; }, true)
        return null;
    },

    // enable button
    enablebutton: function(button) {
        button.enabled = true;
    },

    // set anchor to center
    setanchor: function (it,x,y) {
        y = typeof y !== 'undefined' ? y : x;
        try {
            if (it.isfoxpic) {
                // for foxpic
                it.a.anchor.set(x,y);
            } else if (it.isfoxani) {
                // do nothing if this is foxani
            } else {
                it.anchor.set(x,y);
            }
        } catch (e) {
            fox.alert('fox.setanchor error!');
        }
        return null;
    },

    // set anchor to center
    centeranchor: function (it) {
        it.anchor.set(0.5);
    },

    // say VO
    say: function (VO,forced = false) {
        /*
        if (g.talking && forced) {
            g.talking.stop();
            g.talking = null;
        }
        if (g.talking !== null || g.mutesfx) return;
        let instance = g.sfx[VO].play();
        fox.audioplaybugfix();
        g.talking = g.sfx[VO];
        instance.on('end', ()=> { g.talking = null });
         */
    },

    // create a layer to block buttons below
    // note: to tint black, use 0x000001 instead of 0x000000
    makelayer: function(parent = g.scene, alpha = 0, tint = undefined, callback = undefined) {
        // create a huge button layer to block other buttons below
        let layer = fox.makecontainer(0,0,parent);
        layer.a = new PIXI.Sprite(PIXI.Texture.WHITE);
        if (tint) layer.a.tint = tint;
        layer.a.width = g.screenwid*2;
        layer.a.height = g.screenhei*2;
        fox.setanchor(layer.a,0.5,0.5);
        layer.a.alpha = alpha;
        layer.interactive = true;
        layer.addChild(layer.a);
        if (callback) layer.on('pointertap', callback);
        return layer;
    },

    // init floating [ note: 'fstart' usually current x or y.]
    initfloating: function(it,fstart,frange,fspeed) {
        if (it === undefined) return;
        g.foxfloating['floating'+it.uniqueID] = {'start':fstart,'range':frange,'speed':fspeed,'fs':frange};
    },

    // example : t.y = fox.floating(id, t.y);
    floating: function(it,value) {
        if (it === undefined) return 0;
        let id = 'floating'+it.uniqueID;
        let fstart = g.foxfloating[id]['start'];
        let frange = g.foxfloating[id]['range'];
        let fspeed = g.foxfloating[id]['speed'];
        let fs = g.foxfloating[id]['fs'];
        // update value
        let num = value;
        num += fs;
        fs = num > fstart ? Math.max(fs - fspeed, -frange) : Math.min(fs + fspeed, frange);
        // update floating vars
        g.foxfloating[id]['fs'] = fs;
        return num;
    },

    // reset floating vars
    resetfloating: function() {
        g.foxfloating = {};
    },

    // set scale
    setscale: function(it,x,y) {
        x = typeof x !== 'undefined' ? x : 1;
        y = typeof y !== 'undefined' ? y : x;
        try {
            it.scale.set(x, y);
        } catch (e) {
            fox.alert('fox.setscale error!');
        }
    },

    // fadescreen
    fadescreen: function(fadeout = true, color = 0x000000, duration = 1000, delay = 0) {
        if (g.ratio < 2) return; // skip fadescreen for low ratio
        fox.spawn('fadescreen',0,0,g.fadecontainer,{fadeout,color,duration,delay});
        return null;
    },

    // convert base64 image string to g.foxpic texture
    // Usage: fox.base64tofoxpic('snapshot',b64str);
    base64tofoxpic: function (name,base64string) {
        if (!g.foxpic.hasOwnProperty(name)) {
            let base = new PIXI.BaseTexture(base64string);
            g.foxpic[name] = new PIXI.Texture(base);
        } else {
            fox.alert('fox.base64tofoxpic failed! g.foxpic already has '+name+'!');
        }
    },

    // shake screen
    shakescreen: function(xrange = 10, yrange = 10, duration = 60) {
        fox.spawn('shakecontainer',0,0,null,{container:g.all,xrange,yrange,duration});
        return null;
    },

    // delay a function (will also pause when game is paused)
    // usage: fox.delayaction(500,function(){ t.close() });
    // NOTE: to use frames instead of miliseconds, use negative values (i.e. fox.delayaction(-100, callback))
    delayaction: function(delay, callback, ignorepause = false) {
        let ID = g.delayactionID;
        g.delayactions[ID] = { delay, callback, ignorepause, starttime:delay > 0 ? Date.now() : g.gameframenow};
        g.delayactionID++;
        return ID;
    },

    // repeat a function (will also pause when game is paused)
    // NOTE: ignore 'count' variable if you want to repeat forever
    // usage: fox.repeataction(500, ()=>{t.beep()}, 10); --> run beep function 10 times
    repeataction: function(delay, callback, count = -1, ignorepause = false) {
        let ID = g.repeatactionID;
        g.repeatactions[ID] = { delay, callback, count, ignorepause, starttime:delay > 0 ? Date.now() : g.gameframenow };
        g.repeatactionID++;
        return ID;
    },

    // remove a delayed action
    removedelayaction: function(ID) {
        if (g.delayactions.hasOwnProperty(ID)) delete g.delayactions[ID];
    },

    // remove a repeating action
    removerepeataction: function(ID) {
        if (g.repeatactions.hasOwnProperty(ID)) delete g.repeatactions[ID];
    },

    // pop message
    popmessage: function (message, x, y, duration, delay, blockbuttons, sfx) {
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        duration = typeof duration !== 'undefined' ? duration : 2000;
        delay = typeof delay !== 'undefined' ? delay : 10;
        blockbuttons = typeof blockbuttons !== 'undefined' ? blockbuttons : false;
        sfx = typeof sfx !== 'undefined' ? sfx : null;
        return fox.spawn('popmessage',x,y,g.overcontainer,{message, duration, delay, blockbuttons, sfx});
    },

    // pop confirmation
    popconfirmation: function (message, x, y, callback, bgalpha = 0.4) {
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        return fox.spawn('popconfirm',x,y,g.overcontainer,{message,callback,bgalpha});
    },

    // Converts base64 to ArrayBuffer
    base64toBuffer: function (base64string) {
        let binary_string = window.atob(base64string);
        let bytes = new Uint8Array(binary_string.length);
        for (let i = 0; i < binary_string.length; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    },

    // Converts an ArrayBuffer to base64, by converting to string and then using window.btoa' to base64.
    buffertoBase64: function (buffer) {
        let bytes = new Uint8Array(buffer);
        let len = buffer.byteLength;
        let binary = "";
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    // cek 2 lines intersect
    // returns true iff the line from (a,b)->(c,d) intersects with (p,q)->(r,s)
    line2line: function (a,b,c,d,p,q,r,s) {
        let det, gamma, lambda;
        det = (c - a) * (s - q) - (r - p) * (d - b);
        if (det === 0) {
            return false;
        } else {
            lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
            gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
            return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
        }
    },

    // distance from point to line
    point2line: function (x, y, x1, y1, x2, y2) {
        let A = x - x1;
        let B = y - y1;
        let C = x2 - x1;
        let D = y2 - y1;
        let dot = A * C + B * D;
        let len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq; //in case of 0 length line
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        let dx = x - xx;
        let dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // tween value
    // NOTE: if you don't want the tween to start immediately, set delay value -1
    // Usage: t.tw = fox.tween(t,{foo:0},{foo:1000},1000,0,g.easing.linear(),-1,true);
    tween: function(it,from,to,duration,delay,easing,repeat,yoyo) {
        easing = easing || g.easing.outCubic();
        duration = typeof duration !== 'undefined' ? duration : 700;
        delay = typeof delay !== 'undefined' ? delay : 0;
        repeat = typeof repeat !== 'undefined' ? repeat : 0;
        yoyo = typeof yoyo !== 'undefined' ? yoyo : false;
        let tween = PIXI.tweenManager.createTween(it);
        tween.from(from).to(to);
        tween.time = duration;
        tween.delay = delay > 0 ? delay : 0;
        tween.easing = easing;
        tween.repeat = repeat;
        tween.pingPong = yoyo;
        tween.expire = true;
        if (delay >= 0) tween.start(); // delay value -1 means don't start the tween
        return tween;
    },

    // remove all tween from target (including its listeners)
    tweenremoveallfrom: function(target) {
        let arr = PIXI.tweenManager.getTweensForTarget(target);
        for (let i = arr.length-1; i >= 0; i--) {
            let tween = arr[i];
            // remove all listeners for this tween
            tween.removeAllListeners();
            tween.stop();
            tween.remove();
        }
    },

    // remove tween
    tweenremove: function(tween) {
        if (tween) {
            tween.removeAllListeners();
            tween.stop();
            tween.remove();
        }
    },

    // remove all tweens
    tweenremoveall: function() {
        PIXI.tweenManager.removeAllTweens();
    },

    // tween move
    // usage: fox.tweenmove(pic,{x:100,y:100},{x:300,y:300},1000)
    tweenmove: function(it,from,to,duration,delay,easing,repeat,yoyo) {
        let tw = null;
        if (typeof from === 'object' && typeof to === 'object') {
            let twx = fox.tweenX(it,from.x,to.x,duration,delay,easing,repeat,yoyo);
            let twy = fox.tweenY(it,from.y,to.y,duration,delay,easing,repeat,yoyo);
            tw = {tweenX:twx, tweenY:twy}; // return both tweens
        } else {
            fox.alert('fox.tweenmove uses object {x,y} for from & to variables!');
        }
        return tw;
    },

    // tween x
    // usage: fox.tweenX(pic,100,200,1000)
    tweenX: function(it,from,to,duration,delay,easing,repeat,yoyo) {
        let tw = null;
        if (typeof from === 'number' && typeof to === 'number') {
            tw = fox.tween(it,{x:from},{x:to},duration,delay,easing,repeat,yoyo);
        } else {
            fox.alert('fox.tweenX uses numbers for from & to variables!');
        }
        return tw;
    },

    // tween y
    // usage: fox.tweenY(pic,100,200,1000)
    tweenY: function(it,from,to,duration,delay,easing,repeat,yoyo) {
        let tw = null;
        if (typeof from === 'number' && typeof to === 'number') {
            tw = fox.tween(it,{y:from},{y:to},duration,delay,easing,repeat,yoyo);
        } else {
            fox.alert('fox.tweenY uses numbers for from & to variables!');
        }
        return tw;
    },

    // tween scale (accepts numbers or object {x,y})
    // usage: fox.tweenscale(pic,1,2,160,0,g.easing.outQuad(),0,true)
    // usage: fox.tweenscale(pic,{x:1,y:1},{x:0.8,y:0.8},160,0,g.easing.outQuad(),0,true)
    tweenscale: function(it,from,to,duration,delay,easing,repeat,yoyo) {
        let tw = null;
        if (typeof from == 'object') {
            tw = fox.tween(it,{scale: from},{scale: to},duration,delay,easing,repeat,yoyo);
        } else if (typeof from == 'number') {
            tw = fox.tween(it,{scale: {x:from,y:from}},{scale: {x:to,y:to}},duration,delay,easing,repeat,yoyo);
        } else {
            fox.alert('fox.tweenscale uses numbers or object for from & to variables!');
        }
        return tw;
    },

    // tween alpha
    tweenalpha: function(it,from,to,duration,delay,easing,repeat,yoyo) {
        let tw = null;
        if (typeof from === 'number' && typeof to === 'number') {
            tw = fox.tween(it,{alpha:from},{alpha:to},duration,delay,easing,repeat,yoyo);
        } else {
            fox.alert('fox.tweenalpha uses numbers for from & to variables!');
        }
        return tw;
    },

    // tween rotation
    tweenrotation: function(it,from,to,duration,delay,easing,repeat,yoyo) {
        let tw = null;
        if (typeof from === 'number' && typeof to === 'number') {
            tw = fox.tween(it,{angle:from},{angle:to},duration,delay,easing,repeat,yoyo);
        } else {
            fox.alert('fox.tweenrotation uses numbers for from & to variables!');
        }
        return tw;
    },

    // tween sound volume
    // NOTE: for fading sound to 0 or 1, just use fox.fadesound because it has additional 'fade' flag you can use in your code
    tweenvolume: function(sfxname,from,to,duration,delay,easing) {
        easing = typeof easing !== 'undefined' ? easing : g.easing.linear();
        fox.tweenremoveallfrom(g.sfx[sfxname]);
        let tw = fox.tween(g.sfx[sfxname],{volume:from},{volume:to},duration,delay,easing);
        return tw;
    },

    // run scene
    runscene: function(scene, fade = false, duration = 500, color = 0x000000) {
        // no fade for slow devices
        if (g.ratio === 1) fade = false;
        // clear some global variables
        g.pausescr = null;
        g.transitioning = true;
        g.scenename = scene;
        if (fade) {
            fox.fadescreen(false,color,duration);
            fox.delayaction(duration, function () {
                g.transitioning = false;
                fox.runscene(scene);
            }, true);
        } else {
            g.transitioning = g.pressing = false;
            g.madenew = {};
            // remove all tweens
            fox.tweenremoveall();
            // remove all signal listeners
            g.signal.off();
            // put all spawned items into pool (basically killing everything)
            for (let i = g.allspawned.length-1; i >= 0; i--) {
                if (!g.allspawned[i].inpool) g.allspawned[i].kill();
            }
            // remove delayed actions
            for (let ID in g.delayactions) fox.removedelayaction(ID);
            // remove repeat actions
            for (let ID in g.repeatactions) fox.removerepeataction(ID);
            g.delayactions = {};
            g.repeatactions = {};
            g.activeitems = [];
            // clear fade container
            fox.killchildren(g.fadecontainer);
            g.fadecontainer.removeChildren();
            // launch new scene
            g.scene = fox.spawn(scene,0,0,g.scenecontainer);
        }
        return null;
    },

    // make
    // usage: fox.make('monster',0,0,t,{name:'strong',tipe:2,speed:4});
    make: function(name, x, y, parent, params) {
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        parent = parent || g.scene;
        let res = null;
        if (typeof window[name] !== 'function') {
            fox.alert('fox.make failed! >>> '+name);
        } else {
            // default parameters
            if (params === undefined) params = {};
            params['name'] = name;
            if (!params.hasOwnProperty('center')) params['center'] = 'true';
            let it = new window[name](x, y, params);
            it.isfunction = true;
            parent.addChild(it);
            res = it;
        }
        return res;
    },

    // play button sfx
    playbuttonsfx: function() {
        fox.playsound('zclick');
    },

    // mute all
    muteall: function(bool = true) {
        if (bool) PIXI.sound.muteAll();
        if (!bool) PIXI.sound.unmuteAll();
        g.mute = bool;
        return null;
    },

    // play sound
    playsound: function(name, volume = 1) {
        if (g.mutesfx) return;
        if (name in g.sfx) {
            g.sfx[name].volume = volume;
            g.sfx[name].play();
            fox.audioplaybugfix();
        } else {
            fox.alert('Sound '+name+' not found!');
        }
    },

    audioplaybugfix: function() {
        // FIX GUE for bug where game unpaused if you play sound during paused -------
        if (g.paused) g.ticker1.stop(); // if game is paused, make sure it keeps pausing after playing sound
        // ---------------------------------------------------------------------------
    },

    // play sound/music loop
    playloop: function(name, volume = 1) {
        g.sfx[name].play();
        fox.audioplaybugfix();
        g.sfx[name].loop = true;
        g.sfx[name].volume = volume;
        return null;
    },

    // stop sound/music loop
    stopsound: function(name) {
        g.sfx[name].stop();
        return null;
    },

    // play background music
    playbackgroundmusic: function(name, volume = 1, fadein = false, fadeoutpreviousmusic = true, stoppreviousmusicafterfadeout = true) {
        if (g.bgmusicname === name) return;
        if (g.bgmusicname != '') {
            if (fadeoutpreviousmusic) {
                // fade out previous music
                let oldmusic = g.sfx[g.bgmusicname];
                let tw = fox.tweenvolume(g.bgmusicname,oldmusic.volume,0,500,0,g.easing.linear());
                if (stoppreviousmusicafterfadeout) tw.on('end',()=> { oldmusic.stop() });
            } else {
                g.sfx[g.bgmusicname].stop();
            }
        }
        if (!g.sfx[name].isPlaying) g.sfx[name].play();
        fox.audioplaybugfix();
        g.sfx[name].loop = true;
        if (fadein) {
            // fade in music
            fox.tweenvolume(name,0,volume,500,0,g.easing.linear());
        } else {
            g.sfx[name].volume = volume;
        }
        g.sfx[name].muted = g.mutemusic;
        g.bgmusicname = name;
        return null;
    },

    // play music sting. This will mute background music for the sting's duration.
    // note: use 'delayoffset' to shorten background music fade-in delay (in miliseconds)
    playsting: function(name, delayoffset = 500, bgvolume = 0) {
        g.sfx[name].play();
        fox.audioplaybugfix();
        if (g.bgmusicname != '') {
            fox.tweenvolume(g.bgmusicname,g.sfx[g.bgmusicname].volume,bgvolume,100);
            fox.delayaction((g.sfx[name].duration-0.5)*1000-delayoffset,()=> { fox.fadesound(g.bgmusicname,1,500,0) })
        }
        return null;
    },

    // fade sound
    // usage: fox.fadesound('zloop',0) -> fade out
    //        fox.fadesound('zloop',1) -> fade in
    fadesound: function(name, to = 0, duration = 500, delay = 0, oncompletestop = false) {
        // make sure the sound is playing
        if (!g.sfx[name].isPlaying) return
        // tween volume
        let tw = fox.tweenvolume(name,g.sfx[name].volume,to,duration,delay);
        if (oncompletestop) tw.on('end',()=> { g.sfx[name].stop() });
        return tw;
    },

    // check if string starts with another string
    startswith: function (needle, haystack) {
        return haystack.lastIndexOf(needle, 0) === 0
    },

    // convert radians to degrees
    deg: function(value) {
        return value * (180/Math.PI);
    },

    // convert degrees to radians
    rad: function(value) {
        return value * (Math.PI/180);
    },

    // make box
    // usage: fox.makebox(0,0,g.screenwid,g.screenhei,null,0xff0000,0.5,true);
    makebox: function(x, y, wid, hei, parent = g.scene, color = 0xff0000, alpha = 1, outline = false, outlinesize = 2) {
        let it = new PIXI.Graphics();
        if (outline) {
            // draw just the outline of the box
            it.lineStyle({width: outlinesize, color, alpha, alignment: 0.5});
        } else {
            // draw solid box
            it.beginFill(color);
        }
        it.drawRect(x,y,wid,hei);
        it.alpha = alpha;
        parent.addChild(it);
        return it;
    },

    // make rounded rectangle
    // usage: fox.makeroundedbox(-wid/2,-hei/2,wid,hei,radius,0xffffff,1,10,0xFD7859,1,t,true);
    makeroundedbox: function(x,y,wid,hei,radius,fillcolor,fillalpha,linewidth,linecolor,linealpha,parent) {
        parent = parent || g.scene;
        radius = typeof radius !== 'undefined' ? radius : 20;
        fillcolor = typeof fillcolor !== 'undefined' ? fillcolor : 0xffffff;
        fillalpha = typeof fillalpha !== 'undefined' ? fillalpha : 1;
        linecolor = typeof linecolor !== 'undefined' ? linecolor : 0xffffff;
        linewidth = typeof linewidth !== 'undefined' ? linewidth : 0;
        let graphics = new PIXI.Graphics();
        if (linewidth > 0) graphics.lineStyle(linewidth,linecolor,linealpha);
        graphics.beginFill(fillcolor,fillalpha);
        graphics.drawRoundedRect(x, y, wid, hei, radius);
        graphics.endFill();
        parent.addChild(graphics);
        return graphics;
    },

    // make 9 slice box
    // NOTE: rename pics by following the naming convention below. Then you can just use 1 picname variable (i.e. 'popbox')
    //       You can also override this naming by adding params (i.e. {pic_background:'mapbg'} will use 'mapbg' as background pic)
    // Usage: common.make9slicebox(240,120,t,'popbox',{pic_background:'mapbg'});
    make9slicebox: function (wid,hei,parent,picname = 'box',params) {
        params = typeof params !== 'undefined' ? params : {}; // params
        let pic_corner_topleft = params.pic_corner_topleft || picname+'_corner_topleft';
        let pic_corner_topright = params.pic_corner_topright || picname+'_corner_topright';
        let pic_corner_bottomleft = params.pic_corner_bottomleft || picname+'_corner_bottomleft';
        let pic_corner_bottomright = params.pic_corner_bottomright || picname+'_corner_bottomright';
        let pic_border_top = params.pic_border_top || picname+'_border_top';
        let pic_border_bottom = params.pic_border_bottom || picname+'_border_bottom';
        let pic_border_left = params.pic_border_left || picname+'_border_left';
        let pic_border_right = params.pic_border_right || picname+'_border_right';
        let pic_background = params.pic_background || picname+'_background';
        let it = fox.makecontainer(0,0,parent);
        it.pic_background_extrawid = params.pic_background_extrawid || 0; // if you need to make background pic wider (in pixels)
        it.pic_background_extrahei = params.pic_background_extrahei || 0; // if you need to make background pic taller (in pixels)
        it.wid = wid;
        it.hei = hei;
        it.hwid = wid/2;
        it.hhei = hei/2;
        it.minwid = params.minwid || 20;
        it.minhei = params.minhei || 20;
        it.maxwid = params.maxwid || 1000;
        it.maxhei = params.maxhei || 1000;
        it.background = fox.attachpic(pic_background,0,0,it);
        it.corner_topleft = fox.attachpic(pic_corner_topleft,-it.hwid,-it.hhei,it);
        it.corner_topright = fox.attachpic(pic_corner_topright,it.hwid,-it.hhei,it);
        it.corner_bottomleft = fox.attachpic(pic_corner_bottomleft,-it.hwid,it.hhei,it);
        it.corner_bottomright = fox.attachpic(pic_corner_bottomright,it.hwid,it.hhei,it);
        fox.setanchor(it.corner_topleft,0,0);
        fox.setanchor(it.corner_topright,1,0);
        fox.setanchor(it.corner_bottomleft,0,1);
        fox.setanchor(it.corner_bottomright,1,1);
        it.border_top = fox.attachpic(pic_border_top,0,-it.hhei,it);
        it.border_bottom = fox.attachpic(pic_border_bottom,0,it.hhei,it);
        it.border_left = fox.attachpic(pic_border_left,-it.hwid,0,it);
        it.border_right = fox.attachpic(pic_border_right,it.hwid,0,it);
        fox.setanchor(it.border_top,0.5,0);
        fox.setanchor(it.border_bottom,0.5,1);
        fox.setanchor(it.border_left,0,0.5);
        fox.setanchor(it.border_right,1,0.5);
        fox.resize9slicebox(it,wid,hei);
        return it;
    },

    resize9slicebox: function (it,wid,hei) {
        it.wid = Math.min(it.maxwid,Math.max(it.minwid,wid));
        it.hei = Math.min(it.maxhei,Math.max(it.minhei,hei));
        it.hwid = it.wid/2;
        it.hhei = it.hei/2;
        it.corner_topleft.x = -it.hwid;
        it.corner_topleft.y = -it.hhei;
        it.corner_topright.x = it.hwid;
        it.corner_topright.y = -it.hhei;
        it.corner_bottomleft.x = -it.hwid;
        it.corner_bottomleft.y = it.hhei;
        it.corner_bottomright.x = it.hwid;
        it.corner_bottomright.y = it.hhei;
        it.border_top.y = -it.hhei;
        it.border_bottom.y = it.hhei;
        it.border_left.x = -it.hwid;
        it.border_right.x = it.hwid;
        it.border_top.width = it.wid-2*it.corner_topleft.width;
        it.border_bottom.width = it.wid-2*it.corner_topleft.width;
        it.border_left.height = it.hei-2*it.corner_topleft.height;
        it.border_right.height = it.hei-2*it.corner_topleft.height;
        it.background.width = it.wid-(2*it.corner_topleft.width)+it.pic_background_extrawid;
        it.background.height = it.hei-(2*it.corner_topleft.height)+it.pic_background_extrahei;
    },

    // draw line
    drawline: function (x1,y1,x2,y2,linewidth,linecolor,linealpha,parent) {
        parent = parent || g.scene;
        linecolor = typeof linecolor !== 'undefined' ? linecolor : 0xFF0000;
        linewidth = typeof linewidth !== 'undefined' ? linewidth : 0;
        linealpha = typeof linealpha !== 'undefined' ? linealpha : 1;
        let it = new PIXI.Graphics();
        it.lineStyle(linewidth, linecolor, linealpha);
        it.moveTo(x1,y1);
        it.lineTo(x2,y2);
        parent.addChild(it);
        return it;
    },

    drawcircle: function (x,y,radius,fillcolor,fillalpha,linewidth,linecolor,linealpha,parent) {
        parent = parent || g.scene;
        radius = typeof radius !== 'undefined' ? radius : 20;
        fillcolor = typeof fillcolor !== 'undefined' ? fillcolor : 0xcc0000;
        fillalpha = typeof fillalpha !== 'undefined' ? fillalpha : 1;
        linecolor = typeof linecolor !== 'undefined' ? linecolor : 0xffffff;
        linewidth = typeof linewidth !== 'undefined' ? linewidth : 0;
        linealpha = typeof linealpha !== 'undefined' ? linealpha : 1;
        let it = new PIXI.Graphics();
        it.lineStyle(linewidth, linecolor, linealpha);
        it.beginFill(fillcolor,fillalpha);
        it.drawCircle(0,0,radius);
        it.endFill();
        parent.addChild(it);
        return it;
    },

    // draw crosshair
    drawcrosshair: function (parent,x,y,size) {
        x = typeof x !== 'undefined' ? x : 0;
        y = typeof y !== 'undefined' ? y : 0;
        size = typeof size !== 'undefined' ? size : 8;
        parent = parent || g.scene;
        let hsize = size+1;
        let ch = new PIXI.Graphics();
        ch.lineStyle(4, 0xFFFFFF, 1).moveTo(x-hsize,y).lineTo(x+hsize,y).moveTo(x,y-hsize).lineTo(x,y+hsize);
        hsize = size;
        ch.lineStyle(1, 0xCC0000, 1).moveTo(x-hsize,y).lineTo(x+hsize,y).moveTo(x,y-hsize).lineTo(x,y+hsize);
        parent.addChild(ch);
        return null;
    },

    // random sign (plus minus)
    randomsign: function(value) {
        return (1 - (fox.random(1) * 2)) * value;
    },

    // find angle between two points
    findang: function(x1,y1,x2,y2) {
        return Math.atan2(y2-y1,x2-x1);
    },

    // get all sprite's children (including nested ones) and put them in a dictionary {name:child}
    getchildren: function (target, temp) {
        temp = typeof temp !== 'undefined' ? temp : null;
        if (temp == null) {
            let children = {};
            for (let i = 0; i < target.children.length; i++) {
                children[target.children[i].name] = target.children[i];
                fox.getchildren(target.children[i], children);
            }
            return children;
        } else {
            for (let i = 0; i < target.children.length; i++) {
                temp[target.children[i].name] = target.children[i];
                fox.getchildren(target.children[i], temp);
            }
        }
    },

    // get all sprite's children's names (including nested ones) and return string array of the names
    getchildrennames: function (target) {
        let children = fox.getchildren(target);
        let names = [];
        for (let key in children) {
            if (children.hasOwnProperty(key)) names.push(key);
        }
        return names;
    },

    gotoandplay: function (mc,index,reverse = false) {
        if (!mc.name) return;
        if (mc.isfoxani) mc.gotoandplay(index,reverse);
        if (mc.isfoxclip) mc.a.gotoAndPlay(index);
    },

    gotoandstop: function (mc,index) {
        if (mc.isfoxani) mc.gotoandstop(index);
        if (mc.isfoxclip) mc.a.gotoAndStop(index);
    },

    // get currentframe
    // Usage: fox.trace(fox.getcurrentframe(it));
    getcurrentframe: function(mc) {
        if (mc.name != null) {
            if (mc.name in g.foxani) { return mc.currentframe; }
            else if (mc.name in g.foxclip) { return mc.a.currentFrame; }
            else { return 0; }
        } else {
            fox.alert("fox.getcurrentframe ERROR!");
        }
    },

    // set currentframe (works with either foxanimation or foxclip
    // Usage: fox.setcurrentframe(this.actgo,8);
    setcurrentframe: function(mc,index) {
        if (mc.name != null) {
            if (mc.name in g.foxani) { mc.currentframe = index; }
            else if (mc.name in g.foxclip) { mc.a.currentFrame = index; }
            else { fox.alert("fox.setcurrentframe ERROR!"); }
        }
        else {
            fox.alert("fox.setcurrentframe ERROR!");
        }
    },

    // parse JSON foxanimation
    /*
    parseJSONfoxanimation: function (name) {
        let ska = g.foxaniscaleratio;
        let skip = false;
        // create dictionary for this foxanimation
        let anim = {}, records_ani = {}, records_pivot = {}, animations = {}, animation = {}, textures = {}, texturesheet = {};
        records_ani['Ani'] = animations;
        animations['n'] = animation;
        records_pivot['Sheet'] = textures;
        textures['n'] = texturesheet;
        // load JSON
        let JSONani = g.foxanidata[name]['Ani'];
        let JSONpivot = g.foxpivotdata[name]['Sheet'];
        // get framecount
        let totalframes = JSONani['t'];
        // get parts
        let aniparts = JSONani['Part'];
        if (aniparts == null) {
            // this is maybe because there is only 1 part in the foxani. Check 'fox.cs'
            fox.alert("aniparts is null");
        }
        // get total parts
        let total = Array.isArray(aniparts) ? aniparts.length : 0;
        // get pivots
        let pivots = JSONpivot['U'];
        // prepare temporary dictionaries
        let pivot_x = {}, pivot_y = {}, z_index = [];
        // FIRST : iterate each pivot data
        let ok = false;
        let i = 0;
        while (!ok) {
            let mypivot = total > 0 ? pivots[i] : pivots;
            let part = mypivot['n'];
            pivot_x[part] = mypivot['e'] * ska;
            pivot_y[part] = mypivot['f'] * ska;
            if (mypivot['z'] != null && mypivot['z'] < total){
                z_index[mypivot['z']] = part;
            }  else {
                if (mypivot['z'] === undefined) {
                    // this part has z_index of 0
                    z_index[0] = part;
                } else {
                    // Error registering pivot
                    fox.alert("ERROR! Foxanimation:" + name + " Part:" + part + ". Make sure all parts are named and there's no duplicate names!");
                    skip = true;
                }
            }
            i++;
            if (i >= total) ok = true;
        }
        // Skip because of error?
        if (skip) return;
        // add z-index array to anim
        anim["zindex"] = z_index;
        // fox.trace("Total parts for " + name + " : " + total);
        // SECOND : iterate each part in array
        ok = false;
        let f = 0;
        while (!ok) {
            let mypart = total > 0 ? aniparts[f] : aniparts;
            let part = mypart['n'];
            let myframes = mypart['F'];
            // #1 Uncomment below to check for errors
            // fox.trace('Processing '+mypart['n']+' total:'+total);
            // arrays
            let xx = [], yy = [], xska = [], yska = [], ro = [], alpa = [];
            // iterate frames in each part and put its vars in arrays
            let idx = 0;
            if (!Array.isArray(myframes)) {
                // if ani only has one frame, fill ArrayList with that one frame
                myframes = [];
                myframes.push(mypart['F']);
            }
            let lastframe = 0;
            for (let i = 0; i < myframes.length; i++) {
                // If there's error here, check JSON file! Or uncomment #1 above to find which foxani it is, then check FLA for invisible parts/problems!
                let it = myframes[i];

                // if there data for this frame? (because if it has same properties as previous frame, there is no data)
                let frameidx = it['i'];
                if (idx < frameidx) {
                    while (idx < frameidx) {
                        // fill it with data from the last frame that has data (NOTE: we do this again below)
                        xx[idx] = xx[lastframe];yy[idx] = yy[lastframe];ro[idx] = ro[lastframe];alpa[idx] = alpa[lastframe];xska[idx] = xska[lastframe];yska[idx] = yska[lastframe];
                        // if part alpha is zero & scaled tiny, this frame is a flag to reset the animation
                        if (alpa[idx] === 0 && xska[idx] < 0.03 && yska[idx] < 0.03) {
                            // make this frame the lastframe, and set alpha to -9 to mark the rest of the frames
                            // (we will use this alpha -9 mark to know when to reset a foxclip)
                            alpa[idx] = -9;
                            lastframe = idx;
                        }
                        idx++;
                    }
                }

                xx[idx] = (it['x'] * ska) || 0;
                yy[idx] = (it['y'] * ska) || 0;
                xska[idx] = yska[idx] = alpa[idx] = 1;
                ro[idx] = 0;
                if (it['p'] != null) xska[idx] = it['p'];
                if (it['q'] != null) yska[idx] = it['q'];
                if (it['r'] != null) ro[idx] = fox.rad(it['r']);
                if (it['a'] != null) alpa[idx] = it['a'];
                lastframe = idx;
                idx++;

                // detect for the rest of no-data frames
                if (i === (myframes.length - 1)) {
                    // fill it with data from the last frame that has data AGAIN
                    while (idx < totalframes) {
                        xx[idx] = xx[lastframe];yy[idx] = yy[lastframe];ro[idx] = ro[lastframe];alpa[idx] = alpa[lastframe];xska[idx] = xska[lastframe];yska[idx] = yska[lastframe];
                        // if part alpha is zero & scaled tiny, this frame is a flag to reset the animation
                        if (alpa[idx] === 0 && xska[idx] < 0.03 && yska[idx] < 0.03) {
                            // make this frame the lastframe, and set alpha to -9 to mark the rest of the frames
                            // (we will use this alpha -9 mark to know when to reset a foxclip)
                            alpa[idx] = -9;
                            lastframe = idx;
                        }
                        idx++;
                    }
                }
            }
            // Create a dictionary for this part
            anim[part] = {x:xx,y:yy,xska,yska,ro,alpha:alpa,pivotx:pivot_x[part],pivoty:pivot_y[part],totalframes};
            f++;
            if (f >= total) ok = true;
        }
        // add animation to foxani
        g.foxani[name] = anim;
    },
     */

    randomize: function(a) {
        if (!(a instanceof Array)) return;
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    // force the next result of fox.getrandom to be this value
    forcenextrandom: function (arr, name, value) {
        if (arr === null || arr.length === 0) {
            fox.alert("forcenextrandom failed! " + name + " array is empty.");
            return;
        }
        if (!(name in g.randomlisting)) {
            // array not in g.randomlisting yet? add the array to g.randomlisting
            let foo = arr.slice();
            fox.randomize(foo);
            g.randomlisting[name] = foo;
        }
        // does the array have the value we want?
        let idx = g.randomlisting[name].indexOf(value);
        if (idx < 0) {
            // value not in array, add it
            g.randomlisting[name].unshift(value);
        } else {
            // value is in array, swap position so that the value is going to be next
            if (idx > 0) g.randomlisting[name].swapitems(idx, 0);
        }
    },

    // insert a value to fox.getrandom array (index optional)
    insertrandom: function (arr, name, value, index = 0) {
        if (!(name in g.randomlisting)) {
            // not in yet? add the array to g.randomlisting
            let foo = arr.slice();
            fox.randomize(foo);
            g.randomlisting[name] = foo;
        }
        g.randomlisting[name].insert(index,value);
    },

    // get random value from array
    getrandom: function (arr, name) {
        let res = null;
        if (arr === null || arr.length === 0) {
            fox.alert("Getrandom failed! " + name + " array is empty.");
            return;
        }
        if (!(name in g.randomlisting)) {
            // not in yet? add the array to g.randomlisting
            let foo = arr.slice();
            fox.randomize(foo);
            g.randomlisting[name] = foo;
        }
        // get first value from the randomized array
        res = g.randomlisting[name].shift();
        // is the random array now empty?
        if (g.randomlisting[name].length === 0)  {
            // remove array from g.randomlisting
            delete g.randomlisting[name];
            // then add again
            let foo = arr.slice();
            fox.randomize(foo);
            g.randomlisting[name] = foo;
            // and make sure no two same results in a row
            if (g.randomlisting[name].length > 1) {
                let nextone = g.randomlisting[name][0];
                if (nextone === res) {
                    if (g.randomlisting[name].length > 2) {
                        // swap with element in the middle
                        g.randomlisting[name].swapitems(0,Math.ceil(g.randomlisting[name].length/2));
                    } else {
                        g.randomlisting[name].shift();
                    }
                }
            }
        }
        return res;
    },

    resetrandom: function (name) {
        if (name == undefined) {
            g.randomlisting = []; // clear all
        } else {
            delete g.randomlisting[name];
        }
    },

    // generate random number
    random: function (value) {
        return Math.floor(Math.random() * (Math.floor(value) + 1));
    },

    // generate seeded random number
    seededrandom: function (value) {
        Math.seed = (Math.seed * 9301 + 49297) % 233280;
        return (Math.seed / 233280.0) * value;
    },

    // set the random seed
    setrandomseed: function(seed) {
        Math.seed = seed;
    },

    // generate random number between 2 values, with optional exception (either a number OR an array of numbers)
    // usage: fox.randombetween(100,200,[55,60]) --> get random number between 100 and 200, with the exception of 55,56,57,58,59,60
    randombetween: function (min,max,except) {
        min = Math.ceil(min);
        max = Math.floor(max);
        let i = Math.floor(Math.random() * (max - min + 1)) + min;
        if (typeof except == "undefined") return i;
        else if (typeof except == 'number' && i == except) return fox.randombetween(min, max, except);
        else if (typeof except == 'object' && (i >= except[0] && i <= except[1])) return fox.randombetween(min, max, except);
        else return i;
    },

    // set background color
    setbgcolor: function (clr) {
        g.app.renderer.backgroundColor = clr;
    },

    // attach foxanimation
    // usage: looping > 0=none, 1=loop_normal, 2=loop_yoyo
    //        oncompletekill > true/false
    attachani: function (name, x, y, parent, params) {
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        parent = parent || g.scene;
        let looping = 1;
        let oncompletekill = false;
        let heaven = false;
        if (params) {
            if (params.hasOwnProperty('heaven')) heaven = params['heaven'];
            if (params.hasOwnProperty('looping')) looping = params['looping'];
            if (params.hasOwnProperty('oncompletekill')) {
                oncompletekill = params['oncompletekill'];
                if (oncompletekill) looping = 0;
            }
        }
        let it = null;
        if (name in g.foxani) {
            if (g.nonloopingfoxani.includes(name)) looping = 0;
            it = new foxanimation(x,y,{name, looping, oncompletekill, heaven});
            it.isfoxani = true;
            parent.addChild(it);
        } else {
            fox.alert("fox.attachani ERROR! "+name+" not found!");
        }
        return it;
    },

    // attach movie clip
    // usage: looping > 0=none, 1=loop_normal, 2=loop_yoyo
    //        oncompletekill > true/false
    attachmovie: function (name, x, y, parent, params) {
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        parent = parent || g.scene;
        let looping = 1;
        let center = false;
        let framerate = g.defaultframerate;
        let oncompletekill = false;
        let heaven = false;
        if (params) {
            if (params.hasOwnProperty('heaven')) heaven = params['heaven'];
            if (params.hasOwnProperty('looping')) looping = params['looping'];
            if (params.hasOwnProperty('center')) center = params['center'];
            if (params.hasOwnProperty('framerate')) framerate = params['framerate'];
            if (params.hasOwnProperty('oncompletekill')) {
                oncompletekill = params['oncompletekill'];
                if (oncompletekill) looping = 0;
            }
        }
        if (g.nonloopingfoxclip.includes(name)) looping = 0;
        let it = null;
        if (name in g.foxclip) {
            it = new foxmovieclip(x,y,{name});
            if (heaven) {
                it.a = new PIXI.heaven.Sprite();
                new PIXI.heaven.AnimationState(g.foxclip[name]).bind(it.a);
                it.heaven = true;
            } else {
                it.a = new PIXI.AnimatedSprite(g.foxclip[name]);
                it.heaven = false;
            }
            if (name in g.foxclip_anchors) {
                it.a.pivot.set(g.foxclip_anchors[name].x,g.foxclip_anchors[name].y);
            } else if (center) {
                it.a.anchor.set(0.5);
            }
            it.addChild(it.a);
            parent.addChild(it);
            fox.initclip(it, framerate, looping, oncompletekill);
        } else {
            fox.alert("fox.attachmovie ERROR! "+name+" not found!");
        }
        return it;
    },

    // init movieclip
    initclip: function (it, framerate, looping, oncompletekill) {
        looping = typeof looping !== 'undefined' ? looping : 1;
        // set speed, start playback and add it to the stage
        if (framerate === undefined) framerate = g.defaultframerate;
        if (it.heaven) {
            // heaven
            it.a.animState.animationSpeed = framerate / 60;
            it.a.animState.loop = looping === 1 && !oncompletekill;
            it.a.animState.gotoAndPlay(0);
            it.a.animState.onComplete = null;
            it.isfoxclip = true;
            if (looping === 0) {
                if (oncompletekill) { it.a.animState.onComplete = () => { it.kill() } } // no loop
            } else {
                if (looping === 2) it.a.animState.onComplete = () => { it.a.animState.animationSpeed = -it.a.animState.animationSpeed; it.a.animState.play(); } // yoyo loop
            }
        } else {
            it.a.animationSpeed = framerate/60;
            it.a.loop = looping === 1 && !oncompletekill;
            it.a.gotoAndPlay(0);
            it.a.onComplete = null;
            it.isfoxclip = true;
            if (looping === 0) {
                if (oncompletekill) { it.a.onComplete = ()=> { it.kill() } } // no loop
            } else {
                if (looping === 2) it.a.onComplete = ()=> { it.a.animationSpeed = -it.a.animationSpeed; it.a.play(); } // yoyo loop
            }
        }
        return null;
    },

    // attach tiles (using PIXI.TilingSprite)
    // note: you can make moving tile background by adjusting TilingSprite's properties (tilePosition, tileScale, tileTransform)
    attachtiles: function(name,wid,hei,parent) {
        if (!g.foxpic[name]) return;
        // must turn off mipmap for tiling sprite otherwise gaps will show
        // NOTE: this will turn off mipmap for the entire atlas! So if you need mipmap, put it in separate atlas
        g.foxpic[name].baseTexture.mipmap = false;
        let it = new PIXI.TilingSprite(g.foxpic[name],wid,hei);
        parent.addChild(it);
        return it;
    },

    // attach pic (will create sprite inside a foxmovieclip container)
    attachpic: function(name, x, y, parent, params) {
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        parent = parent || g.scene;
        let center = true;
        let heaven = false;
        if (params) {
            if (params.hasOwnProperty('center')) center = params['center'];
            if (params.hasOwnProperty('heaven')) heaven = params['heaven'];
        }
        let it = null;
        if (name in g.foxpic) {
            it = new foxmovieclip(x,y,{name});
            // add sprite to foxmovieclip
            it.a = heaven ? new PIXI.heaven.Sprite(g.foxpic[name]) : new PIXI.Sprite(g.foxpic[name]);
            it.addChild(it.a);
            it.heaven = heaven;
            it.isfoxpic = true;
            if (center) it.a.anchor.set(0.5);
            parent.addChild(it);
            it.name = name;
        } else {
            fox.alert("fox.attachpic ERROR! "+name+" not found!");
        }
        return it;
    },

    // attach sprite (will create sprite without foxmovieclip container
    attachsprite: function(name, x, y, parent, params) {
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        parent = parent || g.scene;
        let center = true;
        let heaven = false;
        if (params) {
            if (params.hasOwnProperty('center')) center = params['center'];
            if (params.hasOwnProperty('heaven')) heaven = params['heaven'];
        }
        let it = null;
        if (name in g.foxpic) {
            it = heaven ? new PIXI.heaven.Sprite(g.foxpic[name]) : new PIXI.Sprite(g.foxpic[name]);
            it.x = x;
            it.y = y;
            it.heaven = heaven;
            it.issprite = true;
            if (center) it.anchor.set(0.5);
            parent.addChild(it);
            it.name = name;
        } else {
            fox.alert("fox.attachsprite ERROR! "+name+" not found!");
        }
        return it;
    },

    // set sprite as mask
    // usage: fox.setmask(it,'circleshape',0,10,t,true);
    setmask: function(target, maskname, x, y, parent, center) {
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        parent = parent || g.scene;
        center = typeof center !== 'undefined' ? center : false;
        if (maskname in g.foxpic) {
            let mask = new PIXI.Sprite(g.foxpic[maskname]);
            parent.addChild(mask);
            if (center) { mask.anchor.x = mask.anchor.y = 0.5 }
            mask.x = x;
            mask.y = y;
            target.mask = mask;
            return mask;
        } else {
            fox.alert("fox.setmask ERROR! "+name+" not found!");
        }
        return null;
    },

    // attach rounded rectangle button
    // usage: fox.attachroundedbutton('CREDITS',style,'button1',g.hscreenwid,200,180,null,()=> { fox.runscene('Start')},0,4);
    attachroundedbutton: function (text,style,x,y,parent,callback,radius,width,height,fillcolor,linecolor,linewidth,textoffsetx,textoffsety) {
        text = typeof text !== 'undefined' ? text : '';
        style = typeof style !== 'undefined' ? style : {fontFamily : 'Arial', fontSize: 20, fill : 0x000000, align : 'center'};
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        parent = parent || g.scene;
        width = typeof width !== 'undefined' ? width : 0;
        height = typeof height !== 'undefined' ? height : 0;
        fillcolor = typeof fillcolor !== 'undefined' ? fillcolor : g.buttonfillcolor;
        linecolor = typeof linecolor !== 'undefined' ? linecolor : g.buttonlinecolor;
        linewidth = typeof linewidth !== 'undefined' ? linewidth : 5;
        textoffsetx = typeof textoffsetx !== 'undefined' ? textoffsetx : 0;
        textoffsety = typeof textoffsety !== 'undefined' ? textoffsety : 0;
        let button = null;
        // create button container
        button = fox.makecontainer(x,y,parent);
        // add text
        button.text = fox.attachtext(text,textoffsetx,textoffsety,button,style);
        // make rounded rectangle
        let margin = Math.max(40, Math.round(0.9*button.text.height));
        radius = typeof radius !== 'undefined' ? radius : Math.round(margin/2.5);
        let wid = width > 0 ? width : button.text.width+margin;
        let hei = height > 0 ? height : button.text.height+margin;
        fox.makeroundedbox(-wid/2,-hei/2,wid,hei,radius,fillcolor,1,linewidth,linecolor,1,button);
        fox.bringtotop(button.text);
        // add scale tween when pressed
        button.interactive = true;
        button.callback = callback;
        button.on('pointertap',()=> {
            button.interactive = false;
            let tw = fox.tweenscale(button,{x:button.scale.x<0?-1:1,y:button.scale.y<0?-1:1},{x:button.scale.x<0?-0.8:0.8,y:button.scale.y<0?-0.8:0.8},160,0,g.easing.outQuad(),0,true);
            tw.once('end', ()=> { button.callback(); button.interactive = true; });
            fox.playbuttonsfx();
        });
        return button;
    },

    // attach 3-sliced button
    // usage: fox.attachslicedbutton('CREDITS',style,'button1',g.hscreenwid,200,180,null,()=> { fox.runscene('Start')},0,4);
    attachslicedbutton: function (text, style, pic, x, y, parent, callback, textoffsetx, textoffsety, width) {
        text = typeof text !== 'undefined' ? text : '';
        style = typeof style !== 'undefined' ? style : {fontFamily : 'Arial', fontSize: 20, fill : 0x000000, align : 'center'};
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        textoffsetx = typeof textoffsetx !== 'undefined' ? textoffsetx : 0;
        textoffsety = typeof textoffsety !== 'undefined' ? textoffsety : 0;
        parent = parent || g.scene;
        let left = pic+'a';
        let middle = pic+'b';
        let right = pic+'c';
        let button = null;
        if (left in g.foxpic && middle in g.foxpic && right in g.foxpic) {
            // create button
            button = fox.makecontainer(x,y,parent);
            // add text
            button.text = fox.attachtext(text,textoffsetx,textoffsety,button,style);
            let wid = typeof width !== 'undefined' ? width : button.text.width+5;
            let leftside = fox.attachpic(left,-wid/2,0,button,{center:false});
            let middleside = fox.attachpic(middle,0,0,button,{center:false});
            let rightside = fox.attachpic(right,wid/2,0,button,{center:false});
            middleside.a.anchor.set(0.5,0.5);
            leftside.a.anchor.set(1,0.5);
            rightside.a.anchor.set(0,0.5);
            middleside.width = wid;
            fox.bringtotop(button.text);
            button.name = pic;
            // add scale tween when pressed
            button.interactive = true;
            button.callback = callback;
            button.on('pointertap',()=> {
                button.interactive = false;
                let tw = fox.tweenscale(button,{x:button.scale.x<0?-1:1,y:button.scale.y<0?-1:1},{x:button.scale.x<0?-0.8:0.8,y:button.scale.y<0?-0.8:0.8},160,0,g.easing.outQuad(),0,true);
                tw.on('end', ()=> { button.callback(); button.interactive = true; });
                fox.playbuttonsfx();
            });
        } else {
            fox.alert("fox.attachslicedbutton ERROR! "+pic+" not found!");
        }
        return button;
    },

    // attach button
    // usage: fox.attachbutton('buttonplay',x,y,null,()=> t.buttonclicked());
    // NOTE: to add text to button, you can do fox.attachtext('SKIP',0,0,t.button.pic,textstyle,true);
    attachbutton: function (name, x, y, parent, callback) {
        x = typeof x !== 'undefined' ? x : g.hscreenwid;
        y = typeof y !== 'undefined' ? y : g.hscreenhei;
        parent = parent || g.scene;
        let button = null;
        if (name in g.foxpic) {
            button = fox.makecontainer(x,y,parent);
            button.pic = fox.attachpic(name,0,0,button);
            button.name = name;
            button.interactive = button.enabled = true;
            button.callback = callback;
            button.on('pointertap',()=> {
                if (button.enabled) {
                    button.interactive = false;
                    let tw = fox.tweenscale(button.pic, {x:button.scale.x<0?-1:1,y:button.scale.y<0?-1:1},{x:button.scale.x<0?-0.8:0.8,y:button.scale.y<0?-0.8:0.8}, 160, 0, g.easing.outQuad(), 0, true);
                    tw.once('end', () => {
                        button.callback();
                        button.interactive = true;
                    });
                    fox.playbuttonsfx();
                    // uncomment below to report the button being clicked
                    // fox.trace(button);
                }
            });
        } else {
            fox.alert("fox.attachbutton ERROR! "+name+" not found!");
        }
        return button;
    },

    // Note: to make text align left, set 'center' parameter to FALSE
    attachtext: function (text, x, y, parent, textstyle, center) {
        textstyle = textstyle || {fontFamily : 'Arial', fontSize: 24, fill : 0xff1010};
        center = typeof center !== 'undefined' ? center : true;
        parent = parent || g.scene;
        if (center) textstyle.align = 'center'; // align only works for multiline
        let it = new PIXI.Text(text, textstyle);
        it.x = x;
        it.y = y;
        it.resolution = g.ratio;
        it.anchor.set(center ? 0.5 : 0 , 0.5); // center text, we use set anchor at (0.5,0.5)
        parent.addChild(it);
        return it;
    },

    // usage: fox.attachbitmaptext('buttonplay',x,y,t,false,'fedoradigits1',25,'left');
    attachbitmaptext: function (text, x, y, parent, center, font, size, align, tint) {
        center = typeof center !== 'undefined' ? center : true;
        align = typeof align !== 'undefined' ? align : 'center'; // PIXI default is 'left'
        parent = parent || g.scene;
        let it = new PIXI.BitmapText(text,{fontName:font,fontSize:size,align,tint});
        it.x = x;
        it.y = y;
        it.resolution = g.ratio;
        if (center) it.anchor.set(0.5, 0.5);
        parent.addChild(it);
        return it;
    },

    // jiggle object (time in miliseconds)
    // usage: fox.jiggle(button,700);
    jiggle: function(it,duration,delay,resetscale,rainbow) {
        duration = typeof duration !== 'undefined' ? duration : 700;
        delay = typeof delay !== 'undefined' ? delay : 0;
        resetscale = typeof resetscale !== 'undefined' ? resetscale : true;
        rainbow = typeof rainbow !== 'undefined' ? rainbow : false;
        if (resetscale) it.scale.set(1);
        let ska = resetscale ? 1 : it.scale.x;
        if (ska < 0.1) ska = 1;
        fox.tweenremoveallfrom(it);
        it.visible = true;
        it.scale.set(0.001);
        let tw = fox.tweenscale(it,0.001,ska,duration,delay,g.easing.outElastic(1.25,0.25));
        if (rainbow) {
            it.rainbowcolorsnow = 0;
            it.originaltint = it.tint;
            tw.on('update', ()=> {
                // tint rotate colors
                fox.tint(it,g.rainbowcolors[it.rainbowcolorsnow])
                it.rainbowcolorsnow++;
                if (it.rainbowcolorsnow >= g.rainbowcolors.length) it.rainbowcolorsnow = 0;
            });
            tw.once('end', ()=> {
                // revert back to original tint
                it.tint = it.originaltint;
            });
        }
        return tw;
    },

    // kill all children in a container/foxmovieclip
    killchildren: function(container) {
        if (typeof container == 'undefined') return;
        for (let i = container.children.length-1; i >= 0; i--) {
            if (container.children[i].spawned) container.children[i].kill();
        }
    },

    // pause game (with option to mute sound)
    // NOTE: fox.pausegame will pause ALL currently running tweens when called (to pause everything going on in the game)
    //       Any new tweens created during pause will run normally. (so that Menu buttons and pop ups can tween)
    pausegame: function(mute,delay) {
        if (g.paused) return
        delay = typeof delay !== 'undefined' ? delay : 0;
        if (delay > 0) {
            fox.delayaction(delay,()=> { fox.pausegame(mute) } );
        } else {
            g.paused = true;
            g.pausetime = Date.now(); // pause time (in milliseconds)
            g.pauseframetime = g.gameframenow; // pause time (in frame time)
            PIXI.Ticker.shared.stop();
            g.ticker1.stop();
            g.ticker3.start(); // start ticker for unpaused items
            if (mute) PIXI.sound.muteAll();
            fox.pausetweens();
        }
    },

    // resume game
    resumegame: function() {
        if (!g.paused) return;
        let timepassed = Date.now()-g.pausetime;
        let framepassed = g.gameframenow-g.pauseframetime;
        // adjust delay actions
        for (let key in g.delayactions) {
            if (g.delayactions.hasOwnProperty(key)) {
                let it = g.delayactions[key];
                if (it.delay > 0) it.starttime += timepassed;
                if (it.delay < 0) it.starttime += framepassed;
            }
        }
        // adjust repeat actions
        for (let key in g.repeatactions) {
            if (g.repeatactions.hasOwnProperty(key)) {
                let it = g.repeatactions[key];
                if (it.delay > 0) it.starttime += timepassed;
                if (it.delay < 0) it.starttime += framepassed;
            }
        }
        g.paused = false;
        PIXI.Ticker.shared.start();
        g.ticker1.start();
        g.ticker3.stop(); // stop ticker for unpaused items
        if (!g.mute) PIXI.sound.unmuteAll();
        fox.resumetweens();
    },

    // get all sprite names from an atlas
    getatlaskeys: function (atlasname) {
        let out = [];
        for (let key in g.loader.resources[atlasname].data['frames']) {
            if (g.loader.resources[atlasname].data['frames'].hasOwnProperty(key)) out.push(key);
        }
        return out;
    },

    // get all animation names from a TexturePacker atlas
    // WARNING: for TexturePacker atlas ONLY!
    getanimationkeys: function (atlasname) {
        let out = [];
        for (let key in g.loader.resources[atlasname].data['animations']) {
            if (g.loader.resources[atlasname].data['animations'].hasOwnProperty(key)) out.push(key);
        }
        return out;
    },

    isEven: function(n) {
        return n % 2 === 0;
    },

    // trace (console log)
    // by default will only work when game is running locally
    // set 'onlylocal' param to FALSE to console log everywhere
    trace: function (isi, onlylocal = true, textcolor = '#C10202', backgroundcolor = '#66FF00') {
        if (!g.onlyshowlogforlocaltesting) onlylocal = false;
        if (onlylocal && !g.localtesting && !g.showinglog) return;
        try {
            let prefix = g.showlog ? '' : '%c ';
            if (Object.prototype.toString.call(isi).slice(0, 7) === '[object') {
                let res = JSON.stringify(isi, null, 4);
                console.log(prefix + res + ' ', 'background:'+backgroundcolor+';color:'+textcolor);
                // send log to Unity
                // if (!g.localtestingChromeEmulation) window.location.href = "uniwebview://debuglog?msg="+res;
            } else {
                // normal
                console.log(prefix + isi + ' ', 'background:'+backgroundcolor+';color:'+textcolor);
                // send log to Unity
                // if (!g.localtestingChromeEmulation) window.location.href = "uniwebview://debuglog?msg="+isi;
            }
        } catch(e) {
            console.log(isi);
        }
    },

    // alert (same as trace, just different color)
    alert: function (isi, onlylocal = true) {
        fox.trace(isi,onlylocal,'#FFFFFF','#CC0000')
    },

    // warn (same as trace, just different color)
    warn: function (isi, onlylocal = true) {
        fox.trace(isi,onlylocal,'#CC0000','#FFFF00')
    },

    // sort array by its property
    // usage: fox.sortby(g.en,'y',false);
    sortby: function(arr, keystr, ascending) {
        ascending = typeof ascending !== 'undefined' ? ascending : true;
        arr.sort(function(a, b) {
            return a[keystr] === b[keystr] ? 0 : +(a[keystr] > b[keystr]) || -1;
        });
        if (!ascending) arr.reverse();
    },

    isNumber: function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },

    // fast splice one element from array
    spliceone: function (arr,index) {
        let len = arr.length;
        if (len){
            while (index < len) {
                arr[index++] = arr[index];
            }
            --arr.length;
        }
    },

    functionisempty: function(f) {
        return /^function[^{]+\{\s*\}/m.test(f.toString());
    },

    distance: function (x1,y1,x2,y2) {
        return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
    },

    distanceSquared: function (x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
    },

    // check if point is in a line
    linePoint: function (x1, y1, x2, y2, xp, yp, tolerance) {
        tolerance = tolerance || 1;
        return Math.abs(fox.distanceSquared(x1, y1, x2, y2) - (fox.distanceSquared(x1, y1, xp, yp) + fox.distanceSquared(x2, y2, xp, yp))) <= tolerance;
    },

    // check if point is inside polygon
    // [tolerance=1] maximum distance of point to polygon's edges that triggers collision (see pointLine)
    polygonPoint: function (points, x, y, tolerance) {
        tolerance = tolerance || 1;
        let length = points.length;
        let c = false;
        let i, j;
        for (i = 0, j = length - 2; i < length; i += 2) {
            if (((points[i + 1] > y) !== (points[j + 1] > y)) && (x < (points[j] - points[i]) * (y - points[i + 1]) / (points[j + 1] - points[i + 1]) + points[i])) c = !c;
            j = i
        }
        if (c) return true;
        for (i = 0; i < length; i += 2) {
            let p1x = points[i];
            let p1y = points[i + 1];
            let p2x, p2y;
            if (i === length - 2) {
                p2x = points[0];
                p2y = points[1];
            } else {
                p2x = points[i + 2];
                p2y = points[i + 3];
            }
            if (fox.linePoint(p1x, p1y, p2x, p2y, x, y, tolerance)) return true
        }
        return false;
    },

    // returns TRUE if two rectangles intersect (box vs box collision for cekcoll)
    rectangleintersection: function (ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
        return (ax1 <= bx2 && bx1 <= ax2 && ay1 <= by2 && by1 <= ay2)
    },

    // returns TRUE if rectangle A is inside rectangle B
    rectangleinrectangle: function(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
        return (ax2 < bx2 && ax1 > bx1 && ay1 > by1 && ay2 < by2 )
    },

    // returns TRUE if two lines intersect
    // note: if you need to find the intersection point, use line2lineintersection below
    lineToLine: function (x1, y1, x2, y2, x3, y3, x4, y4) {
        let s1_x = x2 - x1;
        let s1_y = y2 - y1;
        let s2_x = x4 - x3;
        let s2_y = y4 - y3;
        let s = (-s1_y * (x1 - x3) + s1_x * (y1 - y3)) / (-s2_x * s1_y + s1_x * s2_y);
        let t = (s2_x * (y1 - y3) - s2_y * (x1 - x3)) / (-s2_x * s1_y + s1_x * s2_y);
        return s >= 0 && s <= 1 && t >= 0 && t <= 1;
    },

    // Find the intersection point of two line segments
    // Return FALSE if the lines don't intersect
    line2lineintersection: function (x1, y1, x2, y2, x3, y3, x4, y4) {
        // Check if none of the lines are of length 0
        if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) return false;
        let denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
        // Lines are parallel?
        if (denominator === 0) return false;
        let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
        let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
        // is the intersection along the segments?
        if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return false;
        // Return a object with the x and y coordinates of the intersection
        let x = x1 + ua * (x2 - x1);
        let y = y1 + ua * (y2 - y1);
        return {x, y};
    },

    // Implementation of the QuickHull algorithm for finding convex hull of a set of points
    // https://www.geeksforgeeks.org/quickhull-algorithm-convex-hull/
    QuickHull: function(points) {
        let hull = [];
        //if there are only three points, this is a triangle, which by definition is already a hull
        if (points.length === 3) {
            points.push(points[0]); //close the poly
            return points;
        }
        let baseline = fox.QuickHullgetMinMaxPoints(points);
        fox.QuickHulladdSegments(baseline, points, hull);
        fox.QuickHulladdSegments([baseline[1], baseline[0]], points, hull); //reverse line direction to get points on other side
        //add the last point to make a closed loop
        hull.push(hull[0]);
        return hull;
    },

    /**
     * Return the min and max points in the set along the X axis
     * Returns [ {x,y}, {x,y} ]
     * @param {Array} points - An array of {x,y} objects
     */
    QuickHullgetMinMaxPoints: function(points) {
        let i;
        let minPoint;
        let maxPoint;
        minPoint = points[0];
        maxPoint = points[0];
        for (i=1; i<points.length; i++) {
            if (points[i].x < minPoint.x) minPoint = points[i];
            if (points[i].x > maxPoint.x) maxPoint = points[i];
        }
        return [minPoint, maxPoint];
    },

    /**
     * Calculates the distance of a point from a line
     * @param {Array} point - Array [x,y]
     * @param {Array} line - Array of two points [ [x1,y1], [x2,y2] ]
     */
    QuickHulldistanceFromLine: function(point, line) {
        let vY = line[1].y - line[0].y;
        let vX = line[0].x - line[1].x;
        return (vX * (point.y - line[0].y) + vY * (point.x - line[0].x))
    },

    /**
     * Determines the set of points that lay outside the line (positive), and the most distal point
     * Returns: {points: [ [x1, y1], ... ], max: [x,y] ]
     * @param points
     * @param line
     */
    QuickHulldistalPoints: function(line, points) {
        let i;
        let outer_points = [];
        let point;
        let distal_point;
        let distance=0;
        let max_distance=0;
        for (i=0; i<points.length; i++) {
            point = points[i];
            distance = fox.QuickHulldistanceFromLine(point,line);
            if(distance > 0) outer_points.push(point);
            else continue; //short circuit
            if (distance > max_distance) {
                distal_point = point;
                max_distance = distance;
            }
        }
        return {points: outer_points, max: distal_point};
    },

    /**
     * Recursively adds hull segments
     * @param line
     * @param points
     */
    QuickHulladdSegments: function(line,points,hull) {
        let distal = fox.QuickHulldistalPoints(line, points);
        if (!distal.max) return hull.push(line[0]);
        fox.QuickHulladdSegments([line[0], distal.max], distal.points, hull);
        fox.QuickHulladdSegments([distal.max, line[1]], distal.points, hull);
    },

    // detect device type using current-device.js
    // returns (mobile/tablet/desktop/unknown)
    devicetype : function() {
        return device.type;
    },

    // Returns a valid RFC4122 version4 ID hex string from https://stackoverflow.com/a/2117523/109538
    uuid: function() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }
}

// remove element from array
Array.prototype.remove = function (element) {
    let index = this.indexOf(element);
    if (index !== -1) fox.spliceone(this,index);
};

// remove element at array index
Array.prototype.removeat = function (index) {
    fox.spliceone(this,index);
};

// returns a new array with unique elements from current array
Array.prototype.unique = function() {
    let a = [];
    for (let i=0, l=this.length; i<l; i++)
        if (a.indexOf(this[i]) === -1)
            a.push(this[i]);
    return a;
};

// insert item into array at specific position
// Example: var arr = [ 'A', 'B', 'D', 'E' ];
//          arr.insert(2, 'C'); --> result is [ 'A', 'B', 'C', 'D', 'E' ]
Array.prototype.insert = function ( index, item ) {
    this.splice( index, 0, item );
};

// Array sortby function (https://github.com/eneko/Array.sortBy)
/*
Given an array of objects:
var data = [
	{ name: { first: 'Josh', last: 'Jones' }, age: 30 },
	{ name: { first: 'Carlos', last: 'Jacques' }, age: 19 },
	{ name: { first: 'Carlos', last: 'Dante' }, age: 23 },
	{ name: { first: 'Tim', last: 'Marley' }, age: 9 },
	{ name: { first: 'Courtney', last: 'Smith' }, age: 27 },
	{ name: { first: 'Bob', last: 'Smith' }, age: 30 }
]

It can be sorted by any key in the object. To sort descending, pass descending:true as options:
data.sortBy('age'); // "Tim Marley(9)", "Carlos Jacques(19)", "Carlos Dante(23)", "Courtney Smith(27)", "Josh Jones(30)", "Bob Smith(30)"

To sort by a child object key we need to pass the path needed to get to the value. This path can be an array or an string path. In this example, to sort by first name we could pass an array of keys ['name', 'first'] or a string "name.first":

data.sortBy('name.first'); // "Bob Smith(30)", "Carlos Dante(23)", "Carlos Jacques(19)", "Courtney Smith(27)", "Josh Jones(30)", "Tim Marley(9)"
data.sortBy(['name', 'first']); // "Bob Smith(30)", "Carlos Dante(23)", "Carlos Jacques(19)", "Courtney Smith(27)", "Josh Jones(30)", "Tim Marley(9)"

To sort descending, the path must start with a minus sign:

data.sortBy('-age'); // "Josh Jones(30)", "Bob Smith(30)", "Courtney Smith(27)", "Carlos Dante(23)", "Carlos Jacques(19)", "Tim Marley(9)"
data.sortBy('-name.first'); // "Tim Marley(9)", "Josh Jones(30)", "Courtney Smith(27)", "Carlos Dante(23)", "Carlos Jacques(19)", "Bob Smith(30)"
data.sortBy(['-','name', 'first']); // "Tim Marley(9)", "Josh Jones(30)", "Courtney Smith(27)", "Carlos Dante(23)", "Carlos Jacques(19)", "Bob Smith(30)"

Sorting by multiple keys

To sort by multiple keys, just pass multiple arguments to the sorting method:

data.sortBy('name.first', 'age'); // "Bob Smith(30)", "Carlos Jacques(19)", "Carlos Dante(23)", "Courtney Smith(27)", "Josh Jones(30)", "Tim Marley(9)"
data.sortBy('name.first', '-age'); // "Bob Smith(30)", "Carlos Dante(23)", "Carlos Jacques(19)", "Courtney Smith(27)", "Josh Jones(30)", "Tim Marley(9)"

*/

(function(){

    var keyPaths = [];

    var saveKeyPath = function(path) {
        keyPaths.push({
            sign: (path[0] === '+' || path[0] === '-')? parseInt(path.shift()+1) : 1,
            path: path
        });
    };

    var valueOf = function(object, path) {
        var ptr = object;
        for (var i=0,l=path.length; i<l; i++) ptr = ptr[path[i]];
        return ptr;
    };

    var comparer = function(a, b) {
        for (var i = 0, l = keyPaths.length; i < l; i++) {
            aVal = valueOf(a, keyPaths[i].path);
            bVal = valueOf(b, keyPaths[i].path);
            if (aVal > bVal) return keyPaths[i].sign;
            if (aVal < bVal) return -keyPaths[i].sign;
        }
        return 0;
    };

    Array.prototype.sortby = function() {
        keyPaths = [];
        for (var i=0,l=arguments.length; i<l; i++) {
            switch (typeof(arguments[i])) {
                case "object": saveKeyPath(arguments[i]); break;
                case "string": saveKeyPath(arguments[i].match(/[+-]|[^.]+/g)); break;
            }
        }
        return this.sort(comparer);
    };

})();

// Alphanumeric Array Sort
Array.prototype.sortalphanumeric = function(caseInsensitive) {
    for (var z = 0, t; t = this[z]; z++) {
        this[z] = new Array();
        var x = 0, y = -1, n = 0, i, j;

        while (i = (j = t.charAt(x++)).charCodeAt(0)) {
            var m = (i == 46 || (i >=48 && i <= 57));
            if (m !== n) {
                this[z][++y] = "";
                n = m;
            }
            this[z][y] += j;
        }
    }

    this.sort(function(a, b) {
        for (var x = 0, aa, bb; (aa = a[x]) && (bb = b[x]); x++) {
            if (caseInsensitive) {
                aa = aa.toLowerCase();
                bb = bb.toLowerCase();
            }
            if (aa !== bb) {
                var c = Number(aa), d = Number(bb);
                if (c == aa && d == bb) {
                    return c - d;
                } else return (aa > bb) ? 1 : -1;
            }
        }
        return a.length - b.length;
    });

    for (var z = 0; z < this.length; z++)
        this[z] = this[z].join("");
}

// swap position of two items in an array
// Example: var arr = [0,1,2,3,4,5,6,7,8,9];
//          arr.swapItems(3,7)); --> result is [0,1,2,7,4,5,6,3,8,9]
Array.prototype.swapitems = function(a, b){
    this[a] = this.splice(b, 1, this[a])[0];
    return this;
}

// limit array length to 'num'
Array.prototype.maxlength = function(value){
    this.length = Math.min(this.length, value);
    return this;
}

// asynchronous local storage
asynclocalstorage = {
    setItem: function (key, value) {
        return Promise.resolve().then(function () {
            localStorage.setItem(key, value);
        });
    },
    getItem: function (key) {
        return Promise.resolve().then(function () {
            return localStorage.getItem(key);
        });
    }
};

Math.clamp = function(n, min, max) {
    return Math.max(min, Math.min(n, max));
};

// CHANGE THE INITIAL SEED HERE
Math.seed = 24;

//Math.seededRandom()
Math.seededRandom = function(max, min) {
    max = max || 1;
    min = min || 0;
    Math.seed = (Math.seed * 9301 + 49297) % 233280;
    let rnd = Math.seed / 233280.0;
    return min + rnd * (max - min);
}

function _delete(obj, prop) {
    if (obj[prop] && ! obj[prop].length) delete obj[prop];
}

/*
// Simple error reporting to server
window.onerror = function (message, url, line, column, error) {
    error = error || {};
    let filename = url.split('/').pop();
    let msg = 'Error: '+message+'\nFile: '+filename+' line '+line+' column '+column;
    if (g.showinglog) console.log(msg);
    // msg += ' StackTrace: '+error; // uncomment to send stack trace
    // send log to server
    fox.trace('Sending error log..');
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "https://www.ferryhalim.com/tulislog.php", true);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.onreadystatechange = function() {
        if (this.readyState === 4 || this.status === 200){
            fox.trace(xmlhttp.responseText);
        }
    };
    xmlhttp.send("msg="+msg);

}
 */