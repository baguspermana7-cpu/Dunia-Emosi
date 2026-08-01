
(function()
{
    'use strict';
    var t;
    var btt1;
    var container;
    var available =[];
    var nMax;
    var nOffsetY=0;
    var nCurrent;
    var shadow,white;
    let title,logo,small_l,bgd


    var aPos=[    /* shadow   white     1                         2                   3           4           5                      6
     /*l_0*/   [[652,474],[652,210],[495,374,1062,242],[514,145,654,262],[761,588,650,376],[1035,560,851,208],[1164,170,820,345]],
     /*l_1*/   [[622,613],[613,184],[468,123,    783,356],[485,348,  1125,182],[472,572,926,550],[584,573,1125,358],[716,554,954,187],[1053,562, 783,197],[1151,502, 612,375],[1249,304, 621,210],[1279,130, 954,376]],
        /*l_2*/   [[808,518],[718,136],[477,136,849,329],[499,424,880,134],[771,559,716,359],[1094,533,753,179],[1271,359,1049,359],[1251,84,1019,151]],
        /*l_3*/   [[686,448],[684,188],[481,188,1059,371],[504,440,951,186],[700,567,924,371],[965,564,682,371],[1181,618,1071,303],[1094,132,789,344],[1252,410,790,217],[1322,164,698,200 ]],
        /*l_4*/   [[797,562],[789,232],[481,449,787,464],[533,126,871,438],[624,374,985,239],[1141,155,1011,464],[1156,444,804,230],[1303,268,897,240]],
        /*l_5*/   [[687,553],[706,319],[492,155,704,506],[496,420,1053,506],[722,114,1028,317],[968,147,875,349],[1201,115,849,480],[1258,368,717,329]]
        ];
    var ok;

    var Jigsaw=function()
    {
        this.Container_constructor();
        t = this;
        this.initialize();
    };
    var p= c.extend(Jigsaw, c.Container);
    p.initialize=function() {


         bgd = new c.Bitmap(main.loadedData.getResult('jigsaw/bgd_jigsaw'));
        t.addChildAt(bgd,0);

        //globals.jigsaw.nCurrentLevel=5;//Math.ceil(Math.random()*6);

         small_l = new c.Bitmap(main.loadedData.getResult('logo_cartoonito'));
        small_l.x = 1920;
        small_l.y = 702;
        small_l.scaleX = small_l.scaleY = 0.7;


         title = new c.Bitmap(main.loadedData.getResult('jigsaw/title'));
        title.x = 636;
        title.y = 26;


         logo = new c.Bitmap(main.loadedData.getResult('logo_batwheels'));
        logo.scaleX = 0.77;
        logo.scaleY = 0.77;
        logo.x = 1056;
        logo.y = 14;


        available =[0,1,2,3,4,5];





        ok = new c.Bitmap(main.loadedData.getResult('ok'));
        ok.regX = 137/2;
        ok.regY = 51;
        ok.x = -120;
        ok.y = 0;

        btt1 = new  FrameBtt(main.loadedData.getResult('nextbutton'),main.loadedData.getResult('nextbutton_on'),'#d7127a');
        btt1.setTransform(1302,598);
        btt1.addEventListener('click',onNext)

    };
    p.init=()=>{

        gfxLib.homeBtt.enable(gfxLib.homeBtt);
        rozlorz();
        t.addChild(small_l);
        t.addChild(logo);
        t.addChild(title);
        t.addChild(btt1);
        t.addChild(ok);
        gsap.from(title, .5, {x: -500, ease: Strong.easeOut});
        gsap.from(logo, .5, {x: 1920, delay:.3,ease: Strong.easeOut});
        gsap.to(small_l, .5, {x: 545, delay: .5, ease: Strong.easeOut});
        gsap.from(btt1, .5, {x: 1920, delay: .5, ease: Strong.easeOut});
        gsap.from(container, 2, {alpha:0, delay: .5, ease: Strong.easeOut});



    }
    const onNext=()=>{
        resetMe();

    }
    p.dispatchStep1 = function(){

        gsap.globalTimeline.pause().clear().resume();
        t.dispatchEvent({param: Step1, type:'changePage',bubbles:true,cancelable:true});
    };


    const rozlorz=()=>{
        // shuffle();
        container = new c.Container();
        t.addChild(container);

        //container.mouseEnabled = false;
        nCurrent=0;
        nMax = aPos[globals.jigsaw.nCurrentLevel].length;
        shadow = new c.Bitmap(main.loadedData.getResult('jigsaw/s'+globals.jigsaw.nCurrentLevel));
        shadow.x=  aPos[globals.jigsaw.nCurrentLevel][0][0];
        shadow.y=  aPos[globals.jigsaw.nCurrentLevel][0][1]+nOffsetY;

        white = new c.Bitmap(main.loadedData.getResult('jigsaw/c'+globals.jigsaw.nCurrentLevel));
        white.x=  aPos[globals.jigsaw.nCurrentLevel][1][0];
        white.y=  aPos[globals.jigsaw.nCurrentLevel][1][1]+nOffsetY;


        container.addChild(shadow,white);
        var item;
        var j;
        for(var i=2;i<nMax;i++){
            j=i-1;
            item = new c.Bitmap(main.loadedData.getResult('jigsaw/'+globals.jigsaw.nCurrentLevel+'_'+j));
            item.regX = item.image.width/2;
            item.regY = item.image.height/2;
            item.x = aPos[globals.jigsaw.nCurrentLevel][i][0]+item.regX;
            item.y = aPos[globals.jigsaw.nCurrentLevel][i][1]+item.regY+nOffsetY;
            item.cursor = 'pointer';
            item.name = 'i'+i;
            container.addChild(item);

            item.addEventListener('pressmove',onStartDrag);
            item.addEventListener('pressup',onStopDrag);
            item.addEventListener('click',onStopDrag);
        }
    }


    const onStopDrag=(e)=>{
        playSounds('jigsaw-click')
        var nI = e.currentTarget.name.substr(1);
        var nJ =e.currentTarget.name.substr(e.currentTarget.name.indexOf('_')+1);
        var regX =e.currentTarget.regX;
        var regY =e.currentTarget.regY;
        var nX = e.currentTarget.x;
        var nY = e.currentTarget.y;

        e.currentTarget.removeEventListener('pressmove',onStartDrag);
        e.currentTarget.removeEventListener('pressup',onStopDrag);
        e.currentTarget.removeEventListener('click',onStopDrag);
        e.currentTarget.cursor='default';

        var myRotation;


        if( Math.abs(nX-(aPos[globals.jigsaw.nCurrentLevel][nI][2]+regX)<50)&&( Math.abs(nY-(aPos[globals.jigsaw.nCurrentLevel][nI][3]+regY))<50)){
            myRotation=0;
        }else{
            myRotation=360;
        }

        nCurrent++;

        if(nCurrent===nMax-2){
            t.mouseEnabled=false;
            gsap.to(e.currentTarget,2,{rotation:myRotation,x:aPos[globals.jigsaw.nCurrentLevel][nI][2]+regX,y:aPos[globals.jigsaw.nCurrentLevel][nI][3]+regY+nOffsetY,onComplete:next,ease:Strong.easeOut});
        }else{

            gsap.to(e.currentTarget,2,{rotation:myRotation,x:aPos[globals.jigsaw.nCurrentLevel][nI][2]+regX,y:aPos[globals.jigsaw.nCurrentLevel][nI][3]+regY+nOffsetY,ease:Strong.easeOut});
        }

    }




    const next=()=>{

        container.removeChild(white);
        white = new c.Bitmap(main.loadedData.getResult('jigsaw/a'+globals.jigsaw.nCurrentLevel));
        white.x=  aPos[globals.jigsaw.nCurrentLevel][1][0];
        white.y=  aPos[globals.jigsaw.nCurrentLevel][1][1]+nOffsetY;
        container.addChild(white);
        for(var i=2;i<nMax;i++){
            container.removeChild(container.getChildByName('i'+i));
        }
      resetMe();
    }


    const onStartDrag=(e)=>{

        e.currentTarget.x = stage.mouseX/globals.scaleS-( gfxLib.pageContainer.x);
        e.currentTarget.y = stage.mouseY/globals.scaleS-( gfxLib.pageContainer.y);

    }

    const resetMe=()=>{
        playSounds('level_success'+Math.ceil(Math.random()*8));
        t.mouseEnabled=false;
        gsap.to(btt1, .5, {x: 1920, delay: .5, ease: Strong.easeOut});
        gsap.to(title, .5, {x: -500, ease: Strong.easeOut});
        gsap.to(logo, .5, {x: 1920, delay:.3,ease: Strong.easeOut});
        gsap.to(small_l, .5, {x: 1920, delay: .5, ease: Strong.easeOut});
        gsap.to(container, 1, {alpha:0, delay: .6, ease: Strong.easeOut,onComplete:dispatchNext});


    }


    const dispatchNext=()=>{
        t.dispatchEvent({param: przelaczNext() , type:'changePage',bubbles:true,cancelable:true});
    }

    const usun=()=>{
        ok.x = -120;

    }




    p.pauseGame = function(){



    };

    p.resumeGame = function(){


    }

    window.Jigsaw= c.promote(Jigsaw, "Container");

}());
