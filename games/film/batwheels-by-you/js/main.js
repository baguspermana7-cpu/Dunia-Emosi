var g = g || {};

function init () {
    // detect device type
    g.ismobile = fox.devicetype() === 'mobile';
    g.istablet = fox.devicetype() === 'tablet';
    g.isdesktop = fox.devicetype() === 'desktop';
    // ----------------------------------------------------------------------------
    if (window.location.href.indexOf('//192.168.') > -1 || window.location.href.indexOf('localhost') > -1) g.localtesting = true;
    // ----------------------------------------------------------------------------

    // game settings
    g.firstscene = 0; // 0 = titlescreen, 1 = start
    g.skipclean = 0; // 1 = jump to customization
    g.drawSATpoly = 0; // 1 = draw SAT polygons

    g.forceskipCNfigure = 0;

    // process settings
    if (g.forcefirstscene > 0) {
        // for development purposes
        g.forceskiptutorial = 1; // 0 = false, 1 = true (skip the intro tutorial)
    } else {
        // for release
        g.forcefirstscene =  g.forceskiptutorial = 0;
    }
    g.firstscene = g.firstscene === 0 ? 'titlescreen' : g.firstscene === 1 ? 'start' : g.firstscene === 2 ? 'shop' : 'winscreen';
    if (g.forceskipCNfigure === 1) g.udapopfigure = true;
    if (g.forceskiptutorial === 1) g.udatutorial = true;
    // ----------------------------------------------------------------------------

    // ratio
    g.ratio = 2;

    // fps ratio
    // g.fpsratio = g.force30fps ? 2 : 1;
    g.fpsratio = 1;

    // set button margin
    g.buttonmargin = 80;

    if (g.fullscreen) {
        // create pixi fullscreen application
        g.app = new PIXI.Application({ backgroundColor:0x000000, width: 800, height: 400, antialias: true, transparent: false, resolution: 1, resizeTo: window });
        document.body.appendChild(g.app.view);
    } else {
        // create pixi application inside a div
        g.canvasdiv = document.getElementById('canvas_div');
        g.gamecanvas = document.getElementById('game_canvas');
        g.app = new PIXI.Application({ backgroundColor:0x000000, width: 800, height: 400, antialias: true, transparent: false, resolution: 1, view: g.gamecanvas});
        g.gamewid = g.screenwid = 1280;
        g.gamehei = g.screenhei = 720;
        g.gameoffsetx = g.gameoffsety = 0;
        g.userscale = 1;
        g.hscreenwid = g.screenwid / 2;
        g.hscreenhei = g.screenhei / 2;
        // this game has a footer, and on desktop we reduce footer height
    }

    // mask game on desktop
    // if (g.isdesktop) maskgame();
    // create scene containers
    // we don't use fox.makecontainers because these are permanent containers
    g.scenecontainer = new PIXI.Container();
    g.overcontainer = new PIXI.Container();
    g.fadecontainer = new PIXI.Container();
    g.logcontainer = new PIXI.Container();
    g.app.stage.addChild(g.scenecontainer);
    g.app.stage.addChild(g.overcontainer);
    g.app.stage.addChild(g.fadecontainer);
    g.app.stage.addChild(g.logcontainer);

    resize();

    // PIXI Ticker
    // NOTE: we use 3 tickers. One for all foxmovieclips loops, second one for tweens (to keep them running during pause),
    //       and third one for unpaused items (items we want to run during pause)
    // WARNING: do NOT use PIXI shared ticker! It can cause problem with foxmovieclips in g.unpauseitems!
    // create first ticker for all foxmovieclips (game loops)
    g.ticker1 = new PIXI.Ticker();
    g.ticker1.add((delta)=> { fox.updateall() });
    g.ticker1.start();
    // create a second ticker just for tweens and game frame-time -> this ticker will always run (never paused)
    g.ticker2 = new PIXI.Ticker();
    g.ticker2.add((delta)=> { PIXI.tweenManager.update(); g.gameframenow++; }); // add the tween manager to the ticker
    g.ticker2.start();
    // create a third ticker just for unpaused items (when g.ticker1 is paused, g.ticker3 will start, and vice versa)
    g.ticker3 = new PIXI.Ticker();
    g.ticker3.add((delta)=> { fox.updateignorepauseitems() });

    // PIXI loader
    g.loader = new PIXI.Loader();
    // force PIXI loader to ignore cache?
    g.loader.defaultQueryString = ''; // offline build: no cache-buster (see index.html)

    // touch events - put all code in common.js
    g.app.renderer.plugins.interaction.on( 'pointerdown', (event) => { common.onpointerdown(event.data.global) } );
    g.app.renderer.plugins.interaction.on( 'pointerup', (event) => { common.onpointerup(event.data.global) } );
    g.app.renderer.plugins.interaction.on( 'pointermove', (event) => { common.onpointermove(event.data.global) } );

    // create signal events
    g.signal = new PIXI.utils.EventEmitter();

    // ask for password
    if (!g.localtesting && g.CNpassword.length > 0) askpassword();

    // uncomment below to show log onscreen
    // fox.showlog();

    // load loading screen
    fox.runscene('loadingscreen');
}

