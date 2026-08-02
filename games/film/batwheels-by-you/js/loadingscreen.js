var loadingscreen = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
loadingscreen.prototype = Object.create(foxmovieclip.prototype);
loadingscreen.prototype.constructor = loadingscreen;

loadingscreen.prototype.awaken = function() {
    let t = this;
    t.uda = t.specialfigureloaded = t.userfigureloaded = false;
    // load savegame (and also user figure)
    common.loadhighscore();
    // load special figures (note: to skip figure loading, just comment out figureIDs & figureTags in globalvar.js)
    if (g.figureTags) common.loadspecialfigures_byTags();
    if (g.figureIDs) common.loadspecialfigures_byID();
    // whenever we got signal for loaded figure data, we do ceksetup
    g.signal.on('userfigureloaded',()=> { t.userfigureloaded = true; t.ceksetup() });
    g.signal.on('specialfigureloaded',()=> { t.specialfigureloaded = true; t.ceksetup() });
    // array of JS files to load
    t.JSscripts = ['batcomputer','menubar','swingingitem','photo','gallery','titlescreen','movingbackground','popconfirm','popmessage','popsound','poptutorial','popfigures','start','particle','pausescreen','foxanimation','foxlib','race','racepick'];
    // other JS assets to load
    t.JSassets = ['z_audio.jz','z_animations.jz','z_foxsvg.jz'];
    // preloader assets
    t.preloaderassets = ['loadinglogo.png','loadingbar.png','loadingbarbg.png'];
    // load preloader assets
    for (let i = 0; i < t.preloaderassets.length; i++) {
        g.loader.add(t.preloaderassets[i].slice(0, -4), './img/'+t.preloaderassets[i]);
    }
    g.loader.load(()=> {
        // once loaded, add assets to foxpic so we can call them with with fox.attachpic
        for (let i = 0; i < t.preloaderassets.length; i++) {
            g.foxpic[t.preloaderassets[i].slice(0, -4)] = g.loader.resources[t.preloaderassets[i].slice(0, -4)].texture;
        }
        // ..then load fonts
        t.preloadfonts();
    });
};

loadingscreen.prototype.setall = function() {
    let t = this;
    // create container at the center of the screen
    t.a = fox.makecontainer(g.hscreenwid,g.hscreenhei,t);
    // loading background
    // let yoffset = -0.4*(62-(g.gameoffsety/2));
    // let bg = fox.attachpic('loadingbg',0,g.hscreenhei,t.a,true);
    // fox.setanchor(bg,0.5,1);
    // fox.setscale(bg,0.5);
    // if (g.screenhei > bg.height) bg.height = g.screenhei;
    // if (g.screenhei > bg.a.height) bg.a.height = g.screenhei; // stretch if needed
    // loading pic
    // let pic = fox.attachpic('loadingpic',-g.hscreenwid+(g.gameoffsetx/2),g.hscreenhei,t.a,false);
    // fox.setscale(pic,0.5);
    // fox.setanchor(pic,0,1);
    // loading logo
    let logo = fox.attachpic('loadinglogo',0,-0.2*g.hscreenhei,t.a,true);
    fox.setscale(logo,0.5);
    // loading text
    // let style = {fontFamily : g.titlefont, fontSize: 30, fill : '#ffffff', align : 'center', stroke:'#000000', strokeThickness:9};
    // let textloading = fox.attachtext('LOADING',0, 40,t.a,style,true);
    // fox.jiggle(textloading,700,10);
    // create show log button at the top right corner
    if (g.makeshowlogbutton) {
        let sb = fox.makebox(g.screenwid - 40, 0, 40, 40, t, 0xff0000, 0);
        sb.interactive = true;
        sb.tapcount = 0;
        // to display log, tap the button 3x
        sb.on('pointertap', () => {
            sb.tapcount++;
            if (sb.tapcount === 3) {
                sb.interactive = false;
                fox.showlog();
            }
        });
    }
    // make preload bar
    let barpos = 80;
    let barcontainer = fox.makecontainer(0,barpos,t.a);
    fox.setscale(barcontainer,0.5);
    let loadingbarbg = fox.attachpic('loadingbarbg',0,0,barcontainer,true);
    t.loadingbar = fox.attachpic('loadingbar',-225,0,barcontainer,true);
    fox.setanchor(t.loadingbar,0,0.5);
    t.loadingbarsize = t.loadingbar.width;
    t.loadingbar.filters = [new PIXI.filters.GlowFilter({distance:8,outerStrength:1,quality:3})];
    // create show log button at the top right corner
    if (g.makeshowlogbutton) {
        let sb = fox.makebox(g.screenwid - 40, 0, 40, 40, t, 0xff0000, 0);
        sb.interactive = true;
        sb.on('pointertap', () => { sb.interactive = false; fox.showlog(); });
    }
};

