
(function(){
    'use strict';
    var t;
    var FrameBtt=function(_bgd,_bgdOver,colorOver,data,_target)
    {

        this.initialize(_bgd,_bgdOver,colorOver,data,_target);
    };
    var frameBtt=FrameBtt.prototype=new createjs.Container();
    frameBtt.Container_initialize=frameBtt.initialize;
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
        this.colorOver= typeof colorOver !== 'undefined' ? colorOver : '#ffed00';
        this.addEventListener('mouseover',over);
        this.addEventListener('mouseout', out);
        this.addEventListener('click', click);

        this.cursor='pointer';

        if(data){
            this.font= typeof data.font !== 'undefined' ? data.font : 'bold 17px EurostileLTPro-Bold-Oblique';
            this.txt = new createjs.Text(data.text, data.font,'#FFEC00');
            this.txt.textBaseline = "alphabetic";
            this.txt.textAlign='center';


            this.txt.x = this.bgd.image.width/2+data.x;

            if(this.txt.font!=undefined){
                var l = this.txt.font;

                l =l.substr(0,l.indexOf('px'));

                this.txt.lineWidth = this.bgd.image.width;
                this.txt.lineHeight = this.bgd.image.height;
                    this.txt.y= data.y+this.bgd.image.height/2+(l/3);
                //this.txt.y =data.y//+this.bgd.image.height/2;//-(l/2);
                }
            this.addChild(this.txt);
        }
        
        if(_target) {t.clicktarget=_target ;}
        else {t.clicktarget=null;}

    };
     function over(e)
     {

         if(globals.bSound){
             c.Sound.play('throw');
         }

         
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
           e.currentTarget.txt.color = '#FFEC00';
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
         if(globals.bSound){
             c.Sound.play('click');
         }

         createjs.EventDispatcher.initialize(FrameBtt.prototype);
         if(e.target.clicktarget)
         {
             e.target.dispatchEvent({param: e.target.clicktarget, type:'changePage',bubbles:true,cancelable:true});
         }
         else
         {
             //e.target.parent.dispatchEvent({type:'customclick'});
         }
     }
    window.FrameBtt=FrameBtt;
}());
