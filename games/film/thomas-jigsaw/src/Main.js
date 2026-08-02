var actualPage;
var w,h,homeBtt,soundBtt,pageContainer,legal;
(function(){
    'use strict';

    var t;

    var manifest;

    var _main=function()
    {

    };

    _main.initialize=function() {


    };
    var Main=function()
    {
        
        this.initialize();
        t = this;
        this.mode =1;

        this.nWidth;
        this.nHeight;
        this.context;

        this.isPanoramic=false;
        this.animationInterval;
        t=this;
    };

    _main=Main.prototype=new c.Container();

    _main.init=function()
    {
        initStage();
        loadGFX();
    };
    _main.resize=function(){


        w = $('.home').width();
        h = $('.home').height();
        if((w/h)>1.75){
            main.isPanoramic=true;

        }else{
            main.isPanoramic=false;
        }

        if(stage) {
            globals.scaleS = h / globals.oh;
            stage.scale = globals.scaleS;
            stage.canvas.width = w;
            stage.canvas.height =globals.oh * globals.scaleS;
            // this.nWidth - taka jest szerokosc canvasa zachowujac proporcje wysokosci. iinymi slowy 1640*skala
            this.nWidth = stage.canvas.width;
            this.nHeight = stage.canvas.height;

            if (pageContainer){

                pageContainer.x = -(globals.ow / 2) + ((w / globals.scaleS) / 2);
                if((w/globals.scaleS)<=globals.ow) {
                    if(soundBtt)soundBtt.x = (w / globals.scaleS) - 111;
                    if (legal)legal.x = w / globals.scaleS - 160;
                }else{

                    if(legal)legal.x =(w / globals.scaleS)/2+(globals.ow/2) - 160;
                    if(soundBtt)soundBtt.x =(w / globals.scaleS)/2+(globals.ow/2) - 111;
                    if(homeBtt)homeBtt.x = pageContainer.x+ 50;

                }
            }
            stage.update();



        }

    };
    function onResize(){

        _main.resize();
    }
    function onOrientationChange(){
        _main.resize();

    }
    function initStage()
    {
        var canvas=document.getElementById('stage-canvas');
        _main.context=canvas.getContext('2d');
        _main.context.imageSmoothingEnabled = true;
        _main.context.imageSmoothingQuality = 'high';
        stage = new c.Stage(canvas);

        c.Ticker.timingMode=c.Ticker.RAF_SYNCHED;
        c.Ticker.framerate = 35;
        if (!c.Sound.initializeDefaultPlugins()) {return;}
        stage.enableMouseOver(30);
        c.Touch.enable(stage);
        c.Ticker.addEventListener('tick', stage);

        pageContainer=new c.Container();

        stage.addChildAt(pageContainer,0);


    }
    function addGlobalElements()
    {

        homeBtt = new  FrameBtt(main.loadedData.getResult('home'),main.loadedData.getResult('home_on'),'#ffed00');
        stage.addChild(homeBtt);
        homeBtt.addEventListener('click',onHome);
        homeBtt.x=50;
        homeBtt.y=20;
        homeBtt.stateClicked=true;


        soundBtt = new  OnOffBtt(main.loadedData.getResult('sound_on'),'',main.loadedData.getResult('sound_off'),'Arial');

        stage.addChild(soundBtt);
        soundBtt.cursor ='pointer';
        soundBtt.x =_main.nWidth;
        soundBtt.y=20;

        _main.resize();


    }




    _main.onHelp = function(){

        helpAppla = new HelpAppla();

        stage.addChildAt(helpAppla,1);
        homeBtt.visible = false;
        soundBtt.visible  = false;
        helpAppla.addEventListener('closeHelp',onCloseHelp);

    }


    function onHome(){

        if(actualPage instanceof Step1){

        }else if(actualPage instanceof Game){
            actualPage.dispatchStep1();
        }else{
           actualPage.dispatchStep1();
        }
    }
    function onCloseHelp(e){
        helpAppla.removeEventListener('closeHelp',onCloseHelp);
        stage.removeChild(helpAppla);
        helpAppla = null;
        soundBtt.visible =true;
        homeBtt.visible = true;
        t.visible = true;
    }


    function loadGFX()
    {

         manifest=[

             {id:'bgd',src:'img/bgd_intro.png'},
             {id:'bgd_game1',src:'img/b1.png'},
             {id:'bgd_game2',src:'img/b2.png'},
             {id:'bgd_game3',src:'img/b3.png'},
             {id:'sound_on',src:'img/sound_on.png'},
             {id:'sound_off',src:'img/sound_off.png'},
             {id:'intro_logo',src:'img/intro_logo.png'},
             {id:'intro_logo_game',src:'img/intro_logo_game.png'},
             {id:'logo_cartoonito',src:'img/logo_cartoonito.png'},

             {id:'star',src:'img/star.png'},


             {id:'legal',src:'img/legal.png'},
             {id:'home',src:'img/home.png'},
             {id:'home_on',src:'img/home.png'},
             {id:'play_on',src:'img/play_on.png'},
             {id:'play_off',src:'img/play_off.png'},


             {id:'intro_c0',src:'img/intro_c0.png'},
             {id:'intro_c1',src:'img/intro_c1.png'},
             {id:'intro_c2',src:'img/intro_c2.png'},
             {id:'intro_bl',src:'img/intro_bl.png'},
             
             
             {id:'c0',src:'img/jigsaw/c0.png'},
             {id:'s0',src:'img/jigsaw/s0.png'},
             {id:'a0',src:'img/jigsaw/a0.png'},

             {id:'c1',src:'img/jigsaw/c1.png'},
             {id:'s1',src:'img/jigsaw/s1.png'},
             {id:'a1',src:'img/jigsaw/a1.png'},

             {id:'c2',src:'img/jigsaw/c2.png'},
             {id:'s2',src:'img/jigsaw/s2.png'},
             {id:'a2',src:'img/jigsaw/a2.png'},
             {id:'c3',src:'img/jigsaw/c3.png'},
             {id:'s3',src:'img/jigsaw/s3.png'},
             {id:'a3',src:'img/jigsaw/a3.png'},
             {id:'c4',src:'img/jigsaw/c4.png'},
             {id:'s4',src:'img/jigsaw/s4.png'},
             {id:'a4',src:'img/jigsaw/a4.png'},
             {id:'c5',src:'img/jigsaw/c5.png'},
             {id:'s5',src:'img/jigsaw/s5.png'},
             {id:'a5',src:'img/jigsaw/a5.png'},
             {id:'c6',src:'img/jigsaw/c6.png'},
             {id:'s6',src:'img/jigsaw/s6.png'},
             {id:'a6',src:'img/jigsaw/a6.png'},
             {id:'c7',src:'img/jigsaw/c7.png'},
             {id:'s7',src:'img/jigsaw/s7.png'},
             {id:'a7',src:'img/jigsaw/a7.png'},
             {id:'c8',src:'img/jigsaw/c8.png'},
             {id:'s8',src:'img/jigsaw/s8.png'},
             {id:'a8',src:'img/jigsaw/a8.png'},
             {id:'c9',src:'img/jigsaw/c9.png'},
             {id:'s9',src:'img/jigsaw/s9.png'},
             {id:'a9',src:'img/jigsaw/a9.png'},
             {id:'c10',src:'img/jigsaw/c10.png'},
             {id:'s10',src:'img/jigsaw/s10.png'},
             {id:'a10',src:'img/jigsaw/a10.png'},
             {id:'c11',src:'img/jigsaw/c11.png'},
             {id:'s11',src:'img/jigsaw/s11.png'},
             {id:'a11',src:'img/jigsaw/a11.png'},
             {id:'p0_1',src:'img/jigsaw/0_1.png'},
             {id:'p0_2',src:'img/jigsaw/0_2.png'},
             {id:'p0_3',src:'img/jigsaw/0_3.png'},
             {id:'p0_4',src:'img/jigsaw/0_4.png'},
             {id:'p0_5',src:'img/jigsaw/0_5.png'},
             {id:'p0_6',src:'img/jigsaw/0_6.png'},

             {id:'p1_1',src:'img/jigsaw/1_1.png'},
             {id:'p1_2',src:'img/jigsaw/1_2.png'},
             {id:'p1_3',src:'img/jigsaw/1_3.png'},
             {id:'p1_4',src:'img/jigsaw/1_4.png'},
             {id:'p1_5',src:'img/jigsaw/1_5.png'},
             {id:'p1_6',src:'img/jigsaw/1_6.png'},

             {id:'p2_1',src:'img/jigsaw/2_1.png'},
             {id:'p2_2',src:'img/jigsaw/2_2.png'},
             {id:'p2_3',src:'img/jigsaw/2_3.png'},
             {id:'p2_4',src:'img/jigsaw/2_4.png'},
             {id:'p2_5',src:'img/jigsaw/2_5.png'},
             {id:'p2_6',src:'img/jigsaw/2_6.png'},

             {id:'p3_1',src:'img/jigsaw/3_1.png'},
             {id:'p3_2',src:'img/jigsaw/3_2.png'},
             {id:'p3_3',src:'img/jigsaw/3_3.png'},
             {id:'p3_4',src:'img/jigsaw/3_4.png'},
             {id:'p3_5',src:'img/jigsaw/3_5.png'},
             {id:'p3_6',src:'img/jigsaw/3_6.png'},

             {id:'p4_1',src:'img/jigsaw/4_1.png'},
             {id:'p4_2',src:'img/jigsaw/4_2.png'},
             {id:'p4_3',src:'img/jigsaw/4_3.png'},
             {id:'p4_4',src:'img/jigsaw/4_4.png'},
             {id:'p4_5',src:'img/jigsaw/4_5.png'},
             {id:'p4_6',src:'img/jigsaw/4_6.png'},

             {id:'p5_1',src:'img/jigsaw/5_1.png'},
             {id:'p5_2',src:'img/jigsaw/5_2.png'},
             {id:'p5_3',src:'img/jigsaw/5_3.png'},
             {id:'p5_4',src:'img/jigsaw/5_4.png'},
             {id:'p5_5',src:'img/jigsaw/5_5.png'},
             {id:'p5_6',src:'img/jigsaw/5_6.png'},


             {id:'p6_1',src:'img/jigsaw/6_1.png'},
             {id:'p6_2',src:'img/jigsaw/6_2.png'},
             {id:'p6_3',src:'img/jigsaw/6_3.png'},
             {id:'p6_4',src:'img/jigsaw/6_4.png'},
             {id:'p6_5',src:'img/jigsaw/6_5.png'},
             {id:'p6_6',src:'img/jigsaw/6_6.png'},

             {id:'p7_1',src:'img/jigsaw/7_1.png'},
             {id:'p7_2',src:'img/jigsaw/7_2.png'},
             {id:'p7_3',src:'img/jigsaw/7_3.png'},
             {id:'p7_4',src:'img/jigsaw/7_4.png'},
             {id:'p7_5',src:'img/jigsaw/7_5.png'},
             {id:'p7_6',src:'img/jigsaw/7_6.png'},

             {id:'p8_1',src:'img/jigsaw/8_1.png'},
             {id:'p8_2',src:'img/jigsaw/8_2.png'},
             {id:'p8_3',src:'img/jigsaw/8_3.png'},
             {id:'p8_4',src:'img/jigsaw/8_4.png'},
             {id:'p8_5',src:'img/jigsaw/8_5.png'},
             {id:'p8_6',src:'img/jigsaw/8_6.png'},


             {id:'p9_1',src:'img/jigsaw/9_1.png'},
             {id:'p9_2',src:'img/jigsaw/9_2.png'},
             {id:'p9_3',src:'img/jigsaw/9_3.png'},
             {id:'p9_4',src:'img/jigsaw/9_4.png'},
             {id:'p9_5',src:'img/jigsaw/9_5.png'},
             {id:'p9_6',src:'img/jigsaw/9_6.png'},

             {id:'p10_1',src:'img/jigsaw/10_1.png'},
             {id:'p10_2',src:'img/jigsaw/10_2.png'},
             {id:'p10_3',src:'img/jigsaw/10_3.png'},
             {id:'p10_4',src:'img/jigsaw/10_4.png'},
             {id:'p10_5',src:'img/jigsaw/10_5.png'},
             {id:'p10_6',src:'img/jigsaw/10_6.png'},

             {id:'p11_1',src:'img/jigsaw/11_1.png'},
             {id:'p11_2',src:'img/jigsaw/11_2.png'},
             {id:'p11_3',src:'img/jigsaw/11_3.png'},
             {id:'p11_4',src:'img/jigsaw/11_4.png'},
             {id:'p11_5',src:'img/jigsaw/11_5.png'},
             {id:'p11_6',src:'img/jigsaw/11_6.png'}

             
             
             
             

        ];
        startLoading();
    }

    function startLoading(){
        var pre=new Preloader(manifest);
        pageContainer.addChild(pre);
        pre.addEventListener('completed',onLoaderComplete);
        _main.resize();


    }
    function onLoaderComplete(e){
        console.log('preloader_complete');
        t.loadedData= e.target.queue;

        addGlobalElements();
        var step1=new Step1();
        changeScreen(step1);
        window.addEventListener('orientationchange',onOrientationChange);
        window.addEventListener('resize',onResize);
    }
    function changeScreen(e){
        if(_main.animationInterval)clearIntervalI(_main.animationInterval);
        if(actualPage)
        {
            actualPage.mouseEnabled = false;
            clear(actualPage);
        }
        actualPage=e;
        pageContainer.addChild(e);
        actualPage.addEventListener('changePage',onScreenChange);
        _main.resize();
    }

    function  onScreenChange(e)
    {
        e.preventDefault=true;
        var page= new e.param();
        if(typeof page == 'object')
        {
            changeScreen(page);
        }
        else
        {
            console.log('error: class doesnt exist');
        }
    }
    function clear(ttt)
    {
        actualPage.alpha=1;
        while(ttt.numChildren)
        {
            if(typeof ttt.getChildAt(0).removeAllChildren=== 'function')
            {
                ttt.getChildAt(0).removeAllChildren();
            }
            if(ttt.getChildAt(0).htmlElement!=undefined)
            {

                ttt.getChildAt(0).htmlElement.parentNode.removeChild(ttt.getChildAt(0).htmlElement);
            }
            ttt.removeChildAt(0);
        }
        ttt.parent.removeChild(t);
    }
    window.Main=Main;
}());

