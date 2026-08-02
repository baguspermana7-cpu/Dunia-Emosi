
(function(){

    'use strict';
    var t;
    var bgd,cartoonito,maska;
    var pasek;
    var Preloader=function(_manifest){

        this.manifest=_manifest;
        this.initialize();
    };
    var p = Preloader.prototype = new c.Container();

    p.initialize=function()
    {
        t=this;
        t.children=null;
        t.children=[];
        //if (!c.Sound.initializeDefaultPlugins()) {return;}
		
		
		      var sounds = [
			  
            {id:'empty', src:'sounds/empty.mp3'},
            {id:'ok', src:'sounds/click.mp3'},
            {id:'throw', src:'sounds/memory_rollover.mp3'},
            {id:'success1', src:'sounds/success1.mp3'},
            {id:'success2', src:'sounds/success2.mp3'},
            {id:'success3', src:'sounds/success3.mp3'},
            {id:'success4', src:'sounds/success4.mp3'},
            {id:'start', src:'sounds/start.mp3'},
            {id:'intro', src:'sounds/intro.mp3'}

        ];


        var anim = {
            "framerate":24,
            "images":["img/preloader.png"],
            "frames":[
                [0, 1218, 629, 139, 0, 0, -130],
                [1258, 1036, 629, 139, 0, 0, -130],
                [629, 1218, 629, 113, 0, 0, -158],
                [0, 1357, 629, 100, 0, 0, -171],
                [1258, 1218, 629, 100, 0, 0, -171],
                [629, 1357, 629, 99, 0, 0, -171],
                [629, 1036, 629, 147, 0, 0, -78],
                [629, 834, 629, 195, 0, 0, -30],
                [1258, 333, 629, 223, 0, 0, -2],
                [0, 615, 629, 219, 0, 0, -6],
                [629, 0, 629, 319, 0, 0, -14],
                [629, 615, 629, 216, 0, 0, -9],
                [0, 0, 629, 333, 0, 0, 0],
                [1258, 0, 629, 301, 0, 0, -32],
                [0, 333, 629, 282, 0, 0, -51],
                [629, 333, 629, 234, 0, 0, -99],
                [0, 1036, 629, 182, 0, 0, -151],
                [1258, 834, 629, 194, 0, 0, -139],
                [1258, 615, 629, 206, 0, 0, -127],
                [0, 834, 629, 202, 0, 0, -130]
            ],
            "animations":{}
        };


        var spriteSheet = new c.SpriteSheet(anim);

        cartoonito = new c.Sprite(spriteSheet);

        cartoonito.x = globals.ow/2-(629/2);
        cartoonito.y = globals.oh/2-(333/2);

        t.addChild(cartoonito);
        cartoonito.play();
        c.Sound.registerSounds(sounds);




        pasek = new c.Shape(new c.Graphics().f('#dc358b').drawRoundRectComplex(661,510,314,45,20,20,20,20));
        t.addChild(pasek);

        maska = new c.Shape(new c.Graphics().f('#ff0000').drawRect(0,0,314,45));
        maska.x = 661;
        maska.y = 510;
        t.addChild(maska);
        maska.scaleX = 0;
        pasek.mask=maska;
        maska.visible = false;

        t.queue=new c.LoadQueue(false);
        t.queue.addEventListener('complete', onComplete);
        t.queue.addEventListener('progress', onProgress);
        t.queue.installPlugin(c.Sound);

        t.queue.loadManifest(t.manifest,true);
    }

    function onProgress(e)
    {
        maska.scaleX = e.loaded;

    }
    function onComplete(e)
    {
        gsap.to(t,1,{alpha:0,onComplete:disp});

        //   setTimeout(disp,1000);
    }
    function disp(){
        clear();
    }

    function clear()
    {
        t.dispatchEvent('completed');

        while(t.numChildren)
        {
            if(typeof t.getChildAt(0).removeAllChildren=== 'function')
            {
                t.getChildAt(0).removeAllChildren();
            }
            t.removeChildAt(0);
        }
        if(t.parent)
        {
            t.parent.removeChild(t);
        }
    }
    window.Preloader = Preloader;
}());