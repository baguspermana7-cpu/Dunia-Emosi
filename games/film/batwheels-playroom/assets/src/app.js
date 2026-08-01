if (createjs) {
    var c = createjs;
}
let activeConfig;

// Jigsaw,PuzzleSlider,MatchTheShadow,MatchingPairs,SpotTheDifference;
    var gfxLib = gfxLib || {}
    var canvas, animation_container, overlay_container;
    var lastW, lastH, lastS = 1, sRatio, pRatio;
    var sndLib = sndLib || {}
    let lib;
    let timer;
    var globals = globals || {
        classNames: ['Jigsaw','PuzzleSlider','MatchTheShadow','MatchingPairs','SpotTheDifference'],
        gameOrder:{},
        jigsaw:{},
        puzzleslider:{},
        matchingpairs:{},
        matchtheshadow:{
            categories:[[706,136,0],[695,237,1],[695,189,2],[663,144,3],[680,222,4],[790,173,5],[709,169,6],[667,133,7],[758,139,8],[702,151,9],[724,238,10],[751,182,11],[618,219,12],[799,132,13],[687,181,14],[828,138,15],[714,201,16],[803,141,17]]
        },

        spotthedifference:{},
        cookiename :'playroom_batwheels',
        level_config:[],
        debug: true,
        current: 1, 
        overwrite_score: 0,
        success: true,
        global_time_scale: 1,
        isGame: false,
        /*              please do not change anything below this line */
        preloader: false,
        ow: 1920,
        offsetX: 0,
        oh: 768,
        scaleS: 1,
        bSound: true,

        music: false,

        assets_folder: 'assets/',
        gfx_dir: 'img/',
        sound_dir: 'sounds/',
        gfx_extensions: ['jpg', 'png'],
        sound_extensions: ['mp3'],
        sound_assets:
            ["click.mp3","jigsaw-click.mp3","level_success1.mp3","level_success2.mp3","level_success3.mp3","level_success4.mp3","level_success5.mp3","level_success6.mp3","level_success7.mp3","level_success8.mp3","match-the-shadows-correct.mp3","match-the-shadows-incorrect.mp3","memory-click.mp3","memory-correct1.mp3","memory-correct2.mp3","memory-incorrect1.mp3","memory-incorrect2.mp3","memory-reveal.mp3","memory-rollover.mp3","memory-shuffle.mp3","memory-tap.mp3","memory-tap2.mp3","music.mp3","puzzle-slider-move.mp3","rollover.mp3","spot-the-diff-correct-click.mp3","spot-the-diff-incorrect-click.mp3"],
        gfx_assets:

            [
                //SPOT THE DIFFERENCE
                "spotthedifference/dot.png","spotthedifference/title.png","spotthedifference/bgd_spotthedifference.png","spotthedifference/0_8.png","spotthedifference/0_7.png","spotthedifference/0_6.png","spotthedifference/0_5.png","spotthedifference/0_4.png","spotthedifference/0_3.png","spotthedifference/0_2.png","spotthedifference/0_1.png","spotthedifference/5_9.png","spotthedifference/5_8.png","spotthedifference/5_7.png","spotthedifference/5_6.png","spotthedifference/5_5.png","spotthedifference/5_4.png","spotthedifference/5_3.png","spotthedifference/5_2.png","spotthedifference/5_1.png","spotthedifference/4_9.png","spotthedifference/4_8.png","spotthedifference/4_7.png","spotthedifference/4_6.png","spotthedifference/4_5.png","spotthedifference/4_4.png","spotthedifference/4_3.png","spotthedifference/4_2.png","spotthedifference/4_1.png","spotthedifference/3_8.png","spotthedifference/3_7.png","spotthedifference/3_6.png","spotthedifference/3_5.png","spotthedifference/3_4.png","spotthedifference/3_3.png","spotthedifference/3_2.png","spotthedifference/3_1.png","spotthedifference/2_9.png","spotthedifference/2_8.png","spotthedifference/2_7.png","spotthedifference/2_6.png","spotthedifference/2_5.png","spotthedifference/2_4.png","spotthedifference/2_3.png","spotthedifference/2_2.png","spotthedifference/2_1.png","spotthedifference/1_9.png","spotthedifference/1_8.png","spotthedifference/1_7.png","spotthedifference/1_6.png","spotthedifference/1_5.png","spotthedifference/1_4.png","spotthedifference/1_3.png","spotthedifference/1_2.png","spotthedifference/1_1.png",
                //matching pairs
                "matchingpairs/title.png", "matchingpairs/ok.png", "matchingpairs/blank.png", "matchingpairs/bgd_matchingpairs.png", "matchingpairs/9.png", "matchingpairs/8.png", "matchingpairs/7.png", "matchingpairs/6.png", "matchingpairs/5.png", "matchingpairs/4.png", "matchingpairs/3.png", "matchingpairs/2.png", "matchingpairs/1.png",
                //matchthe shadow

                "matchtheshadow/panel.png", "matchtheshadow/bgd_matchtheshadow.png", "matchtheshadow/title.png", "matchtheshadow/s17.png", "matchtheshadow/s16.png", "matchtheshadow/s15.png", "matchtheshadow/s14.png", "matchtheshadow/s13.png", "matchtheshadow/s12.png", "matchtheshadow/s11.png", "matchtheshadow/s10.png", "matchtheshadow/s9.png", "matchtheshadow/s8.png", "matchtheshadow/s7.png", "matchtheshadow/s6.png", "matchtheshadow/s5.png", "matchtheshadow/s4.png", "matchtheshadow/s3.png", "matchtheshadow/s2.png", "matchtheshadow/s1.png", "matchtheshadow/s0.png", "matchtheshadow/a17.png", "matchtheshadow/a16.png", "matchtheshadow/a15.png", "matchtheshadow/a14.png", "matchtheshadow/a13.png", "matchtheshadow/a12.png", "matchtheshadow/a11.png", "matchtheshadow/a10.png", "matchtheshadow/a9.png", "matchtheshadow/a8.png", "matchtheshadow/a7.png", "matchtheshadow/a6.png","matchtheshadow/a5.png", "matchtheshadow/a4.png", "matchtheshadow/a3.png", "matchtheshadow/a2.png", "matchtheshadow/a1.png", "matchtheshadow/a0.png",
                //puzzleslider
                "puzzleslider/0_6.png","puzzleslider/0_5.png","puzzleslider/0_4.png","puzzleslider/0_3.png","puzzleslider/0_2.png","puzzleslider/0_1.png","puzzleslider/5_6.png","puzzleslider/5_5.png","puzzleslider/5_4.png","puzzleslider/5_3.png","puzzleslider/5_2.png","puzzleslider/5_1.png","puzzleslider/4_6.png","puzzleslider/4_5.png","puzzleslider/4_4.png","puzzleslider/4_3.png","puzzleslider/4_2.png","puzzleslider/4_1.png","puzzleslider/3_6.png","puzzleslider/3_5.png","puzzleslider/3_4.png","puzzleslider/3_3.png","puzzleslider/3_2.png","puzzleslider/3_1.png","puzzleslider/2_1.png","puzzleslider/2_2.png","puzzleslider/2_3.png","puzzleslider/2_4.png","puzzleslider/2_5.png","puzzleslider/2_6.png","puzzleslider/1_6.png","puzzleslider/1_5.png","puzzleslider/1_4.png","puzzleslider/1_3.png","puzzleslider/1_2.png","puzzleslider/1_1.png","puzzleslider/glow.png","puzzleslider/bgd_puzzleslider.png","puzzleslider/title.png","puzzleslider/grid.png",
                //jigsaw
                "jigsaw/5_6.png","jigsaw/5_5.png","jigsaw/5_4.png","jigsaw/5_3.png","jigsaw/5_2.png","jigsaw/5_1.png", "jigsaw/4_6.png","jigsaw/4_5.png","jigsaw/4_4.png","jigsaw/4_3.png","jigsaw/4_2.png","jigsaw/4_1.png", "jigsaw/3_8.png","jigsaw/3_7.png", "jigsaw/3_6.png","jigsaw/3_5.png","jigsaw/3_4.png","jigsaw/3_3.png","jigsaw/3_2.png","jigsaw/3_1.png", "jigsaw/2_6.png","jigsaw/2_5.png","jigsaw/2_4.png","jigsaw/2_3.png","jigsaw/2_2.png","jigsaw/2_1.png","jigsaw/title.png","jigsaw/1_6.png","jigsaw/1_7.png","jigsaw/1_8.png","jigsaw/1_9.png","jigsaw/0_5.png","jigsaw/bgd_jigsaw.png" ,"jigsaw/1_1.png","jigsaw/1_2.png","jigsaw/1_3.png","jigsaw/1_4.png","jigsaw/1_5.png","jigsaw/bgd_jigsaw.png","jigsaw/s5.png","jigsaw/s4.png","jigsaw/s3.png","jigsaw/s2.png","jigsaw/s1.png","jigsaw/s0.png","jigsaw/c5.png","jigsaw/c4.png","jigsaw/c3.png","jigsaw/c2.png","jigsaw/c1.png","jigsaw/c0.png","jigsaw/a5.png","jigsaw/a4.png","jigsaw/a3.png","jigsaw/a2.png","jigsaw/a1.png","jigsaw/a0.png","jigsaw/0_1.png","jigsaw/0_2.png","jigsaw/0_3.png","jigsaw/0_4.png","jigsaw/0_5.png","jigsaw/bgd_jigsaw.png",
                // commons
                "nextbutton_on.png","nextbutton.png","humans.png","bgd_intro.png","cars.png","homebtt.png","logo_cartoonito.png","homebtt_on.png","logo_playroom.png","logo_batwheels.png","pausescreen.png","playbutton.png","playbutton_on.png","rotate_screen.png","soundbtt.png","soundbtt_on.png","transition.png"],



    };


