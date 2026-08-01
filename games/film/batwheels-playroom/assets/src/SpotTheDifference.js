
(function()
{
    'use strict';
    var t;
    var txt;
    let small_l,title,logo,bgd;
    var ilosc = [
        [6,[{x:64,y:316},{x:237,y:80},{x:25,y:50},{x:401,y:271},{x:116,y:228},{x:378,y:8}]],
        [7,[{x:205,y:132},{x:6,y:256},{x:414,y:231},{x:93,y:132},{x:6,y:7},{x:181,y:364},{x:212,y:24}]],
        [7,[{x:9,y:148},{x:9,y:46},{x:146,y:186},{x:269,y:308},{x:181,y:363},{x:428,y:28},{x:254,y:56}]],
        [6,[{x:25,y:279},{x:7,y:87},{x:350,y:193},{x:218,y:375},{x:195,y:241},{x:384,y:351}]],
        [7,[{x:209,y:335},{x:22,y:304},{x:348,y:341},{x:141,y:251},{x:245,y:179},{x:124,y:55},{x:394,y:33}]],
        [7,[{x:298,y:61},{x:428,y:11},{x:365,y:300},{x:258,y:253},{x:135,y:107},{x:78,y:284},{x:31,y:19}]],
       ];
    let img1,img2,btt1,container;
    var finded=0;

    var nCurrentClick=0;


    var SpotTheDifference=function()
    {
        this.Container_constructor();
        t = this;
        this.initialize();
    };
    var p = c.extend(SpotTheDifference, c.Container);
    p.initialize=function() {

        finded=0;
         bgd = new c.Bitmap(main.loadedData.getResult('spotthedifference/bgd_spotthedifference'));

        t.addChildAt(bgd,0);
        //globals.spotthedifference.nCurrentLevel=0;//Math.floor(Math.random()*6);

         small_l = new c.Bitmap(main.loadedData.getResult('logo_cartoonito'));
        small_l.x = 1920;
        small_l.y = 702;
        small_l.scaleX = small_l.scaleY = 0.7;


         title = new c.Bitmap(main.loadedData.getResult('spotthedifference/title'));
        title.x = 586;
        title.y = 26;


         logo = new c.Bitmap(main.loadedData.getResult('logo_batwheels'));
        logo.scaleX = 0.77;
        logo.scaleY = 0.77;
        logo.x = 1106;
        logo.y = 14;



        btt1 = new  FrameBtt(main.loadedData.getResult('nextbutton'),main.loadedData.getResult('nextbutton_on'),'#d7127a');
        btt1.setTransform(1302,598);

        btt1.addEventListener('click',onNext);

        txt = new c.Text(finded+'/'+ilosc[globals.spotthedifference.nCurrentLevel][0], '120px linotte-semibolduploaded_file', '#ed1b98');
        txt.lineWidth =globals.ow;
        txt.textAlign='center';
        txt.x = txt.lineWidth/2;
        txt.y = 600;


        addImages();
    };


    p.init=()=>{

        gfxLib.homeBtt.enable(gfxLib.homeBtt);
        t.addChild(small_l);
        t.addChild(title);
        t.addChild(logo);
        t.addChild(btt1);
        t.addChild(txt);
        t.addChild(img1);
        t.addChild(img2);
        gsap.from(title, .5, {x: -600, ease: Strong.easeOut});
        gsap.from(logo, .5, {x: 1920, delay:.3,ease: Strong.easeOut});
        gsap.to(small_l, .5, {x: 479, delay: .5, ease: Strong.easeOut});
        gsap.from(txt, .5, {y:800, delay: .8, ease: Strong.easeOut});
        gsap.from(btt1, .5, {y:900, delay: 1, ease: Strong.easeOut});
        gsap.from(img1, .5, {x:-600, delay: 1, ease: Strong.easeOut});
        gsap.from(img2, .5, {x:1920, delay: 1, ease: Strong.easeOut});
    }

    const addImages=()=>{
        img1 = new c.Container();
        let b = new c.Bitmap(main.loadedData.getResult('spotthedifference/'+globals.spotthedifference.nCurrentLevel+'_1'));
        img1.addChild(b);
        b.addEventListener('click',onClickBad)

        img1.x=456;
        img1.y=133;
        img1.name ='i1'

        img2 = new c.Container();
         b = new c.Bitmap(main.loadedData.getResult('spotthedifference/'+globals.spotthedifference.nCurrentLevel+'_2'));
        img2.addChild(b);
        b.addEventListener('click',onClickBad)
        img2.x=961;
        img2.y=133;
        img2.name = 'i2';

        for (var i=0;i<ilosc[globals.spotthedifference.nCurrentLevel][0];i++){

            let b = new c.Bitmap(main.loadedData.getResult('spotthedifference/'+globals.spotthedifference.nCurrentLevel+'_'+parseInt(i+3)));
            let bb = b.clone();
            b.alpha = bb.alpha = 0.01;
            b.x =bb.x = ilosc[globals.spotthedifference.nCurrentLevel][1][i].x;
            b.y =bb.y = ilosc[globals.spotthedifference.nCurrentLevel][1][i].y;
            img1.addChild(b);
            b.name = bb.name ='s'+i;
            img2.addChild(bb);
            bb.addEventListener('click',onClickDiff)
            b.addEventListener('click',onClickDiff)
        }
    }
    const onClickBad=()=>{
        playSounds('spot-the-diff-incorrect-click');
    }
    const onClickDiff=(e)=>{
        playSounds('spot-the-diff-correct-click');
        e.preventDefault()
        img1.getChildByName('s'+e.currentTarget.name.substr(1)).visible= false;
        img2.getChildByName('s'+e.currentTarget.name.substr(1)).visible= false;
        let dot = new c.Bitmap(main.loadedData.getResult('spotthedifference/dot'));
        dot.regX = dot.image.width/2;
        dot.regY = dot.image.height/2;
        let dot2 = dot.clone();
        dot.x =dot2.x =e.currentTarget.x +e.currentTarget.image.width/2;
        dot.y =dot2.y =e.currentTarget.y +e.currentTarget.image.height/2;
        img1.addChild(dot);
        img2.addChild(dot2);

            gsap.from(dot,{scaleX:2,scaleY:2})
            gsap.from(dot2,{scaleX:2,scaleY:2})
        finded++;
        txt.text = finded+'/'+ilosc[globals.spotthedifference.nCurrentLevel][0];
        if(finded===ilosc[globals.spotthedifference.nCurrentLevel][0]){
            onNext();
        }

    }
    p.dispatchStep1 = function(){

        gsap.globalTimeline.pause().clear().resume();
        t.dispatchEvent({param: Step1, type:'changePage',bubbles:true,cancelable:true});
    };

    function startSpotTheDifference(){
        container.mouseEnabled = true;
    }




    const onNext=()=>{
        playSounds('level_success'+Math.ceil(Math.random()*8));
        t.mouseEnabled=false;
        gsap.to(btt1, .5, {y:900, delay: 1, ease: Strong.easeOut});
        gsap.to(title, .5, {x: -600, ease: Strong.easeOut});
        gsap.to(logo, .5, {x: 1920, delay:.3,ease: Strong.easeOut});
        gsap.to(small_l, .5, {x: -500, delay: .5, ease: Strong.easeOut});
        gsap.to(txt, .5, {y:800, delay: .8, ease: Strong.easeOut});

        gsap.to(img1, .5, {x:-600, delay: 1, ease: Strong.easeOut});
        gsap.to(img2, .5, {x:1920, delay: 1, ease: Strong.easeOut,onComplete:dispatchNext});

    }



    const dispatchNext=()=>{
        t.dispatchEvent({param: przelaczNext() , type:'changePage',bubbles:true,cancelable:true});
    }


    p.pauseGame = function(){



    };

    p.resumeGame = function(){


    }

window.SpotTheDifference= c.promote(SpotTheDifference, "Container");
}());
