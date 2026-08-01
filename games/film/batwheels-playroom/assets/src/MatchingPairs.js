
(function()
{
    'use strict';
    var t;

    var available =[9,1,2,3,4,5,6,7,8];
    var current=0;
    let btt1,n1,n2,wybor,container,card,small_l,logo,title,bgd;
    var klikniecia=0;
    var pary=0;

    var jj = [3,3,3,4];

    let max=[10,12,16,18]
    var nPary=[5,6,8,9];
    var linie=[4,5,6,6];
    var nOdstepy=[[198,198],[199,199],[162,162],[162,156]];
    var nDelay=[0.35,0.20,0.11,0.08];
    var nStartXY= [[568,151],[470,151],[462,151],[462,128]];


    var ok;
    var ok2;

    var MatchingPairs=function()
    {
        this.Container_constructor();
        t = this;
        this.initialize();
    };
    var p= c.extend(MatchingPairs, c.Container);
    p.initialize=function() {

        current = 0;
         bgd = new c.Bitmap(main.loadedData.getResult('matchingpairs/bgd_matchingpairs'));

        t.addChildAt(bgd,0);
        //globals.matchingpairs.nCurrentLevel=Math.floor(Math.random()*4);

         small_l = new c.Bitmap(main.loadedData.getResult('logo_cartoonito'));
        small_l.x = 1920;
        small_l.y = 702;
        small_l.scaleX = small_l.scaleY = 0.7;

         title = new c.Bitmap(main.loadedData.getResult('matchingpairs/title'));
        title.x = 614;
        title.y = 26;


         logo = new c.Bitmap(main.loadedData.getResult('logo_batwheels'));
        logo.scaleX = 0.77;
        logo.scaleY = 0.77;
        logo.x = 1094;
        logo.y = 14;


        available =[0,1,2,3,4,5];


        

        ok = new c.Bitmap(main.loadedData.getResult('ok'));
        ok.regX = 137/2;
        ok.regY = 51;
        ok.x = -120;
        ok.y = 0;
        t.addChild(ok);
        btt1 = new  FrameBtt(main.loadedData.getResult('nextbutton'),main.loadedData.getResult('nextbutton_on'),'#d7127a');
        btt1.setTransform(1302,598);

        btt1.addEventListener('click',onNext);

        available =[9,1,2,3,4,5,6,7,8];
        pary = 0;
        klikniecia =0;



        ok = new c.Bitmap(main.loadedData.getResult('matchingpairs/ok'));
        ok2 = new c.Bitmap(main.loadedData.getResult('matchingpairs/ok'));

        ok.regX = 137/2;
        ok.regY = 51;
        ok.x = -120;
        ok.y = 0;


        ok2.regX = 137/2;
        ok2.regY = 51;
        ok2.x = -120;
        ok2.y = 0;


    };



    p.init=()=>{


        gfxLib.homeBtt.enable(gfxLib.homeBtt);
        t.addChild(small_l);
        t.addChild(logo);
        t.addChild(title);
        t.addChild(btt1);
        rozlorz();
        t.addChild(ok);
        t.addChild(ok2);


        gsap.to(container, 1, {alpha:1, delay: .6, ease: Strong.easeOut});
        gsap.from(title, .5, {x: -500, ease: Strong.easeOut});
        gsap.from(logo, .5, {x: 1920, delay:.3,ease: Strong.easeOut});
        gsap.to(small_l, .5, {x: 479, delay: .5, ease: Strong.easeOut});
        gsap.from(btt1, .5, {x: 1920, delay: .5, ease: Strong.easeOut});


    }



    const shuffle=()=>{
        wybor =[];
        var av = available;
        for(var i=0;i<nPary[globals.matchingpairs.nCurrentLevel];i++){
            wybor.push(av.splice(Math.floor(Math.random()*av.length),1)[0]);
        }
        wybor=wybor.concat(wybor);
        shuffle2(wybor);

    }
    const onNext=()=>{
        playSounds('level_success'+Math.ceil(Math.random()*8));
        t.mouseEnabled=false;
        gsap.to(container, .5, {alpha:0, ease: Strong.easeOut,onComplete:dispatchNext});

        gsap.to(title, .5, {x: -500, ease: Strong.easeOut});
        gsap.to(logo, .5, {x: 1920, delay:.3,ease: Strong.easeOut});
        gsap.to(small_l, .5, {x: 1920, delay: .5, ease: Strong.easeOut});
        gsap.to(btt1, .5, {x: 1920, delay: .5, ease: Strong.easeOut});
    }

    p.dispatchStep1 = function(){

        gsap.globalTimeline.pause().clear().resume();
        t.dispatchEvent({param: Step1, type:'changePage',bubbles:true,cancelable:true});
    };
    const rozlorz=()=>{
        playSounds('memory-shuffle');
        shuffle();

        container = new c.Container();
        t.addChild(container);
        container.mouseEnabled = false;
        var licznik=0;
        for(var i=0;i<jj[globals.matchingpairs.nCurrentLevel];i++){

            for(var j=0;j<linie[globals.matchingpairs.nCurrentLevel];j++){

                if((globals.matchingpairs.nCurrentLevel===0)&&((i===2&&j===0)||(i===2&&j===3))){

                }else if(globals.matchingpairs.nCurrentLevel===1&&((i===2&&j===0)||(i===2&&j===1)||(i===2&&j===4))){
                }else if(globals.matchingpairs.nCurrentLevel===2&&((i===2&&j===0)||(i===2&&j===5))){
                }else if(globals.matchingpairs.nCurrentLevel===3&&((i===0&&j===0)||(i===0&&j===5)||(i===3&&j===0)||(i===3&&j===1)||(i===3&&j===4)||(i===3&&j===5))){

                    //}else if(globals.matchingpairs.nCurrentLevel==3&&((i==0&&j==0)||(i==0&&j==5)||(i==3&&j==0)||(i==3&&j==5))){

                } else{
                    card = new Card(wybor[licznik]);

                    container.addChild(card);
                    card.alpha= 0;

                    card.x = nStartXY[globals.matchingpairs.nCurrentLevel][0]+j*nOdstepy[globals.matchingpairs.nCurrentLevel][0];

                    card.y=  nStartXY[globals.matchingpairs.nCurrentLevel][1]+i*nOdstepy[globals.matchingpairs.nCurrentLevel][1];

                    card.addEventListener('odw',klikniecie);
                    gsap.to(card,.4,{delay:licznik*nDelay[globals.matchingpairs.nCurrentLevel],onStart:playS,onComplete:checkoStart,onCompleteParams:[licznik],alpha:1});
                    licznik++;

                    if(globals.matchingpairs.nCurrentLevel===1&&((i===2&&j===2)||(i===2&&j===3))){
                        card.x -=nOdstepy[globals.matchingpairs.nCurrentLevel][0]/2;
                    }

                }
            }
        }
    }

    const dispatchNext=()=>{
        t.dispatchEvent({param: przelaczNext() , type:'changePage',bubbles:true,cancelable:true});
    }
    const checkoStart=(n)=>{

        if(n===max[globals.matchingpairs.nCurrentLevel]-1){
            startGame();
        }
    }
    const playS=(n)=>{
           playSounds('memory-tap'+Math.ceil(Math.random()*2));
    }

    function startGame(){
        container.mouseEnabled = true;
    }
    function usun(){
        ok.x = -120;
        ok2.x = -120;
    }
    const klikniecie=(e)=>{

        if(klikniecia===0){
            playSounds('memory-click');
            n1 = e.currentTarget;
        }else if(klikniecia===1){
            n2 = e.currentTarget;
            container.mouseEnabled = false;

            if(n1.number===n2.number){
                gsap.delayedCall(0.2,reset);
                playSounds('memory-correct'+Math.ceil(Math.random()*2));

                gsap.killTweensOf(ok);
                gsap.killTweensOf(ok2);

                ok.scaleX = ok.scaleY =1;
                ok.alpha = 1;
                ok.x = e.currentTarget.x+68;
                ok.y = e.currentTarget.y+68+container.y;
                gsap.to(ok,1,{scaleX:2,scaleY:2,alpha:0,onComplete:usun});


                ok2.scaleX = ok2.scaleY =1;
                ok2.alpha = 1;
                ok2.x = n1.x+68;
                ok2.y = n1.y+68+container.y;
                TweenLite.to(ok2,1,{scaleX:2,scaleY:2,alpha:0,onComplete:usun});
            }else{
                gsap.delayedCall(1,reset);
                playSounds('memory-incorrect'+Math.ceil(Math.random()*2));
            }
        }
        klikniecia++;
    }
    const reset=()=>{
        console.log(n1.number+":"+n2.number);
        if(n1.number===n2.number){
            n1.blokuj();
            n2.blokuj();
            pary++;
        }else{
            console.log('revert');
            n1.revert();
            n2.revert();
        }
        n1= null;
        n2= null;
        container.mouseEnabled = true;
        klikniecia=0;

        if(pary===nPary[globals.matchingpairs.nCurrentLevel]){
                onNext();
        }
    }


    p.pauseGame = function(){



    };

    p.resumeGame = function(){


    }


    window.MatchingPairs= c.promote(MatchingPairs, "Container");
}());
