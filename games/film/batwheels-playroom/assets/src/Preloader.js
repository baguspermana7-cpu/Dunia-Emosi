let pasek,gfx,prel;
(function(){
    'use strict';
    var _preloader;
    var bgd,cartoonito,maska;
    function Preloader(){

        this.Container_constructor();
        this.initialize();
    }
    var preloader = c.extend(Preloader, c.Container);

    preloader.initialize=function()
    {
        _preloader=this;
        _preloader.children=null;
        _preloader.children=[];
        if (!c.Sound.initializeDefaultPlugins()) {return;}



        let i,j;
        let manifest =[];

        for ( i= 0; i<globals.gfx_assets.length;i++){
            let ss = globals.gfx_assets[i];
            let index;
            for ( j=0;j<globals.gfx_extensions.length;j++){
                if(ss.indexOf('.'+globals.gfx_extensions[j])>-1){
                    index = ss.indexOf('.'+globals.gfx_extensions[j]);
                }
            }
            ss = ss.substr(0,index);
            manifest.push({
                src:globals.assets_folder+globals.gfx_dir+globals.gfx_assets[i],
                id:ss
            })
        }
        let sounds =[];

        for ( i= 0; i<globals.sound_assets.length;i++){
            let ss = globals.sound_assets[i];
            let index;
            for ( j=0;j<globals.sound_extensions.length;j++){
                if(ss.indexOf('.'+globals.sound_extensions[j])>-1){
                    index = ss.indexOf('.'+globals.sound_extensions[j]);
                }
            }
            ss = ss.substr(0,index);
            sounds.push({
                src:globals.assets_folder+globals.sound_dir+globals.sound_assets[i],
                id:ss
            });
        }




        var anim = {
            "framerate":24,
            "images":["assets/img/preloader.png"],
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
        cartoonito.y = globals.oh/2-(433/2);
       _preloader.addChild(cartoonito);
        cartoonito.play();


        pasek = new c.Shape(new c.Graphics().f('#dc358b').drawRoundRectComplex(803,470,314,45,20,20,20,20));
        _preloader.addChild(pasek);

        maska = new c.Shape(new c.Graphics().f('#ff0000').drawRect(0,0,314,45));
        maska.x = 803;
        maska.y = 470;
        _preloader.addChild(maska);
        maska.scaleX = 0;
        pasek.mask=maska;
        maska.visible = false;
        c.Sound.registerSounds(sounds);
        _preloader.queue=new c.LoadQueue(false);
        _preloader.queue.addEventListener('complete', onComplete);
        _preloader.queue.addEventListener('progress', onProgress);
        _preloader.queue.loadManifest(manifest,true);


    }

    function onProgress(e)
    {

        maska.scaleX = e.loaded;


    }
    function onComplete(e)
    {
        gsap.to(_preloader,1,{alpha:0,onComplete:disp});
    }

    function disp(){
        clear();
    }

    function clear()
    {
        _preloader.dispatchEvent('completed');

        while(_preloader.numChildren)
        {
            if(typeof _preloader.getChildAt(0).removeAllChildren=== 'function')
            {
                _preloader.getChildAt(0).removeAllChildren();
            }
            _preloader.removeChildAt(0);
        }
        if(_preloader.parent)
        {
            _preloader.parent.removeChild(_preloader);
        }
    }
    window.Preloader = c.promote(Preloader, "Container");
}());