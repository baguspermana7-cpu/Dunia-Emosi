
(function(){
    'use strict';
    var t;
    var state=1;
    var OnOffBtt=function(_bgd,label,_bgdOver,colorOver,font,_target)
    {
        this.Container_constructor();
        t = this;
        this.initialize(_bgd,label,_bgdOver,colorOver,font,_target);
    };
    var onoffbtt = c.extend(OnOffBtt, c.Container);
    onoffbtt.initialize=function(_bgd,label,_bgdOver,colorOver,font,_target)
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


        this.colorOver= typeof colorOver !== 'undefined' ? colorOver : '#ffffff';
        this.font= typeof font !== 'undefined' ? font : 'bold 17px EurostileLTPro-Bold-Oblique';
        this.txt = new createjs.Text(label, this.font,'#ffffff');
        this.txt.textAlign='center';
        this.txt.textBaseline = "alphabetic";

            this.txt.lineWidth = 137;
            this.txt.x = 137/2;



        this.txt.y =5;

        this.addChild(this.txt);
        this.addEventListener('click', click);

        if(_target)
        {
            t.clicktarget=_target ;
        }
        else
        {
            t.clicktarget=null;
        }
    };

    function click(e)
     {


        state++;

         if(state>1){
             state=0;
             globals.bSound=state;


         }else{
             globals.bSound=state;


         }
         c.Sound.muted = !state;
         t.bgdOver.alpha=!state;


     }
    window.OnOffBtt = c.promote(OnOffBtt, "Container");

}());
