
(function()
{
    'use strict';
    var t;
    var available =[0,1];
    var current=0;
    let btt1,container,bgd

    var img,panel,logo,title,small_l
    let ok;
    let aCategories;

    var MatchTheShadow=function()
    {
        this.Container_constructor();
        t = this;
        this.initialize();
    };
    var p= c.extend(MatchTheShadow, c.Container);
    p.initialize=function() {
        current=0;
        aCategories = globals.matchtheshadow.categories;
         bgd = new c.Bitmap(main.loadedData.getResult('matchtheshadow/bgd_matchtheshadow'));

        t.addChildAt(bgd,0);
      //  globals.matchtheshadow.nCurrentLevel=0;//Math.floor(Math.random()*6);

         small_l = new c.Bitmap(main.loadedData.getResult('logo_cartoonito'));
        small_l.x = 1920;
        small_l.y = 702;
        small_l.scaleX = small_l.scaleY = 0.7;


        title = new c.Bitmap(main.loadedData.getResult('matchtheshadow/title'));
        title.x = 586;
        title.y = 26;


         logo = new c.Bitmap(main.loadedData.getResult('logo_batwheels'));
        logo.scaleX = 0.77;
        logo.scaleY = 0.77;
        logo.x = 1106;
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

        panel = new c.Container()
        panel.x = -500;
        panel.y=145;

         let pan = new c.Bitmap(main.loadedData.getResult('matchtheshadow/panel'));
        panel.addChild(pan)


        container = new c.Container();
        container.alpha = 0;
        addAll();
    };

    p.init=()=>{


        t.addChild(panel);

        gfxLib.homeBtt.enable(gfxLib.homeBtt);
        t.addChild(small_l);
        t.addChild(logo);
        t.addChild(title);
        t.addChild(btt1);
        t.addChild(ok);
        t.addChild(container);
        gsap.to(container, 2, {alpha:1, delay: .6, ease: Strong.easeOut});
        gsap.to(panel, 2, {x:465, delay: .6, ease: Strong.easeOut});
        gsap.from(title, .5, {x: -500, ease: Strong.easeOut});
        gsap.from(logo, .5, {x: 1920, delay:.3,ease: Strong.easeOut});
        gsap.to(small_l, .5, {x: 479, delay: .5, ease: Strong.easeOut});
        gsap.from(btt1, .5, {x: 1920, delay: .5, ease: Strong.easeOut});


    }


    const onNext=()=>{
        playSounds('level_success'+Math.ceil(Math.random()*8));
        t.mouseEnabled=false;
        gsap.to(container, 1, {alpha:0,  ease: Strong.easeOut,onComplete:dispatchNext});
        gsap.to(panel, 1, {x:-400,  ease: Strong.easeOut});
        gsap.to(title, .5, {x: -500, ease: Strong.easeOut});
        gsap.to(logo, .5, {x: 1920, delay:.3,ease: Strong.easeOut});
        gsap.to(small_l, .5, {x: 1920, delay: .5, ease: Strong.easeOut});
        gsap.to(btt1, .5, {x: 1920, delay: .5, ease: Strong.easeOut});
    }
    const dispatchNext=()=>{
        t.dispatchEvent({param: przelaczNext() , type:'changePage',bubbles:true,cancelable:true});
    }
    const addAll=()=>{



        img = new c.Bitmap(main.loadedData.getResult('matchtheshadow/s'+aCategories[globals.matchtheshadow.nCurrentLevel][2]));
        img.x = aCategories[globals.matchtheshadow.nCurrentLevel][0];
        img.y = aCategories[globals.matchtheshadow.nCurrentLevel][1];


        let selectedItems =[];

        let tempArray = aCategories.slice(0);

        selectedItems.push(tempArray.splice(globals.matchtheshadow.nCurrentLevel,1)[0]);
        shuffle2(tempArray);
        selectedItems.push(tempArray.splice(0,1)[0])
        selectedItems.push(tempArray.splice(0,1)[0])
        container.addChild(img);
        t.addChildAt(container,1);
        shuffle2(selectedItems);

        let i;
        let mini
        for ( i=0;i<3;i++){
            mini = new c.Bitmap(main.loadedData.getResult('matchtheshadow/a'+selectedItems[i][2]));
            mini.regX = (mini.image.width)/2;
            mini.regY = (mini.image.height)/2;
            let size = 0.18
            let nX=71;
            let nY = 110;
            let nSpace = 155;
            mini.scaleX=  mini.scaleY = size;
            mini.x = nX;
            mini.y= nY+(i*nSpace);
            panel.addChild(mini);
            mini.cursor='pointer';
            mini.addEventListener('click',onCheckShadow);
        }


    }
    function onCheckShadow(e){
        let s1 = e.currentTarget.image.src.toString();
        let s2 = img.image.src.toString();
        console.log(s1.substr(s1.lastIndexOf('/')+2))
        if(s1.substr(s1.lastIndexOf('/')+2) === s2.substr(s2.lastIndexOf('/')+2)){

            playSounds('match-the-shadows-correct');
            t.mouseEnabled=false;

            container.removeChild(img)
            img = new c.Bitmap(main.loadedData.getResult('matchtheshadow/a'+aCategories[globals.matchtheshadow.nCurrentLevel][2]));
            img.x = aCategories[globals.matchtheshadow.nCurrentLevel][0];
            img.y = aCategories[globals.matchtheshadow.nCurrentLevel][1];
            gsap.from(img,.6,{alpha:0});
            container.addChild(img)
            gsap.delayedCall(2,restartMe);

        }else{

            shake(e.currentTarget)
            playSounds('match-the-shadows-incorrect');
        }
    }



    const restartMe=()=>{
        globals.matchtheshadow.nCurrentLevel++;
        if(++current<=2){
            container.removeChild(img);
            panel.removeChildAt(1);
            panel.removeChildAt(1);
            panel.removeChildAt(1);
            addAll();
        }else{

            onNext();
        //    t.dispatchEvent({param: GameOver, type:'changePage',bubbles:true,cancelable:true});

        }

        t.mouseEnabled=true;

    }
    function shake(item){
        gsap.to(item,.1,{rotation:-15})
        gsap.to(item,.1,{delay:.1,yoyo:true,repeat:5,rotation:15});
        gsap.to(item,.1,{delay:.6,rotation:0});
    }

    p.dispatchStep1 = function(){

        gsap.globalTimeline.pause().clear().resume();
        t.dispatchEvent({param: Step1, type:'changePage',bubbles:true,cancelable:true});
    };








    p.pauseGame = function(){



    };

    p.resumeGame = function(){


    }
    window.MatchTheShadow= c.promote(MatchTheShadow, "Container");


}());