var main;
    var stage;
    let $home
    if (document.addEventListener) {

        $(document).ready(function () {
            globals.isMobile = detectMobile();
            $home = $('.home');
            canvas = document.getElementById('stage-canvas');
            overlay_container = document.getElementById('dom_overlay_container');
            animation_container = document.getElementById('animation_container');
            window.addEventListener("orientationchange", resizeCanvas, false);
            window.addEventListener('resize', resizeCanvas, false);
            document.addEventListener(visibilityChange, handleVisibilityChange, false);

            main = new Main();
            //strings = game1;


            globals.gameOrder= createGameOrder();

            gsap.globalTimeline.timeScale(globals.global_time_scale)
            main.init();
            fixTextPos(main);
        });

    }
    const przelaczNext=()=>{
        if(globals.gameOrder.length<1){
            globals.gameOrder= createGameOrder();
        }
        let n = globals.gameOrder.shift();
        let nn =n.substr(0,n.indexOf('_'));
        console.log(nn.toLowerCase())
        globals[nn.toLowerCase()].nCurrentLevel=parseInt(n.substr(n.indexOf('_')+1));
        return window[nn];
        //return Jigsaw
    }
    const createGameOrder=()=>{

      ///shuffle2(globals.matchtheshadows.categories);
        let temp=[];
        for(var i=0;i<globals.classNames.length;i++){
            for (let j=0;j<6;j++){
                let gamenum = j;
                if(i===2){gamenum=j*3}

                if(i===3&&j>3){}else{
                temp.push(globals.classNames[i]+'_'+gamenum)
                }
            }
        }
        shuffle2(temp);
        return temp;
    }
    function handleVisibilityChange() {
        if (document[hidden]) {
            pauseAll();
        } else {
            resumeAll();
        }
    }

    function pauseAll() {

        if (!globals.isPaused) {
            if (gfxLib.actualPage) {
                gfxLib.actualPage.pauseGame();
            }

            c.Sound.volume = 0;
            globals.isPaused = true;
        }
    }

    function resumeAll() {

        if (stage.contains(gfxLib.pause)) {


        } else {

            if (gfxLib.actualPage) {
                gfxLib.actualPage.resumeGame();
            }
            c.Sound.volume = 1;
        }

        globals.isPaused = false;
    }

    function resizeCanvas() {
        main.resize();
    }



