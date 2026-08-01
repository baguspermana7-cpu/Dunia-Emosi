
(function _step1()
{
    'use strict';
    var t,bgd,logo3,logo2,btt1,logo1,p1,p2;
    let tl;

    var Step1=function()
    {

        this.Container_constructor();
        t = this;
        this.initialize();
        gfxLib.homeBtt.disable(gfxLib.homeBtt);
    };
    var p = c.extend(Step1, c.Container);
    p.initialize=function() {
        globals.level2points=globals.level1points=0;
        gfxLib.logoCN.visible = true;

        if(globals.music)globals.music.stop();
        globals.music=  c.Sound.play('music',{loop:-1});
        t.mouseEnabled=false;




        let ss =readCookie(globals.cookiename)
        if(ss===null){
            createCookie(globals.cookiename,globals.level_active)


        }else{
            globals.level_active =parseInt(readCookie(globals.cookiename))

        }

        bgd =new c.Bitmap(main.loadedData.getResult('bgd_intro'));
        t.addChild(bgd);

        btt1 = new  FrameBtt(main.loadedData.getResult('playbutton'),main.loadedData.getResult('playbutton_on'),'#d7127a');
        btt1.setTransform(1304,600);


        logo1=new c.Bitmap(main.loadedData.getResult('logo_cartoonito'));
        logo1.setTransform(545,679);
        logo2=new c.Bitmap(main.loadedData.getResult('logo_batwheels'));
        logo2.setTransform(821,28);

        logo3=new c.Bitmap(main.loadedData.getResult('logo_playroom'));
        logo3.setTransform(671,148);



        p1 =new c.Bitmap(main.loadedData.getResult('cars'));
        p1.x= 442;
        p1.y=249
        p2 =new c.Bitmap(main.loadedData.getResult('humans'));
        p2.x= 534;
        p2.y=0;


    }
    p.init=()=>{

        wlaczAnimacje();
    }
    const wlaczAnimacje =()=>{

        t.mouseEnabled=true;

        t.addChild(p2,btt1,p1,logo3,logo1,logo2);
        tl = gsap.timeline({});
        tl.timeScale(1.5);
        tl.from(logo1, {alpha:0,x:2000,duration: .5,ease:Back.easeOut},'<');
        tl.from(p1, {alpha:0,y:768,duration: .5,ease:Power3.easeOut},'<35%');
        tl.from(p2, {alpha:0,y:768,duration: .5,ease:Power2.easeOut},'<35%');
        tl.from(logo2, {alpha:0,y:-200, duration: .7,ease:Strong.easeOut},"<45%");
        tl.from(logo3, {alpha:0,x:2000, duration: .6,ease:Power4.easeOut},"<45%");
        tl.from(btt1, {alpha:0,x:-1000, duration: .6,ease:Power4.easeOut},"<45%");


        tl.addLabel('animOut');
        btt1.addEventListener('click',onStartGame)
        $(canvas).addClass('game');

    }


    const onStartGame=()=>{
        t.mouseEnabled=false;
        tl.timeScale(2).pause().eventCallback('onReverseComplete' ,function(){
            gsap.globalTimeline.clear();

            t.dispatchEvent({param: przelaczNext() , type:'changePage',bubbles:true,cancelable:true});

        }).reverse();
    }

    p.pauseGame = function(){}
    p.resumeGame = function(){}
    p.dispatchStep1 = function(){

        t.dispatchEvent({param: ResetClass, type:'changePage',bubbles:true,cancelable:true, anim:'transition'});
    }
    window.Step1 = c.promote(Step1, "Container");

}());