// init
init();

// detect screen resize
window.onresize = resize;

// resize the renderer to fit window
function resize() {
    // original game dimension
    g.gamewid = 320;
    g.gamehei = 568;
    // reset offset values
    g.gameoffsetx = g.gameoffsety = 0;
    g.gamefitwidth = g.gamefitheight = false;
    // fill the window area (when fullscreen) OR canvas div area (when inside a div)
    let winwidth = g.fullscreen ? window.innerWidth : g.canvasdiv.clientWidth;
    let winheight = g.fullscreen ? window.innerHeight : g.canvasdiv.clientHeight;
    if (!g.fullscreen) {
        g.gamecanvas.width = winwidth;
        g.gamecanvas.height = winheight;
        g.app.renderer.resize(winwidth, winheight);
    }

    // for mobile (game will fit screen depending on device aspect ratio)
    if (winwidth/winheight < g.gamewid/g.gamehei) {
        // fit width (iPhone)
        g.gamefitwidth = true;
        g.userscale = winwidth/g.gamewid;
        g.screenwid = g.innerwindowwid = g.gamewid;
        // limit aspect ratio
        let innerwindowaspectratio = winheight/winwidth;
        let aspectratio = Math.min(2.35,innerwindowaspectratio);
        g.screenhei = Math.round(aspectratio*g.screenwid);
        g.innerwindowhei = Math.round(innerwindowaspectratio*g.screenwid);
        g.gameoffsetx = 0;
        g.gameoffsety =  g.screenhei-Math.round(g.gamehei/g.gamewid*g.screenwid);
        // center view
        g.scenecontainer.x = g.overcontainer.x = g.fadecontainer.x = g.logcontainer.x = 0;
        g.scenecontainer.y = g.overcontainer.y = g.fadecontainer.y = g.logcontainer.y = 0.5*(g.innerwindowhei-g.screenhei);
    } else {
        // fit height (iPad)
        g.gamefitheight = true;
        g.userscale = winheight/g.gamehei;
        // limit aspect ratio
        let innerwindowaspectratio = winwidth/winheight;
        let aspectratio = Math.min(1.2,innerwindowaspectratio);
        g.screenhei = g.innerwindowhei = g.gamehei;
        g.screenwid = Math.round(aspectratio*g.screenhei);
        g.innerwindowwid = Math.round(innerwindowaspectratio*g.screenhei);
        g.gameoffsetx =  g.screenwid-Math.round(g.gamewid/g.gamehei*g.screenhei);
        g.gameoffsety = 0;
        // center view
        g.scenecontainer.x = g.overcontainer.x = g.fadecontainer.x = g.logcontainer.x = 0.5*(g.innerwindowwid-g.screenwid);
        g.scenecontainer.y = g.overcontainer.y = g.fadecontainer.y = g.logcontainer.y = 0;
    }
    // set half screen width & height values
    g.hscreenwid = g.screenwid / 2;
    g.hscreenhei = g.screenhei / 2;
    g.app.stage.scale.x = g.app.stage.scale.y = g.userscale;

    // fox.trace(g.screenwid+' x '+g.screenhei);
    // fox.trace('Dimension: '+g.screenwid+'x'+g.screenhei+' Userscale:'+g.userscale.toFixed(2)+' Ratio:'+g.ratio);

    // resize scene components
    if (g[g.scenename]) g[g.scenename].resize();
}