loadingscreen.prototype.loadassets = function() {
    let t = this;
    // load images
    let atlasdict = {};
    for (let f = 0; f < g.atlasnames.length; f++) {
        for (let i = 0; i < g[g.atlasnames[f]+'_atlas'].length; i++) {
            atlasdict[g[g.atlasnames[f]+'_atlas'][i]] = g[g.atlasnames[f]+'_atlas'][i]+fox.getatlasresolution(atlasdict[g[g.atlasnames[f]+'_atlas'][i]]);
        }
    }
    for (let key in atlasdict) {
        if (atlasdict.hasOwnProperty(key)) g.loader.add(key, './img/' + atlasdict[key] + '.json')
    }
    // load bitmap fonts
    for (let i = 0; i < g.bitmapfonts.length; i++) {
        g.loader.add(g.bitmapfonts[i], 'fonts/'+g.bitmapfonts[i]+'.fnt');
    }
    // add onProgress callback to update loading bar
    t.minisignal = g.loader.onProgress.add(() => t.updatebar());
    g.loader.load(()=> {
        t.minisignal.detach(); // remove onProgress callback
        t.loadJSfiles()
    });
};

loadingscreen.prototype.loadJSfiles = function() {
    let t = this;
    let arr = [];
    // add path to t.JSassets
    for (let i = 0; i < t.JSassets.length; i++) t.JSassets[i] = 'jz/'+t.JSassets[i];
    // add path to t.JSscripts
    for (let i = 0; i < t.JSscripts.length; i++) t.JSscripts[i] = 'js/'+t.JSscripts[i]+'.js';
    // combine with JSassets & JSscripts arrays
    let allJS = arr.concat(t.JSassets,t.JSscripts);
    fox.loadJS(allJS,(e)=> { t.ceksetup() });
};

loadingscreen.prototype.updatebar = function() {
    let t = this;
    // update preload bar (intentionally always leave out the last 5 percent)
    t.loadingbar.width = Math.max(1, g.loader.progress/100 * (0.96*t.loadingbarsize));
};

loadingscreen.prototype.ceksetup = function() {
    var t = this;
    // if g.figureIDs or g.figureTags is not empty, make sure to load special figure data/images & user collected figures data before setup
    if ((!g.figureIDs && !g.figureTags) || (t.specialfigureloaded && t.userfigureloaded)) t.setup();
}

loadingscreen.prototype.setup = function() {
    let t = this;
    if (t.uda) return;
    t.uda = true;
    t.initSDK();
    t.initSVG();
    t.initfoxpic();
    t.initfoxclip();
    t.initaudio();
    t.initCNfigures();
    if (g.firstscene !== 'titlescreen') {
        // development mode
        fox.delayaction(10, ()=> { fox.runscene(g.firstscene, true) }); // add tiny delay to prevent detached audiobuffer
        fox.trace('dev mode - skip fadescreen');
    } else {
        // show loading completion..
        t.loadingbar.width = t.loadingbarsize;
        // ..then start the game
        fox.delayaction(150, ()=> { fox.runscene(g.firstscene, true) });
    }
};

// detect if player has special figures by comparing g.userfigures with g.figuresTagsdata/g.figureIDs
loadingscreen.prototype.initCNfigures = function() {
    if (!g.figureIDs && !g.figureTags) {
        // skip CN figures
        g.udapopfigure = true;
    } else {
        if (g.userfigures.collectedFigures.length === 0) {
            fox.trace('Player owns no figures');
            return;
        }
        if (g.figureTags) {
            // count how many figures matched our g.figuresTagsdata
            for (let i = 0; i < g.userfigures.collectedFigures.length; i++) {
                let fig = g.userfigures.collectedFigures[i];
                for (let f = 0; f < g.figuresTagsdata.length; f++) {
                    if (fig.uuid === g.figuresTagsdata[f].uuid) {
                        g.figurestatus[f] = 1;
                        g.gotfigure = true;
                        fox.trace('Player owns a special figure!');
                    }
                }
            }
        } else if (g.figureIDs) {
            // count how many figures matched our g.figureIDs
            for (let i = 0; i < g.userfigures.collectedFigures.length; i++) {
                let fig = g.userfigures.collectedFigures[i];
                for (let f = 0; f < g.figureIDs.length; f++) {
                    if (fig.uuid === g.figureIDs[f]) {
                        g.figurestatus[f] = 1;
                        g.gotfigure = true;
                        fox.trace('Player owns a special figure!');
                    }
                }
            }
        }
    }
}

// init audio
loadingscreen.prototype.initaudio = function() {
    if (!g.z_audio) return;
    // init base64 audio
    for (let key in g.z_audio) {
        if (g.z_audio.hasOwnProperty(key)) {
            g.sfx[key] = PIXI.sound.Sound.from({ source: fox.base64toBuffer(g.z_audio[key]) });
            // play sound and stop it - necessary fix for base64 audio files to get all properties ready (duration, etc)
            g.sfx[key].play();
            g.sfx[key].stop();
        }
    }
    // set the music & sfx to mute (or not) based on saved data
    common.applymutemusic();
    common.applymutesfx();
};

