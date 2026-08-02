
if(createjs){var c = createjs;}
var globals = globals || {};
globals={
    bSound:true,
    isDebugging:true,
    soundInstance:null,
    ow:1640,
    oh:768,
    scaleS:1
};

var main;
var stage;


if(  document.addEventListener  ){

    $(document).ready(function(){
        strings =game1;
        main=new Main();
        main.init();
        window.addEventListener("orientationchange", resizeCanvas, false);
        window.addEventListener('resize', resizeCanvas, false);
        document.addEventListener(visibilityChange, handleVisibilityChange, false);
    });

}

function resizeCanvas() {main.resize();}

function handleVisibilityChange() {
    if (document[hidden]) {
        pauseAll();
    } else {
        resumeAll();
    }
}
function pauseAll() {
    if (actualPage){
        actualPage.pauseGame();
    }
    globals.volume  = c.Sound.volume;
    c.Sound.volume = 0;
}


function resumeAll(){
    if (actualPage){
        actualPage.resumeGame();
    }
    c.Sound.volume = globals.volume;
}
var hidden, visibilityChange;
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
    hidden = "hidden";
    visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
}



