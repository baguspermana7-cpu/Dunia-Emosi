
(function(){
    'use strict';
    var t;
    var FrameBtt=function(_bgd,_bgdOver,colorOver,data,_target)
    {
        this.Container_constructor();
        t = this;
        this.initialize(_bgd,_bgdOver,colorOver,data,_target);
    };
    var frameBtt = c.extend(FrameBtt, c.Container);
    frameBtt.initialize=function(_bgd,_bgdOver,colorOver,data,_target)
    {

        this.Container_initialize();
        t=this;
        t.clicktarget=null;
        this.mouseChildren=false;
        this.bgd=new createjs.Bitmap(_bgd);
        this.addChild(this.bgd);
        this.bgdOver=new createjs.Bitmap(_bgdOver);
        this.addChild(this.bgdOver);
        this.bgdOver.alpha=0;
        this.stateClicked = false;
        this.colorOver= typeof colorOver !== 'undefined' ? colorOver : '#000';
        this.addEventListener('mouseover',over);
        this.addEventListener('mouseout', out);
        this.addEventListener('click', click);

        this.cursor='pointer';

        if(data){
            this.font= typeof data.font !== 'undefined' ? data.font : 'bold 17px Nunito';
            this.txt = new createjs.Text(data.text, data.font,'#000');
            this.txt.textBaseline = "alphabetic";
            this.txt.textAlign='center';


            this.txt.x = this.bgd.image.width/2+data.x;

            if(this.txt.font!==undefined){
                var l = this.txt.font;
                l =l.substr(0,l.indexOf('px'));
                this.txt.lineWidth = this.bgd.image.width;
                this.txt.lineHeight = this.bgd.image.height;
                    this.txt.y= data.y+this.bgd.image.height/2+(l/2.7);
                }
            this.addChild(this.txt);
        }

        if(_target) {t.clicktarget=_target ;}
        else {t.clicktarget=null;}

    };
     function over(e)
     {

         playSounds('rollover');
        if(e.currentTarget.colorOver&&e.currentTarget.txt){
            e.currentTarget.txt.color = e.currentTarget.colorOver;
        }
         gsap.to(e.currentTarget.bgdOver,0.3,{alpha:1,ease: Sine.easeOut});
         gsap.to(e.currentTarget.bgd,0.3,{alpha:0,ease: Sine.easeIn});
         e.currentTarget.cursor = 'pointer';
     }

    function out(e)
    {

        if(e.currentTarget.txt){
           e.currentTarget.txt.color = '#000';
        }
        gsap.to(e.currentTarget.bgdOver,0.3,{alpha:0,ease: Sine.easeIn});
        gsap.to(e.currentTarget.bgd,0.3,{alpha:1,ease: Sine.easeOut});
    }


    function click(e)
     {

         e.currentTarget.removeEventListener('click', click);
         if(e.currentTarget.stateClicked){
             gsap.to(e.currentTarget.bgdOver,0.3,{alpha:1,ease: Sine.easeOut});

             e.currentTarget.removeEventListener('mouseover',over);
             e.currentTarget.removeEventListener('mouseout', out);
         }
        playSounds('click')

         createjs.EventDispatcher.initialize(FrameBtt.prototype);
         if(e.target.clicktarget)
         {
             e.target.dispatchEvent({param: e.target.clicktarget, type:'changePage',bubbles:true,cancelable:true});
         }

     }
    frameBtt.disable =(_this)=>{

        _this.mouseEnabled=false;
        _this.alpha= 0;
    }
    frameBtt.enable =(_this)=>{
        _this.mouseEnabled=true;
        _this.alpha= 1;
    }
    window.FrameBtt = c.promote(FrameBtt, "Container");     
}());