// init foxclip
loadingscreen.prototype.initfoxclip = function() {
    let t = this;
    // get clips from g.foxpic
    for (let key in g.foxpic) {
        // check if the property/key is defined in the object itself, not in parent
        if (g.foxpic.hasOwnProperty(key)) {
            if (fox.endswithdigits(key, 4)) {
                let name = key.substr(0, key.length - 4);
                if (!g.foxcliparrays[name]) {
                    g.foxcliparrays[name] = [];
                    g.foxclipframecount[name] = 0;
                }
                // put each pic name into array
                g.foxcliparrays[name].push(key);
                // update frame count
                g.foxclipframecount[name]++;
            }
        }
    }

    if (g.z_foxsvg) {
        // get clips from g.z_foxsvg
        for (let key in g.z_foxsvg) {
            // check if the property/key is defined in the object itself, not in parent
            if (g.z_foxsvg.hasOwnProperty(key)) {
                if (fox.endswithdigits(key, 4)) {
                    let name = key.substr(0, key.length - 4);
                    if (!g.foxcliparrays[name]) {
                        g.foxcliparrays[name] = [];
                        g.foxclipframecount[name] = 0;
                    }
                    // put each pic name into array
                    g.foxcliparrays[name].push(key);
                    // update frame count
                    g.foxclipframecount[name]++;
                }
            }
        }
    }
    // process g.foxcliparrays
    for (let key in g.foxcliparrays) {
        // prepare array of textures for the clip
        let texarr = [];
        // sort alphanumeric the list of pic names
        g.foxcliparrays[key].sortalphanumeric();
        // fill up texture array
        for (let  i = 0; i < g.foxcliparrays[key].length; i++) {
            texarr.push(g.foxpic[g.foxcliparrays[key][i]]);
        }
        // add animation to g.foxclip
        g.foxclip[key] = texarr;
    }
};

loadingscreen.prototype.initfoxpic = function() {
    let t = this;
    // Process foxpics =============================================================================
    let names = [];
    for (let i = 0; i < g.foxpic_atlas.length; i++) {
        names = fox.getatlaskeys(g.foxpic_atlas[i]);
        if (names.length > 0) {
            for (let f = 0; f < names.length; f++) {
                g.foxpic[names[f]] = g.loader.resources[g.foxpic_atlas[i]].textures[names[f]];
            }
        }
    }
    // g.foxpic will also include foxbg images
    for (let i = 0; i < g.foxbg_atlas.length; i++) {
        names = fox.getatlaskeys(g.foxbg_atlas[i]);
        if (names.length > 0) {
            for (let f = 0; f < names.length; f++) {
                g.foxpic[names[f]] = g.loader.resources[g.foxbg_atlas[i]].textures[names[f]];
            }
        }
    }
    // g.foxpic will also include foxjpg images
    for (let i = 0; i < g.foxjpg_atlas.length; i++) {
        names = fox.getatlaskeys(g.foxjpg_atlas[i]);
        if (names.length > 0) {
            for (let f = 0; f < names.length; f++) {
                g.foxpic[names[f]] = g.loader.resources[g.foxjpg_atlas[i]].textures[names[f]];
            }
        }
    }
    // g.foxpic will also include foxani images
    for (let i = 0; i < g.foxani_atlas.length; i++) {
        names = fox.getatlaskeys(g.foxani_atlas[i]);
        if (names.length > 0) {
            for (let f = 0; f < names.length; f++) {
                g.foxpic[names[f]] = g.loader.resources[g.foxani_atlas[i]].textures[names[f]];
            }
        }
    }
    // g.foxpic will also include foxclip images
    for (let i = 0; i < g.foxclip_atlas.length; i++) {
        names = fox.getatlaskeys(g.foxclip_atlas[i]);
        if (names.length > 0) {
            for (let f = 0; f < names.length; f++) {
                g.foxpic[names[f]] = g.loader.resources[g.foxclip_atlas[i]].textures[names[f]];
            }
        }
    }
};



loadingscreen.prototype.initSVG = function() {
    // process all SVG images
    if (!g.z_foxsvg) return;
    let data = g.z_foxsvg;
    for (let key in data) {
        if (data.hasOwnProperty(key)) {
            let svgstring = LZString.decompress(data[key]);
            let blob = new Blob([svgstring], {type: 'image/svg+xml'});
            g.foxpic[key] = PIXI.Texture.from(URL.createObjectURL(blob),{resolution:g.ratio});
        }
    }
};

loadingscreen.prototype.preloadfonts = function() {
    let t = this;
    // preload fonts using FontFaceObserver
    t.fontsloadedcount = 0;
    for (let i = 0; i < g.fonts.length; i++) {
        let font = new FontFaceObserver(g.fonts[i]);
        font.load().then(()=> {
            t.fontsloadedcount++;
            if (t.fontsloadedcount >= g.fonts.length) {
                t.setall();
                // then load assets
                t.loadassets();
            }
        });
    }
};

loadingscreen.prototype.initSDK = function() {
    // CN Arcade SDK =========================
    if (window['PlayPromise']) {
        window['PlayPromise'].then(sdk => {
            sdk.setPlayFunction(() => { common.SDKplay() });
            sdk.setPauseFunction(() => { common.SDKpause() });
        });
    }
    // =======================================
};
