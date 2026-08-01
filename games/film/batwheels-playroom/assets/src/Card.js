
(function()
{
    'use strict';
    var t,blank;
    var thisScale =1;
    var Card=function(z)
    {
        this.Container_constructor();
        t = this;
        this.number;

        this.initialize(z);
    };
    var p = c.extend(Card, c.Container);
    Card.prototype.bmp;

    p.Container_initialize = p.initialize;
    p.initialize=function(z) {
        this.Container_initialize();

        this.cursor='pointer';
        this.number = z;
        this.blank = new c.Bitmap(main.loadedData.getResult('matchingpairs/blank'));
        t.addChild(this.blank);

        this.bmp = new c.Bitmap(main.loadedData.getResult('matchingpairs/'+this.number));
        this.addChild(this.bmp);
        this.bmp.scaleX = 0;
        this.addEventListener('click',onClick);

        this.bmp.regX = this.blank.regX = this.bmp.image.width/2;
        this.bmp.x = this.blank.x = this.bmp.image.width/2;

            if(globals.matchingpairs.nCurrentLevel===0){
                thisScale =1;
            }
            else if(globals.matchingpairs.nCurrentLevel===1){
                thisScale = 1;
            }else if(globals.matchingpairs.nCurrentLevel===2) {
                thisScale = 0.83;
            } else if(globals.matchingpairs.nCurrentLevel===3){
                    thisScale = 0.79;
                }



        this.bmp.scaleY=this.blank.scaleX=this.blank.scaleY=thisScale;

    };

    function onClick(e){

        c.Sound.play('memory-reveal');
        gsap.to(e.currentTarget.blank,.3,{scaleX:0,ease:Strong.easeOut});
        gsap.to(e.currentTarget.bmp,.3,{scaleX:thisScale,ease:Strong.easeOut});
        e.currentTarget.mouseEnabled = false;
        e.currentTarget.dispatchEvent({numer:e.currentTarget.number,type:'odw',bubbles:true,cancelable:true});
        //e.currentTarget.bmp.alpha=  1;
    }
    p.blokuj = function(){
       
        this.mouseEnabled = false;
        this.cursor = 'default';
    };
    p.revert = function(){
        gsap.to(this.blank,.3,{scaleX:thisScale,ease:Strong.easeIn});
        gsap.to(this.bmp,.3,{scaleX:0,ease:Strong.easeIn});
        this.mouseEnabled = true;
    };


    window.Card = c.promote(Card, "Container");

}());
