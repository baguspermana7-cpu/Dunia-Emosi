
(function _main(){

    var Main=function()
    {
        this.Container_constructor();

        this.initialize();

    };

    var _main = c.extend(Main, c.Container);
    _main.initialize=function() {


    };


    _main.init=function()
    {
        initStage();
        loadGFX();
    };
    _main.resize=function(){

        var w = globals.ow, h = globals.oh;

        var iw =window.innerWidth, ih=window.innerHeight;
        main.isPanoramic = (w / h) > 1.75;
        pRatio = window.devicePixelRatio || 1
        var xRatio=iw/w, yRatio=ih/h
        sRatio=1;
        sRatio = Math.min(xRatio, yRatio);  /* v-fix: FIT (was yRatio = height-controls-width overflow) */
        canvas.width = w * pRatio * sRatio;
        canvas.height = h * pRatio * sRatio;
        this.nWidth = stage.canvas.width;
        this.nHeight = stage.canvas.height;
        canvas.style.width = w * sRatio + 'px';
        canvas.style.height = h * sRatio + 'px';
        animation_container.style.width = w * sRatio + 'px';
        animation_container.style.height = h * sRatio + 'px';


        overlay_container.style.width = w * sRatio + 'px';
        overlay_container.style.height = h * sRatio + 'px';
        stage.scale = pRatio*sRatio;

        globals.scaleS= pRatio*sRatio;

        if (gfxLib.pageContainer){
            if(iw< ( w * sRatio)) {
                if(gfxLib.logoCN)gfxLib.logoCN.x = iw/sRatio - 140;
                gfxLib.pageContainer.x = (iw/sRatio)/2-(globals.ow/2)
                if(gfxLib.soundBtt)gfxLib.soundBtt.x = iw/sRatio -125;
                if(gfxLib.pauseBtt)gfxLib.pauseBtt.x = gfxLib.homeBtt.x+125
                if(gfxLib.pause)  gfxLib.pause.x =   gfxLib.pageContainer.x;
            }else{
                if(gfxLib.soundBtt)gfxLib.soundBtt.x =globals.ow -125
                gfxLib.pageContainer.x=0;
                if(gfxLib.homeBtt)gfxLib.homeBtt.x = gfxLib.pauseBtt.x =gfxLib.pageContainer.x+ 20;
                if(gfxLib.pauseBtt)gfxLib.pauseBtt.x = gfxLib.homeBtt.x+125
                if(gfxLib.logoCN)gfxLib.logoCN.x = globals.ow -140;
            }


        }


        stage.tickOnUpdate = false;
        stage.update();
        stage.tickOnUpdate = true;


    };
    const initStage=()=>
    {
        var canvas=document.getElementById('stage-canvas');
        _main.context=canvas.getContext('2d',{willReadFrequently: true});

        stage = new c.Stage(canvas);
        c.Ticker.timingMode=c.Ticker.RAF_SYNCHED;
        c.Ticker.framerate = 35;
        if (!c.Sound.initializeDefaultPlugins()) {return;}
        stage.enableMouseOver(30);
        c.Touch.enable(stage);
        c.Ticker.addEventListener('tick', stage);
        gfxLib.pageContainer=new c.Container();
        stage.addChildAt(gfxLib.pageContainer,0);


        _main.resize();
    }
    const addGlobalElements=()=>
    {
        // transition elements
        gfxLib.logoCN = new  c.Bitmap(main.loadedData.getResult('logo_cn'))
        stage.addChild(gfxLib.logoCN);
        gfxLib.logoCN.x = 1325;

        gfxLib.logoCN.y=563;

        gfxLib.homeBtt = new  FrameBtt(main.loadedData.getResult('homebtt'),main.loadedData.getResult('homebtt_on'),'#ffed00');
        stage.addChild(gfxLib.homeBtt);
        gfxLib.homeBtt.addEventListener('click',onHome);
        gfxLib.homeBtt.x=0;
        gfxLib.homeBtt.y=20;
        gfxLib.homeBtt.disable(gfxLib.homeBtt);

        gfxLib.pauseBtt = new  FrameBtt(main.loadedData.getResult('pausebtt'),main.loadedData.getResult('pausebtt_on'),'#ffed00');
        stage.addChild(gfxLib.pauseBtt);
        gfxLib.pauseBtt.addEventListener('click',pauseAll);
        gfxLib.pauseBtt.x=119;
        gfxLib.pauseBtt.y=20;
    //    gfxLib.pauseBtt.visible=false;

        gfxLib.soundBtt = new  OnOffBtt(main.loadedData.getResult('soundbtt_on'),'',main.loadedData.getResult('soundbtt'));
        stage.addChild(gfxLib.soundBtt);
        gfxLib.soundBtt.cursor ='pointer';
        gfxLib.soundBtt.x =globals.ow;
        gfxLib.soundBtt.y=20;



        gfxLib.transition = new c.Bitmap(main.loadedData.getResult('transition'));
        gfxLib.transition.regX = gfxLib.transition.image.width/2;
        gfxLib.transition.regY = gfxLib.transition.image.height/2;
        gfxLib.transition.x = globals.ow/2;
        gfxLib.transition.y = globals.oh/2;

        _main.resize();
    }

    const transIn=(_className)=>{
        gfxLib.transition.scaleX=gfxLib.transition.scaleY=0;
        gfxLib.pageContainer.addChild(gfxLib.transition);
        gsap.to(gfxLib.transition,{duration:.5,scaleX:5,scaleY:5,ease:Power1.easeInOut,onComplete:transInComplete,onCompleteParams:[_className]})

    }
    const transInComplete=(_className)=>{
        let temp = new _className()
        changeScreen(temp);
        gsap.to(gfxLib.transition,{duration:.5,scaleX:0,scaleY:0,ease:Power1.easeInOut,onComplete:transOutComplete})
    }
    function onHome(){
        c.Sound.stop();
        gfxLib.actualPage.dispatchStep1();
        
    }

    const transOutComplete=()=>{
        gfxLib.pageContainer.removeChild(gfxLib.transition);
        gfxLib.actualPage.init();
    }
    function loadGFX() {
        var pre = new Preloader();
        globals.preloader = true;
        gfxLib.pageContainer.addChild(pre);
        pre.addEventListener('completed', onLoaderComplete);

    }
    function onLoaderComplete(e){

        _main.loadedData= e.target.queue;

        addGlobalElements();

        transIn(Step1);
    //    var step1=new Step1();
      //  changeScreen(step1);
        //gfxLib.actualPage.init();
    }

    function changeScreen(e){
        if(gfxLib.actualPage)

        {
            gfxLib.actualPage.mouseEnabled = false;
            _main.clear(gfxLib.actualPage);
        }
        gfxLib.actualPage=e;
        gfxLib.pageContainer.addChildAt(e,0);
        gfxLib.actualPage.addEventListener('changePage',onScreenChange);
        gfxLib.actualPage.addChild(gfxLib.transition);
    }

    function  onScreenChange(e)
    {
        gfxLib.homeBtt.disable(gfxLib.homeBtt);
        e.preventDefault=true;
        transIn(e.param);


    }
    _main.clear=function(_pageToClear)
    {

        while(_pageToClear.numChildren)
        {
            if(typeof _pageToClear.getChildAt(0).removeAllChildren=== 'function')
            {
                _pageToClear.getChildAt(0).removeAllChildren();
            }
            if(_pageToClear.getChildAt(0).htmlElement!==undefined)
            {
                _pageToClear.getChildAt(0).htmlElement.parentNode.removeChild(_pageToClear.getChildAt(0).htmlElement);
            }
            _pageToClear.removeChildAt(0);
        }
        _pageToClear.parent.removeChild(_main);
    }
    window.Main = c.promote(Main, "Container");
}());

