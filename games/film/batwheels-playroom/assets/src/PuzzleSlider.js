
(function()
{
    'use strict';
    var t;
    var available =[0,1];

    var kolejnosc = [1,2,3,4,5,6];
    let grid,btt1,container;

    var shuffleKolejnosc;
    let nOldDepth,tempX,nOldTempX,pieceToMove,small_l,title,logo,point,ok,bgd;

    var PuzzleSlider=function()
    {
        this.Container_constructor();
        t = this;
        this.initialize();
    };
    var p= c.extend(PuzzleSlider, c.Container);
    p.initialize=function() {


         bgd = new c.Bitmap(main.loadedData.getResult('puzzleslider/bgd_puzzleslider'));
        t.addChildAt(bgd,0);

       // globals.puzzleslider.nCurrentLevel=0;//Math.floor(Math.random()*6);

         small_l = new c.Bitmap(main.loadedData.getResult('logo_cartoonito'));
        small_l.x = 1920;
        small_l.y = 702;
        small_l.scaleX = small_l.scaleY = 0.7;


        title = new c.Bitmap(main.loadedData.getResult('puzzleslider/title'));
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

        btt1 = new  FrameBtt(main.loadedData.getResult('nextbutton'),main.loadedData.getResult('nextbutton_on'),'#d7127a');
        btt1.setTransform(1302,598);

        btt1.addEventListener('click',onNext);

        grid = new c.Shape(new c.Graphics().f('#000000').dr(0,0,680,525))
        grid.x = 626-10;
        grid.y = 143-10;


        container = new c.Container();
        container.x = 626+55;
        container.y = 143;
        shuffleKolejnosc = shuffle2(kolejnosc);
        container.alpha = grid.alpha=0;

    };
    p.init=()=>{


        gfxLib.homeBtt.enable(gfxLib.homeBtt);
        t.addChild(small_l);
        t.addChild(logo);
        t.addChild(title);
        t.addChild(btt1);
        t.addChild(ok);
        t.addChild(grid);
        t.addChild(container);
        gsap.to(container, 2, {alpha:1, delay: .6, ease: Strong.easeOut});
        gsap.to(grid, 2, {alpha:1, delay: .6, ease: Strong.easeOut});
        gsap.from(title, .5, {x: -500, ease: Strong.easeOut});
        gsap.from(logo, .5, {x: 1920, delay:.3,ease: Strong.easeOut});
        gsap.to(small_l, .5, {x: 479, delay: .5, ease: Strong.easeOut});
        gsap.from(btt1, .5, {x: 1920, delay: .5, ease: Strong.easeOut});

        rozlorz();

    }
    p.dispatchStep1 = function(){

        gsap.globalTimeline.pause().clear().resume();
        t.dispatchEvent({param: Step1, type:'changePage',bubbles:true,cancelable:true});
    };


    function rozlorz(){


        var item;
        for(var j=0;j<6;j++){
            item = new Board(shuffleKolejnosc[j]);
            item.name='b'+shuffleKolejnosc[j]+'_'+j;
            item.x = (j*110);
            item.y =(505/2);
            item.addEventListener('mousedown', handlePress);
            item.position = j;

            container.addChild(item);
        }

    }


    function forceDrop(e){

        drop(e);
    }
    function drop(e){

        playSounds('puzzle-slider-move')
        stage.enableMouseOver(0);
        pieceToMove.removeEventListener('pressup', drop);
        pieceToMove.removeEventListener('pressmove',drag);
        pieceToMove.removeEventListener('mouseout',forceDrop);

        container.setChildIndex(pieceToMove,0);
        pieceToMove.hide();
        pieceToMove.scaleX = pieceToMove.scaleY = 1;
        var value;
        if(point){
            value= Math.max(Math.min(Math.floor(point.x/110)+addOneOrNot(),5),0);
            pieceToMove.x = Math.max(Math.min(value,5),0)*110;

        }
        pieceToMove = null;
        nOldTempX = null;
        point = null;
        tempX = undefined;


        if(checkAllPositions()){
            container.mouseEnabled = false;
            onNext();
        }
    }


    const onNext=()=>{
        playSounds('level_success'+Math.ceil(Math.random()*8));
        stage.enableMouseOver(60);
        t.mouseEnabled=false;
        gsap.to(btt1, .5, {x: 1920, delay: .5, ease: Strong.easeOut});
        gsap.to(title, .5, {x: -500, ease: Strong.easeOut});
        gsap.to(logo, .5, {x: 1920, delay:.3,ease: Strong.easeOut});
        gsap.to(small_l, .5, {x: 1920, delay: .5, ease: Strong.easeOut});
        gsap.to(container, 1, {alpha:0,  ease: Strong.easeOut,onComplete:dispatchNext});
        gsap.to(grid, .8, {alpha:0, delay: .2, ease: Strong.easeOut});


    }


    const dispatchNext=()=>{
        t.dispatchEvent({param: przelaczNext() , type:'changePage',bubbles:true,cancelable:true});
    }
    function checkAllPositions(){

        console.log('vcheck')
        var bSuccess = true;
        for (var i=0;i<container.numChildren;i++){
            var item = (container.getChildAt(i));
            if(parseInt(item.name.substr(1,1))!==item.position+1){

                bSuccess= false;
            }


        }
        return bSuccess;
    }
    function drag(e){

        point = container.globalToLocal(stage.mouseX,stage.mouseY);
        point.x =  Math.max(Math.min(point.x,550),0);
        point.y =  Math.max(Math.min(point.y,505),0);
        pieceToMove.x = point.x;
        tempX =Math.max(Math.min(Math.floor(point.x/110)+addOneOrNot(),5),0);
        pieceToMove.position = tempX;

        updatePosAllPieces();
        nOldTempX = tempX;


    }

    function addOneOrNot(){
        if((point.x%110)>55){return 1;}else{
            return 0;
        }

    }
    function handlePress(e){
        stage.enableMouseOver(60);

        nOldTempX =Math.floor(e.currentTarget.x/110)

        pieceToMove = e.currentTarget;

        pieceToMove.addEventListener('pressup', drop);
        pieceToMove.addEventListener('pressmove',drag);
        pieceToMove.addEventListener('mouseout',forceDrop);


        pieceToMove.show();
        pieceToMove.scaleX = pieceToMove.scaleY = 1.1;
        nOldDepth = container.getChildIndex(pieceToMove)
        container.setChildIndex(pieceToMove,container.numChildren-1);


    }

    function updatePosAllPieces(){
        for (var i=0;i<6;i++){
            var itemToMove = container.getChildAt(i);
            if(itemToMove!==pieceToMove) {
                if (pieceToMove.position === itemToMove.position) {
                    itemToMove.position = nOldTempX;
                }
                itemToMove.x = itemToMove.position * 110;
            }
        }
    }





    p.pauseGame = function(){



    };

    p.resumeGame = function(){


    }


    window.PuzzleSlider= c.promote(PuzzleSlider, "Container");
}());
